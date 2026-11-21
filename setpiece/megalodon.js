/* Sundown set piece: 滄竜, the mosasaur, in the Aqua-Line undersea tunnels (MECH.sp_meg; director id 'megalodon', kept so the catalogue, the
   journal and ui/cutin.js still find it). See setpiece/README.md.   Load after setpiece/jetwash.js:   <script src="setpiece/megalodon.js"></script>
   Notes, sources and the practice logs: research/sundown-craft/megalodon.md (the shark rounds), research/sundown-craft/mosasaur.md (this one).

   The booked bore is a LONG one, laid by env/aqua.js as a range of its own length (ENV.aqua.win.boreSet; the core's boreAt asks
   ENV.aqua.tunOver), on an Aqua-Line zone lengthened for it (GATE_EXTRA): ~1450..1900 segments, ~27..35 s inside. The beat sheet U is
   written for 1900 and mapped onto the booked bore (ubOf: the ram falls at 69.5% of it). It swims on the OUTER wall of the bend (chosen at
   each beat); the jets come from the wall it rammed; the encounter's walls carry no doors, hydrants or distance boards.
   The reveal follows the Jaws / Alien rule: dread first, the animal late, and never whole.
     u -110..0     the music thins, a sub-bass heartbeat; in the dive cutting a swell rolls along the sea above the wall top: no body.
     u   10..240   the sea beyond the glass sinks to near black-blue; the tunnel's light reaches a few metres into it; marine snow.
     u   40        the hero cut-in card.
     u   50..330   a school drifts past, startles, bolts, scatters and is gone.
     u  300..870   ONE animal on ONE path (KP, a spline in world space): a shadow crossing high over the vault, off the far side, a loop
                   back at the edge of what you can see (the silhouette). It only ever enters or leaves by swimming across an edge.
     u  400        a lamp stutters.   u 880: a pressure wave: the panes wobble, the tube creaks, the lamps flicker, a call.
     u  870..1150  it swims along the side glass with you, a little slower, drifting back across the view: the whole swim.
     u 1150..1265  it paces you beside the glass ahead; an insert panel: the eye, the blink.
     u 1265..1320  it turns into the glass just ahead of you, the tail beating harder, the jaws opening. IMPACT at u 1320: the jaws on the
                   glass in side profile, a white-cyan flash where it gives, a short slow-motion hold (none under reduced motion), a thud
                   and boom, the lamps stutter, a crack; the shock cracks two panels further on, which burst into jets.
     u 1320..1720  it recoils and swims off across the edge of the view on that side, into the dark.
   Fairness: the director's guard keeps the stretch clear of traffic and slicks; a jet only ever covers the near lane (or the near and centre
   lanes), so a lane is always open; when a jet bursts, if the open lane is out of reach from where you are, that jet is cut short so it
   cannot reach you (the fireball's corridor rule); ASSIST.jumps ('generous') shortens them all; a hit is light (a shove toward the open road,
   a little speed, 'Soaked'), never a crash, never a slide, no loss of control. The animal itself never touches the road. No slow motion.
   ASSIST.contrast rings the jets' landing zones; ASSIST.noFlash / reduced motion: no flicker (each stutter is one steady dim), no shake, no
   pane wobble, calmer spray.
   Drawing: everything beyond the glass (the abyss, the surface glow, light shafts, the school, marine snow, the animal, silt) is drawn once a
   frame into one buffer at the game canvas's resolution and composited into every window pane through env/aqua.js's window hook
   (ENV.aqua.win), behind the frames; the cracks are mapped onto the glass ring by ring. Everything is built in warm(); nothing allocates a
   canvas mid-ride. */
