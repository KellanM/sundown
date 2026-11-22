/* Sundown set piece: 崩落 CAVE-IN in the Night Tunnels (MECH.sp_cave, director id 'cavein', hero tier). See setpiece/README.md.
   Load after setpiece/screenfall.js (and setpiece/rockslide.js if present):   <script src="setpiece/cavein.js"></script>
   Notes, sources and the practice log: research/sundown-craft/cavein.md.

   A long bore lets go around you. First the warning: the lamp rows stutter in waves running away down the tunnel, grit sifts from the
   ring joints, the lining groans, a crack races along the crown ahead of you faster than you ride. A jet fan tears off its rear hanger and
   swings; the haunch ahead caves onto the walkway (the safe establishing shot, slow motion). Then the collapse: lining slabs sag out of the
   crown above a lane, outlined by pouring dust, and drop onto the road as readable obstacles with open lanes; behind you the luminaires
   pop and die section by section as you leave each one, so the dark chases you down the bore while rubble rains at the edges. You race
   the dark to the mouth and burst out into night air as the portal caves in behind you and its dust blasts past.

   The stage. env/tunnels.js lays a 200-ring bore every 320 segments. This file books one bore B (a real one) and joins it to the next
   through the core's tunOver hook (ENV.tunnels.tunOver: the bore runs B .. B+519, ~9.5 s at top speed). Its rings are drawn by
   env/tunnels.js itself through a remap of each ring's index onto the first bore's own pattern (lamps every 4, joints, signs; the
   threshold lighting and exit rim at the far mouth), wrapped here (drawTunnel / roadFX / overlay), so the lining stays the road's own.
   Dark rings are remapped to an unlit ring of the darkest tone (no lamp, no halo); the green exit signs stay lit (battery backed).
   The jet fans in this bore are drawn here as cylinders along the axis (the road's flat side-view fans are remapped away).

   Beats (all driven by the rider's segment, never the clock; s = segments from B; ~12 s at top speed from the groan to clean air):
     s -60   the groan; letterbox, duck and the director's guard (traffic moved off, slicks swept, B-45 .. B+600)
     s -40   the card 崩落 CAVE-IN (every occurrence)
     s 15 / 85 / 140   the lamps stutter in waves that run away from you down the bore; grit sifts from the joints, more and more
     s 110   a crack races along the crown from 15 rings ahead to the far mouth (five times your speed), grit pouring from it
     s 115.. each hazard's panel is outlined by a crack in the crown above its lane 60 segments before it drops, dust pouring from the outline
     s 150   the haunch on the far side caves onto the walkway 65 ahead (slow motion, shake): seen, never met
     s 170   a jet fan's rear hanger snaps: it swings down from its front hanger (never below 0.75: overhead), sparking
     s 176.. the collapse: each 24-ring lamp section pops and dies as you ride out of it (sparks, a pop); rubble rains on the walkways
     H1..H4  slabs drop from the crown (each lands 130 segments before you reach it, settles 90 out: >= 1.2 s even boosted):
             H1 305 one lane; H2 380 two lanes (centre and the far side), open where H1 was; H3 455 a long slab over two lanes, the third
             open (75 after H2: a two-lane move); H4 505 one lane (the outer one you came from), centre and the other open
     s 508   the mouth behind gives way: boom, shake, the dust blast overtakes you; out at 520 into night air; it thins by 580
   Fairness (kikubari): every hazard is on the road and readable from 130 segments and settled 90 out; each row leaves at least one full
   lane; two-lane moves get 75 segments; nothing falls on the road that is not a telegraphed hazard (the rain of rubble lands on the
   walkways beyond the barrier); one crash per hazard at most; the recovery blink protects as always; no traffic, no slicks.
   Art: the slabs and rubble are convex hulls rasterised by hand as pixel art into a scratch buffer (rockslide.js's method): hue-shifted
   ramps per bore (sodium: red-brown shadows to cream-yellow tops; fluorescent: blue-grey), the lining's painted inner face with its
   joint groove and soot, rough cast backs, pale fresh breaks with grit, a dark crack on every border between planes broken by lit chips,
   rusted rebar stubs out of the breaks, a lit rim on top, a 1 px outline. Holes left in the crown show raw rock and exposed rebar mesh.
   Dust is ordered dither (no outlines), lit from above by the lamps. Tests: MECH.sp_cave.hazards(), .hits(), ._preview() (piece contact
   sheet); ?cvside=-1|1 mirrors the layout. Reduced motion / no-flash: no flicker (a steady dim), no shake, gentler slow motion, fewer
   particles, the burst fades. Performance: sprites, hull tables and the scratch buffer are built in warm(); pooled particles. */
