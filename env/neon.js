/* Sundown environment: Neon Ward. See env/README.md for the hooks.

   References studied (rules taken, no art copied):
   - Kabukicho at night (photos: the red bulb gate, "Colorful neon street signs in Kabukicho"): the street is a canyon; vertical blade signs
     stick out from every facade at many heights and stack toward the vanishing point; most signs are LIGHTBOXES (white, yellow or red faces
     with dark or red characters), only some are bare neon tubes; the gate over the street is a tube studded with bulbs around a white
     lightbox; street-level shops pour warm light onto the pavement; the sky is black and all light comes from the signs.
   - Shinjuku Golden Gai (photo "Before the Storm"): small, varied sign shapes; cables, AC units, pipes, awnings and lanterns at every height.
   - Katana Zero (Askiisoft): neon is a near-white core, a saturated mid and a stepped halo; the whole frame is graded toward one hue.
   - VA-11 Hall-A (Sukeban): a limited magenta/violet palette with cyan accents, hard 1px outlines, flat colour, dark-hue shadows.
   - Streets of Rage 3 (Sega): floors and walls lit in 3-4 tone ramps with ordered dither between bands, no smooth gradients.
   - Hydro Thunder (Midway): landmarks far bigger than you that you pass beside and under, and things that move on their own.
   Built here: lit facades forming a sign canyon, lightbox and neon blade signs, a bulb gate, paper-lantern strings, a pedestrian bridge with
   walkers, a giant screen over a scramble crossing, yatai stalls with steam, vending machines, wet-road reflections, a billboard skyline
   with an advertising blimp, drizzle and a magenta grade. */
