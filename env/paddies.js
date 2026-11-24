/* Sundown environment: Rice Paddies (田). See env/README.md for the hooks.
   A raised farm road between flooded fields in early summer; the sky, the moon and every pole, house and lamp doubled in the water.
   Studied (looked at, not copied):
   - Hiroshige, "Tagoto no tsuki" (Reflections of the Moon in the Rice Fields of Sarashina, Honchō meisho; and Sixty-odd Provinces no. 25,
     Shinano): the moon drawn again as a small flat white ellipse in each terraced field, not as one physical reflection; deep blue sky,
     black pine silhouettes, warm-roofed farmhouses as the only warm colour.
   - Photos of Hoshitoge (Tokamachi, Niigata) at sunrise and of flooded paddies at dusk: the water is a near-perfect mirror, slightly darker
     and more saturated than the sky; it is brightest toward the horizon (it reflects the low sky); trees on a field ridge are doubled exactly;
     the ridge (aze) is a thin dark line with a lit top edge.
   - Photos of planted paddies at sunset (Niigata hasagi trees): seedlings are small dark upright tufts on a grid; the bright reflection only
     shows between them, so the rows read as dark lines converging on the horizon; a row of trees and a pylon with sagging wires on the far ridge.
   - Super Hang-On / OutRun: roadside kit tiny and readable, the road and its rail the clearest lines.
   Rules taken: the water is the sky's own ramp flipped about eye level (low sky gleaming at the horizon, ink underfoot), a step darker, broken only by
   world-anchored seedling rows and ridges; one moon in each field near the moon's side (Hiroshige); every vertical thing is doubled below its
   foot; one light direction (the moon) for rims; warm light only from farmhouse windows, cool from the vending machine and pole lamps, red
   only at the level crossing. */