"use strict";
(() => {
  const DIR = MECH.director, ID = 'cavein', CARD = { kanji:'崩落', name:'CAVE-IN', sub:'outrun the collapse', col:'#ffb040' };
  if(DIR) DIR.register(ID, { tier:'hero', roads:['tunnels'], card:CARD });
  const LEN = 520, END = 600, COL0 = 176, SECL = 24, SECD = 6, BLAST = 508;
  // the tunnel section (env/tunnels.js): opening half-width, wall top, crown, haunch inset, fan x
  const OW = 1.42, WT = 1.02, CH = 1.5, HI = .4, FANX = .48;
  const sm = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
  const snp = v => Math.round(v / PX) * PX;
  const pSeg = () => (position + PZ) / SEG;
  const H1 = n => hash(n);
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  let Tg = 0;
  const plans = [];
  const S = {};

  // ---------------------------------------------------------------- palettes (per bore: sodium and fluorescent alternate, as env/tunnels.js)
  // Studied: Kan-etsu tunnel under sodium (a driver's view: one orange ramp, black-brown to cream; the crown dark and stained; cream tiles
  // on the lower walls), Hakkogan (sodium on bare concrete arches: hot orange lit edges, red-brown shadow), a raw-rock tunnel (what lies
  // behind the lining: dark, jagged, layered). Hue shift: shadows toward red-purple brown, lit planes toward cream yellow.
  const PALS = {
    // (kodawari audit #10: the lit tops sat near white, so the slabs read as white boxes against the walls; every ramp now tops out at or
    // under the bore's own lit panel tone and leans to its light: sodium toward amber, fluorescent toward the LED blue)
    s:{ conc:['#1c1312', '#3a2c26', '#5e4a3c', '#8c7058', '#b89a74'], fresh:['#221a18', '#463a32', '#6e5e4e', '#9c866c', '#c8b08c'],
      paint:['#4c3a2c', '#7e6446', '#b08e62', '#d8b886'], tile:['#4c3a2c', '#826848', '#b49266', '#e0c08c'],
      out:'#080506', gp:'#fff0cc', gd:'#141012', rl:'#e07a34', rd:'#6a2a12', grout:'#3a302a', soot:'#2a2220',
      dust:['#2a160c', '#5c3a20', '#b07a44'], rock:['#100806', '#20120c', '#342014', '#4c3020'], dark:'#0a0604', spark:['#fff4c8', '#ffcf6a', '#ff9a30'], sign:'#2aff6a' },
    l:{ conc:['#10141c', '#242c3a', '#3c4a5c', '#607488', '#8ea4b8'], fresh:['#181c24', '#363e4a', '#58646f', '#8494a0', '#b2c2cc'],
      paint:['#34404e', '#58687c', '#8296aa', '#b0c6d6'], tile:['#34404e', '#5c6e82', '#88a0b4', '#b8cedc'],
      out:'#040508', gp:'#dceaf2', gd:'#0a0c10', rl:'#c8703e', rd:'#5a2a16', grout:'#2a323c', soot:'#1c2028',
      dust:['#14181e', '#3a4250', '#8a98aa'], rock:['#06070a', '#10131a', '#1c2028', '#2c323c'], dark:'#040508', spark:['#f4fcff', '#d8f0ff', '#9ad0ff'], sign:'#2aff6a' } };
  const palId = i => Math.floor(i / 320) % 2 ? 'l' : 's';
  // the raster palette: conc 0-4, fresh 5-9, paint 10-13, tile 14-17, out 18, grit pale 19, grit dark 20, rust lit 21, rust dark 22, grout 23, soot 24
  for(const k in PALS){ const P = PALS[k]; P.R = P.conc.concat(P.fresh, P.paint, P.tile, [P.out, P.gp, P.gd, P.rl, P.rd, P.grout, P.soot]); }
  let fogK = '', FC = new Map();
  const fc = (c, f) => { if(FOG_COL !== fogK){ fogK = FOG_COL; FC.clear(); } const q = Math.round(clamp(f, 0, 1) * 16), k = c + q; let v = FC.get(k); if(!v){ v = mixc(c, FOG_COL, q / 16 * .8); FC.set(k, v); } return v; };

  // ---------------------------------------------------------------- piece geometry: convex hulls (built in warm), after rockslide.js
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
  // a shape: points centred on the centroid; per facet a class (0 rough cast back, 1 fresh break, 2 the lining's painted inner face, 3 tiles)
  // and rebar stubs (a point on a break and its outward direction)
  function finish(P, cls, R){ let cxm = 0, cym = 0, czm = 0; for(const p of P){ cxm += p[0]; cym += p[1]; czm += p[2]; } cxm /= P.length; cym /= P.length; czm /= P.length;
    for(const p of P){ p[0] -= cxm; p[1] -= cym; p[2] -= czm; }
    const V = new Float64Array(P.length * 3); P.forEach((p, i) => { V[i * 3] = p[0]; V[i * 3 + 1] = p[1]; V[i * 3 + 2] = p[2]; });
    const F = hull(P), fr = new Uint8Array(F.length); F.forEach((f, i) => { fr[i] = cls(f[3], f[4], f[5], f); });
    const rb = []; F.forEach((f, i) => { if(fr[i] !== 1 || rb.length >= 12 || R() > .8) return; const a = P[f[0]], b = P[f[1]], c = P[f[2]], u = R() * .6 + .2, v = R() * (1 - u);
      const px = a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v, py = a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v, pz = a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v, L = .14 + R() * .16;
      const d = [(f[3] + (R() - .5) * .5) * L, (f[4] + (R() - .5) * .4 - .2) * L, (f[5] + (R() - .5) * .5) * L]; rb.push([px, py, pz, d[0], d[1], d[2]]);
      const tx = Math.abs(f[3]) > .5 ? 0 : .09, tz = tx ? 0 : .09; rb.push([px + tx, py, pz + tz, d[0] * .8, d[1] * 1.2, d[2] * .8]); });   // (in pairs: the mesh's bars)
    return { V, F, fr, nv:P.length, rb }; }
  const rng = seed => { let sd = seed * 7919 + 13; return () => (sd = (sd * 16807) % 2147483647) / 2147483647; };
  // a lining slab, after the pieces in collapse photos: a panel bounded by two straight ring-joint edges (z) and broken along its sides,
  // one or two corners snapped off along a straight break; extruded t thick. The face that was down in the crown (normal -y) is the painted
  // lining, the top its cast back; the joint edges are formed concrete, the breaks are fresh (pale, grit, rebar)
  function slab(seed, hw, hd, t, tiles){ const R = rng(seed), O = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]], P = [], cut = [R() < .7, R() < .45, R() < .3, R() < .6];
    O.forEach(([x, z], k) => { const sx = Math.sign(x), sz = Math.sign(z), j = (R() - .5) * .06;
      if(cut[k]){ const a = .25 + R() * .35, b = .2 + R() * .45; P.push([x - sx * a * hw, 0, z + j], [x, 0, z - sz * b * hd]); } else P.push([x + j, 0, z]); });
    const Q = []; for(const p of P) Q.push([p[0], t, p[2]], [p[0], -t, p[2]]);
    return finish(Q, (nx, ny, nz) => ny < -.85 ? (tiles ? 3 : 2) : ny > .85 ? 0 : Math.abs(nz) > .97 ? 0 : 1, R); }
  // a chunk of rubble: a jittered block with two or three corners snapped off (each snap a fresh break plane); its flat faces are cast
  // concrete, now and then a painted face or a break
  function chunk(seed){ const R = rng(seed), P = [], ax = .8 + R() * .25, ay = .5 + R() * .25, az = .7 + R() * .3, cuts = new Set();
    while(cuts.size < 2 + (R() < .5 ? 1 : 0)) cuts.add((R() * 8) | 0);
    for(let k = 0; k < 8; k++){ const sx = k & 1 ? 1 : -1, sy = k & 2 ? 1 : -1, sz = k & 4 ? 1 : -1, x = sx * ax, y = sy * ay, z = sz * az;
      if(cuts.has(k)){ const c = .3 + R() * .3; P.push([x - sx * c * ax, y, z], [x, y - sy * c * ay, z], [x, y, z - sz * c * az]); } else P.push([x, y, z]); }
    let mx = 0; for(const p of P) mx = Math.max(mx, Math.hypot(p[0], p[1], p[2])); for(const p of P){ p[0] /= mx; p[1] /= mx; p[2] /= mx; }
    return finish(P, (nx, ny, nz, f) => Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz)) < .9 ? 1 : ny < -.9 && H1(seed) < .5 ? 2 : H1(seed * 3.1 + f[6] * 1.7) < .22 ? 1 : 0, R); }

  // ---------------------------------------------------------------- dust sprites (warm): ordered-dither density layers, no outline
  const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], DS = [8, 12, 16, 24, 32, 48, 64, 96, 128];
  function dustSpr(N, v, f, P){ const c = can(N, N), k = c.getContext('2d'), img = k.createImageData(N, N), d = img.data, rgb = P.dust.map(hx);
    let sd = 211 + v * 977 + N; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, L = [];
    for(let j = 0; j < 5; j++) L.push([.5 + (R() - .5) * .5 + f * .025 * (j % 2 ? 1 : -1), .56 + (R() - .5) * .3 - j * .02, .2 + R() * .16]);
    const D = new Float32Array(N * N);
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const u = (x + .5) / N, w = (y + .5) / N; let a = 0;
      for(const [lx, ly, lr] of L){ const dx = (u - lx) / 1.15, dy = (w - ly) / .85, q = 1 - (dx * dx + dy * dy) / (lr * lr); if(q > a) a = q; }
      a *= .82 + .18 * Math.sin(w * N * .8 + v * 2.1 + f * 1.3);   // combed into streaks by the draught down the bore
      a *= sm(Math.min(u, 1 - u) / .16) * sm(Math.min(w, 1 - w) / .12); D[y * N + x] = a; }
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const a = D[y * N + x], th = (BAY4[(y & 3) * 4 + (x & 3)] + .5) / 16;
      const lv = a > .62 ? .75 : a > .38 ? .5 : a > .18 ? .25 : a > .06 ? .125 : 0; if(th >= lv) continue;
      const up = y > 0 ? D[(y - 1) * N + x] : 0, top = up < .06 && y < N * .55, ci = top ? 2 : y / N > .6 ? 0 : 1, o = (y * N + x) * 4;
      d[o] = rgb[ci][0]; d[o + 1] = rgb[ci][1]; d[o + 2] = rgb[ci][2]; d[o + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }

  // ---------------------------------------------------------------- the plan: one long bore B .. B+LEN
  function piece(o){ return Object.assign({ x:0, h:0, z:0, ax:0, ay:0, az:0, vis:false, al:1, r:.1, shp:0, K:null }, o); }
  // a fall path: knots { s: rider segment, x, h (lowest point above the road), ax, az, ev }
  const kn = (s, x, h, ax, az, ev) => ({ s, x, h, ax, az, ev:ev || '' });
  function build(B, m){ const p = { B, m, off:false, done:false, on:false, cut:null, lastPs:null, hz:[], pcs:[], holes:[], fans:[], hits:0, rumT:0, rainT:0, blastT:-1, popped:-1, broke:false };
    // the hazards: { id, Z (reach), x, r (collision half-width), land, tel (telegraph start), fall (drop start) }
    const H = (id, Z, x, r) => { const land = Z - 130; const h = { id, Z, x, r, land, tel:land - 60, fall:land - 14, hit:false }; p.hz.push(h); return h; };
    const drop = (h, shp, sc, x0, x1, az1, hd, t, tl = 1) => {   // a slab (half-thickness t) dropping from the crown above x0, settling at x1
      // it peels off one edge and turns over as it falls, so it lands lining face up (the tiled face that faced the road reads on the road)
      const PI = Math.PI, h0 = CH - 2 * t * sc, K = [kn(h.tel, x0, h0, 0, 0), kn(h.fall, x0, h0 - .03, .03, .07, 'go'), kn(h.fall + 7, x0 + (x1 - x0) * .3, .8, 1.7, .6), kn(h.land, x0 + (x1 - x0) * .6, 0, PI - .4 * tl, .55, 'impact'),
        kn(h.land + 10, x0 + (x1 - x0) * .9, .06, PI - .62 * tl, az1 * 1.4, 'bounce'), kn(h.land + 20, x1, 0, PI - .55 * tl, az1)];
      const pc = piece({ id:h.id, K, z:h.Z, r:sc, shp, hz:h }); p.pcs.push(pc); h.pc = pc;
      p.holes.push({ x0:x0 - sc * .58, x1:x0 + sc * .58, za:h.Z - hd, zb:h.Z + hd, tel:h.tel, fall:h.fall, side:0 });
      // rubble: chunks out of the hole after the slab, settling round it (inside the hazard's footprint)
      for(let k = 0; k < 4; k++){ const a = H1(h.Z * 1.7 + k * 3.3), xr = x1 + (a - .5) * sc * .9, zr = h.Z + (H1(h.Z + k * 5.1) - .5) * 3.4, r = .07 + H1(h.Z * .3 + k) * .06, t0 = h.fall + 3 + k * 2;
        p.pcs.push(piece({ id:h.id + 'c' + k, K:[kn(t0, x0 + (a - .5) * .3, CH - .1, 0, 0), kn(t0 + 9, xr, 0, 1.2 + k, .8, 'tick'), kn(t0 + 17, xr + (a - .5) * .08, .04, 1.6 + k, 1.1, 'tick'), kn(t0 + 24, xr + (a - .5) * .1, 0, 1.9 + k, 1.3)],
          z:zr, r, shp:'c' + (k % 4), dec:true })); } };
    // H1: one lane (the -m side)
    drop(H('H1', B + 305, -m * .64, .3), 'S0', .52, -m * .6, -m * .64, m * .24, 2.6, .1);
    // H2: centre slab and a chunk pile on the +m side; open where H1 was
    { const h = H('H2a', B + 380, 0, .3); drop(h, 'S1', .5, m * .04, 0, -m * .2, 2.4, .1); const h2 = H('H2b', B + 380.5, m * .66, .28); drop(h2, 'S2', .44, m * .7, m * .66, m * .3, 2.2, .11); }
    // H3: a long slab over the -m lane and the centre; the +m lane open (a two-lane move from H2's gap: 75 segments)
    { const h = H('H3', B + 455, -m * .28, .36); const hb = H('H3b', B + 455.2, -m * .74, .3); hb.land = h.land; hb.tel = h.tel; hb.fall = h.fall; h.twin = hb; hb.twin = h; drop(h, 'L', .92, -m * .5, -m * .52, m * .1, 2.8, .07, .6); }
    // H4: the +m lane; centre and -m open
    drop(H('H4', B + 505, m * .64, .3), 'S3', .5, m * .62, m * .64, -m * .22, 2.4, .1);
    // the establishing collapse: the +m upper wall and haunch at B+200..210 cave onto the walkway (never on the road), ~42 ahead of you as
    // it lands: the tiled wall panel tips out and comes to lean on the wall, a haunch slab and a spill of rubble follow, dust bursts
    { const Zw = B + 205, t = B + 152; p.est = { Z:Zw, t };
      p.holes.push({ side:m, za:Zw - 4.6, zb:Zw + 4.6, h0:.5, h1:1.44, tel:t - 30, fall:t });
      const q = -m * 1.5708; p.pcs.push(piece({ id:'W', K:[kn(t - 30, m * 1.36, .5, 0, q), kn(t, m * 1.35, .48, 0, q - m * .06, 'go'), kn(t + 7, m * 1.3, .22, .1, q - m * .3), kn(t + 11, m * 1.25, 0, .15, q - m * .5, 'impactW'), kn(t + 20, m * 1.24, 0, .15, q - m * .45)], z:Zw, r:.56, shp:'W', dec:true }));
      p.pcs.push(piece({ id:'W2', K:[kn(t + 2, m * 1.2, 1.32, 0, 0), kn(t + 12, m * 1.22, .3, .5, m * .6), kn(t + 16, m * 1.2, 0, .55, m * .3, 'tick'), kn(t + 24, m * 1.18, .04, .5, m * .22), kn(t + 30, m * 1.18, 0, .5, m * .2)], z:Zw + 2.5, r:.36, shp:'S2', dec:true }));
      for(let k = 0; k < 10; k++){ const a = H1(Zw + k * 2.9), t0 = t + 1 + k * 1.3, xr = m * (1.12 + a * .26), zr = Zw + (H1(Zw * 3 + k) - .5) * 8;
        p.pcs.push(piece({ id:'Wc' + k, K:[kn(t0, m * (1.2 + a * .15), .7 + a * .7, 0, 0), kn(t0 + 9, xr, 0, 1 + k, .7, 'tick'), kn(t0 + 16, xr, .05, 1.4 + k, .9), kn(t0 + 22, xr, 0, 1.6 + k, 1)], z:zr, r:.06 + a * .08, shp:'c' + (k % 4), dec:true })); } }
    // when each lamp section dies: SECD rings after you enter it, but never before you have passed a hazard in it (a slab is always lit)
    p.dead = []; for(let q = 0; q * SECL < LEN; q++){ const z0 = B + q * SECL; let t = z0 + SECD; for(const h of p.hz) if(h.Z >= z0 - 2 && h.Z < z0 + SECL) t = Math.max(t, h.Z + 2); p.dead.push(t); }
    for(let z = B + 15; z < B + LEN - 12; z += 30) for(const sd of [-1, 1]) p.fans.push({ z, x:sd * FANX, swing:z === B + 225 && sd === m ? B + 170 : 0, th:0 });
    return p; }

  // ---------------------------------------------------------------- placement: the core's tunOver hook and the decision
  const TN = ENV.tunnels;
  function tunOver(i){ for(const p of plans) if(i >= p.B && i < p.B + LEN) return true; return undefined; }
  function decide(i, s, L){ if(!L || L.key !== 'tunnels' || LANDS[s.land].key !== 'tunnels') return; const ls = typeof landStart === 'number' ? landStart : 0; if(i - ls !== 40) return;
    const z = zoneOfSeg(i), border = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9;
    // after the road's landmark jump (setpiece/jump.js launches out of the portal at k 214 of the first bore past landStart + 230)
    let jb = ls + 230; while(jb % 320 !== 214) jb++; const jEnd = jb + 96;
    // the event starts inside the portal, so the bore may follow the jump's landing closely; a later bore is preferred when the road has room
    const ok = [];
    for(let B = Math.ceil((Math.max(ls + 140, jEnd + 10)) / 320) * 320; B + END <= border - 50; B += 320){
      if(window.inForkWindow && inForkWindow(B - 60, B + END)) continue;
      if(typeof boreAt === 'function' && !boreAt(B, L)) continue;
      // a road's checkpoint gate may stand in the bore (every zone has one mid-way), but only in the build-up or past the last slab
      let gate = false; for(const g of gates) if(g >= B - 20 && g <= B + END + 20){ const r = g - B; if(!((r >= 10 && r <= 160) || r >= 515)) gate = true; } if(gate) continue;
      ok.push(B); }
    const pick = +(new URLSearchParams(location.search).get('cvpick') || -1);   // (?cvpick=N: tests take the N-th fitting bore)
    if(ok.length){ const B = pick >= 0 ? ok[Math.min(pick, ok.length - 1)] : ok.find(b => b - jEnd >= 250) || ok[0];
      if(plans.some(p => Math.abs(p.B - B) < 1000)) return;
      if(DIR && !DIR.request(ID, { tier:'hero', seg:B + 300 })) return;
      const qs = +(new URLSearchParams(location.search).get('cvside') || 0), m = qs ? Math.sign(qs) : H1(B * .37 + 2.1) < .5 ? -1 : 1;
      const pl = build(B, m); pl.pre = B - jEnd >= 140; plans.push(pl); if(plans.length > 4) plans.shift(); } }   // pre: room to open before the portal
  function lay(p, i, s){ const B = p.B; if(i < B - 90 || i > B + END) return; s.skRes = 1; s.cvP = p;
    if(i >= B - 8 && (s.spjP || s.gore)) p.off = true; }

  // ---------------------------------------------------------------- the ring wrapper: env/tunnels.js draws, this file decides what it shows
  // index remap: the first 20 rings are the bore's own (the hood, the threshold lighting); the middle repeats the bore's rings 20..179
  // (period 160 keeps every 4/8/40/80 pattern); the last 20 are its rings 180..199 (the far threshold and the exit rim). The road's flat
  // fans (k % 30 == 15) are moved off (+8: same lamp phase, no sign); a dark ring is moved to the nearest unlit ring of the darkest tone.
  const VS = { index:0, tunnel:true, p1:null, p2:null };
  function vIdx(p, j, dark, near){ const r = j - p.B; let v; if(r < 20) v = j; else if(r < LEN - 20) v = p.B + 20 + ((r - 20) % 160); else v = j - (LEN - 200);
    const k = v - p.B; if(k % 30 === 15 && k < 190) v += 8;
    if(near){ if((v - p.B) % 8 === 4) v -= 4; const k2 = v - p.B; if(k2 % 40 === 10 || k2 % 40 === 20) v -= 8; }   // (and the green evacuation dots: a 1-px light that becomes a square block beside the camera)   // the road's phone cabinet and exit sign are 7-12 px sprites: beside the camera they turn into giant blocks
    if(dark){ const kk = v - p.B; v = kk < 18 || kk > 181 ? v - (v & 1) + 1 : v - (v & 3) + 2; if(v - p.B < 10) v = p.B + 11; }
    return v; }
  const boreOf = j => { for(const p of plans) if(j >= p.B && j < p.B + LEN) return p; return null; };
  // how dark is ring j now (0 lit .. 1 dead), and is it flickering off this instant
  function ringDark(p, j, ps, now){ const B = p.B;
    if(ps >= B + COL0){ const q = Math.floor((j - B) / SECL); if(ps >= (p.dead[q] || 0)) return 1; }
    if(j === p.blown && p === cur) return 1;
    if(p !== cur) return 0;
    let fl = 0;
    // with each groan the lamps round you stutter (seen in the top corners, over the card)
    for(const g of [60, 125]){ const a = ps - B - g; if(a >= 0 && a < 20 && j > ps - 6 && j < ps + 45) fl = Math.max(fl, .85); }
    // the build-up waves: a band of stuttering lamps running away down the bore at 4.5x your speed
    for(const s0 of [20, 100, 140]){ const a = ps - B - s0; if(a < 0 || a > 45) continue; const fr = B + s0 + 30 + a * 4.5; if(j <= fr && j > fr - (s0 === 140 ? 22 : 14)) fl = Math.max(fl, s0 === 140 ? 1 : .8); }
    // in the collapse: lamps ahead stutter now and then, and hard above a panel about to drop
    if(ps >= B + COL0 - 30 && j > ps + 12 && j < ps + 150 && H1(j * 1.31 + Math.floor(now / 900) * 7.7) < .06) fl = Math.max(fl, .6);
    for(const h of p.hz) if(ps >= h.tel && ps < h.land && Math.abs(j - h.Z) < 7) fl = Math.max(fl, .9);
    if(fl <= 0) return 0;
    if(reduce) return -fl * .35;   // no flicker: a steady dim (negative: dim, lamp kept)
    return H1(j * 7.3 + Math.floor(now / 70) * 3.1) < .5 * fl ? 1 : 0; }
  let cur = null, wrapped = false;
  function wrap(){ if(wrapped || !TN) return; wrapped = true;
    TN.tunOver = tunOver;
    const oT = TN.drawTunnel, oR = TN.roadFX, oO = TN.overlay;
    TN.drawTunnel = function(s, x, y, uw, fog, now, fogc){ const p = s && boreOf(s.index); if(!p) return oT.call(this, s, x, y, uw, fog, now, fogc);
      const ps = pSeg(), dk = ringDark(p, s.index, ps, now); VS.index = vIdx(p, s.index, dk > 0, uw > W * .09); VS.p1 = s.p1; VS.p2 = s.p2; VS.land = s.land;
      oT.call(this, VS, x, y, uw, fog, now, fogc);
      try{ ringFX(p, s, x, y, uw, fog, now, ps, dk); }catch(e){ console.error('cavein ring', e); } };
    TN.roadFX = function(s, a, b, fog, f, now){ const p = s && boreOf(s.index); if(!p) return oR.call(this, s, a, b, fog, f, now);
      const ps = pSeg(), dk = ringDark(p, s.index, ps, now); VS.index = vIdx(p, s.index, dk > 0); VS.p1 = s.p1; VS.p2 = s.p2; VS.land = s.land;
      oR.call(this, VS, a, b, fog, f, now);
      if(dk !== 0 && a.y - b.y >= PX * .6){ cx.globalAlpha = dk > 0 ? .62 : -dk; poly(a.x - a.w * OW, a.y, a.x + a.w * OW, a.y, b.x + b.w * OW, b.y - 1, b.x - b.w * OW, b.y - 1, PALS[palId(p.B)].dark); cx.globalAlpha = 1; } };
    // the screen grade reads the rider's ring (k = i % 320): inside the joined part it is shown the ring it was remapped to
    if(TN.laneSolid){ const oL = TN.laneSolid; TN.laneSolid = function(s){ const p = s && boreOf(s.index); if(!p) return oL.call(this, s); VS.index = p.B; return oL.call(this, VS); }; }
    TN.overlay = function(al, now, sk){ const ps = pSeg(), i = Math.floor(ps), p = boreOf(i); if(!p || i - p.B < 196) return oO.call(this, al, now, sk);
      const v = vIdx(p, i, false), p0 = position; position = (v + (ps - i)) * SEG - PZ; try{ return oO.call(this, al, now, sk); } finally { position = p0; } }; }

  // ---------------------------------------------------------------- per-ring extras (drawn right after env/tunnels.js draws ring j)
  // A thing on the lining between ring j and j+1 is drawn as the quad between their two projections: it lies in ring j+1's visible strip,
  // after ring j+1 and outside ring j's frame, so no nearer ring covers it (the same reason the crack and the holes need no clipping).
  function ringFX(p, s, x, y, uw, fog, now, ps, dk){ const j = s.index, B = p.B, P = PALS[palId(B)], b = s.p2.screen; if(!(b.w > 0)) return;
    const x2 = b.x, y2 = b.y, u2 = b.w, near = uw > W * .02;
    // a dead section: the lining sinks toward black (the ring was drawn unlit, darkest tone); the exit signs stay lit on their batteries
    if(dk !== 0) darkRing(p, x, y, uw, fog, dk > 0 ? .7 : -dk, P);
    if(dk > 0 && (vIdx(p, j, false) - B) % 40 === 20 && SPR.tun_exit && uw > 3 && uw < W * .2){ const sk = Math.max(1, uw * .24 / 12), lx = x - OW * uw; cx.globalAlpha = 1 - fog * .6; blit(SPR.tun_exit, lx + 6 * sk + PX, snp(y - .62 * uw), sk); cx.globalAlpha = 1; if(fog < .7) glow(lx + 6 * sk, y - .62 * uw - 3 * sk, uw * .3, '#2aff6a', .3 * (1 - fog)); }
    if(p !== cur || fog > .92) return;
    // the blown lamp: a short hot burst at both luminaires as it goes (local, not a screen flash; none under reduced motion)
    if(j === p.blown && !reduce && Tg - p.blowT < .35){ const a = 1 - (Tg - p.blowT) / .35, ly = y - (WT + .24) * uw; for(const sd of [-1, 1]) glow(x + sd * (OW - .2) * uw, ly, Math.max(PX * 4, uw * .7), P.spark[1], .7 * a); }
    // holes the collapse leaves: raw rock, broken lips, exposed rebar mesh
    for(const o of p.holes) if(j >= Math.floor(o.za) && j < o.zb && ps >= o.tel) hole(p, o, j, x, y, uw, x2, y2, u2, fog, ps, P);
    // the crack racing along the crown
    if(ps >= B + 110){ const c0 = B + 125, cf = Math.min(B + LEN - 1, c0 + (ps - B - 110) * 5); if(j >= c0 && j < cf) crackSeg(j, x, y, uw, x2, y2, u2, fog, P); }
    // telegraph outlines round each panel about to drop
    for(const h of p.hz) if(h.pc && ps >= h.tel && ps < h.fall + 2 && j >= Math.floor(h.Z - 3) && j <= h.Z + 3) outline(p, h, j, x, y, uw, x2, y2, u2, fog, ps, now, P);
    // grit sifting from the ring joints (more as the build-up goes on)
    if(near || uw > W * .006){ const I = ps < B - 10 ? 0 : ps < B + COL0 ? .15 + .5 * sm((ps - B) / COL0) : ps < B + LEN ? .7 : 0;
      if(I > 0 && j % 4 === 0 && H1(j * 2.17) < I && j > ps + 2) sift(j, x, y, uw, fog, now, P, H1(j * 3.7) * 1.5 - .75); } }
  // the ring's own face (the frame round its opening: crown band, haunch steps, walls), darkened
  function darkRing(p, x, y, uw, fog, a, P){ const yC = snp(y - CH * uw), yW = y - WT * uw, hh = (CH - WT) / 3 * uw, l = snp(x - OW * uw), r = snp(x + OW * uw), fl = Math.max(-PX, snp(x - 4.4 * uw)), fr = Math.min(W + PX, snp(x + 4.4 * uw)), ft = Math.max(-PX, snp(y - 3.6 * uw)), qy = snp(y) + PX;
    cx.globalAlpha = a * (1 - fog * .5); cx.fillStyle = P.dark;
    if(yC > ft) cx.fillRect(fl, ft, fr - fl, yC - ft);
    if(l > fl) cx.fillRect(fl, yC, l - fl, qy - yC); if(fr > r) cx.fillRect(r, yC, fr - r, qy - yC);
    for(let n = 0; n < 3; n++){ const ya = snp(yW - (n + 1) * hh), yb = snp(yW - n * hh), ins = snp((n + 1) * HI / 3 * uw); if(yb > ya && ins > 0){ cx.fillRect(l, ya, ins, yb - ya); cx.fillRect(r - ins, ya, ins, yb - ya); } }
    cx.globalAlpha = 1; }
  // a jagged x edge for a hole's side at ring j (deterministic)
  const jag = (j, k) => (H1(j * 1.93 + k * 7.1) - .5) * .07;
  function hole(p, o, j, x, y, uw, x2, y2, u2, fog, ps, P){
    const open = ps >= o.fall + (o.side ? 2 : 3);   // before it opens, only the slab hangs there (the hull covers the panel itself)
    if(!open) return;
    const F = c => fc(c, fog * .8), fr = clamp((o.zb - j) / (o.zb - o.za), 0, 1);
    if(!o.side){   // in the crown: a dark pit with layered raw rock, a pale broken lip round it, rebar ends hanging from the lip
      const ha = CH, xa1 = o.x0 + jag(j, 1), xb1 = o.x1 + jag(j, 2), xa2 = o.x0 + jag(j + 1, 1), xb2 = o.x1 + jag(j + 1, 2);
      const A = [x + xa1 * uw, y - ha * uw], Bq = [x + xb1 * uw, y - ha * uw], C = [x2 + xb2 * u2, y2 - ha * u2], D = [x2 + xa2 * u2, y2 - ha * u2];
      poly(A[0], A[1], Bq[0], Bq[1], C[0], C[1], D[0], D[1], F(P.rock[0]));
      // rock strata: two lighter bands across the pit (lit by the lamps that are left)
      for(const [t0, t1, ci] of [[.18, .3, 2], [.55, .63, 1], [.75, .8, 3]]){ const lx = (u, t) => u + (H1(j * .7 + t * 9) - .5) * .05; const a0 = o.x0 + (o.x1 - o.x0) * lx(t0, 1), a1 = o.x0 + (o.x1 - o.x0) * lx(t1, 2);
        poly(x + a0 * uw, y - ha * uw, x + a1 * uw, y - ha * uw, x2 + a1 * u2, y2 - ha * u2, x2 + a0 * u2, y2 - ha * u2, F(P.rock[ci])); }
      // the lip: a pale broken edge each side, a pixel wide (two near the camera)
      const lw = Math.max(PX, snp(uw * .012)); line(A[0], A[1], D[0], D[1], F(P.fresh[3]), lw); line(Bq[0] - lw, Bq[1], C[0] - lw, C[1], F(P.fresh[3]), lw);
      if(j === Math.floor(o.za) || j + 1 >= o.zb){ cx.fillStyle = F(P.fresh[2]); pxRect(Math.min(A[0], Bq[0]), Math.min(A[1], D[1]), Math.abs(Bq[0] - A[0]), lw); }
      // rebar ends hanging from the lips (rust, a lit pixel at the bend)
      if(uw > W * .03 && j % 2 === 0){ const rl = Math.max(PX * 2, snp(uw * .05)); for(const [ex, sd] of [[A[0], 1], [Bq[0], -1]]){ cx.fillStyle = F(P.rd); pxRect(ex + sd * lw, A[1], PX, rl); cx.fillStyle = F(P.rl); pxRect(ex + sd * lw, A[1] + rl - PX, PX, PX); } }
      return; }
    // in the haunch and upper wall on side o.side: the opening's profile at height h is the wall (OW) below WT and the stepped haunch above
    const sd = o.side, prof = h => h < WT ? OW : OW - (Math.min(2, Math.floor((h - WT) / ((CH - WT) / 3))) + 1) * HI / 3;
    const hs = [o.h0 + jag(j, 3) * 1.5, .8, WT - .01, WT + .08, 1.18, 1.3, o.h1 + jag(j, 4)];
    for(let n = 0; n + 1 < hs.length; n++){ const h0 = hs[n], h1 = hs[n + 1], hm = (h0 + h1) / 2, X = prof(hm) - .01, c = n % 2 ? P.rock[1] : P.rock[0];
      poly(x + sd * X * uw, y - h0 * uw, x + sd * X * uw, y - h1 * uw, x2 + sd * X * u2, y2 - h1 * u2, x2 + sd * X * u2, y2 - h0 * u2, F(c)); }
    // the exposed mesh: rust bars across the pit, a grid
    if(uw > W * .015){ cx.fillStyle = F(P.rd); for(const hb of [.72, .9, 1.12, 1.3]){ const X = prof(hb) - .01; pxRect(Math.min(x + sd * X * uw, x2 + sd * X * u2), snp(y - hb * uw), Math.max(PX, Math.abs(x + sd * X * uw - x2 - sd * X * u2)), PX); }
      if(j % 2 === 0){ cx.fillStyle = F(P.rl); const X = prof(.9); pxRect(x + sd * (X - .01) * uw - (sd > 0 ? PX : 0), snp(y - o.h1 * uw), PX, snp((o.h1 - o.h0) * uw)); } }
    // the broken lips at the top and bottom of the pit
    cx.fillStyle = F(P.fresh[3]); const X0 = prof(o.h0) - .01, X1 = prof(o.h1 - .02) - .01;
    pxRect(Math.min(x + sd * X0 * uw, x2 + sd * X0 * u2), snp(y - o.h0 * uw), Math.max(PX, Math.abs(x - x2 + sd * X0 * (uw - u2))), PX);
    pxRect(Math.min(x + sd * X1 * uw, x2 + sd * X1 * u2), snp(y - o.h1 * uw), Math.max(PX, Math.abs(x - x2 + sd * X1 * (uw - u2))), PX); }
  // the crown crack between ring j and j+1: a wandering dark line with a lit lip on its lamp-facing side; it forks now and then
  const crX = j => .12 * Math.sin(j * .071) + .07 * Math.sin(j * .23 + 1) + (H1(j * 3.3) - .5) * .05;
  function crackSeg(j, x, y, uw, x2, y2, u2, fog, P){ const F = c => fc(c, fog * .8);
    const ax = x + crX(j) * uw, ay = y - CH * uw, bx = x2 + crX(j + 1) * u2, by = y2 - CH * u2, w = uw > W * .1 ? PX * 2 : PX;
    const w2 = uw > W * .04 ? Math.max(w, PX * 2) : w; line(ax, ay, bx, by, F(P.out), w2); line(ax + PX, ay + w2, bx + PX, by + w2, F(P.gp), PX);
    if(H1(j * 5.7) > .86 && uw > W * .01){ const d = (H1(j * 2.3) > .5 ? 1 : -1) * (.12 + H1(j) * .14); line(ax, ay, x2 + (crX(j + 1) + d) * u2, y2 - CH * u2, F(P.out), PX); } }
  // the panel's outline cracking open in the crown, dust pouring from it; the slab sags (the hull is drawn by drawSeg)
  function outline(p, h, j, x, y, uw, x2, y2, u2, fog, ps, now, P){ const F = c => fc(c, fog * .8), u = clamp((ps - h.tel) / 60, 0, 1), pc = h.pc;
    const hw = pc.r * .6, x0 = pc.K[0].x - hw, x1 = pc.K[0].x + hw, za = h.Z - 2.6, zb = h.Z + 2.6; if(j + 1 < za || j > zb) return;
    const w = uw > W * .08 ? PX * 2 : PX;
    // the long edges, drawn in from the near end as the crack grows
    if(u > .15) for(const ex of [x0, x1]) line(x + ex * uw, y - CH * uw, x2 + ex * u2, y2 - CH * u2, F(P.out), w);
    if(u > .35 && (j === Math.floor(za) || j === Math.floor(zb))){ const xr = j === Math.floor(za) ? x : x2, yr = j === Math.floor(za) ? y : y2, ur = j === Math.floor(za) ? uw : u2; line(xr + x0 * ur, yr - CH * ur, xr + x1 * ur, yr - CH * ur, F(P.out), w); }
    // grit pouring from the cracks: falling streams at the long edges, heavier as it nears the drop
    if(u > .3 && j % 2 === 0) for(const ex of [x0, x1]) sift(j, x, y, uw, fog, now, P, ex, .5 + u * .5); }
  // grit falling from the crown at x (half-road widths) at ring j, as it pours from a seam in the photos of dusty bores: a short dense
  // trickle under the seam that breaks up into loose grains and is gone before it reaches the road (it disperses); grains slide down with
  // time, each row's grain chosen by hash (no regular dashes); a small dithered haze where it leaves the seam.
  function sift(j, x, y, uw, fog, now, P, xs, k){ const sx = snp(x + xs * uw), top = y - CH * uw, h = CH * uw * (.45 + H1(j * 1.7 + xs) * .3); if(h < PX * 4) return;
    const w = uw > W * .09 ? PX * 2 : PX, sp = reduce ? .03 : .11, sh = Math.floor(now * sp / PX), a = (k || .7) * (1 - fog * .8), n = Math.round(h / PX);
    cx.globalAlpha = a; cx.fillStyle = fc(P.dust[2], fog * .6);
    for(let r = 0; r < n; r++){ const u = r / n, dens = u < .2 ? .85 : .85 * (1 - (u - .2) / .8) * .7; if(H1(j * 7.3 + xs * 3 + (r - sh) * .618) > dens) continue;
      const dxp = u > .3 ? Math.round((H1((r - sh) * 1.3 + j) - .5) * 2 * u) * PX : 0; cx.fillRect(sx + dxp, snp(top) + r * PX, u < .2 ? w : PX, PX); }
    if(uw > W * .03){ cx.fillStyle = ditherPat(fc(P.dust[1], fog * .6), .25); cx.fillRect(sx - PX * 2, snp(top), PX * 5 + w - PX, PX * 2); }
    cx.globalAlpha = 1; }
  // a pixel line (whole canvas pixels, w thick)
  function line(x0, y0, x1, y1, col, w){ const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / PX)); cx.fillStyle = col;
    /* only the stretch within a screen's margin of the view (the same pixels): beside the camera a crack runs thousands of pixels off-screen */
    let t0 = 0, t1 = 1; const M = W + H, dx = x1 - x0, dy = y1 - y0;
    if(dx){ let ta = (-M - x0) / dx, tb = (W + M - x0) / dx; if(ta > tb){ const q = ta; ta = tb; tb = q; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); } else if(x0 < -M || x0 > W + M) return;
    if(dy){ let ta = (-M - y0) / dy, tb = (H + M - y0) / dy; if(ta > tb){ const q = ta; ta = tb; tb = q; } t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); } else if(y0 < -M || y0 > H + M) return;
    if(!(t0 <= t1)) return; const i1 = Math.min(n, Math.ceil(t1 * n));
    for(let i = Math.max(0, Math.floor(t0 * n)); i <= i1; i++){ const t = i / n; cx.fillRect(snp(x0 + dx * t), snp(y0 + dy * t), w, w); } }

  // ---------------------------------------------------------------- poses
  const EV = { x:0, h:0, ax:0, az:0, k:-1 };
  function path(K, s){ const n = K.length; if(s <= K[0].s){ const a = K[0]; EV.x = a.x; EV.h = a.h; EV.ax = a.ax; EV.az = a.az; EV.k = -1; return EV; }
    if(s >= K[n - 1].s){ const a = K[n - 1]; EV.x = a.x; EV.h = a.h; EV.ax = a.ax; EV.az = a.az; EV.k = n - 1; return EV; }
    let k = 0; while(s >= K[k + 1].s) k++; const a = K[k], b = K[k + 1], u = (s - a.s) / (b.s - a.s), fall = b.h < a.h && a.h > .3, uu = fall ? u * u : u;   // falling: gravity-eased
    EV.x = a.x + (b.x - a.x) * u; EV.h = a.h + (b.h - a.h) * uu + (b.ev === 'bounce' || b.ev === 'tick' ? 0 : 0); EV.ax = a.ax + (b.ax - a.ax) * u; EV.az = a.az + (b.az - a.az) * u; EV.k = k;
    if(b.ev === 'bounce' && !fall) EV.h += 4 * .08 * u * (1 - u); return EV; }
  function pose(pc, s){ path(pc.K, s); pc.x = EV.x; pc.h = EV.h; pc.ax = EV.ax; pc.az = EV.az; pc.vis = s >= pc.K[0].s; return pc; }

  // ---------------------------------------------------------------- particles (world space: z segments, x and h half-road widths), pooled
  const DP = []; for(let k = 0; k < 110; k++) DP.push({ on:false, z:0, x:0, h:0, r:0, gr:0, vx:0, vh:0, vz:0, t:0, life:0, v:0 });
  const CP = []; for(let k = 0; k < 170; k++) CP.push({ on:false, z:0, x:0, h:0, vx:0, vh:0, vz:0, t:0, life:0, c:0, sp:false });
  let rs = 17; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  function dust(z, x, h, n, r, up, spread, lf){ for(let k = 0; k < n; k++){ let q = null; for(const d of DP) if(!d.on){ q = d; break; } if(!q) return;
      q.on = true; q.z = z + (rnd() - .5) * 3; q.x = x + (rnd() - .5) * (spread || .3); q.h = h; q.r = r * (.6 + rnd() * .6); q.gr = r * (.4 + rnd() * .6); q.vx = (rnd() - .5) * .5; q.vh = up * (.3 + rnd() * .7); q.vz = -rnd() * 2; q.t = 0; q.life = (lf || 1) * (1.1 + rnd() * 1.1); q.v = k % 3; } }
  function chips(z, x, h, n, sp, spark){ for(let k = 0; k < n; k++){ let q = null; for(const d of CP) if(!d.on){ q = d; break; } if(!q) return;
      q.on = true; q.z = z + (rnd() - .5); q.x = x; q.h = h + .02; const a = rnd() * 6.283, v = sp * (.4 + rnd() * .8); q.vx = Math.cos(a) * v * (spark ? .5 : 1); q.vz = Math.sin(a) * v * 5; q.vh = spark ? -rnd() * .2 : sp * (.6 + rnd() * 1.4); q.t = 0; q.life = spark ? .5 + rnd() * .5 : .7 + rnd() * .7; q.c = k % 3; q.sp = !!spark; } }
  // the blast overtaking you: dust billows born beside and above the camera rushing ahead faster than you, grit and pebbles skipping ahead
  // along the road edges (decor: tiny, short-lived, never in a lane's middle)
  function overtake(ps){ const sp = speed / SEG;
    for(let k = 0; k < 5; k++){ let q = null; for(const d of DP) if(!d.on){ q = d; break; } if(!q) break; const sd = rnd() < .5 ? -1 : 1;
      q.on = true; q.z = ps + 2 + rnd() * 3; q.x = sd * (1 + rnd() * .7); q.h = .5 + rnd() * 1.1; q.r = .4 + rnd() * .3; q.gr = .25; q.vx = -sd * rnd() * .3; q.vh = rnd() * .2; q.vz = sp * (1.25 + rnd() * .5); q.t = 0; q.life = .9 + rnd() * .6; q.v = k % 3; }
    for(let k = 0; k < 4; k++){ let q = null; for(const d of CP) if(!d.on){ q = d; break; } if(!q) break; const sd = rnd() < .5 ? -1 : 1;
      q.on = true; q.z = ps + 1 + rnd() * 2; q.x = sd * (.9 + rnd() * .35); q.h = .3 + rnd() * .5; q.vx = (rnd() - .5) * .2; q.vz = sp * (1.3 + rnd() * .6); q.vh = .5 + rnd(); q.t = 0; q.life = .8 + rnd() * .5; q.c = k % 3; q.sp = false; } }
  function stepP(dt){ for(const q of DP){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.vh *= 1 - 1.5 * dt; q.r += q.gr * dt; }
    for(const q of CP){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.vh -= (q.sp ? 3 : 4.2) * dt; if(q.h < 0){ q.h = 0; q.vh *= -.3; q.vx *= .5; q.vz *= .5; if(q.sp) q.life = Math.min(q.life, q.t + .08); } } }

  // ---------------------------------------------------------------- sound (the core's synth helpers)
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function groan(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.8, 55, .1 * v, t0); [48, 45, 41, 38].forEach((f, k) => M.tone(f, .5, { type:'sawtooth', v:.035 * v, at:t0 + k * .32 })); M.tone(170, .7, { type:'square', v:.006 * v, at:t0 + .4 }); M.tone(152, .6, { type:'square', v:.005 * v, at:t0 + .9 }); }
  function rumble(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.4, 46, v, t0); M.noise(1.1, 110, v * .45, t0 + .1); }
  function crackS(v){ if(!ac()) return; const t0 = M.ac.currentTime; for(let k = 0; k < 5; k++) M.noise(.04, 3000 + k * 300, .09 * v, t0 + k * .07 + rnd() * .03); M.tone(120, .35, { type:'square', v:.018 * v, at:t0 }); }
  function thud(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.0, 65, .24 * v, t0); M.tone(40, .7, { type:'sine', v:.14 * v, at:t0 }); M.noise(.3, 800, .07 * v, t0 + .01); M.noise(.5, 2400, .03 * v, t0 + .03); }
  function tick(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.04, 2200 + rnd() * 1400, .035 * v, t0); }
  function pop(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.05, 4200, .07 * v, t0); M.tone(880 + rnd() * 300, .06, { type:'square', v:.01 * v, at:t0 }); M.noise(.18, 1500, .02 * v, t0 + .03); }
  function creak(){ if(!ac()) return; const t0 = M.ac.currentTime; [210, 190, 176, 150].forEach((f, k) => M.tone(f, .16, { type:'square', v:.012, at:t0 + k * .13 })); M.noise(.2, 2600, .05, t0 + .55); }
  function boom(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(2.4, 50, .3, t0); M.tone(34, 1.4, { type:'sine', v:.2, at:t0 }); M.noise(1.2, 300, .1, t0 + .05); M.noise(1.6, 1200, .05, t0 + .1); }

  // ---------------------------------------------------------------- the module
  const active = ps => { for(const p of plans) if(!p.off && !p.done && ps > p.B - 300 && ps < p.B + END + 20) return p; return null; };
  function showCard(){ if(!DIR || !DIR.cine) return; let card = CARD;
    if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has(ID)){ try{ if(MECH.cutin.show(ID) !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
    if(card) DIR.cine({ letterbox:false, dur:1.5, card }); }
  function beat(p, pc, ev){ const near = clamp(1.25 - (pc.z - pSeg()) / 240, .25, 1), big = pc.r > .3, cutHit = n => { if(!reduce && p.cut) p.cut.hit(n * near); };
    if(ev === 'go'){ crackS(.8 * near); dust(pc.z, pc.x, CH - .1, reduce ? 2 : 5, .22, -.3, pc.r * .9, .8); chips(pc.z, pc.x, CH - .15, reduce ? 3 : 8, .3); }
    else if(ev === 'impact'){ dust(pc.z, pc.x, 0, reduce ? 3 : 9, .3, .8, pc.r * 1.1, .6); chips(pc.z, pc.x, 0, reduce ? 6 : 20, 1.2); thud(near); cutHit(4 + pc.r * 6); }
    else if(ev === 'impactW'){ dust(pc.z, pc.x, .1, reduce ? 4 : 12, .34, 1, .5, .7); chips(pc.z, pc.x, 0, reduce ? 8 : 26, 1.3); thud(1);
      if(DIR && DIR.cine && state === 'play'){ DIR.cine({ slowmo:{ scale:reduce ? .78 : .55, hold:.5 }, shake:reduce ? 0 : 6, dur:1.2 }); if(DIR.done) DIR.done(ID); } }
    else if(ev === 'bounce'){ thud(.4 * near); chips(pc.z, pc.x, 0, reduce ? 2 : 6, .6); dust(pc.z, pc.x, 0, reduce ? 1 : 2, .18, .6, .3, .5); cutHit(1.5); }
    else if(ev === 'tick'){ if(big || !pc.dec || H1(pc.z) < .5) tick(near); } }
  MECH.sp_cave = {
    plans, CARD, _S:S, _preview:id => preview(id), vIdx, tunOver, ringDark:(j, now) => { const p = boreOf(j); return p ? ringDark(p, j, pSeg(), now || 0) : null; },
    // tests: the hazards ahead { id, z, x (where it lies as you reach it), r, landed }
    hazards(ahead){ const ps = pSeg(), out = []; for(const p of plans){ if(p.off || p.done) continue; for(const h of p.hz){ if(h.Z < ps - 2 || h.Z > ps + (ahead || 140)) continue; out.push({ id:h.id, z:h.Z, x:h.x, r:h.r, landed:ps >= h.land }); } } return out; },
    hits(){ let n = 0; for(const p of plans) n += p.hits; return n; },
    dbg(B, m){ const p = build(B, m || 1); plans.push(p); return p; },
    warm(){ wrap();
      S.shp = { S0:slab(3, .58, .46, .1, true), S1:slab(7, .6, .42, .1, true), S2:slab(11, .55, .44, .11, true), S3:slab(19, .6, .46, .1, true), L:slab(23, .62, .26, .07, true), W:slab(29, .9, .8, .09, true) };
      for(let k = 0; k < 4; k++) S.shp['c' + k] = chunk(41 + k * 6);
      // one or two hairline fractures per piece: a plane (normal, offset) and the span along it where the crack runs (rockslide.js)
      for(const key in S.shp){ const sh = S.shp[key], R = rng(key.charCodeAt(0) * 7 + (key.charCodeAt(1) || 3)); sh.cr = [];
        for(let c = 0; c < (key[0] === 'c' ? 1 : 3); c++){ let a = [R() - .5, (R() - .5) * .3, R() - .5], l = Math.hypot(a[0], a[1], a[2]); a = a.map(v => v / l); let b = [R() - .5, R() - .5, R() - .5]; const dt = b[0] * a[0] + b[1] * a[1] + b[2] * a[2]; b = b.map((v, i) => v - dt * a[i]); l = Math.hypot(b[0], b[1], b[2]); b = b.map(v => v / l);
          const m0 = -.5 + R() * .4; sh.cr.push([a[0], a[1], a[2], (R() - .5) * .3, b[0], b[1], b[2], m0, m0 + .4 + R() * .5]); }
        // the sub-planes on the cast back and the breaks (kodawari audit #10, rockslide.js): NSD seeds through the piece's box; every pixel
        // belongs to the nearest, and each chip is its facet's tone or a step either side, with a lit lip on top and a dark one under it
        const V = sh.V, mn = [9, 9, 9], mx = [-9, -9, -9]; for(let v = 0; v < sh.nv; v++) for(let a2 = 0; a2 < 3; a2++){ const q = V[v * 3 + a2]; if(q < mn[a2]) mn[a2] = q; if(q > mx[a2]) mx[a2] = q; }
        sh.sd = new Float32Array(NSD * 3); sh.so = new Int8Array(NSD); for(let c = 0; c < NSD; c++){ for(let a2 = 0; a2 < 3; a2++) sh.sd[c * 3 + a2] = mn[a2] + (mx[a2] - mn[a2]) * (.08 + .84 * R()); const r = R(); sh.so[c] = r < .26 ? -1 : r > .8 ? 1 : 0; } }
      for(const id of ['s', 'l']) for(const N of DS) for(let v = 0; v < 3; v++) for(let f = 0; f < 3; f++) S[id + N + '_' + v + '_' + f] = dustSpr(N, v, f, PALS[id]);
      if(!RC){ RC = can(RW, RW); RG = RC.getContext('2d', { willReadFrequently:true }); RI = RG.createImageData(RW, RW); }
      for(const id of ['s', 'l']) palRGB(PALS[id], 0);
      try{ cx.save(); for(const k in S) if(S[k] && S[k].width) cx.drawImage(S[k], 0, 0, 1, 1); cx.restore(); cx.clearRect(0, 0, PX * 2, PX * 2); }catch(e){} },
    reset(){ for(const p of plans){ if(p.cut){ p.cut.end(); p.cut = null; } p.on = false; p.lastPs = null; p.hits = 0; p.blastT = -1; p.popped = -1; p.broke = false; for(const h of p.hz) h.hit = false; for(const f of p.fans) f.th = 0; } for(const q of DP) q.on = false; for(const q of CP) q.on = false; cur = null; },
    place(i, s, L){ if(i === 0){ for(const p of plans) if(p.cut) p.cut.end(); plans.length = 0; } if(!wrapped) wrap();
      for(const p of plans) lay(p, i, s);
      decide(i, s, L); },
    hitCar(){ const p = cur; if(!p) return false; const d = pSeg() - p.B; return d > -45 && d < END; },
    update(dt){ Tg += dt; stepP(dt); const ps = pSeg(), p = active(ps); cur = p; if(!p) return;
      const a = p.lastPs === null ? ps : p.lastPs, B = p.B, X = v => a < v && ps >= v; p.lastPs = ps; const play = state === 'play';
      if(!p.swept && ps > B - 300){ p.swept = true; for(let j = B - 70; j <= B + END; j++) if(segs[j]) segs[j].hz = null; }
      // it opens on the approach to the portal when the road has room (the card over the mouth), else just inside it (after the jump's landing)
      const st = p.pre ? B - 120 : B - 6;
      if(play && !p.on && ps >= st && ps < B + LEN){ p.on = true; if(DIR && DIR.cine) p.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, duck:.45, shake:0, guard:{ from:st - 10, to:B + END }, dur:0 }); groan(.8); }
      if(play && X(p.pre ? B - 110 : B - 4)) showCard();   // (the arrival card holds 2.25 s whatever dur says: with room it is over before the mouth)
      if(X(B + 60) || X(B + 125)) groan(1);
      if(X(B + 110)) crackS(1);
      // dust bursting from the crack's racing tip
      if(ps > B + 110 && ps < B + 190){ p.ckT = (p.ckT || 0) - dt; if(p.ckT <= 0){ p.ckT = reduce ? .2 : .07; const cf = B + 125 + (ps - B - 110) * 5; if(cf < B + LEN - 2){ dust(cf, crX(Math.floor(cf)), CH - .04, 1, .14, -.5, .08, .55); chips(cf, crX(Math.floor(cf)), CH - .05, 2, .2); } } }
      // one lamp blows out ahead of you early on: a burst of sparks from both luminaires, a pop, and its ring stays dark
      { const bt = p.pre ? B + 40 : B + 118; if(X(bt)){ let j = Math.floor(ps) + 26; while(vIdx(p, j, false) % 4 !== 0 && j < ps + 40) j++; p.blown = j; p.blowT = Tg; pop(1.6); crackS(.5);
          for(const sd of [-1, 1]) chips(j + .5, sd * (OW - .22), 1.26, reduce ? 8 : 26, .45, true); } }
      // the rumble under everything, building to the collapse, a roar through it, gone in the night air
      const lv = ps < B ? 0 : ps < B + COL0 ? .03 + .06 * sm((ps - B) / COL0) : ps < B + LEN ? .14 : .14 * (1 - sm((ps - B - LEN) / 50));
      p.rumT -= dt; if(lv > .005 && p.rumT <= 0){ p.rumT = .8; rumble(lv); }
      p.shT = (p.shT || 0) - dt; if(play && p.cut && !reduce && ps > B + COL0 && ps < B + LEN && p.shT <= 0){ p.shT = .35 + rnd() * .5; p.cut.hit(.5 + rnd() * .5); }
      // the pieces: poses and beats from the rider's segment (a jump in position fires each beat once)
      for(const pc of p.pcs){ pose(pc, ps); if(a < ps) for(const k of pc.K) if(k.ev && a < k.s && ps >= k.s){ pose(pc, k.s); beat(p, pc, k.ev); pose(pc, ps); } }
      // the fan: its rear hanger snaps; it swings down from the front one, damped, settling at ~55 degrees
      for(const f of p.fans){ if(!f.swing || ps < f.swing){ f.th = 0; continue; } const tt = (ps - f.swing) / 55, th = .6 * (1 - Math.exp(-tt * 3) * Math.cos(tt * 9)); f.th = clamp(th, 0, .66);   // (the far end never below 0.75 half-road widths)
        if(X(f.swing)){ creak(); chips(f.z + 6, f.x, CH - .1, reduce ? 4 : 14, .35, true); } }
      // the lamp sections popping as you leave them (sparks from both luminaires, a pop)
      if(ps >= B + COL0){ const q = Math.floor((ps - B - SECD) / SECL); if(q > p.popped){ p.popped = q; const z0 = B + q * SECL; if(z0 + SECL > ps - 2){ pop(1);
        for(const sd of [-1, 1]) for(const zz of [ps + 3, ps + 7]) chips(zz, sd * (OW - .2), 1.26, reduce ? 2 : 6, .25, true); } } }
      // rubble raining onto the walkways just ahead of you as the bore comes down (never on the road)
      if(ps >= B + COL0 && ps < B + LEN - 4){ p.rainT -= dt; if(p.rainT <= 0){ p.rainT = reduce ? .5 : .22; const sd = rnd() < .5 ? -1 : 1, z = ps + 9 + rnd() * 8; chips(z, sd * (1.18 + rnd() * .16), 1.3, reduce ? 3 : 7, .35); dust(z, sd * 1.25, .4, 1, .16, .4, .1, .4); if(rnd() < .4) tick(.7); } }
      // the mouth behind gives way: the blast
      if(p.blastT >= 0 && Tg - p.blastT < .6 && !reduce){ p.bpT = (p.bpT || 0) - dt; if(p.bpT <= 0){ p.bpT = .05; overtake(ps); } }
      if(play && X(B + BLAST) && p.blastT < 0){ p.blastT = Tg; boom(); overtake(ps); overtake(ps); if(p.cut && !reduce) p.cut.hit(5); if(DIR && DIR.cine && !reduce) DIR.cine({ slowmo:{ scale:.8, hold:.3 }, shake:5, dur:.9 }); }
      // the hit: a hazard on the road, where you are, as you pass it
      if(play && cool <= 0 && AIR.h < 6){ const bw = bikeHalf() - HIT_GRACE;
        for(const h of p.hz){ if(h.hit || ps < h.land) continue; if(Math.abs(ps - h.Z) > 1.6) continue; if(Math.abs(playerX - h.x) > h.r * .85 + bw) continue;
          h.hit = true; if(h.twin) h.twin.hit = true; p.hits++; crash({ x:h.x, z:h.Z * SEG }); } }   // (one slab, one crash)
      if(ps > B + END - 10 && p.cut){ p.cut.end(); p.cut = null; }
      if(ps > B + END) p.done = true; },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = cur; if(!p) return; const i = s.index, B = p.B, ps = pSeg(); if(i < B - 10 || i > B + END) return;
      const P = PALS[palId(B)];
      for(const f of p.fans) if(f.z === i) fan(p, f, s, fog, now, P);
      for(const q of DP) if(q.on && Math.floor(q.z) === i) puffW(s, q, fog, now, P);
      for(const pc of p.pcs) if(pc.vis && Math.floor(pc.z) === i) drawPiece(pc, s, fog, P, ps);
      for(const q of CP) if(q.on && Math.floor(q.z) === i) chip(s, q, fog, P); },
    overlay(now){ const p = cur; if(!p) return; blast(p, now); } };

  // ---------------------------------------------------------------- drawing
  const PJ = { x:0, y:0, w:0, cz:0 };
  function proj(s, f){ const a = s.p1, b = s.p2; PJ.x = a.screen.x + (b.screen.x - a.screen.x) * f; PJ.y = a.screen.y + (b.screen.y - a.screen.y) * f; PJ.w = a.screen.w + (b.screen.w - a.screen.w) * f; PJ.cz = a.camera.z + (b.camera.z - a.camera.z) * f; return PJ; }
  // a world point (z fractional segment, x, h) to the screen; false where the road was not projected this frame
  const WP = { x:0, y:0, w:0 };
  function wp(z, x, h){ const i = Math.floor(z), s = segs[i]; if(!s || !s.p1.screen.scale || !(s.p2.screen.w > 0) || s.p1.camera.z <= DEPTH) return false; const f = z - i, a = s.p1.screen, b = s.p2.screen;
    WP.w = a.w + (b.w - a.w) * f; WP.x = a.x + (b.x - a.x) * f + x * WP.w; WP.y = a.y + (b.y - a.y) * f - h * WP.w; return true; }
  // a jet fan: a cylinder along the bore hung on two rods from the crown (studied: a pair of jet fans seen from below in a Korean road
  // tunnel: long pale drums with two raised bands, dark intakes with a hub and a stator, short rods to brackets on the crown). Seen from
  // behind and below: the drum's silhouette (the near and far discs joined by their tangents) in a 1 px outline, lit along the side
  // toward the nearer luminaire row, dark on the inner side, two dark bands round it; on top the near intake (a lit rim, the dark inside,
  // the hub). The swung fan hangs from its front rod, its rear rod snapped to a stub.
  function fan(p, f, s, fog, now, P){ const L = 9, rr = .12, hc = CH - .22, th = f.th;   // (9 segments = 0.9 half-road widths: a 4.5 m drum)
    if(!wp(f.z, f.x, hc)) return; const nx = WP.x, ny = WP.y, nw = WP.w; if(nw > W * .9) return;
    const fz = f.z + Math.cos(th) * L, fh = hc - Math.sin(th) * .9; if(!wp(fz, f.x, fh)) return; const fx = WP.x, fy = WP.y, fw = WP.w;
    const r0 = rr * nw, r1 = rr * fw; if(r0 < PX * .8) return; const F = c => fc(c, fog * .85), al = clamp(1.4 - nw / (W * .55), 0, 1); if(al <= .02) return; cx.globalAlpha = al;
    const T = P.tile;
    if(r0 < PX * 2){ cx.fillStyle = F(T[2]); pxRect(nx - r0, ny - r0, Math.max(PX, r0 * 2), Math.max(PX, r0 * 2)); if(fy > ny + PX){ pxRect(nx - PX / 2, ny, PX, fy - ny); } cx.globalAlpha = 1; return; }
    // the rods first (behind the drum): crown to the drum's top at a sixth and five sixths of its length
    for(const t of [.17, .83]){ const zz = f.z + Math.cos(th) * L * t, hh = hc - Math.sin(th) * .9 * t; if(t > .5 && th > .02){ if(wp(f.z + L * .83, f.x, CH)){ cx.fillStyle = F(P.conc[1]); pxRect(WP.x - PX, WP.y, PX * 2, Math.max(PX, snp(WP.w * .04))); } continue; }
      if(!wp(zz, f.x, CH)) continue; const tx = WP.x, ty = WP.y, tw = WP.w; if(!wp(zz, f.x, hh + rr * .8)) continue; cx.fillStyle = F(P.conc[1]); pxRect(tx - Math.max(PX, snp(tw * .012)), ty, Math.max(PX, snp(tw * .024)), WP.y - ty);
      cx.fillStyle = F(P.conc[3]); pxRect(tx - Math.max(PX, snp(tw * .03)), ty, Math.max(PX * 2, snp(tw * .06)), Math.max(PX, snp(tw * .012))); }
    let dx = fx - nx, dy = fy - ny; const dl = Math.hypot(dx, dy); let px = 1, py = 0; if(dl > .5){ px = -dy / dl; py = dx / dl; } if(px * f.x < 0){ px = -px; py = -py; }   // pp toward the outer wall
    const band = (o1, o2, col) => poly(nx + px * o1 * r0, ny + py * o1 * r0, nx + px * o2 * r0, ny + py * o2 * r0, fx + px * o2 * r1, fy + py * o2 * r1, fx + px * o1 * r1, fy + py * o1 * r1, col);
    const g = PX / r0; band(-1 - g, 1 + g, F(P.out)); disc(nx, ny, r0 + PX, F(P.out));
    band(-1, -.5, F(T[1])); band(-.5, .35, F(T[2])); band(.35, 1, F(T[2])); band(.5, .7, F(T[3])); band(.82, 1, F(T[1]));   // the drum: a pale body, the shine toward the lamp row, a shadowed edge
    for(const t of [.3, .62]){ const bx = nx + (fx - nx) * t, by = ny + (fy - ny) * t, br = r0 + (r1 - r0) * t, w = Math.max(PX, snp(br * .16)); line(bx + px * br, by + py * br, bx - px * br, by - py * br, F(T[0]), w); }
    // the near end: a pale lip, the darker intake ring with its guard, a grey hub with a lit cap (no black hole: at mid range it stays a drum)
    disc(nx, ny, r0, F(T[3])); disc(nx, ny, r0 - Math.max(PX, r0 * .14), F(T[0])); disc(nx, ny, r0 * .62, F(T[1]));
    if(r0 > PX * 3){ disc(nx, ny, Math.max(PX, r0 * .32), F(T[2])); cx.fillStyle = F(T[3]); pxRect(nx - px * r0 * .1 - PX / 2, ny - py * r0 * .1 - PX, PX, PX); }
    if(r0 > PX * 6){ cx.fillStyle = F(T[0]); pxRect(nx - r0 * .86, ny - PX * .5, r0 * .5, PX); pxRect(nx + r0 * .36, ny - PX * .5, r0 * .5, PX); }   // the guard's bar
    cx.globalAlpha = 1; }
  function disc(x, y, r, col){ if(r < PX * .6){ cx.fillStyle = col; pxRect(x - PX / 2, y - PX / 2, PX, PX); return; } cx.fillStyle = col; const n = Math.ceil(r / PX);
    for(let k = -n; k <= n; k++){ const yy = k * PX, ww = Math.sqrt(Math.max(0, r * r - yy * yy)); if(ww < PX * .5) continue; cx.fillRect(snp(x - ww), snp(y + yy), snp(ww * 2), PX); } }
  // a piece of the lining or rubble: rotate, project every vertex at its own depth, rasterise as pixel art (or a few pixels far away)
  const VX = new Float64Array(64), VY = new Float64Array(64), WZ = new Float64Array(64), RN = new Float64Array(64 * 3);
  function drawPiece(pc, s, fog, P, ps){ const pr = proj(s, pc.z - s.index); if(!(pr.w > 0) || pr.cz < pc.r * ROADW * .7 + 300) return; const Rpx = pc.r * pr.w; if(Rpx < PX * .5) return;
    const sh = S.shp[pc.shp]; if(!sh) return; const al = pc.al * (1 - fog * .2);
    // rotation (Rz . Rx), the lowest vertex sets the height: a piece rests on its lowest point
    const ca = Math.cos(pc.ax), sa = Math.sin(pc.ax), cc = Math.cos(pc.az), sc = Math.sin(pc.az);
    const r00 = cc, r01 = -sc * ca, r02 = sc * sa, r10 = sc, r11 = cc * ca, r12 = -cc * sa, r20 = 0, r21 = sa, r22 = ca;
    const V = sh.V, n = sh.nv; let ymin = 9; for(let v = 0; v < n; v++){ const y = r10 * V[v * 3] + r11 * V[v * 3 + 1] + r12 * V[v * 3 + 2]; if(y < ymin) ymin = y; }
    const hc = pc.h - ymin * pc.r, X0 = pr.x + pc.x * pr.w, Y0 = pr.y - hc * pr.w;
    if(Rpx < PX * 2){ const w2 = Math.max(PX, snp(Rpx * 2)), h2 = Math.max(PX, snp(Rpx * .9)); cx.globalAlpha = al; cx.fillStyle = fc(P.conc[2], fog * .7); pxRect(X0 - w2 / 2, Y0 - h2 / 2, w2, h2); cx.fillStyle = fc(P.conc[4], fog * .7); pxRect(X0 - w2 / 2, Y0 - h2 / 2, w2, PX); cx.globalAlpha = 1; return; }
    // its shadow on the road under it (the lamps are overhead: a dark pool right under, smaller as it is higher)
    if(pc.hz && pc.h < .1 && Rpx > PX * 2 && pSeg() > pc.hz.land){   // the settled dust fan round a fallen slab: pale grit on the dark road
      const dw = Rpx * 2.5, dh = Math.max(PX * 2, Rpx * .5), gy = pr.y - dh * .55, n = Math.max(1, Math.round(dh / PX)); cx.globalAlpha = al;
      cx.fillStyle = ditherPat(fc(P.dust[2], fog * .5), .25); for(let r = 0; r < n; r++){ const u = (r + .5) / n * 2 - 1, ww = dw * Math.sqrt(Math.max(0, 1 - u * u)); cx.fillRect(snp(X0 - ww), snp(gy + r * PX), snp(ww * 2), PX); }
      cx.fillStyle = ditherPat(fc(P.dust[2], fog * .5), .5); for(let r = 0; r < n; r++){ const u = (r + .5) / n * 2 - 1, ww = dw * .62 * Math.sqrt(Math.max(0, 1 - u * u)); cx.fillRect(snp(X0 - ww), snp(gy + r * PX), snp(ww * 2), PX); } cx.globalAlpha = 1; }
    if(pc.h < .6 && Rpx > PX * 2){ const gy = pr.y - PX, sw = Rpx * 1.2 * (1 - pc.h / .8), shh = Math.max(PX, Rpx * .3); poly(X0 - sw, gy, X0 + sw, gy, X0 + sw * .82, gy + shh, X0 - sw * .82, gy + shh, 'rgba(2,1,2,.75)'); }
    const lit = 1 - clamp(ringDarkNow(pc.z), 0, 1) * .7; IH = clamp((50 - pr.cz / SEG) / 30, 0, 1) * clamp(1.5 - Math.abs(pc.x - playerX), 0, 1);
    raster(sh, r00, r01, r02, r10, r11, r12, r20, r21, r22, X0, Y0, pr.w, pr.cz, pc.r, fog, Rpx, al, P, lit, pc.x); cx.globalAlpha = 1; }
  const ringDarkNow = z => { const p = cur; if(!p) return 0; const ps = pSeg(); if(ps < p.B + COL0) return 0; const q = Math.floor((z - p.B) / SECL); return ps >= (p.dead[q] || 0) ? 1 : 0; };
  // ---------------------------------------------------------------- the piece as pixel art (rockslide.js's raster, re-ruled for lining)
  // Light: the luminaires are overhead at both upper corners, so upward faces take the top of the ramp, faces turned toward the nearer
  // wall a step more, faces turned down the bottom. Per class: rough cast back (pits and aggregate), fresh break (paler ramp, grit), the
  // painted lining face (pale, the joint groove, soot), tiles (cream, grout grid). Every border between planes is a dark crack broken by
  // lit chips; the top silhouette takes a lit rim; a 1 px outline; rebar stubs drawn into the buffer as rust lines with a lit tip.
  // (448: the whole game canvas, so a slab beside the camera stays pixel art instead of falling back to flat facets; kodawari audit #10)
  const NSD = 16, SID = new Uint8Array(448 * 448);
  const RW = 448, FID = new Uint8Array(RW * RW), OXb = new Float32Array(RW * RW), OYb = new Float32Array(RW * RW), OZb = new Float32Array(RW * RW);
  const FB = new Uint8Array(64), FN = new Uint8Array(64), FT = new Uint8Array(64), FPI = new Uint16Array(64), FCL = new Uint8Array(64), FUP = new Float32Array(64);
  let RC = null, RG = null, RI = null;
  const RGBT = new Map(); let rgbK = '', IH = 0;
  const h3 = (x, y, z) => { let h = Math.imul(Math.floor(x), 374761393) ^ Math.imul(Math.floor(y), 668265263) ^ Math.imul(Math.floor(z), 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function palRGB(P, fog, lit){ if(FOG_COL !== rgbK){ rgbK = FOG_COL; RGBT.clear(); } const q = Math.round(clamp(fog, 0, 1) * 16), L = Math.round((lit === undefined ? 1 : lit) * 4), key = P.out + q + '_' + L; let t = RGBT.get(key);
    if(!t){ t = new Uint8Array(P.R.length * 3); P.R.forEach((c, i) => { const v = hx(mixc(mixc(c, P.dark, (4 - L) / 4 * .75), FOG_COL, q / 16 * .8)); t[i * 3] = v[0]; t[i * 3 + 1] = v[1]; t[i * 3 + 2] = v[2]; }); RGBT.set(key, t); } return t; }
  // a sparse grain in rock space: cells of size c (never under 3 canvas px apart), a share k of them hold one pixel (1) with one under it (2)
  function grain(ox, oy, oz, rp, c, k){ const cs = Math.max(c, 3 / rp), gx = Math.floor(ox / cs), gy = Math.floor(oy / cs), gz = Math.floor(oz / cs); if(h3(gx + 31, gy, gz) > k) return 0;
    const jx = (gx + .3 + h3(gx, gy + 5, gz) * .4) * cs, jy = (gy + .3 + h3(gx, gy, gz + 5) * .4) * cs, jz = (gz + .3 + h3(gx + 5, gy, gz) * .4) * cs, r = .6 / rp, dx = ox - jx, dz = oz - jz;
    if(Math.abs(dx) < r && Math.abs(oy - jy) < r && Math.abs(dz) < r * 2) return 1; if(Math.abs(dx) < r && Math.abs(oy + 1.1 / rp - jy) < r && Math.abs(dz) < r * 2) return 2; return 0; }
  function raster(sh, r00, r01, r02, r10, r11, r12, r20, r21, r22, X0, Y0, pw, cz, rr, fog, Rpx, al, P, lit, wx0){ if(!RI) return;
    const V = sh.V, n = sh.nv, PY0 = H / 2 - PITCH, ip = 1 / PX; let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    const prj = (x, y, z) => { const wx = (r00 * x + r01 * y + r02 * z) * rr, wy = (r10 * x + r11 * y + r12 * z) * rr, wz = (r20 * x + r21 * y + r22 * z) * rr, f = cz / Math.max(60, cz + wz * ROADW); return [(W / 2 + (X0 + wx * pw - W / 2) * f) * ip, (PY0 + (Y0 - wy * pw - PY0) * f) * ip]; };
    for(let v = 0; v < n; v++){ const x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2], wx = (r00 * x + r01 * y + r02 * z) * rr, wy = (r10 * x + r11 * y + r12 * z) * rr, wz = (r20 * x + r21 * y + r22 * z) * rr;
      const f = cz / Math.max(60, cz + wz * ROADW), X = (W / 2 + (X0 + wx * pw - W / 2) * f) * ip, Y = (PY0 + (Y0 - wy * pw - PY0) * f) * ip; VX[v] = X; VY[v] = Y;
      if(X < mnx) mnx = X; if(X > mxx) mxx = X; if(Y < mny) mny = Y; if(Y > mxy) mxy = Y; }
    const rp = Rpx * ip, rbOn = rp > 7 && sh.rb.length, mg = rbOn ? Math.ceil(rp * .3) + 2 : 2;
    const cw = cx.canvas.width, chh = cx.canvas.height, x0 = Math.max(0, Math.floor(mnx) - mg), y0 = Math.max(0, Math.floor(mny) - mg), x1 = Math.min(cw, Math.ceil(mxx) + mg), y1 = Math.min(chh, Math.ceil(mxy) + mg), w = x1 - x0, h = y1 - y0;
    const F = sh.F, fr = sh.fr; if(w <= 0 || h <= 0) return; if(w > RW || h > RW) return flat();
    for(let y = 0; y < h; y++) FID.fill(255, y * RW, y * RW + w);
    const sdl = wx0 > 0 ? 1 : -1, SD = rp > 7 && sh.sd ? sh.sd : null; let nv = 0;
    for(let k = 0; k < F.length && nv < 64; k++){ const f = F[k], a = f[0], b = f[1], c = f[2], ax2 = VX[a] - x0, ay2 = VY[a] - y0, bx = VX[b] - x0, by = VY[b] - y0, cx2 = VX[c] - x0, cy2 = VY[c] - y0;
      const det = (bx - ax2) * (cy2 - ay2) - (by - ay2) * (cx2 - ax2); if(det <= 0) continue;
      const nx = r00 * f[3] + r01 * f[4] + r02 * f[5], ny = r10 * f[3] + r11 * f[4] + r12 * f[5], nz = r20 * f[3] + r21 * f[4] + r22 * f[5];
      const key = .62 * ny + .3 * nx * sdl - (.08 + .32 * IH) * nz, t = key > .62 ? 4 : key > .32 ? 3 : key > .05 ? 2 : key > -.3 ? 1 : 0, cl = fr[k], id = nv++;
      FCL[id] = cl; FPI[id] = f[6] || k + 100; FUP[id] = f[4];
      if(cl === 1){ FB[id] = 5; FN[id] = 5; FT[id] = Math.max(1, t); } else if(cl === 2){ FB[id] = 10; FN[id] = 4; FT[id] = Math.min(3, Math.max(0, t - 1)); } else if(cl === 3){ FB[id] = 14; FN[id] = 4; FT[id] = Math.min(3, Math.max(0, t - 1)); } else { FB[id] = 0; FN[id] = 5; FT[id] = t; }
      const px0 = Math.max(0, Math.floor(Math.min(ax2, bx, cx2))), px1 = Math.min(w - 1, Math.ceil(Math.max(ax2, bx, cx2))), py0 = Math.max(0, Math.floor(Math.min(ay2, by, cy2))), py1 = Math.min(h - 1, Math.ceil(Math.max(ay2, by, cy2)));
      const id2 = 1 / det, Va = a * 3, Vb = b * 3, Vc = c * 3, sub = SD && cl < 2;
      for(let py = py0; py <= py1; py++){ const yc = py + .5; for(let px = px0; px <= px1; px++){ const xc = px + .5;
        const l2 = ((xc - ax2) * (cy2 - ay2) - (yc - ay2) * (cx2 - ax2)) * id2, l3 = ((bx - ax2) * (yc - ay2) - (by - ay2) * (xc - ax2)) * id2, l1 = 1 - l2 - l3;
        if(l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const i = py * RW + px; FID[i] = id;
        const ox = l1 * V[Va] + l2 * V[Vb] + l3 * V[Vc], oy = l1 * V[Va + 1] + l2 * V[Vb + 1] + l3 * V[Vc + 1], oz = l1 * V[Va + 2] + l2 * V[Vb + 2] + l3 * V[Vc + 2]; OXb[i] = ox; OYb[i] = oy; OZb[i] = oz;
        if(sub){ let bs = 0, bd = 1e9; for(let c = 0, o3 = 0; c < NSD; c++, o3 += 3){ const dx = ox - SD[o3], dy = oy - SD[o3 + 1], dz = oz - SD[o3 + 2], dd = dx * dx + dy * dy + dz * dz; if(dd < bd){ bd = dd; bs = c; } } SID[py * 448 + px] = bs; } } } }
    const T = palRGB(P, fog, lit), d = RI.data, det = rp > 8, SO = sh.so;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * RW + x, o = i * 4, k = FID[i]; let ci = -1;
      if(k === 255){ if((x > 0 && FID[i - 1] !== 255) || (x + 1 < w && FID[i + 1] !== 255) || (y > 0 && FID[i - RW] !== 255) || (y + 1 < h && FID[i + RW] !== 255)) ci = 18; }
      else { const b = FB[k], nT = FN[k], t = FT[k], cl = FCL[k], ox = OXb[i], oy = OYb[i], oz = OZb[i]; ci = b + t;
        const ku = y > 0 ? FID[i - RW] : 255, kr = x + 1 < w ? FID[i + 1] : 255, kd = y + 1 < h ? FID[i + RW] : 255;
        if(ku === 255 && t >= 1) ci = b + nT - 1;   // the lit rim along the top silhouette
        else if((kr !== 255 && FPI[kr] !== FPI[k]) || (kd !== 255 && FPI[kd] !== FPI[k])){   // a border between planes: a dark crack, lit chips on the lighter side
          const ot = kd !== 255 && FPI[kd] !== FPI[k] ? kd : kr, cq = Math.max(9, rp * .4), hs = h3(ox * cq, oy * cq, oz * cq);
          ci = FT[k] > FT[ot] && hs < .42 ? b + Math.min(nT - 1, t + 1) : b + Math.max(0, t - 2); }
        else if(det){
          let done = false;
          if(cl !== 3 && sh.cr) for(let c = 0; c < sh.cr.length && !done; c++){   // hairline fracture lines across the planes, a lit lip on one side
            const q = sh.cr[c], vv = ox * q[0] + oy * q[1] + oz * q[2] - q[3], along = ox * q[4] + oy * q[5] + oz * q[6]; if(along < q[7] || along > q[8]) continue;
            if(vv >= 0 && vv < 1.05 / rp){ ci = b + Math.max(0, t - 2); done = true; } else if(vv >= -1.05 / rp && vv < 0 && t + 1 < nT && h3(ox * 13, oy * 13, oz * 13) < .55){ ci = b + t + 1; done = true; } }
          if(!done && SD && cl < 2){   // the chip it sits on: a lit lip under another chip, a dark one over it, else the chip's own step of the tone
            const sc = SID[y * 448 + x], su = y > 0 && FID[i - RW] === k ? SID[(y - 1) * 448 + x] : sc, sdn = y + 1 < h && FID[i + RW] === k ? SID[(y + 1) * 448 + x] : sc;
            if(su !== sc && t + 1 < nT){ ci = b + t + 1; done = true; } else if(sdn !== sc && t > 0){ ci = b + t - 1; done = true; } else if(SO[sc]) ci = b + clamp(t + SO[sc], 0, nT - 1); }
          if(done){}
          else if(cl === 1){ const g = grain(ox, oy, oz, rp, .06, .34); if(g === 1) ci = h3(ox * 7, oy * 7, oz * 7) > .5 ? 19 : b + Math.max(0, t - 2); else if(g === 2) ci = b + Math.max(0, t - 1); }   // grit on the break: a pale grain, its shadow under it
          else if(cl === 2){   // the painted lining: the joint groove across it, soot streaks along it (whole bands, no speckle)
            if(Math.abs(oz - .05) < 1.1 / rp) ci = b + Math.max(0, t - 2);
            else if(h3(Math.floor(ox * 4.5 + .5), 0, 3) > .72) ci = 24; }
          else if(cl === 3){ const sp = rp / 3.5, gz = oz * 7, c = Math.floor(gz), gx = ox * 3.5 + (c & 1) * .5, lz = 3.5 / rp, lx = 1.75 / rp;   // tiles in courses (running bond), one-pixel grout, each course's upper row lit
            if(sp >= 6){ if(Math.abs(gz - Math.round(gz)) < lz) ci = 23; else if(sp >= 6 && Math.abs(gx - Math.round(gx)) < lx) ci = 23; else if(sp >= 8 && gz - c < lz * 2.2 && t + 1 < nT) ci = b + t + 1; } }
          else { const g = grain(ox, oy, oz, rp, .12, .12); if(g === 1) ci = b + Math.max(0, t - 2); else if(g === 2) ci = b + Math.min(nT - 1, t + 1);   // cast: a few air voids, dark with a lit lower lip
            else if(FUP[k] > .85 && Math.abs(ox) < .22 && t + 1 < nT) ci = b + t + 1; } } }   // the back of the lining: the arch's curve as one lit band
      if(ci < 0){ d[o + 3] = 0; continue; }
      d[o] = T[ci * 3]; d[o + 1] = T[ci * 3 + 1]; d[o + 2] = T[ci * 3 + 2]; d[o + 3] = 255; }
    // rebar stubs out of the breaks: projected from the piece's own points, rust with a lit end
    if(rbOn) for(const q of sh.rb){ const a0 = prj(q[0], q[1], q[2]), a1 = prj(q[0] + q[3], q[1] + q[4], q[2] + q[5]); const ax = a0[0] - x0, ay = a0[1] - y0, bx = a1[0] - x0, by = a1[1] - y0, nn = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
      for(let u = 0; u <= nn; u++){ const px = Math.floor(ax + (bx - ax) * u / Math.max(1, nn)), py = Math.floor(ay + (by - ay) * u / Math.max(1, nn)); if(px < 0 || py < 0 || px >= w || py >= h) continue; const i = py * RW + px;
        if(u === 0 && FID[i] !== 255) continue; const ci = u === nn ? 21 : 22, o = i * 4; d[o] = T[ci * 3]; d[o + 1] = T[ci * 3 + 1]; d[o + 2] = T[ci * 3 + 2]; d[o + 3] = 255; } }
    RG.putImageData(RI, 0, 0, 0, 0, w, h); cx.globalAlpha = al; cx.imageSmoothingEnabled = false; cx.drawImage(RC, 0, 0, w, h, x0 * PX, y0 * PX, w * PX, h * PX);
    function flat(){ for(let k = 0; k < F.length; k++){ const f = F[k], a = f[0], b = f[1], c = f[2]; if((VX[b] - VX[a]) * (VY[c] - VY[a]) - (VY[b] - VY[a]) * (VX[c] - VX[a]) <= 0) continue;
        const ny = r10 * f[3] + r11 * f[4] + r12 * f[5], t = ny > .6 ? 4 : ny > .2 ? 3 : ny > -.2 ? 2 : 1; cx.globalAlpha = al; poly(VX[a] * PX, VY[a] * PX, VX[b] * PX, VY[b] * PX, VX[c] * PX, VY[c] * PX, fc((fr[k] === 1 ? P.fresh : P.conc)[t], fog)); } } }
  // tests: every piece large, in three turns, on dark ground (a contact sheet)
  function preview(id){ const P = PALS[id || 's']; cx.fillStyle = '#100a08'; cx.fillRect(0, 0, W, H); const keys = Object.keys(S.shp);
    keys.forEach((k, i) => { for(let t = 0; t < 2; t++){ const X = 130 + (i % 5) * 250, Y = 120 + (i / 5 | 0) * 380 + t * 180, ax = -.25 - t * .4, az = t * .5 - .25, ca = Math.cos(ax), sa = Math.sin(ax), cc = Math.cos(az), sc = Math.sin(az), sz = k.length > 1 && k[0] === 'c' ? 70 : 150;
      raster(S.shp[k], cc, -sc * ca, sc * sa, sc, cc * ca, -cc * sa, 0, sa, ca, X, Y, sz, 1e9, 1, 0, sz, 1, P, 1, X - W / 2); } });
    return cx.canvas.toDataURL('image/png'); }
  function chip(s, q, fog, P){ const pr = proj(s, q.z - s.index); if(!(pr.w > 0) || pr.cz < 300) return; const sz = Math.max(PX, snp(pr.w * (q.sp ? .011 : .014)));
    if(q.sp){ cx.fillStyle = P.spark[q.c]; const yy = snp(pr.y - q.h * pr.w); cx.fillRect(snp(pr.x + q.x * pr.w), yy, sz, sz); if(q.vh < -.3) cx.fillRect(snp(pr.x + q.x * pr.w), yy - sz, sz, sz); return; }
    cx.fillStyle = fc(q.c ? P.conc[3] : P.fresh[2], fog); cx.fillRect(snp(pr.x + q.x * pr.w), snp(pr.y - q.h * pr.w), sz, sz); }
  // a dust cloud of about D css px: the nearest built size, drawn at exactly one canvas pixel per sprite pixel
  function puff(x, y, D, v, ph, now, al, id){ if(D < PX * 3 || x < -D || x > W + D || y < -D || y > H + D) return; const q = D / PX; let N = DS[0]; for(const n of DS) if(Math.abs(n - q) < Math.abs(N - q)) N = n;
    if(q > 150) al *= clamp(1 - (q - 150) / 60, 0, 1); if(al <= .02) return; const fr = ((now / (reduce ? 900 : 340) + ph * 3) | 0) % 3;
    cx.globalAlpha = al; blit(S[id + N + '_' + (v % 3) + '_' + fr], x, y + N * PX / 2, PX); }
  function puffW(s, q, fog, now, P){ const pr = proj(s, q.z - s.index); if(!(pr.w > 0) || pr.cz < 300) return; const life = q.t / q.life, al = (life < .15 ? life / .15 : 1 - (life - .15) / .85) * (1 - fog * .6) * .9;
    puff(pr.x + q.x * pr.w, pr.y - (q.h + q.r * .4) * pr.w, q.r * 2.4 * pr.w, q.v, q.v * .3 + q.z * .01, now, al, palId(cur ? cur.B : 0)); cx.globalAlpha = 1; }
  // the blast from the mouth behind: dust overtakes you. The screen's edges fill with dithered dust bands that rush inward, motes streak
  // past you toward the far opening (they overtake: they shrink into the vanishing point), then it thins out in the night air.
  function blast(p, now){ if(p.blastT < 0) return; const bt = (Tg - p.blastT) / (reduce ? 2.6 : 2.1); if(bt > 1) return; const ps = pSeg();
    const e = sm(bt / .12) * (1 - sm((bt - .3) / .7)), P = PALS[palId(p.B)]; if(e <= .01) return;
    const st = PX * 4, ph = reduce ? 0 : now / 300, col = P.dust[0];
    for(let pass = 0; pass < 2; pass++){ cx.fillStyle = ditherPat(pass ? P.dust[1] : col, pass ? .25 : (e > .6 ? .5 : .25)); const kk = (pass ? .2 : .11) * e;
      for(let y = 0; y < H; y += st){ const wv = 1 + .35 * Math.sin(y * .02 + ph) + .2 * Math.sin(y * .061 - ph * 1.4), wl = snp(W * kk * wv), wr = snp(W * kk * (2 - wv)); if(wl > 0) cx.fillRect(0, y, wl, st); if(wr > 0) cx.fillRect(W - wr, y, wr, st); }
      for(let x = 0; x < W; x += st){ const wv = 1 + .4 * Math.sin(x * .017 - ph) + .2 * Math.sin(x * .05 + ph), ht = snp(H * (pass ? .17 : .09) * e * wv); if(ht > 0) cx.fillRect(x, 0, st, ht); } }
    // motes overtaking: born at the edges, drawn in toward the vanishing point (never across the road under the bike)
    const vy = typeof HZ === 'number' ? HZ : H / 2, n = reduce ? 16 : 54;
    for(let j = 0; j < n; j++){ const a = H1(j * 3.7 + 9) * 6.283, cs = Math.cos(a), sn = Math.sin(a); if(sn > .3 && Math.abs(cs) < .6) continue;
      const ph2 = ((now / (reduce ? 1400 : 420)) + H1(j * 1.3)) % 1, u = 1 - ph2, rr = (.05 + u * u * .95) * W * .62, len = Math.max(1, Math.round(u * u * 10)), mw = u > .6 ? PX * 2 : PX;
      const x = W / 2 + cs * rr, y = vy + sn * rr * .62; if(x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      cx.globalAlpha = e * (ph2 < .1 ? ph2 / .1 : 1); cx.fillStyle = j % 3 ? P.dust[2] : P.gp;
      for(let t = 0; t < len; t += 2) cx.fillRect(snp(x + cs * t * PX), snp(y + sn * t * PX * .62), mw * (Math.abs(cs) > .7 ? 2 : 1), mw * (Math.abs(cs) > .7 ? 1 : 2)); }
    // dithered dust drifting at the sides, carried ahead
    for(let j = 0; j < (reduce ? 4 : 6); j++){ const sd = j % 2 ? 1 : -1, row = j >> 1, D = H * (.32 + H1(j * 3.3) * .1), bx = W / 2 + sd * W * (.44 + row * .03 - bt * .1), by = H * (.12 + row * .22) + (reduce ? 0 : Math.sin(now / 700 + j) * PX * 3);
      puff(bx, by, D, j, H1(j * 1.9), now, e * .5, palId(p.B)); }
    cx.globalAlpha = 1; }
})();
