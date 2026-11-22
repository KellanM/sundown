/* Sundown HUD styling and instruments. See env/README.md, "HUD".
   A Showa-era instrument cluster, drawn in hard pixels on the low-res canvas.
   References studied (rules taken, no art copied):
   - Super Hang-On / Hang-On (Sega 1986/87): boxed labels, a thin top band only, the road left clear.
   - OutRun (1986): speed in a bottom corner with a row of stepped bar segments under it.
   - Chase H.Q. (Taito 1988): chunky segmented time digits, km/h in red, labels in one colour.
   - Rad Mobile (1991): a real dashboard; amber warning lamps stacked in columns.
   - Bridgestone DigiMemo bicycle (1981): italic boxed logotype, red/blue/cyan parallel speed stripes on black.
   - Showa car tachometers: LED fan whose bars grow longer toward the redline; drum odometer with a red tenths wheel;
     unlit LCD segments faintly visible ("ghost 8s").
   Layout: a speed cluster in the bottom-left corner (shoulder, not road), the night strip top-centre (sky), the next
   checkpoint top-right, the road name as a vertical nobori tag on the left. Kanji labels are DOM (DotGothic16) tabs. */
"use strict";
(() => {
const HUD = ENV.hud = {};
const C = { ink:'#07060c', plate:'rgba(7,6,12,.86)', edge:'#3a3350', ghost:'#221d30', ghost2:'#2c2640', ghost3:'#1b1726', cream:'#f4ecdf', cyan:'#4ff0ff', gold:'#ffd04a',
  amber:'#ffb35a', red:'#ff3b5c', pink:'#ff3b8a', blue:'#3a7bff', shadow:'#000' };
const TCOL = ['', '#4ff0ff', '#ffb35a', '#ff3b8a'];   // the game's drift tier colours (TIER_COL), copied so sprites can be built before the game script runs
const S = {};   // sprite cache
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const dimc = (c, k) => { const n = parseInt(c.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, i = [7, 6, 12];
  return '#' + [r, g, b].map((v, j) => Math.round(i[j] + (v - i[j]) * k).toString(16).padStart(2, '0')).join(''); };

/* ---------- 3x5 pixel font (Latin labels and numbers) ---------- */
const F3 = { '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111',
  '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', A:'010101111101101', B:'110101110101110', C:'011100100100011',
  D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111', K:'101101110101101',
  L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', R:'110101110101101', S:'011100010001110',
  T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', '/':'001001010100100',
  '.':'000000000000010', x:'000101010101000', ' ':'000000000000000', '-':'000000111000000', '+':'000010111010000' };
function txt(s, col, sh = C.shadow){ const k = 't' + s + col + sh; if(S[k]) return S[k]; const c = mk(s.length * 4, 6), g = c.getContext('2d');
  for(const [pass, cc, o] of [[0, sh, 1], [1, col, 0]]){ if(!cc) continue; g.fillStyle = cc;
    [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(n * 4 + i % 3 + o, (i / 3 | 0) + o, 1, 1); }); }
  return S[k] = c; }

/* ---------- italic 7-segment digits with ghost segments ---------- */
const SEG7 = { '0':'abcdef', '1':'bc', '2':'abged', '3':'abgcd', '4':'fgbc', '5':'afgcd', '6':'afgedc', '7':'abc', '8':'abcdefg', '9':'abcdfg', '-':'g', ' ':'' };
function seg(ch, w, h, t, col){ const k = 's' + ch + w + h + t + col; if(S[k]) return S[k]; const c = mk(w + 1, h), g = c.getContext('2d'), on = SEG7[ch] || '', mid = (h - t) >> 1;
  const has = q => on.includes(q), two = (...q) => q.filter(has).length >= 2;
  g.fillStyle = col;   // italic by one step: the upper half sits one pixel right of the lower half
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
    const inX = x >= t && x < w - t, L = x < t, R = x >= w - t, T = y < t, M = y >= mid && y < mid + t, D = y >= h - t, up = y >= t && y < mid, dn = y >= mid + t && y < h - t;
    let lit = (T && inX && has('a')) || (M && inX && has('g')) || (D && inX && has('d')) || (L && up && has('f')) || (R && up && has('b')) || (L && dn && has('e')) || (R && dn && has('c'));
    if(!lit && (L || R) && (T || M || D)){   // corners: filled when two of the segments meeting there are lit, so strokes join into solid block digits
      lit = T ? two('a', L ? 'f' : 'b') : D ? two('d', L ? 'e' : 'c') : (L ? two('f', 'e', 'g') : two('b', 'c', 'g')); }
    if(lit) g.fillRect(x + (y < mid ? 1 : 0), y, 1, 1); }
  return S[k] = c; }

/* ---------- LED wedge tachometer: 16 bars that step up in height, like a Showa digital dash or a car-stereo level meter ---------- */
const NSEG = 16, RED0 = 13;
const CNT = []; for(let f = 0; f < 100; f++) CNT.push(String(f));   // the chain count's strings, made once
const LOSTC = '#8a2a3a', TC = ['#f4ecdf', '#ffd04a', '#ff3b5c', LOSTC, '#4a4260'];   // the tab's number colours (all prebuilt)   // bars from RED0 on are over 100% (boost only)
function zcol(i, mode){ return i >= RED0 ? (mode ? TCOL[mode] : C.red) : i >= 10 ? C.gold : C.cyan; }

/* ---------- small sprites ---------- */
function chev(col){ const k = 'v' + col; if(S[k]) return S[k]; const c = mk(7, 4), g = c.getContext('2d'); g.fillStyle = col;
  ['...#...', '..###..', '.##.##.', '##...##'].forEach((r, y) => [...r].forEach((ch, x) => { if(ch === '#') g.fillRect(x, y, 1, 1); })); return S[k] = c; }
function moon(){ if(S.moon) return S.moon; const c = mk(9, 9), g = c.getContext('2d');
  for(let y = 0; y < 9; y++) for(let x = 0; x < 9; x++){ const d = Math.hypot(x - 4, y - 4); if(d < 4.6){ g.fillStyle = d > 3.5 ? C.ink : (x + y < 6 ? '#fffbe8' : (x === 5 && y === 3) || (x === 3 && y === 5) ? '#c9bfa6' : C.cream); g.fillRect(x, y, 1, 1); } }
  return S.moon = c; }
function sun(){ if(S.sun) return S.sun; const c = mk(11, 7), g = c.getContext('2d');
  for(let y = 0; y < 7; y++) for(let x = 0; x < 11; x++){ const d = Math.hypot(x - 5, y - 6.5); if(d < 4.2){ g.fillStyle = y === 2 || y === 4 ? '#ff7a3a' : C.gold; g.fillRect(x, y, 1, 1); } }
  g.fillStyle = C.gold; [[0, 3], [10, 3], [1, 0], [9, 0], [5, 0]].forEach(([x, y]) => g.fillRect(x, y, 1, 1)); g.fillRect(0, 6, 11, 1); return S.sun = c; }
// the night ramp along the strip: indigo at the moon end, stepping to gold at the dawn end
const NCELL = 20, RAMP = ['#3a2f9a', '#3a2f9a', '#4a2fa8', '#5a2fae', '#6a2eae', '#7c2ea8', '#8e2e9e', '#a0308e', '#b2337e', '#c2376e', '#d03e60', '#dc4a54',
  '#e6584a', '#ee6a42', '#f47e3c', '#f89238', '#fba634', '#fdb832', '#ffc834', '#ffd84a'];

/* ---------- DOM: pixel styling, kanji tabs, the road tag ---------- */
const css = `
:root{--sa-t:env(safe-area-inset-top,0px);--sa-r:env(safe-area-inset-right,0px);--sa-b:env(safe-area-inset-bottom,0px);--sa-l:env(safe-area-inset-left,0px)}
#hudSA{position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:var(--sa-t) var(--sa-r) var(--sa-b) var(--sa-l)}
.top{text-shadow:none!important;top:calc(12px + var(--sa-t))!important;left:calc(16px + var(--sa-l))!important;right:calc(16px + var(--sa-r))!important}
.top .title{display:none}
.top .stat,.top .land,.next{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.home,.info{font-family:var(--font-display)!important;font-weight:400!important;border-radius:0!important;background:#07060c!important;color:#f4ecdf!important;
  border:2px solid #f4ecdf!important;box-shadow:3px 3px 0 #ff3b5c;line-height:1}
.home{padding:6px 10px 5px!important;font-size:14px!important;letter-spacing:1px}
.info{width:30px!important;height:30px!important;font-size:16px!important;padding:0!important}
.home:hover,.info:hover{background:#f4ecdf!important;color:#07060c!important}
.home:active,.info:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #ff3b5c}
#hudx{position:fixed;inset:0;pointer-events:none}
#hudx[hidden]{display:none}
#hudx .tab{position:absolute;font-family:var(--font-display);color:#f4ecdf;background:#ff3b5c;line-height:1;white-space:nowrap;box-shadow:2px 2px 0 #000}
#hudx .tab.n{background:#3a2f9a}
#hudx .tab.g{background:#ffd04a;color:#07060c}
#roadTag{position:absolute;left:calc(16px + var(--sa-l));display:flex;flex-direction:column;align-items:center;background:#07060c;border:2px solid #f4ecdf;box-shadow:3px 3px 0 #000;font-family:var(--font-display)}
#roadTag::before{content:'';display:block;align-self:stretch;height:6px;background:repeating-linear-gradient(90deg,#ff3b5c 0 6px,#07060c 6px 8px)}
#roadTag .k{font-size:32px;line-height:1;color:#ffd04a;padding:6px 6px 4px;text-shadow:2px 2px 0 #7a1a2a}
#roadTag .nm{writing-mode:vertical-rl;font-size:13px;letter-spacing:2px;color:#f4ecdf;padding:2px 0 8px;text-transform:uppercase}
#roadTag::after{content:'';display:block;align-self:stretch;height:3px;margin:0 3px 3px;background:#4ff0ff}
.float{text-shadow:2px 2px 0 #000,-1px -1px 0 #000!important}
.banner{background:#07060ccc!important}
.banner .kj{text-shadow:3px 3px 0 #000!important}
@media (max-width:640px){ #roadTag .k{font-size:24px} #roadTag .nm{font-size:13px} .home{font-size:13px!important} }
`;
const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
const root = document.createElement('div'); root.id = 'hudx'; root.hidden = true; root.setAttribute('aria-hidden', 'true');
const SHOW_NIGHT = false;
root.innerHTML = '<span class="tab" id="tabSpd">速度</span><span class="tab n" id="tabNt">夜</span><span class="tab g" id="tabNx">次</span><div id="roadTag"><span class="k"></span><span class="nm"></span></div>';
const cvEl = document.getElementById('c'); document.body.insertBefore(root, cvEl ? cvEl.nextSibling : document.body.firstChild);   // under the banner, floats and buttons
// the safe areas (viewport-fit=cover: the canvas runs under the notch and the home bar): CSS px, read through a probe at each layout
const saEl = document.createElement('div'); saEl.id = 'hudSA'; saEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(saEl);
function safeArea(){ const c = getComputedStyle(saEl), f = v => Math.max(0, parseFloat(v) || 0); return { t:f(c.paddingTop), r:f(c.paddingRight), b:f(c.paddingBottom), l:f(c.paddingLeft) }; }
const q = s => root.querySelector(s), tabSpd = q('#tabSpd'), tabNt = q('#tabNt'), tabNx = q('#tabNx'), tag = q('#roadTag'), tagK = q('#roadTag .k'), tagN = q('#roadTag .nm');
if(!SHOW_NIGHT) tabNt.style.display = 'none';
let sheet = null;

/* ---------- layout (in canvas pixels, recomputed on resize) ---------- */
let P = 3, Ly = null, lastKey = '', shownV = 0, lastLand = -1;
function layout(){
  P = PX; const cw = cv.width, ch = cv.height, sx = W / cw, narrow = W < 640, m = narrow ? 3 : 5;
  const SA = safeArea(), iT = Math.ceil(SA.t / sx), iR = Math.ceil(SA.r / sx), iB = Math.ceil(SA.b / sx), iL = Math.ceil(SA.l / sx);   // safe-area insets in canvas pixels
  const bw = narrow ? 1 : 2, hMax = narrow ? 7 : 11, BW = NSEG * (bw + 1) - 1, dg = narrow ? [6, 11] : [8, 13], dW = 3 * (dg[0] + 3) - 1, drums = narrow ? 3 : 4;
  const inner = Math.max(BW, dW + 3 + Math.max(15, drums * 5 - 1)), plW = 3 + inner + 3 + 7 + 2 + 5 + 3, plH = Math.max(3 + hMax + 3 + dg[1] + 3, 28);
  const nl = Math.floor((plH - 6 + 1) / 3);
  const below = Math.ceil(52 / sx) + iT;   // first free row under the DOM buttons (which sit under the notch's inset too)
  const x0 = m + iL, y0 = narrow ? below : ch - m - plH - 3 - iB;   // wide: bottom-left corner (3 rows for the speed stripes); narrow: top-left, in the sky
  const kW = narrow ? 3 + 4 * 9 - 1 + 1 + 3 + 3 : 3 + 19 + 3 + 4 * 10 - 1 + 1 + 3 + 3, kH = narrow ? 25 : 21, kX = cw - m - kW - iR, kY = below;
  const stripW = NCELL * 4 - 1, nX = iL + ((cw - iL - iR - stripW) >> 1), nY = narrow ? y0 + plH + 9 : Math.ceil(16 / sx) + iT;   // centred in the safe width
  // the style chain tab (mech/style.js): wide, beside the speed plate (heat.js's meter column is gone), bottoms aligned;
  // narrow, under the night strip on the left, where the sky is clear
  // (kodawari #8: with the night strip hidden, a phone stacks the tab right under the speed plate, not under the strip's empty rows)
  const tW = 66, tH = 21, tX = narrow ? x0 : x0 + plW + 2, tY = narrow ? (SHOW_NIGHT ? nY + 9 : y0 + plH + 2) : y0 + plH - tH, tN = Math.floor((tW - 6 + 1) / 3);   // tW 66: a 9-letter act and its repeat count ("SLID PAST x3") fit on the label line
  Ly = { cw, ch, sx, narrow, m, iT, iR, iB, iL, bw, hMax, BW, dg, dW, drums, inner, plW, plH, nl, x0, y0, kW, kH, kX, kY, stripW, nX, nY, tW, tH, tX, tY, tN };
  const fs = narrow ? 13 : 16;
  const place = (el, x, y) => { el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.fontSize = fs + 'px'; el.style.padding = narrow ? '2px 3px' : '3px 5px'; };
  place(tabSpd, x0 * sx, y0 * sx - fs - 6); tabSpd.style.display = narrow ? 'none' : '';
  place(tabNt, nX * sx - fs - (narrow ? 12 : 16), nY * sx - (narrow ? 4 : 5));
  place(tabNx, kX * sx - fs - (narrow ? 10 : 14), kY * sx + 2);
  tag.style.top = Math.round(60 + SA.t) + 'px'; tag.style.display = narrow ? 'none' : '';
}

// pixel helpers (canvas-pixel coordinates; cx has a 1/PX transform, so multiply by P to land on whole canvas pixels)
const R_ = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(x * P, y * P, w * P, h * P); };
const B_ = (c, x, y) => cx.drawImage(c, x * P, y * P, c.width * P, c.height * P);
function plate(x, y, w, h, edge, cut){   // dark plate, 1px edge, top-right corner cut at 45 degrees
  for(let i = 0; i < h; i++){ const cc = Math.max(0, cut - i); R_(x, y + i, w - cc, 1, C.plate); }
  R_(x, y + h - 1, w, 1, edge); R_(x, y + cut, 1, h - cut, edge); R_(x + w - 1, y + cut, 1, h - cut, edge); R_(x, y, w - cut, 1, edge);
  for(let i = 0; i < cut; i++) R_(x + w - cut + i, y + i, 1, 1, edge);
}
function num(str, x, y, w, h, t, col, ghost){ for(let i = 0; i < str.length; i++){ const dx = x + i * (w + 3); if(ghost) B_(seg('8', w, h, t, ghost), dx, y); if(str[i] !== ' ') B_(seg(str[i], w, h, t, col), dx, y); } }

