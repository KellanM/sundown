/* Sundown mechanic module: gang. See mech/README.md.
   Rival bōsōzoku riders, duels, kicks and takedowns.

   References studied (rules taken, nothing copied):
   - Super Hang-On (Sega, 1987), rival bikes seen from behind: rivals are built exactly like the player's bike and told apart by livery
     colour blocks; they lean as hard as you do in bends, and read at a distance by one or two bold colours.
   - Road Rash II (EA, 1992): fights happen side by side with both bikes at the same scale; one attack per button, aimed left or right;
     a hit knocks the other bike off its line rather than killing it outright; the status panel is chunky bars in a black frame.
   - Burnout 3 (Criterion, 2004), takedowns: you never wreck a rival directly; you push them into a wall or traffic, and that pays
     you in boost. (The takedown camera is out of scope; the wreck stays in view by sliding on beside you.)
   - Tokyo Xtreme Racer (Genki, 1999): the SP battle, two bars at the top of the screen, yours and theirs; being ahead drains theirs,
     being far behind drains yours; the battle is short and ends when a bar empties.
   - Bōsōzoku photos (Wikimedia Commons: "Bōsōzoku at Kobe", "JapaneseBosozoku", "TT061213G bōsōzoku", "Kaminari-zoku", the gang
     rally photo in the article): long tokkōfuku coats with gold-embroidered crests and kanji down the back, a red tasuki sash crossed
     over the back, regent pompadours and pudding-bowl half helmets, satin sukajan jackets with an embroidered emblem, tall sandan
     seat-backs, takeyari pipes, and packs riding staggered across the road. No real gang names or crests are used.

   Rules here: a pack of one to three riders turns up every half minute or so (ahead, or pulling up beside you from behind). The
   leader challenges you to a short duel (a TXR-style meter). Z/J kicks left and X/K kicks right (pad X / B, or the two 蹴 buttons
   on touch). A kicked rider is knocked off line; knocked into the barrier or a car, they go down: a takedown pays a boost and flow.
   Rivals kick back only after a clear wind-up (a cocked leg and a "!"), which you can dodge or beat with your own kick; their kick
   wobbles you and costs speed but never crashes you. Kicks and takedowns never bring the police; riding into the back of a rival
   at a big speed difference is a crash, like hitting a car. */
"use strict";
(() => {
const G = MECH.gang = {};
G.sfx = true;   // kicks and takedowns call audio/sfx.js directly (switches off its counter fallback)

/* ------------------------------------------------------------------ gangs and palettes */
// each gang has a colour ramp (highlight, light, mid, dark, deepest) and a dark-hue outline
const GANGS = [
  { key:'guren',  name:'GUREN',  kanji:'紅蓮', col:['#ffb0b4', '#ff5a6a', '#d81e3a', '#8a0c26', '#3a0614'], K:'#1c0610' },
  { key:'shiden', name:'SHIDEN', kanji:'紫電', col:['#e6c8ff', '#b07aff', '#7a3ae0', '#44188a', '#1e0a40'], K:'#120820' },
  { key:'hakuro', name:'HAKURO', kanji:'白狼', col:['#c8f0ff', '#6ac8ff', '#2a7ae0', '#14408a', '#081c40'], K:'#06101e' }
];
const BASEP = { T:'#18161c', t:'#4a4652', R:'#ff2a3a', r:'#a01828', Q:'#ffd8cc', W:'#e4e0ec', V:'#8a8698', A:'#ff9a2a', P:'#e8e4d8', p:'#3a3a48',
  Y:'#ffd04a', y:'#b8862a', O:'#fffaf0', S:'#e8e0d2', s:'#b4a8bc', q:'#6e6284', N:'#24222e', n:'#3e3c58', m:'#0a0910', H:'#221f30', h:'#5a6aa8',
  G:'#1c2238', g:'#5a6a98', w:'#9ab8d8', L:'#4a6aa8', l:'#2a3a6a', E:'#d89a78', e:'#9a5a44' };
const pal = gi => { const g = GANGS[gi]; return Object.assign({}, BASEP, { K:g.K, 0:g.col[0], 1:g.col[1], 2:g.col[2], 3:g.col[3], 4:g.col[4] }); };

/* ------------------------------------------------------------------ sprite builder (rows are LEFT halves, mirrored; light from the upper left:
   highlight keys drop one step on the right half). Same conventions as env/bikes.js. */
const RM = { O:'S', '0':'1', h:'H', n:'N', Y:'y' };
function mk(rows, P, full){
  const n = Math.max(...rows.map(r => r.length)), rs = rows.map(r => full ? r.padEnd(n, '.') : r.padStart(n, '.'));
  const c = document.createElement('canvas'); c.width = full ? n : n * 2; c.height = rs.length; const k = c.getContext('2d');
  rs.forEach((r0, y) => { const r = full ? r0 : r0 + [...r0].reverse().map(ch => RM[ch] || ch).join('');
    for(let x = 0; x < r.length; x++){ let ch = r[x]; if(ch === '.') continue; if(ch === '%') ch = (x + y) % 2 ? '1' : '2'; const col = P[ch]; if(!col) continue; k.fillStyle = col; k.fillRect(x, y, 1, 1); } });
  return c; }
const tyreRows = (hw, h, ph) => Array.from({ length:h }, (_, i) => 'K' + 'T'.repeat(hw - 3) + ((i + ph) % 3 === 0 ? 'TT' : 'tt')).concat(['.' + 'K'.repeat(hw - 1)]);
const tube = (h, x0, x1, body, tip, hw) => Array.from({ length:h }, (_, i) => { const p = Math.round(x1 + (x0 - x1) * i / (h - 1)); return ('.'.repeat(p) + (tip && i < tip.length ? tip[i] : body)).padEnd(hw, '.'); });
const flip = c => c._f || (c._f = flip0(c));
const flip0 = c => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const k = o.getContext('2d'); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return o; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ------------------------------------------------------------------ the three rival looks
   Every rider is built on the sport rider's frame (helmet a sixth of the height, shoulders 16-18 px, legs at the sides) so they sit
   beside the player's bike at the same scale; what changes is the head, the coat and the bike's silhouette. */

// 0: the leader (総長). Regent pompadour with a white hachimaki, long white tokkōfuku with a gold crest and the gang-colour tasuki crossed
//    over the back, gang-colour fairing, short twin pipes, and the gang flag on a pole.
const LEAD_RIDER = [   // regent pompadour from behind: a ragged quiff wider than the head, blue sheen streaks, a dark hairline, a ducktail point, bare nape
  '.....KK.K', '....KhhKh', '...KhhHhH', '..KhhHhHH', '..KhHHhHH', '..KHhHHHh', '..KHHHHHH', '...KmHHHH', '...KmmHHm', '....KEmHH', '....KEEmH', '....KKSSS',
  '..KKOSSSS', '.KOSSSSSY', '.KO2SSSYY', 'KOSS2SSSY', 'KOSSS2SSS', 'KsSSSS2SS', 'KsSSSSS2S', 'KqsSSSSS2', 'KqsSSSS2S', '.KqsSS2SS',
  '.KqqS2SSS', '..KKKKKKK', 'KsK......', 'KssK.....', 'KNNK.....', '.KKK.....'];
const LEAD_TAIL = ['KKKKKKK', 'K000111', 'K122222', 'KYYYYYY', '.KRRRRR', '.KrrrrQ', '.K33333', '..KKKPP', '...KPpP', '....KKK'];

// 1: the tokkō grunt. Pudding-bowl half helmet in gang colour with a white stripe, black gakuran coat with gang piping and a gold kanji
//    column, arms up on shibori ape-hanger bars, a rocket cowl with a tall screen, a tall gang-colour sandan seat-back and takeyari pipes.
const GRUNT_RIDER = [
  '........KKK', '.KK....K00O', 'KWWK..K001O', 'KNNK..K011O', 'KnNK..K112O', 'KnNK..KKKKK', '.KnNK..KHHH', '..KnNKKKnNN', '..KnnnnnnNN',
  '...KnnNNNNY', '...KnNNNNNN', '..K2nNNNNNy', '..K2nNNNNNY', '..KnNNNNNNy', '..KnNNNNNNN', '..KmnNNNNNY', '..KmnNNNNNN', '...KKKKKKKK',
  '..KnK......', '..KnNK.....', '..KNNK.....', '...KKK.....'];
const GRUNT_COWL = ['......KKK', '....KKggg', '...KgGGGG', '...KgGGGG', '...KgGGGG', '..KK11111', '.K0122222', '.K1222222'];
const GRUNT_SEAT = ['...KKK', '..K000', '..K222', '..K000', '.KK222', '.K0000', '.K2222', '.KOOOO', 'KKKKKK', 'K22222', 'KRRRRQ', 'KrrrrR', '.K3333', '..KKKK'];

// 2: the sukajan rider. White full-face helmet with a gang-colour stripe, a satin sukajan in gang colour (bright sheen down the left)
//    with a gold tiger roundel on the back, jeans, a naked bike with round mirrors, a round twin tail light, megaphones, and a
//    gang pennant on the sissy bar.
const SUKA_RIDER = [
  '......KKK', '.....KOO2', '....KOOS2', '....KOSS2', '....KsSS2', '.....KsS2', '....KKKKK', '..KK00111', '.K011111Y',
  '.K01111YY', 'K0111YyYy', 'K0111YYyY', 'K01111YYY', 'K2111111Y', 'KK2211111', '.KKKKKKKK', 'KLK......', 'KLlK.....', 'KllK.....', 'KNNK.....', '.KKK.....'];
const SUKA_MIRRORS = ['.KK.........', 'KWVK........', 'KVVKKKK.....', '.KKNNNNK....', '...KKKK.....'];
const SUKA_TAIL = ['..KKKK', '.K0112', 'K01222', 'KKKKKK', 'KRRKRR', 'KrQKrQ', '.KKKKK', '..K333', '..KKKK'];
const SUKA_PIPES = ['.KK......', 'KWWK.....', 'KVNKKK...', '.KKVVK...', '...KKK...'];

// parts: { rows | f(ph), y (bottom, sprite px, up is negative), x, hang (px of hang-off at full lean), full, pal(gi) }
const LOOKS = [
  { name:'leader', shadow:9, tail:[[0, -9.5, 6]], ex:[[-6, -3], [6, -3]], legY:-12, parts:[
    { y:0, ph:3, f:ph => BIKE_TOP.concat(tyre(ph)), swap:{ w:'w' } },
    { y:-10, hang:2, rows:LEAD_RIDER },
    { y:-6, rows:LEAD_TAIL },
    { y:-1, rows:['..KK......', '.KWVK.....', 'KWVVK.....', 'KVVK......', '.KK.......'] }] },
  { name:'grunt', shadow:10, tail:[[0, -7.5, 5]], glows:[[-10.5, -17.5, 2.5, '#ff2a3a', .4], [10.5, -17.5, 2.5, '#ff2a3a', .4]], ex:[[-10.5, -18], [10.5, -18]], legY:-12, parts:[
    { y:-21, rows:GRUNT_COWL },
    { y:0, ph:3, f:ph => tyreRows(6, 11, ph) },
    { y:-10, hang:2, rows:GRUNT_RIDER },
    { y:-3, rows:GRUNT_SEAT },
    { y:-3, rows:tube(15, 7, 1, 'KWVK', ['KRRK', 'KrrK'], 13) }] },
  { name:'sukajan', shadow:9, tail:[[-2.5, -5, 3.5], [2.5, -5, 3.5]], ex:[[-7, -3], [7, -3]], legY:-12, parts:[
    { y:-13, rows:SUKA_MIRRORS },
    { y:0, ph:3, f:ph => tyreRows(5, 12, ph) },
    { y:-9, hang:2, rows:SUKA_RIDER },
    { y:-3, rows:SUKA_TAIL },
    { y:-1, rows:SUKA_PIPES }] }
];

/* ------------------------------------------------------------------ composites: one canvas per (look, gang, tyre phase, hang -1/0/1); ground at (CW/2, GY) */
const CW = 48, CH = 64, GY = 60, SPRC = {};
function part(li, gi, pi, ph){ const key = li + ':' + gi + ':' + pi + ':' + ph; if(SPRC[key]) return SPRC[key]; const p = LOOKS[li].parts[pi];
  return SPRC[key] = mk(p.f ? p.f(ph) : p.rows, pal(gi), p.full); }
function comp(li, gi, ph, hang){ const key = 'c' + li + gi + ph + hang; if(SPRC[key]) return SPRC[key]; const c = canvas(CW, CH), k = c.getContext('2d');
  LOOKS[li].parts.forEach((p, i) => { const s = part(li, gi, i, p.ph ? ph : 0); k.drawImage(s, Math.round(CW / 2 - s.width / 2 + (p.x || 0) + hang * (p.hang || 0)), GY + (p.y || 0) - s.height); });
  return SPRC[key] = c; }

// the gang flag: a nobori-style banner on a pole, hoist in white, field in gang colour with a white ring crest; three ripple phases
function flagSprite(gi, ph){ const key = 'fl' + gi + ph; if(SPRC[key]) return SPRC[key]; const P = pal(gi), FW = 13, FH = 9, c = canvas(FW + 3, FH + 26), k = c.getContext('2d');
  const px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); };
  for(let y = 1; y < c.height; y++){ px(FW + 1, y, y < 3 ? P.Y : P.V); px(FW + 2, y, P.K); } px(FW + 1, 0, P.Y); px(FW, 1, P.y); px(FW + 2, 0, P.K);   // pole with a gold finial
  for(let x = 0; x <= FW; x++){ const t = (FW - x) / FW, off = Math.round(Math.sin(x * .75 + ph * 2.1) * 1.2 * t), slope = Math.cos(x * .75 + ph * 2.1) * t;
    for(let y = -1; y <= FH; y++){ const yy = 3 + y + off; if(y === -1 || y === FH || x === 0){ px(x, yy, P.K); continue; }
      let col = x >= FW - 2 ? P.S : y === 0 ? P[1] : y === FH - 1 ? P[3] : P[2];
      const dx = x - 5, dy = y - 4, d = Math.sqrt(dx * dx + dy * dy); if(x < FW - 2 && d > 1.6 && d < 3.2) col = P.O; else if(x < FW - 2 && d <= 1.6) col = P[3];
      if(slope < -.35 && col !== P.O) col = col === P.S ? P.s : P[3]; px(x, yy, col); } }
  return SPRC[key] = c; }
