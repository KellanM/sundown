/* Sundown mechanic module: stunts (MECH.stunts). The crash cam and the slide. See mech/README.md.

   References studied (rules taken, no art copied):
   - Burnout 3: Takedown (Criterion, 2004) and Burnout Paradise (2008), the crash cam: the world freezes at the instant of impact, a hard cut
     to a second angle, the wreck in slow motion (the bike cartwheeling, panels and glass flying, sparks where metal meets the road), then a
     hard cut back. It is short, any button skips it, and it is the punctuation of a crash or a takedown, not a cut-scene.
   - The slide: stunt riders' brake slides and the famous anime power slide's FRAMING only (the machine side-on and low, a long rubber
     stripe, a rooster tail of sparks, a held pose). The bike, rider and every pixel here are original: the side-on sport bike is the game's
     own red-and-white sport bike turned side-on (a 2-stroke race replica: full fairing, tall screen, expansion chamber, upswept tail).

   1. CRASH CAM. On a crash (core crash()) or a takedown (mech/gang.js), the frame freezes and the game drops to ~4% speed (TIME.scale is
      multiplied, never overwritten). Beat 1: the frozen frame punched in 1.5x on the impact (nearest-neighbour), an impact star.
      Beat 2: a cut to a side angle, a screen-space vignette: the frozen frame's skyline (zoomed 2x, dimmed) over a side-on strip of road;
      the bike cartwheels in 45-degree steps (lossless quarter turns plus RotSprite-style eighths), the rider tumbles (two poses, quarter
      turns) and slides on his back, fairing shards and glass fly, sparks pour from every contact. Then it hands back.
      Rules: 1.0-1.5 s; any new key, click or pad button skips it. WHEN: only the second strike (the crash that pulls you over) gets it,
      labelled 逮捕 BUSTED in cop red and cream (red only, like a Japanese light bar), as the beat right before the arrest: pullT is held at 0 while it plays, so mech/arrival.js's
      arrest starts from its first frame when the cam hands over (or at once on a skip). Ordinary crashes, the first one that starts a chase
      included, never get a cam (Kellan, 2026-11-19: it broke the flow). Takedowns no longer get one either (Kellan, 2026-11-19: it broke the flow; T.tdCam = true restores it); the wreck plays out live in mech/gang.js. Reduced motion / no flashing: one still impact frame, a stepped fade in and
      out, no shake, no flash, no moving particles. Game state is untouched: crash() has already run, and the police clock, the sun and every
      timer run on game time, which the cam only slows.
   2. THE SLIDE (スライド). Press SLIDE (S or the down arrow; pad LB; remappable as "slide") with a direction above 70% speed: the bike swings
      side-on and lays down low, the rear tyre lays a long rubber stripe and throws a rooster tail of sparks; at the peak the game holds for a
      beat (hit-stop) on the low side-on pose. Hold to keep sliding (up to 1.2 s), let go to stand it up.
      What it is for: it sheds speed fast (toward 40%) and holds the line in a bend (the outward pull drops to a third), so it saves a hairpin
      or buys time before a roadblock. It cancels a charged drift and any boost, so it is never faster than riding (bot-tested).
      The one trick: while the bike is in the LOW pose (0.12-0.44 s into the slide, and only then) traffic you slide into is slipped past
      (flow +1, "SLID PAST"). The low pose is the telegraph; outside it, a car is a crash as always. Roadblocks and spikes are not traffic.
   Art: every sprite is a pixel grid in this file, built into cached canvases in warm() and at a ride's reset (never mid-ride): the side-on
   bike at four heights (upright, three lean steps squashed row by row toward the camera) plus two yaw steps, the rider tucked; for the
   other bikes the same side-on build in each bike's colours through the cosmetics palette hook (COS.pal), so jackets, helmets and paint show.
   Debug: MECH.stunts._dbg. */