"use strict";
(() => {
  const DIR = MECH.director, ID = 'megalodon';
  const AB = 'abyss';   /* the combined event: this mosasaur, then setpiece/flood.js's flood through the pane it bit; one hero moment */
  if(DIR){ DIR.register(ID, { roads:['aqua'] }); DIR.register(AB, { tier:'hero', roads:['aqua'] }); }
  const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const H1 = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const pSeg = () => (position + PZ) / SEG;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const qx = v => Math.round(v / PX) * PX;

  // ---------------------------------------------------------------- the beat (u: segments from the portal, on the 1900-segment sheet)
  // dk: the sea darkens (and lifts at the far end); sc: the school (scP its panic); fk1: the first lamp stutter; sh: the shadow; si: the
  // silhouette; wk: the wake swirl; pw: the pressure wave; fp: the flank pass; ey: the eye; tn0: from here the ram panel tracks the glass;
  // op0: the jaws open; rc1: the recoil ends; sp: it swims away; eyH: the heartbeat's peak
  const U = { app:-110, fin0:-50, fin1:-6, win0:10, dk0:10, dk1:240, card:40, sc0:50, scP:190, sc1:330, fk1:400, sh0:470, sh1:720, si0:720, si1:860,
    wk0:790, wk1:980, pw:880, fp0:960, fp1:1100, ey0:1100, ey1:1250, tn0:1100, op0:1262, ram:1320, rc1:1440, sp0:1500, sp1:1720, dk2:1820, end:1880,
    silt:260, win1:1880, eyH:1250, pv0:250, pv1:1800 };   /* pv: the viewing section (panoramic glass) */
  const K_RAM = 348, JETS = [418, 446], DECIDE = 140, A0 = 120;   // the rammed panel; the jet panels (k); placement decides 140 segments before the portal; the approach
  // the glass, in angles from the crown (env/aqua.js WA: 1.26 .. 1.74, the clear glass between the frame's head and sill)
  const WT = 1.28, WB = 1.70, DA = .015, BANDS = [[1.28, 1.43, 0], [1.43, 1.58, 0], [1.58, 1.64, 1], [1.64, 1.70, 2]], BANDS2 = [[1.28, 1.58, 0], [1.58, 1.70, 1]];

  /* ================================================================ art
     The animal: 滄竜, a mosasaur grown to the size of a kaiju (~22 road half-widths long). References (Wikimedia Commons and the papers,
     viewed at pixel zoom; rules taken, nothing copied; the list and the lessons are in research/sundown-craft/mosasaur.md):
     - Tylosaurus and Mosasaurus hoffmannii skeletons and restorations: a long, low crocodilian-lizard skull (about a seventh of the body),
       the snout tapering to a blunt rostrum, a big orbit high and well back with a bony sclerotic ring, the jaw line long and nearly straight,
       the lower jaw deepening toward the hinge behind the eye; a short thick neck; the trunk deepest a third of the way back; a long tail.
     - Prognathodon skulls: conical, slightly recurved teeth in a single row along each jaw, and a second, smaller row on the pterygoids in
       the roof of the mouth, set back behind the front of the tooth row: seen only when the jaws gape.
     - The tail fluke (Lindgren et al. 2010, 2013): the last third of the tail bends DOWN, carrying a crescent fluke like a shark's turned
       over: the lower lobe, round the bent vertebrae, the longer; the upper lobe soft and shorter.
     - Four paddle flippers: the fore pair larger, just behind the head; the hind pair at about two fifths of the length. Hydrofoils for
       steering and trim, not for thrust.
     - Skin: small keeled, diamond-shaped scales in diagonal rows (the Kansas specimens); pigment studies (Lindgren et al. 2014) suggest a dark
       back and a paler belly. Here: a near-black back with darker saddles across it, healed rake scars, a pale belly with a stepped line.
     It is never a picture: a spine of 14 joints follows the path its neck swims (follow-the-leader, the Rain World approach), a carangiform
     wave travels down it with its amplitude growing toward the tail (the head steady), a rigid skull carries a hinged lower jaw, the flippers
     stroke and steer, the fluke rides the down-turned tail. Each frame it is projected through the road's own per-segment projection (true 3D
     beyond the glass, in the tube's isotropic units) and drawn per pixel into the game-resolution sea buffer: ribbons between stations
     (inverse-bilinear quads), the fins as planar shapes. Every pixel is an index on a hue-shifted ramp (nothing blended inside the body),
     fogged in eight steps toward the abyss, with a one-pixel rim where it meets the light from the surface above. */
  const S = { ok:false };
  const lerpK = (K, f) => { if(f <= K[0][0]) return K[0][1]; for(let n = 1; n < K.length; n++) if(f <= K[n][0]){ const a = K[n - 1], b = K[n], t = (f - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; } return K[K.length - 1][1]; };
  function inPoly(P, x, y){ let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ const a = P[i], b = P[j]; if((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  /* A crack spidering out from a point on the glass, in four steps: radial cracks first, then the rings between them, then a weep of water.
     Columns along the tube (drawn wide for the slant), rows down the glass; centre (CW/2, CH/2). */
  const CW = 64, CH = 30;
  function crackGrid(stage){ const G = new Uint8Array(CW * CH), set = (x, y, v) => { x |= 0; y |= 0; if(x >= 0 && y >= 0 && x < CW && y < CH) G[y * CW + x] = Math.max(G[y * CW + x], v); }, R = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(77);
    const c0 = CW / 2, r0 = CH / 2, arms = [];
    for(let n = 0; n < 9; n++){ const a = n / 9 * 6.283 + R() * .5, len = .45 + R() * .55, pts = []; let x = c0, y = r0, d = a;
      for(let s = 0; s < 40; s++){ x += Math.cos(d) * 1.6; y += Math.sin(d) * .7; d += (R() - .5) * .5; pts.push([x, y]); if(s / 40 > len) break; } arms.push(pts); }
    const reach = [.3, .62, 1, 1][stage];
    for(const pts of arms){ const n = Math.ceil(pts.length * reach); for(let i = 0; i < n; i++){ set(pts[i][0], pts[i][1], 2); if(i < n * .5) set(pts[i][0] + 1, pts[i][1], 1); } }
    if(stage >= 1) for(const rr of stage >= 2 ? [.35, .65] : [.35]) for(let a = 0; a < 6.283; a += .05){ if(R() < .35) continue; set(c0 + Math.cos(a) * CW * .5 * rr, r0 + Math.sin(a) * CH * .5 * rr, 1); }
    for(let y = -2; y <= 2; y++) for(let x = -3; x <= 3; x++) if(x * x / 9 + y * y / 4 <= 1) set(c0 + x, r0 + y, 3);
    if(stage >= 3) for(let k = 0; k < 4; k++){ const x = c0 - 8 + k * 5 + R() * 2; for(let y = r0 + 2; y < CH; y++) if(R() < .8) set(x, y, 1); }
    return G; }
  const CRK = { 1:['#5aa8b8', '#7ac8d4', '#a8ecf4'], 2:['#c8f4fc', '#e0fcff', '#ffffff'], 3:['#0a1418', '#0a1418', '#0a1418'] };

  function paint(G, gw, gh, pal, band, fog){ const c = mk(gw, gh), k = c.getContext('2d'), img = k.createImageData(gw, gh), D = img.data, cache = {};
    for(let i = 0; i < G.length; i++){ const v = G[i]; if(!v) continue; let rgb = cache[v]; if(!rgb){ const col = fog ? mixc(pal[v][band], '#08141c', .16) : pal[v][band]; rgb = cache[v] = hx(col); }
      D[i * 4] = rgb[0]; D[i * 4 + 1] = rgb[1]; D[i * 4 + 2] = rgb[2]; D[i * 4 + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // the school: hundreds of small dark fish in a loose band around the horizon, all pointing outward (they flee toward you); two tail frames
  function schoolCanvas(dir, fr){ const w = 256, h = 400, c = mk(w, h), k = c.getContext('2d'), R = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(9091);
    for(let n = 0; n < 700; n++){ const x = Math.floor(R() * w), y = Math.floor(140 + (R() + R() + R()) / 3 * 100), big = R() < .25, l = big ? 6 : 4, t = (fr + n) & 1;
      k.fillStyle = R() < .3 ? '#0a2e38' : '#03141a'; const X = dir > 0 ? x : x; for(let i = 0; i < l; i++) k.fillRect((X + dir * i + w) % w, y, 1, big && i > 0 && i < l - 2 ? 2 : 1);
      const tx = (X + dir * l + w) % w; k.fillRect(tx, y + (t ? -1 : 0), 1, big ? 3 : 2); if(R() < .4){ k.fillStyle = '#5ab8b4'; k.fillRect(X, y, 1, 1); } }
    cx.drawImage(c, 0, 0, 1, 1); return cx.createPattern(c, 'repeat'); }
  function glassSet(G, gw, gh, pal){ const o = []; for(let f = 0; f < 2; f++){ const r = []; for(let b = 0; b < 3; b++){ const c = paint(G, gw, gh, pal, b, f); cx.drawImage(c, 0, 0, 1, 1); r.push({ c, p:cx.createPattern(c, 'no-repeat') }); } o.push(r); } return o; }
  // ---------------------------------------------------------------- the palette: hue-shifted ramps, dark to light; index = ramp * 8 + step
  // the hide runs violet-black, navy, slate-teal to a grey-green where the tube's light reaches it; the belly paler and a little warmer;
  // bone for the teeth and the eye's ring; a deep red-black mouth; the eye black, its shine amber (the one warm thing in the sea), a white glint
  const ABY = '#02060b';
  const RAMPS = [
    ['#04050b', '#080b17', '#0d1423', '#152132', '#1f3241', '#2c464f', '#41605d', '#61806c'],
    ['#07090f', '#0f141c', '#1a222b', '#29363d', '#3c4c4e', '#566660', '#76857a', '#9da893'],
    ['#1a1810', '#3a3628', '#6a6450', '#a8a084', '#d8d2b4', '#f2eedc', '#f2eedc', '#f2eedc'],
    ['#060102', '#140405', '#26080b', '#3c0e12', '#561619', '#6e2022', '#6e2022', '#6e2022'],
    ['#000000', '#2e1604', '#6a3a0c', '#b4701c', '#f0c060', '#fff6d8', '#fff6d8', '#fff6d8'],
    ['#16303a', '#284e5c', '#4a7c88', '#7eb4bc', '#b8e4e8', '#b8e4e8', '#b8e4e8', '#b8e4e8'],
    ['#1c221f', '#2e3832', '#46524a', '#626e64', '#86907f', '#86907f', '#86907f', '#86907f'],
    ['#03050b', '#070a16', '#0b1222', '#121d30', '#1b2b3e', '#273c4a', '#3a5458', '#557263'] ];
  const NFOG = 8, LUT = new Uint32Array(NFOG * 64);
  function lutBuild(){ const a = hx(ABY); for(let f = 0; f < NFOG; f++){ const k = Math.pow(f / (NFOG - 1), .85);
      for(let r = 0; r < 8; r++) for(let i = 0; i < 8; i++){ const c = hx(RAMPS[r][i]), m = j => Math.round(c[j] + (a[j] - c[j]) * k); LUT[f * 64 + r * 8 + i] = ((255 << 24) | (m(2) << 16) | (m(1) << 8) | m(0)) >>> 0; } } }
  const ACO = new Float32Array(65), LAM = new Float32Array(65), BW = new Float32Array(256);   /* across a ribbon (v 0..1): the girth angle acos(1 - 2v) and how squarely it faces you */
  function tabBuild(){ for(let n = 0; n <= 64; n++){ const c = 1 - 2 * n / 64; ACO[n] = Math.acos(c); LAM[n] = Math.sqrt(Math.max(0, 1 - c * c)); } for(let n = 0; n < 256; n++) BW[n] = .1 * Math.sin(n / 255 * 70); }

  // ---------------------------------------------------------------- the body plan (uw: the tube's own unit, one road half-width; 1 segment = .1)
  // ML its length; SK the skull's share (the neck point N is the back of the skull); NJ joints from the neck to the fluke root (s .94);
  // SH the jaw hinge; SE / PE the eye (along the body; round the girth), RE its radius; SSZ a scale; TSP the tooth spacing
  const ML = 22, SK = .16, NJ = 14, JST = (.94 - SK) / (NJ - 1), JSP = JST * ML, SH = .143, SE = .11, PE = .84, RE = .21, SSZ = .22, TSP = .24;
  // s; half-height above the spine line; below it; half-width. The skull first (long, low, the snout tapering), then the trunk (deepest a third
  // of the way back) and the long tail, laterally flattened toward the fluke
  const PRO = [[0, .26, .2, .14], [.012, .36, .25, .2], [.034, .48, .32, .27], [.062, .62, .42, .33], [.09, .76, .54, .4], [.114, .9, .68, .46], [.136, 1.04, .84, .54], [.16, 1.16, 1.04, .68],
    [.22, 1.34, 1.42, .94], [.26, 1.4, 1.52, 1.08], [.34, 1.52, 1.64, 1.16], [.42, 1.45, 1.54, 1.08], [.5, 1.28, 1.28, .88], [.6, 1.02, .94, .66], [.7, .76, .66, .46], [.78, .56, .46, .32], [.86, .38, .32, .21], [.94, .24, .21, .13]];
  const JD = [[0, .11], [.034, .15], [.068, .2], [.1, .26], [.136, .4], [.16, .55]];   /* the lower jaw's depth up from the chin to the tooth row */
  const prof = (s, k) => { if(s <= 0) return PRO[0][k]; for(let n = 1; n < PRO.length; n++) if(s <= PRO[n][0]){ const a = PRO[n - 1], b = PRO[n], t = (s - a[0]) / (b[0] - a[0]); return a[k] + (b[k] - a[k]) * t; } return PRO[PRO.length - 1][k]; };
  const HS = [0, .012, .034, .062, .09, .114, .136, .16];   /* skull stations */
  // the fins, in their own planes. A paddle (x root..tip 0..1, y chord, the leading edge at -y); the fluke (x back along the bent tail, y up):
  // a crescent whose lower lobe, carried by the down-turned vertebrae, is the longer
  const FLIP = [[0, -.13], [.22, -.2], [.45, -.36], [.68, -.44], [.86, -.38], [.98, -.18], [1, .02], [.94, .2], [.8, .32], [.62, .38], [.42, .32], [.22, .2], [0, .13]];
  const FLUKE = [[0, .26], [.4, .78], [.9, 1.36], [1.4, 1.86], [1.82, 2.08], [1.7, 1.5], [1.5, .8], [1.36, .1], [1.56, -.7], [1.98, -1.62], [2.5, -2.38], [2.86, -2.7], [2.2, -2.42], [1.4, -1.6], [.66, -.84], [0, -.26]];

  // ---------------------------------------------------------------- its state
  // vis: drawn this frame; beat; ph: the swim phase; f: tail beats a second; v: its speed through the water; N*: the neck; yaw: the skull
  // turned from the path; roll: banked into a turn; gape (radians); mem: the eye's membrane drawn over (0..1); shine: the eye catches the
  // light; lamp: the tube's lights (they flicker); nearX: its nearest surface (for the snow in front of it)
  const CR = { yawB:0, am:1, shk:0, bow:0, cw:0, cwf:0, pitch:0, flare:0, rollO:NaN, rt:0, flash:0, lk:1, mrim:0, vis:0, beat:-1, ph:0, f:.3, v:0, NX:0, NY:0, NZ:0, pX:0, pY:0, pZ:0, yaw:0, roll:0, hPrev:0, gape:0, mem:0, shine:0, lamp:1, nearX:9, camZ:0, sd:-1, fph:0, steer:0, yawR:0 };
  let EY = .3, SLO = .1, SHI = .6, SILL = .18, SDN = -1, TST = null;   /* the eye's height (uw), the glass band's slopes from it, the side being drawn, the test projection */
  // the path its neck swam: a ring of points every .25 uw; the joints are laid back along it
  const TRN = 512, TRX = new Float64Array(TRN), TRY = new Float64Array(TRN), TRZ = new Float64Array(TRN); let trH = 0, trC = 0;
  function trPush(X, Y, Z){ trH = (trH + 1) % TRN; TRX[trH] = X; TRY[trH] = Y; TRZ[trH] = Z; if(trC < TRN) trC++; }
  function trReset(X, Y, Z, hx, hz){ const l = Math.hypot(hx, hz) || 1; hx /= l; hz /= l; trC = 0; trH = 0; for(let i = Math.ceil((ML + 3) / .25); i >= 1; i--) trPush(X - hx * i * .25, Y, Z - hz * i * .25); CR.pX = X; CR.pY = Y; CR.pZ = Z; CR.hPrev = Math.atan2(hx, hz); }
  function trStep(X, Y, Z){ const dx = X - TRX[trH], dy = Y - TRY[trH], dz = Z - TRZ[trH]; if(dx * dx + dy * dy + dz * dz >= .0625) trPush(X, Y, Z); }
  const JX = new Float64Array(NJ), JY = new Float64Array(NJ), JZ = new Float64Array(NJ), JTX = new Float64Array(NJ), JTY = new Float64Array(NJ), JTZ = new Float64Array(NJ), JS = new Float64Array(NJ);
  // the joints back along the path from the neck, then the swim: a travelling wave across the body (carangiform: the amplitude grows toward
  // the tail, the head nearly still), and the tail bent down from s .8 toward the fluke
  function joints(){ let px = CR.NX, py = CR.NY, pz = CR.NZ, acc = 0, k = 1, i = trH, left = trC, tgt = JSP; JX[0] = px; JY[0] = py; JZ[0] = pz;
    while(k < NJ && left > 0){ const qx = TRX[i], qy = TRY[i], qz = TRZ[i], d = Math.sqrt((qx - px) * (qx - px) + (qy - py) * (qy - py) + (qz - pz) * (qz - pz));
      if(d > 1e-9 && acc + d >= tgt){ const t = (tgt - acc) / d; JX[k] = px + (qx - px) * t; JY[k] = py + (qy - py) * t; JZ[k] = pz + (qz - pz) * t; k++; tgt += JSP * (1 - .2 * CR.cw * Math.exp(-(k - CR.cwf) * (k - CR.cwf) * .5)); continue; }
      acc += d; px = qx; py = qy; pz = qz; i = (i - 1 + TRN) % TRN; left--; }
    for(; k < NJ; k++){ const a = k - 1, b = Math.max(0, k - 2), dx = JX[a] - JX[b], dy = JY[a] - JY[b], dz = JZ[a] - JZ[b], l = Math.hypot(dx, dy, dz) || 1; JX[k] = JX[a] + dx / l * JSP; JY[k] = JY[a] + dy / l * JSP; JZ[k] = JZ[a] + dz / l * JSP; }
    for(let n = 0; n < NJ; n++){ const a = Math.max(0, n - 1), b = Math.min(NJ - 1, n + 1); let tx = JX[a] - JX[b], ty = JY[a] - JY[b], tz = JZ[a] - JZ[b]; const l = Math.hypot(tx, ty, tz) || 1; JTX[n] = tx / l; JTY[n] = ty / l; JTZ[n] = tz / l; JS[n] = SK + n * JST; }
    const AT = .085 * ML * CR.am, LAMB = .95;
    /* the swim wave (its amplitude CR.am: lazy and wide in the stalk, stiff in the commit, thrashing after the bite); the head-shake answered
       down the spine (the neck whips, the trunk counters, the tail lags: CR.shk); the body still coming after the head has stopped (CR.bow) */
    for(let n = 0; n < NJ; n++){ const s = JS[n], q = clamp((s - .17) / .77, 0, 1), amp = .04 + AT * Math.pow(q, 2.1), hl = Math.hypot(JTX[n], JTZ[n]) || 1,
        off = amp * Math.sin(CR.ph - 6.2832 * (s - SK) / LAMB) * (n ? 1 : .3) + CR.shk * (n < 4 ? 1.1 * (1 - n / 4) : -.45 * Math.sin((n - 4) / (NJ - 4) * 3.1416)) + CR.bow * Math.sin(Math.min(1, (s - SK) / .6) * 3.1416);
      JX[n] += JTZ[n] / hl * off; JZ[n] -= JTX[n] / hl * off; if(s > .8) JY[n] -= (s - .8) * ML * .36; }
    for(let n = 0; n < NJ; n++){ const a = Math.max(0, n - 1), b = Math.min(NJ - 1, n + 1); let tx = JX[a] - JX[b], ty = JY[a] - JY[b], tz = JZ[a] - JZ[b]; const l = Math.hypot(tx, ty, tz) || 1; JTX[n] = tx / l; JTY[n] = ty / l; JTZ[n] = tz / l; } }

  // ---------------------------------------------------------------- projection (uw world -> game pixels), through the road's own segments
  const PJ = { x:0, y:0, u:0, d:0 };
  function prj(X, Y, Z){ if(TST){ const T = TST, x0 = X - T.cx, z0 = Z - T.cz, ca = Math.cos(T.yaw), sa = Math.sin(T.yaw), zz = z0 * ca - x0 * sa, xx = z0 * sa + x0 * ca, ce = Math.cos(T.el), se = Math.sin(T.el), yy = (Y - T.cy) * ce + xx * se;
      PJ.x = T.ox + zz * T.k; PJ.y = T.oy - yy * T.k; PJ.u = T.k; PJ.d = 1e5 + xx * 2000; return true; }
    const z = Z * 10, j = Math.floor(z), t = z - j, s = segs[j]; if(!s) return false; const a = s.p1, b = s.p2, c0 = a.camera.z, c1 = b.camera.z;
    if(!(c0 > DEPTH * 300) || !(c1 > 0)) return false; const cz = c0 + (c1 - c0) * t, al = t * c1 / ((1 - t) * c0 + t * c1), uw = DEPTH / cz * KUW();
    PJ.x = (a.screen.x + (b.screen.x - a.screen.x) * al + SDN * X * uw) / PX; PJ.y = (a.screen.y + (b.screen.y - a.screen.y) * al - Y * uw) / PX; PJ.u = uw / PX; PJ.d = cz; return true; }

  // ---------------------------------------------------------------- stations: a cross-section ellipse each (centre, up x half-height, lateral x half-width)
  const NST = 128, QX = new Float64Array(NST), QY = new Float64Array(NST), QZ = new Float64Array(NST), QUX = new Float64Array(NST), QUY = new Float64Array(NST), QUZ = new Float64Array(NST),
    QLX = new Float64Array(NST), QLY = new Float64Array(NST), QLZ = new Float64Array(NST), QS = new Float64Array(NST), QR = new Float64Array(NST),
    PCX = new Float64Array(NST), PCY = new Float64Array(NST), PAX = new Float64Array(NST), PAY = new Float64Array(NST), PBX = new Float64Array(NST), PBY = new Float64Array(NST),
    PD = new Float64Array(NST), PF = new Float64Array(NST), PL = new Float64Array(NST), PP = new Float64Array(NST), PT = new Float64Array(NST), PO = new Float64Array(NST), PV = new Uint8Array(NST),
    ETX = new Float64Array(NST), ETY = new Float64Array(NST), EBX = new Float64Array(NST), EBY = new Float64Array(NST);
  function stSet(i, X, Y, Z, ux, uy, uz, h, lx, ly, lz, w, s){ QX[i] = X; QY[i] = Y; QZ[i] = Z; QUX[i] = ux * h; QUY[i] = uy * h; QUZ[i] = uz * h; QLX[i] = lx * w; QLY[i] = ly * w; QLZ[i] = lz * w; QS[i] = s; QR[i] = h; }
  // fog: eight steps toward the abyss with distance (visibility falls off within a few lengths of the tube); light: the tube's lamps reach
  // only a few metres out (its near surface's distance from the glass)
  const fogAt = d => 7 * clamp(1 - Math.exp(-(d - 5) / 11), 0, 1);
  const litAt = x => TST ? TST.lt : Math.max(CR.beat >= 2 && x < 4.5 ? .75 + .25 * CR.flash : 0, CR.lamp) * CR.lk * Math.max(CR.beat >= 2 ? .45 : .2, Math.exp(-Math.max(0, x - 1.8) / 2.6));   /* (a floor: the vault's glow off the water, so mid-distance it is a lit shape, not a hole; at the glass in the strike, the lamps it is pressed against light it through the flicker) */   /* x: the near surface's distance from the tube's axis */
  function stProj(i){ PV[i] = 0; const X = QX[i], Y = QY[i], Z = QZ[i];
    if(!prj(X + QUX[i], Y + QUY[i], Z + QUZ[i])) return; const tx = PJ.x, ty = PJ.y;
    if(!prj(X - QUX[i], Y - QUY[i], Z - QUZ[i])) return; const bx = PJ.x, by = PJ.y;
    if(!prj(X + QLX[i], Y + QLY[i], Z + QLZ[i])) return;
    PCX[i] = (tx + bx) / 2; PCY[i] = (ty + by) / 2; PAX[i] = (tx - bx) / 2; PAY[i] = (ty - by) / 2; PBX[i] = PJ.x - PCX[i]; PBY[i] = PJ.y - PCY[i]; PD[i] = PJ.d; PP[i] = PJ.u;
    if(Math.abs(PCX[i]) > CW_ * 12 || Math.abs(PCY[i]) > CH_ * 12) return;
    const dz = Z - CR.camZ, dy = Y - EY; PF[i] = TST ? 0 : Math.min(5, fogAt(Math.sqrt(X * X + dy * dy + dz * dz)));   /* (capped: the dark dims it, never takes it away on screen) */ PL[i] = litAt(Math.hypot(X, Y - CY) - .85 * Math.max(Math.hypot(QLX[i], QLZ[i]), Math.abs(QUY[i]))); PV[i] = 1; }
  // a ribbon's silhouette: at each station the edge of its ellipse across the screen direction of the body (the envelope), and the girth angle
  // at the top edge (seen from below, the top edge lies on the near flank: more belly shows)
  function stEdges(a, b){ for(let i = a; i <= b; i++){ if(!PV[i]) continue; const p = i > a && PV[i - 1] ? i - 1 : i, q = i < b && PV[i + 1] ? i + 1 : i, tx = PCX[p] - PCX[q], ty = PCY[p] - PCY[q], tl = Math.hypot(tx, ty);
      let nx = 0, ny = -1; if(tl > 1e-3){ nx = -ty / tl; ny = tx / tl; } let an = PAX[i] * nx + PAY[i] * ny; if(an < 0){ nx = -nx; ny = -ny; an = -an; }
      const bn = Math.abs(PBX[i] * nx + PBY[i] * ny), e = Math.sqrt(an * an + bn * bn);
      ETX[i] = PCX[i] + nx * e; ETY[i] = PCY[i] + ny * e; EBX[i] = PCX[i] - nx * e; EBY[i] = PCY[i] - ny * e; PT[i] = Math.atan2(bn, an + 1e-6) * (QY[i] > (TST ? TST.ey : EY) ? 1 : -1); } }

  // ---------------------------------------------------------------- the raster: per pixel into CB (RGBA) and FB (fog step | 128 where a rim may go)
  let CW_ = 0, CH_ = 0, CB = null, FB = null, CRI = null, CRV = null, CRX = null; const BOX = [0, 0, -1, -1], E = .004;
  function crBufs(){ if(typeof cx === 'undefined' || !cx) return; const cw = cx.canvas.width, ch = cx.canvas.height; if(CRV && CW_ === cw && CH_ === ch) return;
    if(!CRV) CRV = mk(cw, ch); CRV.width = cw; CRV.height = ch; CRX = CRV.getContext('2d', { willReadFrequently:true }); CRI = CRX.createImageData(cw, ch); CB = new Uint32Array(CRI.data.buffer); FB = new Uint8Array(cw * ch); CW_ = cw; CH_ = ch; BOX[2] = -1; }
  // the row's crossings with one edge (into EXN / EXM); the glass wedge from the vanishing point (VPX, VPY in game px; slopes WA_ .. WB_)
  let EXN = 1e9, EXM = -1e9, VPX = 0, VPY = 0, WA_ = 0, WB_ = 1, PANO = false;
  function edgeX(px, py, qx, qy, yc){ if((py <= yc) !== (qy <= yc)){ const x = px + (yc - py) * (qx - px) / (qy - py); if(x < EXN) EXN = x; if(x > EXM) EXM = x; } else if(Math.abs(py - yc) < .5 || Math.abs(qy - yc) < .5){ const x0 = Math.min(px, qx), x1 = Math.max(px, qx); if(x0 < EXN) EXN = x0; if(x1 > EXM) EXM = x1; } }
  function boxAdd(x0, y0, x1, y1){ if(BOX[2] < 0){ BOX[0] = x0; BOX[1] = y0; BOX[2] = x1; BOX[3] = y1; return; } if(x0 < BOX[0]) BOX[0] = x0; if(y0 < BOX[1]) BOX[1] = y0; if(x1 > BOX[2]) BOX[2] = x1; if(y1 > BOX[3]) BOX[3] = y1; }
  // the hide: the countershading line stepped, dark saddles across the back, keeled scales in staggered rows where a scale is 4 px or more
  // (never a speckle further off), three healed rakes behind the fore flipper, the eye (a bony ring, the iris, the pupil that shines amber
  // when the lamps catch it, one glint, the membrane), the nostril, the lips
  function shBody(kind, s, v, th, R, lt, fp){ const n = v <= 0 ? 0 : v >= 1 ? 64 : (v * 64 + .5) | 0, lam = LAM[n];
    const phi = kind === 0 ? th + ACO[n] : kind === 1 ? th + ACO[n] * .75 : 2.36 + ACO[n] * .25;
    if(kind === 1){ const ds = (s - SE) * ML / RE, dp = (phi - PE) * R / RE, d2 = ds * ds + dp * dp;
      if(d2 < 1.55){ if(d2 > 1) return 16 + clamp((.3 + 1.6 * lt) | 0, 0, 2);   /* the sclerotic ring, bone in shadow */
        if(ds + 1 < CR.mem * 2.1) return 48 + clamp((.6 + 3.4 * lt) | 0, 0, 4);   /* the nictitating membrane, drawn from the front */
        if(ds > -.6 && ds < -.22 && dp > -.62 && dp < -.26 && lt > .16) return 37;   /* one glint */
        if(d2 > .3) return 32 + (dp > .2 && lt > .3 ? 2 : 1);   /* the iris: dark amber, lit from below */
        return 32 + (CR.shine > 0 && lt > .2 && dp > -.3 ? clamp((CR.shine * lt * 3.4) | 0, 0, 3) : 0); } }   /* the pupil; the lamps catch it */
    const ramp = kind !== 1 && phi > 1.95 + BW[(s < 0 ? 0 : s > 1 ? 255 : s * 255) | 0] ? 1 : 0;   /* (the skull stays dark hide: only the jaw and throat are pale under it) */
    let sh = ramp ? 2.2 + lam * (1.4 + 3.4 * lt) : 1.2 + lam * (.8 + 3.2 * lt) + .5 * lt;   /* (value: a dark mid-tone mass with form shading; the pale belly and throat; light only where it rakes) */
    if(s > .17 && s < .9){ const q = s * 15 + .35, iq = Math.floor(q), fq = q - iq, bw = .3 + .12 * Math.sin(iq * 2.3), dp = .95 + .3 * Math.sin(iq * 1.7); if(fq < bw && phi < dp + .7 * (1 - Math.abs(fq - bw / 2) / (bw / 2))) sh -= 1.1; }
    if(kind === 1 && s > .123 && s < .16 && Math.abs(phi - PE) < .12) sh -= 1.2;
    const sp = fp * SSZ; if(sp >= 4 && lt > .12){ const rr = phi * R / SSZ, row = Math.floor(rr), fy = rr - row, cc = s * ML / SSZ + (row & 1) * .5, fx = cc - Math.floor(cc), px = 1 / sp;
      if(fy < px * 1.1 && fx > .25 && fx < .75 && lam > .45 && !ramp) sh += .7; }
    if(s > .27 && s < .37 && phi > .8 && phi < 1.8 && fp > 5){ const a = s * ML - 6.1 - (phi - .8) * R * .55, w = .55 / fp; if(Math.abs(a) < w || Math.abs(a - .32) < w || Math.abs(a - .64) < w) sh += 1.7; }
    if(kind === 1 && s > .014 && s < .03 && Math.abs(phi - .62) < .1) sh -= 2;
    if(s > .006 && s < SH - .006){ const q = s * ML / TSP, fq = q - Math.floor(q);   /* the conical teeth showing over the lips, the uppers between the lowers */
      const lo = (Math.floor(q) % 3 === 0) ? .74 : .8;
      if(kind === 1 && v > lo && Math.abs(fq - .5) < .3 * (1 - (v - lo) / (1 - lo))) return 16 + clamp((1.4 + 3 * lt + (fq < .5 ? .8 : 0)) | 0, 1, 5);
      if(kind === 2 && v < .2){ const f2 = fq < .5 ? fq + .5 : fq - .5; if(Math.abs(f2 - .5) < .26 * (1 - v / .2)) return 16 + clamp((1 + 2.6 * lt + (f2 < .5 ? .8 : 0)) | 0, 1, 4); } }
    if(kind === 1 && v > .84 && s < SH + .006) sh -= 2.8; else if(kind === 2 && v < .17 && s < SH + .006) sh -= 2.2;
    if(kind === 2 && s > .134 && s < .16 && v < .5) sh -= 1.2;
    return ramp * 8 + (sh < 0 ? 0 : sh > 7 ? 7 : sh | 0); }
  // inside the mouth (v 0 at the upper tooth row, 1 at the lower): conical teeth, every third a little longer, lit on the leading side; the
  // pterygoid row on the palate behind them, smaller and in shadow; the gums; the throat darkening back toward the hinge
  function shMouth(s, v, op, lt){ if(op < .02) return -1;
    if(s < SH - .004 && s > .003){ const q = s * ML / TSP, iq = Math.floor(q), fq = q - iq, tl = (.22 + (iq % 3 === 0 ? .08 : 0)) / op;
      if(v < tl && Math.abs(fq - .5) < .36 * (1 - v / tl)) return 16 + clamp((2 + 2.6 * lt + (fq < .5 ? 1 : 0)) | 0, 1, 5);
      const q2 = q + .5, f2 = q2 - Math.floor(q2), tl2 = .19 / op; if(v > 1 - tl2 && Math.abs(f2 - .5) < .34 * (1 - (1 - v) / tl2)) return 16 + clamp((1.6 + 2.4 * lt + (f2 < .5 ? 1 : 0)) | 0, 1, 5);
      if(s > .05 && s < .11){ const p = s * ML / .15, f3 = p - Math.floor(p), y0 = .17, tp = .1 / op; if(v > y0 && v < y0 + tp && Math.abs(f3 - .5) < .3 * (1 - (v - y0) / tp)) return 16 + clamp((1 + 1.8 * lt) | 0, 1, 3); } }
    const gum = v < .07 || v > .93; return 24 + clamp(((gum ? 3 : 1.4) + 1.6 * lt * (1 - s / SH * .5) - (v > .3 && v < .75 ? 1 : 0)) | 0, 0, 5); }
  // one quad (a, b: the top edge at stations i, j; c, d: the bottom edge at j, i), inverse-bilinear per pixel: u along, v across
  function quad(i, j, ax, ay, bx, by, cx2, cy2, dx, dy, kind){
    let x0 = Math.floor(Math.min(ax, bx, cx2, dx)), x1 = Math.ceil(Math.max(ax, bx, cx2, dx)), y0 = Math.floor(Math.min(ay, by, cy2, dy)), y1 = Math.ceil(Math.max(ay, by, cy2, dy));
    if(!TST && x1 - x0 > CW_ * .9 && y1 - y0 > CH_ * .9 && Math.min(PD[i], PD[j]) < 1000) return;   /* (a quad as big as the frame right at the camera: the body crossing the camera's plane, never in view through the glass) */
    if(x0 < 0) x0 = 0; if(y0 < 0) y0 = 0; if(x1 > CW_ - 1) x1 = CW_ - 1; if(y1 > CH_ - 1) y1 = CH_ - 1; if(x1 < x0 || y1 < y0) return; boxAdd(x0, y0, x1, y1);
    const ex = bx - ax, ey = by - ay, fx = dx - ax, fy = dy - ay, gx = ax - bx + cx2 - dx, gy = ay - by + cy2 - dy, k2 = gx * fy - gy * fx, kef = ex * fy - ey * fx, lin = Math.abs(k2) < 1e-7, i2k = lin ? 0 : .5 / k2;
    const s0 = QS[i], ds = QS[j] - s0, f0 = PF[i], df = PF[j] - f0, l0 = PL[i], dl = PL[j] - l0, t0 = PT[i], dt = PT[j] - t0, m = kind === 3, r0 = m ? PO[i] : QR[i], dr = (m ? PO[j] : QR[j]) - r0, p0 = PP[i], dp = PP[j] - p0;
    for(let y = y0; y <= y1; y++){ const hy = y + .5 - ay, row = y * CW_, yc = y + .5;
      // this row's span: where it crosses the quad's edges, and (in play) only where the glass can show it
      EXN = 1e9; EXM = -1e9; edgeX(ax, ay, bx, by, yc); edgeX(bx, by, cx2, cy2, yc); edgeX(cx2, cy2, dx, dy, yc); edgeX(dx, dy, ax, ay, yc); if(EXN > EXM) continue;
      let xa = Math.max(x0, Math.floor(EXN) - 1), xb = Math.min(x1, Math.ceil(EXM) + 1);
      if(!TST && PANO){ const up = VPY - yc; if(WA_ > 0 && up > 0){ const hi = up / WA_; xa = Math.max(xa, Math.floor(VPX - hi)); xb = Math.min(xb, Math.ceil(VPX + hi)); } }
      else if(!TST){ const up = VPY - yc; let lo, hi; if(up > 0){ lo = up / WB_; hi = WA_ > 0 ? up / WA_ : 1e9; } else { if(WA_ >= 0) continue; lo = up / WA_; hi = 1e9; }
        if(SDN < 0){ xa = Math.max(xa, Math.floor(VPX - hi)); xb = Math.min(xb, Math.ceil(VPX - lo)); } else { xa = Math.max(xa, Math.floor(VPX + lo)); xb = Math.min(xb, Math.ceil(VPX + hi)); } }
      for(let x = xa; x <= xb; x++){ const hx = x + .5 - ax, k1 = kef + hx * gy - hy * gx, k0 = hx * ey - hy * ex; let v;
        if(lin){ if(k1 === 0) continue; v = -k0 / k1; } else { let w = k1 * k1 - 4 * k0 * k2; if(w < 0) continue; w = Math.sqrt(w); v = (-k1 - w) * i2k; if(v < -E || v > 1 + E) v = (-k1 + w) * i2k; }
        if(v < -E || v > 1 + E) continue; const qx = ex + gx * v, qy = ey + gy * v, u = Math.abs(qx) > Math.abs(qy) ? (hx - fx * v) / qx : (hy - fy * v) / qy; if(u < -E || u > 1 + E) continue;
        const s = s0 + ds * u, lt = l0 + dl * u; let c;
        if(m){ c = shMouth(s, v, r0 + dr * u, lt); if(c < 0) continue; } else c = shBody(kind, s, v, t0 + dt * u, r0 + dr * u, lt, p0 + dp * u);
        let fq = (f0 + df * u + .5) | 0; if(fq > 7) fq = 7; const eye = (c >> 3) === 4; if(eye) fq = fq > 3 ? fq - 3 : 0;
        const p = row + x; CB[p] = LUT[fq * 64 + c]; FB[p] = fq | (m || eye ? 0 : 128 | (Math.min(15, (lt * 15) | 0) << 3)); } } }
  // a fin: a planar shape (local x along a1, y along a2 from o, screen vectors per local unit), shaded by how squarely it faces you and lit
  let FN_D = 1e9;
  function finDraw(shape, bx0, by0, bx1, by1, ox, oy, a1x, a1y, a2x, a2y, fq, lt, face, ramp, keel){ const det = a1x * a2y - a1y * a2x; if(Math.abs(det) < .3) return; const py = Math.hypot(a2x, a2y), dg = !keel && py > 14 && lt > .2;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for(let k = 0; k < 4; k++){ const lx = k & 1 ? bx1 : bx0, ly = k & 2 ? by1 : by0, X = ox + a1x * lx + a2x * ly, Y = oy + a1y * lx + a2y * ly; if(X < x0) x0 = X; if(X > x1) x1 = X; if(Y < y0) y0 = Y; if(Y > y1) y1 = Y; }
    if(x1 - x0 > CW_ * .9 && y1 - y0 > CH_ * .9 && !TST && FN_D < 1000) return;   /* (a fin as big as the frame at the camera's plane) */
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(CW_ - 1, Math.ceil(x1)); y1 = Math.min(CH_ - 1, Math.ceil(y1)); if(x1 < x0 || y1 < y0) return; boxAdd(x0, y0, x1, y1);
    const f = fq > 7 ? 7 : fq < 0 ? 0 : (fq + .5) | 0, base = .6 + face * (1 + 4.4 * lt) + 1.2 * lt;
    for(let y = y0; y <= y1; y++){ const hy = y + .5 - oy, row = y * CW_;
      for(let x = x0; x <= x1; x++){ const hx = x + .5 - ox, lx = (hx * a2y - hy * a2x) / det, ly = (a1x * hy - a1y * hx) / det; if(lx < bx0 || lx > bx1 || ly < by0 || ly > by1 || !inPoly(shape, lx, ly)) continue;
        let sh = base; if(keel){ if(Math.abs(ly) < .13 && lx < 1.3) sh -= .9; else if(ly > .9 || ly < -1.4) sh += .5 * lt; } else { if(ly < -.26) sh += .9 * lt + .2; else if(ly > .24) sh -= .6; if(lx < .3) sh -= .4; else if(dg && lx < .9){ const d = (ly + .42) * 4.2, e = d - Math.round(d); if(Math.abs(e) * py / 4.2 < .55 && d > .5 && d < 3.5) sh -= .8; } }
        const p = row + x; CB[p] = LUT[f * 64 + ramp * 8 + (sh < 0 ? 0 : sh > 7 ? 7 : sh | 0)]; FB[p] = f | 128 | (Math.min(15, (lt * 15) | 0) << 3); } } }

  // ---------------------------------------------------------------- building and drawing the animal
  const WUX = new Float64Array(NJ), WUY = new Float64Array(NJ), WUZ = new Float64Array(NJ), WLX = new Float64Array(NJ), WLY = new Float64Array(NJ), WLZ = new Float64Array(NJ);
  const NB0 = 0, SKS = 96, JWS = 106;   /* station ranges: the body (0..), the skull (96..103), the jaw (106..113) */
  let NBS = 0; const BJ = new Int16Array(NST);   /* body stations used; the joint each station starts from */
  const PRK = new Int8Array(NST), PRI = new Int16Array(NST), PRD = new Float64Array(NST); let NPR = 0;   /* draw list: kind, index, depth */
  const FN = { ox:0, oy:0, a1x:0, a1y:0, a2x:0, a2y:0, face:0, lt:0, fq:0, ok:false };
  const FNS = [{}, {}, {}, {}, {}].map(() => Object.assign({}, FN));   /* (four flippers and the fluke, filled each frame) */
  function frameAt(n, roll, o){ const tx = JTX[n], ty = JTY[n], tz = JTZ[n]; let lx = -tz, lz = tx; const ll = Math.hypot(lx, lz) || 1; lx /= ll; lz /= ll;
    let ux = -ty * tx, uy = 1 - ty * ty, uz = -ty * tz; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul; const c = Math.cos(roll), s = Math.sin(roll);
    WUX[o] = ux * c + lx * s; WUY[o] = uy * c; WUZ[o] = uz * c + lz * s; WLX[o] = lx * c - ux * s; WLY[o] = -uy * s; WLZ[o] = lz * c - uz * s; }
  const eyeX = () => TST ? TST.ex : 0, eyeY = () => TST ? TST.ey : EY, eyeZ = () => TST ? TST.ez : CR.camZ;
  // a fin's plane, projected: root R, long axis D (local x unit), chord axis C (local y unit)
  function finSet(o, Rx, Ry, Rz, Dx, Dy, Dz, Cx, Cy, Cz, lit){ const F2 = FNS[o]; F2.ok = false; if(!prj(Rx, Ry, Rz)) return; const ox = PJ.x, oy = PJ.y, dd = PJ.d;
    if(!prj(Rx + Dx, Ry + Dy, Rz + Dz)) return; const ax = PJ.x - ox, ay = PJ.y - oy; if(!prj(Rx + Cx, Ry + Cy, Rz + Cz)) return;
    F2.ox = ox; F2.oy = oy; F2.a1x = ax; F2.a1y = ay; F2.a2x = PJ.x - ox; F2.a2y = PJ.y - oy; F2.d = dd;
    let nx = Dy * Cz - Dz * Cy, ny = Dz * Cx - Dx * Cz, nz = Dx * Cy - Dy * Cx; const nl = Math.hypot(nx, ny, nz) || 1, vx = Rx - eyeX(), vy = Ry - eyeY(), vz = Rz - eyeZ(), vl = Math.hypot(vx, vy, vz) || 1;
    F2.face = Math.abs((nx * vx + ny * vy + nz * vz) / nl / vl); F2.lt = lit; F2.fq = TST ? 0 : fogAt(vl); F2.ok = true; }
  function flipper(o, n, near, fore){ const tx = JTX[n], ty = JTY[n], tz = JTZ[n], sgn = near ? 1 : -1, b = prof(JS[n], 2), w = prof(JS[n], 3), len = fore ? 3.3 : 2.5;
    // which lateral faces the eye
    const lx0 = WLX[n], ly0 = WLY[n], lz0 = WLZ[n], toE = (eyeX() - JX[n]) * lx0 + (eyeY() - JY[n]) * ly0 + (eyeZ() - JZ[n]) * lz0, ls = (toE >= 0 ? 1 : -1) * sgn, lx = lx0 * ls, ly = ly0 * ls, lz = lz0 * ls;
    const ux = WUX[n], uy = WUY[n], uz = WUZ[n], Rx = JX[n] - ux * b * .55 + lx * w * .72, Ry = JY[n] - uy * b * .55 + ly * w * .72, Rz = JZ[n] - uz * b * .55 + lz * w * .72;
    // the stroke: the paddle swings about the body's long axis (down and out, then up), the fore pair steering into a turn
    const st0 = (fore ? .34 : .26) * Math.sin(CR.fph + (fore ? 0 : 1.9) + (near ? 0 : .5)) + (fore ? CR.steer * ls * (SDN || 1) : 0), st = st0 + (-.62 - st0) * CR.flare, cs = Math.cos(st), sn = Math.sin(st);   /* (CR.flare: the paddles flared down and back in the commit) */
    let px = -ux * .62 + lx * .56, py = -uy * .62 + ly * .56, pz = -uz * .62 + lz * .56; const qx = ty * pz - tz * py, qy = tz * px - tx * pz, qz = tx * py - ty * px;   /* T x P */
    px = px * cs + qx * sn; py = py * cs + qy * sn; pz = pz * cs + qz * sn;
    let Dx = -tx * .55 + px, Dy = -ty * .55 + py, Dz = -tz * .55 + pz; const dl = Math.hypot(Dx, Dy, Dz) || 1; Dx = Dx / dl * len; Dy = Dy / dl * len; Dz = Dz / dl * len;
    const td = (tx * Dx + ty * Dy + tz * Dz) / (len * len); let Cx = tx - Dx * td, Cy = ty - Dy * td, Cz = tz - Dz * td; const cl = Math.hypot(Cx, Cy, Cz) || 1, cw = -len * .62 / cl;
    finSet(o, Rx, Ry, Rz, Dx, Dy, Dz, Cx * cw, Cy * cw, Cz * cw, litAt(Math.hypot(Rx, Ry - CY)) * (near ? 1 : .4)); }
  function fluke(o){ const n = NJ - 1, bx = -JTX[n], by = -JTY[n], bz = -JTZ[n]; let ux = WUX[n], uy = WUY[n], uz = WUZ[n]; const d = ux * bx + uy * by + uz * bz; ux -= bx * d; uy -= by * d; uz -= bz * d; const ul = Math.hypot(ux, uy, uz) || 1;
    finSet(o, JX[n], JY[n], JZ[n], bx, by, bz, ux / ul, uy / ul, uz / ul, litAt(Math.hypot(JX[n], JY[n] - CY) - .2)); }
  // Catmull-Rom between joints (k, k + 1) at t
  const CRp = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3); };
  function crBuild(){ joints(); const cs = Math.cos, sn = Math.sin;
    for(let n = 0; n < NJ; n++) frameAt(n, CR.roll * (1 - .7 * (JS[n] - SK) / (1 - SK)), n);
    // the body: each joint span split so no quad is longer than ~16 px on screen (smooth silhouettes close up), max 6
    NBS = 0; { const a = .02 * ML, s = SK - .02, t1 = prof(s, 1), b1 = prof(s, 2), c = (t1 - b1) / 2, X = JX[0] + JTX[0] * a, Y = JY[0] + JTY[0] * a, Z = JZ[0] + JTZ[0] * a;   /* a station inside the skull: no seam at the neck */
      stSet(NBS, X + WUX[0] * c, Y + WUY[0] * c, Z + WUZ[0] * c, WUX[0], WUY[0], WUZ[0], (t1 + b1) / 2, WLX[0], WLY[0], WLZ[0], prof(s, 3) * .9, s); BJ[NBS] = 0; NBS++; }
    let ok0 = prj(JX[0], JY[0], JZ[0]), x0 = PJ.x, y0 = PJ.y;
    for(let k = 0; k < NJ - 1; k++){ const ok1 = prj(JX[k + 1], JY[k + 1], JZ[k + 1]), x1 = PJ.x, y1 = PJ.y; let sub = ok0 && ok1 ? clamp(Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 22), 1, 4) : 2;
      const a = Math.max(0, k - 1), d = Math.min(NJ - 1, k + 2);
      for(let q = 0; q < sub; q++){ const t = q / sub, X = CRp(JX[a], JX[k], JX[k + 1], JX[d], t), Y = CRp(JY[a], JY[k], JY[k + 1], JY[d], t), Z = CRp(JZ[a], JZ[k], JZ[k + 1], JZ[d], t), s = JS[k] + JST * t,
          ux = WUX[k] + (WUX[k + 1] - WUX[k]) * t, uy = WUY[k] + (WUY[k + 1] - WUY[k]) * t, uz = WUZ[k] + (WUZ[k + 1] - WUZ[k]) * t, lx = WLX[k] + (WLX[k + 1] - WLX[k]) * t, ly = WLY[k] + (WLY[k + 1] - WLY[k]) * t, lz = WLZ[k] + (WLZ[k + 1] - WLZ[k]) * t,
          t1 = prof(s, 1), b1 = prof(s, 2), c = (t1 - b1) / 2;
        stSet(NBS, X + ux * c, Y + uy * c, Z + uz * c, ux, uy, uz, (t1 + b1) / 2, lx, ly, lz, prof(s, 3), s); BJ[NBS] = k; NBS++; }
      ok0 = ok1; x0 = x1; y0 = y1; }
    { const k = NJ - 1, s = JS[k], t1 = prof(s, 1), b1 = prof(s, 2), c = (t1 - b1) / 2; stSet(NBS, JX[k] + WUX[k] * c, JY[k] + WUY[k] * c, JZ[k] + WUZ[k] * c, WUX[k], WUY[k], WUZ[k], (t1 + b1) / 2, WLX[k], WLY[k], WLZ[k], prof(s, 3), s); BJ[NBS] = k; NBS++; }
    for(let i = 0; i < NBS; i++) stProj(i); stEdges(0, NBS - 1);
    // the skull: rigid, from the neck along F (the path's heading at the neck, turned by the yaw); the lower jaw hinged at SH
    let fx = JTX[0], fy = JTY[0] * .5 + CR.pitch, fz = JTZ[0];   /* (CR.pitch: the snout lifting as the jaws open) */ { const c = cs(CR.yaw), s = sn(CR.yaw), x = fx * c - fz * s; fz = fx * s + fz * c; fx = x; const l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l; }
    let lx = -fz, lz = fx; { const l = Math.hypot(lx, lz) || 1; lx /= l; lz /= l; } let ux = -fy * fx, uy = 1 - fy * fy, uz = -fy * fz; { const l = Math.hypot(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l; }
    let ly = 0; { const c = cs(CR.roll), s = sn(CR.roll), a = ux * c + lx * s, b = uy * c, d = uz * c + lz * s, e = lx * c - ux * s, g = -uy * s, h = lz * c - uz * s; ux = a; uy = b; uz = d; lx = e; ly = g; lz = h; }
    const mAt = s => -prof(s, 2) + lerpK(JD, s), g = CR.gape, cg = cs(g), sg = sn(g), mh = mAt(SH), hx = JX[0] + fx * (SK - SH) * ML + ux * mh, hy = JY[0] + fy * (SK - SH) * ML + uy * mh, hz = JZ[0] + fz * (SK - SH) * ML + uz * mh;
    const jux = ux * cg + fx * sg, juy = uy * cg + fy * sg, juz = uz * cg + fz * sg;
    for(let n = 0; n < HS.length; n++){ const s = HS[n], a = (SK - s) * ML, X = JX[0] + fx * a, Y = JY[0] + fy * a, Z = JZ[0] + fz * a, t1 = prof(s, 1), m = mAt(s), b1 = -prof(s, 2), w = prof(s, 3), c = (t1 + m) / 2;
      stSet(SKS + n, X + ux * c, Y + uy * c, Z + uz * c, ux, uy, uz, (t1 - m) / 2, lx, ly, lz, w * .9, s);
      // the jaw: its centre turned about the hinge by the gape (the front swings down)
      const jc = (m + b1) / 2, rx = X + ux * jc - hx, ry = Y + uy * jc - hy, rz = Z + uz * jc - hz, ra = rx * fx + ry * fy + rz * fz, rc = rx * ux + ry * uy + rz * uz, a2 = ra * cg + rc * sg, c2 = rc * cg - ra * sg;
      stSet(JWS + n, hx + fx * a2 + ux * c2, hy + fy * a2 + uy * c2, hz + fz * a2 + uz * c2, jux, juy, juz, (m - b1) / 2, lx, ly, lz, w * .8, s);
      PO[SKS + n] = s < SH ? 2 * (SH - s) * ML * Math.sin(g / 2) : 0; }
    for(let n = 0; n < HS.length; n++){ stProj(SKS + n); stProj(JWS + n); } stEdges(SKS, SKS + HS.length - 1); stEdges(JWS, JWS + HS.length - 1);
    // the fins
    flipper(0, 1, true, true); flipper(1, 4, true, false); flipper(2, 1, false, true); flipper(3, 4, false, false); fluke(4);
    // the near surface (for the snow in front of it)
    let nx = 1e9; for(let k = 0; k < NJ; k += 2) nx = Math.min(nx, Math.abs(JX[k]) - prof(JS[k], 3)); CR.nearX = nx;
    // the draw list, far to near: body spans, the head (mouth, jaw, skull), the far fins before the body, the near after
    NPR = 0;
    for(let i = 0; i < NBS - 1; i++) if(PV[i] && PV[i + 1]) push(0, i, (PD[i] + PD[i + 1]) / 2);
    push(1, 0, PV[SKS + 4] ? PD[SKS + 4] : PD[SKS + 7] || 0);
    for(let o = 0; o < 4; o++) if(FNS[o].ok) push(2, o, FNS[o].d + (o < 2 ? -2400 : 2400));
    if(FNS[4].ok) push(3, 4, FNS[4].d);
    for(let i = 1; i < NPR; i++) for(let j = i; j > 0 && PRD[j] > PRD[j - 1]; j--){ let t = PRK[j]; PRK[j] = PRK[j - 1]; PRK[j - 1] = t; t = PRI[j]; PRI[j] = PRI[j - 1]; PRI[j - 1] = t; const d = PRD[j]; PRD[j] = PRD[j - 1]; PRD[j - 1] = d; } }
  function push(k, i, d){ PRK[NPR] = k; PRI[NPR] = i; PRD[NPR] = d; NPR++; }
  function crRaster(){ for(let n = 0; n < NPR; n++){ if(DBG.mode === 4) break; const k = PRK[n], i = PRI[n];
      if(k === 0) quad(i, i + 1, ETX[i], ETY[i], ETX[i + 1], ETY[i + 1], EBX[i + 1], EBY[i + 1], EBX[i], EBY[i], 0);
      else if(k === 1){ const L2 = HS.length;
        if(CR.gape > .02) for(let a = SKS; a < SKS + L2 - 1; a++){ const b = a + 1, ja = a - SKS + JWS, jb = ja + 1; if(PV[a] && PV[b] && PV[ja] && PV[jb] && PO[a] > .02) quad(a, b, EBX[a], EBY[a], EBX[b], EBY[b], ETX[jb], ETY[jb], ETX[ja], ETY[ja], 3); }
        for(let a = JWS; a < JWS + L2 - 1; a++) if(PV[a] && PV[a + 1]) quad(a, a + 1, ETX[a], ETY[a], ETX[a + 1], ETY[a + 1], EBX[a + 1], EBY[a + 1], EBX[a], EBY[a], 2);
        for(let a = SKS; a < SKS + L2 - 1; a++) if(PV[a] && PV[a + 1]) quad(a, a + 1, ETX[a], ETY[a], ETX[a + 1], ETY[a + 1], EBX[a + 1], EBY[a + 1], EBX[a], EBY[a], 1); }
      else { const F2 = FNS[i]; FN_D = F2.d; if(k === 2) finDraw(FLIP, 0, -.5, 1, .5, F2.ox, F2.oy, F2.a1x, F2.a1y, F2.a2x, F2.a2y, F2.fq, F2.lt, F2.face, 0, false);
        else finDraw(FLUKE, 0, -2.8, 2.9, 2.1, F2.ox, F2.oy, F2.a1x, F2.a1y, F2.a2x, F2.a2y, F2.fq, F2.lt, .35 + .65 * F2.face, 7, true); } }
    // the rim: a one-pixel line where it meets the light from above (the surface's glow), fading slower than the body with distance
    if(BOX[2] < 0) return; const x0 = BOX[0], x1 = BOX[2], y0 = Math.max(1, BOX[1]), y1 = BOX[3];
    for(let y = y0; y <= y1; y++){ const row = y * CW_; for(let x = x0; x <= x1; x++){ const p = row + x, f = FB[p]; if(!(f & 128) || CB[p - CW_]) continue; const fq = f & 7, lq = (f >> 3) & 15, rf = fq > 2 + CR.mrim ? fq - 2 - CR.mrim : 0; CB[p] = LUT[rf * 64 + 40 + Math.max(CR.mrim, lq > 7 ? 4 : lq > 3 ? 3 : fq < 3 ? 2 : 1)]; } }   /* (the tube's lamps catch its back: brighter the nearer it is) */
    for(let y = y0; y < y1; y++){ const row = y * CW_; for(let x = x0 + 1; x < x1; x++){ const p = row + x, f = FB[p]; if(!(f & 128) || !CB[p - CW_] || (CB[p - 1] && CB[p + 1] && CB[p + CW_])) continue; const c = CB[p]; if((c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255) > 96) continue; CB[p] = LUT[(f & 7) * 64 + 40]; } } }   /* (its other edges, where the mass is dark: one step above the void, so the outline holds) */
  function crClear(){ if(BOX[2] < 0 || !CB) return; const x0 = BOX[0], w = BOX[2] - BOX[0] + 1; for(let y = BOX[1]; y <= BOX[3]; y++){ CB.fill(0, y * CW_ + x0, y * CW_ + x0 + w); FB.fill(0, y * CW_ + x0, y * CW_ + x0 + w); } BOX[2] = -1; }
  // into the sea buffer (its context b is in screen pixels, 1/PX)
  function crDraw(b){ crClear(); SDN = 1; VPX = F.vpx / PX; VPY = HZ / PX; PANO = F.pano; WA_ = PANO ? SILL - .1 : SLO - .12; WB_ = SHI + .15; crBuild(); crRaster(); if(BOX[2] < 0) return; const x = BOX[0], y = BOX[1], w = BOX[2] - x + 1, h = BOX[3] - y + 1;
    CRX.putImageData(CRI, 0, 0, x, y, w, h); b.drawImage(CRV, x, y, w, h, x * PX, y * PX, w * PX, h * PX); }

  // ---------------------------------------------------------------- the abyss: a backdrop around the vanishing point (built per canvas size)
  // Seen through the glass (which looks up into the sea: the eye sits low in the tube), black-blue everywhere; a teal haze where lines of
  // sight run along the lit tube (toward the far end), a cold glow from the surface near the top of the band; stepped, the steps' edges
  // in an ordered pattern (no noise)
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bgBuild(){ if(!CW_) return; const cw = CW_, ch = CH_, w = cw * 2, h = ch * 2; if(!S.BG) S.BG = mk(w, h); if(S.BG.width !== w || S.BG.height !== h){ S.BG.width = w; S.BG.height = h; }
    const k = S.BG.getContext('2d'), img = k.createImageData(w, h), D32 = new Uint32Array(img.data.buffer), u32 = c => { const v = hx(c); return ((255 << 24) | (v[2] << 16) | (v[1] << 8) | v[0]) >>> 0; };
    const HZC = ['#02060b', '#03090f', '#050d14', '#08121a', '#0b1820'].map(u32), GLC = ['#02060b', '#0a1828', '#12263c', '#1c3854'].map(u32), FOC = cw / 2 * DEPTH;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const dx = x - cw + .5, up = ch - y - .5, th = (BAY[(y & 3) * 4 + (x & 3)] + .5) / 16;
      const r = Math.hypot(dx / (cw * .62), up / (ch * .62)), hz = Math.max(0, 1 - r), lh = Math.min(4, Math.max(0, Math.floor(hz * hz * 4.6 + th - .5)));
      const el = Math.atan2(up, Math.hypot(FOC, dx)), lg = Math.min(3, Math.max(0, Math.floor((el - .12) / .11 + th - .5)));   /* the glow from the surface by how steeply the line of sight looks up */
      D32[y * w + x] = lg > 0 && (lg >= lh * .8) ? GLC[lg] : HZC[lh]; }
    k.putImageData(img, 0, 0); S.bgFor = cw + 'x' + ch + ':' + SHI.toFixed(2); }

  // ---------------------------------------------------------------- marine snow and the light shafts (world points beyond the glass)
  const NSN = 120, SNX = new Float32Array(NSN), SNY = new Float32Array(NSN), SNZ = new Float32Array(NSN), SNS = new Int8Array(NSN), SVX = new Float32Array(NSN), SVY = new Float32Array(NSN), SVZ = new Float32Array(NSN);
  const SNB = [new Int16Array(NSN), new Int16Array(NSN), new Int16Array(NSN), new Int16Array(NSN)], SNN = [0, 0, 0, 0], SNC = ['#1c3a44', '#2e5a66', '#5a98a6', '#a4dce4'];
  let snOn = false, snSeed = 1;
  const RNG = () => { snSeed = (snSeed * 16807) % 2147483647; return snSeed / 2147483647; };
  function snSpawn(i, z0, z1){ SNS[i] = RNG() < .5 ? -1 : 1; const X = 1.85 + Math.pow(RNG(), 1.5) * 6.5; SNX[i] = X; SNY[i] = EY + X * lerp(SLO, SHI, RNG()); SNZ[i] = CR.camZ + lerp(z0, z1, RNG()); SVX[i] = SVY[i] = SVZ[i] = 0; }
  // drift and sink; the animal's passing drags the water along its body and curls it behind (its wake); a pressure wave shoves it all
  function snStep(dt, wake){ if(!snOn){ for(let i = 0; i < NSN; i++) snSpawn(i, .2, 16); snOn = true; } const dmp = Math.exp(-dt * .7);
    for(let i = 0; i < NSN; i++){ const r = SNZ[i] - CR.camZ; if(r < .15 || r > 17) snSpawn(i, 8, 16);
      if(wake && CR.vis) for(let k = 2; k < NJ; k += 3){ const dx = SNS[i] * SNX[i] - JX[k], dy = SNY[i] - JY[k], dz = SNZ[i] - JZ[k], d2 = dx * dx + dy * dy + dz * dz; if(d2 > 42) continue; const d = Math.sqrt(d2), f = (1 - d / 6.5) * Math.min(14, CR.v) * .9 * dt;
        SVX[i] += SNS[i] * (JTX[k] * .5 + dz / (d + .5) * .9) * f; SVY[i] += (dy > 0 ? .25 : -.25) * f; SVZ[i] += (JTZ[k] * .5 - dx / (d + .5) * .9) * f; }
      SNX[i] = Math.max(1.8, SNX[i] + SVX[i] * dt); SNY[i] += (SVY[i] - .05) * dt; SNZ[i] += SVZ[i] * dt; SVX[i] *= dmp; SVY[i] *= dmp; SVZ[i] *= dmp; } }
  function snJolt(k){ for(let i = 0; i < NSN; i++){ SVX[i] += (RNG() - .3) * 2.4 * k; SVY[i] += (RNG() - .5) * 1.2 * k; } }
  function snDraw(b){ SNN[0] = SNN[1] = SNN[2] = SNN[3] = 0; const sv = SDN;
    for(let i = 0; i < NSN; i++){ SDN = SNS[i]; if(!prj(SNX[i], SNY[i], SNZ[i])) continue; const x = PJ.x | 0, y = PJ.y | 0; if(x < 0 || y < 0 || x >= CW_ || y >= CH_) continue;
      if(CR.vis && SNS[i] === CR.sd && SNX[i] > CR.nearX && CB[y * CW_ + x]) continue;
      const l = CR.lamp * Math.exp(-(SNX[i] - 1.8) / 1.5) * (SNZ[i] - CR.camZ < 9 ? 1 : .6), c = l > .62 ? 3 : l > .32 ? 2 : l > .13 ? 1 : 0; SNB[c][SNN[c]++] = i; PXS[i] = x; PYS[i] = y; }
    SDN = sv; for(let c = 0; c < 4; c++){ if(!SNN[c]) continue; b.fillStyle = SNC[c]; for(let n = 0; n < SNN[c]; n++){ const i = SNB[c][n]; b.fillRect(PXS[i] * PX, PYS[i] * PX, PX, PX); } } }
  const PXS = new Int16Array(NSN), PYS = new Int16Array(NSN);
  // the shafts: faint vertical light from the surface, dying a short way down (world-placed, so they slide past with real parallax)
  const NSH = 14, SHX = new Float32Array(NSH), SHZ = new Float32Array(NSH), SHS = new Int8Array(NSH), SHW = new Float32Array(NSH); let shOn = false;
  function shSpawn(i, z0, z1){ SHS[i] = i & 1 ? 1 : -1; SHX[i] = 2.6 + RNG() * 9; SHZ[i] = CR.camZ + lerp(z0, z1, RNG()); SHW[i] = .18 + RNG() * .3; }
  function shDraw(b, a){ if(!shOn){ for(let i = 0; i < NSH; i++) shSpawn(i, 1, 26); shOn = true; } const sv = SDN;
    for(let i = 0; i < NSH; i++){ const r = SHZ[i] - CR.camZ; if(r < .4 || r > 30) shSpawn(i, 16, 28); SDN = SHS[i];
      const X = SHX[i]; if(!prj(X, EY + X * SHI, SHZ[i])) continue; const x = PJ.x, y0 = PJ.y, w = Math.max(1, Math.round(SHW[i] * PJ.u)), hgt = X * .3 * PJ.u;
      b.fillStyle = rgbaA('104,168,184', a * .1); b.fillRect(Math.round(x) * PX, Math.round(y0) * PX, w * PX, Math.round(hgt * .45) * PX);
      b.fillStyle = rgbaA('104,168,184', a * .05); b.fillRect(Math.round(x) * PX, Math.round(y0 + hgt * .45) * PX, w * PX, Math.round(hgt * .55) * PX); }
    SDN = sv; }

  /* ================================================================ built in warm(): the cracks' glass sprites, the school, the silt,
     the palette's LUT, the animal's buffers, the backdrop */
  function build(){ if(S.ok || typeof cx === 'undefined' || !cx) return; const AQ = ENV.aqua && ENV.aqua.win;
    S.crack = []; for(let st = 0; st < 4; st++) S.crack.push(glassSet(crackGrid(st), CW, CH, CRK));
    S.sch = [-1, 1].map(d => [0, 1].map(fr => schoolCanvas(d, fr)));
    S.silt = [1, 2, 3].map(siltCanvas); S.siltP = S.silt.map(c => { cx.drawImage(c, 0, 0, 1, 1); return cx.createPattern(c, 'no-repeat'); });
    lutBuild(); tabBuild(); seaBufs(); S.M = new DOMMatrix(); S.ok = true; void AQ; }
  // silt and blood-dark water kicked off the glass by the ram: billows of stepped dither, brown silt with darker red in the cores, three
  // densities (the cloud thickens, then thins); opaque pixels only
  function siltCanvas(d){ const w = 220, h = 150, c = mk(w, h), k = c.getContext('2d'), img = k.createImageData(w, h), D = img.data, B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const blobs = []; for(let n = 0; n < 9; n++) blobs.push([w * (.2 + .6 * H1(n * 3.3)), h * (.25 + .5 * H1(n * 5.9)), 22 + 30 * H1(n * 7.1)]);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let v = 0; for(const [bx, by, r] of blobs){ const q = 1 - Math.hypot(x - bx, (y - by) * 1.4) / r; if(q > v) v = q; }
      v += .12 * Math.sin(x * .21 + y * .13) + .08 * Math.sin(x * .07 - y * .3); const th = (B[(y & 3) * 4 + (x & 3)] + .5) / 16, den = v * [0, .7, 1.05, 1.4][d];
      if(den > th){ const core = den > .9 + th * .3, i = (y * w + x) * 4, col = core ? (H1(x * .9 + y) < .5 ? [26, 6, 9] : [20, 8, 10]) : [24, 20, 16]; D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = 255; } }
    k.putImageData(img, 0, 0); return c; }

  // ---------------------------------------------------------------- the plan (placement)
  const plans = []; let lastI = -1;
  const zoneStart = z => z > 0 ? gates[2 * z - 1] : 0;
  /* Placement: once, when an Aqua-Line road begins (its gates are laid ~2000 segments ahead, so its fork and border are known), find the
     longest clear stretch on it, before the fork's split window or after it, and lay a long bore of 340..520 segments there (env/aqua.js
     boreSet: any start, its approach and exit kept open). The beat sheet (U, written for 520) is stretched to the bore's length. */
  const LMIN = 300, LMAX = 1900, RAx = 70;
  /* An Aqua-Line visit that could host it gets a longer stretch before its fork (the core asks GATE_EXTRA(n) before laying gate n; the fork
     gate of zone z is gate 2z), so the full ~35 s tube fits; GATE_TIME(n) gives the clock the extra seconds that stretch takes. Laid when the
     road is generated, before anyone knows which branch the rider takes: either branch into Aqua-Line lengthens that zone. */
  const EXTRA_SEG = 1400, EXT = new Set();
  window.GATE_EXTRA = n => { if(n === 0) EXT.clear(); if(n % 2 || typeof LANDS === 'undefined') return 0; const z = n / 2, aq = LANDS.findIndex(l => l.key === 'aqua'); let can = false;
    try{ can = z === 0 ? landIdx(0) === aq : forkChoices(z - 1).includes(aq); }catch(e){ can = false; } if(!can) return 0; EXT.add(n); return EXTRA_SEG; };
  window.GATE_TIME = n => EXT.has(n) ? Math.round(EXTRA_SEG / 55 * 1.1) : 0;   /* bore length range; the approach kept open before it (the dive cutting and a little bridge) */
  function findRange(z, minS){ if(typeof gates === 'undefined' || gates[2 * z] === undefined) return null;   /* (the border may not be laid yet: then only the stretch before the fork) */ const zs = zoneStart(z), G = gates[2 * z], bd = gates[2 * z + 1];
    const SPL = typeof SPLIT_ON !== 'undefined' && SPLIT_ON, pre = typeof SPLIT_PRE === 'number' ? SPLIT_PRE : 110, post = typeof SPLIT_POST === 'number' ? SPLIT_POST : 380;
    const st = SPL ? [[zs + 20, G - pre - 31]] : [[zs + 20, G - 70]]; if(bd !== undefined) st.push(SPL ? [G + post + 1, bd - 40] : [G + 40, bd - 40]);
    let best = null;
    if(z === 0) st[0][0] = -RAx;   /* the first road: the bore can start the ride (the game already starts some rides inside a bore; the dive is then inside it) */
    for(const [s0q, s1] of st){ const s0 = z === 0 && s0q < 0 ? s0q : Math.max(s0q, minS || 0), a = s0 + RAx, L = Math.min(LMAX, s1 - 25 - a); if(L < LMIN || (best && L <= best.L)) continue;
      let ok = true;
      if(ok && window.inForkWindow && inForkWindow(a - RAx, a + L + 20)) ok = false;
      for(const g of gates) if(g >= Math.max(1, a - RAx) && g <= a + L + 20) ok = false;
      { const J = MECH.sp_jump, q = Math.max(0, a - RAx); if(ok && J && J.clearAfter && J.clearAfter(q) !== q) ok = false; }
      if(ok) best = { a, L }; }
    return best; }
  const decided = new Map();
  function plan(i){ if(typeof zoneOfSeg !== 'function' || typeof gates === 'undefined') return; const z = zoneOfSeg(i + 1), L0 = LANDS[landIdx(z)]; if(!L0 || L0.key !== 'aqua') return;
    const zs = zoneStart(z); if(i + 1 < zs || i > zs + 60 || decided.has(zs)) return;   /* on the segment before the road begins (retried into it while its border is not laid yet) */
    const r = findRange(z, i + 6); if(!r){ if(gates[2 * z + 1] !== undefined) decided.set(zs, null); return; } decided.set(zs, r);
    /* the booking: the combined event (the mosasaur, then the flood its bite lets in: 'abyss') when the bore is long enough and the director
       gives it this visit; else the mosasaur alone (decided on the segment before the road begins: its visit and road are named) */
    const o = { seg:r.a + Math.round(U.ram * r.L / LMAX), visit:zs, road:'aqua' }, FL = MECH.sp_flood;
    let bid = null; if(!DIR) bid = ID; else if(r.L >= 1300 && FL && FL.combine && DIR.request(AB, o)) bid = AB; else if(DIR.request(ID, o)) bid = ID; if(!bid) return;
    const p = add(r.a, r.L, zs, bid === AB); p.bid = bid; p.di = i; boreSet(r.a, r.a + r.L, true);
    if(p.ab) p.fl = FL.combine(p.T + p.L - FL.LEN, 1, -1, zs); }
  const boreSet = (a, b, on) => { const A = ENV.aqua && ENV.aqua.win; if(A && A.boreSet) A.boreSet(a, b, on); };
  // the rider's distance into the bore, as beat time: the approach as it is, the bore stretched to the 520 the beat sheet is written for
  const ubOf = (p, uR) => uR < 0 ? uR : uR <= p.ramSeg ? uR * U.ram / p.ramSeg : uR <= p.L ? U.ram + (uR - p.ramSeg) * (LMAX - U.ram) / (p.L - p.ramSeg) : LMAX + uR - p.L;
  const segOf = (p, u) => u < 0 ? u : u <= U.ram ? u * p.ramSeg / U.ram : u <= LMAX ? p.ramSeg + (u - U.ram) * (p.L - p.ramSeg) / (LMAX - U.ram) : p.L + u - LMAX;
  function add(T, L, vk, ab){ const sc = L / LMAX, rs = Math.round(ab ? L - 672 : Math.min(L * .695, L - 150)), p = { T, L, vk, ab:!!ab, ramSeg:rs, kr:rs + 20, off:false, cut:null, lastU:null, eyeT:0, ram:false, rammed:-1, rammed2:-1, kr2:0, rtA:0, jets:JETS.concat(JETS).map(k => ({ k:Math.round(k * sc), t0:-1, sd:-1, crack:-1, on:-1, reach:-.62, full:-.62, hit:false, passed:false })), card:false, cardT:-1, done:false, thin:false, beat:0, dust:false };
    p.jets[1].full = p.jets[3].full = -.08; p.jets[1].reach = p.jets[3].reach = -.08; plans.push(p); if(plans.length > 6) plans.shift(); return p; }
  function placeSeg(i, s){ for(const p of plans){ if(p.off) continue; const k = i - p.T;
      if(k === 0) s.mgPlan = p;
      if(k === p.L - 1) boreSet(p.T, p.T + p.L, true);   /* the whole bore is placed: clean anything an earlier labelling of these segments left (a re-placed road) */
      const pa = Math.round(segOf(p, U.pv0)), pb = Math.round(segOf(p, U.pv1));   /* the viewing section: no slot windows there (the vault replaces them) */
      if(k >= pa && k < pb){ s.mgPano = p; s.aqWin = 0; } else if(k >= U.win0 && k < p.L - 20) s.aqWin = k === U.win0 || k === pa - 1 || k === pb || k === p.L - 21 ? 2 : 1;
      if(k >= 0 && k < p.L) s.aqQuiet = 1; } }
  const live = p => !p.off && segs[p.T] && segs[p.T].mgPlan === p;
  function active(pp){ for(const p of plans) if(live(p) && pp >= p.T + U.app - 10 && pp <= p.T + p.L + 160) return p; return null; }

  // ---------------------------------------------------------------- the frame's state (set in update, read by every draw hook)
  // school: 0..1 through its passing (-1 none); dark: how far the sea has sunk to black (stepped in eighths); wob: the panes' wobble after
  // the pressure wave; fin: the swell in the cutting; silt; crackK: each crack's stage
  const F = { school:-1, schX:0, dark:0, wob:0, sd:-1, p:null, u:-1e9, crackK:[-1, -1, -1, -1, -1, -1], fin:0, shakeZ:0, silt:-1, siltT:0, rx:0, ry:0, vpx:0, pano:false };
  // a ring's glass on wall sd: how far it sits inside the screen from that wall's side (canvas px; > 0 is on screen)
  const onScr = (s, sd) => { const uw = s.p1.screen.scale * KUW(), x = s.p1.screen.x + sd * RR * uw * Math.sin(1.45); return sd < 0 ? x : W - x; };
  // the outer wall of the bend ahead: the side whose glass is well placed (in from the edge, not yet hidden by the tube's curve) over more rings
  // (a wall's far glass is hidden behind its nearer stretch unless it keeps coming further in from that wall's side: the running max)
  function outerSide(pp, cur){ const b = Math.floor(pp); let L = 0, R = 0, ml = -1e9, mr = -1e9; for(let n = 4; n < 90; n++){ const s = segs[b + n]; if(!s || !s.p1.screen.scale) break; const l = onScr(s, -1), r = onScr(s, 1);
      if(l >= ml){ ml = l; if(n >= 10 && l > W * .12 && l < W * .45) L++; } if(r >= mr){ mr = r; if(n >= 10 && r > W * .12 && r < W * .45) R++; } }
    /* the wall whose visible glass reaches further into the screen faces you (the outer wall); near-equal (straight): keep */
    ml = Math.min(ml, W * .6); mr = Math.min(mr, W * .6); return ml > mr + W * .06 ? -1 : mr > ml + W * .06 ? 1 : cur; }
  // the glass band as seen from the eye. The eye sits low in the tube (its height in the tube's units depends on the screen's shape), so the
  // windows look UP into the sea: anything seen through them lies between these slopes (height over distance out)
  function band(){ EY = CAMH / ROADW * H / Math.max(1, W); SLO = (CY + RR * Math.cos(1.72) - EY) / (RR * Math.sin(1.72)); SHI = (CY + RR * Math.cos(1.28) - EY) / (RR * Math.sin(1.28)); SILL = (CY + RR * Math.cos(GA) - EY) / (RR * Math.sin(GA)); }
  /* ONE animal, ONE path. It always has a place in the water and moves only by swimming; every beat is a point on this path. The path is
     authored as key points (u: beat time; X: out from the tube's axis, on the bite side S when positive, so it crosses over the crown when
     it changes sign; Y: up; R: ahead of the camera), turned into WORLD positions (the camera's place at that u, plus R), and run through a
     Catmull-Rom spline in world space: the speed and the turns are what a swimmer of this size can do, the body follows the path its neck
     swam. It only ever enters or leaves the view by swimming across a screen edge (off the side, over the top of the vault, past you);
     the dark water dims it with distance but never takes it away while it is on screen (its fog is capped).
       300..650   off the far side, high: in over the top of the vault, across the crown ahead (the shadow), out over the bite side
       650..870   out of view it banks round and comes back in from that same side, at the edge of what you can see (the silhouette)
       870..1150  it swims along the side glass with you, a little slower, drifting back across the view (the pass: the whole swim),
                  and off past the edge behind you
       1150..1296 the quiet: an empty vault, marine snow, a lamp stutter 0.4 s before
       1296..1320 the jumpscare: in from off screen at the side, dead straight across the tube's axis, jaws opening: it grabs the glass
       1320..1720 it recoils, turns away and swims off past the edge of the view on the bite side, out into the dark */
  const wrapA = a => a - 6.2832 * Math.round(a / 6.2832);
  const BA = 1.32;   /* the bite's place on the glass: an angle from the crown, up the side of the vault, high enough that the lower jaw clears the sill (the crack lands at the upper jaw) */
  const KP = [[300, -30, 7.5, 20], [380, -16, 6.8, 18], [460, -5, 6, 15], [520, 2, 5.6, 13], [590, 10, 5.2, 12], [650, 20, 4.6, 12], [700, 27, 4, 15],
    [760, 25, 3.4, 21], [820, 17, 3, 22], [870, 11, 2.6, 21], [920, 7.4, 2.4, 18], [970, 6.6, 2.3, 14], [1020, 4, 2.3, 11.2], [1070, 3.2, 2.3, 10.6],
    [1110, 3.2, 2.3, 10], [1150, 3.4, 2.3, 10], [1190, 3.4, 2.3, 2], [1230, 3.4, 2.3, -6]];
  /* PE1: the path ends (it has swum off past the edge behind you); UB0: the jumpscare bursts in (the quiet between, ~1.5 s at speed) */
  const PE1 = 1212, UB0 = 1296;
  const PA0 = 300, PA1 = 1720, KW = new Float64Array(KP.length * 3);
  const camAt = (p, u) => (p.T + segOf(p, u)) * .1 - PZ / SEG * .1;   /* the camera's place (uw) when the rider reaches beat time u */
  function pathPrep(p){ if(p.kpOk) return; for(let i = 0; i < KP.length; i++){ const k = KP[i]; KW[i * 3] = k[1] * p.bs; KW[i * 3 + 1] = k[2]; KW[i * 3 + 2] = camAt(p, k[0]) + k[3]; } p.kpOk = true; }
  const PQO = [0, 0, 0];
  function pathAt(p, u){ pathPrep(p); let i = 0; while(i < KP.length - 2 && KP[i + 1][0] <= u) i++; const t = clamp((u - KP[i][0]) / (KP[i + 1][0] - KP[i][0]), 0, 1), a = Math.max(0, i - 1), d = Math.min(KP.length - 1, i + 2);
    for(let c = 0; c < 3; c++) PQO[c] = CRp(KW[a * 3 + c], KW[i * 3 + c], KW[(i + 1) * 3 + c], KW[d * 3 + c], t); return PQO; }
  // the bite side: the wall the bite stretch curves away from (its glass swings into the middle of the view); decided once
  function biteSide(p){ let c = 0; const a = Math.round(p.T + segOf(p, 1150)), b = Math.round(p.T + segOf(p, 1320)) + 50; for(let i = a; i < b; i++) if(segs[i]) c += segs[i].curve || 0; return Math.abs(c) > 2 ? (c > 0 ? -1 : 1) : (p.side || 1); }
  const HFX = -.6, HFZ = .8, FRX = -.89, FRZ = -.45;   /* the head turned in toward the glass while it paces you; the strike comes back toward you, into the glass ahead */
  /* US0: it stops beside the glass and lets you pass. S2: the second strike, in real seconds since the first contact (out: strike 1 has
     swum off across the edge; burst: strike 2 bursts in from the other side; hit: its contact) */
  const SIL0 = 3.1, SIL1 = 6.1, US0 = 1040,   /* (SIL: the combined event's last silhouette, seconds after the second bite; before the flood's heaviest stretch) */
    US1 = 0, S2 = { out:1.95, burst:2.2, hit:2.65 }, S2A = { out:1.5, d0:102, d1:88, d2:64 };   /* (S2A: the combined event's strike 2, by position: the telegraph, the burst and the contact this many segments before its ring, which is the flood's first torrent's pane: it lands 64 ahead so its cracks spread and spray in view before the pane bursts) */
  // the jumpscare charge: in from off screen on side sd, dead straight across the tube's axis to the ring kr, the jaws opening as it comes
  function burstPose(p, t, sd, kr){ const Zr = (p.T + kr + .5) * .1, Yr = CY + RR * Math.cos(BA) + .05, a = SK * ML, gx = (RR * Math.sin(BA) + .15 + a) * sd;
    PQO[0] = lerp(gx + 15 * sd, gx, t); PQO[1] = Yr; PQO[2] = Zr; CR.am = .45; CR.fOv = 2.6; CR.flare = 1;
    const o = sm((t - .3) / .6); CR.gape = Math.max(CR.gape, 1.15 * o); CR.pitch = .22 * o; CR.mem = t > .86 ? 1 : 0; CR.shine = 1; }
  /* CONTACT, THE BITE, RELEASE (real seconds since contact; the slow-motion hold does not stretch the hit-stop):
       0..67 ms   hit-stop: everything holds, jaws wide on the glass (the camera and tube shake land on the same frame)
       67..200    the jaws clamp; a compression wave runs from the head down the body; the body, still coming, bows
       200..1000  the head-shake: the head whips side to side at ~5.5 Hz, decaying; the trunk counters; the tail thrashes; the glass cracks
       1000..1300 it lets go: the jaws open, it rolls away showing its pale belly, a heavy tail sweep
       then       away from the glass and off across the edge of the view on its side (quickly after the first strike) */
  function bitePose(p, rt, sd, n, last, out){ out = out || S2.out; n = n || [6 * sd, 1, CR.camZ + 4]; const e1 = sm((rt - 1) / .8), e2 = last ? sm((rt - 1.3) / 3) : sm((rt - 1.15) / (out - 1.15)),
      sh = rt > .2 && rt < 1.05 ? .55 * Math.sin((rt - .2) * 34.6) * (1 - .7 * sm((rt - .2) / .8)) * (1 - sm((rt - .95) / .1)) : 0;
    PQO[0] = n[0] + sd * (5 * e1 + 30 * e2); PQO[1] = n[1] + .6 * e1 + 1.5 * e2; PQO[2] = n[2] + 2 * e1 + (last ? 22 : 6) * e2 + (rt < 1 ? .05 * sh : 0);
    CR.hold = rt < .067; CR.shk = reduce ? sh * .3 : sh; CR.bow = rt > .067 ? .55 * (1 - sm((rt - .067) / .4)) : 0;
    if(rt > .067 && rt < .5){ CR.cw = 1 - sm((rt - .3) / .2); CR.cwf = (rt - .067) / .35 * NJ; } else CR.cw = 0;
    CR.yawB = CR.shk * .6;
    CR.gape = rt < .067 ? 1.15 : rt < .2 ? lerp(1.15, .35, sm((rt - .067) / .133)) : rt < 1 ? .35 + .05 * Math.sin(rt * 30) : lerp(.35, .02, sm((rt - 1.15) / .4)) + .5 * Math.sin(Math.min(1, (rt - 1) / .3) * 3.1416);
    CR.pitch = rt < .2 ? .22 * (1 - sm((rt - .067) / .133)) : 0; CR.mem = rt < 1 ? 1 : 0; CR.shine = 1;
    CR.am = rt < .2 ? .4 : rt < 1 ? 1.5 : lerp(1.6, 1, sm((rt - 1.3) / 1)); CR.fOv = rt < .2 ? 0 : rt < 1.6 ? 2.2 : 0;
    CR.rollO = 1.5 * sd * sm((rt - 1) / .35) * (1 - sm((rt - 1.8) / .7)); }
  function crUpdate(p, pp, u, dt){ CR.camZ = position / SEG * .1; const z = CR.camZ;
    if(u < PA0 || u > (p.ab ? 1890 : PA1)){ CR.vis = 0; CR.beat = -1; return; }   /* (before and after, it is off-screen: out over the far side, gone off past the near edge) */
    if(p.bs == null){ p.bs = biteSide(p); p.kpOk = false; if(p.fl && MECH.sp_flood && MECH.sp_flood.side) MECH.sp_flood.side(p.fl, -p.bs, -p.bs); }   /* (the flood's torrents start on the far wall; its burst pane is the one bitten) */
    let X, Y, Z, yawT = 0, setYaw = false, hx = NaN, hz = 0; CR.gape = .02 + .014 * Math.sin(CR.ph + .8); CR.mem = 0; CR.shine = .8; CR.am = 1; CR.shk = 0; CR.bow = 0; CR.pitch = 0; CR.flare = 0; CR.rollO = NaN; CR.fOv = 0; CR.hold = false; CR.lk = u < 870 ? .35 : 1; let beat = 1;
    if(u < US0){ const q = pathAt(p, u); X = q[0]; Y = q[1]; Z = q[2]; }
    else if(u < PE1 || (u < UB0 - 6 && CR.beat === 1 && BOX[2] >= 0)){ /* IT STOPS AND LETS YOU PASS (and, should any of it still be on screen at PE1, it stays until you are past it all: it never vanishes in view): it brakes beside the glass (paddles flared, the tail beat slowing to a gentle scull), hangs
         almost still in the water, its head held straight with a slight turn in toward the glass (never away: Kellan); you ride past and it
         backs out across the edge behind you */
      const q = pathAt(p, US0), k = 1 - Math.exp(-(u - US0) / 28); X = q[0]; Y = q[1]; Z = q[2] + .6 * k;
      yawT = .12 * Math.sign(X) * sm((u - US0) / 40);
      CR.am = lerp(1, .5, k); CR.fOv = lerp(.6, .22, k); CR.flare = .55 * k; CR.shine = 1; }
    else if(u < UB0){ CR.vis = 0; CR.beat = -1; return; }   /* (the quiet: it has slid off past the edge behind you; the vault is empty) */
    else if(u < U.ram){ burstPose(p, (u - UB0) / (U.ram - UB0), p.bs, p.kr); X = PQO[0]; Y = PQO[1]; Z = PQO[2]; hx = -p.bs; hz = 0; yawT = 0; setYaw = true; beat = 2; }
    else if(p.ab){ const A = p.rtA, sb = -p.bs, z2 = p.T + p.kr2, out = S2A.out;   /* (the combined event: strike 2 by position, then a last silhouette) */
      if(p.rammed2 < 0 && pp < z2 - S2A.d1){ if(A < out){ bitePose(p, A, p.bs, p.nr, false, out); X = PQO[0]; Y = PQO[1]; Z = PQO[2]; yawT = CR.yawB; setYaw = true; beat = 3; } else { CR.vis = 0; CR.beat = -1; return; } }
      else if(p.rammed2 < 0){ burstPose(p, clamp((pp - (z2 - S2A.d1)) / (S2A.d1 - S2A.d2), 0, 1), sb, p.kr2); X = PQO[0]; Y = PQO[1]; Z = PQO[2]; p.nr2 = [X, Y, Z]; hx = -sb; hz = 0; yawT = 0; setYaw = true; beat = 2; }
      else if(CR.rt < SIL0 - .3){ bitePose(p, CR.rt, sb, p.nr2, false, SIL0 - .3); X = PQO[0]; Y = PQO[1]; Z = PQO[2]; yawT = CR.yawB; setYaw = true; beat = 3; }
      else if(CR.rt < SIL0 || CR.rt > SIL1){ CR.vis = 0; CR.beat = -1; return; }
      else { /* the last shiver: far out beyond the broken glass its silhouette slides across, edge to edge, back the way it went; unlit */
        const t = (CR.rt - SIL0) / (SIL1 - SIL0); X = lerp(16 * sb, -16 * sb, t); Y = 3.4; Z = CR.camZ + 9; hx = -sb; hz = .15; CR.lk = .1; CR.am = 1.1; CR.fOv = .5; beat = 4; } }
    else { const A = p.rtA, sb = -p.bs;
      if(p.rammed2 < 0 && A < S2.out){ bitePose(p, A, p.bs, p.nr, false); X = PQO[0]; Y = PQO[1]; Z = PQO[2]; yawT = CR.yawB; setYaw = true; beat = 3; }   /* (strike 1: the bite, the release, out across the edge) */
      else if(p.rammed2 < 0 && A < S2.burst){ CR.vis = 0; CR.beat = -1; return; }   /* (off screen it crosses over the crown to the other side) */
      else if(p.rammed2 < 0){ burstPose(p, Math.min(1, (A - S2.burst) / (S2.hit - S2.burst)), sb, p.kr2); X = PQO[0]; Y = PQO[1]; Z = PQO[2]; p.nr2 = [X, Y, Z]; hx = -sb; hz = 0; yawT = 0; setYaw = true; beat = 2; }   /* (strike 2: in from the OTHER side) */
      else { bitePose(p, CR.rt, sb, p.nr2, true); X = PQO[0]; Y = PQO[1]; Z = PQO[2]; yawT = CR.yawB; setYaw = true; beat = 3; } }
    if(CR.beat < 0){ if(hx !== hx){ const q = pathAt(p, Math.min(u + 8, PE1 - 1)); hx = q[0] - X; hz = q[2] - Z; } trReset(X, Y, Z, hx, hz); CR.v = beat === 2 ? 24 : 6; CR.yaw = 0; CR.roll = 0; }   /* (once: the path's start is off-screen) */
    else if(dt > 0){ const v = Math.hypot(X - CR.NX, Y - CR.NY, Z - CR.NZ) / dt; CR.v += (Math.min(v, 40) - CR.v) * Math.min(1, dt * 3); }
    CR.mrim = Math.hypot(X, Y - CY) > 5.5 ? 3 : 0;   /* (out there, a cold edge from the glow above holds its outline) */
    CR.beat = beat; CR.NX = X; CR.NY = Y; CR.NZ = Z; trStep(X, Y, Z); CR.vis = 1; CR.sd = X < 0 ? -1 : 1;
    // the swim's tempo from its speed (about one tail beat per 0.8 body lengths; harder in the strike), the flippers at half the rate; banking into turns
    /* (the stalk: lazy, wide beats; the commit and the thrash: short, fast; the hit-stop: frozen) */
    CR.f = CR.fOv || clamp(CR.v / (.8 * ML), .12, 1.3); if(dt > 0 && !CR.hold){ CR.ph += 6.2832 * CR.f * dt; CR.fph += 3.1416 * CR.f * dt;
      const h = Math.atan2(JTX[0], JTZ[0]), rate = wrapA(h - CR.hPrev) / dt; CR.hPrev = h; CR.roll += ((CR.rollO === CR.rollO ? CR.rollO : clamp(-rate * .35, -.45, .45)) - CR.roll) * Math.min(1, dt * (CR.rollO === CR.rollO ? 6 : 2.5)); CR.steer += (clamp(rate * .6, -.4, .4) - CR.steer) * Math.min(1, dt * 3); }
    CR.yaw = setYaw ? yawT : CR.yaw + (yawT - CR.yaw) * Math.min(1, dt * 5); }
  function frame(p, pp, u, dt){ F.p = p; F.u = u;
    F.shakeZ = reduce || p.rammed < 0 ? 0 : Math.sin((Tg - p.rammed) * 9) * Math.max(0, 1 - (Tg - p.rammed) / .6);   /* the head shake on the ram (slow, heavy) */
    // the school drifts past, startles and bolts, scatters, is gone
    F.school = u >= U.sc0 && u < U.sc1 ? (u - U.sc0) / (U.sc1 - U.sc0) : -1; const pk = (U.scP - U.sc0) / (U.sc1 - U.sc0);
    if(F.school >= 0) F.schX += (dt || 0) * (F.school < pk ? 22 : lerp(70, 380, sm((F.school - pk) / (1 - pk)))) * (reduce ? .6 : 1);
    F.pano = u >= U.pv0 && u < U.pv1;
    F.dark = Math.round(8 * sm((u - U.dk0) / (U.dk1 - U.dk0)) * (1 - sm((u - U.dk2) / (U.end - U.dk2)))) / 8;
    F.wob = reduce ? 0 : u >= U.pw && u < U.pw + 70 ? 1 - (u - U.pw) / 70 : u >= U.ram && u < U.ram + 40 ? .6 * (1 - (u - U.ram) / 40) : 0;
    if(p.rammed >= 0 && u > U.ram && u < U.ram + U.silt){ const t = (u - U.ram) / U.silt; F.silt = t < .12 ? (t < .05 ? 0 : 1) : t < .55 ? 2 : t < .8 ? 1 : 0; F.siltT = t; } else F.silt = -1;
    F.fin = u > U.fin0 && u < U.fin1 ? (u - U.fin0) / (U.fin1 - U.fin0) : 0;
    for(let n = 0; n < 6; n++){ const t0 = n === 0 ? p.rammed : n === 1 ? p.rammed2 : p.jets[n - 2].crack; F.crackK[n] = t0 < 0 ? -1 : Math.min(3, Math.floor((Tg - t0) / (reduce ? .16 : .09))); } }
  function clearFrame(){ F.school = -1; F.dark = 0; F.wob = 0; F.p = null; F.u = -1e9; F.fin = 0; F.silt = -1; F.crackK.fill(-1); CR.vis = 0; CR.beat = -1; snOn = shOn = false; }

  /* ================================================================ the glass: through env/aqua.js's window hook
     geo(z): the tube ring at a fractional segment z, perspective-correct between the segment's two projected ends (into G). */
  const G1 = { x:0, y:0, uw:0 }, G2 = { x:0, y:0, uw:0 }, G3 = { x:0, y:0, uw:0 }, KUW = () => ROADW * W / 2;
  function geo(z, G){ const j = Math.floor(z), t = z - j, s = segs[j]; if(!s) return false; const a = s.p1, b = s.p2, c0 = a.camera.z, c1 = b.camera.z;
    if(!(c0 > DEPTH * 300) || !(c1 > 0)) return false; const cz = c0 + (c1 - c0) * t, al = t * c1 / ((1 - t) * c0 + t * c1);
    G.x = a.screen.x + (b.screen.x - a.screen.x) * al; G.y = a.screen.y + (b.screen.y - a.screen.y) * al; G.uw = DEPTH / cz * KUW(); return true; }
  const P = { x:0, y:0 };
  function pt(G, a, sd){ const r = RR * G.uw; P.x = G.x + r * Math.sin(sd * a); P.y = G.y - CY * G.uw - r * Math.cos(a); return P; }
  let RR = 1.7, CY = .75;
  // one glass decal across the strip [zLo, zHi]: the sprite set A (bands x fog), its column 0 at z0, cps columns a segment (columns run
  // back toward you), row r0 at the window's top angle, drs radians a row; fitted affinely per sub-strip and filled per light band
  function decal(A, zLo, zHi, z0, cps, r0, drs, sd, fog, gw, lit){ const zMin = z0 - gw / cps; if(zHi < zMin || zLo > z0) return;
    const lo = Math.max(zLo, zMin), hi = Math.min(zHi, z0); if(!geo(hi, G1) || !geo(lo, G2)) return; if(G1.uw < W * .022) return;   /* (so far the glass is a few pixels: the long flank would cost many tiny fills for nothing) */
    if(pt(G1, WB, sd).x < -PX * 2 && pt(G2, WB, sd).x < -PX * 2) return;   /* the whole strip is off the left edge (bends) */
    const n = G2.uw > W * .5 ? 2 : 1, fq = fog > .06 ? 1 : 0, Mx = S.M, BB = G2.uw > W * .22 ? BANDS : BANDS2;
    for(let k = 0; k < n; k++){ const zh = hi - (hi - lo) * k / n, zl = hi - (hi - lo) * (k + 1) / n; if(!geo(zh, G1) || !geo(zl, G2)) continue;
      const am = 1.49, a2 = am + .1, P0x = pt(G1, am, sd).x, P0y = P.y, P1x = pt(G2, am, sd).x, P1y = P.y, P2x = pt(G1, a2, sd).x, P2y = P.y;
      const ch = (z0 - zh) * cps, cl = (z0 - zl) * cps, rm = r0 + (am - WT) / drs, r2 = rm + .1 / drs, dc = cl - ch || 1e-6;
      Mx.a = (P1x - P0x) / dc; Mx.b = (P1y - P0y) / dc; Mx.c = (P2x - P0x) / (r2 - rm); Mx.d = (P2y - P0y) / (r2 - rm); Mx.e = P0x - Mx.a * ch - Mx.c * rm; Mx.f = P0y - Mx.b * ch - Mx.d * rm;
      for(const [b0, b1, band] of BB){ const pat = A[fq][lit ? 2 : band].p; pat.setTransform(Mx);
        const q0 = pt(G1, b0, sd), x0 = q0.x, y0 = q0.y, q1 = pt(G1, b1, sd), x1 = q1.x, y1 = q1.y, q2 = pt(G2, b1, sd), x2 = q2.x, y2 = q2.y, q3 = pt(G2, b0, sd);
        poly(x0, y0, x1, y1, x2, y2, q3.x, q3.y, pat); } } }
  /* The sea beyond the glass, drawn once a frame into one buffer at the game canvas's size (built in warm(), resized on resize; each wall's
     glass lies on its own side of the screen): the abyss backdrop and the shafts, the school, the animal, the marine snow, the silt. Every
     pane then takes it in one pattern fill (env/aqua.js win.wedgePath); after the pressure wave each pane's fill is offset its own way (the
     acrylic flexing like a lens). Nothing in the water and the sea not yet dark: nothing drawn. */
  const SEA = { now:-1, any:false, pat:null, M:null };
  function seaBufs(){ if(typeof cx === 'undefined' || !cx) return; const cw = cx.canvas.width, ch = cx.canvas.height; if(!S.BUF) S.BUF = mk(cw, ch);
    if(S.BUF.width !== cw || S.BUF.height !== ch){ S.BUF.width = cw; S.BUF.height = ch; } S.BX = S.BUF.getContext('2d'); SEA.M = new DOMMatrix([PX, 0, 0, PX, 0, 0]);
    crBufs(); band(); bgBuild(); PNL.ok = false; buildPanels(); }
  addEventListener('resize', () => { clearTimeout(seaBufs.t); seaBufs.t = setTimeout(() => { if(S.ok) seaBufs(); }, 200); });   /* (after the game's own resize) */
  // the vanishing point the backdrop hangs on: where the road ahead runs out (it swings with the bends), eased
  function vpAt(){ const b = Math.floor(pSeg()); let x = W / 2; for(let n = 160; n >= 30; n -= 26){ const s = segs[b + n]; if(s && s.p1.camera.z > 0 && s.p1.screen.scale){ x = s.p1.screen.x; break; } } F.vpx += (x - F.vpx) * .2; return F.vpx; }
  function seaPrep(now){ if(SEA.now === now) return; SEA.now = now; SEA.any = false; const B = S.BUF; if(!B || !F.p) return; const cw = cx.canvas.width, ch = cx.canvas.height;
    if(B.width !== cw || B.height !== ch || CW_ !== cw || CH_ !== ch) return;
    const D = F.dark, school = F.school >= 0 && S.sch, silt = F.silt >= 0 && S.silt; if(!(D > 0 || school || silt || CR.vis)) return;
    if(F.p.ab && F.p.rammed2 >= 0 && CR.rt > SIL1) return;   /* (the combined event, after its last silhouette: nothing more out there; the vault is filled flat, the flood's water is the show) */
    const b = S.BX; b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, cw, ch); b.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); b.imageSmoothingEnabled = false;
    // the abyss, hung on the vanishing point; the dying shafts
    const vp = vpAt(); if(D > 0 && S.BG){ const vx = Math.round(vp / PX), vy = Math.round(HZ / PX), sx = cw - vx, sy = ch - vy, x0 = Math.max(0, -sx), y0 = Math.max(0, -sy), w = Math.min(cw, S.BG.width - sx) - x0, h = Math.min(ch, S.BG.height - sy) - y0;
      if(D < 1) b.globalAlpha = D; const ym = Math.min(ch, Math.ceil(vy + (SILL < 0 ? -SILL * Math.max(vx, cw - vx) : 0) + 3)), h2 = Math.min(h, ym - y0);   /* (only the rows the glass can show: none below the sill line) */
      b.fillStyle = ABY; if(x0 > 0 || y0 > 0 || w < cw) b.fillRect(0, 0, W, ym * PX); if(ym < ch) b.fillRect(0, ym * PX, W, H - ym * PX); if(w > 0 && h2 > 0) b.drawImage(S.BG, sx + x0, sy + y0, w, h2, x0 * PX, y0 * PX, w * PX, h2 * PX);   /* (below the line, one flat fill: bends and hills can still show glass there) */
      shDraw(b, D); b.globalAlpha = 1; }
    // the school: mirrored per side; calm, then it bolts and scatters, thinning to nothing
    if(school){ const pk = (U.scP - U.sc0) / (U.sc1 - U.sc0), sc = F.school > pk ? (F.school - pk) / (1 - pk) : 0, fr = S.sch, Mx = S.M, uS = pSeg();
      for(let n = 0; n < 2; n++){ const sd = n ? 1 : -1; b.save(); b.beginPath(); b.rect(sd < 0 ? 0 : W / 2, 0, W / 2, H); b.clip();
        for(let k = 0; k < (sc > 0 ? 2 : 1); k++){ Mx.a = Mx.d = PX; Mx.b = Mx.c = 0; Mx.f = qx(HZ - 200 * PX + (k ? -1 : 1) * sc * sc * 60 * PX); Mx.e = qx((sd * (uS * 1.1 * PX + F.schX * PX * (k ? 1.3 : 1))) % (256 * PX));
          b.globalAlpha = Math.max(0, Math.round((1 - sc) * 6) / 6); const pat = fr[n][Math.floor(Tg * (reduce ? 3 : sc > 0 ? 12 : 5)) & 1]; pat.setTransform(Mx); b.fillStyle = pat; b.fillRect(0, 0, W, H); }
        b.globalAlpha = 1; b.restore(); } }
    // behind the last silhouette, a faint row of light far beyond it (a distant tube's lamps through the water): it is a dark shape against it
    if(CR.vis && CR.beat === 4){ SDN = CR.sd; if(prj(0, CR.NY + .3, CR.NZ + 6)){ const y = PJ.y * PX, hh = H * .1; b.fillStyle = 'rgba(40,96,112,.3)'; b.fillRect(0, qx(y - hh), W, qx(hh * 2)); b.fillStyle = 'rgba(70,140,156,.28)'; b.fillRect(0, qx(y - hh * .45), W, qx(hh * .9)); b.fillStyle = 'rgba(150,210,220,.22)'; b.fillRect(0, qx(y - hh * .12), W, qx(Math.max(PX, hh * .24))); } }
    if(CR.vis && DBG.mode !== 2){ const t1 = DBG.on ? DBG.clk() : 0; crDraw(b); if(DBG.on) DBG.cr += DBG.clk() - t1; }
    if(D > 0) snDraw(b);
    if(silt){ const k = 1 + F.siltT * .8, c = S.silt[F.silt], w = c.width * k * PX, h = c.height * k * PX; b.drawImage(c, qx(F.rx - w * .5 + F.sd * F.siltT * W * .08), qx(F.ry - h * .45), w, h); }
    SEA.any = true; }
  /* the sea onto the current path: clipped to it, one drawImage of the buffer (M: buffer px to screen, as the old pattern's transform). A
     createPattern of the buffer each frame snapshotted the whole canvas. Same pixels inside the glass; the clip's anti-aliased edge can differ from a fill's by a step */
  function seaBlit(M){ const B = S.BUF; cx.save(); cx.clip(); cx.drawImage(B, 0, 0, B.width, B.height, M.e, M.f, B.width * M.a, B.height * M.d); cx.restore(); }
  /* only the glass this ring can show: the strip between it and the next nearer ring (which paints over everything beyond its own radius),
     not aqua's whole wedge out to three radii: the same pixels for a small part of the fill area (most rings are far and thin) */
  function stripPath(i, sd, WA){ const t = segs[i - 1], s = segs[i]; if(!t || !s) return false; const a = s.p1, b = t.p1; if(!(b.camera.z > DEPTH * 300) || !b.screen.scale) return false;
    const ua = a.screen.scale * KUW(), ub = b.screen.scale * KUW(), ra = RR * ua * .985, rb = RR * ub * 1.03, ya = a.screen.y - CY * ua, yb = b.screen.y - CY * ub;
    for(let k = 0; k < 3; k++){ const g = sd * WA[k], x = qx(a.screen.x + ra * Math.sin(g)), y = qx(ya - ra * Math.cos(g)); if(k) cx.lineTo(x, y); else cx.moveTo(x, y); }
    for(let k = 2; k >= 0; k--){ const g = sd * WA[k]; cx.lineTo(qx(b.screen.x + rb * Math.sin(g)), qx(yb - rb * Math.cos(g))); } cx.closePath(); return true; }
  const DBG = { off:false, base:false, ms:0, prep:0, cr:0, on:false, mode:0, clk:() => performance.now() };   /* tests: off skips the window layer (A/B perf); on sums own time on clk (ms all, prep the buffer, cr the animal); mode 2 no animal, 3 near panes only, 4 no raster */
  function layer(i, sd, fog, now){ if(!F.p || !S.ok || DBG.off) return; const AQ = ENV.aqua.win, s = segs[i]; if(!s || fog >= .5 || s.mgPano === F.p) return;   /* (under the vault, pano draws it) */
    const uw = s.p1.screen.scale * KUW(); if(uw < W * (DBG.mode === 3 ? .045 : .008)) return; const t0 = DBG.on ? DBG.clk() : 0;
    if(SEA.now !== now){ const t1 = DBG.on ? DBG.clk() : 0; seaPrep(now); if(DBG.on) DBG.prep += DBG.clk() - t1; }
    if(SEA.any && AQ.wedgePath){ const M = SEA.M; if(F.wob > 0){ M.e = qx(F.wob * PX * 2.4 * Math.sin(i * .83 + Tg * 11)); M.f = qx(F.wob * PX * 1.6 * Math.cos(i * 1.21 + Tg * 8)); } else { M.e = 0; M.f = 0; }
      cx.beginPath(); if(!stripPath(i, sd, AQ.WA)){ AQ.wedgePath(sd * AQ.WA[0], sd * AQ.WA[1]); AQ.wedgePath(sd * AQ.WA[1], sd * AQ.WA[2]); }
      /* far, thin panes (a few pixels of glass each) take the haze as one flat colour: the same look for a fraction of the fill cost */
      if(uw < W * .04 && !F.wob){ if(F.dark <= 0) return; cx.fillStyle = rgbaA('9,22,30', F.dark); cx.fill(); } else seaBlit(M); }
    cracksAt(i, sd, fog, uw);
    if(DBG.on) DBG.ms += DBG.clk() - t0; }

  /* ================================================================ the viewing section: panoramic glass through the encounter
     Aqua's observation panes are slots between ring frames: they slice anything big behind them. Through this event (u pv0..pv1) the tube is
     a viewing section instead: one continuous acrylic vault from sill to sill over the crown, a thin cage in front of it (a crown spine, two
     longitudinal ribs, a light ring frame every sixth ring) and a lamp line along each sill. Done by wrapping ENV.aqua.drawTunnel, as
     setpiece/flood.js does for its bore (env/aqua.js unchanged): aqua draws each ring as usual; then, for this bore's segments only, the strip
     of the vault that ring can show (between it and the next nearer ring) is filled from this frame's sea buffer and the cage is laid on it.
     Those segments carry no s.aqWin, so aqua's own window water, frames and mullions are not drawn under the vault (its per-ring culling is
     untouched; its observation bay, rings 88..121 of any bore, still draws there and is covered). */
  const GA = 1.66, GN = 10;   /* the vault: from -GA to GA (the sills), GN facets */
  let wrappedT = false;
  function wrapTube(){ const A = ENV.aqua; if(wrappedT || !A || !A.drawTunnel) return; wrappedT = true; const oT = A.drawTunnel;
    A.drawTunnel = function(s, x, y, uw, fog, now, fogc){ const r = oT.apply(this, arguments); if(s && s.mgPano && s.mgPano === F.p && S.ok && !DBG.off) pano(s, uw, fog, now); return r; }; }
  // one band between ring a (centre ax, ay, radius ra) and ring b, over angles g0..g1 in n facets, added to the current path
  function band2(ax, ay, ra, bx, by, rb, g0, g1, n){ for(let k = 0; k <= n; k++){ const g = g0 + (g1 - g0) * k / n, X = qx(ax + ra * Math.sin(g)), Y = qx(ay - ra * Math.cos(g)); if(k) cx.lineTo(X, Y); else cx.moveTo(X, Y); }
    for(let k = n; k >= 0; k--){ const g = g0 + (g1 - g0) * k / n; cx.lineTo(qx(bx + rb * Math.sin(g)), qx(by - rb * Math.cos(g))); } cx.closePath(); }
  const fcol = (c, f) => f > .06 ? mixc(c, '#08161e', Math.min(1, f * 1.2)) : c;
  /* Far rings are thin slivers: there the vault is laid every n-th ring only, as one band from the farthest of its group (already drawn: aqua
     paints far to near) to the next nearer ring, covering the whole group at once; the cage starts where rings are big enough to see. */
  /* lean: the combined event after the last silhouette (the sea buffer has stopped, the vault is a flat dark fill): coarser bands, no ribs */
  const leanV = () => F.p && F.p.ab && F.p.rammed2 >= 0 && CR.rt > SIL1;
  function pano(s, uw, fog, now){ if(fog >= .85 || uw < 1) return; const lean = leanV(), i = s.index, n = lean ? (uw < W * .03 ? 8 : uw < W * .08 ? 4 : uw < W * .15 ? 2 : 1) : uw < W * .015 ? 8 : uw < W * .03 ? 4 : uw < W * .05 ? 2 : 1; if(i % n) return;
    const t0 = DBG.on ? DBG.clk() : 0, t = segs[i - 1];
    let a = s.p1, ua = uw; if(n > 1){ for(let k = n - 1; k > 0; k--){ const q = segs[i + k]; if(q && q.mgPano === F.p && q.p1.camera.z > DEPTH * 300 && q.p1.screen.scale > 0){ a = q.p1; ua = q.p1.screen.scale * KUW(); break; } } }
    const near = !!t && t.p1.camera.z > DEPTH * 300 && t.p1.screen.scale > 0, b = near ? t.p1 : s.p1, ub = near ? t.p1.screen.scale * KUW() : uw * 4;
    const ax = a.screen.x, ay = a.screen.y - CY * ua, ra = RR * ua, bx = b.screen.x, by = b.screen.y - CY * ub, rb = RR * ub;
    if(SEA.now !== now){ const t1 = DBG.on ? DBG.clk() : 0; seaPrep(now); if(DBG.on) DBG.prep += DBG.clk() - t1; }
    // the vault
    cx.beginPath(); band2(ax, ay, ra * .99, bx, by, rb * 1.03, -GA, GA, uw < W * .03 ? 4 : GN);
    if(SEA.any && uw >= W * .008){   /* (mid-distance glass too: the approach and the crossing happen out there) */ const M = SEA.M; if(F.wob > 0){ M.e = qx(F.wob * PX * 2.4 * Math.sin(i * .83 + Tg * 11)); M.f = qx(F.wob * PX * 1.6 * Math.cos(i * 1.21 + Tg * 8)); } else { M.e = 0; M.f = 0; } seaBlit(M); }
    else { cx.fillStyle = fcol('#09161e', fog); cx.fill(); }
    if(uw < W * .012){ if(DBG.on) DBG.ms += DBG.clk() - t0; return; }
    // the sills: a steel lip and the cyan lamp line along each side
    if(uw >= W * .05){ cx.beginPath(); band2(ax, ay, ra, bx, by, rb * 1.01, GA, GA + .045, 1); band2(ax, ay, ra, bx, by, rb * 1.01, -GA - .045, -GA, 1); cx.fillStyle = fcol('#0a1018', fog); cx.fill(); }
    if(fog < .7){ cx.beginPath(); band2(ax, ay, ra, bx, by, rb * 1.01, GA - .022, GA, 1); band2(ax, ay, ra, bx, by, rb * 1.01, -GA, -GA + .022, 1); cx.fillStyle = fog > .45 ? fcol('#3a9ac8', fog) : '#56c4f0'; cx.fill(); }
    // the cage: a crown spine and two ribs along the vault (thin), and a ring frame every sixth ring
    if(uw >= W * .05 && !lean){ const w = Math.max(PX * .6 / ra, .006); cx.beginPath(); for(const g of RIBS) band2(ax, ay, ra, bx, by, rb * 1.01, g - w, g + w, 1); cx.fillStyle = fcol('#0c141c', fog); cx.fill(); }
    if(i % 6 === 0 && n === 1){ const th = Math.max(PX * (uw > W * .08 ? 2 : 1) / ra, .01); cx.beginPath(); band2(ax, ay, ra, ax, ay, ra * (1 + th), -GA, GA, uw < W * .03 ? 4 : GN); cx.fillStyle = fcol('#0a1018', fog); cx.fill();
      if(uw > W * .06 && fog < .5){ cx.beginPath(); band2(ax, ay, ra * (1 + th), ax, ay, ra * (1 + th) + PX, -GA, GA, GN); cx.fillStyle = fcol('#3a6a7a', fog); cx.fill(); } }
    cracksAt(i, -1, fog, uw); cracksAt(i, 1, fog, uw);
    if(DBG.on) DBG.ms += DBG.clk() - t0; }
  const RIBS = [0, -.95, .95];
  // the cracks stay on the wall they were made on (the ram's, and each jet's)
  function cracksAt(i, sd, fog, uw){ const p = F.p; if(!p || p.rammed < 0) return; const st = uw < W * .02 ? 4 : uw < W * .05 ? 2 : 1, zHi = i, zLo = i - st; if(uw < W * .045 || (st > 1 && i % st)) return;
    for(let n = 0; n < 6; n++){ const ck = F.crackK[n]; if(ck < 0 || (n === 0 ? p.ramSd : n === 1 ? p.ramSd2 : p.jets[n - 2].sd) !== sd) continue; const zc = p.T + (n === 0 ? p.kr + .5 : n === 1 ? p.kr2 + .5 : p.jets[n - 2].k);
      decal(S.crack[ck], zLo, zHi, zc + CW / 2 / 7, 7, CH / 2 - ((n > 1 ? 1.47 : BA) - WT) / DA, DA, sd, fog, CW); } }
  /* ================================================================ the eye as an anime insert panel (the naruto.js technique)
     From a rider's camera low in a tube the glass is overhead, so the eye, at the scale of the whole head, is too small to read. While its
     head really paces you beside the glass, a held panel cuts in over the upper screen (never over the road): tight, side-on through the
     glass, the orbit's scales, the amber eye, one glint, the membrane's blink; ~1.4 s, slow motion 0.6 under it (no hazard is near).
     The frames are pre-rendered in warm() with the animal's own raster (a test projection) and cycled. Reduced motion / no-flash: no slow
     motion, a four-step fade instead of the wipe. The rect is naruto's: x 6..94%, y 11.5..44.5% of the screen, the road always below. */
  const PNL = { on:false, k:'', t:0, dur:0, w:0, h:0, F:{ eye:[] }, bg:null, ok:false };
  function pnRect(){ return [Math.round(W * .06 / PX), Math.round(H * .115 / PX), Math.round(W * .94 / PX), Math.round(H * .445 / PX)]; }
  // the animal alone into CB through the test projection, then onto canvas c (over whatever c holds)
  function shot(c, o){ const keep = Object.assign({}, CR);
    TST = { cx:0, cy:o.cy || 0, cz:o.cz || 0, ox:o.ox, oy:o.oy, k:o.k, yaw:o.yaw || 0, el:o.el || 0, lt:o.lt, ex:-100, ey:o.ey || 0, ez:o.cz || 0 };
    trReset(0, 0, 0, 0, 1); CR.NX = CR.NY = CR.NZ = 0; CR.v = 0; CR.roll = o.roll || 0; CR.yaw = 0; CR.gape = o.gape || .02; CR.mem = o.mem || 0; CR.shine = o.shine || 0; CR.lamp = 1; CR.lk = 1; CR.ph = o.ph || 0; CR.fph = CR.ph / 2;
    crClear(); SDN = 1; crBuild(); crRaster(); CRX.clearRect(0, 0, CW_, CH_); if(BOX[2] >= 0) CRX.putImageData(CRI, 0, 0); c.getContext('2d').drawImage(CRV, 0, 0, c.width, c.height, 0, 0, c.width, c.height);
    crClear(); TST = null; Object.assign(CR, keep); trC = 0; }
  // a black field with what little light there is: a faint cold wash from one side, sparse snow, two pale streaks of the acrylic
  function pnField(c, glass, wash){ const g = c.getContext('2d'), w = c.width, h = c.height; g.fillStyle = '#010205'; g.fillRect(0, 0, w, h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const v = wash * (1 - x / w) * (1 - Math.abs(y - h * .4) / h) - BAY[(y & 3) * 4 + (x & 3)] / 16 * .25; if(v > .38){ g.fillStyle = v > .55 ? '#08141c' : '#050c13'; g.fillRect(x, y, 1, 1); } }
    g.fillStyle = '#2e5a66'; for(let n = 0; n < w * h / 900; n++) g.fillRect((H1(n * 3.7) * w) | 0, (H1(n * 9.1) * h) | 0, 1, 1);
    if(glass){ g.fillStyle = '#12242c'; for(let y = 0; y < h; y++){ const x = Math.round(w * .78 - y * .35); g.fillRect(x, y, 1, 1); g.fillRect(x + 5, y, 1, 1); } } }
  // horror framing: light only where it matters; everything away from (vx, vy) falls to black in three flat steps
  function vignette(c, vx, vy, rx, ry){ const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), D = im.data, w = c.width;
    for(let y = 0; y < c.height; y++) for(let x = 0; x < w; x++){ const d = Math.hypot((x - vx) / rx, (y - vy) / ry), f = d < .9 ? 1 : Math.max(.08, Math.round((1 - sm((d - .9) / .8) * .92) * 24) / 24); if(f === 1) continue;   /* (a smooth falloff in fine steps: no rings) */ const i = (y * w + x) * 4; D[i] *= f; D[i + 1] *= f; D[i + 2] *= f; }
    g.putImageData(im, 0, 0); }
  function buildPanels(){ if(!CW_) return; const R = pnRect(), w = R[2] - R[0], h = R[3] - R[1]; if(w < 40 || h < 20 || w > CW_ || h > CH_) return;
    if(PNL.ok && PNL.w === w && PNL.h === h) return; PNL.w = w; PNL.h = h; PNL.F.eye.length = 0;
    const can = () => mk(w, h), sc = h / 84;
    // (a) the eye: close on the orbit (the head side-on, the eye left of centre), lit from below by the lamps; blink at 0.75..1.0 s
    for(const [t, mem] of [[0, 0], [.25, 0], [.5, 0], [.72, .45], [.8, 1], [.88, .45], [.96, 0], [1.2, 0]]){ const c = can(); pnField(c, true, .5);
      shot(c, { k:62 * sc, ox:w * .42, oy:h * .78, cz:(SK - SE) * ML, ey:.1, lt:.6, mem, shine:1, gape:.06, ph:t * 2 }); vignette(c, w * .4, h * .55, w * .3, h * .75); PNL.F.eye.push({ t, c }); }
    PNL.ok = true; }
  function pnStart(k, dur){ if(PNL.on || !PNL.ok) return; PNL.on = true; PNL.k = k; PNL.t = 0; PNL.dur = dur;
    if(k !== 'lunge' && !calm() && DIR && DIR.cine){ try{ DIR.cine({ id:ID + '_slow', slowmo:{ scale:.6, hold:dur * .6 }, dur:dur * .6 }); }catch(e){} } }
  const calm = () => reduce || !!(window.ASSIST && ASSIST.noFlash);
  const PN_IN = .16, PN_OUT = .14;
  function pnDraw(now){ if(!PNL.on) return; const t = PNL.t, d = PNL.dur; if(t > d){ PNL.on = false; return; } const R = pnRect(), w = R[2] - R[0], h = R[3] - R[1]; if(w !== PNL.w || h !== PNL.h) return;
    const cal = calm(), X0 = R[0] * PX, Y0 = R[1] * PX, WW = w * PX, HH = h * PX, sl = Math.round(HH * .22 / PX) * PX;
    let xa = 0, xb = w, al = 1; if(cal) al = t < .4 ? Math.ceil(t / .1) / 4 : t > d - .3 ? Math.max(0, 1 - Math.ceil((t - (d - .3)) / .075) / 4) : 1;
    else { if(t < PN_IN) xa = Math.round(w * (1 - sm(t / PN_IN))); if(t > d - PN_OUT) xb = Math.round(w * (1 - sm((t - (d - PN_OUT)) / PN_OUT))); }
    if(xb <= xa || al <= 0) return; cx.save(); cx.globalAlpha = al; cx.imageSmoothingEnabled = false;
    const L = X0 + xa * PX, Rr = X0 + xb * PX, shape = q => { cx.beginPath(); cx.moveTo(L + sl + q, Y0 + q); cx.lineTo(Rr - q, Y0 + q); cx.lineTo(Rr - sl - q, Y0 + HH - q); cx.lineTo(L + q, Y0 + HH - q); cx.closePath(); };
    shape(0); cx.fillStyle = '#05060a'; cx.save(); cx.translate(PX * 2, PX * 2); cx.fill(); cx.restore();
    cx.save(); cx.clip();
    if(PNL.k === 'eye'){ const FR = PNL.F.eye, tt = t * 1.3; let k = 0; while(k + 1 < FR.length && FR[k + 1].t <= tt) k++; cx.drawImage(FR[k].c, X0, Y0, WW, HH); }
    cx.restore();
    shape(0); cx.strokeStyle = '#05060a'; cx.lineWidth = PX * 2; cx.stroke(); shape(PX * 2); cx.strokeStyle = '#e8e2d0'; cx.lineWidth = PX; cx.stroke(); cx.restore(); }
  /* ================================================================ the bite on the glass
     Where the teeth meet the acrylic (a row along the ring direction at the bite point), a crack starbursts from each
     tooth, growing through the head-shake; after the release, scrape marks; water sprays in at the cracks and bubbles stream up outside.
     Glass groans and ticks through the shake. All in fixed pools; the cracks are world-placed (ring, angle) so they stay on the glass. */
  const NCK = 7, CKZ = new Float32Array(NCK), CKA = new Float32Array(NCK), CKT = new Float32Array(NCK); let nCK = 0, ckFor = null, ckKey = 0;
  const NBB = 90, BBX = new Float32Array(NBB), BBY = new Float32Array(NBB), BBV = new Float32Array(NBB), BBW = new Float32Array(NBB), BBL = new Float32Array(NBB), BBK = new Uint8Array(NBB); let bbN = 0, biteSnd = 0;
  function biteMark(p){ const key = p.rammed2 >= 0 ? 2 : 1; if(ckFor === p && ckKey === key) return; ckFor = p; ckKey = key; nCK = 0;
    /* the tooth row pressed on the glass: along the ring direction at the bite's height, upper and lower teeth a little apart */
    const Zr = (p.T + (key === 2 ? p.kr2 : p.kr) + .5) * .1; for(let k = 0; k < NCK; k++){ CKZ[nCK] = Zr + (k - 3) * .16; CKA[nCK] = BA + (k & 1 ? .07 : -.05) + .02 * H1(k * 3.3); CKT[nCK] = .025 * Math.abs(k - 3); nCK++; } }
  function biteStep(p, dt){ const rt = CR.rt; if(p.rammed < 0 || nCK === 0) return;
    if(rt > .067 && (rt < 1.2 || (p.ab && ckKey === 2 && rt < 3.2))){ for(let s = 0; s < (reduce ? 1 : 3); s++){ const i = (H1(Tg * 91 + s) * nCK) | 0, q = bbN++ % NBB; if(!pt3(i)) continue; BBX[q] = P.x; BBY[q] = P.y; BBK[q] = H1(Tg * 37 + s) < .55 ? 1 : 0;
        BBW[q] = BBK[q] ? (H1(Tg + s) - .5) * 40 : (W / 2 - P.x) * (.6 + .6 * H1(Tg * 3 + s)); BBV[q] = BBK[q] ? -90 - 60 * H1(Tg * 5 + s) : -120 * H1(Tg * 7 + s); BBL[q] = BBK[q] ? .9 : .45; } }
    for(let q = 0; q < NBB; q++) if(BBL[q] > 0){ BBL[q] -= dt; BBX[q] += BBW[q] * dt; BBY[q] += BBV[q] * dt; if(!BBK[q]) BBV[q] += 700 * dt; else BBX[q] += Math.sin(Tg * 9 + q) * 14 * dt; }
    // the glass through the shake: a groan and ticks every ~130 ms (the existing helpers)
    if(state === 'play' && rt > .2 && rt < 1){ biteSnd -= dt; if(biteSnd <= 0){ biteSnd = .13; creak(.7 + .5 * H1(Tg)); const A = audio(); if(A) burstN(.05, 2400 + 1600 * H1(Tg * 3), 3, .06, A.a.currentTime); } } }
  // the second strike's contact: its own ram crack on the other wall, and its two jets there
  function impact2(p){ const play = state === 'play', sd = -p.bs, s = segs[Math.floor(p.T + p.kr2)]; if(s && s.p1.screen.w){ const uw = s.p1.screen.scale * KUW(); F.rx = s.p1.screen.x + sd * RR * uw * .99; F.ry = s.p1.screen.y - CY * uw - RR * uw * Math.cos(BA); }
    p.ramSd2 = sd; if(!p.ab) for(let n = 2; n < 4; n++){   /* (in the combined event the bitten pane's own torrent, the flood's first, takes their place) */ const j = p.jets[n]; j.sd = sd; j.k = Math.min(p.L - 22, Math.round(p.kr2) + (n === 3 ? 98 : 70)); j.t0 = Tg; }
    if(!play) return; boom(); dustBurst(); if(!reduce){ if(p.cut) p.cut.hit(9); else shake = Math.max(shake || 0, 9); rumbleT = .55; } flick0 = Tg + .15; F.fl0 = Tg; }
  const G5 = { x:0, y:0, uw:0 };
  function pt3(i){ if(!geo(CKZ[i] * 10, G5)) return false; pt(G5, CKA[i], CR.sd || 1); return true; }
  function biteDraw(){ const p = F.p; if(!p || p.rammed < 0 || nCK === 0) return; const rt = CR.rt, g0 = clamp((rt - .067) / .9, 0, p.ab && ckKey === 2 ? 2.4 : 1);   /* (the combined event: strike 2's cracks do not stop) */
    for(let i = 0; i < nCK; i++){ if(!pt3(i)) continue; const x0 = P.x, y0 = P.y, u = G5.uw; if(u < W * .02) continue; const g = clamp(g0 * 1.2 - CKT[i], 0, 2.6); if(g <= 0) continue;
      for(let r = 0; r < 7; r++){ const ang = r / 7 * 6.283 + i * 1.7, L = u * (.04 + .13 * g) * (.6 + .7 * H1(i * 13 + r)), ca = Math.cos(ang), sa = Math.sin(ang);
        for(let q = 0; q < L; q += PX){ cx.fillStyle = q < L * .45 ? '#e8fbff' : '#7ac8d8'; pxRect(x0 + ca * q + Math.sin(q * .07 + r) * PX * .6, y0 + sa * q * .75, PX, PX); } }
      if(g > .5){ cx.fillStyle = '#9ad8e4'; const rr = u * .06 * g; for(let a = 0; a < 6.283; a += .35) if(H1(a * 7 + i) > .3) pxRect(x0 + Math.cos(a) * rr, y0 + Math.sin(a) * rr * .75, PX, PX); }
      if(rt > 1){ cx.fillStyle = '#5a9aa8'; const L2 = u * .3; for(let k = -1; k <= 1; k += 2) for(let q = 0; q < L2; q += PX) pxRect(x0 + k * q, y0 + k * q * .12 + PX * 2, PX, PX); }   /* (the scrape marks, dragged by the shake) */
      cx.fillStyle = '#ffffff'; pxRect(x0 - PX, y0 - PX, PX * 2, PX * 2); }
    for(let q = 0; q < NBB; q++){ if(BBL[q] <= 0) continue; cx.fillStyle = BBK[q] ? '#bfeaf4' : '#e8fcff'; const s = BBK[q] && (q & 1) ? PX * 2 : PX; pxRect(BBX[q], BBY[q], s, s); } }
  // ---------------------------------------------------------------- update: the beat on the rider's position
  let Tg = 0;
  function update(dt){ Tg += dt; const pp = pSeg(), p = active(pp), AQ = ENV.aqua && ENV.aqua.win;
    if(!p){ if(F.p) leave(); clearFrame(); return; }
    if(AQ){ if(AQ.layer !== layer) AQ.layer = layer; RR = AQ.RR; CY = AQ.CY; }
    const u = ubOf(p, pp - p.T), a = p.lastU === null ? u : p.lastU, X = v => a < v && u >= v, play = state === 'play'; p.lastU = u;
    if(p.side == null || X(U.sc0) || X(U.sh0 - 4) || X(U.si0 - 4) || X(U.fp0 - 4) || X(U.sp0 - 4)) p.side = outerSide(pp, p.side == null ? -1 : p.side); if(p.bs != null) p.side = p.bs;   /* (from the path's start, the bite side) */
    F.sd = p.side;
    if(!S.ok) build(); band();
    frame(p, pp, u, dt); if(AQ) AQ.fish = !(u >= U.sc0 && u < U.end + 40);
    // the cine: guard the stretch (traffic and slicks out), duck the music; no slow-motion, no camera moves
    if(play && !p.cut && u >= U.app && u < U.end && DIR && DIR.cine){ p.cut = DIR.cine({ id:ID, letterbox:{ top:.08 }, duck:.5, guard:{ from:p.T - 20, to:p.T + p.L + 6 }, dur:0 });
      tension(true, p); }
    if(p.cut && u >= U.end){ p.cut.end(); p.cut = null; tension(false, p); }
    // the ram panel: until the impact it keeps pace at the nearest panel ahead whose glass is well on screen (bends hide the near glass and
    // the tube's own curve hides the far), then freezes there (the crack stays where it hit); never into the jets
    // the ram ring: the glass just ahead of you (the snout lands ~4.2 uw ahead of the camera, close enough that the head fills about a third of
    // the screen in side profile); kept until the impact, then fixed there (the crack stays where it hit); the jets keep their offsets from it
    if(u >= U.tn0 - 2 && p.rammed < 0){ p.jr = 38; p.kr = p.ab ? p.ramSeg + 38 : clamp(pp + p.jr - p.T, p.ramSeg + 8, p.L - 122); }   /* (the combined event pins it: its bitten pane is the flood's) */
    // the ram
    if(X(U.ram)){ p.rammed = Tg; impact(p); }
    // the shock reaches two panels further on: they crack, mist, and burst
    if(p.rammed >= 0) for(let n = 0; n < p.jets.length; n++){ const j = p.jets[n]; if(j.t0 >= 0 && j.crack < 0 && Tg - j.t0 > .05 + (n & 1) * .07){ j.crack = Tg; if(play) creak(.8); }
      if(j.on < 0 && j.crack >= 0 && Tg - j.crack > .12){ j.on = Tg; burst(j, pp, p); } }
    for(const j of p.jets) if(j.on >= 0 && !j.passed){ const zj = p.T + j.k + .5; if(pp >= zj){ j.passed = true; if(play && !j.hit && hitTest(j)) soak(j); } }
    // the hints before it is seen: a lamp stutters; a far call under the shadow; the pressure wave (the panes wobble, the snow jolts, the tube
    // creaks, the lamps flicker, a near call); the roar of the lunge
    // the insert: the eye, while its head paces you
    if(play){
      /* the quiet: music and ambience ducked hard while the vault is empty; a lamp stutter ~0.4 s before it comes (the telegraph);
         the burst's sting; the grab in slow motion (0.35) so the shake plays before you pass the bite point (none under reduced motion) */
      if(X(PE1) && DIR && DIR.cine){ try{ DIR.cine({ id:ID + '_hush', duck:.12, dur:(UB0 - PE1) / 55 + .6 }); }catch(e){} }
      if(X(UB0 - 22)) flick(.6);
      if(X(UB0)) stingSnd(1);
      if(X(U.ram - 2) && !calm() && DIR && DIR.cine){ try{ DIR.cine({ id:ID + '_bite', slowmo:{ scale:.35, hold:1.1 }, dur:1.4 }); }catch(e){} } }   /* (the insert shows it where it is: pacing you) */
    if(play){ if(X(U.fk1)) flick(.55); if(X(U.sh0 + 60)) callSnd(.5, 4.2, -.6); if(X(U.pw)){ flick(1); creak(1.3); callSnd(1, 3.4, -.2); snJolt(1); } if(X(U.ey0 + 40)) flick(.4); if(X(U.op0)) callSnd(.9, 1.3, 0); }
    if(DBG.base){ for(let i = p.T; i < p.T + p.L - 20; i++){ const s = segs[i]; if(s && s.mgPano){ s.mgPano = null; s.aqWin = 1; } } }   /* (tests: the bore as a plain Aqua tube with its slot windows) */
    // the encounter's road is kept clean: no boost pads in the bore (under the dark vault a cyan pad reads as a pane of glass lying on the road)
    for(let i = Math.max(p.T, Math.floor(pp)), e = Math.min(p.T + p.L, Math.floor(pp) + 220); i < e; i++){ const s = segs[i]; if(s && s.hz && s.hz.type === 'pad') s.hz = null; }
    const rdt = dt / ((window.TIME && TIME.scale) || 1), A0 = p.rtA || 0; if(p.rammed >= 0) p.rtA = A0 + rdt;
    /* the second strike, on the other wall, in real seconds since the first contact: a short lamp stutter, the burst and its own sting, the grab
       (its ram ring keeps pace ahead of you until it lands; its jets keep the same offsets on that wall) */
    if(p.ab && p.rammed >= 0 && p.rammed2 < 0){ p.kr2 = p.fl ? p.fl.jets[0].Z - p.T : p.kr + 104; const z2 = p.T + p.kr2, pb = p.ppB == null ? pp : p.ppB, Xp = v => pb < v && pp >= v; p.ppB = pp;
      if(play && Xp(z2 - S2A.d0)) flick(.5); if(play && Xp(z2 - S2A.d1)) stingSnd(2);
      if(pp >= z2 - S2A.d2){ p.rammed2 = Tg; p.rt2at = p.rtA; impact2(p); if(play && !calm() && DIR && DIR.cine){ try{ DIR.cine({ id:ID + '_bite2', slowmo:{ scale:.35, hold:1.1 }, dur:1.4 }); }catch(e){} } } }
    else if(p.rammed >= 0 && p.rammed2 < 0){ p.kr2 = clamp(pp + p.jr - p.T, p.kr + 40, p.L - 122); const Xa = v => A0 < v && p.rtA >= v;
      if(play && Xa(S2.burst - .25)) flick(.5); if(play && Xa(S2.burst)) stingSnd(2);
      if(p.rtA >= S2.hit){ p.rammed2 = Tg; p.rt2at = p.rtA; impact2(p); if(play && !calm() && DIR && DIR.cine){ try{ DIR.cine({ id:ID + '_bite2', slowmo:{ scale:.35, hold:1.1 }, dur:1.4 }); }catch(e){} } } }
    CR.rt = p.rammed2 >= 0 ? p.rtA - p.rt2at : p.rammed >= 0 ? p.rtA : 0;   /* (real seconds since the latest contact: the bite's timing ignores the slow-motion) */   /* (real seconds since contact: the bite's timing ignores the slow-motion) */
    crUpdate(p, pp, u, dt); if(p.rammed >= 0){ biteMark(p); biteStep(p, rdt); } snStep(dt, u >= U.wk0 && u < U.wk1 || u >= U.fp0);
    // the commit (it would happen anyway when the rider passes the booking): the moment has been seen
    if(!p.done && u > U.ram + 4){ p.done = true; if(DIR && DIR.done) DIR.done(p.bid || ID); }
    // the card, as the sea goes dark
    if(play && !p.card && u >= U.card){ p.card = true; const C = MECH.cutin; let ok = false; try{ ok = !!(C && C.has && C.has(ID) && C.show(ID, { force:true }) !== false); }catch(e){} if(!ok) tryCard(); p.cardT = Tg; }   /* the hero card opens the dread build, every booked encounter */
    if(play) sound(p, u, dt); else hush(); }
  function leave(){ const AQ = ENV.aqua && ENV.aqua.win; if(AQ) AQ.fish = true; hush(); }
  function tension(on, p){ if(p.thin === on) return; p.thin = on; try{ if(window.MUSIC && MUSIC.thin) MUSIC.thin(on ? 1 : (DIR && DIR.quietOn && DIR.quietOn() ? 1 : 0)); }catch(e){} }

  // ---------------------------------------------------------------- the jets: fair, lane-based, light
  const WALLX = () => typeof wallX === 'function' ? wallX() : 1.05;
  // when it bursts, a jet covers x <= reach + .3 (from the left wall). If the open road beyond it is out of steering reach in the time left
  // (60% of it, after a 0.45 s reaction in real time), it is cut short so it cannot reach you. 'Generous' cuts them all to the left lane edge.
  const mxOf = j => j.sd > 0 ? -playerX : playerX;
  function burst(j, pp, p){ const playerX = mxOf(j), gen = !!(window.ASSIST && ASSIST.jumps), sp = Math.max(.25, speed / MAXS), left = (p.T + j.k + .5 - pp) / Math.max(1, speed / SEG), react = .45 * ((window.ASSIST && ASSIST.speed) || 1);
    // graded: the biggest jet whose open side you can still reach; else the left-lane jet; else one that stops short of you
    const can = 2 * sp * Math.max(0, (left - react) * .6), ok = r => r + .3 < playerX - .15 || r + .42 - playerX <= can;
    let reach = -1.2; for(const r of [gen ? Math.min(j.full, -.7) : j.full, gen ? -.7 : -.62]) if(ok(r)){ reach = r; break; }
    if(reach === -1.2) reach = Math.max(-1.2, Math.min(-.62, playerX - .45 - .3));
    j.reach = reach; if(state === 'play') hissBurst(); }
  function hitTest(j){ const playerX = mxOf(j); if(typeof recov !== 'undefined' && recov > 0) return false; if(typeof cool !== 'undefined' && cool > 0) return false; if(AIR.h >= 6) return false;
    return playerX < j.reach + .3 && j.reach > -1.15; }
  let shove = 0;
  let shoveDir = 1;
  function soak(j){ j.hit = true; speed *= .9; shove = .3; shoveDir = j.sd > 0 ? -1 : 1; drift = 0; charge = 0; tier = 0; MECH.sp_meg.soaked++;
    if(MECH.arrival && MECH.arrival.callout) MECH.arrival.callout('Soaked', { prio:3, col:'#8ff0ff', size:'s' }); else floatText('Soaked', W / 2, H * .5, 22, '#8ff0ff');
    splashSnd(); for(let n = 0; n < 14; n++) sparks.push({ x:W / 2 + (Math.random() - .5) * W * .1, y:H * .8, vx:(Math.random() - .3) * 300, vy:-Math.random() * 360, life:.5, c:n % 2 ? '#bff4ff' : '#4ad8ff' }); }
  // the shove: toward the open road, a third of a lane over a quarter second, never into the far wall (steering stays yours throughout)
  function applyShove(dt){ if(shove <= 0 || state !== 'play') return; const k = Math.min(shove, dt); shove -= dt; const room = WALLX() - .12 - shoveDir * playerX; if(room > 0) playerX += shoveDir * Math.min(room, 1.2 * k); }

  // ---------------------------------------------------------------- the ram
  function impact(p){ const play = state === 'play'; F.rx = 0; F.ry = 0; { const s = segs[Math.floor(p.T + p.kr)]; if(s && s.p1.screen.w){ const uw = s.p1.screen.scale * KUW(); F.rx = s.p1.screen.x + F.sd * RR * uw * .99; F.ry = s.p1.screen.y - CY * uw - RR * uw * Math.cos(BA); } else { F.rx = F.sd < 0 ? W * .3 : W * .7; F.ry = H * .3; } }
    p.ramSd = F.sd; for(let n = 0; n < 2; n++){ const j = p.jets[n]; j.sd = F.sd; j.k = Math.min(p.L - 22, Math.round(p.kr) + (n ? 98 : 70)); j.t0 = Tg; }   /* the shock cracks panels on the wall it hit */
    if(!play) return; boom(); dustBurst();
    if(!reduce){ if(p.cut) p.cut.hit(9); else shake = Math.max(shake || 0, 9); rumbleT = .55; }
    flick0 = Tg + .15; F.fl0 = Tg;   /* (the lamps fail a beat after the hit, so the bite itself is seen in the flash) */
    }
  let rumbleT = 0, flick0 = -9;
  // the lights: the ram's stutter (two dips inside a third of a second, then a slow recovery: under 3 flashes a second) and the smaller
  // stutters before it (flick); under reduced motion or no-flash each is one steady dim in four steps and back. The animal's light, the
  // snow's, fall with them (CR.lamp)
  let flk0 = -9, flkK = 0;
  function flick(k){ flk0 = Tg; flkK = k; }
  function dimLevel(){ const calm = reduce || !!(window.ASSIST && ASSIST.noFlash); let d = 0, t = Tg - flick0;
    if(t >= 0 && t <= 2.4) d = calm ? (t < .4 ? Math.ceil(t / .1) / 4 * .42 : t < 1.2 ? .42 : .42 * (1 - Math.ceil((t - 1.2) / .3) / 4)) : t < .07 ? .6 : t < .16 ? .12 : t < .32 ? .52 : .3 * (1 - sm((t - .32) / 2));
    t = Tg - flk0; if(t >= 0 && t < 1.2){ const e = calm ? .22 * (t < .2 ? Math.ceil(t / .05) / 4 : t < .6 ? 1 : Math.max(0, 1 - Math.ceil((t - .6) / .15) / 4)) : t < .06 ? .34 : t < .13 ? .04 : t < .2 ? .3 : t < .26 ? .08 : .2 * (1 - sm((t - .26) / .9)); d = Math.max(d, e * flkK); }
    return d; }

  // dust and drips from the crown (screen space, a fixed pool)
  const NP = 64, PXA = new Float32Array(NP), PYA = new Float32Array(NP), PVA = new Float32Array(NP), PLA = new Float32Array(NP), PKA = new Uint8Array(NP);
  function dustBurst(){ const n = reduce ? 24 : NP; for(let i = 0; i < n; i++){ PXA[i] = H1(i * 3.1 + Tg) * W; PYA[i] = H1(i * 7.7 + Tg) * H * .3; PKA[i] = i % 4 === 0 ? 1 : 0; PVA[i] = (PKA[i] ? 380 : 40 + H1(i * 1.3) * 70) * (reduce ? .6 : 1); PLA[i] = 1.2 + H1(i * 5.3) * 1.4; } }
  function stepDust(dt){ for(let i = 0; i < NP; i++) if(PLA[i] > 0){ PLA[i] -= dt; PYA[i] += PVA[i] * dt; if(!PKA[i] && !reduce) PXA[i] += Math.sin(Tg * 3 + i) * 8 * dt; } }

  // ---------------------------------------------------------------- sound (Web Audio; loud moment SFX through the director's bus)
  let AU = null;
  const ac = () => typeof M !== 'undefined' && M.ac && M.noiseBuf;
  function audio(){ if(AU !== null) return AU; if(!ac()) return null; try{ const a = M.ac, dest = (DIR && DIR.bus && DIR.bus()) || M.out;
      // the pass: a low sine under brown noise through a low-pass (pressure, not a note), panned left
      const o = a.createOscillator(), og = a.createGain(), n = a.createBufferSource(), lp = a.createBiquadFilter(), ng = a.createGain(), mix = a.createGain(), pan = a.createStereoPanner ? a.createStereoPanner() : null;
      o.type = 'sine'; o.frequency.value = 40; og.gain.value = 0; n.buffer = M.noiseBuf; n.loop = true; lp.type = 'lowpass'; lp.frequency.value = 140; ng.gain.value = 0; mix.gain.value = 1;
      o.connect(og).connect(mix); n.connect(lp).connect(ng).connect(mix); if(pan){ pan.pan.value = -.4; mix.connect(pan).connect(dest); } else mix.connect(dest);
      // water hiss (the jets), band-passed high
      const h = a.createBufferSource(), hb = a.createBiquadFilter(), hg = a.createGain(), hp = a.createStereoPanner ? a.createStereoPanner() : null; h.buffer = M.noiseBuf; h.loop = true; hb.type = 'bandpass'; hb.frequency.value = 3800; hb.Q.value = .7; hg.gain.value = 0;
      h.connect(hb).connect(hg); if(hp){ hp.pan.value = -.5; hg.connect(hp).connect(dest); } else hg.connect(dest);
      // glass creak: a sawtooth through a narrow band-pass, its gain chopped by a fast LFO (stick-slip)
      const c = a.createOscillator(), cb = a.createBiquadFilter(), cg = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), cv = a.createGain();
      c.type = 'sawtooth'; c.frequency.value = 92; cb.type = 'bandpass'; cb.frequency.value = 760; cb.Q.value = 7; cg.gain.value = 0; lfo.type = 'square'; lfo.frequency.value = 23; lg.gain.value = .5; cv.gain.value = .5;
      lfo.connect(lg).connect(cv.gain); c.connect(cb).connect(cv).connect(cg).connect(dest);
      // the groan: a low sawtooth through a resonant low-pass, its pitch sagging (the sound of something vast flexing in the dark)
      const gr = a.createOscillator(), gf = a.createBiquadFilter(), gg = a.createGain(); gr.type = 'sawtooth'; gr.frequency.value = 38; gf.type = 'lowpass'; gf.frequency.value = 150; gf.Q.value = 6; gg.gain.value = 0; gr.connect(gf).connect(gg).connect(dest);
      o.start(); n.start(); h.start(a.currentTime, .61); c.start(); lfo.start(); gr.start();
      AU = { a, dest, o, og, lp, ng, hg, hb, c, cg, cb, gr, gf, gg }; }catch(e){ AU = false; } return AU; }
  function hush(){ if(!AU) return; const t = AU.a.currentTime; AU.og.gain.setTargetAtTime(0, t, .2); AU.ng.gain.setTargetAtTime(0, t, .2); AU.hg.gain.setTargetAtTime(0, t, .15); AU.cg.gain.setTargetAtTime(0, t, .1); if(AU.gg) AU.gg.gain.setTargetAtTime(0, t, .2); }
  // a heartbeat in the sub (lub-dub), quickening from the approach to the eye; then gone for the ram
  function beatAt(p, u){ if(u < U.app + 10 || u > U.ram - 2) return; const per = lerp(1.15, .5, sm((u - U.app) / (U.eyH - U.app))); if(Tg - p.beat < per) return; p.beat = Tg;
    const A = audio(); if(!A) return; const t = A.a.currentTime, v = .18 + .1 * sm((u - U.app) / (U.eyH - U.app)); thump(48, .16, v, t); thump(42, .2, v * .7, t + .17); }
  function thump(f, d, v, at){ const A = AU; if(!A) return; try{ const o = A.a.createOscillator(), g = A.a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * .7, at + d);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(v, at + .012); g.gain.exponentialRampToValueAtTime(.001, at + d); o.connect(g).connect(A.dest); o.start(at); o.stop(at + d + .05); }catch(e){} }
  function burstN(d, f, q, v, at, type){ const A = AU; if(!A) return; try{ const s = A.a.createBufferSource(), b = A.a.createBiquadFilter(), g = A.a.createGain(); s.buffer = M.noiseBuf; b.type = type || 'bandpass'; b.frequency.value = f; b.Q.value = q;
      g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(.001, at + d); s.connect(b).connect(g).connect(A.dest); s.start(at, H1(at) * 1.2); s.stop(at + d + .05); }catch(e){} }
  // the ram: a muffled thud (a sine falling 56 -> 26 Hz), a low-passed boom, the tube ringing, the glass ticking as it cracks
  function boom(){ const A = audio(); if(!A) return; const t = A.a.currentTime; try{ const o = A.a.createOscillator(), g = A.a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(56, t); o.frequency.exponentialRampToValueAtTime(26, t + .9);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + 1.1); o.connect(g).connect(A.dest); o.start(t); o.stop(t + 1.2); }catch(e){}
    burstN(1.6, 170, .6, .5, t, 'lowpass'); burstN(2.2, 430, 14, .16, t + .02); burstN(1.4, 980, 18, .05, t + .05);
    for(let k = 0; k < 4; k++) burstN(.05, 2600 + k * 500, 3, .07, t + .09 + k * .07); creak(1); }
  function creak(v){ const A = audio(); if(!A) return; const t = A.a.currentTime; A.cg.gain.cancelScheduledValues(t); A.cg.gain.setValueAtTime(A.cg.gain.value, t); A.cg.gain.linearRampToValueAtTime(.06 * v, t + .05); A.cg.gain.setTargetAtTime(0, t + .35, .25);
    A.c.frequency.setValueAtTime(92 + H1(t) * 30, t); A.c.frequency.linearRampToValueAtTime(70, t + .6); }
  function hissBurst(){ const A = audio(); if(!A) return; burstN(.5, 4200, .8, .12, A.a.currentTime); }
  function splashSnd(){ const A = audio(); if(!A) return; const t = A.a.currentTime; burstN(.4, 1800, .7, .22, t); burstN(.3, 700, .9, .14, t + .02); }
  // the deep call: a low sawtooth that swells and sags through a resonant low-pass, band-passed noise for a throat, and the sub thump of its
  // start (the helpers above); toward its side of the tube
  function callSnd(v, dur, pan){ const A = audio(); if(!A) return; const t = A.a.currentTime; try{ const o = A.a.createOscillator(), f = A.a.createBiquadFilter(), g = A.a.createGain(), pn = A.a.createStereoPanner ? A.a.createStereoPanner() : null;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(24, t); o.frequency.linearRampToValueAtTime(43, t + dur * .32); o.frequency.linearRampToValueAtTime(29, t + dur);
      f.type = 'lowpass'; f.Q.value = 9; f.frequency.setValueAtTime(110, t); f.frequency.linearRampToValueAtTime(300, t + dur * .32); f.frequency.linearRampToValueAtTime(120, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.2 * v, t + dur * .3); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      if(pn){ pn.pan.value = (F.sd || -1) * Math.abs(pan); o.connect(f).connect(g).connect(pn).connect(A.dest); } else o.connect(f).connect(g).connect(A.dest); o.start(t); o.stop(t + dur + .1); }catch(e){}
    burstN(dur * .7, 240, 4, .05 * v, t + .15); thump(32, Math.min(1.2, dur * .4), .22 * v, t); }
  // the jumpscare sting: a hard sub hit, a bright noise slash, a short low call (the existing helpers); softer under reduced motion
  function stingSnd(n){ const A = audio(); if(!A) return; const t = A.a.currentTime, v = calm() ? .55 : 1;
    if(n === 2){ thump(36, .35, .5 * v, t); thump(52, .25, .3 * v, t + .09); burstN(.25, 5200, 2, .18 * v, t); burstN(.45, 900, 3, .12 * v, t + .05); return; }   /* (the second: a double hit, higher and harder) */
    thump(44, .5, .45 * v, t); burstN(.35, 3200, 1.2, .2 * v, t); burstN(.6, 160, .8, .25 * v, t, 'lowpass'); callSnd(.8 * v, 1.1, 0); }
  function sound(p, u, dt){ const A = audio(); if(!A) return; const t = A.a.currentTime;
    beatAt(p, u);
    if(p.cardT != null && !p.cardHit && Tg - p.cardT > .5){ p.cardHit = true; thump(30, 1.3, .34, t); burstN(1, 90, .7, .12, t, 'lowpass'); }   /* (the title lands: a low sub-bass hit) */
    // the pass: swells as the dread builds, peaks at the strike, dies after the recoil
    const pass = (u < U.ram ? sm((u - U.sc0) / (U.ram - U.sc0)) : 1 - sm((u - U.ram) / 140)) * (u > PE1 && u < UB0 ? .15 : 1);   /* (the quiet before the burst: the drone falls away) */
    A.og.gain.setTargetAtTime(.22 * pass, t, .12); A.o.frequency.setTargetAtTime(32 + 16 * pass, t, .2); A.ng.gain.setTargetAtTime(.5 * pass, t, .15); A.lp.frequency.setTargetAtTime(90 + 90 * pass, t, .2);
    // the hiss of the jets, by distance to the nearest one ahead (and a little behind); the rush of the school bolting
    let h = 0; const pp = pSeg(); for(const j of p.jets) if(j.on >= 0){ const d = p.T + j.k + .5 - pp; h = Math.max(h, d > 0 ? clamp(1 - d / 80, 0, 1) : clamp(1 + d / 12, 0, 1)); } else if(j.crack >= 0) h = Math.max(h, .25);
    const pk = (U.scP - U.sc0) / (U.sc1 - U.sc0), rush = F.school >= pk ? sm((F.school - pk) / .2) * (1 - sm((F.school - .85) / .15)) : 0; A.hg.gain.setTargetAtTime(.1 * Math.max(h, rush * .9), t, .08); A.hb.frequency.setTargetAtTime(h > rush ? 3800 : 1400 + 1600 * rush, t, .1);
    // the groan of something vast flexing: faint when it is far, full when it is at the glass
    const groan = CR.vis ? (CR.beat === 2 ? (u < U.ey1 ? .6 : u < U.ram ? .9 : .7) : .3) : 0;
    A.gg.gain.setTargetAtTime(.16 * groan, t, .2); A.gr.frequency.setTargetAtTime(30 + 12 * Math.sin(Tg * .9) + 6 * groan, t, .4); A.gf.frequency.setTargetAtTime(110 + 90 * groan, t, .3); }

  // ---------------------------------------------------------------- the card: sparse, in the sky (the INFERNO model), never over the road
  const CD = { t:-1, dur:2.1 }, CARD = { kanji:'滄竜', name:'MOSASAUR', sub:"IT'S STILL DOWN THERE" };
  let CC = null, CCK = '';
  function tryCard(){ const ps = pSeg(), pre = typeof SPLIT_PRE === 'number' ? SPLIT_PRE : 110, v = Math.max(40, speed / SEG); let room = 9;
    for(let g = 0; g < gates.length; g += 2) if(gates[g] > ps) room = Math.min(room, (gates[g] - pre - ps) / v);   /* it ends before a fork's approach begins: shortened to fit, or not shown */
    if(room < 1.4) return; CD.dur = Math.min(2.1, room);
    const Q = MECH.quiet, first = !DIR || !DIR.isFirstSighting || DIR.isFirstSighting(ID);
    void first;   // every occurrence (Kellan: always show the event cards); its card is moving to the cut-in hero path
    if(Q && Q.claim && !Q.claim(3, CD.dur)) return;   /* the moment's own card: class 3 (mech/arrival.js) */ if(MECH.cutin && MECH.cutin.on && MECH.cutin.on()) return;
    CD.t = 0; }
  const F3 = { A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', G:'011100101101011', H:'101101111101101', I:'111010010010111', L:'100100100100111', M:'101111111101101', N:'110101101101101',
    O:'010101101101010', R:'110101110101101', S:'011100010001110', T:'111010010010010', U:'101101101101111', W:'101101111111101', "'":'010010000000000', ' ':'000000000000000' };
  function t3(s, col, sh, z){ const c = mk(s.length * 4 * z + z, 6 * z), k = c.getContext('2d'); for(const [cc, o] of [[sh, z], [col, 0]]){ if(!cc) continue; k.fillStyle = cc; [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') k.fillRect((n * 4 + i % 3) * z + o, ((i / 3) | 0) * z + o, z, z); }); } return c; }
  function cardArt(){ const cw = cx.canvas.width, ch = cx.canvas.height, key = cw + 'x' + ch + (fontOK() ? 'f' : ''); if(CC && CCK === key) return CC; CCK = key;
    const nar = cw < 260, ink = '#03080c', bone = '#e8f2ee', cyan = '#56c4f0', deep = '#0c2a36', red = '#ff2a3a';
    // 古代鮫 in the pixel font, scaled on the grid, bone over a cyan lower half (the sill light), an ink rim and a deep-sea shadow
    let m = typeof pixText === 'function' ? pixText(CARD.kanji, 16, false) : t3('MEG', '#fff', null, 2); const ks = nar ? 1 : 3;
    const bw = m.width * ks, bh = m.height * ks, kj = mk(bw + 4, bh + 4), kk = kj.getContext('2d'), md = m.getContext('2d').getImageData(0, 0, m.width, m.height).data;
    const on = (x, y) => x >= 0 && y >= 0 && x < m.width && y < m.height && md[(y * m.width + x) * 4 + 3] > 90;
    for(let y = 0; y < m.height; y++) for(let x = 0; x < m.width; x++){ if(!on(x, y)) continue; kk.fillStyle = deep; kk.fillRect(x * ks + 3, y * ks + 3, ks, ks); }
    for(let y = 0; y < m.height; y++) for(let x = 0; x < m.width; x++){ if(!on(x, y)) continue; kk.fillStyle = ink; kk.fillRect(x * ks, y * ks, ks + 2, ks + 2); }
    for(let y = 0; y < m.height; y++) for(let x = 0; x < m.width; x++){ if(!on(x, y)) continue; kk.fillStyle = y > m.height * .58 ? cyan : bone; kk.fillRect(x * ks + 1, y * ks + 1, ks, ks); }
    const name = t3(CARD.name, bone, ink, nar ? 1 : 2), sub = t3(CARD.sub, cyan, null, 1), tape = mk(sub.width + 8, 9), tg = tape.getContext('2d'); tg.fillStyle = ink; tg.fillRect(0, 0, tape.width, 9); tg.fillStyle = red; tg.fillRect(0, 8, tape.width, 1); tg.drawImage(sub, 4, 2);
    const x0 = nar ? 4 : Math.round(cw * .05), y0 = Math.round(ch * (nar ? .12 : .1));
    CC = { kj, name, tape, x0, y0, nx:x0 + 2, ny:y0 + kj.height + 3, tx:x0 + 2, ty:y0 + kj.height + 3 + name.height + 3, line:cyan, ink };
    return CC; }
  const fontOK = () => { try{ return document.fonts.check('16px DotGothic16'); }catch(e){ return true; } };
  function drawCard(){ if(CD.t < 0 || CD.t > CD.dur) return; const o = cardArt(), t = CD.t, g = cx; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    if(MECH.quiet && MECH.quiet.clipRoad && state === 'play') MECH.quiet.clipRoad(g);
    { const HL = ENV.hud && ENV.hud.layout ? ENV.hud.layout() : null, dy = HL ? Math.max(0, HL.freeY + 3 - o.y0) : 0; if(dy) g.setTransform(1, 0, 0, 1, 0, dy); }   /* under the HUD (env/hud.js freeY) */
    const st = (p, n) => Math.floor(clamp(p, 0, 1) * n) / n;
    if(reduce){ const a = t < .4 ? st(t / .4, 4) : t > CD.dur - .4 ? 1 - st((t - (CD.dur - .4)) / .4, 4) : 1; g.globalAlpha = a; if(a > 0) cardAt(g, o, 9, 0, 1); }
    else { const out = t > CD.dur - .3 ? st((t - (CD.dur - .3)) / .3, 5) : 0; cardAt(g, o, t, out, 0); }
    g.restore(); }
  // the kanji surfaces (rises into place in three steps, a cold waterline sliding under it), the name slides in, the tape types out; the exit
  // sinks it back row by row
  function cardAt(g, o, t, out, rm){ const cw = g.canvas.width, rise = rm ? 0 : Math.round((1 - st3(t / .18)) * o.kj.height * .6), cut = Math.round(o.kj.height * out);
    if(rm || t > .02){ const h = o.kj.height - cut - rise; if(h > 0) g.drawImage(o.kj, 0, 0, o.kj.width, h, o.x0, o.y0 + rise, o.kj.width, h);
      const wl = o.y0 + o.kj.height - cut + 1, lw = rm ? cw * .5 : Math.round(cw * .5 * st3(t / .25)); g.fillStyle = o.line; g.fillRect(0, wl, Math.min(lw, cw - 6), 1); g.fillStyle = o.ink; g.fillRect(0, wl + 1, Math.min(lw, cw - 6), 1); }
    if(out >= .6) return;
    if(rm || t > .16){ const sl = rm ? 0 : Math.round((1 - st3((t - .16) / .12)) * 50); g.drawImage(o.name, o.nx - sl, o.ny); }
    if(rm || t > .3){ const n = rm ? o.tape.width : Math.min(o.tape.width, Math.floor((t - .3) / .012) * 4); if(n > 0) g.drawImage(o.tape, 0, 0, n, 9, o.tx, o.ty, n, 9); } }
  const st3 = p => Math.floor(clamp(p, 0, 1) * 3) / 3;

  // ---------------------------------------------------------------- world drawing: the approach swell, the jets
  // the swell in the cutting: the road is below the sea there, so above the near retaining wall the sea's surface lifts in a long low hump
  // that rolls along and settles (something vast just under it), black against the night with a moonlit crest, foam trailing off both
  // ends; nothing breaks the surface
  function drawFin(s, x, y, uw, fog, now){ const p = F.p, t = F.fin; if(!p || t <= 0) return;
    const sea = qx(y - (s.aqD1 || 0) * s.p1.screen.scale * H / 2), rise = Math.sin(Math.min(1, t / .85) * Math.PI), X = x - 1.8 * uw, w = uw * 3.4, hh = uw * .2 * rise; if(hh < PX * .5 || X < -W * .3) return;
    const n = Math.max(4, Math.round(w / PX)), x0 = qx(X - w / 2);
    for(let k = 0; k < n; k++){ const q = (k + .5) / n * 2 - 1, h = qx(hh * Math.pow(Math.max(0, 1 - q * q), 1.4)); if(h < PX) continue; const c0 = x0 + k * PX;
      cx.fillStyle = '#060d14'; pxRect(c0, sea - h, PX, h); cx.fillStyle = q < .2 ? '#9ab8cc' : '#3a5468'; pxRect(c0, sea - h, PX, PX); }
    cx.fillStyle = '#cfe6f0'; pxRect(x0 - w * .1, sea - PX, w * 1.2, PX);
    cx.fillStyle = '#7aa8bc'; for(let k = 1; k <= 7; k++){ const ph = reduce ? 0 : qx(Math.sin(now / 110 + k) * PX), ww = Math.max(PX, w * (.22 - k * .02)); pxRect(x0 - k * w * .22, sea - PX * (k % 2 ? 2 : 1) + ph, ww, PX); pxRect(x0 + w + k * w * .16, sea - PX * (k % 2 ? 1 : 2) + ph, ww * .8, PX); } }
  function drawJet(j, s, x, y, uw, fog, now){ if(j.crack < 0) return; const m = j.sd > 0 ? -1 : 1, p = F.p, on = j.on >= 0, age = Tg - (on ? j.on : j.crack), a0 = -1.47, X0 = RR * Math.sin(a0), Y0 = CY + RR * Math.cos(a0);
    const reach = on ? lerp(X0 + .2, j.reach, sm(age / .18)) : X0 + .15, X1 = Math.max(reach, X0 + .1), hArc = .28, len = (Math.abs(X1 - X0) + Y0) * uw, n = Math.max(6, Math.min(140, Math.round(len / (PX * 1.5))));
    const core = fog > .5 ? '#6a9aa8' : '#e8fcff', body = fog > .5 ? '#3a6a78' : '#7adcec', edge = fog > .5 ? '#1e4250' : '#2a8aa0', dl = clamp(qx(uw * .02), PX, PX * 4);
    // the stream: overlapping blobs along the arc from the crack to the landing, edge pass then core pass, so it reads as one rope of water;
    // the light dashes in its core run outward (steady under reduced motion)
    const ph = reduce ? 0 : now / 45, arc = t => Y0 * (1 - t) + hArc * 4 * t * (1 - t) * (on ? 1 : .3);
    cx.fillStyle = edge; for(let i = 0; i <= n; i++){ const t = i / n, w = Math.min(PX * 6, dl * (1 + t * .9)); pxRect(x + m * (X0 + (X1 - X0) * t) * uw - w * .6, y - arc(t) * uw - w * .6, w * 1.2, w * 1.2); }
    for(let i = 0; i <= n; i++){ const t = i / n, w = Math.min(PX * 4, dl * (.6 + t * .6)); cx.fillStyle = Math.floor(i * 6 / n * 3 - ph) % 3 === 0 ? core : body; pxRect(x + m * (X0 + (X1 - X0) * t) * uw - w * .4, y - arc(t) * uw - w * .35, w * .8, w * .7); }
    if(!on){ cx.fillStyle = body; for(let k = 0; k < 4; k++){ const sx = x + m * (X0 * uw + k * dl), sy = y - Y0 * uw + ((reduce ? 0 : now / 9) + k * 13) % (uw * .5); pxRect(sx, sy, dl * .6, dl); } return; }
    // the landing: a white splash dome and a ring of spray on the lane, mist
    const lx = x + m * X1 * uw, rw = uw * .3, rh = Math.max(PX, uw * .04); cx.fillStyle = '#123848'; pxRect(lx - rw, y - rh * .3, rw * 2, rh * .6);
    cx.fillStyle = body; for(let k = -3; k <= 3; k++){ const hh = (4 - Math.abs(k)) * dl * .9 * (reduce ? 1 : .8 + .2 * Math.sin(now / 60 + k)); pxRect(lx + k * rw * .26 - dl * .4, y - hh, dl * .8, hh); }
    cx.fillStyle = core; pxRect(lx - dl, y - dl * 2.2, dl * 2, dl * 1.4);
    if(window.ASSIST && ASSIST.contrast){ const a = -WALLX() * uw, b = (j.reach + .3) * uw, hy = Math.max(PX, qx(uw * .035)); for(let k = 0; a + k * hy * 2 < b; k++){ cx.fillStyle = k % 2 ? '#101010' : '#ffd23a'; const q0 = a + k * hy * 2; pxRect(m > 0 ? x + q0 : x - q0 - hy * 2, y + PX, hy * 2, hy); } }
    if(fog < .6) glow(lx, y - dl * 2, uw * .5, '#4ad8ff', .12 * (1 - fog)); }

  /* tests: the animal alone in an orthographic view (side-on, or turned by yaw and seen from el below), n phases of one swim cycle, as a
     data URL of a contact strip (allocates: tests only, never during a ride) */
  function sheet(o){ o = o || {}; build(); const n = o.n || 12, k = o.k || 15, cw = CW_, ch = CH_, cols = o.cols || 4, out = mk(cw * cols, ch * Math.ceil(n / cols)), g = out.getContext('2d'), keep = Object.assign({}, CR);
    TST = { cx:0, cy:o.cy || 0, cz:o.cz == null ? -ML * .4 : o.cz, ox:cw / 2, oy:ch / 2, k, yaw:o.yaw || 0, el:o.el || 0, lt:o.lt == null ? .7 : o.lt, ex:-100, ey:o.ey || 0, ez:-ML * .4 };
    trReset(0, 0, 0, 0, 1); CR.NX = CR.NY = CR.NZ = 0; CR.v = 0; CR.roll = o.roll || 0; CR.yaw = o.yaw2 || 0; CR.gape = o.gape || .02; CR.mem = o.mem || 0; CR.shine = o.shine || 0; CR.lamp = 1;
    for(let f = 0; f < n; f++){ CR.ph = (o.ph0 || 0) + f / n * 6.2832; CR.fph = CR.ph / 2; crClear(); SDN = 1; crBuild(); crRaster(); CRX.clearRect(0, 0, cw, ch); if(BOX[2] >= 0) CRX.putImageData(CRI, 0, 0);
      const X = (f % cols) * cw, Y = Math.floor(f / cols) * ch; g.fillStyle = o.bg || '#0a1922'; g.fillRect(X, Y, cw, ch); g.drawImage(CRV, X, Y); }
    crClear(); TST = null; Object.assign(CR, keep); trC = 0; return out.toDataURL('image/png'); }
  // ---------------------------------------------------------------- the module
  MECH.sp_meg = {
    plans, S, F, U, DBG, CR, soaked:0,
    dbg(T, L){ L = L || LMAX; const p = add(T, L, -1 - T); boreSet(T, T + L, true); return p; },   /* tests: an encounter at portal T, L long (call it before the road there is generated) */
    findRange, _t:{ px:(x, y) => { const p = y * CW_ + x, b = S.BUF.getContext('2d').getImageData(x, y, 1, 1).data; return [CB ? CB[p] >>> 0 : -1, Array.from(b)]; }, raw:() => { const o = mk(CW_, CH_); o.getContext('2d').drawImage(S.BUF, 0, 0); return o.toDataURL(); }, pnOff:() => { PNL.on = false; }, ubOf, dimLevel, frame, sheet, vis:() => CR.vis + ' ' + (BOX[2] < 0 ? '-' : BOX.join(',')) + ' ' + CW_ + 'x' + CH_ + ' ' + (F.u | 0) + ' ' + CR.NX.toFixed(1) + ',' + CR.NY.toFixed(1) + ',' + (CR.NZ - CR.camZ).toFixed(1) + ' pn ' + (PNL.on ? PNL.k : '-'), panels:() => { buildPanels(); const all = PNL.F.eye.map(f => f.c), w = PNL.w, h = PNL.h, out = mk(w * 4, h * Math.ceil(all.length / 4)), g = out.getContext('2d'); g.fillStyle = '#300'; g.fillRect(0, 0, out.width, out.height); all.forEach((c, n) => { if(c) g.drawImage(c, (n % 4) * w, Math.floor(n / 4) * h); }); return out.toDataURL('image/png'); }, st:() => { let v = 0; for(let i = 0; i < NST; i++) v += PV[i]; return { NBS, NPR, v, box:BOX.slice(), EY, SLO, SHI, cr:Object.assign({}, CR), pc:[PCX[0], PCY[0], PD[0], PF[0], PL[0]], sk:[PCX[SKS], PCY[SKS], PV[SKS]] }; } },
    warm(){ try{ build(); wrapTube(); }catch(e){ console.warn('sp_meg warm', e); } const AQ = ENV.aqua && ENV.aqua.win; if(AQ) AQ.layer = layer;
      try{ if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16', CARD.kanji).then(() => { CC = null; try{ if(typeof cx !== 'undefined' && cx) cardArt(); }catch(e){} }).catch(() => {}); if(typeof cx !== 'undefined' && cx) cardArt(); }catch(e){} },
    reset(){ for(const p of plans){ if(p.cut){ p.cut.end(); p.cut = null; } if(p.thin) tension(false, p); } CD.t = -1; PNL.on = false; ckFor = null; nCK = 0; BBL.fill(0); CR.rt = 0; shove = 0; flick0 = -9; flk0 = -9; rumbleT = 0; PLA.fill(0); clearFrame(); leave(); MECH.sp_meg.soaked = 0; },
    place(i, s, L2){ if(i === 0){ for(const p of plans){ if(p.cut) p.cut.end(); } { const A = ENV.aqua && ENV.aqua.win; if(A && A.bores) for(const r of [...A.bores]) boreSet(r.a, r.b, false); } plans.length = 0; decided.clear(); }
      if(i <= lastI){ for(const p of plans) if(!p.off && (p.vk >= i || (p.di || 0) >= i)){ p.off = true; boreSet(p.T, p.T + p.L, false); decided.delete(p.vk); } for(const k of [...decided.keys()]) if(k + 2 >= i) decided.delete(k); }   // the road past here was regenerated (a fork): forget what was planned on it
      lastI = i; plan(i); placeSeg(i, s); },
    hitCar(){ const p = F.p; return !!p && F.u > -20 && F.u < U.win1 + 6; },
    update(dt){ update(dt); CR.flash = F.fl0 == null ? 0 : Math.max(0, 1 - (Tg - F.fl0) / .35); if(PNL.on) PNL.t += dt / ((window.TIME && TIME.scale) || 1); CR.lamp = clamp(1 - dimLevel() * 1.3, .25, 1); applyShove(dt); stepDust(dt); if(CD.t >= 0){ CD.t += dt / ((window.TIME && TIME.scale) || 1); if(CD.t > CD.dur) CD.t = -1; } if(rumbleT > 0){ rumbleT -= dt; if(!reduce && state === 'play') shake = Math.max(shake || 0, 2.5); } },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = F.p; if(!p) return; const k = s.index - p.T;
      if(F.fin > 0 && s.index === Math.min(p.T - 3, Math.floor(pSeg() + lerp(27, 15, F.fin)))) drawFin(s, sx0, sy0, uw, fog, now);
      for(const j of p.jets) if(k === j.k) drawJet(j, s, sx0, sy0, uw, fog, now); },
    overlay(now, sk){ if(!F.p && Tg - flick0 > 2.5 && Tg - flk0 > 1.3) return;
      const d = dimLevel(); if(d > .01){ cx.fillStyle = rgbaA('2,8,14', Math.round(d * 16) / 16); pxRect(0, 0, W, H); }
      if(CR.flash > 0 && F.p && F.p.rammed >= 0){ const k = CR.flash, r = H * (.06 + .1 * (1 - k)); glow(F.rx, F.ry, r, '#bff4ff', calm() ? .25 * k : .6 * k);   /* the glass giving way at the bite: a white-cyan flash */
        if(!calm() && k > .6){ cx.fillStyle = '#f4ffff'; for(let a = 0; a < 8; a++){ const ca = Math.cos(a * .785 + .3), sa = Math.sin(a * .785 + .3); for(let q = 0; q < r * .7; q += PX) pxRect(F.rx + ca * q, F.ry + sa * q * .6, PX, PX); } } }
      biteDraw();
      pnDraw(now);
      let any = false; for(let i = 0; i < NP; i++) if(PLA[i] > 0){ any = true; break; }
      if(any){ for(let i = 0; i < NP; i++){ if(PLA[i] <= 0 || PYA[i] > H) continue; if(PKA[i]){ cx.fillStyle = '#9fe2f4'; pxRect(PXA[i], PYA[i], PX, PX * 3); } else { cx.fillStyle = PLA[i] > .5 ? '#7a9aa0' : '#4a6468'; pxRect(PXA[i], PYA[i], PX, PX); } } } },
    post(now){ drawCard(); }
  };
})();
