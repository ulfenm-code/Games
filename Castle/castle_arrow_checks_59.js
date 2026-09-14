// This fixture runs inside the original game's scope, using its actual arrow collisions.
async function simArrowChecks(randomScenes) {
  const guarded = typeof CastleBotUnderTest.arrowPathStatus === 'function';
  const assert = (test, message) => { if (!test) throw new Error(message); };
  const totals = { sourceVersion: 59, scenes: 0, arrowsChecked: 0, ownHits: 0, enemyHits: 0, misses: 0, nonArrowChoices: 0, knownCases: [], timingCases: ['60 fps', '25 fps', '30 fps + 1 s launch delay'] };
  async function replay(side, scene, action, frameDt, launchDelay) {
    env.reset(); env.advance(120000 + launchDelay * 1000);
    simStats = { shots: { 1: {}, 2: {} } }; simLastBalloonHit = null; simTransportOverride = null;
    Math.random = makeRng(626); botMode = false; deviceRole = side; flyingShooter = side; flyingWeapon = 'arrow';
    started = true; gamePhase = 'battle'; paused = false; gameOverWinner = 0; arrowHitConsumed = false; bombDetonating = false;
    balloonEpoch = 1000; balloonSpawnPlan = { 1: [], 2: [] }; destroyedBalloonIds.clear();
    balloons = scene.map(b => ({ ...b, alive: true, start: 120000 - (b.owner === 1 ? b.x + 63 : 1663 - b.x) / 1726 * 120000 }));
    q.x = A[side - 1].x; q.y = A[side - 1].y; q.vx = action.vx; q.vy = action.vy; q.shotTime = 0; q.fly = true;
    let accumulator = 0;
    while (q.fly) {
      env.advance(frameDt * 1000); accumulator += frameDt;
      while (q.fly && accumulator >= PHYS_STEP) { accumulator -= PHYS_STEP; simOriginalStep(); }
    }
    await simSettle();
    return simLastBalloonHit ? simLastBalloonHit.owner === side ? 'own' : 'enemy' : 'miss';
  }
  const fixtures = [
    { name: 'clear enemy', balloons: [{ id: 'red', owner: 1, x: 900, y: 350 }] },
    { name: 'friendly blocks direct arc', balloons: [{ id: 'red', owner: 1, x: 900, y: 350 }, { id: 'blue', owner: 2, x: 1200, y: 430 }] },
    { name: 'friendly covers launch point', balloons: [{ id: 'red', owner: 1, x: 900, y: 350 }, { id: 'blue', owner: 2, x: 1410, y: 550 }] },
    { name: 'overlapping balloons', balloons: [{ id: 'blue', owner: 2, x: 950, y: 350 }, { id: 'red', owner: 1, x: 930, y: 350 }] }
  ];
  for (const fixture of fixtures) {
    const action = CastleBotUnderTest.create(2, 'hard', makeRng(21)).next({ ammo: { cannonball: 3, bomb: 1, rocket: 2 }, balloons: fixture.balloons });
    const result = action.weapon === 'arrow' ? await replay(2, fixture.balloons, action, 1 / 60, 0) : 'non-arrow';
    totals.knownCases.push({ name: fixture.name, weapon: action.weapon || 'pass', result });
    if (guarded) assert(result !== 'own', fixture.name + ': friendly fire');
    if (fixture.name === 'clear enemy') assert(result === 'enemy', 'Bot stopped shooting clear enemy balloons');
    if (guarded && fixture.name === 'friendly covers launch point') assert(result === 'non-arrow', 'Blocked launch must select a non-arrow action');
  }
  if (guarded) {
    const action = CastleBotUnderTest.create(2, 'hard', makeRng(21)).next({ ammo: { cannonball: 0, bomb: 0, rocket: 0 }, balloons: fixtures[2].balloons });
    assert(action.pass, 'Bot must pass when all arrow paths are blocked and ammunition is empty');
    totals.blockedWithoutAmmoPasses = true;
  }
  const sceneRng = makeRng(803211);
  for (let i = 0; i < randomScenes; i++) {
    const scene = [];
    for (const owner of [1, 2]) for (let n = 0, count = 1 + Math.floor(sceneRng() * 4); n < count; n++) scene.push({ id: owner + '-' + n, owner, x: -40 + sceneRng() * 1680, y: 180 + sceneRng() * 370 });
    for (const side of [1, 2]) for (const level of ['easy', 'medium', 'hard']) {
      const brain = CastleBotUnderTest.create(side, level, makeRng(73000 + i * 11 + side));
      const action = brain.next({ ammo: { cannonball: 3, bomb: 1, rocket: 2 }, balloons: scene });
      totals.scenes++;
      if (action.weapon !== 'arrow') { totals.nonArrowChoices++; continue; }
      for (const [dt, lag] of [[1 / 60, 0], [.04, 0], [1 / 30, 1]]) {
        const result = await replay(side, scene, action, dt, lag);
        totals.arrowsChecked++; if (result === 'own') totals.ownHits++; else if (result === 'enemy') totals.enemyHits++; else totals.misses++;
        if (guarded) assert(result !== 'own', `Friendly hit in scene ${i}, side ${side}, ${level}, frame ${dt}, lag ${lag}`);
      }
    }
  }
  // Reproduce a database echo arriving during an already launched bot arrow.
  env.reset(); env.allowPoll = true;
  resetRoundState('battle');started = true; gamePhase = 'battle'; botMode = true; deviceRole = 1; turn = 1;
  matchId = 'SIMULATION'; serverTurnNo = 10; lastSeenTurnNo = 9; gameOverWinner = 0;
  Object.assign(q, { x: 1130, y: 330, vx: -650, vy: -200, shotTime: .5, fly: true });
  flyingWeapon = 'arrow'; flyingShooter = 2;
  const before = JSON.stringify(q);
  simTransportOverride = path => {
    if (path.startsWith('matches?')) return [{ current_player: 2, turn_no: 10 }];
    if (path.startsWith('shots?') && path.includes('turn_no=gte.')) return [{ turn_no: 10, player: 2, vx: -650, vy: -900, weapon: 'arrow' }];
    return [];
  };
  startGameSync(); await env.poll();
  totals.botEchoDoesNotRestartShot = JSON.stringify(q) === before;
  if (guarded) assert(totals.botEchoDoesNotRestartShot, 'Bot echo restarted the checked shot');
  botMode = false; seenProjectiles.clear();lastSeenTurnNo = 9;
  await env.poll();
  totals.humanOpponentShotStillReceived = q.fly && q.x === A[1].x && q.shotTime === 0 && q.vy === -900;
  assert(totals.humanOpponentShotStillReceived, 'Human opponent shots no longer synchronize');
  simTransportOverride = null; env.allowPoll = false; env.poll = null; env.reset();
  return totals;
}
