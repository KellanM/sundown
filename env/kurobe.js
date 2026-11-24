/* Sundown environment: Kurobe Dam (黒). See env/README.md for the hooks; study, rules and practice log in research/sundown-craft/kurobe.md.
   A night ride up the Kurobe gorge to Japan's tallest arch dam, across its curved crest and back into the mountain.
   Each visit: the gorge road cut into sheer granite (the wall on the left, the drop to the river on the right) with snow-shed galleries and
   a rock tunnel; then the reveal, the road straightened toward the dam standing across the gorge high ahead, floodlit, two white jets
   thundering from its face; the Kanden tunnel climbs inside the mountain to the crest; the crest itself, curving with the arch: on the left
   the black reservoir mirroring the Tateyama peaks and the moon, on the right the 186 m drop down the dam's own face to the floodlit plume and
   the mist; then the lit portal in the west abutment, back into the mountain.

   References inspected at pixel zoom (Wikimedia Commons; rules taken, nothing copied):
   - "Kurobe dam with onlookers", "Kurobe Dam - panoramio", "Kurobe Dam 01..06", "Kurobe Dam (14894503080)", "Kurobe Dam - AlpineRoute6337":
     the downstream face is grey concrete in 2-3 values, streaked by long dark vertical water stains from the crest down; faint horizontal
     lift lines; thin catwalks with pale green-grey railings following the arch at two heights; a row of dark crest-gate recesses under the
     crest; white zigzag stair flights down the east end; massive concrete abutment blocks; the discharge leaves two outlets at mid-height
     as rooster tails that fan out and fall into a boiling basin, the top edge feathered, mist rising past the crest.
     -> the face as projected strips along the arch (stains, lift lines, catwalks, stairs, crest recesses), the jets as a ribbon plus foam
        puffs drawn at one canvas pixel per sprite pixel, the basin and mist.
   - "Kurobe dam with onlookers" (crest): the crest road with a solid pale parapet on the downstream side, a pale blue rail on top.
   - "Kurobe Dam Observation Deck", "...and New Observation Area": a long low deck with a curved roof edge and a glazed band on a stepped
     concrete buttress high on the east cliff; a stair zigzagging down the abutment.
   - "Lake Kurobe 1-1", "Kurobe Lake panoramio": the reservoir between steep forested walls, the snow peaks of the Tateyama range beyond.
   - "S-ji-kyo in Kurobe Gorge", "Kurobe kyokoku view from Kurobe Dam": sheer pale granite walls, forest clinging to ledges, the river a
     thin ribbon with white rapids far below.
   - "Amoji Rock Shed", "Kakinoki snow shed", "Sounkyo rock-shed": a heavy roof slab on a row of slender rectangular pillars on the valley
     side, deep shadow between them; a fascia with dentil corbels and one kanji per square plate (洞門).
   - "Inside the Kanden Tunnel", "Kanden Tunnel Trolleybus", "Kurobe Dam station platform": a horseshoe bore, warm lining, one line of
     fluorescent tubes along the crown, two trolley wires.
   Rules: granite and concrete in 3-4 hard hue-shifted values (shadow to indigo, light to cool moon), lights are points and 1-px lines at
   the top value; the floodlit plume is the brightest mass on screen (cool white, never a rainbow); warm light belongs to people (parapet
   lamps, the deck, tunnel mouths). Everything near the camera is projected geometry on the pixel grid; only the far strips and the foam
   puffs are sprites, and those are drawn at exactly one canvas pixel per sprite pixel. */
