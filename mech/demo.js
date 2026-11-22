/* Sundown mechanic module: DEMO MODE, an authored night (window.DEMO, MECH.demo). Local tool: levels.html edits the levels, review/server.mjs saves them.
   Load it BEFORE mech/director.js:   <script src="mech/demo.js"></script>

   sundown.html?demo=<name> loads levels/<name>.json (synchronously, before the core lays its first road) and rides it:
     - the route is the level's road list in order, each road its authored length; no forks (or, with "forks":true, both branches of
       every fork lead on to the authored road); the night's sky follows the ride, and dawn comes as you finish the last road;
     - exactly the authored events fire, at their authored positions: MECH.director asks DEMO.ask() instead of the rarity governor, and the
       set pieces that choose their own spot ask MECH.director.target(id, seg) for the authored one and take the nearest valid spot to it
       (each module keeps its own placement rules; a spot that breaks them is nudged, and the nudge is logged and shown in the dev label);
     - nothing unauthored fires: every other director request is refused (counted in DEMO.refused), quiet stretches are off;
     - demo safety: no arrest ending (a crash is a bump and the ride goes on); "police": false (the default) turns the police off;
       "invincible": true ignores crashes altogether;
     - a small dev label names the current event, and N skips to just before the next one.
   Extra query: &from=<road index>&at=<segments into that road> starts the night there (levels.html's "Play from here").

   Level format (sundown-level/1):
     { "format":"sundown-level/1", "name":"showcase", "title":"...", "police":false, "invincible":false, "forks":false,
       "roads":[ { "road":"bay", "len":2400, "cp":0.9, "jump":true,
                   "events":[ { "id":"kaiju", "at":0.5 }, { "id":"jets", "seg":700, "params":{} } ] } ] }
     road   a LANDS key;  len  segments (600..9000, default 2400; 55 segments is a second at top speed);
     cp     the road's checkpoint gate, a fraction of len or segments if > 1 (default len - 260: the road's body stays free for events;
            a road with a fireball puts it where the escape must end, the fireball's spot + 580);
     jump   the road's landmark jump (setpiece/jump.js, about 230 segments in), default true;
     events id (SD_EVENTS below), at (fraction of the road) or seg (segments from the road's start), params (kept, exposed through
            DEMO.paramsFor(id, seg); no set piece reads them yet).
   SD_EVENTS (window.SD_EVENTS, also read by levels.html): every cinematic event with its kanji, name, roads, how it places, its footprint
   (pre/post: segments before and after its moment that it occupies) and its earliest spot on a road (min, from the road's start). */
