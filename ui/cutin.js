/* Sundown UI module: anime title cut-ins for cinematic moments (MECH.cutin). Research and rules: research/sundown-cutins.md.
   Load it right AFTER mech/director.js:   <script src="ui/cutin.js"></script>
   Its post pass then runs after the director's (over the letterbox) and before env/hud.js (under the instruments).

   API
     MECH.cutin.has(id)            a card exists for this id ('kaiju', 'greatwave', 'fireball', 'avalanche', 'jetwash', 'typhoon', 'hanabi', 'matsuri',
                                   'shinkansen', 'fuji', 'jump:<road>' for harbour pass sakurajima haneda tunnels snow paddies refinery)
     MECH.cutin.show(id, opts)     play it now (replaces any card on screen); false if there is no such card. opts.dur overrides the length.
                                   Sparse: true without playing when the ride has had its share (see spare()); .skipped then says why.
                                   opts.force skips that rule (tests).
     MECH.cutin.idFor(card)        the cut-in id for a director card { kanji, name } (the set pieces pass cards without ids)
     MECH.cutin.on()               a cut-in is on screen (the director keeps the camera level meanwhile)
     MECH.cutin.warm()             builds every card's layers at the canvas size; rebuilt only after a resize or when the title fonts arrive
   Every card is a full-screen splash of ~1.5-2.2 s: an entry (slam, wipe, CRT switch-on, tone burst), a hold, and an exit wipe. Each has its
   own limited palette and its own visual language; all keep the bike's lower-centre window open. Everything is drawn at the game's canvas
   pixel (hard edges: every path is thresholded to 1-bit alpha after it is drawn, kanji are rendered from fonts and then dry-brushed,
   carved, cracked or shattered on the pixel grid, screentone is ordered dither). Per frame a card is a handful of drawImage calls.
   Time runs on game time (update dt, unscaled by slow-mo), so pause freezes it. Reduced motion: the hold frame fades in and out in four
   steps; no slams, flashes, shake, jitter or scrolling. */
"use strict";
(function(){
if(typeof window === 'undefined' || !window.MECH) return;

/* ================================================================== fonts: display faces for the big type, subset to the glyphs used */
const FAM = { potta:'"Potta One"', dela:'"Dela Gothic One"', min:'"Shippori Mincho B1"', ant:'"Zen Antique"', reg:'"Reggae One"', deco:'"Kaisei Decol"', dot:'DotGothic16' };
const WGT = { min:'800 ', deco:'700 ' }, FALL = ', "Yu Gothic", "MS Gothic", sans-serif';
const font = (f, px) => (WGT[f] || '') + px + 'px ' + FAM[f] + FALL;
// every string any card renders in a web face (Latin titles included), so the font request carries only these glyphs
const GLYPHS = '滄古代鮫怪獣決戦ゴ帆竜対蟹蛾大波湘南沖乗爆発ドカーン脱出雪崩温泉台風臨時ニュース情報強注意花火夏祭超特急新幹線ひかり富士夜明け跳開橋谷越え溶岩誘導路首都高ジャンプ線配管港峠灰空隧田油見噴射離陸羽' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!-·/.:\' ';
let fontsOK = false, fontRebuild = false;   // the faces arrived after a build: rebuild once, but never during a ride (update() waits for a calm moment)
const AV = {};   // per family: the web face really loaded (document.fonts.load resolves with an empty list when it did not)
/* Offline (or before the faces arrive) the display kanji come, in order of preference, from:
   1. the glyph cache: every display-face kanji mask built while the web face was available is kept, 1-bit packed, in
      localStorage 'sundown.cutin.glyphs' (bounded), and reused at any size by nearest-neighbour scaling, so a later offline session
      (or the first build of a session, before the fonts land) still shows the real brush / woodblock shapes;
   2. a pixel-built fallback: a bold system CJK face rendered at the pixel-native 16 px, thresholded, then scaled up by a whole
      factor and thickened (chunky, heavy, on the grid; never a thin hairline face blown up). Latin titles fall back to a black-weight sans. */
const FB_CJK = n => 'bold ' + n + 'px "Yu Gothic", "Hiragino Kaku Gothic ProN", "Meiryo", "Noto Sans CJK JP", "MS Gothic", sans-serif';
const FB_LAT = n => '900 ' + n + 'px "Arial Black", "Segoe UI Black", Impact, "Helvetica Neue", Arial, sans-serif';
const GKEY = 'sundown.cutin.glyphs', GMAX = 350000; let GC = null, gDirty = false;
function gLoad(){ if(GC) return GC; GC = {}; try{ const v = JSON.parse(localStorage.getItem(GKEY) || '{}'); if(v && v.v === 1 && v.g) GC = v.g; }catch(e){} return GC; }
function gSave(){ if(!gDirty) return; gDirty = false; try{ let ks = Object.keys(GC), json = JSON.stringify({ v:1, g:GC });
    while(json.length > GMAX && ks.length){ ks.sort((a, b) => (GC[a].t || 0) - (GC[b].t || 0)); delete GC[ks.shift()]; json = JSON.stringify({ v:1, g:GC }); }
    localStorage.setItem(GKEY, json); }catch(e){} }
function gPut(key, px, M){ const G = gLoad(), old = G[key]; if(old && old.px >= px) return;   // keep the largest build of each glyph run
  const bytes = new Uint8Array(Math.ceil(M.d.length / 8)); for(let i = 0; i < M.d.length; i++) if(M.d[i]) bytes[i >> 3] |= 1 << (i & 7);
  let bin = ''; for(let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); G[key] = { px, w:M.w, h:M.h, b:btoa(bin), t:Date.now() }; gDirty = true; }
function gGet(key, px){ const G = gLoad(), e = G[key]; if(!e) return null; let bin; try{ bin = atob(e.b); }catch(x){ return null; }
  const n = e.w * e.h, d0 = new Uint8Array(n); for(let i = 0; i < n; i++) d0[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
  const r = px / e.px; if(Math.abs(r - 1) < .01) return { w:e.w, h:e.h, d:d0 };
  const w = Math.max(1, Math.round(e.w * r)), h = Math.max(1, Math.round(e.h * r)), d = new Uint8Array(w * h);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) d[y * w + x] = d0[Math.min(e.h - 1, Math.floor((y + .5) / r)) * e.w + Math.min(e.w - 1, Math.floor((x + .5) / r))];
  return { w, h, d }; }
function loadFonts(){ try{
    if(!document.fonts) return;
    // ask for the faces only once the stylesheet (and so its @font-face rules) has arrived; a failed stylesheet means offline
    const probe = () => Promise.all(Object.keys(FAM).map(f => document.fonts.load(font(f, 32), '大A').then(r => { AV[f] = !!(r && r.length); }, () => { AV[f] = false; })))
      .then(() => { fontsOK = Object.keys(FAM).some(f => AV[f] && f !== 'dot'); if(fontsOK && BUILT) fontRebuild = true; });
    let l = document.querySelector('link[data-cutin]');
    if(!l){ l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.cutin = '1';
      l.href = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Potta+One&family=Shippori+Mincho+B1:wght@800&family=Zen+Antique&family=Reggae+One&family=Kaisei+Decol:wght@700&display=block&text=' + encodeURIComponent(GLYPHS);
      l.onload = probe; l.onerror = () => { document.fonts.load(font('dot', 16), 'A').then(r => { AV.dot = !!(r && r.length); }, () => {}); };
      document.head.appendChild(l); }
    else probe();
  }catch(e){} }
loadFonts();

/* ================================================================== pixel helpers (build time only) */
// build canvases are CPU-backed (cheap readbacks for thresholding and dithering); fin() copies each finished layer into a plain canvas for drawing
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); c.getContext('2d', { willReadFrequently:true }); return c; };
const mkF = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
function fin(v){ if(v instanceof HTMLCanvasElement){ const c = mkF(v.width, v.height), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(v, 0, 0); return c; }
  if(Array.isArray(v)) return v.map(fin); return v; }
const ctx = c => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; };
const RGB = {}; const rgb = h => typeof h !== 'string' || h[0] !== '#' || h.length < 7 ? null : RGB[h] || (RGB[h] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));   // bad input -> null (the caller skips the pixel), never a throw
function rnd(seed){ let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);       // ordered dither (fine screentone)
const DOT = [12, 5, 6, 13, 4, 0, 1, 7, 11, 3, 2, 8, 15, 10, 9, 14].map(v => (v + .5) / 16);       // clustered dot (halftone dots)
const stepq = (p, n) => Math.floor(Math.max(0, Math.min(1, p)) * n) / n;
const clamp01 = v => Math.max(0, Math.min(1, v));

// threshold a canvas's alpha to 1 bit, so nothing antialiased survives
function bin(c, thr){ thr = thr || 128; const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  for(let i = 3; i < d.length; i += 4) d[i] = d[i] >= thr ? 255 : 0; g.putImageData(im, 0, 0); return c; }
// draw with paths on a scratch layer, threshold it, then lay it onto c (each colour pass stays a flat colour)
function pass(c, fn, thr){ const t = mk(c.width, c.height), g = ctx(t); fn(g, t); bin(t, thr); ctx(c).drawImage(t, 0, 0); return c; }

/* masks: { w, h, d:Uint8Array of 0/1 } */
function maskOf(c, thr){ thr = thr || 128; const d0 = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, d = new Uint8Array(c.width * c.height);
  for(let i = 0; i < d.length; i++) d[i] = d0[i * 4 + 3] >= thr ? 1 : 0; return trim({ w:c.width, h:c.height, d }, 0); }
function trim(M, pad){ let x0 = M.w, y0 = M.h, x1 = -1, y1 = -1; for(let y = 0; y < M.h; y++) for(let x = 0; x < M.w; x++) if(M.d[y * M.w + x]){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  if(x1 < 0) return { w:1, h:1, d:new Uint8Array(1) }; const w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2, d = new Uint8Array(w * h);
  for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++) d[(y - y0 + pad) * w + x - x0 + pad] = M.d[y * M.w + x]; return { w, h, d }; }
const padM = (M, p) => { const w = M.w + p * 2, h = M.h + p * 2, d = new Uint8Array(w * h); for(let y = 0; y < M.h; y++) for(let x = 0; x < M.w; x++) d[(y + p) * w + x + p] = M.d[y * M.w + x]; return { w, h, d }; };
function grow(M, r){ const P = padM(M, r), d = new Uint8Array(P.d.length), w = P.w, h = P.h;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ if(!P.d[y * w + x]) continue;
    for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){ if(dx * dx + dy * dy > r * r + r) continue; const X = x + dx, Y = y + dy; if(X >= 0 && Y >= 0 && X < w && Y < h) d[Y * w + X] = 1; } }
  return { w, h, d }; }
const at = (M, x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h ? M.d[y * M.w + x] : 0;
const edge = (M, x, y) => M.d[y * M.w + x] && (!at(M, x - 1, y) || !at(M, x + 1, y) || !at(M, x, y - 1) || !at(M, x, y + 1));

// text -> mask. o: { vert, track, rot (radians), thr }
const TC = mk(8, 8);
function textM(str, f, px, o){ o = o || {}; const cjk = /[^\x00-\x7f]/.test(str), web = AV[f] || f === 'dot';
  if(f === 'dot' || !cjk) return rawTextM(str, web ? n => font(f, n) : FB_LAT, px, o);
  const key = f + '|' + str + '|' + (o.vert ? 'v' : 'h') + '|' + (o.rot || 0) + '|' + ((o.track || 0) / px).toFixed(2);
  if(web){ const M = rawTextM(str, n => font(f, n), px, o); gPut(key, px, M); return M; }
  const cached = gGet(key, px); if(cached) return cached;
  { const hm = handM(str, o, Math.max(1, Math.round(px / 16))); if(hm) return hm; }
  const k = Math.max(1, Math.round(px / 16)), m = rawTextM(str, FB_CJK, Math.max(10, Math.round(px / k)), Object.assign({}, o, { track:Math.round((o.track || 0) / k), max:o.max && o.max / k }));
  return trim(grow(scaleM(m, k), Math.floor(k / 3)), 0); }
/* Hand-drawn 16 px kanji for the pixel fallback, where a many-stroked glyph thresholded from a system face at 16 px breaks up (滄 has
   thirteen strokes). Drawn on the pixel grid to the fallback's own weight (two-pixel verticals, the strokes it scales and thickens like
   the rest); a string uses them only when every one of its glyphs is here, so a title never mixes the two sources. */
const HAND = {
  '滄':['.........##.....', '.##.....####....', '..##..###..###..', '....###......###', '.......######...', '##....########..', '.##...##....##..', '......########..',
        '......##........', '......##........', '.....##.######..', '...#....##..##..', '..##....##..##..', '.##.....##..##..', '.##.....######..', '##..............'],
  '竜':['.......##.......', '.......##.......', '..############..', '....##....##....', '.....##..##.....', '################', '.......##.......', '..###########...',
        '..##...##..##...', '..###########...', '..##...##..##...', '..###########...', '.......##.......', '.......##....##.', '.......##....##.', '.......########.'] };
function handM(str, o, k){ if(o.vert || o.rot) return null; const chs = [...str]; if(!chs.every(c => HAND[c])) return null;
  const tr = Math.round((o.track || 0) / k), w = chs.length * 16 + tr * (chs.length - 1), d = new Uint8Array(w * 16);
  chs.forEach((c, n) => HAND[c].forEach((row, y) => { for(let x = 0; x < 16; x++) if(row[x] === '#') d[y * w + n * (16 + tr) + x] = 1; }));
  return trim(grow(scaleM({ w, h:16, d }, k), Math.floor(k / 3)), 0); }
// text -> mask in the given face (fs(px) -> CSS font string)
function rawTextM(str, fs, px, o){ const chs = [...str], tr = o.track || 0;
  let c, g;
  if(o.vert){ c = mk(px * 1.6, chs.length * (px + tr) + px); g = ctx(c); g.font = fs(px); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    chs.forEach((ch, i) => g.fillText(ch, c.width / 2, px * .5 + i * (px + tr) + px * .3)); }
  else { const tg = TC.getContext('2d'); try{ tg.letterSpacing = tr + 'px'; }catch(e){} tg.font = fs(px); let w = tg.measureText(str).width + tr * chs.length;
    if(o.max) while(w > o.max && px > 9){ px--; tg.font = fs(px); w = tg.measureText(str).width + tr * chs.length; }
    c = mk(w + px * 1.4, px * 2.2); g = ctx(c); g.font = fs(px); try{ g.letterSpacing = tr + 'px'; }catch(e){} g.textBaseline = 'middle'; g.fillStyle = '#fff';
    if(o.rot){ g.translate(c.width / 2, c.height / 2); g.rotate(o.rot); g.textAlign = 'center'; g.fillText(str, 0, 0); } else g.fillText(str, px * .7, c.height / 2); }
  return maskOf(c, o.thr || 120); }
// the 3x5 pixel font (the director's), for the small typed lines
const F3 = { '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111',
  '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', A:'010101111101101', B:'110101110101110', C:'011100100100011',
  D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111', J:'001001001101111', K:'101101110101101',
  L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', Q:'010101101111011', R:'110101110101101', S:'011100010001110',
  T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', Z:'111001010100111', '/':'001001010100100',
  '.':'000000000000010', ' ':'000000000000000', '-':'000000111000000', ':':'000010000010000', ',':'000000000010100', "'":'010010000000000', '!':'010010010000010', '·':'000000010000000' };
function t3M(s, k){ k = k || 1; s = String(s).toUpperCase(); const w = s.length * 4 * k, h = 5 * k, d = new Uint8Array(w * h);
  [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') for(let yy = 0; yy < k; yy++) for(let xx = 0; xx < k; xx++) d[(((i / 3) | 0) * k + yy) * w + (n * 4 + i % 3) * k + xx] = 1; });
  return { w, h, d }; }

// brush treatment: nicked edges, burrs, dry-brush drag tails (to the right), splatter. Deterministic per seed.
function rough(M, seed, o){ const R = rnd(seed), p = (o.drag ? o.dragLen + 2 : 2) + (o.splat ? 6 : 0), P = padM(M, p), w = P.w, h = P.h, src = P.d, d = src.slice();
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * w + x;
    if(src[i]){ if(o.nick && edge(P, x, y) && R() < o.nick) d[i] = 0; }
    else if(o.burr && (at(P, x - 1, y) || at(P, x + 1, y) || at(P, x, y - 1) || at(P, x, y + 1)) && R() < o.burr) d[i] = 1; }
  if(o.drag) for(let y = 0; y < h; y++){ let run = 0; for(let x = 0; x < w; x++){ if(src[y * w + x]){ run++; continue; }
      if(run >= 3 && R() < o.drag){ const len = 1 + Math.floor(R() * o.dragLen); for(let k = 0; k < len && x + k < w; k++) if(R() < 1 - (k / len) * .75) d[y * w + x + k] = 1; } run = 0; } }
  if(o.splat){ let n = 0, guard = 0; while(n < o.splat && guard++ < 4000){ const x = Math.floor(R() * w), y = Math.floor(R() * h); if(!src[y * w + x] || !edge(P, x, y)) continue;
      const a = R() * 6.283, r = 3 + R() * 5, X = Math.round(x + Math.cos(a) * r), Y = Math.round(y + Math.sin(a) * r * .7); if(X < 1 || Y < 1 || X >= w - 1 || Y >= h - 1) continue;
      d[Y * w + X] = 1; if(R() < .4) d[Y * w + X + 1] = 1; n++; } }
  return { w, h, d }; }
// woodblock carving: small chisel nicks bitten into the strokes' edges (no added burrs)
function carve(M, seed, n){ const R = rnd(seed), d = M.d.slice(), w = M.w; let k = 0, guard = 0;
  while(k < n && guard++ < 20000){ const x = Math.floor(R() * w), y = Math.floor(R() * M.h); if(!edge(M, x, y)) continue; const dx = R() < .5 ? 1 : -1;
    d[y * w + x] = 0; if(R() < .5 && x + dx >= 0 && x + dx < w) d[y * w + x + dx] = 0; k++; } return { w, h:M.h, d }; }
// whole-pixel upscale (DotGothic16 at 16 px stays crisp at any integer multiple)
function scaleM(M, k){ if(k <= 1) return M; const w = M.w * k, h = M.h * k, d = new Uint8Array(w * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) d[y * w + x] = M.d[((y / k) | 0) * M.w + ((x / k) | 0)]; return { w, h, d }; }
// italic shear for speed type
function shear(M, k){ const ex = Math.ceil(M.h * Math.abs(k)), w = M.w + ex, d = new Uint8Array(w * M.h);
  for(let y = 0; y < M.h; y++){ const sx = Math.round((M.h - 1 - y) * k); for(let x = 0; x < M.w; x++) if(M.d[y * M.w + x]) d[y * w + x + sx] = 1; } return { w, h:M.h, d }; }
// speed slits: clear whole rows (Kamen-Rider-style cuts that read as motion)
function slit(M, rows){ const d = M.d.slice(); for(const [y, x0f] of rows){ const Y = Math.round(y * M.h); for(let x = Math.round(x0f * M.w); x < M.w; x++) d[Y * M.w + x] = 0; } return { w:M.w, h:M.h, d }; }

// paint a mask: col is '#hex' or fn(x, y) -> '#hex'
function paint(M, col){ const c = mk(M.w, M.h), g = c.getContext('2d'), im = g.createImageData(M.w, M.h), D = im.data, f = typeof col === 'function' ? col : null, c0 = f ? null : rgb(col);
  for(let y = 0; y < M.h; y++) for(let x = 0; x < M.w; x++){ const i = y * M.w + x; if(!M.d[i]) continue; const v = f ? rgb(f(x, y)) : c0; if(!v) continue; D[i * 4] = v[0]; D[i * 4 + 1] = v[1]; D[i * 4 + 2] = v[2]; D[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0); return c; }
const bands = (cols, h, skew) => (x, y) => cols[Math.min(cols.length - 1, Math.max(0, Math.floor(((y + (skew ? x * skew : 0)) / h) * cols.length)))];
// a lettering block: fill (mask) + outlines + a hard drop shadow. o: { fill, line, lw, line2, lw2, sh, sx, sy }
function inked(M, o){ const lw = o.lw || 0, lw2 = o.lw2 || 0, R = lw + lw2, sx = o.sx || 0, sy = o.sy || 0;
  const c = mk(M.w + R * 2 + Math.abs(sx), M.h + R * 2 + Math.abs(sy)), g = ctx(c), ox = sx < 0 ? -sx : 0, oy = sy < 0 ? -sy : 0;
  if(o.sh){ g.drawImage(paint(grow(M, R), o.sh), ox + sx, oy + sy); }
  if(lw2) g.drawImage(paint(grow(M, R), o.line2), ox, oy);
  if(lw) g.drawImage(paint(grow(M, lw), o.line), ox + lw2, oy + lw2);
  g.drawImage(paint(M, o.fill), ox + R, oy + R); return c; }
// the impact frame of a slam: the art lit 60% toward white (built once, with the layers). It was a pure white silhouette, which read as a
// blank shape on the first frames (MATSURI's crest as a solid white disc): now the kanji and the crest's art are there from frame 1.
const whiteOf = c => { const w = mk(c.width, c.height), g = ctx(w); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .6; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w.width, w.height); return w; };
// screentone: lev(x, y) 0..1 coverage, kind 'bay' (fine) or 'dot' (halftone dots)
function tone(c, col, lev, kind, x0, y0, w, h){ x0 = x0 || 0; y0 = y0 || 0; w = w || c.width; h = h || c.height;
  const v = rgb(col); if(!v || w <= 0 || h <= 0) return c; const g = c.getContext('2d'), im = g.getImageData(x0, y0, w, h), D = im.data, T = kind === 'dot' ? DOT : BAY;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const l = lev(x + x0, y + y0); if(l <= 0) continue; if(l >= 1 || T[((y + y0) & 3) * 4 + ((x + x0) & 3)] < l){ const i = (y * w + x) * 4; D[i] = v[0]; D[i + 1] = v[1]; D[i + 2] = v[2]; D[i + 3] = 255; } }
  g.putImageData(im, x0, y0); return c; }
