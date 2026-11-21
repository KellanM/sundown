/* Sundown cosmetics: looks earned only by riding (plan and rules: research/sundown-cosmetics.md).
   - Every item has one exact rule over saved nights (arcade.sundown) and first sightings (sundown.director). No currency, timers,
     randomness, store or streaks. Unlocks are sticky in 'sundown.cosmetics'.got; nothing is ever taken back.
   - The jacket's back kanji is never locked: 40 curated phrases or 1-4 characters you type.
   - Looks only: the palette and rows of the bike sprites are remapped where they are built (sundown.html bikeSprite, env/bikes.js
     sprite), cached by COS.sig; '' (everything default) leaves every sprite exactly as before. Boost tier colours never change.
   - The garage picker opens from the title screen (改造 CUSTOMISE). Keyboard, pad and touch; Esc / B closes.
   Loads in node too (no DOM at load), so the rules can be tested: node research/../ui/cosmetics.test.js */
"use strict";
(() => {
const G0 = typeof window !== 'undefined' ? window : globalThis, HAS_DOM = typeof document !== 'undefined';
const COS = G0.COS = { open:false, sig:'' };
const KEY = 'sundown.cosmetics';
const LS = { get(k, d){ try{ const v = G0.localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ G0.localStorage.setItem(k, JSON.stringify(v)); }catch(e){} } };
const GET = {}, G = n => G0[n] !== undefined ? G0[n] : (GET[n] || (GET[n] = new Function('try{ return ' + n + '; }catch(e){ return undefined; }')))();   // the game's global lexical names (LANDS, state, speed...), one cached reader each

/* ================================================================== the catalogue */
// rules read an aggregate `a` over the nights so far (see agg/add); `seen` items also count the director's first sightings
const CATS = [
  { id:'jacket', kj:'特攻服', name:'Tokkōfuku jacket', short:'JACKET' },
  { id:'paint',  kj:'塗装',   name:'Paint and tank art', short:'PAINT' },
  { id:'helmet', kj:'兜',     name:'Helmet', short:'HELMET' },
  { id:'horn',   kj:'警笛',   name:'Horn call', short:'HORN' },
  { id:'trail',  kj:'排気',   name:'Exhaust and trail', short:'TRAIL' } ];
const gw = g => a => a.gangWins.has(g);
const ITEMS = [
  // jackets: coat ramp [light, mid, dark] + gold thread
  { id:'jacket.own',      cat:'jacket', kj:'素', name:'Your own leathers', def:true, text:'Owned from the start' },
  { id:'jacket.murasaki', cat:'jacket', kj:'紫', name:'Purple coat', c:['#b98cff', '#7a3ae0', '#3e1a7a'], rule:a => a.dawns >= 1, text:'Finish one night at dawn' },
  { id:'jacket.guren',    cat:'jacket', kj:'紅蓮', name:'Crimson coat', c:['#ff7a86', '#d81e3a', '#6a0a1e'], rule:gw('guren'), text:'Win a duel against GUREN' },
  { id:'jacket.shiden',   cat:'jacket', kj:'紫電', name:'Lightning coat', c:['#e6c8ff', '#9a5af0', '#44188a'], rule:gw('shiden'), text:'Win a duel against SHIDEN' },
  { id:'jacket.hakuro',   cat:'jacket', kj:'白狼', name:'Wolf coat', c:['#eaf6ff', '#8ec8f0', '#2a5a9a'], rule:gw('hakuro'), text:'Win a duel against HAKURO' },
  { id:'jacket.kin',      cat:'jacket', kj:'金刺繍', name:'Black and gold', c:['#3a3646', '#1e1c28', '#0c0a12'], rule:a => ['guren', 'shiden', 'hakuro'].every(g => a.gangWins.has(g)), text:'Win a duel against each of the three gangs' },
  { id:'jacket.asa',      cat:'jacket', kj:'朝焼け', name:'Sunrise coat', c:['#ffc27a', '#ff7a3a', '#a03a1a'], rule:a => a.dawns >= 10, text:'Finish 10 nights at dawn' },
  // paint: ramp [light, mid, dark]; acc = extra keys used by the tank-art pattern
  { id:'paint.factory',   cat:'paint', kj:'純正', name:'The bike’s own colours', def:true, text:'Owned from the start' },
  { id:'paint.kaiju',     cat:'paint', kj:'怪獣', name:'Bay blue, claw marks', ramp:['#6ac8ff', '#1e6ad0', '#0c2a6a'], acc:{ O:'#06102a' }, art:'claw', seen:'kaiju', text:'See the kaiju' },
  { id:'paint.hanabi',    cat:'paint', kj:'花火', name:'Hanabi speckle', ramp:['#4a3a8a', '#24184a', '#100a24'], acc:{ O:'#ff6ac8', M:'#ffd04a' }, art:'speckle', seen:'hanabi', text:'See the hanabi' },
  { id:'paint.nami',      cat:'paint', kj:'大波', name:'Great-wave tank art', ramp:['#4a7ac8', '#1e3a8a', '#0c1a44'], acc:{ O:'#f4f0e4' }, art:'wave', seen:'greatwave', text:'See the great wave' },
  { id:'paint.fuji',      cat:'paint', kj:'富士', name:'Dawn fade', ramp:['#ffb0a0', '#c85a8a', '#4a2a6a'], acc:{ O:'#ffffff' }, art:'cap', seen:'fuji', text:'See Fuji at dawn' },
  { id:'paint.shinkansen',cat:'paint', kj:'新幹線', name:'White and blue stripe', ramp:['#ffffff', '#d8dce8', '#8a90a8'], acc:{ O:'#1e50c8' }, art:'stripe', rule:a => a.max.shinkansen >= 1, text:'Beat the shinkansen once' },
  { id:'paint.lava',      cat:'paint', kj:'溶岩', name:'Lava', ramp:['#4a3a3a', '#2a1e1e', '#140c0c'], acc:{ O:'#ff7a1a', M:'#ffd04a' }, art:'cracks', seen:'jump:sakurajima', text:'See the lava leap on Sakurajima' },
  { id:'paint.kinpaku',   cat:'paint', kj:'金箔', name:'Gold leaf', ramp:['#fff0a0', '#e8b030', '#8a5a10'], acc:{ O:'#ffffff' }, art:'sparkle', rule:a => a.km >= 100, text:'Ride 100 km in total' },
  { id:'paint.chizu',     cat:'paint', kj:'地図', name:'Atlas: every road in bands', ramp:['#ff5a8a', '#c77dff', '#4ff0ff'], acc:{ O:'#ffb347', M:'#7aff9a' }, art:'bands', rule:a => a.allRoads, text:'Ride on every road at least once' },
  // helmets: [base light, base dark, accent] + pattern
  { id:'helmet.plain',    cat:'helmet', kj:'無地', name:'Plain', def:true, text:'Owned from the start' },
  { id:'helmet.stripe',   cat:'helmet', kj:'一本線', name:'Centre stripe', c:['#f4f0e8', '#a8a4b0', '#ff2a3a'], pat:'stripe', rule:a => a.sum.cleanLandings >= 5, text:'Land 5 clean jumps in total' },
  { id:'helmet.checker',  cat:'helmet', kj:'市松', name:'Checker', c:['#f4f0e8', '#a8a4b0', '#14121c'], pat:'checker', rule:a => a.sum.closeCalls >= 100, text:'100 close calls in total' },
  { id:'helmet.raiden',   cat:'helmet', kj:'雷', name:'Lightning', c:['#2a2a5a', '#14143a', '#ffd04a'], pat:'bolt', rule:a => a.max.bestFlow >= 8, text:'Reach flow ×8 in one night' },
  { id:'helmet.police',   cat:'helmet', kj:'白バイ', name:'White patrol', c:['#ffffff', '#c8cce0', '#2a4ad0'], pat:'band', rule:a => a.sum.roadblocks >= 5, text:'Thread 5 police roadblocks in total' },
  { id:'helmet.kitsune',  cat:'helmet', kj:'狐', name:'Fox', c:['#fff6ea', '#d8c8b0', '#e0303a'], pat:'fox', seen:'matsuri', text:'See the matsuri' },
  { id:'helmet.jet',      cat:'helmet', kj:'噴', name:'Jet', c:['#3a3a48', '#1e1e28', '#ffb347'], pat:'visor', seen:'jump:haneda', text:'See the taxiway jump at Haneda' },
  // horns: [semitones from A4, length in steps], instrument
  { id:'horn.beep',       cat:'horn', kj:'単音', name:'Plain beep', def:true, call:[[0, 1], [0, 1]], text:'Owned from the start' },
  { id:'horn.niko',       cat:'horn', kj:'二拍', name:'Two-step call', call:[[0, 1], [7, 2]], rule:a => a.max.gates >= 1, text:'Pass your first checkpoint' },
  { id:'horn.matsuri',    cat:'horn', kj:'祭囃子', name:'Festival call', call:[[0, 1], [0, 1], [5, 1], [7, 2], [5, 2]], rule:a => a.sum.duelsWon >= 3, text:'Win 3 duels in total' },
  { id:'horn.kiteki',     cat:'horn', kj:'汽笛', name:'Harbour call', call:[[-12, 5], [-17, 6]], wave:'triangle', rule:a => a.nights >= 10, text:'Ride 10 nights' },
  { id:'horn.call',       cat:'horn', kj:'総長コール', name:'Long call', call:[[0, 1], [3, 1], [5, 1], [7, 1], [10, 1], [12, 3]], rule:a => a.sum.takedowns >= 10, text:'10 takedowns in total' },
  // trails: streak colours behind the tail light at speed
  { id:'trail.tail',      cat:'trail', kj:'尾灯', name:'Red tail light', def:true, text:'Owned from the start' },
  { id:'trail.ao',        cat:'trail', kj:'青', name:'Cyan streak', col:['#4ff0ff', '#1a9ac0'], rule:a => a.sum.bigBoosts >= 50, text:'50 big boosts in total' },
  { id:'trail.momo',      cat:'trail', kj:'桃', name:'Magenta streak', col:['#ff5ad0', '#a01a8a'], rule:a => a.sum.slipstreams >= 10, text:'10 slipstreams in total' },
  { id:'trail.kin',       cat:'trail', kj:'金', name:'Gold streak', col:['#ffe48a', '#d09020'], rule:a => a.max.km >= 10, text:'Ride 10 km in one night' },
  { id:'trail.hi',        cat:'trail', kj:'火', name:'Ember', col:['#ffb347', '#ff4a1a'], ember:true, rule:a => a.max.infernoEscapes >= 1, text:'Escape the fireball once' },
  { id:'trail.yuki',      cat:'trail', kj:'雪', name:'Snow white', col:['#ffffff', '#a8c8f0'], seen:'jump:snow', text:'See the ski jump in the onsen town' } ];
for(const it of ITEMS) if(it.seen && !it.rule){ const s = it.seen; it.rule = a => a.moments.has(s); }
const BY = {}; ITEMS.forEach(it => { BY[it.id] = it; });
const DEF = { jacket:'jacket.own', paint:'paint.factory', helmet:'helmet.plain', horn:'horn.beep', trail:'trail.tail' };

// the back kanji: 40 phrases (free), with a one-line gloss each
const KANJI = [
  ['夜露死苦', 'yoroshiku: regards (ateji)'], ['愛羅武勇', 'ai rabu yū: I love you (ateji)'], ['仏恥義理', 'bucchigiri: leave them all behind'], ['走死走愛', 'ride to the end, ride for love'],
  ['喧嘩上等', 'bring on the fight'], ['夜露死苦参上', 'yoroshiku: here we are'], ['天上天下', 'heaven above, earth below'], ['唯我独尊', 'I alone am honoured'],
  ['一期一会', 'one time, one meeting'], ['不撓不屈', 'unbending, unbowed'], ['疾風迅雷', 'swift wind, sudden thunder'], ['電光石火', 'quick as a lightning flash'],
  ['一騎当千', 'one rider worth a thousand'], ['威風堂々', 'with pomp and dignity'], ['百花繚乱', 'a hundred flowers in bloom'], ['風林火山', 'wind, forest, fire, mountain'],
  ['七転八起', 'fall seven times, rise eight'], ['一生懸命', 'with all your might'], ['初志貫徹', 'see it through'], ['天下無双', 'without equal under heaven'],
  ['疾風', 'gale'], ['夜叉', 'yaksha, a fierce spirit'], ['風神', 'god of wind'], ['雷神', 'god of thunder'], ['龍虎', 'dragon and tiger'], ['鬼神', 'fierce god'],
  ['侍', 'samurai'], ['武士道', 'the way of the warrior'], ['魂', 'soul'], ['一番星', 'the first star of evening'], ['流星', 'shooting star'], ['夜明け', 'dawn'],
  ['夜走', 'night ride'], ['不死鳥', 'phoenix'], ['月光', 'moonlight'], ['爆走', 'flat out'], ['走り屋', 'street racer'], ['夜桜', 'cherry blossoms at night'], ['夢', 'dream'], ['仁義', 'honour and duty'] ];
const KANJI_OK = /^[々぀-ヿ㐀-䶿一-鿿]{1,4}$/;   // typed: 1-4 kana or kanji

/* ================================================================== state */
function load(){ const v = LS.get(KEY, null), o = v && typeof v === 'object' ? v : {};
  const eq = Object.assign({}, DEF, o.eq && typeof o.eq === 'object' ? o.eq : {}); for(const c in DEF) if(!BY[eq[c]] || BY[eq[c]].cat !== c) eq[c] = DEF[c];
  const kanji = typeof (o.eq || {}).kanji === 'string' && o.eq.kanji ? o.eq.kanji : '夜露死苦'; eq.kanji = kanji;
  return { v:1, eq, got:o.got && typeof o.got === 'object' ? o.got : {}, seen:o.seen && typeof o.seen === 'object' ? o.seen : {} }; }
let ST = load(); const save = () => LS.set(KEY, ST);
COS.state = () => ST; COS.reload = () => { ST = load(); resig(); };
COS.owned = id => !!(BY[id] && (BY[id].def || ST.got[id]));
let TRY = null;   // a try-on in the garage (owned items only): { cat:id }
const view = () => TRY ? Object.assign({}, ST.eq, TRY) : ST.eq;
function resig(){ const e = view(); COS.sig = e.jacket === DEF.jacket && e.paint === DEF.paint && e.helmet === DEF.helmet ? '' : '~' + e.jacket.slice(7) + '.' + e.paint.slice(6) + '.' + e.helmet.slice(7); }
resig();

/* ================================================================== the rules over saved nights */
function agg(){ return { nights:0, dawns:0, km:0, sum:{}, max:{}, moments:new Set(), gangWins:new Set(), roads:new Set(), allRoads:false }; }
const SUMS = ['cleanLandings', 'closeCalls', 'roadblocks', 'duelsWon', 'takedowns', 'bigBoosts', 'slipstreams'], MAXS_ = ['km', 'gates', 'bestFlow', 'shinkansen', 'infernoEscapes'];
function add(a, r, lands){ if(!r || typeof r !== 'object') return; a.nights++; if(r.end === 'dawn') a.dawns++; a.km += +r.km || 0;
  for(const k of SUMS) a.sum[k] = (a.sum[k] || 0) + (+r[k] || 0); for(const k of MAXS_) a.max[k] = Math.max(a.max[k] || 0, +r[k] || 0);
  if(Array.isArray(r.moments)) r.moments.forEach(m => a.moments.add(String(m)));
  if(Array.isArray(r.rivals)) r.rivals.forEach(e => { if(e && e.won && typeof e.g === 'string') a.gangWins.add(e.g); });   // only nights that kept each duel (old totals don't say which gang)
  const n = lands ? lands.length : 0; if(Array.isArray(r.route)) r.route.forEach(i => { if(Number.isInteger(i) && i >= 0 && i < n) a.roads.add(i); });
  else if(lands && r.land){ const i = lands.findIndex(l => l.name === r.land); if(i >= 0) a.roads.add(i); }
  a.allRoads = n > 0 && a.roads.size >= n; }
// evaluate every rule; newly met ids are written to got with the time of the night (or sighting) that met them; returns them
function scan(){ ST = load(); const recs = LS.get('arcade.sundown', []), dir = LS.get('sundown.director', null), lands = G('LANDS'), list = Array.isArray(recs) ? recs : [];
  const a = agg(), met = {}; for(const r of list){ add(a, r, lands); for(const it of ITEMS) if(it.rule && !met[it.id] && !ST.got[it.id] && it.rule(a)) met[it.id] = (r && +r.t) || Date.now(); }
  const dm = dir && typeof dir === 'object' && dir.m && typeof dir.m === 'object' ? dir.m : {};
  for(const it of ITEMS) if(it.seen && !met[it.id] && !ST.got[it.id] && dm[it.seen] && dm[it.seen].r) met[it.id] = +dm[it.seen].t || Date.now();
  const fresh = Object.keys(met); for(const id of fresh) ST.got[id] = met[id]; if(fresh.length) save(); resig(); return fresh; }
COS.scan = scan; COS.ITEMS = ITEMS; COS.CATS = CATS; COS.KANJI = KANJI; COS.BY = BY; COS._agg = () => { const a = agg(); (LS.get('arcade.sundown', []) || []).forEach(r => add(a, r, G('LANDS'))); return a; };
COS.equip = (cat, id) => { if(!COS.owned(id) || BY[id].cat !== cat) return false; ST.eq[cat] = id; save(); resig(); return true; };
COS.setKanji = s => { s = String(s || '').trim(); if(!(KANJI.some(k => k[0] === s) || KANJI_OK.test(s))) return false; ST.eq.kanji = s; save(); return true; };
COS.summary = () => { scan(); return CATS.map(c => { const its = ITEMS.filter(i => i.cat === c.id), got = its.filter(i => COS.owned(i.id)), next = its.find(i => !COS.owned(i.id));
  return { cat:c, wearing:BY[ST.eq[c.id]], got:got.length, total:its.length, next }; }); };

/* ================================================================== sprites: palette and rows, per bike */
// role keys of each bike's rows: paint keys -> ramp step (0 light .. 2 dark); helmet keys in rows 0-5; coat keys in the torso rows
const BK = {
  sport:  { paint:{ 1:0, 2:1, 3:2 }, helm:{ w:'H', v:'I', R:'J' }, coat:{ w:'B', R:'C', c:'C', b:'D' }, torso:[7, 12], art:12 },
  gp:     { paint:{ 1:0, 2:1, 3:2, 4:0, 5:1, 6:2 }, helm:{ w:'H', v:'I', x:'J' }, coat:{ w:'B', x:'C', c:'C', b:'D' }, torso:[7, 12], art:12 },
  capsule:{ paint:{ 0:0, 1:0, 2:1, 3:2, 4:2 }, helm:{ w:'H', v:'I', U:'J' }, coat:{ a:'B', b:'C', c:'D' }, torso:[7, 12], art:12 },
  kaido:  { paint:{ 1:0, 2:1, 3:2 }, helm:{ h:'H', i:'I', U:'J' }, coat:{ a:'B', b:'C', c:'D' }, torso:[7, 17], art:12 },
  cafe:   { paint:{ 0:0, 1:0, 2:1, 3:2 }, helm:{ h:'H', i:'I', U:'J' }, coat:{ a:'B', b:'C', c:'D' }, torso:[7, 12], art:0 },
  neon:   { paint:{ 1:0, 2:1, 3:2 }, helm:{ h:'H', i:'I', u:'J' }, coat:{ a:'B', b:'B', c:'D' }, torso:[7, 12], art:0 } };
COS.BK = BK;
function pal(id, role, P0){ if(!COS.sig) return P0; const m = BK[id]; if(!m) return P0; const e = view(), o = Object.assign({}, P0);
  if(role === 'rider'){ const j = BY[e.jacket], h = BY[e.helmet];
    if(j && !j.def){ o.B = j.c[0]; o.C = j.c[1]; o.D = j.c[2]; o.L = '#ffd04a'; }
    if(h && !h.def){ o.H = h.c[0]; o.I = h.c[1]; o.J = h.c[2]; } }
  else { const p = BY[e.paint]; if(p && !p.def){ for(const k in m.paint) if(k in o) o[k] = p.ramp[m.paint[k]]; Object.assign(o, p.acc || {}); } }
  return o; }
// helmet patterns on the left-half rows (d = columns from the centre, y = row 0-5); true -> the accent key J
const HPAT = { stripe:(d, y) => d === 0 && y > 0, checker:(d, y) => (d + y) % 2 === 0, bolt:(d, y) => d === [1, 2, 1, 2, 1, 2][y], band:(d, y) => y === 3,
  fox:(d, y) => (y === 3 && d === 2) || (y === 1 && d === 1), visor:(d, y) => y === 3 || y === 4 };
// tank art on the fairing rows (left halves, mirrored): returns an accent key or null; d = columns from the centre
const ART = { claw:(d, y) => y >= 3 && y <= 8 && (d + y) % 5 === 0 && d > 1 ? 'O' : null, speckle:(d, y) => { const h = (d * 7 + y * 13) % 11; return h === 0 ? 'O' : h === 6 ? 'M' : null; },
  wave:(d, y) => (y === 5 && d % 4 < 2) || (y === 6 && d % 4 === 2) ? 'O' : null, cap:(d, y) => y <= 3 ? 'O' : null, stripe:(d, y) => y === 6 || y === 7 ? 'O' : null,
  cracks:(d, y) => { const h = (d * 5 + y * 3) % 9; return h === 0 ? 'O' : h === 4 && y > 5 ? 'M' : null; }, sparkle:(d, y) => (d * 3 + y * 5) % 13 === 0 ? 'O' : null,
  bands:(d, y) => [null, null, 'O', 'O', null, 'M', 'M', null][y % 8] };
function rows(id, role, R){ if(!COS.sig) return R; const m = BK[id]; if(!m || !Array.isArray(R)) return R; const e = view();
  if(role === 'rider'){ const j = BY[e.jacket], h = BY[e.helmet]; return R.map((r, y) => { const n = r.length; let s = [...r];
      if(h && !h.def && y <= 5) s = s.map((ch, x) => { const k = m.helm[ch]; if(!k) return ch; return HPAT[h.pat] && HPAT[h.pat](n - 1 - x, y) ? 'J' : k === 'J' ? 'H' : k; });
      if(j && !j.def && y >= m.torso[0] && y <= m.torso[1]){ s = s.map(ch => m.coat[ch] || ch); if(y >= 8 && y <= 10) for(let x = n - 2; x < n; x++) if('BCD'.includes(s[x])) s[x] = 'L'; }   // the gold panel on the back
      return s.join(''); }); }
  if(role === 'top' && m.art){ const p = BY[e.paint]; if(!p || p.def || !ART[p.art]) return R;
    return R.map((r, y) => y >= m.art ? r : [...r].map((ch, x) => (ch in m.paint) ? ART[p.art](r.length - 1 - x, y) || ch : ch).join('')); }
  return R; }
COS.pal = pal; COS.rows = rows;
// the trail: a stepped streak from the tail light, toward the camera, above 60 % speed (never in reduced motion)
COS.trail = (g, x, y, k, lean, now, force) => { const t = BY[view().trail]; if(!t || t.def || !t.col) return; if(G('reduce')) return;
  let sp = force != null ? force : (G('state') === 'play' ? G('speed') / G('MAXS') : 0); if(!(sp > .6)) return; const a = Math.min(1, (sp - .6) / .3);
  const h = 11.5 * k, tx = x + Math.sin(lean) * h, ty = y - Math.cos(lean) * h, f = Math.floor((now || 0) / 70) % 2;
  g.save(); for(let i = 1; i <= 6; i++){ const w = Math.max(k, Math.round((3.4 - i * .45) * k)), yy = Math.round(ty + (i * 1.7 + f * .5) * k);
    g.globalAlpha = a * (1 - i / 7.5) * .85; g.fillStyle = t.col[(i + f) % 2]; g.fillRect(Math.round(tx - w / 2 - lean * i * k * 1.5), yy, w, Math.max(1, Math.round(k * 1.2))); }
  if(t.ember) for(let i = 0; i < 4; i++){ const r = (Math.sin((now || 0) / 90 + i * 2.1) + 1) / 2; g.globalAlpha = a * .8; g.fillStyle = t.col[i % 2]; g.fillRect(Math.round(tx + (r - .5) * 6 * k), Math.round(ty + (2 + i * 2.5) * k), k, k); }
  g.restore(); };
// the horn: the chosen call on the game's synth (and its volume)
COS.horn = (id) => { const M = G('M'), it = BY[id || ST.eq.horn] || BY[DEF.horn]; if(!M || !M.ac || !M.tone || !it.call) return; const t0 = M.ac.currentTime + .02, st = .11; let t = t0;
  for(const [s, n] of it.call){ const f = 440 * Math.pow(2, s / 12); M.tone(f, st * n * .92, { type:it.wave || 'square', v:it.wave ? .05 : .03, at:t }); if(!it.wave) M.tone(f * 1.26, st * n * .92, { type:'square', v:.012, at:t }); t += st * n; } };

if(!HAS_DOM){ return; }

/* ================================================================== the honk: H / pad Y during a ride (looks and sound only) */
const riding = () => { const sh = G('SHEET'), pz = G('PSE'); return G('state') === 'play' && !!sh && sh.hidden && !(pz && pz.on) && !(G0.JOURNAL && G0.JOURNAL.open); };
addEventListener('keydown', e => { if((G0.keyMap ? G0.keyMap(e.code) : e.code) !== 'KeyH' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || COS.open) return; if(riding()) COS.horn(); });
let honkPrev = false, honkOn = false;
function honkLoop(){ if(honkOn) return; honkOn = true; const tick = () => { const gs = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for(let i = 0; i < gs.length; i++) if(gs[i]){ gp = gs[i]; break; }
    if(!gp){ honkOn = false; honkPrev = false; return; } if(G0.padMap) gp = G0.padMap(gp); const y = !!(gp.buttons[3] && gp.buttons[3].pressed); if(y && !honkPrev && riding()) COS.horn(); honkPrev = y; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
addEventListener('gamepadconnected', honkLoop); const anyPad = () => navigator.getGamepads && [...navigator.getGamepads()].some(Boolean);
if(anyPad()) honkLoop(); setInterval(() => { if(!honkOn && anyPad()) honkLoop(); }, 1000);   // a pad already connected before the page (no event)

/* ================================================================== the garage picker (title screen) */
const CSS = `
.cosb{display:inline-flex;align-items:center;gap:8px;padding:7px 12px 6px;font-size:16px;letter-spacing:2px;margin-top:2px}
.cosb .nw{font-size:13px;line-height:1;padding:2px 4px 1px;background:#ffd04a;color:#07060c;box-shadow:2px 2px 0 #000}
#cos{position:fixed;inset:0;z-index:45;display:flex;overflow-y:auto;padding:16px;background:repeating-linear-gradient(rgba(0,0,0,.24) 0 1px,transparent 1px 3px),rgba(5,4,10,.9)}
#cos .cin{margin:auto;width:min(1120px,100%);display:flex;flex-direction:column;align-items:center;gap:16px}
#cos .rslab{animation:pzslam .38s steps(7) both}
#cos .cg{display:grid;grid-template-columns:250px minmax(0,1fr) 380px;gap:22px;width:100%;align-items:start}
#cos .ccats,#cos .cits{display:flex;flex-direction:column;gap:9px;padding-left:26px}
#cos .pzi{width:calc(100% - 26px);margin-left:calc(var(--i,0) * 4px)}
#cos .pzi .t small{display:block;font-size:11px;letter-spacing:1px;margin-top:4px;opacity:.85;line-height:1.3;white-space:normal}
#cos .pzi.cur:not(.sel)>.sh{background:#ffd04a}
#cos .pzi.lk{color:#8f86a0}#cos .pzi.lk .tabk{filter:grayscale(1) brightness(.55)}#cos .pzi.lk>.bg::after{background:#120e1a}
#cos .pzi .tag{position:relative;z-index:1;font-size:13px;line-height:1;padding:2px 4px 1px;box-shadow:2px 2px 0 #000;background:#ffd04a;color:#07060c;white-space:nowrap}
#cos .pzi .tag.nw{background:#ff3b5c;color:#fff6ea}
#cos .pzi.no{animation:cosno .24s steps(4)}
@keyframes cosno{25%{transform:translateX(18px)}50%{transform:translateX(6px)}75%{transform:translateX(16px)}}
#cos .cprev{display:flex;flex-direction:column;align-items:center;gap:12px}
#cos .cstage{position:relative;display:flex;align-items:flex-end;justify-content:center;gap:18px;flex-wrap:wrap;padding:14px 18px 10px;background:#0b0912;box-shadow:inset 0 0 0 2px #3a3350,6px 6px 0 #000;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,0 100%)}
#cos canvas{display:block;image-rendering:pixelated}
#cos .cnote{margin:0;font-family:var(--font-display);font-size:13px;color:var(--muted);text-align:center;max-width:420px;line-height:1.5;min-height:3em}
#cos .cnote b{font-weight:400;color:#ffd04a}
#cos .kg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 10px;padding:4px 10px 4px 0}
#cos .kt{min-height:44px;padding:4px 6px;border:2px solid #000;background:#1c1628;color:#f4ecdf;font-family:var(--font-display);font-size:16px;line-height:1.1;cursor:pointer;box-shadow:inset 0 2px 0 #5a5072,4px 4px 0 #000;border-radius:0}
#cos .kt.on{box-shadow:inset 0 0 0 2px #ffd04a,4px 4px 0 #000}
#cos .kt.sel{background:#f4ecdf;color:#14080a;box-shadow:inset 0 2px 0 #fff,4px 4px 0 #ff3b5c;transform:translateY(-3px)}
#cos .kt:focus-visible,#cos .kin input:focus-visible{outline:none}
#cos .kin{display:flex;gap:8px;align-items:center;grid-column:1/-1;margin-top:6px}
#cos .kin input{flex:1;min-width:0;height:44px;padding:0 10px;font-family:var(--font-display);font-size:24px;color:#f4ecdf;background:#06050c;border:2px solid #000;box-shadow:inset 0 0 0 2px #3a3350;border-radius:0}
#cos .kin input.sel{box-shadow:inset 0 0 0 2px #ffd04a}
#cos .kin .kt{min-width:72px}
#cos .back{margin-top:4px}
@media (max-width:980px){ #cos .cg{grid-template-columns:1fr} #cos .ccats{flex-direction:row;flex-wrap:wrap;padding-left:0;gap:8px 12px} #cos .ccats .pzi{width:auto;margin:0;min-height:40px;padding:6px 18px}
  #cos .ccats .pzi .mk{display:none} #cos .ccats .pzi.sel{transform:translateY(-3px)} #cos .cits{padding-left:26px} #cos .kg{grid-template-columns:repeat(2,minmax(0,1fr))} }
.rm #cos *{animation:none!important}
@media (prefers-reduced-motion: reduce){ #cos *{animation:none!important} }`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const U = { cat:0, col:'cats', kanji:false, raf:0, prevT:0, newIds:new Set(), padPrev:{}, keyH:null };
function injectCSS(){ if(document.getElementById('cos-css')) return; const st = document.createElement('style'); st.id = 'cos-css'; st.textContent = CSS; document.head.appendChild(st); }
COS.unseen = () => ITEMS.filter(i => !i.def && ST.got[i.id] && !ST.seen[i.id]).length;
COS.button = () => { injectCSS(); try{ scan(); }catch(e){} const n = COS.unseen(); const cap = G('cap');
  return `<button type="button" class="pzi tb cosb" id="cosBtn" style="--i:0">${slab()}<span class="tabk g">改造</span><span class="t">CUSTOMISE</span>${n ? `<span class="nw" aria-label="${n} new">新 ${n}</span>` : '<span></span>'}</button>`; };   // a pause-menu slab (sundown.html styles .garage .pzi.tb)
const slab = () => (G('pzSlab') ? G('pzSlab')() : '');
function itemRow(it, i){ const own = COS.owned(it.id), on = view()[it.cat] === it.id && ST.eq[it.cat] === it.id, nw = U.newIds.has(it.id);
  const sub = own ? (it.def ? 'from the start' : 'earned ' + new Date(ST.got[it.id]).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })) : it.text;
  return `<button type="button" class="pzi${own ? '' : ' lk'}" data-n data-it="${it.id}" style="--i:${i}" aria-label="${esc(it.name)}${own ? '' : ', locked: ' + esc(it.text)}">${slab()}<span class="tabk ${own ? 'g' : 'n'}">${own ? it.kj : '未'}</span><span class="t">${esc(own ? it.name.toUpperCase() : '? ? ?')}<small>${esc(own ? sub : 'TO EARN: ' + sub)}</small></span>${on ? '<span class="tag">着用</span>' : nw ? '<span class="tag nw">新</span>' : '<span></span>'}</button>`; }
function render(){ const root = document.getElementById('cos'); if(!root) return; const c = CATS[U.cat];
  root.querySelector('.ccats').innerHTML = CATS.map((k, i) => `<button type="button" class="pzi${i === U.cat ? ' cur' : ''}" data-n data-cat="${i}" style="--i:${i}">${slab()}<span class="tabk">${k.kj}</span><span class="t">${k.short}</span><span></span></button>`).join('')
    + `<button type="button" class="pzi back" data-n data-back="1" style="--i:5">${slab()}<span class="tabk n">戻る</span><span class="t">BACK</span><span></span></button>`;
  const its = ITEMS.filter(i => i.cat === c.id);
  let h = ''; if(c.id === 'jacket') h += `<button type="button" class="pzi" data-n data-kj="1" style="--i:0">${slab()}<span class="tabk">背中</span><span class="t">BACK KANJI<small>${esc(ST.eq.kanji)} · yours to choose, never locked</small></span><span></span></button>`;
  if(U.kanji) h = `<div class="kg">${KANJI.map(([k], i) => `<button type="button" class="kt${ST.eq.kanji === k ? ' on' : ''}" data-n data-k="${i}">${k}</button>`).join('')}
      <div class="kin"><input type="text" data-n data-in="1" maxlength="4" placeholder="自分で" aria-label="Write your own: one to four kana or kanji" lang="ja" value="${KANJI.some(k => k[0] === ST.eq.kanji) ? '' : esc(ST.eq.kanji)}"><button type="button" class="kt" data-n data-kok="1">決定 OK</button></div></div>`;
  else h += its.map((it, i) => itemRow(it, i + (c.id === 'jacket' ? 1 : 0))).join('');
  root.querySelector('.cits').innerHTML = h;
  const again = U.key && root.querySelector(U.key); if(again){ again.classList.add('sel'); if(document.activeElement !== again) try{ again.focus({ preventScroll:true }); }catch(e){} } }   // the selection survives a redraw
function focusables(col){ const root = document.getElementById('cos'); return [...root.querySelectorAll(col === 'cats' ? '.ccats [data-n]' : '.cits [data-n]')]; }
const keyOf = el => { const d = el.dataset; return d.cat != null ? `[data-cat="${d.cat}"]` : d.it ? `[data-it="${d.it}"]` : d.k != null ? `[data-k="${d.k}"]` : d.kj ? '[data-kj]' : d.back ? '[data-back]' : d.in ? '[data-in]' : d.kok ? '[data-kok]' : null; };
function sel(el, quiet){ const root = document.getElementById('cos'); if(!el || !root) return; root.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); U.key = keyOf(el); U.col = el.closest('.ccats') ? 'cats' : 'items';
  if(document.activeElement !== el) try{ el.focus({ preventScroll:true }); }catch(e){} hover(el, quiet); }
// what the focused thing shows: a category opens its list; an owned item is tried on in the preview (and on the road behind); a horn plays
function hover(el, quiet){ const note = document.querySelector('#cos .cnote'); TRY = null;
  if(el.dataset.cat != null && +el.dataset.cat !== U.cat){ U.cat = +el.dataset.cat; U.kanji = false; render(); }
  const it = el.dataset.it && BY[el.dataset.it];
  if(it && COS.owned(it.id)){ TRY = { [it.cat]:it.id }; if(it.cat === 'horn' && !quiet) COS.horn(it.id); }
  if(note){ if(it) note.innerHTML = COS.owned(it.id) ? `<b>${esc(it.kj)}</b> ${esc(it.name)}. ${esc(it.def ? 'Owned from the start.' : 'Earned: ' + it.text.toLowerCase() + '.')}` : `Locked. <b>To earn:</b> ${esc(it.text)}. Ridden, not bought.`;
    else if(el.dataset.k != null){ const k = KANJI[+el.dataset.k]; note.innerHTML = `<b>${esc(k[0])}</b> ${esc(k[1])}`; }
    else if(el.dataset.kj) note.innerHTML = `The kanji on your back: <b>${esc(ST.eq.kanji)}</b>. Any phrase, or write your own.`;
    else if(el.dataset.cat != null) note.innerHTML = `<b>${CATS[U.cat].kj}</b> ${esc(CATS[U.cat].name)}: ${ITEMS.filter(i => i.cat === CATS[U.cat].id && COS.owned(i.id)).length} / ${ITEMS.filter(i => i.cat === CATS[U.cat].id).length} earned by riding.`;
    else note.textContent = ''; }
  resig(); drawPreview(true); }
function act(el, e){ if(!el) return; const sfx = G0.SFX && G0.SFX.ui ? t => G0.SFX.ui(t) : () => {};
  if(el.dataset.back){ sfx('back'); close(); return; }
  if(el.dataset.cat != null){ sfx('ok'); const f = focusables('items')[0]; if(f) sel(f); return; }
  if(el.dataset.kj){ sfx('ok'); U.kanji = true; render(); const k = KANJI.findIndex(x => x[0] === ST.eq.kanji); sel(document.querySelector(`#cos .kg [data-k="${Math.max(0, k)}"]`) || focusables('items')[0]); return; }
  if(el.dataset.k != null){ COS.setKanji(KANJI[+el.dataset.k][0]); sfx('ok'); U.kanji = false; render(); sel(document.querySelector('#cos .cits [data-kj]')); return; }
  if(el.dataset.kok){ const v = document.querySelector('#cos .kin input').value; if(COS.setKanji(v)){ sfx('ok'); U.kanji = false; render(); sel(document.querySelector('#cos .cits [data-kj]')); } else { sfx('back'); el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); } return; }
  if(el.dataset.in){ return; }
  const it = el.dataset.it && BY[el.dataset.it]; if(!it) return;
  if(!COS.owned(it.id)){ sfx('deny'); el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); return; }
  COS.equip(it.cat, it.id); sfx('equip'); if(it.cat === 'horn') COS.horn(it.id); const id = it.id; render(); sel(document.querySelector(`#cos [data-it="${id}"]`), true); }
