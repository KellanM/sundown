/* Sundown: Akihabara's animated adverts (ENV.akibaAds). Six looping pixel animations for the street's screens, each an invented brand with
   one luminous idea on deep black, ending on its tag card. Study, references and practice log: research/sundown-craft/akiba-ads.md.

   Rules taken from the references (nothing copied; every brand and mark is invented, no people):
   - Cross Shinjuku Vision's cat: one subject at the largest scale the screen allows, on an empty field; the brand small or last.
   - Shibuya's screens at pixel zoom: light clips to a white core with a saturated rim and a haze step, so every ramp ends in a near-white.
   - Kirokaze's loops: holds are long frames (repeated cells here, free in the atlas); a low-chroma base, the colour spent in one place.
   - 1041uuu (pixivision interview): co-prime cycles inside one loop so the repeat never shows; light built up from white squares.
   - 80s Japanese TV spots: a product gleam, then a hard cut to the logo card. The loop's seam hides in that cut.

   API (all frames are pre-rendered at warm-up into one atlas; nothing allocates after it):
     ENV.akibaAds.list               [{ id, w, h, frames, fps, title, brand, slot }]
     ENV.akibaAds.frame(id, t)       t in ms -> a frame record { c, x, y, w, h } (c: the atlas canvas; draw c's (x, y, w, h) rect), or null
                                     before warm-up. The record is preallocated per frame: hold it, don't mutate it.
     ENV.akibaAds.draw(k, id, t, sx, sy, sw, sh, px)   paints the frame into context k at (sx, sy, sw x sh), edges on the px grid, with
                                     the LED grid fading in from 2 to 3 screen pixels per LED (Neon Ward's koi screen rule) and the refresh roll.
     ENV.akibaAds.warmSteps()        a generator, one frame per step (well under 8 ms each); warm() runs it through.
   Every frame is painted into an index buffer (palette discipline, a free greyscale check), then written to the atlas with the display
   treatment: odd rows darkened (the koi screen's scanlines) and one glitch frame per loop (a torn band, the red channel slipped a pixel). */
