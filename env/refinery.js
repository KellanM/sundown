/* Sundown environment: Refinery Docks. See env/README.md for the hooks.
   A petrochemical port at night: a far field of a thousand lights under flare-lit smoke, pipe-rack galleries along the road,
   storage tanks with lit rings and stairs, distillation columns with red beacons, flare stacks whose fire lights the underside of
   their own smoke, a container gantry over the road, a tanker moored at the quay, sodium pools and oily wet streaks on the asphalt.

   Reference rules (looked at, then drawn from scratch; nothing copied):
   - Blade Runner (Westwood, 1997): near-black warm base; every light is a small saturated core with a halo, and the haze/smoke at
     ground level is what carries the light; teal against red/orange. -> dark brown-black silhouettes, tiny hot cores, light lives
     in smoke undersides and in the horizon haze.
   - Contra: Hard Corps (Konami, 1994): the far city is a flat dark-blue silhouette with columns of tiny window dots and a jagged red
     fire fringe on the skyline; big forms are 3-tone ramps with one hot rim colour. -> far refinery as flat silhouette strips packed
     with 1-px lights, flare fire as a ragged pixel fringe, near props as 3-4 tone ramps plus one rim.
   - Flashback (Delphine, 1992): industrial pipes as 3-tone tubes (light line, body, shadow line), tube lights as bright bars, grime
     speckle on panels. -> pipe racks drawn as tubes: cool top line (moon), dark body, warm bottom line (sodium from below).
   - Streets of Rage 3 (Sega, 1994) warehouse: background layers collapse into one hue at lower value; red warning lamps on pillars;
     checker dither for transitions. -> each depth layer is one hue/value step, beacons on the tall things, checker-dithered haze bands.
   - Katana Zero (2019): lattice truss towers as background rhythm, rims on top edges of structures. -> lattice flare derricks, crane girder.
   Lighting rule for the near props: warm sodium from the road side, cool teal moon rim on the far side (orange and teal). */