// build every digit and label sprite at load, so the HUD never creates canvases mid-ride (they were built lazily, ~30 per 20 s)
HUD.warm = function(){ const cols = [C.cyan, C.gold, C.cream, TCOL[1], TCOL[2], TCOL[3]];
  for(const [w, h] of [[6, 11], [8, 13], [7, 13]]){ seg('8', w, h, 2, C.ghost3); for(const ch of '0123456789- ') for(const col of cols) seg(ch, w, h, 2, col); }
  for(const ch of '0123456789') txt(ch, C.cream, null); for(const l of ['CHECK', 'KM/H', 'M']) txt(l, l === 'CHECK' ? C.gold : C.cream);
  moon(); sun(); chev(C.ghost2); for(let i = 1; i <= 3; i++){ chev(TCOL[i]); for(let q = 3; q <= 15; q++) chev(dimc(TCOL[i], q / 20)); }
  for(let f = 0; f < 100; f++) txt(CNT[f], f ? C.gold : '#4a4260');
  const SY = MECH.style; if(SY && SY.LABELS) for(const l of SY.LABELS) for(const c of [C.cream, C.gold, C.red, TCOL[1], TCOL[3]]) txt(l, c);
  for(const ch of '0123456789+x') for(const c of TC) txt(ch, c); for(const ch of '0123456789') seg(ch, 6, 11, 2, C.ghost3); };
