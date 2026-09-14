// Appended INSIDE the actual game's script by castle_simulator_59.mjs.
// Only transport, the clock, rendering and the automated human's input are substituted.
let simBotRows = [], simStats, simHuman, simHumanBomb = null, simLastBalloonHit = null, simTransportOverride = null;
rest = async (path, opts = {}) => {
  if (/highscores|win_events/.test(path)) throw new Error('Simulation attempted a highscore write');
  if (simTransportOverride) return simTransportOverride(path, opts);
  if (path === 'placements' && opts.method === 'POST') simBotRows = JSON.parse(opts.body);
  if (path === 'shots' && opts.method === 'POST') {
    const shot = JSON.parse(opts.body);
    if (simStats.shots[shot.player] && Object.hasOwn(simStats.shots[shot.player], shot.weapon)) simStats.shots[shot.player][shot.weapon]++;
  }
  return [];
};
const simNativeHitBalloon = hitBalloon;
hitBalloon = function (b) {
  if (!arrowHitConsumed && q.fly && balloons.some(v => v.id === b.id && v.alive)) {
    simLastBalloonHit = { id: b.id, owner: b.owner, shooter: flyingShooter };
    if (flyingShooter === 2) {
      const key = b.owner === 2 ? 'botFriendlyBalloonHits' : 'botEnemyBalloonHits';
      simStats[key] = (simStats[key] || 0) + 1;
    }
  }
  return simNativeHitBalloon(b);
};
const simOriginalStep = stepBattle;
stepBattle = function () {
  const who = flyingShooter, weapon = flyingWeapon;
  if (who === 1 && weapon === 'bomb' && simHumanBomb != null && q.shotTime >= simHumanBomb) {
    simHuman.observe(q.x, q.y, weapon, true); detonateBomb(); return false;
  }
  const result = simOriginalStep();
  if (who === 1) simHuman.observe(q.x, q.y, weapon, weapon === 'bomb' && bombDetonating);
  return result;
};
async function simSettle() { for (let n = 0; n < 6; n++) await Promise.resolve(); }
function simObservation(side) {
  updateBalloons();
  return { ammo: side === 1 ? ammo : botAmmo, ownHP: castleHP[side], enemyHP: castleHP[side === 1 ? 2 : 1],
    timeLeft:Math.max(0,(turnDeadline-performance.now())/1000),turnElapsed:60-Math.max(0,(turnDeadline-performance.now())/1000),
    balloons: balloons.filter(b => b.alive).map(b => ({ id: b.id, owner: b.owner, ...balloonPos(b),attacked:castleAttackDone.has(b.owner+':'+b.id) })),
    castleBombs:castleBombs.filter(b=>!b.done).map(b=>({target:b.target,y:b.y,vy:b.vy})) };
}
async function simHumanShoot() {
  if (turn !== 0 || q.fly || gameOverWinner) return;
  const view=simObservation(1),wait=simHuman.waitDecision(view);
  if(wait.seconds>0){roundTimeout(simHumanShoot,Math.min(.5,wait.seconds)*1000);return}
  let action = simHuman.next(view);
  if (action.pass) action = { weapon: 'arrow', ...CastleBotUnderTest.velocity(1, { x: 800, y: 390 }, 'arrow') };
  flyingShooter = 1; flyingWeapon = action.weapon; bombDetonating = false; arrowHitConsumed = false;
  if (action.weapon !== 'arrow') ammo[action.weapon]--;
  simHumanBomb = action.detonateAt;
  q.x = A[0].x; q.y = A[0].y; q.vx = action.vx; q.vy = action.vy; q.shotTime = 0; physAcc = 0; q.fly = true;
  await saveShot(1, q.vx, q.vy, flyingWeapon);
}
async function simRun(seed, level, options = {}) {
  env.reset(); resetRoundState('battle'); resetTurnClock(); Math.random = makeRng(seed);
  if (options.profileOverrides) for (const [key, value] of Object.entries(options.profileOverrides)) Object.assign(CastleBotUnderTest.profiles[key], value);
  simStats = { botFriendlyBalloonHits: 0, botEnemyBalloonHits: 0, shots: { 1: { arrow: 0, cannonball: 0, bomb: 0, rocket: 0 }, 2: { arrow: 0, cannonball: 0, bomb: 0, rocket: 0 } } };
  simBotRows = []; simHumanBomb = null;
  matchId = 'SIMULATION'; matchCode = 'SIM-' + seed; deviceRole = 1; botMode = true; botLevel = level;
  gamePhase = 'battle'; started = true; paused = false; turn = 0; serverTurnNo = 1;
  timeLeft = TURN_SECONDS; lastSeenTurnNo = 0; botThinkTimer = null; botTurnHandoff = false;
  ammo = { arrow: Infinity, cannonball: 3, bomb: 1, rocket: 2 }; botAmmo = { cannonball: 3, bomb: 1, rocket: 2 };
  resetBotBrain(); initBalloons(); resetShot(); soundOn = false; bombDetonating = false;
  impact = explosion = rewardFly = null;
  const reference = options.reference || 'reference';
  simHuman = CastleBotUnderTest.create(1, reference, Math.random);
  const sizes = targetImgs.map((_, i) => placementSpriteSize(i));
  // Reference placement follows legal launch speed, direction, flight, floor and centerline rules.
  const human = CastleBotUnderTest.placements(1, reference, sizes, Math.random);
  await saveBotPlacements();
  battlePlacements = { 1: human.map(o => ({ ...o, b: 0 })), 2: simBotRows.map(o => ({ n: o.object_no, x: o.x, y: o.y, destroyed: false, b: 0 })) };
  if (battlePlacements[2].length !== 4) throw new Error('Bot placement was not saved');
  let scheduledTurn = 0, frames = 0;
  while (!gameOverWinner && env.time() < 1000 + (options.limitSeconds || 900) * 1000) {
    if (turn === 0 && scheduledTurn !== serverTurnNo) {
      scheduledTurn = serverTurnNo;
      setTimeout(simHumanShoot, simHuman.delay() * 1000);
    }
    // Projectile and active animation steps use 60 fps; idle time jumps up to 250 ms.
    // The source's projectile integration still runs at exactly 120 Hz.
    const dt = q.fly || castleBombs.length || rewardFly ? 1 / 60 : Math.min(.25, Math.max(1 / 60, (env.nextTimer() - env.time()) / 1000));
    env.advance(dt * 1000);
    const wasFlying = q.fly;
    update(dt);
    if (rewardFly) drawRewardFly();
    if (wasFlying && !q.fly) await simSettle();
    if (env.fireDue()) await simSettle();
    if (++frames > 1000000) throw new Error('Simulation did not advance');
  }
  await simSettle();
  const defender = gameOverWinner === 1 ? 2 : 1;
  return { seed, level, winner: gameOverWinner, reason: !gameOverWinner ? 'timeout' : castleHP[defender] === 0 ? 'castle' : 'objects',
    seconds: (env.time() - 1000) / 1000, turns: serverTurnNo, hp: { ...castleHP },
    remaining: { 1: battlePlacements[1].filter(o => !o.destroyed).length, 2: battlePlacements[2].filter(o => !o.destroyed).length },
    ammo: { human: { ...ammo, arrow: 'infinite' }, bot: { ...botAmmo } }, ...simStats };
}
async function simChecks() {
  const assert = (test, text) => { if (!test) throw new Error(text); };
  env.reset(); resetRoundState('battle');resetTurnClock();Math.random = makeRng(481516); simStats = { shots: { 1: {}, 2: {} } }; soundOn = false;
  const originalFinish = finishPlacement;
  finishPlacement = () => { q.fly = false; gamePhase = 'placementDone'; };
  let placementsChecked = 0;
  const sizes = targetImgs.map((_, i) => placementSpriteSize(i));
  for (const side of [1, 2]) for (const level of ['easy', 'medium', 'hard', 'reference']) for (let trial = 0; trial < 100; trial++) {
    const objects = CastleBotUnderTest.placements(side, level, sizes, Math.random);
    for (const o of objects) {
      assert(Math.hypot(o.shot.vx, o.shot.vy) <= cfg.maxPull * cfg.power, 'Illegal placement launch speed');
      assert(side === 1 ? o.shot.vx >= -30 * cfg.power : o.shot.vx <= 30 * cfg.power, 'Illegal launch direction');
      deviceRole = side; placementIndex = o.n; gamePhase = 'placement'; started = true; placements = []; paused = false;
      resetPlacementBall(); q.vx = o.shot.vx; q.vy = o.shot.vy; q.fly = true;
      for (let n = 0; n < Math.ceil(o.shot.t / PHYS_STEP) && !placements.length; n++) update(PHYS_STEP);
      if (!placements.length) lockPlacement();
      assert(placements.length === 1, 'Placement could not be replayed in the real engine');
      assert(Math.hypot(o.x - placements[0].x, o.y - placements[0].y) < 1e-7, 'Placement differs from the real engine');
      placementsChecked++;
    }
  }
  finishPlacement = originalFinish;
  let legalShots = 0;
  for (const side of [1, 2]) for (const weapon of ['arrow', 'cannonball', 'bomb', 'rocket']) for (let y = 80; y <= 700; y += 60) for (let x = 60; x < 800; x += 60) {
    const target = { x: side === 2 ? x : VW - x, y }, shot = CastleBotUnderTest.velocity(side, target, weapon);
    if (!shot) continue;
    assert(Math.hypot(shot.vx, shot.vy) <= maxShotSpeed(weapon), 'Illegal battle launch speed');
    const tx = A[side - 1].x + shot.vx * shot.t;
    const ty = 615 + shot.vy * shot.t + (weapon === 'rocket' ? 0 : .5 * cfg.g * shot.t * (shot.t + PHYS_STEP));
    assert(Math.hypot(tx - target.x, ty - target.y) < 1e-7, 'Ballistic solution is inaccurate');
    legalShots++;
  }
  const rewards = [.0, .549999, .55, .849999, .85, .999999].map(value => { Math.random = () => value; return randomReward(); });
  assert(rewards.join(',') === 'cannonball,cannonball,bomb,bomb,rocket,rocket', 'Reward distribution changed');
  let hiddenAccessChecks = 0;
  for (const level of ['easy', 'medium', 'hard']) {
    const brain = CastleBotUnderTest.create(2, level, makeRng(616));
    const publicView = { ammo: { cannonball: 3, bomb: 1, rocket: 2 }, ownHP: 3, enemyHP: 3, balloons: [{ id: '1-test', owner: 1, x: 900, y: 350 }] };
    Object.defineProperty(publicView, 'opponentPlacements', { get() { throw new Error('Bot read hidden targets'); } });
    Object.freeze(publicView.ammo); Object.freeze(publicView.balloons); Object.freeze(publicView);
    for (let i = 0; i < 50; i++) { brain.next(publicView); hiddenAccessChecks++; }
  }
  // The production collision and win functions, exercised with actual projectiles.
  deviceRole = 1; flyingShooter = 1; botMode = false; gameOverWinner = 0; paused = false; gamePhase = 'battle';
  battlePlacements = { 1: [], 2: [{ n: 0, x: 1100, y: 500, destroyed: false }] };
  flyingWeapon = 'rocket'; Object.assign(q, { x: 190, y: 615, vx: 900, vy: (500 - 615) / ((1100 - 190) / 900), shotTime: 0, fly: true });
  simHuman = CastleBotUnderTest.create(1, 'reference', makeRng(3));
  while (q.fly) stepBattle(); await simSettle();
  assert(battlePlacements[2][0].destroyed, 'Rocket collision failed');
  battlePlacements = { 1: [], 2: [{ n: 0, x: 1100, y: 500, destroyed: false }, { n: 1, x: 1240, y: 500, destroyed: false }] };
  flyingWeapon = 'bomb'; bombDetonating = false;
  await showBombExplosion(1170, 500, 1, true);
  assert(battlePlacements[2].every(o => o.destroyed), 'Bomb area damage failed');
  initBalloons(); gamePhase = 'battle'; matchCode = 'CASTLE-CHECK';
  for (let n = 0; n < 200 * 60 && !gameOverWinner; n++) { env.advance(1000 / 60); updateCastleBombs(1 / 60); }
  assert(gameOverWinner > 0 && Object.values(castleHP).includes(0), 'Undefended balloons did not destroy a castle');
  env.reset();
  return { placementsReplayed: placementsChecked, ballisticSolutions: legalShots, hiddenAccessChecks, rewardBoundaryChecks: 6, projectileCollision: true, bombAreaDamage: true, balloonCastleVictory: true, networkDisabled: true };
}
