/* Sundown UI: the Night Rider Journal (夜走手帖). A cloth-bound notebook laid over the frozen road: a hand-inked route atlas,
   an eki stamp book, rival files, the garage and an honest ledger. Rules taken from the references are in research/sundown-journal.md:
   - an object, not a screen (Pentiment's parchment cards, real eki stamp books): washi pages, a spine, page edges, a hard shadow;
   - one ink per mark, no gradients (eki stamps, Okami): stepped shading only;
   - a stamp is frame + giant glyph + pictogram (Tokyo / Nippori station stamps), pressed slightly crooked, with a separate red date chop;
   - the map serves the ride: Tokyo Bay gets an inset (拡大図) with 至 exit marks (Showa road atlases); vermilion roads and place cartouches on stems
     (Yoshida Hatsusaburo's bird's-eye maps);
   - the unknown is a shape, never a spoiler (Outer Wilds' rumour web): dotted forks to "?" cartouches, silhouettes and one hint line;
   - attitude in the frame and cursor (Persona 5): tilted black tab slabs, a red parallelogram cursor, kanji that slam; reading text stays calm;
   - motion on the music's grid (Hi-Fi Rush): every duration a multiple of a 16th at 126 BPM; reduced motion = 4-step crossfades only;
   - Showa magazine type (tategaki columns, katakana headers, halftone fields) and an honest ledger with no streaks.
   It only READS saved data (arcade.sundown, sundown.director, sundown.bike) and never writes game state.
   API: JOURNAL.show({ from:'title'|'pause', tab, back }), JOURNAL.hide(), JOURNAL.open, JOURNAL.model() (for tests). */
