/* Sundown environment: Shonan Coast (湘南, Route 134). See env/README.md for the hooks.
   The sea road along Sagami Bay: the dark Pacific on the left behind a low concrete sea wall, a beach with shuttered umi-no-ie shacks,
   surf breaking in white lines, tetrapods where the beach runs out, isaribi fishing boats strung with lamps, Enoshima and its lit Sea Candle
   on the horizon with Fuji faint behind. On the land side a white guardrail, a wind-bent black-pine windbreak, palm boulevards, a surf shop.

   References studied for rules (looked at, then drawn from scratch):
   - Hiroshige, "Shichiri-ga-hama in Sagami" (Fuji Sanjūrokkei, 1858): surf as stacked, broken white lines running parallel to the shore,
     closer together far away; Enoshima a flat-topped hump with a pine crest; Fuji a pale cone well above a low dark range.
     -> surf as broken lines along the road, sparse far, thick and bright where they break; the island and Fuji as flat silhouettes.
   - Hiroshige, "Rough sea at Shichiri-ga-hama" (1852): sea in stepped bands, darkest nearest; foam as clawed white clusters.
     -> the sea darkens toward the camera in hard steps; spray at the tetrapods as clustered white pixels.
   - Photos: Shonan from the Enoshima Sea Candle at dusk; Route 134 at Kugenuma; Inamuragasaki headland. Route 134 runs on a low sea wall
     with a lamp line along the beach; dense low town lights hug the shore; tetrapods and a concrete wall where the cliffs meet the sea;
     black pines lean inland, cut by the sea wind. -> the sea wall + lamp rhythm on the sea side, pines bent away from the sea.
   - OutRun (Sega 1986) coast stage: the sea is a flat band beside the road with a white surf edge; palms in a strict rhythm.
     -> the palm boulevard stretch.
   - Streets of Rage 2 (1992) pier: night is blue, not black; small lights crisp with a stepped halo.
   Rules: one light (the moon, from the sea side, upper left): lit edges face up/left, outlines dark-hued on the right/bottom; mercury-white
   lamps are the cool key, warm light only from boats, shacks and the island; reflections hang from world-anchored lights. */