function nav(cmd){ const list = focusables(U.col), el = document.querySelector('#cos .sel'), i = list.indexOf(el), sfx = G0.SFX && G0.SFX.ui ? t => G0.SFX.ui(t) : () => {};
  if(U.kanji && U.col === 'items'){ const cols = innerWidth <= 980 ? 2 : 3, ks = [...document.querySelectorAll('#cos .kg [data-k]')], ki = ks.indexOf(el);
    if(cmd === 'back'){ U.kanji = false; render(); sel(document.querySelector('#cos .cits [data-kj]')); sfx('back'); return; }
    if(ki >= 0 && cmd !== 'ok'){ const d = { left:-1, right:1, up:-cols, down:cols }[cmd]; let j = ki + d; if(j >= ks.length){ sel(document.querySelector('#cos .kin input')); sfx('move'); return; } if(j < 0) return; sel(ks[j]); sfx('move'); return; }
    if(el && (el.dataset.in || el.dataset.kok) && (cmd === 'up')){ sel(ks[ks.length - 1]); sfx('move'); return; }
    if(el && el.dataset.in && cmd === 'right'){ sel(document.querySelector('#cos .kin [data-kok]')); return; }
    if(el && el.dataset.kok && cmd === 'left'){ sel(document.querySelector('#cos .kin input')); return; } }
  if(cmd === 'up' || cmd === 'down'){ if(!list.length) return; sel(list[(i + (cmd === 'up' ? -1 : 1) + list.length) % list.length]); sfx('move'); }
  else if(cmd === 'right' && U.col === 'cats'){ const f = focusables('items')[0]; if(f){ sel(f); sfx('move'); } }
  else if(cmd === 'left' && U.col === 'items'){ sel(document.querySelector(`#cos .ccats [data-cat="${U.cat}"]`)); sfx('move'); }
  else if(cmd === 'ok') act(el);
  else if(cmd === 'back'){ if(U.col === 'items'){ sel(document.querySelector(`#cos .ccats [data-cat="${U.cat}"]`)); sfx('back'); } else { sfx('back'); close(); } } }
