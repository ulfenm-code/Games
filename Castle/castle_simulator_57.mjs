import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const sourcePath = path.resolve(ROOT, arg('--source', 'castle_index_56.html'));
const html = fs.readFileSync(sourcePath, 'utf8');
const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean).join('\n');
const bot = fs.readFileSync(path.join(ROOT, 'castle_bot_57.js'), 'utf8');
const runtime = fs.readFileSync(path.join(ROOT, 'castle_sim_runtime_57.js'), 'utf8');
const sizes = JSON.parse(fs.readFileSync(path.join(ROOT, 'castle_sprite_sizes_57.json'), 'utf8'));
const noop = () => {};
const context = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop: noop }) : noop, set: () => true });
const element = () => ({ style: {}, addEventListener: noop, getContext: () => context, querySelector: element, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1600, height: 900 }) });
let now = 1000, timerId = 0, timers = new Map(), timerErrors = [];
const env = {
  document: { getElementById: element, documentElement: {} },
  Image: class { constructor() { this.complete = true; this.naturalWidth = this.naturalHeight = 1024; } set src(value) { [this.naturalWidth, this.naturalHeight] = sizes[value] || [1024, 1024]; } },
  Audio: class { cloneNode() { return this; } play() { return Promise.resolve(); } },
  Math: Object.create(Math), performance: { now: () => now }, crypto: { randomUUID: () => 'SIMULATION' },
  location: { search: '' }, navigator: { userAgent: 'SIMULATION' }, screen: {}, window: {}, form: element(), p1: { value: 'REFERENCE' },
  innerWidth: 1600, innerHeight: 900, addEventListener: noop, requestAnimationFrame: noop,
  setTimeout: (fn, ms = 0) => { const id = ++timerId; timers.set(id, { fn, at: now + Math.max(ms, 0) }); return id; },
  clearTimeout: id => timers.delete(id), setInterval: () => { throw new Error('Network polling forbidden in simulation'); }, clearInterval: noop,
  fetch: () => { throw new Error('Network forbidden in simulation'); },
  reset: () => { now = 1000; timers.clear(); timerErrors = []; }, time: () => now, advance: ms => { now += ms; },
  nextTimer: () => { let soon = Infinity; for (const t of timers.values()) soon = Math.min(soon, t.at); return soon; },
  fireDue: () => { if (timerErrors.length) throw timerErrors[0]; let fired = false; for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); const r = t.fn(); if (r?.catch) r.catch(e => timerErrors.push(e)); fired = true; } return fired; }
};
const globals = 'document,Image,Audio,Math,performance,crypto,location,navigator,screen,window,form,p1,innerWidth,innerHeight,addEventListener,requestAnimationFrame,setTimeout,clearTimeout,setInterval,clearInterval,fetch';
const factory = new Function('env', `const {${globals}}=env;\n${bot}\n${source}\n${runtime}`);
const engine = factory(env);
if (args.includes('--verify')) { console.log(JSON.stringify(await engine.checks())); process.exit(0); }
const count = Number(arg('--count', '100')), firstSeed = Number(arg('--seed', '10000'));
const levels = arg('--levels', 'easy,medium,hard').split(',');
const overrides = JSON.parse(arg('--overrides', '{}'));
const output = { source: path.basename(sourcePath), sourceSha256: crypto.createHash('sha256').update(html).digest('hex'), botSha256: crypto.createHash('sha256').update(bot).digest('hex'),
  firstSeed, countPerLevel: count, reference: arg('--reference', 'reference'), ...engine.inspect(), results: [], elapsedWallSeconds: 0 };
const start = Date.now();
for (const level of levels) {
  const totals = { level, matches: count, botWins: 0, humanWins: 0, timeouts: 0, botObjectWins: 0, botCastleWins: 0, humanObjectWins: 0, humanCastleWins: 0, meanSeconds: 0, meanTurns: 0, botArrows: 0, humanArrows: 0 };
  for (let i = 0; i < count; i++) {
    const result = await engine.run(firstSeed + i, level, { reference: output.reference, profileOverrides: overrides });
    if (result.winner === 2) { totals.botWins++; totals[result.reason === 'castle' ? 'botCastleWins' : 'botObjectWins']++; }
    else if (result.winner === 1) { totals.humanWins++; totals[result.reason === 'castle' ? 'humanCastleWins' : 'humanObjectWins']++; }
    else totals.timeouts++;
    totals.meanSeconds += result.seconds / count; totals.meanTurns += result.turns / count;
    totals.botArrows += result.shots[2].arrow / count; totals.humanArrows += result.shots[1].arrow / count;
    if (count === 1) console.log(JSON.stringify(result));
  }
  const p = totals.botWins / count, z = 1.9599639845, denominator = 1 + z * z / count;
  const center = (p + z * z / (2 * count)) / denominator, half = z * Math.sqrt(p * (1 - p) / count + z * z / (4 * count * count)) / denominator;
  Object.assign(totals, { botWinPercent: p * 100, confidence95: [(center - half) * 100, (center + half) * 100] });
  output.results.push(totals); console.log(JSON.stringify(totals));
}
output.elapsedWallSeconds = (Date.now() - start) / 1000;
const out = path.resolve(ROOT, arg('--out', 'castle_simulation_57.json'));
fs.writeFileSync(out, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ saved: out, elapsedWallSeconds: output.elapsedWallSeconds }));