"use strict";
(function(){
// place: 'free' = takes the authored spot (nudged to its nearest valid one); 'grid' = snaps to the road's own spots (bores, cliffs, cycles);
// 'road' = the road decides (env sites, the Aqua-Line bore); 'cp' = ends at the checkpoint (the demo moves the checkpoint for it).
// lvl: intensity 1..5 for the editor's pacing curve.  jumpOk: shares its road with the landmark jump in normal play too.  fix: the measured spot for 'road' events (segments from the road's start).
const E = window.SD_EVENTS = [
  { id:'kaiju',      kanji:'怪獣',   name:'KAIJU',         roads:['bay'],               place:'free', pre:620, post:260, min:440, tail:260, lvl:5 },
  { id:'typhoon',    kanji:'台風',   name:'TYPHOON',       roads:['coast'],             place:'free', pre:60,  post:560, min:200, tail:540, lvl:4 },
  { id:'greatwave',  kanji:'大波',   name:'GREAT WAVE',    roads:['coast'],             place:'free', pre:330, post:170, min:820, tail:230, lvl:4 },
  { id:'hanabi',     kanji:'花火',   name:'HANABI',        roads:['paddies', 'coast'],  place:'free', pre:300, post:260, min:660, tail:220, lvl:2, jumpOk:true },
  { id:'matsuri',    kanji:'祭',     name:'MATSURI',       roads:['neon'],              place:'free', pre:300, post:90,  min:300, tail:120, lvl:2 },
  { id:'shinkansen', kanji:'新幹線', name:'SHINKANSEN',    roads:['paddies'],           place:'free', pre:60,  post:720, min:560, tail:720, lvl:3 },
  { id:'fuji',       kanji:'富士',   name:'FUJI',          roads:['coast', 'tunnels'],  place:'free', pre:0,   post:700, min:0,   tail:0,   lvl:1, tier:'ambient' },
  { id:'fireball',   kanji:'爆発',   name:'INFERNO',       roads:['refinery'],          place:'cp',   pre:100, post:520, min:500, tail:840, lvl:5 },
  { id:'avalanche',  kanji:'雪崩',   name:'AVALANCHE',     roads:['snow'],              place:'free', pre:720, post:200, min:840, tail:210, lvl:4 },
  { id:'jetwash',    kanji:'噴射',   name:'JETWASH',       roads:['haneda'],            place:'free', pre:340, post:380, min:900, tail:390, lvl:4 },
  { id:'jets',       kanji:'空',     name:'LOW JETS',      roads:['haneda'],            place:'free', pre:40,  post:160, min:250, tail:200, lvl:1, tier:'ambient' },
  { id:'rockslide',  kanji:'落石',   name:'ROCKSLIDE',     roads:['pass'],              place:'grid', pre:420, post:360, min:690, tail:410, lvl:4, grid:400, gridOff:300 },
  { id:'cavein',     kanji:'崩落',   name:'CAVE-IN',       roads:['tunnels'],           place:'grid', pre:390, post:300, min:700, tail:350, lvl:4, grid:320, gridOff:300 },
  { id:'screenfall', kanji:'大画面', name:'SCREENFALL',    roads:['shuto'],             place:'free', pre:640, post:120, min:470, tail:200, lvl:4 },
  { id:'lava',       kanji:'溶岩流', name:'LAVA BREACH',   roads:['sakurajima'],        place:'grid', pre:360, post:375, min:700, tail:410, lvl:5, grid:300, gridOff:0 },
  { id:'naruto',     kanji:'渦潮',   name:'WHIRLPOOLS',    roads:['shimanami'],         place:'grid', pre:352, post:308, min:397, tail:330, lvl:3, rgrid:1080, rgridOff:397 },
  { id:'flood',      kanji:'浸水',   name:'FLOOD',         roads:['aqua'],              place:'free', pre:500, post:390, min:520, tail:430, lvl:4 },
  { id:'megalodon',  kanji:'滄竜',   name:'MOSASAUR',      roads:['aqua'],              place:'road', pre:700, post:1250, min:300, tail:1300, lvl:5, fix:1410 },
  { id:'phantom',    kanji:'亡霊',   name:'PHANTOMS',      roads:['tunnels','pass','paddies','snow','kurobe','coast','shimanami','gion'], place:'free', pre:60, post:1750, min:300, tail:1770, lvl:4 },
  { id:'abyss',      kanji:'深淵',   name:'MOSASAUR + FLOOD', roads:['aqua'],           place:'road', pre:700, post:1450, min:300, tail:1500, lvl:5, fix:1410 },
  { id:'wheel',      kanji:'観覧車', name:'RUNAWAY WHEEL', roads:['minato'],            place:'road', pre:300, post:720, min:200, tail:740, lvl:3, fix:910 },
  { id:'teiden',     kanji:'停電',   name:'BLACKOUT',      roads:['akiba'],             place:'road', pre:400, post:400, min:300, tail:420, lvl:3, fix:1560 },
  { id:'yoiyama',    kanji:'宵山',   name:'YOIYAMA',       roads:['gion'],              place:'road', pre:400, post:400, min:300, tail:420, lvl:2, fix:684 },
  { id:'kanpo',      kanji:'観光放水', name:'KANPO',       roads:['kurobe'],            place:'road', pre:400, post:400, min:300, tail:420, lvl:2, fix:1868 },
  { id:'boss',       kanji:'宵闇連合', name:'THE LEGEND',  roads:['*'],                 place:'free', pre:100, post:2300, min:90, tail:2320, lvl:5, jumpOk:true },
  { id:'heli',       kanji:'ヘリ',   name:'HELICOPTER',    roads:['*'],                 place:'free', pre:0,   post:600, min:0,   tail:0,   lvl:2, tier:'ambient', police:true } ];
const EV = {}; for(const e of E) EV[e.id] = e;
const ROAD_DEF = 2400, LEN_MIN = 600, LEN_MAX = 9000, CP_END = 260, FB_CP = 580, AFTER_LAST = 1600;

const QS = new URLSearchParams(location.search), NAME = QS.get('demo') === 'off' ? '' : (QS.get('demo') || (!QS.has('land') && !QS.has('force') && !QS.has('roadlab') ? 'default' : ''));   // Kellan 2026-11-22: a plain URL rides levels/default.json; ?land=N / ?force= / ?demo=off give normal play
window.DEMO = null;
if(!NAME) return;
let RAW = null, ERR = '';
if(!/^[\w-]{1,48}$/.test(NAME)) ERR = 'bad level name';
else try{ const x = new XMLHttpRequest(); x.open('GET', 'levels/' + NAME + '.json?t=' + Date.now(), false); x.send();   // synchronous on purpose: the core lays its route right after the plugins load
  if(x.status === 200) RAW = JSON.parse(x.responseText); else ERR = 'levels/' + NAME + '.json: HTTP ' + x.status; }catch(e){ ERR = String(e && e.message || e); }
if(!RAW || !Array.isArray(RAW.roads) || !RAW.roads.length){ console.warn('[demo] no level:', ERR || 'no roads'); return; }

const D = window.DEMO = { name:NAME, raw:RAW, forks:!!RAW.forks, invincible:!!RAW.invincible, police:!!RAW.police, roads:[], events:[], route:[], log:[], refused:{}, warn:[], ready:false };
const num = (v, d) => Number.isFinite(+v) && v !== null && v !== '' ? +v : d;
function prep(){ if(D.ready) return D; D.ready = true;
  const keys = LANDS.map(l => l.key), from = Math.max(0, Math.min(RAW.roads.length - 1, num(QS.get('from'), 0) | 0)), at0 = Math.max(0, num(QS.get('at'), 0) | 0);
  let start = 0;
  RAW.roads.slice(from).forEach((r, k) => { const land = keys.indexOf(r && r.road); if(land < 0){ D.warn.push('unknown road ' + (r && r.road)); return; }
    let len = Math.round(Math.max(LEN_MIN, Math.min(LEN_MAX, num(r.len, ROAD_DEF)))); const cut = k === 0 ? Math.min(at0, len - LEN_MIN) : 0; len -= cut;
    const z = D.roads.length, R = { z, land, key:keys[land], name:LANDS[land].name, len, start, end:start + len, jump:r.jump !== false, cut, src:from + k };
    for(const ev of Array.isArray(r.events) ? r.events : []){ if(!ev || typeof ev.id !== 'string') continue; const c = EV[ev.id];
      let rel = ev.seg != null ? num(ev.seg, 0) : num(ev.at, .5) * (len + cut); rel = Math.round(rel) - cut; if(rel < 0) continue;   // events before a start offset are dropped
      const bad = !c ? 'unknown event' : !(c.roads.includes('*') || c.roads.includes(R.key)) ? 'not on this road' : '';
      if(bad) D.warn.push(ev.id + ' on ' + R.key + ': ' + bad);
      D.events.push({ n:D.events.length, id:ev.id, z, road:R.key, rel, at:start + rel, params:ev.params || {}, bad, booked:false, seg:null, nudge:0, reached:null, tier:c && c.tier || 'hero' }); }
    const fb = D.events.find(e => e.z === z && e.id === 'fireball' && !e.bad);
    let cp = r.cp != null ? num(r.cp, 0) : null; cp = cp === null ? len - CP_END : cp <= 1 ? Math.round(cp * len) : Math.round(cp) - cut;
    if(fb) cp = fb.rel + FB_CP;   // the escape ends at the checkpoint (setpiece/fireball.js): it is put where this one ends
    R.cp = Math.max(120, Math.min(len - 60, cp)); D.roads.push(R); start += len; });
  D.events.sort((a, b) => a.at - b.at).forEach((e, n) => e.n = n);
  D.route = D.roads.map(r => r.land); D.end = start; D.N = D.roads.length;
  if(!D.N){ D.roads.push({ z:0, land:0, key:keys[0], name:LANDS[0].name, len:ROAD_DEF, start:0, end:ROAD_DEF, jump:true, cut:0, cp:ROAD_DEF - CP_END, src:0 }); D.route = [0]; D.end = ROAD_DEF; D.N = 1; }
  if(window.ASSIST) ASSIST.police = D.police;   // in memory only: the saved settings are untouched unless the settings page is saved during the demo
  if(D.warn.length) console.warn('[demo]', D.warn.join('; '));
  return D; }

const zoneOf = seg => { prep(); for(const R of D.roads) if(seg < R.end) return R.z; return D.N; };
// the core's route hooks (sundown.html): gate n (even: zone n/2's checkpoint, odd: its border), the road of zone z, the pair at a fork
D.gateAt = n => { prep(); const z = n >> 1; if(z < D.N){ const R = D.roads[z]; return n % 2 ? R.end : R.start + R.cp; } return D.end + (n - 2 * D.N + 1) * AFTER_LAST; };
D.landAt = z => { prep(); return D.route[Math.max(0, Math.min(D.N - 1, z))]; };
D.forkPair = z => { const k = D.landAt(z + 1); return [k, k]; };
D.zoneOf = zoneOf;
D.jumpOff = seg => { const z = zoneOf(seg); return z < D.N && !D.roads[z].jump; };
D.paramsFor = (id, seg) => { const e = D.events.find(x => x.id === id && x.z === zoneOf(seg)); return e ? e.params : null; };
// a new road (a new ride, or Restart night) books every event afresh
function sync(){ if(typeof segs === 'undefined' || segs === D.segs) return; D.segs = segs; for(const e of D.events){ e.booked = false; e.seg = null; e.nudge = 0; e.reached = null; } D.refused = {}; D.log.push({ kind:'ride' }); }
const open = (id, z) => { sync(); return D.events.filter(e => e.id === id && e.z === z && !e.booked && !e.bad); };
// the authored spot for a set piece choosing its own (segment of its moment), or null when nothing of that id is authored on this road
D.target = (id, seg) => { prep(); const z = zoneOf(seg), L = open(id, z); return L.length ? L[0].at : null; };
// MECH.director's demo gate: is this request authored? (books the nearest open entry; ambient beats take the first slot from the spot on)
D.ask = (id, seg, tier) => { prep();
  if(/^jump:/.test(id)){ const z = zoneOf(seg); return z < D.N && D.roads[z].jump ? { id, landmark:true } : null; }
  const z = zoneOf(seg), L = open(id, z); let e = null;
  if(L.length){ if(tier === 'ambient' || (EV[id] && EV[id].tier === 'ambient')){ e = L.find(x => seg >= x.at - 80) || null; }
    else { e = L.reduce((a, b) => Math.abs(b.at - seg) < Math.abs(a.at - seg) ? b : a); } }
  if(!e){ D.refused[id] = (D.refused[id] || 0) + 1; return null; }
  e.booked = true; e.seg = seg; e.nudge = seg - e.at; D.log.push({ kind:'booked', id, n:e.n, road:e.road, seg, at:e.at, nudge:e.nudge, t:typeof playT === 'number' ? +playT.toFixed(1) : 0 });
  if(Math.abs(e.nudge) > 20) console.log('[demo] ' + id + ' nudged ' + (e.nudge > 0 ? '+' : '') + e.nudge + ' segments (authored ' + e.rel + ' on ' + e.road + ')');
  return e; };

// the night: dawn as you finish the last road (the sky follows the ride); the ride ends a breath before the last border
const pseg = () => Math.floor((position + PZ) / SEG);
D.tick = () => { prep(); if(state !== 'play') return; const p = pseg(), f = Math.max(0, Math.min(1, p / D.end));
  sunLeft = Math.max(.5, SUN_MAX * (1 - f));
  for(const e of D.events) if(e.booked && e.reached == null && p >= e.seg){ e.reached = +playT.toFixed(1); D.log.push({ kind:'reached', id:e.id, n:e.n, road:e.road, seg:e.seg, t:e.reached }); }
  if(p >= D.end - 60) finish(); };
const segOf = e => e.seg != null ? e.seg : e.at;
D.current = () => { const p = pseg(); let cur = null; for(const e of D.events){ if(e.bad) continue; const c = EV[e.id] || {}; if(p >= segOf(e) - (c.pre || 0) && p <= segOf(e) + (c.post || 300)) cur = e; } return cur; };
D.next = () => { const p = pseg(), cur = D.current(); return D.events.find(e => !e.bad && e !== cur && segOf(e) > p && e.reached == null) || null; };   // (an event whose lead-in has begun still counts as next)
// the dev label (drawn by mech/director.js in its 3x5 face)
D.label = () => { if(!D.ready || typeof position !== 'number') return ''; const cur = D.current(), nx = D.next(), n = D.events.filter(e => !e.bad).length, z = zoneOf(pseg());
  const nm = e => ((EV[e.id] || {}).name || e.id).replace(/[^A-Z0-9 +\-]/gi, '');
  return 'DEMO ' + NAME.replace(/[^a-z0-9\-]/gi, '') + ' | ' + (z < D.N ? (z + 1) + '/' + D.N + ' ' + D.roads[z].key : 'DAWN') + ' | '
    + (cur ? (cur.n + 1) + '/' + n + ' ' + nm(cur) + (cur.nudge ? ' NUDGED ' + (cur.nudge > 0 ? '+' : '') + cur.nudge : '') : '-')
    + (nx ? ' | NEXT ' + nm(nx) + ' ' + Math.max(0, segOf(nx) - pseg()) : '') + ' | N: SKIP'; };
// N: skip to just before the next event (lays the road there first, so it is booked where it will really be)
D.skip = () => { prep(); if(state !== 'play') return false; let nx = D.next(); if(!nx) return false; const c = EV[nx.id] || {}, lead = (c.pre || 0) + 260;
  extend(Math.min(D.end + 400, segOf(nx) + DRAW + 400)); nx = D.events[nx.n] || nx;
  const to = segOf(nx) - lead; if(to <= pseg() + 40) return false;   // already in (or at) its lead-in: nothing to skip
  extend(to + DRAW + 400);
  const dz = (to - pseg()) * SEG; position += dz; for(const c2 of cars) c2.z += dz;
  try{ const DR = MECH.director; if(DR && DR.reset) DR.reset(); }catch(e){}
  D.log.push({ kind:'skip', to, next:nx.id, t:+playT.toFixed(1) }); return true; };
D.report = () => ({ name:NAME, end:D.end, roads:D.roads.map(r => ({ z:r.z, key:r.key, start:r.start, len:r.len, cp:r.cp, jump:r.jump })),
  events:D.events.map(e => ({ n:e.n, id:e.id, road:e.road, rel:e.rel, at:e.at, seg:e.seg, nudge:e.nudge, booked:e.booked, reached:e.reached, bad:e.bad })), refused:D.refused, warn:D.warn, log:D.log });

addEventListener('keydown', e => { if(e.code !== 'KeyN' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; try{ if(D.skip()) e.preventDefault(); }catch(err){ console.warn('[demo] skip', err); } });
MECH.demo = { update(){ try{ D.tick(); }catch(e){ console.warn('[demo] tick', e); } } };
})();
