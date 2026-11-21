/* Sundown environment: Bay Bridge. See env/README.md for the hooks.
   A white suspension bridge over a night bay in rain; a city across the water mirrored in rippling dashes.
   References studied for rules, not copied:
   - Streets of Rage 2 (Sega 1992) night pier and bridge stages: night is blue, not black; steel in 3-4 tone blue ramps with one lit edge;
     lamps reflect on wet ground as long broken vertical streaks; small lights are crisp single pixels with a stepped halo.
   - Kentucky Route Zero (Cardboard Computer, 2013): rain as sparse, thin, short diagonal ticks at low contrast; flat layered silhouettes;
     one warm interior against a large cool field.
   - Hyper Light Drifter (Heart Machine, 2016): few flat colour masses, haze made from dither, light as hard-edged shapes rather than blur.
   - OutRun (Sega, 1986): dither for shading, big readable roadside sprites that scale with distance, red/white tail lights as bold bars.
   Palette: cool navy base, white-painted steel lit from the moon side, sparse warm bulbs, red aviation lights. */
"use strict";
(() => {
  const SPAN = 120, CABX = 1.42, RAILX = 1.06, DECK = 1.66, LAMPX = 1.12;
  const TW = 96, TH = 184, TK = 3.4 / TW;         // tower sprite: 96 art px span 3.4 half-roads
  const TOPH = (TH - 16) * TK;                     // cable height at the tower saddle, in half-roads
  const cab = i => { const p = (i % SPAN) / SPAN, q = 2 * p - 1; return .55 + (TOPH - .55) * q * q; };
  const snap = v => Math.round(v / PX) * PX;
  const P = 768, SH = 84, RH = 60;                 // skyline period and heights (art px)
  const pal = {
    steel:['#0c1328', '#25355a', '#4c6492', '#8ea6cc', '#d4e0f2'],
    deck:['#151a2c', '#191f33'], curb:'#56608a', lip:'#2c3656',
    warm:'#ffb45a', bulb:'#ffe6b0', red:'#ff2a3a', cool:'#d8ecff',
    rain:['#4a5c94', '#7e94cc', '#b4c6ee'], mist:'#6a7aae'
  };
  const R = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // ---------------------------------------------------------------- sprites
  // tower: a white portal tower; legs lit on the moon (left) side, stepped crown, two portal beams with lit windows
  const tower = () => procSprite('bayTower', TW, TH, (x, y) => {
    const [O, D, M, L, Hh] = pal.steel, cxl = x - TW / 2, ax = Math.abs(cxl), legC = 40, taper = 4.5 - 1.2 * (1 - y / TH), lx = ax - legC;
    // legs
    if(y >= 10 && Math.abs(lx) <= taper){ const sx = cxl < 0 ? cxl + legC : cxl - legC;   // -taper..taper across the leg, screen space
      if(Math.abs(lx) > taper - 1) return O;
      if(y % 16 === 0) return D;   // panel seams
      return sx < -taper + 2.5 ? L : sx > taper - 2.5 ? D : (y % 16 === 1 && sx < 0 ? Hh : M); }
    // crowns: stepped caps on the legs
    if(y < 10 && Math.abs(lx) <= (y < 3 ? 1 : y < 6 ? 2.5 : 3.5)){ const sx = cxl < 0 ? cxl + legC : cxl - legC; return Math.abs(lx) > (y < 3 ? .5 : y < 6 ? 2 : 3) ? O : sx < 0 ? L : M; }
    // top portal beam with a lit window band, and the lower portal beam
    const beam = (y0, y1, win) => { if(y < y0 || y > y1 || ax > legC) return null; if(y === y0) return Hh; if(y === y0 + 1) return L; if(y >= y1 - 1) return O;
      if(win && y >= y0 + 3 && y <= y0 + 4 && ax < legC - 6 && x % 4 < 2) return y === y0 + 3 ? '#ffe2a8' : '#c8803c';
      return y > y1 - 3 ? D : M; };
    const tb = beam(20, 30, true) || beam(56, 61, false) || beam(110, 116, true); if(tb) return tb;
    // diagonal X bracing between the top beams
    if(y > 30 && y < 56 && ax < legC - 4){ const t = (y - 30) / 26, d1 = Math.abs(cxl - lerp(-legC + 4, legC - 4, t)), d2 = Math.abs(cxl - lerp(legC - 4, -legC + 4, t)); if(d1 < 1.2 || d2 < 1.2) return d1 < .5 || d2 < .5 ? L : D; }
    return null; });

  // the tower drawn at screen resolution (2026-11-20, buildings3d): the portal stands in a plane across the road, so the card was the right
  // shape, but as you ride between its legs each art pixel grew to many screen pixels. Past ~1.3 screen pixels per art pixel the same design
  // is drawn as geometry: tapered legs with a moonlit strip on the left and a shadow strip on the right, panel seams and outlines one screen
  // pixel thin, stepped crowns, the portal beams with their lit window band, the X bracing; the sprite stays for everything farther away
  function towerGeo(x, y, k){ const [O, D, M, L, Hh] = pal.steel, X = ax => x + (ax - TW / 2) * k, Y = ay => y - (TH - ay) * k, t1 = Math.max(PX, snap(k * .6));
    const R = (ax0, ay0, ax1, ay1, col) => { const a = snap(X(ax0)), b = snap(X(ax1)), c = snap(Y(ay0)), d = snap(Y(ay1)); if(b > a && d > c && b > 0 && a < W){ cx.fillStyle = col; cx.fillRect(a, Math.max(-PX, c), b - a, Math.min(H + PX, d) - Math.max(-PX, c)); } };
    const tp = ay => 4.5 - 1.2 * (1 - ay / TH);
    for(const sd of [-1, 1]){ const c = TW / 2 + sd * 40, P = (f, ay) => X(c + f * tp(ay)), y0 = Math.max(10, TH - y / k - 2), Y0 = Y(10), Y1 = Y(TH);
      poly(P(-1, 10), Y0, P(1, 10), Y0, P(1, TH), Y1, P(-1, TH), Y1, O);
      const ins = PX / k; poly(P(-1, 10) + PX, Y0, P(1, 10) - PX, Y0, P(1, TH) - PX, Y1, P(-1, TH) + PX, Y1, M);
      poly(P(-1, 10) + PX, Y0, X(c - tp(10) + 2.5), Y0, X(c - tp(TH) + 2.5), Y1, P(-1, TH) + PX, Y1, L);
      poly(X(c + tp(10) - 2.5), Y0, P(1, 10) - PX, Y0, P(1, TH) - PX, Y1, X(c + tp(TH) - 2.5), Y1, D);
      for(let ay = 16; ay < TH; ay += 16){ cx.fillStyle = D; const yy = snap(Y(ay)); if(yy < -PX || yy > H) continue; cx.fillRect(snap(P(-1, ay) + PX), yy, snap(P(1, ay) - P(-1, ay) - PX * 2), PX); cx.fillStyle = Hh; cx.fillRect(snap(P(-1, ay) + PX), yy + PX, snap((P(1, ay) - P(-1, ay)) * .4), PX); }
      for(const [y0c, y1c, hw] of [[0, 3, 1], [3, 6, 2.5], [6, 10, 3.5]]){ R(c - hw, y0c, c + hw, y1c, O); R(c - hw + ins, y0c + ins, c, y1c, L); R(c, y0c + ins, c + hw - ins, y1c, M); } }
    const beam = (y0, y1, win) => { R(TW / 2 - 40, y0, TW / 2 + 40, y1 + 1, M); R(TW / 2 - 40, y1 - 2, TW / 2 + 40, y1 - 1, D); R(TW / 2 - 40, y1 - 1, TW / 2 + 40, y1 + 1, O);
      cx.fillStyle = Hh; cx.fillRect(snap(X(TW / 2 - 40)), snap(Y(y0)), snap(80 * k), PX); cx.fillStyle = L; cx.fillRect(snap(X(TW / 2 - 40)), snap(Y(y0)) + PX, snap(80 * k), t1);
      if(win) for(let ax = TW / 2 - 34; ax < TW / 2 + 34; ax += 4){ R(ax, y0 + 3, ax + 2, y0 + 4, '#ffe2a8'); R(ax, y0 + 4, ax + 2, y0 + 5, '#c8803c'); } };
    beam(20, 30, true); beam(56, 61, false); beam(110, 116, true);
    for(const s of [1, -1]){ const ax0 = TW / 2 - s * 36, ax1 = TW / 2 + s * 36, w = Math.max(PX, k * 2.2); poly(X(ax0) - w / 2, Y(31), X(ax0) + w / 2, Y(31), X(ax1) + w / 2, Y(56), X(ax1) - w / 2, Y(56), D); poly(X(ax0) - PX / 2, Y(31), X(ax0) + PX / 2, Y(31), X(ax1) + PX / 2, Y(56), X(ax1) - PX / 2, Y(56), L); } }
  // deck lamp for the left side: pole at x=2, arm reaching right to the head; mirrored for the right side
  const LAMP = ['..OO............', '..OLOOOOOOOOOO..', '..OLMMMMMMMMMMOO', '..OLO......OYYYO', '..OLO.......YYY.', '..OLO...........'];
  const lampSprite = () => SPR.bayLamp || (SPR.bayLamp = (() => { const rows = LAMP.slice(); for(let i = 0; i < 34; i++) rows.push(i % 9 === 4 ? '.OLMO...........' : '..OLO...........'); rows.push('.OLMMO..........', 'OLMMMMO.........');
    return makeSprite(rows, { O:'#0a1024', L:'#6a80ac', M:'#2c3c62', Y:'#fff0c8' }, false); })());

  // a cruise liner crossing the bay, seen side on from the bridge. Studied from night photos of Asuka II (Kobe, Yokohama), the Hikawa Maru
  // dressed overall at Yamashita pier, and Pacific Dawn's reflection: stacked white decks with warm and cool cabin rows, promenade lights under
  // each overhang, a floodlit lifeboat row, the funnel's lit mark, a bulb string bow-mast-mast-stern, and long broken streaks in the water.
  // Side view, bow to the right, drawn in "ship units" (1 unit ~ 0.6 m; waterline length 300) and rasterised at each LOD's own scale,
  // so decks, windows, lifeboats and bulbs are real pixels at every size (never an upscaled small sprite).
  const SU0 = -20, SU1 = 330, SV0 = -6, SV1 = 99;          // unit box: x from the wake to the bow tip, y from below the waterline to the mainmast
  const SHIP_W = [40, 50, 62, 78, 98, 122, 152, 190, 238, 298, 372, 465];   // LOD canvas widths (x1.25 steps)
  const SPN = {   // night: moonlit white steel (cool), its own deck lights (warm)
    rim:'#c4d2ec', face:'#8194c2', face2:'#7084b4', shad:'#3e4f82', deep:'#232d56', ink:'#141a34',
    hTop:'#97a9d0', hull:'#6576a8', hull2:'#556598', stripe:'#b8343f', boot:'#4a1c2c', wl:'#0e1328', stem:'#b8c6e6',
    wA:'#ffd890', wB:'#ffbf6c', wC:'#e0965a', wCool:'#cfe4ff', wCool2:'#94b4dc', wDark:'#2a3354', port:'#e8b070',
    prom:'#fff0c4', pool:'#b0a8c8', bulbA:'#ffd890', bulbB:'#ffb45a', bulbC:'#fff4d8', boat:'#f2923e', boatHi:'#ffc47a', boatLo:'#a44c26', davit:'#232c52', recess:'#3a3a5e', spill:'#8a6a64',
    fun:'#ddd6cc', funSh:'#a8a6b8', funBand:'#d23a36', funTop:'#121624', logo:'#ffd36a', logoC:'#fff6dc', mast:'#b4c4e4', brW:'#1a2242', brG:'#86b8e8',
    foam:'#d8e4f6', foam2:'#90a6d0', rail:'#a8b8dc' };
  const SPD = {   // dawn: the ship sits against the bright horizon, so it is backlit like the skyline, with a pink rim on every top edge
    rim:'#e6aab0', face:'#545a86', face2:'#4a4f7a', shad:'#30335a', deep:'#222448', ink:'#14162e',
    hTop:'#6a6890', hull:'#4c5280', hull2:'#3e4470', stripe:'#8a2c3a', boot:'#341828', wl:'#0e1124', stem:'#8a86aa',
    wA:'#d8a878', wB:'#c89064', wC:'#a07058', wCool:'#9aa8c8', wCool2:'#7484aa', wDark:'#262a4a', port:'#a88068',
    prom:'#d8b898', pool:'#605a88', bulbA:'#c8a080', bulbB:'#b88868', bulbC:'#d8c0a8', boat:'#c8703c', boatHi:'#e89a6a', boatLo:'#7a3a24', davit:'#1c2040', recess:'#2a2a4a', spill:'#5a4458',
    fun:'#8a849c', funSh:'#5a587a', funBand:'#a83036', funTop:'#101220', logo:'#c8a060', logoC:'#e0c8a0', mast:'#7a7a9c', brW:'#161a34', brG:'#5a6a98',
    foam:'#9aa6c8', foam2:'#646e98', rail:'#6a6c92' };
  const shH = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7 + 74.7) * 43758.5453; return s - Math.floor(s); };
  const shipDeck = u => 20 + (u > 200 ? 7.5 * Math.pow((u - 200) / 118, 2) : 0) + (u < 30 ? 1.5 * (30 - u) / 30 : 0);   // sheer: rises to the bow
  const shipBow = v => 300 + 18 * Math.pow(Math.max(0, v) / 28, 1.25);   // raked stem
  const shipStern = v => v >= 9 ? 0 : 9 - 9 * Math.sqrt(1 - Math.pow(1 - Math.max(0, v) / 9, 2));   // rounded cruiser stern
  const DECKS = [[30, 262], [42, 254], [58, 246], [80, 238], [150, 230]];   // superstructure deck extents (aft, fore), 6 units each above v=20
  // the dressed-overall string: bow -> foremast -> mainmast -> stern, with catenary sag
  const STRING = [[318, 28.5], [242, 81], [160, 91], [3, 24]], SAG = [9, 3, 14];
  const FORE = 242, MAIN = 160;
  function shipBuild(Wpx, P){
    const s = Wpx / (SU1 - SU0), Hpx = Math.ceil((SV1 - SV0) * s) + 1, c = canvas(Wpx, Hpx), g = c.getContext('2d'), img = g.createImageData(Wpx, Hpx), D = img.data;
    const wl = Hpx - 1 - Math.round(-SV0 * s);   // pixel row of the waterline (v = 0)
    const RGB = {}, rgbOf = h => RGB[h] || (RGB[h] = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
    const put = (x, y, h) => { if(x < 0 || y < 0 || x >= Wpx || y >= Hpx) return; const o = (y * Wpx + x) * 4, q = rgbOf(h); D[o] = q[0]; D[o + 1] = q[1]; D[o + 2] = q[2]; D[o + 3] = 255; };
    const get = (x, y) => x >= 0 && y >= 0 && x < Wpx && y < Hpx && D[(y * Wpx + x) * 4 + 3] > 0;
    const px = u => Math.round((u - SU0) * s), py = v => wl - Math.round(v * s), uOf = x => (x + .5) / s + SU0, vOf = y => (wl - y) / s;
    const rect = (u0, v0, u1, v1, h) => { const x0 = px(u0), x1 = Math.max(x0, px(u1) - 1), y1 = py(v0), y0 = Math.min(y1, py(v1) + 1); for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++) put(x, y, h); };
    const dot = (u, v, h, sz = 1) => { const n = Math.max(1, Math.round(sz * s)), x0 = px(u) - (n >> 1), y0 = py(v) - (n >> 1); for(let y = 0; y < n; y++) for(let x = 0; x < n; x++) put(x0 + x, y0 + y, h); };
    const big = s >= 1.05, mid = s >= .62;   // detail tiers
    // ---- hull
    for(let x = 0; x < Wpx; x++){ const u = uOf(x), dk = shipDeck(u);
      for(let y = py(dk); y <= wl; y++){ const v = vOf(y); if(v < -.01 || v > dk + .01 || u < shipStern(v) || u > shipBow(v)) continue;
        let h = v > dk - Math.max(1.6, 1 / s) ? P.hTop : v < Math.max(1, 1 / s) ? P.wl : v < 3 ? P.boot : (v >= 11 && v < 11 + Math.max(1.3, 1 / s)) ? P.stripe : v > 11 ? P.hull : P.hull2;
        if(u > shipBow(v) - Math.max(1.2, 1 / s) && v > 3) h = P.stem;   // the stem catches the light
        put(x, y, h); } }
    // portholes (dim, two rows) and the hull name mark near the bow
    for(let u = 22; u < 292; u += 4.5){ const hv = shH(u, 7); if(mid || hv < .5) dot(u, 6.5, hv < .55 ? P.port : P.wDark); if(big) dot(u + 1.5, 15.5, hv > .35 ? P.wB : P.wDark); }
    if(big) for(let i = 0; i < 5; i++) if(i !== 2) rect(282 + i * 2.2, 16.5, 283.4 + i * 2.2, 18.2, P.deep);
    if(mid) rect(306, 21, 309, 23.5, P.deep);   // hawse pipe
    // ---- superstructure: five decks, terraced fore and aft, each with a lit fascia, an overhang shadow and a window band
    DECKS.forEach(([a, f], d) => { const vb = 20 + d * 6, vt = vb + 6;
      for(let x = px(a); x <= px(f); x++){ const u = uOf(x);
        for(let y = py(vt); y <= py(vb); y++){ const v = vOf(y), fr = (v - vb) / 6, fore = f - fr * 3;   // the forward face is raked back
          if(u > fore || u < a) continue; const top = vt - v;
          let h = top < Math.max(.9, .6 / s) ? P.rim : top < Math.max(1.9, 1.6 / s) ? P.shad : v < vb + 1.2 ? P.face2 : P.face;
          if(u > fore - Math.max(1.4, 1 / s) && top >= 1) h = top < 2 ? P.shad : P.rim;   // the curved front catches light on its edge
          put(x, y, h); } }
      // promenade lights under each overhang
      for(let u = a + 4; u < f - 4; u += 6){ if(mid) rect(u - 1.3, vt - 4.4, u + 1.3, vt - 1.9, P.pool); dot(u, vt - 1.4, P.prom); }
      // windows: deck 0 is the lounges (long lit panes with mullions), decks 1-3 cabins, deck 4 the bridge and the sun deck
      const wv = vb + 1.6, wh = Math.max(1, Math.round(2.2 * s)) / s;
      if(d === 0){ for(let u = a + 6; u < f - 10; u += 5){ const hv = shH(u, 1), cA = hv < .7 ? P.wA : hv < .85 ? P.wB : P.wDark; rect(u, wv, u + 4, wv + Math.max(wh, 2.6), cA); if(big) rect(u + 4, wv, u + 5, wv + 2.6, P.face2); } }
      else if(d < 4){ const step = Math.max(3.6, 2 / s), ww = Math.max(1 / s, Math.min(2.2, step - 1 / s)); for(let u = a + 4 + d; u < f - 6; u += step){ if(d === 1 && u > 112 && u < 228) continue; const hv = shH(Math.floor((u - a) / (step * 3)), d + 7 * Math.round(u / 97));
          const cW = hv < .34 ? P.wA : hv < .5 ? P.wB : hv < .6 ? P.wC : hv < .72 ? P.wCool : hv < .78 ? P.wCool2 : P.wDark; rect(u, wv, u + ww, wv + wh, cW); } }
      else { rect(f - 22, wv - .2, f - 3, wv + 2.8, P.brW); for(let u = f - 21; u < f - 4; u += 3) dot(u, wv + 1.6, P.brG); for(let u = a + 3; u < f - 26; u += Math.max(4, 2 / s)) rect(u, wv, u + Math.max(1 / s, 2.2), wv + wh, shH(u, 9) < .5 ? P.wA : P.wDark); }
    });
    // open-deck railings on the aft terraces and the sun deck (a fine lit line over whatever is behind)
    if(mid) DECKS.forEach(([a], d) => { const nxt = d < 4 ? DECKS[d + 1][0] : 222, vt = 26 + d * 6; for(let u = a; u < nxt; u += 1 / s) dot(u, vt + 1.3, P.rail, .5); if(big) for(let u = a; u < nxt; u += 3) rect(u, vt, u + .6, vt + 1.3, P.rail); });
    // ---- lifeboats in their davits along deck 1, under floodlights (the bright orange row the eye finds first)
    { const vb = 26, vt = 32; rect(112, vb, 228, vt - 1.8, P.recess); for(let x = px(112); x <= px(228); x++) if(x % 3 === 0) put(x, py(vb + .6), P.spill);
      for(let u = 114; u + 13 < 228; u += 16.5){ const bl = 13, b0 = vb + 1, b1 = vb + 4.6;
        for(let x = px(u); x <= px(u + bl); x++){ const t = (uOf(x) - u) / bl, round = Math.min(t, 1 - t) < .08 ? .8 : 0;
          for(let y = py(b1 - round); y <= py(b0 + round * .5); y++){ const v = vOf(y); put(x, y, v > b1 - 1.2 ? P.boatHi : v < b0 + 1 ? P.boatLo : P.boat); } }
        if(mid){ rect(u - .4, b1, u + .6, vt - .2, P.davit); rect(u + bl - .6, b1, u + bl + .4, vt - .2, P.davit); } } }
    // ---- funnel: raked aft, cream with a vermilion band, a black top and the line's lit sun-disc
    for(let y = py(66); y <= py(44); y++){ const v = vOf(y), r = v - 44, L = 114 - r * .45, R = 138 - r * .6;
      for(let x = px(L); x <= px(R); x++){ const u = uOf(x); if(u < L || u > R) continue; if(v > 64 + (u - L) / (R - L) * 2) continue;
        const e = (u - L) / (R - L), rnd = Math.abs(e - .45) * 2;
        let h = v > 61 ? P.funTop : (v > 52 && v < 57.5) ? P.funBand : rnd > .78 ? P.funSh : P.fun;
        put(x, y, h); } }
    { const lu = 122.5, lv = 54.8, r = 2.3; for(let y = py(lv + r); y <= py(lv - r); y++) for(let x = px(lu - r); x <= px(lu + r); x++){ const du = uOf(x) - lu, dv = vOf(y) - lv, dd = Math.sqrt(du * du + dv * dv); if(dd <= r) put(x, y, dd < r * .45 ? P.logoC : P.logo); } }
    // ---- masts with yards and a radar bar; the lights at their tops are drawn live
    for(const [mu, top, yard] of [[FORE, 80.5, 72], [MAIN, 90.5, 83]]){ let base = 20; DECKS.forEach(([a, f], d) => { if(mu >= a && mu <= f - 3) base = 26 + d * 6; }); rect(mu - .6, base - .5, mu + .6, top, P.mast); if(mid) rect(mu - 6, yard, mu + 6, yard + .8, P.mast); if(big) rect(mu - 3.5, yard - 6, mu + 3.5, yard - 5.2, P.mast); }
    // ---- dressed overall: a catenary string of bulbs bow -> foremast -> mainmast -> stern
    for(let i = 0; i < 3; i++){ const [u0, v0] = STRING[i], [u1, v1] = STRING[i + 1], len = Math.hypot(u1 - u0, v1 - v0);
      const stp = Math.max(2.5 / s, 3); for(let k2 = 0, m = Math.floor(len / stp); k2 <= m; k2++){ const t = k2 / m, u = lerpU(u0, u1, t), v = lerpU(v0, v1, t) - SAG[i] * 4 * t * (1 - t);
        if(get(px(u), py(v)) && v < 50 && i !== 2) continue; dot(u, v, k2 % 3 === 0 ? P.bulbC : k2 % 3 === 1 ? P.bulbA : P.bulbB); } }
    // ---- water: the dark seam under the hull, the bow wave and a short wake
    for(let x = px(4); x <= px(300); x++) put(x, wl + 1, P.ink);
    for(let y = py(3.2); y <= py(-1.5); y++){ const v = vOf(y), b = shipBow(Math.max(0, v)), reach = v >= 0 ? b + (3.2 - v) * .9 : 300 + (1.5 + v) * 5; for(let x = px(v >= 0 ? b - 1 : 286); x <= px(reach); x++){ const u = uOf(x); if(v >= 0 && u < b - .5) continue; put(x, y, v >= .8 ? P.foam : (x + y) % 2 ? P.foam2 : P.foam); } }
    for(let x = px(150); x <= px(296); x++) if(shH(x, 3) < .45) put(x, wl + 1, P.foam2);
    for(const [wv, sp2] of [[.2, 0], [-1.6, 1]]){ for(let u = 8 - sp2 * 3; u > -19; ){ const ln = 1.5 + shH(u, wv) * 4, p = (u + 19) / 27; if(shH(u * 3, wv) < .25 + p * .7) rect(u - ln, wv, u, wv + Math.max(1, s) / s, p > .55 ? P.foam : P.foam2); u -= ln + 1 + (1 - p) * 3; } }
    g.putImageData(img, 0, 0); c.wl = Hpx - 1 - wl; c.s = s; c.px = D; return c;
  }
  const lerpU = (a, b, t) => a + (b - a) * t;
  // the reflection: flipped, squashed to 70 %, every lit pixel stretched into a broken vertical streak; white steel as faint rows; baked per LOD
  function shipReflBuild(src){
    const w = src.width, h = src.height, s = src.s, wlr = h - 1 - src.wl, d = src.px, Rh = Math.ceil(wlr * .72) + Math.ceil(12 * s) + 2, RW = w + 4;
    const c = canvas(RW, Rh), g = c.getContext('2d'), img = g.createImageData(RW, Rh), D = img.data;
    const blend = (x, y, r, gg, b, a) => { if(x < 0 || y < 0 || x >= RW || y >= Rh || a <= 0) return; const o = (y * RW + x) * 4; if(D[o + 3] >= a) return; D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = a; };
    const band = Math.max(1, Math.round(1.6 * s)), broken = r => { const bi = Math.floor(r / band); return bi > 1 && shH(bi, 5) < .12 + (r / Rh) * .45; }, off = r => 2 + Math.round(Math.sin(Math.floor(r / band) * .8) * 1.2);
    for(let sy = wlr - 2; sy >= 0; sy--){ const rm = Math.round((wlr - sy) * .72);
      for(let x = 0; x < w; x++){ const o = (sy * w + x) * 4; if(!d[o + 3]) continue; const R = d[o], G = d[o + 1], B = d[o + 2], lum = R + G + B;
        if((lum > 660 || (lum > 420 && R - B > 40)) && (d[o - 4 + 3] === 0 || d[o - 4] + d[o - 3] + d[o - 2] < 420 || shH(x, sy) < .3)){   // a light: a broken vertical streak running down from its mirror point
          const L = Math.round((2 + shH(x, sy) * 8) * s) + 1;
          for(let j = 0; j < L; j++){ const r = rm + j; if(broken(r)) continue; const depth = r / Rh, a = Math.round(255 * (.66 - depth * .45) * (1 - j / (L + 1) * .7)); blend(x + off(r), r, R, G, B, a); } }
        else if(lum > 330 && rm % (band * 2) === 0 && !broken(rm) && shH(x >> 2, rm) < .4) blend(x + off(rm), rm, R, G, B, Math.round(255 * (.22 - rm / Rh * .18))); } }
    g.putImageData(img, 0, 0); return c;
  }
  // every LOD (night, dawn and the baked reflection) is built in warm(): 36 small canvases, none mid-ride
  const shipLods = () => SPR.bayLiner || (SPR.bayLiner = SHIP_W.map((w, i) => { const n = shipBuild(w, SPN), o = { n, d:shipBuild(w, SPD), r:shipReflBuild(n) };
    n.px = o.d.px = null; SPR['bayLinerN' + i] = o.n; SPR['bayLinerD' + i] = o.d; SPR['bayLinerR' + i] = o.r; return o; }));   // listed in SPR one by one too, so the engine's warm-up draws each once and uploads its texture before the ride
  const SHIP_HW = 7;   // the whole sprite spans 7 half-road widths
  // navigation lights [u, v, colour, halo]: masthead lights (fore lower than main), the sidelight we face (set per side), the stern light
  const SHIP_NAV = [[FORE, 81.6, '#fff6dc', 6], [MAIN, 91.6, '#fff6dc', 6], [DECKS[4][1] - 1.5, 51, '', 5], [3, 22.5, '#fff6dc', 4]];
  function drawLiner(sp, x, y, uw, fog, now){
    const L = shipLods(), want = uw * SHIP_HW / PX; let li = 0; while(li < L.length - 1 && L[li + 1].n.width <= want) li++;
    const o = L[li], spr = o.n, k = uw * SHIP_HW / spr.width, rel = want / spr.width, a = (1 - fog * .8) * clamp((2.6 - rel) / 1.1, 0, 1); if(a <= 0) return;
    const sd = sp.x < 0 ? -1 : 1, dawn = clamp((MOON.t - .8) / .18, 0, 1);
    // it glides slowly out across the bay, bow first (held still under reduced motion)
    if(sp.t0 === undefined) sp.t0 = now; const xx = x + (reduce ? 0 : sd * Math.min(90, (now - sp.t0) / 1000) * .06 * uw);
    // heading left (the left side of the road) the sprite is mirrored about its centre, as the lamps are
    const c0 = sd > 0 ? xx : 0; if(sd < 0){ cx.save(); cx.translate(snap(xx), 0); cx.scale(-1, 1); }
    // the reflection, in bands that each drift a pixel side to side on a ~12 s cycle (well under 3 changes a second; still under reduced motion)
    const R = o.r, rw = snap(R.width * k), bh = Math.ceil(R.height / 6), X = snap(c0 - rw / 2);
    cx.globalAlpha = a * (1 - dawn * .6); cx.imageSmoothingEnabled = false;
    for(let b = 0; b < 6; b++){ const r0 = b * bh, r1 = Math.min(R.height, r0 + bh); if(r1 <= r0) break; const y0 = snap(y + r0 * k), y1 = snap(y + r1 * k); if(y1 <= y0) continue;
      const dx = reduce ? 0 : Math.round(Math.sin(now / 1900 + b * 1.3 + sp.k) * 1.2) * PX; cx.drawImage(R, 0, r0, R.width, r1 - r0, X + dx, y0, rw, y1 - y0); }
    // the ship: night look, then the backlit dawn look faded over it
    const yb = y + spr.wl * k; cx.globalAlpha = a; blit(spr, c0, yb, k); if(dawn > 0){ cx.globalAlpha = a * dawn; blit(o.d, c0, yb, k); }
    if(sd < 0) cx.restore(); cx.globalAlpha = 1;
    const us = spr.s * k, P0 = xx - sd * snap(spr.width * k) / 2, ls = Math.max(PX, snap(1.3 * us)), la = a * (1 - dawn * .35);
    for(let i = 0; i < 4; i++){ const n = SHIP_NAV[i], c = i === 2 ? (sd > 0 ? '#5aff9a' : '#ff4a4a') : n[2], lx = P0 + sd * (n[0] - SU0) * us, ly = y - n[1] * us;
      cx.globalAlpha = la; cx.fillStyle = c; cx.fillRect(snap(lx - ls / 2), snap(ly - ls / 2), ls, ls); cx.globalAlpha = 1; if(fog < .7) gl(lx, ly, n[3] * us + PX * 2, c, .3 * la); }
    // the lit funnel mark
    if(fog < .7) gl(P0 + sd * (122.5 - SU0) * us, y - 54.8 * us, 6 * us + PX, '#ffd36a', .22 * la);
  }

  // ---------------------------------------------------------------- the city across the bay (cached, wraps every P art px)
  let SKY = null, REF = null, CLOUD = null, GLOW = null;
  function buildCity(){
    const c = canvas(P * 2, SH), k = c.getContext('2d'), rnd = R(4242), px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); k.fillRect(x + P, y, 1, 1); };
    const rect = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); k.fillRect(x + P, y, w, h); };
    const base = SH - 1, density = x => { const g = (m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s)); return .12 + .9 * g(360, 70) + .55 * g(560, 40) + .35 * g(200, 45) + .9 * g(360 + P, 70) + .9 * g(360 - P, 70); };
    // city glow under the clouds: dithered mauve, densest above downtown
    // (drawn additively from its own canvas, so it brightens the sky without painting over the moon)
    const g = canvas(P * 2, SH), gk = g.getContext('2d'), gp = (x, y, col) => { gk.fillStyle = col; gk.fillRect(x, y, 1, 1); gk.fillRect(x + P, y, 1, 1); };
    for(let y = 0; y < SH; y++) for(let x = 0; x < P; x++){ const v = (1 - y / SH), dd = density(x) * (1 - v * 1.25); if(dd <= 0) continue; const th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16;
      if(dd * .55 > th + .25) gp(x, y, '#2c1430'); else if(dd * .55 > th) gp(x, y, '#180c20'); }
    GLOW = g;
    // far headlands left and right of downtown
    for(let x = 0; x < P; x++){ const hd = Math.max(0, 7 * Math.sin((x - 20) / 110 * Math.PI)) * (x < 140 ? 1 : 0) + Math.max(0, 6 * Math.sin((x - 600) / 150 * Math.PI)) * (x > 600 ? 1 : 0); if(hd > 0) rect(x, base - Math.round(hd), 1, Math.round(hd) + 1, '#0d1430'); }
    // lighthouse on the left headland
    rect(66, base - 26, 3, 19, '#c8ccd8'); rect(66, base - 26, 1, 19, '#ecf0f8'); rect(68, base - 26, 1, 19, '#7a8098'); rect(66, base - 21, 3, 2, '#b8323a'); rect(66, base - 14, 3, 2, '#b8323a'); rect(65, base - 29, 5, 3, '#0a0e1e'); px(67, base - 28, '#fff6dc');
    // far layer: a low dim band of buildings
    for(let x = 90; x < 640;){ const w = 5 + Math.floor(rnd() * 10), h = Math.round((6 + rnd() * 20) * density(x) + 3); rect(x, base - h, w, h + 1, '#141c3e'); rect(x, base - h, w, 1, '#1e2a52');
      for(let yy = base - h + 2; yy < base - 1; yy += 2) for(let xx = x + 1; xx < x + w - 1; xx += 2) if(rnd() < .14) px(xx, yy, '#6a5a6a'); x += w + (rnd() < .3 ? 2 : 0); }
    // main layer: towers with floor-banded windows, stepped crowns and antennas
    const WIN = ['#ffc874', '#ffe2a8', '#ffd08a', '#a8d0ff'];
    for(let x = 120; x < 630;){ const w = 6 + Math.floor(rnd() * 12), dn = density(x + w / 2), h = Math.round((8 + rnd() * 46) * dn + 4), top = base - h, mode = rnd(), wc = WIN[rnd() < .2 ? 3 : Math.floor(rnd() * 3)];
      rect(x, top, w, h + 1, '#0b1130'); rect(x, top, 1, h, '#22305c'); rect(x, top, w, 1, '#2a3866'); rect(x + w - 1, top + 1, 1, h, '#070b20');
      if(h > 30 && rnd() < .6){ const cw = Math.max(2, Math.floor(w / 2)), ch = 3 + Math.floor(rnd() * 5); rect(x + Math.floor((w - cw) / 2), top - ch, cw, ch, '#0b1130'); rect(x + Math.floor((w - cw) / 2), top - ch, 1, ch, '#22305c');
        if(rnd() < .7){ const ax = x + Math.floor(w / 2); rect(ax, top - ch - 6, 1, 6, '#2a3866'); px(ax, top - ch - 7, pal.red); } }
      for(let yy = top + 2; yy < base - 2; yy += 2){ const band = mode < .45 ? (rnd() < .4) : mode < .8 ? true : false;
        for(let xx = x + 2; xx < x + w - 1; xx += 2){ const on = mode < .45 ? band && rnd() < .85 : mode < .8 ? rnd() < .3 : rnd() < .06; if(on) px(xx, yy, rnd() < .15 ? '#8a6040' : wc); } }
      if(rnd() < .12 && h > 18){ const nc = ['#ff3b8a', '#4ff0ff', '#ff6a3a'][Math.floor(rnd() * 3)]; rect(x + 1, top + 3, w - 2, 2, nc); }
      x += w + (rnd() < .25 ? 1 + Math.floor(rnd() * 3) : 0); }
    // landmark: a lattice broadcast tower, orange and white
    const tx = 300, th = 70; for(let y = 0; y < th; y++){ const hw = Math.round(1 + 8 * Math.pow(y / th, 1.8)), yy = base - th + y, col = Math.floor(y / 10) % 2 ? '#e8e0d8' : '#d0502a';
      px(tx - hw, yy, col); px(tx + hw, yy, col); if(y % 6 === 0) for(let xx = -hw; xx <= hw; xx++) px(tx + xx, yy, col); else if(hw > 2 && (y % 6 === 3)) { px(tx, yy, col); } }
    rect(tx - 3, base - th + 26, 7, 3, '#ffe2a8'); rect(tx - 4, base - th + 45, 9, 2, '#ffe2a8'); rect(tx, base - th - 8, 1, 8, '#e8e0d8'); px(tx, base - th - 9, pal.red);
    // ferris wheel frame (its rim lights are drawn live)
    const wx = 560, wy = base - 20; for(let a = 0; a < 16; a++){ const an = a / 16 * 6.283; for(let r = 2; r < 15; r += 2) px(Math.round(wx + Math.cos(an) * r), Math.round(wy + Math.sin(an) * r), '#1c2648'); }
    rect(wx - 6, wy, 1, 20, '#1c2648'); rect(wx + 6, wy, 1, 20, '#1c2648');
    SKY = c; buildRefl();
  }
  // the water mirror: lit pixels become broken vertical streaks, buildings a checker of darker water
  function buildRefl(){
    const c = canvas(P * 2, RH), k = c.getContext('2d'), d = SKY.getContext('2d').getImageData(0, 0, P, SH).data, rnd = R(99);
    for(let x = 0; x < P; x++) for(let y = SH - 1; y >= 0; y--){ const o = (y * P + x) * 4; if(!d[o + 3]) continue; const r = d[o], g = d[o + 1], b = d[o + 2], lum = r + g + b, dist = SH - 1 - y, ry = Math.floor(dist * .62);
      if(ry >= RH) continue;
      const put = (xx, yy, col) => { if(yy < RH){ k.fillStyle = col; k.fillRect(xx, yy, 1, 1); k.fillRect(xx + P, yy, 1, 1); } };
      if(lum > 330){ const len = 3 + Math.floor(rnd() * 9);
        for(let j = 0; j < len; j++){ if(j > 2 && rnd() < .3) continue; put(x + (j > 3 && rnd() < .3 ? (rnd() < .5 ? -1 : 1) : 0), ry + j, `rgba(${r},${g},${b},${Math.max(.18, .85 - j * .07)})`); } }
      else if(lum < 150 && (x + ry) % 2 === 0) put(x, ry, 'rgba(3,6,18,.4)'); }
    REF = c; }
  // low rain clouds: long flat banks, underlit by the city, rimmed by the moon on top
  function buildClouds(){
    const w = P, h = 46, c = canvas(w * 2, h), k = c.getContext('2d'), rnd = R(7);
    // each bank: a flat underside and a lumpy top built from a few bumps; rim / body / underlit belly
    for(let n = 0; n < 7; n++){ const cxm = rnd() * w, base = 12 + rnd() * (h - 16), len = 60 + rnd() * 120, bumps = [];
      for(let b = 0; b < 3 + Math.floor(rnd() * 4); b++) bumps.push([(rnd() * 2 - 1) * len * .7, 4 + rnd() * 8, 10 + rnd() * 26]);
      for(let x = -len; x < len; x++){ const e = 1 - (x / len) * (x / len); if(e <= 0) continue; let top = 2 * e;
        for(const [bx, bh, bw] of bumps){ const d = (x - bx) / bw; if(Math.abs(d) < 1) top = Math.max(top, bh * Math.sqrt(1 - d * d) * Math.min(1, e * 3)); }
        const y0 = Math.round(base - top), y1 = Math.round(base), xx = ((Math.round(cxm + x) % w) + w) % w;
        for(let y = y0; y <= y1; y++){ const col = y === y0 ? '#34406c' : y === y0 + 1 && x % 3 ? '#232c54' : y >= y1 - 1 ? '#2a1c3c' : '#141934'; k.fillStyle = col; k.fillRect(xx, y, 1, 1); k.fillRect(xx + w, y, 1, 1); } } }
    CLOUD = c; }

  // dithered fill patterns (one canvas px per art px), cached by colour and level
  const PAT = {};
  function dpat(col, lvl){ const key = col + lvl; if(PAT[key]) return PAT[key]; const t = canvas(4, 4), k = t.getContext('2d'); k.fillStyle = col; for(let i = 0; i < 16; i++) if(BY[i] < lvl) k.fillRect(i % 4, i >> 2, 1, 1);
    const p = cx.createPattern(t, 'repeat'); if(p.setTransform) p.setTransform(new DOMMatrix().scale(PX)); return PAT[key] = { p, px:PX }; }
  const pat = (col, lvl) => { let e = dpat(col, lvl); if(e.px !== PX){ delete PAT[col + lvl]; e = dpat(col, lvl); } return e.p; };

  const DCC = {}, deckCol = (st, lit) => { const q = Math.round(lit * 8), key = st * 16 + q; return DCC[key] || (DCC[key] = mixc(pal.deck[st], '#6a4a2c', q / 16)); };
  // per-frame: car positions gathered in roadFX for reflections and spray
  let carNow = -1, carMap = new Map(), carScr = [], carIds = 0;   // carIds: a stable id per car, so its reflection's ripple doesn't re-roll as it moves
  function mapCars(now){ if(now === carNow) return; carNow = now; carMap.clear(); carScr.length = 0; if(typeof cars === 'undefined') return; for(const c of cars){ const i = Math.floor(c.z / SEG); if(!carMap.has(i)) carMap.set(i, []); carMap.get(i).push(c); } }

  // a wet-road reflection: a broken vertical streak under a light, brightest at the mirror point
  function streak(x, yb, hp, wd, col, a, seed, now){
    // The breaks and side-steps used to re-roll every 80 ms (a 12 Hz shimmer on every light, reduced motion too). Now each dash eases between
    // two hashed states over ~1.3 s, and its gap fades rather than switching, so the mirror ripples like rain on water without strobing.
    hp = Math.min(hp, H * .22); if(a < .02 || hp < 2) return; const n = Math.min(9, Math.max(2, Math.round(hp / (PX * 2)))), y0 = yb + hp * .2, y1 = Math.min(H, yb + hp * 1.35), st = (y1 - y0) / n;
    const xs = snap(x - wd / 2); cx.fillStyle = col;
    for(let j = 0; j < n; j++){ const pj = reduce ? 0 : now / 1300 + hash(seed * 3.1 + j * 1.7), p0 = Math.floor(pj), fe = pj - p0, e = fe * fe * (3 - 2 * fe), hv = lerp(hash(seed * 13 + j * 7 + p0), hash(seed * 13 + j * 7 + p0 + 1), e), gap = clamp((hv - .16) / .12, 0, 1);
      if(gap <= 0) continue; const m = Math.abs((j + .5) / n - .62) * 2, aa = a * (1 - m * .75) * gap, ww = Math.max(PX, snap(wd * (1 - m * .5)));
      cx.globalAlpha = aa; cx.fillRect(xs + snap((wd - ww) / 2) + (hash(seed + j + p0) < .3 ? PX : 0), snap(y0 + j * st), ww, Math.max(PX, snap(st * .62))); } cx.globalAlpha = 1; }

  // stepped halos, radius capped so a light right at the camera never fills the whole screen three times over
  const gl = (x, y, r, col, a) => { if(x + r < 0 || x - r > W || y + r < 0 || y - r > H) return; glow(x, y, Math.min(r, H * .3), col, a); };
  // --------------------------------------------------------------- hooks
  // a rail of the see-through railing from this hanger (rx) to the next (nrx): top yy / nyy, thickness t1 / t2
  function railTh(rx, nrx, yy, nyy, t1, t2, col){ poly(rx, yy, rx, yy + t1, nrx, nyy + t2, nrx, nyy, col); }
  const LAMP_CONE = [1, .05, .55, .07];   // the lamp's two light cones: size, alpha
  const MIST_B = [.07, -16, 7, .004, 12, .08, -7, 4, .007, 9, .07, -2, 3, .011, 6];   // mist banks: alpha, top row, wave amplitude, drift speed, thickness
  const RAIN_L = [90, 3, 1, .55, .9, 1, 60, 6, 1, .5, 1.4, 50, 16, 13, 2, .38, 2.2, 90];   // rain layers: drops, length, width, alpha, speed, seed (colour: pal.rain[layer])
  ENV.bay = {
    ownsRain:true,
    // build every cache at load so nothing is generated mid-ride
    warm(){ if(!SKY){ buildCity(); buildClouds(); } tower(); lampSprite(); shipLods(); pat('#ffeec0', 3); },
    road:['#121628', '#151a2e'],
    lampCol:'#8a5a30',
    place(i, s, L){
      s.bayH = cab(i); s.bayR = [];
      if(i % SPAN === 0){ s.sprites.push({ env:'bay', type:'tower', x:0, k:i }); s.bayR.push([-CABX, TOPH, pal.red, .5], [CABX, TOPH, pal.red, .5], [-CABX, 2.2, pal.cool, .45], [CABX, 2.2, pal.cool, .45]); }
      if(i % 2 === 0) for(const sd of [-1, 1]) s.sprites.push({ env:'bay', type:'hang', x:sd * CABX, k:i, h:s.bayH, sd, bulb:i % 4 === 0, tw:i % SPAN === 0 });
      if(i % 8 === 4){ for(const sd of [-1, 1]){ s.sprites.push({ env:'bay', type:'lamp', x:sd * LAMPX, sd, k:i }); s.bayR.push([sd * .86, 1.22, pal.warm, .55]); } }
      if(i % 4 === 0) for(const sd of [-1, 1]) s.bayR.push([sd * CABX, s.bayH, pal.bulb, .16]);
      // the liner: 10 segments past a tower, so on the approach (d ~100..40) the camera is mid-span, where the hangers are shortest and the
      // main cable sags lowest, and the ship shows over them in open water; x 5.3-5.7 keeps its hull clear of the deck (inner edge ~2.1)
      if(i % 480 === 250){ const sd = hash(i) < .5 ? -1 : 1; s.sprites.push({ env:'bay', type:'ship', x:sd * (5.3 + hash(i * 3) * .4), k:i }); }
    },
    lit(i, s){ const q = Math.abs(i % 8 - 4); return Math.max(0, 1 - q / 2.2) * .4 + (i % SPAN < 3 || i % SPAN > SPAN - 3 ? .25 : 0); },
    draw(sp, x, y, uw, fog, now, sk){
      const a = 1 - fog * .8, t = MOON.t, blink = reduce ? 1 : (Math.sin(now / 420 + sp.k * .1) > -.2 ? 1 : .15);
      if(sp.type === 'hang'){
        const top = y - sp.h * uw, n = segs[sp.k + 2], lw = Math.max(1, uw * .012);
        cx.globalAlpha = a;
        if(!sp.tw){ cx.fillStyle = '#4a5a88'; pxRect(x, top, Math.max(PX, lw), sp.h * uw); }
        // main cable to the next hanger, and the parapet to the next post
        if(n && n.bayH !== undefined && n.p1.camera.z > 1 && n.p1.screen.y <= y + 1){ const nuw = n.p1.screen.w, nx = n.p1.screen.x + sp.x * nuw, ny = n.p1.screen.y, ntop = ny - n.bayH * nuw, ct = Math.max(PX, uw * .045), nct = Math.max(PX, nuw * .045);
          poly(x - ct * .5, top, x + ct * .5, top, nx + nct * .5, ntop, nx - nct * .5, ntop, '#9ab0d6'); if(fog < .4) poly(x - ct * .5, top + ct, x + ct * .5, top + ct, nx + nct * .5, ntop + nct, nx - nct * .5, ntop + nct, '#3c4e7c');
          const rx = x - sp.sd * (CABX - RAILX) * uw, nrx = nx - sp.sd * (CABX - RAILX) * nuw, rh = uw * .16, nrh = nuw * .16;
          // see-through railing: a low curb, a mid rail and a lit top rail, posts at each hanger, so the bay shows between
          if(fog < .55){ railTh(rx, nrx, y - rh * .25, ny - nrh * .25, rh * .25, nrh * .25, '#1a2138');
          railTh(rx, nrx, y - rh * .6, ny - nrh * .6, Math.max(1, uw * .015), Math.max(1, nuw * .015), '#33416a'); }
          railTh(rx, nrx, y - rh, ny - nrh, Math.max(PX, uw * .03), Math.max(PX, nuw * .03), '#6a7aa6');
          cx.fillStyle = '#2a3658'; pxRect(rx - uw * .012, y - rh, Math.max(PX, uw * .024), rh);
          if(sp.k % 8 === 2 && uw > 6){ cx.fillStyle = '#ffa040'; cx.fillRect(snap(rx), snap(y - rh * .55), PX, PX); } }
        cx.globalAlpha = 1;
        if(sp.bulb){ const bs = Math.max(PX, snap(uw * .035)), bulbA = a * (1 - clamp((t - .85) * 4, 0, .6));
          cx.fillStyle = pal.bulb; cx.globalAlpha = bulbA; cx.fillRect(snap(x - bs / 2), snap(top - bs / 2), bs, bs); cx.globalAlpha = 1; if(fog < .65) gl(x, top, uw * .14 + PX * 2, '#ffd890', .32 * bulbA); }
      }
      else if(sp.type === 'tower'){
        const spr = tower(), k = uw * TK;
        cx.globalAlpha = a; if(k > PX * 1.3) towerGeo(x, y, k); else blit(spr, x, y, k); cx.globalAlpha = 1;
        // floodlights: cool washes up the legs, warm window band, red aviation lights on the crowns
        for(let sd = -1; sd <= 1; sd += 2){ const lx = x + sd * 40 * k; gl(lx, y - 30 * k, 26 * k, pal.cool, .22 * a); gl(lx, y - 100 * k, 18 * k, pal.cool, .12 * a);
          cx.fillStyle = pal.red; cx.globalAlpha = blink * a; const rs = Math.max(PX, snap(2 * k)); cx.fillRect(snap(lx - rs / 2), snap(y - TH * k - rs / 2), rs, rs); cx.globalAlpha = 1; gl(lx, y - TH * k, 14 * k + PX * 2, pal.red, .5 * blink * a);
          cx.fillStyle = pal.red; cx.globalAlpha = blink * a; cx.fillRect(snap(lx - sd * 4 * k), snap(y - 112 * k), rs, rs); cx.globalAlpha = 1; }
        gl(x, y - 160 * k, 40 * k, '#ffd890', .14 * a);
      }
      else if(sp.type === 'lamp'){
        if(x < -uw * .6 || x > W + uw * .6) return; const spr = lampSprite(), k = uw * .5 / spr.width, h = spr.height * k, px0 = x + sp.sd * (spr.width / 2 - 2.5) * k * -1;
        cx.globalAlpha = a;
        if(sp.sd > 0){ cx.save(); cx.translate(px0, 0); cx.scale(-1, 1); blit(spr, 0, y, k); cx.restore(); } else blit(spr, px0 + 0, y, k);
        cx.globalAlpha = 1;
        const hx0 = x - sp.sd * 11.5 * k, hy = y - h + 4 * k;
        // a cone of lit rain under the head, in two hard steps
        if(fog < .6 && fog > .06){ cx.globalCompositeOperation = 'lighter'; for(let c = 0; c < 4; c += 2){ const f = LAMP_CONE[c], al = LAMP_CONE[c + 1]; cx.fillStyle = `rgba(255,190,110,${al * a})`; const tw2 = 2 * k * f, bw = uw * .42 * f; poly(hx0 - tw2, hy, hx0 + tw2, hy, hx0 + bw, y, hx0 - bw, y, cx.fillStyle); } cx.globalCompositeOperation = 'source-over'; }
        gl(hx0, hy, uw * .26, pal.warm, .55 * a);
      }
      else if(sp.type === 'ship') drawLiner(sp, x, y, uw, fog, now);
    },
    roadFX(s, a, b, fog, f, now){
      mapCars(now);
      const hz = HZ, h = Math.max(1, a.y - b.y), dlA = a.x - a.w * DECK, drA = a.x + a.w * DECK, dlB = b.x - b.w * DECK, drB = b.x + b.w * DECK;
      // the city mirrored in the bay, rippled by shifting each band sideways
      const ry0 = b.y - hz;
      if(REF && ry0 >= 0 && ry0 < RH * PX){ const rip = Math.round((reduce ? 0 : Math.sin(now / 380 + s.index * 1.7) * 1.4) + Math.sin(s.index * .37) * .8), off = ((((skyPar('mid')) / PX) % P) + P) % P, sy = ry0 / PX, shh = Math.min(RH - sy, h / PX);
        const L = Math.min(dlA, dlB), Rr = Math.max(drA, drB);
        if(L > 0) cx.drawImage(REF, (off + rip + P) % P, sy, L / PX, shh, 0, b.y, L, shh * PX);
        if(Rr < W) cx.drawImage(REF, (off + rip + P) % P + Rr / PX, sy, (W - Rr) / PX, shh, Rr, b.y, W - Rr, shh * PX); }
      // near water: sparse ripple dashes catching the sky
      if(fog < .45 && s.index % 2 === 0){ cx.fillStyle = f('#1e2e5e'); for(let k = 0; k < 2; k++){ const side = k ? 1 : -1, xx = a.x + side * a.w * (DECK + .3 + hash(s.index * 7 + k) * 4), ww = snap(a.w * (.15 + hash(s.index + k * 3) * .4)); cx.fillRect(snap(xx), snap(b.y), ww, PX); } }
      // the deck beside the road: wet concrete, a white curb line and the deck lip
      const lit = s.lit || 0, dc = f(deckCol(s.stripe, lit));
      poly(a.x - a.w * DECK, a.y, a.x - a.w, a.y, b.x - b.w, b.y, b.x - b.w * DECK, b.y, dc); poly(a.x + a.w, a.y, a.x + a.w * DECK, a.y, b.x + b.w * DECK, b.y, b.x + b.w, b.y, dc);
      if(a.w > 24){ const cc = f(pal.curb), cw = a.w * .035, cwb = b.w * .035;
      poly(a.x - a.w, a.y, a.x - a.w + cw, a.y, b.x - b.w + cwb, b.y, b.x - b.w, b.y, cc); poly(a.x + a.w - cw, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x + b.w - cwb, b.y, cc);
      const lc = f(pal.lip); poly(a.x - a.w * DECK, a.y, a.x - a.w * (DECK - .05), a.y, b.x - b.w * (DECK - .05), b.y, b.x - b.w * DECK, b.y, lc); poly(a.x + a.w * (DECK - .05), a.y, a.x + a.w * DECK, a.y, b.x + b.w * DECK, b.y, b.x + b.w * (DECK - .05), b.y, lc); }
      cx.globalCompositeOperation = 'lighter';
      // moonlight smeared down the wet road and deck
      if(fog > .12 && MOON.t < .95){ // world-anchored per segment, easing slowly between two hashed widths (it used to re-roll on/off every 140 ms)
        const ph = reduce ? 0 : now / 1400 + hash(s.index * 1.9), p0 = Math.floor(ph), fe = ph - p0, f2 = fe * fe * (3 - 2 * fe), mh = lerp(hash(s.index * 3.3 + p0 * .61), hash(s.index * 3.3 + (p0 + 1) * .61), f2), ma = clamp((mh - .28) / .14, 0, 1);
        if(ma > 0){ const ww = snap(a.w * (.04 + mh * .12) + PX); cx.fillStyle = `rgba(240,228,200,${.16 * ma * (1 - fog) * (1 - MOON.t * .6)})`; cx.fillRect(snap(MOON.x + (hash(s.index) - .5) * a.w * .3 - ww / 2), snap(b.y), ww, Math.max(PX, snap(h))); } }
      // wet-road mirror: every bridge light, and the cars' tail lights
      if(s.bayR) for(const [lx, lh, col, al] of s.bayR){ if(al < .3 && fog > .55) continue; if(fog < .015) continue; streak(a.x + lx * a.w, a.y, lh * a.w, Math.max(PX, Math.min(PX * 4, a.w * (al > .3 ? .06 : .03))), col, al * (1 - fog * .7) * Math.min(1, fog * 12), s.index + lx * 10, now); }
      const cs = carMap.get(s.index); if(cs) for(const c of cs){ const pct = (c.z % SEG) / SEG, w = lerp(a.w, b.w, pct), xx = lerp(a.x, b.x, pct) + c.x * w, yy = lerp(a.y, b.y, pct);
        carScr.push({ x:xx, y:yy, w, fog }); const id = c._bayId || (c._bayId = ++carIds); for(let sd = -1; sd <= 1; sd += 2) streak(xx + sd * w * .13, yy, w * .3, Math.max(PX, w * .06), '#ff3a3a', .6 * (1 - fog * .6), id * 7.3 + sd, now); }
      cx.globalCompositeOperation = 'source-over';
    },
    backdrop(o){
      if(!SKY){ buildCity(); buildClouds(); }
      const { hz, now, t } = o, off = ((((skyPar('mid')) / PX) % P) + P) % P, sh = SH * PX;
      // rain clouds drift over the moon, then the city across the water
      const coff = ((((skyOff * 80 + now * .004) / PX) % P) + P) % P;
      cx.globalAlpha = .92; cx.drawImage(CLOUD, coff, 0, W / PX, CLOUD.height, 0, snap(hz * .02), W, CLOUD.height * PX); cx.globalAlpha = 1;
      cx.globalCompositeOperation = 'lighter'; cx.drawImage(GLOW, off, 0, W / PX, SH, 0, hz - sh + PX, W, sh); cx.globalCompositeOperation = 'source-over';
      cx.drawImage(SKY, off, 0, W / PX, SH, 0, hz - sh + PX, W, sh);
      // ferris wheel rim lights, turning; aviation lights on the skyline
      const wx = (560 - off + P) % P, step = Math.floor(now / 260);
      if(wx * PX < W + 60 * PX || (wx - P) * PX > -60){ for(const base of [wx, wx - P, wx + P]){ const sx = base * PX; if(sx < -60 || sx > W + 60) continue;
        for(let a2 = 0; a2 < 16; a2++){ const an = a2 / 16 * 6.283 + now / 6000, c = NEON[(a2 + (reduce ? 0 : step)) % 5]; cx.fillStyle = c; cx.fillRect(snap(sx + Math.cos(an) * 15 * PX), snap(hz - sh + PX + (SH - 21) * PX + Math.sin(an) * 15 * PX), PX, PX); } } }
      // lighthouse: a dithered beam sweeping across the bay
      for(const base of [66 - off, 66 - off + P]){ const lx = (base + 1.5) * PX, ly = hz - sh + PX + (SH - 1 - 28) * PX; if(lx < -W || lx > W * 2) continue;
        const an = reduce ? 1 : now / 1400, c = Math.cos(an), sn = Math.sin(an), len = Math.abs(c) * W * .45, dir = Math.sign(c) || 1;
        if(len > 8){ cx.fillStyle = pat('#ffeec0', 3); cx.beginPath(); cx.moveTo(lx, ly); cx.lineTo(lx + dir * len, ly - len * .05); cx.lineTo(lx + dir * len, ly + len * .06); cx.closePath(); cx.fill(); }
        if(sn > .8) gl(lx, ly, 30 * (sn - .8) * 5, '#fff2c8', .6 * (sn - .8) * 5);
        else gl(lx, ly, 6, '#fff2c8', .4); }
      // the waterline: one bright row where the sky meets the bay
      cx.fillStyle = 'rgba(120,140,200,.35)'; cx.fillRect(0, hz, W, PX);
      return false;
    },
    overlay(al, now, sk){   // (MIST_B, RAIN_L: the mist banks' and rain layers' tables, above ENV.bay)
      const hz = HZ;
      // mist banks lying on the water at the horizon, in dither steps, drifting
      for(let q = 0; q < 15; q += 5){ const aa = MIST_B[q], y0 = MIST_B[q + 1], amp = MIST_B[q + 2], sp2 = MIST_B[q + 3], thk = MIST_B[q + 4]; cx.fillStyle = `rgba(110,124,176,${aa * al})`;
        for(let x = 0; x < W; x += PX * 4){ const n = Math.sin((x + now * sp2 * 20 + skyOff * 200) * .011) * .6 + Math.sin((x - now * sp2 * 33) * .027 + 2) * .4, top = snap(hz + y0 * PX - (n + 1) * amp * PX * .5), bot = snap(hz + (y0 + thk) * PX + n * PX); if(bot > top) cx.fillRect(x, top, PX * 4, bot - top); } }
      cx.globalAlpha = 1;
      if(reduce){ carScr.length = 0; return; }
      // a few droplets kicked up off each nearby car's rear tyres: single pale pixels that rise, drift out and fade (no fill, no patch)
      cx.fillStyle = pal.rain[2];
      for(const c of carScr){ if(c.fog > .35 || c.w < 12) continue;
        for(let j = 0; j < 6; j++){ const ph = (now / 340 + hash(j * 3.7 + c.x * .01)) % 1, sd = j % 2 ? 1 : -1;
          cx.globalAlpha = al * .55 * (1 - ph) * (1 - c.fog * 2.5);
          cx.fillRect(snap(c.x + sd * c.w * (.1 + ph * .12 + hash(j) * .06)), snap(c.y - c.w * (.02 + ph * .12) + ph * ph * c.w * .1), PX, PX); } }
      cx.globalAlpha = 1; carScr.length = 0;
      // the bike's own rooster tail of spray, low at the bottom of the screen
      const bs = Math.min(W * .2, H * .27), sv = speed / MAXS; if(sv > .2){ cx.fillStyle = `rgba(170,186,230,${.5 * al})`;
        for(let i = 0; i < 26; i++){ const ph = (now / 260 + hash(i) ) % 1, sd = i % 2 ? 1 : -1, xx = W / 2 + sd * (bs * .08 + ph * bs * (.25 + hash(i * 3) * .35)), yy = H - bs * .04 - ph * bs * (.12 + hash(i * 5) * .1) + ph * ph * bs * .25; cx.globalAlpha = (1 - ph) * sv; cx.fillRect(snap(xx), snap(yy), PX, PX); } cx.globalAlpha = 1; }
      // rain in three depths: far ticks, mid streaks, a few big near streaks; slanted outward from the vanishing point by speed
      const sp = .6 + (speed / MAXS) * .8;
      for(let q = 0; q < 18; q += 6){ const n = RAIN_L[q], len = RAIN_L[q + 1], wd = RAIN_L[q + 2], col = pal.rain[q / 6], alp = RAIN_L[q + 3], vel = RAIN_L[q + 4], seed = RAIN_L[q + 5];
        cx.fillStyle = col; cx.globalAlpha = alp * al; const L = len * PX;
        for(let i = 0; i < n; i++){ const r = seed + i, y = ((hash(r * 2.1) * (H + L) + now * vel * sp) % (H + L)) - L, xb = hash(r * 1.3) * W, sl = ((xb - W / 2) / W) * 1.1 * sp - .18, x = xb + sl * (y - hz) * .35;
          const segs2 = Math.max(1, Math.round(Math.abs(sl) * len)), sl2 = L / segs2; for(let j = 0; j < segs2; j++) cx.fillRect(snap(x + sl * j * sl2), snap(y + j * sl2), wd * PX, Math.max(PX, snap(sl2))); } }
      // splashes on the deck and road: dot, crown, two droplets
      cx.fillStyle = pal.rain[2];
      for(let i = 0; i < 44; i++){ const per = 300 + hash(i * 9) * 200, tt = now / per + hash(i), cyc = Math.floor(tt), fr = Math.floor((tt - cyc) * 4); if(fr > 2) continue;
        const dz = hash(i * 31 + cyc * 7.7), y = snap(hz + 6 * PX + dz * dz * (H - hz)), x = snap(hash(i * 17 + cyc * 3.1) * W), s = Math.max(1, Math.round((y - hz) / (H - hz) * 3)) * PX; cx.globalAlpha = al * (.95 - fr * .25);
        if(fr === 0) cx.fillRect(x, y - PX, PX, PX); else if(fr === 1){ cx.fillRect(x - s, y - s, PX, PX); cx.fillRect(x + s, y - s, PX, PX); cx.fillRect(x, y - PX, PX, PX); } else { cx.fillRect(x - 2 * s, y - PX, PX, PX); cx.fillRect(x + 2 * s, y - PX, PX, PX); } }
      cx.globalAlpha = 1;
    }
  };
})();

// where this road's barrier is drawn, for the collider (half-road widths)
ENV.bay.barrier = 1.06;
