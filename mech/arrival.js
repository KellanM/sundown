/* Sundown mechanic module: arrival (the moment you enter a new road). See mech/README.md.
   An arcade stage card drawn in hard pixels on the low-res canvas. It replaces the DOM banner.
   References looked at, rules taken (nothing copied):
   - Sonic the Hedgehog (Sega 1991) zone title cards: flat slabs slide in from the screen edge, the name in big outlined
     block letters, an act number; it holds about a second and a half, then the slabs retract the way they came.
   - Super Hang-On (Sega 1987): "COURSE AFRICA / STAGE 1" as small boxed labels; OutRun (Sega 1986): "STAGE n" small in a
     corner and "EXTENDED PLAY" announced at each checkpoint, never covering the road for long.
   - Street Fighter II (Capcom 1991): one big hit first (ROUND 1, FIGHT), then the small type; the big thing lands on a beat.
   - Akira poster (1988): a red kanji stamped over a heavy black block; Japanese calligraphy: a small red seal (hanko)
     beside the big brush character; manga focus lines (shuuchuusen) converging on the thing that hits.
   - Hotline Miami cover: slanted chunky wordmark in stepped chrome bands; bosozoku tokko-fuku: gold on black, tri-stripes.
   - The game's own title (SUNDOWN wordmark: 2-pixel block face, slant one step per two rows, chrome ramp, hard extrusion)
     and HUD (3x5 pixel font, boxed labels, cyan/gold/red on ink).
   Timeline: slab 0-.16 s, kanji slam at .18 (shake, sting chord in the road's key), text .24, hold, retract 1.9-2.25 s.
   Reduced motion: no flash, shake, slam or flicker; the whole card fades in and out in four steps. */
