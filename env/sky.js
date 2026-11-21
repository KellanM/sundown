/* Sundown sky and moon. See env/README.md, "Sky".
   Studied (looked at, not copied):
   - Hiroshige, "Moon Pine, Ueno" (One Hundred Famous Views of Edo, no. 89) and "Full Moon at Kanazawa": bokashi, a hard band of deep
     Prussian blue held at the top edge of the sky that falls off fast into paler sky toward the horizon; the moon a small flat crisp disc,
     with the drama in the sky around it, not in moon detail; a thin line of geese or a mist streak crossing it.
   - Yoshitoshi, One Hundred Aspects of the Moon (plates 4, 74): the moon is partly cut by things in front of it (branches, cloud); no
     soft bloom, only a slightly paler sky around it.
   - Super Hang-On / OutRun: the sky is stacked horizontal raster bands, and the bands get thinner toward the horizon.
   Rules taken: banded sky with dithered seams, indigo ink band at the top; a gibbous moon drawn per pixel (lit limb, terminator, maria in
   three tones read as the rabbit pounding mochi), a stepped halo and a faint 22-degree 'kasa' ring before rain; thin flat-bottomed cloud
   streaks lit by the moon on top and by the city or the dawn underneath; dawn rises as hard indigo, violet, rose and gold bands.
   Everything is cached; per frame the sky is a dozen drawImage calls. */
