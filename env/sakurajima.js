/* Sundown environment: Sakurajima (灰). See env/README.md for the hooks.
   The coast road round the active volcano across Kagoshima Bay: black lava fields walled with dry-stacked lava stone, ash-grey shoulders
   and wheel tracks in the ash, concrete ash shelters (退避壕) with a lamp over the arch, yellow ash-bag collection points (克灰袋), the
   Kurokami torii buried to its lintel in ash, black pines on old lava. On the horizon the volcano erupts: incandescent crater, lava
   rivulets down the flanks, a wind-bent ash plume lit from beneath, volcanic lightning in it, bombs arcing out at each blast. Across the
   bay, Kagoshima's lights and their reflections; the Sakurajima ferry crossing. Ash falls all night like grey snow.

   References looked at (Wikimedia; drawn from scratch, nothing copied):
   - "桜島今年163回目の爆発" (panoramio): at night the cone is a black silhouette; only the crater and a spatter of incandescent dots on
     its upper slope glow red-orange; the plume above is a darker-than-sky column barely lit at its root. -> glow lives at the crater
     and the plume's underside only; the rest of the mountain stays near-black.
   - "Smoking Sakurajima night photo" (panoramio): broad massif with several summits, a jagged crest; the plume leans downwind and
     flattens into a long sheet; a thin string of village lights along the foot; the bay reflects red and amber lights as long
     vertical dashes. -> multi-peak profile, wind-bent plume, village lights on the skirt, steady dash reflections.
   - Sakurajima 2013 plume from Kagoshima city (Sept 2013): a cauliflower column that mushrooms, darker than the blue sky, each
     lobe rounded with a lit lip. -> plume built from rounded lobes, dark bodies, cool lit tops, warm undersides.
   - Rinjani 1994 (volcanic lightning): bolts are white cores with violet fringe, branching downward inside the lower plume;
     the cone is streaked with orange ejecta tracks. -> cached branching bolts in the lower plume, ejecta as arcs of hot dots.
   - Buried torii, Kurokami (ja.wikipedia): only the kasagi with its upturned ends, the posts' stubs and the nuki show above the
     ash; grey stone, no vermilion. -> a stone lintel on an ash mound.
   - Ash shelters (Shelter No. 28; Sakurajima 2009): a plain concrete box, either an open bay with a centre column or a cube with
     a round arch, stained by rain, a white plate reading 退避壕 in red. -> arched concrete cube, streaked stains, white plate.
   - Nagisa lava trail: lava is angular blocks with flat facets, the tops paler (ash, weathering), the gaps black. -> faceted lava
     blocks, pale ash tops, black cracks.
   - Celeste (screenshot 03): smoke and dust as angular wisps in 3-4 flat tones with dark-hue shading, no outlines.
     Shovel Knight: limited ramps, one bright highlight edge on the lit side.
   Rules taken: one hot key light (the crater), everything else cool and dark; warm rims only on faces turned toward the volcano;
   ash on every upward face (wall ledges, boulder tops, pine pads, the torii's mound); the road is the cleanest strip;
   particles and reflections world-anchored and steady; reduced motion: no lightning or blasts, a calm steady glow. */
