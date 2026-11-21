/* Sundown building library: shared by every city road. See env/README.md, "Buildings".

   48 variants = 16 building types x 3 variants (k % 16 = type, k / 16 = variant). Roads that only push k 0..9 still get 10 different types.
   Each sprite is a 32 px front face plus a narrow side wall on the RIGHT (faces the road), bottom row on the ground.

   Rules kept from the old template (Streets of Rage 2 night stage, Rad Mobile city) and pushed further:
   - night is blue, not black: every material is a 4-tone ramp [outline, shadow, mid, light] with a dark-hue outline;
   - one light from the upper left: lit left edge and lit top edges / ledges, shadowed side wall;
   - warm lights are sparse accents on a cool base; storefronts at street level pour light onto the pavement row;
   - lit windows: bright top-left highlight pixel, a darker bottom row, some with blinds, drawn curtains or a silhouette;
   - silhouettes and signature colours carry the type at small sizes (konbini band, pencil-building sign stack, castle turrets...).
   New rules taken from photos (Wikimedia Commons) of Japanese streets:
   - konbini: a single storey box, one full-width brand stripe band over a wall of glass; nobori flags at the kerb; a pole sign;
   - machiya: two low storeys, dark wood koshi lattice on the ground floor, a pent tile roof between floors, pale plaster upstairs;
   - danchi: long horizontal balcony bands with vertical unit dividers, laundry and AC units on the rails, a block number painted on the end wall;
   - love hotel: rounded / themed white-or-pastel walls, a tall vertical "HOTEL" blade sign, screened entrance, REST/STAY price board;
   - Shenmue's back streets: plain clapboard walls with an AC unit, a vending machine and bins as the street-level detail. */