// the sukajan rider's small triangular pennant on the sissy bar
function pennant(gi, ph){ const key = 'pn' + gi + ph; if(SPRC[key]) return SPRC[key]; const P = pal(gi), c = canvas(11, 30), k = c.getContext('2d');
  const px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); };
  for(let y = 0; y < 30; y++){ px(0, y, P.K); px(1, y, y < 2 ? P.Y : P.V); } px(2, 0, P.K);
  for(let x = 0; x < 9; x++){ const h = Math.round((9 - x) * .42), off = Math.round(Math.sin(x * .9 + ph * 2.1) * x / 8); for(let y = -h - 1; y <= h + 1; y++) px(x + 2, 5 + y + off, Math.abs(y) > h ? P.K : y < 0 ? P[1] : y === 0 && x < 4 ? P.Y : P[2]); }
  return SPRC[key] = c; }
// hachimaki tails streaming from the leader's head, three phases (full sprite, drawn on the left side)
function tails(gi, ph){ const key = 'ht' + ph; if(SPRC[key]) return SPRC[key];
  const F = [['OOS....', '.SOOS..', '..sSOO.', '....sSO', '......s'], ['OOS....', '.SOOSS.', '...sSOO', '.....ss', '.......'], ['OOS....', '.SOOS..', '.sSOOS.', '...sSSO', '.....ss']][ph];
  return SPRC[key] = mk(F, BASEP, true); }

/* ------------------------------------------------------------------ legs: the kick (straight out, sole first) and the wind-up (knee cocked) */
// pal: { a light, b mid, c dark, d boot, K outline }. Points LEFT; the hip is at the right edge. len = shin length in px.
function legSprite(P, len){ const key = 'leg' + P.id + ':' + len; if(SPRC[key]) return SPRC[key]; const w = len + 7, c = canvas(w, 9), k = c.getContext('2d');
  const px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); };
  for(let x = 5; x < w; x++){ px(x, 2, P.K); px(x, 3, P.a); px(x, 4, P.b); px(x, 5, P.b); px(x, 6, P.c); px(x, 7, P.K); }
  const kn = 5 + (len >> 1); px(kn, 2, P.a); px(kn + 1, 2, P.a); px(kn, 1, P.K); px(kn + 1, 1, P.K);   // the knee catches the light
  // the boot, sole first: toe turned up, a light sole edge, a heel at the bottom
  ['.KK....', 'KPdK...', 'KPllKK.', 'KPdddd.', 'KPdddd.', 'KPdddd.', 'KPKKdd.', 'KK..KK.'].forEach((r, y) => [...r].forEach((ch, x) => {
    if(ch !== '.') px(x, y + 1, ch === 'K' ? P.K : ch === 'P' ? '#c8c4d0' : ch === 'l' ? P.dl : P.d); }));
  return SPRC[key] = c; }
function cockSprite(P){ const key = 'cock' + P.id; if(SPRC[key]) return SPRC[key];   // knee up and out, boot drawn back, sole showing: the wind-up
  const rows = ['...KKKK....', '..KaaaaKKK.', '.KabbbbbbbK', 'KabKKKccccK', 'KbcK..KKKK.', 'KbcK.......', 'KbcK.......', 'KPddK......', 'KPdddK.....', 'KPddddK....', '.KKKKKK....'];
  return SPRC[key] = mk(rows, { K:P.K, a:P.a, b:P.b, c:P.c, d:P.d, P:'#c8c4d0' }, true); }
// the rider colours of the player's bikes (env/bikes.js), so the kicking leg matches the leathers; hip height in sprite px
const PLEG = {
  sport:   { id:'sport', a:'#3ad0f0', b:'#1890b8', c:'#106a90', d:'#24222c', dl:'#3a3844', K:'#0a0810', hip:-13 },
  capsule: { id:'capsule', a:'#ff7a56', b:'#c8301e', c:'#741410', d:'#24222c', dl:'#3a3844', K:'#1c0610', hip:-13 },
  kaido:   { id:'kaido', a:'#a87af0', b:'#6a3ab8', c:'#2e1660', d:'#24222c', dl:'#3a3844', K:'#0a0a1e', hip:-16 },
  cafe:    { id:'cafe', a:'#4a6aa8', b:'#3a508a', c:'#2a3a6a', d:'#24222c', dl:'#3a3844', K:'#0c0c16', hip:-12 },
  neon:    { id:'neon', a:'#4ff0ff', b:'#24223a', c:'#121020', d:'#121020', dl:'#24223a', K:'#05040c', hip:-13 },
  gp:      { id:'gp', a:'#ff4a4a', b:'#d02a30', c:'#b01828', d:'#24222c', dl:'#3a3844', K:'#080a18', hip:-13 } };
const RLEGC = {}, RLEG = gi => RLEGC[gi] || (RLEGC[gi] = RLEG0(gi));
const RLEG0 = gi => { const g = GANGS[gi]; return [
  { id:'r0' + gi, a:'#e8e0d2', b:'#b4a8bc', c:'#6e6284', d:'#121018', dl:'#3e3c58', K:g.K },                // leader: white tokkōfuku trousers
  { id:'r1' + gi, a:'#5a587e', b:'#3e3c58', c:'#24222e', d:'#121018', dl:'#3e3c58', K:g.K },                // grunt: gakuran trousers
  { id:'r2' + gi, a:'#4a6aa8', b:'#3a508a', c:'#2a3a6a', d:'#24222e', dl:'#3e3c58', K:g.K }]; };           // sukajan: jeans

/* ------------------------------------------------------------------ the crash: a bike on its side and a tumbling rider */
const DOWN_ROWS = ['..........KK..........', '.........KWK..KKKK....', '..KKKKK.KVK.K0112K....', '.KTTTTTKKKKK111222KKK.', 'KTtTtTtTK2222222223RRK', 'KTTtTtTTK3333333333rrK',
    '.KTTTTTKKWWVVKKKKKKKK.', '..KKKKK..KKKK.........'];
function tumbleRows(li){ const coat = li === 0 ? 'S' : li === 1 ? 'N' : '1', hi = li === 0 ? 'O' : li === 1 ? 'n' : '0', head = li === 0 ? 'H' : li === 1 ? '2' : 'O';
  return ['...KKK....', '..KhhhK...', '..KhhhK.K.', '...KKKKKcK', '.KKaaaaKcK', 'KcKaabbbK.', 'KcKabbbbK.', '.KKKbbbKK.', '...KdKdK..', '...KdKdK..', '...KK.KK..']
    .map(r => r.replace(/h/g, head).replace(/a/g, hi).replace(/b/g, coat).replace(/c/g, coat).replace(/d/g, 'N')); }
function tumbleOf(base, f){ const c = canvas(12, 12), k = c.getContext('2d'); k.translate(6, 6); k.rotate(f * Math.PI / 2); k.drawImage(base, -5, -6); return c; }
function rotQ(b, q){ const odd = q % 2, c = canvas(odd ? b.height : b.width, odd ? b.width : b.height), k = c.getContext('2d'); k.translate(c.width / 2, c.height / 2); k.rotate(q * Math.PI / 2); k.drawImage(b, -b.width / 2, -b.height / 2); return c; }
function downBike(li, gi){ const key = 'db' + li + gi; if(SPRC[key]) return SPRC[key]; return SPRC[key] = mk(DOWN_ROWS, pal(gi), true); }
function tumble(li, gi, f){ const key = 'tb' + li + gi + f; if(SPRC[key]) return SPRC[key]; return SPRC[key] = tumbleOf(mk(tumbleRows(li), pal(gi), true), f); }
// the same wreck in any palette (mech/crew.js builds its riders' wrecks with this, at warm-up / reset): bike[facing 0|1][quarter turn], tumble[frame]
G.wreckKit = (P, li) => { const b0 = mk(DOWN_ROWS, P, true), b1 = flip0(b0), base = mk(tumbleRows(li), P, true);
  return { bike:[[0, 1, 2, 3].map(q => rotQ(b0, q)), [0, 1, 2, 3].map(q => rotQ(b1, q))], tumble:[0, 1, 2, 3].map(f => tumbleOf(base, f)) }; };
// the cartwheel: the down bike in lossless quarter turns, both facings (built in warm(); 22 x 8 rotates onto whole pixels)
function downRot(li, gi, q, fl){ const key = 'dr' + li + gi + q + fl; if(SPRC[key]) return SPRC[key]; const b0 = downBike(li, gi), b = fl ? flip(b0) : b0, odd = q % 2, c = canvas(odd ? b.height : b.width, odd ? b.width : b.height), k = c.getContext('2d');
  k.translate(c.width / 2, c.height / 2); k.rotate(q * Math.PI / 2); k.drawImage(b, -b.width / 2, -b.height / 2); return SPRC[key] = c; }