// the HUD's layout for other modules (police.js's roadblock plate sits under it): canvas-pixel rects, their CSS-pixel equivalents
// (multiply by sx), and the narrow-screen flag. null until the HUD has drawn once at this size.
HUD.layout = () => { const L = Ly; if(!L) return null; const r = (x, y, w, h) => ({ x, y, w, h, css:{ x:x * L.sx, y:y * L.sx, w:w * L.sx, h:h * L.sx } });
  return { narrow:L.narrow, sx:L.sx, P, speed:r(L.x0, L.y0, L.plW, L.plH + (L.narrow ? 0 : 3)), night:r(L.nX - 2, L.nY - 2, L.stripW + 18, 9), check:r(L.kX, L.kY, L.kW, L.kH),
    chain:r(L.tX, L.tY, L.tW, L.tH), freeY:Math.max(SHOW_NIGHT ? L.nY + 7 : 0, L.kY + L.kH, L.narrow ? L.tY + L.tH : 0) + 2 }; };   // freeY: the first canvas row clear of the HUD at the top of the screen
/* ---------- the style chain tab: multiplier, the last act, the points at stake, the timer draining ----------
   One compact plate in the cluster's language (PGR's kudos counter, THPS's "points x tricks"), not a stream of floating text.
   It steps in on the first act and out after the bank or the loss beat. Reduced motion / no flashing: no blinks or flashes. */