"use strict";
(() => {
  const KBLEDGE = new URLSearchParams(location.search).get('kbledge') === '1';
  const P = 'kb_', KEY = 'kurobe', KBSP = new URLSearchParams(location.search).get('kbsp'), KBX = new URLSearchParams(location.search).get('kbx') || '';   // ?kbx=dam,vb,strip: perf switches (tests)   // ?kbsp=0|1 forces the set piece's state on every visit (tests)
  const snp = v => Math.round(v / PX) * PX;
  const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const H1 = n => hash(n);
  let KI = -1; const landK = () => KI >= 0 ? KI : (KI = LANDS.findIndex(l => l.key === KEY));

  // ---------------------------------------------------------------- palette (hue-shifted ramps: shadows lean indigo, lights lean cool moon)
  const GR = ['#0e0a16', '#1a1428', '#232438', '#2e3450', '#424a68', '#6a7698', '#a2aecc'];    // granite
  const CO = ['#0f111a', '#1a1d2a', '#282c3e', '#3a4056', '#545c76', '#7c86a2', '#aab4cc'];    // concrete
  const FL = ['#6e7c9e', '#9eacca', '#cad6ec', '#eef4ff'];                                       // floodlit concrete and foam, cool white
  const FOAM = ['#26304a', '#4c5a80', '#8a9cc0', '#c4d2ea', '#f2f7ff'];
  const LIN = ['#111216', '#1b1c22', '#272830', '#363840', '#4a4b52', '#66655f'];                  // tunnel lining, warm umber
  const FOR = ['#060b0c', '#0a1213', '#101b1b', '#3a5450'];                                       // forest (the last: moonlit pine tops)
  const WARM = '#ffd890', WARMH = '#fff2cc', SOD = '#ffb458', TUBE = '#e8f6ff', CATW = '#6f968e', CREL = '#6aa2b8', DELI = '#ff9a2a';

  // ---------------------------------------------------------------- fog toward the sky's low colour (quantised, cached)
  let fogLow = '#141a2e', FC = new Map();
  const fc = (c, f) => { const q = Math.round(clamp(f, 0, 1) * 24); let a = FC.get(c); if(a === undefined){ if(FC.size > 600) FC.clear(); a = new Array(25); FC.set(c, a); } return a[q] || (a[q] = mixc(c, fogLow, q / 24 * .88)); };
  const setLow = c => { const [r, g, b] = hx(c), q = '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); if(q !== fogLow){ fogLow = q; FC.clear(); } };
  const CLX = v => v < -W ? -W : v > 2 * W ? 2 * W : v, CLY = v => v < -H ? -H : v > 2 * H ? 2 * H : v;
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col){ window.poly(CLX(x1), CLY(y1), CLX(x2), CLY(y2), CLX(x3), CLY(y3), CLX(x4), CLY(y4), col); }
  function R(x, y, w, h, col){ cx.fillStyle = col; pxRect(x, y, w, h); }
  // a stepped additive halo of nested rects (no arcs: cheap on the GPU)
  function halo(x, y, r, col, a){ if(r < PX * 1.5 || a <= .01) return; const rgb = rgb3(col); cx.globalCompositeOperation = 'lighter';
    for(let k = 0; k < 3; k++){ const f = [1, .58, .28][k], m = [.05, .09, .15][k], w = snp(r * f * 2), h = Math.max(PX, snp(r * f * 1.3)), w2 = snp(w * .6), h2 = snp(h * .55) || PX; cx.fillStyle = rgbaA(rgb, a * m);
      cx.fillRect(snp(x) - w / 2, snp(y) - h2 / 2, w, h2); cx.fillRect(snp(x) - w2 / 2, snp(y) - h / 2, w2, h); }
    cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- the camera, for things too big or too far for one segment (as env/minato.js)
  /* PJ(zs, X, h): a world point (segment-float zs, X half-road widths across, h half-road widths up) to the screen exactly as the engine's
     project() would put it, for any distance: the road's bends are accumulated past the draw distance over the segments already built. */
  const NX = 1500, XA = new Float64Array(NX + 1), YA = new Float64Array(NX + 1); let CF = -1, BI = 0, CAMX = 0, CAMY = 0, CAMZ = 0, PJX = 0, PJY = 0, PJU = 0, PJS = false;   // PJS: a straight frame (the road's bends ignored; see damArch)
  function cam(){ if(CF === DRAWN) return; CF = DRAWN; const base = segAt(position); BI = base.index; const bp = (position % SEG) / SEG, ps = segAt(position + PZ), pp = ((position + PZ) % SEG) / SEG;
    CAMY = lerp(ps.p1.world.y, ps.p2.world.y, pp) + CAMH; CAMX = playerX * ROADW; CAMZ = position;
    let x = 0, dx = -(base.curve * bp), y = base.p1.world.y;
    for(let n = 0; n < NX; n++){ const s = segs[BI + n]; XA[n] = x; YA[n] = s ? s.p1.world.y : y; if(s){ y = s.p2.world.y; x += dx; dx += s.curve; } else x += dx; }
    XA[NX] = x; YA[NX] = y; }
  const ZNEAR = .35;
  function PJ(zs, X, h){ let n = zs - BI, cz = zs * SEG - CAMZ; if(cz < ZNEAR * SEG){ cz = ZNEAR * SEG; n = (CAMZ / SEG) - BI + ZNEAR; } if(n < 0) n = 0; if(n > NX - 1) n = NX - 1;
    const i = n | 0, f = n - i, xo = PJS ? 0 : XA[i] + (XA[i + 1] - XA[i]) * f, wy = PJS ? YA[0] : YA[i] + (YA[i + 1] - YA[i]) * f, sc = DEPTH / cz;
    PJX = W / 2 + sc * (xo - CAMX + X * ROADW) * W / 2; PJY = H / 2 - PITCH - sc * (wy + h * ROADW - CAMY) * H / 2; PJU = sc * ROADW * W / 2; }
  const camSeg = () => CAMZ / SEG;
  const QP = new Float64Array(8);
  function wq(z1, x1, h1, z2, x2, h2, z3, x3, h3, z4, x4, h4, col){ PJ(z1, x1, h1); QP[0] = PJX; QP[1] = PJY; PJ(z2, x2, h2); QP[2] = PJX; QP[3] = PJY; PJ(z3, x3, h3); QP[4] = PJX; QP[5] = PJY; PJ(z4, x4, h4); QP[6] = PJX; QP[7] = PJY;
    if(Math.max(QP[0], QP[2], QP[4], QP[6]) < -PX || Math.min(QP[0], QP[2], QP[4], QP[6]) > W + PX || Math.max(QP[1], QP[3], QP[5], QP[7]) < -PX || Math.min(QP[1], QP[3], QP[5], QP[7]) > H + PX) return;
    poly(QP[0], QP[1], QP[2], QP[3], QP[4], QP[5], QP[6], QP[7], col); }

  // ---------------------------------------------------------------- the visit layout
  /* Each visit (zone z, border B0 to B1) is laid out from the gates alone, so place(), the bores, the backdrop and the set piece agree:
     the crest [H0, H1) as long (280..560 segments) and as late as fits; the Kanden bore [T1a, T1b) just before it and the west bore
     [T2a, T2b) just after; the reveal stretch [R0, T1a) before the Kanden portal, straightened so the dam stands dead ahead; before that the
     gorge road with galleries and, given room, a rock tunnel. Everything big keeps clear of a fork's split window and of the border blends.
     A visit with no room for the crest (a short fork zone) is all gorge. */
  const JLEAD = 230, JZ0 = 540, JTOT = () => (window.MECH && MECH.sp_jump && MECH.sp_jump.TOT) || 66;   // the gorge leap: segments from the visit's start (jump.js's LEAD), the first visit's extra length, the jump's length
  const LAYS = new Map(), REV = 320, LEAD = 70, LED = 200;   // LED: the downstream viewing ledge after the west bore (a game liberty Kellan asked for)
  const clear = (a, b) => !(window.inForkWindow && inForkWindow(a, b));
  let LREF = null;
  function lay(z){ if(z < 0 || typeof gates === 'undefined' || !gates.length) return null; if(segs !== LREF){ LREF = segs; LAYS.clear(); } const B0 = z > 0 ? gates[2 * z - 1] : 0, B1 = gates[2 * z + 1]; if(B0 === undefined || B1 === undefined) return null;
    const key = B0 + ':' + B1; let L = LAYS.get(key); if(L) return L;
    L = { z, B0, B1, ok:false, H0:-1, H1:-1, C:0, gal:[], bores:[], req:false, sp:false, card:false, fin:false };
    /* The crest is placed as long and late as fits, behind the reveal (REV segments, the postcard) and the gallery whose mouth opens onto it
       (LEAD). The visit's mid checkpoint gate may not stand in the gallery, the reveal or at a portal (it would block the sightline or hang
       its lamps over a portal): only well before them, on the crest itself, or after the west bore. First try leaves 200 segments of
       approach for more galleries; a first visit (zone 0, no border blend at its start) may begin 40 segments in. */
    const st = z === 0 ? 40 : 160, G = gates[2 * z];
    const gateOK = (h0, C) => G === undefined || G < h0 - 76 - REV - LEAD - 90 || (G > h0 + 12 && G < h0 + C - 40) || G > h0 + C + 150;
    /* round 14: room for the gorge leap (below) first. Room 200 leaves it 64 open segments before the lead-in gallery on a later visit; a
       first visit (st 40) needs 320, and its checkpoint (gate 0, at 520) must then stand well before the lead-in gallery: the JZ0 segments
       GATE_EXTRA adds to the first visit (warmSteps) give both, with the 320 crest it had. A later visit keeps round 13's order (the ledge
       first): the jump comes where room 200 fits, which in normal play is from the fourth road on (the second and third roads' visits are
       too short to have the reveal clear of their checkpoint and the jump before it: the checkpoint has to stand on the crest). */
    const ORD = z === 0 ? [[LED, 320], [0, 320], [LED, 200], [LED, 0], [0, 200], [0, 0]] : [[LED, 200], [LED, 0], [0, 200], [0, 0]];
    outer: for(const [led, room] of ORD) for(let C = 520; C >= (led ? 180 : 240); C -= 20) for(let h0 = B1 - 130 - 108 - led - (led ? 90 : 0) - C; h0 >= B0 + st + LEAD + REV + 76 + room; h0 -= 2){ if(clear(h0 - 76 - REV - LEAD - 10, h0 + C + 108 + (led ? led + 100 : 0)) && gateOK(h0, C) && (!led || G === undefined || G < h0 + C)){ L.ok = true; L.C = C; L.H0 = h0; L.H1 = h0 + C; L.led = led; break outer; } }
    let aEnd = B1 - 170;
    if(L.ok){ const H0 = L.H0, H1 = L.H1; L.T1a = H0 - 76; L.T1b = H0 - 4; L.T2a = H1 + 6; L.T2b = H1 + 108; L.R0 = L.T1a - REV; L.zc = L.T1b + 40;
      L.bores.push({ a:L.T1a, b:L.T1b, kind:0 }, { a:L.T2a, b:L.T2b, kind:1 }); aEnd = L.R0 - LEAD - 30; L.gal.push({ a:L.R0 - LEAD, b:L.R0, n:0, mouth:true });
      L.zo = [H0 + Math.round(L.C * .44), H0 + Math.round(L.C * .58)]; }
    /* the gorge leap (黒部峡谷越え, round 14; research/sundown-craft/jumps.md §4): setpiece/jump.js's landmark jump, at the visit's start +
       JLEAD as on every road, where it fits clear: its run-up (210), ramp, gap and far leaf, then 64 open segments before any gallery, bore or
       the reveal's lead-in; never over the checkpoint, never in a fork's split window, not where a demo level turned the road's jump off.
       jumpAt() hands it to jump.js; null: this visit has none. */
    if(!(window.DEMO && DEMO.jumpOff && DEMO.jumpOff(B0))){ const T = JTOT(), jb = B0 + JLEAD, je = jb + T + 64, lim = L.ok ? L.R0 - LEAD : B1 - 170; if(je <= lim && clear(jb - 210, jb + T + 30) && (G === undefined || G < jb - 230 || G > jb + T + 20)) L.jb = jb; }
    // the approach: a rock tunnel given room, then galleries between open stretches
    let g = Math.max(B0 + 175, L.jb ? L.jb + JTOT() + 64 : 0); const span = aEnd - g;
    if(span > 560){ const ta = g + Math.round(span * .46), tb = ta + 70 + Math.round(H1(B0 * .11) * 30); if(clear(ta - 10, tb + 10)) L.bores.push({ a:ta, b:tb, kind:2 }); }
    const gals = (from, to, seed) => { let x = from, n = 0; while(x < to - 50 && n < 40){ const gap = 34 + Math.round(H1(seed + n * 7.7) * 64), len = 46 + Math.round(H1(seed * 1.7 + n * 3.1) * 58); x += gap; const a = x, b = x + len;
        if(b < to && clear(a - 6, b + 6) && !L.bores.some(r => b > r.a - 34 && a < r.b + 34)) L.gal.push({ a, b, n:L.gal.length }); x = b; n++; } };
    gals(Math.max(g, B0 + st + 15), aEnd, B0 * .3 + 1.1);
    if(L.ok && L.led){ L.Lg0 = L.T2b + 16; L.Lg1 = L.Lg0 + L.led; L.bores.push({ a:L.Lg1, b:L.Lg1 + 80, kind:3 }); }
    if(L.ok) gals(L.led ? L.Lg1 + 110 : L.T2b + 40, B1 - 170, B0 * .5 + 2.3);
    if(LAYS.size > 40) LAYS.clear(); LAYS.set(key, L); return L; }
  // the visit of this road that segment i belongs to (or borders, in a blend), or null
  function visitOf(i){ if(i < 0 || typeof gates === 'undefined' || !gates.length) return null; const K = landK(), z = zoneOfSeg(i), top = segs.length ? zoneOfSeg(segs.length - 1) : z;
    for(const zz of [z, z + 1, z - 1]) if(zz >= 0 && zz <= top + 1 && ROUTE[zz] !== undefined && ROUTE[zz] === K) return lay(zz);
    return null; }
  function boreOf(L, i){ if(!L) return null; for(const r of L.bores) if(i >= r.a && i < r.b) return r; return null; }
  function galOf(L, i){ if(!L) return null; for(const g of L.gal) if(i >= g.a && i < g.b) return g; return null; }
  // section of segment i: 0 gorge, 1 gallery, 2 the reveal, 3 the crest
  function secOf(L, i){ if(!L) return 0; if(L.ok){ if(L.led && i >= L.Lg0 && i < L.Lg1) return 4; if(i >= L.T1b && i < L.T2a) return 3; if(i >= L.R0 && i < L.T1a) return 2; } return galOf(L, i) ? 1 : 0; }
  // the core's boreAt(): this road lays its own bores (the Kanden tunnel, the west tunnel, a rock tunnel on the approach) and no others
  function tunOver(i){ const L = lay(zoneOfSeg(i)); return !!boreOf(L, i); }
  // what the camera's far land shows: the crest's (reservoir, the dam's face) from halfway through the Kanden bore until the west bore
  // (it switches a few rings inside each bore, where the bore hides everything but its far mouth: from inside the Kanden tunnel that mouth
  // shows the crest's sky, the range and the reservoir; from inside the west tunnel, the gorge beyond. The dam is never seen through a mouth.)
  function crestView(L, cs){ return !!(L && L.ok && cs >= L.T1a + 6 && cs < L.T2a + 6); }

  // ---------------------------------------------------------------- the discharge (kanpō) and the set piece's state
  /* The kanpō discharge is the set piece (the director's 'kanpo', hero tier), and it plays where the dam is in view: as you come out of the
     lead-in gallery's mouth onto the reveal, with the arch across the gorge. The card; the floodlights strike on along the foot one by one;
     the left gate opens and its jet bursts from the face and grows into its full arc down into the pool; then the right; the mist surges up
     the gorge. From then on the jets run for the rest of the visit (the crest's view of the far half, the exit). On a visit where the moment
     is not booked the jets simply run (round 14, JQ0 below): lit, roaring, no card. Driven by the rider's distance
     from the gallery mouth (R0), never the clock. */
  const CARD = { kanji:'観光放水', name:'KANPŌ', sub:'the gates open', col:'#9ae0ff' };
  let DIRREG = false; const DIR = () => (window.MECH && MECH.director) || null;
  function regDir(){ if(DIRREG) return; const D = DIR(); if(!D) return; DIRREG = true; try{ D.register('kanpo', { tier:'hero', roads:[KEY], card:CARD }); }catch(e){} }
  function spS(L){ return camSeg() - L.R0; }
  // jet strength (0..1) for outlet j, and floodlight k of n lit?
  /* Round 14 (Kellan: "jets running"): on a visit where the moment is not booked the dam is no longer dark. Its gates run at a steady
     working discharge (JQ0: a little narrower than the kanpo's full throw), the floodlights burn, the mist rises: no card, no cinematic. */
  const JQ0 = .8;
  function jetQ(L, j){ if(!L || !L.ok) return 0; if(!L.sp) return JQ0; const s = spS(L); return sm((s - (j ? 150 : 84)) / 62); }
  function floodOn(L, k){ if(!L || !L.ok) return 0; if(!L.sp) return 1; return spS(L) >= 22 + k * 13 ? 1 : 0; }
  // the crest's lamps, the deck and the stair: lit, except on the set piece's dark approach until the lights strike on
  function lampOn(L){ return !L || !L.ok || !L.sp || spS(L) >= 22; }

  // ---------------------------------------------------------------- warm-up assets: the far strips, the foam puffs, the plate glyphs, the far-land buffer
  let PEAK = null, PEAKM = null, GORGE = null, SHORE = null, SHOREM = null, VB = null, VG = null; const PUFF = [], MIST = [], GLY = {};
  const RS = [2, 3, 4, 5, 7, 9, 12, 16, 21, 27, 35, 45, 60, 80];
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => (BAY[(x & 3) + ((y & 3) << 2)] + .5) / 16;
  function mkCanvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function paint(c, fn){ const g = c.getContext('2d'), d = g.createImageData(c.width, c.height), u = new Uint32Array(d.data.buffer), w = c.width;
    for(let y = 0; y < c.height; y++) for(let x = 0; x < w; x++){ const col = fn(x, y); if(!col) continue; const [r, gg, b] = hx(col); u[y * w + x] = (255 << 24 | b << 16 | gg << 8 | r) >>> 0; }
    g.putImageData(d, 0, 0); return c; }
  const wrapD = (a, b, w) => { let d = a - b; d -= Math.round(d / w) * w; return d; };
  /* The Tateyama range (round 13, from "Kurobe kyokoku view" and "Lake Kurobe 1-1" at zoom, Kawase Hasui's night ranges for the layering):
     a long jagged granite ridgeline, not cones: asymmetric peaks with fractal crags, the rock pale and flat with distance and lit on the
     moon's side (left); snow lingering only in the gullies and a few high patches, never as caps. In front, a cooler forested middle ridge
     with a moonlit rim, valley mist lying between the two, and the dark forest at the foot. Each layer darker and nearer than the last. */
  function buildPeak(){ const w = 512, h = 76, PK = [[30, 14, .5, .9], [88, 24, .8, .45], [150, 5, .55, .7], [205, 18, .9, .5], [262, 2, .45, .62], [318, 12, .7, .85], [372, 20, .6, .5], [430, 8, .5, .75], [482, 22, .85, .6]];
    const vn = (x, p, s) => { const k = Math.floor(x / p), f = x / p - k, a = H1(((k % (w / p)) + w / p) % (w / p) * 1.37 + s), b = H1((((k + 1) % (w / p)) + w / p) % (w / p) * 1.37 + s); return a + (b - a) * sm(f); };
    const top = new Int16Array(w), mr = new Int16Array(w);
    for(let x = 0; x < w; x++){ let best = 1e9; for(const p of PK){ const d = wrapD(x, p[0], w), v = p[1] + Math.abs(d) * (d < 0 ? p[2] : p[3]); if(v < best) best = v; }
      best += (vn(x, 32, 1) - .5) * 9 + (vn(x, 8, 2) - .5) * 4 + (H1(Math.floor(x / 2) * 2.3 + 4) - .5) * 2; top[x] = Math.round(Math.min(h - 30, Math.max(1, best)));
      mr[x] = Math.round(43 + 4 * Math.sin(Math.PI * 2 * 3 * x / w + 1.3) + 3 * Math.sin(Math.PI * 2 * 7 * x / w) + (vn(x, 16, 5) - .5) * 4 - Math.round(1.4 * Math.sqrt(Math.max(0, 1 - Math.pow(((x % 5) - 2) / 2.5, 2))))); }
    const lt = x => top[(x + w - 1) % w] > top[(x + 1) % w];   // the ridge rises to the right: the slope faces the moon
    PEAK = paint(mkCanvas(w, h), (x, y) => { const t = top[x], m = mr[x];
      if(y >= h - 9 + ((H1(Math.floor(x / 4) * 2.9) * 3) | 0)) return y > h - 4 && bay(x, y) < .3 ? '#111a26' : '#0b111a';   // the forest at the foot
      if(y >= m){ if(y === m) return (x % 5) < 3 ? '#33435c' : '#26344a'; const mist = (y > h - 16 ? Math.min(1, (y - (h - 16)) / 6) * .45 : 0); if(mist > 0 && bay(x, y) < mist) return '#28344e'; return (H1(Math.floor(x / 3) * 3.1 + Math.floor(y / 3) * 1.7) > .82) ? '#18222f' : '#121a27'; }   // the middle ridge
      if(y < t) return null;
      // valley mist lying on the range's foot, above the middle ridge (dithered, densest just over it)
      const md = 1 - (m - y) / 9; if(md > 0 && bay(x, y) < md * .6) return md > .6 ? '#4a5878' : '#3a4666';
      const d = y - t, sg = lt(x) ? 1 : -1, xf = x + Math.round(d * .5) * (lt(x) ? -1 : 1), lit = lt(((xf % w) + w) % w) !== (H1(Math.floor(xf / 6) * 1.9 + Math.floor(d / 5)) > .78);
      const gx = ((xf % w) + w) % w, gully = (gx % 9) < 2 && H1(Math.floor(gx / 9) * 3.3 + 1) > .5 && d < 6 + H1(Math.floor(gx / 9) * 1.9) * 18 && d > 1, patch = d < 4 && H1(Math.floor(x / 7) * 2.7) > .6;
      if(d === 0) return lit ? '#8a98bc' : '#4a5476';
      if(gully || patch) return lit ? SNOW[3] : SNOW[2];
      return lit ? (d < 12 ? '#4c5778' : '#424c6c') : '#2e3552'; });
    PEAKM = mirror(PEAK); }
  const SNOW = ['#3a4466', '#5a6890', '#8e9ec2', '#c6d2ea', '#eef4ff'];
  // the gorge's far wall: buttresses of pale granite with forest on the ledges and the rim, falling below the horizon into mist, the river far below
  const GHZ = 100;
  function buildGorge(){ const w = 512, h = 172, TAU = Math.PI * 2;
    // three ridges, far to near (Mononoke's gorges, Shinkai's night ranges: layered silhouettes, each paler and bluer with distance, each with
    // a moonlit rim); the near wall's forest in rounded crowns with pale granite slabs breaking through; mist pooled below; the river at the foot
    const LY = [{ b:6, a:18, p:[2, 5, 9], col:'#182033', rim:'#4a5a7e', crown:0 }, { b:24, a:24, p:[3, 7, 11], col:'#0f1622', rim:'#33475f', crown:3 }, { b:44, a:30, p:[2, 4, 13], col:'#090e12', rim:FOR[3], crown:5, rock:true }];
    const tops = LY.map((L, n) => { const t = new Int16Array(w); for(let x = 0; x < w; x++){ const v = .5 + .28 * Math.sin(TAU * L.p[0] * x / w + n * 2.1) + .14 * Math.sin(TAU * L.p[1] * x / w + n) + .08 * Math.sin(TAU * L.p[2] * x / w + n * 4.7);
      let y = L.b + L.a * (1 - v) + ((H1(Math.floor(x / 3) * 1.3 + n * 7) * 2.4) | 0); if(L.crown){ const c = x % L.crown, r = L.crown / 2; y -= Math.round(1.6 * Math.sqrt(Math.max(0, 1 - Math.pow((c - r + .5) / r, 2)))); } t[x] = Math.round(y); } return t; });
    const ry = x => GHZ + 34 + Math.round(3 * Math.sin(TAU * 4 * x / w) + 2 * Math.sin(TAU * 2 * x / w + 1));
    GORGE = paint(mkCanvas(w, h), (x, y) => { const r = ry(x);
      if(y > r + 2) return y < r + 5 && ((x + y) & 3) === 0 ? '#161a26' : '#05060b';
      if(y >= r - 1){ const rap = H1(Math.floor(x / 11) * 2.1) > .7 && (x % 11) < 4; if(rap && y <= r) return '#d4dff0'; if(y === r - 1 && H1(Math.floor(x / 7)) > .4) return '#7088b0'; return '#0e1830'; }
      let n = -1; for(let k = LY.length - 1; k >= 0; k--) if(y >= tops[k][x]){ n = k; break; } if(n < 0) return null;
      const L = LY[n], t = tops[n][x], d = y - t, dz = y - GHZ;
      // mist lying in the gorge below the horizon, thickest a little below it
      const mist = Math.exp(-Math.pow((y - (GHZ + 14)) / 7, 2)) * .8; if(mist > .12 && bay(x, y) < mist * .75) return mist > .55 ? '#4e5c7e' : '#344060';
      if(d === 0) return n === 2 ? (tops[n][x - 1 < 0 ? w - 1 : x - 1] >= t ? L.rim : FOR[2]) : L.rim;
      // round 13: granite ribs hanging from the rim and narrowing downward (they read as floating tiles when they started below it)
      if(L.rock && d > 0 && d < 30){ const xs = (x - Math.round(d * .3) + 1024) % w, cell = Math.floor(xs / 17), c2 = xs % 17, len = 8 + H1(cell) * 18, wd = (5 + H1(cell * 1.9) * 5) * (1 - d / len); if(H1(cell * 3.3 + 1) > .55 && d < len && c2 >= 3 && c2 < 3 + wd) return c2 === 3 ? GR[3] : dz > 0 ? GR[1] : GR[2]; }
      return dz > 6 ? (n === 2 ? '#06090c' : '#0b1018') : L.col; }); }
  function buildShore(){ const w = 512, h = 40, top = new Int16Array(w);
    for(let x = 0; x < w; x++){ const k = Math.floor(x / 48), f = (x % 48) / 48, a = H1(k * 1.9 + 7), b = H1(((k + 1) % 11) * 1.9 + 7), base = 10 + 18 * (a + (b - a) * sm(f)), c = x % 6; top[x] = Math.round(base - Math.round(2 * Math.sqrt(Math.max(0, 1 - Math.pow((c - 2.5) / 3, 2))))); }
    SHORE = paint(mkCanvas(w, h), (x, y) => { const t = top[x]; if(y < t) return null; if(y === t) return (x % 6) < 3 ? FOR[3] : FOR[2]; if(y > h - 3){ const L = H1(Math.floor(x / 5) * 6.1) > .93 && (x % 5) < 2; if(L) return y === h - 2 ? WARM : '#a07040'; } return y < t + 3 ? FOR[2] : FOR[1]; });
    SHOREM = mirror(SHORE); }
  // a water reflection of a strip: flipped, darkened, rows shifted a pixel either way and every third row darker (baked ripple)
  function mirror(src){ const w = src.width, h = src.height, sg = src.getContext('2d'), sd = sg.getImageData(0, 0, w, h).data, c = mkCanvas(w, h), g = c.getContext('2d'), d = g.createImageData(w, h), o = d.data;
    for(let r = 0; r < h; r++){ const sy = h - 1 - r, sh = r < 2 ? 0 : ((r * 7) % 3) - 1, dk = (r % 3 === 2 ? .5 : .68) * (1 - r / h * .3);
      for(let x = 0; x < w; x++){ const sx = (x + sh + w) % w, i = (sy * w + sx) * 4, j = (r * w + x) * 4; if(sd[i + 3] < 128) continue; o[j] = sd[i] * dk + 2; o[j + 1] = sd[i + 1] * dk + 4; o[j + 2] = sd[i + 2] * dk + 10; o[j + 3] = 255; } }
    g.putImageData(d, 0, 0); return c; }
  // foam puffs (white water) and mist: lobed, shaded from the upper left, a dithered torn fringe; one canvas pixel per sprite pixel
  /* White water and mist, as pixel art with no outline. PUFF is spray: solid white at its heart, breaking outward into an ordered dither
     whose density falls off with radial feathering (the fan of a kanpō jet's spray, the boil of the plunge pool). MIST is a wide soft layer,
     twice as wide as tall, never denser than about half its pixels: the cool drift that rises off the water. One canvas pixel per sprite pixel. */
  function buildPuffs(){ for(let si = 0; si < RS.length; si++){ const r = RS[si], n = 2 * r + 2; PUFF[si] = []; MIST[si] = [];
      for(let v = 0; v < 3; v++){ const L = []; for(let k = 0; k < 5; k++){ const a = k * 1.256 + v * .7, d = r * .42 * H1(si * 3 + v * 7 + k); L.push([r + 1 + Math.cos(a) * d, r + 1 + Math.sin(a) * d * .8, r * (.48 + H1(k * 5.1 + v + si) * .2)]); }
        const field = (x, y) => { let f = -1; for(const l of L){ const q = 1 - Math.hypot(x - l[0], y - l[1]) / l[2]; if(q > f) f = q; } return f; };
        PUFF[si][v] = paint(mkCanvas(n, n), (x, y) => { const f = field(x + .5, y + .5), a = Math.atan2(y - r - .5, x - r - .5);
          const d = f * 1.5 + .12 + (r >= 4 ? .24 * Math.cos(a * 6 + v * 2.3 + si * .7) * (1 - Math.max(0, f)) : 0); if(d <= 0 || bay(x + v * 2, y + v) >= Math.min(1, d)) return null;
          return d > .95 ? FOAM[4] : d > .6 ? FOAM[3] : '#9aaed0'; });
        const w = 2 * n, h = n; MIST[si][v] = paint(mkCanvas(w, h), (x, y) => { const f = field(x / 2 + .25, (y - h / 2) * 1.4 + n / 2 + .5); if(f <= 0) return null; const d = Math.min(.55, f * .8); if(bay(x + v, y) >= d) return null; return d > .38 ? '#a8b8d8' : '#7084a8'; }); } } }
  function puffAt(list, x, y, r, v){ let si = 0; const rc = r / PX; while(si < RS.length - 1 && RS[si + 1] <= rc) si++; const c = list[si][v % 3], w = c.width * PX, h = c.height * PX; cx.drawImage(c, snp(x - w / 2), snp(y - h / 2), w, h); }
  const CHARS = '黒部第一二三洞門関電トンネル湖仙人谷';
  function paintGlyphs(){ for(const ch of CHARS){ const c = GLY[ch]; if(!c) continue; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.font = '12px DotGothic16'; g.textBaseline = 'top'; g.fillStyle = '#dfe4ee'; if(ch === '一'){ g.fillRect(1, 6, 11, 3); } else g.fillText(ch, 0, 1);
      try{ const d = g.getImageData(0, 0, c.width, c.height); for(let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; g.putImageData(d, 0, 0); }catch(e){} } }
  function vbOK(){ if(!VB) return false; if(VB.width !== cv.width || VB.height !== cv.height){ VB.width = cv.width; VB.height = cv.height; } return true; }

  // ---------------------------------------------------------------- far strips at their parallax tiers
  function strip(c, tier, y){ if(!c || KBX.includes('strip')) return; const w = c.width, off = ((skyPar(tier) / PX) % w + w) % w, cw = Math.ceil(W / PX); cx.imageSmoothingEnabled = false;
    for(let sx = -Math.round(off); sx < cw; sx += w) cx.drawImage(c, sx * PX, snp(y), w * PX, c.height * PX); }

  // ---------------------------------------------------------------- the jets: feathered white water, spray that fans and falls, mist
  /* Round 14 (Kellan: "feathered jets"), from the 観光放水 photographs at zoom ("Kurobe Dam 20141012 130913", "...AlpineRoute6337",
     "Kurobe Dam (9711128077)", "Kurobe Dam 01..06"): each jet leaves its outlet as a blunt white crown that arches out and over, then falls
     as a widening curtain. Its value runs from a hard white core through a striated body (vertical fall streaks, white over a grey a step
     down) to a torn edge: the dam shows through it in broken wisps, strands of water hang off the curtain, droplets fling out of it in fans
     and drop. Below, the curtain dissolves into a cloud of mist wider than the jets. Rules taken:
     - four values, no outline: core FOAM[4], body FOAM[3], streaks FOAM[2], veil = FOAM[3] in ordered dither (50%, then 25% outside);
     - the edge is never a clean curve: its width is value noise travelling down the jet (the water moving), the veil breaks it into pixels;
     - strands hang straight down (gravity, screen space) from the underside of the curtain, one pixel wide, dithered, varying in length;
     - spray: stateless particles fired out of both flanks, fanning along the jet and falling, white -> pale -> grey as they age;
     - all of it scales with the jet's own width, so it reads the same far up the gorge and right over the road (steady under reduced motion).
     pt(t) writes the world point at t (0 outlet .. 1 the basin) into JP; rw(t) is the jet's half-width there, in half-road widths. */
  const JNM = 18, JX = new Float64Array(JNM + 1), JY = new Float64Array(JNM + 1), JR = new Float64Array(JNM + 1), JA = new Float64Array(JNM + 1), JB = new Float64Array(JNM + 1);
  const JW = .42;   // the solid water's half-width as a share of rw (the veil, the strands and the spray reach out past it)
  const vn = x => { const i = Math.floor(x), f = x - i, a = H1(i * 7.13 + 3.1), b = H1((i + 1) * 7.13 + 3.1); return a + (b - a) * f * f * (3 - 2 * f); };   // smooth value noise, 0..1
  /* one ribbon layer between the jet's samples: wt / wb (in units of the local half-width) on the top (crown) and under sides, each widened
     by noise of amplitude at / ab that travels down the jet with the flow; t0..t1 limits it along the jet; it narrows as it falls by
     1 - t^tp * ts (the solid water breaks up first: the core is gone by the basin, the body thins, the veil holds on) */
  function ribbon(n, N, wt, at, wb, ab, col, fl, sd, t0, t1, tp, ts){ for(let k = 0; k < n; k++){ const ta = k / N, tb = (k + 1) / N; if(tb < t0 || ta > t1) continue;
      const fa = Math.max(0, 1 - Math.pow(ta, tp) * ts), fb = Math.max(0, 1 - Math.pow(tb, tp) * ts); if(fa <= 0 && fb <= 0) continue;
      const ea = vn(k * 1.37 - fl + sd), eb = vn((k + 1) * 1.37 - fl + sd), ga = vn(k * 1.61 - fl * 1.2 + sd + 40), gb = vn((k + 1) * 1.61 - fl * 1.2 + sd + 40);
      const ra = JR[k] * fa, rb = JR[k + 1] * fb, ua = ra * (wt + at * ea), ub = rb * (wt + at * eb), da = ra * (wb + ab * ga), db = rb * (wb + ab * gb);
      poly(JX[k] + JA[k] * ua, JY[k] + JB[k] * ua, JX[k + 1] + JA[k + 1] * ub, JY[k + 1] + JB[k + 1] * ub, JX[k + 1] - JA[k + 1] * db, JY[k + 1] - JB[k + 1] * db, JX[k] - JA[k] * da, JY[k] - JB[k] * da, col); } }
  function jet(pt, rw, q, now, seed, F, mk){ if(q <= .02) return; if(mk === undefined) mk = 1;   // mk: the tail mist's size (the dam's jets 1)
    pt(.5); PJ(JP[0], JP[1], JP[2]); const Rm = rw(.5) * PJU * (.4 + .6 * q) * JW, N = Rm > PX * 12 ? 18 : Rm > PX * 4 ? 13 : 9, n = Math.max(2, Math.round(N * (.35 + .65 * q)));
    for(let k = 0; k <= n; k++){ const t = k / N; pt(t); PJ(JP[0], JP[1], JP[2]); JX[k] = PJX; JY[k] = PJY; JR[k] = rw(t) * PJU * (.4 + .6 * q) * JW / (1 + .9 * t); }
    // normals: the crown side (screen up) first, then kept continuous along the jet so a falling stretch never twists
    for(let k = 0; k <= n; k++){ const a = Math.max(0, k - 1), b = Math.min(n, k + 1), dx = JX[b] - JX[a], dy = JY[b] - JY[a], l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l;
      if(k === 0 ? ny > 0 : nx * JA[k - 1] + ny * JB[k - 1] < 0){ nx = -nx; ny = -ny; } JA[k] = nx; JB[k] = ny; }
    const fl = reduce ? 0 : now * .0026, sd = seed * 17.3, C4 = F(FOAM[4]), C3 = F(FOAM[3]), C2 = F(FOAM[2]);
    // the veil: the torn translucent edge (25% outside, 50% inside); the curtain hangs wider on its underside as it falls
    if(Rm > PX * 2.2){ if(Rm > PX * 3.5) ribbon(n, N, .85, .4, 1.3, .6, ditherPat(C3, .25), fl, sd, .18, 1, 2, 0); ribbon(n, N, .95, .3, 1.05, .4, ditherPat(C3, .5), fl * 1.1, sd + 9, 0, 1, 2, .45); }
    // the body, then the core
    ribbon(n, N, .62, .28, .7, .3, C3, fl * 1.2, sd + 21, 0, 1, 2, .8);
    ribbon(n, N, .5, .14, .2, .12, C4, fl * 1.3, sd + 33, 0, 1, 1.5, 1.15);
    // fall streaks: dashed lines along the curtain (grey in its shadowed underside, white on its upper face), the dashes running with the water
    if(Rm > PX * 5.5){ const ph = Math.floor(fl * 2.2); for(let s = 0; s < 4; s++){ const o = [-.52, -.22, .12, .4][s], col = o < 0 ? C2 : C4;
        for(let k = 1; k < n; k++){ if(k / N < .18 || (k + ph + s * 2) % 3 === 0) continue; const oa = JR[k] * o, ob = JR[k + 1] * o, w = PX * .5;
          poly(JX[k] + JA[k] * (oa - w), JY[k] + JB[k] * (oa - w), JX[k + 1] + JA[k + 1] * (ob - w), JY[k + 1] + JB[k + 1] * (ob - w), JX[k + 1] + JA[k + 1] * (ob + w), JY[k + 1] + JB[k + 1] * (ob + w), JX[k] + JA[k] * (oa + w), JY[k] + JB[k] * (oa + w), col); } } }
    // strands hanging off the underside of the curtain, and short wisps torn up off the crown (one pixel wide, dithered, never the same twice)
    if(Rm > PX * 2.5){ const half = ditherPat(C3, .5); for(let k = 1; k <= n; k++){ const t = k / N; for(let j = 0, nj = Rm > PX * 6 ? 2 : 1; j < nj; j++){ const u = (j + .35) / nj, kk = k - 1 + u, X = JX[k - 1] + (JX[k] - JX[k - 1]) * u, Y = JY[k - 1] + (JY[k] - JY[k - 1]) * u, R0 = JR[k - 1] + (JR[k] - JR[k - 1]) * u, A = JA[k], B = JB[k];
          const e = vn(kk * 2.3 - fl * 1.6 + sd + j * 5); if(t > .16){ const L = R0 * (.25 + 1.1 * e * e), d = R0 * (1.05 + .5 * vn(kk * 1.37 - fl + sd)); if(L >= PX){ cx.fillStyle = half; pxRect(snp(X - A * d), snp(Y - B * d), PX, snp(L)); cx.fillStyle = C2; pxRect(snp(X - A * d), snp(Y - B * d + L), PX, PX); } }
          if(t < .5 && e > .55){ const L = R0 * .5 * (e - .4), d = R0 * (.95 + .3 * vn(kk * 1.37 - fl + sd)); if(L >= PX){ cx.fillStyle = half; pxRect(snp(X + A * d), snp(Y + B * d - L), PX, snp(L)); } } } } }
    // spray: droplets fired out of both flanks, fanning down the jet and falling (stateless: each lives on a loop of its own period)
    { const M = Math.round((Rm < PX * 2 ? 4 : Rm < PX * 6 ? 12 : 22) * q); for(let m = 0; m < M; m++){ const t0 = .06 + .78 * H1(m * 1.71 + seed * 3.3), k0 = t0 * N; if(k0 >= n) continue;
        const k = Math.floor(k0), f = k0 - k, X = JX[k] + (JX[k + 1] - JX[k]) * f, Y = JY[k] + (JY[k + 1] - JY[k]) * f, R0 = JR[k] + (JR[k + 1] - JR[k]) * f, A = JA[k], B = JB[k];
        let tx = JX[k + 1] - JX[k], ty = JY[k + 1] - JY[k]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const side = H1(m * 2.93 + seed) < .6 ? -1 : 1, P = 700 + 600 * H1(m * 4.1 + seed), a = reduce ? .25 + .5 * H1(m * 5.7 + seed) : ((now / P + H1(m * 3.37 + seed)) % 1); if(a > .94) continue;
        const v = .9 + .9 * H1(m * 6.1 + seed), d = R0 * (1 + v * 1.7 * a), x = X + side * A * d + tx * R0 * 1.4 * a, y = Y + side * B * d + ty * R0 * 1.4 * a + R0 * 2.4 * a * a;
        const sz = R0 > PX * 7 && a < .45 ? PX * 2 : PX; cx.fillStyle = a < .28 ? C4 : a < .62 ? C3 : C2; cx.fillRect(snp(x - sz / 2), snp(y - sz / 2), sz, sz); } }
    // the crown: a few lobes of white water boiling along its top near the outlet
    if(Rm > PX * 3 && mk === 1){ const ch = reduce ? 0 : Math.floor(now / 160); for(let m = 0; m < 3; m++){ const t = .05 + m * .1, k0 = t * N; if(k0 >= n) continue; const k = Math.floor(k0), d = JR[k] * .7; puffAt(PUFF, JX[k] + JA[k] * d, JY[k] + JB[k] * d, JR[k] * (.5 + .15 * m), m + ch + seed); } }
    // the tail goes to mist, wider than the jet, dithered (it reads as a value of its own in grey)
    if(mk > 0){ cx.globalAlpha = Math.min(1, .8 * q); for(let m = 0; m < 3; m++){ const t = Math.min(n / N, .74 + m * .11); pt(t); PJ(JP[0], JP[1], JP[2] + (1 + m) * mk); const r = rw(t) * PJU * (.85 + m * .3) * mk; if(r >= PX) puffAt(MIST, PJX + (m - 1) * r * .6, PJY, r, m + seed); } cx.globalAlpha = 1; } }
  const JP = new Float64Array(3), JOV = { dz:22, dx:12, up:3, land:-1 }, LOV = { dz:5, dx:-9, up:8, land:-5, wm:1.8 };   // (JOV: the jets over the road on the reveal: thrown 24 units toward you and 14 across the road, falling beyond the left wall)

  // ---------------------------------------------------------------- the dam from downstream (the approach): a camera-facing arch across the gorge
  /* damArch: the dam as a projected arch, concave toward you. A = { zc, XC, HS (half-span), BOW (segments), yaw (radians: turns the chord so
     one end comes nearer, the three-quarter view from the real observation deck), HC (crest height), HB (foot), ds (the side of the deck and
     the stair), aw, oh (outlets' depth under the crest), ou (outlets' places along the arch, -1..1), gf (fog), tower, beams }.
     The face is lit two ways: the moon by each column's true facing (so the curve reads as a turning surface), and the light-up's floodlights
     washing up from the foot round the plume in hard bands. Lift lines catch the moon as a pale line over a dark joint. On the approach it
     stands across the gorge in a straight frame (PJS); on the crest it is the arch's far half, seen across the curve. */
  const CI = new Int16Array(16), CZ = new Float64Array(16), RAMP = [CO[1], CO[2], CO[3], CO[4], CO[5], FL[0], FL[1], FL[2]];
  const RV = new Float64Array(3 * 7 * 7), RK2 = [-1, 1], RK1 = [1];   // (the crest's far arch: only its far abutment, so the near one never crosses the reservoir view)
  function rockSides(A, Ze, Xe, F){ const { HC, HB } = A, AW = A.aw || 5, NA = 6, NH = 6, sd0 = A.XC * 1.7 + A.HS;
    for(const sd of (A.rk || RK2)){ const u = sd;
      for(let ga = 0; ga <= NA; ga++) for(let gh = 0; gh <= NH; gh++){ const o = (ga * (NH + 1) + gh) * 3, a = sd * (AW - 2.5 + ga * 5.5), ft = gh / NH, ridge = HC + 9 + 8 * Math.sin(ga * 1.3 + sd0) * .5 + H1(ga * 3.1 + sd * 7 + sd0) * 5 - ga * .6;
        const h = HB - 4 + (ridge - HB + 4) * ft, j = gh === 0 || gh === NH ? 0 : 1, d = (H1(ga * 5.3 + Math.floor(gh / 3) * 2.1 + sd * 11 + sd0) - .5) * 4 * j - ft * 3, dh = (H1(ga * 1.9 + gh * 7.3 + sd * 3 + sd0) - .5) * 2.4 * j;
        RV[o] = Ze(u, a, d); RV[o + 1] = Xe(u, a, d); RV[o + 2] = h + dh; }
      const T = (o1, o2, o3, tn) => { PJ(RV[o1], RV[o1 + 1], RV[o1 + 2]); const x1 = PJX, y1 = PJY; PJ(RV[o2], RV[o2 + 1], RV[o2 + 2]); const x2 = PJX, y2 = PJY; PJ(RV[o3], RV[o3 + 1], RV[o3 + 2]);
        if(Math.max(x1, x2, PJX) < -PX || Math.min(x1, x2, PJX) > W + PX) return; tri(x1, y1, x2, y2, PJX, PJY, F(GR[tn])); };
      // round 13: one tone per cell (a column of slabs, its depth shared down each block of three rows: vertical joints and sheet joints,
      // not a triangle mosaic), the bottom row in the warm-violet shadow
      const TN = (o1, o2, o3) => { const ax = (RV[o2] - RV[o1]) / 10, ay = RV[o2 + 1] - RV[o1 + 1], az = RV[o2 + 2] - RV[o1 + 2], bx = (RV[o3] - RV[o1]) / 10, by = RV[o3 + 1] - RV[o1 + 1], bz = RV[o3 + 2] - RV[o1 + 2];
        let nz = ay * bz - az * by, nX = az * bx - ax * bz, nh = ax * by - ay * bx; if(nz > 0){ nz = -nz; nX = -nX; nh = -nh; } const l = Math.hypot(nz, nX, nh) || 1, dl = (nX * -.5 + nh * .7 + nz * -.5) / l;
        return dl > .7 ? 4 : dl > .5 ? 3 : dl > .25 ? 2 : 1; };
      for(let ga = NA - 1; ga >= 0; ga--) for(let gh = 0; gh < NH; gh++){ const o00 = (ga * (NH + 1) + gh) * 3, o01 = o00 + 3, o10 = o00 + (NH + 1) * 3, o11 = o10 + 3;
        let tn = TN(o00, o10, o01); if(gh === 0) tn = Math.max(1, tn - 1); if(H1(ga * 2.7 + gh * 1.1 + sd) > .5){ T(o00, o10, o11, tn); T(o00, o11, o01, tn); } else { T(o00, o10, o01, tn); T(o10, o11, o01, tn); } }
      // the ridge: a moonlit line and a fringe of forest along the top
      for(let ga = 0; ga < NA; ga++){ const o0 = (ga * (NH + 1) + NH) * 3, o1 = ((ga + 1) * (NH + 1) + NH) * 3; PJ(RV[o0], RV[o0 + 1], RV[o0 + 2]); const x0 = PJX, y0 = PJY, u0 = PJU; PJ(RV[o1], RV[o1 + 1], RV[o1 + 2]);
        poly(x0, y0, PJX, PJY, PJX, PJY - Math.max(PX, PJU * .9), x0, y0 - Math.max(PX, u0 * .9), F(FOR[1])); poly(x0, y0 - Math.max(PX, u0 * .9), PJX, PJY - Math.max(PX, PJU * .9), PJX, PJY - Math.max(PX, PJU * .9) + PX, x0, y0 - Math.max(PX, u0 * .9) + PX, F(FOR[3])); } } }
  function damArch(L, A, now){ if(KBX.includes('dam')) return; const zc = A.zc, F = c => fc(c, A.gf), { XC, HS, BOW, HC, HB, ds } = A, AW = A.aw || 5, OH = A.oh || 13, OU = A.ou || [-.12, .1];
    const yw = A.yaw || 0, cy = Math.cos(yw), sy = Math.sin(yw), Zl = u => BOW / 10 * (1 - u * u), Xl = u => HS * u, ox = -sy, oz = -cy;   // (ox, oz: downstream, in half-road widths)
    const Zu = u => zc + (Zl(u) * cy - Xl(u) * sy) * 10, Xu = u => XC + Xl(u) * cy + Zl(u) * sy;
    const Ze = (u, a, d) => Zu(u) + (-a * sy + d * oz) * 10, Xe = (u, a, d) => Xu(u) + a * cy + d * ox;   // a point a along the chord beyond u, d downstream
    PJ(zc, XC, HC); const uu = PJU, NU = uu > PX * 2.2 ? 10 : uu > PX * .9 ? 8 : 6, q0 = jetQ(L, 0), q1 = jetQ(L, 1), fon = floodOn(L, 0), lon = lampOn(L), qq = Math.max(q0, q1), uc = (OU[0] + OU[1]) / 2;
    const tone = (um, hm) => { const fl = fon * (.55 + .45 * qq) * Math.exp(-Math.pow((um - uc) / .5, 2)) * clamp((HC * .55 - hm) / ((HC - HB) * .55), 0, 1.15);
      if(fl > .78) return 7; if(fl > .6) return 6; if(fl > .43) return 5; if(fl > .28) return 4;
      const nXl = -um * .9, nZl = -1, nX = nXl * cy + nZl * sy, nZ = -nXl * sy + nZl * cy, d = (nX * -.6 + nZ * -.8) / Math.hypot(nX, nZ);
      return Math.min(4, (d > .8 ? 3 : d > .55 ? 2 : 1) + (hm > HC - 8 ? 1 : 0)); };
    // the abutments: massive concrete wedges where the arch meets the granite
    for(const sd of [-1, 1]){ const z0 = Zu(sd), x0 = Xu(sd), z1 = Ze(sd, sd * AW, 0), x1 = Xe(sd, sd * AW, 0);
      wq(z0, x0, HC + 2.5, z1, x1, HC + 5, z1, x1, HB, z0, x0, HB, F(CO[1])); wq(z0, x0, HC + 2.5, z1, x1, HC + 5, z1, x1, HC + 4.6, z0, x0, HC + 2.1, F(CO[4])); }
    // the observation deck on the cliff over one end: a long low hall, its glazed band lit warm, a pale roof edge; the stair down the abutment
    { const za = Ze(ds, ds * 3, -1), xa = Xe(ds, ds * 3, -1), zb = Ze(ds, ds * 9.5, -1), xb = Xe(ds, ds * 9.5, -1), hd = HC + 9;
      wq(za, xa, HC + 2.6, zb, xb, HC + 3.4, zb, xb, hd - .2, za, xa, hd - .2, F(GR[2]));
      wq(za, xa, hd - .4, zb, xb, hd - .4, zb, xb, hd + 1, za, xa, hd + 1, F(CO[3])); wq(za, xa, hd + .05, zb, xb, hd + .05, zb, xb, hd + .62, za, xa, hd + .62, F(lon ? WARM : '#6a5a40'));
      wq(za, xa, hd + 1, zb, xb, hd + 1, zb, xb, hd + 1.18, za, xa, hd + 1.18, F(CO[6]));
      if(uu > PX * .7) for(let k = 1; k < 10; k++){ const f = k / 10, zz = za + (zb - za) * f, xx = xa + (xb - xa) * f; wq(zz, xx, hd + .05, zz, xx + .05, hd + .05, zz, xx + .05, hd + .62, zz, xx, hd + .62, F(CO[2])); }
      for(let k = 0; k < 6; k++){ const h0 = HC + 2 - k * 2.4, h1 = h0 - 2.4, sdk = k & 1, aS = ds * 1.6, aL = ds * 5.2, z0 = Ze(ds, sdk ? aS : aL, .3), x0 = Xe(ds, sdk ? aS : aL, .3), z1 = Ze(ds, sdk ? aL : aS, .3), x1 = Xe(ds, sdk ? aL : aS, .3);
        wq(z0, x0, h0, z0, x0, h0 + .14, z1, x1, h1 + .14, z1, x1, h1, F('#b4bccc'));
        if(lon && uu > PX * .25){ PJ(z1, x1, h1 + .3); R(PJX - PX / 2, PJY - PX / 2, PX, PX, WARMH); } } }
    // the arch, its columns farthest first
    for(let c = 0; c < NU; c++){ CZ[c] = Zu(-1 + 2 * (c + .5) / NU); let k = c; while(k > 0 && CZ[CI[k - 1]] < CZ[c]){ CI[k] = CI[k - 1]; k--; } CI[k] = c; }
    const HB2 = [HC + .3, HC, HC - .6, HC - 1.7, HC - 4, HC - 7, HC - 10, HC - 13, HC - 16, HC - 19, HC - 22, HC - 25, HB + 2.5, HB];
    for(let ci = 0; ci < NU; ci++){ const c = CI[ci], u0 = -1 + 2 * c / NU, u1 = u0 + 2 / NU, um = (u0 + u1) / 2, z0 = Zu(u0), z1 = Zu(u1), x0 = Xu(u0), x1 = Xu(u1), cw = uu * HS * 2 / NU;
      let pc = null, ph0 = 0, ph1 = 0;
      for(let b = 0; b + 1 < HB2.length; b++){ const ha = HB2[b], hb = HB2[b + 1], hm = (ha + hb) / 2; const col = b === 0 ? CO[6] : b === 1 ? CO[3] : b === 2 ? CO[1] : RAMP[tone(um, hm)];
        if(col === pc){ ph1 = hb; continue; } if(pc) wq(z0, x0, ph0, z1, x1, ph0, z1, x1, ph1, z0, x0, ph1, F(pc)); pc = col; ph0 = ha; ph1 = hb; }
      if(pc) wq(z0, x0, ph0, z1, x1, ph0, z1, x1, ph1, z0, x0, ph1, F(pc));
      // long thin streaks running down from the crest: water (cool, darker) and rust (warm) from the drains; never block-shaped
      if(cw > PX * 3) for(let g = 0; g < 3; g++){ const f0 = .1 + g * .3 + H1(c * 5.3 + g) * .18, f1 = f0 + .025 + H1(c * 2.9 + g) * .035, hl = HC - 1 - (5 + H1(c * 7.1 + g * 3) * (HC - HB) * .7), rust = H1(c * 4.1 + g * 9) > .7;
        wq(z0 + (z1 - z0) * f0, x0 + (x1 - x0) * f0, HC - .7, z0 + (z1 - z0) * f1, x0 + (x1 - x0) * f1, HC - .7, z0 + (z1 - z0) * f1, x0 + (x1 - x0) * f1, hl, z0 + (z1 - z0) * f0, x0 + (x1 - x0) * f0, hl, F(rust ? '#4a3c3a' : RAMP[Math.max(0, tone(um, (HC + hl) / 2) - 2)])); }
      // a vertical block joint at the column's edge, and the crest's shadow line under the cornice (one dark pixel, no gate boxes)
      if(cw > PX * 3) wq(z0, x0, HC - .6, z0, x0 + .06, HC - .6, z0, x0 + .06, HB + 1, z0, x0, HB + 1, F(CO[1]));
      wq(z0, x0, HC - .6, z1, x1, HC - .6, z1, x1, HC - .75, z0, x0, HC - .75, F(CO[0]));
      // fine lift lines every 2 units, a step lighter than the face (moonlit lips), where they read; drain outlets at two heights
      if(uu * 2 > PX * 4 && !(c & 1)){ const ub = Math.min(1, u1 + 2 / NU), zB = Zu(ub), xB = Xu(ub); for(let h = HC - 3; h > HB + 1.5; h -= 2){ const t = tone(um, h); wq(z0, x0, h, zB, xB, h, zB, xB, h - .06, z0, x0, h - .06, F(RAMP[Math.min(7, t + 1)])); } }
      if(cw > PX * 4) for(const hd of [HC - 6, HC - 15]){ const zm = (z0 + z1) / 2, xm = (x0 + x1) / 2; PJ(zm, xm, hd); const d = Math.max(PX, snp(PJU * .25)); R(PJX - d / 2, PJY - d / 2, d, d, F(CO[0])); }
      if(Math.abs(um) < .85){ const hc = HC - 11; wq(z0, x0, hc, z1, x1, hc, z1, x1, hc - .16, z0, x0, hc - .16, F(CATW)); wq(z0, x0, hc - .16, z1, x1, hc - .16, z1, x1, hc - .5, z0, x0, hc - .5, F(CO[1])); }
      if(lon && uu > PX * .3){ PJ((z0 + z1) / 2, (x0 + x1) / 2, HC + .45); R(PJX - PX / 2, PJY - PX, PX, PX, WARM); } }
    // the foot: a dark plinth along the arch, the spillway apron running out pale from it, and the gorge floor below (no sky under the dam)
    { const fl = HB - .6; wq(Ze(-1.15, 0, 0), Xe(-1.15, 0, 0), fl, Ze(1.15, 0, 0), Xe(1.15, 0, 0), fl, Ze(1.15, 0, 30), Xe(1.15, 0, 30), fl, Ze(-1.15, 0, 30), Xe(-1.15, 0, 30), fl, F('#0a0b12'));
      for(let c = 0; c < 6; c++){ const u0 = -1 + c / 3, u1 = u0 + 1 / 3; wq(Zu(u0), Xu(u0), HB + 1.4, Zu(u1), Xu(u1), HB + 1.4, Zu(u1), Xu(u1), HB, Zu(u0), Xu(u0), HB, F(CO[1])); }
      wq(Ze(-.4, 0, 0), Xe(-.4, 0, 0), HB + .05, Ze(.4, 0, 0), Xe(.4, 0, 0), HB + .05, Ze(.4, 0, 7), Xe(.4, 0, 7), HB + .05, Ze(-.4, 0, 7), Xe(-.4, 0, 7), HB + .05, F(fon ? CO[4] : CO[2])); }
    // the abutments: granite massifs rising higher than the crest on both sides, the arch's ends buried in them, faceted like the gorge's
    // cliffs (vertex jitter seeded from the grid, the same at every distance), lit by facing, a moonlit ridge and forest along the tops
    rockSides(A, Ze, Xe, F);
    // the floodlights at the foot, their light washing up the face round the plume
    for(let k = 0; k < 4; k++){ if(!floodOn(L, k)) continue; const u = [-.5, -.2, .25, .55][k], z = Ze(u, 0, 3.5), x = Xe(u, 0, 3.5); PJ(z, x, HB + .6); const lx = PJX, ly = PJY, s = Math.max(PX, snp(PJU * .3));
      R(lx - s, ly - s / 2, s * 2, s, '#f4f8ff'); halo(lx, ly, Math.min(H * .1, PJU * 4), '#cfe0ff', .45);
      if(A.beams){ cx.globalCompositeOperation = 'lighter'; PJ(Zu(u * .6 + uc * .4), Xu(u * .6 + uc * .4), HC - 6); const tx = PJX, ty = PJY, wd = PJU * HS * .22; poly(lx - s, ly, lx + s, ly, tx + wd, ty, tx - wd, ty, rgbaA('190,210,255', .06)); cx.globalCompositeOperation = 'source-over'; } }
    // the mist first (it climbs the face from the plunge pool, behind the water), then the outlets and the jets, then the pool's boil
    const OV = A.over, ch = reduce ? 0 : Math.floor(now / 160), zp = OV ? Zu(uc) - OV.dz * 10 : Ze(uc, 0, 16), xp = OV ? Xu(uc) + OV.dx : Xe(uc, 0, 16);
    if(qq > .05){ const TW = A.tower ? 12 : 7, TH = A.tower ? (HC - HB) * .45 : (HC - HB) * .4;
      for(let k = 0; k < TW; k++){ const ph = reduce ? H1(k * 1.7) : ((now / (A.tower ? 7000 : 9000) + H1(k * 1.7)) % 1), x = xp - 5 + (k % 7) * 1.7 + ph * 2, z = zp + 10 - (k % 7) * 3;
        cx.globalAlpha = (A.tower ? .22 : .2) * qq * Math.min(1, (1 - ph) * 2.5, ph * 6); PJ(z, x, HB + 1 + ph * TH); puffAt(MIST, PJX, PJY, PJU * (A.tower ? 1.6 + ph * 4.5 : .9 + ph * 1.5), k); } cx.globalAlpha = 1;
      if(A.tower){ cx.globalCompositeOperation = 'lighter'; for(let k = 0; k < 3; k++){ if(!floodOn(L, k + 1)) continue; const xb = xp + (k - 1) * 7, zb2 = zp + 20 - k * 6; PJ(zb2, xb, HB); const x1 = PJX, y1 = PJY, w1 = PJU * 1.2; PJ(zb2 + 30, xb + (k - 1) * 9, HC + 26); const x2 = PJX, y2 = PJY, w2 = PJU * 6;
          poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, rgbaA('180,205,255', .05 * qq)); poly(x1 - w1 * .4, y1, x1 + w1 * .4, y1, x2 + w2 * .35, y2, x2 - w2 * .35, y2, rgbaA('200,220,255', .05 * qq)); } cx.globalCompositeOperation = 'source-over'; } }
    for(let j = 0; j < 2; j++){ const u = OU[j], z = Zu(u) - .3, x = Xu(u), ho = HC - OH, q = j ? q1 : q0, sp2 = j ? 1 : -1;
      wq(z, x - .8 * cy, ho + .7, z, x + .8 * cy, ho + .7, z, x + .8 * cy, ho - .7, z, x - .8 * cy, ho - .7, F(CO[0])); wq(z, x - .9 * cy, ho + .9, z, x + .9 * cy, ho + .9, z, x + .9 * cy, ho + .7, z, x - .9 * cy, ho + .7, F(CO[5]));
      if(OV) jet(t => { JP[0] = z - OV.dz * 10 * t; JP[1] = x + OV.dx * t + sp2 * 1.2 * t; JP[2] = ho + OV.up * t - (ho - OV.land + OV.up) * t * t; }, t => (1 + 3.4 * t) * (OV.wm || 1), q, now, j + 1, F);
      else jet(t => { JP[0] = z + oz * 16 * t * 10; JP[1] = x + ox * 16 * t + sp2 * 2 * t; JP[2] = ho + 8 * t - (ho - HB + 8) * t * t; }, t => .55 + 2.7 * t, q, now, j + 1, F); }
    if(qq > .05) for(let k = 0; k < 6; k++){ const x = xp - 6 + k * 2.1, z = zp + (H1(k * 3.1) - .5) * 30; PJ(z, x, (OV ? OV.land : HB) + .4 + H1(k * 1.3) * .8); puffAt(PUFF, PJX, PJY, PJU * (.6 + H1(k) * .8) * qq, k + ch); } }
  // ---------------------------------------------------------------- backdrop: far land, then the world below the road, copied for roadFX
  /* Everything beyond the road's edges that lies below the road (the gorge's depths, the reservoir's mirror, the dam's face and its plume)
     is drawn here, behind the road, and copied into VB. The road pass then paints the ground over it; each segment's roadFX notes the rows
     beyond its valley (and, on the crest, reservoir) edge, and those rows are put back from VB before the props draw (flush()). So the void
     shows only beyond the parapet, under everything standing in front, with no clip path. */
  let VBF = -1;
  function backdrop(o){ setLow(o.sk.low); cam(); const hz = o.hz, now = o.now, cs = camSeg(), L = visitOf(BI) || visitOf(BI + 300), crest = crestView(L, cs);
    PJ(cs + 900, 0, 0); const vx = PJX;
    strip(PEAK, 'far', hz - (crest ? 72 : 60) * PX);
    if(crest){ strip(SHORE, 'mid', hz - 40 * PX);
      // the reservoir: black water, the peaks and the shore mirrored, the moon's broken column
      R(0, hz, W, H - hz, '#05080f'); strip(PEAKM, 'far', hz); strip(SHOREM, 'mid', hz);
      { const mx = o.moonX, n = Math.ceil((H - hz) / PX * .55), ph = reduce ? 0 : Math.floor(now / 260); for(let k = 1; k < n; k += 2){ if(((k >> 1) + ph) % 4 === 3) continue; const w = PX * (3 + Math.floor(k * .14)), a = .9 - k / n * .55; cx.fillStyle = rgbaA('200,212,240', a); cx.fillRect(snp(mx - w / 2 + (reduce ? 0 : Math.sin(k * 1.3 + now * .002) * PX)), snp(hz + k * PX), w, PX); } }
      // downstream: the gorge in darkness, mist low in it, then the dam's face, the jets, the basin
      const x0 = Math.max(0, snp(vx)); R(x0, hz, W - x0, H - hz, '#06070d'); for(let k = 0; k < 4; k++){ cx.fillStyle = ['#0e1220', '#0b0e19', '#090b14', '#07080f'][k]; cx.fillRect(x0, snp(hz + k * 6 * PX), W - x0, 6 * PX); }
      cx.save(); cx.beginPath(); cx.rect(x0, hz, W - x0, H - hz); cx.clip(); strip(GORGE, 'mid', hz + 30 * PX - GHZ * PX); cx.restore();
      if(L && L.ok){ const s = clamp(cs - L.H0, 0, L.C), Dz = 240 - 90 * s / L.C, XCa = 15; PJS = true; try{ damArch(L, { zc:cs + Dz, XC:XCa, HS:14, BOW:60, HC:1.2, HB:-30.8, ds:1, rk:RK1, gf:.28, aw:4, oh:2.8, ou:[-.05, .2], tower:true }, now); } finally { PJS = false; } } }
    else { strip(GORGE, 'mid', hz - GHZ * PX); R(0, snp(hz + (172 - GHZ) * PX), W, H, '#05060b');
      if(L && L.ok && cs < L.T1a + 6){ PJS = false; try{ damArch(L, { zc:L.T1a, XC:4, HS:22, BOW:60, yaw:0, HC:30, HB:-2, ds:1, aw:5, oh:22, ou:[-.23, -.11], over:JOV, beams:true, gf:clamp((L.T1a - cs - 140) / 1300, 0, 1) * .62 }, now); } finally { PJS = false; } }
      else if(L && L.ok && L.led && cs >= L.T2a + 6 && cs < L.Lg1 + 6){ PJS = false; try{ damArch(L, { zc:L.Lg1 + 170, XC:16, HS:20, BOW:60, yaw:.9, HC:30, HB:-6, ds:1, aw:5, oh:13, ou:[-.18, .14], over:LOV, beams:true, gf:clamp((L.Lg1 + 170 - cs - 300) / 1300, 0, 1) * .5 }, now); } finally { PJS = false; } } }
    if(!KBX.includes('vb') && vbOK()){ const r0 = Math.max(0, Math.floor(hz / PX)), ch = cv.height - r0; if(ch > 0){ VG.globalCompositeOperation = 'copy'; VG.drawImage(cv, 0, r0, cv.width, ch, 0, r0, cv.width, ch); VG.globalCompositeOperation = 'source-over'; VBF = DRAWN; } }
    return true; }

  // ---------------------------------------------------------------- roadFX: note the rows beyond the edges; the crest's deck joints
  const BND = new Float64Array(5 * 1600); let NB = 0, BF = -1, FLF = -1;
  function band(y0, y1, xl, xr, a){ if(NB >= 1600 || y1 - y0 < .5 || xr - xl < .5) return; const o = NB * 5; BND[o] = y0; BND[o + 1] = y1; BND[o + 2] = xl; BND[o + 3] = xr; BND[o + 4] = a; NB++; }
  function roadFX(s, a, b, fog, f, now){
    if(s.kbNoPad && s.hz && (s.hz.type === 'pad' || s.kbS === 4)) s.hz = null;
    // (no oil or pads inside a bore or its last 40 rings before the light change at the mouth: unreadable there, so not fair)
    if(s.tunnel && s.hz) s.hz = null;
    if(s.tunnel && s.index % 6 < 2 && a.y - b.y > PX * .6){ cx.fillStyle = rgbaA('255,170,90', .07 * (1 - fog)); pxRect(b.x - b.w * 1.1, b.y, b.w * 2.2, Math.max(PX, a.y - b.y)); }
    if(s.kbS === 3 && a.y - b.y > PX * .8 && s.index % 14 === 0){ const t = Math.max(PX, snp((a.y - b.y) * .18)); cx.fillStyle = f('#121319'); cx.fillRect(snp(b.x - b.w), snp(a.y - t), snp(2 * b.w), t); }
    if((typeof FX_CLIP !== 'undefined' && FX_CLIP) || VBF !== DRAWN) return; if(BF !== DRAWN){ BF = DRAWN; NB = 0; }
    const ay = Math.min(a.y, H), by = b.y; if(ay - by < .5) return; const al = typeof EDGE === 'number' ? EDGE : 1; if(al < .03) return;
    const st = PX * 6, rows = ay - by;
    for(const side of [1, -1]){ const X = side > 0 ? s.kbR : s.kbL; if(!X) continue; const sn = segs[s.index + 1], X2 = sn && (side > 0 ? sn.kbR : sn.kbL) || X, xa = a.x + a.w * X, xb = b.x + b.w * X2;
      if(rows <= st){ if(side > 0) band(by, ay, Math.max(xa, xb), W, al); else band(by, ay, 0, Math.min(xa, xb), al); continue; }
      for(let y = by; y < ay; y += st){ const y1 = Math.min(ay, y + st), t0 = (ay - y) / rows, t1 = (ay - y1) / rows, x0 = xa + (xb - xa) * t0, x1 = xa + (xb - xa) * t1;
        if(side > 0) band(y, y1, Math.max(x0, x1), W, al); else band(y, y1, 0, Math.min(x0, x1), al); } } }
  // put the noted rows back from VB, once, at the first prop of the frame (the farthest), outside the engine's per-segment clip
  function flush(clipY){ if(FLF === DRAWN) return; FLF = DRAWN; if(BF !== DRAWN || !NB || !VB) return;
    cx.restore(); const e0 = EDGE; EDGE = 1; cx.imageSmoothingEnabled = false;
    try{ for(let k = 0; k < NB; k++){ const o = k * 5, r0 = Math.max(0, Math.round(BND[o] / PX)), r1 = Math.min(cv.height, Math.round(BND[o + 1] / PX)), c0 = Math.max(0, Math.ceil(BND[o + 2] / PX)), c1 = Math.min(cv.width, Math.floor(BND[o + 3] / PX));
        if(r1 <= r0 || c1 <= c0) continue; cx.globalAlpha = BND[o + 4]; cx.drawImage(VB, c0, r0, c1 - c0, r1 - r0, c0 * PX, r0 * PX, (c1 - c0) * PX, (r1 - r0) * PX); } }
    finally { cx.globalAlpha = 1; EDGE = e0; cx.save(); cx.beginPath(); cx.rect(0, 0, W, clipY); cx.clip(); } }

  // ---------------------------------------------------------------- slices along the road (cliff, rail, gallery, crest parapets)
  let BXF = -1, BX = 0; const baseIdx = () => { if(BXF !== DRAWN){ BXF = DRAWN; BX = segAt(position).index; } return BX; };
  const EP = { x:0, y:0, w:0 };
  const strideOf = uw => uw > W * .07 ? 1 : uw > W * .028 ? 2 : uw > W * .011 ? 4 : 8;
  // the crag keeps its facets all the way out: a slice spans 1..8 segments by size, and every slice is the same triangle mesh between
  // world-anchored vertices (a slice starts on a multiple of its span), so the facets only get smaller, never turn into flat bands
  const cliffStride = uw => uw > W * .06 ? 1 : uw > W * .024 ? 2 : uw > W * .01 ? 4 : 8;
  function endPt(i, m){ if(i + m - baseIdx() >= DRAW_N - 2) m = 1; const t = segs[i + m - 1]; if(!t) return null; const p = t.p2.screen; if(!(p.scale > 0) || !(t.p2.camera.z > 0)) return null; EP.x = p.x; EP.y = p.y; EP.w = p.w; return EP; }
  const cliffX = i => { const k = Math.floor(i / 5), f = (i % 5) / 5, a = H1(k * 2.71 + 9), b = H1((k + 1) * 2.71 + 9), v = a + (b - a) * sm(f); return -1.32 - Math.max(0, v - .3) * 1.1; };
  const PTOP = new Float64Array(113);
  const cliffH = i => { const k = Math.floor(i / 6), f = (i % 6) / 6, a = H1(k * 1.37 + 5), b = H1((k + 1) * 1.37 + 5); return 4.6 + 2.4 * (a + (b - a) * f); };
  /* The crag: three tiers, each stepping back from the one below, and each tier a strip of triangles between the segment boundaries, with a
     jittered middle row of vertices (the same vertex from both sides of a boundary, so the mesh is closed). Each triangle takes one of four
     hard granite tones from its true facing toward a key light from the upper right front (the sky and the headlight; the moon is behind the
     wall): low-poly rock in the Sea of Stars / rockslide.md manner, so the wall breaks into blocks and planes in true perspective, never a
     ruled building face. Far slices are one quad per tier. */
  const CV = new Float64Array(18);   // per boundary: [X, h] for bottom, middle, top of tiers 0..2
  function cvert(j, t, lo, ht, out, o){ const b = t === 0 ? lo : t === 1 ? 1.5 + H1(Math.floor(j / 6) * 3.3 + 1) * .8 : 2.9 + H1(Math.floor(j / 7) * 5.1 + 2) * 1.1;
    const tp = t === 2 ? ht : Math.min(ht, (t === 0 ? 1.5 + H1(Math.floor(j / 6) * 3.3 + 1) * .8 : 2.9 + H1(Math.floor(j / 7) * 5.1 + 2) * 1.1) + .15), b2 = Math.max(lo, Math.min(b, tp));
    const X = cliffX(j + t * 17) - t * .85; out[o] = X; out[o + 1] = b2; out[o + 2] = X - .12 - .3 * H1(j * 2.3 + t * 9.1); out[o + 3] = b2 + (tp - b2) * (.35 + .3 * H1(j * 1.7 + t * 4.3)); out[o + 4] = X - .05 * t; out[o + 5] = tp; }
  const LKZ = -.45, LKX = .55, LKH = .7;
  function facet(z0, X0, h0, z1, X1, h1, z2, X2, h2){ const ax = (z1 - z0) / 10, ay = X1 - X0, az = h1 - h0, bx = (z2 - z0) / 10, by = X2 - X0, bz = h2 - h0;
    let nz = ay * bz - az * by, nX = az * bx - ax * bz, nh = ax * by - ay * bx; if(nX < 0){ nz = -nz; nX = -nX; nh = -nh; } const l = Math.hypot(nz, nX, nh) || 1, d = (nz * LKZ + nX * LKX + nh * LKH) / l;
    return d > .78 ? 4 : d > .6 ? 3 : d > .38 ? 2 : 1; }
  const CA = new Float64Array(6), CB = new Float64Array(6), tt = (t, n) => t === 2 && n > 1 ? n - 1 : n;
  function tri(x1, y1, x2, y2, x3, y3, col){ pxPoly(CLX(x1), CLY(y1), CLX(x2), CLY(y2), CLX(x3), CLY(y3), col); }
  const CC4 = 4, CP = new Float64Array(6), CQ = new Float64Array(6);
  /* Round 13: the crag as pixel-art granite (Kurobe's S-ji-kyo walls; Octopath's and Sea of Stars' cliffs for technique). The same
     world-anchored tiers and cell vertices as before, so every shape holds at every distance, but each tier of a cell is now ONE planar face
     (one tone from its true facing, not four triangles), broken the way real granite breaks: a vertical joint at every cell boundary and
     hashed minor joints between, a sheet joint along the tier's jittered middle row, slabs a tone up or down, a warm-violet shadow at each
     tier's foot, wet streaks below the ledges, snow lying in a few gullies, a 1 px moonlit edge on every ledge, dwarf pines standing on the
     ledges and the rim, and talus heaped at the foot. Detail depends on distance (fine joints, streaks and pebbles drop out first; the faces,
     ledges, rim forest and talus stay), and every detail sits on a world segment boundary, so nothing slides or morphs. */
  const RKC = ['#09070f', '#18121f', '#221b2d', '#2d2c42', '#3a405a', '#56627f', '#8c9aba'];   // crack, warm-violet shadow .. cool moonlit lit face, moon edge
  let PI0 = 0, PJ0 = 0; const BXs = new Float64Array(CC4 + 1), BYs = new Float64Array(CC4 + 1), BWs = new Float64Array(CC4 + 1), CV0 = new Float64Array(6);
  function drawCliff(sp, x, y, uw, fog){ const i = sp.k, j0 = i - i % CC4, part = i % CC4 !== 0; if(part && i !== baseIdx() + 1) return; PI0 = i; PJ0 = j0; const pf = (i - j0) / CC4, m = j0 + CC4 - i, e = endPt(i, m); if(!e) return;
    const X0 = -1.32, x0 = x - sp.x * uw, ay = y, by = e.y, ua = uw, ub = e.w, F = c => fc(c, fog * .9), lo = sp.g ? 1.86 : .32;
    const ha = part ? cliffH(j0) + (cliffH(j0 + CC4) - cliffH(j0)) * pf : cliffH(i), hb = cliffH(i + m), j1 = i + m;
    const fine = ua > W * .01, mid = ua > W * .015, near = ua > W * .03, close = ua > W * .05;
    // the screen point of every world boundary this piece spans (0 = its near edge, m = j1)
    let nb = 1; BXs[0] = x0; BYs[0] = ay; BWs[0] = ua; if(mid){ for(let d = 1; d < m; d++){ const p = endPt(i, d); if(!p) break; BXs[d] = p.x; BYs[d] = p.y; BWs[d] = p.w; nb = d + 1; } } if(nb === m || !mid){ BXs[m] = e.x; BYs[m] = by; BWs[m] = ub; }
    const sub = mid && nb === m;
    const SX = (X, w) => w === 0 ? x0 + X * ua : e.x + X * ub, SY = (h, w) => w === 0 ? ay - h * ua : by - h * ub;
    const KX = (X, d) => BXs[d] + X * BWs[d], KY = (h, d) => BYs[d] - h * BWs[d];
    const V = (o, d) => CP[o] + (CB[o] - CP[o]) * ((i + d - j0) / CC4);   // a vertex value on this cell's plane at boundary d
    let px0 = 0, px1 = 0;
    for(let t = 2; t >= 0; t--){ cvert(j0, t, lo, cliffH(j0), CP, 0); cvert(j0 + CC4, t, lo, cliffH(j0 + CC4), CB, 0); for(let k = 0; k < 6; k++) CA[k] = CP[k] + (CB[k] - CP[k]) * pf;
      if(CA[5] <= CA[1] + .02 && CB[5] <= CB[1] + .02) continue;
      let tn = facet(i, CA[0], CA[1], j1, CB[0], CB[1], i, CA[4], CA[5]); if(t === 2 && tn > 1) tn--;
      const xa = SX(CA[4], 0), xb = SX(CB[4], 1), ya = SY(CA[5], 0), yb = SY(CB[5], 1), xa0 = SX(CA[0], 0), xb0 = SX(CB[0], 1), ya0 = SY(CA[1], 0), yb0 = SY(CB[1], 1);
      // the face: one plane, one tone; up close it is cut into three stacked bands (the warm-violet shadow at its foot, the face, the upper
      // face catching the moon a tone up), each band's edge hashed per world boundary so it is ragged, never a ruled stripe
      const th = (CA[5] - CA[1]), tb = (CB[5] - CB[1]);
      if(ua > W * .028 && !KBX.includes('cB')){
        const fa = .12 + .14 * (H1(j0 * 2.9 + t) + (H1((j0 + CC4) * 2.9 + t) - H1(j0 * 2.9 + t)) * pf), fb = .12 + .14 * H1(j1 * 2.9 + t);
        const la = tn < 4 ? .2 + .2 * (H1(j0 * 1.7 + t * 4) + (H1((j0 + CC4) * 1.7 + t * 4) - H1(j0 * 1.7 + t * 4)) * pf) : 0, lb = tn < 4 ? .2 + .2 * H1(j1 * 1.7 + t * 4) : 0;
        const PA = q => SX(CA[0] + (CA[4] - CA[0]) * q, 0), QA = q => SY(CA[1] + th * q, 0), PB = q => SX(CB[0] + (CB[4] - CB[0]) * q, 1), QB = q => SY(CB[1] + tb * q, 1);
        poly(xa0, ya0, xb0, yb0, PB(fb), QB(fb), PA(fa), QA(fa), F(RKC[1]));
        poly(PA(fa), QA(fa), PB(fb), QB(fb), PB(1 - lb), QB(1 - lb), PA(1 - la), QA(1 - la), F(RKC[tn]));
        if(tn < 4) poly(PA(1 - la), QA(1 - la), PB(1 - lb), QB(1 - lb), xb, yb, xa, ya, F(RKC[tn + 1]));
        // slabs between the minor joints a tone up or down (each slab is one world segment), within the face band
        if(sub && near && !KBX.includes('cS')) for(let d = 0; d < m; d++){ const k = i + d, hs = H1(k * 1.31 + t * 7.7); if(hs > .3 && hs < .66) continue; const s = clamp(tn + (hs >= .66 ? 1 : -1), 2, 4); if(s === tn) continue;
          const g0 = d / m, g1 = (d + 1) / m, q0 = fa + (fb - fa) * g0, q1 = fa + (fb - fa) * g1, r0 = 1 - (la + (lb - la) * g0), r1 = 1 - (la + (lb - la) * g1), P = (o, dd, q) => V(o, dd) + (V(o + 4, dd) - V(o, dd)) * q;
          poly(KX(P(0, d, q0), d), KY(P(1, d, q0), d), KX(P(0, d + 1, q1), d + 1), KY(P(1, d + 1, q1), d + 1), KX(P(0, d + 1, r1), d + 1), KY(P(1, d + 1, r1), d + 1), KX(P(0, d, r0), d), KY(P(1, d, r0), d), F(RKC[s])); } }
      else poly(xa0, ya0, xb0, yb0, xb, yb, xa, ya, F(RKC[tn]));
      if(fine && !KBX.includes('cA')){
        // the sheet joint along the jittered middle row
        if(near && H1(j0 * .9 + t * 3.1) > .3){ const ma = SY(CA[3], 0), mb = SY(CB[3], 1); poly(xa0, ma, xb0, mb, xb0, mb + PX, xa0, ma + PX, F(RKC[0])); if(near) poly(xa0, ma + PX, xb0, mb + PX, xb0, mb + 2 * PX, xa0, ma + 2 * PX, F(RKC[Math.min(5, tn + 1)])); }
        if(sub) for(let d = 1; d <= m; d++){ const k = i + d, major = k % CC4 === 0;
          if(!major && (!near || H1(k * 2.3 + t * 5.3) < .75)) continue; if(major && !near && H1(k * .37 + t * 1.9) < .5) continue;   // calmer at mid range: half the joints, in the shadow tone, not black
          const xb_ = KX(V(0, d), d), yb_ = KY(V(1, d), d), xt_ = KX(V(4, d), d), yt_ = KY(V(5, d), d), ln = major ? 1 : .35 + .5 * H1(k * 3.7 + t);
          // snow lying in a high gully at a major joint, instead of the crack
          if(major && t >= 1 && H1(k * .53 + t * 1.7) > .78){ const w2 = .1 * BWs[d], yl = yt_ + (yb_ - yt_) * (.35 + .3 * H1(k * 1.3)); poly(xt_ - w2, yt_, xt_ + w2, yt_, xt_ + PX, yl, xt_, yl, F('#9eabc8')); if(near) poly(xt_ - w2, yt_, xt_ - w2 + PX, yt_, xt_, yl, xt_ - PX, yl, F('#d4def0')); continue; }
          const yl = yt_ + (yb_ - yt_) * ln, xl = xt_ + (xb_ - xt_) * ln;
          // the crack wanders: three legs, each kinked sideways by a hashed amount (world-anchored), the lit lip on its left up close
          let qx = xt_, qy = yt_; const NL = near ? 3 : 1; for(let g = 1; g <= NL; g++){ const f = g / NL, nx = xt_ + (xl - xt_) * f + (g < NL ? (H1(k * 5.9 + t * 2 + g) - .5) * .09 * BWs[d] : 0), ny = yt_ + (yl - yt_) * f;
            const cc = F(RKC[near ? 0 : 1]); R(qx, qy, PX, ny - qy + PX, cc); if(nx !== qx) R(Math.min(qx, nx), ny, Math.abs(nx - qx) + PX, PX, cc); if(close) R(qx - PX, qy + PX, PX, ny - qy, F(RKC[Math.min(5, tn + 1)])); qx = nx; qy = ny; } }
        // wet streaks running down from the ledge
        if(sub && near) for(let d = 0; d < m; d++){ const k = i + d; if(H1(k * 4.1 + t * 2.2) < .7) continue; const f0 = .25 + .4 * H1(k * 6.1 + t), L = .3 + .45 * H1(k * 2.7 + t * 1.3);
          const xt_ = KX(V(4, d), d) + (KX(V(4, d + 1), d + 1) - KX(V(4, d), d)) * f0, yt_ = KY(V(5, d), d) + (KY(V(5, d + 1), d + 1) - KY(V(5, d), d)) * f0, hh = (V(5, d) - V(1, d)) * L * BWs[d], ww = Math.max(PX, .05 * BWs[d]);
          R(xt_, yt_, ww, hh * .85, F('#100e1a')); if(close) R(xt_ + ww, yt_ + PX, PX, hh * .6, F('#46506c')); } }
      // the ledge's moonlit edge
      poly(xa, ya, xb, yb, xb, yb + PX, xa, ya + PX, F(RKC[5]));
      // snow lying on a few high ledges
      if(t >= 1 && H1(j0 * .77 + t) > .8){ const sa = .1 + H1(j0 * 2.1) * .08; poly(xa, ya, xb, yb, xb, yb - sa * ub, xa, ya - sa * ua, F('#b4c0d8')); }
      // dwarf pine and shrub on the ledge: a low dark mat at every distance, single pines standing out of it once they are a few pixels tall
      if(t < 2 && H1(Math.floor(j0 / 4) * 2.9 + t * 5) > .45){ const ba = .12 + H1(i * 1.1 + t) * .14, bb = .12 + H1(j1 * 1.1 + t) * .14; poly(xa, ya, xb, yb, xb, yb - bb * ub, xa, ya - ba * ua, F(FOR[1]));
        if(sub && ua > W * .045) pines(m, t, 1, 1, .6, F); }
      if(close && t === 1 && j0 % 44 === 20){ const h0 = Math.max(lo, CA[1]), wx = xa + (xb - xa) * .5; R(wx, ya, PX, Math.max(PX, (CA[5] - h0) * ua), F(i % 22 === 5 ? '#7c8cae' : RKC[0])); }
      if(t === 0 && !sp.g && ua > W * .018 && !KBX.includes('cT')){ // talus heaped at the foot: fresh broken granite, paler than the wall, with a moonlit top edge and pebbles up close
        const sa = .06 + .22 * (H1(j0 * .37 + 3) + (H1((j0 + CC4) * .37 + 3) - H1(j0 * .37 + 3)) * pf), sb = .06 + .22 * H1(j1 * .37 + 3), Xa = Math.min(X0, CA[0] + .3), Xb = Math.min(X0, CB[0] + .3);
        const qa = SX(Xa, 0), qb = SX(Xb, 1), ga = SY(lo + sa, 0), gb = SY(lo + sb, 1); poly(xa0, ga, xb0, gb, qb, SY(lo, 1), qa, SY(lo, 0), F(RKC[3]));
        poly(xa0, ga, xb0, gb, xb0, gb + PX, xa0, ga + PX, F(RKC[4]));
        if(close && sub) for(let d = 0; d < m; d++){ const k = i + d; for(let q = 0; q < 2; q++){ const f = H1(k * 7.3 + q * 1.7), g = H1(k * 3.9 + q * 5.1) * .8, px = BXs[d] + (BXs[d + 1] - BXs[d]) * f + (CA[0] + .15) * BWs[d], py = BYs[d] + (BYs[d + 1] - BYs[d]) * f - (lo + g * .3) * BWs[d];
          R(snp(px), snp(py), 2 * PX, PX, F(q ? RKC[5] : RKC[1])); } } }
      if(t === 2){ px0 = xa; px1 = xb; } }
    // the rim's forest: a dark mat with a moonlit crown line at every distance; dwarf pines up close
    const fa = .3 + H1(j0 * .71) * .3, fb = .3 + H1(j1 * .71) * .3; poly(px0, ay - ha * ua, px1, by - hb * ub, px1, by - (hb + fb) * ub, px0, ay - (ha + fa) * ua, F(FOR[1]));
    if(ua > W * .012) poly(px0, ay - (ha + fa) * ua, px1, by - (hb + fb) * ub, px1, by - (hb + fb) * ub + PX, px0, ay - (ha + fa) * ua + PX, F(FOR[3]));
    if(sub){ cvert(j0, 2, lo, cliffH(j0), CP, 0); cvert(j0 + CC4, 2, lo, cliffH(j0 + CC4), CB, 0); if(ua > W * .03) pines(m, 2, 1, 1.6, .4, F); }
    if(!sp.g){ // the concrete toe wall along the road and its coping
      const ta = x0 + X0 * ua, tb2 = e.x + X0 * ub;
      poly(ta, ay, tb2, by, tb2, by - .32 * ub, ta, ay - .32 * ua, F(CO[2])); poly(ta, ay - .32 * ua, tb2, by - .32 * ub, tb2, by - .32 * ub + Math.max(PX, ub * .03), ta, ay - .32 * ua + Math.max(PX, ua * .03), F(CO[4]));
      if(near && i % 6 === 0){ const d = Math.max(PX, snp(ua * .04)); R(ta + PX, ay - .18 * ua, d, d, F(CO[0])); } } }
  // pines standing on tier t's top edge at the world boundaries this piece spans: a stacked pixel conifer, dark, moonlit on its right flank
  function pines(m, t, per, hs, thr, F){ if(KBX.includes('cP')) return; for(let d = 0; d < m; d++){ const u = BWs[d]; for(let q = 0; q < per; q++){ const s = (PI0 + d) * 1.9 + t * 3.3 + q * .61; if(H1(s) < thr) continue;
      const f = q / per, X = (CP[4] + (CB[4] - CP[4]) * ((PI0 + d - PJ0) / CC4)) - .1 - f * .5 * H1(s * 1.7), h = CP[5] + (CB[5] - CP[5]) * ((PI0 + d - PJ0) / CC4), ph = (.35 + .45 * H1(s * 2.3)) * hs, sz = ph * u; if(sz < 3 * PX) continue;
      if(sz < 4 * PX) continue; const bx = BXs[d] + X * u, byy = BYs[d] - h * u + PX, hw = Math.max(PX, sz * .3);
      tri(bx - hw, byy, bx + hw, byy, bx, byy - sz * .62, F(FOR[1])); tri(bx - hw * .7, byy - sz * .42, bx + hw * .7, byy - sz * .42, bx, byy - sz, F(FOR[1]));
      if(sz > 6 * PX){ poly(bx, byy - sz, bx + PX, byy - sz + PX, bx + hw * .7, byy - sz * .42, bx + hw * .7 - PX, byy - sz * .42, F(FOR[3])); } } } }
  function drawRail(sp, x, y, uw, fog){ const i = sp.k, m = strideOf(uw); if(i % m) return; const e = endPt(i, m); if(!e) return;
    const X = sp.x, x0 = x - X * uw, ax = x0 + X * uw, bx = e.x + X * e.w, ay = y, by = e.y, ua = uw, ub = e.w, F = c => fc(c, fog * .9);
    // the W-beam (white in moonlight), its lit top lip and dark lower edge
    poly(ax, ay - .2 * ua, bx, by - .2 * ub, bx, by - .33 * ub, ax, ay - .33 * ua, F('#8a90a6'));
    if(ua > W * .015){ poly(ax, ay - .33 * ua, bx, by - .33 * ub, bx, by - .33 * ub + Math.max(PX, ub * .02), ax, ay - .33 * ua + Math.max(PX, ua * .02), F('#d0d6e4')); poly(ax, ay - .2 * ua, bx, by - .2 * ub, bx, by - .2 * ub - Math.max(PX, ub * .015), ax, ay - .2 * ua - Math.max(PX, ua * .015), F(CO[1])); }
    if(ua > W * .02 && i % 4 === 0){ const pw = Math.max(PX, snp(ua * .05)); R(ax - pw / 2, ay - .36 * ua, pw, .36 * ua, F(CO[2])); R(ax - pw / 2, ay - .36 * ua, PX, .36 * ua, F(CO[4])); }
    if(i % 12 === 0 && ua > W * .006){ const d = Math.max(PX, snp(ua * .05)), dy = ay - .42 * ua; R(ax - PX / 2, dy, PX, .1 * ua, F(CO[2]));
      if(d >= PX * 3){ R(ax - d / 2 - PX, dy - d / 2 - PX, d + 2 * PX, d + 2 * PX, F(GR[0])); R(ax - d / 2, dy - d / 2, d, d, DELI); R(ax - d / 2, dy - d / 2, PX, PX, '#fff0c8'); } else R(ax - d / 2, dy - d / 2, d, d, fog > .6 ? F(DELI) : DELI);
      if(ua > W * .05 && fog < .3) halo(ax, dy, ua * .12, '#ff9a30', .25); } }
  // a snow / rock-shed gallery: the back wall, the roof's soffit and beams, the valley pillars on a low wall; the fascia and plates at its mouth
  const HG = 1.36, HT = 1.86, XL = -1.32, XR = 1.32;
  function drawGal(sp, x, y, uw, fog, now){ const i = sp.k, m = strideOf(uw), first = i === sp.a; if(i % m && !first) return; const e = endPt(i, first ? 1 : m); if(!e) return;
    const x0 = x - sp.x * uw, ay = y, by = e.y, ua = uw, ub = e.w, F = c => fc(c, fog * .9), lam = (i % 12) === 6, near = ua > W * .02;
    const aL = x0 + XL * ua, bL = e.x + XL * ub, aR = x0 + XR * ua, bR = e.x + XR * ub, lit = Math.max(0, 1 - Math.min(i % 12 >= 6 ? i % 12 - 6 : 6 - i % 12, 12) / 4);
    // the back wall (concrete, panel joints), its lamp
    poly(aL, ay, bL, by, bL, by - HG * ub, aL, ay - HG * ua, F(lit > .5 ? CO[3] : CO[2]));
    if(near && i % 4 === 0) R(aL, ay - HG * ua, PX, HG * ua, F(CO[1]));
    // the soffit (seen from below), warmer under each lamp
    poly(aL, ay - HG * ua, aR, ay - HG * ua, bR, by - HG * ub, bL, by - HG * ub, F(lit > .5 ? '#2a2422' : CO[1]));
    // the transverse beam's face, every 4 segments, lit along its lower edge
    if(i % 4 === 0 && m <= 4){ const t = .16 * ua; R(aL, ay - HG * ua, aR - aL, t, F(CO[3])); R(aL, ay - HG * ua + t - PX, aR - aL, PX, F(lit > .4 ? '#7a6450' : CO[4])); }
    // the valley side: a low wall with a lit coping, then the pillars
    poly(aR, ay, bR, by, bR, by - .3 * ub, aR, ay - .3 * ua, F(CO[2])); poly(aR, ay - .3 * ua, bR, by - .3 * ub, bR, by - .3 * ub + Math.max(PX, ub * .03), aR, ay - .3 * ua + Math.max(PX, ua * .03), F(CO[4]));
    if(i % 4 === 0 || first){ const pw = Math.max(PX, .16 * ua); if(near){ const mx = aR + (bR - aR) * .5 / m, my = ay + (by - ay) * .5 / m, mu = ua + (ub - ua) * .5 / m; poly(aR, ay, mx, my, mx, my - HG * mu, aR, ay - HG * ua, F(lit > .4 ? '#5a4c44' : CO[4])); }
      R(aR, ay - HG * ua, pw, HG * ua, F(CO[3])); R(aR, ay - HG * ua, PX, HG * ua, F(CO[5])); if(near){ const hw = .28 * ua; tri(aR, ay - HG * ua, aR - hw, ay - HG * ua, aR, ay - (HG - .32) * ua, F(CO[3])); } if(pw > PX * 3) R(aR + pw - PX, ay - HG * ua, PX, HG * ua, F(CO[1])); }
    if(lam){ const lx = aL + Math.max(PX, ua * .06), ly = ay - 1.08 * ua, lw = Math.max(PX, snp(ua * .1)), lh = Math.max(PX, snp(ua * .04)); R(lx - PX, ly - PX, lw + 2 * PX, lh + 2 * PX, F(CO[0])); R(lx, ly, lw, lh, fog > .6 ? F(SOD) : SOD); if(fog < .7) halo(lx, ly, Math.min(ua * .7, H * .12), '#ffa040', .35 * (1 - fog)); }
    // the mouth: the fascia band across the road with its dentils and kanji plates, the rubble and forest of the slope on its roof
    if(first){ const fy = ay - HT * ua, fh = (HT - HG) * ua, fx0 = x0 + (XL - .3) * ua, fx1 = x0 + (XR + .3) * ua;
      R(fx0, fy - .35 * ua, fx1 - fx0, .38 * ua, F(FOR[1])); R(fx0, fy - .35 * ua, fx1 - fx0, PX, F(FOR[3]));
      if(ua > W * .03){ cx.fillStyle = F('#3a4458'); const st = Math.max(PX * 2, snp(ua * .12)); for(let xx = fx0; xx < fx1; xx += st){ for(let k = 0; k < .35 * ua; k += PX){ pxRect(xx + k * .6, fy - .35 * ua + k, PX, PX); pxRect(xx + st - k * .6, fy - .35 * ua + k, PX, PX); } } }   // (the rockfall netting draped over the slope on the roof)
      R(fx0, fy, fx1 - fx0, fh, F(CO[3])); R(fx0, fy, fx1 - fx0, Math.max(PX, ua * .03), F(CO[5])); R(fx0, fy + fh - Math.max(PX, ua * .02), fx1 - fx0, Math.max(PX, ua * .02), F(CO[1]));
      if(ua > W * .03){ const dw = .12 * ua, dh = .09 * ua; for(let k = 0; k < 13; k++){ const dx = fx0 + (k + .5) / 13 * (fx1 - fx0) - dw / 2; R(dx, fy + fh, dw, dh, F(CO[2])); R(dx, fy + fh + dh - PX, dw, PX, F(CO[0])); } }
      const nm = ['黒部第一洞門', '黒部第二洞門', '黒部第三洞門'][sp.n % 3], ts = .27 * ua, gap = .44 * ua, n = nm.length, tx0 = x0 - (n - 1) * gap / 2;
      if(ts >= PX * 2) for(let k = 0; k < n; k++){ const tx = tx0 + k * gap - ts / 2, ty = fy + (fh - ts) / 2; R(tx - PX, ty - PX, ts + 2 * PX, ts + 2 * PX, F(CO[5])); R(tx, ty, ts, ts, F('#161822'));
        const gl = GLY[nm[k]]; if(gl && ts >= PX * 8){ const sc = Math.max(1, Math.floor(ts / PX / 13)); cx.imageSmoothingEnabled = false; cx.globalAlpha = 1 - fog * .7; cx.drawImage(gl, snp(tx + (ts - 12 * sc * PX) / 2), snp(ty + (ts - 13 * sc * PX) / 2), 12 * sc * PX, 14 * sc * PX); cx.globalAlpha = 1; } } } }
  // the crest: parapets both sides, lamps set in their inner faces every 6 segments, lamp standards every 24
  function drawCrest(sp, x, y, uw, fog, now){ const i = sp.k, m = strideOf(uw); if(i % m) return; const e = endPt(i, m); if(!e) return;
    const X = sp.x, sd = X > 0 ? 1 : -1, x0 = x - X * uw, ax = x0 + X * uw, bx = e.x + X * e.w, ay = y, by = e.y, ua = uw, ub = e.w, F = c => fc(c, fog * .85);
    const L = visitOf(i), fon = lampOn(L), hw = sd > 0 ? .15 : .12;
    poly(ax, ay, bx, by, bx, by - hw * ub, ax, ay - hw * ua, F(CO[3]));
    poly(ax, ay - hw * ua, bx, by - hw * ub, bx, by - hw * ub - Math.max(PX, ub * .035), ax, ay - hw * ua - Math.max(PX, ua * .035), F(CO[6]));
    // the top rail on short posts (pale blue downstream, as in the photographs; grey upstream)
    const rh = hw + .08, rc = sd > 0 ? CREL : '#8a96aa';
    if(ua > W * .01){ poly(ax, ay - rh * ua, bx, by - rh * ub, bx, by - rh * ub + Math.max(PX, ub * .018), ax, ay - rh * ua + Math.max(PX, ua * .018), F(rc));
      if(i % 3 === 0 && ua > W * .025) R(ax - PX / 2, ay - rh * ua, PX, (rh - hw) * ua, F(rc)); }
    if(i % 6 === 0 && fon){ const lw = Math.max(PX, snp(ua * .045)), lh = Math.max(PX, snp(ua * .022)), lx = ax - (sd > 0 ? lw + PX : -PX), ly = ay - .09 * ua;
      if(lw >= PX * 2) R(lx - PX, ly - PX, lw + 2 * PX, lh + 2 * PX, F(CO[1])); R(lx, ly, lw, lh, fog > .6 ? F(WARM) : WARM); if(lh >= PX * 3) R(lx, ly, lw, PX, WARMH); if(fog < .75) halo(lx + lw / 2, ay - .02 * ua, Math.min(ua * .5, H * .1), '#ffc070', .3 * (1 - fog)); }
    if(i % 24 === (sd > 0 ? 12 : 0) && ua > W * .004){ const ph = 1.1, pw = Math.max(PX, snp(ua * .035)), px = ax + sd * Math.max(PX, ua * .04), top = ay - ph * ua;
      R(px - pw / 2, top, pw, (ph - hw) * ua, F(CO[1])); if(pw > PX) R(px - pw / 2, top, PX, (ph - hw) * ua, F(CO[4]));
      const aw = .2 * ua; R(sd > 0 ? px - aw : px, top, aw, Math.max(PX, ua * .025), F(CO[2]));
      const hx0 = px - sd * aw, hw2 = Math.max(PX, snp(ua * .09)), hh = Math.max(PX, snp(ua * .045)); R(hx0 - hw2 / 2, top, hw2, hh, F(CO[0])); if(fon){ R(hx0 - hw2 / 2 + (hw2 > 2 * PX ? PX : 0), top + hh, Math.max(PX, hw2 - (hw2 > 2 * PX ? 2 * PX : 0)), PX, WARMH); if(fog < .8) halo(hx0, top + hh, Math.min(ua * .9, H * .14), '#ffd8a0', .32 * (1 - fog)); } } }

  // ---------------------------------------------------------------- the bores: the Kanden tunnel, the west tunnel, the gorge's rock tunnel
  /* One ring per segment. Each ring paints everything outside its horseshoe opening (as far out as its own size) in the lining's tones, so
     nearer rings overpaint farther ones outside their larger openings and the band between two openings is the tube's wall (the method of
     env/tunnels.js). Seen from outside, ring 0 is the portal: a granite mountain face round a pale concrete hood, the name board, two
     floodlights. Inside: a line of fluorescent tubes along the crown and two trolley wires (the Kanden tunnel's trolleybuses). */
  const OW = 1.36, WT = .82, CH = 1.52, NS = 12, HSB = [], OWS = []; for(let k = 0; k <= NS; k++) HSB.push(WT + (CH - WT) * k / NS); for(let k = 0; k < NS; k++){ const hm = (k + .5) / NS; OWS.push(OW * Math.sqrt(Math.max(0, 1 - hm * hm))); }
  function openW(h){ if(h < WT) return OW; for(let k = 0; k < NS; k++) if(h < HSB[k + 1]) return OWS[k]; return 0; }
  function ringFill(x, y, u, FW, FT, colW, colH, colC, colK){ const xl = x - FW * u, xr = x + FW * u, qt = y - FT * u;
    R(xl, qt, xr - xl, (FT - CH) * u, colC);
    for(let k = 0; k < NS; k++){ const ya = y - HSB[k + 1] * u, yb = y - HSB[k] * u, w = OWS[k] * u; cx.fillStyle = k < NS / 2 ? colH : colC; pxRect(xl, ya, x - w - xl, yb - ya); pxRect(x + w, ya, xr - x - w, yb - ya); }
    cx.fillStyle = colW; pxRect(xl, y - WT * u, x - OW * u - xl, (WT - .14) * u); pxRect(x + OW * u, y - WT * u, xr - x - OW * u, (WT - .14) * u);
    cx.fillStyle = colK; pxRect(xl, y - .14 * u, x - OW * u - xl, .14 * u + PX); pxRect(x + OW * u, y - .14 * u, xr - x - OW * u, .14 * u + PX); }
  const PLATE = ['関電トンネル', '黒部トンネル', '仙人谷トンネル', '黒部トンネル'];
  function drawTunnel(s, x, y, uw, fog, now, fogc){ const i = s.index, L = lay(zoneOfSeg(i)), B = boreOf(L, i); if(!B) return; const k = i - B.a, cs = Math.floor(position / SEG), out = cs < B.a, F = c => fc(c, fog * .8);
    if(out && k === 0){ portal(B, x, y, uw, fog, now); return; }
    const far = uw < W * .02, seam = i % 4 === 0, mouthK = Math.min(k, B.b - 1 - i + B.a), edgeL = mouthK < 5 ? (5 - mouthK) / 5 : 0;
    const t = seam ? 1 : 0, cW = F(LIN[3 - t]), cH = F(LIN[2 - t]), cC = F(LIN[1]), cK = F(LIN[5 - t]);
    // (seen from outside, a ring's frame reaches only the hood's outline, so nothing shows round the portal's shortened spur)
    if(out) ringFill(x, y, uw, OW + .36, CH + .34, cW, cH, cC, cK); else ringFill(x, y, uw, 4.6, 3.8, cW, cH, cC, cK);
    if(i === B.b - 1 && (out || ((B.kind === 0 || B.kind === 3) && cs < B.a + 6))){ cx.fillStyle = F(LIN[0]); pxRect(x - OW * uw, y - WT * uw, 2 * OW * uw, WT * uw); for(let k2 = 0; k2 < NS; k2++){ const w = OWS[k2] * uw; pxRect(x - w, y - HSB[k2 + 1] * uw, 2 * w, (HSB[k2 + 1] - HSB[k2]) * uw); } }
    if(!far){ // the drainage channel along each wall foot
      cx.fillStyle = F(LIN[0]); pxRect(x - OW * uw - PX, y - .16 * uw, PX, .16 * uw); pxRect(x + OW * uw, y - .16 * uw, PX, .16 * uw);
      // sodium luminaires high on both walls every 6 rings, their warm light on the lining
      if(i % 6 === 0){ const lw = Math.max(PX, snp(uw * .12)), lh = Math.max(PX, snp(uw * .04)); for(const sd of [-1, 1]){ const lx = x + sd * (OW - .12) * uw - lw / 2, ly = y - (WT + .12) * uw; R(lx - PX, ly - PX, lw + 2 * PX, lh + 2 * PX, F(LIN[0])); R(lx, ly, lw, lh, fog > .6 ? F(SOD) : SOD); halo(lx + lw / 2, ly, Math.min(uw * .6, H * .1), '#ffa040', .22 * (1 - fog)); } }
      // a pair of jet fans under the crown every 40 rings
      if(k % 40 === 20 && uw > W * .03){ for(const sd of [-1, 1]){ const fx = x + sd * .55 * uw, fy = y - (CH - .28) * uw, fw = .36 * uw, fh = .22 * uw; R(fx - fw / 2, fy, fw, fh, F(LIN[1])); R(fx - fw / 2, fy, fw, PX, F(LIN[4])); R(fx - fw * .3, fy + fh * .25, fw * .6, fh * .5, F(LIN[0])); R(fx - PX / 2, fy + fh * .45, PX, PX, F(LIN[3])); } }
      // emergency signs: a green box low on the left wall every 40 rings, with its white figure
      if(k % 40 === 6 && uw > W * .03){ const sx = x - OW * uw - .02 * uw, sy = y - .5 * uw, sw = Math.max(PX * 2, snp(uw * .14)), sh = Math.max(PX * 2, snp(uw * .1)); R(sx - sw, sy, sw, sh, '#2aa060'); R(sx - sw + PX, sy + PX, Math.max(PX, sw / 3), Math.max(PX, sh - 2 * PX), '#e8f4ec'); halo(sx - sw / 2, sy + sh / 2, uw * .2, '#2aff6a', .15); } }
    // the tube line along the crown (a gap every third ring), and its light on the crown
    { const t2 = segs[i + 1], ty = y - (CH - .05) * uw; if(i % 4 !== 3 && t2 && t2.p1.screen.scale > 0 && t2.p1.camera.z > 0){ const q = t2.p1.screen, qy = q.y - (CH - .05) * q.w; poly(x - .2 * uw, ty, x + .2 * uw, ty, q.x + .2 * q.w, qy, q.x - .2 * q.w, qy, fog > .7 ? F(TUBE) : TUBE); }
      if(!far && i % 8 === 0) halo(x, ty + PX, Math.min(uw * .9, H * .14), '#bfe4ff', .2 * (1 - fog)); }
    // trolley wires to the next ring
    if(B.kind === 0 && uw > W * .01){ const t2 = segs[i + 1]; if(t2 && t2.p1.screen.scale > 0 && t2.p1.camera.z > 0){ const q = t2.p1.screen; for(const wx of [-.42, .42]) poly(x + wx * uw, y - 1.24 * uw, q.x + wx * q.w, q.y - 1.24 * q.w, q.x + wx * q.w, q.y - 1.24 * q.w + PX, x + wx * uw, y - 1.24 * uw + PX, F('#0c0a0a')); } }
    // the mouth's rim of night light (cool, from the floodlit dam or the moon)
    if(edgeL > 0 && !far){ cx.fillStyle = rgbaA('150,176,224', .5 * edgeL); pxRect(x - OW * uw, y - WT * uw, PX, WT * uw); pxRect(x + OW * uw - PX, y - WT * uw, PX, WT * uw); } }
  // a camera-facing rock facet: its tone from its normal (turned toward the camera) to a key light from the upper left front
  function triC(x, y, u, x0, h0, z0, x1, h1, z1, x2, h2, z2, F){ const ax = x1 - x0, ay = h1 - h0, az = z1 - z0, bx = x2 - x0, by = h2 - h0, bz = z2 - z0;
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; if(nz > 0){ nx = -nx; ny = -ny; nz = -nz; } const l = Math.hypot(nx, ny, nz) || 1, d = (nx * -.45 + ny * .7 + nz * -.5) / l;
    return d > .78 ? 4 : d > .62 ? 3 : d > .46 ? 2 : 1; }
  function portal(B, x, y, u, fog, now){ const F = c => fc(c, fog * .8), id = B.a;
    if(B.kind === 0){ const pw = OW + .95, lt = CH + .34, lh = .55;
      R(x - pw * u, y - lt * u, (pw - OW - .36) * u, lt * u, F(CO[2])); R(x + (OW + .36) * u, y - lt * u, (pw - OW - .36) * u, lt * u, F(CO[2]));
      R(x - pw * u, y - lt * u, PX, lt * u, F(CO[5])); R(x + pw * u - PX, y - lt * u, PX, lt * u, F(CO[1]));
      R(x - (pw + .15) * u, y - (lt + lh) * u, 2 * (pw + .15) * u, lh * u, F(CO[3])); R(x - (pw + .15) * u, y - (lt + lh) * u, 2 * (pw + .15) * u, Math.max(PX, u * .04), F(CO[6])); R(x - (pw + .15) * u, y - lt * u - Math.max(PX, u * .03), 2 * (pw + .15) * u, Math.max(PX, u * .03), F(CO[0]));
      ringFill(x, y, u, OW + .36, CH + .34, F(CO[4]), F(CO[4]), F(CO[4]), F(CO[3]));
      plate(B, x, y - (lt + lh + .1) * u, u, fog); lamps2(x, y, u, fog, lt); return; }
    // the spur the bore goes into: one granite mass with a ragged crest, highest over the bore, forest on top with a moonlit rim
    const cw = Math.max(PX, snp(u * .25)), n = 56, top = PTOP;
    const gorge = B.kind !== 1; for(let k = -n; k <= n; k++){ const xk = k * .25, f = Math.min(1, Math.abs(xk) / 14), g = Math.floor((k + 400) / 3), j = H1(g * 1.7 + id) * .6 + H1(k * .9 + id) * .12;
      top[k + n] = gorge && xk > 0 ? (xk > 2.2 ? 0 : 2.2 + (1 - xk / 2.2) * .6 + j * .3) : ((gorge ? 2.6 + 4.4 * Math.pow(1 - f * f, 1.1) : 2.3 + 3.6 * Math.pow(1 - f * f, 1.4)) + j) * Math.min(1, Math.max(0, (14 - Math.abs(xk)) / 3.5)); }   // round 13: the mass slopes away to nothing at its ends (no cut-off vertical edge)
    // the rock face as a triangle mesh like the cliff's: columns of a jittered lower and upper row, each triangle in one of four granite tones
    // from its facing (a jittered depth per vertex) to the key light; over the hood the face starts at the hood's top
    const st = 2, vz = (k, r) => (H1(Math.floor((k + 400) / 6) * 3.1 + r * 7.7 + id) - .5) * (r === 1 ? .9 : .4);
    const bot = k => Math.abs(k * .25) < OW + .36 ? CH + .34 : 0, mid = k => { const b = bot(k), t = top[k + n]; return b + (t - b) * (.38 + .28 * H1(k * 1.7 + id)); };
    for(let k = -n; k + st <= n; k += st){ const k2 = k + st, ta = top[k + n], tb = top[k2 + n]; if(ta <= 0 && tb <= 0) continue; const xa = x + k * .25 * u, xb = x + k2 * .25 * u; if(xa > W + PX || xb < -PX) continue;
      const Xa = k * .25, Xb = k2 * .25, ba = bot(k), bb = bot(k2), ma = Math.max(ba, Math.min(mid(k), Math.max(ta, ba))), mb = Math.max(bb, Math.min(mid(k2), Math.max(tb, bb))), Ta = Math.max(ta, ma), Tb = Math.max(tb, mb);
      for(let r = 0; r < 2; r++){ const h0a = r ? ma : ba, h0b = r ? mb : bb, h1a = r ? Ta : ma, h1b = r ? Tb : mb; if(h1a <= h0a && h1b <= h0b) continue;
        const za0 = vz(k, r), zb0 = vz(k2, r), zb1 = vz(k2, r + 1), za1 = vz(k, r + 1);
        // round 13: each column-row is one planar face in the crag's granite ramp (slabs of three columns share a depth, so a joint is a step)
        const tn = triC(x, y, u, Xa, h0a, za0, Xb, h0b, zb0, Xa, h1a, za1, F); poly(xa, y - h0a * u, xb, y - h0b * u, xb, y - h1b * u, xa, y - h1a * u, F(RKC[Math.min(4, tn + 1)]));
        if(r === 0){ poly(xa, y - h0a * u, xb, y - h0b * u, xb, y - (h0b + (h1b - h0b) * .18) * u, xa, y - (h0a + (h1a - h0a) * .18) * u, F(RKC[1])); }
        else if(u > W * .008 && H1(k * .7 + id) > .35) poly(xa, y - h0a * u, xb, y - h0b * u, xb, y - h0b * u + PX, xa, y - h0a * u + PX, F(RKC[0])); }
      if(u > W * .008 && k % 6 === 0 && ta > 0){ const ln = .5 + .5 * H1(k * 2.3 + id); let qx = xa, qy = y - Math.max(ta, ba) * u; const yl = qy + (Math.max(ta, ba) - ba) * u * ln;
        for(let g = 1; g <= 3; g++){ const nx = xa + (g < 3 ? (H1(k * 5.9 + g + id) - .5) * .12 * u : 0), ny = qy + (yl - (y - Math.max(ta, ba) * u)) / 3; poly(qx, qy, qx + PX, qy, nx + PX, ny, nx, ny, F(RKC[0])); if(u > W * .02) poly(qx - PX, qy + PX, qx, qy + PX, nx, ny, nx - PX, ny, F(RKC[5])); qx = nx; qy = ny; } }
      // the crest of the spur: a moonlit lip and forest on top
      if(ta > 0 && tb > 0){ poly(xa, y - ta * u, xb, y - tb * u, xb, y - tb * u + Math.max(PX, u * .05), xa, y - ta * u + Math.max(PX, u * .05), F(GR[5])); const fa = .25 + H1(k * 3.1 + id) * .45, fb = .25 + H1(k2 * 3.1 + id) * .45;
        poly(xa, y - ta * u, xb, y - tb * u, xb, y - (tb + fb) * u, xa, y - (ta + fa) * u, F(FOR[1])); poly(xa, y - (ta + fa) * u, xb, y - (tb + fb) * u, xb, y - (tb + fb) * u + PX, xa, y - (ta + fa) * u + PX, F(FOR[3])); } }
    // snow lying in a hollow high on the spur
    // round 13: the rockfall net is gone (as a screen hatch it read as a chain-link fence, as cables as wires floating over the rock)
    { const sx = x - 3.5 * u, sy = y - (top[Math.round(-3.5 / .25) + n] - .5) * u; if(top[Math.round(-3.5 / .25) + n] > 1) { R(sx - .9 * u, sy, 1.8 * u, Math.max(PX, .18 * u), F('#b4c0d8')); R(sx - .5 * u, sy - Math.max(PX, .1 * u), u, Math.max(PX, .1 * u), F('#d4dcea')); } }
    // the hood: pale concrete round the opening, its top edge catching the floodlights
    ringFill(x, y, u, OW + .36, CH + .34, F(CO[4]), F(CO[4]), F(CO[4]), F(CO[3]));
    if(u > W * .015){ cx.fillStyle = F(CO[6]); pxRect(x - (OW + .36) * u, y - (CH + .34) * u, 2 * (OW + .36) * u, PX); }
    plate(B, x, y - (CH + .6) * u, u, fog); lamps2(x, y, u, fog, CH);
    if(fog < .9){ cx.fillStyle = rgbaA('255,190,120', .1 * (1 - fog)); pxRect(x - OW * u, y - WT * u, 2 * OW * u, WT * u); } }
  // the name board, lit warm, one glyph per square; its top at `top`
  function plate(B, x, top, u, fog){ const F = c => fc(c, fog * .8);
    const nm = PLATE[B.kind], ts = .26 * u, nn = nm.length, gap = .3 * u, py = top;
    R(x - (nn * gap) / 2 - PX * 2, py - PX * 2, nn * gap + PX * 4, ts + PX * 4, F(CO[5])); R(x - (nn * gap) / 2, py, nn * gap, ts, F('#141016'));
    if(ts >= PX * 8) for(let k = 0; k < nn; k++){ const gl = GLY[nm[k]]; if(!gl) continue; const sc = Math.max(1, Math.floor(ts / PX / 14)); cx.imageSmoothingEnabled = false; cx.globalAlpha = 1 - fog * .6; cx.drawImage(gl, snp(x - (nn * gap) / 2 + k * gap + (gap - 12 * sc * PX) / 2), snp(py + (ts - 14 * sc * PX) / 2), 12 * sc * PX, 14 * sc * PX); cx.globalAlpha = 1; }
    if(fog < .8) halo(x, py + ts / 2, Math.min(nn * gap, H * .2), '#ffb060', .14 * (1 - fog));
 }
  // floodlights over a mouth, aimed at it (lt: the height they hang at)
  function lamps2(x, y, u, fog, lt){ const F = c => fc(c, fog * .8);
    for(const sd of [-1, 1]){ const lx = x + sd * (OW + .1) * u, ly = y - (lt + .22) * u, s = Math.max(PX, snp(u * .12)); R(lx - s, ly, s * 2, Math.max(PX, s / 2), F(CO[0])); R(lx - s + PX, ly + Math.max(PX, s / 2), Math.max(PX, s * 2 - 2 * PX), PX, '#fff2d0'); if(fog < .85) halo(lx, ly + s / 2, Math.min(u * .9, H * .14), '#ffe0b0', .28 * (1 - fog)); }
 }
  // ---------------------------------------------------------------- props: one marker per segment (it puts the void back), then the slices
  function draw(sp, x, y, uw, fog, now, sk){ const t = sp.type; if(KBX && KBX.includes('t' + t)) return;
    if(t === 'mk'){ const s = segs[sp.k]; flush(s && s.clip !== undefined ? s.clip : H); return; }
    if(t === 'cliff') return drawCliff(sp, x, y, uw, fog); if(t === 'rail') return drawRail(sp, x, y, uw, fog); if(t === 'casc') return drawCasc(sp, uw, fog, now);
    if(t === 'gant'){ if(uw < 2 || fog > .85) return; const w = uw * 1.2, h = uw * 1.5, F = c => fc(c, fog * .8), e = Math.max(PX, snp(uw * .03));
      R(x - w - uw * .04, y - h, e, h, F(CO[5])); R(x + w - uw * .04, y - h, e, h, F(CO[4])); R(x - w - uw * .1, y - h - uw * .08, (w + uw * .1) * 2, e, F(CO[6]));
      R(x - w - uw * .1, y - h + uw * .02, (w + uw * .1) * 2, e, F(CO[3])); for(const sd of [-1, 1]) R(x + sd * w - uw * .08, y - uw * .06, uw * .16, uw * .06, F(CO[2])); return; }
    if(t === 'gal') return drawGal(sp, x, y, uw, fog, now); if(t === 'cL' || t === 'cR') return drawCrest(sp, x, y, uw, fog, now); if(t === 'mist') return drawMist(sp, x, y, uw, fog, now); if(t === 'lpost'){ if(uw < 1.5 || fog > .9) return; const F = c => fc(c, fog * .85), h = 1.15 * uw, pw = Math.max(PX, snp(uw * .03)); R(x - pw / 2, y - h, pw, h, F(CO[2])); R(x - pw / 2, y - h, PX, h, F(CO[5])); R(x - .18 * uw, y - h, .18 * uw, Math.max(PX, uw * .025), F(CO[2]));
      const lw = Math.max(PX, snp(uw * .08)); R(x - .18 * uw - lw / 2, y - h, lw, Math.max(PX, snp(uw * .03)), fog > .6 ? F(SOD) : SOD); halo(x - .18 * uw, y - h + uw * .03, Math.min(uw * .9, H * .12), '#ffa848', .3 * (1 - fog)); return; }
    if(t === 'bay'){ if(uw < 3 || fog > .7) return; const F = c => fc(c, fog * .85); R(x - .3 * uw, y - .04 * uw, .6 * uw, .04 * uw, F(CO[3]));
      if((sp.k - sp.a) % 6 === 2){ for(let p2 = 0; p2 < 2; p2++){ const fx = x + (p2 - .5) * .22 * uw, fh = (.42 + H1(sp.k + p2) * .06) * uw, fw = Math.max(PX, snp(uw * .07)); R(fx - fw / 2, y - fh, fw, fh * .72, F('#141620')); R(fx - fw * .4, y - fh - fw * .9, fw * .8, fw * .9, F('#1a1c28')); R(fx + fw / 2 - PX, y - fh, PX, fh * .7, F('#5a6a90')); } } return; }
    if(t === 'house') return drawHouse(sp, x, y, uw, fog); if(t === 'deck') return drawDeck(sp, x, y, uw, fog); if(t === 'mon') return drawMon(sp, x, y, uw, fog); if(t === 'intake') return drawIntake(sp, x, y, uw, fog); }
  /* The gate house on the crest's downstream side (Kurobe's crest has its low control buildings): a concrete box beyond the parapet, its long
     face toward the road with a band of warm windows and a darker plinth, a flat roof with a moonlit coping, its end facing you at the first
     segment; a projected slice per segment, crisp near. */
  function drawHouse(sp, x, y, uw, fog){ const i = sp.k, e = endPt(i, 1); if(!e) return; const F = c => fc(c, fog * .85), X = 1.5, Hh = 1.05, x0 = x - sp.x * uw, ax = x0 + X * uw, bx = e.x + X * e.w, ay = y, by = e.y, ua = uw, ub = e.w;
    poly(ax, ay, bx, by, bx, by - Hh * ub, ax, ay - Hh * ua, F(CO[3])); poly(ax, ay, bx, by, bx, by - .18 * ub, ax, ay - .18 * ua, F(CO[1]));
    poly(ax, ay - Hh * ua, bx, by - Hh * ub, bx, by - Hh * ub + Math.max(PX, ub * .04), ax, ay - Hh * ua + Math.max(PX, ua * .04), F(CO[6]));
    if(i % 2 === 0 && ua > W * .01){ const wy0 = .45, wy1 = .78, mx = ax + (bx - ax) * .2, nx = ax + (bx - ax) * .8, my = ay + (by - ay) * .2, ny = ay + (by - ay) * .8, mu = ua + (ub - ua) * .2, nu = ua + (ub - ua) * .8;
      poly(mx, my - wy0 * mu, nx, ny - wy0 * nu, nx, ny - wy1 * nu, mx, my - wy1 * mu, H1(i * 3.1) > .3 ? WARM : F('#2a2c38')); }
    if(i === sp.a){ const xe = x0 + (X + 1.2) * ua; R(ax, ay - Hh * ua, xe - ax, Hh * ua, F(CO[4])); R(ax, ay - Hh * ua, xe - ax, Math.max(PX, ua * .04), F(CO[6])); if(ua > W * .02){ const dw = (xe - ax) * .16, dx = ax + (xe - ax) * .42; R(dx - PX, ay - .5 * ua - PX, dw + 2 * PX, .5 * ua + PX, F(CO[1])); R(dx, ay - .5 * ua, dw, .5 * ua, '#c8955a'); R(dx, ay - .5 * ua, dw, PX, WARMH); R(dx + dw * .5, ay - .5 * ua, PX, .5 * ua, F('#7a5434')); }   // round 13: a framed door at the foot, not a lit square on the wall
      halo(ax + (xe - ax) * .5, ay - .3 * ua, Math.min(ua * .6, H * .08), '#ffc070', .16 * (1 - fog)); } }
  /* The observation terrace at the crest's east end (the real crest has its lookout terrace and stairs at the abutment): a deck cantilevered
     out over the drop beyond the parapet, its railing of thin posts and a pale top rail, a flat canopy on slim columns, warm lamps under the
     canopy pooling on the deck, people-height glass panels catching the floodlight. Projected slices, crisp near. */
  function drawDeck(sp, x, y, uw, fog){ const i = sp.k, e = endPt(i, 1); if(!e) return; const F = c => fc(c, fog * .85), x0 = x - sp.x * uw, ua = uw, ub = e.w, ay = y, by = e.y;
    const X0 = 1.45, X1 = 3.1, hD = -.05, hR = .45, hC = 1.15, at = (X, h, w) => w ? [e.x + X * ub, by - h * ub] : [x0 + X * ua, ay - h * ua];
    const p = (Xa, ha, Xb, hb, col) => { const A = at(Xa, ha, 0), B = at(Xa, ha, 1), C2 = at(Xb, hb, 1), D = at(Xb, hb, 0); poly(A[0], A[1], B[0], B[1], C2[0], C2[1], D[0], D[1], col); };
    p(X0, hD, X1, hD, F(i % 2 ? CO[3] : CO[4])); p(X1, hD, X1, hD - .25, F(CO[1]));
    p(X0 + .1, hC, X1 + .1, hC, F(CO[2])); p(X1 + .1, hC, X1 + .1, hC - .08, F(CO[6]));
    { const A = at(X1, hR, 0), B = at(X1, hR, 1); poly(A[0], A[1], B[0], B[1], B[0], B[1] + Math.max(PX, ub * .025), A[0], A[1] + Math.max(PX, ua * .025), F('#9ab0c4')); }
    if(i % 2 === 0 && ua > W * .01){ const A = at(X1, hD, 0), T = at(X1, hR, 0); R(A[0], T[1], PX, A[1] - T[1], F(CO[5])); }
    if(i % 4 === 0){ const A = at(X1, hD, 0), T = at(X1, hC, 0), w = Math.max(PX, snp(ua * .05)); R(A[0] - w / 2, T[1], w, A[1] - T[1], F(CO[3])); const L = at(X0 + .8, hC - .1, 0); R(L[0] - w, L[1], w * 2, Math.max(PX, w / 2), WARM); halo(L[0], ay - .1 * ua, Math.min(ua * .9, H * .12), '#ffc070', .28 * (1 - fog)); }
    if(i === sp.a){ const A = at(X0, hD, 0), B = at(X1 + .1, hC, 0); R(A[0], B[1], B[0] - A[0], Math.max(PX, ua * .05), F(CO[6])); R(B[0] - Math.max(PX, ua * .05), B[1], Math.max(PX, ua * .05), A[1] - B[1], F(CO[4])); } }
  // the commemorative monument on the reservoir side: a dark stone slab on a plinth, a pale plaque with 黒部ダム, lit warm from a low lamp
  function drawMon(sp, x, y, uw, fog){ if(uw < 2 || fog > .8) return; const F = c => fc(c, fog * .85), w = .5 * uw, h = .7 * uw;
    R(x - w * .7, y - .1 * uw, w * 1.4, .1 * uw, F(GR[3])); R(x - w / 2, y - .1 * uw - h, w, h, F(GR[1])); R(x - w / 2, y - .1 * uw - h, Math.max(PX, w * .12), h, F(GR[4]));
    const pw = w * .7, ph = h * .55, px0 = x - pw / 2, py0 = y - .1 * uw - h * .82; R(px0, py0, pw, ph, F('#c8bc9c')); R(px0, py0 + ph - PX, pw, PX, F('#7a6e58'));
    const gl = ['黒', '部', '洞']; if(ph >= PX * 10) for(let k = 0; k < 2; k++){ const g = GLY[gl[k]]; if(!g) continue; cx.imageSmoothingEnabled = false; cx.globalAlpha = .9; cx.drawImage(g, snp(x - 6 * PX), snp(py0 + k * ph / 2), 12 * PX, 14 * PX * Math.min(1, ph / 2 / (14 * PX))); cx.globalAlpha = 1; }
    halo(x, y - .2 * uw, Math.min(uw * .8, H * .1), '#ffc070', .3 * (1 - fog)); R(x - PX, y - .12 * uw, PX * 2, PX, WARMH); }
  // the intake tower standing in the reservoir off the crest: a pale concrete shaft from the water, a dark band of grilles, a lit cap, its
  // light doubled in the black water below
  function drawIntake(sp, x, y, uw, fog){ if(uw < 1) return; const F = c => fc(c, fog * .85), w = .9 * uw, top = y - 2.6 * uw, base = y + .9 * uw;
    R(x - w / 2, top, w, base - top, F(CO[3])); R(x - w / 2, top, Math.max(PX, w * .2), base - top, F(CO[5])); R(x + w / 2 - Math.max(PX, w * .2), top, Math.max(PX, w * .2), base - top, F(CO[1]));
    R(x - w / 2, y - .9 * uw, w, .3 * uw, F(CO[0])); R(x - w * .6, top - .2 * uw, w * 1.2, .2 * uw, F(CO[4])); R(x - w * .6, top - .2 * uw, w * 1.2, PX, F(CO[6]));
    R(x - PX / 2, top - .35 * uw, PX, .15 * uw, F(CO[1])); R(x - PX, top - .42 * uw, PX * 2, PX, '#ff3a3a');
    const ly = top + .15 * uw; R(x - w * .3, ly, w * .6, Math.max(PX, uw * .06), WARM); halo(x, ly, Math.min(uw * 1.2, H * .12), '#ffc070', .25 * (1 - fog));
    cx.fillStyle = rgbaA('255,200,120', .35 * (1 - fog)); for(let k = 1; k < 6; k++) if(k % 3 !== 2) pxRect(snp(x - w * .25), snp(base + k * uw * .12), Math.max(PX, snp(w * .5)), PX); }
  /* The mist off the plume, beside the crest: puffs rising from below the parapet past the crest and fading, white where the floodlights
     below catch them, blue-grey elsewhere. Drawn at one canvas pixel per sprite pixel (the nearest of fourteen sizes). Under reduced motion
     they hold still. */
  function drawMist(sp, x, y, uw, fog, now){ const L = visitOf(sp.k); if(!L || !L.ok) return; const q = Math.max(jetQ(L, 0), jetQ(L, 1)); if(q < .03 || fog > .8) return;
    const ph = reduce ? .45 + H1(sp.k) * .2 : ((now / (5200 + H1(sp.k * 3.1) * 2600) + H1(sp.k * 1.7)) % 1), h = -4 + ph * 4, r = uw * (.8 + ph * 1.8);
    cx.globalAlpha = q * (1 - fog) * .55 * Math.sin(ph * Math.PI) * (sp.w || 1); puffAt(ph < .62 ? PUFF : MIST, x + (ph - .5) * uw * .8, y - h * uw, r, sp.k); cx.globalAlpha = 1; }
  function lit(i, s){ const k = s.kbS; if(k === 4){ const d = Math.abs((i % 12) - 6); return .6 * Math.max(0, 1 - d / 2.5); } if(k === 3){ const d = Math.min(i % 6, 6 - i % 6), L = visitOf(i); return lampOn(L) ? .7 * Math.max(0, 1 - d / 2.2) : 0; } if(k === 1){ const d = Math.abs((i % 12) - 6); return .55 * Math.max(0, 1 - d / 3); } return 0; }
  const CREST_C = 2.1;
  function place(i, s){ regDir(); const L = visitOf(i), sec = secOf(L, i); s.kbS = sec; if(L && L.ok && ((i >= L.R0 - 10 && i < L.H0 + 40) || (i >= L.H1 - 30 && i < L.T2b + 40) || (L.led && i >= L.Lg0 - 20 && i < L.Lg1 + 10))) s.kbNoPad = true;
    s.sprites.push({ env:KEY, type:'mk', x:0, k:i }); if(gates.indexOf(i) >= 0) s.sprites.push({ env:KEY, type:'gant', x:0, k:i });
    if(sec === 3){ s.kbR = 1.32; s.kbL = -1.26;
      { const hs = L.H0 + Math.round(L.C * .3); if(i >= hs && i < hs + 12) s.sprites.push({ env:KEY, type:'house', x:1.5, k:i, a:hs, b:hs + 12 }); if(i === L.H0 + Math.round(L.C * .55)) s.sprites.push({ env:KEY, type:'intake', x:-5.2, k:i }); if(i >= L.H0 + 6 && i < L.H0 + 22) s.sprites.push({ env:KEY, type:'deck', x:1.6, k:i, a:L.H0 + 6, b:L.H0 + 22 }); if(i === L.H0 + 14) s.sprites.push({ env:KEY, type:'mon', x:-1.55, k:i }); }
      s.sprites.push({ env:KEY, type:'cL', x:-1.22, k:i }, { env:KEY, type:'cR', x:1.26, k:i });   // (after the structures beyond them, so the parapets draw in front)
      if(i % 10 === 0){ const d = Math.min(Math.abs(i - L.zo[0]), Math.abs(i - L.zo[1])), w = d < 90 ? 1 - d / 90 : 0; if(w > .05) s.sprites.push({ env:KEY, type:'mist', x:2.2 + H1(i * 1.3) * 4.5, k:i, w:.45 + .55 * w }); }
      const e = sm((i - L.H0 + 6) / 26) * sm((L.H1 - i) / 26); s.curve = s.curve * (1 - Math.max(e, i < L.H0 || i >= L.H1 ? 1 : 0)) * .2 + CREST_C * e; }
    else { s.kbR = 1.32; s.kbL = 0; const g = sec === 1 ? galOf(L, i) : null;
      s.sprites.push({ env:KEY, type:'cliff', x:-1.32, k:i, g:!!g }); if(L && L.jb && MECH.sp_jump && i === L.jb + MECH.sp_jump.NL + 9) s.sprites.push({ env:KEY, type:'casc', x:-1.3, k:i });   // (the gorge leap's torrent, down the cut into the gap)
      if(g) s.sprites.push({ env:KEY, type:'gal', x:0, k:i, a:g.a, b:g.b, n:g.n }); else s.sprites.push({ env:KEY, type:'rail', x:1.2, k:i });
      if(g && g.mouth) s.curve = 2.4 * sm((i - g.a) / 22) * sm((g.b + 6 - i) / 22);
      if(sec === 2) s.curve = 0;
      if(sec === 4){ s.curve = 0; if(i % 12 === 6) s.sprites.push({ env:KEY, type:'lpost', x:1.3, k:i }); const bm = L.Lg0 + Math.round(L.led * .45); if(i >= bm && i < bm + 18) s.sprites.push({ env:KEY, type:'bay', x:1.6, k:i, a:bm }); } }
    // the set piece is decided once, as the visit's first segment is laid (round 14: the jets run on other visits, so the dam's state must be
    // known before it can first be seen, far up the gorge; it was decided at the reveal while every unbooked dam stood dark)
    if(L && L.ok && !L.req && i >= L.B0){ L.req = true; const D = DIR(); if(KBSP !== null){ L.sp = KBSP === '1'; return; } try{ L.sp = !!(D && D.request && D.request('kanpo', { tier:'hero', seg:L.H0, road:KEY, visit:L.B0 })); }catch(e){ L.sp = false; } } }

  // ---------------------------------------------------------------- overlay: cold haze in the gorge; on the crest, mist and spray off the plume
  function overlay(al, now, sk){ cam(); const cs = camSeg(), s0 = segAt(position + PZ); if(s0 && s0.tunnel) return; const L = visitOf(BI), hz = HZ, t = reduce ? 0 : now;
    if(crestView(L, cs)){ const v = Math.max(jetQ(L, 0), jetQ(L, 1)) * (.45 + .55 * sm(1 - Math.abs(cs - L.H0 - L.C * .5) / (L.C * .6))); if(v < .02) return;
      // the mist rising past the crest on the downstream side: big soft puffs drifting up and across the right of the frame
      for(let k = 0; k < 7; k++){ const ph = reduce ? H1(k * 2.3) : ((t / 1000 * (.035 + H1(k) * .03) + H1(k * 2.3)) % 1), xx = W * (.62 + H1(k * 5.1) * .45) - ph * W * .18, yy = hz + H * .3 - ph * H * .55;
        if(k > 3) continue; cx.globalAlpha = al * v * .12 * Math.sin(ph * Math.PI); puffAt(MIST, xx, Math.max(yy, hz + H * .08), H * (.12 + H1(k * 7.3) * .08), k); }
      cx.globalAlpha = al * v * .5; cx.fillStyle = '#d8e4f6';
      for(let k = 0; k < 36; k++){ const ph = reduce ? H1(k * 3.1) : ((t / 1000 * (.12 + H1(k) * .1) + H1(k * 3.1)) % 1), x = W * (.55 + H1(k * 7.7) * .5) - ph * W * .25, y = H * (.95 - ph * .7); if(x < 0 || x > W) continue; cx.fillRect(snp(x), snp(y), PX, PX); }
      cx.globalAlpha = 1; return; }
    // under the jets (the reveal): spray streaks and a wet sheen at the screen's edges only (never over the road's middle), mist
    // drifting across the sky; steady and sparser under reduced motion, never a flash
    if(L && L.ok){ const q = Math.max(jetQ(L, 0), jetQ(L, 1)), I = q * (L.sp ? 1 : .6) * sm((cs - (L.T1a - 240)) / 60) * sm((L.T1a + 6 - cs) / 24);   // (a working discharge on other visits: calmer)
      if(I > .02){ const n = Math.round((reduce ? 14 : 36) * I);
        cx.globalAlpha = al * .22 * I; cx.fillStyle = ditherPat('#9ab4d8', .25); cx.fillRect(0, 0, snp(W * .06), H); cx.fillRect(snp(W * .94), 0, W - snp(W * .94), H);
        cx.globalAlpha = al * .55 * I; cx.fillStyle = '#d4e2f4';
        for(let k = 0; k < n; k++){ const side = k & 1, ph = reduce ? H1(k * 2.3) : ((t / 1000 * (.7 + H1(k) * .6) + H1(k * 2.3)) % 1), x = side ? W * (.84 + H1(k * 5.1) * .15) : W * (.01 + H1(k * 5.1) * .15), y = H * (ph * 1.1 - .05), len = reduce ? PX : PX * (2 + ((H1(k * 3.7) * 4) | 0));
          for(let j = 0; j < len; j += PX) cx.fillRect(snp(x + (side ? -j : j) * .5), snp(y + j), PX, PX); }
        cx.globalAlpha = al * .16 * I; cx.fillStyle = ditherPat('#b8c6e0', .25); for(let k = 0; k < 2; k++){ const off = reduce ? k * W * .3 : (t * .02 * (k + 1) + k * W * .3) % (W * 1.4); cx.fillRect(snp(off - W * .4), snp(hz - H * (.22 + k * .12)), snp(W * .6), PX * (4 + k * 3)); }
        cx.globalAlpha = 1; } }
    // the gorge: a cold haze lying low over the void
    cx.globalAlpha = al * .5; cx.fillStyle = ditherPat('#5a6888', .25); for(let k = 0; k < 2; k++){ const y = snp(hz + (2 + k * 5) * PX), off = (skyPar('mid') * (1 + k * .3) + t * .004 * (k + 1)) % (W * .5); cx.fillRect(snp(W * .5 - off * .2), y, W, PX * (2 + k)); } cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- the gorge leap (jump.js hooks): the gully under the gap
  /* 黒部峡谷越え (round 14; spec research/sundown-craft/jumps.md §4). Where a side gully comes down out of the granite on the left, the road's
     deck is gone: the landmark ramp throws you across it to the far leaf. Below the gap, the gully as seen from the lip and in the air (the
     floor is jump.js's illusion of depth, drawn flat under the road between the cut face and the valley edge; the gorge's own void shows on
     past the edge, from VB as everywhere on this road): the near bank breaking away in rock shelves with moonlit lips, the torrent across the
     bed in white water running right (it pours off the edge into the main gorge), boulders standing in it, mist lying in the gully, the far
     bank in shadow under the landing leaf. Kurobe's palette: granite GR, water FOAM; nothing warm below. */
  /* the gully's torrent coming down the cut face into the gap (the side falls of the real gorge, "S-ji-kyo in Kurobe Gorge"): a small
     cousin of the dam's jets, drawn with jet() as a feathered fall from a notch below the upper tier's lip to the gully floor, its spray
     and mist hanging at the foot. It marks the leap from far up the road: where the water comes down, the road is gone. */
  function drawCasc(sp, uw, fog, now){ if(uw < PX * 1.5 || fog > .9) return; cam(); const z = sp.k + .5, F = c => fc(c, fog * .7); if(z - camSeg() < 3) return;   // (not once it is beside you: the projection clamps there)
    jet(t => { JP[0] = z + .3 * t; JP[1] = -1.31 + .07 * Math.sin(t * 9.4) + .08 * t; JP[2] = 3.6 * (1 - t) - .05; }, t => .12 + .42 * t, .85, now, 7, F, .25); }
  function jumpAt(i){ const L = lay(zoneOfSeg(i)); return L && L.jb ? L.jb : null; }
  function jumpKeep(sp, o, p){ const J = MECH.sp_jump; if(sp.type === 'mk' || sp.type === 'cliff' || sp.type === 'casc') return true; if(sp.type === 'rail') return !(J && J.inGap(p, o)); return undefined; }
  function jumpBelow(s, o, fog, p){ const J = MECH.sp_jump, a = s.p1.screen, b = s.p2.screen; if(!J || !(a.scale > 0) || !(b.scale > 0)) return false;
    const NL = J.NL, G = J.G, g = o - NL, i = s.index, now = reduce ? 0 : performance.now(), F = c => fc(c, fog * .6), XR = 1.32, XL = -1.32;
    const xa = (f, X) => (a.x + (b.x - a.x) * f) + X * (a.w + (b.w - a.w) * f), ya = f => a.y + (b.y - a.y) * f;
    const Q = (f0, f1, X0, X1, col) => poly(xa(f0, X0), ya(f0), xa(f0, X1), ya(f0), xa(f1, X1), ya(f1), xa(f1, X0), ya(f1), col);
    if(g < 0 || g >= G) return false;
    // the near bank (g 0..5) steps down in shelves, each a moonlit lip over a shadowed face; the far bank (g 16..21) rises in shadow
    if(g < 6){ Q(0, 1, XL, XR, F(g % 2 ? GR[2] : GR[1])); if(g % 2 === 0){ Q(0, .18, XL, XR, F(GR[4])); for(let k = 0; k < 5; k++){ const X = XL + .2 + k * .55 + (H1(i * 1.3 + k) - .5) * .2; Q(.18, .7 + .3 * H1(k + i), X, X + .05, F(GR[0])); } } return true; }
    if(g >= 16){ Q(0, 1, XL, XR, F(g % 2 ? GR[1] : GR[0])); if(g === 16) Q(0, .3, XL, XR, F(GR[2])); for(let k = 0; k < 4; k++){ const X = XL + .3 + k * .65 + (H1(i * 2.1 + k) - .5) * .3; Q(0, 1, X, X + .04, F('#0a0810')); } return true; }
    // the bed: dark water; the torrent's white water runs right in hard flecks, thicker where the gully narrows, pouring off at the edge
    Q(0, 1, XL, XR, F(g % 2 ? '#0c1520' : '#0e1824')); const deep = 1 - Math.abs(g - 10.5) / 5.5;
    for(let k = 0; k < 7; k++){ const h = H1(i * 3.7 + k * 1.9), v = .16 + .18 * H1(k * 5.3 + i), ph = ((now / 1000 * v + h) % 1), X = XL + ph * (XR - XL + .4) - .2, len = .08 + .22 * H1(k * 2.3 + i * .7), f0 = .15 + .6 * H1(k * 7.1 + i);
      if(X + len < XL || X > XR) continue; Q(f0, Math.min(1, f0 + .18 + .1 * deep), Math.max(XL, X), Math.min(XR, X + len), F(k % 3 ? FOAM[3] : k % 2 ? FOAM[4] : FOAM[2])); }
    // standing waves below the boulders (white, fixed) and the boulders themselves (dark, a moonlit top)
    for(let k = 0; k < 2; k++){ if(H1(i * 5.1 + k * 3) < .55) continue; const X = XL + .3 + 2.2 * H1(i * 1.7 + k * 4.3), w = .1 + .12 * H1(k + i * .3);
      Q(.1, .8, X - w * .4, X + w * 1.6, F(FOAM[3])); Q(.35, .95, X - w * .5, X + w * .5, F(GR[1])); Q(.35, .5, X - w * .4, X + w * .4, F(GR[4])); }
    // the lip where it pours into the main gorge, and the mist lying in the gully (dithered: a value of its own in grey)
    Q(0, 1, XR - .1, XR, F(g % 2 ? FOAM[4] : FOAM[3]));
    if(g === 7 || g === 9 || g === 13) Q(.2, .9, XL, XR, ditherPat(F(g === 9 ? '#8c9cbc' : '#6c7c9c'), .25));
    return true; }

  // ---------------------------------------------------------------- the roar (round 14, Kellan: "a roar of the water")
  /* A looped noise bed on the SFX bus (env/akiba.js's rain bed is the pattern): a deep rumble (lowpass ~150 Hz), the body of falling water
     (a bandpass that opens from ~350 Hz far off to ~1.1 kHz under the jets: distance takes the highs first) and a spray hiss up close.
     Loudness follows the jets' strength and the rider's distance from the plunge pool: heard far up the gorge, full on the reveal under the
     jets, a held roar from the crest (the plume is below you), the ledge's own dam. In the bores it ducks to a muffled 10 % (rock between
     you and the water). It sits under the music (the bus peaks well below the engine), slowly surging; unwired off this road, so it costs
     nothing there. Driven every frame; the gains are set on a 0.25 s tick with smooth targets (no zipper, no clicks). */
  const RB = { src:null, g:null, lo:null, bp:null, hp:null, hg:null, wired:false, t:0, off:0 };
  function roarAt(L, cs){ if(!L || !L.ok) return 0; const q = Math.max(jetQ(L, 0), jetQ(L, 1)); if(q < .03) return 0;
    let k = 0; if(cs < L.T1a) k = sm((cs - (L.R0 - 760)) / 820);   // the gorge, then the reveal under the jets (full from about R0 + 60)
    else if(cs < L.T2a) k = .62;   // the Kanden bore (ducked below), then the crest: the plume below the parapet
    else if(L.led && cs < L.Lg1 + 80) k = cs < L.T2b ? .35 : .75;   // the west bore, then the ledge facing its own dam
    else k = .45 * sm(1 - (cs - (L.led ? L.Lg1 + 80 : L.T2a)) / 420);
    return k * q; }
  MECH.kb_roar = { update(dt){ try{ if(typeof SFX === 'undefined' || !SFX.ready || !SFX.ready() || !SFX.bus || typeof M === 'undefined' || !M.ac || !M.noiseBuf) return;
      if((RB.t -= dt || 0) > 0) return; RB.t = .25;
      const sg = typeof segs !== 'undefined' && segs.length ? segAt(position + PZ) : null, here = (state === 'play' || state === 'pulled') && !!sg && !!LANDS[sg.land] && LANDS[sg.land].key === KEY;
      cam(); const cs = camSeg(), L = here ? visitOf(Math.floor(cs)) : null, k = here ? roarAt(L, cs) : 0, tun = !!(sg && sg.tunnel);
      if(!RB.src){ if(k <= 0) return; const ac = M.ac, s = ac.createBufferSource(); s.buffer = M.noiseBuf; s.loop = true;
        const lo = ac.createBiquadFilter(); lo.type = 'lowpass'; lo.frequency.value = 150; lo.Q.value = .7; const lg = ac.createGain(); lg.gain.value = .055;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = .55; const bg = ac.createGain(); bg.gain.value = .032;
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400; const hg = ac.createGain(); hg.gain.value = 0;
        RB.g = ac.createGain(); RB.g.gain.value = 0; s.connect(lo); lo.connect(lg); lg.connect(RB.g); s.connect(bp); bp.connect(bg); bg.connect(RB.g); s.connect(hp); hp.connect(hg); hg.connect(RB.g);
        s.start(0, Math.random() * 1.5); RB.src = s; RB.bp = bp; RB.hg = hg; RB.lo = lo; }
      if(k > 0 && !RB.wired){ RB.g.connect(SFX.bus()); RB.wired = true; }
      const t = M.ac.currentTime, surge = reduce ? 1 : .9 + .1 * Math.sin(t * 1.4) + .05 * Math.sin(t * .53 + 1), duck = tun ? .1 : 1, near = clamp(k, 0, 1);
      RB.g.gain.setTargetAtTime(k * duck * surge, t, tun ? .35 : .6);
      RB.bp.frequency.setTargetAtTime(tun ? 220 : 350 + 750 * near * near, t, .5); RB.lo.frequency.setTargetAtTime(tun ? 110 : 150, t, .5);
      RB.hg.gain.setTargetAtTime(tun ? 0 : .012 * near * near * near, t, .5);
      if(k > 0) RB.off = 0; else if(++RB.off > 16 && RB.wired){ RB.g.disconnect(); RB.wired = false; } }catch(e){} } };

  // ---------------------------------------------------------------- the set piece's card (MECH: update runs on game time)
  MECH.sp_kanpo = { update(dt){ if(typeof segs === 'undefined' || !segs.length || state !== 'play') return; cam(); const cs = camSeg(), L = visitOf(Math.floor(cs)); if(!L || !L.ok) return;
      // no boost pads where they would read as a stray coloured shape: the reveal, both tunnel mouths, the crest's ends (every visit)
      if(!L.padClr){ L.padClr = true; for(const [a, b] of [[L.R0 - 10, L.H0 + 40], [L.H1 - 30, L.T2b + 40]]) for(let i = Math.max(0, a); i < b && i < segs.length; i++) if(segs[i].hz && segs[i].hz.type === 'pad') segs[i].hz = null; }
      // (the roar of the discharge is a continuous bed now: MECH.kb_roar below)
      if(!L.sp) return; const s = cs - L.R0, D = DIR();
      // out of the gallery mouth: the card, the letterbox and the duck; the guard keeps the reveal and the Kanden mouth clear of traffic and oil
      if(!L.card && s >= 4 && s < REV - 60){ L.card = true; if(D && D.cine){ let card = CARD; if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has('kanpo')){ try{ if(MECH.cutin.show('kanpo') !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
          try{ if(card) D.cine({ letterbox:false, dur:2.4, card }); L.cut = D.cine({ letterbox:{ top:.05, bottom:.06 }, duck:.5, guard:{ from:L.R0 - 10, to:L.T1a + 12 }, dur:0 }); }catch(e){} }
        // no boost pads under the moment either: their speed lines would cover the dam
        for(let i = Math.max(0, L.R0 - 10); i < L.T1a && i < segs.length; i++) if(segs[i].hz && segs[i].hz.type === 'pad') segs[i].hz = null; }
      // the gates: a deep shudder as each opens, and mild slow motion over the opening (none under reduced motion)
      for(const [g, at] of [['g1', 84], ['g2', 150]]) if(!L[g] && s >= at){ L[g] = true; if(D && D.cine && !reduce) try{ D.cine({ letterbox:false, shake:2, slowmo:g === 'g1' ? { scale:.7, hold:2.6 } : false, dur:g === 'g1' ? 3.2 : .6 }); }catch(e){}
        try{ if(typeof M !== 'undefined' && M.ac && M.noise){ const t0 = M.ac.currentTime; M.noise(1.8, 70, .1, t0); M.noise(1.2, 260, .04, t0 + .15); } }catch(e){} }   // the gate's first thump into the bed
      if(!L.fin && s >= REV - 6){ L.fin = true; try{ if(L.cut) L.cut.end(); }catch(e){} try{ D && D.done && D.done('kanpo'); }catch(e){} } } };

  // ---------------------------------------------------------------- warm-up
  function* warmSteps(){ regDir();
    // a night that starts on this road: its first visit is JZ0 longer, so the gorge leap fits before the reveal (+360 more for the ledge, ?kbledge=1);
    // the checkpoint before that longer stretch pays its time back (GATE_TIME, as setpiece/boss.js does for its lengthened Akihabara)
    if(!warmSteps.chained){ warmSteps.chained = true; const prev = window.GATE_EXTRA, pt = window.GATE_TIME, first = () => typeof ROUTE !== 'undefined' && ROUTE[0] === landK() && !window.DEMO;
      window.GATE_EXTRA = n => (prev ? prev(n) || 0 : 0) + (n === 1 && first() ? JZ0 + (KBLEDGE ? 360 : 0) : 0);
      window.GATE_TIME = n => (pt ? pt(n) || 0 : 0) + (n === 1 && first() ? Math.round(JZ0 / 55 * 1.1) : 0); }
    if(!VB){ VB = mkCanvas(Math.max(1, cv.width), Math.max(1, cv.height)); VG = VB.getContext('2d'); } vbOK(); yield;
    buildPeak(); yield; buildGorge(); yield; buildShore(); yield; buildPuffs(); yield;
    for(const ch of CHARS) if(!GLY[ch]) GLY[ch] = mkCanvas(13, 15); paintGlyphs(); try{ if(document.fonts && document.fonts.load) document.fonts.load('12px DotGothic16').then(paintGlyphs, () => {}); }catch(e){}
    try{ if(typeof MUSIC !== 'undefined' && MUSIC.ROAD_THEME && !MUSIC.ROAD_THEME[KEY]) MUSIC.ROAD_THEME[KEY] = 'snow'; }catch(e){}
    for(const d of [.25]) for(const c of ['#b8c6e0', '#5a6888']) try{ cx.fillStyle = ditherPat(c, d); cx.fillRect(0, 0, PX, PX); }catch(e){}
    yield;
    // run the far land once (JIT, colour caches) and upload every canvas
    if(typeof skyAt === 'function' && W > 0 && segs && segs.length){ const sk = skyAt(.3); try{ cx.save(); backdrop({ hz:H / 2 + 2, sk, now:0, moonX:W / 2, moonY:H * .2, t:.3, far:sk.mid, near:sk.mid, L:LANDS[landK()] }); cx.restore(); }catch(e){ try{ cx.restore(); }catch(e2){} } }
    try{ cx.save(); cx.globalAlpha = .004; for(const c of [PEAK, PEAKM, GORGE, SHORE, SHOREM, VB]) if(c) cx.drawImage(c, 0, 0, 1, 1); for(const L of [PUFF, MIST]) for(const a of L) for(const c of a) cx.drawImage(c, 0, 0, 1, 1); for(const ch in GLY) cx.drawImage(GLY[ch], 0, 0, 1, 1); cx.restore(); }catch(e){}
    cx.clearRect(0, 0, W, H); }

  ENV.kurobe = { _lay:lay, _visit:visitOf, _roar:() => ({ gain:RB.g ? +RB.g.gain.value.toFixed(4) : 0, wired:RB.wired, bp:RB.bp ? Math.round(RB.bp.frequency.value) : 0 }),   /* (test hook: the roar bed) */ _vb:() => VB, _PJ:(z, x, h) => { cam(); PJ(z, x, h); return { x:PJX, y:PJY, u:PJU }; },
    barrier:1.1, kerbs:true, moonDX:-.22, road:['#1d1e27', '#1b1c24'], lampCol:'#8a6442',
    warm(){ for(const _ of warmSteps()); }, warmSteps, tunOver, drawTunnel, place, lit, draw, roadFX, backdrop, overlay,
    jumpAt, jumpKeep, jumpBelow, jumpFloor:[1.32, 1.32], jumpEdge:false,   // the gorge leap (setpiece/jump.js THEMES.kurobe)
    laneSolid:() => null };
})();