"use strict";
(() => {
const JN = window.JOURNAL = { open:false };
const BPM = 126, SIX = 60000 / BPM / 4;   // one 16th note, ms
const INK = '#1e1824', INK2 = '#6a5c66', PAPER = '#efe4cc', PAPER2 = '#e2d2b0', PAPER3 = '#d2bf98', SHU = '#d2302c', NIGHT = '#07060c', CREAM = '#f4ecdf';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const H32 = s => { let h = 2166136261 >>> 0; s = String(s); for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const hexA = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
const mix = (a, b, t) => { const p = hexA(a), q = hexA(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const RM = () => typeof reduce !== 'undefined' ? !!reduce : matchMedia('(prefers-reduced-motion: reduce)').matches;
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
const lands = () => typeof LANDS !== 'undefined' ? LANDS : [];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const dstr = t => { const d = new Date(t || 0); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
const dshort = t => { const d = new Date(t || 0); return String(d.getFullYear()).slice(2) + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0'); };

/* ================================================================== the 3x5 caps (the HUD's lettering), as crisp images */
const F3 = { '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111',
  '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', A:'010101111101101', B:'110101110101110', C:'011100100100011',
  D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111', J:'001001001101111', K:'101101110101101',
  L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', Q:'010101101111011', R:'110101110101101', S:'011100010001110',
  T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', Z:'111001010100111', '/':'001001010100100',
  '.':'000000000000010', ' ':'000000000000000', '-':'000000111000000', '+':'000010111010000', ':':'000010000010000', ',':'000000000010100', "'":'010010000000000', '!':'010010010000010',
  '?':'111001011000010', '#':'101111101111101', '(':'010100100100010', ')':'010001001001010', '%':'101001010100101', '·':'000000010000000' };
const T3C = new Map();
function t3c(s, col, sh){ s = String(s).toUpperCase(); const c = mkc(s.length * 4 + (sh ? 1 : 0), 5 + (sh ? 1 : 0)), g = c.getContext('2d');
  for(const [cc, o] of [[sh, 1], [col, 0]]){ if(!cc) continue; g.fillStyle = cc; [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(n * 4 + i % 3 + o, (i / 3 | 0) + o, 1, 1); }); }
  return c; }
// <img> of caps at k px per pixel, with screen-reader text
function caps(s, col, k, sh){ const key = s + '|' + col + '|' + (sh || ''); let u = T3C.get(key); if(!u){ const c = t3c(s, col || INK, sh); u = [c.toDataURL(), c.width, c.height]; T3C.set(key, u); }
  k = k || 2; return `<img class="j3" src="${u[0]}" width="${u[1] * k}" height="${u[2] * k}" alt="${esc(s)}">`; }

/* ================================================================== glyph masks in the game's pixel font (DotGothic16 at its 16 px design size) */
const GLC = new Map();
function glyph(str, size){ const key = str + size; if(GLC.has(key)) return GLC.get(key); const m = mkc(4, 4), k = m.getContext('2d'); k.font = size + 'px DotGothic16';
  const w = Math.max(1, Math.ceil(k.measureText(str).width)); m.width = w; m.height = size + 2; k.font = size + 'px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#fff'; k.fillText(str, 0, 0);
  const d = k.getImageData(0, 0, m.width, m.height).data, b = new Uint8Array(m.width * m.height); let x0 = m.width, x1 = -1, y0 = m.height, y1 = -1;
  for(let i = 0; i < b.length; i++) if(d[i * 4 + 3] > 110){ b[i] = 1; const x = i % m.width, y = (i / m.width) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const g = x1 < 0 ? { w:1, h:1, b:new Uint8Array(1) } : crop({ w:m.width, h:m.height, b }, x0, y0, x1 - x0 + 1, y1 - y0 + 1); GLC.set(key, g); return g; }
function crop(g, x0, y0, w, h){ const b = new Uint8Array(w * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) b[y * w + x] = g.b[(y + y0) * g.w + x + x0]; return { w, h, b }; }
const grid = rows => { const h = rows.length, w = Math.max(...rows.map(r => r.length)), b = new Uint8Array(w * h); rows.forEach((r, y) => [...r].forEach((ch, x) => { b[y * w + x] = ch === 'X' ? 1 : ch === 'o' ? 2 : 0; })); return { w, h, b }; };

/* ================================================================== roads, moments and gangs: the journal's own display data */
// map position (lon, lat), stamp ink (one real eki-stamp ink each), frame and pictogram, and the paper-safe road colour
const ROADX = {
  harbour:   { at:[139.76, 35.63], ink:'#c4283a', frame:'hex',    motif:'crane',    col:'#ff5a8a', place:'Shibaura' },
  bay:       { at:[139.66, 35.45], ink:'#2a4a9a', frame:'circle', motif:'bridge',   col:'#4ff0ff', place:'Yokohama' },
  neon:      { at:[139.70, 35.70], ink:'#6a2a8a', frame:'oct',    motif:'neon',     col:'#c77dff', place:'Shinjuku' },
  tunnels:   { at:[138.85, 35.62], ink:'#7a3a1e', frame:'arch',   motif:'tunnel',   col:'#ffb347', place:'Sasago' },
  pass:      { at:[139.55, 36.74], ink:'#1f6a4a', frame:'shield', motif:'pass',     col:'#7aff9a', place:'Irohazaka' },
  refinery:  { at:[140.06, 35.52], ink:'#8a4a12', frame:'square', motif:'refinery', col:'#ffd04a', place:'Keiyo' },
  coast:     { at:[139.45, 35.31], ink:'#1a5a7a', frame:'circle', motif:'coast',    col:'#5affd8', place:'Shonan' },
  snow:      { at:[140.53, 38.57], ink:'#2a4a9a', frame:'hex',    motif:'onsen',    col:'#9ab8ff', place:'Ginzan' },
  paddies:   { at:[139.05, 37.75], ink:'#3a6a1a', frame:'square', motif:'paddy',    col:'#d8ff5a', place:'Niigata' },
  aqua:      { at:[139.86, 35.46], ink:'#1a5a8a', frame:'oct',    motif:'aqua',     col:'#3ab8ff', place:'Umihotaru' },
  shimanami: { at:[133.10, 34.25], ink:'#3a3a8a', frame:'shield', motif:'islands',  col:'#8aa8ff', place:'Onomichi' },
  sakurajima:{ at:[130.66, 31.59], ink:'#b02a1a', frame:'hex',    motif:'volcano',  col:'#ff7a3a', place:'Kagoshima' },
  haneda:    { at:[139.79, 35.55], ink:'#4a2a7a', frame:'arch',   motif:'plane',    col:'#b8c0ff', place:'Ota' },
  minato:    { at:[139.63, 35.455], ink:'#a0206a', frame:'circle', motif:'wheel',    col:'#ff8ad8', place:'Minato Mirai' },
  shuto:     { at:[139.765, 35.68], ink:'#1a6a3a', frame:'hex',    motif:'neon',     col:'#3ad67a', place:'Kyobashi' },
  kurobe:    { at:[137.662, 36.566], ink:'#1a4a6a', frame:'circle', motif:'wave',     col:'#9ae0ff', place:'Kurobe' },
  akiba:     { at:[139.771, 35.698], ink:'#8a6a0a', frame:'square', motif:'neon',     col:'#ffd23a', place:'Akihabara' },
  gion:      { at:[135.778, 35.004], ink:'#a8381a', frame:'arch',   motif:'pass',     col:'#ff9a4a', place:'Gion' } };
const RX = L => ROADX[L.key] || { at:[139.7, 35.6], ink:'#3a3a5a', frame:'circle', motif:'dot', col:'#f4ecdf', place:'' };
// moments: ids are the director's (setpiece/README.md); tier from its catalogue; hint = one line, no spoilers
const MOMENTS = [
  { id:'kaiju',          kj:'獣', kanji:'怪獣',     name:'Kaiju',            motif:'kaiju',   ink:'#b8202e', road:'bay',        hint:'Something enormous stirs out in the bay.' },
  { id:'typhoon',        kj:'嵐', kanji:'台風',     name:'Typhoon',          motif:'typhoon', ink:'#1a4a8a', road:'coast',      hint:'Some nights the coast road gets a storm warning.' },
  { id:'hanabi',         kj:'花', kanji:'花火',     name:'Hanabi',           motif:'hanabi',  ink:'#a0206a', road:'paddies',    hint:'Look up over the fields, or over the sea.' },
  { id:'matsuri',        kj:'祭', kanji:'祭',       name:'Matsuri',          motif:'lantern', ink:'#c4283a', road:'neon',       hint:'Drums, somewhere in the neon.' },
  { id:'shinkansen',     kj:'新', kanji:'新幹線',   name:'Shinkansen race',  motif:'train',   ink:'#1a4a8a', road:'paddies',    hint:'Something fast runs beside the rice fields.' },
  { id:'fuji',           kj:'富', kanji:'富士',     name:'Fuji at dawn',     motif:'fuji',    ink:'#3a3a8a', road:'coast',      hint:'Ride on toward morning, and look west.' },
  { id:'jets',           kj:'機', kanji:'旅客機',   name:'Low jets',         motif:'jet',     ink:'#4a2a7a', road:'haneda',     hint:'At the airport, keep your eyes up.', mod:'sp_jump' },
  { id:'greatwave',      kj:'波', kanji:'大波',     name:'The great wave',   motif:'wave',    ink:'#1a5a7a', road:'coast',      hint:'The sea road, on a rough night.', mod:'sp_wave' },
  { id:'jump:harbour',   kj:'跳', kanji:'跳開橋',   name:'Drawbridge',       motif:'jump',    ink:'#7a3a1e', road:'harbour',    hint:'A bridge on the harbour line opens for ships.', mod:'sp_jump' },
  { id:'jump:tunnels',   kj:'首', kanji:'首都高越え', name:'Interchange jump', motif:'jump',  ink:'#7a3a1e', road:'tunnels',    hint:'Between two tunnels, the road leaves the ground.', mod:'sp_jump' },
  { id:'jump:pass',      kj:'谷', kanji:'谷越え',   name:'Ravine jump',      motif:'jump',    ink:'#1f6a4a', road:'pass',       hint:'The mountain road has a gap in it.', mod:'sp_jump' },
  { id:'jump:refinery',  kj:'管', kanji:'配管越え', name:'Pipeline jump',    motif:'jump',    ink:'#8a4a12', road:'refinery',   hint:'Over the pipes, if you dare.', mod:'sp_jump' },
  { id:'jump:snow',      kj:'飛', kanji:'ジャンプ台', name:'Ski jump',       motif:'jump',    ink:'#2a4a9a', road:'snow',       hint:'The onsen town has a slope built for flying.', mod:'sp_jump' },
  { id:'jump:paddies',   kj:'線', kanji:'線路越え', name:'Railway jump',     motif:'jump',    ink:'#3a6a1a', road:'paddies',    hint:'A ramp over the tracks.', mod:'sp_jump' },
  { id:'jump:sakurajima',kj:'溶', kanji:'溶岩越え', name:'Lava leap',        motif:'jump',    ink:'#b02a1a', road:'sakurajima', hint:'Where the lava crosses the road.', mod:'sp_jump' },
  { id:'jump:haneda',    kj:'滑', kanji:'誘導路越え', name:'Taxiway jump',   motif:'jump',    ink:'#4a2a7a', road:'haneda',     hint:'Across a taxiway, between the planes.', mod:'sp_jump' },
  { id:'screenfall',     kj:'映', kanji:'大画面',   name:'Screenfall',       motif:'neon',    ink:'#1a6a3a', road:'shuto',      hint:'High over the inner loop, the late news is on.', mod:'sp_screen' } ];
// moments the director catalogues for later waves: they appear only once the game registers them (or you have seen them)
const LATER = { fireball:['火', '火球', 'Fireball', 'burst'], avalanche:['崩', '雪崩', 'Avalanche', 'fuji'], jetwash:['噴', '噴流', 'Jet wash', 'jet'], rockslide:['石', '落石', 'Rockslide', 'pass'],
  cavein:['落', '崩落', 'Cave-in', 'tunnel'], screen:['映', '大画面', 'The big screen', 'neon'], lava:['溶', '溶岩', 'Lava', 'volcano'], naruto:['渦', '渦潮', 'Whirlpools', 'typhoon'],
  flood:['洪', '洪水', 'Flood', 'wave'], boss:['総', '総長', 'The boss', 'kaiju'], heli:['空', 'ヘリ', 'Helicopter', 'jet'], farjets:['遠', '遠い機影', 'Far jets', 'jet'], wheel:['輪', '観覧車', 'Runaway wheel', 'wheel'], kanpo:['放', '観光放水', 'The gates open', 'wave'], teiden:['停', '停電', 'The blackout', 'neon'], yoiyama:['宵', '宵山', 'The festival float', 'pass'] };
// the three gangs of mech/gang.js (names, kanji and colour ramps copied from there; no real gang names or crests)
const GANGS = [
  { key:'guren',  name:'GUREN',  kanji:'紅蓮', read:'Crimson lotus', col:['#ffb0b4', '#ff5a6a', '#d81e3a', '#8a0c26', '#3a0614'] },
  { key:'shiden', name:'SHIDEN', kanji:'紫電', read:'Purple lightning', col:['#e6c8ff', '#b07aff', '#7a3ae0', '#44188a', '#1e0a40'] },
  { key:'hakuro', name:'HAKURO', kanji:'白狼', read:'White wolf', col:['#c8f0ff', '#6ac8ff', '#2a7ae0', '#14408a', '#081c40'] } ];
const TABS = [
  { id:'atlas',   kj:'地図', en:'ATLAS',   kana:'ルート・アトラス', tate:'夜走全図　走った道の地図' },
  { id:'stamps',  kj:'印',   en:'STAMPS',  kana:'スタンプ帳',       tate:'駅印帳　道と見物の印' },
  { id:'rivals',  kj:'敵',   en:'RIVALS',  kana:'ライバル・ファイル', tate:'好敵手名簿　勝負の記録' },
  { id:'garage',  kj:'車庫', en:'GARAGE',  kana:'ガレージ',         tate:'愛車　単車の車庫' },
  { id:'records', kj:'記録', en:'RECORDS', kana:'レコード',         tate:'夜の記録　嘘のない数字' } ];
const KANJI_ALL = '夜走手帖全図走った道の地図駅印帳と見物好敵手名簿勝負記録愛車単車庫嘘のない数字縮尺不定凡例未発見近日特攻服塗装兜警笛排気今乗車敗星取表遭遇明御用総距離最長高撃墜着跳躍紙一重加速関門検問突破転倒新幹線戻る其一二三四五章'
  + 'ルートアトラススタンプ帳ライバルファイルガレージレコードフロー' + MOMENTS.map(m => m.kj + m.kanji).join('') + Object.values(LATER).map(v => v[0] + v[1]).join('') + GANGS.map(g => g.kanji).join('') + '港橋街隧峠油湘雪田海島灰空稀常名所？';

/* ================================================================== reading the save (copies only; nothing is written back) */
function readJSON(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } }
function model(){
  // routes are read from the saved history only: rides start on varied roads and forks offer roads chosen on the night, so no tree is assumed
  const LS = lands(), N = LS.length, okI = x => Number.isInteger(x) && x >= 0 && x < N;
  let recs = readJSON('arcade.sundown', []); if(!Array.isArray(recs)) recs = [];
  recs = recs.filter(r => r && typeof r === 'object').map((r, i) => ({ r, i })).sort((a, b) => (a.r.t || 0) - (b.r.t || 0) || a.i - b.i).map(x => x.r);
  let dir = readJSON('sundown.director', null); if(!dir || typeof dir !== 'object' || typeof dir.m !== 'object' || !dir.m) dir = { v:1, ride:0, m:{} };
  const keyIdx = {}; LS.forEach((L, i) => { keyIdx[L.key] = i; });
  const roads = LS.map((L, i) => ({ i, L, x:RX(L), nights:0, first:null, firstN:0, last:null, bestKm:0, bestNight:0, bestNightRec:null, roadKmKnown:false }));
  const edges = new Map(), seen = new Map(), starts = new Map();
  const nights = recs.map((r, n) => {
    let route = Array.isArray(r.route) ? r.route.filter(okI) : [];
    if(!route.length){ const li = LS.findIndex(l => l.name === r.land); if(li >= 0) route = [li]; }
    starts.set(route[0], (starts.get(route[0]) || 0) + 1);
    for(const i of new Set(route)){ const R = roads[i]; R.nights++; if(!R.first){ R.first = r; R.firstN = n + 1; } R.last = r;
      if((r.km || 0) > R.bestNight){ R.bestNight = r.km || 0; R.bestNightRec = r; }
      const rk = r.roadKm && +r.roadKm[R.L.key]; if(rk > 0){ R.roadKmKnown = true; R.bestKm = Math.max(R.bestKm, rk); } }
    const picks = Array.isArray(r.picks) ? r.picks : [];
    for(let k = 1; k < route.length; k++){ const id = route[k - 1] + '>' + route[k], e = edges.get(id) || { a:route[k - 1], b:route[k], n:0, side:picks[k] === 'L' || picks[k] === 'R' ? picks[k] : '' }; e.n++; edges.set(id, e); }
    // forks offered but not taken: only when the night saved the offered pair (rec.forks[z] = [left, right] at the fork before zone z + 1)
    if(Array.isArray(r.forks)) r.forks.forEach((f, z) => { if(!Array.isArray(f) || z + 1 >= route.length + 1) return; const a = route[z]; if(!okI(a)) return;
      f.forEach((b, side) => { if(!okI(b) || b === route[z + 1] || b === a) return; const id = a + '>' + b; if(!seen.has(id)) seen.set(id, { a, b, side:side ? 'R' : 'L', t:r.t }); }); });
    return { r, n:n + 1, route }; });
  // stamps: one per road, one per moment the game has (or the rider has seen)
  const firstRec = id => { for(const nt of nights) if(Array.isArray(nt.r.moments) && nt.r.moments.includes(id)) return nt; return null; };
  const live = (MECH && MECH.director && MECH.director.gov && MECH.director.gov.live) || {};
  const momentList = MOMENTS.filter(m => dir.m[m.id] || firstRec(m.id) || live[m.id] || (m.mod ? !!(window.MECH && MECH[m.mod]) : !!(window.MECH && MECH.director)));
  for(const id of Object.keys(LATER).concat(Object.keys(dir.m))) if(!momentList.some(m => m.id === id) && (live[id] || dir.m[id] || firstRec(id))){
    const v = LATER[id] || LATER[String(id).split(':')[0]]; const jr = String(id).startsWith('jump:') ? LS[keyIdx[id.slice(5)]] : null;
    momentList.push(v ? { id, kj:v[0], kanji:v[1], name:v[2], motif:v[3], ink:'#3a3a8a', hint:'A rare sight. Keep riding.' }
      : { id, kj:jr ? '跳' : '見', kanji:jr ? '跳' : '見', name:jr ? jr.name + ' jump' : id, motif:jr ? 'jump' : 'burst', ink:'#3a3a5a', road:jr && jr.key, hint:'Keep riding.' }); }
  const cat = (MECH && MECH.director && MECH.director.CATALOGUE) || {};
  const stamps = { roads:roads.map(R => ({ kind:'road', id:R.L.key, R, kj:R.L.kanji, name:R.L.name, ink:R.x.ink, frame:R.x.frame, motif:R.x.motif,
      got:R.nights > 0, t:R.first && R.first.t, night:R.firstN, n:R.nights })),
    sights:momentList.map(m => { const h = dir.m[m.id], fr = firstRec(m.id), tier = (cat[m.id] || cat[String(m.id).split(':')[0]] || {}).tier || (String(m.id).startsWith('jump:') ? 'landmark' : 'hero');
      const got = !!((h && h.r) || fr); let t = null, night = 0, ride = 0, exact = false;
      if(fr){ t = fr.r.t; night = fr.n; exact = true; } else if(h){ t = h.t; ride = h.f || h.r || 0; exact = (h.n || 0) <= 1; }
      return { kind:'sight', id:m.id, m, kj:m.kj, name:m.name, ink:m.ink, frame:tier === 'hero' ? 'ring' : tier === 'ambient' ? 'square' : 'oct', tier, motif:m.motif,
        got, t, night, ride, exact, n:h ? h.n || 1 : fr ? nights.filter(nt => Array.isArray(nt.r.moments) && nt.r.moments.includes(m.id)).length : 0 }; }) };
  // rivals: per-gang files when gang.js records rec.rivals; older nights only have totals
  const gangs = GANGS.map((g, gi) => ({ g, gi, met:0, won:0, lost:0, td:0, first:null, firstN:0, last:null, roads:{}, seq:[], list:[] }));
  let legacy = { duels:0, won:0, td:0, nights:0 };
  nights.forEach(nt => { const r = nt.r;
    if(Array.isArray(r.rivals)){ for(const e of r.rivals){ const G = gangs.find(x => x.g.key === (e && e.g)); if(!G) continue;
        if(e.duel !== false){ G.met++; if(e.won) G.won++; else G.lost++; G.seq.push(e.won ? 1 : 0); G.list.push({ won:!!e.won, road:e.road, t:r.t, n:nt.n }); } G.td += +e.td || 0;
        if(!G.first){ G.first = r; G.firstN = nt.n; } G.last = r; const rd = e.road || ''; G.roads[rd] = (G.roads[rd] || 0) + 1; } }
    else if((r.duels || 0) + (r.takedowns || 0) > 0){ legacy.duels += r.duels || 0; legacy.won += r.duelsWon || 0; legacy.td += r.takedowns || 0; legacy.nights++; } });
  // records: plain sums over every kept night
  const sum = k => recs.reduce((a, r) => a + (+r[k] || 0), 0), max = k => recs.reduce((a, r) => Math.max(a, +r[k] || 0), 0);
  const best = recs.reduce((a, r) => !a || (r.km || 0) > (a.km || 0) ? r : a, null);
  const rec = { nights:recs.length, dawns:recs.filter(r => r.end !== 'caught').length, caught:recs.filter(r => r.end === 'caught').length, km:sum('km'), best, flow:max('bestFlow'),
    takedowns:sum('takedowns'), clean:sum('cleanLandings'), jumps:sum('jumps') + sum('landmarkJumps'), duels:sum('duels'), duelsWon:sum('duelsWon'), close:sum('closeCalls'),
    bigBoosts:sum('bigBoosts'), gates:sum('gates'), roadblocks:sum('roadblocks'), crashes:sum('crashes'), shinkansen:sum('shinkansen'), first:recs[0], lastRec:recs[recs.length - 1] };
  const bikeNights = {}; recs.forEach(r => { if(r.bike) bikeNights[r.bike] = (bikeNights[r.bike] || 0) + 1; });
  const riding = String(readJSON('sundown.bike', 'sport'));
  // sundown.routes (the last 10 rides' road lists) fills in links from nights no longer in the arcade list
  const hist = readJSON('sundown.routes', []); if(Array.isArray(hist)) for(const h of hist){ if(!Array.isArray(h)) continue; const rt = h.filter(okI);
    for(let k = 1; k < rt.length; k++){ const id = rt[k - 1] + '>' + rt[k]; if(!edges.has(id)) edges.set(id, { a:rt[k - 1], b:rt[k], n:1, side:'', histOnly:true }); } }
  for(const R of roads) if(!R.nights && [...edges.values()].some(e => e.histOnly && (e.a === R.i || e.b === R.i))) R.histOnly = true;
  const out = i => [...edges.values()].filter(e => e.a === i), offered = i => [...seen.values()].filter(e => e.a === i && !edges.has(e.a + '>' + e.b));
  return { recs, nights, dir, roads, edges, seen, starts, stamps, gangs, legacy, rec, bikeNights, riding, out, offered, N };
}
JN.model = model;

/* ================================================================== pictograms (pixel grids; X ink, o light ink) */
const MOTIF = {
  crane:['XXXXXXXXXXX...', 'X.X......XoX..', 'X..X.....X.oX.', 'X...X....X..o.', 'X....X...X..X.', 'X.....X.XXX.X.', '.XXXXXXXXXXXXX', '..XXXXXXXXXXX.'],
  bridge:['...X......X...', '..X.X....X.X..', '.X..oX..Xo..X.', 'X..o..XX..o..X', 'XXXXXXXXXXXXXX', '...X......X...', 'o.o.o.o.o.o.o.'],
  neon:['....XX........', '....XX...XXX..', '.XX.XX...XoX..', '.XX.XX.X.XXX..', '.XX.XXXXX.X.XX', 'XXXXXXXXXXXXXX'],
  tunnel:['....XXXXXX....', '..XX......XX..', '.X..XXXXXX..X.', 'X..X......X..X', 'X.X...oo...X.X', 'X.X..o..o..X.X', 'XXX.o....o.XXX'],
  pass:['......X.......', '.....XoX......', '....X.ooX.....', '...X.o...X....', '..X...oo..X...', '.X.....o...X..', 'XXXXXXXXXXXXXX'],
  refinery:['..........X...', '.........XoX..', '..........X...', '..XXXX....X...', '.X....X...X...', '.XXXXXX..XXX..', '.X....X..XXX..', 'XXXXXXXXXXXXXX'],
  coast:['...........X..', '..XXX.....XXX.', '.X...X...XXXXX', 'X..X..X....X..', '..X....XX..X..', 'XXXXXXXXXXXXXX'],
  onsen:['..X...X...X..', '.X...X...X...', '..X...X...X..', '.X...X...X...', '.............', 'X...........X', '.XXXXXXXXXXX.'],
  paddy:['..........XX..', '.........X....', '..........XX..', 'XXXXXXXXXXXXXX', 'X.o.X.o.oX.o.X', 'XXXXXXXXXXXXXX', 'X.o.oX.o.X.o.X', 'XXXXXXXXXXXXXX'],
  aqua:['XXXXXXX.......', '......XX......', 'oooooooXoooooo', 'o.o.o.o.XXXXXX', '.o.o.o.oX....X', 'o.o.o.o.XXXXXX'],
  islands:['..X.......X...', '.X.X.....X.X..', 'XXXXXXXXXXXXXX', '..X.......X...', '.XXX.....XXX..', 'XXXXXo.oXXXXX.'],
  volcano:['......oo......', '.....o..o.....', '......oo......', '.....XXXX.....', '....X.oo.X....', '..XX......XX..', 'XX..........XX', 'XXXXXXXXXXXXXX'],
  plane:['......XX......', '......XX......', 'XXXXXXXXXXXXXX', '.XXXXXXXXXXXX.', '......XX......', '......XX......', '....XXXXXX....'],
  kaiju:['..X.X.X.......', '.XXXXXXX......', 'XXXXXXXXXX....', 'XX.XXXXXXXXX..', 'XXXXXXXXX.XXX.', 'XXXXXX...XXX..', 'XXXXX.X.X.....'],
  typhoon:['...XXXXX......', '.XX.....XX....', 'X...XXX...X...', 'X..X...X..X...', 'X..X..XX..X...', '.X..XX...X....', '..XX...XX.....', '....XXX.......'],
  hanabi:['......X.......', '..X...X...X...', '...X..o..X....', '....X...X.....', 'XXo...X...oXX.', '....X...X.....', '...X..o..X....', '..X...X...X...', '......X.......'],
  lantern:['.....XXX......', '...XXXXXXX....', '..X.......X...', '..XXXXXXXXX...', '..X..ooo..X...', '..XXXXXXXXX...', '...XXXXXXX....', '.....XXX......'],
  train:['........XXXXXX', '.....XXX.o.o.o', '...XX.........', '.XX...........', 'XXXXXXXXXXXXXX', '.o..o.....o..o'],
  fuji:['XX............', 'XX....XXX.....', '.....X.o.X....', '....X.o.o.X...', '...X.......X..', '..X.........X.', 'XXXXXXXXXXXXXX'],
  jet:['.....X........', '....XXX.......', 'XXXXXXXXXXX...', '.XX.XXX..ooooo', '....XXX.......', '...XXXXX......'],
  wave:['....XXXXX.....', '..XX.....XX...', '.X...XXX..oX..', 'X...X...X.o...', 'X..X.....o....', 'XXXXXXXXXXXXXX'],
  jump:['....oo.oo.....', '..o.......o...', '.o.........o..', 'XX..........XX', 'XXX........XXX', 'XXXX......XXXX'],
  burst:['......X.......', '...X..X..X....', '....X.X.X.....', '.XXXXXXXXXXX..', '....X.X.X.....', '...X..X..X....', '......X.......'],
  wheel:['.....XXXX.....', '...XX.oo.XX...', '..X..o..o..X..', '..X.o.XX.o.X..', '..X..o..o..X..', '...XX.oo.XX...', '....X.XX.X....', '...X..XX..X...'],
  dot:['..XX..', '.XXXX.', '..XX..'] };
const MG = {}; const motif = k => MG[k] || (MG[k] = grid(MOTIF[k] || MOTIF.dot));

/* ================================================================== stamps: frame + giant glyph + pictogram, pressed crooked in one ink */
const SS = 40;
function frameInside(kind, x, y, inset){ const c = (SS - 1) / 2, dx = x - c, dy = y - c;
  if(kind === 'circle' || kind === 'ring') return Math.hypot(dx, dy) <= c + .3 - inset;
  const P = { hex:[[c, 0], [SS - 1, 9], [SS - 1, SS - 10], [c, SS - 1], [0, SS - 10], [0, 9]], oct:[[11, 0], [SS - 12, 0], [SS - 1, 11], [SS - 1, SS - 12], [SS - 12, SS - 1], [11, SS - 1], [0, SS - 12], [0, 11]],
    square:[[3, 0], [SS - 4, 0], [SS - 1, 3], [SS - 1, SS - 4], [SS - 4, SS - 1], [3, SS - 1], [0, SS - 4], [0, 3]], shield:[[0, 0], [SS - 1, 0], [SS - 1, 24], [c, SS - 1], [0, 24]],
    arch:[[0, 12], [6, 3], [14, 0], [SS - 15, 0], [SS - 7, 3], [SS - 1, 12], [SS - 1, SS - 1], [0, SS - 1]] }[kind] || [[0, 0], [SS - 1, 0], [SS - 1, SS - 1], [0, SS - 1]];
  for(let i = 0; i < P.length; i++){ const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey), d = ((x - a[0]) * ey - (y - a[1]) * ex) / L;   // clockwise: inside is d <= 0
    if(-d < inset - .45) return false; }
  return true; }
function stampGrid(s, ghost){ const g = { w:SS, h:SS, b:new Uint8Array(SS * SS) }, put = (x, y, v) => { if(x >= 0 && y >= 0 && x < SS && y < SS) g.b[y * SS + x] = v; };
  const fr = s.frame, dbl = fr === 'ring';
  for(let y = 0; y < SS; y++) for(let x = 0; x < SS; x++){ const o = frameInside(fr, x, y, 0) && !frameInside(fr, x, y, 2), i2 = dbl && frameInside(fr, x, y, 4) && !frameInside(fr, x, y, 5); if(o || i2) put(x, y, 1); }
  const gl = glyph(s.kj, 16), m = motif(s.motif), gy = 6 + (16 - Math.min(16, gl.h) >> 1), my = Math.min(SS - 4 - m.h, gy + Math.max(gl.h, 13) + 2);
  for(let y = 0; y < gl.h; y++) for(let x = 0; x < gl.w; x++) if(gl.b[y * gl.w + x]) put(((SS - gl.w) >> 1) + x, gy + y, 1);
  for(let y = 0; y < m.h; y++) for(let x = 0; x < m.w; x++){ const v = m.b[y * m.w + x]; if(v) put(((SS - m.w) >> 1) + x, my + y, ghost ? 4 : v); }
  if(fr === 'shield') for(let x = 6; x < SS - 6; x += 2) put(x, 4, 2);   // a stitched band under the shield's top edge
  return g; }
// nearest-neighbour rotation of a bit grid (keeps hard pixels)
function rotGrid(g, deg){ const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), W2 = Math.ceil(Math.abs(g.w * c) + Math.abs(g.h * s)) + 2, H2 = Math.ceil(Math.abs(g.w * s) + Math.abs(g.h * c)) + 2, b = new Uint8Array(W2 * H2);
  for(let y = 0; y < H2; y++) for(let x = 0; x < W2; x++){ const dx = x - W2 / 2 + .5, dy = y - H2 / 2 + .5, sx = Math.floor(dx * c + dy * s + g.w / 2), sy = Math.floor(-dx * s + dy * c + g.h / 2);
    if(sx >= 0 && sy >= 0 && sx < g.w && sy < g.h) b[y * W2 + x] = g.b[sy * g.w + sx]; }
  return { w:W2, h:H2, b }; }
// ink a grid: thinning toward one edge (uneven pressure), starved pixels in the light ink, a few dropped entirely
function inkGrid(g, ink, seed, faint){ const c = mkc(g.w, g.h), k = c.getContext('2d'), id = k.createImageData(g.w, g.h), d = id.data, A = hexA(ink), B = hexA(mix(ink, PAPER, .45)), Fd = hexA(PAPER3);
  const ang = H32(seed + 'p') * 6.283, gx = Math.cos(ang), gy = Math.sin(ang);
  for(let i = 0; i < g.w * g.h; i++){ const v = g.b[i]; if(!v) continue; const x = i % g.w, y = (i / g.w) | 0;
    let col; if(faint){ if(v === 1 && ((x + y) >> 1) % 2) continue; col = v === 4 ? hexA(PAPER2) : Fd; }
    else { const t = cl(((x - g.w / 2) * gx + (y - g.h / 2) * gy) / g.w + .5, 0, 1), h = H32(seed + ':' + i), drop = .02 + .14 * t * t;
      if(h < drop) continue; col = v === 2 || h < drop + .08 + .16 * t ? B : A; }
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; }
  k.putImageData(id, 0, 0); return c; }
const STC = new Map();
function stampCanvas(s){ const key = s.id + (s.got ? 'G' : 'U'); if(STC.has(key)) return STC.get(key);
  let c; if(s.got){ const rot = (H32(s.id + 'r') - .5) * 13; c = inkGrid(rotGrid(stampGrid(s), rot), s.ink, s.id, null); }
  else { const g = stampGrid(Object.assign({}, s, { kj:' ' }), true); c = inkGrid(rotGrid(g, 0), PAPER3, s.id, 'frame'); }
  STC.set(key, c); return c; }
// the red date chop: a small boxed date and night number, pressed at its own angle
function dateChop(t, label, seed){ const a = t3c(dshort(t), SHU), b = t3c(label, SHU), w = Math.max(a.width, b.width) + 6, h = 17, g = { w, h, b:new Uint8Array(w * h) };
  for(let x = 0; x < w; x++){ g.b[x] = 1; g.b[(h - 1) * w + x] = 1; } for(let y = 0; y < h; y++){ g.b[y * w] = 1; g.b[y * w + w - 1] = 1; } for(let x = 2; x < w - 2; x++) g.b[8 * w + x] = 2;
  const blit = (c, ox, oy) => { const dd = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++) if(dd[(y * c.width + x) * 4 + 3] > 0) g.b[(y + oy) * w + x + ox] = 1; };
  blit(a, (w - a.width + 1) >> 1, 2); blit(b, (w - b.width + 1) >> 1, 10);
  return inkGrid(rotGrid(g, (H32(seed + 'd') - .5) * 9), SHU, seed + 'd', null); }

/* ================================================================== the atlas: Japan at its true shape, Tokyo Bay in an inset (Showa atlases), Hatsusaburo's cartouches and red roads */
const HONSHU = [[139.77, 35.65], [139.83, 35.64], [139.9, 35.645], [139.98, 35.69], [140.1, 35.6], [140.08, 35.52], [139.98, 35.45], [139.92, 35.39], [139.86, 35.36], [139.79, 35.31], [139.82, 35.2], [139.83, 34.98], [139.87, 34.9], [140.1, 35.1], [140.3, 35.15], [140.42, 35.3],
  [140.45, 35.5], [140.86, 35.72], [140.65, 35.95], [140.65, 36.6], [140.95, 37.0], [140.95, 37.8], [141.0, 38.25], [141.5, 38.3], [141.6, 38.9], [141.97, 39.64], [141.5, 40.5], [141.45, 41.43],
  [140.9, 41.53], [140.8, 41.15], [141.15, 41.1], [141.15, 40.88], [140.75, 40.85], [140.6, 41.05], [140.35, 41.25], [140.2, 40.78], [139.95, 40.55], [139.7, 39.95], [140.05, 39.72], [139.83, 38.92],
  [139.4, 38.4], [139.05, 37.92], [138.55, 37.37], [138.25, 37.17], [137.85, 37.04], [137.2, 36.76], [136.98, 36.87], [137.33, 37.5], [136.9, 37.4], [136.75, 37.1], [136.62, 36.6], [136.1, 36.22],
  [136.05, 35.66], [135.75, 35.5], [135.35, 35.5], [135.1, 35.75], [134.23, 35.54], [133.33, 35.45], [133.05, 35.58], [132.65, 35.4], [132.08, 34.9], [131.4, 34.42], [130.92, 33.96], [131.25, 33.95],
  [131.57, 34.04], [132.22, 34.15], [132.45, 34.35], [132.55, 34.22], [133.2, 34.4], [133.38, 34.45], [133.92, 34.6], [134.4, 34.75], [134.68, 34.78], [135.18, 34.68], [135.43, 34.65], [135.42, 34.55],
  [135.15, 34.22], [135.35, 33.68], [135.77, 33.44], [135.95, 33.63], [136.2, 34.06], [136.88, 34.3], [136.72, 34.5], [136.52, 34.72], [136.63, 34.97], [136.88, 35.05], [136.85, 34.7], [136.98, 34.88],
  [137.0, 34.58], [137.7, 34.66], [138.22, 34.6], [138.4, 34.97], [138.85, 35.08], [138.77, 34.97], [138.77, 34.75], [138.85, 34.6], [138.95, 34.67], [139.1, 34.97], [139.08, 35.1], [139.17, 35.25],
  [139.32, 35.3], [139.4, 35.32], [139.48, 35.3], [139.55, 35.31], [139.58, 35.27], [139.6, 35.2], [139.62, 35.13], [139.68, 35.2], [139.74, 35.26], [139.67, 35.29], [139.63, 35.34], [139.65, 35.45], [139.69, 35.47], [139.73, 35.52], [139.79, 35.55], [139.76, 35.6]];
const KYUSHU = [[130.95, 33.95], [130.8, 33.9], [130.4, 33.6], [130.15, 33.55], [129.97, 33.45], [129.55, 33.37], [129.7, 33.17], [129.85, 32.75], [129.75, 32.58], [130.35, 32.78], [130.65, 32.8],
  [130.6, 32.5], [130.4, 32.2], [130.2, 32.0], [130.27, 31.7], [130.22, 31.27], [130.53, 31.18], [130.65, 31.25], [130.56, 31.6], [130.67, 31.73], [130.75, 31.73], [130.7, 31.5], [130.66, 31.0],
  [131.08, 31.27], [131.1, 31.47], [131.45, 31.92], [131.63, 32.42], [131.7, 32.6], [131.95, 32.95], [131.6, 33.25], [131.75, 33.58], [131.2, 33.6]];
const SHIKOKU = [[134.6, 34.22], [134.05, 34.35], [133.85, 34.32], [133.28, 33.97], [133.0, 34.08], [132.72, 33.85], [132.0, 33.38], [132.55, 33.22], [132.72, 32.92], [133.02, 32.72], [133.28, 33.38],
  [133.55, 33.5], [134.17, 33.25], [134.7, 33.9], [134.6, 34.07]];
const HOKKAIDO = [[140.73, 41.77], [141.17, 41.8], [140.58, 42.1], [140.37, 42.5], [140.95, 42.32], [141.6, 42.63], [142.77, 42.17], [143.25, 41.93], [143.33, 42.28], [144.38, 42.98], [145.58, 43.33],
  [145.2, 43.6], [145.32, 44.35], [144.27, 44.02], [143.35, 44.35], [142.6, 44.93], [141.68, 45.42], [141.65, 43.95], [141.3, 43.25], [141.0, 43.2], [140.4, 43.37], [140.22, 42.8], [140.12, 41.87],
  [140.1, 41.42], [140.5, 41.6]];
const SADO = [[138.25, 38.33], [138.52, 38.3], [138.5, 38.05], [138.25, 37.82], [138.2, 38.05]], AWAJI = [[134.95, 34.6], [135.02, 34.45], [134.8, 34.22], [134.72, 34.35]];
const ISLES = [HONSHU, KYUSHU, SHIKOKU, HOKKAIDO, SADO, AWAJI], COSL = Math.cos(35.5 * Math.PI / 180);
// the whole country, and the Tokyo Bay inset (拡大図): Showa road atlases enlarge the city in an inset and mark the exits 至 (to ...)
const JAPAN = { lon0:129.4, lon1:145.9, lat0:30.9, lat1:45.6 }, BAY = { lon0:139.38, lon1:140.14, lat0:35.24, lat1:35.8 };
const inBay = at => at[0] >= BAY.lon0 && at[0] <= BAY.lon1 && at[1] >= BAY.lat0 && at[1] <= BAY.lat1;
// a linear projection of a lon/lat box into w x h low-res px, aspect kept
function proj(box, w, h, m){ const W0 = (box.lon1 - box.lon0) * COSL, H0 = box.lat1 - box.lat0, s = Math.min((w - 2 * m) / W0, (h - 2 * m) / H0), ox = m + ((w - 2 * m) - W0 * s) / 2, oy = m + ((h - 2 * m) - H0 * s) / 2;
  const f = (lon, lat) => [Math.round(ox + (lon - box.lon0) * COSL * s), Math.round(oy + (box.lat1 - lat) * s)]; f.s = s; return f; }
// land and sea in hard pixels: a thresholded land mask, an ink coast, a pale shore band and woodblock wave dashes
function paintLand(k, w, h, P, wave){ const mc = mkc(w, h), mk = mc.getContext('2d'); mk.fillStyle = '#fff';
  for(const poly of ISLES){ mk.beginPath(); poly.forEach(([lo, la], i) => { const [X, Y] = P(lo, la); if(i) mk.lineTo(X + .5, Y + .5); else mk.moveTo(X + .5, Y + .5); }); mk.closePath(); mk.fill(); }
  const md = mk.getImageData(0, 0, w, h).data, land = new Uint8Array(w * h); for(let i = 0; i < w * h; i++) land[i] = md[i * 4 + 3] > 120 ? 1 : 0;
  const L = (x, y) => x >= 0 && y >= 0 && x < w && y < h && land[y * w + x];
  const id = k.getImageData(0, 0, w, h), d = id.data, put = (i, col) => { const a = hexA(col); d[i * 4] = a[0]; d[i * 4 + 1] = a[1]; d[i * 4 + 2] = a[2]; d[i * 4 + 3] = 255; };
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * w + x;
    if(land[i]){ if(!L(x - 1, y) || !L(x + 1, y) || !L(x, y - 1) || !L(x, y + 1)) put(i, INK); else if(!L(x - 2, y) || !L(x, y - 2) || !L(x + 2, y) || !L(x, y + 2)) put(i, '#d4ba86'); else put(i, (x * 7 + y * 13) % 17 === 0 ? '#d6c294' : '#e2d0a2'); }
    else if(L(x - 1, y) || L(x + 1, y) || L(x, y - 1) || L(x, y + 1) || L(x - 2, y) || L(x + 2, y) || L(x, y - 2) || L(x, y + 2)) put(i, '#c6d4c4');
    else if(y % wave === 2 && (x + (y / wave | 0) * 4) % 11 < 3) put(i, '#a3b8b2'); }
  k.putImageData(id, 0, 0); return L; }
// a gently bowed road between two points, plotted as hard pixels
function curveOn(ax, ay, bx, by, bow, fn){ const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, b = bow * Math.min(.2 * len, 18), qx = mx - dy / len * b, qy = my + dx / len * b, n = Math.ceil(len * 1.6) + 1;
  for(let t = 0; t <= n; t++){ const u = t / n; fn(Math.round((1 - u) * (1 - u) * ax + 2 * (1 - u) * u * qx + u * u * bx), Math.round((1 - u) * (1 - u) * ay + 2 * (1 - u) * u * qy + u * u * by), t, n); } }
const roadPx = (k, wd) => (x, y) => { k.fillStyle = '#7a1a14'; k.fillRect(x - (wd >> 1), y - (wd >> 1) + 1, wd, wd); };
const roadPx2 = (k, wd) => (x, y) => { k.fillStyle = SHU; k.fillRect(x - (wd >> 1), y - (wd >> 1), wd, wd); };
const dotPx = k => (x, y, t) => { if(t % 4 === 0){ k.fillStyle = INK2; k.fillRect(x, y, 1, 1); } };
function inkSprite(k, rows, x0, y0, pal){ rows.forEach((r, y) => [...r].forEach((ch, x) => { if(ch !== '.'){ k.fillStyle = pal[ch]; k.fillRect(x0 + x, y0 + y, 1, 1); } })); }
const FUJI = ['...XXX...', '..XoooX..', '.XooXooX.', 'X.......X'], FLAG = ['X.....', 'XXXX..', 'XoXoX.', 'XXXX..', 'X.....', 'X.....'];
// the atlas: Japan at its true shape with the Tokyo Bay inset over the Sea of Japan. ins = the inset's rect on the main canvas (low-res px)
function drawAtlas(main, inset, M, selI, ins){ const w = main.width, h = main.height, k = main.getContext('2d'); k.imageSmoothingEnabled = false; k.clearRect(0, 0, w, h);
  const P = proj(JAPAN, w, h, 6); paintLand(k, w, h, P, 6);
  const caret = (x, y) => { k.fillStyle = INK2; k.fillRect(x, y, 1, 1); k.fillRect(x - 1, y + 1, 1, 1); k.fillRect(x + 1, y + 1, 1, 1); };
  for(const [lo, la] of [[137.6, 36.3], [137.9, 35.9], [137.3, 36.0], [140.6, 39.3], [140.4, 38.0], [134.0, 35.2], [131.3, 32.9], [142.8, 43.6], [133.5, 33.8], [138.4, 36.5], [140.9, 40.4]]){ const [x, y] = P(lo, la); caret(x, y); }
  { const [fx, fy] = P(138.73, 35.36); inkSprite(k, FUJI, fx - 4, fy - 3, { X:INK, o:'#ffffff' }); }
  const W2 = inset.width, H2 = inset.height, g = inset.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = PAPER; g.fillRect(0, 0, W2, H2);
  const Q = proj(BAY, W2, H2, 2); paintLand(g, W2, H2, Q, 5);
  // the Aqua-Line across the bay: the tunnel (dashed) to Umihotaru, then the bridge
  { const a = Q(139.76, 35.52), m = Q(139.86, 35.465), b = Q(139.92, 35.42); curveOn(a[0], a[1], m[0], m[1], 0, (x, y, t) => { if(t % 3 < 2){ g.fillStyle = INK2; g.fillRect(x, y, 1, 1); } }); curveOn(m[0], m[1], b[0], b[1], 0, (x, y) => { g.fillStyle = INK2; g.fillRect(x, y, 1, 1); }); }
  // the inset's frame on the main map, with leader lines to the inset
  const b0 = P(BAY.lon0, BAY.lat1), b1 = P(BAY.lon1, BAY.lat0); k.fillStyle = SHU; for(let x = b0[0]; x <= b1[0]; x++){ k.fillRect(x, b0[1], 1, 1); k.fillRect(x, b1[1], 1, 1); } for(let y = b0[1]; y <= b1[1]; y++){ k.fillRect(b0[0], y, 1, 1); k.fillRect(b1[0], y, 1, 1); }
  const lead = (x0, y0, x1, y1) => curveOn(x0, y0, x1, y1, 0, (x, y, t) => { if(t % 3 === 0 && !(x >= ins.x - 1 && x <= ins.x + ins.w && y >= ins.y - 1 && y <= ins.y + ins.h)){ k.fillStyle = SHU; k.fillRect(x, y, 1, 1); } });
  lead(b0[0], b0[1], ins.x + ins.w, ins.y); lead(b0[0], b1[1], ins.x + ins.w, ins.y + ins.h);
  // nodes: Kanto roads live in the inset, the rest on the main map; the inset frame on the main map is their hub
  const hub = [(b0[0] + b1[0]) >> 1, (b0[1] + b1[1]) >> 1];
  const where = i => { const at = M.roads[i].x.at; return inBay(at) ? { bay:true, p:Q(at[0], at[1]) } : { bay:false, p:P(at[0], at[1]) }; };
  const known = i => M.roads[i].nights > 0, shown = i => known(i) || [...M.seen.values()].some(e => e.b === i);
  const exits = new Map();   // a destination outside the bay -> its 至 marker on the inset's border
  const exitAt = j => { if(exits.has(j)) return exits.get(j); const [px, py] = P(...M.roads[j].x.at), ang = Math.atan2(py - hub[1], px - hub[0]), cxI = W2 / 2, cyI = H2 / 2;
    const t = Math.min(Math.abs((W2 / 2 - 4) / (Math.cos(ang) || 1e-6)), Math.abs((H2 / 2 - 4) / (Math.sin(ang) || 1e-6))); let ex = Math.round(cxI + Math.cos(ang) * t), ey = Math.round(cyI + Math.sin(ang) * t);
    for(let n = 0; n < 6; n++){ const hit = [...exits.values()].some(o => Math.abs(o.x - ex) < 14 && Math.abs(o.y - ey) < 14); if(!hit) break; if(Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang))) ey += 15; else ex += 15; }
    const o = { x:cl(ex, 4, W2 - 5), y:cl(ey, 4, H2 - 5), j }; exits.set(j, o); return o; };
  const plot = (e, taken) => { const A = where(e.a), B = where(e.b), wd = e.n >= 5 ? 3 : e.n >= 2 ? 2 : 1, bow = e.a < e.b ? 1 : -1;
    const draw = (ctx, x0, y0, x1, y1, bw) => { if(taken){ curveOn(x0, y0, x1, y1, bw, roadPx(ctx, wd)); curveOn(x0, y0, x1, y1, bw, roadPx2(ctx, wd)); } else curveOn(x0, y0, x1, y1, bw, dotPx(ctx)); };
    if(A.bay && B.bay) draw(g, A.p[0], A.p[1], B.p[0], B.p[1], bow * .6);
    else if(!A.bay && !B.bay) draw(k, A.p[0], A.p[1], B.p[0], B.p[1], bow);
    else { const I = A.bay ? A : B, O = A.bay ? B : A, j = A.bay ? e.b : e.a, x = exitAt(j); draw(g, I.p[0], I.p[1], x.x, x.y, bow * .3); draw(k, hub[0], hub[1], O.p[0], O.p[1], bow); } };
  for(const [id2, e] of M.seen) if(!M.edges.has(id2)) plot(e, false);
  for(const e of [...M.edges.values()].sort((a, b) => a.n - b.n)) plot(e, true);
  M.roads.forEach((R, i) => { if(!shown(i)) return; const W = where(i), ctx = W.bay ? g : k, [x, y] = W.p, kn = known(i);
    ctx.fillStyle = kn ? INK : INK2; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillStyle = kn ? (i === selI ? SHU : '#fbf6ea') : PAPER2; ctx.fillRect(x - 1, y - 1, 3, 3); });
  const start = [...M.starts.entries()].filter(e => e[0] != null).sort((a, b) => b[1] - a[1]).map(e => e[0])[0]; if(start != null && M.roads[start] && known(start)){ const W = where(start); inkSprite(W.bay ? g : k, FLAG, W.p[0] + 3, W.p[1] - 7, { X:INK, o:SHU }); }
  g.fillStyle = INK; g.fillRect(0, 0, W2, 1); g.fillRect(0, H2 - 1, W2, 1); g.fillRect(0, 0, 1, H2); g.fillRect(W2 - 1, 0, 1, H2);
  return { where, exits:[...exits.values()], shown, known }; }