// the impact frame (Redline / Mob Psycho): for its hold the wreck is a pure white silhouette (not under reduced motion or no-flashing)
function whiteRot(li, gi, q, fl){ const key = 'wr' + li + gi + q + fl; if(SPRC[key]) return SPRC[key]; const s = downRot(li, gi, q, fl), c = canvas(s.width, s.height), k = c.getContext('2d');
  k.drawImage(s, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#fffaf0'; k.fillRect(0, 0, c.width, c.height); return SPRC[key] = c; }
// loose parts that bounce away from a wreck: a front wheel (two spoke phases, so it visibly rolls) and the rider's helmet in gang paint
const KP = { K:'#0a0810', T:'#18161c', t:'#4a4652', W:'#e4e0ec', V:'#8a8698' };
const WHEEL2 = ph => SPRC['gw' + ph] || (SPRC['gw' + ph] = mk(ph ? ['..KKK..', '.KTtTK.', 'KTWKWTK', 'KtKVKtK', 'KTWKWTK', '.KTtTK.', '..KKK..'] : ['..KKK..', '.KTtTK.', 'KTKWKTK', 'KtWVWtK', 'KTKWKTK', '.KTtTK.', '..KKK..'], KP, true));
const HELM = gi => SPRC['gh' + gi] || (SPRC['gh' + gi] = mk(['..KKKK..', '.K0111K.', 'K011112K', 'K11WWV2K', 'K12WVV2K', '.KKKKKK.'], Object.assign({}, pal(gi), { K:'#0a0810' }), true));
// skid dust and tyre smoke: stepped discs lit from the upper left, radius 2..4 texels
const SMOKE = r => SPRC['gs' + r] || (SPRC['gs' + r] = (() => { const n = r * 2 + 1, c = canvas(n, n), k = c.getContext('2d');
  for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){ const dx = x - r, dy = y - r, d = Math.hypot(dx, dy); if(d > r + .2) continue; const lit = (-dx - dy) / (r * 1.4) + (1 - d / r) * .5;
    k.fillStyle = d > r - .9 ? '#3a3848' : lit > .55 ? '#a6a2b8' : '#6a687c'; k.fillRect(x, y, 1, 1); } return c; })());
// the takedown's impact star: Burnout's white-hot burst, four long rays and four short ones, 11 x 11 (the kick's small STAR stays for kicks)
const STARB = () => SPRC.starb || (SPRC.starb = mk(['.....K.....', '....KYK....', '.K..KOK..K.', '..K.KOK.K..', '...KYOYK...', 'KYOOOWOOOYK', '...KYOYK...', '..K.KOK.K..', '.K..KOK..K.', '....KYK....', '.....K.....'], BASEP, true));
const STAR = () => SPRC.star || (SPRC.star = mk(['...K...', '..KYK..', 'KKKOKKK', 'KYOOOYK', 'KKKOKKK', '..KYK..', '...K...'], BASEP, true));
// the wind-up callout: an amber-rimmed pixel bubble with a "!" and a tail pointing down at the rider; two rim shades for a gentle pulse
const BANG = ph => SPRC['bang' + ph] || (SPRC['bang' + ph] = mk(['.KKKKKKKK.', 'KAAAAAAAAK', 'KAkkOOkkAK', 'KAkkOOkkAK', 'KAkkOOkkAK', 'KAkkOOkkAK', 'KAkkkkkkAK', 'KAkkOOkkAK', 'KAAAAAAAAK', '.KKKAAKKK.', '...KAAK...', '....KK....'],
  { K:'#1a0c04', A:ph ? '#ffd04a' : '#ffa03a', k:'#2a1608', O:'#fff4c0' }, true));
const CHEV = gi => SPRC['ch' + gi] || (SPRC['ch' + gi] = mk(['KKKKK', 'K112K', '.K12K', '..K2K', '...KK'], pal(gi), false));

let warmed = false;
function warm(){ if(warmed || typeof BIKE_TOP === 'undefined') return; warmed = true;
  for(let li = 0; li < 3; li++) for(let gi = 0; gi < 3; gi++){ for(let ph = 0; ph < 3; ph++) for(let h = -1; h <= 1; h++) comp(li, gi, ph, h);
    flip(downBike(li, gi)); for(let f = 0; f < 4; f++){ tumble(li, gi, f); downRot(li, gi, f, 0); downRot(li, gi, f, 1); whiteRot(li, gi, f, 0); whiteRot(li, gi, f, 1); }
    if(li === 0){ HELM(gi); flip(HELM(gi)); } }
  WHEEL2(0); WHEEL2(1); for(const r of [2, 3, 4]) SMOKE(r);
  for(let li = 0; li < 3; li++) for(let gi = 0; gi < 3; gi++){ const L = RLEG(gi)[li]; flip(cockSprite(L)); for(let n = 4; n <= 14; n += 2) flip(legSprite(L, n)); }
  for(let gi = 0; gi < 3; gi++) for(let ph = 0; ph < 3; ph++){ flagSprite(gi, ph); pennant(gi, ph); CHEV(gi); }
  for(const id in PLEG) for(let n = 4; n <= 30; n += 2) flip(legSprite(PLEG[id], n));
  for(let n = 0; n < 100; n++) for(const c of ['#ff8a96', '#4ff0ff']) txt(String(n), c);
  for(const g of GANGS) txt(g.name, g.col[1]); for(const t of [['YOU', '#4ff0ff'], ['VS', '#ffd04a'], ['WIN', '#ffd04a'], ['LOST', '#b9adc4']]) txt(t[0], t[1]);
  for(const t of ['Z', 'X', 'B', 'TAP']) txt(t, '#f4ecdf'); txt('KICK', '#ffd04a');   // the kick prompt's keycaps (they were built at the first duel: three canvases mid-ride)
  try{ if(document.fonts) document.fonts.load('16px DotGothic16').then(() => kanjiSprite('撃墜', '#fff4c0', '#c0203a'), () => {}); }catch(e){}   // the call-out's kanji, built once the font is in (it was built at the first takedown: two canvases mid-ride)
  STAR(); STARB(); BANG(0); BANG(1); SPRC.tdbig = big(txt('TAKEDOWN', '#ff6a3a'), 2); for(let n = 1; n < 10; n++) SPRC['tdn' + n] = big(txt('x' + n, '#ffd04a'), 2); txt('BOOST  +1 FLOW', '#4ff0ff'); }

/* ------------------------------------------------------------------ state */
const LANES = [-.66, 0, .66], REACH = .3, DUEL_T = 20;
let flashT = 0, callout = null, deb = [];
// a wreck's beats: the impact-pose hold (its own hit-stop), the cartwheel (to CART_T), the skid beside you (to SKID_T), then it drops back past
// you. WR_K: the wreck's size against a rival on the road (bike-sized or a little more, so it can't be missed).
const HOLD_T = .07, CART_T = .55, SKID_T = 1.05, WR_K = 1.55, NEAR_G = 170, BESIDE = .36;
const SMK = Array.from({ length:28 }, () => ({ life:0 })); let smkI = 0;   // skid smoke: a fixed ring, reused (no garbage)
let E = null, R = [], nextT = 30, uid = 0, kick = null, kickCD = 0, fx = [], wob = 0, wobT = 0, last = {}, ST = null, hintShown = false, btns = null, clock = 0;
const kP = () => Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX);
const barrier = z => { const s = segAt(z); const Ek = s ? ENV[LANDS[s.land].key] || {} : {}; return (Ek.barrier || 1.1) - .07; };
const pzz = () => position + PZ;

G.reset = () => { warm(); E = null; R = []; nextT = 28 + Math.random() * 8; kick = null; kickCD = 0; fx = []; deb.length = 0; for(const s of SMK) s.life = 0; wob = 0; wobT = 0;
  ST = { duels:0, duelsWon:0, duelsLost:0, takedowns:0, crewTakedowns:0, crewKicks:0, kicks:0, kicksLanded:0, kickedBy:0, rivalCrashes:0, durs:[], winds:0, beside:0 };
  last = { boosts:0, close:0, crashes:0 }; makeButtons(); };

function spawnPack(mode, n, gi){
  if(E && E.over) R.length = 0;   // (the last pack's stragglers: by now long gone up the road)
  const pz = pzz(), behind = mode ? mode === 'behind' : Math.random() < .4;
  gi = gi ?? (Math.random() * 3) | 0; n = n || (Math.random() < .45 ? 1 : Math.random() < (zone() >= 2 ? .6 : .85) ? 2 : 3);
  E = { gi, t:0, duel:null, behind, n };
  const lanes = LANES.slice().sort(() => Math.random() - .5);
  for(let i = 0; i < n; i++){ const lead = i === 0, x = lanes[i % 3] * .9;
    R.push({ id:uid++, role:lead ? 'lead' : 'wing', look:lead ? 0 : i === 1 ? 1 : 2, gi, z:behind ? pz - 1500 - i * 450 : pz + 9000 + i * rr(500, 900), x, tx:x, lane:x, vx:0, kvx:0,
      speed:MAXS * (behind ? 1.12 : .78), boostT:0, nextBoost:rr(2.5, 5), stunT:0, windT:0, windSide:0, kickT:0, kickSide:0, kickCD:rr(1.6, 3), lean:0, st:'ride',
      side:i === 1 ? -1 : 1, off:rr(-120, 220), down:null, flagPh:Math.random() * 3 }); }
  if(behind){ M.noise(.9, 500, .05); M.tone(98, .6, { type:'sawtooth', v:.03, fuzz:true }); }
  for(let i = 0; i < PACKL.length; i++) try{ PACKL[i](E, R); }catch(e){ console.warn('gang onPack', e); }
}
G.spawn = spawnPack;
// hooks for mech/crew.js (and anyone else): a pack arrives / a pack's business is over (E is passed; E.duel.res says how it went)
const PACKL = [], ENDL = [];
G.onPack = fn => { if(typeof fn === 'function' && !PACKL.includes(fn)) PACKL.push(fn); };
G.onPackEnd = fn => { if(typeof fn === 'function' && !ENDL.includes(fn)) ENDL.push(fn); };

/* ------------------------------------------------------------------ the duel (TXR's SP battle, simplified) */
function startDuel(){ let seen = 0; try{ seen = +localStorage.getItem('sundown.gang.hint') || 0; localStorage.setItem('sundown.gang.hint', String(seen + 1)); }catch(e){}
  const d = E.duel = { you:100, them:100, t:0, shown:0, res:null, endT:0, flash:[0, 0], prompt:seen < 2 }; ST.duels++;
  floatText('勝負 · ' + GANGS[E.gi].kanji, W / 2, H * .3, 34, GANGS[E.gi].col[1]);
  if(M.ac && M.cur){ const l = M.ladder(); [0, 2, 4].forEach((k, i) => M.tone(midi(l[k + 2]), .35, { type:'square', v:.03, at:M.ac.currentTime + i * .09 })); } }
function drainYou(v){ const d = E && E.duel; if(!d || d.res) return; const b = Math.ceil(d.you / 6.25); d.you = Math.max(0, d.you - v); if(Math.ceil(d.you / 6.25) < b && !(window.ASSIST && ASSIST.noFlash)) d.flash[0] = .25; }
function drainThem(v){ const d = E && E.duel; if(!d || d.res) return; const b = Math.ceil(d.them / 6.25); d.them = Math.max(0, d.them - v); if(Math.ceil(d.them / 6.25) < b && !(window.ASSIST && ASSIST.noFlash)) d.flash[1] = .25; }
function endDuel(won){ const d = E.duel; if(!d || d.res) return; d.res = won ? 'win' : 'lose'; d.endT = 0; ST.durs.push(Math.round(d.t * 10) / 10); const lead = R.find(r => r.role === 'lead');
  (ST.log || (ST.log = [])).push({ g:GANGS[E.gi].key, won:!!won, road:LANDS[landIdx(zone())].key, td:0 });   // per-duel file: the journal's rival pages and the gang jackets read it
  if(won){ ST.duelsWon++; if(window.COS) setTimeout(() => { if(state === 'play' && window.COS) COS.horn(); }, 450); sunLeft = Math.min(SUN_MAX, sunLeft + 4); flow++; bestFlow = Math.max(bestFlow, flow); hud();
    floatText('勝 Duel won', W / 2, H * .32, 40, '#ffd04a'); setTimeout(() => { if(state === 'play') floatText('+4s', W / 2, H * .4, 28, '#f4ecdf'); }, 300); M.gate();
    for(const r of R) if(r.st === 'ride'){ r.st = 'leave'; r.win = true; } }
  else { ST.duelsLost++; floatText('負 They got away', W / 2, H * .34, 28, '#b9adc4');
    if(M.ac) [57, 53, 50].forEach((m, i) => M.tone(midi(m), .5, { type:'triangle', v:.04, at:M.ac.currentTime + i * .14 }));
    for(const r of R) if(r.st === 'ride'){ r.st = 'leave'; r.win = false; r.boostT = 4; } }
  if(lead && lead.st === 'down') {} }