const NUMD = new Int8Array(8), T3 = {}, S7 = {};
// sprite lookups by plain property access: txt()/seg() build a key string on every call, these allocate nothing once warm
const t3 = (s, col) => { const o = T3[col] || (T3[col] = {}); return o[s] || (o[s] = txt(s, col)); };
const s7 = (ch, col) => { const o = S7[col] || (S7[col] = {}); return o[ch] || (o[ch] = seg(ch, 6, 11, 2, col)); };
function numAt(n, x, y, col, plus){ let k = 0; n = Math.max(0, Math.floor(n)); do { NUMD[k++] = n % 10; n = Math.floor(n / 10); } while(n > 0 && k < 7);   // digits without a string
  if(plus){ B_(t3('+', col), x, y); x += 4; } for(let i = k - 1; i >= 0; i--){ B_(t3('0123456789'[NUMD[i]], col), x, y); x += 4; } return x; }
function multCol(m){ return m >= 6 ? TCOL[3] : m >= 3 ? C.gold : C.cyan; }
function chainTab(V, now, L){
  if(!V.on) return;
  const beat = V.beat, bt = V.beatT, hold = beat === 1 ? 1.1 : .8;
  // in: three quick steps on the first act; out: three steps over the beat's last .3 s
  let a = 1; if(!reduce && !beat && V.chain === 1 && V.actT < .09) a = Math.ceil(V.actT / .03) / 3;
  if(beat) a = clamp(Math.ceil((hold - bt) / .1) / 3, 0, 1);
  if(a <= 0) return; cx.globalAlpha = a * (V.actT < 1.5 || V.beat ? 1 : DIM.shown);
  const { tX, tY, tW, tH, tN } = L, m = V.mult, mc = multCol(m), fresh = V.actT < .12 && !beat;
  const warnBlink = !beat && V.warnT > 0 && !reduce && Math.floor(now / 125) % 2 === 0;
  const edge = beat === 1 ? C.gold : beat === 2 ? C.red : fresh ? mc : warnBlink ? C.red : C.edge;
  plate(tX, tY, tW, tH, edge, 4);
  // the multiplier: a small x and one big 7-segment digit, the speed digits' face; it flashes cream the moment it steps up
  const mFlash = !beat && V.multT < .1 && !reduce;
  B_(t3('x', beat === 2 ? LOSTC : C.cream), tX + 3, tY + 9);
  B_(s7('0123456789'[Math.min(9, m)], beat === 2 ? C.ghost3 : mFlash ? C.cream : beat === 1 ? C.gold : mc), tX + 7, tY + 3);
  // the last act's name (gold for a beat when it lands), then the points at stake / banked / lost
  const lc = beat === 1 ? C.gold : beat === 2 ? C.red : fresh ? C.gold : C.cream;
  if(V.label){ B_(t3(V.label, lc), tX + 17, tY + 3);
    // the same act again merges into a count after the name ("CLOSE x3"), one quiet message instead of a chip per act; shown only if it fits
    if(!beat && V.rep > 1){ const r = Math.min(99, V.rep), cx0 = tX + 17 + V.label.length * 4 + 4; if(cx0 + (r > 9 ? 10 : 6) <= tX + tW - 3){ B_(t3('x', lc), cx0, tY + 3); numAt(r, cx0 + 4, tY + 3, lc, false); } } }
  const py = tY + 10;
  if(beat === 1) numAt(V.beatPts, tX + 17, py, C.gold, true);
  else if(beat === 2){ const xe = numAt(V.beatPts, tX + 17, py, LOSTC, false); R_(tX + 16, py + 2, xe - tX - 16, 1, C.red); }   // struck through
  else numAt(V.pend, tX + 17, py, C.cream, true);
  // the timer: cells drain right to left in the multiplier's colour; the last second blinks red (steady red under reduced motion)
  const lit = beat === 1 ? tN : beat === 2 ? 0 : Math.ceil(V.frac * tN), cc = beat === 1 ? C.gold : V.warnT > 0 ? (reduce || warnBlink ? C.red : '#7a1a2a') : mc;
  for(let i = 0; i < tN; i++) R_(tX + 3 + i * 3, tY + 16, 2, 2, i < lit ? cc : beat === 2 && bt < .25 ? '#7a1a2a' : C.ghost2);
  cx.globalAlpha = 1; }