"use strict";
(() => {
const A = MECH.arrival = {};
const T_IN = .16, T_HIT = .18, T_TXT = .24, T_OUT = 1.9, T_END = 2.25, R_END = 2.5;
const SIREN_R = '#ff2a3a', SIREN_B = '#8a0c20';   // Japanese patrol light bars are red only: the alternating pair is bright red and deep red (was blue)
const COL = { police:'#3a6aff', harbour:'#ff5a8a', bay:'#4ff0ff', neon:'#c77dff', tunnels:'#ffb347', pass:'#7aff9a', refinery:'#ffd04a', coast:'#5affd8', snow:'#dff0ff', paddies:'#d8ff5a',
  aqua:'#3ab0ff', shimanami:'#ff9a8a', sakurajima:'#ff6a3a', haneda:'#6a80ff', minato:'#ff8ad8', shuto:'#3ad67a', kurobe:'#9ae0ff', akiba:'#ffd23a', gion:'#ff9a4a' };   // the last four match the results screen's road colours
const INK = '#07060c', CREAM = '#f4ecdf', GOLD = '#ffd04a', RED = '#ff2a3a';
const C = {};      // cache: per road and layout
let cur = null;    // the card on screen: { i, L, z, t0, chip, lay, shook }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const roadCol = L => L.col || COL[L.key] || CREAM;
const dark = (c, k) => mixc(c, INK, k);
const step = (p, n) => Math.floor(clamp(p, 0, 1) * n) / n;
const HS = n => hash(n);   // (not H: that is the game's screen height)

/* ---------- 3x5 pixel font (the HUD's), for labels and the subtitle ---------- */
const F3 = { '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111',
  '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', A:'010101111101101', B:'110101110101110', C:'011100100100011',
  D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111', J:'001001001101111', K:'101101110101101',
  L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', Q:'010101101111011', R:'110101110101101', S:'011100010001110',
  T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', Z:'111001010100111', '/':'001001010100100',
  '.':'000000000000010', ' ':'000000000000000', '-':'000000111000000', '+':'000010111010000', ':':'000010000010000', ',':'000000000010100', "'":'010010000000000', '!':'010010010000010' };
function txt3At(g, s, x, y, col, sh){ s = s.toUpperCase();   // straight onto a context: labels redrawn on a reused canvas need no new one
  for(const [cc, o] of [[sh, 1], [col, 0]]){ if(!cc) continue; g.fillStyle = cc;
    for(let n = 0; n < s.length; n++){ const b = F3[s[n]] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(x + n * 4 + i % 3 + o, y + (i / 3 | 0) + o, 1, 1); } } }
function txt3(s, col, sh){ const c = mk(s.length * 4 + 1, 6); txt3At(c.getContext('2d'), s, 0, 0, col, sh); return c; }

/* ---------- the road name in the title's block face: 2-pixel strokes, slanted one step every two rows ---------- */
const G7 = { A:['.XXXX.', 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX'], B:['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.'],
  C:['.XXXXX', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', '.XXXXX'], D:['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'],
  E:['XXXXXX', 'XX....', 'XX....', 'XXXXX.', 'XX....', 'XX....', 'XXXXXX'], F:['XXXXXX', 'XX....', 'XX....', 'XXXXX.', 'XX....', 'XX....', 'XX....'],
  G:['.XXXXX', 'XX....', 'XX....', 'XX.XXX', 'XX..XX', 'XX..XX', '.XXXXX'], H:['XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', 'XX..XX', 'XX..XX', 'XX..XX'],
  I:['XX', 'XX', 'XX', 'XX', 'XX', 'XX', 'XX'], J:['....XX', '....XX', '....XX', '....XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  K:['XX..XX', 'XX.XX.', 'XXXX..', 'XXX...', 'XXXX..', 'XX.XX.', 'XX..XX'], L:['XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XX....', 'XXXXXX'],
  M:['XX...XX', 'XXX.XXX', 'XXXXXXX', 'XX.X.XX', 'XX...XX', 'XX...XX', 'XX...XX'], N:['XX..XX', 'XXX.XX', 'XXXXXX', 'XX.XXX', 'XX..XX', 'XX..XX', 'XX..XX'],
  O:['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'], P:['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX....', 'XX....', 'XX....'],
  Q:['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX.XXX', 'XX..XX', '.XXX.X'], R:['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX.XX.', 'XX..XX', 'XX..XX'],
  S:['.XXXXX', 'XX....', 'XX....', '.XXXX.', '....XX', '....XX', 'XXXXX.'], T:['XXXXXX', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..', '..XX..'],
  U:['XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'], V:['XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '..XX..'],
  W:['XX...XX', 'XX...XX', 'XX...XX', 'XX.X.XX', 'XXXXXXX', 'XXX.XXX', 'XX...XX'], X:['XX..XX', 'XX..XX', '.XXXX.', '..XX..', '.XXXX.', 'XX..XX', 'XX..XX'],
  Y:['XX..XX', 'XX..XX', 'XX..XX', '.XXXX.', '..XX..', '..XX..', '..XX..'], Z:['XXXXXX', '....XX', '...XX.', '..XX..', '.XX...', 'XX....', 'XXXXXX'],
  '1':['..XX..', '.XXX..', 'XXXX..', '..XX..', '..XX..', '..XX..', 'XXXXXX'], '2':['.XXXX.', 'XX..XX', '....XX', '...XX.', '..XX..', '.XX...', 'XXXXXX'],
  '3':['XXXXX.', '....XX', '....XX', '.XXXX.', '....XX', '....XX', 'XXXXX.'], '!':['XX', 'XX', 'XX', 'XX', 'XX', '..', 'XX'],
  ' ':['...', '...', '...', '...', '...', '...', '...'] };
function blockMask(str, s, slant){ str = str.toUpperCase(); const gl = [...str].map(ch => G7[ch] || G7[' ']), gap = 1, rows = 7, sl = Math.ceil(s * (slant == null ? 2 / 3 : slant));
  const W0 = gl.reduce((a, g) => a + g[0].length + gap, -gap), m = mk(W0 * s + 3 * sl, rows * s), k = m.getContext('2d'); k.fillStyle = '#fff'; let gx = 0;
  gl.forEach(g => { g.forEach((row, y) => { const off = Math.floor((rows - 1 - y) / 2) * sl; [...row].forEach((c, x) => { if(c === 'X') k.fillRect((gx + x) * s + off, y * s, s, s); }); }); gx += g[0].length + gap; });
  return m; }
const CHROME14 = ['#ffffff', '#f2fbff', '#dcf2ff', '#bfe4ff', '#9ccff8', '#6e9ee6', '#3c58b0', '#ffe9a8', '#ffd04a', '#ffb347', '#ff8a3a', '#ff5a3a', '#e0303a', '#b0203a'];   // the logo's chrome, re-stepped for 14 rows: a hard sky/ground horizon, no dark band
const CHROME7 = ['#ffffff', '#bfe4ff', '#6e9ee6', '#ffd04a', '#ff8a3a', '#e0303a', '#b0203a'];
function maskBits(m){ const d = m.getContext('2d').getImageData(0, 0, m.width, m.height).data, b = new Uint8Array(m.width * m.height); for(let i = 0; i < b.length; i++) b[i] = d[i * 4 + 3] > 127 ? 1 : 0; return b; }
function bitsCanvas(bits, w, h, col){ const c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), [r, gg, b] = hx(col);
  for(let i = 0; i < bits.length; i++) if(bits[i]){ img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255; } g.putImageData(img, 0, 0); return c; }
// a name line: chrome face, black outline, extrusion in the road's dark colour (the logo's recipe)
function nameLine(str, s, col){ const m = blockMask(str, s), dep = s >= 2 ? 3 : 2, c = mk(m.width + dep + 3, m.height + dep + 3), k = c.getContext('2d');
  stampMask(k, m, 1, 1, 1, bandMask(m, s >= 2 ? CHROME14 : CHROME7), INK, dark(col, .55), dep);
  const off = mk(c.width, c.height), ko = off.getContext('2d'); stampMask(ko, m, 1, 1, 1, tintMask(m, dark(col, .62)), INK, dark(col, .8), dep);   // the unlit tube (neon flicker)
  return { c, off, bits:maskBits(m), mw:m.width, mh:m.height }; }

/* ---------- the kanji: the pixel glyph upscaled with its block corners chipped (so dots join into strokes), stamped over a painted brush swash ---------- */
// DotGothic16 drawn at 16 x s px (each design dot becomes about s x s), at the sub-pixel offset where it lands cleanest on the grid, thresholded;
// then every convex corner is chipped one pixel so the dots read as joined strokes with soft ends
// glyphMask is the costliest call at load (it was ~2.3 s of a 5.5 s boot): results are cached per glyph and scale (cleared when the font subsets
// arrive), all 16 trial offsets share one CPU-backed scratch canvas, a trial stops counting once it can't beat the best, and only the winner is thresholded
const GM = new Map(); let GMC = null, GMK = null;
function glyphMask(ch, s){ const key = ch + '|' + s; let r = GM.get(key); if(!r){ r = glyphMask0(ch, s); GM.set(key, r); } return r; }
function glyphMask0(ch, s){ const fs = 16 * s, cw0 = fs * ch.length + 8, ch0 = fs + 8; let bestMid = Infinity, bx = 0, by = 0;
  if(!GMC){ GMC = mk(cw0, ch0); GMK = GMC.getContext('2d', { willReadFrequently:true }); } if(GMC.width < cw0 || GMC.height < ch0){ GMC.width = Math.max(GMC.width, cw0); GMC.height = Math.max(GMC.height, ch0); }
  const k = GMK, draw = (ox, oy) => { k.clearRect(0, 0, cw0, ch0); k.font = fs + 'px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#fff'; k.fillText(ch, 4 + ox, 4 + oy); return k.getImageData(0, 0, cw0, ch0).data; };
  for(const oy of [0, .25, .5, .75]) for(const ox of [0, .25, .5, .75]){ const d = draw(ox, oy); let mid = 0;
    for(let i = 3; i < d.length; i += 4){ const a = d[i]; if(a > 30 && a < 225 && ++mid >= bestMid) break; }
    if(mid < bestMid){ bestMid = mid; bx = ox; by = oy; } }
  const d = draw(bx, by), sb = new Uint8Array(cw0 * ch0); for(let i = 0; i < sb.length; i++) sb[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  const on = (x, y) => x >= 0 && y >= 0 && x < cw0 && y < ch0 && sb[y * cw0 + x] === 1;
  let x0 = cw0, x1 = 0, y0 = ch0, y1 = 0; for(let y = 0; y < ch0; y++) for(let x = 0; x < cw0; x++) if(sb[y * cw0 + x]){ x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if(x1 < x0){ x0 = 0; x1 = cw0 - 1; y0 = 0; y1 = ch0 - 1; }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, b = new Uint8Array(w * h);
  for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++){ if(!on(x, y)) continue; const L = on(x - 1, y), R = on(x + 1, y), U = on(x, y - 1), D = on(x, y + 1);
    if(s > 1 && (L + R + U + D) <= 1) continue;   // a stray spur (at 1x the glyph is the font's own dots: keep them all)
    if(s > 1 && ((!L && !U && R && D) || (!R && !U && L && D) || (!L && !D && R && U) || (!R && !D && L && U))) continue;   // a convex corner
    b[(y - y0) * w + x - x0] = 1; }
  return { b, w, h }; }
// a sumi brush stroke: pressed down hard on the left, dragged right, splitting into dry-brush hairs at the tail
// kodawari #30: its head is cut on a slant (the brush lands from the upper left), not rounded: the round head read as a pink disc, a blob
// beside the kanji. Bristle grooves (b = 2) run along the body so it reads as a dragged stroke.
function swashMask(w, h, seed){ const b = new Uint8Array(w * h), cut = h * .35;
  for(let x = 0; x < w; x++){ const p = x / w, wob = (HS(Math.floor(x / 3) + seed) - .5) * 2;
    const top = h * (.1 + .08 * Math.sin(p * 2.6 + seed)) + wob, bot = h * (.93 - .3 * Math.pow(p, 1.6)) + wob * .6;
    for(let y = Math.max(0, Math.round(top)); y <= Math.min(h - 1, Math.round(bot)); y++){ if(x < (y - top) / Math.max(1, bot - top) * cut) continue;   // the slanted entry
      const r = HS(y * 3.1 + seed * 7), hair = r > .5 && p > .42 + HS(y * 1.7 + seed) * .35;
      if(hair && HS(x * .37 + y * 9.1) > .25) continue; if(p > .88 && (x + y) % 2) continue;
      b[y * w + x] = r > .7 && y > top + 1 && y < bot - 1 && p > .12 + HS(y * 2.3 + seed) * .2 ? 2 : 1; } }
  for(let n = 0; n < 9; n++){ const x = Math.floor(w * (.7 + HS(n * 3.3 + seed) * .29)), y = Math.floor(h * (.15 + HS(n * 7.9 + seed) * .7)); b[y * w + x] = 1; if(n % 3 === 0 && x + 1 < w) b[y * w + x + 1] = 1; }   // spatter off the tail
  return b; }
function stackMask(str, s){ const gs = [...str].map(ch => glyphMask(ch, s)), gap = s * 2, w = Math.max(...gs.map(g => g.w)), h = gs.reduce((a, g) => a + g.h + gap, -gap), b = new Uint8Array(w * h); let y0 = 0;   // vertical, like a tokko-fuku sleeve
  for(const g of gs){ const ox = Math.floor((w - g.w) / 2); for(let y = 0; y < g.h; y++) for(let x = 0; x < g.w; x++) if(g.b[y * g.w + x]) b[(y0 + y) * w + ox + x] = 1; y0 += g.h + gap; } return { b, w, h }; }
function kanjiStamp(L, s, i, vertical){ const g = vertical ? stackMask(L.kanji, s) : glyphMask(L.kanji, s), m = bitsCanvas(g.b, g.w, g.h, '#ffffff'), col = roadCol(L), dep = s >= 4 ? 3 : 2;
  const padL = Math.round(g.w * .45), sw = padL + g.w + 8, sh = Math.round(g.h * .62), W2 = sw + dep + 4, H2 = g.h + dep + 4;   // the brush lands left of the kanji and drags right under it, its tail ending where the type begins
  const sm = bitsCanvas(swashMask(sw, sh, i * 13.7 + 3), sw, sh, '#ffffff'), sy = Math.round(g.h * .3);
  const sw2 = mk(W2, H2), ks = sw2.getContext('2d'), smb = swashMask(sw, sh, i * 13.7 + 3), gr = bitsCanvas(smb.map(v => v === 2 ? 1 : 0), sw, sh, dark(col, .4)), ol = tintMask(sm, INK);
  for(const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ks.drawImage(ol, dx, sy + dy);   // a one-pixel ink edge: it reads as a mark on the slab, not a soft blob
  ks.drawImage(bandMask(sm, [mixc(col, '#ffffff', .3), col, col, col, dark(col, .25), dark(col, .45)]), 0, sy); ks.drawImage(gr, 0, sy);
  const c = mk(W2, H2), k = c.getContext('2d'); stampMask(k, m, padL, 1, 1, bandMask(m, ['#ffffff', '#ffffff', '#f4ecdf', '#e6dccb']), INK, '#1a0a1c', dep);
  const wh = mk(W2, H2); stampMask(wh.getContext('2d'), m, padL, 1, 1, tintMask(m, '#ffffff'), '#ffffff', '#ffffff', 0);
  return { c, swash:sw2, white:wh, w:W2, h:H2, gx:padL, gw:g.w }; }

/* ---------- the hanko seal with the road number, and the boxed labels ---------- */
const KN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const kNum = n => n <= 0 ? KN[0] : n < 10 ? KN[n] : n === 10 ? '十' : n < 20 ? '十' + KN[n - 10] : KN[Math.floor(n / 10) % 10] + '十' + (n % 10 ? KN[n % 10] : '');
function seal(n){ return sealStr(kNum(n), n); }
function sealStr(str, n){ const key = 'seal' + str; if(C[key]) return C[key]; const t = pixText(str, 16), w = t.width + 3, h = 21, c = mk(w, h), k = c.getContext('2d');
  k.fillStyle = INK; k.fillRect(0, 0, w, h);   // kodawari #30: an ink rim, so the red seal never melts into a red or pink brush stroke under it
  k.fillStyle = '#c8102a'; k.fillRect(1, 1, w - 2, h - 2);
  k.fillStyle = '#ff3b4a'; k.fillRect(2, 1, w - 4, 1);
  k.drawImage(tintMask(t, CREAM), 2, 1);
  k.fillStyle = 'rgba(0,0,0,0)'; k.globalCompositeOperation = 'destination-out'; for(let q = 0; q < 9; q++){ k.fillStyle = '#000'; k.fillRect(Math.floor(HS(n * 7 + q) * w), Math.floor(HS(n * 11 + q * 3) * h), 1, 1); }   // worn ink
  return C[key] = c; }
// a boxed label; cached by its text and colours, or (into) redrawn on a canvas made at load, for labels that change per ride (ROAD n, the km)
function boxLabel(s, fg, edge, fill, into){ const key = 'bl:' + s + fg + edge + (fill || ''); if(!into && C[key]) return C[key];
  const w = s.length * 4 + 6, c = into || mk(w, 10); if(into){ if(c.width !== w) c.width = w; c.height = 10; } const k = c.getContext('2d'); k.clearRect(0, 0, w, 10);
  k.fillStyle = INK; k.fillRect(0, 0, w, 10); k.fillStyle = edge; k.fillRect(0, 0, w, 1); k.fillRect(0, 9, w, 1); k.fillRect(0, 0, 1, 10); k.fillRect(w - 1, 0, 1, 10);
  if(fill){ k.fillStyle = fill; k.fillRect(1, 1, w - 2, 8); } txt3At(k, s, 3, 2, fg, null); return into ? c : (C[key] = c); }
const LBL = { road:mk(1, 10), km:mk(1, 10) };   // the two per-ride labels' canvases, made at load

/* ---------- layout + cached pieces for one road at the current canvas size ---------- */
function wrap(str, max){ const out = []; let line = ''; for(const w of str.split(' ')){ const t = line ? line + ' ' + w : w; if(t.length > max && line){ out.push(line); line = w; } else line = t; } if(line) out.push(line); return out; }
function card(i){ return cardFor(LANDS[i], i); }
const extLabel = () => boxLabel((cx.canvas.width < 260 ? 'EXT +' : 'EXTENDED +') + GATE_BONUS, INK, GOLD, GOLD);
function cardFor(L, i){ const cw = cx.canvas.width, chh = cx.canvas.height, key = L.key + ':' + cw + 'x' + chh; if(C[key]) return C[key];
  const col = roadCol(L), narrow = cw < 260, nk = [...L.kanji].length, two = nk > 1, vertical = two && narrow, short = !narrow && chh < 210 && !L.ks;   // short: a phone on its side (kodawari #8): a smaller card at the very top, so the road stays clear
  const ks = L.ks ? (narrow ? L.nks : L.ks) : narrow || short ? (nk > 2 ? 1 : 2) : nk > 2 ? (nk * 34 <= cw * .42 ? 2 : 1) : two ? 3 : chh >= 230 ? 4 : 3, kj = kanjiStamp(L, ks, i, vertical);   // longer titles (moment cards: 首都高越え) step the kanji down so they fit
  // one layout for every width: the kanji on the left, the type in a column beside it (phones get a smaller kanji and the 1x name face)
  const kr = kj.gx + kj.gw + (narrow ? 9 : 10), avail = narrow ? cw - 9 - kr : Math.min(Math.round(cw * .62), cw - 20 - kr), nameW = (s, str) => blockMask(str, s).width + 6;
  let lines = [L.name], ns = narrow || short ? (L.nns || 1) : (L.ns || 2);
  if(nameW(ns, L.name) > avail){ lines = L.name.split(' '); if(lines.some(w => nameW(ns, w) > avail)) ns = 1; }
  const names = lines.map(s => nameLine(s, ns, col)), nw = Math.max(...names.map(n => n.c.width)), lineH = names[0].c.height - 1;
  const note = L.note || 'Ride till sunrise', noteLines = narrow && i < 90 ? [] : wrap(note, narrow ? Math.floor(avail / 4) : Math.min(46, Math.floor(avail / 4))).map(s => txt3(s, CREAM, INK)), noteW = Math.max(...noteLines.map(c => c.width));
  const o = { i, L, col, narrow, kj, names, noteLines, cw, ch:chh };
  const tagH = 10, gap = narrow ? 2 : 3, textH = tagH + gap + lineH * names.length + gap + noteLines.length * 7;
  // (a phone's road card drops its one-line note: the card then ends above 40% of the screen, kodawari #8; moment cards keep their instruction)
  const textW = Math.max(nw, noteW, narrow ? 40 : 60), gw = kr + textW; o.gx = narrow ? 3 : Math.round((cw - gw) / 2);
  o.by = Math.round(chh * (narrow ? L.nby || .27 : short && !L.lb ? .05 : L.by || .2)); o.bh = Math.max(textH + 10, kj.h + (L.fullbh ? 6 : -10)); o.kx = o.gx; o.ky = Math.round(o.by + o.bh / 2 - kj.h / 2 + 2);
  if(L.lb){ const top = Math.ceil(chh * .11) + 3, lift = Math.max(top - o.ky, top - (o.by - 4)); if(lift > 0){ o.by += lift; o.ky += lift; } }   // moment cards stay clear of the director's letterbox
  o.tx = o.gx + kr; o.ty = o.by + Math.round((o.bh - textH) / 2); o.bx = narrow ? -6 : o.gx - 14; o.align = 'left';
  o.tagH = tagH; o.lineH = lineH; o.gap = gap;
  // focus lines converging on the kanji, two frames, thresholded to hard pixels
  o.kcx = o.kx + kj.gx + kj.gw / 2; o.kcy = o.ky + kj.h / 2;
  // (the countdown's GO card only: road and moment cards draw no lines over the road, kodawari #11)
  o.focus = !/^cd/.test(L.key) ? null : [0, 1].map(f => { const c = mk(cw, chh), k = c.getContext('2d'), R = Math.hypot(cw, chh), r0 = kj.h * (f ? .95 : .75); k.fillStyle = '#fff';
    for(let n = 0; n < 34; n++){ const a = (n + HS(n * 3.3 + f * 7) * .7) / 34 * 6.283, wd = .006 + HS(n * 5.7 + f) * .012, rr0 = r0 * (1 + HS(n * 2.1 + f * 3) * .8);
      k.beginPath(); k.moveTo(o.kcx + Math.cos(a) * rr0, o.kcy + Math.sin(a) * rr0); k.lineTo(o.kcx + Math.cos(a - wd) * R, o.kcy + Math.sin(a - wd) * R); k.lineTo(o.kcx + Math.cos(a + wd) * R, o.kcy + Math.sin(a + wd) * R); k.fill(); }
    const d = k.getImageData(0, 0, cw, chh); for(let q = 3; q < d.data.length; q += 4) d.data[q] = d.data[q] > 100 ? 255 : 0; k.putImageData(d, 0, 0); return c; });
  return C[key] = o; }
// warmAll() builds everything now; warmAllSteps() is the same build with stopping points for the staged warm-up (sundown.html WARM.q). Every piece is
// also built on first use (cached in C), so a card is never missing because the build was still under way.
function warmAll(){ for(const _ of warmAllSteps()); }
function* warmAllSteps(){ yield* warmNowSteps(); yield* warmLateSteps(); }
/* first 60 s (research/sundown-craft/first60.md): split in two so START waits only for what the first minute shows. Now: the cards of the first three
   roads, the seals, the callouts, the labels and the countdown, the moment cards. Late (MECH.arrivalLate, built while the title or the results idle,
   or in safe slices of a ride): the other roads' cards and the pull-over's figures; any of them is still built on first use if it is asked for early. */
function* warmNowSteps(){ if(typeof pixText !== 'function' || !cx) return; warmKey = sizeKey(); askFonts(); const soon = new Set([0]); try{ for(let z = 0; z <= 2; z++) soon.add(landIdx(z)); }catch(e){}
  for(const i of soon){ card(i); yield; } for(let n = 1; n <= 24; n++) seal(n); coWarm(); yield;
  try{ extLabel(); boxLabel('POLICE', CREAM, SIREN_B); cdWarm(); }catch(e){ console.warn('arrival warm labels', e); } yield;
  try{ for(const k in MOML) cardFor(MOML[k].L, 97); }catch(e){ console.warn('moment rewarm', e); } yield;
  try{ yield* sgSteps(); }catch(e){ console.warn('arrival warm sign steps', e); } }
function* warmLateSteps(){ if(typeof pixText !== 'function' || !cx) return; for(let i = 0; i < LANDS.length; i++){ card(i); yield; }
  try{ pullWarm(); }catch(e){ console.warn('arrival warm pull', e); } yield;
  try{ cardFor(POL_L, 99); sealStr('御用', 0); glintSpr(); }catch(e){ console.warn('arrival warm', e); } yield;   // the pull-over: every figure pose, so nothing is built mid-arrest
  try{ if(MECH.police && MECH.police.officer) for(const p of ['idle', 'look', 'radio', 'point', 'reach', 'cuff', 'escort', 'head', 'kneel', 'kneel2', 'run', 'wave0', 'wave1']) for(let f = 0; f < 4; f++){ MECH.police.officer(p, f); MECH.police.officer(p, f, 'angry'); } }catch(e){ console.warn('arrival warm', e); } yield;
  try{ for(const [p, h] of [['up', ''], ['up', 'look'], ['back', 'look'], ['back', 'down'], ['back', 'cool'], ['push', 'down'], ['side', '']]) for(let f = 0; f < 4; f++) rider(p, f, h); for(const q of ['flung', 'prone']) for(let f = 0; f < 2; f++) riderH(q, f); }catch(e){ console.warn('arrival warm', e); } yield;
  try{ for(const k in MOML) cardFor(MOML[k].L, 97); }catch(e){ console.warn('moment rewarm', e); } }   // moment cards warmed by the director survive the font-load rebuild   // moment cards warmed by the director survive the font-load rebuild

/* ---------- border-sign lettering in fixed size steps (Kellan, review card sign-steps: "Yes") ----------
   The core's border signs (drawGate's expressway plates, fkPlate's fork plates, drawHinge's welcome sign and toll canopy) drew their text with
   fillText at a new font size every frame as they approached, and each new size of the kana cost the browser a fresh shaping (~0.28 ms each, ~1 ms
   a frame at a border). Here every glyph those signs use is drawn once per step of a fixed ladder of sizes (in canvas pixels), one atlas per step,
   in the first-minute warm-up; the core's sgText() asks signText() to blit the nearest step on whole canvas pixels. The text holds still between
   steps and grows one pixel at a time while small, about a tenth at a time once large. Latin (the road names) is kept to the steps a name can
   reach; anything past the ladder, or asked before it is built, falls back to the live fillText. Nothing is created mid-ride. The glyphs are
   white: a fogged sign fades its text with globalAlpha (tinting a copy per draw on a scratch canvas cost ~4.7 ms a call in a GPU sync). */
const SG_STEP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 26, 29, 32, 35, 38, 42, 46, 50, 55, 60], SG_LATIN = 34;
const SG = { at:[], gi:new Map(), ready:false };
const sgChars = () => { let t = 'ようこそ料金所←→↑ '; try{ for(const L of LANDS) t += L.kanji + L.name; }catch(e){} return [...new Set(t)].join(''); };
function sgAtlas(E, chars){ const f = E + 'px DotGothic16, monospace', pad = 1 + Math.ceil(E * .1), h = Math.ceil(E * 1.5) + 2, mid = h >> 1, n = chars.length;
  const m = document.createElement('canvas').getContext('2d'); m.font = f; const SX = new Int16Array(n), SY = new Int16Array(n), GW = new Int16Array(n), ADV = new Float32Array(n); let x = 0, y = 0, aw = 1;
  for(let i = 0; i < n; i++){ const ch = chars[i]; ADV[i] = m.measureText(ch).width; if(ch === ' ') continue;   // (a space only advances: GW 0)
    if(ch.charCodeAt(0) < 256 && E > SG_LATIN){ GW[i] = -1; continue; } const w = Math.ceil(ADV[i]) + pad * 2; if(x + w > 1024){ x = 0; y += h; } SX[i] = x; SY[i] = y; GW[i] = w; x += w; if(x > aw) aw = x; }
  const c = document.createElement('canvas'); c.width = aw; c.height = y + h; const k = c.getContext('2d'); k.font = f; k.fillStyle = '#ffffff'; k.textBaseline = 'middle'; k.textAlign = 'left';
  for(let i = 0; i < n; i++) if(GW[i] > 0) k.fillText(chars[i], SX[i] + pad, SY[i] + mid);
  return { c, E, h, mid, pad, SX, SY, GW, ADV }; }
// built once (fonts in: the font-load rebuild clears SG.ready and builds again); slices of ~5 ms for the staged warm-up
function* sgSteps(){ if(SG.ready || typeof LANDS === 'undefined') return; const chars = sgChars(); let ok = true; try{ ok = !document.fonts || document.fonts.check('16px DotGothic16', chars); }catch(e){}
  SG.gi.clear(); for(let i = 0; i < chars.length; i++) SG.gi.set(chars.charCodeAt(i), i); let t0 = performance.now();
  for(let si = 0; si < SG_STEP.length; si++){ SG.at[si] = sgAtlas(SG_STEP[si], chars); if(performance.now() - t0 > 5){ yield; t0 = performance.now(); } }
  SG.ready = ok; }   // (built with the fallback face while the subsets load: not used, the live text stands in until the rebuild)
// draw s in white with its font size n (CSS px, as fillText would), anchored like fillText with textBaseline 'middle' and textAlign al
A.signText = (s, n, x, y, al) => { if(!SG.ready) return false; const E = n / PX, top = SG_STEP.length - 1; if(!(E > 0) || E > SG_STEP[top] * 1.08) return false;
  let si = 0; while(si < top && SG_STEP[si + 1] <= E) si++; if(si < top && E * E > SG_STEP[si] * SG_STEP[si + 1]) si++;   // the nearest step (geometric midpoint)
  const T = SG.at[si]; if(!T) return false; let w = 0; for(let i = 0; i < s.length; i++){ const g = SG.gi.get(s.charCodeAt(i)); if(g === undefined || T.GW[g] < 0) return false; w += T.ADV[g]; }
  const X0 = Math.round(x / PX - (al === 'center' ? w / 2 : al === 'right' ? w : 0)) - T.pad, Y0 = Math.round(y / PX) - T.mid; cx.imageSmoothingEnabled = false; let cum = 0;
  for(let i = 0; i < s.length; i++){ const g = SG.gi.get(s.charCodeAt(i)), gw = T.GW[g]; if(gw > 0) cx.drawImage(T.c, T.SX[g], T.SY[g], gw, T.h, (X0 + Math.round(cum)) * PX, Y0 * PX, gw * PX, T.h * PX); cum += T.ADV[g]; }
  return true; };
A._sg = () => SG;

/* ---------- the sting: a taiko hit and a chord stab in the road's key, on the stamp ---------- */
function sting(L){ if(!M.ac) return; const a = M.ac.currentTime + T_HIT, chord = L.prog[0]; let root = chord[0]; while(root >= 48) root -= 12; while(root < 36) root += 12;
  M.noise(.16, 2400, .035, a - .16);                                  // the slab's whoosh
  M.tone(58, .32, { v:.16, at:a }); M.noise(.2, 170, .2, a);           // taiko
  M.tone(midi(root), .7, { type:'sawtooth', v:.05, at:a, fuzz:true });
  chord.forEach((m, n) => { let q = m; while(q < 60) q += 12; while(q >= 72) q -= 12;
    M.tone(midi(q), .9, { type:'square', v:.014, at:a + n * .01 }); M.tone(midi(q + 12), 1.4, { type:'triangle', v:.026, at:a + .14 + n * .06 }); });
  const k = L.key, s = a + .1;   // one small sound per road
  if(k === 'coast') M.noise(1.4, 650, .05, s);
  else if(k === 'refinery') M.noise(.9, 260, .07, s);
  else if(k === 'harbour') M.tone(midi(root - 12), 1.1, { type:'sawtooth', v:.025, at:s + .1, atk:.15 });
  else if(k === 'snow'){ M.tone(midi(root + 36), 1.6, { v:.02, at:s + .2 }); M.tone(midi(root + 43), 1.6, { v:.015, at:s + .32 }); }
  else if(k === 'paddies') [0, .22, .5].forEach((d, n) => M.tone(midi(root + 48 + n * 4), .12, { type:'triangle', v:.012, at:s + .3 + d }));
  else if(k === 'neon') [.06, .1, .2, .3].forEach(d => M.tone(120, .04, { type:'square', v:.012, at:a + d }));
  else if(k === 'tunnels') [0, .35, .7].forEach(d => M.noise(.25, 1200, .025, s + d)); }

/* ---------- hooks ---------- */
// reset only resets: warm() builds everything once; a ride reset rebuilds only if the canvas size changed (cards are laid out per size), plus the
// mugshot inks, which follow the chosen bike's palette (cached per palette)
let warmKey = null; const sizeKey = () => cx ? cx.canvas.width + 'x' + cx.canvas.height : '';
A.reset = () => { cur = null; pol = null; mom = null; momQ = []; cd = null; CO = []; TK.length = 0; riderSwap('orig');
  if(warmKey !== null && warmKey !== sizeKey()) warmAll(); else if(warmKey !== null && typeof BIKE !== 'undefined'){ try{ mugInk(0); mugInk(1); }catch(e){} } };
A.warm = () => { for(const _ of warmNowSteps()); }; A.warmSteps = warmNowSteps; MECH.arrivalLate = { warm:() => { for(const _ of warmLateSteps()); }, warmSteps:warmLateSteps }; A._atlas = () => AT; A._slots = () => SLOTS; A._card = card; A._seal = seal; A._rider = (...a) => rider(...a); A._riderH = (...a) => riderH(...a);
// every kanji a card stamps (the font loads in unicode-range subsets: a subset not loaded when a card is built leaves its kanji blank)
const cardChars = () => { let t = '一二三四五六七八九十〇逮捕御用走れ三二一'; try{ for(const L of LANDS) t += L.kanji; for(const k in MOML) t += MOML[k].L.kanji; for(const t2 of coList()) t += t2; t += sgChars(); }catch(e){} return [...new Set(t)].join(''); };
// asked once, from the first warm-up (LANDS and the director's moments exist by then); when the subsets are in, everything is rebuilt
let fontsAsked = false;
function askFonts(){ if(fontsAsked || !document.fonts) return; fontsAsked = true; const chars = cardChars(); let have = false; try{ have = document.fonts.check('16px DotGothic16', chars); }catch(e){}
  if(have) return;   // the subsets are already in (the loader asks for them early): the first build is already right, no second build
  document.fonts.load('16px DotGothic16', chars).then(() => setTimeout(() => { for(const k in C) delete C[k]; GM.clear(); SG.ready = false; if(AT.c) atlasLatin(); for(const S of SLOTS) S.key = null; if(!(window.warmLater && window.warmLater('mech.arrival.font', warmAllSteps))) warmAll(); }, 0)).catch(() => {}); }   // on the title: queued in slices
A.arrive = (L, z) => {
  const i = LANDS.indexOf(L); if(i < 0 || typeof pixText !== 'function') return false;
  let chip = false; if(z > 0){ document.querySelectorAll('.float').forEach(e => { if(e.textContent === '+' + GATE_BONUS + 's'){ e.remove(); chip = true; } });
    for(let n = CO.length - 1; n >= 0; n--) if(CO[n].text === '+' + GATE_BONUS + 's'){ CO.splice(n, 1); chip = true; } }   // the checkpoint's +15s rides on the card as EXTENDED (DOM float or callout)
  try{ card(i); }catch(e){ console.warn('arrival', e); A.err = e.message + ' ' + e.stack; return false; }
  if(z > 0 && Q.quietOn()) return true;   // the quiet stretch: no card (the HUD's road tag names the road)
  cur = { i, L, z, t0:mom || cd || dirBand() || (Q.enabled && (Q.busy() || Q.breathOn())) ? null : performance.now(), w0:Q.t, chip, shook:false, tag:boxLabel('ROAD ' + (z + 1), CREAM, roadCol(L), null, LBL.road), seal:seal(z + 1), ext:extLabel() };
  cur.go = () => { if(!reduce) sting(L); else if(M.ac) M.tone(midi(L.prog[0][0] + 12), 1.2, { type:'triangle', v:.03 }); };
  if(cur.t0 != null) cur.go();
  return true; };

/* ---------- moment cards for the cinematic director (setpiece/README.md, "Moment card from mech/arrival.js") ----------
   card = { kanji, name, sub, col, tag, at, hold }: the arrival card's slab, kanji stamp, chrome name and typed subtitle, in the moment's
   accent colour, tagged MOMENT. One card at a time: a moment waits for an arrival card to finish, and an arrival waits for a moment.
   It stays clear of the letterbox bars (11% top and bottom); a long subtitle wraps (never clipped); reduced motion fades it in 4 steps. */
let mom = null, momQ = [];
A.momentOn = () => !!mom && performance.now() >= mom.t0;   // a moment card is on screen (the director keeps the camera level meanwhile)
// the road-like record and the tag for a moment card, cached by its text, so a card built in warm-up is reused as is when it is shown
const MOML = {};
function momentL(card){ const kanji = String(card.kanji || '').slice(0, 6) || '!', name = String(card.name || '').toUpperCase(), sub = String(card.sub || ''), col = card.col || '#4ff0ff', tg = String(card.tag || 'MOMENT').toUpperCase();
  const key = 'm:' + kanji + '|' + name + '|' + sub + '|' + col; let m = MOML[key];
  if(!m) m = MOML[key] = { L:{ key, kanji, name:name || ' ', note:sub || ' ', col, lb:true, prog:[[52, 55, 59]] }, tags:{} };
  if(!m.tags[tg]) m.tags[tg] = boxLabel(tg, CREAM, col); return { L:m.L, tag:m.tags[tg] }; }
// build and cache a moment card (and its tag) without showing it: mech/director.js calls this from warm() for every catalogued moment
A.momentWarm = card => { if(!card || card.kanji === undefined || typeof pixText !== 'function' || !cx) return false;
  try{ cardFor(momentL(card).L, 97); return true; }catch(e){ console.warn('moment warm', e); return false; } };
A.moment = card => { if(!card || card.kanji === undefined || typeof pixText !== 'function') return false;
  const ml = momentL(card), L = ml.L;
  const c = { L, i:97, tag:ml.tag, seal:null, ext:null, chip:false, shook:false, hold:Math.max(0, +card.hold || 0), t0:null };
  try{ cardFor(L, 97); }catch(e){ console.warn('moment card', e); return false; }
  if(mom || (cur && cur.t0 != null) || pol) momQ.push(c); else { c.t0 = performance.now(); mom = c; }
  return true; };
function momLen(c){ return (reduce ? R_END : T_END) + c.hold; }

/* ---------- the pull-over: a 逮捕 card and a small arrest staged beside the stopped bike ----------
   References: Chase H.Q. (Taito 1988) - the criminal's car stops, one big line announces the arrest, then the tally; GTA's BUSTED and
   Need for Speed's busted card - one heavy word over a slowed scene, red and blue; Tokyo MPD photos (Commons: Shibuya 2016, Zojoji New
   Year's Eve) for the officers - see MECH.police.officer; Edo-period police cried 御用 (goyō!) - it is the seal. Comic, never mean.
   Staging (so nothing hides the bike): the patrol car swings in from the chase position and parks behind-left of the bike, the officer
   gets out of the passenger door (it swings open in four steps, inner panel, window frame and edge showing) and walks the gap between
   car and bike; the rider climbs off, hands up, is cuffed and walked back into the car; a second officer walks in on the right and calls
   it in on the radio, then waves traffic past with the red baton. The game's own chase car is swapped for an invisible stand-in while
   MECH.police.parked is set, and this module draws the parked car (the same copFront sprite) itself, in the overlay pass. */
const POL_L = { key:'police', kanji:'逮捕', name:'Pulled Over', note:'Two strikes. The night is over.', by:.15, prog:[[48, 51, 55]] };
// the rider: tiny chibi, the size he is on the bike (20 rows: a 9-row helmet on an 11-row body), native small pixel art in the bike's white
// and cyan leathers, the visor flipped up so the face reads: panicked (wide eyes, a gasp, a sweat drop), 'look' (glancing at the officer),
// 'down' (eyes shut), 'dizzy' (knocked-out X eyes). pose: side | up | back (cuffed behind; f = walk frame) | push (bent double, head first)
const RPAL = { w:'#f6f2ea', W:'#d2cedc', v:'#9a96ae', u:'#6a6680', c:'#3ad0f0', C:'#1c8ab0', b:'#0e5a78', R:'#ff2a3a', r:'#a01828', z:'#1c2238', Z:'#5a6aa0', k:'#26242e', K:'#0e0c14', q:'#4a4858', H:'#ffffff',
  s:'#f0c098', S:'#c88a68', D:'#9ff0ff', P:'#ff8aa0', Y:'#ffd04a' };
const RW = 22, RH = 30, RX = 5, RY = 8;
function paint(key, w, h, pal, fn){ return MECH.police && MECH.police.paint ? MECH.police.paint(key, w, h, pal, fn) : null; }
const discR = (R, cx0, cy0, rx, ry, col) => { for(let y = -ry; y <= ry; y++){ const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + .5)))); R(cx0 - w, cy0 + y, w * 2 + 1, 1, col); } };
const koEye = (R, x, y) => { R(x, y, 1, 1, 'K'); R(x + 2, y, 1, 1, 'K'); R(x + 1, y + 1, 1, 1, 'K'); R(x, y + 2, 1, 1, 'K'); R(x + 2, y + 2, 1, 1, 'K'); };   // an X
function riderHead(R, X, Y, head){ discR(R, X + 5, Y + 4, 5, 4, 'w'); R(X + 9, Y + 1, 1, 7, 'W'); R(X + 2, Y + 7, 7, 1, 'W'); R(X + 1, Y + 1, 2, 1, 'H');
  R(X + 5, Y - 1, 1, 3, 'R'); R(X + 2, Y + 2, 7, 1, 'z'); R(X + 2, Y + 2, 2, 1, 'Z');   // the stripe, the visor flipped up
  R(X + 2, Y + 3, 7, 4, 's'); R(X + 8, Y + 3, 1, 4, 'S');   // the face in the opening
  const lk = head === 'look' ? -1 : 0;
  if(head === 'dizzy'){ koEye(R, X + 2, Y + 3); koEye(R, X + 6, Y + 3); return; }
  if(head === 'cool'){ R(X + 2, Y + 3, 7, 1, 'S'); R(X + 3, Y + 4, 2, 1, 'K'); R(X + 6, Y + 4, 2, 1, 'K'); R(X + 5, Y + 6, 2, 1, 'K'); R(X + 7, Y + 5, 1, 1, 'K'); return; }   // half-lidded, a sideways smirk: caught, not beaten
  if(head === 'down'){ R(X + 2, Y + 5, 2, 1, 'K'); R(X + 6, Y + 5, 2, 1, 'K'); }
  else { R(X + 3 + lk, Y + 3, 1, 1, 'H'); R(X + 3 + lk, Y + 4, 1, 1, 'K'); R(X + 7 + lk, Y + 3, 1, 1, 'H'); R(X + 7 + lk, Y + 4, 1, 1, 'K'); R(X + 5 + lk, Y + 6, 1, 1, 'K'); R(X + 2, Y + 5, 1, 1, 'P'); R(X + 8, Y + 5, 1, 1, 'P'); }
  R(X + 11, Y + 1, 1, 2, 'D'); }   // the sweat drop
function rider(pose, f, head){ head = head || ''; return paint('arr:rd:' + pose + (f || 0) + head, RW, RH, RPAL, (R, D) => {
  const walk = f || 0, bob = walk % 2 ? -1 : 0, X = RX, Y = RY + bob, liftL = [0, 1, 0, 0][walk], liftR = [0, 0, 0, 1][walk], push = pose === 'push';
  const leg = (x, lift) => { R(X + x, Y + 15, 2, 2 - lift, 'w'); R(X + x, Y + 16 - lift, 2, 1, 'c'); R(X + x - 1, Y + 17 - lift - bob, 4, 2, 'k'); R(X + x - 1, Y + 19 - lift - bob, 4, 1, 'K'); };
  leg(2, liftL); leg(7, liftR);
  const B = push ? Y + 2 : Y, BX = push ? X - 1 : X;
  R(BX + 2, B + 9, 7, 1, 'c'); R(BX + 1, B + 10, 9, 4, 'w'); R(BX + 1, B + 10, 1, 4, 'c'); R(BX + 9, B + 10, 1, 4, 'C'); R(BX + 6, B + 11, 1, 1, 'R'); R(BX + 2, B + 14, 7, 1, 'b');
  const glove = (x, y) => { R(x, y, 3, 2, 'k'); R(x, y, 1, 1, 'q'); };
  if(pose === 'up'){ R(X - 2, Y + 2, 2, 8, 'w'); R(X - 2, Y + 6, 2, 1, 'c'); glove(X - 3, Y); R(X + 11, Y + 2, 2, 8, 'W'); R(X + 11, Y + 6, 2, 1, 'C'); glove(X + 11, Y); }
  else if(pose === 'back' || push){ R(BX, B + 10, 1, 3, 'W'); R(BX + 10, B + 10, 1, 3, 'W'); }   // arms cuffed behind
  else { R(X - 1, Y + 10, 2, 3, 'w'); glove(X - 2, Y + 12); R(X + 10, Y + 10, 2, 3, 'W'); glove(X + 10, Y + 12); }
  if(push) riderHead(R, X - 4, Y + 6, 'down'); else riderHead(R, X, Y, head); }); }
// the rider down: flung (side-on, flying right, X-eyed, sweat flying) and prone (face-down, dizzy stars; f1 = cuffed behind)
function riderH(pose, f){ const flung = pose === 'flung'; return paint('arr:rh:' + pose + (f || 0), flung ? 26 : 26, flung ? 18 : 16, RPAL, (R, D) => {
  if(flung){ R(0, 6, 2, 3, 'k'); R(0, 11, 2, 3, 'k'); R(2, 7, 6, 2, 'w'); R(2, 11, 6, 2, 'w'); R(5, 7, 1, 2, 'c'); R(5, 11, 1, 2, 'C');   // legs
    discR(R, 11, 9, 4, 3, 'w'); R(8, 11, 7, 1, 'C'); R(12, 8, 1, 1, 'R');   // body
    if(f){ D(11, 6, 12, 2, 'w', 2); R(12, 1, 2, 2, 'k'); D(10, 12, 9, 15, 'W', 2); R(8, 15, 2, 2, 'k'); } else { D(10, 6, 9, 2, 'w', 2); R(8, 1, 2, 2, 'k'); D(12, 12, 13, 15, 'W', 2); R(13, 15, 2, 2, 'k'); }   // flailing
    discR(R, 19, 8, 5, 5, 'w'); R(23, 4, 1, 8, 'W'); R(15, 5, 2, 1, 'H'); R(16, 3, 5, 1, 'R'); R(19, 5, 5, 1, 'z'); R(19, 6, 5, 4, 's'); koEye(R, 20, 6); R(23, 9, 1, 1, 'K');   // helmet, X eye
    R(25, 2, 1, 2, 'D'); R(24, 0, 1, 1, 'D'); return; }   // sweat flying off
  R(0, 4, 2, 3, 'k'); R(0, 9, 2, 3, 'k'); R(2, 5, 5, 2, 'w'); R(2, 9, 5, 2, 'w'); R(4, 5, 1, 2, 'c'); R(4, 9, 1, 2, 'C');   // legs
  discR(R, 11, 8, 4, 4, 'w'); R(7, 4, 9, 1, 'c'); R(7, 12, 9, 1, 'C'); R(12, 7, 2, 1, 'R');   // the back
  if(f){ R(9, 6, 3, 4, 'k'); R(10, 7, 1, 2, 'v'); R(10, 7, 1, 1, 'H'); }   // wrists cuffed on the back
  else { R(8, 3, 3, 2, 'k'); R(8, 12, 3, 2, 'k'); }   // arms dragged behind
  discR(R, 20, 8, 5, 5, 'w'); R(24, 4, 1, 8, 'W'); R(15, 8, 11, 1, 'R'); R(17, 4, 2, 1, 'H');   // back of the helmet, face to the road
  if(!f) for(const [x, y] of [[15, 1], [20, 0], [25, 1]]){ R(x - 1, y + 1, 3, 1, 'Y'); R(x, y, 1, 3, 'Y'); } }); }   // dizzy stars
// the patrol car's ONE rear door. The parked Crown is seen head-on, so its side (and its doorway) faces away from us: the only door we can
// see is the rear door itself once it swings open, standing out from the body's right edge toward us, hinged at its front edge on the body,
// at the body's roof and sill line with a slight perspective. Panda livery: the window frame and glass up top, white belt panel, black
// lower door. The rider is shoved past its edge into the doorway behind it (drawn before it, so the leaf and body hide him), then he is
// seen through the windscreen in the back seat. (It used to draw a whole side flank beside the car with its own doorway AND a separate
// door leaf in it: two doors, and he was pushed into the second.)
function flank(st, hx, top){ const S = st.S, PC = parkCar(2), r0 = PC ? PC.roof + 1 : 6, b0 = PC ? Math.max(2, PC.sill - 2) : 2;   // the leaf meets the head-on car's roof and sill line
  const x = u => hx + u * S, yt = u => Math.round(top + r0 * S - u * S / 8), yb = u => Math.round(st.carB - b0 * S - u * S / 4); return { S, x, yt, yb }; }
const doorW = st => Math.max(8, Math.ceil(13 * st.K / st.S));   // wide enough to hide him as he goes in
function drawDoor(st, hx, top, door){ if(!door) return; const f = flank(st, hx, top), S = f.S, n = door === 2 ? doorW(st) : Math.ceil(doorW(st) / 2);
  for(let j = 0; j < n; j++){ const x = f.x(j), y0 = f.yt(j), y1 = f.yb(j), edge = j === 0 || j === n - 1;
    for(let y = y0; y < y1; y++){ const v = (y - y0) / (y1 - y0);
      cx.fillStyle = v < .06 ? '#ffffff' : v < .42 ? (edge ? '#eae6f0' : j === 1 ? '#3a4a80' : '#24325e') : v < .46 ? '#ffffff' : v < .7 ? (j === 0 ? '#b8b4c8' : '#d8d4e4') : v > .96 ? '#08070c' : '#14121c'; cx.fillRect(x, y, S, 1); }
    cx.fillStyle = '#06050c'; cx.fillRect(x, y0 - 1, S, 1); cx.fillRect(x, y1, S, 1); }
  cx.fillStyle = '#06050c'; cx.fillRect(f.x(n), f.yt(n) - 1, 1, f.yb(n) - f.yt(n) + 2); cx.fillRect(hx - 1, f.yt(0), 1, f.yb(0) - f.yt(0)); }   // the leaf's free edge; the hinge line on the body
// him in the back seat, seen through the windscreen past the dashboard: the 'cool' look, a little dimmed by the glass
function inCar(st, carX, top){ const PC = parkCar(2), S = st.S, K = st.K; if(!PC) return null; const hd = rider('back', 0, 'cool'); if(!hd) return null;
  const gx0 = Math.round(carX - st.carW * .3), gx1 = Math.round(carX + st.carW * .3), gy0 = top + (PC.roof + 3) * S, gy1 = top + Math.round(PC.h * .4) * S, hw = 14 * K, hh = 11 * K, x = Math.round(carX + st.carW * .14 - hw / 2), y = gy1 - hh + 2 * K;
  cx.save(); cx.beginPath(); cx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0); cx.clip(); cx.globalAlpha = .85; cx.drawImage(hd, RX - 1, RY - 2, 14, 11, x, y, hw, hh); cx.globalAlpha = 1;
  cx.fillStyle = 'rgba(190,200,240,.16)'; cx.fillRect(gx0, gy0, Math.round((gx1 - gx0) * .25), gy1 - gy0); cx.restore();   // a sheen on the glass
  return { x:x + (hw >> 1), y:y + (hh >> 1) }; }
// the rider on the bike with hands up: the game's own rider sprite with both arms raised (same palette; only the arms are new)
let riderOrig = null, riderUp = null, riderNone = null;
function riderSwap(mode){ if(typeof SPR === 'undefined' || typeof BIKE_PAL === 'undefined' || typeof RIDER === 'undefined') return;
  if(typeof BIKE !== 'undefined') BIKE.noRider = mode === 'off';   // env/bikes.js leaves its rider layer out while this is set (if it supports it)
  if(!riderOrig){ if(mode === 'orig') return; riderOrig = SPR.bikerider || bikeSprite('rider'); }
  if(mode === 'up'){ if(!riderUp){ const rows = ['.........', '.........', '.........', '.........', '.........'].concat(RIDER).map(r => [...r]);
      for(let y = 0; y < 14; y++){ rows[y][1] = y < 2 ? 'b' : 'w'; if(rows[y][0] === '.') rows[y][0] = 'K'; if(rows[y][2] === '.') rows[y][2] = 'K'; }
      rows[0][1] = 'K'; riderUp = makeSprite(rows.map(r => r.join('')), BIKE_PAL); } SPR.bikerider = riderUp; }
  else if(mode === 'off') SPR.bikerider = riderNone || (riderNone = mk(1, 1));
  else SPR.bikerider = riderOrig; }
let pol = null;   // the pull-over card and stage
/* The arrest (angry and physical at the start, arcade, never gory; it ends on the rider, not on his humiliation). Beats on stage time
   (pullT, frozen through the hit-stop; the crash cam holds pullT at 0 before it): 0-.85 the patrol car skids in at an angle, the siren
   wash floods in . .9 the door flies open . .95 officer A bursts out at a run (angry brows, a throbbing anger mark) . 1.15 officer B out
   behind him . 1.4 A's flying tackle . 1.58 IMPACT: 4-frame hit-stop, white frame, burst, focus lines, shake; the rider knocked off,
   the bike down on its side, sliding on with sparks . 1.95 the heap . 2.2 cuffed (glint, hard click) . 2.35 hauled up . 2.5 he walks
   to the car, head up . 3.15 at the open door he turns and looks at us (a glint off the helmet) . 3.4 FREEZE: the end card (below).
   Any button: to the freeze, then to the results. Reduced motion: key poses fade in (car stopped / down and cuffed / at the door), then
   the card fades in; no hit-stop, shake, flash or slam. Research and practice log: research/sundown-craft/arrest.md. */
const TI = 1.58, HSTOP = .07;   // the tackle's impact and its hit-stop
const sT = p => p < TI ? p : p < TI + HSTOP ? TI : p - HSTOP;   // stage time: frozen through the hit-stop
// room to breathe (Kellan: "the animation is too fast"): the action plays 1.3x slower than its beat numbers; the end card runs on real
// seconds from the freeze (endE): the frozen frame held 1 s, the page slides 0.65 s, holds 1.5 s, the stamp, then 1.8 s on the front page
const SLOW = 1.3, stg = p => reduce ? p / SLOW : sT(p / SLOW), fzP = () => (FZ + (reduce ? 0 : HSTOP)) * SLOW, endE = p => p - fzP();
// the siren one-shot: SFX's own if it ever offers one, else the same wail synthesised here - a triangle with a square edge through a
// lowpass, pitch eased 560 -> 920 -> 560 Hz (the (1 - cos)^2 sweep of audio/sfx.js's siren loop), faded in and out
function wail(at, dur){ if(window.SFX && SFX.play && SFX.play('siren', { at })) return; const a = M.ac; if(!a || !M.out) return;
  try{ const n = 48, curve = new Float32Array(n); for(let i = 0; i < n; i++){ const sw = .5 - .5 * Math.cos(2 * Math.PI * i / (n - 1)); curve[i] = 560 + 360 * sw * sw; }
    const o1 = a.createOscillator(), o2 = a.createOscillator(), g2 = a.createGain(), lp = a.createBiquadFilter(), g = a.createGain();
    o1.type = 'triangle'; o2.type = 'square'; g2.gain.value = .18; lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = .7;
    for(const o of [o1, o2]) o.frequency.setValueCurveAtTime(curve, at, dur);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.034, at + .1); g.gain.setValueAtTime(.034, at + dur - .25); g.gain.linearRampToValueAtTime(0, at + dur);
    o1.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(M.out); o1.start(at); o2.start(at); o1.stop(at + dur + .05); o2.stop(at + dur + .05); }catch(e){} }
// the arrest's sounds fire on stage time as each beat lands (A.update). They used to be scheduled on the audio clock at the crash, but the
// crash cam then holds pullT at 0 for 1.4 s, so every hit landed early (the cuffs clicked before the tackle); a skip or a pause broke it too.
let CUE_ = null, CUE_R_ = null;
const cueList = () => CUE_ || (CUE_ = [[.001, 'start'], [.9, 'door'], [1, 'yell'], [1.58, 'hit'], [2, 'yell'], [2.2, 'cuff'], [3.02, 'kick'], [3.32, 'slam'], [PA, 'slide', 1], [PA + LAND, 'paper', 1], [PA + SEAL, 'stamp', 1]]), cueListR = () => CUE_R_ || (CUE_R_ = [[.001, 'startR'], [1.2, 'hitR'], [2.3, 'cuff'], [3.32, 'slam'], [PA + LAND, 'paper', 1], [PA + SEAL, 'stamp', 1]]);   // reduced motion: on its key poses
function cue(id){ if(!M.ac) return; const a = M.ac.currentTime + .005;
  const yell = () => { M.noise(.28, 1300, .06, a); M.tone(330, .26, { type:'square', v:.03, at:a, fuzz:true }); M.tone(392, .18, { type:'square', v:.022, at:a + .06, fuzz:true }); };   // 止まれ! / 動くな!
  if(id === 'start' || id === 'startR') wail(a, 1.4);   // the Japanese police wail: one slow rise and fall
  if(id === 'start'){ M.noise(.8, 3200, .07, a); M.tone(1760, .7, { type:'square', v:.012, at:a }); M.tone(1840, .6, { type:'square', v:.01, at:a + .05 }); }   // the tyre screech
  else if(id === 'door'){ M.noise(.12, 900, .06, a); M.tone(130, .08, { type:'square', v:.03, at:a }); }   // the door bursts open
  else if(id === 'yell') yell();
  else if(id === 'hit'){ M.tone(50, .35, { v:.22, at:a }); M.noise(.3, 220, .26, a);   // the tackle's thud
    M.noise(.5, 700, .1, a + .06); M.tone(1250, .18, { type:'square', v:.014, at:a + .07 }); M.tone(1730, .14, { type:'square', v:.01, at:a + .1 }); M.noise(.45, 3400, .05, a + .12); }   // the bike crashes down and scrapes along
  else if(id === 'hitR'){ M.tone(50, .3, { v:.12, at:a }); M.noise(.2, 300, .1, a); }
  else if(id === 'cuff'){ M.tone(3000, .05, { type:'square', v:.03, at:a }); M.noise(.06, 4200, .06, a); M.tone(1500, .06, { type:'square', v:.02, at:a + .05 }); }   // the cuffs, hard
  else if(id === 'kick'){ M.noise(.18, 1800, .05, a); M.tone(70, .16, { v:.16, at:a + .04 }); M.noise(.12, 500, .12, a + .04); }   // the shove: a whoosh, a thump
  else if(id === 'slam'){ M.noise(.25, 300, .16, a); M.tone(85, .2, { v:.16, at:a });   // the door slams, and a press camera catches it: the shutter, the mirror
    M.noise(.025, 5200, .09, a + .05); M.tone(1900, .02, { type:'square', v:.02, at:a + .05 }); M.noise(.045, 2200, .06, a + .12); }
  else if(id === 'slide'){ M.noise(.32, 1700, .045, a); M.noise(.2, 3200, .025, a + .08); }   // the page skids across: a soft paper whoosh
  else if(id === 'paper'){ M.noise(.16, 1100, .12, a); M.tone(120, .1, { v:.12, at:a }); }   // the front page slaps down
  else if(id === 'stamp'){ M.tone(55, .4, { v:.16, at:a }); M.noise(.25, 160, .2, a); [48, 51, 54].forEach((m, n) => M.tone(midi(m + 12), .9, { type:'square', v:.012, at:a + n * .015 }));   // the seal: taiko and the old card's stab
    const ch = (POL_L.prog && POL_L.prog[0]) || [48, 51, 55]; ch.forEach((m, n) => M.tone(midi(m + 12), 1.5, { type:'triangle', v:.016, at:a + .3 + n * .06 })); } }   // then the road's own chord, soft: the night, let go
const canDismount = () => !(ENV.bikes && ENV.bikes.draw && BIKE.id !== 'sport') || !!(ENV.bikes && ENV.bikes.noRiderOK);
// while BIKE.hidden is set the game's upright bike is skipped (the arrest draws it on its side instead). A core check in draw() would be
// cleaner; until then these thin wrappers, installed once, honour the flag for drawBike (the sport bike) and ENV.bikes.draw (the others).
function hideHooks(){ if(A._hide) return; A._hide = true;
  try{ const dB = window.drawBike; if(typeof dB === 'function') window.drawBike = function(){ if(BIKE.hidden) return; return dB.apply(this, arguments); }; }catch(e){}
  try{ if(ENV.bikes && ENV.bikes.draw){ const eD = ENV.bikes.draw; ENV.bikes.draw = function(){ if(BIKE.hidden) return; return eD.apply(this, arguments); }; } }catch(e){}
  try{ if(ENV.hud && ENV.hud.draw){ const hD = ENV.hud.draw; ENV.hud.draw = function(){ if(pol && pol.fz) return; return hD.apply(this, arguments); }; } }catch(e){} }   // the end card is a full frame: no instruments over the print
A.pulledOver = () => { if(typeof pixText !== 'function') return false;
  POL_L.prog = LANDS[landIdx(zone())].prog; try{ cardFor(POL_L, 99); }catch(e){ console.warn('arrival pull', e); return false; }
  const narrow = cx.canvas.width < 260; hideHooks();
  pol = { L:POL_L, i:99, police:true, chip:true, shook:false, tag:boxLabel('POLICE', CREAM, SIREN_B), seal:sealStr('御用', 0), ext:boxLabel(km().toFixed(1) + (narrow ? 'KM' : ' KM'), CREAM, SIREN_R, '#a0102a', LBL.km),
    off:canDismount(), hit:false, slam:false, bikeSpr:null };
  if(MECH.police && MECH.police.copFront) MECH.police.parked = true;
  cur = null; pol.ci = 0; pol.fz = null; pol.focus = null; padNow(PADP);
  return true; };
const at = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const CF = 2.2, UPT = 2.35, MV = 2.5, DOOR = 2.88, KICK = 3.02, INCAR = 3.2, FZ = 3.32, ST = .3;   // cuffed, hauled up, walked, at the door, the kick, in, the door slams (the freeze), the seal (after FZ)
const k0 = p => p < 1.2 ? 0 : p < 2.3 ? 1 : p < 2.95 ? 2 : 3;   // reduced motion's key poses (car stopped / down and cuffed / at the door / in the car), then the end card
function blitF(c, x, gy, K, alpha){ if(!c || alpha <= 0) return; cx.globalAlpha = alpha; cx.drawImage(c, Math.round(x - c.width * K / 2), Math.round(gy - c.height * K), c.width * K, c.height * K); cx.globalAlpha = 1; }
function stage(){ const cw = cx.canvas.width, K = Math.max(1, Math.round(Math.min(W * .2, H * .27) / 30 / PX)), S = K;   // kodawari #6: the car at the figures' own pixel size (it was drawn ~1.5x larger, so the officers stood at 40% of its height; now they reach its roof line)
  const PC = parkCar(0), bcx = Math.round(cw / 2), gy = Math.round((H - 8) / PX), carW = (PC ? PC.w : 40) * S, carH = (PC ? PC.h : 24) * S, parkX = Math.round(bcx - 13 * K - 30 * K - carW / 2) + (cw < 260 ? 6 : 0), carB = Math.round((H + carH * PX * .05) / PX);
  const xA = bcx - 14 * K, xHeap = Math.min(cw - 16 * K, bcx + 18 * K), xB = Math.min(cw - 9 * K, xHeap + 18 * K);   // little figures: everything stands closer   // officer B works the far side, clear of the car's rear door
  return { cw, S, K, bcx, gy, carW, carH, parkX, carB, xA, xHeap, xB, chaseX:Math.round((W / 2 + W * .27) / PX) }; }
// the car: the chase sprite, yawed while it skids (a few stepped angles), its light bar glowing
// (the new Crown from mech/police.js when it offers one: head-on, ~20 px per metre, so its texels match the hand-drawn rear flank below)
const parkCar = ph => MECH.police && MECH.police.parkCar ? MECH.police.parkCar(ph) : null;
function drawCar(st, x, ph, ang){ const PC = parkCar(ph); if(PC) return drawCar3(st, x, ph, ang, PC); const c = MECH.police.copFront(ph), top = st.carB - st.carH;
  if(ang){ cx.save(); cx.translate(Math.round(x), st.carB); cx.rotate(ang); cx.drawImage(c, -Math.round(st.carW / 2), -st.carH, st.carW, st.carH); cx.restore(); }
  else cx.drawImage(c, Math.round(x - st.carW / 2), top, st.carW, st.carH);
  const S = st.S, lamp = (dx, col, a) => glow(Math.round(x + dx * S), top + 1.5 * S, 7 * S, col, a);
  if(ph === 2){ lamp(-9, SIREN_R, .3); lamp(9, SIREN_R, .3); } else lamp(ph ? 9 : -9, ph ? SIREN_B : SIREN_R, .5); }
function drawCar3(st, x, ph, ang, PC){ const top = st.carB - st.carH, S = st.S;
  if(ang){ cx.save(); cx.translate(Math.round(x), st.carB); cx.rotate(ang); cx.drawImage(PC.c, -Math.round(st.carW / 2), -st.carH, st.carW, st.carH); cx.restore(); }
  else cx.drawImage(PC.c, Math.round(x - st.carW / 2), top, st.carW, st.carH);
  for(let i = 0; i < 2; i++){ const lit = ph === 2 || ph === (i ? 0 : 1), a = PC.bar[i];   // the red bar's halves (Japanese bars are red only)
    if(lit) glow(Math.round(x - st.carW / 2 + a[0] * S), top + Math.round(a[1] * S), 7 * S, SIREN_R, ph === 2 ? .3 : .5); } }
function carAt(st, s){ const q = at(s, 0, .85); return { x:Math.round(lerp(st.chaseX, st.parkX, 1 - Math.pow(1 - q, 2.2))), ang:reduce || q >= 1 ? 0 : [0, -.06, -.13, -.1, -.05][Math.min(4, Math.floor(q * 5))] }; }
// pixel puffs: tyre smoke and dust; a disc in two tones that grows and thins out in steps
function puff(x, y, r, a, light){ if(a <= 0 || r < 1) return; r = Math.round(r); cx.globalAlpha = step(a, 4);
  for(let yy = -r; yy <= r; yy++){ const w = Math.round(Math.sqrt(r * r - yy * yy)); cx.fillStyle = yy < -r / 3 ? light : mixc(light, '#4a4658', .45); cx.fillRect(Math.round(x - w), Math.round(y + yy), w * 2, 1); } cx.globalAlpha = 1; }
const burstSpr = () => C['arr:burst'] || (C['arr:burst'] = (() => { const n = 34, c = mk(n, n), k = c.getContext('2d'); k.fillStyle = '#fff'; k.beginPath();
  for(let i = 0; i <= 24; i++){ const a = i / 24 * 6.283, r = i % 2 ? 7 : 16; k.lineTo(n / 2 + Math.cos(a) * r, n / 2 + Math.sin(a) * r); } k.fill();
  const d = k.getImageData(0, 0, n, n); for(let q = 0; q < d.data.length; q += 4){ const on = d.data[q + 3] > 110, x = (q / 4) % n, y = Math.floor(q / 4 / n), r = Math.hypot(x - n / 2, y - n / 2);
    d.data[q + 3] = on ? 255 : 0; if(on && r > 8){ d.data[q] = 255; d.data[q + 1] = 208; d.data[q + 2] = 74; } } k.putImageData(d, 0, 0); return c; })());
function focusAt(cw, ch, fx, fy, r0){ const key = 'arr:f' + cw + 'x' + ch + ':' + Math.round(fx) + ',' + Math.round(fy); if(C[key]) return C[key];
  const c = mk(cw, ch), k = c.getContext('2d'), R = Math.hypot(cw, ch); k.fillStyle = '#fff';
  for(let n = 0; n < 40; n++){ const a = (n + HS(n * 3.3) * .7) / 40 * 6.283, wd = .006 + HS(n * 5.7) * .012, q0 = r0 * (1 + HS(n * 2.1) * .6);
    k.beginPath(); k.moveTo(fx + Math.cos(a) * q0, fy + Math.sin(a) * q0); k.lineTo(fx + Math.cos(a - wd) * R, fy + Math.sin(a - wd) * R); k.lineTo(fx + Math.cos(a + wd) * R, fy + Math.sin(a + wd) * R); k.fill(); }
  const d = k.getImageData(0, 0, cw, ch); for(let q = 3; q < d.data.length; q += 4) d.data[q] = d.data[q] > 100 ? 255 : 0; k.putImageData(d, 0, 0); return C[key] = c; }
// the bike down: a side-on pixel grid (not the rear sprite turned 90 degrees: that read as a red megaphone). After photos of race replicas
// down on the road: tipped onto its nose and front wheel (turned to full lock), the tail up, the rear wheel still spinning (three spoke
// frames, slowing), the clip-on bent up past the screen. Palette keys are mech/stunts.js's side-on ones, so the per-bike side colours and
// the cosmetics hook recolour it exactly as they recolour the crash cam's wreck the moment before.
const FALLEN = [
  '..................................K..',
  '...........................KKKKKKK2K.',
  '.......KKKK............KKKK1111222RRK',
  '....K.KggGGK...KK.KKKKK11122222222rrK',
  '...KNKKGGGGGKKK11Kppppp22222222233rK.',
  '....KvKKGG0001122EppNNNN22233333vTTK.',
  '....KKN00112222EEE2KKKK3333vvnnnnvTTK',
  '...K11122222EEE2223NNK.KTTvnnvWnnvTTK',
  '..K112222EEE222222NNNKKpppppppWvvnvTK',
  '.K22222EE222222223NNNNpppppnnnnnnvTTK',
  'KYY22EE2222222223NNNNNnnnnTvvnnnvvTtK',
  '.K23333333323333NNNNnnKKKtTTvvvvTTTtK',
  '.K3KTvnnnvT3KKKNNnnnKWWWKKtTTTTTTttK.',
  '..KTTvnWWnvTKKKnWWWWWWWvK.KttttttKK..',
  '..KTTvnWWnvTKWWWWvvvvvKK...KKKKKK....',
  '...KTvnnnvTTKvvvKKKKKK...............',
  '...KTTvvvvTTKKKK.....................',
  '...KtTTTTTTtK........................'];
const FALLEN_SPIN = [{ 6:'....KKN00112222EEE2KKKK3333vnnvnnvTTK', 7:'...K11122222EEE2223NNK.KTTvnnnWnnvTTK', 8:'..K112222EEE222222NNNKKpppppppWnnnvTK', 9:'.K22222EE222222223NNNNpppppnnnnvvvTTK', 10:'KYY22EE2222222223NNNNNnnnnTvnnnnvvTtK' }, { 6:'....KKN00112222EEE2KKKK3333vnnnnvvTTK', 7:'...K11122222EEE2223NNK.KTTvvvnWvnvTTK', 8:'..K112222EEE222222NNNKKpppppppWnnnvTK', 9:'.K22222EE222222223NNNNpppppnnnvnnvTTK', 10:'KYY22EE2222222223NNNNNnnnnTvnnvnvvTtK' }];
function fallenPal(){ const D = MECH.stunts && MECH.stunts._dbg; if(!D || !D.SIDEP || !D.derive) return null;
  const id = D.SIDEP[BIKE.id] ? BIKE.id : 'sport', P0 = Object.assign({}, D.COMMON, D.SIDEP[id]), Cs = window.COS; let pal = P0;
  if(Cs && Cs.sig && Cs.pal){ try{ pal = Object.assign({}, Cs.pal(id, 'top', P0)); }catch(e){} }
  return { key:id + (Cs && Cs.sig || ''), P:D.derive(pal) }; }
function fallenBike(f){ const fp = fallenPal(); if(!fp) return null; const key = 'arr:fb:' + fp.key + ':' + f; if(C[key]) return C[key];
  const rows = FALLEN.map((r, i) => (f && FALLEN_SPIN[f - 1][i]) || r), c = mk(rows[0].length, rows.length), k = c.getContext('2d');
  rows.forEach((r, y) => { for(let x = 0; x < r.length; x++){ const col = r[x] !== '.' && fp.P[r[x]]; if(col){ k.fillStyle = col; k.fillRect(x, y, 1, 1); } } });
  return C[key] = c; }
function drawFallen(st, s, yb){ const K = st.K, rm = reduce, q = rm ? 1 : at(s, TI, TI + .5), e = 1 - Math.pow(1 - q, 2), spin = rm ? 0 : 24 * (1 - Math.exp(-(s - TI) / .9));
  const fb = fallenBike(Math.floor(spin) % 3); if(!fb) return; const w = fb.width * K, h = fb.height * K, x = Math.round(st.bcx - 4 * K + e * 14 * K - w / 2);
  cx.fillStyle = 'rgba(8,6,12,.55)'; cx.fillRect(Math.round(st.bcx - 4 * K - w * .4), yb - K, Math.round(e * 14 * K + w * .4), K);   // the scrape it left on the road
  cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(x + 2 * K, yb - 2 * K, w - 4 * K, 2 * K);   // its shadow, the whole length on the tarmac
  cx.drawImage(fb, x, yb - h, w, h);
  if(!rm && q < 1) for(let n = 0; n < 12; n++){ const a = (s * 7 + n * .37) % 1, sx = x + 2 * K + HS(n * 3.1) * 4 * K - a * 22 * K, sy = yb - 2 * K - a * (5 + HS(n) * 9) * K + a * a * 12 * K;   // sparks off the nose, thrown back as it slides
    cx.fillStyle = a < .3 ? '#fff4c0' : a < .6 ? '#ffb347' : '#ff5a3a'; cx.fillRect(Math.round(sx), Math.round(sy), K, K); }
  if(!rm && s > TI + .35) for(let n = 0; n < 2; n++){ const a = ((s - TI) * .9 + n * .5) % 1; puff(x + w * .5 + a * 3 * K, yb - h * .55 - a * 10 * K, (1 + a * 3) * K, (1 - a) * .55, '#8a8698'); } }   // the hot engine smoking
function drawArrest(p, now){ const st = stage(), { K, S, gy, xA, xHeap, xB, bcx } = st, O = MECH.police.officer, wave = reduce ? 0 : Math.floor(now / 450) % 2, ph = reduce ? 2 : wave, s = Math.min(stg(p), FZ), off = pol.off;
  const runF = q => Math.floor(q / .07) % 4, walkF = q => Math.floor(q / .1) % 4, angry = 'angry', top = st.carB - st.carH;
  const car = reduce ? { x:st.parkX, ang:0 } : carAt(st, s), hx = Math.round(st.parkX + st.carW / 2 - ((parkCar(2) || {}).inset || 0) * S), xd = hx + (doorW(st) + 2) * S, xr = xd + 9 * K;   // xd: just past the open door's edge; xr: where he stands at it
  // skid marks and tyre smoke under and behind the car
  if(!reduce && s > .05){ cx.fillStyle = 'rgba(8,6,12,.55)'; const x0 = Math.round(Math.min(car.x, st.chaseX)), x1 = Math.round(Math.max(car.x, st.chaseX)); for(const dx of [-.36, .36]) cx.fillRect(x0 + Math.round(dx * st.carW), st.carB - 3, x1 - x0, 2);
    for(let i = 0; i < 10; i++){ const b = i * .08, age = s - b; if(age < 0 || age > .7) continue; const c0 = carAt(st, b), side = i % 2 ? .38 : -.38; puff(c0.x + side * st.carW + age * 14 * K, st.carB - 3 - age * 10 * K, (2 + age * 9) * K * .6, 1 - age / .7, '#d8d4e0'); } }
  drawCar(st, car.x, ph, car.ang);
  const k = reduce ? k0(stg(p)) : -1, door = reduce ? (k === 3 ? 0 : k >= 1 ? 2 : 0) : s < .9 ? 0 : s < .94 ? 1 : s < FZ - .05 ? 2 : s < FZ ? 1 : 0, sil = reduce ? k === 3 : s >= INCAR, parked = reduce || s >= .85;
  const seen = sil ? inCar(st, car.x, top) : null;   // him in the back seat, through the windscreen
  if(parked && (reduce || s < KICK)) drawDoor(st, hx, top, door);   // (from the kick on it is drawn over him, below)
  const fa = reduce ? step(at(stg(p), [0, 1.2, 2.3, 2.95][k], [0, 1.2, 2.3, 2.95][k] + .35), 3) : 1;
  const down = reduce ? k >= 1 : s >= TI; BIKE.hidden = down; if(!down) BIKE.noRider = false;
  if(down) drawFallen(st, s, gy - 7 * K);   // up the road from the figures: they pass in front of it
  const wnx = seen ? seen.x : Math.round(car.x + st.carW * .14), wy = seen ? seen.y : Math.round(top + st.carH * .3), focus = { fx:Math.round(wnx * .55 + (xd + 15 * K) * .45), fy:Math.round((wy - 12 * K + gy) / 2), wx:wnx, wy, xr, gy, K };   // the freeze frames his face in the car and the officer   // the freeze frames the window and the officer, top to toe
  if(reduce){ if(k === 1){ blitF(riderH('prone', 1), xHeap, gy, K, fa); blitF(O('kneel2', 0, angry), xHeap - 2 * K, gy, K, fa); }
    if(k === 2){ blitF(O('reach', 0, angry), xr + 12 * K, gy, K, fa); blitF(rider('back', 0, 'cool'), xr, gy, K, fa); }
    if(k === 3) blitF(O('point', 0, angry), xd + 15 * K, gy, K, fa);
    if(k >= 1) blitF(O(k === 1 ? 'radio' : 'wave0', 0, angry), xB, gy - 2 * K, K, k === 1 ? fa : 1);
    return focus; }
  // officer B: bursts out of the door behind A, runs to the shoulder, calls it in, points, waves traffic off
  const drawB = () => { if(s <= 1.15) return; const q = at(s, 1.15, 1.7), x = Math.round(lerp(xd, xB, q));
    const pose = q < 1 ? 'run' : s < 2.4 ? 'radio' : s < 2.8 ? 'point' : wave ? 'wave1' : 'wave0', spr = O(pose, q < 1 ? runF(s) : 0, angry);
    blitF(spr, x, gy - 2 * K, K, 1); if(pose.startsWith('wave')) for(const [bx2, by2] of MECH.police.batonAt(pose)) glow(x - spr.width * K / 2 + bx2 * K, gy - 2 * K - (spr.height - by2) * K, 4 * K, '#ff3a3a', .45); };
  // officer A and the rider: the run, the flying tackle, pinned and cuffed, hauled up, walked to the car, then one shove sends him in
  const hit = s >= TI && p / SLOW < TI + HSTOP, aSpr = [], rSpr = [];   // during the hit-stop both flash white
  const wq = at(s, MV, DOOR), wx = Math.round(lerp(xHeap - 3 * K, xr, wq * wq * (3 - 2 * wq)));   // the walk, eased at both ends
  if(s > .95 && s < 1.4){ const q = at(s, .95, 1.4); aSpr.push([O('run', runF(s), angry), Math.round(lerp(xd, xA, q)), gy]); }
  else if(s >= 1.4 && s < 1.95){ const dv = MECH.police.officerDive(), q = s < TI ? at(s, 1.4, TI) : at(s, TI, 1.95);
    const x = s < TI ? lerp(xA, bcx - 9 * K, q) : lerp(bcx - 9 * K, xHeap - 8 * K, q), y = s < TI ? gy - lerp(6, 10, q) * K : gy - lerp(10, 2, q * q) * K;
    aSpr.push([dv, Math.round(x), Math.round(y)]);
    if(s < TI + .1){ cx.fillStyle = '#ffffff'; for(let n = 0; n < 6; n++){ const ly = Math.round(y - dv.height * K * (.2 + n * .13)), lx = Math.round(x - dv.width * K / 2 - (6 + HS(n * 4.1) * 30) * K); cx.fillRect(lx, ly, Math.round((6 + HS(n) * 16) * K), 1); } } }   // speed lines
  else if(s >= 1.95 && s < UPT) aSpr.push([O(s < CF ? 'kneel' : 'kneel2', 0, angry), xHeap - 2 * K, gy]);
  else if(s >= UPT && s < MV) aSpr.push([O('escort', 0, angry), xHeap + 7 * K, gy]);
  else if(s >= MV && s < DOOR) aSpr.push([O('head', walkF(s + .05), angry), wx + 9 * K, gy]);
  else if(s >= DOOR && s < KICK) aSpr.push([O('reach', 0, angry), xr + 13 * K, gy]);   // the wind-up: a step back
  else if(s >= KICK && s < INCAR + .04){ const q = at(s, KICK, KICK + .07); aSpr.push([O('reach', 0, angry), Math.round(xr + lerp(13, 5, q) * K), gy]); }   // the shove, all in two frames
  else if(s >= INCAR + .04) aSpr.push([O('point', 0, angry), xd + 15 * K, gy]);   // done: pointing him to the seat as the door goes
  if(s >= TI && s < 1.95){ const q = at(s, TI, 1.95); rSpr.push([riderH('flung', Math.floor(s / .08) % 2), Math.round(lerp(bcx + 2 * K, xHeap, q)), Math.round(gy - lerp(9, 1, q) * K - Math.sin(q * Math.PI) * 6 * K)]); }
  else if(s >= 1.95 && s < UPT) rSpr.push([riderH('prone', s >= CF ? 1 : 0), xHeap, gy]);
  else if(s >= UPT && s < MV) rSpr.push([rider('back', 0, 'look'), xHeap - 3 * K, gy]);
  else if(s >= MV && s < DOOR) rSpr.push([rider('back', walkF(s), 'cool'), wx, gy]);   // head up: he walks to the car on his own feet
  else if(s >= DOOR && s < KICK) rSpr.push([rider('back', 0, 'cool'), xr, gy]);   // and turns to give us the look
  else if(s >= KICK && s < INCAR){ const q = at(s, KICK + .02, INCAR - .04), e = q * q; rSpr.push([rider('push', 0, 'down'), Math.round(lerp(xr, hx + doorW(st) * S / 2, e)), gy - Math.round(e * 5 * K)]); }   // up over the sill and in, behind the door   // kicked head-first into the back seat
  if(!off && s >= TI) BIKE.noRider = true;   // (every bike sheds its rider now: env/bikes.js honours noRider)
  const lay = (list, white) => { for(const [spr, x, y] of list) blitF(white ? whiteOf(spr) : spr, x, y, K, 1); };
  if(s >= 1.95 && s < UPT){ lay(rSpr, hit); lay(aSpr, hit); }
  else if(s >= KICK){ lay(rSpr, hit); if(parked) drawDoor(st, hx, top, door); lay(aSpr, hit); }   // the car body (pillar, roof edge, sill, the door) over him: he goes INTO the opening
  else { lay(aSpr, hit); lay(rSpr, hit); }
  drawB();
  // the hit: a burst at the point of impact, a dust cloud where they land, the helmet's jolt is the flung frame itself
  if(s >= TI && s < TI + .08){ const b = burstSpr(), bs = Math.max(1, Math.round(K * .75)); cx.drawImage(b, Math.round(bcx - b.width * bs / 2), Math.round(gy - 18 * K - b.height * bs / 2), b.width * bs, b.height * bs); }
  if(s >= TI && s < TI + .2){ cx.globalAlpha = p / SLOW < TI + HSTOP ? .5 : .25; cx.drawImage(focusAt(st.cw, cx.canvas.height, bcx, gy - 18 * K, 22 * K), 0, 0); cx.globalAlpha = 1; }
  for(const [t0, x] of [[TI, bcx], [1.95, xHeap], [KICK + .02, xr]]) if(s >= t0 && s < t0 + .6){ const q = (s - t0) / .6, sc = t0 > 3 ? .5 : 1; for(let n = 0; n < 7; n++){ const a = (n / 7 - .5) * 2.6, r = (3 + q * 9) * K * (.6 + HS(n + t0) * .5) * sc;
    puff(x + Math.sin(a) * q * 26 * K * sc, gy - 3 * K - Math.cos(a) * q * 8 * K * sc, r * .5, 1 - q, '#d8d4e0'); } }
  if(s >= KICK + .02 && s < KICK + .1){ cx.fillStyle = '#ffffff'; for(let n = 0; n < 5; n++) cx.fillRect(Math.round(xr + (4 + HS(n * 2.3) * 10) * K), Math.round(gy - (6 + n * 3) * K), Math.round((5 + HS(n) * 8) * K), 1); }   // the shove's speed lines
  // the anger mark, only while it is a fight (no shout bubbles: removed at the user's request)
  const ah = aSpr[0];
  if(ah && s > .95 && s < UPT && !(s >= 1.4 && s < 1.95)){ const v = MECH.police.vein(Math.floor(now / 150) % 2), up = s >= 1.95 ? 3 : 0; blitF(v, ah[1] + 6 * K, ah[2] - (20 - up) * K, K, 1); }
  // the cuffs: a glint and a hard click on the wrists
  if(s >= CF && s < CF + .3 && Math.floor((s - CF) / .06) % 2 === 0) blitF(glintSpr(), xHeap - 3 * K, gy - 6 * K, K, 1);
  if(!pol.hit && s >= TI){ pol.hit = true; shake = Math.max(shake || 0, 16); }
  if(!pol.kick && s >= KICK + .03){ pol.kick = true; shake = Math.max(shake || 0, 6); }
  return focus; }
// the hit-stop's white frames, one per sprite, made in warm-up (pullWarm)
const WHITE = new WeakMap(), whiteOf = s => { let w = WHITE.get(s); if(!w){ w = tintMask(s, '#ffffff'); WHITE.set(s, w); } return w; };
// everything the arrest draws that is not a figure pose: built before the ride (they were built on the impact frame: a full-screen canvas then)
function pullWarm(){ const P = MECH.police; if(!P || !P.officer) return; const dv = P.officerDive(); whiteOf(dv); for(const f of [0, 1]){ whiteOf(riderH('flung', f)); P.vein(f); }
  burstSpr(); if(typeof BIKE !== 'undefined') for(let f = 0; f < 3; f++) fallenBike(f); endWarm(); const st = stage(); focusAt(st.cw, cx.canvas.height, st.bcx, st.gy - 18 * st.K, 22 * st.K);
  if(P.copSprite){ const was = P.parked; P.parked = true; P.copSprite(0); P.parked = was; } }   // the invisible stand-in for the parked car
const glintSpr = () => paint('arr:glint', 7, 7, { H:'#ffffff', c:'#bff8ff' }, R => { R(3, 0, 1, 7, 'H'); R(0, 3, 7, 1, 'H'); R(2, 2, 3, 3, 'c'); R(3, 3, 1, 1, 'H'); });
function sirenWash(now, s){ const cw = cx.canvas.width, chh = cx.canvas.height, ph = reduce ? 0 : Math.floor(now / 450) % 2;
  const fl = reduce ? 1 : s < .3 ? step(s / .3, 3) * 1.6 : s < .9 ? 1.6 - step((s - .3) / .6, 3) * .6 : 1;   // floods in, overshoots, settles
  cx.globalAlpha = (reduce ? .04 : .07) * fl; cx.fillStyle = ph ? SIREN_B : SIREN_R; cx.fillRect(0, 0, cw >> 1, chh); cx.fillStyle = ph ? SIREN_R : SIREN_B; cx.fillRect(cw >> 1, 0, cw - (cw >> 1), chh); cx.globalAlpha = 1; }
A.update = () => { if(pol && state === 'pulled' && typeof BIKE !== 'undefined') BIKE.hidden = reduce ? stg(pullT) >= 1.2 : stg(pullT) >= TI;
  if(pol && state === 'pulled'){ const s = stg(pullT), e = endE(pullT), L = reduce ? cueListR() : cueList(); while(pol.ci < L.length && L[pol.ci][0] <= (L[pol.ci][2] ? e : s)){ if(pullT > 0) cue(L[pol.ci][1]); pol.ci++; }   // each beat's sound as it lands
    if(padNow(PADN)) for(let i = 0; i < PADN.length; i++) if(PADN[i] && !PADP[i] && i !== 9){ skipArrest(); break; } PADP.set(PADN); }
  if(state === 'over' && pol && pol.fz && pol.dom !== 0){ pol.dom = 0; endDom(false); }   // the results bring their own screen   // before the frame draws, so the upright bike and the fallen one never overlap
  if(state !== 'pulled' && state !== 'over' && (pol || (riderOrig && SPR.bikerider !== riderOrig) || (typeof BIKE !== 'undefined' && (BIKE.hidden || BIKE.noRider)))){
  riderSwap('orig'); pol = null; endDom(false); if(MECH.police) MECH.police.parked = false; if(typeof BIKE !== 'undefined'){ BIKE.hidden = false; BIKE.noRider = false; } } };   // the rider climbs back on for the garage and the next ride
A.overlay = now => {
  if(!pol || !MECH.police || !MECH.police.officer) return; if(state !== 'pulled' && state !== 'over') return;
  const p = state === 'pulled' ? pullT : PULL_T + 1; if(pol.fz && !(reduce && endE(p) < .35)) return;   // the still is up: A.post draws it (reduced motion fades it in over the scene)
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
  try{ sirenWash(now, stg(p)); pol.focus = drawArrest(p, now); }catch(e){ console.warn('arrest', e); A.err = e.message + ' ' + e.stack; }
  cx.restore(); };
/* ---------- the end card: the door slams, a flash freezes it, the morning's front page lands ----------
   The freeze is the door slamming, punched in on his face in the car and the officer beside it; a press camera's flash and shutter take
   it, it holds a beat, then the next morning's front page slides down over it: 夜報, the vertical headline 暴走族 逮捕, the booking pair,
   columns of type; the big red 逮捕 seal stamps it. Borrowed (techniques only, see research/sundown-craft/arrest.md): GTA's BUSTED (a held
   frame), the spinning-newspaper montage of old crime films (here a slide, not a spin: pixel art does not rotate cleanly), 1970s-80s
   Japanese sports-paper layout, Persona 5's red stamps. Reduced motion: no flash; each layer fades in. */
let FRZC = null, FRZS = null, FRZB = null, FRZF = null;   // the frozen frame (punched in), the paper page, spares: made at warm-up, resized there, never mid-ride
const c2d = c => c.getContext('2d', { willReadFrequently:true }), fitTo = (c, v) => { if(c.width !== v.width) c.width = v.width; if(c.height !== v.height) c.height = v.height; };
const PG = {};   // the front page's kanji, built at warm-up
function endWarm(){ if(!cx) return; if(!FRZC){ FRZC = mk(1, 1); FRZS = mk(1, 1); FRZB = mk(1, 1); FRZF = mk(1, 1); for(const c of [FRZC, FRZS, FRZB, FRZF]) c2d(c); } for(const c of [FRZC, FRZS, FRZB, FRZF]) fitTo(c, cx.canvas); stampSpr();
  if(!PG.ok && (!document.fonts || document.fonts.check('16px DotGothic16', '暴走族逮捕夜報警視庁深夜の暴走二度目で御用'))){ for(const [k, str, s] of [['h2', '暴走族逮捕', 2], ['h1', '暴走族逮捕', 1], ['m', '夜報', 1], ['k', '警視庁', 1], ['s1', '深夜の暴走', 1], ['s2', '二度目で御用', 1]]) PG[k] = [...str].map(ch => { const g = glyphMask(ch, s); return bitsCanvas(g.b, g.w, g.h, '#ffffff'); });
    PG.ok = true; }
  stampSpr(2); stampSpr(1); if(typeof BIKE !== 'undefined'){ mugInk(0); mugInk(1); } }
function stampSpr(force){ const sz = force || (cx && cx.canvas.width >= 260 ? 3 : 2), key = 'arr:stamp' + sz; if(C[key]) return C[key]; const g = stackMask('逮捕', sz), w = g.w + 10, h = g.h + 10, c = mk(w, h), k = c.getContext('2d');
  k.fillStyle = '#c8102a'; k.fillRect(1, 0, w - 2, h); k.fillRect(0, 1, w, h - 2);
  k.fillStyle = CREAM; k.fillRect(2, 2, w - 4, 1); k.fillRect(2, h - 3, w - 4, 1); k.fillRect(2, 2, 1, h - 4); k.fillRect(w - 3, 2, 1, h - 4);   // the seal's rim
  k.drawImage(bitsCanvas(g.b, g.w, g.h, CREAM), 5, 5);
  k.globalCompositeOperation = 'destination-out'; k.fillStyle = '#000'; for(let q = 0; q < w * h / 36; q++) k.fillRect(Math.floor(HS(q * 7.3 + 1) * w), Math.floor(HS(q * 3.1 + 5) * h), 1, 1);   // worn ink
  if(!document.fonts || document.fonts.check('16px DotGothic16', '逮捕')) C[key] = c; return c; }   // kept only once the kanji's font subset is in
function endDom(on){ const b = document.body; if(!b) return; if(on && !document.getElementById('arr-css')){ const st = document.createElement('style'); st.id = 'arr-css';
    st.textContent = 'body.arr-end #hudx,body.arr-end .top,body.arr-end #next,body.arr-end .float,body.arr-end #banner{opacity:0!important;transition:none!important}'; document.head.appendChild(st); }
  b.classList.toggle('arr-end', !!on); }
const bandH = (w, h) => 0;   // (the caption band is gone: the page carries the night, no lines of copy under it)
const plain = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const PA = 1.0, LAND = .65, SEAL = .65 + 1.5;   // after the freeze (real s): the frozen frame holds, the front page slides in (PA), lands (PA + LAND), holds, the seal stamps (PA + SEAL)
/* The mugshot on the front page: front and side, head and shoulders, against a height chart. Helmet off: a brilliantined pompadour (a tall
   roll with one lock at the brow), heavy brows, a half-lidded stare straight at the lens and a sideways smirk; the tokko-fuku collar open
   on a white sarashi, in the player's leathers (mech/stunts.js's side palette through the cosmetics hook: B light, C trim, D dark); the
   booking placard at his chest. Drawn as grids from 1970s-80s booking photos and the era's tabloids' ID-photo crops. */
const MUGF = [
  '........KKKKKKKKK.........',
  '.......KhhhhHHHhhK........',
  '......KhHHHHHHHhhhK.......',
  '.....KhhhhhhhhhhhhhK......',
  '.....KhhhhhhhhhhhhhK......',
  '.....KhhhhHHHHHhhhhK......',
  '.....KhhhhhhhhhhhhhK......',
  '.....KhhhhhhhhhhhhhK......',
  '......KhKssshhssKhK.......',
  '......KhssssshssshK.......',
  '......KssssssssssSK.......',
  '......KsKKKssssKKKK.......',
  '.....KsssKKKssKKKSSK......',
  '....KsssswKsssswKSSSK.....',
  '....KsssssssssssSSSSK.....',
  '.....KssssssSsssSSSK......',
  '......KssssssSssSSK.......',
  '......KsssssssKsSSK.......',
  '.......KsssKKKssSK........',
  '........KsssssssK.........',
  '.....KKKKKSsssSKKKKK......',
  '....KbbbttSSSSSttbbbK.....',
  '...KbaaabtwwwwwtbbbcbK....',
  '..KbPPPPPPPPPPPPPPPPPbK...',
  '.KbapppppppppppppppppcbK..',
  '.KbapppppppppppppppppcbK..',
  '.KbspppppppppppppppppcsK..',
  '.KbspppppppppppppppppcsK..',
  'KbaapppppppppppppppppccbK.',
  'KbaapppppppppppppppppccbK.',
  'KbaapppppppppppppppppccbK.',
  'KbaapppppppppppppppppccbK.'];
const MUGS = [
  '.............KKK..........',
  '.........KKKKhhhKKK.......',
  '.......KKHHHHHHHHHhK......',
  '.....KKhhhhhHHhhhhhhK.....',
  '....KhhhhhhhhhhhhhhhhK....',
  '....KhHHHHHhhhhhhhhhK.....',
  '...KhhhhhhhhhhhhhhhK......',
  '...KhhhhhhhhhhhhhKK.......',
  '...KhhhhhhhhhhhhhK........',
  '...KhhhhhhhhhhhhK.........',
  '....KhhhhhsssssssK........',
  '....KhhhhsssssKKKsK.......',
  '....KhhhKSsssssKKsK.......',
  '.....KKhhSssssswKsK.......',
  '.......KSKssssssssK.......',
  '........KSssssssssssK.....',
  '.........KsssssssssK......',
  '........KSssssssKKKK......',
  '........KSSsssssssK.......',
  '........KSSSsssssK........',
  '.......KKSSSSSSKKK........',
  '......KbbSSSSSStttK.......',
  '.....KbbbbbbbbbbttbK......',
  '....KbbbbbbbbbbbttcbK.....',
  '...KbbbbbbbbbbbbtttcbK....',
  '...KbbbbbbbbbbbbbttcbK....',
  '...KbbbbbbbbbbbbbcccbK....',
  '...KbbbbbbbbbbbbbbccbK....',
  '..KbbbbbbbbbbbbbbbcccbK...',
  '..KbbbbbbbbbbbbbbbcccbK...',
  '..KbbbbbbbbbbbbbbbcccbK...',
  '..KbbbbbbbbbbbbbbbcccbK...'];
function mugPal(){ const D = MECH.stunts && MECH.stunts._dbg; let B = '#f4f0e8', Cc = '#3ad0f0', Dd = '#106a90', key = 'sport';
  if(D && D.SIDEP){ const id = D.SIDEP[BIKE.id] ? BIKE.id : 'sport', P0 = Object.assign({}, D.COMMON, D.SIDEP[id]), Cs = window.COS; let p = P0;
    if(Cs && Cs.sig && Cs.pal){ try{ p = Object.assign({}, P0, Cs.pal(id, 'rider', P0)); }catch(e){} } B = p.B || B; Cc = p.C || Cc; Dd = p.D || Dd; key = id + (Cs && Cs.sig || ''); }
  return { key, P:{ K:'#0e0c14', h:'#1c1620', H:'#5a4a64', s:'#f0c098', S:'#c88a68', a:mixc(B, '#ffffff', .25), b:B, c:Dd, t:Cc, w:'#ffffff', p:'#f2ead8', P:'#16121a' } }; }
function mugInk(i){ const mp = mugPal(), key = 'arr:mugi' + i + ':' + mp.key; if(C[key]) return C[key]; const rows = i ? MUGS : MUGF, c = mk(rows[0].length, rows.length), k = c.getContext('2d');
  const lum = col => { const [r, g, b] = hx(col); return (r * 77 + g * 150 + b * 29) >> 8; }, tone = L => L < 50 ? 3 : L < 110 ? 2 : L < 185 ? 1 : 0;
  const T = { K:3, h:3, H:2, s:0, S:1, a:tone(lum(mp.P.a)), b:tone(lum(mp.P.b)), c:Math.max(1, tone(lum(mp.P.c))), t:4, w:0, p:0, P:3 }, INKT = ['#efe6d2', '#3a3430', '#3a3430', '#16121a', '#c8102a'];
  rows.forEach((r, y) => { for(let x = 0; x < r.length; x++){ const v = T[r[x]]; if(v == null) continue; k.fillStyle = v === 1 && (x + y) % 2 ? '#efe6d2' : INKT[v]; k.fillRect(x, y, 1, 1); } });   // tone 1: half ink, a coarse ordered screen
  return C[key] = c; }
function freezeGrab(f){ const cv = cx.canvas, w = cv.width, h = cv.height, nar = w < 260, by = h - bandH(w, h); endWarm();
  const z = nar ? 4 : 2, sw = Math.ceil(w / z), sh = Math.ceil(by / z), sx = clamp(Math.round(nar ? f.wx - sw / 3 : Math.min(f.fx - sw / 2, f.wx - sw * .25)), 0, Math.max(0, w - sw)),   // his face always in frame (a phone keeps the face over the officer)
    sy = clamp(Math.round(f.wy - sh * .3), 0, Math.max(0, h - sh));   // his face at the window on the upper third, fully in frame
  const kc = c2d(FRZC); kc.imageSmoothingEnabled = false; kc.fillStyle = INK; kc.fillRect(0, 0, w, h); kc.drawImage(cv, sx, sy, sw, sh, 0, 0, sw * z, sh * z);
  kc.fillStyle = 'rgba(7,6,12,.12)'; kc.fillRect(0, 0, w, by);   // the night, a touch darker: a held frame
  const L = LANDS[landIdx(zone())], dt = new Date(), p2 = v => String(v).padStart(2, '0'), date = "'84." + p2(dt.getMonth() + 1) + '.' + p2(dt.getDate());
  const wfx = (f.wx - sx) * z, wfy = (f.wy - sy) * z;
  let ini = ''; try{ ini = typeof store !== 'undefined' ? String(store.get('sundown.initials', '') || '') : ''; }catch(e){}
  const F = { z, by, wfx, wfy, l1:plain(L.name) + '  ' + km().toFixed(1) + ' KM', l2:date + '  CAUGHT AT NIGHT', l3:'THE ROAD WILL WAIT...',
    PW:Math.round(w * (nar ? .92 : .88)), PH:Math.round(by * (nar ? .9 : .87)), road:plain(L.name), km:km().toFixed(1), ini:(ini.trim() || 'SUNDOWN').toUpperCase().slice(0, 7), no:'NO.' + (8400 + Math.floor(HS(km() * 7.3 + dt.getDate()) * 99)), seed:km() * 13.7 + dt.getDate() };
  paperPage(F, nar, date);
  return F; }
/* The morning's front page, set like a 1970s-80s Japanese sports paper (after Nikkan Sports / Tokyo Sports / the Yomiuri and Asahi of
   the era): the masthead block top right in red with the date strip under it; the main headline in vertical heavy kanji in reversed boxes
   (暴走族 white on black, 逮捕 white on red); the booking pair as the lead photo; dense vertical columns of body type (tategaki) set as
   rows of tiny glyph marks, never readable; stacked secondary headlines in real kanji; thin column rules; a boxed lead; a small second
   story with its own photo; an ad strip along the foot. Black ink and one spot red on off-white newsprint, the red a pixel out of
   register. Built once at the freeze into FRZS at the page's own size (it slides in tilted). */
const GLY = ['111101111', '010111010', '111010111', '101111101', '110011110', '011110011', '111001111', '100111001', '111111010', '010111111', '111100111', '001111100'];
function paperPage(F, nar, date){ const k = c2d(FRZS), PW = F.PW, PH = F.PH, INKN = '#16121a', BODY = '#4a423a', RED = '#c8102a', PAP = '#ece3cf', m = nar ? 4 : 6;
  k.imageSmoothingEnabled = false; k.clearRect(0, 0, FRZS.width, FRZS.height); k.fillStyle = PAP; k.fillRect(0, 0, PW, PH); k.fillStyle = '#c8bca4'; k.fillRect(0, PH - 1, PW, 1); k.fillRect(PW - 1, 0, 1, PH);   // the paper and its edge
  const txt = (s, x, y, col) => { k.fillStyle = col; s = s.toUpperCase(); for(let n = 0; n < s.length; n++){ const b = F3[s[n]] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') k.fillRect(x + n * 4 + i % 3, y + ((i / 3) | 0), 1, 1); } };
  const ink = (c, x, y, col) => { if(!c) return; const kb = c2d(FRZB); kb.clearRect(0, 0, c.width + 2, c.height + 2); kb.drawImage(c, 0, 0); kb.globalCompositeOperation = 'source-in'; kb.fillStyle = col; kb.fillRect(0, 0, c.width, c.height); kb.globalCompositeOperation = 'source-over'; k.drawImage(FRZB, 0, 0, c.width, c.height, x, y, c.width, c.height); };
  const inkV = (arr, cx0, y, col, y1) => { if(!arr) return y; for(const c of arr){ if(y + c.height > y1) break; ink(c, Math.round(cx0 - c.width / 2), y, col); y += c.height + 1; } return y; };   // a vertical run of glyphs, centred on cx0
  const inkH = (arr, x, y, col, x1) => { if(!arr) return x; for(const c of arr){ if(x + c.width > x1) break; ink(c, x, y, col); x += c.width + 1; } return x; };
  const hOf = arr => arr ? arr.reduce((a, c) => a + c.height + 1, 0) : 0, wMax = arr => arr ? Math.max(...arr.map(c => c.width)) : 0;
  const R = n => HS(n * 1.618 + F.seed), rect = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); }, box = (x, y, w, h) => { rect(x, y, w, 1, INKN); rect(x, y + h - 1, w, 1, INKN); rect(x, y, 1, h, INKN); rect(x + w - 1, y, 1, h, INKN); };
  // body type: vertical columns read right to left, each glyph a 3x3 mark, a gap between columns, ragged paragraph ends
  const body = (x0, y0, x1, y1, sd) => { let c = 0; for(let x = x1 - 3; x >= x0; x -= 4, c++){ const brk = R(sd + c * 7.1) < .2 ? Math.floor(R(sd + c * 3.3) * (y1 - y0) / 4) : -1;
      for(let y = y0, r = 0; y + 3 <= y1; y += 4, r++){ if(r === brk || r === brk + 1) continue; const g = GLY[Math.floor(R(sd * 3 + c * 131 + r * 17) * GLY.length)]; for(let i = 0; i < 9; i++) if(g[i] === '1') rect(x + i % 3, y + ((i / 3) | 0), 1, 1, BODY); } } };   // each mark one of a few stroke-like 3x3 shapes: reads as type, not noise
  const photo = (x, y, w, h, sd) => { box(x, y, w, h); for(let yy = y + 1; yy < y + h - 1; yy++) for(let xx = x + 1; xx < x + w - 1; xx++){ const v = (yy - y) / h + R(sd + ((xx - x) >> 3)) * .4; if(v > .55 ? (xx + yy) % 2 === 0 : v > .35 && (xx + yy) % 4 === 0) rect(xx, yy, 1, 1, BODY); }   // a small news photo in a coarse screen
    const hx = x + Math.round(w * (.3 + R(sd) * .4)), hy = y + Math.round(h * .3); for(let yy = -4; yy <= 4; yy++) rect(hx - Math.round(Math.sqrt(16 - yy * yy) * .8), hy + yy, Math.round(Math.sqrt(16 - yy * yy) * 1.6) + 1, 1, INKN); rect(hx - 6, hy + 5, 13, y + h - 1 - hy - 5, INKN); };   // a figure in it
  // the booking pair (front, profile), framed tight, printed in the page's inks; the placard at the chest
  const mugs = (px, py, sd, gap) => { const mz = 2; for(let q = 0; q < 2; q++){ const fx = px + 1 + q * (sd + gap + 2), fy = py + 1;
      rect(fx - 1, fy - 1, sd + 2, sd + 2, INKN); rect(fx, fy, sd, sd, PAP); k.save(); k.beginPath(); k.rect(fx, fy, sd, sd); k.clip();
      for(let y = fy + sd - 1, n = 0; y > fy; y -= 4, n++) rect(fx, y, sd, 1, n % 4 === 0 ? '#3a3430' : '#b4aa96');   // the height chart
      const g = mugInk(q); k.drawImage(g, fx + Math.round((sd - g.width * mz) / 2) + (q ? 2 : 0), fy + 2, g.width * mz, g.height * mz);
      if(!q){ const bw = Math.min(sd - 12, 34), bh = 15, bx = fx + ((sd - bw) >> 1), by2 = fy + sd - bh - 1;
        rect(bx - 1, by2 - 1, bw + 2, bh + 2, INKN); rect(bx, by2, bw, bh, '#f8f2e4'); rect(bx + 1, by2 + 1, bw - 2, 1, INKN);
        txt(F.no, bx + ((bw - F.no.length * 4 + 1) >> 1), by2 + 3, INKN); txt(F.ini, bx + ((bw - F.ini.length * 4 + 1) >> 1), by2 + 9, RED); }
      k.restore(); } return 2 * sd + gap + 4; };
  const redBox = (x, y, w, h) => { rect(x + 1, y + 1, w, h, RED); box(x, y, w + 1, h + 1); };   // spot red, a pixel out of register against its ink rule
  // the masthead, top right: 夜報 down a red block, the date strip under it
  const mw = nar ? 26 : 34, mx = PW - m - mw, mh = hOf(PG.m) + 10; redBox(mx, m, mw - 1, mh); inkV(PG.m, mx + mw / 2 + 1, m + 6, PAP, m + mh);
  const ds = nar ? date.slice(4) : date; box(mx, m + mh + 3, mw, 9); txt(ds, mx + ((mw - ds.length * 4 + 1) >> 1), m + mh + 5, INKN);
  // the main headline, vertical: 暴走族 white on black, 逮捕 white on red, as tall as the page allows
  const A = PG.h2, hw = wMax(A) + 8, hx1 = mx - 4, a1 = A ? A.slice(0, 3) : null, a2 = A ? A.slice(3) : null, h1 = hOf(a1) + 8, h2 = hOf(a2) + 8;
  rect(hx1 - hw, m, hw, h1, INKN); inkV(a1, hx1 - hw / 2, m + 4, PAP, m + h1);
  redBox(hx1 - 2 * hw - 4, m, hw - 1, h2); inkV(a2, hx1 - 2 * hw - 4 + hw / 2 + 1, m + 5, PAP, m + h2 + 1);
  const hL = hx1 - 2 * hw - 4, ft = PH - m - (nar ? 16 : 20);   // the headline block's left edge; the foot (ad strip) line
  // the ad strip along the foot
  rect(m, ft, PW - 2 * m, 1, INKN); rect(m, ft + 2, PW - 2 * m, 1, INKN); const aw = Math.floor((PW - 2 * m - 8) / 3), ay = ft + 4, ah = PH - m - ay;
  for(let q = 0; q < 3; q++){ const ax = m + q * (aw + 4); if(q === 1){ redBox(ax, ay, aw - 1, ah - 1); for(let x = ax + 3; x < ax + aw - 4; x += 6) rect(x + 1, ay + 3, 4, ah - 7, PAP); }
    else { box(ax, ay, aw, ah); for(let x = ax + 3; x + 4 < ax + aw - 2; x += 6) rect(x, ay + 3, 4, 4, INKN); for(let x = ax + 3; x + 2 < ax + aw - 2; x += 3) if(R(q * 9 + x) > .3) rect(x, ay + 9, 2, Math.max(1, ah - 12), BODY); } }
  if(nar){
    // phone: the booking pair across the page under the headline, a red 警視庁 strap, then type and a vertical secondary headline
    body(hL, m + h2 + 5, hL + hw - 2, m + h1, 3);
    const py = m + Math.max(h1, h2 + 40) + 4, sd = Math.floor((PW - 2 * m - 8) / 2); mugs(m, py, sd, 4);
    const ty = py + sd + 6; rect(m, ty - 2, PW - 2 * m, 1, INKN); const sx = PW - m - 18; inkV(PG.s1, sx + 9, ty + 1, INKN, ft - 2); rect(sx - 2, ty, 1, ft - ty - 2, INKN);
    body(m, ty + 1, sx - 4, ft - 2, 11); F.nsy = Math.round((ty + ft) / 2) + 6; }   // (the phone's stamp lands on this type, below both faces)
  else {
    // desktop: the booking pair top left with a red strap under it, a boxed lead and type; a small second story in the middle; type and a
    // vertical secondary headline under the masthead
    const pw = mugs(m, m + 2, 64, 6), sy = m + 2 + 68; redBox(m, sy, pw - 2, 18); inkH(PG.s2, m + 4, sy + 2, PAP, m + pw - 4);
    const ly = sy + 22; box(m, ly, pw, 46); body(m + 3, ly + 3, m + pw - 3, ly + 43, 5); body(m, ly + 50, m + pw, ft - 3, 7);
    const c0 = m + pw + 4, c1 = hL - 5; rect(c0 - 2, m, 1, ft - m - 2, INKN); rect(c1 + 2, m + Math.max(h1, h2) + 4, 1, ft - m - Math.max(h1, h2) - 6, INKN);
    inkH(PG.k, c0 + 2, m + 2, INKN, c1); rect(c0, m + 20, c1 - c0, 1, INKN); photo(c0 + 2, m + 24, c1 - c0 - 4, 44, 9); body(c0, m + 72, c1, ft - 3, 13);
    const ry = m + Math.max(h1, h2, mh + 14) + 6, sx = PW - m - 18; rect(hL, ry - 3, PW - m - hL, 1, INKN); inkV(PG.s1, sx + 9, ry, INKN, ft - 2); rect(sx - 2, ry, 1, ft - ry - 2, INKN);
    body(hL, ry, sx - 4, ft - 3, 17); }
  // the big red stamp, slammed over the page askew
  F.ss = nar ? 2 : 3; F.psx = Math.round(PW * (nar ? .34 : .44)); F.psy = nar ? F.nsy : Math.round(PH * .56); F.pang = -12 * DEG; }
// the card: the door slams and a flash freezes it (his face in the car); the morning's front page slides in tilted from the
// bottom right, overshoots and settles at a small tilt like a paper tossed on a desk (nearest-neighbour rotation: no blur), the seal
// stamps it, the caption types on the black band
const DEG = Math.PI / 180, easeBack = q => { const c = 1.15; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
function drawEnd(e){ const F = pol.fz, w = cx.canvas.width, h = cx.canvas.height, rm = reduce || !!(window.ASSIST && ASSIST.noFlash), by = F.by, bh = h - by;
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
  cx.drawImage(FRZC, 0, 0);   // the freeze: his face in the car, the officer beside it
  if(!rm && e < .1){ cx.globalAlpha = e < .04 ? .75 : .3; cx.fillStyle = '#fff8ec'; cx.fillRect(0, 0, w, by); cx.globalAlpha = 1; }   // a press camera's flash on the slam
  if(e >= PA){ const q = rm ? 1 : clamp((e - PA) / LAND, 0, 1), f = rm ? 1 : easeBack(q), rest = -3 * DEG, a0 = 11 * DEG;   // the front page, slid on
    const x0 = w * 1.2, y0 = by * 1.45, x1 = w / 2, y1 = by / 2 + 1, px = Math.round(lerp(x0, x1, f)), py = Math.round(lerp(y0, y1, f)), ang = lerp(a0, rest, f), PW = F.PW, PH = F.PH;
    cx.save(); cx.translate(px, py); cx.rotate(ang); cx.globalAlpha = rm ? step((e - PA) / .3, 3) : 1;
    cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fillRect(-(PW >> 1) + 4, -(PH >> 1) + 5, PW, PH);   // its shadow on the frozen frame
    cx.drawImage(FRZS, 0, 0, PW, PH, -(PW >> 1), -(PH >> 1), PW, PH);
    const t0 = PA + SEAL; if(e >= t0){ const sp = stampSpr(F.ss || 2), big = !rm && e < t0 + .05, sc = big ? 1.25 : 1, sw = Math.round(sp.width * sc), sh = Math.round(sp.height * sc), sj = !rm && e < t0 + .12 ? (Math.floor(e * 60) % 2 ? 1 : -1) : 0;
      cx.save(); cx.translate(F.psx - (PW >> 1) + sj, F.psy - (PH >> 1)); cx.rotate(F.pang || 0); cx.drawImage(sp, -(sw >> 1), -(sh >> 1), sw, sh); cx.restore(); }   // the seal, stamped onto the page (it tilts with it)
    cx.restore(); }
  cx.restore();
  cx.restore(); }
A._focus = () => pol && JSON.stringify([pol.focus, pol.fz && pol.fz.wfx, pol.fz && pol.fz.wfy, cx.canvas.width, cx.canvas.height]);   // (test harness)
A.post = now => { if(!pol || (state !== 'pulled' && state !== 'over')) return; const p = state === 'pulled' ? pullT : PULL_T + 1, e = endE(p);
  if(e < 0 || (!pol.fz && !pol.focus)) return;
  try{ if(!pol.fz){ pol.fz = freezeGrab(pol.focus); if(!reduce) shake = 0; endDom(state === 'pulled'); } drawEnd(e); }catch(err){ console.warn('arrest end', err); A.err = err.message + ' ' + err.stack; } };
// any button skips: during the arrest straight to the freeze (the last image is the point), during the card on to the results
const PADP = new Uint8Array(20), PADN = new Uint8Array(20);
function padNow(into){ into.fill(0); let any = false; const gs = navigator.getGamepads ? navigator.getGamepads() : null; if(!gs) return false;
  for(let g = 0; g < gs.length; g++){ const gp = gs[g]; if(!gp) continue; any = true; for(let i = 0; i < gp.buttons.length && i < into.length; i++) if(gp.buttons[i].pressed) into[i] = 1; } return any; }
function skipArrest(){ if(!pol || state !== 'pulled' || pullT < .05 || (typeof PSE !== 'undefined' && PSE.on)) return; const e = endE(pullT);   // (pullT sits at 0 while the crash cam runs: that press is the cam's)
  if(e < PA + SEAL - .05){ pol.hit = true; pol.kick = true; pullT = fzP() + PA + SEAL - .001; const L = reduce ? cueListR() : cueList(); while(pol.ci < L.length && L[pol.ci][1] !== 'stamp') pol.ci++; }   // straight to the front page as the seal lands
  else if(e >= PA + SEAL + .1) pullT = PULL_T + .01; }
addEventListener('keydown', e => { if(e.repeat || e.code === 'Escape' || (typeof keyMap === 'function' && keyMap(e.code) === 'KeyP')) return; skipArrest(); });
addEventListener('pointerdown', e => { if(e.target && e.target.closest && e.target.closest('button, a, input, select, #sheet')) return; skipArrest(); });

/* ---------- the start countdown: 三 二 一 走れ!, on the beat, under a gantry of lamps that strike on ----------
   The core holds the ride in 'ready' (no update, no movement) while MECH.arrival.countdown(go) returns true; go() starts the ride, and
   the music, which only plays in 'play', drops in on GO. References: OutRun / Super Hang-On start lamps (a light per count, then go);
   Japan's horizontal traffic signal, whose "go" lamp is called 青 (blue) and glows blue-green - it is the GO lamp here; the bosozoku
   "call" (コール): rhythmic throttle blips, ba-ba-baan, on each count; Street Fighter II's ROUND / FIGHT - each count lands as one hit.
   About 2.9 s at the music's tempo (126 BPM, a count every 1.5 beats). Presses no longer skip it (CD_SKIP); pause freezes it (the pause
   menu freezes performance.now); reduced motion is a calm fade count with the lamps simply on. */
const CD_B = 60 / 126 * 1.5, CD_0 = .15, CD_GO = CD_0 + 3 * CD_B, CD_END = CD_GO + .75, CD_R = '#ff2a3a', CD_G = '#3affd0';
const CD_L = [['三', '3'], ['二', '2'], ['一', '1'], ['走れ', 'GO!']].map(([kanji, name], k) => ({ key:'cd' + k, kanji, name, note:' ', col:k < 3 ? CD_R : CD_G, by:.36, nby:.4, fullbh:k === 3, ns:k < 3 ? 5 : 3, nns:k < 3 ? 3 : 2, ks:k < 3 ? 6 : 4, nks:k < 3 ? 3 : 2, prog:[[52, 55, 59]] }));
let cd = null, cdKey = 0, cdPtr = 0;
const CD_SKIP = false;   /* Kellan, 2026-11-20: the countdown can't be clicked or pressed through any more */
function cdSkip(){ if(!CD_SKIP || !cd || cd.fired >= 3) return; const now = cd.now || performance.now(), t = (now - cd.t0) / 1000;   // on the countdown's own clock (the frame time, which pause freezes)
  if(t < .3) return; cd.t0 = now - CD_GO * 1000; cd.skipped = true; }
addEventListener('keydown', e => { cdKey = performance.now(); if(cd && !e.repeat) cdSkip(); }, true);
addEventListener('pointerdown', () => { cdPtr = performance.now(); if(cd) cdSkip(); }, true);
A.countdown = go => { if(typeof pixText !== 'function' || typeof go !== 'function') return false; const now = performance.now();
  if(cd){ if(now - cdKey > 5 && now - cdPtr > 5 && now - cd.last > 150) cdSkip(); cd.last = now; return true; }   // a gamepad calls every frame while held: a gap means a fresh press
  try{ cdWarm(); }catch(e){ console.warn('countdown', e); return false; }
  cd = { go, t0:now, last:now, fired:-1, lit:[-1, -1, -1, -1], shook:-1, started:false };
  return true; };
A.countdownOn = () => !!cd;
// every countdown piece at this screen size (built at load and on reset, so pressing start never waits on a build)
function cdWarm(){ const cw = cx.canvas.width, ch = cx.canvas.height, narrow = cw < 260; cardFor(CD_L[3], 90); boxLabel('READY', CREAM, CD_R); boxLabel('RIDE', INK, CD_G, CD_G);
  for(let k = 0; k < 3; k++){ cdDigit(3 - k, cw, ch); cdSeal(k, Math.round(narrow ? cw * .2 : ch * .2)); }
  const g = cdDigit(3, cw, ch), S = Math.round(narrow ? cw * .2 : ch * .2), gap = narrow ? 4 : 8, gx = Math.round(cw / 2 - (S + gap + g.w) / 2);
  cdFocus(cw, ch, gx + S + gap + g.w / 2, Math.round(ch * (narrow ? .56 : .5)), g.h * .55); }
// the bike's "call": three throttle blips per count (ba-ba-baan), a long howl on GO; a lamp relay clunk and the start beeps
function cdSound(k){ if(!M.ac) return; const a = M.ac.currentTime;   // the call revs themselves are the bike's engine now (audio/sfx.js drives it through the count)
  if(reduce){ M.tone(k < 3 ? 660 : 1320, k < 3 ? .12 : .35, { type:'square', v:.02 }); return; }
  M.noise(.05, 1800, .05, a); M.tone(k < 3 ? 660 : 1320, k < 3 ? .14 : .45, { type:'square', v:.022, at:a });
  if(k >= 3){ M.tone(55, .4, { v:.16, at:a }); M.noise(.25, 160, .2, a); [60, 64, 67].forEach((m, n) => M.tone(midi(m + 12), 1.2, { type:'triangle', v:.026, at:a + .05 + n * .04 })); } }
// the gantry: a steel beam with a big horizontal signal head hung low over the road (lamps ~5% of the screen wide, Fresnel rings, hoods);
// three red lamps strike on one per count and light the road red, then all flip to 青 on GO and the road washes blue-green
function cdLampGeom(cw, ch, narrow){ const r = Math.max(4, Math.round(cw * .025)), gap = Math.max(3, Math.round(r * .55)), pitch = r * 2 + gap, n = 4, hw = n * pitch + gap, hh = r * 2 + gap * 2 + 2;
  const ly = Math.round(ch * (narrow ? .3 : .21)), hx = Math.round(cw / 2 - hw / 2), hy = ly - Math.round(hh / 2), by0 = Math.max(2, hy - Math.round(ch * .06));
  return { r, gap, pitch, n, hw, hh, ly, hx, hy, by0 }; }
function cdLit(t){ return t >= CD_GO ? 4 : t < CD_0 ? 0 : Math.min(3, 1 + Math.floor((t - CD_0) / CD_B)); }
function cdWash(t, cw, ch){ const lit = cdLit(t); let col = CD_R, a = 0;
  if(lit === 4){ col = CD_G; const q = t - CD_GO; a = reduce ? .1 : q < .08 ? .2 : q < .25 ? .14 : q < .5 ? .1 : .06; if(t > CD_END - .3) a *= 1 - step((t - (CD_END - .3)) / .3, 3); }
  else a = lit * .045;
  if(a <= 0) return; const y0 = Math.round(ch * .5), y1 = Math.round(ch * .72);   // two hard bands of lamp light on the road, stronger near
  cx.fillStyle = col; cx.globalAlpha = a * .55; cx.fillRect(0, y0, cw, y1 - y0); cx.globalAlpha = a; cx.fillRect(0, y1, cw, ch - y1); cx.globalAlpha = 1; }
function cdGantry(t, ch, cw, narrow){ const g = cdLampGeom(cw, ch, narrow), { r, gap, pitch, n, hw, hh, ly, hx, hy, by0 } = g, lit = cdLit(t);
  const drop = reduce ? 0 : Math.round((1 - step(clamp(t / .2, 0, 1), 4) + step(clamp((t - (CD_END - .3)) / .3, 0, 1), 4)) * (hy + hh + 6));   // drops into view, lifts away after GO
  cx.save(); cx.translate(0, -drop);
  // the beam (a box truss) and two hangers
  cx.fillStyle = '#05040a'; cx.fillRect(0, by0 - 1, cw, 7); cx.fillStyle = '#3a3850'; cx.fillRect(0, by0, cw, 5); cx.fillStyle = '#6a6880'; cx.fillRect(0, by0, cw, 1); cx.fillStyle = '#24222e'; cx.fillRect(0, by0 + 4, cw, 1);
  cx.fillStyle = '#24222e'; for(let x = 0; x < cw; x += 8){ for(let q = 0; q < 3; q++) cx.fillRect(x + q, by0 + 1 + q, 1, 1); for(let q = 0; q < 3; q++) cx.fillRect(x + 6 - q, by0 + 1 + q, 1, 1); }
  for(const x of [hx + pitch, hx + hw - pitch - 2]){ cx.fillStyle = '#05040a'; cx.fillRect(x - 1, by0 + 5, 4, hy - by0 - 4); cx.fillStyle = '#3a3850'; cx.fillRect(x, by0 + 5, 2, hy - by0 - 5); }
  // the housing: black box, a lit top edge, a backplate rim
  cx.fillStyle = '#05040a'; cx.fillRect(hx - 2, hy - 2, hw + 4, hh + 4); cx.fillStyle = '#18161f'; cx.fillRect(hx, hy, hw, hh); cx.fillStyle = '#34324a'; cx.fillRect(hx, hy, hw, 1); cx.fillStyle = '#0c0b12'; cx.fillRect(hx, hy + hh - 1, hw, 1);
  for(let i = 0; i < n; i++){ const lx = hx + gap + r + i * pitch, go = lit === 4, on = go || i < lit, born = go ? CD_GO : CD_0 + i * CD_B, hot = !reduce && on && t - born < .06;
    const col = go ? CD_G : CD_R, mid = go ? '#1aa88a' : '#c01828', core = go ? '#e0fff8' : '#ffd8d8', off = go ? '#0a2a26' : (i === 3 ? '#0a2a26' : '#3a0a14'), offR = i === 3 && !go ? '#0e3a34' : '#4a1220';
    for(let yy = -r; yy <= r; yy++) for(let xx = -r; xx <= r; xx++){ const d = Math.hypot(xx + .5, yy + .5); if(d > r) continue;
      const ring = Math.floor(d / Math.max(2, r / 3.5)) % 2, upper = xx + yy < -r * .6;
      cx.fillStyle = hot ? '#ffffff' : on ? (upper && d < r * .7 ? core : ring ? mid : col) : (ring ? off : offR); cx.fillRect(lx + xx, ly + yy, 1, 1); }
    cx.fillStyle = '#05040a'; cx.fillRect(lx - r - 1, ly - r - 2, r * 2 + 2, Math.max(2, Math.round(r / 3)));   // the hood
    cx.fillStyle = '#2a2838'; cx.fillRect(lx - r - 1, ly - r - 2, r * 2 + 2, 1);
    if(on) glow(lx, ly, r * (hot ? 4.5 : 3), col, reduce ? .3 : hot ? .85 : .5); }
  cx.restore(); }
// the hero numeral: the title's block face, about 40% of the screen tall, chrome, a 2-px ink outline, a deep red extrusion
// the countdown numerals: chunky 7 x 9 arcade digits (2-3 cell strokes, a full middle bar) so they read at a glance; a gentle lean
const HERO = { 3:['XXXXXX.', 'XXXXXXX', '....XXX', '..XXXX.', '..XXXX.', '....XXX', '....XXX', 'XXXXXXX', 'XXXXXX.'],
  2:['.XXXXX.', 'XXXXXXX', 'XX...XX', '....XXX', '..XXXX.', '.XXX...', 'XXX....', 'XXXXXXX', 'XXXXXXX'],
  1:['..XXX..', '.XXXX..', 'XXXXX..', '..XXX..', '..XXX..', '..XXX..', '..XXX..', 'XXXXXXX', 'XXXXXXX'] };
function heroMask(d, s){ const g = HERO[d], rows = g.length, sl = Math.ceil(s * .25), m = mk(7 * s + 5 * sl, rows * s), k = m.getContext('2d'); k.fillStyle = '#fff';
  g.forEach((row, y) => { const off = Math.floor((rows - 1 - y) / 2) * sl; [...row].forEach((c, x) => { if(c === 'X') k.fillRect(x * s + off, y * s, s, s); }); }); return m; }
function cdDigit(d, cw, ch){ const key = 'cdd' + d + ':' + cw + 'x' + ch; if(C[key]) return C[key];
  const s = Math.max(3, Math.min(Math.round(ch * .4 / 9), Math.floor(cw * (cw < 260 ? .5 : .42) / 8.5))), m = heroMask(d, s), dep = Math.max(2, Math.round(s / 3)), W2 = m.width + dep + 5, H2 = m.height + dep + 5;
  const c = mk(W2, H2), k = c.getContext('2d'), ink2 = tintMask(m, INK); k.imageSmoothingEnabled = false;
  for(let i = dep; i > 0; i--) k.drawImage(tintMask(m, i > dep / 2 ? '#3a0614' : '#6a0a24'), 2 + i, 2 + i);
  for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++) if(Math.abs(dx) + Math.abs(dy) <= 3) k.drawImage(ink2, 2 + dx, 2 + dy);
  k.drawImage(bandMask(m, CHROME14), 2, 2);
  const wh = mk(W2, H2), kw = wh.getContext('2d'); for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++) if(Math.abs(dx) + Math.abs(dy) <= 3) kw.drawImage(tintMask(m, '#ffffff'), 2 + dx, 2 + dy);
  return C[key] = { c, white:wh, w:W2, h:H2, bits:maskBits(m), mw:m.width, mh:m.height, s }; }