/* ================================================================== CSS (injected once) */
const STYLE = `
#jnl{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 16px 10px;font-family:DotGothic16,monospace;color:${INK};
  background:repeating-linear-gradient(rgba(0,0,0,.22) 0 1px,transparent 1px 3px),linear-gradient(rgba(4,3,8,.9) 0 6%,rgba(4,3,8,.8) 6% 12%,rgba(4,3,8,.7) 12% 88%,rgba(4,3,8,.8) 88% 94%,rgba(4,3,8,.9) 94%)}
#jnl *{box-sizing:border-box}
#jnl img.j3{display:inline-block;image-rendering:pixelated;vertical-align:middle}
#jnl canvas{image-rendering:pixelated;image-rendering:crisp-edges}
:where(#jnl) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:left}
:where(#jnl) button:focus-visible{outline:none}
.jtop{position:relative;z-index:3;display:flex;align-items:flex-end;gap:10px;width:var(--bw);margin-bottom:-4px}
.jttl{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:6px 12px 8px 10px;margin-right:6px;background:${NIGHT};box-shadow:inset 0 0 0 1px #3a3350,4px 4px 0 #000;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}
.jttl b{font-weight:400;font-size:32px;line-height:1;color:#ff3b5c;letter-spacing:2px;text-shadow:2px 2px 0 #000}
.jtabs{display:flex;align-items:flex-end;gap:4px;flex:0 1 auto;min-width:0}
.jtab{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:84px;padding:6px 12px 10px;color:${CREAM}!important;transform:rotate(var(--r,0deg));transform-origin:50% 100%}
.jtab::before{content:"";position:absolute;inset:0;z-index:-1;background:#14101c;clip-path:polygon(6% 0,100% 0,94% 100%,0 100%);box-shadow:none}
.jtab::after{content:"";position:absolute;left:4px;right:4px;bottom:0;height:3px;background:#3a3350}
.jtab .k{font-size:32px;line-height:1;text-shadow:2px 2px 0 #000}
.jtab.on{padding:10px 16px 14px;z-index:2}
.jtab.on::before{background:#ff3b5c;filter:drop-shadow(4px 4px 0 #000)}
.jtab.on::after{background:#000}
.jtab.on .k{color:${CREAM};text-shadow:3px 3px 0 #000}
.jtab:not(.on):hover::before{background:#2a2238}
.jkey{display:flex;align-items:center;gap:4px;padding-bottom:12px}
.jkey kbd{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px 2px;font-family:DotGothic16,monospace;font-size:13px;line-height:1;color:#1a1424;border-radius:0;
  background:#e6e2ec;border:2px solid #000;box-shadow:inset 2px 2px 0 #fff,inset -2px -3px 0 #9a94aa,0 2px 0 #000;margin:0}
.jx{display:flex;align-items:center;gap:8px;margin:0 0 10px auto;padding:8px 12px;border:2px solid #000!important;background:#1c1628!important;color:${CREAM}!important;font-size:16px!important;
  box-shadow:inset 2px 2px 0 #5a5072,inset -2px -2px 0 #0a0810,0 0 0 2px ${CREAM},4px 4px 0 2px #ff3b5c}
.jx:hover{background:#2a2238!important}
.jx:active{transform:translate(2px,2px)}
/* the book: black cloth boards, page edges, washi paper */
.jbook{position:relative;width:var(--bw);height:var(--bh);padding:8px;background:#141018;box-shadow:inset 0 0 0 2px #2a2434,inset 0 0 0 4px #0a080e,10px 10px 0 #000}
.jbook::after{content:"";position:absolute;left:10px;right:10px;bottom:2px;height:5px;background:repeating-linear-gradient(${PAPER2} 0 1px,${PAPER3} 1px 2px);pointer-events:none}
.jstage{position:absolute;inset:8px 8px 12px;perspective:2400px}
.jspread{position:absolute;inset:0;display:flex;isolation:isolate}
.jslot{position:relative;flex:1 1 0;min-width:0;height:100%}
.jpage{position:absolute;inset:0;overflow:hidden;background:var(--paper) 0 0/128px 128px,${PAPER};padding:18px 22px 22px}
.jslot.L .jpage{box-shadow:inset -4px 0 0 ${PAPER2},inset -8px 0 0 #e8dbbd,inset -10px 0 0 ${PAPER3};padding-left:44px;padding-right:26px}
.jslot.R .jpage{box-shadow:inset 4px 0 0 ${PAPER2},inset 8px 0 0 #e8dbbd,inset 10px 0 0 ${PAPER3};padding-left:30px}
.jslot.N .jpage{padding:14px 14px 18px 34px;overflow-y:auto;overscroll-behavior:contain}
.jspine{position:absolute;left:50%;top:-8px;bottom:-12px;width:6px;margin-left:-3px;background:#141018;z-index:2;pointer-events:none}
.jfolio{position:absolute;bottom:6px;font-size:16px;color:${INK2}}
.jslot.L .jfolio{left:44px}.jslot.R .jfolio{right:26px}
.jtate{position:absolute;left:10px;top:18px;writing-mode:vertical-rl;font-size:16px;line-height:1;letter-spacing:4px;color:${SHU};white-space:nowrap}
.jslot.N .jtate{left:8px}
/* page turn: the leaf turns on the spine in 8 hard steps over 4 sixteenths; its face darkens in steps as it lifts */
.jleaf{position:absolute;top:0;bottom:0;width:50%;transform-style:preserve-3d;z-index:4}
.jleaf.f{left:50%;transform-origin:0 50%;animation:jtF var(--turn) steps(8) forwards}
.jleaf.b{left:0;transform-origin:100% 50%;animation:jtB var(--turn) steps(8) forwards}
.jleaf.n{left:0;width:100%;transform-origin:0 50%;animation:jtF var(--turn) steps(8) forwards}
.jleaf .jslot{position:absolute;inset:0;backface-visibility:hidden}
.jleaf .jslot.back{transform:rotateY(180deg)}
.jleaf .jslot::after{content:"";position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;animation:jsh var(--turn) steps(4) forwards}
.jleaf .jslot.back::after{animation-name:jsh2}
@keyframes jtF{from{transform:rotateY(0)}to{transform:rotateY(-180deg)}}
@keyframes jtB{from{transform:rotateY(0)}to{transform:rotateY(180deg)}}
@keyframes jsh{0%{opacity:0}50%{opacity:.32}100%{opacity:.32}}
@keyframes jsh2{0%{opacity:.32}50%{opacity:.32}100%{opacity:0}}
.jfade{z-index:3;animation:jfade calc(var(--six) * 2) steps(4) both}
@keyframes jfade{from{opacity:0}to{opacity:1}}
/* open / close */
#jnl.in .jbook,#jnl.in .jtop{animation:jrise calc(var(--six) * 2) steps(4) both}
#jnl.in .jtab{animation:jdrop calc(var(--six) * 2) steps(3) both}
#jnl.in .jslash{animation:jslash calc(var(--six) * 3) steps(6) both}
#jnl.out{animation:jout calc(var(--six) * 1.5) steps(3) forwards}
@keyframes jrise{from{transform:translateY(32px);opacity:0}to{transform:none;opacity:1}}
@keyframes jdrop{from{transform:translateY(-16px) rotate(var(--r,0deg));opacity:0}to{transform:rotate(var(--r,0deg));opacity:1}}
@keyframes jout{to{opacity:0}}
.jslash{position:fixed;left:-20%;right:-20%;top:42%;height:96px;background:#ff3b5c;transform:rotate(-8deg) translateX(110%);pointer-events:none;z-index:0;box-shadow:0 8px 0 #000}
@keyframes jslash{0%{transform:rotate(-8deg) translateX(-110%)}50%{transform:rotate(-8deg) translateX(0)}100%{transform:rotate(-8deg) translateX(110%)}}
.rm #jnl *,.rm #jnl{animation-name:none!important}
.rm #jnl .jfade{animation-name:jfade!important}
.rm #jnl .jslash{display:none}
/* headers: big kanji, a slanted katakana band, caps */
.jhd{display:flex;align-items:flex-end;gap:12px;margin:0 0 10px}
.jhk{font-size:64px;line-height:.9;color:${INK};text-shadow:4px 4px 0 ${PAPER3}}
.jland .jhk{animation:jslam calc(var(--six) * 2) steps(3) both}
@keyframes jslam{0%{transform:scale(1.6);opacity:0}40%{opacity:1}100%{transform:none}}
.jhn{display:inline-block;font-weight:400;font-size:16px;line-height:1;padding:5px 14px 5px 10px;color:${CREAM};background:${INK};clip-path:polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%);margin-bottom:6px}
.jhc{margin-left:auto;text-align:right;font-size:16px;color:${INK2};line-height:1.2}
.jhc b{display:block;font-weight:400;font-size:32px;color:${INK};line-height:1}
.jsub{font-size:16px;color:${INK2};margin:0 0 10px;line-height:1.5}
/* the selection: a red parallelogram slab with a hard shadow (Persona 5) and a cursor that nudges on the half-note */
.jsel{position:relative;isolation:isolate}
.jsel.on{color:${CREAM}!important}
.jsel.on img.j3{filter:brightness(0) invert(1)}   /* pixel caps drawn in ink turn light on the red cursor (NOT MET YET was ink on red) */
.jsub,.jnote,.jhon,.jp p{text-wrap:pretty}   /* no one-word last lines ("in.", "to.") */
.jsel.on::before{content:"";position:absolute;inset:-3px -8px -3px -10px;z-index:-1;background:${SHU};clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);filter:drop-shadow(3px 3px 0 ${INK})}
.jsel.on::after{content:"";position:absolute;left:-20px;top:50%;margin-top:-6px;width:0;height:0;border:6px solid transparent;border-left:8px solid ${INK};animation:jbeat calc(var(--six) * 8) steps(1) infinite}
@keyframes jbeat{50%{transform:translateX(3px)}}
/* atlas */
.jmap{position:relative;margin:0 auto}
.jmap canvas{display:block}
.jcart{position:absolute;z-index:2;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;cursor:pointer}
.jcart i{display:block;font-style:normal;font-size:16px;line-height:1;padding:3px 2px 2px;background:#fbf6ea;color:${INK};border:2px solid ${SHU};box-shadow:2px 2px 0 rgba(30,24,36,.35)}
.jcart u{display:block;width:2px;height:var(--stem,8px);background:${INK}}
.jcart.bl{transform:translate(-50%,0);flex-direction:column-reverse}
.jcart.q i{border-style:dashed;border-color:${INK2};color:${INK2};background:${PAPER}}
.jcart.on i{background:${SHU};color:${CREAM};border-color:${INK};box-shadow:3px 3px 0 ${INK}}
.jins{position:absolute;z-index:1;box-shadow:4px 4px 0 rgba(30,24,36,.3)}
.jins canvas{display:block}
.jinst{position:absolute;left:0;top:100%;margin-top:4px;display:flex;align-items:center;gap:6px;padding:2px 8px 3px;font-size:16px;line-height:1;background:${INK};color:${CREAM};white-space:nowrap}
.jinst img{filter:invert(1)}
.jexit{position:absolute;z-index:2;transform:translate(-50%,-50%);display:flex;align-items:center;gap:2px;padding:1px 3px 1px 2px;font-size:16px;line-height:1;background:${SHU};color:${CREAM};box-shadow:2px 2px 0 ${INK}}
.jexit i{font-style:normal;padding:1px 2px;background:#fbf6ea;color:${INK}}
.jexit.q{background:${INK2}}.jexit.q i{color:${INK2}}
.jlegend{position:absolute;right:0;bottom:0;display:flex;flex-direction:column;gap:4px;padding:6px 10px 8px;background:#fbf6ea;border:2px solid ${INK};box-shadow:inset 0 0 0 2px #fbf6ea,inset 0 0 0 3px ${INK},4px 4px 0 rgba(30,24,36,.3);font-size:16px}
.jlegend b{font-weight:400;font-size:16px;letter-spacing:4px;color:${SHU};border-bottom:2px solid ${SHU};padding-bottom:3px;margin-bottom:2px}
.jlegend span{display:flex;align-items:center;gap:6px}
.jlegend i{display:inline-block;width:22px;height:4px;background:${SHU}}
.jlegend i.d{height:2px;background:repeating-linear-gradient(90deg,${INK2} 0 2px,transparent 2px 6px)}
.jlegend i.q{width:auto;height:auto;font-style:normal;padding:0 3px;border:2px dashed ${INK2};font-size:13px;line-height:1.1;background:none}
.jfine{margin:-4px 0 10px;font-size:16px;color:${INK2}}
.jdet{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 16px;align-items:center;padding:0 0 10px;border-bottom:2px solid ${INK};margin-bottom:8px}
.jdet .jbk{grid-row:span 3;display:grid;place-items:center;width:80px;height:80px;font-size:64px;line-height:1;color:${CREAM};background:var(--rc,${INK});box-shadow:inset 0 0 0 3px ${INK},4px 4px 0 ${INK}}
.jdet .jbk.q{background:${PAPER2};color:${INK2};box-shadow:inset 0 0 0 3px ${INK2}}
.jdet h3{margin:0;font-weight:400;font-size:32px;line-height:1}
.jdet p{margin:0;font-size:16px;line-height:1.35;color:${INK2}}
.jfacts{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 10px;font-size:16px}
.jfacts span{display:flex;align-items:baseline;gap:6px}
.jfacts b{font-weight:400;font-size:32px;line-height:1}
.jweb{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:4px 10px;padding:6px 10px;margin:0 0 8px;background:rgba(210,191,152,.35);border:2px dashed ${PAPER3};font-size:16px}
.jweb .c{display:flex;flex-direction:column;gap:6px}
.jweb .c.r{align-items:flex-start}.jweb .c.l{align-items:flex-end}
.jchip{display:inline-flex;align-items:center;gap:6px;padding:2px 8px 2px 2px;background:#fbf6ea;border:2px solid ${INK};white-space:nowrap}
.jchip i{font-style:normal;display:inline-grid;place-items:center;width:22px;height:22px;background:var(--rc,${INK});color:${CREAM}}
.jchip.q{border-style:dashed;border-color:${INK2};color:${INK2}}.jchip.q i{background:${PAPER2};color:${INK2}}
.jweb .me{position:relative;display:flex;flex-direction:column;align-items:center;font-size:32px;line-height:1;padding:6px 10px 4px;background:${INK};color:${CREAM};box-shadow:3px 3px 0 ${SHU}}
.jweb .me small{font-size:16px;color:#ffd04a;margin-top:2px}
.jweb .me::before,.jweb .me::after{content:"";position:absolute;top:50%;width:10px;height:2px;background:${INK}}
.jweb .me::before{right:100%}.jweb .me::after{left:100%}
.jchip.t{border-color:${SHU};box-shadow:2px 2px 0 ${SHU}}
.jchip.dt{border-style:dashed;border-color:${INK2};background:transparent}
.jidx{display:grid;grid-template-columns:1fr 1fr;gap:5px 26px;padding-left:14px}
.jrow{display:flex;align-items:center;gap:8px;min-height:28px;font-size:16px;line-height:1;white-space:nowrap}
.jrow .kj{display:inline-grid;place-items:center;width:26px;height:26px;color:${CREAM};background:var(--rc,${INK});box-shadow:2px 2px 0 ${INK}}
.jrow.q{color:${INK2}}.jrow.q .kj{background:none;color:${INK2};box-shadow:inset 0 0 0 2px ${INK2}}
.jrow .km{margin-left:auto;color:${INK2}}
.jrow.on .km{color:${CREAM}}
/* stamps */
.jsgrid{display:grid;grid-template-columns:repeat(var(--cols,5),minmax(0,1fr));gap:2px 6px;margin-bottom:6px}
.jst{position:relative;display:block;padding:2px 0 0 2px;min-height:var(--cellh,118px)}
.jst canvas.s{display:block}
.jst canvas.d{position:absolute;right:-4px;bottom:-4px}
.jst .q{position:absolute;left:calc(var(--sz) / 2 - 6px);top:calc(var(--sz) * .3 - 6px);font-size:16px;color:${PAPER3}}
.jst.on::before{content:"";position:absolute;left:-3px;top:-2px;width:calc(var(--sz) + 8px);height:calc(var(--sz) + 8px);z-index:-1;--c:${SHU};background:linear-gradient(var(--c),var(--c)) 0 0/14px 3px,linear-gradient(var(--c),var(--c)) 0 0/3px 14px,linear-gradient(var(--c),var(--c)) 100% 0/14px 3px,linear-gradient(var(--c),var(--c)) 100% 0/3px 14px,linear-gradient(var(--c),var(--c)) 0 100%/14px 3px,linear-gradient(var(--c),var(--c)) 0 100%/3px 14px,linear-gradient(var(--c),var(--c)) 100% 100%/14px 3px,linear-gradient(var(--c),var(--c)) 100% 100%/3px 14px;background-repeat:no-repeat}
.jst.on::after{content:"";position:absolute;left:calc(var(--sz) / 2);top:-10px;margin-left:-6px;border:6px solid transparent;border-top:8px solid ${SHU};animation:jbeat2 calc(var(--six) * 8) steps(1) infinite}
@keyframes jbeat2{50%{transform:translateY(3px)}}
#jnl.slam .jst.g canvas.s{animation:jstamp calc(var(--six) * 1) steps(2) both;animation-delay:calc(var(--i) * 34ms)}
@keyframes jstamp{0%{transform:scale(1.35);opacity:0}100%{transform:none;opacity:1}}
.jcap{position:absolute;left:44px;right:26px;bottom:26px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 14px;align-items:center;padding:6px 12px;background:#fbf6ea;border:2px solid ${INK};box-shadow:4px 4px 0 ${PAPER3};min-height:72px}
.jslot.N .jcap{position:static;margin-top:10px}
.jcap .kj{grid-row:span 3;display:grid;place-items:center;width:56px;height:56px;font-size:32px;color:${CREAM};background:var(--rc,${INK})}
.jcap .kj.q{background:none;color:${INK2};box-shadow:inset 0 0 0 2px ${INK2};border:0}
.jcap h3{margin:0;font-weight:400;font-size:32px;line-height:1}
.jcap p{margin:0;font-size:16px;line-height:1.35;color:${INK2}}
.jrar{position:absolute;left:30px;right:26px;bottom:30px;display:flex;flex-wrap:wrap;gap:6px 16px;padding-top:8px;border-top:2px dashed ${PAPER3};font-size:16px}
.jslot.N .jrar{position:static;margin-top:8px}
.jrar span{display:flex;align-items:center;gap:6px}
.jrar i{display:inline-block;width:18px;height:18px;border:2px solid ${INK}}
.jrar i.r{border-radius:50%;box-shadow:inset 0 0 0 2px #fbf6ea,inset 0 0 0 4px ${INK}}
.jrar i.l{clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%);background:${INK};box-shadow:inset 0 0 0 2px #fbf6ea}
.jrar i.d{width:24px;height:12px;border-color:${SHU}}
.jtier{display:inline-block;font-size:16px;padding:1px 6px;margin-left:8px;vertical-align:4px;border:2px solid currentColor;color:${SHU}}
.jtier.a{color:#1a5a7a}.jtier.l{color:#1f6a4a}
.jsec{display:flex;align-items:baseline;gap:10px;margin:0 0 8px;font-size:16px}
.jsec b{font-weight:400;font-size:32px;line-height:1}
.jsec span{color:${INK2}}
/* rivals */
.jgl{display:flex;flex-direction:column;gap:12px;padding-left:14px}
.jgang{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center;gap:12px;padding:6px 10px 6px 6px;background:#fbf6ea;border:2px solid ${INK};box-shadow:4px 4px 0 ${PAPER3}}
.jgang.on{background:${SHU};box-shadow:4px 4px 0 ${INK}}
.jgang .fl{display:grid;place-items:center;width:72px;height:72px;background:var(--g4)}
.jgang .nm{display:flex;flex-direction:column;gap:4px}
.jgang .nm b{font-weight:400;font-size:32px;line-height:1}
.jgang .wl{font-size:32px;line-height:1;text-align:right}
.jgang.un .fl{background:${PAPER2}}
.jgang.un{color:${INK2}}
.jgang.on.un{background:#efe0c0;border-color:${SHU};box-shadow:4px 4px 0 ${SHU}}
.jdos{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px 18px;align-items:start}
.jport{position:relative;width:168px;height:208px;display:grid;place-items:end center;background:var(--g4);box-shadow:inset 0 0 0 3px ${INK},6px 6px 0 ${INK};overflow:hidden}
.jport::before{content:"";position:absolute;inset:3px;background:radial-gradient(circle,var(--g2) 1.5px,transparent 1.6px) 0 0/6px 6px;opacity:.55}
.jport canvas{position:relative}
.jport .tag{position:absolute;left:6px;top:6px;writing-mode:vertical-rl;font-size:16px;letter-spacing:2px;padding:4px 2px;background:${INK};color:${CREAM}}
.jdos h3{margin:0;font-weight:400;font-size:64px;line-height:.95}
.jdos .rd{font-size:16px;color:${INK2};margin:4px 0 8px}
.jhoshi{display:flex;flex-wrap:wrap;gap:3px;margin:6px 0 2px}
.jhoshi i{width:18px;height:18px;border-radius:50%;border:3px solid ${INK};background:#fbf6ea}
.jhoshi i.w{background:#fbf6ea}.jhoshi i.l{background:${INK}}
.jgfoot{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start;margin-top:14px}
.jflag{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 14px 8px;background:#fbf6ea;border:2px solid ${INK};box-shadow:4px 4px 0 ${PAPER3};font-size:16px}
.jramp{display:flex;gap:0;border:2px solid ${INK};width:max-content}
.jramp i{display:block;width:32px;height:24px}
.jnote{font-size:16px;line-height:1.45;color:${INK2};margin:10px 0 0;padding:8px 10px;border-left:4px solid ${SHU};background:rgba(251,246,234,.6)}
/* garage */
.jshow{position:relative;display:grid;place-items:center;height:var(--showh,300px);margin:0 0 10px;background:radial-gradient(circle,${PAPER3} 1.4px,transparent 1.5px) 0 0/8px 8px;box-shadow:inset 0 0 0 3px ${INK}}
.jshow::before{content:"";position:absolute;left:12%;right:12%;bottom:18px;height:10px;background:${PAPER2};box-shadow:0 4px 0 ${PAPER3}}
.jshow canvas{position:relative}
.jarr{position:absolute;top:50%;margin-top:-24px;width:48px;height:48px;display:grid!important;place-items:center;font-size:32px!important;line-height:1;color:${CREAM}!important;background:${INK}!important;box-shadow:4px 4px 0 ${SHU}}
.jarr.p{left:10px}.jarr.n{right:10px}
.jarr.on{background:${SHU}!important;box-shadow:4px 4px 0 ${INK}}
.jplate{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.jplate b{font-weight:400;font-size:32px;line-height:1;letter-spacing:2px}
.jplate .now{font-size:16px;padding:2px 8px;background:${SHU};color:${CREAM}}
.jcos{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.jco{position:relative;display:grid;grid-template-columns:56px minmax(0,1fr);gap:4px 12px;align-items:center;padding:10px;border:2px dashed ${INK2};min-height:84px}
.jco .ic{grid-row:span 2;display:grid;place-items:center;width:56px;height:56px;font-size:32px;color:${PAPER3};box-shadow:inset 0 0 0 2px ${PAPER3}}
.jco b{font-weight:400;font-size:16px}
.jco .soon{position:absolute;right:-6px;top:-10px;font-size:16px;padding:2px 8px;background:${INK};color:#ffd04a;transform:rotate(4deg)}
.jco.on{border-color:${SHU};border-style:solid;background:rgba(210,48,44,.08)}
/* records */
.jbig{display:flex;flex-direction:column;gap:10px}
.jbig div{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:4px 12px;padding:6px 10px 6px 12px}
.jbig div::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(circle,var(--ht,${PAPER3}) 1.6px,transparent 1.7px) 0 0/6px 6px;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%)}
.jbig div{isolation:isolate}
.jbig span{font-size:16px;line-height:1.3}
.jbig span small{display:block;font-size:16px;color:${INK2}}
.jbig b{font-weight:400;font-size:64px;line-height:.9;text-shadow:4px 4px 0 ${PAPER}}
.jbig b small{font-size:32px}
.jbig .two{grid-template-columns:1fr 1fr}
.jtal{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin:0 0 12px}
.jtal div{display:flex;align-items:baseline;gap:8px;font-size:16px;padding:3px 0;border-bottom:2px dotted ${PAPER3}}
.jtal div b{margin-left:auto;font-weight:400;font-size:32px;line-height:1}
.jtal div i{font-style:normal;color:${INK2}}
.jledger{width:100%;border-collapse:collapse;font-size:16px}
.jledger th{font-weight:400;text-align:left;color:${INK2};padding:0 6px 4px 0;border-bottom:2px solid ${INK}}
.jledger td{padding:4px 6px 3px 0;border-bottom:1px solid ${PAPER3};white-space:nowrap}
.jledger .e{display:inline-block;padding:0 4px;border:2px solid currentColor;line-height:1.1}
.jledger .e.c{color:#2a4a9a}.jledger .e.d{color:${SHU}}
.jhon{font-size:16px;line-height:1.45;color:${INK2};margin:12px 0 0}
.jempty{font-size:16px;line-height:1.5;color:${INK2};padding:12px;border:2px dashed ${PAPER3};margin:0 0 10px}
/* footer strip (the title's key strip) */
.jfoot{position:relative;z-index:3;margin-top:12px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 16px;padding:6px 12px 7px;background:rgba(7,6,12,.86);box-shadow:inset 0 0 0 1px #3a3350,4px 4px 0 #000;color:${CREAM};font-size:13px}
.jfoot span{display:inline-flex;align-items:center;gap:6px}
.jfoot kbd{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px 2px;font-family:DotGothic16,monospace;font-size:13px;line-height:1;color:#1a1424;border-radius:0;
  background:#e6e2ec;border:2px solid #000;box-shadow:inset 2px 2px 0 #fff,inset -2px -3px 0 #9a94aa,0 2px 0 #000}
/* narrow: one page at a time, tabs as a strip */
#jnl.nar{padding:8px 8px 8px;justify-content:flex-start}
#jnl.nar .jtop{flex-wrap:wrap;gap:6px;margin-bottom:-2px}
#jnl.nar .jttl{display:none}
#jnl.nar .jtabs{gap:2px;order:2;flex-basis:100%}
#jnl.nar .jtab{min-width:0;flex:1 1 0;padding:5px 2px 8px}
#jnl.nar .jtab.on{padding:7px 2px 10px}
#jnl.nar .jtab .k{font-size:16px}
#jnl.nar .jkey,#jnl.nar .jfoot{display:none}
#jnl.nar .jx{margin:0 0 4px auto;padding:6px 10px}
#jnl.nar .jbook{padding:6px;box-shadow:inset 0 0 0 2px #2a2434,6px 6px 0 #000}
#jnl.nar .jstage{inset:6px 6px 10px}
#jnl.nar .jhk{font-size:48px}
#jnl.nar .jhd{gap:8px;flex-wrap:wrap}
#jnl.nar .jidx,#jnl.nar .jcos,#jnl.nar .jtal{grid-template-columns:1fr}
#jnl.nar .jdos{grid-template-columns:1fr}
#jnl.nar .jbig b{font-size:48px}
#jnl.nar .jdos h3{font-size:48px}
#jnl.nar .jnarr{display:block;height:2px;margin:18px 0 14px;background:repeating-linear-gradient(90deg,${INK} 0 6px,transparent 6px 10px)}
.jnarr{display:none}
#jnl.nar .jmap{height:auto!important}
#jnl.nar .jlegend{position:static;flex-direction:row;flex-wrap:wrap;margin-top:8px;box-shadow:none}
#jnl.nar .jlegend b{flex-basis:100%}
.jslot.N .jfolio{display:none}
`;
let cssOn = false;
function injectCSS(){ if(cssOn) return; cssOn = true; const st = document.createElement('style'); st.id = 'journal-css'; st.textContent = STYLE; document.head.appendChild(st); }
// washi: a pixel paper tile (fibres and flecks), shown at 2x
let PAPER_URL = null;
function paperURL(){ if(PAPER_URL) return PAPER_URL; const n = 64, c = mkc(n, n), k = c.getContext('2d'); k.fillStyle = PAPER; k.fillRect(0, 0, n, n);
  for(let i = 0; i < 150; i++){ const x = (H32('px' + i) * n) | 0, y = (H32('py' + i) * n) | 0, r = H32('pr' + i); k.fillStyle = r < .55 ? '#e8dcbf' : r < .92 ? '#f6efdf' : '#d9c8a4'; k.fillRect(x, y, r < .55 ? 2 + (r * 6 | 0) : 1, 1); }
  return PAPER_URL = c.toDataURL(); }