"use strict";
(() => {
  const C = {}, OUT = '#07050c';
  const cache = (key, fn) => C[key] || (C[key] = fn());
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const rgb = c => hx(c), rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;
  const lighten = (c, t) => mixc(c, '#ffffff', t), darken = (c, t) => mixc(c, OUT, t);
  const B4 = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

  /* ---------------------------------------------------------------- pixel font glyphs (DotGothic16 on its native 16px grid, thresholded) */
  const WORDS = ['焼鳥', '酒場', 'カラオケ', 'ラーメン', '麻雀', '喫茶', '占い', '寿司', '居酒屋', '餃子', '珈琲', 'ホテル', '雀荘', 'おでん', '夜食', '満月', '銭湯', '遊技場', 'スナック', 'うどん'];
  const EXTRA = '月光一番街夜明けまで営業中玉パチンコ大当り招福';
  let fontOK = false, fontAsked = false;
  let fontScan = -1e9;
  function fontReady(){ if(fontOK) return true; if(!document.fonts || fontAsked) return false; const tn = performance.now(); if(tn - fontScan < 500) return false; fontScan = tn; let any = false; document.fonts.forEach(f => { if(/DotGothic/.test(f.family)) any = true; });
    if(any){ fontAsked = true; document.fonts.load('16px "DotGothic16"', WORDS.join('') + EXTRA).then(() => { fontOK = true; }, () => { fontOK = true; }); } return false; }
  const GM = {};
  function glyph(ch){ if(GM[ch]) return GM[ch]; if(!fontReady()) return null; const [c, k] = canvas(18, 18); k.font = '16px "DotGothic16"'; k.textBaseline = 'top'; k.fillStyle = '#fff'; k.fillText(ch, 1, 1);
    const d = k.getImageData(0, 0, 18, 18).data, m = new Uint8Array(324); let x0 = 18, y0 = 18, x1 = -1, y1 = -1;
    for(let i = 0; i < 324; i++) if(d[i * 4 + 3] > 120){ m[i] = 1; const x = i % 18, y = (i / 18) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return GM[ch] = { m, x0, y0, x1, y1 }; }
  // stamp a glyph centred in a cell; ring = colour for a 1px halo around strokes (neon tubes)
  function stamp(k, ch, cx0, cy0, cell, col, ring){ const g = glyph(ch); if(!g || g.x1 < 0) return; const ox = cx0 + Math.floor((cell - (g.x1 - g.x0 + 1)) / 2) - g.x0, oy = cy0 + Math.floor((cell - (g.y1 - g.y0 + 1)) / 2) - g.y0;
    if(ring){ k.fillStyle = ring; for(let y = 0; y < 18; y++) for(let x = 0; x < 18; x++){ if(g.m[y * 18 + x]) continue; let n = 0; for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const xx = x + dx, yy = y + dy; if(xx >= 0 && yy >= 0 && xx < 18 && yy < 18 && g.m[yy * 18 + xx]) n++; } if(n) k.fillRect(ox + x, oy + y, 1, 1); } }
    k.fillStyle = col; for(let y = 0; y < 18; y++) for(let x = 0; x < 18; x++) if(g.m[y * 18 + x]) k.fillRect(ox + x, oy + y, 1, 1); }
  // little kanji-like marks for signs too small to hold a real character
  function pseudo(k, x, y, w, h, col, r){ k.fillStyle = col; for(let gx = x; gx + 3 <= x + w; gx += 4){ const p = (r() * 4096) | 0; for(let b = 0; b < 12; b++) if(p >> b & 1) k.fillRect(gx + b % 3, y + ((b / 3) | 0) % h, 1, 1); } }

  const mirror = c => c._m || (c._m = (() => { const [m, k] = canvas(c.width, c.height); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return m; })());
  function blitF(c, x, yB, k, flip){ const w = c.width * k, h = c.height * k; cx.drawImage(flip ? mirror(c) : c, Math.round(x - w / 2), Math.round(yB - h), w, h); }
  // light halos and ground pools as cached sprites: three hard-edged steps baked in, drawn additively with one drawImage
  const haloS = col => C['ha' + col] || cache('ha' + col, () => { const [c, k] = canvas(32, 32), [R, G, B] = rgb(col); k.globalCompositeOperation = 'lighter';
    for(const [f, m] of [[1, .07], [.6, .16], [.3, .4]]){ k.fillStyle = `rgba(${R},${G},${B},${m})`; for(let y = 0; y < 32; y++) for(let x = 0; x < 32; x++){ const dx = x + .5 - 16, dy = y + .5 - 16; if(dx * dx + dy * dy <= (16 * f) * (16 * f)) k.fillRect(x, y, 1, 1); } } return c; });
  const poolS = col => C['po' + col] || cache('po' + col, () => { const [c, k] = canvas(32, 8), [R, G, B] = rgb(col); k.globalCompositeOperation = 'lighter';
    for(const [f, m] of [[1, .08], [.62, .14], [.32, .22]]){ k.fillStyle = `rgba(${R},${G},${B},${m})`; for(let y = 0; y < 8; y++) for(let x = 0; x < 32; x++){ const dx = (x + .5 - 16) / 16, dy = (y + .5 - 4) / 4; if(dx * dx + dy * dy <= f * f) k.fillRect(x, y, 1, 1); } } return c; });
  function glow(x, y, r, col, a){ if(r < PX || a <= .01 || x + r < 0 || x - r > W || y + r < 0 || y - r > H) return; const ga = cx.globalAlpha; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga * Math.min(1, a);
    cx.drawImage(haloS(col), Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2)); cx.globalAlpha = ga; cx.globalCompositeOperation = 'source-over'; }
  function pool(x, y, rw, col, a){ if(a <= .01 || rw < 2 || x + rw < 0 || x - rw > W) return; const ga = cx.globalAlpha, rh = Math.max(PX, rw * .18); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga * Math.min(1, a);
    cx.drawImage(poolS(col), Math.round(x - rw), Math.round(y - rh), Math.round(rw * 2), Math.round(rh * 2)); cx.globalAlpha = ga; cx.globalCompositeOperation = 'source-over'; }

  /* ---------------------------------------------------------------- facades: the canyon walls. Built with the road side on the right
     (front face + a narrow side wall facing the road), mirrored for the right-hand side. Light comes from the street: the side wall
     catches the neon of its own signs in dithered steps; windows are lit warm, karaoke-pink, office-cyan or dark. */
  const FAC = [['#08060f', '#140f22', '#1f1834', '#30264c'], ['#060b14', '#0d1726', '#15233a', '#223854'], ['#0f0710', '#1e0f1c', '#2e1828', '#46243c'], ['#0a0a12', '#16161f', '#23232f', '#383848']];
  const AWNS = [['#c8203a', '#efe2da'], ['#17607a', '#e4e0da'], ['#4a2678', '#ffd04a'], ['#e0306e', '#2a0f22'], ['#2a7a46', '#efe2da']];
  const GLASS = { warm:['#ffe6aa', '#f2b45e', '#c8843e'], pink:['#ffb0dc', '#d8408c', '#a02a6a'], cyan:['#b8f6ff', '#3eaad2', '#24769c'], dark:['#2a2440', '#0d0a18', '#0d0a18'] };
  const FW = 44, SW = 9;
  function facade(v){ const ck = 'fac' + v; return C[ck] || cache(ck, () => {
    const r = rng(v * 7919 + 101), [D, S, M, L] = FAC[v % 4], spill = NEON[v % 5], H2 = 82 + ((v * 5) % 6) * 10, top = 8, street = H2 - 21, W2 = FW + SW;
    const [c, k] = canvas(W2, H2), R = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); };
    R(0, top, FW, H2 - top, M); for(let x = 11; x < FW - 2; x += 11) R(x, top + 3, 1, street - top - 3, mixc(M, S, .55));
    R(0, top, 1, H2 - top, D); R(FW - 1, top, 1, H2 - top, L); R(0, top, FW, 2, L); R(0, top + 2, FW, 1, D);
    // side wall toward the road, washed by its signs in ordered-dither steps (stronger lower down, nearer the street lights)
    R(FW, top + 2, SW, H2 - top - 2, S); R(FW, top + 2, SW, 1, D); R(W2 - 1, top + 2, 1, H2 - top - 2, D);
    const sp = mixc(S, spill, .18), sp2 = mixc(S, spill, .34); for(let y = top + 3; y < H2; y++){ const t = (y - top) / (H2 - top); for(let x = FW + 1; x < W2 - 1; x++) { const q = Math.floor(t * 3 + B4(x, y) * .6) / 3; if(q >= 1 / 3) R(x, y, 1, 1, q >= 2 / 3 ? sp2 : sp); } }
    R(FW, top + 2, 1, H2 - top - 2, mixc(L, spill, .5));
    for(let y = top + 6; y + 6 < street; y += 13){ const g = r(), wc = g < .45 ? GLASS.warm : g < .6 ? GLASS.pink : GLASS.dark; R(FW + 2, y, 4, 5, OUT); R(FW + 3, y + 1, 2, 3, wc[1]); R(FW + 3, y + 1, 2, 1, wc[0]);
      if(r() < .4){ R(FW + 2, y + 7, 5, 3, '#3a3a48'); R(FW + 2, y + 7, 5, 1, '#5a5a6c'); } }
    // floors
    const win = (x, y, w, h, kind) => { const [hi, mid, lo] = GLASS[kind]; R(x - 1, y - 1, w + 2, h + 2, D); R(x, y, w, h, mid); R(x, y, w, 1, hi);
      if(kind === 'dark'){ for(let i = 0; i < Math.min(w, h); i++) R(x + w - 2 - i, y + 1 + i, 1, 1, hi); return; }
      for(let yy = y + 3; yy < y + h; yy += 2) R(x, yy, w, 1, lo);
      if(r() < .3){ const sx = x + 1 + ((r() * (w - 3)) | 0); R(sx, y + h - 4, 2, 4, darken(lo, .5)); R(sx, y + h - 5, 2, 1, darken(lo, .5)); } };
    for(let y0 = top + 4; y0 + 13 <= street; y0 += 13){ const g = r(), kind = g < .4 ? 'warm' : g < .55 ? 'pink' : g < .65 ? 'cyan' : 'dark';
      if(r() < .5){ win(3, y0 + 2, FW - 9, 7, kind); for(let x = 9; x < FW - 7; x += 7) R(x, y0 + 2, 1, 7, D); }
      else for(let x = 3; x + 9 < FW - 3; x += 13){ const g2 = r(); win(x, y0 + 2, 9, 7, g2 < .5 ? kind : g2 < .8 ? 'dark' : 'warm'); }
      if(r() < .55){ const ax = 3 + ((r() * (FW - 12)) | 0); R(ax, y0 + 10, 6, 3, '#3a3a48'); R(ax, y0 + 10, 6, 1, '#6a6a7c'); R(ax + 1, y0 + 11, 4, 1, '#22222c'); }
      R(1, y0 + 11, FW - 2, 1, mixc(M, L, .5)); R(1, y0 + 12, FW - 2, 1, S);
      if(r() < .35){ const bx = FW - 17, col = ['#f4ecf0', '#ffd04a', '#ff5a7a', '#7af0ff'][(r() * 4) | 0]; R(bx - 1, y0 + 2, 14, 7, D); R(bx, y0 + 3, 12, 5, col); R(bx, y0 + 3, 12, 1, lighten(col, .5)); pseudo(k, bx + 1, y0 + 4, 11, 3, darken(col, .75), r); } }
    if(v % 2) { R(FW - 4, top + 3, 2, street - top - 3, S); R(FW - 4, top + 3, 1, street - top - 3, mixc(L, spill, .25)); }
    // storefront: striped awning with a scalloped hem, a lit shop interior, a noren-curtained door or a dark bar front
    const [a1, a2] = AWNS[v % 5]; for(let x = 0; x < FW; x++){ R(x, street, 1, 4, ((x / 3) | 0) % 2 ? a1 : a2); if(x % 3 !== 2) R(x, street + 4, 1, 1, ((x / 3) | 0) % 2 ? a1 : a2); }
    R(0, street, FW, 1, lighten(a2, .3)); R(0, street + 5, FW, H2 - street - 5, D);
    if(v % 3 !== 2){ R(2, street + 6, FW - 15, H2 - street - 8, '#f6c878'); R(2, street + 6, FW - 15, 1, '#fff2cc');
      for(let y = street + 9; y < H2 - 2; y += 4){ R(2, y, FW - 15, 1, '#b8743a'); for(let x = 3; x < FW - 14; x += 2) if(r() < .55) R(x, y - 2, 1, 2, NEON[(r() * 5) | 0]); } }
    else { R(2, street + 6, FW - 15, H2 - street - 8, '#2a1610'); R(4, street + 8, 8, 5, '#ffcf80'); R(4, street + 8, 8, 1, '#fff0c8'); R(14, street + 7, 3, 4, '#e83a3a'); R(15, street + 11, 1, 1, '#ffb070'); }
    R(FW - 11, street + 6, 8, H2 - street - 7, '#ffd890'); R(FW - 11, street + 6, 8, 5, '#26307a'); for(let x = FW - 10; x < FW - 3; x += 3) R(x, street + 6, 1, 5, '#ffd890'); R(FW - 8, street + 8, 2, 1, '#e8e4dc');
    R(0, H2 - 1, W2, 1, OUT);
    // roof kit
    if(v % 3 === 0){ R(5, 1, 11, 5, S); R(5, 1, 11, 1, L); R(6, 6, 1, top - 6, D); R(14, 6, 1, top - 6, D); }
    else if(v % 3 === 1){ R(FW - 10, 0, 1, top, D); R(FW - 13, 2, 7, 1, D); R(FW - 10, 0, 1, 1, '#ff3030'); R(4, top - 3, 8, 3, S); R(4, top - 3, 8, 1, L); }
    else { for(let x = 3; x < 30; x += 9){ R(x, top - 4, 7, 4, '#3a3a48'); R(x, top - 4, 7, 1, '#6a6a7c'); } }
    return c; }); }

  /* ---------------------------------------------------------------- blade signs: vertical, three looks. Lightbox (white face, red or ink
     characters, brighter in the middle like the tubes inside), colour lightbox, and bare neon (white-hot core, coloured tube, dark board).
     Frames: 0 on, 1 off, 2 half-broken (for flicker). */
  function blade(v, fr){ const fk = fontReady() ? 1 : 0; const ck = 'bl' + v + ':' + fr + ':' + fk; return C[ck] || cache(ck, () => {
    const word = WORDS[v % WORDS.length], n = word.length, style = v % 3, col = NEON[(v * 3 + 1) % 5], w = 22, h = n * 15 + 9, k = bladeScratch(w, h), R = (x, y, ww, hh, cc) => { k.fillStyle = cc; k.fillRect(x, y, ww, hh); };
    R(0, 0, w, h, OUT); R(1, 1, w - 2, 2, '#4a4458'); R(1, h - 3, w - 2, 2, '#3a3448'); R(2, 1, w - 4, 1, '#7a7490');
    const y0 = 3, bh = h - 6;
    if(style === 1){ const on = fr === 0, half = fr === 2, mid = on || half ? col : darken(col, .65), core = on || half ? lighten(col, .75) : darken(col, .5);
      R(1, y0, w - 2, bh, '#130a1c'); k.strokeStyle = mid; k.lineWidth = 1; k.strokeRect(2.5, y0 + 1.5, w - 5, bh - 3); k.strokeStyle = core; k.strokeRect(3.5, y0 + 2.5, w - 7, bh - 5); k.strokeStyle = mid; k.strokeRect(4.5, y0 + 3.5, w - 9, bh - 7);
      for(let i = 0; i < n; i++){ const lit = on || (half && i !== n - 1); stamp(k, word[i], 3, y0 + 3 + i * 15, 16, lit ? core : darken(col, .55), lit ? mid : null); } }
    else { const body = style === 0 ? '#f6eef2' : col, ink = style === 0 ? (v % 2 ? '#c8183a' : '#1a1430') : v % 2 ? '#1a0a18' : '#ffffff', on = fr !== 1;
      const bb = on ? body : darken(body, .55); R(1, y0, w - 2, bh, bb); R(1, y0, 1, bh, darken(col, .2)); R(w - 2, y0, 1, bh, darken(col, .2)); R(2, y0, 2, bh, mixc(bb, col, .3)); R(w - 4, y0, 2, bh, mixc(bb, col, .3));
      if(on) R(8, y0, 6, bh, lighten(bb, .35));
      for(let i = 0; i < n; i++) stamp(k, word[i], 3, y0 + 3 + i * 15, 16, on ? ink : darken(ink, .4), null); }
    const [c, kc] = canvas(w, h); kc.drawImage(k.canvas, 0, 0); c._px = { w, h, d:new Uint32Array(k.getImageData(0, 0, w, h).data.buffer) };   // the same pixels; its copy for the 2x/4x atlas, read without a GPU read-back
    return c; }); }
  // a sign is drawn on a CPU-side scratch canvas (whole-pixel rects only: the same pixels as on a GPU canvas), then copied to its own canvas,
  // so bladeAtlasSteps can Scale2x it without reading a GPU canvas back: each read-back waited ~8-10 ms on the GPU (first 60 s)
  let BSC = null; function bladeScratch(w, h){ if(!BSC) BSC = document.createElement('canvas').getContext('2d', { willReadFrequently:true }); BSC.canvas.width = w; BSC.canvas.height = h; return BSC; }   // (setting the size clears it and resets its state)
  const bladeCol = v => (v % 3 === 0 ? '#ffe8f0' : NEON[(v * 3 + 1) % 5]);

  /* ---------------------------------------------------------------- small sprites */
  const LANT = ['..KK', '.Krr', 'Krro', 'Kroy', 'Kroy', 'Kroy', 'Krro', '.Krr', '..KK', '...K'];
  const lantern = w => C['lan' + w] || cache('lan' + w, () => makeSprite(LANT, w ? { K:'#1a0e08', r:'#c8b49a', o:'#efe0c8', y:'#fff8ea' } : { K:'#1a0608', r:'#a8162a', o:'#e83a3a', y:'#ffb070' }));
  const WALK = [['.KK.', '.KK.', 'KKKK', 'KKKK', 'KKKK', '.KK.', '.KK.', 'K..K', 'K..K'], ['.KK.', '.KK.', 'KKKK', 'KKKK', 'KKKK', '.KK.', '.KK.', '.KK.', '.KK.']];
  const walker = f => C['wk' + f] || cache('wk' + f, () => makeSprite(WALK[f], { K:'#0b0612' }, false));
  // shotengai street lamp: a pole, a globe on an arm over the pavement and a street banner
  const lampS = () => C['lamp'] || cache('lamp', () => { const [c, k] = canvas(16, 50), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    R(3, 6, 2, 44, '#241e30'); R(4, 6, 1, 44, '#4e4864'); R(1, 46, 6, 4, '#1a1622'); R(3, 5, 9, 1, '#241e30'); R(3, 4, 9, 1, '#4e4864');
    R(9, 6, 5, 5, OUT); R(10, 6, 3, 5, '#ffe6b0'); R(9, 7, 5, 3, '#ffe6b0'); R(10, 7, 3, 3, '#fffaf0'); R(10, 11, 3, 1, '#4e4864');
    R(5, 14, 6, 18, '#c8203a'); R(5, 14, 6, 1, '#f0e0d8'); R(5, 31, 6, 1, '#f0e0d8'); R(5, 14, 1, 18, '#ff5a6a'); R(7, 17, 2, 1, '#f6eee6'); R(6, 18, 4, 2, '#f6eee6'); R(7, 20, 2, 1, '#f6eee6'); R(7, 18, 2, 2, '#ffd04a'); R(5, 25, 6, 1, '#1a1430'); R(5, 27, 6, 1, '#1a1430'); R(6, 32, 2, 2, '#c8203a'); R(9, 32, 2, 1, '#c8203a');
    return c; });
  function vend(v){ const ck = 'vd' + v; return C[ck] || cache(ck, () => { const body = ['#e8e4ec', '#c8203a', '#2050b0'][v], [c, k] = canvas(12, 21), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    R(0, 0, 12, 21, OUT); R(1, 1, 10, 19, body); R(1, 1, 1, 19, lighten(body, .35)); R(10, 1, 1, 19, darken(body, .3)); R(2, 1, 8, 3, '#fff6d0'); R(2, 2, 8, 1, '#ffffff');
    R(2, 5, 8, 8, '#1a2236'); for(let row = 0; row < 2; row++) for(let i = 0; i < 4; i++){ R(2 + i * 2, 6 + row * 3, 1, 2, NEON[(i + row * 2 + v) % 5]); R(2 + i * 2, 8 + row * 3, 1, 1, '#5aff9a'); }
    R(2, 5, 8, 1, '#e8f4ff'); R(7, 14, 3, 3, '#5a5a6a'); R(8, 15, 1, 1, '#ffd04a'); R(2, 17, 8, 2, '#0c0a12'); return c; }); }
  /* The vending machine near by (buildings3d r5): it used to fade out from 4x to 7x, so it ghosted half-transparent as it passed. Now the same
     12 x 21 design is drawn again at 2x / 4x / 8x its sprite resolution from a material in sprite coordinates (X, Y; e = one fine pixel), so
     the footprint is identical and only edge detail is added (studied: a white beverage machine in Tokyo and the Ohama PA row at night,
     Commons): the lit header with its brand line, the display behind clear plastic with a lamp bar, cans as small cylinders (cap, lit edge,
     label band) on two shelves, a rail of round push buttons (lit green: 販売中), a diagonal glint on the plastic, the blank ad panel, the
     coin panel with its red LED price, slot and return lever, the take-out pocket with its flap, a kick plate. Built in the warm steps. */
  const vendHi = (v, R) => cache('vdh' + v + '_' + R, () => { const body = ['#e8e4ec', '#c8203a', '#2050b0'][v], W0 = 12, H0 = 21, [c, k] = canvas(W0 * R, H0 * R), im = k.createImageData(W0 * R, H0 * R), e = 1 / R;
    const BL = lighten(body, .35), BH = lighten(body, .6), BD = darken(body, .3), BK = darken(body, .22), AD = lighten(body, .14), ADE = darken(body, .12);
    const mat = (X, Y) => {
      if(X < e || X > W0 - e || Y < e || Y > H0 - e) return OUT;
      if(X < 1 || X >= 11 || Y < 1) return OUT;
      if(X < 2 && Y < 20){ return X < 1 + e ? BH : BL; }                                                              // the lit left edge
      if(X >= 10 && Y < 20){ return X > 11 - e ? OUT : BD; }
      if(Y >= 20) return Y < 20 + e ? BK : OUT;
      if(Y < 4){ if(Y < 1 + e) return BK; if(Y < 2) return '#fff6d0'; if(Y < 3) return Y < 2 + e ? '#ffffff' : '#fffbe8';   // the header: the brand line in a warm tone
        if(R >= 4 && Y > 3 - 2 * e && Y < 3.8 && X > 2.6 && X < 9.4 && ((X * 2.6) % 1.3 < .8)) return '#c8a060'; return '#fff6d0'; }
      if(Y < 5) return Y > 5 - e ? OUT : body;
      if(Y < 13){ if(X < 2 + e || X > 10 - e) return OUT;                                                            // the display behind the plastic
        if(Y < 6) return Y < 5 + e ? '#ffffff' : '#e8f4ff';                                                            // its lamp bar
        const row = Y < 9 ? 0 : Y < 12 ? 1 : -1, ry = row < 0 ? 0 : Y - 6 - row * 3, i = Math.floor((X - 2) / 2), cxx = X - 2 - i * 2, gl = Math.abs((X - 2) - (Y - 5) * .55 - 3.2) < .18;   // gl: the glint on the plastic
        if(row >= 0 && ry < 2 && cxx < 1){ const col = NEON[(i + row * 2 + v) % 5];                                   // a can: cap, lit edge, label band, dark far edge
          if(R >= 4){ if(ry < e) return '#c8d0e0'; if(cxx < e) return lighten(col, .55); if(cxx > 1 - e) return darken(col, .35); if(Math.abs(ry - 1.1) < e * .6) return '#f0f0f8'; } return gl ? lighten(col, .35) : col; }   // (at 2x the can stays its colour: rims there ate half of it)
        if(row >= 0 && ry >= 2){ if(ry < 2 + e) return '#4a5470';                                                      // the shelf's thin lip and its buttons (lit green: 販売中)
          if(cxx < 1){ const bx = cxx - .5, by = ry - 2.55, d = bx * bx + by * by * 1.4; if(d < .05) return '#e8fff0'; if(d < .26) return '#5aff9a'; } return '#1a2236'; }
        const dk = Y < 7.5 ? '#2a3450' : '#1a2236'; return gl ? lighten(dk, .18) : dk; }
      if(Y < 13 + e) return OUT;
      if(Y < 17){ if(X >= 7 && X < 10){ if(Y < 14 + e) return '#8a8a9a'; if(X > 10 - e || Y > 17 - e) return '#3a3a48';   // the coin panel
          if(Y < 14.7 && X > 7.3 && X < 8.7) return Y < 14 + 2 * e ? '#ff6a5a' : '#c81e1e';                             // the LED price
          if(X >= 8 && X < 9 && Y >= 15 && Y < 16){ if(Math.abs(X - 8.5) < e * .75 + .02) return '#0c0a12'; return '#ffd04a'; }   // the coin slot in its lit bezel
          if(X > 9.2 && X < 9.6 && Y > 15 && Y < 16.4) return '#c8ccd8'; return '#5a5a6a'; }                          // the return lever
        if(X > 2.4 && X < 6.6 && Y > 13.6 && Y < 16.6){ if(X < 2.4 + e || Y < 13.6 + e) return ADE; return AD; }        // the blank ad panel
        return body; }
      if(Y < 19){ if(X < 2 || X >= 10) return body; if(Y < 17 + e) return '#3a3848'; if(Math.abs(Y - 18.1) < e * .6) return '#24202e'; return '#0c0a12'; }   // the take-out pocket: lit lip, flap seam
      return Y > 19.6 ? BK : body; };
    for(let y = 0; y < H0 * R; y++) for(let x = 0; x < W0 * R; x++){ const col = mat((x + .5) / R, (y + .5) / R), [r, g, b] = rgb(col), o = (y * W0 * R + x) * 4; im.data[o] = r; im.data[o + 1] = g; im.data[o + 2] = b; im.data[o + 3] = 255; }
    k.putImageData(im, 0, 0); return c; });
  const yatai = () => C['yt'] || cache('yt', () => { const [c, k] = canvas(32, 28), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    R(1, 4, 30, 1, '#4a0e12'); R(0, 5, 32, 3, '#8a1a1e'); R(0, 5, 32, 1, '#c83a32'); for(let x = 1; x < 32; x += 4) R(x, 8, 2, 1, '#8a1a1e');
    R(3, 8, 1, 10, '#3a2418'); R(28, 8, 1, 10, '#3a2418');
    R(4, 9, 24, 9, '#ffcf80'); R(4, 9, 24, 1, '#fff0c8'); R(9, 12, 4, 3, '#2a1610'); R(10, 11, 2, 1, '#2a1610'); R(18, 13, 6, 3, '#6a6a7a'); R(18, 13, 6, 1, '#b0b0c0');
    for(let x = 4; x < 28; x += 6){ R(x, 9, 5, 4, '#22306e'); R(x + 2, 10, 1, 2, '#e8e4dc'); }
    R(2, 18, 28, 3, '#7a4420'); R(2, 18, 28, 1, '#d08a48'); R(3, 21, 26, 5, '#4a2614'); R(3, 21, 26, 1, '#6a3a1e');
    R(6, 24, 4, 4, '#14101a'); R(22, 24, 4, 4, '#14101a'); R(7, 25, 2, 2, '#4a4458'); R(23, 25, 2, 2, '#4a4458');
    R(0, 9, 3, 6, '#a8162a'); R(1, 10, 1, 4, '#ffb070'); R(0, 8, 3, 1, OUT); R(0, 15, 3, 1, OUT); return c; });
  // a waiting crowd at the crossing, backlit: dark bodies, a warm rim on the heads and shoulders
  const crowd = f => C['cr' + f] || cache('cr' + f, () => { const r = rng(77), [c, k] = canvas(48, 22), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    const coats = ['#1a1428', '#24182e', '#141c2c', '#2a1420', '#1c1c24'];
    for(let i = 0; i < 9; i++){ const x = 1 + i * 5 + ((r() * 2) | 0), hh = 15 + ((r() * 5) | 0), bob = f && i % 3 === 1 ? 1 : 0, y = 22 - hh + bob, coat = coats[(r() * 5) | 0], rim = i % 2 ? '#ff7ab0' : '#ffc890';
      R(x, y + 4, 4, hh - 8, coat); R(x + 1, y + hh - 4, 1, 4, OUT); R(x + 3, y + hh - 4 - bob, 1, 4 + bob, OUT);
      R(x + 1, y, 3, 4, '#2a1c1c'); R(x + 1, y, 3, 1, '#0b0612'); R(x + 3, y + 1, 1, 2, rim); R(x + 3, y + 4, 1, hh - 9, rim);
      if(r() < .35){ const uc = NEON[(r() * 5) | 0]; R(x - 2, y - 3, 8, 1, uc); R(x - 1, y - 4, 6, 1, lighten(uc, .4)); R(x - 3, y - 2, 1, 1, uc); R(x + 6, y - 2, 1, 1, uc); R(x + 2, y - 2, 1, 2, '#3a3448'); } }
    return c; });


  /* ---------------------------------------------------------------- the lucky cat: a giant maneki-neko on a plinth, waving by itself.
     Drawn as shapes on a pixel grid: light from upper left, a 4-tone white ramp, dark-violet outline, gold koban, red collar and bell. */
  const NK = { K:'#1a1020', w:'#f6f2ea', h:'#ffffff', s:'#d4cad8', d:'#9a8eac', p:'#ff8aa8', r:'#d0203a', R:'#7a1020', y:'#ffd04a', Y:'#b8801a', e:'#2a1424', g:'#6a5a7a' };
  const neko = () => C['neko'] || cache('neko', () => { const Wn = 30, Hn = 40, [c, k] = canvas(Wn, Hn), cxn = 14.5;
    const inHead = (x, y) => ((x + .5 - cxn) / 11.5) ** 2 + ((y + .5 - 13) / 9.5) ** 2 <= 1;
    const inEar = (x, y) => { if(y < 1 || y > 8) return false; const xx = x + .5 < cxn ? x + .5 : 2 * cxn - (x + .5); return Math.abs(xx - (6.5 + (y - 1) * .15)) <= (y - 1) * .5 + .5; };
    const inBody = (x, y) => y < Hn && ((x + .5 - cxn) / 12) ** 2 + ((y + .5 - 31) / 10.5) ** 2 <= 1;
    const inAll = (x, y) => x >= 0 && y >= 0 && x < Wn && y < Hn && (inHead(x, y) || inEar(x, y) || inBody(x, y));
    const P = (x, y, ch) => { k.fillStyle = NK[ch]; k.fillRect(x, y, 1, 1); };
    for(let y = 0; y < Hn; y++) for(let x = 0; x < Wn; x++){ if(!inAll(x, y)) continue;
      const edge = !inAll(x - 1, y) || !inAll(x + 1, y) || !inAll(x, y - 1) || (y < Hn - 1 && !inAll(x, y + 1)); if(edge){ P(x, y, 'K'); continue; }
      // form shading: lit from the upper left, the lower right falls into two shade steps (ordered dither between them)
      const head = inHead(x, y) || inEar(x, y), u = head ? (x - 3) / 23 + (y - 4) / 18 : (x - 3) / 23 + (y - 21) / 18, t = u + B4(x, y) * .18;
      P(x, y, t > 1.45 ? 'd' : t > 1.1 ? 's' : t < .35 ? 'h' : 'w'); }
    for(let y = 2; y < 8; y++) for(let x = 0; x < Wn; x++){ if(!inEar(x, y) || inHead(x, y)) continue; const xx = x + .5 < cxn ? x + .5 : 2 * cxn - (x + .5); if(Math.abs(xx - (6.5 + (y - 1) * .15)) <= (y - 1) * .5 - 1) P(x, y, 'p'); }
    for(const ex of [9, 18]){ P(ex, 13, 'e'); P(ex + 1, 12, 'e'); P(ex + 2, 12, 'e'); P(ex + 3, 13, 'e'); }
    P(14, 15, 'p'); P(15, 15, 'p'); P(13, 17, 'e'); P(14, 16, 'e'); P(15, 16, 'e'); P(16, 17, 'e');
    for(const [x, y] of [[4, 15], [5, 15], [6, 15], [4, 17], [5, 17], [6, 16], [23, 15], [24, 15], [25, 15], [23, 16], [24, 17], [25, 17]]) P(x, y, 'g');
    P(8, 16, 'p'); P(21, 16, 'p');
    for(let x = 5; x < 25; x++){ if(!inAll(x, 21)) continue; P(x, 21, 'r'); P(x, 22, x % 3 ? 'r' : 'R'); } for(const [x, y, ch] of [[13, 23, 'y'], [14, 23, 'y'], [15, 23, 'y'], [16, 23, 'y'], [14, 24, 'y'], [15, 24, 'Y'], [14, 25, 'Y'], [15, 25, 'Y'], [14, 23, 'h']]) P(x, y, ch);
    // the koban held in the lower paw
    for(let y = 27; y < 37; y++) for(let x = 15; x < 26; x++){ const d = ((x + .5 - 20.5) / 5.5) ** 2 + ((y + .5 - 32) / 5) ** 2; if(d > 1) continue; P(x, y, d > .75 ? 'Y' : (x + y) % 5 === 0 ? 'h' : 'y'); }
    for(const y of [29, 31, 33]){ P(19, y, 'Y'); P(20, y, 'Y'); P(21, y, 'Y'); }
    for(let x = 14; x < 19; x++){ P(x, 34, 'w'); P(x, 35, 's'); P(x, 36, 'K'); } P(14, 33, 'K'); P(18, 33, 's');
    return c; });
  const PAW = ['.KKK.', 'KwwwK', 'KhwwK', 'KwwsK', 'KwwsK', 'KwpsK', 'KwwsK', '.KwK.', '.KwK.', '.KsK.', '.KsK.'];
  const paw = () => C['paw'] || cache('paw', () => makeSprite(PAW, NK, false));
  const plinth = () => cache('pl' + (fontReady() ? 1 : 0), () => { const [c, k] = canvas(44, 22), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    R(0, 0, 44, 22, OUT); R(1, 1, 42, 20, '#6a0e1c'); R(1, 1, 42, 1, '#ffd04a'); R(1, 20, 42, 1, '#b8801a'); R(1, 2, 1, 18, '#a01830');
    R(4, 2, 36, 18, OUT); R(5, 3, 34, 16, '#fff4dc'); R(5, 3, 34, 1, '#ffffff'); stamp(k, '招', 5, 3, 16, '#c8102a', null); stamp(k, '福', 23, 3, 16, '#c8102a', null); return c; });

  /* ---------------------------------------------------------------- the elevated railway: a steel viaduct across the road with lit
     soffit lamps, and a commuter train that rolls across by itself, windows full of standing silhouettes */
  const trainCar = v => C['car' + v] || cache('car' + v, () => { const r = rng(91 + v * 13), [c, k] = canvas(64, 20), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    const stripe = ['#2aa860', '#d02a6a'][v % 2];
    R(1, 3, 62, 16, OUT); R(2, 4, 60, 14, '#b8b8c8'); R(2, 4, 60, 1, '#e8e8f4'); R(2, 16, 60, 2, '#7a7a8c'); R(2, 13, 60, 2, stripe); R(2, 13, 60, 1, lighten(stripe, .4));
    for(let x = 4; x < 60; x += 9){ const door = (x / 9 | 0) % 3 === 1; R(x, 6, door ? 5 : 7, door ? 9 : 6, OUT); R(x + 1, 7, door ? 3 : 5, door ? 7 : 4, '#ffe6b0'); R(x + 1, 7, door ? 3 : 5, 1, '#fff6dc');
      if(r() < .7){ const px = x + 1 + ((r() * (door ? 2 : 4)) | 0); R(px, 8, 1, 3, '#3a2a30'); R(px, 7, 1, 1, '#5a4040'); } if(r() < .4) R(x + 1 + ((r() * 3) | 0), 8, 1, 3, '#4a3438'); }
    R(10, 1, 14, 2, '#5a5a6a'); R(40, 1, 10, 2, '#5a5a6a'); R(20, 0, 1, 1, '#8a8a9a'); R(22, 0, 6, 1, '#8a8a9a'); R(0, 7, 1, 8, '#3a3a48'); R(63, 7, 1, 8, '#3a3a48');
    return c; });

  /* ---------------------------------------------------------------- the bulb gate over the road (frames: a chase runs round the tube) */
  const GW = 150, GH = 114;
  function gate(fr){ const fk = fontReady() ? 1 : 0; const ck = 'gt' + fr + ':' + fk; return C[ck] || cache(ck, () => { const [c, k] = canvas(GW, GH), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    R(8, 30, 7, GH - 30, '#1c1626'); R(13, 30, 2, GH - 30, '#3a3448'); R(GW - 15, 30, 7, GH - 30, '#1c1626'); R(GW - 15, 30, 2, GH - 30, '#3a3448'); R(6, GH - 4, 11, 4, '#120e18'); R(GW - 17, GH - 4, 11, 4, '#120e18');
    // the tube: an outlined rounded frame, 6px thick, studded with bulbs
    const tube = (x, y, w, h) => { R(x + 2, y, w - 4, h, OUT); R(x, y + 2, w, h - 4, OUT); R(x + 1, y + 1, w - 2, h - 2, OUT); };
    tube(0, 0, GW, 40); R(6, 6, GW - 12, 28, 'rgba(0,0,0,0)'); k.clearRect(6, 6, GW - 12, 28);
    k.fillStyle = '#9a1428'; k.fillRect(2, 2, GW - 4, 4); k.fillRect(2, 34, GW - 4, 4); k.fillRect(2, 2, 4, 36); k.fillRect(GW - 6, 2, 4, 36); k.fillStyle = '#d02a3a'; k.fillRect(3, 2, GW - 6, 1); k.fillRect(2, 3, 1, 34);
    let idx = 0; const bulb = (x, y) => { const hot = (idx++ + fr) % 3 === 0; R(x, y, 2, 2, hot ? '#fffaf0' : '#ffb0a0'); if(hot) R(x, y, 1, 1, '#ffffff'); };
    for(let x = 4; x < GW - 4; x += 4){ bulb(x, 3); } for(let y = 7; y < 34; y += 4) bulb(GW - 5, y); for(let x = GW - 8; x > 3; x -= 4) bulb(x, 35); for(let y = 31; y > 6; y -= 4) bulb(3, y);
    // the lightbox
    R(20, 7, GW - 40, 26, OUT); R(21, 8, GW - 42, 24, '#f8f0ec'); R(21, 8, GW - 42, 2, '#ffffff'); R(21, 30, GW - 42, 2, '#d8c8cc'); R(21, 8, 2, 24, '#e8d8dc'); R(GW - 23, 8, 2, 24, '#e8d8dc');
    const word = '月光一番街'; for(let i = 0; i < 5; i++) stamp(k, word[i], 33 + i * 17, 12, 16, '#c8102a', null);
    R(GW / 2 - 1, 0, 2, 0, OUT); return c; }); }

  /* ---------------------------------------------------------------- the pedestrian bridge: girder with a lightbox advert, mesh railing */
  const BW = 200;
  function bridgeS(){ const fk = fontReady() ? 1 : 0; const ck = 'br' + fk; return C[ck] || cache(ck, () => { const [c, k] = canvas(BW, 100), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    for(const px of [28, BW - 36]){ R(px, 34, 8, 66, '#1a1624'); R(px + 6, 34, 2, 66, '#3a3448'); R(px, 34, 1, 66, OUT); R(px - 2, 96, 12, 4, '#120e18'); }
    R(0, 3, BW, 1, '#6a6480'); R(0, 4, BW, 1, '#2a2436'); for(let x = 0; x < BW; x += 6) R(x, 4, 1, 10, '#2a2436'); for(let y = 6; y < 14; y += 2) for(let x = (y / 2) % 2; x < BW; x += 2) R(x, y, 1, 1, 'rgba(40,34,56,.85)');
    R(0, 14, BW, 22, '#1c1828'); R(0, 14, BW, 1, '#5a5470'); R(0, 35, BW, 1, OUT); R(0, 36, BW, 1, '#e8f0ff'); R(0, 37, BW, 1, '#6a7a9a');
    R(34, 16, BW - 68, 18, OUT); R(35, 17, BW - 70, 16, '#ffd04a'); R(35, 17, BW - 70, 1, '#fff2b0'); R(35, 32, BW - 70, 1, '#c89a2a');
    const word = '夜明けまで営業中'; for(let i = 0; i < word.length; i++) stamp(k, word[i], 37 + i * 16, 17, 16, '#1a0a18', null);
    for(const x of [6, BW - 26]){ R(x, 17, 20, 16, '#120a1c'); R(x + 1, 18, 18, 14, '#ff3b8a'); R(x + 2, 19, 16, 12, '#2a0a20'); stamp(k, '光', x + 2, 17, 16, '#ffd0e4', '#ff3b8a'); }
    return c; }); }

  /* ---------------------------------------------------------------- the screen building: a block that bridges the road beyond the
     scramble crossing, a giant video screen on its face and a portal you ride through (the Hydro Thunder landmark you pass under).
     Screen frames: 0-31 two koi swim through rippling water, 32 a red title card. */
  const SW2 = 96, SH2 = 54;
  const KOI = ['......wwww.........', '...wwwwoooww.......', 'ttwwooooowwwwwK....', 'tttwwwwooowwowww...', 'ttwwooooowwwwwK....', '...wwwwoooww.......', '......wwww.........'];
  function koi(f){ const ck = 'koi' + f; return C[ck] || cache(ck, () => { const rows = KOI.map(r => f ? r.replace(/^ttt/, '.tt').replace(/^tt/, '.t') : r); return makeSprite(rows, { w:'#fff4ea', o:'#ff6a2a', t:'#ff9a5a', K:'#1a0a08' }, false); }); }
  function screenFrame(f){ const fk = fontReady() ? 1 : 0, card = f >= 32; const ck = 'sc' + f + ':' + (card ? fk : 0); return C[ck] || cache(ck, () => { const [c, k] = canvas(SW2, SH2), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    if(!card){ const img = k.createImageData(SW2, SH2), d = img.data, A = [8, 26, 70], Bc = [14, 44, 100], Cc = [24, 70, 140];
      for(let y = 0; y < SH2; y++) for(let x = 0; x < SW2; x++){ const v = y / SH2 + B4(x, y) * .3, col = v > .95 ? Cc : v > .5 ? Bc : A, o = (y * SW2 + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
      k.putImageData(img, 0, 0);
      const ph = f / 32 * 6.283; for(let i = 0; i < 9; i++){ const yy = 4 + i * 6; for(let x = 0; x < SW2; x++) if(Math.sin(x * .22 + ph * (i % 2 ? 1 : -1) + i * 1.3) > .86) R(x, yy, 2, 1, '#4a7ac8'); }
      for(let j = 0; j < 2; j++){ const t = ((f / 32) + j * .5) % 1, kx = Math.round(-22 + t * (SW2 + 26)), ky = Math.round(14 + j * 22 + Math.sin(t * 6.283 + j) * 4), spr = koi((f + j) % 2);
        k.fillStyle = 'rgba(0,0,20,.35)'; k.fillRect(kx + 2, ky + 3, 17, 4); k.drawImage(spr, kx, ky); }
      for(let i = 0; i < 3; i++){ const lx = (i * 37 + f * 2) % (SW2 + 10) - 5, ly = 8 + i * 15; R(lx, ly, 5, 3, '#2a8a4a'); R(lx + 1, ly, 3, 1, '#4ac86a'); } }
    else { R(0, 0, SW2, SH2, '#a80c26'); for(let y = 0; y < SH2; y += 2) R(0, y, SW2, 1, '#b8122e'); for(let x = 0; x < SW2; x += 3){ R(x, 0, 2, 2, '#ffd04a'); R(x + 1, SH2 - 2, 2, 2, '#ffd04a'); }
      const big = (ch, ox, oy, col, sh) => { const g = glyph(ch); if(!g) return; for(let y = 0; y < 18; y++) for(let x = 0; x < 18; x++) if(g.m[y * 18 + x]) R(ox + (x - g.x0) * 2 + 2, oy + (y - g.y0) * 2 + 2, 2, 2, sh); for(let y = 0; y < 18; y++) for(let x = 0; x < 18; x++) if(g.m[y * 18 + x]) R(ox + (x - g.x0) * 2, oy + (y - g.y0) * 2, 2, 2, col); };
      big('月', 8, 10, '#ffd04a', '#3a0410'); big('光', 42, 10, '#ffffff', '#3a0410'); stamp(k, '夜', 76, 6, 16, '#ffd04a', null); stamp(k, '街', 76, 26, 16, '#ffd04a', null); }
    for(let y = 1; y < SH2; y += 2) R(0, y, SW2, 1, 'rgba(0,0,12,.26)');
    return c; }); }
  const JW = 240, JH = 152, PL0 = 66, PL1 = JW - 66, PTOP = JH - 60, SX = (JW - SW2) / 2, SY = 14;
  function jumboArt(k){ const r = rng(4242), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
    R(0, 12, JW, JH - 12, '#120e1e'); R(0, 12, JW, 2, '#3a2e56'); R(0, 14, JW, 1, OUT); R(0, 12, 1, JH - 12, OUT); R(JW - 1, 12, 1, JH - 12, OUT);
    for(let x = 20; x < JW - 20; x += 24) R(x, 2, 2, 10, '#1c1626'); R(14, 4, JW - 28, 2, '#2a2436');
    for(let y = 20; y < PTOP - 6; y += 7) for(const [x0, x1] of [[6, SX - 8], [SX + SW2 + 8, JW - 6]]) for(let x = x0; x < x1; x += 6){ const g = r(); if(g < .55) R(x, y, 4, 4, g < .3 ? '#2a2040' : g < .45 ? '#e8a858' : '#c8487a'); }
    R(SX - 5, SY - 5, SW2 + 10, SH2 + 10, '#2a2436'); R(SX - 4, SY - 4, SW2 + 8, SH2 + 8, OUT); R(SX - 5, SY - 5, SW2 + 10, 1, '#6a6480');
    R(SX - 5, SY + SH2 + 7, SW2 + 10, 9, OUT); R(SX - 4, SY + SH2 + 8, SW2 + 8, 7, '#1a0e08');
    for(const [lx, side] of [[8, 0], [JW - 30, 1]]) for(let y = PTOP - 14, i = side; y > SY - 4; y -= 15, i++){ const col = ['#f4ecf0', '#ffd04a', '#ff3b8a', '#4ff0ff', '#e8203a'][i % 5]; R(lx - 1, y - 1, 24, 13, OUT); R(lx, y, 22, 11, col); R(lx, y, 22, 1, lighten(col, .5)); pseudo(k, lx + 2, y + 3, 19, 5, darken(col, .75), r); }
    R(PL0 - 4, PTOP - 8, PL1 - PL0 + 8, 8, '#2a2436'); R(PL0 - 4, PTOP - 8, PL1 - PL0 + 8, 1, '#6a6480'); for(let x = PL0; x < PL1; x += 8) R(x, PTOP - 3, 5, 2, '#e8f0ff');
    k.clearRect(PL0, PTOP, PL1 - PL0, JH - PTOP);
    R(PL0 - 3, PTOP, 3, JH - PTOP, '#3a3448'); R(PL1, PTOP, 3, JH - PTOP, '#3a3448');
    for(const x0 of [6, PL1 + 6]){ R(x0, JH - 26, PL0 - 16, 24, '#ffd890'); R(x0, JH - 26, PL0 - 16, 1, '#fff2cc'); for(let x = x0 + 2; x < x0 + PL0 - 18; x += 6) R(x, JH - 22, 3, 18, '#c88a4a'); R(x0 - 1, JH - 30, PL0 - 14, 4, '#c8203a'); R(x0 - 1, JH - 30, PL0 - 14, 1, '#ff5a6a'); }
    R(0, JH - 1, PL0, 1, OUT); R(PL1, JH - 1, JW - PL1, 1, OUT); }
  /* The screen building at screen resolution (2026-11-20, buildings3d round 4). The art above runs once into a list of filled rects (art
     pixels, painter's order; the portal's clearRect is cut out of the rects under it). The sprite is that list painted 1:1, and once an art
     pixel would pass ~1.3 screen pixels the same list is painted straight onto the screen, each edge on the canvas pixel whose centre it
     covers: exactly what the nearest-neighbour blit of the sprite gives, so the switch shows no change. Closer still, detail finer than an
     art pixel fades in (2 to 3 screen pixels per art pixel): the screen's LED grid, frames and glints on the windows, lit edges on the
     masts, the coping and the portal piers, mullions in the shop glass. ENV.neon.jbGeo (dev) moves the switch, for the pixel diff. */
  const jumboOps = () => cache('jbo' + (fontReady() ? 1 : 0), () => { const ops = [], rec = { fillStyle:'#000', fillRect(x, y, w, h){ ops.push([x, y, w, h, this.fillStyle]); }, clearRect(x, y, w, h){ ops.push([x, y, w, h, null]); } };
    jumboArt(rec); const ci = ops.findIndex(o => o[4] === null); if(ci < 0) return ops; const [hx0, hy0, hw, hh] = ops[ci], hx1 = hx0 + hw, hy1 = hy0 + hh, out = [];
    ops.forEach((o, i) => { if(i === ci) return; const [x, y, w, h, col] = o; if(i > ci || x >= hx1 || x + w <= hx0 || y >= hy1 || y + h <= hy0){ out.push(o); return; }
      if(y < hy0) out.push([x, y, w, hy0 - y, col]); if(y + h > hy1) out.push([x, hy1, w, y + h - hy1, col]); const ya = Math.max(y, hy0), yb = Math.min(y + h, hy1);
      if(x < hx0) out.push([x, ya, hx0 - x, yb - ya, col]); if(x + w > hx1) out.push([hx1, ya, x + w - hx1, yb - ya, col]); });
    return out; });
  // the windows no later fill covers (the lightbox signs hang over some), for the close-up glints
  const jumboWin = () => cache('jbw' + (fontReady() ? 1 : 0), () => { const ops = jumboOps(); return ops.filter((o, i) => o[2] === 4 && o[3] === 4 && o[1] >= 20 && o[1] < PTOP - 6 && !ops.some((q, j) => j > i && q[0] < o[0] + 4 && q[0] + q[2] > o[0] && q[1] < o[1] + 4 && q[1] + q[3] > o[1])); });
  const jumbo = () => cache('jb' + (fontReady() ? 1 : 0), () => { const [c, k] = canvas(JW, JH); for(const [x, y, w, h, col] of jumboOps()){ k.fillStyle = col; k.fillRect(x, y, w, h); } return c; });
  // a screen edge for an art edge: the first canvas pixel whose centre lies past it (nearest-neighbour sampling)
  const jbE = (o, u, s) => Math.ceil((o + (u + 1e-5) * s) / PX - .5) * PX;
  function jumboGeo(left, top, k){ for(const [x, y, w, h, col] of jumboOps()){ const x0 = jbE(left, x, k), x1 = jbE(left, x + w, k); if(x1 <= x0 || x1 <= 0 || x0 >= W) continue; const y0 = jbE(top, y, k), y1 = jbE(top, y + h, k); if(y1 <= y0 || y1 <= 0 || y0 >= H) continue; cx.fillStyle = col; cx.fillRect(x0, y0, x1 - x0, y1 - y0); }
    const ex = clamp((k / PX - 2) / 1, 0, 1); if(ex <= 0) return; const ga = cx.globalAlpha; cx.globalAlpha = ga * ex;
    const X = u => jbE(left, u, k), Y = v => jbE(top, v, k), hz = (u0, u1, v, col) => { const a = X(u0), b = X(u1), yy = Y(v); if(b > a && yy > -PX && yy < H){ cx.fillStyle = col; cx.fillRect(a, yy, b - a, PX); } }, vt = (u, v0, v1, col) => { const xx = X(u), a = Y(v0), b = Y(v1); if(b > a && xx > -PX && xx < W){ cx.fillStyle = col; cx.fillRect(xx, a, PX, b - a); } };
    // the coping catches the moon on its top edge; the roof masts get a lit left edge
    hz(1, SX - 5, 12, '#5a4c7c'); hz(SX + SW2 + 5, JW - 1, 12, '#5a4c7c'); for(let u = 20; u < JW - 20; u += 24) vt(u, 2, u + 2 > SX - 5 && u < SX + SW2 + 5 ? SY - 5 : 12, '#3a3050');
    // windows: the lit ones a bright top row and a mullion, the dark ones a faint glint in the top corner
    for(const [u, v, w, h, col] of jumboWin()){
      if(col === '#2a2040'){ hz(u + .5, u + 1.5, v + .6, '#3e3460'); continue; } const lit = col === '#e8a858'; hz(u, u + 4, v, lit ? '#ffd8a0' : '#f08ab0'); hz(u, u + 4, v + 4 - PX / k, lit ? '#a86a38' : '#8a2a58'); }
    // the portal piers: a lit edge on the face toward the moon, a dark joint where they meet the beam
    vt(PL0 - 3, PTOP, JH, '#5a5470'); vt(PL1, PTOP, JH, '#5a5470'); hz(PL0 - 3, PL0, PTOP, '#1c1626'); hz(PL1, PL1 + 3, PTOP, '#1c1626');
    // the shops: mullion edges, a glint on the glass, the awning's lower lip
    for(const x0 of [6, PL1 + 6]){ for(let u = x0 + 2; u < x0 + PL0 - 18; u += 6){ vt(u, JH - 22, JH - 4, '#a86a34'); vt(u + 3 - PX / k, JH - 22, JH - 4, '#e0a868'); } hz(x0 - 1, x0 + PL0 - 15, JH - 26 - PX / k, '#7a1424'); }
    cx.globalAlpha = ga; }
  // the LED grid over the video, fading in as the pixels grow; it follows the screen's own placement so every line falls between two LEDs
  function jumboLED(sx, sy, sw, sh, k){ const ex = clamp((k / PX - 2) / 1, 0, 1); if(ex <= 0) return; const ga = cx.globalAlpha; cx.globalAlpha = ga * ex * .55; cx.fillStyle = '#04030a';
    const ux = sw / SW2, uy = sh / SH2, y0 = jbE(sy, 0, uy), y1 = jbE(sy, SH2, uy), x0 = jbE(sx, 0, ux), x1 = jbE(sx, SW2, ux);
    for(let i = 1; i < SW2; i++){ const xx = jbE(sx, i, ux); if(xx > 0 && xx < W) cx.fillRect(xx, y0, PX, y1 - y0); }
    for(let j = 1; j < SH2; j++){ const yy = jbE(sy, j, uy); if(yy > 0 && yy < H) cx.fillRect(x0, yy, x1 - x0, PX); }
    cx.globalAlpha = ga; }

  const tickS = () => cache('tick' + (fontReady() ? 1 : 0), () => { const msg = '夜明けまで営業中　月光一番街　大当り　夜明けまで営業中　', [c, k] = canvas(msg.length * 16, 16); for(let i = 0; i < msg.length; i++) stamp(k, msg[i], i * 16, 0, 16, '#ffd04a', null); return c; });
  /* ---------------------------------------------------------------- the canyon as projected buildings (research/sundown-buildings.md).
     Kabukicho zakkyo: narrow and tall, every floor a different tenant behind its own band of glass (warm bar, pink karaoke, cyan office,
     or dark), floor slabs as thin light lines, a lightbox sign or two on the wall, a vertical neon tube up the corner, a striped awning over
     a lit shopfront, a billboard, mast or plant on the roof. The palettes are the old facade sprites' (FAC, GLASS, AWNS, NEON spill), now
     on a street face that runs along the road (quads between this segment and the next, or the engine projBox's span far away) and an end
     wall that faces the camera. Nothing is a scaled sprite, so nothing turns into blocks beside the camera. */
  const NB = new Map(), NB_P = 6, GH0 = .44, FLH = .36;
  const nbF = fog => { const q = Math.round(fog * .85 * 32); return c => fogc(c, q); };
  function nbAt(i, side){ const c = Math.floor((i + (side > 0 ? 3 : 0)) / NB_P), h = k => hash(c * 7.31 + side * 13.7 + k), len = NB_P - (h(1) < .3 ? 1 : 0) - (h(2) < .12 ? 1 : 0), b0 = c * NB_P - (side > 0 ? 3 : 0);
    return i >= b0 && i < b0 + len ? { b0, len, n:c } : null; }
  // tag: '' a street-row building; 'tall' a taller one standing back across the plaza or behind the cat; 'lo1' / 'lo2' a one- or two-storey
  // shopfront row (in front of the lucky cat, which stands on its roofs)
  function nbBuild(side, r, tag = ''){ const key = side + ':' + r.b0 + tag; let B = NB.get(key); if(B) return B; if(NB.size > 400) NB.clear();
    const v = (hash(r.n * 1.37 + side) * 12) | 0, rr2 = rng(r.n * 7919 + (side > 0 ? 55 : 101)), [D, S, M, L] = FAC[v % 4], spill = NEON[v % 5], h0 = (82 + ((v * 5) % 6) * 10 - 8) * 1.3 / FW;   // the height of the old facade sprite's wall, so its front (drawn far away) fits the building
    const flh = .33 + hash(r.n * 5.9 + side) * .1, gh = .4 + hash(r.n * 6.7 + side) * .1, h = tag === 'lo1' ? gh + flh + .14 : tag === 'lo2' ? gh + 2 * flh + .14 : tag === 'tall' ? h0 * 1.3 : h0, nF = Math.max(1, Math.floor((h - gh - .12) / flh)), fl = [], st = [], sg = [];
    for(let f = 0; f < nF; f++){ const g = rr2(); fl.push(g < .28 ? 'warm' : g < .38 ? 'pink' : g < .46 ? 'cyan' : 'dark'); st.push(rr2() < .3); sg.push(rr2() < .3 ? ['#f4ecf0', '#ffd04a', '#ff5a7a', '#7af0ff'][(rr2() * 4) | 0] : null); }
    const shop = []; for(let k = 0; k < r.len; k++) shop.push(rr2() < .5);   // which segments of the ground floor are lit shops (the rest: a dark stair door or a shutter)
    const [a1, a2] = AWNS[v % 5], pal = v % 4, stair = rr2() < .2, vr = fl.map(() => stair ? 5 : (rr2() * 5) | 0);
    B = { side, b0:r.b0, len:r.len, v, h, nF, pal, stair, vr, flh, gh, shop, fl, st, sg, D, S, M, L, spill, a1, a2, face:mixc(M, spill, .1), slab:mixc(M, L, .5), tube:v % 2 === 1, bar:v % 3 === 2, roof:tag === 'lo1' || tag === 'lo2' ? 3 : v % 3, rc:['#f4ecf0', '#e8203a', '#ffd04a', '#4ff0ff', '#ff3b8a'][(r.n + v) % 5], depth:1.3 };
    // every colour the slices use, worked out once (the draw only fogs them, through the engine's cached fogc)
    const shopF = shop.filter(Boolean).length / shop.length, am = mixc(a1, a2, .5);
    B.c = { face:B.face, L, D, S, slab:B.slab, tube:lighten(spill, .35), rc:B.rc, rch:lighten(B.rc, .5), a1, a2, a2h:lighten(a2, .3), am,
      shopMean:B.bar ? '#2a1610' : mixc('#2a1a24', '#f6c878', shopF * .85), awMean:B.bar ? am : mixc(B.face, am, shopF),
      groundMean:mixc(B.bar ? '#2a1610' : mixc('#2a1a24', '#f6c878', shopF * .85), B.bar ? am : mixc(B.face, am, shopF), .3),
      g:fl.map(k => { const G = GLASS[k]; return [G[0], G[1], G[2], mixc(G[1], B.face, .35)]; }), sg:sg.map(c => c ? [c, lighten(c, .5), darken(c, .75)] : null) };
    NB.set(key, B); return B; }
  /* Facade tiles: one floor of one segment of street face, pre-rendered as pixel art at three art sizes (12x14, 24x28, 48x56) for each wall
     palette (FAC), tenant light (GLASS kind) and variant, and laid onto the projected face as a repeating pattern (one fill per floor per
     slice, sheared to the slice): the size is picked so a texel is never more than ~1.5 canvas pixels. Variants: blinds, curtains, people at
     the window, a plain pane, a balcony railing, an external steel stair; the pier beside the window carries an AC unit and its pipe, a
     hanging lightbox, a sticker ad panel, or a drainpipe and floor plate. */
  const NT_W = [12, 24, 48], NT_H = [14, 28, 56], NT_V = 6, NT_KIND = ['warm', 'pink', 'cyan', 'dark'];
  const NT_SIGN = ['#ffd04a', '#4ff0ff', '#ff3b8a', '#f4ecf0', '#ff6a3a'];
  function nbTile(pal, kind, vr, sz){ const ck = 'nt' + pal + kind + vr + sz; return C[ck] || cache(ck, () => { const Wt = NT_W[sz], Ht = NT_H[sz], [c, k] = canvas(Wt, Ht), [D, S, M, L] = FAC[pal], G = GLASS[kind], dark = kind === 'dark';
    const X = f => Math.round(f * Wt), Y = f => Math.round(f * Ht), R = (x0, y0, x1, y1, col) => { k.fillStyle = col; k.fillRect(X(x0), Y(y0), Math.max(1, X(x1) - X(x0)), Math.max(1, Y(y1) - Y(y0))); };
    const P = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); }, r = rng(pal * 131 + vr * 17 + NT_KIND.indexOf(kind) * 7 + 3);
    R(0, 0, 1, 1, M); R(0, 0, .03, .88, mixc(M, S, .5));   // wall, a seam between bays
    R(0, .86, 1, .9, mixc(M, L, .55)); R(0, .9, 1, 1, S);   // the floor slab: a lit edge over its shadow
    const stair = vr === 5, wx0 = .05, wx1 = stair ? .46 : .74, wy0 = .1, wy1 = .8;
    // the window: dark frame, the tenant's light, a bright top row, mullions
    R(wx0, wy0, wx1, wy1, D); const gx = X(wx0) + 1, gy = Y(wy0) + 1, gw = X(wx1) - X(wx0) - 2, gh = Y(wy1) - Y(wy0) - 2;
    if(gw > 0 && gh > 0){ P(gx, gy, gw, gh, G[1]); P(gx, gy, gw, 1, G[0]);
      const style = dark ? 3 : vr % 4;
      if(style === 0 && gh > 3) for(let yy = gy + 3; yy < gy + gh; yy += 3) P(gx, yy, gw, 1, G[2]);   // blinds
      if(style === 1 && gw > 3){ const cw = Math.max(1, Math.round(gw * .17)), cc = kind === 'pink' ? '#ffd0e8' : kind === 'cyan' ? '#d8f4ff' : '#f8e0b0'; P(gx, gy + 1, cw, gh - 1, cc); P(gx + gw - cw, gy + 1, cw, gh - 1, cc);
        if(cw > 2){ P(gx + 1, gy + 1, 1, gh - 1, G[2]); P(gx + gw - 2, gy + 1, 1, gh - 1, G[2]); } }   // curtains, drawn back
      if(style === 2 && gh > 4){ for(let p = 0; p < (gw > 10 ? 2 : 1); p++){ const px = gx + Math.round(gw * (.25 + p * .4)), u = Math.max(1, Math.round(gh / 9)), sil = '#2a1a2c';   // people at the window
          P(px, gy + gh - 4 * u, 2 * u, 2 * u, sil); P(px - u, gy + gh - 2 * u, 4 * u, 2 * u, sil); } }
      if(style === 3){ for(let i = 0; i < Math.min(gw, gh) - 1; i++) P(gx + gw - 2 - i - Math.round(gw * .2), gy + 1 + i, 1, 1, G[0]); }   // a reflection across the pane
      if(gw > 8) for(const m of [1 / 3, 2 / 3]) P(gx + Math.round(gw * m), gy, 1, gh, D); }
    R(wx0 - .01, wy1, wx1 + .01, wy1 + .03, mixc(M, L, .4));   // the sill
    if(vr === 4){ const ry = Y(.6); P(X(wx0), ry, X(wx1) - X(wx0), 1, '#9a96b0'); for(let q = 0; q <= 4; q++) P(X(wx0 + (wx1 - wx0) * q / 4), ry, 1, Y(.84) - ry, '#6a6680'); R(.02, .82, .74, .86, mixc(M, L, .3)); }   // balcony railing
    if(stair){ // an external steel stair: a flight climbing to the next landing, with its rail and a landing at the top
      const st = '#4a4458', hi = '#8a84a0'; for(let i = 0; i <= 20; i++){ const t = i / 20, xx = X(.5 + t * .46), yy = Y(.86 - t * .72); P(xx, yy, Math.max(1, X(.03)), Math.max(1, Y(.03)), st); if(i % 3 === 0) P(xx, yy - Y(.14), 1, Y(.14), '#2a2436'); P(xx, yy - Y(.16), 1, 1, hi); }
      R(.86, .1, 1, .14, st); R(.86, .1, 1, .11, hi); return c; }
    // the pier beside the window
    const pd = (vr + pal) % 4;
    if(pd === 0){ R(.77, .52, .98, .8, '#8a8a9a'); R(.77, .52, .98, .55, '#b8b8c8'); if(Ht >= 28) for(let yy = Y(.6); yy < Y(.78); yy += 2) P(X(.75), yy, X(.95) - X(.75), 1, '#5a5a6a'); R(.83, .8, .86, .9, '#4a4a58'); }   // AC unit and its drain pipe
    else if(pd === 1){ const col = NT_SIGN[(vr + pal + NT_KIND.indexOf(kind)) % 5]; R(.74, .12, .98, .66, OUT); R(.76, .15, .96, .63, col); R(.76, .15, .96, .2, lighten(col, .5)); if(Ht >= 28) for(let yy = Y(.26); yy < Y(.58); yy += Y(.12)) R(.8, yy / Ht, .92, (yy + Math.max(1, Y(.06))) / Ht, darken(col, .7)); }   // a hanging lightbox
    else if(pd === 2){ const col = ['#ff5a7a', '#ffd04a', '#7af0ff'][(vr + pal) % 3]; R(.75, .22, .96, .5, col); R(.75, .22, .96, .26, '#ffffff'); if(Ht >= 28){ R(.77, .32, .93, .35, darken(col, .6)); R(.77, .4, .88, .43, darken(col, .6)); } }   // a sticker ad panel
    else { R(.9, 0, .94, .9, '#3a3a48'); R(.91, 0, .92, .9, '#5a5a6c'); R(.75, .2, .85, .32, '#e8e4dc'); if(Ht >= 28) R(.78, .23, .82, .29, '#2a2436'); }   // drainpipe and floor plate
    return c; }); }
  const NT_PAT = new Map(), PM = new DOMMatrix();
  function ntPat(tile){ let p = NT_PAT.get(tile); if(!p){ p = cx.createPattern(tile, 'repeat'); NT_PAT.set(tile, p); } return p; }
  function* warmTilesSteps(){ for(let pal = 0; pal < 4; pal++) for(const kind of NT_KIND) for(let vr = 0; vr < NT_V; vr++){ for(let sz = 0; sz < 3; sz++) ntPat(nbTile(pal, kind, vr, sz)); yield; } }   // (stepped: first 60 s, research/sundown-craft/first60.md)
  // the smallest art size whose texels stay within ~1.5 canvas pixels for a floor hpx tall and a segment wpx wide (else the largest)
  const ntSize = (hpx, wpx) => { for(let sz = 0; sz < 3; sz++) if(hpx / NT_H[sz] <= 1.5 && wpx / NT_W[sz] <= 1.5) return sz; return 2; };
  /* A quad with vertical sides (every face here is one: a wall parallel to the road), filled column by column on the pixel grid: each canvas
     column runs from its top edge to its bottom edge, sampled at the column centre, and runs of columns with the same ends go out as one rect.
     Both slanted edges step together, so this is about half the rects of filling it row by row (fillRect is most of this road's draw cost). */
  function colQuad(xa, ta, ba, xb, tb, bb, col){ if(xb < xa){ let v = xa; xa = xb; xb = v; v = ta; ta = tb; tb = v; v = ba; ba = bb; bb = v; }
    const cw = cx.canvas.width, ch = cx.canvas.height; let c0 = Math.round(xa / PX), c1 = Math.round(xb / PX); if(c1 <= c0){ c0 = Math.floor((xa + xb) / 2 / PX); c1 = c0 + 1; }
    if(c0 < -1) c0 = -1; if(c1 > cw + 1) c1 = cw + 1; if(c1 <= c0) return; const dx = xb - xa > 1e-6 ? xb - xa : 1e-6; cx.fillStyle = col;
    let rs = c0, rt = 0, rb = 0;
    for(let c = c0; c < c1; c++){ let t = ((c + .5) * PX - xa) / dx; t = t < 0 ? 0 : t > 1 ? 1 : t;
      let tp = Math.round((ta + (tb - ta) * t) / PX), bt = Math.round((ba + (bb - ba) * t) / PX); if(tp < -1) tp = -1; if(bt > ch + 1) bt = ch + 1; if(bt <= tp && bt > -1 && tp < ch){ bt = tp + 1; }
      if(c > c0 && tp === rt && bt === rb) continue; if(c > c0 && rb > rt) cx.fillRect(rs * PX, rt * PX, (c - rs) * PX, (rb - rt) * PX); rs = c; rt = tp; rb = bt; }
    if(rb > rt) cx.fillRect(rs * PX, rt * PX, (c1 - rs) * PX, (rb - rt) * PX); }
  // span LOD by screen size: a slice is one segment while it is wider than a few pixels, then 2, 4, 8 segments (anchored to the building's
  // start, so the spans tile without gaps as they change); the thresholds are where a one-segment slice is ~8, ~4 and ~2 canvas pixels wide
  const NB_SPAN = f => { f = fogPx(f); return f < .0115 ? 1 : f < .035 ? 2 : f < .107 ? 4 : f < .3 ? 8 : 16; };   // tiers by screen size (fogPx: the fog the old 260-segment draw distance gave here)
  // (over a side lane the engine draws this side's buildings pushed back beyond it, laneDX: a span never crosses a change of that push, and
  // the first segment after one starts a span and stands an end wall, so the row steps back and forward as whole buildings)
  const LX = k => window.laneDX ? laneDX(k) : 0;
  function nbSpan(j, B, fog){ const bse = j - Math.round(DRAW * Math.pow(fog, 1 / 1.6)), at = k => NB_SPAN(clamp(Math.pow((k - bse) / DRAW, 1.6), 0, 1)), d = LX(j);
    if(j > B.b0 && (j - B.b0) % at(j) && LX(j - 1) === d) return 0; let n = 1; while(j + n < B.b0 + B.len && n < 16 && (j + n - B.b0) % at(j + n) && LX(j + n) === d) n++; return n; }
  // the ground floor seen from further off: a dark base, each run of lit shops as one quad of shop light under one quad of awning
  function nbGround(B, Q, j, n, aw0, aw1, GH){ const C = B.c; Q(0, GH, B.bar ? '#2a1610' : '#2a1a24'); Q(aw1, GH, C.S);
    if(B.bar){ Q(aw0, aw1, C.am, .02 / n, 1 - .02 / n); return; }
    for(let k = 0; k < n; k++){ if(!B.shop[j - B.b0 + k]) continue; let e = k + 1; while(e < n && B.shop[j - B.b0 + e]) e++; Q(.02, aw0, '#f6c878', (k + .06) / n, (e - .06) / n); Q(aw0, aw1, C.am, k / n, e / n); k = e; } }
  // a band h0..h1 of the street face being drawn (drawNB), over sub-span ta..tb of the slice
  let NQX = 0, NQX2 = 0, NQY = 0, NQY2 = 0, NQU = 0, NQU2 = 0, NQF = 0;
  function nbQ(h0, h1, col, ta = 0, tb = 1){ const x = NQX, x2 = NQX2, y = NQY, y2 = NQY2, uw = NQU, u2 = NQU2, fq = NQF;
    const xa = x + (x2 - x) * ta, xb = x + (x2 - x) * tb, ya = y + (y2 - y) * ta, yb = y + (y2 - y) * tb, ua = uw + (u2 - uw) * ta, ub = uw + (u2 - uw) * tb;
    const top = Math.min(ya - ua * h1, yb - ub * h1), bot = Math.max(ya - ua * h0, yb - ub * h0); if(bot < 0 || top > H) return;
    const c = fogc(col, fq), ta2 = ya - ua * h1, ba2 = ya - ua * h0, tb2 = yb - ub * h1, bb2 = yb - ub * h0;
      if(Math.abs(tb2 - ta2) < PX && Math.abs(bb2 - ba2) < PX){ cx.fillStyle = c; pxRect(Math.min(xa, xb), (ta2 + tb2) / 2, Math.max(PX, Math.abs(xb - xa)), (ba2 + bb2 - ta2 - tb2) / 2); return; }   // flatter than a pixel: one rect
      const cols = Math.abs(xb - xa) / PX, rows = (bot - top) / PX;
      if(rows > 32 || Math.min(cols, rows) > 10){ cx.fillStyle = c; cx.beginPath(); cx.moveTo(snap(xa), snap(ta2)); cx.lineTo(snap(xb), snap(tb2)); cx.lineTo(snap(xb), snap(bb2)); cx.lineTo(snap(xa), snap(ba2)); cx.closePath(); cx.fill(); }   // big: one path, corners on the grid (as the engine fills tall walls)
      else if(cols > rows) poly(xa, ba2, xb, bb2, xb, tb2, xa, ta2, c); else colQuad(xa, ta2, ba2, xb, tb2, bb2, c); }   // small: exact pixel spans, whichever way takes fewer rects
  const nbFog = c => fogc(c, NQF);   // the end wall's fogged colours (NQF set by drawNB)
  function drawNB(sp, x, y, uw, fog, now){ const B = sp.B, j = sp.k, n = nbSpan(j, B, fog); if(!n) return; const t = segs[j + n - 1]; if(!t || !t.p2.screen.scale) return;
    const q = t.p2.screen, x2 = q.x + sp.x * q.w, y2 = q.y, u2 = q.w;
    if(B.side < 0 ? Math.max(x, x2) < 0 : Math.min(x, x2) > W) return;   // beside the camera, off the screen edge (the end wall only goes further out)
    // far away the canyon is the old facade sprites again (placed every 4 segments, bright, never enlarged past ~1.15x): the projected
    // building fades out over fog .062-.078 while they fade in
    const farT = clamp((fog - .062) / .016, 0, 1); if(farT >= 1) return;
    const fq = Math.round(fog * .85 * 32), C = B.c, ga = cx.globalAlpha, h = B.h; if(farT > 0) cx.globalAlpha = ga * (1 - farT);
    NQX = x; NQX2 = x2; NQY = y; NQY2 = y2; NQU = uw; NQU2 = u2; NQF = fq; const Q = nbQ;   // the slice's face, for nbQ
    // detail tiers, crossfaded, by distance: n0 the closest (mullions, blinds, awning stripes), n1 near (slabs, highlights, sign marks), n2 (wall signs, lit bar windows)
    const n0 = clamp((.009 - fog) / .003, 0, 1), n1 = clamp((.026 - fog) / .008, 0, 1), n2 = clamp((.15 - fog) / .04, 0, 1), bays = n, s1 = n === 1 ? clamp((.0112 - fog) / .003, 0, 1) : 0;   // s1: one-segment detail (punched windows, shopfronts), faded out before slices merge
    // the street face (its colour carries a little of its own signs' spill) and the parapet
    Q(0, h, C.face); Q(h - .05, h, C.L); if(n1 > 0) Q(h - .08, h - .05, C.D);
    const gb = ga * (1 - farT);
    // near: every floor is a facade tile (window, frame, blinds or curtains or people, the pier's AC unit, lightbox, sticker or pipe), one
    // sheared pattern fill per floor; further out the tiles crossfade (fog .033-.045) into one band of glass per floor
    const texT = clamp((.045 - fog) / .012, 0, 1);
    if(texT > 0){ cx.globalAlpha = gb * texT; cx.imageSmoothingEnabled = false; const wpx = Math.abs(x2 - x) / n / PX;
      for(let f = 0; f < B.nF; f++){ const h0 = B.gh + f * B.flh, h1 = h0 + B.flh, tile = nbTile(B.pal, B.fl[f], B.vr[f], ntSize(uw * B.flh / PX, wpx)), tw = tile.width, th = tile.height;
        const ta = y - uw * h1, tb = y2 - u2 * h1, ba = y - uw * h0, bb = y2 - u2 * h0; if(Math.max(ba, bb) < 0 || Math.min(ta, tb) > H) continue;
        PM.a = (x2 - x) / (n * tw); PM.b = (tb - ta) / (n * tw); PM.c = 0; PM.d = ((ba - ta) + (bb - tb)) / 2 / th; PM.e = x; PM.f = ta; const pat = ntPat(tile); pat.setTransform(PM); cx.fillStyle = pat;
        cx.beginPath(); cx.moveTo(snap(x), snap(ta)); cx.lineTo(snap(x2), snap(tb)); cx.lineTo(snap(x2), snap(bb)); cx.lineTo(snap(x), snap(ba)); cx.closePath(); cx.fill(); }
      cx.globalAlpha = gb; }
    // upper floors: one band of glass per floor in its tenant's light (punched windows near; far, one band in their mean colour); dark floors show their panes only up close
    for(let f = 0; f < B.nF; f++){ const fy = B.gh + f * B.flh, wy0 = fy + .07, wy1 = fy + .27, dark = B.fl[f] === 'dark', G = C.g[f];
      if(texT < 1 && (!dark || n1 > 0)){ cx.globalAlpha = gb * (1 - texT) * (dark ? n1 : 1);
        if(B.st[f]) Q(wy0, wy1, G[1], .04 / n, 1 - .04 / n); else { const a0 = cx.globalAlpha; if(s1 < 1){ cx.globalAlpha = a0 * (1 - s1); Q(wy0, wy1, G[3], .04 / n, 1 - .04 / n); } if(s1 > 0){ cx.globalAlpha = a0 * s1; Q(wy0, wy1, G[1], .18, .82); } }
        cx.globalAlpha = gb; }
      if(n1 > 0 && texT < 1){ cx.globalAlpha = gb * n1; if(s1 > 0){ cx.globalAlpha = gb * n1 * s1; Q(fy + B.flh - .025, fy + B.flh, C.slab); cx.globalAlpha = gb * n1; }
        if(n0 > 0){ cx.globalAlpha = gb * n0; if(B.st[f]) Q(wy0, wy1, C.D, .48, .52); if(!dark){ Q(wy1 - .025, wy1, G[0], B.st[f] ? 0 : .18, B.st[f] ? 1 : .82); Q(wy0 + .09, wy0 + .11, G[2], B.st[f] ? 0 : .18, B.st[f] ? 1 : .82); } }
        cx.globalAlpha = gb; }
      // a lightbox on the wall, on the building's second segment
      const sc = C.sg[f]; if(sc && n2 > 0 && j <= B.b0 + 1 && j + n > B.b0 + 1){ const a = (B.b0 + 1 - j) / n, ta = a + .12 / n, tb = a + .88 / n; cx.globalAlpha = gb * n2;
        Q(fy + .03, fy + .31, OUT, ta - .03 / n, tb + .03 / n); Q(fy + .05, fy + .29, sc[0], ta, tb);
        if(n1 > 0){ cx.globalAlpha = gb * n1; Q(fy + .265, fy + .29, sc[1], ta, tb); for(let m = 0; m < 3; m++) Q(fy + .1, fy + .22, sc[2], ta + (.12 + m * .27) * (tb - ta), ta + (.3 + m * .27) * (tb - ta)); }
        cx.globalAlpha = gb; } }
    // the ground floor: a lit shop under a striped awning on some segments, a dark stair door or shutter on the rest (or a dark bar with warm windows)
    const GH = B.gh, aw0 = GH - .14, aw1 = GH - .04;
    if(s1 < 1){ cx.globalAlpha = gb * (1 - s1); nbGround(B, Q, j, n, aw0, aw1, GH); cx.globalAlpha = gb; }   // past a few segments: runs of lit shops under plain awnings
    if(s1 > 0){ cx.globalAlpha = gb * s1; Q(aw1, GH, C.S);
    if(B.bar){ Q(.02, aw0, '#2a1610'); if(n2 > 0){ cx.globalAlpha = gb * s1 * n2; for(let b = 0; b < bays; b += 2) Q(.12, aw0 - .08, '#ffcf80', (b + .3) / bays, (b + .9) / bays); cx.globalAlpha = gb * s1; } }
    else { Q(.02, aw0, '#2a1a24'); for(let k = 0; k < n; k++){ if(!B.shop[j - B.b0 + k]) continue; Q(.02, aw0, '#f6c878', (k + .06) / n, (k + .94) / n);
        if(n1 > 0){ cx.globalAlpha = gb * s1 * n1; Q(aw0 - .02, aw0, '#fff2cc', (k + .06) / n, (k + .94) / n); Q(.02, aw0, '#b8743a', (k + .48) / n, (k + .52) / n); cx.globalAlpha = gb * s1; } } }
    Q(0, .02, OUT);
    for(let k = 0; k < n; k++){ if(!B.bar && !B.shop[j - B.b0 + k]) continue; const k0 = k / n, k1 = (k + 1) / n;
      if(n0 > 0){ Q(aw0, aw1, C.a2, k0, k1); cx.globalAlpha = gb * s1 * n0; for(let m = 0; m < 3; m++) Q(aw0, aw1, C.a1, k0 + (k1 - k0) * m / 3, k0 + (k1 - k0) * (m + .5) / 3); Q(aw1 - .005, aw1, C.a2h, k0, k1); cx.globalAlpha = gb * s1 * (1 - n0); }
      if(n0 < 1) Q(aw0, aw1, C.am, k0, k1); cx.globalAlpha = gb * s1; }
    cx.globalAlpha = gb; }
    // the vertical neon tube up the leading corner, and the roof kit
    if(j === B.b0){ if(B.tube) Q(GH + .04, h - .12, C.tube, .02, .08 / n);
      if(B.roof === 1){ Q(h, h + .55, C.D, .4 / n, .44 / n); if(n2 > 0){ cx.fillStyle = (reduce || Math.sin(now / 520 + B.b0) > -.2) ? '#ff3030' : '#5a1418'; const ta = .42 / n, xx = x + (x2 - x) * ta, yy = y + (y2 - y) * ta - (uw + (u2 - uw) * ta) * (h + .55); pxRect(xx - PX / 2, yy - PX, PX, PX); } } }
    if(B.roof === 0 && j <= B.b0 + 1 && j + n > B.b0 + 1){ const a = (B.b0 + 1 - j) / n, w = Math.min(1, 2.2 / n);   // a rooftop billboard on legs, two segments long
      if(n1 > 0){ cx.globalAlpha = gb * n1; Q(h, h + .1, '#2a2436', a + .1 * w, a + .14 * w); Q(h, h + .1, '#2a2436', a + .86 * w, a + .9 * w); cx.globalAlpha = gb; }
      Q(h + .1, h + .42, OUT, a, a + w); Q(h + .12, h + .4, C.rc, a + .02 * w, a + .98 * w); if(n1 > 0){ cx.globalAlpha = gb * n1; Q(h + .37, h + .4, C.rch, a + .02 * w, a + .98 * w); cx.globalAlpha = gb; } }
    else if(B.roof === 2 && n2 > 0 && j <= B.b0 + 2 && j + n > B.b0 + 2){ const a = (B.b0 + 2 - j) / n; cx.globalAlpha = gb * n2; Q(h, h + .14, '#3a3a48', a + .1 / n, a + .7 / n); Q(h + .12, h + .14, '#6a6a7c', a + .1 / n, a + .7 / n); cx.globalAlpha = gb; }
    // the end wall facing the camera, in shadow: a column of tenant windows per floor, the awning's end, a lit top edge
    if(j === B.b0 || LX(j - 1) !== LX(j)){ cx.globalAlpha = gb; NQF = fq; const F = nbFog, dx = B.side * B.depth * uw, xl = Math.min(x, x + dx), wd = Math.abs(dx); cx.fillStyle = F(C.S); pxRect(xl, y - uw * h, wd, uw * h);
      if(wd > PX * 3){ if(texT > 0){ cx.globalAlpha = gb * texT; const fh = uw * B.flh, sz = ntSize(fh / PX, wd / PX); for(let f = 0; f < B.nF; f++){ const tile = nbTile(B.pal, B.fl[f], B.stair ? 5 : (B.vr[f] + 1) % 5, sz), yt = snap(y - uw * (B.gh + (f + 1) * B.flh));
            cx.drawImage(tile, snap(xl), yt, Math.max(PX, snap(xl + wd) - snap(xl)), snap(y - uw * (B.gh + f * B.flh)) - yt); } cx.globalAlpha = gb; }
        if(texT < 1){ cx.globalAlpha = gb * (1 - texT); for(let f = 0; f < B.nF; f++){ if(B.fl[f] === 'dark' && n1 <= 0) continue; const fy = B.gh + f * B.flh; cx.fillStyle = F(C.g[f][1]); pxRect(xl + wd * .14, y - uw * (fy + .27), wd * .72, uw * .2); } cx.globalAlpha = gb; }
        cx.fillStyle = F(B.bar ? '#2a1610' : '#f6c878'); pxRect(xl + wd * .08, y - uw * aw0, wd * .84, uw * (aw0 - .02)); cx.fillStyle = F(C.a1); pxRect(xl, y - uw * aw1, wd, uw * .1); }
      cx.fillStyle = F(C.L); pxRect(xl, y - uw * h, wd, Math.max(PX, uw * .03)); }
    cx.globalAlpha = ga;
    // warm light from the shopfront on the pavement
    if(!B.bar && fog < .36 && (j - B.b0) % 3 === 1) pool(x - B.side * uw * .3, y, uw * .5, '#ffc070', .5 * Math.min(1, (.36 - fog) / .1)); }

  /* ---------------------------------------------------------------- larger art sizes for the signs and the lucky cat: the pixel sprite
     scaled 2x and 4x with Scale2x (EPX), which keeps the pixel look and the same letterforms but rounds the staircases, built in warm().
     blitT draws whichever size keeps a sprite pixel within ~1.5 canvas pixels. */
  // Scale2x on pixel data (no canvas made): {w, h, d:Uint32Array} -> twice the size
  function sx2d(S){ const w = S.w, h = S.h, src = S.d, dst = new Uint32Array(w * h * 4);
    const at = (x, y, P) => x < 0 || y < 0 || x >= w || y >= h ? P : src[y * w + x];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const P = src[y * w + x], A = at(x, y - 1, P), Bq = at(x + 1, y, P), Cq = at(x - 1, y, P), Dq = at(x, y + 1, P), o0 = (y * 2) * w * 2 + x * 2, o1 = o0 + w * 2;
      dst[o0] = Cq === A && Cq !== Dq && A !== Bq ? A : P; dst[o0 + 1] = A === Bq && A !== Cq && Bq !== Dq ? Bq : P; dst[o1] = Dq === Cq && Dq !== Bq && Cq !== A ? Cq : P; dst[o1 + 1] = Bq === Dq && Bq !== A && Dq !== Cq ? Dq : P; }
    return { w:w * 2, h:h * 2, d:dst }; }
  const pixOf = c => ({ w:c.width, h:c.height, d:new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer.slice(0)) });
  function sx2(c){ const S = sx2d(pixOf(c)), [o, k] = canvas(S.w, S.h), img = k.createImageData(S.w, S.h); new Uint32Array(img.data.buffer).set(S.d); k.putImageData(img, 0, 0); return o; }
  function artSizes(c, four){ if(!c._x2) c._x2 = sx2(c); if(four && !c._x4) c._x4 = sx2(c._x2); }
  /* The blade signs' larger art sizes live in two atlas canvases (2x: every sign and frame; 4x: every sign lit), not 240 separate canvases:
     that many textures thrashed the GPU cache and stalled frames. Rebuilt in place when the pixel font arrives (no new canvas then). */
  let BA2 = null, BA4 = null; const BA_H2 = 2 * (4 * 15 + 9), BA_H4 = 4 * (4 * 15 + 9);
  function bladeAtlas(){ for(const _ of bladeAtlasSteps()); }
  function* bladeAtlasSteps(){ if(!BA2){ BA2 = canvas(60 * 44, 3 * BA_H2)[0]; BA4 = canvas(60 * 88, BA_H4)[0]; } yield; const k2 = BA2.getContext('2d'), k4 = BA4.getContext('2d'); yield; k2.clearRect(0, 0, BA2.width, BA2.height); yield; k4.clearRect(0, 0, BA4.width, BA4.height); yield; const px0 = k2.createImageData(1, 1); k2.putImageData(px0, 0, 0); yield; k4.putImageData(px0, 0, 0); yield;   // (stepped: one sign frame a step)
    const put = (k, S, x, y) => { const img = k.createImageData(S.w, S.h); new Uint32Array(img.data.buffer).set(S.d); k.putImageData(img, x, y); };
    for(let v = 0; v < 60; v++) for(let f = 0; f < 3; f++){ const c = blade(v, f), P0 = c._px || pixOf(c); c._px = null; const S2 = sx2d(P0); put(k2, S2, v * 44, f * BA_H2); c._a2 = [v * 44, f * BA_H2, S2.w, S2.h]; yield;
      if(f === 0){ const S4 = sx2d(S2); put(k4, S4, v * 88, 0); c._a4 = [v * 88, 0, S4.w, S4.h]; yield; } } }
  function blitT(c, x, yB, k){ const s2 = k / PX;
    if(s2 > 1.5 && (c._a2 || c._x2)){ const four = s2 > 3 && (c._a4 || c._x4), t = four ? 4 : 2, a = four ? c._a4 : c._a2;
      if(!a) return blitF(four ? c._x4 : c._x2, x, yB, k / t, false);
      const kk = k / t, w = a[2] * kk, h = a[3] * kk; cx.imageSmoothingEnabled = false; cx.drawImage(four ? BA4 : BA2, a[0], a[1], a[2], a[3], Math.round(x - w / 2), Math.round(yB - h), w, h); return; }
    blitF(c, x, yB, k, false); }

  /* ---------------------------------------------------------------- placement */
  const P = 480, PLZ_X = 3.3, CAT_X = 3.8, CAT_NX = 2.4;   // (the plaza's far side; the cat's back row and the cat, whose plinth reaches 1.1 either side of it)   // one district block: gate, lantern strings, a bridge, the crossing plaza with its giant screen, the lucky cat
  const refl = (s, x, w, h, a, col) => { (s.nr || (s.nr = [])).push({ x, w, h, a, col }); };
  /* Wet-road reflections, drawn per light source from its own segment's ground point. Anchored to the light: positions and sizes snap
     to whole canvas pixels, edges snap independently, nothing switches on or off per frame, and every cut-off is a fade.
     Kodawari audit #4 (2026-11-21): every sign threw a full-height streak (its height plus .9 road widths, down to the bike), far lights
     reflected as strongly as near ones, and the near dashes jumped by hashed gaps and offsets, so the lower road became a barcode of
     pinks and greys that hid the lane lines and the slicks. Now a streak reads as wet asphalt under a sign:
     - short: ~45% of the old length (and never more than a fifth of the screen), its alpha about half, stepped down along its length;
     - near and mid lights only: a light fades out of the water from fog .5 to .7 (far signs no longer stack at the vanishing point), and a
       coarse per-column budget (REFL_CAP) stops overlapping streaks from filling a column;
     - one coherent column per light that ripples gently: near streaks are laid per nearer road segment (so the ripple rides with the
       asphalt), each row shifted by at most one pixel and narrowed a little on a slow sine, never a random gap;
     - broken by the lane lines: on a dash segment the streak leaves a dark gap one pixel either side of the painted line.
     Far or small: a steady stepped column (one drawImage); near and large: the per-segment column, crossfaded in by size. */
  const sn = v => Math.round(v / PX) * PX, ramp = (v, a0, a1) => v <= a0 ? 0 : v >= a1 ? 1 : (v - a0) / (a1 - a0);
  const RF_LEN = .45, RF_MAXH = .2, RF_A = .55, RF_F0 = .5, RF_F1 = .7;
  // one row of a near streak, with the lane lines cut out of it on a dash segment (lc: the lines' centres, lw: half their width plus the gap)
  function rfRow(x0, x1, y, h, col, core, cA, cB, lc0, lc1, lw){
    const spans = [[x0, x1]]; if(lw > 0) for(const lc of [lc0, lc1]){ const a = sn(lc - lw), b = sn(lc + lw); for(let n = spans.length - 1; n >= 0; n--){ const [p, q] = spans[n]; if(b <= p || a >= q) continue; spans.splice(n, 1); if(a > p) spans.push([p, a]); if(b < q) spans.push([b, q]); } }
    for(const [p, q] of spans){ cx.fillStyle = col; cx.fillRect(p, y, q - p, h); if(core && cB > cA){ const c0 = Math.max(p, cA), c1 = Math.min(q, cB); if(c1 > c0){ cx.fillStyle = core; cx.fillRect(c0, y, c1 - c0, h); } } } }
  function reflect(s, a, bandH, fog, now, base){ fog = fogPx(fog); if(fog > RF_F1 || a.y > H) return;   // (fogPx: the reach these streaks were tuned at)
      const fa = (1 - fog * .8) * (.45 + .55 * Math.min(1, fog * 5)) * ramp(RF_F1 - fog, 0, RF_F1 - RF_F0) * ramp(W * .8 - a.w, 0, W * .2) * RF_A;
      for(const r of s.nr){ const wide = r.w > .6, nf = wide ? 1 : ramp(.8 - fog, 0, .16) * (r.h < .6 ? ramp(.6 - fog, 0, .14) : 1), al = r.a * fa * nf; if(al < .01) continue;
        // each edge is snapped on its own, so as the light approaches its streak only ever grows: no edge steps back and forth a pixel
        const hw = Math.min(W * (wide ? .25 : .02), a.w * r.w / 2), cxs = a.x + r.x * a.w, xl = sn(cxs - hw), xr = Math.max(xl + PX, sn(cxs + hw)), ww = xr - xl, sx = (xl + xr) / 2, y0 = sn(a.y), len = sn(a.y + Math.min(a.w * r.h * RF_LEN, H * RF_MAXH)) - y0;
        if(sx + ww < 0 || sx - ww > W || len < PX) continue;
        const core = r.core || (r.core = lighten(r.col, .6)), rip = wide ? 0 : ramp(ww / PX, 5, 9) * ramp(bandH / PX, 3, 6), steady = 1 - rip;
        const am = rbTake(xl, y0, ww, len, al * (wide ? .9 : (.5 + .5 * (1 - fog)) * Math.min(1, 1.25 - fog * 1.25)));
        if(am < .005) continue;
        if(steady > 0){ // far streaks: colour only (hot cores stacked toward the vanishing point turn white); the core fades in as the streak widens
          const cw2 = wide ? 0 : ramp(ww / PX, 2, 4);
          if(cw2 < 1){ cx.globalAlpha = Math.min(1, am * steady * (1 - cw2)); cx.drawImage(stripS(r.col, true), xl, y0, ww, len); }
          if(cw2 > 0){ cx.globalAlpha = Math.min(1, am * steady * cw2); cx.drawImage(stripS(r.col, false), xl, y0, ww, len); } }
        if(rip > 0){ // one row per nearer road segment, so the ripple rides with the asphalt: a slow sine per light shifts each row by at most a
          // pixel and narrows it a little; the lane lines are cut out of it on dash segments; three steps of alpha down its length
          const ph = reduce ? 0 : now / 900, seed = hash(s.index * .37 + r.x) * 6.283, amp = ramp(ww / PX, 6, 10) * PX, LX = typeof LANE_X !== 'undefined' ? LANE_X : null;
          for(let j = 1; j < 40; j++){ const q = segs[s.index - j]; if(!q || q.index <= base) break; const qy0 = sn(q.p2.screen.y), qy1 = sn(q.p1.screen.y); if(qy0 - y0 >= len) break; if(qy1 <= qy0) continue;
            const hh = Math.min(qy1, y0 + len) - qy0; if(hh <= 0) continue; const t = (qy0 - y0) / len, st = t < .34 ? 1 : t < .67 ? .55 : .28;
            const u = q.index * .55 + seed, jx = amp ? Math.round(Math.sin(u + ph) * 1.2) * PX : 0, wd = Math.max(PX, sn(ww * (.85 + .15 * Math.sin(u * 1.7 - ph * .8)))), x0 = sx - wd / 2 + jx;
            let lc0 = 0, lc1 = 0, lw = 0; if(q.stripe && LX){ const m = q.p1.screen, mx = (m.x + q.p2.screen.x) / 2, mw = (m.w + q.p2.screen.w) / 2; lc0 = mx + mw * LX[0] * 2; lc1 = mx + mw * LX[1] * 2; lw = mw / 40 + PX; }
            cx.globalAlpha = Math.min(1, am * rip * st * 1.5); rfRow(sn(x0), sn(x0) + wd, qy0, hh, r.col, ww >= 4 * PX ? core : null, sn(sx + jx) - PX, sn(sx + jx) + PX, lc0, lc1, lw); } } }
  }
  const stripS = (col, wide) => C['sp' + col + (wide ? 'w' : 'n')] || cache('sp' + col + (wide ? 'w' : 'n'), () => { const [c, k] = canvas(6, 20), core = lighten(col, .65);
    for(let y = 0; y < 20; y++){ const st = y < 11 ? 1 : y < 16 ? .55 : .28; k.globalAlpha = st; k.fillStyle = col; k.fillRect(0, y, 6, 1); if(!wide){ k.fillStyle = core; k.fillRect(2, y, 2, 1); } } return c; });
  const RS = { last:-1, lastB:0, now:-1 };
  // additive budget: far streaks stack toward the vanishing point and burn out to white. Each frame keeps a coarse grid (4x6 canvas px cells) of the
  // additive alpha already laid down; a new streak only gets what is left under REFL_CAP in the cells it covers, so the colour survives the stacking.
  const REFL_CAP = .7; let RB = null, RBw = 0, RBh = 0;
  function rbReset(){ const w = Math.ceil(W / PX / 4) + 1, h = Math.ceil(H / PX / 6) + 1; if(!RB || w !== RBw || h !== RBh){ RBw = w; RBh = h; RB = new Float32Array(w * h); } else RB.fill(0); }
  function rbTake(xl, y0, ww, len, am){ if(!RB) return am; const c0 = Math.max(0, Math.floor(xl / PX / 4)), c1 = Math.min(RBw - 1, Math.floor((xl + ww - 1) / PX / 4)), r0 = Math.max(0, Math.floor(y0 / PX / 6)), r1 = Math.min(RBh - 1, Math.floor((y0 + len - 1) / PX / 6));
    if(c1 < c0 || r1 < r0) return am; let used = 0; for(let r = r0; r <= r1; r++) for(let c = c0; c <= c1; c++){ const u = RB[r * RBw + c]; if(u > used) used = u; }
    const got = Math.max(0, Math.min(am, REFL_CAP - used)); if(got > 0) for(let r = r0; r <= r1; r++) for(let c = c0; c <= c1; c++) RB[r * RBw + c] += got; return got; }
  // warmAll() builds everything at once; warmAllSteps() is the same build with safe stopping points, for the staged warm-up (about 4 ms a frame)
  function warmAll(){ for(const _ of warmAllSteps()); }
  // (stepped finely, the same build in the same order: first 60 s, research/sundown-craft/first60.md)
  function* warmAllSteps(){ yield* warmTilesSteps(); yield;
    for(let v = 0; v < 12; v++){ facade(v); yield; mirror(facade(v)); yield; } for(let v = 0; v < 60; v++){ for(let f = 0; f < 3; f++){ blade(v, f); yield; } } yield* bladeAtlasSteps();
    lampS(); yield; mirror(lampS()); yield; yatai(); yield; mirror(yatai()); yield; for(let v = 0; v < 3; v++){ vend(v); yield; vendHi(v, 2); yield; vendHi(v, 4); yield; vendHi(v, 8); yield; } lantern(0); yield; lantern(1); yield; walker(0); yield; walker(1); yield; for(let f = 0; f < 2; f++){ crowd(f); yield; mirror(crowd(f)); yield; }
    for(const ch of EXTRA){ glyph(ch); yield; } for(let f = 0; f < 3; f++){ gate(f); yield; } bridgeS(); yield; for(let f = 0; f <= 32; f++){ screenFrame(f); yield; } jumbo(); yield; jumboWin(); yield; tickS(); yield;
    for(const art of [neko, paw, plinth]){ const c = art(); yield; artSizes(c, false); yield; artSizes(c, true); yield; } for(let v = 0; v < 5; v++){ trainCar(v); yield; }
    const cols = new Set(['#ffc070', '#ffe6b0', '#fff4c0', '#ffb070', '#ff3a4a', '#ff8a4a', '#e8f0ff', '#ffd04a', '#3a7aff', '#ffd890', '#ff6aa8', '#ffe8f0', ...NEON]);
    for(const c of [...cols, '#ffb060']){ stripS(c, true); stripS(c, false); yield; }
    for(const c of [...cols, '#ffd8a0', '#fff0c0', '#fff4d0', '#ff6a4a', '#ffcf80', '#fff0e8', '#fff0d0', '#ff7a4a', '#c8d8ff', '#ff2a4a', '#2a6aff', '#ff8ab8', '#b8f0ff', '#3aff9a', '#ff3a3a', '#ff4a5a']){ haloS(c); yield; poolS(c); yield; } }
  // draw every cached canvas once so the browser uploads it now, not on the frame it first appears
  function prime(){ for(const _ of primeSteps()); }
  function* primeSteps(){ const pr = c => { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.drawImage(c, 0, 0, 1, 1); cx.restore(); };   // (stepped: one canvas a step, each its own save/restore)
    for(const key of Object.keys(C)){ const c = C[key]; if(!c || !c.getContext) continue; pr(c); yield; if(c._m){ pr(c._m); yield; } for(const z of [c._x2, c._x4]) if(z){ pr(z); yield; if(z._m){ pr(z._m); yield; } } } if(BA2){ pr(BA2); yield; pr(BA4); yield; } }
  const HAZE_B = [.0, .14, .05, .14, .26, .032, .26, .36, .016];   // the overlay's magenta haze bands: top, bottom (screen fraction), alpha
  /* The yatai as a projected stall (buildings3d r5). It was a 32 x 28 card at x 1.4 that faded out from 6x to 10x, so it ghosted as you
     passed and never showed its long side. Now it is a 6-segment run (0.62 half-road widths, the card's own width) drawn with ENV.bkit:
     the card's design is the end facing the camera, row for row (one art row = YT.u): the red tent roof with its lit edge and scalloped
     valance, the posts, the warm-lit inside with the navy noren and their white marks, the cook and the steaming pot, the wood counter with
     its lit lip, the dark cart body and its wheel, the red chōchin on the corner. Along the road the same rows run as the long side: the
     roof slope, the valance, noren in a row with the cook behind them, the counter with three stools, the cart body and two wheels with
     hubs. Studied: Fukuoka's Nakasu yatai rows (Commons): a red or white canopy, noren hung all along the counter, stools under it. */
  const YT = { X:1.22, D:.36, len:6, u:.54 / 28 };
  const yH = y => (28 - y) * YT.u;                                                  // art row -> height
  let YFQ = 0; const ytF = c => fogc(c, YFQ);
  function drawYatai3(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .5) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; YFQ = Math.round(fog * .85 * 32);
    const F = ytF, X = YT.X, D = YT.D, rel = K.rel, near = fog < .02, mid = fog < .05, a0 = cx.globalAlpha, tA = r => clamp((r - rel) / m, 0, 1), RT = K.RT;
    const band = (h0, h1, ta, tb, col) => K.Q(X, h0, X, h1, ta, tb, col);
    // the long side: cart body, counter, the lit inside, posts, noren, the roof's valance and slope
    band(yH(26), yH(21), 0, 1, F('#4a2614')); band(yH(21), yH(20.4), 0, 1, F('#6a3a1e'));
    band(yH(21), yH(18), 0, 1, F('#7a4420')); band(yH(18.6), yH(18), 0, 1, F('#d08a48'));
    band(yH(18), yH(9), 0, 1, F('#ffcf80')); band(yH(9.6), yH(9), 0, 1, F('#fff0c8'));
    for(const r of [.15, 3, 5.85]) if(r >= rel && r < rel + m) K.V(X, yH(18), yH(8), tA(r), .02, F('#3a2418'));
    if(mid){ const cr = 2; if(cr >= rel && cr < rel + m){ RT(X + .1, yH(18), tA(cr), .06, .1, F('#2a1610')); RT(X + .1, yH(15.6), tA(cr), .05, .045, F('#2a1610')); }   // the cook behind the noren
      const pr = 4.2; if(pr >= rel && pr < rel + m){ RT(X + .08, yH(18), tA(pr), .11, .06, F('#6a6a7a')); RT(X + .08, yH(15.2), tA(pr), .11, .012, F('#b0b0c0')); } }   // the pot
    { const n = 9; for(let c = 0; c < n; c++){ const r0 = c * YT.len / n + .08, r1 = (c + 1) * YT.len / n - .08; if(r1 < rel || r0 > rel + m) continue; const ta = tA(r0), tb = tA(r1);   // noren, one flap per bay
        band(yH(13), yH(9), ta, tb, F('#22306e')); if(mid) band(yH(12), yH(10.2), ta + (tb - ta) * .4, ta + (tb - ta) * .6, F('#e8e4dc')); } }
    K.Q(X - .06, yH(8.2), X - .06, yH(5), 0, 1, F('#8a1a1e')); K.Q(X - .06, yH(5.6), X - .06, yH(5), 0, 1, F('#c83a32'));   // the valance, its lit edge
    if(mid){ const n = Math.max(2, Math.round(m * 1.5)); for(let c = 0; c < n; c++) K.Q(X - .06, yH(9), X - .06, yH(8.2), (c + .15) / n, (c + .6) / n, F('#8a1a1e')); }   // the scallops
    K.Q(X - .06, yH(5), X + D / 2, yH(4), 0, 1, F('#a8222a')); K.Q(X - .06, yH(5), X + .02, yH(4.8), 0, 1, F('#c83a32'));   // the roof slope
    // stools and wheels along the side
    if(mid){ for(const r of [1.2, 3, 4.8]) if(r >= rel && r < rel + m){ const t = tA(r); RT(X - .14, yH(22.5), t, .1, .02, F('#c8203a')); RT(X - .14, yH(28), t, .02, yH(22.5) - yH(28), F('#3a3448')); }
      for(const r of [.9, 5.1]) if(r >= rel && r < rel + m){ const t = tA(r); RT(X - .01, 0, t, .1, .1, F('#14101a')); RT(X - .01, .035, t, .04, .035, F('#4a4458')); } }
    // the end facing the camera: the card's design, row for row
    if(K.end){ const E = (a, h0, b, h1, c) => K.E(X + a * D / 32, yH(h1), X + b * D / 32, yH(h0), F(c)), Lx = l => X + l * D / 32;
      E(0, 21, 32, 26, '#4a2614'); E(0, 21, 32, 21.6, '#6a3a1e'); E(0, 18, 32, 21, '#7a4420'); E(0, 18, 32, 18.6, '#d08a48');
      E(1, 9, 31, 18, '#ffcf80'); E(1, 9, 31, 9.6, '#fff0c8'); E(0, 8, 1.6, 18, '#3a2418'); E(30.4, 8, 32, 18, '#3a2418');
      if(mid){ E(8, 12, 14, 15, '#2a1610'); E(9, 11, 13, 12, '#2a1610'); E(18, 13, 26, 16, '#6a6a7a'); E(18, 13, 26, 13.6, '#b0b0c0'); }
      for(let c = 1; c < 30; c += 7){ E(c, 9, c + 5, 13, '#22306e'); if(mid) E(c + 2, 10, c + 3, 12, '#e8e4dc'); }
      K.T(X - .06, yH(5), X + D + .06, yH(5), X + D / 2, yH(3.4), F('#8a1a1e')); K.E(X - .06, yH(8.2), X + D + .06, yH(5), F('#8a1a1e')); K.E(X - .06, yH(5.6), X + D + .06, yH(5), F('#c83a32'));   // the tent's end: gable, valance, lit edge
      if(mid) for(let c = 0; c < 8; c++) K.E(Lx(c * 4 + .5), yH(9), Lx(c * 4 + 2.5), yH(8.2), F('#8a1a1e'));
      E(6, 24, 10, 28, '#14101a'); if(mid) E(7, 25, 9, 27, '#4a4458'); E(22, 24, 26, 28, '#14101a'); if(mid) E(23, 25, 25, 27, '#4a4458');
      const lx = X - .05; RT(lx, yH(15), 0, .06, yH(8) - yH(15), F('#a8162a')); RT(lx, yH(14), 0, .02, yH(10) - yH(14), F('#ffb070')); RT(lx, yH(15), 0, .06, .012, F(OUT)); RT(lx, yH(7.6), 0, .06, .012, F(OUT));   // the chōchin
      if(fog < .3){ glow(K.px(lx, yH(11.5), 0), K.py(lx, yH(11.5), 0), uw * .22, '#ff6a4a', .45 * (1 - fog)); glow(K.px(X + D / 2, yH(14), 0), K.py(X + D / 2, yH(14), 0), uw * .4, '#ffcf80', .3 * (1 - fog));
        { const px0 = K.px(X + D * .6, yH(15), 0), py0 = K.py(X + D * .6, yH(15), 0), k = uw * YT.u; for(let i = 0; i < 7; i++){ const ph = reduce ? i / 7 : ((now / 1600 + i / 7) % 1), s2 = Math.max(PX, Math.round(k * (2 + ph * 3) / PX) * PX);   // the pot's steam, as the card had it
          cx.fillStyle = `rgba(255,${200 - ph * 60 | 0},${200 + ph * 40 | 0},${(.42 * (1 - ph)) * (1 - fog)})`; cx.fillRect(Math.round((px0 + Math.sin(ph * 5 + i) * k * 3 * ph) / PX) * PX, Math.round((py0 - ph * 26 * k) / PX) * PX, s2, s2); } } } }
    cx.globalAlpha = a0; }
  /* ---------------------------------------------------------------- the wet street (Kellan: "in the neon ward can you please make the
     reflections in the road more prominent?", then a palette-knife painting of a rainy street: "notice how intense the reflections are here?")
     Seen in the references (research/sundown-craft/akiba.md section 11; the painting): every light throws a column of its own colour straight
     down the road toward the viewer, nearly as bright as the light itself, white-hot at the core near by, broken into blocky dashes by the
     wet; the road between the columns is not black but a cool sheen of the sky with bright flecks; people and posts cut dark breaks into
     the columns. Built on env/roadmat.js's deferred pools (the core's sprite pass clips each segment's hook to the rows above the road in
     front, so a reflection drawn from its light's own segment was mostly clipped away: why this street's reflections were faint):
     - wetSrc records each light once: blade signs, lamp heads, vending machines, the 月光一番街 gate (the bulb tube's uprights and lower
       bar, the lightbox), the lantern strings (one column per lantern), the bridge's adverts, the train, the koi screen (its water, the koi
       swimming across it, the ticker, the pylons' shops), the lucky cat, the yatai, every street-row building as one smeared band of its lit
       shopfronts and one of its tenants' floors (one band per front, at its middle segment: no per-sign draws), its corner tube and its wall
       lightboxes; and a longer, hotter copy of each car's tail lights. Kept as columns, not slabs: near widths are capped in screen terms, a
       white lightbox reflects in its characters' colour, a high light's image is pulled in, and the minor lights stay dim, because the pools
       add ('lighter') and pink + cyan + gold summed to a white-out wherever more than three columns crossed (round 1 of this pass).
     - wetFX lays the cool sky sheen on the near road (roadmat's own sheen is a Fresnel term that dies out near the camera), stepped by the
       puddle mask, with 'lighten' after the pools: the brighter of the sky and the light, as a mirror shows one or the other, so a column
       keeps its hue on the blue instead of turning lavender. Then each car's dark mirror image is cut into whatever lies under it.
     The old per-segment streaks (reflect(), below in roadFX) are skipped while the pools are on; ?roadmat=0 brings them back. */
  const NWX = (() => { try{ return new URLSearchParams(location.search).get('nwx') || ''; }catch(e){ return ''; } })();   // (dev: ?nwx=blade,nb,sheen,... leaves those parts out, for ablations)
  const RMN = () => { const R = window.MECH && MECH.roadmat; return !!(R && R.on && R.ready && R.RP && R.RP.neon && R.RP.neon.pools > 0); };
  const BLW = {}, bladeW = v => BLW[v] || (BLW[v] = v % 3 === 0 ? mixc(NEON[(v * 3 + 1) % 5], '#ffe8f0', .3) : bladeCol(v));
  const WCORE = {}, wcore = c => WCORE[c] || (WCORE[c] = lighten(c, .62));
  // a sprite's lateral position as drawn (over a side lane the roadside stands back: SL_PUSH)
  const wx = (s, sp) => { const sd = s.lane ? s.lane.sd : 0, x = sp.x; return sd && !sp.ls && x * sd > 1 && x * sd < SL_BAND ? x + sd * SL_PUSH : x; };
  // a building's upper floors as one band, and how much of the face is lit
  //   (the commonest lit tenant's colour, not the mean: a mean of warm, pink and cyan is a pale lavender, and pale columns summed to white)
  function nbWet(B){ if(B.wu) return B.wu; const cnt = {}; let n = 0, best = null; for(let f = 0; f < B.nF; f++){ const k = B.fl[f]; if(k === 'dark') continue; cnt[k] = (cnt[k] || 0) + 1; n++; if(!best || cnt[k] > cnt[best]) best = k; }
    return (B.wu = { col:best ? GLASS[best][1] : '#2a2440', fr:n / Math.max(1, B.nF), top:B.gh + B.nF * B.flh }); }
  // (far lights fade out of the water sooner than roadmat's own fade: far columns only stacked into a glare at the vanishing point; a high light's
  // image is pulled in, or every sign up the canyon ran its column to the bottom of the screen and nine of them summed to white there)
  function wetSrc(s, n, a, P0){ if(n > 72) return; const fd = n < 26 ? 1 : 1 - (n - 26) / 50, P = (x, y, u, h0, h1, w, c, al) => P0(x, y, u, h0, h1 > 2.1 ? Math.max(h0 + .3, 2.1 + (h1 - 2.1) * .3) : h1, w, c, al * fd); const uw = a.w; if(!(uw > .6)) return; const i = s.index, ax = a.x, by = a.y, now = performance.now(), near = uw > 110;
    for(let q = 0; q < s.sprites.length; q++){ const sp = s.sprites[q], t = sp.type; if(sp.env !== 'neon' || (NWX && NWX.includes(t))) continue; const X = wx(s, sp), x = ax + X * uw;
      if(t === 'blade'){ const hh = (WORDS[sp.k % WORDS.length].length * 15 + 9) * .3 / 22, col = bladeW(sp.k), w = Math.min(.24 * uw, W * .021);   // (a white lightbox's image takes its characters' colour: a third of the signs are white, and white columns summed to a white-out)
        const up = sp.h > 1.8; if(up && n > 36) continue; P(x, by, uw, sp.h, sp.h + hh, w, col, up ? .4 : .85);   // (an upper sign's image lies under the lower one's: dimmer, or the two summed to white)
        if(near) P(x, by, uw, sp.h + hh * .2, sp.h + hh, w * .34, wcore(col), .5); }
      else if(t === 'lamp'){ const gx = x + (sp.x > 0 ? -1 : 1) * .07 * uw; P(gx, by, uw, .78, 1.5, Math.min(.12 * uw, W * .03), '#ffc870', 1); if(near) P(gx, by, uw, .8, 1.3, Math.min(.05 * uw, W * .012), '#fff4d8', .6);
        }
      else if(t === 'vend'){ P(x, by, uw, .04, .6, Math.min(.24 * uw, W * .03), ['#ffd890', '#ff4a5a', '#4a7aff'][sp.k] || '#ffd890', .75); }
      else if(t === 'gate'){ for(const sd of [-1, 1]) P(x + sd * 1.42 * uw, by, uw, 1.43, 2.6, .1 * uw, '#ff4a5a', 1.1); P(x, by, uw, 1.43, 1.52, 2.9 * uw, '#ff3a4a', .45); P(x, by, uw, 1.58, 2.3, 1.5 * uw, '#ffd0d8', .55); }   // (the bulb tube's two uprights, its lower bar, the lightbox)
      else if(t === 'lstr'){ for(let j = 0; j < 9; j += n > 18 ? 2 : 1){ const tt = (j + .5) / 9, hb = 1.95 - .38 * 4 * tt * (1 - tt) - .2375; P(ax + (-1.55 + 3.1 * tt) * uw, by, uw, hb, hb + .4, .13 * uw, j % 3 === 1 ? '#fff0d0' : '#ff7a4a', .75); } }
      else if(t === 'bridge'){ P(x, by, uw, 1.47, 2.2, 2.86 * uw, '#ffd04a', 1); P(x, by, uw, 1.38, 1.45, 4.4 * uw, '#e8f0ff', .5);
        for(const sd of [-1, 1]) P(x + sd * 1.85 * uw, by, uw, 1.47, 2.2, .44 * uw, '#ff3b8a', 1.05); }
      else if(t === 'train'){ const tx = x + ((reduce ? .4 : now / 1000 * .3 + sp.k) % 2 - 1) * 9 * uw * 1.4; for(let c = 0; c < 5; c++) P(tx + c * 1.3 * uw, by, uw, 2.35, 3.1, 1.1 * uw, '#e8f0ff', .7); }
      else if(t === 'jumbo'){ const f = reduce ? 6 : Math.floor(now / 120) % 44, fi = f < 32 ? f : 32, ku = 5.4 / JW;
        P(x, by, uw, 1.89, 3.4, Math.min(SW2 * ku * uw, W * .07), fi === 32 ? '#ff2a4a' : '#2a5aff', .7);
        if(fi < 32) for(let j = 0; j < 2; j++){ const tk = ((fi / 32) + j * .5) % 1, kx = -22 + tk * (SW2 + 26) + 11 - SW2 / 2; if(Math.abs(kx) < SW2 / 2 - 4) P(x + kx * ku * uw, by, uw, 2.1, 3.1, Math.min(20 * ku * uw, W * .025), '#ff8a3a', 1); }
        P(x, by, uw, 1.58, 1.9, 102 * ku * uw, '#ffb040', .7); for(const sd of [-1, 1]) P(x + sd * 1.9 * uw, by, uw, .05, 1.2, Math.min(.4 * uw, W * .03), '#ffc060', .6); }
      else if(t === 'neko'){ P(x, by, uw, 1.1, 3.2, Math.min(1.1 * uw, W * .06), '#ff6aa8', .7); }
      else if(t === 'yatai3'){ if(i === sp.b0 + 2) P(ax + X * uw, by, uw, .08, .6, Math.min(.5 * uw, W * .045), '#ff9a50', .8); }
      else if(t === 'nb'){ const B = sp.B, mid = B.b0 + (B.len >> 1); if(sp.k !== i || (i !== mid && i !== B.b0 && i !== B.b0 + 1)) continue;
        if(B.tube && i === B.b0) P(x + B.side * .03 * uw, by, uw, B.gh + .04, B.h - .12, Math.max(PX, Math.min(.07 * uw, W * .01)), B.c.tube, .8);
        if(i === B.b0 + 1 && n < 40) for(let f = 0; f < B.nF; f++){ const sc = B.c.sg[f]; if(sc){ const fy = B.gh + f * B.flh; P(x, by, uw, fy + .05, fy + .4, Math.min(.26 * uw, W * .02), sc[0] === '#f4ecf0' ? '#ff9ac0' : sc[0], .5); } }
        if(i !== mid) continue; const tq = segs[B.b0 + B.len], t0 = segs[B.b0]; if(!tq || !t0 || !tq.p1.screen.scale || !t0.p1.screen.scale) continue;   // one smeared band per front, at its middle
        const qa = tq.p1.screen, q0 = t0.p1.screen, xa = q0.x + X * q0.w, xb = qa.x + X * qa.w, xc = (xa + xb) / 2, w0 = Math.max(PX, Math.min(W * .036, Math.abs(xb - xa) * .24));
        let lit = 0; for(let k = 0; k < B.len; k++) if(B.shop[k]) lit++; const fr = lit / B.len;
        if(B.bar) P(xc, by, uw, .04, B.gh - .14, w0, '#ff8a40', .7); else if(lit){ P(xc, by, uw, .02, B.gh, w0, '#ffa040', .5 + .45 * fr); if(near) P(xc, by, uw, .08, B.gh - .1, w0 * .3, '#ffd890', .3 + .3 * fr); }
        const U = nbWet(B); if(U.fr > 0 && n < 46) P(xc, by, uw, B.gh + B.flh, U.top, w0 * .5, U.col, .1 + .15 * U.fr); } }
    // the cars' tail lights: a longer, hotter copy of roadmat's own (same place), with a white-hot core near by
    if(!NWX.includes('tails')) for(let k = 0; k < cars.length; k++){ const c = cars[k]; if(c.oth || Math.floor(c.z / SEG) !== i) continue; const pct = (c.z % SEG) / SEG, b2 = s.p2.screen, w = uw + (b2.w - uw) * pct, cxp = ax + (b2.x - ax) * pct + c.x * w, cyp = by + (b2.y - by) * pct, cw = w * .36;
      for(let sd = -1; sd <= 1; sd += 2){ const lx = cxp + sd * cw * .36; P(lx, cyp, w, .06, .5, cw * .14, '#ff2a3c', 1.3); if(cw > 30) P(lx, cyp, w, .08, .3, cw * .05, '#ffb0a0', .8); } } }
  // the near road's sky sheen (cool, stepped by the puddle mask) and the cars' dark mirror images
  const WSH = { T:null, c:null, w:0, h:0 }, WCAR = { n:0, x:new Float32Array(64), y:new Float32Array(64), w:new Float32Array(64), d:new Float32Array(64), last:1e9 };
  function sheenStrip(T){ if(WSH.T === T) return WSH.c; WSH.T = T; WSH.c = null; const S = T.c && T.c[1], M = T.m && T.m[1]; if(!S || !M || M.length !== S.width * S.height) return null;
    const w = S.width, h = S.height, [c, k] = canvas(w, h), img = k.createImageData(w, h), d = img.data;
    for(let p = 0; p < w * h; p++){ const m = M[p] / 255, o = p * 4, L = m > .78 ? [96, 136, 220, 200] : m > .5 ? [52, 84, 170, 170] : m > .24 ? [38, 60, 136, 130] : [28, 40, 100, 90]; d[o] = L[0]; d[o + 1] = L[1]; d[o + 2] = L[2]; d[o + 3] = L[3]; }
    k.putImageData(img, 0, 0); WSH.c = c; WSH.w = w; WSH.h = h; return c; }
  function wetFX(s, n, r0, r1, RV, wet, T){ if(n >= WCAR.last) carMirrors(); WCAR.last = n; if(n > 200 || r1 < r0) return; const g = cx, a0 = g.globalAlpha;
    const S = NWX.includes('sheen') ? null : sheenStrip(T); if(S){ g.globalCompositeOperation = NWX.includes('shl') ? 'lighter' : 'lighten';   // (the brighter of the sky and what is there already: a mirror shows the sky or a light, so a column keeps its hue on the blue)
     
      for(let r = r0; r <= r1; r += 3){ const f = RV.f[r], al = wet * .8 * (1 - Math.min(1, Math.max(0, (f - .02) / .36))); if(al < .03) continue; const xm = RV.x[r], ww = RV.w[r], X0 = Math.round((xm - ww) / PX) * PX, X1 = Math.round((xm + ww) / PX) * PX, ax = Math.max(0, X0), bx = Math.min(W, X1); if(bx <= ax) continue;
        const u0 = (ax - X0) / (X1 - X0) * WSH.w, u1 = (bx - X0) / (X1 - X0) * WSH.w; if(u1 - u0 <= 0) continue; g.globalAlpha = Math.min(1, al); g.drawImage(S, u0, ((RV.v[r] / 4) | 0) % WSH.h, u1 - u0, 1, ax, r * PX, bx - ax, PX * Math.min(3, r1 - r + 1)); }
      g.globalCompositeOperation = 'source-over'; }
    // a car's image in the wet: a dark break under it in whatever light lies there (two steps, fading toward the viewer)
    if(WCAR.n){ const ya = r0 * PX, yb = (r1 + 1) * PX; g.fillStyle = '#08060e';
      for(let k = 0; k < WCAR.n; k++){ const y0 = WCAR.y[k], d = WCAR.d[k]; if(y0 >= yb || y0 + d <= ya) continue; const hw = WCAR.w[k] / 2, xl = Math.round((WCAR.x[k] - hw) / PX) * PX, xw = Math.max(PX, Math.round(hw * 2 / PX) * PX), ym = y0 + d * .5;
        for(let h = 0; h < 2; h++){ const p0 = Math.max(ya, h ? ym : y0), p1 = Math.min(yb, h ? y0 + d : ym); if(p1 <= p0) continue; g.globalAlpha = (h ? .28 : .55) * wet; g.fillRect(xl + (h ? PX : 0), Math.round(p0 / PX) * PX, Math.max(PX, xw - (h ? 2 * PX : 0)), Math.max(PX, Math.round((p1 - p0) / PX) * PX)); } } }
    g.globalAlpha = a0; }
  // once a frame (the first, farthest wetFX call): where each car's image lies
  function carMirrors(){ WCAR.n = 0; const b0 = segAt(position).index;
    for(let k = 0; k < cars.length && WCAR.n < 64; k++){ const c = cars[k]; if(c.oth) continue; const s = segs[Math.floor(c.z / SEG)]; if(!s || s.index <= b0 || !s.p1.screen.scale || s.p1.camera.z <= DEPTH) continue;
      const a = s.p1.screen, b = s.p2.screen, pct = (c.z % SEG) / SEG, w = a.w + (b.w - a.w) * pct, cw = w * .36; if(cw < PX * 3) continue; const j = WCAR.n++;
      WCAR.x[j] = a.x + (b.x - a.x) * pct + c.x * w; WCAR.y[j] = a.y + (b.y - a.y) * pct; WCAR.w[j] = cw * .9; WCAR.d[j] = cw * .55; } }
  ENV.neon = {
    warm(){ for(const _ of ENV.neon.warmSteps()); },
    // if the signs' glyphs are already loaded the first build uses them and no second build is needed (it was always built twice)
    *warmSteps(){ let had = false; try{ had = !!document.fonts && document.fonts.check('16px "DotGothic16"', WORDS.join('') + EXTRA); }catch(e){} if(had){ fontOK = true; fontAsked = true; }
      yield* warmAllSteps(); yield* primeSteps(); yield; try{ cx.save(); ENV.neon.backdrop({ hz:H / 2 + 2, now:0 }); cx.restore(); }catch(e){} if(document.fonts && !had){ const go = () => { fontOK = true; fontAsked = true; if(!(window.warmLater && window.warmLater('env.neon.font', function*(){ yield* warmAllSteps(); yield* primeSteps(); }))){ warmAll(); prime(); } try{ cx.save(); ENV.neon.backdrop({ hz:H / 2 + 2, now:0 }); cx.restore(); }catch(e){} };
        // the stylesheet may not have registered the face yet: ask for it until it loads, then rebuild every sign with real characters
        const tryLoad = (n) => document.fonts.load('16px "DotGothic16"', WORDS.join('') + EXTRA).then(fs => { if(fs && fs.length) go(); else if(n > 0) setTimeout(() => tryLoad(n - 1), 300); else go(); }, () => go());
        tryLoad(20); } },
    road: ['#131120', '#161424'],
    lampCol: '#4a2266',
    lit(i){ const d = Math.min(i % 12, 12 - i % 12); return .32 + Math.max(0, 1 - d / 3) * .4; },
    place(i, s){
      const p = i % P, cyc = Math.floor(i / P), plazaSide = cyc % 2 ? 1 : -1, catSide = -plazaSide;
      const plaza = p >= 180 && p < 226, catGap = p >= 418 && p < 456;
      const zebra = p >= 216 && p < 220; if(zebra) s.zeb = true;
      // canyon walls
      // the buildings: one projected slice per segment of each building. The frontage never opens onto nothing (Kellan, 2026-11-19): a building
      // that would reach into the plaza stands back across it (PLZ_X, taller), so the square has its far side; in the cat's gap the street row
      // is one- and two-storey shopfronts with the lucky cat on their roofs (one storey right under it) and tall buildings behind it (CAT_X)
      const back = [], front = [];
      for(const side of [-1, 1]){ const r = nbAt(i, side); if(!r) continue; let zone = 0;
        for(const e of [r.b0, r.b0 + r.len - 1]){ const pe = e % P, ce = Math.floor(e / P), ps = ce % 2 ? 1 : -1; if(pe >= 180 && pe < 226 && side === ps) zone = 1; else if(pe >= 418 && pe < 456 && side === -ps && !zone) zone = 2; }
        if(zone === 1){ const B = nbBuild(side, r, 'tall'); back.push({ env:'neon', type:'nb', x:side * (PLZ_X + (B.v % 3) * .05), k:i, B }); }
        else if(zone === 2){ const B = nbBuild(side, r, 'tall'), pe = r.b0 % P, near = pe + r.len > 432 && pe < 450; back.push({ env:'neon', type:'nb', x:side * (CAT_X + (B.v % 3) * .05), k:i, B });
          const F = nbBuild(side, r, near || hash(r.n * 2.9 + side) < .55 ? 'lo1' : 'lo2'); front.push({ env:'neon', type:'nb', x:side * (1.62 + (F.v % 3) * .03), k:i, B:F }); }
        else { const B = nbBuild(side, r); front.push({ env:'neon', type:'nb', x:side * (1.62 + (B.v % 3) * .03), k:i, B }); } }   // the face stands just behind the blade signs (their outer edge is at 1.61)
      // back rows first, then the cat (it stands in front of the tall row and behind the shopfronts), then the street row
      for(const sp of back) s.sprites.push(sp);
      if(p === 440){ s.sprites.push({ env:'neon', type:'neko', x:catSide * CAT_NX, k:i, lift:.72 }); refl(s, catSide * 1.9, 1.2, 2.5, .14, '#ff6aa8'); }
      for(const sp of front) s.sprites.push(sp);
      for(const side of [-1, 1]){ if((i + (side > 0 ? 2 : 0)) % 4) continue;
        if((plaza && side === plazaSide) || (catGap && side === catSide)){ if(p === 440) continue; const v = (hash(i * 1.37 + side) * 12) | 0; s.sprites.push({ env:'neon', type:'fac', x:side * ((plaza ? PLZ_X : CAT_X) + .4 + hash(i * 3.3) * .12), k:v }); continue; }   // the far LOD of the row standing back
        const v = (hash(i * 1.37 + side) * 12) | 0; s.sprites.push({ env:'neon', type:'fac', x:side * (2.02 + hash(i * 3.3) * .12), k:v });   // far LOD of the canyon (see draw)
        const nb = hash(i * 9.1 + side) < .45 ? 2 : 1;
        for(let b = 0; b < nb; b++){ const bv = (hash(i * 5.3 + side * 7 + b) * 60) | 0, hgt = b ? 2.05 + hash(i + b) * .4 : .95 + hash(i * 2.2 + side) * .5;
          s.sprites.push({ env:'neon', type:'blade', x:side * (1.36 + b * .1), k:bv, h:hgt, fl:hash(bv * 1.7 + i) < .12 });
          refl(s, side * (1.36 + b * .1), .28, hgt + .9, .34, NEON[(bv * 3 + 1) % 5]); }
        refl(s, side * 1.5, .5, .5, .16, '#ffb060'); }
      if(i % 12 === 0) for(const side of [-1, 1]){ s.sprites.push({ env:'neon', type:'lamp', x:side * 1.12 }); refl(s, side * 1.12, .1, 1.05, .32, '#ffe6b0'); }
      if(i % 20 === 8 && !plaza){ const side = hash(i) < .5 ? -1 : 1; s.sprites.push({ env:'neon', type:'vend', x:side * 1.24, k:(hash(i * 3) * 3) | 0 }); refl(s, side * 1.24, .14, .4, .3, '#fff4c0'); }
      { const q = i % 56; if(q >= 30 && q < 30 + YT.len){ const i0 = i - q + 30, p0 = i0 % P; if(!(p0 >= 180 && p0 < 226) && !(p0 >= 418 && p0 < 456)){ const side = (i0 / 56 | 0) % 2 ? 1 : -1;   // the yatai as a projected stall (see drawYatai3)
        s.sprites.push({ env:'neon', type:'yatai3', side, x:side * YT.X, xo:side * YT.X, b0:i0, len:YT.len, k:i }); if(q === 30) refl(s, side * 1.4, .3, .5, .2, '#ffb070'); } } }
      // overhead: gate, lantern strings, the bridge; the elevated railway from the built-in set
      if(p === 80 || p === 400){ s.sprites.push({ env:'neon', type:'gate', x:0, k:i }); refl(s, 0, 2.7, 2.3, .14, '#ff3a4a'); }
      else if(i % 24 === 12 && !(p > 70 && p < 92) && !(p > 390 && p < 412) && !(p > 100 && p < 140) && !(p > 330 && p < 350) && !(p > 200 && p < 240)){ s.sprites.push({ env:'neon', type:'lstr', x:0, k:i }); refl(s, 0, 2.4, 1.9, .08, '#ff8a4a'); }
      if(p === 120 || p === 340){ s.sprites.push({ env:'neon', type:'bridge', x:0, k:i }); refl(s, 0, 2.2, 1.5, .12, '#e8f0ff'); refl(s, 0, 1.4, 1.5, .12, '#ffd04a'); }
      if(p === 300){ s.sprites.push({ env:'neon', type:'train', x:0, k:hash(i) * 3 }); refl(s, 0, 2.4, 2.2, .1, '#e8f0ff'); }
      // the plaza: giant screen tower, crowds waiting at the crossing, signals
      if(p === 228){ s.sprites.push({ env:'neon', type:'jumbo', x:0, k:i }); refl(s, 0, 2.1, 4.2, .2, '#3a7aff'); refl(s, -1.9, .9, 2, .14, '#ffd890'); refl(s, 1.9, .9, 2, .14, '#ffd890'); }
      if(p === 214 || p === 221) for(const side of [-1, 1]){ s.sprites.push({ env:'neon', type:'crowd', x:side * 1.45, k:i + side }); s.sprites.push({ env:'neon', type:'signal', x:side * 1.14, k:i }); }
    },

    draw(sp, x, y, uw, fog, now, sk){ const t = sp.type; if(t === 'nb') return drawNB(sp, x, y, uw, fog, now);
      const flip = sp.x > 0, a = (1 - fog * .7) * (t === 'fac' ? clamp((14 - uw * 1.3 / FW / PX) / 6, 0, 1) : 1);   // facades fade out between 8x and 14x as they pass the camera (no giant slabs at the screen edge)
      if(a <= .02 || x + uw * 6 < 0 || x - uw * 6 > W || y - uw * 6 > H) return;   // off screen (overhead pieces reach 3 half-roads either side; 6 keeps a margin)
      const fr3 = reduce ? 0 : Math.floor(now / 140) % 3;
      if(t === 'fac'){ const farT = clamp((fog - .062) / .016, 0, 1); if(farT <= 0) return; const spr = facade(sp.k), k = uw * 1.3 / FW; cx.globalAlpha = a * farT; blitF(spr, x - (flip ? -1 : 1) * SW * k * .5, y, k, flip); cx.globalAlpha = 1;
        if(fog < .36) pool(x + (flip ? -1 : 1) * uw * .45, y, uw * .5, '#ffc070', .5 * a * Math.min(1, (.36 - fog) / .1)); }
      else if(t === 'blade'){ const k = uw * .3 / 22, sf = scaleFade(k, 5, 8); if(sf <= 0) return; let fr = 0;   // near the camera the sign dissolves before its 2x / 4x art turns to blocks (kodawari audit #22)
        if(sp.fl && !reduce){ const q = hash(sp.k * 3.7 + Math.floor(now / 340)); fr = Math.floor(now / 1700 + sp.k) % 3 === 0 ? (q < .3 ? 2 : q < .4 ? 1 : 0) : 0; }   // a failing tube: one character drops out, now and then the whole sign; never faster than ~3 changes a second
        const spr = blade(sp.k, fr), h = spr.height * k, yb = y - uw * sp.h, col = bladeCol(sp.k), on = fr !== 1;
        if(uw > 24){ cx.globalAlpha = sf; cx.fillStyle = '#16121c'; cx.fillRect(x + (flip ? 1 : -1) * uw * .16 - (flip ? uw * .1 : 0), yb - h * .85, uw * .1 + 1, Math.max(1, uw * .02)); cx.fillRect(x + (flip ? 1 : -1) * uw * .16 - (flip ? uw * .1 : 0), yb - h * .15, uw * .1 + 1, Math.max(1, uw * .02)); cx.globalAlpha = 1; }
        if(on && fog < .5){ glow(x, yb - h / 2, Math.max(h * .9, uw * .4), col, (fr === 2 ? .2 : .32) * a * sf * Math.min(1, (.5 - fog) / .12)); }
        cx.globalAlpha = a * sf; blitT(spr, x, yb, k); cx.globalAlpha = 1; }
      else if(t === 'lamp'){ const spr = lampS(), k = uw * 1.0 / 50, sf = scaleFade(k, 6, 10); if(sf <= 0) return; cx.globalAlpha = a * sf; blitF(spr, x, y, k, flip); cx.globalAlpha = 1;
        const gx = x + (flip ? -1 : 1) * 3.5 * k, gy = y - 41.5 * k; glow(gx, gy, uw * .3, '#ffd8a0', .55 * a); if(fog < .6) pool(gx, y, uw * .35, '#ffd8a0', .6 * a * Math.min(1, (.6 - fog) / .12)); }
      else if(t === 'vend'){ const k = uw * .24 / 12, R = k >= PX * 8 ? 8 : k >= PX * 4 ? 4 : k >= PX * 2 ? 2 : 1, sf = scaleFade(k, 14, 20);   // (near by: the 2x / 4x / 8x art, a fine pixel never under one canvas pixel; past the 8x art's reach, 1.75-2.5 canvas px a pixel, it dissolves: kodawari audit #22)
      pool(x, y, uw * .3, '#fff0c0', .8 * a); if(sf <= 0) return; cx.globalAlpha = a * sf; blitF(R > 1 ? vendHi(sp.k, R) : vend(sp.k), x, y, k / R, false); cx.globalAlpha = 1; glow(x, y - 12 * k, uw * .32, '#fff4d0', .3 * a * sf); }
      else if(t === 'yatai3') return drawYatai3(sp, x, y, uw, fog, now);
      else if(t === 'yatai'){ const k = uw * .62 / 32, sf = scaleFade(k, 6, 10); pool(x, y, uw * .5, '#ffb070', .8 * a); if(sf <= 0) return; cx.globalAlpha = a * sf; blitF(yatai(), x, y, k, flip); cx.globalAlpha = 1;
        glow(x + (flip ? 1 : -1) * 14.5 * k, y - 16 * k, uw * .22, '#ff6a4a', .45 * a); glow(x, y - 14 * k, uw * .4, '#ffcf80', .3 * a);
        if(fog < .6){ const px0 = x + (flip ? -1 : 1) * 5 * k, py0 = y - 15 * k; for(let i = 0; i < 7; i++){ const ph = reduce ? i / 7 : ((now / 1600 + i / 7) % 1), s = Math.max(PX, Math.round(k * (2 + ph * 3) / PX) * PX);
          cx.fillStyle = `rgba(255,${200 - ph * 60 | 0},${200 + ph * 40 | 0},${(.42 * (1 - ph)) * a})`; cx.fillRect(Math.round((px0 + Math.sin(ph * 5 + i) * k * 3 * ph) / PX) * PX, Math.round((py0 - ph * 26 * k) / PX) * PX, s, s); } } }
      else if(t === 'gate'){ const k = uw * 2.9 / GW; cx.globalAlpha = a; blitF(gate(fr3), x, y, k, false); cx.globalAlpha = 1;
        glow(x, y - (GH - 20) * k, uw * 1.6, '#ff3a4a', .3 * a); glow(x, y - (GH - 20) * k, uw * .8, '#fff0e8', .18 * a); pool(x, y, uw * 1.4, '#ff4a5a', .35 * a); }
      else if(t === 'lstr'){ const x0 = x - uw * 1.55, x1 = x + uw * 1.55, ya = y - uw * 1.95, sag = uw * .38, n = 9, st = Math.max(PX, Math.round(uw * .04 / PX) * PX);
        cx.fillStyle = mixc('#0c0812', sk.low, fog * .5); const nq = uw > 60 ? 24 : 10; for(let q = 0; q <= nq; q++){ const tt = q / nq; cx.fillRect(Math.round((x0 + (x1 - x0) * tt) / PX) * PX, Math.round((ya + sag * 4 * tt * (1 - tt)) / PX) * PX, Math.ceil((x1 - x0) / nq / PX + 1) * PX, Math.max(PX, st / 2)); }
        const k = uw * .19 / 8, sw = reduce ? 0 : Math.sin(now / 600 + sp.k) * uw * .01;
        cx.globalAlpha = a; for(let j = 0; j < n; j++){ const tt = (j + .5) / n, lx = x0 + (x1 - x0) * tt + sw, ly = ya + sag * 4 * tt * (1 - tt) + 10 * k; blitF(lantern(j % 3 === 1 ? 1 : 0), lx, ly, k, false);
          if(fog < .3) glow(lx, ly - 5 * k, uw * .14, j % 3 === 1 ? '#fff0d0' : '#ff7a4a', .4 * a * Math.min(1, (.3 - fog) / .08)); } cx.globalAlpha = 1; }
      else if(t === 'bridge'){ const k = uw * 4.4 / BW, spr = bridgeS(); glow(x, y - 64 * k, uw * 1.2, '#ffd04a', .18 * a); cx.globalAlpha = a; blitF(spr, x, y, k, false);
        // walkers cross on the deck in both directions, by themselves
        if(fog < .8){ const deck = y - 86 * k, wk = k * 2; for(let j = 0; j < 7; j++){ const dir = j % 2 ? 1 : -1, sp0 = .035 + hash(j * 3.3) * .03, u = ((reduce ? hash(j) : now / 1000 * sp0 + hash(j * 7.7)) % 1), wx = x + (dir > 0 ? u * 2 - 1 : 1 - u * 2) * uw * 2;
          blitF(walker(reduce ? 0 : Math.floor(now / 180 + j) % 2), wx, deck, wk, false); cx.fillStyle = j % 3 ? '#4ff0ff' : '#ff3b8a'; cx.fillRect(Math.round(wx + (dir > 0 ? -2 : 1) * wk), Math.round(deck - 7 * wk), Math.max(1, wk), 3 * wk); } }
        cx.globalAlpha = 1; glow(x, y - 63 * k, uw * .9, '#e8f0ff', .14 * a); pool(x, y, uw * 1.8, '#c8d8ff', .18 * a); }
      else if(t === 'jumbo'){ const k = uw * 5.4 / JW, spr = jumbo(), left = x - JW * k / 2, topY = y - JH * k, f = reduce ? 6 : Math.floor(now / 120) % 44, fi = f < 32 ? f : 32;
        cx.globalAlpha = a; if(k > PX * (ENV.neon.jbGeo || 1.3)) jumboGeo(Math.round(x - JW * k / 2), Math.round(y - JH * k), k); else blitF(spr, x, y, k, false);
        cx.imageSmoothingEnabled = false; cx.drawImage(screenFrame(fi), Math.round(left + SX * k), Math.round(topY + SY * k), Math.ceil(SW2 * k), Math.ceil(SH2 * k)); jumboLED(Math.round(left + SX * k), Math.round(topY + SY * k), Math.ceil(SW2 * k), Math.ceil(SH2 * k), k);
        // a dot-matrix ticker under the screen
        const tick = tickS(), tw = SW2 + 6, tx = reduce ? 0 : Math.floor(now / 50) % (tick.width - tw); cx.drawImage(tick, tx, 2, tw, 12, Math.round(left + (SX - 3) * k), Math.round(topY + (SY + SH2 + 9) * k), tw * k, 5 * k);
        cx.globalAlpha = 1; const sc = fi === 32 ? '#ff2a4a' : '#2a6aff'; glow(x, topY + (SY + SH2 / 2) * k, uw * 3.2, sc, .22 * a); glow(x, topY + (SY + SH2 / 2) * k, uw * 1.6, sc, .16 * a);
        glow(x, y - 60 * k, uw * 1.3, '#e8f0ff', .14 * a); pool(x - uw * 1.9, y, uw * .8, '#ffd890', .5 * a); pool(x + uw * 1.9, y, uw * .8, '#ffd890', .5 * a); }
      else if(t === 'neko'){ const k = uw * 2.9 / 62, y0 = y; if(sp.lift){ y -= uw * sp.lift; const pw = Math.max(PX, snap(uw * .07)); cx.globalAlpha = a; cx.fillStyle = mixc('#1c1826', sk.low, fog * .5);   // on the shopfronts' roofs: its steel frame down behind them
          for(const q of [-.7, .7]) pxRect(x + uw * q - pw / 2, y, pw, y0 - y); pxRect(x - uw * .75, y + uw * .3, uw * 1.5, Math.max(PX, uw * .05)); cx.globalAlpha = 1; }
        const base = y - 22 * k, wave = reduce ? 0 : Math.sin(now / 240 + sp.k) , ph = flip ? -1 : 1;
        glow(x, base - 22 * k, uw * 2.1, '#ff3b8a', .2 * a); glow(x - 8 * k, y - 4 * k, uw * .5, '#ffd890', .4 * a); glow(x + 8 * k, y - 4 * k, uw * .5, '#ffd890', .4 * a);
        cx.globalAlpha = a; blitT(plinth(), x, y, k); blitT(neko(), x, base, k);
        blitT(paw(), x - 12.5 * k + wave * .8 * k, base - 21 * k - Math.max(0, wave) * 2.5 * k, k); cx.globalAlpha = 1; pool(x, y0, uw * 1.2, '#ff8ab8', .4 * a); }
      else if(t === 'train'){ const dy = y - uw * 2.3, span = uw * 9, th = Math.max(PX, uw * .26), st = mixc('#1c1826', sk.low, fog * .5);
        cx.globalAlpha = a; cx.fillStyle = st; for(const px of [-1.75, 1.6]){ cx.fillRect(x + uw * px, dy, uw * .15 + 1, y - dy); cx.fillStyle = '#3a3448'; cx.fillRect(x + uw * px + uw * .11, dy, Math.max(1, uw * .04), y - dy); cx.fillStyle = st; }
        cx.fillRect(x - span, dy, span * 2, th); cx.fillStyle = '#4a4458'; cx.fillRect(x - span, dy, span * 2, Math.max(PX, uw * .025)); cx.fillStyle = '#0c0a12'; cx.fillRect(x - span, dy + th * .55, span * 2, Math.max(1, uw * .02));
        cx.fillStyle = '#2a2436'; if(uw > 30) for(let q = -span; q < span; q += uw * .3) cx.fillRect(x + q, dy + th * .2, Math.max(1, uw * .02), th * .3);
        cx.fillStyle = '#e8f0ff'; for(let q = -span + uw * .25; q < span; q += uw * .8) cx.fillRect(x + q, dy + th, uw * .12, Math.max(PX, uw * .025));
        const ck = uw * 1.3 / 64, tx = x + ((reduce ? .4 : now / 1000 * .3 + sp.k) % 2 - 1) * span * 1.4;
        for(let c2 = 0; c2 < 5; c2++){ const cxl = tx + c2 * 64 * ck; blitF(trainCar(c2), cxl, dy, ck, false); }
        cx.globalAlpha = 1; glow(tx + 2 * 64 * ck, dy - 10 * ck, uw * 3, '#ffe6b0', .18 * a);
        if(!reduce && hash(Math.floor(now / 260)) > .86){ const sx = tx + (1 + ((now / 1040) | 0) % 4) * 64 * ck - 40 * ck; glow(sx, dy - 20 * ck, uw * .35, '#b8f0ff', .45 * a); cx.fillStyle = '#ffffff'; cx.fillRect(sx, dy - 20 * ck, Math.max(PX, ck * 2), Math.max(PX, ck * 2)); }
        glow(x, dy + th, uw * 1.8, '#c8d8ff', .1 * a); }
      else if(t === 'crowd'){ const k = uw * .95 / 48, sf = scaleFade(k, 6, 10); if(sf <= 0) return; cx.globalAlpha = a * sf; blitF(crowd(reduce ? 0 : Math.floor(now / 400 + sp.k) % 2), x, y, k, flip); cx.globalAlpha = 1; }
      else if(t === 'signal'){ const h = uw * .62, w = uw * .06, walk = reduce ? true : Math.floor(now / 2500 + sp.k) % 2 === 0, blink = walk && !reduce && Math.floor(now / 2500 * 4) % 4 === 3 && Math.floor(now / 300) % 2;
        cx.fillStyle = '#1c1826'; cx.fillRect(x - uw * .01, y - h, uw * .02 + 1, h); cx.fillStyle = OUT; cx.fillRect(x - w, y - h - w * 2.4, w * 2, w * 2.4);
        const col = walk ? (blink ? '#0a2a1a' : '#3aff9a') : '#ff3a3a'; cx.fillStyle = col; cx.fillRect(x - w * .6, y - h - (walk ? w * 1.1 : w * 2.1), w * 1.2, w * .9); if(!blink) glow(x, y - h - w * 1.2, uw * .18, col, .45 * a); }
    },

    roadFX(s, a, b, fog, f, now){
      // A segment whose band rounds to zero height is skipped by the road loop, and far away that flips from frame to frame; catching up
      // the skipped segments' lights here keeps far reflections from popping on and off. Segments hidden behind a crest stay hidden.
      if(s.zeb && fog <= .88){ const zc = f('#bdb6cc'); for(let q = 0; q < 9; q++){ const x0 = -.9 + q * .2, x1 = x0 + .11; poly(a.x + a.w * x0, a.y, a.x + a.w * x1, a.y, b.x + b.w * x1, b.y, b.x + b.w * x0, b.y, zc); } }
      // a new frame resets the catch-up. (Inside a fork's window the engine calls roadFX twice per segment, once per branch: the second call
      // used to look like a new frame, reset to the camera and re-reflect every segment so far, per segment: 20-40 ms frames on Neon Ward.)
      const base = segAt(position).index; if(now !== RS.now || s.index < RS.last){ RS.now = now; RS.last = base; RS.lastB = H; rbReset(); }
      // 'screen', not additive: on the dark asphalt it lays a streak down almost exactly as 'lighter' did (the look is unchanged), but where
      // streaks cross each other or a sign's light pool it approaches the colour instead of summing past it, so pink + cyan + gold never
      // burn to white (research/sundown-craft/chase_clean.md, "Neon's own reflections": clipped road pixels 1.75% -> 0.31%)
      if(!RMN() && (s.nr || s.index - RS.last > 1)){ cx.globalCompositeOperation = 'screen';   // (while roadmat's pools are on they replace these streaks: wetSrc above)
        for(let i = RS.last + 1; i < s.index; i++){ const q = segs[i]; if(!q || !q.nr || q.p1.camera.z <= DEPTH || q.p1.screen.y > RS.lastB + PX) continue;
          reflect(q, q.p1.screen, 0, clamp(Math.pow((i - base) / DRAW, 1.6), 0, 1), now, base); }
        if(s.nr && fog <= .88) reflect(s, a, a.y - b.y, fog, now, base); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
      RS.last = s.index; RS.lastB = b.y; },

    /* far scenery: a city glow on the horizon, two cached skyline strips (far towers; nearer towers crowned with billboards and stacked
       sign columns), blinking beacons, live billboard glows, and an advertising blimp with a scrolling dot-matrix ticker */
    wetSrc, wetFX,

    backdrop(o){ const { hz, now } = o, cw = cx.canvas.width, ch = cx.canvas.height, hzc = Math.round(hz / PX), ga = cx.globalAlpha;
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false;
      // stepped, dithered city glow
      const gh = Math.round(ch * .3), glowC = cache('cg' + cw + 'x' + gh, () => { const [c, k] = canvas(cw, gh), img = k.createImageData(cw, gh), d = img.data;
        for(let y = 0; y < gh; y++){ const v = y / gh; for(let x = 0; x < cw; x++){ const q = Math.floor(v * v * 5 + B4(x, y)) / 5, o2 = (y * cw + x) * 4; d[o2] = 150 * q; d[o2 + 1] = 24 * q; d[o2 + 2] = 110 * q; d[o2 + 3] = 255; } }
        k.putImageData(img, 0, 0); return c; });
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = ga * .55; cx.drawImage(glowC, 0, hzc - gh); cx.globalAlpha = ga; cx.globalCompositeOperation = 'source-over';
      // the blimp, high and slow, behind the towers
      const by = Math.round(hzc - ch * .36), bx = Math.round(((now / 90 - skyPar('far') / PX) % (cw + 120) + cw + 120) % (cw + 120) - 60);
      const blimp = cache('blimp', () => { const [c, k] = canvas(56, 18), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
        R(6, 2, 44, 12, '#2a2638'); R(3, 4, 50, 8, '#2a2638'); R(8, 1, 40, 1, '#4a4660'); R(4, 4, 48, 1, '#5a5674'); R(6, 13, 44, 1, '#16141e'); R(48, 0, 6, 5, '#2a2638'); R(48, 11, 6, 5, '#2a2638'); R(22, 14, 10, 3, '#1c1a26'); R(9, 5, 36, 6, OUT); return c; });
      cx.drawImage(blimp, bx, by); const tick = tickS();
      const tx = reduce ? 0 : Math.floor(now / 60) % tick.width; cx.drawImage(tick, tx, 3, Math.min(36, tick.width - tx), 10, bx + 9, by + 5, Math.min(36, tick.width - tx), 6);
      if(Math.floor(now / 600) % 2 || reduce){ cx.fillStyle = '#ff3030'; cx.fillRect(bx + 3, by + 7, 1, 1); }
      // skyline strips
      const strip = (key, tw, th, gen) => cache(key + th, () => { const [c, k] = canvas(tw, th); gen(k, tw, th); return c; });
      const fh = Math.round(ch * .26), far = strip('far', 360, fh, (k, tw, th) => { const r = rng(311), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
        for(let x = 0; x < tw;){ const w = 10 + ((r() * 18) | 0), h = Math.round(th * (.3 + r() * .7)), y = th - h; R(x, y, w, h, '#170e28'); R(x, y, w, 1, '#2c1c48'); R(x + w - 1, y, 1, h, '#22163a');
          for(let yy = y + 3; yy < th - 2; yy += 3) for(let xx = x + 2; xx < x + w - 2; xx += 3) if(r() < .18) R(xx, yy, 1, 1, r() < .7 ? '#4a2a5a' : '#8a6a6a');
          if(r() < .3){ const nc = r() < .5 ? '#7a1e58' : '#1e6a7a'; R(x + 2, y + 3, 1, Math.min(h - 6, 20), nc); }
          if(r() < .35) R(x + (w >> 1), y - 4, 1, 4, '#170e28'); x += w + ((r() * 3) | 0) - 1; } });
      const mh = Math.round(ch * .22), mid = strip('mid' + (fontReady() ? 1 : 0), 420, mh, (k, tw, th) => { const r = rng(977), R = (x, y, w, h, cc) => { k.fillStyle = cc; k.fillRect(x, y, w, h); };
        for(let x = 0; x < tw;){ const w = 18 + ((r() * 24) | 0), h = Math.round(th * (.35 + r() * .5)), y = th - h; R(x, y, w, h, '#0d0818'); R(x, y, w, 1, '#24183a'); R(x, y, 1, h, '#1c1230');
          for(let yy = y + 4; yy < th - 3; yy += 4) for(let xx = x + 2; xx < x + w - 2; xx += 3) if(r() < .22) R(xx, yy, 2, 2, r() < .6 ? '#b0784a' : r() < .5 ? '#ffd08a' : '#4a7aa0');
          // a rooftop billboard on legs
          if(r() < .6 && w > 20){ const bw = Math.min(w - 2, 18 + ((r() * 14) | 0)), bh = 8 + ((r() * 5) | 0), bxx = x + 1, byy = y - bh - 3, col = ['#f4ecf0', '#e8203a', '#ffd04a', '#4ff0ff', '#ff3b8a'][(r() * 5) | 0];
            R(bxx + 2, byy + bh, 1, 3, '#2a2436'); R(bxx + bw - 3, byy + bh, 1, 3, '#2a2436'); R(bxx - 1, byy - 1, bw + 2, bh + 2, OUT); R(bxx, byy, bw, bh, col); R(bxx, byy, bw, 1, lighten(col, .5)); pseudo(k, bxx + 2, byy + 2, bw - 3, bh - 4, darken(col, .8), r); }
          // a column of stacked signs down one side
          if(r() < .55){ const sx = x + w - 6; for(let yy = y + 2; yy < th - 6; yy += 7){ const col = NEON[(r() * 5) | 0]; R(sx, yy, 5, 6, OUT); R(sx + 1, yy + 1, 3, 4, col); R(sx + 2, yy + 2, 1, 2, lighten(col, .6)); } }
          x += w + ((r() * 4) | 0); } });
      const tile = (img, off, y) => { const w = img.width, o2 = ((Math.round(off) % w) + w) % w; for(let x = -o2; x < cw; x += w) cx.drawImage(img, x, y); };
      tile(far, skyPar('mid') / PX, hzc - fh + 1);
      // beacons on the far towers
      if(!reduce && Math.floor(now / 700) % 2 === 0){ cx.fillStyle = '#ff3030'; for(let i = 0; i < 5; i++){ const x = Math.round(((i * 97 + 30 - skyPar('mid') / PX) % cw + cw) % cw); cx.fillRect(x, hzc - Math.round(fh * (.8 + hash(i) * .15)), 1, 1); } }
      tile(mid, skyPar('near') / PX + 200, hzc - mh + 2);
      // bright billboard glows over the near strip
      cx.globalCompositeOperation = 'lighter'; for(let i = 0; i < 6; i++){ const x = ((i * 71 + 20 - (skyPar('near') / PX + 200)) % cw + cw) % cw, col = NEON[i % 5], [R, G, B] = rgb(col), al = .07 * (reduce ? 1 : .8 + .2 * Math.sin(now / 400 + i));
        cx.fillStyle = `rgba(${R},${G},${B},${al})`; cx.fillRect(Math.round(x - 14), hzc - Math.round(mh * .9), 28, Math.round(mh * .9)); cx.fillRect(Math.round(x - 7), hzc - Math.round(mh * .7), 14, Math.round(mh * .7)); }
      cx.globalCompositeOperation = 'source-over'; cx.restore(); return false; },

    // screen grade: a cool violet multiply, a stepped magenta haze at the top, drizzle that catches the neon
    overlay(al, now){ cx.globalCompositeOperation = 'multiply'; cx.fillStyle = `rgba(214,196,255,${.5 * al})`; cx.fillRect(0, 0, W, H);
      cx.globalCompositeOperation = 'lighter'; for(let q = 0; q < 9; q += 3){ const a0 = HAZE_B[q], a1 = HAZE_B[q + 1], m = HAZE_B[q + 2]; cx.fillStyle = `rgba(255,40,140,${m * al})`; cx.fillRect(0, H * a0, W, H * (a1 - a0) + 1); }
      cx.fillStyle = `rgba(60,220,255,${.025 * al})`; cx.fillRect(0, H * .86, W, H * .14);
      if(!reduce){ for(let i = 0; i < 80; i++){ const y = (hash(i * 2.3) * H + now * (.55 + hash(i * 5.1) * .3)) % H, x = ((hash(i) * W * 1.1 - y * .06) % W + W) % W, c = i % 5 === 0 ? '255,90,170' : i % 7 === 0 ? '90,230,255' : '200,190,255';
        cx.fillStyle = `rgba(${c},${.32 * al})`; cx.fillRect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, PX, PX * 3); } }
      cx.globalCompositeOperation = 'source-over'; }
  };
})();

// where this road's barrier is drawn, for the collider (half-road widths)
ENV.neon.barrier = 1.15;