/* ------------------------------------------------------------------ kicks */
function doKick(side){ if(state !== 'play' || kickCD > 0) return; kick = { side, t:0, done:false, len:10, target:null }; kickCD = .42; ST.kicks++; if(window.SFX && SFX.ready()) SFX.play('kick', { pan:side }); else M.noise(.12, 1500, .045); }
G.kick = doKick;
function reachTarget(side){ const pz = pzz(); let best = null, bd = 1e9;
  for(const r of R){ if(r.st !== 'ride' && r.st !== 'leave') continue; const gap = r.z - pz, dx = r.x - playerX;
    if(Math.abs(gap) > 380 || dx * side < .07 || Math.abs(dx) > REACH) continue; const d = Math.abs(dx) + Math.abs(gap) / 2000; if(d < bd){ bd = d; best = r; } }
  return best; }
function landKick(r, side){ const counter = r.windT > 0; r.hitBy = 'you'; r.kvx += side * (counter ? 3 : 2.4); r.stunT = .8; r.speed *= .94; r.windT = 0; r.kickCD = Math.max(r.kickCD, 1.6); ST.kicksLanded++;
  if(window.SFX && SFX.ready()) SFX.play('kickHit', { pan:side }); else { M.tone(104, .2, { type:'square', v:.07 }); M.noise(.16, 520, .14); }
  if(counter) floatText('Counter!', W / 2 + side * W * .18, H * .6, 26, '#ffd04a');
  if(r.role === 'lead') drainThem(counter ? 15 : 10); else drainThem(3);
  const p = nearScreen(r); fx.push({ type:'star', x:(W / 2 + p.x) / 2 + side * 6, y:p.y - 14 * p.k, t:0 });
  if(!reduce) for(let i = 0; i < 6; i++) sparks.push({ x:(W / 2 + p.x) / 2, y:p.y - 13 * p.k, vx:side * rr(80, 260), vy:rr(-220, -40), life:.35, c:i % 2 ? '#ffd04a' : '#f4ecdf' }); }
// mech/crew.js: a crewmate's kick lands on rival r, knocking it toward `side`. A little softer than yours; it cancels a wind-up (that is how
// the crew blocks a kick aimed at you); it drains the duel meter only a sliver: the crew helps, the duel is still yours to win.
function crewHit(r, side){ if(!r || (r.st !== 'ride' && r.st !== 'leave')) return false; const counter = r.windT > 0;
  r.kvx += side * (counter ? 2.6 : 2.1); r.stunT = .8; r.speed *= .95; r.windT = 0; r.windTgt = null; r.kickCD = Math.max(r.kickCD, 1.8); r.hitBy = 'crew'; r.hitT = clock; ST.crewKicks = (ST.crewKicks || 0) + 1;
  if(window.SFX && SFX.ready()) SFX.play('kickHit', { pan:clamp((r.x - playerX) * 1.5, -1, 1) }); else M.noise(.14, 560, .1);
  drainThem(2); const p = nearScreen(r); fx.push({ type:'star', x:p.x - side * 7 * p.k, y:p.y - 14 * p.k, t:0 });
  if(!reduce) for(let i = 0; i < 5; i++) spark(p.x - side * 7 * p.k, p.y - 13 * p.k, side * rr(80, 240), rr(-200, -40), .3, i % 2 ? '#ffd04a' : '#f4ecdf');
  return true; }
G.crewHit = crewHit;
function playerKicked(r){ const side = Math.sign(playerX - r.x) || 1; ST.kickedBy++; playerX += side * .06; speed = Math.max(MAXS * .55, speed * .88); wob = side * .32; wobT = .45;
  shake = reduce ? 0 : Math.max(shake, 5); if(window.SFX && SFX.ready()) SFX.play('kickHit', { pan:-side, heavy:true }); else { M.tone(78, .25, { type:'square', v:.07 }); M.noise(.2, 380, .12); } floatText('Kicked', W / 2 + side * W * .06, H * .62, 22, '#ffc0c0');
  if(r.role === 'lead') drainYou(10); }

/* ------------------------------------------------------------------ takedowns */
function takedown(r, how){ if(r.st === 'down') return; const wasLead = r.role === 'lead', byCrew = r.hitBy === 'crew' && clock - (r.hitT || -9) < 2.2;
  const sd = Math.sign(r.kvx || r.x || 1); r.st = 'down'; r.down = { t:0, how, side:sd, vx:how === 'wall' ? -sd * .55 : clamp(r.kvx * .5, -1.2, 1.2), sp0:Math.max(r.speed, speed), rx:r.x, rz:r.z, rvx:how === 'wall' ? -sd * .2 : clamp(r.kvx * .8, -1.6, 1.6), bx:r.x };
  const p = nearScreen(r), ex = clamp(p.x, W * .06, W * .94), ey = clamp(p.y - 12 * p.k, H * .3, H * .85);   // the impact, at the edge of the screen if it happened beyond it
  fx.push({ type:'star', x:ex, y:ey, t:0, big:2, k:p.k }); if(!reduce) for(let i = 0; i < 40; i++) spark(ex + rr(-6, 6) * p.k, ey + rr(-4, 4) * p.k, -sd * rr(40, 620) + rr(-120, 120), rr(-520, 80), rr(.3, .75), ['#ffd04a', '#ff8a3a', '#f4ecdf', '#fff4c0'][i % 4]);
  // Burnout 3's takedown, live: fairing shards in the gang's paint and glass from the screen burst off the impact, rain down and skitter on
  // the road; the front wheel rolls away and the helmet bounces off (screen space, on the pixel grid, no canvases). None under reduced motion.
  if(!reduce){ const gc = GANGS[r.gi].col, kk = p.k, fl = p.y + 2 * kk; for(let i = 0; i < 34; i++){ const glass = i % 3 === 0;
      deb.push({ x:ex, y:ey, vx:-sd * rr(40, 520) + rr(-140, 140), vy:rr(-560, -100), life:rr(.7, 1.3), w:(glass ? 1 : 1 + (i % 2)) * kk * .8, h:(glass ? 1 : 2 - (i % 2)) * kk * .8, c:glass ? (i % 2 ? '#e8ffff' : '#9fe0ff') : gc[i % 3], fl:glass, floor:fl + rr(-3, 3) * kk, spr:null }); }
    deb.push({ x:ex, y:ey, vx:sd * rr(260, 360), vy:-rr(380, 460), life:1.6, floor:fl, spr:'wheel', k:kk * WR_K * .9, bn:0 });   // the wheel rolls on, out the far side
    deb.push({ x:ex, y:ey - 6 * kk, vx:-sd * rr(80, 160), vy:-rr(520, 600), life:1.5, floor:fl + 2 * kk, spr:'helm', gi:r.gi, k:kk * WR_K * .8, bn:0 }); }
  r.down.gap0 = r.z - pzz(); r.down.x0 = r.x; r.down.rx0 = r.x;
  if(byCrew){   // the crew's takedown: the same live wreck, but it pays you no boost or flow and no stamp; a style assist instead
    ST.crewTakedowns = (ST.crewTakedowns || 0) + 1; shake = reduce ? 0 : Math.max(shake, 4);
    if(window.SFX && SFX.ready()) SFX.play('takedown', { pan:Math.sign(r.x - playerX) || sd, k:.6 }); else M.noise(.6, 240, .1);
    try{ if(MECH.style && MECH.style.act) MECH.style.act('crew', 250); }catch(e){}
    const A = MECH.arrival; if(A && A.callout) A.callout('CREW TAKEDOWN', { kanji:'援護', col:'#4ff0ff' });
    if(E && E.duel && !E.duel.res){ if(wasLead) endDuel(true); else drainThem(8); } return; }   // (8: a wing your crew took is one you didn't; yours drains 12)
  ST.takedowns++; if(boostT <= 0) boostTier = 1; boostT = Math.max(boostT, 1.1); speed = Math.max(speed, MAXS * 1.06); flow++; bestFlow = Math.max(bestFlow, flow); hud();
  // Burnout 3's beat: a frozen instant, a white-hot flash, then the call-out stamped over the road (no flash under reduced motion)
  // (the road no longer freezes: Kellan, 2026-11-19, flow first. The hit-stop lives in the wreck instead: it holds its impact pose for HOLD_T
  // while the world keeps moving, the way a fighting game freezes only the two fighters)
  flashT = reduce ? 0 : .1;
  // the call-out is a screen card: it asks the message arbiter first (mech/README.md, MECH.quiet) and is skipped when refused; the live wreck
  // still plays out in full, so the takedown never goes unseen
  callout = !MECH.quiet || !MECH.quiet.claim || MECH.quiet.claim(2, 1.5) ? { t:0, n:ST.takedowns, gi:r.gi } : null;
  if(window.SFX && SFX.ready()) SFX.play('takedown', { pan:Math.sign(r.x - playerX) || sd }); else { M.noise(.8, 240, .17); M.tone(58, .55, { v:.1 }); M.noise(.5, 3000, .05); }
  if(M.ac && M.cur){ const l = M.ladder(); [3, 5, 7, 9].forEach((k, i) => M.tone(midi(l[k]), .5, { type:'square', v:.03, at:M.ac.currentTime + .12 + i * .07 })); }
  shake = reduce ? 0 : Math.max(shake, 9);   // short and punchy: the core decays it in about a fifth of a second
  if(E && E.duel && !E.duel.res){ if(wasLead) endDuel(true); else drainThem(12); } }