function cdGlint(g, x, y, t){ if(t < 0 || t > .45) return; const p = Math.round(t / .45 * (g.mw + g.mh)) - g.mh * .6, bw = Math.max(2, Math.round(g.s / 3)); cx.fillStyle = '#ffffff';
  for(let r = 0; r < g.mh; r++){ const q0 = Math.round(p + (g.mh - r) * .6); for(const [a, w] of [[0, bw], [bw + 2, 1]]) for(let q = q0 + a; q < q0 + a + w; q++) if(q >= 0 && q < g.mw && g.bits[r * g.mw + q]) cx.fillRect(x + q, y + r, 1, 1); } }
// the seal: 一 二 三 carved white into a red hanko, each stroke laid like a brush - a slanted pressed entry, a thinner rising shaft
// with dry-brush streaks, a pressed rounded knob at the end; top strokes shorter and lighter, the bottom one longest and heaviest
const CD_STROKES = [[[.12, .76, .9, .7, .17], [.28, .5, .7, .47, .11], [.2, .25, .78, .2, .12]], [[.12, .68, .88, .62, .17], [.24, .32, .74, .28, .13]], [[.12, .53, .88, .46, .19]]];
function cdSeal(k, S){ const key = 'cds' + k + ':' + S; if(C[key]) return C[key]; const c = mk(S, S), g = c.getContext('2d'), P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for(let y = 0; y < S; y++) for(let x = 0; x < S; x++){ const corner = (x < 2 && y < 2) || (x > S - 3 && y < 2) || (x < 2 && y > S - 3) || (x > S - 3 && y > S - 3); if(corner && (x + y) % 3) continue;
    P(x, y, HS(x * 3.7 + y * 11.3 + k) > .86 ? '#a80c22' : '#c8102a'); }
  g.fillStyle = '#e8506a'; g.fillRect(1, 0, S - 2, 1);
  const bd = Math.max(2, Math.round(S * .07)); g.fillStyle = '#f4ecdf'; for(const [x, y, w, h] of [[bd, bd, S - bd * 2, 1], [bd, S - bd - 1, S - bd * 2, 1], [bd, bd, 1, S - bd * 2], [S - bd - 1, bd, 1, S - bd * 2]]) for(let i = 0; i < w; i++) for(let j = 0; j < h; j++) if(HS((x + i) * 1.3 + (y + j) * 7.1 + k) > .18) g.fillRect(x + i, y + j, 1, 1);   // the worn border
  for(const [x0, y0, x1, y1, th] of CD_STROKES[k]){ const X0 = Math.round(x0 * S), X1 = Math.round(x1 * S), L = X1 - X0;
    for(let x = X0 - 2; x <= X1 + 1; x++){ const t = (x - X0) / L, cyy = lerp(y0, y1, clamp(t, 0, 1)) * S + (t > .82 ? (t - .82) * S * .12 : 0);
      let h = th * S / 2 * (t < 0 ? 1.1 * (1 + t / .06) : t < .1 ? 1.25 - t * 2 : t < .82 ? .86 + .05 * Math.sin(t * 9) : .95 * Math.sqrt(Math.max(0, 1 - Math.pow((t - .9) / .11, 2))) + .2);
      if(h <= .3) continue; const slant = t < .1 ? (.1 - t) * th * S * 2.2 : 0;   // the entry is cut on a slant: the brush comes down from the upper left
      for(let y = Math.round(cyy - h + slant); y <= Math.round(cyy + h); y++){ const dry = t > .3 && t < .84 && HS(y * 5.3 + k * 9 + x0 * 40) > .72 && HS(x * 1.7 + y * 3.1) > .3;
        if(!dry && x >= 0 && x < S && y >= 0 && y < S) P(x, y, HS(x * 2.9 + y * 4.7) > .93 ? '#e6dccb' : '#f4ecdf'); } } }
  return C[key] = c; }