"use strict";
(() => {
const FW = 32;
// material ramps: [outline, shadow, mid, light]
const M = {
  conc:   ['#0b1024', '#1a2440', '#2a3858', '#4c6290'],
  white:  ['#121a2e', '#2c3a58', '#46587e', '#7a90bc'],
  beige:  ['#160e14', '#30242c', '#4c3c44', '#7a646a'],
  brick:  ['#160a0e', '#30161a', '#4e2428', '#7a443c'],
  wood:   ['#0c0606', '#20120c', '#382014', '#5c3a22'],
  pink:   ['#1c0a1e', '#40183e', '#682e66', '#a05a9c'],
  lav:    ['#120e26', '#282252', '#40387a', '#6c64ae'],
  mint:   ['#0a1a1c', '#163838', '#2a5856', '#4e8a84'],
  teal:   ['#0a1418', '#142a30', '#22444c', '#43737a'],
  grey:   ['#121218', '#22222e', '#383848', '#5c5c74'],
  steel:  ['#0e1018', '#1e2230', '#323848', '#566078'],
  tile:   ['#080a14', '#161c2c', '#262e44', '#4c5878'],
  plaster:['#14141e', '#2e2e40', '#4a4a60', '#727290'],
  ochre:  ['#1a1008', '#382414', '#564020', '#86683a'],
  navy:   ['#0a0c1c', '#141a36', '#202c52', '#3a4c80']
};
const LIT = {
  warm: ['#fff0c0', '#ffd68a', '#b8864a'], cool: ['#e0f6ff', '#9ad8ff', '#4e7ea8'], pink: ['#ffd8e4', '#ff9ab8', '#a85074'],
  fluo: ['#f4fff4', '#c4ecdc', '#6e9c94'], amber: ['#ffe0a0', '#ffb050', '#9a5a26'], tv: ['#e8f0ff', '#8ab0ff', '#3a5aa8']
};
const DARKW = '#0c1430', REFL = '#3c5c9c', REFL2 = '#22365e', INK = '#08060e';
const NE = ['#ff3b8a', '#4ff0ff', '#ffd04a', '#b06bff', '#ff6a3a', '#5aff8a'];
// 3x5 pixel font for the few latin words on signs
const FONT = { A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', G:'011100101101011', H:'101101111101101',
  I:'111010010010111', K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', W:'101101111111101', V:'101101101101010', X:'101101010101101', F:'111100110100100', O:'010101101101010', P:'110101110100100', R:'110101110101101',
  S:'011100010001110', T:'111010010010010', U:'101101101101111', Y:'101101010010010', 0:'111101101101111', 1:'010110010010010', 2:'110001010100111', 3:'110001010001110',
  4:'101101111001001', 5:'111100110001110', 6:'011100110101010', 7:'111001010010010', 8:'010101010101010', 9:'010101011001110', '-':'000000111000000', ' ':'000000000000000' };
// 3x3 strokes that read as kanji / kana at sign size
const GLY = ['111010111', '101111101', '111101111', '010111010', '110011110', '111100111', '111001111', '011110011', '101010111', '111010101', '010111101', '110010111'];

// 5x5 shapes for the big display characters (pachinko): read as kanji without being any real word
const GLY5 = ['0010001010111110111011111', '1111100100011100010011111', '0010011111001000101010001', '1010101110111110111010101', '0101011111010101111110101', '1111110101111111010111111', '0010011111101010010001110'];
function kit(c, W, H, SW, seed){
  const k = c.getContext('2d'); let s = (seed % 2147483646) + 1;
  const R = () => (s = (s * 16807) % 2147483647) / 2147483647, ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const rect = (x, y, w, h, col) => { if(w <= 0 || h <= 0) return; k.fillStyle = col; k.fillRect(x, y, w, h); }, px = (x, y, col) => rect(x, y, 1, 1, col);
  const A = (a, f) => { k.globalAlpha = a; f(); k.globalAlpha = 1; };
  const g = { k, W, H, SW, R, ri, pick, rect, px, A };
  g.mix = mixc;
  g.litPal = (m = .7, c2 = .9) => { const r = R(); return r < m ? LIT.warm : r < c2 ? LIT.cool : LIT.pink; };
  // a window: lit (highlight pixel, darker bottom row, sometimes blinds / curtains / a silhouette) or dark with a cold reflection
  g.win = (x, y, w, h, p = .4, o = {}) => { const lit = R() < p;
    if(lit){ const P = o.pal || g.litPal(o.warm == null ? .7 : o.warm); rect(x, y, w, h, P[1]); rect(x, y + h - 1, w, 1, P[2]); px(x, y, P[0]); if(w > 3) px(x + 1, y, P[0]);
      const d = o.plain ? 1 : R();
      if(h >= 4 && d < .2) for(let yy = y + 1; yy < y + h - 1; yy += 2) rect(x, yy, w, 1, P[2]);
      else if(w >= 3 && d < .4){ rect(x, y, 1, h, mixc(P[2], '#401020', .3)); rect(x + w - 1, y, 1, h, mixc(P[2], '#401020', .3)); }
      else if(w >= 3 && h >= 4 && d < .52){ const sx = x + 1 + ((R() * (w - 2)) | 0), sc = mixc(P[2], INK, .55); px(sx, y + h - 4, sc); rect(sx, y + h - 3, Math.min(2, x + w - sx), 3, sc); } }
    else { rect(x, y, w, h, o.dark || DARKW); px(x + w - 1, y, REFL); if(w > 2 && h > 2) px(x + w - 2, y + 1, REFL2); }
    if(o.sill) rect(x - (o.sillW || 0), y + h, w + 2 * (o.sillW || 0), 1, o.sill);
    return lit; };
  // the building box: front x0..x1-1 from `top` to the ground, side wall to the right, lit left edge, lit top edge, dark outline
  g.box = (x0, x1, top, Rm, sw = SW, bottom = H) => { const h = bottom - top;
    rect(x0, top, x1 - x0, h, Rm[2]); rect(x0, top, 1, h, Rm[0]); rect(x0 + 1, top, 1, h, Rm[3]); rect(x0, top, x1 - x0, 1, Rm[3]);
    if(sw){ rect(x1, top + 1, sw, h - 1, Rm[1]); rect(x1, top, sw, 1, mixc(Rm[3], Rm[1], .5)); rect(x1 + sw - 1, top + 1, 1, h - 1, Rm[0]); rect(x1, top + 1, 1, h - 1, mixc(Rm[1], Rm[0], .4)); } };
  g.cornice = (x0, x1, y, Rm, sw = SW) => { rect(x0, y, x1 - x0 + 1, 1, Rm[3]); rect(x0, y + 1, x1 - x0, 1, Rm[0]); if(sw) rect(x1, y, sw, 1, mixc(Rm[3], Rm[1], .5)); };
  g.tex = (x0, y0, w, h, kind, Rm) => { const c1 = mixc(Rm[2], Rm[1], .5), c2 = mixc(Rm[2], Rm[3], .3);
    for(let y = y0; y < y0 + h; y++) for(let x = x0; x < x0 + w; x++){
      if(kind === 'tile' && (y % 3 === 0 || x % 4 === 0)) px(x, y, c1);
      else if(kind === 'conc' && y % 2 === 0 && (x + (y % 4 ? 1 : 0)) % 2 === 0) px(x, y, c1);
      else if(kind === 'clap' && y % 2 === 0) px(x, y, (x + y) % 7 ? c1 : Rm[1]);
      else if(kind === 'brick' && (y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 3) % 6 === 0)) px(x, y, Rm[1]);
      else if(kind === 'tin' && x % 2 === 0) px(x, y, (x % 4) ? c2 : c1);
      else if(kind === 'panel' && (y % 5 === 0 || x % 6 === 0)) px(x, y, c1); } };
  // latin text is recorded so the right-side (mirrored) copy can redraw it reading the right way round
  g.ops = [];
  const glyph = (ch, x, y, col, sc) => { const f = FONT[ch] || FONT[' ']; for(let i = 0; i < 15; i++) if(f[i] === '1') rect(x + (i % 3) * sc, y + (i / 3 | 0) * sc, sc, sc, col); };
  g.text = (str, x, y, col, sc = 1) => { str = String(str); g.ops.push({ v:0, str, x, y, col, sc, w:(str.length * 4 - 1) * sc }); if(g.noText) return; for(const ch of str){ glyph(ch, x, y, col, sc); x += 4 * sc; } };
  g.vtext = (str, x, y, col, sc = 1) => { str = String(str); g.ops.push({ v:1, str, x, y, col, sc, w:3 * sc }); if(g.noText) return; for(const ch of str){ glyph(ch, x, y, col, sc); y += 6 * sc; } };
  g.replay = () => { for(const o of g.ops){ let x = W - o.x - o.w, y = o.y; for(const ch of o.str){ glyph(ch, x, y, o.col, o.sc); if(o.v) y += 6 * o.sc; else x += 4 * o.sc; } } };
  g.gly = (x, y, col, sc = 1) => { const p = pick(GLY); for(let i = 0; i < 9; i++) if(p[i] === '1') rect(x + (i % 3) * sc, y + (i / 3 | 0) * sc, sc, sc, col); };
  g.gly5 = (x, y, col, sh) => { const p = pick(GLY5); for(let i = 0; i < 25; i++) if(p[i] === '1'){ if(sh) px(x + i % 5 + 1, y + (i / 5 | 0) + 1, sh); } for(let i = 0; i < 25; i++) if(p[i] === '1') px(x + i % 5, y + (i / 5 | 0), col); };
  g.glyRow = (x, y, n, col, step = 4) => { for(let i = 0; i < n; i++) g.gly(x + i * step, y, col); };
  g.glyCol = (x, y, n, col, step = 4) => { for(let i = 0; i < n; i++) g.gly(x, y + i * step, col); };
  // a stepped two-level halo around a lit panel (no smooth gradient)
  g.halo = (x, y, w, h, col, a = .28) => { A(a, () => { rect(x - 1, y, 1, h, col); rect(x + w, y, 1, h, col); rect(x, y - 1, w, 1, col); rect(x, y + h, w, 1, col); });
    A(a * .5, () => { for(let i = x - 1; i < x + w + 1; i += 2){ px(i, y - 2, col); px(i, y + h + 1, col); } for(let j = y; j < y + h; j += 2){ px(x - 2, j, col); px(x + w + 1, j, col); } }); };
  // a sign panel: dark backing, neon/lit border, glyphs
  g.sign = (x, y, w, h, col, o = {}) => { rect(x, y, w, h, o.bg || '#0a0610'); if(!o.noBorder){ rect(x, y, w, 1, col); rect(x, y + h - 1, w, 1, col); rect(x, y, 1, h, col); rect(x + w - 1, y, 1, h, col); }
    const gc = o.fg || mixc(col, '#ffffff', .35); if(o.text) (h > w ? g.vtext : g.text)(o.text, x + (h > w ? Math.floor((w - 3) / 2) : 2), y + (h > w ? 2 : Math.floor((h - 5) / 2)), gc);
    else if(h > w) g.glyCol(x + Math.floor((w - 3) / 2), y + 2, Math.floor((h - 3) / 4), gc); else g.glyRow(x + 2, y + Math.floor((h - 3) / 2), Math.floor((w - 3) / 4), gc);
    if(o.halo !== false) g.halo(x, y, w, h, col, o.ha || .25); };
  g.lantern = (x, y, col = '#e83a2a', hi = '#ffb08a') => { px(x + 1, y - 1, '#1a1014'); rect(x, y, 3, 1, INK); rect(x - 0, y + 1, 3, 3, col); rect(x, y + 4, 3, 1, INK); px(x, y + 1, hi); px(x + 1, y + 2, mixc(col, '#ffffff', .25));
    A(.2, () => rect(x - 1, y + 1, 5, 3, col)); };
  g.noren = (x, y, w, h, col, mark) => { for(let i = 0; i < w; i++) rect(x + i, y, 1, h - (i % 4 === 3 ? 1 : 0), i % 4 === 3 ? mixc(col, INK, .4) : col); rect(x, y, w, 1, mixc(col, '#ffffff', .2)); if(mark) g.gly(x + Math.floor(w / 2) - 1, y + 1, mark); };
  g.shutter = (x, y, w, h, Rm) => { rect(x, y, w, h, Rm[2]); for(let yy = y; yy < y + h; yy += 2) rect(x, yy, w, 1, Rm[1]); rect(x, y, w, 1, Rm[3]); rect(x, y + h - 1, w, 1, Rm[0]); };
  g.ac = (x, y) => { rect(x, y, 3, 2, '#8a8a9a'); px(x, y, '#c8c8d4'); px(x + 1, y + 1, '#4a4a5a'); px(x + 2, y + 1, '#5a5a6a'); };
  // kawara roof band: tile ribs, lit eave, optional ridge with raised ends
  g.kawara = (x0, x1, y, rows, Rm = M.tile) => { for(let r = 0; r < rows; r++){ const xa = x0 + (rows - 1 - r) * (r === 0 && rows > 2 ? 1 : 0); for(let x = xa; x < x1; x++) px(x, y + r, (x + r) % 2 ? Rm[2] : Rm[1]); }
    rect(x0, y + rows - 1, x1 - x0, 1, Rm[3]); rect(x0, y + rows, x1 - x0, 1, Rm[0]); };
  g.roofKit = (x0, x1, top) => { let x = x0 + 2;
    while(x < x1 - 3){ const r = R();
      if(r < .3 && x + 6 < x1){ rect(x, top - 5, 5, 3, M.steel[2]); rect(x, top - 5, 5, 1, M.steel[3]); rect(x, top - 2, 1, 2, M.steel[0]); rect(x + 4, top - 2, 1, 2, M.steel[0]); x += 7; }
      else if(r < .6){ rect(x, top - 2, 3, 2, M.steel[2]); px(x, top - 2, M.steel[3]); px(x + 1, top - 1, M.steel[0]); x += 5; }
      else if(r < .72){ rect(x, top - 6, 1, 6, M.steel[0]); px(x, top - 7, '#ff3030'); x += 3; }
      else x += 3; }
    for(let i = x0 + 1; i < x1; i += 2) px(i, top - 1, M.steel[1]); };
  g.spill = (x, w, col = '#ffd68a', a = .5) => { A(a, () => rect(x, H - 1, w, 1, col)); A(a * .5, () => { for(let i = x - 1; i < x + w + 1; i += 2) px(i, H - 2, col); }); };
  g.ground = () => rect(0, H - 1, W, 1, '#0a0810');
  g.sideWins = (y0, y1, step, p = .4, sw = SW) => { if(sw < 4) return; for(let y = y0; y < y1 - 3; y += step) g.win(FW + 1, y, Math.max(1, sw - 3), 3, p); };
  // a drink vending machine against the road-facing side wall
  g.vend = (body = '#e8ecf4') => { if(SW < 5) return; const x = FW + 1, w = SW - 2, y = H - 10; rect(x, y, w, 9, body); rect(x, y, w, 1, '#ffffff');
    for(let r = 0; r < 2; r++) for(let c = 0; c < w - 1; c++) px(x + c, y + 2 + r * 2, pick(['#e83a3a', '#3a8ae8', '#f0c040', '#5ac87a', '#ffffff'])); rect(x, y + 6, w, 1, '#2a3a5a'); px(x + w - 1, y + 7, '#5aff8a');
    A(.3, () => { rect(x - 1, y, 1, 9, body); }); A(.45, () => rect(x - 1, H - 1, w + 2, 1, body)); };
  g.sideBlade = (y, h, col) => { if(SW < 5) return; const x = FW; rect(x, y, SW, h, '#0a0610'); rect(x, y, SW, 1, col); rect(x, y + h - 1, SW, 1, col); rect(x, y, 1, h, col); rect(x + SW - 1, y, 1, h, col);
    g.glyCol(x + Math.floor((SW - 3) / 2), y + 2, Math.floor((h - 3) / 4), mixc(col, '#ffffff', .4)); };
  return g; }

// ---------------- the types ----------------
const T = [];
// 0 konbini: one storey, a brand band over a glass wall, pole sign, nobori flags
T.push({ name:'konbini', h:[42, 31, 42], sw:5, draw(g, v){ const { rect, px, H, R } = g, top = H - 24, Rm = M.white;
  g.box(0, FW, top, Rm); g.roofKit(4, 30, top);
  const bands = [['#1e46c8', '#4a78f0', '#0e2470'], ['#14a05a', '#e8f0ec', '#2468d8'], ['#f0ece4', '#e8402a', '#f08a1e']];
  const B = bands[v], by = top + 2;
  if(v === 0){ rect(2, by, 30, 6, B[0]); rect(2, by, 30, 1, B[1]); rect(2, by + 5, 30, 1, B[2]); g.text('MART', 6, by + 1, '#ffffff'); rect(23, by + 1, 3, 4, '#ffffff'); px(24, by + 1, B[0]); }
  else if(v === 1){ rect(2, by, 30, 6, B[1]); rect(2, by + 1, 30, 2, B[0]); rect(2, by + 4, 30, 2, B[2]); rect(4, by, 9, 6, '#ffffff'); g.text('24', 5, by + 1, B[0]); }
  else { rect(2, by, 30, 6, B[0]); rect(2, by + 4, 30, 1, B[2]); rect(2, by + 5, 30, 1, B[1]); rect(2, by + 3, 30, 1, '#2a9a4a'); g.text('24H', 4, by - 0, B[1]); g.glyRow(17, by, 3, '#c8302a'); }
  g.halo(2, by, 30, 6, v === 0 ? B[1] : v === 1 ? '#7ae0a8' : '#ffd0a0', .22); rect(FW, by, g.SW, 6, v === 2 ? B[1] : B[0]); rect(FW + g.SW - 1, by, 1, 6, Rm[0]);
  // glass storefront: bright fluorescent interior, shelves of goods, a magazine rack under the window
  const gy = top + 9, gh = H - 3 - gy; rect(1, gy - 1, 31, 1, Rm[0]); rect(2, gy, 29, gh, '#c8e8e0'); rect(2, gy, 29, 1, '#f4fff8');
  for(let x = 3; x < 31; x += 4) px(x, gy, '#ffffff');
  const goods = ['#e85a5a', '#5a9ae8', '#e8c85a', '#6ac88a', '#e88ac8', '#f0f0f0'];
  for(let sy = gy + 3; sy < gy + gh - 3; sy += 3) for(let x = 3; x < 21; x++) if(R() < .75) px(x, sy, g.pick(goods));
  for(let x = 3; x < 21; x++) rect(x, gy + gh - 2, 1, 2, R() < .5 ? g.pick(goods) : '#8aa8b0');
  if(R() < .7){ const sx = 8 + g.ri(0, 8); px(sx, gy + gh - 6, '#2a3a48'); rect(sx, gy + gh - 5, 2, 3, '#3a5a78'); }
  for(let x = 8; x < 31; x += 7) rect(x, gy, 1, gh, '#5a6a80');
  rect(22, gy + 1, 7, gh - 1, '#a8d8d0'); rect(25, gy + 1, 1, gh - 1, '#5a6a80'); rect(21, gy, 1, gh, '#3a4a60'); rect(29, gy, 1, gh, '#3a4a60');
  rect(1, H - 3, 31, 2, Rm[1]); rect(1, H - 3, 31, 1, Rm[3]);
  g.halo(2, gy, 29, gh, '#c8f0e8', .18); g.ground(); g.spill(2, 29, '#c8f0e8', .55);
  // nobori flags on the pavement, bins and an ice chest by the side wall
  if(v !== 1) for(const fx of [3, 12]){ rect(fx, H - 13, 1, 12, '#c8c4d0'); rect(fx + 1, H - 13, 2, 8, v === 0 ? '#e83a5a' : '#2a6ad8'); px(fx + 1, H - 11, '#ffffff'); px(fx + 2, H - 9, '#ffffff'); }
  rect(FW + 1, H - 5, 3, 4, '#3a6ab8'); rect(FW + 1, H - 5, 3, 1, '#7aa8e8'); g.sideWins(top + 9, top + 14, 6, 1);
  // tall pole sign out front (on the corner)
  if(v !== 1){ rect(5, 8, 1, top - 8, M.steel[1]); rect(1, 0, 10, 8, Rm[0]); rect(2, 1, 8, 6, B[v === 2 ? 1 : 0]); rect(2, 1, 8, 1, '#ffffff');
    if(v === 0) g.text('24', 3, 2, '#ffffff'); else { rect(2, 3, 8, 1, '#2a9a4a'); rect(2, 5, 8, 1, '#e8402a'); } g.halo(2, 1, 8, 6, B[1], .25); } } });

// 1 pencil building: narrow and tall, a stack of different sign boxes on the road side, bars on every floor
T.push({ name:'pencil', h:[84, 78, 90], sw:7, blade:false, draw(g, v){ const { rect, px, H, R } = g, Rm = [M.conc, M.beige, M.teal][v], top = 9, x0 = 8;
  g.box(x0, FW, top, Rm); g.tex(x0 + 2, top + 2, FW - x0 - 2, H - top - 14, v === 1 ? 'tile' : 'conc', Rm); g.cornice(x0, FW, top, Rm);
  // rooftop: water tank on legs and a small lit sign frame
  rect(11, top - 7, 6, 4, M.steel[2]); rect(11, top - 7, 6, 1, M.steel[3]); rect(12, top - 3, 1, 3, M.steel[0]); rect(15, top - 3, 1, 3, M.steel[0]);
  rect(20, 0, 10, top - 1, '#0a0610'); for(let x = 21; x < 30; x++) px(x, top - 1, M.steel[1]); const rc = NE[(v * 2 + 1) % 6]; g.sign(20, 0, 10, 6, rc, { ha:.3 });
  const signs = [['#f4f0e4', '#c8202a'], ['#ffd04a', '#2a1a10'], ['#ff5a9a', '#ffffff'], ['#1a2a6a', '#9ae8ff'], ['#c8202a', '#ffffff'], ['#2a8a5a', '#ffffff'], ['#e8e0ff', '#5a2a9a']];
  let fl = 0;
  for(let y = top + 4; y < H - 16; y += 9, fl++){
    rect(x0 + 2, y - 2, FW - x0 - 2, 1, mixc(Rm[2], Rm[3], .5));
    const p = g.pick([LIT.warm, LIT.pink, LIT.amber, LIT.tv]);
    g.win(x0 + 3, y, 8, 5, .7, { pal:p, sill:Rm[3] }); g.win(x0 + 13, y, 6, 5, .5, { pal:p, sill:Rm[3] });
    if(R() < .5) g.glyRow(x0 + 4, y + 1, 2, mixc(p[0], '#ffffff', .5), 3);   // a bar name on the glass
    if(R() < .35) g.ac(x0 + 20, y + 2);
    // sign stack on the road side: every floor a different lit box, sometimes two
    const S = signs[(fl + v * 3) % signs.length]; g.sign(FW, y - 1, g.SW, 8, S[0], { bg:S[0], fg:S[1], noBorder:true, ha:.22 }); rect(FW, y - 2, g.SW, 1, INK);
  }
  // street level: a lit stairwell and a menu board
  const st = H - 13; rect(x0 + 1, st, FW - x0 - 1, 1, Rm[0]); rect(x0 + 3, st + 2, 6, 10, '#ffd68a'); rect(x0 + 3, st + 2, 6, 1, '#fff0c0');
  for(let i = 0; i < 4; i++) rect(x0 + 3, st + 4 + i * 2, 6 - i, 1, '#b8864a');
  rect(x0 + 11, st + 2, 11, 8, '#0a0610'); for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++) rect(x0 + 12 + c * 3, st + 3 + r * 2, 2, 1, g.pick(NE));
  g.halo(x0 + 11, st + 2, 11, 8, rc, .2); rect(FW, st, g.SW, 1, INK);
  g.sideBlade(st + 2, 9, NE[v]); g.ground(); g.spill(x0 + 3, 6, '#ffd68a', .6); } });

