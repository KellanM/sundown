/* Sundown environment: Snow Onsen (雪). See env/README.md for the hooks.
   A snowbound hot-spring town in the mountains at night: snow corridors cut by the plough (yuki-no-kabe), then a street of wooden ryokan
   with lit shoji and noren, gas lamps, snow lanterns along the banks, a vermilion bridge over a steaming river, cedars heavy with snow,
   a ropeway climbing the moonlit range behind.
   References studied for rules (looked at, then drawn from scratch):
   - Ginzan Onsen at night (photo, Eiji Kikuta 2015): dark timber facades, every upper floor a row of warm shoji, white globe gas lamps on
     posts at the street edge, a red bridge, dark forest behind; warm light lives only in windows and lamps, everything else is cool and dark.
   - Kawase Hasui, Snow at Zojo-ji and Snow in Mukojima (shin-hanga): snow is never pure white; roof snow is a thick cap, palest along its top
     edge and greying down its front; walls under the caps go nearly black; distance dissolves into pale blue-grey; snowfall is a field of
     small irregular dots barely lighter than the sky, denser in front of dark shapes; a window or two of orange is the only warmth.
   - Celeste (Summit and night chapters): pixel snow flakes as single pixels in two values; foliage as dark tiers with thick white pads on top;
     shadowed snow in lavender/blue-violet, never grey.
   Rules taken: snow shadows blue-violet, lit snow only on upward faces and caps; vertical faces dark; warm only from shoji, lanterns, lamps;
   one light (moon, from above); far layers paler and closer in value; flakes three depths, world-anchored, tiny; the road stays the
   darkest clean strip with bright lane lines. */