function cdFocus(cw, ch, fx, fy, r0){ const key = 'cdf' + cw + 'x' + ch; if(C[key]) return C[key];
  return C[key] = [0, 1].map(f => { const c = mk(cw, ch), k = c.getContext('2d'), R = Math.hypot(cw, ch); k.fillStyle = '#fff';
    for(let n = 0; n < 40; n++){ const a = (n + HS(n * 3.3 + f * 7) * .7) / 40 * 6.283, wd = .006 + HS(n * 5.7 + f) * .012, q0 = r0 * (f ? 1.1 : .9) * (1 + HS(n * 2.1 + f * 3) * .6);
      k.beginPath(); k.moveTo(fx + Math.cos(a) * q0, fy + Math.sin(a) * q0); k.lineTo(fx + Math.cos(a - wd) * R, fy + Math.sin(a - wd) * R); k.lineTo(fx + Math.cos(a + wd) * R, fy + Math.sin(a + wd) * R); k.fill(); }
    const d = k.getImageData(0, 0, cw, ch); for(let q = 3; q < d.data.length; q += 4) d.data[q] = d.data[q] > 100 ? 255 : 0; k.putImageData(d, 0, 0); return c; }); }
// a count: the huge chrome numeral slams in centre screen over a red sash; the hanko seal stamps beside it with READY under it
function cdCount(k, u, t, cw, ch, narrow){ const g = cdDigit(3 - k, cw, ch), S = Math.round(narrow ? cw * .2 : ch * .2), seal = cdSeal(k, S), gap = narrow ? 4 : 8;
  const gw = S + gap + g.w, gx = Math.round(cw / 2 - gw / 2), dx = gx + S + gap, cy = Math.round(ch * (narrow ? .56 : .5)), dy = cy - Math.round(g.h / 2), fx = dx + g.w / 2;
  let alpha = 1; if(reduce) alpha = step(clamp(u / .25, 0, 1), 3); if(alpha <= 0) return; cx.globalAlpha = alpha;
  // the sash: a full-width band through the numeral's middle (enters from the right on the first count)
  let bx = -10; if(!reduce && t < CD_0 + .16) bx = Math.round(lerp(cw + 8, -10, step((t - CD_0 + .16) / .16, 5)));
  const bh = Math.round(g.h * .4), by = cy - Math.round(bh / 2), bw = cw + 40 - bx;
  cx.fillStyle = CD_R; slab(bx + 3, by - 4, bw, 2); cx.fillStyle = dark(CD_R, .35); slab(bx + 1, by - 1, bw, 1);
  cx.fillStyle = 'rgba(7,6,12,.86)'; slab(bx, by, bw, bh); cx.fillStyle = '#4ff0ff'; slab(bx - 1, by + bh + 1, bw, 2); cx.fillStyle = CD_R; slab(bx - 2, by + bh + 4, bw, 1);
  const H0 = .08;
  if(!reduce && u >= H0 && u < H0 + .18){ cx.globalAlpha = u < H0 + .06 ? .45 : .22; cx.drawImage(cdFocus(cw, ch, fx, cy, g.h * .55)[u < H0 + .06 ? 0 : 1], 0, 0); cx.globalAlpha = alpha; }
  const sc = reduce ? 1 : u < .04 ? 1.7 : u < H0 ? 1.25 : 1, white = !reduce && (u < .04 || (u >= H0 && u < H0 + .05)), w = Math.round(g.w * sc), h = Math.round(g.h * sc);
  if(u < .04 && !reduce) cx.globalAlpha = alpha * .45; cx.drawImage(white ? g.white : g.c, Math.round(fx - w / 2), Math.round(cy - h / 2), w, h); cx.globalAlpha = alpha;
  if(!reduce && u >= H0 && u < H0 + .45) ink(u - H0, { i:k, col:CD_R, kcx:fx, kcy:cy, kj:{ w:g.w, h:g.h } });
  if(!reduce) cdGlint(g, Math.round(fx - g.w / 2) + 2, dy + 2, u - .2);
  if(reduce || u >= .12){ const ss = !reduce && u < .15 ? 1.35 : 1, sw = Math.round(S * ss), sx = gx + Math.round((S - sw) / 2), sy = dy + Math.round(g.h * .12) + Math.round((S - sw) / 2);
    cx.drawImage(seal, sx, sy, sw, sw); if(reduce || u >= .16){ const tg = cd.tags[0]; cx.drawImage(tg, gx + Math.round((S - tg.width) / 2), dy + Math.round(g.h * .12) + S + 4); } }
  cx.globalAlpha = 1; }
