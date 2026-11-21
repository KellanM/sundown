/* Sundown set piece: 溶岩流 LAVA BREACH on Sakurajima (MECH.sp_lava, director id 'lava', hero tier). See setpiece/README.md.
   Load after setpiece/cavein.js:   <script src="setpiece/lavabreach.js"></script>

   Sakurajima erupts in earnest while you ride its coast road. The ground shakes, the ash fall thickens, the crater pulses with
   lightning in the plume and bombs arc down onto the slopes. Then the bombs reach the road: three rows land ahead of you, crusted and
   glowing, with clear gaps between them. Ahead, a glow and smoke rise behind the stone wall on the crater side; a lava flow crests the
   embankment and spreads across the road (slow motion: the establishing shot, seen, never met); the asphalt cracks and sags into its
   channel, and the road before it heaves up on the inflating flow into a natural ramp, its cracks glowing. You take the heave and jump
   the molten channel: the hang is in slow motion, the camera tips down onto the lava passing below and its glow lights the bike from
   underneath (Akira's under-lighting); then a hard landing on the far bank, beside the buried torii.

   The stage. B = the near bank of the channel (the lip of the heave). The road is deformed in world height (additive, like kaiju.js's
   bridge break, so the jump helper's camera lift stays exact): the heave rises over RAMP segments before B (a quadratic kicker), the
   channel B..B+GAP sinks DEEP, the far bank stays put. MECH.sp_jump.launch flies B -> B+GAP, a distance-driven arc that always lands on
   the far bank, at any speed and from any lane (the heave also holds you at 85 % of top speed).

   Beats (s = segments from B, from the rider's segment, never the clock; ~13 s at top speed):
     s -560  rumble, quake shake, letterbox, duck, the director's guard (traffic and oil cleared to B+END); ash thickens; the crater pulses
     s -545  the card 溶岩流 LAVA BREACH (every occurrence)
     -560..-60  bombs arc off the crater and down onto the slopes and the lava fields beside the road (harmless)
     H1 -370 / H2 -295 / H3 -228  bombs land on the road 130 segments before you reach them (>= 1.7 s at the boosted cap) and stay there,
             crusted and glowing: H1 in the crater-side lane; H2 in the centre and the far lane (the crater-side lane open; a two-lane move
             gets 75 segments); H3 just off centre (both outer lanes open)
     -245  a glow and smoke rise behind the crater-side wall over the channel; -205 the flow crests the wall; it reaches the road at about
             -170 (slow motion, shake: the establishing shot) and crosses all three lanes by -120; the asphalt cracks and sags behind it
     -150..-80  the road before the channel heaves up into the ramp; its cracks open and glow; smoke and embers rise over the lip
     0     you leave the lip: slow motion over the top, the camera tips down onto the channel, the glow lights the bike from below
     +36   hard landing on the far bank (hit-stop, shake, a burst of ash and sparks, a boost); the release: ash settling, the torii
     +175  end
   Fairness (kikubari): three hazard rows, each landed 130 segments before you reach it, each leaving at least one full lane; nothing else
   on the road; one crash per bomb; the recovery blink protects as usual; the jump cannot be failed (distance-driven, any lane, any speed).
   Art: the lava is a per-pixel raster (no gradients): crust plates from a tileable distance field, their seams glowing white-yellow ->
   orange -> red with a one-pixel halo at any distance, bright pulses crawling along the seams (palette cycling), plates sheared by the flow
   (fast in the middle, stuck at the levees), molten skylights, rubble levees at the banks, a clinker front with an incandescent base,
   ash dust on old crust, heat shimmer in the rows. Bombs are bread-crust bombs: convex hulls rasterised at canvas resolution (after
   rockslide.js) whose plane borders are hot seams instead of dark cracks, cooling over time, with a 1 px outline and a cool moon rim.
   Smoke is ordered-dither density layers lit orange from below (no outlines, no cotton). The far bank's broken face shows the asphalt slab,
   the sub-base and the old lava under it, lit from below.
   Reduced motion: no shake, gentler slow motion, slower cycling and drift, fewer particles, no lightning flashes.
   Performance: every buffer and sprite is made in warm(); particles are pooled; no canvas is created mid-ride. */