/* ---------- the HUD dims on empty stretches (research/sundown-craft/quiet.md) ----------
   After 4 s with nothing happening, the speed plate, night strip, checkpoint plate and the DOM tabs ease down to 30% in 1/20 steps over
   1.2 s (Journey, Inside and OutRun 2 keep the screen to the road; Dead Space's "only what the player needs at the time"). Any event
   wakes them at once: a callout, card or cut-in (MECH.quiet.busy()), a chase or the heat, a chain's bank or loss, a crash's recovery, a slow bike, the next checkpoint within 150 m, and never dims with under 20 s of night left (kikubari).
   The rider's own continuous play (drift charge, boosts, style acts) does not wake the rest: the bike shows it (the drift arc, the boost
   flame), and the chain tab lights itself for 1.5 s on each act. ASSIST.hudOn ("HUD: always on" in the assists) turns it off. */
const DIM = { a:1, idle:0, last:0, shown:1 }, DIM_MIN = .3, DIM_AFTER = 4, DIM_EASE = 1.2;
HUD.dim = () => DIM.a;
function dimStep(now, SV){ const dt = DIM.last ? clamp((now - DIM.last) / 1000, 0, .1) : 0; DIM.last = now;
  const ng = gates[gatesHit], near = ng !== undefined && (ng * SEG - position - PZ) / 100 < 150, QT = MECH.quiet;
  const awake = state !== 'play' || (window.ASSIST && ASSIST.hudOn) || copT > 0 || sunLeft < 20 || playT < 8 || recov > 0
    || speed < MAXS * .45 || near || (SV && SV.beat) || (QT && QT.busy && QT.busy()) || (MECH.heat && MECH.heat.owns && MECH.heat.owns());
  if(awake){ DIM.idle = 0; DIM.a = 1; } else { DIM.idle += dt; if(DIM.idle > DIM_AFTER) DIM.a = Math.max(DIM_MIN, DIM.a - dt * (1 - DIM_MIN) / DIM_EASE); }
  const q = Math.round(DIM.a * 20) / 20; if(q !== DIM.shown){ DIM.shown = q; root.style.opacity = q >= 1 ? '' : String(q); }   // stepped, like the rest of the instruments
  DIM.a = Math.max(DIM.a, 0); return q; }