// 2 eatery: ramen / izakaya / yakitori, two storeys, noren and lanterns
T.push({ name:'eatery', h:[40, 40, 38], sw:5, draw(g, v){ const { rect, px, H, R } = g, Rm = [M.beige, M.wood, M.conc][v], top = 6, st = H - 15;
  g.box(0, FW, top, Rm); g.tex(2, top + 2, 30, st - top - 2, v === 1 ? 'clap' : 'tile', Rm); g.cornice(0, FW, top, Rm); g.roofKit(2, 30, top);
  // upstairs: home of the owner, curtains and an AC unit
  g.win(4, top + 4, 6, 5, .6, { sill:Rm[3], sillW:1 }); g.win(14, top + 4, 6, 5, .4, { sill:Rm[3], sillW:1 }); g.ac(24, top + 6); rect(23, top + 8, 1, st - top - 8, M.steel[1]);
  g.sideWins(top + 4, st - 2, 7, .4);
  if(v === 0){ // ramen: a yellow lit sign band with red glyphs, red noren, a red lantern, steamy window
    g.sign(2, st - 5, 28, 5, '#ffd04a', { bg:'#ffd04a', fg:'#c8202a', noBorder:true, ha:.3 });
    rect(1, st, 31, H - st - 1, '#1a1014'); rect(3, st + 1, 14, H - st - 2, '#ffc070'); rect(3, st + 1, 14, 1, '#fff0c0');
    g.noren(3, st + 1, 14, 6, '#c8202a', '#ffffff'); rect(19, st + 2, 9, 7, '#ffe0a8'); for(let i = 0; i < 6; i++) px(19 + g.ri(0, 8), st + 2 + g.ri(0, 4), '#ffffff');
    rect(19, st + 9, 9, 1, '#b8864a'); g.lantern(28, st + 1); rect(FW, st - 5, g.SW, 5, '#ffd04a'); g.spill(3, 25, '#ffc070', .55); }
  else if(v === 1){ // izakaya: pent tile roof, a row of red lanterns, glowing lattice door, beer crates
    g.kawara(0, FW + g.SW, st - 4, 3); rect(1, st, 31, H - st - 1, '#140a08');
    for(let x = 3; x < 22; x++) rect(x, st + 1, 1, H - st - 2, x % 2 ? '#ffb050' : '#5c3a22'); rect(3, st + 1, 19, 1, '#ffe0a0'); rect(3, st + 6, 19, 1, '#5c3a22');
    g.noren(8, st + 1, 9, 4, '#20305a', '#e8e4dc');
    for(let x = 2; x < 30; x += 6) g.lantern(x, st - 1);
    rect(24, st + 3, 6, 9, '#2a1a10'); g.sign(24, st + 3, 6, 9, '#f4f0e4', { bg:'#f4f0e4', fg:'#1a1010', noBorder:true, ha:.15 });
    for(let i = 0; i < 2; i++){ rect(26 - i * 0, H - 4 - i * 3, 4, 3, i ? '#e8c020' : '#c8202a'); px(26, H - 4 - i * 3, '#ffffff'); }
    g.spill(3, 19, '#ffb050', .5); }
  else { // yakitori stand: white noren, blue sign, smoke from the vent
    g.sign(2, st - 5, 22, 5, '#4ff0ff', { bg:'#1a3a8a', fg:'#ffffff', ha:.22 });
    rect(1, st, 31, H - st - 1, '#100c14'); rect(3, st + 1, 18, H - st - 2, '#ffd68a'); g.noren(3, st + 1, 18, 5, '#e8e4dc', '#1a2a6a');
    rect(5, st + 9, 14, 1, '#7a3a1a'); for(let x = 6; x < 18; x += 2) px(x, st + 8, '#ff8a3a');
    rect(23, st + 1, 7, 12, '#2a1a14'); rect(24, st + 2, 5, 10, '#e8e4dc'); g.glyCol(25, st + 3, 2, '#c8202a');
    rect(26, st - 7, 3, 2, M.steel[2]); for(let i = 0; i < 6; i++) g.A(.5 - i * .06, () => rect(27 + (i % 2) - (i >> 1), st - 9 - i * 2, 2 + (i >> 1), 2, '#8a9ab8'));
    g.spill(3, 18, '#ffd68a', .5); }
  if(v !== 1 && R() < .9){ rect(21, H - 6, 3, 5, '#e8e4dc'); g.glyCol(21, H - 5, 1, '#c8202a'); }   // A-frame menu board
  g.ground(); } });

// 3 danchi: balcony bands, unit dividers, laundry, block number on the end wall, fluorescent stair lights
T.push({ name:'danchi', h:[68, 62, 70], sw:8, blade:false, draw(g, v){ const { rect, px, H, R } = g, Rm = [M.white, M.mint, M.ochre][v], top = 9, sw = g.SW;
  g.box(0, FW, top, Rm); g.cornice(0, FW, top, Rm);
  rect(4, top - 8, 9, 5, M.steel[2]); rect(4, top - 8, 9, 1, M.steel[3]); for(const lx of [5, 11]) rect(lx, top - 3, 1, 3, M.steel[0]); rect(20, top - 4, 7, 4, Rm[2]); rect(20, top - 4, 7, 1, Rm[3]); px(26, top - 6, '#ff3030'); rect(26, top - 5, 1, 1, M.steel[0]);
  const laundry = ['#e8e4dc', '#e85a7a', '#5a8ae8', '#f0d050', '#8ad8a0'];
  for(let y = top + 3; y < H - 12; y += 8){
    rect(2, y, 30, 5, Rm[1]);   // recessed back wall
    for(let ux = 2; ux < 31; ux += 10){ const lit = g.win(ux + 1, y + 1, 4, 4, .45); rect(ux + 6, y + 1, 2, 4, Rm[0]); if(lit && R() < .3) px(ux + 6, y + 2, '#ffd68a'); }
    rect(1, y + 5, 31, 2, Rm[2]); rect(1, y + 5, 31, 1, Rm[3]); rect(1, y + 7, 31, 1, Rm[0]);   // balcony parapet
    for(let ux = 11; ux < 31; ux += 10) rect(ux, y, 1, 5, Rm[0]);
    for(let ux = 2; ux < 31; ux += 10){ if(R() < .45) for(let i = 0; i < 5; i++) if(R() < .7) rect(ux + 1 + i * 1, y + 4, 1, 1 + (R() < .4 ? 1 : 0), g.pick(laundry)); if(R() < .35) g.ac(ux + 6, y + 3); }
    // the end wall faces the road: stair landing lights
    rect(FW + 2, y + 2, sw - 4, 2, R() < .8 ? '#c4ecdc' : '#4a6a6a'); }
  g.text(String([3, 12, 7][v]).padStart(2, ' '), FW + 0, top + 3, mixc(Rm[3], '#ffffff', .3));
  // pilotis: bicycle parking under fluorescent tubes
  const st = H - 12; rect(1, st, 31, H - st - 1, '#0c0e18'); for(let x = 3; x < 31; x += 9){ rect(x, st, 2, H - st - 1, Rm[2]); px(x, st, Rm[3]); }
  for(let x = 6; x < 30; x += 9) rect(x, st + 1, 3, 1, '#e8fff4'); g.A(.18, () => rect(2, st + 2, 29, 9, '#c4ecdc'));
  for(let x = 6; x < 28; x += 4){ px(x, H - 3, '#5a6a8a'); px(x + 2, H - 3, '#5a6a8a'); px(x + 1, H - 4, '#8a2a3a'); }
  g.ground(); g.vend(v === 1 ? '#c8202a' : '#e8ecf4'); g.spill(3, 28, '#c4ecdc', .35); } });

// 4 office tower: curtain wall, fluorescent floors, a lit crown and a mast
T.push({ name:'office', h:[90, 86, 92], sw:7, blade:false, draw(g, v){ const { rect, px, H, R } = g, top = 16, Rm = M.navy, crown = ['#ff3b5a', '#4ff0ff', '#ffc84a'][v];
  // crown: a set-back box with a lit band and a logo, aircraft lights, a mast
  rect(15, 0, 1, 10, M.steel[1]); px(15, 0, '#ff3030'); rect(6, 8, 22, top - 8, Rm[2]); rect(6, 8, 1, top - 8, Rm[3]); rect(6, 8, 22, 1, Rm[3]); rect(28, 9, g.SW - 2, top - 9, Rm[1]);
  rect(8, 10, 18, 2, crown); g.halo(8, 10, 18, 2, crown, .3); rect(11, 12, 12, 4, '#0a0610'); g.glyRow(12, 12, 3, mixc(crown, '#ffffff', .4));
  px(6, 7, '#ff3030'); px(27, 7, '#ff3030');
  g.box(0, FW, top, Rm); g.cornice(0, FW, top, Rm);
  rect(2, top + 2, 30, H - top - 14, '#0e1834');
  for(let y = top + 3, fl = 0; y < H - 14; y += 5, fl++){ const mode = R(), ref = (fl + 3) % 7;
    for(let x = 2; x < 31; x += 4){ const cell = mode < .3 ? 1 : mode < .65 ? (R() < .35 ? 1 : 0) : 0;
      if(cell){ const P = mode < .3 && v !== 2 ? LIT.fluo : R() < .7 ? LIT.fluo : LIT.warm; rect(x, y, 3, 3, P[1]); px(x, y, P[0]); rect(x, y + 2, 3, 1, P[2]); if(R() < .15) px(x + 1, y + 1, mixc(P[2], INK, .4)); }
      else { rect(x, y, 3, 3, '#121e40'); if((x >> 2) === ref || (x >> 2) === ref + 1) px(x + 2, y, '#4a6aa8'); } }
    rect(2, y + 3, 30, 2, Rm[1]); rect(2, y + 3, 30, 1, Rm[3]); }
  for(let x = 1; x < 32; x += 4) rect(x, top + 2, 1, H - top - 14, Rm[2]);
  g.sideWins(top + 3, H - 14, 5, .25);
  // lobby: tall lit glass with columns
  const st = H - 12; rect(0, st - 1, FW, 1, Rm[3]); rect(1, st, 31, H - st - 1, '#ffe8b8'); rect(1, st, 31, 1, '#fff4d8'); for(let x = 1; x < 32; x += 6) rect(x, st, 2, H - st - 1, Rm[1]);
  rect(13, st + 4, 6, 7, '#c8a870'); px(15, st + 6, '#3a2a20'); rect(15, st + 7, 2, 3, '#3a2a20');
  g.halo(1, st, 31, H - st - 1, '#ffe8b8', .15); g.ground(); g.spill(1, 31, '#ffe8b8', .45); } });

// 5 Showa shophouse: tile roof, tin-clad upstairs, tobacco shop / shuttered with graffiti / greengrocer
T.push({ name:'showa', h:[42, 40, 42], sw:5, draw(g, v){ const { rect, px, H, R } = g, Rm = [M.ochre, M.grey, M.teal][v], top = 10, st = H - 15;
  // pitched kawara roof seen from the eave side, with a ridge
  for(let r = 0; r < top; r++){ const inset = Math.max(0, 6 - r); for(let x = inset; x < FW + g.SW - Math.max(0, inset - 3); x++) px(x, r, (x + (r >> 1)) % 2 ? M.tile[2] : M.tile[1]); }
  rect(6, 0, 23, 1, M.tile[3]); px(5, 0, M.tile[3]); px(29, 0, M.tile[3]); rect(0, top - 1, FW + g.SW, 1, M.tile[3]); for(let r = 2; r < top - 1; r += 2) rect(Math.max(0, 6 - r), r, 1, 1, M.tile[3]);
  g.box(0, FW, top, Rm); g.tex(2, top + 1, 30, st - top - 4, 'tin', Rm);
  // upstairs: shoji-style windows glowing through paper, or dark
  for(const wx of [4, 17]){ const lit = R() < .55; rect(wx - 1, top + 3, 11, 7, Rm[0]); rect(wx, top + 4, 9, 5, lit ? '#e8d0a0' : '#1a2238'); if(lit){ for(let x = wx + 2; x < wx + 9; x += 3) rect(x, top + 4, 1, 5, '#8a6a40'); rect(wx, top + 6, 9, 1, '#8a6a40'); px(wx, top + 4, '#fff4d8'); } else px(wx + 8, top + 4, REFL); rect(wx - 1, top + 10, 11, 1, Rm[3]); }
  g.kawara(0, FW + g.SW, st - 3, 2);   // pent roof over the shop
  g.sideWins(top + 3, st - 4, 7, .4);
  // a hanging wooden kanban sign on the road side
  rect(FW, st - 13, g.SW, 9, '#5c3a22'); rect(FW, st - 13, g.SW, 1, '#8a6a40'); g.glyCol(FW + 1, st - 11, 2, '#f0e8d0');
  rect(1, st, 31, H - st - 1, Rm[0]);
  if(v === 0){ // tobacco counter and two lit vending machines
    rect(2, st + 1, 13, 7, '#ffe0a0'); rect(2, st + 1, 13, 1, '#fff4d8'); for(let x = 3; x < 14; x += 2) rect(x, st + 3, 1, 3, g.pick(['#e8e4dc', '#c8202a', '#2a58b8', '#e8c050']));
    rect(2, st + 8, 13, 1, Rm[3]); rect(4, st - 0, 9, 3, '#c8202a'); g.glyRow(5, st, 2, '#ffffff', 4); g.halo(4, st, 9, 3, '#ff5a3a', .3);
    for(const mx of [17, 24]){ rect(mx, st + 1, 6, H - st - 2, '#e8ecf4'); rect(mx, st + 1, 6, 1, '#ffffff'); for(let r = 0; r < 3; r++) for(let c = 0; c < 3; c++) px(mx + 1 + c * 2, st + 2 + r * 2, g.pick(['#e83a3a', '#3a8ae8', '#f0c040', '#5ac87a']));
      rect(mx + 1, st + 9, 4, 2, '#2a3a5a'); px(mx + 4, st + 8, '#5aff8a'); rect(mx + 5, st + 1, 1, H - st - 2, '#9aa4b8'); }
    g.halo(17, st + 1, 13, H - st - 2, '#e8f0ff', .2); g.spill(2, 28, '#e8ecf4', .5); }
  else if(v === 1){ // shuttered for the night, tagged with graffiti, one caged bulb
    g.shutter(2, st + 1, 28, H - st - 2, M.steel);
    const spray = [['#ff4a8a', '#ffd04a'], ['#4ff0ff', '#ffffff'], ['#5aff8a', '#b06bff']][g.ri(0, 2)];
    for(let n = 0; n < 2; n++){ let x = 4 + n * 13, y = st + 4 + g.ri(0, 3); for(let i = 0; i < 16; i++){ px(x, y, spray[0]); px(x, y + 1, INK); if(R() < .4) px(x, y - 1, spray[1]); x += R() < .8 ? 1 : 0; y = Math.max(st + 2, Math.min(H - 4, y + g.ri(-1, 1))); } }
    px(16, st, '#ffd68a'); g.A(.25, () => rect(13, st + 1, 7, 3, '#ffd68a'));
    for(let i = 0; i < 4; i++) px(3 + i * 7, st - 1, mixc('#7a443c', Rm[2], .4)); g.spill(13, 6, '#ffd68a', .35); }
  else { // greengrocer: green striped awning, produce on a stepped stand, bare bulbs
    for(let x = 1; x < FW; x++) rect(x, st, 1, 2, (x >> 1) % 2 ? '#1a7a46' : '#e8e4dc'); rect(1, st + 2, 31, 1, Rm[0]);
    rect(2, st + 3, 28, H - st - 4, '#3a2a1a'); g.A(.5, () => rect(2, st + 3, 28, 5, '#ffd68a'));
    const veg = ['#ff7a2a', '#e83a3a', '#7ad84a', '#f0d040', '#c86ad8'];
    for(let tier = 0; tier < 3; tier++){ const y = H - 4 - tier * 3; rect(3 + tier * 2, y + 1, 26 - tier * 4, 2, '#7a4a2a'); for(let x = 3 + tier * 2; x < 29 - tier * 2; x++) if(R() < .8) px(x, y, g.pick(veg)); }
    for(const bx of [8, 16, 24]){ px(bx, st + 3, '#fff4c0'); g.A(.3, () => rect(bx - 1, st + 4, 3, 1, '#ffd68a')); }
    g.spill(3, 26, '#ffd68a', .5); }
  g.ground(); } });

