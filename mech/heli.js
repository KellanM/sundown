/* Sundown mechanic module: the police helicopter (警視庁 air support) that sometimes joins a chase. See mech/README.md.
   Load right after mech/police.js:   <script src="mech/heli.js"></script>

   References studied (rules taken, no art copied):
   - Commons photos of Japanese police helicopters: MPD Bell 412EPX JA19MP side view, MPD EC155B1 JA11MP, Osaka Prefectural
     Police AS365N2 JA6751 (an AS365 Dauphin, the shape this one is built on). Livery rules: azure police blue over a silver
     belly, split by a white belt line with a navy pinstripe under it; a black radome nose; a red band raked behind the
     cockpit; the gold 旭日章 badge and the dark 警視庁 lettering on the tail boom; a hinomaru on the engine cowl; a white cap on
     the fin; a shrouded fenestron tail rotor; a searchlight / camera ball under the chin.
   - Chase H.Q. (Taito 1988) and Road Rash: the helicopter is presentation, not a boss - it swoops in over the player, holds
     station high in the frame, and its light tells you that you are being watched. The danger it brings is the police you
     can already see.
   Art rules (the game's): cached pixel-grid sprites in 4 views (side, rear three-quarter, rear, belly) at 2 art sizes, so a
   sprite is never drawn above 1.5x; 3-4 tone ramps per material, dark-hue outlines; banking is baked (RotSprite-style:
   Scale2x x3, rotate, resample) at 5 angles; the rotor is a dithered blur disc with blade smears in 3 frames, drawn behind
   the hull (we always look up at it). The searchlight is hard-edged stepped light: a dithered shaft in three bands and a
   three-ring pool on the road that follows the rider with lag, lighting the road, cars and props it crosses, and the rain.
   Nav lights (red port, green starboard, white tail) and a red beacon blinking once a second; under reduced motion / noFlash
   every light is steady and the rotor holds one frame.
   Design rules: an ambient director beat ('heli', ~45% of chases after the first sighting, 150 s cooldown, never in a tunnel);
   ASSIST.police off means no helicopter. Gameplay is subtle and fair: after 1 s pinned in the light, one roadblock may be
   called in (50%: mech/police.js's own, telegraphed and threadable, never while another hazard is on the road and never a
   second roadblock in one chase, only while the chase has >2.2 s left, the floor police.js uses for its own). Swerving hard shakes the light off (it lags and has a top speed), which resets that clock.
   Sound: a synthesised rotor (blade slap + thump + turbine whine + fenestron buzz), panned to the sprite and Doppler-shifted,
   on the SFX bus; and a megaphone PA voice with its callout (MECH.arrival.callout). No canvas is created after warm(). */