"use strict";
(() => {
  const P = 'skj_';
  const snap = v => Math.round(v / PX) * PX;
  const dz = (x, y) => (x + y) & 1;
  const H0 = n => hash(n);
  const vn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  let KI = -1; const landK = () => KI >= 0 ? KI : (KI = LANDS.findIndex(l => l.key === 'sakurajima'));

  // ---------------------------------------------------------------- pixel grid painter (ImageData, cached in SPR)
  const RGB = {}; const rgb = c => RGB[c] || (RGB[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  function grid(key, w, h, fn){ key = P + key; if(SPR[key]) return SPR[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), img = k.createImageData(w, h), d = img.data;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const col = fn(x, y); if(!col) continue; const [r, g, b] = rgb(col), i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    k.putImageData(img, 0, 0); return SPR[key] = c; }
  // ordered dither fills (Bayer 4x4), one canvas pixel per cell; colours snapped so a changing sky reuses patterns
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], PATS = new Map();
  const q5 = col => { const [r, g, b] = hx(col); return '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); };
  function pat(col, dens){ return ditherPat(q5(col), dens); }   // the engine's pattern cache: no canvas per colour
  // fogged colour cache
  let fogLow = '#140c14', FC = new Map();
  const fc = (col, fog) => { const q = Math.round(fog * 20), k = col + q; let v = FC.get(k); if(!v){ v = mixc(col, fogLow, q / 20 * .85); FC.set(k, v); } return v; };
  const CL = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col){ const a = -W, b = 2 * W, c = -H, d = 2 * H; window.poly(CL(x1, a, b), CL(y1, c, d), CL(x2, a, b), CL(y2, c, d), CL(x3, a, b), CL(y3, c, d), CL(x4, a, b), CL(y4, c, d), col); }
  function pool(x, y, rx, ry, col, a){ if(rx < 2 || a <= 0) return; const [R, G, B] = hx(col); cx.globalCompositeOperation = 'lighter';
    for(const [f, m] of [[1, .1], [.62, .16], [.32, .22]]){ cx.fillStyle = `rgba(${R},${G},${B},${a * m})`; cx.beginPath(); cx.ellipse(x, y, rx * f, Math.max(PX, ry * f), 0, 0, 6.283); cx.fill(); }
    cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- palettes
  const ROCK = ['#040305', '#0c090d', '#171317', '#322b30', '#5e565b'];      // crack, underside, face, ash top, ash edge
  const RIMW = '#4a1c12', RIMW2 = '#6e2a16';                                   // warm rim: faces turned toward the crater
  const CON = { K:'#16141a', D:'#2c2a32', M:'#45434c', L:'#5c5a64', H:'#7a7882' }; // concrete
  const ASH = { D:'#3a3438', M:'#5a5458', L:'#7e767a', H:'#a29a9c' };           // ash
  const STONE = { K:'#1a181e', D:'#3a3640', M:'#57525c', L:'#76717c', H:'#a8a2b0' };

  // ---------------------------------------------------------------- road-side sprites (baked for both sides: dir = side the crater is on)
  // lava block: faceted (Voronoi facets), the upward plane of each facet ash-pale, cracks black, the edge toward the crater warm
  const blockSpr = (v, dir) => { const key = 'blk' + v + (dir > 0 ? 'R' : 'L'); if(SPR[P + key]) return SPR[P + key];
    let sd = v * 7919 + 3; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, w = 24, h = 16;
    // one to three angular chunks (random star polygons), sitting on the ground line
    const polys = [], n = v % 3 === 2 ? 3 : v % 3 === 1 ? 2 : 1;
    for(let q = 0; q < n; q++){ const pcx = n === 1 ? 12 : 5 + q * (14 / (n - 1)) + (R() - .5) * 2, rx = (n === 1 ? 12 : 7.5) * (.85 + R() * .25), ry = (n === 1 ? 9 : 6.5) * (.75 + R() * .45), pcy = h - ry * .8, k = 5 + (R() * 3 | 0), off = R() * 6.28, pts = [];
      for(let i = 0; i < k; i++){ const a = off + i / k * 6.283 + (R() - .5) * .5, rr = .85 + R() * .25; pts.push([pcx + Math.cos(a) * rx * rr, pcy + Math.sin(a) * ry * rr]); } polys.push(pts); }
    const inP = (pts, x, y) => { let c = false; for(let i = 0, j = pts.length - 1; i < pts.length; j = i++){ const [xi, yi] = pts[i], [xj, yj] = pts[j]; if((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const seeds = []; for(let i = 0; i < 7; i++) seeds.push([1 + R() * 22, 1 + R() * 14]); const g = [];
    const fac = (x, y) => { let b = 0, bd = 1e9; seeds.forEach(([sx, sy], i) => { const d = (x - sx) * (x - sx) * .8 + (y - sy) * (y - sy) * 1.6; if(d < bd){ bd = d; b = i; } }); return b; };
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let m = -1; for(let q = 0; q < polys.length; q++) if(inP(polys[q], x + .5, y + .5)){ m = fac(x, y) + q * 10; break; } g[y * w + x] = m; }
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? -1 : g[y * w + x];
    return grid(key, w, h, (x, y) => { const f = at(x, y); if(f < 0) return null; const up = at(x, y - 1), dn = at(x, y + 1), sd2 = at(x + dir, y), lf = at(x - 1, y), top = seeds[f % 10][1] < 6;
      if(up < 0) return top || y < 8 ? ROCK[4] : ROCK[3]; if(sd2 < 0) return y < 9 ? RIMW2 : RIMW; if(dn < 0 && y < h - 1) return ROCK[0];
      if(up !== f) return top ? ROCK[3] : ROCK[2]; if(dn !== f) return ROCK[0]; if(lf !== f && lf >= 0) return ROCK[1];
      if(hash(x * 5.1 + y * 3.7 + v) > .9) return ROCK[1];                       // vesicles
      return top ? ROCK[2] : y > h - 4 ? ROCK[1] : ROCK[2]; }); };
  // black pine (kuromatsu) on old lava: flat pads, ash dust on their tops, a crooked trunk
  const PADS = [[[8, 10, 5, 3.4], [17, 7, 5.6, 3.6], [12, 3.5, 4, 3], [21, 14, 4.6, 3.2], [7, 17, 4.4, 3]], [[10, 8, 5.4, 3.6], [19, 11, 5, 3.4], [14, 3.5, 4.2, 3], [6, 14, 4.4, 3.2], [17, 18, 4.6, 3]]];
  const pineSpr = (v, dir) => { const key = 'pine' + v + (dir > 0 ? 'R' : 'L'); if(SPR[P + key]) return SPR[P + key]; const w = 28, h = 34, g = new Int8Array(w * h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let m = 0;
      for(const [px, py, rx, ry] of PADS[v]){ const dx = (x + .5 - px) / rx, dy = (y + .5 - py) / ry; if(dx * dx + dy * dy <= .9 + .25 * hash(Math.floor(x / 2) * 3.1 + y * 7.7 + v)){ m = 1; break; } }
      const tx = 14 + (33 - y) * (v ? -.12 : .1) + Math.sin(y * .35 + v) * 1.4; if(!m && y > 6 && Math.abs(x + .5 - tx) < (y > 30 ? 1.8 : 1.1)) m = 2;
      if(!m && y > 8 && y < 20 && (y % 6 === 2) && Math.abs(x + .5 - tx) < 6 && Math.abs((x - tx) - (y % 12 < 6 ? 1 : -1) * (y - 8) * .2) < 3 && hash(x + y * 9 + v) > .3) m = 2;
      g[y * w + x] = m; }
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x];
    return grid(key, w, h, (x, y) => { const m = at(x, y); if(!m) return null;
      if(m === 2) return at(x + dir, y) === 0 && hash(y) > .4 ? '#3a1a14' : '#140e10';
      if(at(x, y - 1) !== 1) return hash(x * 3 + y + v) > .5 ? ASH.M : ASH.D;
      if(at(x, y - 2) !== 1) return '#161c18';
      if(at(x + dir, y) !== 1) return '#4a2216';
      if(at(x, y + 1) !== 1) return '#030504';
      return hash(x * 7.1 + y * 3.3) > .78 ? '#15201a' : '#0b120e'; }); };
  // ash shelter 退避壕: a concrete cube with a round arch, ash heaped on its roof, rain stains, a white plate, a lamp over the arch
  const shelterSpr = () => grid('shelter', 44, 36, (x, y) => {
    const F = 33, ax = 16.5, ay = 21, ar = 8.6;
    if(y === 0) return x >= 1 && x <= 42 ? (hash(x * 3.1) > .4 ? ASH.H : ASH.L) : null;
    if(y === 1) return x <= 43 ? ASH.L : null;
    if(y === 2) return x <= 43 ? (x > F ? ASH.M : CON.H) : null;
    if(y === 3) return x <= 43 ? (x > F ? CON.D : CON.L) : null;
    if(y === 4) return x <= 43 ? CON.K : null;
    if(y >= 33){ if(x <= 1 || (x >= 29 && x <= 36) || x >= 41) return y === 33 ? ASH.L : ASH.M; return y === 35 ? CON.K : (x > F ? CON.K : '#1e1c22'); }
    if(x > F){ const ss = x - F; if(x === 43) return CON.K; return (hash(x * 1.3 + 7) > .6 && y > 6 && y < 20 + hash(x) * 10) ? '#24222a' : ss < 2 ? '#38363e' : CON.D; }
    const dx = x + .5 - ax, inArch = (y >= ay && Math.abs(dx) <= ar) || (dx * dx + (y + .5 - ay) * (y + .5 - ay) <= ar * ar);
    if(inArch){ const d2 = Math.sqrt(dx * dx + Math.max(0, ay - y - .5) ** 2); if(d2 > ar - 1) return '#24222a'; if(y > 30) return '#141218'; return y < 16 ? '#060508' : '#0a090d'; }
    if(y >= 6 && y <= 10 && x >= 9 && x <= 24){ if(y === 6 || y === 10 || x === 9 || x === 24) return '#8a8a92';
      if((y === 7 || y === 9) && x >= 11 && x <= 22 && ((x - 11) % 4 !== 3) && hash(x * 7 + y) > .25) return '#c82626'; if(y === 8 && x >= 11 && x <= 22 && (x - 11) % 4 !== 3) return '#e04040'; return '#e8e8ec'; }
    if(y === 11 && x >= 14 && x <= 19) return '#f4fff8'; if(y === 12 && x >= 14 && x <= 19) return '#5a6a66';
    if(x === 0) return CON.K;
    let c = x < 2 ? CON.L : CON.M; if(hash(x * 1.7 + 3) > .55 && y < 9 + hash(x * 2.2) * 22) c = '#3c3a44';      // rain stains under the roof lip
    if(x % 6 === 2 && y % 7 === 4) c = CON.D;                                     // form-tie holes
    if(y === 32) c = CON.D; return c; });
  // ash-bag collection point: a heap of yellow 克灰袋 by a small sign 降灰指定置場
  const BAGS = [[9, 13], [16, 13], [23, 13], [30, 13], [12.5, 7], [19.5, 7], [26.5, 7], [16, 1.5]];
  const bagsSpr = () => grid('bags', 37, 21, (x, y) => {
    if(x >= 1 && x <= 2 && y >= 6) return x === 1 ? '#7a7a84' : '#3a3a42';
    if(y <= 6 && x <= 12){ if(y === 0 || y === 6 || x === 0 || x === 12) return '#1e7a46'; return (y === 2 || y === 4) && x >= 2 && x <= 10 && x % 2 === 0 ? '#1e5a3a' : '#e8e8e0'; }
    for(let i = BAGS.length - 1; i >= 0; i--){ const [bx, by] = BAGS[i], dx = x + .5 - bx - 3.5, dy = y + .5 - by - 3.5; if(Math.abs(dx) > 3.6 || Math.abs(dy) > 3.6 || dx * dx + dy * dy > 15.5) continue;
      if(dy < -2.6) return hash(x + i) > .4 ? ASH.L : '#e8d880'; if(Math.abs(dy) < .7) return '#c82424'; if(dx + dy > 2.6) return '#8a6a0a'; if(dx + dy < -2.4) return '#fff07a'; return dx > 1.6 ? '#c8a014' : '#f0c828'; }
    if(y === 20 && x >= 5 && x <= 35) return ASH.M; return null; });
  // the buried torii of Kurokami: kasagi with upturned ends, shimaki, nuki, post stubs, in a mound of ash
  const toriiSpr = dir => { const key = 'torii' + (dir > 0 ? 'R' : 'L'); return grid(key, 64, 30, (x, y) => { const d = Math.abs(x + .5 - 32), lit = (x + .5 - 32) * dir > 0;
    const mound = 21 - Math.max(0, 7 * (1 - (d / 31) ** 2)) + (hash(Math.floor(x / 3)) - .5) * 1.2;
    if(y >= mound && d < 31.5){ if(y < mound + 1) return lit ? ASH.H : ASH.L; if(y < mound + 2) return ASH.M; return dz(x, y) && y < mound + 4 ? ASH.M : ASH.D; }
    const lift = Math.max(0, d - 24) * .45, top = 2 - lift;
    if(d < 31 && y >= Math.round(top) && y < Math.round(top) + 3){ if(y === Math.round(top)) return lit && d > 22 ? RIMW2 : STONE.H; return y === Math.round(top) + 2 ? STONE.D : STONE.M; }
    if(d < 28 && y >= Math.round(top) + 3 && y <= 6) return y === 6 ? STONE.K : STONE.D;
    if(d < 2 && y >= 7 && y <= 10) return d < 1 ? STONE.M : STONE.D;
    if(d < 25 && y >= 11 && y <= 13) return y === 11 ? STONE.L : y === 13 ? STONE.K : STONE.M;
    const pd = Math.abs(d - 16); if(pd < 2.6 && y > 6){ const pc = 32 + Math.sign(x + .5 - 32) * 16, lx = (x + .5 - pc) * dir; if(lx > 1.6) return RIMW; return lx > 0 ? STONE.L : lx > -1.6 ? STONE.M : STONE.D; }
    return null; }); };
  // a road sign: yellow diamond with a volcano and falling ash (火山灰注意)
  const signSpr = () => grid('sign', 15, 28, (x, y) => { const d = Math.abs(x - 7) + Math.abs(y - 7);
    if(y <= 14){ if(d > 7.2) return null; if(d > 6.2) return '#1a1410';
      if(y >= 7 && y <= 10 && Math.abs(x - 7) <= (y - 5) * 1.1 && Math.abs(x - 7) >= (y - 7) * .4 - 1) return '#1a1410';
      if(y >= 3 && y <= 6 && (x === 6 || x === 8) && (x + y) % 2) return '#c82424'; if(y >= 3 && y <= 5 && x === 7) return '#c82424';
      return y < 4 ? '#ffd050' : '#f0b020'; }
    return x >= 6 && x <= 8 && y > 14 ? (x === 6 ? '#8a909a' : '#4a505a') : null; });

  // text plates rendered once with DotGothic16 (16 px native grid) when the font is ready
  function plate(key, text, bg, fg, w){ const k = P + 'plate_' + key; if(SPR[k]) return SPR[k]; if(!document.fonts || !document.fonts.check('16px DotGothic16')) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = 20; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, 20); g.fillStyle = fg; g.font = '16px DotGothic16'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, w / 2, 11); return SPR[k] = c; }

  // ---------------------------------------------------------------- the volcano (built in canvas pixels for the current width)
  let V = null;
  // [centre, half-width, height] of the domes that make the massif: the broad base, Kitadake (highest), Nakadake, Minamidake (the active
  // crater), the low Hikinohira shoulder on the north flank and a lower bench to the south
  const DOMES = [[.37, .085, .2], [.49, .075, .19], [.615, .08, .2], [.2, .07, .06], [.8, .06, .05]];
  function volcano(){ const cw = Math.ceil(W / PX), vw = Math.round(cw * .6), vh = Math.round((H / 2 + 2 - H * .27) / PX); if(V && V.vw === vw && V.vh === vh) return V;
    const top = new Float32Array(vw), CXu = .615;
    for(let x = 0; x < vw; x++){ const u = (x + .5) / vw; let h = .7 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u - .49) / .51, 2.2)), .9);
      for(const [c, w, ht] of DOMES){ const d = (u - c) / w; if(d * d < 1) h += ht * (1 - d * d) * (1 - d * d); }
      h += (vn(u * 60) - .5) * .03 + (hash(Math.floor(u * vw / 2)) - .5) * .012;
      const cd = Math.abs(u - CXu); if(cd < .025) h -= .06 * (1 - cd / .025) ** .6;
      top[x] = Math.max(0, Math.round(vh - Math.min(1, h * .95) * vh)); }
    const CX = Math.round(CXu * vw); let CY = top[CX]; for(let x = CX - 3; x <= CX + 3; x++) CY = Math.min(CY, top[x]);
    // lava rivers: walk downhill from the crater rim, always on the surface
    const riv = []; const mk = (x0, dr, len, seed) => { const pts = []; let x = x0; for(let y = top[x0] + 1, j = 0; j < len; y++, j++){ if(hash(seed * 13 + j * 3.7) < .55) x += dr; if(x < 2 || x >= vw - 2) break; if(y < top[x] + 1) y = top[x] + 1; pts.push([x, y]); } return pts; };
    riv.push(mk(CX + 4, 1, Math.round(vh * .55), 1), mk(CX + 8, 1, Math.round(vh * .34), 2), mk(CX - 4, -1, Math.round(vh * .48), 3), mk(CX, 0, Math.round(vh * .26), 4), mk(CX - 8, -1, Math.round(vh * .3), 5));
    { const b = riv[0][Math.round(riv[0].length * .4)]; if(b){ const pts = []; let x = b[0]; for(let j = 0, y = b[1]; j < vh * .22; j++, y++){ if(hash(j * 5.3 + 9) < .45) x -= 1; if(y < top[x] + 1) y = top[x] + 1; pts.push([x, y]); } riv.push(pts); } }
    const sx = vw * .45, sy = top[Math.round(vw * .39)];
    const mkSpr = dir => { const c = document.createElement('canvas'); c.width = vw; c.height = vh; const k = c.getContext('2d'), img = k.createImageData(vw, vh), d = img.data;
      const put = (x, y, col) => { const [r, g, b] = rgb(col), i = (y * vw + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; };
      for(let x = 0; x < vw; x++){ const t0 = top[x], slope = (top[Math.min(vw - 1, x + 1)] - top[Math.max(0, x - 1)]) * dir, faces = slope > 0;
        // nearest dome: its own lit and shaded side, so the massif reads as several lumps, not one cone
        const u = x / vw; let dc = .5, bd = 9; for(const [c] of DOMES){ const dd = Math.abs(u - c); if(dd < bd){ bd = dd; dc = c; } } const side = (u - dc) * dir > 0 || (x - sx) * dir > vw * .2;
        for(let y = t0; y < vh; y++){ const dd = y - t0, cdx = (x - CX) / (vw * .05), cdy = (y - CY) / (vh * .22), warm = 1 - Math.sqrt(cdx * cdx + cdy * cdy), lowF = clamp((y - sy) / (vh - sy), 0, 1);
          let col;
          if(dd < 1){ const cd = Math.abs(x - CX); col = cd < vw * .02 ? '#ff9a3a' : cd < vw * .05 ? '#b8441c' : faces ? '#766c90' : '#30283c'; }
          else if(dd < 2 && faces && Math.abs(x - CX) > vw * .05) col = '#40354e';
          else {
            col = lowF < .4 ? (side ? '#1e1826' : '#151018') : lowF < .72 ? (side ? '#18131e' : '#110d14') : '#0e0a10';
            const r = (x - sx) / (y - sy + 8) * 8 + vn(y * .09 + x * .013) * 1.4, wi = Math.floor(r), f = r - wi, g = 1 - lowF * 1.4;
            if(g > 0 && hash(wi * 7.3) > .45){ const lit = dir > 0 ? f > .6 : f < .4; if(lit && hash(x * .1 + y * 3.1) < g + .3) col = lowF < .4 ? '#2c2236' : '#211a2a'; else if(f > .45 && f < .55) col = '#0a080c'; }
            if(warm > 0){ if(warm > .55) col = col === '#0a080c' ? '#3a1612' : dz(x, y) ? '#8a3216' : '#5a2014'; else if(col !== '#0a080c' && (dz(x, y) || warm > .25)) col = warm > .25 ? '#4a1c16' : '#2e1418'; }
            if(hash(x * 3.3 + y * 7.9) > .99 && lowF < .55) col = warm > -.3 ? '#ff7a2a' : '#5a2418';            // spatter, cooling bombs
            // old lava flows on the lower flanks: lumpy tongues, each lump lit on top, black in its folds
            if(lowF > .35 && y < vh - 6){ const fl = vn(x * .07 + vn(y * .12 + 4) * 2.5), cell = hash(Math.floor(x / 3) * 7.1 + Math.floor((y + (Math.floor(x / 3) & 1)) / 2) * 3.3);
              if(fl > .55){ col = cell > .7 && ((y + (Math.floor(x / 3) & 1)) & 1) === 0 ? '#2a2230' : cell < .2 ? '#08060a' : '#120e15'; } else if(fl > .5) col = '#08060a'; }
            if(y >= vh - 6){ col = dz(x, y) ? '#1e1218' : '#140d12'; if(y >= vh - 4 && y <= vh - 2 && hash(x * 1.9 + y * 31) > .965) col = hash(x * 5 + y) > .6 ? '#fff0c0' : '#ffb860'; }   // village lights at the foot
          }
          put(x, y, col); } }
      k.putImageData(img, 0, 0); return c; };
    V = { vw, vh, top, CX, CY, riv, spr:{ 1:mkSpr(1), '-1':mkSpr(-1) } }; return V; }

  // the plume is built from billows: big lumpy spheres in 4-step Bayer-dithered shading. Cool grey-violet lit from the moon side (upper
  // left), the underside hot orange-red from the vent; heat 0..3 fades that underglow as a billow climbs away from the crater.
  const BCOOL = ['#3e3450', '#584d6c', '#7e7398', '#b0a6cc'], BWARM = ['#6a2418', '#a83c18', '#e8601e', '#ffb050'], BHEAT = [1, .85, .62, .38], BRIM = '#ddd4f0';
  const bilR = si => 13 + si * 3.7;
  const billow = (si, he) => { const key = 'bil' + si + '_' + he; if(SPR[P + key]) return SPR[P + key]; const r = bilR(si), w = Math.ceil(r * 2.3) + 2, cxb = w / 2, mult = BHEAT[he];
    return grid(key, w, w, (x, y) => { const dx = x + .5 - cxb, dy = y + .5 - cxb, a = Math.atan2(dy, dx), rr = r * (1 + .08 * Math.sin(5 * a + si * 1.3) + .05 * Math.sin(9 * a + si * 2.1)), d = Math.sqrt(dx * dx + dy * dy);
      if(d > rr) return null; const nx = dx / rr, ny = dy / rr, nz = Math.sqrt(Math.max(0, 1 - (d / rr) ** 2)), b = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16;
      const out = (px, py) => { const ex = px + .5 - cxb, ey = py + .5 - cxb, ea = Math.atan2(ey, ex); return Math.sqrt(ex * ex + ey * ey) > r * (1 + .08 * Math.sin(5 * ea + si * 1.3) + .05 * Math.sin(9 * ea + si * 2.1)); };
      if(nx + ny < -.35 && (out(x - 1, y) || out(x, y - 1) || (si > 4 && (out(x - 2, y) || out(x, y - 2))))) return BRIM;     // the moonlit rim
      // dither only in a narrow band at each tone edge, so big billows read as flat shapes with crisp steps
      const wv = clamp(.9 * ny + .3 * nz - .2, 0, 1) * mult * 4 + (b - .5) * .4; if(wv >= 1.15) return BWARM[Math.min(3, Math.floor(wv) - 1)];
      const cv = clamp(-.55 * nx - .62 * ny + .45 * nz, 0, 1) * 3.2 + .5 + (b - .5) * .4; return BCOOL[clamp(Math.floor(cv), 0, 3)]; }); };
  // volcanic lightning: branching bolts, white core, violet fringe
  const boltSpr = v => { const key = 'bolt' + v; if(SPR[P + key]) return SPR[P + key]; const w = 24, h = 32, core = new Set(), fr = new Set(); let sd = v * 977 + 5; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const walk = (x, y, len, bias) => { for(let j = 0; j < len && y < h; j++){ core.add(x + ',' + y); fr.add((x - 1) + ',' + y); fr.add((x + 1) + ',' + y); y++; const r = R(); x += r < .3 + bias ? -1 : r > .7 + bias ? 1 : 0; x = Math.max(1, Math.min(w - 2, x));
        if(len > 14 && R() < .09) walk(x, y, 5 + (R() * 9 | 0), R() < .5 ? -.2 : .2); } };
    walk(12, 0, h, 0);
    return grid(key, w, h, (x, y) => core.has(x + ',' + y) ? (y < 8 ? '#ffffff' : '#f4eeff') : fr.has(x + ',' + y) ? '#9a86ff' : null); };

  // ---------------------------------------------------------------- Kagoshima across the bay: a far strip of hills and city lights, and its reflection
  const SW = 720, SH = 18; let CITY = null;
  function city(){ if(CITY) return CITY; const c = document.createElement('canvas'); c.width = SW; c.height = SH; const k = c.getContext('2d'), blink = [], lights = [];
    const px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); };
    const L = n => { const r = hash(n); return r > .9 ? '#a8ecff' : r > .62 ? '#fff0d0' : r > .58 ? '#7aff9a' : '#ffb860'; };
    // hills behind the city (Shiroyama and the ridges), with a cool crest line
    for(let x = 0; x < SW; x++){ const hgt = Math.round(3 + 6 * vn(x * .022 + 3) + 4 * vn(x * .07 + 11) * vn(x * .011)); for(let y = SH - hgt - 2; y < SH; y++) px(x, y, y === SH - hgt - 2 ? '#2a2438' : '#120e1a');
      if(hash(x * 3.7) > .975) px(x, SH - hgt + 1, '#ffb860'); }
    // the city along the shore: blocks, towers, lit windows, a waterfront line of lamps
    let x = 0, n = 0; while(x < SW){ n++; const dense = vn(x * .012 + 5), bw = 2 + (hash(n * 3) * 6 | 0), bh = Math.round((1 + hash(n * 7) * 3.5) * (.4 + dense)) + (hash(n * 11) > .94 ? 4 : 0);
      if(dense > .25){ for(let yy = SH - 2 - bh; yy < SH - 1; yy++) for(let xx = x; xx < x + bw && xx < SW; xx++){ px(xx, yy, '#0e0b15'); if(yy < SH - 2 && hash(xx * 1.7 + yy * 9.3) < .08 + dense * .16){ const col = L(xx * 3 + yy * 7); px(xx, yy, col); lights.push([xx, yy, col]); } }
        if(bh > 6){ blink.push([x + (bw >> 1), SH - 3 - bh, hash(n) * 6]); } }
      x += bw + (dense < .4 ? 3 + (hash(n * 5) * 6 | 0) : hash(n * 5) > .7 ? 1 : 0); }
    // two radio masts and the port cranes
    for(const mx of [140, 470]){ for(let yy = SH - 13; yy < SH - 1; yy++) px(mx, yy, '#0e0b15'); blink.push([mx, SH - 14, mx * .1]); }
    for(const mx of [300, 610]){ for(let yy = SH - 9; yy < SH - 1; yy++){ px(mx, yy, '#0e0b15'); px(mx + 4, yy, '#0e0b15'); } for(let xx = mx - 3; xx < mx + 9; xx++) px(xx, SH - 9, '#0e0b15'); blink.push([mx + 2, SH - 10, mx * .07]); }
    for(let xx = 0; xx < SW; xx++){ px(xx, SH - 1, '#07060c'); if(hash(xx * 1.31) < .3 && vn(xx * .012 + 5) > .2){ const col = hash(xx * 7.7) > .3 ? '#ffc070' : '#fff4d8'; px(xx, SH - 2, col); lights.push([xx, SH - 2, col]); } }
    c.blink = blink; CITY = c;
    // the reflection: every waterfront light hangs a column of broken dashes into the bay; steady, fixed to the strip
    const RH = 14, r = document.createElement('canvas'); r.width = SW; r.height = RH; const rk = r.getContext('2d');
    for(const [lx, ly, col] of lights){ if(ly < SH - 6) continue; const len = (ly === SH - 2 ? RH : RH * .55) * (.5 + hash(lx * 3.1) * .5);
      for(let j = 1; j < len; j++){ if(hash(lx * 5.3 + j * 1.7) < .38) continue; rk.globalAlpha = (1 - j / RH) * (ly === SH - 2 ? .75 : .4); rk.fillStyle = col; rk.fillRect(lx + (j % 3 === 2 ? (hash(lx + j) > .5 ? 1 : -1) : 0), j - 1, 1, 1); } }
    CITY.refl = r; return CITY; }
  const ferrySpr = () => grid('ferry', 16, 6, (x, y) => { if(y === 0) return x >= 6 && x <= 8 ? '#2a2632' : null; if(y === 1) return x >= 4 && x <= 11 ? (x % 2 ? '#ffe0a0' : '#d8d4c8') : null;
    if(y === 2) return x >= 2 && x <= 13 ? (x % 3 === 0 ? '#ffd890' : '#c8c4b8') : null; if(y === 3) return x >= 1 && x <= 14 ? '#2a3a6a' : null; if(y === 4) return x >= 2 && x <= 13 ? '#141220' : null; return null; });

  // ---------------------------------------------------------------- eruption timeline (time-driven spectacle on the horizon)
  const TCYC = 17000;
  let VX = 600, CRX = 0, CRY = 0, ERUPT = 0, BOLT = null;
  const bombsFor = c => { const out = []; for(let i = 0; i < 30; i++){ const a = -Math.PI / 2 + (H0(c * 31 + i) - .5) * 1.5, v = 70 + H0(c * 17 + i * 3) * 120; out.push({ t0:H0(c * 7 + i * 5) * 700, vx:Math.cos(a) * v, vy:Math.sin(a) * v }); } return out; };
  let BC = -1, BOMBS = [];
  const CRO = { x:0, y:0, e:0 };

  // ---------------------------------------------------------------- the backdrop
  function backdrop(o){ const { hz, sk, now, t, moonX, moonY } = o; if(sk.low !== fogLow){ fogLow = sk.low; FC.clear(); } const v = volcano(), cty = city(), dawn = clamp((t - .7) / .3, 0, 1), ga = cx.globalAlpha;
    // the volcano stands to the right of the moon's path (the moon is the clock), drifting with the moon (both far enough to
    // swing together, at the moon tier: it keeps its place beside the clock while the shore and near ridge sweep past at far and near);
    // nothing of the eruption is painted over the moon's disc (a clip with the disc cut out), so the clock is never hidden
    const vx = W * .56 + (moonX - W * .5); VX = vx;
    const mr = Math.min(W, H) * .1, noMoon = () => { cx.save(); cx.beginPath(); cx.rect(-W, -H, W * 3, H * 3); cx.arc(moonX, moonY, mr, 0, 6.283); cx.clip('evenodd'); };
    const vl = snap(vx - v.vw * PX / 2), vt = snap(hz - v.vh * PX) + PX, crx = vl + v.CX * PX, cry = vt + v.CY * PX; CRX = crx; CRY = cry;
    // the blast cycle: e = 0..1, sudden rise and slow decay; calm and steady under reduced motion
    const c = Math.floor(now / TCYC), tq = now - c * TCYC, e = reduce ? .35 + .1 * Math.sin(now / 5000) : tq < 260 ? tq / 260 : Math.exp(-(tq - 260) / 2600); ERUPT = e;
    const night = 1 - dawn * .6;
    // the plume's path: straight up out of the crater, bending downwind (right, away from the moon's path) as it climbs, with a slow sway
    const rise = cry - H * .05, bend = W * .2, path = p => [crx + bend * Math.pow(p, 1.5) + Math.sin(p * 5 + now / 9000) * W * .012 * p, cry - (1 - Math.pow(1 - Math.min(1, p / .7), 1.7)) * rise];
    // 1. the sky over the volcano glows, strongest under the plume: stepped additive ellipses
    noMoon(); { const [gx0, gy0] = path(.25), gx = snap(gx0), gy = snap(gy0); cx.globalCompositeOperation = 'lighter';
      for(const [rx, ry, a] of [[W * .34, H * .3, .045], [W * .2, H * .18, .055], [W * .1, H * .09, .08]]){ cx.fillStyle = `rgba(210,70,30,${a * night * (.55 + .6 * e) * ga})`; cx.beginPath(); cx.ellipse(gx, gy, snap(rx), snap(ry), 0, 0, 6.283); cx.fill(); }
      cx.globalCompositeOperation = 'source-over'; } cx.restore();
    // 2. Kagoshima across the bay: the far strip sits on the far shore, the bay between it and the near land
    const WB = snap(H * .042), shore = hz - WB, coff = skyPar('far'), sw = SW * PX, o0 = ((coff % sw) + sw) % sw;
    cx.fillStyle = mixc('#0c0a12', sk.low, .25); cx.fillRect(0, shore, W, hz - shore + PX * 2);
    cx.fillStyle = pat(mixc('#2a1a24', sk.low, .3), .25); cx.fillRect(0, shore + PX, W, snap(WB * .4));
    cx.fillStyle = mixc('#2a2234', sk.low, .3); cx.fillRect(0, shore, W, PX);
    for(let x0 = -o0; x0 < W; x0 += sw){ cx.drawImage(cty, 0, 0, SW, SH, x0, shore - SH * PX + PX, sw, SH * PX); cx.drawImage(cty.refl, 0, 0, SW, 14, x0, shore + PX, sw, Math.min(14 * PX, WB));
      for(const [bx, by, s] of cty.blink){ if(reduce || Math.sin(now / 700 + s) > .1){ cx.fillStyle = '#ff3a2a'; cx.fillRect(snap(x0 + bx * PX), shore - SH * PX + PX + by * PX, PX, PX); } }
      const fu = ((now / 140000) + .3) % 1, fx = snap(x0 + fu * sw), fy = snap(shore + WB * .35); if(fx > -60 && fx < W + 60){ blit(ferrySpr(), fx, fy, PX); cx.fillStyle = 'rgba(255,220,150,.35)'; cx.fillRect(fx - 4 * PX, fy + PX, 8 * PX, PX); cx.fillStyle = 'rgba(255,220,150,.18)'; cx.fillRect(fx - 2 * PX, fy + 3 * PX, 4 * PX, PX); } }
    // the bay mirrors the glowing sky and the moon
    { cx.fillStyle = `rgba(210,90,40,${.26 * night * (.5 + .6 * e)})`; for(let j = 0; j < 30; j++){ const xx = snap(crx - W * .1 + (H0(j * 3.3) - .5) * W * .6), yy = snap(shore + PX + H0(j * 7.1) * (WB - PX * 2)), ww = snap(PX * (2 + H0(j * 1.9) * 8)); cx.fillRect(xx, yy, ww, PX); }
      if(moonY < hz){ cx.fillStyle = 'rgba(240,232,210,.3)'; for(let j = 0; j < 7; j++){ const yy = shore + PX + j * PX * 2, ww = snap(PX * (6 - j * .6) * (.6 + H0(j * 5.5) * .6)); if(yy < hz) cx.fillRect(snap(moonX - ww / 2 + (H0(j) - .5) * PX * 4), yy, ww, PX); } } }
    noMoon();
    // 3. the ash curtain: ash raining out of the plume's downwind end onto the bay, in dithered streaks
    { const cur = new Path2D(), cur2 = new Path2D(), [xa] = path(.55), [xb, yb] = path(1), x0 = Math.min(xa, xb) - W * .05, x1 = Math.max(xa, xb) + W * .02, st = PX * 2;
      for(let x = snap(x0); x < x1; x += st){ const u = (x - x0) / (x1 - x0), wc = Math.round((x + skyOff * 60) / st); if(hash(wc * 1.7) < .28) continue;
        const ytop = snap(lerp(path(.55)[1], yb, u) + H * .05 + vn(wc * .3 + now / 7000) * H * .05), ybot = snap(shore - vn(wc * .21 + 3) * H * .04); if(ybot <= ytop) continue;
        const mid = snap(lerp(ytop, ybot, .45 + hash(wc) * .2)); cur.rect(x, ytop, st, mid - ytop); cur2.rect(x, mid, st, ybot - mid); }
      cx.fillStyle = '#2a2230'; cx.globalAlpha = ga * (.5 - dawn * .2); cx.fill(cur); cx.globalAlpha = ga * (.28 - dawn * .1); cx.fill(cur2); cx.globalAlpha = ga; }
    // 4. the plume: billows rising out of the crater, swelling as they climb, lit hot from beneath; world-fixed to the volcano
    { const N = 32, TP = reduce ? 160000 : 60000, L = [];
      for(let j = 0; j < N; j++){ const ph = now / TP + j / N, p = ph % 1, gen = Math.floor(ph); L.push([p, j, gen]); }
      L.sort((a, b) => a[0] - b[0]);
      // a dark body under the billows so the column never shows sky through it
      { const body = new Path2D(); for(let q = .02; q < .9; q += .03){ const [x, y] = path(q), hw = bilR(Math.min(9, q * 10)) * PX * (q > .55 ? 1.2 : .6); body.rect(snap(x - hw), snap(y - hw * .7), snap(hw * 2), snap(hw * 1.4)); }
        cx.globalAlpha = ga * (.95 - dawn * .3); cx.fillStyle = '#3a3048'; cx.fill(body); cx.globalAlpha = ga; }
      for(const [p, j, gen] of L){ const si = Math.min(9, Math.floor(p * 10 + H0(j * 1.3 + gen) * 1.2)), r = bilR(si), he = p < .1 + .14 * e ? 0 : p < .26 + .14 * e ? 1 : p < .5 ? 2 : 3, spr = billow(si, he);
        const [qx, qy] = path(p), lx = qx + (H0(j * 3.1 + gen * 7.7) - .5) * r * PX * 1.1, ly = qy + (H0(j * 5.3 + gen * 1.9) - .5) * r * PX * .5;
        const a = Math.min(1, p / .03) * clamp((1 - p) / .12, 0, 1); if(a <= 0) continue; cx.globalAlpha = ga * a * (1 - dawn * .3);
        cx.drawImage(spr, snap(lx - spr.width * PX / 2), snap(ly - spr.height * PX / 2), spr.width * PX, spr.height * PX);
        // the umbrella: high up the cloud spreads sideways, both ways from the column
        if(p > .55){ const sp = (p - .55) / .45, s2 = billow(Math.max(4, si - 1), he); for(const sd of [-1, 1]){ const ux = lx + sd * r * PX * (.9 + sp * 1.3), uy = ly + r * PX * .25 * sp; cx.drawImage(s2, snap(ux - s2.width * PX / 2), snap(uy - s2.height * PX / 2), s2.width * PX, s2.height * PX); } } }
      cx.globalAlpha = ga;
      // the vent lights the plume's root and underside
      glow(crx, cry - H * .05, PX * (16 + 16 * e), '#ff6a20', (.22 + .38 * e) * night);
      // volcanic lightning in the lower half of the plume during a blast; under reduced motion only a calm violet glow
      BOLT = null;
      if(!reduce){ for(let k = 0; k < 3; k++){ if(H0(c * 11 + k) < .25) continue; const tb = 350 + H0(c * 7 + k * 3) * 3200, dt = tq - tb;
          if((dt > 0 && dt < 80) || (dt > 140 && dt < 200)){ const [px0] = path(.12 + H0(c * 3 + k) * .12), bx = px0 + (H0(c * 5 + k) - .5) * W * .06, by = cry - H * (.04 + H0(c * 9 + k) * .06), spr = boltSpr((c * 3 + k) % 5);
            glow(bx, by - spr.height * PX * .5, PX * 70, '#b8a8ff', .4); glow(bx + PX * 20, by - spr.height * PX * 1.4, PX * 50, '#c8b8ff', .3); blit(spr, snap(bx), snap(by), PX); BOLT = [bx, by]; } } }
      else glow(path(.12)[0], cry - H * .08, PX * 18, '#7a6aca', .12); }
    // 5. the massif in front of the plume's root, its lava rivers and the crater
    const dir = moonX > vx ? 1 : -1;
    if(vl < W && vl + v.vw * PX > 0){
      cx.drawImage(v.spr[dir], vl, vt, v.vw * PX, v.vh * PX);
      if(dawn > 0){ cx.globalAlpha = ga * dawn * .35; cx.fillStyle = pat('#6a4a5a', .25); cx.fillRect(vl, vt, v.vw * PX, v.vh * PX - PX * 7); cx.globalAlpha = ga; }
      glow(crx, cry + PX, PX * (8 + 10 * e), '#ff6a20', (.45 + .4 * e) * night);
      // lava rivers: a hot core two pixels wide near the crater, dark crust at the edges, a slow bright pulse running down
      const ps = reduce ? 2600 : 800;
      for(let ri = 0; ri < v.riv.length; ri++){ const R = v.riv[ri], n = R.length;
        for(let j = 0; j < n; j++){ const [x, y] = R[j], f = j / n, wave = Math.sin(j * .3 - now / ps * 2 + ri * 1.7), hot = (1 - f) * .95 + .18 * wave + e * .3 * (1 - f), X = vl + x * PX, Y = vt + y * PX, wide = f < .55;
          cx.fillStyle = f < .8 ? '#3a0c08' : '#24080a'; cx.fillRect(X - PX, Y, PX, PX); cx.fillRect(X + (wide ? 2 : 1) * PX, Y, PX, PX);
          cx.fillStyle = hot > .95 ? '#fff0a0' : hot > .72 ? '#ffc048' : hot > .48 ? '#ff8028' : hot > .25 ? '#d8441a' : '#7a1c10'; cx.fillRect(X, Y, PX, PX);
          if(wide){ cx.fillStyle = hot > .8 ? '#ff9a30' : hot > .5 ? '#e05a1e' : '#9a2a12'; cx.fillRect(X + PX, Y, PX, PX); } }
        for(const fq of [.15, .5]){ const m = R[Math.floor(n * fq)]; if(m) glow(vl + m[0] * PX, vt + m[1] * PX, PX * (fq < .3 ? 10 : 7), '#ff5a1a', (fq < .3 ? .3 : .2) * night); } }
      // the crater lip: a ragged incandescent fringe
      const fr = Math.floor(now / (reduce ? 900 : 110)); for(let i = -6; i <= 6; i++){ const hgt = Math.floor(H0(fr * 13 + i * 7) * (2 + 4 * e) * (1 - Math.abs(i) / 7)); for(let j = 0; j <= hgt; j++){ cx.fillStyle = j === 0 ? '#fff0a0' : j < 2 ? '#ffa040' : '#d8501e'; cx.fillRect(crx + i * PX, cry - j * PX, PX, PX); } } }
    // bombs: incandescent blocks thrown out at each blast, arcing onto the flanks with a short trail, cooling where they land
    if(!reduce && vl < W && vl + v.vw * PX > 0){ if(BC !== c){ BC = c; BOMBS = bombsFor(c); }
      const g = 240 * PX / 3, kv = PX / 3, at = s2 => [crx + b0.vx * s2 * kv, cry + b0.vy * s2 * kv + .5 * g * s2 * s2]; let b0 = null;
      for(const b of BOMBS){ const dt = (tq - b.t0) / 1000; if(dt < 0 || dt > 6) continue; b0 = b;
        if(b.tl === undefined){ b.tl = 0; for(let s2 = .05; s2 < 6; s2 += .04){ const [xx, yy] = at(s2), ix = Math.round((xx - vl) / PX); if(ix < 0 || ix >= v.vw){ b.tl = -1; break; } if(yy > vt + v.top[ix] * PX){ b.tl = s2; b.lx = ix; break; } } }
        if(b.tl < 0){ if(dt < 2){ const [xx, yy] = at(dt); cx.fillStyle = '#ffb040'; cx.fillRect(snap(xx), snap(yy), PX * 2, PX * 2); } continue; }
        if(dt < b.tl){ const [xx, yy] = at(dt), [px2, py2] = at(Math.max(0, dt - .05)), [px3, py3] = at(Math.max(0, dt - .1)); cx.fillStyle = '#8a2a12'; cx.fillRect(snap(px3), snap(py3), PX, PX); cx.fillStyle = '#ff7a2a'; cx.fillRect(snap(px2), snap(py2), PX, PX); cx.fillStyle = '#fff0a0'; cx.fillRect(snap(xx), snap(yy), PX * 2, PX * 2); }
        else if(dt < b.tl + 2.5){ const k2 = (dt - b.tl) / 2.5, xx = vl + b.lx * PX, yy = vt + v.top[b.lx] * PX; cx.fillStyle = k2 < .3 ? '#ffb040' : k2 < .65 ? '#d8501e' : '#6a1a10'; cx.fillRect(xx, yy, PX, PX); } } }
    cx.restore();
    // 6. the near lava field: blocky black mounds with ash-pale tops, gaps that show the bay; a few black pines on them
    nearRidge(hz, vx, now);
    // 7. ash haze along the horizon, lit warm on the volcano side
    cx.fillStyle = pat(mixc('#4a3a40', sk.low, .3), .125); cx.fillRect(0, snap(hz - H * .022), W, snap(H * .022) + PX * 2);
    cx.globalAlpha = ga * .6 * night; cx.fillStyle = pat('#8a3a1c', .125); cx.fillRect(snap(vx - W * .3), snap(hz - H * .014), snap(W * .6), snap(H * .014) + PX * 2); cx.globalAlpha = ga;
    return false; }
  let YS = new Float32Array(0);
  function nearRidge(hz, vx, now){ const n = Math.ceil(W / PX) + 3, off = skyPar('near'); if(YS.length < n) YS = new Float32Array(n);
    for(let i = 0; i < n; i++){ const wx = (i - 1) * PX + off, blk = Math.floor(wx / (PX * 3)), m = vn(wx * .0019 + 7) * .7 + vn(wx * .006 + 2) * .3;
      const hgt = m < .42 ? 0 : (m - .42) * 2.2 * (H * .034) * (.55 + .45 * hash(blk * 1.7)) + (hash(blk * 3.1) > .8 ? PX * 2 : 0); YS[i] = snap(hz + PX - hgt); }
    const body = new Path2D(), cap = new Path2D(), rim = new Path2D();
    for(let i = 1; i < n - 1; i++){ const x = (i - 1) * PX, y = YS[i]; if(y >= hz + PX) continue; body.rect(x, y, PX, hz + PX * 2 - y);
      if(YS[i - 1] > y || hash(Math.floor((x + off) / PX) * .37) > .45) cap.rect(x, y, PX, PX);
      const fd = vx > x ? 1 : -1; if(YS[i + fd] > y && Math.abs(x - vx) < W * .7) rim.rect(x, y + PX, PX, Math.min(PX * 3, YS[i + fd] - y)); }
    cx.fillStyle = '#08060a'; cx.fill(body); cx.fillStyle = '#3e383e'; cx.fill(cap); cx.fillStyle = '#5a2216'; cx.fill(rim);
    // pines standing on the mounds
    const step = PX * 37, o0 = ((off % step) + step) % step;
    for(let x = -o0; x < W + step; x += step){ const wi = Math.round((x + off) / step); if(hash(wi * 2.3) < .5) continue; const xx = snap(x + hash(wi) * step * .5), i = Math.round(xx / PX) + 1; if(i < 1 || i >= n || YS[i] >= hz) continue;
      const y = YS[i], h = PX * (4 + (hash(wi * 5) * 4 | 0)); cx.fillStyle = '#08060a'; cx.fillRect(xx, y - h, PX, h); cx.fillRect(xx - PX * 2, y - h, PX * 5, PX); cx.fillRect(xx - PX, y - h - PX, PX * 3, PX); cx.fillRect(xx - PX * 3, y - h + PX * 2, PX * 3, PX);
      cx.fillStyle = '#4a4448'; cx.fillRect(xx - PX * 2, y - h - PX, PX, PX); cx.fillRect(xx, y - h - PX * 2, PX * 2, PX); }
  }

  // ---------------------------------------------------------------- road placement
  const WALLX = 1.15;
  // landmarks along each 600-segment stretch: [offset, type, side]
  const MARKS = [[60, 'shelter', 1], [160, 'bags', -1], [250, 'torii', -1], [360, 'shelter', -1], [470, 'bags', 1], [540, 'sign', 1]];
  const markAt = i => { const m = ((i % 600) + 600) % 600; for(const k of MARKS) if(k[0] === m) return k; return null; };
  const OWN = s => { const K = landK(); return s.land === K ? (s.mix === undefined ? 1 : s.mix) : s.prev === K ? 1 - s.mix : 0; };
  // the wall's height: a slow world-anchored swell, lowered smoothly to a kerb at every shelter, bag point and the torii, ramped in at the border
  function wallH(i, side, own){ let h = .19 + .08 * vn(i * .021 + (side > 0 ? 17 : 3));
    for(let d = -10; d <= 10; d++){ const m = markAt(i + d); if(!m || m[2] !== side || m[1] === 'sign') continue; const g = sm((Math.abs(d) - 3) / 6); h = Math.min(h, .05 + (h - .05) * g); }
    return h * sm(own) * lavaF(i); }
  /* The lava leap (setpiece/jump.js 'LAVA LEAP', research/sundown-craft/jumpsides.md). o = segment - plan.b0: the ramp is 0..JNL-1, the
     flow JNL..JNL+JG-1 (the jump paints the molten crust across the view there), the far leaf after. The wall, the field and its life carry
     on beside the ramp and the landing. A real flow across a walled road buries the wall: here the wall steps down into the flow over JSTEP
     segments (the same smooth step it takes at a shelter) and is gone under the crust, a black levee of clinker lies along each bank, lit
     from the melt, and nothing else stands in the flow but the clinker boulders it carries. */
  const JNL = 22, JG = 22, JSTEP = 6;
  const jumpO = j => { const t = segs[j], p = t && t.spjP; return p && p.kind === 'bridge' ? j - p.b0 : null; };
  const inFlow = o => o !== null && o >= JNL && o < JNL + JG;
  function lavaF(j){ const o = jumpO(j); if(o === null || o < JNL - JSTEP || o >= JNL + JG + JSTEP) return 1; if(inFlow(o)) return 0;
    return sm((o < JNL ? JNL - o - 1 : o - JNL - JG) / JSTEP); }
  let lastDone = -1;
  function addWall(j){ const s = segs[j]; if(!s || s.skW) return; const own = OWN(s); if(own <= 0) return;
    s.skW = { '-1':wallH(j, -1, own), '1':wallH(j, 1, own) }; s.sprites.push({ env:'sakurajima', type:'wall', x:-WALLX, s, k:j }, { env:'sakurajima', type:'wall', x:WALLX, s, k:j }); }
  function place(i, s){ if(i <= lastDone) lastDone = i - 1;
    // walls on every segment of this road, including the border segments that another road's file furnished
    for(let j = Math.max(lastDone + 1, i - 120); j < i; j++) addWall(j);
    const sp = s.sprites, mk = markAt(i);
    const jo = jumpO(i), flow = inFlow(jo), runIn = b => { for(let j = b; j < b + SH_LEN; j++) if(inFlow(jumpO(j))) return true; return false; };
    for(const side of [-1, 1]){
      let near = false; for(let d = -8; d <= 8; d++){ const m = markAt(i + d); if(m && m[2] === side){ near = true; break; } }
      // lava blocks and pines out on the field (drawn before the wall, which stands in front of them)
      if(!near && hash(i * 3.1 + side) < .32) sp.push({ env:'sakurajima', type:'block', x:side * (1.6 + Math.pow(hash(i * 1.3 + side), 1.4) * 5), v:(hash(i * 7.7 + side) * 6) | 0, sz:.25 + hash(i * 2.9 + side) * .35, k:i });
      if(!near && hash(i * 5.7 + side * 3) < .18) sp.push({ env:'sakurajima', type:'block', x:side * (1.5 + hash(i * 4.1 + side) * 1.2), v:(hash(i * 9.1 + side) * 6) | 0, sz:.25 + hash(i * 6.3) * .3, k:i });
      if(hash(i * 2.3 + side * 5) < .07 && !flow) sp.push({ env:'sakurajima', type:'pine', x:side * (2.6 + hash(i * 8.3 + side) * 5), v:(hash(i * 1.1 + side) * 2) | 0, sz:.8 + hash(i * 3.9 + side) * .5, k:i });
    }
    // the shelters are projected runs of SH_LEN segments centred on their mark (one sprite per segment, pushed before the wall)
    for(let d = 0; d < SH_LEN; d++){ const m = markAt(i - d + 2); if(m && m[1] === 'shelter' && !runIn(i - d)) sp.push({ env:'sakurajima', type:'shel', side:m[2], x:m[2] * SH_X, xo:m[2] * SH_X, b0:i - d, len:SH_LEN, k:i }); }
    if(mk && mk[1] !== 'shelter' && !flow) sp.push({ env:'sakurajima', type:mk[1], x:mk[2] * (mk[1] === 'shelter' ? 1.95 : mk[1] === 'bags' ? 1.42 : mk[1] === 'torii' ? 2.15 : 1.3), k:i });
    if(i % 22 === 0 && !flow){ const side = (i / 22) % 2 ? 1 : -1; sp.push({ env:'sakurajima', type:'lamp', x:side * 1.26, k:i }); }
    if(jo === JNL || jo === JNL + JG - 1) for(const side of [-1, 1]) sp.push({ env:'sakurajima', type:'levee', x:side * 1.02, s, far:jo !== JNL, k:i });   // the flow's banks
    addWall(i); lastDone = i;
    s.skLit = 0; }
  function lit(i, s){ const d = Math.min(i % 22, 22 - i % 22), lamp = Math.max(0, 1 - d / 3.2) * .85; let sh = 0;
    for(let dd = -3; dd <= 3; dd++){ const m = markAt(i + dd); if(m && m[1] === 'shelter') sh = Math.max(sh, (1 - Math.abs(dd) / 4) * .6); }
    return Math.max(lamp, sh); }

  // ---------------------------------------------------------------- drawing the road-side
  const FACE = ['#141015', '#18131a', '#120e13', '#1a151a'];
  const WSPAN = f => { f = fogPx(f); return f < .03 ? 1 : f < .08 ? 2 : f < .2 ? 4 : f < .4 ? 8 : 16; };   // tiers by screen size (fogPx: the fog the old 260-segment draw distance gave here)
  // (a merged far slice never spans a stretch where the wall is buried (a lava leap's flow): it stops at the first buried segment, and the
  // first standing segment after one always draws, so the wall can't bridge the flow far away nor start late beyond it)
  const wUp = (j, side) => { const t = segs[j]; return !!(t && t.skW && t.skW[side] >= .005); };
  // (each segment's span from its own distance, and a slice runs on to the next start, as env/pass.js's cliff does: running to the start's own
  // span left a hole of up to several segments wherever the tiers changed, which slid along with the camera, so far walls blinked; 2026-11-24)
  const wSpan = (j, b0) => WSPAN(clamp(Math.pow((j - b0) / DRAW_N, 1.6), 0, 1));
  function drawWall(sp, x, y, uw, fog, now){ const side = Math.sign(sp.x), k = sp.k, b0 = k - Math.round(DRAW_N * Math.pow(fog, 1 / 1.6)); let n; if(k % wSpan(k, b0) && wUp(k - 1, side)) return; const s = sp.s;
    { let e = 1; while(e < 16 && (k + e) % wSpan(k + e, b0) && wUp(k + e, side)) e++; n = e; }
    const t = segs[s.index + n - 1] || s, nx = segs[s.index + n], p = (t.p2.screen.w ? t : s).p2.screen; if(!p.w) return;
    const x2 = p.x + sp.x * p.w, y2 = p.y, u2 = p.w, h1 = s.skW[side], h2 = nx && nx.skW ? nx.skW[side] : h1; if(h1 < .005 && h2 < .005) return;
    const H1 = uw * h1, H2 = u2 * h2, o1 = side * uw * .12, o2 = side * u2 * .12;
    const P = f => [x, y - H1 * f, x2, y2 - H2 * f];
    const band = (f0, f1, col) => { const [ax, ay, bx, by] = P(f0), [, cy2, , dy2] = P(f1); poly(ax, ay, bx, by, bx, dy2, ax, cy2, fc(col, fog)); };
    // face, then the ash on its top (a parallelogram reaching outward), then the lip
    band(0, 1, FACE[(k >> 1) & 3]);
    poly(x, y - H1, x2, y2 - H2, x2 + o2, y2 - H2 - u2 * .015, x + o1, y - H1 - uw * .015, fc(ASH.M, fog));
    if(fog < .6) band(.94, 1, ASH.L);
    if(fog > .5 || h1 < .07) return;
    // courses of dry-stacked lava stone: dark gaps, ash caught on every ledge, staggered joints
    const j1 = .4 + (hash(k * 1.7) - .5) * .08, j2 = .72 + (hash(k * 2.3) - .5) * .06;
    for(const f of [j1, j2]){ band(f - .035, f, '#060407'); if(uw > 18) band(f, f + .03, ASH.D); }
    if(uw > 14){ const jw = Math.max(PX * .7, uw * .012); cx.fillStyle = fc('#060407', fog);
      const cs = [[0, j1 - .035], [j1, j2 - .035], [j2, .94]]; for(let c = 0; c < 3; c++){ if((k + c) % 2) continue; const [f0, f1] = cs[c]; cx.fillRect(x - jw / 2, y - H1 * f1, jw, H1 * (f1 - f0)); } }
    // delineators on the wall top, flaring as the headlight reaches them
    if(k % 4 === 0 && h1 > .1){ const near = clamp(1.25 - fog * 3, 0, 1), sz = Math.max(PX, Math.min(PX * 4, snap(uw * .035))), ry = y - H1 - sz * 1.3;
      cx.fillStyle = near > .66 ? '#fff0b8' : near > .33 ? '#ffc060' : fc('#d07028', fog); cx.fillRect(x - sz / 2, ry, sz, sz);
      if(near > .33 && uw > 18) glow(x, ry + sz / 2, Math.min(uw * .12, PX * 16), '#ffb050', .45 * near); } }
  function drawBlock(sp, x, y, uw, fog){ const dir = VX > x ? 1 : -1, spr = blockSpr(sp.v, dir), k = uw * sp.sz / 24; cx.globalAlpha = 1 - fog * .85; blit(spr, x, y + k, k); cx.globalAlpha = 1; }
  function drawPine(sp, x, y, uw, fog){ const dir = VX > x ? 1 : -1, spr = pineSpr(sp.v, dir), k = uw * 1.05 * sp.sz / 34; cx.globalAlpha = 1 - fog * .85; blit(spr, x, y, k); cx.globalAlpha = 1; }
  /* The lava flow's banks: a levee of clinker (aa lava's broken black crust) heaped along each bank across the field, one row of chunks
     fixed to the world (hashed per chunk), drawn at one depth so each chunk is a plain pixel rect. Hue-shifted ramp from violet-black to a
     warm umber crest; the face toward the melt is lit by it (the far bank faces you over the flow: a hot foot and glowing seams; the near
     bank shows its crest rimmed by the glow beyond). Far off it is one band. */
  const LV = { o:'#0c080e', d:'#1c1218', m:'#2e1c1c', l:'#4a2c24', glow:'#ff6a1e', hot:'#ffb04a', seam:'#e04a12' };
  function drawLevee(sp, x, y, uw, fog, now){ const s = sp.s, f = sp.far ? 1 : 0, a = s.p1.screen, b = s.p2.screen; if(!a.w || !b.w || s.p1.camera.z < SEG * .5) return;
    const w = a.w + (b.w - a.w) * f, bx = a.x + (b.x - a.x) * f, by = snap(a.y + (b.y - a.y) * f), side = Math.sign(sp.x), ex = side < 0 ? -PX : W + PX, x0 = bx + side * w * 1.02;
    if(fog > .45 || w < 6){ const hh = Math.max(PX, snap(w * .08)); cx.fillStyle = fc(LV.d, fog); cx.fillRect(Math.min(x0, ex), by - hh, Math.abs(ex - x0), hh); return; }
    const glowA = reduce ? .85 : .75 + .25 * Math.sin(now / 900 + sp.k);
    for(let c = 0; c < 26; c++){ const X0 = 1.02 + c * .26, cl = bx + side * w * X0, cr = bx + side * w * (X0 + .26); if((side < 0 ? Math.max(cl, cr) < 0 : Math.min(cl, cr) > W)) break;
      const h0 = hash(sp.k * .37 + c * 7.1 + side * 3.3), hh = Math.max(PX * 2, snap(w * (.045 + .085 * h0))), l = snap(Math.min(cl, cr)), r = snap(Math.max(cl, cr)), cw = Math.max(PX, r - l), notch = snap(cw * (.3 + .4 * hash(c * 2.9 + sp.k)));
      const hn = Math.max(PX, snap(hh * .62));   // a lower step on one side of the chunk: the jagged top of clinker
      cx.fillStyle = fc(LV.o, fog); cx.fillRect(l, by - hh - PX, cw, hh + PX);
      cx.fillStyle = fc(LV.d, fog); cx.fillRect(l + PX, by - hh, cw - PX, hh);
      cx.fillStyle = fc(LV.m, fog); cx.fillRect(l + PX, by - hh, cw - PX, Math.max(PX, snap(hh * .4)));
      cx.fillStyle = fc(LV.l, fog); cx.fillRect(l + PX, by - hh, Math.max(PX, cw - notch - PX), PX);
      cx.fillStyle = fc(LV.o, fog); cx.fillRect(h0 > .5 ? r - notch : l, by - hh - PX, notch, hh - hn);   // the notch (sky shows past it: the outline colour reads as the gap's shadow)
      if(sp.far){ cx.globalAlpha = glowA; cx.fillStyle = LV.glow; cx.fillRect(l, by - PX, cw, PX); if(hh > PX * 4 && h0 > .55){ cx.fillStyle = LV.seam; cx.fillRect(snap(l + cw * .5), by - snap(hh * .55), PX, snap(hh * .55)); cx.fillStyle = LV.hot; cx.fillRect(snap(l + cw * .5), by - PX * 2, PX, PX); } cx.globalAlpha = 1; }
      else { cx.globalAlpha = glowA * .7; cx.fillStyle = LV.glow; cx.fillRect(l + PX, by - hh, Math.max(PX, cw - notch - PX), PX); cx.globalAlpha = 1; } }
    if(sp.far && fog < .3) glow(snap(bx + side * w * 2.5), by, w * 1.6, '#ff5a10', .12 * glowA); }
  function drawLamp(sp, x, y, uw, fog, now){ const a = 1 - fog * .8; if(a < .05) return; const h = uw * 1.15, dir = -Math.sign(sp.x), ax = x + dir * uw * .32, hy = y - h;
    cx.fillStyle = fc('#0c0a10', fog); cx.fillRect(x - uw * .014, hy, uw * .028 + 1, h); cx.fillRect(Math.min(x, ax), hy, Math.abs(ax - x), uw * .022 + 1);
    cx.fillStyle = fc('#2a2630', fog); cx.fillRect(ax - uw * .06, hy - uw * .01, uw * .12 + 1, uw * .03 + 1); cx.fillStyle = '#ffd890'; cx.fillRect(ax - uw * .045, hy + uw * .02, uw * .09 + 1, uw * .015 + 1);
    if(uw > 5 && uw < W * .1){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,160,70,${.05 * a})`; cx.beginPath(); cx.moveTo(ax - uw * .04, hy + uw * .03); cx.lineTo(ax + uw * .04, hy + uw * .03); cx.lineTo(ax + uw * .24, y); cx.lineTo(ax - uw * .24, y); cx.closePath(); cx.fill(); cx.globalCompositeOperation = 'source-over'; }
    glow(ax, hy + uw * .03, uw * .28, '#ffa040', .5 * a); }
  function drawShelter(sp, x, y, uw, fog, now){ const spr = shelterSpr(), k = uw * 1.05 / 36, a = 1 - fog * .75, flip = sp.x > 0, bx = x;
    pool(x + (flip ? -1 : 1) * 4 * k, y, uw * .7, uw * .14, '#d8f0e8', .45 * a);
    cx.globalAlpha = a; if(flip){ cx.save(); cx.translate(Math.round(bx), 0); cx.scale(-1, 1); blit(spr, 0, y, k); cx.restore(); } else blit(spr, bx, y, k); cx.globalAlpha = 1;
    const lx = bx + (flip ? -1 : 1) * (16.5 - 22) * k, ly = y - (36 - 11.5) * k; glow(lx, ly, uw * .3, '#c8fff0', .45 * a);
    if(uw > 60){ const pl = plate('taihi', '退避壕', '#e8e8ec', '#c82626', 52); if(pl) cx.drawImage(pl, Math.round(lx - 7 * k), Math.round(y - (36 - 7) * k), Math.round(14 * k), Math.round(3 * k)); } }
  function drawBags(sp, x, y, uw, fog, now){ const spr = bagsSpr(), k = uw * .55 / 37, a = 1 - fog * .75; cx.globalAlpha = a; blit(spr, x, y, k); cx.globalAlpha = 1;
    if(uw > 70){ const pl = plate('kohai', '降灰指定置場', '#e8e8e0', '#1e5a3a', 100); if(pl) cx.drawImage(pl, Math.round(x - 18.5 * k + k), Math.round(y - 20 * k), Math.round(11 * k), Math.round(5 * k)); }
    const near = clamp(1.3 - fog * 3.2, 0, 1); if(near > .3) glow(x + 3 * k, y - 10 * k, uw * .2, '#ffe060', .18 * near); }
  function drawTorii(sp, x, y, uw, fog, now){ const dir = VX > x ? 1 : -1, spr = toriiSpr(dir), k = uw * 1.5 / 64, a = 1 - fog * .7;
    // a single stone lantern lights it from the road side
    pool(x, y, uw * .9, uw * .18, '#ffa850', .3 * a); cx.globalAlpha = a; blit(spr, x, y + k * 2, k); cx.globalAlpha = 1;
    const tx = x - Math.sign(sp.x) * 34 * k; cx.fillStyle = fc('#3a3640', fog); cx.fillRect(tx - 2 * k, y - 9 * k, 4 * k, 9 * k); cx.fillRect(tx - 3 * k, y - 11 * k, 6 * k, 2 * k); cx.fillStyle = '#ffd890'; cx.fillRect(tx - k, y - 8 * k, 2 * k, 2 * k);
    glow(tx, y - 7 * k, uw * .22, '#ffa850', .55 * a); }
  function drawSign(sp, x, y, uw, fog, now){ const spr = signSpr(), k = uw * .3 / 15, a = 1 - fog * .7, near = clamp(1.3 - fog * 3.2, 0, 1); cx.globalAlpha = a; blit(spr, x, y, k); cx.globalAlpha = 1;
    if(near > .3) glow(x, y - 21 * k, uw * .16, '#ffd070', .3 * near); }
  // the ash shelter as projected geometry (2026-11-19, buildings3d; the shared kit ENV.bkit in env/buildings.js), so it never turns into
  // upscaled blocks beside you: a concrete box five segments long, its street face with form-tie holes, rain stains and a side door, the
  // arch on the end that faces the camera with the white 退避壕 plate and the cool lamp over it, ash heaped on the flat roof
  const SH_X = 1.5, SH_D = .95, SH_H = .9, SH_LEN = 5;
  function drawShel(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K) return;
    K.fade(fog, .7, () => { const m = K.begin(sp, x, y, uw, fog, 0); if(!m || !K.vis(SH_X - .5, SH_X + SH_D)) return; const F = c => fc(c, fog), X = SH_X, D = SH_D, hW = SH_H, rel = K.rel, near = fog < .1 && m === 1, a = 1 - fog * .75;
      K.Q(X - .3, 0, X, 0, 0, 1, F('#1e1c20')); K.Q(X, 0, X, hW, 0, 1, F(CON.D)); K.Q(X, 0, X, .04, 0, 1, F(CON.K));
      if(fog < .3) for(let r = rel; r < rel + m; r++){ const t0 = (r - rel) / m, t1 = (r + 1 - rel) / m; for(let c = 0; c < 2; c++){ const hv = hash(r * 3.7 + c * 1.9 + sp.b0); if(hv > .45) K.Q(X, hW - .06 - hv * .5, X, hW - .04, t0 + (t1 - t0) * (.2 + c * .4), t0 + (t1 - t0) * (.32 + c * .4), F('#3a3842')); }
        if(near) for(let c = 0; c < 3; c++) for(const h of [.22, .5, .78]) K.RT(X, h, t0 + (t1 - t0) * (c + .5) / 3, .012, .012, F(CON.D)); }
      // the side door, mid-run: a dark opening with a stepped round head, the tube light inside, its spill on the ash
      { const ta = Math.max(0, (1.6 - rel) / m), tb = Math.min(1, (3.4 - rel) / m); if(tb > ta){ const w = tb - ta; K.Q(X, 0, X, .5, ta, tb, F('#24222a')); K.Q(X, 0, X, .48, ta + w * .06, tb - w * .06, F('#0a090d')); K.Q(X, .48, X, .54, ta + w * .16, tb - w * .16, F('#0a090d')); K.Q(X, .54, X, .57, ta + w * .3, tb - w * .3, F('#0a090d'));
          K.Q(X, 0, X, .3, ta + w * .06, tb - w * .06, F('#16302c')); K.Q(X, 0, X, .03, ta + w * .06, tb - w * .06, F('#3a6a62')); K.spill(X - .5, X, ta, tb, '200,255,240', .07 * a); } }
      // roof lip and the ash heaped on it, palest along its crest
      K.Q(X - .03, hW - .05, X - .03, hW, 0, 1, F(CON.L)); K.Q(X - .03, hW - .005, X - .03, hW + .01, 0, 1, F(CON.H));
      K.Q(X - .02, hW + .01, X + D / 2, hW + .13, 0, 1, F(ASH.M)); K.Q(X + D * .18, hW + .06, X + D / 2, hW + .14, 0, 1, F(ASH.L)); if(near) K.Q(X + D * .38, hW + .12, X + D / 2, hW + .145, 0, 1, F(ASH.H));
      if(!K.end) return;
      K.E(X, 0, X + D, hW, F(CON.M)); K.E(X, 0, X + D, .04, F(CON.K)); K.E(X, 0, X + .035, hW, F(CON.L));
      for(let c = 0; c < 4; c++){ const L = X + D * (.1 + c * .22), hv = hash(sp.b0 * 1.3 + c); if(hv > .4) K.E(L, hW - .1 - hv * .35, L + .03, hW - .04, F('#3c3a44')); }
      K.E(X + D * .22, 0, X + D * .78, .5, F('#24222a')); K.E(X + D * .25, 0, X + D * .75, .48, F('#0a090d')); K.E(X + D * .3, .48, X + D * .7, .55, F('#0a090d')); K.E(X + D * .38, .55, X + D * .62, .59, F('#0a090d'));
      K.E(X + D * .25, 0, X + D * .75, .03, F('#141218'));
      K.E(X + D * .26, .66, X + D * .74, .8, F('#8a8a92')); K.E(X + D * .28, .675, X + D * .72, .785, F('#e8e8ec'));
      const pl = fog < .4 ? plate('taihi', '退避壕', '#e8e8ec', '#c82626', 52) : null; if(pl){ const u = K.pu(0), w = D * .4 * u, h = w * 3 / 14; cx.drawImage(pl, Math.round(K.px(X + D * .5, 0, 0) - w / 2), Math.round(K.py(0, .73, 0) - h / 2), Math.round(w), Math.max(1, Math.round(h))); }
      K.bulb(X + D * .5, .625, 0, '#f4fff8', '#c8fff0', .03, .45 * a); K.spill(X - .4, X + D, 0, .4, '200,255,240', .06 * a);
      K.E(X - .02, hW, X + D + .02, hW + .045, F(ASH.M)); K.E(X + D * .1, hW + .045, X + D * .86, hW + .085, F(ASH.L)); K.E(X + D * .28, hW + .085, X + D * .62, hW + .11, F(ASH.H)); K.E(X + D * .7, hW + .045, X + D * .8, hW + .065, F(ASH.H));
      if(fog < .25) for(let c = 0; c < 4; c++) for(const h of [.2, .62, .82]){ const L = X + D * (.12 + c * .25); if(h < .6 && L > X + D * .2 && L < X + D * .8) continue; K.R(L, h, .014, .014, F(CON.D)); } }); }
  const DRAW = { levee:drawLevee, shel:drawShel, wall:drawWall, block:drawBlock, pine:drawPine, lamp:drawLamp, shelter:drawShelter, bags:drawBags, torii:drawTorii, sign:drawSign };

  // ---------------------------------------------------------------- the road: ash on the asphalt, wheel tracks, ash fields beyond the wall
  const GRD = ['#2a2427', '#272124'], GC = new Map();
  function roadFX(s, a, b, fog, f, now){ const ay = a.y, by = b.y - 1; if(ay - by < .5) return;
    // the field beyond the walls: ash-grey and black lava in world-fixed patches
    // (the black lava is the road's own ground colour; only the ash patches are painted)
    if(fog < .8 && hash(Math.floor(s.index / 9) * 3.7) < .4){ const lq = Math.round((s.lit || 0) * 10), key = s.stripe * 100 + lq; let base = GC.get(key); if(!base){ base = mixc(GRD[s.stripe], '#8a5a34', lq / 10 * .3); GC.set(key, base); }
      const gcol = fc(base, fog); poly(-2, ay, a.x - a.w * 1.27, ay, b.x - b.w * 1.27, by, -2, by, gcol); poly(a.x + a.w * 1.27, ay, W + 2, ay, W + 2, by, b.x + b.w * 1.27, by, gcol); }
    if(fog > .7) return;
    // ash drifted against the kerbs and swept between the wheel tracks
    const e1 = .9 - hash(s.index * 1.7) * .05, e2 = .9 - hash((s.index + 1) * 1.7) * .05;
    for(const sd of [-1, 1]) poly(a.x + sd * a.w * e1, ay, a.x + sd * a.w, ay, b.x + sd * b.w, by, b.x + sd * b.w * e2, by, fc('#363033', fog));
    if(fog < .45){ const c2 = fc(s.stripe ? '#2a262b' : '#2c282e', fog); for(const lx of [-.34, .34]){ const w1 = a.w * (.05 + hash(s.index * 3 + lx) * .02), w2 = b.w * (.05 + hash(s.index * 3 + 3 + lx) * .02); poly(a.x + a.w * lx - w1, ay, a.x + a.w * lx + w1, ay, b.x + b.w * lx + w2, by, b.x + b.w * lx - w2, by, c2); } }
    // glowing cracks out in the lava field: thin hot seams with a dark crust, fixed to the world, breathing slowly
    if(fog > .08 && fog < .75 && hash(s.index * 4.7) < .07){ const sd = hash(s.index * 2.3) > .5 ? 1 : -1, xx = a.x + sd * a.w * (1.7 + hash(s.index * 6.1) * 3.5), ww = snap(Math.max(PX * 2, a.w * (.18 + hash(s.index * 8.3) * .3))), yy = snap(by), br = reduce ? .85 : .7 + .3 * Math.sin(now / 1300 + s.index), f2 = 1 - fog;
      cx.fillStyle = fc('#2a0a08', fog); cx.fillRect(snap(xx - ww / 2) - PX, yy - PX, ww + PX * 2, PX * 3);
      cx.fillStyle = fc(br > .85 ? '#ffb040' : '#ff6a20', fog * .5); cx.fillRect(snap(xx - ww / 2), yy, ww, PX); if(ww > PX * 6){ cx.fillStyle = fc('#c8401a', fog * .5); cx.fillRect(snap(xx - ww * .2), yy - PX, snap(ww * .3), PX); }
      cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,90,30,${.16 * br * f2})`; cx.fillRect(snap(xx - ww), yy - PX * 3, snap(ww * 2), PX * 6); cx.globalCompositeOperation = 'source-over'; }
    // ash speckle out on the field, steady
    if(fog > .05 && fog < .6 && s.index % 2 === 0){ cx.fillStyle = fc(ASH.L, fog); for(let c = 0; c < 2; c++){ const sd = c ? 1 : -1, xx = a.x + sd * a.w * (1.4 + H0(s.index * 5 + c) * 4); if(H0(s.index * 9 + c) > .4) cx.fillRect(snap(xx), snap(by), PX * (1 + (H0(s.index + c) * 2 | 0)), PX); } }
    // the headlight: a warm pool ahead of the bike, in hard steps
    if(ay > H * .6){ const lv = ay > H * .8 ? .08 : ay > H * .7 ? .055 : .03, wa = a.w * .42, wb = b.w * .42; cx.globalCompositeOperation = 'lighter'; poly(W / 2 - wa, ay, W / 2 + wa, ay, W / 2 + wb, b.y, W / 2 - wb, b.y, `rgba(255,236,200,${lv})`); cx.globalCompositeOperation = 'source-over'; } }

  // ---------------------------------------------------------------- ashfall: three depths of grains in a world-anchored volume, slanting downwind
  const LAYERS = [ { n:260, z0:1800, z1:7000, col:'#6a6268', a:.8, fall:150 }, { n:150, z0:650, z1:1800, col:'#968c92', a:.85, fall:190 }, { n:56, z0:200, z1:650, col:'#bcb2b6', a:.9, fall:230 } ];
  function ashfall(al, now){ const hz = HZ, cam = playerX * ROADW, sv = speed / MAXS, bs = Math.min(W * .2, H * .27), beamTop = H * .58, tt = reduce ? now * .15 : now;
    for(let li = 0; li < 3; li++){ const Ly = LAYERS[li], span = Ly.z1 - Ly.z0, sz = (li === 2 ? 2 : 1) * PX; cx.fillStyle = Ly.col;
      for(let i = 0; i < Ly.n; i++){ const s0 = li * 1000 + i, z = Ly.z1 - (((H0(s0 * 1.31) * span + position) % span) + span) % span, sc = DEPTH / z;
        const yr = CAMH * 2.6, fy = (H0(s0 * 3.7) * yr + tt * Ly.fall / 1000) % yr, y3 = CAMH * 1.6 - fy;
        const x3 = (H0(s0 * 2.17) - .5) * ROADW * (li === 2 ? 2.4 : 5) - cam + fy * .35 + (reduce ? 0 : Math.sin(tt / 1900 + i) * 70);
        const sx = W / 2 + sc * x3 * W / 2, sy = H / 2 - PITCH - sc * y3 * H / 2; if(sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) continue;
        const inBeam = sy > beamTop && Math.abs(sx - W / 2) < (sy - beamTop) * 1.1 + bs * .1;
        cx.globalAlpha = al * Ly.a * (li === 0 ? Math.min(1, (z - Ly.z0) / 400 + .4) : 1);
        if(inBeam) cx.fillStyle = '#f0dcc0';
        const X = snap(sx), Y = snap(sy), dzv = sv * MAXS / 60, len = li < 2 || reduce ? 0 : Math.min(2, Math.round(Math.hypot(sx - W / 2, sy - hz) * dzv / z / PX));
        if(len < 1) cx.fillRect(X, Y, sz, sz);
        else { const dx = sx - W / 2, dy = sy - hz, dl = Math.hypot(dx, dy) || 1; for(let j = 0; j <= len; j++) cx.fillRect(snap(sx - dx / dl * j * PX), snap(sy - dy / dl * j * PX), j === 0 ? sz : PX, j === 0 ? sz : PX); }
        if(inBeam) cx.fillStyle = Ly.col; } }
    cx.globalAlpha = 1; }

  ENV.sakurajima = {
    barrier:WALLX,
    ownsRain:true,
    road:['#211e24', '#24212a'],
    lampCol:'#8a5a34',
    warm(){ for(const _ of ENV.sakurajima.warmSteps()); },
    // the same build with stopping points, for the staged warm-up (sundown.html WARM.q); warm() runs it straight through
    *warmSteps(){ for(const d of [-1, 1]){ for(let v = 0; v < 6; v++){ blockSpr(v, d); yield; } pineSpr(0, d); pineSpr(1, d); toriiSpr(d); yield; }
      shelterSpr(); bagsSpr(); yield; signSpr(); ferrySpr(); yield; for(let si = 0; si < 10; si++){ for(let he = 0; he < 4; he++) billow(si, he); yield; } for(let v = 0; v < 5; v++) boltSpr(v); yield;
      plate('taihi', '退避壕', '#e8e8ec', '#c82626', 52); plate('kohai', '降灰指定置場', '#e8e8e0', '#1e5a3a', 100); if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try{ plate('taihi', '退避壕', '#e8e8ec', '#c82626', 52); plate('kohai', '降灰指定置場', '#e8e8e0', '#1e5a3a', 100); }catch(e){} });   // as soon as the font is in, not when first seen
      if(W > 0){ volcano(); yield; city(); yield; }
      for(const c of ['#4a1610', '#6a2212', '#8a3416', '#b04a1c', '#8a3a1c', '#3c3638', '#2a1a24']) for(const dn of [.125, .25, .5]){ try{ cx.fillStyle = pat(c, dn); cx.fillRect(0, 0, PX * 4, PX * 4); }catch(e){} }
      try{ cx.save(); cx.globalAlpha = .004; for(const key in SPR) if(key.startsWith(P) && SPR[key] instanceof HTMLCanvasElement) cx.drawImage(SPR[key], 0, 0, 1, 1); if(V){ cx.drawImage(V.spr[1], 0, 0, 1, 1); cx.drawImage(V.spr[-1], 0, 0, 1, 1); } if(CITY){ cx.drawImage(CITY, 0, 0, 1, 1); cx.drawImage(CITY.refl, 0, 0, 1, 1); } cx.restore(); }catch(e){}
      if(typeof skyAt === 'function' && W > 0) for(let t = 0; t <= 1.001; t += .1){ const sk = skyAt(t * .97); try{ this.backdrop({ hz:H / 2 + 2, sk, now:t * 9000, moonX:W / 2, moonY:H * .2, t, far:sk.mid, near:sk.mid, L:LANDS[landK()] }); this.overlay(1, t * 9000, sk); }catch(e){} yield; }
      cx.clearRect(0, 0, W, H); },
    place,
    // the landmark jump keeps the roadside (setpiece/jump.js keepSides); the flow's levees start at the road edge, inside the default keep line
    jumpKeep:sp => sp.type === 'levee' ? true : undefined,
    lit,
    crater(){ CRO.x = CRX; CRO.y = CRY; CRO.e = ERUPT; return CRO; },   // read-only: where the crater was drawn this frame (setpiece/lavabreach.js)
    draw(sp, x, y, uw, fog, now, sk){ if(sk.low !== fogLow){ fogLow = sk.low; FC.clear(); } const fn = DRAW[sp.type]; if(fn) fn(sp, x, y, uw, fog, now); },
    roadFX,
    backdrop,
    overlay(al, now, sk){ const hz = HZ, e = ERUPT;
      // ash haze over the far road and props, warmer on the volcano side
      cx.globalAlpha = al * .55; cx.fillStyle = pat('#3a3236', .125); cx.fillRect(0, snap(hz - H * .01), W, snap(H * .035));
      cx.fillStyle = pat('#6a2a16', .125); cx.fillRect(snap(VX - W * .25), snap(hz - H * .006), snap(W * .5), snap(H * .02)); cx.globalAlpha = 1;
      // the eruption lights the land and road on the volcano's side: stepped additive washes centred on its foot; every blast makes
      // the whole scene pulse warm (never under reduced motion, where the wash stays steady)
      { const wk = reduce ? .55 : .4 + .6 * e; cx.globalCompositeOperation = 'lighter';
        for(const [rx, ry, a] of [[W * .75, H * .62, .028], [W * .5, H * .44, .03], [W * .28, H * .26, .035]]){ cx.fillStyle = `rgba(255,86,36,${a * wk * al})`; cx.beginPath(); cx.ellipse(snap(VX), snap(hz), snap(rx), snap(ry), 0, 0, 6.283); cx.fill(); }
        if(!reduce && e > .05){ cx.fillStyle = `rgba(255,110,50,${.05 * e * e * al})`; cx.fillRect(0, 0, W, H); }
        cx.globalCompositeOperation = 'source-over'; }
      // the headlight beam through the ash: two faint stepped wedges
      const bs = Math.min(W * .2, H * .27), by = snap(H - bs * .62), top = snap(H * .58); cx.globalCompositeOperation = 'lighter';
      for(const [w0, w1, a] of [[.05, .22, .03], [.03, .12, .04]]){ cx.fillStyle = `rgba(255,232,200,${a * al})`; cx.beginPath(); cx.moveTo(snap(W / 2 - bs * w0), by); cx.lineTo(snap(W / 2 - W * w1), top); cx.lineTo(snap(W / 2 + W * w1), top); cx.lineTo(snap(W / 2 + bs * w0), by); cx.closePath(); cx.fill(); }
      // a lightning stroke lights the ash air for an instant (never under reduced motion)
      if(BOLT && !reduce){ cx.fillStyle = `rgba(150,130,255,${.05 * al})`; cx.fillRect(0, 0, W, hz); }
      cx.globalCompositeOperation = 'source-over';
      ashfall(al, now); }
  };
})();