// focus lines (manga 集中線): wedges from radius r0 out past the corners, thresholded
const focusDraw = (c, fx, fy, n, col, seed, r0, wid, jit) => g => { const R = rnd(seed), far = Math.hypot(c.width, c.height); g.fillStyle = col; g.beginPath();
    for(let i = 0; i < n; i++){ const a = (i + R() * (jit || .8)) / n * 6.2832, ri = r0 * (1 + R() * .55), ww = wid * (.35 + R()), ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
      g.moveTo(fx + ca * ri, fy + sa * ri * .78); g.lineTo(fx + ca * far + nx * ww, fy + sa * far * .78 + ny * ww); g.lineTo(fx + ca * far - nx * ww, fy + sa * far * .78 - ny * ww); g.closePath(); }
    g.fill(); };
function focus(c, fx, fy, n, col, seed, r0, wid, jit){ return pass(c, focusDraw(c, fx, fy, n, col, seed, r0, wid, jit)); }
// stepped twins of tone / pass / focus for the cards' generator builds (first 60 s): the same pixels, worked in bands of rows with a yield
// between bands (tone and the threshold are per pixel, so a band is exact)
const BAND = 40;
function* toneG(c, col, lev, kind, x0, y0, w, h){ x0 = x0 || 0; y0 = y0 || 0; w = w || c.width; h = h || c.height; if(!rgb(col) || w <= 0 || h <= 0) return c;
  for(let b = 0; b < h; b += BAND){ tone(c, col, lev, kind, x0, y0 + b, w, Math.min(BAND, h - b)); if(b + BAND < h) yield; } return c; }
function* binG(c, thr){ thr = thr || 128; const g = c.getContext('2d');
  for(let b = 0; b < c.height; b += BAND){ const bh = Math.min(BAND, c.height - b), im = g.getImageData(0, b, c.width, bh), d = im.data; for(let i = 3; i < d.length; i += 4) d[i] = d[i] >= thr ? 255 : 0; g.putImageData(im, 0, b); yield; } return c; }
function* passG(c, fn, thr){ const t = mk(c.width, c.height), g = ctx(t); fn(g, t); yield; yield* binG(t, thr); ctx(c).drawImage(t, 0, 0); return c; }
function* inkedG(M, o){ const lw = o.lw || 0, lw2 = o.lw2 || 0, R = lw + lw2, sx = o.sx || 0, sy = o.sy || 0;   // inked(), a layer per step
  const c = mk(M.w + R * 2 + Math.abs(sx), M.h + R * 2 + Math.abs(sy)), g = ctx(c), ox = sx < 0 ? -sx : 0, oy = sy < 0 ? -sy : 0;
  if(o.sh){ g.drawImage(paint(grow(M, R), o.sh), ox + sx, oy + sy); yield; }
  if(lw2){ g.drawImage(paint(grow(M, R), o.line2), ox, oy); yield; }
  if(lw){ g.drawImage(paint(grow(M, lw), o.line), ox + lw2, oy + lw2); yield; }
  g.drawImage(paint(M, o.fill), ox + R, oy + R); return c; }
function* focusG(c, fx, fy, n, col, seed, r0, wid, jit){ return yield* passG(c, focusDraw(c, fx, fy, n, col, seed, r0, wid, jit)); }
// a jagged (torn-paper) polyline edge between x0..x1 at y, amplitude a
function tornPath(g, x0, x1, y, a, seed, down){ const R = rnd(seed); let x = x0; g.lineTo(x0, y); while(x < x1){ x += 3 + R() * 6; g.lineTo(Math.min(x, x1), y + (R() - .5) * 2 * a); } }

/* ================================================================== draw-time helpers (no allocation) */
const B = (g, c, x, y) => { if(c) g.drawImage(c, Math.round(x), Math.round(y)); };
// stamp scaled about its centre (nearest), the slam
const BS = (g, c, cx0, cy0, s) => { const w = Math.round(c.width * s), h = Math.round(c.height * s); g.drawImage(c, Math.round(cx0 - w / 2), Math.round(cy0 - h / 2), w, h); };
// a slam: big and white on the first frames, then overshoot, then home. returns [canvas, scale]
function slam(t, t0, c, cw){ const k = t - t0; if(k < 0) return null; if(k < .05) return [cw, 1.7]; if(k < .1) return [cw, 1.3]; if(k < .14) return [c, .94]; return [c, 1]; }
let SHK = 0; const kick = n => { if(!reduce && typeof shake !== 'undefined') shake = Math.max(shake || 0, n); };

/* ================================================================== the cards
   build(cw, ch, nar) -> layers; draw(g, t, L, rm): the content at card time t (the exit is applied around it). hold: the frame
   reduced motion shows. Each card names its palette in its comment. */
const PAL = {};
const CARDS = {};
const idOfKanji = {};

/* ---------------------------------------------------------------- kaiju: tokusatsu title. red / black / cream / oxblood / sail amber */
CARDS.kaiju = { dur:2.1, out:.36, exit:'split', hold:1.2, kanji:['怪獣', '怪獣決戦'],
  *build(cw, ch, nar){ const L = {}, K = { ink:'#0a0608', red:'#d0102a', dark:'#5a0410', cream:'#f4ecdf', amber:'#ffb030' }; yield;
    // SPARSE (the INFERNO model): type and graphics live at the top and the edges, the middle stays open over the road and the bike.
    // top third: a slanted red screentone swipe behind the brushed title; the titan in a small halftone sun at the right edge; ゴゴゴ
    // as a column at the left edge; a faint oxblood dot vignette in the corners, nothing over the centre.
    const PH = Math.round(ch * (nar ? .34 : .36)); yield; L.PH = PH; yield; const split = cw * .6, sl = ch * .14; yield;
    const bg = mk(cw, ch); yield;
    yield* toneG(bg, K.dark, (x, y) => { const r = Math.hypot((x - cw / 2) / (cw * .5), (y - ch * .45) / (ch * .55)); return r < .85 ? 0 : Math.min(.55, (r - .85) * 1.6); }, 'dot'); yield;   // corner vignette
    // the swipe: a slanted band of red halftone with solid edges, under the title only
    const sw0 = Math.round(ch * (nar ? .1 : .14)), sw1 = Math.round(ch * (nar ? .3 : .34)), swR = nar ? cw * 1.1 : cw * .72, sk = (sw1 - sw0) * .45; yield;
    yield* toneG(bg, K.red, (x, y) => y >= sw0 && y < sw1 && x < swR - (y - sw0) * .45 ? .55 : 0, 'dot'); yield;
    yield* passG(bg, g => { g.fillStyle = K.red; g.beginPath(); g.moveTo(0, sw0 - 3); g.lineTo(swR + 3, sw0 - 3); g.lineTo(swR, sw0); g.lineTo(0, sw0); g.fill(); g.beginPath(); g.moveTo(0, sw1); g.lineTo(swR - sk, sw1); g.lineTo(swR - sk - 2, sw1 + 3); g.lineTo(0, sw1 + 3); g.fill(); }); yield;
    yield* passG(bg, g => { g.fillStyle = K.ink; g.fillRect(0, sw1 + 3, Math.round(swR - sk - 2), 1); }); yield;
    // the small halftone sun at the right edge (partly off-frame), below the HUD's checkpoint panel
    const dr = Math.round(Math.min(ch * (nar ? .085 : .21), cw * (nar ? .25 : .16))), dcx = Math.round(cw - dr * (nar ? .9 : .8)), dcy = Math.round(nar ? ch * .5 : ch * .44); yield;
    yield* toneG(bg, K.red, (x, y) => Math.hypot(x - dcx, y - dcy) < dr * 1.1 ? 1 : 0, 'dot', Math.floor(dcx - dr * 1.2), Math.floor(dcy - dr * 1.2), Math.ceil(dr * 2.4), Math.ceil(dr * 2.4)); yield;
    yield* toneG(bg, K.cream, (x, y) => { const r = Math.hypot(x - dcx, y - dcy) / dr; return r > 1 ? 0 : r < .45 ? 1 : 1 - (r - .45) / .55; }, 'dot', Math.floor(dcx - dr), Math.floor(dcy - dr), Math.ceil(dr * 2), Math.ceil(dr * 2)); yield;
    yield* passG(bg, g => { g.strokeStyle = K.ink; g.lineWidth = 2; g.beginPath(); g.arc(dcx, dcy, dr * 1.1 + 1, 0, 6.2832); g.stroke(); }); yield;
    const bil = paint(textM('東京湾 大怪獣', 'dot', 16, { track:2 }), K.cream); yield;
    L.bg = bg; yield; L.dcx = dcx; yield; L.dcy = dcy; yield; L.dr = dr; yield; L.sw0 = sw0; yield;
    // the titan: OUR Sairyū as the ride shows it, composed from setpiece/kaiju.js's stacked titan (each part's front view: the tail lashing
    // high, the body with its fanned Dimetrodon sail and amber rib tips, the head roaring with its long crested snout, nose horn and frills,
    // the arm wound back). He wades: the bay cuts him at the thigh, so no legs or feet show; a foam band where he meets it, a dark broken
    // reflection below. Animated while the card holds (draw): the water laps in three frames, he breathes a pixel, the rib tips flicker
    // with the charge, embers drift up, a searchlight sweeps behind him. Reduced motion: one held frame.
    L.sil = null; yield; L.ribs = null; yield; L.refl = null; yield;
    try{ const KS = MECH.sp_kaiju; yield; if(KS && KS.titanSteps) yield* KS.titanSteps(); else if(KS && KS.warm) KS.warm(); yield; const TT = KS && KS.TT && KS.TT.s, CT = KS && KS.cardTitan ? KS.cardTitan() : null; yield;
      const parts = CT ? [{ st:CT, L:CT.L[CT.L.length - 1] }] : []; yield;
      { const F = KS && KS.TT && KS.TT.f, P = F && F.parts.claw, st = P && (P.poses.strike || P.poses[P.pose]); yield; L.clawSt = st ? { st, L:st.L[st.L.length - 1] } : null; yield; } yield;
      if(parts.length >= 1){ let X0 = 1e9, X1 = -1e9, Y1 = -1e9; yield; for(const q of parts){ X0 = Math.min(X0, q.st.x0); X1 = Math.max(X1, q.st.x0 + q.st.w); Y1 = Math.max(Y1, q.st.y0 + q.st.h); } yield;
        const WL = 40, w = X1 - X0, h = Y1 - WL, comp = mk(w, h), cg = ctx(comp); yield;   /* the water line at model height 46: the body rides on it, the legs under it */
        for(const q of parts){ const top = Y1 - (q.st.y0 + q.st.h); cg.drawImage(q.L.cv, 0, 0, q.st.w, q.st.h, q.st.x0 - X0, top, q.st.w, q.st.h); } yield;
        const sd = cg.getImageData(0, 0, w, h).data, fit = Math.min(dr * 1.3 / h, dr * 2.15 / w), k = Math.max(1, Math.floor(fit)); yield;
        const sil = mk(w * k, h * k), sg = ctx(sil), rb = mk(w * k, h * k), rg = ctx(rb), mem = '#4a1a5a', lum = (r, g2, b) => r * .3 + g2 * .59 + b * .11; yield;
        for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = (y * w + x) * 4; if(sd[i + 3] < 128) continue; const r = sd[i], g2 = sd[i + 1], b = sd[i + 2], X = (w - 1 - x) * k, Y = y * k;
          if(r > 200 && g2 > 190 && b < 140){ sg.fillStyle = K.amber; sg.fillRect(X, Y, k, k); continue; }   // the eye
          if(r > 200 && g2 > 120 && b < 110){ rg.fillStyle = K.amber; rg.fillRect(X, Y, k, k); sg.fillStyle = K.dark; sg.fillRect(X, Y, k, k); continue; }   // a rib tip (charge layer)
          const col = r > g2 * 1.8 && b > g2 * 1.6 ? mem : (r > b * 1.25 && r > 70) ? K.red : lum(r, g2, b) > 150 ? K.cream : K.ink;   // sail membrane, fire rim, moon rim, the body
          sg.fillStyle = col; sg.fillRect(X, Y, k, k); } yield;
        // the reflection: the lowest rows, flipped, broken into dithered rows, darker
        const rh = Math.min(h, Math.round(h * .35)), refl = mk(w * k, rh * k), fg = ctx(refl); yield;
        for(let y = 0; y < rh; y++){ if(y % 2) continue; for(let x = 0; x < w; x++){ const i = ((h - 1 - y) * w + x) * 4; if(sd[i + 3] < 128 || (x + y) % 3 === 0) continue; fg.fillStyle = y < rh * .4 ? '#3a0a18' : '#24060e'; fg.fillRect((w - 1 - x) * k, y * k, k, k); } } yield;
        L.sil = sil; yield; L.ribs = rb; yield; L.refl = refl; yield; L.k = k; yield;
        if(fit < 1){ const hv = c => { const o = mk(Math.ceil(c.width / 2), Math.ceil(c.height / 2)), og = ctx(o); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, o.width, o.height); bin(o); return o; }; yield; L.sil = hv(sil); yield; L.ribs = hv(rb); yield; L.refl = hv(refl); yield; } yield;   /* narrow screens: half scale */
        const sw2 = L.sil.width, sh2 = L.sil.height; yield; L.silX = Math.round(dcx - sw2 * .42); yield; L.wlY = Math.round(dcy + dr * .42); yield; L.silY = L.wlY - sh2; yield;
        if(L.clawSt){ const cs = L.clawSt, cw2 = cs.st.w, ch2 = cs.st.h, cc = mk(cw2, ch2), ccg = ctx(cc); yield; ccg.drawImage(cs.L.cv, 0, 0, cw2, ch2, 0, 0, cw2, ch2); yield; const cd = ccg.getImageData(0, 0, cw2, ch2).data, ratio = L.sil.width / w * cs.st.vs / 125, ck = Math.max(1, Math.round(ratio)), stp = ratio < 1 ? Math.max(1, Math.round(1 / ratio)) : 1; yield;   /* (the claw's voxels are finer: scaled to the titan's) */
          const cl = mk(Math.ceil(cw2 / stp * ck), Math.ceil(ch2 / stp * ck)), clg = ctx(cl); yield; for(let y = 0; y < ch2; y += stp) for(let x = 0; x < cw2; x += stp){ const i = (y * cw2 + x) * 4; if(cd[i + 3] < 128) continue; const r = cd[i], g2 = cd[i + 1], b = cd[i + 2]; clg.fillStyle = g2 > r * 1.2 && b > r ? '#0e2a2a' : r > b * 1.25 && r > 70 ? K.red : (r * .3 + g2 * .59 + b * .11) > 140 ? '#8af0e0' : K.ink; clg.fillRect(Math.floor((cw2 - 1 - x) / stp) * ck, Math.floor(y / stp) * ck, ck, ck); } yield;
          L.claw = cl; yield; L.clawX = Math.round(Math.max(dcx - dr * 1.02, L.silX - cl.width * .62)); yield; L.clawY = Math.round(L.wlY - cl.height * .9); yield; } yield; } yield; }
    catch(e){ console.warn('cutin kaiju titan', e); yield; L.sil = null; yield; } yield;
    // 怪獣決戦: brushed (Potta), red with a ragged cream paper border and a hard black shadow
    const ks = nar ? Math.round(Math.min((cw - 10) / 4, ch * .11)) : Math.round(Math.min(ch * .17, cw * .14)), two = false; yield;
    let km = two ? null : textM('怪獣決戦', 'potta', ks, { track:-Math.round(ks * .04) }); yield;
    if(two){ const a = textM('怪獣', 'potta', ks), b = textM('決戦', 'potta', ks), w = Math.max(a.w, b.w), gap = Math.round(ks * .08), M = { w, h:a.h + b.h + gap, d:new Uint8Array(w * (a.h + b.h + gap)) }; yield;
      for(let y = 0; y < a.h; y++) for(let x = 0; x < a.w; x++) M.d[y * w + x] = a.d[y * a.w + x]; yield; for(let y = 0; y < b.h; y++) for(let x = 0; x < b.w; x++) M.d[(y + a.h + gap) * w + x] = b.d[y * b.w + x]; yield; km = M; yield; } yield;
    km = nar ? rough(km, 7, { nick:.06, burr:.03, drag:.1, dragLen:2 }) : rough(km, 7, { nick:.18, burr:.12, drag:.22, dragLen:Math.round(ks * .18), splat:10 }); yield;   // phones: a cleaner brush, so the small strokes stay open
    L.kj = nar ? (yield* inkedG(km, { fill:K.red, line:K.cream, lw:1, line2:K.ink, lw2:1, sh:K.dark, sx:2, sy:2 })) : (yield* inkedG(km, { fill:K.red, line:K.cream, lw:2, line2:K.ink, lw2:1, sh:K.dark, sx:3, sy:3 })); yield; L.kjW = whiteOf(L.kj); yield;
    L.kx = nar ? Math.round(cw / 2 - L.kj.width / 2) : Math.round(cw * .05); yield; L.ky = Math.round((sw0 + sw1) / 2 - L.kj.height / 2); yield;
    L.bil = bil; yield; L.bx = L.kx + 2; yield; L.by = Math.max(2, sw0 - bil.height - 4); yield;
    // English title + the stylised subtitle line
    const tpx = Math.round(Math.min(ch * .06, cw * (nar ? .08 : .045))), tm = textM('KAIJU SHOWDOWN', 'dela', tpx, { track:1 , max:cw - 12 }); yield;
    L.ti = (yield* inkedG(tm, { fill:K.cream, line:K.ink, lw:1, sh:K.red, sx:2, sy:2 })); yield; L.tx = nar ? Math.round(cw / 2 - L.ti.width / 2) : L.kx + 2; yield; L.ty = sw1 + 6; yield;
    { const st = paint(t3M(nar ? 'BAY BRIDGE' : 'SAIRYU VS KANIGARU  //  BAY BRIDGE'), K.cream), tp = mk(st.width + 10, 9), tg = ctx(tp); yield; tg.fillStyle = K.red; yield; tg.fillRect(0, 0, tp.width, 9); yield; tg.fillStyle = K.ink; yield; tg.fillRect(0, 8, tp.width, 1); yield; tg.drawImage(st, 5, 2); yield; L.sub = tp; yield; } yield; L.sx = nar ? Math.round(cw / 2 - L.sub.width / 2) : L.tx; yield; L.sy = L.ty + L.ti.height + 2; yield;
    // ゴゴゴ, three sizes, oxblood with a cream rim: the menace hum
    L.go = [1, .86, .72].map((k, i) => inked(rough(textM('ゴ', 'potta', Math.round(ch * (nar ? .065 : .1) * k), {}), 30 + i, { nick:.1, burr:.1 }), { fill:K.dark, line:K.cream, lw:2, line2:K.ink, lw2:1, sh:K.ink, sx:2, sy:2 })); yield;
    { let y = Math.round(ch * (nar ? .36 : .4)); yield; L.goP = L.go.map((c, i) => { const p = [4 + (i % 2) * 3, y]; y += c.height - 2; return p; }); yield; } yield;   // a ゴゴゴ column down the left edge
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: the panel wipes in from the left in four hard steps
    const w = rm ? 1 : stepq(t / .14, 4); if(w <= 0) return;
    g.save(); g.beginPath(); g.rect(0, 0, Math.ceil(cw * w), ch); g.clip();
    B(g, L.bg, 0, 0);
    // the titan rises out of the sun's lower rim, ribs charging amber
    // ゴゴゴ, one by one, each humming a pixel: set BEHIND the titan (the menace hum), so the sail silhouette stays whole in front of it
    for(let i = 0; i < 3; i++){ if(!rm && t < .32 + i * .08) continue; const j = rm ? 0 : (Math.floor(t * 20 + i) % 2), p = L.goP[i]; B(g, L.go[i], p[0] + j, p[1] - (i === 1 ? j : 0)); }
    const rise = rm || !L.sil ? 0 : Math.round((1 - stepq((t - .08) / .3, 5)) * L.sil.height * .55), f3 = rm ? 0 : Math.floor(t * 7) % 3, br = rm ? 0 : (Math.floor(t * 2.2) % 2) * Math.max(1, L.k || 1);
    g.save(); g.beginPath(); g.arc(L.dcx, L.dcy, L.dr * 1.1, 0, 6.2832); g.rect(L.dcx - L.dr * 1.6, L.dcy - L.dr * 1.9, L.dr * 3.2, L.dr * 1.9); g.clip();
    if(L.sil){ const wl = L.wlY;
      // a searchlight sweeping behind him: a pale wedge in hard steps
      { const a = rm ? -1.9 : -2.5 + Math.round(Math.sin(t * 1.6) * 6) / 6 * .7, len = L.dr * 2.4, sx = L.dcx + L.dr * .9, sy = wl; g.save(); g.globalAlpha = .22; g.fillStyle = '#f4ecdf'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a - .09) * len, sy + Math.sin(a - .09) * len); g.lineTo(sx + Math.cos(a + .09) * len, sy + Math.sin(a + .09) * len); g.closePath(); g.fill(); g.restore(); }
      g.save(); g.beginPath(); g.rect(L.dcx - L.dr * 1.6, L.dcy - L.dr * 2, L.dr * 3.2, wl - (L.dcy - L.dr * 2)); g.clip();
      if(L.claw){ const jab = rm ? 0 : [0, 1, 2, 1][Math.floor(t * 5) % 4] * Math.max(1, L.k || 1); B(g, L.claw, L.clawX + jab, L.clawY + rise); }
      B(g, L.sil, L.silX, L.silY + rise + br); if(L.ribs && (rm || t > .45) && (rm || Math.floor(t * 9) % 3 !== 1)) B(g, L.ribs, L.silX, L.silY + rise + br); g.restore();
      // the bay: dark water below the line, his broken reflection, and the foam band lapping against him in three frames
      g.fillStyle = '#1a0206'; g.fillRect(L.dcx - L.dr * 1.6, wl, L.dr * 3.2, L.dr * 2); if(L.refl) B(g, L.refl, L.silX + (f3 - 1), wl + 2);
      const fw = L.sil.width, fx0 = L.silX + Math.round(fw * .1), fx1 = L.silX + Math.round(fw * .85); g.fillStyle = K.cream;
      for(let x = fx0; x < fx1; x += 2){ const hgt = ((x >> 1) + f3) % 3; g.fillRect(x, wl - (hgt === 0 ? 1 : 0), 2, hgt === 2 ? 1 : 2); }
      g.fillStyle = '#f4ecdf'; for(let x = L.dcx - L.dr * 1.1; x < L.dcx + L.dr * 1.1; x += 6){ if(((x / 6 | 0) + f3) % 3 === 0) g.fillRect(Math.round(x), wl + 4 + ((x / 6 | 0) % 2) * 3, 3, 1); }
      // embers drifting up from the burning bay
      g.fillStyle = K.amber; for(let i = 0; i < 6; i++){ const ph = rm ? (i / 6) : ((t * .6 + i / 6) % 1), ex = L.dcx - L.dr * .7 + ((i * 37) % 100) / 100 * L.dr * 1.4 + Math.round(Math.sin(ph * 6 + i) * 2), ey = wl - ph * L.dr * 1.5; if(ph > .05 && ph < .9) g.fillRect(Math.round(ex), Math.round(ey), 2, 2); } }
    g.restore();
    B(g, L.bil, L.bx, L.by);
    g.restore();
    // the kanji slams down
    const S = rm ? [L.kj, 1] : slam(t, .1, L.kj, L.kjW); if(S){ if(!rm && t >= .19 && !L.hit){ L.hit = true; kick(7); } BS(g, S[0], L.kx + L.kj.width / 2, L.ky + L.kj.height / 2, S[1]); }
    if(rm || t > .22){ const sl = rm ? 0 : Math.round((1 - stepq((t - .22) / .1, 4)) * 40); B(g, L.ti, L.tx + sl, L.ty); }
    if(rm || t > .3){ const n = rm ? L.sub.width : Math.min(L.sub.width, Math.floor((t - .3) / .012) * 4); if(n > 0) g.drawImage(L.sub, 0, 0, n, L.sub.height, L.sx, L.sy, n, L.sub.height); }
  } };