// GO: 走れ GO! on the arrival card (the frame that was approved), its slab tall enough to hold the kanji on a phone
function cdCard(k, u, t, cw, ch){ const o = cardFor(CD_L[k], 90), kj = o.kj, by = o.by, bh = o.bh, col = CD_G;
  let alpha = 1; if(reduce){ alpha = step(clamp(u / .25, 0, 1), 3); if(t > CD_END - .3) alpha = Math.min(alpha, 1 - step((t - (CD_END - .3)) / .3, 3)); }
  let bx = -10; if(!reduce && t > CD_END - .3) bx = Math.round(lerp(-10, cw + 40, step((t - (CD_END - .3)) / .28, 6)));
  if(alpha <= 0) return; cx.globalAlpha = alpha;
  const bw = cw + 40 - bx; cx.fillStyle = col; slab(bx + 3, by - 4, bw, 2); cx.fillStyle = dark(col, .35); slab(bx + 1, by - 1, bw, 1);
  cx.fillStyle = 'rgba(7,6,12,.86)'; slab(bx, by, bw, bh); cx.fillStyle = CD_R; slab(bx - 1, by + bh + 1, bw, 2); cx.fillStyle = col; slab(bx - 2, by + bh + 4, bw, 1);
  const out = !reduce && t > CD_END - .3; if(out){ cx.save(); clipRight(bx - 2, by + bh, 0, ch); }
  const H0 = .08;
  if(!reduce && u >= H0 && u < H0 + .18){ cx.globalAlpha = u < H0 + .06 ? .45 : .22; cx.drawImage(o.focus[u < H0 + .06 ? 0 : 1], 0, 0); cx.globalAlpha = alpha; }
  const sp = reduce ? 1 : step((u - H0 + .02) / .1, 5), sw = Math.round(kj.w * sp); if(sw > 0) cx.drawImage(kj.swash, 0, 0, sw, kj.h, o.kx, o.ky, sw, kj.h);
  const sc = reduce ? 1 : u < .04 ? 1.6 : u < H0 ? 1.2 : 1, white = !reduce && (u < .04 || (u >= H0 && u < H0 + .05)), img = white ? kj.white : kj.c, w = kj.w * sc, h = kj.h * sc, jx = !reduce && u >= H0 && u < H0 + .1 ? (Math.floor(u * 60) % 2 ? 1 : -1) : 0;
  if(u < .04 && !reduce) cx.globalAlpha = alpha * .45; cx.drawImage(img, Math.round(o.kcx - (kj.gx + kj.gw / 2) * sc) + jx, Math.round(o.kcy - h / 2), Math.round(w), Math.round(h)); cx.globalAlpha = alpha;
  if(!reduce && u >= H0 && u < H0 + .45) ink(u - H0, o);
  const tag = cd.tags[1], nm = o.names[0], slide = reduce ? 0 : u < .1 ? Math.round((1 - step(u / .1, 4)) * 50) : u < .14 ? -3 : 0, ty = Math.round(o.by + (o.bh - (tag.height + 3 + nm.c.height)) / 2);
  cx.drawImage(tag, o.tx, ty); cx.drawImage(nm.c, o.tx + slide, ty + tag.height + 3); if(!reduce) glint(nm, o.tx + slide + 1, ty + tag.height + 4, u - .2);
  if(out) cx.restore(); cx.globalAlpha = 1; }