HUD.draw = function(now){
  if(!sheet) sheet = document.getElementById('sheet');
  const vis = sheet && sheet.hidden && state !== 'over';
  if(root.hidden === vis) root.hidden = !vis;
  if(!vis) return;
  const key = W + 'x' + H + 'x' + PX; if(key !== lastKey){ lastKey = key; layout(); }
  const L = Ly, SV0 = MECH.style && MECH.style.view, dimA = dimStep(now, SV0);
  // pulled over: the speed cluster has nothing left to say and sits where the patrol car parks, so it steps out (3 steps, .3 s)
  const fadeC = state === 'pulled' ? clamp(1 - Math.floor(Math.max(0, pullT - .15) / .1) / 3, 0, 1) : 1, spdOn = fadeC > 0 && !L.narrow && fadeC === 1;
  if((tabSpd.style.display === 'none') === spdOn) tabSpd.style.display = spdOn ? '' : 'none';
  cx.save(); cx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  const blink = !reduce && Math.floor(now / 260) % 2 === 0;

  /* --- speed cluster --- */
  const v = speed / MAXS; shownV += (v - shownV) * .35;
  const n = Math.round(clamp(shownV / 1.25, 0, 1) * NSEG), boosting = boostT > 0, mode = boosting ? boostTier : 0;
  const cop = copT > 0 || state === 'pulled';   // police behind you: the plate rim flashes patrol-light red (Japanese light bars are red only)
  cx.globalAlpha = fadeC * dimA;
  const edge = cop ? (reduce || Math.floor(now / 200) % 2 ? C.red : '#8a0c20') : boosting ? TCOL[boostTier] || C.cream : drift && tier ? dimc(TCOL[tier], .7) : C.edge;
  const { x0, y0, plW, plH, bw, hMax } = L, ix = x0 + 3;
  plate(x0, y0, plW, plH, edge, 5);
  // three speed stripes under the plate, red / gold / cyan, stepped at 45 degrees
  if(!L.narrow) [C.red, C.gold, C.cyan].forEach((c, i) => R_(x0 + 2 + i * 2, y0 + plH + i, plW + 4 - i * 4, 1, boosting ? (TCOL[boostTier] || c) : c));
  // the wedge: bar i is taller than bar i-1; lit bars carry the zone colour, unlit ones stay as faint ghosts
  const yb = y0 + 3 + hMax;
  for(let i = 0; i < NSEG; i++){ const h = 3 + Math.round((hMax - 3) * i / (NSEG - 1)); R_(ix + i * (bw + 1), yb - h, bw, h, i < n ? zcol(i, mode) : i >= RED0 ? '#3a1a2c' : C.ghost2); }
  const kmh = Math.round(clamp(shownV, 0, 9) * 240),   // from the eased value, so the last digit doesn't chatter at a steady speed
    ks = String(kmh).padStart(3, ' ').slice(-3), [dw, dh] = L.dg, y2 = yb + 3;
  num(ks, ix, y2, dw, dh, 2, boosting ? TCOL[boostTier] : C.cyan, C.ghost3);
  const xr = ix + L.dW + 3; B_(txt('KM/H', C.cream), xr, y2);
  // drum odometer in tenths of a km; the last wheel is red
  const ds = String(Math.floor(km() * 10)).padStart(L.drums, '0').slice(-L.drums), odY = y2 + dh - 7;
  for(let i = 0; i < L.drums; i++){ R_(xr + i * 5, odY, 4, 7, i === L.drums - 1 ? '#c8243e' : '#000'); B_(txt(ds[i], C.cream, null), xr + i * 5, odY + 1); }
  // lamp columns: drift-charge chevrons (tier 1 at the bottom) and the flow stack
  const chX = ix + L.inner + 3; let cy = y0 + 3;
  for(let i = 3; i >= 1; i--){ let col = C.ghost2;
    if(boosting && boostTier >= i) col = TCOL[i];
    else if(drift && tier >= i) col = TCOL[i];
    else if(drift && tier === i - 1) col = dimc(TCOL[i], Math.round((clamp((charge - TIERS[i - 1]) / (TIERS[i] - TIERS[i - 1]), 0, 1) * .6 + .15) * 20) / 20);   // 1/20 steps: a bounded set of chevron sprites, all built in warm()
    B_(chev(col), chX, cy); cy += 5; }
  // the chain's length (mech/style.js; it took over from the old flow count, which still drives the music)
  const SV = MECH.style && MECH.style.view, cn = SV ? Math.min(99, SV.chain) : Math.min(99, flow);
  if(!SV) B_(txt(CNT[cn], cn ? C.gold : '#4a4260'), chX, y0 + plH - 8);   // with the chain on, the stack alone says how long it is (a bare number here read as an odometer wheel)
  const flX = chX + 9, fl = Math.min(cn, L.nl);
  for(let i = 0; i < L.nl; i++){ const c = i < fl ? (i < 3 ? C.cyan : i < 6 ? C.gold : C.pink) : C.ghost; R_(flX, y0 + plH - 4 - i * 3, 5, 2, c); }

  cx.globalAlpha = 1;
  if(SV && fadeC === 1) chainTab(SV, now, L);
  /* --- night strip: the moon walks toward the sun; lit cells are the night you have left --- */
  // the night strip is hidden (Kellan, 2026-11-19: turn off the time-left element); SHOW_NIGHT = true brings it back
  if(SHOW_NIGHT){
  cx.globalAlpha = dimA;
  const f = clamp(sunShown / SUN_MAX, 0, 1), rem = Math.ceil(f * NCELL), low = sunLeft < 12 && state === 'play';
  R_(L.nX - 2, L.nY - 2, L.stripW + 18, 9, C.plate);
  for(let i = 0; i < NCELL; i++){ const lit = i >= NCELL - rem; let c = lit ? RAMP[i] : C.ghost; if(lit && low) c = blink ? C.red : '#7a1a2a'; R_(L.nX + i * 4, L.nY, 3, 5, c); }
  B_(sun(), L.nX + L.stripW + 2, L.nY - 1);
  const mi = clamp(NCELL - rem, 0, NCELL - 1); B_(moon(), L.nX + mi * 4 - 3, L.nY - 2);
  }

  /* --- next checkpoint --- */
  const ng = gates[gatesHit];
  if(ng !== undefined && state === 'play'){
    const dist = Math.max(0, Math.round((ng * SEG - position - PZ) / 100)), g0 = gatesHit ? gates[gatesHit - 1] : 0, span = Math.max(1, (ng - g0) * SEG / 100), prog = clamp(1 - dist / span, 0, 1);
    const { kX, kY, kW, kH } = L, close = dist < 120;
    plate(kX, kY, kW, kH, close ? C.gold : C.edge, 4);
    B_(txt('CHECK', C.gold), kX + 3, kY + 3);
    // five cells beside/under the label: how much of this stretch is behind you
    const pc = Math.round(prog * 5); for(let i = 0; i < 5; i++) R_(L.narrow ? kX + 23 + i * 2 : kX + 3 + i * 4, L.narrow ? kY + 4 : kY + 11, L.narrow ? 1 : 3, L.narrow ? 3 : 2, i < pc ? C.cyan : C.ghost2);
    const w7 = L.narrow ? 6 : 7, h7 = L.narrow ? 11 : 13, ds = String(Math.min(9999, dist)).padStart(4, ' '), nW = 4 * (w7 + 3) - 1;
    const ny = L.narrow ? kY + 10 : kY + ((kH - h7) >> 1); num(ds, kX + kW - 3 - 4 - nW, ny, w7, h7, 2, close && blink ? C.cream : C.gold, C.ghost3);
    B_(txt('M', C.cream), kX + kW - 6, ny + h7 - 5);
  }
  const nxOn = ng !== undefined && state === 'play'; if(tabNx.hidden === nxOn) tabNx.hidden = !nxOn;

  cx.globalAlpha = 1;
  /* --- road tag --- */
  const li = landIdx(zone()); if(li !== lastLand){ lastLand = li; const Ld = LANDS[li]; tagK.textContent = Ld.kanji; tagN.textContent = Ld.name; }
  cx.restore();
};
})();