// 6 love hotel: castle turrets with cone roofs, crenellations, a vertical HOTEL blade, screened entrance and price board
T.push({ name:'lovehotel', h:[68, 64, 70], sw:6, draw(g, v){ const { rect, px, H, R } = g, Rm = [M.pink, M.lav, M.mint][v], top = 20;
  const roofC = [['#2a58c8', '#6a9aff', '#14286a'], ['#c89a2a', '#ffe07a', '#6a4a10'], ['#c82a3a', '#ff7a7a', '#6a1020']][v];
  g.box(0, FW, top, Rm); g.tex(2, top + 2, 30, H - top - 14, 'tile', Rm);
  for(let x = 4; x < 30; x += 4){ rect(x, top - 2, 2, 2, Rm[2]); px(x, top - 2, Rm[3]); }   // crenellations
  const turret = (x, w, ty, cone) => { rect(x, ty, w, top - ty + 1, Rm[2]); rect(x, ty, 1, top - ty + 1, Rm[3]); rect(x + w - 1, ty, 1, top - ty + 1, Rm[1]);
    for(let r = 0; r < cone; r++){ const hw = Math.ceil((r + 1) * (w + 2) / 2 / cone); const cx0 = x + Math.floor(w / 2) - hw, cw = hw * 2 + (w % 2);
      rect(cx0, ty - cone + r, cw, 1, roofC[0]); px(cx0, ty - cone + r, roofC[1]); px(cx0 + cw - 1, ty - cone + r, roofC[2]); }
    const tx = x + Math.floor(w / 2); rect(tx, ty - cone - 3, 1, 3, '#c8c4d0'); rect(tx + 1, ty - cone - 3, 2, 1, '#ff3b5a');
    g.win(x + 2, ty + 2, w - 4, 3, .8, { pal:LIT.pink, plain:true }); };
  turret(1, 8, 9, 6); turret(23, 7, 12, 5);
  // arched windows, mostly curtained in pink / violet light
  for(let y = top + 4; y < H - 16; y += 8) for(let x = 4; x < 21; x += 6){ rect(x - 1, y - 1, 5, 7, Rm[3]); px(x - 1, y - 1, Rm[2]); px(x + 3, y - 1, Rm[2]); const lit = g.win(x, y, 3, 5, .75, { pal:R() < .6 ? LIT.pink : LIT.amber, plain:true, dark:Rm[0] }); px(x, y, Rm[3]); px(x + 2, y, Rm[3]); if(lit) rect(x + 1, y + 1, 1, 4, mixc('#401030', '#ff9ab8', .45)); rect(x - 1, y + 5, 5, 1, Rm[0]); }
  for(let y = top + 3; y < H - 16; y += 16) rect(2, y, 21, 1, NE[v === 1 ? 2 : 0]);   // neon tube trim
  // the HOTEL blade
  const bc = [NE[0], NE[3], NE[1]][v]; g.sign(24, top + 2, 7, 32, bc, { text:'HOTEL', fg:mixc(bc, '#ffffff', .45), ha:.35 }); rect(24, top + 34, 1, 3, M.steel[1]); rect(30, top + 34, 1, 3, M.steel[1]);
  g.sideWins(top + 3, H - 14, 8, .5);
  // street: hedge, screened entrance with a soft glow, the price board
  const st = H - 12; rect(1, st, 31, H - st - 1, Rm[1]); rect(3, st + 2, 11, H - st - 3, '#ff9ab8'); for(let x = 3; x < 14; x += 2) rect(x, st + 2, 1, H - st - 3, '#c85a8a'); g.A(.5, () => rect(3, st + 2, 12, 3, '#ffd8e4'));
  for(let x = 1; x < 15; x++) rect(x, H - 4 + (x % 3 === 0 ? -1 : 0), 1, 3 - (x % 3 === 0 ? -1 : 0), x % 2 ? '#1a4a2a' : '#2a6a3a');
  rect(15, st, 17, 11, '#f4f0f8'); rect(15, st, 17, 1, '#ffffff'); g.text('REST', 16, st + 1, '#c8202a'); g.text('STAY', 16, st + 6, '#2a3a8a'); rect(15, st + 10, 17, 1, Rm[0]); g.halo(15, st, 17, 11, '#ffffff', .2);
  g.ground(); g.spill(3, 12, '#ff9ab8', .5); } });

// 7 pachinko parlour: rooftop letter boxes, a chaser-bulb frame, rays, a bright glass front full of machines
T.push({ name:'pachinko', h:[50, 48, 50], sw:6, blade:false, draw(g, v){ const { rect, px, H, R } = g, top = 12, sch = [['#c8202a', '#ffd04a', '#ff6a3a'], ['#1a3aa8', '#e8f0ff', '#4ff0ff'], ['#6a1a9a', '#5aff8a', '#ff3b8a']][v], Rm = M.grey;
  g.box(0, FW, top, Rm);
  for(let i = 0; i < 4; i++){ const x = 1 + i * 8; rect(x, 2 + (i % 2), 7, top - 2 - (i % 2), INK); rect(x + 1, 3 + (i % 2), 5, top - 4 - (i % 2), i % 2 ? sch[1] : sch[0]); g.gly(x + 2, 5 + (i % 2), i % 2 ? sch[0] : '#ffffff'); rect(x + 3, top - 1, 1, 1, M.steel[1]); }
  g.halo(1, 2, 31, top - 2, sch[2], .2);
  // facade: big glyph panel with rays behind
  const fy = top + 1, fh = H - 14 - fy; rect(1, fy, 31, fh, sch[0]);
  for(let y = fy; y < fy + fh; y++) for(let x = 1; x < 32; x++){ const a = Math.atan2(y - (fy + fh), x - 16), b = Math.floor((a + 4) * 5); if(b % 2) px(x, y, mixc(sch[0], '#000000', .25)); }
  const sh = mixc(sch[0], INK, .6); g.gly5(4, fy + 3, sch[1], sh); g.gly5(13, fy + 3, '#ffffff', sh); g.gly5(22, fy + 3, sch[1], sh);
  for(let x = 3; x < 30; x += 5){ const r = 2; rect(x, fy + fh - 6, r + 1, r + 1, '#e8ecf4'); px(x, fy + fh - 6, '#ffffff'); px(x + 2, fy + fh - 4, '#8a94a8'); }   // silver balls
  for(let x = 1; x < 32; x += 2){ px(x, fy, x % 4 === 1 ? '#fff4c0' : sch[2]); px(x, fy + fh - 1, x % 4 === 3 ? '#fff4c0' : sch[2]); }
  for(let y = fy; y < fy + fh; y += 2){ px(1, y, y % 4 ? '#fff4c0' : sch[2]); px(31, y, y % 4 ? sch[2] : '#fff4c0'); }
  g.halo(1, fy, 31, fh, sch[2], .25);
  rect(FW, fy, g.SW, fh, sch[0]); g.glyCol(FW + 1, fy + 2, Math.floor((fh - 3) / 4), sch[1]); rect(FW + g.SW - 1, fy, 1, fh, Rm[0]);
  // street: bright glass front with rows of machines
  const st = H - 13; rect(0, st, FW, 1, Rm[3]); rect(1, st + 1, 31, H - st - 2, '#fff4d8');
  for(let x = 2; x < 31; x += 3){ rect(x, st + 3, 2, 6, g.pick(['#ff5a8a', '#5ab0ff', '#ffd04a', '#5aff8a'])); px(x, st + 4, '#ffffff'); rect(x, st + 9, 2, 1, '#8a6a40'); }
  for(let x = 1; x < 32; x += 8) rect(x, st + 1, 1, H - st - 2, '#8a94a8');
  for(const fx of [4, 26]){ rect(fx, st - 9, 1, H - st + 8, '#c8c4d0'); rect(fx + 1, st - 9, 2, 7, sch[1]); px(fx + 1, st - 7, sch[0]); }
  g.halo(1, st + 1, 31, H - st - 2, '#fff4d8', .25); g.ground(); g.spill(1, 31, '#fff4d8', .6); } });

// 8 parking tower: narrow lift shaft, louvred panels, the big blue P and a vacancy lamp, a turntable bay
T.push({ name:'parking', h:[78, 72, 82], sw:5, blade:false, draw(g, v){ const { rect, px, H, R } = g, x0 = 6, top = 9, Rm = [M.steel, M.conc, M.ochre][v];
  rect(10, 1, 14, top - 1, Rm[1]); rect(10, 1, 14, 1, Rm[3]); rect(10, 1, 1, top - 1, Rm[3]); px(22, 0, '#ff3030');
  g.box(x0, FW, top, Rm); g.cornice(x0, FW, top, Rm);
  for(let y = top + 3; y < H - 14; y++) if(y % 2) rect(x0 + 3, y, 13, 1, Rm[1]);   // louvres over the lift shaft
  rect(x0 + 2, top + 3, 1, H - top - 17, Rm[3]); rect(x0 + 16, top + 3, 1, H - top - 17, Rm[0]);
  for(let y = top + 6; y < H - 16; y += 9) if(R() < .35) rect(x0 + 4, y, 11, 2, '#2a3048');   // a car glimpsed through the slats
  rect(x0 + 8, top + 3, 1, H - top - 17, '#9ad8ff'); g.A(.3, () => rect(x0 + 7, top + 3, 3, H - top - 17, '#9ad8ff'));
  // the P sign and the vacancy lamp (green "empty" or red "full")
  const px0 = 24, py = top + 5; rect(px0 - 1, py - 1, 9, 12, INK); rect(px0, py, 7, 10, '#1e5ae8'); rect(px0, py, 7, 1, '#6a9aff');
  g.text('P', px0 + 1, py + 0, '#ffffff', 2); g.halo(px0, py, 7, 10, '#4a8aff', .3);
  const full = v === 2, lc = full ? '#ff3a3a' : '#3aff7a'; rect(px0, py + 12, 7, 5, INK); rect(px0 + 1, py + 13, 5, 3, lc); g.gly(px0 + 2, py + 13, '#ffffff'); g.halo(px0 + 1, py + 13, 5, 3, lc, .3);
  rect(FW, py, g.SW, 10, '#1e5ae8'); rect(FW, py, g.SW, 1, '#6a9aff'); rect(FW + 2, py + 3, 1, 6, '#ffffff'); rect(FW + 1, py + 4, 3, 1, '#ffffff'); px(FW + 2, py + 2, '#ffffff'); rect(FW + g.SW - 1, py, 1, 10, INK);
  g.sideWins(py + 14, H - 14, 9, .2);
  // entrance: turntable bay lit white, yellow-black striped edge, amber beacon
  const st = H - 13; rect(x0 + 1, st, FW - x0 - 1, 1, Rm[0]); rect(x0 + 2, st + 1, 18, H - st - 2, '#d8e4f0'); rect(x0 + 2, st + 1, 18, 1, '#ffffff');
  rect(x0 + 4, H - 4, 14, 2, '#8a94a8'); rect(x0 + 6, H - 8, 10, 4, '#3a2a4a'); rect(x0 + 7, H - 10, 7, 2, '#3a2a4a'); px(x0 + 6, H - 6, '#ff3a3a'); px(x0 + 15, H - 6, '#ff3a3a');
  for(let y = st + 1; y < H - 1; y++){ px(x0 + 1, y, (y >> 1) % 2 ? '#ffd04a' : INK); px(x0 + 20, y, (y >> 1) % 2 ? '#ffd04a' : INK); }
  px(x0 + 22, st - 2, '#ffb030'); g.A(.3, () => rect(x0 + 21, st - 3, 3, 3, '#ffb030'));
  g.ground(); g.spill(x0 + 2, 18, '#d8e4f0', .5); } });