"use strict";
(() => {
  // ---------------------------------------------------------------- helpers
  function pix(key, w, h, fn){ const kk = 'co_' + key; if(SPR[kk]) return SPR[kk]; const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
    const P = { k, w, h,
      px(x, y, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col){ k.fillStyle = col; k.fillRect(x, y, ww, hh); },
      line(x0, y0, x1, y1, col){ k.fillStyle = col; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for(;;){ k.fillRect(x0, y0, 1, 1); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } } };
    fn(P); return SPR[kk] = c; }
  const H0 = n => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };
  const snap = v => Math.round(v / PX) * PX;
  const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // palettes: [outline, dark, mid, light, rim(moon)]
  const PAL = {
    1: ['#020708', '#08171a', '#0f2a2a', '#1d4440', '#5c8c86'],   // black pine needles
    2: ['#050406', '#151014', '#241c20', '#3a2e30', '#6a5a5c'],   // bark
    3: ['#03080a', '#0b1e1e', '#163430', '#28524a', '#6aa094'],   // palm fronds
    4: ['#060506', '#1c1614', '#2e241e', '#4a3a30', '#8a7460'],   // palm trunk
    5: ['#04060a', '#0d1119', '#151a25', '#242c3c', '#55627e']    // tetrapod concrete
  };
  // bake a material grid into a shaded sprite: light from the upper left (moon over the sea): top/left edges take the rim,
  // the next pixel in the light tone, right/bottom edges a dark outline; values > 100 are a texture fleck
  function bake(key, w, h, mat){ key = 'co_' + key; if(SPR[key]) return SPR[key];
    const g = new Array(w * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) g[y * w + x] = mat(x, y);
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x];
    return procSprite(key, w, h, (x, y) => { let m = at(x, y); if(!m) return null; if(typeof m === 'string') return m;
      const tex = m > 100; if(tex) m -= 100; const p = PAL[m];
      if(!at(x, y - 1) || (!at(x - 1, y) && !at(x - 1, y - 1))) return p[4];
      if(!at(x + 1, y) || !at(x, y + 1)) return p[0];
      if(!at(x, y - 2) || !at(x - 2, y)) return p[3];
      return tex ? p[1] : (!at(x + 2, y) || !at(x, y + 2)) ? p[1] : p[2]; }); }

  // fog colour cache and opaque fogged sprite copies (haze tints toward the fog colour instead of making sprites see-through)
  let lastLow = '#101c34', fogKey = '', fogC = {};
  const fc = (col, fog) => { if(lastLow !== fogKey){ fogKey = lastLow; fogC = {}; } const q = Math.round(fog * 16), key = col + q; return fogC[key] || (fogC[key] = mixc(col, lastLow, q / 16 * .88)); };
  // Fogged copies are pre-built in warm() (every sprite name x 5 fog steps) and never allocated mid-ride. When the sky's fog colour moves to a
  // new quantised value (it drifts slowly through the night), each copy is re-tinted IN PLACE the next time it is used, at most 24 per frame;
  // a copy waiting its turn keeps its previous tint for a frame or two (invisible: the colour step is 1/16 per channel).
  const FOGS = new Map(); let fogLowS = '', fogLK = -1, fogGen = 0, fogRGB = [16, 28, 52], fogFrame = -1, fogBudget = 24;
  function fogTint(e, spr, q){ const k = e.c.getContext('2d'), [R, G, B] = fogRGB; k.globalCompositeOperation = 'source-over'; k.clearRect(0, 0, e.c.width, e.c.height); k.drawImage(spr, 0, 0);
    k.globalCompositeOperation = 'source-atop'; k.fillStyle = `rgba(${R},${G},${B},${q / 5 * .86})`; k.fillRect(0, 0, e.c.width, e.c.height); k.globalCompositeOperation = 'source-over'; e.gen = fogGen; }
  function fogSync(){ if(lastLow === fogLowS) return; fogLowS = lastLow; const [R, G, B] = hx(lastLow), lk = (R >> 4) * 256 + (G >> 4) * 16 + (B >> 4); if(lk !== fogLK){ fogLK = lk; fogGen++; fogRGB = [R, G, B]; } }
  function fogEntry(spr, name, q, build){ let arr = FOGS.get(name); if(!arr){ arr = []; FOGS.set(name, arr); } let e = arr[q];
    if(!e && build){ e = { c:canvas(spr.width, spr.height), gen:-1 }; arr[q] = e; fogTint(e, spr, q); } return e; }
  function fogged(spr, name, fog){ const q = Math.min(5, Math.round(fog * 6)); if(!q) return spr; fogSync();
    const e = fogEntry(spr, name, q, false); if(!e) return spr;   // not pre-built (should not happen): draw unfogged rather than allocate
    if(e.gen !== fogGen && fogBudget > 0){ fogBudget--; fogTint(e, spr, q); } return e.c; }
  // warm(): build every fogged copy the road can ask for
  // a generator, so the staged warm-up (sundown.html WARM.q) can build it a few sprites per frame; fogWarm() runs it straight through
  function fogWarm(){ for(const _ of fogWarmSteps()); }
  function* fogWarmSteps(){ fogSync(); const all = [];
    for(let v = 0; v < 3; v++) for(let p2 = 0; p2 < 3; p2++) for(let f = 0; f < 3; f++){ all.push([palmSpr(v, p2, f, 1), 'palm' + v + p2 + f], [pineSpr(v, p2, f, 1), 'pine' + v + p2 + f]); }
    all.push([lampSprite(), 'lamp'], [bikes(), 'bikes'], [shield(), 'shield'], [vend(), 'vend'], [surfShop(), 'surf'], [shack(0), 'shack0'], [shack(1), 'shack1']);
    for(let v = 0; v < 4; v++){ all.push([tetra(v), 'tetra' + v]); for(let l = 1; l <= TF_LV; l++) all.push([tetraFoam(v, l), 'tfoam' + v + l]); }
    for(const [spr, name] of all){ for(let q = 1; q <= 5; q++) fogEntry(spr, name, q, true); yield; }
    // the wave-hit frames: measured over two coast rides, the big (R 2) art is only ever drawn unfogged (it is near) and the small art at fog
    // steps 0-4 (hits are skipped past fog .75), so only those copies are built: 30 frames cost less than the old 10 with every copy
    for(let f = 0; f < SPF; f++) for(let wd = 0; wd < 2; wd++){ const spr = plume(f, wd, 1); for(let q = 1; q <= 4; q++) fogEntry(spr, 'plume' + f + wd + 1, q, true); yield; } }

  // ---------------------------------------------------------------- sprites
  // ---------------------------------------------------------------- vegetation
  // Trees are generated into a material buffer at two detail levels (R = 1 far, R = 2 near, so a tree beside the camera keeps small pixels),
  // three wind poses (calm, breeze, typhoon from MECH.sp_kaiju.wind()) and three slow sway frames per pose. Every material has a 5-step ramp
  // [outline, dark, mid, light, moon rim]; light comes from the sea side (left); an outline pass puts the dark-hue outline on the shadow side.
  const VEGP = {
    frond:['#020a09', '#081c18', '#12352c', '#21543f', '#5a9478'],
    dead: ['#120a05', '#36240f', '#58401f', '#806235', '#b09060'],
    trunk:['#070505', '#1a1310', '#2c211b', '#43342a', '#76624f'],
    bark: ['#060405', '#1a1215', '#2e2126', '#4a3638', '#7e686a'],
    needle:['#020807', '#071816', '#0f2c27', '#1c4a40', '#5e9488'],
    nut:  ['#140a02', '#4a2e0c', '#7a5218', '#b08030', '#d8b060'] };
  const VM = ['frond', 'dead', 'trunk', 'bark', 'needle', 'nut']; let VRGB = null;   // filled on first use (hx() exists only once the game script has loaded)
  const MF = 0, MD = 1, MT = 2, MB = 3, MN = 4, MC = 5;
  function vegCanvas(w, h, buf){ const c = canvas(w, h), k = c.getContext('2d'), img = k.createImageData(w, h), d = img.data, out = buf.slice();
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const o = y * w + x; if(buf[o]) continue; const src = (x > 0 ? buf[o - 1] : 0) || (y > 0 ? buf[o - w] : 0); if(src) out[o] = (((src - 1) / 5) | 0) * 5 + 1; }
    if(!VRGB) VRGB = VM.map(m => VEGP[m].map(c => hx(c)));
    for(let o = 0; o < w * h; o++){ const v = out[o]; if(!v) continue; const [r, g, b] = VRGB[((v - 1) / 5) | 0][(v - 1) % 5]; d[o * 4] = r; d[o * 4 + 1] = g; d[o * 4 + 2] = b; d[o * 4 + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  const WPOSE = [0, .5, 1];
  // ---- palms: two Canary date palms (thick knobbed trunk, dense fountain crown, dead skirt, date clusters) and one tall slender ringed palm
  const PALMV = [ { tw:4.4, th:60, curve:5, knob:1, n:8, L:27, dead:5, nuts:1 }, { tw:4, th:54, curve:-4, knob:1, n:8, L:25, dead:6, nuts:1 }, { tw:2.4, th:72, curve:7, knob:0, n:7, L:22, dead:3, nuts:0 } ];
  const PW = 110, PH = 100, PBX = 44;
  function palmSpr(v, pose, fr, R){ const key = 'co_palm' + v + pose + fr + R; if(SPR[key]) return SPR[key];
    const P = PALMV[v], w = PW * R, h = PH * R, buf = new Uint8Array(w * h), wv = WPOSE[pose], put = (x, y, m, t) => { x = Math.round(x); y = Math.round(y); if(x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = m * 5 + t + 1; };
    const sway = (j, amp) => Math.sin(fr * 2.1 + j * 1.7) * amp;
    const bx = PBX * R, by = h - 1, bend = (P.curve + wv * 12 + sway(9, 1 + wv * 2)) * R, rows = Math.round(P.th * R), tx = t => bx + bend * t * t;
    // trunk: segmented rings, moonlit left edge, dark right side; the Canary palms carry a knob of leaf scars under the crown
    for(let r = 0; r <= rows; r++){ const t = r / rows, y = by - r, xc = tx(t), knob = P.knob && t > .86 ? 1.3 * Math.sin((t - .86) / .14 * Math.PI) : 0, hw = (P.tw * (1 - t * .18) + knob) * R, ring = r % (3 * R);
      for(let x = Math.floor(xc - hw); x <= Math.ceil(xc + hw); x++){ const d = x + .5 - xc; if(Math.abs(d) > hw) continue;
        let tn = d < -hw + R ? 4 : d < -hw + 2.2 * R ? 3 : d > hw - 1.6 * R ? 1 : 2; if(ring === 0) tn = Math.max(1, tn - 1); else if(ring === 1 && tn > 1 && d < hw * .3) tn = Math.min(4, tn + (d < 0 ? 1 : 0));
        if(knob && ((x + r * 2) % (4 * R) === 0)) tn = 1; put(x, y, MT, tn); } }
    const cx = tx(1), cy = by - rows;
    // one frond: a rachis arching out and sagging under its own weight, leaflets on both sides (long/short alternating = serrated edge),
    // the side facing up lit, the underside dark; back fronds a step darker
    function frond(th, L, mat, g, dark, j){ L *= R; const dx = Math.cos(th), dy = Math.sin(th), fl = sway(j, .05 + wv * .1) + wv * .5, steps = Math.ceil(L * 1.4), pts = [];
      for(let i = 0; i <= steps; i++){ const s2 = i / steps; pts.push([cx + dx * L * s2 + fl * L * s2 * s2, cy + dy * L * s2 + g * L * s2 * s2]); }
      for(let i = 2; i < pts.length - 1; i++){ if(i % (2 * R)) continue; const s2 = i / steps; if(s2 < .12) continue; let tX = pts[i + 1][0] - pts[i - 1][0], tY = pts[i + 1][1] - pts[i - 1][1]; const tl = Math.hypot(tX, tY) || 1; tX /= tl; tY /= tl;
        for(const sd of [-1, 1]){ const nX = -tY * sd, nY = tX * sd; let lx = nX * .8 + tX * .5, ly = nY * .8 + tY * .5 + .5; const ll = Math.hypot(lx, ly); lx /= ll; ly /= ll;
          const len = ((mat === MD ? 1.2 : 1.6) + 3.2 * (1 - s2) * (1 - s2 * .4)) * R * ((i / (2 * R)) % 2 ? .55 : 1), up = nY < 0;
          for(let q = 1; q <= len; q++){ let tn = up ? (q > len - 1.5 && lx < 0 ? 4 : 3) : 1; if(dark) tn = Math.max(1, tn - 1); put(pts[i][0] + lx * q, pts[i][1] + ly * q, mat, tn); } } }
      for(let i = 0; i < pts.length; i++){ const tn = dark ? 1 : 2; put(pts[i][0], pts[i][1], mat, tn); if(!dark && i % 2 === 0 && R > 1) put(pts[i][0], pts[i][1] - 1, mat, 3); } }
    // the dead skirt hanging round the trunk top
    for(let j = 0; j < P.dead; j++){ const th = Math.PI / 2 + (j - (P.dead - 1) / 2) * .26 + wv * .3; frond(th, 14 + hash(j * 3.7 + v) * 6, MD, .02, j % 2 === 1, j + 20); }
    // date clusters
    if(P.nuts) for(let j = 0; j < 6; j++){ const nx = cx + (j - 2.5) * 1.8 * R + wv * R, ny = cy + (2.5 + (j % 2) * 1.8) * R;
      for(let yy = -R; yy <= R; yy++) for(let xx = -R; xx <= R; xx++){ if(xx * xx + yy * yy > R * R + .5) continue; put(nx + xx, ny + yy, MC, xx < 0 && yy < 0 ? 4 : xx > 0 || yy > 0 ? 1 : 2); } }
    // the crown: back fronds (rising) first and darker, then the side fronds, then the front fronds drooping toward the viewer
    const F = []; for(let j = 0; j < P.n; j++){ let th = -Math.PI * (.05 + .9 * j / (P.n - 1)) + (hash(j * 5.1 + v) - .5) * .18; th += (0 - th) * wv * .42 * (th < -Math.PI / 2 ? 1.2 : .8);
      F.push({ th, L:P.L * (.82 + hash(j * 2.3 + v * 7) * .3), g:.3 + .42 * Math.abs(Math.cos(th)), back:Math.abs(Math.cos(th)) < .4, j }); }
    for(let j = 0; j < 2; j++){ let th = Math.PI * (.22 + .56 * j) + (hash(j + 40 + v) - .5) * .2; th += (0 - th) * wv * .3; F.push({ th, L:P.L * .7, g:.32, back:false, front:true, j:j + 30 }); }
    F.sort((a, b) => (b.back - a.back) || ((a.front ? 1 : 0) - (b.front ? 1 : 0)) || (Math.abs(Math.cos(a.th)) - Math.abs(Math.cos(b.th))));
    for(const f of F) frond(f.th, f.L, MF, f.g, f.back, f.j);
    return SPR[key] = vegCanvas(w, h, buf); }
  // ---- black pines: a gnarled, wind-leaning trunk with plated bark, limbs out to flat cloud pads with tufted, moonlit tops and dark undersides
  const PINEV = [
    { pts:[[14, 55], [17, 42], [13, 31], [21, 18], [31, 9]], pads:[[31, 8, 9, 3.2], [22, 16, 8, 3], [39, 19, 7, 2.6], [12, 26, 7, 2.6], [30, 28, 8, 2.8], [44, 10, 5, 2.2]] },
    { pts:[[16, 55], [14, 44], [19, 32], [17, 20], [27, 7]], pads:[[28, 7, 9, 3], [17, 14, 8, 3], [36, 16, 7, 2.6], [23, 24, 9, 3], [9, 31, 6, 2.4]] },
    { pts:[[12, 55], [16, 45], [15, 35], [22, 24], [24, 12]], pads:[[25, 11, 10, 3.4], [15, 19, 8, 3], [35, 21, 9, 3], [21, 30, 9, 3], [40, 31, 6, 2.4], [8, 28, 5, 2]] }];
  const NW = 56, NH = 58;
  function pineSpr(v, pose, fr, R){ const key = 'co_pine' + v + pose + fr + R; if(SPR[key]) return SPR[key];
    const P = PINEV[v], w = NW * R, h = NH * R, buf = new Uint8Array(w * h), wv = WPOSE[pose], put = (x, y, m, t) => { x = Math.round(x); y = Math.round(y); if(x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = m * 5 + t + 1; };
    const shift = y => (wv * 6 + Math.sin(fr * 2.1 + v) * (.3 + wv * .9)) * Math.pow(Math.max(0, (NH - y) / NH), 1.5);
    const pts = P.pts.map(([x, y]) => [(x + shift(y)) * R, y * R]);
    // trunk: Catmull-Rom through the control points, tapering, bark in offset plates
    const tr = []; for(let i = 0; i < pts.length - 1; i++){ const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for(let t = 0; t < 1; t += .02 / R){ const t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); tr.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
    for(let i = 0; i < tr.length; i++){ const u = i / tr.length, hw = (3.2 - u * 2 + (u < .08 ? (.08 - u) * 14 : 0)) * R, [xc, yc] = tr[i];
      for(let x = Math.floor(xc - hw); x <= Math.ceil(xc + hw); x++){ const d = x + .5 - xc; if(Math.abs(d) > hw) continue; const plate = (Math.floor(i / (5 * R)) + Math.floor((d + hw) / (1.6 * R))) % 2;
        put(x, yc, MB, d < -hw + R ? 4 : d < -hw + 2 * R ? 3 : d > hw - 1.4 * R ? 1 : plate ? (Math.floor(i / (5 * R)) % 3 === 0 && d < 0 ? 3 : 2) : 1); } }
    // limbs from the trunk out to each pad, then the pads, top to bottom
    const pads = P.pads.map(([x, y, rx, ry], j) => [(x + shift(y) + (wv ? Math.sin(fr * 2.3 + j) * .6 * wv : 0)) * R, y * R, rx * (1 + wv * .12) * R, ry * (1 - wv * .2) * R, j]);
    for(const [px, py] of pads){ let best = tr[0], bd = 1e9; for(const q of tr){ const dd = Math.abs(q[1] - (py + 3 * R)) + Math.abs(q[0] - px) * .3; if(dd < bd){ bd = dd; best = q; } }
      const n = Math.ceil(Math.hypot(px - best[0], py - best[1])); for(let q = 0; q <= n; q++){ const t = q / n, x = lerp(best[0], px, t), y = lerp(best[1], py + 1.5 * R, t) - Math.sin(t * Math.PI) * 1.5 * R; for(let k2 = 0; k2 < R + (t < .5 ? R * .6 : 0); k2++) put(x, y + k2, MB, k2 === 0 ? 3 : 1); } }
    pads.sort((a, b) => a[1] - b[1]);
    for(const [px, py, rx, ry, j] of pads){ const nb = 3 + (j % 2), lobes = [];
      for(let q = 0; q < nb; q++){ const u = nb === 1 ? 0 : (q / (nb - 1) - .5) * 1.5; lobes.push([px + u * rx * .62, py - ry * (.25 + .35 * hash(j * 7 + q + v)), rx / nb * 1.45, ry * (.75 + .3 * hash(j * 3 + q * 5 + v))]); }
      const flat = py + ry * .45, x0 = Math.floor(px - rx * 1.3), x1 = Math.ceil(px + rx * 1.3), y0 = Math.floor(py - ry * 2.2), y1 = Math.ceil(flat + R);
      const inside = (x, y) => { if(y > flat + (Math.abs(x + .5 - px) < rx * .5 ? R * .6 : 0)) return false; for(const [lx, ly, lr, lh] of lobes){ const dx = (x + .5 - lx) / lr, dy = (y + .5 - ly) / lh; if(dx * dx + dy * dy <= 1) return true; } return false; };
      for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++){ if(!inside(x, y)) continue; const lit = (x + .5 - px) < rx * .35;
        const tn = !inside(x, y - 1) ? (lit ? 4 : 3) : !inside(x, y - R - 1) || (!inside(x - R, y) && lit) ? 3 : !inside(x, y + 1) || !inside(x, y + R + 1) ? 1 : 2;
        put(x, y, MN, tn); if(!inside(x, y - 1) && hash(x * 1.7 + j * 9 + v) > .5) put(x, y - 1, MN, lit ? 4 : 3);   // needle tufts on the crest
        if(!inside(x, y + 1) && hash(x * 2.9 + j * 5) > .65) put(x, y + 1, MN, 1); } }
    return SPR[key] = vegCanvas(w, h, buf); }
  // current storm wind from the typhoon set piece (0 outside it), read once per frame; pose and slow, world-anchored sway frame
  let windT = -1, windV = 0;
  function windNow(now){ if(now !== windT){ windT = now; windV = 0; try{ const m = typeof MECH !== 'undefined' && MECH.sp_kaiju; if(m && m.wind) windV = clamp(+m.wind() || 0, 0, 1); }catch(e){} } return windV; }
  function vegPose(sp, now){ const w = windNow(now), pose = w < .2 ? 0 : w < .6 ? 1 : 2, rate = [1500, 620, 260][pose], f = reduce ? 0 : Math.floor(now / rate + hash(sp.k * 1.37) * 4) % 4; return [pose, [0, 1, 2, 1][f]]; }
  // tetrapods: one hand-drawn unit (an up leg, three feet, a hub), faceted: lit faces toward the moon (left), mid and dark faces away,
  // a dark-hue outline. Clusters stack a dimmer back row behind a front row, offsets varied per cluster.
  const TP = [
    '.......OO.......',
    '......OHLO......',
    '......OHLMO.....',
    '.....OHLLMO.....',
    '.....OHLLMO.....',
    '.....OHLLMDO....',
    '..OOOHLLLMDOOO..',
    '.OHHLLLLMMMMDDO.',
    'OHLLLLLMMMMMDDDO',
    'OHLLLDOOOOMMMDDO',
    'OLLLDO.OHO.OMDDO',
    '.OLDO..OLMO.ODO.',
    '..OO...OLMO..O..',
    '.......OLDO.....',
    '........OO......'];
  const tpUnit = dim => SPR['co_tp' + dim] || (SPR['co_tp' + dim] = makeSprite(TP, dim ? { O:'#03050a', H:'#3c4860', L:'#283246', M:'#1a2232', D:'#10151f' } : { O:'#04060b', H:'#7e8cac', L:'#4e5a74', M:'#2e3648', D:'#1a2030' }, false));
  const tetra = v => { const key = 'co_tetra' + v; if(SPR[key]) return SPR[key]; const c = canvas(56, 26), k = c.getContext('2d');
    let sd = v * 131 + 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for(const [row, ys, dim] of [[0, 16, 1], [1, 26, 0]]){ const n = row ? 3 : 4; for(let j = 0; j < n; j++){ const x = Math.round((row ? 6 : 0) + j * (row ? 15 : 13) + (R() - .5) * 4), y = ys - 15 - Math.round(R() * 2); k.drawImage(tpUnit(dim), x, y); } }
    return SPR[key] = c; };
  // ---- spray: a wave hitting the tetrapods, in six hand-built pixel frames (Hokusai's claw-fingered crests, foam as dots).
  // Four tones only: white crest, pale cyan, blue-grey, a dark blue outline on the shadow side; lit from the moon side (left).
  // f0 a foam dome bursts, f1 fingers rise, f2 claws at full height curl outward, f3 the fingers break into droplet clusters,
  // f4 droplets fall through spreading mist, f5 the mist thins in a sparse dither. Two variants so neighbouring hits differ.
  const SPW = 48, SPH = 44, SPT = [null, '#f4fbff', '#bfe2ee', '#6c8cac', '#2a3e5e'];
  const BY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function spray(v, f){ const key = 'co_spray' + v + '_' + f; if(SPR[key]) return SPR[key];
    const g = new Uint8Array(SPW * SPH), set = (x, y, t, over) => { x = Math.round(x); y = Math.round(y); if(x < 0 || y < 0 || x >= SPW || y >= SPH) return; const o = y * SPW + x; if(!g[o] || over) g[o] = t; };
    let sd = v * 977 + 13; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const cx0 = SPW / 2, base = SPH - 2, fingers = [];
    for(let j = 0; j < 5; j++){ const off = j - 2; fingers.push({ x:cx0 + off * 5.5 + (R() - .5) * 2, lean:off * .32 + (R() - .5) * .15, h:(34 - Math.abs(off) * 6) * (.85 + R() * .2), w:2.6 + R() * .8, curl:(off === 0 ? (R() < .5 ? -1 : 1) : Math.sign(off)) }); }
    const grow = [.28, .62, 1, 1, 1, 1][f];
    // the fingers: tapered columns leaning outward; the top fifth hooks over like a claw; lit edge left, dark outline right
    if(f <= 3) for(const F of fingers){ const H = F.h * grow, top = f === 3 ? .45 : 1;
      for(let t = 0; t <= H * top; t += .5){ const u = t / F.h, yy = base - t, hook = u > .78 ? (u - .78) / .22 : 0, xc = F.x + F.lean * t + F.curl * hook * hook * 4.5, hw = Math.max(.6, F.w * (1 - u * .62));
        for(let x = Math.floor(xc - hw); x <= Math.ceil(xc + hw); x++){ const d = x + .5 - xc; if(Math.abs(d) > hw) continue; const tone = d < -hw + 1.1 ? 1 : d > hw - 1 ? 4 : d > hw - 2 ? 3 : 2; set(x, yy, t > H * top - 1.5 ? 1 : tone, true); }
        if(hook > .5) set(xc + F.curl * (hw + 1), yy + 1, 1); } }
    // droplet clusters thrown from the finger tips, falling under gravity from f2 on (positions are fixed per frame: deterministic)
    if(f >= 2) for(const F of fingers){ const tx = F.x + F.lean * F.h + F.curl * 4.5, ty = base - F.h, t = f - 1.6;
      for(let k = 0; k < 7; k++){ const a = (R() - .5) * 2.4 + F.curl * .7, sp = 2.2 + R() * 2.8, x = tx + Math.sin(a) * sp * t * 1.6, y = ty - Math.cos(a) * sp * t * 1.2 + 1.5 * t * t + (f === 2 ? 2 : 0);
        if(f === 5 && k % 2) continue; set(x, y, k % 3 ? 1 : 2); if(k % 4 === 0 && f < 5) set(x + 1, y, 2); if(f <= 3 && k % 3 === 0) set(x, y + 1, 3); } }
    // the foam dome at the impact (f0-f3), shrinking as it falls back
    if(f <= 3){ const rx = [8, 11, 12, 10][f], ry = [5, 6, 5, 3][f];
      for(let y = base - ry; y <= base + 1; y++) for(let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++){ const dx = (x + .5 - cx0) / rx, dy = (y + .5 - base) / ry; if(dx * dx + dy * dy > 1 + (hash(x * 3.1 + y * 7.7 + v) - .5) * .35) continue;
        set(x, y, dy < -.55 || dx < -.7 ? 1 : dx > .6 || dy > .6 ? 3 : 2); } }
    // mist: an expanding cloud in stepped ordered dither, pale on the moon side, thinning frame by frame
    const md = [0, 0, 4, 7, 5, 2.5][f]; if(md){ const mx = cx0, my = base - 8 - f * 2, rx = 9 + f * 3.4, ry = 5 + f * 1.6;
      for(let y = 0; y < SPH; y++) for(let x = 0; x < SPW; x++){ const dx = (x + .5 - mx) / rx, dy = (y + .5 - my) / ry, r2 = dx * dx + dy * dy + (hash(Math.floor(x / 3) * 5.3 + Math.floor(y / 3) * 2.9 + f + v * 7) - .5) * .9; if(r2 > 1) continue; const lvl = md * (r2 < .3 ? 1 : r2 < .65 ? .6 : .3);
        if(BY4[(y & 3) * 4 + (x & 3)] < lvl) set(x, y, x < mx - rx * .2 ? 2 : 3); } }
    return procSprite(key, SPW, SPH, (x, y) => SPT[g[y * SPW + x]] || null); }
  // ---- the wave hit over the sea wall, from references (Hokusai's crest at pixel zoom; photos and slow-motion clips of storm waves over the
  // Dawlish sea wall and through tetrapods). Rebuilt 2026-11-20 (Kellan: "choppy, like one pixel animation is just replaced with the other"):
  // it was ten keyed poses held 110-210 ms each, the curl swapped for the burst in a single frame and the grain re-dealt every pose.
  // Now one continuous life cycle sampled at SPF frames spread evenly over the hit (~50 ms, three game frames each):
  //   swell (from flat) -> mound -> rise, the white creeping down from the summit -> curl, claws growing in root-first one after another
  //   -> lip throw (spacing eases out: it hangs at full reach) -> plunge (eases in: fast) -> the body sinks into whitewater UNDER the burst.
  //   The burst: streak columns shoot up (ease-out), hang, then drain from below and fall (gravity, ease-in); the dashes ride with the tips;
  //   tip droplets drift downwind, thin out and shrink; the mist grain grows then thins pixel by pixel (a hash fixed per pixel against a
  //   moving threshold, so it never boils); a foam sheet slides across the walkway and drains to lace the same way.
  // Every key silhouette is resampled to the same NLP outline points so the outline morphs; no noise depends on the frame, so only edges move.
  // Four tones: white crest, pale cyan, blue-grey, Prussian blue; lit from the sea side, outline on the shadow side only.
  const SPF = 30, HIT = .62, T_IMP = .47, NLP = 48, PT = [null, '#f2f8fc', '#a8d4e6', '#5a7ea0', '#14305c'], SW1 = 84, SH1 = 84;
  // claw fingers, hand-laid: a root at the lower left, rising, curling forward and hooking down at the tip; P marks the inner line
  const CLAW = [
    ['.......WWWWW....',
     '.....WWWWWWWWW..',
     '....WWCCCPPWWWW.',
     '...WWCP.....PWWW',
     '..WWCP........PW',
     '.WWCP..........W',
     'WWCP............',
     'WCP.............',
     'WC..............'],
    ['.....WWWW..',
     '...WWWWWWW.',
     '..WWCPPWWWW',
     '.WWCP...PWW',
     'WWCP......W',
     'WCP........',
     'WC.........'],
    ['..WWW..',
     '.WWCWW.',
     'WWP..WW',
     'WP....W',
     'W......']];
  // key silhouettes [t, crest run [summit, tip] as outline fractions, points]: art px from the wave's root (x toward the road, y up), open
  // outlines from the seaward foot over the crest to the landward foot (the base closes them)
  const LIPK = [
    [0, [.5, .5], [[-2, 0], [6, .3], [14, .6], [22, .3], [30, 0]]],
    [.13, [.5, .5], [[-2, 0], [4, 5], [10, 8], [16, 9], [22, 8], [28, 5], [30, 0]]],
    [.25, [.55, .63], [[0, 0], [6, 10], [14, 20], [22, 26], [30, 27], [36, 24], [34, 20], [30, 18], [26, 12], [24, 0]]],
    [.35, [.48, .63], [[0, 0], [6, 14], [14, 28], [24, 38], [34, 41], [42, 38], [47, 31], [44, 27], [39, 29], [34, 26], [31, 16], [30, 0]]],
    [.43, [.44, .72], [[0, 0], [8, 16], [16, 32], [28, 44], [40, 46], [50, 42], [56, 33], [57, 25], [53, 24], [49, 31], [42, 33], [37, 24], [35, 0]]],
    [.49, [.39, .70], [[0, 0], [8, 14], [16, 28], [28, 38], [40, 40], [50, 36], [57, 25], [60, 11], [58, 2], [53, 9], [47, 20], [41, 17], [36, 0]]]];
  // spacing per span: the swell eases in from flat, a steady rise, ease out into full reach (the hang), ease in to the plunge (fast)
  const LIPE = [s => s * (.4 + .6 * s), s => s, s => s, s => s * (2 - s), s => s * s];
  // claws along the crest run: [place from summit (0) to tip (1), size tier (0 big), birth t]; they grow root-first over CGROW
  const CLA = [[0, 2, .2], [.13, 2, .225], [.26, 1, .255], [.4, 1, .29], [.56, 0, .325], [.76, 0, .36]], CGROW = .07;
  let LIPR = null;
  function lipKeys(){ if(LIPR) return LIPR;
    LIPR = LIPK.map(([t, cr, p]) => { const cum = [0]; for(let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
      const L = cum[cum.length - 1], out = []; let j = 0;
      for(let k = 0; k < NLP; k++){ const d = k / (NLP - 1) * L; while(j < p.length - 2 && cum[j + 1] < d) j++; const f = clamp((d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), 0, 1);
        out.push([lerp(p[j][0], p[j + 1][0], f), lerp(p[j][1], p[j + 1][1], f)]); }
      return [t, cr, out]; });
    return LIPR; }
  // the outline at time t, plus its crest run, both interpolated between the keys with that span's spacing
  function lipAt(t){ const K = lipKeys(); let i = 0; while(i < K.length - 2 && t >= K[i + 1][0]) i++;
    const s = LIPE[i](clamp((t - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1)), A = K[i][2], B = K[i + 1][2];
    return { pts:A.map((a, k) => [lerp(a[0], B[k][0], s), lerp(a[1], B[k][1], s)]), cr:[lerp(K[i][1][0], K[i + 1][1][0], s), lerp(K[i][1][1], K[i + 1][1][1], s)] }; }
  const outPt = (pts, fr) => { const q = clamp(fr, 0, 1) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(q)), e = q - k; return [lerp(pts[k][0], pts[k + 1][0], e), lerp(pts[k][1], pts[k + 1][1], e)]; };
  function plume(f, wind, R){ const key = 'co_plume' + f + wind + R; if(SPR[key]) return SPR[key];
    const w = SW1 * R, h = SH1 * R, g = new Uint8Array(w * h), CL = new Uint8Array(w * h), t = f / (SPF - 1);
    const set = (x, y, tn, keep) => { x = Math.round(x); y = Math.round(y); if(x < 0 || y < 0 || x >= w || y >= h) return; const o = y * w + x; if(keep && g[o]) return; g[o] = tn; };
    const hh = (x, y, k) => hash(x * 12.9898 + y * 78.233 + k * 37.719 + wind * 7.7), base = h - 1 - 2 * R, X0 = 8 * R, XW = 34 * R, W2 = wind ? 1 : .35;
    const st = wind ? 1.15 : 1, toPx = (x, y) => [X0 + x * R * st + (wind ? y * R * .12 : 0), base - y * R];
    const b = t < T_IMP ? -1 : (t - T_IMP) / (1 - T_IMP), col = b < 0 ? 0 : sm(b / .36);   // b: the burst's own clock; col: the body's collapse
    // ---- act one: the swell rising into the curling lip; after the impact it sinks and turns to whitewater under the burst
    if(col < 1){ const L0 = lipAt(t), sink = Math.pow(1 - col, 1.2), P = L0.pts.map(([x, y]) => toPx(x + col * 8 * y / 46, y * sink));
      let ymin = h, x0b = w, x1b = 0; for(const [x, y] of P){ if(y < ymin) ymin = y; if(x < x0b) x0b = x; if(x > x1b) x1b = x; }
      // the mask by scanline (even-odd, pixel centres): the crossings of each row, sorted, filled in pairs
      const M = new Uint8Array(w * h), yA = Math.max(0, Math.floor(ymin)), xA = Math.max(0, Math.floor(x0b)), xB = Math.min(w - 1, Math.ceil(x1b)), xs = [];
      for(let y = yA; y < h; y++){ const yc = y + .5; xs.length = 0;
        for(let i = 0, j = P.length - 1; i < P.length; j = i++){ const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if((yi > yc) !== (yj > yc)) xs.push((xj - xi) * (yc - yi) / (yj - yi) + xi); }
        xs.sort((p1, p2) => p1 - p2); for(let q = 0; q + 1 < xs.length; q += 2) for(let x = Math.max(xA, Math.ceil(xs[q] - .5)); x <= Math.min(xB, Math.ceil(xs[q + 1] - .5) - 1); x++) M[y * w + x] = 1; }
      const m = (x, y) => x >= 0 && y >= 0 && x < w && y < h && M[y * w + x];
      // the white crest creeps down the back from the summit as the face steepens (wf), and swallows the body as it collapses (col)
      const wf = sm((t - .1) / .22), hTop = Math.max(1, base - ymin);
      for(let y = yA; y < h; y++) for(let x = xA; x <= xB; x++){ if(!M[y * w + x]) continue; let du = 0; while(du < 24 * R && m(x, y - du - 1) && m(x + Math.ceil(du * .5), y - du - 1)) du++;
        const ht = (base - y) / hTop, band = [7, 12, 18].some(b2 => Math.abs(du - b2 * R) < R * .6 + (b2 === 7 ? R * .3 : 0));   // lighter streak lines running parallel to the curling crest
        let tn = du < R ? (ht > 1 - wf * 1.3 ? 1 : t < .07 ? 3 : 2) : du < 2 * R ? (ht > 1 - wf ? 1 : 2) : du < 3 * R ? (wf > .5 ? 2 : 4) : band ? (du < 9 * R ? 2 : 3) : 4;
        if(col > 0){ if(hh(x, y, 13) < col * 1.15 - .1) continue; const wv = hh(x, y, 12); if(wv < col * 1.7) tn = 1; else if(wv < col * 3) tn = Math.min(tn, 2); }   // the body sinks, turns to whitewater and comes apart pixel by pixel
        if(!m(x - 1, y) && tn > 2) tn = 3; set(x, y, tn); }
      // the claws: each rides its place on the crest run and grows root-first at its own time, then retracts as the lip sinks
      for(const [pl, sz, born] of CLA){ const gr = clamp((t - born) / CGROW, 0, 1) * clamp(1 - col * 2.4, 0, 1); if(gr <= 0) continue;
        const [ax, ay] = outPt(P, lerp(L0.cr[0], L0.cr[1], pl)), F = CLAW[sz], fh = F.length, show = Math.ceil(fh * gr), cx1 = Math.round(ax), cy1 = Math.round(ay);
        F.forEach((row, yy) => { if(yy < fh - show) return; [...row].forEach((c, xx) => { if(c === '.') return; const px = cx1 + xx - 1, py = cy1 - fh + yy + 2; set(px, py, c === 'W' ? 1 : c === 'C' ? 2 : 4); if(px >= 0 && py >= 0 && px < w && py < h) CL[py * w + px] = 1; }); }); }
      // spray feathering off the summit as it rises, and droplets flung forward off the lip as it throws: each born at its own moment from
      // where the crest was then, flying on a parabola, shrinking from two pixels to one and paling before it goes
      for(let k = 0; k < 18; k++){ const lip = k >= 10, born = lip ? .34 + (k - 10) * .016 : .15 + k * .024, life = lip ? .11 : .1, age = (t - born) / life; if(age < 0 || age >= 1) continue;
        const Lb = lipAt(born), [sx, sy] = lip ? Lb.pts.reduce((a2, c2) => c2[0] > a2[0] ? c2 : a2) : outPt(Lb.pts, Lb.cr[0]), vx = lip ? 5 + hh(k, 0, 20) * 7 : (1 + hh(k, 0, 20) * 3) * (wind ? 1.8 : 1), vy = lip ? (hh(k, 1, 20) - .3) * 4 : 3 + hh(k, 1, 20) * 4;
        const [px, py] = toPx(sx + vx * age, sy + 1 + vy * age - 7 * age * age); set(px, py, age < .7 ? 1 : 2); if(age < .4) set(px + 1, py, 1); }
    }
    // ---- act two: the burst as upward-raking streaks
    if(b >= 0){ const Lm = 64 * R, rise = clamp(b / .34, 0, 1), tipK = b < .34 ? 1 - Math.pow(1 - rise, 3) : Math.max(0, 1 - 1.8 * (b - .34) * (b - .34)), L = Lm * tipK;
      const fall = Math.pow(clamp((b - .26) / .74, 0, 1), 1.4), cxb = XW + 2 * R, n = 26 * R / (R > 1 ? 1.4 : 1);
      // the translucent grain body: hashed specks inside an organic outline (radius varying with angle), thinning toward the edge
      const gd = b < .14 ? b / .14 * .55 : .55 * Math.pow(1 - (b - .14) / .86, 1.2), gy = base - Lm * .5 * Math.min(1, rise * 1.15) - b * 5 * R, gr = Lm * .55 * Math.min(1, rise * 1.15) + 6 * R + b * 9 * R;
      if(gd > .005) for(let y = Math.max(0, Math.floor(gy - gr * 1.1)); y <= base; y++) for(let x = Math.max(0, Math.floor(cxb - gr)); x <= Math.min(w - 1, cxb + gr + 14 * R * W2); x++){ const dx = x + .5 - cxb - (base - y) * .25 * W2 - b * 6 * R * W2, dy = y + .5 - gy, an = Math.atan2(dy, dx), rr = gr * (.72 + .28 * Math.sin(an * 3 + 1 + b * 1.4) * Math.sin(an * 5 + 1.7)), d = Math.hypot(dx * .8, dy) / rr; if(d > 1) continue;
        const dg = gd * (1 - d * d) * 1.1; if(dg > .19 && (BY4[(y & 3) * 4 + (x & 3)] + .5) / 16 < dg) set(x, y, d < .45 ? 2 : 3, true); }   // ordered dither (kodawari #13: hashed specks read as static), feathered by the density falling off to the rim; fixed per pixel, so it thins and never boils; under 3/16 it stops (a sparser lattice read as a screen door)
      // streak columns fanned from the impact, curving downwind; dense and white low, breaking into dashes that ride with the tips, ending in
      // droplet clusters; after the hang each column drains from below while its tip falls back
      for(let c = 0; c < n; c++){ const u = (c + .5) / n * 2 - 1, ang = u * .62 + W2 * .12, len = L * (.55 + .45 * Math.cos(u * 1.3)) * (.75 + hh(c, 0, 4) * .45), x0 = cxb + u * 9 * R, curl = (wind ? 22 : 8) * R * (.35 + .65 * Math.min(1, b / .45));
        // (kodawari #13: the upper columns were broken into hashed dashes, which at mid range read as white static; now each column feathers out
        // toward its tip through an ordered dither fixed to the pixel grid, stepping white -> pale cyan -> blue-grey as it thins)
        if(len > R) for(let tt = 0; tt <= 1; tt += .5 / Math.max(8, len)){ if(tt < fall) continue; const yy = base - 2 * R - tt * len, xx = x0 + Math.sin(ang) * tt * len + curl * tt * tt * (u + 1.2) * .5;
          const dn = tt < .5 ? 1 : 1 - (tt - .5) / .5 * .8, bx = Math.round(xx), by = Math.round(yy); if(dn < 1 && (BY4[(by & 3) * 4 + (bx & 3)] + .5) / 16 > dn) continue;
          const tn = tt < .38 ? 1 : tt < .72 ? 2 : 3; set(xx, yy, tn, tt > .3); if(tt < .3 && R > 1) set(xx + 1, yy, 1, true); if(tt < .2) set(xx - 1, yy, 2, true); }
        if(b > .04 && b < .92){ const te = 1 - fall * .5, ex = x0 + Math.sin(ang) * len * te + curl * te * te * (u + 1.2) * .5, ey = base - 2 * R - len * te;   // droplet cluster at the tip
          for(let d = 0; d < 4; d++){ if(hh(c, d, 8) < b * 1.15 - .12) continue; const sp = 1 + b * 1.6, dx = ex + (hh(c, d, 6) - .4) * 5 * R * sp + b * 9 * R * W2, dy = ey + (hh(c, d, 7) - .5) * 4 * R * sp + b * b * 12 * R;
            set(dx, dy, hh(c, d, 8) > .35 + b * .3 ? 1 : 2, true); if(b < .45 && hh(c, d, 9) > .5) set(dx + 1, dy, 2, true); } } }
      // the white core at the impact: ragged, wide, a Prussian line on its shadow (right/bottom) side; swells in a blink, settles slowly
      const ck = b < .1 ? b / .1 : Math.max(0, 1 - (b - .1) / .6), cw = 16 * R * Math.sqrt(ck), ch = 12 * R * ck;
      if(cw >= 1 && ch >= .5) for(let y = Math.floor(base - ch); y <= base; y++) for(let x = Math.floor(cxb - cw); x <= cxb + cw; x++){ const u = (x + .5 - cxb) / cw, top = base - ch * (1 - u * u) * (.45 + .9 * hh(Math.floor(x / (2 * R)), 0, 9)); if(Math.abs(u) > 1 || y < top) continue;
        set(x, y, u > .78 || y > base - R ? (u > .9 ? 4 : 3) : hh(x, y, 14) < .18 + Math.max(0, u) * .5 ? 2 : 1); }
      // the foam sheet sliding across the walkway toward the road, then draining to lace pixel by pixel
      const sw = 36 * R * Math.pow(clamp((b - .12) / .7, 0, 1), .7), dr = clamp((b - .45) / .55, 0, 1);
      if(sw >= 1){ const sx0 = XW - 10 * R, sx1 = XW + 10 * R + sw;
        for(let x = Math.floor(sx0); x <= sx1; x++){ const tip = (x - sx0) / (sx1 - sx0); for(let y = base - 2 * R; y <= base + R; y++){ const row = y - (base - 2 * R);
          if(row < R){ if(hh(x, y, 10) > .25 + tip * .4 + dr * .8) set(x, y, 1, true); } else if(hh(x, y, 11) > tip * .7 + dr * 1.05) set(x, y, row < 2 * R ? 2 : 3, true); } } } }
    // the claws' outline on their shadow side, so the hooks read against the body
    for(let y = 0; y < h - 1; y++) for(let x = 0; x < w - 1; x++){ const o = y * w + x; if(!CL[o]) continue; if(!CL[o + 1] && !g[o + 1]) g[o + 1] = 4; if(!CL[o + w] && !g[o + w]) g[o + w] = 4; }
    // written as one ImageData (a fillRect per pixel cost ~20 ms per big frame in warm-up)
    const c = canvas(w, h), k = c.getContext('2d'), img = k.createImageData(w, h), D = img.data, PC = PT.map(v => v && hx(v));
    for(let o = 0; o < w * h; o++){ const tn = g[o]; if(!tn) continue; const C = PC[tn]; D[o * 4] = C[0]; D[o * 4 + 1] = C[1]; D[o * 4 + 2] = C[2]; D[o * 4 + 3] = 255; }
    k.putImageData(img, 0, 0); return SPR[key] = c; }
  // the hit's frame at a point of the wave clock (hp in 0..1 of the period; the hit fills the first HIT of it): frames are spread evenly
  const plumeFrame = hp => Math.min(SPF - 1, Math.floor(hp / HIT * SPF + 1e-6));
  // foam washing round the tetrapods at TF_LV water levels, one art pixel apart (was two, four pixels apart, each held for ~0.5-0.8 s): dithered water fills the gaps between the units' feet, a white rim marks the
  // waterline and foam beads cling to the windward (sea, left) faces
  const TF_LV = 8;
  function tetraFoam(v, lvl){ const key = 'co_tfoam' + v + '_' + lvl; if(SPR[key]) return SPR[key]; const src = tetra(v), w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0, wl = h - lvl;
    return procSprite(key, w, h, (x, y) => { if(y < wl - 1) { if(!solid(x, y) && solid(x + 1, y) && y > wl - 6 && hash(x * 1.7 + y * 3.1 + v) > .35) return y % 2 ? SPT[2] : SPT[1]; return null; }
      if(y === wl - 1) return solid(x, y) ? (hash(x + v) > .4 ? SPT[1] : null) : (hash(x * 2.3 + v) > .25 ? SPT[1] : null);
      if(solid(x, y) && y === wl && !solid(x - 1, y)) return SPT[1];
      // water only in the gaps between feet (solid on both sides within the row), so the cluster keeps its silhouette
      let l = false, r = false; for(let k = 1; k < 9; k++){ if(solid(x - k, y)) l = true; if(solid(x + k, y)) r = true; } if(!(l && r) || solid(x, y)) return null;
      return BY4[(y & 3) * 4 + (x & 3)] < 9 ? '#183052' : '#0c1a34'; }); }
  // mercury streetlamp for the sea wall: slim pole lit from the left, a long arm reaching over the road, a flat head with a cold lens
  const LAMPC = { O:'#090c16', D:'#161c2c', M:'#2a3248', L:'#56648a', H:'#8c9cc4' };
  const lampSprite = () => pix('lamp', 30, 74, P => { const { O, D, M, L, H } = LAMPC;
    P.rect(1, 9, 4, 65, O); P.rect(2, 9, 1, 65, L); P.rect(3, 9, 1, 65, M); P.rect(2, 40, 2, 1, D); P.rect(0, 67, 6, 7, O); P.rect(1, 67, 1, 6, L); P.rect(2, 67, 3, 6, D); P.rect(1, 67, 4, 1, M);
    P.rect(2, 6, 3, 4, O); P.px(2, 7, L); P.px(3, 8, M); P.rect(4, 3, 3, 4, O); P.px(4, 4, L); P.px(5, 5, M);
    P.rect(6, 2, 16, 3, O); P.rect(6, 2, 16, 1, H); P.rect(6, 3, 16, 1, M);
    P.rect(20, 1, 10, 5, O); P.rect(21, 1, 8, 1, H); P.rect(21, 2, 8, 1, L); P.rect(21, 3, 8, 1, M); P.rect(21, 5, 8, 1, '#8ad8e0'); P.rect(22, 5, 6, 1, '#e8fffc'); P.px(24, 5, '#ffffff'); P.px(25, 5, '#ffffff'); });
  const LAMP_HX = 25, LAMP_HY = 5.5, LAMP_PX = 2.5, LAMP_H = 1.75;
  // umi-no-ie: a seasonal beach house, shuttered for the night; tin roof, painted sign, one bare bulb, folded parasols
  const shack = v => pix('shack' + v, 64, 34, P => { const O = '#08070c', WOOD = ['#1a1418', '#2a2026', '#3e2e30', '#5a4440'], TIN = ['#141a26', '#24304a', '#3e4e6e', '#6a7ea4'], SH = ['#141822', '#202634', '#2c3446'];
    // body, raised on a deck
    P.rect(2, 12, 60, 20, O); P.rect(3, 13, 58, 18, WOOD[1]); for(let x = 4; x < 61; x += 4) P.rect(x, 13, 1, 18, WOOD[0]); P.rect(3, 13, 1, 18, WOOD[3]);
    // the shutter (amado) panels, closed
    for(let x = 8; x < 52; x += 11){ P.rect(x, 17, 10, 13, O); P.rect(x + 1, 18, 8, 11, SH[1]); for(let yy = 19; yy < 29; yy += 2) P.rect(x + 1, yy, 8, 1, SH[2]); P.rect(x + 1, 18, 1, 11, SH[2]); }
    // tin roof, single pitch, corrugated, moonlit edge
    P.rect(0, 7, 64, 6, O); P.rect(1, 7, 62, 1, TIN[3]); P.rect(1, 8, 62, 4, TIN[1]); for(let x = 2; x < 63; x += 3) P.rect(x, 8, 1, 4, TIN[2]); P.rect(1, 12, 62, 1, TIN[0]);
    // sign board on the roof edge: white with red letters (海の家), shown as glyph blocks
    P.rect(16, 1, 30, 7, O); P.rect(17, 2, 28, 5, '#c8c4bc'); P.rect(17, 2, 28, 1, '#e8e4dc');
    // 海の家 in 5x5 pixel glyphs
    const GL = [['X.XXX', '.XX..', 'X.XXX', '.XX.X', 'X.XXX'], ['.XXX.', 'X.X.X', 'X.X.X', 'X..X.', '.X...'], ['..X..', 'XXXXX', '.XXX.', 'X.X.X', '.X.X.']];
    GL.forEach((g, gi) => g.forEach((row, yy) => [...row].forEach((c, xx) => { if(c === 'X') P.px(20 + gi * 8 + xx, 2 + yy, v ? '#2a5aa8' : '#c8302a'); })));
    // deck and posts
    P.rect(0, 31, 64, 3, O); P.rect(1, 31, 62, 1, WOOD[3]); P.rect(1, 32, 62, 1, WOOD[1]);
    // folded parasols leaning at the end; a drink cooler
    const PC = v ? ['#c8302a', '#e8e0d0'] : ['#2a6ab0', '#e8e0d0']; for(let j = 0; j < 3; j++){ const x = 54 + j * 3; for(let y = 14; y < 31; y++) P.px(x + ((y >> 2) & 1 ? 0 : 0), y, (y >> 1) % 2 ? PC[0] : PC[1]); P.px(x, 13, O); }
    P.rect(4, 22, 3, 9, O); P.rect(4, 23, 3, 1, '#2a6ab0');
    // the one bare bulb under the eave
    P.rect(30, 13, 1, 2, O); P.px(30, 15, '#ffe2a0');
    // kakigori flag: 氷 in red on white cloth with blue waves along the hem, on a bamboo pole
    P.rect(40, 8, 1, 24, '#6a6a3a'); P.px(40, 8, '#a8a868'); P.rect(41, 9, 9, 13, O); P.rect(41, 9, 8, 12, '#e8e6dc'); P.rect(41, 9, 1, 12, '#ffffff'); P.rect(48, 9, 1, 12, '#a8a69c');
    ['...X...', '.X.XXX.', '..XX.X.', '.X.X.X.', 'X..X..X', '...X...', '..XX...'].forEach((row, yy) => [...row].forEach((c, xx) => { if(c === 'X') P.px(41 + xx, 10 + yy, '#d02830'); }));
    for(let xx = 0; xx < 8; xx++) P.px(41 + xx, 18 + ((xx >> 1) % 2), '#2a6ad0'); P.rect(41, 19, 8, 2, '#2a6ad0'); for(let xx = 0; xx < 8; xx += 2) P.px(41 + xx, 19, '#8ac0ff'); });
  // surf shop: small two-storey clapboard house, boards in a rack out front, a neon sign
  const surfShop = () => pix('surf', 52, 44, P => { const O = '#07080c', W = ['#16222a', '#20323a', '#2c4650', '#4a6a72'], R = ['#121018', '#1e1a26', '#2e2838'];
    P.rect(4, 10, 44, 34, O); P.rect(5, 11, 42, 33, W[1]); for(let y = 13; y < 44; y += 3) P.rect(5, y, 42, 1, W[0]); P.rect(5, 11, 1, 33, W[3]); P.rect(46, 11, 1, 33, O);
    P.rect(1, 5, 50, 6, O); P.rect(2, 5, 48, 1, '#5a5468'); P.rect(2, 6, 48, 4, R[1]); for(let x = 3; x < 50; x += 3) P.px(x, 7, R[2]);
    // upstairs window lit warm, downstairs shop window dim with a lit corner
    P.rect(30, 14, 12, 8, O); P.rect(31, 15, 10, 6, '#ffcc80'); P.rect(31, 15, 10, 1, '#fff0c8'); P.rect(36, 15, 1, 6, '#a06a3a'); P.rect(31, 20, 10, 1, '#c88a4a');
    P.rect(8, 28, 20, 12, O); P.rect(9, 29, 18, 10, '#1a2a38'); P.rect(9, 29, 18, 1, '#3a5a6a'); P.rect(22, 33, 4, 5, '#ffcc80');
    P.rect(32, 30, 8, 14, O); P.rect(33, 31, 6, 13, R[1]); P.px(38, 37, '#c8a050');
    // board rack: five boards standing, colours from the 80s
    const B = [['#e8d24a', '#a89020'], ['#e84a3a', '#a02a20'], ['#f0ece0', '#a8a49c'], ['#3ac8d8', '#1a7888'], ['#ff7aa8', '#b04a6a']];
    for(let j = 0; j < 5; j++){ const x = 3 + j * 5 + (j > 2 ? 22 : 0), t = 22 + (j % 2) * 2; if(x > 46) continue; P.rect(x, t, 4, 44 - t, O); P.rect(x + 1, t + 1, 2, 43 - t, B[j][0]); P.px(x + 2, t + 2, B[j][1]); P.rect(x + 2, t + 3, 1, 40 - t, B[j][1]); }
    // neon sign: SURF in a 3x5 pixel face, pink tubes with a pale core
    P.rect(8, 13, 18, 9, O); P.rect(9, 14, 16, 7, '#0c0c14');
    const F = { S:['111', '100', '111', '001', '111'], U:['101', '101', '101', '101', '111'], R:['110', '101', '110', '101', '101'], F:['111', '100', '110', '100', '100'] };
    [...'SURF'].forEach((ch, j) => F[ch].forEach((row, yy) => [...row].forEach((c, xx) => { if(c === '1') P.px(10 + j * 4 + xx, 15 + yy, yy === 0 || xx === 0 ? '#ffd8ec' : '#ff6aa8'); }))); });
  // isaribi fishing boat: dark hull, white wheelhouse, a wire of bare lamps strung over the deck
  const BOATL = [[5, 4], [10, 3], [15, 2], [20, 3], [25, 4]];
  const boat = () => pix('boat', 34, 16, P => { const O = '#05070e', HL = '#1a2236', HD = '#0c1220', CAB = ['#5a6680', '#8a96b0', '#3a4460'];
    P.rect(1, 10, 32, 4, O); P.rect(2, 10, 30, 1, HL); P.rect(3, 11, 28, 2, HD); P.rect(0, 9, 3, 2, O); P.px(1, 9, HL); P.rect(31, 9, 3, 2, O);
    P.rect(20, 5, 8, 5, O); P.rect(21, 6, 6, 4, CAB[0]); P.rect(21, 6, 6, 1, CAB[1]); P.rect(22, 7, 2, 1, '#ffd890'); P.rect(25, 7, 1, 1, '#ffd890');
    P.rect(15, 1, 1, 9, O); P.line(1, 5, 15, 1, '#20283a'); P.line(15, 1, 30, 5, '#20283a');
    for(const [bx, by] of BOATL) P.px(bx, by + 1, '#fffbe8'); });
  // a blue national-route shield (国道 134) on a post
  const shield = () => pix('shield', 18, 34, P => { const O = '#06080e';
    P.rect(8, 14, 2, 20, O); P.px(8, 14, '#6a7088');
    P.rect(0, 0, 18, 15, O); P.rect(1, 1, 16, 10, '#2a5ac8'); P.rect(2, 11, 14, 1, '#2a5ac8'); P.rect(4, 12, 10, 1, '#2a5ac8'); P.rect(7, 13, 4, 1, '#2a5ac8');
    P.rect(1, 1, 16, 1, '#5a8ae8'); P.rect(2, 2, 14, 1, '#f0f0ff');
    // "134" in white, 3x5 digits
    const D = { 1:['010', '110', '010', '010', '111'], 3:['111', '001', '011', '001', '111'], 4:['101', '101', '111', '001', '001'] };
    [1, 3, 4].forEach((d, j) => D[d].forEach((row, yy) => [...row].forEach((c, xx) => { if(c === '1') P.px(3 + j * 4 + xx, 4 + yy, '#f0f4ff'); }))); });
  // parked bikes in the beach lot: a row of low silhouettes with a chrome glint and a tail light
  // parked bikes: three 70s/80s street bikes (bosozoku style: raised bars, a tall stepped seat back, long chrome pipes), side-on, lit from the left
  const BIKEC = [['#ff6a6a', '#d83a40', '#8a1e28'], ['#7aa0ff', '#3a62d0', '#1e3478'], ['#ffd86a', '#d8a028', '#7a5810']];
  const bikes = () => pix('bikes2', 84, 17, P => { const O = '#05050a', T = '#15141c', RIM = '#7a7e92', CH = ['#e8ecf6', '#a8aec2', '#5a6074'];
    for(let j = 0; j < 3; j++){ const ox = j * 28, C = BIKEC[j], wheel = (cx0, cy0) => { for(let y = -5; y <= 5; y++) for(let x = -5; x <= 5; x++){ const r = Math.hypot(x, y); if(r > 4.6) continue;
        P.px(ox + cx0 + x, cy0 + y, r > 3.8 ? O : r > 2.6 ? (x < 0 && y < 0 ? '#2e2c38' : T) : r > 1.8 ? RIM : r > .8 ? (x + y) % 2 ? '#3a3e4e' : RIM : CH[0]); } };
      wheel(5, 11); wheel(21, 11);
      P.line(ox + 21, 11, ox + 16, 7, CH[2]); P.line(ox + 16, 8, ox + 9, 7, CH[2]); P.line(ox + 5, 11, ox + 8, 4, CH[1]); P.line(ox + 6, 11, ox + 9, 4, CH[2]);   // frame and fork
      P.rect(ox + 11, 10, 14, 1, CH[1]); P.rect(ox + 11, 9, 13, 1, CH[0]); P.px(ox + 25, 9, O); P.px(ox + 25, 10, CH[2]);                                    // long pipe
      P.rect(ox + 10, 6, 7, 3, O); P.rect(ox + 10, 5, 6, 1, O); P.rect(ox + 11, 5, 4, 1, C[0]); P.rect(ox + 10, 6, 6, 2, C[1]); P.rect(ox + 13, 7, 3, 1, C[2]); P.px(ox + 11, 5, '#ffffff');   // tank
      P.rect(ox + 16, 5, 6, 2, T); P.rect(ox + 16, 5, 5, 1, '#2a2834'); P.rect(ox + 20, 1, 2, 5, T); P.px(ox + 20, 1, '#3a3848'); P.rect(ox + 19, 3, 1, 2, CH[1]);   // stepped seat back
      P.line(ox + 9, 4, ox + 7, 1, CH[1]); P.px(ox + 6, 1, O); P.px(ox + 7, 1, T);                                                                          // raised bars
      P.rect(ox + 3, 4, 3, 3, O); P.px(ox + 4, 5, '#d8d4b8'); P.px(ox + 3, 5, CH[0]); P.px(ox + 22, 5, '#ff3a3a'); P.px(ox + 22, 6, '#8a1818');               // headlight, tail light
      P.line(ox + 14, 12, ox + 15, 16, CH[2]); } });
  // a drinks vending machine: white cabinet with a lit window of cans, a blue lower panel, the coin slot and the dispenser; side panel in shadow
  const vend = () => pix('vend', 19, 30, P => { const O = '#06070c';
    P.rect(0, 0, 19, 30, O); P.rect(1, 1, 13, 28, '#c4c8d4'); P.rect(1, 1, 1, 28, '#eef0f6'); P.rect(1, 1, 13, 1, '#eef0f6'); P.rect(14, 1, 4, 28, '#6a7080'); P.rect(14, 1, 1, 28, '#8a90a0'); P.rect(17, 1, 1, 28, '#4a5060');
    P.rect(2, 3, 11, 12, '#fff4d8'); P.rect(2, 3, 11, 1, '#ffffff');
    const CAN = ['#e04040', '#3a78e0', '#f0c840', '#40b878', '#f08030', '#e8e8f0'];
    for(let r = 0; r < 2; r++) for(let c = 0; c < 5; c++){ const x = 3 + c * 2, y = 5 + r * 5, col = CAN[(c + r * 2) % 6]; P.rect(x, y, 1, 3, col); P.px(x, y, '#ffffff'); P.px(x, y + 3, '#2a2a3a'); if((c + r) % 2) P.px(x, y + 4, '#5aff8a'); }
    P.rect(2, 16, 11, 7, '#2456b0'); P.rect(2, 16, 11, 1, '#5a8ae8'); P.rect(10, 17, 2, 3, '#0c0e1a'); P.px(10, 17, '#8a9ac8'); for(let c = 0; c < 3; c++) P.px(3 + c * 2, 18, '#aee0ff');
    P.rect(3, 24, 9, 3, '#0c0d16'); P.rect(3, 24, 9, 1, '#4a4e5e'); P.rect(1, 28, 13, 1, '#8a8e9a'); });

  // ---------------------------------------------------------------- backdrop pieces (art px)
  // Fuji across the bay, with the Hakone foothills at its feet: faint, one haze tone, moonlit on the left, a snow cap with streaks
  const FW = 150, FH = 46;
  let FUJI = null, ENO = null;
  const BEACON = [0, 0];
  function buildFuji(){ const w = FW, h = FH + 2, c = canvas(w, h), k = c.getContext('2d'), put = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); }, base = h - 1, cx0 = w / 2;
    for(let x = 0; x < w; x++){ const dx = x - cx0, ad = Math.abs(dx), fh = Math.min(FH * .9, FH * Math.pow(Math.max(0, 1 - ad / 58), 1.8)), foot = 7 * Math.max(0, 1 - Math.pow(ad / 75, 2)) * (.7 + .3 * Math.sin(x * .21)) + 2 * Math.max(0, 1 - ad / 75),
        top = Math.round(base - Math.max(fh, foot)); if(base - top < 1) continue; const lit = dx < -1;
      for(let y = top; y <= base; y++){ const dep = y - top, onF = fh >= foot && (base - y) > foot, sn = onF && (base - y) > FH * .5 + (hash(Math.floor(x / 2) * 3.1) - .5) * 9 * (ad / 30);
        put(x, y, sn ? (lit ? (dep < 1 ? '#8c9ac2' : '#5c6a94') : (dep < 1 ? '#4a5880' : '#36426c')) : onF ? (lit ? (dep < 1 ? '#2a385e' : '#1a2544') : '#151e3a') : (dep < 1 ? '#1c2848' : '#10172e')); } }
    FUJI = c; }
  // Enoshima: a round wooded hump with a cliff foot, the Sea Candle (a slim lit tower with a wide lit ring), shop lights at its foot,
  // and the bridge to the shore, drawn as a lamp line running right toward the land
  const EW = 120, EH = 40;
  function buildEno(){ const w = EW, h = EH, c = canvas(w, h), k = c.getContext('2d'), put = (x, y, ww, hh, col) => { k.fillStyle = col; k.fillRect(x, y, ww, hh); }, base = h - 1, ex = 38, er = 36;
    for(let x = ex - er; x <= ex + er; x++){ const d = (x - ex) / er, hgt = 15 * Math.pow(Math.max(0, 1 - d * d), .6) + (hash(Math.floor(x / 2) + 3) - .5) * 2 * (1 - Math.abs(d)), top = Math.round(base - hgt); if(hgt < .6) continue;
      put(x, top, 1, base - top + 1, '#060b16'); put(x, top, 1, 1, x < ex + 4 ? '#24365a' : '#142040'); if(x < ex && hash(x * 1.3) > .45) put(x, top + 1, 1, 1, '#16264a');
      if(base - top > 3) put(x, base - 2, 1, 2, (x & 1) ? '#141a2a' : '#1c2234'); }
    const tx = ex + 3, tb = Math.round(base - 15);
    put(tx - 1, tb - 13, 3, 13, '#7a88aa'); put(tx - 1, tb - 13, 1, 13, '#c8d4ec'); put(tx + 1, tb - 13, 1, 13, '#4a5878');
    put(tx - 4, tb - 16, 9, 3, '#0a1020'); put(tx - 3, tb - 15, 7, 1, '#cfeaff'); put(tx - 3, tb - 16, 7, 1, '#7a98c0');
    put(tx - 1, tb - 19, 3, 3, '#0a1020'); put(tx, tb - 18, 1, 1, '#4a5878'); BEACON[0] = tx; BEACON[1] = tb - 19;
    for(let j = 0; j < 16; j++){ const x = ex - 26 + Math.floor(hash(j * 3.1) * 46), y = base - 1 - Math.floor(hash(j * 7.3) * 4); put(x, y, 1, 1, hash(j) > .7 ? '#fff2d0' : '#ffb860'); }
    put(ex + 30, base - 1, w - ex - 30, 1, '#141c30'); for(let x = ex + 32; x < w; x += 3) put(x, base - 2, 1, 1, '#ffe8b0');
    ENO = c; }
  const HP = 1200, HH = 22; let HILLS = null;
  function buildHills(){ const c = canvas(HP * 2, HH), k = c.getContext('2d'), put = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); k.fillRect(x + HP, y, 1, 1); }, base = HH - 1, tau = 6.2832;
    const hAt = x => Math.round(3 + 5 * (.5 + .5 * Math.sin(x / HP * tau * 4 + 1)) + 4 * (.5 + .5 * Math.sin(x / HP * tau * 11 + 2)) + 2 * (.5 + .5 * Math.sin(x / HP * tau * 29)) + 2 * hash(Math.floor(x / 6)));
    for(let x = 0; x < HP; x++){ const hh = hAt(x), hp = hAt(x - 1); for(let y = base - hh + 1; y <= base; y++) put(x, y, '#080e1b'); if(hh >= hp) put(x, base - hh + 1, '#1e2c4c');
      const r = hash(x * 3.1); if(r > .58){ const shoreL = r > .8, ly = shoreL ? base - Math.floor(hash(x * 5.7) * 2) : base - 1 - Math.floor(hash(x * 7.7) * Math.max(1, hh - 3)); if(shoreL || hh >= 4) put(x, ly, hash(x * 9.1) > .75 ? '#dff0ff' : hash(x * 2.3) > .4 ? '#ffc070' : '#b07038'); } }
    HILLS = c; }
  const vn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  // ---------------------------------------------------------------- layout
  const CI = () => LANDS.findIndex(L => L.key === 'coast');
  const WALLX = 1.12, WALLH = .13, CAPW = .06, LAMP = 10, SHORE_B = 2.35, SHORE_T = 1.36, RAMP = 70;
  const lampD = i => Math.min(i % LAMP, LAMP - i % LAMP);
  // the shoreline swings between three kinds of coast, blended over ~60 segments so it never jumps:
  // a wide beach with umi-no-ie (shore far out), a narrow beach with the surf just beyond the wall, and tetrapods piled against the wall
  // causeways: long stretches where the road runs out over the water on a low embankment toward Enoshima (water on both sides)
  const zStart = j => { if(typeof gates === 'undefined' || typeof zoneOfSeg !== 'function') return 0; const z = zoneOfSeg(j); return z > 0 ? gates[2 * z - 1] : 0; };
  const CW = j => { const o = j - zStart(j); return (o >= 230 && o < 430) || (o >= 700 && hash(Math.floor(o / 170) * 7.1 + 3.3) > .55) ? 1 : 0; };
  function cwAt(j){ let sw = 0, sc = 0; for(let d = -36; d <= 36; d += 4){ const w = 37 - Math.abs(d); sw += w; sc += w * CW(j + d); } return sm(sc / sw * 1.25 - .1); }
  const KIND = j => { if(CW(j)) return 1; const r = hash(Math.floor(j / 110) * 5.3 + 1.7); return r < .25 ? 0 : r < .72 ? 1 : 2; };
  const SHK = [1.8, 1.17, 1.34];
  function shoreAt(j){ let sw = 0, sx = 0, st = 0; for(let d = -30; d <= 30; d += 3){ const w = 31 - Math.abs(d), k = KIND(j + d); sw += w; sx += w * SHK[k]; st += w * (k === 2 ? 1 : 0); } return [sx / sw, sm(st / sw * 1.6 - .3)]; }
  // 0..1 ramp in from the start of the coast and out toward its end, so the sea and the wall arrive and leave gradually
  let zc = { z:-1, a:0, b:0 };
  function ramp(j){ if(typeof gates === 'undefined' || typeof zoneOfSeg !== 'function') return 1; const z = zoneOfSeg(j);
    if(zc.z !== z || zc.n !== gates.length){ zc = { z, n:gates.length, a:z > 0 ? gates[2 * z - 1] : -1e9, b:gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9 }; }
    return sm(Math.min((j - zc.a) / RAMP, (zc.b - j) / RAMP)); }
  function ensure(j){ const s = segs[j]; if(!s || s.coW || s.land !== CIX) return; s.coW = true;
    const r = ramp(j), [sh, m] = shoreAt(j), c = cwAt(j) * r; s.coR = r; s.coM = m; s.coS = sh + (1 - r) * 14; s.coC = c; s.coRS = 1.17 + (1 - c) * 16;
    const add = o => s.sprites.push(Object.assign({ env:'coast', k:j }, o));
    add({ type:'wall', x:-WALLX }); add({ type:'rail', x:WALLX, post:j % 4 === 0 });
    if(j % LAMP === 0 && r > .02) add({ type:'lamp', x:-WALLX }); }
  let CIX = -2;

  function place(i, s){ if(CIX < -1) CIX = CI();
    const mine = s.land === CIX, sp = s.sprites, add = o => sp.push(Object.assign({ env:'coast', k:i }, o));
    if(mine){ for(let j = Math.max(0, i - 40); j <= i + 40 && j < segs.length; j++) ensure(j); }
    const r = mine ? s.coR : 0, m = mine ? s.coM : 0, sec = i % 260;
    // ---- the sea side
    if(mine && r > .6){
      if(m > .45 && i % 3 === 0) add({ type:'tetra', x:-(1.42 + H0(i * 1.9) * .12), v:(H0(i) * 4) | 0, splash:i % 12 === 0 });
      { const sb = i - i % 16, q = i % 16; if(q >= 2 && q < 6 && H0(sb * 1.1) < .5 && segs[sb] && segs[sb].coS > 1.72) add({ type:'shack3', side:-1, x:-SHK3.X, xo:-SHK3.X, b0:sb + 2, len:SHK3.len, v:(sb / 9 | 0) % 2 }); }
      if(H0(i * 1.31 + 4) < .045){ const bx = -(6 + H0(i * 2.7) * 18); add({ type:'boat', x:bx }); (s.coB = s.coB || []).push(bx); }
      if(s.coC > .6 && H0(i * 2.13 + 9) < .04){ const bx = 5 + H0(i * 3.9) * 16; add({ type:'boat', x:bx }); (s.coB = s.coB || []).push(bx); }
    }
    if(mine && s.coC > .02){ return; }
    // ---- the land side
    const palms = sec < 70, lot = sec >= 96 && sec < 124;
    if(palms){ if(i % 8 === 0) add({ type:'palm', x:1.5 + H0(i) * .08, v:(i / 8 | 0) % 3 }); if(H0(i * 3.3) < .2) add({ type:'pine', x:2.6 + H0(i * 1.7) * 2.5, v:(H0(i * 5) * 3) | 0, sz:.9 + H0(i * 7) * .3 }); }
    else if(lot){ if(sec >= 98 && sec < 98 + SRF.len) add({ type:'surf3', side:1, x:SRF.X, xo:SRF.X, b0:i - (sec - 98), len:SRF.len }); if(sec === 97) add({ type:'vend', x:1.32 }); if(sec === 108 || sec === 113) add({ type:'bikes', x:1.75 + (sec === 113 ? .5 : 0) });
      if(H0(i * 3.3) < .25) add({ type:'pine', x:3.4 + H0(i * 1.7) * 2.5, v:(H0(i * 5) * 3) | 0, sz:.9 + H0(i * 7) * .3 }); }
    else { if(H0(i * 3.3) < .3) add({ type:'pine', x:1.6 + H0(i * 1.7) * 1.4, v:(H0(i * 5) * 3) | 0, sz:.85 + H0(i * 7) * .35 });
      if(H0(i * 4.1) < .3) add({ type:'pine', x:3.1 + H0(i * 2.9) * 3, v:(H0(i * 6) * 3) | 0, sz:.9 + H0(i * 8) * .3 }); }
    if(sec === 84 && mine) add({ type:'shield', x:1.3 });
  }

  // ---------------------------------------------------------------- drawing
  const CONC = { O:'#0b0d14', D:'#181c28', M:'#283044', L:'#46506a', H:'#8e9ab8' };
  const RAIL = { top:'#e2e8f2', body:'#8a92a8', groove:'#40465c', post:'#2a2e3a' };
  // the sea side: a concrete parapet whose height follows the coast (a low kerb on the beach stretches, a tall wall where the tetrapods are),
  // with an open steel railing on top along the beaches so the sea shows through. Each segment draws its slice to the next segment, so it is
  // one continuous wall that rises and falls smoothly and arrives/leaves with the road's ramp.
  const SPANF = f => { f = fogPx(f); return f > .7 ? 4 : f > .45 ? 3 : f > .25 ? 2 : 1; };   // tiers by screen size (fogPx: the fog the old 260-segment draw distance gave here)   // far away one quad spans several segments
  const wallH = t => t ? (t.coR === undefined ? 0 : t.coR * lerp(.035, .22, t.coM)) : 0;
  function drawWall(sp, x, y, uw, fog){ const s = segs[sp.k], nS = SPANF(fog); if(!s || sp.k % nS) return; const t = segs[sp.k + nS - 1], qq = t && t.p2.screen.w ? t.p2 : s.p2, q = qq.screen; if(!q.scale) return; const fx = q.x + sp.x * q.w, fy = q.y; if(fy >= y) return;
    const n = segs[sp.k + nS], w1 = wallH(s), w2 = n && n.coR !== undefined ? wallH(n) : w1, h = uw * w1, fh = q.w * w2; if(h < .4 && fh < .4) return;
    const lit = (s.lit || 0) * .6, cw = uw * CAPW * s.coR, fcw = q.w * CAPW * (n && n.coR !== undefined ? n.coR : s.coR);
    poly(x, y + 1, x, y - h, fx, fy - fh, fx, fy + 1, fc(mixc(CONC.M, '#5a7488', lit), fog));
    if(fog < .6 && h > PX * 3){ // a darker tide band low on the face, and the board-formwork seam across the middle
      poly(x, y + 1, x, y - h * .22, fx, fy - fh * .22, fx, fy + 1, fc(CONC.D, fog));
      poly(x, y - h * .58, x, y - h * .58 - Math.max(PX * .5, h * .04), fx, fy - fh * .58 - Math.max(PX * .4, fh * .04), fx, fy - fh * .58, fc(CONC.D, fog)); }
    // the cap: the wall's top surface seen from above, moonlit
    poly(x, y - h, x - cw, y - h - cw * .35, fx - fcw, fy - fh - fcw * .35, fx, fy - fh, fc(CONC.H, fog));
    if(sp.k % 6 === 0 && fog < .7 && h > PX * 2){ cx.fillStyle = fc(CONC.O, fog); cx.fillRect(Math.round(x), y - h, Math.max(1, PX * .7), h); }
    // the railing on the beach stretches: a lit top rail and a mid rail on posts, fading out as the wall rises
    const ra = (1 - s.coM) * s.coR; if(ra < .05 || fog > .9) return;
    const rh = uw * .2, frh = q.w * .2, tk = Math.max(PX * .8, uw * .014), ft = Math.max(PX * .5, q.w * .014); cx.globalAlpha = Math.min(1, ra * 1.5);
    poly(x, y - h - rh, x, y - h - rh + tk, fx, fy - fh - frh + ft, fx, fy - fh - frh, fc(RAIL.top, fog));
    if(fog < .6) poly(x, y - h - rh * .5, x, y - h - rh * .5 + tk * .8, fx, fy - fh - frh * .5 + ft * .8, fx, fy - fh - frh * .5, fc(RAIL.groove, fog));
    if(sp.k % 4 === 0 && fog < .6){ cx.fillStyle = fc(RAIL.post, fog); cx.fillRect(Math.round(x - uw * .008), y - h - rh, Math.max(PX * .7, uw * .016), rh); }
    cx.globalAlpha = 1; }
  // land-side guardrail: a white W-beam on posts; far away one rect spans several segments
  function drawRail(sp, x, y, uw, fog){ const s = segs[sp.k], nS = SPANF(fog); if(!s || sp.k % nS) return; const t = segs[sp.k + nS - 1], nx = t && t.p2.screen.w ? t.p2 : s.p2, p = nx.screen; if(!p.w) return;
    const e1 = clamp(s.coR * 6, 0, 1), e2 = t ? clamp((t.coR !== undefined ? t.coR : s.coR) * 6, 0, 1) : e1;   // the end terminal slopes down to the ground
    const x2 = p.x + sp.x * p.w, y2 = p.y, u2 = p.w, h1 = uw * .17 * e1, h2 = u2 * .17 * e2, t1 = Math.max(PX, uw * .07), t2 = Math.max(PX, u2 * .07);
    if(sp.post && e1 > .5){ cx.fillStyle = fc(RAIL.post, fog); cx.fillRect(x - uw * .012, y - h1 - t1 * .2, Math.max(PX, uw * .025), h1 + t1 * .2); }
    if(fog > .25){ const l = Math.min(x, x2), r = Math.max(x, x2), tp = Math.min(y - h1, y2 - h2), bt = Math.max(y - h1 + t1, y2 - h2 + t2); cx.fillStyle = fc(fog > .45 ? RAIL.top : RAIL.body, fog); cx.fillRect(l, tp, Math.max(PX, r - l), Math.max(PX, bt - tp)); if(fog <= .45){ cx.fillStyle = fc(RAIL.top, fog); cx.fillRect(l, tp, Math.max(PX, r - l), PX); } return; }
    poly(x, y - h1, x2, y2 - h2, x2, y2 - h2 + t2, x, y - h1 + t1, fc(RAIL.body, fog));
    if(t1 > PX * 2.5) poly(x, y - h1 + t1 * .45, x2, y2 - h2 + t2 * .45, x2, y2 - h2 + t2 * .62, x, y - h1 + t1 * .62, fc(RAIL.groove, fog));
    poly(x, y - h1, x2, y2 - h2, x2, y2 - h2 + Math.min(PX, t2), x, y - h1 + Math.min(PX, t1), fc(RAIL.top, fog));
    if(sp.post && e1 > .5){ const near = clamp(1.25 - fog * 3, 0, 1), sz = Math.max(PX, snap(Math.min(uw * .022, PX * 6))), ry = y - h1 - t1 * .2 - sz;
      cx.fillStyle = fc('#4a90b0', fog); cx.fillRect(x - sz / 2, ry, sz, sz); if(near > .3){ const si = Math.max(PX, snap(sz * .5)); cx.fillStyle = '#e8faff'; cx.fillRect(snap(x - si / 2), snap(ry + (sz - si) / 2), si, si); }
      if(near > .33 && uw > 18) glow(x, ry + sz / 2, Math.min(uw * .08, H * .06), '#9ae0ff', .35 * near); } }
  function drawLamp(sp, x, y, uw, fog){ const s = segs[sp.k], spr = fogged(lampSprite(), 'lamp', fog), k = uw * LAMP_H / spr.height, base = y - uw * wallH(s), nf = scaleFade(k), a = (1 - fog * .7) * nf; if(nf <= 0) return;
    cx.globalAlpha = nf; blit(spr, x + (spr.width / 2 - LAMP_PX) * k, base, k); cx.globalAlpha = 1;   // fades as it passes beside the camera (was up to 12x)
    const hx0 = x + (LAMP_HX - LAMP_PX) * k, hy = base - spr.height * k + LAMP_HY * k;
    if(fog < .55 && fog > .02){ cx.globalCompositeOperation = 'lighter';
      for(const [wt, wb, al] of [[3, .5, .04], [1.5, .25, .055]]){ cx.fillStyle = `rgba(170,230,255,${al * (1 - fog) * nf})`; const tw = wt * k, bw = uw * wb; cx.beginPath(); cx.moveTo(hx0 - tw, hy); cx.lineTo(hx0 + tw, hy); cx.lineTo(hx0 + bw, y); cx.lineTo(hx0 - bw, y); cx.closePath(); cx.fill(); }
      cx.globalCompositeOperation = 'source-over'; }
    const ga = (1 - fog) * (1 - fog) * nf; glow(hx0, hy + k, Math.min(uw * .24 + 2, H * .12), '#a8e8ff', .55 * ga); }
  // trees: pick the detail level from the on-screen pixel size, so near trees keep small pixels instead of blowing up into blocks
  const lod = k1 => k1 > PX * 4.4 ? 3 : k1 > PX * 2.2 ? 2 : 1, lodFade = (k1, R) => clamp(1 - (k1 / R - PX * 2.2) / (PX * 1.6), 0, 1);
  function drawPine(sp, x, y, uw, fog, now){ const [pose, fr] = vegPose(sp, now), k1 = uw * 2.0 * (sp.sz || 1) / NH, R = lod(k1), a = lodFade(k1, R); if(a <= 0) return; const spr = pineSpr(sp.v, pose, fr, R), k = k1 / R;
    cx.globalAlpha = a; blit(R > 1 ? spr : fogged(spr, 'pine' + sp.v + pose + fr, fog), x + (NW / 2 - 14) * k1, y, k); cx.globalAlpha = 1; }
  function drawPalm(sp, x, y, uw, fog, now){ const [pose, fr] = vegPose(sp, now), k1 = uw * 2.5 / PH, R = lod(k1), a = lodFade(k1, R); if(a <= 0) return; const spr = palmSpr(sp.v, pose, fr, R), k = k1 / R;
    cx.globalAlpha = a; blit(R > 1 ? spr : fogged(spr, 'palm' + sp.v + pose + fr, fog), x + (PW / 2 - PBX) * k1, y, k); cx.globalAlpha = 1; }
  function drawTetra(sp, x, y, uw, fog, now){ const near = clamp((uw - W * .28) / (W * .16), 0, 1); if(near >= 1) return;   // fade out as they pass beside the camera, before they blow up into giant blocks
    const spr = fogged(tetra(sp.v), 'tetra' + sp.v, fog), k = uw * 1.0 / spr.width; cx.globalAlpha = 1 - near; blit(spr, x, y + k * 4, k); cx.globalAlpha = 1;
    // the sea washing round them on the same wave clock as the surf: it surges up through the units in a blink (ease-out) and drains
    // slowly (ease-in-out), one art pixel per step over TF_LV levels; at a splash cluster the surge starts as the plume's lip lands
    // Both run on one shared tick (one plume frame, ~50 ms): every cluster in view changes on the same game frame, so overlapping plumes
    // and foam far down the wall never flicker against each other one frame apart. Far off, where an art pixel is under a screen pixel,
    // the water steps a screen pixel's worth of art pixels at a time instead of crawling through sub-pixel steps.
    const tick = WAVE_T / 3 * HIT / SPF, tq = Math.floor(now / tick) * tick, ph = (((tq / WAVE_T + sp.k * WAVE_SLANT - .86) * 3) % 1 + 1) % 1, hp = (ph + hash(sp.k * .731) * .7) % 1, pw = sp.splash ? ((hp - T_IMP * HIT) % 1 + 1) % 1 : ph;
    const lst = Math.max(1, Math.round(PX / k)), lvl = reduce ? TF_LV >> 1 : Math.min(TF_LV, Math.round(TF_LV * (pw < .09 ? 1 - Math.pow(1 - pw / .09, 2) : 1 - sm((pw - .09) / .66)) / lst) * lst);
    if(lvl && fog < .8 && near <= 0){ cx.globalAlpha = 1; blit(fogged(tetraFoam(sp.v, lvl), 'tfoam' + sp.v + lvl, fog), x, y + k * 4, k); cx.globalAlpha = 1; }
    if(!sp.splash || fog > .75 || reduce) return;
    // the wave hit: SPF frames spread evenly over the hit (~50 ms each), world-anchored to this cluster; the plume rises above the lamps.
    // Two art sizes so it is never drawn past ~1.5 screen pixels per art pixel. The wind variant is latched for the whole hit (a typhoon
    // gust crossing the threshold mid-hit would otherwise swap the drawing under it).
    if(hp >= HIT) return; const fr = plumeFrame(hp);
    const kb = uw * 2.6 / SH1, R2 = kb > PX * 1.5 ? 2 : 1, ks = Math.min(kb / R2, PX * 1.5, H * .45 / (SH1 * R2)), fa = 1;   // never faded: near hits are capped in size (<= 1.5 px per art px, <= 45% of the screen height) and stay opaque
    if(fr === 0 || sp.wd === undefined) sp.wd = windNow(now) > .4 ? 1 : 0; const wd = sp.wd, psp = plume(fr, wd, R2);
    cx.globalAlpha = fa; blit(fogged(psp, 'plume' + fr + wd + R2, fog), x + (SW1 * R2 / 2 - 34 * R2) * ks + uw * .22, y + uw * .02, ks); cx.globalAlpha = 1; }
  function drawShack(sp, x, y, uw, fog){ const spr = fogged(shack(sp.v), 'shack' + sp.v, fog), k = uw * 1.0 / spr.width, a = nearFade(k); if(a <= 0) return; cx.globalAlpha = a; blit(spr, x, y, k); cx.globalAlpha = 1; if(fog < .85) glow(x - 2 * k, y - spr.height * k + 15 * k, uw * .14 + 2, '#ffc070', .45 * (1 - fog * .8)); }
  function drawSurf(sp, x, y, uw, fog, now){ const spr = fogged(surfShop(), 'surf', fog), k = uw * 2 / spr.width, nf = nearFade(k), a = (1 - fog * .75) * nf; if(nf <= 0) return; cx.globalAlpha = nf; blit(spr, x, y, k); cx.globalAlpha = 1;
    const x0 = x - spr.width * k / 2, y0 = y - spr.height * k, on = reduce || hash(Math.floor(now / 700) + sp.k) > .06;
    glow(x0 + 36 * k, y0 + 18 * k, uw * .3, '#ffb060', .3 * a); if(on) glow(x0 + 17 * k, y0 + 17.5 * k, uw * .35, '#ff5aa0', .4 * a); }
  function drawBoat(sp, x, y, uw, fog, now){ if(x < -uw * 2 || x > W + uw * 2) return; const spr = boat(), k = uw * 1.5 / spr.width, bob = reduce ? 0 : Math.round(Math.sin(now / 1100 + sp.k) * k * .5), a = 1 - fog * .8;
    const x0 = x - spr.width * k / 2, y0 = y - spr.height * k + bob;
    cx.globalAlpha = a; blit(spr, x, y + bob, k); cx.globalAlpha = 1;
    // the lamps: hard white pixels, a warm stepped halo; their light laid on the water as broken columns
    const sz = Math.max(PX, snap(k * 1.2));
    for(const [bx, by] of BOATL){ const lx = x0 + (bx + .5) * k, ly = y0 + (by + 1.5) * k; cx.fillStyle = '#fffbe8'; cx.fillRect(snap(lx - sz / 2), snap(ly - sz / 2), sz, sz); }
    glow(x0 + 15 * k, y0 + 4 * k, Math.max(PX * 3, uw * .9), '#ffe0a0', .35 * a); }
  function drawShield(sp, x, y, uw, fog){ const k = uw * .55 / 34, a = nearFade(k); if(a <= 0) return; cx.globalAlpha = a; blit(fogged(shield(), 'shield', fog), x, y, k); cx.globalAlpha = 1; }
  function drawBikes(sp, x, y, uw, fog){ const k = uw * 1.5 / 84, a = nearFade(k); if(a <= 0) return; cx.globalAlpha = a; blit(fogged(bikes(), 'bikes', fog), x, y, k); cx.globalAlpha = 1; }
    // props fade out once their pixels grow past ~3 screen pixels, as they pass beside the camera, instead of blowing up into blocks
  const nearFade = k => clamp(1 - (k - PX * 3) / (PX * 2.5), 0, 1);
  function drawVend(sp, x, y, uw, fog){ const spr = vend(), k = uw * .3 / spr.width, a = nearFade(k); if(a <= 0) return; cx.globalAlpha = a; blit(fogged(spr, 'vend', fog), x, y, k); cx.globalAlpha = 1;
    if(fog < .85){ glow(x - k * 2, y - k * 20, uw * .32, '#e8f4ff', .3 * (1 - fog) * a); } }
  // ---------------------------------------------------------------- the umi-no-ie and the surf shop as projected geometry (2026-11-19,
  // buildings3d; the shared kit ENV.bkit in env/buildings.js): real walls along the road and a real end facing you, so neither turns into
  // upscaled blocks or fades out as you pass it. Same reads as the sprites they replace (tin roof, closed amado, the 海の家 board, the bare
  // bulb, the 氷 flag and folded parasols; the clapboard surf shop with its lit window, SURF in pink neon and the board rack)
  const CSG = {};
  function cSign(key, str, fg, bg){ let c = CSG[key]; if(!c){ c = CSG[key] = document.createElement('canvas'); c.width = 16 * str.length + 6; c.height = 20; }
    const k = c.getContext('2d'); k.fillStyle = bg; k.fillRect(0, 0, c.width, c.height); k.font = '16px DotGothic16, monospace'; k.textBaseline = 'middle'; k.textAlign = 'center'; k.fillStyle = fg;
    for(let i = 0; i < str.length; i++) k.fillText(str[i], 3 + 16 * i + 8, 10);
    const im = k.getImageData(0, 0, c.width, c.height), d = im.data, B = hx(bg), Fg = hx(fg); for(let p = 0; p < d.length; p += 4){ const t = Math.abs(d[p] - B[0]) + Math.abs(d[p + 1] - B[1]) + Math.abs(d[p + 2] - B[2]) > 150 ? Fg : B; d[p] = t[0]; d[p + 1] = t[1]; d[p + 2] = t[2]; d[p + 3] = 255; } k.putImageData(im, 0, 0); }
  // SURF in the sprite's own 3x5 pixel face (pink tubes, pale core) and the 氷 flag (red on white cloth, blue waves): drawn as pixel grids
  // so they stay legible at any size (a 16 px font sampled down loses its strokes)
  function pixSigns(){ const surf = CSG.surfp = CSG.surfp || document.createElement('canvas'); surf.width = 19; surf.height = 9; let k = surf.getContext('2d'); k.fillStyle = '#07080c'; k.fillRect(0, 0, 19, 9); k.fillStyle = '#0c0c14'; k.fillRect(1, 1, 17, 7);
      const FN = { S:['111', '100', '111', '001', '111'], U:['101', '101', '101', '101', '111'], R:['110', '101', '110', '101', '101'], F:['111', '100', '110', '100', '100'] };
      [...'SURF'].forEach((ch, j) => FN[ch].forEach((row, yy) => [...row].forEach((c, xx) => { if(c === '1'){ k.fillStyle = yy === 0 || xx === 0 ? '#ffd8ec' : '#ff6aa8'; k.fillRect(2 + j * 4 + xx, 2 + yy, 1, 1); } })));
    const fl = CSG.kori = CSG.kori || document.createElement('canvas'); fl.width = 8; fl.height = 12; k = fl.getContext('2d'); k.fillStyle = '#e8e6dc'; k.fillRect(0, 0, 8, 12); k.fillStyle = '#ffffff'; k.fillRect(0, 0, 1, 12); k.fillStyle = '#a8a69c'; k.fillRect(7, 0, 1, 12);
      ['...X...', '.X.XXX.', '..XX.X.', '.X.X.X.', 'X..X..X', '...X...', '..XX...'].forEach((row, yy) => [...row].forEach((c, xx) => { if(c === 'X'){ k.fillStyle = '#d02830'; k.fillRect(xx, 1 + yy, 1, 1); } }));
      k.fillStyle = '#2a6ad0'; k.fillRect(0, 10, 8, 2); for(let xx = 0; xx < 8; xx++) k.fillRect(xx, 9 + ((xx >> 1) % 2), 1, 1); k.fillStyle = '#8ac0ff'; for(let xx = 0; xx < 8; xx += 2) k.fillRect(xx, 10, 1, 1); }
  function cSigns(){ pixSigns(); const go = () => { cSign('umi0', '海の家', '#c8302a', '#d8d4cc'); cSign('umi1', '海の家', '#2a5aa8', '#d8d4cc'); cSign('surf', 'SURF', '#ff8ac0', '#0c0c14'); }; go(); try{ document.fonts.load('16px DotGothic16').then(go, go); }catch(e){} }
  function cSignAt(key, L, h, t, w, a){ const c = CSG[key]; if(!c) return; const K = ENV.bkit, k = w * K.pu(t) / c.width; if(k * c.width < PX * 3) return; const ga = cx.globalAlpha; cx.globalAlpha = ga * a; blit(c, K.px(L, h, t), K.py(L, h, t), k); cx.globalAlpha = ga; }
  const SHK3 = { X:1.62, D:.56, hW:.42, hR:.56, ov:.1, top:['#141a26', '#24304a', '#2e3c5a', '#3e4e6e'], rib:'#141a26', rim:'#6a7ea4', ridge:'#0c1018', fascia:'#141a26', shade:'#08070c', tile:'tin', end:'gab', len:4 };
  const SRF = { X:1.95, D:.9, hW:1.02, hR:1.28, ov:.12, top:['#121018', '#1e1a26', '#26202e', '#2e2838'], rib:'#0c0a12', rim:'#5a5468', ridge:'#08070c', fascia:'#121018', shade:'#07080c', tile:'kawara', end:'gab', len:7, courses:4 };
  function drawShack3(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K) return;
    K.fade(fog, .7, () => { const m = K.begin(sp, x, y, uw, fog, .04); if(!m || !K.vis(SHK3.X - .5, SHK3.X + SHK3.D)) return; const F = c => fc(c, fog), X = SHK3.X, rel = K.rel, near = fog < .1 && m === 1, a = 1 - fog * .8, o = SHK3; o.near = near;
      // the deck on its posts over the sand, then the plank walls and the closed amado
      K.Q(X - .14, -.04, X, -.04, 0, 1, F('#08070c')); K.Q(X - .14, -.005, X, -.005, 0, 1, F('#3e2e30')); K.Q(X - .14, -.04, X - .14, 0, 0, 1, F('#1a1418'));
      K.Q(X, 0, X, o.hW, 0, 1, F('#2a2026')); if(near) for(let c = 0; c < m * 5; c++) K.V(X, 0, o.hW, (c + .5) / (m * 5), .006, F('#1a1418'));
      for(let r = rel; r < rel + m; r++){ const t0 = (r - rel) / m, t1 = (r + 1 - rel) / m, a0 = t0 + (t1 - t0) * .08, b0 = t1 - (t1 - t0) * .08; K.Q(X, .06, X, .33, a0, b0, F('#202634')); if(near || fog < .2) for(let c = 1; c < 6; c++) K.Q(X, .06 + c * .045, X, .065 + c * .045, a0, b0, F('#2c3446')); K.V(X, .06, .33, a0, .008, F('#2c3446')); }
      if(rel <= 2 && rel + m > 2){ const tc = (2 - rel) / m; K.bulb(X - .04, .36, tc, '#ffe2a0', '#ffc070', .02, .45 * a); K.cone(X - .04, .36, tc, .22, '255,192,110', .05 * a); }
      K.roof(o, F);
      if(!K.end) return;
      K.E(X, 0, X + o.D, o.hW, F('#2a2026')); for(let c = 1; c < 6; c++) K.E(X + o.D * c / 6, 0, X + o.D * c / 6 + .008, o.hW, F('#1a1418')); K.E(X, 0, X + .02, o.hW, F('#5a4440'));
      K.E(X + o.D * .14, .06, X + o.D * .86, .33, F('#141822')); for(let c = 0; c < 2; c++){ const L0 = X + o.D * (.16 + c * .36); K.E(L0, .08, L0 + o.D * .32, .31, F('#202634')); for(let g = 1; g < 6; g++) K.E(L0, .08 + g * .04, L0 + o.D * .32, .085 + g * .04, F('#2c3446')); }
      if(fog < .55){ for(const f of [.22, .78]) K.E(X + o.D * f - .01, o.hW, X + o.D * f + .01, o.hW + .1, F('#3e2e30')); cSignAt('umi' + sp.v, X + o.D * .5, o.hW + .07, 0, .42, 1 - fog * 1.5); }
      if(fog < .3){ const PC = sp.v ? ['#c8302a', '#e8e0d0'] : ['#2a6ab0', '#e8e0d0']; for(let j = 0; j < 3; j++){ const L = X + o.D + .06 + j * .05; for(let b = 0; b < 4; b++) K.R(L, .02 + b * .08, .025, .08, F(PC[b % 2])); K.R(L, .34, .01, .03, F('#08070c')); }
        const L = X - .26; K.R(L, 0, .014, .5, F('#6a6a3a')); cSignAt('kori', L - .07, .26, 0, .13, 1 - fog * 1.5); } }); }
  function drawSurf3(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K) return;
    K.fade(fog, .7, () => { const m = K.begin(sp, x, y, uw, fog, 0); if(!m || !K.vis(SRF.X - .5, SRF.X + SRF.D)) return; const F = c => fc(c, fog), X = SRF.X, rel = K.rel, near = fog < .1 && m === 1, a = 1 - fog * .8, o = SRF; o.near = near;
      K.Q(X - .4, 0, X, 0, 0, 1, F('#1a1c22')); K.Q(X, 0, X, o.hW, 0, 1, F('#20323a')); for(let c = 1; c < 11; c++) K.Q(X, c * .09, X, c * .09 + .012, 0, 1, F('#16222a'));
      // downstairs: the shop window (dim, a lit corner) and the door; upstairs: a lit window and a dark one
      for(let r = rel; r < rel + m; r++){ const t0 = (r - rel) / m, t1 = (r + 1 - rel) / m, b = r % 7;
        if(b === 1 || b === 2){ K.Q(X, .1, X, .42, t0 + (b === 1 ? .1 / m : 0), t1, F('#1a2a38')); K.Q(X, .41, X, .42, t0, t1, F('#3a5a6a')); if(b === 2) K.Q(X, .12, X, .3, t0 + (t1 - t0) * .5, t1 - (t1 - t0) * .1, F('#ffcc80')); }
        if(b === 4){ K.Q(X, 0, X, .5, t0 + (t1 - t0) * .2, t1 - (t1 - t0) * .2, F('#1e1a26')); }
        if(b === 3 || b === 5){ const on = b === 3; K.Q(X, .6, X, .84, t0 + (t1 - t0) * .15, t1 - (t1 - t0) * .15, F(on ? '#ffcc80' : '#141c26')); if(on && near) K.V(X, .6, .84, (t0 + t1) / 2, .008, F('#a06a3a')); } }
      K.Q(X, .5, X, .53, 0, 1, F('#2c4650'));
      if(rel <= 3 && rel + m > 3 && fog < .4) K.spill(X - .5, X, Math.max(0, (2 - rel) / m), Math.min(1, (4 - rel) / m), '255,190,120', .06 * a);
      // the board rack: boards standing against the wall, 80s colours
      if(fog < .3){ const BC = [['#e8d24a', '#a89020'], ['#e84a3a', '#a02a20'], ['#f0ece0', '#a8a49c'], ['#3ac8d8', '#1a7888'], ['#ff7aa8', '#b04a6a']];
        for(let r = rel; r < rel + m; r++){ if(r !== 0 && r !== 1) continue; for(let j = 0; j < 3; j++){ const tc = (r - rel + .2 + j * .3) / m, bc = BC[(r * 3 + j) % 5]; K.RT(X - .08, 0, tc, .05, .42 + (j % 2) * .06, F(bc[1])); K.RT(X - .08 - .006, .01, tc, .036, .4 + (j % 2) * .06, F(bc[0])); } } }
      K.roof(o, F);
      if(!K.end) return;
      K.E(X, 0, X + o.D, o.hW, F('#16222a')); for(let c = 1; c < 11; c++) K.E(X, c * .09, X + o.D, c * .09 + .012, F('#101a20')); K.E(X, 0, X + .025, o.hW, F('#4a6a72'));
      K.E(X + o.D * .1, .6, X + o.D * .5, .86, F('#0c0c14')); K.E(X + o.D * .6, .62, X + o.D * .9, .84, F('#07080c')); K.E(X + o.D * .62, .64, X + o.D * .88, .82, F('#ffcc80')); K.E(X + o.D * .62, .8, X + o.D * .88, .82, F('#fff0c8')); K.E(X + o.D * .745, .64, X + o.D * .755, .82, F('#a06a3a'));
      K.E(X + o.D * .1, .1, X + o.D * .55, .4, F('#07080c')); K.E(X + o.D * .12, .12, X + o.D * .53, .38, F('#1a2a38')); K.E(X + o.D * .4, .14, X + o.D * .51, .3, F('#ffcc80')); K.E(X + o.D * .66, 0, X + o.D * .86, .46, F('#1e1a26'));
      if(fog < .5){ const on = reduce || hash(Math.floor(now / 700) + sp.b0) > .06; cSignAt('surfp', X + o.D * .3, .64, 0, o.D * .38, (on ? 1 : .45) * (1 - fog * 1.4)); if(on && fog < .35) glow(K.px(X + o.D * .3, .73, 0), K.py(0, .73, 0), K.pu(0) * .35, '#ff5aa0', .5 * a); glow(K.px(X + o.D * .75, .73, 0), K.py(0, .73, 0), K.pu(0) * .3, '#ffb060', .3 * a); }
      if(fog < .3){ const BC = [['#e8d24a', '#a89020'], ['#e84a3a', '#a02a20'], ['#3ac8d8', '#1a7888']]; for(let j = 0; j < 3; j++){ const L = X - .06 - j * .07; K.R(L, 0, .055, .44 + (j % 2) * .07, F(BC[j][1])); K.R(L - .006, .01, .035, .42 + (j % 2) * .07, F(BC[j][0])); } } }); }
  const TUBE_HIDE = { shack3:1, surf3:1, pine:1, palm:1, shack:1, surf:1, vend:1, bikes:1, shield:1, lamp:1 };
  const DRAW_FN = { shack3:drawShack3, surf3:drawSurf3, vend:drawVend, wall:drawWall, rail:drawRail, lamp:drawLamp, pine:drawPine, palm:drawPalm, tetra:drawTetra, shack:drawShack, surf:drawSurf, boat:drawBoat, shield:drawShield, bikes:drawBikes };

  // a reflection column hanging below (x, y0): a fixed number of dashes at fixed fractions of its length, widths from a hash of (seed, dash)
  // eased between two values on a slow clock. Nothing switches on or off from frame to frame.
  function column(x, y0, len, w, seed, now, al0, colHi, colLo){ if(len < PX * 3 || al0 <= .01) return; const n = 10, ph = reduce ? 0 : now / 1300, p0 = Math.floor(ph), f = ph - p0;
    cx.globalCompositeOperation = 'lighter';
    for(let i = 0; i < n; i++){ const v = i / n, yy = snap(y0 + v * len); if(yy >= H) break;
      const h = lerp(H0(seed * 7.1 + i * 3.3 + p0 * .61), H0(seed * 7.1 + i * 3.3 + (p0 + 1) * .61), f), ww = Math.max(PX, w * (1 - v * .5) * (.55 + h * .7)), ox = (H0(seed * 3.7 + i * 1.9) - .5) * w * .4;
      cx.fillStyle = v < .2 ? colHi : colLo; cx.globalAlpha = al0 * (1 - v * .85); cx.fillRect(snap(x + ox - ww / 2), yy, Math.max(PX, snap(ww)), PX); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- surf: three waves roll in toward the shore on one clock, slanted along the beach
  const WAVE_T = 7200, WAVE_SLANT = .0042, SURF_RANGE = 1.25;
  const SURF_LIP = ['#bfe2ee', '#cde8f2', '#e0f1f8', '#f4fbff'];   // the lip whitening as the wave steepens: four hue-shifted steps (cyan to white), not one swap
  const SEA = ['#08142a', '#091630'], SAND = ['#16151e', '#17161f'], WET = '#121624', ROCK = '#11141e', WALK = ['#24242e', '#262632'], LAND = ['#0d1116', '#0e1218'];
  let moonCol = '#f0ead8', frameNow = -1, farX = 0, farCur = 0;
  const SEAB = ['#050c20', '#081228', '#0a172f', '#10203d', '#192c50', '#253c66']; let SEAC = {}, seaLow = '';
  const seaCol = (fog, st) => { if(seaLow !== lastLow){ seaLow = lastLow; SEAC = {}; } const q = Math.min(5, Math.floor(Math.pow(fog, .7) * 6)), key = q * 2 + st;
    return SEAC[key] || (SEAC[key] = mixc(mixc(SEAB[q], '#1a2a48', st ? .04 : 0), lastLow, .1 + q * .05)); };
  let czS = 0;   // the causeway factor under the bike, smoothed (moves Enoshima ahead of the road)
  // The backdrop's anchor (where the shore meets the horizon) rides the engine's skyOff parallax like every other road's far layers. It used to
  // follow farX, the far end of the last road segment drawn, which jumps tens of pixels per frame as segments enter the draw distance, hide
  // behind crests or shift with playerX: Fuji, Enoshima and the hills jittered. Now: centred when the coast comes into view, then moved by the
  // turn since (skyOff - bdSky0) at `rate` px per unit, eased by tanh so a long one-way run never pushes it past .1-.9 of the screen.
  let bdSky0 = null, bdSkyL = 0, bdNow = -1e9;
  const bdOff = rate => { const A = W * .4; return A * Math.tanh((skyOff - bdSky0) * rate / A); };

  // one side of open water: dir -1 = the sea on the left, +1 = the bay on the right of a causeway. X is the waterline in half-roads.
  function water(dir, s, a, b, ay, by, fog, st, i, now, thin, X, sA, sB, m){
    const edge = dir < 0 ? -4 : W + 4, near = dir < 0 ? Math.min(sA, sB) : Math.max(sA, sB), span = dir < 0 ? near : W - near;
    poly(edge, ay, sA, ay, sB, by, edge, by, seaCol(fog, st));
    // swell catching the sky: short dashes anchored to the segment, middle distance only (near the camera a per-segment hash would sparkle)
    if(!thin && fog > .05 && fog < .92 && span > 0){ cx.fillStyle = fc(fog < .4 ? '#2c4a7c' : '#3a5a8e', fog * .45); for(let g = 0; g < 3; g++){ if(H0(i * 2.3 + g * 9 + dir) < .25) continue;
      const rx = near + dir * span * (.05 + H0(i * 5.1 + g * 3 + dir) * .9), dw = PX * 2 + a.w * .14 * H0(i * 7.7 + g); cx.fillRect(snap(rx - dw / 2), snap(ay) - PX, snap(dw), PX); } }
    // the surf: three wave lines rolling in on one clock, slanted along the shore; foam dealt in runs of two segments, re-dealt only when a
    // wave is born far out (alpha 0 there), so nothing pops. Faint far out, white where it breaks, then a wash up to the waterline.
    const tw = reduce ? .3 : now / WAVE_T, calm = dir > 0 ? .6 : 1;
    for(let w = 0; w < 3; w++){ const u = tw + w / 3 + i * WAVE_SLANT + (dir > 0 ? .5 : 0), p = u - Math.floor(u), cyc = Math.floor(u);
      if(H0(Math.floor(i / 2) * 3.7 + cyc * 11.3 + w * 5.1 + dir) < .24) continue;
      const xo = X + .05 + (1 - p) * SURF_RANGE * (1 - m * .6) * calm + (H0(i * .37 + cyc * 2.1 + w) - .5) * .07,
        al = (p < .25 ? p / .25 * .7 : p < .84 ? .7 + (p - .25) / .59 * .3 : (1 - p) / .16) * (1 - fog * .45) * calm;
      if(al < .04) continue; const lA = a.x + dir * a.w * xo, lB = b.x + dir * b.w * xo; if(dir < 0 ? (lA < -24 && lB < -24) : (lA > W + 24 && lB > W + 24)) continue;
      // a breaking wave in four tones, seaward to shoreward: the dark trough, the blue-grey face, the white lip, foam beads in front.
      // Past mid-way the lip throws claw fingers seaward (every other segment-pair, dealt with the foam runs, so they never pop).
      const big = fog < .5 ? PX * 2 : PX, th = .06 + p * .1, tA = Math.max(big, Math.min(a.w * th, PX * (3 + p * 4))), tB = Math.max(big, Math.min(b.w * th, PX * (3 + p * 4)));
      const fw = .07 + p * .12, fA = Math.min(a.w * fw, PX * (2 + p * 6)), fB = Math.min(b.w * fw, PX * (2 + p * 6)), q = p > .3 ? Math.min(1, (p - .3) / .3) : 0;
      cx.globalAlpha = al * .85; poly(lA + dir * (fA + tA * .8 * q), ay, lA + dir * tA * .8 * q, ay, lB + dir * tB * .8 * q, by, lB + dir * (fB + tB * .8 * q), by, '#040a18');
      if(q > 0){ cx.globalAlpha = al; poly(lA + dir * tA * .8 * q, ay, lA, ay, lB, by, lB + dir * tB * .8 * q, by, '#2c4c7c'); }
      cx.globalAlpha = al; poly(lA, ay, lA - dir * tA, ay, lB - dir * tB, by, lB, by, SURF_LIP[Math.min(3, Math.floor(clamp((p - .1) / .2, 0, 1) * 4))]);
      const cg = sm((p - .5) / .1) * (1 - sm((p - .76) / .1));   // the claws grow out of the lip and fold back into it, never pop
      if(cg > .08 && H0(Math.floor(i / 2) * 9.1 + cyc * 3.3 + w) > .45 && fog < .75){ const cl = Math.min(tA * 1.6, PX * 6) * cg, cb = Math.min(tB * 1.6, PX * 6) * cg; poly(lA, ay, lA + dir * cl, ay - (ay - by) * .4, lB + dir * cb * .5, by, lB, by, '#f4fbff'); }
      if(p > .4 && fog < .7){ cx.fillStyle = '#bfe2ee'; for(let j = 0; j < 2; j++){ const o = (H0(i * 4.1 + j * 7 + cyc) * .8 + .3) * (tA + PX * 3); cx.fillRect(snap(lA - dir * (tA + o)), snap(ay) - PX, PX, PX); } }
      cx.globalAlpha = 1; } }
  // after each break, foam lace spreads up the beach and sinks into the sand: dashes dealt per segment and per wave, the front advancing
  // shoreward, thinning in three alpha steps; and the wet strip catches the moon in a slow sheen
  function lace(s, a, ay, by, fog, i, now, X){ if(fog > .8) return; const tw = reduce ? .3 : now / WAVE_T, yy = snap(ay) - PX;
    for(let w = 0; w < 3; w++){ const u = tw + w / 3 + i * WAVE_SLANT, p = u - Math.floor(u), cyc = Math.floor(u); if(p < .8) continue; const q = (p - .8) / .2;
      // each dash has its own life: it thins and pales, then sinks into the sand at its own moment, so the lace frays dash by dash
      for(let j = 0; j < 4; j++){ if(H0(i * 3.3 + j * 5.1 + cyc * 7.7 + w) < .3) continue; const age = q / (.45 + .55 * H0(i * 6.1 + j * 2.9 + cyc + w)); if(age >= 1) continue;
        cx.globalAlpha = .8 * (1 - fog) * (age < .6 ? 1 : (1 - age) / .4); cx.fillStyle = age < .45 ? '#e8f4fa' : '#9ab8cc';
        const xo = X + .04 - q * .32 * H0(i * 1.9 + j + cyc), xx = a.x - a.w * xo, ww = Math.max(PX, snap(a.w * (.02 + .05 * H0(i + j * 2.2 + cyc)) * (1 - age * .55)));
        cx.fillRect(snap(xx - ww / 2), yy, ww, PX); } }
    if(MOON.t < .97 && fog > .04){ const ph = reduce ? 0 : now / 1500, p0 = Math.floor(ph), fr = ph - p0, hv = lerp(H0(i * 5.7 + p0 * .41), H0(i * 5.7 + (p0 + 1) * .41), fr), al = clamp(hv * 1.6 - .6, 0, 1) * .4 * (1 - fog * .6);
      if(al > .02){ const xx = a.x - a.w * (X - .08 - H0(i * 2.9) * .18), ww = Math.max(PX, snap(PX * 2 + a.w * .06 * H0(i * 6.1))); cx.globalAlpha = al; cx.fillStyle = moonCol; cx.fillRect(snap(xx - ww / 2), yy, ww, PX); } }
    cx.globalAlpha = 1; }
  // the moon's glitter path: a column under the moon, wider toward the viewer, made of stepped dashes whose places and widths are fixed by the
  // segment (world-anchored) and whose brightness eases on a slow clock; only drawn where there is water, never on the road or land
  function glitter(i, a, ay, by, fog, now, Lw, Rw, side){ const hw = PX * 6 + a.w * .45, mx = side < 0 ? Math.min(MOON.x, Lw - hw * 1.1) : Math.max(MOON.x, Rw + hw * 1.1), prox = clamp(1 - Math.abs(MOON.x - mx) / (W * .6), .5, 1), ph = reduce ? 0 : now / 1100, p0 = Math.floor(ph), fr = ph - p0, rows = ay - by > PX * 5 ? 2 : 1;
    const put = (x0, ww, yy, al) => { let x1 = x0 + ww; if(x1 <= Lw || x0 >= Rw){} else if(x0 < Lw){ x1 = Lw; } else if(x1 > Rw){ x0 = Rw; } else return; x0 = snap(x0); x1 = snap(x1); if(x1 - x0 < PX || al < .02) return; cx.globalAlpha = al; cx.fillRect(x0, yy, x1 - x0, PX); };
    cx.fillStyle = moonCol;
    for(let r = 0; r < rows; r++){ const yy = r ? snap((ay + by) / 2) : snap(ay) - PX, fa = (1 - fog * .45) * prox;
      put(mx - (PX + a.w * .03), PX * 2 + a.w * .06, yy, .4 * fa);   // the path's steady spine
      for(let g = 0; g < 3; g++){ const key = i * 7.3 + r * 31 + g * 3, hv = lerp(H0(key + p0 * .37), H0(key + (p0 + 1) * .37), fr), dx = (H0(i * 3.1 + r * 5 + g * 7.7) - .5) * 2,
        ww = Math.max(PX, snap((PX * 2 + a.w * .11) * (.5 + H0(i * 1.7 + g + r * 9)))); put(mx + dx * hw - ww / 2, ww, yy, clamp(hv * 1.5 - .35, 0, 1) * (1 - Math.abs(dx) * .55) * fa); } }
    cx.globalAlpha = 1; }

  ENV.coast = {
    warm(){ for(const _ of ENV.coast.warmSteps()); },
    // the same build, resumable: the staged warm-up runs it about 4 ms per frame (yield = a safe place to stop); warm() runs it straight through
    *warmSteps(){ CIX = CI(); cSigns(); if(!FUJI){ buildFuji(); yield; buildEno(); yield; } for(let v = 0; v < 3; v++) for(let p = 0; p < 3; p++) for(let f = 0; f < 3; f++) for(let R = 1; R <= 3; R++){ pineSpr(v, p, f, R); palmSpr(v, p, f, R); yield; } tpUnit(0); tpUnit(1); yield; for(let v = 0; v < 4; v++){ tetra(v); for(let l = 1; l <= TF_LV; l++) tetraFoam(v, l); yield; } for(let f = 0; f < SPF; f++) for(let wd = 0; wd < 2; wd++) for(let R = 1; R <= 2; R++){ plume(f, wd, R); yield; } lampSprite(); shack(0); shack(1); yield; surfShop(); boat(); shield(); bikes(); vend(); yield;
      const up = c => { cx.drawImage(c, 0, 0, PX, PX); };   // first draw uploads the texture now, not mid-ride
      yield* fogWarmSteps(); if(!HILLS){ buildHills(); yield; } cx.save(); for(const k in SPR) if(k.startsWith('co_')) up(SPR[k]); for(const arr of FOGS.values()) for(const e of arr) if(e) up(e.c); if(!HILLS) buildHills(); up(FUJI); up(ENO); up(HILLS); cx.restore(); },
    road:['#16182a', '#181a2d'],
    lampCol:'#5a7c90',
    lit(i){ const d = lampD(i); return d === 0 ? .3 : d === 1 ? .12 : 0; },
    place,
    draw(sp, x, y, uw, fog, now, sk){ lastLow = sk.low; if(now !== fogFrame){ fogFrame = now; fogBudget = 24; }
      if(TUBE_HIDE[sp.type] && MECH.sp_wave && MECH.sp_wave.inTube && MECH.sp_wave.inTube(sp.k)) return;   // nothing on land stands inside the Great Wave's barrel
      const fn = DRAW_FN[sp.type]; if(fn) fn(sp, x, y, uw, fog, now); },
    roadFX(s, a, b, fog, f, now){
      if(s.coS === undefined){ if(CIX < -1) CIX = CI(); ensure(s.index); if(s.coS === undefined) return; }
      if(now !== frameNow){ frameNow = now; farX = farCur || W / 2; moonCol = mixc('#f0ead8', '#ffb070', clamp((MOON.t - .6) * 2.5, 0, 1)); const ps = segAt(position + PZ); czS += (((ps && ps.coC) || 0) - czS) * .03; }
      const WV = MECH.sp_wave, rec = WV && WV.plans && WV.plans.length ? WV.recede(s.index) : 0, ay = a.y, by = b.y - 1, i = s.index, st = s.stripe, shore = s.coS + rec * 4, e = 1.143, rs = s.coRS || 99;   // the Great Wave set piece draws the sea back before it rises
      farCur = b.x; if(ay - by < .2) return; const thin = ay - by < PX * .6 && fog > .6;
      // ---- water: the sea on the left; on a causeway the bay on the right as well; the moon's path over both
      const sA = a.x - a.w * shore, sB = b.x - b.w * shore, eA = a.x - a.w * e, eB = b.x - b.w * e, rA = a.x + a.w * rs, rB = b.x + b.w * rs;
      const Lw = Math.min(sA, sB), Rw = Math.max(rA, rB);
      if(sA > 0 || sB > 0) water(-1, s, a, b, ay, by, fog, st, i, now, thin, shore, sA, sB, s.coM);
      if(rA < W || rB < W) water(1, s, a, b, ay, by, fog, st, i, now, thin, rs, rA, rB, 0);
      if(!thin && fog < .88 && MOON.t < .97){ if(Lw > 0) glitter(i, a, ay, by, fog, now, Lw - PX, Rw + PX, -1); if(Rw < W) glitter(i, a, ay, by, fog, now, Lw - PX, Rw + PX, 1); }
      // the fishing boats' lamps laid on the water as long broken columns, from the boat's own segment down over the nearer water
      if(s.coB && fog < .95){ const k = a.w * 1.5 / 34; for(const bx of s.coB){ const x0 = a.x + bx * a.w; if(x0 < -a.w * 2 || x0 > W + a.w * 2) continue;
        const sx = bx < 0 ? sA : rA, vp = farX || W / 2, hz = H / 2 + 2;
        for(const [lx] of BOATL){ const cxp = x0 + (lx - 16.5) * k; if(bx < 0 ? cxp >= sx : cxp <= sx) continue;
          // stop the column where it would cross the waterline onto the shore (the shoreline runs from here to the vanishing point)
          const yl = Math.abs(sx - vp) > 1 ? hz + (ay - hz) * (cxp - vp) / (sx - vp) : H, len = Math.min(Math.max(PX * 12, a.w * 2.6), yl - ay - PX * 2);
          column(cxp, ay, len, Math.max(PX, k * 2.4), i * 5 + lx, now, .6 * (1 - fog * .6), '#fff2c8', '#ffb860'); } } }
      // sand (or the wet rock footing) from the rumble strip to the waterline, the wet edge darker
      if(eA > 0 || eB > 0){ const sand = s.coM > .5 || shore < 1.3 ? ROCK : SAND[st]; poly(eA, ay, sA, ay, sB, by, eB, by, fc(sand, fog));
        if(s.coM < .5 && shore > 1.4){ const wA = a.x - a.w * (shore - .3), wB = b.x - b.w * (shore - .3); poly(wA, ay, sA, ay, sB, by, wB, by, fc(WET, fog)); if(!thin) lace(s, a, ay, by, fog, i, now, shore); }
        // the sea drawn back before the Great Wave: the exposed bed is wet and catches the moon
        if(rec > .02){ const oA = a.x - a.w * s.coS, oB = b.x - b.w * s.coS; poly(oA, ay, sA, ay, sB, by, oB, by, fc(st ? '#2a2834' : '#2d2b38', fog));   // the drawn-back bed: wet grey sand, lighter than the sea
          if(!thin && fog < .92){ cx.fillStyle = moonCol; for(let g2 = 0; g2 < 3; g2++){ if(H0(i * 2.7 + g2 * 9) < .3) continue; const xx = lerp(oA, sA, .08 + H0(i * 4.1 + g2 * 3) * .84), ww = Math.max(PX, snap(a.w * (.05 + .12 * H0(i + g2 * 5))));
            cx.globalAlpha = (g2 ? .3 : .5) * rec * (1 - fog * .7); cx.fillRect(snap(xx - ww / 2), snap(ay) - PX, ww, PX); } cx.globalAlpha = 1; } } }
      // ---- land side: a pavement strip and kerb, then the pine floor out to the bay's waterline (or the screen edge)
      const kx = Math.min(1.48, rs), pA = a.x + a.w * e, pB = b.x + b.w * e, kA = a.x + a.w * kx, kB = b.x + b.w * kx;
      if(pA < W || pB < W){ poly(pA, ay, kA, ay, kB, by, pB, by, fc(rs < 1.5 ? ROCK : WALK[st], fog)); if(a.w > 30 && rs > 1.5){ const kw = a.w * .03, kwb = b.w * .03; poly(kA, ay, kA + kw, ay, kB + kwb, by, kB, by, fc('#3c3e4c', fog)); }
        if(rs > 1.52) poly(kA + a.w * .03, ay, Math.min(W + 4, rA), ay, Math.min(W + 4, rB), by, kB + b.w * .03, by, fc(LAND[st], fog)); }
      // after each wave hit on the tetrapod stretches the shoulder and road edge stay wet for a few seconds: darker, with a shine
      if(s.coM > .5 && fog < .85 && !reduce){ const ph = (((now / WAVE_T + i * WAVE_SLANT - .86) * 3) % 1 + 1) % 1, wet = ph < .3 ? 1 : ph < .6 ? .66 : ph < .85 ? .33 : 0;
        if(wet){ const xA = a.x - a.w * 1.143, xB = b.x - b.w * 1.143, iA = a.x - a.w * .72, iB = b.x - b.w * .72; cx.globalAlpha = .32 * wet * (1 - fog); poly(xA, ay, iA, ay, iB, by, xB, by, '#04070e');
          if(i % 3 === 0 && ay - by > PX){ cx.globalAlpha = .45 * wet * (1 - fog); cx.fillStyle = moonCol; const sx2 = lerp(xA, iA, .25 + H0(i) * .5), ww = Math.max(PX, snap(a.w * .08)); cx.fillRect(snap(sx2 - ww / 2), snap(ay) - PX, ww, PX); }
          cx.globalAlpha = 1; } }
      // the road soaked after the Great Wave: darker asphalt with a moonlit shine, drying over a few seconds
      { const wr = WV && WV.wetAt ? WV.wetAt(i) : 0; if(wr > .02 && fog < .9){ cx.globalAlpha = .3 * wr * (1 - fog); poly(a.x - a.w * 1.14, ay, a.x + a.w * 1.14, ay, b.x + b.w * 1.14, by, b.x - b.w * 1.14, by, '#04070e');
        if(ay - by > PX && H0(i * 3.3) > .35){ cx.globalAlpha = .4 * wr * (1 - fog); cx.fillStyle = moonCol; const xx = a.x + a.w * (H0(i * 1.9) * 1.6 - .8), ww = Math.max(PX, snap(a.w * .12)); cx.fillRect(snap(xx - ww / 2), snap(ay) - PX, ww, PX); } cx.globalAlpha = 1; } }
      // lamp pools under each lamp's head (over the left lanes), two stepped cool bands
      const d = lampD(i); if(d <= 2 && fog < .9 && (s.coR || 0) > .2){ cx.globalCompositeOperation = 'lighter';
        cx.fillStyle = `rgba(140,210,240,${[.1, .06, .03][d] * (1 - fog)})`; poly(a.x - a.w * 1.05, ay, a.x - a.w * .1, ay, b.x - b.w * .1, by, b.x - b.w * 1.05, by, cx.fillStyle);
        if(d === 0){ cx.fillStyle = `rgba(170,230,255,${.07 * (1 - fog)})`; poly(a.x - a.w * .9, ay, a.x - a.w * .35, ay, b.x - b.w * .35, by, b.x - b.w * .9, by, cx.fillStyle); }
        cx.globalCompositeOperation = 'source-over'; }
      // the damp asphalt: each lamp head hangs a column of broken dashes toward the viewer (world-anchored, never re-rolled per frame)
      if(i % LAMP === 0 && fog < .9 && (s.coR || 0) > .2){ const hxp = a.x - a.w * (WALLX - (LAMP_HX - LAMP_PX) * LAMP_H / 74); column(hxp, ay, a.w * .7, a.w * .12, i, now, .22 * (1 - fog), '#d0f6ff', '#5ab0d0'); }
    },
    backdrop(o){ const { hz, now, sk, moonX } = o; lastLow = sk.low; if(!FUJI){ buildFuji(); buildEno(); }
      if(bdSky0 === null || now - bdNow > 500 || now < bdNow || Math.abs(skyOff - bdSkyL) > .3) bdSky0 = skyOff; bdNow = now; bdSkyL = skyOff;   // re-centre on coming into view or a new ride
      const fx = W / 2 - bdOff(SKY_TIER.mid), seaLo = mixc('#0a1830', sk.low, .55);
      // the sea to the horizon in stepped bands, brighter toward the sky line, and a pale waterline
      cx.fillStyle = seaLo; cx.fillRect(0, hz, W, H - hz);
      for(const [y0, al] of [[0, .3], [2, .2], [5, .12], [10, .05]]){ cx.fillStyle = mixc(seaLo, '#6a8ab8', al); cx.fillRect(0, hz + y0 * PX, W, H - hz - y0 * PX); }
      const ez = czS, big = clamp((ez - .35) / .3, 0, 1);
      // right of the road: the Kamakura hills and the shore town, rising out of the waterline at the road (a stepped wedge clip); they sink
      // below the horizon while the road is out on a causeway
      if(!HILLS) buildHills(); const hh = HH * (1 - ez * .85);
      if(hh > 1){ const x0 = snap(fx), ho = ((((skyPar('mid') + x0 - W / 2) / PX) % HP) + HP) % HP /* the hills' content scrolls at exactly the mid tier; the clip edge (x0) carries most of it */, rise = W * .2, steps = 12;
        cx.save(); cx.beginPath(); cx.moveTo(x0, hz + PX); let py = hz + PX; for(let j = 1; j <= steps; j++){ const xx = snap(x0 + rise * j / steps), yy = snap(hz + PX - hh * PX * sm(j / steps)); cx.lineTo(xx, py); cx.lineTo(xx, yy); py = yy; }
        cx.lineTo(W, py); cx.lineTo(W, hz + PX); cx.closePath(); cx.clip();
        cx.drawImage(HILLS, ho, 0, Math.min(HP * 2 - ho, (W - x0) / PX + 1), HH, x0, hz - HH * PX + PX, Math.min(HP * 2 - ho, (W - x0) / PX + 1) * PX, HH * PX); cx.restore(); }
      // across the water: Fuji faint and far, Enoshima nearer with its lit tower and the bridge running toward the shore
      cx.save(); cx.beginPath(); cx.rect(0, 0, lerp(fx, W, ez), hz + PX * 2); cx.clip();
      const fjx = snap(W / 2 - bdOff(SKY_TIER.far) - W * .4 - ez * W * .05) /* Fuji, farthest, drifts slower than the hills and Enoshima */, ejx = snap(lerp(fx - W * .27, fx + W * .015, ez)); cx.globalAlpha = .9; cx.drawImage(FUJI, fjx - FW * PX / 2, hz - FUJI.height * PX + PX, FW * PX, FUJI.height * PX); cx.globalAlpha = 1;
      let bx = 0, byy = 0;
      for(const [sc, al] of [[1, 1 - big], [2, big]]){ if(al < .01) continue; const k = PX * sc; cx.globalAlpha = al; cx.drawImage(ENO, snap(ejx - 38 * k), hz - EH * k + PX, EW * k, EH * k);
        if(al >= .5){ bx = ejx - 38 * k + (BEACON[0] + .5) * k; byy = hz - EH * k + PX + (BEACON[1] + .5) * k; } }
      cx.globalAlpha = 1; const ph = reduce ? .5 : (now / 4600) % 1, fl = ph < .12 ? 1 - ph / .12 : 0;
      cx.fillStyle = fl > .2 ? '#ffffff' : '#fff2c8'; cx.fillRect(snap(bx - PX / 2), snap(byy - PX / 2), PX, PX); glow(bx, byy, PX * 3 + fl * PX * 14, '#fff2c8', .3 + fl * .5);
      // isaribi out on the horizon: warm pin-lights, steady, a few with a small halo
      for(let j = 0; j < 16; j++){ const xx = fx - W * (.03 + H0(j * 3.3) * 1.1) + Math.sin(skyOff * .03 + j) * PX * 4; if(xx < 0) continue; const yy = hz + PX * (1 + Math.floor(H0(j * 7.1) * 3));
        cx.fillStyle = H0(j) > .7 ? '#fff6e0' : '#ffd890'; cx.fillRect(snap(xx), yy, PX, PX); if(H0(j * 1.9) > .6) glow(xx, yy, PX * 2.5, '#ffe0a0', .25); }
      cx.restore();
      cx.fillStyle = 'rgba(150,180,220,.35)'; cx.fillRect(0, hz, lerp(fx, W, ez), PX);
      // the moon's road on the far water, whichever side of the road the moon hangs over water
      if(o.t < .97){ const left = moonX < fx - PX * 6, right = ez > .5 && moonX > fx + PX * 6; if(left || right){ cx.fillStyle = moonCol;
        for(let r = 0; r < 6; r++){ const ww = snap(PX * (2 + r * 2) * (.6 + H0(r * 3.7 + 1) * .6)), xx = moonX - ww / 2 + (H0(r * 9.1) - .5) * PX * 6; cx.globalAlpha = .35 + r * .04; cx.fillRect(snap(left ? Math.min(fx - ww, xx) : Math.max(fx, xx)), hz + PX * (1 + r * 2), ww, PX); } cx.globalAlpha = 1; } }
      return true; },
    overlay(al, now, sk){ const hz = HZ;   // this frame's horizon (follows the camera pitch, like the backdrop's o.hz)
      // sea mist lying on the horizon: dithered bands that drift slowly
      for(const [aa, y0, amp, sp2, thk] of [[.06, -10, 5, .004, 10], [.07, -3, 3, .007, 6]]){ cx.fillStyle = `rgba(120,150,190,${aa * al})`;
        for(let x = 0; x < W; x += PX * 4){ const n = Math.sin((x + now * sp2 * 20 + skyOff * 200) * .011) * .6 + Math.sin((x - now * sp2 * 33) * .027 + 2) * .4, top = snap(hz + y0 * PX - (n + 1) * amp * PX * .5), bot = snap(hz + (y0 + thk) * PX + n * PX); if(bot > top) cx.fillRect(x, top, PX * 4, bot - top); } } }
  };
  // for the Great Wave set piece: tetrapods standing on the drawn-back sea bed (reuses the cached, pre-fogged cluster sprites)
  ENV.coast.drawTetraAt = (x, y, uw, fog, now, k) => drawTetra({ v:k % 4, k, splash:false }, x, y, uw, fog, now);
  ENV.coast.plumeDbg = { frames:SPF, frame:(f, wd, R) => plume(f, wd, R) };   // for the wave-hit contact sheet (scratchpad tooling); never called by the game
  ENV.coast.barrier = WALLX;
})();