/* ---------------------------------------------------------------- greatwave: Hokusai woodblock. Prussian x3 / paper / foam / seal red */
CARDS.greatwave = { dur:2.15, out:.38, exit:'slash', hold:1.2, slashCol:'#f8f4e8', kanji:['大波'],
  *build(cw, ch, nar){ const L = {}, K = { deep:'#0b2350', mid:'#1f4f8a', light:'#7fb0d4', paper:'#efe4c8', foam:'#fbf8ee', ink:'#14244a', seal:'#c0392a' }; yield;
    // SPARSE (the INFERNO model): no paper block, no half-screen wave. A claw-wave border instead: the Great Wave rises up the left edge
    // and curls into the top-left corner, and a frieze of crests hangs along the top edge (the barrel's lip overhead) with spray falling
    // from it. The print's thin double border frames the screen; the middle is the open scene.
    const bg = mk(cw, ch), band = Math.round(ch * (nar ? .2 : .26)); yield;
    yield* passG(bg, g => { g.fillStyle = K.ink; g.fillRect(0, 0, cw, 2); g.fillRect(0, 0, 2, ch); g.fillRect(cw - 2, 0, 2, ch); g.fillRect(0, ch - 2, cw, 2);
      g.fillRect(4, 4, cw - 8, 1); g.fillRect(4, 4, 1, ch - 8); g.fillRect(cw - 5, 4, 1, ch - 8); g.fillRect(4, ch - 5, cw - 8, 1); }); yield;
    // the corner wave: a small spiral rising from the left edge, cresting at the top and hooking down into its own hollow
    const xc = cw * (nar ? .16 : .1), yc = ch * (nar ? .2 : .25), R0 = Math.min(ch * (nar ? .16 : .23), cw * (nar ? .2 : .14)), T0 = R0 * .42, a0 = Math.PI * .97, a1 = Math.PI * 2.42, N = 240; yield;
    const pt = s => { const a = a0 + (a1 - a0) * s, R = R0 * (1 - .62 * s); return [xc + Math.cos(a) * R, yc + Math.sin(a) * R, a]; }; yield;
    const th = s => T0 * Math.pow(1 - s, .9) + 1.2; yield;
    yield* passG(bg, g => { g.fillStyle = K.deep; g.beginPath(); const [bx, by] = pt(0); g.moveTo(0, by - th(0) * .2); g.lineTo(bx + th(0) * .8, by); g.quadraticCurveTo(bx + th(0) * .9, ch * .7, 0, ch * (nar ? .55 : .75)); g.fill();
      for(let i = 0; i <= N; i++){ const s = i / N, [x, y] = pt(s); g.beginPath(); g.arc(x, y, th(s), 0, 6.2832); g.fill(); } }); yield;
    for(const [off, col, w0, s0, s1] of [[.6, K.mid, 1.6, 0, .8], [.15, K.light, 1, .05, .8], [-.35, K.mid, 1, 0, .7], [.85, K.light, 1, .15, .9]])
      yield* passG(bg, g => { g.strokeStyle = col; g.lineWidth = w0; g.beginPath(); for(let i = Math.round(s0 * N); i <= N * s1; i++){ const s = i / N, [x, y, a] = pt(s), r = th(s) * off; const X = x + Math.cos(a) * r, Y = y + Math.sin(a) * r; i === Math.round(s0 * N) ? g.moveTo(X, Y) : g.lineTo(X, Y); } g.stroke(); }); yield;
    const crest = (col, grow) => pass(bg, g => { g.fillStyle = col; for(let i = Math.round(N * .22); i <= N; i++){ const s = i / N, [x, y, a] = pt(s), r = th(s), w = 1 + 1.8 * Math.min(1, (s - .22) * 3); g.beginPath(); g.arc(x + Math.cos(a) * (r - w * .5), y + Math.sin(a) * (r - w * .5), w + grow, 0, 6.2832); g.fill(); } }); yield;
    const claws = (col, grow) => pass(bg, g => { g.strokeStyle = col; g.lineCap = 'round'; const R = rnd(12);
      for(let s = .3; s <= 1.001; s += .06){ const [x, y, a] = pt(Math.min(s, 1)), r = th(s), ox = x + Math.cos(a) * r, oy = y + Math.sin(a) * r, tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a), k = ch * (.016 + .026 * s);
        for(let f = 0; f < 4; f++){ const sp = (f - 1.5) * .45; g.lineWidth = (f === 1 ? 1.8 : 1.2) + grow; g.beginPath(); g.moveTo(ox, oy);
          const ex = ox + nx * k * (1 + R() * .3) + tx * k * (.6 + sp), ey = oy + ny * k * (1 + R() * .3) + ty * k * (.6 + sp);
          g.quadraticCurveTo(ex + tx * k * .5, ey + ty * k * .5, ex + tx * k * .35 - nx * k * .45, ey + ty * k * .35 - ny * k * .45); g.stroke(); } } }); yield;
    // the frieze along the top: a Prussian lip with a scalloped underside, each scallop ending in a hooked claw that curls forward and down
    const fx0 = xc + R0 * .55, fx1 = nar ? cw - 4 : cw * .8, fy = Math.round(ch * (nar ? .035 : .05)), P = Math.max(18, Math.round(ch * .1)), crests = []; yield;
    for(let x = fx0; x < fx1 - P * .4; x += P) crests.push(x); yield;
    yield* passG(bg, g => { g.fillStyle = K.deep; g.beginPath(); g.moveTo(fx0 - P, 0); g.lineTo(fx1, 0); g.lineTo(fx1, fy * .6);
      for(let i = crests.length - 1; i >= 0; i--){ const x = crests[i]; g.quadraticCurveTo(x + P * .55, fy * 1.1, x + P * .35, fy * 2.1); g.quadraticCurveTo(x + P * .05, fy * 1.6, x - P * .3, fy * .9); }
      g.lineTo(fx0 - P, fy * .9); g.fill(); }); yield;
    yield* passG(bg, g => { g.strokeStyle = K.light; g.lineWidth = 1; g.beginPath(); g.moveTo(fx0, fy * .45); g.lineTo(fx1, fy * .45); g.stroke(); g.strokeStyle = K.mid; g.beginPath(); g.moveTo(fx0 - P * .5, fy * .8); g.lineTo(fx1, fy * .75); g.stroke(); }); yield;
    const frieze = (col, grow) => pass(bg, g => { g.strokeStyle = col; g.lineCap = 'round'; const R = rnd(31);
      for(const x of crests){ const ox = x + P * .35, oy = fy * 2.1, k = ch * .022;
        g.lineWidth = 1.8 + grow; g.beginPath(); g.moveTo(x - P * .3, fy * .9); g.quadraticCurveTo(x + P * .2, fy * 1.2, ox, oy); g.stroke();   // the foam lip of each crest
        for(let f = 0; f < 3; f++){ g.lineWidth = (f === 1 ? 1.6 : 1.1) + grow; g.beginPath(); g.moveTo(ox, oy); const ex = ox + k * (.5 + f * .35), ey = oy + k * (.7 + R() * .4);
          g.quadraticCurveTo(ex + k * .5, ey + k * .1, ex + k * .15, ey + k * .6); g.stroke(); } } }); yield;
    claws(K.deep, 2); yield; crest(K.deep, 1); yield; frieze(K.deep, 2); yield; crest(K.foam, 0); yield; claws(K.foam, 0); yield; frieze(K.foam, 0); yield;
    // spray: foam specks thrown off the crests into the frame's top, each keylined so it reads over any sky
    { const R = rnd(5), G = ctx(bg); yield; const dot = (X, Y, z) => { G.fillStyle = K.deep; G.fillRect(X - 1, Y - 1, z + 2, z + 2); G.fillStyle = K.foam; G.fillRect(X, Y, z, z); }; yield;
      for(let i = 0; i < 110; i++){ const s = .3 + R() * .7, [x, y, a] = pt(s), r = th(s) + 3 + R() * ch * .06; dot(Math.round(x + Math.cos(a) * r + R() * 8), Math.round(y + Math.sin(a) * r), R() < .3 ? 2 : 1); } yield;
      for(let i = 0; i < 70; i++){ const x = fx0 + R() * (fx1 - fx0), y = fy * 2 + R() * R() * ch * .1; dot(Math.round(x), Math.round(y), R() < .25 ? 2 : 1); } yield; } yield;
    // a faint Prussian screentone along the top edge, under the frieze, fading out well above the road
    yield* toneG(bg, K.mid, (x, y) => y < band * .7 && x > fx0 - P && x < fx1 ? .25 * (1 - y / (band * .7)) : 0, 'bay'); yield;
    L.bg = bg; yield;
    // 大波 in carved woodblock type inside the vertical title cartouche (double ruled) with the subtitle column and a red seal
    const ks = Math.round(nar ? Math.min(ch * .08, cw * .17) : Math.min(ch * .15, cw * .1)); yield;
    const km = carve(textM('大波', 'ant', ks, { vert:true, track:Math.round(ks * .05) }), 3, Math.round(ks * .7)); yield;
    const kj = paint(km, K.ink), cwid = kj.width + 10, chei = kj.height + 12; yield;
    const sm = textM('湘南沖', 'dot', 16, { vert:true }), sc = paint(sm, K.ink), car = mk(cwid + sc.width + 9, chei + 2), cg = ctx(car); yield;
    cg.fillStyle = K.ink; yield; cg.fillRect(0, 0, car.width, car.height); yield; cg.fillStyle = K.paper; yield; cg.fillRect(2, 2, car.width - 4, car.height - 4); yield; cg.fillStyle = K.ink; yield;
    cg.fillRect(4, 4, car.width - 8, 1); yield; cg.fillRect(4, car.height - 5, car.width - 8, 1); yield; cg.fillRect(4, 4, 1, car.height - 8); yield; cg.fillRect(car.width - 5, 4, 1, car.height - 8); yield; cg.fillRect(cwid + 1, 6, 1, car.height - 12); yield;
    cg.drawImage(kj, Math.round((cwid - kj.width) / 2) + 2, 7); yield; cg.drawImage(sc, cwid + 4, 8); yield;
    L.car = car; yield; L.carK = kj; yield; L.cx = cw - car.width - (nar ? 6 : 8); yield; L.cy = nar ? Math.round(ch * .16) : Math.round(ch * .15); yield;   // at the right edge, under the HUD's checkpoint panel
    L.carW = whiteOf(car); yield;
    const seal = mk(14, 14), sg = ctx(seal); yield; sg.fillStyle = K.seal; yield; sg.fillRect(0, 0, 14, 14); yield; const sm2 = paint(textM('波', 'dot', 16, {}), K.paper); yield; sg.drawImage(sm2, 0, 0, sm2.width, sm2.height, 1, 1, 12, 12); yield; bin(seal); yield;
    L.seal = seal; yield; L.sx2 = L.cx - 16; yield; L.sy2 = L.cy + car.height - 16; yield;
    // English title + subtitle on a paper label in the lower right corner, clear of the bike
    const tpx = Math.round(Math.min(ch * .075, cw * (nar ? .085 : .045))), tm = textM('THE GREAT WAVE', 'ant', tpx, { track:1 , max:cw - 12 }), tl = paint(tm, K.ink), st = paint(t3M(nar ? 'RIDE THE BARREL' : 'RIDE THE BARREL  ·  SHONAN COAST'), K.mid); yield;
    const lw = Math.max(tl.width, st.width) + 12, lab = mk(lw, tl.height + st.height + 12), lg = ctx(lab); yield; lg.fillStyle = K.ink; yield; lg.fillRect(0, 0, lab.width, lab.height); yield; lg.fillStyle = K.paper; yield; lg.fillRect(1, 1, lab.width - 2, lab.height - 2); yield;
    lg.drawImage(tl, 6, 4); yield; lg.drawImage(st, 6, tl.height + 6); yield; L.lab = lab; yield; L.lx = Math.max(4, L.cx - lab.width - 20); yield; L.ly = L.cy + 4; yield;   // in the sky, beside the cartouche and its seal (it sat on the road ahead: quiet.md)
    if(nar){ L.lx = Math.round((cw - lab.width) / 2); yield; L.ly = Math.round(ch * .4); yield; } yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: the wave sweeps in from the left (stepped), foam leading
    const w = rm ? 1 : stepq(t / .26, 5); if(w <= 0) return;
    g.save(); g.beginPath(); g.rect(0, 0, Math.ceil(cw * w), ch); g.clip(); B(g, L.bg, 0, 0); g.restore();
    if(!rm && w < 1){ g.fillStyle = '#fbf8ee'; for(let y = 0; y < ch; y += 3) g.fillRect(Math.round(cw * w) - 2 - ((y * 7) % 5), y, 3, 2); }
    // the cartouche is pressed onto the paper: a pale first impression, then the full ink
    if(rm || t > .2){ const k = rm ? 9 : t - .2; if(k < .05) { g.globalAlpha = .5; B(g, L.car, L.cx, L.cy - 3); g.globalAlpha = 1; } else { B(g, L.car, L.cx, L.cy); if(!rm && !L.hit){ L.hit = true; kick(3); } }
      if(rm || k > .14) B(g, L.seal, L.sx2, L.sy2); }
    if(rm || t > .34){ const h = rm ? L.lab.height : Math.min(L.lab.height, Math.floor((t - .34) / .03) * 4 + 2); g.drawImage(L.lab, 0, 0, L.lab.width, h, L.lx, L.ly, L.lab.width, h); }
  } };