// 9 machiya: dark wood lattice glowing amber, pent roof, pale plaster upstairs with slit windows, a lantern or sugidama
T.push({ name:'machiya', h:[36, 34, 36], sw:4, blade:false, draw(g, v){ const { rect, px, H, R } = g, top = 5, mid = 17;
  g.kawara(0, FW + g.SW, 1, 4); rect(3, 0, 26, 1, M.tile[3]);
  g.box(0, FW, top + 1, M.plaster, g.SW, mid); g.tex(2, top + 2, 30, mid - top - 3, 'conc', M.plaster);
  // mushiko-mado: vertical slits, lit warm behind for some
  for(const wx of [5, 18]){ const lit = R() < .6; rect(wx - 1, top + 4, 11, 6, M.wood[0]); rect(wx, top + 5, 9, 4, lit ? '#e8a050' : '#1a1418'); for(let x = wx; x < wx + 9; x += 2) rect(x, top + 5, 1, 4, M.plaster[3]); }
  g.kawara(0, FW + g.SW, mid - 1, 3);
  g.box(0, FW, mid + 2, M.wood, g.SW);
  // koshi lattice with amber light between the slats
  rect(2, mid + 4, 20, H - mid - 7, '#ffb050'); for(let x = 2; x < 22; x++) if(x % 2 === 0) rect(x, mid + 4, 1, H - mid - 7, x % 4 ? M.wood[3] : M.wood[2]); rect(2, mid + 4, 20, 1, M.wood[3]); rect(2, mid + 8, 20, 1, M.wood[1]);
  if(v === 2){ g.noren(24, mid + 3, 6, 6, '#24306a', '#e8e4dc'); rect(24, mid + 9, 6, H - mid - 10, '#ffd68a'); }
  else { rect(24, mid + 4, 6, H - mid - 5, M.wood[1]); rect(24, mid + 4, 6, 1, M.wood[3]); }
  if(v === 0){ rect(27, mid + 2, 1, 1, INK); rect(26, mid + 3, 3, 5, '#f4ead0'); px(26, mid + 4, '#ffffff'); g.gly(26, mid + 4, '#c8202a'); g.A(.25, () => rect(25, mid + 3, 5, 5, '#ffe0a0')); }
  else if(v === 1){ rect(26, mid + 2, 4, 4, '#6a5a2a'); px(26, mid + 2, '#9a8a4a'); px(28, mid + 4, '#3a3018'); }
  // inuyarai: the curved bamboo fence at the foot of the wall
  for(let x = 2; x < 22; x++){ const c = Math.abs(x - 12) > 7 ? 1 : 0; px(x, H - 3 + c, '#3a2a1a'); if(x % 2) px(x, H - 2, '#5a4a2a'); }
  g.ground(); g.spill(2, 20, '#ffb050', .4); if(v === 2) g.spill(24, 6, '#ffd68a', .4); } });

// 10 capsule hotel: glass band showing stacked capsule pods, a tall vertical sign, the sauna mark at the door
T.push({ name:'capsule', h:[62, 58, 64], sw:6, blade:false, draw(g, v){ const { rect, px, H, R } = g, top = 8, Rm = [M.white, M.conc, M.grey][v];
  g.box(0, FW, top, Rm); g.tex(2, top + 2, 30, H - top - 14, 'panel', Rm); g.cornice(0, FW, top, Rm); g.roofKit(2, 30, top);
  // glass curtain showing two rows of pods per floor
  const gx = 9, gw = 21; for(let y = top + 4; y < H - 18; y += 9){ rect(gx - 1, y - 1, gw + 2, 8, Rm[0]); rect(gx, y, gw, 7, '#101830');
    for(let r = 0; r < 2; r++) for(let x = gx + 1; x < gx + gw - 3; x += 5){ const yy = y + 1 + r * 3, on = R() < .55; rect(x, yy, 4, 2, on ? '#ffe0a8' : '#3a3a50'); px(x, yy, on ? '#fff4d8' : '#5a5a70'); if(on && R() < .3) px(x + 3, yy, '#b8864a'); }
    rect(gx, y + 7, gw, 1, Rm[3]); }
  const sc = [NE[1], NE[0], NE[2]][v]; g.sign(2, top + 4, 5, 46, sc, { text:'CAPSULE', ha:.3 });
  g.sideWins(top + 4, H - 14, 6, .5);
  const st = H - 12; rect(1, st, 31, 1, Rm[0]); rect(10, st + 2, 12, H - st - 3, '#ffe8c0'); rect(10, st + 2, 12, 1, '#fff4d8'); rect(16, st + 2, 1, H - st - 3, '#8a94a8');
  rect(23, st + 2, 8, 7, '#f4f0e8'); rect(26, st + 3, 1, 1, '#e8302a'); for(const sx of [24, 26, 28]) { px(sx, st + 4, '#e8302a'); px(sx + 1, st + 5, '#e8302a'); } rect(24, st + 7, 5, 1, '#e8302a'); g.halo(23, st + 2, 8, 7, '#ffffff', .2);
  rect(2, st + 3, 6, 7, '#0a0610'); g.glyCol(3, st + 4, 1, '#5aff8a'); px(4, st + 8, '#5aff8a');
  g.ground(); g.vend(v === 2 ? '#2a58b8' : '#e8ecf4'); g.spill(10, 12, '#ffe8c0', .5); } });

// 11 karaoke box: rooms lit in party colours, stacked letter boxes, a rooftop microphone sign
T.push({ name:'karaoke', h:[62, 60, 64], sw:6, blade:false, draw(g, v){ const { rect, px, H, R } = g, top = 12, Rm = [M.navy, M.lav, M.teal][v], sch = [[NE[0], NE[2], NE[1]], [NE[1], NE[5], NE[3]], [NE[2], NE[0], NE[3]]][v];
  // rooftop mic sign
  rect(8, top - 3, 10, 3, M.steel[1]); rect(12, 3, 2, top - 6, '#c8c4d0'); rect(10, 0, 6, 4, sch[0]); px(10, 0, INK); px(15, 0, INK); px(11, 1, '#ffffff'); rect(10, 3, 6, 1, mixc(sch[0], INK, .4)); g.halo(10, 0, 6, 4, sch[0], .3);
  g.box(0, FW, top, Rm); g.cornice(0, FW, top, Rm);
  const room = ['#ff5ab8', '#5af0ff', '#b06bff', '#7aff6a', '#ffb04a'];
  for(let y = top + 4; y < H - 16; y += 7) for(let x = 3; x < 21; x += 6){ if(R() < .8){ const c = g.pick(room); rect(x, y, 5, 4, c); px(x, y, mixc(c, '#ffffff', .6)); rect(x, y + 3, 5, 1, mixc(c, INK, .45)); if(R() < .5){ const sx = x + g.ri(1, 3); px(sx, y + 1, INK); rect(sx, y + 2, 1, 2, INK); } } else { rect(x, y, 5, 4, DARKW); px(x + 4, y, REFL); } rect(x - 1, y + 4, 7, 1, Rm[3]); }
  // stacked letter boxes, each a different colour
  const word = 'KARAOKE'; for(let i = 0; i < word.length; i++){ const y = top + 2 + i * 5, c = sch[i % 3]; if(y + 5 > H - 13) break; rect(23, y, 7, 5, c); px(23, y, mixc(c, '#ffffff', .6)); rect(29, y, 1, 5, mixc(c, INK, .4)); g.text(word[i], 25, y, INK); }
  g.halo(23, top + 2, 7, Math.min(42, H - 15 - top), sch[0], .22);
  rect(FW, top + 2, g.SW, H - top - 15, sch[1]); for(let y = top + 4; y < H - 15; y += 4) rect(FW + 1, y, g.SW - 2, 2, mixc(sch[1], '#ffffff', .5)); rect(FW + g.SW - 1, top + 2, 1, H - top - 15, Rm[0]);
  const st = H - 12; rect(0, st - 1, FW, 1, Rm[3]); rect(1, st, 31, H - st - 1, '#2a1a3a'); rect(3, st + 1, 20, H - st - 2, '#ffe8f4'); rect(3, st + 1, 20, 1, '#ffffff');
  for(let x = 5; x < 22; x += 5){ rect(x, st + 3, 3, 4, g.pick(room)); px(x, st + 3, '#ffffff'); }
  rect(25, st + 1, 5, 9, '#f4f0e8'); for(let r = 0; r < 4; r++) rect(26, st + 2 + r * 2, 3, 1, sch[r % 3]); g.halo(3, st + 1, 20, H - st - 2, '#ffd8f0', .22);
  g.ground(); g.spill(3, 20, '#ffd8f0', .55); } });

// 12 temple gate / shrine torii between two buildings, dark trees behind, stone lanterns
T.push({ name:'gate', h:[46, 44, 48], sw:4, blade:false, draw(g, v){ const { rect, px, H, R } = g;
  // trees behind (moonlit crown edge)
  const blobs = [[10, H - 33, 6], [21, H - 35, 7], [16, H - 39, 6], [26, H - 30, 5], [6, H - 28, 5]];
  for(const [bx, by, r] of blobs) for(let y = by - r; y <= by + r; y++) for(let x = bx - r; x <= bx + r; x++){ const dx = x - bx, dy = y - by, d = dx * dx + dy * dy; if(d > r * r || x < 0 || x >= FW) continue;
    const lit = (dx + dy) < -r * .9, rim = d > (r - 1.2) * (r - 1.2) && dx + dy < 0; px(x, y, rim ? '#3a6a5a' : lit ? ((x + y) % 2 ? '#1e3e36' : '#16302c') : ((x * 3 + y) % 5 ? '#0e1e1e' : '#14282a')); }
  rect(5, H - 26, 23, 10, '#0e1e1e');
  // neighbours: a concrete corner on the left, a dark shop edge on the right
  g.box(0, 6, H - 34, M.conc, 0); g.win(2, H - 30, 3, 4, .6); g.win(2, H - 23, 3, 4, .3); rect(0, H - 13, 6, 1, M.conc[3]);
  g.box(27, FW, H - 26, M.brick, g.SW); g.win(28, H - 22, 3, 4, .5);
  // low plaster walls with a tile cap
  for(const [a, b] of [[6, 10], [22, 27]]){ rect(a, H - 9, b - a, 8, M.plaster[2]); rect(a, H - 9, b - a, 1, M.plaster[3]); rect(a, H - 11, b - a, 2, M.tile[1]); rect(a, H - 11, b - a, 1, M.tile[3]); }
  const pil = v === 1 ? M.wood : ['#2a0808', '#6a1410', '#b8281e', '#e85a3a'];
  // a stone path receding through the opening, a far lantern
  rect(11, H - 16, 10, 15, '#0a1414'); for(let y = H - 2; y > H - 12; y -= 2){ const w = Math.max(2, (y - (H - 14)) >> 0); rect(16 - (w >> 1), y, w, 1, '#3a4250'); } px(16, H - 13, '#ffd68a'); g.A(.3, () => rect(15, H - 14, 3, 3, '#ffd68a'));
  if(v !== 2){ // gate: a heavy tile roof with upturned eaves on two pillars
    const ry = H - 24; g.kawara(7, 26, ry, 4); px(6, ry + 2, M.tile[3]); px(26, ry + 2, M.tile[3]); px(5, ry + 1, M.tile[3]); px(27, ry + 1, M.tile[3]); rect(9, ry - 1, 15, 1, M.tile[3]);
    rect(10, ry + 5, 13, 2, pil[1]); rect(10, ry + 5, 13, 1, pil[2]); g.sign(14, ry + 5, 5, 3, '#c8a050', { bg:'#1a1010', fg:'#e8c060', halo:false, noBorder:true });
    for(const x of [10, 21]){ rect(x, ry + 7, 2, H - ry - 8, pil[2]); rect(x, ry + 7, 1, H - ry - 8, pil[3]); } }
  else { // shrine: vermilion torii and a row of red lanterns
    const ty = H - 26; rect(6, ty, 21, 2, '#1a0808'); rect(5, ty, 1, 1, '#1a0808'); rect(27, ty, 1, 1, '#1a0808'); rect(7, ty + 2, 19, 1, pil[2]); rect(7, ty + 2, 19, 1, pil[3]);
    rect(8, ty + 6, 17, 2, pil[2]); rect(8, ty + 6, 17, 1, pil[3]); for(const x of [10, 21]){ rect(x, ty + 3, 2, H - ty - 4, pil[2]); px(x, ty + 3, pil[3]); rect(x, ty + 3, 1, H - ty - 4, pil[3]); }
    for(let x = 7; x < 26; x += 4) g.lantern(x, H - 20); }
  // stone lanterns with a warm flame
  for(const x of [7, 24]){ rect(x, H - 6, 2, 5, '#5a6070'); rect(x - 1, H - 8, 4, 2, '#6a7080'); px(x, H - 7, '#ffc060'); px(x + 1, H - 7, '#ffd68a'); rect(x - 1, H - 9, 4, 1, '#3a4050'); g.A(.25, () => rect(x - 2, H - 9, 6, 4, '#ffc060')); }
  rect(FW, H - 11, g.SW, 2, M.tile[2]); g.ground(); g.spill(14, 5, '#ffd68a', .3); } });