"use strict";
(function(){
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  const bay = (x, y) => BY[(y & 3) * 4 + (x & 3)];
  const mixv = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hx6 = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));   // the game's hx() is defined after this file loads
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const h2 = (x, y, s) => hash(x * 12.9898 + y * 78.233 + s * 37.719);
  function vnoise(x, y, s, P){ const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const X0 = P ? ((xi % P) + P) % P : xi, X1 = P ? (((xi + 1) % P) + P) % P : xi + 1;
    const a = h2(X0, yi, s), b = h2(X1, yi, s), c = h2(X0, yi + 1, s), d = h2(X1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function newC(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  // paint a canvas pixel by pixel: fn(x, y) returns [r, g, b, a(0..1)] or null
  function paint(w, h, fn){ const c = newC(w, h), k = c.getContext('2d'), img = k.createImageData(c.width, c.height), d = img.data;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const p = fn(x, y); if(!p) continue; const o = (y * w + x) * 4;
      d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = p[3] === undefined ? 255 : p[3] * 255; }
    k.putImageData(img, 0, 0); return c; }
  const C = {};   // all caches live here
  const S = { calm:0, last:0 };

  // ---------------------------------------------------------------- per-road sky character, crossfaded at borders
  // stars: how many survive the city glow; milky: the faint band; cloud: how many streaks; kasa: the halo ring that means rain; city: warm glow under clouds
  const ROAD = {
    harbour:  { stars:.75, milky:.45, cloud:.5, kasa:.25, city:.55 },
    bay:      { stars:.35, milky:.1, cloud:1, kasa:1, city:.3 },
    neon:     { stars:.4, milky:.08, cloud:.45, kasa:.2, city:1 },
    tunnels:  { stars:.7, milky:.4, cloud:.5, kasa:.25, city:.45 },
    pass:     { stars:1, milky:1, cloud:.3, kasa:.3, city:.08 },
    refinery: { stars:.45, milky:.15, cloud:.8, kasa:.4, city:.85 },
    // the second six roads each get their own night instead of the default (2026-11-19 craft pass):
    coast:      { stars:.7, milky:.45, cloud:.6, kasa:.35, city:.3 },    // sea air over Sagami Bay: clear, a few streaks, the shore town faint below
    snow:       { stars:.35, milky:.08, cloud:1, kasa:.9, city:.25 },   // snow cloud rolling over the valley: few stars, the ice ring round the moon
    paddies:    { stars:1, milky:.9, cloud:.3, kasa:.2, city:.06 },     // the darkest sky in the game: countryside, the milky band at its fullest
    aqua:       { stars:.55, milky:.25, cloud:.6, kasa:.4, city:.45 },  // out on Tokyo Bay between two cities
    shimanami:  { stars:.9, milky:.7, cloud:.3, kasa:.15, city:.15 },   // a clear night over the Seto Inland Sea
    sakurajima: { stars:.45, milky:.12, cloud:.7, kasa:.2, city:.7 },   // ash haze: stars dimmed, cloud bellies lit orange from below (the crater, Kagoshima)
    haneda:     { stars:.3, milky:.04, cloud:.55, kasa:.2, city:.95 },   // the airport and Tokyo: sodium glow under every cloud
    minato:     { stars:.4, milky:.1, cloud:.45, kasa:.3, city:.8 },     // Yokohama's waterfront: a clear harbour sky, the new city's cool glow low under thin cloud
    shuto:      { stars:.18, milky:0, cloud:.62, kasa:.08, city:1 },   // central Tokyo: a low sodium-lit cloud deck, a few stars, no ring round the moon
    kurobe:     { stars:1, milky:.85, cloud:.22, kasa:.2, city:0 },   // the Northern Alps: thin cold air, the milky band over the peaks, no town glow at all
    akiba:      { stars:.15, milky:0, cloud:.55, kasa:.08, city:1 },   // the electric town: the cloud deck lit from below by every sign
    gion:       { stars:.55, milky:.15, cloud:.35, kasa:.25, city:.3 }   // old Kyoto under Higashiyama: a clear indigo night, thin cloud, only a faint town glow
  };
  const DEF = { stars:.7, milky:.4, cloud:.5, kasa:.3, city:.4 };

  // ---------------------------------------------------------------- the banded sky
  const NB = 18, FP = 1.35;   // bands, and how they crowd toward the horizon
  const DAWN = [[0, [255, 234, 172]], [.12, [255, 198, 112]], [.3, [246, 132, 104]], [.52, [176, 84, 136]], [.78, [86, 60, 140]], [1, [52, 48, 112]]];
  function ramp(st, s){ for(let i = 1; i < st.length; i++) if(s <= st[i][0]) return mixv(st[i - 1][1], st[i][1], (s - st[i - 1][0]) / (st[i][0] - st[i - 1][0])); return st[st.length - 1][1]; }
  function skyCol(tq, bgA, bgB, mq){ const s = skyAt(tq * .97), tint = mixc(LANDS[bgA].sky, LANDS[bgB].sky, mq);
    const top = hx(s.top), mid = hx(mixc(s.mid, tint, .4 * (1 - tq))), low = hx(mixc(s.low, tint, .3 * (1 - tq))), ink = mixv(top, [8, 14, 46], .6);
    const d = cl((tq - .74) / .24, 0, 1), F = .95 * d;
    return v => { let c = v < .1 ? ink : v < .3 ? mixv(ink, top, (v - .1) / .2) : v < .7 ? mixv(top, mid, (v - .3) / .4) : mixv(mid, low, (v - .7) / .3);
      if(F > 0){ const hgt = 1 - v; if(hgt < F){ const s2 = hgt / F; c = mixv(c, ramp(DAWN, s2), cl(1.15 - s2, 0, 1) * Math.min(1, d * 1.6)); } }
      return c; }; }
  function buildSky(w, h, hzc, tq, bgA, bgB, mq){ const col = skyCol(tq, bgA, bgB, mq), band = i => col(Math.pow(cl((i + .5) / NB, 0, 1), 1 / FP));
    const cols = []; for(let i = 0; i <= NB; i++) cols.push(band(Math.min(i, NB - 1)).map(Math.round));
    const c = C.sky && C.sky.width === w && C.sky.height === h ? C.sky : newC(w, h), k = c.getContext('2d'), img = k.createImageData(w, h), d = img.data;
    for(let y = 0; y < h; y++){ const v = Math.min(1, y / hzc), s = Math.pow(v, FP) * NB, i = Math.min(NB - 1, Math.floor(s)), A = cols[i], B = cols[Math.min(NB - 1, i + 1)];
      const left = Math.pow((i + 1) / NB, 1 / FP) * hzc - y, m = i >= NB - 1 ? 0 : left < 1 ? .5 : left < 2 ? .25 : left < 3 ? .0625 : 0;   // rows to the next band
      for(let x = 0; x < w; x++){ const p = m > 0 && bay(x, y) < m ? B : A, o = (y * w + x) * 4; d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255; } }
    k.putImageData(img, 0, 0); C.sky = c; C.col = col; }

  // ---------------------------------------------------------------- stars and the faint milky band (tiles that scroll with the road's heading)
  function buildStars(w, hzc){
    const c = newC(w, hzc), k = c.getContext('2d'), n = Math.round(w * hzc / 200);
    for(let i = 0; i < n; i++){ const x = Math.floor(hash(i * 3.17 + .3) * w), yv = Math.pow(hash(i * 7.71 + .9), 1.25), y = Math.floor(yv * hzc * .9), b = hash(i * 1.31 + 5);
      if(yv > .7 && hash(i * 9.1) < (yv - .7) / .3) continue;   // thin out toward the horizon haze
      const tc = hash(i * 4.4), tone = tc < .12 ? [255, 214, 168] : tc < .24 ? [176, 200, 255] : [226, 220, 246];
      const a = b > .96 ? 1 : b > .82 ? .75 : b > .5 ? .45 : .25; k.fillStyle = `rgba(${tone[0]},${tone[1]},${tone[2]},${a})`; k.fillRect(x, y, 1, 1); }
    C.stars = c;
    // the milky band: a slow arc (periodic across the tile), clumped by noise, with a dark rift along it; three faint dithered tones
    const P = Math.max(4, Math.round(w / 14));
    C.milky = paint(w, hzc, (x, y) => { const ph = x / w * 6.2832, yc = hzc * (.36 + .18 * Math.sin(ph + 1)), hw = hzc * .15 * (.8 + .35 * Math.sin(ph * 2 + .4)), dy = (y - yc) / hw;
      let n = Math.exp(-dy * dy) * (.5 + .6 * vnoise(x / 14, y / 5, 3, P)); const rd = (y - yc - hw * .18) / (hw * .2); n -= .55 * Math.exp(-rd * rd) * vnoise(x / 9, y / 3, 7, Math.round(w / 9));
      n *= 1 - cl((y / hzc - .7) / .25, 0, 1); if(n <= .18) return null;
      if(n > .42 && hash(x * 13.7 + y * 3.1) > .93) return [240, 236, 255, .55];
      const q = Math.floor(n * 4 + bay(x, y) - .6); return q <= 0 ? null : [196, 188, 236, q === 1 ? .07 : q === 2 ? .13 : .2]; });
    // a few bright stars that twinkle as pixel crosses; positions in tile pixels
    C.tw = []; for(let i = 0; i < 9; i++) C.tw.push([Math.floor(hash(i * 17.3 + 2) * w), Math.floor((.05 + Math.pow(hash(i * 5.9 + 1), 1.3) * .6) * hzc), i % 3 === 1 ? 1 : 0]);
  }
  function twinkleSprites(){ if(C.twS) return;
    const pal = [['#fff8ea', '#b8c4ff', '#5a64a8'], ['#fff2d4', '#ffb070', '#9a5040']]; C.twS = pal.map(([a, b, c]) => [0, 1, 2].map(l => paint(7, 7, (x, y) => {
      const dx = Math.abs(x - 3), dy = Math.abs(y - 3), r = dx + dy; if(dx && dy) return l === 2 && dx === 1 && dy === 1 ? hx(c).concat(.5) : null;
      if(r === 0) return hx(a); if(l === 0) return null; if(r === 1) return hx(l === 2 ? a : b); if(l === 2) return r === 2 ? hx(b) : hx(c); return null; }))); }

  // ---------------------------------------------------------------- the moon: a gibbous moon lit from the left, shaded per pixel
  // ramps from dark to light. Highlands are cream, maria grey-lavender; at the horizon both warm to amber.
  const HLn = ['#82708a', '#c6b6aa', '#e4d8c0', '#f4ecd6', '#fffcf0'].map(hx6), MAn = ['#625a7c', '#837b96', '#a29aae', '#bdb5ba'].map(hx6);
  const HLw = ['#7a3438', '#cc6a3c', '#f09c4c', '#ffc676', '#fff0c2'].map(hx6), MAw = ['#723444', '#94504a', '#b46a50', '#d4885a'].map(hx6);
  // maria [x, y, rx, ry, weight] in moon radii, x right, y down, as seen from the north: the rabbit (Tranquillitatis head, Fecunditatis and
  // Nectaris ears, Serenitatis and Imbrium body) faces the mortar (Nubium and Humorum)
  const MARIA = [[-.3, -.36, .3, .26, 1.5], [.13, -.36, .18, .17, 1.6], [.27, -.06, .22, .2, 1.4], [.66, -.28, .12, .15, 1.7], [.54, .18, .1, .2, 1.15], [.33, .37, .1, .1, 1.1],
    [-.6, -.02, .26, .45, .95], [-.2, .42, .17, .13, .85], [-.52, .38, .09, .09, .9], [-.08, -.68, .4, .07, .55], [-.02, -.18, .1, .08, .6], [-.3, .0, .14, .12, .55]];
  const BRIGHT = [[-.12, .72], [-.24, -.07], [-.62, -.2], [-.44, -.03]];   // Tycho, Copernicus, Aristarchus, Kepler
  const PITS = [[.1, .6], [.46, .56], [-.36, .64], [.22, .8], [.62, .44], [-.04, .52], [.0, .86], [-.55, .62]];
  const PHI = .64, SL = Math.sin(PHI), CL = Math.cos(PHI);
  // maria as one field (summed, so neighbours join into the familiar chain), its edges broken by two octaves of noise
  function moonMaria(nx, ny){ let m = 0; for(const [x, y, rx, ry, w] of MARIA){ const dx = (nx - x) / rx, dy = (ny - y) / ry; m += w * Math.exp(-1.6 * (dx * dx + dy * dy)); }
    return m + .45 * (vnoise(nx * 4 + 9, ny * 4 + 9, 2) - .5) + .22 * (vnoise(nx * 10 + 3, ny * 10 + 3, 4) - .5); }
  function moonSprite(R, wq){ const key = R + ':' + wq; C.moon = C.moon || {}; if(C.moon[key]) return C.moon[key];
    const wm = wq / 8, HL = HLn.map((c, i) => mixv(c, HLw[i], wm).map(Math.round)), MA = MAn.map((c, i) => mixv(c, MAw[i], wm).map(Math.round)), Sz = 2 * R + 3, c0 = Sz / 2, rr2 = (R + .25) * (R + .25);
    const pix = (bx, by) => [Math.round(c0 - .5 + bx * R), Math.round(c0 - .5 + by * R)];
    const bright = new Set(), pits = new Map();
    for(const [bx, by] of BRIGHT){ const [px, py] = pix(bx, by); bright.add(px + ',' + py); }
    if(R >= 16){ const [tx, ty] = pix(-.12, .72); for(let a = 0; a < 7; a++){ const an = a * .9 + .3; for(let r = 2; r <= Math.round(R * .22); r += 2) bright.add(Math.round(tx + Math.cos(an) * r) + ',' + Math.round(ty + Math.sin(an) * r) + 'r'); } }
    if(R >= 12) for(const [bx, by] of PITS){ const [px, py] = pix(bx, by); pits.set(px + ',' + py, 0); pits.set((px + 1) + ',' + py, 1); }
    const c = paint(Sz, Sz, (x, y) => { const dx = x + .5 - c0, dy = y + .5 - c0, d2 = dx * dx + dy * dy; if(d2 > rr2) return null;
      const nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), b = -nx * SL - ny * .16 + nz * CL, th = bay(x, y);
      if(b <= 0) return null;
      if(b < .07 && th > b / .07 + .25) return null;   // a ragged terminator, dithered into the dark side
      let li = cl(Math.floor(b / .7 * 3 + (th - .5) * .7), 0, 3);
      if(d2 > (R - 1.4) * (R - 1.4) && b > .3) li = 4;   // the lit limb
      const k = x + ',' + y; const mf = moonMaria(nx, ny) + (th - .5) * .12; let mi = mf > 1.25 ? 3 : mf > .85 ? 2 : mf > .5 ? 1 : 0;
      if(pits.has(k) && li > 1){ mi = 0; li = pits.get(k) ? Math.min(4, li + 1) : li - 2; }
      if(bright.has(k)){ mi = 0; li = 4; } else if(bright.has(k + 'r') && li > 0){ if(mi) mi--; else li = Math.min(4, li + 1); }
      return mi === 0 ? HL[li] : MA[cl(li - mi + 1, 0, 3)]; });
    C.moon[key] = c; return c; }
  // the dark part, lit only by the earth: a dim disc so stars do not shine through it
  function earthSprite(R){ C.earth = C.earth || {}; if(C.earth[R]) return C.earth[R]; const Sz = 2 * R + 3, c0 = Sz / 2, rr2 = (R + .25) * (R + .25), rim = (R - .9) * (R - .9);
    return C.earth[R] = paint(Sz, Sz, (x, y) => { const dx = x + .5 - c0, dy = y + .5 - c0, d2 = dx * dx + dy * dy; return d2 > rr2 ? null : d2 > rim ? [70, 72, 118] : [34, 36, 70]; }); }
  // a stepped halo: four hard rings dithered at their seams (drawn additive)
  function haloSprite(R, wq){ const key = R + ':' + wq; C.halo = C.halo || {}; if(C.halo[key]) return C.halo[key];
    const col = mixv([240, 230, 205], [255, 170, 96], wq / 8).map(Math.round), HR = Math.ceil(R * 2.55), Sz = 2 * HR + 1, ED = [1.12, 1.36, 1.78, 2.5], AL = [.42, .2, .1, .045];
    return C.halo[key] = paint(Sz, Sz, (x, y) => { const r = Math.hypot(x - HR, y - HR) / R; if(r < .9) return null; const rq = r + (bay(x, y) - .5) * .14;
      for(let i = 0; i < 4; i++) if(rq < ED[i]) return col.concat(AL[i]); return null; }); }
  // kasa: the faint 22-degree ice halo, reddish inside and bluish outside; the old sign that rain is coming
  function kasaSprite(R){ C.kasa = C.kasa || {}; if(C.kasa[R]) return C.kasa[R]; const KR = Math.round(R * 3.3), Sz = 2 * KR + 5, c0 = Sz / 2;
    return C.kasa[R] = paint(Sz, Sz, (x, y) => { const r = Math.hypot(x + .5 - c0, y + .5 - c0) - KR; return r > -1.5 && r <= -.5 ? [255, 168, 150, .55] : r > -.5 && r <= .5 ? [236, 232, 220, .8] : r > .5 && r <= 1.5 ? [150, 180, 255, .45] : null; }); }

  // (the boost's poster rings round the moon were removed, Kellan 2026-11-19: too distracting. Speed shows in the road's lights: mech/speedfx.js)

  // ---------------------------------------------------------------- cloud streaks: flat-bottomed, thin, Hiroshige-style; body + top rim (moon) + bottom rim (city or dawn)
  function cloudShapes(){ if(C.cloud) return; C.cloud = [];
    for(let s = 0; s < 7; s++){ const Lw = s === 0 ? 120 : Math.round(60 + hash(s * 3.3 + 1) * 110), T = 5 + Math.floor(hash(s * 5.1 + 2) * 4), H = T + 4, base = T + 1, g = new Uint8Array(Lw * H);
      // a puffy body of a few rounded lumps on a flat base, trailing a thin ribbon both ways (the long mist band of the prints)
      const bx = Math.round(Lw * (.15 + hash(s * 7.7) * .3)), bw = Math.round(Lw * (.35 + hash(s * 9.1) * .2)), NB2 = 3 + Math.floor(hash(s * 4.3) * 3), lumps = [];
      for(let j = 0; j < NB2; j++) lumps.push([bx + bw * (j + .5) / NB2 + (hash(s * 13 + j) - .5) * bw / NB2, (bw / NB2) * (.7 + hash(s * 17 + j) * .6), T * (.5 + hash(s * 19 + j) * .5)]);
      for(let x = 0; x < Lw; x++){ let th = 0; for(const [lx, lr, lh] of lumps){ const q = (x - lx) / lr; if(q * q < 1) th = Math.max(th, lh * Math.sqrt(1 - q * q)); }
        const ex = Math.max(bx - x, x - bx - bw) / (Lw * .3), rib = ex < 1 && vnoise(x / 6, s, 5) < 1.25 - ex ? (ex < .3 ? 2 : 1) : 0; th = Math.max(Math.round(th), rib);   // the ribbon frays out
        for(let k = 0; k < th; k++) g[(base - k) * Lw + x] = 1; }
      const at = (x, y) => x >= 0 && y >= 0 && x < Lw && y < H && g[y * Lw + x];
      const mk = fn => paint(Lw, H, (x, y) => at(x, y) ? fn(x, y) : null);
      const edge = (x, y, dy) => !at(x, y + dy) ? 1 : !at(x, y + 2 * dy) ? 2 : 0;   // 1 = the edge row, 2 = the row inside it
      C.cloud.push({ w:Lw, h:H, body:mk(() => [58, 50, 96, .72]), dusk:mk(() => [86, 58, 104, .78]),
        top:mk((x, y) => { const e = edge(x, y, -1); return e === 1 ? [236, 228, 212, 1] : e === 2 && (x + y) % 2 ? [200, 194, 200, .55] : null; }),
        bot:mk((x, y) => { const e = edge(x, y, 1); return e === 1 ? [255, 255, 255, 1] : e === 2 && (x + y) % 2 ? [255, 255, 255, .6] : !e && !at(x, y + 3) && (x & 1) && (y & 1) ? [255, 255, 255, .35] : null; }) }); }
    // the underside rims are tinted once into two colours: city sodium and dawn gold
    for(const c of C.cloud){ for(const [nm, col] of [['city', '#ff9448'], ['dawn', '#ffc684']]){ const t = newC(c.w, c.h), k = t.getContext('2d'); k.drawImage(c.bot, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = col; k.fillRect(0, 0, c.w, c.h); c[nm] = t; } } }
  // [shape, y as a fraction of the horizon height, parallax, start, drift px/ms]
  const CLOUDS = [[2, .2, 18, .1, .004], [5, .62, 36, .55, .006], [1, .4, 26, .8, .005], [4, .78, 48, .3, .008], [6, .3, 22, .45, .0045], [3, .7, 40, .95, .007], [0, .52, 30, .7, .0055]];

  // ---------------------------------------------------------------- dawn: a stepped glow bulging up from where the sun will rise, then the sun itself
  function dawnSprite(w, hzc){ const GW = Math.round(w * 1.4), GH = Math.round(hzc * .6), ED = [.2, .4, .66, 1], CO = [[255, 230, 156, .6], [255, 184, 112, .42], [240, 132, 118, .25], [196, 104, 150, .12]];
    return paint(GW, GH, (x, y) => { const dx = (x - GW / 2) / (GW / 2), dy = (GH - y) / GH, r = Math.hypot(dx, dy) + (bay(x, y) - .5) * .05; for(let i = 0; i < 4; i++) if(r < ED[i]) return CO[i]; return null; }); }
  function sunSprite(R){ const SR = Math.max(4, Math.round(R * .75)), Sz = 2 * SR + 3, c0 = Sz / 2;
    return paint(Sz, Sz, (x, y) => { const r = Math.hypot(x + .5 - c0, y + .5 - c0); return r > SR + .3 ? null : r > SR - .8 ? [255, 150, 80] : r > SR * .6 ? [255, 214, 130] : [255, 246, 214]; }); }

  // ---------------------------------------------------------------- caches that depend on the screen size
  function ensure(w, hzc, R){
    if(C.w !== w || C.hzc !== hzc){ C.w = w; C.hzc = hzc; buildStars(w, hzc); C.dawn = dawnSprite(w, hzc); C.skyKey = ''; }
    if(C.R !== R){ C.R = R; C.sun = sunSprite(R); }
    twinkleSprites(); cloudShapes(); }
  const snap = v => Math.round(v / PX) * PX;
  function put(c, xc, yc, a){ if(a <= .003) return; cx.globalAlpha = Math.min(1, a); cx.drawImage(c, snap(xc), snap(yc), c.width * PX, c.height * PX); }
  const wrap = (v, m) => ((v % m) + m) % m;

  ENV.sky = {
    // the sky's current colour ramp, for mirrors (Paddies' water): col()(v) gives [r, g, b] at v = 0 zenith .. 1 horizon, dawn included;
    // key() changes whenever the ramp does. Read-only; both are null until the first frame is drawn.
    col:() => C.col || null,
    key:() => C.col ? C.skyKey : null,
    warm(){ const hzc = Math.ceil((H / 2 + 2) / PX) + 2, R = Math.max(6, Math.round(Math.min(W, H) * .1 / PX)); ensure(cv.width, hzc, R);
      for(let q = 0; q <= 8; q++){ moonSprite(R, q); haloSprite(R, q); } earthSprite(R); kasaSprite(R); },
    draw(o){
      // camera pitch (PITCH, whole canvas pixels) moves the horizon; the sky buffers are built for the level horizon and drawn shifted, so a jump's
      // pitch never rebuilds them (a rebuild is a full-screen ImageData: 35-47 ms a frame while CAM.pitch animated)
      const { t, hz, moonX, moonY, moonR, now, bgA, bgB, bgMix } = o, pit = typeof PITCH === 'number' ? PITCH : 0, hz0 = hz + pit, w = cv.width, hzc = Math.ceil(hz0 / PX) + 2, R = Math.max(6, Math.round(moonR / PX));
      ensure(w, hzc, R); cx.imageSmoothingEnabled = false;
      const dt = S.last ? cl(now - S.last, 0, 100) : 16; S.last = now;
      const ra = ROAD[LANDS[bgA].key] || DEF, rb = ROAD[LANDS[bgB].key] || DEF, P = k => ra[k] + (rb[k] - ra[k]) * bgMix;
      // 1. sky bands, rebuilt only when the quantised night, road or crossfade changes
      const tq = Math.round(t * 100) / 100, mq = Math.round(bgMix * 12) / 12, key = w + ',' + hzc + ',' + tq + ',' + bgA + ',' + bgB + ',' + mq;
      if(key !== C.skyKey){ C.skyKey = key; buildSky(w, hzc + 2, hzc, tq, bgA, bgB, mq); }
      cx.globalAlpha = 1; cx.drawImage(C.sky, 0, -pit, C.sky.width * PX, C.sky.height * PX);
      if(pit < 0) cx.drawImage(C.sky, 0, 0, C.sky.width, 1, 0, 0, C.sky.width * PX, -pit);   // looking up: the top band fills the rows above the buffer
      const dawn = cl((t - .8) / .17, 0, 1), night = 1 - cl((t - .7) / .24, 0, 1);
      // 2. milky band and stars, scrolling with the heading
      const off = wrap(Math.round(skyPar('sky') / PX), w), sa = night * P('stars');
      if(sa > .01){ const ma = night * P('milky');
        for(const xo of [off - w, off]){ if(ma > .01) put(C.milky, xo * PX, -pit, ma); put(C.stars, xo * PX, -pit, sa); }
        for(let i = 0; i < C.tw.length; i++){ const [tx, ty, tc] = C.tw[i]; if(i >= Math.round(3 + 6 * P('stars'))) break;
          const s = reduce ? .5 : Math.sin(now / (380 + i * 53) + i * 2.1) * .5 + Math.sin(now / 1270 + i) * .5, lv = s > .55 ? 2 : s > -.2 ? 1 : 0;
          put(C.twS[tc][lv], (wrap(tx + off, w) - 3) * PX, (ty - 3) * PX - pit, sa); } }
      // 3. dawn glow and the first sliver of sun, opposite the setting moon
      const sunX = wrap(moonX + W * .5 + W * .1, W * 1.2) - W * .1;
      if(dawn > 0){ put(C.dawn, sunX - C.dawn.width * PX / 2, hz - C.dawn.height * PX + PX * 2, dawn);
        const rise = cl((t - .955) / .045, 0, 1); if(rise > 0) put(C.sun, sunX - C.sun.width * PX / 2, hz + PX - rise * C.sun.height * PX * .45, 1); }
      // 4. halo, kasa ring, then the moon
      const warmT = cl((t - .6) * 2.5, 0, 1), wq = Math.round(warmT * 8), ms = C.moon && C.moon[R + ':' + wq] || moonSprite(R, wq), mx = moonX - ms.width * PX / 2, my = moonY - ms.height * PX / 2;
      if(reduce){ const cw = clamp((flow - 2) / 6, 0, 1) * .7 + (boostT > 0 ? .3 : 0); S.calm += (cw - S.calm) * (1 - Math.exp(-dt / 1500)); }
      cx.globalCompositeOperation = 'lighter';
      const hs = haloSprite(R, wq); put(hs, moonX - hs.width * PX / 2, moonY - hs.height * PX / 2, .85 + S.calm * .9);
      const ka = P('kasa') * (.25 + .75 * night) * .5; if(ka > .02){ const ks = kasaSprite(R); put(ks, moonX - ks.width * PX / 2, moonY - ks.height * PX / 2, ka); }
      cx.globalCompositeOperation = 'source-over';
      put(earthSprite(R), mx, my, .85 * (1 - dawn));
      put(ms, mx, my, 1);
      // a skein of geese crosses the moon now and then (Hiroshige); dark pixels, so they only read against the moon, its halo or the dawn
      const gp = (now % 47000) / 14000; if(gp < 1 && dawn < .9){ const gx = moonX + (gp - .5) * W * .7, gy = moonY - moonR * .35 - (gp - .5) * moonR * .9, up = !reduce && Math.floor(now / 260) % 2;
        cx.globalAlpha = 1; cx.fillStyle = mixc('#1a1426', '#3a2434', dawn);
        for(const [bx, by] of [[0, 0], [-4, -2], [-8, -4], [-5, 3], [-10, 5]]){ const x0 = snap(gx) + bx * PX, y0 = snap(gy) + by * PX;
          cx.fillRect(x0 - PX, y0 + (up ? 0 : PX), PX, PX); cx.fillRect(x0, y0 + PX, PX, PX); cx.fillRect(x0 + PX, y0 + (up ? 0 : PX), PX, PX); } }
      // 5. cloud streaks in front: drifting ones, and one that always lies across the lower moon
      const nC = P('cloud') * CLOUDS.length, city = P('city') * (1 - dawn) * .55, span = W + 140 * PX;
      const cloud = (c, x, y, a) => { const dxm = Math.abs(x + c.w * PX / 2 - moonX) / (W * .35), dym = Math.abs(y - moonY) / (H * .3), lit = cl(1.1 - Math.hypot(dxm, dym), .12, 1) * (1 - dawn * .6);
        put(c.body, x, y, a * (1 - dawn)); if(dawn > 0) put(c.dusk, x, y, a * dawn); put(c.top, x, y, a * lit); if(city > .01) put(c.city, x, y, a * city); if(dawn > 0) put(c.dawn, x, y, a * dawn * .9); };
      for(let i = 0; i < CLOUDS.length; i++){ const a = cl(nC - i, 0, 1); if(a <= 0) break; const [si, yf, par, x0, dr] = CLOUDS[i], c = C.cloud[si];
        cloud(c, wrap(x0 * span - skyOff * par - now * dr, span) - 70 * PX, hz0 * yf - pit, a); }
      const mc = C.cloud[0]; cloud(mc, moonX - moonR * 1.9 + Math.sin(now / 9000) * moonR * .25, moonY + moonR * .38, 1);
      cx.globalAlpha = 1;
    }
  };
})();
