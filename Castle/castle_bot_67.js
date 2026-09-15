/* Castle Duel v67. Decisions use visible balloons, own ammo and shot history only. */
var CastleBot67 = (() => {
  const STEP = 1 / 120, G = 1250, W = 1600, FLOOR = 745;
  const POWER = { arrow: 7.5, cannonball: 8.5, bomb: 8.5, rocket: 6.8 };
  const profiles = {
    easy: { defend: .22, error: .17, memory: .15, explore: .7, delay: 2.0, spread: .1, aerial: .1, bombSkill: .2 },
    medium: { defend: .75, error: .032, memory: .65, explore: .28, delay: 2.4, spread: .7, aerial: .45, bombSkill: .65, shelter: .07, tactical: 12 },
    hard: { defend: 1, error: .006, memory: 1, explore: .05, delay: 1.3, spread: 1, aerial: .75, bombSkill: 1, shelter: .9, tactical: 60 },
    reference: { defend: .64, error: .045, memory: .65, explore: .25, delay: 4.5, spread: .75, aerial: .4, bombSkill: .65 }
  };
  profiles.referenceTactical = { ...profiles.reference, tactical: 60 };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const BALLOON_SPEED = 1726 / 120;
  const ARROW_HALF_W = 126 * .38 + 18, ARROW_HALF_H = 158 * .43 + 18;
  function arrowPathStatus(side, shot, balloons) {
    let x = side === 1 ? 190 : 1410, y = 615, vy = shot.vy, reachesEnemy = false;
    const own = balloons.filter(b => b.owner === side), enemy = balloons.filter(b => b.owner !== side);
    for (let n = 1; n <= 841; n++) {
      const oldY = y, t = n * STEP;
      vy += G * STEP; x += shot.vx * STEP; y += vy * STEP;
      const intersects = (b, mx, my) => {
        const bx = clamp(b.x + (b.owner === 1 ? 1 : -1) * BALLOON_SPEED * t, -63, 1663);
        return Math.abs(x - bx) <= ARROW_HALF_W + mx && Math.abs(y - b.y) <= ARROW_HALF_H + my;
      };
      if (own.some(b => intersects(b, 18, 10))) return 'friendly';
      if (enemy.some(b => intersects(b, 0, 0))) reachesEnemy = true;
      if ((oldY < FLOOR && y >= FLOOR) || x < -60 || x > 1660 || y > 960 || t > 7) return reachesEnemy ? 'enemy' : 'miss';
    }
    return reachesEnemy ? 'enemy' : 'miss';
  }
  function velocity(side, target, weapon, movingVx = 0) {
    const a = { x: side === 1 ? 190 : 1410, y: 615 }, max = 165 * POWER[weapon];
    if (weapon === 'rocket') {
      const dx = target.x - a.x, dy = target.y - a.y, d = Math.hypot(dx, dy);
      return { vx: dx / d * 1000, vy: dy / d * 1000, t: d / 1000 };
    }
    let best = null;
    for (let n = 42; n <= 300; n += 2) {
      const t = n * STEP, vx = (target.x + movingVx * t - a.x) / t;
      const vy = (target.y - a.y - .5 * G * t * (t + STEP)) / t;
      const speed = Math.hypot(vx, vy);
      if (speed > max * .97 || (side === 1 ? vx < -30 * POWER[weapon] : vx > 30 * POWER[weapon])) continue;
      const cost = t + speed / max * .35;
      if (!best || cost < best.cost) best = { vx, vy, t, cost };
    }
    return best;
  }
  function placementFromShot(side, i, sizes, shot) {
    let x = side === 1 ? 190 : 1410, y = 615, vy = shot.vy;
    const { w, h } = sizes[i], floor = FLOOR - h / 2;
    for (let n = 0; n < Math.ceil(shot.t / STEP); n++) {
      const ox = x, oy = y; vy += G * STEP; x += shot.vx * STEP; y += vy * STEP;
      if (oy < floor && y >= floor) { x = ox + (x - ox) * (floor - oy) / (y - oy); y = floor; break; }
      if (side === 1 ? ox < 800 && x >= 800 : ox > 800 && x <= 800) { y = oy + (y - oy) * (800 - ox) / (x - ox); x = 800; break; }
      if (x < -50 || x > W + 50 || y > 1000) return null;
    }
    return { x: clamp(x, side === 1 ? w / 2 : 800 + w / 2, side === 1 ? 800 - w / 2 : W - w / 2), y: clamp(y, h / 2, floor), n: i, destroyed: false };
  }
  function placements(side, level, sizes, rng = Math.random) {
    const p = profiles[level] || profiles.medium, out = [];
    for (let i = 0; i < 4; i++) {
      let best = null, bestScore = -Infinity;
      for (let j = 0; j < 50; j++) {
        const angle = .15 + rng() * 1.56, speed = 450 + rng() * 670;
        const shot = { vx: Math.cos(angle) * speed * (side === 1 ? 1 : -1), vy: -Math.sin(angle) * speed, t: rng() < p.aerial ? .22 + rng() * 1.15 : 2.8 };
        const pos = placementFromShot(side, i, sizes, shot);
        if (!pos) continue;
        const separation = out.length ? Math.min(...out.map(o => Math.hypot(o.x - pos.x, o.y - pos.y))) : 200;
        const enemyX = side === 1 ? 1410 : 190, dx = pos.x - enemyX, dy = pos.y - 615;
        const incomingSpeed = Math.sqrt(G * (Math.hypot(dx, dy) - dy));
        const score = Math.min(separation, 340) * p.spread + rng() * 85 + (p.aerial > .6 ? (615 - pos.y) * .08 : 0) + (p.shelter || 0) * Math.max(0, incomingSpeed - 900);
        if (score > bestScore) { bestScore = score; best = { ...pos, shot }; }
      }
      out.push(best || { ...placementFromShot(side, i, sizes, { vx: 0, vy: -600, t: .2 }), shot: { vx: 0, vy: -600, t: .2 } });
    }
    return out;
  }
  function create(side, level, rng = Math.random) {
    const p = profiles[level] || profiles.medium, cells = [], visited = new Set();
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) cells.push({ x: 60 + c * 96, y: 80 + r * 117, scans: 0 });
    let hitPoint = null, actionNo = 0;
    const world = cell => ({ x: side === 2 ? cell.x : W - cell.x, y: cell.y });
    function observe(x, y, weapon, blast = false) {
      if (weapon === 'arrow') return;
      const px = side === 2 ? x : W - x;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i], covered = blast ? Math.hypot(c.x - px, c.y - y) < 165 : Math.abs(c.x - px) < 88 && Math.abs(c.y - y) < 82;
        if (covered && !visited.has(i)) { c.scans++; visited.add(i); }
      }
    }
    function next(obs) {
      actionNo++; visited.clear();
      const enemy = obs.balloons.filter(b => b.owner !== side && b.x > -45 && b.x < 1645)
        .sort((a, b) => side === 2 ? b.x - a.x : a.x - b.x);
      const available = ['cannonball', 'bomb', 'rocket'].filter(k => obs.ammo[k] > 0);
      for (const b of enemy) {
        const v = velocity(side, b, 'arrow', b.owner === 1 ? 1726 / 120 : -1726 / 120);
        if (!v) continue;
        if (rng() >= p.defend) break;
        const first = noisy({ ...v, weapon: 'arrow', balloonId: b.id });
        if (level === 'reference' || level === 'referenceTactical') return first;
        const accept = shot => {
          if (side === 1 ? shot.vx <= 0 : shot.vx >= 0) return false;
          const status = arrowPathStatus(side, shot, obs.balloons);
          return status !== 'friendly' && (level !== 'hard' || status === 'enemy');
        };
        if (accept(first)) return first;
        const movingVx = b.owner === 1 ? BALLOON_SPEED : -BALLOON_SPEED;
        for (let n = 42; n <= 300; n += 6) {
          const t = n * STEP, vx = (b.x + movingVx * t - (side === 1 ? 190 : 1410)) / t;
          const vy = (b.y - 615 - .5 * G * t * (t + STEP)) / t;
          if (Math.hypot(vx, vy) > 165 * POWER.arrow * .97) continue;
          if (side === 1 ? vx < -30 * POWER.arrow : vx > 30 * POWER.arrow) continue;
          const alternative = noisy({ vx, vy, t, weapon: 'arrow', balloonId: b.id });
          if (accept(alternative)) return alternative;
        }
      }
      if (!available.length) return { pass: true };
      const ranked = cells.map((cell, i) => {
        const floorPrior = cell.y > 500 ? 1.25 : 1;
        const score = floorPrior / (1 + cell.scans * p.memory * 4) + rng() * p.explore;
        return { cell, i, score };
      }).sort((a, b) => b.score - a.score);
      for (const { cell } of ranked) {
        const target = world(cell);
        const opts = available.map(weapon => ({ weapon, v: velocity(side, target, weapon), score: (weapon === 'rocket' ? (target.y < 330 ? 1.7 : .65) : weapon === 'bomb' ? 1.3 : 1) + rng() * .15 })).filter(o => o.v);
        if (!opts.length) continue;
        opts.sort((a, b) => b.score - a.score);
        const choice = opts[0];
        return noisy({ ...choice.v, weapon: choice.weapon, target, detonateAt: choice.weapon === 'bomb' && rng() < p.bombSkill ? choice.v.t : null });
      }
      return { pass: true };
    }
    function waitDecision(obs) {
      const remaining=Number.isFinite(obs.timeLeft)?obs.timeLeft:60;
      const elapsed=Number.isFinite(obs.turnElapsed)?obs.turnElapsed:60-remaining;
      const budget=Math.min(remaining-1.5,(p.tactical||0)-elapsed);
      if(budget<=0)return {seconds:0,reason:'shoot'};
      const ownHits=[],enemyHits=[],enemyDrops=[];
      const fall=(y,vy=0)=>(Math.sqrt(vy*vy+2*720*Math.max(0,690-y))-vy)/720;
      for(const b of obs.balloons||[]){
        if(b.attacked)continue;
        const distance=b.owner===1?1410-b.x:b.x-190;
        const drop=Math.max(0,distance/BALLOON_SPEED),impact=drop+fall(b.y+158*.28);
        if(b.owner===side)ownHits.push(impact);
        else {enemyHits.push(impact);enemyDrops.push(drop);}
      }
      for(const bomb of obs.castleBombs||[]){
        if(bomb.done)continue;
        const impact=fall(bomb.y,bomb.vy||0);
        (bomb.target===side?enemyHits:ownHits).push(impact);
      }
      ownHits.sort((a,b)=>a-b);enemyHits.sort((a,b)=>a-b);
      const ownKill=ownHits[Math.max(1,obs.enemyHP||3)-1]??Infinity;
      const enemyKill=enemyHits[Math.max(1,obs.ownHP||3)-1]??Infinity;
      if(ownKill+.25<=budget&&ownKill+.35<enemyKill)return {seconds:ownKill+.25,reason:'winning-balloon'};
      const payoff=ownHits.find(t=>t+.25<=budget);
      if(payoff==null)return {seconds:0,reason:'shoot'};
      if(enemyKill<=payoff+.5||enemyDrops.some(t=>t<=payoff+2.5))return {seconds:0,reason:'defend'};
      return {seconds:payoff+.25,reason:'balloon'};
    }
    function noisy(shot) {
      shot.vx *= 1 + (rng() - .5) * 2 * p.error;
      shot.vy *= 1 + (rng() - .5) * 2 * p.error;
      const max = 165 * POWER[shot.weapon], speed = Math.hypot(shot.vx, shot.vy);
      if (speed > max) { shot.vx *= max / speed; shot.vy *= max / speed; }
      return shot;
    }
    return { next, waitDecision, observe, hit(x, y) { hitPoint = { x, y }; }, delay() { return p.delay + rng() * 1.2; }, get actions() { return actionNo; } };
  }
  return { profiles, create, placements, placementFromShot, velocity, arrowPathStatus };
})();