/* ================================================================== a little sound: paper and stamps (its own context; follows the game volume)
   Craft pass (research/sundown-craft/fork_music.md): the menu sounds (tick, open, close) are the game's own menu voice, window.SFX.ui, so
   the journal sounds like every other menu and sits at the measured menu level. The paper and the stamp keep their own voices, now through
   a master gain (+12 dB: they measured -44 to -39 dBFS, inaudible under the title song) and a guard limiter (they used to go straight to
   the speakers), with a 3 ms attack on the noise (a step onset clicked) and every voice disconnected when it ends. */
const SFX = { ac:null, out:null,
  init(){ try{ if(!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)(); if(this.ac.state === 'suspended') this.ac.resume();
      if(!this.out){ const a = this.ac, lim = a.createDynamicsCompressor(); lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
        this.out = a.createGain(); this.out.gain.value = 3.98; this.out.connect(lim).connect(a.destination); } }catch(e){ this.ac = null; this.out = null; } },
  vol(){ const v = typeof SET !== 'undefined' && SET && Number.isFinite(SET.vol) ? SET.vol / 10 : 1; return v * v; },
  ui(kind){ try{ if(window.SFX && window.SFX !== SFX && typeof window.SFX.ui === 'function'){ window.SFX.ui(kind); return true; } }catch(e){} return false; },
  noise(d, f, v, at, q){ const a = this.ac; if(!a || !this.out || !this.vol()) return; const s = a.currentTime + (at || 0), len = Math.ceil(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), dd = buf.getChannelData(0);
    for(let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / len); const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); src.buffer = buf; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q || .8;
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v * this.vol(), s + .003); src.connect(fl).connect(g).connect(this.out); src.start(s); src.onended = () => { try{ g.disconnect(); }catch(e){} }; },
  tone(f, d, v, at, type){ const a = this.ac; if(!a || !this.out || !this.vol()) return; const s = a.currentTime + (at || 0), o = a.createOscillator(), g = a.createGain(); o.type = type || 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v * this.vol(), s + .005); g.gain.exponentialRampToValueAtTime(.0001, s + d); o.connect(g).connect(this.out); o.start(s); o.stop(s + d + .05); o.onended = () => { try{ g.disconnect(); }catch(e){} }; },
  page(){ this.noise(.16, 2400, .05, 0, .6); this.noise(.1, 1200, .03, SIX / 1000 * 2); },
  stamp(){ this.tone(72, .14, .09, 0, 'sine'); this.noise(.06, 500, .05); },
  tick(){ if(!this.ui('move')) this.tone(1760, .03, .006); },
  open(up){ if(!this.ui(up ? 'ok' : 'back')){ this.tone(up ? 880 : 1175, .07, .012); this.tone(up ? 1175 : 880, .08, .01, .06); } } };