function drawCountdown(now){ cd.now = now; const t = (now - cd.t0) / 1000, cw = cx.canvas.width, ch = cx.canvas.height, narrow = cw < 260;
  if(!cd.tags) cd.tags = [boxLabel('READY', CREAM, CD_R), boxLabel('RIDE', INK, CD_G, CD_G)];
  const k = t >= CD_GO ? 3 : t >= CD_0 ? Math.min(2, Math.floor((t - CD_0) / CD_B)) : -1;
  if(k > cd.fired){ for(let q = cd.fired + 1; q <= k; q++) if(q === k || q === 3) cdSound(q); cd.fired = k;
    cd.hitAt = now;
    if(k === 3 && !cd.started){ cd.started = true; const go = cd.go; setTimeout(() => { try{ go(); if(!reduce) shake = Math.max(shake || 0, 10); if(window.COS) COS.horn(); }catch(e){ console.warn('countdown go', e); } }, 0); } }
  const jolt = !reduce && state === 'ready' && cd.hitAt && now - cd.hitAt > 80 && now - cd.hitAt < 200 ? (Math.floor(now / 33) % 2 ? 2 : -2) : 0;   // the hit's jolt (the game's shake only decays once the ride runs)
  cx.save(); cx.setTransform(1, 0, 0, 1, jolt, jolt ? 1 : 0); cx.imageSmoothingEnabled = false;
  if(t < CD_END) cdWash(t, cw, ch);
  if(!reduce && k === 3 && t - CD_GO < .1){ cx.fillStyle = CD_G; cx.globalAlpha = t - CD_GO < .05 ? .22 : .1; cx.fillRect(0, 0, cw, ch); cx.globalAlpha = 1; }   // GO: a flash of the 青 lamp's colour
  if(t < CD_END){ if(reduce && t > CD_END - .3) cx.globalAlpha = step((CD_END - t) / .3, 3); cdGantry(t, ch, cw, narrow); cx.globalAlpha = 1; }
  if(k === 3) cdCard(3, t - CD_GO, t, cw, ch); else if(k >= 0) cdCount(k, t - (CD_0 + k * CD_B), t, cw, ch, narrow);
  cx.restore();
  if(t > CD_END) cd = null; }

/* ---------- in-ride callouts: the arrival card's language at about a quarter of its size ----------
   MECH.arrival.callout(text, { kanji, sub, col, size:'s'|'m', hold }) - a mini slanted slab with tokko stripes, a hanko seal with the kanji,
   the words in chrome block letters tinted by the accent (boost tiers keep TIER_COL), an optional sub in the HUD's 3x5 type. It punches in
   (two-frame slam, a white impact frame, a flick of focus lines), a glint crosses it, and it squashes out; about 0.9-1.4 s. Reduced motion:
   a 3-step fade in and out. Several stack in slots under the HUD (lower while a big card is up), never over the bike or the letterbox; a
   fifth waits for a free slot. Each text is built once (per size and screen width) into one cached canvas - nothing is built mid-ride
   after the first show, and warm() pre-builds the game's common callouts. CJK runs are set in DotGothic16, Latin in the block face. */
const CO_KJ = { 'BOOST':'加速', 'BIG BOOST':'超加速', 'THUNDER':'雷', 'CLOSE':'危', 'SLICK':'油', 'BOOST PAD':'加速', 'LOST THEM':'撒', 'LOST THEM!':'撒', 'POLICE!':'警察',
  'BUMP':'衝', 'CLEAN LANDING':'着地', 'BIG AIR':'空', 'SHORTCUT':'近道', 'BIG AIR · SHORTCUT':'空', 'WOBBLE':'揺', 'COUNTER!':'返', 'KICKED':'蹴', 'SPIKES!':'針',
  'DODGED':'躱', 'SLIPPED THROUGH':'突破', 'SLIPSTREAM':'風', 'SLIPSTREAM!':'風', 'MATSURI!':'祭', 'SCORCHED':'焦' };