/* ---------------------------------------------------------------- fireball: manga explosion splash. black / oxblood / orange / yellow / white-hot */
CARDS.fireball = { dur:2.0, out:.34, exit:'tone', hold:1.0, kanji:['爆発'],
  *build(cw, ch, nar){ const L = {}, K = { ink:'#0e0503', ox:'#7a1608', red:'#d8301a', or:'#ff7a1a', ye:'#ffd23a', wh:'#fff6d0' }; yield;
    const fx = cw / 2, fy = ch * .44, r0 = Math.min(cw, ch) * (nar ? .34 : .38); yield;
    const mkBg = function*(seed){ const c = mk(cw, ch);   // (stepped: one pass per step)
      yield* toneG(c, K.ink, (x, y) => { const r = Math.hypot(x - fx, (y - fy) * 1.25) / (Math.hypot(cw, ch) * .5); return r < .62 ? 0 : (r - .62) * 2.6; }, 'bay'); yield;   // the black vignette
      yield* focusG(c, fx, fy, 70, K.ox, seed, r0 * 1.05, ch * .028); yield;
      yield* focusG(c, fx, fy, 54, K.or, seed + 1, r0 * 1.12, ch * .02); yield;
      yield* focusG(c, fx, fy, 30, K.ye, seed + 2, r0 * 1.3, ch * .012);
      return c; }; yield;
    L.bgA = yield* mkBg(3); yield; L.bgB = yield* mkBg(9); yield; L.fx = fx; yield; L.fy = fy; yield;
    // 爆発: very heavy gothic, banded white-hot to red, cracked through with black, a black rim and an oxblood shadow
    const ks = Math.round(nar ? Math.min(cw * .4, ch * .2) : Math.min(ch * .3, cw * .2)); yield;
    let km = textM('爆発', 'potta', ks, { track:Math.round(ks * .02) }); yield;
    const R = rnd(21), cr = new Uint8Array(km.w * km.h); yield;
    for(let n = 0; n < 3; n++){ let x = km.w * (.15 + .35 * n + .1 * R()), y = 0, dx = (R() - .5) * 1.2; while(y < km.h){ const X = Math.round(x); if(X >= 0 && X < km.w) cr[Math.round(y) * km.w + X] = 1; y += 1; x += dx + (R() - .5) * 1.6; if(R() < .1) dx = (R() - .5) * 1.4; } } yield;
    const crk = (x, y) => x >= 0 && y >= 0 && x < km.w && y < km.h && cr[y * km.w + x], near = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]].some(([a, b]) => x + a >= 0 && x + a < km.w && y + b >= 0 && y + b < km.h && cr[(y + b) * km.w + x + a]); yield;
    const fillF = (x, y) => crk(x, y) ? K.ink : near(x, y) ? K.wh : [K.wh, K.ye, K.ye, K.or, K.or, K.red][Math.max(0, Math.min(5, Math.floor(y / km.h * 6)))]; yield;
    const pd = 2; yield; km = rough(km, 4, { nick:.08, burr:.05 }); yield;
    L.kj = (yield* inkedG(km, { fill:(x, y) => fillF(x - pd, y - pd), line:K.ink, lw:2, line2:K.wh, lw2:1, sh:K.ox, sx:3, sy:3 })); yield; L.kjW = whiteOf(L.kj); yield;
    L.kx = Math.round(cw / 2 - L.kj.width / 2); yield; L.ky = Math.round(nar ? ch * .1 : ch * .07); yield;
    // the manga explosion balloon behind the word: a spiky black starburst with an orange and a yellow rim
    { const bx = L.kx + L.kj.width / 2, by = L.ky + L.kj.height / 2, rx = L.kj.width * .66, ry = L.kj.height * .92, Rb = rnd(44), N = 26, pts = []; yield;
      for(let i = 0; i < N * 2; i++){ const a = i / (N * 2) * 6.2832, k = i % 2 ? .78 + Rb() * .08 : 1 + Rb() * .28; pts.push([bx + Math.cos(a) * rx * k, by + Math.sin(a) * ry * k]); } yield;
      const bal = mk(cw, ch), poly = (g, sc) => { g.beginPath(); pts.forEach(([x, y], i) => { const X = bx + (x - bx) * sc, Y = by + (y - by) * sc; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.fill(); }; yield;
      yield* passG(bal, g => { g.fillStyle = K.ye; poly(g, 1.08); }); yield; yield* passG(bal, g => { g.fillStyle = K.or; poly(g, 1.03); }); yield; yield* passG(bal, g => { g.fillStyle = K.ink; poly(g, .98); }); yield;
      yield* toneG(bal, K.ox, (x, y) => { const r = Math.hypot((x - bx) / rx, (y - by) / ry); return r < .9 && r > .55 ? (r - .55) * 1.4 : 0; }, 'dot'); yield;
      L.bal = bal; yield; L.bcx = bx; yield; L.bcy = by; yield; } yield;
    // embers that peel off the letters
    const E = []; yield; const R2 = rnd(8); yield; for(let i = 0; i < 22; i++) E.push([L.kx + R2() * L.kj.width, L.ky + L.kj.height * (.2 + R2() * .7), 20 + R2() * 50, R2() < .5 ? K.ye : K.or, (R2() - .5) * 30]); yield; L.E = E; yield;
    // ドカーン, tilted, yellow on black, low left
    const ds = Math.round(Math.min(ch * .13, cw * (nar ? .16 : .085))), dm = rough(textM('ドカーン', 'potta', ds, { rot:-.2, track:-1 }), 12, { nick:.08, burr:.08, splat:6 }); yield;
    L.dk = (yield* inkedG(dm, { fill:(x, y) => y < dm.h * .5 ? K.wh : K.ye, line:K.ink, lw:2, sh:K.red, sx:2, sy:3 })); yield; L.dx = nar ? 4 : Math.round(cw * .05); yield; L.dy = Math.round(ch * (nar ? .34 : .38)); yield;   // lifted off the road ahead (quiet.md)
    // English + a black tape strip with the subtitle, low right
    const tpx = Math.round(Math.min(ch * .09, cw * (nar ? .12 : .06))), tm = shear(textM('INFERNO', 'dela', tpx, { track:1 , max:cw - 12 }), .2); yield;
    L.ti = (yield* inkedG(tm, { fill:K.wh, line:K.ink, lw:1, sh:K.red, sx:3, sy:2 })); yield;
    const st = paint(t3M('OUTRUN THE FIRE'), K.ye), tape = mk(st.width + 10, 9), tg = ctx(tape); yield; tg.fillStyle = K.ink; yield; tg.fillRect(0, 0, tape.width, 9); yield; tg.fillStyle = K.red; yield; tg.fillRect(0, 8, tape.width, 1); yield; tg.drawImage(st, 5, 2); yield; L.tape = tape; yield;
    L.tx = nar ? cw - L.ti.width - 4 : Math.round(cw * .68); yield; L.ty = Math.round(ch * (nar ? .42 : .44)); yield; if(L.tx + L.ti.width > cw - 6) L.tx = cw - L.ti.width - 6; yield;
    L.px = Math.min(cw - tape.width - 6, L.tx + L.ti.width - tape.width); yield; L.py = L.ty + L.ti.height + 2; yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    // the blast: a bright starburst at the centre (never the whole screen), then the focus lines burst in from the rim; they alternate
    // between two hand-placed sets at 2 Hz (photosensitivity: no large-area change faster than that)
    if(!rm && t < .06){ g.save(); g.translate(L.bcx, L.bcy); const k = t < .03 ? .4 : .7; g.scale(k, k); B(g, L.bal, -L.bcx, -L.bcy); g.restore(); return; }
    const bg = rm || Math.floor(t * 4) % 2 ? L.bgA : L.bgB;
    if(!rm && t < .2){ BS(g, bg, L.fx, L.fy, 1 + (1 - stepq(t / .2, 4)) * .5); } else B(g, bg, 0, 0);
    // embers
    if(!rm){ for(const e of L.E){ const k = Math.max(0, t - .15); g.fillStyle = e[3]; g.fillRect(Math.round(e[0] + e[4] * k), Math.round(e[1] - e[2] * k), (Math.floor(t * 30 + e[2]) % 3) ? 1 : 2, 1); } }
    const S = rm ? [L.kj, 1] : slam(t, .06, L.kj, L.kjW); if(S){ if(!rm && t >= .15 && !L.hit){ L.hit = true; kick(9); } const j = !rm && t > .15 && t < .32 ? (Math.floor(t * 50) % 2 ? 1 : -1) : 0;
      const k = rm ? 1 : Math.min(1.25, S[1]); g.save(); g.translate(L.bcx + j, L.bcy); g.scale(k, k); B(g, L.bal, -L.bcx, -L.bcy); g.restore();
      BS(g, S[0], L.kx + L.kj.width / 2 + j, L.ky + L.kj.height / 2, S[1]); }
    if(rm || t > .24){ const S2 = rm ? [L.dk, 1] : slam(t, .24, L.dk, L.dk); B(g, L.dk, L.dx + (rm ? 0 : (Math.floor(t * 24) % 2)), L.dy); }
    if(rm || t > .2){ const sl = rm ? 0 : Math.round((1 - stepq((t - .2) / .12, 4)) * 60); B(g, L.ti, L.tx + sl, L.ty); }
    if(rm || t > .34){ const n = rm ? L.tape.width : Math.min(L.tape.width, Math.floor((t - .34) / .012) * 4); if(n > 0) g.drawImage(L.tape, 0, 0, n, 9, L.px, L.py, n, 9); }
  } };

/* ---------------------------------------------------------------- avalanche: ice-white screentone panel. white / ice / shadow blue / deep / ink */
CARDS.avalanche = { dur:2.0, out:.36, exit:'blinds', hold:1.1, kanji:['雪崩'],
  *build(cw, ch, nar){ const L = {}, K = { wh:'#f6faff', ice:'#cfe0f4', bl:'#6a8ac8', deep:'#26386e', ink:'#0c1028' }; yield;
    const bg = mk(cw, ch), PW = nar ? cw * .42 : cw * .28, PB = ch * (nar ? .6 : .74), sk = ch * .12; yield;   // a narrow side panel: the road stays open
    const inP = (x, y) => y < PB && x < PW - (y / PB) * sk; yield;
    yield* passG(bg, g => { g.fillStyle = K.ink; g.beginPath(); g.moveTo(0, 0); g.lineTo(PW + 3, 0); g.lineTo(PW - sk + 3, PB + 3); g.lineTo(0, PB + 3); g.fill(); }); yield;
    yield* passG(bg, g => { g.fillStyle = K.wh; g.beginPath(); g.moveTo(0, 0); g.lineTo(PW, 0); g.lineTo(PW - sk, PB); g.lineTo(0, PB); g.fill(); }); yield;
    // blue screentone gathering toward the bottom, and diagonal shadow bands across the panel
    yield* toneG(bg, K.ice, (x, y) => inP(x, y) ? .15 + .7 * (y / PB) : 0, 'dot'); yield;
    yield* toneG(bg, K.bl, (x, y) => { if(!inP(x, y)) return 0; const u = ((x + y * .9) / (ch * .2)) % 3; return u < .45 ? .55 : u < .6 ? .25 : 0; }, 'bay'); yield;
    // snow-slide speed streaks across the rest of the upper screen, thin and sparse
    yield* passG(bg, g => { const R = rnd(6); g.fillStyle = K.wh; for(let i = 0; i < 22; i++){ const y = R() * ch * .24, x = PW * .6 + R() * cw, l = 8 + R() * 30; g.fillRect(x, y, l, 1); } }); yield;   // top quarter only
    L.bg = bg; yield; L.PW = PW; yield; L.PB = PB; yield;
    // 雪崩, stacked in the panel: white ice with a blue lower half, an ink rim, a blue shadow, then shattered along fracture lines
    const ks = Math.round(nar ? Math.min(cw * .32, ch * .18) : Math.min(ch * .27, PW * .7)), km = textM('雪崩', 'dela', ks, { vert:true, track:Math.round(-ks * .05) }); yield;
    const solid = (yield* inkedG(km, { fill:(x, y) => y < km.h * .58 ? K.wh : K.ice, line:K.ink, lw:2, sh:K.bl, sx:4, sy:3 })); yield;
    L.kjS = solid; yield; L.kj = shatterC(solid, 17, 3, .8, Math.max(1, Math.round(ks * .03))); yield; L.kjW = whiteOf(solid); yield;
    L.kx = Math.round(Math.max(4, (PW - sk * .5) / 2 - L.kj.width / 2)); yield; L.ky = Math.round(ch * .05); yield;
    // title slab top right
    const tpx = Math.round(Math.min(ch * .085, cw * (nar ? .085 : .055))), tm = textM('AVALANCHE', 'dela', tpx, { track:2 , max:cw - 16 }), tt = paint(tm, K.deep); yield;
    const st = paint(t3M(nar ? 'SNOW ONSEN' : 'SNOW ONSEN  //  THE MOUNTAIN LETS GO'), K.ink), lw = Math.max(tt.width, st.width) + 16, lab = mk(lw + 10, tt.height + st.height + 12), lg = ctx(lab); yield;
    lg.fillStyle = K.ink; yield; lg.beginPath(); yield; lg.moveTo(8, 0); yield; lg.lineTo(lab.width, 0); yield; lg.lineTo(lab.width - 8, lab.height); yield; lg.lineTo(0, lab.height); yield; lg.fill(); yield;
    lg.fillStyle = K.wh; yield; lg.beginPath(); yield; lg.moveTo(9, 1); yield; lg.lineTo(lab.width - 2, 1); yield; lg.lineTo(lab.width - 9, lab.height - 1); yield; lg.lineTo(1, lab.height - 1); yield; lg.fill(); yield; bin(lab); yield;
    lg.drawImage(tt, 12, 4); yield; lg.drawImage(st, 10, tt.height + 6); yield; L.lab = lab; yield; L.lx = nar ? cw - lab.width - 2 : Math.round(PW + cw * .06); yield; L.ly = nar ? Math.round(ch * .7) : Math.round(ch * .16); yield;
    if(nar){ L.lx = cw - lab.width - 2; yield; L.ly = Math.round(ch * .4); yield; } yield;   // beside the narrow panel, in the sky (it sat under it, on the road: quiet.md)
    // falling chunks (draw-time rects)
    const R = rnd(31), C = []; yield; for(let i = 0; i < 18; i++) C.push([R() * PW, R() * PB, 2 + Math.floor(R() * 3), 60 + R() * 90]); yield; L.C = C; yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: the panel drops from above in steps, then the kanji lands solid and shatters
    const dy = rm ? 0 : -Math.round((1 - stepq(t / .18, 4)) * ch * .9);
    B(g, L.bg, 0, dy);
    if(!rm){ g.fillStyle = '#f6faff'; for(const c of L.C){ const y = (c[1] + t * c[3]) % L.PB; g.fillRect(Math.round(c[0] + t * c[3] * .4) % Math.round(L.PW), Math.round(y) + dy, c[2], c[2]); } }
    if(rm || t > .16){ const k = rm ? 9 : t - .16; const img = k < .04 ? L.kjW : k < .12 ? L.kjS : L.kj; if(!rm && k >= .12 && !L.hit){ L.hit = true; kick(6); }
      const j = !rm && k > .12 && k < .24 ? (Math.floor(t * 40) % 2) : 0; B(g, img, L.kx + j, L.ky + dy); }
    if(rm || t > .28){ const sl = rm ? 0 : Math.round((1 - stepq((t - .28) / .12, 4)) * 70); B(g, L.lab, L.lx + sl, L.ly); }
  } };
/* ---------------------------------------------------------------- jetwash: airport-night hazard panel, a 747 belly overhead. navy / ink / amber / hazard yellow / cream / red
   Rules from the jet-blast boards (St Maarten, Maho, Reykjavík): flat high-contrast fields, straight blast lines streaming off the jet,
   bold block capitals; and from the 747 take-off photos: the belly seen from below, four engines forward of the swept wing. */