/* ================================================================== state and layout */
const S = { tab:0, sel:{ atlas:0, stamps:'', rivals:0, garage:0, records:0 }, from:'title', back:null, root:null, stage:null, spread:null, busy:false, M:null, wide:true, pad:{}, padT:{}, raf:0, keyH:null, keyUpH:null, cur:null };
function geom(){ const vw = innerWidth, vh = innerHeight, wide = vw >= 860 && vh >= 540;
  if(wide){ const bw = Math.min(1240, vw - 40), bh = Math.min(700, vh - 140); return { wide, bw, bh, pw:(bw - 16) / 2 }; }
  return { wide, bw:vw - 16, bh:vh - 82, pw:vw - 28 }; }
const pageEl = (side, inner, tab) => { const s = document.createElement('div'); s.className = 'jslot ' + side; const p = document.createElement('div'); p.className = 'jpage'; p.style.setProperty('--paper', `url(${paperURL()})`);
  p.innerHTML = inner; s.appendChild(p); return s; };
function header(T, right){ return `<div class="jhd"><span class="jhk" aria-hidden="true">${T.kj}</span><div><b class="jhn">${T.kana}</b><div>${caps(T.en, INK, 3)}</div></div>${right ? `<div class="jhc">${right}</div>` : ''}</div>`; }
const tate = T => `<span class="jtate" aria-hidden="true">夜走手帖　${T.tate}</span>`;
const folio = n => `<span class="jfolio" aria-hidden="true">${caps('P.' + String(n).padStart(2, '0'), INK2, 2)}</span>`;
const rcol = R => mix(R.x.col, INK, .38);