// 13 gas station: a canopy with a brand stripe, floodlit forecourt, pumps, the price pylon, the kiosk behind
T.push({ name:'gas', h:[40, 38, 40], sw:6, blade:false, draw(g, v){ const { rect, px, H, R } = g, sch = [['#e8202a', '#f4f0e8'], ['#1a4ac8', '#ffd04a'], ['#1a9a4a', '#f4f0e8']][v], cy = H - 25;
  // the kiosk behind the canopy
  g.box(14, FW, H - 16, M.white, g.SW); rect(17, H - 12, 10, 6, '#e8fff4'); rect(17, H - 12, 10, 1, '#ffffff'); for(let x = 18; x < 26; x++) if(R() < .6) px(x, H - 9, g.pick(['#e85a5a', '#5a9ae8', '#e8c85a']));
  rect(FW + 1, H - 12, g.SW - 2, 3, '#c4ecdc');
  // price pylon: brand head and LED price rows
  rect(4, 14, 2, H - 15, M.steel[1]); rect(4, 14, 1, H - 15, M.steel[3]); rect(0, 0, 12, 15, INK); rect(1, 1, 10, 4, sch[0]); rect(1, 1, 10, 1, mixc(sch[0], '#ffffff', .4)); g.gly(4, 2, sch[1]);
  for(let r = 0; r < 2; r++){ rect(1, 6 + r * 4, 10, 3, '#100808'); g.text(['15', '16'][r], 2, 6 + r * 4 - 1, r ? '#5aff8a' : '#ff3a3a'); } g.halo(1, 1, 10, 13, sch[0], .2);
  // canopy
  rect(8, cy, FW - 8, 7, '#e8ecf4'); rect(8, cy, FW - 8, 1, '#ffffff'); rect(8, cy + 2, FW - 8, 3, sch[0]); rect(8, cy + 2, FW - 8, 1, mixc(sch[0], '#ffffff', .35)); rect(8, cy + 6, FW - 8, 1, M.white[0]); px(8, cy, M.white[3]);
  rect(FW, cy, g.SW, 7, '#c8ccd8'); rect(FW, cy + 2, g.SW, 3, mixc(sch[0], INK, .3)); rect(FW + g.SW - 1, cy, 1, 7, M.white[1]); g.gly(18, cy + 2, sch[1]);
  g.halo(8, cy, FW - 8 + g.SW, 7, sch[0], .18);
  rect(8, cy + 7, FW - 8 + g.SW, 1, '#3a4258'); for(let x = 10; x < FW + g.SW - 1; x += 4) rect(x, cy + 7, 2, 1, '#ffffff');
  g.A(.2, () => { rect(8, cy + 8, FW - 8 + g.SW, H - cy - 9, '#e8f4ff'); }); g.A(.16, () => { for(let y = cy + 8; y < H - 1; y += 2) rect(8, y, FW - 8 + g.SW, 1, '#e8f4ff'); });
  for(const x of [11, 29]){ rect(x, cy + 7, 2, H - cy - 8, '#c8ccd8'); px(x, cy + 7, '#ffffff'); rect(x + 1, cy + 7, 1, H - cy - 8, '#8a94a8'); }
  // pumps on an island
  rect(15, H - 3, 12, 2, '#5a6070'); rect(15, H - 3, 12, 1, '#8a94a8');
  for(const x of [15, 22]){ rect(x, H - 12, 5, 9, '#e8ecf4'); rect(x, H - 12, 5, 2, sch[0]); px(x, H - 12, '#ffffff'); rect(x + 1, H - 9, 3, 2, '#10202a'); px(x + 1, H - 9, '#5aff8a'); px(x + 3, H - 9, '#5aff8a'); rect(x + 4, H - 8, 1, 4, INK); rect(x, H - 4, 5, 1, '#8a94a8'); }
  g.ground(); g.spill(9, 23, '#e8f4ff', .6); } });

// 14 back streets: coin laundry / shuttered row with graffiti / railway viaduct arches with a yatai stall
T.push({ name:'backstreet', h:[46, 40, 46], sw:6, draw(g, v){ const { rect, px, H, R } = g;
  if(v === 0){ const Rm = M.white, top = 6, st = H - 16;
    g.box(0, FW, top, Rm); g.tex(2, top + 2, 30, st - top - 2, 'tile', Rm); g.cornice(0, FW, top, Rm); g.roofKit(2, 30, top);
    for(let y = top + 4; y < st - 6; y += 9) for(const x of [4, 13, 22]) g.win(x, y, 6, 5, .45, { sill:Rm[3] });
    for(let y = top + 4; y < st - 6; y += 9) if(R() < .5) g.ac(29, y + 2);
    g.sideWins(top + 4, st - 2, 9, .4);
    g.sign(1, st - 4, 31, 5, '#4ff0ff', { bg:'#1a3a9a', fg:'#ffffff', text:'COIN', ha:.25 }); rect(20, st - 3, 3, 3, '#ffffff'); px(21, st - 2, '#1a3a9a');
    rect(1, st + 1, 31, H - st - 2, '#c4ecdc'); rect(1, st + 1, 31, 1, '#f4fff4');
    // stacked dryers (warm, tumbling) over a row of front-loading washers with round portholes, a customer on the bench
    const drum = (x, y, w, h, body, win, hi) => { rect(x, y, w, h, body); rect(x, y, w, 1, '#ffffff'); rect(x + 1, y + 2, 3, 3, win); px(x + 1, y + 2, body); px(x + 3, y + 4, body); px(x + 3, y + 2, hi); rect(x, y + h - 1, w, 1, '#8a9aa8'); };
    for(let x = 3; x < 20; x += 6) drum(x, st + 2, 5, 6, '#d8dce8', R() < .6 ? '#ffb050' : '#3a4a6a', '#fff0c0');
    for(let x = 3; x < 20; x += 6) drum(x, st + 8, 5, 6, '#f4f4f8', '#2a4a8a', '#9ad8ff');
    rect(22, H - 5, 8, 1, '#8a6a40'); px(24, H - 8, '#2a3a48'); rect(24, H - 7, 2, 2, '#3a5a78'); rect(26, H - 7, 2, 1, '#f4f0e8');
    rect(21, st + 1, 1, H - st - 2, '#5a6a80'); g.halo(1, st + 1, 31, H - st - 2, '#c4ecdc', .2);
    g.ground(); g.spill(1, 31, '#c4ecdc', .55); }
  else if(v === 1){ const Rm = M.brick, top = 7, st = H - 15;
    g.box(0, FW, top, Rm); g.tex(2, top + 2, 30, st - top - 2, 'brick', Rm); g.cornice(0, FW, top, Rm); g.roofKit(2, 30, top);
    for(const x of [4, 13, 22]) g.win(x, top + 5, 6, 6, .3, { sill:Rm[3] });
    for(let i = 0; i < 5; i++){ const x = g.ri(3, 28); for(let y = top + 12; y < top + 12 + g.ri(2, 6); y++) px(x, y, mixc('#8a5a3a', Rm[2], .4)); }   // rust streaks
    rect(2, st - 4, 28, 3, '#1a1414'); g.glyRow(4, st - 4, 6, '#4a3a3a');   // a dead sign
    rect(1, st, 31, H - st - 1, Rm[0]); g.shutter(2, st + 1, 13, H - st - 2, M.steel); g.shutter(17, st + 1, 13, H - st - 2, M.grey);
    const spray = ['#ff4a8a', '#ffd04a', '#4ff0ff', '#5aff8a', '#b06bff'];
    for(let n = 0; n < 3; n++){ const c = g.pick(spray), c2 = g.pick(spray); let x = 3 + n * 9, y = st + 4 + g.ri(0, 4); for(let i = 0; i < 9; i++){ rect(x, y, 2, 2, c); px(x, y + 2, INK); if(R() < .3) px(x + 1, y - 1, c2); x += 1; y = Math.max(st + 2, Math.min(H - 5, y + g.ri(-2, 2))); } }
    px(16, st - 1, '#ffd68a'); g.A(.3, () => rect(14, st, 5, 3, '#ffd68a')); g.sideWins(top + 5, st - 3, 8, .25); g.sideBlade(top + 4, 14, NE[4]);
    g.ground(); g.spill(14, 5, '#ffd68a', .3); }
  else { const top = 9, deck = 7, Rm = M.brick, WW = FW + g.SW;
    // a late commuter train on the viaduct: silver body, a row of lit windows, the pantograph touching the wire
    rect(0, 1, WW, 1, M.steel[1]); rect(3, 0, 1, top + 1, M.steel[0]);
    rect(0, 2, WW, top - 2, '#8a94a8'); rect(0, 2, WW, 1, '#c8ccd8'); rect(0, top - 2, WW, 1, '#4a5064'); rect(0, top - 4, WW, 1, '#2a8a5a');
    for(let x = 1; x < WW - 2; x += 5){ const P = R() < .8 ? LIT.fluo : LIT.warm; rect(x, 3, 3, 2, P[1]); px(x, 3, P[0]); if(R() < .4) px(x + 1, 4, '#3a4a50'); }
    rect(18, 1, 1, 1, '#c8c4d0'); rect(16, 0, 5, 1, '#c8c4d0');
    // deck: steel girder with a lit top edge and rivets
    rect(0, top, WW, deck, M.steel[2]); rect(0, top, WW, 1, M.steel[3]); rect(0, top + 1, WW, 1, M.steel[1]); for(let x = 1; x < WW; x += 3) px(x, top + 3, M.steel[3]); rect(0, top + deck - 1, WW, 1, M.steel[0]);
    for(let x = 0; x < WW; x += 8) rect(x, top + 2, 1, deck - 3, M.steel[1]);
    // brick piers and two arches with lit voussoirs
    const ay = top + deck; g.box(0, FW, ay, Rm, g.SW); g.tex(2, ay, 30, H - ay - 1, 'brick', Rm);
    const arch = (x0, w, fill) => { const r = w / 2, cxa = x0 + r - .5, sy = ay + 1 + Math.ceil(r);
      for(let y = ay + 1; y < H - 1; y++){ const dy = Math.max(0, sy - y), hw = dy > r ? -1 : Math.sqrt(r * r - dy * dy); if(hw < 0) continue; const xa = Math.round(cxa - hw + .5), xb = Math.round(cxa + hw - .5);
        rect(xa, y, xb - xa + 1, 1, fill); px(xa - 1, y, Rm[3]); px(xb + 1, y, Rm[1]); if(y === ay + 1 || dy > r - 1.5) { px(xa, y - 1, Rm[3]); px(xb, y - 1, Rm[3]); } } };
    arch(1, 14, '#120a0c'); arch(17, 14, '#3a1e10');
    // right arch: a tiny bar, glowing lattice door, noren, lantern, a sign over the arch
    rect(19, H - 11, 11, 10, '#ffb050'); for(let x = 19; x < 30; x += 2) rect(x, H - 11, 1, 10, '#5c3a22'); rect(19, H - 11, 11, 1, '#ffe0a0'); g.noren(21, H - 12, 7, 4, '#20305a', '#e8e4dc'); g.lantern(29, H - 16);
    g.sign(20, ay + 1, 9, 4, '#ffd04a', { bg:'#f4f0e4', fg:'#c8202a', noBorder:true, ha:.2 });
    // left arch: a yatai cart, red lanterns along its roof, steam, a customer on the bench
    rect(2, H - 15, 13, 2, '#c84a2a'); rect(2, H - 15, 13, 1, '#ff7a4a'); rect(2, H - 13, 13, 1, '#5a1a10');
    rect(3, H - 12, 1, 6, '#3a2a1a'); rect(13, H - 12, 1, 6, '#3a2a1a');
    g.noren(4, H - 12, 9, 3, '#c8202a', '#ffffff'); rect(4, H - 9, 9, 2, '#ffd68a'); rect(4, H - 9, 9, 1, '#fff0c0');
    rect(2, H - 7, 13, 5, '#5c3a22'); rect(2, H - 7, 13, 1, '#8a6a40'); for(let x = 3; x < 14; x += 3) rect(x, H - 5, 2, 2, '#3a2416');
    for(const lx of [2, 12]) g.lantern(lx, H - 19);
    for(let i = 0; i < 5; i++) g.A(.42 - i * .07, () => rect(8 + (i % 2) - (i >> 1), H - 17 - i * 2, 2 + (i >> 1), 2, '#aab8d8'));
    px(16, H - 9, INK); rect(15, H - 8, 2, 4, '#2a2030'); rect(14, H - 4, 4, 1, '#5c3a22');
    g.halo(4, H - 9, 9, 2, '#ffd68a', .3);
    g.ground(); g.spill(19, 11, '#ffb050', .5); g.spill(2, 13, '#ffd68a', .5); } } });