(function(){ 'use strict';
  const E = window.ENV || (window.ENV = {});
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k, TAU = Math.PI * 2;
  const eOut = k => 1 - (1 - k) * (1 - k) * (1 - k), eIn = k => k * k, step = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
  const hsh = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dz = (x, y, v) => v * 16 > BAY[((y & 3) << 2) | (x & 3)] + .5;   // ordered dither: true where coverage v reaches this pixel

  // ---------------------------------------------------------------- the index buffer every frame is painted into
  let D = null, W = 0, H = 0, M = null;   // D: palette indices; M: a scratch mask (halos, kanji rims)
  const P = (x, y, c) => { x = Math.round(x); y = Math.round(y); if(x >= 0 && y >= 0 && x < W && y < H) D[y * W + x] = c; };
  const Pi = (x, y, c) => { if(x >= 0 && y >= 0 && x < W && y < H) D[y * W + x] = c; };   // (integer coordinates)
  const G = (x, y) => x >= 0 && y >= 0 && x < W && y < H ? D[y * W + x] : -1;
  const RF = (x, y, w, h, c) => { for(let j = Math.max(0, y); j < Math.min(H, y + h); j++) for(let i = Math.max(0, x); i < Math.min(W, x + w); i++) D[j * W + i] = c; };
  function LN(x0, y0, x1, y1, c){ x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
    for(;;){ Pi(x0, y0, c); if((x0 === x1 && y0 === y1) || ++n > 400) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } }
  // an ellipse outline, the part where pred(angle) holds (a back half, a front half)
  function ELL(cx, cy, rx, ry, c, a0 = 0, a1 = TAU){ const n = Math.max(12, Math.ceil((rx + ry) * 4)); for(let i = 0; i <= n; i++){ const a = a0 + (a1 - a0) * i / n; P(cx + Math.cos(a) * rx - .5, cy + Math.sin(a) * ry - .5, c); } }
  // a halo: ink pixels next to a masked pixel take the haze colour (dithered at density v)
  function halo(haze, v, r = 1, under = 0){ for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const o = y * W + x; if(M[o] || D[o] !== under || !dz(x, y, v)) continue; let hit = 0;
    for(let j = -r; j <= r && !hit; j++) for(let i = -r; i <= r; i++){ const X = x + i, Y = y + j; if(X >= 0 && Y >= 0 && X < W && Y < H && M[Y * W + X] === 1){ hit = 1; break; } } if(hit) D[o] = haze; } }

  // ---------------------------------------------------------------- type: DotGothic16 on its own 16 px grid, and a 3 x 5 latin
  let SC = null, SX = null; const KM = {}; let FONT = false; const fontOK = () => !document.fonts || !document.fonts.check || document.fonts.check('16px DotGothic16');
  function kmask(ch){ if(KM[ch]) return KM[ch]; if(!SC){ SC = document.createElement('canvas'); SC.width = SC.height = 24; SX = SC.getContext('2d', { willReadFrequently:true }); }
    SX.clearRect(0, 0, 24, 24); SX.font = '16px DotGothic16, "MS Gothic", monospace'; SX.textBaseline = 'top'; SX.fillStyle = '#fff'; SX.fillText(ch, 2, 2);
    const d = SX.getImageData(0, 0, 24, 24).data, m = new Uint8Array(576); let x0 = 24, y0 = 24, x1 = -1, y1 = -1;
    for(let p = 0; p < 576; p++) if(d[p * 4 + 3] > 110){ m[p] = 1; const x = p % 24, y = (p / 24) | 0; if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
    return KM[ch] = x1 < 0 ? { m, x0:0, y0:0, w:16, h:16 } : { m, x0, y0, w:x1 - x0 + 1, h:y1 - y0 + 1 }; }
  // a kanji at zoom z: its core, a rim r px round it, a keyline outside that (each -1 for none); returns its width. pick(i, j) can skip pixels.
  // (z < 0: thin strokes at -z, each dot at its grid point joined to its neighbours by one-pixel lines, so a dense glyph keeps its counters)
  function kanji(ch, x, y, z, core, rim = -1, key = -1, pick = null){ const K = kmask(ch); M.fill(0); const mk = (X, Y) => { if(X >= 0 && Y >= 0 && X < W && Y < H && (!pick || pick(X, Y))) M[Y * W + X] = 1; };
    const on = (i, j) => i >= 0 && j >= 0 && i < K.w && j < K.h && K.m[(j + K.y0) * 24 + i + K.x0] === 1;
    if(z < 0){ const Z = -z; for(let j = 0; j < K.h; j++) for(let i = 0; i < K.w; i++) if(on(i, j)){ const X = x + i * Z, Y = y + j * Z; mk(X, Y);
        if(on(i + 1, j)) for(let a = 1; a < Z; a++) mk(X + a, Y); if(on(i, j + 1)) for(let a = 1; a < Z; a++) mk(X, Y + a);
        if(on(i + 1, j + 1) && !on(i + 1, j) && !on(i, j + 1)) mk(X + 1, Y + 1); if(on(i - 1, j + 1) && !on(i - 1, j) && !on(i, j + 1)) mk(X - 1, Y + 1); } z = Z; }
    else for(let j = 0; j < K.h; j++) for(let i = 0; i < K.w; i++) if(on(i, j)) for(let b = 0; b < z; b++) for(let a = 0; a < z; a++) mk(x + i * z + a, y + j * z + b);
    const ring = (r, c) => { for(let Y = Math.max(0, y - r); Y < Math.min(H, y + K.h * z + r); Y++) for(let X = Math.max(0, x - r); X < Math.min(W, x + K.w * z + r); X++){ if(M[Y * W + X]) continue; let hit = 0;
      for(let b = -r; b <= r && !hit; b++) for(let a = -r; a <= r; a++){ const xx = X + a, yy = Y + b; if(xx >= 0 && yy >= 0 && xx < W && yy < H && M[yy * W + xx] === 1){ hit = 1; break; } } if(hit) D[Y * W + X] = c; } };
    if(key >= 0) ring(rim >= 0 ? 2 : 1, key); if(rim >= 0) ring(1, rim); for(let p = 0; p < W * H; p++) if(M[p] === 1) D[p] = core; return K.w * z; }
  const kw = (ch, z) => z < 0 ? (kmask(ch).w - 1) * -z + 1 : kmask(ch).w * z, kh = (ch, z) => z < 0 ? (kmask(ch).h - 1) * -z + 1 : kmask(ch).h * z;
  // the kanji's pixels as offsets (for points that fly into it)
  function kpts(ch, z){ const K = kmask(ch), out = []; for(let j = 0; j < K.h * z; j++) for(let i = 0; i < K.w * z; i++) if(K.m[(((j / z) | 0) + K.y0) * 24 + ((i / z) | 0) + K.x0]) out.push(i, j); return out; }
  const F3 = { A:'.#.|#.#|###|#.#|#.#', B:'##.|#.#|##.|#.#|##.', C:'.##|#..|#..|#..|.##', D:'##.|#.#|#.#|#.#|##.', E:'###|#..|##.|#..|###', F:'###|#..|##.|#..|#..', G:'.##|#..|#.#|#.#|.##',
    H:'#.#|#.#|###|#.#|#.#', I:'###|.#.|.#.|.#.|###', J:'..#|..#|..#|#.#|.#.', K:'#.#|#.#|##.|#.#|#.#', L:'#..|#..|#..|#..|###', M:'#...#|##.##|#.#.#|#...#|#...#', N:'#..#|##.#|#.##|#..#|#..#',
    O:'.#.|#.#|#.#|#.#|.#.', P:'##.|#.#|##.|#..|#..', R:'##.|#.#|##.|#.#|#.#', S:'.##|#..|.#.|..#|##.', T:'###|.#.|.#.|.#.|.#.', U:'#.#|#.#|#.#|#.#|###', V:'#.#|#.#|#.#|#.#|.#.',
    W:'#...#|#...#|#.#.#|##.##|#...#', X:'#.#|#.#|.#.|#.#|#.#', Y:'#.#|#.#|.#.|.#.|.#.', Z:'###|..#|.#.|#..|###', ' ':'.|.|.|.|.', '-':'..|..|##|..|..', '.':'.|.|.|.|#' };
  const F3R = {}; for(const k in F3) F3R[k] = F3[k].split('|');
  const tw = s => { let w = -1; for(const ch of s) w += (F3R[ch] || F3R[' '])[0].length + 1; return w; };
  function txt(s, x, y, c, sp = 1){ for(const ch of s){ const g = F3R[ch] || F3R[' ']; for(let j = 0; j < 5; j++) for(let i = 0; i < g[j].length; i++) if(g[j][i] === '#') Pi(x + i, y + j, c); x += g[0].length + sp; } return x; }

  /* ================================================================ 1. 鯨網 KUJIRA DATA: a humpback made of light (64 x 40, 48 frames at 8 fps)
     A wireframe whale: stringers along the body and ribs across it, nodes where they cross, pulses of data running head to tail along
     each stringer, a faint glass between. 0-9 it materialises out of points between dark towers (the pattern stuck to the body); 0-31 it
     glides left, the camera trailing (the towers drift right, near faster than far); a 16-frame tail beat in a 48-frame loop, one big
     stroke at 18-25 that sheds sparks; 32-34 it dissolves upward; 35-37 the points fly into 鯨; 38 the flash; 39-47 the card. */
  const WP = [[0, 1.6], [.04, 3.2], [.1, 4.7], [.2, 6.2], [.32, 6.7], [.45, 6.1], [.6, 4.8], [.74, 3.1], [.85, 1.8], [.93, 1.1], [1, .9]];
  const prof = u => { for(let i = 1; i < WP.length; i++) if(u <= WP[i][0]){ const a = WP[i - 1], b = WP[i]; return lerp(a[1], b[1], (u - a[0]) / (b[0] - a[0])); } return .9; };
  const wv = a => { const s = Math.sin(a); return Math.sign(s) * Math.pow(Math.abs(s), .65); };   // a beat that snaps through the middle
  const WFAR = []; { let x = -10, i = 0; while(x < 80){ const w = 4 + Math.floor(hsh(i, 1) * 5), t = 9 + Math.floor(hsh(i, 2) * 15); WFAR.push(x, w, t, hsh(i, 3) < .35 ? 1 : 0); x += w + (hsh(i, 4) < .3 ? 2 : 0); i++; } }
  const WL = 40, whx = f => 36 - f * .95, wcy = f => 18 + Math.sin(f / 48 * TAU) * 1.2 - f * .04;
  function whaleScene(f, card){
    for(let y = 0; y < H; y++){ const v = Math.pow(step(8, 40, y), 1.3) * .75; for(let x = 0; x < W; x++) if(dz(x, y, v)) D[y * W + x] = 1; }
    if(card) return;
    const fx = (f / 12) | 0, nx = (f / 7) | 0;
    for(let i = 0; i < WFAR.length; i += 4){ const x = WFAR[i] + fx, w = WFAR[i + 1], t = WFAR[i + 2]; RF(x, t, w, H - t, 1); if(WFAR[i + 3]) LN(x + (w >> 1), t - 3, x + (w >> 1), t - 1, 1);
      for(let y = t + 2; y < H - 6; y += 3) for(let xx = x + 1; xx < x + w - 1; xx += 2) if(hsh(xx - fx + 50, y) < .1) Pi(xx, y, 3); }
    // the near towers, framing: dark slabs with a lit inner edge and sparse windows
    const tower = (x0, x1, top, edge) => { RF(x0, top, x1 - x0, H - top, 2); for(let y = top; y < H; y++) Pi(edge, y, 3); for(let x = x0; x < x1; x++) Pi(x, top, 3);
      for(let y = top + 3; y < H; y += 3) for(let x = x0 + 1; x < x1 - 1; x += 2) if(hsh(x - nx + 9, y * 3) < .14) Pi(x, y, 3); };
    tower(-6 + nx, 5 + nx, 0, 4 + nx); RF(5 + nx, 12, 3, H - 12, 2); for(let y = 12; y < H; y++) Pi(7 + nx, y, 3); for(let x = 5; x < 8; x++) Pi(x + nx, 12, 3);
    tower(58 + nx, 70 + nx, 5, 58 + nx); }
  function whale(f){
    if(f >= 35){ whaleScene(f, true); const ch = '鯨', z = 2, K = kpts(ch, z), kx = 4, ky = 4 + ((32 - kh(ch, z)) >> 1);
      if(f < 38){ const e = eOut(step(34, 37.5, f)), sx = whx(31), sy = wcy(31) - 8;
        for(let i = 0; i < K.length; i += 2){ const h = hsh(i, 7), x = lerp(sx + h * WL, kx + K[i], e), y = lerp(sy - hsh(i, 8) * 14, ky + K[i + 1], e); P(x, y, (i >> 1) % 3 ? 4 : 5); } return; }
      if(f === 38){ kanji(ch, kx, ky, z, 5, 5, 4); M.fill(0); for(let p = 0; p < W * H; p++) if(D[p] >= 4) M[p] = 1; halo(1, 1, 2, 0); halo(1, 1, 2, 1); return; }
      kanji(ch, kx, ky, z, 5, 4, 1); txt('KUJIRA', 39, 12, 5); LN(39, 19, 61, 19, 3); txt('DATA', 39, 22, 4);
      for(let i = 0; i < 5; i++) Pi(39 + i * 2, 29, 3); return; }
    whaleScene(f, false);
    const hx = whx(f), cy = wcy(f), ph = f * TAU / 16, amp = 2 + 1.6 * (f >= 18 && f <= 26 ? Math.sin(Math.PI * (f - 18) / 8) : 0);
    const rev = clamp(f / 9, 0, 1), dis = f >= 32 ? (f - 31) / 3 : 0, rx0 = Math.round(hx), ry0 = Math.round(cy); M.fill(0);
    const wp = (x, y, c) => { x = Math.round(x); y = Math.round(y); const h = hsh(x - rx0 + 200, y - ry0 + 200);
      if(h > rev){ if(h < rev + .12) { if((x + y + f) & 1) Pi(x, y, 5); } return; }
      if(dis > 0 && h < dis){ const k = (dis - h) * 9 * (.6 + hsh(x - rx0, 31)); if(hsh(x - rx0, y - ry0) < .55) Pi(Math.round(x + k * .4), Math.round(y - k), h < .3 ? 5 : 4); return; }
      Pi(x, y, c); if(x >= 0 && y >= 0 && x < W && y < H) M[y * W + x] = 1; };
    const cAt = u => cy + amp * u * u * wv(ph - u * 3), STR = [-.5, .05, .5];
    // the pectoral fin first (the body draws over its root): a broad blade a third of the body long, swinging slowly
    { const u0 = .27, x0 = hx + WL * u0, y0 = cAt(u0) + prof(u0) * .8, th = .9 + .2 * Math.sin(ph * .5 + 1), dx = Math.cos(th), dy = Math.sin(th), nx = -dy, ny = dx, FL = 14;
      for(let s = 0; s <= FL; s += .5){ const hw = 2.2 * (1 - s / FL) + .4, cx = x0 + dx * s, cy2 = y0 + dy * s;
        for(let q = -hw + 1; q < hw; q += 1) if(dz(Math.round(cx + nx * q), Math.round(cy2 + ny * q), .3)) wp(cx + nx * q, cy2 + ny * q, 1);
        wp(cx + nx * hw, cy2 + ny * hw, (s * 2) % 5 < 1 ? 5 : 4); wp(cx - nx * hw, cy2 - ny * hw, 3); } wp(x0 + dx * FL, y0 + dy * FL, 5); }
    let pt = null, pb = null, prib = -1;
    for(let x = Math.floor(hx); x <= Math.ceil(hx + WL); x++){ const u = (x - hx) / WL; if(u < 0 || u > 1) continue; const c = cAt(u), th = prof(u), yt = Math.round(c - th * .85), yb = Math.round(c + th * 1.05);
      if(pt === null) for(let y = yt; y <= yb; y++) wp(x, y, 5);
      else { for(let y = Math.min(pt, yt) + 1; y < Math.max(pt, yt); y++) wp(x, y, 5); for(let y = Math.min(pb, yb) + 1; y < Math.max(pb, yb); y++) wp(x, y, 4); }
      const rib = Math.floor(u * WL / 4), isRib = rib !== prib && u > .04 && u < .9; prib = rib;
      const sy = STR.map(v => Math.round(c + v * th * (v < 0 ? .85 : 1.05))), pleat = u > .04 && u < .52;
      for(let y = yt + 1; y < yb; y++){ let col = -1; const si = sy.indexOf(y);
        if(si >= 0 && !(pleat && si === 2)){ const up = ((f * .045 + si * .37) % 1.25) - .1; col = Math.abs(u - up) < .05 ? 5 : isRib ? 4 : 3; }
        else if(pleat && y > sy[1] + 1 && ((yb - y) & 1) === 0) col = 3;
        else if(isRib) col = 3;
        else if(dz(x, y, .16)) col = 1;
        if(col >= 0) wp(x, y, col); }
      wp(x, yt, 5); wp(x, yb, 4); pt = yt; pb = yb; }
    // eye and the long mouth line
    wp(hx + WL * .13, cAt(.13) + .6, 5); Pi(Math.round(hx + WL * .13) + 1, Math.round(cAt(.13) + .6), 0); LN(hx + 1, cAt(0) + 1.4, hx + WL * .22, cAt(.22) + 2.2, 4);
    // the flukes, set by the tail's slope: two lobes, outlined, a notch between
    { const tx = hx + WL, tc = cAt(1), sl = (cAt(1) - cAt(.94)) * 1.6, up = [tx + 7, tc - 6 + sl], dn = [tx + 7, tc + 5 + sl], nt = [tx + 4, tc + sl * .5];
      LN(tx - 1, tc - 1, up[0], up[1], 5); LN(tx - 1, tc + 1, dn[0], dn[1], 4); LN(up[0], up[1], nt[0], nt[1], 3); LN(dn[0], dn[1], nt[0], nt[1], 3); LN(tx, tc, nt[0], nt[1], 3);
      for(let y = Math.round(tc - 8); y < tc + 8; y++) for(let x = Math.round(tx - 1); x <= Math.round(tx + 7); x++) if(x >= 0 && x < W && y >= 0 && y < H && D[y * W + x] >= 3) M[y * W + x] = 1;
      if(f >= 20 && f <= 30) for(let i = 0; i < 8; i++){ const age = f - 20 - i * .7; if(age < 0) continue; const sx = tx + 6 + age * 1.6 + hsh(i, 3) * 2, sy = tc - 2 + (hsh(i, 4) - .5) * 9 - age * .5; if(age < 6 && hsh(i, f) < .8) P(sx, sy, age < 3 ? 5 : 3); } }
    halo(1, .5, 1, 0); if(f >= 2 && f < 32) halo(1, .25, 1, 2); }

  /* ================================================================ 2. 水 MIO deep-sea water: a moon jellyfish (48 x 80, 40 frames at 8 fps)
     A 20-frame pulse, twice: 0-7 the bell relaxed, drifting down; 8-9 it widens and flattens (anticipation); 10 it snaps shut; 11-12 it
     glides up, arms and filaments stretching on a time lag; 13-19 it opens again (ease out). The bell is dark glass lit at its rim; the
     four-ring clover glows; a fringe of short tentacles and eight sense lights line the margin. Marine snow hangs, swaying on its own
     cycle. 25 the 水 points; 26 the flash; 27-39 the card. */
  function bell(t){ const p = ((t % 20) + 20) % 20; let rx, ry, curl;
    if(p < 8){ rx = 17 + p / 8 * .5; ry = 10; curl = 1.5; } else if(p < 10){ const k = (p - 8) / 2; rx = 17.5 + k * 1.4; ry = 10 - k * 1.2; curl = 1.5 - k * .9; }
    else if(p < 11){ const k = p - 10; rx = lerp(18.9, 12, k); ry = lerp(8.8, 14, k); curl = lerp(.6, 4, k); } else if(p < 13){ const k = (p - 11) / 2; rx = 12 + k * .6; ry = 14 - k * .5; curl = 4 - k * .6; }
    else { const k = eOut((p - 13) / 7); rx = lerp(12.6, 17, k); ry = lerp(13.5, 10, k); curl = lerp(3.4, 1.5, k); }
    const q = p < 10 ? p + 20 : p, Y = q < 15 ? -6 * eOut((q - 10) / 5) : -6 + 6 * (q - 15) / 15;
    return { x:24 + Math.sin(t / 40 * TAU) * 1.4, y:22 + Y, rx, ry, curl }; }
  const SNOW = []; for(let i = 0; i < 18; i++) SNOW.push(hsh(i, 11) * 48, hsh(i, 12) * 80, hsh(i, 13) * TAU, hsh(i, 14));
  const marg = (s, a) => s.y + s.curl * Math.pow(Math.abs(a), 4);   // the margin's height at a (-1..1 across the bell)
  function jelly(f){
    for(let i = 0; i < SNOW.length; i += 4){ const x = SNOW[i] + Math.sin(f / 40 * TAU + SNOW[i + 2]) * 1.2, y = SNOW[i + 1] + Math.cos(f / 40 * TAU * 2 + SNOW[i + 2]) * 1.5; P(x, y, SNOW[i + 3] < .12 ? 3 : SNOW[i + 3] < .45 ? 2 : 1); }
    const b = bell(f); M.fill(0);
    // filaments from the margin (whisper-thin, mostly the deep colour), then the four oral arms: each point k takes the bell's place k * lag
    // frames ago, so they trail and stretch when it lurches
    for(let i = 0; i < 6; i++){ const a = ((i + .5) / 6) * 2 - 1, L = 30 + hsh(i, 21) * 24; let px = null, py = null;
      for(let k = 0; k <= L; k++){ const s = bell(f - k * .3), x = s.x + a * s.rx * .92 + Math.sin(k * .2 - f * .4 + i) * Math.min(k * .07, 1.6), y = marg(s, a) + 1 + k * .95;
        const c = k < 8 ? 2 : k < L * .6 ? 1 : (dz(Math.round(x), Math.round(y), 1 - k / L) ? 1 : -1); if(c >= 0){ if(px !== null && Math.abs(x - px) + Math.abs(y - py) > 1.5) LN(px, py, x, y, c); else P(x, y, c); } px = x; py = y; } }
    for(let i = 0; i < 4; i++){ const o = (i - 1.5) * 2.6, L = [22, 28, 26, 20][i];
      for(let k = 0; k <= L; k++){ const s = bell(f - k * .22), w = Math.min(k * .16, 3) * Math.sin(k * .28 - f * .5 + i * 1.7), x = s.x + o * (s.rx / 17) + w, y = s.y + 1 + k, fin = k > L * .72;
        P(x, y, fin ? 2 : 3); if(!fin){ P(x + 1, y, 2); P(x - 1, y, 1); if(k % 3 === i % 3) P(x + (w > 0 ? 2 : -2), y, 4); } } }
    // the bell: dark glass, the rim band lit, the outline pale
    const bx = b.x, by = b.y;
    for(let y = Math.floor(by - b.ry - 1); y <= Math.ceil(by + b.curl + 1); y++) for(let x = Math.floor(bx - b.rx - 1); x <= Math.ceil(bx + b.rx + 1); x++){ const u = (x + .5 - bx) / b.rx; if(Math.abs(u) > 1) continue;
      const top = by - b.ry * Math.sqrt(1 - u * u), bot = by + b.curl * Math.pow(Math.abs(u), 4); if(y + .5 < top || y + .5 > bot + .5) continue;
      const e = Math.hypot(u, Math.max(0, by - y - .5) / b.ry); let c;
      if(y + .5 > bot - .5 || y + .5 < top + 1) c = 4; else if(e > .9) c = 3; else if(e > .78) c = dz(x, y, .5) ? 3 : 2; else c = dz(x, y, .12 + e * .35) ? 2 : 1;
      Pi(x, y, c); if(x >= 0 && y >= 0 && x < W && y < H) M[y * W + x] = 1; }
    for(let x = Math.round(bx - b.rx) + 1; x < bx + b.rx - 1; x += 2){ const a = (x + .5 - bx) / b.rx, my = Math.round(marg(b, a)) + 1; Pi(x, my, 3); if(dz(x, my + 1, .5)) Pi(x, my + 1, 2); }   // the fringe
    for(let i = 0; i < 8; i++){ const a = -1 + (i + .5) / 4; P(bx + a * b.rx * .96 - .5, marg(b, a) - .2, 5); }
    for(const [ox, oy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]){ const cx = bx + ox * 4.2 * b.rx / 17, cy = by - b.ry * .45 + oy * 2.4 * b.ry / 10, rr = 2.4 * b.rx / 17 + .3; ELL(cx + .5, cy + .5, rr, 1.9, 4); P(cx - .5, cy - 2.2, 5); }
    for(let i = 0; i < 5; i++){ const a = -2.3 + i * .18; P(bx + Math.cos(a) * b.rx * .72 - .5, by + Math.sin(a) * b.ry * .8 - .5, 5); }   // the specular on the dome
    halo(1, .55, 1, 0);
    if(f >= 25){ const ch = '水', z = 2, x = (W - kw(ch, z)) >> 1, y = 40;
      if(f === 25) kanji(ch, x, y, z, 3, -1, -1, (X, Y) => hsh(X, Y) < .45);
      else if(f === 26) kanji(ch, x, y, z, 5, 5, 0);
      else { kanji(ch, x, y, z, 5, 3, 0); const s = 'MIO'; txt(s, (W - tw(s)) >> 1, 73, 4, 2); for(let i = 0; i < 5; i++){ Pi(8 + i, 75 + (i & 1), 2); Pi(35 + i, 75 + (i & 1), 2); } } } }

  /* ================================================================ 3. 星環 SEIKAN telecom: a satellite over the night side (64 x 40, 40 frames at 10 fps)
     0-7 it drifts in folded over the turning Earth; 8-9 anticipation (it dips, the folded panels shiver out); 10-14 the panels snap open in
     three beats with an overshoot; 15-19 a glint runs across the cells; 20-27 the beam rings down; 22-29 the cities link up; 26-31 the
     orbital sunrise on the limb; 32 the cut (a flash); 33-39 星環 inside an orbit, the satellite riding it. */
  const CITY = []; for(let i = 0; i < 18; i++) CITY.push(2 + hsh(i, 41) * 72, 29 + hsh(i, 42) * 10, hsh(i, 43));
  const LINKS = [0, 3, 3, 7, 7, 1, 2, 8, 8, 11];
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, s = k => k * k * (3 - 2 * k), a = hsh(xi, yi), b2 = hsh(xi + 1, yi), c = hsh(xi, yi + 1), d = hsh(xi + 1, yi + 1); return lerp(lerp(a, b2, s(fx)), lerp(c, d, s(fx)), s(fy)); };
  function earth(cx, cy, R, f, net, sunK){
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const d = Math.sqrt((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2), o = y * W + x, r = d - R;
      if(r <= -1){ D[o] = vn((x + f * .3) / 7, y / 3.5) > .5 ? 1 : 0; } else if(r <= 0) D[o] = 3; else if(r < 1) D[o] = 2; else if(r < 4 && dz(x, y, (4 - r) / 3 * .55)) D[o] = 2; }
    if(sunK > 0){ const sx = 57, sy = cy - Math.sqrt(R * R - (sx - cx) ** 2);
      for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const r = Math.sqrt((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2) - R; if(r > -1.2 && r < 1){ const k = 1 - Math.abs(x - sx) / (20 * sunK); if(k > 0) D[y * W + x] = k > .5 ? 5 : 3; } }
      const fl = Math.round(14 * sunK); for(let i = -fl; i <= fl; i++) if(dz(sx + i, Math.round(sy - 1), 1 - Math.abs(i) / (fl + 1))) P(sx + i, sy - 1.5, Math.abs(i) < fl * .35 ? 5 : 3);
      for(let j = 1; j <= Math.round(4 * sunK); j++) P(sx, sy - 1.5 - j, j < 3 ? 5 : 3); P(sx - 1, sy - 1.5, 5); P(sx + 1, sy - 1.5, 5); }
    const cxy = i => [CITY[i * 3] - f * .3, CITY[i * 3 + 1]], inE = (x, y) => Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) < R - 2;
    if(net > 0) for(let i = 0; i < Math.min(LINKS.length / 2, Math.floor(net)); i++){ const [x0, y0] = cxy(LINKS[i * 2]), [x1, y1] = cxy(LINKS[i * 2 + 1]), n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for(let s = 1; s < n; s++){ const k = s / n, x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 3; if((s & 1) && inE(x, y)) P(x, y, 2); } }
    for(let i = 0; i < CITY.length / 3; i++){ const [x, y] = cxy(i), X = Math.round(x), Y = Math.round(y); if(!inE(X, Y)) continue; const big = CITY[i * 3 + 2] > .6; Pi(X, Y, 4); if(big){ Pi(X + 1, Y, 4); Pi(X, Y + 1, 4); }
      if(net > 0 && LINKS.indexOf(i) >= 0 && LINKS.indexOf(i) < net * 2) Pi(X, Y, 5); } }
  function sat(f){
    for(let i = 0; i < 16; i++){ const x = (hsh(i, 51) * W) | 0, y = (hsh(i, 52) * 26) | 0, t = (f + i * 3) % 13; if(t < 11) Pi(x, y, t < 2 ? 3 : 2); }
    if(f >= 33){ earth(32, 40 + 170, 172, f, 99, 1); const ox = 32, oy = 14, rx = 27, ry = 7, a = f * .45 + 1.4;
      ELL(ox, oy, rx, ry, 2, Math.PI, TAU); const w0 = kw('星', 1), x0 = (W - w0 * 2 - 3) >> 1; RF(x0 - 2, 5, w0 * 2 + 7, kh('星', 1) + 3, 0); kanji('星', x0, 6, 1, 5); kanji('環', x0 + w0 + 3, 6, 1, 5); ELL(ox, oy, rx, ry, 3, .12, Math.PI - .12);
      const sx = ox + Math.cos(a) * rx, sy = oy + Math.sin(a) * ry; if(Math.sin(a) > -.2){ P(sx - .5, sy - .5, 5); P(sx - 1.5, sy - .5, 2); P(sx + .5, sy - .5, 2); }
      const s = 'SEIKAN'; txt(s, (W - tw(s) - 5) >> 1, 27, 3, 2); return; }
    if(f === 32){ RF(0, 0, W, H, 3); for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) if(dz(x, y, 1 - Math.abs(y - 18) / 14)) D[y * W + x] = 5; return; }
    const sunK = f >= 26 ? (f < 29 ? (f - 25) / 3 : 1 - Math.min(.4, (f - 28) * .13)) : 0;
    earth(8, 150, 126, f, f >= 22 ? (f - 21) * 1.2 : 0, sunK);
    const sx = Math.round(28 + f * .1), sy = Math.round(9 + Math.sin(f / 40 * TAU) * .8 + (f === 8 ? 1 : 0));
    // the beam: rings from the dish, down to the Earth (never over it)
    for(const born of [20, 23]){ const r = (f - born) * 3.2; if(r <= 0 || r > 20) continue; const n = Math.ceil(r * 4); for(let i = 0; i <= n; i++){ const a = .2 + (Math.PI - .4) * i / n, x = sx + 3 + Math.cos(a) * r, y = sy + 11 + Math.sin(a) * r * .42;
      if(Math.sqrt((x - 8) ** 2 + (y - 150) ** 2) > 127) P(x - .5, y - .5, r < 13 ? 3 : 2); } }
    // panels: three 7 x 6 segments a side, opened 0..3 (the boom overshoots a pixel at 13)
    const open = f < 10 ? 0 : f < 12 ? 1 : f < 13 ? 2 : 3, boom = f === 13 ? 4 : 3, shiv = f === 9 ? 1 : 0;
    for(const side of [-1, 1]){ const bx0 = side < 0 ? sx - 1 : sx + 7;
      if(open === 0){ for(let j = 0; j < 6; j++){ Pi(bx0 + side * shiv, sy + 1 + j, 2); Pi(bx0 + side * (1 + shiv), sy + 1 + j, j & 1 ? 1 : 3); } continue; }
      for(let q = 0; q < boom; q++) Pi(bx0 + side * q, sy + 3, 3);
      for(let s2 = 0; s2 < open; s2++){ const px0 = side < 0 ? bx0 - boom - (s2 + 1) * 7 + 1 : bx0 + boom + s2 * 7;
        for(let j = 0; j < 6; j++) for(let i = 0; i < 7; i++){ const x = px0 + i, y = sy + 1 + j, edge = i === 0 || i === 6 || j === 0 || j === 5; let c = edge ? 2 : (i === 3 || j === 2 || j === 3) && (i === 3 ? 1 : j === 2) ? 2 : 1;
          if(!edge && i % 2 === 1 && j % 2 === 1) c = 1; if(!edge && (i + j) % 4 === 0) c = 2;
          if(f >= 15 && f <= 20){ const g = (x - sx) * side * .45 + j - (f - 15) * 5 + 6; if(Math.abs(g) < 1) c = 5; else if(Math.abs(g) < 2.2) c = 3; } Pi(x, y, c); } } }
    // the bus: gold foil (a lit left column, a shaded right, crinkle glints), a pale top deck, the antenna, the dish under it
    RF(sx, sy, 7, 8, 4); for(let j = 0; j < 8; j++){ Pi(sx, sy + j, 5); Pi(sx + 6, sy + j, j < 2 ? 4 : 1); Pi(sx + 5, sy + j, j > 5 ? 1 : 4); } for(let i = 0; i < 7; i++) Pi(sx + i, sy, 3);
    for(let i = 0; i < 4; i++){ const gx = sx + 1 + ((i * 3 + (f >> 2)) % 4), gy = sy + 2 + ((i * 5) % 5); Pi(gx, gy, 5); } RF(sx + 1, sy + 7, 5, 1, 1);
    LN(sx + 3, sy - 1, sx + 3, sy - 4, 3); Pi(sx + 3, sy - 5, (f >> 1) & 1 ? 5 : 2);
    for(let i = 0; i < 7; i++) Pi(sx + i, sy + 9 + (i === 0 || i === 6 ? -1 : 0), 3); Pi(sx + 3, sy + 8, 3); Pi(sx + 3, sy + 9, 5); }

  /* ================================================================ 4. 道標 MICHISHIRUBE car navigation: an isometric wireframe city (96 x 32, 40 frames at 12 fps)
     The map as a city seen from above at 2:1: dark blocks with lit edges, windows, red lights blinking on the tall roofs, the street grid.
     The car's puck runs the route (a hot line with pulses running ahead), the camera on it; 16 the route's turn and the destination come
     into view; 18 the pin falls (stretched), 20 it slams (squash) and rings ripple out, 21 it settles. 30-31 the CRT cut (a line, then a
     band); 32-39 the card: 道標, the route drawn left to right, the pin slammed on its end. */
  const NPIN = ['..444..', '.44444.', '4455544', '4455544', '.44444.', '..444..', '...4...', '...4...', '...5...'];
  const NPSQ = ['..44444..', '.4445544.', '444555444', '.4444444.', '...444...', '....4....', '....5....'];
  const NPST = ['.444.', '44544', '44544', '44544', '.444.', '..4..', '..4..', '..4..', '..4..', '..4..', '..5..'];
  function sprite(S, x, y){ const w = S[0].length, h = S.length, x0 = Math.round(x - (w >> 1)), y0 = Math.round(y - h + 1); for(let j = 0; j < h; j++) for(let i = 0; i < w; i++){ const ch = S[j][i]; if(ch !== '.') Pi(x0 + i, y0 + j, +ch); } }
  const QX = new Float64Array(8), QY = new Float64Array(8);
  function poly(n, c, pat = null){ let y0 = 1e9, y1 = -1e9; for(let i = 0; i < n; i++){ if(QY[i] < y0) y0 = QY[i]; if(QY[i] > y1) y1 = QY[i]; }
    for(let y = Math.max(0, Math.ceil(y0 - .5)); y <= Math.min(H - 1, Math.floor(y1 - .5)); y++){ const yc = y + .5; let xa = 1e9, xb = -1e9;
      for(let i = 0; i < n; i++){ const j = (i + 1) % n, ya = QY[i], yb = QY[j]; if((ya <= yc && yb > yc) || (yb <= yc && ya > yc)){ const x = QX[i] + (yc - ya) / (yb - ya) * (QX[j] - QX[i]); if(x < xa) xa = x; if(x > xb) xb = x; } }
      for(let x = Math.max(0, Math.round(xa)); x < Math.min(W, Math.round(xb)); x++) D[y * W + x] = pat ? pat(x, y) : c; } }
  let NOX = 0, NOY = 0; const isx = (X, Y) => NOX + (X - Y) * 2, isy = (X, Y, Z) => NOY + (X + Y) - Z;
  const NRY = -1, NTX = 23, NDY = 13;   // the route: along the street Y = -1, a right turn at X = 23 onto the street running +Y, the destination at Y = 13
  const ncar = f => -14 + Math.min(f, 26) * .78;
  function navCity(f, cxw, cyw){
    NOX = 38 - (cxw - cyw) * 2; NOY = 17 - (cxw + cyw);
    // the streets: the block outlines on the ground, dim
    const bx0 = Math.floor((cxw - 40) / 8), by0 = Math.floor((cyw - 40) / 8);
    for(let bx = bx0; bx < bx0 + 11; bx++) for(let by = by0; by < by0 + 11; by++){ const X0 = bx * 8, Y0 = by * 8; LN(isx(X0, Y0), isy(X0, Y0, 0), isx(X0 + 6, Y0), isy(X0 + 6, Y0, 0), 1); LN(isx(X0, Y0), isy(X0, Y0, 0), isx(X0, Y0 + 6), isy(X0, Y0 + 6, 0), 1); }
    // the blocks, back to front: a building (or two) per block, dark faces, lit edges, windows, red roof lights
    const L = [];
    for(let bx = bx0; bx < bx0 + 11; bx++) for(let by = by0; by < by0 + 11; by++){ const h0 = hsh(bx * 7 + 3, by * 13 + 5), X0 = bx * 8, Y0 = by * 8;
      if(h0 < .4){ if(h0 < .16) for(let q = 0; q < 6; q++) Pi(Math.round(isx(X0 + 1 + hsh(q, bx) * 4, Y0 + 1 + hsh(q, by) * 4)), Math.round(isy(X0 + 1 + hsh(q, bx) * 4, Y0 + 1 + hsh(q, by) * 4, 0)), 1); continue; }   // empty lots, a park's trees
      const tall = hsh(bx, by + 99) > .74 ? 10 + Math.floor(hsh(bx + 5, by) * 7) : 2 + Math.floor(hsh(bx + 9, by) * 4);
      if(h0 < .6){ L.push([X0 + .5, Y0 + .5, X0 + 2.8, Y0 + 5.5, tall], [X0 + 3.6, Y0 + .5, X0 + 5.5, Y0 + 5.5, Math.max(2, tall - 4 - Math.floor(hsh(bx, by) * 5))]); } else L.push([X0 + .5, Y0 + .5, X0 + 5.5, Y0 + 5.5, tall]); }
    L.sort((a, b) => (a[0] + a[1] + a[2] + a[3]) - (b[0] + b[1] + b[2] + b[3]));
    for(const [X0, Y0, X1, Y1, h] of L){ const sxm = isx(X1, Y1); if(sxm < -14 || isx(X0, Y0) > W + 14 || isy(X1, Y1, 0) < -1 || isy(X0, Y0, h) > H + 1) continue;
      QX[0] = isx(X0, Y1); QY[0] = isy(X0, Y1, 0); QX[1] = isx(X1, Y1); QY[1] = isy(X1, Y1, 0); QX[2] = isx(X1, Y1); QY[2] = isy(X1, Y1, h); QX[3] = isx(X0, Y1); QY[3] = isy(X0, Y1, h); poly(4, 0);
      QX[0] = isx(X1, Y1); QY[0] = isy(X1, Y1, 0); QX[1] = isx(X1, Y0); QY[1] = isy(X1, Y0, 0); QX[2] = isx(X1, Y0); QY[2] = isy(X1, Y0, h); QX[3] = isx(X1, Y1); QY[3] = isy(X1, Y1, h); poly(4, 1, (x, y) => dz(x, y, .2) ? 1 : 0);
      QX[0] = isx(X0, Y0); QY[0] = isy(X0, Y0, h); QX[1] = isx(X1, Y0); QY[1] = isy(X1, Y0, h); QX[2] = isx(X1, Y1); QY[2] = isy(X1, Y1, h); QX[3] = isx(X0, Y1); QY[3] = isy(X0, Y1, h); poly(4, 0);
      // windows on both faces, a few lit
      for(let z = 2; z < h - 1; z += 2){ for(let t = .8; t < X1 - X0 - .4; t += 1){ const q = hsh(Math.round((X0 + t) * 4), z * 7 + Math.round(Y1)); if(q < .5) Pi(Math.round(isx(X0 + t, Y1)), Math.round(isy(X0 + t, Y1, z)), q < .06 ? 3 : 2); }
        for(let t = .8; t < Y1 - Y0 - .4; t += 1){ const q = hsh(Math.round((Y0 + t) * 4) + 77, z * 7 + Math.round(X1)); if(q < .4) Pi(Math.round(isx(X1, Y0 + t)), Math.round(isy(X1, Y0 + t, z)), q < .05 ? 3 : 2); } }
      const e = h > 9 ? 3 : 2, ev = h > 9 ? 2 : 1; LN(isx(X0, Y0), isy(X0, Y0, h), isx(X1, Y0), isy(X1, Y0, h), e); LN(isx(X1, Y0), isy(X1, Y0, h), isx(X1, Y1), isy(X1, Y1, h), e); LN(isx(X1, Y1), isy(X1, Y1, h), isx(X0, Y1), isy(X0, Y1, h), e); LN(isx(X0, Y1), isy(X0, Y1, h), isx(X0, Y0), isy(X0, Y0, h), e);
      LN(isx(X1, Y1), isy(X1, Y1, 0), isx(X1, Y1), isy(X1, Y1, h), e); LN(isx(X0, Y1), isy(X0, Y1, 0), isx(X0, Y1), isy(X0, Y1, h), ev); LN(isx(X1, Y0), isy(X1, Y0, 0), isx(X1, Y0), isy(X1, Y0, h), ev);
      if(h >= 13 && ((f >> 2) + Math.round(X0 + Y0)) & 1) Pi(Math.round(isx((X0 + X1) / 2, (Y0 + Y1) / 2)), Math.round(isy((X0 + X1) / 2, (Y0 + Y1) / 2, h)) - 1, 4); }
    // the route, drawn over the city as a navigation screen draws it: start to the turn to the destination; pulses run ahead of the car
    const cx0 = ncar(f), seg = [[cx0, NRY, NTX, NRY], [NTX, NRY, NTX, NDY]];
    for(const [xa, ya, xb, yb] of seg){ if(xb < xa) continue; LN(isx(xa, ya), isy(xa, ya, 0), isx(xb, yb), isy(xb, yb, 0), 4); LN(isx(xa, ya), isy(xa, ya, 0) + 1, isx(xb, yb), isy(xb, yb, 0) + 1, 4); }
    const total = (NTX - cx0) + (NDY - NRY); for(let k = 0; k < 5; k++){ const d = ((f * 1.3 + k * 6) % 30); if(d > total) continue; const [X, Y] = d < NTX - cx0 ? [cx0 + d, NRY] : [NTX, NRY + d - (NTX - cx0)];
      Pi(Math.round(isx(X, Y)), Math.round(isy(X, Y, 0)), 5); Pi(Math.round(isx(X, Y)) + 1, Math.round(isy(X, Y, 0)), 5); } }
  function navi(f){
    if(f >= 30){
      if(f === 30){ for(let x = 0; x < W; x++){ Pi(x, 16, 5); if(dz(x, 15, .5)) Pi(x, 15, 3); if(dz(x, 17, .5)) Pi(x, 17, 3); } return; }
      for(let x = 0; x < W; x++) for(const y of [22, 25, 29]) if(((x + y + f) & 3) === 0) Pi(x, y, 1);
      if(f === 31){ for(let y = 11; y < 22; y++) for(let x = 0; x < W; x++) if(dz(x, y, 1 - Math.abs(y - 16) / 6)) D[y * W + x] = Math.abs(y - 16) < 2 ? 5 : 3; return; }
      const w0 = kw('道', 1), x0 = 7; kanji('道', x0, 3, 1, 5); kanji('標', x0 + w0 + 3, 3, 1, 5); txt('MICHISHIRUBE', 45, 5, 3); txt('NAVI', 45, 12, 4); for(let i = 0; i < 4; i++) Pi(63 + i * 2, 14, 2);
      const e = eOut(step(31, 35, f)), xe = Math.round(7 + 72 * e); for(let x = 7; x <= xe; x++){ Pi(x, 25, 4); Pi(x, 26, 4); } for(let x = 7; x <= xe; x++) if(((x - f * 2) & 7) < 2) Pi(x, 25, 5);
      if(f >= 36){ if(f === 36) ELL(80, 26.5, 7, 1.6, 2); sprite(f === 36 ? NPSQ : NPIN, 80, 26); } return; }
    const cx0 = ncar(f), k = eOut(step(14, 26, f)), cxw = lerp(cx0, NTX - 1, k * .85), cyw = lerp(NRY, NDY * .95, k * .85);
    navCity(f, cxw, cyw);
    // the car's puck: a white chevron on the route with a slow ring
    { const X = cx0, Y = NRY, sx = Math.round(isx(X, Y)), sy = Math.round(isy(X, Y, 0)); Pi(sx, sy, 5); Pi(sx - 1, sy - 1, 5); Pi(sx - 2, sy - 1, 3); Pi(sx - 1, sy + 1, 5); Pi(sx - 2, sy + 1, 3); Pi(sx + 1, sy, 5);
      const r = (f % 10) * .9 + 2; if(f % 10 < 7) ELL(sx + .5, sy + .5, r * 1.6, r * .8, f % 10 < 3 ? 3 : 2); }
    if(f >= 18){ const ax = Math.round(isx(NTX, NDY)), ay = Math.round(isy(NTX, NDY, 0));
      if(f >= 20 && f <= 28){ const r = (f - 20) * 2 + 3; ELL(ax + .5, ay + .5, r, r * .5, f < 23 ? 4 : 2); if(f < 25) ELL(ax + .5, ay + .5, r * .5, r * .25, 5); }
      if(f === 18) sprite(NPST, ax, ay - 9); else if(f === 19) sprite(NPST, ax, ay - 3); else sprite(f === 20 ? NPSQ : NPIN, ax, ay); } }

  /* ================================================================ 5. 夜鳴 YONAKI night ramen: a bowl seen through rain on glass (64 x 40, 40 frames at 10 fps)
     Steam curls up from the broth on a 20-frame cycle; rain beads run down the glass at 1.25 and 2.5 px a frame (50 px a loop); two street
     lights glow out of focus behind. 6-8 the chopsticks come in and dip; 10 they push down (anticipation); 11-12 they snap up with the
     noodles; 13 the overshoot; 14-21 the hold, noodles swaying and dripping broth; 22-24 they lower; 25 they leave. 30 the seal slams in
     large; 31-39 the seal (a bowl mark, its steam moving) and らーめん YONAKI, the steam and the rain still going (麺 and 夜鳴 were too dense to read at this size). */
  const TIPS = { 6:[52, 4], 7:[42, 13], 8:[35, 20], 9:[35, 21], 10:[35, 22], 11:[37, 11], 12:[39, 5], 13:[39, 3], 14:[39, 4], 22:[38, 9], 23:[36, 16], 24:[35, 20], 25:[50, 4] };
  const tipAt = f => TIPS[f] || (f >= 15 && f <= 21 ? [39 + (f === 18 ? 1 : 0), 4 + (f === 17 || f === 18 ? 1 : 0)] : null);
  const DROPS = [[5, 3, 1.25], [16, 30, 2.5], [26, 12, 1.25], [48, 41, 1.25], [58, 20, 2.5], [37, 6, 2.5]];
  function rain(f){
    for(let i = 0; i < 20; i++){ const x = (hsh(i, 71) * W) | 0, y = (hsh(i, 72) * H) | 0; Pi(x, y, 5); if(i % 5 === 0) Pi(x, y - 1, 4); }
    for(const [x, y0, sp] of DROPS){ const y = Math.round(((y0 + f * sp) % 50) - 6); for(let k = 2; k < 10; k += 2) Pi(x, y - k, 5); for(let k = 1; k < 10; k += 3) Pi(x + 1, y - k, 5);
      Pi(x, y, 4); Pi(x + 1, y, 5); Pi(x, y + 1, 5); Pi(x + 1, y + 1, 1); } }
  function steam(f, k0){ for(let w = 0; w < 3; w++){ const x0 = [22, 31, 39][w], ph = w * 2.1;
    for(let y = 20; y >= 0; y--){ const p = (20 - y) / 20, x = x0 + Math.sin(y * .32 + f * TAU / 20 + ph) * (1 + p * 2.6) + p * (w - 1) * 3, dn = (1 - p) * .75 * k0 * (.45 + .55 * Math.sin(y * .45 + f * TAU / 10 + ph));
      if(dn > 0){ const xi = Math.round(x); if(dz(xi, y, dn) && G(xi, y) < 3) Pi(xi, y, 4); if(dz(xi + 1, y, dn * .6) && G(xi + 1, y) < 3) Pi(xi + 1, y, 4); } } } }
  function disc(x, y, r, c, rim = -1){ for(let j = -r; j <= r; j++) for(let i = -r; i <= r; i++){ const d = Math.hypot(i, j); if(d <= r + .3) Pi(Math.round(x + i), Math.round(y + j), rim >= 0 && d > r - .7 ? rim : c); } }
  function ramenBack(){ disc(7, 6, 5, 1); disc(57, 4, 4, 1); disc(50, 11, 2, 1); disc(14, 13, 2, 1);
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const d = Math.hypot((x - 31) / 1.7, (y - 22) * 1.15); if(d < 10 || (d < 11.5 && dz(x, y, .5))) D[y * W + x] = 1; } }
  function ramen(f){
    if(f < 30) ramenBack();
    if(f >= 30){ steam(f, .7); const big = f === 30, s = big ? 3 : 0, x = 2 - s, y = 2 - s, n = 30 + s * 2; RF(x + 2, y + 2, n, n, 0); RF(x, y, n, n, 2);
      for(let i = 0; i < n; i++){ Pi(x + i, y, 4); Pi(x, y + i, 3); Pi(x + i, y + n - 1, 1); Pi(x + n - 1, y + i, 1); }
      for(let i = 2; i < n - 2; i++){ Pi(x + i, y + 2, 4); Pi(x + 2, y + i, 4); Pi(x + i, y + n - 3, 4); Pi(x + n - 3, y + i, 4); }
      // the seal's mark: a bowl, its chopsticks and three curls of steam (the steam moves), cream on the red
      const ox = x + 4 + s, oy = y + 4 + s;
      for(let j = 0; j < 8; j++){ const hw = Math.round(10 * Math.sqrt(1 - (j / 8.5) ** 2)); for(let i = -hw; i <= hw; i++) Pi(ox + 11 + i, oy + 12 + j, 4); } RF(ox + 7, oy + 20, 9, 1, 4); RF(ox + 1, oy + 11, 21, 1, 4);
      for(let i = 0; i < 18; i += 2) Pi(ox + 3 + i, oy + 14, 2);
      LN(ox + 14, oy + 10, ox + 21, oy + 1, 4); LN(ox + 16, oy + 10, ox + 22, oy + 2, 4);
      for(let w = 0; w < 3; w++) for(let j = 0; j < 7; j++) Pi(ox + 5 + w * 4 + Math.round(Math.sin(j * .9 + f * .8 + w) * .8), oy + 2 + j + (w === 1 ? -1 : 0), 4);
      rain(f); if(!big){ kanji('ら', 33, 2, 1, 4); kanji('ー', 48, 2, 1, 4); kanji('め', 33, 18, 1, 4); kanji('ん', 48, 18, 1, 4); RF(36, 34, 25, 7, 0); txt('YONAKI', 37, 35, 3); }
      return; }
    RF(0, 36, W, 4, 1); for(let x = 0; x < W; x++) Pi(x, 36, (x & 3) ? 3 : 1);   // the counter's edge catching the light
    // the bowl: the foot, the body (lit left, shaded right), the meander band, the rim (the lip lit in front), the broth
    const cx = 30, ry = 23, RX = 21; RF(cx - 7, 34, 15, 2, 1);
    for(let y = ry; y < 35; y++){ const k = (y - ry) / 11.5, hw = RX * Math.sqrt(Math.max(0, 1 - k * k * .85)); for(let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++){ const u = (x - cx) / hw; Pi(x, y, u > .5 || y > 32 ? 1 : 2); } const xl = Math.round(cx - hw * .64); Pi(xl, y, 4); if(y < 31) Pi(xl + 1, y, 3); }
    for(let x = cx - 18; x <= cx + 17; x++){ const q = ((x - cx + 64) % 4); if(q === 0) { Pi(x, 27, 4); Pi(x, 28, 4); } else if(q === 1) Pi(x, 27, 4); else if(q === 2) Pi(x, 28, 4); }
    ELL(cx + .5, ry + .5, RX, 4.5, 2, Math.PI, TAU);
    for(let y = ry - 4; y <= ry + 4; y++) for(let x = cx - RX; x <= cx + RX; x++){ const e = ((x - cx) / (RX - 1)) ** 2 + ((y - ry) / 3.6) ** 2; if(e < 1) Pi(x, y, y < ry - 2 ? 1 : 3); }
    ELL(cx + .5, ry + .5, RX, 4.5, 4, .05, Math.PI - .05);
    // toppings: nori standing at the back, chashu, the egg, a naruto slice; noodle arcs; oil glints that shimmer
    RF(cx + 8, ry - 8, 5, 8, 0); for(let j = 0; j < 8; j++) Pi(cx + 8, ry - 8 + j, 1); RF(cx + 8, ry - 8, 5, 1, 1);
    disc(cx - 11, ry, 2, 1, 2); Pi(cx - 12, ry - 1, 3);
    RF(cx + 2, ry - 1, 5, 2, 4); Pi(cx + 3, ry - 1, 3); Pi(cx + 4, ry - 1, 3); Pi(cx + 4, ry, 3); Pi(cx + 3, ry, 3);
    disc(cx - 5, ry, 1, 4); Pi(cx - 5, ry, 2);
    for(let x = cx - 16; x < cx + 16; x++) if(((x * 7) % 5) < 3) Pi(x, ry + 1 + ((x >> 1) & 1), 4);
    for(let i = 0; i < 3; i++){ const gx = cx - 8 + ((i * 7 + f) % 16), gy = ry + 2 - (i & 1); if(G(gx, gy) === 3) Pi(gx, gy, 4); }
    const tip = tipAt(f), lift = tip && tip[1] < 18;
    steam(f, lift ? 1 : .85);
    if(tip){ const [tx, ty] = tip;
      if(lift){ for(let s = 0; s < 5; s++){ const bx = cx - 4 + s * 2, by = ry, sw = Math.sin(f * .9 + s) * (f >= 14 && f <= 21 ? 1.2 : .4);
          for(let k = 0; k <= 1; k += .04){ const x = lerp(bx, tx - 2 + s * .7, k) + Math.sin(k * Math.PI) * sw * 2, y = lerp(by, ty + 2, k) + Math.sin(k * Math.PI) * .6; P(x, y, (s + Math.round(k * 20)) % 4 ? 4 : 3); } }
        if(f >= 15 && f <= 22) for(let d = 0; d < 3; d++){ const age = (f - 15 + d * 3) % 6, dx = cx - 3 + d * 3; P(dx, ty + 8 + age * 2.2, 3); } }
      LN(tx, ty, tx + 26, ty - 26, 1); LN(tx + 1, ty, tx + 27, ty - 26, 3); LN(tx + 2, ty - 1, tx + 28, ty - 27, 1); LN(tx + 3, ty - 1, tx + 29, ty - 27, 3); }
    rain(f); }

  /* ================================================================ 6. 花守製薬 HANAMORI pharma: sakura into a capsule (48 x 80, 40 frames at 10 fps)
     0-17 petals turn in a three-armed vortex, tumbling through four poses, drawn in on staggered starts (inner first) and brightening as
     they near the eye; 17-18 they crush into a ball of light; 19 it draws in (anticipation); 20 the flash; 21-24 the capsule tumbles end
     over end out of it and settles past upright, petals blown out; 25-28 it hangs, a gleam crossing it, its flower mark turning round with
     it; 29-31 it rises to make room; 31-39 花守 and HANAMORI, petals drifting down behind. */
  const PET = [['3..', '322', '.22'], ['332', '22.'], ['32'], ['3.', '22', '.2']];
  const NPE = 30, HCX = 24, HCY = 34;
  function petal(x, y, pose, dim){ const S = PET[pose & 3], x0 = Math.round(x) - 1, y0 = Math.round(y) - 1; for(let j = 0; j < S.length; j++) for(let i = 0; i < S[j].length; i++){ const ch = S[j][i]; if(ch === '.') continue; Pi(x0 + i, y0 + j, dim === 2 ? (ch === '3' ? 2 : 1) : dim === 1 ? +ch : (ch === '3' ? 4 : 3)); } }
  function capsule(cx, cy, ang, len, r, gl){ const ux = Math.sin(ang), uy = -Math.cos(ang), hl = len / 2 - r, ext = len / 2 + 1;
    for(let y = Math.floor(cy - ext); y <= Math.ceil(cy + ext); y++) for(let x = Math.floor(cx - ext); x <= Math.ceil(cx + ext); x++){ const dx = x + .5 - cx, dy = y + .5 - cy, t = dx * ux + dy * uy, tc = clamp(t, -hl, hl), qx = dx - ux * tc, qy = dy - uy * tc, d = Math.hypot(qx, qy); if(d > r) continue;
      const s = (dx * -uy + dy * ux) / r, l = -s * .85 - (qy < -r * .4 ? .2 : 0), pink = t > 0; let c;
      if(d > r - .85) c = 1; else if(Math.abs(t) < .55) c = 1; else if(pink) c = l > .45 ? 3 : l < -.55 ? 1 : 2; else c = l > .35 ? 4 : l < -.4 ? 3 : 4;
      if(gl !== null && c !== 1){ const g = dx * .8 + dy * .6 - gl; if(g > 0 && g < 1.8) c = 4; else if(g > -1.2 && g <= 0 && pink) c = 3; }
      Pi(x, y, c); if(x >= 0 && y >= 0 && x < W && y < H) M[y * W + x] = 1; } }
  function hana(f){
    M.fill(0);
    if(f >= 21) for(let i = 0; i < 9; i++){ const x = ((hsh(i, 81) * 48 + Math.sin(f * .25 + i) * 2) % 48 + 48) % 48, y = (hsh(i, 82) * 80 + f * .7) % 80; petal(x, y, (f + i) >> 1, 2); }
    if(f < 18) for(let i = 0; i < NPE; i++){ const arm = i % 3, s = Math.floor(i / 3) / (NPE / 3), st = s * 8, k = eIn(step(st, 17.5, f)), r = (5 + s * 30) * (1 - k);
      const a = arm * TAU / 3 + s * 3.4 + f * (.1 + .35 * k) + hsh(i, 85) * .4, x = HCX + Math.cos(a) * r, y = HCY + Math.sin(a) * r * 1.3;
      if(k > .45){ const a2 = a - .5; P(HCX + Math.cos(a2) * r * 1.1, HCY + Math.sin(a2) * r * 1.43, 1); }
      petal(x, y, (f + i) >> 1, r > 22 ? 2 : r > 9 ? 1 : 0); }
    if(f >= 17 && f <= 20){ const r = f === 17 ? 2.5 : f === 18 ? 5 : f === 19 ? 3 : 10; for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const d = Math.hypot(x + .5 - HCX, (y + .5 - HCY) / 1.2); if(d < r * .45) Pi(x, y, 4); else if(d < r * .75) Pi(x, y, 3); else if(d < r) Pi(x, y, 2); else if(d < r * 1.6 && dz(x, y, .5) && G(x, y) === 0) Pi(x, y, 1); }
      if(f === 20){ for(let i = -18; i <= 18; i++){ if(dz(HCX + i, HCY, 1 - Math.abs(i) / 19)) Pi(HCX + i, HCY, 4); if(dz(HCX, HCY + i * 1.5, 1 - Math.abs(i) / 19)) Pi(HCX, Math.round(HCY + i * 1.5), 4); } for(let i = -8; i <= 8; i++){ Pi(HCX + i, HCY + i, 3); Pi(HCX + i, HCY - i, 3); } } return; }
    if(f < 21) return;
    for(let i = 0; i < 12 && f < 28; i++){ const a = i / 12 * TAU + .3, r = (f - 20) * (3 + hsh(i, 86) * 2.5); petal(HCX + Math.cos(a) * r, HCY + Math.sin(a) * r * 1.3 + (f - 20) * .8, f + i, f > 24 ? 2 : 1); }
    const ang = f === 21 ? Math.PI / 2 : f === 22 ? Math.PI / 4.5 : f === 23 ? -.18 : f === 24 ? .06 : 0, cy = HCY - Math.round(10 * eOut(step(28, 31, f)));
    const gl = f >= 25 && f <= 28 ? -12 + (f - 25) * 8 : null; capsule(HCX, cy, ang, 34, 7, gl); halo(1, .5, 1, 0);
    // its flower mark, turning round the capsule's long axis (seen while on the near side)
    if(f >= 24){ const ps = (f - 24) * .42 - 1.3, s = Math.sin(ps), c = Math.cos(ps); if(c > .15){ const mx = Math.round(HCX + s * 4.6 - .5), my = cy - 9; Pi(mx, my, 4); if(c > .5){ Pi(mx - 1, my, 3); Pi(mx + 1, my, 3); Pi(mx, my - 1, 3); Pi(mx, my + 1, 3); } } }
    if(f >= 31){ const w0 = kw('花', 1), x0 = (W - w0 * 2 - 3) >> 1, wipe = f === 31 ? 24 : 99; kanji('花', x0, 50, 1, 4, -1, -1, X => X < wipe); kanji('守', x0 + w0 + 3, 50, 1, 4, -1, -1, X => X < wipe);
      if(f >= 32){ const s2 = 'HANAMORI'; txt(s2, (W - tw(s2)) >> 1, 70, 3); for(let i = 0; i < 3; i++) Pi(22 + i * 2, 77, 2); } } }

  // ---------------------------------------------------------------- the list
  const SRC_HOLD = (from, to) => f => f > from && f <= to ? from : f;
  const ADS = [
    { id:'whale', w:64, h:40, n:48, fps:8, title:'鯨網 KUJIRA DATA', brand:'KUJIRA DATA', slot:'hero', paint:whale, gl:27, src:SRC_HOLD(39, 47),
      pal:['#03050c', '#0b1a33', '#081022', '#1d5f8f', '#3fc4ff', '#e6fbff'] },
    { id:'jelly', w:48, h:80, n:40, fps:8, title:'水 MIO deep-sea water', brand:'MIO', slot:'vertical', paint:jelly, gl:17,
      pal:['#06030c', '#1d0c36', '#7a2a8c', '#e25cbc', '#ffb8ea', '#fff4fc'] },
    { id:'sat', w:64, h:40, n:40, fps:10, title:'星環 SEIKAN telecom', brand:'SEIKAN', slot:'hero', paint:sat, gl:24,
      pal:['#02030a', '#0b1838', '#2d6fe0', '#a6dcff', '#f4c45e', '#fffbea'] },
    { id:'navi', w:96, h:32, n:40, fps:12, title:'道標 MICHISHIRUBE navigation', brand:'MICHISHIRUBE', slot:'wide', paint:navi, gl:12, src:SRC_HOLD(37, 39),
      pal:['#03040b', '#141c44', '#2c4cb0', '#7aa4ff', '#ff3474', '#fff0f4'] },
    { id:'ramen', w:64, h:40, n:40, fps:10, title:'夜鳴 YONAKI ramen', brand:'YONAKI', slot:'hero', paint:ramen, gl:27,
      pal:['#0b0608', '#4a1016', '#c4281f', '#f2a43c', '#fff2cc', '#5a7aa8'] },
    { id:'hana', w:48, h:80, n:40, fps:10, title:'花守製薬 HANAMORI pharma', brand:'HANAMORI', slot:'vertical', paint:hana, gl:14,
      pal:['#08040a', '#2c0f24', '#e2648f', '#ffc4d8', '#fff7fa'] } ];
  const MAP = new Map(); for(const A of ADS) MAP.set(A.id, A);

  // ---------------------------------------------------------------- the atlas
  const AW = 1024; let ATL = null, AX = null, IMG = null, U32 = null, AH = 0, READY = false, MS = 0;
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const u32 = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  function layout(){ let x = 0, y = 0, rh = 0; for(const A of ADS.slice().sort((a, b) => b.h - a.h)){ A.cell = []; A.R = []; const src = A.src || (f => f);
      for(let f = 0; f < A.n; f++){ const s = src(f); if(s !== f && f !== A.gl){ A.R[f] = A.R[s]; continue; } if(x + A.w > AW){ x = 0; y += rh + 1; rh = 0; } const R = { c:null, x, y, w:A.w, h:A.h, id:A.id, f }; A.R[f] = R; A.cell.push(f); x += A.w + 1; if(A.h > rh) rh = A.h; }
      A.u = A.pal.map(h => { const c = rgb(h); return u32(c[0], c[1], c[2]); }); A.ud = A.pal.map(h => { const c = rgb(h); return u32(c[0] * .78 | 0, c[1] * .78 | 0, c[2] * .8 | 0); }); }
    return y + rh + 1; }
  function bind(A){ if(W !== A.w || H !== A.h || !D){ W = A.w; H = A.h; D = new Uint8Array(W * H); M = new Uint8Array(W * H); } }
  function render(A, f){ bind(A); D.fill(0); A.paint(f); const R = A.R[f], gl = f === A.gl, gy = 6 + ((hsh(f, A.w) * (H - 14)) | 0), gh = 3 + ((hsh(f, 3) * 4) | 0);
    for(let y = 0; y < H; y++){ const pal = y & 1 ? A.ud : A.u, row = (R.y + y) * AW + R.x, sh = gl && y >= gy && y < gy + gh ? (y & 1 ? 3 : -2) : 0;
      for(let x = 0; x < W; x++){ let c = pal[D[y * W + clamp(x - sh, 0, W - 1)]]; if(gl){ const c2 = pal[D[y * W + clamp(x - sh + 1, 0, W - 1)]]; c = ((c & 0xffffff00) | (c2 & 0xff)) >>> 0; } U32[row + x] = c; } } }
  function* warmSteps(){ if(READY) return; const t0 = performance.now(); FONT = fontOK(); AH = layout(); ATL = document.createElement('canvas'); ATL.width = AW; ATL.height = AH; AX = ATL.getContext('2d'); IMG = AX.createImageData(AW, AH); U32 = new Uint32Array(IMG.data.buffer); yield;
    for(const A of ADS) for(const f of A.cell){ render(A, f); yield; }
    for(let y = 0; y < AH; y += 48){ AX.putImageData(IMG, 0, 0, 0, y, AW, Math.min(48, AH - y)); yield; }   // (perf pass: 48-row bands, each step well under 12 ms)
    for(const A of ADS) for(let f = 0; f < A.n; f++) A.R[f].c = ATL; READY = true; MS = performance.now() - t0;
    if(!FONT && document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16').then(() => { if(!fontOK()) return; FONT = true; for(const k in KM) delete KM[k]; for(const A of ADS) for(const f of A.cell){ const R = A.R[f]; render(A, f); AX.putImageData(IMG, 0, 0, R.x, R.y, R.w, R.h); } }, () => {}); }
  function frame(id, t){ const A = MAP.get(id); if(!A || !READY) return null; const f = Math.floor(t * A.fps / 1000) % A.n; return A.R[f < 0 ? f + A.n : f]; }
  /* draw(k, id, t, sx, sy, sw, sh, px): the frame with its edges on the px grid (each edge on the first pixel whose centre lies past it,
     as Neon Ward's jbE), the LED grid fading in as an LED passes 2 screen pixels and full at 3 (alpha .55, as the koi screen), and a slow
     bright refresh roll once an LED passes 1 px. Allocation-free. */
  const eg = (o, u, s, px) => Math.ceil((o + (u + 1e-5) * s) / px - .5) * px;
  function draw(k, id, t, sx, sy, sw, sh, px = 1, led = 1){ const R = frame(id, t); if(!R) return false; const fw = R.w, fh = R.h, ux = sw / fw, uy = sh / fh, x0 = eg(sx, 0, ux, px), x1 = eg(sx, fw, ux, px), y0 = eg(sy, 0, uy, px), y1 = eg(sy, fh, uy, px); if(x1 <= x0 || y1 <= y0) return false;
    const sm = k.imageSmoothingEnabled; k.imageSmoothingEnabled = false; k.drawImage(R.c, R.x, R.y, fw, fh, x0, y0, x1 - x0, y1 - y0); k.imageSmoothingEnabled = sm;
    const ex = clamp((ux / px - 2) / 1, 0, 1) * led, a0 = k.globalAlpha;
    if(ex > 0){ k.globalAlpha = a0 * ex * .55; k.fillStyle = '#04030a'; for(let i = 1; i < fw; i++){ const xx = eg(sx, i, ux, px); k.fillRect(xx, y0, px, y1 - y0); } for(let j = 1; j < fh; j++){ const yy = eg(sy, j, uy, px); k.fillRect(x0, yy, x1 - x0, px); } }
    if(ux > px){ const ry = y0 + Math.round(((t / 2600) % 1) * (y1 - y0) / px) * px; k.globalAlpha = a0 * .07; k.fillStyle = '#ffffff'; k.fillRect(x0, ry, x1 - x0, Math.min(y1 - ry, Math.round((y1 - y0) * .12 / px) * px + px)); }
    k.globalAlpha = a0; return true; }

  E.akibaAds = { list:ADS.map(A => ({ id:A.id, w:A.w, h:A.h, frames:A.n, fps:A.fps, title:A.title, brand:A.brand, slot:A.slot })), frame, draw, warmSteps, warm(){ for(const _ of warmSteps()); },
    get ready(){ return READY; }, get atlas(){ return ATL; }, get stats(){ let cells = 0; for(const A of ADS) cells += A.cell ? A.cell.length : 0; return { ms:MS, w:AW, h:AH, cells, bytes:AW * AH * 4, font:FONT }; },
    // (dev) the index buffer and palette of one frame, for strips and the greyscale check
    dev:{ paint(id, f){ const A = MAP.get(id); bind(A); D.fill(0); A.paint(f); return { w:W, h:H, d:D.slice(), pal:A.pal }; } } };
})();