/* ================================================================== pages */
const PAGES = {};
// ---- 1 the route atlas
PAGES.atlas = (M, G) => { const T = TABS[0], found = M.roads.filter(R => R.nights).length;
  const head = header(T, `<b>${found}<small style="font-size:16px"> / ${M.N}</small></b>roads found`);
  // the map fills the left page; K = 2 css px per map pixel (3 on a big page)
  const mw = G.wide ? G.pw - 74 : G.pw - 46, mh = G.wide ? G.bh - 64 : Math.round(mw * 1.08), K = mw >= 640 ? 3 : 2, lw = Math.floor(mw / K), lh = Math.floor(mh / K);
  const iw = Math.round(lw * .44), ih = Math.round(lh * .46), ins = { x:3, y:3, w:iw, h:ih };
  const L = `${tate(T)}<div class="jmap" style="width:${lw * K}px;height:${lh * K}px"><canvas class="mm" width="${lw}" height="${lh}" style="width:${lw * K}px;height:${lh * K}px" role="img" aria-label="A hand-inked map of Japan with the roads you have ridden drawn in red"></canvas>
    <div class="jins" style="left:${ins.x * K}px;top:${ins.y * K}px"><canvas class="im" width="${iw}" height="${ih}" style="width:${iw * K}px;height:${ih * K}px" aria-hidden="true"></canvas><span class="jinst">東京湾 拡大図 ${caps('TOKYO BAY', INK, 2)}</span></div>
    <div class="jlegend" aria-hidden="true"><b>夜走全図</b><span><i></i>${caps('RIDDEN', INK, 2)}</span><span><i class="d"></i>${caps('FORK SEEN', INK, 2)}</span><span><i class="q">？</i>${caps('NOT YET FOUND', INK, 2)}</span><span>至 ${caps('ROAD OUT OF THE BAY', INK, 2)}</span><span>${caps('FROM YOUR SAVED NIGHTS ONLY', INK2, 2)}</span><span>縮尺不定 ${caps('NOT TO SCALE', INK2, 2)}</span></div></div>${folio(1)}`;
  const rows = M.roads.map(R => { const q = !R.nights, km = R.roadKmKnown ? R.bestKm : R.bestNight;
    return `<button type="button" class="jrow jsel${q ? ' q' : ''}" data-ji data-road="${R.i}" style="--rc:${rcol(R)}" aria-label="${q ? 'Road not yet found' : esc(R.L.name)}"><span class="kj">${q ? '？' : R.L.kanji}</span><span>${q ? '？？？' : esc(R.L.name)}</span><span class="km">${q ? '' : km ? km.toFixed(1) + ' km' : ''}</span></button>`; }).join('');
  const Rt = `${head}<div class="jdetbox"></div><div class="jsec"><b>索引</b><span>${caps('INDEX OF ROADS', INK2, 2)}</span></div><div class="jidx">${rows}</div>${folio(2)}`;
  return { L, R:Rt,
    init(root){ const cv = root.querySelector('.jmap canvas.mm'), ci = root.querySelector('.jmap canvas.im'), map = root.querySelector('.jmap');
      const draw = () => { const sel = cl(S.sel.atlas | 0, 0, M.N - 1), pr = drawAtlas(cv, ci, M, sel, ins); map.querySelectorAll('.jcart').forEach(e => e.remove());
        // cartouches: vertical place tags on stems (Hatsusaburo), placed so they clear each other, the inset and the legend
        const lg = map.querySelector('.jlegend'), boxes = [[ins.x * K, ins.y * K, (ins.x + ins.w) * K, (ins.y + ins.h) * K + 18]], inner = [];
        if(lg && getComputedStyle(lg).position === 'absolute') boxes.push([lw * K - lg.offsetWidth - 4, lh * K - lg.offsetHeight - 4, lw * K, lh * K]);
        const order = M.roads.map((R, i) => i).filter(i => pr.shown(i)).sort((a, b) => pr.where(a).bay - pr.where(b).bay);
        for(const i of order){ const R = M.roads[i], W = pr.where(i), kn = pr.known(i), ox = W.bay ? (ins.x) * K : 0, oy = W.bay ? (ins.y) * K : 0, cx0 = ox + W.p[0] * K + K / 2, cy0 = oy + W.p[1] * K + K / 2;
          const lim = W.bay ? [ins.x * K + 2, ins.y * K + 2, (ins.x + ins.w) * K - 2, (ins.y + ins.h) * K - 2] : [0, 0, lw * K, lh * K], pool = W.bay ? inner : boxes; let best = null;
          for(const [dx, stem, below] of [[0, 6, 0], [0, 6, 1], [18, 4, 0], [-18, 4, 0], [18, 4, 1], [-18, 4, 1], [0, 22, 0], [0, 22, 1], [30, 14, 0], [-30, 14, 0], [30, 14, 1], [-30, 14, 1], [0, 38, 0], [0, 38, 1]]){
            const X = cx0 + dx, Y = below ? cy0 + 4 : cy0 - 4, b = below ? [X - 13, Y + stem, X + 13, Y + stem + 27] : [X - 13, Y - stem - 27, X + 13, Y - stem];
            if(b[0] < lim[0] || b[2] > lim[2] || b[1] < lim[1] || b[3] > lim[3]) continue;
            if(!pool.some(o => b[0] < o[2] + 2 && b[2] + 2 > o[0] && b[1] < o[3] + 2 && b[3] + 2 > o[1]) && (W.bay || !boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]))){ best = { X, Y, stem, below, b }; break; } }
          if(!best) best = { X:cx0, Y:cy0 - 4, stem:6, below:0, b:[0, 0, 0, 0] }; pool.push(best.b);
          const el = document.createElement('span'); el.className = 'jcart' + (kn ? '' : ' q') + (i === sel ? ' on' : '') + (best.below ? ' bl' : '') + (Math.abs(best.X - cx0) > 2 ? ' sk' : '');
          el.dataset.road = i; el.style.left = best.X + 'px'; el.style.top = best.Y + 'px'; el.style.setProperty('--stem', best.stem + 'px'); el.style.setProperty('--lean', (cx0 - best.X) + 'px');
          el.innerHTML = `<i>${kn ? R.L.kanji : '？'}</i><u></u>`; el.onclick = () => { const row = S.stage && S.stage.querySelector(`.jrow[data-road="${i}"]`); if(row) select(row); }; map.appendChild(el); }
        // 至 markers where a road leaves the bay
        for(const x of pr.exits){ const Rj = M.roads[x.j], kn = pr.known(x.j), el = document.createElement('span'); el.className = 'jexit' + (kn ? '' : ' q');
          el.style.left = (ins.x + x.x) * K + 'px'; el.style.top = (ins.y + x.y) * K + 'px'; el.innerHTML = `至<i>${kn ? Rj.L.kanji : '？'}</i>`; map.appendChild(el); } };
      draw(); this.redraw = draw; },
    select(el, root){ const i = +el.dataset.road, prev = S.sel.atlas; S.sel.atlas = i; const R = M.roads[i], box = (S.root || root).querySelector('.jdetbox'); if(!box) return;
      const chip = (j, label, dotted) => { const Rj = M.roads[j], k = Rj.nights > 0, e = M.edges.get(i + '>' + j) || M.edges.get(j + '>' + i);
        return `<span class="jchip${k ? '' : ' q'}${e && !dotted ? ' t' : ''}${dotted ? ' dt' : ''}" style="--rc:${rcol(Rj)}"><i>${k ? Rj.L.kanji : '？'}</i>${caps(label, k ? INK : INK2, 2)} ${k ? esc(Rj.L.name) : '？？？'}${e && !dotted ? ` <small>×${M.edges.get(label === 'FROM' ? j + '>' + i : i + '>' + j) ? M.edges.get(label === 'FROM' ? j + '>' + i : i + '>' + j).n : e.n}</small>` : ''}</span>`; };
      const from = [...new Set([...M.edges.values()].filter(e => e.b === i).map(e => e.a))];
      if(!R.nights){ const via = [...M.seen.values()].find(e => e.b === i && M.roads[e.a].nights);
        box.innerHTML = `<div class="jdet"><span class="jbk q">？</span><h3>${caps('NOT YET FOUND', INK2, 4)}</h3><p>${via ? `It was offered at a fork on ${esc(M.roads[via.a].L.name)} (the ${via.side === 'L' ? 'left' : 'right'} sign).` : M.recs.length ? (R.histOnly ? 'Ridden on a night that is no longer in the list.' : 'Forks offer roads you have not ridden yet. Keep taking them.') : 'Finish a night, at dawn or pulled over, and the roads you rode are inked in here.'}</p><p>${caps('ROAD ' + (i + 1) + ' OF ' + M.N, INK2, 2)}</p></div>`; }
      else { const km = R.roadKmKnown ? R.bestKm : R.bestNight;
        box.innerHTML = `<div class="jdet" style="--rc:${rcol(R)}"><span class="jbk">${R.L.kanji}</span><h3>${esc(R.L.name)}</h3><p>${esc(R.L.note || 'The first road of the night.')}</p><p>${caps(R.x.place || '', INK2, 2)} · ${R.nights} ${R.nights === 1 ? 'night' : 'nights'} · ${caps('FIRST', INK2, 2)} ${dstr(R.first.t)}</p></div>
          <div class="jweb" aria-label="Forks"><div class="c l">${from.length ? from.slice(0, 2).map(j => chip(j, 'FROM')).join('') : `<span class="jchip">${caps(M.starts.has(i) ? 'START' : '—', INK, 2)}</span>`}</div><span class="me">${R.L.kanji}<small>${km.toFixed(1)} km</small></span><div class="c r">${(() => { const to = M.out(i).sort((x, y) => y.n - x.n).slice(0, 2).map(e => chip(e.b, 'TO')), of = M.offered(i).slice(0, 1).map(e => chip(e.b, 'PASSED', true)); return to.concat(of).join('') || `<span class="jchip">${caps('NIGHT ENDED HERE', INK, 2)}</span>`; })()}</div></div>
          `; box.querySelector('.me').title = R.roadKmKnown ? 'Best distance on this road in one night' : 'Best whole night that rode through here'; }
      if(this.redraw && prev !== i) this.redraw(); } }; };
// ---- 2 the stamp book
PAGES.stamps = (M, G) => { const T = TABS[1], all = M.stamps.roads.concat(M.stamps.sights), got = all.filter(s => s.got).length;
  const cols = G.wide ? 5 : 3, cellW = (G.pw - (G.wide ? 70 : 50)) / cols, k = cellW >= 100 ? 2 : cellW >= 66 ? 2 : 1, sz = 47 * k;
  const cell = (s, n) => `<button type="button" class="jst jsel ${s.got ? 'g' : 'u'}" data-ji data-stamp="${esc(s.id)}" style="--i:${n};--sz:${sz}px" aria-label="${s.got ? esc(s.name) : 'Blank stamp'}"><canvas class="s"></canvas>${s.got ? '<canvas class="d"></canvas>' : ''}</button>`;
  const head = header(T, `<b>${got}<small style="font-size:16px"> / ${all.length}</small></b>stamps`);
  const L = `${tate(T)}${head}<div class="jsec"><b>道</b><span>${caps('ROADS', INK, 2)} ${M.stamps.roads.filter(s => s.got).length} / ${M.stamps.roads.length}</span></div><div class="jsgrid" style="--cols:${cols};--cellh:${sz + 20}px">${M.stamps.roads.map(cell).join('')}</div><div class="jcap" aria-live="polite"></div>${folio(3)}`;
  const R = `<div class="jsec"><b>見物</b><span>${caps('SIGHTS', INK, 2)} ${M.stamps.sights.filter(s => s.got).length} / ${M.stamps.sights.length}</span></div><div class="jsgrid" style="--cols:${cols};--cellh:${sz + 20}px">${M.stamps.sights.map((s, n) => cell(s, n + 13)).join('')}</div><div class="jrar" aria-hidden="true"><span><i class="r"></i>稀 ${caps('RARE', INK, 2)}</span><span><i class="a"></i>常 ${caps('AMBIENT', INK, 2)}</span><span><i class="l"></i>名所 ${caps('LANDMARK', INK, 2)}</span><span><i class="d"></i>${caps('DATE CHOP: FIRST NIGHT', INK2, 2)}</span></div>${folio(4)}`;
  return { L, R, init(root){ root.querySelectorAll('.jst').forEach(b => { const s = all.find(x => x.id === b.dataset.stamp); if(!s) return; const c = stampCanvas(s), cv = b.querySelector('canvas.s');
      cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); cv.style.width = c.width * k + 'px'; cv.style.height = c.height * k + 'px';
      const dc = b.querySelector('canvas.d'); if(dc && s.t){ const lbl = s.night ? 'NIGHT ' + s.night : s.ride ? 'RIDE ' + s.ride : '', ch = dateChop(s.t, lbl, s.id); dc.width = ch.width; dc.height = ch.height; dc.getContext('2d').drawImage(ch, 0, 0); dc.style.width = ch.width * k + 'px'; dc.style.height = ch.height * k + 'px'; }
      else if(dc) dc.remove(); if(!s.got){ const q = document.createElement('span'); q.className = 'q'; q.textContent = '？'; b.appendChild(q); } }); },
    select(el){ const s = all.find(x => x.id === el.dataset.stamp); S.sel.stamps = el.dataset.stamp; const box = S.root.querySelector('.jcap'); if(!box || !s) return;
      const tierTag = s.kind === 'road' ? '' : s.tier === 'hero' ? `<span class="jtier">稀 ${caps('RARE', SHU, 2)}</span>` : s.tier === 'ambient' ? `<span class="jtier a">常 ${caps('AMBIENT', '#1a5a7a', 2)}</span>` : `<span class="jtier l">名所 ${caps('LANDMARK', '#1f6a4a', 2)}</span>`;
      if(!s.got){ const hint = s.kind === 'road' ? (() => { const i = s.R.i, via = [...M.seen.values()].find(e => e.b === i && M.roads[e.a].nights); return via ? `Offered at a fork on ${M.roads[via.a].L.name}; you rode the other way.` : 'A road you have not found yet. Forks offer new ones.'; })() : s.m.hint;
        box.innerHTML = `<span class="kj q">？</span><h3>${caps('BLANK', INK2, 4)}${tierTag}</h3><p>${esc(hint)}</p><p>${caps(s.kind === 'road' ? 'ROAD STAMP' : 'SIGHT STAMP', INK2, 2)}</p>`; return; }
      const when = s.exact || s.kind === 'road' ? `First stamped ${dstr(s.t)}${s.night ? ', night ' + s.night : s.ride ? ', ride ' + s.ride : ''}.` : `First seen on ride ${s.ride}; last seen ${dstr(s.t)}.`;
      box.style.setProperty('--rc', s.ink); box.innerHTML = `<span class="kj">${esc(s.kj)}</span><h3>${esc(s.kind === 'road' ? s.name : s.m.kanji + ' ' + s.name)}${tierTag}</h3><p>${when}</p><p>${s.kind === 'road' ? `Ridden on ${s.n} ${s.n === 1 ? 'night' : 'nights'}.` : `Seen ${s.n} ${s.n === 1 ? 'time' : 'times'}.`}</p>`; } }; };