"use strict";
(() => {
const S = MECH.stunts = {};
const DIR = MECH.director;

/* ================================================================== tuning */
const T = {
  tdCam:false, camGap:20, camCrash:1.5, camBust:1.4, camTD:1.2, camRM:1.1, camScale:.04,      // crash cam: min real seconds between cams; lengths; game speed during it
  minSp:.7, slideMin:.45, slideMax:1.2, slideCD:.7,                    // slide: entry speed (of MAXS), held time limits, cooldown after
  target:.4, shed:2.6, pull:.35, steerK:.55, carry:.45,                 // speed target and rate; curve pull kept; steering kept; sideways carry
  inv0:.12, inv1:.44, peak:.16, hold:.11, holdScale:.08,               // the low pose (slip-past window, game s); peak hit-stop (real s)
};

/* ================================================================== art */
// ART3D: the side-on bike and rider as a small 3D part model, pre-rendered to pixel grids (palette keys) at warm time.
// Model units: the bike is 100 long (x: tail 0 -> nose 100), y up from the road, z toward the camera (+ is the near side).
// Every part is a flat profile (polygon / circle / annulus / capsule) extruded between z0 and z1. A pose rotates the model about its
// vertical axis (yaw, for swinging side-on from behind), then about its long axis (lean, the top toward the camera, so the seat, tank and
// the rider's back come into view and the near side drops), then in the picture plane (roll, for the crash tumble). Each part is filled
// by scanline at pixel centres (no anti-aliasing): its near face gets a 4-step ramp down the column (lit edge, light, mid, dark), the band
// swept between its far and near faces is its top (light) or underside (dark); later parts get a dark-hue outline where they meet earlier
// ones or the air; lone pixels are cleaned up.
const ART3D = (() => {
  const circ = (cx, cy, r, n) => { n = n || Math.max(14, Math.round(r * 2.2)); const o = []; for(let i = 0; i < n; i++){ const a = i / n * 6.2832; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const ell = (cx, cy, rx, ry) => { const o = []; for(let i = 0; i < 20; i++){ const a = i / 20 * 6.2832; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  function caps(x0, y0, x1, y1, w0, w1){ w1 = w1 == null ? w0 : w1; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, a = Math.atan2(dy, dx), o = [];
    for(let i = 0; i <= 6; i++){ const t = a + Math.PI / 2 + i / 6 * Math.PI; o.push([x0 + Math.cos(t) * w0 / 2, y0 + Math.sin(t) * w0 / 2]); }
    for(let i = 0; i <= 6; i++){ const t = a - Math.PI / 2 + i / 6 * Math.PI; o.push([x1 + Math.cos(t) * w1 / 2, y1 + Math.sin(t) * w1 / 2]); } return o; }
  const path = (pts, w) => { const o = []; for(let i = 0; i < pts.length - 1; i++) o.push(caps(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w)); return o; };   // a bent tube: one capsule per leg
  // ramps (palette keys, light -> dark): paint, leathers, helmet, tyre, chrome, dark metal, glass, seat, rubber accents
  const R = { paint:['0', '1', '2', '3'], lea:['b', 'B', 'B', 'D'], helm:['h', 'H', 'I', 'i'], tyre:['u', 't', 'T', 'T'], chrome:['W', 'W', 'v', 'p'], dark:['p', 'p', 'N', 'n'],
    glass:['g', 'g', 'G', 'G'], seat:['p', 'N', 'N', 'n'], boot:['p', 'N', 'n', 'n'], rim:['v', 'v', 'p', 'p'], acc:['E', 'E', 'E', 'e'], tail:['R', 'R', 'r', 'r'] };

  /* ---------------- the bike (after 1980s race replicas: Suzuki RG500 Gamma, Honda NS400R, GSX-R750 '85, CBR400F, GPZ900R side views:
     big 16-18" wheels about 0.3 of the length apart 0.65, a full fairing that stops behind the front tyre, a tall screen, a short tank, a
     humped single-seat tail, expansion chambers tucked under the belly and up under the tail, a raked fork, a front disc) */
  const RW = [22, 15], FW = [87, 15];
  function bike(){ const P = [];
    const wheel = (c, front) => {
      P.push({ shape:[circ(c[0], c[1], 15), circ(c[0], c[1], 10.6)], z:[-4.2, 4.2], ramp:R.tyre, g:'w' + front });                      // tyre (an annulus)
      P.push({ shape:[circ(c[0], c[1], 10.8)], z:[-2.4, 2.4], ramp:R.rim, g:'w' + front });                                               // cast wheel
      P.push({ shape:[circ(c[0], c[1], 8.6), circ(c[0], c[1], 3)], z:[2.5, 2.6], key:'n', g:'w' + front, flat:1, noLine:1 });          // the dark between the spokes
      for(let i = 0; i < 3; i++){ const a = i * 2.094 + .5; P.push({ shape:[caps(c[0], c[1], c[0] + Math.cos(a) * 9.4, c[1] + Math.sin(a) * 9.4, 2.4)], z:[2.6, 2.7], key:'v', g:'w' + front, flat:1, noLine:1 }); }
      P.push({ shape:[circ(c[0], c[1], 2.2)], z:[2.7, 3], key:'W', g:'w' + front, flat:1, noLine:1 });
      P.push({ shape:[circ(c[0], c[1], 14.2), circ(c[0], c[1], 13)], z:[4.2, 4.3], key:'u', g:'w' + front, flat:1, noLine:1, arc:[2.2, 4.2] }); };   // tyre highlight, upper rear quarter
    // far side first
    P.push({ shape:[caps(87, 15, 79.5, 41, 3.4)], z:[-6, -4.6], ramp:R.chrome, g:'ff' });
    P.push({ shape:path([[63, 15], [55, 7.5], [38, 7.5], [30, 17], [25, 30]], 5), z:[-7, -5], ramp:R.chrome, g:'fx' });
    wheel(RW, 0); wheel(FW, 1);
    P.push({ shape:[circ(87, 15, 8.2), circ(87, 15, 6.4)], z:[4.4, 4.9], ramp:R.chrome, g:'disc', noLine:1 });                            // front disc
    P.push({ shape:[caps(22, 15, 45, 21, 4.4, 5.6)], z:[-5.5, 5.5], ramp:R.dark, g:'sw' });                                                 // swingarm
    P.push({ shape:[[[39, 13], [62, 11], [67, 19], [63, 33], [45, 33], [37, 23]]], z:[-7, 7], ramp:R.dark, g:'eng' });                   // engine
    for(let i = 0; i < 4; i++) P.push({ shape:[caps(47 + i * 3.6, 28, 49 + i * 3.6, 18, 1)], z:[7, 7.1], key:'v', g:'eng', flat:1, noLine:1 });   // cylinder fins
    P.push({ shape:path([[64, 15], [56, 7], [38, 7], [30, 17], [25, 29]], 5.2), z:[5, 7.6], ramp:R.chrome, g:'ex' });                   // expansion chamber
    P.push({ shape:[caps(28, 31, 11, 41, 6.2, 5)], z:[3, 7.4], ramp:R.chrome, g:'ex2' });                                                  // silencer under the tail
    P.push({ shape:[[[3, 50], [8, 55], [24, 51], [33, 46], [31, 41], [12, 42], [4, 46]]], z:[-5, 5], ramp:R.paint, edge:1, topLit:1, g:'tail' });          // tail hump
    P.push({ shape:[[[2.6, 46.2], [5, 46], [5.6, 50.5], [3.4, 50]]], z:[-4, 5.1], ramp:R.tail, g:'tail', noLine:1 });                     // tail light
    P.push({ shape:[[[26, 45.5], [46, 45.5], [48, 49], [30, 49.5]]], z:[-5.5, 5.5], ramp:R.seat, g:'seat' });
    P.push({ shape:[[[44, 44], [47, 51], [59, 55], [69, 54], [68, 45], [52, 40]]], z:[-6.5, 6.5], ramp:R.paint, edge:1, topLit:1, g:'tank' });
    P.push({ shape:[caps(87, 15, 79.5, 41, 3.4)], z:[4.6, 6], ramp:R.chrome, g:'fk' });                                                    // near fork leg
    P.push({ shape:[caps(80.5, 22, 81.5, 25, 3)], z:[5, 6.4], key:'N', g:'fk', flat:1 });                                                // caliper
    P.push({ shape:[[[74, 28], [83, 32], [96, 30], [100, 25], [96, 27], [84, 29.5]]], z:[-4.6, 4.6], ramp:R.paint, edge:1, topLit:1, g:'fend' });          // front mudguard
    P.push({ shape:[[[64, 54], [74, 52], [88, 48], [97, 44], [101, 39], [100, 35], [95, 33], [84, 33], [77, 29], [73, 21], [70, 12], [56, 9.5], [46, 12], [45, 22], [52, 34], [58, 46]]],
      z:[-7.5, 7.5], ramp:R.paint, g:'fair', edge:1, topLit:1 });                                                                                     // the full fairing
    P.push({ shape:[[[47, 17], [99, 37.4], [99.4, 35.6], [47.6, 15.2]]], z:[7.5, 7.6], ramp:R.acc, g:'fair', flat:1, noLine:1 });               // livery stripe
    P.push({ shape:[caps(60, 45, 90, 40.5, .9)], z:[7.6, 7.7], key:'3', g:'fair', flat:1, noLine:1 });                                   // panel line under the upper fairing
    P.push({ shape:[caps(73, 22, 74, 31, .9)], z:[7.6, 7.7], key:'3', g:'fair', flat:1, noLine:1 });                                     // panel line by the wheel
    P.push({ shape:[[[99, 41], [101, 39.5], [100.6, 36.5], [98.6, 37]]], z:[-4, 7.7], key:'Y', g:'fair', flat:1, noLine:1 });            // headlight
    P.push({ shape:[caps(70, 50.5, 93, 44.2, 1.3)], z:[7.6, 7.7], key:'0', g:'fair', flat:1, noLine:1 });                              // gloss along the upper fairing
    P.push({ shape:[caps(51, 47, 60, 51, 1.6)], z:[6.5, 6.6], key:'0', g:'tank', flat:1, noLine:1 });                                     // tank gloss
    P.push({ shape:[caps(10, 49.6, 24, 47.2, 1.2)], z:[5, 5.1], key:'0', g:'tail', flat:1, noLine:1 });
    P.push({ shape:[[[66, 54], [72, 66], [78, 66], [86, 52], [76, 51]]], z:[-7, 7], ramp:R.glass, g:'scr' });                             // screen
    return P; }

  /* ---------------- the rider: capsule limbs between joints (one function, every pose). j: joints in model units; h: hang-off to the near side */
  function rider(j, o){ o = o || {}; const P = [], h = o.hang || 0, kz = o.knee || 0;
    const limb = (a, b, w0, w1, z, ramp, g) => P.push({ shape:[caps(a[0], a[1], b[0], b[1], w0, w1)], z, ramp, g });
    const side = (s, zz) => { const n = s > 0, J = n ? j.N : j.F, zc = n ? zz : -zz;
      return { arm:() => { limb(j.sh, J.el, 4.6, 4, [zc - 1.6 + h * .5, zc + 1.6 + h * .5], R.lea, 'arm' + s); limb(J.el, J.ha, 4, 3.4, [zc - 1.4 + h * .5, zc + 1.4 + h * .5], R.lea, 'arm' + s);
          P.push({ shape:[circ(J.ha[0], J.ha[1], 2.3)], z:[zc - 1.6, zc + 1.6], ramp:R.boot, g:'arm' + s }); },
        leg:() => { const kk = n ? kz : 0; limb(j.hip, J.kn, 7.6, 6.2, [zc - 2.6 + h + kk * .5, zc + 2.6 + h + kk * .5], R.lea, 'leg' + s); limb(J.kn, J.ft, 6, 5, [zc - 2.2 + h * .7 + kk * .8, zc + 2.2 + h * .7 + kk * .8], R.lea, 'leg' + s);
          P.push({ shape:[caps(J.ft[0], J.ft[1], J.toe[0], J.toe[1], 5.4, 3.6)], z:[zc - 2.4 + kk * .8, zc + 2.4 + kk * .8], ramp:R.boot, g:'leg' + s });
          if(n) P.push({ shape:[circ(J.kn[0], J.kn[1], 2.4)], z:[zc + 2.6 + h + kk * .5, zc + 2.7 + h + kk * .5], key:'v', g:'leg' + s, flat:1, noLine:1 }); } }; };   // knee slider
    const F = side(-1, 5.5), N = side(1, 5.5);
    F.leg(); F.arm();
    P.push({ shape:[caps(j.hip[0], j.hip[1], j.sh[0], j.sh[1], 11, 10)], z:[-5.2 + h, 5.2 + h], ramp:R.lea, g:'torso' });
    P.push({ shape:[caps(j.hip[0] + (j.sh[0] - j.hip[0]) * .1, j.hip[1] + (j.sh[1] - j.hip[1]) * .1 + 4.6, j.sh[0] - (j.sh[0] - j.hip[0]) * .18, j.sh[1] - (j.sh[1] - j.hip[1]) * .18 + 4.4, 2)], z:[h - .1, h + .1], key:'C', g:'torso', flat:1, noLine:1 });   // spine stripe, seen when the bike lays down
    P.push({ shape:[caps(j.hip[0] + (j.sh[0] - j.hip[0]) * .2, j.hip[1] + (j.sh[1] - j.hip[1]) * .2 + 2.2, j.sh[0] - (j.sh[0] - j.hip[0]) * .1, j.sh[1] - (j.sh[1] - j.hip[1]) * .1 + 2.2, 2.4)],
      z:[5.2 + h, 5.3 + h], key:'C', g:'torso', flat:1, noLine:1 });                                                                      // the stripe down the leathers
    P.push({ shape:[circ(j.sh[0] - (j.sh[0] - j.hip[0]) * .08, j.sh[1] - (j.sh[1] - j.hip[1]) * .08, 3.6)], z:[5.2 + h, 5.3 + h], key:'D', g:'torso', flat:1, noLine:1 });   // shoulder armour
    const hd = j.head; P.push({ shape:[circ(hd[0], hd[1], 6.4)], z:[-5.6 + h, 5.6 + h], ramp:R.helm, g:'head' });
    const fx = j.face || 1; P.push({ shape:[[[hd[0] + fx * 1.2, hd[1] + 2.2], [hd[0] + fx * 6.2, hd[1] + 1.4], [hd[0] + fx * 6, hd[1] - 2.6], [hd[0] + fx * 1, hd[1] - 2.2]]], z:[5.6 + h, 5.7 + h], key:'G', g:'head', flat:1, noLine:1 });   // visor
    P.push({ shape:[caps(hd[0] - fx * 5.6, hd[1] + 1.4, hd[0] + fx * 3, hd[1] + 6, 1.8)], z:[5.6 + h, 5.7 + h], key:'J', g:'head', flat:1, noLine:1 });   // helmet stripe
    N.leg(); N.arm();
    return P; }
  // the tuck on the bike
  const TUCK = { hip:[38, 52], sh:[63, 62], head:[71, 66], N:{ el:[71, 53], ha:[80, 49], kn:[56, 42], ft:[43, 29], toe:[49, 28] }, F:{ el:[71, 53], ha:[80, 49], kn:[56, 42], ft:[43, 29], toe:[49, 28] } };
  // thrown: three tumbling shapes and two sliding-on-the-back frames (feet first, toward +x)
  const THROWN = {
    spread:{ hip:[40, 30], sh:[60, 34], head:[68, 36], face:1, N:{ el:[66, 46], ha:[70, 56], kn:[30, 40], ft:[20, 48], toe:[19, 53] }, F:{ el:[66, 24], ha:[72, 15], kn:[29, 23], ft:[19, 18], toe:[17, 13] } },
    ball:{ hip:[42, 30], sh:[52, 40], head:[58, 46], face:1, N:{ el:[56, 32], ha:[52, 24], kn:[54, 30], ft:[44, 22], toe:[48, 19] }, F:{ el:[57, 34], ha:[54, 26], kn:[52, 26], ft:[42, 20], toe:[46, 17] } },
    twist:{ hip:[42, 30], sh:[56, 40], head:[62, 46], face:1, N:{ el:[66, 38], ha:[74, 42], kn:[34, 38], ft:[30, 26], toe:[34, 23] }, F:{ el:[50, 50], ha:[46, 58], kn:[50, 24], ft:[60, 18], toe:[64, 20] } },
    back1:{ hip:[48, 6], sh:[30, 8], head:[22, 10], face:-1, N:{ el:[34, 16], ha:[42, 20], kn:[62, 9], ft:[74, 5], toe:[79, 8] }, F:{ el:[24, 4], ha:[16, 4], kn:[62, 7], ft:[74, 4], toe:[78, 7] } },
    back2:{ hip:[48, 6], sh:[30, 8], head:[21, 12], face:-1, N:{ el:[30, 18], ha:[24, 24], kn:[60, 12], ft:[72, 8], toe:[77, 11] }, F:{ el:[36, 4], ha:[44, 3], kn:[62, 6], ft:[75, 4], toe:[79, 7] } } };

  /* ---------------- rendering */
  function xf(o){ const yw = (o.yaw || 0) * Math.PI / 180, ln = (o.lean || 0) * Math.PI / 180, rl = (o.roll || 0) * Math.PI / 180, cy = Math.cos(yw), sy = Math.sin(yw), cl = Math.cos(ln), sl = Math.sin(ln), cr = Math.cos(rl), sr = Math.sin(rl), px = o.px == null ? 50 : o.px, py = o.py || 0;
    return (x, y, z) => { let X = (x - 50) * cy + z * sy + 50, Z = -(x - 50) * sy + z * cy, Y = y;   // yaw about the bike's middle
      const Y2 = Y * cl - Z * sl;                                                                  // lean about the contact line
      const dx = X - px, dy = Y2 - py; return [px + dx * cr + dy * sr, py - dx * sr + dy * cr]; }; }
  function fill(mask, W, H, contours, tag){   // even-odd scanline fill at pixel centres; contours in pixel coords
    let y0 = H, y1 = -1; for(const c of contours) for(const p of c){ if(p[1] < y0) y0 = p[1]; if(p[1] > y1) y1 = p[1]; }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1)); const xs = [];
    for(let y = y0; y <= y1; y++){ const yc = y + .5; xs.length = 0;
      for(const c of contours) for(let i = 0, n = c.length, k = n - 1; i < n; k = i++){ const a = c[i], b = c[k]; if((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
      xs.sort((p, q) => p - q); for(let i = 0; i + 1 < xs.length; i += 2){ const xa = Math.max(0, Math.ceil(xs[i] - .5)), xb = Math.min(W - 1, Math.floor(xs[i + 1] - .5)); for(let x = xa; x <= xb; x++) mask[y * W + x] = tag; } } }
  function render(parts, o){ const T = xf(o), s = o.s;
    const tp = parts.map(p => { const sweep = []; const z0 = p.z[0], z1 = p.z[1];
      const face = p.shape.map(c => c.map(([x, y]) => T(x, y, z1))), far = p.shape.map(c => c.map(([x, y]) => T(x, y, z0)));
      return { p, face, far }; });
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9; for(const t of tp) for(const set of [t.face, t.far]) for(const c of set) for(const [x, y] of c){ if(x < mnx) mnx = x; if(x > mxx) mxx = x; if(y < mny) mny = y; if(y > mxy) mxy = y; }
    const W = Math.ceil((mxx - mnx) * s) + 4, H = Math.ceil((mxy - mny) * s) + 4, toPx = c => c.map(([x, y]) => [(x - mnx) * s + 2, (mxy - y) * s + 2]);
    const id = new Int16Array(W * H).fill(-1), tone = new Int8Array(W * H), fm = new Int16Array(W * H), sm = new Int16Array(W * H);
    tp.forEach((t, n) => { const p = t.p; fm.fill(-1); sm.fill(-1); const F = t.face.map(toPx), B = t.far.map(toPx);
      if(p.arc){ // keep only an arc of the ring (the tyre's highlight): clip by angle in model space after projection, approximated on the face polygon
        const c0 = F[0], cx0 = c0.reduce((a, q) => a + q[0], 0) / c0.length, cy0 = c0.reduce((a, q) => a + q[1], 0) / c0.length; fill(fm, W, H, F, n);
        for(let i = 0; i < W * H; i++) if(fm[i] === n){ const a = Math.atan2(-(Math.floor(i / W) + .5 - cy0), (i % W) + .5 - cx0); const aa = (a + 6.2832) % 6.2832; if(aa < p.arc[0] || aa > p.arc[1]) fm[i] = -1; } }
      else fill(fm, W, H, F, n);
      if(!p.flat){ const dx = F[0][0][0] - B[0][0][0], dy = F[0][0][1] - B[0][0][1], st = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
        for(let k = 0; k < st; k++){ const f = k / st; fill(sm, W, H, B.map(c => c.map(([x, y]) => [x + dx * f, y + dy * f])), n); } t.up = dy > 0; }   // up: the far face sits higher, so the band above the face is the top
      // per column, the face's span (for the ramp)
      for(let x = 0; x < W; x++){ let top = -1, bot = -1; for(let y = 0; y < H; y++) if(fm[y * W + x] === n){ if(top < 0) top = y; bot = y; }
        for(let y = 0; y < H; y++){ const i = y * W + x, inF = fm[i] === n, inS = sm[i] === n; if(!inF && !inS) continue;
          id[i] = n; if(inF){ const r = bot > top ? (y - top) / (bot - top) : .5; tone[i] = p.edge && y === top ? 0 : Math.min(3, (r < .4 ? 1 : r < .8 ? 2 : 3) + (o.dim || 0)); }
          else { const above = top < 0 ? t.up : (y < top) === t.up; tone[i] = above ? (t.up && y === top - 1 ? 2 : 4) : 5; } } } });
    // keys, outline, cleanup
    const g = Array.from({ length:H }, () => Array(W).fill('.')), grp = n => parts[n].g;
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){ const i = y * W + x, n = id[i]; if(n < 0) continue; const p = parts[n];
      let edge = false; for(const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]){ const X = x + dx, Y = y + dy, m = X < 0 || Y < 0 || X >= W || Y >= H ? -1 : id[Y * W + X];
        if(m < 0 || (!p.noLine && m < n && grp(m) !== p.g && !parts[m].noLine)){ edge = true; break; } }
      if(edge){ g[y][x] = 'K'; continue; }
      const tn = tone[i]; g[y][x] = p.key || (tn <= 3 ? p.ramp[tn] : tn === 4 ? p.ramp[p.topLit ? 0 : 1] : p.ramp[3]); }
    for(let y = 1; y < H - 1; y++) for(let x = 1; x < W - 1; x++){ const c = g[y][x]; if(c === '.' || c === 'K') continue; const nb = [g[y - 1][x], g[y + 1][x], g[y][x - 1], g[y][x + 1]];
      if(!nb.includes(c)){ const cnt = {}; let best = nb[0]; for(const q of nb){ if(q === '.') continue; cnt[q] = (cnt[q] || 0) + 1; if(cnt[q] > (cnt[best] || 0)) best = q; } if(best !== '.' && best !== 'K') g[y][x] = best; } }
    // trim
    let a = 0, b = H - 1, l = W, r = 0; while(a < H && !g[a].some(c => c !== '.')) a++; while(b > a && !g[b].some(c => c !== '.')) b--;
    for(let y = a; y <= b; y++) for(let x = 0; x < W; x++) if(g[y][x] !== '.'){ if(x < l) l = x; if(x > r) r = x; }
    // where the model's origin (x = 50 on the road) lands, for anchoring
    const pj = q => [(q[0] - mnx) * s + 2 - l, (mxy - q[1]) * s + 2 - a], org = T(o.ax == null ? 50 : o.ax, 0, 0);
    return { rows:g.slice(a, b + 1).map(row => row.slice(l, r + 1).join('')), ax:pj(org)[0], ay:pj(org)[1], pts:(o.pts || []).map(([x, y, z]) => pj(T(x, y, z))) }; }
  // flying bits: a fairing shard, a livery shard, a mirror on its stalk, screen glass
  const SHARDS = [[{ shape:[[[0, 0], [9, 2], [6, 8]]], z:[-1, 1], ramp:R.paint, edge:1, topLit:1, g:'a' }],
    [{ shape:[[[0, 0], [11, 1], [10, 4], [1, 3]]], z:[-1, 1], ramp:R.paint, g:'a' }, { shape:[[[1, 1.4], [10, 2.2], [10, 3], [1, 2.4]]], z:[1, 1.1], key:'E', g:'a', flat:1, noLine:1 }],
    [{ shape:[caps(0, 0, 4, 3, 1.4)], z:[-.6, .6], ramp:R.chrome, g:'a' }, { shape:[ell(6, 4.5, 3.2, 2.2)], z:[-1, 1], ramp:R.dark, g:'b' }],
    [{ shape:[[[0, 0], [6, 1], [2, 7]]], z:[-.5, .5], ramp:R.glass, g:'a' }]];
  return { bike, rider, TUCK, THROWN, SHARDS, render, R }; })();

// flying bits at 1:1 (fairing shards, a livery shard, a mirror, screen glass) and the impact star
const DEBRIS = [['..KKK..', '.K012K.', 'K01223K', '.K233K.', '..KKK..'], ['KKKK...', 'KE22KK.', '.KK223K', '...KKK.'], ['.KKK.', 'KWvvK', 'KvpK.', '.KK..'], ['.KK', 'KgK', 'KgK', '.K.']];
const STAR = ['....K....', '...KYK...', '...KYK...', 'KKKKOKKKK', 'KYYOOOYYK', 'KKKKOKKKK', '...KYK...', '...KYK...', '....K....'];
const SPK = ['#fff4c0', '#ffd04a', '#ff8a3a', '#ffb35a'];

const COMMON = { G:'#1c2238', g:'#4a5684', T:'#18161c', t:'#4a4652', v:'#a8a4b0', W:'#f4f0e8', N:'#24222c', p:'#3a3a48', R:'#ff2a3a', Y:'#fff4c0', O:'#ffffff' };
// each bike's side-on colours (paint ramp 1-3, livery stripe E, leathers B-D, helmet H-J), from env/bikes.js
const SIDEP = {
  sport:  { K:'#0a0810', 1:'#ff5a6a', 2:'#d0203a', 3:'#7a1024', E:'#f4f0e8', B:'#f4f0e8', C:'#3ad0f0', D:'#106a90', H:'#f4f0e8', I:'#a8a4b0', J:'#ff2a3a' },
  capsule:{ K:'#1c0610', 1:'#ff6e66', 2:'#e01c32', 3:'#980e22', E:'#ffd070', B:'#ff7a56', C:'#ffd070', D:'#741410', H:'#f6f2ee', I:'#bcb4b8', J:'#ff8a2a' },
  kaido:  { K:'#0a0a1e', 1:'#7af0e0', 2:'#20a8b0', 3:'#0e5068', E:'#ffe48a', B:'#a87af0', C:'#ffe48a', D:'#2e1660', H:'#ffe48a', I:'#d8a838', J:'#e0303a' },
  cafe:   { K:'#0c0c16', 1:'#d4d4e2', 2:'#9494ac', 3:'#4a4a62', E:'#d8303a', B:'#d0946a', C:'#8a5232', D:'#40220f', H:'#fff6e0', I:'#d8c8a0', J:'#d8303a' },
  neon:   { K:'#05040c', 1:'#4a4a74', 2:'#2a2844', 3:'#14122a', E:'#4ff0ff', B:'#4a4870', C:'#4ff0ff', D:'#121020', H:'#4a4a70', I:'#2a2840', J:'#ff3bd0' },
  gp:     { K:'#080a18', 1:'#7aa4ff', 2:'#2050d0', 3:'#10206a', E:'#ff4a4a', B:'#f6f4ee', C:'#ff4a4a', D:'#2050d0', H:'#f6f4ee', I:'#b0b0c8', J:'#2050d0' } };
// the three gangs (mech/gang.js GANGS colours), for a takedown's wreck
const GANGP = [['#ffb0b4', '#ff5a6a', '#d81e3a', '#8a0c26', '#1c0610'], ['#e6c8ff', '#b07aff', '#7a3ae0', '#44188a', '#120820'], ['#c8f0ff', '#6ac8ff', '#2a7ae0', '#14408a', '#06101e']]
  .map(c => ({ K:c[4], 1:c[1], 2:c[2], 3:c[3], E:c[0], B:'#e8e0d2', C:c[1], D:c[3], H:c[0], I:c[2], J:'#ffd04a' }));

/* ---------------- grids from the model (palette-free), per art size. Three native sizes (the bike about 45, 90 and 130 px long), each drawn
   at exactly one canvas pixel per art pixel: the one nearest the bike's on-screen size is used, so nothing is ever upscaled. */
const SIZES = [.45, .9, 1.3];
const rot90 = rows => { const h = rows.length, w = rows[0].length, o = []; for(let x = 0; x < w; x++){ let q = ''; for(let y = h - 1; y >= 0; y--) q += rows[y][x]; o.push(q); } return o; };
const rotN = (rows, q) => { let r = rows; for(let i = 0; i < ((q % 4) + 4) % 4; i++) r = rot90(r); return r; };
const pad = rows => { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.')); };
const flipRows = rows => rows.map(r => r.split('').reverse().join(''));
// the slide's poses: 0 side-on upright, 1-2 leaning, 3 the low pose (58 degrees, hung off, knee and boot at the road), 4-5 swinging round from behind
const POSE_O = [{ lean:0 }, { lean:20 }, { lean:40, dim:1, hang:3, knee:4 }, { lean:58, dim:1, hang:7, knee:14 }, { yaw:28, lean:12 }, { yaw:55, lean:8 }];
const THROWN_K = ['spread', 'ball', 'twist', 'back1', 'back2'], THROWN_ROLL = [0, 125, 245, 0, 0];
// kodawari #6: the thrown rider at 1.35x the bike's art scale. The model's rider is built for the tuck (a 1.1 m figure on a 2 m bike); laid out
// beside the cartwheeling bike in the crash cam he read as a third of its size. At 1.35x he is about 0.85 of its length, as a person is.
const THROWN_S = 1.35;
const GRIDS = {};   // size -> { pose:[{rows, ax, rx}], tumble:[rows], thrown:[rows] }
function gridJobs(si){ const s = SIZES[si], G = GRIDS[si] || (GRIDS[si] = { pose:[], tumble:[], thrown:[] }), jobs = [];
  POSE_O.forEach((o, i) => jobs.push(() => { const r = ART3D.render([...ART3D.bike(), ...ART3D.rider(ART3D.TUCK, { hang:o.hang || 0, knee:o.knee || 0 })], Object.assign({ s, pts:[[22, 0, 4]] }, o));
    G.pose[i] = { rows:r.rows, ax:r.ax, rx:r.pts[0][0] }; }));
  for(let i = 0; i < 8; i++) jobs.push(() => { G.tumble[i] = ART3D.render(ART3D.bike(), { s, roll:i * 45, px:50, py:22 }).rows; });
  THROWN_K.forEach((k, i) => jobs.push(() => { G.thrown[i] = ART3D.render(ART3D.rider(ART3D.THROWN[k]), { s:s * THROWN_S, roll:THROWN_ROLL[i], px:45, py:30 }).rows; }));   // (only the crash cam's side shot draws these)
  jobs.push(() => { G.debris = ART3D.SHARDS.map(sh => [0, 1, 2, 3].map(q => ART3D.render(sh, { s:s * 1.6, roll:q * 90, lean:25, px:4, py:3 }).rows)); });
  return jobs; }
const gridDone = si => { const G = GRIDS[si]; return !!G && G.pose.length === POSE_O.length && G.pose.every(Boolean) && G.tumble.filter(Boolean).length === 8 && G.thrown.filter(Boolean).length === 5 && !!G.debris; };
function gridsSync(si){ if(!gridDone(si)) for(const j of gridJobs(si)) j(); }
// warm-up across idle slices (one render per slice) so the title screen never stalls; a ride's reset finishes whatever is left
let idleQ = [];
function idleWarm(){ const t0 = Date.now(); while(idleQ.length && Date.now() - t0 < 8) idleQ.shift()(); if(idleQ.length) setTimeout(idleWarm, 30); }
// which art size: the slide bike matches the game's bike scale (about 44 sprite px of the old side-on at kBike); the crash cam's wreck is 1.5x that
function sizeFor(mult){ const want = 44 * kBike() / PX * mult / 100; let best = 0; SIZES.forEach((z, i) => { if(Math.abs(z - want) < Math.abs(SIZES[best] - want)) best = i; }); return best; }

/* ---------------- sprite sets (canvases), one per palette and size: built in warm() / reset(), never mid-ride */
const SETS = {};
function canvasOf(rows, pal){ rows = pad(rows); const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length; const k = c.getContext('2d');
  rows.forEach((r, y) => { for(let x = 0; x < r.length; x++){ const col = pal[r[x]]; if(r[x] === '.' || !col) continue; k.fillStyle = col; k.fillRect(x, y, 1, 1); } }); return c; }
const mixh = (a, b, t) => { const h = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// the 4th tones of each ramp, derived from the palette (so cosmetics recolour them too)
function derive(pal){ const P = Object.assign({}, COMMON, pal); P['0'] = mixh(P['1'], '#ffffff', .45); P.b = mixh(P.B, '#ffffff', .5); P.h = mixh(P.H, '#ffffff', .55); P.i = mixh(P.I, '#000000', .35);
  P.e = mixh(P.E, '#000000', .3); P.u = '#6a6672'; P.n = '#121018'; P.r = '#a01828'; return P; }
function buildSet(key, pal, slide, si, ci){ const k2 = key + ':' + si + ':' + ci; if(SETS[k2]) return SETS[k2]; gridsSync(si); if(ci !== si) gridsSync(ci); const P = derive(pal), S1 = { key:k2, si, ci };
  const C = GRIDS[ci]; S1.tumble = C.tumble.map(r => canvasOf(r, P)); S1.thrown = C.thrown.map(r => canvasOf(r, P)); S1.debris = C.debris.map(d => d.map(r => canvasOf(r, P)));
  if(slide){ const G = GRIDS[si]; S1.pose = G.pose.map(g => canvasOf(g.rows, P)); S1.poseL = G.pose.map(g => canvasOf(flipRows(pad(g.rows)), P)); S1.meta = G.pose; }
  return SETS[k2] = S1; }
// the player's colours: the bike's own side palette through the cosmetics hook (paint on the bike, jacket and helmet on the rider)
function playerPal(){ const id = SIDEP[BIKE.id] ? BIKE.id : 'sport', P0 = Object.assign({}, COMMON, SIDEP[id]), C = window.COS;
  if(!C || !C.sig || !C.pal) return { id, sig:'', pal:P0 };
  let top = P0, rid = P0; try{ top = C.pal(id, 'top', P0); rid = C.pal(id, 'rider', P0); }catch(e){}
  const pal = Object.assign({}, top); for(const k of 'BCDHIJL') if(rid[k]) pal[k] = rid[k]; return { id, sig:C.sig, pal }; }
let PS = null;   // the player's current set
function playerSet(){ const p = playerPal(), si = sizeFor(1), ci = sizeFor(1.5), key = 'p:' + p.id + p.sig + ':' + si + ':' + ci; if(!PS || PS.key !== key) PS = buildSet('p:' + p.id + p.sig, p.pal, true, si, ci); return PS; }
const gangSet = gi => buildSet('g' + gi, GANGP[gi], false, sizeFor(1), sizeFor(1.5));
let STARC = null, LABELS = {};
function tint(m, col){ const c = document.createElement('canvas'); c.width = m.width; c.height = m.height; const k = c.getContext('2d'); k.drawImage(m, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = col; k.fillRect(0, 0, c.width, c.height); return c; }
function label(kj, en, c1, c2){ const key = kj + en; if(LABELS[key]) return LABELS[key]; if(typeof pixText !== 'function') return null;
  const a = pixText(kj, 16), b = pixText(en, 16, true), c = document.createElement('canvas'); c.width = a.width + b.width + 8; c.height = Math.max(a.height, b.height); const k = c.getContext('2d');
  k.drawImage(tint(a, c1 || '#ff3b5c'), 0, 0); k.drawImage(tint(b, c2 || '#f4ecdf'), a.width + 8, 0); return LABELS[key] = c; }
let BUF = null;
function bufFit(){ const cv = cx.canvas; if(!BUF){ BUF = document.createElement('canvas'); } if(BUF.width !== cv.width || BUF.height !== cv.height){ BUF.width = cv.width; BUF.height = cv.height; } }
// the HUD and the call-outs step out for the crash cam and fade back after it (4 steps, 0.4 s): env/hud.js's canvas instruments are skipped
// during the cam, then drawn over a copy of the frame and blended back in; the DOM HUD, banners and floats use a body class
let hudWrapped = false, camEndRT = -1e9, BUF2 = null;
function wrapHud(){ if(hudWrapped || !ENV.hud || !ENV.hud.draw) return; hudWrapped = true; const hd = ENV.hud.draw;
  ENV.hud.draw = function(){ if(cam) return; const a = stepq((rt - camEndRT) / .4, 4); if(a >= 1 || !BUF2) return hd.apply(this, arguments);
    const cv = cx.canvas; if(BUF2.width !== cv.width || BUF2.height !== cv.height) return hd.apply(this, arguments);
    const b = BUF2.getContext('2d'); b.clearRect(0, 0, cv.width, cv.height); b.drawImage(cv, 0, 0); const r = hd.apply(this, arguments);
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = 1 - a; cx.drawImage(BUF2, 0, 0); cx.restore(); return r; }; }
function domHud(on){ const b = document.body; if(!b) return;
  if(!document.getElementById('stk-css')){ const st = document.createElement('style'); st.id = 'stk-css';
    st.textContent = 'body.stk-cam .top,body.stk-cam #next,body.stk-cam .float,body.stk-cam #banner{opacity:0!important}body.stk-back .top,body.stk-back #next,body.stk-back #banner{transition:opacity .4s steps(4)}'; document.head.appendChild(st); }
  if(on){ b.classList.add('stk-back', 'stk-cam'); } else { b.classList.remove('stk-cam'); clearTimeout(domHud.t); domHud.t = setTimeout(() => b.classList.remove('stk-back'), 600); } }
function warmAll(sync){ try{ wrapHud(); if(cx){ const cv = cx.canvas; if(!BUF2) BUF2 = document.createElement('canvas'); BUF2.width = cv.width; BUF2.height = cv.height; } if(!sync){ idleQ = [...gridJobs(sizeFor(1)), ...gridJobs(sizeFor(1.5))]; idleWarm(); }
    else { playerSet(); for(let i = 0; i < 3; i++) gangSet(i); } 
    label('クラッシュ', 'CRASH'); label('撃墜', 'TAKEDOWN'); label('逮捕', 'BUSTED', '#ff2a3a', '#f4ecdf'); if(cx) bufFit();
    const A = MECH.arrival; if(A && A.prebuild){ A.prebuild('スライド SLIDE', { kanji:'滑', col:'#ffb35a' }); A.prebuild('Slid past', { col:'#ffd04a' }); } }catch(e){ console.warn('stunts warm', e); } }

/* ================================================================== shared drawing helpers (CSS px; the canvas transform is 1/PX) */
const kBike = () => Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX);
function put(c, x, yb, k){ const w = snap(c.width * k), h = snap(c.height * k); cx.drawImage(c, snap(x - w / 2), snap(yb) - h, w, h); }
const stepq = (p, n) => Math.floor(Math.max(0, Math.min(1, p)) * n) / n;
const RM = () => reduce || (window.ASSIST && ASSIST.noFlash);

/* ================================================================== time: a real-time clock (pauses freeze it) and the TIME.scale share */
S.now = () => performance.now();
let lastNow = 0, rt = 0, lastBase = 1, lastWrit = -1;
function realDt(){ const n = S.now(), d = lastNow ? Math.min(.05, Math.max(0, (n - lastNow) / 1000)) : 1 / 60; lastNow = n; return d; }
function applyScale(f){ if(!window.TIME) return; const base = TIME.scale === lastWrit ? lastBase : TIME.scale; lastBase = base; TIME.scale = base * f; lastWrit = TIME.scale; }

/* ================================================================== 1. the crash cam */
let cam = null, lastCamRT = -1e9, rideCams = 0, crashSeen = 0, tdSeen = 0, firstCrash = true;
const camOn = () => !!cam;
function camStart(kind, ix, iy, gi){ if(cam) return; const rm = RM();
  cam = { kind, t:0, dur:rm ? T.camRM : kind === 'td' ? T.camTD : kind === 'bust' ? T.camBust : T.camCrash, ix, iy, rm, gi, set:kind === 'td' ? gangSet(gi) : playerSet(), shot:false, side:Math.random() < .5 ? 1 : -1,
    deb:[], spk:[], cut:kind === 'td' ? .22 : .3 };
  lastCamRT = rt; rideCams++; domHud(true);
  if(DIR && DIR.cine) try{ cam.cine = DIR.cine({ id:'crashcam', letterbox:false, duck:.4, dur:cam.dur }); }catch(e){}
  if(!rm){ const k = kBike(); for(let i = 0; i < 9; i++) cam.deb.push({ x:0, y:0, vx:rr(-1, 1) * 260 + 120, vy:rr(-520, -180), d:i % 4, r:(Math.random() * 4) | 0, vr:rr(4, 12), k }); }
  if(window.SFX && SFX.ready && SFX.ready()) SFX.play('spark', { pan:0 }); }
function camEnd(){ if(!cam) return; if(cam.cine) try{ cam.cine.end(); }catch(e){} cam = null; camEndRT = rt; domHud(false); }
S.skip = () => { if(cam && cam.t > .12) camEnd(); };
// any new press skips (never consumed: the key still does its job)
addEventListener('keydown', e => { if(!e.repeat && cam && !(typeof PSE !== 'undefined' && PSE.on)) S.skip(); }, true);
addEventListener('pointerdown', () => { if(cam) S.skip(); }, true);
function camUpdate(rdt){ if(!cam) return 1; cam.t += rdt; if(cam.t >= cam.dur){ camEnd(); return 1; }
  const out = cam.dur - cam.t; return out < .2 ? T.camScale + (1 - T.camScale) * (1 - out / .2) : T.camScale; }
// the wreck's motion in the side shot, u 0..1 across the shot
function wreck(u, k){ const gy = H * .8, sd = cam.side, x0 = W / 2 - sd * W * .2, bx = x0 + sd * W * .34 * u, hop = Math.abs(Math.sin(u * Math.PI * 2.2)) * H * .12 * (1 - u * .8);
  const rx = x0 - sd * W * .06 + sd * W * .26 * Math.min(1, u * 1.25), ru = Math.min(1, u / .62), ry = gy - Math.sin(ru * Math.PI) * H * .2;
  return { gy, bx, by:gy - hop, brot:((Math.floor(u * 7) * sd) % 8 + 8) % 8, ground:hop < k * 3, rx, ry, rland:u >= .62, rf:Math.floor(u * 9) % 4 }; }
function camGrab(){ bufFit(); const cv = cx.canvas, b = BUF.getContext('2d'); b.imageSmoothingEnabled = false; b.clearRect(0, 0, cv.width, cv.height); b.drawImage(cv, 0, 0); cam.shot = true; cam.lean = leanV; }
function camDraw(now, rdt){ const c = cam, cv = cx.canvas, cw = cv.width, ch = cv.height, P = PX;
  if(!c.shot) camGrab();   // (normally grabbed in drawUnderBike: the world without the bike, the HUD or any call-out)
  const fadeIn = c.rm ? stepq(c.t / .2, 4) : 1, fadeOut = stepq((c.dur - c.t) / .2, 4), A = Math.min(fadeIn, fadeOut); if(A <= 0) return;
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = A;
  const ix = Math.round(c.ix / P), iy = Math.round(c.iy / P), k = kBike();
  if(c.rm || c.t < c.cut){
    // beat 1: the frozen impact, punched in (still under reduced motion)
    const z = c.rm ? 1.5 : 1.5, sw = Math.round(cw / z), sh = Math.round(ch / z), sx = clamp(ix - (sw >> 1), 0, cw - sw), sy = clamp(iy - Math.round(sh * .6), 0, ch - sh);
    cx.drawImage(BUF, sx, sy, sw, sh, 0, 0, cw, ch);
    // the rider's own bike, redrawn into the punched-in frame at the instant of impact
    if(!BIKE.hidden){ const bs = Math.min(W * .2, H * .27); cx.setTransform(z / P, 0, 0, z / P, -sx * z, -sy * z);
      try{ if(ENV.bikes && ENV.bikes.draw && BIKE.id !== 'sport') ENV.bikes.draw(BIKE.id, W / 2, H - 8, bs, c.lean || 0, now); else drawBike(W / 2, H - 8, bs, c.lean || 0, now); }catch(e){}
      cx.setTransform(1, 0, 0, 1, 0, 0); }
    cx.fillStyle = 'rgba(10,6,24,.28)'; cx.fillRect(0, 0, cw, ch);
    // the impact: a burst of sparks thrown out from the contact, its middle left open, gone in .16 s (kodawari #6: the old 9x9 star stayed
    // on the rider's chest for the whole beat and read as a yellow '+' marker on him)
    if(!c.rm){ if(c.t < .16){ const sk = Math.max(1, Math.round(k / P)), bx = (ix - sx) * z, by = (iy - sy) * z, q = c.t / .16;
        for(let i = 0; i < 12; i++){ const a = (i + hash(i * 3.7) * .6) / 12 * 6.283, ca = Math.cos(a), sa = Math.sin(a), r0 = (5 + q * 10) * sk, r1 = r0 + (3 + hash(i * 1.9) * 6) * sk * (1 - q * .5);
          for(let d = r0; d < r1; d += sk){ const f = (d - r0) / Math.max(1, r1 - r0); cx.fillStyle = f < .34 ? '#fff4c0' : SPK[1 + ((f * 3) | 0) % 3]; cx.fillRect(Math.round(bx + ca * d), Math.round(by + sa * d * .8), sk, sk); } } }
      if(c.t < .05 && !(window.ASSIST && ASSIST.noFlash)){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = 'rgba(255,236,200,.35)'; cx.fillRect(0, 0, cw, ch); cx.globalCompositeOperation = 'source-over'; } }
  } else {
    // beat 2: the side angle. The skyline from the frozen frame, dimmed, over a strip of road seen side-on
    const u = clamp((c.t - c.cut) / Math.max(.3, c.dur - c.cut - .15), 0, 1), pan = Math.round(u * 6 * c.side);
    const hz = typeof HZ === 'number' ? Math.round(HZ / P) : Math.round(ch * .45), sh = Math.round(ch * .36), sy = clamp(hz - Math.round(sh * .85), 0, ch - sh), sw = Math.round(cw / 2), sx = clamp(ix - (sw >> 1) + pan, 0, cw - sw);
    cx.drawImage(BUF, sx, sy, sw, sh, 0, 0, cw, Math.round(ch * .72)); cx.fillStyle = 'rgba(8,6,22,.5)'; cx.fillRect(0, 0, cw, Math.round(ch * .72));
    const gy0 = Math.round(ch * .72), scroll = Math.round(c.t * 40 * -c.side);
    cx.fillStyle = '#121019'; cx.fillRect(0, gy0, cw, ch - gy0);
    cx.fillStyle = '#1e1b28'; for(let x = ((scroll % 7) + 7) % 7; x < cw; x += 7) for(let y = gy0 + 3; y < ch; y += 5) if(hash(x * 3 + y) > .6) cx.fillRect(x, y, 1, 1);   // grit
    for(let x = ((scroll % 12) + 12) % 12 - 12; x < cw; x += 12){ cx.fillStyle = (Math.floor((x - scroll) / 12) & 1) ? '#d8203a' : '#e8e4d8'; cx.fillRect(x, gy0, 6, 2); cx.fillStyle = (Math.floor((x - scroll) / 12) & 1) ? '#e8e4d8' : '#d8203a'; cx.fillRect(x + 6, gy0, 6, 2); }   // the kerb
    cx.fillStyle = '#d8d4c8'; for(let x = ((scroll * 2 % 40) + 40) % 40 - 40; x < cw; x += 40) cx.fillRect(x, Math.round(ch * .9), 18, 1);   // a lane dash, nearer, faster
    cx.setTransform(1 / P, 0, 0, 1 / P, 0, 0);
    const kc = Math.max(P, Math.round(k * 1.5 / P) * P), Wk = wreck(u, kc), sd = c.side, S1 = c.set, fl = sd < 0;
    // shadows
    cx.fillStyle = 'rgba(0,0,0,.45)'; const bw = S1.tumble[0].width * P; cx.fillRect(snap(Wk.bx - bw * .45), snap(Wk.gy - P), snap(bw * .9), P * 2); if(Wk.rland) cx.fillRect(snap(Wk.rx - bw * .3), snap(Wk.gy - P), snap(bw * .6), P * 2);
    // the rider: tumbling in the air, then sliding on his back
    if(!Wk.rland) drawFlip(S1.thrown[Math.floor(u * 9) % 3], Wk.rx, Wk.ry, P, fl);   // tumbling: spread, balled, twisted
    else drawFlip(S1.thrown[3 + (Math.floor(c.t * 6) % 2)], Wk.rx, Wk.gy, P, fl);   // sliding on his back, feet first
    // the bike: cartwheeling in 45-degree steps
    drawFlip(S1.tumble[Wk.brot], Wk.bx, Wk.by, P, fl);
    // sparks where metal meets the road, and from the rider's leathers; shards and glass
    if(!c.rm){ const sp = c.spk; if(Wk.ground || u < .9) for(let i = 0; i < 5; i++) sp.push({ x:Wk.bx + rr(-10, 10) * kc, y:Wk.gy - rr(0, 2) * kc, vx:-sd * rr(80, 520), vy:rr(-360, -40), l:rr(.25, .55), c:SPK[i % 4] });
      if(Wk.rland && u < .95) for(let i = 0; i < 2; i++) sp.push({ x:Wk.rx + rr(-6, 6) * kc, y:Wk.gy - kc, vx:-sd * rr(60, 260), vy:rr(-200, -30), l:rr(.2, .4), c:SPK[(i + 1) % 4] });
      const sl = .45;   // particles in slow motion
      cx.globalCompositeOperation = 'lighter';
      for(let i = sp.length - 1; i >= 0; i--){ const p = sp[i]; p.x += p.vx * rdt * sl; p.y += p.vy * rdt * sl; p.vy += 900 * rdt * sl; p.l -= rdt * sl; if(p.l <= 0 || p.y > Wk.gy + kc){ sp[i] = sp[sp.length - 1]; sp.pop(); continue; } cx.fillStyle = p.c; cx.fillRect(snap(p.x), snap(p.y), P * 2, P); }
      cx.globalCompositeOperation = 'source-over';
      for(const d of c.deb){ if(!d.x){ d.x = Wk.bx; d.y = Wk.by - 8 * kc; d.vx *= sd; } d.x += d.vx * rdt * sl; d.y += d.vy * rdt * sl; d.vy += 700 * rdt * sl; if(d.y > Wk.gy){ d.y = Wk.gy; d.vy *= -.35; d.vx *= .6; }
        d.r = Math.floor(c.t * d.vr) % 4; put(S1.debris[d.d][d.r], d.x, d.y, P); }
      if(sp.length > 400) sp.splice(0, sp.length - 400); }
    else for(let i = 0; i < 7; i++){ cx.fillStyle = SPK[i % 4]; cx.fillRect(snap(Wk.bx - sd * (6 + i * 5) * kc), snap(Wk.gy - (2 + (i * 7) % 5) * kc), P * 2, P); }
    cx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // letterbox and the label
  const bh = Math.round(ch * .1); cx.fillStyle = '#07060c'; cx.fillRect(0, 0, cw, bh); cx.fillRect(0, ch - bh, cw, bh); cx.fillStyle = '#3a0d14'; cx.fillRect(0, bh - 1, cw, 1); cx.fillRect(0, ch - bh, cw, 1);
  const L = c.kind === 'td' ? label('撃墜', 'TAKEDOWN') : c.kind === 'bust' ? label('逮捕', 'BUSTED', '#ff2a3a', '#f4ecdf') : label('クラッシュ', 'CRASH'); if(L) cx.drawImage(L, Math.round(cw * .04), Math.max(1, Math.round((bh - L.height) / 2)));
  if(!c.rm){ const n = Math.floor(c.t * 3) % 2; cx.fillStyle = n ? '#ff3b5c' : '#7a1828'; cx.fillRect(cw - Math.round(cw * .04) - 4, Math.round(bh / 2) - 2, 4, 4); }   // a slow REC dot (never a strobe: 1.5 Hz)
  cx.restore(); }
function drawFlip(c, x, yb, k, fl){ if(!fl){ put(c, x, yb, k); return; } const w = snap(c.width * k), h = snap(c.height * k); cx.save(); cx.translate(snap(x + w / 2), snap(yb) - h); cx.scale(-1, 1); cx.drawImage(c, 0, 0, w, h); cx.restore(); }
function camWatch(){ if(state !== 'play' && state !== 'pulled') return;
  // only the second strike gets the cam (逮捕 BUSTED), as the beat before the arrest: an ordinary crash, the first one that starts a chase
  // included, plays the normal crash only (Kellan, 2026-11-19: a cam there broke the flow of the chase starting)
  if(crashes > crashSeen){ crashSeen = crashes; firstCrash = false;
    if(state === 'pulled'){ const bs = Math.min(W * .2, H * .27); camStart('bust', W / 2, H - 8 - bs * .35, 0); } }
  const G = MECH.gang, D = G && G._dbg, st = D && D.ST && D.ST();
  if(st && st.takedowns > tdSeen){ tdSeen = st.takedowns; if(T.tdCam && state === 'play' && rt - lastCamRT >= T.camGap){   // off: Kellan, 2026-11-19, the takedown cam broke the flow; the wreck plays out live instead (mech/gang.js) const R = D.R ? D.R() : [], r = R.filter(q => q.st === 'down' && q.down).sort((a, b) => a.down.t - b.down.t)[0];
      let ix = W / 2, iy = H * .6, gi = 0; if(r){ gi = r.gi || 0; const g = r.z - (position + PZ), f = PZ / Math.max(PZ * .35, PZ + g); ix = clamp(W / 2 + (r.x - playerX) * W * f, W * .1, W * .9); iy = clamp(H / 2 + (H / 2 - 8) * f - 12 * kBike() * f, H * .3, H * .85); }
      camStart('td', ix, iy, gi); } } }

/* ================================================================== 2. the slide */
let sl = null, held = false, cd = 0, padHeld = false, hs = 0, marks = [], stats = { slides:0, dodges:0 }, sparkT = 0;
const SLIDE_KEYS = new Set(['KeyS', 'ArrowDown']);
function steerIn(){ return clamp((keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touchSteer + padSteer, -1, 1); }
const SLIDE_ON = /[?&]slide=1/.test(location.search);   // switched off (Kellan, 2026-11-19); ?slide=1 brings the Akira slide back
function canSlide(){ return SLIDE_ON && state === 'play' && !sl && cd <= 0 && speed >= MAXS * T.minSp && AIR.h < 1 && POSE.pitch < .01 && slideT <= 0 && cool <= 0 && !cam
  && !(MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying()); }
function tryStart(){ if(!canSlide()) return false; const c = segAt(position + PZ).curve, d = Math.sign(steerIn()) || (Math.abs(c) >= 1 ? Math.sign(c) : 0) || (Math.sign(-playerX) || 1);
  sl = { t:0, dir:d, rec:-1, peaked:false, sp0:speed }; stats.slides++; drift = 0; charge = 0; tier = 0; boostT = 0; marks = [];
  if(window.SFX && SFX.ready && SFX.ready()) SFX.play('slick', { pan:d }); else if(typeof M !== 'undefined' && M.noise) M.noise(.5, 1500, .08);
  return true; }
S.key = (code, down, e) => { if(!SLIDE_KEYS.has(code)) return false; if(down){ if(!(e && e.repeat)){ held = true; tryStart(); } } else held = false; return true; };
S.pad = (gp, prev) => { const b = gp.buttons[4], on = !!(b && b.pressed); if(on && !prev[4]){ padHeld = true; tryStart(); } else if(!on) padHeld = false; };
function slideUpdate(dt, rdt){ if(!sl) return; const s = sl;
  if(state !== 'play'){ endSlide(); return; }
  if(s.rec < 0){ s.t += dt; const want = held || padHeld;
    if((!want && s.t >= T.slideMin) || s.t >= T.slideMax) s.rec = 0;
    // speed: toward 40%, fast (and the core's own throttle is taken back)
    const tgt = MAXS * T.target; if(speed > tgt){ speed -= ACCEL * dt; speed = Math.max(tgt, speed - (speed - tgt) * (1 - Math.exp(-T.shed * dt))); }
    // the line: the bend's outward pull mostly cancelled, steering softened, a little sideways carry
    const sp = speed / MAXS, dx = dt * 2 * sp, c = segAt(position + PZ).curve;
    playerX += dx * sp * c * CENTRI * (1 - T.pull); playerX -= steer * dx * (1 - T.steerK); playerX += s.dir * dt * T.carry * sp * Math.max(0, 1 - s.t / T.slideMax);
    drift = 0; charge = 0; tier = 0;
    if(!s.peaked && s.t >= T.peak){ s.peaked = true; hs = T.hold * (RM() ? .6 : 1);
      if(MECH.arrival && MECH.arrival.callout) MECH.arrival.callout('スライド SLIDE', { kanji:'滑', col:'#ffb35a' }); }
    // the rooster tail: sparks off the rear tyre (and the boot), back and up
    const S1 = playerSet(), g = poseGeo(S1, poseOf(s), s.dir), rx = g.rear, n = RM() ? (Math.random() < .3 ? 1 : 0) : 3 + (s.t < .5 ? 2 : 0);
    for(let i = 0; i < n; i++) spark(rx + rr(-3, 3) * PX, H - 8 - rr(0, 3) * PX, -s.dir * rr(120, 460), rr(-380, -60), rr(.25, .5), SPK[i % 4]);
    if(S.lowPose() && !RM()) spark(W / 2 - s.dir * g.w * .08, H - 9, -s.dir * rr(60, 260), rr(-240, -40), rr(.2, .4), SPK[(Math.random() * 4) | 0]);   // the boot
    if(!stripe || !stripe.live) stripe = { dir:s.dir, x:rx, grow:0, fall:0, live:true }; stripe.x = rx; stripe.grow += dt;
    if((sparkT -= rdt) <= 0){ sparkT = .085; if(window.SFX && SFX.ready && SFX.ready()) SFX.play('spark', { pan:-s.dir }); }
    // the rubber stripe, in the world: one point per frame under the rear tyre
    marks.push({ z:position + PZ, x:playerX - s.dir * 14 * k / W }); if(marks.length > 160) marks.shift();
  } else { s.rec += dt; if(s.rec >= .26) endSlide(); } }
function endSlide(){ sl = null; cd = T.slideCD; if(stripe) stripe.live = false; }
function poseOf(s){ if(!s) return -1; if(s.rec >= 0){ const r = s.rec; return r < .07 ? 2 : r < .14 ? 1 : r < .2 ? 4 : 5; }
  const t = s.t; return t < .05 ? 5 : t < .1 ? 4 : t < T.inv0 ? 1 : t < T.inv1 ? 3 : 2; }
S.lowPose = () => !!sl && sl.rec < 0 && sl.t >= T.inv0 && sl.t < T.inv1;
S.hitCar = c => { if(c._slid && Math.abs(c.z - (position + PZ)) < 600) return true;
  if(S.lowPose()){ c._slid = true; stats.dodges++; flow++; bestFlow = Math.max(bestFlow, flow); hud(); floatText('Slid past', W / 2 + (c.x - playerX) * W * .2, H * .56, 24, '#ffd04a');
    if(window.SFX && SFX.ready && SFX.ready()) SFX.play('whoosh', { pan:Math.sign(c.x - playerX) || 1, k:1, lead:.02 }); return true; }
  return false; };
function drawMarks(){ if(!marks.length) return; const p0 = position, k = kBike(), n0 = marks.length;
  for(let i = 0; i < marks.length; i++){ const m = marks[i]; if(m.z - p0 < SEG * 1.2) continue; const s = segAt(m.z); if(!s || !s.p1.screen.w) continue; const f = (m.z % SEG) / SEG,
      x = lerp(s.p1.screen.x, s.p2.screen.x, f) + m.x * lerp(s.p1.screen.w, s.p2.screen.w, f), y = lerp(s.p1.screen.y, s.p2.screen.y, f), w = Math.max(PX, lerp(s.p1.screen.w, s.p2.screen.w, f) * .07);
    if(y < 0 || y > H + 40) continue; cx.fillStyle = sl && n0 - i < 10 ? '#7a2a14' : 'rgba(4,2,8,.8)'; cx.fillRect(snap(x - w / 2), snap(y), snap(w), PX * 2); }   // fresh rubber still hot
  if(sl && sl.rec < 0){ const rx = W / 2 - sl.dir * 14 * k; cx.fillStyle = 'rgba(4,2,8,.8)'; cx.fillRect(snap(rx - 2 * k), snap(H - 8 - k), snap(4 * k), H); } }
// the core bike is skipped only for this frame's draw (BIKE.hidden is set here and handed back in drawScreen), so no other module's use of it is disturbed
let hidWas = null;
S.drawScreen = () => { if(hidWas !== null){ BIKE.hidden = hidWas; hidWas = null; } };
// where pose i puts its anchors on screen: left edge (model x 50 at the screen's centre) and the rear contact patch
function poseGeo(S1, i, dir){ const c = (dir > 0 ? S1.pose : S1.poseL)[i], m = S1.meta[i], w = c.width * PX, ax = (dir > 0 ? m.ax : c.width - m.ax) * PX, rx = (dir > 0 ? m.rx : c.width - m.rx) * PX;
  return { c, left:snap(W / 2 - ax), rear:snap(W / 2 - ax + rx), w, h:c.height * PX }; }
// the rubber stripe: from the rear tyre it runs out to the side the tail swung through and curves away up the road, thinning with
// perspective; while the slide lasts it grows, after it the whole stripe slides down off the screen (the road keeps moving)
let stripe = null;
function drawStripe(){ const st = stripe; if(!st) return; const len = Math.min(1, st.grow / .35), off = st.fall * 60; if(off > 40) { stripe = null; return; }
  const x0 = st.x, y0 = H - 9 + off, x2 = x0 - st.dir * W * .34, y2 = H - 8 - H * .17 + off, x1 = x0 - st.dir * W * .24, y1 = H - 6 + off, n = 110;
  for(let i = 0; i < n * len; i++){ const t = i / n, mt = 1 - t, x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2, y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2; if(y > H + PX * 4) break;
    const w = snap(PX * (8 - t * 5)), hh = snap(PX * (4 - t * 2.5));
    cx.fillStyle = st.live && i < 8 ? (i < 4 ? '#ff8a3a' : '#7a2a14') : '#050308'; cx.fillRect(snap(x - w / 2), snap(y), w, hh);
    if(i > 7){ cx.fillStyle = 'rgba(150,136,180,.5)'; cx.fillRect(snap(x - w / 2), snap(y) - PX, w, PX); } } }   // a wet sheen along its far edge
S.drawUnderBike = now => { if(cam && !cam.shot) camGrab(); drawMarks(); drawStripe(); if(!sl) return; if(hidWas === null){ hidWas = !!BIKE.hidden; BIKE.hidden = true; }
  const S1 = playerSet(), i = poseOf(sl), g = poseGeo(S1, i, sl.dir), bob = speed > 10 && !RM() && hs <= 0 ? Math.round(Math.sin(now / 30)) * PX : 0;
  pxShadow(cx, W / 2, H - 8, g.w * .46 / PX, 2, PX, .5);   // the core's stepped pixel shadow (the slide sprite is one canvas pixel a texel)
  // speed lines behind, in the slide's colour (none under reduced motion)
  if(!RM() && sl.rec < 0){ cx.fillStyle = 'rgba(255,179,90,.5)'; for(let j = 0; j < 4; j++){ const y = H - 8 - g.h * (.15 + j * .17), len = g.w * (.25 + hash(j + Math.floor(now / 60)) * .35), x = sl.dir > 0 ? g.left - len - PX * 4 : g.left + g.w + PX * 4; cx.fillRect(snap(x), snap(y), snap(len), PX); } }
  cx.imageSmoothingEnabled = false; cx.drawImage(g.c, g.left, snap(H - 8 + bob) - g.h, g.w, g.h);
  if(S.lowPose()) glow(W / 2 - sl.dir * g.w * .08, H - 10, g.w * .08, '#ffb040', .45); };   // the boot on the tarmac: the slip-past tell

/* ================================================================== hooks */
S.reset = () => { if(cam) camEnd(); sl = null; held = false; padHeld = false; cd = 0; hs = 0; marks = []; stats = { slides:0, dodges:0 };
  crashSeen = typeof crashes === 'number' ? crashes : 0; firstCrash = true; rideCams = 0; lastCamRT = -1e9; const G = MECH.gang, st = G && G._dbg && G._dbg.ST && G._dbg.ST(); tdSeen = st ? st.takedowns : 0;
  stripe = null; if(typeof cx !== 'undefined' && cx) warmAll(true); };
S.warm = () => warmAll();
S.update = dt => { const rdt = realDt(); rt += rdt;
  if(state === 'play' || state === 'pulled' || cam){ camWatch(); }
  cd = Math.max(0, cd - dt); slideUpdate(dt, rdt); if(stripe && !stripe.live) stripe.fall += dt * speed / MAXS;
  if(cam && cam.kind === 'bust' && state === 'pulled') pullT = 0;   // the arrest (mech/arrival.js, on pullT) starts when the cam hands over
  let f = camUpdate(rdt); if(hs > 0){ hs -= rdt; f *= T.holdScale; }
  applyScale(f); };
S.post = now => { if(cam){ const n = S.now(); camDraw(now, Math.min(.05, cam.lastDraw ? (n - cam.lastDraw) / 1000 : 1 / 60)); cam.lastDraw = n; } };
S.finish = rec => { rec.slides = stats.slides; rec.slideDodges = stats.dodges; };

S._dbg = { T, ART3D, GRIDS, SIZES, sizeFor, gangSet, SETS, buildSet, playerSet, camStart, camEnd, cam:() => cam, slide:() => sl, start:tryStart, release:() => { held = false; padHeld = false; }, hold:() => { held = true; },
  stats:() => stats, label, grids:{ DEBRIS, STAR }, canvasOf, derive, COMMON, SIDEP, GANGP, setRT:v => { rt = v; } };
})();