"use strict";
(() => {
  // ---------------------------------------------------------------- palette
  const SN = { O:'#20264a', D:'#38416e', M:'#5c6898', L:'#93a0cc', H:'#d6def2' };     // snow: outline, shade, mid, lit, moon-cap
  const WD = { O:'#07050a', D:'#140c10', M:'#24161a', L:'#3a2628', H:'#5a3a34' };     // dark ryokan timber
  const PLS = { D:'#262c4a', M:'#363e64', L:'#4c5682' };                              // plaster in moon shadow
  const SJ = ['#5a3018', '#b06a30', '#ffc070', '#ffe2a8'];                            // shoji: grid, dim, lit, hot
  const RED = { O:'#2a0608', D:'#78121a', M:'#c42a24', L:'#ff6a3a', H:'#ffc8a0' };     // chōchin and bridge vermilion
  const SUGI = ['#020507', '#061210', '#0b1f1b', '#14302a'];
  const ICE = '#a8b8e0', ICE2 = '#e4ecfa', NOREN = '#1a2452', NOREN2 = '#2c3a74', GOLD = '#d8a848', WARM = '#ffb060';
  const H0 = n => hash(n);
  const snap = v => Math.round(v / PX) * PX;
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // ---------------------------------------------------------------- tiny pixel canvas helper (cached in SPR with a sn_ prefix)
  function pix(key, w, h, fn){ const kk = 'sn_' + key; if(SPR[kk]) return SPR[kk]; const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
    const P = { k, w, h,
      px(x, y, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col){ if(ww <= 0 || hh <= 0) return; k.fillStyle = col; k.fillRect(x, y, ww, hh); },
      line(x0, y0, x1, y1, col){ k.fillStyle = col; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for(;;){ k.fillRect(x0, y0, 1, 1); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } } };
    fn(P); return SPR[kk] = c; }
  // a mirrored copy, so right-side sprites keep the road-facing side wall toward the road
  function flip(c, key){ const kk = 'sn_' + key + '_f'; if(SPR[kk]) return SPR[kk]; const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const k = f.getContext('2d'); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return SPR[kk] = f; }
  const rng = seed => () => (seed = (seed * 16807 + 11) % 2147483647) / 2147483647;

  // a thick snow cap over an eave (Hasui): lumpy top, palest along the top, greying down, a shadow line, the dark eave board, icicles
  function cap(P, x0, x1, y, th, seed, side){ const r = rng(seed);
    for(let x = x0; x < x1; x++){ const end = x === x0 || x === x1 - 1, bump = end ? 1 : (r() < .3 ? -1 : 0), top = y + bump;
      for(let yy = top; yy < y + th; yy++){ const d = yy - top; P.px(x, yy, d === 0 ? (side ? SN.L : SN.H) : d === 1 ? (side ? SN.M : SN.L) : yy === y + th - 1 ? SN.D : (side ? SN.M : ((x + yy) % 2 && d > 2 ? SN.M : SN.L))); } }
    P.rect(x0 + 1, y + th, x1 - x0 - 2, 1, WD.O);
    for(let x = x0 + 2; x < x1 - 2; x++){ const q = r(); if(q < .28){ const len = 1 + (q * 10 | 0) % 3; P.px(x, y + th + 1, ICE2); for(let j = 1; j < len; j++) P.px(x, y + th + 1 + j, ICE); } } }
  // a lit shoji panel: warm paper with a dark grid (kumiko), brightest in the middle rows
  function shoji(P, x, y, w, h, lvl){ const base = lvl === 0 ? '#1a1218' : lvl === 1 ? SJ[1] : SJ[2];
    P.rect(x, y, w, h, base); if(lvl === 2 && w > 3 && h > 3) P.rect(x + 1, y + 1 + (h > 6 ? 1 : 0), w - 2, Math.max(1, h - 3 - (h > 6 ? 1 : 0)), SJ[3]);
    for(let yy = y + 2; yy < y + h; yy += 3) P.rect(x, yy, w, 1, lvl ? SJ[0] : '#100a0e');
    for(let xx = x + 2; xx < x + w; xx += 3) P.rect(xx, y, 1, h, lvl ? SJ[0] : '#100a0e'); }
  // a bigger chōchin: black caps, a barrel of red paper with dark ribs, lit from inside (brighter core)
  function bigChochin(P, x, y){ P.rect(x + 2, y, 3, 1, WD.O); P.rect(x + 1, y + 1, 5, 1, WD.L);
    for(let yy = 0; yy < 7; yy++){ const w = yy === 0 || yy === 6 ? 5 : 7, x0 = x + (7 - w) / 2; for(let xx = 0; xx < w; xx++){ const xa = x0 + xx, edge = xx === 0 || xx === w - 1, core = !edge && yy > 1 && yy < 5 && xx > 1 && xx < w - 2;
      P.px(xa, y + 2 + yy, yy % 2 === 1 && !core ? RED.D : edge ? RED.D : core ? RED.L : RED.M); } }
    P.px(x + 3, y + 4, RED.H); P.rect(x + 1, y + 9, 5, 1, WD.L); P.rect(x + 2, y + 10, 3, 1, WD.O); }
  // chōchin: red paper lantern, black caps, a highlight
  function chochin(P, x, y){ P.rect(x + 1, y, 2, 1, WD.O); P.rect(x, y + 1, 4, 4, RED.M); P.rect(x, y + 1, 1, 4, RED.L); P.px(x + 1, y + 2, RED.H); P.rect(x + 3, y + 1, 1, 4, RED.D); P.rect(x, y + 3, 4, 1, RED.D); P.rect(x + 1, y + 5, 2, 1, WD.O); }

  // ---------------------------------------------------------------- ryokan: a front face plus a narrow side wall on the RIGHT (road side for a left-hand inn)
  const RW = 64, RH = 80, F0 = 5, F1 = 50, S1 = 60, RLIGHT = {};
  const ryokan = v => pix('ryo' + v, RW, RH, P => { const r = rng(v * 977 + 31), L = RLIGHT[v] = [], tall = v % 2 === 1;
    const g0 = 60, e1 = 55, f2 = tall ? 42 : 38, e2 = tall ? 37 : 0, f3 = tall ? 26 : 0, roofB = tall ? 26 : 38, roofT = tall ? 12 : 18;
    // ground floor: posts, a lattice (koshi) window glowing behind its bars, the entrance with a noren, a red chōchin, stone footing
    P.rect(F0, g0, F1 - F0, RH - g0, WD.M); P.rect(F1, g0, S1 - F1, RH - g0, WD.D);
    const lat0 = F0 + 2, lat1 = v % 3 === 2 ? 30 : 26;
    P.rect(lat0, g0 + 3, lat1 - lat0, 12, SJ[2]); P.rect(lat0, g0 + 5, lat1 - lat0, 7, SJ[3]);
    for(let x = lat0; x < lat1; x += 2) P.rect(x, g0 + 3, 1, 12, WD.D); P.rect(lat0, g0 + 2, lat1 - lat0, 1, WD.L); P.rect(lat0, g0 + 15, lat1 - lat0, 1, WD.O);
    const d0 = lat1 + 4, d1 = F1 - 3;
    P.rect(d0, g0 + 2, d1 - d0, RH - g0 - 3, SJ[2]); P.rect(d0, g0 + 10, d1 - d0, RH - g0 - 12, SJ[3]); P.rect(d0, RH - 2, d1 - d0, 1, SJ[1]);
    P.rect(d0, g0 + 1, d1 - d0, 1, WD.O); for(let x = d0; x < d1; x++){ const pnl = ((x - d0) / ((d1 - d0) / 3)) | 0, edge = (x - d0) % (((d1 - d0) / 3) | 0) === 0;
      P.rect(x, g0 + 2, 1, 8 + (pnl === 1 ? 0 : 0), edge ? '#0c1230' : x === d0 + 1 ? NOREN2 : NOREN); }
    { const mx = ((d0 + d1) / 2 | 0) - 3; ['.#.#.#.', '#.#.#..', '.#.#.#.', '#.....#', '.#####.'].forEach((row, yy) => { for(let xx = 0; xx < 7; xx++) if(row[xx] === '#') P.px(mx + xx, g0 + 2 + yy, '#d8dcea'); }); }   // ♨ on the noren
    for(const x of [F0, lat1 + 1, F1 - 2]) { P.rect(x, g0, 2, RH - g0, WD.D); P.rect(x, g0, 1, RH - g0, WD.L); }
    chochin(P, lat1 - 1 + 1, g0 + 1); L.push([lat1 + 2, g0 + 4, 7, RED.L, .55]); L.push([(d0 + d1) / 2, RH - 5, 10, WARM, .35]);
    P.rect(F0 - 1, RH - 2, S1 - F0 + 1, 2, '#141626');
    // side wall, ground floor: one small lit window
    P.rect(F1 + 2, g0 + 4, 6, 7, WD.O); shoji(P, F1 + 3, g0 + 5, 4, 5, 1);
    // snow drifts against the walls
    for(let x = F0 - 2; x < S1 + 1; x++){ const hgt = Math.round(1 + 2.4 * Math.abs(Math.sin(x * .21 + v)) * (x < d0 || x > d1 ? 1 : .2)); for(let j = 0; j < hgt; j++) P.px(x, RH - 1 - j, j === hgt - 1 ? SN.L : SN.M); }
    // first eave
    cap(P, F0 - 4, F1 + 1, e1, 4, v * 13 + 1, false); cap(P, F1 + 1, S1 + 2, e1 + 1, 3, v * 13 + 2, true);
    // upper floor: a row of shoji behind a wooden balcony railing (the Ginzan look), some rooms dark
    const fb = e1 - 1; P.rect(F0, f2, F1 - F0, fb - f2, WD.M); P.rect(F1, f2, S1 - F1, fb - f2, WD.D);
    const np = 4, pw = (F1 - F0 - 2) / np;
    for(let i = 0; i < np; i++){ const x = Math.round(F0 + 1 + i * pw), lv = r() < .2 ? 0 : r() < .3 ? 1 : 2; shoji(P, x + 1, f2 + 2, Math.round(pw) - 2, fb - f2 - 3, lv); P.rect(x, f2, 1, fb - f2, WD.D); if(lv === 2) L.push([x + pw / 2, f2 + 6, 9, '#ffc070', .16]); }
    shoji(P, F1 + 2, f2 + 3, 6, fb - f2 - 5, 1);
    // railing: snow on the top rail, balusters, bottom rail
    const ry = fb - 6; P.rect(F0 - 1, ry, F1 - F0 + 2, 1, SN.L); P.rect(F0 - 1, ry + 1, F1 - F0 + 2, 1, WD.L); for(let x = F0; x < F1; x += 3) P.rect(x, ry + 2, 1, 4, WD.D); P.rect(F0 - 1, ry + 5, F1 - F0 + 2, 1, WD.M);
    P.rect(F1, ry, S1 - F1, 1, SN.M); P.rect(F1, ry + 1, S1 - F1, 1, WD.M); for(let x = F1 + 1; x < S1; x += 3) P.rect(x, ry + 2, 1, 4, WD.O);
    if(tall){ cap(P, F0 - 3, F1 + 1, e2, 4, v * 13 + 3, false); cap(P, F1 + 1, S1 + 1, e2 + 1, 3, v * 13 + 4, true);
      // third floor: plaster panels in a timber frame, two small lit windows
      P.rect(F0 + 1, f3, F1 - F0 - 2, e2 - f3, PLS.M); P.rect(F1 - 1, f3, S1 - F1, e2 - f3, PLS.D);
      for(let x = F0 + 1; x < F1; x += 11) P.rect(x, f3, 1, e2 - f3, WD.D); P.rect(F0 + 1, f3 + 5, F1 - F0 - 2, 1, WD.D); P.rect(F0 + 1, f3, F1 - F0 - 2, 1, WD.D);
      for(const wx of [F0 + 6, F0 + 28]) if(r() < .8){ shoji(P, wx, f3 + 2, 6, 3, 2); L.push([wx + 3, f3 + 3, 5, '#ffc070', .12]); }
      shoji(P, F1 + 2, f3 + 1, 5, 3, 1); }
    // the roof: a hip roof buried in snow, palest at the ridge, greying toward the eave (Hasui), the hip end darker
    const rh = roofB - roofT;
    for(let y = roofT; y < roofB; y++){ const t = (y - roofT) / rh, inset = Math.round((1 - t) * (rh * .9)), xa = F0 - 5 + inset, xb = F1 + 2 - inset, xs = S1 + 3 - Math.round(inset * .55);
      for(let x = xa; x < xs; x++){ const front = x < xb, th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16, d = y - roofT;
        const col = front ? (d === 0 ? SN.H : t + th * .35 < .55 ? SN.L : t + th * .3 < .95 ? (t > .8 ? SN.M : SN.L) : SN.M) : (d === 0 ? SN.L : t + th * .4 < .5 ? SN.M : SN.D);
        P.px(x, y, (x === xa) ? SN.M : col); } }
    // roof edge: snow overhang lumps, shadow line, eave board, icicles
    cap(P, F0 - 6, F1 + 3, roofB, 2, v * 13 + 5, false); cap(P, F1 + 3, S1 + 4, roofB, 2, v * 13 + 6, true);
    // a lookout (Ginzan's little towers) on some roofs
    if(v % 4 === 2){ const tx = 22; P.rect(tx, roofT - 8, 10, 8, WD.M); P.rect(tx, roofT - 8, 1, 8, WD.L); shoji(P, tx + 2, roofT - 6, 6, 4, 2); L.push([tx + 5, roofT - 4, 6, '#ffc070', .2]);
      cap(P, tx - 2, tx + 12, roofT - 11, 3, v + 99, false); }
  });
  // gas lamp (Ginzan): an iron post, a frosted glass box, a little cap with snow on it
  const LW = 10, LH = 46;
  const gasLamp = () => pix('lamp', LW, LH, P => { const I = ['#06060c', '#1a1a2a', '#34364e', '#5a5e7a'];
    P.rect(2, LH - 3, 6, 3, I[0]); P.rect(3, LH - 3, 4, 1, I[2]); P.rect(3, LH - 5, 4, 2, I[1]); P.px(3, LH - 5, I[3]);
    P.rect(4, 13, 2, LH - 18, I[1]); P.rect(4, 13, 1, LH - 18, I[2]); P.rect(3, 22, 4, 1, I[1]); P.rect(3, 12, 4, 2, I[0]); P.px(3, 12, I[2]);
    // glass box
    P.rect(1, 4, 8, 8, I[0]); P.rect(2, 5, 6, 6, '#ffd890'); P.rect(3, 6, 4, 4, '#fff4d8'); P.rect(2, 8, 6, 1, '#e0b070'); P.rect(4, 5, 1, 6, '#e0b070');
    // cap and snow
    P.rect(0, 3, 10, 1, I[1]); P.rect(1, 2, 8, 1, I[0]); P.rect(1, 1, 8, 1, SN.L); P.rect(2, 0, 6, 1, SN.H); P.px(0, 2, SN.M); P.px(9, 2, SN.M);
    P.px(2, 4, ICE2); P.px(7, 4, ICE); });
  // yukitōrō: a snow lantern, a little dome with a dark window and a candle
  const yukitoro = () => pix('yuki', 11, 10, P => { for(let y = 0; y < 10; y++){ const hw = y < 1 ? 2 : y < 2 ? 3.5 : y < 4 ? 4.5 : 5.5; for(let x = 0; x < 11; x++){ const d = x + .5 - 5.5; if(Math.abs(d) > hw) continue; P.px(x, y, y === 0 || (y === 1 && Math.abs(d) < 3) ? SN.H : d < -hw + 1.5 ? SN.L : d > hw - 1.5 ? SN.D : SN.L); } }
    P.rect(3, 4, 5, 4, '#2a1410'); P.rect(4, 5, 3, 3, '#a85a24'); P.px(5, 5, '#ffe2a8'); P.px(5, 6, '#ffb860'); P.rect(0, 9, 11, 1, SN.M); });
  // the welcome gate over the road: two dark posts, a snow-loaded kasagi beam, a signboard (text drawn live), chōchin on a sagging rope
  const GW = 128, GH = 76, GPOST = [10, 116];
  const GLAMP = [];
  const gate = () => pix('gate', GW, GH, P => { GLAMP.length = 0;
    for(const x of GPOST){ P.rect(x - 3, 10, 6, GH - 10, WD.D); P.rect(x - 3, 10, 1, GH - 10, WD.H); P.rect(x - 2, 10, 1, GH - 10, WD.L); P.rect(x + 2, 10, 1, GH - 10, WD.O);
      P.rect(x - 5, GH - 5, 10, 5, '#20223a'); P.rect(x - 5, GH - 5, 10, 1, '#3a3e5c'); for(let j = 0; j < 4; j++) P.rect(x - 6 + j, GH - 1 - j, 12 - 2 * j, 1, j === 3 ? SN.L : SN.M); }
    // kasagi with its snow, the lower nuki beam
    P.rect(0, 12, GW, 4, WD.M); P.rect(0, 12, GW, 1, WD.H); P.rect(0, 15, GW, 1, WD.O); cap(P, -1, GW + 1, 6, 6, 77, false);
    P.rect(4, 24, GW - 8, 3, WD.M); P.rect(4, 24, GW - 8, 1, WD.L); P.rect(4, 27, GW - 8, 1, WD.O); P.rect(5, 23, GW - 10, 1, SN.L);
    // signboard
    const sx0 = 38, sx1 = 90; P.rect(sx0, 16, sx1 - sx0, 8, WD.O); P.rect(sx0 - 2, 27, sx1 - sx0 + 4, 16, GOLD); P.rect(sx0 - 1, 28, sx1 - sx0 + 2, 14, '#1a0e10'); P.rect(sx0 - 2, 26, sx1 - sx0 + 4, 1, SN.L);
    // rope and lanterns
    for(let x = 14; x < GW - 14; x++){ const t = (x - 14) / (GW - 28), y = Math.round(44 + 5 * (1 - (2 * t - 1) * (2 * t - 1))); P.px(x, y, '#3a3024'); if((x - 18) % 11 === 0 && x < GW - 16){ bigChochin(P, x - 3, y + 1); GLAMP.push([x, y + 5]); } } });
  // yabane: the red-and-white arrow hung over the road edge on a pole, so the plough and drivers find the edge under snow (Hokkaido, Tohoku)
  const YW = 16, YH = 62;
  const yabane = () => pix('yabane', YW, YH, P => { const G = ['#0a0c16', '#3a3e52', '#7a8098'];
    P.rect(2, 4, 2, YH - 4, G[1]); P.rect(2, 4, 1, YH - 4, G[2]); P.rect(1, YH - 2, 4, 2, G[0]);
    P.rect(2, 3, 12, 2, G[0]); P.rect(3, 3, 10, 1, G[2]); P.rect(1, 2, 4, 1, SN.L); P.rect(5, 2, 9, 1, SN.H);
    for(let y = 5; y < 23; y++){ const hw = y < 18 ? 2.5 : 2.5 - (y - 17) * .55; for(let x = 9; x < 15; x++){ const d = Math.abs(x + .5 - 12); if(d > hw + .5) continue;
      P.px(x, y, d > hw - .5 ? '#1a0a0e' : ((y - x + 40) >> 1) % 2 ? '#e8e2e0' : '#d0283a'); } }
    P.rect(11, 6, 2, 1, '#ffd060'); P.rect(12, 5, 1, 1, '#8a8aa0'); });
  // cedars heavy with snow: needle tiers in dark teal, thick snow pads on top of each tier (Celeste), lit by the moon from above
  function bake(key, w, h, mat){ const kk = 'sn_' + key; if(SPR[kk]) return SPR[kk];
    const g = new Array(w * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) g[y * w + x] = mat(x, y);
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : g[y * w + x];
    return procSprite(kk, w, h, (x, y) => { const m = at(x, y); if(!m) return null;
      if(m === 9){ if(at(x, y - 1) !== 9) return SN.H; if(at(x, y + 1) !== 9) return SN.M; return at(x - 1, y) !== 9 || at(x + 1, y) !== 9 ? SN.M : SN.L; }   // snow
      if(m === 2) return at(x - 1, y) === 2 ? WD.D : WD.L;                                                                          // trunk
      if(m === 3) return x % 3 === 0 ? '#8a7a58' : '#5a4e3a';                                                                     // straw rope
      if(at(x, y - 1) === 9) return SUGI[0];                                                                                         // shadow under snow
      if(!at(x - 1, y)) return SUGI[3]; if(!at(x + 1, y) || !at(x, y + 1)) return SUGI[0]; return (x * 7 + y * 3) % 11 === 0 ? SUGI[2] : SUGI[1]; }); }
  // tiers overlap like stacked skirts; each carries a snow pad along its upper slope, broken here and there, heaviest near the trunk
  const sugi = v => bake('sugi' + v, 19, 54, (x, y) => { const c = 9.5, d = Math.abs(x + .5 - c), nt = 6 + (v === 1 ? 1 : 0), span = 44 / nt;
    if(y >= 47) return d < 1.4 ? 2 : 0;
    if(y < 2) return d < .8 ? 9 : 0;
    for(let j = 0; j < nt; j++){ const top = 1 + j * span, bot = top + span + 3, mw = 2 + (j + 1) * (7.4 / nt) + (H0(v * 7 + j) - .5) * 1.2;
      if(y < top || y > bot + 1.5) continue; const tt = (y - top) / (bot - top), hw = mw * Math.min(1, .15 + tt * 1.15);
      const droop = bot + (d / mw) * (d / mw) * 1.6; if(d > hw || y > droop) continue;
      const yTop = top + Math.max(0, (d / mw - .15) / 1.15) * (bot - top), into = y - yTop, side = x + .5 < c ? -1 : 1;
      if(into < 1.2 + (d < 2 ? 1 : 0) + (H0(x * 3.1 + j * 7 + v) > .6 ? .8 : 0) && H0(Math.floor(x / 2) * 5.3 + j * 11 + v) > .18) return 9;
      return y > droop - 1 && d > mw * .5 ? 1 : 1; }
    return 0; });
  // a garden pine under yukitsuri: a pole with straw ropes fanned over a clumped crown (Kenroku-en); the town's landmark tree
  const CLM = [[20, 26, 9, 5], [10, 30, 7, 4], [30, 30, 7, 4], [15, 21, 6, 3.5], [26, 22, 6, 3.5], [20, 33, 10, 4]];
  const tsuri = () => bake('tsuri', 40, 48, (x, y) => {
    if(y < 34 && Math.abs(x + .5 - 20) < .9 && y > 0) return 2;
    for(const [px, py, rx, ry] of CLM){ const dx = (x + .5 - px) / rx, dy = (y + .5 - py) / ry; if(dx * dx + dy * dy <= 1){ const dt = (y + .5 - (py - ry * Math.sqrt(Math.max(0, 1 - dx * dx)))); return dt < 1.6 ? 9 : 1; } }
    // straw ropes from the pole top to the crown's rim
    for(let i = 0; i < 9; i++){ const ex = 3 + i * 4.25, ey = 28 + Math.abs(i - 4) * .5, t = (y - 1) / (ey - 1); if(t > 0 && t < 1 && Math.abs(x + .5 - (20 + (ex - 20) * t)) < .5) return 3; }
    if(y >= 36 && Math.abs(x + .5 - 20 - (y - 36) * .1) < 1.5) return 2; return 0; });

  // dithered discs for steam (one art px per cell), cached by size and density
  const puff = (r, dn) => procSprite('sn_puff' + r + '_' + dn, r * 2, r * 2, (x, y) => { const dx = x + .5 - r, dy = y + .5 - r, q = (dx * dx + dy * dy) / (r * r); if(q > 1) return null;
    const th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16; return th < dn * (q > .55 ? .55 : 1) ? (dy < -r * .3 ? '#d8e2f4' : '#a8b6d8') : null; });
  const PUFF_R = [3, 5, 7, 10, 13], STM = ['#8e9cc8', '#d0daf2'];

  // ---------------------------------------------------------------- the far range: three periodic strips cached at load (night and dawn versions)
  const P0 = 960;
  const pvn = (x, per, seed) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = H0(((i % per) + per) % per + seed * 101), b = H0((((i + 1) % per) + per) % per + seed * 101); return a * (1 - u) + b * u; };
  const RIDGE = [ // far to near: art amp (fraction of H), frequencies (cells per strip), parallax, seed, colours [forest, shade, lit, rim]
    { amp:.25, c:[9, 23, 64], par:'far', seed:3, tree:.22, col:['#262c52', '#4a5486', '#8a96c6', '#c0cae8'], dawn:['#3a2c54', '#7a5a88', '#e8a8a0', '#ffd8b8'] },
    { amp:.16, c:[14, 34, 96], par:'mid', seed:7, tree:.42, col:['#121830', '#343e6c', '#7280b4', '#aab6de'], dawn:['#20183a', '#5a4470', '#c88c94', '#f8c8b0'] },
    { amp:.075, c:[20, 60, 160], par:'near', seed:13, tree:1, col:['#090c18', '#262e52', '#4a5688', '#7a86b4'], dawn:['#120c1e', '#3a2c4a', '#7a5a70', '#b88a8a'] } ];
  let STRIPS = null, stripKey = '';
  const ROPE = { x0:330, x1:560 };   // ropeway on the mid range (strip art px)
  function buildStrips(){ const key = H + ':' + PX; if(stripKey === key && STRIPS) return; stripKey = key; STRIPS = [];
    for(let li = 0; li < 3; li++){ const R = RIDGE[li], hs = Math.max(8, Math.ceil(R.amp * H / PX) + 3), hf = x => { const a = pvn(x / P0 * R.c[0], R.c[0], R.seed), b = 1 - Math.abs(pvn(x / P0 * R.c[1], R.c[1], R.seed + 1) * 2 - 1), c = pvn(x / P0 * R.c[2], R.c[2], R.seed + 2); return (.58 * a + .32 * b + .1 * c) * (hs - 3); };
      const hts = new Float32Array(P0 + 2); for(let x = 0; x < P0 + 2; x++) hts[x] = hf(x);
      const hAt = x => hts[((Math.round(x) % P0) + P0) % P0];
      const make = cols => { const c = document.createElement('canvas'); c.width = P0 * 2; c.height = hs; const k = c.getContext('2d'), img = k.createImageData(P0, hs), d = img.data, rgb = cols.map(hx);
        const put = (x, y, ci) => { const o = (y * P0 + x) * 4, v = rgb[ci]; d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = 255; };
        for(let x = 0; x < P0; x++){ const top = Math.round(hs - hAt(x)), lvl = R.tree * (hs - 3) * (.75 + .5 * pvn(x / P0 * 40, 40, R.seed + 5));
          for(let y = Math.max(0, top); y < hs; y++){ const dep = y - top, alt = hs - y, th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16;
            if(li === 2){ // near hills: dark forest with snow dabs, a few clearings
              const clear = pvn(x / P0 * 90, 90, 31) > .72 && dep > 1 && dep < 6; put(x, y, dep === 0 ? 1 : clear ? (th < .5 ? 2 : 1) : (H0(x * 7.3 + y * 3.1) > .9 ? 1 : 0)); continue; }
            // facets: compare the ridge left and right at a scale that grows with depth, so each peak throws a lit and a shaded face
            const sc = 2 + dep * .8, s = hAt(x + sc) - hAt(x - sc), sl = s / sc;
            const snow = alt > lvl || (alt > lvl * .7 && th < (alt - lvl * .7) / (lvl * .3));
            if(!snow){ put(x, y, H0(x * 5.7 + y * 9.1) > .86 ? 1 : 0); continue; }
            const gully = pvn(x / P0 * R.c[2] * 2.2, R.c[2] * 2.2 | 0, R.seed + 9) > .78 && dep > 3;
            let ci = sl < -.15 ? 2 : sl > .15 ? 1 : (th < .5 + sl * 3 ? 2 : 1);
            if(gully && ci === 2 && th < .5) ci = 1;
            if(dep === 0) ci = sl < .1 ? 3 : 2; else if(dep === 1 && sl < -.2) ci = 3;
            put(x, y, ci); } }
        k.putImageData(img, 0, 0);
        if(li === 1){ // ropeway: pylons and a cable up the mid range
          const y0 = hs - hAt(ROPE.x0) + 2, y1 = hs - hAt(ROPE.x1) - 3; k.fillStyle = cols[0];
          for(let i = 1; i < 4; i++){ const t = i / 4, px = Math.round(lerp(ROPE.x0, ROPE.x1, t)), py = Math.round(lerp(y0, y1, t) + Math.sin(t * Math.PI) * 4); k.fillStyle = '#0c0e1c'; k.fillRect(px, py, 1, Math.max(2, Math.round(hs - hAt(px) - py + 1))); k.fillRect(px - 1, py, 3, 1); }
          k.fillStyle = '#5a6080'; for(let x = ROPE.x0; x <= ROPE.x1; x++){ const t = (x - ROPE.x0) / (ROPE.x1 - ROPE.x0); k.fillRect(x, Math.round(lerp(y0, y1, t) + Math.sin(t * Math.PI) * 4) - 1, 1, 1); }
          k.fillStyle = '#0c0e1c'; k.fillRect(ROPE.x0 - 3, y0 - 3, 7, 5); k.fillRect(ROPE.x1 - 3, y1 - 3, 7, 5); k.fillStyle = '#ffd890'; k.fillRect(ROPE.x0 - 1, y0 - 1, 3, 1); k.fillRect(ROPE.x1 - 1, y1 - 1, 3, 1);
          ROPE.y0 = y0; ROPE.y1 = y1; }
        if(li === 2){ // the village in the valley: warm windows in clusters on the near hills
          for(let b = 0; b < 5; b++){ const cxp = 90 + b * 190 + H0(b * 3) * 60; for(let j = 0; j < 22; j++){ const dx = (H0(b * 31 + j) - .5) * 2, x = Math.round(cxp + dx * Math.abs(dx) * 34) % P0, y = Math.round(hs - 2 - H0(b * 7 + j * 3.3) * Math.min(hAt(x) - 1, 6) * (1 - Math.abs(dx) * .6));
            k.fillStyle = H0(j + b) > .8 ? '#fff0d0' : H0(j * 3 + b) > .4 ? '#ffc070' : '#c07038'; k.fillRect(x, y, 1, 1); } } }
        k.drawImage(c, 0, 0, P0, hs, P0, 0, P0, hs); return c; };
      STRIPS.push({ hs, night:make(R.col), dawn:make(R.dawn) }); } }

  // ---------------------------------------------------------------- haze and fog colour caches
  let fogLow = '', HAZE = '#3a4064', FC = new Map();
  // colours snap to a 32-level grid per channel, so the slowly changing night reuses caches instead of rebuilding them every frame
  const q5 = col => { const [r, g, b] = hx(col); return '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); };
  let lowRaw = '';
  const setLow = low => { if(low === lowRaw) return; lowRaw = low; const q = q5(low); if(q === fogLow) return; fogLow = q; FC.clear(); HAZE = q; };   // scenery fogs toward the road's own fog colour (sk.low), so the distance reads as one
  const fc = (col, fog) => { let a = FC.get(col); if(!a){ a = new Array(17); FC.set(col, a); } const q = Math.round(fog * 16); return a[q] || (a[q] = mixc(col, HAZE, q / 16 * .85)); };
  const WC2 = new Map();
  const fcw = (col, warm, fog) => { let a = WC2.get(col); if(!a){ a = new Array(9); WC2.set(col, a); } const q = Math.round(warm * 8); return fc(a[q] || (a[q] = mixc(col, '#c08050', q / 8 * .55)), fog); };
  // a quad, clipped to a margin round the screen first: walls right beside the camera have vertices tens of thousands of pixels away,
  // and filling those raw costs the rasteriser far more than the visible part (Sutherland-Hodgman against four edges)
  const CA = new Float64Array(24), CB = new Float64Array(24);
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col){ const m = W * .5, lo = -m, hiX = W + m, loY = -H * .5, hiY = H * 1.5;
    if(x1 >= lo && x2 >= lo && x3 >= lo && x4 >= lo && x1 <= hiX && x2 <= hiX && x3 <= hiX && x4 <= hiX && y1 >= loY && y2 >= loY && y3 >= loY && y4 >= loY && y1 <= hiY && y2 <= hiY && y3 <= hiY && y4 <= hiY){
      cx.fillStyle = col; cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.lineTo(x3, y3); cx.lineTo(x4, y4); cx.closePath(); cx.fill(); return; }
    let a = CA, b = CB, n = 4; a[0] = x1; a[1] = y1; a[2] = x2; a[3] = y2; a[4] = x3; a[5] = y3; a[6] = x4; a[7] = y4;
    for(let e = 0; e < 4 && n; e++){ let o = 0; const ax = e < 2, sg = e % 2 ? -1 : 1, lim = e === 0 ? lo : e === 1 ? hiX : e === 2 ? loY : hiY;
      for(let i = 0; i < n; i++){ const j = (i + 1) % n, px = a[i * 2], py = a[i * 2 + 1], qx = a[j * 2], qy = a[j * 2 + 1], pv = (ax ? px : py) * sg, qv = (ax ? qx : qy) * sg, L = lim * sg, pin = pv >= L, qin = qv >= L;
        if(pin){ b[o++] = px; b[o++] = py; } if(pin !== qin){ const t = (L - pv) / (qv - pv); b[o++] = px + (qx - px) * t; b[o++] = py + (qy - py) * t; } }
      n = o / 2; const t = a; a = b; b = t; }
    if(n < 3) return; cx.fillStyle = col; cx.beginPath(); cx.moveTo(a[0], a[1]); for(let i = 1; i < n; i++) cx.lineTo(a[i * 2], a[i * 2 + 1]); cx.closePath(); cx.fill(); }
  // the same quad on the canvas pixel grid, for the inn facades (Kellan, review card snow-facades: "Yes"): clipped to the margin as poly() is, then
  // filled on whole canvas pixels by gridFill (below), so bands sharing an edge tile with no seam or overlap. No antialiased edge pixels:
  // nothing shimmers as the camera creeps, and the ~1,000 bands a frame go out as batched fillRects instead of path fills
  function gpoly(x1, y1, x2, y2, x3, y3, x4, y4, col){ const m = W * .5, lo = -m, hiX = W + m, loY = -H * .5, hiY = H * 1.5; let a = CA, n = 4;
    if(x1 === x4 && x2 === x3 && x1 >= lo && x1 <= hiX && x2 >= lo && x2 <= hiX && Math.abs(x2 - x1) <= PX * 48 && y1 >= loY && y1 <= hiY && y2 >= loY && y2 <= hiY && y3 >= loY && y3 <= hiY && y4 >= loY && y4 <= hiY){ vfill(x1, y1, y4, x2, y2, y3, col); return; }   // most bands
    a[0] = x1; a[1] = y1; a[2] = x2; a[3] = y2; a[4] = x3; a[5] = y3; a[6] = x4; a[7] = y4;
    if(!(x1 >= lo && x2 >= lo && x3 >= lo && x4 >= lo && x1 <= hiX && x2 <= hiX && x3 <= hiX && x4 <= hiX && y1 >= loY && y2 >= loY && y3 >= loY && y4 >= loY && y1 <= hiY && y2 <= hiY && y3 <= hiY && y4 <= hiY)){
      let b = CB; for(let e = 0; e < 4 && n; e++){ let o = 0; const ax = e < 2, sg = e % 2 ? -1 : 1, lim = e === 0 ? lo : e === 1 ? hiX : e === 2 ? loY : hiY;
        for(let i = 0; i < n; i++){ const j = (i + 1) % n, px = a[i * 2], py = a[i * 2 + 1], qx = a[j * 2], qy = a[j * 2 + 1], pv = (ax ? px : py) * sg, qv = (ax ? qx : qy) * sg, L = lim * sg, pin = pv >= L, qin = qv >= L;
          if(pin){ b[o++] = px; b[o++] = py; } if(pin !== qin){ const t = (L - pv) / (qv - pv); b[o++] = px + (qx - px) * t; b[o++] = py + (qy - py) * t; } }
        n = o / 2; const t = a; a = b; b = t; } }
    if(n >= 3) gridFill(a, n, col); }
  // a band with both ends vertical (x1: y1..y4, x2: y2..y3), the usual facade band: by columns straight from its two edge lines, the same pixels
  // gridFill's column scan gives (centre inside), with no edge search (measured: as cheap on the CPU as the antialiased path fill it replaces)
  function vfill(xa, ya0, ya1, xb, yb0, yb1, col){ if(xb < xa){ let t = xa; xa = xb; xb = t; t = ya0; ya0 = yb0; yb0 = t; t = ya1; ya1 = yb1; yb1 = t; }
    const dx = xb - xa; if(!(dx > 0)) return; const c0 = Math.max(0, Math.ceil(xa / PX - .5)), c1 = Math.min(cv.width - 1, Math.floor(xb / PX - .5)); if(c1 < c0) return;
    const sa = (yb0 - ya0) / dx, sb = (yb1 - ya1) / dx, ymn = -PX, ymx = H + PX; cx.fillStyle = col; let ql = 0, qr = 0, qs = 0, qe = 0;
    for(let c = c0; c <= c1; c++){ const d = (c + .5) * PX - xa; let lo = ya0 + sa * d, hi = ya1 + sb * d; if(lo > hi){ const t = lo; lo = hi; hi = t; } if(lo < ymn) lo = ymn; if(hi > ymx) hi = ymx; if(hi < lo) continue;
      let yt = Math.round(lo / PX), yb = Math.round(hi / PX); if(yb <= yt){ yt = Math.floor((lo + hi) / 2 / PX); yb = yt + 1; }
      if(yt === ql && yb === qr && c === qe){ qe = c + 1; continue; }
      if(qe > qs) cx.fillRect(qs * PX, ql * PX, (qe - qs) * PX, (qr - ql) * PX); ql = yt; qr = yb; qs = c; qe = c + 1; }
    if(qe > qs) cx.fillRect(qs * PX, ql * PX, (qe - qs) * PX, (qr - ql) * PX); }
  // A pixel is filled when its centre is inside the polygon, the core pxPoly rule, run by rows or by columns, whichever needs fewer rects: a band
  // whose top and bottom run across the slice at a slant (the roofs, the eaves seen near) changes its span every row but every column only once,
  // so it goes out column by column. Both scans give the same pixels, so neighbouring bands tile whichever way each was cut. A band thinner than
  // a pixel keeps the pixel under its centre in each column (a shoji bar or an eave line far off stays one unbroken pixel line, never dotted).
  // A band needing more than 48 rects either way (a wall right beside the camera) is one path with its corners on the grid, as in the core.
  function gridFill(a, n, col){ let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sr = 0;
    for(let i = 0; i < n; i++){ const x = a[i * 2], y = a[i * 2 + 1]; if(!(x === x && y === y)) return; if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y;
      const j = (i + 1) % n, dx = Math.abs(a[j * 2] - x), dy = Math.abs(a[j * 2 + 1] - y); if(dx > PX * .5) sr += dy; }   // sr: the rows a slanted edge spans (where a row scan needs a rect each)
    const r0 = Math.max(0, Math.ceil(y0 / PX - .5)), r1 = Math.min(cv.height - 1, Math.floor(y1 / PX - .5)), c0 = Math.max(0, Math.ceil(x0 / PX - .5)), c1 = Math.min(cv.width - 1, Math.floor(x1 / PX - .5));
    const thin = y1 - y0 < PX * 1.5, nr = Math.min(r1 - r0 + 1, sr / PX + 1), nc = c1 - c0 + 1; cx.fillStyle = col;
    if(thin ? nc > 48 : Math.min(nr, nc) > 48){ if(r1 < r0 || c1 < c0) return; cx.beginPath(); cx.moveTo(snap(a[0]), snap(a[1])); for(let i = 1; i < n; i++) cx.lineTo(snap(a[i * 2]), snap(a[i * 2 + 1])); cx.closePath(); cx.fill(); return; }
    let ql = 0, qr = 0, qs = 0, qe = 0;
    if(thin || nc <= nr){ if(c1 < c0) return; const ymn = -PX, ymx = H + PX;   // by columns: each column's run, sampled at its centre
      for(let c = c0; c <= c1; c++){ const xc = (c + .5) * PX; let lo = Infinity, hi = -Infinity;
        for(let i = 0; i < n; i++){ const j = (i + 1) % n, px = a[i * 2], py = a[i * 2 + 1], qx = a[j * 2], qy = a[j * 2 + 1];
          if((px <= xc && qx > xc) || (qx <= xc && px > xc)){ const yy = py + (xc - px) * (qy - py) / (qx - px); if(yy < lo) lo = yy; if(yy > hi) hi = yy; } }
        if(!(hi >= lo)) continue; if(lo < ymn) lo = ymn; if(hi > ymx) hi = ymx; let yt = Math.round(lo / PX), yb = Math.round(hi / PX);
        if(yb <= yt){ yt = Math.floor((lo + hi) / 2 / PX); yb = yt + 1; }
        if(yt === ql && yb === qr && c === qe){ qe = c + 1; continue; }
        if(qe > qs) cx.fillRect(qs * PX, ql * PX, (qe - qs) * PX, (qr - ql) * PX); ql = yt; qr = yb; qs = c; qe = c + 1; }
      if(qe > qs) cx.fillRect(qs * PX, ql * PX, (qe - qs) * PX, (qr - ql) * PX); return; }
    if(r1 < r0) return; const xmn = -PX, xmx = W + PX;   // by rows
    for(let r = r0; r <= r1; r++){ const yc = (r + .5) * PX; let lo = Infinity, hi = -Infinity;
      for(let i = 0; i < n; i++){ const j = (i + 1) % n, px = a[i * 2], py = a[i * 2 + 1], qx = a[j * 2], qy = a[j * 2 + 1];
        if((py <= yc && qy > yc) || (qy <= yc && py > yc)){ const xx = px + (yc - py) * (qx - px) / (qy - py); if(xx < lo) lo = xx; if(xx > hi) hi = xx; } }
      if(!(hi >= lo)) continue; if(lo < xmn) lo = xmn; if(hi > xmx) hi = xmx; let xl = Math.round(lo / PX), xr = Math.round(hi / PX);
      if(xr <= xl){ xl = Math.floor((lo + hi) / 2 / PX); xr = xl + 1; }
      if(xl === ql && xr === qr && r === qe){ qe = r + 1; continue; }
      if(qe > qs) cx.fillRect(ql * PX, qs * PX, (qr - ql) * PX, (qe - qs) * PX); ql = xl; qr = xr; qs = r; qe = r + 1; }
    if(qe > qs) cx.fillRect(ql * PX, qs * PX, (qr - ql) * PX, (qe - qs) * PX); }
  // sprite blits clipped to the screen in source pixels, so a sprite beside the camera (scaled to thousands of pixels) costs no more than one on screen
  function blitSrc(c, sx, sy, sw, sh, dx, dy, k){ let x0 = dx, y0 = dy, x1 = dx + sw * k, y1 = dy + sh * k; if(x1 <= 0 || y1 <= 0 || x0 >= W || y0 >= H) return;
    cx.imageSmoothingEnabled = false; if(x0 >= -1 && y0 >= -1 && x1 <= W + 1 && y1 <= H + 1){ cx.drawImage(c, sx, sy, sw, sh, x0, y0, x1 - x0, y1 - y0); return; }
    const a = Math.max(0, Math.floor(-x0 / k)), b = Math.max(0, Math.floor(-y0 / k)), e = Math.min(sw, Math.ceil((W - x0) / k)), f = Math.min(sh, Math.ceil((H - y0) / k)); if(e <= a || f <= b) return;
    cx.drawImage(c, sx + a, sy + b, e - a, f - b, x0 + a * k, y0 + b * k, (e - a) * k, (f - b) * k); }
  function blit(c, x, yBottom, k){ blitSrc(c, 0, 0, c.width, c.height, Math.round(x - c.width * k / 2), Math.round(yBottom - c.height * k), k); }
  const PATS = new Map();
  function pat(col, dens){ return ditherPat(q5(col), dens); }   // the engine's pattern cache: no canvas per colour
  const gl = (x, y, r, col, a) => { if(x + r < 0 || x - r > W || y + r < 0 || y - r > H) return; glow(x, y, Math.min(r, H * .3), col, a); };
  function pool(x, y, rx, ry, col, a){ if(rx < 2 || a <= 0) return; const [R, G, B] = hx(col); cx.globalCompositeOperation = 'lighter';
    for(const [f, m] of [[1, .1], [.62, .16], [.32, .22]]){ cx.fillStyle = `rgba(${R},${G},${B},${a * m})`; cx.beginPath(); cx.ellipse(x, y, rx * f, Math.max(PX, ry * f), 0, 0, 6.283); cx.fill(); }
    cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- layout along the road
  // a 400-segment cycle: snow corridor (walls taller than a bus), the gate, the onsen street with its bridge, then open cedar forest
  const PER = 400, COR1 = 120, GATE = 150, TOWN0 = 150, TOWN1 = 330, BR0 = 236, BR1 = 252, BANKX = 1.16, BASEH = .15, TALL = 1.15, LEAN = .12;
  const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function bankH(i){ const m = ((i % PER) + PER) % PER; let h = BASEH;
    if(m < COR1) h = lerp(BASEH, TALL, sm(Math.min(m, COR1 - m) / 30));
    const db = m < BR0 ? BR0 - m : m >= BR1 ? m - BR1 + 1 : 0; if(db < 7) h *= sm(db / 7);
    return h; }
  const isTown = m => m >= TOWN0 && m < TOWN1, isBridge = m => m >= BR0 && m < BR1;
  /* The ski jump (setpiece/jump.js 'SKI JUMP', research/sundown-craft/jumpsides.md). o = segment - plan.b0: the ramp is 0..JNL-1, the gap
     JNL..JNL+JG-1, the far leaf after, JTOT in all. The town, the banks, the lamps, the steam and the river all carry on beside it (the
     jump's default keep). Its own: the snow pole arrows (yabane, at the kerb) stand by the ramp and the landing but not over the gap; the
     town gate, which spans the road, never stands inside the jump (a ramp through it): it is put up GATE_PRE segments before the ramp's
     foot instead, so the town is still entered under it. */
  const JNL = 22, JG = 22, JTOT = 66, GATE_PRE = 8;
  const jumpO = j => { const t = segs[j], p = t && t.spjP; return p && p.kind === 'bridge' ? j - p.b0 : null; };
  // is there a town gate here? (its own spot, unless that falls in a jump; or the spot just before a jump whose span holds the gate)
  function gateAt(i, m){ const o = jumpO(i); if(m === GATE) return !(o !== null && o >= 0 && o < JTOT);
    if(o !== -GATE_PRE) return false; const g = GATE - m - GATE_PRE; return g >= 0 && g < JTOT; }
  // the inns along the street: runs of 6-9 segments with 1-2 segment alleys between, different on each side; BLD[side][m] = { b0, v, n }
  const FX = 1.42, BLD = { '-1':[], '1':[] }; let bldDone = false;
  function buildTable(){ if(bldDone) return; bldDone = true; for(const side of [-1, 1]){ let m = TOWN0 + 5 + (side > 0 ? 3 : 0), b = 0;
    while(m < TOWN1 - 4){ if(m >= BR0 - 9 && m < BR1 + 8){ m = BR1 + 8 + (side > 0 ? 2 : 0); continue; }
      const len = 6 + (H0(b * 3.7 + side * 11) * 4 | 0), v = (H0(b * 5.3 + side * 7) * 4) | 0, end = Math.min(m + len, TOWN1 - 4, m < BR0 ? BR0 - 9 : 1e9);
      for(let j = m; j < end; j++) BLD[side][j] = { b0:m, v, n:b, end };
      m = end + 1 + (H0(b * 9.1 + side) > .55 ? 1 : 0); b++; } } }
  const lampSeg = m => isTown(m) && !isBridge(m) && m % 10 === 4 && m > TOWN0 + 6;
  function place(i, s){ buildTable(); const sp = s.sprites, m = i % PER, add = o => sp.push(Object.assign({ env:'snow', k:i }, o)), town = isTown(m), br = isBridge(m), nearBr = m >= BR0 - 8 && m < BR1 + 8;
    const h = bankH(i), hn = bankH(i + 1), jo = jumpO(i); s.snH = h; s.snBr = br;
    // a set piece may claim this segment (setpiece/avalanche.js: the slope and the snow shed): ENV.snow.clear(i, side) returns -1 to keep
    // the road's own look, else a cap on the bank height (0 = no bank) with that side's props left out
    const CL = ENV.snow.clear, cl = side => CL ? CL(i, side) : -1, clL = cl(-1), clR = cl(1); s.snCl = clL >= 0 || clR >= 0;
    for(const side of [-1, 1]){ const sk = i * 2 + (side > 0 ? 1 : 0), cap = side < 0 ? clL : clR;
      if(cap >= 0){ const hc = Math.min(h, cap), hnc = Math.min(hn, cap); if(hc > .005 || hnc > .005) add({ type:'bank', x:side * BANKX, s, h:hc, h2:hnc, side }); continue; }
      // far things first (each segment's bank must draw over them)
      if(m < COR1){ if(h > .7 && i % 3 === 0) add({ type:'tree', x:side * (BANKX + LEAN * h + .6 + H0(sk * 1.7) * 2.2), lift:h, v:sk % 3, sz:.75 + H0(sk * 2.3) * .4 }); }
      else if(town && !nearBr){
        const bd = BLD[side][m];
        if(bd){ add({ type:'fac', x:side * FX, s, side, v:bd.v, b0:bd.b0, n:bd.n }); if(m === bd.b0) add({ type:'ryo', x:side * (FX + .95), xo:side * (FX + .95), v:bd.v, side, b0:i, len:1 }); }
        else if(H0(sk * 1.9) > .4) add({ type:'tsuri', x:side * (FX + .5 + H0(sk) * .4) });
        if(m % 23 === 11 && side === ((m / 23 | 0) % 2 ? 1 : -1)) add({ type:'steam', x:side * (2.5 + H0(sk) * .4), lift:2.6, rise:2.4, n:8, w:.5 }); }
      else if(br){ if((m - BR0) % 3 === 1) add({ type:'steam', x:side * (1.4 + H0(sk) * .6), lift:0, rise:1.5, n:7, w:.8 }); if(m === BR0 + 8) add({ type:'steam', x:side * (2.8 + H0(sk)), lift:0, rise:2, n:8, w:1.2 }); }
      else if(m >= COR1 + 10){ if(H0(sk * 3.1) < .3) add({ type:'tree', x:side * (1.7 + H0(sk * 1.3) * 4.5), v:sk % 3, sz:.8 + H0(sk * 5.1) * .5 }); }
      // bank (or the bridge rail)
      if(br) add({ type:'rail', x:side * BANKX, s, side, post:m % 3 === 0 });
      else if(h > .005 || hn > .005) add({ type:'bank', x:side * BANKX, s, h, h2:hn, side });
      if(town && !br && h > .1 && m % 3 === 1 && H0(sk * .7) < .6) add({ type:'toro', x:side * (BANKX + .1), lift:h * .8 });
      if(lampSeg(m)) add({ type:'lamp', x:side * (BANKX + .12), lift:h * .8 });
      if(!town && !nearBr && m % 8 === 0 && !(jo !== null && jo >= JNL && jo < JNL + JG)) add({ type:'yabane', x:side * 1.1 }); }
    const gate = gateAt(i, m); if(gate && !(clL === 0 && clR === 0)) add({ type:'gate', x:0 });
    // light on the road: lamps, the gate's lanterns, the bridge
    const L = (n, v) => { const t = segs[n]; if(!t) return; t.snLit = Math.max(t.snLit || 0, v); if(n < i) t.lit = Math.max(t.lit || 0, v); };
    if(lampSeg(m) && (clL < 0 || clR < 0)) for(let d = -2; d <= 1; d++) L(i + d, .45 * (1 - Math.abs(d) / 3));
    if(gate && !(clL === 0 && clR === 0)) for(let d = -4; d <= 1; d++) L(i + d, .55 * (1 - Math.abs(d) / 5));
    s.snLit = s.snLit || 0; }

  // ---------------------------------------------------------------- drawing
  const SPAN = f => { f = fogPx(f); return f > .6 ? 5 : f > .4 ? 4 : f > .22 ? 3 : f > .1 ? 2 : 1; };   // tiers by screen size (fogPx: the fog the old 260-segment draw distance gave here)
  // (over a side lane the engine pushes this side's roadside out beyond it, window.laneDX: a span never crosses a change of that push)
  const LX = k => window.laneDX ? laneDX(k) : 0;
  // Span LOD without holes (the scheme env/pass.js's cliff uses): every segment's span comes from its own distance (b0, the camera's segment,
  // recovered from this segment's fog), a slice starts where its own span divides its index and runs on to the next start. It used to run to
  // the next multiple of the start's span: where the tiers change, a nearer start's short span stopped one to four segments before the next
  // start, and that gap in the banks, rails and facades slid along with the camera, so far scenery blinked in and out (Kellan, 2026-11-23)
  const spanAt = (j, b0) => SPAN(clamp(Math.pow((j - b0) / DRAW_N, 1.6), 0, 1));
  const farEnd = (sp, fog) => { const i = sp.s.index, b0 = i - Math.round(DRAW_N * Math.pow(fog, 1 / 1.6)), d = LX(i); if(i % spanAt(i, b0) && LX(i - 1) === d) return null; let e = i + 1; while(e < i + 8 && e % spanAt(e, b0) && LX(e) === d) e++; const t = segs[e - 1]; return t && t.p2.screen.w ? t : sp.s; };
  const WALL = { face:['#3a4372', '#363f6c', '#3d4676'], strata:'#2c3460', light:'#4c5688', crest:'#c4ceec', under:'#262c52', top:'#7a86b8' };
  let FACES = null;
  // the snow field behind a low corridor bank: the ground's snow (LANDS' snow grass) at the base height to WALL.top at h .5, in 8 steps (bounded: fcw caches per colour)
  const TOPC = [], topCol = h => { const q = Math.round(clamp((h - BASEH) / (.5 - BASEH), 0, 1) * 8); return TOPC[q] || (TOPC[q] = mixc('#5a6488', WALL.top, q / 8)); };
  function drawBank(sp, x, y, uw, fog, now){ if(!FACES) FACES = [...WALL.face, ...WALL.face.map(c => mixc(c, SN.M, .12))]; const t = farEnd(sp, fog); if(!t) return; const p = t.p2.screen; if(!p.w) return; const side = sp.side, x2 = p.x + sp.x * p.w, y2 = p.y, u2 = p.w, h2v = t === sp.s ? sp.h2 : bankH(t.index + 1);
    const k = sp.k, lit = Math.min(1, (sp.s.snLit || 0) * 1.4), mn = MOON.x > x ? 1 : -1, faceMoon = mn === -side ? .12 : 0;   // the bank on the far side from the moon faces it
    const H1 = uw * sp.h, H2 = u2 * h2v, L1 = side * uw * LEAN * sp.h, L2 = side * u2 * LEAN * h2v;
    const band = (f0, f1, col) => poly(x + L1 * f0, y - H1 * f0, x2 + L2 * f0, y2 - H2 * f0, x2 + L2 * f1, y2 - H2 * f1, x + L1 * f1, y - H1 * f1, col);
    const face = fcw(FACES[(k / 7 | 0) % 3 + (faceMoon ? 3 : 0)], lit, fog);
    // Behind a corridor wall's top lies snow at the wall's height: wherever we look down onto it (the road climbs), it hides the ground beyond.
    // That holds for the low banks at the corridor's ends too, where the hill it is cut through rises out of the road: there the field used to
    // be left out, and on a climb its rows lie above the farthest road, where no ground is drawn, so the sky showed through in wedges beside
    // the wall (Kellan, 2026-11-23: hills missing their front top parts). Its colour runs from the ground's snow (a bank at the base height) to the
    // wall-top snow at h .5, so the ramp meets the ground and the tall wall with no seam. The street's banks are berms with no field behind them.
    { const ty1 = y - H1, ty2 = y2 - H2; if(ty1 > ty2 + .5 && (sp.h >= .5 || ((k % PER) + PER) % PER < COR1)){ const ex = side < 0 ? -4 : W + 4; poly(x + L1, ty1, x2 + L2, ty2, ex, ty2, ex, ty1, fcw(sp.h >= .5 ? WALL.top : topCol(sp.h), lit * .5, fog)); } }
    // low bank: we see its top, so a lit crest band over a short shaded face
    if(sp.h < .5){ const j = H0(k * 1.37) * .25; band(0, 1, face); if(fog < .9){ band(.62, 1 + j * .5, fcw(WALL.top, lit, fog)); band(.9 + j * .5, 1.06 + j, fcw(WALL.crest, lit * .6, fog)); } return; }
    // tall corridor wall
    // strata of old snowfalls, plough-cutter marks, a dark overhang and a moonlit rim at the top
    band(0, 1, face); if(fog > .35){ band(.9, 1.02, fc(WALL.crest, fog)); return; }
    const s1 = .2 + Math.sin(k * .11) * .03 + Math.sin(k * .37) * .008, s2 = .46 + Math.sin(k * .07 + 2) * .04, s3 = .7 + Math.sin(k * .05 + 4) * .03, sc = fcw(WALL.strata, lit, fog), lc = fcw(WALL.light, lit, fog);
    if(fog > .15){ band(s1 - .025, s1, sc); band(s2 - .025, s2, sc); band(s3 - .025, s3, sc); band(.86, 1.02, fc(WALL.crest, fog)); band(.84, .9, fcw(WALL.under, lit * .5, fog)); return; }
    for(const f of [s1, s2, s3]){ band(f - .025, f, sc); band(f, f + .03, lc); }
    band(0, .06, fcw('#2a3058', lit, fog));
    const j = H0(k * 1.37) * .06, j2 = H0(k * 2.71); band(.84, .93 + j * .5, fcw(WALL.under, lit * .5, fog)); band(.93 + j * .5, 1 + j, fc(j2 > .5 ? WALL.crest : WALL.top, fog)); if(j2 > .3) band(1 + j - .012, 1 + j + .025 + j2 * .03, fc(WALL.crest, fog));
    if(k % 9 === 0 && uw > 12){ const ax = x + L1 * .06, ay = y - H1 * .06, cy2 = Math.max(-PX, y - H1 * .84); cx.fillStyle = lc; cx.fillRect(Math.round(ax), cy2, Math.max(PX, snap(uw * .01)), Math.min(H, ay) - cy2); } }
  // the vermilion bridge rail: posts with giboshi caps, a top rail with snow on it, a lower rail; the river shows between
  function drawRail(sp, x, y, uw, fog, now){ const t = farEnd(sp, fog); if(!t) return; const p = t.p2.screen; if(!p.w) return; const x2 = p.x + sp.x * p.w, y2 = p.y, u2 = p.w;
    const th = (yy, nyy, t1, t2, col) => poly(x, yy, x, yy + t1, x2, nyy + t2, x2, nyy, col);
    const rh = uw * .24, nrh = u2 * .24, tt = Math.max(PX, uw * .03), nt = Math.max(PX, u2 * .03);
    th(y - uw * .04, y2 - u2 * .04, uw * .04, u2 * .04, fc('#3a1418', fog));                                    // deck edge
    if(fog < .7) th(y - rh * .45, y2 - nrh * .45, Math.max(PX, uw * .02), Math.max(PX, u2 * .02), fc(RED.D, fog));
    th(y - rh, y2 - nrh, tt, nt, fc(RED.M, fog)); th(y - rh - Math.max(PX, uw * .012), y2 - nrh - Math.max(PX, u2 * .012), Math.max(PX, uw * .012), Math.max(PX, u2 * .012), fc(SN.H, fog));
    if(sp.post){ const pw = Math.max(PX, snap(uw * .035)); cx.fillStyle = fc(RED.M, fog); cx.fillRect(Math.round(x - pw / 2), y - rh * 1.15, pw, rh * 1.15);
      cx.fillStyle = fc(RED.L, fog); cx.fillRect(Math.round(x - pw / 2), y - rh * 1.15, Math.max(PX, pw / 3), rh * 1.15);
      cx.fillStyle = fc('#6a5a3a', fog); cx.fillRect(Math.round(x - pw * .7), y - rh * 1.3, Math.round(pw * 1.4), Math.max(PX, rh * .15));
      cx.fillStyle = fc(SN.H, fog); cx.fillRect(Math.round(x - pw * .6), y - rh * 1.38, Math.round(pw * 1.2), Math.max(PX, rh * .08)); } }
  // the inn's end wall as real geometry (2026-11-20, buildings3d; the shared kit ENV.bkit in env/buildings.js). The hand-drawn sprite
  // above is the design and stays the far tier; once its art pixels would grow past ~1.3 screen pixels the same composition is drawn as quads
  // on the end plane, so up close it stays crisp: thin lattice bars, kumiko grids and balusters one screen pixel wide, not upscaled blocks.
  // Heights match drawFac's street face (eaves at .84 and top1, the roof from rb to rt), laterals run from the street face (FX) back 1.9.
  const RYD = 1.9;
  function ryoGeo(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || !K.begin(sp, x, y, uw, fog, 0)) return false; const v = sp.v, tall = v % 2 === 1, F = c => fc(c, fog), wf = fog * .55, a = 1 - fog * .85;
    const L0 = FX, L1 = FX + RYD, Lr = s0 => L0 + RYD * s0, E = (s0, h0, s1, h1, col) => K.E(Lr(s0), h0, Lr(s1), h1, col), bar = (s0, h0, h1, col) => K.E(Lr(s0), h0, Lr(s0) + Math.max(.012, PX / K.pu(0)), h1, col);
    const top1 = tall ? 1.55 : 1.72, rb = tall ? 2.28 : top1 + .12, rt = rb + .7, hj = n => H0(v * 7.3 + n);
    // ground floor: wall, the lit koshi lattice (far half), the entrance with the noren and ♨ (near half), posts, the chōchin, the footing
    E(0, 0, 1, .86, F(WD.M)); E(-.01, 0, 1.01, .05, F('#161828'));
    E(.42, .2, .9, .74, fc(SJ[2], wf)); E(.42, .3, .9, .62, fc(SJ[3], wf)); for(let b = 0; b <= 10; b++) bar(.42 + .48 * b / 10, .2, .74, F(WD.D)); E(.42, .74, .9, .76, F(WD.L)); E(.42, .18, .9, .2, F(WD.O));
    E(.06, .05, .34, .78, fc(SJ[2], wf)); E(.06, .05, .34, .42, fc(SJ[3], wf)); E(.06, .05, .34, .07, fc(SJ[1], wf));
    E(.06, .42, .34, .76, F(NOREN)); E(.06, .74, .34, .78, F(WD.O)); for(const s0 of [.153, .247]) bar(s0, .42, .76, F('#0c1230')); E(.06, .42, .34, .45, F(NOREN2));
    if(fog < .3){ const u = s0 => s0 * .045 / RYD; ['.#.#.#.', '#.#.#..', '.#.#.#.', '#.....#', '.#####.'].forEach((row, yy) => { for(let xx = 0; xx < 7; xx++) if(row[xx] === '#') E(.17 + (6 - xx) * .0142, .68 - yy * .03, .17 + (7 - xx) * .0142, .7 - yy * .03, F('#d8dcea')); }); }
    for(const s0 of [0, .37, .96]){ E(s0, .05, s0 + .045, .86, F(WD.D)); E(s0 + .03, .05, s0 + .045, .86, F(WD.L)); }
    { const c0 = .355, h0 = .6; E(c0 - .045, h0, c0 + .045, h0 + .16, F(RED.M)); E(c0 + .03, h0, c0 + .045, h0 + .16, F(RED.L)); E(c0 - .045, h0, c0 - .03, h0 + .16, F(RED.D)); E(c0 - .045, h0 + .07, c0 + .045, h0 + .085, F(RED.D)); E(c0 - .02, h0 + .16, c0 + .02, h0 + .19, F(WD.O)); E(c0 - .02, h0 - .03, c0 + .02, h0, F(WD.O)); E(c0 + .005, h0 + .1, c0 + .02, h0 + .13, F(RED.H));
      if(fog < .6) gl(K.px(Lr(c0), 0, 0), K.py(0, h0 + .08, 0), K.pu(0) * .3, RED.L, .5 * a); }
    if(fog < .6) gl(K.px(Lr(.2), 0, 0), K.py(0, .2, 0), K.pu(0) * .45, WARM, .3 * a);
    // snow drifted against the wall (lower in front of the door)
    for(let c = 0; c < 14; c++){ const s0 = c / 14, d = s0 > .05 && s0 < .34 ? .3 : 1, hh = (.03 + .07 * Math.abs(Math.sin(c * 1.7 + v))) * d; E(s0, 0, s0 + 1 / 14 + .002, hh, F(SN.M)); E(s0, hh - .015, s0 + 1 / 14 + .002, hh, F(SN.L)); }
    // first eave: the dark board, the snow cap (lumpy top, palest along it), icicles
    const cp = (h0, j0, lo) => { E(-.04, h0 - .03, 1.04, h0 + .01, F(WD.O)); E(-.05, h0 + .01, 1.05, h0 + .12, F(SN.L)); for(let c = 0; c < 10; c++){ const bump = hj(j0 + c) > .6 ? .02 : 0; E(-.05 + c * .11, h0 + .12, -.05 + (c + 1) * .11, h0 + .14 + bump, F(SN.H)); }
      if(fog < .3) for(let c = 0; c < 12; c++){ const q = hj(j0 + 20 + c); if(q < .35) E(.04 + c * .08, h0 - .03 - .03 - q * .12, .04 + c * .08 + .012, h0 - .03, F(ICE)); } if(lo) E(-.05, h0 + .01, 1.05, h0 + .03, F(SN.M)); };
    cp(.86, 1, true);
    // upper floor: four rooms of shoji (some dark), the balcony railing with snow on its top rail
    const f0 = 1.0, f1 = top1 - .04; E(0, f0, 1, top1, F(WD.M));
    for(let i = 0; i < 4; i++){ const s0 = .02 + i * .24, s1 = s0 + .22, lv = hj(40 + i) < .2 ? 0 : hj(50 + i) < .3 ? 1 : 2, base = lv === 0 ? '#1a1218' : lv === 1 ? SJ[1] : SJ[2];
      E(s0, f0 + .06, s1, f1, lv ? fc(base, wf) : F(base)); if(lv === 2) E(s0 + .02, f0 + .14, s1 - .02, f1 - .06, fc(SJ[3], wf));
      if(fog < .35){ const gc = lv ? fc(SJ[0], wf) : F('#100a0e'); for(let g = f0 + .14; g < f1; g += .1) E(s0, g, s1, g + Math.max(.01, PX / K.pu(0)), gc); for(let c = 1; c < 4; c++) bar(s0 + (s1 - s0) * c / 4, f0 + .06, f1, gc); }
      bar(s0 - .015, f0, top1, F(WD.D)); if(lv === 2 && fog < .5) gl(K.px(Lr((s0 + s1) / 2), 0, 0), K.py(0, f1 - .15, 0), K.pu(0) * .35, '#ffc070', .14 * a); }
    { const ry = f0 + .2; E(-.02, ry + .05, 1.02, ry + .075, F(SN.L)); E(-.02, ry + .035, 1.02, ry + .05, F(WD.L)); E(-.02, ry - .1, 1.02, ry - .08, F(WD.M)); if(fog < .4) for(let c = 0; c < 15; c++) bar(.02 + c * .066, ry - .08, ry + .035, F(WD.D)); }
    // the second eave; on the tall inns a third floor of plaster panels in a timber frame with two small lit windows
    cp(top1, 2, false);
    if(tall){ const h0 = top1 + .14; E(.02, h0, .98, rb, F(PLS.M)); for(let c = 0; c <= 4; c++) bar(.02 + c * .24, h0, rb, F(WD.D)); E(.02, h0 + .2, .98, h0 + .215, F(WD.D));
      for(const s0 of [.14, .62]) if(hj(60 + s0 * 10) < .8){ E(s0, h0 + .26, s0 + .14, h0 + .4, fc(SJ[2], wf)); if(fog < .35){ bar(s0 + .07, h0 + .26, h0 + .4, fc(SJ[0], wf)); E(s0, h0 + .33, s0 + .14, h0 + .34, fc(SJ[0], wf)); } } }
    // the roof: a hip buried in snow, greyer at the eave and palest along the ridge (Hasui), its snow lip lumpy and overhanging
    { const P = (s0, h) => [K.px(Lr(s0), 0, 0), K.py(0, h, 0)], q = [[-.07, 1.07, rb], [.08, .92, rb + .2], [.2, .8, rb + .4], [.3, .7, rb + .58], [.42, .58, rt]], cols = [SN.M, SN.L, SN.L, SN.H];
      for(let b = 0; b < 4; b++){ const [a0, a1, h0] = q[b], [c0, c1, h1] = q[b + 1], p0 = P(a0, h0), p1 = P(a1, h0), p2 = P(c1, h1), p3 = P(c0, h1); poly(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], F(cols[b])); }
      E(.42, rt - .02, .58, rt + .03, F(SN.H)); E(-.08, rb - .02, 1.08, rb + .04, F(SN.L)); for(let c = 0; c < 10; c++) if(hj(70 + c) > .5) E(-.08 + c * .116, rb + .04, -.08 + (c + .7) * .116, rb + .065, F(SN.H)); E(-.06, rb - .05, 1.06, rb - .02, F(SN.D)); }
    // a lookout on some roofs (Ginzan's little towers)
    if(v % 4 === 2){ const h0 = rt - .25; E(.4, h0, .62, h0 + .36, F(WD.M)); E(.6, h0, .62, h0 + .36, F(WD.L)); E(.44, h0 + .08, .58, h0 + .26, fc(SJ[2], wf)); E(.36, h0 + .36, .66, h0 + .44, F(SN.L)); E(.36, h0 + .44, .66, h0 + .46, F(SN.H)); }
    return true; }
  function drawRyo(sp, x, y, uw, fog, now){ if(uw * 1.9 / (F1 - F0) > PX * 1.3 && sp.b0 !== undefined && ryoGeo(sp, x, y, uw, fog, now)) return; const left = sp.x < 0, base = ryokan(sp.v), spr = left ? base : flip(base, 'ryo' + sp.v), k = uw * 1.9 / (F1 - F0), a = 1 - fog * .85;
    // anchor: the front face's road-side edge sits at the inn's x minus half its face; the canvas is offset so the face centre lands on x
    const fcx = left ? (F0 + F1) / 2 : RW - (F0 + F1) / 2, bx = x + (RW / 2 - fcx) * k, sx0 = left ? 0 : RW - F1 - 2, sw = F1 + 2;
    // only the gable end is drawn: the street side of the inn is the facade wall
    cx.globalAlpha = a; blitSrc(spr, sx0, 0, sw, RH, Math.round(bx - RW * k / 2 + sx0 * k), Math.round(y - RH * k), k); cx.globalAlpha = 1;
    if(fog < .55){ const wa = (1 - fog * 1.8);
      // a haze veil so far inns sit back in the snow air
      for(const [lx, ly, rr2, col, al] of RLIGHT[sp.v] || []){ const px0 = left ? lx : RW - lx; gl(bx + (px0 - RW / 2) * k, y - (RH - ly) * k, rr2 * k, col, al * wa); } }
    if(fog > .12){ cx.globalAlpha = Math.min(.75, (fog - .12) * 1.3); blitSrc(fogSil(spr, left ? 'ryo' + sp.v : 'ryo' + sp.v + 'f'), sx0, 0, sw, RH, Math.round(bx - RW * k / 2 + sx0 * k), Math.round(y - RH * k), k); cx.globalAlpha = 1; } }
  // the street face of an inn, one segment-long slice of a continuous wall (Ginzan: every inn faces the street):
  // stone footing, a lit lattice ground floor or the noren doorway, an eave buried in snow with icicles, a balcony in front of lit shoji,
  // a second snow eave, a plaster third floor on the tall ones, and the snow roof leaning back from the street, palest at its ridge
  function drawFac(sp, x, y, uw, fog, now){ const t = farEnd(sp, fog); if(!t) return; const p = t.p2.screen; if(!p.w) return; const side = sp.side, x2 = p.x + sp.x * p.w, y2 = p.y, u2 = p.w;
    const tall = sp.v % 2 === 1, k = sp.s.index, rel = k - sp.b0, top1 = tall ? 1.55 : 1.72, rb = tall ? 2.28 : top1 + .12, rt = rb + .7, j = H0(k * 1.37) * .05, j2 = H0(k * 2.9) * .05;
    const Q = (h0, h1, col, l0, l1) => { l0 = l0 || 0; l1 = l1 || 0; gpoly(x + side * uw * l0, y - uw * h0, x2 + side * u2 * l0, y2 - u2 * h0, x2 + side * u2 * l1, y2 - u2 * h1, x + side * uw * l1, y - uw * h1, col); };
    const sw = Math.abs(x2 - x), V = (tt, h0, h1, wd, col) => { const xx = lerp(x, x2, tt), yy = lerp(y, y2, tt), ww = lerp(uw, u2, tt), th = Math.max(PX, snap(Math.min(ww * wd, sw * wd * 2.5))); if(xx < -th || xx > W + th) return; const ya = snap(Math.max(-PX, yy - ww * h1)), yb = snap(Math.min(H + PX, yy - ww * h0)); if(yb <= ya) return; cx.fillStyle = col; cx.fillRect(snap(xx - th / 2), ya, th, yb - ya); };
    const room = H0(sp.n * 7.3 + (rel >> 1) * 3.1), lit1 = room > .22, lit2 = H0(sp.n * 3.1 + (rel >> 1) * 5.7) > .4, door = rel === 1, wf = fog * .55;
    const WARM2 = fc(SJ[2], wf), DARKW = fc('#1a1218', fog), WALLC = fc(WD.M, fog), GRID = fc(SJ[0], wf);
    if(fog > .3){ Q(0, top1, WALLC); Q(.16, .74, lit1 ? WARM2 : DARKW); Q(1.12, top1 - .08, lit2 ? WARM2 : DARKW); Q(.86, 1.04, fc(SN.L, fog)); Q(top1, rb + .1, fc(SN.L, fog)); Q(rb, rt, fc(SN.L, fog), 0, .8); return; }
    // ground floor
    Q(0, .06, fc('#161828', fog)); Q(.06, .86, WALLC);
    if(door){ Q(.1, .84, fc(SJ[3], wf)); Q(.46, .84, fc(NOREN, fog)); if(uw > 24){ V(.34, .46, .84, .015, fc('#0c1230', fog)); V(.67, .46, .84, .015, fc('#0c1230', fog)); Q(.46, .5, fc(NOREN2, fog)); } }
    else { Q(.14, .78, lit1 ? WARM2 : DARKW); if(lit1) Q(.3, .64, fc(SJ[3], wf)); if(sw > PX * 6) for(let b = 1; b < 5; b++) V(b / 5, .14, .78, .025, fc(WD.D, fog)); }
    if(sw > PX * 2) V(0, .06, .86, .05, fc(WD.D, fog));
    // eave with its snow cap and icicles
    Q(.84, .89, fc(WD.O, fog)); Q(.89, 1.0 + j, fc(SN.L, fog)); Q(1.0 + j, 1.05 + j, fc(SN.H, fog));
    if(uw > 30) for(let b = 0; b < 4; b++){ const hh = H0(k * 4.1 + b); if(hh > .45) V((b + .5) / 4, .89 - .03 - hh * .07, .89, .012, fc(ICE, fog)); }
    // upper floor: lit shoji behind a balcony railing
    Q(1.05 + j, top1, WALLC); Q(1.1 + j, top1 - .06, lit2 ? WARM2 : DARKW);
    if(lit2 && fog < .35){ Q(1.25, top1 - .2, fc(SJ[3], wf)); for(const g of [1.3, 1.42, 1.56]) if(g < top1 - .08) Q(g, g + .015, GRID); if(sw > PX * 5){ V(.33, 1.1, top1 - .06, .012, GRID); V(.67, 1.1, top1 - .06, .012, GRID); } }
    if(sw > PX * 2) V(0, 1.05, top1, .04, fc(WD.D, fog));
    Q(1.05 + j, 1.09 + j, fc(WD.M, fog)); Q(1.26, 1.29, fc(WD.L, fog)); Q(1.29, 1.31, fc(SN.L, fog)); if(sw > PX * 6) for(let b = 0; b < 4; b++) V((b + .5) / 4, 1.09, 1.26, .012, fc(WD.D, fog));
    // second eave
    Q(top1 - .03, top1, fc(WD.O, fog)); Q(top1, top1 + .1 + j2, fc(SN.L, fog)); Q(top1 + .1 + j2, top1 + .14 + j2, fc(SN.H, fog));
    if(tall){ Q(top1 + .14 + j2, rb, fc(PLS.M, fog)); Q(1.93, 1.95, fc(WD.D, fog)); if(H0(k * 6.1) > .45){ const lt = fc(SJ[2], wf); V(.5, 1.98, 2.12, .3, lt); } Q(rb - .02, rb + .1 + j, fc(SN.L, fog)); }
    // roof: leans back from the street; greyer at the eave, palest along the ridge (Hasui)
    const r0 = tall ? rb + .1 + j : top1 + .14 + j2; Q(r0, r0 + .12, fc(SN.M, fog), 0, .12); Q(r0 + .12, rt, fc(SN.L, fog), .12, .8); Q(rt - .04, rt + .01, fc(SN.H, fog), .76, .82); }
  // a flat haze-coloured silhouette of a sprite, laid over it with alpha to sink it into the distance (opaque underneath, so never see-through)
  const SIL = new Map(); let silLow = '';
  function fogSil(spr, name){ return fogTint(spr, 'sn:sil:' + name, 1, 1, HAZE, 1); }   // the engine's bounded fog-tint cache: built in warm(), re-tinted in place
  function drawLamp(sp, x, y, uw, fog, now){ const spr = gasLamp(), k = uw * .95 / LH, base = y - (sp.lift || 0) * uw, a = 1 - fog * .8, hx0 = x, hy = base - (LH - 8) * k;
    cx.globalAlpha = a; blit(spr, x, base, k); cx.globalAlpha = 1;
    if(fog < .85){ // a cone of lit snow air under the lamp, in two hard steps
      cx.globalCompositeOperation = 'lighter'; for(const [f, al] of [[1, .035], [.55, .05]]){ cx.fillStyle = `rgba(255,200,130,${al * a})`; const bw = uw * .38 * f; cx.beginPath(); cx.moveTo(hx0 - 3 * k, hy); cx.lineTo(hx0 + 3 * k, hy); cx.lineTo(hx0 + bw, base); cx.lineTo(hx0 - bw, base); cx.closePath(); cx.fill(); } cx.globalCompositeOperation = 'source-over';
      pool(x, base, uw * .55, uw * .1, '#ffb070', .5 * a); }
    gl(hx0, hy, uw * .28 + PX, '#ffd8a0', .55 * a); gl(hx0, hy, uw * .07 + PX, '#fff4dc', .5 * a); }
  function drawToro(sp, x, y, uw, fog, now){ if(fog > .7) return; const spr = yukitoro(), k = uw * .2 / 11, base = y - (sp.lift || 0) * uw, a = 1 - fog * 1.1, fl = reduce ? 1 : .88 + .12 * Math.sin(now / 170 + sp.k * 1.7) * Math.sin(now / 53 + sp.k);
    cx.globalAlpha = a; blit(spr, x, base, k); cx.globalAlpha = 1; gl(x, base - 4 * k, uw * .09 + PX, WARM, .55 * a * fl); }
  function drawTree(sp, x, y, uw, fog, now){ const spr = sugi(sp.v), hgt = 1.75 * uw * sp.sz, k = hgt / spr.height, base = y - (sp.lift || 0) * uw;
    blit(spr, x, base, k); if(fog > .1){ cx.globalAlpha = Math.min(.85, (fog - .1) * 1.2); blit(fogSil(spr, 'sugi' + sp.v), x, base, k); cx.globalAlpha = 1; } }
  function drawTsuri(sp, x, y, uw, fog, now){ const spr = tsuri(), k = uw * 1.5 / 40; blit(spr, x, y, k); if(fog > .1){ cx.globalAlpha = Math.min(.85, (fog - .1) * 1.2); blit(fogSil(spr, 'tsuri'), x, y, k); cx.globalAlpha = 1; } }
  function drawGate(sp, x, y, uw, fog, now){ const spr = gate(), k = uw * 2.6 / (GPOST[1] - GPOST[0]), a = 1 - fog * .7, x0 = x - GW * k / 2, y0 = y - GH * k;
    blit(spr, x, y, k); if(fog > .1){ cx.globalAlpha = Math.min(.8, (fog - .1) * 1.2); blit(fogSil(spr, 'gate'), x, y, k); cx.globalAlpha = 1; }
    // the sign: 雪見温泉 in gold, drawn live in the pixel font when it is big enough to read
    if(k * 10 >= 9){ cx.fillStyle = fog > .3 ? mixc(GOLD, '#1a0e10', fog * .6) : '#ffd070'; cx.font = `${Math.round(k * 10)}px DotGothic16, monospace`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('雪見温泉', x, y0 + 35 * k); cx.textAlign = 'left'; cx.textBaseline = 'alphabetic'; }
    else { cx.fillStyle = mixc(GOLD, '#1a0e10', .4); cx.fillRect(x - 20 * k, y0 + 33 * k, 40 * k, Math.max(PX, 3 * k)); }
    for(const [lx, ly] of GLAMP) gl(x0 + lx * k, y0 + ly * k, uw * .09 + PX, RED.L, .5 * a);
    pool(x, y, uw * 1.2, uw * .18, '#ff8a50', .35 * a); }
  // steam: dithered puffs that rise, widen and thin out; each column keyed to its sprite, so it rides with the world
  // steam: dithered puffs that rise, widen and thin out on a fixed cycle; each column keyed to its sprite, so it rides with the world
  function drawSteam(sp, x, y, uw, fog, now){ if(fog > .85) return; const n = sp.n || 6, base = y - (sp.lift || 0) * uw, hgt = uw * (sp.rise || 1.5), w = sp.w || .6, a0 = (1 - fog * 1.1) * .62, per = 5200, k = uw * .045 * (.6 + w * .5);
    for(let j = 0; j < n; j++){ const h = H0(sp.k * 7.7 + j * 3.1), life = reduce ? (j + .5) / n : ((now / per + h * .3 + j / n) % 1), drift = Math.sin(life * 2.4 + h * 6) * uw * .1 * life + life * life * uw * .35 * w,
      px0 = x + (h - .5) * uw * w * .5 + drift, py = base - life * hgt, ri = Math.min(PUFF_R.length - 1, Math.floor(life * life * PUFF_R.length + h)), r = PUFF_R[ri], al = a0 * (life < .1 ? life / .1 : 1) * (1 - life) * (1 - life * .3);
      if(al < .02) continue; const R = r * k, cxp = snap(px0), cyp = snap(py);
      // screen-space ordered dither (one canvas pixel per cell, like the rest of the haze), in three stepped densities, moonlit on top
      cx.globalAlpha = Math.min(1, al * 1.6);
      for(const [f, dn, col, dy] of [[1, .25, STM[0], 0], [.72, .5, STM[0], 0], [.5, .5, STM[1], -.35]]){ if(R * f < PX) continue; cx.fillStyle = pat(col, life > .6 && dn > .25 ? .25 : dn); cx.beginPath(); cx.ellipse(cxp, cyp + R * dy * f, R * f, R * f * .8, 0, 0, 6.283); cx.fill(); } }
    cx.globalAlpha = 1; }
  function drawYabane(sp, x, y, uw, fog, now){ if(fog > .85) return; const left = sp.x < 0, base = yabane(), spr = left ? base : flip(base, 'yabane'), k = uw * 1.45 / YH, a = 1 - fog;
    cx.globalAlpha = a; blit(spr, x, y, k); cx.globalAlpha = 1;
    const near = clamp(1.25 - fog * 3, 0, 1), rx = x + (left ? 1 : -1) * (12 - YW / 2) * k, ry = y - (YH - 6) * k; if(near > .3 && uw > 14) gl(rx, ry, uw * .1, '#ffc060', .45 * near); }
  const DRAW = { fac:drawFac, yabane:drawYabane, bank:drawBank, rail:drawRail, ryo:drawRyo, lamp:drawLamp, toro:drawToro, tree:drawTree, tsuri:drawTsuri, gate:drawGate, steam:drawSteam };

  // reflection column: N dashes at fixed fractions of its length, widths from a hash with a slow eased phase: stable, no flicker (harbour's rule)
  function column(x, y0, len, w, seed, now, al0, colHi, colLo){ if(len < PX * 3 || al0 <= .01) return; const n = 10, ph = reduce ? 0 : now / 1300, p0 = Math.floor(ph), f = ph - p0;
    cx.globalCompositeOperation = 'lighter';
    for(let i = 0; i < n; i++){ const v = i / n, yy = Math.round((y0 + v * len) / PX) * PX; if(yy >= H) break;
      const h = lerp(H0(seed * 7.1 + i * 3.3 + p0 * .61), H0(seed * 7.1 + i * 3.3 + (p0 + 1) * .61), f), ww = Math.max(PX, w * (1 - v * .55) * (.6 + h * .6)), ox = (H0(seed * 3.7 + i * 1.9) - .5) * w * .35;
      cx.fillStyle = v < .2 ? colHi : colLo; cx.globalAlpha = al0 * (1 - v * .85); cx.fillRect(Math.round((x + ox - ww / 2) / PX) * PX, yy, Math.max(PX, Math.round(ww / PX) * PX), PX); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- snowfall: three depths of flakes in a world-anchored volume
  // each flake has a fixed lateral spot and a depth that cycles with the distance ridden, so the field streams past at the bike's speed;
  // it falls with time and sways a little. Nothing is random per frame.
  const LAYERS = [ { n:170, z0:1800, z1:7000, col:'#7884b4', a:.8, fall:300 }, { n:90, z0:650, z1:1800, col:'#b4c0e2', a:.85, fall:380 }, { n:22, z0:200, z1:650, col:'#e8eef8', a:.9, fall:460 } ];
  function snowfall(al, now){ const hz = HZ, cam = playerX * ROADW, sv = speed / MAXS, bs = Math.min(W * .2, H * .27), beamTop = H * .58;
    const fall = ENV.snow.fall == null ? 1 : clamp(ENV.snow.fall, 0, 2.5); if(fall <= 0) return; al *= Math.min(1, fall);   // a set piece may thicken (>1) or stop (0) the snowfall
    for(let li = 0; li < 3; li++){ const Ly = LAYERS[li], span = Ly.z1 - Ly.z0, sz = (li + 1) * PX, nf = fall > 1 ? Math.round(Ly.n * fall) : Ly.n;
      for(let i = 0; i < nf; i++){ const s0 = li * 1000 + i, z = Ly.z1 - (((H0(s0 * 1.31) * span + position) % span) + span) % span, sc = DEPTH / z;
        const x3 = (H0(s0 * 2.17) - .5) * ROADW * (li === 2 ? 2.4 : 5) - cam + (reduce ? 0 : Math.sin(now / 1500 + i) * 90), yr = CAMH * 2.6, y3 = CAMH * 1.6 - ((H0(s0 * 3.7) * yr + (reduce ? now * .1 : now) * Ly.fall / 1000) % yr);
        const sx = W / 2 + sc * x3 * W / 2, sy = H / 2 - PITCH - sc * y3 * H / 2; if(sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) continue;
        // in the headlight's cone, flakes catch warm light
        const inBeam = sy > beamTop && Math.abs(sx - W / 2) < (sy - beamTop) * 1.1 + bs * .1;
        cx.fillStyle = inBeam ? '#fff0d4' : Ly.col; cx.globalAlpha = al * Ly.a * (li === 0 ? Math.min(1, (z - Ly.z0) / 400 + .4) : 1) * (li === 0 && sy < hz ? .8 : 1);
        const X = snap(sx), Y = snap(sy);
        // motion: at speed, nearer flakes smear outward from the vanishing point by the distance they move this frame
        const dz = sv * MAXS / 60, len = li < 2 || reduce ? 0 : Math.min(2, Math.round(Math.hypot(sx - W / 2, sy - hz) * dz / z / PX));
        if(len < 1){ cx.fillRect(X, Y, sz, sz); continue; }
        const dx = (sx - W / 2), dy = (sy - hz), dl = Math.hypot(dx, dy) || 1; for(let j = 0; j <= len; j++) cx.fillRect(snap(sx - dx / dl * j * PX), snap(sy - dy / dl * j * PX), j === 0 ? sz : Math.max(PX, sz - PX), j === 0 ? sz : Math.max(PX, sz - PX)); } }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- road surface: snow fields, ploughed shoulders, slush, warm pools, reflections
  const GROUND = ['#56628f', '#525e8a'], SHOULDER = ['#2c3354', '#2a3150'], SLUSH = '#6a76a4', RIVER = ['#0a0e20', '#0c1124'];
  // both snow fields of a segment in one fill: left of the left shoulder and right of the right one; an inner edge that leaves the screen
  // is cut where it crosses the screen edge, so no vertex lies thousands of pixels away
  function fields(la, lb, ra, rb, ay, by, col){ cx.fillStyle = col; cx.beginPath(); const L0 = -2, R0 = W + 2;
    if(la > L0 || lb > L0){ if(la >= L0 && lb >= L0){ cx.moveTo(L0, ay); cx.lineTo(Math.min(la, R0), ay); cx.lineTo(Math.min(lb, R0), by); cx.lineTo(L0, by); }
      else { const t = (L0 - la) / (lb - la), yc = ay + (by - ay) * t; if(la < L0){ cx.moveTo(L0, yc); cx.lineTo(Math.min(lb, R0), by); cx.lineTo(L0, by); } else { cx.moveTo(L0, ay); cx.lineTo(Math.min(la, R0), ay); cx.lineTo(L0, yc); } } cx.closePath(); }
    if(ra < R0 || rb < R0){ if(ra <= R0 && rb <= R0){ cx.moveTo(R0, ay); cx.lineTo(Math.max(ra, L0), ay); cx.lineTo(Math.max(rb, L0), by); cx.lineTo(R0, by); }
      else { const t = (R0 - ra) / (rb - ra), yc = ay + (by - ay) * t; if(ra > R0){ cx.moveTo(R0, yc); cx.lineTo(Math.max(rb, L0), by); cx.lineTo(R0, by); } else { cx.moveTo(R0, ay); cx.lineTo(Math.max(ra, L0), ay); cx.lineTo(R0, yc); } } cx.closePath(); }
    cx.fill(); }
  const RC = new Map(); const roadCol = (st, lit, f, fog) => { const k = st + ':' + Math.round(lit * 20) + ':' + Math.round(fog * 60) + fogLow; let c = RC.get(k); if(!c){ if(RC.size > 400) RC.clear(); c = f(mixc(ENV.snow.road[st], ENV.snow.lampCol, Math.round(lit * 20) / 20 * .5)); RC.set(k, c); } return c; };
  ENV.snow = {
    ownsRain:true,
    barrier:BANKX,
    road:['#14161f', '#171922'],
    lampCol:'#6a4434',
    warm(){ for(let v = 0; v < 4; v++){ const c = ryokan(v); flip(c, 'ryo' + v); } gasLamp(); yukitoro(); gate(); tsuri(); flip(yabane(), 'yabane'); for(let v = 0; v < 3; v++) sugi(v); for(let v = 0; v < 4; v++){ fogTintWarm(ryokan(v), 'sn:sil:ryo' + v, 1, 1, HAZE); fogTintWarm(flip(ryokan(v), 'ryo' + v), 'sn:sil:ryo' + v + 'f', 1, 1, HAZE); } for(let v = 0; v < 3; v++) fogTintWarm(sugi(v), 'sn:sil:sugi' + v, 1, 1, HAZE); fogTintWarm(tsuri(), 'sn:sil:tsuri', 1, 1, HAZE); fogTintWarm(gate(), 'sn:sil:gate', 1, 1, HAZE);
      for(const r of PUFF_R) for(const d of [.5, .75]) puff(r, d);
      if(W > 0) buildStrips();
      // touch every sprite once so their texture uploads happen now, not at the first border
      const up = c => cx.drawImage(c, 0, 0, PX, PX); cx.save(); for(const k in SPR) if(k.startsWith('sn_')) up(SPR[k]); if(STRIPS) for(const s of STRIPS){ up(s.night); up(s.dawn); }
      for(const c of [SN.M, SN.L, '#8a96c6', '#6a76a6', ...STM]) for(const dn of [.125, .25, .5, .75]){ cx.fillStyle = pat(c, dn); cx.fillRect(0, 0, PX * 4, PX * 4); }
      cx.restore(); cx.clearRect(0, 0, W, H); },
    place,
    // the landmark jump keeps the roadside (setpiece/jump.js keepSides): the yabane stand at 1.1, inside the default keep line (none are
    // placed over the gap); the gap's snow floor stays inside the banks, so the street's own snow and the inns' feet carry on beside it
    jumpKeep:sp => sp.type === 'yabane' ? true : undefined,
    jumpFloor:1.3,
    lit:(i, s) => s.snLit || 0,
    draw(sp, x, y, uw, fog, now, sk){ setLow(sk.low); const f = DRAW[sp.type]; if(f) f(sp, x, y, uw, fog, now); },
    clear:null, fall:1,   // set-piece hooks (see place() and snowfall())
    drawTreeAt(x, y, uw, fog, v, sz, lift){ drawTree({ v:v % 3, sz, lift:lift || 0 }, x, y, uw, fog); },   // a snow-laden cedar, the road's own art and fog

    roadFX(s, a, b, fog, f, now){ const ay = a.y + 1.5, by = b.y - 1, ey = b.y; if(a.y - by < .5) return;
      const lit = Math.min(1, (s.snLit || 0) * 1.6), st = s.stripe, br = s.snBr, pv = segs[s.index - 1], y0 = a.y;
      // ploughed shoulder edges, ragged per segment (fixed to the world)
      const e1 = 1 - .03 - H0(s.index * 1.7) * .05, e2 = 1 - .03 - H0((s.index + 1) * 1.7) * .05;
      const so = 1.16;
      // the engine's grass fill overlaps the nearer road by a pixel row (a light seam even with darker grass): paint that row back in road colour
      { const r0 = Math.floor((a.y - .5) / PX) * PX, r1 = Math.ceil((a.y + 1.5) / PX) * PX, rw = a.w * (e1 + .03);
        cx.fillStyle = roadCol(pv ? pv.stripe : st, pv ? pv.lit || 0 : 0, f, fog); cx.fillRect(a.x - rw, r0, rw * 2, r1 - r0);
        if(pv && pv.stripe){ const l1 = a.w / 40; cx.fillStyle = f('#d8d0c0'); for(const lx of [-2 / 3, 2 / 3]) cx.fillRect(a.x + a.w * lx - l1, r0, l1 * 2, r1 - r0); } }
      // ground beyond the shoulders: snow fields, or the river under the bridge
      const gcol = br ? fc(RIVER[st], fog) : fcw(GROUND[st], lit, fog);
      if(br) fields(a.x - a.w * so, b.x - b.w * so, a.x + a.w * so, b.x + b.w * so, ay, by, gcol);   // the snow fields are the engine's own ground now; only the river is ours
      // shoulders: packed grey snow over the rumble, with the slush edge biting into the asphalt
      const shc = br ? fc('#2a1418', fog) : fcw(SHOULDER[st], lit, fog);
      for(const sd of [-1, 1]){ poly(a.x + sd * a.w * e1, ay, a.x + sd * a.w * so, ay, b.x + sd * b.w * so, by, b.x + sd * b.w * e2, by, shc);
        if(!br && fog < .5 && a.w > 20){ poly(a.x + sd * a.w * e1, ay, a.x + sd * a.w * (e1 + .025), ay, b.x + sd * b.w * (e2 + .025), by, b.x + sd * b.w * e2, by, fcw(SLUSH, lit, fog)); } }
      // the river: lantern light from the inns on the banks, broken into ripples; drifting mist rows
      if(br && fog < .9){ const m = s.index % PER; if(m % 2 === 0) for(let c = 0; c < 2; c++){ const sd = c ? 1 : -1, xx = a.x + sd * a.w * (1.6 + H0(s.index * 3 + c) * 3), ww = snap(a.w * (.1 + H0(s.index + c * 7) * .25));
          cx.fillStyle = fc(c ? '#3a2a30' : '#2a2c48', fog); cx.fillRect(snap(xx), snap(by), ww, PX); }
        if(m === BR0 || m === BR1 - 1){ const edge = m === BR0 ? ay : by; cx.fillStyle = fc('#1c1e30', fog); cx.fillRect(0, snap(edge) - PX, W, PX * 2); } }
      // snow sparkles: a few fixed glints on the fields, steady, only in the middle distance
      if(!br && fog > .12 && fog < .6 && s.index % 2 === 0){ cx.fillStyle = fc('#c8d4f4', fog); for(let c = 0; c < 2; c++){ const sd = c ? 1 : -1, xx = a.x + sd * a.w * (1.4 + H0(s.index * 5 + c) * 4); if(H0(s.index * 9 + c) > .5) cx.fillRect(snap(xx), snap(by), PX, PX); } }
      // warm pools under the lamps and the gate (stepped, additive)
      if(lit > .05 && fog < .9){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,150,70,${.09 * lit * (1 - fog)})`;
        for(const sd of [-1, 1]) poly(a.x + sd * a.w * .3, y0, a.x + sd * a.w * 1.3, y0, b.x + sd * b.w * 1.3, ey, b.x + sd * b.w * .3, ey, cx.fillStyle);
        if(lit > .4){ cx.fillStyle = `rgba(255,170,90,${.07 * (1 - fog)})`; for(const sd of [-1, 1]) poly(a.x + sd * a.w * .7, y0, a.x + sd * a.w * 1.12, y0, b.x + sd * b.w * 1.12, ey, b.x + sd * b.w * .7, ey, cx.fillStyle); }
        cx.globalCompositeOperation = 'source-over'; }
      // wet asphalt: each lamp mirrored as a column of broken dashes hanging toward the viewer; the gate's lanterns as red dashes
      const m = s.index % PER;
      if(lampSeg(m) && !s.snCl && fog < .92){ const al0 = .4 * (1 - fog); for(const sd of [-1, 1]) column(a.x + sd * a.w * .9, ay, a.w * .85, a.w * .09, s.index * 2 + (sd > 0 ? 1 : 0), now, al0, '#ffe2a8', '#ffa860'); }
      if(m === GATE && !s.snCl && fog < .92){ for(let c = 0; c < 5; c++) column(a.x + (c - 2) * a.w * .38, ay, a.w * .7, a.w * .06, s.index * 5 + c, now, .35 * (1 - fog), '#ff8a60', '#e0402a'); }
      // the headlight on the near road, in hard steps
      if(y0 > H * .6){ const lv = y0 > H * .8 ? .07 : y0 > H * .7 ? .05 : .028, wa = a.w * .42, wb = b.w * .42; cx.globalCompositeOperation = 'lighter'; poly(W / 2 - wa, y0, W / 2 + wa, y0, W / 2 + wb, ey, W / 2 - wb, ey, `rgba(255,236,200,${lv})`); cx.globalCompositeOperation = 'source-over'; } },
    backdrop(o){ const { hz, sk, now, t } = o; setLow(sk.low); buildStrips(); const dawn = clamp((t - .68) / .3, 0, 1);
      const mist = (y0, y1, col, seed) => { const h = y1 - y0, cw = PX * 6, tt = reduce ? 0 : now / 9000;
        for(const [kk, dens] of [[0, .25], [1, .5]]){ const p = new Path2D(); for(let x = -cw; x < W + cw; x += cw){ const top = snap(y0 + h * kk * .4 + (pvn((x + seed * 100 + skyOff * 200) * .012 + tt, 1e6, seed) - .5) * h * .6); if(top < y1) p.rect(x, top, cw, y1 - top); } cx.fillStyle = pat(col, dens); cx.fill(p); } };
      for(let li = 0; li < 3; li++){ const S = STRIPS[li], R = RIDGE[li], off = ((((skyPar(R.par)) / PX) % P0) + P0) % P0, hh = S.hs * PX, y0 = hz - hh + PX * (li === 2 ? 2 : 1);
        cx.drawImage(S.night, off, 0, W / PX, S.hs, 0, y0, W, hh);
        if(dawn > 0){ cx.globalAlpha = dawn; cx.drawImage(S.dawn, off, 0, W / PX, S.hs, 0, y0, W, hh); cx.globalAlpha = 1; }
        if(li === 1){ // the ropeway gondola, crawling up the cable, its window lit; red lights on the stations
          const per = 26000, u = reduce ? .4 : (now % per) / per, tt2 = u < .5 ? u * 2 : 2 - u * 2, gx = lerp(ROPE.x0, ROPE.x1, tt2), gy = lerp(ROPE.y0, ROPE.y1, tt2) + Math.sin(tt2 * Math.PI) * 4;
          for(const base of [gx - off, gx - off + P0]){ const sx = base * PX; if(sx < -10 || sx > W + 10) continue; cx.fillStyle = '#0c0e1c'; cx.fillRect(snap(sx - PX), snap(y0 + gy * PX), PX * 3, PX * 2); cx.fillStyle = '#ffd890'; cx.fillRect(snap(sx), snap(y0 + gy * PX), PX, PX); }
          const on = reduce || Math.sin(now / 520) > -.2; if(on) for(const [rx, ry] of [[ROPE.x0, ROPE.y0 - 4], [ROPE.x1, ROPE.y1 - 4]]) for(const base of [rx - off, rx - off + P0]){ const sx = base * PX; if(sx > -6 && sx < W + 6){ cx.fillStyle = '#ff4a3a'; cx.fillRect(snap(sx), snap(y0 + ry * PX), PX, PX); } } }
        // snow haze pooled between the ranges (Hasui: distance dissolves into pale blue-grey)
        if(li < 2) mist(snap(hz - H * (li === 0 ? .07 : .035)), snap(hz + PX * 2), mixc(mixc(R.col[1], HAZE, .5), '#ffb090', dawn * .3), li + 1); }
      // the ground below the horizon: the far snow field in haze
      cx.fillStyle = mixc(LANDS[7] && LANDS[7].key === 'snow' ? LANDS[7].grass[0] : GROUND[0], sk.low, .85); cx.fillRect(0, hz + PX * 2, W, H - hz);
      // a faint veil of falling snow along the horizon, so the distance sits back
      cx.fillStyle = pat(mixc(HAZE, '#9aa6d0', .3), .125); cx.fillRect(0, snap(hz - H * .03), W, snap(H * .03) + PX * 2);
      return true; },
    overlay(al, now, sk){
      // headlight beam through the snow air: two faint stepped wedges
      const bs = Math.min(W * .2, H * .27), by = snap(H - bs * .62), top = snap(H * .58); cx.globalCompositeOperation = 'lighter';
      for(const [w0, w1, a] of [[.05, .22, .03], [.03, .12, .04]]){ cx.fillStyle = `rgba(255,232,200,${a * al})`; cx.beginPath(); cx.moveTo(snap(W / 2 - bs * w0), by); cx.lineTo(snap(W / 2 - W * w1), top); cx.lineTo(snap(W / 2 + W * w1), top); cx.lineTo(snap(W / 2 + bs * w0), by); cx.closePath(); cx.fill(); }
      cx.globalCompositeOperation = 'source-over';
      snowfall(al, now); }
  };
})();
// its shoulders cover the engine's red and white rumble blocks: the engine does not draw its far kerb rows here (laneMark)
ENV.snow.kerbs = false;