CARDS.jetwash = { dur:2.0, out:.3, exit:'left', hold:1.1, kanji:['噴射'],
  *build(cw, ch, nar){ const L = {}, K = { navy:'#0c1434', nv2:'#16204a', ink:'#05060e', am:'#ffb02a', hz:'#f0c020', cr:'#f4ecdf', red:'#d8201c', st:'#5a6890' }; yield;
    const PH = Math.round(ch * (nar ? .28 : .26)), sl = ch * .05, bg = mk(cw, ch); yield;   // a top band: the runway and the bike stay in view
    // the night panel with a slanted lower edge, a hazard band (yellow/black) under it, an ink rule
    yield* passG(bg, g => { g.save(); g.beginPath(); g.moveTo(0, PH - 1); g.lineTo(cw, PH - sl - 1); g.lineTo(cw, PH - sl + 7); g.lineTo(0, PH + 7); g.clip(); g.fillStyle = K.hz; g.fillRect(0, 0, cw, ch);
      g.fillStyle = K.ink; for(let x = -ch; x < cw + ch; x += 14){ g.beginPath(); g.moveTo(x, PH + 9); g.lineTo(x + 7, PH + 9); g.lineTo(x + 7 + sl, PH - sl - 2); g.lineTo(x + sl, PH - sl - 2); g.fill(); } g.restore(); }); yield;
    yield* toneG(bg, K.navy, (x, y) => y < PH - 2 - sl * x / cw ? .72 : 0, 'bay'); yield;   // half-dithered night: the sky shows through
    yield* passG(bg, g => { g.fillStyle = K.ink; g.beginPath(); g.moveTo(0, PH + 7); g.lineTo(cw, PH - sl + 7); g.lineTo(cw, PH - sl + 9); g.lineTo(0, PH + 9); g.fill(); }); yield;
    // blast lines: straight streaks from upper left to lower right (the boards' pictogram rule), cream and steel
    yield* passG(bg, g => { const R = rnd(41); for(let i = 0; i < 34; i++){ const y = R() * PH * .9 - PH * .1, x = R() * cw, l = 20 + R() * cw * .3, w = R() < .2 ? 2 : 1; g.fillStyle = R() < .35 ? K.cr : K.st;
      g.save(); g.translate(x, y); g.rotate(.32); g.fillRect(0, 0, l, w); g.restore(); } }); yield;
    L.bg = bg; yield; L.PH = PH; yield;
    // the 747 from below, nose up-left, crossing the panel: the game's own planform (setpiece/jump.js), whole-pixel scaled
    L.jet = null; yield; try{ const A = MECH.sp_jump && MECH.sp_jump.art && MECH.sp_jump.art(); yield; if(A){ const src = A.jetSpr(7, 0), k = Math.max(1, Math.round(PH * (nar ? 2 : 2.4) / src.width)), j = mk(src.width * k, src.height * k), jg = ctx(j); yield; jg.drawImage(src, 0, 0, j.width, j.height); yield;
      { const im = jg.getImageData(0, 0, j.width, j.height), D = im.data, T = [rgb(K.ink), rgb(K.st), rgb('#9aa8c8'), rgb(K.cr)]; yield;   // into the card's palette: ink, steel, pale steel, cream
        for(let i = 0; i < D.length; i += 4){ if(D[i + 3] < 128){ D[i + 3] = 0; continue; } const l = D[i] * .3 + D[i + 1] * .55 + D[i + 2] * .15, v = T[l < 45 ? 0 : l < 95 ? 1 : l < 150 ? 2 : 3]; D[i] = v[0]; D[i + 1] = v[1]; D[i + 2] = v[2]; D[i + 3] = 255; } yield; jg.putImageData(im, 0, 0); yield; } yield;
      // its lights: landing lights at the wing roots and nose gear, red/green wingtips (hard pixels)
      const c = src.width / 2, P = (mx, my, col, z) => { const a = -Math.PI / 4, x = c + mx * Math.cos(a) - my * Math.sin(a), y = c + mx * Math.sin(a) + my * Math.cos(a); jg.fillStyle = col; jg.fillRect(Math.round(x * k - z / 2), Math.round(y * k - z / 2), z, z); }; yield;
      P(-4, -12, '#fff4dc', 2 * k); yield; P(4, -12, '#fff4dc', 2 * k); yield; P(0, -26, '#fff4dc', k * 2); yield; P(-32, 9.6, '#3aff6a', k); yield; P(32, 9.6, '#ff3a3a', k); yield; L.jet = j; yield; } yield; }catch(e){ L.jet = null; yield; } yield;
    L.jx = L.jet ? Math.round(cw - L.jet.width * (nar ? .7 : .78)) : 0; yield; L.jy = L.jet ? Math.round(-L.jet.height * .3) : 0; yield;   // cutting in from the top-right corner
    // 噴射: heavy gothic, amber with a cream keyline, an ink rim and a red shadow, stencil-cut through the middle like airfield signage
    const ks = Math.round(nar ? Math.min(cw * .26, PH * .5) : Math.min(PH * .62, cw * .12)); yield;
    let km = slit(textM('噴射', 'dela', ks, { track:Math.round(ks * .03) }), [[.5, 0]]); yield; km = slit(km, [[.53, 0]]); yield;
    L.kj = (yield* inkedG(km, { fill:(x, y) => y < km.h * .5 ? K.am : K.hz, line:K.cr, lw:1, line2:K.ink, lw2:2, sh:K.red, sx:4, sy:3 })); yield; L.kjW = whiteOf(L.kj); yield;
    L.kx = Math.round(nar ? 6 : cw * .04); yield; L.ky = Math.round(PH * .12); yield;
    // English title, sheared, and the typed tape under it
    const tpx = Math.round(Math.min(ch * .085, cw * (nar ? .1 : .06))), tm = shear(textM('JETWASH', 'dela', tpx, { track:2, max:cw - 16 }), .22); yield;
    L.ti = (yield* inkedG(tm, { fill:K.cr, line:K.ink, lw:1, sh:K.am, sx:3, sy:2 })); yield; if(nar){ L.tx = L.kx + 2; yield; L.ty = PH + 12; yield; } else { L.tx = L.kx + L.kj.width + 8; yield; L.ty = Math.round(PH * .2); yield; } yield;
    const st = paint(t3M(nar ? 'HANEDA // HOLD YOUR LINE' : 'HANEDA  //  747 DEPARTURE  //  HOLD YOUR LINE'), K.am), tape = mk(st.width + 10, 9), tg = ctx(tape); yield; tg.fillStyle = K.ink; yield; tg.fillRect(0, 0, tape.width, 9); yield; tg.fillStyle = K.red; yield; tg.fillRect(0, 8, tape.width, 1); yield; tg.drawImage(st, 5, 2); yield;
    L.tape = tape; yield; L.px = L.tx; yield; L.py = L.ty + L.ti.height + 2; yield;
    // the small DANGER JET BLAST board (red band, white field), pinned at the panel's right
    const bd = mk(62, 30), bg2 = ctx(bd); yield; bg2.fillStyle = K.ink; yield; bg2.fillRect(0, 0, 62, 30); yield; bg2.fillStyle = '#e8e4d8'; yield; bg2.fillRect(1, 1, 60, 28); yield; bg2.fillStyle = K.red; yield; bg2.fillRect(1, 1, 60, 10); yield;
    bg2.drawImage(paint(t3M('DANGER'), '#f4f0e8'), 19, 3); yield; bg2.drawImage(paint(t3M('JET BLAST'), K.ink), 13, 19); yield; bg2.fillStyle = K.ink; yield; for(let i = 0; i < 3; i++) bg2.fillRect(4 + i, 14 + i, 7 - i * 2, 1); yield;
    L.bd = bd; yield; L.bx = cw - 70; yield; L.by = Math.round(PH + 14); yield; if(nar){ L.bx = cw - 66; yield; L.by = Math.round(PH + 40); yield; } yield;   // pinned at the right edge, under the band
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: the panel drops in four steps; the jet sweeps in from the lower right along its track; streaks pour past
    const dy = rm ? 0 : -Math.round((1 - stepq(t / .14, 4)) * L.PH * 1.1);
    g.save(); g.beginPath(); g.rect(0, 0, cw, L.PH + 12 + dy); g.clip(); B(g, L.bg, 0, dy);
    if(L.jet){ const k = rm ? 0 : 1 - stepq((t - .04) / .3, 6), j = !rm && t > .34 && t < .7 ? (Math.floor(t * 30) % 2) : 0; B(g, L.jet, L.jx + Math.round(k * cw * .4) + j, L.jy + dy - Math.round(k * L.PH * .9)); }
    if(!rm){ g.fillStyle = '#f4ecdf'; for(let i = 0; i < 14; i++){ const ph = (t * (1.6 + (i % 3) * .5) + i * .37) % 1, x = Math.round(ph * cw * 1.2 - cw * .1), y = Math.round(((i * 53) % 97) / 97 * L.PH) + dy; g.fillRect(x, y + Math.round(ph * 30), 10 + (i % 4) * 6, 1); } }
    g.restore();
    const S = rm ? [L.kj, 1] : slam(t, .16, L.kj, L.kjW); if(S){ if(!rm && t >= .25 && !L.hit){ L.hit = true; kick(7); } const j = !rm && t > .25 && t < .4 ? (Math.floor(t * 40) % 2) : 0; BS(g, S[0], L.kx + L.kj.width / 2 + j, L.ky + L.kj.height / 2, S[1]); }
    if(rm || t > .26){ const sl = rm ? 0 : Math.round((1 - stepq((t - .26) / .1, 3)) * 50); B(g, L.ti, L.tx - sl, L.ty); }
    if(rm || t > .34){ const n = rm ? L.tape.width : Math.min(L.tape.width, Math.floor((t - .34) / .012) * 4); if(n > 0) g.drawImage(L.tape, 0, 0, n, 9, L.px, L.py, n, 9); }
    if(rm || t > .42) B(g, L.bd, L.bx, L.by + (rm ? 0 : Math.round((1 - stepq((t - .42) / .08, 2)) * -12)));
  } };
/* ---------------------------------------------------------------- megalodon (id kept): 滄竜, the title of a deep-sea horror film
   (setpiece/megalodon.js; plays as the sea goes dark, long before the animal is seen). SPARSE: a top band only (on phones, below the HUD),
   the road and the windows stay open. Studied, not copied: Toho's Shōwa monster titles (the title rising out of black), Jaws and Alien
   (the title held in black, small type, negative space), The Abyss and Underwater (cold teal, light that wavers through water), Subnautica
   (the shape too big for the frame, passing behind). So: black water; 滄竜 rising out of it in four cold steps (black, deep teal, teal, a
   pale crest), its rows wavering as if seen through water, a caustic glint passing once across it; the mosasaur's silhouette sliding
   behind the title from edge to edge (it never fades); MOSASAUR small and widely spaced; the title itself goes back to black in four steps (the Toho fade-down); a depth readout. A low sub-bass hit when the
   title lands comes from megalodon.js. Reduced motion: no waver, no glint, no passing silhouette; the steps still rise. */
CARDS.megalodon = { dur:2.4, out:.4, exit:'fade', hold:1.4, kanji:['滄竜'],
  *build(cw, ch, nar){ const L = {}, K = { ab:'#010407', d1:'#041018', d2:'#082430', d3:'#10404e', d4:'#2a7484', d5:'#7ec4cc', d6:'#c8eef0', ink:'#000103' }; yield;
    const top = nar ? Math.round(ch * .25) : 0, PH = Math.round(ch * (nar ? .2 : .25)), bg = mk(cw, PH + 4); yield;
    // the band: black water, the faintest cold light from above (a dithered falloff), sparse snow; a hair of cold light along its foot
    yield* toneG(bg, K.ab, () => 1, 'bay'); yield; yield* toneG(bg, K.d1, (x, y) => Math.max(0, .7 - y / PH) * (.6 + .4 * Math.sin(x * .013)), 'bay'); yield;
    yield* passG(bg, g => { const R = rnd(31); g.fillStyle = K.d3; for(let n = 0; n < cw * PH / 700; n++) g.fillRect((R() * cw) | 0, (R() * PH) | 0, 1, 1); g.fillStyle = K.d2; g.fillRect(0, PH, cw, 1); g.fillStyle = K.ink; g.fillRect(0, PH + 1, cw, 3); }); yield;
    L.bg = bg; yield; L.PH = PH; yield; L.top = top; yield;
    // the silhouette behind the title: the mosasaur's side profile in ink with a cold rim on its back, big enough to overfill the band
    const sw = Math.round(nar ? cw * 1.3 : cw * .8), sh = Math.round(sw * .3), sk = mk(sw, sh), P = (pts, col, dy) => pass(sk, g => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => { const X = x * sw, Y = y * sh + (dy || 0); i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.fill(); }); yield;
    const body = [[0, .5], [.04, .43], [.1, .37], [.16, .33], [.24, .29], [.34, .27], [.46, .3], [.58, .37], [.7, .45], [.8, .51], [.86, .54], [.91, .42], [.95, .3], [.96, .32], [.945, .46], [.93, .58],
      [.97, .8], [1, .97], [.95, .9], [.89, .7], [.84, .64], [.74, .62], [.6, .6], [.52, .6], [.49, .78], [.44, .84], [.44, .62], [.36, .64], [.28, .64], [.24, .88], [.18, .94], [.19, .64], [.14, .6], [.08, .57], [.02, .54]]; yield;
    P(body, K.d2, -1); yield; P(body, K.ink); yield; L.sk = sk; yield; L.sy = Math.round(PH * .5 - sh * .5); yield;
    // 滄竜, hand-drawn: four reveal steps (each the same mask in a colder, darker ramp), and a pale copy for the caustic glint
    const ks = Math.round(nar ? Math.min(cw * .2, PH * .62) : Math.min(PH * .62, cw * .1)), k = Math.max(2, Math.round(ks / 16)); yield;
    const km = handM('滄竜', { track:Math.round(ks * .05) }, k) || textM('滄竜', 'dela', ks, { track:Math.round(ks * .05) }); yield;
    const RAMP = [[K.d1, K.d1, K.ab], [K.d3, K.d2, K.d1], [K.d4, K.d3, K.d2], [K.d6, K.d4, K.d3]]; yield;
    L.kjL = RAMP.map(r => inked(km, { fill:(x, y) => y < km.h * .3 ? r[0] : y < km.h * .65 ? r[1] : r[2], line:K.ink, lw:1 })); yield;
    L.kjC = (yield* inkedG(km, { fill:() => K.d6, line:K.ink, lw:1 })); yield;
    L.kx = Math.round(nar ? 6 : cw * .05); yield; L.ky = Math.round((PH - L.kjL[0].height) * .42); yield;
    // MOSASAUR, small and widely spaced, and the depth readout under it
    // set to fit: beside the kanji when the whole word fits there (widest spacing first), else under it; never cut
    const room = cw - 6, bx = L.kx + L.kjL[0].width + (nar ? 6 : 14); yield; let tiS = null; yield;
    for(const [str, k] of [['M  O  S  A  S  A  U  R', 2], ['M O S A S A U R', 2], ['MOSASAUR', 2], ['M O S A S A U R', 1], ['MOSASAUR', 1]]){ if(bx + (str.length * 4 - 1) * k <= room){ tiS = [str, k, true]; break; } } yield;
    if(!tiS) for(const [str, k] of [['M O S A S A U R', 2], ['M O S A S A U R', 1], ['MOSASAUR', 1]]){ if(L.kx + (str.length * 4 - 1) * k <= room){ tiS = [str, k, false]; break; } } yield;
    if(!tiS) tiS = ['MOSASAUR', 1, false]; yield;
    L.ti = paint(t3M(tiS[0], tiS[1]), K.d5); yield;
    const dps = ['DEPTH 60 M  //  AQUA-LINE', 'DEPTH 60 M'].find(t => (tiS[2] ? bx : L.kx) + t.length * 4 <= room) || 'DEPTH 60 M'; yield; L.dp = paint(t3M(dps), K.d3); yield;
    if(tiS[2]){ L.tx = bx; yield; L.ty = L.ky + Math.round(L.kjL[0].height * (nar ? .15 : .3)); yield; } else { L.tx = L.kx; yield; L.ty = L.ky + L.kjL[0].height + 3; yield; } yield;
    L.px = L.tx; yield; L.py = L.ty + L.ti.height + (tiS[2] ? 5 : 3); yield;
    return L; },
  draw(g, t, L, rm, cw, ch){ const T0 = L.top;
    g.save(); g.translate(0, T0); g.beginPath(); g.rect(0, 0, cw, L.PH + 4); g.clip(); B(g, L.bg, 0, 0);
    // the shape behind the title: in from the right edge, out past the left, never fading (the whole card long)
    if(!rm){ const x = Math.round(cw - (t / 2.4) * (cw + L.sk.width)); B(g, L.sk, x, L.sy + Math.round(Math.sin(t * 1.3) * 2)); }
    // 滄竜 rising out of black in four steps; rows wavering through the water; one caustic glint passing across
    const lv = rm ? 3 : Math.min(3, Math.floor(t / .16)), K = L.kjL[lv], w = K.width, h = K.height;
    if(rm) B(g, K, L.kx, L.ky); else for(let y = 0; y < h; y++){ const o = Math.round(Math.sin(y * .45 + t * 7) * (t < 1.3 ? 1 : .5)); g.drawImage(K, 0, y, w, 1, L.kx + o, L.ky + y, w, 1); }
    if(!rm && t > .7 && t < 1.5){ const gx = L.kx - 20 + (t - .7) / .8 * (w + 40); g.save(); g.beginPath(); g.moveTo(gx, L.ky); g.lineTo(gx + 6, L.ky); g.lineTo(gx - 4, L.ky + h); g.lineTo(gx - 10, L.ky + h); g.closePath(); g.clip(); B(g, L.kjC, L.kx, L.ky); g.restore(); }
    // the name and the depth readout type in after it lands
    if(rm || t > .7){ const n = rm ? L.ti.width : Math.min(L.ti.width, Math.floor((t - .7) / .02) * 4); if(n > 0) g.drawImage(L.ti, 0, 0, n, L.ti.height, L.tx, L.ty, n, L.ti.height); }
    if(rm || t > 1){ const n = rm ? L.dp.width : Math.min(L.dp.width, Math.floor((t - 1) / .015) * 4); if(n > 0) g.drawImage(L.dp, 0, 0, n, L.dp.height, L.px, L.py, n, L.dp.height); }
    g.restore();
  } };
// shatter a painted canvas: fracture lines cut it into shards, each nudged; pixels near a line are dropped (the crack)
function shatterC(src, seed, n, gap, spread){ const R = rnd(seed), w = src.width, h = src.height, p = spread + 1, out = mk(w + p * 2, h + p * 2);
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data, og = out.getContext('2d'), im = og.createImageData(out.width, out.height), od = im.data;
  const lines = []; for(let i = 0; i < n; i++){ const a = (i / n) * Math.PI + R() * .6, px = w * (.25 + R() * .5), py = h * (.2 + R() * .6); lines.push([Math.cos(a), Math.sin(a), px, py]); }
  const offs = {}; const off = code => offs[code] || (offs[code] = [Math.round((R() - .5) * 2 * spread), Math.round((R() - .5) * 2 * spread)]);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = (y * w + x) * 4; if(sd[i + 3] < 128) continue; let code = 0, cut = false;
    lines.forEach(([cx0, sy0, px, py], k) => { const d = (x - px) * sy0 - (y - py) * cx0; if(Math.abs(d) < gap) cut = true; if(d > 0) code |= 1 << k; }); if(cut) continue;
    const [ox, oy] = off(code), X = x + p + ox, Y = y + p + oy, j = (Y * out.width + X) * 4; od[j] = sd[i]; od[j + 1] = sd[i + 1]; od[j + 2] = sd[i + 2]; od[j + 3] = 255; }
  og.putImageData(im, 0, 0); return out; }

/* ---------------------------------------------------------------- typhoon: storm-warning broadcast. navy / cyan / white / warning red / yellow */
CARDS.typhoon = { dur:2.1, out:.3, exit:'crt', crtY:.14, crtH:.3, hold:1.1, kanji:['台風'],
  *build(cw, ch, nar){ const L = {}, K = { navy:'#0a1846', cy:'#4ad0ff', wh:'#f4f8ff', red:'#e0102a', ye:'#ffd800', ink:'#04081a' }; yield;
    // a top band of ~28%, half-dithered so the sky shows through; everything in one broadcast row: symbol, 台風, ribbon + title + sub
    const PH = Math.round(ch * (nar ? .3 : .28)), bg = mk(cw, PH + 2); yield;
    yield* toneG(bg, K.navy, (x, y) => y < PH ? .7 : 0, 'bay'); yield;
    yield* passG(bg, g => { g.fillStyle = K.ink; for(let y = 0; y < PH; y += 2) g.fillRect(0, y, cw, 1); g.fillStyle = K.cy; g.fillRect(0, PH, cw, 2); }, 1); yield;
    L.bg = bg; yield; L.PH = PH; yield;
    const rain = mk(cw, PH * 2), R = rnd(4), rg = ctx(rain); yield;
    for(let i = 0; i < cw * PH * 2 / 110; i++){ const x = R() * cw, y = R() * PH * 2, l = 4 + R() * 7; rg.fillStyle = R() < .3 ? K.wh : '#5a7ac8'; for(let k = 0; k < l; k++) rg.fillRect(Math.round(x - k * .35), Math.round(y + k), 1, 1); } yield;
    L.rain = rain; yield;
    const sr = Math.round(PH * (nar ? .26 : .36)), sz = sr * 2 + 6; yield; L.sym = []; yield;
    for(let f = 0; f < 8; f++){ const c = mk(sz, sz); const a0 = f / 8 * Math.PI;
      yield* passG(c, g => { g.translate(sz / 2, sz / 2); g.rotate(a0); g.strokeStyle = K.wh; g.lineWidth = Math.max(2, sr * .18); g.beginPath(); g.arc(0, 0, sr * .42, 0, 6.2832); g.stroke();
        const r = sr * .42; for(const s of [1, -1]){ g.beginPath(); g.moveTo(0, -r * s); g.quadraticCurveTo(r * 2.1 * s, -r * 1.5 * s, r * 2.2 * s, r * .2 * s); g.stroke(); } });
      yield* passG(c, g => { g.fillStyle = K.red; g.beginPath(); g.arc(sz / 2, sz / 2, sr * .2, 0, 6.2832); g.fill(); });
      L.sym.push(c); } yield;
    const k = Math.max(2, Math.floor(PH * (nar ? .45 : .58) / 16)), big = scaleM(textM('台風', 'dot', 16, { track:1 }), k); yield;
    L.kj = (yield* inkedG(big, { fill:K.wh, sh:K.cy, sx:k, sy:k })); yield; L.kjW = whiteOf(L.kj); yield;
    L.syx = 4; yield; L.syy = Math.round(PH / 2 - sz / 2); yield;
    L.kx = L.syx + sz + 4; yield; L.ky = Math.round(PH / 2 - L.kj.height / 2); yield;
    const rb = paint(textM('臨時ニュース', 'dot', 16, {}), K.wh), rib = mk(rb.width + 14, rb.height + 6), rbg = ctx(rib); yield;
    rbg.fillStyle = K.red; yield; rbg.beginPath(); yield; rbg.moveTo(0, 0); yield; rbg.lineTo(rib.width, 0); yield; rbg.lineTo(rib.width - 6, rib.height); yield; rbg.lineTo(0, rib.height); yield; rbg.fill(); yield; bin(rib); yield; rbg.drawImage(rb, 5, 3); yield; L.rib = rib; yield;
    const tpx = Math.round(Math.min(ch * .06, cw * (nar ? .07 : .04))), ti = paint(textM('TYPHOON WARNING', 'dela', tpx, { track:1 , max:nar ? cw - 12 : cw * .5 }), K.ye); yield; L.ti = ti; yield;
    const s1 = paint(textM('強風注意', 'dot', 16, {}), K.cy), s2 = paint(t3M(nar ? 'GUSTS' : 'GUSTS FROM THE SEA'), K.wh), sub = mk(s1.width + s2.width + 8, s1.height), sg = ctx(sub); yield;
    sg.drawImage(s1, 0, 0); yield; sg.drawImage(s2, s1.width + 6, Math.round(s1.height / 2 - 3)); yield; L.sub = sub; yield;
    if(nar){ L.rx = cw - rib.width - 2; yield; L.ry = 3; yield; L.tx = Math.round(cw / 2 - ti.width / 2); yield; L.ty = PH + 5; yield; L.sx = Math.round(cw / 2 - sub.width / 2); yield; L.sy = L.ty + ti.height + 2; yield; }
    else { const cx0 = L.kx + L.kj.width + 10; yield; L.rx = cx0; yield; L.ry = Math.round(PH * .1); yield; L.tx = cx0; yield; L.ty = L.ry + rib.height + 3; yield; L.sx = cx0; yield; L.sy = L.ty + ti.height + 2; yield; } yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: a CRT switch-on, a bright line opening into the picture
    const op = rm ? 1 : stepq((t - .03) / .16, 5), mid = L.PH / 2;
    if(!rm && t < .03){ g.fillStyle = '#f4f8ff'; g.fillRect(0, Math.round(mid), cw, 1); return; }
    const hh = Math.max(2, Math.round(L.PH * op)); g.save(); g.beginPath(); g.rect(0, Math.round(mid - hh / 2), cw, hh + 2); g.clip();
    B(g, L.bg, 0, 0);
    const ry = rm ? 0 : -Math.round((t * 220) % L.PH); g.save(); g.beginPath(); g.rect(0, 0, cw, L.PH); g.clip(); B(g, L.rain, Math.round(rm ? 0 : -t * 60) % 4, ry); g.restore();
    B(g, L.sym[rm ? 0 : Math.floor(t * 14) % 8], L.syx, L.syy);
    if(rm || t > .14) B(g, L.kj, L.kx, L.ky);   // steady (no blink: photosensitivity)
    B(g, L.rib, L.rx, L.ry);
    g.restore();
    if(rm || t > .25) B(g, L.ti, L.tx, L.ty);
    if(rm || t > .32){ const n = rm ? L.sub.width : Math.min(L.sub.width, Math.floor((t - .32) / .012) * 4); if(n > 0) g.drawImage(L.sub, 0, 0, n, L.sub.height, L.sx, L.sy, n, L.sub.height); }
  } };

