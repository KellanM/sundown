/* Sundown mechanic module: designed traffic formations (MECH.formations). See mech/README.md and research/sundown-craft/traffic.md.
   Load after mech/style.js:   <script src="mech/formations.js"></script>

   Kellan, 2026-11-21, on the best part of the game: "flowing in and out of specifically structured arrangements of traffic that feel
   challenging, but not impossible and very satisfying when you pull it off". So the traffic is now mostly authored: named formations
   (a slalom, a staircase, a pincer, a fake-out ...) chained into phrases, with random traffic only between phrases.

   Rules taken from the study (traffic.md has the sources):
   - Authored chunks with a cost, spent from a budget that relaxes over the run (Subway Surfers, Sure Footing).
   - Learnable over random: few named shapes that recur and are mirrored, so the player learns to recognise them (Super Hexagon).
   - Guarantee the line first (Spelunky): every formation is checked by the line solver (F.solve) at boost speed before it is placed;
     one that has no line on this stretch of road (a bend, a fork) is never placed.
   - Telegraph: a formation is in sight for seconds; any car that moves inside one signals first (blinker at 3.4 s to contact) and has
     finished its move 1.4 s before you reach it, so the final line is always readable at least 1.2 s ahead. Nothing hides a decision
     behind a truck (Beat Saber's "vision blocks").
   - Jo-ha-kyu: each phrase is easy, building, peak; then ma, an empty road to breathe; then a little loose traffic; then the next phrase.
     The level rises with checkpoints, steeper than the old traffic ramp (Kellan, 2026-11-19: "ramp up in difficulty more steeply").
   - The payoff (Burnout, Rez, Sayonara Wild Hearts): threading a formation cleanly is a style act named for the formation, a short
     rising sting in the music's key, and a flare of the world's light trails (mech/speedfx.js). No card: the style chain shows it.

   How it plugs in (core hooks, each one line):
   - the traffic spawner asks MECH.formations.want(n) how many cars it should keep (no random cars while a phrase runs);
   - trafficFlow() leaves cars with c.fm alone (this module drives them: speed, blinkers, lane moves).
   Formation cars are ordinary entries in `cars`, so collisions, close calls, drawing, brake lights, set pieces that clear traffic and
   the director's keep-clear zone all treat them like any car. If anything else moves or removes one (a set piece, the fork, the
   director), the formation is void: its cars go back to normal traffic and nothing is scored.
   Not on the title screen (state 'ready'): the attract ride keeps its random traffic and attractLane() as before.
   No canvases. Allocation only when a phrase or formation is built (a few times a minute), never per frame. */
