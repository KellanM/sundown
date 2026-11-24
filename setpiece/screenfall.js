/* Sundown set piece: 大画面 SCREENFALL on Shuto C1 (MECH.sp_screen, director id 'screenfall', hero tier). See setpiece/README.md.
   Load after env/shuto.js and the other set pieces:   <script src="setpiece/screenfall.js"></script>

   A giant LED video wall (a 大型ビジョン of the kind Shibuya and Shinjuku hang on their rooftops) hangs across the expressway from a
   sky-bridge between two towers, cycling its late-night adverts to the traffic below. Its picture tears, modules die one by one, the
   hangers on one side snap in a storm of sparks, it swings down on the other side's hangers and slams its low corner into the deck in a
   burst of dust and broken modules. You ride round its corner on the side that snapped, through the one lane it leaves open.

   Beats, all driven by the rider's distance d to the screen's segment A (never by the clock); all inside the 360-segment draw distance:
     d -420          an amber 落下物注意 (falling objects) board on a gantry
     d -600          the card (the cut-in, or the director's 大画面 SCREENFALL card) as a heads-up, before the screen is in view (it waits
                     while you are airborne), and the director's guard (traffic moved off the zone)
     d -360          the sky-bridge and its screen come into view over the road, playing its adverts
     d -335          telegraph: the picture tears (shifted bands, then colour bars, then static), modules start to die, sparks, a crack
     d -250          the first hanger goes: the screen lurches six degrees and hangs, a module falls out, the cables on that side tear
     d -195 .. -95   the second goes: it swings down, gravity-eased, the torn picture still playing, modules dying faster; KEEP LEFT / RIGHT at -195
     d -95           its low corner hits the deck just past the centre line: a crash, dust, broken modules and sparks, shake; the picture dies
     d 0             you pass it: round the corner, under the open sky on the snapped side
   Fairness (kikubari): at rest the slab lies above a rider's height (0.42 half-road widths) only beyond its corner, so exactly one lane,
   the snapped side's outer lane, is open (u >= 0.42, 0.58 half-road widths wide), and the callout names it. It starts to fall 195 segments
   before you reach it (the callout), lands 95 before (about 1.7 s at top speed); a full lane change takes about 45 segments. Traffic is
   moved off the zone (the director's guard) and hazards are swept. One crash at most per event; the recovery blink protects as always.
   No slow motion. (Timing and geometry unchanged in the 2026-11-24 rebuild; see research/sundown-craft/shuto.md section 11.)

   The wall (2026-11-24 rebuild, at Akihabara's screen bar: env/akiba.js, env/akiba_ads.js):
   - 96 x 77 LEDs in 6 x 7 cabinet modules of 16 x 11. Four rotating adverts (invented, no brands or people: late news with a typhoon on
     the radar, a soda can, a contact-lens eye with the city in its iris, a wireframe net flythrough), colour bars and static, all painted
     at warm-up into one atlas (palette indices, an average colour per frame for the light it throws).
   - The panel is composed each frame on a small canvas at n canvas px per LED (n ~ the LED's size on screen): the frame, torn bands,
     dead / stuck / slipped modules, a per-module calibration tint, then the LED grid as a multiply pattern (gaps from 2 px, RGB sub-
     pixels from 4 px). That panel is drawn rotated into a scratch canvas at the game's pixel size and blitted x PX, so even the falling
     slab stays on the pixel grid.
   - The cabinet: a steel frame with bolts, a catwalk with railing and work lights on top, hanger lugs, its depth (the back plane is
     projected from DEP segments behind, so its underside with ribs, cable trays and inspection lamps shows as you pass beneath), power and
     data cable bundles to the bridge (they tear on the snapped side and hang sparking), an amber clock box under one corner.
   - The fall: modules die faster as it goes, a module drops out at the lurch, dust and broken modules on impact, and the light it
     throws on the deck is the picture's own average colour, moving with the slab and flickering with the glitches, gone when it dies.
   References: night photos of Shibuya and Shinjuku rooftop screens (module seams, colour mismatch between cabinets, steel frames,
   catwalks, cable runs on the back); a typhoon-toppled billboard (the frame bends, the panels shatter into modules); Hamazakibashi JCT
   (a red dot-matrix board over the green signs). Borrowed, not copied: Blade Runner's giant eye advert and Ghost in the Shell's wire-
   frame net (an eye with the city in it; a green vector flythrough), Kirokaze's held frames.
   Reduced motion: no shake, no glitch flicker (the picture changes at most every 380 ms, the static is a still pattern), fewer sparks
   and less debris. */
