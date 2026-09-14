async function regressionChecks(){
  const checked=[],assert=(ok,label)=>{if(!ok)throw new Error(label)},pass=label=>checked.push(label);
  const reset=(phase='battle')=>{
    env.reset();env.allowPoll=true;resetRoundState(phase);simTransportOverride=null;simStats={shots:{1:{},2:{}}};
    matchId='SIMULATION';matchCode='TEST';deviceRole=1;botMode=false;started=true;gamePhase=phase;soundOn=false;
    rematchPreparing=rematchRequested=rematchWaitingForGo=needsFreshMatch=newOpponentStarting=false;
    resetTurnClock();simHuman=CastleBotUnderTest.create(1,'reference',makeRng(5));
  };
  const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
  const advance=async(ms)=>{env.advance(ms);env.fireDue();await simSettle()};
  reset();
  let turnWrites=0;
  simTransportOverride=(path,opts)=>{if(path.startsWith('matches?')&&opts.method==='PATCH')turnWrites++;return []};
  botMode=true;turn=1;serverTurnNo=8;resetTurnClock();
  env.advance(59999);update(.04);assert(timeLeft>.0009&&turnWrites===0,'Bot clock expired early');
  env.advance(1);for(let i=0;i<20;i++)update(.04);await simSettle();
  assert(turnWrites===1&&turn===0&&serverTurnNo===9&&timeLeft===60,'Bot clock did not expire exactly once');
  resetTurnClock();env.advance(15000);applyServerTurn(1,9);update(.04);
  assert(Math.abs(timeLeft-45)<1e-9,'A same-turn database poll reset the clock');
  pass('60-second clock runs for bot and human; a timeout advances once');
  pass('Repeated polls preserve the turn deadline');

  reset();flyingShooter=1;finishSimpleProjectile('ground');env.advance(60000);update(.04);await simSettle();
  assert(serverTurnNo===1&&shotResolving,'Impact animation allowed a second action or timeout');
  applyServerTurn(2,2);env.fireDue();await simSettle();
  assert(serverTurnNo===2,'Old impact callback skipped the next turn');
  pass('Impact animation locks input; old callbacks cannot skip a turn');

  reset();let resolveRows;const stale=defer();
  simTransportOverride=path=>path.startsWith('placements?')?stale.promise:[];
  const pending=loadBattlePlacements();resetRoundState('placement');started=true;
  stale.resolve([0,1,2,3].map(n=>({player:1,object_no:n,x:100,y:200,destroyed:true})));await pending;
  assert(!gameOverWinner&&battlePlacements[1].length===0,'Stale placements resurrected GAME OVER');
  pass('Late placement responses cannot restore a previous result');

  reset();gameOverWinner=1;const oldScores=defer();simTransportOverride=()=>oldScores.promise;
  const scoreWork=showHighscore();resetRoundState('placement');oldScores.resolve([]);await scoreWork;
  assert(!highscoreVisible&&!gameOverWinner,'Late highscore response covered the new match');
  let oldCallback=false;roundTimeout(()=>oldCallback=true,100);beginCountdown();resetRoundState('waiting');
  await advance(6000);env.fireFrames();
  assert(!oldCallback&&!started&&gamePhase==='waiting','Old timer or countdown restarted the old match');
  pass('Late highscore requests, timers and countdown frames are discarded');

  for(const level of ['easy','medium','hard']){
    reset();gameOverWinner=1;countdownStarted=battleCountdownStarted=true;highscoreVisible=true;castleHP={1:0,2:1};
    battlePlacements={1:[0,1,2,3].map(n=>({n,destroyed:true})),2:[]};balloons=[{id:'old',owner:1,alive:true,start:0,y:300}];
    botMode=true;showOpponentMenu();simTransportOverride=(path,opts)=>path==='matches'&&opts.method==='POST'?[{id:'NEW-'+level}]:[];
    await startBotMatch(level);assert(matchId==='NEW-'+level&&!gameOverWinner&&!countdownStarted&&!balloons.length,'New bot reused terminal state');
    env.elements.get('startFullscreen').onclick();env.advance(5100);env.fireFrames();await simSettle();
    assert(started&&gamePhase==='placement'&&!paused&&!gameOverWinner&&placements.length===0,'New bot did not enter placement');
  }
  pass('Selecting each bot level after GAME OVER starts a fresh match');

  reset();botMode=true;const deletes=[];simTransportOverride=(path,opts)=>{if(opts.method==='DELETE')deletes.push(path);return []};
  for(let i=0;i<12;i++){
    gameOverWinner=2;countdownStarted=battleCountdownStarted=true;showOpponentMenu();await requestRematch();
    assert(gamePhase==='placement'&&started&&!gameOverWinner&&!paused&&!rematchTransition&&castleHP[1]===3&&castleHP[2]===3,'Bot rematch froze at round '+i);
  }
  assert(deletes.length===24,'Bot rematch cleanup was duplicated or skipped');
  pass('Twelve consecutive bot rematches reset all match state');

  reset();botMode=false;deviceRole=2;const guestDeletes=[];let state={join_status:'rematch_go',current_player:2,turn_no:55,accepted_at:'old',player2_joined_at:'old'};
  simTransportOverride=(path,opts)=>{if(opts.method==='DELETE')guestDeletes.push(path);return path.startsWith('matches?')?[state]:[]};
  await prepareRematch();assert(!started&&gamePhase==='resetting','Guest started before host cleanup');
  state={join_status:'accepted',current_player:1,turn_no:1,accepted_at:null,player2_joined_at:null};await env.pollAll();
  assert(started&&gamePhase==='placement'&&guestDeletes.length===0,'Guest deleted placements or failed to wait for host');
  pass('Online guest waits for host cleanup and never deletes placements');

  reset();let firstDelete=defer(),deleteCount=0;
  simTransportOverride=(path,opts)=>{if(opts.method==='DELETE'){deleteCount++;if(deleteCount===1)return firstDelete.promise}return []};
  const rematch1=prepareRematch(),rematch2=prepareRematch();await simSettle();
  firstDelete.resolve([]);await Promise.all([rematch1,rematch2]);
  assert(deleteCount===2&&gamePhase==='placement','Duplicate prepareRematch reset a live round twice');
  pass('Duplicate rematch preparation is idempotent');

  reset();showOpponentMenu();let conditional=0,dbState='accepted',writes=[];
  simTransportOverride=(path,opts)=>{
    if(opts.method==='PATCH'){
      const body=JSON.parse(opts.body);writes.push(body.join_status);
      if(path.includes('join_status=eq.accepted')){conditional++;dbState='rematch_requested';return []}
      if(body.join_status)dbState=body.join_status;return [{join_status:dbState}];
    }return path.startsWith('matches?')?[{join_status:dbState}]:[];
  };
  await requestRematch();
  assert(conditional===1&&writes.includes('rematch_go')&&gamePhase==='placement','Simultaneous requester lost conditional-update race and stalled');
  pass('Simultaneous rematch requests complete the handshake');

  reset();showOpponentMenu();let phase='accepted',ready=false;
  simTransportOverride=(path,opts)=>{
    if(opts.method==='PATCH'){
      const body=JSON.parse(opts.body);if(body.join_status)phase=body.join_status;
      return [{join_status:phase}];
    }
    return path.startsWith('matches?')?[{join_status:phase,current_player:1,turn_no:1,accepted_at:ready?null:'old',player2_joined_at:ready?null:'old'}]:[];
  };
  await requestRematch();assert(gamePhase==='menu'&&rematchWaitingForGo,'First requester did not wait for consent');
  phase='accepted';ready=true;await env.pollAll();
  assert(gamePhase==='placement'&&started,'Requester missed brief rematch_go and never observed cleanup acknowledgement');
  pass('Rematch still starts when a poll misses the short consent state');

  reset();botMode=false;turn=1;serverTurnNo=7;
  let rows=[{turn_no:7,player:2,weapon:'castle_attack_2_2-test',vx:190,vy:300,power:1}];
  simTransportOverride=path=>{
    if(path.startsWith('matches?'))return [{current_player:2,turn_no:7}];
    if(path.startsWith('shots?')&&path.includes('turn_no=gte.'))return rows;
    return [];
  };
  startGameSync();await env.poll();
  assert(!q.fly&&lastSeenTurnNo===0,'Castle event became a projectile or consumed the shot');
  rows.push({turn_no:7,player:2,weapon:'rocket',vx:-900,vy:-100});
  await env.poll();assert(q.fly&&flyingWeapon==='rocket'&&q.vx===-900&&q.vy===-100,'Real shot after same-turn castle event was lost');
  q.x=1000;await env.poll();assert(q.x===1000,'Network echo restarted an opponent projectile');
  pass('Castle events do not consume, replace or restart real projectiles');

  reset();let stalePoll=defer();
  simTransportOverride=path=>path.startsWith('placements?')?stalePoll.promise:[];
  startGameSync();const inflight=env.poll();resetRoundState('placement');started=true;
  stalePoll.resolve([0,1,2,3].map(n=>({player:1,object_no:n,destroyed:true})));await inflight;
  assert(gamePhase==='placement'&&!gameOverWinner&&!q.fly,'In-flight synchronization crossed round boundary');
  pass('In-flight synchronization cannot alter the next round');

  let dots=0;
  for(const side of [1,2])for(const weapon of ['arrow','cannonball','bomb','rocket'])for(const pull of [[130,0],[100,70],[75,120],[130,-10]]){
    reset();deviceRole=side;turn=side-1;resetShot();selectedWeapon=weapon;pickerX=-weaponKeys.indexOf(weapon)*PICKER_STEP;
    const direction=side===1?-1:1;
    await c.dispatch('pointerdown',{clientX:q.x,clientY:q.y,pointerId:10});
    await c.dispatch('pointermove',{clientX:A[side-1].x+pull[0]*direction,clientY:615+pull[1],pointerId:10});
    const expected=aimTrajectory(),shot=currentAim();
    await c.dispatch('pointerdown',{clientX:800,clientY:800,pointerId:11});
    await c.dispatch('pointermove',{clientX:500,clientY:800,pointerId:11});
    await c.dispatch('pointerup',{pointerId:11});
    assert(drag&&currentAim().weapon===weapon,'Second finger changed the aimed weapon');
    await c.dispatch('pointerup',{pointerId:10});
    assert(q.fly&&flyingWeapon===weapon&&q.vx===shot.vx&&q.vy===shot.vy,'Release used a different weapon or velocity');
    let n=0;for(const p of expected){while(n<p.n&&q.fly){stepBattle();n++}if(!q.fly)break;assert(Math.hypot(q.x-p.x,q.y-p.y)<1e-7,'Trajectory dot differs from engine for '+weapon);dots++}
  }
  pass('Shared aim and launch match '+dots+' physics samples on both sides for all weapons');

  reset();await c.dispatch('pointerdown',{clientX:q.x,clientY:q.y,pointerId:1});await c.dispatch('pointermove',{clientX:q.x-100,clientY:q.y+60,pointerId:1});
  await c.dispatch('pointercancel',{pointerId:1});await c.dispatch('pointerup',{pointerId:1});
  assert(!drag&&!q.fly&&q.x===A[0].x,'Cancelled touch fired or left input locked');
  pass('Cancelled touch resets aiming without firing');

  reset();const viewport={width:390,height:844,offsetLeft:0,offsetTop:0,addEventListener:()=>{}};env.window.visualViewport=viewport;
  let fullRequests=0,readyMarks=0;
  env.document.documentElement.requestFullscreen=()=>{fullRequests++;return new Promise(()=>{})};
  showStartButton();simTransportOverride=()=>{readyMarks++;return []};
  env.elements.get('startFullscreen').onclick();await simSettle();
  assert(fullRequests===1&&readyMarks>0&&canvasRotated,'Unresolved fullscreen request blocked ready state or landscape fallback');
  env.rect={left:10,top:20,width:390,height:390*1600/900};
  for(const logical of [{x:0,y:0},{x:190,y:615},{x:1410,y:615},{x:1600,y:900}]){
    const real={clientX:10+(900-logical.y)*390/900,clientY:20+logical.x*env.rect.height/1600},mapped=pos(real);
    assert(Math.hypot(mapped.x-logical.x,mapped.y-logical.y)<1e-7,'Rotated iPhone touch does not map to canvas');
  }
  delete env.document.documentElement.requestFullscreen;await enterFullscreen();assert(canvasRotated,'Unsupported fullscreen disabled landscape layout');
  viewport.width=844;viewport.height=390;fit();assert(!canvasRotated,'Landscape orientation remained double-rotated');
  delete env.window.visualViewport;
  pass('Fullscreen cannot block starting; portrait fallback preserves touch coordinates');

  reset();let requestedInGesture=false,createdAfterRequest=false;
  env.document.documentElement.requestFullscreen=()=>{requestedInGesture=true;return Promise.resolve()};
  simTransportOverride=(path,opts)=>{if(path==='matches'){createdAfterRequest=requestedInGesture;return [{id:'START'}]}return []};
  await env.form.dispatch('submit');
  assert(createdAfterRequest,'Initial START did not request fullscreen before awaiting the network');
  delete env.document.documentElement.requestFullscreen;
  pass('Initial START requests fullscreen inside the user gesture');

  const publicView=(extra={})=>({ammo:{cannonball:3,bomb:1,rocket:2},ownHP:3,enemyHP:3,timeLeft:55,turnElapsed:5,balloons:[{id:'own',owner:2,x:600,y:300}],castleBombs:[],...extra});
  const hard=CastleBotUnderTest.create(2,'hard',makeRng(1)),medium=CastleBotUnderTest.create(2,'medium',makeRng(1)),easy=CastleBotUnderTest.create(2,'easy',makeRng(1));
  assert(hard.waitDecision(publicView()).seconds>28,'Hard failed to wait for an own balloon');
  assert(medium.waitDecision(publicView()).seconds===0&&easy.waitDecision(publicView()).seconds===0,'Easy/medium gained hard long waits');
  assert(medium.waitDecision(publicView({balloons:[{id:'own',owner:2,x:220,y:300}]})).seconds>0,'Medium never uses short favorable waits');
  assert(hard.waitDecision(publicView({timeLeft:1,turnElapsed:59})).seconds===0,'Hard waited past the deadline');
  assert(hard.waitDecision(publicView({balloons:[{id:'own',owner:2,x:600,y:300},{id:'enemy',owner:1,x:1390,y:300}]})).reason==='defend','Hard ignored a threatening enemy balloon');
  assert(hard.waitDecision(publicView({balloons:[{id:'own',owner:2,x:200,y:300,attacked:true}]})).seconds===0,'Hard waited for a balloon that already dropped its bomb');
  assert(hard.waitDecision(publicView({enemyHP:1,balloons:[],castleBombs:[{target:1,y:600,vy:300}]})).reason==='winning-balloon','Hard handed over before its winning bomb landed');
  const hidden=publicView();Object.defineProperty(hidden,'opponentPlacements',{get(){throw new Error('Timing read hidden targets')}});
  hard.waitDecision(Object.freeze(hidden));
  pass('Waiting uses visible balloons, bomb flight, both castle health values and remaining turn time');
  pass('Easy, medium and hard have distinct time strategies; waiting stops for danger or deadline');

  reset();botMode=true;botLevel='hard';turn=1;serverTurnNo=2;resetTurnClock();resetBotBrain();
  balloonEpoch=1000;balloonSpawnPlan={1:[],2:[]};balloons=[{id:'2-own',owner:2,alive:true,y:300,start:-(1663-600)/1726*120000}];castleHP={1:1,2:3};
  scheduleBotTurn();
  for(let i=0;i<2400&&!gameOverWinner;i++){env.advance(1000/60);update(1/60);env.fireDue();await simSettle()}
  assert(gameOverWinner===2&&botBrain.actions===0,'Actual controller shot instead of waiting for a winning balloon');
  assert(timeLeft<34,'Waiting did not consume real turn time');
  pass('Actual controller spends about 30 seconds waiting for its balloon to win before firing');
  reset();botMode=true;botLevel='hard';turn=1;serverTurnNo=2;resetTurnClock();resetBotBrain();
  balloonEpoch=1000;balloonSpawnPlan={1:[],2:[]};balloons=[{id:'2-own',owner:2,alive:true,y:300,start:-(1663-600)/1726*120000}];
  scheduleBotTurn();await advance(3000);update(.04);await simSettle();
  assert(botBrain.actions===0&&!q.fly,'Hard did not enter its tactical wait');
  balloons.push({id:'1-threat',owner:1,alive:true,y:300,start:env.time()-balloonEpoch-(1390+63)/1726*120000});
  await advance(500);update(.04);await simSettle();
  assert(botBrain.actions===1&&flyingWeapon==='arrow','A new threat did not interrupt the tactical wait');
  pass('Actual controller rechecks waiting and shoots when a new threat appears');
  reset();env.allowPoll=false;return {passed:checked.length,checks:checked,trajectorySamples:dots,networkDisabled:true,physicalIPhoneTested:false};
}