/* ------------------------------------------------------------------ update */
G.update = dt => {
  clock += dt; if(btns) showButtons();
  if(state !== 'play'){ if(state !== 'ready') for(const r of R){ r.z += r.speed * dt; } if(E && E.duel && !E.duel.res) E.duel.res = 'gone'; if(kick) kick = null; return; }
  flashT = Math.max(0, flashT - dt); if(callout && (callout.t += dt) > 1.5) callout = null;
  kickCD = Math.max(0, kickCD - dt); { let n = 0; for(let i = 0; i < fx.length; i++){ const f = fx[i]; if((f.t += dt) < (f.big ? .4 : .3)) fx[n++] = f; } fx.length = n; }
  { let n = 0; for(let i = 0; i < deb.length; i++){ const p = deb[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1500 * dt; p.vx *= Math.exp(-(p.spr ? .6 : 1.2) * dt);
      if(p.y > p.floor && p.vy > 0){ p.y = p.floor; p.vy = p.vy > 160 ? -p.vy * (p.spr ? .45 : .3) : 0; p.vx *= .7; p.bn = (p.bn || 0) + 1; }   // they land on the road and skitter
      const cr = speed * dt * .00004 * (p.floor - HZ); p.y += cr; p.floor += cr;   // and the road carries them back toward you as you ride on (a hint of depth)
      if((p.life -= dt) > 0 && p.y < H + 40 && p.x > -60 && p.x < W + 60) deb[n++] = p; } deb.length = n; }
  for(const s of SMK) if(s.life > 0){ s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= Math.exp(-2 * dt); s.r += dt * 3; }
  if(wobT > 0){ wobT -= dt; leanV += wob * Math.sin(wobT * 40) * (wobT / .45) * (reduce ? .3 : 1); }
  const pz = pzz();
  // spawn: never in the warm-up, never near a checkpoint gantry or fork, never on top of the police
  if((!E || E.over) && playT >= nextT){ const near = gates.some((g, i) => i >= gatesHit && g * SEG - pz > -3000 && g * SEG - pz < 16000);
    if(near || copT > 0) nextT = playT + 3; else spawnPack(); }
  // the player's kick: the leg is out from 0.06 s; the hit resolves once, at full extension
  if(kick){ kick.t += dt; if(!kick.done && kick.t >= .06){ kick.done = true; const r = reachTarget(kick.side); kick.target = r; if(r) landKick(r, kick.side); else if(G.kickExt) try{ kick.target = G.kickExt(kick.side) || null; }catch(e){ console.warn('gang kickExt', e); } }   // G.kickExt(side): another module's riders (setpiece/boss.js) take the kick no gang rider took; returns the { z, x } it hit, so the leg reaches it
    if(kick.t >= .25) kick = null; }
  if(!E) return;
  E.t += dt;
  // events the duel listens to: your boosts, close calls, crashes
  if(boosts > last.boosts && boosts - last.boosts < 3) drainThem([0, 6, 10, 15][boostTier] || 6);
  if(closeCalls > last.close) drainThem(3);
  if(crashes > last.crashes) drainYou(35);
  last.boosts = boosts; last.close = closeCalls; last.crashes = crashes;
  const lead = R.find(r => r.role === 'lead'), LV = Math.min(1.03, .975 + zone() * .01);
  if(lead && !E.duel && lead.st === 'ride'){ const g = lead.z - pz; if(g < 2200 && g > -500) startDuel(); }
  const d = E.duel;
  if((!lead || lead.st === 'down') && !d || E.t > 45 && (!d || d.res)) for(const r of R) if(r.st === 'ride'){ r.st = 'leave'; r.win = true; }
  if(d && !d.res){ d.t += dt; const g = lead && lead.st === 'ride' ? lead.z - pz : 0;
    if(g < -250) drainThem((3.2 + clamp(-g / 1500, 0, 3) * 1.1) * dt); else if(g < 900) drainThem(1.6 * dt); else if(g > 2600) drainYou((4 + clamp((g - 2600) / 1500, 0, 3) * 1.5) * dt);
    if(d.them <= 0 || (lead && lead.st === 'ride' && g < -6000)) endDuel(true); else if(d.you <= 0) endDuel(false); else if(d.t >= DUEL_T) endDuel(d.them <= d.you); }
  if(d){ d.shown = Math.min(1, d.shown + dt * 2.5); d.flash[0] = Math.max(0, d.flash[0] - dt); d.flash[1] = Math.max(0, d.flash[1] - dt); if(d.res) d.endT += dt; }

  for(const r of R){ const gap = r.z - pz, dx = r.x - playerX, s = segAt(r.z), curve = s ? s.curve : 0;
    if(r.st === 'down'){ downUpdate(r, dt); continue; }
    // speed: the leader races you; wings escort you; after the duel they peel off (you won) or boost away (you lost)
    let ts;
    // leaving is physical, never a fade: beaten riders ease off a little under your speed and drift back past you, off the side or the
    // bottom of the screen; winners open the throttle and shrink away up the road (Kellan: "going slower than the player and exiting
    // off screen behind them")
    if(r.st === 'leave') ts = r.win ? Math.max(speed - MAXS * .08, MAXS * .25) : MAXS * 1.25;
    else if(r.role === 'lead'){ if(!d) ts = E.behind ? Math.max(MAXS * 1.1, speed + MAXS * .15) : MAXS * .78;
      else { ts = MAXS * LV; if(gap < -1500) ts = Math.max(ts, speed * .98); if(gap > 4500) ts -= MAXS * .06; }   // they hang on when you lead, and ease off when far ahead
      if(d && !d.res && (r.nextBoost -= dt) <= 0){ r.nextBoost = rr(3.5, 6.5); if(gap < 3200 && gap > -2600){ r.boostT = 1.1; if(Math.abs(gap) < 4000) M.noise(.4, 800, .03); } } }
    else if(r.mark && r.mark.st === 'fight' && Math.abs(r.mark.z - r.z) < 1400) ts = r.mark.speed + clamp((r.mark.z - r.z) * 1.4, -MAXS * .3, MAXS * .3);   // drawn off by a crewmate
    else { if(!d && !E.behind && gap > 2600) ts = MAXS * .78; else ts = speed + clamp((pz + r.off - r.z) * 1.4, -MAXS * .3, MAXS * .32); ts = Math.min(ts, Math.max(MAXS * 1.2, speed + MAXS * .08)); }
    if(r.boostT > 0){ r.boostT -= dt; ts *= 1.18; }
    if(r.stunT > 0){ r.stunT -= dt; ts *= .9; }
    r.speed = lerp(r.speed, ts, 1 - Math.exp(-1.5 * dt)); r.z += r.speed * dt;
    // lateral: hold a lane and weave; the leader blocks your line when just ahead; wings ride beside you; everyone dodges traffic
    let tx;
    if(r.st === 'leave') tx = r.win ? playerX + (Math.sign(r.x - playerX) || Math.sign(r.x) || 1) * .5 : r.lane;   // a beaten rider peels off on its own side, away from you
    else if(r.role === 'wing' && r.mark && r.mark.st === 'fight' && Math.abs(r.mark.z - r.z) < 1400){ tx = r.mark.x + (Math.sign(r.x - r.mark.x) || 1) * .17; }   // drawn off by a crewmate: it rides with them
    else if(r.role === 'wing' && Math.abs(gap) < 1600){ if(Math.abs(playerX + r.side * .16) > .9) r.side = -Math.sign(playerX || 1); tx = playerX + r.side * .16; }
    else if(r.role === 'lead' && d && !d.res && gap > 600 && gap < 2600 && !(boostT > 0 && gap < 1400)) tx = playerX;   // blocks your line from a distance, then holds it: never a late cut-in
    else tx = r.lane + Math.sin(E.t * 1.1 + r.id * 2.3) * .12;
    const blocked = L => cars.some(c => c.z > r.z - 200 && c.z - r.z < 2400 && Math.abs(c.x - L) < .3);
    if(blocked(tx)){ let bl = null, bd = 9; for(const L of LANES) if(!blocked(L) && Math.abs(L - tx) < bd){ bd = Math.abs(L - tx); bl = L; } if(bl !== null){ tx = bl; if(r.role === 'lead') r.lane = bl; } }
    if(s && s.gore && Math.abs(tx) < .3) tx = Math.sign(tx || r.x || 1) * .4;
    // a leaving rider keeps out of your line while it passes you (both ways): its own side if there is room, else it holds, and crosses
    // only once it is behind you
    if(r.st === 'leave' && Math.abs(gap) < 1600 && Math.abs(tx - playerX) < .32){ const sd = Math.sign(r.x - playerX) || 1, a = playerX + sd * .34, wl = barrier(r.z) - .05;
      tx = Math.abs(a) <= wl ? a : gap < -100 ? playerX - sd * .34 : r.x; }
    r.tx = clamp(tx, -.92, .92);
    const vmax = r.role === 'lead' && gap > 0 && gap < 2600 ? .5 : .85, want = r.stunT > 0 ? 0 : clamp((r.tx - r.x) * 2.6, -vmax, vmax);   // knocked riders wobble, they don't steer
    r.vx = lerp(r.vx, want, 1 - Math.exp(-5 * dt));
    r.x += (r.vx + r.kvx) * dt; r.kvx *= Math.exp(-3.5 * dt);
    // barrier and traffic: a kicked (stunned) rider who hits either goes down; otherwise they scrape or swerve
    const wx = barrier(r.z);
    if(Math.abs(r.x) > wx){ if(r.stunT > 0 && Math.abs(r.kvx) > .35){ r.x = Math.sign(r.x) * wx; takedown(r, 'wall'); continue; } r.x = Math.sign(r.x) * wx; r.kvx = 0; }
    let hitCar = null; for(const c of cars) if(Math.abs(c.z - r.z) < 260 && Math.abs(c.x - r.x) < .25){ hitCar = c; break; }
    if(hitCar){ if(r.stunT > 0){ takedown(r, 'car'); continue; } r.x += Math.sign(r.x - hitCar.x || 1) * .05; r.speed = Math.min(r.speed, Math.max(hitCar.speed, r.speed * .97)); }
    // a leaving rider never touches you: it yields (as the crew does), so it can't be rear-ended or shoved on its way out
    if(r.st === 'leave' && Math.abs(gap) < 400 && Math.abs(r.x - playerX) < .2){ const sd = Math.sign(r.x - playerX) || 1; let nx = playerX + sd * .2; if(Math.abs(nx) > wx) nx = playerX - sd * .2; r.x = nx; }
    // you and a rival: side contact is a shove (Road Rash), rear-ending them at a big speed difference is a crash (like a car)
    if(r.st !== 'leave' && Math.abs(gap) < 170 && Math.abs(dx) < .13 && AIR.h < 6 && (r.airH || 0) <= 60){   // no contact while either of you is airborne off a ramp
      if(gap > 40 && speed - r.speed > MAXS * .22 && cool <= 0 && recov <= 0){ ST.rivalCrashes++; crash({ x:r.x }); r.kvx += Math.sign(dx || 1) * 1.2; r.stunT = .5; }
      else { const sd = Math.sign(dx) || 1, push = .13 - Math.abs(dx); playerX -= sd * push * .5; r.x += sd * push * .5; r.kvx += sd * Math.max(.5, Math.abs(steerNow()) * 1.2); r.stunT = Math.max(r.stunT, .35); speed *= .985;
        if(!r.bumpT || clock - r.bumpT > .3){ r.bumpT = clock; M.noise(.12, 420, .08); if(!reduce) for(let i = 0; i < 3; i++) sparks.push({ x:W / 2 + sd * W * .05, y:H - 40, vx:sd * rr(40, 160), vy:rr(-160, -40), life:.3, c:'#ffd04a' }); } } }
    // their kick: a clear wind-up first (cocked leg, "!"), then the kick resolves; dodge it or kick them first
    r.kickCD -= dt; if(Math.abs(gap) < 260 && Math.abs(dx) < .3) ST.beside += dt;
    if(r.st === 'ride' && r.windT <= 0 && r.kickT <= 0 && r.kickCD <= 0 && AIR.h < 6 && (r.airH || 0) <= 60 && Math.abs(gap) < 260 && Math.abs(dx) > .1 && Math.abs(dx) < .26 && (r.role === 'wing' || (d && !d.res))){
      r.windT = .62; r.windSide = -Math.sign(dx); r.windTgt = null; ST.winds++; M.tone(880, .07, { type:'square', v:.018 }); M.tone(880, .07, { type:'square', v:.018, at:M.ac ? M.ac.currentTime + .14 : 0 }); }
    // a wing beside a crewmate (and not beside you) can wind up on them instead: the same telegraph
    else if(G.crew && r.st === 'ride' && r.role === 'wing' && r.windT <= 0 && r.kickT <= 0 && r.kickCD <= 0 && Math.abs(gap) > 200){ const CRW = G.crew.riders;
      for(let i = 0; i < CRW.length; i++){ const q = CRW[i], qd = q.x - r.x; if(q.st !== 'fight' || Math.abs(q.z - r.z) > 240 || Math.abs(qd) < .1 || Math.abs(qd) > .26) continue;
        r.windT = .62; r.windSide = Math.sign(qd); r.windTgt = q; M.tone(880, .07, { type:'square', v:.012 }); break; } }
    if(r.windT > 0){ r.windT -= dt; if(r.windT <= 0){ r.kickT = .25; r.kickSide = r.windSide; r.kickCD = rr(2.6, 4.6); const q = r.windTgt; r.windTgt = null;
        if(q){ if(q.st === 'fight' && Math.abs(q.z - r.z) < 330 && (q.x - r.x) * r.kickSide > .07 && Math.abs(q.x - r.x) < .3 && G.crew.kicked) G.crew.kicked(q, r); else M.noise(.12, 1300, .03); }
        else if(Math.abs(r.z - pz) < 330 && (playerX - r.x) * r.kickSide > .07 && Math.abs(playerX - r.x) < .3) playerKicked(r); else M.noise(.12, 1300, .04); } }
    if(r.kickT > 0) r.kickT -= dt;
    r.lean = lerp(r.lean, clamp(curve * .075 + (r.vx + r.kvx * .6) * .38, -.5, .5), 1 - Math.exp(-6 * dt));
  }
  { let n = 0; for(let i = 0; i < R.length; i++){ const r = R[i]; if(!culled(r, pz)) R[n++] = r; } R.length = n; }   // (in place: no garbage)
  // the pack's business is over (the next one is scheduled, crew.js hears it), but its riders stay until they have physically left
  if(!E.over && (!R.length || (d && d.res && d.endT > 1.6 && R.every(r => r.st !== 'ride'))) && (!R.length || R.every(r => Math.abs(r.z - pz) > 9000 || r.st === 'down' && r.down.t > 2))){
    E.over = true; for(let i = 0; i < ENDL.length; i++) try{ ENDL[i](E); }catch(e){ console.warn('gang onPackEnd', e); } nextT = playT + rr(30, 46); }
  if(!R.length && E.over) E = null;
};
// A rider is removed only once it has physically left: up the road past the draw distance (the core's EDGE fade covers the last stretch),
// or off screen behind you (leaving riders: offBehind; anyone else left far behind as before). A wreck stays until you have ridden past it
// (a near one has slid back behind the camera by 2.6 s).
const farZ = () => (DRAW - 2) * SEG;   // (a function: the core's DRAW is declared after the mech files load)
function culled(r, pz){ const g = r.z - pz;
  if(r.st === 'down'){ const D = r.down; return D.near !== false ? D.t > 2.6 : g < -PZ * .6 && D.rz - pz < -PZ * .6; }
  if(g > farZ()) return true;
  return r.st === 'leave' ? offBehind(r, g) : g < -6000; }
// fully off screen behind you, in the projection drawScreen uses for a rider behind you (grows up to 5x before the camera plane): past the
// side edge (the inner side of the body, the leader's flag, the lean) or below the bottom edge (head, flag, pennant)
function offBehind(r, g){ if(g >= -60) return false; if(g < -PZ * .8) return true;
  const f = PZ / (PZ + g), k = kP() * f, dx = Math.abs(r.x - playerX) * W * f, top = H / 2 + (H / 2 - 8) * f - 46 * k;
  return dx - 25 * k > W / 2 || top > H; }
function steerNow(){ return clamp((keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touchSteer + padSteer, -1, 1); }
function downUpdate(r, dt){ const D = r.down; D.t += dt; const t = D.t, sd = D.side, wx = barrier(r.z) + .02, pz = pzz();
  // Takedowns happen beside you, so the wreck plays out there, big and close (Burnout 3's rivals tumbling past the camera, Road Rash's
  // wipeouts): it is held just ahead of you (NEAR_G) about a third of a road out on the side it was kicked to (never past the barrier),
  // cartwheels there, skids on its side until SKID_T, then slides out and drops back past you, off the bottom of the screen. The rider is
  // thrown on ahead and further out, tumbles, slides, and drops back a beat later. (It used to be parked 350..800 ahead: a speck.)
  if(D.near === undefined) D.near = Math.abs(D.gap0) < 1500;
  if(!D.near){   // a rider kicked into traffic far up the road: just a wreck on the road, slowing to a stop, which you ride past
    r.speed *= Math.exp(-1.6 * dt); r.z += r.speed * dt; r.x = lerp(r.x, sd * (wx - .1), 1 - Math.exp(-3 * dt)); D.rz += r.speed * .9 * dt; D.rx = lerp(D.rx, sd * (wx - .3), 1 - Math.exp(-3 * dt)); return; }
  const SK = SKID_T, g = t < .25 ? lerp(D.gap0, NEAR_G, 1 - Math.pow(1 - t / .25, 2)) : t < SK ? NEAR_G - (t - .25) * 60 : NEAR_G - (SK - .25) * 60 - (t - SK) * (900 + (t - SK) * 2600);
  r.z = pz + g; r.speed = speed;
  const xb = playerX + sd * BESIDE, xt = sd > 0 ? Math.min(wx - .06, xb) : Math.max(-(wx - .06), xb);
  r.x = t < SK ? lerp(r.x, xt, 1 - Math.exp(-9 * dt)) : lerp(r.x, sd * wx, 1 - Math.exp(-2 * dt));
  const R0 = NEAR_G + 260, rg = t < .3 ? lerp(D.gap0, R0, t / .3) : t < SK + .2 ? R0 - (t - .3) * 220 : R0 - (SK - .1) * 220 - (t - SK - .2) * (900 + (t - SK - .2) * 2600);
  D.rz = pz + rg; const rb = playerX + sd * BESIDE * 1.3, rt = sd > 0 ? Math.min(wx - .1, rb) : Math.max(-(wx - .1), rb); D.rx = lerp(D.rx, rt, 1 - Math.exp(-6 * dt)); }

/* ------------------------------------------------------------------ input */
G.key = (code, down, e) => { const side = code === 'KeyZ' || code === 'KeyJ' ? -1 : code === 'KeyX' || code === 'KeyK' ? 1 : 0; if(!side) return false;
  if(down && !(e && e.repeat)) doKick(side); return true; };
G.pad = (gp, prev) => { const b = gp.buttons; if(b[2] && b[2].pressed && !prev[2]) doKick(-1); if(b[1] && b[1].pressed && !prev[1]) doKick(1); };
G.finish = rec => { if(!ST) return; rec.takedowns = ST.takedowns; rec.duelsWon = ST.duelsWon; rec.duels = ST.duels; if(ST.log && ST.log.length) rec.rivals = ST.log.slice(0, 40); };

// touch: two small kick buttons in the bottom corners, only on coarse pointers, only while riding
function makeButtons(){ if(btns !== null || !matchMedia('(pointer:coarse)').matches){ if(btns === null) btns = false; return; }
  const st = document.createElement('style'); st.textContent = `.kickb{position:fixed;bottom:16px;z-index:3;width:60px;height:48px;padding:0;border:2px solid #f4ecdf;border-radius:0;background:#07060ccc;color:#f4ecdf;
    font-family:var(--font-display);font-size:16px;line-height:1;box-shadow:3px 3px 0 #ff3b5c;touch-action:none;-webkit-user-select:none;user-select:none}
    .kickb:active,.kickb.on{background:#f4ecdf;color:#07060c;transform:translate(2px,2px);box-shadow:1px 1px 0 #ff3b5c}
    .kickb small{display:block;font-size:13px;letter-spacing:1px;margin-top:2px}`;
  document.head.appendChild(st);
  btns = [-1, 1].map(side => { const b = document.createElement('button'); b.className = 'kickb'; b.type = 'button'; b.hidden = true; b.setAttribute('aria-label', side < 0 ? 'Kick left' : 'Kick right');
    b.innerHTML = side < 0 ? '← 蹴<small>KICK</small>' : '蹴 →<small>KICK</small>'; b.style[side < 0 ? 'left' : 'right'] = '16px';
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('on'); doKick(side); });
    const up = () => b.classList.remove('on'); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    document.body.appendChild(b); return b; }); }