/* ---------------------------------------------------------------- hanabi: summer festival poster. indigo / pink / gold / cyan / cream */
CARDS.hanabi = { dur:2.1, out:.36, exit:'tone', hold:1.2, kanji:['花火'],
  *build(cw, ch, nar){ const L = {}, K = { ind:'#141a4a', deep:'#080a24', pink:'#ff5a8a', gold:'#ffd060', cy:'#6ae0ff', cr:'#fff4dc' }; yield;
    const BH = Math.round(ch * .3), bg = mk(cw, ch); yield;   // the night poster ground stops at 30% of the height
    // indigo night poster ground, solid at the top, dithering away into the scene
    yield* toneG(bg, K.deep, (x, y) => y < BH * .55 ? 1 : 1 - (y - BH * .55) / (BH * .45), 'bay'); yield;
    yield* toneG(bg, K.ind, (x, y) => y < BH * .5 ? .5 : 0, 'bay'); yield;
    L.bg = bg; yield;
    // bursts: chrysanthemum spokes of dots, bigger dots inward, a coloured tip; two twinkle variants each
    const burst = (r, a, b, seed, tw) => { const s = Math.ceil(r * 2.3 + 6), c = mk(s, s), G = ctx(c), R = rnd(seed), N = Math.round(r * 1.1);
      for(let i = 0; i < N; i++){ const ang = i / N * 6.2832 + (R() - .5) * .08, len = .8 + R() * .25; for(let rr = r * .22; rr <= r * len; rr += 1.5){ if(tw && R() < .3) continue; const u = rr / r;
          const x = Math.round(s / 2 + Math.cos(ang) * rr), y = Math.round(s / 2 + Math.sin(ang) * rr + u * u * r * .12);
          G.fillStyle = u > .82 ? b : u < .45 ? K.cr : a; G.fillRect(x, y, 1, 1); }
        const ex = Math.round(s / 2 + Math.cos(ang) * r * len), ey = Math.round(s / 2 + Math.sin(ang) * r * len + len * len * r * .12); G.fillStyle = b; G.fillRect(ex, ey, 2, 2); }
      G.fillStyle = K.cr; G.fillRect(s / 2 - 2, s / 2 - 2, 4, 4); return c; }; yield;
    const r1 = Math.round(Math.min(ch * .17, cw * (nar ? .3 : .15))), r2 = Math.round(r1 * .72), r3 = Math.round(r1 * .5); yield;
    L.bu = [[burst(r1, K.pink, K.gold, 1, 0), burst(r1, K.pink, K.gold, 1, 1), nar ? cw * .3 : cw * .2, BH * .6, .05],
            [burst(r2, K.cy, K.cr, 2, 0), burst(r2, K.cy, K.cr, 2, 1), nar ? cw * .78 : cw * .55, BH * .45, .16],
            [burst(r3, K.gold, K.pink, 3, 0), burst(r3, K.gold, K.pink, 3, 1), nar ? cw * .6 : cw * .38, BH * .9, .26]]; yield;
    // 花火 vertical, the poster's title column at the right: cream, pink rim, indigo outer rim
    const ks = Math.round(nar ? Math.min(ch * .12, cw * .26) : Math.min(ch * .17, cw * .11)), km = rough(textM('花火', 'deco', ks, { vert:true, track:Math.round(ks * .04) }), 9, { nick:.08 }); yield;
    L.kj = (yield* inkedG(km, { fill:K.cr, line:K.pink, lw:1, line2:K.deep, lw2:2, sh:K.pink, sx:2, sy:2 })); yield;
    L.kx = cw - L.kj.width - Math.round(cw * (nar ? .04 : .1)); yield; L.ky = Math.round(ch * (nar ? .04 : .15)); yield;
    // a red 夏 seal under the title, English and subtitle as a typeset poster line across the bottom of the band
    const se = mk(18, 18), sg = ctx(se); yield; sg.fillStyle = '#d82a3a'; yield; sg.fillRect(0, 0, 18, 18); yield; const sm = paint(textM('夏', 'dot', 16, {}), K.cr); yield; sg.drawImage(sm, 1, 1, 16, 16); yield; bin(se); yield; L.se = se; yield;
    const tpx = Math.round(Math.min(ch * .07, cw * (nar ? .08 : .045))), ti = (yield* inkedG(textM('SUMMER FIREWORKS', 'deco', tpx, { track:1 , max:cw - 12 }), { fill:K.gold, sh:K.deep, sx:1, sy:1 })); yield;
    const st = paint(t3M(nar ? 'LOOK UP' : 'HANABI TAIKAI  ·  LOOK UP'), K.cy); yield; L.ti = ti; yield; L.st = st; yield;
    L.tx = nar ? Math.round(cw / 2 - ti.width / 2) : Math.round(cw * .05); yield; L.ty = nar ? Math.round(BH + 2) : Math.round(ch * .1); yield; L.sx = L.tx + (nar ? Math.round((ti.width - st.width) / 2) : 0); yield; L.sy = L.ty + ti.height + 2; yield;
    if(nar){ L.kx = cw - L.kj.width - 2; yield; } yield;
    L.sex = L.kx + Math.round(L.kj.width / 2 - 9); yield; L.sey = L.ky + L.kj.height + 2; yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    const a = rm ? 1 : stepq(t / .12, 3); if(a <= 0) return; g.globalAlpha = a; B(g, L.bg, 0, 0); g.globalAlpha = 1;
    for(const [b0, b1, x, y, t0] of L.bu){ if(!rm && t < t0) continue; const k = rm ? 1 : t - t0, s = rm ? 1 : k < .05 ? .25 : k < .1 ? .55 : k < .15 ? .85 : 1;
      const img = !rm && Math.floor(t * 4 + t0 * 10) % 2 ? b1 : b0; BS(g, img, x, y, s); }   // twinkle at 2 Hz
    // the title column draws down like a brush stroke
    if(rm || t > .18){ const h = rm ? L.kj.height : Math.min(L.kj.height, Math.ceil(stepq((t - .18) / .22, 6) * L.kj.height)); if(h > 0) g.drawImage(L.kj, 0, 0, L.kj.width, h, L.kx, L.ky, L.kj.width, h); }
    if(rm || t > .42) B(g, L.se, L.sex, L.sey);
    if(rm || t > .3){ const sl = rm ? 0 : Math.round((1 - stepq((t - .3) / .1, 4)) * -50); B(g, L.ti, L.tx + sl, L.ty); }
    if(rm || t > .4){ const n = rm ? L.st.width : Math.min(L.st.width, Math.floor((t - .4) / .012) * 4); if(n > 0) g.drawImage(L.st, 0, 0, n, L.st.height, L.sx, L.sy, n, L.st.height); }
  } };

/* ---------------------------------------------------------------- matsuri: festival poster with chōchin lantern borders. red / paper / ink / gold / glow */
CARDS.matsuri = { dur:2.1, out:.34, exit:'up', hold:1.2, kanji:['祭'],
  *build(cw, ch, nar){ const L = {}, K = { red:'#d8202a', dr:'#8a1018', pap:'#f8e8c0', ink:'#140a08', gold:'#f0b030', glow:'#ffb050' }; yield;
    const top = mk(cw, Math.round(ch * .36)), lw = Math.max(9, Math.round(ch * .055)), lh = Math.round(lw * 1.4); yield;
    // the lantern: an oval with ribs, black caps; red or paper, with a stepped glow ring
    const lantern = red => { const c = mk(lw + 8, lh + 10);
      tone(c, K.glow, (x, y) => { const r = Math.hypot((x - c.width / 2) / (lw * .5 + 4), (y - c.height / 2) / (lh * .5 + 4)); return r < 1 && r > .7 ? .35 : 0; }, 'bay');
      pass(c, g => { g.fillStyle = red ? K.red : K.pap; g.beginPath(); g.ellipse(c.width / 2, c.height / 2, lw / 2, lh / 2 - 1, 0, 0, 6.2832); g.fill(); });
      pass(c, g => { g.strokeStyle = red ? K.dr : '#c8a070'; g.lineWidth = 1; for(let k = 1; k < 5; k++){ const y = c.height / 2 - lh / 2 + lh * k / 5; const hw = lw / 2 * Math.sqrt(1 - Math.pow((y - c.height / 2) / (lh / 2), 2)); g.beginPath(); g.moveTo(c.width / 2 - hw + 1, y); g.lineTo(c.width / 2 + hw - 1, y); g.stroke(); } }, 90);
      pass(c, g => { g.fillStyle = K.ink; g.fillRect(c.width / 2 - lw * .3, c.height / 2 - lh / 2 - 1, lw * .6, 3); g.fillRect(c.width / 2 - lw * .3, c.height / 2 + lh / 2 - 2, lw * .6, 3); g.fillRect(c.width / 2, 0, 1, c.height / 2 - lh / 2); });
      if(!red){ const m = paint(textM('祭', 'dot', 16, {}), K.red); ctx(c).drawImage(m, 0, 0, m.width, m.height, Math.round(c.width / 2 - lw * .3), Math.round(c.height / 2 - lw * .3), Math.round(lw * .6), Math.round(lw * .6)); bin(c); }
      return c; }; yield;
    L.lan = [lantern(true), lantern(false)]; yield;
    // the rope across the top, sagging, and the lantern positions along it (sides get short strings of lanterns)
    const n = Math.max(4, Math.floor(cw / (lw * 2.4))), P = []; yield; for(let i = 0; i < n; i++){ const u = (i + .5) / n; P.push([u * cw, ch * .02 + Math.sin(u * Math.PI) * ch * .05, i % 2]); } yield;
    yield* passG(top, g => { g.strokeStyle = K.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(0, ch * .02); for(let u = 0; u <= 1.001; u += .02) g.lineTo(u * cw, ch * .02 + Math.sin(u * Math.PI) * ch * .05); g.stroke(); }, 60); yield;
    yield* toneG(top, K.ink, (x, y) => y < ch * .17 ? .75 : y < ch * .22 ? .4 : 0, 'bay'); yield;
    L.top = top; yield; L.P = P; yield; L.side = [[cw - lw - 12, ch * .28, 1], [cw - lw - 12, ch * .28 + lh + 8, 0]]; yield;   // the crest takes the left side
    if(nar) L.side = []; yield;
    // a red frame round the poster (thin, so the scene stays)
    const fr = mk(cw, ch); yield; yield* passG(fr, g => { g.fillStyle = K.red; g.fillRect(0, 0, cw, 3); g.fillRect(0, ch - 3, cw, 3); g.fillRect(0, 0, 3, ch); g.fillRect(cw - 3, 0, 3, ch); g.fillStyle = K.ink; g.fillRect(4, 4, cw - 8, 1); g.fillRect(4, ch - 5, cw - 8, 1); g.fillRect(4, 4, 1, ch - 8); g.fillRect(cw - 5, 4, 1, ch - 8); }); yield;
    L.fr = fr; yield;
    // the crest: a paper disc with a red ring, 祭 brushed in black inside
    const cr = Math.round(Math.min(ch * (nar ? .085 : .12), cw * (nar ? .2 : .11))), cs = cr * 2 + 14, crest = mk(cs, cs); yield;   // small, in the top-left corner
    yield* passG(crest, g => { g.fillStyle = K.ink; g.beginPath(); g.arc(cs / 2, cs / 2, cr + 2, 0, 6.2832); g.fill(); }); yield;
    for(let k = 0; k < 4; k++) yield* toneG(crest, K.gold, (x, y) => { const r = Math.hypot(x - cs / 2, y - cs / 2); return r > cr + 2 && r < cr + 3 + k ? .3 : 0; }, 'bay'); yield;
    yield* passG(crest, g => { g.fillStyle = K.red; g.beginPath(); g.arc(cs / 2, cs / 2, cr, 0, 6.2832); g.fill(); }); yield;
    yield* passG(crest, g => { g.fillStyle = K.pap; g.beginPath(); g.arc(cs / 2, cs / 2, cr * .82, 0, 6.2832); g.fill(); }); yield;
    yield* toneG(crest, '#ecd4a0', (x, y) => { const r = Math.hypot(x - cs / 2, y - cs / 2); return r < cr * .8 && y > cs / 2 ? .35 : 0; }, 'dot'); yield;
    const km = rough(textM('祭', 'potta', Math.round(cr * 1.2), {}), 5, { nick:.08, burr:.04, drag:.12, dragLen:Math.round(cr * .12), splat:4 }), kj = paint(km, K.ink); yield;
    ctx(crest).drawImage(kj, Math.round(cs / 2 - kj.width / 2), Math.round(cs / 2 - kj.height / 2)); yield; L.crest = crest; yield; L.crW = whiteOf(crest); yield;
    L.ccx = Math.round(cs / 2 + 2); yield; L.ccy = Math.round(ch * (nar ? .17 : .2) + cs / 2); yield;
    const tpx = Math.round(Math.min(ch * .08, cw * (nar ? .1 : .05))), ti = (yield* inkedG(textM('MATSURI', 'dela', tpx, { track:2 , max:cw - 16 }), { fill:K.pap, line:K.ink, lw:1, sh:K.red, sx:2, sy:2 })), st = paint(t3M(nar ? 'WEAVE THE FLOATS' : 'NEON STREET PARADE  ·  WEAVE THE FLOATS'), K.gold); yield;
    const plate = mk(st.width + 10, 9), pg = ctx(plate); yield; pg.fillStyle = K.ink; yield; pg.fillRect(0, 0, plate.width, 9); yield; pg.drawImage(st, 5, 2); yield;
    L.ti = ti; yield; L.pl = plate; yield;
    if(nar){ L.tx = 6; yield; L.ty = Math.round(L.ccy + cs / 2); yield; L.px = 6; yield; L.py = L.ty + ti.height + 1; yield; }
    else { L.tx = Math.round(L.ccx + cs / 2 + 2); yield; L.ty = Math.round(L.ccy - ti.height / 2 - 4); yield; L.px = L.tx + 2; yield; L.py = L.ty + ti.height + 1; yield; } yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: the lantern string drops in with a bounce, the frame snaps on, the crest stamps
    const d = rm ? 0 : t < .16 ? -Math.round((1 - stepq(t / .16, 4)) * ch * .3) : t < .22 ? 3 : 0;
    B(g, L.fr, 0, 0);
    B(g, L.top, 0, d);
    for(const [x, y, r] of L.P){ const sw = rm ? 0 : Math.round(Math.sin(t * 6 + x) * 1.2); B(g, L.lan[r], x - L.lan[0].width / 2 + sw, y + d - 2); }
    for(const [x, y, r] of L.side){ const sw = rm ? 0 : Math.round(Math.sin(t * 5 + y) * 1); B(g, L.lan[r], x + sw, y + d); }
    const S = rm ? [L.crest, 1] : slam(t, .14, L.crest, L.crW); if(S){ if(!rm && t >= .23 && !L.hit){ L.hit = true; kick(5); } BS(g, S[0], L.ccx, L.ccy, S[1]); }
    { const s = rm ? 0 : Math.round((1 - stepq((t - .26) / .1, 3)) * 8); B(g, L.ti, L.tx, L.ty + s + d); }   // the title rides its bar in from frame 1 (it waited .26 s, and the bar showed empty)
    if(rm || t > .34){ const n = rm ? L.pl.width : Math.min(L.pl.width, Math.floor((t - .34) / .01) * 4); if(n > 0) g.drawImage(L.pl, 0, 0, n, 9, L.px, L.py, n, 9); }
  } };