// ---- 3 rival files
function gangPortrait(gi, met){ const c = mkc(48, 64), g = c.getContext('2d'); g.imageSmoothingEnabled = false; const D = window.MECH && MECH.gang && MECH.gang._dbg;
  try{ if(D && D.comp){ g.drawImage(D.comp(0, gi, 0, 0), 0, 0); if(D.flagSprite){ const f = D.flagSprite(gi, 1); g.drawImage(f, 34, 2); } } }catch(e){}
  const d = g.getImageData(0, 0, 48, 64), px = d.data; let any = false; for(let i = 3; i < px.length; i += 4) if(px[i]){ any = true; break; }
  if(!any){ const rows = ['....XXXX....', '...XXXXXX...', '..XXXXXXXX..', '..XXXXXXXX..', '...XXXXXX...', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX'];
    g.fillStyle = GANGS[gi].col[3]; rows.forEach((r, y) => [...r].forEach((ch, x) => { if(ch === 'X') g.fillRect(18 + x, 34 + y * 3, 1, 3); })); }
  if(!met){ const dd = g.getImageData(0, 0, 48, 64); for(let i = 0; i < dd.data.length; i += 4) if(dd.data[i + 3]){ dd.data[i] = 30; dd.data[i + 1] = 24; dd.data[i + 2] = 36; } g.putImageData(dd, 0, 0); }
  return c; }
PAGES.rivals = (M, G) => { const T = TABS[2], perGang = M.gangs.some(x => x.met || x.td), metN = M.gangs.filter(x => x.met || x.td).length;
  const head = header(T, `<b>${metN}<small style="font-size:16px"> / ${GANGS.length}</small></b>gangs met`);
  const cards = M.gangs.map(x => { const met = x.met || x.td; return `<button type="button" class="jgang jsel${met ? '' : ' un'}" data-ji data-gang="${x.gi}" style="--g4:${x.g.col[4]}"><span class="fl"><canvas></canvas></span>
    <span class="nm"><b>${met ? x.g.kanji : '？？'}</b>${caps(met ? x.g.name : 'NOT MET YET', met ? INK : INK2, 2)}</span><span class="wl">${met ? `${x.won}<small style="font-size:16px">勝</small> ${x.lost}<small style="font-size:16px">敗</small>` : ''}</span></button>`; }).join('');
  const lg = M.legacy, legacy = lg.duels + lg.td > 0 ? `<p class="jnote">${perGang ? 'Older nights' : 'Your nights so far'}: ${lg.duels} ${lg.duels === 1 ? 'duel' : 'duels'}, ${lg.won} won, ${lg.td} ${lg.td === 1 ? 'takedown' : 'takedowns'}. Which gang it was wasn't written down then.</p>` : '';
  const L = `${tate(T)}${head}<p class="jsub">Gangs you have duelled on the road. Win a duel and their file fills in.</p><div class="jgl">${cards}</div>${legacy}${folio(5)}`;
  return { L, R:`<div class="jdosbox"></div>${folio(6)}`,
    init(root){ root.querySelectorAll('.jgang').forEach(b => { const x = M.gangs[+b.dataset.gang], c = gangPortrait(x.gi, x.met || x.td), cv = b.querySelector('canvas'), crop2 = mkc(30, 34);
      crop2.getContext('2d').drawImage(c, -9, -28); cv.width = 30; cv.height = 34; cv.getContext('2d').drawImage(crop2, 0, 0); cv.style.width = '60px'; cv.style.height = '68px'; }); },
    select(el){ const x = M.gangs[+el.dataset.gang]; S.sel.rivals = x.gi; const box = S.root.querySelector('.jdosbox'); if(!box) return; const met = x.met || x.td, g = x.g;
      const pc = gangPortrait(x.gi, met), port = `<div class="jport" style="--g4:${met ? g.col[4] : PAPER2};--g2:${met ? g.col[3] : PAPER3}"><canvas width="48" height="64" style="width:144px;height:192px"></canvas><span class="tag">${met ? g.kanji : '未遭遇'}</span></div>`;
      if(!met){ box.innerHTML = `<div class="jdos">${port}<div><h3 style="color:${INK2}">？？</h3><p class="rd">${caps('NOT MET YET', INK2, 3)}</p><p class="jsub">They ride in packs and fly a nobori flag. You'll know their colours when you see them.</p></div></div>`; }
      else { const roads = Object.entries(x.roads).sort((a, b) => b[1] - a[1]).map(([k, n]) => { const L = lands().find(l => l.key === k); return L ? `${L.kanji} ${esc(L.name)} ×${n}` : ''; }).filter(Boolean).slice(0, 3);
        const seq = x.seq.slice(-24); box.innerHTML = `<div class="jdos">${port}<div><h3 style="color:${mix(g.col[2], INK, .25)}">${g.kanji}</h3><p class="rd">${caps(g.name, INK, 3)} · ${esc(g.read)}</p>
          <div class="jfacts"><span><b>${x.met}</b>${x.met === 1 ? 'duel' : 'duels'}</span><span><b>${x.won}</b>won</span><span><b>${x.lost}</b>lost</span><span><b>${x.td}</b>${x.td === 1 ? 'takedown' : 'takedowns'}</span></div></div></div>
          <div class="jsec" style="margin-top:12px"><b>星取表</b><span>${caps('EVERY DUEL, IN ORDER', INK2, 2)}</span></div><div class="jhoshi" aria-label="${x.won} won, ${x.lost} lost">${x.seq.length > 24 ? `<small>+${x.seq.length - 24}</small>` : ''}${seq.map(v => `<i class="${v ? 'w' : 'l'}" title="${v ? 'won' : 'lost'}"></i>`).join('')}</div>
          <div class="jfacts" style="margin-top:10px"><span>${caps('FIRST MET', INK2, 2)} ${dstr(x.first.t)} · night ${x.firstN}</span><span>${caps('LAST', INK2, 2)} ${dstr(x.last.t)}</span></div>
          ${roads.length ? `<p class="jnote">Where you meet them: ${roads.join(' · ')}</p>` : ''}
          <div class="jgfoot"><div class="jflag"><canvas width="16" height="35" style="width:48px;height:105px"></canvas><span>旗 ${caps('FLAG', INK2, 2)}</span></div>
            <div class="jgcol"><div class="jsec"><b>色</b><span>${caps('COLOURS', INK2, 2)}</span></div><div class="jramp">${g.col.map(c => `<i style="background:${c}"></i>`).join('')}</div>
            ${(() => { const d = x.list[x.list.length - 1]; if(!d) return ''; const L = lands().find(l => l.key === d.road); return `<p class="jsub" style="margin-top:10px">${caps('LAST DUEL', INK2, 2)} ${d.won ? 'Won' : 'Lost'}${L ? ' on ' + esc(L.name) : ''}, ${dstr(d.t)} (night ${d.n}).</p>`; })()}</div></div>`; }
      const cv = box.querySelector('.jport canvas'); if(cv){ const g2 = cv.getContext('2d'); g2.imageSmoothingEnabled = false; g2.drawImage(pc, 0, 0); }
      const fc = box.querySelector('.jflag canvas'), D = window.MECH && MECH.gang && MECH.gang._dbg; if(fc && D && D.flagSprite) try{ fc.getContext('2d').drawImage(D.flagSprite(x.gi, 1), 0, 0); }catch(e){} } }; };
// ---- 4 the garage
PAGES.garage = (M, G) => { const T = TABS[3], list = window.ENV && ENV.bikes && Array.isArray(ENV.bikes.list) && ENV.bikes.list.length ? ENV.bikes.list : [{ id:'sport', name:'Sport', note:'the default racer' }];
  let bi = Math.max(0, list.findIndex(b => b.id === M.riding)); if(S.sel.garageBike != null) bi = cl(S.sel.garageBike, 0, list.length - 1);
  const showH = G.wide ? Math.min(300, G.bh - 300) : 220;
  const head = header(T, `<b>${list.length}</b>bikes`);
  const L = `${tate(T)}${head}<div class="jshow" style="--showh:${showH}px"><canvas width="${30 * (G.wide ? 7 : 5)}" height="${32 * (G.wide ? 7 : 5)}"></canvas><button type="button" class="jarr p jsel" data-ji data-step="-1" aria-label="Previous bike">◀</button><button type="button" class="jarr n jsel" data-ji data-step="1" aria-label="Next bike">▶</button></div>
    <div class="jplate"><b class="bn"></b><span class="now">${caps('RIDING NOW', CREAM, 2)}</span><span class="ix"></span></div><p class="jsub bnote"></p><p class="jsub">${caps('LOOKS ONLY - EVERY BIKE HANDLES THE SAME', INK2, 2)}</p><p class="jnote">Browse here; choose the bike you ride on the title screen, beside the road.</p>${folio(7)}`;
  const COS = [['特攻服', 'Tokkofuku jacket', 'your kanji, embroidered'], ['塗装', 'Paint and tank art', 'for the bike you ride'], ['兜', 'Helmet', 'designs to wear'], ['警笛', 'Horn', 'a call of your own'], ['排気', 'Exhaust and trail', 'colours for the night']];
  const R0 = `<div class="jsec"><b>近日</b><span>${caps('COMING', INK, 2)}</span></div><p class="jsub">Earned only by riding: stamps, rivals, first sightings, clean jumps. No shop, no currency, no timers.</p>
    <div class="jcos">${COS.map(([kj, n, s]) => `<div class="jco"><span class="ic">${kj[0]}</span><b>${kj}</b><span>${esc(n)}<br><small style="font-size:16px;color:${INK2}">${esc(s)}</small></span><span class="soon">近日 ${caps('COMING', '#ffd04a', 2)}</span></div>`).join('')}</div>${folio(8)}`;
  // with ui/cosmetics.js loaded: what you have earned by riding, what you wear, and the next rule in each category (read-only, like the rest of the journal)
  const CS = window.COS && window.COS.summary ? (() => { try{ return window.COS.summary(); }catch(e){ return null; } })() : null;
  const R = CS ? `<div class="jsec"><b>改造</b><span>${caps('EARNED BY RIDING', INK, 2)}</span></div><p class="jsub">Every look here was ridden, not bought: no shop, no currency, no timers, no luck. Change them in the garage on the title screen (改造).</p>
    <div class="jcos">${CS.map(x => `<div class="jco${x.got > 1 ? ' on' : ''}"><span class="ic">${x.cat.kj[0]}</span><b>${x.cat.kj} <small style="font-size:16px;color:${INK2}">${x.got} / ${x.total}</small></b><span>${esc(x.wearing ? x.wearing.name : '')}<br><small style="font-size:13px;color:${INK2}">${esc(x.next ? 'Next: ' + x.next.text : 'All earned')}</small></span></div>`).join('')}
      <div class="jco on"><span class="ic">背</span><b>背中</b><span>${esc(window.COS.state().eq.kanji)}<br><small style="font-size:13px;color:${INK2}">on your jacket back · yours to choose</small></span></div></div>${folio(8)}` : R0;
  return { L, R, init(root){ this.show(root, bi); },
    show(root, i){ bi = (i + list.length) % list.length; S.sel.garageBike = bi; const b = list[bi], cv = root.querySelector('.jshow canvas'); if(!cv) return;
      try{ if(window.ENV && ENV.bikes && ENV.bikes.preview) ENV.bikes.preview(b.id, cv); else { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); } }catch(e){}
      root.querySelector('.bn').textContent = String(b.name || b.id).toUpperCase(); root.querySelector('.bnote').textContent = (b.note || '') + (M.bikeNights[b.id] ? ` · ${M.bikeNights[b.id]} ${M.bikeNights[b.id] === 1 ? 'night' : 'nights'} on it` : '');
      root.querySelector('.now').style.visibility = b.id === M.riding ? 'visible' : 'hidden'; root.querySelector('.ix').innerHTML = caps((bi + 1) + '/' + list.length, INK2, 2); },
    act(el){ if(el.dataset.step){ this.show(S.root, bi + +el.dataset.step); SFX.tick(); } } }; };
// ---- 5 records: totals as they are, no streaks
PAGES.records = (M, G) => { const T = TABS[4], R = M.rec, best = R.best, bl = best && (lands().find(l => l.name === best.land) || null);
  const head = header(T);
  const big = R.nights ? `<div class="jbig">
      <div style="--ht:#e0b8a0"><span>走った夜<small>${caps('NIGHTS RIDDEN', INK2, 2)}</small></span><b>${R.nights}</b></div>
      <div class="two" style="--ht:${PAPER3}"><span>夜明け ${caps('DAWN', INK2, 2)}<br><b>${R.dawns}</b></span><span>御用 ${caps('PULLED OVER', INK2, 2)}<br><b>${R.caught}</b></span></div>
      <div style="--ht:#c8c8b0"><span>総距離<small>${caps('TOTAL DISTANCE', INK2, 2)}</small></span><b>${R.km.toFixed(1)}<small> km</small></b></div>
      <div style="--ht:#e0b8a0"><span>最長<small>${caps('BEST NIGHT', INK2, 2)}${best ? `<br>${bl ? bl.kanji + ' ' : ''}${esc(best.land || '')}, ${dstr(best.t)}` : ''}</small></span><b>${(best ? best.km || 0 : 0).toFixed(1)}<small> km</small></b></div>
      <div style="--ht:#b8c8c8"><span>最高フロー<small>${caps('LONGEST FLOW', INK2, 2)}</small></span><b>${R.flow}</b></div></div>`
    : `<p class="jempty">No nights in the journal yet. Every night you finish, at dawn or pulled over, is written down here as it was.</p>`;
  const L = `${tate(T)}${head}${big}${folio(9)}`;
  const tal = [['撃墜', 'TAKEDOWNS', R.takedowns], ['着地', 'CLEAN LANDINGS', R.clean], ['跳躍', 'JUMPS', R.jumps], ['勝負', 'DUELS WON', R.duelsWon + (R.duels ? `<i> / ${R.duels}</i>` : '')], ['紙一重', 'CLOSE CALLS', R.close],
    ['加速', 'BIG BOOSTS', R.bigBoosts], ['関門', 'CHECKPOINTS', R.gates], ['検問', 'ROADBLOCKS', R.roadblocks], ['転倒', 'CRASHES', R.crashes], ['道', 'ROADS FOUND', M.roads.filter(x => x.nights).length + `<i> / ${M.N}</i>`]];
  if(R.shinkansen) tal.push(['新幹線', 'TRAINS BEATEN', R.shinkansen]);
  const last = M.recs.slice(-7).reverse(), n0 = M.recs.length;
  const ledger = last.length ? `<table class="jledger"><thead><tr><th>${caps('NIGHT', INK2, 2)}</th><th>${caps('DATE', INK2, 2)}</th><th>${caps('ROAD', INK2, 2)}</th><th style="text-align:right">${caps('KM', INK2, 2)}</th><th>${caps('END', INK2, 2)}</th></tr></thead><tbody>
    ${last.map((r, j) => { const l = lands().find(x => x.name === r.land); return `<tr><td>${n0 - j}</td><td>${dshort(r.t)}</td><td>${l ? l.kanji + ' ' : ''}${esc(r.land || '')}</td><td style="text-align:right">${(r.km || 0).toFixed(1)}</td><td><span class="e ${r.end === 'caught' ? 'c' : 'd'}">${r.end === 'caught' ? '御用' : '夜明'}</span></td></tr>`; }).join('')}</tbody></table>` : '';
  const Rp = `<div class="jtal">${tal.map(([kj, en, v]) => `<div><span>${kj}</span>${caps(en, INK2, 2)}<b>${v}</b></div>`).join('')}</div>${ledger}
    <p class="jhon">${R.nights ? `Since ${dstr(R.first.t)}.` : ''} No streaks, no daily anything. Ride when you want to.</p>${folio(10)}`;
  return { L, R:Rp }; };

