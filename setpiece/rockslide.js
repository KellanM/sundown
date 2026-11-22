/* Sundown set piece: 落石 ROCKSLIDE on the Mountain Pass (MECH.sp_rock, director id 'rockslide', hero tier). See setpiece/README.md.
   Load after setpiece/screenfall.js:   <script src="setpiece/rockslide.js"></script>

   The cut slope above a bend lets go at night. First the warning: dust trickles off the crest, small stones skip across the road, a low
   rumble, a 落石注意 sign already bent flat by an earlier rock. You pass under the shrine's torii; the mountain cracks. A giant boulder
   bounds down the face and across all three lanes ahead of you, through the far guard rail and into the dark valley (the safe establishing
   shot). Then the slide proper: boulders bound down the face, hit the road, bounce, one splits in two, and they settle in the lanes as
   readable obstacles with open gaps; the last one is still rolling across as you reach it. A wall of dust rolls off the slope over the
   road; you ride into it and burst out under the next torii.

   The stage. env/pass.js lays its shrine at i % 400 = 166..240 (torii at 200). The event is laid on one 400-block B: the build-up on a cut
   before the shrine (B-60..B+174), the shrine as the breath (B+176..B+232, no cliff), the slide on the cut after it (B+232..B+574), and the
   exit through the next shrine's torii (B+600). The road there is eased into a gentle bend toward the cliff (curve 0.35: the face is seen
   ahead without the inside of the bend hiding the far road, and holding a lane needs almost no steering), and this file lays the cliff itself as env/pass.js 'wall' sprites (its renderer,
   its LOD), so the cut always stands on the right side and at full height.

   Beats (all driven by the rider's segment, never the clock; s = segments from B; ~12 s at top speed from the rumble to the torii):
     s -60   rumble starts, dust trickles off the crest; the letterbox and the director's guard (traffic moved off, oil swept)
     s -40   the card 落石 ROCKSLIDE (every occurrence)
     s -25   the bent 落石注意 sign on the valley side, the rock that bent it beside it
     s -20..160  pebbles skip across the road (harmless, small) and patter; the rumble builds
     s 165   R0, a house-sized boulder (r 0.6), breaks from the hill above the cut and bounds down the face; at 215, just past the torii,
             it hits the road 60 segments ahead (slow motion, shake), rolls across every lane and through the valley rail at 247 and over the
             edge: seen, never met (it is off the road 28 segments before you could reach it)
     s 220 / 290 / 360 / 445  the hazards land (each 130 segments before you reach it; R4 100) and settle 90 out (>= 1.2 s even boosted):
             R1 (350) in the cliff lane; R2 (420) splits on impact: halves in the centre and the valley lanes, the cliff lane open;
             R3 (490) in the centre, both outer lanes open; R4 (545) rolls from the cliff side toward the valley at a walking pace and is in
             the valley lane as you reach it: go behind it (cliff side) or centre
     s 470..553  the dust wall rolls off the slope over the road at 556..604; inside it a veil over the sky, boiling edges and the exit
             curtain ahead (no hazards, no traffic)
     s 600   burst out under the torii; scree and settling dust behind
   Fairness (kikubari): every hazard is on the road and readable from 130 segments and settled 90 out (1.2 s at the boosted cap); each row
   leaves at least one lane plus the spaces between; rows that need a two-lane change toward the cliff (the slow direction in the bend) are
   75 apart; one crash per rock at most, the recovery blink protects as always; the guard clears traffic and oil from B-40 to B+660.
   Rocks are geometry rendered as pixel art: convex hulls (granite and andesite blocks with flat-cut bases, after the Jalalabad road boulder
   and the Lauzet block) rotated and projected per vertex at their own depth, then rasterised by hand at the canvas's own resolution into a
   scratch buffer, every pixel knowing its facet and its point on the rock (so the texture turns with it): hue-shifted ramps (cool moonlit
   tops, warm-purple undersides, a warm-grey headlight bounce only on faces squarely toward the bike), a dark crack along every border
   between planes broken by lit chips (Sea of Stars' stonework: the detail lives on the edges), fracture lines across facets, lichen and
   moss in small clusters, pale fresh breaks with pixel-scale grit, a moonlit rim on the top silhouette, a 1 px dark outline; chips and grit
   stay on the road along each rock's last bounces. Dust is ordered-dither density layers (dark brown base, grey-brown body, cool moonlit
   rim; warm where the lanterns and headlight light it from inside), see-through and combed by the wind, never outlined blobs; inside the
   cloud the screen's edges darken in wavering dither bands, a thin veil lies over the sky and motes streak past the camera, then clean air.
   Inside the event the pass's own near-camera props are handled: its signs are dropped (the bent sign is the warning) and the torii,
   sakura, jizo and stone lanterns fade as they near the camera (they turn into giant sprite pixels there). Tests: MECH.sp_rock.hazards(),
   .hits(), ._preview() (rock contact sheet), ?rsside=-1|1 forces the cliff side.
   Reduced motion: no shake, gentler slow motion, slower dust churn, fewer particles, the dust burst fades instead of flying apart.
   Performance: all sprites and hulls built in warm(); pooled particles; nothing allocates a canvas mid-ride. */