/* ---------------------------------------------------------------- shinkansen: sleek speed card, a 0-series nose. ivory / JNR blue / sky blue / ink */
CARDS.shinkansen = { dur:1.9, out:.3, exit:'right', hold:1.0, kanji:['超特急', '新幹線'],
  *build(cw, ch, nar){ const L = {}, K = { iv:'#f2efe4', bl:'#1a3a9a', sky:'#7aa8f0', ink:'#0a0c18', gr:'#b8bcc4' }; yield;
    const y0 = Math.round(ch * (nar ? .05 : .04)), y1 = Math.round(ch * (nar ? .17 : .2)), bh = y1 - y0, sk = bh * .5, band = mk(cw + sk, ch); yield;   // a thin band high in the sky
    // the band: ivory parallelogram with a blue rule top and bottom, cut by speed slits from the right
    yield* passG(band, g => { g.fillStyle = K.ink; g.beginPath(); g.moveTo(sk + 2, y0 - 3); g.lineTo(cw + sk, y0 - 3); g.lineTo(cw + sk, y1 + 3); g.lineTo(-2, y1 + 3); g.fill(); }); yield;
    yield* passG(band, g => { g.fillStyle = K.iv; g.beginPath(); g.moveTo(sk, y0); g.lineTo(cw + sk, y0); g.lineTo(cw + sk, y1); g.lineTo(0, y1); g.fill(); g.fillStyle = K.bl; g.fillRect(0, y1 - 3, cw + sk, 2); g.fillRect(sk * .2, y0 + 2, cw + sk, 1); }); yield;
    yield* toneG(band, '#dcd8cc', (x, y) => y > y0 && y < y1 - 3 && x > cw * .45 ? (x - cw * .45) / (cw * .7) * .5 : 0, 'bay'); yield;
    { const G = ctx(band), R = rnd(2); yield; G.globalCompositeOperation = 'destination-out'; yield; for(let i = 0; i < 6; i++){ const y = Math.round(y0 + 4 + R() * (bh - 10)); G.fillRect(cw * (.55 + R() * .4), y, cw, 1); } yield; G.globalCompositeOperation = 'source-over'; yield; } yield;
    // the 0-series nose, side-on, pointing right: the round bonnet, the blue window band, the skirt; headlight at the tip
    const nl = Math.round(nar ? cw * .55 : cw * .3), nx = Math.round(cw * (nar ? .02 : .04)) + sk * .3, ny = y0 + bh * .14, nh = bh * .7; yield;
    yield* passG(band, g => { g.fillStyle = K.ink; g.beginPath(); g.moveTo(nx - 20, ny); g.lineTo(nx + nl * .45, ny); g.bezierCurveTo(nx + nl * .8, ny, nx + nl, ny + nh * .45, nx + nl, ny + nh * .78); g.lineTo(nx + nl * .96, ny + nh); g.lineTo(nx - 20, ny + nh); g.fill(); }); yield;
    yield* passG(band, g => { g.fillStyle = K.iv; g.beginPath(); g.moveTo(nx - 20, ny + 1); g.lineTo(nx + nl * .45, ny + 1); g.bezierCurveTo(nx + nl * .79, ny + 1, nx + nl - 1.5, ny + nh * .45, nx + nl - 1.5, ny + nh * .78); g.lineTo(nx + nl * .95, ny + nh - 1); g.lineTo(nx - 20, ny + nh - 1); g.fill(); }); yield;
    yield* passG(band, g => { g.fillStyle = K.bl; g.beginPath(); g.moveTo(nx - 20, ny + nh * .2); g.lineTo(nx + nl * .62, ny + nh * .2); g.quadraticCurveTo(nx + nl * .78, ny + nh * .24, nx + nl * .82, ny + nh * .4); g.lineTo(nx - 20, ny + nh * .4); g.fill();
      g.fillRect(nx - 20, ny + nh * .78, nl * .93 + 20, nh * .12); }); yield;
    yield* passG(band, g => { g.fillStyle = K.ink; for(let i = 0; i < 4; i++) g.fillRect(nx + nl * (.05 + i * .13), ny + nh * .24, nl * .09, nh * .12); g.fillStyle = '#ffe9a0'; g.fillRect(nx + nl * .92, ny + nh * .58, 3, 2); }); yield;
    L.band = band; yield; L.sk = sk; yield; L.y0 = y0; yield; L.y1 = y1; yield;
    // 超特急: sleek sheared type, blue with an ink rim, slit through twice
    const ks = Math.round(nar ? Math.min(cw * .26, bh * .5) : Math.min(bh * .62, cw * .13)); yield; let km = shear(textM('超特急', 'reg', ks, { track:-1 }), .28); yield;
    km = slit(km, [[.36, .3], [.64, .55]]); yield;
    L.kj = (yield* inkedG(km, { fill:K.bl, line:K.ink, lw:1, sh:K.sky, sx:3, sy:0 })); yield;
    L.kx = nar ? Math.round(cw - L.kj.width - 4) : Math.round(cw * .76 - L.kj.width); yield; L.ky = nar ? y1 + 6 : Math.round(y0 + bh / 2 - L.kj.height / 2); yield;   // clear of the HUD's checkpoint panel
    // English above the band, subtitle under it, both flush right
    const tpx = Math.round(Math.min(ch * .07, cw * (nar ? .08 : .045))), ti = (yield* inkedG(shear(textM('BULLET TRAIN', 'dela', tpx, { track:2 , max:cw - 16 }), .2), { fill:K.iv, sh:K.bl, sx:2, sy:1 })); yield;
    const st = paint(t3M(nar ? 'BOOST PAST IT' : 'HIKARI 0-SERIES  //  BOOST PAST THE NOSE'), K.sky); yield;
    L.ti = ti; yield; L.st = st; yield; L.tx = nar ? 4 : Math.round(cw * .78 - ti.width); yield; L.ty = nar ? y1 + 8 : y1 + 5; yield; L.sx = nar ? L.tx : Math.round(cw * .78 - st.width); yield; L.sy = L.ty + ti.height + 2; yield;
    if(nar){ L.ty = L.ky + L.kj.height + 2; yield; L.tx = cw - ti.width - 4; yield; L.sx = cw - st.width - 4; yield; L.sy = L.ty + ti.height + 2; yield; } yield;
    // speed rules that run past above and below
    L.rules = []; yield; const R = rnd(13); yield; for(let i = 0; i < 7; i++) L.rules.push([R() * cw, i < 2 ? Math.max(1, y0 - 3) : y1 + 4 + Math.floor(R() * ch * .03), 10 + R() * cw * .3, R() < .5 ? K.sky : K.iv]); yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: the band whips in from the left in three frames with ghost copies
    const x = rm ? 0 : t < .12 ? -Math.round((1 - stepq(t / .12, 3)) * cw) : 0;
    if(!rm && t < .2 && t >= .04){ g.globalAlpha = .35; B(g, L.band, x - L.sk - 30, 0); g.globalAlpha = .18; B(g, L.band, x - L.sk - 64, 0); g.globalAlpha = 1; }
    B(g, L.band, x - L.sk, 0);
    if(!rm){ for(const r of L.rules){ const xx = ((r[0] - t * cw * 1.6) % (cw + r[2]) + cw + r[2]) % (cw + r[2]) - r[2]; g.fillStyle = r[3]; g.fillRect(Math.round(xx), r[1], Math.round(r[2]), 1); } }
    if(rm || t > .12){ const sl = rm ? 0 : Math.round((1 - stepq((t - .12) / .1, 3)) * cw * .5); if(!rm && t > .22 && !L.hit){ L.hit = true; kick(3); } B(g, L.kj, L.kx + sl, L.ky); }
    if(rm || t > .2) B(g, L.ti, L.tx, L.ty);
    if(rm || t > .28){ const n = rm ? L.st.width : Math.min(L.st.width, Math.floor((t - .28) / .01) * 4); if(n > 0) g.drawImage(L.st, 0, 0, n, L.st.height, L.sx, L.sy, n, L.st.height); }
  } };

/* ---------------------------------------------------------------- fuji: a calm ukiyo-e sunrise. Prussian night / dusk rose / paper / sun red / gold */
CARDS.fuji = { dur:2.3, out:.5, exit:'fade', hold:1.3, kanji:['富士'],
  *build(cw, ch, nar){ const L = {}, K = { n0:'#141f3c', n1:'#24406e', n2:'#6a6a98', n3:'#d88a86', n4:'#f2c8a0', pap:'#f4e8d0', sun:'#d8402e', ink:'#14244a' }; yield;
    const BH = Math.round(ch * (nar ? .26 : .3)), cols = [K.n0, K.n1, K.n2, K.n3, K.n4]; yield; L.BH = BH; yield; L.bands = []; yield;
    // bokashi in five printed bands, each blending into the next with a two-row dither, built as separate strips so they can print one by one
    for(let i = 0; i < 5; i++){ const y0 = Math.round(BH * i / 5), y1 = Math.round(BH * (i + 1) / 5), c = mk(cw, y1 - y0 + 3);
      yield* toneG(c, cols[i], () => 1, 'bay', 0, 0, cw, y1 - y0); if(i < 4) yield* toneG(c, cols[i + 1], (x, y) => y >= y1 - y0 - 3 ? .5 : 0, 'bay');
      L.bands.push([c, y0]); } yield;
    // mackerel clouds: rows of paper dashes in the lower bands
    const cl = mk(cw, BH), R = rnd(7), cg = ctx(cl); yield; cg.fillStyle = K.pap; yield; for(let r = 0; r < 4; r++){ const y = Math.round(BH * (.5 + r * .11)); for(let x = R() * 10; x < cw; x += 7 + R() * 10){ cg.fillRect(Math.round(x), y + (R() < .3 ? 1 : 0), Math.round(3 + R() * 5), 1); } } yield;
    L.cl = cl; yield;
    const edge = mk(cw, 3); yield; ctx(edge).fillStyle = K.pap; yield; ctx(edge).fillRect(0, 0, cw, 1); yield; ctx(edge).fillStyle = K.ink; yield; ctx(edge).fillRect(0, 1, cw, 1); yield; L.edge = edge; yield;
    // the sun, with a stepped halo
    const sr = Math.round(Math.min(ch * .07, BH * .28)), ss = sr * 4, sun = mk(ss, ss); yield;
    yield* toneG(sun, '#f0a070', (x, y) => { const r = Math.hypot(x - ss / 2, y - ss / 2); return r < sr * 1.8 ? (r < sr * 1.4 ? .5 : .25) : 0; }, 'bay'); yield;
    yield* passG(sun, g => { g.fillStyle = K.sun; g.beginPath(); g.arc(ss / 2, ss / 2, sr, 0, 6.2832); g.fill(); }); yield;
    L.sun = sun; yield; L.sux = Math.round(cw * (nar ? .74 : .8) - ss / 2); yield; L.suy = Math.round(BH * .62 - ss / 2); yield;
    // the cartouche: 富士 in mincho, with 夜明け beside it
    const ks = Math.round(Math.min(BH * .34, cw * (nar ? .16 : .08))), kj = paint(textM('富士', 'min', ks, { vert:true }), K.ink), sm = paint(textM('夜明け', 'dot', 16, { vert:true }), K.sun); yield;
    const car = mk(kj.width + sm.width + 16, Math.max(kj.height, sm.height) + 12), g2 = ctx(car); yield; g2.fillStyle = K.ink; yield; g2.fillRect(0, 0, car.width, car.height); yield; g2.fillStyle = K.pap; yield; g2.fillRect(1, 1, car.width - 2, car.height - 2); yield;
    g2.fillStyle = K.ink; yield; g2.fillRect(3, 3, car.width - 6, 1); yield; g2.fillRect(3, car.height - 4, car.width - 6, 1); yield; g2.fillRect(3, 3, 1, car.height - 6); yield; g2.fillRect(car.width - 4, 3, 1, car.height - 6); yield;
    g2.drawImage(kj, 6, 6); yield; g2.drawImage(sm, kj.width + 8, 7); yield; L.car = car; yield; L.cx = Math.round(cw * (nar ? .06 : .12)); yield; L.cy = 6; yield;
    const tpx = Math.round(Math.min(ch * .065, cw * (nar ? .075 : .04))), ti = paint(textM('FUJI AT DAWN', 'ant', tpx, { track:3 , max:cw - 16 }), K.pap), st = paint(t3M('THE NIGHT IS ENDING'), K.n4); yield;
    L.ti = ti; yield; L.st = st; yield; L.tx = Math.round(cw * .12 + car.width + 10); yield; L.ty = Math.round(BH * .34); yield;   // beside the cartouche, under the HUD's sun meter
    L.sx = Math.round(L.tx + ti.width / 2 - st.width / 2); yield; L.sy = L.ty + ti.height + 2; yield;
    if(nar){ L.tx = Math.round(cw / 2 - ti.width / 2); yield; L.sx = Math.round(cw / 2 - st.width / 2); yield; L.ty = BH + 6; yield; L.sy = L.ty + ti.height + 2; yield; } yield;
    return L; },
  draw(g, t, L, rm, cw, ch){
    // entry: the bands print one by one from the top, the sun climbs, then the cartouche and the title fade in
    const n = rm ? 5 : Math.min(5, Math.floor(t / .07) + 1);
    for(let i = 0; i < n; i++) B(g, L.bands[i][0], 0, L.bands[i][1]);
    if(rm || t > .35) B(g, L.cl, 0, 0);
    const sy = rm ? 0 : Math.round((1 - stepq((t - .2) / .7, 7)) * L.BH * .4); g.save(); g.beginPath(); g.rect(0, 0, cw, L.BH); g.clip(); if(rm || t > .2) B(g, L.sun, L.sux, L.suy + sy); g.restore();
    if(n >= 5) B(g, L.edge, 0, L.BH);
    const fa = (t0) => rm ? 1 : stepq((t - t0) / .3, 4);
    let a = fa(.4); if(a > 0){ g.globalAlpha = a; B(g, L.car, L.cx, L.cy); g.globalAlpha = 1; }
    a = fa(.55); if(a > 0){ g.globalAlpha = a; B(g, L.ti, L.tx, L.ty); B(g, L.st, L.sx, L.sy); g.globalAlpha = 1; }
  } };

/* ---------------------------------------------------------------- landmark jumps: one compact air-time cut-in, a kanji and an accent per road */
const JUMPS = { harbour:['港', '跳開橋', 'DRAWBRIDGE', '#ffb35a'], pass:['峠', '谷越え', 'RAVINE JUMP', '#e8e4d8'], sakurajima:['灰', '溶岩越え', 'LAVA LEAP', '#ff7a2a'],
  haneda:['空', '誘導路越え', 'TAXIWAY JUMP', '#6a9aff'], tunnels:['隧', '首都高越え', 'INTERCHANGE JUMP', '#ffb35a'], snow:['雪', 'ジャンプ台', 'SKI JUMP', '#bfe4ff'],
  paddies:['田', '線路越え', 'RAILWAY JUMP', '#e8d890'], refinery:['油', '配管越え', 'PIPELINE JUMP', '#ff9a3a'] };
for(const road in JUMPS){ const [kj1, word, name, acc] = JUMPS[road];
  CARDS['jump:' + road] = { dur:1.5, out:.26, exit:'left', hold:.8, kanji:[word],
    *build(cw, ch, nar){ const L = {}, K = { ink:'#0a0810', cr:'#f4ecdf', acc, dk:'#2a2230' }; yield;
      const y0 = Math.round(ch * (nar ? .12 : .14)), bh = Math.round(ch * (nar ? .13 : .16)), sk = bh * .6, band = mk(cw + sk * 2, bh + 10); yield;
      yield* passG(band, g => { g.fillStyle = acc; g.beginPath(); g.moveTo(sk + 4, 0); g.lineTo(cw + sk * 2, 0); g.lineTo(cw + sk * 2 - 4, 2); g.lineTo(sk + 2, 3); g.fill(); }); yield;
      yield* passG(band, g => { g.fillStyle = K.ink; g.beginPath(); g.moveTo(sk, 4); g.lineTo(cw + sk * 2, 4); g.lineTo(cw + sk, bh + 4); g.lineTo(0, bh + 4); g.fill(); }); yield;
      yield* passG(band, g => { g.fillStyle = acc; g.beginPath(); g.moveTo(-2, bh + 6); g.lineTo(cw + sk, bh + 6); g.lineTo(cw + sk - 1, bh + 8); g.lineTo(-3, bh + 8); g.fill(); }); yield;
      yield* toneG(band, K.dk, (x, y) => y > 5 && y < bh + 3 ? .5 * (x / band.width) : 0, 'bay'); yield;
      L.band = band; yield; L.sk = sk; yield; L.y0 = y0 - 4; yield; L.bh = bh; yield;
      // the road's kanji in an accent seal ring that overhangs the band
      const sr = Math.round(bh * (nar ? .56 : .72)), ss = sr * 2 + 4, seal = mk(ss, ss); yield;
      yield* passG(seal, g => { g.fillStyle = K.ink; g.beginPath(); g.arc(ss / 2, ss / 2, sr + 1, 0, 6.2832); g.fill(); }); yield;
      yield* passG(seal, g => { g.fillStyle = acc; g.beginPath(); g.arc(ss / 2, ss / 2, sr - 1, 0, 6.2832); g.fill(); }); yield;
      const km = paint(carve(textM(kj1, 'min', Math.round(sr * 1.3), {}), road.length, 6), K.ink); yield;
      ctx(seal).drawImage(km, Math.round(ss / 2 - km.width / 2), Math.round(ss / 2 - km.height / 2)); yield; L.seal = seal; yield; L.sealW = whiteOf(seal); yield;
      L.scx = nar ? sr + 3 : Math.round(cw * .12); yield; L.scy = y0 + bh / 2; yield;
      // the jump's name in kanji, cream heavy type; "AIR TIME" and the English name in the accent
      const wk = Math.max(1, Math.min(Math.round(bh * .6 / 16), Math.floor(Math.min(cw * .42, cw - (L.scx + sr + 10)) / ([...word].length * 16)))), wm = shear(scaleM(textM(word, 'dot', 16, { track:0 }), wk), .22); yield;
      L.w = (yield* inkedG(wm, { fill:K.cr, sh:acc, sx:2, sy:1 })); yield; L.wx = L.scx + sr + 6; yield; L.wy = Math.round(y0 + bh / 2 - L.w.height / 2); yield;
      const ap = Math.round(Math.min(ch * .055, cw * .04)), at2 = (yield* inkedG(shear(textM('AIR TIME!', 'dela', ap, { track:1 }), .2), { fill:acc, sh:K.ink, sx:1, sy:1 })); yield;
      const nm = paint(t3M(nar ? name : name + '  //  LANDMARK JUMP'), K.cr); yield; L.at = at2; yield; L.nm = nm; yield;
      L.ax = Math.min(cw - at2.width - 6, L.wx + L.w.width + 8); yield; L.ay = Math.round(y0 + 3); yield; L.nx = Math.min(cw - nm.width - 6, L.wx + L.w.width + 8); yield; L.ny = L.ay + at2.height + 2; yield;
      if(nar || L.ax + at2.width > cw - 4){ L.ax = cw - at2.width - 4; yield; L.ay = y0 + bh + 10; yield; L.nx = cw - nm.width - 4; yield; L.ny = L.ay + at2.height + 2; yield; } yield;
      L.lines = []; yield; const R = rnd(road.length * 7); yield; for(let i = 0; i < 7; i++) L.lines.push([R() * cw, y0 + 6 + Math.floor(R() * (bh - 8)), 8 + R() * cw * .2]); yield;
      return L; },
    draw(g, t, L, rm, cw, ch){
      const x = rm ? 0 : t < .1 ? Math.round((1 - stepq(t / .1, 3)) * cw) : 0;
      B(g, L.band, x - L.sk, L.y0);
      if(!rm){ g.fillStyle = '#4a4050'; for(const l of L.lines){ const xx = ((l[0] - t * cw * 1.4) % cw + cw) % cw; g.fillRect(Math.round(xx + x), l[1], Math.round(l[2]), 1); } }
      if(rm || t > .1){ const sl = rm ? 0 : Math.round((1 - stepq((t - .1) / .08, 3)) * cw * .3); B(g, L.w, L.wx + sl + x, L.wy); }
      const S = rm ? [L.seal, 1] : slam(t, .14, L.seal, L.sealW); if(S){ if(!rm && t >= .22 && !L.hit){ L.hit = true; kick(3); } BS(g, S[0], L.scx, L.scy, S[1]); }
      if(rm || t > .22) B(g, L.at, L.ax + (rm ? 0 : (t < .3 ? (Math.floor(t * 40) % 2) * 2 : 0)), L.ay);
      if(rm || t > .26){ const n = rm ? L.nm.width : Math.min(L.nm.width, Math.floor((t - .26) / .01) * 4); if(n > 0) g.drawImage(L.nm, 0, 0, n, L.nm.height, L.nx, L.ny, n, L.nm.height); }
    } }; }
for(const id in CARDS) for(const k of CARDS[id].kanji || []) if(!idOfKanji[k]) idOfKanji[k] = id;