// the preview: the bike you ride, from behind, as big as fits; the jacket back with your kanji embroidered in gold thread
function drawPreview(force){ const root = document.getElementById('cos'); if(!root) return; const now = performance.now(); if(!force && now - U.prevT < 66) return; U.prevT = now;
  const cb = root.querySelector('canvas.cbike'), B = G('BIKE'), EB = G0.ENV && G0.ENV.bikes;
  if(cb && EB && EB.render){ const g = cb.getContext('2d'), k = +cb.dataset.k; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cb.width, cb.height); g.imageSmoothingEnabled = false;
    const t = BY[view().trail], x = cb.width / 2, y = cb.height - 4 * k; try{ EB.render(g, B ? B.id : 'sport', x, y, k, 0, now, null); if(t && !t.def) COS.trail(g, x, y, k, 0, now, 1); }catch(e){} }
  const cj = root.querySelector('canvas.cjack'); if(cj && force) drawJacket(cj); }
function drawJacket(c){ const g = c.getContext('2d'), w = c.width, h = c.height, j = BY[view().jacket], col = j && !j.def ? j.c : ['#f4f0e8', '#c8c4d0', '#7a7688'];
  g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false;
  // the coat back: shoulders, a long body to the knee, the collar; stepped shading (light upper left), hard ink outline
  const top = 8, sh = 10, L = 6, R = w - 6; const xl = y => y < top + sh ? Math.round(L + (top + sh - y) * 1.2) : L, xr = y => w - xl(y);
  for(let y = top; y < h - 4; y++){ const a = xl(y), b = xr(y); g.fillStyle = '#07060c'; g.fillRect(a - 1, y, b - a + 2, 1); g.fillStyle = col[1]; g.fillRect(a, y, b - a, 1); g.fillStyle = col[0]; g.fillRect(a, y, Math.round((b - a) * .18), 1); g.fillStyle = col[2]; g.fillRect(b - Math.round((b - a) * .14), y, Math.round((b - a) * .14), 1); }
  g.fillStyle = '#07060c'; g.fillRect(L - 1, h - 4, R - L + 2, 1); g.fillRect(Math.round(w / 2) - 10, top - 3, 20, 4); g.fillStyle = col[2]; g.fillRect(Math.round(w / 2) - 9, top - 2, 18, 3);
  // gold stitch border, dashed
  g.fillStyle = '#ffd04a'; for(let y = top + sh + 3; y < h - 7; y += 3){ g.fillRect(L + 3, y, 1, 2); g.fillRect(R - 4, y, 1, 2); } for(let x = L + 3; x < R - 3; x += 3) g.fillRect(x, h - 7, 2, 1);
  // the kanji, top to bottom, right column first when there are two (as embroidered); gold with a dark stitch outline
  const s = String(ST.eq.kanji || ''), chars = [...s], n = chars.length, cols = n > 4 ? 2 : 1, per = Math.ceil(n / cols), px = G('pixText'), sm = G('stampMask'), bm = G('bandMask');
  if(px && sm && bm){ const cell = Math.min(34, Math.floor((h - top - sh - 18) / per)), size = cell >= 32 ? 32 : 16, sc = cell >= 32 ? 1 : Math.max(1, Math.floor(cell / 18));
    for(let i = 0; i < n; i++){ const cI = Math.floor(i / per), r = i % per, m = px(chars[i], size, false), fill = bm(m, ['#fff0a0', '#ffd04a', '#d09020']);
      const cx0 = cols === 1 ? w / 2 : w / 2 + (cI === 0 ? 1 : -1) * (m.width * sc / 2 + 2), y0 = top + sh + 2 + r * (size * sc + 2) + Math.round(((h - top - sh - 18) - per * (size * sc + 2)) / 2);
      sm(g, m, Math.round(cx0 - m.width * sc / 2), y0, sc, fill, '#2a1600', '#07060c', 1); } } }