"use strict";
(() => {
const F = MECH.formations = {};
const OFF = typeof location !== 'undefined' && /[?&]formations=0(&|$)/.test(location.search); F.off = OFF;   // ?formations=0: the old random traffic only (A/B tests)

/* ---------------------------------------------------------------- the library
   Rows: [dz, members]. dz in thousands of world units (5 segments) from the formation's front, scaled by the road's spacing.
   Member: lane (-1, 0, 1 = x -.66, 0, .66) or an exact x, a kind ('c' car, 't' truck), and optional script:
     { to:x }  signals, then changes lane to x (blinker at SIG s to contact, moves MV s later at LC_V per s)
     { v:k }   drives k x MAXS faster (or slower) than the formation
   d: difficulty 1..5. on: road kinds it suits (x expressway, s street, m mountain/coast); 2 = favoured there. bend: fine on a bend.
   tun: tunnels only. */
const L = -1, C = 0, R = 1;
const LIB = [
  { id:'gate',     name:'DOORWAY',    kj:'門', d:1, bend:true,  on:{ x:1, s:1, m:2 }, rows:[[0, [L, R]]] },
  { id:'split',    name:'SPLIT',      kj:'割', d:1, bend:true,  on:{ x:1, s:1, m:2 }, rows:[[0, [C]], [5, [L, R]]] },
  { id:'chicane',  name:'CHICANE',    kj:'曲', d:1, bend:true,  on:{ x:1, s:2, m:1 }, rows:[[0, [L, C]], [5, [C, R]]] },
  { id:'zipper',   name:'ZIPPER',     kj:'閂', d:2, bend:false, on:{ x:1, s:2, m:1 }, rows:[[0, [-.42]], [1.8, [.42]], [3.6, [-.42]], [5.4, [.42]], [7.2, [-.42]]] },
  { id:'slalom',   name:'SLALOM',     kj:'蛇', d:2, bend:false, on:{ x:1, s:2, m:1 }, rows:[[0, [C, R]], [4, [L, C]], [8, [C, R]], [12, [L, C]]] },
  { id:'stairs',   name:'STAIRS',     kj:'段', d:2, bend:true,  on:{ x:1, s:1, m:2 }, rows:[[0, [C, R]], [2.7, [L, R]], [5.4, [L, C]]] },
  { id:'echelon',  name:'ECHELON',    kj:'梯', d:2, bend:true,  on:{ x:1, s:2, m:1 }, rows:[[0, [L]], [1.2, [C]], [2.4, [R]], [3.6, [C]], [4.8, [L]]] },
  { id:'wall',     name:'WALL',       kj:'壁', d:2, bend:true,  on:{ x:2, s:1, m:1 }, rows:[[0, [[-.58, 't'], [-.08, 't']]], [3, [R]]] },
  { id:'convoy',   name:'CONVOY',     kj:'列', d:3, bend:false, str:true, on:{ x:2, s:1, m:1 }, rows:[[0, [C]], [.8, [L]], [1.8, [[C, 't']]], [6, [C]], [6.8, [R]], [7.8, [C]]] },   // (the gap after the truck is the crossing: 0.8 s at the formation's pace)
  { id:'twinwall', name:'TWIN WALL',  kj:'双', d:3, bend:false, on:{ x:2, s:1, m:1 }, rows:[[0, [[-.58, 't'], [-.08, 't']]], [3.2, [[.08, 't'], [.58, 't']]]] },
  { id:'pincer',   name:'PINCER',     kj:'挟', d:3, bend:true,  on:{ x:1, s:1, m:2 }, rows:[[0, [[L, 'c', { to:-.22 }], [R, 'c', { to:.22 }]]], [3, [C]]] },
  { id:'overtake', name:'OVERTAKE',   kj:'抜', d:3, bend:false, on:{ x:2, s:1, m:1 }, rows:[[-1.4, [[C, 'c', { v:.1 }]]], [0, [R]], [3.6, [L]]] },
  { id:'pocket',   name:'POCKET',     kj:'袋', d:3, bend:false, on:{ x:1, s:2, m:1 }, rows:[[0, [L, C]], [1.5, [L, C]], [3.6, [C, R]]] },
  { id:'weave',    name:'WEAVE',      kj:'縫', d:3, bend:true,  tnl:true, on:{ x:1, s:1, m:1 }, rows:[[0, [C, R]], [3, [L, C]], [6, [C, R]], [9, [L, C]], [12, [C, R]]] },
  { id:'cascade',  name:'CASCADE',    kj:'滝', d:4, bend:false, on:{ x:1, s:2, m:1 }, rows:[[0, [L]], [1.25, [C]], [2.5, [R]], [3.75, [C]], [5, [L]], [6.25, [C]], [7.5, [R]]] },
  { id:'fakeout',  name:'FAKEOUT',    kj:'偽', d:4, bend:false, on:{ x:1, s:2, m:1 }, rows:[[0, [L, [C, 'c', { to:.66 }]]], [3.4, [R]]] },
  { id:'squeeze',  name:'SQUEEZE',    kj:'搾', d:4, bend:false, on:{ x:2, s:1, m:1 }, rows:[[0, [L, C]], [2.6, [[-.7, 'c'], [-.04, 'c'], [.62, 't']]]] },
  { id:'trap',     name:'SPEED TRAP', kj:'罠', d:4, bend:false, on:{ x:2, s:1, m:1 }, rows:[[-1.6, [[R, 'c', { v:-.08 }]]], [0, [[-.58, 't'], [-.08, 't']]], [2.9, [R]]] },
  { id:'needle',   name:'NEEDLE',     kj:'針', d:5, bend:false, on:{ x:1, s:1, m:1 }, rows:[[0, [L, R]], [2.4, [[-.68, 'c'], [.02, 'c'], [.7, 'c']]], [4.8, [C]]] },
  { id:'knot',     name:'KNOT',       kj:'結', d:5, bend:false, on:{ x:1, s:2, m:1 }, rows:[[0, [C, R]], [2.5, [L, R]], [5, [L, [C, 'c', { to:.66 }]]], [8, [L]]] },
  // the first night's opener (never picked at random): two slow cars on the lane lines, staggered. Whatever lane you hold, one of them
  // passes you inside Close range (.33 from a lane centre) and outside its hit box, with .1 to spare either side
  { id:'stagger',  name:'STAGGER',    kj:'初', d:1, fn:true, bend:true, on:{ x:1, s:1, m:1 }, rows:[[0, [[-.33, 'c']]], [1.8, [[.33, 'c']]]] },
  { id:'gauntlet', name:'GAUNTLET',   kj:'関', d:5, bend:false, on:{ x:2, s:1, m:1 }, rows:[[0, [C, [R, 't']]], [2.4, [[L, 't'], C]], [4.8, [C, [R, 't']]], [7.2, [-.42]], [8.6, [.42]], [10, [[L, 't'], C]]] } ];
F.LIB = LIB;
const BYID = {}; for(const d of LIB) BYID[d.id] = d;

/* ---------------------------------------------------------------- tuning */
const LANE = .66, SIG = 3.4, MV = 1.0, LC_V = .7;     // a scripted lane change: blinker at 3.4 s to contact, moves 1 s later at .7 half-widths/s
const MARGIN = .03;                                    // the solver keeps this much clear of a car's hit box
const KIND = { harbour:'x', bay:'x', tunnels:'x', aqua:'x', shimanami:'x', haneda:'x', minato:'x', shuto:'x', neon:'s', akiba:'s', gion:'s',
  pass:'m', refinery:'m', coast:'m', snow:'m', paddies:'m', sakurajima:'m', kurobe:'m' };
// road kinds: spacing (x the rows' dz), formation pace (+ x MAXS: streets crawl), what stands in for a truck (narrow streets: a box van)
const KP = { x:{ sp:1, dv:0, truck:'truck' }, s:{ sp:.92, dv:.04, truck:'box' }, m:{ sp:1.1, dv:.02, truck:'truck' } };
const BEND = 2.2, SHARP = 3.4;                         // |curve| where you meet it: past BEND spaced 1.25x; past SHARP only the bend-safe shapes
// the ride's level 1..5 from checkpoints and time (the old traffic ramp reaches its cap at about checkpoint 9; this reaches 5 at 9)
function level(){ const g = typeof gatesHit === 'number' ? gatesHit : 0, t = typeof playT === 'number' ? playT : 0;
  let lv = 1 + Math.max(0, Math.min(4, Math.max((g - 3) * .2, (t - 60) / 70)));   // level 2 at about 2:10, 3 at 3:20, 4.4 at 5 min
  const as = (window.ASSIST && ASSIST.traffic) | 0; if(as) lv = Math.min(lv, as >= 2 ? 2 : 3);
  return lv; }
const vfAt = lv => .6 - .04 * (lv - 1);               // formation speed (x MAXS): later formations are slower, so you close on them faster
const FIRST = 7;                                        // seconds of loose traffic before the first phrase

/* ---------------------------------------------------------------- state */
let fnRide = false, fnStep = 0, fnWait = 0;   // the player's first night (firstNight() in the core): a designed opening
let phase = 'free', phaseT = 0, freeFor = FIRST, phr = null, live = [], nid = 1, recent = [], fmCars = 0, frame = 0;
const ST = { seen:0, threaded:0, voided:0, crashed:0, streak:0, bestStreak:0, by:{}, log:[] };   // log: each formation's id and outcome (tests)
F.stats = () => ST;

/* ---------------------------------------------------------------- helpers */
const hitB = () => (typeof bikeHalf === 'function' ? bikeHalf() : .05) - (typeof HIT_GRACE === 'number' ? HIT_GRACE : .01);
const halfOf = c => typeof carHalf === 'function' ? carHalf(c) : .18;
const kindHere = z => { const s = segAt(z); return KIND[LANDS[s.land].key] || 'x'; };
const CARCOL = ['#2c2f3a', '#3a2430', '#1f3242', '#4a4652', '#3a3020'], TRKCOL = ['#2a2440', '#3a1e2a', '#1e2a3a'];
function memX(m, mir){ const x = Array.isArray(m) ? m[0] : m; const v = Number.isInteger(x) ? x * LANE : x; return mir ? -v : v; }
function memK(m){ return Array.isArray(m) ? m[1] || 'c' : 'c'; }
function memE(m){ return Array.isArray(m) ? m[2] || null : null; }
// a member car: spawnCar() makes the object exactly as random traffic has it; then lane, model and speed are set
function mkCar(z, x, kind, v, fid, kp){ spawnCar(z); const c = cars[cars.length - 1];
  const truck = kind === 't'; c.x = x;
  if(truck){ c.model = kp.truck; c.truck = kp.truck === 'truck'; c.col = TRKCOL[(Math.random() * 3) | 0]; }
  else if(c.truck || c.model === 'truck' || c.model === 'box'){ c.truck = false; c.model = ENV.cars && ENV.cars.pick ? ENV.cars.pick() : 'coupe'; if(c.model === 'box') c.model = 'sedan'; c.col = CARCOL[(Math.random() * 5) | 0]; }
  c.speed = c.v0 = v; c.fm = fid; c.fmV = v; c.fmZ = z; c.fmSeen = frame; c.fmBy = false; c.passed = false; c.tl = undefined; c.sig = 0; return c; }

/* ---------------------------------------------------------------- the line solver
   Every car you will reach is an event: the time t you cross it (closing speed), where it will be then (x, scripted moves included),
   and its hit half-width. Between events the bike can move at most rate x dt sideways; at each event it must be clear of the car.
   Forward pass: the reachable set of x (a few intervals) after each event. Backward pass: a line through them. Returns the line as
   [{ t, x }] or null when there is none. Used by the placement check (worst case: boost speed, from anywhere on the road) and by
   the test bots. */
function subtract(set, a, b){ const out = []; for(const [p, q] of set){ if(q <= a || p >= b){ out.push([p, q]); continue; } if(p < a) out.push([p, a]); if(q > b) out.push([b, q]); } return out; }
function expand(set, d, lo, hi){ const out = []; for(const [p, q] of set){ const P = Math.max(lo, p - d), Q = Math.min(hi, q + d); if(out.length && P <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], Q); else out.push([P, Q]); } return out; }
F.solve = (ev, start, rate, wall) => {   // ev: [{ t, x, r }] sorted by t; start: [[lo, hi]]; rate: half-widths per second
  const sets = []; let cur = start.map(s => s.slice()), t0 = 0;
  for(let i = 0; i < ev.length; i++){ const e = ev[i]; cur = expand(cur, rate * Math.max(0, e.t - t0), -wall, wall); t0 = e.t;
    cur = subtract(cur, e.x - e.r, e.x + e.r).filter(s => s[1] - s[0] > 1e-3); if(!cur.length) return null; sets.push(cur); }
  // backward: the widest gap that still reaches the next point in time (a human line: the middle of an open lane, not a needle
  // beside it, unless the needle is the only way)
  const line = new Array(ev.length); let nx = null;
  for(let i = ev.length - 1; i >= 0; i--){ const S = sets[i], reach = nx === null ? 9 : rate * Math.max(0, ev[i + 1].t - ev[i].t) + 1e-6; let best = null, bs = -1e9;
    for(const [p, q] of S){ const lo = nx === null ? p : Math.max(p, nx - reach), hi = nx === null ? q : Math.min(q, nx + reach); if(hi < lo) continue;
      const m = Math.min(hi, Math.max(lo, (p + q) / 2)), sc = Math.min(q - p, .6) - .3 * (nx === null ? Math.abs(m) : Math.abs(m - nx)); if(sc > bs){ bs = sc; best = m; } }
    if(best === null){ let bd = 1e9; for(const [p, q] of S){ const m = Math.min(q, Math.max(p, nx)); if(Math.abs(m - nx) < bd){ bd = Math.abs(m - nx); best = m; } } }   // (float edge: the nearest point)
    line[i] = { t:ev[i].t, x:best, w:widthAt(S, best) }; nx = best; }
  return line; };
function widthAt(S, x){ for(const [p, q] of S) if(x >= p - 1e-6 && x <= q + 1e-6) return q - p; return 0; }
// where a member will be at time t from now (its script, if any)
function xAt(c, t, vp){ const e = c.fmE; if(!e || e.dead || e.done) return e && e.done ? e.to : c.x;
  const ttc = (c.z - (position + PZ)) / Math.max(1, vp - c.speed);
  // the script runs on contact time: blinker at SIG, move from SIG - MV at LC_V
  const tMove = e.on ? Math.max(0, MV - e.t) : Math.max(0, ttc - (SIG - MV)), x0 = c.x, d = e.to - x0, dur = Math.abs(d) / LC_V;
  if(t <= tMove) return x0; return x0 + d * Math.min(1, (t - tMove) / Math.max(1e-3, dur)); }
// the events ahead of the bike within `horizon` seconds at bike speed vp (all cars: a formation, or loose traffic)
F.events = (vp, horizon = 5, knowScripts = true) => { const pz = position + PZ, out = [], hb = hitB();
  for(const c of cars){ if(c.oth) continue; const dz = c.z - pz, cl = vp - c.speed; if(dz < -60 || cl <= 1) continue; const t = Math.max(0, dz / cl); if(t > horizon) continue;
    let x = c.x; if(c.fmE && (knowScripts || c.fmE.on)) x = xAt(c, t, vp);
    out.push({ t, x, r:halfOf(c) + hb + MARGIN, c }); }
  out.sort((a, b) => a.t - b.t); return out; };
// lateral authority at speed fraction sp on a bend of |curve| k (steering into a bend drifts: x1.1, the pull halves)
F.rate = (sp, k) => Math.max(.4, 2.2 * sp - 2 * sp * sp * Math.abs(k) * .3 * .45 - (Math.abs(k) < 1.8 ? .2 * sp : 0));

/* ---------------------------------------------------------------- placement check (offline: does the formation have a line?) */
// builds the formation's events as the bike would meet them at bike speed sp and formation speed vf, then solves from anywhere
F.check = (def, o = {}) => { const sp = o.sp || 1.3, vf = o.vf || vfAt(5), S = (o.sp2 || 1), mir = !!o.mir, k = o.curve || 0, wall = o.wall || 1.05, hb = o.hb || .043;
  const vp = sp * MAXS, ev = [], d0 = 30000;   // the front starts 30000 ahead: plenty to set up
  for(const [dz, ms] of def.rows) for(const m of ms){ const e = memE(m), v = (vf + (e && e.v || 0)) * MAXS, z = d0 + dz * 1000 * S, t = z / (vp - v), x = memX(m, mir);
    let xe = x; if(e && e.to != null){ const to = mir ? -e.to : e.to, tMove = t - (SIG - MV), dur = Math.abs(to - x) / LC_V; xe = t >= tMove + dur ? to : x + (to - x) * Math.max(0, (t - tMove) / dur); }
    ev.push({ t, x:xe, r:(memK(m) === 't' ? (o.truckHalf || .216) : (o.carHalf || .18)) + hb + MARGIN }); }
  ev.sort((a, b) => a.t - b.t); const t1 = ev[0].t - 1.2;   // the bike may be anywhere on the road 1.2 s before the first row
  const rel = ev.map(e => ({ t:e.t - t1, x:e.x, r:e.r }));
  return F.solve(rel, [[-wall, wall]], F.rate(sp, k) * .75, wall); };   // three quarters of the bike's authority: a margin for a human hand
// no decision hidden behind a truck: nothing in a truck's lane up to 6000 behind it, unless that lane is blocked at that row too
F.visionOK = def => { for(const [dz, ms] of def.rows) for(const m of ms){ if(memK(m) !== 't') continue; const x = memX(m, false);
    for(const [dz2, ms2] of def.rows){ if(dz2 <= dz || dz2 - dz > 6) continue; for(const m2 of ms2) if(Math.abs(memX(m2, false) - x) < .3){
      const blocked = ms2.length >= 2; if(!blocked) return false; } } } return true; };

/* ---------------------------------------------------------------- choosing: phrases (jo-ha-kyu) */
function pick(target, kind, tunnel, bend, avoid){ let best = [], bw = 0;
  for(const d of LIB){ if((d.fn && target > 1) || (d.tun && !tunnel)) continue; if(bend && !d.bend) continue; if(avoid.includes(d.id)) continue;   // (STAGGER, the first night's opener, also opens early phrases)
    const dd = Math.abs(d.d - target); if(dd > 1.01) continue; const w = (d.on[kind] || 1) * (dd < .5 ? 3 : 1) * (d.tnl ? (tunnel ? 4 : .5) : 1); best.push([d, w]); bw += w; }   // WEAVE: mostly in tunnels (a bore is rarely long enough to hold it all)
  if(!best.length) return BYID.gate; let r = Math.random() * bw; for(const [d, w] of best){ r -= w; if(r <= 0) return d; } return best[best.length - 1][0]; }
function buildPhrase(){ const lv = level(), n = lv < 2 ? 2 : lv < 3 ? 3 : lv < 4 ? 4 : 5;
  // jo (easy), ha (building), kyu (peak): targets rise through the phrase
  const tg = []; for(let i = 0; i < n; i++){ const f = i / (n - 1); tg.push(Math.max(1, Math.min(5, Math.round(lv - 1 + f * 1.2)))); }   // e.g. level 1: 1 1; level 3: 2 2 3 3; level 5: 4 4 5 5 5
  return { lv, vf:vfAt(lv), tg, i:0, wait:0, next:0, gap:lv < 2 ? 2.4 : lv < 3 ? 1.8 : 1.2, items:[] }; }

/* ---------------------------------------------------------------- placing one formation */
function stretchOK(z0, z1, vf, needTun){   // the segments where the bike will meet it (it drives on while you close)
  // where you meet it depends on your speed: a boosting bike (1.3 x MAXS) meets it nearest, a cruising one (.9) farther on
  const pz = position + PZ, meet = (z, vp) => z + vf * Math.max(0, (z - pz) / (vp - vf)), vLo = Math.max(vf + .15, Math.min(.9, speed / MAXS)), mA = meet(z0, 1.3), mB = meet(z1, vLo);
  const i0 = Math.floor(z0 / SEG), iA = Math.floor(mA / SEG) - 10, i1 = Math.min(segs.length - 1, Math.ceil(mB / SEG) + 10); let k = 0, nT = 0, nA = 0;
  if(i1 < iA) return null;
  for(let i = i0; i <= i1; i++){ const s = segs[i]; if(!s) return null;
    if(s.gore || s.forkZ || s.skRes || s.spjP) return null;   // a fork's gore, a kicker's stretch, a landmark jump's window
    if(typeof inSplitWin === 'function' && inSplitWin(i) >= 0) return null;
    if(i >= iA){ k = Math.max(k, Math.abs(s.curve || 0)); nA++; if(s.tunnel) nT++; } }
  for(let i = i1 + 1; i <= Math.min(segs.length - 1, i1 + 160); i++) if(segs[i] && segs[i].spjP) return null;   // a landmark jump clears the cars on the 150 segments before its bridge
  if(typeof gates !== 'undefined') for(let g = 1; g < gates.length; g += 2){ const B = gates[g]; if(B >= iA - 200 && B <= i1 + 10) return null; }   // a road border: its arrival card is up for ~3 s after it
  if(typeof forkGateAhead === 'function'){ const G = forkGateAhead(); if(G >= 0 && i1 >= G - SPLIT_PRE - 80 && i0 < G + SPLIT_POST + 10) return null; }   // the fork's split moves its own traffic there
  const tun = nA > 0 && nT >= nA * .85;   // (in a tunnel where you meet it: the bores have short gaps)
  if(needTun && !tun) return null;
  return { k, tun }; }
function place(def, z0, vf, lv, kind, mir, S){ const kp = KP[kind], fid = nid++, members = [];
  const v0 = (vf + kp.dv) * MAXS;
  for(const [dz, ms] of def.rows) for(const m of ms){ const e = memE(m), v = v0 + (e && e.v || 0) * MAXS, c = mkCar(z0 + dz * 1000 * S, memX(m, mir), memK(m), v, fid, kp);
    if(e && e.to != null) c.fmE = { to:mir ? -e.to : e.to, on:false, t:0, done:false, dead:false }; members.push(c); }
  // no oil slick where you will thread it (the director's keep-clear does the same): the stretch from its tail to where a cruising
  // bike meets its head is still beyond the draw distance's fade, so nothing visible changes
  { let zl = -1e12, zf = 1e12; for(const c of members){ if(c.z > zl) zl = c.z; if(c.z < zf) zf = c.z; } const pz = position + PZ, vfr = v0 / MAXS, zm = zl + vfr * Math.max(0, (zl - pz) / Math.max(.05, .8 - vfr));
    for(let i = Math.max(0, Math.floor(zf / SEG) - 30), i1 = Math.min(segs.length - 1, Math.ceil(zm / SEG) + 10); i <= i1; i++){ const q = segs[i]; if(q && q.hz && q.hz.type === 'oil') q.hz = null; } }
  const f = { id:fid, d0:Math.max(...members.map(c => c.z)) - position - PZ, def, mir, members, crash0:crashes, scrape:0, t:0, void:false, done:false, lv, close0:closeCalls };
  live.push(f); ST.seen++; fmCars += members.length; return f; }
// the spawn horizon: where random traffic is born, so nothing pops into view
const horizon = () => position + PZ + SPAWN_Z + 800;
function tryNext(dt){ const P = phr; if(P.i >= P.tg.length) return false; if(P.wait > 0){ P.wait -= dt; return true; }
  const pz = position + PZ, z0 = P.next; if(z0 > horizon()) return true;   // not yet at the horizon: wait (the phrase drives on at vf)
  const kind = kindHere(Math.min(z0, pz + 60000)), tunnelAhead = !!segAt(Math.min(z0 + 20000, pz + 100000)).tunnel;
  let def = null, S = KP[kind].sp, info = null;
  for(let tries = 0; tries < 4 && !def; tries++){ const cand = pick(P.tg[P.i], kind, tunnelAhead, false, recent.concat(tries ? ['weave'] : []));
    const len = cand.rows[cand.rows.length - 1][0] * 1000 * S, mn = Math.min(0, cand.rows[0][0] * 1000 * S);
    info = stretchOK(z0 + mn, z0 + len, P.vf, !!cand.tun); if(!info){ P.wait = .3; P.next += 3000; return true; }   // a fork, a kicker or a jump there: try a little further on
    let S2 = S; if(info.k > BEND){ if((info.k > SHARP && !cand.bend) || cand.str) continue; S2 = S * 1.25; }   // a bend: spaced out; a sharp one: only the bend-safe shapes
    if(!F.check(cand, { vf:P.vf + KP[kind].dv, sp2:S2, curve:info.k, sp:1.3 })) continue;
    def = cand; S = S2; }
  if(!def) def = BYID.gate;
  const mir = Math.random() < .5, f = place(def, z0, P.vf, P.lv, kind, mir, S);
  P.items.push(f); recent.push(def.id); if(recent.length > 3) recent.shift();
  const len = def.rows[def.rows.length - 1][0] * 1000 * S;
  P.next = z0 + len + Math.max(4000, P.gap * (1 - P.vf) * MAXS); P.i++; return true; }
function startPhrase(){ phr = buildPhrase(); phase = 'phrase'; phaseT = 0; phr.next = horizon();
  // loose traffic: anything already past the horizon goes (it is not drawn yet); far cars ease to the formation's pace or below, so
  // nothing catches the formations from behind
  const pz = position + PZ, hz = horizon() - 600, cap = phr.vf * MAXS * .96;
  let n = 0; for(let i = 0; i < cars.length; i++){ const c = cars[i]; if(!c.fm && !c.oth && c.fs === undefined && c.z > hz) continue; cars[n++] = c; } cars.length = n;
  for(const c of cars){ if(c.fm || c.oth || c.z < pz + 15000) continue; if(c.speed > cap) c.speed = cap; if(c.v0 !== undefined && c.v0 > cap) c.v0 = cap; } }
function endPhrase(){ if(phase === 'phrase'){ phase = 'ma'; phaseT = 0; } return false; }

/* ---------------------------------------------------------------- the payoff */
const audioOn = () => typeof M !== 'undefined' && M.ac && M.ac.state === 'running' && M.cur;
const FALL = [57, 60, 64, 69, 72, 76, 81, 84, 88, 93, 96, 100];
function sting(d){ if(!audioOn()) return; let Lad = FALL; try{ Lad = M.ladder(); }catch(e){}
  const now = M.ac.currentTime, at = typeof M.next === 'number' && M.next > now && M.next - now < .12 ? M.next : now + .01, s32 = 60 / 150 / 8;
  // a rising run in the chord of the moment (M.cur, the music's own chord), longer and higher for a harder formation
  const n = d >= 4 ? 4 : 3, b = Math.min(Lad.length - n - 1, 4 + d);
  for(let k = 0; k < n; k++) M.tone(midi(Lad[b + k]), .16 + k * .03, { type:'square', v:.011, atk:.002, at:at + k * s32 });
  M.tone(midi(Lad[b + n]), .5, { type:'triangle', v:.026, atk:.004, at:at + n * s32 });
  M.tone(midi(Lad[b + n]) * 2, .35, { type:'triangle', v:.008, atk:.004, at:at + n * s32 }); }
function reward(f){ const d = f.def.d, pts = 150 + d * 100;
  ST.threaded++; ST.streak++; if(ST.streak > ST.bestStreak) ST.bestStreak = ST.streak; ST.by[f.def.id] = (ST.by[f.def.id] || 0) + 1;
  const S = MECH.style; if(S && S.act) S.act('weave', pts, f.def.name);
  sting(d);
  const X = MECH.speedfx; if(X && X.flare) X.flare(.45 + d * .08, .55 + d * .05);
  if(F.onThread) try{ F.onThread(f); }catch(e){} }

/* ---------------------------------------------------------------- per frame */
function release(f){ for(const c of f.members){ if(c.fm === f.id){ c.fm = undefined; c.fmE = undefined; c.sig = 0; c.v0 = c.speed; } } fmCars = Math.max(0, fmCars - f.members.length); f.members.length = 0; }
function voidF(f, why){ if(f.void || f.done) return; f.void = why; ST.voided++; ST.lastVoid = why; if(ST.log.length < 80) ST.log.push(f.def.id + ':void-' + why); release(f); }
function runScript(c, vp, dt){ const e = c.fmE; if(!e || e.done || e.dead) return; const pz = position + PZ, ttc = (c.z - pz) / Math.max(1, vp - c.speed);
  if(!e.on){ if(ttc <= SIG){ if(ttc < SIG - .5 || ttc < 0){ e.dead = true; return; }   // you arrived too fast to see the signal in time: it stays put
      e.on = true; e.t = 0; c.sig = Math.sign(e.to - c.x); } return; }
  e.t += dt; if(e.t < MV) return;
  const d = e.to - c.x; c.x += Math.max(-LC_V * dt, Math.min(LC_V * dt, d)); if(Math.abs(e.to - c.x) < .004){ c.x = e.to; e.done = true; c.sig = 0; } }
/* ---------------------------------------------------------------- the first night's opening (coordinator, 2026-11-21, from the
   first-60-seconds pass: in the after-runs nobody got a near miss inside a minute)
   - jo: an empty road while you find the throttle, then the first cars at about 6-8 s: STAGGER, two slow cars on the lane lines, met
     at about 11-14 s: whatever lane you hold (centre or either side), one passes inside Close range and outside its hit box;
   - ha: STAGGER again on the first straight that is clear of set pieces, met by about 15-25 s when the road allows (teach, then test);
   - ma: nothing else until 30 s. A passive rider (no steering: the centre, or the barrier a bend drifts you to) can't be hit by either. */
// the first place at or beyond the horizon where a formation fits (no reserved road; straight enough), or -1
function fitFrom(def, vf, S, kMax){ const z0 = horizon(), len = def.rows[def.rows.length - 1][0] * 1000 * S;
  for(let k = 0; k < 60; k++){ const z = z0 + k * 1500, info = stretchOK(z, z + len, vf, false); if(info && info.k <= kMax) return z; } return -1; }
function firstNightStep(dt){ const t = typeof playT === 'number' ? playT : 0, kind = kindHere(position + PZ), S = KP[kind].sp;
  if(fnWait > 0){ fnWait -= dt; return; }
  if(fnStep === 0 && t >= 3.5){ const z = fitFrom(BYID.stagger, .25 - KP[kind].dv, S, t < 7 ? 1.2 : 9); if(z < 0){ fnWait = .3; if(t < 9) return; fnStep = 1; return; }   // on a straight if one comes by 7 s
    const f = place(BYID.stagger, z, .25 - KP[kind].dv, 1, kind, false, S); f.fn = true; fnStep = 1; }   // slow cars: you meet them soon (about 11-14 s), before any set piece's stretch
  else if(fnStep === 1 && t >= 8.5){ const z = fitFrom(BYID.stagger, .3 - KP[kind].dv, S, 1.2);
    if(z < 0){ fnWait = .3; if(t < 16) return; fnStep = 2; return; }   // nowhere straight and clear yet: keep looking until 16 s
    const f = place(BYID.stagger, z, .3 - KP[kind].dv, 1, kind, false, S); f.fn = true; fnStep = 2; }
  else if(fnStep === 2 && t >= 30 && !live.length){ phase = 'free'; phaseT = 0; freeFor = 2; fnStep = 3; } }
F.update = dt => {
  frame++; if(OFF) return;
  if(state !== 'play'){ if(live.length){ for(const f of live) release(f); live.length = 0; } phase = fnRide ? 'fn' : 'free'; fnStep = 0; phr = null; phaseT = 0; freeFor = FIRST; return; }
  const pz = position + PZ, vp = Math.max(speed, MAXS * .3);
  // who is still here, and moved only by us (a set piece removing or throwing a car voids its formation)
  for(const c of cars) if(c.fm) c.fmSeen = frame;
  for(let i = live.length - 1; i >= 0; i--){ const f = live[i]; f.t += dt;
    if(crashes !== f.crash0 && !f.crashed){ f.crashed = true; ST.crashed++; ST.streak = 0; }   // (first: the crash may re-pace the car it hit)
    let gone = false, ahead = 0, zMin = 1e12;
    for(const c of f.members){ if(c.fmBy) continue;   // passed: the core drops it 3000 behind you, that's fine
      if(c.fmSeen !== frame || c.fm !== f.id || c.fs !== undefined || c.oth){ gone = 'removed'; break; }
      if(Math.abs(c.z - c.fmZ - c.speed * dt) > 600){ gone = 'thrown'; break; } if(Math.abs(c.speed - c.fmV) > 1){ gone = 'repaced'; break; }   // thrown, held or re-paced by someone else (a slow-mo roll-back moves it < 400)
      c.fmZ = c.z; runScript(c, vp, dt); if(c.z > pz - 80){ ahead++; if(c.z < zMin) zMin = c.z; } else c.fmBy = true; }
    if(gone){ voidF(f, gone); live.splice(i, 1); continue; }
    if(zMin < pz + 9000 && typeof scrapeT === 'number' && scrapeT > 0) f.scrape += dt;
    if(!ahead){ f.done = true; const ok = !f.crashed && f.scrape < .3 && speed > MAXS * .5; if(ok) reward(f); else if(!f.crashed) ST.streak = 0;
      if(ST.log.length < 80) ST.log.push(f.def.id + (ok ? '' : f.crashed ? ':crash' : f.scrape >= .3 ? ':scrape' : ':slow')); release(f); live.splice(i, 1); continue; }
    if(f.t > 45 || (f.members.length && f.members[0].z - pz > f.d0 + 30000)){ voidF(f, 'lost'); live.splice(i, 1); } }   // you fell far behind it
  // the phrase clock
  phaseT += dt;
  if(phase === 'fn') firstNightStep(dt);
  else if(phase === 'free'){ if(phaseT > freeFor) startPhrase(); }
  else if(phase === 'phrase'){ const P = phr;
    P.next += P.vf * MAXS * dt;   // the phrase is a convoy driving at vf: its next slot moves on with it
    if(P.i < P.tg.length && phaseT < 50 && (P.i || phaseT < 12)) tryNext(dt);   // (a phrase that cannot start within 12 s gives way to loose traffic)
    else if(!live.length) endPhrase(); }
  else if(phase === 'ma'){ if(phaseT > maFor() && !live.length){ phase = 'free'; phaseT = 0; freeFor = freeAt(); } } };
const maFor = () => 4.5 - .45 * (level() - 1);        // ma: empty road after a phrase, 4.5 s early to 2.7 s late
const freeAt = () => 6 - .7 * (level() - 1);           // then loose traffic: 6 s early to 3.2 s late, then the next phrase
// the spawner's hook: how many cars to keep. While a phrase runs (and in its ma), no loose traffic is added
F.want = n => OFF || state !== 'play' || phase === 'free' ? n + fmCars : 0;
F.reset = () => { for(const f of live) release(f); live = [];
  fnRide = typeof firstNight === 'function' && !!firstNight(); fnStep = 0; fnWait = 0;
  if(fnRide && !OFF && typeof cars !== 'undefined') cars.length = 0;   // (reset() just spawned three random cars; the first night opens on an empty road)
  phase = fnRide ? 'fn' : 'free'; phaseT = 0; freeFor = FIRST; phr = null; recent = []; fmCars = 0;
  ST.seen = 0; ST.threaded = 0; ST.voided = 0; ST.crashed = 0; ST.streak = 0; ST.bestStreak = 0; ST.by = {}; ST.log = []; };
F.finish = rec => { rec.formations = ST.seen; rec.threaded = ST.threaded; rec.threadStreak = ST.bestStreak; };

/* ---------------------------------------------------------------- the style chain's labels (hud.js prebuilds them at warm) */
{ const SY = MECH.style; if(SY && SY.LABELS) for(const d of LIB) if(!SY.LABELS.includes(d.name)) SY.LABELS.push(d.name); }

/* ---------------------------------------------------------------- tests and tools */
F.dbg = {
  get phase(){ return phase; }, get phr(){ return phr; }, get live(){ return live; }, level, vfAt, KIND, KP, BYID,
  // place one formation now, front at z (default: the horizon). o: { mir, vf, S, kind }. Returns the formation, or null.
  spawn(id, z, o = {}){ const def = BYID[id]; if(!def) return null; const kind = o.kind || kindHere(z || horizon());
    return place(def, z || horizon(), o.vf || vfAt(o.lv || 3), o.lv || 3, kind, !!o.mir, o.S || KP[kind].sp); },
  hold(on){ phase = on ? 'hold' : 'free'; phaseT = 0; },   // 'hold': no phrases and no loose traffic (bot tests)
  stretchOK, sting:d => sting(d || 3) };
})();