/* ================================================================== exits: applied around a card's hold frame. e: 0..1 */
let SCR = null, PATS = null;
function exitDraw(g, kind, e, body, cw, ch, D, S){
  if(kind === 'split'){ const dx = Math.round(stepq(e, 6) * cw * .7), sl = ch * .14, sx = cw * .6;
    g.save(); g.translate(-dx, 0); g.beginPath(); g.moveTo(-cw, 0); g.lineTo(sx + sl, 0); g.lineTo(sx - sl, ch * .7); g.lineTo(sx - sl * 2, ch); g.lineTo(-cw, ch); g.clip(); body(); g.restore();
    g.save(); g.translate(dx, 0); g.beginPath(); g.moveTo(sx + sl, 0); g.lineTo(cw * 2, 0); g.lineTo(cw * 2, ch); g.lineTo(sx - sl * 2, ch); g.lineTo(sx - sl, ch * .7); g.clip(); body(); g.restore(); return; }
  if(kind === 'slash'){ const x0 = -ch * .5 + stepq(e, 6) * (cw + ch * .6);
    g.save(); g.beginPath(); g.moveTo(x0 + ch * .4, 0); g.lineTo(cw, 0); g.lineTo(cw, ch); g.lineTo(x0, ch); g.clip(); body(); g.restore();
    g.fillStyle = D.slashCol || '#ffffff'; for(let y = 0; y < ch; y += 2){ const xx = x0 + (1 - y / ch) * ch * .4; g.fillRect(Math.round(xx) - 3 + ((y * 5) % 3), y, 3, 2); } return; }
  if(kind === 'blinds'){ const k = 1 - stepq(e, 5), bh = 8; g.save(); g.beginPath(); for(let y = 0; y < ch; y += bh) g.rect(0, y, cw, Math.round(bh * k)); g.clip(); body(); g.restore(); return; }
  if(kind === 'up'){ g.save(); g.translate(0, -Math.round(stepq(e, 5) * ch * .7)); body(); g.restore(); return; }
  if(kind === 'right'){ g.save(); g.translate(Math.round(stepq(e, 3) * cw * 1.1), 0); body(); g.restore(); return; }
  if(kind === 'left'){ g.save(); g.translate(-Math.round(stepq(e, 3) * cw * 1.1), 0); body(); g.restore(); return; }
  if(kind === 'fade'){ g.globalAlpha = 1 - stepq(e, 4); body(); g.globalAlpha = 1; return; }
  if(kind === 'crt'){ const h = Math.max(1, Math.round(ch * (D.crtH || 1) * (1 - stepq(e * 1.4, 5)))), w = e < .72 ? cw : Math.max(2, Math.round(cw * (1 - stepq((e - .72) / .28, 3))));
    const cy0 = ch * (D.crtY || .26);
    if(h <= 1){ g.fillStyle = '#f4f8ff'; g.fillRect(Math.round(cw / 2 - w / 2), Math.round(cy0), w, 1); return; }
    g.save(); g.beginPath(); g.rect(0, Math.round(cy0 - h / 2), cw, h); g.clip(); body(); g.restore(); return; }
  // screentone dissolve: the hold frame is frozen into a scratch canvas once, then each nested Bayer level is punched out of it as it is reached
  // (the levels are nested, so punching is cumulative): per frame one drawImage
  if(kind === 'tone'){ if(!SCR || SCR.width !== cw || SCR.height !== ch) return body(); const sg = SCR.getContext('2d');
    if(!S.tone){ S.tone = 1; S.lv = 0; sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, cw, ch); sg.imageSmoothingEnabled = false; body(sg); }
    const lv = Math.min(4, 1 + Math.floor(e * 4.999)); if(lv > S.lv){ S.lv = lv; sg.globalCompositeOperation = 'destination-out'; sg.fillStyle = PATS[lv]; sg.fillRect(0, 0, cw, ch); sg.globalCompositeOperation = 'source-over'; }
    g.drawImage(SCR, 0, 0); return; }
  body(); }

/* ================================================================== runtime */
let BUILT = null, BKEY = '', cur = null, lastSc = 1; const WARNED = {};
function canvasSize(){ return (typeof cx !== 'undefined' && cx) ? [cx.canvas.width, cx.canvas.height] : [0, 0]; }
/* first 60 s (research/sundown-craft/first60.md): the build is split, so START's warm gate waits only for the cards the first minute can show.
   - warm() (MECH.cutin, waited for by START): the cards for the roads of the first minute (zones 0-2 and the first fork's two, as warmGate
     counts them): their set pieces' hero cards and their jump cards. Everything else is left for later.
   - MECH.cutinLate.warmSteps(): every other card, the kaiju card first, in small steps. Each card's build() is a generator that yields after
     every statement, and its layers are finished (fin) one per step, so a step is one drawing pass. It runs on the title and the results
     board, and in a ride only once sundown.html's warmBit has seen it step in under 12 ms on this device (never in the countdown).
   - A card still unbuilt when it is needed is built then (finishing its half-done build if the late build is inside it), timed, logged
     (console.warn and MECH.cutin.late) and shown as usual. warmAll() (resize, tests) builds every card at once, as before.
   The output is the same pixels as the single-pass build: the statements run in the same order, only paused between them. */
const ROADS = { kaiju:['bay'], typhoon:['coast'], greatwave:['coast'], megalodon:['aqua'], hanabi:['coast', 'neon', 'paddies'], matsuri:['coast', 'neon', 'paddies'],
  shinkansen:['coast', 'paddies', 'tunnels'], fuji:['coast', 'paddies', 'tunnels'], jetwash:['haneda'], fireball:['refinery'], avalanche:['snow'] };   // the roads whose set pieces call each hero card
const roadsOf = id => id.startsWith('jump:') ? [id.slice(5)] : ROADS[id] || null;
// the roads of the first minute (read only: never rolls a fork or a route), as warmGate counts them; null when the core is not there (build all)
function nearRoads(){ try{ if(typeof ROUTE === 'undefined' || typeof LANDS === 'undefined') return null; const S = new Set(), add = i => { if(i !== undefined && LANDS[i]) S.add(LANDS[i].key); };
    for(let z = 0; z <= 2; z++) add(ROUTE[z]); if(typeof FORKS !== 'undefined') for(let z = 0; z <= 2; z++) if(Array.isArray(FORKS[z])) FORKS[z].forEach(add); return S; }catch(e){ return null; } }
const fnBay = () => { try{ const k = z => ROUTE[z] !== undefined && LANDS[ROUTE[z]] ? LANDS[ROUTE[z]].key : ''; return typeof firstNight === 'function' && firstNight() && k(0) === 'bay' && k(1) !== 'bay' && k(2) !== 'bay'; }catch(e){ return false; } };   // the first night's bridge has no fight (setpiece/kaiju.js)
function earlyIds(){ const R = nearRoads(); if(!R) return Object.keys(CARDS); const fb = fnBay();
  return Object.keys(CARDS).filter(id => { const rs = roadsOf(id); if(!rs) return true; if(id === 'kaiju' && fb) return false; return rs.some(r => R.has(r)); }); }
// one card's build, stepped: build() statements, then each layer's fin() copy; the table is checked after every step (a resize or font rebuild abandons it)
function* cardGen(id, B0, cw, ch, nar){ let ms = 0, a = performance.now();
  try{ const it = CARDS[id].build(cw, ch, nar); let r; for(;;){ r = it.next(); if(r.done) break; ms += performance.now() - a; yield; a = performance.now(); if(BUILT !== B0) return; }
    const L = r.value; for(const k in L){ L[k] = fin(L[k]); if(L[k] instanceof HTMLCanvasElement){ ms += performance.now() - a; yield; a = performance.now(); if(BUILT !== B0) return; } } B0[id] = L; }
  catch(e){ B0[id] = null; if(!WARNED[id]){ WARNED[id] = 1; console.warn('cutin: card "' + id + '" failed to build; the moment falls back to its arrival card', e); } }   // caught per card, logged once
  ms += performance.now() - a; C.buildTimes[id] = Math.round(ms); }
const run = it => { for(const _ of it); };
// the table for this canvas size (a new one after a resize); the shared layers (the exit's scratch canvas and dither patterns) are made with it
function table(){ const [cw, ch] = canvasSize(); if(!cw) return null; const key = cw + 'x' + ch; if(BUILT && BKEY === key) return BUILT;
  BUILT = {}; BKEY = key; PEND = null; C.buildTimes = {}; SCR = mkF(cw, ch); PATS = [null];
  for(let lv = 1; lv <= 4; lv++){ const p = mkF(4, 4), pg = p.getContext('2d'); pg.fillStyle = '#000'; for(let i = 0; i < 16; i++) if(BAY[i] < lv / 4) pg.fillRect(i % 4, (i / 4) | 0, 1, 1); PATS.push(ctx(SCR).createPattern(p, 'repeat')); }
  return BUILT; }
const dims = () => { const [cw, ch] = canvasSize(); return [cw, ch, cw / ch < 1.05]; };
let PEND = null;   // the late build's card in progress: { id, B0, it }
function buildNow(id){ const B0 = table(); if(!B0 || id in B0) return; const [cw, ch, nar] = dims();
  if(PEND && PEND.id === id && PEND.B0 === B0) run(PEND.it); else run(cardGen(id, B0, cw, ch, nar)); }
// a card asked for before the late build reached it: built now, timed and logged
function need(id){ const B0 = table(); if(!B0 || id in B0) return; const a = performance.now(); buildNow(id); gSave(); const ms = Math.round(performance.now() - a);
  C.late.push([id, ms]); if(C.late.length > 20) C.late.shift(); console.warn('cutin: card "' + id + '" built on demand', ms + 'ms'); }
function warm(){ const t0 = performance.now(), B0 = table(); if(!B0) return; for(const id of earlyIds()) buildNow(id); gSave(); C.buildMs = performance.now() - t0; primeLate(); }
function warmAll(){ const t0 = performance.now(), B0 = table(); if(!B0) return; for(const id in CARDS) buildNow(id); gSave(); C.buildMs = performance.now() - t0; }
let LIT = null;
// the kaiju card goes last: it steps through the titans' voxel build (setpiece/kaiju.js), whose longest steps are the coarsest here, and it is
// only late when no fight can come in the first minute (otherwise warm() built it). A table replaced mid-way (resize, fonts) is started again.
function* lateGen(){ try{ const ids = Object.keys(CARDS).sort((a, b) => (a === 'kaiju') - (b === 'kaiju'));
    for(;;){ const B0 = table(); if(!B0) return; const [cw, ch, nar] = dims(); let again = false;
      for(const id of ids){ if(id in B0) continue; PEND = { id, B0, it:cardGen(id, B0, cw, ch, nar) }; yield* PEND.it; PEND = null; if(BUILT !== B0){ again = true; break; } yield; }
      if(!again) break; }
    gSave(); }finally{ PEND = null; LIT = null; } }
// START's gate (or the title) has built warm(): give the late build its first short slice through sundown.html's own warmSlice, so its step
// time is known and warmBit may carry it on in the ride under the same rule as every stepped job (a step under 12 ms here, never the countdown)
function primeLate(){ try{ const W = window.WARM; if(!W || !W.q || typeof window.warmSlice !== 'function') return; const j = W.q.find(x => x[2] === 'mech.cutinLate'); if(j && !j.it && j[3]) window.warmSlice(j, 2); }catch(e){} }
function lateSteps(){ return LIT || (LIT = lateGen()); }
function* warmSteps(){ warm(); }
MECH.cutinLate = { warm(){ run(lateSteps()); }, warmSteps:lateSteps };   // never waited for by START (sundown.html warmGate skips '...Late')
addEventListener('resize', () => { clearTimeout(warm.t); warm.t = setTimeout(() => { BUILT = null; warmAll(); }, 160); });

const QQ = []; const prio = id => id.startsWith('jump:') ? 1 : 2;
/* History: cut-ins were rationed (first sighting, then ~1 dressed visit in 3, hero cards 20 s apart, jump cards capped at two a ride and
   30 s apart). Kellan, 2026-11-19, reversed it: "let's always show the event cards please" (see spare() below). A card that is not shown
   (only a jump card inside the quiet system's quiet stretch, when that system is on) still returns true and sets MECH.cutin.skipped, so a
   caller whose card also carried an instruction (typhoon gusts, the Shinkansen race, the Fuji dawn) can still float its line. */
const GAP_J = 30, GAP_H = 20, JUMP_CAP = 2, HERO_AHEAD = 1100, JUMP_DELAY = .65;   // JUMP_DELAY: game s after the launch (the barricade's debris flies over the bike for .3-.6 s)   // seconds of game time; segments (about 20 s at top speed)
let clock = 0, lastEnd = -1e9, lastHeroEnd = -1e9, jumpsShown = 0;
function heroAhead(){ const R = MECH.director && MECH.director.gov && MECH.director.gov.R; if(!R || typeof position !== 'number') return false;
  const ps = (position + PZ) / SEG; return R.book.some(b => b.tier === 'hero' && !b.seen && b.seg > ps && b.seg - ps < HERO_AHEAD); }
// the message arbiter (MECH.quiet, mech/arrival.js): the director's quiet stretch shows no card at all; a jump card waits out the breath after a hero moment
// Kellan, 2026-11-19: "let's always show the event cards please". Every hero and set-piece card plays on every occurrence, and every landmark jump
// card on every jump (0.65 s after the launch, for the barricade smash): no dressed-visit roll, no hero gap, no jump cap or gap. Two cards that
// meet queue (one after the other), they are never dropped. Only the quiet system, when it is switched on (mech/arrival.js QUIET_ON), still
// holds a jump card back in its quiet stretch.
function spare(id){ const QT = MECH.quiet; if(prio(id) === 1 && QT && QT.quietOn()) return 'quiet'; return ''; }
function start(id, o){ const L = BUILT[id]; L.hit = false; cur = { id, t:0, D:CARDS[id], L, dur:(o && o.dur) || CARDS[id].dur }; if(prio(id) === 1) jumpsShown++;
  else { const DI = MECH.director; if(DI && DI.endQuiet) DI.endQuiet(); } }   // a hero card is never held back by the quiet stretch: it ends it
// the lowest row of a card's titles (its type, labels, tapes, kanji), from its built layers: what must stay above the road
function titleBottom(L){ let b = 0; const h = c => c && c.height || 0;
  for(const [y, c] of [['ty', 'ti'], ['sy', 'sub'], ['sy', 'st'], ['ly', 'lab'], ['py', 'tape'], ['dy', 'dk'], ['ky', 'kj'], ['ay', 'at2'], ['ny', 'nm'], ['by', 'bil']]) if(typeof L[y] === 'number' && L[c]) b = Math.max(b, L[y] + h(L[c]));
  if(L.goP && L.go) L.goP.forEach((p, i) => { b = Math.max(b, p[1] + h(L.go[i])); }); return b; }
function ended(c){ lastEnd = clock; if(prio(c.id) === 2){ lastHeroEnd = clock; if(MECH.quiet) MECH.quiet.breathe(32); } }   // after a hero card: breathing room (no card, no information) for ~32 s
function rebuild(){ fontRebuild = false; BUILT = null; warm(); if(!(window.warmLater && warmLater('mech.cutinLate', lateSteps))) warmAll(); }   // on the title the rest is re-queued in steps; elsewhere it is built at once, as before
function calm(){ if(fontRebuild && !cur && (typeof state === 'undefined' || state !== 'play')) rebuild(); }
const C = MECH.cutin = {
  CARDS, buildMs:0, buildTimes:{}, late:[],
  has(id){ if(!CARDS[id]) return false; if(BUILT && id in BUILT) return !!BUILT[id]; return true; },   // (a card not built yet is built when shown)   // false for a card whose build failed, so callers use their fallback
  idFor(card){ if(!card) return null; if(card.id && CARDS[card.id]) return card.id; return idOfKanji[card.kanji] || null; },
  on(){ return !!cur; },
  /* show(id): play now. Moments can land together (a jump on the road where the fireworks start; a race starting as they peak), so:
     a hero card on screen is never cut off. A jump arriving meanwhile is absorbed (true: the bigger card already covers the moment, so the
     caller shows no fallback badge either); another hero queues and plays as soon as this one ends (dropped if it would wait over 2.5 s).
     A hero arriving over a jump card replaces it. */
  show(id, o){ C.skipped = false; if(!CARDS[id]) return false; need(id); if(!BUILT || !BUILT[id]) return false; o = o || {};
    const pr = prio(id), why = o.force ? '' : spare(id);
    if(why){ C.skipped = why; return true; }
    if(cur && cur.t < cur.dur - (cur.D.out || .35) && !(pr > prio(cur.id))){ QQ.push({ id, o, wait:0, delay:0 }); return true; }   // a card is up: this one plays right after it
    if(pr === 1 && !o.force && !o.now){ QQ.push({ id, o, wait:0, delay:JUMP_DELAY }); return true; }   // a jump's card waits for the barricade smash at the lip to clear
    start(id, o); return true; },
  hide(){ cur = null; QQ.length = 0; },   // drop now (the finale, tests): not counted as a card the rider saw
  skipped:false,
  get av(){ return Object.assign({}, AV); },
  get cur(){ return cur ? cur.id + '@' + cur.t.toFixed(2) : null; },
  rebuild,
  warm,
  warmSteps,
  warmAll,
  update(dt){ calm(); if(typeof state !== 'undefined' && state === 'ready'){ cur = null; QQ.length = 0; }   // the ride ended: drop it
    const ug = dt / (window.TIME && window.TIME.core ? (lastSc || 1) : 1); lastSc = window.TIME ? window.TIME.scale || 1 : 1;
    clock += ug; if(cur){ cur.t += ug; if(cur.t >= cur.dur){ ended(cur); cur = null; } }
    for(let i = QQ.length - 1; i >= 0; i--){ QQ[i].wait += ug; if(QQ[i].wait > 10) QQ.splice(i, 1); }   // (only a card stuck 10 s behind others goes)
    if(!cur && QQ.length && BUILT && BUILT[QQ[0].id] && QQ[0].wait >= (QQ[0].delay || 0)){ const q = QQ.shift(); start(q.id, q.o); } },
  reset(){ cur = null; QQ.length = 0; clock = 0; lastEnd = lastHeroEnd = -1e9; jumpsShown = 0; },
  post(){ if(!cur){ calm(); return; } if(typeof cx === 'undefined') return; const g = cx, [cw, ch] = canvasSize(), D = cur.D, L = cur.L, t = cur.t, dur = cur.dur, out = D.out || .35;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // above the road, whole: when the live road (a crest) rises over the card's title, lift the card (only ever up, at most 12% of the height)
    if(MECH.quiet && MECH.quiet.roadTop && typeof state !== 'undefined' && state === 'play'){ const tb = L.tb != null ? L.tb : (L.tb = titleBottom(L)), rt = MECH.quiet.roadTop() - 3;
      cur.dy = Math.min(cur.dy || 0, -Math.min(Math.max(0, tb - rt), Math.round(ch * .12))); if(cur.dy) g.translate(0, cur.dy); }
    try{
      if(reduce){ const a = t < .4 ? stepq(t / .4, 4) : t > dur - .4 ? 1 - stepq((t - (dur - .4)) / .4, 4) : 1; if(a > 0){ g.globalAlpha = a; D.draw(g, D.hold, L, true, cw, ch); } }
      else { const te = t - (dur - out); if(te <= 0) D.draw(g, t, L, false, cw, ch);
        else { const th = dur - out; exitDraw(g, D.exit, te / out, (tg) => D.draw(tg || g, th, L, false, cw, ch), cw, ch, D, cur); } }
    }catch(e){ if(!WARNED['d:' + cur.id]){ WARNED['d:' + cur.id] = 1; console.warn('cutin: card "' + cur.id + '" failed to draw; dropped', e); } if(BUILT) BUILT[cur.id] = null; cur = null; }
    g.restore(); },
  // tests: seek the card on screen; draw a card at time t without the runtime
  seek(t){ if(cur) cur.t = t; },
  _drop(){ BUILT = null; LIT = null; PEND = null; },
  frame(id, t, rm){ buildNow(id); gSave(); const L = BUILT[id]; cur = { id, t, D:CARDS[id], L, dur:CARDS[id].dur }; const r = reduce; if(rm != null) reduce = rm; C.post(); reduce = r; cur = null; }
};
})();