"use strict";
(() => {
  const DIR = MECH.director, ID = 'rockslide', CARD = { kanji:'落石', name:'ROCKSLIDE', sub:'read the rocks, take the gap', col:'#ffb040' };
  if(DIR) DIR.register(ID, { tier:'hero', roads:['pass'], card:CARD });
  const CV = .35, CLIFFX = 1.16, WALLH = 1.25, LEAN = .3, END = 660, DUST0 = 556, DUST1 = 604;
  const sm = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
  const snp = v => Math.round(v / PX) * PX;
  const pSeg = () => (position + PZ) / SEG;
  const H1 = n => hash(n);
  let Tg = 0;
  const plans = [];
  const S = {};
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------------------------------------------------------------- palettes: hue-shifted ramps
  // Mountain-pass andesite and granite at night are blue-grey to dark grey. The moon (ahead, above) lights the tops cool; the shadow side
  // falls toward a warm purple-brown (the hue shift Sea of Stars and Hyper Light Drifter use for stone); the headlight warms only the faces
  // turned to the bike, toward a warm grey (never beige). A split's fresh break is paler, with grit. Lichen and moss in deliberate clusters.
  const COOL = ['#1c1824', '#2a2f3e', '#3f4e60', '#5d7387', '#97adbf'];    // underside (warm purple), shadow, mid, moonlit plane, moonlit top
  const WARM = ['#2a1e26', '#483838', '#6e5c52', '#9c8470'];               // faces in the headlight (hue-shifted: plum shadow to warm sand; was four greys)
  const FRESH = ['#28282e', '#46484e', '#6c7074', '#979a9c', '#c2c4c2'];   // a fresh break
  const LICH = ['#2c3a2c', '#4c5e44', '#7e9270'];                          // moss in shade, lichen, lichen in moonlight
  const OUT = '#0a0910';
  // the raster palette: COOL 0-4, WARM 5-8, FRESH 9-13, LICH 14-16, OUT 17; grit pale 18, grit dark 19
  const RPAL = COOL.concat(WARM, FRESH, LICH, [OUT, '#8a96a6', '#121218']);
  // dust: dark brown at the base, grey-brown body, cool moonlit top edge; a warm body and base where the lanterns and headlight light it
  const DUSTK = ['#3a302a', '#5a524c', '#7e8ea2'], DUSTW = ['#5e4632', '#76665a', '#8e9cae'], DS = [8, 12, 16, 24, 32, 48, 64, 96, 128];
  // fog: toward the road's fog colour, quantised, cached (no strings built per frame once warm)
  let fogK = '', FC = new Map();
  const fc = (c, f) => { if(FOG_COL !== fogK){ fogK = FOG_COL; FC.clear(); } const q = Math.round(clamp(f, 0, 1) * 16), k = c + q; let v = FC.get(k); if(!v){ v = mixc(c, FOG_COL, q / 16 * .8); FC.set(k, v); } return v; };

  // ---------------------------------------------------------------- rock geometry: convex hulls (built in warm)
  function hull(P){ const n = P.length, F = [];
    for(let i = 0; i < n; i++) for(let j = i + 1; j < n; j++) for(let k = j + 1; k < n; k++){
      const a = P[i], b = P[j], c = P[k], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz); if(L < 1e-6) continue; nx /= L; ny /= L; nz /= L;
      let pos = 0, neg = 0; for(let l = 0; l < n; l++){ if(l === i || l === j || l === k) continue; const d = (P[l][0] - a[0]) * nx + (P[l][1] - a[1]) * ny + (P[l][2] - a[2]) * nz; if(d > 1e-6) pos++; else if(d < -1e-6) neg++; }
      if(pos && neg) continue;
      if(pos) F.push([i, k, j, -nx, -ny, -nz, 0]); else F.push([i, j, k, nx, ny, nz, 0]); }
    // coplanar triangles (a flat base, a break face) become one fan over the plane's own 2D hull, so a facet is a few polygons, not dozens
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
  // a granite block: points on a rounded box (a superellipsoid, |x|^3 + |y|^3 + |z|^3 = 1: blocky masses with softened corners, like the
  // Lauzet block), squashed and jittered; the base cut flat (rocks come to rest on a face); scaled to radius 1
  function boxy(R, ax, ay, az, fl, n, P){ for(let i = 0; i < n; i++){ const u = R() * 2 - 1, t = R() * 6.283, q = Math.sqrt(1 - u * u), dx = Math.cos(t) * q, dy = u, dz = Math.sin(t) * q;
      const k = 1 / Math.cbrt(Math.abs(dx) ** 3 + Math.abs(dy) ** 3 + Math.abs(dz) ** 3), rr = .9 + R() * .14; P.push([dx * k * ax * rr, Math.max(-fl, dy * k * ay * rr), dz * k * az * rr]); } return P; }
  function shape(seed, n, fl){ let sd = seed * 7919 + 13; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const ax = .9 + R() * .25, ay = .62 + R() * .2, az = .8 + R() * .25, P = boxy(R, ax, ay, az, fl, n, []);
    P.push([-.6 * ax, -fl, -.5 * az], [.62 * ax, -fl, -.45 * az], [.15, -fl, .7 * az]);
    return finish(P, false); }
  function finish(P, cut){ let cxm = 0, cym = 0, czm = 0; for(const p of P){ cxm += p[0]; czm += p[2]; } cxm /= P.length; czm /= P.length;
    for(const p of P){ p[0] -= cxm; p[2] -= czm; } let ymin = 9; for(const p of P) ymin = Math.min(ymin, p[1]); for(const p of P) p[1] -= ymin;   // the base at y = 0
    let rm = 0; for(const p of P) rm = Math.max(rm, Math.hypot(p[0], p[1] - .7, p[2])); const k = 1 / Math.max(.6, rm);
    for(const p of P){ p[0] *= k; p[1] = (p[1] - .7) * k + .7; p[2] *= k; }   // the centre 0.7 above the base (rocks sit on their base)
    const V = new Float64Array(P.length * 3); P.forEach((p, i) => { V[i * 3] = p[0]; V[i * 3 + 1] = p[1] - .7; V[i * 3 + 2] = p[2]; });
    const F = hull(P), fr = new Uint8Array(F.length); if(cut) F.forEach((f, i) => { fr[i] = (cut(P[f[0]]) && cut(P[f[1]]) && cut(P[f[2]])) ? 1 : 0; });
    return { V, F, fr, nv:P.length }; }
  // a split: the parent's points either side of a near-vertical plane, plus the hull edges' crossings (the fresh break face)
  function halves(seed){ let sd = seed * 31 + 5; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, P = boxy(R, 1.05, .74, .95, .6, 18, []);
    const nx = .94, ny = -.2, nz = .22, side = p => p[0] * nx + p[1] * ny + p[2] * nz, F = hull(P), X = [];
    for(const f of F) for(let e = 0; e < 3; e++){ const a = P[f[e]], b = P[f[(e + 1) % 3]], da = side(a), db = side(b); if((da > 0) !== (db > 0)){ const t = da / (da - db); X.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); } }
    const A = P.filter(p => side(p) > 0).concat(X.map(p => p.slice())), Bp = P.filter(p => side(p) <= 0).concat(X.map(p => p.slice()));
    // each half is turned about the vertical so its fresh break shows three-quarters toward you as it comes to rest (A by -40deg, B by +60deg)
    const ry = (p, t) => { const c = Math.cos(t), s2 = Math.sin(t); return [p[0] * c + p[2] * s2, p[1], -p[0] * s2 + p[2] * c]; };
    const mk = (L, t, no) => { const S0 = finish(L.map(p => ry(p, t)), null), nn = ry(no, t); S0.fr = new Uint8Array(S0.F.length); S0.F.forEach((f, i) => { S0.fr[i] = f[3] * nn[0] + f[4] * nn[1] + f[5] * nn[2] > .96 ? 1 : 0; }); return S0; };
    return [mk(A, -.7, [-nx, -ny, -nz]), mk(Bp, 1.05, [nx, ny, nz])]; }

  // ---------------------------------------------------------------- sprites (warm)
  // dust, as rockfall dust looks at night: no outline, no solid blob. A density field (a few soft lobes, stretched along the wind, combed into
  // streaks) is cut into ordered-dither layers (12, 25, 50, 75 %), so the cloud is see-through at its edges and thick only at its heart.
  // Colour by height: a dark brown base, a grey-brown body, a cool moonlit rim on the top edge. warm: the body and base lit from inside.
  const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function dustSpr(N, v, f, warm){ const c = can(N, N), k = c.getContext('2d'), img = k.createImageData(N, N), d = img.data, P = warm ? DUSTW : DUSTK, rgb = P.map(hx);
    let sd = 101 + v * 977 + N; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, L = [];
    for(let j = 0; j < 5; j++) L.push([.5 + (R() - .5) * .5 + f * .025 * (j % 2 ? 1 : -1), .58 + (R() - .5) * .3 - j * .02, .2 + R() * .16, R() * 6.283]);
    const D = new Float32Array(N * N);
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const u = (x + .5) / N, w = (y + .5) / N; let a = 0;
      for(const [lx, ly, lr, ph] of L){ const dx = (u - lx) / 1.25, dy = (w - ly) / .8, q = 1 - (dx * dx + dy * dy) / (lr * lr); if(q > a) a = q; }
      a *= .8 + .2 * Math.sin(w * N * .9 + v * 2.1 + f * 1.3);                       // combed into horizontal wind streaks
      a *= 1 - Math.max(0, (w - .82) / .18);
      a *= sm(Math.min(u, 1 - u) / .16) * sm(Math.min(w, 1 - w) / .12);
      D[y * N + x] = a; }
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const a = D[y * N + x], th = (BAY4[(y & 3) * 4 + (x & 3)] + .5) / 16;
      const lv = a > .62 ? .75 : a > .38 ? .5 : a > .18 ? .25 : a > .06 ? .125 : 0; if(th >= lv) continue;
      const up = y > 0 ? D[(y - 1) * N + x] : 0, top = up < .06 && y < N * .55, w = y / N, ci = top ? 2 : w > .6 ? 0 : 1, o = (y * N + x) * 4;
      d[o] = rgb[ci][0]; d[o + 1] = rgb[ci][1]; d[o + 2] = rgb[ci][2]; d[o + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // the 落石注意 sign (Route 41: a yellow diamond, black border, the slope pictogram with falling stones, a white plate) with its post bent
  // over 45 degrees by a rock. At exactly 45 degrees the diamond turns into an upright square and the plate into a clean pixel diagonal, so
  // the bent sign is drawn on the grid by hand, not resampled (a resampled turn left holes and broken edges). dir: the way it leans.
  function signSprite(dir){ const c = can(32, 40), k = c.getContext('2d'), P = (x, y, col) => { k.fillStyle = col; k.fillRect(dir < 0 ? x : 31 - x, y, 1, 1); };
    for(let y = 24; y < 40; y++){ P(24, y, '#8a8e98'); P(25, y, '#5a5e68'); P(26, y, '#2a2e36'); }                                   // the post, standing
    P(23, 40 - 1, '#2a2e36'); P(27, 39, '#2a2e36');
    for(let t = 0; t < 5; t++){ P(23 - t, 23 - t, '#8a8e98'); P(24 - t, 23 - t, '#5a5e68'); P(24 - t, 24 - t, '#2a2e36'); }           // bent: the upper post leans away
    P(24, 24, '#5a5e68'); P(25, 23, '#2a2e36');                                                                                      // the kink
    for(let y = 10; y < 27; y++) for(let x = 10; x < 27; x++){ const dx = x - 18, dy = y - 18, a = Math.abs(dx + dy), b = Math.abs(dx - dy); if(a > 2.1 || b > 6.4) continue;   // the plate, on the diagonal
      P(x, y, a > 1.4 || b > 5.6 ? '#3a3a40' : (dx + dy === 0 && (dx - dy) % 2 === 0 && b < 5) ? '#202028' : '#e8e6de'); }
    for(let y = 2; y <= 15; y++) for(let x = 2; x <= 15; x++){ let col = x === 2 || x === 15 || y === 2 || y === 15 ? '#1a1410' : y < 5 ? '#ffd050' : x === 14 ? '#d89418' : '#f0b020';   // the diamond, now square
      if(col !== '#1a1410'){ if(x + y >= 22 && x <= 13 && y <= 13) col = '#1a1410'; if((x === 6 && y === 9) || (x === 8 && y === 6) || (x === 5 && y === 12) || (x === 9 && y === 10)) col = '#1a1410';
        if(x - y === -1 && x > 3 && y < 14 && col !== '#1a1410') col = '#a86a10'; if(x - y === -2 && x > 3 && y < 14 && col !== '#1a1410') col = '#ffe080'; }   // the dent: a crease with a lit lip
      P(x, y, col); }
    return c; }

  // ---------------------------------------------------------------- the plan: one 400-block of the pass
  // knots: { s: the rider's segment at this knot, x, h (base height), hop: the arc to this knot, ev: a beat }
  function knot(s, x, h, hop, ev){ return { s, x, h, hop:hop || 0, ev:ev || '' }; }
  // a boulder's fall to its impact: on the hill, over the crest, a strike on the face, the road (m: the cliff side)
  function fallTo(m, land){ return [knot(land - 50, m * 2.55, 1.72), knot(land - 30, m * 1.58, 1.33, .14, 'crest'), knot(land - 14, m * 1.38, .64, .07, 'face'), knot(land, m * .96, 0, .05, 'impact')]; }
  function settle(K, xr, a, xs){ const x0 = K[K.length - 1].x, s0 = K[K.length - 1].s; K.push(knot(s0 + 18, x0 + (xr - x0) * .62, 0, .3, 'bounce'), knot(s0 + 30, x0 + (xr - x0) * .92, 0, .1, 'bounce'), knot(s0 + 40, xr, 0, .03)); return K; }
  function rock(o){ return Object.assign({ x:0, h:0, hc:0, z:0, ax:0, ay:0, az:0, vis:false, hit:false, al:1, hz:true, sx:0, sy:0, R:0, sh:0, kk:-1 }, o); }
  function build(B, m){ const p = { B, m, off:false, done:false, on:false, cut:null, lastPs:null, rocks:[], peb:[], scree:[], hits:0, rumT:0, burstT:-1, broke:[], hzSwept:false, cvTo:B - 81 };
    const R = (o) => { const r = rock(o); p.rocks.push(r); return r; };
    // R0: the establishing boulder, rolls through everything and off the edge long before you get there
    { const Z = B + 275, land = B + 215, K = fallTo(m, land); K.push(knot(land + 10, m * .7, 0, .22, 'bounce'), knot(land + 22, -m * .3, 0, .04), knot(land + 32, -m * 1.12, 0, .04, 'rail'), knot(land + 40, -m * 1.55, .1, .4), knot(land + 56, -m * 2.5, -.9, .3, 'gone'));
      R({ id:'R0', K, Z, zs:8, r:.6, shp:0, roll:true, spin:.06 }); }
    // R1: settles in the cliff lane
    { const Z = B + 350, land = Z - 130; R({ id:'R1', K:settle(fallTo(m, land), m * .62), Z, zs:7, r:.27, shp:1, spin:.08 }); }
    // R2: splits on impact into two halves: centre and valley lanes; the cliff lane is the gap
    { const Z = B + 420, land = Z - 130, K = fallTo(m, land); const par = R({ id:'R2', K, Z, zs:6, r:.31, shp:'P', spin:.07, split:true });
      const sA = land, KA = [knot(sA, m * .9, 0), knot(sA + 16, m * .55, 0, .36, 'bounce'), knot(sA + 30, m * .14, 0, .12, 'bounce'), knot(sA + 41, 0, 0, .03)];
      const KB = [knot(sA, m * 1.02, 0), knot(sA + 18, m * .25, 0, .46, 'bounce'), knot(sA + 32, -m * .44, 0, .14, 'bounce'), knot(sA + 42, -m * .64, 0, .03)];
      R({ id:'R2a', K:KA, Z:Z - 1.2, zs:0, r:.22, shp:'A', spin:.05, from:par }); R({ id:'R2b', K:KB, Z:Z + 1.2, zs:0, r:.22, shp:'B', spin:.05, from:par }); }
    // R3: settles in the centre; both outer lanes open
    { const Z = B + 490, land = Z - 130; R({ id:'R3', K:settle(fallTo(m, land), 0), Z, zs:7, r:.3, shp:2, spin:.08 }); }
    // R4: rolls across at a walking pace: in the valley lane (-0.5 m) as you reach it, through the rail 47 segments later
    { const Z = B + 545, land = Z - 100, K = fallTo(m, land); K.push(knot(land + 10, m * .7, 0, .2, 'bounce'), knot(land + 50, m * .17, 0, .025), knot(land + 95, -m * .43, 0, .025), knot(B + 592, -m * 1.12, 0, .02, 'rail'), knot(B + 600, -m * 1.5, .1, .35), knot(B + 616, -m * 2.4, -.9, .3, 'gone'));
      R({ id:'R4', K, Z, zs:6, r:.25, shp:3, roll:true, spin:.08 }); }
    // the slide's extras: smaller rocks that come down the face and stop in the scree at its foot (beyond the barrier: never hazards)
    for(let k = 0; k < 7; k++){ const Z = B + 262 + k * 44 + Math.round(H1(B + k * 3.7) * 14), land = Z - 95 - Math.round(H1(B + k) * 30), K = fallTo(m, land);
      K[3].x = m * 1.12; K.push(knot(land + 12, m * 1.26, 0, .12, 'bounce'), knot(land + 20, m * 1.32, 0, .03));
      R({ id:'x' + k, K, Z, zs:5, r:.1 + H1(B * .3 + k) * .06, shp:4 + k % 2, spin:.12, hz:false }); }
    // scree: chips left round each settled hazard (decor, no collision)
    for(const r of p.rocks){ if(!r.hz || r.roll || r.split) continue; const xr = r.K[r.K.length - 1].x;
      for(let j = 0; j < 6; j++){ const a = H1(r.Z * 1.3 + j * 7.1) * 6.283, d = r.r * (1.2 + H1(r.Z + j * 3.3) * 1.4); p.scree.push({ z:r.Z + Math.sin(a) * d * 6, x:xr + Math.cos(a) * d + m * .08, s:r.K[3].s + 2, r:.025 + H1(r.Z * .7 + j) * .03, rk:r }); } }
    // grit: single pixels of crushed stone along the road from the impact to where the rock settled (pale and dark), and the scar
    p.grit = []; for(const r of p.rocks){ if(!r.hz || r.roll) continue; const K = r.K, ki = r.from ? 0 : 3, xa = K[ki].x, xb = K[K.length - 1].x, zb = r.Z;
      for(let j = 0; j < 26; j++){ const t = H1(zb * 3.1 + j * 1.7), xx = xa + (xb - xa) * t + (H1(zb + j * 5.3) - .5) * .22, zz = zb + (H1(zb * .7 + j * 2.9) - .5) * 4; p.grit.push({ z:zz, x:xx, s:K[ki].s + 18 * t, c:j % 3 ? 19 : 18 }); }
      for(let j = 0; j < 8; j++) p.grit.push({ z:zb + (H1(zb + j) - .5) * 2, x:xa + (H1(zb * 2 + j) - .5) * .12, s:K[ki].s, c:19 }); }
    // telegraph: pebbles that skip across the road ahead, each over 55 segments of your ride
    for(let k = 0; k < 11; k++){ const z = B - 5 + k * 16 + Math.round(H1(B + k * 9.1) * 8); p.peb.push({ z, s0:z - 48 + Math.round(H1(B * .1 + k) * 8), s1:z - 10, x0:m * 1.02, x1:-m * (1.05 + H1(B + k * 1.7) * .25), r:.07 + H1(B * .7 + k) * .04, last:0 }); }
    return p; }
  // the cliff's height along the event (0..1): the build-up cut, the open shrine, the slide's cut
  function cliffH(p, j){ const r = j - p.B; return Math.max(sm((r + 60) / 30) * (1 - sm((r - 150) / 24)), sm((r - 232) / 22) * (1 - sm((r - 552) / 22))); }
  const cvK = (p, j) => { const r = j - p.B; return sm((r + 80) / 45) * (1 - sm((r - 600) / 40)); };

  // ---------------------------------------------------------------- placement
  function decide(i, s, L){ if(!L || L.key !== 'pass' || LANDS[s.land].key !== 'pass') return; const ls = typeof landStart === 'number' ? landStart : 0; if(i - ls !== 40) return;
    const z = zoneOfSeg(i), border = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9;
    // after the pass's landmark jump (setpiece/jump.js: its window ends ~330 segments into the road) and before the border's blend
    for(let B = Math.ceil((ls + 390) / 400) * 400; B + 600 <= border - 50; B += 400){
      if(window.inForkWindow && inForkWindow(B - 120, B + END)) continue;
      let gate = false; for(const g of gates) if(g >= B + 250 && g <= B + 640) gate = true; if(gate) continue;
      if(plans.some(p => Math.abs(p.B - B) < 800)) return;
      if(DIR && !DIR.request(ID, { tier:'hero', seg:B + 300 })) return;
      const qs = +(new URLSearchParams(location.search).get('rsside') || 0), m = qs ? Math.sign(qs) : H1(B * .37 + 1.3) < .5 ? -1 : 1; plans.push(build(B, m)); if(plans.length > 4) plans.shift(); return; } }   // (?rsside=-1|1 forces the cliff side: tests)
  function lay(p, i, s){ const B = p.B;
    // the gentle bend toward the cliff, on every segment already generated (env/pass.js reads the curve when it places)
    for(let j = Math.max(i, p.cvTo + 1); j < segs.length && j <= B + 640; j++){ const sg = segs[j]; if(j < B - 80){ p.cvTo = j; continue; } sg.curve = sg.curve + (p.m * CV - sg.curve) * cvK(p, j); p.cvTo = j; }
    if(i < B - 90 || i > B + END) return;
    s.skRes = 1; s.rsP = p; if(i >= B - 50 && (s.spjP || s.tunnel || s.gore)) p.off = true;
    const m = p.m, h = cliffH(p, i), h2 = cliffH(p, i + 1);
    if(!(h > .01 || h2 > .01) || !s.passH){ nearProps(s); return; }
    const eh = s.passH[m] || 0, H0 = Math.max(h, eh), H2 = Math.max(h2, eh * .98);
    // our cut replaces whatever env/pass.js put on the cliff side: its wall, and the roadside kit where a cliff now stands
    nearProps(s);
    s.sprites = s.sprites.filter(sp => !(sp.env === 'pass' && Math.sign(sp.x) === m && (sp.type === 'wall' || sp.type === 'tree' || sp.type === 'ff' || sp.type === 'toro' || sp.type === 'jizo' || sp.type === 'mirror' || sp.type === 'chev' || sp.type === 'sign' || (sp.type === 'rail' && H0 > .35))));
    s.passH[m] = H0; s.sprites.push({ env:'pass', type:'wall', x:m * CLIFFX, s, h:H0, h2:H2, k:i });
    if(H0 > .6 && i % 4 === 0){ const dx = .08 + H1(i * 1.7) * .3; s.sprites.push({ env:'pass', type:'tree', x:m * (CLIFFX + LEAN + dx), k:i * 4, lift:WALLH * H0 + .1 * H0 * (1 + dx * 2) - .05, sz:.7 + H1(i * 2.3) * .4 }); } }

  // The pass's own props drawn near the camera turn into giant sprite pixels inside the event's frames (seen at the exit shrine): the torii's
  // black lacquer foot fills a screen edge, the sakura's crown and petals become pink squares, a jizo candle a pale square, and the road's own
  // 落石注意 sign (its dark post lost against the cedars) floats with a plate of huge text. Inside this event only: the road's signs are
  // dropped (the bent sign is this event's warning) and the torii, sakura and jizo are drawn here with a fade as they near the camera
  // (env/pass.js unchanged; the same happens at every shrine outside the event, noted for the pass's owner).
  const NEARF = { torii:[210, 320], sakura:[70, 120], jizo:[80, 140], toro:[150, 230] };
  function nearProps(s){ if(s.rsNearDone) return; s.rsNearDone = 1; const keep = [];
    for(const sp of s.sprites){ if(sp.env === 'pass' && sp.type === 'sign') continue; if(sp.env === 'pass' && NEARF[sp.type]){ (s.rsNear || (s.rsNear = [])).push(sp); continue; } keep.push(sp); }
    s.sprites = keep; }
  const SKF = { low:'#000' };
  function drawNear(s, sx0, sy0, uw, fog, now){ const L = s.rsNear; if(!L || !ENV.pass) return; SKF.low = FOG_COL;
    for(const sp of L){ const f = NEARF[sp.type], a = 1 - sm((uw - f[0]) / (f[1] - f[0])); if(a <= .02) continue; const e0 = EDGE; EDGE = e0 * a; cx.globalAlpha = 1;
      try{ ENV.pass.draw(sp, sx0 + sp.x * uw, sy0, uw, fog, now, SKF); } finally { EDGE = e0; cx.globalAlpha = 1; } } }

  const EV = { x:0, h:0, k:-1, u:0 };
  function path(K, s){ const n = K.length; if(s <= K[0].s){ EV.x = K[0].x; EV.h = K[0].h; EV.k = -1; EV.u = 0; return EV; }
    if(s >= K[n - 1].s){ EV.x = K[n - 1].x; EV.h = K[n - 1].h; EV.k = n - 1; EV.u = 1; return EV; }
    let k = 0; while(s >= K[k + 1].s) k++; const a = K[k], b = K[k + 1], u = (s - a.s) / (b.s - a.s);
    EV.x = a.x + (b.x - a.x) * u; EV.h = a.h + (b.h - a.h) * u + 4 * b.hop * u * (1 - u); EV.k = k; EV.u = u; return EV; }
  function pose(p, r, s){ const K = r.K, n = K.length, imp = r.from ? 0 : 3; path(K, s); r.x = EV.x; r.h = EV.h; r.kk = EV.k;
    const sImp = K[imp].s, last = K[n - 1].s; r.z = r.Z + (s < sImp ? r.zs * clamp((sImp - s) / (sImp - K[0].s), 0, 1) : 0);
    r.vis = s >= K[0].s && !(r.split && s >= sImp) && !(r.from && s < K[0].s);
    if(r.from) r.vis = s >= K[0].s;
    // tumbling in the air, rolling on the road; it comes to rest in its base pose (angles relative to the rest)
    r.az = (K[n - 1].x - r.x) / r.r * .9; r.ax = (last - Math.min(s, last)) * r.spin * (s < sImp ? 1.6 : .7); r.ay = (last - Math.min(s, last)) * r.spin * .35;
    r.al = 1; if(r.roll && s > K[n - 2].s) r.al = clamp(1 - (s - K[n - 2].s) / (last - K[n - 2].s), 0, 1); if(r.roll && s >= last) r.vis = false;
    r.hc = r.h + .7 * r.r; return r; }
  // where a hazard will be when you reach it (tests and the reactive bot read this; a rider reads the same from the rolling path)
  const atContact = r => { path(r.K, r.Z); return EV.x; };

  // ---------------------------------------------------------------- particles (world space: z segments, x and h half-road widths), pooled
  const DP = []; for(let k = 0; k < 120; k++) DP.push({ on:false, z:0, x:0, h:0, r:0, gr:0, vx:0, vh:0, vz:0, t:0, life:0, v:0 });
  const CP = []; for(let k = 0; k < 160; k++) CP.push({ on:false, z:0, x:0, h:0, vx:0, vh:0, vz:0, t:0, life:0, c:0 });
  let rs = 11; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  function dust(z, x, h, n, r, up, spread, dr, lf){ for(let k = 0; k < n; k++){ let q = null; for(const d of DP) if(!d.on){ q = d; break; } if(!q) return;
      q.on = true; q.z = z + (rnd() - .5) * 3; q.x = x + (rnd() - .5) * (spread || .3); q.h = h; q.r = r * (.6 + rnd() * .6); q.gr = r * (.5 + rnd() * .6); q.vx = (dr || 0) + (rnd() - .5) * .4; q.vh = up * (.3 + rnd() * .7); q.vz = -rnd() * 2; q.t = 0; q.life = (lf || 1) * (1.2 + rnd() * 1.1); q.v = k % 3; } }
  function chips(z, x, h, n, sp){ for(let k = 0; k < n; k++){ let q = null; for(const d of CP) if(!d.on){ q = d; break; } if(!q) return;
      q.on = true; q.z = z + (rnd() - .5); q.x = x; q.h = h + .02; const a = rnd() * 6.283, v = sp * (.4 + rnd() * .8); q.vx = Math.cos(a) * v; q.vz = Math.sin(a) * v * 5; q.vh = sp * (.6 + rnd() * 1.4); q.t = 0; q.life = .7 + rnd() * .7; q.c = k % 3; } }
  function stepP(dt){ for(const q of DP){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.vh *= 1 - 1.5 * dt; q.r += q.gr * dt; }
    for(const q of CP){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.vh -= 4.2 * dt; if(q.h < 0){ q.h = 0; q.vh *= -.3; q.vx *= .5; q.vz *= .5; } } }

  // ---------------------------------------------------------------- sound (the core's synth helpers, as the other set pieces use them)
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function rumble(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.5, 48, v, t0); M.noise(1.2, 105, v * .5, t0 + .1); }
  function tick(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.035, 2600 + rnd() * 1200, .035 * v, t0); M.tone(700 + rnd() * 700, .05, { type:'square', v:.008 * v, at:t0 }); }
  function crack(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.07, 3400, .12 * v, t0); M.noise(.3, 900, .07 * v, t0 + .02); M.tone(130, .3, { type:'square', v:.02 * v, at:t0 }); }
  function thud(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.1, 70, .24 * v, t0); M.tone(42, .7, { type:'sine', v:.14 * v, at:t0 }); M.noise(.35, 700, .07 * v, t0 + .01); M.noise(.6, 2200, .03 * v, t0 + .03); }
  function railHit(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.25, 1700, .1, t0); M.tone(310, .4, { type:'square', v:.03, at:t0 }); M.tone(205, .5, { type:'square', v:.025, at:t0 + .03 }); }
  function whoosh(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.1, 420, .1, t0); M.noise(.7, 1600, .05, t0 + .05); }

  // ---------------------------------------------------------------- the module
  const active = ps => { for(const p of plans) if(!p.off && !p.done && ps > p.B - 420 && ps < p.B + END + 20 && segs[p.B] && segs[p.B].rsP === p) return p; return null; };
  let cur = null;
  function showCard(p){ if(!DIR || !DIR.cine) return; let card = CARD;
    if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has(ID)){ try{ if(MECH.cutin.show(ID) !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
    if(card) DIR.cine({ letterbox:false, dur:2.2, card }); }
  function beat(p, r, ev, k){ const K = r.K, near = clamp(1.2 - (r.z - pSeg()) / 260, .2, 1), cutHit = n => { if(reduce) return; if(p.cut) p.cut.hit(n * near); };
    if(ev === 'crest'){ if(r.hz) crack(.6 * near); dust(r.z, r.x, r.h, reduce ? 1 : 3, .22, .4, .3); }
    else if(ev === 'face'){ dust(r.z, r.x, r.h, reduce ? 2 : 4, .3, .3, .2); chips(r.z, r.x, r.h, reduce ? 3 : 8, .7); if(r.hz) crack(.4 * near); }
    else if(ev === 'impact'){ const big = r.r > .2; dust(r.z, r.x, 0, reduce ? 3 : big ? 8 : 4, big ? .3 : .2, .9, .5, p.m * .7, .55); chips(r.z, r.x, 0, reduce ? 6 : big ? 22 : 8, big ? 1.4 : .8);
      if(big){ thud(near); cutHit(big ? 4 + r.r * 10 : 1); } else tick(1.5 * near);
      if(r.split){ crack(near); dust(r.z, r.x, .2, reduce ? 2 : 5, .25, 1.1, .4, p.m * .7, .5); cutHit(3); }
      if(r.id === 'R0' && DIR && DIR.cine && state === 'play'){ DIR.cine({ slowmo:{ scale:reduce ? .75 : .55, hold:.55 }, shake:reduce ? 0 : 7, dur:1.3 }); if(DIR.done) DIR.done(ID); } }
    else if(ev === 'bounce'){ if(r.r > .15){ thud(.45 * near); dust(r.z, r.x, 0, reduce ? 1 : 2, .18, .8, .3, p.m * .6, .45); chips(r.z, r.x, 0, reduce ? 2 : 6, .6); cutHit(1.5); } else tick(near); }
    else if(ev === 'rail'){ railHit(); chips(r.z, r.x, .15, reduce ? 4 : 14, 1.2); dust(r.z, r.x, .1, reduce ? 1 : 3, .3, .5, .3); const j0 = Math.floor(r.z);
      for(let j = j0 - 2; j <= j0 + 1; j++){ const sg = segs[j]; if(sg) sg.sprites = sg.sprites.filter(sp => !(sp.env === 'pass' && sp.type === 'rail' && Math.sign(sp.x) === -p.m)); } p.broke.push(j0); } }
  MECH.sp_rock = {
    plans, CARD, atContact, cliffH, _S:S, _preview:() => preview(),
    // tests: the hazards ahead { z, x (where it will be as you reach it), r, landed }
    hazards(ahead){ const ps = pSeg(), out = []; for(const p of plans){ if(p.off || p.done) continue; for(const r of p.rocks){ if(!r.hz || r.split) continue; if(r.Z < ps - 2 || r.Z > ps + (ahead || 140)) continue; out.push({ id:r.id, z:r.Z, x:atContact(r), r:r.r, landed:ps >= r.K[r.from ? 0 : 3].s, now:r.x }); } } return out; },
    hits(){ let n = 0; for(const p of plans) n += p.hits; return n; },
    dbg(B, m){ const p = build(B, m || 1); plans.push(p); return p; },
    warm(){ S.shp = [0, 1, 2, 3, 4, 5].map(k => shape(k * 3 + 2, k < 4 ? 15 + (k % 3) : 10, .5 + (k % 2) * .1)); const hv = halves(7); S.shp.P = shape(41, 16, .55); S.shp.A = hv[0]; S.shp.B = hv[1];
      for(const N of DS) for(let v = 0; v < 3; v++) for(let f = 0; f < 3; f++){ S['d' + N + '_' + v + '_' + f] = dustSpr(N, v, f, false); S['w' + N + '_' + v + '_' + f] = dustSpr(N, v, f, true); }
      if(!RC){ RC = can(RW, RW); RG = RC.getContext('2d', { willReadFrequently:true }); RI = RG.createImageData(RW, RW); }
      // two fracture lines per rock: a plane (normal, offset) and the span along it where the crack runs
      for(const key of [0, 1, 2, 3, 4, 5, 'P', 'A', 'B']){ const sh = S.shp[key]; let sd = (typeof key === 'number' ? key * 13 : key.charCodeAt(0)) + 5; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647; sh.cr = [];
        for(let c = 0; c < 2; c++){ let a = [R() - .5, R() - .5, R() - .5], l = Math.hypot(a[0], a[1], a[2]); a = a.map(v => v / l); let b = [R() - .5, R() - .5, R() - .5]; const dt = b[0] * a[0] + b[1] * a[1] + b[2] * a[2]; b = b.map((v, i) => v - dt * a[i]); l = Math.hypot(b[0], b[1], b[2]); b = b.map(v => v / l);
          const m0 = -.6 + R() * .5; sh.cr.push([a[0], a[1], a[2], (R() - .5) * .5, b[0], b[1], b[2], m0, m0 + .5 + R() * .5]); }
        // the sub-planes (kodawari audit #10): NSD seed points spread through the rock; every pixel belongs to the nearest one (a Voronoi in
        // rock space, so the chips turn with the rock), and each chip is its facet's tone or a step either side, as env/pass.js's rocks
        sh.sd = new Float32Array(NSD * 3); sh.so = new Int8Array(NSD);
        for(let c = 0; c < NSD; c++){ let x, y, z; do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while(x * x + y * y + z * z > 1); const l = .55 + .45 * Math.cbrt(R());
          const q = Math.hypot(x, y, z) || 1; sh.sd[c * 3] = x / q * l * 1.1; sh.sd[c * 3 + 1] = y / q * l * .8 - .1; sh.sd[c * 3 + 2] = z / q * l * 1.1; const r = R(); sh.so[c] = r < .26 ? -1 : r > .8 ? 1 : 0; } }
      S.signL = signSprite(-1); S.signR = signSprite(1);
      try{ cx.save(); for(const k in S) if(S[k] && S[k].width) cx.drawImage(S[k], 0, 0, 1, 1); cx.restore(); cx.clearRect(0, 0, PX * 2, PX * 2); }catch(e){} },
    reset(){ for(const p of plans){ if(p.cut){ p.cut.end(); p.cut = null; } p.on = false; p.lastPs = null; p.hits = 0; p.burstT = -1; for(const r of p.rocks) r.hit = false; } for(const q of DP) q.on = false; for(const q of CP) q.on = false; cur = null; },
    place(i, s, L){ if(i === 0){ for(const p of plans) if(p.cut) p.cut.end(); plans.length = 0; }
      for(const p of plans) if(!p.off) lay(p, i, s);
      decide(i, s, L); },
    hitCar(){ const p = cur; if(!p) return false; const d = pSeg() - p.B; return d > -45 && d < END; },
    update(dt){ Tg += dt; stepP(dt); const ps = pSeg(), p = active(ps); cur = p; if(!p) return;
      const a = p.lastPs === null ? ps : p.lastPs, B = p.B, X = v => a < v && ps >= v; p.lastPs = ps; const play = state === 'play';
      if(!p.hzSwept && ps > B - 400){ p.hzSwept = true; for(let j = B - 70; j <= B + END; j++) if(segs[j]) segs[j].hz = null; }
      // the presentation: letterbox, duck and the guard from the first rumble to past the torii; the card
      if(play && !p.on && ps >= B - 60 && ps < B + 560){ p.on = true; if(DIR && DIR.cine) p.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, duck:.45, shake:reduce ? 0 : 2, guard:{ from:B - 45, to:B + END }, dur:0 }); rumble(.05); }
      if(play && X(B - 40)) showCard(p);
      // the rumble: low noise under everything, building with the slide
      const lv = ps < B - 60 ? 0 : ps < B + 175 ? .035 + .05 * sm((ps - B + 60) / 235) : ps < B + DUST1 ? .12 : .12 * (1 - sm((ps - B - DUST1) / 50));
      p.rumT -= dt; if(lv > .005 && p.rumT <= 0){ p.rumT = .85; rumble(lv); }
      // the rocks: pose and beats from the rider's segment (a jump in position fires each beat once)
      for(const r of p.rocks){ pose(p, r, ps); if(a < ps) for(let k = 0; k < r.K.length; k++){ const kn = r.K[k]; if(kn.ev && a < kn.s && ps >= kn.s && (r.vis || kn.ev === 'impact' || kn.ev === 'rail')){ pose(p, r, kn.s); beat(p, r, kn.ev, k); pose(p, r, ps); } } }
      for(const q of p.peb){ const u = (ps - q.s0) / (q.s1 - q.s0), la = (a - q.s0) / (q.s1 - q.s0); for(const b of [1 / 3, 2 / 3, 1]) if(la < b && u >= b && q.z - ps < 90) tick(.8); }
      // the hit: a hazard on the road, where you are, as you pass it
      if(play && cool <= 0 && AIR.h < 6){ const bw = bikeHalf() - HIT_GRACE;
        for(const r of p.rocks){ if(!r.hz || r.hit || !r.vis || r.h > .35) continue; if(Math.abs(ps - r.z) > Math.max(1.2, r.r * 6)) continue; if(Math.abs(playerX - r.x) > r.r * .85 + bw) continue;
          r.hit = true; p.hits++; crash({ x:r.x, z:r.z * SEG }); } }
      // the dust wall: in, then the burst out under the torii
      if(play && X(B + DUST1) && p.burstT < 0){ p.burstT = Tg; whoosh(); if(p.cut && !reduce) p.cut.hit(3); }
      if(ps > B + END - 10 && p.cut){ p.cut.end(); p.cut = null; }
      if(ps > B + END){ p.done = true; } },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = cur; if(!p) return; const i = s.index, B = p.B, ps = pSeg();
      if(i < B - 90 || i > B + END) return;
      if(fog < .7) trickle(p, s, sx0, sy0, uw, fog, now, ps);
      if(s.rsNear) drawNear(s, sx0, sy0, uw, fog, now);
      if(i === B - 25 && S.signL) drawSign(p, s, sx0, sy0, uw, fog);
      for(const j of p.broke) if(i === j - 3 || i === j + 2) railStub(p, s, sx0, sy0, uw, fog, i === j - 3 ? 1 : -1);
      for(const q of p.scree) if(Math.floor(q.z) === i && ps >= q.s) scree(s, q, fog);
      if(p.grit && fog < .3) for(const q of p.grit) if(Math.floor(q.z) === i && ps >= q.s) gritPx(s, q, fog);
      for(const q of p.peb){ if(Math.floor(q.z) !== i) continue; const u = (ps - q.s0) / (q.s1 - q.s0); if(u < 0 || u > 1) continue; const hh = .2 * (1 - u * .55) * Math.abs(Math.sin(u * Math.PI * 3)), xx = q.x0 + (q.x1 - q.x0) * u;
        { const P = proj(s, q.z - i); if(P.w > 0){ cx.fillStyle = 'rgba(2,3,6,.6)'; pxRect(P.x + xx * P.w - q.r * P.w, P.y - PX, Math.max(PX, q.r * 2 * P.w * (1 - hh * 2)), PX); } }
        pebble(s, q.z - i, xx, hh, q.r, fog); }
      if(i >= B + DUST0 && i <= B + DUST1 + 2) wall(p, s, sx0, sy0, uw, fog, now, ps);
      for(const q of DP) if(q.on && Math.floor(q.z) === i) puffW(s, q, fog, now);
      for(const r of p.rocks) if(r.vis && Math.floor(r.z) === i) drawRock(r, s, fog);
      for(const q of CP) if(q.on && Math.floor(q.z) === i) chip(s, q, fog); },
    overlay(now){ const p = cur; if(!p) return; inside(p, now); } };

  // ---------------------------------------------------------------- drawing: projection of a world point inside a segment
  const PJ = { x:0, y:0, w:0, cz:0 };
  function proj(s, f){ const a = s.p1, b = s.p2; PJ.x = a.screen.x + (b.screen.x - a.screen.x) * f; PJ.y = a.screen.y + (b.screen.y - a.screen.y) * f; PJ.w = a.screen.w + (b.screen.w - a.screen.w) * f; PJ.cz = a.camera.z + (b.camera.z - a.camera.z) * f; return PJ; }
  // the rock: rotate its hull, project every vertex at its own depth (a true perspective solid), cull back faces, shade each facet
  const VX = new Float64Array(64), VY = new Float64Array(64);
  function drawRock(r, s, fog){ const P = proj(s, r.z - s.index); if(!(P.w > 0) || P.cz < r.r * ROADW + 380) return; const Rpx = r.r * P.w; if(Rpx < PX * .5) return;
    const sh = S.shp[r.shp]; if(!sh) return; const al = r.al * (1 - fog * .2); if(al <= .02) return; cx.globalAlpha = al;
    const X0 = P.x + r.x * P.w, Y0 = P.y - r.hc * P.w;
    // far: a stone of a few pixels is drawn as those pixels (a moonlit top row over a mid body), never a smear
    if(Rpx < PX * 2.2){ const w2 = Math.max(PX, snp(Rpx * 2)), h2 = Math.max(PX, snp(Rpx * 1.6)); cx.fillStyle = fc(COOL[2], fog * .7); pxRect(X0 - w2 / 2, Y0 - h2 / 2, w2, h2); cx.fillStyle = fc(COOL[4], fog * .7); pxRect(X0 - w2 / 2, Y0 - h2 / 2, w2, PX); cx.globalAlpha = 1; return; }
    // its shadow on the road (the moon is ahead: the shadow falls toward you), only near the ground
    if(r.h < r.r * 2 && Rpx > PX * 3){ const gy = P.y - PX * .5, sw = Rpx * 1.1 * (1 - r.h / (r.r * 2.4)), shh = Math.max(PX, Rpx * .3); poly(X0 - sw, gy, X0 + sw, gy, X0 + sw * .75, gy + shh, X0 - sw * .75, gy + shh, 'rgba(2,4,8,.5)'); }
    const ih = clamp((48 - P.cz / SEG) / 30, 0, 1) * clamp(1.6 - Math.abs(r.x - playerX) * .7, 0, 1);
    if(!rasterRock(sh, X0, Y0, P.w, P.cz, r.r, r.ax, r.ay, r.az, ih, fog, Rpx, al)) hullAt(sh, X0, Y0, P.w, P.cz, r.r, r.ax, r.ay, r.az, ih, fog, Rpx);
    cx.globalAlpha = 1; r.sx = X0; r.sy = Y0; r.R = Rpx; }
  // a hull at screen (X0, Y0): pw px per half-road width, cz its depth (world units), rr its radius; ih the headlight on it (0..1)
  // Shading (studied: the Jalalabad road boulder and the Lauzet block: big flat planes, one lit, one mid, one dark; pass.js's rule: the moon is
  // ahead, so silhouettes are dark with moonlit tops): a key from the face's upness, its turn toward the moon's side and toward you, cut into
  // five hard tones; faces turned to you near the bike take the headlight's warm ramp instead; a split's break face is pale fresh stone.
  function hullAt(sh, X0, Y0, pw, cz, rr, ax, ay, az, ih, fog, Rpx){
    const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
    // M = Rz(az) . Rx(ax) . Ry(ay), a proper rotation
    const r00 = cc * cb - sc * sa * sb, r01 = -sc * ca, r02 = cc * sb + sc * sa * cb;
    const r10 = sc * cb + cc * sa * sb, r11 = cc * ca, r12 = sc * sb - cc * sa * cb;
    const r20 = -ca * sb, r21 = sa, r22 = ca * cb;
    const V = sh.V, n = sh.nv, PY0 = H / 2 - PITCH, ROW = ROADW;
    for(let v = 0; v < n; v++){ const x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2], wx = (r00 * x + r01 * y + r02 * z) * rr, wy = (r10 * x + r11 * y + r12 * z) * rr, wz = (r20 * x + r21 * y + r22 * z) * rr;
      const f = cz / Math.max(60, cz + wz * ROW); VX[v] = W / 2 + (X0 + wx * pw - W / 2) * f; VY[v] = PY0 + (Y0 - wy * pw - PY0) * f; }
    const sdm = MOON.x > X0 ? 1 : -1, F = sh.F, fr = sh.fr, nf = F.length;
    // the outline: the visible faces' union, grown by a canvas pixel and dropped half a pixel (dark below and at the sides);
    // then the moon rim: the same union lifted a pixel toward the moon, in the pale rim tone, so a backlit rock keeps a bright top edge at
    // any distance (pass.js: silhouettes are dark with a thin moon rim on the side facing the moon)
    if(Rpx > PX * 2){ let mx = 0, my = 0; for(let v = 0; v < n; v++){ mx += VX[v]; my += VY[v]; } mx /= n; my /= n; const g = 1 + PX * 1.1 / Rpx, rc = fc(COOL[4], fog * .6), oc = fc(OUT, fog * .5);
      for(let pass = 0; pass < 2; pass++){ const dy = pass ? PX * .5 : -PX * 1.1, dx = pass ? 0 : sdm * PX * .4, col = pass ? oc : rc, gg = pass ? g : 1;
        for(let k = 0; k < nf; k++){ const f = F[k], a = f[0], b = f[1], c = f[2]; if((VX[b] - VX[a]) * (VY[c] - VY[a]) - (VY[b] - VY[a]) * (VX[c] - VX[a]) <= 0) continue;
          poly(mx + (VX[a] - mx) * gg + dx, my + (VY[a] - my) * gg + dy, mx + (VX[b] - mx) * gg + dx, my + (VY[b] - my) * gg + dy, mx + (VX[c] - mx) * gg + dx, my + (VY[c] - my) * gg + dy, col); } } }
    for(let k = 0; k < nf; k++){ const f = F[k], a = f[0], b = f[1], c = f[2]; if((VX[b] - VX[a]) * (VY[c] - VY[a]) - (VY[b] - VY[a]) * (VX[c] - VX[a]) <= 0) continue;
      const nx = r00 * f[3] + r01 * f[4] + r02 * f[5], ny = r10 * f[3] + r11 * f[4] + r12 * f[5], nz = r20 * f[3] + r21 * f[4] + r22 * f[5];
      const key = .58 * ny + .42 * nx * sdm - .15 * nz, idx = key > .7 ? 4 : key > .4 ? 3 : key > .12 ? 2 : key > -.15 ? 1 : 0;
      let col; if(fr[k]) col = FRESH[Math.max(2, idx)]; else if(ih > .25 && -nz > .45 && idx < 4) col = WARM[clamp(idx - (ih > .6 ? 0 : 1), 0, 3)]; else col = COOL[idx];
      poly(VX[a], VY[a], VX[b], VY[b], VX[c], VY[c], fc(col, fog)); } }
  // ---------------------------------------------------------------- the rock as pixel art
  // The hull is rasterised by hand at the canvas's own resolution into a scratch buffer (made once in warm). Every pixel knows its facet
  // and its point on the rock (rock space, so the texture turns with the rock). Then the pixel-art rules, after Sea of Stars' stonework (the
  // detail lives on the edges: a dark crack where two planes meet, a lit chipped lip, a pale top edge) and real rockfall photos:
  //   facet tones from the hue-shifted ramp; a dark crack along every border between planes, broken by lit chips; two fracture lines per
  //   rock that run across facets; lichen and moss in small clusters (with a few satellite pixels) on the faces that were up in the rest
  //   pose, moss low down; grit on fresh breaks; a moonlit rim along the top silhouette; a 1 px dark outline round it all.
  // (448: the whole game canvas, so a boulder beside the camera stays pixel art instead of falling back to flat facets; kodawari audit #10)
  const NSD = 18, SID = new Uint8Array(448 * 448);
  const RW = 448, FID = new Uint8Array(RW * RW), OXb = new Float32Array(RW * RW), OYb = new Float32Array(RW * RW), OZb = new Float32Array(RW * RW);
  const FB = new Uint8Array(64), FN = new Uint8Array(64), FT = new Uint8Array(64), FPI = new Uint16Array(64), FUP = new Float32Array(64), FFR = new Uint8Array(64);
  let RC = null, RG = null, RI = null, rgbK = '';
  const RGB = new Map();
  const h3 = (x, y, z) => { let h = Math.imul(Math.floor(x), 374761393) ^ Math.imul(Math.floor(y), 668265263) ^ Math.imul(Math.floor(z), 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function palRGB(fog){ if(FOG_COL !== rgbK){ rgbK = FOG_COL; RGB.clear(); } const q = Math.round(clamp(fog, 0, 1) * 16); let t = RGB.get(q);
    if(!t){ t = new Uint8Array(RPAL.length * 3); RPAL.forEach((c, i) => { const v = hx(mixc(c, FOG_COL, q / 16 * .8)); t[i * 3] = v[0]; t[i * 3 + 1] = v[1]; t[i * 3 + 2] = v[2]; }); RGB.set(q, t); } return t; }
  function rasterRock(sh, X0, Y0, pw, cz, rr, ax, ay, az, ih, fog, Rpx, al){ if(!RI) return false;
    const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
    const r00 = cc * cb - sc * sa * sb, r01 = -sc * ca, r02 = cc * sb + sc * sa * cb, r10 = sc * cb + cc * sa * sb, r11 = cc * ca, r12 = sc * sb - cc * sa * cb, r20 = -ca * sb, r21 = sa, r22 = ca * cb;
    const V = sh.V, n = sh.nv, PY0 = H / 2 - PITCH, ip = 1 / PX; let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for(let v = 0; v < n; v++){ const x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2], wx = (r00 * x + r01 * y + r02 * z) * rr, wy = (r10 * x + r11 * y + r12 * z) * rr, wz = (r20 * x + r21 * y + r22 * z) * rr;
      const f = cz / Math.max(60, cz + wz * ROADW), X = (W / 2 + (X0 + wx * pw - W / 2) * f) * ip, Y = (PY0 + (Y0 - wy * pw - PY0) * f) * ip; VX[v] = X; VY[v] = Y;
      if(X < mnx) mnx = X; if(X > mxx) mxx = X; if(Y < mny) mny = Y; if(Y > mxy) mxy = Y; }
    const cw = cx.canvas.width, chh = cx.canvas.height, x0 = Math.max(0, Math.floor(mnx) - 1), y0 = Math.max(0, Math.floor(mny) - 2), x1 = Math.min(cw, Math.ceil(mxx) + 2), y1 = Math.min(chh, Math.ceil(mxy) + 2), w = x1 - x0, h = y1 - y0;
    if(w <= 0 || h <= 0) return true;
    if(w > RW || h > RW) return false;
    for(let y = 0; y < h; y++) FID.fill(255, y * RW, y * RW + w);
    const sdm = MOON.x > X0 ? 1 : -1, F = sh.F, fr = sh.fr, SD = Rpx * ip > 7 && sh.sd ? sh.sd : null; let nv = 0;
    for(let k = 0; k < F.length && nv < 64; k++){ const f = F[k], a = f[0], b = f[1], c = f[2], ax2 = VX[a] - x0, ay2 = VY[a] - y0, bx = VX[b] - x0, by = VY[b] - y0, cx2 = VX[c] - x0, cy2 = VY[c] - y0;
      const det = (bx - ax2) * (cy2 - ay2) - (by - ay2) * (cx2 - ax2); if(det <= 0) continue;
      const nx = r00 * f[3] + r01 * f[4] + r02 * f[5], ny = r10 * f[3] + r11 * f[4] + r12 * f[5], nz = r20 * f[3] + r21 * f[4] + r22 * f[5];
      const key = .58 * ny + .42 * nx * sdm - .15 * nz, t = key > .7 ? 4 : key > .4 ? 3 : key > .12 ? 2 : key > -.15 ? 1 : 0, id = nv++;
      if(fr[k]){ FB[id] = 9; FN[id] = 5; FT[id] = Math.max(1, t); }
      else if(ih > .3 && -nz > .62 && t < 4){ FB[id] = 5; FN[id] = 4; FT[id] = Math.min(3, Math.max(0, t - (ih > .6 ? 0 : 1))); }
      else { FB[id] = 0; FN[id] = 5; FT[id] = t; }
      FPI[id] = f[6] || k + 100; FUP[id] = f[4]; FFR[id] = fr[k];
      const px0 = Math.max(0, Math.floor(Math.min(ax2, bx, cx2))), px1 = Math.min(w - 1, Math.ceil(Math.max(ax2, bx, cx2))), py0 = Math.max(0, Math.floor(Math.min(ay2, by, cy2))), py1 = Math.min(h - 1, Math.ceil(Math.max(ay2, by, cy2)));
      const id2 = 1 / det, Va = a * 3, Vb = b * 3, Vc = c * 3;
      for(let py = py0; py <= py1; py++){ const yc = py + .5; for(let px = px0; px <= px1; px++){ const xc = px + .5;
        const l2 = ((xc - ax2) * (cy2 - ay2) - (yc - ay2) * (cx2 - ax2)) * id2, l3 = ((bx - ax2) * (yc - ay2) - (by - ay2) * (xc - ax2)) * id2, l1 = 1 - l2 - l3;
        if(l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const i = py * RW + px; FID[i] = id;
        const ox = l1 * V[Va] + l2 * V[Vb] + l3 * V[Vc], oy = l1 * V[Va + 1] + l2 * V[Vb + 1] + l3 * V[Vc + 1], oz = l1 * V[Va + 2] + l2 * V[Vb + 2] + l3 * V[Vc + 2]; OXb[i] = ox; OYb[i] = oy; OZb[i] = oz;
        if(SD){ let bs = 0, bd = 1e9; for(let c = 0, o3 = 0; c < NSD; c++, o3 += 3){ const dx = ox - SD[o3], dy = oy - SD[o3 + 1], dz = oz - SD[o3 + 2], dd = dx * dx + dy * dy + dz * dz; if(dd < bd){ bd = dd; bs = c; } } SID[py * 448 + px] = bs; } } } }
    const T = palRGB(fog), d = RI.data, rp = Rpx * ip, thr = 1.05 / Math.max(1, rp), det = rp > 9, CR = sh.cr, SO = sh.so;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * RW + x, o = i * 4, k = FID[i]; let ci = -1;
      if(k === 255){ if((x > 0 && FID[i - 1] !== 255) || (x + 1 < w && FID[i + 1] !== 255) || (y > 0 && FID[i - RW] !== 255) || (y + 1 < h && FID[i + RW] !== 255)) ci = 17; }
      else { const b = FB[k], nT = FN[k], t = FT[k], ox = OXb[i], oy = OYb[i], oz = OZb[i]; ci = b + t;
        const ku = y > 0 ? FID[i - RW] : 255, kr = x + 1 < w ? FID[i + 1] : 255, kd = y + 1 < h ? FID[i + RW] : 255;
        if(ku === 255 && t >= 1){
          // the moonlit rim along the top silhouette
          ci = b + nT - 1; }
        else if((kr !== 255 && FPI[kr] !== FPI[k]) || (kd !== 255 && FPI[kd] !== FPI[k])){
          // a border between planes: a dark crack, broken by lit chips on the lighter plane
          const ot = kd !== 255 && FPI[kd] !== FPI[k] ? kd : kr, cq = Math.max(9, rp * .4), hs = h3(ox * cq, oy * cq, oz * cq);
          ci = FT[k] > FT[ot] && hs < .42 ? b + Math.min(nT - 1, t + 1) : b + Math.max(0, t - 2); }
        else { let done = false;
          if(det && CR) for(let c = 0; c < CR.length && !done; c++){
            // a fracture line across the facets: the crack, and a lit lip on its upper side here and there
            const q = CR[c], vv = ox * q[0] + oy * q[1] + oz * q[2] - q[3], along = ox * q[4] + oy * q[5] + oz * q[6];
            if(along < q[7] || along > q[8]) continue;
            if(vv >= 0 && vv < thr){ ci = b + Math.max(0, t - 2); done = true; }
            else if(vv >= -thr && vv < 0 && t + 1 < nT && h3(ox * 13, oy * 13, oz * 13) < .5){ ci = b + t + 1; done = true; } }
          if(!done && SD){
            // the chip it sits on: a lit lip where the chip above is another one (its top edge catching the moon), a dark one under it; else the
            // chip's own step of the facet's tone (one either side, never past the ramp)
            const sc = SID[y * 448 + x], su = y > 0 && FID[i - RW] === k ? SID[(y - 1) * 448 + x] : sc, sdn = y + 1 < h && FID[i + RW] === k ? SID[(y + 1) * 448 + x] : sc;
            if(su !== sc && t + 1 < nT){ ci = b + t + 1; done = true; } else if(sdn !== sc && t > 0){ ci = b + t - 1; done = true; }
            else if(SO[sc]){ ci = b + clamp(t + SO[sc], 0, nT - 1); } }
          if(!done && FFR[k]){
            // grit on a fresh break
            const gq = Math.max(15, rp * .8), g = h3(ox * gq, oy * gq, oz * gq); if(g > .975) ci = b + Math.min(nT - 1, t + 1); else if(g > .9) ci = b + Math.max(0, t - 1); }
          else if(!done && det){ const up = FUP[k];
            if(up > .15 || (up < -.05 && oy < -.25)){
              // lichen on the faces that were up, moss low down: small clusters with a few satellite pixels
              const gx = Math.floor(ox * 5.5), gy = Math.floor(oy * 5.5), gz = Math.floor(oz * 5.5), hc = h3(gx, gy, gz);
              if(hc > (up > .15 ? .8 : .86)){ const jx = (gx + .3 + h3(gx + 7, gy, gz) * .4) / 5.5, jy = (gy + .3 + h3(gx, gy + 7, gz) * .4) / 5.5, jz = (gz + .3 + h3(gx, gy, gz + 7) * .4) / 5.5;
                const dd = (ox - jx) * (ox - jx) + (oy - jy) * (oy - jy) + (oz - jz) * (oz - jz), rl = Math.min(.045 + hc * .03, 2.6 / Math.max(1, rp));
                if(dd < rl * rl || (dd < rl * rl * 3.2 && h3(ox * 31, oy * 31, oz * 31) > .78)) ci = up < .15 ? 14 : t >= 3 ? 16 : t >= 2 ? 15 : 14; } } } } }
      if(ci < 0){ d[o + 3] = 0; continue; }
      d[o] = T[ci * 3]; d[o + 1] = T[ci * 3 + 1]; d[o + 2] = T[ci * 3 + 2]; d[o + 3] = 255; }
    RG.putImageData(RI, 0, 0, 0, 0, w, h); cx.globalAlpha = al; cx.imageSmoothingEnabled = false; cx.drawImage(RC, 0, 0, w, h, x0 * PX, y0 * PX, w * PX, h * PX); return true; }
  // tests: every hull large, in three turns, on road-dark ground (a contact sheet of the rock set)
  function preview(){ cx.fillStyle = '#191b25'; cx.fillRect(0, 0, W, H); const keys = [0, 1, 2, 3, 4, 5, 'P', 'A', 'B'];
    keys.forEach((k, i) => { for(let t = 0; t < 3; t++){ const X = 70 + i * 135, Y = 130 + t * 220; if(!rasterRock(S.shp[k], X, Y, 60, 1e9, 1, t * .9, t * 1.7 + .3, t * .5, t === 2 ? .9 : 0, 0, 60, 1)) hullAt(S.shp[k], X, Y, 60, 1e9, 1, t * .9, t * 1.7 + .3, t * .5, t === 2 ? .9 : 0, 0, 60); } });
    return cx.canvas.toDataURL('image/png'); }
  // a small stone: a body and a moonlit top pixel (at this size a hull is three pixels: drawn as the pixels themselves)
  function pebble(s, f, x, h, rad, fog){ const P = proj(s, f); if(!(P.w > 0) || P.cz < 300) return; const R = Math.max(PX * .6, rad * P.w), X0 = snp(P.x + x * P.w), Y0 = snp(P.y - (h + rad * .7) * P.w);
    if(R < PX * .5) return;
    if(R >= PX * 3 && S.shp && rasterRock(S.shp[(x * 7 | 0) & 1 ? 4 : 5], P.x + x * P.w, Y0, P.w, P.cz, rad, x * 9, x * 5 + 1, x * 7, 0, fog, R, 1)){ cx.globalAlpha = 1; return; }
    const w2 = Math.max(PX, snp(R * 2)), h2 = Math.max(PX, snp(R * 1.4));
    if(w2 >= PX * 3){ cx.fillStyle = fc(OUT, fog * .5); cx.fillRect(X0 - w2 / 2 - PX, Y0 - h2 / 2, w2 + PX * 2, h2 + PX); }
    cx.fillStyle = fc(COOL[2], fog); cx.fillRect(X0 - w2 / 2, Y0 - h2 / 2, w2, h2); cx.fillStyle = fc(COOL[4], fog * .7); cx.fillRect(X0 - w2 / 2, Y0 - h2 / 2, Math.max(PX, w2 - PX), PX);
    if(h2 >= PX * 3){ cx.fillStyle = fc(COOL[0], fog); cx.fillRect(X0 - w2 / 2 + PX, Y0 + h2 / 2 - PX, w2 - PX, PX); } }
  function scree(s, q, fog){ const P = proj(s, q.z - s.index); if(!(P.w > 0) || P.cz < 300) return; const R = q.r * P.w;
    if(R < PX * 3) return pebble(s, q.z - s.index, q.x, 0, q.r, fog);
    const X0 = P.x + q.x * P.w, Y0 = P.y - q.r * .7 * P.w, a = H1(q.z * 7.1 + q.x);
    if(!rasterRock(S.shp[a < .5 ? 4 : 5], X0, Y0, P.w, P.cz, q.r, a * 6, a * 11, a * 3, 0, fog, R, 1)) pebble(s, q.z - s.index, q.x, 0, q.r, fog); cx.globalAlpha = 1; }
  function chip(s, q, fog){ const P = proj(s, q.z - s.index); if(!(P.w > 0) || P.cz < 300) return; const sz = Math.max(PX, snp(P.w * .012)); cx.fillStyle = fc(q.c ? COOL[3] : COOL[1], fog); cx.fillRect(snp(P.x + q.x * P.w), snp(P.y - q.h * P.w), sz, sz); }
  function gritPx(s, q, fog){ const P = proj(s, q.z - s.index); if(!(P.w > 0) || P.cz < 300 || P.w < 30) return; cx.fillStyle = fc(RPAL[q.c], fog); cx.fillRect(snp(P.x + q.x * P.w), snp(P.y) - PX, P.w > 260 ? PX * 2 : PX, PX); }
  // a dust cloud of about D css px: the nearest built size drawn at exactly one canvas pixel per sprite pixel (no stretched pixels); past the
  // largest size it fades (you are inside it: the screen-space layer takes over). warm: lit from inside by the lanterns and the headlight.
  function puff(x, y, D, v, ph, now, al, warm){ if(D < PX * 3 || x < -D || x > W + D || y < -D || y > H + D) return; const q = D / PX; let N = DS[0]; for(const n of DS) if(Math.abs(n - q) < Math.abs(N - q)) N = n;
    if(q > 150) al *= clamp(1 - (q - 150) / 60, 0, 1); if(al <= .02) return; const fr = ((now / (reduce ? 900 : 340) + ph * 3) | 0) % 3;
    cx.globalAlpha = al; blit(S[(warm ? 'w' : 'd') + N + '_' + (v % 3) + '_' + fr], x, y + N * PX / 2, PX); }
  function puffW(s, q, fog, now){ const P = proj(s, q.z - s.index); if(!(P.w > 0) || P.cz < 300) return; const life = q.t / q.life, al = (life < .15 ? life / .15 : 1 - (life - .15) / .85) * (1 - fog * .6);
    puff(P.x + q.x * P.w, P.y - (q.h + q.r * .4) * P.w, q.r * 2.4 * P.w, q.v, q.v * .3 + q.z * .01, now, al, q.h < .4 && P.cz < SEG * 45); cx.globalAlpha = 1; }
  // dust trickling off the crest down the face (the warning): pale streams of falling grit with the odd stone in them, and a small fan of
  // dithered dust where each lands at the cliff foot; heavier as the slide builds
  function trickle(p, s, sx0, sy0, uw, fog, now, ps){ const i = s.index, B = p.B; if(i % 3 || uw < 4 || H1(i * 1.37) < .4) return; const h = cliffH(p, i); if(h < .5) return;
    const I = ps < B - 60 ? 0 : ps < B + 175 ? .5 + .5 * sm((ps - B + 60) / 160) : ps < B + 560 ? 1 : 1 - sm((ps - B - 560) / 60); if(I <= .02) return; const m = p.m;
    const sz = Math.max(PX, snp(uw * .022)), n = reduce ? 5 : 11, al = Math.min(1, I * 1.3) * (1 - fog);
    for(let j = 0; j < n; j++){ const ph = ((now / (reduce ? 2600 : 1000)) + H1(i + j * .71)) % 1, f = 1 - ph * ph, x = sx0 + m * (CLIFFX + LEAN * h * f - .015 - j * .004) * uw, y = sy0 - WALLH * h * f * uw, big = j === 3;
      cx.globalAlpha = al * (ph < .08 ? ph * 12 : 1); cx.fillStyle = fc(big ? COOL[3] : j % 2 ? '#8c949e' : '#c2c8cc', fog * .6);
      if(big){ cx.fillRect(snp(x), snp(y), sz * 2, sz * 2); cx.fillStyle = fc(OUT, fog); cx.fillRect(snp(x), snp(y) + sz * 2, sz * 2, PX); } else cx.fillRect(snp(x), snp(y), sz, sz * (2 + (j % 3))); }
    if(uw > 12){ const fx = sx0 + m * (CLIFFX - .06) * uw, D = uw * .5 * (.8 + .4 * I); cx.globalAlpha = al; puff(fx, sy0 - D * .3, D, i, H1(i), now, al, false); }
    cx.globalAlpha = 1; }
  function drawSign(p, s, sx0, sy0, uw, fog){ const spr = p.m > 0 ? S.signL : S.signR, k = uw * .62 / 40, x = sx0 - p.m * 1.34 * uw; if(k * 40 < PX * 3) return; cx.globalAlpha = 1 - fog * .7; blit(spr, x + p.m * 8.5 * k, sy0, k); cx.globalAlpha = 1;
    const near = clamp(1.3 - fog * 3.2, 0, 1); if(near > .3) glow(x + p.m * 7 * k, sy0 - 31 * k, uw * .14, '#ffd070', .22 * near);
    // the rock that bent it, resting against its foot
    const rk = S.signRock || (S.signRock = rock({ K:[knot(0, 0, 0)], Z:0, zs:0, r:.13, shp:5, hz:false, vis:true }));
    rk.x = -p.m * 1.3 + p.m * .02; rk.z = s.index + .5; rk.h = 0; rk.hc = .7 * rk.r; rk.ax = .3; rk.ay = .8; rk.az = .2; rk.al = 1; drawRock(rk, s, fog); }
  function railStub(p, s, sx0, sy0, uw, fog, dir){ const x = sx0 - p.m * 1.12 * uw, y = sy0 - uw * .17, t = Math.max(PX, uw * .07), e = -p.m * uw * .22, d = dir * uw * .05;
    poly(x, y, x + e, y + d + uw * .05, x + e, y + d + uw * .05 + t, x, y + t, fc('#7c8498', fog)); poly(x, y, x + e, y + d + uw * .05, x + e, y + d + uw * .05 + PX, x, y + PX, fc('#d6dde8', fog)); }
  // the dust wall: dithered layers rolling off the slope across the road at DUST0..DUST1, its front advancing as you approach, combed by the
  // wind toward the valley; the low layers lit warm from inside (the shrine's lanterns, your headlight), the tops cool in the moonlight
  function wall(p, s, sx0, sy0, uw, fog, now, ps){ const i = s.index, B = p.B; if(i % 3) return; const wf = sm((ps - B - 470) / 75); if(wf <= .02) return; const m = p.m, al = (1 - fog * .4);
    // inside the cloud the screen-space layer carries it: only the exit curtain (the last few segments) is still drawn, and you burst through it
    if(ps > B + DUST0 - 4 && i < B + DUST1 - 8) return;
    for(let j = 0; j < 5; j++){ const reach = j * .64; if(reach > wf * 3.4) break; const wind = reduce ? 0 : -m * .12 * Math.sin(now / 1700 + j * 1.3 + i * .2), x = m * (1.8 - reach) + (H1(i * 1.3 + j) - .5) * .3 + wind, sz = .6 + H1(i * 3.1 + j * 7) * .4;
      const P = proj(s, H1(i + j * .3)); if(!(P.w > 0) || P.cz < 500) continue; const nearW = P.cz < SEG * 70;
      for(let t = 0; t < (j < 2 ? 2 : 1); t++){ const hh = .35 + t * sz * 1.1 + (j < 2 ? .3 : 0); puff(P.x + x * P.w, P.y - hh * P.w, sz * 3.2 * P.w * (1 - t * .15), i + j + t, H1(i * 5.1 + j + t), now, al, t === 0 && nearW); } }
    cx.globalAlpha = 1; }
  // inside the dust (it wraps round you): the near layer is gone, the screen's edges darken in stepped dither bands (dark brown, the road
  // window open), a thin brown veil over the sky, and dust motes streak past the camera out of the vanishing point, longer as they near.
  // At the torii the bands pull back to the edges and the motes fly out: clean air.
  function inside(p, now){ const ps = pSeg(), B = p.B, d0 = B + DUST0 - 2, d1 = B + DUST1; let k = 0, bt = -1;
    if(ps >= d0 && ps < d1) k = Math.min(sm((ps - d0) / 8), 1 - sm((ps - (d1 - 6)) / 6) * .5);
    if(p.burstT >= 0){ bt = (Tg - p.burstT) / (reduce ? 1.1 : .7); if(bt > 1) bt = -1; }
    if(k <= .01 && bt < 0) return;
    const e = bt >= 0 ? (1 - sm(bt)) * .7 : k, out = bt >= 0 && !reduce ? sm(bt) : 0;
    if(e > .08){ const st = PX * 4, ph = reduce ? 0 : now / 650, dk = '#140e0c', g = 1 - out;
      for(let pass = 0; pass < 2; pass++){ cx.fillStyle = ditherPat(dk, pass ? (e > .55 ? .25 : .125) : (e > .55 ? .5 : .25)); const kk = pass ? .15 : .065;
        for(let y = 0; y < H; y += st){ const wv = 1 + .35 * Math.sin(y * .021 + ph) + .2 * Math.sin(y * .057 - ph * 1.3), wl = snp(W * kk * wv * g), wr = snp(W * kk * (2 - wv) * g); if(wl > 0) cx.fillRect(0, y, wl, st); if(wr > 0) cx.fillRect(W - wr, y, wr, st); }
        for(let x = 0; x < W; x += st){ const wv = 1 + .4 * Math.sin(x * .017 - ph) + .2 * Math.sin(x * .049 + ph), ht = snp(H * (pass ? .16 : .07) * wv * g); if(ht > 0) cx.fillRect(x, 0, st, ht); } }
      if(bt < 0){ cx.fillStyle = ditherPat('#3e342e', .125); cx.fillRect(snp(W * .16), snp(H * .16), snp(W * .68), snp(H * .26)); } }
    // the motes: never across the lower centre (the road ahead and the bike)
    const vy = typeof HZ === 'number' ? HZ : H / 2, n = reduce ? 16 : 48;
    for(let j = 0; j < n; j++){ const a = H1(j * 3.7 + 1) * 6.283, cs = Math.cos(a), sn = Math.sin(a); if(sn > .35 && Math.abs(cs) < .55) continue;
      const ph = ((now / (reduce ? 1500 : 560)) + H1(j * 1.3)) % 1, sp = 1 + out * 2.5, rr = (.04 + ph * ph * .95 * sp) * W * .62, len = Math.max(1, Math.round(ph * ph * 12 * sp)), mw = ph > .55 ? PX * 2 : PX;
      const x = W / 2 + cs * rr, y = vy + sn * rr * .62; if(x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
      cx.globalAlpha = e * (ph < .12 ? ph / .12 : 1) * (bt >= 0 ? 1.4 : 1); cx.fillStyle = j % 3 ? '#b4a998' : '#e2d6c0';
      for(let t = 0; t < len; t += 2) cx.fillRect(snp(x - cs * t * PX), snp(y - sn * t * PX * .62), mw * (Math.abs(cs) > .7 ? 2 : 1), mw * (Math.abs(cs) > .7 ? 1 : 2)); }
    // thin dithered dust layers drifting at the sides
    for(let j = 0; j < (reduce ? 4 : 6); j++){ const sd = j % 2 ? 1 : -1, row = j >> 1, D = H * (.34 + H1(j * 3.3) * .1), bx = W / 2 + sd * (W * (.47 + row * .02) + out * W * .35) + (reduce ? 0 : Math.sin(now / 900 + j) * PX * 3), by = H * (.1 + row * .22) - out * H * .1;
      puff(bx, by, D, j, H1(j * 1.9), now, e, row === 2); }
    cx.globalAlpha = 1; }
})();