"use strict";
(() => {
const HL = MECH.heli = {};
const DIRK = () => MECH.director;

/* ---------------- tuning ---------------- */
const TU = {
  chance:.45,           // per chase (after the first sighting); the director also enforces its 150 s cooldown and 30 s ambient gap
  minPlay:12,           // seconds into the ride before a helicopter can join
  arriveS:1.5, leaveS:2.8,
  rx:.24, rz:700,        // light pool radii: half-road widths across (about twice the bike's width), world units along the road
  poolAhead:300,        // the pool centre sits this far ahead of the rider's contact point (the contact point is the screen's bottom edge)
  lagT:.3, lagV:1.2,    // the light's lateral lag (s) and top speed (half-road widths / s); the bike steers at up to 2 / s
  pinR:.15,             // |pool - rider| under this = pinned
  pinNeed:1, blockChance:.5, blockMinCop:2.2,     // a chase lasts COP_T = 7 s at most, so this is decided about 2.5 s in (2.2: police.js's own floor)
  paFirst:.45, paEvery:5.5,
};
const PXHW = 32;        // L-size sprite pixels per half-road width (the S size is half)

/* ---------------- palette ---------------- */
const PAL = {
  b:'#78c8ff', B:'#2f86d8', D:'#1b4f9c', N:'#16245e',   // police blue ramp + navy
  w:'#eaf2fb', S:'#a9b5c9', s:'#6c7890', v:'#3a4258',   // white belt, silver belly ramp
  k:'#0b0c14', q:'#4a5272',                              // black radome + sheen
  G:'#0c1834', h:'#7eaade',                              // glass, glint
  R:'#e2363f', r:'#901c2a', Y:'#ffd04a', y:'#a07010',   // red band, gold badge
  M:'#2a2e3c', m:'#5c6478',                              // mast, hub
  O:'#fff4d0', X:'#ff3042', P:'#ff4848', E:'#46ff8a', T:'#fff8e8' };
const RGB = {}, DRK = {};
const h2r = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
for(const k in PAL){ const c = h2r(PAL[k]); RGB[k] = c; DRK[k] = c.map((v, i) => Math.round(v + ([6, 5, 12][i] - v) * .78)); }
const reduceOn = () => typeof reduce !== 'undefined' && reduce;
const policeOn = () => !(window.ASSIST && ASSIST.police === false);

/* ---------------- pixel-grid painting ---------------- */
const mkGrid = (w, h) => Array.from({ length:h }, () => new Array(w).fill(''));
const lin = (pts, x) => { if(x <= pts[0][0]) return pts[0][1]; for(let i = 1; i < pts.length; i++) if(x <= pts[i][0]){ const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
function painter(g){ const h = g.length, w = g[0].length;
  const P = (x, y, c) => { x = Math.round(x); y = Math.round(y); if(x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
  const R = (x, y, ww, hh, c) => { for(let j = y; j < y + hh; j++) for(let i = x; i < x + ww; i++) P(i, j, c); };
  const ROW = (y, x0, x1, c) => { for(let x = x0; x <= x1; x++) P(x, y, c); };
  const PAT = (x, y, rows, c) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if(ch !== '.') P(x + i, y + j, c); }));
  const ELL = (cx, cy, rx, ry, fn) => { for(let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for(let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++){ const u = (x + .5 - cx) / rx, v = (y + .5 - cy) / ry, d = Math.sqrt(u * u + v * v); if(d <= 1){ const c = fn(x, y, d, Math.atan2(v, u)); if(c) P(x, y, c); } } };
  return { P, R, ROW, PAT, ELL, w, h }; }

/* The fuselage colour rule shared by the side and three-quarter views: lit top edge, police blue, the white belt and its navy
   pinstripe, silver below, darker silver and a dark keel at the bottom. */
function hullKey(y, t, b, ys){ if(y === t) return 'b'; if(y < ys) return 'B'; if(y === ys) return 'w'; if(y === ys + 1) return 'N'; if(y === b) return 'v'; if(y === b - 1) return 's'; return 'S'; }

/* SIDE, nose left (port side: the red nav light), 88 x 34. An AS365-type Dauphin: black radome, raked windscreen, the red band,
   two cabin windows, the sliding-door seam, the engine cowl with its intake, exhaust and hinomaru, the boom with the badge and
   警視庁 marks, the stabiliser with its endplate, the white-capped fin and the shrouded fenestron. */
function paintSide(){ const g = mkGrid(88, 34), p = painter(g), X = 1, A = {};
  const TOP = [[0, 21], [1, 19.6], [3, 18], [5, 16.6], [7, 14.8], [9, 13], [11, 11.2], [13, 10], [15, 9.4], [24, 9.4], [26, 8], [28, 6.6], [30, 6], [42, 6], [45, 7.4], [48, 10], [50, 11.4], [60, 12.6], [70, 14]];
  const BOT = [[0, 23.6], [1, 25], [3, 26.4], [5, 27.4], [8, 28], [38, 28], [41, 27.2], [45, 25.6], [49, 23.6], [60, 21], [70, 19]];
  const YS = [[0, 21], [46, 20], [70, 16]];
  for(let x = 0; x <= 70; x++){ const t = Math.round(lin(TOP, x)), b = Math.round(lin(BOT, x)), ys = Math.round(lin(YS, x));
    for(let y = t; y <= b; y++){ let c = hullKey(y, t, b, ys);
      if(x <= 5) c = (y === t + 1 && x >= 1 && x <= 4) || (y === t + 2 && x === 2) ? 'q' : 'k';   // the radome
      p.P(X + x, y, c); } }
  // windscreen: glass from the roof line down to the belt, a glint on the diagonal; the frame pillar behind it
  for(let x = 6; x <= 15; x++){ const t = Math.round(lin(TOP, x)); for(let y = t + 1; y <= 18; y++) p.P(X + x, y, y === 25 - x || y === 26 - x ? 'h' : 'G'); }
  // the red band, raked back as it runs down
  for(let y = 9; y <= 28; y++){ const x = 16 + Math.floor((y - 9) / 7); const t = Math.round(lin(TOP, x)), b = Math.round(lin(BOT, x)); if(y < t || y > b) continue; p.P(X + x, y, y > 21 ? 'r' : 'R'); p.P(X + x + 1, y, y > 21 ? 'r' : 'R'); }
  // cabin windows, framed
  for(const [x0, x1] of [[21, 25], [28, 32]]){ for(let y = 11; y <= 18; y++) for(let x = x0 - 1; x <= x1 + 1; x++) p.P(X + x, y, 'D');
    for(let y = 12; y <= 17; y++) for(let x = x0; x <= x1; x++) p.P(X + x, y, (x === x0 && y <= 13) || (x === x0 + 1 && y === 12) ? 'h' : 'G'); }
  for(let y = 11; y <= 27; y++) if(y < 20 || y > 21) p.P(X + 34, y, y < 20 ? 'D' : 's');   // the sliding-door seam
  p.ROW(10, X + 26, X + 45, 'D');                                     // cowl / roof panel line
  p.ROW(8, X + 27, X + 29, 'v'); p.P(X + 28, 7, 'v');                 // intake
  p.R(X + 44, 8, 4, 2, 'v'); p.P(X + 45, 8, 'k'); p.P(X + 47, 9, 'k'); // exhaust
  p.R(X + 37, 7, 3, 2, 'w'); p.P(X + 38, 7, 'R'); p.P(X + 38, 8, 'R'); // hinomaru
  p.R(X + 50, 14, 2, 2, 'Y'); p.P(X + 51, 15, 'y');                   // the badge
  p.PAT(X + 54, 14, ['N.N', 'NNN', 'NNN'], 'N'); p.PAT(X + 58, 14, ['N.N', 'NNN', 'N.N'], 'N'); p.PAT(X + 62, 14, ['NNN', 'N..', 'N.N'], 'N');   // 警視庁, hinted
  // mast and hub
  p.R(X + 35, 3, 3, 3, 'M'); p.ROW(3, X + 33, X + 39, 'M'); p.P(X + 36, 2, 'm');
  // chin searchlight, camera ball, sponson
  p.P(X + 9, 29, 's'); p.P(X + 10, 29, 'S'); p.P(X + 11, 29, 'S'); p.P(X + 12, 29, 's'); p.P(X + 10, 30, 'O'); p.P(X + 11, 30, 'O');
  p.P(X + 15, 29, 'v'); p.P(X + 16, 29, 'v'); p.P(X + 15, 30, 'm'); p.P(X + 16, 30, 'v');
  p.ROW(29, X + 37, X + 41, 'v'); p.ROW(29, X + 38, X + 40, 's');
  // stabiliser (edge-on) and its endplate
  p.ROW(18, X + 58, X + 64, 'B'); p.ROW(19, X + 58, X + 64, 'D'); for(let y = 15; y <= 21; y++){ p.P(X + 65, y, 'B'); p.P(X + 66, y, 'D'); }
  // the fin: white cap, lit leading edge, dark trailing edge
  for(let y = 2; y <= 15; y++){ const xl = Math.round(y <= 3 ? 80 - (y - 2) * 4 : 76 - (y - 3) * .667), xr = 84;
    for(let x = xl; x <= xr; x++) p.P(X + x, y, x === xl ? (y <= 5 ? 'w' : 'b') : x === xr ? 'D' : y <= 5 ? 'w' : 'B'); }
  // ventral fin, then the fenestron shroud over the boom end
  [[23, 74, 80], [24, 75, 79], [25, 76, 79], [26, 77, 78]].forEach(([y, a, b]) => p.ROW(y, X + a, X + b, 'D'));
  p.ELL(X + 77.5, 18.5, 5.8, 5.8, (x, y, d, an) => d > .74 ? (y < 18 ? 'w' : 'S') : d < .25 ? 'm' : ((Math.floor((an + Math.PI) / (Math.PI * 2) * 9) % 2) ? 'v' : 'k'));
  // lights
  p.P(X + 41, 5, 'X'); p.P(X + 29, 29, 'X'); p.P(X + 66, 21, 'P'); p.P(X + 85, 14, 'T');
  A.lamp = [X + 11, 31]; A.bt = [X + 41.5, 5.5]; A.bb = [X + 29.5, 29.5]; A.nav = [[X + 66.5, 21.5, 'P']]; A.tail = [X + 85.5, 14.5];
  return { g, hub:[X + 36.5, 3.5], A, rotor:[41, 1.3] }; }

/* REAR, 48 x 34 (symmetric, port on the left): the cowl with its two exhausts, the cabin's back (blue over the white belt and
   the silver belly), the fin and the fenestron's shroud edge-on in front of it, the wide stabiliser with endplates. */
function paintRear(){ const g = mkGrid(48, 34), p = painter(g), cx = 24, A = {}, cab = mkGrid(48, 34), pc = painter(cab);
  const S2 = (y, x0, x1, fn) => { for(let x = x0; x <= x1; x++){ const c = fn(x); p.P(x, y, c); pc.P(x, y, c); } };
  [3, 5, 6, 7, 8].forEach((hw, i) => { const y = 4 + i; S2(y, cx - hw, cx + hw - 1, () => i === 0 ? 'b' : 'B'); });
  const HW = { 8:9, 9:10, 20:11, 21:10, 22:10, 23:9, 24:7 };
  for(let y = 8; y <= 24; y++){ const hw = HW[y] || 11, blue = y < 14;
    S2(y, cx - hw, cx + hw - 1, x => { const edge = x === cx - hw || x === cx + hw - 1; if(y === 8 && !edge) return 'b';
      if(blue) return edge ? 'D' : 'B'; if(y === 14) return 'w'; if(y === 15) return 'N'; if(y <= 20) return edge ? 's' : 'S'; if(y <= 22) return 's'; return 'v'; }); }
  for(const x of [16, 17, 30, 31]) for(const y of [7, 8]){ p.P(x, y, 'k'); pc.P(x, y, 'k'); }   // exhausts
  p.R(23, 1, 2, 3, 'M'); p.ROW(1, 21, 26, 'M');                                                 // mast and hub
  // stabiliser and endplates
  p.ROW(18, 7, 40, 'B'); p.ROW(19, 7, 40, 'D'); for(let y = 15; y <= 22; y++){ p.P(7, y, 'D'); p.P(8, y, 'B'); p.P(39, y, 'B'); p.P(40, y, 'D'); }
  // fin
  for(let y = 5; y <= 22; y++){ p.P(23, y, y <= 7 ? 'w' : 'b'); p.P(24, y, y <= 7 ? 'w' : 'B'); }
  // fenestron shroud, edge-on: a lens of silver round a dark slot
  for(let y = 12; y <= 22; y++){ const e = y === 12 || y === 22; p.ROW(y, e ? 22 : 21, e ? 25 : 26, 'S'); if(!e) p.ROW(y, 23, 24, y === 17 ? 'm' : 'k'); }
  // under the cabin: the searchlight on the left, the belly beacon
  p.P(13, 25, 's'); p.P(14, 25, 'S'); p.P(15, 25, 's'); p.P(14, 26, 'O');
  p.P(21, 3, 'X'); p.P(28, 25, 'X'); p.P(7, 15, 'P'); p.P(40, 15, 'E'); p.P(24, 4, 'T');
  A.lamp = [14.5, 27]; A.bt = [21.5, 3.5]; A.bb = [28.5, 25.5]; A.nav = [[7.5, 15.5, 'P'], [40.5, 15.5, 'E']]; A.tail = [24.5, 4.5];
  return { g, cab, hub:[24, 2], A, rotor:[41, 2.4] }; }

/* REAR THREE-QUARTER, nose left, 72 x 36: the side's cabin and cowl foreshortened (x 0.62), the shaded back of the cabin beside it,
   the boom coming toward us (right and a little up: we look up at it) with the badge and marks, the stabiliser across it, the fin
   and the fenestron seen at an angle. */
function paintR34(side, rear){ const g = mkGrid(72, 36), p = painter(g), A = {};
  const DK = { b:'B', B:'D', D:'N', w:'S', S:'s', s:'v', N:'N', v:'v', k:'k' };
  // the cabin's back, one tone darker (it faces away from the city glow)
  for(let x = 0; x < 15; x++){ const rx = 13 + Math.round(x / .66); for(let y = 4; y <= 24; y++){ const k = rear.cab[y][rx]; if(k) p.P(27 + x, y + 1, DK[k] || k); } }
  // the side, foreshortened
  for(let x = 0; x <= 30; x++){ const sx = Math.round(x / .62) + 1; if(sx > 48) continue; for(let y = 0; y < 34; y++){ const k = side.g[y][sx]; if(k) p.P(x + 1, y, k); } }
  // the boom: from the back of the cabin toward us
  for(let x = 34; x <= 58; x++){ const f = (x - 34) / 24, t = Math.round(lerp(11, 9, f)), b = Math.round(lerp(22, 15.5, f)), ys = Math.round((t + b) / 2) + 1;
    for(let y = t; y <= b; y++) p.P(x, y, hullKey(y, t, b, ys)); }
  p.R(40, 13, 2, 2, 'Y'); p.P(41, 14, 'y'); p.PAT(44, 12, ['N.N', 'NNN'], 'N'); p.PAT(48, 12, ['N.N', 'NNN'], 'N'); p.PAT(52, 11, ['NNN', 'N.N'], 'N');
  // fin, then the fenestron in front of its base
  for(let y = 2; y <= 12; y++){ const xl = Math.round(58 - (y - 2) * .45), xr = 63; for(let x = xl; x <= xr; x++) p.P(x, y, x === xl ? (y <= 4 ? 'w' : 'b') : x === xr ? 'D' : y <= 4 ? 'w' : 'B'); }
  p.ELL(59.5, 13, 3.6, 5.2, (x, y, d, an) => d > .7 ? (y < 13 ? 'w' : 'S') : d < .3 ? 'm' : ((Math.floor((an + Math.PI) / (Math.PI * 2) * 7) % 2) ? 'v' : 'k'));
  // stabiliser, horizontal across the boom (the port tip, nearer the middle of the frame, on the left)
  p.ROW(14, 42, 64, 'B'); p.ROW(15, 42, 64, 'D'); for(let y = 12; y <= 17; y++){ p.P(42, y, 'B'); p.P(64, y, 'D'); }
  // mast, hub, chin light, lights
  p.R(22, 3, 2, 3, 'M'); p.ROW(3, 20, 25, 'M'); p.P(22, 2, 'm');
  p.P(5, 29, 's'); p.P(6, 29, 'S'); p.P(7, 29, 'S'); p.P(8, 29, 's'); p.P(6, 30, 'O'); p.P(7, 30, 'O');
  p.P(26, 5, 'X'); p.P(19, 29, 'X'); p.P(42, 12, 'P'); p.P(64, 12, 'E'); p.P(63, 1, 'T');
  A.lamp = [7, 31]; A.bt = [26.5, 5.5]; A.bb = [19.5, 29.5]; A.nav = [[42.5, 12.5, 'P'], [64.5, 12.5, 'E']]; A.tail = [63.5, 1.5];
  return { g, hub:[23, 3.5], A, rotor:[38, 5.5] }; }

/* BELLY, nose up, 46 x 76 (seen from under it as it swoops overhead): the black radome, the chin windows, the red band across the
   belly, the silver underside with the registration marks, the searchlight, sponsons, the boom with its silver keel, the
   stabiliser and the fenestron edge-on at the tail. From below, port is on the right. */
function paintBelly(){ const g = mkGrid(46, 76), p = painter(g), A = {}, cx = 23;
  const S2 = (y, hw, fn) => { for(let x = cx - hw; x < cx + hw; x++) p.P(x, y, fn(x, x - (cx - hw), cx + hw - 1 - x)); };
  [2, 3, 4, 5, 5, 6, 6].forEach((hw, i) => S2(2 + i, hw, (x, l, r) => (i === 1 || i === 2) && Math.abs(x - cx + .5) < 2 ? 'q' : 'k'));
  const HW = { 9:7, 10:8, 11:8, 12:9, 34:8, 35:8, 36:7, 37:6, 38:5 };
  for(let y = 9; y <= 38; y++){ const hw = HW[y] || 9; S2(y, hw, (x, l, r) => { const e = Math.min(l, r);
    if(e === 0) return 'v'; if(y === 13 || y === 14) return 'R'; if(e === 1) return y < 13 ? 'B' : 'w'; if(Math.abs(x - cx + .5) < 1.2 && y > 15) return 's'; return 'S'; }); }
  for(const x of [17, 18, 19, 26, 27, 28]) for(const y of [9, 10]) p.P(x, y, 'G'); p.P(17, 9, 'h'); p.P(26, 9, 'h');   // chin windows
  for(const [x, w] of [[16, 2], [19, 2], [25, 3], [29, 1]]) for(let y = 19; y <= 24; y++) if(!(x === 19 && y === 21)) p.R(x, y, w, 1, 'v');   // registration marks
  for(let y = 22; y <= 30; y++){ p.P(12, y, 'v'); p.P(13, y, y > 23 && y < 29 ? 's' : 'v'); p.P(33, y, 'v'); p.P(32, y, y > 23 && y < 29 ? 's' : 'v'); }   // sponsons
  p.ELL(14.5, 11.5, 1.8, 1.8, (x, y, d) => d < .5 ? 'O' : 'S'); p.P(31, 11, 'v'); p.P(31, 12, 'm');   // searchlight, camera ball
  for(let y = 38; y <= 66; y++){ const hw = Math.round(lin([[38, 4], [66, 2]], y)); S2(y, hw, (x, l, r) => { const e = Math.min(l, r); return e === 0 ? 'D' : Math.abs(x - cx + .5) < 1 ? 'S' : 'B'; }); }
  p.ROW(56, 9, 36, 'B'); p.ROW(57, 9, 36, 'D'); p.ROW(58, 10, 35, 'D'); for(let y = 54; y <= 60; y++){ p.P(9, y, 'B'); p.P(36, y, 'B'); }
  for(let y = 64; y <= 71; y++) p.ROW(y, 21, 24, y === 64 || y === 71 ? 'S' : (y % 2 ? 'k' : 'v')); p.ROW(72, 22, 23, 'D'); p.ROW(73, 22, 23, 'D');
  p.P(22, 28, 'X'); p.P(23, 28, 'X'); p.P(36, 57, 'P'); p.P(9, 57, 'E'); p.P(23, 74, 'T');
  A.lamp = [14.5, 12.5]; A.bt = null; A.bb = [23, 28.5]; A.nav = [[36.5, 57.5, 'P'], [9.5, 57.5, 'E']]; A.tail = [23.5, 74.5];
  return { g, hub:[23, 27], A, rotor:[40, 31] }; }

/* the small art size: a 2x2 reduction of the painted grid (before outlines), keeping the small features that carry the read
   (lights, the lens, the badge, the red band, the white belt, glass) and the silhouette (a cell is empty only if 3 of 4 are) */
const PRIO = ['O', 'X', 'P', 'E', 'T', 'Y', 'R', 'w', 'h', 'G', 'k'];
function half(g){ const h = Math.ceil(g.length / 2), w = Math.ceil(g[0].length / 2), o = mkGrid(w, h);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const ks = []; for(const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]){ const r = g[2 * y + dy]; ks.push(r && r[2 * x + dx] || ''); }
    if(ks.filter(k => !k).length >= 3) continue; let pick = ''; for(const k of PRIO) if(ks.includes(k)){ pick = k; break; }
    if(!pick){ const n = {}; for(const k of ks) if(k) n[k] = (n[k] || 0) + 1; pick = Object.keys(n).sort((a, b) => n[b] - n[a])[0]; }
    o[y][x] = pick; }
  return o; }
const halfPt = a => a && [a[0] / 2, a[1] / 2];
function halfArt(src){ const A = {}; for(const k in src.A){ const v = src.A[k]; A[k] = !v ? v : k === 'nav' ? v.map(n => [n[0] / 2, n[1] / 2, n[2]]) : halfPt(v); }
  return { g:half(src.g), hub:halfPt(src.hub), A, rotor:[src.rotor[0] / 2, Math.max(.8, src.rotor[1] / 2)] }; }

/* bank: RotSprite-style. Scale2x three times (8x), rotate about the rotor hub sampling the 8x grid, one sample per output pixel. */
function scale2x(g){ const h = g.length, w = g[0].length, o = new Array(h * 2), at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? '' : g[y][x];
  for(let y = 0; y < h; y++){ const r0 = new Array(w * 2), r1 = new Array(w * 2);
    for(let x = 0; x < w; x++){ const P = g[y][x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      r0[2 * x] = C === A && C !== D && A !== B ? A : P; r0[2 * x + 1] = A === B && A !== C && B !== D ? B : P;
      r1[2 * x] = D === C && D !== B && C !== A ? C : P; r1[2 * x + 1] = B === D && B !== A && D !== C ? D : P; }
    o[2 * y] = r0; o[2 * y + 1] = r1; }
  return o; }
function rotGrid(g8, w, h, hub, a){   // -> { g, ox, oy }: output grid and where its (0,0) sits in source coordinates (before rotation)
  const c = Math.cos(a), s = Math.sin(a), pts = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => [hub[0] + (x - hub[0]) * c - (y - hub[1]) * s, hub[1] + (x - hub[0]) * s + (y - hub[1]) * c]);
  const x0 = Math.floor(Math.min(...pts.map(q => q[0]))) - 1, y0 = Math.floor(Math.min(...pts.map(q => q[1]))) - 1, x1 = Math.ceil(Math.max(...pts.map(q => q[0]))) + 1, y1 = Math.ceil(Math.max(...pts.map(q => q[1]))) + 1;
  const ow = x1 - x0, oh = y1 - y0, o = mkGrid(ow, oh), W8 = w * 8, H8 = h * 8;
  for(let y = 0; y < oh; y++) for(let x = 0; x < ow; x++){ const px = x0 + x + .5 - hub[0], py = y0 + y + .5 - hub[1], sx = hub[0] + px * c + py * s, sy = hub[1] - px * s + py * c;
    const ix = Math.floor(sx * 8), iy = Math.floor(sy * 8); if(ix >= 0 && iy >= 0 && ix < W8 && iy < H8) o[y][x] = g8[iy][ix]; }
  return { g:o, ox:x0, oy:y0 }; }
const rotPt = (p, hub, a) => { const c = Math.cos(a), s = Math.sin(a), dx = p[0] - hub[0], dy = p[1] - hub[1]; return [hub[0] + dx * c - dy * s, hub[1] + dx * s + dy * c]; };

/* the sprite canvases: rotor blur (behind) + outlined hull, per view x size x bank x rotor frame, plus mirrors of the side and
   three-quarter views (a mirror of bank -a is the other side's sprite at bank +a). Built with ImageData. */
const VIEWS = ['side', 'r34', 'rear', 'belly'], SIZES = ['L', 'S'], ANG = [-.24, -.12, 0, .12, .24], NF = 3;
const META = {}, ART = {};
const KEYN = (v, z, ai, f, m) => 'heli:' + v + z + ai + f + m;
function build(v, z, ai, f){ const art = ART[v + z], a = ANG[ai], G0 = art.g, w = G0[0].length, h = G0.length;
  const R = a === 0 ? { g:G0, ox:0, oy:0 } : rotGrid(art.g8 || (art.g8 = scale2x(scale2x(scale2x(G0)))), w, h, art.hub, a);
  const gw = R.g[0].length, gh = R.g.length, hub = art.hub;
  // rotor ellipse (in the sprite frame, centred on the hub) -> its rotated bounds
  const rx = art.rotor[0], ry = art.rotor[1], c = Math.cos(a), s = Math.sin(a), ex = Math.sqrt(rx * rx * c * c + ry * ry * s * s), ey = Math.sqrt(rx * rx * s * s + ry * ry * c * c);
  const bx0 = Math.min(R.ox - 1, Math.floor(hub[0] - ex) - 1), by0 = Math.min(R.oy - 1, Math.floor(hub[1] - ey) - 1), bx1 = Math.max(R.ox + gw + 1, Math.ceil(hub[0] + ex) + 1), by1 = Math.max(R.oy + gh + 1, Math.ceil(hub[1] + ey) + 1);
  const cw = bx1 - bx0, ch = by1 - by0, cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const k = cv.getContext('2d'), img = k.createImageData(cw, ch), d = img.data;
  const put = (x, y, r, gg, b, al) => { if(x < 0 || y < 0 || x >= cw || y >= ch) return; const i = (y * cw + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = al; };
  // the rotor: a dithered blur disc, a brighter rim where the tips run, and four blade smears (30 degrees on per frame)
  const hx = hub[0] - bx0, hy = hub[1] - by0;
  for(let y = 0; y < ch; y++) for(let x = 0; x < cw; x++){ const px = x + .5 - hx, py = y + .5 - hy, u = (px * c + py * s) / rx, vv = (-px * s + py * c) / ry, dd = u * u + vv * vv;
    if(dd > 1) continue; const gx = x + bx0, gy = y + by0, chk = ((gx + gy) & 1) === 0;
    if(dd > .8 && chk) put(x, y, 190, 204, 236, 120); else if(chk && ((gx >> 1) + gy) % 2 === 0) put(x, y, 150, 166, 206, 70); }
  for(let bl = 0; bl < 4; bl++) for(let sm = 0; sm < 3; sm++){ const th = (f * 30 + bl * 90 - sm * 9) * Math.PI / 180, al = [210, 120, 60][sm];
    for(let t = .18; t <= 1.0001; t += .5 / Math.max(rx, 4)){ const lx = Math.cos(th) * rx * t, ly = Math.sin(th) * ry * t, X0 = hx + lx * c - ly * s, Y0 = hy + lx * s + ly * c;
      const tip = t > .82; put(Math.floor(X0), Math.floor(Y0), tip ? 200 : 48, tip ? 212 : 54, tip ? 240 : 76, tip ? Math.round(al * .7) : al); } }
  // the hull, outlined: an empty pixel touching the hull takes a dark version of the colour it borders
  const ox = R.ox - bx0, oy = R.oy - by0, at = (x, y) => x < 0 || y < 0 || x >= gw || y >= gh ? '' : R.g[y][x];
  for(let y = -1; y <= gh; y++) for(let x = -1; x <= gw; x++){ const key = at(x, y);
    if(key){ const q = RGB[key]; put(x + ox, y + oy, q[0], q[1], q[2], 255); continue; }
    const nb = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1); if(nb){ const q = DRK[nb]; put(x + ox, y + oy, q[0], q[1], q[2], 255); } }
  k.putImageData(img, 0, 0);
  // anchors (sprite frame -> canvas)
  const map = p => { if(!p) return null; const q = rotPt(p, hub, a); return [q[0] - bx0, q[1] - by0]; };
  const A = art.A, M0 = { hub:[hx, hy], lamp:map(A.lamp), bt:map(A.bt), bb:map(A.bb), tail:map(A.tail), nav:A.nav.map(n => { const q = map(n); return [q[0], q[1], n[2]]; }), w:cw, h:ch };
  return { cv, M:M0 }; }
function mirror(src, M0){ const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; const k = cv.getContext('2d'); k.translate(src.width, 0); k.scale(-1, 1); k.drawImage(src, 0, 0);
  const fx = p => p && [M0.w - p[0], p[1]];
  return { cv, M:{ hub:fx(M0.hub), lamp:fx(M0.lamp), bt:fx(M0.bt), bb:fx(M0.bb), tail:fx(M0.tail), nav:M0.nav.map(n => [M0.w - n[0], n[1], n[2] === 'P' ? 'E' : 'P']), w:M0.w, h:M0.h } }; }
let warmed = false;
function warm(){ if(warmed) return; warmed = true;
  try{
    const side = paintSide(), rear = paintRear(), r34 = paintR34(side, rear), belly = paintBelly();
    for(const [v, art] of [['side', side], ['r34', r34], ['rear', rear], ['belly', belly]]){ ART[v + 'L'] = art; ART[v + 'S'] = halfArt(art); }
    for(const v of VIEWS) for(const z of SIZES) for(let ai = 0; ai < ANG.length; ai++) for(let f = 0; f < NF; f++){ const o = build(v, z, ai, f), key = KEYN(v, z, ai, f, 0); SPR[key] = o.cv; META[key] = o.M; }
    for(const v of ['side', 'r34']) for(const z of SIZES) for(let ai = 0; ai < ANG.length; ai++) for(let f = 0; f < NF; f++){ const src = KEYN(v, z, ANG.length - 1 - ai, f, 0), o = mirror(SPR[src], META[src]), key = KEYN(v, z, ai, f, 1); SPR[key] = o.cv; META[key] = o.M; }
    for(const k in ART) delete ART[k].g8;   // the 8x grids were only needed for the bake
    // the dither patterns this module fills with (cached by the engine; built now so the scratch canvas exists before the ride)
    if(typeof ditherPat === 'function' && typeof cx !== 'undefined' && cx){ cx.save(); cx.globalAlpha = .004; cx.globalCompositeOperation = 'lighter';
      for(const c of [BEAM_C, POOL_C]) for(const dd of [.125, .25, .375, .5]){ cx.fillStyle = ditherPat(c, dd); cx.fillRect(0, 0, PX * 4, PX * 4); } cx.restore(); cx.clearRect(0, 0, PX * 4, PX * 4); }
    // the PA callouts, built a slice at a time from the title screen on
    const A = MECH.arrival; if(A && A.prebuild) for(const L of LINES) A.prebuild(L.text, { kanji:L.kanji, sub:L.sub, col:L.col, idle:true });
  }catch(e){ console.warn('heli warm', e); } }
HL.warm = warm;

/* ---------------- the PA lines (morae drive the megaphone voice; the callout shows the words) ---------------- */
const LINES = [
  { text:'STOP!', kanji:'止まりなさい', sub:'HELI PA', col:'#eef4ff', mora:'so ko no ba i ku | to ma ri na sa i' },
  { text:'PULL OVER', kanji:'左に寄せて', sub:'HELI PA', col:'#eef4ff', mora:'hi da ri ni yo se te | to ma ri na sa i' },
  { text:'SLOW DOWN!', kanji:'危険だ', sub:'HELI PA', col:'#eef4ff', mora:'ki ke n da | su pi i do o to se' } ];
const BEAM_C = '#c4d0ec', POOL_C = '#a8b8e4';   // no channel at 255: under 'screen' the light can never clip

/* ---------------- state ---------------- */
let on = false, ph = '', pt = 0, side = 1, from = 'behind', st = 'ahead', stT = 0, wasChased = false;
const F = { z:0, x:0, y:0, yaw:0, bank:0, vx:0, vz:0, pz:0, px:0, dPrev:0, vr:0 };   // flight, relative to the camera: z ahead, x in half-road widths off the road centre, y above the camera
const S0 = { z:0, x:0, y:0, yaw:0 };
const pool = { x:0, dz:TU.poolAhead, k:0, acq:0 };
let pinned = false, pinT = 0, blockTried = false, chaseT0 = 0, paT = -1, paN = 0, view = 'rear', mir = 0, bankI = 2, PI0 = 1e9, PI1 = -1;
let stats = { shown:0, pinnedS:0, blocks:0, shook:0 };
HL.stats = () => stats;
HL.debug = () => ({ on, ph, pt:+pt.toFixed(2), st, view, mir, bankI, pinned, pinT:+pinT.toFixed(2), pool:Object.assign({}, pool), F:Object.assign({}, F), side, from, stats, scr:Object.assign({}, SCR), au:AU ? { wired:AU.wired, gain:+AU.out.gain.value.toFixed(4), pan:+AU.pan.pan.value.toFixed(2), chop:+AU.lfo.frequency.value.toFixed(2) } : AU });
function end(){ on = false; ph = ''; pool.k = 0; pinned = false; PI0 = 1e9; PI1 = -1; }
HL.reset = () => { if(!warmed) warm(); end(); wasChased = false; blockTried = false; stats = { shown:0, pinnedS:0, blocks:0, shook:0 }; paN = 0; };

/* station geometry: where the helicopter holds so the L art is drawn at a whole scale t (canvas px per sprite px) */
const zFor = t => DEPTH * ROADW * W / 2 / (PXHW * PX * t);
const yFor = (z, frac) => (1 - 2 * frac) * z / DEPTH;
/* On a narrow (phone) screen the side view at 1.3x is wider than half the frame and the 'along' station put half of it off the edge:
   the scale is capped so the 88-px side art spans at most ~46% of the width, and the offset keeps the whole hull inside the frame. */
function station(name){ const t0 = name === 'along' ? 1.3 : name === 'hover' ? 1.12 : 1, t = Math.min(t0, Math.max(.8, W * .46 / (88 * PX))), z = zFor(t), uw = PXHW * PX * t, xmax = Math.max(.2, Math.min(W * .36, W * .5 - 50 * PX * t - 8) / uw);
  const x = side * Math.min(name === 'along' ? 3.4 : name === 'hover' ? .9 : 1.25, xmax), y = yFor(z, (name === 'along' ? .2 : .22) + (W < 640 ? .09 : 0)); return { z, x, y }; }   // narrow: below env/hud.js's top plates

function start(f0){ on = true; ph = 'arrive'; pt = 0; stats.shown++; blockTried = false; pinT = 0; pinned = false; paT = -1;
  side = typeof copSide === 'number' && copSide ? -copSide : (playerX > 0 ? -1 : 1);
  from = f0 || ((stats.shown + Math.floor(position / SEG)) % 3 === 2 ? 'side' : 'behind');
  const A0 = station('along');
  if(from === 'behind'){ S0.z = -3200; S0.x = side * .35; S0.y = 3400; S0.yaw = 0; }
  else { S0.z = A0.z; S0.x = side * 7.5; S0.y = A0.y; S0.yaw = -side * .7; }
  F.z = S0.z; F.x = S0.x; F.y = S0.y; F.yaw = S0.yaw; F.bank = 0; F.vx = 0; F.vz = 0; F.pz = F.z; F.px = F.x; F.dPrev = 0; F.vr = 0;
  pool.k = 0; pool.acq = 0; pool.x = playerX + side * 1.7; pool.dz = TU.poolAhead; st = 'ahead'; stT = 0; }
HL.force = f0 => { if(!warmed) warm(); start(f0); };   // tests
// mech/heat.js, stage 4 of a chase: air support joins (never under a tunnel roof; one that is leaving circles back)
HL.join = () => { if(state !== 'play' || copT <= 0 || !policeOn()) return false; const s = segAt(position + PZ); if(s && s.tunnel) return false;
  if(on){ if(ph === 'leave'){ ph = 'track'; pt = 0; } return true; } if(!warmed) warm(); start(); return true; };
HL.pinned = () => on && pinned;   // held in the light: they can see you (no object built, read every frame)
HL.on = () => on;

function wantChase(){ return (state === 'play' && copT > 0) || state === 'pulled'; }
const easeO = e => 1 - Math.pow(1 - e, 3), smooth = e => e * e * (3 - 2 * e);

HL.update = dt => {
  if(AU === null && window.SFX && SFX.ready && SFX.ready()) auBuild();   // once, as soon as the game's audio exists (the ride's first frame), never mid-beat
  if(state === 'ready'){ if(on) end(); wasChased = false; if(AU && AU.wired) drive(dt, false); return; }
  const chased = state === 'play' && copT > 0, pz = position + PZ, seg = segAt(pz), inTun = !!(seg && seg.tunnel);
  // a new chase: the director decides whether the helicopter joins it (an ambient beat)
  if(chased && !wasChased){ chaseT0 = playT; blockTried = false;
    if(on && ph === 'leave'){ ph = 'track'; pt = 0; }   // it circles back
    else if(!on && policeOn() && playT > TU.minPlay && !inTun && !(MECH.heat && MECH.heat.owns)){ const D = DIRK(); const ok = D && D.request ? D.request('heli', { tier:'ambient', chance:TU.chance }) : Math.random() < TU.chance; if(ok) start(); } }   // with mech/heat.js loaded, a chase calls it in at stage 4 instead (HL.join)
  wasChased = chased;
  if(!on){ if(AU && AU.wired) drive(dt, inTun); return; }   // the rotor fades out and unhooks from the bus
  if(!policeOn() || state === 'over'){ if(ph !== 'leave'){ ph = 'leave'; pt = 0; } }
  else if(!wantChase() && ph !== 'leave'){ ph = 'leave'; pt = 0; }
  pt += dt;
  // ---- flight
  const prevZ = F.z, prevX = F.x;
  if(ph === 'arrive'){ const T0 = station('ahead'), e = Math.min(1, pt / TU.arriveS), ez = easeO(e), ex = from === 'side' ? smooth(Math.min(1, e * 1.25)) : easeO(e);
    F.z = lerp(S0.z, T0.z, ez); F.x = lerp(S0.x, T0.x, ex); F.y = lerp(S0.y, T0.y, from === 'behind' ? smooth(e) : ez); F.yaw = lerp(S0.yaw, 0, smooth(e));
    if(e >= 1){ ph = state === 'pulled' ? 'hover' : 'track'; pt = 0; st = 'ahead'; stT = 0; } }
  else if(ph === 'track' || ph === 'hover'){ if(state === 'pulled') ph = 'hover';
    stT += dt; if(ph === 'track'){ const cv = Math.abs(segAt(position + F.z).curve || 0); if(st === 'ahead' && stT > 2.2 && (cv > 1.6 || stT > 3.4)){ st = 'along'; stT = 0; } else if(st === 'along' && stT > 3.2){ st = 'ahead'; stT = 0; } }
    const T0 = station(ph === 'hover' ? 'hover' : st), drift = reduceOn() ? .3 : 1, k = 1 - Math.exp(-dt / .85);
    F.z += (T0.z - F.z) * k; F.x += (T0.x + side * .12 * Math.sin(playT * .7) * drift - F.x) * k; F.y += (T0.y + 260 * Math.sin(playT * .9 + 1) * drift - F.y) * k; F.yaw += (-F.vx * .18 - F.yaw) * (1 - Math.exp(-dt / .5)); }
  else if(ph === 'leave'){ const e = Math.min(1, pt / 1.2); F.vz = lerp(F.vz, 11000, 1 - Math.exp(-dt / .6)); F.z += F.vz * dt * e; F.x += side * 2.4 * dt * e; F.y += 2600 * dt * e;
    F.yaw += (side * .95 - F.yaw) * (1 - Math.exp(-dt / .5)); if(pt > TU.leaveS){ end(); drive(dt, inTun); return; } }
  if(dt > 0){ F.vx = lerp(F.vx, (F.x - prevX) / dt, 1 - Math.exp(-dt / .15)); if(ph !== 'leave') F.vz = lerp(F.vz, (F.z - prevZ) / dt, 1 - Math.exp(-dt / .15)); }
  const cvH = segAt(position + Math.max(SEG, F.z)).curve || 0;
  const bankT = clamp(cvH * .05 + F.vx * .3 + (ph === 'leave' ? side * .3 : 0), -.28, .28); F.bank += (bankT - F.bank) * (1 - Math.exp(-dt / .35));
  // ---- the light: on once it has the road, a sweep across it, then it holds the rider with lag
  const lit = !inTun && (ph === 'track' || ph === 'hover' || (ph === 'arrive' && pt > TU.arriveS * .5)), kT = lit ? 1 : 0;
  pool.k = kT > pool.k ? Math.min(1, pool.k + dt * (reduceOn() ? 2 : 3.5)) : Math.max(0, pool.k - dt * 2.5);
  if(lit) pool.acq = Math.min(1, pool.acq + dt / .9); else if(inTun) pool.acq = Math.min(pool.acq, .35);   // out of a tunnel it has to find you again
  let tx = playerX;
  if(pool.acq < 1){ const a = pool.acq; tx = playerX + side * 1.7 * (1 - smooth(a)) - side * .45 * Math.sin(a * Math.PI) * (reduceOn() ? .3 : 1); }
  if(ph === 'leave') tx = pool.x + side * 3;
  else if(!reduceOn()) tx += .035 * Math.sin(playT * 1.9);
  const want = (tx - pool.x) * (1 - Math.exp(-dt / TU.lagT)), vmax = (pool.acq < 1 ? 2.6 : TU.lagV) * dt; pool.x += clamp(want, -vmax, vmax);
  const zc = pz + pool.dz; PI0 = pool.k > .01 ? Math.floor((zc - TU.rz) / SEG) : 1e9; PI1 = pool.k > .01 ? Math.floor((zc + TU.rz) / SEG) : -1;
  // ---- pinned: the PA, and (subtly) the police knowing where you are
  const was = pinned; pinned = pool.k > .7 && pool.acq >= 1 && Math.abs(pool.x - playerX) < TU.pinR && ph !== 'leave';
  if(was && !pinned && pinT > 1 && state === 'play') stats.shook++;
  if(pinned){ pinT += dt; stats.pinnedS += dt; } else pinT = Math.max(0, pinT - dt * 2);
  if(pinned && paT < 0) paT = TU.paFirst;
  if(paT >= 0 && (ph === 'track' || ph === 'hover') && wantChase() && (state === 'pulled' || !(MECH.heat && MECH.heat.clock) || MECH.heat.clock() > 1.5)){   // no PA in the chase's last 1.5 s: a danger line queued then outranks the escape card (MECH.quiet)
    paT -= dt; if(paT <= 0){ say(LINES[paN % LINES.length]); paN++; paT = TU.paEvery; } }
  const P = MECH.police;
  const one = !!(MECH.heat && MECH.heat.owns && MECH.heat.owns());   // mech/heat.js picks the chase's one escalation: the helicopter never adds a roadblock to it
  if(state === 'play' && !one && pinned && pinT >= TU.pinNeed && !blockTried && (MECH.heat && MECH.heat.clock ? MECH.heat.clock() : copT) > TU.blockMinCop && P && P.placeBlock && P.items){ blockTried = true;
    const busy = P.items().some(b => !b.done || (b.kind !== 'spike' && b.t0 >= chaseT0));   // never a second roadblock in one chase
    const roll = Math.random(); let ok = false; if(!busy && roll < TU.blockChance) ok = P.placeBlock('chase'); if(ok) stats.blocks++;
    stats.why = busy ? 'busy' : roll >= TU.blockChance ? 'roll' : ok ? 'placed' : 'no room'; stats.tries = (stats.tries || 0) + 1; }
  // ---- sound
  drive(dt, inTun);
};

/* ---------------- projection ---------------- */
const RA = { x:0, y:0, w:0, sc:0 };
function roadAt(dz){ const z = position + dz, i = Math.floor(z / SEG), s = segs[i], b0 = Math.floor(position / SEG);
  if(dz > SEG * 1.5 && s && i < b0 + DRAW - 1 && s.p1.camera.z > DEPTH && s.p2.camera.z > DEPTH && s.p1.screen.scale){ const f = (z - i * SEG) / SEG, a = s.p1.screen, b = s.p2.screen;
    RA.x = a.x + (b.x - a.x) * f; RA.y = a.y + (b.y - a.y) * f; RA.w = a.w + (b.w - a.w) * f; RA.sc = a.scale + (b.scale - a.scale) * f; return RA; }
  if(dz <= 60) return null;
  const sc = DEPTH / dz; RA.sc = sc; RA.w = sc * ROADW * W / 2; RA.x = W / 2 - playerX * RA.w; RA.y = H / 2 - PITCH + sc * CAMH * H / 2; return RA; }
function roadYaw(dz){ const b = segAt(position), pct = (position % SEG) / SEG, n = Math.min(DRAW - 2, Math.floor(dz / SEG)); let dx = -(b.curve * pct);
  for(let k = 0; k < n; k++){ const s = segs[b.index + k]; if(!s) break; dx += s.curve; } return Math.atan(dx / SEG); }
const SCR = { x:0, y:0, k:0, ok:false, lx:0, ly:0, px:0, py:0, pw:0, key:'' };

/* ---------------- drawing ---------------- */
// the pool on the road: three hard-edged rings (dithered fringe, mid, hot core), one quad per ring per segment; cars and props inside
// it catch the light too. Blended 'screen', never additive: 1 - (1 - road)(1 - light) lifts a dark road almost as 'lighter' did but
// barely moves a bright one, and with no light colour at 255 it can never clip (Kellan: on Neon Ward's wet road the additive pool blew
// the sign reflections out to white; research/sundown-craft/chase_clean.md, "Light on bright roads"). The pool is a cool white that
// lifts and pales the surface under it, scaled down on lit roads (gain()).
const RINGS = [[1, 0, .25], [.72, .22, 0], [.44, .3, 0]];   // radius factor, solid alpha, dither density (screen: stronger alphas than the old additive .13 / .2 for the same lift on a dark road)
// how strongly to light this road: mech/police.js measures the lamp light round the bike (1.25 unlit .. .6 lit); the pool keeps to .55..1
// light falling on a car or a prop: the core's glow() in 'screen' (it can't clip on a lit surface)
function sglow(x, y, r, col, a){ if(r < 1 || a <= 0) return; const rgb = rgb3(col); cx.globalCompositeOperation = 'screen';
  for(let i = 0; i < 3; i++){ cx.fillStyle = rgbaA(rgb, a * GLOW_W[i]); cx.beginPath(); cx.arc(x, y, Math.max(PX, r * GLOW_F[i]), 0, 6.283); cx.fill(); }
  cx.globalCompositeOperation = 'source-over'; }
const gain = () => { const P = MECH.police; return P && P.lightGain ? clamp(P.lightGain(), .55, 1) : 1; };
function hwAt(z, zc, f){ const u = (z - zc) / (TU.rz * f); return u <= -1 || u >= 1 ? 0 : TU.rx * f * Math.sqrt(1 - u * u); }
HL.drawSeg = (s, sx0, sy0, uw, fog, now) => {
  if(HL._dark || !on || s.index < PI0 || s.index > PI1) return;
  const a = s.p1.screen, b = s.p2.screen; if(b.y >= a.y || s.tunnel) return;
  const zc = position + PZ + pool.dz, z0 = s.index * SEG, z1 = z0 + SEG, K = pool.k, X = pool.x;
  const G = gain(); cx.globalCompositeOperation = 'screen';
  for(const [f, al, dd] of RINGS){ const h0 = hwAt(z0, zc, f), h1 = hwAt(z1, zc, f); if(h0 <= 0 && h1 <= 0) continue;
    const c0 = a.x + X * a.w, c1 = b.x + X * b.w;
    if(dd){ cx.globalAlpha = .75 * K * G; poly(c0 - h0 * a.w, a.y, c0 + h0 * a.w, a.y, c1 + h1 * b.w, b.y, c1 - h1 * b.w, b.y, ditherPat(POOL_C, dd)); }
    else { cx.globalAlpha = al * K * G; poly(c0 - h0 * a.w, a.y, c0 + h0 * a.w, a.y, c1 + h1 * b.w, b.y, c1 - h1 * b.w, b.y, f < .5 ? '#e6eaf4' : '#c8d2ea'); } }
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  // cars in the light: a cool sheen on the roof and glass
  for(const c of cars){ if(Math.floor(c.z / SEG) !== s.index) continue; const hw = hwAt(c.z, zc, 1); if(hw <= 0 || Math.abs(c.x - X) > hw + .12) continue;
    const pct = (c.z % SEG) / SEG, w = lerp(a.w, b.w, pct), x = lerp(a.x, b.x, pct) + c.x * w, y = lerp(a.y, b.y, pct);
    sglow(x, y - w * .2, w * .34, '#d4dcf0', .5 * K); }
  // props beside the road as the sweep crosses them
  if(pool.acq < 1) for(const sp of s.sprites){ const hw = hwAt(z0, zc, 1); if(hw <= 0 || Math.abs(sp.x - X) > hw + .2) continue; sglow(sx0 + sp.x * uw, sy0 - uw * .35, uw * .3, '#d4dcf0', .4 * K); }
};

// the rider's own shadow, thrown by the light (away from the helicopter), under the bike
HL.drawUnderBike = now => { if(HL._dark || !on || !SCR.ok || pool.k < .05) return; const cov = clamp(1 - Math.abs(pool.x - playerX) / TU.rx, 0, 1) * pool.k; if(cov < .05) return;
  const bs = Math.min(W * .2, H * .27), off = clamp((W / 2 - SCR.lx) / W, -.5, .5) * bs * .5;
  cx.fillStyle = 'rgba(4,4,12,' + (.42 * cov).toFixed(3) + ')'; spanEll(W / 2 + off, H - 8 + bs * .02, bs * .34, bs * .065); };
function spanEll(x, y, rx, ry){ const r0 = Math.round((y - ry) / PX), r1 = Math.round((y + ry) / PX); cx.beginPath();   // whole-pixel rows, filled as one path (one draw call)
  for(let r = r0; r <= r1; r++){ const v = ((r + .5) * PX - y) / ry; if(v <= -1 || v >= 1) continue; const hw = rx * Math.sqrt(1 - v * v); const a = Math.round((x - hw) / PX), b = Math.round((x + hw) / PX); if(b > a) cx.rect(a * PX, r * PX, (b - a) * PX, PX); }
  cx.fill(); }

// the shaft: three nested bands from the lamp to the pool, each row a whole-pixel span; stepped brighter toward the lamp
function beam(Lx, Ly, Px, Py, pw, K){ const r0 = Math.max(0, Math.round(Ly / PX)), r1 = Math.min(Math.ceil(H / PX), Math.round(Py / PX)); if(r1 - r0 < 2) return;
  cx.globalCompositeOperation = 'screen'; const n = r1 - r0, lw = Math.max(PX, PX * 1.2);   // screen, not additive: the shaft crosses lit signs
  // each band is three stepped trapezoids through poly() (whole-pixel row spans, shared edges tile exactly): 9 fills a frame, where a
  // fillRect per row per band was ~450 draw calls and state changes, enough to land GPU flush spikes in whichever hook drew next
  for(let bi = 0; bi < 3; bi++){ const fr = BEAM_FR[bi], half0 = lw * fr, half1 = pw * fr;
    for(let step = 0; step < 3; step++){ const ra = r0 + Math.round(n * BEAM_T[step]), rb = r0 + Math.round(n * BEAM_T[step + 1]); if(rb <= ra) continue;
      const ta = (ra - r0) / n, tb = (rb - r0) / n, xa = lerp(Lx, Px, ta), xb = lerp(Lx, Px, tb), ha = lerp(half0, half1, ta), hb = lerp(half0, half1, tb);
      let fill; if(bi === 2){ cx.globalAlpha = BEAM_SA[step] * K; fill = '#dfe5f2'; } else { cx.globalAlpha = (bi === 0 ? .5 : .42) * K; fill = ditherPat(BEAM_C, (bi === 0 ? BEAM_D0 : BEAM_D1)[step]); }
      poly(xa - ha, ra * PX, xa + ha, ra * PX, xb + hb, rb * PX, xb - hb, rb * PX, fill); } }
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
const BEAM_FR = [1, .58, .24], BEAM_T = [0, .34, .67, 1], BEAM_SA = [.13, .09, .07], BEAM_D0 = [.25, .125, .125], BEAM_D1 = [.375, .25, .25];

HL.drawScreen = now => {
  SCR.ok = false; if(!on) return;
  const r = roadAt(F.z); if(!r) return;
  const sx = r.x + F.x * r.w, sy = H / 2 - PITCH - r.sc * F.y * H / 2;
  // which view: the line of sight against the helicopter's heading (road direction + its own yaw), and how far up we look
  const los = Math.atan((sx - W / 2) / (W / 2) / DEPTH), elev = Math.atan((H / 2 - PITCH - sy) / (H / 2) / DEPTH), head = clamp(roadYaw(Math.max(0, F.z)) + F.yaw, -1.2, 1.2), a = los - head, A = Math.abs(a);
  const hy = .05; let v = view;
  if(elev > (view === 'belly' ? .66 : .7)) v = 'belly';
  else if(A < (view === 'rear' ? .15 + hy : .15)) v = 'rear';
  else if(A < (view === 'side' ? .58 - hy : view === 'rear' ? .15 : .58)) v = 'r34';
  else v = 'side';
  if(v === 'rear' && view !== 'rear' && A > .15 - hy && view !== 'belly') v = view;   // hysteresis back toward rear
  view = v; if(v === 'side' || v === 'r34'){ if(a > .05) mir = 0; else if(a < -.05) mir = 1; } else mir = 0;
  // size: L at 0.75-1.5x, S below (never above 1.5x)
  const kL = r.w / PXHW / PX; let z = 'L', t = Math.min(kL, 1.5); if(kL < .75){ z = 'S'; t = Math.min(kL * 2, 1.5); }
  if(t * PXHW < 1.2) return;
  // bank (a roll; for the side view a pitch: nose down while it accelerates ahead), quantised with hysteresis
  let ang = v === 'side' ? clamp(F.vz / 26000, -.24, .24) * (mir ? 1 : -1) : F.bank; if(ph === 'leave' && v === 'side') ang = (mir ? 1 : -1) * .2;
  let nearest = 2; for(let i = 0; i < ANG.length; i++) if(Math.abs(ANG[i] - ang) < Math.abs(ANG[nearest] - ang)) nearest = i; if(Math.abs(ANG[nearest] - ang) + .03 < Math.abs(ANG[bankI] - ang)) bankI = nearest;
  const fr = reduceOn() ? 0 : Math.floor(now / 36) % NF, key = KEYN(v, z, bankI, fr, mir), spr = SPR[key], M0 = META[key]; if(!spr) return;
  const k = t * PX, fade = ph === 'leave' ? clamp(1 - (pt - 1.6) / 1.1, 0, 1) : 1;
  const ax = p => sx + (p[0] - M0.hub[0]) * k, ay = p => sy + (p[1] - M0.hub[1]) * k;
  SCR.ok = true; SCR.x = sx; SCR.y = sy; SCR.k = k; SCR.key = key;
  const inTun = !!(segAt(position + PZ).tunnel);
  // beam first (the hull covers its root), then the hull, then the lights
  const P = roadAt(PZ + pool.dz); SCR.lx = M0.lamp ? ax(M0.lamp) : sx; SCR.ly = M0.lamp ? ay(M0.lamp) : sy;
  if(P && pool.k > .01 && !inTun && !HL._dark){ SCR.px = P.x + pool.x * P.w; SCR.py = P.y; SCR.pw = TU.rx * P.w * .85; beam(SCR.lx, SCR.ly, SCR.px, SCR.py, SCR.pw, pool.k * fade); }
  if(inTun) return;   // under the tunnel roof: only the light's absence and the rotor are left
  cx.globalAlpha = fade; blit(spr, sx + (spr.width / 2 - M0.hub[0]) * k, sy + (spr.height - M0.hub[1]) * k, k); cx.globalAlpha = 1;
  const g = Math.max(PX * 1.5, k * 3), rm = reduceOn(), beat = rm || (now % 1000) < 150;
  for(const n of M0.nav){ const c = n[2] === 'P' ? '#ff3a3a' : '#3aff7a'; glow(ax(n), ay(n), g * 1.4, c, .7 * fade); cx.fillStyle = n[2] === 'P' ? '#ffb0b0' : '#c0ffd8'; pxRect(ax(n) - PX / 2, ay(n) - PX / 2, PX, PX); }
  if(M0.tail){ glow(ax(M0.tail), ay(M0.tail), g, '#fff4e0', .55 * fade); }
  if(beat){ beacon(M0.bt, ax, ay, g, rm, fade); beacon(M0.bb, ax, ay, g, rm, fade); }
  if(M0.lamp && pool.k > .01){ glow(SCR.lx, SCR.ly, g * 2.6, '#fff4d8', .85 * pool.k * fade); cx.fillStyle = '#ffffff'; pxRect(SCR.lx - PX, SCR.ly - PX / 2, PX * 2, PX); }
  // the rider, caught in it
  const cov = clamp(1 - Math.abs(pool.x - playerX) / TU.rx, 0, 1) * pool.k * fade;
  if(cov > .05 && !HL._dark){ const bs = Math.min(W * .2, H * .27), yc = H - 8 - bs * .5; cx.globalCompositeOperation = 'screen';
    cx.fillStyle = 'rgba(200,214,255,' + (.07 * cov).toFixed(3) + ')'; spanEll(W / 2, yc, bs * .46, bs * .62);
    cx.fillStyle = 'rgba(230,238,255,' + (.06 * cov).toFixed(3) + ')'; spanEll(W / 2, yc - bs * .06, bs * .3, bs * .46); cx.globalCompositeOperation = 'source-over'; }
};

function beacon(b, ax, ay, g, rm, fade){ if(!b) return; glow(ax(b), ay(b), g * (rm ? 1.4 : 2.4), '#ff2030', (rm ? .45 : .9) * fade); cx.fillStyle = '#ffd0d0'; pxRect(ax(b) - PX / 2, ay(b) - PX / 2, PX, PX); }
// rain, snow or ash caught in the shaft (drawn after the weather layer, so it reads as lit)
HL.overlay = now => { if(HL._dark || !on || !SCR.ok || pool.k < .05 || reduceOn()) return; const L = LANDS[landIdx(zone())], E = ENV[L.key] || {};
  const kind = L.key === 'snow' ? 'snow' : L.key === 'sakurajima' ? 'ash' : (L.rain || E.ownsRain) ? 'rain' : ''; if(!kind || segAt(position + PZ).tunnel) return;
  const Lx = SCR.lx, Ly = SCR.ly, Px = SCR.px, Py = SCR.py, pw = SCR.pw; if(Py - Ly < 20) return;
  cx.globalCompositeOperation = 'screen'; cx.fillStyle = kind === 'ash' ? '#f4c08a' : '#dce4f4';
  const N = kind === 'rain' ? 34 : 26, a0 = (kind === 'rain' ? .6 : .75) * pool.k;
  // pass 0: the drops past their fade-in, batched into one path (one draw call); pass 1: the few still fading in, one by one
  for(let pass = 0; pass < 2; pass++){ if(!pass){ cx.globalAlpha = a0; cx.beginPath(); }
    for(let i = 0; i < N; i++){ const sp = kind === 'rain' ? 1 / 520 : 1 / 2600, t = (hash(i * 1.7 + 3) + now * sp * (.8 + hash(i * 3.3) * .5)) % 1, u = hash(i * 7.9) * 2 - 1;
      if((t < .1) !== (pass === 1)) continue;
      const y = lerp(Ly, Py, t), x = lerp(Lx, Px, t) + u * lerp(PX, pw, t) + (kind === 'rain' ? 0 : Math.sin(now / 700 + i) * 6);
      if(pass){ cx.globalAlpha = a0 * t / .1; cx.beginPath(); }
      if(kind === 'rain'){ for(let j = 0; j < 4; j++) dot(x - j * PX * .35, y + j * PX); } else dot(x, y);
      if(pass) cx.fill(); }
    if(!pass) cx.fill(); }
  cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; };
const dot = (x, y) => cx.rect(Math.floor((x + PX / 2) / PX) * PX, Math.floor((y + PX / 2) / PX) * PX, PX, PX);   // one canvas pixel into the current path (pxRect's rounding)

/* ---------------- sound: the rotor (one loop graph, built once) and the PA voice ---------------- */
let AU = null;
function auBuild(){ if(AU) return AU; if(!window.SFX || !SFX.ready || !SFX.ready()) return null; const ac = SFX.ctx(), bus = SFX.bus(); if(!ac || !bus) return null;
  try{ const t = ac.currentTime, sr = ac.sampleRate, nb = ac.createBuffer(1, sr, sr), d = nb.getChannelData(0); let s = 11; for(let i = 0; i < d.length; i++){ s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    const O = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); return o; }, G = v => { const g = ac.createGain(); g.gain.value = v; return g; };
    const BQ = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    // the blade-pass pulse: a sawtooth at the chop rate, shaped to a sharp attack and a fast decay
    const lfo = O('sawtooth', 11.5), sh = ac.createWaveShaper(), cv = new Float32Array(512); for(let i = 0; i < 512; i++){ const p = i / 511; cv[i] = Math.exp(-p * 6.5); } sh.curve = cv; lfo.connect(sh);
    const nz = ac.createBufferSource(); nz.buffer = nb; nz.loop = true; nz.start(t);
    const bp = BQ('bandpass', 260, .7), slap = G(0), slapL = G(2.4); nz.connect(bp).connect(slap).connect(slapL); sh.connect(slap.gain);
    const lowN = BQ('lowpass', 120, .7), thN = G(0), thNL = G(1.2); nz.connect(lowN).connect(thN).connect(thNL); sh.connect(thN.gain);   // the body of the thump
    const th = O('sine', 58), thG = G(0), thL = G(.5); th.connect(thG).connect(thL); sh.connect(thG.gain);
    const wh = O('sine', 2350), whG = G(.018), wh2 = O('sine', 4700), wh2G = G(.006);   // turbine whine
    const bz = O('sawtooth', 96), bzF = BQ('bandpass', 820, 2.2), bzG = G(.05);         // the fenestron's buzz
    const sum = G(1), lp = BQ('lowpass', 4000, .6), out = G(0), pan = ac.createStereoPanner();
    for(const n of [slapL, thNL, thL]) n.connect(sum); wh.connect(whG).connect(sum); wh2.connect(wh2G).connect(sum); bz.connect(bzF).connect(bzG).connect(sum);
    sum.connect(lp).connect(out).connect(pan);
    AU = { ac, bus, nb, lfo, bp, th, wh, wh2, bz, bzF, lp, out, pan, wired:false, offT:0 }; }
  catch(e){ console.warn('heli audio', e); AU = false; }
  return AU; }
const db = x => Math.pow(10, x / 20);
function drive(dt, inTun){ const A = auBuild(); if(!A) return; const t = A.ac.currentTime;
  const dx = (F.x - playerX) * ROADW, d = Math.max(800, Math.hypot(dx, F.y, F.z));
  if(dt > 0){ const vr = (d - (F.dPrev || d)) / dt; F.vr = lerp(F.vr, vr, 1 - Math.exp(-dt / .12)); } F.dPrev = d;
  const vm = F.vr * .00263 * 2.2, dop = clamp(343 / (343 + vm), .8, 1.25);   // world units -> metres, exaggerated a little so the swoop reads
  const near = clamp(5200 / d, 0, 1.15), fade = ph === 'leave' ? clamp(1 - pt / TU.leaveS, 0, 1) : ph === 'arrive' ? Math.min(1, pt / .5 + .25) : 1;
  const lvl = on && state !== 'ready' ? db(-17) * near * fade * (inTun ? .4 : 1) : 0;
  if(lvl > 0){ A.offT = .7; if(!A.wired){ A.wired = true; try{ A.pan.connect(A.bus); }catch(e){} } }
  else if(A.wired && (A.offT -= dt) <= 0){ A.wired = false; try{ A.pan.disconnect(A.bus); }catch(e){} }
  if(!A.wired) return;
  const pn = SCR.ok ? clamp((SCR.x - W / 2) / (W / 2), -1, 1) * .7 : clamp(F.x - playerX, -1, 1) * .4;
  const T = .06; A.out.gain.setTargetAtTime(lvl, t, .08); A.pan.pan.setTargetAtTime(pn, t, T);
  A.lfo.frequency.setTargetAtTime(11.5 * dop, t, T); A.bp.frequency.setTargetAtTime(260 * dop, t, T); A.th.frequency.setTargetAtTime(58 * dop, t, T);
  A.wh.frequency.setTargetAtTime(2350 * dop, t, T); A.wh2.frequency.setTargetAtTime(4700 * dop, t, T); A.bz.frequency.setTargetAtTime(96 * dop, t, T); A.bzF.frequency.setTargetAtTime(820 * dop, t, T);
  A.lp.frequency.setTargetAtTime(inTun ? 380 : 600 + 5200 * Math.min(1, near), t, T); }

let HORN = null;
const FORM = { a:[760, 1220], i:[310, 2250], u:[360, 1300], e:[480, 1850], o:[500, 860], n:[280, 1450] };
function say(L){ const CO = MECH.arrival && MECH.arrival.callout, clean = MECH.police && MECH.police.CL && MECH.police.CL.text;   // clean chase (chase_clean.md): the PA is heard, not read
  if(CO && !clean) CO(L.text, { kanji:L.kanji, sub:L.sub, col:L.col });
  const A = auBuild(); if(!A) return; try{ const ac = A.ac, t0 = ac.currentTime + .05, G = v => { const g = ac.createGain(); g.gain.value = v; return g; }, BQ = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const ms = L.mora.split(' '), N = ms.filter(m => m !== '|').length, MD = .105, dur = ms.reduce((s, m) => s + (m === '|' ? .13 : MD), 0) + .25;
    const src = ac.createOscillator(); src.type = 'sawtooth'; const f1 = BQ('bandpass', 700, 5), f2 = BQ('bandpass', 1500, 7), f2g = G(.7), mix = G(1);
    const sh = ac.createWaveShaper(); sh.curve = HORN || (HORN = (() => { const cv = new Float32Array(512); for(let i = 0; i < 512; i++){ const x = i / 255.5 - 1; cv[i] = Math.tanh(x * 5) / Math.tanh(5); } return cv; })());   // the megaphone's drive curve, built once
    const hp = BQ('highpass', 480, .7), lp2 = BQ('lowpass', 2700, .8), env = G(0), dl = ac.createDelay(.5), fb = G(.3), wet = G(.4), near = clamp(5200 / Math.max(800, F.dPrev || 9000), .35, 1), out = G(db(-27) * near), pn = ac.createStereoPanner();
    dl.delayTime.value = .16; pn.pan.value = SCR.ok ? clamp((SCR.x - W / 2) / (W / 2), -1, 1) * .6 : 0;
    src.connect(f1).connect(mix); src.connect(f2).connect(f2g).connect(mix); mix.connect(sh).connect(hp).connect(lp2).connect(env).connect(out); env.connect(dl).connect(fb).connect(dl); dl.connect(wet).connect(out); out.connect(pn).connect(A.bus);
    // the megaphone's key-up squeal
    const sq = ac.createOscillator(); sq.type = 'sine'; sq.frequency.setValueAtTime(2150, t0); sq.frequency.linearRampToValueAtTime(2240, t0 + .12); const sqg = G(0); sq.connect(sqg).connect(out);
    sqg.gain.setValueAtTime(0, t0); sqg.gain.linearRampToValueAtTime(.05, t0 + .02); sqg.gain.linearRampToValueAtTime(0, t0 + .13); sq.start(t0); sq.stop(t0 + .15);
    let t = t0 + .16, k = 0; src.frequency.setValueAtTime(185, t);
    const nzS = ac.createBufferSource(); nzS.buffer = A.nb; nzS.loop = true; const nzF = BQ('highpass', 2600, .7), nzG = G(0); nzS.connect(nzF).connect(nzG).connect(hp); nzS.start(t0); nzS.stop(t0 + dur + .2);
    env.gain.setValueAtTime(0, t0);
    for(const m of ms){ if(m === '|'){ env.gain.setTargetAtTime(0, t, .015); t += .13; continue; }
      const vw = m[m.length - 1] === 'n' && m.length === 1 ? 'n' : m[m.length - 1], cons = m.length > 1 ? m[0] : '', fm = FORM[vw] || FORM.a, last = k === N - 1;
      const f0 = 192 - 28 * (k / N) + (last ? 26 : 0) + (k === 0 ? 10 : 0);
      src.frequency.setTargetAtTime(f0, t, .02); f1.frequency.setTargetAtTime(fm[0], t, .018); f2.frequency.setTargetAtTime(fm[1], t, .018);
      if('sktch'.includes(cons)){ nzG.gain.setValueAtTime(.32, t); nzG.gain.setTargetAtTime(0, t + .025, .01); }
      env.gain.setTargetAtTime(cons && 'sktpch'.includes(cons) ? .25 : .6, t, .008); env.gain.setTargetAtTime(vw === 'n' ? .45 : 1, t + .02, .012); env.gain.setTargetAtTime(.55, t + MD * .8, .01);
      t += last ? MD * 1.6 : MD; k++; }
    env.gain.setTargetAtTime(0, t, .03); src.start(t0); src.stop(t + .3);
  }catch(e){ console.warn('heli pa', e); } }
HL.say = n => say(LINES[(n || 0) % LINES.length]);   // tests
HL._au = () => auBuild(); HL._reset_au = () => { AU = null; };   // tests (offline loudness check)

/* contact sheet for review: every view, both sizes, the five banks, rotor frame 0 (and the mirrors) */
HL._sheet = (cv, scale) => { const g = cv.getContext('2d'), sc = scale || 4; g.imageSmoothingEnabled = false; let y = 4;
  for(const z of SIZES){ for(const m of [0, 1]){ let x = 4, rowH = 0;
      for(const v of VIEWS){ if(m && (v === 'rear' || v === 'belly')) continue; for(let ai = 0; ai < ANG.length; ai++){ const c = SPR[KEYN(v, z, ai, 0, m)]; if(!c) continue; g.drawImage(c, x, y, c.width * sc, c.height * sc); x += c.width * sc + 6; rowH = Math.max(rowH, c.height * sc); } x += 10; }
      y += rowH + 8; } }
  return y; };
HL._frames = (cv, scale) => { const g = cv.getContext('2d'), sc = scale || 4; g.imageSmoothingEnabled = false; let x = 4;
  for(let f = 0; f < NF; f++){ const c = SPR[KEYN('r34', 'L', 2, f, 0)]; g.drawImage(c, x, 4, c.width * sc, c.height * sc); x += c.width * sc + 8; } };
HL.META = META;

if(MECH.director && MECH.director.register) MECH.director.register('heli', { tier:'ambient', roads:['*'], cooldown:150 });
})();
