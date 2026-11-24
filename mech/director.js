/* Sundown mechanic module: the cinematic director and the rarity governor (MECH.director). See setpiece/README.md, "Director and rarity".
   Load it BEFORE the set pieces (its place() must run first on every segment, and set pieces may call register() at load time):
     <script src="mech/director.js"></script>   right before   <script src="setpiece/kaiju.js"></script>

   1. Rarity governor: keeps every epic moment novel.
      request(id, opts) -> true/false   decide now (placement or runtime) whether this moment happens; deterministic per ride
      done(id)                          the player has now seen it (optional: bookings auto-commit when the rider passes opts.seg)
      isFirstSighting(id)               never seen before this ride (stays true for the rest of the ride of the first sighting)
      register(id, opts)                announce a moment at load, so a road visit can choose fairly among all of its candidates
      dress(id)                         landmark tier: play the full cinematic dressing (card, slow-mo) this visit?
      Hero tier: <= 1 per road visit, >= 90 s apart, <= 3 per ride, chance roll damped by how recently it was seen (persisted in
      localStorage 'sundown.director'), a guaranteed first sighting. Ambient tier: >= 30 s from other ambient beats, a per-id cooldown,
      no per-ride cap. Landmark tier: always happens, never uses budget; only its dressing is governed (dress()).
      ?force=<id>[,<id>] or ?force=all bypasses the governor (with named ids, every other hero moment stands down, so the forced one plays alone); ?dev shows a status line; ?dseed=N salts the per-ride rolls.
   2. Cinematic director: cine({ letterbox, slowmo, duck, shake, tilt, zoom, card, guard, dur }) -> handle { end(), hit(n), t, alive }.
      Everything runs on game time (update dt), so the pause menu freezes it. Reduced motion: no shake, tilt or zoom; fades, not slides.
   Core hooks it uses when sundown.html provides them (see the patch in setpiece/README.md): TIME.scale (slow-mo; without it the director
   rolls position back the way setpiece/jump.js does), and mech('post', now) after the world is drawn (camera roll and zoom, letterbox,
   card; without it the letterbox and card draw in drawScreen and there is no roll or zoom). The music duck is a gain node the director
   splices between M.out and M.vol itself (no core change); moment SFX that must stay loud can connect to MECH.director.bus(). */