// 15 rooftop billboard: a modest block with a big lit billboard on a steel frame
T.push({ name:'billboard', h:[62, 58, 60], sw:6, draw(g, v){ const { rect, px, H, R } = g, top = 26, Rm = [M.conc, M.beige, M.grey][v];
  // frame legs and diagonals
  for(const x of [5, 15, 26]){ rect(x, 13, 1, top - 13, M.steel[1]); } for(let i = 0; i < top - 14; i++){ px(5 + Math.floor(i * 10 / (top - 14)), 14 + i, M.steel[0]); px(15 + Math.floor(i * 11 / (top - 14)), 14 + i, M.steel[0]); }
  rect(1, 13, 31, 1, M.steel[2]);
  // the board
  const bx = 1, by = 1, bw = 31, bh = 12; rect(bx - 1, by - 1, bw + 2, bh + 2, INK);
  if(v === 0){ rect(bx, by, bw, bh, '#1e4ac8'); for(let y = by; y < by + bh; y += 2) rect(bx, y, bw, 1, '#2a5ad8');
    rect(bx + 3, by + 2, 6, 9, '#e8302a'); rect(bx + 3, by + 2, 1, 9, '#ff8a7a'); rect(bx + 3, by + 5, 6, 2, '#f4f0e8'); rect(bx + 4, by + 1, 4, 1, '#c8c4d0');
    g.glyRow(bx + 12, by + 2, 4, '#ffffff'); g.text('NEW', bx + 13, by + 6, '#ffd04a'); }
  else if(v === 1){ rect(bx, by, bw, bh, '#ff7ab0'); for(let y = by; y < by + bh; y++) for(let x = bx; x < bx + bw; x++) if((x + y) % 2 && y > by + 7) px(x, y, '#ff9ac8');
    rect(bx + 20, by + 2, 8, 8, '#ffe0c8'); rect(bx + 20, by + 2, 8, 3, '#2a1a2a'); rect(bx + 22, by + 7, 4, 1, '#c8204a'); px(bx + 22, by + 5, '#2a1a2a'); px(bx + 25, by + 5, '#2a1a2a');
    g.glyCol(bx + 3, by + 1, 2, '#ffffff'); g.glyCol(bx + 8, by + 1, 2, '#ffffff'); g.text('Y', bx + 13, by + 5, '#ffffff'); }
  else { rect(bx, by, bw, bh, '#2a2e3c'); rect(bx, by, bw, 1, '#3a4050'); g.text('TEL', bx + 3, by + 4, '#5a6070'); g.text('03', bx + 17, by + 4, '#5a6070'); }
  // spotlights from below
  if(v !== 2) for(const x of [6, 16, 26]){ px(x, by + bh + 1, '#fff4c0'); g.A(.18, () => { rect(x - 2, by + bh - 4, 5, 4, '#fff4c0'); rect(x - 1, by + bh - 7, 3, 3, '#fff4c0'); }); }
  rect(FW, by, g.SW - 3, bh, '#1a1e2a');
  g.box(0, FW, top, Rm); g.tex(2, top + 2, 30, H - top - 14, 'conc', Rm); g.cornice(0, FW, top, Rm);
  for(let y = top + 4; y < H - 15; y += 7) for(const x of [4, 12, 20]) g.win(x, y, 5, 4, .4, { sill:Rm[3] });
  for(let y = top + 4; y < H - 15; y += 7) if(R() < .5) g.ac(27, y + 1);
  g.sideWins(top + 4, H - 14, 7, .4);
  const st = H - 13; rect(1, st, 31, 1, Rm[0]); const awn = [['#c8203a', '#e8e4dc'], ['#2a58b8', '#e8e4dc'], ['#1a7a46', '#e8e4dc']][v];
  for(let x = 1; x < FW; x++) rect(x, st + 1, 1, 2, ((x >> 1) % 2) ? awn[0] : awn[1]); rect(1, st + 3, 31, 1, Rm[0]);
  rect(3, st + 4, 18, 7, '#ffd68a'); rect(3, st + 4, 18, 1, '#fff0c0'); for(let i = 0; i < 8; i++) rect(4 + g.ri(0, 16), st + 8 + g.ri(0, 2), 1, 2, g.pick(['#c89a50', '#a85a3a', '#5a8ab0']));
  rect(23, st + 4, 6, 8, '#1a1420'); px(27, st + 8, '#c8c4d0'); g.ground(); g.spill(3, 18, '#ffd68a', .5); if(v !== 1) g.vend(v ? '#c8202a' : '#e8ecf4'); } });

const NT = T.length;
function paint(k, noText){ const t = k % NT, v = Math.floor(k / NT) % 3, D = T[t], H = D.h[v], SW = D.sw, c = document.createElement('canvas'); c.width = FW + SW; c.height = H;
  const g = kit(c, FW + SW, H, SW, k * 7919 + 13); g.noText = noText;
  try{ D.draw(g, v); }catch(e){ console.warn('building', D.name, v, e); }
  // the game adds a neon glow ~24 px under the top of k%10%3===0 buildings: put a blade sign there where the type has room
  if((k % 10) % 3 === 0 && D.blade !== false && SW >= 5 && H > 44) g.sideBlade(18, Math.min(14, H - 34), NE[(k % 10) % 5]);
  return { c, g }; }
const norm = k => ((k | 0) % 48 + 48) % 48;
function build(k){ k = norm(k); const key = 'ebld' + k; return SPR[key] || (SPR[key] = paint(k, false).c); }
// the right-side copy: the whole sprite flipped (side wall now on the left, toward the road), then the latin text redrawn so it still reads
function buildR(k){ k = norm(k); const key = 'ebldR' + k; if(SPR[key]) return SPR[key];
  const { c, g } = paint(k, true), o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d');
  x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); x.setTransform(1, 0, 0, 1, 0, 0);
  const g2 = kit(o, c.width, c.height, g.SW, 1); g2.ops = g.ops; g2.replay(); return SPR[key] = o; }
ENV.buildings = {
  types: T.map(d => d.name),
  sprite: build,
  // spriteR(k): ready-made copy for buildings on the RIGHT of the road (already mirrored, signs still read correctly). Draw it unflipped.
  spriteR: buildR,
  scale: k => 1,
  // (only when some road has no place() of its own and so gets the core's default block buildings: today every road has one)
  warm(){ if(typeof LANDS !== 'undefined' && LANDS.every(L => ENV[L.key] && ENV[L.key].place)) return; for(let k = 0; k < 48; k++){ build(k); buildR(k); } }
};
})();

/* ---------------------------------------------------------------- the projected building kit: ENV.bkit (2026-11-19, buildings3d)
   Snow Onsen's and the Paddies rebuild's method in one place, so any road can stand real buildings beside it instead of billboards.
   A building is a run of road segments (b0, len). Its sprite on each segment calls begin(); far away one slice spans 2-8 segments,
   anchored to the run start and gap-free (the engine's drawPBox rule), and never across a side lane's push. Inside a slice a point is
   (L, h, t): L half-road widths out from the road centre, h up from the ground, t along the slice (0 = this segment, 1 = its far end).
     Q(L0, h0, L1, h1, ta, tb, col)  a band along the slice: a wall band when L0 = L1, a roof slope when L1 > L0
     V(L, h0, h1, t, wd, col)        a post on a face (whole pixels, at least one wide)
     E(L0, h0, L1, h1, col)          a rectangle on the end plane (the run's first segment, facing the camera)
     T(L0, h0, L1, h1, L2, h2, col)  a triangle on the end plane (gables)
     R(L, h, w, hh, col)             a camera-facing rect centred on L with its foot at h, on the end plane (small life)
     RT(L, h, t, w, hh, col)         the same anywhere along the slice
     roof(o, F)                      eave, slope in stepped tones, courses or ribs, lip, ridge, and the end (gable, hip or irimoya)
     bulb / cone / spill             a lamp: a hot bulb with a halo, its cone to the ground, light spilled on the ground
   Every fill goes through poly() or grid rects, so nothing is ever upscaled; colours come through the road's own fog function F.
   The sprite needs { k: segment index, b0, len, side, x, xo: the x it was placed at }; begin() returns the slice length or 0. */