function showButtons(){ const on = state === 'play' && document.getElementById('sheet').hidden;
  // on wide screens the speed cluster sits in the bottom-left corner: lift the left button above it
  const lift = W >= 640 ? Math.round((Math.max(31, 28) + 14) * PX) + 'px' : '16px';
  btns.forEach((b, i) => { if(b.hidden === on) b.hidden = !on; if(i === 0 && b.style.bottom !== lift) b.style.bottom = lift; }); }

/* ------------------------------------------------------------------ drawing */
// where a rival is on screen near you (flat-road projection; matches the road at your depth)
function nearScreen(r, z, x, cl){ z = z ?? r.z; x = x ?? r.x; const g = z - pzz(), f = PZ / Math.max(PZ * (cl || .35), PZ + g); return { x:W / 2 + (x - playerX) * W * f, y:H / 2 + (H / 2 - 8) * f, k:kP() * f, f }; }
function legPal(r){ return RLEG(r.gi)[r.look]; }
function drawRider(r, x, y, k, fog, now, am){ const L = LOOKS[r.look], a = (1 - fog * .6) * (am === undefined ? 1 : am), hang = Math.round(clamp(r.lean / .5, -1, 1)), ph = Math.floor(now / 45 + r.id) % 3;
  cx.globalAlpha = a; cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(x, y, L.shadow * k, Math.max(1, 1.6 * k), 0, 0, 6.283); cx.fill();
  cx.save(); cx.translate(x, y); cx.rotate(r.lean); cx.imageSmoothingEnabled = false;
  const c = comp(r.look, r.gi, ph, hang); cx.drawImage(c, Math.round(-CW / 2 * k), Math.round(-GY * k), CW * k, CH * k);
  const fph = Math.floor(now / 110 + r.flagPh) % 3;
  if(r.look === 0){
    const f = flagSprite(r.gi, fph); cx.drawImage(f, (-9 - f.width + 2) * k, (-6 - f.height + 1) * k, f.width * k, f.height * k); }   // the gang flag behind the tail
  if(r.look === 2){ const p = pennant(r.gi, fph); cx.drawImage(p, 5 * k, (-4 - p.height) * k, p.width * k, p.height * k); }
  // legs: their wind-up and kick
  if(r.windT > 0 || r.kickT > 0){ const lp = legPal(r), sd = r.kickT > 0 ? r.kickSide : r.windSide, hip = L.legY;
    if(r.kickT > 0){ const ext = Math.sin(clamp(1 - r.kickT / .25, 0, 1) * Math.PI), len = Math.max(4, Math.round(ext * 12 / 2) * 2), s0 = legSprite(lp, len), s = sd < 0 ? s0 : flip(s0);
      cx.drawImage(s, sd < 0 ? (-8 - s.width) * k : 8 * k, (hip - 5) * k, s.width * k, s.height * k); }
    else { const s0 = cockSprite(lp), s = sd < 0 ? s0 : flip(s0); cx.drawImage(s, sd < 0 ? (-8 - s.width) * k : 8 * k, (hip - 10) * k, s.width * k, s.height * k);
      glow(sd * 14 * k, (hip - 6) * k, 7 * k, '#ffb35a', .45); } }
  for(const [lx, ly, rad] of L.tail) glow(lx * k, ly * k, rad * k, '#ff2a3a', .55 * a);
  for(const [lx, ly, rad, col, al] of L.glows || []) glow(lx * k, ly * k, rad * k, col, al * a);
  if(r.boostT > 0 || (r.st === 'leave' && !r.win)) for(const [ex, ey] of L.ex){ cx.fillStyle = GANGS[r.gi].col[1]; cx.fillRect((ex - .5) * k, (ey - .5) * k, k, k); glow(ex * k, ey * k, (4 + (reduce ? 1 : Math.random() * 2)) * k, GANGS[r.gi].col[1], .7 * a); }
  cx.restore();
  // the wind-up callout, upright and never smaller than 2 canvas pixels per sprite pixel, so it reads down the road
  if(r.windT > 0){ const b = BANG(reduce ? 0 : Math.floor(now / 140) % 2), bk = Math.max(2 * PX, Math.round(k * .8 / PX) * PX), bob = reduce ? 0 : Math.round(Math.sin(now / 90)) * PX;
    cx.globalAlpha = 1; cx.drawImage(b, Math.round(x - b.width * bk / 2), Math.round(y - 38 * k - b.height * bk) - bob, b.width * bk, b.height * bk); cx.globalAlpha = a; }
  // the duel target is marked with a gang-colour chevron over the head
  if(r.role === 'lead' && E && E.duel && !E.duel.res && k < kP() * .9){ const ch = CHEV(r.gi), b = reduce ? 0 : Math.round(Math.sin(now / 180) * 1.5), ck = Math.max(PX, Math.round(k * .9 / PX) * PX);
    cx.drawImage(ch, Math.round(x - ch.width * ck / 2), Math.round(y - 48 * k - ch.height * ck - b * PX), ch.width * ck, ch.height * ck); }
  cx.globalAlpha = 1; }