/* ================================================================== building, selection and the page turn */
function build(tabI){ const G = geom(), T = TABS[tabI], P = PAGES[T.id](S.M, G); const sp = document.createElement('div'); sp.className = 'jspread'; sp.dataset.tab = tabI;
  let L, R; if(G.wide){ L = pageEl('L', P.L); R = pageEl('R', P.R); sp.appendChild(L); sp.appendChild(R); }
  else { L = pageEl('N', P.L + '<div class="jnarr"></div>' + P.R); sp.appendChild(L); }
  sp._P = P; sp._L = L; sp._R = R; return sp; }
function items(){ return S.spread ? [...S.spread.querySelectorAll('[data-ji]')] : []; }
function select(el, quiet){ if(!el || !S.spread) return; S.spread.querySelectorAll('.jsel.on').forEach(x => { x.classList.remove('on'); x.removeAttribute('aria-current'); }); el.classList.add('on'); el.setAttribute('aria-current', 'true');
  if(document.activeElement !== el) try{ el.focus({ preventScroll:true }); }catch(e){}
  const pg = el.closest('.jpage'); if(!quiet && pg && pg.scrollHeight > pg.clientHeight + 2){ const r = el.getBoundingClientRect(), pr = pg.getBoundingClientRect(); if(r.top < pr.top + 8 || r.bottom > pr.bottom - 8) el.scrollIntoView({ block:'nearest' }); }
  const P = S.spread._P; if(P.select) P.select(el, S.spread); if(!quiet) SFX.tick(); }
function initSpread(sp){ const P = sp._P; if(P.init) P.init(sp); }
function firstSel(sp){ const T = TABS[+sp.dataset.tab], all = [...sp.querySelectorAll('[data-ji]')];
  if(T.id === 'atlas'){ const i = S.sel.atlas; return sp.querySelector(`.jrow[data-road="${i}"]`) || all[0]; }
  if(T.id === 'stamps') return (S.sel.stamps && sp.querySelector(`.jst[data-stamp="${CSS.escape(S.sel.stamps)}"]`)) || sp.querySelector('.jst.g') || all[0];
  if(T.id === 'rivals') return sp.querySelector(`.jgang[data-gang="${S.sel.rivals}"]`) || all[0];
  if(T.id === 'garage') return sp.querySelector('.jarr.n') || all[0];
  return all[0]; }
// spatial navigation: the nearest item in the pressed direction
function nav(dir){ const list = items(); if(!list.length) return; const cur = S.spread.querySelector('.jsel.on') || list[0], a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bd = 1e9; for(const el of list){ if(el === cur) continue; const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, dx = bx - ax, dy = by - ay;
    const main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx); if(main <= 4) continue;
    const d = main + side * 2.2; if(d < bd){ bd = d; best = el; } }
  if(best) select(best); else if(dir === 'left' || dir === 'right') turnTo(S.tab + (dir === 'left' ? -1 : 1)); }
function setTabs(){ S.root.querySelectorAll('.jtab').forEach((t, i) => { const on = i === S.tab; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; }); }
function place(sp){ S.stage.appendChild(sp); S.spread = sp; initSpread(sp); const el = firstSel(sp); if(el) select(el, true); }
function turnTo(i, instant){ if(S.busy || !S.root) return; const n = TABS.length; i = (i % n + n) % n; if(i === S.tab && S.spread) return;
  const dir = i > S.tab ? 1 : -1, old = S.spread; S.tab = i; setTabs(); const fresh = build(i);
  S.root.classList.remove('slam'); if(TABS[i].id === 'stamps' && !RM()) S.root.classList.add('slam');
  if(!old || instant){ if(old) old.remove(); place(fresh); landHead(fresh); return; }
  SFX.page(); const dur = SIX * 4;
  if(RM()){ S.busy = true; fresh.classList.add('jfade'); place(fresh); setTimeout(() => { old.remove(); fresh.classList.remove('jfade'); S.busy = false; }, SIX * 2 + 30); return; }
  S.busy = true; const G = geom(); initSpread(fresh);   // draw the new pages' canvases before they are split onto the leaf
  if(G.wide){ // the bottom spread shows what the leaf uncovers: old left + new right going forward, new left + old right going back
    const bottom = document.createElement('div'); bottom.className = 'jspread';
    const leafEl = document.createElement('div'); leafEl.className = 'jleaf ' + (dir > 0 ? 'f' : 'b');
    const face = (slot, back) => { slot.classList.add(back ? 'back' : 'front'); leafEl.appendChild(slot); };
    if(dir > 0){ bottom.appendChild(old._L); bottom.appendChild(fresh._R); face(old._R, false); face(fresh._L, true); }
    else { bottom.appendChild(fresh._L); bottom.appendChild(old._R); face(old._L, false); face(fresh._R, true); }
    old.remove(); S.stage.appendChild(bottom); S.stage.appendChild(leafEl);
    // init page content now (canvases draw into the moved nodes), then rebuild the final spread when the leaf lands
    S.spread = { _P:fresh._P, querySelector:s => S.stage.querySelector(s), querySelectorAll:s => S.stage.querySelectorAll(s) };
    setTimeout(() => { fresh.innerHTML = ''; fresh._L.classList.remove('front', 'back'); fresh._R.classList.remove('front', 'back'); fresh.appendChild(fresh._L); fresh.appendChild(fresh._R);
      bottom.remove(); leafEl.remove(); S.stage.appendChild(fresh); S.spread = fresh; const el = firstSel(fresh); if(el) select(el, true); landHead(fresh); S.busy = false; }, dur + 20); }
  else { const leafEl = document.createElement('div'); leafEl.className = 'jleaf n'; old._L.classList.add('front'); leafEl.appendChild(old._L);
    const blank = pageEl('N back', ''); leafEl.appendChild(blank); old.remove(); S.stage.appendChild(fresh); S.spread = fresh; { const el = firstSel(fresh); if(el) select(el, true); } S.stage.appendChild(leafEl);
    setTimeout(() => { leafEl.remove(); landHead(fresh); S.busy = false; }, dur + 20); } }
function landHead(sp){ if(RM()) return; sp.classList.add('jland'); setTimeout(() => sp.classList.remove('jland'), SIX * 3); }

/* ================================================================== input: keyboard (captured while open), gamepad, touch */
const KEYS = { ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down', ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', Enter:'ok', NumpadEnter:'ok', Space:'ok',
  Escape:'back', Backspace:'back', KeyQ:'prev', PageUp:'prev', BracketLeft:'prev', KeyE:'next', PageDown:'next', BracketRight:'next', Tab:'tabkey' };
function cmd(c, e){ if(!S.root) return;
  if(c === 'back') return hide();
  if(S.busy) return;
  if(c === 'prev' || c === 'next') return turnTo(S.tab + (c === 'prev' ? -1 : 1));
  if(c === 'tabkey') return turnTo(S.tab + (e && e.shiftKey ? -1 : 1));
  if(c === 'ok'){ const el = S.spread && S.spread.querySelector('.jsel.on'); if(el && S.spread._P.act) S.spread._P.act(el); return; }
  if(c === 'up' || c === 'down' || c === 'left' || c === 'right') return nav(c); }
function onKey(e){ if(!JN.open) return; e.stopImmediatePropagation(); const k = e.code; if(e.ctrlKey || e.metaKey || e.altKey) return;
  if(/^Digit[1-5]$/.test(k)){ e.preventDefault(); turnTo(+k.slice(5) - 1); return; }
  const c = KEYS[k]; if(!c) return; e.preventDefault(); if(e.repeat && (c === 'back' || c === 'ok' || c === 'prev' || c === 'next')) return; cmd(c, e); }
function onKeyUp(e){ if(!JN.open) return; e.stopImmediatePropagation(); if(KEYS[e.code]) e.preventDefault(); }
const pads = () => { if(!navigator.getGamepads) return null; const gs = navigator.getGamepads(); for(let i = 0; i < gs.length; i++) if(gs[i]) return gs[i]; return null; };
function padState(gp){ const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  return { up:ay < -.5 || b(12), down:ay > .5 || b(13), left:ax < -.5 || b(14), right:ax > .5 || b(15), ok:b(0), back:b(1) || b(9) || b(8), prev:b(4) || b(6), next:b(5) || b(7) }; }
function padLoop(){ cancelAnimationFrame(S.raf); const tick = () => { if(!JN.open) return; const gp = pads();
    if(gp){ const now = padState(gp), t = performance.now();
      for(const c of ['up', 'down', 'left', 'right', 'ok', 'back', 'prev', 'next']){ if(now[c] && !S.pad[c]){ S.padT[c] = t + 300; cmd(c); if(!JN.open) return; }
        else if(now[c] && (c === 'up' || c === 'down' || c === 'left' || c === 'right') && t > (S.padT[c] || 0)){ S.padT[c] = t + 120; cmd(c); } }
      S.pad = now; }
    S.raf = requestAnimationFrame(tick); }; S.raf = requestAnimationFrame(tick); }
// title screen: J or pad Y / Select opens the journal
addEventListener('keydown', e => { if(JN.open || (window.COS && window.COS.open) || document.body.classList.contains('paused') || e.code !== 'KeyJ' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; const sh = document.getElementById('sheet');
  if(document.getElementById('attract') && sh && !sh.hidden){ e.preventDefault(); e.stopImmediatePropagation(); show({ from:'title' }); } }, true);
let titlePadPrev = {}, titlePadOn = false;
function titlePad(){ if(titlePadOn) return; titlePadOn = true; const tick = () => { const gp = pads(); if(!gp){ titlePadOn = false; return; } const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), now = { y:b(3), sel:b(8) };
    const sh = document.getElementById('sheet'); if(!JN.open && !(window.COS && window.COS.open) && !document.body.classList.contains('paused') && document.getElementById('attract') && sh && !sh.hidden && ((now.y && !titlePadPrev.y) || (now.sel && !titlePadPrev.sel))) show({ from:'title' });
    titlePadPrev = now; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
addEventListener('gamepadconnected', titlePad);

/* ================================================================== open and close */
function fontsReady(){ if(!document.fonts || !document.fonts.load) return Promise.resolve(); return Promise.race([document.fonts.load('16px DotGothic16', KANJI_ALL).catch(() => {}), new Promise(r => setTimeout(r, 900))]); }
function show(o){ o = o || {}; if(JN.open) return; JN.open = true; injectCSS(); SFX.init(); S.from = o.from || 'title'; S.back = typeof o.back === 'function' ? o.back : null; S.ret = document.activeElement;
  S.M = model(); S.pad = (() => { const gp = pads(); return gp ? padState(gp) : {}; })();   // buttons held while opening don't fire
  const tab = typeof o.tab === 'string' ? Math.max(0, TABS.findIndex(t => t.id === o.tab)) : Number.isInteger(o.tab) ? o.tab : S.tab;
  const G = geom(), root = document.createElement('div'); root.id = 'jnl'; root.className = (G.wide ? '' : 'nar ') + 'in'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Night Rider Journal');
  root.style.setProperty('--bw', G.bw + 'px'); root.style.setProperty('--bh', G.bh + 'px'); root.style.setProperty('--six', SIX + 'ms'); root.style.setProperty('--turn', SIX * 4 + 'ms');
  root.innerHTML = `<div class="jslash" aria-hidden="true"></div>
    <div class="jtop"><div class="jttl" aria-hidden="true"><b>夜走手帖</b>${caps('NIGHT RIDER JOURNAL', CREAM, 2)}</div>
      <span class="jkey" aria-hidden="true"><kbd>Q</kbd></span><div class="jtabs" role="tablist" aria-label="Journal sections">${TABS.map((t, i) => `<button type="button" class="jtab" role="tab" data-tab="${i}" style="--r:${[-2, 1.5, -1, 2, -1.5][i]}deg;animation-delay:${i * 40}ms"><span class="k">${t.kj}</span>${caps(t.en, CREAM, 2, '#000')}</button>`).join('')}</div><span class="jkey" aria-hidden="true"><kbd>E</kbd></span>
      <button type="button" class="jx" aria-label="Close the journal">${caps(S.from === 'pause' ? 'BACK' : 'CLOSE', CREAM, 2)} 戻る</button></div>
    <div class="jbook"><div class="jstage"></div><span class="jspine" aria-hidden="true"${G.wide ? '' : ' hidden'}></span></div>
    <div class="jfoot" aria-hidden="true"><span><kbd>Q</kbd><kbd>E</kbd>${caps('TURN THE PAGE', CREAM, 2)}</span><span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd>${caps('LOOK', CREAM, 2)}</span><span><kbd>Esc</kbd>${caps(S.from === 'pause' ? 'BACK TO PAUSE' : 'CLOSE', CREAM, 2)}</span><span>${caps('PAD: LB RB - B BACK', CREAM, 2)}</span><span>${caps('TOUCH: SWIPE THE PAGE', CREAM, 2)}</span></div>`;
  document.body.appendChild(root); S.root = root; S.stage = root.querySelector('.jstage'); S.spread = null; S.busy = false; S.tab = cl(tab, 0, TABS.length - 1); setTabs();
  root.querySelectorAll('.jtab').forEach(t => t.onclick = () => turnTo(+t.dataset.tab)); root.querySelector('.jx').onclick = () => hide();
  root.addEventListener('click', e => { const it = e.target.closest('[data-ji]'); if(it && S.spread && S.stage.contains(it)){ select(it); if(S.spread._P.act) S.spread._P.act(it); } });
  root.addEventListener('pointermove', e => { if(e.pointerType !== 'mouse') return; const it = e.target.closest('[data-ji]'); if(it && !it.classList.contains('on') && S.stage.contains(it) && !S.busy) select(it, true); });
  let sx = null, sy = null; S.stage.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; }); S.stage.addEventListener('pointerup', e => { if(sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) turnTo(S.tab + (dx < 0 ? 1 : -1)); });
  S.keyH = onKey; S.keyUpH = onKeyUp; addEventListener('keydown', S.keyH, true); addEventListener('keyup', S.keyUpH, true);
  SFX.open(true); padLoop();
  fontsReady().then(() => { if(S.root !== root) return; GLC.clear(); STC.clear(); turnTo(S.tab, true); setTimeout(() => root.classList.remove('in'), SIX * 4); });
  addEventListener('resize', onResize); }
function onResize(){ if(!JN.open || !S.root) return; const G = geom(); S.root.classList.toggle('nar', !G.wide); S.root.style.setProperty('--bw', G.bw + 'px'); S.root.style.setProperty('--bh', G.bh + 'px');
  S.root.querySelector('.jspine').hidden = !G.wide; if(S.busy) return; const t = S.tab; if(S.spread) S.spread.remove(); S.spread = null; turnTo(t, true); }
function hide(){ if(!JN.open || !S.root) return; const root = S.root; JN.open = false; cancelAnimationFrame(S.raf); removeEventListener('keydown', S.keyH, true); removeEventListener('keyup', S.keyUpH, true); removeEventListener('resize', onResize);
  SFX.open(false); S.root = null; S.spread = null; S.stage = null; S.busy = false; S.sel.garageBike = null;
  const done = () => { root.remove(); const back = S.back; S.back = null; if(back) try{ back(); }catch(e){ console.warn('journal back', e); } else if(S.ret && S.ret.isConnected) try{ S.ret.focus({ preventScroll:true }); }catch(e){} };
  if(RM()) done(); else { root.classList.add('out'); setTimeout(done, SIX * 1.5); } }
JN.show = show; JN.hide = hide; JN.turnTo = i => turnTo(typeof i === 'string' ? TABS.findIndex(t => t.id === i) : i); JN.cmd = cmd; JN.TABS = TABS;
Object.defineProperty(JN, 'busy', { get:() => S.busy });
})();