"use strict";
(function(){
const BROWSER = typeof window !== 'undefined' && typeof window.MECH !== 'undefined';

/* ================================================================== the rarity governor (pure: no game globals, so node can test it) */
const CFG = {
  heroMax:3, heroGapS:90,             // per ride; seconds between hero moments
  ambGapS:30, ambCooldownS:120,       // ambient: spacing from other ambient beats; per-id cooldown (default)
  segPerS:55,                          // placement decides in segments: 55 segments a second is top speed (MAXS), so 90 s is never less
  heroChance:.5,                       // base chance a seen hero moment fires on an eligible visit
  recover:[0, .08, .35, .7, 1],        // chance multiplier by rides since last seen (0 = this ride, 1 = last ride, ... 4+ = recovered)
  staleRides:6, staleBoost:1.5,        // not seen for 6+ rides: a little more likely
  freshMs:3 * 864e5,                   // last seen over three days ago: fully recovered whatever the ride count
  unseenDamp:.35,                      // while any live hero moment is still unseen, seen ones roll at 35%, leaving room for first sightings
  dressChance:.34, maxIds:64, key:'sundown.director',
  // the empty night (research/sundown-craft/quiet.md): breathing room after every hero moment, and now and then a long quiet stretch
  breathS:32,                          // after a hero moment: no ambient beat (and, in mech/arrival.js and ui/cutin.js, no card) for this long
  quietFirstS:50, quietEveryS:20, quietChance:.35, quietS:[62, 78], quietGapS:150, quietDuck:.62 };

// default tier and roads for every moment in the plan ('*' = any road). A moment is a candidate only once its set piece registers it
// (or first requests it), so moments not built yet never take a road visit's slot.
const CATALOGUE = {
  kaiju:{ tier:'hero', roads:['bay'] }, typhoon:{ tier:'hero', roads:['coast'] }, hanabi:{ tier:'hero', roads:['paddies', 'coast'] },
  matsuri:{ tier:'hero', roads:['neon'] }, shinkansen:{ tier:'hero', roads:['paddies'] },
  fuji:{ tier:'ambient', roads:['coast', 'tunnels'], cooldown:'ride', chance:.7 }, jets:{ tier:'ambient', roads:['haneda'], cooldown:9, gap:0 },
  jump:{ tier:'landmark', roads:['*'] },
  greatwave:{ tier:'hero', roads:['coast'], card:{ kanji:'大波', name:'GREAT WAVE', sub:'ride the barrel', col:'#7ad8ff' } },
  fireball:{ tier:'hero', roads:['refinery'], card:{ kanji:'爆発', name:'INFERNO', sub:'outrun the fire', col:'#ff8a2a' } }, avalanche:{ tier:'hero', roads:['snow'] },
  jetwash:{ tier:'hero', roads:['haneda'] }, heli:{ tier:'ambient', roads:['*'], cooldown:150 }, rockslide:{ tier:'hero', roads:['pass'] },
  cavein:{ tier:'hero', roads:['tunnels'] }, screen:{ tier:'hero', roads:['neon'] }, lava:{ tier:'hero', roads:['sakurajima'] },
  naruto:{ tier:'hero', roads:['shimanami'] }, flood:{ tier:'hero', roads:['aqua'] }, boss:{ tier:'hero', roads:['*'], chance:.35 }, teiden_boss:{ tier:'hero', roads:['akiba'] },
  farjets:{ tier:'ambient', roads:['*'], cooldown:90 }, megalodon:{ tier:'hero', roads:['aqua'] },
  phantom:{ tier:'hero', roads:['tunnels', 'pass', 'paddies', 'snow', 'kurobe', 'coast', 'shimanami', 'gion'], chance:.5 } };   // setpiece/phantom.js (it registers itself too)

// hashing, never Math.random: the game's road generation (and test seeds) keep their own random sequence
function h32(s){ let h = 2166136261 >>> 0; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function u01(){ let h = h32(Array.prototype.join.call(arguments, '|')); h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

function makeGovernor(io, cfg){
  const C = Object.assign({}, CFG, cfg || {}), FORCE = new Set(io.force || []), live = {};
  let P = io.load(); if(!P || typeof P !== 'object' || P.v !== 1 || typeof P.m !== 'object') P = { v:1, ride:0, m:{} };
  const save = () => { const ids = Object.keys(P.m); if(ids.length > C.maxIds){ ids.sort((a, b) => (P.m[a].t || 0) - (P.m[b].t || 0)); for(const id of ids.slice(0, ids.length - C.maxIds)) delete P.m[id]; } io.save(P); };
  let R = null;
  const G = { C, get P(){ return P; }, get R(){ return R; }, live };
  const spec = id => Object.assign({ tier:'hero', roads:['*'] }, CATALOGUE[id] || CATALOGUE[String(id).split(':')[0]] || {}, live[id] || {});
  const seenBefore = id => { const m = P.m[id]; return !!(m && m.r && m.r < R.no); };   // seen in an earlier ride
  const cdSegs = (v, def) => v === 'ride' ? Infinity : (v == null ? def : v) * C.segPerS;
  G.register = (id, o) => { live[id] = Object.assign(live[id] || {}, o || {}, { on:true }); if(o && o.roads && !Array.isArray(o.roads)) live[id].roads = [o.roads]; return G; };
  G.beginRide = no => { R = { no:no || P.ride + 1, salt:io.salt || '', started:false, book:[], visits:new Map(), memo:new Map() }; return R; };
  G.start = () => { if(!R || R.started) return; R.started = true; P.ride = Math.max(P.ride, R.no); save(); };
  // segments regenerated past a border (a fork was taken): forget everything decided while placing them
  G.regen = i => { if(!R) return; R.book = R.book.filter(b => b.i0 < i || b.seen); for(const [k, v] of R.visits) if(v.i0 >= i) R.visits.delete(k); for(const [k, v] of R.memo) if(v.i0 >= i) R.memo.delete(k); };
  const commit = b => { if(b.seen || !R.started) return; b.seen = true; if(io.seen) io.seen(b); if(b.forced && !C.forceCommits) return; const m = P.m[b.id] || (P.m[b.id] = {}), now = io.now();
    if(!m.r) m.f = R.no; m.r = R.no; m.t = now; m.n = (m.n || 0) + 1; if(b.dress) m.d = R.no; save(); };
  G.done = (id, seg) => { if(!R) return; let hit = false; for(const b of R.book) if(b.id === id && !b.seen && (seg == null || Math.abs(b.seg - seg) < 400)){ commit(b); hit = true; break; }
    if(!hit){ commit({ id, seg:seg || 0, tier:spec(id).tier }); } };
  G.reached = seg => { if(!R || !R.started) return; for(const b of R.book) if(!b.seen && b.auto && seg >= b.seg) commit(b); };
  G.isFirst = id => { const m = P.m[id]; return !m || !m.r || (R && m.f === R.no); };
  const heroes = () => R.book.filter(b => b.tier === 'hero' && !b.forced);
  const gapOK = (seg, list, gap) => list.every(b => Math.abs(b.seg - seg) >= gap);
  function chanceOf(id){ const s = spec(id), m = P.m[id], base = s.chance != null ? s.chance : C.heroChance; if(!m || !m.r) return 1;
    const k = R.no - m.r; let rec = C.recover[Math.min(k, C.recover.length - 1)];
    if(k >= C.staleRides) rec = C.staleBoost; if(io.now() - (m.t || 0) > C.freshMs && k > 0) rec = Math.max(rec, 1);
    const unseenLive = Object.keys(live).some(j => j !== id && live[j].on && spec(j).tier === 'hero' && !seenBefore(j) && !R.book.some(b => b.id === j));
    return Math.min(1, base * rec * (unseenLive ? C.unseenDamp : 1)); }
  const fits = (id, road) => { const r = spec(id).roads; return r.includes('*') || r.includes(road); };
  // one road visit: choose at most one hero among every live candidate for this road. First sightings win (road-specific ones first, in
  // registration order); otherwise each candidate rolls its own damped chance and the best roll (relative to its chance) is chosen.
  function resolve(visit, road, seg, i0){ let v = R.visits.get(visit); if(v) return v; v = { chosen:null, i0, road, why:'' }; R.visits.set(visit, v);
    if(heroes().length >= C.heroMax){ v.why = 'ride cap'; return v; }
    if(!gapOK(seg, heroes(), C.heroGapS * C.segPerS * .5)){ v.why = 'gap'; return v; }   // the moment's own position is checked again on request
    const ids = Object.keys(live).filter(id => live[id].on && spec(id).tier === 'hero' && fits(id, road) && !R.book.some(b => b.id === id));
    // unseen first: the one with the fewest roads wins (a road-specific moment before an any-road one), ties broken by the ride's roll
    const nr = id => spec(id).roads.includes('*') ? 99 : spec(id).roads.length, fresh = ids.filter(id => !seenBefore(id));
    fresh.sort((a, b) => nr(a) - nr(b) || u01(R.salt, R.no, a, visit) - u01(R.salt, R.no, b, visit));
    if(fresh.length){ v.chosen = fresh[0]; v.why = 'first sighting'; return v; }
    let best = null, bs = 1; for(const id of ids){ const p = chanceOf(id), r = u01(R.salt, R.no, id, visit); if(p > 0 && r < p && r / p < bs){ bs = r / p; best = id; } }
    v.chosen = best; v.why = best ? 'roll' : 'no roll'; return v; }
  /* o: { tier, seg (the moment's segment), visit (road-visit key), road (road key), i0 (decision index), chance, cooldown, gap, auto } */
  G.request = (id, o) => { o = o || {}; if(!R) G.beginRide(); const s = spec(id), tier = o.tier || s.tier, seg = o.seg | 0, i0 = o.i0 == null ? seg : o.i0;
    const key = id + '@' + seg, mm = R.memo.get(key); if(mm) return mm.ok;
    const book = (extra) => { const b = Object.assign({ id, tier, seg, i0, visit:o.visit, auto:o.auto !== false, seen:false }, extra); R.book.push(b); return b; };
    let ok = false, why = '';
    if(io.demo){ const e = io.demo(id, seg, tier); ok = !!e; why = e ? (e.nudge ? 'authored, nudged ' + e.nudge : 'authored') : 'not authored'; if(ok) book({ forced:true, demo:true }); }   // ?demo=: exactly the authored events (mech/demo.js), never the governor
    else if(FORCE.has(id) || FORCE.has('all')){ ok = true; why = 'forced'; book({ forced:true }); }
    else if(tier === 'landmark'){ ok = true; why = 'landmark'; book({}); }
    else if(tier === 'hero' && FORCE.size && !FORCE.has('all')){ why = 'force mode'; }   // ?force=<id>: the forced moment plays alone (no first sighting elsewhere takes its road)
    else if(io.quiet && io.quiet(seg)){ why = 'quiet'; }   // inside the quiet stretch: nothing is staged
    else if(tier === 'ambient' && !(io.breathOff && io.breathOff()) && !heroes().every(b => b.seg > seg || seg - b.seg >= C.breathS * C.segPerS)){ why = 'breath'; }   // breathing room after a hero moment
    else if(tier === 'ambient'){ const amb = R.book.filter(b => b.tier === 'ambient' && !b.forced), gap = cdSegs(o.gap != null ? o.gap : s.gap, C.ambGapS), cd = cdSegs(o.cooldown != null ? o.cooldown : s.cooldown, C.ambCooldownS);
      if(!gapOK(seg, amb.filter(b => b.id !== id && b.gap !== 0), gap)) why = 'ambient gap';
      else if(!gapOK(seg, amb.filter(b => b.id === id), cd)) why = 'cooldown';
      else { const p = !P.m[id] || !P.m[id].r ? 1 : (o.chance != null ? o.chance : s.chance != null ? s.chance : 1); ok = u01(R.salt, R.no, id, seg) < p; why = ok ? 'ambient' : 'no roll'; }
      if(ok) book({ gap:(o.gap != null ? o.gap : s.gap) === 0 ? 0 : 1 }); }
    else { if(!live[id]) G.register(id, { roads:[o.road || '*'], lazy:true });
      const v = o.visit != null ? resolve(o.visit, o.road, seg, i0) : { chosen:id };
      if(v.chosen === null && v.why !== 'ride cap' && v.why !== 'gap' && live[id].lazy && !R.book.some(b => b.visit === o.visit && b.tier === 'hero')){   // a late, unregistered candidate
        const p = seenBefore(id) ? chanceOf(id) : 1; if(u01(R.salt, R.no, id, o.visit) < p) v.chosen = id; }
      if(v.chosen !== id) why = v.chosen ? 'visit has ' + v.chosen : v.why || 'not chosen';
      else if(heroes().length >= C.heroMax) why = 'ride cap';
      else if(!gapOK(seg, heroes(), C.heroGapS * C.segPerS)) why = 'gap';
      else { ok = true; why = seenBefore(id) ? 'roll' : 'first sighting'; book({}); } }
    R.memo.set(key, { ok, i0, why }); G.last = { id, ok, why, seg }; return ok; };
  G.dress = (id, visit) => { if(!R) G.beginRide(); const key = 'dress:' + id + '@' + visit, mm = R.memo.get(key); if(mm) return mm.ok;
    const m = P.m[id]; let ok = !m || !m.r || m.f === R.no || !!io.demo;   // (a demo always dresses) if(!ok){ const k = R.no - (m.d || 0); ok = k >= 1 && u01(R.salt, R.no, 'dress', id, visit) < (io.dressChance ? io.dressChance() : C.dressChance); }   // a veteran still gets the card about 1 visit in 3 (it was damped to ~0-17% for two rides after a dressed one, so cards all but vanished)
    if(ok){ const b = R.book.find(x => x.id === id && x.visit === visit && !x.seen); if(b) b.dress = true; }
    R.memo.set(key, { ok, i0:visit | 0 }); return ok; };
  G.snapshot = pseg => { if(!R) return null; const H = heroes(), amb = R.book.filter(b => b.tier === 'ambient' && !b.forced);
    const lastH = H.filter(b => b.seen || b.seg <= pseg).sort((a, b) => b.seg - a.seg)[0];
    return { ride:R.no, started:R.started, hero:H.length, heroMax:C.heroMax, heroIn:lastH ? Math.max(0, Math.round((lastH.seg + C.heroGapS * C.segPerS - pseg) / C.segPerS)) : 0,
      next:H.filter(b => b.seg > pseg).map(b => b.id + '@' + b.seg), amb:amb.filter(b => b.seg <= pseg).slice(-3).map(b => b.id + ' ' + Math.round((pseg - b.seg) / C.segPerS) + 's ago'),
      book:R.book.map(b => ({ id:b.id, tier:b.tier, seg:b.seg, seen:b.seen, forced:!!b.forced })), visits:[...R.visits].map(([k, v]) => ({ visit:k, road:v.road, chosen:v.chosen, why:v.why })) }; };
  return G; }

if(typeof module !== 'undefined' && module.exports) module.exports = { makeGovernor, CATALOGUE, CFG, u01 };
if(!BROWSER) return;

/* ================================================================== browser glue */
const QS = new URLSearchParams(location.search), DEVL = /[?&]dev(?=[=&]|$)/.test(location.search);
const OFF = new Set(['typhoon']);   /* Kellan 2026-11-22: temporarily disabled everywhere (normal, force=all, demo); ?force=typhoon still plays it alone. Empty this set to bring it back */
const FORCE = QS.get('force') === 'paced' ? [] : (QS.get('force') || 'all').split(',').map(s => s.trim()).filter(Boolean);   // Kellan 2026-11-21: every event on by default (force=all); ?force=paced restores the governor and the first night
const quietSys = () => !!(MECH.quiet && MECH.quiet.enabled);   // mech/arrival.js QUIET_ON: off = no quiet stretches, no breathing room, cards ~1 visit in 2
const DEMO = window.DEMO && window.DEMO.ask ? window.DEMO : null;   // mech/demo.js (?demo=<level>): the authored night replaces the governor
const G = makeGovernor({ force:FORCE, salt:QS.get('dseed') || '', demo:DEMO ? (id, seg, tier) => DEMO.ask(id, seg, tier) : null, quiet:seg => QT.on && seg >= QT.s0 && seg <= QT.s1, breathOff:() => !quietSys(), dressChance:() => quietSys() ? CFG.dressChance : .5,
  seen(b){ if(b.tier === 'hero' && MECH.quiet && MECH.quiet.breathe) MECH.quiet.breathe(CFG.breathS); },   // the rider passed a hero moment: breathe
  load(){ try{ return JSON.parse(localStorage.getItem(CFG.key) || 'null'); }catch(e){ return null; } },
  save(o){ try{ localStorage.setItem(CFG.key, JSON.stringify(o)); }catch(e){} },
  now(){ return Date.now(); } });   // wall-clock timestamps only date the history; no animation reads them
if(!window.TIME) window.TIME = { scale:1 };
if(!window.CAM) window.CAM = { zoom:1, roll:0 };

let segsRef = null, curI = -1, lastI = -1;
const pSeg = () => Math.floor((position + PZ) / SEG);
function rideCheck(){ if(typeof segs !== 'undefined' && segs !== segsRef){ segsRef = segs; lastI = -1; G.beginRide(); } }
function visitOf(seg){ const s = segs[seg]; if(!s) return { visit:seg, road:'' }; let k = seg; while(k > 0 && segs[k - 1] && segs[k - 1].land === s.land && seg - k < 8000) k--; return { visit:k, road:LANDS[s.land].key }; }

const D = MECH.director = {
  CFG, CATALOGUE, gov:G,
  register(id, o){ G.register(id, o); return D; },
  // demo mode: the authored spot (segment of the moment) for a set piece that chooses its own, or null (always null in normal play)
  target(id, seg){ return DEMO ? DEMO.target(id, seg == null ? (curI >= 0 ? curI : pSeg()) : seg) : null; }, get demo(){ return !!DEMO; },
  request(id, o){ if(OFF.has(id) && !FORCE.includes(id)) return false; rideCheck(); o = Object.assign({}, o || {}); const placing = curI >= 0;
    if(o.seg == null) o.seg = placing ? curI : pSeg(); o.i0 = placing ? curI : (o.i0 == null ? o.seg : o.i0);
    if(o.visit == null || o.road == null){ const v = visitOf(placing ? curI : o.seg); if(o.visit == null) o.visit = v.visit; if(o.road == null) o.road = v.road; }
    const ok = G.request(id, o); if(DEVL) console.log('[director]', id, ok ? 'YES' : 'no', '(' + (G.last && G.last.why) + ')', 'seg', o.seg, o.road); return ok; },
  done(id){ rideCheck(); G.done(id, typeof position === 'number' ? pSeg() : null); },
  isFirstSighting(id){ rideCheck(); return G.isFirst(id); },
  dress(id){ rideCheck(); const v = visitOf(curI >= 0 ? curI : pSeg()); return G.dress(id, v.visit); },
  bus(){ duckSetup(); return BUS || (M && M.out); },
  quietOn(){ return QT.on; }, endQuiet(){ if(QT.on) quietEnd(); }, get quiet(){ return QT; },   // a hero moment's own card ends the quiet stretch (ui/cutin.js, MECH.quiet.claim)
  cardOn(){ return bandOn(); },   // a hazard band card is on screen (mech/arrival.js can hold its road card meanwhile)
  get debug(){ const s = typeof position === 'number' && segs ? G.snapshot(pSeg()) : null;
    return { cfg:CFG, persisted:G.P, ride:s, force:FORCE, cines:CINES.map(c => ({ id:c.o.id, t:+(T - c.t0).toFixed(2), ending:c.endT != null })), time:window.TIME, cam:window.CAM, duck:DUCK ? { gain:DUCK.gain.value, target:duckWas, ac:M.ac.state } : null,
      clear(){ try{ localStorage.removeItem(CFG.key); }catch(e){} }, gov:G }; },
  cine, place, update, reset, hitCar, post, drawScreen, warm };

/* ---------------------------------------------------------------- ?near=<id>: the review player's cut to just before a moment
   ?near=<event id>[&lead=<s>]: in normal play, once the countdown's GO starts the ride, the road ahead is laid until that event is booked,
   then the ride is cut to `lead` seconds (default 4) at cruise before the moment's approach begins: its card, or its `pre` footprint
   (SD_EVENTS in mech/demo.js: `nearAt` when measured, else `pre`), so the review opens seconds before the moment. ?near=jump:<road> does the
   same for a landmark jump; ?near=road starts a little into the current road (past its border blend). Without ?force= the event is forced
   (sundown.html, before the env scripts read the URL) and without ?land= the ride starts on its road (sundown.html, beside LAND0).
   The cut happens right after GO (the countdown always plays, at the start line), between frames (a microtask after the GO frame):
   the road is laid past the spot, traffic near the bike is cleared, the bike arrives at cruise and this director's cinematics reset, the
   way the demo's N and the console's `seg` park. Nothing found within NEAR.tmax ms or NEAR.span segments: a console warning, the ride
   simply goes on. The ride is marked dev (rec.dev 'near=<id>'): it never saves to best nights. Ignored in a ?demo= ride (N skips there). */
const NEAR = (() => { const id = QS.get('near'); if(!id) return null; if(DEMO){ console.warn('[near] ignored in a demo ride (N skips to the next event)'); return null; }
  const l = parseFloat(QS.get('lead')); return { id, lead:Number.isFinite(l) ? Math.max(0, Math.min(30, l)) : 4, cruise:.8, pace:1, span:24000, tmax:4000, chunk:800, frameMs:24, st:'wait', segs:null, t0:0, used:false, log:[] }; })();
D.near = NEAR;
const JUMP_APPROACH = 120;   // a landmark jump's run-up (its card and the barricades at the lip), segments before its booked launch
function nearApproach(id){ if(/^jump:/.test(id)) return JUMP_APPROACH; const e = (window.SD_EVENTS || []).find(x => x.id === id); return e ? (e.nearAt != null ? e.nearAt : e.pre || 0) : 0; }
function nearFind(id, p){ const R = G.R; if(!R) return null; let best = null; for(const b of R.book) if(b.id === id && !b.seen && b.seg > p + 20 && (!best || b.seg < best.seg)) best = b; return best; }
function nearDev(){ if(NEAR.used) return; NEAR.used = true;
  try{ const os = store.set; if(!os.__near){ const f = function(k, v){ if(k === 'arcade.sundown' && Array.isArray(v)) v = v.filter(r => !(r && r.dev)); return os.call(this, k, v); }; f.__near = true; store.set = f; } }catch(e){ console.warn('[near] store hook', e); } }
D.finish = rec => { if(NEAR && NEAR.used && NEAR.segs === segs) rec.dev = (rec.dev ? rec.dev + ' ' : '') + 'near=' + NEAR.id; };
function nearCut(to){ const p = pSeg(); if(to <= p + 40) return false;
  extend(to + DRAW + 400); const dz = (to - p) * SEG; position += dz;
  for(const c of cars){ c.z += dz; const d = c.z - (position + PZ); if(d > -6 * SEG && d < 70 * SEG) c.z = -1e9; }   // (cars kept their places around you, but none right on top of or just ahead of the bike)
  try{ reset(); }catch(e){} return true; }
function nearStep(){ const N = NEAR; if(N.segs !== segs){ N.segs = segs; N.st = 'wait'; }   // a new ride (Play again) cuts again
  if(N.st !== 'wait') return; N.st = 'seek'; N.t0 = performance.now(); nearDev();
  if(typeof speed === 'number') speed = Math.max(speed, MAXS * N.cruise);   // arriving, not starting: the bike is at cruise from GO
  queueMicrotask(nearGo); }   // (between frames: the core's update for this frame is over, as when the console's seg runs)
function nearGo(){ const N = NEAR; if(N.st !== 'seek' || N.segs !== segs || state !== 'play') return;
  try{ const p = pSeg(), f0 = performance.now(), cs = MAXS / SEG * N.pace;   /* (lead seconds at top speed: from cruise the bike is there within a second) */
    if(N.id === 'road'){ const z = zoneOfSeg(p), s0 = z > 0 ? gates[2 * z - 1] : 0, to = s0 + (z > 0 ? BL_POST : 0) + 60;
      const ok = nearCut(to); N.st = 'done'; N.log.push({ id:N.id, from:p, to:pSeg(), cut:ok }); console.log('[near] road: ' + (ok ? 'cut ' + p + ' -> ' + pSeg() : 'already there, riding on from ' + p)); return; }
    let b = nearFind(N.id, p);
    while(!b && segs.length < p + N.span && performance.now() - f0 < N.frameMs){ extend(segs.length + N.chunk); b = nearFind(N.id, p); }
    if(!b){ if(segs.length < p + N.span && performance.now() - N.t0 < N.tmax){ requestAnimationFrame(() => queueMicrotask(nearGo)); return; }   // keep laying next frame
      N.st = 'done'; N.log.push({ id:N.id, from:p, found:false, laid:segs.length }); console.warn('[near] ' + N.id + ': not booked within ' + (segs.length - p) + ' segments / ' + Math.round(performance.now() - N.t0) + ' ms; riding on from here'); return; }
    const ap = nearApproach(N.id), to = Math.round(b.seg - ap - N.lead * cs), ok = nearCut(to);
    N.st = 'done'; N.log.push({ id:N.id, seg:b.seg, approach:ap, from:p, to:pSeg(), cut:ok, ms:Math.round(performance.now() - N.t0) });
    console.log('[near] ' + N.id + ' booked at ' + b.seg + ' (approach ' + ap + '): ' + (ok ? 'cut ' + p + ' -> ' + pSeg() : 'already within the lead, riding on from ' + p)); }
  catch(e){ N.st = 'done'; console.warn('[near] failed, riding on', e); } }

/* ---------------------------------------------------------------- placement and the ride */
function place(i){ rideCheck(); if(i <= lastI) G.regen(i); lastI = i; curI = i; }
let T = 0, lastScale = 1, sawPost = false;
function update(dt){ curI = -1; rideCheck();
  const ug = dt / (window.TIME.core ? (lastScale || 1) : 1); T += ug;   // unscaled game seconds: stops while paused, ignores slow-mo
  if(state === 'play'){ G.start(); G.reached(pSeg()); }
  if(NEAR && state === 'play') nearStep();
  quietStep();
  if(state !== 'play' && state !== 'pulled' && CINES.length) for(const c of CINES) if(c.endT == null) c.endT = T - 9;   // the ride ended: drop everything
  stepCines(ug, dt); }
function reset(){ for(const c of CINES) c.endT = -1e9; CINES.length = 0; if(QT.on) quietAudio(false); QT.on = false; QT.next = CFG.quietFirstS; QT.n = 0; QT.count = 0; applyNeutral(); }
/* The quiet stretch (Wangan Midnight's 3 AM run; Journey's and Ghost of Tsushima's empty stretches): now and then, 62-78 s in which nothing
   announces anything. No set piece or ambient beat is staged in it (request() refuses 'quiet'), no card or cut-in plays and only danger
   is called out (mech/arrival.js, ui/cutin.js), the HUD dims (env/hud.js), the music thins and the night's own sound comes up. A chase
   ends it at once. It starts only with no hero moment booked inside it, and on a per-ride roll (deterministic, never Math.random). */
const QT = { on:false, t0:0, t1:0, s0:0, s1:0, next:CFG.quietFirstS, n:0, count:0 };
function quietAudio(on){ try{ if(window.MUSIC && MUSIC.thin) MUSIC.thin(on ? 1 : 0); if(window.SFX && SFX.ambience) SFX.ambience(on ? 1 : 0); }catch(e){ console.warn('director quiet audio', e); } }   // proposed hooks (quiet.md); the duck below thins the music meanwhile
function quietEnd(){ QT.on = false; QT.next = (typeof playT === 'number' ? playT : 0) + CFG.quietGapS; quietAudio(false); if(DEVL) console.log('[director] quiet ends'); }
function quietStep(){ if(DEMO) return; if(state !== 'play' || typeof playT !== 'number'){ if(QT.on && state !== 'pulled') quietEnd(); return; }
  if(QT.on){ if(playT >= QT.t1 || copT > 0) quietEnd(); return; }
  if(!quietSys() || playT < QT.next) return; QT.next = playT + CFG.quietEveryS;
  const R = G.R; if(!R || copT > 0 || CINES.length || (MECH.cutin && MECH.cutin.on && MECH.cutin.on())) return;
  const ps = pSeg(), span = Math.round((CFG.quietS[1] + 20) * CFG.segPerS);   // +20 s: a hero's card and build-up start well before its booked segment
  if(R.book.some(b => b.tier === 'hero' && !b.seen && b.seg > ps - 60 && b.seg < ps + span)) return;   // a hero moment is booked inside it: not now
  if(u01(R.salt, R.no, 'quiet', QT.n++) >= CFG.quietChance) return;
  const len = CFG.quietS[0] + (CFG.quietS[1] - CFG.quietS[0]) * u01(R.salt, R.no, 'quietLen', QT.n);
  QT.on = true; QT.t0 = playT; QT.t1 = playT + len; QT.s0 = ps; QT.s1 = ps + Math.round(len * CFG.segPerS); QT.count++; quietAudio(true);
  if(DEVL) console.log('[director] quiet stretch', Math.round(len) + 's', 'seg', ps, '-', QT.s1); }
/* warm-up: nothing is built when a cine() starts. Every moment card the catalogue (or a set piece's register(id, { card })) names is built
   now, by mech/arrival.js (momentWarm) or as the director's own fallback card; the camera buffer is allocated at the canvas size.
   Both are rebuilt only after a window resize (and the fallback cards once the pixel font has loaded). */
function warmCards(){ if(typeof cx === 'undefined' || !cx) return;   // before the game's canvas exists (fonts can land first): the game's own warm() call builds them
  const A = MECH.arrival, seen = new Set();
  for(const src of [CATALOGUE, G.live]) for(const id in src){ const c = src[id] && src[id].card; if(!c || c.kanji === undefined) continue; const k = c.kanji + '|' + c.name + '|' + (c.sub || '') + '|' + (c.col || ''); if(seen.has(k)) continue; seen.add(k);
    try{ if(A && A.momentWarm) A.momentWarm(c); else cardArt(c); }catch(e){ console.warn('director card warm', id, e); }
    try{ bandArt(c); }catch(e){ console.warn('director band warm', id, e); } } }   // the hazard band too (any card may be shown as one), so nothing is built mid-ride
function warmBuf(){ if(typeof cx === 'undefined' || !cx) return; const cv = cx.canvas; if(!BUF) BUF = document.createElement('canvas'); if(BUF.width !== cv.width || BUF.height !== cv.height){ BUF.width = cv.width; BUF.height = cv.height; } }
function warm(){ try{ if(typeof cx !== 'undefined' && cx){ txt3('0', CREAM, INK); warmBuf(); warmCards(); } }catch(e){ console.warn('director warm', e); } }
addEventListener('resize', () => { clearTimeout(warm.t); warm.t = setTimeout(() => { for(const k in CARDC) delete CARDC[k]; for(const k in BANDC) delete BANDC[k]; warm(); }, 150); });   // after the game's own resize (registered later) has sized the canvas
if(document.fonts) document.fonts.load('16px DotGothic16', '大波爆発').then(() => setTimeout(() => { for(const k in CARDC) delete CARDC[k]; for(const k in BANDC) delete BANDC[k]; warmCards(); }, 0)).catch(() => {});   // offline: the fallback face is already built

/* ================================================================== the cinematic director */
const CINES = [];
const INK = '#07060c', CREAM = '#f4ecdf', RED = '#ff2a3a', GOLD = '#ffd04a', CYAN = '#4ff0ff';
const stepq = (p, n) => Math.floor(Math.max(0, Math.min(1, p)) * n) / n;
const sm = p => { p = Math.max(0, Math.min(1, p)); return p * p * (3 - 2 * p); };
function cine(o){ o = Object.assign({ dur:3 }, o || {}); rideCheck();
  const c = { o, t0:T, endT:null, card:o.card || null, cardShook:false, shook:false };
  if(c.card && c.card.kanji === undefined) c.card = null;
  if(o.guard){ const g = o.guard === true ? {} : o.guard; c.guard = { ahead:g.ahead || 90, behind:g.behind == null ? 4 : g.behind, from:g.from, to:g.to }; clearHazards(c); }
  if(o.shake && !reduce) shake = Math.max(shake || 0, o.shake);
  if(c.card) c.band = isBand(o, c.card);   // a hazard set piece's card: the slim band at the top (drawn here, never by mech/arrival.js)
  if(c.card && !c.band && MECH.arrival && MECH.arrival.moment) c.cardExt = true;   // mech/arrival.js draws it, when it offers moment cards
  CINES.push(c);
  const h = { o, end(){ if(c.endT == null) c.endT = T; }, hit(n){ if(!reduce) shake = Math.max(shake || 0, n || 6); },
    get t(){ return T - c.t0; }, get alive(){ return CINES.includes(c); } };
  c.h = h; return h; }
function envOf(c){ const age = T - c.t0, rin = reduce ? .4 : .35, rout = .45; let e = Math.min(1, age / rin);
  if(c.endT == null && c.o.dur > 0 && isFinite(c.o.dur) && age >= c.o.dur) c.endT = c.t0 + c.o.dur;
  if(c.endT != null) e = Math.min(e, 1 - (T - c.endT) / rout); return Math.max(0, e); }
function slowOf(c){ let s0 = c.o.slowmo; if(!s0) return 1; s0 = s0 === true ? .4 : typeof s0 === 'object' ? s0.scale || .4 : s0; if(reduce) s0 = Math.max(s0, .7);
  const at = typeof c.o.slowmo === 'object' && c.o.slowmo.at || 0, hold = typeof c.o.slowmo === 'object' && c.o.slowmo.hold || Math.min(1.2, c.o.dur || 1.2), age = T - c.t0 - at;
  if(age < 0) return 1; const k = age < .25 ? sm(age / .25) : age < .25 + hold ? 1 : 1 - sm((age - .25 - hold) / .5); const end = c.endT != null ? 1 - sm((T - c.endT) / .3) : 1;
  return 1 + (s0 - 1) * Math.max(0, Math.min(k, end)); }
let DUCK = null, BUS = null, duckWas = 1;
function duckSetup(){ if(DUCK || typeof M === 'undefined' || !M.ac || !M.out || !M.vol) return; try{
    DUCK = M.ac.createGain(); DUCK.gain.value = 1; BUS = M.ac.createGain(); BUS.gain.value = 1; M.out.disconnect(); M.out.connect(DUCK).connect(M.vol); BUS.connect(M.vol); }
  catch(e){ console.warn('director duck', e); DUCK = null; } }
const FX = { lb:0, lbA:1, scale:1, duck:1, roll:0, zoom:1 };
function stepCines(ug, dt){ duckSetup();
  let lb = 0, lbB = 0, lbA = 0, overBike = false, sc = 1, dk = 1, roll = 0, zm = 1, guard = null;
  for(let n = CINES.length - 1; n >= 0; n--){ const c = CINES[n], e = envOf(c);
    if(c.endT != null && e <= 0 && slowOf(c) >= .999 && !bandLive(c)){ CINES.splice(n, 1); if(c.o.duck) swell = true; continue; }
    const L0 = c.o.letterbox, frac = L0 === true || L0 === undefined ? .11 : typeof L0 === 'object' && L0 ? (L0.top != null ? +L0.top : .11) : +L0 || 0;
    const fb = typeof L0 === 'object' && L0 ? +(L0.bottom || 0) : 0; if(typeof L0 === 'object' && L0 && L0.overBike) overBike = true;
    if(frac > 0 || fb > 0){ const k = reduce ? 1 : stepq(e, 6); lb = Math.max(lb, frac * k); lbB = Math.max(lbB, fb * k); lbA = Math.max(lbA, reduce ? stepq(e, 4) : 1); }
    sc = Math.min(sc, slowOf(c));
    if(c.o.duck){ const lvl = c.o.duck === true ? .35 : +c.o.duck; dk = Math.min(dk, 1 + (lvl - 1) * e); }
    if(!reduce && c.o.tilt){ roll += (c.o.tilt * Math.PI / 180) * sm(e) * (c.o.tiltDir || 1); }
    if(!reduce && c.o.zoom){ const age = T - c.t0; zm = Math.max(zm, 1 + c.o.zoom * (1 - sm(age / 1.1)) * (e > 0 ? 1 : 0)); }
    if(c.guard && e > 0) guard = c;
    if(c.card && !c.cardShown && T - c.t0 >= (c.card.at || .2) && !(c.band && T - c.t0 < B_WAIT && MECH.cutin && MECH.cutin.on && MECH.cutin.on())){ c.cardShown = true; c.cardT0 = T;   // a band waits (<= B_WAIT) for a cut-in already on screen: one title at a time
      const CU = MECH.cutin, cid = CU && CU.idFor ? (c.o.id && CU.has(c.o.id) ? c.o.id : CU.idFor(c.card)) : null;   // ui/cutin.js: a full anime title cut-in when this moment has one
      if(cid && CU.show(cid, { card:c.card }) !== false){ c.cardExt = true; D.cardBy = 'cutin'; }
      else if(c.cardExt){ let ok = false; try{ ok = MECH.arrival.moment(c.card) !== false; }catch(e2){ console.warn(e2); } c.cardExt = ok; D.cardBy = ok ? 'arrival' : 'director'; }
      else { D.cardBy = c.band ? 'band' : 'director'; if(c.band && MECH.quiet && MECH.quiet.claim) try{ MECH.quiet.claim(2, B_END + (c.card.hold || 0)); }catch(e2){} } } }   // the band always shows (Kellan's rule); the claim only makes callouts wait for it
  // mech/arrival.js draws moment cards in drawScreen, before this module's post pass; ui/cutin.js draws after it: hold the camera level while either is up, so the card is never rolled or zoomed
  const AM = MECH.arrival, CU = MECH.cutin, extCard = (CU && CU.on && CU.on()) || (AM && typeof AM.momentOn === 'function' ? !!AM.momentOn() : CINES.some(c => c.cardExt && c.cardShown && T - c.cardT0 < (reduce ? R_END : T_END) + (c.card.hold || 0) + .1));
  const dkC = dk; if(QT.on){ dk = Math.min(dk, CFG.quietDuck); swell = false; }   // the quiet stretch: the music steps back (slowly, below)
  camK = extCard ? Math.max(0, camK - ug / .25) : Math.min(1, camK + ug / .4); roll *= sm(camK); zm = 1 + (zm - 1) * sm(camK);
  FX.lb = lb; FX.lbB = lbB; FX.overBike = overBike; FX.lbA = lbA; FX.roll = roll; FX.zoom = zm; FX.guard = guard;
  // slow-mo: TIME.scale when the core honours it, otherwise roll position back like setpiece/jump.js does
  if(window.TIME.core){ window.TIME.scale = sc; lastScale = sc; }
  else if(sc < 1 && state === 'play'){ const back = 1 - sc; position -= speed * dt * back; for(const c of cars) c.z -= c.speed * dt * back; sunLeft += dt * back; }
  FX.scale = sc;
  // the music duck and the swell back
  if(DUCK && dk !== duckWas){ const t = M.ac.currentTime; DUCK.gain.cancelScheduledValues(t); DUCK.gain.setTargetAtTime(dk, t, dkC < 1 ? (dk < duckWas ? .12 : .25) : 2.2); duckWas = dk; }
  if(swell && DUCK && dk >= 1){ swell = false; const t = M.ac.currentTime; DUCK.gain.cancelScheduledValues(t); DUCK.gain.setTargetAtTime(1.12, t, .15); DUCK.gain.setTargetAtTime(1, t + .7, .5); }
  // camera: zoom always covers the roll, so no edge of the frame shows
  if(window.CAM){ const k = Math.abs(roll), asp = (W || 1) / (H || 1); window.CAM.roll = roll; window.CAM.zoom = Math.max(zm, k > 1e-4 ? Math.cos(k) + Math.max(asp, 1 / asp) * Math.sin(k) : 1); }
  if(guard) keepClear(guard); }
let swell = false, camK = 1;
function applyNeutral(){ FX.lb = 0; FX.roll = 0; FX.zoom = 1; FX.guard = null; FX.scale = 1; if(window.TIME) window.TIME.scale = 1; lastScale = 1; if(window.CAM){ window.CAM.zoom = 1; window.CAM.roll = 0; }
  if(DUCK){ const t = M.ac.currentTime; DUCK.gain.cancelScheduledValues(t); DUCK.gain.setTargetAtTime(1, t, .1); duckWas = 1; } }

/* ---------------------------------------------------------------- fairness guard: no traffic and no hazards in the scripted zone */
function zoneOf(c){ const g = c.guard, p = position + PZ; return g.from != null ? [g.from * SEG, g.to * SEG] : [p - g.behind * SEG, p + g.ahead * SEG]; }
function clearHazards(c){ if(typeof segs === 'undefined') return; const [a, b] = zoneOf(c); for(let i = Math.max(0, Math.floor(a / SEG)); i <= Math.floor(b / SEG) && i < segs.length; i++) if(segs[i] && segs[i].hz && segs[i].hz.type === 'oil') segs[i].hz = null; }
function keepClear(c){ const [a, b] = zoneOf(c), far = Math.max(b, position + PZ + 170 * SEG);
  let n = 0; for(const car of cars) if(car.z > a && car.z < b){ car.z = far + (n++) * 9 * SEG; if(car.speed < MAXS * .3) car.speed = MAXS * .3; }
  const i1 = Math.min(segs.length - 1, Math.floor(b / SEG)); for(let i = Math.max(0, Math.floor(position / SEG)); i <= i1; i++) if(segs[i].hz && segs[i].hz.type === 'oil') segs[i].hz = null; }
function hitCar(car){ if(!FX.guard) return false; car.z += 40 * SEG; return true; }   // brief invulnerability without `cool` (cool also stops the bike accelerating)

/* ---------------------------------------------------------------- drawing: camera roll and zoom, letterbox, moment card, dev line */
let BUF = null;
function camPass(){ const z = window.CAM ? window.CAM.zoom : 1, r = window.CAM ? window.CAM.roll : 0; if(reduce || (Math.abs(z - 1) < .002 && Math.abs(r) < 1e-4)) return;
  const cv = cx.canvas, cw = cv.width, ch = cv.height; if(!BUF || BUF.width !== cw || BUF.height !== ch) warmBuf();   // only after a resize (warm() allocates it)
  const b = BUF.getContext('2d'); b.imageSmoothingEnabled = false; b.clearRect(0, 0, cw, ch); b.drawImage(cv, 0, 0);
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false; cx.fillStyle = INK; cx.fillRect(0, 0, cw, ch);
  cx.translate(Math.round(cw / 2), Math.round(ch / 2)); cx.rotate(r); cx.scale(z, z); cx.drawImage(BUF, -Math.round(cw / 2), -Math.round(ch / 2)); cx.restore(); }
/* The bars crop the sky, never the rider: the top bar takes the frame (default 11%); a bottom bar is opt-in ({ bottom }) and is clamped to the
   strip below the bike's tyres (the bike stands on H - 8) unless the moment hides the bike itself ({ overBike:true }, e.g. a crash cam).
   env/hud.js draws its instruments after this pass, so the speed cluster is never under a bar. */
function letterbox(){ if((FX.lb <= 0 && !FX.lbB) || FX.lbA <= 0) return; const ch = cx.canvas.height, cw = cx.canvas.width, h = Math.round(ch * FX.lb);
  const floor = FX.overBike ? ch : Math.max(0, Math.floor(6 / PX)), hb = Math.min(Math.round(ch * (FX.lbB || 0)), floor);
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = FX.lbA; cx.fillStyle = INK;
  if(h > 0){ cx.fillRect(0, 0, cw, h); if(h > 3){ cx.fillStyle = '#3a0d14'; cx.fillRect(0, h - 1, cw, 1); } }   // a dark red edge, like the card's stripes but quiet
  if(hb > 0){ cx.fillStyle = INK; cx.fillRect(0, ch - hb, cw, hb); }
  cx.restore(); }
function post(now){ sawPost = true; camPass(); letterbox(); drawCards(); devLine(); demoLine(); }
function drawScreen(now){ if(sawPost) return; letterbox(); drawCards(); devLine(); demoLine(); }   // until the core's post hook exists

/* the moment card: mech/arrival.js's stage card (a slab with tokko stripes, the kanji stamped in, the name and a typed subtitle) when it
   offers MECH.arrival.moment(card); otherwise this compatible card, built from the same parts and timeline */
const F3 = { '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111',
  '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', A:'010101111101101', B:'110101110101110', C:'011100100100011',
  D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111', J:'001001001101111', K:'101101110101101',
  L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', Q:'010101101111011', R:'110101110101101', S:'011100010001110',
  T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', Z:'111001010100111', '/':'001001010100100',
  '.':'000000000000010', ' ':'000000000000000', '-':'000000111000000', '+':'000010111010000', ':':'000010000010000', ',':'000000000010100', "'":'010010000000000', '!':'010010010000010',
  '|':'010010010010010', '@':'010101111100011', '<':'001010100010001', '>':'100010001010100', '=':'000111000111000' };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
function txt3(s, col, sh, k){ k = k || 1; s = String(s).toUpperCase(); const c = mk(s.length * 4 * k + k, 6 * k), g = c.getContext('2d');
  for(const [cc, o] of [[sh, k], [col, 0]]){ if(!cc) continue; g.fillStyle = cc;
    [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect((n * 4 + i % 3) * k + o, ((i / 3) | 0) * k + o, k, k); }); }
  return c; }
function wrap3(str, max){ const out = []; let line = ''; for(const w of String(str).split(' ')){ const t = line ? line + ' ' + w : w; if(t.length > max && line){ out.push(line); line = w; } else line = t; } if(line) out.push(line); return out.map(l => l.length > max ? l.slice(0, max) : l); }
function boxLabel(s, fg, edge){ const t = txt3(s, fg, null), c = mk(t.width + 5, 10), k = c.getContext('2d'); k.fillStyle = INK; k.fillRect(0, 0, c.width, 10); k.fillStyle = edge; k.fillRect(0, 0, c.width, 1); k.fillRect(0, 9, c.width, 1); k.fillRect(0, 0, 1, 10); k.fillRect(c.width - 1, 0, 1, 10); k.drawImage(t, 3, 2); return c; }
function recolor(m, col){ const c = mk(m.width, m.height), k = c.getContext('2d'); k.drawImage(m, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = col; k.fillRect(0, 0, c.width, c.height); return c; }
function slab(x0, y, w, h){ for(let r = 0; r < h; r++){ const off = Math.floor((h - 1 - r) / 2); cx.fillRect(x0 + off, y + r, w, 1); } }
const CARDC = {};
function cardArt(card){ const cw = cx.canvas.width, chh = cx.canvas.height, key = card.kanji + '|' + card.name + '|' + (card.sub || '') + '|' + cw + 'x' + chh; if(CARDC[key]) return CARDC[key];
  const col = card.col || GOLD, narrow = cw < 260, nk = [...(card.kanji || '')].length, ks = !narrow && nk <= 2 && chh >= 230 ? 2 : 1;
  let m = typeof pixText === 'function' ? pixText(card.kanji || '', 16, false) : txt3(card.kanji || '', '#fff', null, 2);
  const big = mk(m.width * ks, m.height * ks), bk = big.getContext('2d'); bk.imageSmoothingEnabled = false; bk.drawImage(m, 0, 0, big.width, big.height);
  const dep = ks, kj = mk(big.width + dep, big.height + dep), kk = kj.getContext('2d'), dk = recolor(big, mixc(col, INK, .55));
  for(let d = dep; d >= 1; d--) kk.drawImage(dk, d, d); kk.drawImage(recolor(big, col), 0, 0); kk.drawImage(recolor(big, mixc(col, '#ffffff', .55)), 0, 0, big.width, ks, 0, 0, big.width, ks);   // a lit top edge
  const white = recolor(kj, '#ffffff');
  const kr = kj.width + (narrow ? 6 : 10), avail = Math.max(40, (narrow ? cw - 9 : Math.round(cw * .62)) - kr);
  let ns = narrow ? 1 : 2; if((card.name || '').length * 4 * ns + ns > avail) ns = 1;
  const name = txt3(card.name || '', CREAM, INK, ns), tag = boxLabel(card.tag || 'MOMENT', CREAM, col);
  const subs = card.sub ? wrap3(card.sub, Math.max(6, Math.floor((avail - 1) / 4))).map(l => txt3(l, CREAM, INK, 1)) : [];
  const gap = narrow ? 2 : 3, textH = 10 + gap + name.height + (subs.length ? gap + subs.length * 7 - 1 : 0), textW = Math.max(name.width, tag.width, ...subs.map(c => c.width));
  const gw = kr + textW, gx = narrow ? 3 : Math.round((cw - gw) / 2), sub = subs.length ? subs : null;
  const by = Math.round(chh * (narrow ? .27 : .2)), bh = Math.max(textH + 10, kj.height - 6);
  const o = { col, kj, white, name, sub, tag, gx, by, bh, bx:narrow ? -6 : gx - 14, kx:gx, ky:Math.round(by + bh / 2 - kj.height / 2), tx:gx + kr, ty:by + Math.round((bh - textH) / 2), gap, cw };
  return CARDC[key] = o; }
const T_IN = .16, T_HIT = .18, T_TXT = .24, T_OUT = 1.9, T_END = 2.25, R_END = 2.5;
function drawCards(){ for(const c of CINES){ if(!c.card || !c.cardShown || c.cardExt) continue; const t = T - c.cardT0, hold = (c.card.hold || 0);
    if(c.band){ if(t <= (reduce ? B_REND : B_END) + hold) drawBand(c, t, hold); continue; }
    const tOut = T_OUT + hold, tEnd = T_END + hold, rEnd = R_END + hold; if(t > (reduce ? rEnd : tEnd)) continue; drawCard(c, t, tOut, tEnd, rEnd); } }
function drawCard(c, t, tOut, tEnd, rEnd){ const o = cardArt(c.card), cw = cx.canvas.width, ch = cx.canvas.height;
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
  let alpha = 1, bx = o.bx;
  if(reduce){ alpha = t < .3 ? stepq(t / .3, 4) : t > rEnd - .4 ? 1 - stepq((t - (rEnd - .4)) / .4, 4) : 1; if(alpha <= 0){ cx.restore(); return; } cx.globalAlpha = alpha; }
  else { if(t < T_IN) bx = Math.round(lerp(cw + 8, o.bx, stepq(t / T_IN, 5)));
    if(t > tOut) bx = Math.round(lerp(o.bx, cw + 40, stepq((t - tOut) / (tEnd - tOut - .03), 6)));
    if(!c.cardShook && t >= T_HIT){ c.cardShook = true; shake = Math.max(shake || 0, 5); } }
  const by = o.by, bh = o.bh, bw = cw + 40 - bx;
  cx.fillStyle = o.col; slab(bx + 3, by - 4, bw, 2); cx.fillStyle = mixc(o.col, INK, .35); slab(bx + 1, by - 1, bw, 1);
  cx.fillStyle = 'rgba(7,6,12,.86)'; slab(bx, by, bw, bh); cx.fillStyle = RED; slab(bx - 1, by + bh + 1, bw, 2); cx.fillStyle = CYAN; slab(bx - 2, by + bh + 4, bw, 1);
  if(!reduce && t < T_IN + .12){ cx.fillStyle = '#fff'; for(let n = 0; n < 6; n++){ const y = by - 4 + Math.floor(hash(n * 3.1 + 7) * (bh + 10)), len = 12 + hash(n * 7.7) * 46; cx.fillRect(bx + 6 + Math.floor(hash(n * 1.3) * 20), y, Math.round(len), 1); } }
  const out = !reduce && t > tOut; if(out){ cx.beginPath(); for(let y = 0; y < ch; y += 2){ const off = Math.floor((by + bh - y) / 2); cx.rect(bx - 2 + off, y, 9999, 2); } cx.clip(); }
  // the kanji slams down from big to its size, white on impact
  if(reduce || t >= .1){ const sc = reduce ? 1 : t < .14 ? 1.5 : t < T_HIT ? 1.2 : 1, white = !reduce && (t < .14 || (t >= T_HIT && t < T_HIT + .05)), img = white ? o.white : o.kj;
    const w = Math.round(o.kj.width * sc), h = Math.round(o.kj.height * sc), jx = !reduce && t >= T_HIT && t < T_HIT + .1 ? (Math.floor(t * 60) % 2 ? 1 : -1) : 0;
    cx.drawImage(img, Math.round(o.kx + o.kj.width / 2 - w / 2) + jx, Math.round(o.ky + o.kj.height / 2 - h / 2), w, h); cx.globalAlpha = alpha; }
  if(reduce || t >= T_TXT){ const tt = reduce ? 9 : t - T_TXT; let y = o.ty; cx.drawImage(o.tag, o.tx, y); y += 10 + o.gap;
    const slide = reduce ? 0 : tt < .12 ? Math.round((1 - stepq(tt / .12, 4)) * 60) : tt < .16 ? -3 : 0; cx.drawImage(o.name, o.tx + slide, y); y += o.name.height + o.gap;
    if(o.sub){ let left = reduce ? 1e9 : Math.max(0, Math.floor((tt - .12) / .014)) * 4;   // typed out, line by line
      for(const ln of o.sub){ const n = Math.min(ln.width, left); left -= ln.width; if(n > 0) cx.drawImage(ln, 0, 0, n, ln.height, o.tx, y, n, ln.height); y += 7; } } }
  cx.restore(); }

/* the hazard band (kodawari audit #2): a hazard set piece's card must never hide the hazard it announces. The stage card covered the top
   third for seconds, its kanji arrived as a grey ghost, and its focus lines crossed the road just as the first rocks, bombs or gates
   were telegraphed. The band is a slim slab at the very top of the frame (the letterbox's own sky strip, ~11% of the height, between the
   HUD's corner plates; on a narrow screen a full-width strip just under the plates): a 1x pixel kanji in the moment's colour, the name
   and a typed subtitle. It wipes open left to right in three whole steps with everything at full opacity (the kanji is crisp from its
   first frame: one white impact frame, never a translucent ghost), holds, and wipes shut the same way; gone 2.0 s after it appears
   (+ the card's hold), before any set piece's first hazard. No focus lines, no speed lines, nothing over the road. It waits (<= 0.8 s,
   so a late band can never reach a first hazard) for a cut-in already on screen. Reduced motion: four-step fade in and out. Which cards: a card cine with letterbox:false and no guard (the set pieces' own card
   beat: rockslide, cavein, flood, lava, naruto, screenfall, teiden, yoiyama, kanpo) and the runaway wheel's card. */
const B_IN = .1, B_HIT = .1, B_TXT = .12, B_OUT = 1.85, B_END = 2.0, B_REND = 2.2, B_WAIT = .8, BAND_K = { '観覧車':1 };
const isBand = (o, card) => !!card && ((o.letterbox === false && !o.guard) || !!BAND_K[card.kanji]);
const bandLive = c => !!c.band && !c.cardExt && (!c.cardShown || T - c.cardT0 <= (reduce ? B_REND : B_END) + (c.card.hold || 0));   // its cine lives until the band has retracted (a 1.5 s card cine must not cut a 2 s band, nor drop one still waiting for a cut-in)
const bandOn = () => CINES.some(c => c.band && c.cardShown && !c.cardExt && T - c.cardT0 <= (reduce ? B_REND : B_END) + (c.card.hold || 0));
const BANDC = {};
const hudFreeY = () => { try{ const L = ENV.hud && ENV.hud.layout ? ENV.hud.layout() : null; return L ? L.freeY : 0; }catch(e){ return 0; } };   /* first canvas row clear of the HUD (phone: under the chain tab); 0 until the HUD has drawn */
// where the band may sit without touching the HUD (env/hud.js layout(): the DOM buttons take the top 52 CSS px plus the safe-area inset; on a
// wide screen the CHECK plate stands in the top-right corner below them, on a narrow one the speed and CHECK plates fill the top row)
function bandBox(cw, chh){ const sx = (typeof W === 'number' && W > 0 ? W : cw * (typeof PX === 'number' ? PX : 3)) / cw, narrow = W < 640;
  let iT = 0, iR = 0; try{ const sa = document.getElementById('hudSA'); if(sa){ const st = getComputedStyle(sa); iT = Math.ceil((parseFloat(st.paddingTop) || 0) / sx); iR = Math.ceil((parseFloat(st.paddingRight) || 0) / sx); } }catch(e){}
  const below = Math.ceil(52 / sx) + iT;
  if(narrow){ const fy = hudFreeY(); return { narrow:true, y:fy ? fy + 1 : below + 32, x0:0, x1:cw }; }   // under the plates (the speed plate is 28 rows), full width
  const kX = cw - 5 - 71 - iR, x1 = Math.min(cw - 6, kX - 5), x0 = cw - x1;   // centred, clear of the CHECK plate on the right (and so of the road tag on the left)
  return { narrow:false, y:0, x0, x1 }; }
function bandArt(card){ const cw = cx.canvas.width, chh = cx.canvas.height, key = card.kanji + '|' + card.name + '|' + (card.sub || '') + '|' + (card.col || '') + '|' + cw + 'x' + chh + '|' + (typeof W === 'number' ? W : 0) + '|' + (W < 640 ? hudFreeY() : 0); if(BANDC[key]) return BANDC[key];
  const col = card.col || GOLD, box = bandBox(cw, chh), narrow = box.narrow;
  const m = typeof pixText === 'function' ? pixText(card.kanji || '', 16, false) : txt3(card.kanji || '', '#fff', null, 2);
  const kj = mk(m.width + 1, m.height + 1), kk = kj.getContext('2d');   // 1 px dark drop, the moment's colour, a lit top row
  kk.drawImage(recolor(m, mixc(col, INK, .6)), 1, 1); kk.drawImage(recolor(m, col), 0, 0);
  // the glyph's inked rows (pixText pads its canvas): the lit row goes on the top inked row, and the kanji is centred by its ink, not its box
  let y0 = 0, y1 = kj.height - 1; { const d = kk.getImageData(0, 0, kj.width, kj.height).data, row = y => { for(let x = 0; x < kj.width; x++) if(d[(y * kj.width + x) * 4 + 3] > 0) return true; return false; };
    while(y0 < y1 && !row(y0)) y0++; while(y1 > y0 && !row(y1)) y1--; }
  kk.drawImage(recolor(m, mixc(col, '#ffffff', .55)), 0, y0, m.width, 1, 0, y0, m.width, 1);
  const white = recolor(kj, '#ffffff');
  const pad = narrow ? 3 : 5, kh = y1 - y0 + 1, kr = kj.width + (narrow ? 4 : 7), avail = Math.max(30, box.x1 - box.x0 - 2 * pad - 6 - kr);
  const nm = String(card.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // KANPŌ -> KANPO: the 3x5 face has no macrons (a blank cell read as a missing letter)
  let ns = narrow ? 1 : 2; if(nm.length * 4 * ns + ns > avail) ns = 1;
  const name = txt3(nm, CREAM, INK, ns), tag = narrow ? null : boxLabel(card.tag || 'MOMENT', CREAM, col);
  // the subtitle on one line (two when narrow); a long one keeps its instruction: 'the strait wakes · read the sea, take the gap' -> the part after the dot
  const per = Math.max(6, Math.floor((avail - 1) / 4)), lines = narrow ? 2 : 1; let sub = String(card.sub || '');
  if(sub && wrap3(sub, per).length > lines && sub.includes('·')) sub = sub.split('·').pop().trim();
  const subs = sub ? wrap3(sub.replace(/·/g, '-'), per).slice(0, lines).map(l => txt3(l, mixc(CREAM, col, .25), INK, 1)) : [];
  const nh = Math.max(name.height, tag ? 10 : 0), textW = Math.max(name.width + (tag ? 5 + tag.width : 0), ...subs.map(s => s.width)), textH = nh + (subs.length ? 2 + subs.length * 7 - 1 : 0);
  const bh = Math.max(kh, textH) + pad * 2, gw = kr + textW, gx = narrow ? box.x0 + 3 : Math.round((box.x0 + box.x1 - gw) / 2);
  const o = { col, kj, white, name, tag, subs, nh, bh, y:box.y, x0:box.x0, x1:box.x1, narrow, kx:gx, ky:box.y + Math.round(bh / 2 - kh / 2) - y0, tx:gx + kr, ty:box.y + Math.round((bh - textH) / 2) };
  return BANDC[key] = o; }
// a slab with slanted ends (the stage card's tokko cut) from x0 to x1, rows y..y+h-1; narrow: square ends, full width
function bandSlab(o, y, h, inset){ const x0 = o.x0 + inset, x1 = o.x1 - inset; if(o.narrow){ cx.fillRect(x0, y, x1 - x0, h); return; }
  for(let r = 0; r < h; r++){ const yy = y + r - o.y, sl = Math.floor((o.bh - 1 - yy) / 2); cx.fillRect(x0 + sl, y + r, x1 - x0 - Math.floor((o.bh + 1) / 2), 1); } }
function drawBand(c, t, hold){ const o = bandArt(c.card), out = B_OUT + hold, end = B_END + hold, rEnd = B_REND + hold;
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
  let a = 0, b = 1;   // the visible part of the band, as fractions of its width: it wipes open left to right in three whole steps and closes the same way
  if(reduce){ const al = t < .3 ? stepq(t / .3, 4) : t > rEnd - .4 ? 1 - stepq((t - (rEnd - .4)) / .4, 4) : 1; if(al <= 0){ cx.restore(); return; } cx.globalAlpha = al; }
  else { if(t < B_IN) b = (Math.floor(t / B_IN * 3) + 1) / 3;   // its first frame is already a third open, at full opacity
    if(t > out) a = Math.min(1, (Math.floor((t - out) / (end - out) * 3) + 1) / 3);
    if(a >= 1){ cx.restore(); return; }
    if(!c.cardShook && t >= B_HIT){ c.cardShook = true; shake = Math.max(shake || 0, 3); } }
  const w = o.x1 - o.x0 + 2, cxL = o.x0 - 1 + Math.round(w * a), cxR = o.x0 - 1 + Math.round(w * b);
  cx.beginPath(); cx.rect(cxL - 2, o.y - 1, cxR - cxL + 2, o.bh + 4); cx.clip();
  const y = o.y, bh = o.bh;
  cx.fillStyle = 'rgba(7,6,12,.9)'; bandSlab(o, y, bh, 0);
  cx.fillStyle = o.col; bandSlab(o, y + bh, 1, 0); cx.fillStyle = mixc(o.col, INK, .6); bandSlab(o, y + bh + 1, 1, 0);   // the tokko stripe under it, quiet
  if(o.narrow && y > 0){ cx.fillStyle = mixc(o.col, INK, .6); cx.fillRect(o.x0, y - 1, o.x1 - o.x0, 1); }   // a hairline on top too, when it floats under the plates
  cx.drawImage(!reduce && t >= B_HIT && t < B_HIT + .05 ? o.white : o.kj, o.kx, o.ky);   // one white impact frame, always at full opacity: never a ghost
  if(reduce || t >= B_TXT){ const tt = reduce ? 9 : t - B_TXT;
    let ty = o.ty; cx.drawImage(o.name, o.tx, ty + Math.round((o.nh - o.name.height) / 2)); if(o.tag) cx.drawImage(o.tag, o.tx + o.name.width + 5, ty + Math.round((o.nh - 10) / 2)); ty += o.nh + 2;
    let left = reduce ? 1e9 : Math.max(0, Math.floor((tt - .06) / .012)) * 4;   // the subtitle types out
    for(const ln of o.subs){ const n = Math.min(ln.width, left); left -= ln.width; if(n > 0) cx.drawImage(ln, 0, 0, n, ln.height, o.tx, ty, n, ln.height); ty += 7; } }
  cx.restore(); }

let devC = null, devKey = '';
let demoKey = '', demoC = null;   // demo mode's dev label: the road, the current event (and any nudge), the next one, the skip key
function demoLine(){ if(!DEMO || !DEMO.label || !(DEVL || QS.has('demo'))) return; const t = DEMO.label(); if(!t) return; if(t !== demoKey){ demoKey = t; demoC = txt3(t.slice(0, 110), CREAM, INK); }
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); const y = cx.canvas.height - 12; cx.fillStyle = 'rgba(7,6,12,.72)'; cx.fillRect(3, y - 2, demoC.width + 4, 10); cx.fillStyle = GOLD; cx.fillRect(3, y - 2, 1, 10); cx.drawImage(demoC, 5, y); cx.restore(); }
function devLine(){ if(!DEVL || typeof position !== 'number') return; const s = G.snapshot(pSeg()); if(!s) return;
  const sc = FX.scale < .999 ? ' T' + FX.scale.toFixed(2) : '';
  const txt = 'DIR R' + s.ride + (s.started ? '' : '?') + ' HERO ' + s.hero + '/' + s.heroMax + (s.heroIn > 0 ? ' NEXT>=' + s.heroIn + 'S' : ' READY') + (s.next.length ? ' | ' + s.next.join(' ') : '') + ' | AMB ' + (s.amb.join(', ') || '-') + (CINES.length ? ' | CINE ' + CINES.length + sc : '');
  if(txt !== devKey){ devKey = txt; devC = txt3(txt.slice(0, 120), CREAM, INK); }
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); const y = Math.round(cx.canvas.height * .13); cx.fillStyle = 'rgba(7,6,12,.7)'; cx.fillRect(29, y - 2, devC.width + 3, 10); cx.drawImage(devC, 30, y); cx.restore(); }
})();