function drawWreck(r, x, y, k, fog, now){ const D = r.down, a = 1 - fog * .6, sd = D.side || Math.sign(r.x || 1), b = downBike(r.look, r.gi);
  cx.globalAlpha = a; cx.imageSmoothingEnabled = false;
  // the beats (Burnout 3 takedowns, Road Rash wipeouts, Akira's skidding bikes): an impact frame (a white silhouette, held HOLD_T: its own
  // hit-stop; the road never stops), a cartwheel in lossless quarter turns on a hop until CART_T, a touchdown burst, then it skids on its side
  // pouring sparks and tyre smoke. Drawn WR_K times a rider's scale: bike-sized or more. Reduced motion: no impact frame, no cartwheel, no smoke.
  k *= WR_K; const t = D.t, hold = !reduce && t < HOLD_T, cart = !reduce && t >= HOLD_T && t < CART_T, u = cart ? (t - HOLD_T) / (CART_T - HOLD_T) : 0;
  const q = cart ? (Math.floor(u * 7) * (sd > 0 ? 1 : 3)) % 4 : 0, fl = sd < 0 ? 0 : 1, bb = hold ? whiteRot(r.look, r.gi, 0, fl) : q || sd > 0 ? downRot(r.look, r.gi, q, fl) : b;
  const lift = cart ? Math.round(Math.sin(u * Math.PI) * 16) * k : 0, sw = (cart ? 9 - 5 * Math.sin(u * Math.PI) : 9) * k;
  cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(snap(x - sw), snap(y - k * .6), snap(sw * 2), Math.max(PX, snap(k * 1.2)));   // a hard pixel shadow, shrinking under the hop
  const jig = reduce || cart || hold ? 0 : (Math.floor(now / 50) % 2) * k; cx.drawImage(bb, Math.round(x - bb.width * k / 2), Math.round(y - bb.height * k - lift + jig), bb.width * k, bb.height * k);
  const sl = t >= (reduce ? 0 : CART_T) && t < 1.5; if(sl && !reduce) for(let i = 0; i < 4; i++) spark(x - sd * rr(0, 10) * k, y - rr(0, 3) * k, -sd * rr(40, 320) + rr(-60, 60), rr(-200, 120), rr(.2, .5), ['#fff4c0', '#ffd04a', '#ff8a3a', '#ffd04a'][i]);
  if(cart && u > .85 && !reduce) for(let i = 0; i < 6; i++) spark(x + rr(-10, 10) * k, y, rr(-260, 260), rr(-320, -60), rr(.2, .45), '#ffd04a');   // the touchdown
  if(sl && !reduce && Math.random() < .5){ const s = SMK[smkI]; smkI = (smkI + 1) % SMK.length; s.x = x + sd * rr(4, 10) * k; s.y = y - rr(1, 4) * k; s.vx = sd * rr(20, 90); s.vy = -rr(20, 60); s.life = s.max = rr(.35, .6); s.r = 2; s.k = k; }
  if(sl) glow(x, y - 2 * k, 10 * k, '#ffb040', .5 * a);
  cx.globalAlpha = 1; }
function drawTumble(r, x, y, k, fog){ const D = r.down, a = 1 - fog * .6;
  const f = Math.floor(D.t * (reduce ? 4 : 10)) % 4, t = tumble(r.look, r.gi, D.t < 1.6 ? f : 1), bounce = D.t < 1.6 ? Math.abs(Math.sin(D.t * 7)) * (1.6 - D.t) * 12 * k : 0; k *= WR_K * .95;
  cx.globalAlpha = a; cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(x, y, 5 * k, Math.max(1, k), 0, 0, 6.283); cx.fill();
  cx.drawImage(t, Math.round(x - t.width * k / 2), Math.round(y - t.height * k - bounce), t.width * k, t.height * k); cx.globalAlpha = 1; }
function drawDown(r, x, y, k, rx, ry, fog, now){ drawWreck(r, x, y, k, fog, now); drawTumble(r, rx, ry, k, fog); }

G.drawSeg = (s, sx0, sy0, uw, fog, now) => { if(!R.length) return; const pz = pzz(), K = kP();
  for(const r of R){ const zz = r.z, on = Math.floor(zz / SEG) === s.index && zz - pz >= 0;
    if(r.st === 'down'){ if(on){ const P = projOn(s, zz, r.x); drawWreck(r, P.x, P.y, P.w * K / W, fog, now); }
      if(Math.floor(r.down.rz / SEG) === s.index && r.down.rz - pz >= 0){ const Q = projOn(s, r.down.rz, r.down.rx); drawTumble(r, Q.x, Q.y, Q.w * K / W, fog); } }
    else if(on){ const P = projOn(s, zz, r.x), J = MECH.sp_jump, A = J && J.vehAir ? J.vehAir(r) : null, lift = A ? J.vehLift(s, zz, A.h) : 0; if(lift > 1) J.vehShadow(P.x, P.y, P.w); drawRider(r, P.x, P.y - lift, P.w * K / W, fog, now, EDGE); } } };   // (EDGE: the core's fade in the last stretch of the draw distance)
function projOn(s, z, x){ const pct = (z % SEG) / SEG, w = lerp(s.p1.screen.w, s.p2.screen.w, pct); return { x:lerp(s.p1.screen.x, s.p2.screen.x, pct) + x * w, y:lerp(s.p1.screen.y, s.p2.screen.y, pct), w }; }
// rivals between you and the camera (passing you, or falling behind) are drawn in screen space over the bike
G.drawScreen = now => {
  const pz = pzz();
  for(const r of R){ const g = r.z - pz; if(g >= 0) continue;
    if(r.st === 'down'){ const p = nearScreen(r); drawWreck(r, p.x, p.y, p.k, 0, now); continue; }
    if(offBehind(r, g)) continue; const p = nearScreen(r, undefined, undefined, .2); drawRider(r, p.x, p.y, p.k, 0, now); }   // (it grows as it passes the camera, like traffic you overtake)
  for(const r of R) if(r.st === 'down' && r.down.rz - pz < 0){ const q = nearScreen(r, r.down.rz, r.down.rx); drawTumble(r, q.x, q.y, q.k, 0); }
  drawKick(now);
  for(const f of fx){ if(f.t < 0) continue;
    if(f.big === 2){ const s = STARB(), st = reduce ? 1 : f.t < .06 ? 1.6 : f.t < .16 ? 1.25 : .9, k = Math.max(PX, Math.round((f.k || kP()) * WR_K * 1.25 * st / PX) * PX);   // the takedown burst, sized to the wreck: big, then steps down
      cx.globalAlpha = f.t > .28 ? .5 : 1; cx.drawImage(s, Math.round(f.x - s.width * k / 2), Math.round(f.y - s.height * k / 2), s.width * k, s.height * k); cx.globalAlpha = 1; continue; }
    const s = STAR(), k = Math.max(PX, Math.round(kP() * (f.big ? 1.4 : .8) / PX) * PX) * (f.t < .1 ? 1 : .75); cx.drawImage(s, Math.round(f.x - s.width * k / 2), Math.round(f.y - s.height * k / 2), s.width * k, s.height * k); }
  // skid smoke, then fairing shards and glass on the pixel grid (glass glints as it turns), the rolling wheel and the bouncing helmet
  for(const m of SMK){ if(m.life <= 0) continue; const sp = SMOKE(Math.min(4, Math.round(m.r))), kk = Math.max(PX, Math.round(m.k * .8 / PX) * PX); cx.globalAlpha = .7 * clamp(m.life / m.max * 1.6, 0, 1);
    cx.drawImage(sp, snap(m.x - sp.width * kk / 2), snap(m.y - sp.height * kk / 2), sp.width * kk, sp.height * kk); }
  for(let i = 0; i < deb.length; i++){ const p = deb[i]; cx.globalAlpha = Math.min(1, p.life * 3);
    if(p.spr){ const kk = Math.max(PX, Math.round(p.k / PX) * PX), sp = p.spr === 'wheel' ? WHEEL2(Math.floor(p.x / (3 * kk)) & 1) : (p.bn & 1 ? flip(HELM(p.gi)) : HELM(p.gi));
      cx.drawImage(sp, snap(p.x - sp.width * kk / 2), snap(p.y - sp.height * kk), sp.width * kk, sp.height * kk); continue; }
    cx.fillStyle = p.fl && Math.floor((p.life + i) * 14) % 2 ? '#ffffff' : p.c;
    cx.fillRect(snap(p.x), snap(p.y), Math.max(PX, snap(p.w)), Math.max(PX, snap(p.h))); } cx.globalAlpha = 1;
  if(E && E.duel) drawMeter(now);
  if(flashT > 0){ cx.save(); cx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = flashT > .08 ? 'rgba(255,236,200,.5)' : 'rgba(255,170,90,.22)'; cx.fillRect(0, 0, cv.width * PX, cv.height * PX); cx.restore(); }
  if(callout) drawCallout(now);
};
// the player's kick: the leg shoots out sideways over the bike, in the rider's own colours, as far as the rival it hits
function drawKick(now){ if(!kick || state !== 'play') return; const k = kP(), lp = PLEG[BIKE.id] || PLEG.sport, t = kick.t, sd = kick.side;
  const ext = t < .06 ? t / .06 : t < .17 ? 1 : 1 - (t - .17) / .08;
  let full = 12; if(kick.target){ const p = nearScreen(kick.target); full = clamp(Math.round((Math.abs(p.x - W / 2) / k - 18) / 2) * 2, 8, 30); }
  const len = Math.max(4, Math.round(full * clamp(ext, 0, 1) / 2) * 2), s0 = legSprite(lp, len), s = sd < 0 ? s0 : flip(s0);
  cx.save(); cx.translate(W / 2, H - 8 - AIR.h); cx.rotate(leanV); cx.imageSmoothingEnabled = false;
  const x0 = sd < 0 ? (-8 - s.width) * k : 8 * k, y0 = (lp.hip - 5) * k;
  if(t >= .04 && t < .16){ cx.fillStyle = 'rgba(244,236,223,.55)'; for(const dy of [1, 4, 7]) cx.fillRect(sd < 0 ? x0 + s.width * k : x0 - 6 * k, y0 + dy * k, 6 * k, k); }   // speed lines behind the boot
  cx.drawImage(s, x0, y0, s.width * k, s.height * k);
  cx.restore(); }

/* ------------------------------------------------------------------ the duel meter: TXR's two bars, in the HUD's pixel style (3x5 font, cells, plate) */
const F3 = { A:'010101111101101', B:'110101110101110', D:'110101101101110', E:'111100110100111', G:'011100101101011', H:'101101111101101', I:'111010010010111',
  K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', R:'110101110101101', S:'011100010001110', U:'101101101101111',
  V:'101101101101010', W:'101101111111101', Y:'101101010010010', '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111',
  '4':'101101111001001', T:'111010010010010', P:'110101110100100', X:'101101010101101', F:'111100110100100', C:'011100100100011', '!':'010010010000010', x:'000101010101000', Z:'111001010100111', '5':'111100111001111', '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', ' ':'000000000000000', '+':'000010111010000', '-':'000000111000000' };
function txt(s, col){ const key = 't' + s + col; if(SPRC[key]) return SPRC[key]; const c = canvas(s.length * 4 + 1, 6), g = c.getContext('2d');
  for(const [cc, o] of [['#000', 1], [col, 0]]){ g.fillStyle = cc; [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(n * 4 + i % 3 + o, (i / 3 | 0) + o, 1, 1); }); }
  return SPRC[key] = c; }
