from pathlib import Path
import json

p=Path('Castle/castle_index_59.html')
s=p.read_text(encoding='utf-8')

# Version-local references only. v60 is generated as a complete HTML file.
s=s.replace('castle_manifest_59.webmanifest','castle_manifest_60.webmanifest')
s=s.replace('<title>Castle Duel v59</title>','<title>Castle Duel v60</title>')
s=s.replace('castle_bot_59.js','castle_bot_60.js')
s=s.replace('CastleBot59','CastleBot60')
s=s.replace('castle_index_59.html?match=','castle_index_60.html?match=')

old="let seenProjectiles=new Set(),seenBalloonEvents=new Set(),rematchPreparing=false,rematchRequested=false,rematchWaitingForGo=false,needsFreshMatch=false,newOpponentStarting=false;"
new="let seenProjectiles=new Set(),seenBalloonEvents=new Set(),rematchPreparing=false,rematchRequested=false,rematchWaitingForGo=false,rematchOfferSeen=false,needsFreshMatch=false,newOpponentStarting=false;\nlet pendingGameControllers=new Map();"
assert old in s
s=s.replace(old,new,1)

old="async function drainGameWrites(){await Promise.allSettled([...pendingGameWrites])}"
new=r'''async function drainGameWrites(maxMs=1800){
  const writes=[...pendingGameWrites];if(!writes.length)return;
  let timer=null;
  const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve('timeout'),maxMs)});
  const result=await Promise.race([Promise.allSettled(writes).then(()=> 'done'),timeout]);
  clearTimeout(timer);
  if(result==='timeout'){
    for(const work of writes){const controller=pendingGameControllers.get(work);if(controller)try{controller.abort()}catch(e){}}
    await Promise.allSettled(writes);
  }
}'''
assert old in s
s=s.replace(old,new,1)

def replace_block(text,start,end,replacement):
    a=text.index(start); b=text.index(end,a)
    return text[:a]+replacement+'\n'+text[b:]

new_rest=r'''async function rest(path,opts={}){
  const timeoutMs=Number(opts.timeoutMs)||10000;
  const {timeoutMs:_ignored,...fetchOpts}=opts;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const work=(async()=>{
    const h={apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json',Prefer:'return=representation',...(fetchOpts.headers||{})};
    const r=await fetch(SUPA_URL+'/rest/v1/'+path,{...fetchOpts,headers:h,signal:controller.signal}),txt=await r.text();
    if(!r.ok)throw new Error(txt||r.statusText);return txt?JSON.parse(txt):null;
  })();
  const tracked=fetchOpts.method&&fetchOpts.method!=='GET'&&/^(matches|shots|placements)(\?|$)/.test(path);
  if(tracked){pendingGameWrites.add(work);pendingGameControllers.set(work,controller)}
  try{return await work}
  catch(e){if(e&&e.name==='AbortError')throw new Error('Nätverksanrop tog för lång tid');throw e}
  finally{clearTimeout(timer);if(tracked){pendingGameWrites.delete(work);pendingGameControllers.delete(work)}}
}'''
s=replace_block(s,"async function rest(path,opts={}){","function code4()",new_rest)

old="resetRoundState('menu');needsFreshMatch=true;rematchRequested=rematchWaitingForGo=rematchPreparing=false;"
new="resetRoundState('menu');needsFreshMatch=true;rematchRequested=rematchWaitingForGo=rematchPreparing=rematchOfferSeen=false;"
assert old in s
s=s.replace(old,new,1)