"use strict";
(() => {
  const DIR = MECH.director, CARD = { kanji:'大画面', name:'SCREENFALL', sub:'ride round its corner', col:'#ff4ad0' };
  if(DIR) DIR.register('screenfall', { tier:'hero', roads:['shuto'], card:CARD });
  // the screen, in half-road widths: top corners at x = +-SW, height HT; SH tall; hung from a sky-bridge at BR0..BR1 between towers at +-TX
  const SW = 2.6, HT = 6.0, SH = 4.17, BR0 = 6.4, BR1 = 7.1, TX = 3.2, CLR = .42;   // (SH is chosen so the corner lands at the centre line + 0.3)
  const CRD = -600, TEL = -335, LURCH = -250, FALL0 = -195, LAND = -95, BOARD = 420;   // the card (up to ~3.5 s) plays before the screen is even in view: it must never cover the hazard
  const DEP = 3;   // the cabinet's depth, in segments (~1 m): its back plane is projected from segment A + DEP
  const LW = 96, LH = 77, MW = 16, MH = 11, NMX = 6, NMY = 7;   // the LED raster and its cabinet modules
  const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const pSeg = () => (position + PZ) / SEG;
  let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;   // the sparks' own generator (the road's Math.random sequence stays untouched)
  const plans = [];
  const S = { board:null };
  // ---------------------------------------------------------------- the geometry of the swing (in the screen's own plane, facing the road)
  // F: the side whose hangers snap (+1 right). The screen turns about its other top corner P = (-F SW, HT); a = 0 hanging .. A_REST lying.
  // corners in the order TL, TR, BR, BL as seen with F = +1 (mirrored for F = -1)
  const CN = new Float64Array(8);
  function corners(F, a){ const px = -F * SW, ph = HT, c = Math.cos(a), s = Math.sin(a);
    const L = [[-SW, HT], [SW, HT], [SW, HT - SH], [-SW, HT - SH]];
    for(let k = 0; k < 4; k++){ const vx = F * L[k][0] - px, vy = L[k][1] - ph, rx = vx * c + F * vy * s, ry = -F * vx * s + vy * c; CN[k * 2] = px + rx; CN[k * 2 + 1] = ph + ry; } return CN; }
  // the rest angle: the snapped side's lower corner touches the road
  let A_REST = 0; { for(let k = 0; k < 2000; k++){ const a = k / 2000 * 1.2; corners(1, a); if(CN[5] <= .02){ A_REST = a; break; } } }
  // the height of the slab's underside above lane x (side F), or 99 where it is not over the road
  function hAt(F, a, x){ corners(F, a); const cx0 = CN[4], cy0 = CN[5], bx = CN[6], by = CN[7]; const lo = Math.min(cx0, bx), hi = Math.max(cx0, bx); if(x < lo || x > hi) return 99;
    return cy0 + (by - cy0) * (x - cx0) / (bx - cx0); }

  // ---------------------------------------------------------------- the adverts: painted at warm-up into one atlas (palette indices)
  const PAL = ['#05040a', '#0c1030', '#16246a', '#2a52c8', '#5ab4ff', '#e8f6ff', '#ffffff', '#ffd84a', '#ff8a2a', '#e8203a', '#7a0a1e', '#ff4ad0', '#8a1a8a', '#2adf80',
    '#0a6a3a', '#4ff0ff', '#0a5a6a', '#a8ffb0', '#7a7a86', '#3a3a46', '#c8ccd8', '#f4d8c0', '#b07a60', '#5a3428', '#0e3a2a', '#1a1a28', '#ffb8e8', '#3a0a3a'];
  // programmes: [painter, first atlas frame, frames, fps (frames per second of the loop), hold (s)]; plus bars and three static frames
  const PROG = [{ id:'news', n:8, fps:5, hold:5.6 }, { id:'soda', n:16, fps:6, hold:4.6 }, { id:'eye', n:16, fps:5, hold:5.2 }, { id:'net', n:12, fps:8, hold:4.4 }];
  let NF = 0; for(const p of PROG){ p.f0 = NF; NF += p.n; } const F_BARS = NF, F_STAT = NF + 1; NF += 4;
  const AC = 8, AW = LW * AC, AH = LH * Math.ceil(NF / AC);   // atlas: 8 frames a row
  const FAVG = [];   // each frame's average colour ('r,g,b', boosted toward its brightest) for the light it throws
  let ATL = null, AX = null, IMG = null, IB = null, PRGB = null, READY = false;
  // painting helpers (index buffer IB, LW x LH)
  const PS = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if(x >= 0 && x < LW && y >= 0 && y < LH) IB[y * LW + x] = c; };
  const RF = (x, y, w, h, c) => { for(let j = Math.max(0, y); j < Math.min(LH, y + h); j++) for(let i = Math.max(0, x); i < Math.min(LW, x + w); i++) IB[j * LW + i] = c; };
  const F3 = { A:'010101111101101', C:'011100100100011', D:'110101101101110', E:'111100110100111', H:'101101111101101', I:'111010010010111', K:'101101110101101', L:'100100100100111',
    M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', R:'110101110101101', S:'011100010001110', T:'111010010010010', V:'101101101101010', W:'101101111111101',
    Y:'101101010010010', 0:'111101101101111', 1:'010110010010111', 2:'111001111100111', 3:'111001111001111', 4:'101101111001001', 5:'111100111001111', 6:'111100111101111',
    7:'111001001010010', 8:'111101111101111', 9:'111101111001111', ':':'000010000010000', '.':'000000000000010', '-':'000000111000000', '¥':'101010111010111', ' ':'000000000000000' };
  function f3(str, x, y, c, sc){ sc = sc || 1; for(let k = 0; k < str.length; k++){ const g = F3[str[k]] || F3[' ']; for(let p = 0; p < 15; p++) if(g[p] === '1') RF(x + (k * 4 + p % 3) * sc, y + ((p / 3) | 0) * sc, sc, sc, c); } }
  // DotGothic16 text, thresholded once per string at warm-up (cached; cleared and repainted when the font arrives)
  const TXC = new Map();
  function txtBits(str, size){ const key = size + '|' + str; let t = TXC.get(key); if(t) return t; const T = S.T, k = T.getContext('2d'); k.clearRect(0, 0, T.width, T.height);
    k.font = size + 'px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#fff'; k.fillText(str, 0, 0); const w = Math.min(T.width, Math.ceil(k.measureText(str).width) + 1), h = Math.min(T.height, size + 2);
    const d = k.getImageData(0, 0, w, h).data, b = new Uint8Array(w * h); for(let o = 0; o < w * h; o++) b[o] = d[o * 4 + 3] > 110 ? 1 : 0; t = { w, h, b }; TXC.set(key, t); return t; }
  function TXT(str, size, x, y, c, sh){ const t = txtBits(str, size); for(let j = 0; j < t.h; j++) for(let i = 0; i < t.w; i++) if(t.b[j * t.w + i]){ if(sh !== undefined) PS(x + i + 1, y + j + 1, sh); } for(let j = 0; j < t.h; j++) for(let i = 0; i < t.w; i++) if(t.b[j * t.w + i]) PS(x + i, y + j, c); }
  const H2 = (a, b) => hash(a * 12.9898 + b * 78.233);
  const BAY4 = [0, .5, .125, .625, .75, .25, .875, .375, .1875, .6875, .0625, .5625, .9375, .4375, .8125, .3125];   // a 4x4 ordered dither
  // 1. late news: the red 速報 strip, a radar map with the typhoon turning, the forecast track, the ticker band (live, see drawPanel)
  function pNews(f){ RF(0, 0, LW, LH, 1);
    for(let y = 18; y < 64; y++) for(let x = 0; x < LW; x++){ if((x * 7 + y * 3) % 9 === 0) PS(x, y, 2); if(x % 16 === 8 && y % 2 === 0) PS(x, y, 2); if(y % 12 === 6 && x % 2 === 0) PS(x, y, 2); }   // sea, the grid of latitudes and longitudes
    for(let y = 18; y < 64; y++) for(let x = 0; x < LW; x++){ const d = ((x - 4) * 42 + (y - 62) * 80) / 90.4, w = 5 + 3 * Math.sin(x * .21) + 2 * Math.sin(x * .07 + y * .1); if(Math.abs(d) < w && x < 84) PS(x, y, Math.abs(d) > w - 1.2 ? 13 : 14); }   // an island arc (generic, no real coast)
    const tx = 64 - f * .4, ty = 42 - f * .3, ph = f / 8 * Math.PI * 2;
    for(let y = 18; y < 64; y++) for(let x = 0; x < LW; x++){ const dx = x - tx, dy = y - ty, r = Math.hypot(dx, dy); if(r > 17) continue; const th = Math.atan2(dy, dx), v = Math.sin(2 * th - r * .42 + ph);
      if(r < 2.2) PS(x, y, 1); else if(v > .35) PS(x, y, r < 8 ? 6 : 20); else if(v > -.05 && r < 13) PS(x, y, r < 9 ? 4 : 3); }   // the typhoon: two arms turning round a clear eye
    for(let k = 1; k < 7; k++){ const qx = tx + k * 3.2, qy = ty - k * 3.4; if((k + f) % 2) PS(qx, qy, 7); }   // the forecast track, dashed
    RF(66, 20, 24, 15, 0); RF(66, 20, 24, 1, 6); RF(66, 34, 24, 1, 6); RF(66, 20, 1, 15, 6); RF(89, 20, 1, 15, 6); TXT('台風', 12, 69, 21, 6);   // the label box
    RF(0, 0, LW, 17, 9); RF(0, 17, LW, 1, 10); RF(0, 0, LW, 1, 26); TXT('速報', 16, 3, 0, 6, 10); f3('LIVE', 44, 2, (f & 2) ? 6 : 26); f3('23:41', 72, 10, 7);   // the strip
    RF(0, 64, LW, 13, 25); RF(0, 64, LW, 1, 4); }
  // 2. a soda can turning in the dark, bubbles rising, its name; then the card
  function pSoda(f){ for(let y = 0; y < LH; y++) RF(0, y, LW, 1, y < 22 ? 0 : y < 48 ? ((y & 1) && y < 26 ? 0 : 1) : 2);
    if(f < 12){ const ph = f / 12, x0 = 16, cw = 26, y0 = 12, y1 = 68;
      for(let x = 0; x < cw; x++){ const nx = (x + .5) / cw * 2 - 1, u = ((Math.asin(nx) / Math.PI + ph) % 1 + 1) % 1, lt = 1 - Math.abs(nx + .3);
        for(let y = y0; y < y1; y++){ let c;
          if(y < y0 + 4) c = y === y0 ? 18 : lt > .6 ? 20 : 18; else if(y > y1 - 4) c = lt > .6 ? 18 : 19;
          else if(Math.abs(y - (42 + 4 * Math.sin(u * Math.PI * 4))) < 2) c = 6;
          else if(u > .08 && u < .3 && y > 18 && y < 36) c = (Math.abs(u - .19) < .03 && y > 21 && y < 33) || (y > 25 && y < 28 && u > .12 && u < .26) ? 6 : 11;
          else c = lt > .86 ? 5 : lt > .45 ? 15 : 16;
          PS(x0 + x, y, c); } }
      for(let k = 0; k < 14; k++){ const bx = 6 + (k * 37) % 84, by = 74 - ((f * 4 + k * 11) % 66); if(bx > 14 && bx < 44) continue; PS(bx, by, 4); PS(bx + 1, by, 15); PS(bx, by + 1, 15); }
      TXT('アオイ', 16, 46, 14, 15, 16); f3('SODA', 50, 36, 6, 2); f3('¥100', 52, 52, 7); if(f % 6 < 2){ PS(23, 16, 6); PS(22, 17, 6); PS(24, 17, 6); PS(23, 18, 6); }
    } else { RF(0, 0, LW, LH, f === 12 ? 26 : 0); if(f > 12){ TXT('アオイ', 16, 25, 18, 15, 16); f3('SODA', 32, 42, 6, 2); RF(18, 56, 60, 1, 11); const sp = f & 1; PS(20 + sp * 50, 14, 6); PS(76 - sp * 52, 50, 6); } } }
  // 3. a contact-lens advert: an eye in the dark, the city's lights in its iris; it blinks; the card
  function pEye(f){ RF(0, 0, LW, LH, 0); if(f >= 15){ TXT('ミライ光学', 16, 8, 26, 6); RF(8, 46, 80, 1, 15); f3('MIRAI', 36, 52, 4); return; }
    const cx0 = 48, cy0 = 38, open = f === 12 ? .45 : f === 13 ? .06 : f === 14 ? .5 : 1, pr = 4.4 + 1.2 * Math.sin(f / 15 * Math.PI * 2);
    for(let y = 0; y < LH; y++) for(let x = 0; x < LW; x++){ const ex = (x - cx0) / 47, ey = (y - cy0) / 26, e2 = ex * ex + ey * ey; if(e2 > 1) continue;
      const dx = x - cx0, q = 1 - (dx / 36) * (dx / 36), bay = BAY4[(y & 3) * 4 + (x & 3)], sk = (1 - e2) * 1.25 + dx / 47 * .35 - (y - cy0) / 26 * .12;   // the skin lit from the right, ordered-dithered into the dark
      let c = sk + bay * .22 < .3 ? 0 : sk + bay * .22 < .62 ? 23 : sk + bay * .22 < 1.02 ? 22 : 21;
      { const yb = cy0 - 25 + 7 * (dx / 40) * (dx / 40) - dx * .04; if(y >= yb && y < yb + 3 + (dx < -10 ? 1 : 0) && Math.abs(dx) < 36 && (x + y) % 3 !== 0) c = (y === Math.floor(yb) && (x & 1)) ? 23 : 0; }   // the brow
      if(q > 0){ const yU = cy0 - 15 * q * open, yL = cy0 + 10 * q; if(y > yU && y < yL){ c = y < yU + 2 ? 19 : 20; if(Math.abs(dx) > 26) c = 18;
          const ix = x - cx0 - 2, iy = y - cy0, r = Math.hypot(ix, iy); if(r < 13){ const ang = Math.atan2(iy, ix); c = r > 11.5 ? 12 : r > 7 ? (H2(Math.floor(ang * 9), 3) < .4 ? 4 : 3) : r > pr ? 15 : 0;
            if(r > pr && r < 11 && iy > 4 && iy < 9 && (ix * 3 + iy) % 4 === 0) c = (ix & 1) ? 7 : 8; }   // the city's lights in the iris
          if(y >= yL - 1) c = 21; }
        if(Math.abs(y - yU) < 1.2 && q > .05) c = 0; if(y < yU && y > yU - 3 && Math.abs(dx) < 30 && (x % 4 === 0) && y < yU - (x % 8 ? 1 : 2)) c = 0; } PS(x, y, c); }
    if(open > .9){ RF(cx0 - 3, cy0 - 6, 3, 2, 6); PS(cx0 + 7, cy0 + 4, 6); } f3('MIRAI', 72, 70, 19); }
  // 4. the net: a green wireframe flythrough over a perspective grid, towers rushing by, data falling at the edges, 電脳
  function pNet(f){ RF(0, 0, LW, LH, 0); const hy = 30, ph = f / 12;
    for(let k = 0; k < 22; k++){ const z = k + 1 - ph; if(z < .25) continue; const y = Math.round(hy + 44 / z); if(y < LH) RF(0, y, LW, 1, z < 4 ? 13 : 14); }
    for(let k = -9; k <= 9; k++) for(let y = hy + 1; y < LH; y++) PS(48 + k * (y - hy) * 1.5, y, 14);
    RF(0, hy, LW, 1, 17);
    for(let m = 0; m < 6; m++){ const z = ((m * 2.3 + 12 - ph * 4) % 12) + .6, lat = (m & 1 ? 1 : -1) * (3 + (m % 3) * 2), hgt = 3 + (m * 7) % 5, sx = 48 + lat * 30 / z, w = 10 / z, top = hy + 44 / z - hgt * 30 / z, bot = hy + 44 / z;
      if(bot > LH + 20) continue; const c = z < 3 ? 17 : 13; for(let y = Math.max(0, top); y <= Math.min(LH - 1, bot); y++){ PS(sx - w, y, c); PS(sx + w, y, c); } for(let x = sx - w; x <= sx + w; x++){ PS(x, top, c); if((Math.floor(x) & 1) === 0) PS(x, (top + bot) / 2, 14); } }
    for(const cx1 of [3, 9, 86, 92]) for(let j = 0; j < 5; j++){ const y = (j * 9 + f * 3 + cx1 * 5) % 36; for(let p = 0; p < 6; p++) if(H2(cx1 + j, p) < .6) PS(cx1 + (p % 2), y + (p >> 1), j === 0 ? 17 : 13); }
    TXT('電脳', 16, 30, 3, 6, 14); f3('NET', 64, 8, 15, 2); }
  function pBars(){ const BC = [20, 7, 15, 13, 11, 9, 3]; for(let x = 0; x < LW; x++){ const b = Math.floor(x / LW * 7); RF(x, 0, 1, 52, BC[b]); RF(x, 52, 1, 8, [3, 0, 11, 0, 15, 0, 20][b]); RF(x, 60, 1, 17, x < 18 ? 2 : x < 34 ? 6 : x < 50 ? 12 : 0); } }
  function pStatic(k){ for(let y = 0; y < LH; y++) for(let x = 0; x < LW; x++){ const h = H2(x + k * 131, y * 1.7 + k * 7); IB[y * LW + x] = h < .28 ? 18 : h < .52 ? 19 : h < .58 ? 20 : h < .6 ? 6 : 0; } }
  const PAINT = [pNews, pSoda, pEye, pNet];
  function commit(fi){ const ax = (fi % AC) * LW, ay = Math.floor(fi / AC) * LH, d = IMG.data; let r = 0, g = 0, b = 0, mr = 0, mg = 0, mb = 0, mx = -1;
    for(let y = 0; y < LH; y++) for(let x = 0; x < LW; x++){ const c = PRGB[IB[y * LW + x]], o = ((ay + y) * AW + ax + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; r += c[0]; g += c[1]; b += c[2]; const l = c[0] + c[1] + c[2]; if(l > mx){ mx = l; mr = c[0]; mg = c[1]; mb = c[2]; } }
    const n = LW * LH; FAVG[fi] = Math.round(r / n * .6 + mr * .4) + ',' + Math.round(g / n * .6 + mg * .4) + ',' + Math.round(b / n * .6 + mb * .4);
    AX.putImageData(IMG, 0, 0, ax, ay, LW, LH); }
  function* paintAll(){ for(let p = 0; p < PROG.length; p++) for(let f = 0; f < PROG[p].n; f++){ PAINT[p](f); commit(PROG[p].f0 + f); yield; }
    pBars(); commit(F_BARS); yield; for(let k = 0; k < 3; k++){ pStatic(k); commit(F_STAT + k); yield; } READY = true; }
  // the live ticker under the news (12 px DotGothic, scrolls a LED at a time), one canvas made at warm-up
  const TICK = 'ニュース速報　首都高速 都心環状線 今夜 快晴　台風２３号 北上中　東京 23:41　交通情報 渋滞なし　';
  function paintTick(){ const T = S.tk, k = T.getContext('2d'); k.fillStyle = PAL[25]; k.fillRect(0, 0, T.width, T.height); k.font = '12px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#ffffff';
    const w = Math.ceil(k.measureText(TICK).width); S.tickW = Math.max(LW, Math.min(T.width - LW, w)); k.fillText(TICK, 0, 0); k.fillText(TICK, S.tickW, 0);
    const d = k.getImageData(0, 0, T.width, T.height); for(let o = 0; o < d.data.length; o += 4){ const on = d.data[o] > 140; d.data[o] = on ? 255 : 26; d.data[o + 1] = on ? 248 : 26; d.data[o + 2] = on ? 232 : 40; d.data[o + 3] = 255; } k.putImageData(d, 0, 0); }

  // ---------------------------------------------------------------- the panel: composed per frame at n canvas px per LED, then drawn rotated
  const NMAX = 6; let PN = null, PK = null, SC = null, SK = null; const GPAT = [];
  function mkPatterns(){ for(let n = 2; n <= NMAX; n++){ const t = document.createElement('canvas'); t.width = n; t.height = n; const k = t.getContext('2d'), d = k.createImageData(n, n);
      for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){ const o = (y * n + x) * 4, gap = x === n - 1 || y === n - 1; let r = 255, g = 255, b = 255;
        if(n < 4){ if(gap){ r = g = b = n === 2 ? 170 : 110; } if(x === n - 1 && y === n - 1){ r = g = b = n === 2 ? 130 : 70; } }
        else if(gap){ r = g = b = 34; } else { const s = Math.floor(x * 3 / (n - 1)); r = s === 0 ? 255 : 120; g = s === 1 ? 255 : 120; b = s === 2 ? 255 : 120; if(y === 0){ r = Math.min(255, r + 40); g = Math.min(255, g + 40); b = Math.min(255, b + 40); } }
        d.data[o] = r; d.data[o + 1] = g; d.data[o + 2] = b; d.data[o + 3] = 255; }
      k.putImageData(d, 0, 0); GPAT[n] = PK.createPattern(t, 'repeat'); } }   // (made at warm-up; one LED per tile, the gap on its right and bottom, RGB sub-pixels from 4 px)
  // the module state for module (mx, my): 0 fine, 1 dark, 2 stuck on a colour, 3 slipped (its rows shifted); p is the dying progress 0..1
  function modState(w, mx, my, p){ const h = hash(mx * 7.31 + my * 13.17 + w.A * .01); if(w.g === 4) return h < .74 ? 1 : h < .84 ? 2 : h < .9 ? 3 : 0; if(p <= 0) return 0;
    return h < p * .22 ? 1 : h < p * .28 ? 2 : h < p * .36 ? 3 : 0; }
  // compose the panel for this frame into PN (LW*n x LH*n), n = canvas px per LED
  function drawPanel(w, n, now){ const pw = LW * n, ph = LH * n, k = PK, step = reduce ? Math.floor(now / 380) : Math.floor(now / 90); k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1; k.imageSmoothingEnabled = false;
    let fi = w.fi, tear = w.g === 1; const fx = (fi % AC) * LW, fy = Math.floor(fi / AC) * LH;
    if(w.g === 4){ k.fillStyle = '#07060c'; k.fillRect(0, 0, pw, ph); }
    else if(tear){ k.fillStyle = '#000'; k.fillRect(0, 0, pw, ph);
      for(let b = 0; b < NMY; b++){ const hv = hash(b * 5.3 + step * 1.7 + w.A), o = Math.round((hash(b + step * 3.3) - .5) * 26 * w.p + (hv < .3 ? (hv - .15) * 40 : 0)), src = hv > .86 ? F_BARS : fi, sx = (src % AC) * LW, sy = Math.floor(src / AC) * LH + b * MH;
        const a = Math.max(0, -o), wd = LW - Math.abs(o); if(wd > 0) k.drawImage(ATL, sx + a, sy, wd, MH, Math.max(0, o) * n, b * MH * n, wd * n, MH * n);
        if(o){ k.fillStyle = hv < .5 ? '#ff2ad0' : '#2af0ff'; k.fillRect(o > 0 ? 0 : (LW + o) * n, b * MH * n, Math.abs(o) * n, n); } } }
    else k.drawImage(ATL, fx, fy, LW, LH, 0, 0, pw, ph);
    if(fi >= PROG[0].f0 && fi < PROG[0].f0 + PROG[0].n && w.g !== 4 && !tear && S.tk){ const off = Math.floor((reduce ? Math.floor(now / 500) * 2 : now / 70) % S.tickW); k.drawImage(S.tk, off, 0, LW, 12, 0, 65 * n, pw, 12 * n); }   // the news ticker, live
    // the cabinets: a calibration tint per module (real walls never match), dead / stuck / slipped modules as the wall dies
    for(let my = 0; my < NMY; my++) for(let mx = 0; mx < NMX; mx++){ const st = modState(w, mx, my, w.p), x0 = mx * MW * n, y0 = my * MH * n, mw = MW * n, mh = Math.min(MH, LH - my * MH) * n;
      if(st === 1){ const hv = hash(mx * 3.1 + my); k.fillStyle = '#0a0a10'; k.fillRect(x0, y0, mw, mh);
        if(hv < .5){ k.fillStyle = '#1c1e28'; for(let q = 0; q < MW; q++) k.fillRect(x0 + q * n, y0 + Math.floor(q * (MH - 1) / (MW - 1)) * n, n, n); k.fillStyle = '#262833'; k.fillRect(x0 + 5 * n, y0 + 4 * n, 5 * n, 3 * n); k.fillStyle = '#2adf80'; k.fillRect(x0 + 9 * n, y0 + 4 * n, n, n); k.fillStyle = '#141418'; k.fillRect(x0 + 12 * n, y0, n, mh); }   // the cabinet behind a fallen module
        else { k.fillStyle = '#16161e'; k.fillRect(x0, y0, mw, n); k.fillRect(x0, y0, n, mh); if(hv > .8){ k.fillStyle = '#5a5a66'; for(let q = 0; q < 6; q++) k.fillRect(x0 + (4 + q * 2) * n, y0 + (2 + (q * 5) % 7) * n, n, n); } }   // a dead module (now and then cracked)
        continue; }
      if(st === 2){ const flick = reduce || w.g === 4 ? 1 : (step + mx + my) % 5 ? 1 : .4; k.globalAlpha = (w.g === 4 ? .7 : .5) * flick; k.fillStyle = PAL[[11, 13, 15, 9, 6][Math.floor(hash(mx + my * 9.7) * 5)]]; k.fillRect(x0, y0, mw, mh); k.globalAlpha = 1; continue; }
      if(st === 3){ const o = (1 + Math.floor(hash(mx * 9 + my + step * .0) * 5)) * n; k.drawImage(PN, x0, y0, mw - o, mh, x0 + o, y0, mw - o, mh); k.fillStyle = '#05040a'; k.fillRect(x0, y0, o, mh); continue; }
      const t = hash(mx * 1.93 + my * 4.71); if(t < .35 || t > .7){ k.globalAlpha = .05 + Math.abs(t - .52) * .12; k.fillStyle = t < .5 ? '#000000' : '#fff4e0'; k.fillRect(x0, y0, mw, mh); k.globalAlpha = 1; } }
    if(w.g === 4){ k.globalAlpha = 1; for(let r = 0; r < LH; r += 2){ const a = .12 + .3 * (r / LH); k.globalAlpha = a; k.fillStyle = '#4a3424'; k.fillRect(0, r * n, pw, n); } k.globalAlpha = .9; k.fillStyle = '#20222c'; for(let mx = 1; mx < NMX; mx++) k.fillRect(mx * MW * n - n, 0, n, ph); for(let my = 1; my < NMY; my++) k.fillRect(0, my * MH * n - n, pw, n); k.globalAlpha = 1; }
    if(w.g === 4) for(let q = 0; q < 26; q++){ const h = hash(q * 7.7 + w.A); const lx = Math.floor(h * LW), ly = Math.floor(hash(q * 3.1 + w.A) * LH); k.fillStyle = PAL[[9, 8, 13, 15, 18][q % 5]]; k.fillRect(lx * n, ly * n, n, n); }   // stray LEDs still lit on the dead wall
    // module seams, then the LED grid (a multiply pattern: gaps from 2 px per LED, RGB sub-pixels from 4)
    if(n >= 2){ k.fillStyle = '#000000'; k.globalAlpha = n >= 3 ? .55 : .3; for(let mx = 1; mx < NMX; mx++) k.fillRect(mx * MW * n - 1, 0, 1, ph); for(let my = 1; my < NMY; my++) k.fillRect(0, my * MH * n - 1, pw, 1); k.globalAlpha = 1;
      k.globalCompositeOperation = 'multiply'; k.globalAlpha = n >= 4 ? .8 : .6; k.fillStyle = GPAT[Math.min(NMAX, n)]; k.fillRect(0, 0, pw, ph); k.globalCompositeOperation = 'source-over'; k.globalAlpha = 1; }
    // the refresh roll: a faint bright band moving down (not on the dead wall)
    if(w.g !== 4 && n >= 2 && !reduce){ const ry = Math.floor(((now / 2600) % 1) * LH) * n; k.globalAlpha = .06; k.fillStyle = '#ffffff'; k.fillRect(0, ry, pw, Math.min(ph - ry, 9 * n)); k.globalAlpha = 1; } }

  // ---------------------------------------------------------------- sound
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function crack(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.08, 3200, .14, t0); M.noise(.3, 1200, .1, t0 + .02); M.tone(90, .5, { type:'square', v:.04, at:t0 }); }
  function sizzle(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.9, 4200, .05 * v, t0); M.noise(.5, 2400, .04 * v, t0 + .1); }
  function creak(){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(140, 1.1, { type:'sawtooth', v:.035, at:t0, fuzz:true }); M.tone(118, .9, { type:'sawtooth', v:.03, at:t0 + .25, fuzz:true }); }
  function slam(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.4, 90, .24, t0); M.tone(42, .8, { type:'sine', v:.14, at:t0 }); M.noise(.6, 2600, .12, t0 + .03); M.noise(1.2, 5200, .06, t0 + .1); }
  function hum(){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(60, 1.6, { type:'sawtooth', v:.02, at:t0 }); }
  // ---------------------------------------------------------------- placement: once per Shuto visit, on plain deck (canyon or towers)
  // the approach is eased straight (so the screen hangs dead ahead through the telegraph) and reserved for set pieces; both are applied to
  // each segment as it is placed (plan() runs 470+ segments before the screen, when those segments may not exist yet: the old loops over
  // segs[] there did nothing in the demo, so the screen stood off to the side of a bend while it tore)
  function shape(w, j, sg){ if(!sg || sg.sfE === w.A) return; if(j >= w.A - 640 && j <= w.A + 60) sg.skRes = 1;
    if(j >= w.A - 300 && j <= w.A + 40){ sg.sfE = w.A; const k = sm((j - (w.A - 300)) / 30) * (1 - sm((j - (w.A + 10)) / 30)); sg.curve *= 1 - k; } }
  function plan(i, s, L){ if(!L || L.key !== 'shuto' || LANDS[s.land].key !== 'shuto') return; const ls = typeof landStart === 'number' ? landStart : 0; if(i - ls !== 200) return;
    const E = ENV.shuto; if(!E || !E.zoneAt) return; const z = zoneOfSeg(i), zEnd = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9;
    // a zone that has not begun yet may be given up for the screen's stretch (E.claim turns it to canyon); one already being placed may not
    const plain = j => { const Z = E.zoneAt(j); return Z.k === 'canyon' || Z.k === 'towers' || (Z.k === 'trench' && Z.a > i + 2); };   // (only a trench not begun yet may be given up: never the junction or the river)
    // the screen and its fall stay on plain deck (no junction decks, no open railing), clear of a fork's window and of checkpoints
    const ok = A => { if(A + 160 > zEnd - 40) return false; if(window.inForkWindow && inForkWindow(A + CRD - 20, A + 120)) return false;
      for(let k = 0; k < gates.length; k++){ const g = gates[k]; if(g >= A - 320 && g <= A + 90) return false; }
      for(let j = A - 170; j <= A + 60; j += 6) if(!plain(j)) return false;
      for(let j = A + CRD - 40; j <= A + 60; j += 4) if(segs[j] && segs[j].spjP) return false;   // no landmark jump (setpiece/jump.js) under the card or the fall
      return true; };
    const Ts = DIR && DIR.target ? DIR.target('screenfall', i) : null;   /* demo mode: the valid screen nearest the authored one */
    let best = -1; for(let A = i + 470; A + 200 < zEnd; A += 4) if(ok(A)){ if(Ts == null){ best = A; break; } if(best < 0 || Math.abs(A - Ts) < Math.abs(best - Ts)) best = A; }
    if(best < 0) return; if(DIR && !DIR.request('screenfall', { tier:'hero', seg:best })) return; if(E.claim) E.claim(best - 168, best + 60);   // (the same stretch the plain check covers: it must never reach into a junction or the river)
    const w = add(best); for(let j = best - 640; j <= best + 60; j++) if(j > i + 2) shape(w, j, segs[j]); }   // (segments already generated ahead; the rest as they are placed)
  function add(A, F){ const w = { A, F:F || (hash(A * .71) < .5 ? -1 : 1), g:0, a:0, p:0, fi:0, lastD:null, cut:null, swept:false, landed:false, hit:false, done:false, called:false, spT:0, tLur:-1, tLand:-1 };
    if(ENV.shuto && ENV.shuto.mkBld){ w.tw = [-1, 1].map(sd => ENV.shuto.mkBld({ side:sd, b0:A - 26, len:60, x0:TX, h:sd === w.F ? 13.5 : 16.5, st:'glass', plate:sd < 0, seed:A * .37 + sd })); }
    plans.push(w); if(plans.length > 6) plans.shift(); return w; }
  const active = p => { for(const w of plans) if(!w.done && p > w.A - 900 && p < w.A + 160) return w; return null; };
  // ---------------------------------------------------------------- particles (world space, pooled): 0 spark, 1 dust, 2 a broken module, 3 a glint
  const SPK = []; for(let k = 0; k < 220; k++) SPK.push({ on:false, k:0, z:0, x:0, h:0, vz:0, vx:0, vh:0, t:0, life:0, sz:0, c:0 });
  function emit(n, z, X, h, up, spread, kind){ kind = kind || 0; for(let q = 0; q < n; q++){ let p = null; for(const o of SPK) if(!o.on){ p = o; break; } if(!p) return; p.on = true; p.k = kind; p.z = z + (rnd() - .5) * 1.2; p.x = X + (rnd() - .5) * (spread || .2); p.h = h;
      p.vz = -rnd() * 4; p.vx = (rnd() - .5) * 2.2; p.vh = up * (.3 + rnd() * 1.6); p.t = 0; p.life = .7 + rnd() * 1; p.c = Math.floor(rnd() * 5);
      if(kind === 1){ p.vz = -rnd() * 1.5; p.vx = (rnd() - .5) * 1.4; p.vh = .15 + rnd() * .35; p.life = 1.4 + rnd() * 1.4; p.sz = .12 + rnd() * .14; }
      else if(kind === 2){ p.vz = -rnd() * 3; p.vx = (rnd() - .5) * 3; p.vh = up * (.6 + rnd() * 1.6); p.life = 1.6 + rnd() * 1.2; p.sz = .025 + rnd() * .05; } } }
  function sparks(dt){ for(const p of SPK){ if(!p.on) continue; p.t += dt; if(p.t > p.life){ p.on = false; continue; } p.z += p.vz * dt; p.x += p.vx * dt; p.h += p.vh * dt;
      if(p.k === 1){ p.vh *= 1 - dt * .8; p.vx *= 1 - dt * .9; p.vz *= 1 - dt; p.sz += dt * .22; continue; }
      p.vh -= 7 * dt; if(p.h < 0 && p.vh < 0){ p.h = 0; p.vh *= p.k === 2 ? -.25 : -.3; p.vx *= .6; p.vz *= .5; } } }
  // ---------------------------------------------------------------- the module
  // the card beat: every occurrence shows its card (Kellan's rule), the anime cut-in when it has one, else the director's card
  function showCard(w, d, late){ if(!DIR || !DIR.cine) return; let card = CARD;   // (late: the rider was airborne from -600 on; the card still shows, Kellan's rule, but placement keeps landmark jumps away so this should not happen)
    if(card && MECH.cutin && MECH.cutin.show){ let shown = false; try{ shown = MECH.cutin.show('screenfall') !== false && !MECH.cutin.skipped; }catch(e){} if(shown) card = null; }
    // two cines: a short one carries the card (a moment card is held while its cine lives, so it is gone long before the fall), a long
    // one without a card carries the letterbox, the music duck and the guard (traffic moved off the zone) until you are past the screen
    if(card) DIR.cine({ letterbox:false, dur:2.2, card });
    w.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, duck:.4, shake:reduce ? 0 : 3, guard:{ ahead:Math.max(60, -d + 60), behind:6 }, dur:0 }); }
  function* warmSteps(){ if(!S.T){ S.T = document.createElement('canvas'); S.T.width = 240; S.T.height = 24; } if(!S.tk){ S.tk = document.createElement('canvas'); S.tk.width = 1100; S.tk.height = 12; }
    if(!ATL){ ATL = document.createElement('canvas'); ATL.width = AW; ATL.height = AH; AX = ATL.getContext('2d'); IMG = AX.createImageData(AW, AH); IB = new Uint8Array(LW * LH); PRGB = PAL.map(c => hx(c)); }
    if(!PN){ PN = document.createElement('canvas'); PN.width = LW * NMAX; PN.height = LH * NMAX; PK = PN.getContext('2d'); mkPatterns(); }
    if(typeof cv !== 'undefined' && cv.width && (!SC || SC.width < Math.ceil(cv.width / PX) + 2 || SC.height < Math.ceil(cv.height / PX) + 2)){ SC = document.createElement('canvas'); SC.width = Math.ceil(cv.width / PX) + 2; SC.height = Math.ceil(cv.height / PX) + 2; SK = SC.getContext('2d'); }
    yield; paintTick(); yield; yield* paintAll();
    if(!S.board){ S.board = document.createElement('canvas'); S.board.width = 64; S.board.height = 14; } paintBoard(); yield;
    if(document.fonts && document.fonts.load && !warmSteps.fontHook){ warmSteps.fontHook = true; document.fonts.load('16px DotGothic16', '速報台風アオイミライ光学電脳落下物注意大画面' + TICK).then(() => { try{ TXC.clear(); for(const _ of paintAll()); paintTick(); paintBoard(); if(MECH.arrival && MECH.arrival.momentWarm) MECH.arrival.momentWarm(CARD); }catch(e){} }).catch(() => {}); }
    try{ cx.save(); cx.globalAlpha = .004; cx.drawImage(S.board, 0, 0, 1, 1); cx.drawImage(ATL, 0, 0, 1, 1); cx.drawImage(PN, 0, 0, 1, 1); if(SC) cx.drawImage(SC, 0, 0, 1, 1); cx.restore(); }catch(e){} }   // upload every canvas once
  function paintBoard(){ const k = S.board.getContext('2d'); k.fillStyle = '#0a0806'; k.fillRect(0, 0, 64, 14); k.font = '12px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#ffb030'; k.fillText('落下物注意', 2, 1);
    const d = k.getImageData(0, 0, 64, 14); for(let o = 0; o < d.data.length; o += 4){ const on = d.data[o] > 120; d.data[o] = on ? 255 : 10; d.data[o + 1] = on ? 176 : 8; d.data[o + 2] = on ? 48 : 6; d.data[o + 3] = 255; } k.putImageData(d, 0, 0); }
  MECH.sp_screen = {
    plans, CARD, _hAt:hAt, _rest:() => A_REST,
    dbg(A, F){ return add(A, F); },   // testing: a screen at segment A (call before the road there is generated)
    get _atlas(){ return ATL; }, get _panel(){ return PN; }, _compose(w, n, now){ drawPanel(w, n, now); },   // (dev: the adverts' atlas and one composed panel, for contact sheets)
    warmSteps, warm(){ for(const _ of warmSteps()); },
    reset(){ for(const w of plans) if(w.cut){ w.cut.end(); w.cut = null; } for(const p of SPK) p.on = false; },   // (the plans are cleared when the road is rebuilt from segment 0: reset() runs after that)
    place(i, s, L){ if(i === 0){ for(const w of plans) if(w.cut) w.cut.end(); plans.length = 0; if(ENV.shuto && ENV.shuto.claim) ENV.shuto.claim(-1); }
      for(const w of plans){ shape(w, i, s);
        // the two towers the sky-bridge spans replace the road's street row there; nothing of the road's stands over the screen's segment
        if(w.tw && i >= w.A - 26 && i < w.A + 34){ s.sprites = s.sprites.filter(sp => !(sp.env === 'shuto' && ((sp.type === 'bld' && Math.abs(sp.x) < 7) || sp.type === 'gant' || sp.type === 'lamp' && Math.abs(i - w.A) < 3)));
          for(const B of w.tw) s.sprites.push({ env:'shuto', type:'bld', x:B.side * B.x0, k:i, b:B }); }
        if(i >= w.A - 8 && i < w.A + 8) s.hz = null;
        if(i >= w.A - 260 && i < w.A + 40) s.sprites = s.sprites.filter(sp => !(sp.env === 'shuto' && sp.type === 'gant' && sp.v >= 0));   // no sign gantry in front of the screen
        if(i >= w.A - 345 && i < w.A - 160) s.sprites = s.sprites.filter(sp => !(sp.env === 'shuto' && (sp.type === 'ramp' || sp.type === 'xd')));   // the telegraph (d -335 .. -250) must be seen: no junction ramp or deck across the view there (2026-11-24: in the demo the ramp hid the tear and the lurch)
        if(i === w.A - BOARD && ENV.shuto.zoneAt(i).k !== 'jct' && !(window.inForkWindow && inForkWindow(i - 10, i + 10))){ s.sprites.push({ env:'shuto', type:'gant', x:0, k:i, v:-1 }); s.scBoard = w; } }
      plan(i, s, L); },
    hitCar(){ const w = active(pSeg()); if(!w) return false; const d = pSeg() - w.A; return d > CRD - 10 && d < 20; },
    update(dt){ const p = pSeg(), w = active(p); sparks(dt); if(!w) return;
      const d = p - w.A, a = w.lastD === null ? d : w.lastD, X = v => a < v && d >= v; w.lastD = d;
      if(!w.swept && d > TEL - 40){ w.swept = true; for(let j = Math.floor(w.A - 40); j < w.A + 40; j++) if(segs[j]) segs[j].hz = null; }
      // the picture and the swing, both from d
      w.g = d < TEL ? 0 : d < TEL + 30 ? 1 : d < TEL + 55 ? 2 : d < LURCH ? 3 : d < LAND ? 1 : 4; w.p = clamp((d - TEL) / (LAND - TEL), 0, 1);
      const lurch = sm((d - LURCH) / 14) * .1, fall = d < FALL0 ? 0 : Math.pow(clamp((d - FALL0) / (LAND - FALL0), 0, 1), 2.2);
      w.a = Math.min(A_REST, lurch + (A_REST - lurch) * fall); if(d >= LAND) w.landed = true;
      // the frame on the wall: the programme by the clock (each hold, then the next), or bars / static while it fails
      { const now = performance.now(); if(w.g === 2) w.fi = F_BARS; else if(w.g === 3) w.fi = F_STAT + (reduce ? 0 : Math.floor(now / 120) % 3);
        else if(w.g === 1){ const q = PROG[d < LURCH ? 0 : 1]; w.fi = q.f0 + Math.floor(now / 1000 * q.fps) % Math.min(q.n, 12); }
        else { let t = now / 1000 + hash(w.A) * 40, tot = 0; for(const q of PROG) tot += q.hold; t %= tot; let pi = 0; while(t > PROG[pi].hold){ t -= PROG[pi].hold; pi++; } const q = PROG[pi]; w.fi = q.f0 + Math.min(q.n - 1, Math.floor(t * q.fps) % q.n); } }
      // beats
      if(X(TEL)){ crack(); sizzle(1); hum(); if(!reduce) shake = Math.max(shake || 0, 2); }
      if(d > TEL && d < LAND && state === 'play'){ w.spT -= dt; if(w.spT <= 0){ w.spT = reduce ? .25 : .06; const F = w.F; emit(reduce ? 2 : 4, w.A, F * SW * (d < LURCH ? .78 : 1), d < LURCH ? BR0 : HT, 1, .4); if(d > FALL0){ corners(F, w.a); emit(reduce ? 1 : 3, w.A, CN[2], CN[3], .5, .3); if(!reduce && rnd() < .12) emit(1, w.A, CN[2] * (.3 + rnd() * .6), CN[3] - 1, -.2, .5, 2); } } }
      if(X(CRD)) w.cardPend = true;
      if(w.cardPend && d < TEL - 20 && !(MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying())){ w.cardPend = false; showCard(w, d, false); }
      if(w.cardPend && d >= TEL - 20){ w.cardPend = false; showCard(w, d, true); }
      if(X(LURCH)){ crack(); creak(); sizzle(1.3); w.tLur = performance.now(); emit(reduce ? 1 : 3, w.A, w.F * SW * .7, HT - .4, .3, .5, 2); if(w.cut) w.cut.hit(reduce ? 0 : 4); else if(!reduce) shake = Math.max(shake || 0, 4); }
      if(X(FALL0)){ crack(); creak(); if(!w.called){ w.called = true; const txt = w.F > 0 ? 'KEEP RIGHT' : 'KEEP LEFT'; try{ const Ar = MECH.arrival; if(!(Ar && Ar.callout && Ar.callout(txt, { kanji:'避', sub:'角を回れ', col:'#ff4ad0', size:'s', hold:.2 }) !== false) && typeof floatText === 'function') floatText(txt, W / 2, H * .62, 22, '#ff4ad0'); }catch(e){} } }
      if(X(LAND)){ slam(); w.tLand = performance.now(); if(w.cut) w.cut.hit(reduce ? 0 : 10); else if(!reduce) shake = Math.max(shake || 0, 10); corners(w.F, A_REST);
        const bx = CN[4], ex = CN[6]; for(let k = 0; k < (reduce ? 12 : 40); k++) emit(1, w.A, bx + (rnd() - .5) * .3, .05, 2.2, .2);
        for(let k = 0; k < (reduce ? 8 : 22); k++){ const u = rnd() * .5; emit(1, w.A, bx + (ex - bx) * u, .1, 0, .6, 1); }   // dust along the edge that hit
        for(let k = 0; k < (reduce ? 6 : 18); k++) emit(1, w.A, bx + (rnd() - .5) * .8, .2, 1.4, .6, 2); }   // broken modules thrown off the corner
      // the obstacle: where its underside is below a rider's height, as you pass its segment
      if(w.landed && !w.hit && state === 'play' && cool <= 0 && AIR.h < 6 && d > -.6 && d < 1.2){ if(hAt(w.F, w.a, playerX - .1) < CLR || hAt(w.F, w.a, playerX + .1) < CLR){ w.hit = true;
          crash({ x:playerX, z:position + PZ }); if(typeof floatText === 'function') floatText('CRUSHED', W / 2, H * .45, 30, '#ff4ad0'); } }
      if(X(2) && DIR && DIR.done) DIR.done('screenfall');
      if(d > 50 && w.cut){ w.cut.end(); w.cut = null; }
      if(d > 150) w.done = true; },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = pSeg(), w = active(p); if(!w) return; const i = s.index;
      if(s.scBoard === w && i === w.A - BOARD && S.board){ // the amber board hung under the gantry's beam: 落下物注意 (falling objects)
        const bw = uw * .9, k = bw / S.board.width; if(k > .2){ const by = sy0 - uw * 1.72 + uw * .14; cx.fillStyle = '#121218'; pxRect(sx0 - bw / 2 - PX, by - PX, bw + PX * 2, S.board.height * k + PX * 2); const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .6); blit(S.board, sx0, by + S.board.height * k, k); cx.globalAlpha = a0; } }
      if(i === w.A) drawScreen(w, s, sx0, sy0, uw, fog, now);
      drawSparks(i, fog); },
    overlay(now, sk){} };

  // ---------------------------------------------------------------- drawing
  // the local frame of the slab: q across (world-unrotated x, -SW..SW), t down from its top edge (0..SH); a plane is [x, y, uw] of a segment
  let RC = 1, RS = 0, RF_ = 1, QX = 0, QY = 0;
  function mp(q, t, T){ const px = -RF_ * SW, v = HT - t, X = px + (q - px) * RC + RF_ * (v - HT) * RS, h = HT - RF_ * (q - px) * RS + (v - HT) * RC; QX = T[0] + X * T[2]; QY = T[1] - h * T[2]; }
  const FT = [0, 0, 0], BT = [0, 0, 0];   // the front plane (segment A) and the back plane (segment A + DEP)
  const QA = new Float64Array(8);
  function quad(T1, q1, t1, q2, t2, T2, q3, t3, q4, t4, col){ mp(q1, t1, T1); QA[0] = QX; QA[1] = QY; mp(q2, t2, T1); QA[2] = QX; QA[3] = QY; mp(q3, t3, T2); QA[4] = QX; QA[5] = QY; mp(q4, t4, T2); QA[6] = QX; QA[7] = QY;
    poly(QA[0], QA[1], QA[2], QA[3], QA[4], QA[5], QA[6], QA[7], col); }
  // a rect in the slab's plane T (q0..q1 across, t0..t1 down), as a quad on the pixel grid
  const rq = (T, q0, t0, q1, t1, col) => quad(T, q0, t0, q1, t0, T, q1, t1, q0, t1, col);
  // a thin line in plane T from (q0, t0) to (q1, t1), wd in half-road widths (at least a pixel)
  function ln(T, q0, t0, q1, t1, wd, col){ mp(q0, t0, T); const ax = QX, ay = QY; mp(q1, t1, T); const bx = QX, by = QY, L = Math.hypot(bx - ax, by - ay) || 1, hw = Math.max(PX * .5, wd * T[2] * .5), nx = -(by - ay) / L * hw, ny = (bx - ax) / L * hw;
    poly(ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny, col); }
  function drawScreen(w, s, x, y, uw, fog, now){ const F = w.F, f = c => mixc(c, FOG_COL, fog * .7), P = (X, h) => [x + X * uw, y - h * uw], lit = w.g !== 4;
    // the sky-bridge: a lit glass-and-steel skywalk between the towers, seen face on: a steel deck beam with its lattice under it, a roof
    // beam, the glazing between them warm with its ceiling lights, mullions, a few late walkers crossing; floodlights under the beam
    { const [x0, y0] = P(-TX, BR1 + .55), [x1, y1] = P(TX, BR0), ww = x1 - x0, hh = y1 - y0, wb = Math.max(PX, uw * .09);
      cx.fillStyle = f('#2c3040'); pxRect(x0, y1 - wb, ww, wb); cx.fillStyle = f('#5a6078'); pxRect(x0, y1 - wb, ww, Math.max(PX, uw * .02));          // the deck beam
      if(uw > 7){ cx.fillStyle = f('#454b60'); const nd = 20; for(let k = 0; k < nd; k++){ const xa = x0 + ww * k / nd, xb = x0 + ww * (k + 1) / nd; const lw = Math.max(PX, uw * .012); poly(xa, y1 - wb * .85, xa + lw, y1 - wb * .85, xb + lw, y1 - PX, xb, y1 - PX, f(k & 1 ? '#454b60' : '#3a3f52')); } }   // its lattice
      cx.fillStyle = f('#22242e'); pxRect(x0, y0, ww, wb * .8); cx.fillStyle = f('#6a7088'); pxRect(x0, y0, ww, Math.max(PX, uw * .015));          // the roof beam
      const g0 = y0 + wb * .8, gh = hh - wb * 1.8; cx.fillStyle = f(lit ? '#ffd8a0' : '#3a3040'); pxRect(x0, g0, ww, gh);                     // the glazing, lit warm
      cx.fillStyle = f(lit ? '#fff2d0' : '#4a4050'); pxRect(x0, g0, ww, Math.max(PX, gh * .12)); cx.fillStyle = f(lit ? '#c89060' : '#2a2430'); pxRect(x0, g0 + gh * .7, ww, gh * .3);   // its ceiling lights, its floor glow
      if(uw > 5) for(let k = 0; k <= 16; k++){ cx.fillStyle = f('#1e2028'); pxRect(x0 + ww * k / 16 - Math.max(PX, uw * .01) / 2, g0, Math.max(PX, uw * .012), gh); }   // mullions
      if(uw > 8) for(let k = 0; k < 3; k++){ const ph = (((now / 1000) * (k & 1 ? .03 : -.025) + hash(w.A + k)) % 1 + 1) % 1, px = x0 + ww * (.08 + ph * .84), fh = gh * .62, fw = Math.max(PX, uw * .07);
        cx.fillStyle = f('#2a2030'); pxRect(px - fw / 2, g0 + gh - fh, fw, fh * .72); pxRect(px - fw * .35, g0 + gh - fh * 1.04, fw * .7, fh * .26); }   // walkers
      if(uw > 6 && lit) for(let k = 0; k < 5; k++){ const [lx, ly] = P(-TX * .8 + k * TX * .4, BR0); glow(lx, ly + uw * .05, Math.min(H * .06, uw * .3), '#ffd8a0', .15 * (1 - fog)); }
      if(lit) glow(x, (y0 + y1) / 2, Math.min(H * .2, ww * .45), '#ffb870', .08 * (1 - fog)); }
    // the slab's two planes (front at A, back at A + DEP) and its rotation
    const sb = segs[w.A + DEP]; RC = Math.cos(w.a); RS = Math.sin(w.a); RF_ = F; FT[0] = x; FT[1] = y; FT[2] = uw;
    if(sb && sb.p1.screen.w){ BT[0] = sb.p1.screen.x; BT[1] = sb.p1.screen.y; BT[2] = sb.p1.screen.w; } else { BT[0] = x; BT[1] = y; BT[2] = uw; }
    const E = .12, Q0 = -SW - E, Q1 = SW + E, T0 = -E, T1 = SH + E, stl = f('#1c1f2a'), stl2 = f('#2a2e3c'), stlL = f('#4a5064');
    // power and data cable bundles from the bridge to the catwalk's back (drawn first: the cabinet hangs in front of them); on the snapped
    // side they tear at the lurch and hang from the cabinet, swinging, sparking at their ends
    if(uw > 2.5){ const tl = w.tLur > 0 ? (now - w.tLur) / 1000 : -1;
      for(const sd of [-1, 1]) for(let b = 0; b < 3; b++){ const qa = sd * (.55 + b * .16), torn = sd === F && tl >= 0, col = f(b === 1 ? '#8a4a1c' : '#121218'), lw = Math.max(PX, uw * .018);
        mp(qa, -.62, BT); const ex = QX, ey = QY; let sx, sy;
        if(!torn){ [sx, sy] = P(qa * .9, BR0); }
        else { const sw = reduce ? 0 : Math.sin(tl * 3.1 + b) * Math.exp(-tl * .6) * .5; sx = ex + (sw + sd * .15) * uw; sy = ey + (.7 + b * .12) * uw; }
        let px0 = sx, py0 = sy; for(let k = 1; k <= 6; k++){ const u = k / 6, sag = torn ? 0 : Math.sin(u * Math.PI) * .22 * uw, qx = sx + (ex - sx) * u, qy = sy + (ey - sy) * u + sag; poly(px0 - lw / 2, py0, px0 + lw / 2, py0, qx + lw / 2, qy, qx - lw / 2, qy, col); px0 = qx; py0 = qy; }
        if(torn && !reduce && (now + b * 97) % 600 < 140 && w.g !== 4){ cx.fillStyle = '#fff4c0'; pxRect(sx - PX, sy - PX, PX * 2, PX * 2); } } }
    // the hangers: two each side from the bridge to the catwalk's lugs; the snapped side's hang loose after the lurch
    for(const sd of [-1, 1]) for(const fx of [.45, .95]){ const top = P(sd * SW * fx, BR0), snapped = sd === F && (w.a > .02 && (fx > .5 || w.a > .12)), lw = Math.max(PX, Math.round(uw * .018 / PX) * PX);
      let bx, by; if(!snapped){ mp(sd * SW * fx, -.62, FT); bx = QX; by = QY; } else { bx = top[0] + (now % 1000 < 500 && !reduce ? .03 * uw : 0); by = top[1] + .55 * uw; }
      poly(top[0] - lw / 2, top[1], top[0] + lw / 2, top[1], bx + lw / 2, by, bx - lw / 2, by, f('#5a5e70')); }
    // the cabinet's depth: its back plane, then the faces joining it to the front (the underside shows as you pass beneath)
    rq(BT, Q0, T0, Q1, T1, f('#101219'));
    quad(FT, Q0, T1, Q1, T1, BT, Q1, T1, Q0, T1, f('#262a36'));   // underside
    quad(FT, Q0, T0, Q1, T0, BT, Q1, T0, Q0, T0, stl2);   // top
    quad(FT, Q0, T0, Q0, T1, BT, Q0, T1, Q0, T0, stl); quad(FT, Q1, T0, Q1, T1, BT, Q1, T1, Q1, T0, stl);   // the sides
    if(uw > 6){ // the underside's ribs, its cable tray and inspection lamps (seen from below near by)
      for(let k = 0; k <= 8; k++){ const q = Q0 + (Q1 - Q0) * k / 8; mp(q, T1, FT); const ax = QX, ay = QY; mp(q, T1, BT); const bx = QX, by = QY, lw = Math.max(PX, uw * .012); poly(ax - lw / 2, ay, ax + lw / 2, ay, bx + lw / 2, by, bx - lw / 2, by, stlL); }
      for(const dq of [.35, .65]){ mp(Q0, T1, FT); const a1 = QX, b1 = QY; mp(Q0, T1, BT); const ax = a1 + (QX - a1) * dq, ay = b1 + (QY - b1) * dq; mp(Q1, T1, FT); const a2 = QX, b2 = QY; mp(Q1, T1, BT); const bx = a2 + (QX - a2) * dq, by = b2 + (QY - b2) * dq;
        const lw = Math.max(PX, uw * .02); poly(ax, ay - lw / 2, bx, by - lw / 2, bx, by + lw / 2, ax, ay + lw / 2, f(dq < .5 ? '#3a3640' : '#1a1a22')); }
      if(lit) for(let k = 0; k < 4; k++){ mp(-SW * .75 + k * SW * .5, T1, FT); const ax = QX, ay = QY; mp(-SW * .75 + k * SW * .5, T1, BT); const lx = (ax + QX) / 2, ly = (ay + QY) / 2, sz = Math.max(PX, Math.min(PX * 2, uw * .02)); cx.fillStyle = '#ffe0a0'; pxRect(lx - sz / 2, ly - sz / 2, sz, sz); } }
    // the steel frame round the panel, lit warm from the deck's lamps along its lower flange, bolts on its face
    rq(FT, Q0, T0, Q1, T1, f('#262a36')); rq(FT, Q0, T1 - .03, Q1, T1, f(lit ? '#7a6450' : '#4a4038')); rq(FT, Q0, T0, Q1, T0 + .025, stlL);
    rq(FT, -SW - .03, -.03, SW + .03, SH + .03, f('#0a0a10'));   // the bezel
    { const rim = f(lit ? '#6a7290' : '#3a3e4c'); rq(FT, Q0, T0, Q0 + .025, T1, rim); rq(FT, Q1 - .025, T0, Q1, T1, rim); }   // the frame's edges catch the light
    if(uw * .028 >= PX){ cx.fillStyle = f('#8a90a4'); const bs = Math.max(PX, Math.min(PX * 2, uw * .025));
      for(let k = 0; k <= 16; k++){ const q = -SW + 2 * SW * k / 16; mp(q, -.075, FT); pxRect(QX - bs / 2, QY - bs / 2, bs, bs); mp(q, SH + .075, FT); pxRect(QX - bs / 2, QY - bs / 2, bs, bs); }
      for(let k = 0; k <= 12; k++){ const t = SH * k / 12; mp(-SW - .075, t, FT); pxRect(QX - bs / 2, QY - bs / 2, bs, bs); mp(SW + .075, t, FT); pxRect(QX - bs / 2, QY - bs / 2, bs, bs); } }
    // the panel itself
    drawWall(w, uw, now);
    // the catwalk on top: a grating, a toe board, posts, a mid rail and a hand rail, three work lights, the hanger lugs
    if(uw > 3){ const rw = Math.max(.012, PX / uw);
      rq(FT, Q0, -.2, Q1, -.12, stl2); rq(FT, Q0, -.2, Q1, -.185, stlL);
      for(let k = 0; k <= 10; k++){ const q = Q0 + (Q1 - Q0) * k / 10; ln(FT, q, -.2, q, -.62, rw * 1.2, stl2); }
      ln(FT, Q0, -.62, Q1, -.62, rw * 1.3, stlL); ln(FT, Q0, -.41, Q1, -.41, rw, stl2);
      for(const sd of [-1, 1]) for(const fx of [.45, .95]){ rq(FT, sd * SW * fx - .06, -.7, sd * SW * fx + .06, -.6, stlL); }
      if(lit) for(let k = 0; k < 3; k++){ mp(-SW * .6 + k * SW * .6, -.66, FT); const lx = QX, ly = QY, sz = Math.max(PX, Math.min(PX * 2, uw * .03)); cx.fillStyle = '#fff0c0'; pxRect(lx - sz / 2, ly - sz / 2, sz, sz); if(uw > 10) glow(lx, ly, Math.min(H * .04, uw * .25), '#ffd890', .18 * (1 - fog)); } }
    // the clock box under the snapped side's corner: amber digits (the time the news shows)
    if(uw > 8 && w.a < .05){ const q0 = -F * (SW - 1.1), q1 = -F * (SW - .2), qa = Math.min(q0, q1); rq(FT, qa, SH + .14, qa + .9, SH + .5, f('#0c0a08')); rq(FT, qa, SH + .14, qa + .9, SH + .16, stlL);
      if(uw > 20 && lit){ const str = '23:41', k = Math.max(PX, Math.floor(uw * .045 / PX) * PX); mp(qa + .12, SH + .22, FT); const ox = QX, oy = QY; cx.fillStyle = '#ffb030';
        for(let c = 0; c < str.length; c++){ const g = F3[str[c]]; for(let pp = 0; pp < 15; pp++) if(g[pp] === '1') cx.fillRect(Math.round((ox + (c * 4 + pp % 3) * k) / PX) * PX, Math.round((oy + ((pp / 3) | 0) * k) / PX) * PX, k, k); } } }
    // its light: the glow off the face and the pool it throws on the deck, in the picture's own colour, moving as it falls
    if(lit && w.fi !== undefined){ const rgb = FAVG[w.fi] || '90,110,255', fl = w.g === 1 ? (reduce ? .8 : .55 + .45 * hash(Math.floor(now / 90))) : w.g === 3 ? .6 : 1;
      mp(0, SH * .5, FT); glow(QX, QY, Math.min(H * .32, uw * 2.6), '#' + rgb.split(',').map(v => (+v).toString(16).padStart(2, '0')).join(''), .12 * fl * (1 - fog));
      corners(F, w.a); const xa = Math.min(CN[4], CN[6]), xb = Math.max(CN[4], CN[6]), hb = Math.max(.05, Math.min(CN[5], CN[7])), a0 = .2 * fl * clamp(1.2 - hb / 7, .2, 1) * (1 - fog);
      if(a0 > .01){ cx.globalCompositeOperation = 'lighter'; for(let j = -10; j < 3; j++){ const g = segs[w.A + j]; if(!g || !g.p1.screen.w || !g.p2.screen.w || g.p1.camera.z <= DEPTH) continue; const A1 = g.p1.screen, B1 = g.p2.screen, fade = 1 - Math.abs(j + 2) / 11;
          cx.fillStyle = 'rgba(' + rgb + ',' + (a0 * fade * fade).toFixed(3) + ')'; poly(A1.x + xa * A1.w, A1.y, A1.x + xb * A1.w, A1.y, B1.x + xb * B1.w, B1.y, B1.x + xa * B1.w, B1.y, cx.fillStyle); }
        cx.globalCompositeOperation = 'source-over'; } }
    // the crushed deck where its corner rests
    if(w.landed){ corners(F, w.a); const [cx1, cy1] = P(CN[4], 0); const sz = Math.max(PX, uw * .06); cx.fillStyle = f('#8aa0c0'); pxRect(cx1 - sz * 2, cy1 - sz, sz * 4, sz); cx.fillStyle = f('#3a3a48'); pxRect(cx1 - sz * 3, cy1 - sz * .6, sz * 1.5, sz * .6); pxRect(cx1 + sz * 1.5, cy1 - sz * .8, sz * 1.2, sz * .8); } }
  // the LED wall: the panel composed at n canvas px per LED, drawn rotated into the scratch canvas at the game's pixel size, blitted x PX
  function drawWall(w, uw, now){ if(!READY || !SC || !PN) { rq(FT, -SW, 0, SW, SH, '#0c1030'); return; }
    const L = uw * (2 * SW / LW) / PX, n = Math.max(1, Math.min(NMAX, Math.round(L))); drawPanel(w, n, now);
    // the bounding box of the panel on screen, in game px
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for(const [q, t] of [[-SW, 0], [SW, 0], [SW, SH], [-SW, SH]]){ mp(q, t, FT); x0 = Math.min(x0, QX); x1 = Math.max(x1, QX); y0 = Math.min(y0, QY); y1 = Math.max(y1, QY); }
    const gx0 = Math.max(0, Math.floor(x0 / PX) - 1), gy0 = Math.max(0, Math.floor(y0 / PX) - 1), gx1 = Math.min(SC.width, Math.ceil(x1 / PX) + 1), gy1 = Math.min(SC.height, Math.ceil(y1 / PX) + 1); if(gx1 <= gx0 || gy1 <= gy0) return;
    const k = SK, px = -RF_ * SW; k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(gx0, gy0, gx1 - gx0, gy1 - gy0); k.imageSmoothingEnabled = false;
    // local (q, t) -> scratch px: d/dq = uw (c, F s), d/dt = uw (-F s, c), origin at (q, t) = (0, 0)
    const X0 = px * (1 - RC), h0 = HT - SW * RS; k.setTransform(uw * RC / PX, uw * RF_ * RS / PX, -uw * RF_ * RS / PX, uw * RC / PX, (FT[0] + X0 * uw) / PX, (FT[1] - h0 * uw) / PX);
    k.drawImage(PN, 0, 0, LW * n, LH * n, -SW, 0, 2 * SW, SH); k.setTransform(1, 0, 0, 1, 0, 0);
    const sm0 = cx.imageSmoothingEnabled; cx.imageSmoothingEnabled = false; cx.drawImage(SC, gx0, gy0, gx1 - gx0, gy1 - gy0, gx0 * PX, gy0 * PX, (gx1 - gx0) * PX, (gy1 - gy0) * PX); cx.imageSmoothingEnabled = sm0; }
  const SPC = ['#ff3a5a', '#2adf80', '#4ff0ff', '#ffd84a', '#ff4ad0'];
  function drawSparks(i, fog){ for(const p of SPK){ if(!p.on || Math.floor(p.z) !== i) continue; const s = segs[i]; if(!s || !s.p1.screen.w) continue; const a = s.p1.screen, u = a.w, x = a.x + p.x * u, y = a.y - p.h * u, life = 1 - p.t / p.life;
      if(p.k === 1){ const r = Math.max(PX, Math.min(H * .03, p.sz * u)), a0 = cx.globalAlpha; cx.globalAlpha = a0 * .22 * life * (1 - fog * .6); cx.fillStyle = '#8a8494'; pxRect(x - r, y - r * .8, r * 2, r * 1.6); cx.globalAlpha = a0 * .18 * life; pxRect(x - r * .6, y - r * 1.3, r * 1.2, r * .6); cx.globalAlpha = a0; continue; }   // (dust: capped on screen, so a puff passing the camera never becomes a grey slab)
      if(p.k === 2){ const r = Math.max(PX, p.sz * u), ph = (p.t * 7 + p.c) % 2 < 1; cx.fillStyle = mixc('#161620', FOG_COL, fog * .6); pxRect(x - r, y - (ph ? r * .5 : r), r * 2, ph ? r : r * 2);
        if(r > PX * 2){ cx.fillStyle = SPC[p.c]; pxRect(x - r * .5, y - (ph ? r * .2 : r * .5), PX, PX); if(r > PX * 4){ cx.fillStyle = SPC[(p.c + 2) % 5]; pxRect(x + r * .3, y, PX, PX); } } continue; }
      const sz = Math.max(PX, Math.min(PX * 2, Math.round(u * .02 / PX) * PX)); cx.fillStyle = life > .6 ? '#fff8d0' : life > .3 ? '#ffd040' : '#ff7a20';
      cx.fillRect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, sz, sz); if(u > 20 && life > .5) cx.fillRect(Math.round(x / PX) * PX, Math.round((y + p.vh * u * .02) / PX) * PX, sz, sz); } }
})();