"use strict";
(() => {
  const P = 'rf_';
  const K = '#07060b';                                           // outline: very dark, slightly violet
  const S0 = '#0f0f16', S1 = '#191a23', S2 = '#262634', S3 = '#3c3a48';         // steel ramp
  const O1 = '#4a2a22', O2 = '#8a4a2a', O3 = '#d07a3a', O4 = '#ffc070';         // sodium-lit ramp
  const T1 = '#14303a', T2 = '#1f5660', T3 = '#3f9a9a', T4 = '#8af0e0';         // teal (moon / mercury) ramp
  const AMB = '#ffbe62', WHT = '#fff0c8', TEA = '#6af0dc', RED = '#ff3a2a';
  const slowFl = () => reduce ? 420 : 80;                            // flame frame time: calm under reduced motion

  // ---------------------------------------------------------------- pixel grid sprite with an automatic dark outline
  // painted through ImageData (no per-pixel fillStyle strings), so building is fast and leaves little garbage for a mid-ride GC
  const RGB = {}; const rgb = c => RGB[c] || (RGB[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  function grid(key, w, h, fn, ol){ key = P + key; if(SPR[key]) return SPR[key]; const a = new Array(w * h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) a[y * w + x] = fn(x, y) || null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), img = k.createImageData(w, h), d = img.data;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * w + x; let col = a[i];
      if(!col && ol && ((x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w]))) col = ol;
      if(col){ const [r, g, b] = rgb(col); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; } }
    k.putImageData(img, 0, 0); return SPR[key] = c; }
  const dz = (x, y) => (x + y) & 1;                              // checker for dithered band edges
  const H_ = (n) => hash(n);
  function put(c, x, y, k, flip){ if(!flip) return blit(c, x, y, k); cx.save(); cx.translate(Math.round(x), 0); cx.scale(-1, 1); blit(c, 0, y, k); cx.restore(); }
  // a dithered fill: a 2x2 checker pattern scaled so each cell is one canvas pixel
  function dpat(col){ const key = P + 'pat' + col; if(SPR[key] && SPR[key].px === PX) return SPR[key].p; const c = document.createElement('canvas'); c.width = 2; c.height = 2;
    const k = c.getContext('2d'); k.fillStyle = col; k.fillRect(0, 0, 1, 1); k.fillRect(1, 1, 1, 1); const p = cx.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().scale(PX)); SPR[key] = { p, px:PX }; return p; }

  // ---------------------------------------------------------------- near props
  // storage tank (cone roof), lit from the right (the road), teal moon rim on the left
  const tankSpr = () => grid('tank', 48, 34, (x, y) => { const dx = x + .5 - 24, nx = dx / 20;
    if(y >= 29 && y <= 31 && Math.abs(dx) <= 22) return y === 29 ? (dx > 0 ? '#5a3a2c' : '#2e2a34') : '#1a1820';
    if(Math.abs(dx) > 20) return null;
    if(y < 2) return y === 1 && Math.abs(dx) < 8 && x % 2 ? S3 : null;
    if(y < 7){ const hw = 8 + 12 * ((y - 2) / 4.5); if(Math.abs(dx) > hw) return null; if(Math.abs(dx) > hw - 1.3 || y === 2) return dx > 0 ? O2 : T2; return nx > .7 ? O1 : S2; }
    if(y === 28) return K;
    let c = nx < -.93 ? T3 : nx < -.8 ? T1 : nx < .5 ? S1 : nx < .7 ? (dz(x, y) ? O1 : S1) : nx < .86 ? O1 : nx < .95 ? O2 : O3;
    if(y === 13) return x % 3 === 0 && Math.abs(nx) < .92 ? (H_(x * 7) > .8 ? WHT : AMB) : S0;
    if(y === 14) return x % 3 === 0 && Math.abs(nx) < .92 ? O2 : S2;
    if(y === 15) return x % 2 ? S3 : S0;
    const sx = 6 + (27 - y) * 1.55; if(y > 7 && y < 28 && x >= sx && x < sx + 1.2) return nx > .3 ? O4 : S3;
    if(y > 8 && y < 28 && x >= sx + 1.2 && x < sx + 2.4) return nx > .3 ? O1 : S0;
    if(y === 23 || y === 24) c = nx > .3 ? O2 : nx < -.78 ? T2 : '#24343c';
    if(y % 6 === 0) c = c === O3 ? O2 : c === O2 ? O1 : c === S1 ? S0 : c;
    if(H_(x * 13.1 + y * 7.7) > .94 && nx < .3) c = S2;            // grime speckle
    return c; }, K);
  // spherical gas tank on legs with an equator walkway
  const sphereSpr = () => grid('sphere', 36, 40, (x, y) => { const nx = (x + .5 - 18) / 13, ny = (y + .5 - 15) / 13, d = nx * nx + ny * ny;
    if(d <= 1){ if(y === 15) return x % 3 === 1 ? (H_(x) > .75 ? WHT : AMB) : S0; if(y === 16) return x % 3 === 1 ? O2 : S2;
      const l = nx * .85 - ny * .25; if(d > .8 && nx < -.2) return T3; if(d > .62 && nx < -.4) return T1;
      if(l > .74) return O3; if(l > .6) return O2; if(l > .46) return dz(x, y) ? O2 : O1; if(l > .32) return O1; if(l > .2) return dz(x, y) ? O1 : S1; return ny > .55 ? S0 : S1; }
    if(y >= 22 && y <= 36){ for(const lx of [7, 13, 22, 28]) if(x === lx || x === lx + 1) return x === lx + 1 ? O1 : S2; if(y === 30 && x > 7 && x < 29) return S3; }
    if(y >= 37 && y <= 38 && x > 3 && x < 33) return y === 37 ? '#4a3a30' : '#1a1820';
    return null; }, K);
  // distillation column with platforms, a ladder cage and a side pipe
  const colSpr = () => grid('col', 16, 88, (x, y) => {
    if(y < 2) return null;
    const plat = [16, 30, 44, 58, 72].includes(y), rail = [14, 28, 42, 56, 70].includes(y);
    if(plat && x >= 1 && x <= 14) return x % 3 === 0 ? AMB : S2;
    if(rail && (x === 1 || x === 14)) return S3;
    if(y >= 84 && y <= 86 && x >= 3 && x <= 12) return y === 84 ? O1 : S0;
    if(x >= 5 && x <= 10 && (y >= 6 || (y >= 3 && x >= 6 && x <= 9) || (y === 2 && x >= 7 && x <= 8)) && y < 84){ if(y < 6) return x > 7 ? O2 : T2;
      let c = [T3, T1, S1, S1, O1, O2][x - 5]; if(x === 8 && dz(x, y)) c = O1; if(y % 9 === 0 && c !== T3) c = S0; return c; }
    if(x === 12 && y > 8 && y < 84) return y % 2 ? S3 : null;
    if(x === 13 && y > 8 && y < 84) return S2;
    if(x === 3 && y > 20 && y < 84) return y % 7 === 0 ? O2 : S2;
    return null; }, K);
  // pipe-rack bent: posts, three tiers, tubes cool on top and warm underneath, rows of small lights
  const rackSpr = () => grid('rack', 46, 32, (x, y) => {
    if(y > 30) return null;
    const post = (x >= 2 && x <= 3) || (x >= 22 && x <= 23) || (x >= 42 && x <= 43);
    for(const ty of [8, 16, 24]){
      if(y === ty) return S3;
      if(y === ty + 1) return x % 5 === 2 ? (H_(x * 3 + ty) > .82 ? TEA : H_(x + ty) > .6 ? WHT : AMB) : post ? S1 : S0;
      if(y === ty + 2 && x % 5 === 2) return O2;
      if(y >= ty - 4 && y < ty){ const r = ty - y; const pipeA = x > 0 && x < 45; if(!pipeA) return null;
        if(ty === 8 || (ty === 16 && x < 30) || (ty === 24 && x > 10)){ if(r === 4) return ty === 8 ? T2 : S3; if(r === 3) return S2; if(r === 2) return S1; return O1; }
        if(r <= 2) return r === 2 ? T2 : O1; } }
    if(post && y >= 3) return x % 2 ? O1 : S2;
    if(y > 25 && y < 31){ const d = (x - 4) - (y - 25) * 3; if(x > 3 && x < 22 && d >= 0 && d < 2) return S2; }
    if(y === 30 && x > 0 && x < 45) return '#2a2420';
    return null; }, K);
  // lattice flare derrick with a central riser
  const derrickSpr = () => grid('derrick', 16, 98, (x, y) => { if(y < 4) return x >= 7 && x <= 8 ? (x === 8 ? O3 : S3) : null;
    const t = (y - 4) / 93, lx = Math.round(lerp(6, 1, t)), rx = Math.round(lerp(9, 14, t));
    if(x === lx || x === rx) return x === rx ? O1 : S2;
    if(x === 7 || x === 8) return x === 8 ? O2 : S1;
    if(x > lx && x < rx){ const p = (y - 4) % 12, u = (x - lx) / (rx - lx); if(Math.abs(u - p / 12) < .09 || Math.abs(1 - u - p / 12) < .09) return S2; if(p === 0) return S3; }
    if((y === 8 || y === 46) && x >= 3 && x <= 12) return x % 3 === 0 ? AMB : S3;
    return null; }, K);
  // flame frames: ragged tongue, red tips, orange body, white core (Contra-style hot fringe)
  const flameSpr = f => grid('flame' + f, 11, 20, (x, y) => { const t = y / 19, sway = (H_(f * 31 + y * 3) - .5) * 2.2 * (1 - t), hw = (y > 16 ? 1.6 : 4.6 * Math.pow(t, .55)) + (H_(f * 17 + y) - .5) * 1.4;
    const c = Math.abs(x + .5 - 5.5 - sway) / Math.max(.5, hw); if(c > 1) return (y < 7 && H_(f * 91 + x * 7 + y * 13) > .93) ? '#ff7a20' : null;
    if(t < .22) return c < .5 ? '#ff7a20' : '#b02a18'; if(c < .38 && t > .4) return '#fff4c8'; if(c < .66) return '#ffc040'; if(c < .88) return '#ff7a20'; return '#c0301a'; });
  // smoke / steam puff, underside lit warm by the fire and lamps below, cool moon rim on top
  const puffSpr = v => grid('puff' + v, 20, 14, (x, y) => { const nx = (x + .5 - 10) / 9.5, ny = (y + .5 - 7.5) / 6.5, b = H_(v * 7 + Math.floor(x / 3)) * .25;
    const d = nx * nx + ny * ny + Math.sin(x * .9 + v * 2) * .12; if(d > 1 - b * .3) return null; if(d > .78 - b * .3 && dz(x, y)) return null;
    const lt = ny + nx * .1 + (v === 2 ? .4 : 0); if(lt > .9 && v === 2) return '#ffb050'; if(lt > .68) return v ? '#d07a34' : '#b0602e'; if(lt > .45) return dz(x, y) ? '#8a4a2e' : '#4a3034'; if(lt > 0) return '#3a2c34'; if(lt > -.5) return '#2e2832'; return ny < -.6 && nx < .1 ? '#34505a' : '#28242e'; });
  // container gantry over the road: teal girder, lit warm underneath, hazard-striped legs, hanging container
  const craneSpr = () => grid('crane', 122, 82, (x, y) => {
    const leg = (x >= 8 && x <= 14) || (x >= 107 && x <= 113), inner = x === 14 || x === 107;
    if(y >= 77 && y <= 80){ if((x >= 4 && x <= 18) || (x >= 103 && x <= 117)) return y === 77 ? '#e8b030' : y === 80 ? K : (x % 4 < 2 ? '#2a2830' : '#121118'); return null; }
    if(y >= 0 && y <= 6 && x >= 46 && x <= 75){ if(y === 0) return T3; if(y === 3 && x % 4 === 1) return H_(x) > .5 ? AMB : TEA; return x > 70 ? T1 : T2; }
    if(y >= 7 && y <= 18){ if(y === 7) return T4; if(y === 8) return T3; if(y === 17) return O3; if(y === 18) return x % 8 === 4 ? WHT : O1;
      const q = y - 9, p1 = ((x - q) % 8 + 8) % 8, p2 = ((x + q) % 8 + 8) % 8; if(p1 < 1 || p2 < 1) return T2; if(x === 0 || x === 121) return T2; return null; }
    if(leg && y >= 19 && y <= 76){ if(y >= 62) return ((x + y) >> 1) % 2 ? '#e8b030' : '#1a1418'; const c = inner ? O2 : x === 8 || x === 113 ? T3 : T1;
      if(y % 10 === 0 && !inner) return S0; return c; }
    if(y >= 19 && y <= 22 && x >= 52 && x <= 69) return y === 19 ? S3 : S1;
    if(y >= 23 && y <= 29 && x >= 55 && x <= 66){ if(y >= 24 && y <= 26 && x >= 56 && x <= 65) return x % 3 === 2 ? T2 : (x > 61 ? WHT : T4); return y === 29 ? O1 : S2; }
    if(y >= 30 && y <= 38 && (x === 57 || x === 64)) return S3;
    if(y >= 39 && y <= 40 && x >= 50 && x <= 71) return y === 39 ? '#ffd040' : '#a07018';
    if(y >= 41 && y <= 51 && x >= 49 && x <= 72){ if(y === 41) return '#a83a30'; if(y === 51) return '#2a0c10'; return x % 2 ? '#6a1e1c' : '#4a1416'; }
    return null; }, K);
  // tanker moored at the quay: bow left, lit white superstructure aft, deck lights, reflections in the dock water
  const tankerSpr = f => grid('tanker' + f, 204, 64, (x, y) => {
    if(y >= 55){ const sup = x > 150 && x < 186, r = H_(x * 3.3 + y * (f ? 1.7 : 2.9)); if(sup && x % 3 !== 0 && r > .45) return (x % 7 === 1 ? '#3a8a88' : '#8a6a3a'); if(x % 6 === 0 && x > 10 && x < 200 && r > .5) return '#7a4a28'; return y === 55 ? '#1a1c24' : '#06070b'; }
    if(y >= 34 && y <= 54){ const lx = 3 + Math.max(0, 54 - y) * .0 + (y < 40 ? (40 - y) * -.4 : (y - 40) * .7), rx = 200 - (y - 34) * .15; if(x < lx || x > rx) return null;
      if(y <= 35) return '#b8b0a0'; if(y >= 47 && y <= 48) return '#a02a22'; if(y > 48) return '#1a0c10';
      let c = (x % 14 < 1) ? '#2a1214' : '#3a1a1c'; const pool = Math.abs(((x + 12) % 40) - 20) < 6; if(pool && y < 44) c = dz(x, y) ? '#5a2a22' : '#4a2420'; if(pool && y < 40) c = '#6a3426';
      if(x > 18 && x < 21 && y > 37 && y < 47 && y % 2) return '#e8e0d0'; return c; }
    if(y >= 30 && y <= 33 && x >= 6 && x <= 198){ if(y === 30) return x % 2 ? S3 : null; if(y === 31) return x % 6 === 0 ? AMB : S2; if(y === 32) return x % 6 === 0 ? O2 : S1; return S0; }
    if(x >= 150 && x <= 186 && y >= 9 && y <= 29){ if(y === 9 || y === 10) return x < 152 || x > 184 ? S3 : '#d8d0c0'; const row = [13, 18, 23, 27].includes(y);
      if(row && x > 152 && x < 185 && x % 3 !== 0){ const r = H_(x * 5 + y); return r > .82 ? T4 : r > .35 ? WHT : '#3a3444'; } return x > 180 ? '#8a8478' : dz(x, y) && y > 24 ? '#b8a088' : '#c8b49a'; }
    if(x >= 145 && x <= 191 && y === 11) return '#d8d0c0';
    if(x >= 168 && x <= 178 && y >= 1 && y <= 8) return y === 3 || y === 4 ? '#c83a2a' : y === 1 ? '#3a3846' : '#1a1a22';
    if(x === 160 && y >= 0 && y <= 8) return S3;
    if(x >= 13 && x <= 14 && y >= 12 && y <= 29) return S3;
    if(x >= 90 && x <= 92 && y >= 18 && y <= 29) return S3; if(y >= 18 && y <= 19 && x >= 92 && x <= 110 && (x - 92) / 18 > (y - 18) / 4 - .5) return S2;
    if(y >= 26 && y <= 29 && x >= 30 && x <= 140 && x % 16 < 5) return y === 26 ? S3 : S1;
    return null; }, K);
  const barrierSpr = () => grid('barrier', 16, 8, (x, y) => { if(x < 1 || x > 14 || y < 1 || y > 6) return null; if(y === 1) return '#9a8a70'; if(y === 6) return '#1a1418';
    return (((x - y) >> 1) & 1) ? (y < 3 ? '#e0a82c' : '#b8862a') : '#1a1418'; }, K);

  // the same barrier as geometry up close: an outlined block, hazard stripes as true diagonals on the pixel grid, a lit top edge; so the road edge
  // stays crisp and readable as it passes the bike instead of becoming 16 stair-stepped blocks
  function barrierGeo(x, y, k, fog, low){ const F = c => mixc(c, low, fog * .8), x0 = x - 8 * k, top = y - 8 * k;
    cx.fillStyle = F(K); pxRect(x0 + k, top, 14 * k, 8 * k); pxRect(x0, top + k, 16 * k, 6 * k);
    const ix0 = x0 + k, ix1 = x0 + 15 * k, iy0 = top + 2 * k, iy1 = top + 6 * k; cx.fillStyle = F('#1a1418'); pxRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    cx.save(); cx.beginPath(); cx.rect(snap(ix0), snap(iy0), snap(ix1) - snap(ix0), snap(iy1) - snap(iy0)); cx.clip();
    for(let m = -3; m < 8; m += 2){ const a0 = ix0 + (2 * m - 1) * k, c0 = F('#b8862a'); poly(a0, iy0, a0 + 2 * k, iy0, a0 + 6 * k, iy1, a0 + 4 * k, iy1, c0); poly(a0, iy0, a0 + 2 * k, iy0, a0 + 3 * k, iy0 + k, a0 + k, iy0 + k, F('#e0a82c')); }
    cx.restore(); cx.fillStyle = F('#9a8a70'); pxRect(ix0, top + k, ix1 - ix0, k); }
  // ---------------------------------------------------------------- the far refinery: wide silhouette strips packed with lights
  // Built once into canvases measured in canvas pixels; tiled across the screen with parallax. Flame and beacon spots are recorded
  // so they can be animated on top.
  function buildStrip(key, w, h, seed, opt){ const k0 = P + key; if(SPR[k0]) return SPR[k0];
    const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'); const fl = [], bc = [];
    const R = (n) => hash(seed * 977 + n), px = (x, y, col, ww = 1, hh = 1) => { k.fillStyle = col; k.fillRect(x, y, ww, hh); };
    const lightCol = (n) => { const r = R(n); return r > .93 ? opt.teal : r > .7 ? opt.white : r > .66 ? RED : opt.amb; };
    const dots = (x0, y0, ww, hh, dens, n) => { for(let yy = y0; yy < y0 + hh; yy += 2) for(let xx = x0; xx < x0 + ww; xx++) if(R(n + xx * 1.37 + yy * 9.1) < dens) px(xx, yy, lightCol(n + xx * 3 + yy)); };
    px(0, h - opt.base, w, opt.base, opt.sil); dots(0, h - opt.base + 1, w, opt.base - 1, .12, 5);
    let x = 2, n = 0;
    while(x < w - 12){ n++; const r = R(n * 11), bot = h - opt.base;
      if(r < .22){ // tank cluster
        const cnt = 2 + (R(n * 5) * 3 | 0); for(let t = 0; t < cnt && x < w - 20; t++){ const tw = opt.s * (8 + R(n * 7 + t) * 8 | 0), th = opt.s * (4 + R(n * 9 + t) * 4 | 0); px(x, bot - th, tw, th, opt.sil); px(x + 1, bot - th - 1, tw - 2, 1, opt.sil);
          px(x + 1, bot - th - 1, tw - 2, 1, opt.rim); for(let xx = x + 1; xx < x + tw - 1; xx += 2) if(R(xx * 2.1 + t) > .35) px(xx, bot - (th >> 1), 1, 1, opt.amb); x += tw + 1; } }
      else if(r < .42){ // distillation column(s)
        const cw = opt.s * (2 + (R(n * 3) * 2 | 0)), ch = Math.round(h * (.35 + R(n * 4) * .45)); px(x, bot - ch, cw, ch, opt.sil); px(x, bot - ch, 1, ch, opt.rimT);
        for(let yy = bot - ch + 3; yy < bot; yy += 4 + (R(n) * 3 | 0)){ px(x - 1, yy, cw + 2, 1, opt.sil); if(R(yy + n) > .25) px(x - 1, yy, 1, 1, lightCol(yy * 3 + n)); if(R(yy * 2 + n) > .35) px(x + cw, yy, 1, 1, lightCol(yy * 5 + n)); }
        bc.push([x + (cw >> 1), bot - ch - 1, R(n * 13) * 6]); x += cw + 3 + (R(n * 6) * 6 | 0); }
      else if(r < .68){ // pipe rack gallery: tiers with see-through gaps, lights under every tier
        const rw = opt.s * (14 + (R(n * 8) * 22 | 0)), tiers = 2 + (R(n * 2) * 3 | 0); for(let tt = 0; tt < tiers; tt++){ const yy = bot - 3 - tt * (3 + opt.s); px(x, yy, rw, 1, opt.sil); px(x, yy - 1, rw, 1, opt.rim);
          for(let xx = x; xx < x + rw; xx++) if(R(xx * 1.9 + tt * 31 + n) < .42) px(xx, yy + 1, 1, 1, lightCol(xx * 7 + tt + n)); }
        for(let xx = x; xx < x + rw; xx += 5 + opt.s) px(xx, bot - 3 - (tiers - 1) * (3 + opt.s), 1, (tiers - 1) * (3 + opt.s) + 3, opt.sil);
        x += rw + 2; }
      else if(r < .78){ // flare stack: thin riser, flame recorded
        const fh = Math.round(h * (.55 + R(n * 4) * .4)); px(x, bot - fh, opt.s, fh, opt.sil); px(x - 1, bot - (fh >> 1), opt.s + 2, 1, opt.sil); fl.push([x + (opt.s >> 1), bot - fh, R(n * 17) * 10]); x += 6 + (R(n) * 8 | 0); }
      else if(r < .88){ // lattice tower
        const th = Math.round(h * (.45 + R(n * 4) * .35)), tw = 3 + opt.s * 2; for(let yy = 0; yy < th; yy++){ const sh = Math.round((1 - yy / th) * (tw / 2)); px(x + (tw >> 1) - sh, bot - yy, 1, 1, opt.sil); px(x + (tw >> 1) + sh, bot - yy, 1, 1, opt.sil); if(yy % 4 === 0) px(x + (tw >> 1) - sh, bot - yy, sh * 2 + 1, 1, opt.sil); if(yy % 4 === 2) px(x + (tw >> 1), bot - yy, 1, 1, opt.sil); }
        bc.push([x + (tw >> 1), bot - th - 1, R(n * 19) * 6]); x += tw + 3; }
      else { // sphere tanks
        const rr0 = opt.s * (3 + (R(n) * 2 | 0)); for(let yy = -rr0; yy <= rr0; yy++){ const hw = Math.round(Math.sqrt(rr0 * rr0 - yy * yy)); px(x + rr0 - hw, bot - rr0 - 2 + yy, hw * 2 + 1, 1, opt.sil); }
        px(x + 1, bot - 2, 1, 2, opt.sil); px(x + rr0 * 2 - 1, bot - 2, 1, 2, opt.sil); px(x + rr0 - 2, bot - 2 * rr0 - 2, 4, 1, opt.rim);
        for(let xx = x + 1; xx < x + rr0 * 2; xx += 2) px(xx, bot - rr0 - 2, 1, 1, R(xx) > .3 ? opt.amb : opt.white); x += rr0 * 2 + 2; } }
    c.fl = fl; c.bc = bc; return SPR[k0] = c; }
  const farStrip = () => buildStrip('far', 520, 46, 3, { s:1, base:5, sil:'#16161f', rim:'#3a2a26', rimT:'#1e2a32', amb:'#d89a58', white:'#e8d8b8', teal:'#5ac8c0' });
  const midStrip = () => buildStrip('mid', 440, 84, 11, { s:2, base:6, sil:'#0b0b11', rim:'#4a2c22', rimT:'#16323a', amb:AMB, white:WHT, teal:TEA });

  const shOff = (r, now) => { const v = Math.sin(r * .55 + now / 140) + Math.sin(r * 1.3 - now / 230) * .6; return v > 1.05 ? 1 : v < -1.05 ? -1 : 0; };
  function tile(strip, off, base, now, flameK, shimmer){ const sw = strip.width * PX, o = ((off % sw) + sw) % sw;
    const top0 = Math.round(base - strip.height * PX);
    for(let x0 = -o; x0 < W; x0 += sw){
      if(shimmer && !reduce){ // heat haze over the distant plant: runs of rows nudged one pixel sideways, no canvas read-back
        let ry = 0; while(ry < strip.height){ const off = shOff(ry, now); let e = ry + 1; while(e < strip.height && shOff(e, now) === off) e++;
          cx.drawImage(strip, 0, ry, strip.width, e - ry, Math.round(x0) + off * PX, top0 + ry * PX, sw, (e - ry) * PX); ry = e; } }
      else blit(strip, x0 + sw / 2, base, PX);
      const top = base - strip.height * PX;
      for(const [fx, fy, s] of strip.fl){ const sx = x0 + fx * PX, sy = top + fy * PX; if(sx < -60 || sx > W + 60) continue;
        const fr = Math.floor(now / slowFl() + s) % 4, fk = PX * flameK, fh = 20 * fk; const fl = reduce ? 1 : .85 + .15 * Math.sin(now / 70 + s * 3);
        glow(sx, sy - fh * .5, fh * 2.6 * fl, '#ff6a20', .32); blit(flameSpr(fr), sx, sy + PX, fk); }
      for(const [bx, by, s] of strip.bc){ if(Math.sin(now / 520 + s) > .25){ const sx = x0 + bx * PX, sy = top + by * PX; cx.fillStyle = RED; pxRect(sx - PX / 2, sy - PX, PX, PX); } } } }

  // smoke banks drifting over the plant, lit from beneath by the flares (the Blade Runner rule: the light lives in the smoke)
  const bankSpr = v => grid('bank' + v, 96, 22, (x, y) => { let top = 22; for(let j = 0; j < 5; j++){ const cxp = 12 + j * 18 + H_(v * 9 + j) * 8, r = 7 + H_(v * 5 + j) * 6; const dx = x - cxp; if(Math.abs(dx) < r) top = Math.min(top, 21 - Math.sqrt(r * r - dx * dx) * 1.1); }
    if(y < top) return null; if(y < top + 1 && dz(x, y)) return null; const d = 21 - y;
    if(d < 2) return dz(x, y) && d < 1 ? null : '#8a4424'; if(d < 4) return dz(x, y) ? '#8a4424' : '#4a2620'; if(d < 7) return dz(x, y) ? '#3a1e1e' : '#26161c'; return y < top + 2 ? '#2e3038' : '#1c1419'; });

  // ---------------------------------------------------------------- road placement
  const gateAt = i => typeof gates !== 'undefined' && gates.includes(i);
  const rackSide = i => Math.floor(i / 96) % 2 ? 1 : -1;
  const flareSide = i => Math.floor(i / 48) % 2 ? 1 : -1;
  function place(i, s){
    const rs = rackSide(i), ts = -rs, nearTanker = Math.abs(i % 360 - 200) < 28, tkSide = Math.floor(i / 360) % 2 ? 1 : -1;
    s.sprites.push({ env:'refinery', type:'rack3', side:rs, x:rs * RK_X, xo:rs * RK_X, b0:i - i % 96, len:96, k:i });   // the rack: one run per 96-segment block (pushed before the lamps, which stand in front of it)
    if(i % 12 === 0){ s.sprites.push({ env:'refinery', type:'lamp', x:-1.13 }, { env:'refinery', type:'lamp', x:1.13 }); }
    if(i % 4 === 2) s.sprites.push({ env:'refinery', type:'barrier', x:ts * 1.24, k:i, beacon:i % 24 === 2 });
    if(i % 7 === 0 && !(nearTanker && ts === tkSide)){ const sph = Math.random() < .35; s.sprites.push({ env:'refinery', type:sph ? 'sphere' : 'tank', x:ts * (sph ? rr(1.9, 2.4) : rr(2.15, 3.1)), k:i, steam:Math.random() < .35 }); }
    if(i % 11 === 5){ const sd = Math.random() < .5 ? 1 : -1; if(!(nearTanker && sd === tkSide)) s.sprites.push({ env:'refinery', type:'col', x:sd * rr(2.9, 4.2), k:i, steam:Math.random() < .3 }); }
    if(i % 48 === 24) s.sprites.push({ env:'refinery', type:'flare', x:flareSide(i) * 2.9, k:i });
    if(i % 240 === 60 && !gateAt(i)) s.sprites.push({ env:'refinery', type:'crane', x:0, k:i });
    if(i % 360 === 200) s.sprites.push({ env:'refinery', type:'tanker', x:tkSide * 5.4, k:i });
  }
  function lit(i){ const d = Math.min(i % 12, 12 - i % 12), lamp = Math.max(0, 1 - d / 3.2), df = Math.abs(i % 48 - 24), fl = Math.max(0, 1 - df / 8) * .75, dc = Math.abs(i % 240 - 60), cr = Math.max(0, 1 - dc / 4) * .9;
    return Math.max(lamp, fl, cr); }

  // ---------------------------------------------------------------- drawing the props
  // a smoke/steam column: one sprite whose noise scrolls upward frame by frame; hot = flare smoke lit from below by the fire
  const HOT = ['#ffb050', '#d07034', '#7a3e2c', '#5a3030', '#3a2a32', '#2a242e'], STEAM = ['#e0b088', '#a07a68', '#6a5a62', '#4a4452', '#36323e', '#2a2834'];
  const plumeSpr = (f, hot) => grid('plume' + f + hot, 26, 46, (x, y) => { const t = 1 - y / 45, n = (yy) => hash(yy * 7.3 + x * .0 + 11) - .5, yy = y + f * 3;
    const c0 = 13 + Math.sin(t * 3.2 + 1) * 3 * t + n(yy) * 1.2 * t, hw = 1.8 + t * 9 + (hash(Math.floor(yy / 3) * 5.1 + 2) - .5) * 3 * t;
    const e = Math.abs(x + .5 - c0) - hw + (hash(x * 3.7 + yy * 9.1) - .5) * 2; if(e > 0) return null; if(e > -1.2 && dz(x, y)) return null;
    if(t > .62 && hash(x * 5.3 + yy * 2.9) < (t - .62) * 1.6) return null;
    const P = hot ? HOT : STEAM, lit = t - (x + .5 - c0) / 40; let i = lit < .1 ? 0 : lit < .22 ? 1 : lit < .36 ? (dz(x, y) ? 1 : 2) : lit < .5 ? (dz(x, y) ? 2 : 3) : lit < .7 ? 4 : 5;
    if(!hot && i === 0) i = 1; if(i >= 4 && e > -2 && x + .5 < c0) return '#34505a'; return P[i]; });
  function plume(x, base, k, now, seed, a, hot){ if(a < .4) return; const f = Math.floor(now / (reduce ? 900 : 200) + seed * 7) & 3, sw = Math.sin(now / 1500 + seed * 9) * k * 2;
    const ga = cx.globalAlpha; cx.globalAlpha = a * (hot ? .95 : .7); blit(plumeSpr(f, hot ? 1 : 0), x + sw, base, k); cx.globalAlpha = ga; }
  // ---------------------------------------------------------------- the pipe rack as projected geometry (2026-11-19, buildings3d; the shared
  // kit ENV.bkit in env/buildings.js). A real rack runs along the road: steel bents every five segments (two posts, three tiered beams with
  // their row of small lights), and the pipes lying along it on each tier, cool steel on top and sodium-warm underneath. It was a sprite of a
  // bent repeated every five segments (pipes as lateral stubs) that faded out beside you; now the pipes are continuous and it never fades.
  const RK_X = 1.62, RK_W = .5, RK_T = [.2, .38, .56], RK_P = [[.04, .075, 1], [.15, .055, 0], [.26, .07, 1], [.36, .05, 0], [.45, .065, 1]];
  const PH = '#6c7290';   // a pipe's moonlit top line: brighter and cooler than the matte steel of the bents, so the pipes read as tubes
  const RFQ = new Map(); let rfLow = '';
  const rfc = (c, fog, low) => { if(low !== rfLow){ rfLow = low; RFQ.clear(); } const q = Math.round(fog * 16), k = c + q; let v = RFQ.get(k); if(!v){ v = mixc(c, low, q / 16 * .85); RFQ.set(k, v); } return v; };
  function drawRack3(sp, x, y, uw, fog, now, sk){ const K = ENV.bkit; if(!K) return;
    K.fade(fog, .55, () => { const m = K.begin(sp, x, y, uw, fog, 0); if(!m || !K.vis(RK_X, RK_X + RK_W)) return; const F = c => rfc(c, fog, sk.low), rel = K.rel, near = fog < .12, mid = fog < .14, X = RK_X, X1 = X + RK_W;
      const lat = (h0, h1, t, col) => poly(K.px(X, 0, t), K.py(0, h0, t), K.px(X1, 0, t), K.py(0, h0, t), K.px(X1, 0, t), K.py(0, h1, t), K.px(X, 0, t), K.py(0, h1, t), col);
      // the far posts of each bent first, then the pipes (far ones first), then the near posts and the beams
      const bents = []; for(let r = rel - (rel % 5 + 5) % 5; r <= rel + m; r += 5){ const t = (r - rel) / m; if(t >= 0 && (t < 1 || rel + m >= sp.len)) bents.push([t, r]); }
      if(fog < .3) for(const [t] of bents) K.V(X1, 0, RK_T[2] + .02, t, .025, F(S1));
      // round pipes, not shelves (round 4): past the nearest slices each tier was a flat deck. Now, out to fog .2, the deck is gone and the
      // big pipes lie one by one with the night between them, each a band with a moonlit top line and a sodium-warm underside (round in
      // three tones), never thinner than a screen pixel so it never breaks into dashes. The top tier's two big lines rise over an expansion
      // loop (rel 40..52 of every run): the risers with their bends, and the raised run.
      // a pipe's band along the slice at lateral L, centred at height hc: th tall, never under one screen pixel (a thin quad would break up)
      const ln = (L, hc, th, ta, tb, col) => { const xa = K.px(L, 0, ta), xb = K.px(L, 0, tb), ya = K.py(0, hc, ta), yb = K.py(0, hc, tb), t0 = Math.max(PX, th * K.pu(ta)), t1 = Math.max(PX, th * K.pu(tb)); poly(xa, ya - t0 / 2, xb, yb - t1 / 2, xb, yb + t1 / 2, xa, ya + t0 / 2, col); };
      const LA = 40, LB = 52, la = clamp((LA - rel) / m, 0, 1), lb = clamp((LB - rel) / m, 0, 1), LIFT = .2;
      for(let ti = 2; ti >= 0; ti--){ const h = RK_T[ti] + .02, full = near && m === 1;
        if(!full && fog >= .2){ K.Q(X, h + .07, X1, h + .07, 0, 1, F(S1)); K.Q(X, h, X, h + .075, 0, 1, F(S2)); K.Q(X, h + .06, X, h + .075, 0, 1, F(ti === 2 ? T2 : S3)); if(ti === 0) K.Q(X, h, X, h + .022, 0, 1, F(O2)); continue; }
        for(let pi = RK_P.length - 1; pi >= 0; pi--){ const [l, d, big] = RK_P[pi]; if(!full && !big) continue; if((ti === 1 && pi === 4) || (ti === 2 && pi === 1)) continue; const L = X + l * (RK_W / .5), lp = ti === 2 && (pi === 0 || pi === 2);
          const run = (hh, ta, tb) => { if(tb - ta < .001) return; if(full || d * K.pu(tb) > PX * (ti === 0 ? 2 : 1)) ln(L, hh + d * .5, d, ta, tb, F(big ? S2 : S1)); if(full || ti === 0) ln(L, hh + d * .14, d * .28, ta, tb, F(ti === 0 ? O2 : O1)); ln(L, hh + d * .89, d * .22, ta, tb, F(ti === 2 ? (big ? T3 : T2) : PH)); };
          if(!lp || la >= 1 || lb <= 0) run(h, 0, 1);
          else { run(h, 0, la); run(h, lb, 1); run(h + LIFT, la, lb);
            // the risers and their bends, where the loop starts and ends inside this slice
            for(const [tt, on] of [[la, LA >= rel && LA < rel + m], [lb, LB > rel && LB <= rel + m]]){ if(!on) continue; const u = K.pu(tt), w = d * (RK_W / .5); K.V(L + w / 2, h, h + LIFT + d, tt, w, F(S2)); K.V(L + w * .28, h + d * .5, h + LIFT + d * .5, tt, w * .3, F(S3));
              if(u * w > PX * 3){ K.V(L + w / 2, h + LIFT + d * .55, h + LIFT + d, tt, w * 1.3, F(S3)); K.V(L + w / 2, h, h + d * .45, tt, w * 1.3, F(S3)); } } } } }
      if(fog < .45) for(const [t, r] of bents){ K.V(X, 0, RK_T[2] + .02, t, .03, F(S2)); if(near) K.V(X, 0, RK_T[2] + .02, t, .01, F(S3));
        for(const h of RK_T){ lat(h - .015, h + .02, t, F(S2)); if(fog < .3){ lat(h - .015, h - .005, t, F(S1));
            for(let c = 0; c < 4; c++){ const L = X + RK_W * (c + .5) / 4, hv = hash(r * 3.1 + h * 17 + c), col = hv > .82 ? TEA : hv > .55 ? WHT : AMB; const u = K.pu(t), s = Math.max(PX, snap(u * .012)); cx.fillStyle = col; cx.fillRect(snap(K.px(L, 0, t) - s / 2), snap(K.py(0, h - .02, t)), s, s); } } }
        // a diagonal brace in the lowest bay
        if(mid){ const a = K.px(X, 0, t), b = K.px(X1, 0, t), ya = K.py(0, .02, t), yb = K.py(0, RK_T[0] - .02, t); poly(a, ya, b, yb, b, yb + PX, a, ya + PX, F(S2)); } }
      // warm sodium light caught along the pipes' undersides near the lamps
      if(near && sp.k % 12 < 2) K.spill(X - .3, X, 0, 1, '255,150,60', .05);
      // the start of a rack run: the pipes turn down into the ground in elbows
      // the start of a rack run: the bottom tier's pipes drop into the ground through elbows (lit strip, shade strip, collar, footing
      // flange); the upper tiers end in blind flanges, a disc a little wider than the pipe with its moonlit upper left
      // a round disc on the end plane: two crossed rectangles cut its corners, so at a few pixels it reads round, not as a box
      const disc = (ci, cj, r, col) => { K.E(ci - r * .72, cj - r, ci + r * .72, cj + r, col); K.E(ci - r, cj - r * .72, ci + r, cj + r * .72, col); };
      if(K.end){ const h0 = RK_T[0] + .02; for(const [l, d] of RK_P){ const L = X + l * (RK_W / .5);
          K.E(L, 0, L + d, h0 + d, F(S2)); K.E(L, .02, L + d * .3, h0 + d * .8, F(S3)); K.E(L + d * .74, .02, L + d, h0 + d * .8, F(S0)); K.E(L - .006, h0 + d * .55, L + d + .006, h0 + d + .004, F(S3)); K.E(L - .006, h0 + d * .9, L + d + .006, h0 + d + .004, F(T2)); K.E(L - .01, 0, L + d + .01, .022, F(S3));
          for(const ti of [1, 2]){ if((ti === 1 && l === RK_P[4][0]) || (ti === 2 && l === RK_P[1][0])) continue; const h = RK_T[ti] + .02, r = d / 2 + .008, ci = L + d / 2, cj = h + d / 2; disc(ci, cj, r, F(S3)); disc(ci - r * .12, cj + r * .12, r * .82, F(ti === 2 ? T3 : PH)); disc(ci + r * .06, cj - r * .06, r * .7, F(S1)); } } } }); }
  // ---------------------------------------------------------------- tanks, spheres, columns and flare derricks as geometry up close
  // (2026-11-20, buildings3d). A vertical cylinder or a sphere looks the same from every side, so the card was the right shape; what was
  // wrong was the scale: past ~6 screen pixels per art pixel it turned into blocks and had to fade out beside you. Now, once an art pixel
  // would pass ~1.4 screen pixels, the same design is drawn at screen resolution: the shading as smooth stepped bands across the true
  // width (round, never blocky), and every ring, rail, ladder, brace and light as a line one screen pixel thin. It never fades out.
  let GX = 0, GY = 0, GK = 1, GF = 1, GC = 0, GH = 0;
  const gx = ax => GX + GF * (ax - GC) * GK, gy = ay => GY - (GH - ay) * GK;
  function gR(ax0, ay0, ax1, ay1, col){ const a = gx(ax0), b = gx(ax1); cx.fillStyle = col; const x0 = snap(Math.min(a, b)), x1 = snap(Math.max(a, b)), y0 = snap(gy(ay0)), y1 = snap(gy(ay1)); if(x1 > x0 && y1 > y0 && x1 > 0 && x0 < W) cx.fillRect(x0, y0, x1 - x0, y1 - y0); }
  // a line between two art points, w screen pixels thick (at least one)
  function gL(ax0, ay0, ax1, ay1, w, col){ const x0 = gx(ax0), y0 = gy(ay0), x1 = gx(ax1), y1 = gy(ay1), t = Math.max(PX, w); if(Math.abs(x1 - x0) < Math.abs(y1 - y0)) poly(x0 - t / 2, y0, x0 + t / 2, y0, x1 + t / 2, y1, x1 - t / 2, y1, col); else poly(x0, y0 - t / 2, x1, y1 - t / 2, x1, y1 + t / 2, x0, y0 + t / 2, col); }
  // a dot: a small square light, at least one screen pixel
  function gD(ax, ay, col, s){ const z = Math.max(PX, snap(GK * (s || .8))); cx.fillStyle = col; cx.fillRect(snap(gx(ax) - z / 2), snap(gy(ay) - z / 2), z, z); }
  const gSet = (x, y, k, flip, c0, h) => { GX = x; GY = y; GK = k; GF = flip ? -1 : 1; GC = c0; GH = h; };
  // a cylinder's body between art rows ay0..ay1, radius rr about the centre: bands of shade by the surface normal (lit from the road side,
  // a teal moon rim on the far side); `cols` = [[nx from, colour], ...] in ascending nx
  function gCyl(ay0, ay1, rr, cols){ for(let i = 0; i < cols.length; i++){ const n0 = cols[i][0], n1 = i + 1 < cols.length ? cols[i + 1][0] : 1; gR(GC + n0 * rr, ay0, GC + n1 * rr, ay1, cols[i][1]); } }
  const TANKB = [[-1, T3], [-.93, T1], [-.8, S1], [.5, '#32221f'], [.7, O1], [.86, O2], [.95, O3]];
  function tankGeo(x, y, k, flip, steam, sp, now, a){ gSet(x, y, k, flip, 24, 34); const th = PX;
    gR(2, 29, 46, 32, '#1a1820'); gR(24, 29, 46, 30, '#5a3a2c'); gR(2, 29, 24, 30, '#2e2a34');
    gCyl(7, 28, 20, TANKB); gR(4, 28, 44, 29, K);
    // the cone roof: the slope, its sodium-lit shoulder on the road side, a moonlit teal rim on the far side, the hatch on top
    { const p = (ax, ay) => [gx(ax), gy(ay)], a0 = p(4, 7), a1 = p(44, 7), b1 = p(32, 2), b0 = p(16, 2); poly(a0[0], a0[1], a1[0], a1[1], b1[0], b1[1], b0[0], b0[1], S2); const c1 = p(38, 7), d1 = p(29.6, 2); poly(c1[0], c1[1], a1[0], a1[1], b1[0], b1[1], d1[0], d1[1], O1);
      gL(44, 7, 32, 2, th, O2); gL(4, 7, 16, 2, th, T2); gL(16, 2, 32, 2, th, T2); gR(20, 1, 28, 2, S3); }
    // rings, the lit walkway with its row of lamps and the rail, the painted band, the spiral stair climbing the road side
    for(const ay of [12, 18, 24]){ cx.globalAlpha = a * .7; gL(4.4, ay, 43.6, ay, th, S0); cx.globalAlpha = a; }
    gL(4.4, 15, 43.6, 15, th, S3); gL(4.4, 13.6, 43.6, 13.6, th, S0); for(let ax = 6; ax < 43; ax += 3) gD(ax, 13.2, H_(ax * 7) > .8 ? WHT : AMB, .9);
    gR(4.4, 23, 8.4, 25, T2); gR(8.4, 23, 30, 25, '#24343c'); gR(30, 23, 43.6, 25, O2);
    gL(35.5, 8, 30, 11.6, Math.max(PX, k * 1.1), S3); gL(30, 11.6, 6, 27, Math.max(PX, k * 1.1), S3); gL(36.3, 8.4, 30.6, 12, th, O4); }
  function sphereGeo(x, y, k, flip, a){ gSet(x, y, k, flip, 18, 40);
    // legs, the brace between them, the footing
    for(const lx of [7.5, 13.5, 22.5, 28.5]) gR(lx - .7, 22, lx + .7, 37, lx > 18 ? O1 : S2); gL(8, 30, 28, 30, PX, S3); gR(4, 37, 32, 38, '#4a3a30'); gR(4, 38, 32, 39, '#1a1820');
    // the ball: rows of stepped shade (sodium from the road side, moon rim on the far side), drawn one screen pixel row at a time
    const r = 13 * k, cy = gy(15.5), cxp = gx(18.5 - (flip ? 1 : 0)), L = [[.74, O3], [.6, O2], [.46, O1], [.32, O1], [.2, S1]];
    // only the rows and columns on screen are walked (beside the bike the ball is thousands of pixels across: walking all of it cost ~0.1-90 s a frame)
    // the screen in drawing units (a set piece may have the canvas under a camera transform: the jump's look-down zooms and tilts it)
    const mi = cx.getTransform().invertSelf(), cw = cx.canvas.width, chh = cx.canvas.height; let vx0 = Infinity, vx1 = -Infinity, vy0 = Infinity, vy1 = -Infinity;
    for(const [qx, qy] of [[0, 0], [cw, 0], [0, chh], [cw, chh]]){ const ux = mi.a * qx + mi.c * qy + mi.e, uy = mi.b * qx + mi.d * qy + mi.f; vx0 = Math.min(vx0, ux); vx1 = Math.max(vx1, ux); vy0 = Math.min(vy0, uy); vy1 = Math.max(vy1, uy); }
    if(!(vx1 > vx0 && vy1 > vy0)){ vx0 = vy0 = -1e9; vx1 = vy1 = 1e9; }   // a degenerate transform: walk everything, as before
    const y00 = snap(cy - r), yS = y00 + Math.max(0, Math.ceil((vy0 - PX - y00) / PX)) * PX, yE = Math.min(cy + r, vy1 + PX);
    for(let yy = yS; yy < yE; yy += PX){ const ny = (yy + PX / 2 - cy) / r, hw = Math.sqrt(Math.max(0, 1 - ny * ny)) * r; if(hw < PX * .5) continue; let run = null, rx = 0, xs;
      const xl = GF > 0 ? vx0 - cxp - 2 * PX : cxp - vx1 - 2 * PX, xE = Math.min(hw + PX * .5, GF > 0 ? vx1 - cxp + 2 * PX : cxp - vx0 + 2 * PX);
      for(xs = -hw + Math.max(0, Math.floor((xl + hw) / PX)) * PX; xs <= xE; xs += PX){ let col = null; if(xs < hw){ const nx = (xs + PX / 2) / r, d = nx * nx + ny * ny, l = nx * .85 - ny * .25;
          col = d > .8 && nx < -.2 ? T3 : d > .62 && nx < -.4 ? T1 : l > .74 ? O3 : l > .6 ? O2 : l > .32 ? O1 : l > .2 ? S1 : ny > .55 ? S0 : S1; }
        if(col !== run){ if(run){ const s0 = snap(cxp + GF * rx), s1 = snap(cxp + GF * xs); cx.fillStyle = run; cx.fillRect(Math.min(s0, s1), yy, Math.abs(s1 - s0), PX); } run = col; rx = xs; } }
      if(run && xE < hw + PX * .5){ const s0 = snap(cxp + GF * rx), s1 = snap(cxp + GF * xs); cx.fillStyle = run; cx.fillRect(Math.min(s0, s1), yy, Math.abs(s1 - s0), PX); } }   // a run cut off past the screen edge (a run left open at the far rim stays undrawn, as it always was)
    gL(5, 15.5, 31, 15.5, PX, S0); gL(5, 16.5, 31, 16.5, PX, S2); for(let ax = 7; ax < 30; ax += 3) gD(ax, 15.5, H_(ax) > .75 ? WHT : AMB, .9); }
  function colGeo(x, y, k, flip, a){ gSet(x, y, k, flip, 8, 88);
    gCyl(6, 84, 3, [[-1, T3], [-.66, T1], [-.33, S1], [.33, O1], [.66, O2]]); gL(6, 4, 7, 2.2, PX, T2); gR(6, 3, 10, 6, O2); gR(6, 3, 8, 6, T2); gR(7, 2, 9, 3, S3);
    for(let ay = 9; ay < 84; ay += 9){ cx.globalAlpha = a * .7; gL(5, ay, 11, ay, PX, S0); cx.globalAlpha = a; }
    gL(12.5, 9, 12.5, 84, PX, S3); gL(13.5, 9, 13.5, 84, Math.max(PX, k * .9), S2); gL(3.5, 20, 3.5, 84, Math.max(PX, k * .9), S2);
    for(const ay of [16, 30, 44, 58, 72]){ gR(1, ay, 15, ay + 1, S2); gL(1, ay - 2, 15, ay - 2, PX, S3); gL(1.5, ay - 2, 1.5, ay, PX, S3); gL(14.5, ay - 2, 14.5, ay, PX, S3); for(let ax = 3; ax < 15; ax += 3) gD(ax, ay + .5, AMB, .7); }
    gR(3, 84, 13, 85, O1); gR(3, 85, 13, 87, S0); }
  function derrickGeo(x, y, k, flip, a){ gSet(x, y, k, flip, 8, 98); const w = Math.max(PX, k * .9);
    gL(6.5, 4, 1.5, 97, w, S2); gL(9.5, 4, 14.5, 97, w, O1); gL(7.5, 2, 7.5, 97, w, S1); gL(8.5, 2, 8.5, 97, PX, O2);
    for(let ay = 4; ay < 97; ay += 12){ const t0 = (ay - 4) / 93, t1 = Math.min(1, (ay + 12 - 4) / 93), l0 = lerp(6.5, 1.5, t0), r0 = lerp(9.5, 14.5, t0), l1 = lerp(6.5, 1.5, t1), r1 = lerp(9.5, 14.5, t1);
      gL(l0, ay, r0, ay, PX, S3); gL(l0, ay, r1, Math.min(97, ay + 12), PX, S2); gL(r0, ay, l1, Math.min(97, ay + 12), PX, S2); }
    for(const ay of [8, 46]){ const t = (ay - 4) / 93; gL(lerp(6.5, 1.5, t) - 1, ay, lerp(9.5, 14.5, t) + 1, ay, Math.max(PX, k * .8), S3); for(let ax = 3; ax <= 13; ax += 3) gD(ax, ay - .8, AMB, .7); }
    gR(7, 1, 9, 4, S3); gR(8, 1, 9, 4, O3); }
  const GEO_K = PXk => PXk > PX * 1.4;
  function draw(sp, x, y, uw, fog, now, sk){ if(sp.type === 'rack3') return drawRack3(sp, x, y, uw, fog, now, sk); const a = 1 - fog * .8; if(a < .05 || uw < .6) return; cx.globalAlpha = a; const flip = sp.x > 0, near = fog < .55;
    switch(sp.type){
      case 'lamp': { const h = uw * 1.05, dir = -Math.sign(sp.x), ax = x + dir * uw * .3, hy = y - h; cx.fillStyle = mixc('#0c0a12', sk.low, fog * .8); pxRect(x - uw * .014, hy, uw * .028 + 1, h); pxRect(Math.min(x, ax), hy, Math.abs(ax - x), uw * .022 + 1);
        if(near && uw > 6 && uw < W * .09){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,140,50,${.06 * a})`; poly(ax - uw * .04, hy + uw * .03, ax + uw * .04, hy + uw * .03, ax + uw * .2, hy + h * .7, ax - uw * .2, hy + h * .7, cx.fillStyle); cx.globalCompositeOperation = 'source-over'; }
        cx.fillStyle = '#2a2430'; pxRect(ax - uw * .06, hy - uw * .01, uw * .12 + 1, uw * .03 + 1); cx.fillStyle = '#ffe0a0'; pxRect(ax - uw * .045, hy + uw * .02, uw * .09 + 1, uw * .015 + 1);
        glow(ax, hy + uw * .03, uw * .26, '#ffa040', .55 * a); break; }
      case 'rack': { const k = uw * .9 / 46, sf = scaleFade(k, 6, 10); if(sf <= 0) break; cx.globalAlpha = a * sf; put(rackSpr(), x, y, k, flip); cx.globalAlpha = a; if(near && sp.k % 12 === 0) glow(x, y - 24 * k, uw * .45, '#ffa040', .12 * a); break; }
      case 'barrier': { if(uw < 3) break; const k = uw * .34 / 16; if(k / PX > 4) barrierGeo(x, y, k, fog, sk.low); else blit(barrierSpr(), x, y, k); if(sp.beacon && Math.sin(now / 380 + sp.k) > 0){ cx.fillStyle = '#ffb020'; pxRect(x - k * 1.5, y - 10 * k, k * 3 + 1, k * 2 + 1); glow(x, y - 9 * k, uw * .18, '#ff9a20', .5 * a); } break; }
      case 'tank': { const k = uw * 1.35 / 48, geo = GEO_K(k), sf = scaleFade(k, 6, 10); if(sf <= 0 && !geo) break; if(near) glow(x - Math.sign(sp.x) * 8 * k, y - 20 * k, uw * .7, '#ff8a30', .1 * a * (geo ? 1 : sf)); cx.globalAlpha = geo ? a : a * sf; if(geo) tankGeo(x, y, k, flip, sp.steam, sp, now, a); else put(tankSpr(), x, y, k, flip); cx.globalAlpha = a * sf; if(sp.steam) plume(x + (flip ? -8 : 8) * k, y - 30 * k, k * 1.1, now, sp.k * .13, a * sf, false); break; }
      case 'sphere': { const k = uw * 1.0 / 36, geo = GEO_K(k), sf = scaleFade(k, 6, 10); if(sf <= 0 && !geo) break; cx.globalAlpha = geo ? a : a * sf; if(geo) sphereGeo(x, y, k, flip, a); else put(sphereSpr(), x, y, k, flip); break; }
      case 'col': { const k = uw * 2.6 / 88, top = y - 86 * k, geo = GEO_K(k), sf = scaleFade(k, 6, 10); if(sf <= 0 && !geo) break; cx.globalAlpha = a * sf; if(sp.steam && sf > 0) plume(x, top, k * 1.3, now, sp.k * .21, a * sf, false); cx.globalAlpha = geo ? a : a * sf; if(geo) colGeo(x, y, k, flip, a); else put(colSpr(), x, y, k, flip);
        if(Math.sin(now / 520 + sp.k) > .2){ cx.fillStyle = RED; pxRect(x - k, top - k * 2, k * 2 + 1, k * 2 + 1); if(near) glow(x, top - k, uw * .2, RED, .45 * a); } break; }
      case 'flare': { const k = uw * 3.4 / 98, geo = GEO_K(k), sf = scaleFade(k, 6, 10); if(sf <= 0 && !geo) break; cx.globalAlpha = a * sf; const top = y - 98 * k, fr = Math.floor(now / slowFl() + sp.k) % 4, fk = k * 1.6, fh = 20 * fk, fl = reduce ? 1 : .88 + .12 * Math.sin(now / 70 + sp.k);
        plume(x, top - fh * .55, k * 2.2, now, sp.k * .07, a * sf, true);
        if(geo){ cx.globalAlpha = a; derrickGeo(x, y, k, flip, a); cx.globalAlpha = a * sf; } else put(derrickSpr(), x, y, k, flip); glow(x, top - fh * .45, uw * 1.5 * fl, '#ff6a20', .42 * a * sf); blit(flameSpr(fr), x, top + k, fk);
        if(Math.sin(now / 600 + sp.k) > 0){ cx.fillStyle = RED; pxRect(x - k * 1.5, y - 52 * k, k * 2 + 1, k * 2 + 1); } break; }
      case 'crane': { const k = uw * 1.75 / 49.5, top = y - 82 * k; put(craneSpr(), x, y, k, false);
        if(near){ cx.globalCompositeOperation = 'lighter'; for(const fx of [-40, -16, 16, 40]){ const lx = x + fx * k; cx.fillStyle = `rgba(150,230,220,${.05 * a})`; poly(lx - k, top + 19 * k, lx + k, top + 19 * k, lx + uw * .22, y, lx - uw * .22, y, cx.fillStyle); } cx.globalCompositeOperation = 'source-over';
          glow(x + 2 * k, top + 26 * k, uw * .35, '#8af0e0', .3 * a); }
        if(Math.sin(now / 450 + sp.k) > 0){ cx.fillStyle = RED; for(const bx of [-59, 59]) pxRect(x + bx * k - k, top + 4 * k, k * 2 + 1, k * 2 + 1); if(near){ glow(x - 59 * k, top + 5 * k, uw * .25, RED, .4 * a); glow(x + 59 * k, top + 5 * k, uw * .25, RED, .4 * a); } } break; }
      case 'tanker': { const k = uw * 6.2 / 204, f = Math.floor(now / (reduce ? 1600 : 500)) % 2; put(tankerSpr(f), x, y, k, flip); const sx = x + (flip ? -1 : 1) * (168 - 102) * k;
        if(near){ glow(sx, y - 44 * k, uw * 1.3, '#ffd8a0', .14 * a); glow(sx, y - 28 * k, uw * .7, '#8af0e0', .08 * a); }
        if(Math.sin(now / 700 + sp.k) > 0){ const mx = x + (flip ? -1 : 1) * (160 - 102) * k, bx = x + (flip ? -1 : 1) * (13.5 - 102) * k; cx.fillStyle = RED; pxRect(mx - k, y - 64 * k, k * 2 + 1, k * 2 + 1); cx.fillStyle = '#fff4d8'; pxRect(bx - k, y - 66 * k, k * 2 + 1, k * 2 + 1); } break; } }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- the road surface: wet asphalt with sodium and flare streaks, concrete apron
  function roadFX(s, a, b, fog, f, now){ const lt = s.lit || 0, hgt = a.y - b.y + 1;
    const ap = f(mixc(s.stripe ? '#1e1c22' : '#1a191f', '#b0642a', lt * .38));
    poly(a.x - a.w * 1.143, a.y, a.x - a.w * 1.62, a.y, b.x - b.w * 1.62, b.y - 1, b.x - b.w * 1.143, b.y - 1, ap);
    poly(a.x + a.w * 1.143, a.y, a.x + a.w * 1.62, a.y, b.x + b.w * 1.62, b.y - 1, b.x + b.w * 1.143, b.y - 1, ap);
    if(fog > .85) return; const fa = 1 - fog; cx.globalCompositeOperation = 'lighter';
    if(lt > .05){ const al = lt * .45 * fa; cx.fillStyle = `rgba(255,150,60,${al})`; for(const sd of [-1, 1]){ const ww = a.w * (.025 + .035 * hash(s.index * 7 + sd)), j = a.w * .012 * (hash(s.index * 1.7 + sd) - .5); if(hash(s.index * 3.3 + sd) > .15) pxRect(a.x + sd * a.w * .87 + j - ww / 2, b.y + hgt * .3, ww, Math.max(1, Math.min(hgt * .5, PX * 2))); } }
    const df = Math.abs(s.index % 48 - 24); if(df < 10){ const sd = flareSide(s.index), fl = reduce ? 1 : .8 + .2 * Math.sin(now / 70 + s.index * .7), ww = a.w * (.04 + .05 * hash(s.index * 5));
      cx.fillStyle = `rgba(255,110,40,${.4 * (1 - df / 10) * fa * fl})`; pxRect(a.x + sd * a.w * .62 - ww / 2, b.y + hgt * .2, ww, Math.max(1, Math.min(hgt * .55, PX * 3))); }
    if(s.index % 3 === 0 && fog < .6){ const sd = rackSide(s.index), ww = a.w * .03; cx.fillStyle = `rgba(100,240,220,${.1 * fa})`; pxRect(a.x + sd * a.w * .95 - ww / 2, b.y + hgt * .3, ww, Math.max(1, Math.min(hgt * .4, PX * 2))); }
    cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- far scenery
  function backdrop(o){ const { hz, now } = o, ga = cx.globalAlpha, dawn = 1 - clamp((o.t - .55) * 2.2, 0, .8);
    // horizon glow: the plant lights the low cloud. Stepped bands with checker-dithered edges, widest/dimmest first.
    const bands = [[H * .13, '#2a1410', .5], [H * .075, '#42200f', .5], [H * .04, '#6e3016', .45], [H * .018, '#a8501f', .4]];
    for(const [bh, col, al] of bands){ const top = Math.round((hz - bh) / PX) * PX, dh = Math.round(bh * .25 / PX) * PX; cx.globalAlpha = ga * al * dawn; cx.fillStyle = dpat(col); pxRect(0, top - dh, W, dh); cx.fillStyle = col; pxRect(0, top, W, hz - top + PX); }
    cx.globalAlpha = ga;
    // smoke banks drifting over the plant
    for(let i = 0; i < 3; i++){ const spr = bankSpr(i % 3), sw = spr.width * PX * (i === 3 ? 1.5 : 1), span = W + sw; const xx = (((i * 0.31 + .1) * span - skyPar('mid') * (1 + i * .15) + now * .006 * (1 + i * .4)) % span + span) % span - sw / 2;
      cx.globalAlpha = ga * (i === 3 ? .55 : .8); blit(spr, xx, hz - H * (.035 + i * .028), PX * (i === 3 ? 1.5 : 1)); }
    cx.globalAlpha = ga;
    tile(farStrip(), skyPar('mid'), hz + 2, now, .45, true);
    tile(midStrip(), skyPar('edge') + 900, hz + 4, now, .9);
    return false; }

  // ---------------------------------------------------------------- screen haze and heat shimmer
  function overlay(al, now){ const hz = HZ, cvw = cx.canvas.width;
    cx.globalAlpha = al * .16; cx.fillStyle = dpat('#8a4a24'); pxRect(0, Math.round((hz - H * .05) / PX) * PX, W, Math.round(H * .075 / PX) * PX);
    cx.globalAlpha = al * .1; cx.fillStyle = '#b8602a'; pxRect(0, Math.round((hz - H * .02) / PX) * PX, W, Math.round(H * .03 / PX) * PX); cx.globalAlpha = 1;
  }

  // build every cached sprite, strip, frame and dither pattern up front so nothing is built mid-ride
  function warm(){ tankSpr(); sphereSpr(); colSpr(); rackSpr(); derrickSpr(); craneSpr(); barrierSpr(); tankerSpr(0); tankerSpr(1);
    for(let f = 0; f < 4; f++){ flameSpr(f); plumeSpr(f, 0); plumeSpr(f, 1); } for(let v = 0; v < 3; v++) bankSpr(v); farStrip(); midStrip();
    try{ for(const c of ['#2a1410', '#42200f', '#6e3016', '#a8501f', '#8a4a24']) dpat(c); }catch(e){}
    // draw each canvas once, invisibly small, so its GPU texture is uploaded now and not on the frame it first appears
    try{ cx.save(); cx.globalAlpha = .004; for(const key in SPR) if(key.startsWith(P) && SPR[key] instanceof HTMLCanvasElement) cx.drawImage(SPR[key], 0, 0, 1, 1); cx.restore(); }catch(e){} }
  ENV.refinery = { warm, place, lit, draw, roadFX, backdrop, overlay, road:['#1a1920', '#1c1a22'], lampCol:'#7a4020',
    /* the pipeline jump (setpiece/jump.js, research/sundown-craft/jumpsides.md): the gap is a pipe trench as wide as the road and its
       verges, walled by the jump's parapets; the pipe rack bridges it on its own trestles and the tank farm carries on beyond. The road-edge
       barriers line the ramp and the far leaf and keep out of the trench, and so do the spheres, whose bulk would hang over its lip. */
    jumpFloor:1.45,
    jumpKeep(sp, o, p){ const J = MECH.sp_jump; if(!J || !J.inGap || !J.inGap(p, o)) return undefined; return sp.type === 'barrier' || sp.type === 'sphere' ? false : undefined; } };
})();

// where this road's barrier is drawn, for the collider (half-road widths)
ENV.refinery.barrier = 1.2;