new_rematch=r'''function showRematchRecovery(message){
  rematchPreparing=rematchTransition=rematchRequested=rematchWaitingForGo=false;
  showJoin('REMATCH',message,'<button id="retryRematch">FÖRSÖK IGEN</button><button id="leaveRematch">TILL MENY</button>');
  document.getElementById('retryRematch').onclick=()=>{rematchTransition=false;prepareRematch()};
  document.getElementById('leaveRematch').onclick=showOpponentMenu;
}
async function prepareRematch(){
  if(rematchPreparing)return;
  rematchPreparing=true;
  resetRoundState('resetting');rematchTransition=true;const epoch=roundEpoch;
  showJoin('REMATCH','Förbereder nästa match…');
  let done=false,watchdog=null;
  const clearWatchdog=()=>{if(watchdog){clearTimeout(watchdog);roundTimers.delete(watchdog);watchdog=null}};
  const recover=message=>{
    if(done||!sameRound(epoch))return;done=true;clearWatchdog();clearInterval(rematchPoll);rematchPoll=null;
    showRematchRecovery(message);
  };
  const finish=()=>{
    if(done||!sameRound(epoch))return;done=true;clearWatchdog();clearInterval(rematchPoll);rematchPoll=null;
    rematchPreparing=rematchRequested=rematchWaitingForGo=rematchOfferSeen=needsFreshMatch=false;
    started=true;startPlacement();hideJoin();startGameSync();
  };
  watchdog=roundTimeout(()=>recover('Rematch tog för lång tid. Försök igen eller gå tillbaka till menyn.'),12000);
  try{
    if(botMode){
      // Bot-rematch gets a completely fresh match row: no stale shot/placement can contaminate the new round.
      await drainGameWrites(1600);if(!sameRound(epoch)||done)return;
      const localName=names[0]||'PLAYER 1';matchId=null;matchCode=null;deviceRole=1;names=[localName,'CHATGPT BOT'];
      await createOnlineMatch();if(!sameRound(epoch)||done)return;
      await rest('matches?id=eq.'+encodeURIComponent(matchId),{method:'PATCH',timeoutMs:7000,body:JSON.stringify({player2_name:'ChatGPT Bot',join_status:'accepted',status:'playing',current_player:1,turn_no:1,accepted_at:null,player2_joined_at:null,updated_at:new Date().toISOString()})});
      if(sameRound(epoch)&&!done)finish();return;
    }
    if(deviceRole===1){
      // Human rematch: host alone clears old round data, preventing cross-device deletion races.
      await drainGameWrites(1800);if(!sameRound(epoch)||done)return;
      await rest('placements?match_id=eq.'+encodeURIComponent(matchId),{method:'DELETE',timeoutMs:7000});if(!sameRound(epoch)||done)return;
      await rest('shots?match_id=eq.'+encodeURIComponent(matchId),{method:'DELETE',timeoutMs:7000});if(!sameRound(epoch)||done)return;
      await rest('matches?id=eq.'+encodeURIComponent(matchId),{method:'PATCH',timeoutMs:7000,body:JSON.stringify({join_status:'accepted',current_player:1,turn_no:1,accepted_at:null,player2_joined_at:null,updated_at:new Date().toISOString()})});
      if(sameRound(epoch)&&!done)finish();
    }else{
      const check=async()=>{try{
        const m=await getMatch();if(!sameRound(epoch)||done)return;
        if(freshRematchState(m))finish();
        else if(m&&m.join_status==='rematch_go')netmsg('REMATCH • väntar på värden');
      }catch(e){if(sameRound(epoch)&&!done)netmsg('REMATCH • väntar på värden')}};
      rematchPoll=roundInterval(check,350);await check();
    }
  }catch(e){recover('Anslutningen avbröts under rematch. Försök igen.')}
}
function freshRematchState(m){return m&&m.join_status==='accepted'&&Number(m.current_player)===1&&Number(m.turn_no)===1&&!m.accepted_at&&!m.player2_joined_at}
async function requestRematch(){
  if(rematchTransition||rematchPreparing)return;
  enterFullscreen();rematchTransition=true;rematchRequested=true;rematchOfferSeen=true;
  gameOverGeneration++;clearTimeout(highscoreTimer);clearTimeout(botThinkTimer);botThinkTimer=null;
  gameOverWinner=0;highscoreVisible=false;gameOverHandled=true;
  if(botMode){await prepareRematch();return}
  const epoch=roundEpoch,btn=document.getElementById('rematchBtn');
  if(btn){btn.disabled=true;btn.textContent='VÄNTAR PÅ MOTSTÅNDAREN…'}
  try{
    await drainGameWrites(1800);if(!sameRound(epoch))return;
    const first=await rest('matches?id=eq.'+encodeURIComponent(matchId)+'&join_status=eq.accepted',{method:'PATCH',timeoutMs:7000,body:JSON.stringify({join_status:'rematch_requested',updated_at:new Date().toISOString()})});
    if(!sameRound(epoch))return;
    if(first&&first.length){rematchWaitingForGo=true;watchRematch();return}
    const m=await getMatch();if(!sameRound(epoch))return;
    if(m&&m.join_status==='rematch_requested'){
      await rest('matches?id=eq.'+encodeURIComponent(matchId)+'&join_status=eq.rematch_requested',{method:'PATCH',timeoutMs:7000,body:JSON.stringify({join_status:'rematch_go',updated_at:new Date().toISOString()})});
      if(sameRound(epoch))await prepareRematch();
    }else if(m&&(m.join_status==='rematch_go'||freshRematchState(m)))await prepareRematch();
    else throw new Error('Rematch state changed');
  }catch(e){
    if(!sameRound(epoch))return;rematchTransition=false;rematchRequested=rematchWaitingForGo=false;
    netmsg('Rematch kunde inte startas. Försök igen.');
    const button=document.getElementById('rematchBtn');if(button){button.disabled=false;button.textContent='REMATCH'}
  }
}
function watchRematch(){
  clearInterval(rematchPoll);const epoch=roundEpoch;
  rematchPoll=roundInterval(async()=>{
    try{
      const m=await getMatch();if(!sameRound(epoch)||!m)return;
      if(m.join_status==='rematch_requested'){
        rematchOfferSeen=true;
        const btn=document.getElementById('rematchBtn');if(btn&&!btn.disabled)btn.textContent='ACCEPTERA REMATCH';
      }
      const participating=rematchRequested||rematchOfferSeen||rematchTransition||rematchPreparing;
      if(participating&&(m.join_status==='rematch_go'||freshRematchState(m))){
        clearInterval(rematchPoll);rematchPoll=null;await prepareRematch();
      }
    }catch(e){if(sameRound(epoch)&&rematchRequested)netmsg('REMATCH • försöker återansluta')}
  },350);
}'''
s=replace_block(s,"async function prepareRematch(){","function hashSeed(txt)",new_rematch)

assert 'castle_index_59.html' not in s
assert 'castle_bot_59.js' not in s
assert 'castle_manifest_59.webmanifest' not in s
assert 'CastleBot59' not in s
assert '<title>Castle Duel v60</title>' in s
Path('Castle/castle_index_60.html').write_text(s,encoding='utf-8')

bot=Path('Castle/castle_bot_59.js').read_text(encoding='utf-8')
bot=bot.replace('Castle Duel v59','Castle Duel v60').replace('CastleBot59','CastleBot60')
Path('Castle/castle_bot_60.js').write_text(bot,encoding='utf-8')

manifest={
  'name':'Castle Duel','short_name':'Castle Duel','id':'castle_index_60.html','start_url':'castle_index_60.html','scope':'./',
  'display':'fullscreen','orientation':'landscape','background_color':'#0a0d12','theme_color':'#0a0d12','lang':'sv'
}
Path('Castle/castle_manifest_60.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
