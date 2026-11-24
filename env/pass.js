/* Sundown environment: Mountain Pass (touge, 峠). See env/README.md for the hooks.
   Studied (looked at, not copied):
   - Celeste (night chapters): the sky and far scenery sit in close blue values; each layer nearer is one value step darker; bright 1px edges
     only on the edges that face the light; sparse 1px motes; one warm accent glows against the cool base.
   - Superbrothers: Sword & Sworcery EP: two hue families only (teal-green, khaki stone); foliage as clumped blobs with lit caps and dark undersides;
     flat thin cloud streaks crossing in front of layers; landmark as a plain post-and-lintel silhouette.
   - Hyper Light Drifter: far forest as flat, low-contrast silhouettes close to the sky colour (air between layers), sparse glowing motes as life.
   - Super Hang-On: ridges as thin bands sitting right on the horizon; roadside kit tiny and readable, the road kept clean.
   Rules taken: moon ahead = backlight, so every silhouette is dark with a thin moon rim on the side facing the moon; ridges step darker toward
   the camera with dithered mist pooled in each valley; warm light only from lanterns, the shrine and the valley town; the road and its
   guardrail stay the brightest, clearest lines. */
"use strict";
(function(){
  // ---------------------------------------------------------------- palettes: [outline, dark, mid, light, rim] (rim = moonlight)
  const PAL = {
    1: ['#02060a', '#08151a', '#0f2428', '#1c3c3c', '#6f9a98'],   // pine needles
    2: ['#040406', '#0e0e12', '#18181e', '#2a2c34', '#5a6878'],   // bark
    3: ['#0a0c12', '#232733', '#363c4a', '#58607a', '#bcc8da'],   // granite
    4: ['#2a0808', '#6a1814', '#9e2a1e', '#d24a2c', '#ffb090'],   // vermilion
    5: ['#050406', '#141016', '#221c24', '#3a3444', '#9aa8c4'],   // black lacquer
    6: ['#2a0610', '#8a1424', '#c8283a', '#ff5a5a', '#ffb0a8'],   // red cloth
    7: ['#1a1408', '#5a4a24', '#8a7438', '#bca050', '#f0e0a0']    // straw rope
  };
  // bake a material grid into a shaded sprite: the edge facing the moon gets a rim, the next pixels a dithered light band, the far edge a dark outline
  function bake(key, w, h, mat, dir){ key = 'pass_' + key + (dir > 0 ? 'R' : 'L'); if(SPR[key]) return SPR[key];
    const g = new Array(w * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) g[y * w + x] = mat(x, y);
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x];
    return procSprite(key, w, h, (x, y) => { let m = at(x, y); if(!m) return null; if(typeof m === 'string') return m;
      const tex = m > 100; if(tex) m -= 100; const p = PAL[m];
      if(!at(x, y - 1) || !at(x + dir, y)) return p[4];
      if(!at(x + 2 * dir, y) || !at(x + dir, y - 1)) return p[3];
      if(!at(x, y - 2)) return p[2];
      if(!at(x - dir, y) || !at(x, y + 1)) return p[0];
      return tex ? p[2] : p[1]; }); }
  // ---------------------------------------------------------------- sprites
  // sugi (Japanese cedar): tall, narrow, layered tiers; lines Japanese mountain roads
  const sugi = (v, dir) => bake('sugi' + v, 15, 48, (x, y) => { const c = 7.5 + (v === 2 ? .5 : 0);
    if(y >= 42) return Math.abs(x + .5 - c) < 1.3 ? 2 : 0;
    const fr = (y + 1) / 43, tier = ((y + v * 2) % 6) / 5, hw = (.5 + fr * 6.4) * (.7 + .3 * tier) + (hash(v * 31 + y * 7) - .5) * 1.1;
    if(Math.abs(x + .5 - c) > hw) return 0; return hash(x * 7.1 + y * 13.3 + v) > .78 ? 101 : 1; }, dir);
  // a round broadleaf (camphor) crown built from clumped blobs with lit caps, as Sword & Sworcery builds its foliage
  const CLUMPS = [[[17, 13, 10], [8, 18, 7], [26, 17, 7.5], [12, 8, 6], [23, 8, 6.5], [17, 20, 8]], [[16, 12, 9], [7, 16, 6.5], [25, 14, 8], [16, 6, 6], [20, 19, 8], [10, 21, 6]]];
  const kusu = (v, dir) => bake('kusu' + v, 34, 34, (x, y) => {
    for(const [px, py, r] of CLUMPS[v]){ const dx = x + .5 - px, dy = y + .5 - py, rr = r * (.86 + .22 * hash(Math.floor(x / 2) * 3.7 + Math.floor(y / 2) * 9.1 + v)); if(dx * dx + dy * dy <= rr * rr) return hash(x * 5.3 + y * 9.7 + v) > .8 ? 101 : 1; }
    const tc = 17 + (34 - y) * (v ? -.06 : .06); if(y > 20 && Math.abs(x + .5 - tc) < (y > 30 ? 1.9 : 1.2)) return 2; return 0; }, dir);
  // stone lantern (tōrō): knob, curled roof, firebox with a lit window, platform, post, base; the stone round the window takes the warm light
  const WIN = '#ffe2a0', CORE = '#fff6d8', WARM = '#b07a44', WARM2 = '#7a5434';
  const toro = dir => bake('toro', 14, 30, (x, y) => { const d = Math.abs(x + .5 - 7);
    if(y < 2) return d < 1 ? 3 : 0; if(y === 2) return d < 2 ? 3 : 0; if(y === 3) return d < 4 ? 3 : 0; if(y === 4) return d < 6 ? 3 : 0;
    if(y === 5) return d < 7 ? 3 : 0; if(y === 6) return d < 3 ? WARM2 : d < 5.5 ? 3 : 0;
    if(y >= 7 && y <= 12){ if(d >= 4) return 0; if(y >= 8 && y <= 11 && d < 2) return y >= 9 && y <= 10 && d < 1 ? CORE : WIN; if(d < 3 && y >= 7) return WARM; return 3; }
    if(y === 13) return d < 3 ? WARM2 : d < 5 ? 3 : 0; if(y === 14) return d < 5 ? 3 : 0;
    if(y >= 15 && y <= 23) return d < (y === 19 ? 2.6 : 1.8) ? 3 : 0; if(y <= 25) return d < 3.5 ? 3 : 0; if(y <= 27) return d < 4.5 ? 3 : 0; return d < 5.5 ? 3 : 0; }, dir);
  // jizō: little stone guardians in red knit caps and bibs
  const jizo = dir => bake('jizo', 9, 13, (x, y) => { const d = Math.abs(x + .5 - 4.5);
    if(y === 0) return d < 1.6 ? 6 : 0; if(y <= 2) return d < 2.8 ? 6 : 0; if(y <= 5) return d < 2.6 ? 3 : 0;
    if(y === 6) return d < 3.4 ? 6 : 0; if(y === 7) return d < 2.6 ? 6 : d < 3.5 ? 3 : 0; if(y === 8) return d < 1.4 ? 6 : d < 3.5 ? 3 : 0;
    if(y <= 11) return d < 3.5 ? 3 : 0; return d < 4.5 ? 3 : 0; }, dir);
  // torii: black kasagi sweeping up at the tips, vermilion beams and posts, a plaque, a straw rope with paper shide
  const PAPER = '#eeeae0', PAPER2 = '#9a98a8', GOLD = '#c8a04a', PLQ = '#120c10';
  const torii = dir => bake('torii', 76, 54, (x, y) => { const d = Math.abs(x + .5 - 38), top = 3 - Math.max(0, d - 25) * .32;
    if(d < 38 && y >= Math.round(top) && y < Math.round(top) + 3) return 5;
    if(d < 35 && y >= Math.round(top) + 3 && y < Math.round(top) + 5) return 4;
    if(y >= 9 && y <= 16 && d < 5){ if(y === 9 || y === 16 || d >= 4) return GOLD; return PLQ; }
    if(y >= 17 && y <= 19 && d < 33) return 4;
    const pd = Math.abs(d - 22); if(y >= 48 && pd < 3.3) return 5; if(y > 5 && pd < 2.6) return 4;
    const ry = 22 + 3 * (1 - (d / 20) * (d / 20)); if(d < 19.6 && y >= Math.round(ry) && y < Math.round(ry) + 3) return (x + y) % 4 === 0 ? 107 : 7;
    for(const sx of [-11, 11]){ const xx = x - 38 - sx, y0 = Math.round(22 + 3 * (1 - (sx / 20) * (sx / 20))) + 3; if(y >= y0 && y < y0 + 6){ const off = ((y - y0) >> 1) % 2; if(xx === off - 1 || xx === off) return (y - y0) % 2 ? PAPER2 : PAPER; } }
    return 0; }, dir);
  // red and white curve chevrons, the bend's warning (OutRun, Top Gear read the same way)
  const CHR = '#d02838', CHW = '#f6f2ea', CHK = '#1a1214';
  const chevron = r => procSprite('pass_chev' + r, 11, 17, (x, y) => { const xx = r > 0 ? x : 10 - x;
    if(y <= 9){ if(y === 0 || y === 9 || x === 0 || x === 10) return CHK; const ax = 3 + Math.round(3 - Math.abs(y - 4.5)); return xx === ax || xx === ax + 1 ? CHW : CHR; }
    return x >= 4 && x <= 6 ? (x === 4 ? '#4a4a58' : '#24242e') : null; });
  // a sakura by the shrine: blossom pads pale pink, lit by the lanterns below
  // ---------------------------------------------------------------- cliff kit (studied: the Route 41 落石注意 cutting, Irohazaka's slopes, a Nikko curve mirror;
  // pixel rock from Celeste and Sword & Sworcery: rock is CLUSTERS of facets, each with a lit top plane, a mid face and a dark underside, never noise)
  const ROCK = ['#080d10', '#162026', '#25323a', '#3a4b54', '#7f97a4'];   // crack, underside, face, top plane, moon edge
  const rockSpr = v => SPR['pass_rock' + v] || procSprite('pass_rock' + v, 22, 15, (() => { let sd = v * 7919 + 3; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const seeds = []; for(let i = 0; i < 6; i++) seeds.push([1 + R() * 20, 1 + R() * 13]); const wide = .85 + R() * .3, g = [];
    const inside = (x, y) => { const dx = (x + .5 - 11) / (11 * wide), dy = (y + .5 - 8) / 7.5; return dx * dx + dy * dy * (dy < 0 ? 1.3 : .8) <= .92 + .18 * hash(v * 31 + Math.floor(x / 3) * 5 + Math.floor(y / 3) * 3); };
    const fac = (x, y) => { let b = 0, bd = 1e9; seeds.forEach(([sx, sy], i) => { const d = (x - sx) * (x - sx) * .6 + (y - sy) * (y - sy) * 1.4; if(d < bd){ bd = d; b = i; } }); return b; };
    for(let y = 0; y < 15; y++) for(let x = 0; x < 22; x++) g[y * 22 + x] = inside(x, y) ? fac(x, y) : -1;
    const at = (x, y) => x < 0 || y < 0 || x >= 22 || y >= 15 ? -1 : g[y * 22 + x];
    return (x, y) => { const f = at(x, y); if(f < 0) return null; const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y);
      if(up < 0) return ROCK[4]; if(dn < 0) return ROCK[0]; if(up !== f) return ROCK[3]; if(dn !== f) return ROCK[1]; if(lf !== f && lf >= 0) return ROCK[0];
      return seeds[f][1] < 5 ? ROCK[3] : ROCK[2]; }; })());
  // the same rock at R times the resolution (nearprops): the facets from the same seeds in continuous coordinates; 1 px moon edge, cracks
  // and outline, the lit top plane and the dark underside a sprite pixel thick, as in the sprite
  const rockHi = (v, R) => SPR['pass_hi_rock' + v + '_' + R] || procSprite('pass_hi_rock' + v + '_' + R, 22 * R, 15 * R, (() => { let sd = v * 7919 + 3; const Rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const seeds = []; for(let i = 0; i < 6; i++) seeds.push([1 + Rn() * 20, 1 + Rn() * 13]); const wide = .85 + Rn() * .3, e = 1 / R;
    const at = (X, Y) => { if(X < 0 || Y < 0 || X >= 22 || Y >= 15) return -1; const dx = (X - 11) / (11 * wide), dy = (Y - 8) / 7.5; if(dx * dx + dy * dy * (dy < 0 ? 1.3 : .8) > .92 + .18 * hash(v * 31 + Math.floor(X / 3) * 5 + Math.floor(Y / 3) * 3)) return -1;
      let b = 0, bd = 1e9; for(let i = 0; i < 6; i++){ const d = (X - .5 - seeds[i][0]) ** 2 * .6 + (Y - .5 - seeds[i][1]) ** 2 * 1.4; if(d < bd){ bd = d; b = i; } } return b; };
    return (x, y) => { const X = (x + .5) / R, Y = (y + .5) / R, f = at(X, Y); if(f < 0) return null;
      if(at(X, Y - e) < 0) return ROCK[4]; if(at(X, Y + e) < 0 || at(X - e, Y) < 0) return ROCK[0]; const lf = at(X - e, Y); if(lf !== f) return ROCK[0];
      if(at(X, Y - 1) !== f) return ROCK[3]; if(at(X, Y + .75) !== f) return ROCK[1]; return seeds[f][1] < 5 ? ROCK[3] : ROCK[2]; }; })());
  const TUFT = { a:'#1e3626', b:'#36583e', c:'#7aa486' };
  const tuftSpr = v => procSprite('pass_tuft' + v, 9, 6, (x, y) => { const h = [3, 5, 6, 4, 3, 2][(x + v) % 6] - (v + x) % 2;
    if(5 - y >= h || ((x + v * 3) % 4 === 3 && y < 4)) return null; return y === 6 - h ? TUFT.c : y > 4 ? TUFT.a : TUFT.b; });
  // 落石注意: yellow falling-rocks diamond over a white plate (as on Route 41)
  const signSpr = dir => procSprite('pass_sign' + (dir > 0 ? 'R' : 'L'), 15, 28, (x, y) => { const d = Math.abs(x - 7) + Math.abs(y - 7);
    if(y <= 14){ if(d > 7.2) return null; if(d > 6.2) return '#1a1410';
      if(y >= 9 && y <= 10 && x >= 3 && x <= 11) return '#1a1410';
      if(y >= 5 && y <= 8 && x >= 7 && x <= 11 && x - 7 >= 8 - y) return '#1a1410'; if((x === 4 && y === 5) || (x === 5 && y === 7) || (x === 3 && y === 7)) return '#1a1410'; return y < 4 ? '#ffd050' : '#f0b020'; }
    if(y >= 16 && y <= 20 && x >= 1 && x <= 13){ if(y === 16 || y === 20 || x === 1 || x === 13) return '#3a3a40'; return (y === 18 && x % 3 !== 1) || (y === 17 && x % 3 === 0) ? '#202028' : '#e8e6de'; }
    return x >= 6 && x <= 8 && y > 14 ? (x === (dir > 0 ? 8 : 6) ? '#b8c4d4' : x === 7 ? '#5a606a' : '#2a2e36') : null; });   // the post: a moonlit edge so it reads against the cedars
  // カーブミラー: an orange post and a round convex mirror holding a sliver of sky and the road
  const mirrorSpr = () => procSprite('pass_mirror', 14, 34, (x, y) => { const dx = x + .5 - 7, dy = y + .5 - 7, r = Math.sqrt(dx * dx + dy * dy);
    if(r <= 6.8){ if(r > 5.6) return r > 6.3 ? '#5a2410' : dx - dy < 0 ? '#ff9a50' : '#d8601e'; if(dy < -1) return dx < 0 ? '#9ab4cc' : '#5a7090'; if(dy < 1) return '#2a3a5a'; return Math.abs(dx) < 1 ? '#c8c0a0' : '#1a2030'; }
    if(y > 13 && x >= 6 && x <= 7) return x === 6 ? '#ff9a50' : '#c8541a'; if(y === 33 && x >= 5 && x <= 8) return '#3a3a40'; return null; });
  // ---------------------------------------------------------------- per-frame colour cache (fogged colours)
  let fogLow = '', FC = new Map();
  const fc = (col, fog, low) => { if(low !== fogLow){ fogLow = low; FC.clear(); } const q = Math.round(fog * 20), k = col + q; let v = FC.get(k); if(!v){ v = mixc(col, low, q / 20 * .85); FC.set(k, v); } return v; };
  // ordered-dither fills (Bayer 4x4), one canvas pixel per cell
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], PATS = new Map();
  // colours snap to a 32-level grid per channel, so a slowly changing sky reuses patterns instead of building new ones every few frames
  const q5 = col => { const [r, g, b] = hx(col); return '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); };
  function pat(col, dens){ return ditherPat(col[0] === '#' || col.startsWith('rgb') ? q5(col) : col, dens); }   // the engine's pattern cache: no canvas per colour
  const snap = v => Math.round(v / PX) * PX;
  // a stepped light pool on the ground, flattened by perspective
  // (three nested ellipses as whole-pixel rows: the old antialiased ellipses left soft edge pixels that crawled as the pool slid past)
  const POOL_FM = [1, .1, .62, .16, .32, .22];   // the pool's three nested ellipses: size, alpha
  function pool(x, y, rx, ry, col, a){ if(rx < 2 || a <= 0) return; const [R, G, B] = hx(col); cx.globalCompositeOperation = 'lighter';
    for(let q = 0; q < 6; q += 2){ const f = POOL_FM[q], m = POOL_FM[q + 1]; cx.fillStyle = `rgba(${R},${G},${B},${a * m})`; const ex = rx * f, ey = Math.max(PX, ry * f), r0 = Math.round((y - ey) / PX), r1 = Math.round((y + ey) / PX);
      for(let r = r0; r < r1; r++){ const v = ((r + .5) * PX - y) / ey, hw = ex * Math.sqrt(Math.max(0, 1 - v * v)); if(hw < PX / 2) continue; const a0 = Math.round((x - hw) / PX), a1 = Math.round((x + hw) / PX); if(a1 > a0) cx.fillRect(a0 * PX, r * PX, (a1 - a0) * PX, PX); } }
    cx.globalCompositeOperation = 'source-over'; }
  // ---------------------------------------------------------------- value noise for ridges
  const vn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  const ridged = x => 1 - Math.abs(vn(x) * 2 - 1);
  const RIDGES = [   // far to near: parallax, frequency, height, seed
    { par:'far', f:.0042, amp:.3, seed:11 }, { par:'mid', f:.0068, amp:.2, seed:47 }, { par:'near', f:.011, amp:.12, seed:83 } ];
  const ridgeH = (wx, R) => { const a = wx * R.f; return .55 * vn(a + R.seed) + .38 * ridged(a * 2.3 + R.seed * 3) + .07 * vn(a * 9 + R.seed); };
  let YS = new Float32Array(0);
  function ridge(R, off, hz, col, moonCol, rimK, moonX){ const n = Math.ceil(W / PX) + 3; if(YS.length < n) YS = new Float32Array(n);
    for(let i = 0; i < n; i++){ const x = (i - 1) * PX; YS[i] = snap(hz - ridgeH(x + off, R) * R.amp * H); }
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(-PX, hz + 4 * PX); for(let i = 0; i < n; i++){ const x = (i - 1) * PX; cx.lineTo(x, YS[i]); cx.lineTo(x + PX, YS[i]); } cx.lineTo(W + PX, hz + 4 * PX); cx.closePath(); cx.fill();
    // backlit rim: a 1px crest line everywhere near the moon, thicker and dithered on slopes that face it; three hard steps of falloff
    const strong = new Path2D(), soft = new Path2D(), faint = new Path2D();
    for(let i = 1; i < n - 1; i++){ const x = (i - 1) * PX, dir = moonX > x ? 1 : -1, fall = Math.floor(clamp(1.15 - Math.abs(x - moonX) / (W * .55), 0, 1) * 3) / 3;
      if(fall <= 0) continue; const faces = (YS[i + 1] - YS[i - 1]) * dir > 0, y = YS[i];
      if(faces){ const d = Math.round(fall * 2); strong.rect(x, y, PX, PX * d); soft.rect(x, y + PX * d, PX, PX * Math.round(1 + fall * 4 * Math.min(1, Math.abs(YS[i + 1] - YS[i - 1]) / PX / 2))); }
      else if(fall > .5) faint.rect(x, y, PX, PX); }
    cx.fillStyle = mixc(col, moonCol, rimK); cx.fill(strong); cx.fillStyle = mixc(col, moonCol, rimK * .5); cx.fill(faint); cx.fillStyle = pat(mixc(col, moonCol, rimK * .6), .5); cx.fill(soft); }
  // mist pooled in a valley: three nested dither densities, a slow wavy top
  const MIST_D = [.25, .5, .75];   // the mist's three dither densities
  function mist(y0, y1, col, now, seed, moonX, moonCol){ const h = y1 - y0, cw = PX * 6, t = reduce ? 0 : now / 9000;
    for(let k = 0; k < 3; k++){ const dens = MIST_D[k], p = new Path2D();
      for(let x = -cw; x < W + cw; x += cw){ const wx = x + seed * 100, top = snap(y0 + h * k * .33 + (vn(wx * .012 + t + seed) - .5) * h * .5); if(top < y1) p.rect(x, top, cw, y1 - top); }
      cx.fillStyle = pat(col, dens); cx.fill(p); }
    // moonlight caught in the mist under the moon, in two hard steps that follow the mist's wavy top
    const lc = mixc(col, moonCol, .4), p1 = new Path2D(), p2 = new Path2D();
    for(let x = Math.floor((moonX - W * .22) / cw) * cw; x < moonX + W * .22; x += cw){ const d = Math.abs(x + cw / 2 - moonX), top = snap(y0 + h * .3 + (vn((x + seed * 100) * .012 + t + seed) - .5) * h * .5);
      if(top >= y1) continue; if(d < W * .22 * (.75 + .25 * vn(x * .05 + seed))) p1.rect(x, top, cw, y1 - top); if(d < W * .09 * (.7 + .3 * vn(x * .07 + seed * 3))) p2.rect(x, top + snap(h * .15), cw, Math.max(0, y1 - top - snap(h * .15))); }
    cx.fillStyle = pat(lc, .125); cx.fill(p1); cx.fillStyle = pat(lc, .25); cx.fill(p2); }
  // thin flat cloud streaks crossing the moon (Sword & Sworcery), rim-lit on the side toward it
  function clouds(now, sk, moonX, moonY, moonCol){ const drift = reduce ? 0 : now * .004, span = W * 1.6;
    for(let i = 0; i < 5; i++){ const len = snap(W * (.08 + hash(i * 7) * .12)), y = snap(moonY + (i - 2) * H * .04 + hash(i * 3) * H * .02), x0 = snap(((hash(i * 5) * span - skyPar('sky') + drift * (1 + i * .3)) % span + span) % span - W * .3);
      const near = Math.round(clamp(1.2 - Math.abs(x0 + len / 2 - moonX) / (W * .25), 0, 1) * 2) / 2, body = mixc(sk.mid, moonCol, .1 + near * .12), shade = mixc(sk.mid, '#04030a', .25), rim = mixc(sk.mid, moonCol, .25 + near * .45);
      const j = hash(i * 11); let yy = y;
      yy = cloudRow(x0, yy, len, .25 + j * .1, .5 + j * .1, rim, 1); yy = cloudRow(x0, yy, len, .1, .7, body, 2); yy = cloudRow(x0, yy, len, 0, .92 - j * .2, body, 2); yy = cloudRow(x0, yy, len, .15 + j * .2, 1, body, 1); cloudRow(x0, yy, len, .3, .85, shade, 1); } }
  function cloudRow(x0, yy, len, a, b, c, n){ cx.fillStyle = c; cx.fillRect(x0 + snap(len * a), yy, snap(len * (b - a)), PX * n); return yy + PX * n; }   // one row of a cloud streak (a..b of its length, n pixels tall)
  // the valley town far below: sodium and white pin-lights in a cluster, a warm haze over it
  function town(off, hz, now, moonCol){ const per = 950, base = Math.floor(off / per);
    for(let b = base - 1; b <= base + 2; b++){ const cxp = b * per - off + per * (.3 + hash(b * 3.7) * .4), wide = 70 + hash(b) * 70; if(cxp + wide < 0 || cxp - wide > W) continue;
      glow(cxp, hz - PX * 9, wide * .9, '#ff9a50', .12);
      for(let j = 0; j < 46; j++){ const r = hash(b * 101 + j), dx = (hash(b * 57 + j * 3.3) - .5) * 2, x = snap(cxp + dx * Math.abs(dx) * wide), y = snap(hz - PX * 5 - hash(b * 13 + j * 7.7) * (1 - Math.abs(dx) * .7) * PX * 12);
        if(!reduce && hash(j * 9 + b + Math.floor(now / 380)) > .93) continue;
        cx.fillStyle = r > .86 ? '#9ae8ff' : r > .55 ? '#fff2d8' : '#ffc070'; cx.fillRect(x, y, PX, PX); }
      if(reduce || Math.sin(now / 600 + b) > 0){ cx.fillStyle = '#ff4030'; cx.fillRect(snap(cxp + wide * .3), snap(hz - PX * 20), PX, PX); } } }
  // Irohazaka seen from across the valley: a switchback road stacked up the mid ridge as thin guardrail lines, one car's lights climbing it
  function switchbacks(off, hz, R, col, now){ const per = 1300, base = Math.floor(off / per), lc = mixc(col, '#d8dee8', .45), dk = mixc(col, '#05080a', .3);
    for(let b = base - 1; b <= base + 1; b++){ const cxp = b * per - off + per * (.25 + hash(b * 4.1) * .5); if(cxp < -80 || cxp > W + 80) continue;
      const crest = hz - ridgeH(cxp + off, R) * R.amp * H, top = crest + (hz - crest) * .3, rows = 5, wv = 34 + hash(b) * 26, pts = [];
      if(hz - top < PX * 12) continue;
      for(let r = 0; r <= rows; r++){ const yy = snap(hz - PX * 3 - (hz - PX * 3 - top) * r / rows), xa = snap(cxp - wv / 2 + r * 3), xb = snap(cxp + wv / 2 - r * 3); pts.push(r % 2 ? [xb, xa, yy] : [xa, xb, yy]); }
      for(let r = 0; r < rows; r++){ const [a0, a1, yy] = pts[r], ny = pts[r + 1][2]; cx.fillStyle = dk; cx.fillRect(Math.min(a0, a1), yy + PX, Math.abs(a1 - a0) + PX, PX);
        cx.fillStyle = lc; cx.fillRect(Math.min(a0, a1), yy, Math.abs(a1 - a0) + PX, PX); cx.fillRect(a1, ny, PX, yy - ny + PX); }
      const T = reduce ? .4 : (now / 14000 + hash(b * 9)) % 1, sg = T * rows, r = Math.floor(sg), fr = sg - r, [a0, a1, yy] = pts[r];
      cx.fillStyle = '#fff6d0'; cx.fillRect(snap(a0 + (a1 - a0) * fr), yy - PX, PX, PX); glow(a0 + (a1 - a0) * fr, yy - PX, PX * 4, '#fff0b0', .25); } }
  // the near tree line: a crenellated band of cedar tips right on the horizon
  function treeline(off, hz, col, rim, moonX){ const step = PX * 3, o0 = ((off % step) + step) % step, path = new Path2D(), rp = new Path2D();
    for(let x = -step - o0; x < W + step; x += step){ const wx = Math.round((x + off) / step), h = snap(PX * (2 + hash(wx) * 5 + vn(wx * .08) * 6)), y = snap(hz) - h;
      path.rect(x + PX, y, PX, h + PX * 4); path.rect(x, y + PX * 2, PX * 3, h + PX * 2);
      if(Math.abs(x - moonX) < W * .35) rp.rect(x + (moonX > x ? PX * 2 : 0), y + PX * 2, PX, PX), rp.rect(x + PX, y, PX, PX); }
    cx.fillStyle = col; cx.fill(path); cx.fillStyle = rim; cx.fill(rp); }
  // ---------------------------------------------------------------- placement
  const SHR = 400, WALLH = 1.25, LEAN = .3, RAMP = 30, CLIFFX = 1.16;
  // where a cliff wants to be: the inside of a sharp bend, or a cutting on a straight; never by the shrine
  function want(j, side){ const t = segs[j]; if(!t) return 0; const sh = j % SHR; if(sh > 166 && sh < 240) return 0; const c = t.curve, ac = Math.abs(c);
    if(ac > 1.3) return Math.sign(c) === side ? 1 : 0; if(ac < .4 && hash(Math.floor(j / 70) * 7.3) > .68) return (hash(Math.floor(j / 70) * 3.1) > .5 ? 1 : -1) === side ? 1 : 0; return 0; }
  // cliff height 0..1 along the road: a smoothed profile that rises from a low bank ~RAMP segments before the bend and tapers after it
  // (every segment is tested: stepping d by 2 made the profile rise in pairs, so slices alternated flat and steep and the crest was a sawtooth)
  function cliffH(i, side){ let m = 0; for(let d = -RAMP; d <= RAMP && m < 1; d++){ if(want(i + d, side)) m = Math.max(m, 1 - Math.abs(d) / RAMP); } return m * m * (3 - 2 * m); }
  // is a 落石注意 sign placed on side sd within 6 segments of j (the same test as place() below)
  const signNear = (j, sd) => { for(let d = -6; d <= 6; d++){ const t = j + d; if(cliffH(t, -sd) > .04 && cliffH(t - 1, -sd) <= .04 && cliffH(t, sd) < .35) return true; } return false; };
  /* The ravine jump (setpiece/jump.js 'RAVINE JUMP', research/sundown-craft/jumpsides.md). o = segment - plan.b0: the ramp is 0..JNL-1,
     the ravine JNL..JNL+JG-1 (the jump paints the gorge floor there), the far leaf after. The pass carries on beside the ramp and the
     landing; across the ravine it ends the way a real cutting does: the cut slope steps down to the lip over JSTEP segments and climbs back
     on the far side, the guard rail ends at each lip in a 袖ビーム (the bent end beam of a Japanese guard rail, turned away from the
     road), and the cedars stand down in the gorge, only their tops showing over the near lip, deeper toward the middle. */
  const JNL = 22, JG = 22, JSTEP = 7;
  const jumpO = j => { const t = segs[j], p = t && t.spjP; return p && p.kind === 'bridge' ? j - p.b0 : null; };
  const inGap = o => o !== null && o >= JNL && o < JNL + JG;
  function gapF(j){ const o = jumpO(j); if(o === null || o < JNL - JSTEP || o >= JNL + JG + JSTEP) return 1; if(o >= JNL && o < JNL + JG) return 0;
    const u = (o < JNL ? JNL - o : o - JNL - JG + 1) / (JSTEP + 1); return u * u * (3 - 2 * u); }
  const cutH = (j, side) => cliffH(j, side) * gapF(j);
  function place(i, s){
    const c = s.curve, ac = Math.abs(c), sp = s.sprites, sh = i % SHR, nearShrine = sh > 176 && sh < 232, hs = {}, jo = jumpO(i), gap = inGap(jo), rl = { '-1':false, '1':false };
    s.passH = hs; s.passRl = rl;
    for(const side of [-1, 1]){
      const h = cutH(i, side), hn = cutH(i + 1, side); hs[side] = h;
      if(h > .01 || hn > .01) sp.push({ env:'pass', type:'wall', x:side * CLIFFX, s, h, h2:hn, k:i });
      if(h > .35){ if(i % 4 === 0 && h > .6){ const dx = .5 + hash(i * 1.7) * 1.2; sp.push({ env:'pass', type:'tree', x:side * (CLIFFX + LEAN + dx), k:i * 4, lift:WALLH * h + hillS(i) * h * clamp((dx + LEAN * (1 - h)) / HD, 0, 1) - .04, sz:.7 + hash(i * 2.3) * .4 }); } continue; }
      if(gap){   // the ravine: no rail, no roadside life; cedars down in the gorge (sink: how far below the lip, in road half-widths)
        if(h > .01) continue; const u = (jo - JNL + .5) / JG, dp = Math.pow(Math.sin(Math.PI * u), .7);
        if(hash(i * 3.1 + side) < .5) sp.push({ env:'pass', type:'tree', x:side * (1.5 + hash(i * 1.3 + side) * 5.2), k:i * 2 + (side > 0 ? 1 : 0), sz:.9 + hash(i * 5.1 + side) * .5, lift:-(.25 + .85 * dp) * (.85 + .3 * hash(i * 2.7 + side)), deep:dp });
        continue; }
      rl[side] = true; sp.push({ env:'pass', type:'rail', x:side * 1.12, s, post:i % 4 === 0 || jo === JNL - 1 || jo === JNL + JG, k:i, term:jo === JNL - 1 ? 1 : jo === JNL + JG ? -1 : 0 });
      if(h > .01) continue;
      if(hash(i * 3.1 + side) < .28) sp.push({ env:'pass', type:'tree', x:side * (2.2 + hash(i * 1.3 + side) * 4.5), k:i * 2 + (side > 0 ? 1 : 0), sz:.8 + hash(i * 5.1 + side) * .5 });
      if(i % 4 === 0 && !nearShrine && hash(i * .7 + side * 9) < .45) sp.push({ env:'pass', type:'ff', x:side * (1.35 + hash(i * 4.4) * 1.6), k:i * 3 + side });
      if(i % 56 === 28 && !nearShrine && side === ((i / 56 | 0) % 2 ? 1 : -1)) sp.push({ env:'pass', type:'toro', x:side * 1.42, k:i });
      if(i % 170 === 85 && !nearShrine) sp.push({ env:'pass', type:'jizo', x:side * 1.5, k:i });
    }
    // chevrons on the outside of a sharp bend
    if(gap) return;   // (the ravine: nothing stands on the gorge floor but its cedars)
    const outS = -Math.sign(c); if(ac > 2.4 && i % 45 === 0 && hs[outS] < .35 && !signNear(i, outS)) sp.push({ env:'pass', type:'mirror', x:outS * 1.24, k:i });   // (never in front of a 落石注意 sign: the two stood in the same spot and the mirror's disc covered the diamond)
    for(const side of [-1, 1]) if(hs[side] > .04 && cliffH(i - 1, side) <= .04 && hs[-side] < .35) sp.push({ env:'pass', type:'sign', x:-side * 1.22, k:i });
    const out = -Math.sign(c); if(ac > 2.4 && hs[out] < .35 && i % 7 === 0) sp.push({ env:'pass', type:'chev', x:out * 1.3, r:Math.sign(c), k:i });
    // the shrine: a torii over the road, lanterns at its feet, a sakura and jizō beside it
    if(sh === 200){ sp.push({ env:'pass', type:'torii', x:0, k:i }, { env:'pass', type:'toro', x:-1.62, k:i }, { env:'pass', type:'toro', x:1.62, k:i + 1 }); }
    if(sh === 186) sp.push({ env:'pass', type:'toro', x:-1.5, k:i }, { env:'pass', type:'toro', x:1.5, k:i + 1 });
    if(sh === 214) sp.push({ env:'pass', type:'sakura', x:-2.3, k:i }, { env:'pass', type:'jizo', x:1.55, k:i });
    s.passLit = s.passLit || 0;
    const L = (n, v) => { v *= .55; const t = segs[n]; if(t) t.passLit = Math.max(t.passLit || 0, v); };
    if(i % 56 === 28 && !nearShrine || sh === 186 || sh === 200) for(let d = -3; d <= 2; d++){ const v = 1 - Math.abs(d) / 4; L(i + d, v); if(d < 0){ const t = segs[i + d]; if(t) t.lit = Math.max(t.lit || 0, v * .55); } }
  }
  // ---------------------------------------------------------------- drawing
  const RAIL = { top:'#d6dde8', body:'#7c8498', groove:'#3c4256', post:'#2a2e3a' };
  // far away, one quad spans 2-4 segments (fewer draw calls; at that size nobody can tell)
  const SPAN = f => { f = fogPx(f); return f > .7 ? 4 : f > .45 ? 3 : f > .25 ? 2 : 1; };   // tiers by screen size (fogPx: the fog the old 260-segment draw distance gave here)
  // (a span never runs past the rail's end: it stops at the last segment that has one, and a rail's first segment always draws, so a run
  // that starts mid-span, after a cliff or a ravine, starts where it should instead of up to three segments late)
  const hasR = (j, sd) => { const t = segs[j]; return !!(t && t.passRl && t.passRl[sd]); };
  let RE = 0;   // the span's last segment index (set by farEnd)
  // (each segment's span from its own distance, and a run goes on to the next start, as the cliff's spans do (spanAt, below): running to the
  // next multiple of the start's own span left a one-to-three-segment hole in the rail wherever the tiers changed, which slid along with the camera)
  const rSpan = (j, b0) => SPAN(clamp(Math.pow((j - b0) / DRAW_N, 1.6), 0, 1));
  const farEnd = (sp, fog) => { const i = sp.s.index, sd = sp.x < 0 ? -1 : 1, b0 = i - Math.round(DRAW_N * Math.pow(fog, 1 / 1.6)); if(i % rSpan(i, b0) && hasR(i - 1, sd)) return null;
    let e = i + 1; while(e < i + 8 && e % rSpan(e, b0) && hasR(e, sd)) e++; const t = segs[e - 1]; RE = t && t.p2.screen.w ? e - 1 : i; return segs[RE].p2; };
  /* 袖ビーム: where a Japanese guard rail ends, its last beam bends away from the road in a rounded curl (so a car can't spear its end).
     Drawn in the road's own projection off segment T's p1 -> p2 (f0 = 1: the curl runs on past T's far edge; f0 = 0: it comes back toward
     the camera before T's near edge): the beam face turning outward and darkening as it turns, its moonlit top edge, the cut edge of the
     steel, and an end post with its delineator. */
  const CURL = [[0, 0], [.16, .012], [.28, .035], [.35, .065]]; let CURLC = null;
  function railEnd(T, f0, side, fog, low){ const a = T.p1.screen, b = T.p2.screen; if(!a.w || !b.w || T.p1.camera.z < SEG * .6) return; const dir = f0 ? 1 : -1;
    const pt = (f, X, hk) => { const w = a.w + (b.w - a.w) * f; return [a.x + (b.x - a.x) * f + X * w, a.y + (b.y - a.y) * f - hk * w, w]; };
    const Q = CURL.map(([df, dx]) => { const f = f0 + dir * df, X = side * (1.12 + dx); return [pt(f, X, .17), pt(f, X, .095)]; });
    const bodyC = CURLC || (CURLC = [RAIL.body, mixc(RAIL.body, RAIL.groove, .25), mixc(RAIL.body, RAIL.groove, .6), RAIL.groove, mixc(RAIL.top, RAIL.body, .55)]);
    const e0 = pt(f0, side * 1.12, 0), w0 = e0[2];
    // the end post first (the beam is bolted to its road face)
    cx.fillStyle = fc(RAIL.post, fog, low); pxRect(e0[0] - w0 * .012, Q[0][0][1] - w0 * .015, Math.max(PX, w0 * .025), e0[1] - Q[0][0][1] + w0 * .015);
    for(let k = 0; k < 3; k++){ const [t0, b0] = Q[k], [t1, b1] = Q[k + 1]; poly(t0[0], t0[1], t1[0], t1[1], b1[0], b1[1], b0[0], b0[1], fc(bodyC[k + 1], fog, low));
      poly(t0[0], t0[1], t1[0], t1[1], t1[0], t1[1] + PX, t0[0], t0[1] + PX, fc(k < 2 ? RAIL.top : bodyC[4], fog, low)); }
    const [tE, bE] = Q[3]; cx.fillStyle = fc(RAIL.groove, fog, low); pxRect(tE[0] - (side > 0 ? 0 : PX), tE[1], PX, Math.max(PX, bE[1] - tE[1]));   // the cut edge of the steel
    const sz = Math.max(PX, w0 * .035), ry = Q[0][0][1] - w0 * .015 - sz, near = clamp(1.25 - fog * 3, 0, 1);
    if(sz > PX * 2.5) reflector(e0[0], ry, sz, near > .66 ? '#ffb040' : near > .33 ? '#ffc060' : fc('#d07028', fog, low), near > .66); else { cx.fillStyle = near > .33 ? '#ffc060' : fc('#d07028', fog, low); pxRect(e0[0] - sz / 2, ry, sz, sz); } }
  function drawRail(sp, x, y, uw, fog){ const nx = farEnd(sp, fog); if(!nx) return; const p = nx.screen; if(!p.w) return; const x2 = p.x + sp.x * p.w, y2 = p.y, u2 = p.w, low = fogLow, re = RE;
    if(fog <= .25){ const sd = sp.x < 0 ? -1 : 1; if(sp.term < 0) railEnd(sp.s, 0, sd, fog, low); if(jumpO(re) === JNL - 1 && segs[re].passRl[sd]) railEnd(segs[re], 1, sd, fog, low); }
    const h1 = uw * .17, h2 = u2 * .17, t1 = Math.max(PX, uw * .075), t2 = Math.max(PX, u2 * .075);
    if(sp.post){ cx.fillStyle = fc(RAIL.post, fog, low); pxRect(x - uw * .012, y - h1 - t1 * .2, Math.max(PX, uw * .025), h1 + t1 * .2); }
    // far rails are a few pixels tall: plain rects (no path tessellation), one light line over the beam
    if(fog > .25){ const l = Math.min(x, x2), r = Math.max(x, x2), tp = Math.min(y - h1, y2 - h2), bt = Math.max(y - h1 + t1, y2 - h2 + t2); cx.fillStyle = fc(fog > .45 ? RAIL.top : RAIL.body, fog, low); pxRect(l, tp, Math.max(PX, r - l), Math.max(PX, bt - tp)); if(fog <= .45){ cx.fillStyle = fc(RAIL.top, fog, low); pxRect(l, tp, Math.max(PX, r - l), PX); } return; }
    poly(x, y - h1, x2, y2 - h2, x2, y2 - h2 + t2, x, y - h1 + t1, fc(RAIL.body, fog, low));
    if(t1 > PX * 2.5) poly(x, y - h1 + t1 * .45, x2, y2 - h2 + t2 * .45, x2, y2 - h2 + t2 * .62, x, y - h1 + t1 * .62, fc(RAIL.groove, fog, low));
    poly(x, y - h1, x2, y2 - h2, x2, y2 - h2 + Math.min(PX, t2), x, y - h1 + Math.min(PX, t1), fc(RAIL.top, fog, low));
    // delineator on the post: amber, flaring white-gold as the headlight reaches it
    if(sp.post){ const near = clamp(1.25 - fog * 3, 0, 1), sz = Math.max(PX, uw * .035), ry = y - h1 - t1 * .2 - sz;
      const dc = near > .66 ? '#fff0b8' : near > .33 ? '#ffc060' : fc('#d07028', fog, low); if(sz > PX * 2.5) reflector(x, ry, sz, near > .66 ? '#ffb040' : dc, near > .66); else { cx.fillStyle = dc; pxRect(x - sz / 2, ry, sz, sz); }
      if(near > .33 && uw > 18) glow(x, ry + sz / 2, uw * .12, '#ffb050', .5 * near); } }
  // the cut side of a bend: a dark rock cliff in vertical columns (one shade per segment), moonlit ledges, moss, a concrete footing and a grassy crest
  const WC = { rock:['#0c1214', '#101719', '#0e1518', '#131b1c'], ledge:'#3a4a54', ledgeD:'#070b0d', foot:'#2c323c', footL:'#4a525e', moss:'#16281f', rim:'#8ea8b4', crest:'#081011', leaf:'#4e7472', cell:'#0e1611', latL:'#7a848c', latD:'#20262c', latM:'#46505a', latF:'#3a444c', grass:'#1a3022', grassL:'#2a4430', net:'#5a6a70', post:'#3a4248' };
  // the cliff is one continuous wall: every segment draws a slice whose height follows the smoothed profile, so it rises out of a low bank
  // and tapers away. Behind and above each slice a dark forest mass runs to the screen edge, so nothing can be seen through or past it.
  // the slope above the cut: summit height over the crest (x the cliff profile h, in half-road widths), smooth along the road
  const HD = 2.2, HB = 4, hillS = k => .5 + .8 * vn(k * .022 + 3.7) + .3 * vn(k * .061 + 9.1);
  const HILL = { d:'#071012', m:'#0b181b', l:'#112326', rims:['#1c3234', '#2c4648', '#456a6a', '#6a9294'] };
  // cedar tips for the forest shoulder's top edge: a tileable strip twice TIPW wide, so any TIPW-wide window of it is whole
  const TIPW = 96, TIPH = 12; let TIPS = null;
  function tipStrip(){ if(TIPS) return TIPS; const c = document.createElement('canvas'); c.width = TIPW * 2; c.height = TIPH; const k = c.getContext('2d');
    for(let x0 = 0; x0 < TIPW; ){ const w = 5 + (hash(x0 * 1.7) * 4 | 0), h = 4 + (hash(x0 * 2.9) * (TIPH - 5) | 0), cxm = x0 + w / 2;
      for(let r = 0; r < h; r++){ const half = Math.max(.5, (r + 1) / h * w / 2), l = Math.round(cxm - half), rr = Math.round(cxm + half), y = TIPH - h + r;
        for(const o of [0, TIPW]){ k.fillStyle = HILL.m; k.fillRect(l + o, y, rr - l, 1); k.fillStyle = HILL.l; k.fillRect(l + o, y, 1, 1); if(r % 3 === 2){ k.fillStyle = HILL.d; k.fillRect(Math.round(cxm) + o, y, rr - Math.round(cxm), 1); } } }
      for(const o of [0, TIPW]){ k.fillStyle = HILL.rims[1]; k.fillRect(Math.round(cxm) + o, TIPH - h, 1, 1); }
      x0 += w - 1 - (hash(x0 * 4.1) * 2 | 0); }
    k.fillStyle = HILL.m; k.fillRect(0, TIPH - 1, TIPW * 2, 1); return TIPS = c; }
  const HQ = [], hillTone = q => HQ[q] || (HQ[q] = [mixc(HILL.m, HILL.d, q / 4), mixc(HILL.m, HILL.l, q / 4)]);   // the slope's underside and lit top, q/4 of the way out of the mid tone
  // huge off-screen coordinates (slices right beside the camera) push the canvas onto its slow path renderer, so clamp them well outside the view
  const CL = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col){ const a = -W, b = 2 * W, c = -H, d = 2 * H; window.poly(CL(x1, a, b), CL(y1, c, d), CL(x2, a, b), CL(y2, c, d), CL(x3, a, b), CL(y3, c, d), CL(x4, a, b), CL(y4, c, d), col); }
  // far away a cliff slice is far taller than the step between segments, so slices would overdraw each other dozens of times:
  // there one slice spans 2-8 segments instead (world-anchored: only every n-th segment draws)
  const WSPAN = f => { f = fogPx(f); return f < .03 ? 1 : f < .08 ? 2 : f < .2 ? 4 : f < .4 ? 8 : 16; };
  // Span LOD without holes or jumps: a slice starts where its own span divides k, or at the wall's first segment, and always runs to the
  // next slice start (worked out from each segment's own distance), so neighbouring slices share their edges at any mix of span sizes and
  // the cliff's start stays put as the spans change (it used to snap forward by up to 16 segments and leave gaps that blinked).
  // the engine's DRAW (segments drawn) is DRAW_N here: this file's own DRAW is the draw-function table below
  const spanAt = (j, b) => WSPAN(clamp(Math.pow((j - b) / DRAW_N, 1.6), 0, 1));
  const hasW = (j, side) => { const t = segs[j], u = segs[j + 1]; return !!(t && t.passH && (t.passH[side] > .01 || (u && u.passH ? u.passH[side] : 0) > .01)); };
  // (a slice whose near edge is at the camera plane projects to a huge scale: its hill band became a flat slab over the lower screen for
  // 2-3 frames as it passed. Within 40% of a segment of the camera the slice is off the sides of the screen anyway, so it is skipped.)
  // the face of the slice being drawn (set at the top of drawWall), so its bands need no closure per slice
  let WX = 0, WY = 0, WX2 = 0, WY2 = 0, WL1 = 0, WL2 = 0, WH1 = 0, WH2 = 0, WFOG = 0, WLOW = '';
  const WPT = [0, 0, 0, 0], LAT_F = [.25, .44, .63, .82], TUFT_F = [.34, .53, .72], SEEP_F = [.3, .55, .75], NET_F = [.45, .9];
  function wP(f){ WPT[0] = WX + WL1 * f; WPT[1] = WY - WH1 * f; WPT[2] = WX2 + WL2 * f; WPT[3] = WY2 - WH2 * f; }   // the face's near and far edge at height f
  function wBand(f0, f1, col){ poly(WX + WL1 * f0, WY - WH1 * f0, WX2 + WL2 * f0, WY2 - WH2 * f0, WX2 + WL2 * f1, WY2 - WH2 * f1, WX + WL1 * f1, WY - WH1 * f1, fc(col, WFOG, WLOW)); }
  function wSeep(s0, f){ WPT[0] = WX + (WX2 - WX) * s0 + (WL1 + (WL2 - WL1) * s0) * f; WPT[1] = WY + (WY2 - WY) * s0 - (WH1 + (WH2 - WH1) * s0) * f; }   // a point s0 along the face at height f
  // a band f0..f1 of the mountain slope behind the cut (from the crest tx/ty out to the summit line e/s)
  function hillQ(tx1, ty1, tx2, ty2, e1, e2, s1, s2, f0, f1, col, fog, low){ poly(tx1 + (e1 - tx1) * f0, ty1 - s1 * f0, tx2 + (e2 - tx2) * f0, ty2 - s2 * f0, tx2 + (e2 - tx2) * f1, ty2 - s2 * f1, tx1 + (e1 - tx1) * f1, ty1 - s1 * f1, fc(col, fog, low)); }
  function drawWall(sp, x, y, uw, fog, now){ if(sp.s && sp.s.p1.camera.z < SEG * .4) return; const side = Math.sign(sp.x), k = sp.k, b0 = k - Math.round(DRAW_N * Math.pow(fog, 1 / 1.6)); if(k % spanAt(k, b0) && hasW(k - 1, side)) return;   // b0: the camera's segment, recovered from this slice's own fog
    let n = 1; while(n < 16 && (k + n) % spanAt(k + n, b0)) n++;
    const s = sp.s, t = segs[s.index + n - 1] || s, nx = segs[s.index + n];
    const p = (t.p2.screen.w ? t : s).p2.screen; if(!p.w) return; const x2 = p.x + sp.x * p.w, y2 = p.y, u2 = p.w, low = fogLow;
    const sh = sp.h, sh2 = n > 1 ? (nx && nx.passH ? nx.passH[side] : sp.h2) : sp.h2;   // (a merged slice ends at the far segment's height)
    const H1 = uw * WALLH * sh, H2 = u2 * WALLH * sh2, L1 = side * uw * LEAN * sh, L2 = side * u2 * LEAN * sh2;
    WX = x; WY = y; WX2 = x2; WY2 = y2; WL1 = L1; WL2 = L2; WH1 = H1; WH2 = H2; WFOG = fog; WLOW = low;   // the slice's face, for wBand / wP / wSeep
    const tx1 = x + L1, ty1 = y - H1, tx2 = x2 + L2, ty2 = y2 - H2;
    if(Math.min(ty1 - uw * hillS(k) * sh, ty2 - u2 * hillS(k + n) * sh2) - uw * .3 >= s.clip) return;   // (wholly behind a crest: under the nearer road, every pixel would be clipped)
    // the mountain behind the cut (studied: Snow Onsen's banks, Irohazaka's slopes): a forested slope that rises from the rock's crest to a
    // summit line HD road half-widths further out. Its height is smooth world-anchored noise (no per-slice randomness), so the skyline is
    // one continuous ridge that grows out of the shoulder where the cliff starts and sinks back where it ends. Shaded like the backdrop
    // ridges: a dark underside by the crest, a mid slope, a lit top and a moon rim along the skyline. Drawn at every distance (no pop).
    { const s1 = uw * hillS(k) * sh, s2 = u2 * hillS(k + n) * sh2, e1 = tx1 + side * uw * HD, e2 = tx2 + side * u2 * HD;
      // the forest beyond the summit line, wherever we look down onto it (the road climbs, or the slope rises away from us out of the ravine's
      // lip): a wooded shoulder HB road half-widths deeper (near by that is past the screen edge). It used to stop at the summit line, so the
      // ground (or the sky, above the farthest road) showed through past the slope's front top (Kellan, 2026-11-23: hills missing geometry in the
      // front top parts, after the pass's jump). Not to the screen edge at every distance: a far ridge's shoulder would hide the ranges behind it.
      { const o1 = ty1 - s1, o2 = ty2 - s2; if(o1 > o2 + .5){ poly(e1, o1, e2, o2, e2 + side * u2 * HB, o2, e1 + side * uw * HB, o1, fc(HILL.m, fog, low));
        // its top edge breaks into cedar tips (a strip baked at warm-up, world-anchored by the slice), so the shoulder reads as forest, not a plateau
        if(fog < .14 && TIPS){ const kp = Math.max(PX, Math.round(u2 * .045 / PX) * PX), sw = Math.min(TIPW, Math.ceil(u2 * HB / kp)), sx = (k * 37) % TIPW, dx = side > 0 ? e2 : e2 - sw * kp;
          cx.globalAlpha = Math.min(1, (.14 - fog) * 25); cx.drawImage(TIPS, sx, 0, sw, TIPH, Math.round(dx / PX) * PX, Math.round((o2 - (TIPH - 1) * kp) / PX) * PX, sw * kp, TIPH * kp); cx.globalAlpha = 1; } } }
      // (the dark underside and lit top grow out of the mid tone over fog .3 to .22 in four steps (hillTone), instead of switching on at once
      // across the whole slope as each slice crossed fog .3: far slopes changed shade in blocks as you rode)
      if(fog > .3) hillQ(tx1, ty1, tx2, ty2, e1, e2, s1, s2, 0, 1, HILL.m, fog, low); else { const T = hillTone(Math.min(4, Math.round((.3 - fog) * 50))); hillQ(tx1, ty1, tx2, ty2, e1, e2, s1, s2, 0, .3, T[0], fog, low); hillQ(tx1, ty1, tx2, ty2, e1, e2, s1, s2, .3, .74, HILL.m, fog, low); hillQ(tx1, ty1, tx2, ty2, e1, e2, s1, s2, .74, 1, T[1], fog, low); }
      if(fog < .7 && sh > .04){ const o1 = ty1 - s1, o2 = ty2 - s2, fall = Math.floor(clamp(1.15 - Math.abs((e1 + e2) / 2 - MOON.x) / (W * .55), 0, 1) * 3);
        const rc = fc(HILL.rims[fall], fog, low); poly(e1, o1, e2, o2, e2, o2 + PX, e1, o1 + PX, rc);
        // near by, the skyline breaks into cedar tips (two per segment, world-anchored): a forest edge, not a cut-out slab
        // (they grow out of the ridge over fog .14 to .1 (grow) instead of popping up at full height, a row of them at once, as a slice crossed .14)
        if(fog < .14 && sh > .2){ const bc = fc(HILL.l, fog, low), m = n * 2, grow = Math.min(1, (.14 - fog) * 25);
          for(let j = 0; j < m; j++){ const g = k * 2 + j, f = (j + .2 + .6 * hash(g * 1.9)) / m, u = uw + (u2 - uw) * f, th = u * (.1 + .16 * hash(g * 3.3)) * Math.min(1, sh * 1.5) * grow, tw = u * (.05 + .03 * hash(g * 5.7));
            if(th < PX * 3) continue; const ex = e1 + (e2 - e1) * f, ey = o1 + (o2 - o1) * f + PX;
            cx.fillStyle = bc; pxRect(ex - tw / 2, ey - th * .45, tw, th * .45); pxRect(ex - tw * .32, ey - th * .8, tw * .64, th * .35); pxRect(ex - tw * .14, ey - th, tw * .28, th * .2);
            cx.fillStyle = rc; pxRect(ex - tw * .14, ey - th, tw * .28, PX); } } } }
    if(fog > .5){ poly(x, y, x2, y2, tx2, ty2, tx1, ty1, fc(WC.rock[k % 4], fog, low)); return; }
    // what this stretch of cut slope is made of, world-anchored in blocks of segments: bare rock (often netted) or a concrete lattice frame (法枠)
    const blk = Math.floor(k / 44), lattice = hash(blk * 5.3) > .6, net = !lattice && hash(blk * 2.9) > .45, near = fog < .14 && H1 > PX * 10;
    wBand(0, 1, lattice ? WC.cell : WC.rock[(k + (hash(k * .37 | 0) * 4 | 0)) % 4]);
    wBand(0, .07, WC.foot); if(uw > 30){ wBand(.07, .085, WC.footL); if(k % 3 === 0){ wP(.035); const ax = WPT[0], ay = WPT[1]; cx.fillStyle = fc('#05080a', fog, low); pxRect(ax - uw * .02, ay - uw * .02, uw * .05, uw * .04); } }   // footing with drainage holes
    /* The lattice frame (audit #19: a uniform pale line grid over flat green, a debug grid behind the cedars): each cell is dark soil with a
       grass band growing on the beam below it; each beam is a body with a lit top edge (only near: far away the beams keep to the mid tone,
       so the contrast falls with distance) and a dark shadow under it; the posts are a mid body with a lit edge on one side, a shadow on the other. */
    if(lattice){ const lit = uw > 24 && fog < .3, gr = uw > 30;
      for(const f of LAT_F){ if(gr) wBand(f - .07, f - .012, uw > 60 ? WC.grassL : WC.grass);
        wBand(f - .012, f + .018, lit ? WC.latM : WC.latF); if(lit) wBand(f - .012, f - .004, WC.latL); wBand(f + .018, f + .03, WC.latD); }
      if(k % 3 === 0 && sh > .3){ const w = Math.max(PX, uw * .05) * side, e = Math.max(PX, uw * .014) * side, P = (o0, o1, c) => poly(x + L1 * .07 - o0, y - H1 * .07, x + L1 * .97 - o0, y - H1 * .97, x + L1 * .97 - o1, y - H1 * .97, x + L1 * .07 - o1, y - H1 * .07, fc(c, fog, low));
        if(lit) P(-e, 0, WC.latD); P(0, w, lit ? WC.latM : WC.latF); if(lit) P(w - e, w, WC.latL); }
      if(near && hash(k * 3.7) > .45){ const f = TUFT_F[k % 3], sx = (x + x2) / 2 + (L1 + L2) / 2 * f, sy = (y + y2) / 2 - (H1 + H2) / 2 * f, kk = Math.max(uw * .16, Math.abs(x2 - x)) / 9; cx.globalAlpha = (1 - fog) * scaleFade(kk, 4, 7); blit(tuftSpr(k % 3), sx, sy + 2 * kk, kk); cx.globalAlpha = 1; } }   // (tufts are clutter: past 4 canvas px a pixel they fade, not grow into blocks)
    else if(near){   // rock: faceted boulder clusters stuck to the face in rows that follow the slope, one variant per pair of segments so they cluster
      const dw = Math.max(Math.abs(x2 - x) * 1.7, uw * .2); cx.globalAlpha = clamp(1 - fog * 1.5, 0, 1);
      for(let r = 0; r < 4; r++){ const f = .16 + r * .21 + (hash(k * 7 + r) - .5) * .07; if(f > .86 || hash(k * 5.1 + r * 3) < .18) continue;
        const spr = rockSpr((hash(Math.floor((k + r) / 2) * 3.1 + r) * 6) | 0), kk = Math.min(dw / 22, H1 * .3 / 15), mx = (x + x2) / 2 + (L1 + L2) / 2 * f, my = (y + y2) / 2 - (H1 + H2) / 2 * f;
        const R = hiR(kk), a0 = cx.globalAlpha, sf = scaleFade(kk / R, 5, 8); if(sf <= 0) continue; cx.globalAlpha = a0 * sf; blit(R > 1 ? rockHi((hash(Math.floor((k + r) / 2) * 3.1 + r) * 6) | 0, R) : spr, mx, my + 7 * kk, kk / R); cx.globalAlpha = a0; }   // near by: the 2x / 4x rock
      cx.globalAlpha = 1;
      if(hash(k * 1.7) > .55){ const f = .1 + hash(k * 2.9) * .7, mx = (x + x2) / 2 + (L1 + L2) / 2 * f, my = (y + y2) / 2 - (H1 + H2) / 2 * f, kk = Math.max(uw * .14, Math.abs(x2 - x)) / 9; { const sf = scaleFade(kk, 4, 7); if(sf > 0){ const a0 = cx.globalAlpha; cx.globalAlpha = a0 * sf; blit(tuftSpr(k % 3), mx, my, kk); cx.globalAlpha = a0; } } } }
    else { const l1 = .36 + (hash(Math.floor(k / 9)) - .5) * .12; wBand(l1 - .04, l1, WC.ledgeD); wBand(l1, l1 + .02, WC.ledge); }
    // a wet seep: a dark glistening streak down the rock
    if(!lattice && hash(k * 13.1) > .93){ const a = .3 + hash(k) * .4;
      wSeep(a, .9); const ax = WPT[0], ay = WPT[1]; wSeep(a + .25, .9); const bx = WPT[0], by = WPT[1]; wSeep(a + .3, .05); const cx2 = WPT[0], cy2 = WPT[1]; wSeep(a - .05, .05); const dx2 = WPT[0], dy2 = WPT[1]; poly(ax, ay, bx, by, cx2, cy2, dx2, dy2, fc('#1a2c38', fog, low));
      if(near){ cx.fillStyle = fc('#a8c8dc', fog, low); for(const f of SEEP_F){ wSeep(a + .1, f); const hx2 = WPT[0], hy2 = WPT[1]; cx.fillRect(snap(hx2), snap(hy2), PX, PX); } } }
    // a thin waterfall off the crest every so often, with a splash at the foot
    if(!lattice && k % 150 === 75 && sh > .7) waterfall(x, y, x2, y2, L1, H1, uw, fog, now, low);
    // rock-fall net draped over the face, and the fence posts and wires along the crest (Route 41)
    if(net && near && sh > .4){ const nc = fc(WC.net, fog, low), t = PX * .7; wP(.93); const ax = WPT[0], ay = WPT[1], bx = WPT[2], by = WPT[3]; wP(.3); const cx2 = WPT[0], cy2 = WPT[1], dx2 = WPT[2], dy2 = WPT[3]; poly(ax, ay, dx2, dy2, dx2, dy2 + t, ax, ay + t, nc); poly(bx, by, cx2, cy2, cx2, cy2 + t, bx, by + t, nc); }
    if(net && sh > .4){ const ph = uw * .3 * sh, ph2 = u2 * .3 * sh2; cx.fillStyle = fc(WC.post, fog, low); if(k % 3 === 0) pxRect(tx1 - Math.max(PX, uw * .012) / 2, ty1 - ph, Math.max(PX, uw * .012), ph);
      for(const f of NET_F) poly(tx1, ty1 - ph * f, tx2, ty2 - ph2 * f, tx2, ty2 - ph2 * f + PX * .6, tx1, ty1 - ph * f + PX * .6, fc(WC.net, fog, low)); }
    if(sh > .08) wBand(.96, 1, WC.rim); }
  function waterfall(x, y, x2, y2, L1, H1, uw, fog, now, low){ const w = Math.max(PX * 2, Math.abs(x2 - x) * .8, uw * .16), tx = x + L1 * .96 + (x2 - x) * .3, ty = y - H1 * .96, bx = x + (x2 - x) * .3, n = 7;
    poly(tx - w / 2, ty, tx + w / 2, ty, bx + w / 2, y - uw * .03, bx - w / 2, y - uw * .03, fc('#243a48', fog, low)); poly(tx - w * .15, ty, tx + w * .1, ty, bx + w * .1, y - uw * .03, bx - w * .15, y - uw * .03, fc('#6a90a4', fog, low));
    cx.fillStyle = fc('#c8e2ee', fog, low); for(let j = 0; j < n; j++){ const f = reduce ? j / n : ((now / 700 + j / n) % 1), px = tx + (bx - tx) * f, py = ty + (y - ty) * f; cx.fillRect(snap(px - w * .25), snap(py), Math.max(PX, snap(w * .3)), Math.max(PX, snap(uw * .06))); }
    cx.fillStyle = fc('#e8f4f8', fog, low); cx.fillRect(snap(tx - w / 2), snap(ty), snap(w), PX);
    pool(bx, y - uw * .02, w * 1.4, uw * .05, '#a8d0e0', .35 * (1 - fog)); }
  function drawTree(sp, x, y, uw, fog){ const dir = MOON.x > x ? 1 : -1, v = sp.k % 4, spr = v < 3 ? sugi(v, dir) : kusu(sp.k % 2, dir), hgt = (v < 3 ? 1.7 : 1.1) * uw * sp.sz;
    const k = hgt / spr.height, sf = scaleFade(k, 6, 10); if(sf <= 0) return; cx.globalAlpha = (1 - fog * .85) * sf * (sp.deep ? 1 - .28 * sp.deep : 1); blit(spr, x, y - (sp.lift || 0) * uw, k); cx.globalAlpha = 1; }   // (deep: a cedar down in the ravine, sunk in its dark air)
  function drawToro(sp, x, y, uw, fog, now){ const dir = MOON.x > x ? 1 : -1, spr = toro(dir), k = uw * .5 / 30, a = 1 - fog * .7, fl = reduce ? 1 : .92 + .08 * Math.sin(now / 90 + sp.k) * Math.sin(now / 37 + sp.k);
    pool(x, y, uw * .7, uw * .16, '#ffa850', .55 * a * fl); cx.globalAlpha = a; blit(spr, x, y, k); cx.globalAlpha = 1; glow(x, y - 20.5 * k, uw * .4, '#ffb060', .5 * a * fl); }
  function drawJizo(sp, x, y, uw, fog, now){ const dir = MOON.x > x ? 1 : -1, spr = jizo(dir), k = uw * .2 / 13, a = 1 - fog * .7;
    cx.globalAlpha = a; for(let j = -1; j <= 1; j++) blit(spr, x + j * 10 * k, y - (j === 0 ? 0 : 0), k * (j === 0 ? 1.1 : 1)); cx.globalAlpha = 1;
    if(fog < .6){ if(k > PX * 1.5) candle(x + 15 * k, y - k, k, now); else { cx.fillStyle = '#ffe2a0'; pxRect(x + 15 * k, y - 3 * k, Math.max(PX, k), Math.max(PX, 2 * k)); } glow(x + 15 * k, y - 3 * k, uw * .12, '#ffb060', .5 * a); } }
  function drawTorii(sp, x, y, uw, fog, now){ const dir = MOON.x > x ? 1 : -1, k = uw * 1.38 / 22, R = hiR(k), spr = R > 1 ? toriiHi(dir, R) : torii(dir), a = 1 - fog * .6;
    pool(x - 22 * k, y, uw * .5, uw * .12, '#ff9a50', .4 * a); pool(x + 22 * k, y, uw * .5, uw * .12, '#ff9a50', .4 * a);
    cx.globalAlpha = a; blit(spr, x, y, k / R); cx.globalAlpha = 1;
    if(uw > 24){ cx.fillStyle = GOLD; cx.font = `${Math.round(6 * k)}px DotGothic16, monospace`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('峠', snap(x), snap(y - (54 - 12.5) * k)); cx.textAlign = 'left'; cx.textBaseline = 'alphabetic'; } }
  // up close the chevron board is drawn as geometry (outlined board, a true diagonal arrow, the post), so the bend's warning stays crisp
  // instead of becoming a wall of 30-pixel blocks as it passes
  let CGX = 0, CGY = 0, CGK = 0, CGR = 0; const cgX = v => CGX + (CGR > 0 ? v - 5.5 : 5.5 - v) * CGK, cgY = v => CGY - (17 - v) * CGK;   // chevGeo's board grid
  function chevGeo(x, y, k, r){ CGX = x; CGY = y; CGK = k; CGR = r;
    cx.fillStyle = '#24242e'; pxRect(Math.min(cgX(4), cgX(7)), cgY(10), 3 * k, 7 * k); cx.fillStyle = '#4a4a58'; pxRect(x - 1.5 * k, cgY(10), k, 7 * k);   // the post's lit edge stays on the left either way, as in the sprite
    cx.fillStyle = CHK; pxRect(Math.min(cgX(0), cgX(11)), cgY(0), 11 * k, 10 * k); cx.fillStyle = CHR; pxRect(Math.min(cgX(1), cgX(10)), cgY(1), 9 * k, 8 * k);
    poly(cgX(3), cgY(1), cgX(5), cgY(1), cgX(8), cgY(5), cgX(6), cgY(5), CHW); poly(cgX(6), cgY(5), cgX(8), cgY(5), cgX(5), cgY(9), cgX(3), cgY(9), CHW); }
  function drawChev(sp, x, y, uw, fog, now){ const spr = chevron(sp.r), k = uw * .2 / 11, a = 1 - fog * .6, near = clamp(1.3 - fog * 3.2, 0, 1);
    cx.globalAlpha = a; if(k / PX > 4) chevGeo(x, y, k, sp.r); else blit(spr, x, y, k); cx.globalAlpha = 1; if(near > .3) glow(x, y - 12 * k, uw * .22, '#ff6a60', .35 * near); }
  function drawFF(sp, x, y, uw, fog, now){ if(fog > .45 || uw < 6) return; const a = 1 - fog * 1.6, sz = Math.max(PX, snap(uw * .014));
    for(let j = 0; j < 4; j++){ const h = hash(sp.k * 7 + j * 3.3), ph = now / (1300 + h * 900) + h * 20, bl = reduce ? .6 : Math.max(0, Math.sin(ph * 2.1)) ** 2;
      if(bl < .08) continue; const fx = x + (hash(sp.k + j * 5.1) - .5) * uw * 1.2 + (reduce ? 0 : Math.sin(ph) * uw * .08), fy = y - uw * (.08 + h * .5) + (reduce ? 0 : Math.cos(ph * 1.3) * uw * .05);
      cx.globalAlpha = a * bl; cx.fillStyle = '#e6ff9a'; cx.fillRect(snap(fx), snap(fy), sz, sz); cx.globalAlpha = 1; if(uw > 40) glow(fx, fy, uw * .05, '#b8ff60', .35 * a * bl); } }
  // a sakura by the shrine: clumped blossom pads, dark pink under, pale where the moon catches them; petals drift down past the lanterns
  const BLOOM = [[20, 9, 10, 6], [9, 14, 7, 4.5], [31, 13, 8, 5], [20, 17, 9, 4], [13, 7, 6, 4], [28, 6, 6, 3.5], [4, 19, 4, 2.6], [36, 19, 4, 2.6]];
  PAL[8] = ['#1e0a16', '#5a2440', '#8a4466', '#c8809e', '#ffe0ec'];
  const sakura = dir => bake('sakura2', 40, 36, (x, y) => {
    for(const [px, py, rx, ry] of BLOOM){ const dx = (x + .5 - px) / rx, dy = (y + .5 - py) / ry, wob = .78 + .3 * hash(Math.floor(x / 2) * 5.1 + Math.floor(y / 2) * 2.3); if(dx * dx + dy * dy <= wob) return hash(x * 3.3 + y * 7.1) > .7 ? 108 : 8; }
    const tc = 20 + (36 - y) * .12; if(y > 16 && Math.abs(x + .5 - tc) < (y > 32 ? 2.2 : 1.3)) return 2;
    if(y > 15 && y < 22 && Math.abs((x - tc) - (y - 22) * -1.4) < .8) return 2; if(y > 15 && y < 21 && Math.abs((x - tc) - (y - 21) * 1.5) < .8) return 2; return 0; }, dir);
  function drawSakura(sp, x, y, uw, fog, now){ const dir = MOON.x > x ? 1 : -1, k = uw * 1.6 / 36, R = hiR(k), spr = R > 1 ? sakuraHi(dir, R) : sakura(dir), a = 1 - fog * .8; cx.globalAlpha = a; blit(spr, x, y, k / R); cx.globalAlpha = 1;
    if(fog > .6) return; const sz = Math.max(PX, Math.min(snap(k * .9), PX * 2));   // (a petal is at most 2 canvas px: near by they were pink squares)
    for(let j = 0; j < 10; j++){ const h = hash(sp.k * 3 + j * 1.7), per = 5200 + h * 3000, ph = reduce ? h : ((now / per + h) % 1), px = x + (h - .5) * 40 * k + (reduce ? 0 : Math.sin(now / 700 + j) * 3 * k) + ph * 10 * k, py = y - 30 * k + ph * 30 * k;
      cx.fillStyle = j % 3 ? '#ffd0e0' : '#e890b0'; cx.globalAlpha = a * (ph < .9 ? 1 : (1 - ph) * 10); if(sz > PX){ cx.fillRect(snap(px), snap(py), sz, PX); cx.fillStyle = '#c8708e'; cx.fillRect(snap(px) + PX, snap(py) + PX, PX, PX); } else cx.fillRect(snap(px), snap(py), sz, sz); } cx.globalAlpha = 1; }
  function drawSign(sp, x, y, uw, fog, now){ const dir = MOON.x > x ? 1 : -1, k = uw * .3 / 15, R = hiR(k), spr = R > 1 ? signHi(dir, R) : signSpr(dir), a = 1 - fog * .7, near = clamp(1.3 - fog * 3.2, 0, 1); cx.globalAlpha = a; blit(spr, x, y, k / R); cx.globalAlpha = 1;
    if(near > .3) glow(x, y - 21 * k, uw * .16, '#ffd070', .3 * near);
    const t = R > 1 ? plateFit((12 * k - PX) / PX) : null; if(t){ cx.globalAlpha = a; blit(t, x, y - 9.5 * k + t.height * PX / 2, PX); cx.globalAlpha = 1; }   // (too small for the 8 px text: the plate as before)
    else if(uw > 50){ const pl = plate(); if(pl) cx.drawImage(pl, Math.round(x - 5.5 * k), Math.round(y - 11.5 * k), Math.round(11 * k), Math.round(4 * k)); } }
  // the plate's kanji, rendered once at 16 px (DotGothic16's native grid) into a cached canvas when the font is ready, then scaled like a sprite
  function plate(){ if(SPR.pass_plate) return SPR.pass_plate; if(!document.fonts || !document.fonts.check('16px DotGothic16')) return null; const c = document.createElement('canvas'); c.width = 66; c.height = 24; const g = c.getContext('2d');
    g.fillStyle = '#e8e6de'; g.fillRect(0, 0, 66, 24); g.fillStyle = '#202028'; g.font = '16px DotGothic16'; g.textBaseline = 'middle'; g.fillText('落石注意', 1, 13); plateTexts(); return SPR.pass_plate = c; }
  function drawMirror(sp, x, y, uw, fog, now){ const k = uw * .55 / 34, R = hiR(k), spr = R > 1 ? mirrorHi(R) : mirrorSpr(), a = 1 - fog * .7; cx.globalAlpha = a; blit(spr, x, y, k / R); cx.globalAlpha = 1;
    const near = clamp(1.2 - fog * 3, 0, 1); if(near > .25){ const gx = x - k, gy = y - 26 * k;   // the headlight caught in the glass
      if(R > 1){ const o = Math.max(PX, snap(k / R)); cx.fillStyle = '#fff0c0'; cx.fillRect(snap(gx) - o, snap(gy), o * 3, o); cx.fillRect(snap(gx), snap(gy) - o, o, o * 3); cx.fillStyle = '#ffffff'; cx.fillRect(snap(gx), snap(gy), o, o); }   // (a hot point with four arms, not a square)
      else { cx.fillStyle = '#fff6d8'; cx.fillRect(snap(gx), snap(gy), Math.max(PX, snap(k)), Math.max(PX, snap(k))); }
      glow(x, y - 27 * k, uw * .12, '#fff0c0', .4 * near); } }
  // ---------------------------------------------------------------- near art (nearprops pass)
  // Beside the camera the shrine's sprites were blown up to 4-10 canvas px per sprite pixel: the torii's lacquer base became a flat brown
  // block, sakura blossom and petals pink squares, the sign's plate and the jizō candle white squares. Each hero prop now has the same
  // design drawn again at 2x and 4x its sprite resolution from a material that works in sprite coordinates (X, Y; e = one fine pixel), so the
  // footprint is identical and only the detail changes: 1 px rims and outlines, real cylinder shading on the pillars, a lacquer gloss, a
  // twisted rope, lit flecks in the blossom. The far sprites are untouched; the version is picked by scale (hiR), the nearest at least 1 canvas
  // px per pixel. Studied: Paul Robertson and the Sea of Stars stonework (detail lives on edges: 1 px lit lips and dark seams, flat planes
  // between), and the Japanese torii anatomy (笠木 kasagi over 島木 shimaki, 貫 nuki through the pillars, 額束 plaque, 根巻 black lacquer
  // sleeve at the foot, 注連縄 rope with 紙垂 shide); the 落石注意 sign from the Route 41 cutting (yellow diamond, black border, cliff and
  // falling rocks, white supplementary plate, galvanised pipe post).
  const hiR = k => k >= PX * 4 ? 4 : k >= PX * 2 ? 2 : 1;
  const hiSpr = (key, w, h, R, mat) => procSprite('pass_hi_' + key + '_' + R, w * R, h * R, (x, y) => mat((x + .5) / R, (y + .5) / R, 1 / R, x, y));
  const bay = (x, y) => BY[(y & 3) * 4 + (x & 3)] / 16 - .47;   // ordered dither offset, -.47 .. .47
  // a lit cylinder across its width: s = -1 (away from the moon) .. 1 (toward it), eu = one fine pixel in s units; backlit, as the sprites:
  // a moon rim and a light band on the moon side, a dark body, a dark outline on the far side
  const cylT = (p, s, eu) => s > 1 - eu ? p[4] : s < -1 + eu ? p[0] : s > .55 ? p[3] : s > .22 ? p[2] : p[1];   // (hard vertical bands: a dither down a pillar read as a ruler's ticks)
  const toriiHi = (dir, R) => hiSpr('torii' + dir, 76, 54, R, (X, Y, e, x, y) => {
    const d = Math.abs(X - 38), b = bay(x, y), top = 3 - Math.max(0, d - 25) * .32, P5 = PAL[5], P4 = PAL[4], P7 = PAL[7], side = (X - 38) * dir > 0;
    if(d < 38 && Y >= top && Y < top + 3){ const v = Y - top; if(d > 38 - e) return side ? P5[4] : P5[0]; if(v < e) return P5[4]; if(v < 2 * e) return P5[3]; if(v > 3 - e) return P5[0]; return v + b * .6 < 1.3 ? P5[2] : P5[1]; }   // 笠木: lacquer, moonlit top lip
    if(d < 35 && Y >= top + 3 && Y < top + 5){ const v = Y - top - 3; if(d > 35 - e) return side ? P4[3] : P4[0]; if(v < e || v > 2 - e) return P4[0]; return v + b * .5 < 1 ? P4[2] : P4[1]; }   // 島木, in the kasagi's shadow
    if(Y >= 9 && Y < 17 && d < 5){ const ed = Math.min(Y - 9, 17 - Y, 5 - d); if(ed < e) return '#3a2a10'; if(ed < 1) return Y < 10 ? '#f0d080' : Y > 16 ? '#8a6a28' : (X - 38) * dir > 0 ? '#e0b860' : GOLD; return ed < 1 + e ? '#050306' : PLQ; }   // 額束
    const pd = Math.abs(d - 22), pc = X < 38 ? 16 : 60;
    if(Y >= 17 && Y < 20 && d < 33 && !(Y >= 48)){ const v = Y - 17; if(d > 33 - e) return side ? P4[3] : P4[0]; if(v < e) return P4[4]; if(v < 2 * e) return P4[3]; if(v > 3 - e) return P4[0]; return v + b * .4 > 2.1 ? P4[1] : P4[2]; }   // 貫, through the pillars
    if(Y >= 48 && pd < 3.3){ const s = (X - pc) / 3.3 * dir, eu = e / 3.3, v = Y - 48; if(Y > 54 - e || s < -1 + eu) return P5[0]; if(s > 1 - eu) return P5[4]; if(v < e) return P5[3]; if(v < 2 * e) return P5[2];   // 根巻: black lacquer sleeve, a thin lip and one sharp gloss streak
      if(s > .52 && s < .52 + 1.6 * eu) return P5[3]; return s > .3 ? P5[2] : P5[1]; }
    if(Y > 5 && pd < 2.6){ const s = (X - pc) / 2.6 * dir, eu = e / 2.6; if(Y > 48 - e) return P4[0]; return cylT(P4, s, eu); }   // 柱
    const ry = 22 + 3 * (1 - (d / 20) * (d / 20));
    if(d < 19.6 && Y >= ry && Y < ry + 3){ const v = Y - ry; if(v < e) return P7[4]; if(v > 3 - e) return P7[0]; const tw = ((X * .9 + v * 1.3) % 1.6 + 1.6) % 1.6 < .5;   // 注連縄: a twisted straw rope
      if(v < 1) return tw ? P7[2] : P7[3]; return v > 2.1 ? P7[1] : tw ? P7[1] : P7[2]; }
    for(const sx of [-11, 11]){ const y0 = 27; if(Y < y0 || Y >= y0 + 6) continue; const j = Math.floor((Y - y0) / 2), v = Y - y0 - 2 * j, off = j % 2, xx = X - 38 - sx - v * .2;   // 紙垂: zigzag paper, a shadow under each fold
      if(xx >= off - 1 && xx < off + 1){ if(v > 2 - e * 1.5) return PAPER2; if((dir > 0 ? xx < off - 1 + e : xx > off + 1 - e)) return PAPER2; return PAPER; } }
    return null; });
  // sakura: the same blossom pads, shaded as volumes (lit cap, dark underside, moon rim), florets where the sprite has its light flecks
  const padAt = (X, Y) => { for(let n = 0; n < BLOOM.length; n++){ const [px, py, rx, ry] = BLOOM[n], dx = (X - px) / rx, dy = (Y - py) / ry; if(dx * dx + dy * dy <= .78 + .3 * hash(Math.floor(Math.floor(X) / 2) * 5.1 + Math.floor(Math.floor(Y) / 2) * 2.3)) return n; } return -1; };
  const sakuraHi = (dir, R) => hiSpr('sakura' + dir, 40, 36, R, (X, Y, e, x, y) => { const P = PAL[8], b = bay(x, y), n = padAt(X, Y);
    if(n >= 0){ const [px, py, rx, ry] = BLOOM[n], dx = (X - px) / rx, dy = (Y - py) / ry, rd = Math.sqrt(dx * dx + dy * dy) || 1, li = -dy / rd * .8 + dir * dx / rd * .45;
      // the silhouette only (as the sprite's bake): moon rim where the sky is above or toward the moon, a dark outline under and away
      if(padAt(X, Y - e) < 0 || padAt(X + dir * e, Y) < 0) return P[4]; if(padAt(X, Y - 2 * e) < 0 || padAt(X + 2 * dir * e, Y) < 0) return P[3];
      if(padAt(X, Y + e) < 0 || padAt(X - dir * e, Y) < 0) return P[0];
      const cxi = Math.floor(X), cyi = Math.floor(Y), fl = hash(cxi * 3.3 + cyi * 7.1) > .7;   // florets on the sprite's own fleck lattice
      if(fl && X - cxi < .5 && Y - cyi < .5) return li > .1 && X - cxi < .25 && Y - cyi < .25 ? P[4] : P[3];   // a pale fleck, its lit corner (a floret with a dark eye read as polka-dot rings)
      const t = li + b * .2; return t > .55 ? P[3] : t > -.45 ? P[2] : P[1]; }
    const tc = 20 + (36 - Y) * .12, P2 = PAL[2];
    const bark = (u, hw) => { const s = u / hw * dir; return s > 1 - e / hw * 1.2 ? P2[4] : s < -1 + e / hw * 1.2 ? P2[0] : s > .3 ? P2[2] : P2[1]; };
    if(Y > 16){ const hw = Y > 32 ? 2.2 : 1.3, u = X - tc; if(Math.abs(u) < hw) return Y > 36 - e ? P2[0] : bark(u, hw); }
    if(Y > 15 && Y < 22){ const u = (X - tc) - (Y - 22) * -1.4; if(Math.abs(u) < .8) return bark(u, .8); }
    if(Y > 15 && Y < 21){ const u = (X - tc) - (Y - 21) * 1.5; if(Math.abs(u) < .8) return bark(u, .8); }
    return null; });
  // 落石注意: the diamond with a yellow margin, black border, a stepped cliff and three falling rocks; the white plate; a galvanised pipe post
  // with a moonlit edge (the sprite's post was lost against the cedars, so the sign floated)
  const SG = { y1:'#ffd050', y2:'#f0b020', y3:'#c88a18', k:'#1a1410', post:['#20242a', '#4a505a', '#8a909a', '#c8d2de'], plate:'#e8e6de', rim:'#3a3a40' };
  const signHi = (dir, R) => hiSpr('sign' + dir, 15, 28, R, (X, Y, e, x, y) => { const b = bay(x, y);
    const D = Math.abs(X - 7.5) + Math.abs(Y - 7.5);
    if(D < 7.5){ if(D > 7.5 - e) return SG.k; if(D > 6.7) return Y < 7.5 ? SG.y1 : SG.y2; if(D > 6) return SG.k;
      if(Y > 9.2 && Y < 10.9 && X > 3 && X < 12.2) return SG.k;                                              // the road at the cliff foot
      if(Y > 4.6 && Y <= 9.2 && X + Y >= 15.4 + .45 * Math.sin(Y * 4.1) && X < 12.2) return SG.k;          // the cliff, its face broken in ledges
      for(const [rx, ry, rr] of [[4.6, 5.5, .75], [5.9, 7.5, .8], [3.4, 7.7, .6]]){ const ddx = X - rx, ddy = (Y - ry) * 1.15; if(ddx * ddx + ddy * ddy < rr * rr) return SG.k; }   // three rocks, falling
      return Y + b * 1.2 < 6 ? SG.y1 : Y + b * 1.2 < 12 ? SG.y2 : SG.y3; }
    if(Y >= 16 && Y < 21 && X >= 1 && X < 14){ if(Y < 16 + e || Y > 21 - e || X < 1 + e || X > 14 - e) return SG.rim; return Y < 16 + 2 * e ? '#ffffff' : Y > 21 - 2 * e ? '#a8a6a0' : SG.plate; }
    if(X >= 6.2 && X < 8.8 && Y > 14){ const s = (X - 7.5) / 1.3 * dir;   // the pipe, with clamps where the diamond and the plate are bolted on
      if((Y > 14.6 && Y < 15.2) || (Y > 21 && Y < 21.6)) return s > .4 ? SG.post[3] : SG.post[1];
      return s > 1 - e / 1.3 * 1.2 ? SG.post[3] : s < -1 + e / 1.3 * 1.2 ? SG.post[0] : s > .25 ? SG.post[2] : SG.post[1]; }
    return null; });
  // カーブミラー near by (buildings3d r5): at 4.5x the 14 x 34 sprite's orange rim stepped into blocks. Same disc, post and foot, drawn again
  // at 2x / 4x (studied: a Kyoto lane mirror and the Route 405 mirrors in snow, Commons): a dark outline, the orange rim lit on the sprite's
  // own side (lower left) with a 1 px hot lip, the hood (フード) as a deeper rim over the top with its shaded underside, a dark seam between rim and glass;
  // the glass as a convex reflection (the horizon bowed, cedar tops on it, the road narrowing to the bend, its centre line in dashes) and the
  // bright crescent along the upper left that says "convex"; the post as a lacquered pipe with the two bracket clamps; a concrete footing
  const MR = { out:'#2a0e06', rim0:'#5a2410', hot:'#ffc888', lit:'#ff9a50', mid:'#e8742e', sh:'#d8601e', dk:'#a8441a', hood:'#7a2c10', seam:'#1a0a08',
    sky:['#9ab4cc', '#7a94b0', '#5a7090'], spec:'#e8f2ff', hz:'#2a3a5a', tree:'#141c2a', road:'#1a2030', road2:'#141a28', line:'#c8c0a0', edge:'#5a6478' };
  const mirrorHi = R => hiSpr('mirror', 14, 34, R, (X, Y, e, x, y) => { const dx = X - 7, dy = Y - 7, r = Math.sqrt(dx * dx + dy * dy), b = bay(x, y);
    if(r < 6.95){ const l = r > .01 ? -(dx - dy) / (r * 1.414) : 0, top = r > .01 ? -dy / r : 0;
      if(r > 6.95 - e) return MR.out;
      if(r > 6.62) return MR.rim0;                                                                          // the outer lip
      const rin = top > .5 ? 5.6 - (top - .5) * 1.0 : 5.6;                                                 // the hood: the rim deepens over the top
      if(r > rin){ if(r < rin + e) return MR.seam; if(top > .5 && r < 5.6) return r < 5.6 - e ? MR.hood : MR.dk;   // its underside in shade, a lit edge
        if(r > 6.62 - e && l > .2) return MR.hot; return l > .45 ? MR.lit : l > -.1 ? MR.mid : l > -.6 ? MR.sh : MR.dk; }   // (hard bands: a dither in the rim read as a dotted ring)
      // the glass: a convex reflection of the bend
      if(r > 4.4 && r < 4.4 + Math.max(e, .3) && (-dx - dy) / (r * 1.414) > .86) return MR.spec;                                   // the crescent highlight, short (a long white arc read as a scratch)
      const v = dy + .03 * dx * dx;                                                                        // the horizon bows down at the sides
      if(v < -1){ if(v > -1 - (.2 + .55 * hash(Math.floor((X + 20) * 1.6) * 1.7)) && dx > .3) return MR.tree;   // a few cedar tops along the horizon, on the far side only
        const s = dx + b * .6; return s < -.4 ? MR.sky[0] : s < .5 ? MR.sky[1] : MR.sky[2]; }
      if(v < 1) return v < -1 + e ? MR.edge : MR.hz;
      const f = (v - 1) / 4.6, cl = dx + .9 * f * f;                                                       // the road bending away, its centre line narrowing
      if(Math.abs(cl) > 1.3 + 3.2 * f) return MR.road2;                                                    // the verge either side of the road wedge
      if(Math.abs(cl) < .35 + .75 * f && ((v * 1.6) % 1.4 + 1.4) % 1.4 < .95) return MR.line;
      return MR.road; }
    if(Y > 13 && Y <= 33 && X >= 6 && X < 8){ const s = (X - 7);                                                     // the post: a lacquered pipe
      if((Y > 13.5 && Y < 14.4) || (Y > 15.4 && Y < 16)) return Y < 13.5 + e || (Y > 15.4 && Y < 15.4 + e) ? '#c8ccd8' : s < 0 ? '#8a8e9a' : '#5a5e6a';   // the bracket clamps
      return s < -1 + e ? MR.hot : s < -.2 ? MR.lit : s < .55 ? '#c8541a' : s < 1 - e ? MR.dk : MR.rim0; }
    if(Y > 33 && X >= 5 && X < 9){ return Y < 33 + e ? '#5a5a64' : X > 9 - e ? '#24242a' : '#3a3a40'; }  // the footing
    return null; });
  // the plate's 落石注意 at a size that fits the plate in whole canvas pixels (one font pixel per canvas pixel; DotGothic16 rasterised and
  // thresholded at 8-16 px, built once the font is in): downscaling the 16 px plate broke its strokes into a white square
  const PLT = [];
  function plateTexts(){ if(PLT.length || !document.fonts || !document.fonts.check('16px DotGothic16')) return; for(let s = 8; s <= 16; s++){ const c = document.createElement('canvas'), g = c.getContext('2d'); g.font = s + 'px DotGothic16'; c.width = Math.ceil(g.measureText('落石注意').width) + 1; c.height = s + 2;
    g.font = s + 'px DotGothic16'; g.textBaseline = 'middle'; g.fillStyle = '#202028'; g.fillText('落石注意', 0, c.height / 2); const im = g.getImageData(0, 0, c.width, c.height), dd = im.data; for(let n = 3; n < dd.length; n += 4) dd[n] = dd[n] > 110 ? 255 : 0; g.putImageData(im, 0, 0); PLT.push(c); } }
  const plateFit = wpx => { let best = null; for(const c of PLT) if(c.width <= wpx) best = c; return best; };
  // the jizō's candle near by: a wax stub with a lit side, a dish, a wick and a flame (outer orange, yellow, white core) instead of a cream block
  function candle(x, y, k, now){ const o = PX, w = Math.max(o, k), h = Math.max(o * 2, 2 * k), fl = reduce ? 0 : Math.round(Math.sin(now / 90) * Math.sin(now / 37)) * o;
    cx.fillStyle = '#3a3444'; pxRect(x - w / 2 - o, y - o, w + 2 * o, o);
    cx.fillStyle = '#d8ccb0'; pxRect(x - w / 2, y - h, w, h - o); cx.fillStyle = '#fff6d8'; pxRect(x - w / 2, y - h, o, h - o); cx.fillStyle = '#a89878'; pxRect(x + w / 2 - o, y - h, o, h - o);
    cx.fillStyle = '#2a2018'; pxRect(x - o / 2, y - h - o, o, o);
    const fh = Math.max(o * 3, h * .8), fw = Math.max(o * 2, w * .8), fx = x + fl * .5, fy = y - h - o;
    cx.fillStyle = '#ff9a40'; pxRect(fx - fw / 2, fy - fh * .7, fw, fh * .7); pxRect(fx - o / 2 + fl, fy - fh, o, fh * .3 + o);
    cx.fillStyle = '#ffe2a0'; pxRect(fx - fw / 2 + o, fy - fh * .62, Math.max(o, fw - 2 * o), fh * .5); cx.fillStyle = '#ffffff'; pxRect(fx - o / 2, fy - fh * .45, o, Math.max(o, fh * .25)); }
  // a guard-rail delineator near by: a round amber reflector in a dark rim on a short stem, its gleam in one corner (was a pale square)
  function reflector(x, ry, sz, col, hot){ const o = PX, r = sz / 2, cy0 = ry + r;
    cx.fillStyle = '#1a1418'; pxRect(x - o / 2, cy0, o, sz * .5); disc(x, cy0, r + o * .5, '#2a1a10'); disc(x, cy0, r - o * .5, col);
    if(r > o * 2) disc(x, cy0, r * .5, hot ? '#ffe08a' : mixc(col, '#ffffff', .2)); cx.fillStyle = '#ffffff'; pxRect(x - r * .5, cy0 - r * .5, o, o); }
  function disc(x, y, r, col){ cx.fillStyle = col; if(r < PX * .75){ pxRect(x - PX / 2, y - PX / 2, PX, PX); return; } const n = Math.ceil(r / PX);
    for(let k = -n; k <= n; k++){ const yy = (k + .5) * PX, ww = Math.sqrt(Math.max(0, r * r - yy * yy)); if(ww < PX * .5) continue; cx.fillRect(snap(x - ww), snap(y + k * PX), Math.max(PX, snap(x + ww) - snap(x - ww)), PX); } }
  /* The checkpoint gantry's lanterns as chōchin (提灯) once they are big enough to read (from 2.5 canvas px across the radius; a narrow
     viewport passes under them at 6-10): the core's drawGate paints each as a plain ellipse, which near by became a solid red or cream disc.
     The core function is wrapped once (installed from the backdrop, never at load); on the pass only, its ellipses are recorded instead of
     filled and each is drawn in its own footprint as a paper lantern: lacquered top and bottom caps, a barrel body with bamboo ribs,
     dark at the edges and lit from within (a bright core and a hot centre). Everything else on the gantry is the core's, unchanged. */
  let passNow = -1, gateHooked = false, lqN = 0, lqSkip = false; const LQ = Array.from({ length:16 }, () => ({ x:0, y:0, rx:0, ry:0, red:false }));
  const LQC = { red:['#3a0a12', '#8a1424', '#d0303a', '#ff7058', '#ffc890', '#a01c2c', '#e85048'], paper:['#3a2810', '#a87a3a', '#f0cc80', '#fff0c0', '#ffffff', '#c09450', '#f4dca0'] };   // outline, edge, body, core, hot, rib, rib on the core
  function lqEllipse(x, y, rx, ry){ if(lqN < LQ.length){ const q = LQ[lqN++]; q.x = x; q.y = y; q.rx = rx; q.ry = ry; q.red = cx.fillStyle === '#ff3a3a'; } lqSkip = true; }
  function lqFill(){ if(lqSkip){ lqSkip = false; return; } return CanvasRenderingContext2D.prototype.fill.apply(cx, arguments); }
  function chochin(q){ const C = q.red ? LQC.red : LQC.paper, X = Math.round(q.x / PX), Y = Math.round(q.y / PX), rx = Math.max(2, Math.round(q.rx / PX)), ry = Math.max(3, Math.round(q.ry / PX));
    const cap = Math.max(1, Math.round(ry * .16)), cw = Math.max(1, Math.round(rx * .55)), gap = ry >= 9 ? 3 : 2, R = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(x * PX, y * PX, w * PX, h * PX); };
    for(let r = -ry; r < ry; r++){ const t = Math.abs((r + .5) / ry), hw = Math.max(1, Math.round(rx * Math.pow(1 - Math.pow(t, 2.6), 1 / 2.6))), cr = Math.max(0, Math.round(hw * .42));
      const rib = r > -ry + 1 && r < ry - 2 && (r + ry) % gap === 0;
      R(X - hw, Y + r, hw * 2, 1, C[0]); if(hw > 1) R(X - hw + 1, Y + r, hw * 2 - 2, 1, rib ? C[5] : C[1]); if(hw > 2) R(X - hw + 2, Y + r, hw * 2 - 4, 1, rib ? C[5] : C[2]);
      if(cr > 0 && hw > 3) R(X - cr, Y + r, cr * 2, 1, rib ? C[6] : C[3]);
      if(!rib && t < .34 && cr > 1) R(X - Math.max(1, cr >> 1), Y + r, Math.max(1, cr >> 1) * 2, 1, C[4]); }
    for(const [y0, s] of [[Y - ry - cap, 1], [Y + ry, -1]]){ R(X - cw, y0, cw * 2, cap, '#1a1014'); if(cw > 1) R(X - cw + 1, s > 0 ? y0 : y0 + cap - 1, Math.max(1, cw - 1), 1, '#5a4030'); } }
  function hookGate(){ if(gateHooked || typeof window.drawGate !== 'function') return; gateHooked = true; const g0 = window.drawGate;
    window.drawGate = function(x, y, uw, fog, now, next, fork){ if(now !== passNow || uw * .045 < PX * 2.5) return g0.apply(this, arguments);
      lqN = 0; lqSkip = false; cx.ellipse = lqEllipse; cx.fill = lqFill;
      try{ g0.apply(this, arguments); } finally { delete cx.ellipse; delete cx.fill; }
      cx.globalAlpha = 1 - fog * .6; for(let i = 0; i < lqN; i++) chochin(LQ[i]); cx.globalAlpha = 1; }; }
  const DRAW = { sign:drawSign, mirror:drawMirror, rail:drawRail, wall:drawWall, tree:drawTree, toro:drawToro, jizo:drawJizo, torii:drawTorii, chev:drawChev, ff:drawFF, sakura:drawSakura };
  /* The valley beside the road (Kellan, 2026-11-24: no ground texture should show). Beyond the guard rail the land falls away into wooded
     valley, so what you see from the road at night is the forest canopy from above, not grass: on the ground rows of each segment, from just
     behind the rail out to the screen edge, three canopy bands, darker toward the valley and hazed there (the valley mist), and near by a few
     world-anchored crowns with a moonlit cap, so the canopy has depth and moves with the road. Drawn in the road pass, under every prop. */
  const CAN = { a:'#0c1816', b:'#0a1414', c:'#070e10', crown:'#12221f', cap:'#24403e' };
  /* Far away a segment is a row or two, so one quad each cost a fill per segment: there the field quads of consecutive segments that share a
     colour and touch are merged into one run (up to 8 segments or 6 pixel rows; the rail's edge is a chord across it, under a pixel off), and a
     run is drawn when the next one starts. The last run of the road pass is drawn by the first prop of the sprite pass (runFlush in draw):
     every prop is drawn after the road pass, and the far run lies beyond them all. */
  const RUN = [{ on:false }, { on:false }]; let RUNF = -1;
  function runEmit(R){ if(!R.on) return; R.on = false; poly(R.nx, R.ny, R.ex, R.ny, R.ex, R.fy, R.fx, R.fy, R.col); }
  function runQ(sd, col, xa, ya, xb, yb, ex, f){ if(f !== RUNF){ RUNF = f; RUN[0].on = RUN[1].on = false; } const R = RUN[sd < 0 ? 0 : 1];
    if(R.on && R.col === col && Math.abs(R.fy - ya) < .5 && R.n < 8 && R.ny - yb < PX * 6){ R.fx = xb; R.fy = yb; R.n++; return; }
    runEmit(R); R.on = true; R.col = col; R.nx = xa; R.ny = ya; R.fx = xb; R.fy = yb; R.ex = ex; R.n = 1; }
  function runFlush(){ runEmit(RUN[0]); runEmit(RUN[1]); }
  function canopy(s, a, b, fog, now){ if(!a.w || !b.w) return; let ax = a.x, ay = a.y, aw = a.w; const by = b.y, bx = b.x, bw = b.w, cl = s.clip;
    if(ay > cl){ const t = (ay - cl) / (ay - by); ax += (bx - ax) * t; aw += (bw - aw) * t; ay = cl; }   // (only the rows the nearer road left open, as the ground fill)
    if(!(ay - by >= .5)) return; const low = FOG_COL || fogLow, i = s.index, fm = Math.max(fog, .3); if(!low) return;   // (the road pass's haze colour, sk.low: set before the road is drawn)
    for(let sd = -1; sd <= 1; sd += 2){ const ex = sd < 0 ? -4 : W + 4, x0a = ax + sd * 1.12 * aw, x0b = bx + sd * 1.12 * bw; if(sd < 0 ? x0a < ex && x0b < ex : x0a > ex && x0b > ex) continue;
      if(fog > .35){ if(s.bm < 1 && s.bA !== s.bB) poly(x0a, ay, ex, ay, ex, by, x0b, by, fc(CAN.b, fm, low)); else runQ(sd, fc(CAN.b, fm, low), x0a, ay, x0b, by, ex, now); continue; }   // (in a border blend the other road's far props may draw before ours: no deferred run there)
      const x2a = ax + sd * 3.6 * aw, x2b = bx + sd * 3.6 * bw;   // (two bands: the canopy below the rail, and the hazed valley beyond)
      poly(x0a, ay, x2a, ay, x2b, by, x0b, by, fc(i % 2 ? CAN.a : CAN.b, fog, low)); poly(x2a, ay, ex, ay, ex, by, x2b, by, fc(CAN.c, fm, low));
      if(fog > .2 || aw < 60) continue;
      for(let j = 0; j < 2; j++){ const h = hash(i * 3.7 + j * 1.31 + sd * .71), X = 1.35 + h * 2.2, t = hash(i * 5.3 + j * 2.9 + sd), w = aw + (bw - aw) * t, x = ax + (bx - ax) * t + sd * X * w, y = ay + (by - ay) * t, u = w * (.12 + .1 * hash(i * 1.9 + j + sd * 3));
        if(u < PX * 3) continue; cx.fillStyle = fc(CAN.crown, fog, low); pxRect(x - u / 2, y - u * .3, u, u * .3); pxRect(x - u * .32, y - u * .42, u * .64, u * .14); cx.fillStyle = fc(CAN.cap, fog, low); pxRect(x - u * .2, y - u * .42, u * .4, PX); } } }
  ENV.pass = {
    // build every sprite (both moon sides) up front so crossing into the pass never stalls on cache building
    warm(){ for(const _ of ENV.pass.warmSteps()); },
    // the same build, resumable for the staged warm-up: the sprites first, a few per step (they are cached, so the upload pass below just finds them);
    // the game-canvas part (uploads, the backdrop sweep) is cut into steps that each restore the canvas state before yielding (a slice runs just
    // after a frame is shown, and the next frame paints over whatever it drew)
    *warmSteps(){ for(const d of [-1, 1]){ for(let v = 0; v < 3; v++){ sugi(v, d); yield; } kusu(0, d); kusu(1, d); yield; toro(d); jizo(d); torii(d); yield; sakura(d); chevron(d); yield; }
      for(let v = 0; v < 6; v++) rockSpr(v); tipStrip(); for(let v = 0; v < 3; v++) tuftSpr(v); yield; for(let v = 0; v < 6; v++){ rockHi(v, 2); rockHi(v, 4); } yield; signSpr(-1); signSpr(1); mirrorSpr(); yield; mirrorHi(2); mirrorHi(4); yield; for(const d of [-1, 1]) for(const R of [2, 4]){ toriiHi(d, R); yield; sakuraHi(d, R); signHi(d, R); yield; }
      const up = c => { cx.drawImage(c, 0, 0, PX, PX); cx.drawImage(c, 0, 0, c.width * PX, c.height * PX); }; if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16').then(() => { try{ plate(); plateTexts(); }catch(e){} }, () => {});   // the road-name plate needs the pixel font: build it as soon as the font is in, not when first seen   // draw each once so the GPU texture upload happens now, not mid-ride
      // (first 60 s, research/sundown-craft/first60.md: the upload pass in four steps, each its own save/restore, so the ride can take it)
      for(const d of [-1, 1]){ cx.save(); for(let v = 0; v < 3; v++) up(sugi(v, d)); up(kusu(0, d)); up(kusu(1, d)); up(toro(d)); up(jizo(d)); up(torii(d)); up(sakura(d)); up(chevron(d)); cx.restore(); yield; }
      cx.save(); { const pl = plate(); if(pl) up(pl); }
      for(let v = 0; v < 6; v++){ up(rockSpr(v)); up(rockHi(v, 2)); up(rockHi(v, 4)); } for(let v = 0; v < 3; v++) up(tuftSpr(v)); up(signSpr(-1)); up(signSpr(1)); up(mirrorSpr()); up(mirrorHi(2)); up(mirrorHi(4)); cx.restore(); yield;
      cx.save(); for(const d of [-1, 1]) for(const R of [2, 4]){ up(toriiHi(d, R)); up(sakuraHi(d, R)); up(signHi(d, R)); } cx.restore(); yield;
      cx.save(); for(const c of ['#ffe0a0', '#2a4660', '#1a3044', '#0e1c28']) for(const dn of [.125, .25, .5, .75]){ cx.fillStyle = pat(c, dn); cx.fillRect(0, 0, PX * 8, PX * 8); }
      cx.globalCompositeOperation = 'lighter'; glow(PX * 4, PX * 4, PX * 4, '#ffb060', .01); pool(PX * 4, PX * 4, PX * 4, PX * 2, '#ffa850', .01); cx.restore();
      // run the backdrop once across the night so its mist and rim patterns exist before the ride reaches them
      if(typeof skyAt === 'function' && W > 0) for(let t = 0; t <= 1.001; t += .05){ const sk = skyAt(t * .97), tint = LANDS[4] ? LANDS[4].sky : sk.mid; sk.mid = mixc(sk.mid, tint, .4 * (1 - t)); sk.low = mixc(sk.low, tint, .3 * (1 - t)); this.backdrop({ hz:H / 2 + 2, sk, now:0, moonX:W / 2, moonY:H * .2, t, far:sk.mid, near:sk.mid, L:LANDS[4] }); yield; }
      cx.clearRect(0, 0, W, H); },
    road:['#191b25', '#1c1e29'],
    lampCol:'#9a6a3a',
    place,
    // the landmark jump keeps the roadside (setpiece/jump.js keepSides): the guard rail stands at 1.12, inside the default keep line
    jumpKeep:sp => sp.type === 'rail' ? true : undefined,
    lit:(i, s) => s.passLit || 0,
    draw(sp, x, y, uw, fog, now, sk){ if(RUN[0].on || RUN[1].on) runFlush(); if(sk.low !== fogLow){ fogLow = sk.low; FC.clear(); } const f = DRAW[sp.type]; if(f) f(sp, x, y, uw, fog, now); },
    backdrop(o){ const { hz, sk, now, moonX, moonY, t } = o; passNow = now; if(!gateHooked) hookGate(); const dawn = clamp((t - .7) / .3, 0, 1), moonCol = mixc('#dfe8f0', '#ffb070', dawn);
      const teal = c => mixc(c, '#0c2a34', .22);
      const c0 = mixc('#2a4660', sk.low, .3), c1 = mixc('#1a3044', sk.low, .22), c2 = mixc('#0e1c28', sk.low, .14), c3 = mixc('#060c12', sk.low, .08);
      clouds(now, sk, moonX, moonY, moonCol);
      ridge(RIDGES[0], skyPar(RIDGES[0].par), hz, c0, moonCol, .4, moonX);
      mist(snap(hz - H * .12), snap(hz + PX * 2), mixc(c0, moonCol, .22), now, 1, moonX, moonCol);
      ridge(RIDGES[1], skyPar(RIDGES[1].par), hz, c1, moonCol, .5, moonX);
      switchbacks(skyPar(RIDGES[1].par), hz, RIDGES[1], c1, now);
      mist(snap(hz - H * .07), snap(hz + PX * 2), mixc(c1, moonCol, .2), now, 2, moonX, moonCol);
      ridge(RIDGES[2], skyPar(RIDGES[2].par), hz, c2, moonCol, .55, moonX);
      town(skyPar('near'), hz, now, moonCol);
      mist(snap(hz - H * .03), snap(hz + PX * 2), mixc(c2, moonCol, .16), now, 3, moonX, moonCol);
      treeline(skyPar('edge'), hz + PX, c3, mixc(c3, moonCol, .45), moonX);
      return false; },
    // the headlight: a warm pool on the road ahead of the bike, in hard steps, under the traffic
    roadFX(s, a, b, fog, f, now){ canopy(s, a, b, fog, now); if(a.y < H * .6) return; const lv = a.y > H * .8 ? .08 : a.y > H * .7 ? .055 : .03, wa = a.w * .42, wb = b.w * .42;
      cx.globalCompositeOperation = 'lighter'; poly(W / 2 - wa, a.y, W / 2 + wa, a.y, W / 2 + wb, b.y, W / 2 - wb, b.y, `rgba(255,236,200,${lv})`); cx.globalCompositeOperation = 'source-over'; },
    // headlight-lit fog: a faint beam of dithered motes ahead of the bike, only where it rakes the near road
    overlay(al, now, sk){ const bs = Math.min(W * .2, H * .27), by = snap(H - bs * .62), top = snap(H * .6); cx.globalCompositeOperation = 'lighter';
      for(const [w0, w1, a] of [[.05, .2, .035], [.03, .11, .045]]){ cx.fillStyle = `rgba(255,232,190,${a * al})`; cx.beginPath(); cx.moveTo(snap(W / 2 - bs * w0), by); cx.lineTo(snap(W / 2 - W * w1), top); cx.lineTo(snap(W / 2 + W * w1), top); cx.lineTo(snap(W / 2 + bs * w0), by); cx.closePath(); cx.fill(); }
      cx.globalCompositeOperation = 'source-over'; }
  };
})();
// where this road's barrier is drawn, for the collider (half-road widths)
ENV.pass.barrier = 1.12;