"use strict";
(function(){
  const snap = v => Math.round(v / PX) * PX;
  const PDX = (/[?&]pdx=([^&]*)/.exec(location.search) || [0, ''])[1].split(',');   // (tests) ablation switches: ?pdx=field,tuft,mat turn those passes off
  // ---------------------------------------------------------------- palettes: [outline, dark, mid, light, rim] (rim = moonlight)
  const PAL = {
    1: ['#05070c', '#121824', '#1c2434', '#2c3648', '#7a8aa6'],   // kawara roof tiles
    2: ['#141620', '#3a3e4e', '#4c5062', '#626678', '#aab2c6'],   // plaster at night
    3: ['#050407', '#151117', '#201a22', '#2e262e', '#6a6070'],   // dark timber
    4: ['#020604', '#08130f', '#0f2019', '#183428', '#5e8c78'],   // foliage
    5: ['#07080c', '#1c2028', '#2a2f3a', '#3c4250', '#7c889c'],   // concrete
    6: ['#040504', '#0e0f0b', '#171812', '#22241b', '#4e5442'],   // earth
    7: ['#1a1408', '#4a3c1e', '#6e5c30', '#9c8446', '#d8c890'],   // straw
    8: ['#100806', '#2e1812', '#46241a', '#603424', '#a87058'],   // rusty tin
    9: ['#240808', '#601814', '#8c261c', '#c03a28', '#ff9a80']    // vermilion
  };
  /* Larger art sizes for the big roadside buildings (research/sundown-buildings.md): the pixel sprite scaled 2x (and 4x) with Scale2x (EPX),
     built in warm(), which keeps the pixel look but rounds the staircases. padArtK(spr, k) hands back whichever size keeps one sprite pixel
     within ~1.5 canvas pixels as it passes the camera (a fog-tinted copy has no larger size, but those are only drawn far away). */
  function padArtX2(c){ const w = c.width, h = c.height, src = new Uint32Array(c.getContext('2d').getImageData(0, 0, w, h).data.buffer.slice(0)), o = document.createElement('canvas'); o.width = w * 2; o.height = h * 2;
    const k = o.getContext('2d'), img = k.createImageData(w * 2, h * 2), dst = new Uint32Array(img.data.buffer), at = (x, y, P) => x < 0 || y < 0 || x >= w || y >= h ? P : src[y * w + x];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const P = src[y * w + x], A = at(x, y - 1, P), B = at(x + 1, y, P), C = at(x - 1, y, P), D = at(x, y + 1, P), o0 = y * 4 * w + x * 2, o1 = o0 + w * 2;
      dst[o0] = C === A && C !== D && A !== B ? A : P; dst[o0 + 1] = A === B && A !== C && B !== D ? B : P; dst[o1] = D === C && D !== B && C !== A ? C : P; dst[o1 + 1] = B === D && B !== A && D !== C ? D : P; }
    k.putImageData(img, 0, 0); return o; }
  function padArtSizes(c, four){ if(!c._x2) c._x2 = padArtX2(c); if(four && !c._x4) c._x4 = padArtX2(c._x2); cx.drawImage(c._x2, 0, 0, 1, 1); if(c._x4) cx.drawImage(c._x4, 0, 0, 1, 1); return c; }
  const padArtK = (c, k) => { const s = k / PX; return s > 3 && c._x4 ? [c._x4, k / 4] : s > 1.5 && c._x2 ? [c._x2, k / 2] : [c, k]; };
  function bake(key, w, h, mat, dir){ key = 'pad_' + key + (dir > 0 ? 'R' : 'L'); if(SPR[key]) return SPR[key];
    const g = new Array(w * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) g[y * w + x] = mat(x, y);
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x];
    const solid = (x, y) => { const m = at(x, y); return m && typeof m !== 'string' ? m : 0; };
    return procSprite(key, w, h, (x, y) => { let m = at(x, y); if(!m) return null; if(typeof m === 'string') return m;
      const tex = m > 100; if(tex) m -= 100; const p = PAL[m];
      if(!at(x, y - 1) || !at(x + dir, y)) return p[4];
      if(!at(x + 2 * dir, y) || !at(x + dir, y - 1)) return p[3];
      if(!solid(x, y - 2)) return p[2];
      if(!at(x - dir, y) || !at(x, y + 1)) return p[0];
      return tex ? p[2] : p[1]; }); }
  // a reflection of a sprite: flipped, sunk toward the water's dark, emissive pixels kept bright, every third row thinned (seedling rows)
  function reflOf(src, key){ if(SPR[key]) return SPR[key]; const w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h;
    const k = c.getContext('2d'), d = src.getContext('2d').getImageData(0, 0, w, h).data, img = k.createImageData(w, h), o = img.data;
    for(let y = 0; y < h; y++){ const sy = h - 1 - y; for(let x = 0; x < w; x++){ const i = (sy * w + x) * 4; if(!d[i + 3]) continue; const r = d[i], g = d[i + 1], b = d[i + 2], lum = .3 * r + .59 * g + .11 * b, j = (y * w + x) * 4;
      const sat = Math.max(r, g, b) - Math.min(r, g, b), emis = lum > 150 && sat > 50 || lum > 215;
      if(emis){ o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = y % 3 === 2 ? 70 : 205; }
      else { o[j] = 4 + r * .32; o[j + 1] = 8 + g * .36; o[j + 2] = 12 + b * .42; o[j + 3] = y % 3 === 2 ? 120 : 215; } } }
    k.putImageData(img, 0, 0); return SPR[key] = c; }

  // ---------------------------------------------------------------- sprites
  const INS = '#d6dce6', YEL = '#e0b828', BLK = '#121014', LAMP = '#effff6', WIN = '#ffd890', WIN2 = '#ffb860', LAT = '#9a6436';
  // a concrete utility pole: crossarms with white insulators; v1 carries a transformer, v2 a fluorescent street lamp on an arm toward the road
  const PW = 15, PH = 72, PK = 2.5;
  const pole = (v, dir) => bake('pole' + v, PW, PH, (x, y) => {
    if((y === 5 && (x === 2 || x === 5 || x === 9 || x === 12)) || (y === 13 && (x === 4 || x === 10))) return INS;
    if(y === 6 && x >= 1 && x <= 13) return 5; if(y === 7 && x >= 3 && x <= 11) return 5; if(y === 14 && x >= 3 && x <= 11) return 5;
    if(v === 1){ if(y >= 18 && y <= 27 && x >= 9 && x <= 12) return y === 18 || y === 27 ? 3 : 105; if(y === 22 && x === 8) return 3; if(y === 17 && (x === 10 || x === 11)) return INS; }
    if(v === 2){ if(y === 30 && x >= 8 && x <= 13) return 5; if(y === 31 && x >= 11 && x <= 14) return 3; if(y === 32 && x >= 11 && x <= 14) return LAMP; }
    if(v === 0 && y >= 38 && y <= 42 && x >= 8 && x <= 9) return y === 38 ? '#3a5a9a' : '#22407a';
    const r = y < 30 ? 7 : 8; if(y >= 1 && x >= 6 && x <= r){ if(v === 1 && y >= 58 && y <= 66) return ((y >> 1) % 2) ? '#b89a28' : BLK; return 5; }
    if(y === 0 && (x === 6 || x === 7)) return 5; return 0; }, dir);
  // wire attachments (art px from the pole's centre column, from the bottom)
  const WIRES = [[-5, PH - 5, .9], [5, PH - 5, .9], [3, PH - 13, 1], [1, PH - 24, 1.5]];

  // a farmhouse: big tiled hipped-gable roof, plaster and dark timber, warm shoji, a persimmon and a cedar windbreak, on its own island of ground
  const FW = 84, FH = 52;
  const farm = (v, dir) => bake('farm' + v, FW, FH, (x, y) => {
    if(y >= 44) return y === 44 ? 104 : 6;   // island ground with a grass edge
    // roof: narrow ridge, wide eaves, tile columns
    if(y >= 4 && y <= 6 && (x === 17 || x === 18 || x === 55 || x === 56)) return 1;
    if(y >= 6 && y <= 21){ const hw = 18 + (y - 6) * 1.55; if(Math.abs(x + .5 - 37) < hw){ if(y === 21) return 3; if(y >= 9 && y <= 13 && Math.abs(x + .5 - 37) < 6) return y === 9 ? 1 : 3; return x % 3 === 0 ? 101 : 1; } }
    if(y >= 22 && y <= 41 && x >= 8 && x <= 66){
      if(y >= 40) return 6; if(y === 38 || y === 39) return 3;
      const wins = v === 0 ? [[12, 21, 1], [32, 41, 1], [46, 57, 0]] : v === 1 ? [[12, 21, 0], [32, 41, 1], [46, 57, 1]] : [[12, 21, 1], [32, 41, 0], [46, 57, 0]];
      for(const [a, b, lit] of wins) if(x >= a && x <= b && y >= 25 && y <= 34){ if(!lit) return (y - 25) % 2 ? 103 : 3; if(y === 25 || y === 34) return LAT; if((x - a) % 3 === 0 || (y - 25) % 4 === 0) return LAT; return y < 28 ? WIN : WIN2; }
      if(x >= 24 && x <= 29 && y >= 26){ if(v !== 2) return y === 26 ? LAT : (x === 26 ? LAT : '#e8a858'); return 3; }
      if(x % 11 === 8 || y === 22) return 3; return 2; }
    // persimmon by the house
    if(v !== 1){ const dx = x + .5 - 74, dy = y + .5 - 18; for(const [cx0, cy0, r] of [[74, 18, 7.5], [69, 22, 5], [79, 22, 5], [74, 11, 5]]){ const ex = x + .5 - cx0, ey = y + .5 - cy0; if(ex * ex + ey * ey < r * r * (.85 + .3 * hash(x * 3 + y * 7))) return hash(x * 5.3 + y * 2.1) > .8 ? 104 : 4; }
      if(y > 22 && y < 44 && Math.abs(dx) < 1.2) return 3; if(y > 24 && y < 30 && Math.abs(dx - (y - 30) * -.8) < .8) return 3; }
    // cedar windbreak behind, left
    for(const [c0, top] of [[5, 2], [11, 8], [62, 4]]){ if(v === 2 && c0 === 62) continue; const hw = (y - top) * .32 + .5; if(y > top && Math.abs(x + .5 - c0) < hw && y < 44) return hash(x * 7 + y * 3) > .82 ? 104 : 4; }
    return 0; }, dir);
  // where the lit windows sit (art px x centre, y), per variant, for halos and reflections
  const FWIN = [[[16.5, 29], [36.5, 29]], [[36.5, 29], [51.5, 29]], [[16.5, 29]]];

  // bus stop: a tin-roofed shelter with a bench, a glowing vending machine, the round stop sign; drawn for the left side (road to the right)
  const BW = 62, BH = 40;
  const CANS = ['#e83a3a', '#3a8ae8', '#f0c040', '#40c070', '#f0f0f0', '#e87a2a'];
  const bus = dir => bake('bus', BW, BH, (x, y) => {
    if(y >= 37) return 5;
    if(y >= 4 && y <= 7 && x >= 1 && x <= 33) return y === 7 ? 3 : (x % 2 ? 108 : 8);
    if((x === 4 || x === 30) && y > 7 && y < 37) return 3;
    if(x >= 8 && x <= 13 && y >= 13 && y <= 19) return y === 13 || x === 8 || x === 13 ? '#6a665e' : (y % 2 ? '#d8d2c2' : '#a8a294');
    if(x > 4 && x < 30 && y >= 10 && y <= 30) return x % 3 === 0 ? '#1e2830' : (x % 3 === 1 ? '#2c3a44' : '#26323c');
    if(x > 6 && x < 28 && y >= 31 && y <= 32) return 3;
    // (the vending machine that stood here is gone: the lit machines are now projected, at the crossroads; the shelter keeps its tube light)
    if(false){ if(x === 36 || x === 49 || y === 9 || y === 36) return '#0c0e14';
      if(y <= 20){ if(y === 13 || y === 17) return '#9ab8d0'; if((y === 11 || y === 15 || y === 19) && x > 37 && x < 48 && x % 2 === 0) return CANS[(x + y) % 6]; return y < 15 ? '#f4fbff' : '#d8ecff'; }
      if(y <= 23) return x > 38 && x < 47 && (x % 3 === 0) ? '#f0f0a0' : '#c0d4e4'; if(y >= 30 && y <= 33 && x > 39 && x < 47) return '#16181e';
      if(x === 37) return '#e8343c'; return '#b4c8d8'; }
    // stop sign: disc, pole, foot
    const dx = x + .5 - 57.5, dy = y + .5 - 6; if(dx * dx + dy * dy < 16){ const r = dx * dx + dy * dy; return r > 9 ? '#c8303a' : r > 3 ? '#f0ece0' : '#2a5ab8'; }
    if((x === 57 || x === 58) && y > 9 && y < 37) return 5; return 0; }, dir);

  // level crossing post (left side): crossbuck, twin red lamps, raised barrier arm, striped post, machine box
  const CW = 22, CH = 58;
  const xing = dir => bake('xing', CW, CH, (x, y) => {
    const d1 = Math.abs((x - 2) * .62 - (y - 1)), d2 = Math.abs((18 - x) * .62 - (y - 1));
    if(y <= 11 && x >= 2 && x <= 18 && (d1 < 1.3 || d2 < 1.3)) return d1 < .6 || d2 < .6 ? YEL : BLK;
    if(y === 14 && x >= 3 && x <= 17) return BLK;
    for(const lx of [4.5, 15.5]){ const ex = x + .5 - lx, ey = y + .5 - 17.5; const r = ex * ex + ey * ey; if(r < 7.5) return r < 3.2 ? '#4a0c0e' : BLK; }
    if(y >= 21 && y <= 24 && x >= 7 && x <= 12) return y === 22 && x >= 8 && x <= 11 ? '#e8e0c8' : BLK;
    if(y >= 26 && y <= 28 && x >= 8 && x <= 11) return 3;
    if(x >= 15 && x <= 16 && y >= 6 && y <= 46) return ((y >> 2) % 2) ? YEL : BLK;
    if(x >= 13 && x <= 18 && y >= 46 && y <= 56) return y === 46 ? BLK : (((x + y) >> 1) % 3 ? YEL : BLK);
    if(x >= 9 && x <= 10 && y >= 10 && y <= 56) return ((y >> 1) % 3) ? '#e8e4dc' : BLK;
    if(y === 57 && x >= 7 && x <= 19) return 5; return 0; }, dir);
  const XLAMP = [[4.5, 17.5], [15.5, 17.5]];
  // near art (nearprops pass): beside the camera the crossing post was drawn at up to 8 canvas px per pixel and its stripes, crossbuck and
  // lamps read as blocks. The same post at 2x / 4x (the rules above in continuous sprite coordinates, so the crossbuck's diagonals and the
  // striped foot are smooth and the bake's rims are 1 fine pixel), drawn at k / R from 2 canvas px per pixel; the lit lamps are discs.
  const xingHi = (dir, R) => bake('xingH' + R, CW * R, CH * R, (px, py) => { const X = (px + .5) / R, Y = (py + .5) / R, xi = X - .5, yi = Y - .5;
    const d1 = Math.abs((xi - 2) * .62 - (yi - 1)), d2 = Math.abs((18 - xi) * .62 - (yi - 1));
    if(Y < 12 && X >= 2 && X < 19 && (d1 < 1.3 || d2 < 1.3)) return d1 < .6 || d2 < .6 ? YEL : BLK;
    if(Y >= 14 && Y < 15 && X >= 3 && X < 18) return BLK;
    for(const lx of [4.5, 15.5]){ const ex = X - lx, ey = Y - 17.5, r = ex * ex + ey * ey; if(r < 7.5) return r < 3.2 ? (ex < -.6 && ey < -.6 ? '#7a2024' : '#4a0c0e') : r > 6.4 && ey < 0 ? '#3a3a40' : BLK; }   // the lamp hood's lit lip, the dark lens's glint
    if(Y >= 21 && Y < 25 && X >= 7 && X < 13) return Y >= 22 && Y < 23 && X >= 8 && X < 12 ? '#e8e0c8' : BLK;
    if(Y >= 26 && Y < 29 && X >= 8 && X < 12) return 3;
    if(X >= 15 && X < 17 && Y >= 6 && Y < 47) return (Math.floor(Y / 4) % 2) ? YEL : BLK;
    if(X >= 13 && X < 19 && Y >= 46 && Y < 57) return Y < 47 ? BLK : ((Math.floor((X + Y) / 2) % 3) ? YEL : BLK);
    if(X >= 9 && X < 11 && Y >= 10 && Y < 57) return (Math.floor(Y / 2) % 3) ? (X < 9 + 1 / R && dir < 0 || X >= 11 - 1 / R && dir > 0 ? '#ffffff' : '#e8e4dc') : BLK;
    if(Y >= 57 && Y < 58 && X >= 7 && X < 20) return 5; return 0; }, dir);
  function xDisc(x, y, r, col){ cx.fillStyle = col; const n = Math.ceil(r / PX); for(let k = -n; k <= n; k++){ const yy = (k + .5) * PX, ww = Math.sqrt(Math.max(0, r * r - yy * yy)); if(ww < PX * .5) continue; cx.fillRect(snap(x - ww), snap(y + k * PX), Math.max(PX, snap(x + ww) - snap(x - ww)), PX); } }

  // a small shrine in a cedar grove on its own island: red torii, a hokora, a stone lantern with a lit window
  const SW = 64, SH = 62;
  const shrine = dir => bake('shrine', SW, SH, (x, y) => {
    if(y >= 52) return y === 52 ? 104 : 6;
    if(y >= 31 && y <= 32 && x >= 22 && x <= 42) return y === 31 ? 3 : 9;
    if(y === 35 && x >= 24 && x <= 40) return 9;
    if((x === 26 || x === 27 || x === 37 || x === 38) && y > 32 && y < 52) return 9;
    if(x >= 29 && x <= 35 && y >= 41 && y <= 51){ if(y <= 43) return 1; return x === 32 && y > 45 ? '#c8a04a' : 3; }
    if(x >= 46 && x <= 50 && y >= 40 && y <= 51){ if(y === 40) return 5; if(y >= 42 && y <= 44 && x >= 47 && x <= 49) return x === 48 && y === 43 ? '#fff4d8' : WIN; if(y >= 45 && y <= 46) return x === 48 ? 5 : 0; if(y >= 47) return x >= 47 && x <= 49 ? 5 : 0; return 5; }
    for(const [c0, top, s] of [[9, 4, .36], [20, 0, .3], [44, 2, .33], [57, 8, .38]]){ const hw = (y - top) * s + .5 - (((y - top) % 6) < 2 ? .8 : 0); if(y > top && y < 52 && Math.abs(x + .5 - c0) < Math.max(.9, hw)) return y > 44 && Math.abs(x + .5 - c0) < 1.2 ? 3 : hash(x * 7 + y * 3 + c0) > .8 ? 104 : 4; }
    return 0; }, dir);
  // scarecrow: straw hat, a blue work shirt on a crossbar, straw skirt, pole
  const crow = dir => bake('crow', 13, 24, (x, y) => { const d = Math.abs(x + .5 - 6.5);
    if(y <= 1) return d < 2 ? 7 : 0; if(y === 2) return d < 5 ? 7 : 0; if(y <= 5) return d < 1.6 ? 107 : 0;
    if(y === 7) return 3; if(y >= 6 && y <= 12 && d < 3.5) return d < 1 ? '#22305a' : '#3a4e8a'; if(y === 6 || y === 8) return x <= 1 || x >= 11 ? 7 : 0;
    if(y >= 13 && y <= 15) return d < 2.5 ? 7 : 0; if(y > 15) return d < .6 ? 3 : 0; return 0; }, dir);
  // a roadside jizō in a red bib and cap
  const jizo = dir => bake('jizo', 9, 13, (x, y) => { const d = Math.abs(x + .5 - 4.5);
    if(y === 0) return d < 1.6 ? 9 : 0; if(y <= 2) return d < 2.8 ? 9 : 0; if(y <= 5) return d < 2.6 ? 5 : 0;
    if(y === 6) return d < 3.4 ? 9 : 0; if(y === 7) return d < 2.6 ? 9 : d < 3.5 ? 5 : 0; if(y === 8) return d < 1.4 ? 9 : d < 3.5 ? 5 : 0;
    if(y <= 11) return d < 3.5 ? 5 : 0; return d < 4.5 ? 5 : 0; }, dir);
  // a ridge tree (hasagi): tall bare trunk, a small leafy crown; they stand in rows on the field ridges
  const hasa = (v, dir) => bake('hasa' + v, 11, 36, (x, y) => { const cx0 = 5.5 + (v ? .5 : 0);
    for(const [ox, oy, r] of v ? [[0, 6, 4.4], [-2, 10, 3], [2, 11, 3.2], [0, 2, 2.6]] : [[0, 7, 4], [-1.5, 3, 2.8], [2, 9, 3]]){ const ex = x + .5 - cx0 - ox, ey = y + .5 - oy; if(ex * ex + ey * ey < r * r) return hash(x * 3.1 + y * 5.7 + v) > .78 ? 104 : 4; }
    if(y > 9 && Math.abs(x + .5 - cx0) < 1) return 3; return 0; }, dir);
  // a far lattice pylon for the backdrop (dark, 1px members)
  const pylonSpr = () => procSprite('pad_pylon', 17, 34, (x, y) => { const c = x - 8, hw = 1 + y * .19, col = '#0a1018';
    if(y === 4 || y === 9) return Math.abs(c) <= 8 - (y === 9 ? 2 : 0) ? col : null; if(y < 2) return c === 0 ? col : null;
    if(Math.abs(Math.abs(c) - Math.round(hw * .5 + (y > 12 ? (y - 12) * .12 : 0))) < .6) return col; if(y > 10 && y % 5 === 0 && Math.abs(c) < hw * .5 + (y - 12) * .12) return col;
    if(y > 10 && Math.abs(Math.abs(c) - ((y % 5) * hw * .1)) < .5 && Math.abs(c) < hw * .6) return col; return null; });

  // ---------------------------------------------------------------- dither patterns and fog cache
  // fog cache: one map per fog step, keyed by colour (no string building per call: it runs thousands of times a frame)
  let fogLow = '#000'; const FCQ = [], FC = { clear(){ FCQ.length = 0; } };
  const fc = (col, fog) => { const q = Math.round(fog * 20); let m = FCQ[q]; if(!m) m = FCQ[q] = new Map(); let v = m.get(col); if(v === undefined){ v = mixc(col, fogLow, q / 20 * .85); m.set(col, v); } return v; };
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], PATS = new Map();
  const q5 = col => { const [r, g, b] = hx(col); return '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); };
  function pat(col, dens){ return ditherPat(q5(col), dens); }   // the engine's pattern cache: no canvas per colour
  // the water spans, one entry per canvas row, rebuilt each frame from the visible segments: on row r the water is x < XL[r] and x > XR[r].
  // Everything drawn on the water goes through FR, a fillRect trimmed to those spans; this replaces a clip path, which was the slowest
  // thing in the frame.
  const XL = new Float32Array(2048), XR = new Float32Array(2048); let WM = false;
  /* (perf 2026-11-20) Rows are grouped by the pieces they draw, not by their raw spans: a narrow rect (a mirrored hill column, a star) is whole
     or absent on most rows even where every row's span differs, so it goes as one tall rect instead of a rect per row. The rows meet on
     whole canvas pixels and each pixel is still covered once, so the pixels are the same. */
  function FR(x, y, w, h){ if(!WM){ cx.fillRect(x, y, w, h); return; } if(w <= 0 || h <= 0) return;
    let r0 = Math.max(0, Math.floor(y / PX)), r1 = Math.min(XL.length, Math.ceil((y + h) / PX - .001)), x1 = x + w;
    while(r0 < r1){ let a = Math.min(x1, XL[r0]), b = Math.max(x, XR[r0]); if(a < x) a = x; if(b > x1) b = x1;   // this row's pieces: [x, a) and [b, x1)
      let r = r0 + 1; for(; r < r1; r++){ let a2 = Math.min(x1, XL[r]), b2 = Math.max(x, XR[r]); if(a2 < x) a2 = x; if(b2 > x1) b2 = x1; if(a2 !== a || b2 !== b) break; }
      const ys = Math.max(y, r0 * PX), ye = Math.min(y + h, r * PX);
      if(ye > ys){ if(a > x) cx.fillRect(x, ys, a - x, ye - ys); if(x1 > b) cx.fillRect(b, ys, x1 - b, ye - ys); }
      r0 = r; } }
  const inWater = (x, y) => { const r = Math.floor(y / PX); return r >= 0 && r < XL.length && (x < XL[r] || x > XR[r]); };
  // how far down from yTop the column at x stays on water (for trimming reflections that would run onto the bank or the road)
  function wetDepth(x, yTop, maxH){ let r = Math.max(0, Math.floor(yTop / PX)); const r1 = Math.min(XL.length, Math.ceil((yTop + maxH) / PX)); let d = 0;
    const r00 = r; for(; r < r1; r++){ if(!(x < XL[r] || x > XR[r])){ if(d || r - r00 > 2) break; continue; } d = (r + 1) * PX - yTop; } return Math.min(maxH, d); }   // (the column must meet water within two rows of its foot: a pole on the bank isn't doubled in a field further down the screen)
  // a filled ellipse made of whole pixel rows (crisp, no anti-aliasing)
  function pxEll(x, y, rx, ry, col, a){ if(rx < PX * .5 || a <= 0) return; cx.globalAlpha = Math.min(1, a); cx.fillStyle = col; const n = Math.max(0, Math.round(ry / PX));
    for(let j = -n; j <= n; j++){ const t = j / (n + .5), hw = rx * Math.sqrt(1 - t * t); FR(snap(x - hw), snap(y) + j * PX, Math.max(PX, snap(2 * hw)), PX); } cx.globalAlpha = 1; }
  // light pool on the ground in hard steps
  function pool(x, y, rx, ry, col, a){ if(rx < 2 || a <= 0) return; const [R, G, B] = hx(col); cx.globalCompositeOperation = 'lighter';
    for(const [f, m] of [[1, .09], [.6, .14], [.3, .2]]){ cx.fillStyle = `rgba(${R},${G},${B},${a * m})`; cx.beginPath(); cx.ellipse(x, y, rx * f, Math.max(PX, ry * f), 0, 0, 6.283); cx.fill(); }
    cx.globalCompositeOperation = 'source-over'; }
  const gl = (x, y, r, col, a) => { if(x + r < 0 || x - r > W || y + r < 0 || y - r > H) return; glow(x, y, Math.min(r, H * .25), col, a); };
  // a reflected light: a vertical column of hard dashes below the light's mirror point, world-anchored (no per-frame randomness)
  function streak(x, y0, len, wd, col, a, seed){ if(a < .02 || len < PX * 2) return; if(column(x, y0, len * 2.2, wd * 1.3, col, a * 1.15)) return;   // (round 2: the palette-cycled shimmer column; the dashes below are the fallback without ui/cycle.js) const n = Math.max(2, Math.min(10, Math.round(len / (PX * 3)))), st = len / n;
    cx.globalCompositeOperation = 'lighter'; cx.fillStyle = col;
    for(let j = 0; j < n; j++){ if(j > 1 && hash(seed * 7.3 + j * 3.1) < .25) continue; const m = j / n, ww = Math.max(PX, snap(wd * (1 - m * .6)));
      cx.globalAlpha = a * (1 - m * .8); FR(snap(x - ww / 2), snap(y0 + j * st), ww, Math.max(PX, snap(st * .55))); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- the field layout (world-anchored)
  const SHO = 1.16, WX = 1.32, KB = [1.07, 1.14];                 // shoulder edge, bank foot (water starts) in half-road widths (round 2: the bank narrowed from 1.42 to a verge and the channel, so more of the plots show, most of all on a phone where the road fills the width)
  const COLS = [0, 5.2, 10.8, 17.5, 25.5, 35];  // ridge (aze) offsets beyond the bank foot
  const FL = 40;                              // a field is FL segments long; a cross ridge at every multiple
  const CR = 520, CROSS = 300;                // the level crossing: rails at CROSS and CROSS + 3 of every CR
  const BUS = 260, BUSAT = 130;
  const POLE = 12;
  const CRS = 340, LANE = 170;                // a farm lane crossing the fields at LANE of every CRS
  const isLane = i => { const r = ((i % CRS) + CRS) % CRS; return r === LANE || r === LANE + 1; };
  // building sites, fixed to the world: one per SITE segments a side (or none), its kind, length and distance from the road hashed from the cell
  const SITE = 64;
  function siteAt(i, side){ const c = Math.floor(i / SITE), h = hash(c * 3.7 + side * 1.31 + 11); if(h < .14) return null;
    const kind = h < .46 ? 0 : h < .63 ? 1 : h < .71 ? 2 : h < .8 ? 4 : 5, len = [8, 4, 9, 4, 2, 7][kind], b0 = c * SITE + 8 + Math.floor(hash(c * 5.1 + side) * (SITE - len - 16));
    if(i < b0 || i >= b0 + len) return null; for(let j = b0 - 8; j <= b0 + len + 8; j += 4) if(isRail(j) || jRail(j) || isLane(j)) return null;
    return { b0, len, kind, X:(side < 0 ? 3.1 : 2.3) + hash(c * 2.3 + side) * (kind === 5 ? .3 : kind === 4 ? .6 : 1.1), n:c * 2 + (side > 0 ? 1 : 0) }; }
  // the second row: farmhouses and barns further out across the fields (a hamlet's worth along the road, none on the viaduct's band)
  const SITE2 = 46;
  function site2At(i, side){ const c = Math.floor(i / SITE2), h = hash(c * 5.9 + side * 2.7 + 29); if(h < .3) return null; const kind = h < .72 ? 0 : 1, len = kind ? 4 : 7, b0 = c * SITE2 + 4 + Math.floor(hash(c * 1.7 + side * 3) * (SITE2 - len - 8));
    if(i < b0 || i >= b0 + len) return null; for(let j = b0 - 6; j <= b0 + len + 6; j += 3) if(isRail(j) || jRail(j) || isLane(j)) return null;
    return { b0, len, kind, X:5.4 + hash(c * 4.3 + side) * 3.2, n:c * 2 + (side > 0 ? 1 : 0) + 5000 }; }
  // a hokora's torii stands on its path, two segments before the hall
  function toriiAt(i){ for(const side of [-1, 1]){ const st = siteAt(i + 3, side); if(st && st.kind === 4 && st.b0 === i + 3) return { side, X:st.X }; } return null; }
  /* The railway jump (setpiece/jump.js 'RAILWAY JUMP', research/sundown-craft/jumpsides.md): o = segment - plan.b0; ramp 0..JNL-1, the
     gap JNL..JNL+JG-1 (a dip over flooded paddies with a railway across it at JRO), the far leaf after. The fields, their mirror, the pole
     line and the houses carry on beside the jump. The jump's own railway carries on across the fields both ways as a low embankment (JRO),
     and the road's level crossing never falls on the jump: a crossing that would (its rails from JXW before the ramp's foot to just past
     the landing) is left out, its railway being the jump's (the station it serves goes with it); one just beyond the landing stands. */
  const JNL = 22, JG = 22, JTOT = 66, JRO = JNL + JG - 3, JXW = 10;
  const jumpO = j => { const t = segs[j], p = t && t.spjP; return p && p.kind === 'bridge' ? j - p.b0 : null; };
  const jGap = o => o !== null && o >= JNL && o < JNL + JG;
  // the crossing's phase at i (0..CR-1), or -1 where this crossing is left out for a jump
  const crc = i => { const r = ((i % CR) + CR) % CR; if(r < CROSS - 4 || r > CROSS + 13) return r; const o = jumpO(i - r + CROSS); return o !== null && o >= -JXW && o <= JTOT + 2 ? -1 : r; };
  const jRail = i => { const o = jumpO(i); return o !== null && o >= JRO - 2 && o <= JRO + 2; };   // (props keep off the jump's railway)
  const isRail = i => { const r = crc(i); return r >= CROSS - 2 && r <= CROSS + 5; };
  const bare = (i, side, c) => hash(Math.floor(i / FL) * 13.7 + c * 5.1 + side * 2.3) < .3;   // some fields still bare water
  const waterX = s => WX + (s.mix < 1 ? (1 - s.mix) * (1 - s.mix) * 26 : 0);

  // ---------------------------------------------------------------- placement
  function place(i, s){ const sp = s.sprites, P = o => { o.env = 'paddies'; o.s = s; sp.push(o); };
    // (the bus stop, the pole line and the crossing's left post keep clear of x -2.9..-1.25: setpiece/rail.js clears that band for the viaduct)
    const rb = ((i % BUS) + BUS) % BUS, bside = 1, nearRail = isRail(i) || isRail(i - 3) || isRail(i + 3) || jRail(i);
    for(const side of [-1, 1]){ const gap = nearRail || (side === bside && rb >= BUSAT - 5 && rb <= BUSAT + 5);
      if(!gap && i % 6 === (side < 0 ? 0 : 3)) P({ type:'deli', x:side * 1.1, k:i }); }
    P({ type:'tick', x:0 });
    if(i % POLE === 0 && !nearRail){ const v = (i / POLE) % 5 === 2 ? 1 : (i / POLE) % 3 === 1 ? 2 : 0; P({ type:'pole', x:1.62, v, k:i }); }
    if(rb === BUSAT){ P({ type:'bus', x:bside * 1.62, side:bside, k:i }); P({ type:'jizo', x:bside * 2.15, k:i }); }
    const rc = crc(i);
    if(rc === CROSS - 1){ P({ type:'xing', x:-1.22, side:-1, k:i }); P({ type:'xing', x:1.32, side:1, k:i + 1 }); }
    // farmhouses on their islands; near ones alternate sides, far ones dot the plain
    if(i % 46 === 23){ const side = hash(i * 1.7) < .5 ? -1 : 1; P({ type:'farm', x:side * (12 + hash(i * 2.9) * 14), v:(i / 46 | 0) % 3, k:i }); }
    // projected buildings by the road (farmhouses, tin barns, the co-op warehouse, a hokora with its torii, drying racks), the station by the
    // crossing, and a lone crossroads with its vending machines
    for(const side of [-1, 1]){ const st = side > 0 && rc >= CROSS + 9 && rc < CROSS + 13 ? { b0:i - rc + CROSS + 9, len:4, kind:3, X:2.05, n:Math.floor(i / CR) * 2 + 99 } : siteAt(i, side);
      if(!st) continue; if(st.kind === 5) P({ type:'rack', x:side * st.X, X:st.X, side, b0:st.b0, len:st.len, k:i });
      else { const kind = st.kind === 4 ? 4 : st.kind; P({ type:'bld', x:side * st.X, X:st.X, side, b0:st.b0, len:st.len, kind, n:st.n, k:i }); } }
    { const tb = toriiAt(i); if(tb) P({ type:'torii', x:tb.side * (tb.X + .45), side:tb.side, k:i }); }
    const rl = ((i % CRS) + CRS) % CRS; if(rl >= LANE + 2 && rl < LANE + 8 && !nearRail) P({ type:'bld', x:1.95, X:1.95, side:1, b0:i - rl + LANE + 2, len:6, kind:5, n:Math.floor(i / CRS) * 2 + 77, k:i });
    if(i % 64 === 21 && !nearRail){ const side = hash(i * 3.3) < .5 ? -1 : 1; P({ type:'crow', x:side * (3 + hash(i * 1.1) * 2.5), k:i }); }
    // a row of ridge trees along some cross ridges
    if(i % FL === 0 && hash(i * .77) < .45 && !nearRail){ const side = hash(i * .13) < .5 ? -1 : 1, n = 4 + (hash(i) * 4 | 0); for(let j = 0; j < n; j++) P({ type:'hasa', x:side * (WX + COLS[1] + .8 + j * 1.35), k:i * 8 + j }); }
    // fireflies over the levees (round 2: they keep to the grass of the aze, where they rest in June), now and then over open water
    if(i % 3 === 0 && !nearRail && hash(i * .91) < .5){ const side = hash(i * 2.2) < .5 ? -1 : 1, c = 1 + (hash(i * 4.4) * 3 | 0); P({ type:'ff', x:side * (hash(i * 6.1) < .75 ? WX + PB[c] + .05 : WX + .3 + hash(i * 4.4) * 2.4), k:i }); }
    // round 2 dressing (each from a hashed cell, so no two stretches repeat): egrets standing in the plots, alone or in pairs; bird-scare
    // balloons on bamboo poles; kira-kira tape strung over a levee; a kei truck parked on the farm lane; a shrine grove of sugi behind
    // each hokora; a pair of jizo by its torii
    if(!nearRail){
      if(i % 29 === 11 && hash(i * 1.37) < .6){ const side = hash(i * .71) < .5 ? -1 : 1, X = WX + .7 + hash(i * 2.9) * 9; P({ type:'heron', x:side * X, v:hash(i * 5.3) < .35 ? 1 : 0, k:i });
        if(hash(i * 8.1) < .35) P({ type:'heron', x:side * (X + .35 + hash(i * 9.7) * .5), v:hash(i * 6.6) < .5 ? 1 : 0, k:i + 1 }); }
      if(i % 47 === 19 && hash(i * 2.13) < .7){ const side = hash(i * 3.9) < .5 ? -1 : 1; P({ type:'ball', x:side * (WX + 1.2 + hash(i * 1.9) * 6), k:i }); }
      if(((i % FL) + FL) % FL === 0 && hash(i * .53 + 4) < .22){ const side = hash(i * 1.21) < .5 ? -1 : 1, X0 = WX + .6 + hash(i * 3.3) * 3; P({ type:'tape', x:side * X0, X0, X1:X0 + 2 + hash(i * 4.1) * 2.5, side, k:i }); } }
    if(rl === LANE && !nearRail){ const side = hash(i * 1.77) < .5 ? -1 : 1; P({ type:'kei', x:side * (3.4 + hash(i * 2.3) * 4), k:i }); }
    for(const side of [-1, 1]){ const st = siteAt(i, side); if(st && st.kind === 4 && i === st.b0) for(let j = 0; j < 4; j++) P({ type:'sugi', x:side * (st.X + .75 + j * .42 + hash(i * 3 + j) * .2), k:i * 4 + j }); }
    { const tb = toriiAt(i); if(tb){ P({ type:'jizo', x:tb.side * (tb.X + .1), k:i }); P({ type:'jizo', x:tb.side * (tb.X - .05), k:i + 1 }); } }
    // light on the road
    const L = (n, v) => { const t = segs[n]; if(t) t.padLit = Math.max(t.padLit || 0, v); };
    if(rb === BUSAT) for(let d = -4; d <= 3; d++) L(i + d, .7 * (1 - Math.abs(d + .5) / 5));
    if(i % POLE === 0 && !nearRail && (i / POLE) % 3 === 1) for(let d = -2; d <= 1; d++) L(i + d, .45 * (1 - Math.abs(d + .5) / 3));
    if(i % 6 === 0 && !nearRail) L(i, .2);   // (round 2) the lit delineator posts: a faint peak each, so roadmat's dew carries their line of reflections
  }

  // ---------------------------------------------------------------- per-frame state: water geometry gathered in roadFX, drawn once at the first sprite
  let LASTI = -1e9, LNOW = -1, PEND = false, NQ = 0, SK = null, MC = null, MOK = false, TR = null;
  const MHY = [new Float32Array(1200), new Float32Array(1200)], MHN = [0, 0], MHO = [0, 0], BHT = new Float32Array(1200), WLX = new Float32Array(400); let BN = 0, BX0 = 0, WLN = 0;   // a new frame starts when the road loop comes back to a nearer segment
  const Q = [];
  // the water mirrors the sky at the same angle below eye level: a banded, dithered ramp from the low sky at the horizon to the ink of the
  // zenith underfoot, a step darker than the sky. Built from the sky colours (cached per colour step), never read back from the canvas.
  const BYF = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  let WPAT = null, WKEY = '', WCV = null, WTOP = '#000';
  /* The ramp is the sky's own (env/sky.js's banded night, with its dawn), not the engine's lighter sk colours, and it sits a clear step
     darker than the sky: still water gives back most of the light only at grazing angles, so the band under the horizon is about two
     thirds of the low sky and the water underfoot falls to ink. (It used to be mixed a third of the way to a pale lavender toward the
     horizon, which made the fields lighter than the sky above them: a flat lavender sheet.) WTOP is the horizon band, which also fills
     water seen above eye level (fields up a slope), so there is no step at the horizon line. */
  function waterPat(sk, hzr){ const SC = ENV.sky && ENV.sky.col ? ENV.sky.col() : null, rows = Math.ceil((H - hzr) / PX) + 2, hzRows = Math.max(8, Math.floor(hzr / PX)),
      key = (SC ? 'S' + ENV.sky.key() : q5(sk.top) + q5(sk.mid) + q5(sk.low)) + ':' + rows + ':' + hzRows + ':' + PX + ':' + hzr;
    if(key === WKEY && WPAT) return WPAT; WKEY = key;
    const T = hx(sk.top), M = hx(sk.mid), L = hx(sk.low), INK = T.map((v, i) => v + ([8, 14, 46][i] - v) * .6), D = [3, 6, 10], NB = 16;
    const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const sky = SC || (u => u < .1 ? INK : u < .3 ? mix3(INK, T, (u - .1) / .2) : u < .7 ? mix3(T, M, (u - .3) / .4) : mix3(M, L, (u - .7) / .3));   // u: 0 zenith .. 1 horizon
    const band = []; for(let b = 0; b <= NB; b++){ const r = Math.pow(b / NB, 1.5) * hzRows, u = 1 - Math.min(1, r / hzRows), c = mix3(mix3(sky(u), [176, 188, 228], .24 * Math.pow(u, 5)), D, .06 + .46 * Math.pow(1 - u, 1.5)); band.push(c.map(Math.round)); }
    WTOP = '#' + band[0].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
    const c = WCV || (WCV = document.createElement('canvas')); if(c.width !== 4 || c.height !== rows){ c.width = 4; c.height = rows; } const k = c.getContext('2d'), img = k.createImageData(4, rows), d = img.data;   // one canvas, repainted (createPattern snapshots it)
    for(let y = 0; y < rows; y++){ const f = Math.pow(Math.min(1, y / hzRows), 1 / 1.5) * NB; for(let x = 0; x < 4; x++){ const b = Math.min(NB, Math.floor(f + BYF[(y & 3) * 4 + x] - .5) + 1), C = band[Math.max(0, b)], o = (y * 4 + x) * 4; d[o] = C[0]; d[o + 1] = C[1]; d[o + 2] = C[2]; d[o + 3] = 255; } }
    k.putImageData(img, 0, 0); WPAT = cx.createPattern(c, 'repeat-x'); WPAT.setTransform(new DOMMatrix().translate(0, hzr).scale(PX)); return WPAT; }

  const LIT = new Map(), litc = (c, q) => { const k = c + q; let v = LIT.get(k); if(!v){ v = mixc(c, '#58626e', q / 16); LIT.set(k, v); } return v; };
  const RC = { sho:'#2a2b31', shoL:'#34353c', edge:'#cfc8b6', bank:['#0d1a14', '#0f1e17'], lip:'#2c4636', ditch:'#3e434a', ditchW:'#0b1418',
    aze:'#0a120d', azeT:'#2a4232', azeR:'#04080a', ball:'#1e1c1c', ballT:'#3a3634', railC:'#b0b6c4', panel:'#3e4048' };
  function roadFX(s, a, b, fog, f, now){
    // a new frame: the clock moved on, or the loop came back to a nearer segment. (Not the same segment again: inside a fork's window the
    // engine calls roadFX once per branch for each segment, and resetting there threw away every segment's water but the last.)
    if(now !== LNOW || s.index < LASTI){ NQ = 0; } LNOW = now; LASTI = s.index; PEND = true;
    const lq = Math.round((s.padLit || 0) * 8), lf = c => fc(lq ? litc(c, lq) : c, fog), xw = waterX(s), F = c => fc(c, fog);
    const rc = crc(s.index);
    // crossing panels and rails across the road
    if(rc >= CROSS && rc <= CROSS + 3){ poly(a.x - a.w * SHO, a.y, a.x + a.w * SHO, a.y, b.x + b.w * SHO, b.y, b.x - b.w * SHO, b.y, F(RC.panel));
      if(rc === CROSS || rc === CROSS + 3){ const t = Math.max(PX, snap(a.w * .018)); cx.fillStyle = F(RC.railC); cx.fillRect(b.x - b.w * SHO, b.y, b.w * SHO * 2, t); } }
    // shoulder (over the built-in rumble), white edge line, grassy bank down to the water, the concrete irrigation ditch at its foot
    for(const sd of [-1, 1]){ const A = k => a.x + sd * a.w * k, B = k => b.x + sd * b.w * k;
      if(sd < 0 ? Math.max(A(1), B(1)) < 0 : Math.min(A(1), B(1)) > W) continue;   // the whole side is off screen
      const cross = rc >= CROSS && rc <= CROSS + 3;
      if(fog > .3 && !cross) poly(A(1), a.y, A(xw), a.y, B(xw), b.y, B(1), b.y, F(RC.bank[s.stripe]));   // far: the shoulder is a pixel; one quad for the whole bank
      else { if(!cross) poly(A(1), a.y, A(SHO), a.y, B(SHO), b.y, B(1), b.y, lf(s.stripe ? RC.sho : RC.shoL)); poly(A(SHO), a.y, A(xw), a.y, B(xw), b.y, B(SHO), b.y, F(RC.bank[s.stripe])); }
      if(a.w > 14) poly(A(.93), a.y, A(.965), a.y, B(.965), b.y, B(.93), b.y, lf(RC.edge));
      if(a.w > 30) poly(A(SHO), a.y, A(SHO + .05), a.y, B(SHO + .05), b.y, B(SHO), b.y, F(RC.lip));
      if(a.w > 10 && xw < 2){ poly(A(WX - .13), a.y, A(WX - .1), a.y, B(WX - .1), b.y, B(WX - .13), b.y, F(RC.ditch)); poly(A(WX - .1), a.y, A(WX), a.y, B(WX), b.y, B(WX - .1), b.y, F(RC.ditchW)); }
      // the water: one quad per side per segment, gathered into a single clip path
    }
    let q = Q[NQ]; if(!q) q = Q[NQ] = {}; NQ++;
    q.s = s; q.ax = a.x; q.ay = a.y; q.aw = a.w; q.bx = b.x; q.by = b.y; q.bw = b.w; q.fog = fog; q.xw = xw;
    // inside a fork's window (FX_CLIP, see fkRoadFX): this branch keeps its outer side; its inner side's water stops at the engine's clip line
    const fk = typeof FX_CLIP !== 'undefined' && FX_CLIP; q.cq = fk ? fk.q : 0; q.cx = fk ? fk.x : 0;
  }

  // ---------------------------------------------------------------- the field surface (2026-11-23, fields pass: research/sundown-craft/paddies.md)
  /* The plots beyond the bank are one pre-baked texture laid on the ground the way env/roadmat.js lays the asphalt (Lou's pseudo-3D texture
     mapping): every canvas row of water takes one texel row of an atlas at that row's true depth (1/z is linear in screen y inside a segment,
     and the road's scale w is 1/z), stretched across from the bank foot to the screen edge with nearest sampling. The texels belong to the
     world (the field's segment index and the lateral offset in half-road widths), so seedlings, levees and plots ride toward you with the road
     and never crawl. The canvas is at art resolution (one canvas pixel per art pixel), so every texel edge lands on the pixel grid.
     Levels: a chain from 128 texels per half-road and 4 texel rows per segment down to 2 per half-road, each half as wide and a quarter as
     deep (depth compresses with the square of distance), built by averaging the art (premultiplied) so nothing far shimmers; level 3 keeps one
     row per field, levels 4-6 one row averaged over every field. A row takes the finest level whose texel is at least one art pixel wide.
     Plots: early summer (June, the week of the planting: fireflies, frogs, the mirror), so every plot is one stage of the same month: bare
     flooded water waiting for the planter (cat's-paw ripples), freshly planted rows (thin tufts, the mirror between), established rows (three
     weeks: green clumps with moonlit tips), rows planted across, machine rows with hand-filled gaps, a seedling nursery (bright mats in trays)
     and now and then a dry vegetable plot (black mulch ridges catching the moon). Levees (aze) run along the road at the plot boundaries and
     across at every field end, with water inlets (mizuguchi); a headland margin of clear water frames every planted plot. */
  const FLV = [{ tx:128, s:4, w:384 }, { tx:64, s:1, w:384 }, { tx:32, s:.25, w:384 }, { tx:16, s:-1, w:512 }, { tx:8, s:0, w:512 }, { tx:4, s:0, w:512 }, { tx:2, s:0, w:512 }];
  const NSLOT = 6, FR0 = FL * 4, FAW = 512;   // field rows (slots) per side; L0 texel rows per field; atlas width
  const ih = (a, b) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const PB = [0, 5.2, 10.8, 17.5, 25.5, 35]; for(let k = 0; PB[PB.length - 1] < 270; k++) PB.push(PB[PB.length - 1] + 7 + ih(k, 5) * 6);
  const PBT = PB.map(v => Math.round(v * 128)), PIDX = new Uint8Array(270 * 32 + 2);
  for(let i = 0, c = 0; i < PIDX.length; i++){ while(c + 1 < PB.length && PB[c + 1] * 32 <= i) c++; PIDX[i] = c; }
  // plot type per side, slot and plot: 0 bare water, 1 just planted, 2 established, 3 rows across, 4 machine rows with gaps, 5 nursery, 6 dry plot
  const PTY = []; for(let sd = 0; sd < 2; sd++) for(let sl = 0; sl < NSLOT; sl++){ const a = new Uint8Array(PB.length);
    for(let c = 0; c < PB.length; c++){ const h = ih(c * 13 + sd * 7, sl + 11); a[c] = h < .3 ? 0 : h < .56 ? 1 : h < .78 ? 2 : h < .85 ? 3 : h < .95 ? 4 : h < .985 || c === 0 ? 5 : 6; } PTY.push(a); }
  const ptypeAt = (X, slot, sd) => { const ci = Math.max(0, Math.round((X - WX) * 128)); let c = PIDX[Math.min(PIDX.length - 1, ci >> 2)]; if(ci < PBT[c]) c--; return PTY[(sd > 0 ? NSLOT : 0) + slot][Math.max(0, c)]; };
  const fslot = (f, sd) => Math.floor(ih(f, sd + 3) * NSLOT);
  // the palette: [r, g, b, a]
  const FPAL = [[0, 0, 0, 0],
    [16, 28, 20, 255], [62, 96, 70, 255], [26, 42, 31, 255], [40, 62, 46, 255], [6, 12, 8, 255],          // 1-5 levee: road face, moonlit edge, grass top, fleck, far edge
    [9, 16, 11, 255], [22, 36, 27, 255], [50, 78, 58, 255],                                                // 6-8 cross levee: face, top, lit top
    [3, 6, 9, 140],                                                                                          // 9 a levee's reflection
    [5, 10, 12, 255], [10, 20, 20, 235], [8, 15, 16, 200], [44, 70, 62, 255], [92, 122, 102, 255],        // 10-14 seedlings: against the mirror they are silhouettes, only the tips catch the moon
    [8, 14, 16, 220], [40, 64, 58, 255],                                                                    // 15-16 new seedlings: base, tip
    [22, 52, 34, 255], [32, 70, 44, 255], [58, 104, 70, 255],                                               // 17-19 nursery mats
    [18, 15, 12, 255], [12, 13, 16, 255], [104, 112, 130, 255], [10, 8, 6, 255], [26, 58, 30, 255],        // 20-24 dry plot: soil, mulch, mulch gleam, furrow, leaves
    [150, 164, 210, 70], [2, 4, 9, 90], [106, 90, 52, 255], [92, 96, 104, 255], [4, 6, 9, 255]];             // 25-29 ripple light, ripple dark, straw, concrete inlet, inlet slot
  // one L0 texel: column ci (1/128 half-road from the bank foot), row rj (a quarter segment, 0 at the field's near levee), its field slot and side
  function fpx(ci, rj, slot, sd){
    let c = PIDX[Math.min(PIDX.length - 1, ci >> 2)]; if(ci < PBT[c]) c--; else if(c + 1 < PBT.length && ci >= PBT[c + 1]) c++;
    const lx = ci - PBT[c], pw = (c + 1 < PBT.length ? PBT[c + 1] : 1e9) - PBT[c], so = sd > 0 ? NSLOT : 0, pt = PTY[so + slot][c], g = ih(ci, rj + slot * 997 + so * 5000);
    if(c > 0 && lx < 12){   // the levee along the road: its road-facing side, a moonlit edge, the grassy top, the far edge; an inlet now and then
      if(rj < 4) return rj === 3 ? 8 : 7;
      if(rj >= 60 && rj < 68 && ih(c * 31 + so, slot) < .45){ if(lx < 3) return 28; if(lx < 9) return rj >= 62 && rj < 66 ? 29 : 28; }
      return lx < 2 ? 1 : lx < 4 ? (g > .3 ? 2 : 3) : lx < 10 ? (g > .82 ? 4 : 3) : 5; }
    if(rj < 4) return rj === 0 ? 6 : rj === 3 ? (g > .35 ? 8 : 4) : g > .85 ? 4 : 7;   // the levee across at the field's start
    if(pt === 6){ const rr = lx % 16; if(rr === 7 || rr === 15) return 23; if(rr < 7){ if(rr >= 2 && rr <= 5 && rj % 6 < 2 && g > .25) return 24; return rr === 1 ? 22 : 21; } return 20; }
    if(rj >= 155) return 9;   // the next levee doubled in the water just in front of it
    const mar = lx < 16 || lx >= pw - 8 || rj < 10 || rj >= 150;
    if(pt === 0 || mar){   // open water: cat's-paw ripples in patches, a wisp of straw
      const cx0 = lx >> 5, cy0 = rj >> 3, hp = ih(cx0 * 13 + c * 7 + so, cy0 + slot * 101);
      if(hp < (pt === 0 ? .24 : .08) && (rj & 1) === 0){ const d = Math.abs((lx & 31) - 16) / 16 + Math.abs((rj & 7) - 4) / 5; if(d < .9){ const m = (lx + rj * 3 + (hp * 50 | 0)) % 9; return m < 3 ? 25 : m === 5 ? 26 : 0; } }
      return g > .9994 ? 27 : 0; }
    const ax = lx - 16, ay = rj - 10;
    if(pt === 5){ if(ax < 150 && ay < 96){ const bx = ax % 50, by = ay % 32; if(bx >= 40 || by >= 24) return 0; return by === 23 ? 19 : g > .93 ? 19 : g > .6 ? 18 : 17; } }   // a nursery: trays of seedling mats in the plot's near corner, the rest just planted
    if(pt === 5 || pt === 1){
      const rx = ax % 10, hy = ay % 4; if(rx !== 0 || hy > 1 || ih((ax / 10 | 0) * 131 + (ay >> 2), c + so) < .06) return 0; return hy === 0 ? 15 : 16; }
    if(pt === 3){ const rx = ax % 5, hy = ay % 10; if(rx > 0 || hy > 2) return 0; return hy === 0 ? 10 : hy === 1 ? 11 : rx === 0 ? 13 : 12; }
    const rx = ax % 10, hy = ay % 4, hid = (ax / 10 | 0) * 131 + (ay >> 2);   // (round 2: rows a texel wide every 10, a hill every segment: mostly mirror between)
    if(rx > 0 || hy > 2 || pt === 4 && ih(hid, c + slot * 17 + so) < .2) return 0;
    return hy === 0 ? 10 : hy === 1 ? 11 : ih(hid, 7 + c) > .8 ? 14 : 13; }
  // the atlases (one per side; the left one mirrored) and their build, in warm-up steps
  const FAT = [null, null]; let FAOK = false, FL0 = true;
  function* fieldBake(){
    FL0 = W / PX >= 300; let y0 = 0; for(let k = 0; k < FLV.length; k++){ const L = FLV[k]; L.rows = k === 0 && !FL0 ? 0 : L.s > 0 ? NSLOT * FL * L.s : L.s < 0 ? NSLOT : 1; L.y0 = y0; y0 += L.rows; }
    const AH = y0, acc = new Float32Array(4);
    for(let si = 0; si < 2; si++){ const sd = si ? 1 : -1, c = FAT[si] || (FAT[si] = document.createElement('canvas')); c.width = FAW; c.height = AH;
      const k2 = c.getContext('2d'), img = k2.createImageData(FAW, AH), D = img.data;
      const put = (k, col, row, r, g, b, a) => { const L = FLV[k], x = si ? col : L.w - 1 - col, o = ((L.y0 + row) * FAW + x) * 4; D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = a; };
      const avg = (n, k, col, row) => { const a = acc[3]; if(a <= 0) put(k, col, row, 0, 0, 0, 0); else put(k, col, row, acc[0] / a, acc[1] / a, acc[2] / a, a / n); };
      const add = p => { const P = FPAL[p], a = P[3]; acc[0] += P[0] * a; acc[1] += P[1] * a; acc[2] += P[2] * a; acc[3] += a; };
      // L0: the art itself; L1, L2: boxes of it (2x4, and 4x16 stratified to 2x8)
      if(FL0){ const L = FLV[0]; for(let row = 0; row < L.rows; row++){ const sl = row / FR0 | 0, rj = row % FR0; for(let col = 0; col < L.w; col++){ const P = FPAL[fpx(col, rj, sl, sd)]; put(0, col, row, P[0], P[1], P[2], P[3]); } if(row % 80 === 79) yield; } }
      { const L = FLV[1]; for(let row = 0; row < L.rows; row++){ const sl = row / FL | 0, r0 = (row % FL) * 4; for(let col = 0; col < L.w; col++){ acc.fill(0); for(let a = 0; a < 2; a++) for(let b = 0; b < 4; b++) add(fpx(col * 2 + a, r0 + b, sl, sd)); avg(8, 1, col, row); } if(row % 80 === 79) yield; } }
      { const L = FLV[2]; for(let row = 0; row < L.rows; row++){ const sl = row / 10 | 0, r0 = (row % 10) * 16; for(let col = 0; col < L.w; col++){ acc.fill(0); for(let a = 0; a < 4; a += 2) for(let b = 0; b < 16; b += 2) add(fpx(col * 4 + a + (b & 2 ? 1 : 0), r0 + b + (a ? 1 : 0), sl, sd)); avg(16, 2, col, row); } if(row % 20 === 19) yield; } }
      // L3: one row per field (8 columns x 24 stratified rows a texel)
      { const L = FLV[3]; for(let sl = 0; sl < NSLOT; sl++){ for(let col = 0; col < L.w; col++){ acc.fill(0); for(let a = 0; a < 8; a += 2) for(let b = 0; b < 24; b++) add(fpx(col * 8 + a + (b & 1), (b * 160 / 24 | 0) + (ih(col, b) * 6 | 0), sl, sd)); avg(96, 3, col, sl); } yield; } }
      // L4-6: every field averaged: a profile at 16 per half-road (4 columns x 6 slots x 8 rows a cell), then boxes of it
      { const n16 = 4096, pr = new Float32Array(n16 * 4); for(let col = 0; col < n16; col++){ acc.fill(0); for(let a = 0; a < 8; a += 2) for(let sl = 0; sl < NSLOT; sl++) for(let b = 0; b < 8; b++) add(fpx(col * 8 + a + (b & 1), (b * 20 + (ih(col + sl * 7, b) * 20 | 0)), sl, sd)); pr.set(acc, col * 4); if(col % 256 === 255) yield; }
        for(let k = 4; k <= 6; k++){ const L = FLV[k], m = 1 << (k - 3); for(let col = 0; col < L.w; col++){ acc.fill(0); for(let j = 0; j < m; j++){ const o = (col * m + j) * 4; acc[0] += pr[o]; acc[1] += pr[o + 1]; acc[2] += pr[o + 2]; acc[3] += pr[o + 3]; } avg(m * 192, k, col, 0); } } }
      k2.putImageData(img, 0, 0); cx.drawImage(c, 0, 0, 1, 1); yield; }
    FAOK = true; }
  /* Per frame, inside the water's clip: every canvas row of water takes the frontmost segment covering it (near to far, as the road is
     drawn, so a crest hides what is behind it), and one drawImage per side per level span. */
  function fieldRow(si, sd, slot, dz, xc, w, Xa, Xend, ry, rh){
    const P = w / PX; let k = 0; while(k < 6 && FLV[k].tx > P) k++; if(k === 0 && !FL0) k = 1;
    for(; k < FLV.length && Xa < Xend; k++){ const L = FLV[k], Xm = WX + L.w / L.tx, Xb = Math.min(Xend, Xm); if(Xb <= Xa) continue;
      const yy = L.y0 + (L.s > 0 ? Math.min(L.rows - 1, ((slot * FL + dz) * L.s) | 0) : L.s < 0 ? slot : 0), sw = (Xb - Xa) * L.tx;
      if(sd > 0) cx.drawImage(FAT[si], (Xa - WX) * L.tx, yy, sw, 1, xc + Xa * w, ry, (Xb - Xa) * w, rh);
      else cx.drawImage(FAT[si], L.w - (Xb - WX) * L.tx, yy, sw, 1, xc - Xb * w, ry, (Xb - Xa) * w, rh);
      Xa = Xb; } }
  let FDC = 0, VR0 = 0, VR1 = 0;
  function fieldPass(){ FDC = 0; if(!FAOK || PDX.includes('field')) return; cx.imageSmoothingEnabled = false; let maxr = Math.ceil(H / PX);
    for(let n = 0; n < NQ; n++){ const q = Q[n], dy = q.ay - q.by; if(dy <= .01) continue; if(q.fog > .92) break;
      const r0 = Math.ceil(q.by / PX - .5), r1 = Math.min(maxr, Math.ceil(q.ay / PX - .5)); if(r1 <= r0){ maxr = Math.min(maxr, Math.max(0, r0)); continue; } maxr = r0;
      const i = q.s.index, ia = 1 / q.aw, ib = 1 / q.bw; if(isRail(i) || jRail(i)) continue;
      cx.globalAlpha = 1 - q.fog * .85;
      for(let r = Math.max(0, r0); r < r1; r++){ const far2 = q.aw < PX * 32 && r + 1 < r1;   // far rows (a row per field or coarser) two at a time: half the calls where nothing shows the difference
        const y = (r + (far2 ? 1 : .5)) * PX, u = (q.ay - y) / dy, w = q.aw + (q.bw - q.aw) * u, xc = q.ax + (q.bx - q.ax) * u;
        const d = i + (ib !== ia ? (1 / w - ia) / (ib - ia) : u), f = Math.floor(d / FL), dz = d - f * FL;
        for(let si = 0; si < 2; si++){ const sd = si ? 1 : -1; if(!ok(q, sd)) continue; const Xe = sd > 0 ? (W - xc) / w : xc / w; if(Xe <= q.xw) continue;
          FDC++; fieldRow(si, sd, fslot(f, sd), dz, xc, w, q.xw, Xe + .01, r * PX, far2 ? PX * 2 : PX); }
        if(far2) r++; } }
    if(VR1 > VR0 && NQ){ const qt = Q[NQ - 1], xc = qt.bx, y0h = H / 2 - PITCH, KZ = ROADW * W / (CAMH * H), road = fc(ENV.paddies.road[0], .6);
      for(let r = Math.max(0, VR0); r < VR1; r += 2){ const y = (r + 1) * PX, w = (y - y0h) * KZ; if(w <= .05) continue; const z = DEPTH * ROADW * W / (2 * w), fog = clamp(Math.pow(z / SEG / DRAW_N, 1.6), 0, 1); if(fog > .97) continue;
        const d = position / SEG + z / SEG, f = Math.floor(d / FL), dz = d - f * FL, rh = Math.min(2, VR1 - r) * PX; cx.globalAlpha = 1 - fog * .85;
        for(let si = 0; si < 2; si++){ const sd = si ? 1 : -1, Xe = sd > 0 ? (W - xc) / w : xc / w; if(Xe > WX) fieldRow(si, sd, fslot(f, sd), dz, xc, w, WX, Xe + .01, r * PX, rh); }
        cx.globalAlpha = 1; cx.fillStyle = road; cx.fillRect(snap(xc - w * SHO), r * PX, Math.max(PX, snap(w * SHO * 2)), rh); } }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- rice tufts standing in the near plots, each doubled in the water (Kellan, 2026-11-23)
  /* Studied at pixel zoom (Commons): "Newly planted rice paddy with hills, Tsuruga, June 2017" (machine rows: clumps of four to seven blades
     fanning from one point, a little higher than the row spacing is wide, the outer blades bending out; fresh yellow-green tips, darker
     at the base; the bright water between rows), "Reflection in a Flooded Paddy field" (close tufts: each a small V of thin blades, its
     reflection a darker, bluer, inverted V just under the waterline, cut off by a one-pixel gap of bright water and broken where the
     surface trembles), and "Transplanting rice seedlings ... leaves gaps" at dusk (low angle: far rows become short dark ticks, gaps in the
     machine rows filled by hand). Pixel technique borrowed (not copied): the festival's field mirror in setpiece/festival.js (mirror about the
     waterline, every fourth row dropped) and the common pixel-art reed/water convention (Octopath Traveler's HD-2D fields and reed beds:
     the reflection a flat darker copy, broken into scanline slivers that shift a pixel left and right).
     How it's drawn: for each size step (tuft height 3..14 art pixels) a strip of 48 tufts at that step's own pitch, each with its reflection
     under it, three sway frames, and a variant with machine gaps, all baked at warm-up into one atlas. A depth line of hills across a plot is
     then one drawImage of a run of that strip, stretched only by the few percent between the step's pitch and the line's true pitch. The
     tufts sit exactly on the texture's rows (one per row every 1/16 half-road, a hill every 3/4 segment from the field's tenth texel row). */
  const TTH = [3, 4, 5, 6, 7, 9, 11, 14], TN = 48, TFR = 3, TRW = 10 / 128;   // tuft heights (art px), tufts a strip, sway frames, row spacing (half-roads)
  const TP = TTH.map(h => Math.max(5, Math.round(h * 2.6))), TRH = TTH.map(h => Math.max(2, Math.round(h * .8)));
  let TAT = null; const TY = [], TSW = [0, 1, 2, 1];   // TSW: the sway cycle over the three lean frames   // the atlas, and per [step][gap][frame] the strip's top row
  const TCOL = { base:[12, 26, 20], mid:[28, 54, 40], lit:[70, 106, 80], tip:[116, 148, 110], rb:[16, 26, 44], rm:[30, 46, 70], rl:[66, 94, 124] };   // moonlight takes most of the green out; the reflections go bluer
  function* tuftBake(){ let H0 = 0; for(let s = 0; s < TTH.length; s++){ TY[s] = []; for(let g = 0; g < 2; g++){ TY[s][g] = []; for(let f = 0; f < TFR; f++){ TY[s][g][f] = H0; H0 += TTH[s] + 1 + TRH[s] + 1; } } }
    const AW = TN * TP[TP.length - 1], c = TAT || (TAT = document.createElement('canvas')); c.width = AW; c.height = H0; const k = c.getContext('2d'), img = k.createImageData(AW, H0), D = img.data;
    const put = (x, y, C, a) => { if(x < 0 || x >= AW || y < 0 || y >= H0) return; const o = (y * AW + x) * 4; if(D[o + 3] && a < D[o + 3]) return; D[o] = C[0]; D[o + 1] = C[1]; D[o + 2] = C[2]; D[o + 3] = a; };
    for(let s = 0; s < TTH.length; s++){ const th = TTH[s], p = TP[s], rh = TRH[s];
      for(let g = 0; g < 2; g++) for(let f = 0; f < TFR; f++){ const y0 = TY[s][g][f], wl = y0 + th;   // wl: the waterline row
        for(let j = 0; j < TN; j++){ if(g && ih(j, s + 77) < .22) continue; const cx0 = j * p + (p >> 1) + (ih(j, s) < .2 ? (ih(j, s + 9) < .5 ? -1 : 1) : 0);
          const sh = ih(j, s + 11), hh = Math.max(2, Math.round(th * (.72 + ih(j, s + 3) * .4))), nb = th < 5 ? 3 : th < 9 ? 4 + (ih(j, s + 13) * 2 | 0) : 5 + (ih(j, s + 13) * 3 | 0), lean = (f - 1) * (th >= 6 ? 1 : .6) + (ih(j, s + 5) - .5) * .8;
          for(let b = 0; b < nb; b++){ const spread = (b / (nb - 1) - .5) * 2, bl = Math.round(hh * (1 - Math.abs(spread) * .3 + (ih(j * 7 + b, s) - .5) * .2));   // each blade: up from the base, fanning out, bending at the top
            for(let y = 0; y < bl; y++){ const t = y / Math.max(1, bl - 1), x = Math.round(cx0 + spread * (th * .38) * Math.pow(t, 1.3) + lean * t * t * 1.4);
              const C = t > .8 && spread > -.2 && sh > .35 ? TCOL.tip : spread > .3 ? TCOL.lit : t < .35 || sh < .2 ? TCOL.base : TCOL.mid; put(x, wl - 1 - y, C, 255);
              // the reflection: inverted under a one-row gap, darker and bluer, every fourth row dropped, alternate rows nudged a pixel
              const ry = wl + 1 + Math.round(y * rh / th); if(ry >= wl + 1 + rh) continue; const rr = ry - wl - 1; if(rr % 4 === 3) continue;
              const nud = rr % 2 ? (ih(j, rr + s) < .5 ? -1 : 1) : 0; put(x + nud, ry, C === TCOL.tip || C === TCOL.lit ? TCOL.rl : t < .35 ? TCOL.rb : TCOL.rm, 200 - rr * 14); } } } } yield; }
    k.putImageData(img, 0, 0); cx.drawImage(c, 0, 0, 1, 1); yield; }
  // draw the tufts of the near planted plots, far to near (each line's reflection lies under the nearer lines, which cover it)
  function tuftPass(now){ if(!TAT || !TY.length || PDX.includes('tuft')) return; const TK = .03, wmin = 4 / TK * PX, fr = reduce ? 1 : -1;
    for(let n = NQ - 1; n >= 0; n--){ const q = Q[n]; if(q.aw < wmin || q.fog > .3) continue; const i = q.s.index; if(isRail(i) || jRail(i)) continue;
      const ia = 1 / q.aw, ib = 1 / q.bw, f = Math.floor(i / FL), d0 = i - f * FL;
      // hill lines in this segment: depth (10 + 3j + .5) / 4 segments into the field
      const jA = Math.max(0, Math.ceil((d0 * 4 - 10.5) / 4)), jB = Math.min(34, Math.ceil(((d0 + 1) * 4 - 10.5) / 4) - 1);
      for(let j = jB; j >= jA; j--){ const dl = (10.5 + 4 * j) / 4, fr0 = dl - d0, w = 1 / (ia + (ib - ia) * fr0), u = (w - q.aw) / (q.bw - q.aw || 1);
        const y = q.ay + (q.by - q.ay) * u, xc = q.ax + (q.bx - q.ax) * u, thi = TK * w / PX; if(thi < 4) continue;   // (round 2: only near, where clear water shows between tufts; further out the texture's dotted rows carry it)
        let s = 0; while(s < TTH.length - 1 && TTH[s + 1] <= thi * 1.08) s++;
        const lh = ih(f * 64 + j, 5), fi = fr >= 0 ? fr : TSW[(Math.floor(now / 520 + lh * 4) % 4 + 4) % 4], yr = snap(y);
        for(let si = 0; si < 2; si++){ const sd = si ? 1 : -1; if(!ok(q, sd)) continue; const slot = fslot(f, sd), row = PTY[(sd > 0 ? NSLOT : 0) + slot];
          for(let c = 0; c + 1 < PB.length; c++){ const pt = row[c]; if(pt !== 2 && pt !== 4 && pt !== 1 && pt !== 5) continue;
            const X0 = WX + PB[c] + 16 / 128, X1 = WX + PB[c + 1] - 8 / 128; if(X0 < q.xw) continue; const ss = pt === 1 || pt === 5 ? Math.max(0, s - 2) : s;
            if(pt === 5 && j < 23 && X0 < WX + PB[c] + 1.3) continue;   // (the nursery's trays: no tufts on them)
            const pitch = w * TRW, xa = xc + sd * X0 * w; let ja = 0, jb = Math.floor((X1 - X0) / TRW);
            // keep only the tufts on screen
            if(sd > 0){ if(xa > W) break; ja = Math.max(0, Math.ceil((0 - xa) / pitch)); jb = Math.min(jb, Math.floor((W - xa) / pitch) + 1); }
            else { if(xa < 0) break; ja = Math.max(0, Math.ceil((xa - W) / pitch)); jb = Math.min(jb, Math.floor(xa / pitch) + 1); }
            if(jb < ja) continue; const th = TTH[ss], P = TP[ss], top = TY[ss][pt === 4 ? 1 : 0][fi], hgt = th + 1 + TRH[ss];
            let jj = ja, off = Math.floor(ih(f * 7 + c, j) * TN);
            while(jj <= jb){ const k0 = (jj + off) % TN, cnt = Math.min(jb - jj + 1, TN - k0), x0 = sd > 0 ? xa + (jj - .5) * pitch : xa - (jj + cnt - .5) * pitch;
              cx.drawImage(TAT, k0 * P, top, cnt * P, hgt, snap(x0), yr - th * PX, snap(cnt * pitch), hgt * PX); jj += cnt; } } } } } }

  // ---------------------------------------------------------------- the water pass
  // may this gathered segment draw on side sd? Outside a fork, both sides; on a fork branch only its outer side (its inner side meets the
  // other branch, the gore and the island: no fields detail, no kerb, as the engine's fork inner-side rule)
  const ok = (q, sd) => !q.cq || q.cq === sd;
  const SHW = [.3, .18, .09, .04], SHA = [.03, .045, .06, .08];
  function waterPass(now){
    if(!NQ || !SK) return;
    const hzr = Math.floor(HZ / PX) * PX, t = MOON.t, dawn = clamp((t - .7) / .3, 0, 1), moonCol = mixc('#f4f0e2', '#ffb070', dawn), mx = MOON.x;
    // the water region: per side, one polygon per unbroken run of segments (a few simple polygons clip far faster than hundreds of quads)
    const nr = Math.min(XL.length, Math.ceil(H / PX) + 1); XL.fill(-1e9, 0, nr); XR.fill(1e9, 0, nr);
    // (the spans XL / XR cover the outer fields only: a fork branch's inner strip gets the mirror but none of the detail drawn through FR)
    for(let n = 0; n < NQ; n++){ const q = Q[n], dy = q.ay - q.by; if(dy <= 0) continue; const la = q.ax - q.aw * q.xw, lb = q.bx - q.bw * q.xw, ra = q.ax + q.aw * q.xw, rb = q.bx + q.bw * q.xw, oL = ok(q, -1), oR = ok(q, 1);
      for(let r = Math.max(0, Math.floor(q.by / PX)), r1 = Math.min(nr, Math.ceil(q.ay / PX)); r < r1; r++){ const t = clamp((q.ay - (r + .5) * PX) / dy, 0, 1); if(oL) XL[r] = la + (lb - la) * t; if(oR) XR[r] = ra + (rb - ra) * t; } }
    /* (round 2) The plain beyond a crest. The road humps over a flat plain, but the fields were only drawn beside visible segments, so on a
       crest everything between the crest line and the horizon was the backdrop's flat fill (the fields "a thin band", worst on phones). Those
       rows now take the plain itself: a flat ground at the camera's level, projected exactly (w = (y - horizon) * ROADW * W / (CAMH * H)),
       mirror and field texture and all, the hidden road a dark strip down its middle. */
    { let rt = nr; for(let n = 0; n < NQ; n++){ const q = Q[n]; if(q.ay - q.by > .01) rt = Math.min(rt, Math.ceil(q.by / PX - .5)); } VR0 = Math.ceil((H / 2 - PITCH) / PX + .5); VR1 = rt;
      if(VR1 - VR0 < 2 || NQ === 0) VR1 = VR0; else for(let r = Math.max(0, VR0); r < VR1; r++){ XL[r] = 1e9; XR[r] = 1e9; } }
    cx.save(); cx.beginPath(); if(VR1 > VR0) cx.rect(0, VR0 * PX, W, (VR1 - VR0) * PX);
    // per side, one polygon per unbroken run: between the bank foot and the screen edge (outer), or the fork's clip line (a branch's inner side).
    // Entries of the other branch are passed over, not run-breaking: before a fork's lock the two branches alternate segment by segment.
    for(const sd of [-1, 1]) for(let inner = 0; inner < 2; inner++){ const ex = sd < 0 ? -PX : W + PX; let E = [], O = [];
      const flush = () => { if(E.length > 2){ cx.moveTo(O[0], O[1]); for(let j = 2; j < O.length; j += 2) cx.lineTo(O[j], O[j + 1]); for(let j = E.length - 2; j >= 0; j -= 2) cx.lineTo(E[j], E[j + 1]); cx.closePath(); } E = []; O = []; };
      for(let n = 0; n < NQ; n++){ const q = Q[n]; if(inner ? q.cq !== -sd : !ok(q, sd)) continue;
        const bd = inner ? (sd < 0 ? Math.max(ex, q.cx) : Math.min(ex, q.cx)) : ex, cl = v => sd < 0 ? Math.max(bd, v) : Math.min(bd, v), xa = cl(q.ax + sd * q.aw * q.xw), xb = cl(q.bx + sd * q.bw * q.xw);
        if(E.length && Math.abs(E[E.length - 1] - q.ay) > 1.5) flush();
        if(!E.length){ E.push(xa, q.ay + 1); O.push(bd, q.ay + 1); } E.push(xb, q.by); O.push(bd, q.by); }
      flush(); }
    // the sky mirrored about eye level (rows above eye level, seen on a climb, take the horizon's sheen); the moon's halo and disc where they fall
    { const wp = waterPat(SK, hzr); cx.fillStyle = WTOP; cx.fill(); cx.fillStyle = wp; cx.fill(); } WM = true;
    const myr = 2 * hzr - MOON.y, mR = Math.min(W, H) * .1, mvis = 1 - clamp((t - .97) * 30, 0, 1);
    if(mvis > 0){ cx.globalCompositeOperation = 'lighter'; for(const [f, al] of [[3, .05], [2, .07], [1.4, .1]]) pxEll(MOON.x, myr, mR * f, mR * f * .7, moonCol, al * mvis); cx.globalCompositeOperation = 'source-over';
      pxEll(MOON.x, myr, mR, mR * .92, mixc(moonCol, '#8a90a0', .15), .85 * mvis); }
    // stars in the water: fixed in the sky's frame, so they slide with it, never with the road
    const so = skyPar('sky'), sc = mixc(SK.low, '#f0f2fa', .7), night = 1 - clamp((t - .75) * 4, 0, 1);
    if(night > 0) for(let j = 0; j < 110; j++){ const x = ((hash(j * 3.1) * W * 1.3 - so) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * .15, y = hzr + PX * 2 + Math.pow(hash(j * 7.7), 1.3) * (H - hzr) * .8, big = hash(j * 5.9) > .9;
      cx.fillStyle = big ? '#ffffff' : sc; cx.globalAlpha = night * (.4 + hash(j) * .5) * (reduce ? 1 : .75 + .25 * Math.sin(now / 700 + j * 2.1)); FR(snap(x), snap(y), big ? PX * 2 : PX, PX); } cx.globalAlpha = 1;
    // the hills, the far tree rows, farm lights and the train, upside down under the horizon
    if(MOK){ const dk = '#05080c', hz = HZ;
      const hzs = snap(hz);
      for(let L = 0; L < 2; L++){ const Y = MHY[L], n = MHN[L], o0 = MHO[L]; cx.globalAlpha = L ? .6 : .35; cx.fillStyle = mixc(MC[L], dk, .3);
        for(let i = 0; i < n; i++){ const h = hzs - Y[i]; if(h > 0) FR((i - 1) * PX - o0, hzs, PX, h); } }
      cx.globalAlpha = .75; cx.fillStyle = mixc(MC[2], dk, .2); for(let j = 0; j < BN; j++) if(BHT[j] > 0) FR(BX0 + j * PX * 2, hzs, PX * 2, BHT[j]);
      cx.globalAlpha = .7; cx.fillStyle = '#e0a058'; for(let j = 0; j < WLN; j++) FR(WLX[j], hzs + PX, PX, PX * 3); cx.globalAlpha = 1;
      if(TR){ const [tx, ty, len] = TR, ry = snap(2 * HZ - ty - PX * 4); cx.fillStyle = '#080c10'; FR(tx, ry, len, PX * 4); cx.fillStyle = '#c8b088'; cx.globalAlpha = .7;
        for(let j = 0; j < 20; j += 1){ if(j === 9 || j === 10 || j % 3 === 2) continue; FR(tx + PX * (2 + j * 2.2 | 0), ry + PX, PX, PX); } cx.globalAlpha = 1; } }
    MOK = false;
    // the moon's sheen: the low sky round the moon gives back a broad soft column on the water under it, brightest toward the horizon, in hard
    // stepped bands; the planted rows, drawn over it later, cut it into lines (as the sun's path in photographs of planted paddies at sunrise)
    if(mvis > 0){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = moonCol; const hh = Math.max(PX * 8, H - hzr);
      for(let j = 0; j < 4; j++){ const fw = SHW[j], fa = SHA[j]; for(let b = 0; b < 5; b++){ const y0 = hzr + snap(hh * Math.pow(b / 5, 1.6)), y1 = hzr + snap(hh * Math.pow((b + 1) / 5, 1.6)); cx.globalAlpha = fa * mvis * (1 - b / 5.5); FR(snap(mx - W * fw / 2), y0, snap(W * fw), y1 - y0); } }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
    // moonlight catching wavelets: short pale dashes fixed to the field grid, brightest toward the moon's side
    cx.globalCompositeOperation = 'lighter'; cx.fillStyle = moonCol;
    for(let n = 0; n < NQ; n++){ const q = Q[n], i = q.s.index; if(q.fog > .85) break; if(hash(i * 1.93) > .45) continue;
      for(const sd of [-1, 1]){ const lx = q.xw + .3 + hash(i * 5.3 + sd) * 9, x = q.ax + sd * q.aw * lx, k = clamp(1 - Math.abs(x - MOON.x) / (W * .45), 0, 1); if(k < .1 || x < 0 || x > W) continue;
        if(!ok(q, sd)) continue; cx.globalAlpha = .25 * k * (1 - q.fog * .6) * mvis; FR(snap(x), snap(q.by), Math.max(PX, snap(q.aw * (.2 + hash(i * 2.2) * .5))), PX); } }
    // the moon's glitter column: broken bright dashes down the water under the moon, fixed to the segments. Where the road hides that column,
    // it is slid into the nearest field on the moon's side (a cheat, as the coast does), so the paddies always carry the moon's road.
    for(let n = 0; n < NQ; n++){ const q = Q[n], i = q.s.index, rh = q.ay - q.by; if(q.fog > .75) break; if(hash(i * 2.31) > .62 || ((i % FL) + FL) % FL === 0 || isRail(i)) continue;
      const sd = MOON.x >= q.ax ? 1 : -1; if(!ok(q, sd)) continue; const xe = q.ax + sd * q.aw * q.xw, inW = sd * (MOON.x - xe) > q.aw * .2, c0 = inW ? MOON.x : xe + sd * q.aw * 1.1;
      const k = clamp(1.15 - Math.abs(q.ay - myr) / (H * .3), .2, 1) * (1 - q.fog * .7) * mvis, w = Math.max(PX, snap(Math.min(PX * 16, q.aw * (.12 + hash(i * 3.7) * .45) * (.6 + k * .6)))), x = snap(c0 + (hash(i * 4.7) - .5) * q.aw * (.5 + k * .4) - w / 2);
      cx.fillStyle = hash(i * 6.1) > .7 ? '#ffffff' : moonCol; cx.globalAlpha = Math.min(1, .95 * k + .1); FR(x, snap(q.by), w, Math.max(PX, snap(Math.min(rh * .6, PX * 2)))); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    // reflections of everything standing in or beside the fields, far to near
    for(let n = NQ - 1; n >= 0; n--){ const q = Q[n], s = q.s; if(q.fog > .9) continue;
      for(const sp of s.sprites){ if(sp.env !== 'paddies' || q.cq && Math.sign(sp.x) !== q.cq) continue; const fn = REFL[sp.type]; if(fn) fn(sp, q.ax + sp.x * q.aw, q.ay, q.aw, q.fog, now, q); } }
    // the moon in each field (Hiroshige's tagoto no tsuki): a flat stepped ellipse near the far ridge of every field, slid toward the moon's column
    const mv = (1 - clamp((t - .96) * 25, 0, 1)) * (.75 + .25 * (1 - dawn));
    cx.globalCompositeOperation = 'lighter';
    for(let n = NQ - 1; n >= 0; n--){ const q = Q[n], i = q.s.index; if(((i % FL) + FL) % FL !== FL - 5 || q.fog > .88 || isRail(i)) continue;
      for(const sd of [-1, 1]) for(let c = 0; c < 2; c++){ if(q.xw > WX + .1 && c === 0 || !ok(q, sd)) continue;
        const x0 = q.ax + sd * q.aw * (q.xw + COLS[c] + .9), x1 = q.ax + sd * q.aw * (WX + COLS[c + 1] - .7), lo = Math.min(x0, x1), hi = Math.max(x0, x1);
        if(hi < 0 || lo > W || hi - lo < PX * 2) continue; const x = clamp(mx, lo, hi), far = Math.abs(x - mx) / W, k = clamp(1 - far * 1.6, 0, 1) * (1 - q.fog * .75) * mv;
        if(k < .06) continue; const rx = snap(Math.max(PX * 1.5, q.aw * .11)), ry = Math.max(PX * .5, snap(rx * .4)), y = snap(q.ay - (q.ay - q.by) * .5);
        pxEll(x, y, rx * 1.6, ry + PX, moonCol, .14 * k);
        cx.globalCompositeOperation = 'source-over'; pxEll(x, y, rx, ry, moonCol, k); if(rx >= PX * 3){ cx.fillStyle = mixc(moonCol, '#7a7890', .45); cx.globalAlpha = .6 * k; FR(snap(x + rx * .2), y, Math.max(PX, snap(rx * .4)), PX); }
        cx.globalAlpha = k; cx.fillStyle = '#ffffff'; FR(snap(x - rx * .45), y - (ry >= PX ? PX : 0), PX, PX); cx.globalAlpha = 1; cx.globalCompositeOperation = 'lighter'; } }
    cx.globalCompositeOperation = 'source-over';
    // frogs: a ring spreading on still water now and then, at fixed spots
    if(!reduce) for(let n = 0; n < NQ; n++){ const q = Q[n]; if(q.fog > .25) break; const i = q.s.index; if(i % 3) continue;
      const h = hash(i * 3.7), per = 2600 + h * 2400, ph = ((now / per + h * 7) % 1); if(ph > .45) continue;
      const sd = h < .5 ? -1 : 1; if(!ok(q, sd)) continue; const x = q.ax + sd * q.aw * (q.xw + .6 + hash(i * 5.1) * 4), r = q.aw * (.04 + ph * .5), al = (1 - ph / .45) * .5 * (1 - q.fog * 3);
      if(x < -r || x > W + r) continue; cx.fillStyle = mixc('#8aa4b8', moonCol, .3); cx.globalAlpha = al;
      for(let j = 0; j < 12; j++){ const an = j / 12 * 6.283; FR(snap(x + Math.cos(an) * r), snap(q.ay + Math.sin(an) * r * .22), PX, PX); } cx.globalAlpha = 1; }
    // the plots themselves: seedlings, levees, ripples, nurseries and dry plots, texture-mapped (fieldPass)
    fieldPass(); tuftPass(now);
    // ridges (aze) running beside the road: a dark band, a lit grassy top edge, a darker mirror band under it
    // each ridge is one strip polygon per unbroken run of segments: x(q, end) gives its centre, w and h its width and lift
    const strip = (path, X, wf, wmin, hf, off) => { for(const sd of [-1, 1]){ let L = [], Rr = [];
        const flush = () => { if(L.length > 2){ path.moveTo(L[0], L[1]); for(let j = 2; j < L.length; j += 2) path.lineTo(L[j], L[j + 1]); for(let j = Rr.length - 2; j >= 0; j -= 2) path.lineTo(Rr[j], Rr[j + 1]); path.closePath(); } L = []; Rr = []; };
        for(let n = 0; n < NQ; n++){ const q = Q[n]; if(q.fog > .82) break; if(!ok(q, sd)) continue; const XX = X < 0 ? q.xw : X; if(XX < q.xw){ flush(); continue; }
          const xa = q.ax + sd * q.aw * XX, xb = q.bx + sd * q.bw * XX; if((xa < -PX * 4 && xb < -PX * 4) || (xa > W + PX * 4 && xb > W + PX * 4)){ flush(); continue; }
          if(L.length && Math.abs(L[L.length - 1] - (q.ay - Math.max(PX, q.aw * hf))) > 1.5) flush();
          const wa = Math.max(wmin, q.aw * wf), wb = Math.max(wmin, q.bw * wf), ha = hf ? Math.max(PX, q.aw * hf) : 0, hb = hf ? Math.max(PX, q.bw * hf) : 0, o = off * sd;
          if(!L.length){ L.push(xa - wa / 2 + o * wa, q.ay - ha); Rr.push(xa + wa / 2 + o * wa, q.ay - ha); }
          L.push(xb - wb / 2 + o * wb, q.by - hb); Rr.push(xb + wb / 2 + o * wb, q.by - hb); }
        flush(); } };
    // the waterline at the foot of the road bank: one pale line where the grass meets the mirror
    cx.beginPath(); strip(cx, -1, 0, PX * 1.4, 0, .5); cx.globalAlpha = .55; cx.fillStyle = mixc(SK.low, moonCol, .45); cx.fill(); cx.globalAlpha = 1;
    // cross ridges at every field end, and the railway embankment
    for(let n = NQ - 1; n >= 0; n--){ const q = Q[n], i = q.s.index, r = ((i % FL) + FL) % FL, rail = isRail(i);
      if(q.s.spjP && jumpO(i) === JRO){ jRailQ(q, moonCol); continue; }   // the jump's railway, out across the fields both ways
      const last = segs[i + 1] && segs[i + 1].land !== q.s.land;
      const lane = isLane(i) && !rail;
      if(r !== 0 && !rail && !last && !lane) continue; const fog = q.fog;
      for(const sd of [-1, 1]){ if(!ok(q, sd)) continue; const xa = q.ax + sd * q.aw * q.xw, xb = q.bx + sd * q.bw * q.xw, ex = sd < 0 ? -PX : W + PX;
        // the farm lane: a raised dirt track straight out across the fields, pale on top, its mirror band under it
        if(lane){ const th = Math.max(PX, snap((q.ay - q.by) * .9)), y = snap(q.by); cx.fillStyle = fc('#1a1a14', fog); FR(Math.min(xb, ex), y + th, Math.abs(ex - xb), Math.max(PX, snap(th * .5)));
          cx.fillStyle = fc(mixc('#3a3a2c', moonCol, .15), fog); FR(Math.min(xb, ex), y, Math.abs(ex - xb), th); continue; }
        if(rail){ poly(xa, q.ay, ex, q.ay, ex, q.by - Math.max(PX, q.bw * .05), xb, q.by - Math.max(PX, q.bw * .05), fc(RC.ball, fog)); continue; }
        const th = Math.max(PX, snap(q.aw * .045)), y = snap(q.by);
        cx.fillStyle = fc(RC.azeR, fog); FR(Math.min(xb, ex), y, Math.abs(ex - xb), th);
        cx.fillStyle = fc(RC.aze, fog); FR(Math.min(xb, ex), y - th, Math.abs(ex - xb), th);
        cx.fillStyle = fc(mixc(RC.azeT, moonCol, .2), fog); FR(Math.min(xb, ex), y - th, Math.abs(ex - xb), PX); } }
    // the railway's two rails, glinting, and sleepers near
    for(let n = NQ - 1; n >= 0; n--){ const q = Q[n], rc = crc(q.s.index); if(rc !== CROSS && rc !== CROSS + 3) continue;
      const y = snap(q.by - Math.max(PX, q.bw * .05)), t2 = Math.max(PX, snap(q.aw * .012));
      for(const sd of [-1, 1]){ if(!ok(q, sd)) continue; const xb = q.bx + sd * q.bw * SHO, ex = sd < 0 ? 0 : W; cx.fillStyle = fc(RC.railC, q.fog); FR(Math.min(xb, ex), y - t2, Math.abs(ex - xb), t2); } }
    WM = false;
    cx.restore();
    // the kerb: a low concrete edge the bike can't cross; top face lit, the road-facing face in shade
    for(let n = NQ - 1; n >= 0; n--){ const q = Q[n], rc = crc(q.s.index); if(rc >= CROSS - 1 && rc <= CROSS + 4) continue; const kha = Math.max(PX * .5, q.aw * .05), khb = Math.max(PX * .5, q.bw * .05), lit = q.s.padLit || 0;
      for(const sd of [-1, 1]){ if(!ok(q, sd)) continue; const a0 = q.ax + sd * q.aw * KB[0], a1 = q.ax + sd * q.aw * KB[1], b0 = q.bx + sd * q.bw * KB[0], b1 = q.bx + sd * q.bw * KB[1];
        poly(a0, q.ay, a0, q.ay - kha, b0, q.by - khb, b0, q.by, fc(lit > .1 ? '#7a7c86' : '#5c5e68', q.fog));
        poly(a0, q.ay - kha, a1, q.ay - kha, b1, q.by - khb, b0, q.by - khb, fc(q.s.stripe ? '#b4b6be' : '#a4a6b0', q.fog)); } }
  }

  /* The jump's railway across the fields: the same line the jump draws in the gap (ballast over the middle three fifths of the segment,
     two rails at .34 and .64, its colours softened as the jump softens them), here as a low embankment from each bank foot to the screen
     edge: a shaded face toward the camera, the ballast top, sleepers near by, the rails with a moonlit top row. */
  const JRC = { face:'#161214', ball:'#3a3430', ballT:'#4a4440', slp:'#241e1a', rail:'#9a9aa8', railT:'#d0d4e0' };
  function jRailQ(q, moonCol){ const fog = q.fog * .3, Y = f => q.ay + (q.by - q.ay) * f, dy = q.ay - q.by; if(dy < .5) return;
    for(const sd of [-1, 1]){ if(!ok(q, sd)) continue; const ex = sd < 0 ? -PX : W + PX, X = f => q.ax + sd * q.aw * q.xw + (q.bx + sd * q.bw * q.xw - q.ax - sd * q.aw * q.xw) * f;
      const band = (f0, f1, col) => { const y0 = snap(Y(f1)), y1 = Math.max(y0 + PX, snap(Y(f0))), x0 = X((f0 + f1) / 2); cx.fillStyle = col; FR(Math.min(x0, ex), y0, Math.abs(ex - x0), y1 - y0); };
      band(.12, .2, fc(JRC.face, fog)); band(.2, .8, fc(JRC.ball, fog)); if(dy > PX * 6) band(.76, .8, fc(mixc(JRC.ballT, moonCol, .15), fog));
      if(dy > PX * 5){ const y0 = snap(Y(.72)), y1 = snap(Y(.26)), x0 = X(.5), st = Math.max(PX * 3, snap(q.aw * .09)); cx.fillStyle = fc(JRC.slp, fog);   // sleepers (world-anchored to the bank foot)
        for(let x = x0 + sd * st * .5; sd < 0 ? x > -PX : x < W + PX; x += sd * st) FR(snap(x), y0, Math.max(PX, snap(st * .35)), Math.max(PX, y1 - y0)); }
      for(const [f0, f1] of [[.32, .36], [.62, .66]]){ band(f0, f1, fc(JRC.rail, fog)); if(dy > PX * 4){ const y = snap(Y(f1)), x0 = X(f1); cx.fillStyle = fc(JRC.railT, fog); FR(Math.min(x0, ex), y, Math.abs(ex - x0), PX); } } } }

  // ---------------------------------------------------------------- reflections (drawn inside the water clip)
  const mdir = x => MOON.x > x ? 1 : -1;
  // draw a reflection image below (x, y), cut off where its road-side edge would leave the water; fl mirrors it left-right
  function reflImg(r, x, y, k, fl, side){ const w = r.width * k, edge = x - side * w * .45, h = wetDepth(edge, y, r.height * k); if(h < PX) return;
    const sh = Math.max(1, Math.min(r.height, Math.ceil(h / k))), x0 = Math.round(x - w / 2), y0 = Math.round(y);
    if(fl){ cx.save(); cx.translate(x, 0); cx.scale(-1, 1); cx.drawImage(r, 0, 0, r.width, sh, Math.round(-w / 2), y0, w, sh * k); cx.restore(); }
    else cx.drawImage(r, 0, 0, r.width, sh, x0, y0, w, sh * k); }
  const REFL = {
    pole(sp, x, y, uw, fog){ const dir = mdir(x), spr = pole(sp.v, dir), k = uw * PK / PH, r = reflOf(spr, 'pad_rpole' + sp.v + dir); cx.globalAlpha = 1 - fog * .8; reflImg(r, x, y, k, 0, Math.sign(sp.x));
      // the wires, mirrored
      const nx = segs[sp.k + POLE]; if(nx && nx.p1.camera.z > DEPTH && fog < .7){ const p = nx.p1.screen, k2 = p.w * PK / PH, x2 = p.x + sp.x * p.w; cx.fillStyle = '#1a2630';
        cx.beginPath(); for(const [ox, oy, sg] of WIRES) wire(cx, x + ox * k, y + oy * k, x2 + ox * k2, p.y + oy * k2, -sg * (uw + p.w) * .12);
        strokeW('#1a2630'); } cx.globalAlpha = 1;
      if(sp.v === 2) streak(x + 5.5 * k, y + (PH - 32) * k, uw * .9, Math.max(PX, uw * .05), '#c8f0e0', .45 * (1 - fog), sp.k); },
    farm(sp, x, y, uw, fog){ const dir = mdir(x), spr = farm(sp.v, dir), k = uw * 3.8 / FW, r = reflOf(spr, 'pad_rfarm' + sp.v + dir); cx.globalAlpha = 1 - fog * .8;
      const fl = sp.x > 0; reflImg(r, x, y - 8 * k, k, fl, Math.sign(sp.x)); cx.globalAlpha = 1;
      for(const [wx, wy] of FWIN[sp.v % 3]){ const px = x + (fl ? -1 : 1) * (wx - FW / 2) * k; streak(px, y + (FH - wy - 16) * k, uw * 1.5, Math.max(PX, 7 * k), '#ffb860', .8 * (1 - fog * .8), sp.k + wx); } },
    shrine(sp, x, y, uw, fog){ const dir = mdir(x), spr = shrine(dir), k = uw * 3.2 / SW, r = reflOf(spr, 'pad_rshrine' + dir); cx.globalAlpha = 1 - fog * .8; reflImg(r, x, y - 10 * k, k, 0, Math.sign(sp.x)); cx.globalAlpha = 1;
      streak(x + (48 - SW / 2) * k, y + 8 * k, uw * .7, Math.max(PX, 3 * k), '#ffc070', .5 * (1 - fog), sp.k); },
    bus(sp, x, y, uw, fog){ const k = uw * 1.9 / BW; streak(x + (sp.side < 0 ? 1 : -1) * (17 - BW / 2) * k, y + 2 * k, uw * .8, Math.max(PX, 6 * k), '#d8f0ff', .35 * (1 - fog), sp.k); },
    xing(sp, x, y, uw, fog, now){ const k = uw * 1.5 / CH, on = xOn(now); for(let j = 0; j < 2; j++){ if(!on[j]) continue; const lx = x + sp.side * (XLAMP[j][0] - CW / 2) * k * -1; streak(lx, y + (CH - 42) * k, uw * 1.3, Math.max(PX, 4 * k), '#ff3a30', .9 * (1 - fog * .8), sp.k + j); } },
    crow(sp, x, y, uw, fog){ const dir = mdir(x), spr = crow(dir), k = uw * .7 / 24, r = reflOf(spr, 'pad_rcrow' + dir); cx.globalAlpha = 1 - fog * .8; reflImg(r, x, y, k, 0, Math.sign(sp.x)); cx.globalAlpha = 1; },
    // the new buildings: their lit windows and lamps doubled in the water as broken columns
    bld(sp, x, y, uw, fog){ if(fog > .35) return; const rel = sp.k - sp.b0;
      if(sp.kind === 0 && rel % 3 === 1 && hash(sp.n * 7.7) > .2 && hash(sp.n * 3.3 + rel) > .35) streak(x - Math.sign(sp.x) * uw * .3, y + uw * .3, uw * 1.1, Math.max(PX, uw * .12), '#ffb860', .55 * (1 - fog), sp.k);
      if(sp.kind === 3 && rel === 0) streak(x - Math.sign(sp.x) * uw * .2, y + uw * .3, uw * .9, Math.max(PX, uw * .1), '#c8f0e0', .5 * (1 - fog), sp.k);
      if(sp.kind === 5 && rel % 2 === 1) streak(x - uw * .1, y + uw * .25, uw * 1.1, Math.max(PX, uw * .1), '#d8f0ff', .55 * (1 - fog), sp.k);
      if(sp.kind === 2 && rel % 4 === 0) streak(x - Math.sign(sp.x) * uw * .2, y + uw * .4, uw, Math.max(PX, uw * .08), '#ffb050', .45 * (1 - fog), sp.k); },
    vendp(sp, x, y, uw, fog){ streak(x - uw * .2, y + uw * .2, uw * 1.2, Math.max(PX, uw * .2), '#d8f0ff', .6 * (1 - fog), sp.k); },
    torii(sp, x, y, uw, fog){ streak(x + (sp.side < 0 ? -1 : 1) * uw * .81, y + uw * .3, uw * .7, Math.max(PX, uw * .05), '#ffc070', .5 * (1 - fog), sp.k); },
    heron(sp, x, y, uw, fog){ const spr = heron(sp.v, sp.x > 0 ? -1 : 1), k = uw * .2 / spr.height, r = reflOf(spr, 'pad_rheron' + sp.v + (sp.x > 0 ? -1 : 1)); cx.globalAlpha = 1 - fog * .8; reflImg(r, x, y, k, 0, Math.sign(sp.x)); cx.globalAlpha = 1; },
    ball(sp, x, y, uw, fog){ const dir = mdir(x), spr = balloon(dir), k = uw * .62 / spr.height, r = reflOf(spr, 'pad_rball' + dir); cx.globalAlpha = 1 - fog * .8; reflImg(r, x, y, k, 0, Math.sign(sp.x)); cx.globalAlpha = 1; },
    hasa(sp, x, y, uw, fog){ const dir = mdir(x), v = sp.k % 2, spr = hasa(v, dir), k = uw * 1.9 / 36, r = reflOf(spr, 'pad_rhasa' + v + dir); cx.globalAlpha = 1 - fog * .8; reflImg(r, x, y - k, k, 0, Math.sign(sp.x)); cx.globalAlpha = 1; }
  };
  // a sagging wire drawn as whole pixels (a catenary approximated by a parabola)
  // a sagging wire as a short polyline (a catenary approximated by a parabola), stroked one canvas pixel wide
  // wires: queued as whole-pixel steps (no paths, no strokes, no allocation) and filled with plain rects
  const WQ = new Float32Array(16000); let WN = 0;
  function wire(_, x1, y1, x2, y2, sag){ const n = Math.min(24, Math.max(3, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1) + Math.abs(sag)) / (PX * 3))));
    let px = snap(x1), py = snap(y1); for(let j = 1; j <= n && WN < WQ.length - 4; j++){ const t = j / n, x = snap(x1 + (x2 - x1) * t), y = snap(y1 + (y2 - y1) * t + sag * 4 * t * (1 - t));
      WQ[WN++] = Math.min(px, x); WQ[WN++] = Math.min(py, y); WQ[WN++] = Math.max(PX, Math.abs(x - px)); WQ[WN++] = Math.max(PX, Math.abs(y - py) * .6 + PX * .4); px = x; py = y; } }
  const strokeW = col => { cx.fillStyle = col; for(let j = 0; j < WN; j += 4) FR(WQ[j], WQ[j + 1], WQ[j + 2], WQ[j + 3]); WN = 0; };
  // crossing lamps alternate, about 50 flashes a minute each; with reduced motion both glow steadily
  const xOn = now => reduce ? [1, 1] : (Math.floor(now / 600) % 2 ? [1, 0] : [0, 1]);

  // ---------------------------------------------------------------- round 2 (2026-11-24): shimmer columns, the new dressing
  /* Sprites authored as pixel grids (one letter a pixel), from the references at pixel zoom: a great egret (daisagi) standing in a planted
     paddy (Commons, Niigata and Tsuruga paddies: white S-neck, yellow bill, black legs, the body held level); a medama bird-scare balloon on
     a bamboo pole (yellow ball, a black, red and black target eye); a 1980s cab-over kei truck seen from the side, its side gates down and
     sacks in the bed; a sugi cedar of a shrine grove (layered tiers, darkest under each). */
  function grid(key, rows, map, dir){ const h = rows.length, w = rows[0].length; return procSprite('pad_' + key + (dir > 0 ? 'R' : 'L'), w, h, (x, y) => { const c = rows[y][dir > 0 ? x : w - 1 - x]; return c === '.' ? null : map[c] || null; }); }
  const HERON = ['......WW....', '.....WWWyyy.', '......WW....', '......W.....', '.....W......', '.....W......', '......W.....', '......WW....', '....SWWWW...', '...SWWWWWW..',
    '..SSWWWWWWW.', '..SSSWWWWWW.', '...SSSWWWW..', '....SSSSs...', '......L.L...', '......L.L...', '......L.L...', '......L.L...', '......L.L...', '.....LL.LL..'];
  const HERON2 = ['............', '............', '.....WW.....', '....WWWW....', '....WWyyy...', '.....W......', '....SWWWW...', '...SWWWWWW..', '..SSWWWWWWW.', '..SSSWWWWWW.',
    '...SSSWWWW..', '....SSSSs...', '.......L....', '.......L....', '.......L....', '.......L....', '.......L....', '.......L....', '.......L....', '......LL....'];   // the second pose: neck drawn in, on one leg
  const HMAP = { W:'#d0d4e2', S:'#868ea6', s:'#5a6278', y:'#c8a038', L:'#202228' };
  const heron = (v, dir) => grid('heron' + v, v ? HERON2 : HERON, HMAP, dir);
  const BALL = ['..YYYYY..', '.YyKKKYY.', 'YyKRRRKYY', 'YKRKKKRKY', 'YKRKWKRKY', 'YKRKKKRKY', 'YYKRRRKYY', '.YYKKKYY.', '..YYYYY..', '....b....', '....B....', '....B....', '....b....', '....B....', '....B....',
    '....B....', '....n....', '....B....', '....B....', '....B....', '....B....', '....n....', '....B....', '....B....', '....B....', '....B....', '....B....', '....n....', '....B....', '....B....'];
  const BMAP = { Y:'#d8b830', y:'#fff0a0', K:'#121216', R:'#c02822', W:'#f0f0e8', B:'#5a6236', b:'#7a8048', n:'#2a2e1a' };
  const balloon = dir => grid('ball', BALL, BMAP, dir);
  const KEI = ['..WWWWW.....................', '.WGGgGWW....................', '.WGGGGWWW...................', 'WWWWWWWWWSSSSSSSSSSSSSSSSSS.', 'WWWWWWWWWSsKKsKKKssKKsssssS.',
    'wWWWWWWWWSSSSSSSSSSSSSSSSSS.', 'DDDDDDDDDDDDDDDDDDDDDDDDDDDr', '...TTT..............TTT.....', '..TTtTT............TTtTT....', '...TTT..............TTT.....'];
  const KMAP = { W:'#c4c8d2', G:'#18222e', g:'#8a9ab0', S:'#9aa0aa', s:'#646a76', K:'#b4a47c', D:'#18181c', T:'#0a0a0c', t:'#4a4a50', w:'#d8d8c4', r:'#a01818' };
  const kei = dir => grid('kei', KEI, KMAP, dir);
  // a sugi of the shrine grove: tiers of dark foliage, each lit along its top edge on the moon's side
  const sugi = (v, dir) => bake('sugi' + v, 13, 44, (x, y) => { const c = 6.5 + (v ? .5 : 0), t = y % 6, tier = (y / 6) | 0; if(y >= 37) return Math.abs(x + .5 - c) < 1.1 ? 3 : 0;
    const hw = 1 + y * .13 + t * .32 + (hash(tier * 3.1 + v) - .5) * .8; return Math.abs(x + .5 - c) < hw ? (hash(x * 1.7 + y * 3.1 + v) > .8 ? 104 : 4) : 0; }, dir);
  // the shimmer columns: a light doubled in the water is a vertical column of short dashes running down it (palette cycling, ui/cycle.js:
  // eight slots rotate a step every 110 ms, so the dashes flow; one drawImage of the frame a light). Four colours: warm windows, cool tubes,
  // the crossing's red, sodium. A column narrows and dims with depth and breaks where a row of seedlings or a levee crosses it.
  const SCW = 8, SCH = 128, SCOL = ['#ffb860', '#d8f0ff', '#ff3a30', '#ffb050'];
  let SCY = null;
  function shimmerBake(){ if(SCY || !window.CYCLE) return; SCY = [];
    for(const col of SCOL){ const idx = new Uint8Array(SCW * SCH), [R, G, B] = hx(col);
      for(let y = 0; y < SCH; y++){ const m = y / SCH, hw = (SCW / 2) * (1 - m * .55) * (.75 + hash(y * 1.7) * .35), slot = 1 + ((y + (hash(y >> 2) * 3 | 0)) % 8);
        for(let x = 0; x < SCW; x++){ const dx = Math.abs(x + .5 - SCW / 2); if(dx > hw) continue; idx[y * SCW + x] = dx < hw * .45 ? slot : 8 + slot; } }
      const pal = [null]; for(const k of [1, .75, .4, .15, 0, 0, .3, .6]) pal.push([R, G, B, Math.round(255 * k)]); for(const k of [.55, .35, .15, 0, 0, 0, .12, .3]) pal.push([R, G, B, Math.round(255 * k)]);
      SCY.push(CYCLE.make({ w:SCW, h:SCH, idx, pal, ranges:[[1, 8, 1], [9, 16, 1]], ms:110, still:1 })); } }
  const SCI = new Map([['#ffb860', 0], ['#ffc070', 0], ['#ffb050', 3], ['#c8f0e0', 1], ['#d8f0ff', 1], ['#ff3a30', 2]]);
  // a shimmer column at x from y0 down, len long, wd wide (screen units); trimmed to the water under it
  function column(x, y0, len, wd, col, a){ const c = SCY && SCY[SCI.has(col) ? SCI.get(col) : 0]; if(!c) return false;
    const L = wetDepth(x, y0, Math.min(len, SCH * PX)); if(L < PX * 2) return true; const cols = Math.max(1, Math.min(SCW, Math.round(wd / PX))), rows = Math.max(2, Math.round(L / PX));
    cx.globalCompositeOperation = 'lighter'; const ga = cx.globalAlpha; cx.globalAlpha = Math.min(1, a);
    c.draw(cx, LNOW, snap(x - cols * PX / 2), snap(y0), cols * PX, rows * PX, (SCW - cols) >> 1, 0, cols, rows);
    cx.globalAlpha = ga; cx.globalCompositeOperation = 'source-over'; return true; }
  // fireflies: a swarm sprite whose points blink out of phase by palette cycling (each point its own place on a 12-slot ring); its
  // reflection under it, dimmer. Two sizes: a near swarm spread wide, a far one tight. One drawImage a swarm.
  let FFC = null;
  function ffBake(){ if(FFC || !window.CYCLE) return; FFC = [];
    for(const [w, h, n] of [[40, 28, 9], [14, 10, 4]]){ const idx = new Uint8Array(w * h), wl = (h * .62) | 0;
      for(let j = 0; j < n; j++){ const x = (hash(j * 3.3 + w) * (w - 2) | 0) + 1, y = (hash(j * 5.7 + w) * (wl - 3) | 0) + 1, s = 1 + (j * 5) % 12; idx[y * w + x] = s;
        const ry = wl + (wl - y) * .4 | 0; if(ry < h) idx[ry * w + x] = 12 + s; }
      const pal = [null]; for(let k = 0; k < 12; k++) pal.push(k < 2 ? '#eaff9a' : k === 2 ? '#a8d870' : [0, 0, 0, 0]); for(let k = 0; k < 12; k++) pal.push(k < 2 ? [168, 216, 112, 110] : [0, 0, 0, 0]);
      FFC.push(CYCLE.make({ w, h, idx, pal, ranges:[[1, 12, 1], [13, 24, 1]], ms:150, still:0 })); } }

  // ---------------------------------------------------------------- sprite drawing
  function drawDeli(sp, x, y, uw, fog){ if(fog > .8) return; const w = Math.max(PX, snap(uw * .022)), h = uw * .3, a = 1 - fog * .5;
    cx.globalAlpha = a; cx.fillStyle = fc('#d8dce4', fog); cx.fillRect(snap(x - w / 2), snap(y - h), w, snap(h)); if(w > PX){ cx.fillStyle = fc('#7a808c', fog); cx.fillRect(snap(x - w / 2) + (x < W / 2 ? w - PX : 0), snap(y - h), PX, snap(h)); }
    const near = clamp(1.25 - fog * 3, 0, 1), rs = Math.max(PX, snap(w)); cx.fillStyle = near > .6 ? '#ffe0a0' : near > .3 ? '#ffb050' : '#c86a24'; cx.fillRect(snap(x - w / 2), snap(y - h + rs), rs, rs * 2); cx.globalAlpha = 1;
    if(near > .3 && uw > 18) gl(x, y - h + rs * 2, uw * .12, '#ffb050', .45 * near); }
  function drawPole(sp, x, y, uw, fog, now){ const dir = mdir(x), spr = pole(sp.v, dir), k = uw * PK / PH, a = 1 - fog * .75;
    // up close the pole is drawn as grid rects (crisp at any size), so it stays as it passes the camera instead of fading (it used to be a
    // sprite that grew into an 18-px-a-pixel slab, so it was faded out); further off, the sprite
    const nf = 1; if(x > -uw && x < W + uw){ cx.globalAlpha = a; if(k > PX * 1.5) poleRects(sp, x, y, uw, fog, k); else blit(spr, x, y, k); cx.globalAlpha = 1; }
    const nx = segs[sp.k + POLE], pv = segs[sp.k - POLE]; cx.beginPath();
    if(nx && nx.p1.camera.z > DEPTH){ const p = nx.p1.screen, k2 = p.w * PK / PH, x2 = p.x + sp.x * p.w; for(const [ox, oy, sg] of WIRES) wire(cx, x + ox * k, y - oy * k, x2 + ox * k2, p.y - oy * k2, sg * (uw + p.w) * .12); }
    // the span coming from behind the camera: extend away from the next pole and off the screen
    if(pv && pv.p1.camera.z <= DEPTH * 1.2 && nx){ const p = nx.p1.screen, k2 = p.w * PK / PH, x2 = p.x + sp.x * p.w; for(const [ox, oy, sg] of WIRES){ const ax = x + ox * k, ay = y - oy * k, bx = x2 + ox * k2, by = p.y - oy * k2; wire(cx, ax, ay, ax + (ax - bx) * 4, ay + (ay - by) * 4 - uw * .3 * sg, uw * .5 * sg); } }
    cx.globalAlpha = a; strokeW(fc('#0a0e14', fog * .6)); cx.globalAlpha = 1;
    if(sp.v === 2){ const lx = x + 5.5 * k, ly = y - (PH - 32) * k; gl(lx, ly, uw * .5, '#c8ffe8', .45 * a * nf); pool(lx, y + uw * .05, uw * .9, uw * .14, '#b8e8d8', .3 * a); }
    if(sp.v === 1 && fog < .5 && Math.floor(now / 900 + sp.k) % 7 === 0){ /* nothing: transformers stay dark */ } }
  function drawFarm(sp, x, y, uw, fog, now){ const dir = mdir(x), spr = farm(sp.v, dir), k = uw * 3.8 / FW, a = 1 - fog * .7, fl = sp.x > 0;
    if(x < -FW * k || x > W + FW * k) return; cx.globalAlpha = a;
    { const [s2, k2] = padArtK(spr, k); if(fl){ cx.save(); cx.translate(x, 0); cx.scale(-1, 1); blit(s2, 0, y, k2); cx.restore(); } else blit(s2, x, y, k2); } cx.globalAlpha = 1;
    for(const [wx, wy] of FWIN[sp.v % 3]) gl(x + (fl ? -1 : 1) * (wx - FW / 2) * k, y - (FH - wy) * k, 9 * k + PX, '#ffb860', .45 * a); }
  function drawBus(sp, x, y, uw, fog, now){ const spr = bus(mdir(x)), k = uw * 1.9 / BW, a = 1 - fog * .6, fl = sp.side > 0, vx = x + (fl ? -1 : 1) * (42.5 - BW / 2) * k;
    pool(x + (fl ? -1 : 1) * (17 - BW / 2) * k, y, uw * .6, uw * .12, '#d0ecff', .3 * a);
    cx.globalAlpha = a * scaleFade(k); if(fl){ cx.save(); cx.translate(x, 0); cx.scale(-1, 1); blit(spr, 0, y, k); cx.restore(); } else blit(spr, x, y, k); cx.globalAlpha = 1;
    gl(x + (fl ? -1 : 1) * (17 - BW / 2) * k, y - 30 * k, uw * .3, '#d8f0ff', .3 * a); }
  function drawXing(sp, x, y, uw, fog, now){ const k = uw * 1.5 / CH, R = k >= PX * 4 ? 4 : k >= PX * 2 ? 2 : 1, spr = R > 1 ? xingHi(mdir(x), R) : xing(mdir(x)), kr = k / R, a = (1 - fog * .6) * scaleFade(kr), fl = sp.side > 0; if(a <= 0) return;
    cx.globalAlpha = a; if(fl){ cx.save(); cx.translate(x, 0); cx.scale(-1, 1); blit(spr, 0, y, kr); cx.restore(); } else blit(spr, x, y, kr); cx.globalAlpha = 1;
    const on = xOn(now), sz = Math.max(PX, snap(2.6 * k));
    for(let j = 0; j < 2; j++){ if(!on[j]) continue; const lx = x + (fl ? -1 : 1) * (XLAMP[j][0] - CW / 2) * k, ly = y - (CH - XLAMP[j][1]) * k;
      if(sz > PX * 3){ xDisc(lx, ly, sz / 2, '#ff4a3a'); xDisc(lx - sz * .08, ly - sz * .08, sz * .3, '#ff9a7a'); cx.fillStyle = '#ffe8d8'; cx.fillRect(snap(lx - sz * .22), snap(ly - sz * .22), PX, PX); }   // near by a round lit lens, not a square
      else { cx.fillStyle = '#ff4a3a'; cx.fillRect(snap(lx - sz / 2), snap(ly - sz / 2), sz, sz); cx.fillStyle = '#ffd0b0'; cx.fillRect(snap(lx - sz / 2), snap(ly - sz / 2), Math.max(PX, snap(sz / 2)), Math.max(PX, snap(sz / 2))); }
      gl(lx, ly, uw * .35, '#ff3a2a', .55 * a); pool(lx, y, uw * .5, uw * .1, '#ff3020', .35 * a); } }
  function drawShrine(sp, x, y, uw, fog, now){ const spr = shrine(mdir(x)), k = uw * 3.2 / SW, a = (1 - fog * .7) * scaleFade(k); if(a <= 0 || x < -SW * k || x > W + SW * k) return;
    cx.globalAlpha = a; blit(spr, x, y, k); cx.globalAlpha = 1; const fl = reduce ? 1 : .9 + .1 * Math.sin(now / 90 + sp.k) * Math.sin(now / 37);
    gl(x + (48 - SW / 2) * k, y - (SH - 43) * k, 10 * k + PX, '#ffb060', .5 * a * fl); }
  function drawSmall(spr, s0, sp, x, y, uw, fog){ const k = uw * s0 / spr.height; cx.globalAlpha = 1 - fog * .75; blit(spr, x, y, k); cx.globalAlpha = 1; }
  function drawFF(sp, x, y, uw, fog, now){ if(fog > .5 || uw < 5) return; const a = 1 - fog * 1.6, sz = Math.max(PX, snap(uw * .014));
    for(let j = 0; j < 5; j++){ const h = hash(sp.k * 7 + j * 3.3), ph = now / (1400 + h * 900) + h * 20, bl = reduce ? .6 : Math.max(0, Math.sin(ph * 2.1)) ** 2;
      if(bl < .08) continue; const fx = x + (hash(sp.k + j * 5.1) - .5) * uw * 1.6 + (reduce ? 0 : Math.sin(ph) * uw * .08), ht = uw * (.06 + h * .3) + (reduce ? 0 : Math.cos(ph * 1.3) * uw * .03);
      cx.globalAlpha = a * bl; cx.fillStyle = '#e6ff9a'; cx.fillRect(snap(fx), snap(y - ht), sz, sz);
      cx.globalAlpha = a * bl * .45; cx.fillStyle = '#a8d870'; cx.fillRect(snap(fx), snap(y + ht), sz, sz); cx.globalAlpha = 1;
      if(uw > 40) gl(fx, y - ht, uw * .05, '#b8ff60', .35 * a * bl); } }
  function drawTape(sp, x, y, uw, fog, now){ if(fog > .5) return; const a = 1 - fog * 1.6, xc = x - sp.x * uw, s = sp.side, h = uw * .5, pw = Math.max(PX, snap(uw * .018)), xa = xc + s * sp.X0 * uw, xb = xc + s * sp.X1 * uw;
    if(Math.max(xa, xb) < -PX || Math.min(xa, xb) > W + PX) return; cx.globalAlpha = a; cx.fillStyle = fc('#5a6236', fog); cx.fillRect(snap(xa), snap(y - h), pw, snap(h)); cx.fillRect(snap(xb), snap(y - h), pw, snap(h));
    // the kira-kira tape: a sagging line of silver and red, its pieces catching the moon in turn as it twists in the wind
    const n = Math.max(4, Math.min(24, Math.round(Math.abs(xb - xa) / (PX * 3)))), tk = reduce ? 0 : Math.floor(now / 180), th = Math.max(PX, snap(uw * .008));
    for(let j = 0; j < n; j++){ const t = (j + .5) / n, gx = xa + (xb - xa) * t, gy = y - h * .92 + h * .18 * 4 * t * (1 - t), g = hash(sp.k * 3.1 + j * 7.7 + tk * .37);
      cx.fillStyle = g > .82 ? '#f4f8ff' : j % 2 ? '#b02a2a' : '#8a8e9c'; cx.fillRect(snap(gx), snap(gy), Math.max(PX, snap(Math.abs(xb - xa) / n * .8)), th); }
    cx.globalAlpha = 1; }
  function drawFF2(sp, x, y, uw, fog, now){ if(!FFC) return drawFF(sp, x, y, uw, fog, now); if(fog > .5 || uw < 5) return; const c = FFC[uw > 60 ? 0 : 1], k = uw > 60 ? Math.max(1, Math.round(uw / 160)) : 1;
    const ga = cx.globalAlpha; cx.globalAlpha = ga * (1 - fog * 1.6); cx.globalCompositeOperation = 'lighter'; c.draw(cx, now + sp.k * 397, snap(x - c.w * PX * k / 2), snap(y - c.h * .62 * PX * k), c.w * PX * k, c.h * PX * k);
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga; }
  const DRAW = { deli:drawDeli, tick:() => {}, pole:drawPole, bld:bldSlice, rack:rackSlice, torii:drawTorii, vendp:drawVendP, farm:drawFarm, bus:drawBus, xing:drawXing, shrine:drawShrine, ff:drawFF2, tape:drawTape,
    crow:(sp, x, y, uw, fog) => drawSmall(crow(mdir(x)), .7, sp, x, y, uw, fog),
    jizo:(sp, x, y, uw, fog) => drawSmall(jizo(mdir(x)), .22, sp, x, y, uw, fog),
    hasa:(sp, x, y, uw, fog) => drawSmall(hasa(sp.k % 2, mdir(x)), 1.9, sp, x, y, uw, fog),
    heron:(sp, x, y, uw, fog) => drawSmall(heron(sp.v, sp.x > 0 ? -1 : 1), .2, sp, x, y, uw, fog),
    ball:(sp, x, y, uw, fog) => drawSmall(balloon(mdir(x)), .62, sp, x, y, uw, fog),
    kei:(sp, x, y, uw, fog) => drawSmall(kei(sp.x > 0 ? 1 : -1), .3, sp, x, y, uw, fog),
    sugi:(sp, x, y, uw, fog) => drawSmall(sugi(sp.k % 2, mdir(x)), 2.4, sp, x, y, uw, fog) };

  // ---------------------------------------------------------------- projected farm buildings (2026-11-19, biome polish)
  /* Snow Onsen's way, not billboards: each building is a run of road segments; every segment draws one slice of its face parallel to the
     road (footing, wall, posts, lit shoji or boards or shutters, the eave) and of its roof leaning back from the road; the end that faces
     the camera is drawn at the run's first segment as real quads (end wall, hip, the small irimoya gable). Far away one slice spans up to 5
     segments. All of it lands on the pixel grid through poly(), so nothing turns into upscaled blocks as it passes beside you.
     Studied (Commons photos: minka in Shirakawa-go and Tono, Niigata farmhouses with hipped irimoya kawara roofs, rusted corrugated-tin
     nōka sheds, JA-style concrete rice warehouses, unmanned rural stations on the Iiyama and Tadami lines, hasa-kake racks in Niigata):
     - the irimoya roof is a hip whose top third turns into a small gable; dark kawara with a pale moonlit ridge and a heavy eave shadow;
     - plaster walls between dark posts, shoji lit warm from inside, an engawa board at floor height;
     - tin sheds: ribbed rust or faded blue roofs, plank walls, one bare bulb over a sliding door;
     - the warehouse: a long low concrete box, roller shutters, a green band with its name, a single sodium lamp;
     - the station: a small wooden shelter with a white name board and a fluorescent tube.
     Kind table: wall height hW and ridge hR in half-road widths, depth D back from the face, roof style. */
  const BK = [
    { D:1.8, hW:.62, hR:1.6, ov:.3, roof:'iri', wall:'#4a4e62', top:['#161c2a', '#1c2434', '#232c3e', '#2c3850'], rib:'#0e121c', rim:'#7a88a8', hip:3 },   // 0 minka (farmhouse)
    { D:1.2, hW:.66, hR:1.12, ov:.14, roof:'gab', wall:'#2a2026', top:['#4a2218', '#5a2a1e', '#6a3222', '#7a3a26'], rib:'#2e140e', rim:'#b87a5a', hip:0 },   // 1 tin barn
    { D:1.9, hW:.95, hR:1.18, ov:.08, roof:'gab', wall:'#4c5264', top:['#2e3442', '#343a4a', '#3a4252', '#444c5e'], rib:'#22262e', rim:'#8a94ac', hip:0 },  // 2 co-op warehouse
    { D:.8, hW:.52, hR:.8, ov:.18, roof:'gab', wall:'#3a2c26', top:['#22283a', '#283044', '#2e3650', '#36405a'], rib:'#161a26', rim:'#7a849c', hip:0 },     // 3 station shelter
    { D:.55, hW:.3, hR:.56, ov:.1, roof:'gab', wall:'#5a2a20', top:['#141a28', '#1a2232', '#20293c', '#283248'], rib:'#0c1018', rim:'#6a7894', hip:0 },     // 4 hokora (shrine hall)
    { D:.14, hW:.36, hR:.38, ov:.02, roof:'flat', wall:'#d8dce4', top:['#9aa0ac', '#9aa0ac', '#9aa0ac', '#9aa0ac'], rib:'#6a7080', rim:'#e8ecf4', hip:0 }   // 5 vending machines (3 in a row)
  ];
  // the thatched farmhouse (kayabuki): the minka's frame under a thick straw roof, moss on it, a deeper eave
  const BKT = Object.assign({}, BK[0], { ov:.38, hR:1.72, top:['#16120e', '#1e1914', '#28211a', '#322a20'], rib:'#0a0806', rim:'#8a7e60', thatch:true });
  let MA = 1, MU0 = 0;   // the current slice's material overlay strength (fades out with distance) and its texture offset in segments
  // a colour sunk toward the night's ink, cached (one map per amount): the slices ask for these every frame
  const DKQ = new Map(); function dkc(c, t){ let m = DKQ.get(t); if(!m){ m = new Map(); DKQ.set(t, m); } let v = m.get(c); if(v === undefined){ v = mixc(c, '#05070c', t); m.set(c, v); } return v; }
  const BSPAN = f => f > .45 ? 8 : f > .26 ? 6 : f > .14 ? 4 : f > .05 ? 2 : 1;
  /* Span LOD without holes (the scheme of env/snow.js and env/pass.js, after the hills agent's RCA, 2026-11-24): every segment's span comes
     from its own distance (b0, the camera's segment, recovered from this segment's fog); a slice starts where its own span divides its place
     in the run and runs on to the next start. It used to run to the next multiple of the start's own span: where the tiers change, a nearer
     start's short span stopped one to four segments before the next start, and that gap in the buildings and racks slid with the camera.
     Returns the slice's length in segments, or 0 if this segment is not a start. */
  function spanRun(sp, fog){ const i = sp.k, b0 = i - Math.round(DRAW_N * Math.pow(fog, 1 / 1.6)), at = j => BSPAN(clamp(Math.pow((j - b0) / DRAW_N, 1.6), 0, 1)), end = sp.b0 + sp.len;
    if((i - sp.b0) % at(i)) return 0; let e = i + 1; while(e < i + 8 && e < end && (e - sp.b0) % at(e)) e++; return Math.min(e, end) - i; }
  // a point at lateral offset L (half-road widths, outward from the road centre) and height h, a fraction t along a slice
  let SX0 = 0, SY0 = 0, SU0 = 0, SX1 = 0, SY1 = 0, SU1 = 0, SSD = 1;
  const px_ = (L, h, t) => SX0 + (SX1 - SX0) * t + SSD * L * (SU0 + (SU1 - SU0) * t), py_ = (L, h, t) => SY0 + (SY1 - SY0) * t - h * (SU0 + (SU1 - SU0) * t), pu_ = t => SU0 + (SU1 - SU0) * t;
  // a quad from (L0, h0) to (L1, h1) across, between fractions ta and tb along the slice
  function BQ(L0, h0, L1, h1, ta, tb, col){ poly(px_(L0, h0, ta), py_(L0, h0, ta), px_(L0, h0, tb), py_(L0, h0, tb), px_(L1, h1, tb), py_(L1, h1, tb), px_(L1, h1, ta), py_(L1, h1, ta), col); }
  // a vertical post on the face at fraction t, wd half-road widths wide (at least a pixel)
  function BV(L, h0, h1, t, wd, col){ const xx = px_(L, 0, t), th = Math.max(PX, snap(pu_(t) * wd)); if(xx < -th || xx > W + th) return; const ya = py_(L, h1, t), yb = py_(L, h0, t); if(yb <= ya) return; cx.fillStyle = col; cx.fillRect(snap(xx - th / 2), snap(ya), th, Math.max(PX, snap(yb - ya))); }
  // a quad on the end plane (the run's first segment): lateral L0..L1, heights h0..h1
  function BE(L0, h0, L1, h1, col){ poly(px_(L0, h0, 0), py_(L0, h0, 0), px_(L1, h0, 0), py_(L1, h0, 0), px_(L1, h1, 0), py_(L1, h1, 0), px_(L0, h1, 0), py_(L0, h1, 0), col); }
  // a camera-facing grid rect at (L, h) on the end plane, w and h in half-road widths
  function BR(L, h, w, hh, col){ const u = SU0, x = px_(L, h, 0), y = py_(L, h, 0); cx.fillStyle = col; cx.fillRect(snap(x - w * u / 2), snap(y - hh * u), Math.max(PX, snap(w * u)), Math.max(PX, snap(hh * u))); }
  const add = (rgb, a) => 'rgba(' + rgb + ',' + Math.max(0, a).toFixed(3) + ')';
  // a cone of light from a lamp at (L, h) down to the ground, additive, and the pool it makes
  function cone(L, h, t, spread, rgb, a){ if(a <= .01 || SU0 < W * .03) return; cx.globalCompositeOperation = 'lighter'; const x = px_(L, h, t), y = py_(L, h, t), u = pu_(t), gx = px_(L, 0, t), gy = py_(L, 0, t);
    poly(x - u * .02, y, x + u * .02, y, gx + u * spread, gy, gx - u * spread, gy, add(rgb, a)); poly(gx - u * spread * 1.3, gy - u * .02, gx + u * spread * 1.3, gy - u * .02, gx + u * spread, gy + u * .03, gx - u * spread, gy + u * .03, add(rgb, a * 1.4)); cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- surface materials (2026-11-23, Kellan: "the textures / lack of textures on the buildings")
  /* Every wall, roof and footing of the projected buildings gets a detail overlay: a small tile of pixel art (transparent ground, dark and
     light marks) baked at warm-up in three sizes (96, 48 and 24 texels per half-road width), made a repeating pattern once, and laid on each
     slice with that slice's own pattern transform, so the texture is fixed to the building (it rides with it, it never swims) and keeps one
     texel at least an art pixel tall. The base colours, value bands and lines of the slices stay as they were; the overlay only adds the
     material. Studied at pixel zoom (Commons): a moss-grown kayabuki roof at Shirakawa (bundled straw in courses, lime moss in streaks down
     the slope, a heavy cut eave), a thatched farmhouse near Iiyama in 1971 (plaster panels between dark timbers, a splash band of mud at the
     foot, a stone footing), Setouchi yakisugi (charred sugi boards cracked into an alligator crust with a silver sheen on the scales), a
     boarded kura (vertical boards and battens, weathered paler at the foot), rusty corrugated tin (ribs lit and shaded in turn, rust running
     down from the nail rows and pooling at the eave).
     Wall tiles: u along the wall (1.6 half-roads a repeat), v down from 0.8 half-roads above the ground to the ground. Roof tiles: u along
     the eave, v from the ridge (0) to the eave (the tile's last row). */
  const MLOD = [96, 48, 24], MU = 1.6, MV = .8, RNV = [64, 32, 16];
  const MAT = {}, MOFF = PDX.includes('mat');   // name -> [{ cv, pat, k, nv }] per LOD
  const MM = (typeof DOMMatrix !== 'undefined') ? new DOMMatrix() : null;   // one matrix, rewritten for every slice (no allocation per frame)
  const vnz = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = (a, b) => ih(a * 7 + s, b * 13 + s * 3);
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
  // the painters: (x, y, k, w, h) -> [r, g, b, a] or null; k is texels per half-road width; for roofs h is the slope's rows
  const DK = [6, 6, 10], LT = [176, 182, 198];
  const PAINT = {
    // plaster: low mottling, rain stains running down from the eave, a few hairline cracks, the splash band of mud at the foot
    plaster(x, y, k, w, h){ const hh = MV - (y + .5) / k, X = x / k;
      if(hh < .075){ const g = ih(x, y + 7); if(g < .45 - hh * 3) return [24, 18, 14, 70 + (g * 90 | 0)]; }
      const st = vnz(X * 9, 0, 3), run = (MV - hh) * 1.8; if(st > .72 && ih(x >> 1, 91) < .8 && run < (st - .7) * 4) return [...DK, 34 + (st * 40 | 0)];
      const m = vnz(X * 14, hh * 14, 5); if(m < .3) return [...DK, (.3 - m) * 160 | 0]; if(m > .82 && ih(x, y) > .7) return [...LT, 26];
      if(ih(x * 3 + (y >> 2), 17) > .9975) return [...DK, 120];
      return null; },
    // vertical boards with battens: a dark joint, the batten's moonlit edge, grain, knots, nails at the girts, paler where the rain splashes
    boards(x, y, k, w, h){ const bw = Math.max(3, Math.round(.075 * k)), bx = x % bw, b = (x / bw) | 0, hh = MV - (y + .5) / k;
      if(bx === 0) return [4, 3, 3, 170]; if(bx === 1) return [...LT, 38]; if(bx === bw - 1) return [...DK, 60];
      if(Math.abs(hh - .34) < .5 / k && bx === 2) return [190, 190, 196, 120];
      const gr = ih(b * 31 + bx, 5); if(gr > .8 && ih(x, (y / 3) | 0) > .25) return [...DK, 46];
      const kn = ih(b, ((hh * 9) | 0) + 3); if(kn > .93 && Math.abs(bx - bw / 2) < 1.2 && ((hh * 9) % 1) < .12) return [8, 6, 6, 120];
      if(hh < .1) return [...LT, 20 + (ih(x, y) * 26 | 0)];
      return null; },
    // yakisugi: charred boards cracked into a crust of small scales, their tops catching the moon in a silver sheen
    yaki(x, y, k, w, h){ const bw = Math.max(3, Math.round(.075 * k)), bx = x % bw, b = (x / bw) | 0;
      if(bx === 0) return [0, 0, 0, 200]; if(bx === 1) return [150, 158, 176, 30];
      const cw = Math.max(2, Math.round(k / 40)), ch = Math.max(2, Math.round(k / 32)), ry = (y + (ih(b, (x / cw) | 0) * ch | 0));
      const cy = ry % ch, cx0 = (x + ((ry / ch | 0) % 2) * (cw >> 1)) % cw;
      if(cy === 0 || cx0 === 0) return [0, 0, 0, 150]; if(cy === 1 && ih(x, y) > .35) return [168, 176, 196, 40 + (ih(x * 3, y) * 30 | 0)];
      return null; },
    // corrugated tin on a wall: ribs lit and shaded in turn, rust running down from the nail rows, a rusted foot
    tinw(x, y, k, w, h){ const p = Math.max(3, Math.round(.035 * k)), rx = x % p, hh = MV - (y + .5) / k;
      const rs = vnz(x / p * .7, 0, 11), nail = Math.abs(((hh * 3) % 1) - .5) < .6 / k * 3;
      if(hh < .06 + rs * .05) return [128, 58, 26, 120];
      if(rs > .62 && ih((x / p) | 0, 3) > .4){ const len = (rs - .6) * 2.2; if(((MV - hh) % .33) < len) return [140, 64, 28, 90 + (rs * 60 | 0)]; }
      if(nail && rx === 1) return [200, 196, 190, 110];
      return rx === 0 ? [...LT, 46] : rx === p - 1 ? [...DK, 80] : null; },
    // concrete: form-panel joints, pour lines, rain-black streaks from the top, rust bled from the bolts
    concrete(x, y, k, w, h){ const X = x / k, hh = MV - (y + .5) / k;
      if(x % Math.round(.42 * k) === 0) return [...DK, 110]; if(Math.abs(((hh * 4) % 1)) < .5 / k * 4) return [...DK, 40];
      const st = vnz(X * 7, 0, 21); if(st > .6 && (MV - hh) < (st - .55) * 2.5) return [...DK, 40 + (st * 50 | 0)];
      if(ih(x >> 2, y >> 2) > .992) return [120, 60, 30, 90];
      const m = vnz(X * 20, hh * 20, 23); return m < .25 ? [...DK, (.25 - m) * 140 | 0] : null; },
    // a stone footing: rows of rough stones, dark mortar, a moonlit top edge on each stone
    stone(x, y, k, w, h){ const sh = Math.max(3, Math.round(.034 * k)), row = (y / sh) | 0, ry = y % sh, sw = Math.max(4, Math.round((.05 + ih(row, 3) * .05) * k)), off = (ih(row, 7) * sw) | 0;
      const sx = (x + off) % sw, si = ((x + off) / sw) | 0; if(ry === sh - 1 || sx === 0) return [2, 2, 4, 190];
      if(ry === 0) return [...LT, 60]; const g = ih(si * 17 + row, 9); if(ih(x, y) > .8) return g > .5 ? [...LT, 24] : [...DK, 50]; return g > .7 ? [...DK, 40] : null; },
    // shoji paper over a lit room: the kumiko grid, frame shadows, a few panes re-papered whiter, faint stains
    shoji(x, y, k, w, h){ const gx = Math.max(3, Math.round(.05 * k)), gy = Math.max(3, Math.round(.06 * k));
      if(x % gx === 0 || y % gy === 0) return [70, 40, 18, 200]; if(x % gx === 1 || y % gy === 1) return [40, 20, 8, 50];
      const pn = ih((x / gx) | 0, (y / gy) | 0); if(pn > .86) return [255, 250, 230, 60]; if(pn < .08) return [90, 60, 30, 40]; return null; },
    // kawara: courses with the shadow under each lip and the moonlit lip, round tiles up the slope, a stray paler tile
    kawara(x, y, k, w, h){ const cs = Math.max(3, Math.round(h / 13)), cy = y % cs, p = Math.max(3, Math.round(.036 * k)), rx = x % p;
      if(cy === cs - 1) return [0, 0, 2, 170]; if(cy === 0) return [150, 160, 186, 46];
      if(rx === 0) return [...DK, 90]; if(rx === 1) return [130, 140, 170, 30];
      if(ih(((x / p) | 0), (y / cs) | 0) > .96) return [120, 126, 150, 40]; return null; },
    // thatch: bundled straw laid in courses, strands down the slope, dark gaps, moss in patches and streaks
    thatch(x, y, k, w, h){ const cs = Math.max(4, Math.round(h / 7)), cy = y % cs, mo = vnz(x / k * 9, y / h * 3, 31), st = vnz(x / k * 6, 0, 33);   // moss grows in streaks down the slope
      if(mo > .62 || st > .7 && mo > .45){ const g = ih(x, y); return g > .7 ? [96, 120, 52, 150] : g > .35 ? [62, 84, 36, 150] : [40, 56, 26, 140]; }
      if(cy === cs - 1) return [4, 3, 2, 120];
      const sl = ih(x, (y + (ih(x, 1) * 5 | 0)) / 4 | 0); if(sl > .78) return [150, 130, 90, 46]; if(sl < .26) return [6, 4, 2, 90];
      return null; },
    // corrugated tin roof: ribs up the slope, rust from the ridge down and pooled along the eave
    tinr(x, y, k, w, h){ const p = Math.max(3, Math.round(.035 * k)), rx = x % p, f = y / h, rs = vnz(x / p * .5, 0, 41);
      if(f > .9 - rs * .1) return [130, 60, 28, 120]; if(rs > .6 && f < (rs - .55) * 3) return [140, 66, 30, 100];
      return rx === 0 ? [180, 170, 170, 40] : rx === p - 1 ? [...DK, 90] : null; }
  };
  // the minka's whole face in one tile (one overlay a slice, not three): the stone footing, a gap, the wainscot (charred or plain boards), plaster
  const wallOf = wain => (x, y, k, w, h) => { const hh = MV - (y + .5) / k; return hh < .08 ? PAINT.stone(x, y, k, w, h) : hh < .1 ? null : hh < .22 ? PAINT[wain](x, y, k, w, h) : PAINT.plaster(x, y, k, w, h); };
  PAINT.minkaY = wallOf('yaki'); PAINT.minkaB = wallOf('boards');
  const ROOFM = { kawara:1, thatch:1, tinr:1 };
  function* matBake(){ for(const name in PAINT){ const L = MAT[name] = [], fn = PAINT[name], roof = !!ROOFM[name];
      for(let li = 0; li < MLOD.length; li++){ const k = MLOD[li], w = Math.round(MU * k), h = roof ? RNV[li] : Math.round(MV * k), c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
        for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const v = fn(x, y, k, w, h); if(!v) continue; const o = (y * w + x) * 4; d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = Math.min(255, v[3]); }
        g.putImageData(img, 0, 0); cx.drawImage(c, 0, 0, 1, 1); L.push({ cv:c, pat:cx.createPattern(c, 'repeat'), k, nv:h }); yield; } } }
  // the LOD whose texel stays at least ~an art pixel for a scale of s screen units per half-road (or per slope, for roofs)
  const mlod = (name, s, roof) => { const L = MAT[name]; if(!L || !MM || MOFF) return null; for(let i = 0; i < L.length; i++){ const t = roof ? s / L[i].nv : s / L[i].k; if(t >= PX * .8) return L[i]; } return null; };
  /* (perf) the tile is drawn, not filled: one drawImage of the tile's rectangle (u0..u1 along, v0..v1 down) under the slice's own affine
     transform (MM: tile texels to screen units), split where u wraps the tile. A pattern fill of the same quad cost the GPU a path and a
     pattern shader per call (about 3 ms a frame beside a hamlet); this is a textured quad. */
  function TDRAW(T, u0, u1, v0, v1, a){ const tw = T.cv.width, th = T.cv.height; v0 = Math.max(0, v0); v1 = Math.min(th, v1); if(v1 - v0 < .5 || u1 - u0 < .01) return;
    const ga = cx.globalAlpha; cx.save(); cx.globalAlpha = ga * a; cx.transform(MM.a, MM.b, MM.c, MM.d, MM.e, MM.f);
    let u = u0; while(u < u1 - .001){ const su = ((u % tw) + tw) % tw, len = Math.min(u1 - u, tw - su); cx.drawImage(T.cv, su, v0, len, v1 - v0, u, v0, len, v1 - v0); u += len; }
    cx.restore(); }
  // overlay a wall material on the slice's face plane at lateral L, heights h0..h1, fractions ta..tb along the slice; u0: world offset in segments
  function OV(name, L, h0, h1, ta, tb, u0, a){ const uM = (SU0 + SU1) / 2, T = mlod(name, uM, false); if(!T || a <= .02) return;
    const k = T.k, x0 = px_(L, 0, 0), x1 = px_(L, 0, 1), y0 = py_(L, 0, 0), y1 = py_(L, 0, 1), n = BLM * k * .1, tu0 = u0 * k * .1;
    MM.a = (x1 - x0) / n; MM.b = (y1 - y0) / n; MM.c = 0; MM.d = uM / k; MM.e = x0 - MM.a * tu0; MM.f = y0 - MM.b * tu0 - MV * uM;
    TDRAW(T, tu0 + n * ta, tu0 + n * tb, (MV - h1) * k, (MV - h0) * k, a); }
  // on the end plane (the run's first segment, facing the camera): lateral L0..L1, heights h0..h1
  function OVE(name, L0, L1, h0, h1, a){ const T = mlod(name, SU0, false); if(!T || a <= .02) return; const k = T.k;
    MM.a = SSD * SU0 / k; MM.b = 0; MM.c = 0; MM.d = SU0 / k; MM.e = SX0; MM.f = SY0 - MV * SU0;
    TDRAW(T, L0 * k, L1 * k, (MV - h1) * k, (MV - h0) * k, a); }
  // on a roof slope: the eave at (eL, hW), the ridge at (rid, hR) scaled by tp (a hip's slices rise toward the ridge), poly corners given
  function OVR(name, eL, hW, rid, hR, tp, u0, a, q){ const uM = (SU0 + SU1) / 2, Rx = SSD * uM * (rid - eL) * tp, Ry = -uM * (hR - hW) * tp, T = mlod(name, Math.hypot(Rx, Ry), true); if(!T || a <= .02) return;
    const k = T.k, ex0 = px_(eL, hW, 0), ey0 = py_(eL, hW, 0), ex1 = px_(eL, hW, 1), ey1 = py_(eL, hW, 1), n = BLM * k * .1, tu0 = u0 * k * .1, nv = T.nv;
    MM.a = (ex1 - ex0) / n; MM.b = (ey1 - ey0) / n; MM.c = -Rx / nv; MM.d = -Ry / nv; MM.e = ex0 + Rx - MM.a * tu0; MM.f = ey0 + Ry - MM.b * tu0;
    TDRAW(T, tu0, tu0 + n, 0, nv, a); }
  let BLM = 1;   // the current slice's length in segments (set by bldSlice0)
  // a roof material on any camera-facing face (a hip): o the ridge-side corner over the eave's left end, (ux, uy) one half-road along the
  // eave on screen, (vx, vy) from the ridge line down to the eave; q the face's corners
  function OVQ(name, ox, oy, ux, uy, vx, vy, a, q){ const T = mlod(name, Math.hypot(vx, vy), true); if(!T || a <= .02) return; const k = T.k, nv = T.nv;
    MM.a = ux / k; MM.b = uy / k; MM.c = vx / nv; MM.d = vy / nv; MM.e = ox; MM.f = oy; T.pat.setTransform(MM);
    const ga = cx.globalAlpha; cx.globalAlpha = ga * a; poly(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], T.pat); cx.globalAlpha = ga; }

  // far buildings fade out over the last tenth before their limit (no pop), then are left to the backdrop's farm band
  function bldSlice(sp, x, y, uw, fog, now){ const lim = .55; if(fog > lim) return; const a0 = cx.globalAlpha; if(fog > lim - .1) cx.globalAlpha = a0 * (lim - fog) / .1; bldSlice0(sp, x, y, uw, fog, now); cx.globalAlpha = a0; }
  function bldSlice0(sp, x, y, uw, fog, now){
    const i = sp.k, rel = i - sp.b0, m = spanRun(sp, fog), n = BSPAN(fog); if(!m) return; const t = segs[i + m - 1]; if(!t || !t.p2.screen.w) return;
    const B = sp.kind === 0 && hash(sp.n * 2.71 + .3) < .45 ? BKT : BK[sp.kind], sd = sp.side, X = sp.X, p = t.p2.screen; BLM = m; MA = clamp(1 - (fog - .06) * 7, 0, 1); MU0 = rel + (sp.n * 5) % 16; SSD = sd; SX0 = x - sp.x * uw; SY0 = y; SU0 = uw; SX1 = p.x; SY1 = p.y; SU1 = p.w;
    const xa = px_(X - .7, 0, 0), xb = px_(X, 0, 1), xe = px_(X + B.D, 0, 0); if(Math.max(xa, xb, xe) < -PX || Math.min(xa, xb, xe) > W + PX) return;
    const F = c => fc(c, fog), near = fog < .1 && n === 1, mid = fog < .3, lit = hash(sp.n * 7.7) > .2, rid = X + B.D / 2, eL = X - B.ov, last = rel + m >= sp.len;
    // far tier: the wall, a lit band if anyone is home, the roof slope, the end gable; three or four quads
    if(fog > .16){ BQ(X, 0, X, B.hW, 0, 1, F(B.wall)); if(sp.kind === 0 && lit) BQ(X, .24, X, .5, .15, .85, fc(WIN, fog * .6)); if(sp.kind === 2) BQ(X, .74, X, .88, 0, 1, F('#1e7a40'));
      if(sp.kind !== 5) BQ(eL, B.hW, rid, B.hR, 0, 1, F(B.top[2]));
      if(rel === 0){ cx.fillStyle = F(dkc(B.wall, .3)); poly(px_(X, 0, 0), py_(X, 0, 0), px_(X + B.D, 0, 0), py_(X + B.D, 0, 0), px_(X + B.D, B.hW, 0), py_(X + B.D, B.hW, 0), px_(rid, B.hR, 0), py_(rid, B.hR, 0), cx.fillStyle);
        poly(px_(X, 0, 0), py_(X, 0, 0), px_(rid, B.hR, 0), py_(rid, B.hR, 0), px_(X, B.hW, 0), py_(X, B.hW, 0), px_(X, B.hW, 0), py_(X, B.hW, 0), cx.fillStyle); }
      return; }
    KIND[sp.kind](sp, B, X, rel, m, F, near, lit, fog, now, last);
    if(B.roof !== 'flat') roof(sp, B, X, rel, m, F, near, fog, last);
  }

  // ---- the roof: eave fascia and its shadow on the wall, the slope in stepped tones (darkest at the eave, moonlit at the ridge), tile
  // courses along it and kawara columns (or tin ribs, with rust streaks) up it, a lit lip of tile ends along the eave, a heavy ridge
  // with its moonlit top and an onigawara at the end; the near end is a hip with its small gable (irimoya) or a gable with bargeboards
  const RQ = new Float32Array(8);
  function roof(sp, B, X, rel, m, F, near, fog, last){
    const hipN = Math.min(B.hip, sp.len - 1), rid = X + B.D / 2, eL = X - B.ov, tin = sp.kind === 1 || sp.kind === 3;
    const topAt = r => B.hip && r < hipN ? r / hipN : 1, ta0 = topAt(rel), ta1 = topAt(rel + m);
    const Px = (f, end) => { const tp = end ? ta1 : ta0; return px_(eL + (rid - eL) * tp * f, 0, end); }, Py = (f, end) => { const tp = end ? ta1 : ta0; return py_(0, B.hW + (B.hR - B.hW) * tp * f, end); };
    // the eave's shadow on the wall under it, the fascia board
    BQ(X, B.hW - .1, X, B.hW, 0, 1, F(dkc(B.wall, .55)));
    BQ(eL, B.hW - .045, eL, B.hW + .01, 0, 1, F(tin ? '#1a1416' : '#2a2228'));
    // the slope in four bands (eave to ridge)
    { const nb = near ? 4 : 2; for(let b = 0; b < nb; b++){ const f0 = b / nb, f1 = (b + 1) / nb + .002; poly(Px(f0, 0), Py(f0, 0), Px(f0, 1), Py(f0, 1), Px(f1, 1), Py(f1, 1), Px(f1, 0), Py(f1, 0), F(B.top[near ? b : b * 2 + 1])); } }
    // the material: kawara courses, thatch bundles and moss, or ribbed tin with its rust, fixed to the roof
    RQ[0] = Px(0, 0); RQ[1] = Py(0, 0); RQ[2] = Px(0, 1); RQ[3] = Py(0, 1); RQ[4] = Px(1, 1); RQ[5] = Py(1, 1); RQ[6] = Px(1, 0); RQ[7] = Py(1, 0);
    OVR(tin ? 'tinr' : B.thatch ? 'thatch' : 'kawara', eL, B.hW, rid, B.hR, (ta0 + ta1) / 2, MU0, MA, RQ);
    if(near){
      if(B.thatch){   // the thatch's cut eave: a thick lip of straw ends, its moonlit edge
        BQ(eL, B.hW - .05, eL, B.hW + .03, 0, 1, F('#2a2218')); BQ(eL, B.hW + .02, eL, B.hW + .035, 0, 1, F(B.rim)); }
      else if(!tin){   // tile courses along the slope, kawara columns up it
        for(let c = 1; c < 6; c++){ const f = c / 6, x0 = Px(f, 0), y0 = Py(f, 0), x1 = Px(f, 1), y1 = Py(f, 1); poly(x0, y0, x1, y1, x1, y1 + PX, x0, y0 + PX, F(B.rib)); }
        for(let c = 0; c < 2; c++){ const tt = (c + .5) / 2, tp = topAt(rel + m * tt), hh = B.hW + (B.hR - B.hW) * tp, ll = eL + (rid - eL) * tp, ax = px_(eL, B.hW, tt), ay = py_(eL, B.hW, tt), bx = px_(ll, hh, tt), by = py_(ll, hh, tt);
          poly(ax, ay, bx, by, bx + PX, by, ax + PX, ay, F(B.top[3])); }
        // the lip of round tile ends along the eave, catching the moon in beads
        for(let c = 0; c < 2; c++) BQ(eL, B.hW + .005, eL, B.hW + .03, (c + .1) / 2, (c + .6) / 2, F(B.rim)); }
      else {   // corrugated tin: ribs up the slope, lit and shaded in turn, a few rust streaks from the eave up
        for(let c = 0; c < 6; c++){ const tt = (c + .5) / 6, ax = px_(eL, B.hW, tt), ay = py_(eL, B.hW, tt), bx = px_(rid, B.hR, tt), by = py_(rid, B.hR, tt); poly(ax, ay, bx, by, bx + PX, by, ax + PX, ay, F(c % 2 ? B.rib : B.top[3]));
          const rs = hash(sp.k * 3.7 + c); if(rs > .55){ const f = .2 + rs * .5; poly(ax + PX, ay, ax + (bx - ax) * f + PX, ay + (by - ay) * f, ax + (bx - ax) * f + PX * 2, ay + (by - ay) * f, ax + PX * 2, ay, F('#b0642e')); } }
        BQ(eL, B.hW - .01, eL, B.hW + .02, 0, 1, F(B.rim)); } }
    else BQ(eL, B.hW, eL, B.hW + .025, 0, 1, F(B.rim));
    // the ridge: a heavy band, its moonlit top
    if(ta1 >= 1){ const s0 = Math.max(0, (hipN - rel) / m); BQ(rid - .07, B.hR - .02, rid + .07, B.hR + .08, s0, 1, F('#0a0c12')); BQ(rid - .05, B.hR + .06, rid + .05, B.hR + .09, s0, 1, F(B.rim)); }
    if(rel !== 0) return;
    const D = B.D;
    if(B.roof === 'gab'){   // a gable end: the triangle (plaster or tin), bargeboards, a ridge cap end
      cx.fillStyle = F(tin ? B.top[1] : dkc(B.wall, .25)); poly(px_(X, B.hW, 0), py_(X, B.hW, 0), px_(X + D, B.hW, 0), py_(X + D, B.hW, 0), px_(rid, B.hR, 0), py_(rid, B.hR, 0), px_(rid, B.hR, 0), py_(rid, B.hR, 0), cx.fillStyle);
      { const T = MA > .02 ? mlod(tin ? 'tinw' : sp.kind === 2 ? 'concrete' : 'boards', SU0, false) : null; if(T){ MM.a = SSD * SU0 / T.k; MM.b = 0; MM.c = 0; MM.d = SU0 / T.k; MM.e = SX0; MM.f = SY0 - MV * SU0; T.pat.setTransform(MM);
        const ga = cx.globalAlpha; cx.globalAlpha = ga * MA; poly(px_(X, B.hW, 0), py_(X, B.hW, 0), px_(X + D, B.hW, 0), py_(X + D, B.hW, 0), px_(rid, B.hR, 0), py_(rid, B.hR, 0), px_(rid, B.hR, 0), py_(rid, B.hR, 0), T.pat); cx.globalAlpha = ga; } }   // the gable's material
      if(tin && near) for(let c = 1; c < 6; c++){ const L = X + D * c / 6, hh = B.hW + (B.hR - B.hW) * (1 - Math.abs(L - rid) / (D / 2)); BE(L, B.hW, L + .012, hh, F(c % 2 ? B.rib : B.top[3])); }
      const bw = .045; poly(px_(eL, B.hW - .03, 0), py_(eL, B.hW - .03, 0), px_(rid, B.hR + .03, 0), py_(rid, B.hR + .03, 0), px_(rid, B.hR + .03 + bw, 0), py_(rid, B.hR + .03 + bw, 0), px_(eL, B.hW - .03 + bw, 0), py_(eL, B.hW - .03 + bw, 0), F(B.rim));
      poly(px_(X + D + B.ov, B.hW - .03, 0), py_(X + D + B.ov, B.hW - .03, 0), px_(rid, B.hR + .03, 0), py_(rid, B.hR + .03, 0), px_(rid, B.hR + .03 + bw, 0), py_(rid, B.hR + .03 + bw, 0), px_(X + D + B.ov, B.hW - .03 + bw, 0), py_(X + D + B.ov, B.hW - .03 + bw, 0), F(B.rib));
      return; }
    const e = segs[sp.b0 + hipN]; if(!e || !e.p1.screen.w) return; const q2 = e.p1.screen, sd = SSD, hx = (L, h) => q2.x + sd * L * q2.w, hy = h => q2.y - h * q2.w;
    // the hip, in the same stepped tones, its tile courses parallel to the eave, moonlit hip edges
    const gL = rid - .32, gR = rid + .32, gh = B.hR - .34;
    { const ex0 = px_(eL, B.hW, 0), ey0 = py_(eL, B.hW, 0), ex1 = px_(X + D + B.ov, B.hW, 0), ey1 = ey0, lx = hx(gL, gh), rx = hx(gR, gh), ty = hy(gh);
      for(let b = 0; b < 4; b++){ const f0 = b / 4, f1 = (b + 1) / 4 + .004, a1 = ex0 + (lx - ex0) * f0, a2 = ey0 + (ty - ey0) * f0, b1 = ex1 + (rx - ex1) * f0, b2 = ey1 + (ty - ey1) * f0, c1 = ex1 + (rx - ex1) * f1, c2 = ey1 + (ty - ey1) * f1, d1 = ex0 + (lx - ex0) * f1, d2 = ey0 + (ty - ey0) * f1;
        poly(a1, a2, b1, b2, c1, c2, d1, d2, F(B.top[b])); if(near && b && !B.thatch) poly(a1, a2, b1, b2, b1, b2 + PX, a1, a2 + PX, F(B.rib)); }
      // the hip's material, its courses parallel to the eave
      const mx0 = (ex0 + ex1) / 2, my0 = ey0, mx1 = (lx + rx) / 2, vx = mx0 - mx1, vy = my0 - ty, uL = (ex1 - ex0) / (D + 2 * B.ov);
      RQ[0] = ex0; RQ[1] = ey0; RQ[2] = ex1; RQ[3] = ey1; RQ[4] = rx; RQ[5] = ty; RQ[6] = lx; RQ[7] = ty;
      OVQ(B.thatch ? 'thatch' : 'kawara', ex0 - vx, ey0 - vy, uL, 0, vx, vy, MA, RQ); }
    poly(px_(eL, B.hW, 0), py_(eL, B.hW, 0), hx(gL, gh), hy(gh), hx(gL, gh) + PX, hy(gh), px_(eL, B.hW, 0) + PX, py_(eL, B.hW, 0), F(B.rim));
    poly(px_(X + D + B.ov, B.hW, 0), py_(X + D + B.ov, B.hW, 0), hx(gR, gh), hy(gh), hx(gR, gh) - PX, hy(gh), px_(X + D + B.ov, B.hW, 0) - PX, py_(X + D + B.ov, B.hW, 0), F(B.rib));
    BE(eL, B.hW - .045, X + D + B.ov, B.hW + .01, F('#2a2228')); if(near) for(let c = 0; c < 8; c++) BE(eL + (D + 2 * B.ov) * (c + .2) / 8, B.hW + .005, eL + (D + 2 * B.ov) * (c + .6) / 8, B.hW + .03, F(B.rim));
    // the small gable (tsuma): white plaster crossed by dark timbers, pale bargeboards meeting under a gegyo, an onigawara on the ridge end
    poly(hx(gL, gh), hy(gh), hx(gR, gh), hy(gh), hx(rid, B.hR), hy(B.hR), hx(rid, B.hR), hy(B.hR), F('#6a6e80'));
    if(near){ cx.fillStyle = F('#1a1418'); for(let c = 1; c < 4; c++){ const L = gL + (gR - gL) * c / 4; const top = gh + (B.hR - gh) * (1 - Math.abs(L - rid) / (rid - gL)); cx.fillRect(snap(hx(L, 0)), snap(hy(top)), PX, Math.max(PX, snap(hy(gh) - hy(top)))); } cx.fillRect(snap(hx(gL, 0)), snap(hy(gh + .08)), snap(hx(gR, 0) - hx(gL, 0)), PX); }
    const bw = Math.max(PX, q2.w * .035);
    poly(hx(gL - .04, gh - .02), hy(gh - .02), hx(rid, B.hR + .03), hy(B.hR + .03), hx(rid, B.hR + .03), hy(B.hR + .03) - bw, hx(gL - .04, gh - .02), hy(gh - .02) - bw, F(B.rim));
    poly(hx(gR + .04, gh - .02), hy(gh - .02), hx(rid, B.hR + .03), hy(B.hR + .03), hx(rid, B.hR + .03), hy(B.hR + .03) - bw, hx(gR + .04, gh - .02), hy(gh - .02) - bw, F(B.rim));
    const ow = Math.max(PX * 2, snap(q2.w * .1)), oh = Math.max(PX * 2, snap(q2.w * .12)); cx.fillStyle = F('#0a0c12'); cx.fillRect(snap(hx(rid, 0) - ow / 2), snap(hy(B.hR + .05) - oh), ow, oh); cx.fillStyle = F(B.rim); cx.fillRect(snap(hx(rid, 0) - ow / 2), snap(hy(B.hR + .05) - oh), ow, PX);
  }

  // ---- the walls and the life round each kind of building
  const KIND = [
    // minka: island and gravel yard, a clipped hedge along the front with a gap at the gate, a stone base, an engawa deck, a dark wood
    // wainscot, plaster between posts, bays of lit shoji (a kumiko grid, a koshi panel, sometimes a figure) or closed amado shutters,
    // a nageshi beam; the genkan's bulb; on the end: a lit window, the kei truck parked in the yard
    (sp, B, X, rel, m, F, near, lit, fog, now, last) => {
      const hed = X - .6, gate = rel <= 6 && rel + m > 4;
      if(fog < .2) BQ(X - .9, 0, X + B.D + .4, 0, 0, 1, F('#0e150f'));
      BQ(X, 0, X, .08, 0, 1, F('#3c3e46')); if(near) BV(X, 0, .08, .3 + hash(sp.k) * .4, .01, F('#22242a'));
      BQ(X - .24, .1, X, .1, 0, 1, F(lit ? '#4a3a2c' : '#2e2622')); BQ(X - .24, .075, X - .24, .1, 0, 1, F('#1a1412'));
      BQ(X, .1, X, .22, 0, 1, F('#221a1c')); if(near) BV(X, .1, .22, .5, .006, F('#140e10'));
      BQ(X, .22, X, B.hW, 0, 1, F(B.wall)); OV(sp.n % 3 ? 'minkaY' : 'minkaB', X, 0, B.hW, 0, 1, MU0, MA);
      for(let r = rel; r < rel + m; r++){ if(r % 3) continue; const tb0 = (r - rel) / m, tb1 = Math.min(1, (r + 3 - rel) / m), bay = hash(sp.n * 3.3 + r), on = lit && bay > .3, lo = .24, hi = .5;
        if(on){ BQ(X, lo, X, hi, tb0 + .03, tb1 - .03, fc(bay > .75 ? WIN2 : WIN, fog * .5)); if(near) OV('shoji', X, lo + .05, hi, tb0 + .03, tb1 - .03, MU0, MA * .9); BQ(X, lo, X, lo + .05, tb0 + .03, tb1 - .03, F('#6a4428'));
          if(near){ for(const g of [.31, .37, .44]) BQ(X, g, X, g + .008, tb0 + .03, tb1 - .03, F('#a06a38')); for(let c = 1; c < 3; c++) BV(X, lo + .05, hi, tb0 + (tb1 - tb0) * c / 3, .006, F('#a06a38'));
            if(bay > .86){ const tc = (tb0 + tb1) / 2, hx = px_(X, 0, tc), u = pu_(tc), hy = py_(X, .43, tc); cx.fillStyle = fc('#6a4026', fog * .5); cx.fillRect(snap(hx - u * .03), snap(hy), Math.max(PX, snap(u * .06)), Math.max(PX, snap(u * .06))); cx.fillRect(snap(hx - u * .06), snap(hy + u * .06), Math.max(PX, snap(u * .12)), Math.max(PX, snap(u * .13))); } } }
        else { BQ(X, lo - .02, X, hi + .02, tb0 + .02, tb1 - .02, F('#2a2024')); if(near) for(let c = 1; c < 5; c++) BV(X, lo, hi, tb0 + (tb1 - tb0) * c / 5, .005, F('#1a1418')); }
        BV(X, .1, B.hW, tb0, .045, F('#1a1216')); }
      BQ(X, B.hW - .16, X, B.hW - .13, 0, 1, F('#1a1216'));
      // warm light from the shoji on the engawa and the yard
      if(lit && near) BQ(X - .7, 0, X - .02, 0, 0, 1, add('255,184,96', .05));
      // the hedge: two tones of clipped green, a moonlit top, a gap for the gate
      if(!(gate && rel >= 4 && rel <= 5)){ BQ(hed, 0, hed, .2, 0, 1, F(rel % 2 ? '#0c1a12' : '#0e1e15')); BQ(hed, .2, hed - .03, .23, 0, 1, F('#2a4a36')); if(near) BQ(hed, .1, hed, .12, (sp.k * .37) % .6, (sp.k * .37) % .6 + .4, F('#14281c')); }
      else { BV(hed, 0, .32, 0, .03, F('#3a3c44')); }
      // the genkan bulb at the gate
      if(lit && rel <= 5 && rel + m > 5){ const tc = (5 - rel) / m; const bx = px_(X, 0, tc), by = py_(X, B.hW - .2, tc), u = pu_(tc); cx.fillStyle = '#fff0c8'; cx.fillRect(snap(bx), snap(by), Math.max(PX, snap(u * .03)), Math.max(PX, snap(u * .03))); gl(bx, by, u * .4, '#ffc070', .4 * (1 - fog)); cone(X - .05, B.hW - .2, tc, .3, '255,190,110', .06 * (1 - fog)); }
      if(rel !== 0) return;
      // the end wall: wainscot, plaster, corner posts, a lit window with its grid
      BE(X, 0, X + B.D, .08, F('#34363e')); BE(X, .08, X + B.D, .22, F('#1c1618')); BE(X, .22, X + B.D, B.hW, F(dkc(B.wall, .3))); OVE('minkaB', X, X + B.D, 0, B.hW, MA);
      BE(X, .08, X + .04, B.hW, F('#140e12')); BE(X + B.D - .04, .08, X + B.D, B.hW, F('#140e12'));
      if(lit){ BE(X + B.D * .35, .28, X + B.D * .65, .48, fc(WIN2, fog * .5)); if(near){ BE(X + B.D * .35, .375, X + B.D * .65, .385, F('#a06a38')); BE(X + B.D * .495, .28, X + B.D * .505, .48, F('#a06a38')); } }
      // the kei truck parked in the yard, seen from behind: tailgate, tail lamps, the cab and its rear window, wheels
      if(fog < .3 && hash(sp.n * 1.9) > .3){ const L = X - .38, c = ['#c8ccd6', '#5a6a8a', '#8a2a2a'][(sp.n * 7) % 3]; BR(L, .02, .28, .04, '#08080c'); BR(L, .05, .27, .1, F(c)); BR(L, .14, .25, .02, F(mixc(c, '#ffffff', .3)));
        BR(L - .1, .07, .03, .025, '#c8202a'); BR(L + .1, .07, .03, .025, '#c8202a'); BR(L, .27, .22, .13, F(dkc(c, .2))); BR(L, .24, .16, .07, F('#16202e'));
        BR(L - .11, .03, .05, .04, '#0a0a0c'); BR(L + .11, .03, .05, .04, '#0a0a0c'); } },
    // tin barn: plank walls in two tones with board joints and a girt, a sliding door with its X brace and rail, a bare bulb with a cone
    // of light and moths, crates and a straw bale by the door
    (sp, B, X, rel, m, F, near, lit, fog, now, last) => {
      if(fog < .2) BQ(X - .5, 0, X + B.D + .3, 0, 0, 1, F('#121410'));
      BQ(X, 0, X, B.hW, 0, 1, F(rel % 2 ? '#2a2026' : '#30262a')); OV(sp.n % 2 ? 'yaki' : 'boards', X, 0, B.hW, 0, 1, MU0, MA); if(near) for(let c = 1; c < 3; c++) BV(X, .02, B.hW, c / 3, .006, F('#150f12'));
      BQ(X, .34, X, .36, 0, 1, F('#1a1216')); BQ(X, 0, X, .03, 0, 1, F('#22242a'));
      const d0 = 2, d1 = 6; if(rel < d1 && rel + m > d0){ const ta = Math.max(0, (d0 - rel) / m), tb = Math.min(1, (d1 - rel) / m); BQ(X, .03, X, .5, ta, tb, F('#4a3c32')); BQ(X, .5, X, .53, ta, tb, F('#1a1216'));
        if(near){ for(let d = 0; d < 2; d++){ const h0 = d ? .46 : .06, h1 = d ? .06 : .46, a1 = px_(X, h0, ta), a2 = py_(X, h0, ta), b1 = px_(X, h1, tb), b2 = py_(X, h1, tb); poly(a1, a2, b1, b2, b1, b2 + PX, a1, a2 + PX, F('#2a2018')); } BV(X, .03, .5, ta, .01, F('#2a2018')); BV(X, .03, .5, tb, .01, F('#2a2018')); }
        if(lit && rel <= 4 && rel + m > 4){ const tc = (4 - rel) / m, u = pu_(tc), bx = px_(X, 0, tc), by = py_(X, .6, tc); cx.fillStyle = F('#0a0a0c'); cx.fillRect(snap(bx - u * .04), snap(by - u * .02), Math.max(PX, snap(u * .08)), Math.max(PX, snap(u * .02)));
          cx.fillStyle = '#fff4cc'; cx.fillRect(snap(bx - u * .01), snap(by), Math.max(PX, snap(u * .02)), Math.max(PX, snap(u * .025))); gl(bx, by, u * .35, '#ffc070', .45 * (1 - fog)); cone(X - .04, .6, tc, .28, '255,200,120', .07 * (1 - fog));
          if(!reduce && fog < .25) for(let j = 0; j < 4; j++){ const ph = now / (420 + j * 110) + j * 1.7; cx.fillStyle = '#f4f0e0'; cx.fillRect(snap(bx + Math.sin(ph) * u * .08), snap(by + Math.cos(ph * 1.3) * u * .05), PX, PX); } } }
      if(rel <= 1 && rel + m > 0 && fog < .25){ const tc = .3; BQ(X - .16, 0, X - .02, .1, tc, Math.min(1, tc + 1.5 / m), F('#5a4630')); BQ(X - .16, .1, X - .16, .11, tc, Math.min(1, tc + 1.5 / m), F('#7a6040')); }
      if(rel === 0){ BE(X, 0, X + B.D, B.hW, F(B.top[1])); OVE('tinw', X, X + B.D, 0, B.hW, MA); if(near) for(let c = 1; c < 6; c++) BE(X + B.D * c / 6, 0, X + B.D * c / 6 + .012, B.hW, F(c % 2 ? B.rib : B.top[3]));
        if(fog < .25){ BR(X - .3, .14, .24, .14, F('#9a8048')); BR(X - .3, .14, .24, .02, F('#c0a060')); BR(X - .3, .06, .2, .02, F('#6a5430')); } } },
    // co-op warehouse: a concrete apron, panel joints, roller shutters with slats, their boxes and a lit bottom edge (one half up, the
    // light inside and rice sacks), the green sign band with its name and a leaf mark, sodium lamps on brackets with cones; a forklift
    // and pallets by the near end
    (sp, B, X, rel, m, F, near, lit, fog, now, last) => {
      if(fog < .2) BQ(X - .8, 0, X + B.D + .2, 0, 0, 1, F('#24262a')); BQ(X, 0, X, B.hW, 0, 1, F(B.wall)); OV('concrete', X, 0, B.hW, 0, 1, MU0, MA); BQ(X, 0, X, .03, 0, 1, F('#2a2e38'));
      for(let r = rel; r < rel + m; r++){ if(r % 4) continue; const tb0 = (r - rel) / m, tb1 = Math.min(1, (r + 4 - rel) / m), open = hash(sp.n * 5.1 + r) > .8 && lit;
        BQ(X, .03, X, .64, tb0 + .06, tb1 - .06, F(open ? '#ffb860' : '#4a5264')); BQ(X, .64, X, .7, tb0 + .04, tb1 - .04, F('#2e3440'));
        if(open){ BQ(X, .03, X, .26, tb0 + .06, tb1 - .06, F('#ffd890')); if(near) for(let c = 0; c < 3; c++) BQ(X, .03, X, .12 + (c % 2) * .05, tb0 + .1 + c * .08, tb0 + .17 + c * .08, F('#c8b890')); BQ(X - .5, 0, X - .02, 0, tb0, tb1, add('255,180,90', .07)); }
        else if(near) for(let g = .07; g < .62; g += .045) BQ(X, g, X, g + .008, tb0 + .06, tb1 - .06, F('#363c4a'));
        BV(X, 0, B.hW, tb0, .02, F('#3a404e')); }
      BQ(X, .74, X, .9, 0, 1, F('#1e7a40')); BQ(X, .74, X, .755, 0, 1, F('#145a2e')); BQ(X, .885, X, .9, 0, 1, F('#3a9a5a'));
      if(rel === 0 && fog < .5){ const ts = sign('農業倉庫'); if(ts){ const tc = Math.min(1, 2.5 / m), sx = px_(X, 0, tc), sy = py_(X, .82, tc), w = pu_(tc) * .55; const ga = cx.globalAlpha; cx.globalAlpha = ga * (1 - fog * 1.6); blit(ts, sx, sy + ts.height * w / ts.width / 2, w / ts.width); cx.globalAlpha = ga; } }
      for(let r = rel; r < rel + m; r++){ if(r % 4 !== 2) continue; const tc = (r - rel + .5) / m, bx = px_(X, 0, tc), by = py_(X, .7, tc), u = pu_(tc); cx.fillStyle = F('#1a1c22'); cx.fillRect(snap(bx - u * .05), snap(by - u * .02), Math.max(PX, snap(u * .1)), Math.max(PX, snap(u * .03)));
        cx.fillStyle = '#ffb04a'; cx.fillRect(snap(bx - u * .03), snap(by + u * .01), Math.max(PX, snap(u * .06)), Math.max(PX, snap(u * .015))); gl(bx, by, u * .45, '#ff9a30', .4 * (1 - fog)); cone(X - .06, .7, tc, .4, '255,150,60', .06 * (1 - fog)); }
      if(rel === 0){ BE(X, 0, X + B.D, B.hW, F(dkc(B.wall, .3))); OVE('concrete', X, X + B.D, 0, B.hW, MA); BE(X, .74, X + B.D, .9, F('#145a2e'));
        if(fog < .3){ const L = X - .45; BR(L, .02, .2, .14, F('#e8a020')); BR(L, .16, .14, .1, F('#16181e')); BR(L - .12, .02, .02, .34, F('#2a2a30')); BR(L - .17, .02, .1, .015, F('#8a8e98')); BR(L + .07, .03, .06, .06, '#0a0a0c'); BR(L - .06, .03, .06, .06, '#0a0a0c');
          for(let c = 0; c < 3; c++){ BR(X - .82, .02 + c * .07, .2, .018, F('#7a5a34')); BR(X - .82, .045 + c * .07, .18, .045, F(c % 2 ? '#d8d0b8' : '#c8c0a4')); } } } },
    // station shelter: the platform with its yellow tactile line, the dark back wall, a bench, a timetable board, a poster, the tube light
    // under the eave with its pool; on the end, the white name board on two posts
    (sp, B, X, rel, m, F, near, lit, fog, now, last) => {
      BQ(X - .55, .06, X + B.D, .06, 0, 1, F('#3a3c42')); BQ(X - .55, 0, X - .55, .06, 0, 1, F('#24262c')); BQ(X - .5, .06, X - .45, .06, 0, 1, F('#c8a020'));
      BQ(X, .06, X, B.hW, 0, 1, F('#2a201c')); OV('boards', X, .06, B.hW, 0, 1, MU0, MA); BQ(X, .06, X, .1, 0, 1, F('#1a1412'));
      BQ(X - .14, .17, X - .02, .17, .1, .9, F('#6a5240')); BQ(X - .14, .155, X - .14, .17, .1, .9, F('#3a2a20')); BV(X - .12, .06, .17, .15, .02, F('#1a1412')); BV(X - .12, .06, .17, .85, .02, F('#1a1412'));
      if(rel % 3 === 1 && fog < .25){ BQ(X, .26, X, .42, .2, .8, F('#e8ecf0')); if(near) for(let c = 0; c < 5; c++) BQ(X, .29 + c * .025, X, .3 + c * .025, .28, .72, F('#3a4050')); }
      if(rel % 3 === 2 && fog < .25){ BQ(X, .24, X, .4, .25, .75, F('#3a6aa8')); BQ(X, .3, X, .34, .3, .7, F('#e8c040')); }
      BV(X - B.ov + .02, .06, B.hW, 0, .03, F('#2a201c'));
      { const tc = .5, bx = px_(X - .1, 0, tc), by = py_(X - .1, B.hW - .04, tc), u = pu_(tc); cx.fillStyle = '#effff6'; cx.fillRect(snap(bx - u * .05), snap(by), Math.max(PX, snap(u * .1)), Math.max(PX, snap(u * .015))); if(rel % 2 === 0){ gl(bx, by, u * .5, '#c8ffe8', .35 * (1 - fog)); cone(X - .15, B.hW - .04, tc, .35, '190,255,230', .05 * (1 - fog)); } }
      if(rel === 0){ BE(X, .06, X + B.D, B.hW, F('#241c18'));
        if(fog < .35){ const L = X - .35; BR(L - .17, .06, .015, .38, F('#3a3e48')); BR(L + .17, .06, .015, .38, F('#3a3e48')); BR(L, .32, .4, .14, '#eef2f4'); BR(L, .32, .4, .015, F('#1a6ab8'));
          const ts = sign('いなだ'); if(ts && fog < .25){ const u = SU0, w = .3 * u, sx = px_(L, 0, 0), sy = py_(L, .24, 0); blit(ts, sx, sy + ts.height * w / ts.width / 2, w / ts.width); }
          if(fog < .2){ BR(L - .12, .2, .06, .008, F('#1a1e26')); BR(L + .12, .2, .06, .008, F('#1a1e26')); } } } },
    // hokora: on a stone base, a small hall with lattice doors faintly lit, a shimenawa rope with paper shide across the front
    (sp, B, X, rel, m, F, near, lit, fog, now, last) => {
      BQ(X - .25, 0, X + B.D + .2, 0, 0, 1, F('#1a1e1a')); BQ(X - .04, 0, X - .04, .07, 0, 1, F('#4a4e58')); BQ(X - .04, .07, X, .07, 0, 1, F('#5a5e68'));
      BQ(X, .07, X, B.hW, 0, 1, F(B.wall)); OV('boards', X, .07, B.hW, 0, 1, MU0, MA * .7); BQ(X, .1, X, .26, .15, .85, F('#1a0e0c')); if(lit) BQ(X, .12, X, .24, .2, .8, fc('#c87a40', fog * .6));
      if(near){ for(let c = 1; c < 4; c++) BV(X, .1, .26, .15 + .7 * c / 4, .006, F('#2a1410')); BQ(X, .17, X, .176, .15, .85, F('#2a1410')); }
      BQ(X - .02, B.hW - .05, X - .02, B.hW - .03, 0, 1, F('#d8c890')); if(near) for(let c = 0; c < 3; c++){ BQ(X - .02, B.hW - .1, X - .02, B.hW - .05, .2 + c * .3, .26 + c * .3, '#f4f4ec'); }
      if(rel === 0) BE(X, .07, X + B.D, B.hW, F(dkc(B.wall, .35))); },
    // vending machines, three in a row facing the road (each about two segments wide): bodies in white, red and blue, a lit header, the
    // display window of drinks in rows with price lights, a button row, the dark lower panel with the coin slot and the take-out flap;
    // the lit fronts throw cool light on the ground; moths
    (sp, B, X, rel, m, F, near, lit, fog, now, last) => {
      const BODY = ['#d8dce4', '#c8202a', '#2a5ab8'], G = c => fc(c, fog * .4);
      if(fog < .2) BQ(X - .9, 0, X - .01, 0, 0, 1, add('210,235,255', .07 * (1 - fog)));
      for(let r = rel; r < rel + m; r++){ const v = Math.floor(r / 2), half = r % 2, tb0 = (r - rel) / m, tb1 = (r + 1 - rel) / m, a0 = tb0 + (half ? 0 : .08 / m), a1 = tb1 - (half ? .08 / m : 0), body = BODY[v % 3];
        BQ(X, 0, X, B.hW, a0, a1, G(body)); BQ(X, .33, X, .355, a0, a1, '#f4fbff'); BQ(X, .19, X, .31, a0 + (half ? 0 : .1 / m), a1 - (half ? .1 / m : 0), '#e8f4ff');
        if(near){ for(let rw = 0; rw < 3; rw++) for(let c = 0; c < 3; c++){ const ca = a0 + (a1 - a0) * (c + .2) / 3, cb = a0 + (a1 - a0) * (c + .7) / 3; BQ(X, .205 + rw * .035, X, .225 + rw * .035, ca, cb, NEON[(c + rw + v + half) % 5]); } BQ(X, .175, X, .182, a0 + .05 / m, a1 - .05 / m, '#ffd04a'); }
        BQ(X, .03, X, .14, a0 + .05 / m, a1 - .05 / m, G(dkc(body, .55))); if(half) BQ(X, .03, X, .06, a0, a1 - .2 / m, G('#0a0a10')); else BQ(X, .09, X, .12, a0 + .5 / m, a1 - .1 / m, G('#4a4e58')); }
      const cxp = px_(X, 0, .5), u = pu_(.5); gl(cxp, py_(X, .26, .5), u * .6, '#e8f4ff', .35 * (1 - fog));
      if(rel === 0){ BE(X, 0, X + B.D, B.hW, G(dkc(BODY[0], .35))); BE(X, B.hW - .01, X + B.D, B.hW + .01, G('#9aa0ac')); }
      if(!reduce && fog < .25 && rel === 2) for(let j = 0; j < 3; j++){ const ph = now / (500 + j * 130) + j * 2; cx.fillStyle = '#f4f0e0'; cx.fillRect(snap(cxp + Math.sin(ph) * u * .15), snap(py_(X, .42, .5) + Math.cos(ph * 1.3) * u * .05), PX, PX); } }
  ];
  // sign lettering (DotGothic16), made in warm() so nothing is built mid-ride; a late font repaints the same canvas
  const SIGNS = {};
  function sign(str){ return SIGNS[str] || null; }
  function makeSign(str, col){ let c = SIGNS[str]; if(!c){ c = SIGNS[str] = document.createElement('canvas'); c.width = 16 * str.length + 4; c.height = 20; }
    const k = c.getContext('2d'); k.clearRect(0, 0, c.width, c.height); k.font = '16px DotGothic16, monospace'; k.textBaseline = 'middle'; k.fillStyle = col; k.fillText(str, 2, 10);
    const im = k.getImageData(0, 0, c.width, c.height), d = im.data; for(let n = 3; n < d.length; n += 4) d[n] = d[n] > 90 ? 255 : 0; k.putImageData(im, 0, 0); }
  function warmSigns(){ const go = () => { makeSign('農業倉庫', '#f4f8f0'); makeSign('いなだ', '#14181e'); }; go(); try{ document.fonts.load('16px DotGothic16').then(go, go); }catch(e){} }

  // hasa-kake: a drying rack of poles on a ridge parallel to the road, three rails, a few sheaves of last year's straw left hanging
  function rackSlice(sp, x, y, uw, fog, now){ const i = sp.k, rel = i - sp.b0, m = spanRun(sp, fog); if(!m) return; const t = segs[i + m - 1]; if(!t || !t.p2.screen.w) return;
    const p = t.p2.screen, X = sp.X; SSD = sp.side; SX0 = x - sp.x * uw; SY0 = y; SU0 = uw; SX1 = p.x; SY1 = p.y; SU1 = p.w; const F = c => fc(c, fog);
    if(Math.max(px_(X, 0, 0), px_(X, 0, 1)) < -PX || Math.min(px_(X, 0, 0), px_(X, 0, 1)) > W + PX) return;
    for(const h of [.3, .5, .7]) BQ(X, h, X, h + .02, 0, 1, F('#2a2420'));
    for(let b = 0; b < m; b++){ BV(X, 0, .82, b / m, .025, F('#1e1814'));
      if(fog < .4) for(let r = 0; r < 3; r++) if(hash(i * 3.1 + b * 7 + r * 1.9) > .55) BQ(X, .3 + r * .2 - .16, X, .3 + r * .2, (b + .2) / m, (b + .8) / m, F(r % 2 ? '#8a7440' : '#6e5c30')); }
    if(rel + m >= sp.len) BV(X, 0, .82, 1, .025, F('#1e1814')); }
  // the shrine by the road: a vermilion torii facing the road's edge (grid rects at its segment), a stone lantern, the hokora is a building
  // the shrine by the road (Commons photos of village shrines in Niigata and Nagano): a vermilion myojin torii facing the road's edge
  // (grid rects at its segment): posts with a slight batter, the black kasagi with upturned ends over the vermilion shimaki, the gakuzuka
  // strut, the nuki running through the posts; a shimenawa rope sagging under the nuki with four paper shide; beside it an ishidoro:
  // a wide base, the post, the platform, the firebox with its lit window (a steady flame, a slow flicker if motion is on), the cap with
  // upturned corners and the hoju on top
  function drawTorii(sp, x, y, uw, fog, now){ if(fog > .8) return; const F = c => fc(c, fog), R2 = (x0, y0, w, h, c) => { cx.fillStyle = c; cx.fillRect(snap(x0), snap(y0), Math.max(PX, snap(w)), Math.max(PX, snap(h))); };
    const w = uw * .8, h = uw * .95, pw = uw * .07, l = x - w / 2, r = x + w / 2; if(r + uw < 0 || l - uw > W) return;
    R2(l - pw / 2, y - h, pw, h, F('#a8301e')); R2(r - pw / 2, y - h, pw, h, F('#a8301e')); if(uw > 12){ R2(l - pw / 2, y - h, PX, h, F('#d8503a')); R2(r - pw / 2, y - h, PX, h, F('#d8503a')); }
    R2(l - pw * .7, y - uw * .06, pw * 1.4, uw * .06, F('#1a1a1c')); R2(r - pw * .7, y - uw * .06, pw * 1.4, uw * .06, F('#1a1a1c'));
    R2(l - uw * .1, y - h * .78, w + uw * .2, uw * .05, F('#c03a28'));
    R2(x - uw * .04, y - h - uw * .02, uw * .08, h * .22 - uw * .05, F('#c03a28'));
    R2(l - uw * .16, y - h - uw * .02, w + uw * .32, uw * .05, F('#c03a28'));
    R2(l - uw * .2, y - h - uw * .09, w + uw * .4, uw * .07, F('#141416')); R2(l - uw * .24, y - h - uw * .12, uw * .08, uw * .04, F('#141416')); R2(r + uw * .16, y - h - uw * .12, uw * .08, uw * .04, F('#141416'));
    if(uw > 10){ R2(l - uw * .2, y - h - uw * .09, w + uw * .4, PX, F('#4a4e5c'));
      // the shimenawa: a thick straw rope in a shallow sag, its twist in dots, four shide hanging from it
      const ry = y - h * .7, n = 10; for(let j = 0; j < n; j++){ const t = j / n, sx = l + pw / 2 + (w - pw) * t, sy = ry + Math.sin(t * Math.PI) * uw * .06; R2(sx, sy, (w - pw) / n + PX, uw * .035, F('#c8b070')); if(j % 2 === 0) R2(sx, sy + uw * .012, PX, PX, F('#8a7440')); }
      for(let j = 1; j <= 4; j++){ const t = j / 5, sx = l + pw / 2 + (w - pw) * t, sy = ry + Math.sin(t * Math.PI) * uw * .06 + uw * .035; for(let z = 0; z < 3; z++) R2(sx + (z % 2) * uw * .02, sy + z * uw * .03, uw * .025, uw * .03, '#eeeeea'); } }
    // the ishidoro
    const lx = x + (sp.side < 0 ? -1 : 1) * w * .95, u = uw, st = F('#5a5e68'), st2 = F('#3a3e46');
    R2(lx - u * .09, y - u * .05, u * .18, u * .05, st2); R2(lx - u * .03, y - u * .28, u * .06, u * .23, st); R2(lx - u * .08, y - u * .31, u * .16, u * .03, st);
    R2(lx - u * .06, y - u * .41, u * .12, u * .1, st2); const fl = reduce ? 1 : .85 + .15 * Math.sin(now / 130 + sp.k) * Math.sin(now / 53);
    R2(lx - u * .03, y - u * .39, u * .06, u * .05, mixc('#ff9a40', '#ffe0a0', fl - .7)); R2(lx - u * .11, y - u * .45, u * .22, u * .04, st); R2(lx - u * .13, y - u * .46, u * .03, u * .02, st); R2(lx + u * .1, y - u * .46, u * .03, u * .02, st);
    R2(lx - u * .025, y - u * .5, u * .05, u * .05, st2);
    gl(lx, y - u * .365, u * .35, '#ffa040', .5 * fl * (1 - fog)); pool(lx, y, u * .4, u * .07, '#ffa040', .25 * (1 - fog)); }
  // a lone crossroads: a farm lane crossing the fields, and two lit vending machines on its corner (a face one segment long and a side)
  function drawVendP(sp, x, y, uw, fog, now){ if(fog > .6) return; const t = segs[sp.k]; if(!t || !t.p2.screen.w) return; const p = t.p2.screen, X = sp.X; SSD = sp.side; SX0 = x - sp.x * uw; SY0 = y; SU0 = uw; SX1 = p.x; SY1 = p.y; SU1 = p.w;
    const F = c => fc(c, fog * .6); if(Math.min(px_(X, 0, 0), px_(X, 0, 1)) > W + PX || Math.max(px_(X, 0, 0), px_(X, 0, 1)) < -PX) return;
    for(let v = 0; v < 2; v++){ const t0 = .08 + v * .46, t1 = t0 + .4, body = v ? '#c8203a' : '#e8e4ec';
      BQ(X, 0, X, .4, t0, t1, F('#0c0a12')); BQ(X, .01, X, .39, t0 + .03, t1 - .03, F(body)); BQ(X, .23, X, .36, t0 + .06, t1 - .06, '#f4f8ff');
      if(fog < .2) for(let r = 0; r < 2; r++) for(let c = 0; c < 4; c++) BQ(X, .25 + r * .055, X, .275 + r * .055, t0 + .08 + c * .065, t0 + .12 + c * .065, NEON[(c + r * 2 + v) % 5]); }
    const cxp = (px_(X, 0, 0) + px_(X, 0, 1)) / 2; pool(cxp, y, uw * 1.2, uw * .2, '#d0ecff', .5 * (1 - fog)); gl(cxp, py_(X, .3, .5), uw * .7, '#e8f4ff', .45 * (1 - fog));
    if(!reduce && fog < .3) for(let j = 0; j < 3; j++){ const ph = now / (500 + j * 130) + j * 2; cx.fillStyle = '#f4f0e0'; cx.fillRect(snap(cxp + Math.sin(ph) * uw * .2), snap(py_(X, .45, .5) + Math.cos(ph * 1.3) * uw * .06), PX, PX); } }
  // a utility pole drawn as grid rects (shaft, crossarms, insulators, the lamp arm): crisp at any size, so it stays as it passes the camera
  function poleRects(sp, x, y, uw, fog, k){ const F = c => fc(c, fog * .6), sw = Math.max(PX, snap(3 * k)), top = y - PH * k, dir = sp.x > 0 ? -1 : 1;
    // up close the shaft is a dark silhouette with one moonlit edge (Initial D's poles whipping past), so it never hides the farms as a grey slab
    cx.fillStyle = k > PX * 4 ? '#0c0e12' : F(PAL[5][2]); cx.fillRect(snap(x - sw / 2), snap(top), sw, snap(y - top)); cx.fillStyle = F(PAL[5][3]); cx.fillRect(snap(x - sw / 2) + (dir > 0 ? sw - PX : 0), snap(top), PX, snap(y - top));
    const arm = (yy, hw) => { cx.fillStyle = F(PAL[5][1]); cx.fillRect(snap(x - hw * k), snap(y - (PH - yy) * k), snap(hw * 2 * k), Math.max(PX, snap(k))); };
    arm(6, 6.5); arm(14, 4); cx.fillStyle = F(INS); for(const ox of [-5, -2, 2, 5]) cx.fillRect(snap(x + ox * k), snap(y - (PH - 5) * k), Math.max(PX, snap(k)), Math.max(PX, snap(k)));
    if(sp.v === 1){ cx.fillStyle = F(PAL[3][2]); cx.fillRect(snap(x + 1.5 * k), snap(y - (PH - 18) * k), snap(4 * k), snap(9 * k)); for(let s = 58; s <= 66; s += 2){ cx.fillStyle = (s >> 1) % 2 ? F('#b89a28') : F(BLK); cx.fillRect(snap(x - sw / 2), snap(y - (PH - s) * k), sw, Math.max(PX, snap(k * 2))); } }
    if(sp.v === 2){ cx.fillStyle = F(PAL[5][1]); cx.fillRect(snap(x), snap(y - (PH - 30) * k), snap(6 * dir * k) || PX, Math.max(PX, snap(k))); cx.fillStyle = LAMP; cx.fillRect(snap(x + Math.min(0, 6 * dir * k)) + (dir > 0 ? snap(3 * k) : 0), snap(y - (PH - 32) * k), snap(3 * k), Math.max(PX, snap(k))); } }

  // ---------------------------------------------------------------- backdrop: satoyama hills, a far plain with tree rows, pylons, farm lights, a local train
  const vn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  let YS = new Float32Array(0);
  function hillsL(off, hz, amp, fr, seed, col, rim, moonX, bump, L){ const n = Math.ceil(W / PX) + 3; if(YS.length < n) YS = new Float32Array(n);
    for(let i = 0; i < n; i++){ const wx = (i - 1) * PX + off, c = Math.floor(wx / PX); YS[i] = snap(hz - (vn(wx * fr + seed) * .7 + vn(wx * fr * 2.6 + seed * 3) * .3) * amp - (bump && hash(c * .37 + seed) > .55 ? PX : 0) - (bump && vn(c * .21 + seed) > .6 ? PX : 0)); }
    // one stepped outline polygon (not hundreds of column rects: those make the rasteriser stall)
    const o0 = ((off % PX) + PX) % PX; cx.beginPath(); cx.moveTo(-PX * 2, hz + PX * 4);
    for(let i = 0; i < n; i++){ const x = (i - 1) * PX - o0; cx.lineTo(x, YS[i]); cx.lineTo(x + PX, YS[i]); }
    cx.lineTo(W + PX * 2, hz + PX * 4); cx.closePath(); cx.fillStyle = col; cx.fill();
    if(n <= MHY[L].length){ MHY[L].set(YS.subarray(0, n)); MHN[L] = n; MHO[L] = o0; }
    cx.fillStyle = rim; for(let i = 1; i < n - 1; i++){ const x = (i - 1) * PX, d = Math.abs(x - moonX); if(d > W * .5) continue; const faces = (YS[i + 1] - YS[i - 1]) * (moonX > x ? 1 : -1) > 0; if(faces || d < W * .2) cx.fillRect(x, YS[i], PX, PX); } }
  function backdrop(o){ const { hz, sk, now, moonX, t } = o; SK = sk; if(sk.low !== fogLow){ fogLow = sk.low; FC.clear(); } const dawn = clamp((t - .7) / .3, 0, 1), moonCol = mixc('#dfe8f0', '#ffb070', dawn);
    const c0 = mixc('#24364a', sk.low, .4), c1 = mixc('#122028', sk.low, .2), c2 = mixc('#060c0e', sk.low, .1);
    MC = [c0, c1, c2]; MOK = true; TR = null;
    hillsL(skyPar('far'), hz, H * .09, .0032, 11, c0, mixc(c0, moonCol, .35), moonX, false, 0);
    // mist in the far valley
    cx.fillStyle = pat(mixc(c0, moonCol, .25), .25); cx.fillRect(0, snap(hz - H * .035), W, snap(H * .035) + PX);
    hillsL(skyPar('mid'), hz, H * .045, .0058, 47, c1, mixc(c1, moonCol, .4), moonX, true, 1);
    cx.fillStyle = pat(mixc(c1, moonCol, .2), .25); cx.fillRect(0, snap(hz - H * .014), W, snap(H * .014) + PX);
    // pylons marching across the plain, wires sagging between them
    const per = 330, off = skyPar('near'), b0 = Math.floor(off / per) - 1, spr = pylonSpr(), ps = PX, tops = [];
    for(let b = b0; b <= b0 + Math.ceil(W / per) + 2; b++){ const x = snap(b * per - off + 60), y = snap(hz - PX * 2); blit(spr, x, y, ps); tops.push([x, y - 30 * ps]); }
    cx.beginPath(); for(let j = 0; j + 1 < tops.length; j++) for(const dy of [0, 5 * ps]) wire(cx, tops[j][0] - 8 * ps, tops[j][1] + dy, tops[j + 1][0] - 8 * ps, tops[j + 1][1] + dy, PX * 5), wire(cx, tops[j][0] + 8 * ps, tops[j][1] + dy, tops[j + 1][0] + 8 * ps, tops[j + 1][1] + dy, PX * 5);
    strokeW('#0a1018');
    // the far plain: rows of ridge trees and farm clusters as a crenellated band right on the horizon, with warm windows
    const step = PX * 2, toff = skyPar('edge'), o0 = ((toff % step) + step) % step, lit = []; BN = 0; BX0 = -step - o0; WLN = 0;
    cx.beginPath(); cx.moveTo(-step * 2, hz + PX);
    for(let x = -step - o0; x < W + step; x += step){ const wx = Math.round((x + toff) / step), grp = vn(wx * .045 + 3), row = vn(wx * .11 + 9);
      let h = 0; if(grp > .6){ const hp = ((wx % 6) + 6) % 6; h = PX * (3 + Math.round((grp - .6) * 6) + (hp < 3 ? hp : 5 - hp)); }   // (round 2) the far village: gabled roofs, not a crenellation else if(row > .55 && wx % 3 !== 0) h = PX * (3 + Math.round(hash(wx * 1.3) * 2)); else h = hash(wx * 7) > .7 ? PX : 0;
      cx.lineTo(x, hz - h); cx.lineTo(x + step, hz - h); if(BN < BHT.length) BHT[BN++] = h;
      if(h && Math.abs(x - moonX) < W * .3) lit.push(x + (moonX > x ? PX : 0), hz - h);
      if(grp > .62 && hash(wx * 3.7) > .42 && (((wx % 6) + 6) % 6) !== 2 && WLN < WLX.length) WLX[WLN++] = x; }
    cx.lineTo(W + step * 2, hz + PX); cx.closePath(); cx.fillStyle = c2; cx.fill();
    cx.fillStyle = mixc(c2, moonCol, .3); for(let j = 0; j < lit.length; j += 2) cx.fillRect(lit[j], lit[j + 1], PX, PX);
    cx.fillStyle = '#ffc070'; for(let j = 0; j < WLN; j++) cx.fillRect(WLX[j], hz - PX * 2, PX, PX);
    // a two-car local train running along the foot of the hills, lit windows and a headlight (reflected in the fields by the mirror)
    const tper = 26000, ph = (now % tper) / tper; if(ph < .7){ const len = PX * 46, dir = 1, tx = snap(-len + (ph / .7) * (W * 1.4 + len) - skyPar('mid') % (W * .4)), ty = snap(hz - PX * 5);
      if(tx < W && tx + len > 0){ TR = [tx, ty, len]; cx.fillStyle = '#0c1218'; cx.fillRect(tx, ty, len, PX * 4); cx.fillStyle = '#2a3a44'; cx.fillRect(tx, ty, len, PX);
        cx.fillStyle = '#ffe8b8'; for(let j = 0; j < 20; j++){ if(j === 9 || j === 10) continue; cx.fillRect(tx + PX * (2 + j * 2.2 | 0), ty + PX * 2, PX, PX); }
        cx.fillStyle = '#08080c'; cx.fillRect(tx + PX * 22, ty, PX, PX * 4);
        cx.fillStyle = '#fff8e0'; cx.fillRect(tx + len - PX, ty + PX * 2, PX, PX); gl(tx + len, ty + PX * 2, PX * 8, '#fff0c0', .4); cx.fillStyle = '#ff3030'; cx.fillRect(tx, ty + PX * 3, PX, PX); } }
    // a far town glow off to one side
    const gx = ((W * .8 - skyPar('near')) % (W * 2.2) + W * 2.2) % (W * 2.2) - W * .3; gl(gx, hz - PX * 3, H * .08, '#ff9a50', .1);
    // the far water right under the horizon: a bright sheen; the ground below it is covered by the fields
    cx.fillStyle = mixc(L0(), sk.low, .3); cx.fillRect(0, hz, W, H - hz);
    cx.fillStyle = mixc(sk.low, moonCol, .1); cx.fillRect(0, hz, W, PX * 2);
    return true; }
  const L0 = () => '#0e1a14';

  // warm-up, in steps (each well under 12 ms): the sprites and their reflections, the Scale2x art sizes, the signs, then the field atlases
  function* warmSteps(){ const up = c => { cx.drawImage(c, 0, 0, PX, PX); }; if(!WCV) WCV = document.createElement('canvas');   // the water ramp's one canvas, made here so the first water frame of a ride allocates nothing
    for(const d of [-1, 1]){ for(let v = 0; v < 3; v++){ up(pole(v, d)); up(reflOf(pole(v, d), 'pad_rpole' + v + d)); yield; up(padArtSizes(farm(v, d))); yield; up(reflOf(farm(v, d), 'pad_rfarm' + v + d)); yield; }
      up(bus(d)); up(xing(d)); yield; up(xingHi(d, 2)); yield; up(xingHi(d, 4)); yield; up(shrine(d)); up(reflOf(shrine(d), 'pad_rshrine' + d)); yield; up(crow(d)); up(reflOf(crow(d), 'pad_rcrow' + d)); up(jizo(d));
      for(let v = 0; v < 2; v++){ up(hasa(v, d)); up(reflOf(hasa(v, d), 'pad_rhasa' + v + d)); } yield; }
    up(pylonSpr()); warmSigns(); for(const k in SIGNS) up(SIGNS[k]); cx.clearRect(0, 0, W, H); yield;
    for(const d of [-1, 1]){ for(let v = 0; v < 2; v++){ up(heron(v, d)); up(reflOf(heron(v, d), 'pad_rheron' + v + d)); up(sugi(v, d)); } up(balloon(d)); up(reflOf(balloon(d), 'pad_rball' + d)); up(kei(d)); } yield;
    shimmerBake(); yield; ffBake(); cx.clearRect(0, 0, W, H); yield;
    yield* matBake(); yield* tuftBake(); yield* fieldBake(); cx.clearRect(0, 0, W, H); }

  ENV.paddies = {
    barrier:1.12,
    road:['#1b1c22', '#1e1f26'],
    lampCol:'#58626e',
    place,
    // the landmark jump (setpiece/jump.js): keep the water-pass tick and the delineator posts by the ramp and the landing (not over the gap);
    // the gap's floor covers only the road and its bank (the fields and their mirror run on); in the gap the hole is the same flooded field
    jumpKeep:(sp, o) => sp.type === 'tick' ? true : sp.type === 'deli' ? !jGap(o) : undefined,
    jumpFloor:WX, jumpEdge:false,   // (no parapets: the hole is the same flooded field as the paddies either side, its banks the road's own ends)
    jumpBelow(s, o, fog){ if(!WPAT) return false; const a = s.p1.screen, b = s.p2.screen; if(!a.w || a.y - b.y < .5) return false;
      cx.fillStyle = WPAT; poly(a.x - a.w * WX, a.y, a.x + a.w * WX, a.y, b.x + b.w * WX, b.y, b.x - b.w * WX, b.y, WPAT); return true; },
    lit:(i, s) => s.padLit || 0,
    roadFX,
    fxSolo:true,   // the water is gathered here and drawn later, so in a border blend roadFX runs whole where Paddies has the larger weight
    backdrop,
    draw(sp, x, y, uw, fog, now, sk){ if(sk.low !== fogLow){ fogLow = sk.low; FC.clear(); } SK = sk;
      if(PEND){ PEND = false; LASTI = -1e9; if(sp.s){ cx.restore(); const e0 = EDGE; EDGE = 1; cx.globalAlpha = 1; try{ waterPass(now); } finally { EDGE = e0; cx.globalAlpha = 1; } cx.save(); cx.beginPath(); cx.rect(0, 0, W, sp.s.clip); cx.clip(); } NQ = 0; }
      const f = DRAW[sp.type]; if(f) f(sp, x, y, uw, fog, now); },
    warm(){ for(const _ of warmSteps()); },
    warmSteps,
    _fdbg:() => ({ ok:FAOK, l0:FL0, h:FAT[0] && FAT[0].height, nq:NQ, rows:FDC, vr:[VR0, VR1] }), _fat:FAT, _tat:() => TAT,   // (tests: the field atlases' state)
    // (the old one-piece warm() took 114 ms in a single step; now each step is one sprite family or a slice of the field atlases)
  };
})();
// its shoulders cover the engine's red and white rumble blocks: the engine does not draw its far kerb rows here (laneMark)
ENV.paddies.kerbs = false;