function open(){ if(COS.open) return; injectCSS(); scan(); COS.open = true; U.newIds = new Set(ITEMS.filter(i => !i.def && ST.got[i.id] && !ST.seen[i.id]).map(i => i.id)); U.cat = 0; U.kanji = false; TRY = null;
  const narrow = innerWidth <= 980, kb = narrow ? 5 : 7, gb = document.getElementById('goBtn'); if(gb) gb.disabled = true;   // the title's START can't be pressed from under the garage
  const root = document.createElement('div'); root.id = 'cos'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Garage: customise');
  root.innerHTML = `<div class="cin"><div class="rslab"><span class="kj">改造</span><b>CUSTOMISE</b></div><div class="cg"><div class="ccats"></div>
    <div class="cprev"><div class="cstage"><canvas class="cbike" width="${38 * kb}" height="${36 * kb}" data-k="${kb}" aria-label="Your bike, from behind"></canvas><canvas class="cjack" width="84" height="${narrow ? 104 : 116}" style="width:${84 * (narrow ? 2 : 3)}px;height:${(narrow ? 104 : 116) * (narrow ? 2 : 3)}px" aria-label="Your jacket back"></canvas></div>
      <p class="cnote" aria-live="polite"></p></div><div class="cits"></div></div></div>`;
  document.body.appendChild(root); render();
  root.addEventListener('click', e => { const el = e.target.closest('[data-n]'); if(!el) return; if(!el.classList.contains('sel')) sel(el, true); act(el, e); });
  root.addEventListener('pointermove', e => { if(e.pointerType !== 'mouse') return; const el = e.target.closest('[data-n]'); if(el && !el.classList.contains('sel')) sel(el, true); });
  U.keyH = e => { if(!COS.open) return; const inInput = e.target && e.target.tagName === 'INPUT'; const m = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right', Enter:'ok', NumpadEnter:'ok', Space:'ok', Escape:'back', Backspace:'back', Tab:'down' }[e.code];
    e.stopImmediatePropagation(); if(inInput && (e.code === 'Space' || e.code === 'Backspace' || (e.code === 'ArrowLeft' || e.code === 'ArrowRight') && e.target.value)) return;   // typing stays typing
    if(inInput && e.code === 'Enter'){ e.preventDefault(); act(document.querySelector('#cos .kin [data-kok]')); return; }
    if(m){ e.preventDefault(); if(!(e.repeat && (m === 'ok' || m === 'back'))) nav(m); } };
  U.keyUpH = e => { if(COS.open){ e.stopImmediatePropagation(); if(e.code === 'Space' && !(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); } };
  addEventListener('keydown', U.keyH, true); addEventListener('keyup', U.keyUpH, true);
  U.padPrev = padState() || { up:1, down:1, left:1, right:1, ok:1, back:1 };
  const tick = () => { if(!COS.open) return; const p = padState(); if(p){ for(const c of ['up', 'down', 'left', 'right', 'ok', 'back']) if(p[c] && !U.padPrev[c]) nav(c); U.padPrev = p; } drawPreview(false); U.raf = requestAnimationFrame(tick); };
  U.raf = requestAnimationFrame(tick);
  sel(root.querySelector('.ccats [data-cat="0"]'), true);
  for(const id of U.newIds) ST.seen[id] = 1; save();   // opening the garage clears the "new" mark on the title button (the tags show this once)
  if(document.fonts) document.fonts.load('16px DotGothic16', KANJI.map(k => k[0]).join('') + ITEMS.map(i => i.kj).join('') + ST.eq.kanji).then(() => { if(COS.open){ render(); const s = document.querySelector('#cos .sel') || document.querySelector('#cos .ccats [data-cat="0"]'); drawPreview(true); } }).catch(() => {}); }
function padState(){ const gs = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for(let i = 0; i < gs.length; i++) if(gs[i]){ gp = gs[i]; break; } if(!gp) return null;
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, b = i => !!(gp.buttons[i] && gp.buttons[i].pressed); return { up:ay < -.5 || b(12), down:ay > .5 || b(13), left:ax < -.5 || b(14), right:ax > .5 || b(15), ok:b(0), back:b(1) }; }
function close(){ if(!COS.open) return; COS.open = false; TRY = null; resig(); cancelAnimationFrame(U.raf); removeEventListener('keydown', U.keyH, true); removeEventListener('keyup', U.keyUpH, true);
  const r = document.getElementById('cos'); if(r) r.remove(); const gb = document.getElementById('goBtn'); if(gb) gb.disabled = false;
  try{ new Function('uiPadPrev = { left:true, right:true, up:true, down:true, a:true };')(); }catch(e){}   // the B / A that closed it must not press anything on the title
  const btn = document.getElementById('cosBtn'); if(btn){ const tmp = document.createElement('div'); tmp.innerHTML = COS.button(); btn.replaceWith(tmp.firstElementChild); document.getElementById('cosBtn').onclick = open; }
  const back = document.getElementById('cosBtn') || gb; if(back) try{ back.focus({ preventScroll:true }); }catch(e){}   // focus goes back to whatever opened the garage
  if(typeof COS.onClose === 'function'){ const f = COS.onClose; COS.onClose = null; try{ f(); }catch(e){ console.warn('cos onClose', e); } } }   // opened from the title's options menu: back to its CUSTOMISE row
COS.show = open; COS.hide = close;
COS.wire = () => { const b = document.getElementById('cosBtn'); if(b) b.onclick = open; };
})();