Object.assign(G7, { '0':['.XXXX.', 'XX..XX', 'XX.XXX', 'XXXXXX', 'XXX.XX', 'XX..XX', '.XXXX.'], '4':['XX..XX', 'XX..XX', 'XX..XX', 'XXXXXX', '....XX', '....XX', '....XX'],
  '5':['XXXXXX', 'XX....', 'XXXXX.', '....XX', '....XX', 'XX..XX', '.XXXX.'], '6':['.XXXX.', 'XX....', 'XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
  '7':['XXXXXX', '....XX', '...XX.', '..XX..', '..XX..', '..XX..', '..XX..'], '8':['.XXXX.', 'XX..XX', 'XX..XX', '.XXXX.', 'XX..XX', 'XX..XX', '.XXXX.'],
  '9':['.XXXX.', 'XX..XX', 'XX..XX', '.XXXXX', '....XX', '....XX', '.XXXX.'], '+':['......', '..XX..', '..XX..', 'XXXXXX', '..XX..', '..XX..', '......'],
  '-':['....', '....', '....', 'XXXX', '....', '....', '....'], '.':['..', '..', '..', '..', '..', 'XX', 'XX'], ',':['..', '..', '..', '..', 'XX', 'XX', 'X.'],
  ':':['..', 'XX', 'XX', '..', 'XX', 'XX', '..'], '·':['..', '..', '..', 'XX', 'XX', '..', '..'], "'":['XX', 'XX', 'X.', '..', '..', '..', '..'],
  '?':['.XXXX.', 'XX..XX', '....XX', '...XX.', '..XX..', '......', '..XX..'], '/':['....XX', '....XX', '...XX.', '..XX..', '.XX...', 'XX....', 'XX....'],
  '←':['...X...', '..XX...', '.XXXXXX', 'XXXXXXX', '.XXXXXX', '..XX...', '...X...'], '→':['...X...', '...XX..', 'XXXXXX.', 'XXXXXXX', 'XXXXXX.', '...XX..', '...X...'] });
/* Callouts, after Cowboy Bebop's title cards and eyecatches (Saul Bass / 60s jazz-poster kinetic type): a flat block of colour snaps in
   beside the rider's head, the word stamps out of it letter by letter on a swing rhythm (long-short, like a jazz hit) in condensed caps,
   with an offset duplicate in a second colour; the kanji is a small stamp in that second colour; the whole card leans off-kilter (a
   stepped shear, so the pixels stay hard). A beat of stillness, then a bar wipe takes it away (or the next callout's bar wipes it out).
   Nothing is allocated mid-ride. Every glyph lives in one fixed white atlas built at warm-up: the 3x5 face at 1x, 2x and 3x, and each
   DotGothic16 kanji/kana the game knows (an unknown one is drawn into a free atlas cell, never a new canvas). A callout is composed, the
   moment it is called, into one of four slot canvases allocated at warm-up (cards are only ever 'out', 'cur' and 'next', so one slot is
   always free): four sheared layers stacked in the slot - the block, the kanji stamp, the letters, and all three together. Colours are
   applied with source-atop on a scratch canvas, so any accent colour works without a per-colour cache. So a callout is whole on its
   first frame (no build queue, no half-built cards) and costs a few dozen drawImage calls once, when it is shown. */
const CJK_ADV = 16, CJK_H = 18;   // DotGothic16 at 16 px: a full-width advance, 18 rows with its descent
const AT = { c:null, k:null, lat:{}, cjk:new Map(), cx0:0, cy0:0, nx:0, ny:0, full:false };
// condensed caps: the HUD's 3x5 face scaled up (a few extra signs for callouts)
const F3X = { '·':'000000010000000', '?':'111001011000010', '&':'010101010101011', '(':'010100100100010', ')':'010001001001010' };
const F5X = { '←':['..1..', '.11..', '11111', '.11..', '..1..'], '→':['..1..', '..11.', '11111', '..11.', '..1..'] };   // 5x5 arrows
const LAT_CH = Object.keys(F3).concat(Object.keys(F3X), Object.keys(F5X)).filter(c => c !== ' '), latW = ch => F5X[ch] ? 5 : 3;
function atlasInit(){ if(AT.c) return; AT.c = mk(1024, 512); AT.k = AT.c.getContext('2d', { willReadFrequently:true }); AT.s = mk(18, 18); AT.sk = AT.s.getContext('2d', { willReadFrequently:true }); atlasLatin(); }   // AT.s: the glyph scratch cell
function atlasLatin(){ const k = AT.k; k.clearRect(0, 0, 1024, 512); k.fillStyle = '#fff'; let y = 0;
  for(const z of [1, 2, 3]){ let x = 0; for(const ch of LAT_CH){ AT.lat[ch + z] = [x, y];
      if(F5X[ch]) F5X[ch].forEach((r, j) => { for(let i = 0; i < 5; i++) if(r[i] === '1') k.fillRect(x + i * z, y + j * z, z, z); });
      else { const b = F3[ch] || F3X[ch]; for(let i = 0; i < 15; i++) if(b[i] === '1') k.fillRect(x + (i % 3) * z, y + ((i / 3) | 0) * z, z, z); }
      x += latW(ch) * z + 1; } y += 5 * z + 1; }
  AT.cy0 = y + 1; AT.nx = 0; AT.ny = 0; AT.cjk.clear(); AT.full = false; }
// one CJK glyph: drawn once into the next free 18 x 18 cell, thresholded to hard pixels (no canvas is created)
// DotGothic16 comes in unicode-range subsets that load on first use: a glyph drawn before its subset is there comes out blank (seen: BIG
// BOOST's 超加 missing). So a glyph whose subset is not loaded yet is drawn now and marked; its subset is fetched and the cell is redrawn,
// and any slot holding a card is re-composed on its next show
const FONT16 = '16px DotGothic16', fontOK = ch => { try{ return !document.fonts || document.fonts.check(FONT16, ch); }catch(e){ return true; } };
// rendered into a scratch cell first: a subset still loading (or failing, offline) renders nothing, and a blank render must never replace a
// good cell or reach a card (it showed as the stamp's solid block with no kanji: 延長 +15S, 港 DRAWBRIDGE!). g.blank: no ink yet.
function cjkCell(g, ch){ const sk = AT.sk; sk.clearRect(0, 0, 18, 18); sk.font = FONT16; sk.textBaseline = 'top'; sk.fillStyle = '#fff'; sk.fillText(ch, 0, 0);
  const adv = Math.max(1, Math.min(18, Math.round(sk.measureText(ch).width))), d = sk.getImageData(0, 0, 18, 18); let ink = 0;
  for(let i = 3; i < d.data.length; i += 4){ d.data[i] = d.data[i] > 110 ? 255 : 0; if(d.data[i]) ink++; }
  if(!ink && ch.trim()){ if(g.blank !== false) g.blank = true; return false; }   // keep the cell as it was
  AT.k.clearRect(g.x, g.y, 18, 18); AT.k.putImageData(d, g.x, g.y); g.adv = adv; g.blank = false; return true; }
let fontWait = '';   // characters whose subset is being fetched
function fontFetch(ch){ if(!document.fonts || fontWait.includes(ch)) return; fontWait += ch;
  document.fonts.load(FONT16, ch).then(() => { fontWait = fontWait.replace(ch, ''); const g = AT.cjk.get(ch); if(!g) return;
    if(cjkCell(g, ch)){ g.prov = false; for(const S of SLOTS) S.key = null; coRedo(ch); }   // only real ink re-composes a card
    else if((g.tries = (g.tries || 0) + 1) < 6) setTimeout(() => fontFetch(ch), 800); }).catch(() => { fontWait = fontWait.replace(ch, ''); }); }
function cjkGlyph(ch){ let g = AT.cjk.get(ch); if(g) return g; atlasInit(); if(AT.full) return null;
  const x = AT.nx * 18, y = AT.cy0 + AT.ny * 18; if(y + 18 > 512){ AT.full = true; return null; }
  g = { x, y, adv:CJK_ADV, prov:!fontOK(ch) }; cjkCell(g, ch); if(g.prov || g.blank) fontFetch(ch);
  AT.cjk.set(ch, g); if(++AT.nx >= 56){ AT.nx = 0; AT.ny++; } return g; }
const cjkWidth = s => { let w = 0; for(const ch of s){ const g = cjkGlyph(ch); w += g ? g.adv : CJK_ADV; } return w + 2; };   // as pixText measured a run: its advance plus 2
const isCJK = ch => /[぀-ヿ㐀-鿿！-｠]/.test(ch);
function coRuns(str){ const out = []; for(const ch of str){ const c = isCJK(ch); if(out.length && out[out.length - 1].cjk === c) out[out.length - 1].s += ch; else out.push({ cjk:c, s:ch }); } return out.filter(r => r.s.trim().length || r.cjk); }
const coWhiteish = col => { const [r, g, b] = hx(col); return r > 200 && g > 200 && b > 190; };
// the second colour (offset shadows, the kanji stamp, the exit wipe): warm accents get ink-blue, cool and white ones get a hot red-pink
function coSecond(col){ const [r, g, b] = hx(col); return coWhiteish(col) ? '#ff2a3a' : r > b + 30 ? '#1c2a6a' : '#ff3b6a'; }
const CO_SH = 14;   // the lean: the baseline rises one pixel every CO_SH pixels to the right
const coKey = (text, o) => 'co:' + text + '|' + (o.kanji || '') + '|' + (o.sub || '') + '|' + (o.col || CREAM) + '|' + (o.size || 's') + '|' + cx.canvas.width + (cx.canvas.height < 170 ? 's' : '');
// the slots (the card's four layers) and the scratch canvas (an unsheared layer at the top, a tint area under it)
// WK: the unsheared layer being built; WT: the tint area; WA: the three layers stacked (unsheared), sheared once into the slot's 'all' row.
// Three canvases so no canvas is ever drawn onto itself (a self-draw snapshots the whole canvas). WK.w: the width this card uses.
const SLOTS = [], WK = { c:null, k:null, w:640 }, WT = { c:null, k:null }, WA = { c:null, k:null }, WK_T = 128;
// all three are software canvases (willReadFrequently): composing is a few dozen small CPU blits, where GPU canvases paid a texture
// round trip per blit (5-16 ms a card, measured); a slot uploads to the GPU once, when its card is first drawn
function slotsInit(){ atlasInit(); for(const o of [WK, WT, WA]) if(!o.c){ o.c = mk(640, WK_T); o.k = o.c.getContext('2d', { willReadFrequently:true }); }
  while(SLOTS.length < 4){ const c = mk(640, 4 * 80); SLOTS.push({ c, k:c.getContext('2d', { willReadFrequently:true }), key:null }); }
  while(TSL.length < 4){ const c = mk(320, 5 * 24); TSL.push({ c, k:c.getContext('2d', { willReadFrequently:true }), key:null }); } }   // the ticker's slots
function fitCanvas(c, w, h){ if(c.width < w) c.width = w; if(c.height < h) c.height = h; }   // grows only (a wider screen): never a new canvas
// the layout of a callout: which glyphs where, at the largest scale that fits the screen (pure numbers)
function coLayout(text, o){ const cw = cx.canvas.width, col = o.col || CREAM;
  let str = String(text), kj = o.kanji; if(kj === undefined){ kj = CO_KJ[str.toUpperCase()] || (/^\+\d+S$/i.test(str) ? '延長' : null); const r = coRuns(str); if(!kj && r.length > 1 && r[0].cjk){ kj = r[0].s; str = str.slice(r[0].s.length).replace(/^[\s·]+/, ''); } }
  const kjAll = kj || '';   // the stamp's kanji even while it is left off (coRedo re-composes the card when the glyph arrives)
  if(kj && [...kj].some(ch => { if(!isCJK(ch)) return false; const g = cjkGlyph(ch); return !g || g.blank; })) kj = null;   // never a blank stamp block
  const sec = coSecond(col), max = cw - 8, runs = coRuns(str), z0 = o.size === 'm' ? (cx.canvas.height < 170 ? 2 : 3) : o.size === 'xs' ? 1 : 2, cfgs = [];
  // shrink to 2x, then drop the kanji, then wrap at 2x (two lines with the stamp, three without), and only then (last resort) 1x letters
  for(const c of [[z0, true], [2, true], [z0, false], [2, false], [2, true, 1], [2, false, 1], [1, false]]) if(c[0] <= z0 && !cfgs.some(d => d[0] === c[0] && d[1] === c[1] && d[2] === c[2])) cfgs.push(c);
  const stW = kj ? cjkWidth(kj) + 4 : 0, stH = CJK_H + 3; let lay = null;
  for(const [z, kOK, wrap] of cfgs){ const gap = z, toks = []; let tk = null, spBefore = false;
    // words: runs of 3x5 letters between spaces; each kanji run is a word of its own
    const end = () => { if(tk){ toks.push(tk); tk = null; } };
    for(const r of runs){ if(r.cjk){ end(); const w = cjkWidth(r.s); toks.push({ w, sp:spBefore, items:[{ dx:0, cjk:r.s, w, h:CJK_H }] }); spBefore = false; continue; }
      for(const ch of r.s.toUpperCase()){ if(ch === ' ' || !AT.lat[ch + z]){ end(); spBefore = true; continue; }
        if(!tk){ tk = { w:0, sp:spBefore, items:[] }; spBefore = false; } else tk.w += gap; const gw = latW(ch) * z; tk.items.push({ dx:tk.w, ch, z, w:gw, h:5 * z }); tk.w += gw; } end(); }
    const useK = !!kj && kOK, kw = useK ? stW - 3 : 0, padX = z + 2, padY = z, maxLine = wrap ? max - kw - 3 - padX * 2 - 1 - Math.ceil(max / CO_SH) : 1e9;
    const lines = [[]], lw = [0]; let x = 0;
    let last = null;   // the token placed last: a separator dot never ends or starts a wrapped line
    for(const t of toks){ const dot = t.items.length === 1 && t.items[0].ch === '·', ln = lines[lines.length - 1], sep = !ln.length ? 0 : t.sp ? 4 * z : gap;
      if(x && x + sep + t.w > maxLine){ if(last && last.dot){ ln.length = last.n; lw[lw.length - 1] = last.x; } if(dot){ last = null; continue; } lines.push([]); lw.push(0); x = 0; } else x += sep;
      last = { dot, n:lines[lines.length - 1].length, x:lw[lw.length - 1] };
      for(const it of t.items) lines[lines.length - 1].push(Object.assign({ x0:x + it.dx, x1:x + it.dx + it.w + 1, li:lines.length - 1 }, it)); x += t.w; lw[lw.length - 1] = x; }
    const spans = [].concat(...lines), nl = lines.length, tw = Math.max(1, ...lw) + 1, th = Math.max(5 * z, spans.some(s => s.cjk) ? CJK_H : 0) + 1;
    const barW = tw + padX * 2, barH = nl * th + (nl - 1) * z + padY * 2, W0 = kw + barW + 3, rise = Math.floor(W0 / CO_SH);
    lay = { z, spans, tw, th, nl, padX, padY, barW, barH, useK, kw, W0, rise };
    if(W0 <= max && nl <= (wrap ? (useK ? 2 : 3) : 1)) break; }   // wrapped: two lines with the stamp, or three without it
  const sub = o.sub ? String(o.sub).toUpperCase() : '', subCJK = [...sub].some(isCJK), subH = sub ? (subCJK ? CJK_H : 6) : 0;
  const H0 = Math.max(lay.barH + 3, lay.useK ? stH + 1 : 0) + (sub ? subH + 1 : 0), barY = lay.useK ? Math.max(0, Math.round((stH - lay.barH) / 2)) + 1 : 0;
  return Object.assign(lay, { col, sec, kj, kjAll, stW, stH, sub, subH, H0, barY, h:H0 + lay.rise }); }
// glyph runs drawn white into the scratch tint area, then coloured there with source-atop; returns nothing (the caller copies the area)
function wkGlyphs(list, col){ const k = WT.k, T = 0; k.clearRect(0, 0, WK.w, WK_T); k.globalCompositeOperation = 'source-over';
  for(const [x, y, s] of list){ if(s.cjk){ let gx = x; for(const ch of s.cjk){ const g = cjkGlyph(ch); if(g) k.drawImage(AT.c, g.x, g.y, 18, CJK_H, gx, T + y, 18, CJK_H); gx += g ? g.adv : CJK_ADV; } }
    else { const a = AT.lat[s.ch + s.z]; if(a) k.drawImage(AT.c, a[0], a[1], s.w, s.h, x, T + y, s.w, s.h); } }
  k.globalCompositeOperation = 'source-atop'; k.fillStyle = col; k.fillRect(0, 0, WK.w, WK_T); k.globalCompositeOperation = 'source-over'; }
const wkToLayer = (dx, dy) => WK.k.drawImage(WT.c, 0, 0, WK.w, WK_T, dx, dy, WK.w, WK_T);   // tint area -> the layer, offset
// a layer (src: WK, or WA for the stack) sheared into the slot at row y, one CO_SH-wide column at a time; WK layers also stack onto WA
function wkShear(S, L, y, src){ src = src || WK; if(src === WK) WA.k.drawImage(WK.c, 0, 0, L.W0, L.H0, 0, 0, L.W0, L.H0);
  for(let x = 0; x < L.W0; x += CO_SH){ const w = Math.min(CO_SH, L.W0 - x); S.k.drawImage(src.c, x, 0, w, L.H0, x, y + L.rise - Math.floor(x / CO_SH), w, L.H0); } }
const CO_OUTL = [[0, 1], [2, 1], [1, 0], [1, 2]];
function coCompose(text, o, S){ slotsInit(); const L = coLayout(text, o), h = L.h, key = coKey(text, o);
  if(S.key === key && S.b) return S.b;   // this slot still holds this card from an earlier show
  fitCanvas(S.c, L.W0 + 2, h * 5 + 2); for(const o of [WK, WT, WA]) fitCanvas(o.c, L.W0 + 4, Math.max(WK_T, L.H0)); WK.w = L.W0 + 4; const k = WK.k, wk = () => k.clearRect(0, 0, WK.w, WK_T);
  WA.k.clearRect(0, 0, WK.w, WK_T);
  S.k.clearRect(0, 0, L.W0 + 2, h * 4); const yBg = 0, ySt = h, yTx = 2 * h, yAll = 3 * h;
  // the block: a shadow offset in the second colour, the colour, a lit top edge
  wk(); k.fillStyle = L.sec; k.fillRect(L.kw + 3, L.barY + 3, L.barW, L.barH); k.fillStyle = L.col; k.fillRect(L.kw, L.barY, L.barW, L.barH);
  k.fillStyle = mixc(L.col, '#ffffff', .5); k.fillRect(L.kw, L.barY, L.barW, 1); wkShear(S, L, yBg);
  // the kanji stamp: a block of the second colour, the kanji in cream
  wk(); if(L.useK){ k.fillStyle = L.sec; k.fillRect(0, 0, L.stW, L.stH); wkGlyphs([[2, 2, { cjk:L.kj }]], CREAM); wkToLayer(0, 0); } wkShear(S, L, ySt);
  // the letters: the second-colour duplicate one pixel down-right, then ink; the sub under the block (ink shadow, cream face)
  wk(); const tx = L.kw + L.padX, ty = L.barY + L.padY, lineY = s => ty + s.li * (L.th + L.z), at = s => [tx + s.x0, lineY(s) + (L.th - 1 - s.h), s];
  const list = L.spans.map(at);
  wkGlyphs(list.filter(e => !e[2].cjk), L.sec); wkToLayer(1, 1); wkGlyphs(list, INK); wkToLayer(0, 0);   // (kanji keep no offset twin: their 1-px strokes would double into a blot)
  if(L.sub){ const sl = []; let x = L.kw + 2; const y = L.barY + L.barH + 3;
    for(const ch of L.sub){ if(isCJK(ch)){ const g = cjkGlyph(ch); sl.push([x, y, { cjk:ch }]); x += g ? g.adv : CJK_ADV; continue; }   // a kanji sub (脱出) in DotGothic16; Latin in the 3x5 face, on its baseline
      if(AT.lat[ch + 1]) sl.push([x, y + (L.subH > 6 ? 11 : 0), { ch, z:1, w:latW(ch), h:5 }]); x += latW(ch) + 1; }
    wkGlyphs(sl, INK); wkToLayer(1, 1); wkGlyphs(sl, CREAM); wkToLayer(0, 0); }
  wkShear(S, L, yTx); wkShear(S, L, yAll, WA);
  // the outlined card: the whole card's silhouette in ink, one pixel out on four sides, under the card (contrast on any road: Neon, snow)
  const yOut = 4 * h, w2 = L.W0 + 2, h2 = h + 2, sk = WK.k, tk = WT.k;
  sk.clearRect(0, 0, WK.w, WK_T); sk.drawImage(S.c, 0, yAll, L.W0, h, 1, 1, L.W0, h); sk.globalCompositeOperation = 'source-in'; sk.fillStyle = INK; sk.fillRect(0, 0, w2, h2); sk.globalCompositeOperation = 'source-over';
  tk.clearRect(0, 0, WK.w, WK_T); tk.drawImage(S.c, 0, yAll, L.W0, h, 1, 1, L.W0, h);
  S.k.clearRect(0, yOut, w2, h2); for(const [dx, dy] of CO_OUTL) S.k.drawImage(WK.c, 0, 0, w2, h2, dx - 1, yOut + dy - 1, w2, h2); S.k.drawImage(WT.c, 0, 0, w2, h2, 0, yOut, w2, h2);
  // spans: each letter's box [x0, x1, y0, y1] in the sheared letters layer (the reveal stamps them one by one)
  const b = { c:S.c, yBg, ySt, yTx, yAll, yOut, w:L.W0, h, rise:L.rise, sec:L.sec, col:L.col, kjs:L.kjAll || '', spans:L.spans.map(s => [tx + s.x0, tx + s.x1, lineY(s) - 1 + L.rise - Math.floor((tx + s.x1) / CO_SH), lineY(s) + L.th + 2 + L.rise - Math.floor((tx + s.x0) / CO_SH)]), kw:L.kw, barW:L.barW, barY:L.barY, barH:L.barH, useK:L.useK };
  S.key = key; S.b = b; return b; }
// every string the game shows through floatText / callout: their kanji and kana go into the atlas at warm-up
function coList(){ const L0 = [];
  for(const t of ['勝 Duel won', '負 They got away', '検問突破', '強風 · gusts from the sea →', '新幹線', '富士 · 夜明け', 'スライド SLIDE', '滑', '脱出', '勝負 ·', '延長']) L0.push(t);
  for(const k in CO_KJ) L0.push(CO_KJ[k]);
  if(typeof LANDS !== 'undefined') for(const L of LANDS) L0.push(L.kanji);
  return L0; }
function coWarm(){ try{ slotsInit(); for(const t of coList()) for(const ch of t) if(isCJK(ch)) cjkGlyph(ch); }catch(e){ console.warn('callout warm', e); } }
/* One slot on screen, no stacking. CO holds at most: the callout going out ('out'), the one showing ('cur') and the one waiting ('next').
   A new callout replaces the waiting one; the new card's bar wipes the showing one out and it stamps in on the same spot. Several in
   one frame: the most important stays (boost tier > landmark > clean landing > everything else). A higher-ranked callout is never cut
   before .4 s by a lower one. Reduced motion: a quick crossfade. */
let CO = [], coFrame = 0;
function coRank(text, o){ if(o.rank != null) return o.rank; const u = String(text).toUpperCase();
  if(typeof TIER_NAME !== 'undefined' && TIER_NAME.some((n, i) => i && n && String(n).toUpperCase() === u)) return 4;
  if(o.sub === 'LANDMARK JUMP' || (o.kanji && o.size === 'm')) return 3; if(/CLEAN LANDING/.test(u)) return 2; return 1; }
A.callout = (text, o) => { if(!cx || text == null || text === '') return false;
  { const SY = MECH.style; let fold = false; try{ fold = !!(SY && SY.hear && SY.hear(String(text), o)); }catch(e){ console.warn('style hear', e); } if(fold && (Q.enabled || narrowW() || TICK[String(text).toUpperCase()])) return true; }   // small acts (Close, Boost, Slipstream...) show in the style chain tab ("CLOSE x3"), never as a chip too, on any width (kodawari #8, W6); a folded card act (Big boost, Slide) keeps its card on a wide screen with quiet off
  { const tw = TICK[String(text).toUpperCase()]; if(tw){ try{ tickPush(tw, o, Q.classOf(text, o)); return true; }catch(e){ console.warn('ticker', e); } } }   // small frequent acts: the ticker under the HUD, not a card at the rider
  o = Object.assign({ size:'s' }, o || {});
  // the arbiter (MECH.quiet, below): the arrest shows nothing else; the quiet stretch announces only danger; a breath drops information
  const prio = Q.classOf(text, o); if(Q.enabled) if(state === 'pulled' || (prio < 3 && Q.quietOn()) || (prio < 2 && Q.breathOn())){ Q.dropped++; return true; }
  const rank = Q.enabled ? coRank(text, o) : prio * 10 + coRank(text, o), nx = CO.find(c => c.st === 'next');   // off: the class only ranks (escape > celebration > info), nothing waits
  if(nx && (Q.enabled ? (nx.prio > prio || (nx.prio === prio && nx.frame === coFrame && nx.rank > rank)) : nx.frame === coFrame && nx.rank > rank)){ Q.dropped++; return true; }   // a more important one is already waiting: this one is merged away
  if(nx) CO.splice(CO.indexOf(nx), 1);
  let b; try{ slotsInit(); const key = coKey(String(text), o), busy = new Set(CO.map(c => c.slot));
    const S = SLOTS.find(s => !busy.has(s) && s.key === key) || SLOTS.find(s => !busy.has(s)); b = coCompose(String(text), o, S);
    CO.push({ st:'next', text:String(text), o, key, b, slot:S, rank, prio, tq:Q.t, big:o.size === 'm', frame:coFrame, t0:null, life:(prio === 1 ? 1.3 : o.size === 'm' ? 1.0 : .85) + (coRank(text, o) >= 3 ? .25 : 0) + (+o.hold || 0) }); }
  catch(e){ console.warn('callout', e); return false; }
  return true; };   // reveal .15 s, then hold ~.7 s
A.calloutOn = () => CO.some(c => c.st === 'cur');
A.cardOn = () => !!(cd || (mom && mom.t0 != null) || (cur && cur.t0 != null));   // a big card (countdown, moment or arrival) is up

/* ---------- the ticker: small, frequent acts, up and out of the way (Kellan: "the close / bump popups are too distracting, move them up") ----------
   References: Burnout 3 moved near-miss feedback off the HUD text into the boost bar and a sound; Tony Hawk's trick string is small type at
   the screen's edge; PGR's Kudos sum many small acts into one combo. So the small class is a compact ticker in the sky under the HUD (on a
   phone, right under the style tab: score feedback beside the score; on a wide screen, the top-left sky beside the road tag): the HUD's 3x5 face at
   1x on a small flat plate (W6), one chip on a phone and two on a wide screen, newest on top, 0.9 s each, stepping out over the last .2 s; one pixel of
   slide on its first frame, no slam, no flash. It never crosses the road or the rider. The big class (big boost, thunder, landmarks, escapes,
   police) stays a card at the rider. Words are short, in the style tab's vocabulary. Composed into its own slots made at warm-up. */
const TICK = { 'CLOSE':'NEAR MISS', 'BUMP':'SCRAPE', 'SCRAPE':'SCRAPE', 'BOOST':'BOOST', 'BOOST PAD':'PAD BOOST', 'SLIPSTREAM':'DRAFT', 'SLIPSTREAM!':'SLINGSHOT',
  'CLEAN LANDING':'CLEAN LANDING', 'DODGED':'DODGE', 'SLID PAST':'SLID PAST', 'WOBBLE':'WOBBLE', 'KICKED':'KICKED', 'COUNTER!':'COUNTER', '+15S':'+15 SEC',
  'SPIKES!':'SPIKES', 'BIG AIR':'BIG AIR', 'SHORTCUT':'SHORTCUT', 'BIG AIR · SHORTCUT':'BIG AIR + SHORTCUT', 'COVERED':'COVERED', '← SLICK':'← SLICK',
  'SLICK →':'SLICK →', 'MATSURI!':'MATSURI', 'SCORCHED':'SCORCHED', 'SLIPPED THROUGH':'SLIPPED THROUGH' };
const TSL = [], TK = [], TK_LIFE = .9, TK_OUT = .2, narrowW = () => typeof W === 'number' && W < 640;   // narrowW: the HUD's phone layout (env/hud.js)
// one message at a time (Kellan's quiet HUD; kodawari #8, W6): the chain tab says every style act, so only words it does not say reach
// here (a scrape, a wobble, +15 SEC...); one of each (the same word again re-arms its chip), at most one chip on a phone and two on a wide
// screen, and none while a big card (the road card, a moment) or the director's hazard band is up: that card is the message
const tkCap = () => narrowW() ? 1 : 2, tkHold = () => A.cardOn() || dirBand();
const TK_PLATE = 'rgba(7,6,12,.86)', TK_SHADOW = '#000';   // env/hud.js's plate and its letters' drop pixel
// a chip in the HUD's own face, flat on the pixel grid (no lean: sheared 1x letters broke S into a $): the 3x5 letters at 1x with a black
// drop pixel under each (hud.js txt()), on a dark plate with a one-pixel edge in the word's colour, dimmed, and a cut top-right corner (hud.js
// plate()). Composed once into a ticker slot when pushed; the same word and colour reuse the slot as it is.
function tkGlyph(k, ch, x, y){ const b5 = F5X[ch]; if(b5){ for(let j = 0; j < 5; j++) for(let i = 0; i < 5; i++) if(b5[j][i] === '1') k.fillRect(x + i, y + j, 1, 1); return; }
  const b = F3[ch] || F3X[ch]; if(b) for(let i = 0; i < 15; i++) if(b[i] === '1') k.fillRect(x + i % 3, y + ((i / 3) | 0), 1, 1); }
function tkCompose(word, col, S){ const key = 'tk:' + word + '|' + col; if(S.key === key && S.b) return S.b;
  let tw = 0; for(const ch of word) tw += ch === ' ' ? 4 : latW(ch) + 1;
  const w = tw + 4, h = 9, cut = 2, k = S.k; fitCanvas(S.c, w, h); k.clearRect(0, 0, w + 2, h + 2);   // edge, a pixel of air, letters (+1 drop), air, edge
  k.fillStyle = TK_PLATE; for(let r = 0; r < h; r++) k.fillRect(0, r, w - Math.max(0, cut - r), 1);
  k.fillStyle = mixc(col, INK, .45); k.fillRect(0, h - 1, w, 1); k.fillRect(0, 0, w - cut, 1); k.fillRect(0, 0, 1, h); k.fillRect(w - 1, cut, 1, h - cut);
  for(let i = 0; i < cut; i++) k.fillRect(w - cut + i, i, 1, 1);
  for(const [c, o] of [[TK_SHADOW, 1], [col, 0]]){ k.fillStyle = c; let x = 2; for(const ch of word){ if(ch !== ' ') tkGlyph(k, ch, x + o, 2 + o); x += ch === ' ' ? 4 : latW(ch) + 1; } }
  S.key = key; S.b = { c:S.c, w, h }; return S.b; }
function tickPush(word, o, pr){ if(tkHold()) return; slotsInit(); const col = (o && o.col) || CREAM; pr = pr || 2;
  for(let i = TK.length - 1; i >= 0; i--) if(TK[i].word === word) TK.splice(i, 1);   // the same word twice: one chip, re-armed
  // full: the least urgent goes, the oldest of those (its slot is free again); a danger chip (SCRAPE) is never pushed out by information (+15 SEC)
  while(TK.length >= tkCap()){ let v = TK.length - 1; for(let i = v - 1; i >= 0; i--) if(TK[i].pr < TK[v].pr) v = i; if(TK[v].pr > pr) return; TK.splice(v, 1); }
  const key = 'tk:' + word + '|' + col, busy = new Set(TK.map(e => e.slot)), S = TSL.find(x => !busy.has(x) && x.key === key) || TSL.find(x => !busy.has(x));
  const b = tkCompose(word, col, S); TK.unshift({ word, b, slot:S, t0:null, pr }); }
function drawTicker(now){ if(!TK.length) return; if(tkHold()){ TK.length = 0; return; }
  const cw = cx.canvas.width, ch = cx.canvas.height; skyY(cw, ch); const L = SKY.L; if(!L) return;
  // a phone (kodawari #8): beside the chain tab, so the chip never stacks down toward the road; wide: the top-left sky
  const x0 = L.narrow ? L.chain.x + L.chain.w + 2 : L.speed.x + Math.ceil(64 / L.sx), cap = L.narrow ? 1 : 2; let y = L.narrow ? L.chain.y : L.freeY + 1;
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
  for(let i = 0; i < TK.length; i++){ const e = TK[i], b = e.b; if(e.t0 == null) e.t0 = now; const t = (now - e.t0) / 1000;
    if(t > TK_LIFE || i >= cap){ TK.splice(i--, 1); continue; }   // (cap: a phone turned narrow keeps the newest only)
    const a = t > TK_LIFE - TK_OUT ? (t > TK_LIFE - TK_OUT / 2 ? 1 / 3 : 2 / 3) : 1, ox = !reduce && t < .034 ? -2 : 0;
    const xx = L.narrow ? Math.min(x0, cw - b.w - 3) : x0;
    cx.globalAlpha = a; cx.drawImage(b.c, 0, 0, b.w, b.h, xx + ox, y, b.w, b.h); y += b.h + 1; }
  cx.globalAlpha = 1; cx.restore(); }
A._tk = () => TK;

/* ---------- the message arbiter: STABLE API (other modules depend on it; keep these signatures) ----------
   Priority classes:  3 = DANGER (police cues, spikes, slicks, crashes)  >  2 = CELEBRATION (default)  >  1 = INFORMATION
   MECH.arrival.callout(text, { prio, kanji, sub, col, size:'s'|'m', hold })  -> true (shown, queued, folded or dropped by the arbiter)
       prio is optional (guessed from the text when missing: Q.classOf). A lower class waits for the screen (danger 2.5 s, celebration
       1.2 s, information .8 s), then is dropped. A higher class replaces a lower one at once; danger never replaces danger, it waits.
       floatText(txt, x, y, size, col) routes here too (class guessed).
   MECH.quiet.claim(prio, seconds) -> boolean   before drawing your OWN screen card: false = do not show it; true = the callouts wait for it
   MECH.quiet.busy() -> boolean                 something is on screen being announced (callout, card, cut-in, claimed card)
   MECH.quiet.quietOn() / .breathOn()           the director's quiet stretch (only danger) / the breath after a hero moment (no cards, no info)
   MECH.quiet.breathe(seconds)                  start (or extend) a breath
   MECH.quiet.classOf(text, o) -> 1|2|3          the class the arbiter would give this message
   MECH.quiet.clipRoad(g) -> false              (kept for old callers) a no-op: nothing is ever cut by the road; cards lift instead
   MECH.quiet.roadTop() / .liftFor(top, bottom) the road's top row (canvas px) / how far (<= 0) to lift a card spanning top..bottom above it
   MECH.quiet.dropped                           count of messages dropped (tests)
   ---------- the message arbiter (MECH.quiet): "quiet the screen" (research/sundown-craft/quiet.md) ----------
   1. One message at a time. Every callout, card and cut-in goes through here, by class: 3 danger (police, spikes, slicks, scrapes,
      crashes) beats 2 celebration (boosts, landmarks, escapes, set-piece names) beats 1 information (+15s, fork picks, "they got away").
      A lower class waits for the screen (danger up to 2.5 s, celebration 1.2 s, information .8 s), then is dropped. Nothing shows during a
      cut-in (ui/cutin.js) or the arrest. A danger callout makes a big card retract early; a card waits for a callout, a callout for a card.
      Set pieces that draw their own small card (kaiju.js, rail.js) ask first with Q.claim(class, seconds).
   2. Nothing covers the road ahead: callouts sit in the sky under the HUD, not over the rider's head, and every overlay (cards,
      callouts, cut-ins) lifts above the road window, the road surface from the bike to 1.5 s ahead (Q.liftFor); drawn whole, never cut.
   3. Breathing room: after a hero moment (Q.breathe, from ui/cutin.js and mech/director.js) no card and no information for ~32 s; in the
      director's quiet stretch (MECH.director.quietOn()) nothing but danger is announced at all. */
// THE SWITCH. Kellan, 2026-11-19: "turn off the quiet UI feature; I think it is causing issues with the cards and events". Off: the
// arbiter never drops or holds anything (claim() always grants), callouts replace each other as they did before it (newest wins, a
// more important one is not wiped in its first .4 s), no quiet stretches or breathing room (mech/director.js), no card is skipped for
// quiet or breath (ui/cutin.js), and the HUD defaults to always on. Kept either way: callouts in the sky slot, cards lifted above the road
// and never clipped, whole first frames. Set true to bring the whole system back.
const QUIET_ON = false;
const Q = MECH.quiet = { enabled:QUIET_ON, t:0, breathUntil:0, ext:null, dropped:0 };
const QTTL = [0, .8, 1.2, 2.5];   // seconds a waiting message may wait, by class
const Q_DANGER = /^(POLICE|STOP|PULL OVER|BACKUP|SPIKES|SLOW DOWN|SCORCHED|BUMP|SCRAPE|WOBBLE|KICKED|MATSURI!)|SLICK|強風/, Q_INFO = /^\+\d+S$|^負 |^REJOINED|^COVERED|^新幹線|^RACE IT|^富士|^←|→$/;   // mech/crew.js: COVERED is information, the crew's arrival and takedowns celebrate
Q.classOf = (text, o) => { if(o && o.prio) return o.prio; const u = String(text).toUpperCase(); if(o && /PATROL CAR|HELI PA/.test(o.sub || '')) return 3; return Q_DANGER.test(u) ? 3 : Q_INFO.test(u) ? 1 : 2; };
const cutinOn = () => !!(MECH.cutin && MECH.cutin.on && MECH.cutin.on());
const dirBand = () => { try{ return !!(MECH.director && MECH.director.cardOn && MECH.director.cardOn()); }catch(e){ return false; } };   // mech/director.js's hazard band is up (kodawari #11)
const extOn = () => !!Q.ext && Q.t < Q.ext.until;
const coCur = () => { for(const c of CO) if(c.st === 'cur') return c; return null; };
Q.quietOn = () => Q.enabled && !!(MECH.director && MECH.director.quietOn && MECH.director.quietOn());
Q.breathOn = () => Q.enabled && Q.t < Q.breathUntil;
Q.breathe = s => { if(!Q.enabled) return; Q.breathUntil = Math.max(Q.breathUntil, Q.t + (s || 32)); };
// a set piece's own screen card: granted (true) only when nothing of its class or higher is up; the callouts then wait for it
Q.claim = (prio, secs) => { if(!Q.enabled) return true; prio = prio || 2; if(state === 'pulled' || cutinOn() || (prio < 3 && (A.cardOn() || Q.quietOn()))) return false;
  if(prio >= 3 && MECH.director && MECH.director.endQuiet) MECH.director.endQuiet();
  const c = coCur(); if((c && c.prio > prio) || (extOn() && Q.ext.prio > prio)) return false; Q.ext = { prio, until:Q.t + (secs || 2) }; return true; };
Q.busy = () => cutinOn() || A.cardOn() || !!coCur() || extOn();   // something is being announced (env/hud.js stays lit meanwhile)
// the road window: the road surface from the bike to 1.5 s ahead (25 segments at least), in canvas pixels, added to g's current path
const RWI = new Int16Array(260);
Q.roadWin = g => { if(typeof segs === 'undefined' || !segs.length || typeof position !== 'number') return false;
  const ps = Math.floor((position + PZ) / SEG), n1 = Math.min(250, Math.max(25, Math.round(speed * 1.5 / SEG))); let k = 0, py = 1e9;
  for(let n = 1; n <= n1; n++){ const sg = segs[ps + n]; if(!sg || !sg.p1 || !sg.p1.screen) break; const y = sg.p1.screen.y; if(y < py){ RWI[k++] = n; py = y; } }
  if(k < 2) return false; const ch = cx.canvas.height, sx = s => s.p1.screen, top = Math.floor(py / PX) - 3;
  let s = sx(segs[ps + RWI[0]]); g.moveTo(Math.floor((s.x - s.w) / PX) - 2, ch + 2);
  for(let i = 0; i < k; i++){ s = sx(segs[ps + RWI[i]]); g.lineTo(Math.floor((s.x - s.w) / PX) - 2, i === k - 1 ? top : Math.floor(s.y / PX)); }
  for(let i = k - 1; i >= 0; i--){ s = sx(segs[ps + RWI[i]]); g.lineTo(Math.ceil((s.x + s.w) / PX) + 2, i === k - 1 ? top : Math.floor(s.y / PX)); }
  s = sx(segs[ps + RWI[0]]); g.lineTo(Math.ceil((s.x + s.w) / PX) + 2, ch + 2); g.closePath(); return true; };
// clip g (identity transform, canvas pixels) to everything but the road window; the caller saves and restores
// Cards and callouts are never cut by the road shape any more (a cut read as the title sitting BEHIND the road: the user saw it on the
// Shinkansen card). clipRoad stays as a no-op so existing callers keep working; cards lift instead (Q.liftFor), and draw whole.
Q.clipRoad = g => false;
// the top row of the road window (canvas px): the road surface from the bike to 1.5 s ahead, from the live projection (crests raise it)
Q.roadTop = () => { if(typeof segs === 'undefined' || !segs.length || typeof position !== 'number' || state !== 'play') return 1e9;
  const ps = Math.floor((position + PZ) / SEG), n1 = Math.min(250, Math.max(25, Math.round(speed * 1.5 / SEG))); let py = 1e9;
  for(let n = 1; n <= n1; n++){ const sg = segs[ps + n]; if(!sg || !sg.p1 || !sg.p1.screen) break; const y = sg.p1.screen.y; if(y < py) py = y; }
  return py >= 1e9 ? 1e9 : Math.floor(py / PX); };
// how far (canvas px, <= 0) to lift a card spanning rows top..bottom so it sits above the road, never above the HUD's first free row; if it
// can't fit (a steep crest, a phone in portrait) it lifts as far as it can and is drawn whole, overlapping the top of the road a little
Q.liftFor = (top, bottom) => { const rt = Q.roadTop() - 3; if(bottom <= rt) return 0; const cw = cx.canvas.width, ch = cx.canvas.height, room = Math.max(0, top - (skyY(cw, ch) - 3));
  return -Math.min(bottom - rt, room); };
let qLast = 0;
const coClock = now => state === 'play' && typeof playT === 'number' ? playT * 1000 : now;   // ms: game time while riding, else the frame clock
function qTick(now){ now = coClock(now); const d = qLast ? (now - qLast) / 1000 : 0; qLast = now; Q.t += clamp(d, 0, .1); if(Q.ext && Q.t >= Q.ext.until) Q.ext = null; }   // game-ish time: a paused frame adds at most .1 s
// the sky slot for callouts: centred under the top HUD (env/hud.js freeY), cached per canvas size
const SKY = { cw:0, ch:0, y:0, n:0, L:null };
function skyY(cw, ch){ if(SKY.cw !== cw || SKY.ch !== ch || (SKY.n++ & 63) === 0){ const L = ENV.hud && ENV.hud.layout ? ENV.hud.layout() : null; SKY.cw = cw; SKY.ch = ch; SKY.L = L; SKY.y = L ? L.freeY + 3 : Math.round(ch * .16); } return SKY.y; }
// a glyph's font subset arrived: a card on screen (or waiting) that uses it is composed again in its own slot, so it never stays blank
function coRedo(ch){ for(const c of CO) if(c.st !== 'out' && (c.text + (c.o.kanji || '') + (c.o.sub || '') + (CO_KJ[c.text.toUpperCase()] || '') + ((c.b && c.b.kjs) || '')).includes(ch)){ try{ c.b = coCompose(c.text, c.o, c.slot); }catch(e){} } }
// set pieces warm their own strings with this: their kanji and kana go into the glyph atlas now (the card itself costs nothing to build later)
A.prebuild = (text, o) => { if(text == null) return false; o = o || {}; try{ for(const s of [String(text), o.kanji || '', o.sub || '']) for(const ch of s) if(isCJK(ch)) cjkGlyph(ch); return true; }catch(e){ console.warn('prebuild', e); return false; } };
const CO_OUT = .1, CO_IN = .15;   // the exit wipe; the whole reveal (bar, stamp, letters)
// where the rider's head is (backing pixels): the bike stands on H - 8, lifted by AIR.h, the rider's helmet top 28 sprite-pixels up,
// tilted by the lean and stretched by a wheelie (the same maths sundown.html's draw() uses for the bike)
function coHead(){ const bs = Math.min(W * .2, H * .27), k = Math.max(PX, Math.round(bs / 30 / PX) * PX), lean = typeof leanV === 'number' ? leanV : 0, air = typeof AIR !== 'undefined' ? AIR.h || 0 : 0;
  const pitch = typeof POSE !== 'undefined' ? POSE.pitch || 0 : 0, up = 30 * k;   // helmet top plus a little room
  let x = W / 2 + Math.sin(lean) * up, y = H - 8 - air - Math.cos(lean) * up; if(pitch > .01) y = (H - 8) + (y - (H - 8)) * (1 + pitch * .22);
  return { x:x / PX, y:y / PX }; }
const CO_POS = { x:null, y:null, last:0 }; A._coPos = CO_POS; A._coHead = () => coHead(); A._co = () => CO;
function drawCallouts(now){ if(!CO.length) return; now = coClock(now); const cw = cx.canvas.width, ch = cx.canvas.height;
  let cu = CO.find(c => c.st === 'cur'), ou = CO.find(c => c.st === 'out'), nx = CO.find(c => c.st === 'next');
  // the arbiter: a cut-in, a big card, a set piece's own card or the arrest holds the screen; a danger callout may stay over a card
  const cut = cutinOn(), hold = Q.enabled ? (state === 'pulled' || cut || extOn() || A.cardOn() || dirBand()) : (cut || A.cardOn() || dirBand());   // one message at a time: a cut-in, a big card or the director's hazard band holds a callout (quiet off: it shows the moment the card ends, or is dropped once stale)
  if(nx && Q.enabled && Q.t - nx.tq > QTTL[nx.prio]){ CO.splice(CO.indexOf(nx), 1); nx = null; Q.dropped++; }   // waited too long for the screen: dropped
  if(cu && (now - cu.t0) / 1000 > cu.life){ cu.st = 'out'; cu.tOut = now; if(ou) CO.splice(CO.indexOf(ou), 1); ou = cu; cu = null; }
  if(cu && hold && !(cu.prio >= 3 && !cut && state !== 'pulled' && !extOn() && !dirBand())){ cu.st = 'out'; cu.tOut = now; if(ou) CO.splice(CO.indexOf(ou), 1); ou = cu; cu = null; }
  if(nx && cu && (Q.enabled ? (nx.prio > cu.prio || (nx.prio === cu.prio && nx.prio < 3 && !(cu.rank > nx.rank && (now - cu.t0) / 1000 < .4))) : !(cu.rank > nx.rank && (now - cu.t0) / 1000 < .4))){ cu.st = 'out'; cu.tOut = now; cu.by = true; if(ou) CO.splice(CO.indexOf(ou), 1); ou = cu; cu = null; }   // the new one's bar wipes the current one out
  if(ou && ((now - ou.tOut) / 1000 > (reduce ? .15 : CO_OUT) || ou.by)){ CO.splice(CO.indexOf(ou), 1); ou = null; }   // a replaced callout goes at once: the new one stamps in on its spot (never two messages crossfading)
  if(nx && hold && !Q.enabled && Q.t - nx.tq > QTTL[nx.prio]){ CO.splice(CO.indexOf(nx), 1); nx = null; }   // held behind a card too long: stale (it would name a moment already past)
  if(nx && !cu && !hold && CO.includes(nx)){ if(reduce && ou){ CO.splice(CO.indexOf(ou), 1); ou = null; } nx.st = 'cur'; nx.t0 = now; cu = nx; }   // reduced motion: the old one goes as the new one comes (never two at once)   // in the same spot, at once: its bar wipe is what takes the old one away
  if(!ou && !cu) return;
  // near the rider: centred on the rider's head across (a little lag), sitting just above the road's top row, so it reads with the action
  // but never covers the road ahead; never up into the HUD. (It rode over the helmet, on the road; then sat far up under the HUD.)
  const hd = coHead(), dtp = CO_POS.last ? clamp((now - CO_POS.last) / 1000, 0, .1) : 1; CO_POS.last = now;
  if(CO_POS.x === null || dtp >= .1 || CO_POS.cw !== cw){ CO_POS.cw = cw; CO_POS.x = hd.x; } else CO_POS.x += (hd.x - CO_POS.x) * (1 - Math.exp(-10 * dtp));
  const sy = skyY(cw, ch);
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
  for(const c of [ou, cu]){ if(!c) continue; const b = c.b, W2 = b.w + 2, H2 = b.h + 2;
    const x = Math.round(clamp(CO_POS.x - b.w / 2, 3, cw - b.w - 3)), y = sy;   // kodawari #1: the sky band under the HUD, never over the road ahead (it sat just above the road's top row: centre screen, on the riding line)
    if(c.st === 'out'){ const p = Math.min(1, (now - c.tOut) / 1000 / (reduce ? .15 : CO_OUT));
      // the exit (kodawari #1): the whole composed card steps out in two whole-card fades and a one-pixel rise along its slant, so no frame
      // ever shows a clipped word or a stamp block without its glyph (the old left-to-right bar wipe was caught as AXIWAY JUMP! in 1 still in 5)
      const q = Math.min(2, Math.floor(p * 3)); if(q >= 2 && !reduce) continue;
      cx.globalAlpha = reduce ? 1 - step(p, 3) : q ? 1 / 3 : 2 / 3; cx.drawImage(b.c, 0, b.yOut, W2, H2, x - 1 + (reduce ? 0 : q), y - 1 - (reduce ? 0 : q), W2, H2); cx.globalAlpha = 1;
      continue; }
    const t = (now - c.t0) / 1000;
    // the stamp-in, whole from frame 1: it lands along its slant (+5, -2), overshoots a pixel back, settles; the first frame flashes light
    // (an impact frame) and the kanji stamp slams down from 1.25x. Reduced motion: a quick two-step fade, no slide, no flash.
    if(reduce){ cx.globalAlpha = t < .05 ? 2 / 3 : 1; cx.drawImage(b.c, 0, b.yOut, W2, H2, x - 1, y - 1, W2, H2); cx.globalAlpha = 1; continue; }
    const ox = t < .034 ? 5 : t < .067 ? -1 : 0, oy = t < .034 ? -2 : t < .067 ? 1 : 0;
    cx.drawImage(b.c, 0, b.yOut, W2, H2, x - 1 + ox, y - 1 + oy, W2, H2);
    if(t < .034){ cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .4; cx.drawImage(b.c, 0, b.yAll, b.w, b.h, x + ox, y + oy, b.w, b.h); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
    if(b.useK && t < .05){ const sw = Math.round((b.kw + 3) * 1.25), sh = Math.round(b.h * 1.25); cx.drawImage(b.c, 0, b.ySt, b.kw + 3, b.h, x + ox - (sw - b.kw - 3), y + oy - Math.round((sh - b.h) / 2), sw, sh); } }   // it grows to the left, never over the word
  cx.restore(); }

// the slab: rows of hard pixels, its left end cut on the slant (one step per two rows)
function slab(x0, y, w, h, col){ for(let r = 0; r < h; r++){ const off = Math.floor((h - 1 - r) / 2); cx.fillRect(x0 + off, y + r, w, 1); } }
function clipRight(xEdge, yRef, y0, y1){ cx.beginPath(); for(let y = y0; y < y1; y += 2){ const off = Math.floor((yRef - y) / 2); cx.rect(xEdge + off, y, 9999, 2); } cx.clip(); }   // follows the slab's slanted end

A.drawScreen = now => { qTick(now);
  cardsScreen(now); try{ coFrame++; drawCallouts(now); drawTicker(coClock(now)); }catch(e){ console.warn('callouts', e); } };   // whole, never cut (cards lift above the road: Q.liftFor)
// a card retracts early (a danger callout is waiting): jump its clock to the retract
function cardOut(c, now, hold){ const tOut = reduce ? R_END + hold - .4 : T_OUT + hold; if((now - c.t0) / 1000 < tOut) c.t0 = now - tOut * 1000; }
function cardsScreen(now){
  if(cd){ drawCountdown(now); return; }
  const on = Q.enabled, cut = on && cutinOn(), danger = CO.some(c => c.prio >= 3 && c.st !== 'out') || (on && extOn() && Q.ext.prio >= 3), coUp = on && !!coCur(), band = dirBand();   // a danger callout retracts a card either way (one message at a time)
  if(mom && cut){ mom = null; }   // the cut-in is the moment's card: never both
  if(mom){ const t = (now - mom.t0) / 1000; if(danger && t >= 0) cardOut(mom, now, mom.hold); if(t > momLen(mom)) mom = null; else { drawCard(mom, (now - mom.t0) / 1000, T_OUT + mom.hold, T_END + mom.hold, R_END + mom.hold); return; } }
  if(cur && cur.t0 != null && cut){ if((now - cur.t0) / 1000 < T_TXT) cur.t0 = null; else cur = null; }   // a cut-in took the screen: a card just starting waits, one under way is dropped
  // an arrival waits for the screen: a beat after a moment card, a callout or a cut-in, and not in a breath after a hero moment; it is
  // dropped in the quiet stretch, or after waiting 8 s (the road tag on the HUD already names the road)
  if(cur && band){ if(cur.t0 == null || (now - cur.t0) / 1000 < T_TXT) cur = null; else cardOut(cur, now, 0); }   // kodawari #11: a hazard band is up. A card not yet begun is skipped (after the band come the hazards it announces; the HUD's road tag names the road); one under way retracts
  if(cur && cur.t0 == null){ if(Q.quietOn() || (Q.enabled && Q.t - (cur.w0 || 0) > 8)){ cur = null; Q.dropped++; } else if(!cut && !coUp && !danger && !extOn() && !Q.breathOn()){ cur.t0 = now + 100; cur.go(); } }
  if(cur && cur.t0 != null){ const t = (now - cur.t0) / 1000; if(danger && t >= 0) cardOut(cur, now, 0); if(t > (reduce ? R_END : T_END)) cur = null; else { drawCard(cur, (now - cur.t0) / 1000, T_OUT, T_END, R_END); return; } }
  if(momQ.length && !pol && !cut && !danger){ mom = momQ.shift(); mom.t0 = now + 100; } };
// one card: c = { L, i, tag, seal, ext, chip, shook, police }; t = seconds since it began; out/end: when it retracts and is gone (rEnd under reduced motion)
function drawCard(c, t, T_OUT, T_END, R_END){ const cur = c; if(t < 0) return;
  const o = cardFor(c.L, c.i), L = c.L, col = o.col, cw = o.cw, kj = o.kj, pol = !!c.police;
  if(o.cw !== cx.canvas.width) return;
  if(!pol && state === 'play') c.dy = Math.min(c.dy || 0, Q.liftFor(o.by - 6, o.by + o.bh + 7));   // above the road (it only ever moves up, so it never bobs)
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, pol ? 0 : c.dy || 0); cx.imageSmoothingEnabled = false;
  let alpha = 1, bx = o.bx;
  if(reduce){ alpha = t < .3 ? step(t / .3, 4) : t > R_END - .4 ? 1 - step((t - (R_END - .4)) / .4, 4) : 1; if(alpha <= 0 || t > R_END){ cx.restore(); return; } cx.globalAlpha = alpha; }
  else {
    // (kodawari #11, matching mech/director.js's band: no full-screen colour flash and no focus lines over the road; the slab carries the hit)
    if(t < T_IN) bx = Math.round(lerp(cw + 8, o.bx, step(t / T_IN, 5)));
    if(t > T_OUT) bx = Math.round(lerp(o.bx, cw + 40, step((t - T_OUT) / (T_END - T_OUT - .03), 6))); if(t > T_END){ cx.restore(); return; }
    if(!cur.shook && t >= T_HIT){ cur.shook = true; shake = Math.max(shake || 0, 7); } }
  const by = o.by, bh = o.bh, bw = cw + 40 - bx;
  // the slab: tokko-fuku stripes above and below, an ink body
  if(pol){ const ph = reduce ? 0 : Math.floor(performance.now() / 450) % 2, a = ph ? SIREN_B : SIREN_R, b = ph ? SIREN_R : SIREN_B;   // police: red and blue bars that trade places with the light bar
    cx.fillStyle = a; slab(bx + 3, by - 4, bw, 2); cx.fillStyle = b; slab(bx + 1, by - 1, bw, 1);
    cx.fillStyle = 'rgba(7,6,12,.88)'; slab(bx, by, bw, bh); cx.fillStyle = b; slab(bx - 1, by + bh + 1, bw, 2); cx.fillStyle = a; slab(bx - 2, by + bh + 4, bw, 1);
    cx.fillStyle = '#f0ecf4'; for(let x = bx + bh; x < cw; x += 8) cx.fillRect(x, by + bh + 1, 4, 2); }   // a chequer of white over the lower bar, like a patrol car's flank
  else { cx.fillStyle = col; slab(bx + 3, by - 4, bw, 2); cx.fillStyle = dark(col, .35); slab(bx + 1, by - 1, bw, 1);
    cx.fillStyle = 'rgba(7,6,12,.86)'; slab(bx, by, bw, bh); cx.fillStyle = RED; slab(bx - 1, by + bh + 1, bw, 2); cx.fillStyle = '#4ff0ff'; slab(bx - 2, by + bh + 4, bw, 1); }
  if(!reduce && t < T_IN + .12){ cx.fillStyle = '#fff'; for(let n = 0; n < 7; n++){ const y = by - 6 + Math.floor(HS(n * 3.1) * (bh + 14)), len = 12 + HS(n * 7.7) * 50; cx.fillRect(bx + 6 + Math.floor(HS(n * 1.3) * 20), y, len, 1); } }   // speed streaks behind the leading edge
  const inOut = !reduce && t > T_OUT;
  if(inOut){ cx.save(); clipRight(bx - 2, o.by + o.bh, 0, o.ch); }
  if(!reduce) flourish(L.key, t, o, true);
  // the kanji: slams down from big to its size, flashes white on impact
  const kx = o.kx, ky = o.ky;
  if(reduce || t >= T_HIT - .02){ const p = reduce ? 1 : step((t - T_HIT + .02) / .1, 5), sw = Math.round(kj.w * p);   // the swash is painted left to right
    if(sw > 0) cx.drawImage(kj.swash, 0, 0, sw, kj.h, kx, ky, sw, kj.h); }
  // crisp from its first frame (kodawari #11): always 1x and full opacity (the 1.6x translucent ghost read as a grey smudge), one white
  // impact frame as it lands, then a one-pixel jolt
  if(reduce || t >= T_HIT - .02){ const white = !reduce && t < T_HIT + .04, img = white ? kj.white : kj.c;
    const jx = !reduce && t >= T_HIT + .04 && t < T_HIT + .12 ? (Math.floor(t * 60) % 2 ? 1 : -1) : 0;
    cx.drawImage(img, Math.round(o.kcx - (kj.gx + kj.gw / 2)) + jx, Math.round(o.kcy - kj.h / 2)); }
  if(!reduce && t >= T_HIT && t < T_HIT + .5) ink(t - T_HIT, o);
  // the seal, stamped at the kanji's foot
  const sl = cur.seal; if(sl && !o.narrow && (reduce || t >= T_TXT)){ const sx = o.narrow ? kx + kj.gx + kj.gw - sl.width + 5 : kx + kj.gx - sl.width + 4, sy = o.narrow ? ky + kj.h - sl.height + 6 : ky + 2; cx.drawImage(sl, sx, sy); }
  // the type: boxed tag, the name sliding in, the subtitle typed out
  if(reduce || t >= T_TXT){ const tt = reduce ? 9 : t - T_TXT, ax = w => o.align === 'center' ? Math.round(cw / 2 - w / 2) : o.tx;
    let y = o.ty; const tag = cur.tag, ext = cur.chip ? cur.ext : null, rowW = tag.width + (ext ? ext.width + 3 : 0); let x = ax(rowW);
    cx.drawImage(tag, x, y); if(ext && (reduce || tt > .08) && (reduce || tt > .5 || Math.floor(tt * 12) % 2 === 0)) cx.drawImage(ext, x + tag.width + 3, y);
    y += o.tagH + o.gap;
    const slide = reduce ? 0 : tt < .12 ? Math.round((1 - step(tt / .12, 4)) * 60) : tt < .16 ? -3 : 0;
    o.names.forEach((n, q) => { const lit = L.key !== 'neon' || reduce || neonOn(tt - q * .05); const nx = ax(n.c.width) + slide * (q + 1);
      if(reduce || tt > q * .04){ cx.drawImage(lit ? n.c : n.off, nx, y); if(lit && !reduce) glint(n, nx + 1, y + 1, tt - .35 - q * .08); }
      y += o.lineH; });
    y += o.gap; const chars = reduce ? 999 : Math.floor((tt - .12) / .014);
    let used = 0; o.noteLines.forEach(c => { const n = Math.min(c.width, Math.max(0, chars - used) * 4); used += c.width / 4; if(n > 0) cx.drawImage(c, 0, 0, n, c.height, ax(c.width), y, n, c.height); y += 7; }); }
  if(!reduce) flourish(L.key, t, o, false);
  if(inOut) cx.restore();
  cx.restore(); };

function neonOn(t){ if(t < 0) return false; if(t > .55) return true; return [1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1][Math.floor(t * 30) % 16] === 1; }
function glint(n, x, y, t){ if(t < 0 || t > .5) return; const p = Math.round(t / .5 * (n.mw + n.mh + 8)) - n.mh; cx.fillStyle = '#ffffff';
  for(let r = 0; r < n.mh; r++) for(const d of [0, 1, 4]){ const q = p + (n.mh - r) + d; if(q >= 0 && q < n.mw && n.bits[r * n.mw + q]) cx.fillRect(x + q, y + r, 1, 1); } }
function ink(t, o){ cx.fillStyle = dark(o.col, .1); for(let n = 0; n < 16; n++){ const a = HS(n * 4.1 + o.i) * 6.283, v = 40 + HS(n * 2.3 + o.i) * 110, life = .25 + HS(n * 9.1) * .25; if(t > life) continue;
  const x = o.kcx + Math.cos(a) * (o.kj.w * .35 + v * t), y = o.kcy + Math.sin(a) * (o.kj.h * .3 + v * t) + 140 * t * t, s = t > life * .6 ? 1 : 2; cx.fillRect(Math.round(x), Math.round(y), s, s); } }

/* ---------- one small flourish per road (back = behind the kanji and type, else in front) ---------- */
function flourish(k, t, o, back){ const by = o.by, bh = o.bh, bx = o.bx, cw = o.cw, x0 = Math.max(bx, 0);
  if(k === 'refinery' && back && t > T_HIT){ const f = Math.floor(t * 12) % 3; glow(o.kcx, o.kcy + 4, o.kj.h * .8 + f * 3, '#ff7a2a', .5 - f * .08);   // the flare glow behind the kanji
    cx.fillStyle = '#ffb347'; for(let n = 0; n < 10; n++){ const p = (t * (.5 + HS(n) * .5) + HS(n * 3.3)) % 1, x = o.kx + HS(n * 7.1) * o.kj.w, y = by - p * 40; if((Math.floor(t * 10) + n) % 4) cx.fillRect(Math.round(x + Math.sin(t * 3 + n) * 3), Math.round(y), 1, 1); } }
  if(k === 'harbour' && back && t > T_TXT){ const cols = ['#ff5a8a', '#ffb347', '#f4ecdf'];   // lights on black water under the slab
    for(let r = 0; r < 3; r++) for(let n = 0; n < 7; n++){ const x = o.gx + 10 + n * 28 + HS(n * 5 + r) * 14 + Math.round(Math.sin(t * 5 + n + r * 2) * 2), y = by + bh + 7 + r * 3; cx.fillStyle = cols[(n + r) % 3]; cx.globalAlpha = .7 - r * .2; cx.fillRect(Math.round(x), y, 6 - r * 2, 1); }
    cx.globalAlpha = 1; if(Math.floor(t * 2.5) % 2 === 0){ cx.fillStyle = RED; cx.fillRect(o.kx + o.kj.w - 6, o.ky + 2, 2, 2); } }
  if(k === 'tunnels' && !back && t > T_HIT){ for(let n = 0; n < 3; n++){ const p = ((t - T_HIT) / .55 + n * .34) % 1, x = Math.round(cw - p * (cw - x0 + 30)); cx.fillStyle = 'rgba(255,179,71,.22)'; cx.fillRect(x, by, 6, bh); cx.fillStyle = 'rgba(255,220,150,.3)'; cx.fillRect(x + 2, by, 2, bh); } }
  if(k === 'pass' && !back && !o.narrow && t > T_TXT){ const n = 6, x = cw - n * 9 - 8, y = o.narrow ? by + bh + 8 : by + bh - 10; for(let q = 0; q < n; q++){ const on = (q - Math.floor(t * 10)) % n === 0 || (q - Math.floor(t * 10) + 1) % n === 0;   // hairpin chevrons, marching
      cx.fillStyle = on ? '#ffd04a' : '#5a4420'; const cxp = x + q * 9; for(let r = 0; r < 7; r++){ const d = Math.abs(r - 3); cx.fillRect(cxp + 3 - d, y + r, 2, 1); } } }
  if(k === 'coast' && !back && t > .3){ const p = step((t - .3) / .9, 24), xe = Math.round(lerp(x0, cw, p)), y = by + bh;   // a wave rolls along the slab's foot
    for(let x = x0; x < xe; x++){ const w = Math.round(Math.sin(x * .25 + t * 6) * 1.5), crest = xe - x < 10; cx.fillStyle = crest ? '#ffffff' : '#2a8fb0'; cx.fillRect(x, y - 1 + w, 1, crest ? 3 : 2); if(!crest && (x + Math.floor(t * 20)) % 7 === 0){ cx.fillStyle = '#dff8ff'; cx.fillRect(x, y - 2 + w, 1, 1); } } }
  if(k === 'snow'){ if(back && t > T_HIT && t < T_HIT + .45){ const q = t - T_HIT; cx.fillStyle = '#ffffff'; for(let n = 0; n < 22; n++){ const a = Math.PI + HS(n * 3.7) * Math.PI, v = 30 + HS(n * 1.9) * 70, x = o.kcx + Math.cos(a) * v * q * 1.4, y = o.ky + o.kj.h - 6 + Math.sin(a) * v * q * .7 + 50 * q * q; if(q < .3 || n % 2) cx.fillRect(Math.round(x), Math.round(y), 2, 2); } }   // the puff as the stamp lands
    if(!back && t > T_TXT){ const p = clamp((t - T_TXT) / 1, 0, 1); cx.fillStyle = '#f2f8ff'; for(let x = x0; x < cw; x += 1){ const hgt = Math.floor(HS(x * .7) * 3 * p + (HS(x * .3) > .7 ? 1 : 0)); if(hgt) cx.fillRect(x + 2, by - 4 - hgt, 1, hgt); }   // snow settling on the slab
      for(let n = 0; n < 14; n++){ const x = x0 + HS(n * 5.3) * (cw - x0), y = (by - 30 + ((t * 18 * (.6 + HS(n) * .6) + HS(n * 2.2) * 80) % 80)); cx.fillRect(Math.round(x + Math.sin(t * 2 + n) * 3), Math.round(y), 1, 1); } } }
  if(k === 'paddies' && !back && t > T_TXT){ for(let n = 0; n < 9; n++){ const ph = HS(n * 3.1) * 6, x = o.gx + HS(n * 7.7) * (o.cw - o.gx * 2), y = by + bh + 8 - ((t - T_TXT) * (8 + HS(n) * 10)) - HS(n * 1.3) * 40 + Math.sin(t * 2 + ph) * 3;   // fireflies
      const on = Math.sin(t * 5 + ph * 2) > -.2; if(!on) continue; cx.fillStyle = '#d8ff5a'; cx.fillRect(Math.round(x), Math.round(y), 1, 1); cx.fillStyle = 'rgba(216,255,90,.35)'; cx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); cx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); } }
  if(k === 'bay' && !back && t > T_HIT){ for(let n = 0; n < 12; n++){ const st = T_HIT + HS(n * 3.9) * 1.2; if(t < st) continue; const q = t - st, x = Math.round(x0 + 8 + HS(n * 6.1) * (cw - x0 - 16));   // rain lands on the slab and runs down it
      const y = by + Math.min(bh - 2, Math.floor(q * q * 60 + (q > .25 ? (q - .25) * 30 : 0))); cx.fillStyle = '#bff8ff'; cx.fillRect(x, y, 1, 2); cx.fillStyle = 'rgba(79,240,255,.35)'; if(y - 3 > by) cx.fillRect(x, Math.max(by + 1, y - 5), 1, Math.min(5, y - by - 1)); }
    cx.fillStyle = '#ffffff'; for(let n = 0; n < 6; n++) if(t > T_HIT + .3 + n * .15){ cx.fillRect(Math.round(o.kx + 6 + HS(n * 9.3) * (o.kj.w - 12)), Math.round(o.ky + 6 + HS(n * 4.4) * (o.kj.h - 14)), 1, 1); } }   // beads on the kanji
  if(k === 'neon' && back && t > T_TXT + .55){ if(Math.floor(t * 8) % 5 !== 0){ cx.fillStyle = 'rgba(199,125,255,.18)'; cx.fillRect(x0, by + 2, cw - x0, 1); cx.fillRect(x0, by + bh - 3, cw - x0, 1); } } }
})();