"use strict";
(() => {
  const DIR = MECH.director, ID = 'lava', CARD = { kanji:'溶岩流', name:'LAVA BREACH', sub:'dodge the bombs, ride the heave', col:'#ff8a2a' };
  if(DIR) DIR.register(ID, { tier:'hero', roads:['sakurajima'], card:CARD });
  // geometry (segments from B; heights in world units) and beats
  const RAMP = 30, HR = 1400, GAP = 36, DEEP = 1000, PEAK = 1900, END = 175, PRE = 560, T_CARD = -545;
  const FR0 = -135, FRC = -76, FR1 = -16, SAG0 = -34, SAG1 = -20, HV0 = -52, HV1 = -31;
  const FK = [[-135, 3], [-76, 1.18], [-62, 1], [-32, -1], [-16, -3.4]];   // the front's path across the road (s, x in units of m)
  const sm = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
  const snp = v => Math.round(v / PX) * PX;
  const pSeg = () => (position + PZ) / SEG;
  const H1 = n => hash(n);
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  let Tg = 0;
  const plans = [];
  const S = {};
  let fogK = '', FC = new Map();
  const fc = (c, f) => { if(FOG_COL !== fogK){ fogK = FOG_COL; FC.clear(); } const q = Math.round(clamp(f, 0, 1) * 16), k = c + q; let v = FC.get(k); if(!v){ v = mixc(c, FOG_COL, q / 16 * .8); FC.set(k, v); } return v; };

  // ---------------------------------------------------------------- the front of the flow: where the lava has reached across the road
  // (x in half-road widths; the flow comes from the crater side m and runs to the bay side)
  const MELT0 = -175, MELT1 = -45, GIVE = -80, FT0 = -420, FT1 = -40, FT_HAND = -150;
  const meltK = (p, ps) => sm((ps - p.B - MELT0) / (MELT1 - MELT0));
  const fountK = (p, ps) => { const s = ps - p.B; return sm((s - FT0) / 25) * (1 - sm((s - FT1) / 40)); };
  const frontX0 = (p, ps) => { const s = ps - p.B; if(s < FK[0][0]) return p.m * 4; for(let k = 1; k < FK.length; k++) if(s < FK[k][0]){ const a = FK[k - 1], b = FK[k], u = (s - a[0]) / (b[0] - a[0]); return p.m * (a[1] + (b[1] - a[1]) * u); } return p.m * FK[FK.length - 1][1]; };
  const frontX = p => -p.m * 4;   // (round 4: no crossing front; the road melts through instead)
  const sagK = (p, ps) => sm((ps - p.B - SAG0) / (SAG1 - SAG0));
  const heaveK = (p, ps) => sm((ps - p.B - HV0) / (HV1 - HV0));

  // ---------------------------------------------------------------- bombs: convex hulls (rockslide.js's builder), built in warm
  function hull(P){ const n = P.length, F = [];
    for(let i = 0; i < n; i++) for(let j = i + 1; j < n; j++) for(let k = j + 1; k < n; k++){
      const a = P[i], b = P[j], c = P[k], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz); if(L < 1e-6) continue; nx /= L; ny /= L; nz /= L;
      let pos = 0, neg = 0; for(let l = 0; l < n; l++){ if(l === i || l === j || l === k) continue; const d = (P[l][0] - a[0]) * nx + (P[l][1] - a[1]) * ny + (P[l][2] - a[2]) * nz; if(d > 1e-6) pos++; else if(d < -1e-6) neg++; }
      if(pos && neg) continue;
      if(pos) F.push([i, k, j, -nx, -ny, -nz, 0]); else F.push([i, j, k, nx, ny, nz, 0]); }
    const G = new Map(); for(const f of F){ const a = P[f[0]], d = a[0] * f[3] + a[1] * f[4] + a[2] * f[5], key = Math.round(f[3] * 60) + ',' + Math.round(f[4] * 60) + ',' + Math.round(f[5] * 60) + ',' + Math.round(d * 60); if(!G.has(key)) G.set(key, []); G.get(key).push(f); }
    const out = []; let pid = 0;
    for(const g of G.values()){ pid++; if(g.length === 1){ g[0][6] = pid; out.push(g[0]); continue; } const nx = g[0][3], ny = g[0][4], nz = g[0][5], ids = [...new Set(g.flatMap(f => [f[0], f[1], f[2]]))];
      let cxm = 0, cym = 0, czm = 0; for(const q of ids){ cxm += P[q][0]; cym += P[q][1]; czm += P[q][2]; } cxm /= ids.length; cym /= ids.length; czm /= ids.length;
      let ux = P[ids[0]][0] - cxm, uy = P[ids[0]][1] - cym, uz = P[ids[0]][2] - czm; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul; const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
      const pts = ids.map(q => ({ q, u:(P[q][0] - cxm) * ux + (P[q][1] - cym) * uy + (P[q][2] - czm) * uz, v:(P[q][0] - cxm) * vx + (P[q][1] - cym) * vy + (P[q][2] - czm) * vz })).sort((a, b) => a.u - b.u || a.v - b.v);
      const cr = (o, a, b) => (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u), lo = [], hi = [];
      for(const t of pts){ while(lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], t) <= 1e-9) lo.pop(); lo.push(t); }
      for(let k = pts.length - 1; k >= 0; k--){ const t = pts[k]; while(hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], t) <= 1e-9) hi.pop(); hi.push(t); }
      const ring = lo.slice(0, -1).concat(hi.slice(0, -1)).map(t => t.q);
      for(let k = 1; k + 1 < ring.length; k++){ const a = P[ring[0]], b = P[ring[k]], c = P[ring[k + 1]], ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2], fx = c[0] - a[0], fy = c[1] - a[1], fz = c[2] - a[2];
        const dd = (ey * fz - ez * fy) * nx + (ez * fx - ex * fz) * ny + (ex * fy - ey * fx) * nz; out.push(dd >= 0 ? [ring[0], ring[k], ring[k + 1], nx, ny, nz, pid] : [ring[0], ring[k + 1], ring[k], nx, ny, nz, pid]); } }
    return out; }
  // a bread-crust bomb: a rounded, slightly flattened lump (a superellipsoid with exponent 2.4: rounder than rockslide's granite), its base
  // flattened where it came to rest, scaled to radius 1, the centre 0.7 above the base
  function bombShape(seed, n){ let sd = seed * 7919 + 13; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const ax = .95 + R() * .2, ay = .7 + R() * .16, az = .85 + R() * .2, P = [];
    for(let i = 0; i < n; i++){ const u = R() * 2 - 1, t = R() * 6.283, q = Math.sqrt(1 - u * u), dx = Math.cos(t) * q, dy = u, dz = Math.sin(t) * q;
      const k = 1 / Math.pow(Math.abs(dx) ** 2.4 + Math.abs(dy) ** 2.4 + Math.abs(dz) ** 2.4, 1 / 2.4), rr = .9 + R() * .14; P.push([dx * k * ax * rr, Math.max(-.5, dy * k * ay * rr), dz * k * az * rr]); }
    P.push([-.55 * ax, -.5, -.45 * az], [.6 * ax, -.5, -.4 * az], [.1, -.5, .66 * az]);
    let cxm = 0, czm = 0; for(const p of P){ cxm += p[0]; czm += p[2]; } cxm /= P.length; czm /= P.length; for(const p of P){ p[0] -= cxm; p[2] -= czm; }
    let ymin = 9; for(const p of P) ymin = Math.min(ymin, p[1]); for(const p of P) p[1] -= ymin;
    let rm = 0; for(const p of P) rm = Math.max(rm, Math.hypot(p[0], p[1] - .7, p[2])); const k = 1 / Math.max(.6, rm);
    for(const p of P){ p[0] *= k; p[1] = (p[1] - .7) * k + .7; p[2] *= k; }
    const V = new Float64Array(P.length * 3); P.forEach((p, i) => { V[i * 3] = p[0]; V[i * 3 + 1] = p[1] - .7; V[i * 3 + 2] = p[2]; });
    const F = hull(P), NSd = 11, sd3 = new Float64Array(NSd * 3), sh = { V, F, nv:P.length, sd:sd3, ns:NSd };
    // the bread crust: plates of skin round seeds spread over the surface (a Voronoi network in the bomb's own space, so it turns with it)
    for(let c = 0; c < NSd; c++){ const u = R() * 2 - 1, t = R() * 6.283, q = Math.sqrt(1 - u * u); sd3[c * 3] = Math.cos(t) * q * .8; sd3[c * 3 + 1] = u * .62; sd3[c * 3 + 2] = Math.sin(t) * q * .8; }
    return sh; }

  // ---------------------------------------------------------------- palettes (hue-shifted ramps)
  // Bomb crust at night: near-black, its shadow toward a warm purple, its top cooled grey-violet by the moon; when hot (in flight, just
  // landed) the skin itself glows dull red; the bread-crust seams run white-yellow -> orange -> red as they cool. Ash dusts the up faces.
  const CRUST = ['#120b10', '#1e1218', '#2c1a1e', '#3e2a2c', '#5e4c52'];
  const SKIN = ['#3a0e0a', '#5a1a0e', '#7e2a12', '#a63c18'];
  const SEAM = ['#4a0e08', '#9a240c', '#e8541a', '#ffa03a', '#fff0a8'];
  const OUT = '#07050a';
  const BPAL = CRUST.concat(SKIN, SEAM, ['#6a6266', '#8a7e8a', OUT]);   // 0-4 crust, 5-8 skin, 9-13 seam, 14 ash, 15 moon rim, 16 outline
  // The lava surface (Kupaianaha and Leilani 2018 at night): dark crust plates whose seams glow; a white-yellow core only on the hottest
  // seams, a one-pixel red halo, the crust beside a seam warmed; molten skylights (orange with darker skin swirling in rings); ash dust
  // on old crust; the levees at the banks are clinker rubble with dull red gaps; the front is clinker with an incandescent base.
  const LPAL = ['#0b0608', '#150b0d', '#1f120f', '#2b1813', '#3b231b', '#4a4246',   // 0-5: crust darkest .. rope highlight, ash speckle
    '#360b08', '#6e180c', '#c4360e', '#ff7a1a', '#ffb43a', '#fff0a0',              // 6-11: halo dark red, halo red, seam red-orange, orange, yellow, core
    '#4a160e', '#ff8e26', '#cc4a16', '#ffcc58',                                    // 12-15: warmed crust rim, molten, molten skin, molten hot spot
    '#1c1a22', '#3a3640', '#5c5662', '#4a3a36', '#5c4a42', '#2a1c1c', '#3a2622', '#7a3a1c', '#b85a24',
    '#221f26', '#141216', '#2e2a33', '#08070a'];   // 25-28: the road, scorched, a blister's lit rim, its shadow   // 16-24: the far bank's face
  const LEMIT = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, .5, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, .6, .8, 0, 0, 0, 0];      // emissive: fog barely dims it
  // smoke over the lava: lit orange from beneath, a dark grey-brown body, a cool grey top where the moon catches it; bomb smoke darker
  const SMK = { L:['#b04a1c', '#5e3c34', '#86788a'], D:['#2c2224', '#3e3638', '#625e68'] }, DS = [8, 12, 16, 24, 32, 48, 64, 96];

  // ---------------------------------------------------------------- sprites (warm): dithered smoke, the clinker front, flames, bolts
  const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function smokeSpr(N, v, f, P){ const c = can(N, N), k = c.getContext('2d'), img = k.createImageData(N, N), d = img.data, rgb = P.map(hx);
    let sd = 211 + v * 977 + N * 3; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, L = [];
    for(let j = 0; j < 5; j++) L.push([.5 + (R() - .5) * .38 + f * .02 * (j % 2 ? 1 : -1), .6 + (R() - .5) * .24 - j * .045, .17 + R() * .14]);
    const D = new Float32Array(N * N);
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const u = (x + .5) / N, w = (y + .5) / N; let a = 0;
      for(const [lx, ly, lr] of L){ const dx = (u - lx) / .9, dy = (w - ly) / 1.2, q = 1 - (dx * dx + dy * dy) / (lr * lr); if(q > a) a = q; }
      a *= .78 + .22 * Math.sin(u * N * .7 + v * 1.7 + f * 1.9 + w * 3);    // combed into rising wisps (vertical streaks: hot air climbs)
      a *= sm(Math.min(u, 1 - u) / .2) * sm(Math.min(w, 1 - w) / .14);
      D[y * N + x] = a; }
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const a = D[y * N + x], th = (BAY4[(y & 3) * 4 + (x & 3)] + .5) / 16;
      const lv = a > .6 ? .75 : a > .36 ? .5 : a > .17 ? .25 : a > .05 ? .125 : 0; if(th >= lv) continue;
      const up = y > 0 ? D[(y - 1) * N + x] : 0, top = up < .05 && y < N * .6, w = y / N, ci = top ? 2 : w > .62 ? 0 : 1, o = (y * N + x) * 4;
      d[o] = rgb[ci][0]; d[o + 1] = rgb[ci][1]; d[o + 2] = rgb[ci][2]; d[o + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // the clinker front ('a'a, Leilani 2018): a heap of black broken blocks, moonlit tops, its base and the gaps low down incandescent
  const FW = [8, 12, 18, 28];
  function frontSpr(v, fr, w){ const h = Math.max(5, Math.round(w * .78)), c = can(w, h), k = c.getContext('2d'); let sd = 31 + v * 101; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const top = []; for(let x = 0; x < w; x++){ const e = Math.min(x, w - 1 - x); top.push(Math.max(1, Math.round(h - 2 - Math.min(h - 3, e * .9 * h / 12) * (.75 + .25 * Math.sin(x * 1.3 + v)) - R() * 1.6 * h / 12))); }
    const blk = []; for(let j = 0; j < Math.max(4, w / 3); j++) blk.push([R() * w, 2 + R() * (h - 4), (1.6 + R() * 2.2) * Math.max(.6, w / 28)]);
    let fs = 7 + fr * 13 + v * 3; const F = () => (fs = (fs * 16807) % 2147483647) / 2147483647;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ if(y < top[x]) continue; let col;
      let nb = 9, nb2 = 9; for(const b of blk){ const d = Math.hypot(x + .5 - b[0], (y + .5 - b[1]) * 1.3) / b[2]; if(d < nb){ nb2 = nb; nb = d; } else if(d < nb2) nb2 = d; }
      const gap = nb2 - nb < .16, low = y >= h - 2, edge = y === top[x];
      if(low) col = (x + fr) % 3 === 0 ? '#fff0a0' : y === h - 1 ? '#ffb43a' : '#ff7a1a';
      else if(gap) col = y > h * .55 ? (F() < .5 ? '#ff7a1a' : '#c4360e') : y > h * .35 ? '#6e180c' : '#0b0608';
      else if(edge) col = '#4a4246';
      else col = nb < .45 ? '#2b1813' : y > h * .6 ? '#4a160e' : '#150b0d';
      k.fillStyle = col; k.fillRect(x, y, 1, 1); }
    return c; }
  // flames on a smouldering bomb: three frames, a tongue of fire with a white-yellow root
  function flameSpr(f){ const w = 7, h = 11, c = can(w, h), k = c.getContext('2d');
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const cxp = 3 + Math.sin(y * .8 + f * 2.1) * (1 - y / h) * 1.2, wd = (y / h) * 3 * (1 - Math.max(0, y - 8) / 6) + .4, dx = Math.abs(x + .5 - cxp - .5);
      if(y < 1 + f || dx > wd) continue; const q = dx / Math.max(.5, wd); k.fillStyle = q < .4 && y > 5 ? '#fff0a0' : q < .7 ? '#ffa03a' : y < 6 ? '#e8541a' : '#9a240c'; k.fillRect(x, y, 1, 1); }
    return c; }
  // volcanic lightning in the plume (Rinjani 1994, Sakurajima): a white core that branches downward, a violet fringe
  function boltSpr(v){ const w = 26, h = 40, c = can(w, h), k = c.getContext('2d'); let sd = v * 977 + 41; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, core = [], br = [];
    let x = 13 + (R() - .5) * 6; for(let y = 0; y < h; y++){ x += (R() - .5) * 2.6; x = clamp(x, 2, w - 3); core.push([Math.round(x), y]);
      if(R() < .1 && y > 4 && y < h - 8){ let bx = x, dir = R() < .5 ? -1 : 1; for(let j = 0; j < 10; j++){ bx += dir * (.6 + R()); const by = y + j; if(bx < 1 || bx > w - 2 || by >= h) break; br.push([Math.round(bx), by]); } } }
    k.fillStyle = '#6a50c8'; for(const [a, b] of core.concat(br)){ k.fillRect(a - 1, b, 3, 1); }
    k.fillStyle = '#c8b8ff'; for(const [a, b] of br) k.fillRect(a, b, 1, 1);
    k.fillStyle = '#ffffff'; for(const [a, b] of core) k.fillRect(a, b, 1, 1);
    return c; }

  // ---------------------------------------------------------------- the lava texture: a tileable crust-plate distance field (warm)
  // TS x TS texels over TW half-road widths; per texel: the distance to the nearest plate border (texels), the plate id, the distance to the
  // plate's centre (for the ropes on pahoehoe skin) and a phase for the crawl. Sampled per screen pixel in drawLava (bilinear up close).
  const TS = 256, TW = 6, TEX = TW / TS, NC = 9;
  const DF = new Float32Array(TS * TS), DCn = new Float32Array(TS * TS), CID = new Uint8Array(TS * TS), PH = new Uint8Array(TS * TS);
  const TXo = new Int8Array(TS * TS), TYo = new Int8Array(TS * TS), CH = new Float32Array(NC * NC), CT = new Uint8Array(NC * NC), CWm = new Float32Array(NC * NC), TORN = new Uint8Array(NC * NC);
  function buildField(){ const cs = TS / NC, PXs = new Float32Array(NC * NC), PYs = new Float32Array(NC * NC); let sd = 977; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for(let j = 0; j < NC; j++) for(let i = 0; i < NC; i++){ const c = j * NC + i; PXs[c] = (i + .12 + R() * .76) * cs; PYs[c] = (j + .12 + R() * .76) * cs; CH[c] = R(); CT[c] = R() < .5 ? 2 : 3; }
    const CX = new Float64Array(25), CY = new Float64Array(25);
    for(let y = 0; y < TS; y++) for(let x = 0; x < TS; x++){ const gi = Math.floor(x / cs), gj = Math.floor(y / cs), X = x + .5, Y = y + .5; let b1 = 1e18, n1 = 0, c1 = 0, nc = 0;
      for(let dj = -2; dj <= 2; dj++) for(let di = -2; di <= 2; di++){ const ii = ((gi + di) % NC + NC) % NC, jj = ((gj + dj) % NC + NC) % NC, c = jj * NC + ii;
        const wx = PXs[c] + (gi + di - ii) * cs, wy = PYs[c] + (gj + dj - jj) * cs, d = (X - wx) * (X - wx) + (Y - wy) * (Y - wy);   // the copy of plate c in this neighbourhood (the field tiles)
        CX[nc] = wx; CY[nc] = wy; if(d < b1){ b1 = d; n1 = nc; c1 = c; } nc++; }
      let e = 1e9; for(let k = 0; k < nc; k++){ if(k === n1) continue; const nx = CX[k] - CX[n1], ny = CY[k] - CY[n1], nl = Math.hypot(nx, ny) || 1;
        const dd = (((CX[k] + CX[n1]) / 2 - X) * nx + ((CY[k] + CY[n1]) / 2 - Y) * ny) / nl; if(dd < e) e = dd; }   // the distance to the bisector with each neighbour
      const k = y * TS + x; TXo[k] = clamp(Math.round(X - CX[n1]), -127, 127); TYo[k] = clamp(Math.round(Y - CY[n1]), -127, 127); DF[k] = Math.max(0, e); CID[k] = c1; DCn[k] = Math.sqrt(b1); PH[k] = (Math.floor(CH[c1] * 255) + Math.floor(x * 1.3 + y * .7)) & 255; } }
  // a cheap integer hash for per-pixel noise (no Math.sin in the raster loops)
  const ih = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------------------------------------------------------------- the plan
  function knot(s, x, h, hop, ev){ return { s, x, h, hop:hop || 0, ev:ev || '' }; }
  // a bomb's flight from the crater side of the sky to its impact (m: the crater side), then a short settle
  function arc(m, land, xr, hi){ return [knot(land - 58, m * 5.4, 4.8 * hi), knot(land - 34, m * 3.6, 3.6 * hi, .3), knot(land - 14, xr + m * 1.3, 1.6 * hi, .12), knot(land, xr, 0, .05, 'impact'), knot(land + 9, xr + m * .05, 0, .07, 'bounce'), knot(land + 15, xr + m * .07, 0, .01)]; }
  function bomb(o){ return Object.assign({ x:0, h:0, hc:0, z:0, ax:0, ay:0, az:0, vis:false, hit:false, landed:false, hz:true, shp:0, heat:1, kk:-1 }, o); }
  function build(B, m){ const p = { B, m, off:false, done:false, on:false, cut:null, lastPs:null, bombs:[], hits:0, rumT:0, pulseT:0, launched:false, landed:false, hzSwept:false, cvTo:B - PRE - 40, wallsM:false, wallsN:false, sm:[], scorch:[] };
    const Bm = o => { const r = bomb(o); p.bombs.push(r); return r; };
    // the hazards (on the road): landed 130 segments before you reach them
    { const Z = B - 370; Bm({ id:'H1', K:arc(m, Z - 130, m * .62, 1), Z, zs:14, r:.25, shp:0, spin:.09 }); }
    { const Z = B - 295; Bm({ id:'H2a', K:arc(m, Z - 136, 0, 1.05), Z, zs:12, r:.23, shp:1, spin:.08 }); Bm({ id:'H2b', K:arc(m, Z - 128, -m * .64, .95), Z:Z + 1.5, zs:12, r:.25, shp:2, spin:.1 }); }
    { const Z = B - 228; Bm({ id:'H3', K:arc(m, Z - 130, m * .05, 1.1), Z, zs:14, r:.24, shp:3, spin:.08 }); }
    // the burst: molten blobs thrown from the fountain beside the road; they splat on the asphalt and spread and crust. Two are hazards
    // (landed 100 segments before you reach them, >= 1.3 s at the boosted cap; S1 centre: both outer lanes open; S2 crater-side lane: the
    // centre and far lane open, a one-lane move 60 segments after S1), two land out on the fields
    { const fz = B + (GAP >> 1), blob = (id, Z, xr, hz) => { const land = Z - 100, K = [knot(land - 70, m * 1.75, .4), knot(land - 42, m * 1.2, 6.5, .8), knot(land - 16, xr + m * .35, 3, .3), knot(land, xr, 0, .05, 'impact'), knot(land + 5, xr, 0), knot(land + 10, xr, 0)];
        Bm({ id, K, Z, zs:fz - Z, r:hz ? .28 : .2, shp:0, spin:0, splat:true, hz }); };
      blob('S1', B - 165, 0, true); blob('S2', B - 105, m * .62, true); blob('s3', B - 135, -m * 1.7, false); blob('s4', B - 80, m * 1.6, false); }
    // the slopes: bombs that come down on the lava fields beyond the walls (never hazards)
    for(let k = 0; k < 16; k++){ const land = B - PRE + 10 + k * 34 + Math.round(H1(B + k * 3.3) * 12), side = H1(B * .3 + k * 1.7) < .72 ? m : -m, ahead = 60 + Math.round(H1(B + k * 5.1) * 110), Z = land + ahead;
      if(Z > B - 40 && Z < B + GAP + 10) continue;
      const xr = side * (1.55 + H1(B * .7 + k * 2.9) * 2.8); Bm({ id:'x' + k, K:arc(m, land, xr, .7 + H1(k * 7.7) * .4), Z, zs:10, r:.1 + H1(B + k * 9.1) * .09, shp:k % 4, spin:.12, hz:false }); }
    // cracks in the heave (transverse tears where the asphalt bent over the inflating flow) and in the sagging road: jagged polylines
    p.cr = []; let cs = B * 7 + 3; const CR = () => (cs = (cs * 16807) % 2147483647) / 2147483647;
    const crack = (j, x0, len, heat, ramp, rise) => { const pts = []; let x = x0, z = .3 + CR() * .4; pts.push([x, z]);
      while(x < x0 + len){ x += .07 + CR() * .12; z = clamp(z + (CR() - .5) * .55, -.3, 1.3); pts.push([Math.min(x, 1.12), z]); if(x > 1.12) break; }
      const c = { j, pts, heat, ramp, rise, br:null }; p.cr.push(c);
      if(pts.length > 5 && CR() < .7){ const k0 = 2 + Math.floor(CR() * (pts.length - 4)), bp = [[pts[k0][0], pts[k0][1]]]; let bx = pts[k0][0], bz = pts[k0][1];   // a branch running off toward you or away
        const dir = CR() < .5 ? -1 : 1; for(let q = 0; q < 4; q++){ bx += .05 + CR() * .08; bz += dir * (.25 + CR() * .3); bp.push([Math.min(bx, 1.12), bz]); } c.br = bp; } };
    // the heave: rows of asphalt slabs between transverse tears, each row cut into 2-3 slabs; every slab tilted on its own (near and far
    // edge heights, a sideways cant), its edges jagged, gaps between them (the glowing cracks) of uneven width
    p.slabs = []; const JN = [-RAMP, -27, -24, -21, -18, -15, -12, -9.5, -7, -5, -3, -1.4, 0];
    for(let r = 0; r + 1 < JN.length; r++){ const z0 = B + JN[r], z1 = B + JN[r + 1], t = r / (JN.length - 2); let xa = -1.16;
      const cuts = [-1.16]; let nc = 2 + Math.floor(CR() * 2); for(let c = 0; c < nc; c++) cuts.push(-.7 + CR() * 1.4); cuts.push(1.16); cuts.sort((a, b) => a - b);
      for(let c = 0; c + 1 < cuts.length; c++){ const xL = cuts[c], xR = cuts[c + 1]; if(xR - xL < .25) continue; const base = 110 + 300 * t;
        const n = Math.max(3, Math.round((xR - xL) / .13)), gN = r ? .1 + CR() * .22 : 0, gF = r < JN.length - 2 ? .1 + CR() * .22 : 0, near = [], far = [];
        for(let k = 0; k < n; k++){ const u = k / (n - 1), x = xL + (c ? .025 : 0) + (xR - xL - (c ? .025 : 0) - (c + 2 < cuts.length ? .025 : 0)) * u;
          near.push(x + (k && k < n - 1 ? (CR() - .5) * .05 : 0), z0 + gN + (r ? (CR() - .3) * .2 : 0)); far.push(x + (k && k < n - 1 ? (CR() - .5) * .05 : 0), z1 - gF + (r < JN.length - 2 ? (CR() - .7) * .2 : 0)); }
        p.slabs.push({ z0, z1, xL, xR, n, near, far, hN:base * (CR() < .3 ? .9 + CR() * .5 : .05 + CR() * .5), hF:base * (.5 + CR() * 1.1), tl:(CR() - .5) * base * .6, sh:(CR() - .5) * .07, row:r, rub:CR(), tv:Math.floor(CR() * 3) - 1 }); } }
    for(let q = 0; q < 8; q++){ let x = -1.1 + CR() * .3; while(x < .9){ const len = .5 + CR() * 1; crack(B + 2 + q * 4 + Math.floor(CR() * 2), x, len, .5, false, 0); x += len + .1 + CR() * .3; } }
    // smoke sources over the channel (x across the flow) and the lip
    for(let k = 0; k < 9; k++) p.sm.push({ z:B + 3 + H1(B + k * 1.9) * (GAP - 6), x:(H1(B * .1 + k * 3.7) - .5) * 4.4, t:H1(k * 5.5) * 3 });
    return p; }
  // the channel's sag and the heave, added to the segments' world heights (stored per segment so the change is always the difference)
  function deform(p, ps){ const g = heaveK(p, ps), d = sagK(p, ps), B = p.B, hump = 300 * meltK(p, ps) * (1 - d);
    if(g === p.g0 && d === p.d0 && hump === p.h0) return; p.g0 = g; p.d0 = d; p.h0 = hump;
    for(let j = B - RAMP; j < B + GAP; j++){ const q = segs[j]; if(!q) continue; const o = j - B; let o1 = 0, o2 = 0;
      if(o < 0){ const t1 = (o + RAMP) / RAMP, t2 = t1 + 1 / RAMP; o1 = HR * g * t1 * t1; o2 = HR * g * t2 * t2; }
      else { const f1 = Math.sin(Math.PI * clamp(o / GAP, 0, 1)), f2 = Math.sin(Math.PI * clamp((o + 1) / GAP, 0, 1)); o1 = -DEEP * d + hump * (.4 + .6 * f1); o2 = -DEEP * d + hump * (.4 + .6 * f2); }
      const a1 = q.lbA1 || 0, a2 = q.lbA2 || 0; if(o1 !== a1 || o2 !== a2){ q.p1.world.y += o1 - a1; q.p2.world.y += o2 - a2; q.lbA1 = o1; q.lbA2 = o2; } } }

  // the hills flattened over the breach's view (B-FL0..B+FL1), eased in and out, once, while the stretch is still out of sight; the heave
  // and the channel are added on top of it. A straight, flat run lets the flow be seen crossing and the heave read as a ramp.
  const FLE = 60;
  function flatPass(a, b, inE, outE){ const ya = segs[a].p1.world.y, yb = segs[b].p2.world.y, za = a, zb = b + 1;
    const fix = (P, z) => { const lin = ya + (yb - ya) * (z - za) / (zb - za), w = (inE ? sm((z - za) / FLE) : 1) * (outE ? sm((zb - z) / FLE) : 1); P.world.y += (lin - P.world.y) * w; };
    for(let j = a; j <= b; j++){ const q = segs[j]; fix(q.p1, j); fix(q.p2, j + 1); } }
  function flatten(p, ps){ const B = p.B;
    // segments exist ~756 ahead of the rider; each pass runs once, as soon as its stretch exists and while its start is 300+ ahead (in the
    // haze). A ride that arrives later (a test that jumps in) keeps that stretch's hills.
    if(!p.flat1 && segs[B - 200]){ p.flat1 = true; if(ps < B - 440 - 300) flatPass(B - 440, B - 200, true, false); }
    if(!p.flat2 && segs[B + GAP + 100]){ p.flat2 = true; if(ps < B - 200 - 300) flatPass(B - 200, B + GAP + 100, false, true); } }
  // ---------------------------------------------------------------- placement
  const FREE = new Set(['wall']);
  function decide(i, s, L){ if(!L || L.key !== 'sakurajima' || LANDS[s.land].key !== 'sakurajima') return; const ls = typeof landStart === 'number' ? landStart : 0; if(i - ls !== 40) return;
    const z = zoneOfSeg(i), border = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9;
    // after the road's landmark jump (setpiece/jump.js: the lava leap, its window ends ~66+60 past its b0) and before the border's blend
    let j0 = ls + 300; const J = MECH.sp_jump; if(J && J._plans) for(const q of J._plans()) if(q.kind === 'bridge' && q.start === ls) j0 = Math.max(j0, q.b0 + 66 + 70);
    const forced = /(^|[?&,=])force=([^&]*)(lava|all)/.test(location.search), qb = +(new URLSearchParams(location.search).get('lvB') || 0);
    const fits = (B, tail) => { if(B - PRE < j0 || B + tail > border - 30) return false;
      if(window.inForkWindow && inForkWindow(B - PRE - 20, B + END)) return false;
      for(const g of gates){ if(g >= B - 265 && g <= B + GAP + 70) return false; for(const o of [-370, -295, -228]) if(Math.abs(g - (B + o)) < 22) return false; }
      return true; };
    let pick = -1;
    if(qb){ pick = ls + qb; }
    else { for(let B = Math.ceil((j0 + PRE) / 10) * 10; B + 60 < border; B += 10){ const r = ((B % 600) + 600) % 600; if((Math.abs(r - 200) <= 20 || Math.abs(r - 500) <= 20) && fits(B, END)){ pick = B; break; } }
      // a short road (the first road of a ride): take the first fit anywhere, letting the release run into the border's blend
      if(pick < 0 && forced) for(let B = Math.ceil((j0 + PRE) / 10) * 10; B + 60 < border; B += 10) if(fits(B, GAP + 50)){ pick = B; break; } }
    if(pick < 0) return;
    if(plans.some(p => Math.abs(p.B - pick) < 900)) return;
    if(DIR && !DIR.request(ID, { tier:'hero', seg:pick - 200 })) return;
    const qs = +(new URLSearchParams(location.search).get('lvside') || 0), m = qs ? Math.sign(qs) : H1(pick * .37 + 1.3) < .5 ? -1 : 1;   // (?lvside=-1|1 forces the crater side: tests)
    plans.push(build(pick, m)); if(plans.length > 4) plans.shift(); }
  // the props near the camera that turn into giant sprite pixels (the buried torii, the ash-bag sign and plates, the road signs): inside the
  // event they are drawn here, fading as they near the camera, through ENV.sakurajima.draw and the core's EDGE alpha accessor
  const NEARF = { torii:[230, 340], bags:[120, 190], sign:[110, 170] };
  function lay(p, i, s){ const B = p.B;
    for(let j = Math.max(i, p.cvTo + 1); j < segs.length && j <= B + GAP + 40; j++){ const sg = segs[j], o = j - B; p.cvTo = j; if(o < -300) continue;   // straight through the heave, the channel and the landing
      const f = o < -250 ? clamp((-250 - o) / 40, 0, 1) : o > GAP + 16 ? clamp((o - GAP - 16) / 24, 0, 1) : 0; sg.curve *= f; }
    if(i < B - PRE - 30 || i > B + END) return;
    s.skRes = 1; s.police = 1; s.hz = null; s.lbP = p; if(i >= B - PRE && (s.spjP || s.tunnel || s.gore)) p.off = true;
    const keep = [], o = i - B, chan = o >= -1 && o <= GAP;
    for(const sp of s.sprites){
      if(sp.env === 'sakurajima' && chan && !FREE.has(sp.type)) continue;                             // the channel takes the field, the lamps, the shelters
      if(sp.env === 'sakurajima' && NEARF[sp.type]){ (s.lbNear || (s.lbNear = [])).push(sp); continue; }
      keep.push(sp); }
    s.sprites = keep; }
  const SKF = { low:'#000' };
  function drawNear(s, sx0, sy0, uw, fog, now){ const L = s.lbNear; if(!L || !ENV.sakurajima) return; SKF.low = FOG_COL;
    for(const sp of L){ const f = NEARF[sp.type], a = 1 - sm((uw - f[0]) / (f[1] - f[0])); if(a <= .02) continue; const e0 = EDGE; EDGE = e0 * a; cx.globalAlpha = 1;
      try{ ENV.sakurajima.draw(sp, sx0 + sp.x * uw, sy0, uw, fog, now, SKF); } finally { EDGE = e0; cx.globalAlpha = 1; } } }
  // the walls on the channel: the crater side's go as the flow crests them, the bay side's as the front reaches them
  function dropWalls(p, side){ for(let j = p.B - 1; j <= p.B + GAP; j++){ const sg = segs[j]; if(sg) sg.sprites = sg.sprites.filter(sp => !(sp.env === 'sakurajima' && sp.type === 'wall' && Math.sign(sp.x) === side)); } }

  // ---------------------------------------------------------------- bomb paths
  const EV = { x:0, h:0, k:-1 };
  function path(K, s){ const n = K.length; if(s <= K[0].s){ EV.x = K[0].x; EV.h = K[0].h; EV.k = -1; return EV; }
    if(s >= K[n - 1].s){ EV.x = K[n - 1].x; EV.h = K[n - 1].h; EV.k = n - 1; return EV; }
    let k = 0; while(s >= K[k + 1].s) k++; const a = K[k], b = K[k + 1], u = (s - a.s) / (b.s - a.s);
    EV.x = a.x + (b.x - a.x) * u; EV.h = a.h + (b.h - a.h) * u + 4 * b.hop * u * (1 - u); EV.k = k; return EV; }
  function pose(r, s){ const K = r.K, sImp = K[3].s, last = K[K.length - 1].s; path(K, s); r.x = EV.x; r.h = EV.h; r.kk = EV.k;
    r.z = r.Z + (s < sImp ? r.zs * clamp((sImp - s) / (sImp - K[0].s), 0, 1) : 0);
    r.vis = s >= K[0].s; r.landed = s >= sImp;
    r.ax = (last - Math.min(s, last)) * r.spin * 1.4; r.ay = (last - Math.min(s, last)) * r.spin * .5; r.az = (K[K.length - 1].x - r.x) / r.r * .4;
    r.heat = s < sImp ? 1 : (r.hz ? .74 : .5) + (r.hz ? .26 : .5) * Math.exp(-(s - sImp) / 120); r.hc = r.h + .7 * r.r; return r; }
  const atContact = r => { path(r.K, r.Z); return EV.x; };

  // ---------------------------------------------------------------- particles (world: z segments, x and h half-road widths), pooled
  const SP = []; for(let k = 0; k < 90; k++) SP.push({ on:false, z:0, x:0, h:0, r:0, gr:0, vx:0, vh:0, t:0, life:0, v:0, lit:0 });
  const EP = []; for(let k = 0; k < 220; k++) EP.push({ on:false, z:0, x:0, h:0, vx:0, vh:0, vz:0, t:0, life:0, c:0, g:0 });
  let rs = 17; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  function smoke(z, x, h, n, r, up, lit, lf){ for(let k = 0; k < n; k++){ let q = null; for(const d of SP) if(!d.on){ q = d; break; } if(!q) return;
      q.on = true; q.z = z + (rnd() - .5) * 2; q.x = x + (rnd() - .5) * .3; q.h = h; q.r = r * (.6 + rnd() * .6); q.gr = r * (.4 + rnd() * .5); q.vx = (rnd() - .5) * .25 - .06; q.vh = up * (.5 + rnd() * .6); q.t = 0; q.life = (lf || 1) * (1.4 + rnd() * 1.2); q.v = k % 3; q.lit = lit; } }
  // embers and spatter: g > 0 falls back (spatter, bomb splash), g < 0 rises and wanders (embers off the lava)
  function embers(z, x, h, n, sp, g, zs){ for(let k = 0; k < n; k++){ let q = null; for(const d of EP) if(!d.on){ q = d; break; } if(!q) return;
      q.on = true; q.z = z + (rnd() - .5) * (zs || 1); q.x = x + (rnd() - .5) * .1; q.h = h + .02; const a = rnd() * 6.283, v = sp * (.4 + rnd() * .8); q.vx = Math.cos(a) * v; q.vz = Math.sin(a) * v * 4; q.vh = g > 0 ? sp * (.8 + rnd() * 1.6) : .25 + rnd() * .5; q.t = 0; q.life = g > 0 ? .6 + rnd() * .6 : 1 + rnd() * 1.4; q.c = k % 4; q.g = g; } }
  const KP = []; for(let k = 0; k < 40; k++) KP.push({ on:false, z:0, x:0, h:0, vx:0, vh:0, t:0, r:0, sp:0 });
  function chunk(z, x, h, dir){ for(const q of KP) if(!q.on){ q.on = true; q.z = z; q.x = x; q.h = h; q.vx = dir * (.4 + rnd() * .7); q.vh = .3 + rnd() * .6; q.t = 0; q.r = .04 + rnd() * .06; q.sp = rnd() * 6; return; } }
  function stepP(dt){ for(const q of KP){ if(!q.on) continue; q.t += dt; if(q.t > 2.2){ q.on = false; continue; } q.x += q.vx * dt; q.h += q.vh * dt; q.vh -= 3.2 * dt; if(q.h < 0){ q.h = 0; q.vh *= -.35; q.vx *= .55; } } for(const q of SP){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.x += q.vx * dt; q.h += q.vh * dt; q.vh *= 1 - .6 * dt; q.r += q.gr * dt; }
    for(const q of EP){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt;
      if(q.g > 0){ q.vh -= 4.6 * dt; if(q.h < 0){ q.h = 0; q.vh *= -.25; q.vx *= .4; q.vz *= .4; } } else { q.vx += Math.sin(q.t * 5 + q.c) * .4 * dt; q.vh *= 1 - .3 * dt; } } }

  // ---------------------------------------------------------------- sound (the core's synth helpers)
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function rumble(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.6, 40, v, t0); M.noise(1.2, 90, v * .5, t0 + .12); }
  function boom(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.4, 55, .26 * v, t0); M.tone(36, .9, { type:'sine', v:.16 * v, at:t0 }); M.noise(.4, 600, .06 * v, t0 + .02); }
  function thud(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.8, 80, .2 * v, t0); M.tone(48, .5, { type:'sine', v:.11 * v, at:t0 }); M.noise(.25, 2400, .05 * v, t0 + .01); M.noise(.5, 5200, .02 * v, t0 + .05); }
  function hiss(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.9, 3800, .03 * v, t0); M.noise(.7, 1400, .025 * v, t0 + .1); }
  function crackS(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.06, 3200, .1 * v, t0); M.noise(.35, 700, .07 * v, t0 + .02); M.tone(110, .3, { type:'square', v:.018 * v, at:t0 }); }
  function whoosh(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.3, 380, .1, t0); M.noise(.9, 1500, .05, t0 + .05); }
  function crunch(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.5, 120, .3, t0); M.tone(44, .6, { type:'sine', v:.18, at:t0 }); M.noise(.3, 2600, .09, t0 + .01); M.noise(.6, 900, .06, t0 + .04); }

  // ---------------------------------------------------------------- the module
  const active = ps => { if(state === 'ready') return null;   /* behind the title the breach never happens: the attract ride can't dodge its bombs */ for(const p of plans) if(!p.off && !p.done && ps > p.B - PRE - 60 && ps < p.B + END + 20 && segs[p.B] && segs[p.B].lbP === p) return p; return null; };
  let cur = null;
  function showCard(){ if(!DIR || !DIR.cine) return; let card = CARD;
    if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has(ID)){ try{ if(MECH.cutin.show(ID) !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
    if(card) DIR.cine({ letterbox:false, dur:1.5, card }); }
  function beat(p, r, ev){ const near = clamp(1.2 - (r.z - pSeg()) / 260, .25, 1);
    if(ev === 'impact'){ const big = r.r > .18; embers(r.z, r.x, 0, reduce ? 6 : big ? 26 : 10, big ? 1.3 : .8, 1); smoke(r.z, r.x, .05, reduce ? 1 : big ? 4 : 2, big ? .3 : .2, .55, 0, .8);
      if(r.hz){ boom(near); if(p.cut && !reduce) p.cut.hit(3 + 4 * near); p.scorch.push(r); } else thud(.5 * near); }
    else if(ev === 'bounce'){ if(r.r > .15){ thud(.35 * near); embers(r.z, r.x, 0, reduce ? 2 : 6, .6, 1); } } }
  // the flight: the helper flies the arc; this adds the slow motion over the top and the hard landing
  function launch(p){ const J = MECH.sp_jump; if(!J || !J.launch) return false;
    const ok = J.launch({ fromSeg:p.B, landSeg:p.B + GAP, peakH:PEAK, startH:HR + DEEP, landH:DEEP, slowmo:false, onLand:() => land(p) });
    if(ok){ p.launched = true; whoosh(); hiss(1.4); if(DIR && DIR.cine) DIR.cine({ slowmo:{ scale:reduce ? .72 : .4, at:.05, hold:reduce ? .3 : .42 }, dur:.9 }); }
    return ok; }
  function land(p){ p.landed = true; p.landT = Tg; crunch(); if(DIR && DIR.cine) DIR.cine({ slowmo:{ scale:reduce ? .8 : .2, hold:.05 }, shake:reduce ? 0 : 13, dur:.25 });
    if(!reduce) shake = Math.max(shake, 13);
    const z = p.B + GAP + 4; smoke(z, -.5, 0, reduce ? 2 : 5, .32, .35, 0, .7); smoke(z, .5, 0, reduce ? 1 : 4, .3, .35, 0, .7); embers(z, playerX, 0, reduce ? 10 : 34, 1.4, 1, 3);
    boostTier = Math.max(boostTier || 0, 2); boostT = Math.max(boostT, 1.6); speed = Math.max(speed, MAXS * 1.12); flow++; bestFlow = Math.max(bestFlow, flow); if(typeof hud === 'function') hud();
    if(DIR && DIR.done) DIR.done(ID); }
  MECH.sp_lava = {
    plans, CARD, atContact, frontX, _S:S, _preview:k => preview(k),
    // tests: the hazards ahead { id, z, x (where it will be as you reach it), r, landed }
    hazards(ahead){ const ps = pSeg(), out = []; for(const p of plans){ if(p.off || p.done) continue; for(const r of p.bombs){ if(!r.hz) continue; if(r.Z < ps - 2 || r.Z > ps + (ahead || 140)) continue; out.push({ id:r.id, z:r.Z, x:atContact(r), r:r.r, landed:ps >= r.K[3].s, now:r.x }); } } return out; },
    hits(){ let n = 0; for(const p of plans) n += p.hits; return n; },
    report(){ return plans.map(p => ({ B:p.B, m:p.m, off:p.off, hits:p.hits, hit:p.bombs.filter(r => r.hit).map(r => r.id), launched:p.launched, landed:p.landed, maxJ:p.maxJ, wet:p.wet || 0 })); },
    warm(){ for(let k = 0; k < 4; k++) S['b' + k] = bombShape(k * 5 + 3, 26 + k % 3 * 2);
      for(const N of DS) for(let v = 0; v < 3; v++) for(let f = 0; f < 2; f++){ S['sL' + N + '_' + v + '_' + f] = smokeSpr(N, v, f, SMK.L); S['sD' + N + '_' + v + '_' + f] = smokeSpr(N, v, f, SMK.D); }
      for(const w of FW) for(let v = 0; v < 3; v++) for(let f = 0; f < 3; f++) S['fr' + w + '_' + v + '_' + f] = frontSpr(v, f, w);
      for(let f = 0; f < 3; f++) S['fl' + f] = flameSpr(f); for(let v = 0; v < 4; v++) S['bolt' + v] = boltSpr(v);
      if(!S.field){ buildField(); S.field = true; }
      if(!RC){ RC = can(RW, RW); RG = RC.getContext('2d', { willReadFrequently:true }); RI = RG.createImageData(RW, RW); }
      if(!LC){ LC = can(LW, LH); LG = LC.getContext('2d', { willReadFrequently:true }); LI = LG.createImageData(LW, LH); LU = new Uint32Array(LI.data.buffer); }
      if(!UB){ UB = can(UBW, UBW); UG = UB.getContext('2d', { willReadFrequently:true }); UB2 = can(UBW, UBW); UG2 = UB2.getContext('2d'); }
      try{ cx.save(); for(const k in S) if(S[k] && S[k].width) cx.drawImage(S[k], 0, 0, 1, 1); cx.drawImage(LC, 0, 0, 1, 1); cx.drawImage(UB, 0, 0, 1, 1); cx.restore(); cx.clearRect(0, 0, PX * 2, PX * 2); }catch(e){} },
    reset(){ for(const p of plans){ if(p.cut){ p.cut.end(); p.cut = null; } p.on = false; p.lastPs = null; p.hits = 0; for(const r of p.bombs) r.hit = false; } for(const q of SP) q.on = false; for(const q of EP) q.on = false; cur = null; },
    place(i, s, L){ if(i === 0){ for(const p of plans) if(p.cut) p.cut.end(); plans.length = 0; }
      for(const p of plans) if(!p.off) lay(p, i, s);
      decide(i, s, L); },
    hitCar(){ const p = cur; if(!p) return false; const d = pSeg() - p.B; return d > -PRE && d < END; },
    update(dt){ Tg += dt; stepP(dt); const ps = pSeg(); for(const q of plans) if(!q.off && !q.done && (!q.flat1 || !q.flat2) && segs[q.B] && segs[q.B].lbP === q) flatten(q, ps);
      const p = active(ps); cur = p; if(!p) return;
      const a = p.lastPs === null ? ps : p.lastPs, B = p.B, X = v => a < v && ps >= v, s = ps - B; p.lastPs = ps; const play = state === 'play';
      if(!p.hzSwept && ps > B - PRE - 200){ p.hzSwept = true; for(let j = B - PRE; j <= B + END; j++) if(segs[j]) segs[j].hz = null; }
      deform(p, ps);
      if(play && !p.on && s >= -PRE && s < GAP){ p.on = true; if(DIR && DIR.cine) p.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, duck:.45, shake:reduce ? 0 : 3, guard:{ from:B - PRE + 10, to:B + END }, dur:0 }); rumble(.07); }
      if(play && X(B + T_CARD)) showCard();
      // the quake: the ground never stops trembling, harder as the flow arrives, with a jolt at every crater pulse
      const q = s < -PRE ? 0 : s < FRC ? .45 + .25 * sm((s + PRE) / 300) : s < 0 ? .85 : s < GAP ? .3 : .3 * (1 - sm((s - GAP) / 90));
      if(play && !reduce && q > 0) shake = Math.max(shake, 1.6 * q);
      p.rumT -= dt; if(q > .02 && p.rumT <= 0){ p.rumT = .8; rumble(.035 + .07 * q); }
      p.pulseT -= dt; if(s > -PRE && s < -20 && p.pulseT <= 0){ p.pulseT = 1.05 + H1(Math.floor(Tg * 3)) * .5; p.pulse = Tg; if(play && !reduce) shake = Math.max(shake, 3.5); if(play) thud(.25); }
      // bombs: pose and beats from the rider's segment (a jump in position fires each beat once)
      for(const r of p.bombs){ pose(r, ps); if(a < ps) for(let k = 0; k < r.K.length; k++){ const kn = r.K[k]; if(kn.ev && a < kn.s && ps >= kn.s){ pose(r, kn.s); beat(p, r, kn.ev); pose(r, ps); } } }
      // the breach: the crater-side wall goes as the flow crests it, the bay-side one as the front reaches it
      const xf = frontX(p, ps);
      if(!p.wallsM && s > -95){ p.wallsM = true; dropWalls(p, p.m); crackS(1); for(let j = 0; j < GAP; j += 4) embers(B + j + 1, p.m * 1.15, .3, reduce ? 2 : 7, .9, 1, 1); if(ac()){ const t0 = M.ac.currentTime; M.noise(.08, 4200, .08, t0); M.tone(880, .08, { type:'square', v:.02, at:t0 + .02 }); } embers(B + GAP / 2, p.m * 1.15, .25, reduce ? 6 : 24, 1, 1, GAP * .8); smoke(B + GAP * .5, p.m * 1.2, .3, reduce ? 2 : 6, .5, .6, 1); }
      if(!p.wallsN && s > -90){ p.wallsN = true; dropWalls(p, -p.m); }
      if(play && !p.est && s > GIVE){ p.est = true; boom(.8); hiss(1); if(DIR && DIR.cine){ DIR.cine({ slowmo:{ scale:reduce ? .78 : .45, hold:.7 }, shake:reduce ? 0 : 7, dur:1.5 }); } p.estT = 0; }
      // the push-in toward the breach during the slow-motion shot (real seconds; the director has already written CAM.zoom this frame)
      if(p.estT !== undefined && p.estT < 2.6){ p.estT += dt / ((window.TIME && TIME.scale) || 1); const t = p.estT, zk = t < 1 ? sm(t) : 1 - sm((t - 1.4) / 1.1);
        if(!reduce && window.CAM && zk > 0) CAM.zoom = Math.max(CAM.zoom || 1, 1 + .1 * zk); }
      if(X(B + SAG0 + 8) || X(B + SAG0 + 30) || X(B + HV0 + 10) || X(B + HV0 + 40)) crackS(.8);
      // smoke and embers off the lava (heavier as the channel fills), and from the lip of the heave
      { const fk = fountK(p, ps); if(fk > .05 && s >= FT_HAND){ p.frT = (p.frT || 0) - dt; if(p.frT <= 0){ p.frT = reduce ? .3 : .13; const z = B + (GAP >> 1) + (rnd() - .5) * 6; smoke(z, p.m * 1.75 + (rnd() - .5) * .8, 5.5 + rnd() * 1.5, 1, .5 + rnd() * .4, .7, 1, 1.5); embers(z, p.m * 1.75, 1.5 * fk, reduce ? 1 : 4, .7, 1, 3); } } }
      const lavaOn = s > FR0 - 40 && s < GAP + 60;
      if(lavaOn){ for(const sm0 of p.sm){ sm0.t -= dt; if(sm0.t <= 0){ sm0.t = (reduce ? 1.6 : .8) + H1(Tg * 7 + sm0.x) * .6; const xx = sm0.x; if((xx - xf) * p.m >= 0) smoke(sm0.z, xx, .05, 1, .45 + H1(sm0.z) * .25, .35, 1, 1.4); } }
        if(!reduce || H1(Tg * 31) < .3){ const n = s > FR1 ? 3 : 1; for(let k = 0; k < n; k++){ const xx = (rnd() - .5) * 6; if((xx - xf) * p.m >= 0) embers(B + 2 + rnd() * (GAP - 4), xx, .02, 1, .1, -1, 1); } } }
      if(s > HV0 && s < 0){ p.stT = (p.stT || 0) - dt; if(p.stT <= 0){ p.stT = reduce ? .35 : .14; const sl = p.slabs[Math.floor(rnd() * p.slabs.length)]; if(sl && sl.row) smoke(sl.z0, sl.xL + (sl.xR - sl.xL) * rnd(), .05, 1, .22 + rnd() * .2, .5, rnd() < .5 ? 1 : 0, .9); } }
      if(!reduce) for(const r of p.bombs) if(r.splat && r.landed && rnd() < dt * 2.5) smoke(r.Z + (rnd() - .5) * 2, r.x + (rnd() - .5) * .3, .05, 1, .16, .4, 0, .8);
      // the heave: hold the speed up the ramp; the lip launches you whatever your line or speed
      if(play && s >= -RAMP && s < 0 && !p.launched) speed = Math.max(speed, MAXS * .85);
      if(play && !p.launched && s >= 0 && s < GAP - 4) launch(p);
      if(p.launched && !p.landed){ p.maxJ = Math.max(p.maxJ || 0, AIR.h); }
      // the hit: a bomb on the road where you are as you pass it (never in the air)
      if(play && cool <= 0 && AIR.h < 6){ const bw = bikeHalf() - HIT_GRACE;
        for(const r of p.bombs){ if(!r.hz || r.hit || !r.landed) continue; if(Math.abs(ps - r.z) > Math.max(1.2, r.r * 6)) continue; if(Math.abs(playerX - r.x) > r.r * .85 + bw) continue;
          r.hit = true; p.hits++; crash({ x:r.x, z:r.z * SEG }); } }
      // safety net: never ride into the channel on the ground (counted for the tests; the helper always flies you over)
      if(s > 1 && s < GAP - 1 && !(MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying())) p.wet = (p.wet || 0) + 1;
      if(s > GAP + END - 20 && p.cut){ p.cut.end(); p.cut = null; }
      if(s > END){ p.done = true; } },
    drawBackdrop(o){ const p = cur; if(!p) return; crater(p, o); },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = cur; if(!p) return; const i = s.index, B = p.B, ps = pSeg(), o = i - B;
      if(i < B - PRE - 30 || i > B + END) return;
      if(i === Math.min(B + (GAP >> 1), segAt(position).index + DRAW - 2 - EDGE_N)) fountainFar(p, i, now);   // the fountain from its own segment (or the farthest drawn one) while the channel is far
      if(s.lbNear) drawNear(s, sx0, sy0, uw, fog, now);
      if(o >= -RAMP && o < 0 && o === nearRamp(p, now)) rampBatch(p, s, fog, now, ps);
      if(o >= 0 && o <= GAP && o === nearChan(p, now)) chanBatch(p, s, fog, now, ps);
      if(o > GAP && o < GAP + 3 && p.landT !== undefined) { /* the landing scuff */ scuff(p, s, fog); }
      for(const r of p.scorch) if(Math.floor(r.Z) === i) scorch(r, s, fog, ps);
      if(!(o >= -1 && o <= GAP && nearChan(p, now) >= 0)){ for(const q of SP) if(q.on && Math.floor(q.z) === i) puffW(s, q, fog, now); for(const q of EP) if(q.on && Math.floor(q.z) === i) ember(s, q, fog, now); }
      for(const r of p.bombs) if(r.vis && Math.floor(r.z) === i) drawBomb(r, s, fog, now, ps); },
    overlay(now){ const p = cur; if(!p) return; screenFX(p, now); },
    drawScreen(now){ const p = cur; if(!p) return; underLight(p, now); } };

  // ---------------------------------------------------------------- drawing helpers
  const PJ = { x:0, y:0, w:0, cz:0, sc:0 };
  function proj(s, f){ const a = s.p1, b = s.p2; PJ.x = a.screen.x + (b.screen.x - a.screen.x) * f; PJ.y = a.screen.y + (b.screen.y - a.screen.y) * f; PJ.w = a.screen.w + (b.screen.w - a.screen.w) * f; PJ.cz = a.camera.z + (b.camera.z - a.camera.z) * f; PJ.sc = a.screen.scale + (b.screen.scale - a.screen.scale) * f; return PJ; }
  // a pixel line: the same squares as before, but squares on one row that touch are merged into one rect (the same pixels, far fewer calls)
  function pline(x0, y0, x1, y1, col, w){ const n = Math.min(240, Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / PX))); cx.fillStyle = col; let rx = 0, ry = 0, rw = 0, on = false;
    for(let k = 0; k <= n; k++){ const t = k / n, X = snp(x0 + (x1 - x0) * t - w / 2), Y = snp(y0 + (y1 - y0) * t - w / 2);
      if(on && Y === ry && X <= rx + rw && X + w >= rx){ const nx = Math.min(rx, X); rw = Math.max(rx + rw, X + w) - nx; rx = nx; continue; }
      if(on) cx.fillRect(rx, ry, rw, w); rx = X; ry = Y; rw = w; on = true; }
    if(on) cx.fillRect(rx, ry, rw, w); }

  // ---------------------------------------------------------------- the crater during the event (behind the road): the eruption peaks
  // a pulse of incandescence at the crater every second or so (a jolt in the ground with it), a fountain of spatter above the vent,
  // lightning branching in the plume's root, bombs thrown out onto the flanks with short cooling trails
  const BB = []; for(let k = 0; k < 40; k++) BB.push({ on:false, x:0, y:0, vx:0, vy:0, t:0, gy:0, land:-1 });
  let bbT = 0;
  function crater(p, o){ const E = ENV.sakurajima, C = E && E.crater ? E.crater() : null; if(!C || !(C.x > 0)) return; const ps = pSeg(), s = ps - p.B; if(s < -PRE - 40 || s > GAP + 80) return;
    const k = s < -PRE ? 0 : s < FRC ? sm((s + PRE) / 120) : s < GAP ? 1 : 1 - sm((s - GAP) / 80), now = o.now, cxr = C.x, cyr = C.y;
    if(k <= .01) return;
    const pa = p.pulse !== undefined ? clamp(1 - (Tg - p.pulse) / .55, 0, 1) : 0, pk = reduce ? .25 : pa;
    glow(cxr, cyr - PX * 2, PX * (14 + 26 * pk), '#ff6a20', (.3 + .45 * pk) * k);
    glow(cxr, cyr - H * .05, PX * (30 + 30 * pk), '#ff4a18', (.12 + .2 * pk) * k);
    // the fountain over the vent
    const fr = Math.floor(now / (reduce ? 700 : 90)); for(let j = -5; j <= 5; j++){ const hgt = Math.floor(H1(fr * 17 + j * 5) * (3 + 7 * pk) * (1 - Math.abs(j) / 6) * k); for(let y = 0; y <= hgt; y++){ cx.fillStyle = y === hgt ? '#ffd060' : y < 2 ? '#fff0a0' : '#ff8a28'; cx.fillRect(snp(cxr + j * PX), snp(cyr - (y + 1) * PX), PX, PX); } }
    // lightning in the plume, at the pulses (never under reduced motion)
    if(!reduce && p.pulse !== undefined && Tg - p.pulse < .16 && H1(Math.floor(p.pulse * 10)) < .75){ const v = Math.floor(p.pulse * 7) & 3, spr = S['bolt' + v], bx = cxr + (H1(p.pulse * 3) - .3) * W * .08, by = cyr - H * (.05 + H1(p.pulse * 5) * .05);
      if(spr){ glow(bx, by - spr.height * PX * .5, PX * 60, '#b8a8ff', .35); blit(spr, snp(bx), snp(by), PX); } }
    // bombs onto the flanks
    const dtb = clamp((now - (p.bbNow || now)) / 1000, 0, .05); p.bbNow = now;
    if(!reduce){ bbT -= dtb; if(bbT <= 0){ bbT = .07 + H1(now * .013) * .12; for(const b of BB) if(!b.on){ const a = -Math.PI / 2 + (H1(now * .7) - .5) * 1.6, v = (40 + H1(now * .31) * 70) * PX / 3; b.on = true; b.x = 0; b.y = 0; b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v * 1.4; b.t = 0; b.land = -1; break; } }
      const g = 90 * PX / 3, slope = .52;
      for(const b of BB){ if(!b.on) continue; b.t += dtb; if(b.land < 0){ b.x += b.vx * dtb; b.vy += g * dtb; b.y += b.vy * dtb; if(b.y > Math.abs(b.x) * slope && b.vy > 0){ b.land = b.t; b.y = Math.abs(b.x) * slope; } }
        const age = b.land < 0 ? 0 : b.t - b.land; if(age > 1.6 || b.t > 4){ b.on = false; continue; }
        const X = snp(cxr + b.x), Y = snp(cyr + b.y);
        if(b.land < 0){ cx.fillStyle = '#9a240c'; cx.fillRect(snp(X - b.vx / 60 * 2), snp(Y - b.vy / 60 * 2), PX, PX); cx.fillStyle = '#ff7a1a'; cx.fillRect(snp(X - b.vx / 60), snp(Y - b.vy / 60), PX, PX); cx.fillStyle = '#fff0a0'; cx.fillRect(X, Y, PX, PX); }
        else { cx.fillStyle = age < .4 ? '#ffb43a' : age < .9 ? '#e8541a' : '#6e180c'; cx.fillRect(X, Y, PX, PX); } } }
    // the sky over the crater lit by the lightning for an instant
    if(!reduce && p.pulse !== undefined && Tg - p.pulse < .08){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = 'rgba(150,130,255,.05)'; cx.fillRect(0, 0, W, o.hz); cx.globalCompositeOperation = 'source-over'; } }

  // ---------------------------------------------------------------- the fountain (Kilauea fissure 8, 2018; Fagradalsfjall 2021)
  // A curtain of incandescent spatter over a stepped core column, the glow under its plume, clots thrown out with cooling trails. Until
  // the channel is near it is drawn from the backdrop (screen space, anchored on the road's far end, where the channel will be: last
  // frame's projection), then from the channel (the same drawing). Its height is max(a quarter of the screen, its world size), so it never
  // shrinks or jumps at the hand-over. The blobs' world arcs start at its foot (K[0]: x m*1.75, h .4), so they leave it as they go.
  const FCOL = ['#fff0a0', '#ffd060', '#ffb43a', '#ff7a1a', '#c4360e', '#6e180c'];
  const fountH = w => Math.max(H * .27, w * 6.6);
  function fountainFar(p, j, now){ const ps = pSeg(); if(ps - p.B >= FT_HAND) return; const fk = fountK(p, ps); if(fk <= .01) return;
    const q = segs[j]; let bx = W / 2, by = HZ, w = 0;
    if(q && q.p1.camera.z > DEPTH && q.p1.screen.scale){ bx = q.p1.screen.x + p.m * 1.75 * q.p1.screen.w; by = q.p1.screen.y - q.p1.screen.w * .15; w = q.p1.screen.w; }
    fountain(p, bx, by, fountH(w), fk, now); }
  function fountain(p, bx, by, Hs, fk, now){ const t = reduce ? now * .00035 : now * .001, m = p.m, sz = Math.max(PX, Math.min(PX * 2, snp(Hs * .011))), Wc = Hs * .13, hf = Hs * fk;
    // the glow under its plume (additive; the plume itself is the crater's ash and the lit smoke it sheds)
    glow(bx, by - hf * .62, Hs * .8, '#ff4a14', .24 * fk); glow(bx, by - hf * .28, Hs * .45, '#ff7a20', .3 * fk); glow(bx, by - PX * 2, Hs * .2, '#ffd060', .4 * fk);
    // the core column: one strip per pixel column, hard colour steps, hotter low and in the middle, its top torn per column
    const nc = Math.max(3, Math.round(Wc * 2 / sz)), fr = Math.floor(t * 14);
    for(let i = 0; i < nc; i++){ const u = (i + .5) / nc * 2 - 1, au = Math.abs(u), hc = hf * .8 * Math.sqrt(1 - au) * (.7 + .3 * H1(fr * 31 + i * 7)); if(hc < sz) continue;
      const X = snp(bx + u * Wc), sh = au > .7 ? 2 : au > .4 ? 1 : 0; let yb = snp(by);
      for(let b = 0; b < 4; b++){ const yt = snp(by - hc * Math.min(1, [.3, .55, .8, 1][b] * (.92 + .16 * H1(i * 3.1 + b + fr)))); if(yt >= yb) continue; cx.fillStyle = FCOL[Math.min(5, b + sh)]; cx.fillRect(X, yt, sz, yb - yt); yb = yt; } }
    // the spatter: arcs off the vent, coloured by age in hard steps, each with one pixel of trail a step cooler
    // (most fall back close round the vent, so the curtain is dense; a third are thrown wide. Two trail pixels make each a streak, as
    // fountains read in every photograph of them)
    const NS = reduce ? 40 : 130;
    for(let k = 0; k < NS; k++){ const T = .75 + .6 * H1(k * 1.9), ph = (t / T + H1(k * 3.3)) % 1, hk = hf * (.45 + .6 * H1(k * 7.1)), x0 = (H1(k * 1.3) - .5) * Wc * .9, vx = (H1(k * 5.7) - .5) * Hs * (k % 5 ? .32 : .62) - m * Hs * .08;
      const ci = ph < .22 ? 0 : ph < .42 ? 2 : ph < .64 ? 3 : ph < .84 ? 4 : 5, s2 = k % 7 === 0 ? sz * 2 : sz;
      for(let tr = 2; tr >= 1; tr--){ const pq = ph - tr * .022; if(pq < 0) continue; cx.fillStyle = FCOL[Math.min(5, ci + tr)]; cx.fillRect(snp(bx + x0 + vx * pq), snp(by - 4 * hk * pq * (1 - pq)), sz, sz); }
      cx.fillStyle = FCOL[ci]; cx.fillRect(snp(bx + x0 + vx * ph), snp(by - 4 * hk * ph * (1 - ph)), s2, s2); }
    // clots thrown wide: a hot core with a cooling trail, falling away behind the horizon
    const big = Math.min(PX * 3, Math.max(PX * 2, snp(sz * 2)));   // (capped: near the camera bigger squares read as blocks, not clots)
    for(let k = 0; k < (reduce ? 3 : 8); k++){ const T = 1.5 + .7 * H1(k * 4.1 + 9), ph = ((t / T + H1(k * 2.7 + 5)) % 1) * 1.15, hk = hf * (.85 + .3 * H1(k * 6.3)), vx = (k & 1 ? 1 : -1) * Hs * (.3 + .4 * H1(k * 8.9)) - m * Hs * .1;
      for(let tr = 4; tr >= 0; tr--){ const q = ph - tr * .028; if(q < 0) continue; const X = bx + vx * q, Y = by - 4 * hk * q * (1 - q); if(Y > by + PX) continue;
        if(tr){ cx.fillStyle = FCOL[Math.min(5, 1 + tr)]; cx.fillRect(snp(X - sz / 2), snp(Y - sz / 2), sz, sz); }
        else { cx.fillStyle = ph < .6 ? FCOL[2] : FCOL[3]; cx.fillRect(snp(X - big / 2), snp(Y - big / 2), big, big); cx.fillStyle = ph < .6 ? FCOL[0] : FCOL[1]; cx.fillRect(snp(X - big / 2), snp(Y - big / 2), PX, PX); } } } }
  // a crack across the road along an edge of the channel (inside its footprint): a dark broken line with a glowing core that crawls
  function lipCrack(p, z0, dir, k, fog, now){ if(k < .02) return; const n = 22, crawl = reduce ? 0 : now / 110; let px0 = 0, py0 = 0, ok0 = false;
    for(let i = 0; i <= n; i++){ const X = -1.2 + 2.4 * i / n + (i && i < n ? (ih(i, z0) - .5) * .06 : 0), P = hp(X, z0 + dir * (.1 + .3 * ih(i * 3, z0 + 1)), 0); if(!P.ok){ ok0 = false; continue; }
      const x1 = P.x, y1 = P.y, w = P.w;
      if(ok0){ const wd = Math.max(PX, Math.min(PX * 3, snp(w * .014 * (.4 + k)))), lv = k + (((i * 1.7 + crawl) % 6) < 1.2 ? .35 : 0);
        pline(px0, py0, x1, y1, fc('#0b0608', fog * .3), wd); pline(px0, py0 - (wd > PX ? PX : 0), x1, y1 - (wd > PX ? PX : 0), fc(lv > 1.1 ? '#fff0a0' : lv > .8 ? '#ffb43a' : lv > .5 ? '#ff7a1a' : '#c4360e', fog * .2), PX);
        if(i % 6 === 3) glow(x1, y1, w * .3, '#ff5a18', .14 * k); }
      px0 = x1; py0 = y1; ok0 = true; } }

  // ---------------------------------------------------------------- the heave: tears across the bent asphalt, glowing from the flow below
  function heaveSeg(p, s, fog, now, ps){ const g = heaveK(p, ps); if(g < .05) return; const i = s.index, o = i - p.B;
    for(const c of p.cr){ if(c.j !== i || !c.ramp) continue; crackLine(s, c, sm((g - .1) / .7), fog, now, 1); }
    // the lip: the broken edge of the slab, lit from the channel below; light and heat rising over it
    if(o === -1){ const a = proj(s, 1), w = a.w; if(w > 2){ const n = 18; let px0 = 0, py0 = 0;
        for(let k = 0; k <= n; k++){ const X = -1.15 + 2.3 * k / n, jag = (H1(k * 3.7 + p.B) - .5) * .05 * w, xx = a.x + X * w, yy = a.y + jag; if(k){ pline(px0, py0, xx, yy, fc('#0b0608', fog * .3), Math.max(PX, snp(w * .012))); pline(px0, py0 - PX, xx, yy - PX, fc(g > .5 ? '#ff8e26' : '#c4360e', fog * .2), PX); } px0 = xx; py0 = yy; }
        const sg = sagK(p, ps); if(sg > .1){ const lit = (.18 + .1 * Math.sin(now / 160)) * sg * (1 - fog); glow(a.x, a.y - w * .1, w * 1.1, '#ff5a18', lit); glow(a.x - w * .6, a.y - w * .05, w * .6, '#ff7a20', lit * .7); glow(a.x + w * .6, a.y - w * .05, w * .6, '#ff7a20', lit * .7); } } } }
  function nearRamp(p, now){ if(p.nrNow === now) return p.nr; p.nrNow = now; p.nr = -99; const b = segAt(position).index; for(let j = Math.max(p.B - RAMP, b + 1); j < p.B; j++){ const q = segs[j]; if(q && q.p1.camera.z > DEPTH && q.p1.screen.scale){ p.nr = j - p.B; break; } } return p.nr; }
  // a point on the heave: x half-road widths, z segments (absolute), h world units above the deformed road; false when not projected
  const SPt = { x:0, y:0, w:0, ok:false };
  function hp(x, z, h){ const jj = Math.floor(z), q = segs[jj]; if(!q || !(q.p1.camera.z > DEPTH) || !q.p1.screen.scale || !q.p2.screen.scale){ SPt.ok = false; return SPt; } const P = proj(q, z - jj), hh = h * clamp((P.cz - 500) / 900, 0, 1);
    SPt.x = P.x + x * P.w; SPt.y = P.y - P.sc * hh * H / 2; SPt.w = P.w; SPt.ok = true; return SPt; }
  const QX = new Float64Array(8);
  function q4(col){ poly(QX[0], QX[1], QX[2], QX[3], QX[4], QX[5], QX[6], QX[7], col); }
  const SLT = ['#0c0b0f', '#121016', '#18161d', '#201d26', '#2a2631'], PAINT = '#a49c8c';
  const PL = new Float64Array(80);
  // a whole jagged face as one polygon, its corners on the pixel grid (no sliver seams between strips)
  let BAT = false, MODE = 3, TONEF = 0;
  function polyN(n, col){ if(BAT){ cx.moveTo(snp(PL[0]), snp(PL[1])); for(let i = 1; i < n; i++) cx.lineTo(snp(PL[i * 2]), snp(PL[i * 2 + 1])); cx.closePath(); return; } cx.fillStyle = col; cx.beginPath(); cx.moveTo(snp(PL[0]), snp(PL[1])); for(let i = 1; i < n; i++) cx.lineTo(snp(PL[i * 2]), snp(PL[i * 2 + 1])); cx.closePath(); cx.fill(); }
  // The heave as broken asphalt: the glowing bed first (dark red with crawling hot seams under every gap), then the slabs far to near:
  // each its broken near face (dark, lit from the cracks below at its foot), its top (toned by its tilt), the lane paint and kerbs it
  // carries (offset from its neighbours'), a lit top edge, and rubble at the joint in front of it. Steam and smoke rise from the gaps.
  function rampBatch(p, s, fog, now, ps){ const g = heaveK(p, ps); if(g < .03) return; const B = p.B, crawl = reduce ? 0 : now / 110, fl = reduce ? 1 : .8 + .2 * Math.sin(now / 150);
    // the bed: hot seams under the gaps, so whatever the slabs leave open glows
    for(let j = B - RAMP; j < B; j++){ const q = segs[j]; if(!q || !(q.p1.camera.z > DEPTH)) continue; const a = q.p1.screen, b = q.p2.screen;
      poly(a.x - a.w * 1.16, a.y, a.x + a.w * 1.16, a.y, b.x + b.w * 1.16, b.y, b.x - b.w * 1.16, b.y, fc('#120a0c', fog * .4)); }
    for(const sl of p.slabs){ if(!sl.row) continue; const z = (sl.near[1] + sl.z0) / 2; let px0 = 0, py0 = 0, ok0 = false;
      for(let k = 0; k < sl.n; k++){ const P = hp(sl.near[k * 2], sl.z0 + (sl.near[k * 2 + 1] - sl.z0) * .5, 0); if(P.ok && ok0){ const ph = (k * 1.3 + crawl + sl.row * 2.1) % 5, lv = g + (ph < 1.3 ? .4 : 0); pline(px0, py0, P.x, P.y, fc(lv > 1.2 ? '#fff0a0' : lv > .9 ? '#ffb43a' : lv > .6 ? '#ff7a1a' : '#c4360e', fog * .2), Math.max(PX, Math.min(PX * 2, snp(P.w * .012)))); } px0 = P.x; py0 = P.y; ok0 = P.ok; } }
    // the slabs, far row first
    // row by row, far to near: all of a row's faces in one fill, its lit feet in one, its tops in one per tone, then the line work
    for(let r = 11; r >= 0; r--){ BAT = true;
      cx.fillStyle = fc('#100c12', fog * .6); cx.beginPath(); MODE = 0; for(const sl of p.slabs) if(sl.row === r) drawSlab(p, sl, g, fog, now); cx.fill();
      if(g > .3 && r){ cx.fillStyle = fc(g > .6 ? '#4a140a' : '#2a0e0a', fog * .3); cx.beginPath(); MODE = 1; for(const sl of p.slabs) if(sl.row === r) drawSlab(p, sl, g, fog, now); cx.fill(); }
      MODE = 2; for(let t = 0; t < 5; t++){ TONEF = t; cx.fillStyle = fc(SLT[t], fog); cx.beginPath(); for(const sl of p.slabs) if(sl.row === r) drawSlab(p, sl, g, fog, now); cx.fill(); }
      BAT = false; MODE = 3; for(const sl of p.slabs) if(sl.row === r) drawSlab(p, sl, g, fog, now); }
    // the lip: the broken edge of the last slab row, lit from the channel below; light and heat rising over it
    { const a = segs[B - 1]; if(a && a.p1.camera.z > DEPTH){ const P = proj(a, 1), w = P.w, sg = sagK(p, ps); if(sg > .1 && w > 2){ const lit = (.18 + .1 * Math.sin(now / 160)) * sg * (1 - fog); glow(P.x, P.y - w * .15, w * 1.1, '#ff5a18', lit); glow(P.x - w * .6, P.y - w * .08, w * .6, '#ff7a20', lit * .7); glow(P.x + w * .6, P.y - w * .08, w * .6, '#ff7a20', lit * .7); } } } }
  // the asphalt's texture, by screen size: aggregate in deliberate clusters (a pale stone and its shadow pixel), hairline cracks, a tar seam
  // (dark and glossy, a lit pixel on it), and on the near lip the warm under-glow of the seam below it
  function slabTex(sl, hz, g, tone, fog, now){ const mid = hp((sl.xL + sl.xR) / 2, (sl.z0 + sl.z1) / 2, 0); if(!mid.ok || mid.w < 70 || fog > .6) return; const w = mid.w, pale = fc(SLT[Math.min(4, tone + 2)], fog), dark = fc('#07060a', fog);
    const nc = Math.min(14, Math.round(w / 40)), sz = w > 400 ? PX * 2 : PX;
    for(let c = 0; c < nc; c++){ const cxw = sl.xL + .06 + (sl.xR - sl.xL - .12) * H1(sl.z0 * 1.7 + c * 5.3 + sl.xL), czw = sl.z0 + .3 + (sl.z1 - sl.z0 - .6) * H1(sl.z1 * 2.3 + c * 3.1);
      for(let k = 0; k < 4; k++){ const x = cxw + (H1(c * 9.1 + k * 2.7 + sl.z0) - .5) * .09, z = czw + (H1(c * 4.7 + k * 6.1 + sl.xR) - .5) * .5, P = hp(x, z, hz(x, z)); if(!P.ok) continue;
        cx.fillStyle = pale; cx.fillRect(snp(P.x), snp(P.y), sz, sz); cx.fillStyle = dark; cx.fillRect(snp(P.x), snp(P.y) + sz, sz, PX); } }
    for(let c = 0; c < 2; c++){ let x = sl.xL + .1 + (sl.xR - sl.xL - .2) * H1(sl.z0 * 3.9 + c * 11), z = sl.z0 + .3 + (sl.z1 - sl.z0 - .6) * H1(sl.xR * 5 + c), P = hp(x, z, hz(x, z)); if(!P.ok) continue; let x0 = P.x, y0 = P.y;
      for(let k = 0; k < 5; k++){ x += (H1(c * 7 + k * 3.3 + sl.z1) - .5) * .12; z += .12 + H1(k + c * 5 + sl.z0) * .2; if(z > sl.z1 - .1) break; P = hp(x, z, hz(x, z)); if(!P.ok) break; pline(x0, y0, P.x, P.y, dark, PX); x0 = P.x; y0 = P.y; } }
    if(sl.xR - sl.xL > .5 && H1(sl.z0 * 6.1 + sl.xL) < .6){ const z = sl.z0 + (sl.z1 - sl.z0) * (.35 + .3 * H1(sl.xR)); let px0 = 0, py0 = 0, ok0 = false;
      for(let k = 0; k <= 6; k++){ const x = sl.xL + .05 + (sl.xR - sl.xL - .1) * k / 6, zz = z + Math.sin(k * 1.7 + sl.z0) * .12, P = hp(x, zz, hz(x, zz)); if(P.ok && ok0){ pline(px0, py0, P.x, P.y, fc('#050407', fog), w > 300 ? PX * 2 : PX); if(k === 3) { cx.fillStyle = fc('#5a5466', fog); cx.fillRect(snp(P.x), snp(P.y) - PX, PX, PX); } } px0 = P.x; py0 = P.y; ok0 = P.ok; } }
    if(sl.row && g > .3){ const lit = g * (.6 + .4 * clamp(sl.row / 11, 0, 1)); let px0 = 0, py0 = 0, ok0 = false;   // the near lip, warmed from the seam below
      for(let k = 0; k < sl.n; k++){ const x = sl.near[k * 2], z = sl.near[k * 2 + 1] + .08, P = hp(x, z, hz(x, z)); if(P.ok && ok0) pline(px0, py0 + PX, P.x, P.y + PX, fc(lit > .8 ? '#b0481c' : lit > .5 ? '#7a2c14' : '#46180e', fog * .3), PX); px0 = P.x; py0 = P.y; ok0 = P.ok; } } }
  function drawSlab(p, sl, g, fog, now){ const n = sl.n, hz = (x, z) => (sl.hN + (sl.hF - sl.hN) * clamp((z - sl.z0) / (sl.z1 - sl.z0), 0, 1) + sl.tl * x) * g, TH = 70 * g;
    const tilt = (sl.hF - sl.hN) * g / ((sl.z1 - sl.z0) * SEG), tone = clamp(2 + sl.tv + Math.round(tilt * 7 + sl.tl * g / 260), 0, 4), top = fc(SLT[tone], fog), face = fc('#100c12', fog * .6), foot = fc(g > .4 ? '#6e180c' : '#2a1010', fog * .3);
    if(MODE === 2 && tone !== TONEF) return;
    // its broken near face, from its top edge down below the bed (seen where it stands proud of the slab in front)
    { let m = 0; for(let k = 0; k < n; k++){ const x = sl.near[k * 2], z = sl.near[k * 2 + 1], A = hp(x, z, hz(x, z)); if(!A.ok) return; PL[m++] = A.x; PL[m++] = A.y; }
      for(let k = n - 1; k >= 0; k--){ const x = sl.near[k * 2], z = sl.near[k * 2 + 1], A = hp(x, z, Math.min(hz(x, z) - TH, 0)); PL[m++] = A.x; PL[m++] = A.y; } if(MODE === 0){ polyN(n * 2, face); return; }
      if(sl.row && g > .3){ m = 0; for(let k = 0; k < n; k++){ const x = sl.near[k * 2], z = sl.near[k * 2 + 1], hb = Math.min(hz(x, z) - TH, 0), A = hp(x, z, hb + (hz(x, z) - hb) * .4); PL[m++] = A.x; PL[m++] = A.y; }
        for(let k = n - 1; k >= 0; k--){ const x = sl.near[k * 2], z = sl.near[k * 2 + 1], A = hp(x, z, Math.min(hz(x, z) - TH, 0)); PL[m++] = A.x; PL[m++] = A.y; } if(MODE === 1) polyN(n * 2, fc(g > .6 ? '#4a140a' : '#2a0e0a', fog * .3)); } if(MODE === 1) return; }   // the face's foot, lit by the seam below
    if(MODE === 3) for(let k = 0; k + 1 < n; k++){ const xa = sl.near[k * 2], za = sl.near[k * 2 + 1], xb = sl.near[k * 2 + 2], zb = sl.near[k * 2 + 3];
      const D = hp(xa, za, Math.min(hz(xa, za) - TH, 0)), Dx = D.x, Dy = D.y; if(!D.ok) return; const C = hp(xb, zb, Math.min(hz(xb, zb) - TH, 0)); if(!C.ok) return;
      if(sl.row && g > .25){ const ph = (k * 1.3 + now / (reduce ? 400 : 110) + sl.row * 2.1) % 5, lv = g + (ph < 1.4 ? .45 : 0) + ((k * 7 + sl.row) % 3 === 0 ? -.3 : 0);
        pline(Dx, Dy, C.x, C.y, fc(lv > 1.25 ? '#fff0a0' : lv > .95 ? '#ffb43a' : lv > .65 ? '#ff7a1a' : '#c4360e', fog * .15), Math.max(PX, Math.min(PX * 3, snp(C.w * .02)))); } }
    if(MODE === 3 && sl.row && g > .5 && fog < .6){ const P = hp((sl.xL + sl.xR) / 2, sl.z0, 0); if(P.ok){ glow(P.x, P.y, P.w * .45, '#ff5a18', .17 * g * (1 - fog)); if(P.w > 30 && !reduce) for(let k = 0; k < 3; k++){ const Q = hp(sl.xL + (sl.xR - sl.xL) * H1(sl.z0 + k * 3.3), sl.z0 - .1, 0); if(Q.ok && ((now / 90 + k * 5 + sl.row) | 0) % 4){ cx.fillStyle = '#ffb43a'; cx.fillRect(snp(Q.x), snp(Q.y) - PX, PX * 2, PX); } } } }
    // its top
    { let m = 0; for(let k = 0; k < n; k++){ const x = sl.near[k * 2], z = sl.near[k * 2 + 1], P = hp(x, z, hz(x, z)); if(!P.ok) return; PL[m++] = P.x; PL[m++] = P.y; }
      for(let k = n - 1; k >= 0; k--){ const x = sl.far[k * 2], z = sl.far[k * 2 + 1], P = hp(x, z, hz(x, z)); if(!P.ok) return; PL[m++] = P.x; PL[m++] = P.y; } if(MODE === 2){ polyN(n * 2, top); return; } }
    slabTex(sl, hz, g, tone, fog, now);
    { const sh = fc(SLT[Math.max(0, tone - 2)], fog), zs = t0 => sl.z1 - (sl.z1 - sl.z0) * t0;
      let m = 0, ok = true; for(let k = 0; k < n && ok; k++){ const x = sl.far[k * 2], z = sl.far[k * 2 + 1], w0 = .18 + .12 * H1(k * 3.3 + sl.z0), za = z - (z - sl.z0) * w0, P = hp(x, za, hz(x, za)); ok = P.ok; PL[m++] = P.x; PL[m++] = P.y; }
      for(let k = n - 1; k >= 0 && ok; k--){ const x = sl.far[k * 2], z = sl.far[k * 2 + 1], P = hp(x, z, hz(x, z)); ok = P.ok; PL[m++] = P.x; PL[m++] = P.y; } if(ok) polyN(n * 2, sh);
      // the far lip faces the channel: the hottest light, an orange band along it, stronger toward the lip of the heave
      if(g > .3 && sl.row > 2){ const hot = clamp((sl.row - 2) / 9, 0, 1) * g; let px0 = 0, py0 = 0, ok0 = false;
        for(let k = 0; k < n; k++){ const x = sl.far[k * 2], z = sl.far[k * 2 + 1], P = hp(x, z, hz(x, z)); if(P.ok && ok0){ pline(px0, py0, P.x, P.y, fc(hot > .6 ? '#d8601e' : hot > .3 ? '#8a3014' : '#4a1a0e', fog * .3), PX); if(hot > .5) pline(px0, py0 + PX, P.x, P.y + PX, fc('#5a1c0e', fog * .3), PX); } px0 = P.x; py0 = P.y; ok0 = P.ok; } } }
    // the paint it carries: lane dashes (shifted with the slab) and the kerb blocks
    for(const lx of [-1 / 3, 1 / 3]){ const x = lx + sl.sh; if(x < sl.xL + .04 || x > sl.xR - .04) continue;
      for(let z = Math.ceil(sl.z0 / 6) * 6; z < sl.z1; z += 6){ const za = Math.max(z, sl.z0 + .25), zb = Math.min(z + 3, sl.z1 - .25); if(zb - za < .3) continue;
        let P = hp(x - .022, za, hz(x, za) + 2); if(!P.ok) continue; QX[0] = P.x; QX[1] = P.y; P = hp(x + .022, za, hz(x, za) + 2); QX[2] = P.x; QX[3] = P.y; P = hp(x + .022, zb, hz(x, zb) + 2); if(!P.ok) continue; QX[4] = P.x; QX[5] = P.y; P = hp(x - .022, zb, hz(x, zb) + 2); QX[6] = P.x; QX[7] = P.y; q4(fc(PAINT, fog)); } }
    for(const sd of [-1, 1]){ if(sd < 0 ? sl.xL > -1.05 : sl.xR < 1.05) continue; const x0 = sd * 1.0, x1 = sd * 1.13;
      for(let z = Math.floor(sl.z0); z < sl.z1; z++){ const za = Math.max(z, sl.z0 + .2), zb = Math.min(z + 1, sl.z1 - .2); if(zb <= za) continue;
        let P = hp(x0, za, hz(x0, za) + 2); if(!P.ok) continue; QX[0] = P.x; QX[1] = P.y; P = hp(x1, za, hz(x1, za) + 2); QX[2] = P.x; QX[3] = P.y; P = hp(x1, zb, hz(x1, zb) + 2); if(!P.ok) continue; QX[4] = P.x; QX[5] = P.y; P = hp(x0, zb, hz(x0, zb) + 2); QX[6] = P.x; QX[7] = P.y;
        q4(fc(Math.floor(z / 3) % 2 ? '#a8a0b4' : '#8a2030', fog)); } }
    // the lit top edge of its near face (moon and headlight), broken where the asphalt crumbled
    let px0 = 0, py0 = 0, ok0 = false; for(let k = 0; k < n; k++){ const x = sl.near[k * 2], z = sl.near[k * 2 + 1], P = hp(x, z, hz(x, z)); if(P.ok && ok0 && (k + sl.row) % 5) pline(px0, py0, P.x, P.y, fc('#6a6274', fog), PX); px0 = P.x; py0 = P.y; ok0 = P.ok; }
    // rubble at the joint in front of it: broken asphalt chunks with lit tops
    if(sl.row) for(let k = 0; k < 5; k++){ const u = H1(sl.z0 * 3.1 + k * 7.7 + sl.xL), x = sl.xL + (sl.xR - sl.xL) * u, z = sl.z0 - .05 - H1(k + sl.xR * 9) * .25, P = hp(x, z, 0); if(!P.ok) continue;
      const w = Math.max(PX, snp(P.w * (.03 + H1(k * 3 + sl.z0) * .04))); if(w > PX * 12) continue; cx.fillStyle = fc('#1c1820', fog); cx.fillRect(snp(P.x - w / 2), snp(P.y - w), w, w); cx.fillStyle = fc('#585060', fog); cx.fillRect(snp(P.x - w / 2), snp(P.y - w), w, PX); } }
  // a crack polyline across segment s: a dark gash (wider as it opens) with a hot core that crawls (lava under the slab)
  const CP = new Float64Array(64);
  function crackPts(c, L, m){ let n = 0; for(let k = 0; k < L.length && n < 30; k++){ const dz = L[k][1], jj = c.j + Math.floor(dz), q = segs[jj]; if(!q || !(q.p1.camera.z > DEPTH) || !q.p1.screen.scale){ CP[n * 2] = NaN; CP[n * 2 + 1] = NaN; n++; continue; }
      const P0 = proj(q, dz - Math.floor(dz)); CP[n * 2] = P0.x + L[k][0] * P0.w; CP[n * 2 + 1] = P0.y; n++; } return n; }
  function crackLine(s, c, open, fog, now, hot){ const w0 = s.p1.screen.w; if(w0 < 3) return; const wd = Math.min(PX * 3, Math.max(PX, snp(w0 * .02 * (.3 + .7 * open)))), crawl = reduce ? 0 : now / 110, rise = c.rise * open * s.p1.screen.scale * H / 2;
    for(let b = 0; b < (c.br ? 2 : 1); b++){ const L = b ? c.br : c.pts, n = crackPts(c, L);
      for(let k = 1; k < n; k++){ const x0 = CP[k * 2 - 2], y0 = CP[k * 2 - 1], x1 = CP[k * 2], y1 = CP[k * 2 + 1]; if(!(x0 === x0) || !(x1 === x1)) continue; const ww = b ? Math.max(PX, wd - PX) : wd;
        // the riser: the far slab stands proud of the near one by rise (a lit lip on its top edge), only along the main tear
        if(!b && rise > PX * .8){ poly(x0, y0 - ww * .5, x1, y1 - ww * .5, x1, y1 - ww * .5 - rise, x0, y0 - ww * .5 - rise, fc('#141218', fog)); pline(x0, y0 - ww * .5 - rise, x1, y1 - ww * .5 - rise, fc('#5a5262', fog), PX); }
        pline(x0, y0, x1, y1, fc('#0b0608', fog * .5), ww);
        if(hot && open > .3){ const ph = (k * 1.3 + crawl + c.j * .7) % 5, lv = c.heat * open + (ph < 1.2 ? .35 : 0) - (b ? .2 : 0); if(lv > .3 && (k + c.j) % 4 !== 0) pline(x0, y0, x1, y1, fc(lv > 1 ? '#fff0a0' : lv > .75 ? '#ffb43a' : lv > .5 ? '#ff7a1a' : '#c4360e', fog * .2), PX); } } }
    if(hot && open > .5 && fog < .6 && c.heat > .5 && c.pts.length > 3){ const q = segs[c.j]; if(q && q.p1.camera.z > DEPTH){ const P1 = proj(q, .5), mid = c.pts[c.pts.length >> 1][0]; glow(P1.x + mid * P1.w, P1.y, P1.w * .35, '#ff5a18', .12 * c.heat * open * (1 - fog)); } } }

  // ---------------------------------------------------------------- the channel: lava raster, far bank face, front, smoke and embers
  // drawn once per frame in the nearest visible channel segment's drawSeg (its clip covers every channel row; each row was already
  // clipped to its own segment's s.clip, so the heave's crest still hides what lies behind it)
  function nearChan(p, now){ if(p.ncNow === now) return p.nc; p.ncNow = now; p.nc = -99; const b = segAt(position).index; for(let j = Math.max(p.B, b + 1); j <= p.B + GAP; j++){ const q = segs[j]; if(q && q.p1.camera.z > DEPTH && q.p1.screen.scale){ p.nc = j - p.B; break; } } return p.nc; }
  const LW = 1024, LH = 640, RST = new Int32Array(LH); let LC = null, LG = null, LI = null, LU = null, FRN = 0;
  const LPU = new Map(); let lpK = '';
  function lpal(q){ if(FOG_COL !== lpK){ lpK = FOG_COL; LPU.clear(); } let t = LPU.get(q); if(t) return t; t = new Uint32Array(LPAL.length);
    LPAL.forEach((c, i) => { const v = hx(mixc(c, FOG_COL, q / 8 * (LEMIT[i] ? .8 * (1 - LEMIT[i] * .75) : .8))); t[i] = (255 << 24 | v[2] << 16 | v[1] << 8 | v[0]) >>> 0; }); LPU.set(q, t); return t; }
  function chanBatch(p, s, fog, now, ps){ const sg = sagK(p, ps), xf = frontX(p, ps);
    if(meltK(p, ps) > 0) drawLava(p, now, ps, xf, sg);
    const B = p.B;
    // the fountain: a column of incandescent spatter beyond the crater-side wall, its arcs falling back, lit smoke above it
    { const fk = fountK(p, ps); if(fk > .01 && ps - B >= FT_HAND){ const q = segs[B + (GAP >> 1)]; if(q && q.p1.camera.z > DEPTH && q.p1.screen.scale){ const P = q.p1.screen; fountain(p, P.x + p.m * 1.75 * P.w, P.y - P.w * .15, fountH(P.w), fk, now); } } }
    // the edges of the melt: the far one cracks first (the bank breaking away), the near lip last, until the heave takes it
    { const mk0 = meltK(p, ps), g0 = heaveK(p, ps); lipCrack(p, B + GAP, -1, sm(mk0 / .3) * (1 - sg), fog, now); lipCrack(p, B, 1, sm((mk0 - .12) / .5) * (1 - sm(g0 / .3)), fog, now); }
    const mk = meltK(p, ps); if(mk > .05){ const fl = reduce ? 1 : .85 + .15 * Math.sin(now / 130);
      for(let j = B - 6; j < B + GAP + 6; j += 6){ const q = segs[j]; if(!q || !(q.p1.camera.z > DEPTH)) continue; const P = proj(q, .5); for(const sd of [-1, 1]) glow(P.x + sd * 1.15 * P.w, P.y - P.w * .18, P.w * .7, '#ff6a1a', .22 * mk * fl); }   // the barriers lit
      for(let j = B; j < B + GAP; j += 6){ const q = segs[j]; if(!q || !(q.p1.camera.z > DEPTH)) continue; const P = proj(q, .5); glow(P.x + (H1(j) - .5) * P.w, P.y - P.w * .3, P.w * 1.2, '#ff6a1a', .12 * mk * fl); }   // (lifted off the surface and fainter: it washed the melt's plates flat)
      const q = segs[B - 4]; if(q && q.p1.camera.z > DEPTH){ const P = proj(q, .5); glow(P.x, P.y, P.w * 1.6, '#ff5014', .2 * mk * fl); } }
    // before it crests the wall: the glow and smoke of the flow coming down behind the embankment
    if(!p.wallsM){ const e = clamp((ps - B - FR0 + 30) / 40, 0, 1); if(e > 0){ const q = segs[B + (GAP >> 1)]; if(q && q.p1.camera.z > DEPTH){ const P = proj(q, .5); glow(P.x + p.m * 1.6 * P.w, P.y - P.w * .2, P.w * 1.4, '#ff5a18', .22 * e); glow(P.x + p.m * 1.4 * P.w, P.y - P.w * .25, P.w * .6, '#ffa040', .2 * e); } } }
    { const sb = ps - B; if(sb > FR0 - 30 && sb < GAP){ const q = segs[B + (GAP >> 1)]; if(q && q.p1.camera.z > DEPTH){ const P = proj(q, .5), e = clamp((sb - FR0 + 30) / 40, 0, 1), fl = reduce ? 1 : .85 + .15 * Math.sin(now / 170), x0 = P.x + (xf + p.m * 1.2) * .5 * P.w;
        glow(x0, P.y - P.w * .3, P.w * 1.3, '#ff5a18', .12 * e * fl); } } }
    // cracks in the sagging road the lava has not covered yet
    if(sg > .05 && xf * p.m > -1.05) for(const c of p.cr){ if(c.ramp) continue; const q = segs[c.j]; if(!q || !(q.p1.camera.z > DEPTH)) continue; crackPart(q, c, xf, p.m, sg, q.clip); }
    for(let j = B + GAP; j >= B - 1; j--){ for(const q of SP) if(q.on && Math.floor(q.z) === j){ const sgq = segs[j]; if(sgq && sgq.p1.camera.z > DEPTH) puffW(sgq, q, 0, now); }
      for(const q of EP) if(q.on && Math.floor(q.z) === j){ const sgq = segs[j]; if(sgq && sgq.p1.camera.z > DEPTH) ember(sgq, q, 0, now); }
      for(const q of KP) if(q.on && Math.floor(q.z) === j){ const sgq = segs[j]; if(sgq && sgq.p1.camera.z > DEPTH) drawChunk(sgq, q, now); } } }
  // a block of clinker tumbling off the front: dark, a moonlit top, its underside and core still glowing, turning as it rolls
  function drawChunk(s, q, now){ const P = proj(s, q.z - s.index); if(!(P.w > 0)) return; const R0 = q.r * P.w, x = P.x + q.x * P.w, y = P.y - (q.h + q.r) * P.w, cool = q.t / 2.2;
    if(R0 > PX * 2.5 && S.b0){ rasterBomb(S['b' + ((q.sp * 3) & 3)], x, y, P.w, P.cz, q.r, q.sp + q.t * 6, q.sp, q.t * 4, 0, 0, R0, .78 - cool * .2, now, q.sp * 9); return; }
    const w = Math.max(PX, snp(R0 * 2)); cx.fillStyle = '#150b0d'; cx.fillRect(snp(x - w / 2), snp(y - w / 2), w, w); cx.fillStyle = cool < .5 ? '#ff7a1a' : '#9a240c'; cx.fillRect(snp(x - w / 2), snp(y + w / 2) - PX, w, PX); if(w > PX * 2){ cx.fillStyle = '#4a4246'; cx.fillRect(snp(x - w / 2), snp(y - w / 2), w, PX); } }
  function crackPart(q, c, xf, m, sg, clip){ const n = crackPts(c, c.pts), wd = Math.max(PX, snp(q.p1.screen.w * .02 * sg));
    for(let k = 1; k < n; k++){ const x0 = CP[k * 2 - 2], y0 = CP[k * 2 - 1], x1 = CP[k * 2], y1 = CP[k * 2 + 1]; if(!(x0 === x0) || !(x1 === x1) || y1 >= clip || y0 >= clip) continue;
      if((c.pts[k][0] - xf) * m >= 0 || (c.pts[k - 1][0] - xf) * m >= 0) continue; pline(x0, y0, x1, y1, '#0b0608', wd); if(sg > .6 && k % 3) pline(x0, y0, x1, y1, '#6e180c', PX); } }
  // The lava raster. Rows are found per channel segment (flat sunk plane: screen rows map to depth through the segment's scale, so the
  // texture is perspective-correct), clipped to the segment's own s.clip. Per pixel: the plate field sampled at the pixel's world point
  // (sheared along the flow), its seam drawn by distance in pixels (a seam is never thinner than one pixel or a halo wider than one).
  function drawLava(p, now, ps, xf, sg){ if(!LU) return; const cw = cx.canvas.width, chh = cx.canvas.height; if(cw > LW || chh > LH) return;
    const B = p.B, m = p.m, ip = 1 / PX, tt = reduce ? now * .00025 : now * .001, crawl = (reduce ? now * .02 : now * .09) | 0, wallUp = !p.wallsM;
    let ry0 = 1e9, ry1 = -1; FRN++; const mk = meltK(p, ps);
    for(let c = 0; c < NC * NC; c++){ CWm[c] = .45 + .95 * (.5 + .5 * Math.sin(tt * 2.1 + CH[c] * 40)); TORN[c] = Math.sin(tt * .8 + CH[c] * 29) > .8 ? 1 : 0; }   // seams opening and closing, plates tearing open
    const fl = tt * 1.05;                        // the flow's drift (half-road widths per second at the centre line)
    for(let j = B + GAP - 1; j >= B; j--){ const q = segs[j]; if(!q) continue; const a = q.p1, b = q.p2; if(!(a.camera.z > DEPTH) || !a.screen.scale || !b.screen.scale) continue;
      const y1 = a.screen.y, y2 = b.screen.y; if(!(y1 > y2 + .01)) continue;
      const r0 = Math.max(0, Math.ceil(y2 * ip - .5)), r1 = Math.min(chh - 1, Math.ceil(y1 * ip - .5) - 1, Math.ceil(q.clip * ip - .5) - 1); if(r1 < r0) continue;
      const fq = Math.round(clamp(Math.pow((j - segAt(position).index) / DRAW, 1.6), 0, 1) * 8), T = lpal(fq);
      const s1 = a.screen.scale, s2 = b.screen.scale, is1 = 1 / s1, is2 = 1 / s2;
      for(let r = r0; r <= r1; r++){ const yc = (r + .5) * PX, f = (y1 - yc) / (y1 - y2), sc = s1 + (s2 - s1) * f, fz = (1 / sc - is1) / (is2 - is1);
        const xc = a.screen.x + (b.screen.x - a.screen.x) * f, w = a.screen.w + (b.screen.w - a.screen.w) * f; if(!(w > 0)) continue;
        const zz = j + fz, zc = (zz - B) / GAP, hc = 1 - (2 * zc - 1) * (2 * zc - 1), fp = PX / w;   // hc: the heat across the channel (0 at the banks, 1 in the middle)
        const shim = reduce ? 0 : Math.sin(r * .9 + now * .012) * fp * .5 * (hc > .5 ? 1 : 0);
        const sh = fl * hc;                     // shear: the middle of the flow runs, the levees stay
        const v = (zz - B) * .1, levee = zc < .1 || zc > .9;
        const tsc = levee ? 3 : 1, tv = ((v / TEX) * tsc) % TS, ivr = ((tv | 0) + TS * 64) & (TS - 1), row = ivr * TS, fv = tv - Math.floor(tv), row2 = ((ivr + 1) & (TS - 1)) * TS;
        const bil = fp / TEX < .7 && !levee, sw = .003 + .008 * hc, seamC = hc > .66 ? 2 : hc > .3 ? 1 : 0, molF = .015 + .05 * hc * hc;
        const scN = s1 + (s2 - s1) * Math.min(1.5, (y1 - yc + PX) / (y1 - y2)), dzr = Math.abs((1 / scN - 1 / sc) / (is2 - is1)) * .1, mini = dzr > .12;   // the depth one row spans (half-road widths)
        const gq = .06 + .16 * hc, cq = Math.max(.25, dzr);
        const base = r * LW; if(r < ry0) ry0 = r; if(r > ry1) ry1 = r; LU.fill(0, base, base + cw); RST[r] = FRN;
        const hwL = (0 - xc) / w, dx = PX / w;
        for(let x = 0; x < cw; x++){ const u = hwL + (x + .5) * dx;
          if(wallUp && u * m > 1.12) continue;
          let ci;
          if(mini){ // far: crust in coarse world cells with sparse glints; cells still road until the melt reaches them
            const cxq = Math.floor((u + sh) / cq), czq = Math.floor((zz - B) * .1 / cq), g = ih(cxq * 3 + Math.floor((x * PX - xc) / w / fp * .5), czq);
            const mlt = ih(cxq, czq + 99) * .5 + (1 - zc) * .5;
            if(mlt > mk){ const nr = mlt - mk; if(nr < .1){ ci = mk > .15 && g < .1 ? 9 : nr < .04 ? 12 : 26; LU[base + x] = T[ci]; } continue; }
            if(mk - mlt < .12){ ci = g < .3 ? 11 : g < .6 ? 10 : 13; LU[base + x] = T[ci]; continue; }
            ci = g < gq * .35 ? 10 : g < gq * .7 ? 9 : g < gq ? 8 : g < gq + .06 ? 7 : ih(cxq, czq) > .5 ? 2 : 3; LU[base + x] = T[ci]; continue; }
          const tu0 = ((u + sh + shim) / TEX) * tsc, tu = tu0 - Math.floor(tu0 / TS) * TS, iu = tu | 0, k = row + iu;
          let d = DF[k];
          if(bil){ const fu = tu - iu, iu2 = (iu + 1) & (TS - 1), d10 = DF[row + iu2], d01 = DF[row2 + iu], d11 = DF[row2 + iu2]; d = (d * (1 - fu) + d10 * fu) * (1 - fv) + (d01 * (1 - fu) + d11 * fu) * fv; }
          const id = CID[k], e = d * TEX / tsc - sw * (levee ? .4 : CWm[id]), epx = e / fp;
          { const melt = CH[id] * .5 + (1 - zc) * .5;   // which plates give way: the far edge first, plate by plate, the near edge last
            if(melt > mk){ // still road (the road itself shows through): its cracks glow as the lava under it rises, scorched just before it goes
              const near = melt - mk; if(near < .3){ if(epx < 0 && mk > .03) ci = near < .06 ? 10 : near < .15 ? 9 : 8; else if(epx < 1 && near < .12) ci = 7; else if(near < .035) ci = 12; else if(near < .07) ci = 26; else continue; LU[base + x] = T[ci]; }
              continue; }
            const dm = mk - melt, dpx = d * TEX / tsc / fp;   // dpx: pixels to the plate's border
            if(dm < .07){ // sinking: the slab tilts (its high half still road, its low half in shadow), a glowing seam all round it, widening
              const k2 = dm / .07; if(dpx < 1 + k2 * 2.5){ ci = dpx < .6 + k2 ? 11 : 10; LU[base + x] = T[ci]; continue; }
              if(dpx < 2 + k2 * 4){ ci = 9; LU[base + x] = T[ci]; continue; }
              const tl = (CH[id] * 13) % 1 < .5 ? TYo[k] : TXo[k], hi = tl * ((CH[id] * 29) % 1 < .5 ? 1 : -1) > 0;
              if(hi && k2 < .6) continue; ci = hi ? 27 : dpx < 4 + k2 * 6 ? 6 : 28; LU[base + x] = T[ci]; continue; }
            if(dm < .15){ // the lava wells up between the plates and floods over them: white at the seams, yellow, orange, a red front
              const fd = (dm - .07) / .08 * 15, dt2 = d / tsc; if(dt2 < fd){ ci = dt2 < fd * .3 ? 11 : dt2 < fd * .6 ? 10 : dt2 < fd - 1.2 ? 13 : 9; } else ci = dt2 < fd + 1.5 ? 6 : 28;
              LU[base + x] = T[ci]; continue; }
            if(dm < .24 && !levee){ const dc = DCn[k] * TEX, ring = (dc * 18 - tt * 2.2 + CH[id] * 9) % 1; ci = ring < (dm - .15) / .09 * .5 ? 14 : 13; LU[base + x] = T[ci]; continue; } }
          if(levee){ ci = epx < 0 ? (CH[id] > .7 ? 7 : 0) : epx < 1 ? 0 : CT[id] - 1; if(ci !== 7 && ((PH[k] * 37) & 255) > 251) ci = 6; LU[base + x] = T[ci]; continue; }
          if(epx < 0){ // a seam: its level by the heat across the channel, a pulse crawling along it, a core where it is wide
            let lv = seamC + (((PH[k] + crawl) & 255) < 34 ? 1 : 0) + (epx < -1.5 && -e > sw * .55 ? 1 : 0) + (hc > .7 && ((iu + ivr * 2 - (crawl << 1)) & 31) < 7 ? 1 : 0); ci = 8 + (lv > 3 ? 3 : lv); }
          else if(epx < 1) ci = hc > .35 ? 7 : 6;
          else if(epx < 2 && hc > .6) ci = 12;
          else if(CH[id] < molF || (TORN[id] && hc > .3)){ // a skylight: molten, its skin wrinkling in rings that drift
            const dc = DCn[k] * TEX, ring = (dc * 18 - tt * 2.2 + CH[id] * 9) % 1; ci = ring < .28 ? 14 : (ih(id, Math.floor(tt * 3)) > .7 && dc < .05) ? 15 : 13; }
          else { // crust: plate tone, ropes on the pahoehoe skin (only where they are 3+ pixels apart), ash speckle
            ci = CT[id]; const dc = DCn[k] * TEX; if(.03 / fp > 3 && ((dc / .03) % 1) < .2) ci = 4;
            const gs = fp * 2.5, gh = ih(Math.floor(u / gs), Math.floor((zz - B) * .1 / gs)); if(gh > .965) ci = 5; else if(gh < .03) ci = 1; }
          LU[base + x] = T[ci]; } }
      if(j === B + GAP - 1) bankFace(p, q, T, now, cw, chh, ip, (n0, n1) => { if(n0 < ry0) ry0 = n0; if(n1 > ry1) ry1 = n1; }); }
    if(ry1 < ry0) return;
    for(let r = ry0; r <= ry1; r++) if(RST[r] !== FRN) LU.fill(0, r * LW, r * LW + cw);
    LG.putImageData(LI, 0, 0, 0, ry0, cw, ry1 - ry0 + 1); cx.globalAlpha = 1; cx.imageSmoothingEnabled = false; cx.drawImage(LC, 0, ry0, cw, ry1 - ry0 + 1, 0, ry0 * PX, cw * PX, (ry1 - ry0 + 1) * PX);
    // the light off the channel on its surroundings: stepped and additive, strongest in the middle of the flow
    const q = segs[B + (GAP >> 1)]; if(q && q.p1.camera.z > DEPTH){ const P = proj(q, .5), cov = clamp((xf * -m + 3.6) / 7.2, 0, 1); if(cov > .05 && P.w > 2){ const fl2 = reduce ? 1 : .85 + .15 * Math.sin(now / 230);
        glow(P.x + (xf + m * 3) * .5 * P.w, P.y - P.w * .15, Math.min(W, P.w * 3.2), '#ff4a10', .1 * cov * fl2); } } }
  // the far bank's broken face (z = B+GAP), from the lava up to the road: the asphalt slab with a lit broken lip, the sub-base gravel, the
  // old lava beneath; the lower part lit by the flow in hard steps, an incandescent seep where it meets the lava
  function bankFace(p, q, T, now, cw, chh, ip, span){ const bk = segs[p.B + GAP]; if(!bk) return; const a = q.p2, t = bk.p1; if(!(t.camera.z > DEPTH) || !t.screen.scale) return;
    const yTop = t.screen.y, yBot = a.screen.y; if(!(yBot > yTop + PX)) return; const xc = t.screen.x, w = t.screen.w, clip = bk.clip;
    const r0 = Math.max(0, Math.ceil(yTop * ip - .5) - 2), r1 = Math.min(chh - 1, Math.ceil(yBot * ip - .5) - 1, Math.ceil(clip * ip - .5) - 1); if(r1 < r0) return; span(r0, r1);
    const hh = yBot - yTop, slab = .14, sub = .32;
    for(let r = r0; r <= r1; r++){ const yc = (r + .5) * PX, hv = (yBot - yc) / hh, base = r * LW;     // hv: 1 at the road, 0 at the lava
      LU.fill(0, base, base + cw); RST[r] = FRN;
      for(let x = 0; x < cw; x++){ const u = (x * PX + PX * .5 - xc) / w;
        const cj = Math.floor(u / .07), jag = (ih(cj, p.B) - .5) * .12 + (ih(cj, 5) > .85 ? -.1 : 0), hj = hv - jag * .5;
        if(hj > 1.02) continue;                                                                       // above the broken lip
        let ci;
        if(hj > 1 - slab){ ci = hj > .985 ? 18 : (ih(cj * 7, Math.floor(hj * 30)) > .8 ? 17 : 16); }   // the asphalt slab, its lit broken edge
        else if(hj > 1 - sub){ const g = ih(Math.floor(u * w / PX / 2), r); ci = g > .7 ? 20 : g > .25 ? 19 : 21; }   // gravel sub-base
        else { const st = Math.floor(hj * 9 + Math.sin(u * 3 + p.B) * .6); ci = ((st % 3) + 3) % 3 === 0 ? 22 : 21; if(ih(Math.floor(u * 24), st) > .9) ci = 16; }   // old lava, strata
        { const cb = Math.floor(u / .11), hb = .1 + .16 * ih(cb, p.B + 3); if(ih(cb, 77) > .55 && hj < hb && hj > .03){ LU[base + x] = T[hj > hb - .025 ? 18 : hj < .07 ? 23 : 16]; continue; } }   // slabs broken off the lip, fallen in
        if(hj < .08) ci = hj < .03 ? ((x + (now / 120 | 0)) % 5 === 0 ? 11 : 10) : 24; else if(hj < .2) ci = ci === 16 ? 23 : 24; else if(hj < .34 && ci !== 18) ci = 23;
        LU[base + x] = T[ci]; } } }

  // ---------------------------------------------------------------- bombs
  const TRL = new Float64Array(10);
  function drawBomb(r, s, fog, now, ps){ if(r.splat) return drawBlob(r, s, fog, now, ps); const P = proj(s, r.z - s.index); if(!(P.w > 0) || P.cz < r.r * ROADW + 380) return; const Rpx = r.r * P.w; if(Rpx < PX * .4) return;
    const X0 = P.x + r.x * P.w, Y0 = P.y - r.hc * P.w, sh = S['b' + (r.shp & 3)], hot = r.heat;
    // in the air: an incandescent head with a cooling trail behind it, its light on the ground below as it nears
    if(!r.landed){ const K = r.K; for(let t = 1; t <= 5; t++){ path(K, ps - t * 1.6); TRL[t * 2 - 2] = P.x + EV.x * P.w; TRL[t * 2 - 1] = P.y - (EV.h + .7 * r.r) * P.w; }
      const tw = Math.max(PX, snp(Rpx * .9)); for(let t = 4; t >= 0; t--){ const tx = TRL[t * 2], ty = TRL[t * 2 + 1]; cx.fillStyle = t > 3 ? fc('#3a2c2e', fog) : t > 2 ? '#6e180c' : t > 0 ? '#c4360e' : '#ff7a1a'; const ww = Math.max(PX, snp(tw * (1 - t * .15))); cx.fillRect(snp(tx - ww / 2), snp(ty - ww / 2), ww, ww); }
      glow(X0, Y0, Math.max(PX * 3, Rpx * 3), '#ff6a1a', .45 * (1 - fog * .5));
      if(r.h < 2.2 && r.hz){ const gp = (1 - r.h / 2.2); glow(P.x + r.x * P.w, P.y, Math.max(PX * 2, P.w * .35 * gp), '#ff5a18', .25 * gp * (1 - fog)); } }
    else if(Rpx > PX * 1.5){ // on the road: its light on the asphalt, a contact shadow
      glow(X0, P.y - PX, Math.max(PX * 3, Rpx * 2.2), '#ff5a18', (.1 + .2 * hot) * (1 - fog * .6));
      const gy = P.y - PX * .5, sw = Rpx * 1.1, shh = Math.max(PX, Rpx * .25); poly(X0 - sw, gy, X0 + sw, gy, X0 + sw * .75, gy + shh, X0 - sw * .75, gy + shh, 'rgba(4,2,4,.55)'); }
    if(Rpx < PX * 2.2){ const w2 = Math.max(PX, snp(Rpx * 2)), h2 = Math.max(PX, snp(Rpx * 1.6)); cx.fillStyle = hot > .8 ? '#ff7a1a' : fc(CRUST[2], fog * .5); pxRect(X0 - w2 / 2, Y0 - h2 / 2, w2, h2); cx.fillStyle = hot > .8 ? '#fff0a0' : '#e8541a'; pxRect(X0 - PX / 2, Y0 - PX / 2, PX, PX); return; }
    const ih = clamp((48 - P.cz / SEG) / 30, 0, 1) * clamp(1.6 - Math.abs(r.x - playerX) * .7, 0, 1);
    rasterBomb(sh, X0, Y0, P.w, P.cz, r.r, r.ax, r.ay, r.az, ih, fog, Rpx, hot, now, r.Z);
    // smoke from a landed bomb, and on the big ones a few tongues of fire where the crust has split
    if(r.landed && Rpx > PX * 3){ const fr = Math.floor(now / (reduce ? 400 : 110) + r.Z) % 3; if(r.hz && hot > .55 && Rpx > PX * 5){ const k2 = Math.min(PX * 2, Math.max(1, Math.round(Rpx * .45 / 11 / PX)) * PX); blit(S['fl' + fr], X0 - Rpx * .25, Y0 - Rpx * .3, k2); if(Rpx > PX * 9) blit(S['fl' + ((fr + 1) % 3)], X0 + Rpx * .3, Y0 - Rpx * .15, Math.max(PX, k2 - PX)); }
      if(fog < .6 && ((now / 16) | 0) % 9 === 0 && H1(now + r.Z) < .5) smoke(r.Z, r.x, r.r * 1.2, 1, r.r * 1.3, .45, 0, .8); } }
  // the bomb as pixel art: rockslide.js's hull raster with the bread crust's rules: hot seams where planes meet (broken into dashes by
  // crust), three bread-crust tears across the facets, the skin glowing while hot, a cool moon rim on the top, ash on the up faces once cold
  const RW = 256, FID = new Uint8Array(RW * RW), OXb = new Float32Array(RW * RW), OYb = new Float32Array(RW * RW), OZb = new Float32Array(RW * RW);
  const FB = new Uint8Array(64), FN = new Uint8Array(64), FT = new Uint8Array(64), FPI = new Uint16Array(64), FUP = new Float32Array(64);
  const VX = new Float64Array(64), VY = new Float64Array(64);
  let RC = null, RG = null, RI = null, rgbK = '';
  const RGB = new Map();
  const h3 = (x, y, z) => { let h = Math.imul(Math.floor(x), 374761393) ^ Math.imul(Math.floor(y), 668265263) ^ Math.imul(Math.floor(z), 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function palRGB(fog){ if(FOG_COL !== rgbK){ rgbK = FOG_COL; RGB.clear(); } const q = Math.round(clamp(fog, 0, 1) * 16); let t = RGB.get(q);
    if(!t){ t = new Uint8Array(BPAL.length * 3); BPAL.forEach((c, i) => { const v = hx(mixc(c, FOG_COL, q / 16 * (i >= 5 && i <= 13 ? .3 : .8))); t[i * 3] = v[0]; t[i * 3 + 1] = v[1]; t[i * 3 + 2] = v[2]; }); RGB.set(q, t); } return t; }
  function rasterBomb(sh, X0, Y0, pw, cz, rr, ax, ay, az, ih, fog, Rpx, hot, now, seed){ if(!RI) return false;
    const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
    const r00 = cc * cb - sc * sa * sb, r01 = -sc * ca, r02 = cc * sb + sc * sa * cb, r10 = sc * cb + cc * sa * sb, r11 = cc * ca, r12 = sc * sb - cc * sa * cb, r20 = -ca * sb, r21 = sa, r22 = ca * cb;
    const V = sh.V, n = sh.nv, PY0 = H / 2 - PITCH, ip = 1 / PX; let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for(let v = 0; v < n; v++){ const x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2], wx = (r00 * x + r01 * y + r02 * z) * rr, wy = (r10 * x + r11 * y + r12 * z) * rr, wz = (r20 * x + r21 * y + r22 * z) * rr;
      const f = cz / Math.max(60, cz + wz * ROADW), X = (W / 2 + (X0 + wx * pw - W / 2) * f) * ip, Y = (PY0 + (Y0 - wy * pw - PY0) * f) * ip; VX[v] = X; VY[v] = Y;
      if(X < mnx) mnx = X; if(X > mxx) mxx = X; if(Y < mny) mny = Y; if(Y > mxy) mxy = Y; }
    const cw = cx.canvas.width, chh = cx.canvas.height, x0 = Math.max(0, Math.floor(mnx) - 1), y0 = Math.max(0, Math.floor(mny) - 2), x1 = Math.min(cw, Math.ceil(mxx) + 2), y1 = Math.min(chh, Math.ceil(mxy) + 2), w = x1 - x0, h = y1 - y0;
    if(w <= 0 || h <= 0) return true; if(w > RW || h > RW) return false;
    for(let y = 0; y < h; y++) FID.fill(255, y * RW, y * RW + w);
    const sdm = MOON.x > X0 ? 1 : -1, F = sh.F; let nv = 0, skin = hot > .93;
    for(let k = 0; k < F.length && nv < 64; k++){ const f = F[k], a = f[0], b = f[1], c = f[2], ax2 = VX[a] - x0, ay2 = VY[a] - y0, bx = VX[b] - x0, by = VY[b] - y0, cx2 = VX[c] - x0, cy2 = VY[c] - y0;
      const det = (bx - ax2) * (cy2 - ay2) - (by - ay2) * (cx2 - ax2); if(det <= 0) continue;
      const nx = r00 * f[3] + r01 * f[4] + r02 * f[5], ny = r10 * f[3] + r11 * f[4] + r12 * f[5], nz = r20 * f[3] + r21 * f[4] + r22 * f[5];
      const key = .58 * ny + .42 * nx * sdm - .15 * nz, t = key > .7 ? 4 : key > .4 ? 3 : key > .12 ? 2 : key > -.15 ? 1 : 0, id = nv++;
      if(skin){ FB[id] = 5; FN[id] = 4; FT[id] = Math.min(3, Math.max(0, t - 1 + (ih > .5 ? 1 : 0))); } else { FB[id] = 0; FN[id] = 5; FT[id] = t; }
      FPI[id] = f[6] || k + 100; FUP[id] = f[4];
      const px0 = Math.max(0, Math.floor(Math.min(ax2, bx, cx2))), px1 = Math.min(w - 1, Math.ceil(Math.max(ax2, bx, cx2))), py0 = Math.max(0, Math.floor(Math.min(ay2, by, cy2))), py1 = Math.min(h - 1, Math.ceil(Math.max(ay2, by, cy2)));
      const id2 = 1 / det, Va = a * 3, Vb = b * 3, Vc = c * 3;
      for(let py = py0; py <= py1; py++){ const yc = py + .5; for(let px = px0; px <= px1; px++){ const xc = px + .5;
        const l2 = ((xc - ax2) * (cy2 - ay2) - (yc - ay2) * (cx2 - ax2)) * id2, l3 = ((bx - ax2) * (yc - ay2) - (by - ay2) * (xc - ax2)) * id2, l1 = 1 - l2 - l3;
        if(l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const i = py * RW + px; FID[i] = id;
        OXb[i] = l1 * V[Va] + l2 * V[Vb] + l3 * V[Vc]; OYb[i] = l1 * V[Va + 1] + l2 * V[Vb + 1] + l3 * V[Vc + 1]; OZb[i] = l1 * V[Va + 2] + l2 * V[Vb + 2] + l3 * V[Vc + 2]; } } }
    const T = palRGB(fog), d = RI.data, rp = Rpx * ip, SD = sh.sd, NSd = sh.ns, hl = hot > .93 ? 3 : hot > .8 ? 2 : hot > .6 ? 1 : 0, cr = reduce ? now * .0004 : now * .0016;
    const wO = Math.max(.6 / Math.max(1, rp), hot > .9 ? .03 : .018), lip = 1.2 / Math.max(1, rp), det = rp > 6;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * RW + x, o = i * 4, k = FID[i]; let ci = -1;
      if(k === 255){ if((x > 0 && FID[i - 1] !== 255) || (x + 1 < w && FID[i + 1] !== 255) || (y > 0 && FID[i - RW] !== 255) || (y + 1 < h && FID[i + RW] !== 255)) ci = 16; }
      else { const b = FB[k], nT = FN[k], t = FT[k], ox = OXb[i], oy = OYb[i], oz = OZb[i]; ci = b + t;
        const ku = y > 0 ? FID[i - RW] : 255;
        // the bread crust: the gap between the nearest two plate seeds
        let d1 = 9, d2 = 9, c1 = 0, c2 = 0; for(let c = 0; c < NSd; c++){ const ax3 = ox - SD[c * 3], ay3 = oy - SD[c * 3 + 1], az3 = oz - SD[c * 3 + 2], dd = ax3 * ax3 + ay3 * ay3 + az3 * az3; if(dd < d1){ d2 = d1; c2 = c1; d1 = dd; c1 = c; } else if(dd < d2){ d2 = dd; c2 = c; } }
        const g = (d2 - d1) / (2 * Math.hypot(SD[c1 * 3] - SD[c2 * 3], SD[c1 * 3 + 1] - SD[c2 * 3 + 1], SD[c1 * 3 + 2] - SD[c2 * 3 + 2])), pulse = ((ox * 1.7 + oy * 2.3 + oz * 1.1 - cr + seed * .1) % 1 + 1) % 1 < .22 ? 1 : 0;
        if(g < wO){ ci = 9 + Math.min(4, hl + pulse + (g < wO * .4 && rp > 12 ? 1 : 0)); }                                      // a crack, glowing from the hot core
        else if(g < wO + lip && det){ ci = skin ? 8 : b + Math.min(nT - 1, t + 1); }                                              // its torn lip, curled up and catching light
        else if(ku === 255 && t >= 1 && !skin) ci = 15;                                                                          // the moon rim on the top silhouette
        else if(det && !skin && FUP[k] > .2 && hot < .7 && h3(ox * 19, oy * 19, oz * 19) > .9) ci = 14;                           // ash settled on the up faces
        else if(det && h3(ox * 11, oy * 11, oz * 11) > .93) ci = b + Math.max(0, t - 1); }                                         // vesicles: small pits in the crust
      if(ci < 0){ d[o + 3] = 0; continue; }
      d[o] = T[ci * 3]; d[o + 1] = T[ci * 3 + 1]; d[o + 2] = T[ci * 3 + 2]; d[o + 3] = 255; }
    RG.putImageData(RI, 0, 0, 0, 0, w, h); cx.imageSmoothingEnabled = false; cx.drawImage(RC, 0, 0, w, h, x0 * PX, y0 * PX, w * PX, h * PX); return true; }
  // a molten blob: in the air a hot core with a cooling trail and its light on the road below; on the road a splash that spreads in the
  // first segments, rim bright, then crusts from the outside in, its last glow in cracks across it
  function drawBlob(r, s, fog, now, ps){ const P = proj(s, r.z - s.index); if(!(P.w > 0) || P.cz < 300) return;
    if(!r.landed){ const X0 = P.x + r.x * P.w, Y0 = P.y - (r.h + r.r * .5) * P.w, R0 = Math.max(PX, snp(r.r * P.w * .8));
      for(let t = 5; t >= 1; t--){ path(r.K, ps - t * 1.4); const tx = P.x + EV.x * P.w, ty = P.y - (EV.h + r.r * .5) * P.w, ww = Math.max(PX, snp(R0 * (1 - t * .13))); cx.fillStyle = t > 3 ? '#6e180c' : t > 1 ? '#c4360e' : '#ff7a1a'; cx.fillRect(snp(tx - ww / 2), snp(ty - ww / 2), ww, ww); }
      cx.fillStyle = '#ff8e26'; cx.fillRect(snp(X0 - R0), snp(Y0 - R0 * .8), R0 * 2, Math.max(PX, snp(R0 * 1.6))); const c2 = Math.max(PX, snp(R0 * .9)); cx.fillStyle = '#ffe080'; cx.fillRect(snp(X0 - c2 / 2), snp(Y0 - c2 / 2), c2, c2);
      glow(X0, Y0, Math.max(PX * 4, R0 * 4), '#ff6a1a', .5); if(r.hz && r.h < 2.4){ const gp = 1 - r.h / 2.4; glow(P.x + r.x * P.w, P.y, Math.max(PX * 3, P.w * .4 * gp), '#ff5a18', .3 * gp); } return; }
    const a = ps - r.K[3].s, RR = r.r * (.45 + .75 * sm(a / 10)), spread = a < 14, cxp = P.x + r.x * P.w, cyp = P.y;
    glow(cxp, cyp - PX, Math.max(PX * 3, RR * P.w * 2.4), '#ff5a18', .3 * (1 - fog * .5));
    rasterSplat(r, cxp, cyp, P.w, s, RR, spread, a, now, fog); }
  // a splat rasterised per pixel at its projected size: a pahoehoe toe (a lobed outline), a dark crust skin in tiles with glowing seams that
  // crawl (the channel's palette cycle), a white-yellow rim while it spreads then orange, spatter round it, the asphalt beyond it lit
  const SPC = ['#fff0a0', '#ffb43a', '#ff7a1a', '#c4360e', '#6e180c', '#2b1813', '#1f120f', '#3b231b', '#3a160e', '#ff8e26'], SPR = [];
  // the toe's outline: 64 steps of a pseudo-angle (the diamond angle: monotonic, no trig), interpolated; built once per splat
  const dia = (y, x) => y >= 0 ? (x >= 0 ? y / (x + y + 1e-12) : 1 - x / (y - x + 1e-12)) : (x < 0 ? 2 - y / (-x - y + 1e-12) : 3 + x / (x - y + 1e-12));
  function lobes(r){ const ph0 = r.Z * 1.7, L = new Float32Array(65); for(let k = 0; k <= 64; k++){ const a = k / 16, q = Math.floor(a) % 4, f = a - Math.floor(a), th = q * Math.PI / 2 + Math.atan2(f, 1 - f);
      L[k] = .8 + .14 * Math.sin(3 * th + ph0) + .08 * Math.sin(5 * th + ph0 * 1.3) + .04 * Math.sin(9 * th + ph0); } return L; }
  function rasterSplat(r, cxp, cyp, pw, s, RR, spread, age, now, fog){ if(!RI) return; if(!SPR.length) for(const c of SPC) SPR.push(hx(c)); const LB = r.lobe || (r.lobe = lobes(r));
    const zf = r.Z + 1, jj = Math.floor(zf), q = segs[jj]; if(!q || !(q.p1.camera.z > DEPTH)) return; const Q = proj(q, zf - jj), dyz = cyp - Q.y; if(!(dyz > .05)) return;
    const ip = 1 / PX, ext = RR * 1.5, x0 = Math.max(0, Math.floor((cxp - ext * pw) * ip)), x1 = Math.min(cx.canvas.width, Math.ceil((cxp + ext * pw) * ip)), y0 = Math.max(0, Math.floor((cyp - ext * 10 * dyz) * ip)), y1 = Math.min(cx.canvas.height, Math.ceil((cyp + ext * 10 * dyz) * ip));
    const w = x1 - x0, h = y1 - y0; if(w <= 1 || h <= 0 || w > RW || h > RW) return;
    const d = RI.data, fp = PX / pw, crawl = (reduce ? now * .02 : now * .09) | 0, ph0 = r.Z * 1.7, tx = 7 / TEX;
    const rope = .02 / fp > 3;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const o = (y * RW + x) * 4, X = (x0 + x + .5) * PX, Y = (y0 + y + .5) * PX, u = (X - cxp) / pw, v = (cyp - Y) / dyz * .1, d2 = u * u + v * v;
      const ia = dia(v, u) * 16, i0 = ia | 0, rr = RR * (LB[i0] + (LB[i0 + 1] - LB[i0]) * (ia - i0)), r2 = rr * rr; let ci = -1;
      if(d2 < r2){ const e1 = rr - 1.3 * fp, e2 = rr - 2.6 * fp;
        if(e1 <= 0 || d2 > e1 * e1) ci = spread ? 0 : 1; else if(e2 <= 0 || d2 > e2 * e2) ci = spread ? 1 : 2;
        else if(age < 5) ci = 9;
        else { const k = ((((v * tx) | 0) + 4096) & (TS - 1)) * TS + ((((u * tx) | 0) + 4096) & (TS - 1)), ep = DF[k] / tx / fp;
          if(ep < .9) ci = ((PH[k] + crawl) & 255) < 44 ? 0 : d2 < r2 * .25 ? 1 : 2; else if(ep < 1.8) ci = 4; else ci = rope && ((Math.sqrt(d2) / .02) % 1) < .18 ? 7 : CT[CID[k]] > 2 ? 5 : 6; } }
      else if(d2 < r2 * 2.1025){ const g = ih(Math.floor(u / fp / 1.5), Math.floor(v / fp / 1.5)); ci = g > .975 ? (age < 30 ? 1 : 3) : d2 < r2 * 1.3924 && ((x + y) & 1) === 0 ? 8 : -1; }
      if(ci < 0){ d[o + 3] = 0; continue; } const c = SPR[ci]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
    RG.putImageData(RI, 0, 0, 0, 0, w, h); cx.imageSmoothingEnabled = false; cx.drawImage(RC, 0, 0, w, h, x0 * PX, y0 * PX, w * PX, h * PX); }
  // the scar a landed bomb leaves: a dark splash on the asphalt with a ring of glowing spatter that cools
  function scorch(r, s, fog, ps){ const P = proj(s, r.Z - s.index); if(!(P.w > 4) || P.cz < 300) return; const X0 = P.x + r.x * P.w, Y0 = P.y, R = r.r * 1.6 * P.w, age = ps - r.K[3].s;
    poly(X0 - R, Y0, X0 + R, Y0, X0 + R * .7, Y0 + Math.max(PX, R * .12), X0 - R * .7, Y0 + Math.max(PX, R * .12), fc('#100a0c', fog));
    const n = 12, cool = clamp(age / 120, 0, 1); for(let k = 0; k < n; k++){ const a = H1(r.Z * 3 + k) * 6.283, d = R * (.7 + H1(r.Z + k * 1.7) * .6), xx = X0 + Math.cos(a) * d, yy = Y0 + Math.sin(a) * d * .18;
      cx.fillStyle = fc(cool < .3 ? (k % 3 ? '#ff7a1a' : '#ffb43a') : cool < .7 ? '#c4360e' : '#3a1410', fog * .4); const sz = P.w > 200 ? PX * 2 : PX; cx.fillRect(snp(xx), snp(yy), sz, sz); } }
  function scuff(p, s, fog){ const P = proj(s, .5); if(!(P.w > 4)) return; cx.fillStyle = fc('#120c0e', fog); for(const sd of [-1, 1]){ const x = P.x + (playerX * 0 + sd * .06) * P.w; pxRect(x - P.w * .02, P.y - PX, Math.max(PX, P.w * .04), PX); } }

  // ---------------------------------------------------------------- smoke and embers in the world
  function puff(x, y, D, v, ph, now, al, lit){ if(D < PX * 3 || x < -D || x > W + D || y < -D * 2 || y > H + D) return; const q = D / PX; let N = DS[0]; for(const n of DS) if(Math.abs(n - q) < Math.abs(N - q)) N = n;
    if(q > 120) al *= clamp(1 - (q - 120) / 60, 0, 1); if(al <= .02) return; const fr = ((now / (reduce ? 1200 : 420) + ph * 2) | 0) % 2;
    const wob = reduce ? 0 : Math.sin(now / 1100 + v * 2.3 + ph * 5) * D * .12, key = lit ? 'sL' : 'sD';
    cx.globalAlpha = al * .5; blit(S[key + N + '_' + ((v + 1) % 3) + '_' + (1 - fr)], snp(x - wob * 1.6 + D * .1), y - D * .08 + N * PX / 2, PX);   // a thin layer drifting the other way
    cx.globalAlpha = al; blit(S[key + N + '_' + (v % 3) + '_' + fr], snp(x + wob), y + N * PX / 2, PX); cx.globalAlpha = 1; }
  function puffW(s, q, fog, now){ const P = proj(s, q.z - s.index); if(!(P.w > 0) || P.cz < 1200) return; const life = q.t / q.life, al = (life < .2 ? life / .2 : 1 - (life - .2) / .8) * (1 - fog * .6) * .62 * clamp((P.cz - 1200) / 4000, 0, 1);
    puff(P.x + q.x * P.w, P.y - (q.h + q.r * .5) * P.w, q.r * 2.2 * P.w, q.v, q.v * .3 + q.z * .01, now, al, q.lit); }
  function ember(s, q, fog, now){ const P = proj(s, q.z - s.index); if(!(P.w > 0) || P.cz < 300) return; const life = q.t / q.life, fl = (now / 50 + q.c * 7) | 0;
    if(q.g < 0 && fl % 5 === 0) return; cx.fillStyle = life < .25 ? '#fff0a0' : life < .55 ? '#ffb43a' : life < .8 ? '#ff7a1a' : '#9a240c'; const sz = P.w > 260 ? PX * 2 : PX;
    cx.fillRect(snp(P.x + q.x * P.w), snp(P.y - q.h * P.w), sz, q.g > 0 && life < .4 ? sz * 2 : sz); }

  // ---------------------------------------------------------------- screen space: thicker ash, the lava's light from below
  function screenFX(p, now){ const ps = pSeg(), s = ps - p.B; if(s < -PRE) return;
    const k = s < FRC ? sm((s + PRE) / 200) : s < GAP + 40 ? 1 : 1 - sm((s - GAP - 40) / 100); if(k <= .01) return;
    // ash: a denser fall of bigger flakes and lapilli over the env's own ash (world-anchored grains, slanting downwind)
    const n = reduce ? 40 : 110, tt = reduce ? now * .2 : now, cam = playerX * ROADW;
    for(let i = 0; i < n; i++){ const s0 = 7000 + i, span = 2600, z = 300 + (((H1(s0 * 1.31) * span - position * .9) % span) + span) % span, sc = DEPTH / z, yr = CAMH * 2.4, fy = (H1(s0 * 3.7) * yr + tt * (.16 + H1(i) * .08)) % yr, y3 = CAMH * 1.5 - fy;
      const x3 = (H1(s0 * 2.17) - .5) * ROADW * 3.4 - cam + fy * .4 + (reduce ? 0 : Math.sin(tt / 1700 + i) * 60), sx = W / 2 + sc * x3 * W / 2, sy = H / 2 - PITCH - sc * y3 * H / 2;
      if(sx < 0 || sx > W || sy < 0 || sy > H) continue; const big = i % 6 === 0;
      cx.globalAlpha = k * (big ? .9 : .7); cx.fillStyle = sy > H * .6 && Math.abs(sx - W / 2) < (sy - H * .6) * 1.2 ? '#e8d4bc' : big ? '#a89aa0' : '#7a7076';
      cx.fillRect(snp(sx), snp(sy), big ? PX * 2 : PX, big ? PX * 2 : PX); }
    cx.globalAlpha = 1;
    // the ash cloud overhead: a dithered veil darkening the top of the sky, warm on its underside toward the crater
    if(k > .05){ cx.globalAlpha = k * .8; cx.fillStyle = ditherPat('#140c0e', .25); cx.fillRect(0, 0, W, snp(H * .1)); cx.fillStyle = ditherPat('#2a1410', .125); cx.fillRect(0, snp(H * .1), W, snp(H * .07)); cx.globalAlpha = 1; }
    // over the channel and in the air: the flow's light from below the frame, in hard steps
    const over = s > 0 && s < GAP + 2 ? Math.min(1, s / 4, (GAP + 2 - s) / 4) : 0;
    if(over > .02){ const fl = reduce ? 1 : .88 + .12 * Math.sin(now / 140); cx.globalCompositeOperation = 'lighter';
      for(const [h0, a] of [[.3, .025], [.18, .035], [.08, .045]]){ cx.fillStyle = `rgba(255,96,32,${(a * over * fl).toFixed(3)})`; cx.fillRect(0, snp(H * (1 - h0)), W, snp(H * h0) + PX); }
      cx.globalCompositeOperation = 'source-over'; } }

  // ---------------------------------------------------------------- the bike lit from below (Akira's under-lighting) while over the lava
  // The bike is rendered again into a scratch canvas (env/bikes.js's own render, same pose); its silhouette is filled with hot colours in
  // hard horizontal bands (yellow low, orange, deep red higher up) and added over the bike, then its bottom edges (pixels with nothing
  // below them) are lit yellow-white: the rim light from the lava.
  const UBW = 192; let UB = null, UG = null, UB2 = null, UG2 = null;
  function underLight(p, now){ const s = pSeg() - p.B; if(s < -4 || s > GAP + 3 || !UB || BIKE.hidden || !ENV.bikes || !ENV.bikes.render || !ENV.bikes._cur) return;
    const k = s < 0 ? (s + 4) / 4 : s > GAP ? (GAP + 3 - s) / 3 : 1; if(k <= .02) return;
    const bs = Math.min(W * .2, H * .27), kk = Math.max(PX, Math.round(bs / 30 / PX) * PX), bx = W / 2, by = H - 8 - AIR.h, id = ENV.bikes && BIKE.id ? BIKE.id : 'sport';
    const half = UBW * PX / 2, ox = snp(bx - half), oy = snp(by - UBW * PX + 4 * PX);
    UG.setTransform(1, 0, 0, 1, 0, 0); UG.clearRect(0, 0, UBW, UBW); UG.setTransform(1 / PX, 0, 0, 1 / PX, -ox / PX, -oy / PX); UG.imageSmoothingEnabled = false;
    if(POSE.pitch > .01){ UG.translate(W / 2, H - 8); UG.scale(1 - POSE.pitch * .06, 1 + POSE.pitch * .22); UG.translate(-W / 2, -(H - 8)); }
    try{ ENV.bikes.render(UG, id, bx, by, kk, leanV, now, null, ENV.bikes._cur()); }catch(e){ return; }
    UG.setTransform(1, 0, 0, 1, 0, 0);
    // keep only the solid bike: the renderer's soft ground shadow would otherwise become an opaque disc under the fill
    { const img = UG.getImageData(0, 0, UBW, UBW), dd = img.data; for(let i = 3; i < dd.length; i += 4) if(dd[i] < 200) dd[i] = 0; UG.putImageData(img, 0, 0); }
    // the rim: the silhouette minus itself shifted up a pixel = the pixels with nothing below them
    UG2.globalCompositeOperation = 'source-over'; UG2.clearRect(0, 0, UBW, UBW); UG2.drawImage(UB, 0, 0); UG2.globalCompositeOperation = 'destination-out'; UG2.drawImage(UB, 0, -1);
    UG2.globalCompositeOperation = 'source-in'; UG2.fillStyle = '#ffe28a'; UG2.fillRect(0, 0, UBW, UBW); UG2.globalCompositeOperation = 'source-over';
    // the bands, from the bike's bottom row up
    const bot = Math.round((by - oy) / PX), bh = Math.round(kk * 30 / PX); UG.globalCompositeOperation = 'source-atop';
    // the fairing and engine catch it (orange), higher up deep red; the tyre itself gets only the rim (rubber does not glow)
    UG.fillStyle = '#4a1006'; UG.fillRect(0, 0, UBW, bot - Math.round(bh * .55)); UG.fillStyle = '#a8300c'; UG.fillRect(0, bot - Math.round(bh * .55), UBW, Math.round(bh * .2));
    UG.fillStyle = '#ff6a1a'; UG.fillRect(0, bot - Math.round(bh * .35), UBW, Math.round(bh * .17)); UG.fillStyle = '#000000'; UG.fillRect(0, bot - Math.round(bh * .18), UBW, Math.round(bh * .18) + 4);
    UG.globalCompositeOperation = 'source-over';
    const fl = reduce ? 1 : .85 + .15 * Math.sin(now / 120); cx.save(); cx.imageSmoothingEnabled = false; cx.globalCompositeOperation = 'lighter';
    cx.globalAlpha = .38 * k * fl; cx.drawImage(UB, 0, 0, UBW, UBW, ox, oy, UBW * PX, UBW * PX);
    cx.globalAlpha = .9 * k; cx.drawImage(UB2, 0, 0, UBW, UBW, ox, oy, UBW * PX, UBW * PX); cx.restore(); }

  // ---------------------------------------------------------------- tests: contact sheets
  function preview(kind){ cx.fillStyle = '#191b25'; cx.fillRect(0, 0, W, H);
    const R = kind === 'big' ? 150 : 70, n = kind === 'big' ? 4 : 6; let i = 0; for(let k = 0; k < 4; k++) for(let t = 0; t < 3; t++){ const X = R * 1.3 + (i % n) * R * 2.6, Y = R * 1.4 + Math.floor(i / n) * R * 2.6; i++;
      rasterBomb(S['b' + k], X, Y, R, 1e9, 1, t * .9, t * 1.7 + .3, t * .5, 0, 0, R, [1, .75, .45][t], 1000, k); }
    return cx.canvas.toDataURL('image/png'); }
})();