function drawMeter(now){ const d = E.duel, gg = GANGS[E.gi], P = PX, sx = W / cv.width, narrow = W < 640;
  const R_ = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(x * P, y * P, w * P, h * P); }, B_ = (c, x, y) => cx.drawImage(c, x * P, y * P, c.width * P, c.height * P);
  const cells = narrow ? 10 : 16, cw = narrow ? 2 : 3, bw = cells * (cw + 1) - 1, mid = 19, plW = 3 + bw + 2 + mid + 2 + bw + 3, plH = 20;
  const below = Math.ceil(52 / sx), nY = narrow ? below + 37 : Math.ceil(16 / sx), y0 = nY + 10, x0 = Math.round((cv.width - plW) / 2);
  const fade = d.res ? clamp(1.6 - d.endT, 0, 1) : 1; if(fade <= 0) return;
  cx.save(); cx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = fade;
  // wipe in, in steps (no smooth slide)
  const shownW = Math.ceil(plW * Math.min(1, Math.floor(d.shown * 6) / 6)); cx.beginPath(); cx.rect((x0 + (plW - shownW) / 2) * P, 0, shownW * P, cv.height * P); cx.clip();
  const edge = d.res === 'win' ? '#ffd04a' : d.res === 'lose' ? '#4a4260' : gg.col[2];
  for(let i = 0; i < plH; i++){ const cc = Math.max(0, 4 - i); R_(x0, y0 + i, plW - cc, 1, 'rgba(7,6,12,.78)'); }
  R_(x0, y0 + plH - 1, plW, 1, edge); R_(x0, y0 + 4, 1, plH - 4, edge); R_(x0 + plW - 1, y0 + 4, 1, plH - 4, edge); R_(x0, y0, plW - 4, 1, edge); for(let i = 0; i < 4; i++) R_(x0 + plW - 4 + i, y0 + i, 1, 1, edge);
  // names
  B_(txt('YOU', '#4ff0ff'), x0 + 3, y0 + 3); const nm = txt(gg.name, gg.col[1]); B_(nm, x0 + plW - 3 - nm.width - 9, y0 + 3);
  // a little gang crest beside their name: a ring in gang colour
  const cxr = x0 + plW - 3 - 6, cyr = y0 + 3; R_(cxr + 1, cyr, 3, 1, gg.col[1]); R_(cxr, cyr + 1, 1, 3, gg.col[1]); R_(cxr + 4, cyr + 1, 1, 3, gg.col[2]); R_(cxr + 1, cyr + 4, 3, 1, gg.col[2]); R_(cxr + 2, cyr + 2, 1, 1, '#ffd04a');
  // bars: yours empties toward the left edge, theirs toward the right; cells nearest the VS stay lit longest
  const by = y0 + 10, low = !reduce && Math.floor(now / 220) % 2;
  const bar = (x, v, col, hi, dir, fl) => { const n = Math.ceil(v / 100 * cells - 1e-6);
    for(let i = 0; i < cells; i++){ const lit = i < n, cxp = dir < 0 ? x + bw - cw - i * (cw + 1) : x + i * (cw + 1); let c = lit ? col : '#221d30';
      if(lit && n <= 3 && low && !d.res) c = '#ff3b5c'; R_(cxp, by, cw, 5, c); if(lit) R_(cxp, by, cw, 1, hi);
      if(!lit && i === n && fl > 0 && !reduce) R_(cxp, by, cw, 5, '#f4ecdf'); } };
  bar(x0 + 3, d.you, '#4ff0ff', '#d8ffff', -1, d.flash[0]); bar(x0 + 3 + bw + 2 + mid + 2, d.them, gg.col[2], gg.col[0], 1, d.flash[1]);
  // centre: VS, then who leads and by how much
  const vx = x0 + 3 + bw + 2, lead = R.find(r => r.role === 'lead');
  if(d.res){ const t = txt(d.res === 'win' ? 'WIN' : 'LOST', d.res === 'win' ? '#ffd04a' : '#b9adc4'); B_(t, vx + ((mid - t.width) >> 1) + 1, y0 + 3); }
  else { B_(txt('VS', '#ffd04a'), vx + 5, y0 + 3);
    if(lead){ const gm = Math.round((lead.z - pzz()) / 100), s = String(Math.min(99, Math.abs(gm))), t = txt(s, gm > 0 ? '#ff8a96' : '#4ff0ff');
      B_(t, vx + ((mid - t.width) >> 1) + 1, by); const ax = gm > 0 ? vx + mid - 3 : vx + 1; for(let i = 0; i < 3; i++) R_(gm > 0 ? ax + i : ax + 2 - i, by + 1 + i - (i > 1 ? 2 * (i - 1) : 0), 1, 1, gm > 0 ? gg.col[1] : '#4ff0ff'); } }
  // the duel clock: a thin line under the bars that burns down from both ends
  const tl = d.res ? 0 : Math.round((1 - d.t / DUEL_T) * (plW - 8) / 2); R_(x0 + plW / 2 - tl, y0 + plH - 3, tl * 2, 1, '#ffd04a');
  if(d.prompt && !d.res && d.t < 9) drawPrompt(x0 + plW / 2, y0 + plH + 3, R_, B_);
  cx.restore(); }
// the kick prompt: HUD keycaps under the duel meter (dark cap, cream rim, hard shadow), shown for your first two duels
function keycap(lbl, x, y, R_, B_){ const t = txt(lbl, '#f4ecdf'), w = t.width + 4; R_(x + 1, y + 1, w, 9, '#000'); R_(x, y, w, 9, '#f4ecdf'); R_(x + 1, y + 1, w - 2, 7, '#14101c'); R_(x + 1, y + 7, w - 2, 1, '#0a0810'); B_(t, x + 2, y + 2); return w; }
function arrow(x, y, dir, col, R_){ for(let i = 0; i < 3; i++) R_(dir < 0 ? x + i : x + 2 - i, y + 2 - i, 1, 1 + i * 2, col); R_(dir < 0 ? x + 3 : x - 3, y + 2, 3, 1, col); }
function drawPrompt(cxm, y, R_, B_){ const pad = navigator.getGamepads && [...navigator.getGamepads()].some(Boolean), touch = btns && !btns[0].hidden;
  const [a, b] = touch ? ['TAP', 'TAP'] : pad ? ['X', 'B'] : ['Z', 'X'], kick = txt('KICK', '#ffd04a');
  const wa = txt(a, '#f4ecdf').width + 4, wb = txt(b, '#f4ecdf').width + 4, total = wa + 3 + 6 + 3 + kick.width + 3 + 6 + 3 + wb, x0 = Math.round(cxm - total / 2);
  R_(x0 - 3, y - 2, total + 6, 13, 'rgba(7,6,12,.72)');
  let x = x0 + keycap(a, x0, y, R_, B_) + 3; arrow(x, y + 2, -1, '#ffd04a', R_); x += 9; B_(kick, x, y + 2); x += kick.width + 3; arrow(x + 3, y + 2, 1, '#ffd04a', R_); x += 9; keycap(b, x, y, R_, B_); }

/* ------------------------------------------------------------------ the takedown call-out: 撃墜 stamped over the road in DotGothic16 at its own 16 px
   grid (thresholded to hard pixels), TAKEDOWN in the HUD's 3x5 caps at 2x, the running count, and what it paid */
function kanjiSprite(str, col, sh){ const key = 'kj' + str + col; if(SPRC[key]) return SPRC[key]; if(document.fonts && !document.fonts.check('16px DotGothic16')) return null;
  const n = [...str].length, c = canvas(n * 16 + 2, 18), g = c.getContext('2d'); g.font = '16px DotGothic16'; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(str, 0, 0);
  const im = g.getImageData(0, 0, c.width, c.height), o = canvas(c.width, c.height), og = o.getContext('2d');
  for(const [cc, ox] of [[sh, 1], [col, 0]]){ og.fillStyle = cc; for(let y = 0; y < 18; y++) for(let x = 0; x < c.width; x++) if(im.data[(y * c.width + x) * 4 + 3] > 110) og.fillRect(x + ox, y + ox, 1, 1); }
  return SPRC[key] = o; }
function big(t, k){ const c = canvas(t.width * k, t.height * k), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, c.width, c.height); return c; }
function drawCallout(now){ const c = callout, P = PX, gg = GANGS[c.gi];
  const kj = kanjiSprite('撃墜', '#fff4c0', '#c0203a'), td = SPRC.tdbig || (SPRC.tdbig = big(txt('TAKEDOWN', '#ff6a3a'), 2)), cntb = SPRC['tdn' + c.n] || (SPRC['tdn' + c.n] = big(txt('x' + c.n, '#ffd04a'), 2)), pay = txt('BOOST  +1 FLOW', '#4ff0ff');
  const kw = kj ? kj.width : 0, w = 4 + kw + (kj ? 4 : 0) + Math.max(td.width, pay.width) + 5 + cntb.width + 4, h = 24;
  // stamp in (big to normal in three steps), hold, wipe out to the right
  const st = reduce ? 1 : Math.max(1, Math.min(c.t < .03 ? 1.6 : c.t < .06 ? 1.3 : 1, (cv.width - 4) / w)), out = c.t > 1.25 ? clamp((c.t - 1.25) / .25, 0, 1) : 0; if(out >= 1) return;   // (the stamp never overflows a narrow phone)
  // in the sky, never over the road ahead: at most 30% down, and always clear of this frame's horizon (HZ moves when a jump pitches the camera)
  const cw = cv.width, x0 = Math.round(cw / 2 - w / 2), y0 = Math.max(2, Math.round(Math.min(cv.height * .3, (typeof HZ === 'number' && HZ > 0 ? HZ / P : cv.height / 2) - h - 8)));
  cx.save(); if(MECH.quiet && MECH.quiet.clipRoad){ cx.setTransform(1, 0, 0, 1, 0, 0); MECH.quiet.clipRoad(cx); }   // (the arbiter's road window stays clear)
  cx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); cx.imageSmoothingEnabled = false;
  if(st !== 1){ cx.translate(cw / 2 * P, (y0 + h / 2) * P); cx.scale(st, st); cx.translate(-cw / 2 * P, -(y0 + h / 2) * P); }
  if(out > 0){ cx.beginPath(); cx.rect((x0 + w * Math.floor(out * 6) / 6) * P, 0, w * P, cv.height * P); cx.clip(); }
  const R_ = (x, y, ww, hh, col) => { cx.fillStyle = col; cx.fillRect(x * P, y * P, ww * P, hh * P); }, B_ = (sp, x, y) => cx.drawImage(sp, x * P, y * P, sp.width * P, sp.height * P);
  R_(x0 + 3, y0 + 3, w, h, '#000'); R_(x0, y0, w, h, '#0b0912'); R_(x0, y0, w, 1, '#ff6a3a'); R_(x0, y0 + h - 1, w, 1, '#ff6a3a'); R_(x0, y0, 1, h, '#ff6a3a'); R_(x0 + w - 1, y0, 1, h, '#ff6a3a');
  for(let i = 0; i < w - 2; i += 4) R_(x0 + 1 + i, y0 + 1, 2, 1, gg.col[2]);   // a gang-colour stitch along the top: whose rider went down
  let x = x0 + 4; if(kj){ B_(kj, x, y0 + 3); x += kw + 4; R_(x - 2, y0 + 4, 1, h - 8, '#3a3350'); }
  B_(td, x, y0 + 4); B_(pay, x, y0 + 16); x += Math.max(td.width, pay.width) + 5;
  const pop = !reduce && c.t < .18 ? 1 : 0; B_(cntb, x, y0 + 7 - pop);
  cx.restore(); }

G._dbg = { drawRider, drawDown, drawMeter, drawKick, kickSet:k => { kick = k; }, R:() => R, E:() => E, ST:() => ST, takedown, landKick, spawnPack, comp, flagSprite, downBike, tumble, legSprite, PLEG, RLEG, cockSprite, pal, LOOKS, warm, set:o => { if(o.nextT !== undefined) nextT = o.nextT; } };
})();