(() => {
let X0 = 0, Y0 = 0, U0 = 0, X1 = 0, Y1 = 0, U1 = 0, SD = 1, LIFT = 0, DL = 0, B0 = 0;
const px = (L, h, t) => X0 + (X1 - X0) * t + SD * (L + DL) * (U0 + (U1 - U0) * t);
const py = (L, h, t) => Y0 + (Y1 - Y0) * t - (h + LIFT) * (U0 + (U1 - U0) * t);
const pu = t => U0 + (U1 - U0) * t;
const span = f => { f = fogPx(f); return f > .45 ? 8 : f > .26 ? 6 : f > .14 ? 4 : f > .05 ? 2 : 1; };
const LX = i => { const t = segs[i]; return t && t.lane ? t.lane.sd : 0; };
const sn = v => Math.round(v / PX) * PX;
const K = { rel:0, m:1, cut:false, end:false, px, py, pu, span };
K.begin = (sp, x, y, uw, fog, lift) => {
  const i = sp.k, rel = i - sp.b0, d = LX(i), cut = rel > 0 && LX(i - 1) !== d;
  const bse = i - Math.round(DRAW_N * Math.pow(fog, 1 / 1.6)), spanAt = k => span(clamp(Math.pow((k - bse) / DRAW_N, 1.6), 0, 1));
  if(rel > 0 && !cut && rel % spanAt(i)) return 0;
  let m = 1; while(rel + m < sp.len && m < 8 && (rel + m) % spanAt(i + m) && LX(i + m) === d) m++;
  const t = segs[i + m - 1]; if(!t || !t.p2.screen.w) return 0; const p = t.p2.screen;
  SD = sp.side; DL = sp.xo !== undefined ? (sp.x - sp.xo) * SD : 0; LIFT = lift || 0; B0 = sp.b0;
  X0 = x - sp.x * uw; Y0 = y; U0 = uw; X1 = p.x; Y1 = p.y; U1 = p.w; K.rel = rel; K.m = m; K.cut = cut; K.end = rel === 0 || cut; return m; };
// is any of the slice between laterals L0..L1 on screen?
K.vis = (L0, L1) => { const a = px(L0, 0, 0), b = px(L0, 0, 1), c = px(L1, 0, 0), e = px(L1, 0, 1); return !(Math.max(a, b, c, e) < -PX || Math.min(a, b, c, e) > W + PX); };
K.Q = (L0, h0, L1, h1, ta, tb, col) => poly(px(L0, h0, ta), py(L0, h0, ta), px(L0, h0, tb), py(L0, h0, tb), px(L1, h1, tb), py(L1, h1, tb), px(L1, h1, ta), py(L1, h1, ta), col);
K.V = (L, h0, h1, t, wd, col) => { const xx = px(L, 0, t), th = Math.max(PX, sn(pu(t) * wd)); if(xx < -th || xx > W + th) return; const ya = py(L, h1, t), yb = py(L, h0, t); if(yb <= ya) return;
  cx.fillStyle = col; cx.fillRect(sn(xx - th / 2), sn(ya), th, Math.max(PX, sn(yb - ya))); };
K.E = (L0, h0, L1, h1, col) => poly(px(L0, h0, 0), py(L0, h0, 0), px(L1, h0, 0), py(L1, h0, 0), px(L1, h1, 0), py(L1, h1, 0), px(L0, h1, 0), py(L0, h1, 0), col);
K.T = (L0, h0, L1, h1, L2, h2, col) => poly(px(L0, h0, 0), py(L0, h0, 0), px(L1, h1, 0), py(L1, h1, 0), px(L2, h2, 0), py(L2, h2, 0), px(L2, h2, 0), py(L2, h2, 0), col);
K.RT = (L, h, t, w, hh, col) => { const u = pu(t), x = px(L, h, t), y = py(L, h, t); cx.fillStyle = col; cx.fillRect(sn(x - w * u / 2), sn(y - hh * u), Math.max(PX, sn(w * u)), Math.max(PX, sn(hh * u))); };
K.R = (L, h, w, hh, col) => K.RT(L, h, 0, w, hh, col);
const rgba = (rgb, a) => 'rgba(' + rgb + ',' + Math.max(0, a).toFixed(3) + ')';
K.bulb = (L, h, t, col, halo, r, a) => { const u = pu(t), x = px(L, h, t), y = py(L, h, t), s = Math.max(PX, sn(u * r)); cx.fillStyle = col; cx.fillRect(sn(x - s / 2), sn(y - s / 2), s, s); if(a > .01) glow(x, y, Math.min(u * r * 9, H * .25), halo, a); };
K.cone = (L, h, t, spread, rgb, a) => { if(a <= .01 || U0 < W * .03) return; cx.globalCompositeOperation = 'lighter'; const x = px(L, h, t), y = py(L, h, t), u = pu(t), gx = px(L, 0, t), gy = py(L, 0, t);
  poly(x - u * .02, y, x + u * .02, y, gx + u * spread, gy, gx - u * spread, gy, rgba(rgb, a)); poly(gx - u * spread * 1.3, gy - u * .02, gx + u * spread * 1.3, gy - u * .02, gx + u * spread, gy + u * .03, gx - u * spread, gy + u * .03, rgba(rgb, a * 1.4));
  cx.globalCompositeOperation = 'source-over'; };
K.spill = (L0, L1, ta, tb, rgb, a) => { if(a <= .01) return; cx.globalCompositeOperation = 'lighter'; K.Q(L0, 0, L1, 0, ta, tb, rgba(rgb, a)); cx.globalCompositeOperation = 'source-over'; };
// the hip's top point lies on the run's (b0 + n)th segment
const hipAt = n => { const e = segs[B0 + n]; if(!e || !e.p1.screen.w) return null; const q = e.p1.screen; return { x:L => q.x + SD * (L + DL) * q.w, y:h => q.y - (h + LIFT) * q.w, w:q.w }; };
/* roof(o, F): o = { X: face lateral, D: depth back from the face, hW: eave height, hR: ridge height, ov: overhang, top: 4 tones eave to
   ridge, rib, rim (moonlit edges), ridge, fascia, shade, tile: 'kawara' | 'tin' | 'flat', end: 'gab' | 'hip' | 'iri', hip: segments the
   hip takes at the run start, gable, tsuma, len: the run length, near, seed, rust } */
K.roof = (o, F) => { const rel = K.rel, m = K.m, near = o.near, hipN = o.end === 'gab' ? 0 : Math.min(o.hip || 2, o.len - 1), rid = o.X + o.D / 2, eL = o.X - o.ov, tin = o.tile === 'tin';
  const topAt = r => hipN && r < hipN ? r / hipN : 1, ta0 = topAt(rel), ta1 = topAt(rel + m);
  const Px = (f, e) => px(eL + (rid - eL) * (e ? ta1 : ta0) * f, 0, e), Py = (f, e) => py(0, o.hW + (o.hR - o.hW) * (e ? ta1 : ta0) * f, e);
  // the eave's shadow on the wall and the fascia board
  K.Q(o.X, o.hW - .09, o.X, o.hW, 0, 1, F(o.shade || '#0c0e18'));
  K.Q(eL, o.hW - .04, eL, o.hW + .01, 0, 1, F(o.fascia || '#20202c'));
  if(o.tile === 'flat'){ K.Q(eL, o.hW + .01, eL, o.hW + .045, 0, 1, F(o.rim)); return; }
  { const nb = near ? 4 : 2; for(let b = 0; b < nb; b++){ const f0 = b / nb, f1 = (b + 1) / nb + .002; poly(Px(f0, 0), Py(f0, 0), Px(f0, 1), Py(f0, 1), Px(f1, 1), Py(f1, 1), Px(f1, 0), Py(f1, 0), F(o.top[near ? b : b * 2 + 1])); } }
  if(near){
    if(!tin){ const nc = o.courses || 6; for(let c = 1; c < nc; c++){ const f = c / nc, x0 = Px(f, 0), y0 = Py(f, 0), x1 = Px(f, 1), y1 = Py(f, 1); poly(x0, y0, x1, y1, x1, y1 + PX, x0, y0 + PX, F(o.rib)); }
      const nk = Math.max(1, Math.round(m * (o.cols || 2))); for(let c = 0; c < nk; c++){ const tt = (c + .5) / nk, tp = topAt(rel + m * tt), hh = o.hW + (o.hR - o.hW) * tp, ll = eL + (rid - eL) * tp, ax = px(eL, o.hW, tt), ay = py(eL, o.hW, tt), bx = px(ll, hh, tt), by = py(ll, hh, tt);
        poly(ax, ay, bx, by, bx + PX, by, ax + PX, ay, F(o.top[3])); }
      const nl = Math.max(2, Math.round(m * 3)); for(let c = 0; c < nl; c++) K.Q(eL, o.hW + .005, eL, o.hW + .03, (c + .1) / nl, (c + .6) / nl, F(o.rim)); }
    else { const nr = Math.max(4, m * 6); for(let c = 0; c < nr; c++){ const tt = (c + .5) / nr, ax = px(eL, o.hW, tt), ay = py(eL, o.hW, tt), bx = px(rid, o.hR, tt), by = py(rid, o.hR, tt); poly(ax, ay, bx, by, bx + PX, by, ax + PX, ay, F(c % 2 ? o.rib : o.top[3]));
        const rs = hash((o.seed || 0) * 3.7 + rel * 1.3 + c); if(o.rust && rs > .6){ const f = .2 + rs * .4; poly(ax + PX, ay, ax + (bx - ax) * f + PX, ay + (by - ay) * f, ax + (bx - ax) * f + PX * 2, ay + (by - ay) * f, ax + PX * 2, ay, F(o.rust)); } }
      K.Q(eL, o.hW - .01, eL, o.hW + .02, 0, 1, F(o.rim)); } }
  else K.Q(eL, o.hW, eL, o.hW + .025, 0, 1, F(o.rim));
  // the ridge: a heavy band and its moonlit top
  if(ta1 >= 1){ const s0 = Math.max(0, (hipN - rel) / m), rw = o.ridgeW || .06; K.Q(rid - rw, o.hR - .02, rid + rw, o.hR + .07, s0, 1, F(o.ridge || '#0a0c14')); K.Q(rid - rw * .7, o.hR + .05, rid + rw * .7, o.hR + .08, s0, 1, F(o.rim)); }
  if(!K.end) return;
  const D = o.D;
  if(!hipN){ K.T(o.X, o.hW, o.X + D, o.hW, rid, o.hR, F(o.gable || o.top[1]));
    if(tin && near) for(let c = 1; c < 6; c++){ const L = o.X + D * c / 6, hh = o.hW + (o.hR - o.hW) * (1 - Math.abs(L - rid) / (D / 2)); K.E(L, o.hW, L + .012, hh, F(c % 2 ? o.rib : o.top[3])); }
    if(o.gableFn) o.gableFn(rid);
    const bw = .045; poly(px(eL, o.hW - .03, 0), py(eL, o.hW - .03, 0), px(rid, o.hR + .03, 0), py(rid, o.hR + .03, 0), px(rid, o.hR + .03 + bw, 0), py(rid, o.hR + .03 + bw, 0), px(eL, o.hW - .03 + bw, 0), py(eL, o.hW - .03 + bw, 0), F(o.rim));
    poly(px(o.X + D + o.ov, o.hW - .03, 0), py(o.X + D + o.ov, o.hW - .03, 0), px(rid, o.hR + .03, 0), py(rid, o.hR + .03, 0), px(rid, o.hR + .03 + bw, 0), py(rid, o.hR + .03 + bw, 0), px(o.X + D + o.ov, o.hW - .03 + bw, 0), py(o.X + D + o.ov, o.hW - .03 + bw, 0), F(o.rib));
    return; }
  const q = hipAt(hipN); if(!q) return;
  const iri = o.end === 'iri', gw = iri ? Math.min(.32, D * .2) : 0, gL = rid - gw, gR = rid + gw, gh = iri ? o.hR - (o.hR - o.hW) * .35 : o.hR;
  { const ex0 = px(eL, o.hW, 0), ey0 = py(eL, o.hW, 0), ex1 = px(o.X + D + o.ov, o.hW, 0), lx = q.x(gL), rx = q.x(gR), ty = q.y(gh);
    for(let b = 0; b < 4; b++){ const f0 = b / 4, f1 = (b + 1) / 4 + .004, a1 = ex0 + (lx - ex0) * f0, a2 = ey0 + (ty - ey0) * f0, b1 = ex1 + (rx - ex1) * f0, c1 = ex1 + (rx - ex1) * f1, d1 = ex0 + (lx - ex0) * f1, d2 = ey0 + (ty - ey0) * f1;
      poly(a1, a2, b1, a2, c1, d2, d1, d2, F(o.top[b])); if(near && b && !tin) poly(a1, a2, b1, a2, b1, a2 + PX, a1, a2 + PX, F(o.rib)); } }
  poly(px(eL, o.hW, 0), py(eL, o.hW, 0), q.x(gL), q.y(gh), q.x(gL) + PX, q.y(gh), px(eL, o.hW, 0) + PX, py(eL, o.hW, 0), F(o.rim));
  poly(px(o.X + D + o.ov, o.hW, 0), py(o.X + D + o.ov, o.hW, 0), q.x(gR), q.y(gh), q.x(gR) - PX, q.y(gh), px(o.X + D + o.ov, o.hW, 0) - PX, py(o.X + D + o.ov, o.hW, 0), F(o.rib));
  K.E(eL, o.hW - .04, o.X + D + o.ov, o.hW + .01, F(o.fascia || '#20202c')); if(near && !tin) for(let c = 0; c < 9; c++) K.E(eL + (D + 2 * o.ov) * (c + .2) / 9, o.hW + .005, eL + (D + 2 * o.ov) * (c + .6) / 9, o.hW + .03, F(o.rim));
  if(!iri) return;
  // the small gable (tsuma): plaster crossed by dark timbers, pale bargeboards meeting at the ridge, an onigawara on the ridge end
  poly(q.x(gL), q.y(gh), q.x(gR), q.y(gh), q.x(rid), q.y(o.hR), q.x(rid), q.y(o.hR), F(o.tsuma || '#5a6280'));
  if(near){ cx.fillStyle = F('#141018'); for(let c = 1; c < 4; c++){ const L = gL + (gR - gL) * c / 4, top = gh + (o.hR - gh) * (1 - Math.abs(L - rid) / (rid - gL)); cx.fillRect(sn(q.x(L)), sn(q.y(top)), PX, Math.max(PX, sn(q.y(gh) - q.y(top)))); } }
  const bw = Math.max(PX, q.w * .035);
  poly(q.x(gL - .04), q.y(gh - .02), q.x(rid), q.y(o.hR + .03), q.x(rid), q.y(o.hR + .03) - bw, q.x(gL - .04), q.y(gh - .02) - bw, F(o.rim));
  poly(q.x(gR + .04), q.y(gh - .02), q.x(rid), q.y(o.hR + .03), q.x(rid), q.y(o.hR + .03) - bw, q.x(gR + .04), q.y(gh - .02) - bw, F(o.rim));
  const ow = Math.max(PX * 2, sn(q.w * .09)), oh = Math.max(PX * 2, sn(q.w * .11)); cx.fillStyle = F('#0a0c12'); cx.fillRect(sn(q.x(rid) - ow / 2), sn(q.y(o.hR + .05) - oh), ow, oh); cx.fillStyle = F(o.rim); cx.fillRect(sn(q.x(rid) - ow / 2), sn(q.y(o.hR + .05) - oh), ow, PX); };
// the far tier: wall, an optional lit band [h0, h1, colour], the roof slope, the end silhouette; three to five quads
K.far = (o, F, lit) => { K.Q(o.X, 0, o.X, o.hW, 0, 1, F(o.wall)); if(lit) K.Q(o.X, lit[0], o.X, lit[1], .15, .85, lit[2]);
  if(o.tile !== 'flat') K.Q(o.X - o.ov, o.hW, o.X + o.D / 2, o.hR, 0, 1, F(o.top[2])); else K.Q(o.X - o.ov, o.hW, o.X - o.ov, o.hW + .04, 0, 1, F(o.rim));
  if(K.end){ const rid = o.X + o.D / 2; K.E(o.X, 0, o.X + o.D, o.hW, F(o.endWall || o.wall)); if(o.tile !== 'flat') K.T(o.X - o.ov, o.hW, o.X + o.D + o.ov, o.hW, rid, o.hR, F(o.top[1])); } };
// draw fn() faded out over the last stretch before fog lim (no pop at the limit)
K.fade = (fog, lim, fn) => { if(fog > lim) return; const a0 = cx.globalAlpha; if(fog > lim - .08) cx.globalAlpha = a0 * (lim - fog) / .08; fn(); cx.globalAlpha = a0; };
ENV.bkit = K;
})();
