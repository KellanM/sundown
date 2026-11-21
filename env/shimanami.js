/* Sundown environment: Shimanami Kaido (しまなみ海道). See env/README.md for the hooks.
   Island to island across the Seto Inland Sea on a clear, still night: a short island stretch (harbour town, mikan terraces), the
   Kurushima-Kaikyō triple suspension bridge stepping over its islets, a shipyard island with lit cranes, then Tatara's cable-stayed fans.
   Around the road the calm sea is full of islands, each laid on the water with its reflection.

   References studied for rules (looked at, then drawn from scratch):
   - Photos of Kurushima-Kaikyō Bridge (from Itoyama, from the sea, aerial): three suspension spans in a row, each tower a slim plain
     portal (two legs, a top beam with haunched inner corners, one lower strut, no X bracing); the towers recede as a chain of shrinking
     portals; the anchorages are squat concrete blocks on small wooded islets between the spans.
     -> slim portal towers, no bracing; islets with pines under the anchorages; the next towers visible down the road.
   - Photos of Tatara Bridge (pylon from below, from Ikuchijima, from Tatara park): a very tall pylon whose two legs lean in and join
     into one shaft, with a slot in the upper shaft; stays in two planes fan from the upper shaft to the deck edges along the whole span.
     -> inverted-Y pylons, two fans of thin stays converging on the shaft, so the view down the road is a cage of lines.
   - Seto Inland Sea photos (from Kirōsan, Onomichi, Washūzan): islands as rounded humps, a few with a conical peak, overlapping in
     rows that get paler with distance; the water flat and calm between them.
     -> two backdrop rows of islands (far range pale, near humps dark), with mirror reflections in the still water.
   - Imabari / Onomichi shipyard photos: red-and-white and green-and-white jib cranes in a row along the quay, a goliath gantry over the
     dock, green-roofed sheds. -> cranes in a rhythm on the quay, a gantry over the water, hulls fitting out alongside.
   - Night photos (Imabari Castle moat, a refinery at night): at night only the lights read; on still water each light hangs as a long,
     thin, broken vertical column; dark masses reflect as darker water, not as images.
   - OutRun / Super Hang-On: a strict roadside rhythm, big readable sprites, dither for shading.
   Rules: clear night, one cool key light (the moon); white steel lit from below by floodlights (brighter at the base); warm light only
   from the low parapet lamps on the bridges, house windows and the shipyard; every reflection hangs from a world-anchored light and
   never re-rolls per frame. Unlike Bay Bridge: no rain, no city across the water, no bulbs on the cables, and long open stretches
   where only the sea and the islands are beside you. */
"use strict";
(() => {
  // ---------------------------------------------------------------- layout (half-road widths)
  const RAILX = 1.1, CABX = 1.36, DECK = 1.62, LEGX = 1.8, CY = 1080;
  const WALLH = .12, RAILH = .2;
  // Kurushima: three suspension bridges in a row [anchorage, tower, tower, anchorage] sharing the islet anchorages
  const KB = [[165, 185, 285, 310], [310, 335, 435, 460], [460, 485, 585, 605]];
  const ISLETS = [310, 460];
  // Tatara: deck from T0 to T1, two pylons, stays every 6 segments
  const T0 = 795, T1 = 1050, TP = [855, 995], NST = 11, STD = 6;
  const TWX = [1.55, 2.4, 3.25, 4.1], TLV = [.07, .15, .24, .34];   // terrace walls (x) and the level of the terrace behind each
  const kindAt = u => u >= 158 && u < 610 ? 1 : u >= T0 && u < T1 ? 2 : 0;   // 0 island, 1 suspension, 2 cable-stayed
  const yardAt = u => u >= 610 && u < T0;

  const snap = v => Math.round(v / PX) * PX;
  const H0 = n => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };
  const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y) => (BY[(y & 3) * 4 + (x & 3)] + .5) / 16;
  const R = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // pixel painter for cached sprites
  function pix(key, w, h, fn){ const kk = 'sm_' + key; if(SPR[kk]) return SPR[kk]; const c = canvas(w, h), k = c.getContext('2d');
    const P = { k, w, h,
      px(x, y, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, ww | 0, hh | 0); },
      line(x0, y0, x1, y1, col){ k.fillStyle = col; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for(;;){ k.fillRect(x0, y0, 1, 1); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } } };
    fn(P); return SPR[kk] = c; }

  // fog: tint toward the horizon colour (opaque, never see-through)
  let lastLow = '#16223e', fogKey = '', fogC = {};
  const fc = (col, fog) => { if(lastLow !== fogKey){ fogKey = lastLow; fogC = {}; } const q = Math.round(fog * 16), key = col + q; return fogC[key] || (fogC[key] = mixc(col, lastLow, q / 16 * .88)); };
  // fogged copies come from the engine's bounded fog-tint cache (built in warm(), re-tinted in place as the night moves on)
  function fogged(spr, name, fog){ return fogTint(spr, 'sm:' + name, Math.min(5, Math.round(fog * 6)), 5, lastLow, .86); }
  const gl = (x, y, r, col, a) => { if(a <= .01 || x + r < 0 || x - r > W || y + r < 0 || y - r > H) return; glow(x, y, Math.min(r, H * .3), col, a); };
  // a bar between two points with a thickness at each end (for cables)
  function bar(x0, y0, x1, y1, t0, t1, col){ const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * .5, ny = dx / l * .5;
    poly(x0 + nx * t0, y0 + ny * t0, x1 + nx * t1, y1 + ny * t1, x1 - nx * t1, y1 - ny * t1, x0 - nx * t0, y0 - ny * t0, col); }

  // ---------------------------------------------------------------- big sprites
  // Kurushima tower: a slim portal, legs at +-CABX; floodlit from below, so each leg is brightest at its foot; moon side (left) lit edge
  const TW = 100, LEGC = 41, TH = 196, TK = CABX / LEGC, TOPH = (TH - 9) * TK, CMIN = .5;
  const KST = ['#0a1024', '#2a3858', '#5a6c94', '#9eb0d0', '#e2ecf8'], FL = '#7a8cb4';
  const ktower = () => pix('kt', TW, TH, P => {
    const [O, D, M, L, Hh] = KST;
    for(let y = 0; y < TH; y++){ const up = 1 - y / TH, hw = 3.6 + 1.2 * (y / TH);   // legs taper toward the top
      for(const sd of [-1, 1]){ const c = TW / 2 + sd * LEGC; for(let x = Math.floor(c - hw - 1); x <= Math.ceil(c + hw); x++){ const d = x + .5 - c; if(Math.abs(d) > hw + .5) continue;
        let col = Math.abs(d) > hw - .5 ? O : d < -hw + 2 ? L : d > hw - 2 ? D : M;
        if(col === M) col = up < .1 ? L : up < .24 ? FL : M;   // the floodlight climbing the leg from its foot, in hard steps
        if(col === L && up < .1 && d < -hw + 1.2) col = Hh;
        if(y % 22 === 0 && col !== O) col = D;   // panel joints
        P.px(x, y, col); } } }
    // crowns: a small cap and saddle on each leg
    for(const sd of [-1, 1]){ const c = TW / 2 + sd * LEGC; P.rect(c - 5, 0, 10, 3, O); P.rect(c - 4, 1, 8, 1, L); P.rect(c - 3, 3, 6, 2, D); }
    // top beam with haunched inner corners, and a lower strut
    const beam = (y0, y1, hn) => { for(let y = y0; y <= y1 + hn; y++) for(let x = TW / 2 - LEGC; x <= TW / 2 + LEGC; x++){ const ix = Math.abs(x + .5 - TW / 2), inner = LEGC - 3.5 - ix;
        if(y > y1 && inner > (y - y1)) continue; if(ix > LEGC - 3) continue;
        P.px(x, y, y === y0 ? L : y === y0 + 1 ? M : (y >= y1 - 1 && y <= y1) || (y > y1 && inner > y - y1 - 1.5) ? O : D); } };
    beam(14, 24, 7); beam(118, 123, 4);
    // lit inspection windows along the top beam
    for(let x = TW / 2 - LEGC + 8; x < TW / 2 + LEGC - 8; x += 5) P.px(x, 18, '#cfe0f4');
  });
  // Tatara pylon: two legs lean in from the deck edges and join into one shaft with a slot; white, floodlit from below
  const PW = 104, PH = 238, LEGP = 44, PK = LEGX / LEGP, MERGE = 86;
  const pylon = () => pix('py', PW, PH, P => {
    const [O, D, M, L, Hh] = KST;
    for(let y = 0; y < PH; y++){ const up = 1 - y / PH;
      const put = (c, hw) => { for(let x = Math.floor(c - hw - 1); x <= Math.ceil(c + hw); x++){ const d = x + .5 - c; if(Math.abs(d) > hw + .5) continue;
          let col = Math.abs(d) > hw - .5 ? O : d < -hw + 1.8 ? L : d > hw - 1.8 ? D : M;
          if(col === M) col = up < .12 ? L : up < .3 ? FL : M; if(col === L && up < .12 && d < -hw + 1) col = Hh;
          P.px(x, y, col); } };
      if(y >= MERGE){ const t = (y - MERGE) / (PH - MERGE); for(const sd of [-1, 1]) put(PW / 2 + sd * lerp(3, LEGP, t), lerp(2.6, 4, t)); }
      if(y < MERGE + 6 && y >= 6){ put(PW / 2, 4 + (y / MERGE) * 1.2); if(y > 22 && y < MERGE - 6) { P.px(PW / 2, y, O); P.px(PW / 2 - 1 + (y % 2), y, y % 9 === 0 ? '#bcd0ec' : O); } }
    }
    P.rect(PW / 2 - 2, 0, 4, 2, O); P.rect(PW / 2 - 3, 2, 6, 4, D); P.rect(PW / 2 - 3, 2, 2, 4, L);
    // a cross strut just above the deck
    for(let x = PW / 2 - LEGP + 3; x <= PW / 2 + LEGP - 3; x++){ P.px(x, PH - 22, L); P.px(x, PH - 21, M); P.px(x, PH - 20, O); }
  });
  // the stays anchor on the upper shaft; stay k (1 = nearest the pylon) sits lowest
  const stayH = k => (PH - (MERGE - 4 - (k - 1) * 5.6)) * PK;

  // anchorage pier: a concrete block at the deck edge where the main cable splays and dives in. Three-tone ramp (moonlit top and left
  // edge, mid face, shadowed base), board-formwork courses, rust stains running down from the cable collar, a lit inspection lamp
  const anchor = () => pix('an', 40, 34, P => { const O = '#070a14', D = '#1a1f2c', M = '#2a3140', L = '#46506a', Hh = '#8a96b0', ST = '#3a2e2c';
    for(let y = 4; y < 34; y++) for(let x = 1; x < 39; x++){ let col = y < 6 ? (y === 4 ? Hh : L) : x < 4 ? (x === 1 ? Hh : L) : y > 29 ? D : x > 35 ? D : M;
      if(col === M && (y - 6) % 6 === 5) col = D;   // formwork courses
      if(col === M && y > 22 && H0(x * 1.7 + y) < .25) col = D;   // damp base
      P.px(x, y, col); }
    P.rect(0, 4, 1, 30, O); P.rect(39, 4, 1, 30, O); P.rect(0, 33, 40, 1, O);
    P.rect(14, 0, 12, 5, O); P.rect(15, 1, 10, 2, L); P.rect(15, 1, 10, 1, Hh); P.rect(17, 3, 6, 2, D);
    for(const [sx, len] of [[16, 14], [19, 9], [23, 17], [26, 7]]) for(let y = 6; y < 6 + len; y++) if(H0(sx + y * 3) > .2) P.px(sx + (y > 6 + len * .6 ? 1 : 0), y, ST);
    P.rect(6, 12, 4, 3, O); P.rect(7, 13, 2, 1, '#ffd890'); });

  // ---------------------------------------------------------------- island sprites
  // mikan tree: a crown built from overlapping leaf clumps, each lit on top (moon, upper left) and dark underneath, with leaf-tip
  // texture on the lit faces; round fruit (2x2 with a highlight pixel) hanging in the shade near the rim; a short forked trunk
  const MKW = 44, MKH = 38;
  const mikan = v => pix('mk' + v, MKW, MKH, P => { const r = R(31 + v * 7), O = '#030806', D = '#081610', M = '#10261a', L = '#1c3c26', Hh = '#2e5a34', T = '#4a7a44';
    const cl = [[22, 18, 13, 11]]; for(let i = 0; i < 9; i++){ const a2 = r() * 6.28, d = .45 + r() * .4; cl.push([22 + Math.cos(a2) * 13 * d, 17 + Math.sin(a2) * 10 * d - 1, 6 + r() * 4, 5 + r() * 3]); }
    cl.sort((p, q) => p[1] - q[1]);   // back (upper) clumps first, front (lower) clumps overlap them
    const own = new Array(MKW * MKH).fill(-1);
    cl.forEach(([cxp, cyp, rx, ry], ci) => { for(let y = 0; y < MKH - 4; y++) for(let x = 0; x < MKW; x++){ const dx = (x + .5 - cxp) / rx, dy = (y + .5 - cyp) / ry, d = dx * dx + dy * dy; if(d > 1) continue;
      const lit = -dx * .5 - dy * .85, tex = H0(x * 3.1 + y * 7.3 + v); let col = lit > .55 ? Hh : lit > .1 ? L : lit > -.35 ? M : D;
      if(col === Hh && tex < .18) col = T; else if((col === L || col === Hh) && tex < .14) col = M;   // leaf tips and gaps
      if(d > .82) col = dy > 0 ? O : (col === Hh || col === T ? L : D); P.px(x, y, col); own[y * MKW + x] = ci; } });
    // fruit: in the shaded lower half of the crown, never on the outline
    let n = 0; for(let tries = 0; tries < 300 && n < 11; tries++){ const x = 4 + Math.floor(r() * (MKW - 9)), y = 12 + Math.floor(r() * 18); if(own[y * MKW + x] < 0 || own[(y + 2) * MKW + x + 1] < 0 || own[(y - 1) * MKW + x] < 0) continue;
      P.rect(x, y, 2, 2, '#c8681c'); P.px(x, y + 1, '#8a4414'); P.px(x + 1, y + 1, '#a85418'); P.px(x, y, n % 3 ? '#f0962c' : '#ffc060'); n++; }
    P.rect(20, 32, 4, 6, '#140f0a'); P.rect(20, 32, 1, 6, '#2c2218'); P.px(19, 31, '#140f0a'); P.px(24, 31, '#140f0a'); P.rect(15, 37, 14, 1, '#05080a'); });
  // house: hip roof in kawara tile, plaster walls, a warm window or two
  const house = v => pix('ho' + v, 34, v ? 34 : 26, P => { const h = v ? 34 : 26, top = 3, eave = 11, O = '#06080e', RF = ['#151a26', '#232a3a', '#3a4458'], WL = ['#2a2a34', '#3a3a46'];
    for(let y = top; y <= eave; y++){ const t = (y - top) / (eave - top), ins = Math.round((1 - t) * 7); for(let x = ins; x < 34 - ins; x++) P.px(x, y, y === top ? RF[2] : y === eave ? O : (y - top) % 2 ? RF[0] : RF[1]); }
    P.rect(5, top - 1, 24, 1, RF[2]); P.px(4, top - 2, RF[2]); P.px(29, top - 2, RF[2]);
    const wy = eave + 1; P.rect(2, wy, 30, h - wy, WL[0]); P.rect(2, wy, 1, h - wy, WL[1]); P.rect(2, h - 2, 30, 2, O);
    if(v){ P.rect(0, wy + 10, 34, 2, RF[1]); P.rect(0, wy + 10, 34, 1, RF[2]); }
    const win = (x, y, w, hh, on) => { P.rect(x - 1, y - 1, w + 2, hh + 2, O); P.rect(x, y, w, hh, on ? '#ffcf88' : '#10141e'); if(on){ for(let i = x + 2; i < x + w; i += 3) P.rect(i, y, 1, hh, '#c8803c'); P.rect(x, y + (hh >> 1), w, 1, '#c8803c'); } };
    if(v){ win(6, wy + 3, 8, 4, true); win(20, wy + 3, 8, 4, false); win(5, wy + 14, 10, 5, false); win(19, wy + 14, 9, 5, true); }
    else { win(5, wy + 4, 10, 6, true); win(20, wy + 4, 8, 6, false); }
  });
  // island street lamp: a tall pole with an arm over the road, mercury-white head (the left half; drawn mirrored on the right)
  const lamp = () => pix('lp', 20, 60, P => { const O = '#070a14', M = '#2a344c', L = '#56648a';
    P.rect(1, 6, 3, 54, O); P.rect(2, 6, 1, 54, L); P.rect(1, 56, 4, 4, O); P.rect(2, 56, 2, 1, M);
    P.rect(2, 4, 14, 2, O); P.rect(3, 4, 12, 1, L); P.rect(13, 5, 6, 3, O); P.rect(14, 7, 4, 1, '#f2fbff'); });
  // shipyard jib crane: a portal base on the quay rails, a banded lattice tower, the machinery house, a long boom raised out over the
  // water (left), the A-frame and its tie; red-and-white or green-and-white
  const crane = v => pix('cr' + v, 84, 130, P => { const C = v ? ['#246046', '#3e9468'] : ['#8a2a22', '#c84434'], Wt = ['#8a909e', '#d8dad2'], O = '#05070c', D = '#1a1e2a';
    const band = (i, lit) => i % 2 ? (lit ? Wt[1] : Wt[0]) : (lit ? C[1] : C[0]);
    // portal base: two splayed legs and a cross girder
    for(let y = 108; y < 130; y++){ const t = (y - 108) / 22; for(const [lx, sd] of [[54, -1], [65, 1]]){ const x = Math.round(lx + sd * t * 10); P.rect(x - 1, y, 4, 1, O); P.px(x, y, Wt[1]); P.px(x + 1, y, Wt[0]); } }
    P.rect(48, 106, 26, 4, O); P.rect(49, 107, 24, 1, Wt[1]); P.rect(49, 108, 24, 1, C[0]);
    // the tower: banded sides, dark lattice crosses inside
    for(let y = 40; y < 106; y++){ const b = Math.floor((y - 40) / 8); P.px(55, y, O); P.px(64, y, O); P.px(56, y, band(b, true)); P.px(57, y, band(b, true)); P.px(63, y, band(b, false)); P.px(62, y, band(b, false));
      const q = (y - 40) % 8; for(let x = 58; x < 62; x++) P.px(x, y, 61 - x === Math.floor(q / 2) ? band(b, false) : D); if(q === 0) P.rect(56, y, 8, 1, band(b, true)); }
    // machinery house with a lit window, counterweight behind
    P.rect(49, 28, 28, 13, O); P.rect(50, 29, 26, 11, C[0]); P.rect(50, 29, 26, 2, C[1]); P.rect(50, 29, 2, 11, C[1]); P.rect(54, 33, 6, 3, '#ffe2a8'); P.rect(64, 33, 3, 3, '#3a2a20');
    P.rect(76, 30, 7, 9, O); P.rect(77, 31, 5, 7, '#2a3040');
    // A-frame
    P.line(58, 28, 65, 9, O); P.line(59, 28, 66, 9, Wt[1]); P.line(72, 28, 66, 9, O); P.line(71, 28, 66, 10, Wt[0]);
    // the boom: a lattice of two chords raised to the left, banded
    for(let i = 0; i <= 52; i++){ const x = 54 - i, y = Math.round(33 - i * .46), b = band(Math.floor(i / 6), true), bd = band(Math.floor(i / 6), false);
      P.px(x, y - 2, O); P.px(x, y - 1, b); P.px(x, y + 2, bd); P.px(x, y + 3, O); P.px(x, y, i % 4 < 2 ? D : bd); P.px(x, y + 1, i % 4 < 2 ? bd : D); }
    P.line(66, 9, 3, 7, '#566078'); P.line(66, 10, 30, 19, '#3a4258');
    // boom head, hook rope and block
    P.rect(0, 6, 5, 6, O); P.rect(1, 7, 3, 3, Wt[1]); P.line(2, 12, 2, 40, '#3a4058'); P.rect(1, 40, 3, 2, '#a88020');
  });
  const CRL = [[2, 7, '#fff4d8'], [66, 8, '#ff3030'], [56, 34, '#ffe2a8']];   // crane lights (art px)
  // goliath gantry over the dock: two lattice legs, a long girder lettered with lights, a trolley
  const gantry = () => pix('ga', 150, 92, P => { const O = '#06080e', Wd = '#b8bcc8', Wl = '#e8ecf2', Rd = '#c43a2c', D = '#4a5064';
    P.rect(0, 6, 150, 16, O); P.rect(1, 7, 148, 14, Wd); P.rect(1, 7, 148, 2, Wl); P.rect(1, 15, 148, 3, Rd); P.rect(1, 19, 148, 2, D);
    for(const lx of [6, 132]){ for(let y = 22; y < 92; y++){ const t = (y - 22) / 70, a = lx - t * 5, b = lx + 12 + t * 5; P.px(a, y, O); P.px(a + 1, y, Wl); P.px(b, y, O); P.px(b - 1, y, Wd); if(y % 10 === 0) P.line(a, y, b, y, D); if(y % 10 === 5){ P.px(a + (b - a) * .5, y, D); } }
      P.rect(lx - 7, 88, 26, 4, O); }
    P.rect(60, 2, 22, 6, O); P.rect(61, 3, 20, 3, Wl); P.rect(64, 22, 2, 30, D); P.rect(76, 22, 2, 30, D); P.rect(62, 52, 18, 3, '#e8b02a');
  });
  const GAL = []; for(let x = 6; x < 150; x += 9) GAL.push([x, 9]);   // lamps along the girder
  // a new ship fitting out at the quay: steel-grey hull with a lit deck rail, red boot topping, white accommodation block at the stern
  const hull = () => pix('hu', 110, 40, P => { const O = '#05070c', HB = '#232c40', HL = '#3c4862', HD = '#161c2a', RB = '#7a2420', Wb = '#9aa2b4', Wl = '#d2d8e4';
    for(let y = 18; y < 40; y++){ const bow = y < 26 ? 0 : (y - 26) * 1.6, stern = y > 33 ? (y - 33) * .8 : 0; for(let x = Math.round(stern); x < 110 - Math.round(bow); x++) P.px(x, y, y === 18 ? HL : y === 19 ? '#ffd890' : y > 34 ? RB : y > 30 ? HD : x % 14 === 0 ? HD : HB); }
    for(let x = 2; x < 106; x += 3) P.px(x, 19, x % 6 ? HL : '#ffd890');
    P.rect(4, 5, 24, 13, O); P.rect(5, 6, 22, 12, Wb); P.rect(5, 6, 22, 1, Wl); P.rect(5, 6, 2, 12, Wl);
    for(let y = 8; y < 17; y += 3) for(let x = 8; x < 26; x += 2) if(H0(x * 3 + y) > .4) P.px(x, y, '#ffd890');
    P.rect(1, 3, 30, 2, O); P.rect(2, 3, 28, 1, Wl); P.rect(13, 0, 4, 3, O); P.rect(14, 1, 2, 2, '#c43a2c');
    P.rect(98, 6, 2, 12, '#4a5068'); P.rect(52, 10, 2, 8, '#4a5068'); for(let x = 36; x < 92; x += 14){ P.rect(x, 13, 10, 5, O); P.rect(x + 1, 13, 8, 1, '#4a5470'); } });
  // fishing boat with its mast lamp (the reflection column is drawn live)
  const boat = () => pix('bt', 30, 16, P => { const O = '#05070c', Hl = '#c8ccd6', Hd = '#5a6276', Cb = '#3a4258';
    for(let y = 9; y < 16; y++){ const ins = (y - 9) * .8; for(let x = Math.round(ins + (y < 11 ? 0 : 1)); x < 30 - Math.round(ins * 1.6); x++) P.px(x, y, y === 9 ? Hl : y === 10 ? Hd : O); }
    P.rect(5, 4, 9, 5, O); P.rect(6, 5, 7, 4, Cb); P.rect(7, 6, 3, 2, '#ffd890'); P.rect(18, 0, 1, 9, '#4a5068'); P.rect(25, 7, 1, 2, '#4a5068'); });
  // breakwater light: a little red tower
  const blight = () => pix('bl', 8, 24, P => { P.rect(1, 6, 6, 18, '#05070c'); P.rect(2, 6, 4, 17, '#9a2a24'); P.rect(2, 6, 1, 17, '#c84a3a'); P.rect(2, 11, 4, 2, '#d8d4cc'); P.rect(0, 22, 8, 2, '#2a3044'); P.rect(2, 2, 4, 4, '#05070c'); P.rect(3, 3, 2, 2, '#ff6a5a'); });
  // islets in the sea, each with its mirror image baked in (a darker, broken copy hanging below the waterline)
  const ISW = 96, ISH = 30, ISR = 16;
  const islet = v => pix('is' + v, ISW, ISH + ISR, P => { const r = R(77 + v * 13), O = '#04070e', D = '#09101e', M = '#0f1a2a', L = '#1c2e40', Rk = '#202838';
    const peaks = []; for(let i = 0; i < 3 + v; i++) peaks.push([14 + r() * (ISW - 28), 8 + r() * (ISH - 10) * (v === 1 ? 1.1 : .8), 10 + r() * 18]);
    const top = new Array(ISW).fill(ISH);
    for(let x = 0; x < ISW; x++){ let h = 0; for(const [px0, ph, pw] of peaks){ const d = (x - px0) / pw; if(Math.abs(d) < 1.6) h = Math.max(h, ph * Math.exp(-d * d * 1.1)); }
      const edge = Math.min(x, ISW - 1 - x) / 10; h *= Math.min(1, edge); h += Math.sin(x * 1.3 + v) * .8 * (h > 3 ? 1 : 0); top[x] = Math.round(ISH - h); }
    for(let x = 0; x < ISW; x++){ const t = top[x]; if(t >= ISH) continue; const sl = top[Math.min(ISW - 1, x + 1)] - top[Math.max(0, x - 1)];
      for(let y = t; y < ISH; y++){ let col = y === t ? (sl > 0 ? L : M) : y === t + 1 && sl > 0 ? M : y >= ISH - 2 ? Rk : D;
        if(y > t + 1 && y < ISH - 2 && (x + y * 3) % 11 === 0) col = O; if(y === t && (x * 7) % 5 === 0) col = O; P.px(x, y, col); } }
    // a few pine tufts on the ridge
    for(let i = 0; i < 6; i++){ const x = 6 + Math.floor(r() * (ISW - 12)), t = top[x]; if(t > ISH - 4) continue; P.rect(x - 1, t - 2, 3, 2, O); P.px(x, t - 3, O); P.px(x - 1, t - 2, L); }
    if(v === 2){ const x = ISW - 26, t = top[x]; P.rect(x, t - 9, 3, 9, '#c8ccd8'); P.rect(x, t - 9, 1, 9, '#eef2f8'); P.rect(x - 1, t - 11, 5, 2, '#05070c'); P.px(x + 1, t - 10, '#fff6dc'); }
    // reflection: rows below the waterline mirror the island, darker, every other row shifted, thinning out
    for(let y = 0; y < ISR; y++){ const sy = ISH - 1 - Math.floor(y * 1.6); if(sy < 0) break; const off = y % 2 ? 1 : 0;
      for(let x = 0; x < ISW; x++){ if(top[x] > sy) continue; if(y > 4 && (x + y) % 2) continue; if(y > 9 && (x + y) % 4 === 1) continue; P.px(x + off, ISH + y, y < 2 ? '#0a1426' : '#081022'); } }
  });
  const ISL_LH = { 2:[ISW - 25, 0] };   // the lighthouse lamp on islet variant 2 (x; y found at draw time)

  // ---------------------------------------------------------------- the inland sea backdrop: far ranges and a row of islands, wrapping
  const P = 1024, FH = 40, MH = 52, RH = 40;
  let FAR = null, MID = null, FREF = null, MREF = null; const BEACON = [], LCOL = [];
  function buildSea(){
    // far ranges: Shikoku and Honshu mountains, pale with distance, a few dim towns at their feet
    FAR = canvas(P * 2, FH); { const k = FAR.getContext('2d'), rnd = R(901), put = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); k.fillRect(x + P, y, 1, 1); };
      const hgt = x => { const a = x / P * Math.PI * 2; let h = 7 + 4 * Math.sin(a * 3 + 1) + 3 * Math.sin(a * 7 + 2) + 1.5 * Math.sin(a * 17);
          for(const [m, w, hh] of [[180, 70, 18], [520, 110, 14], [800, 50, 12]]){ let d = Math.abs(x - m); d = Math.min(d, P - d); h += hh * Math.exp(-(d * d) / (2 * w * w)); } return Math.max(2, h); };
      for(let x = 0; x < P; x++){ const h = Math.round(hgt(x)), sl = hgt(x + 1) - hgt(x - 1); for(let y = FH - h; y < FH; y++) put(x, y, y === FH - h ? (sl > .3 ? '#323e68' : '#26305a') : y < FH - h + 3 && dith(x, y) < .3 ? '#202a50' : '#1a2246'); }
      for(let i = 0; i < 70; i++){ const x = Math.floor(rnd() * P), y = FH - 1 - Math.floor(rnd() * 2); put(x, y, rnd() < .7 ? '#a08a6a' : '#7a8ab0'); } }
    // the near row: islands as rounded humps (a few conical), village lights at their feet, two distant bridges, a shipyard
    MID = canvas(P * 2, MH); const mk = MID.getContext('2d'), rnd = R(4471), put = (x, y, col) => { x = ((x % P) + P) % P; mk.fillStyle = col; mk.fillRect(x, y, 1, 1); mk.fillRect(x + P, y, 1, 1); };
    const base = MH - 1, TOPS = new Array(P).fill(MH), LIGHTS = [];
    const isl = (cx0, w, h, cone, col, rim) => { for(let x = Math.floor(cx0 - w); x <= cx0 + w; x++){ const d = (x - cx0) / w; if(Math.abs(d) >= 1) continue; let hh = cone ? h * Math.pow(1 - Math.abs(d), 1.5) : h * Math.pow(1 - d * d, .55);
        hh += Math.sin(x * .9) * .6 * (hh > 3 ? 1 : 0); const t = Math.round(base - hh); const xx = ((x % P) + P) % P; if(t >= TOPS[xx]) { continue; }
        for(let y = t; y <= base; y++) put(x, y, y === t ? (d < 0 ? rim : col) : col); TOPS[xx] = Math.min(TOPS[xx], t); } };
    // back row (paler), then front row (darker)
    for(let i = 0; i < 16; i++){ const c = i / 16 * P + rnd() * 40, w = 30 + rnd() * 50, h = 8 + rnd() * 12; isl(c, w, h, rnd() < .2, '#141c3a', '#222c52'); }
    const FRONT = []; for(let i = 0; i < 13; i++){ const c = (i + .5) / 13 * P + (rnd() - .5) * 30, w = 18 + rnd() * 46, h = 6 + rnd() * 16, cone = rnd() < .25; FRONT.push([c, w, h]); }
    for(const x of TOPS.keys()) TOPS[x] = MH;
    for(const [c, w, h] of FRONT) isl(c, w, h, h > 16, '#0c1228', '#1c2648');
    // village lights along the shore of the front islands
    for(const [c, w] of FRONT){ if(rnd() < .35) continue; const n = 4 + Math.floor(rnd() * 10), x0 = c - w * (.2 + rnd() * .5);
      for(let j = 0; j < n; j++){ const x = Math.round(x0 + rnd() * w * .7), y = base - Math.floor(rnd() * 3), col = rnd() < .65 ? '#ffcf80' : rnd() < .5 ? '#fff2d8' : '#a8d0ff'; put(x, y, col); LIGHTS.push([x, y]); } }
    // a distant suspension bridge between two front islands: two portal towers, a lit cable, a lit deck
    const sb = (x0, x1, dh, th) => { const dy = base - dh; for(let x = x0; x <= x1; x++){ put(x, dy, '#2a3454'); if(x % 4 === 0){ put(x, dy - 1, '#e8a860'); LIGHTS.push([x, dy - 1]); } }
      const ta = x0 + Math.round((x1 - x0) * .2), tb = x1 - Math.round((x1 - x0) * .2);
      for(const tx of [ta, tb]){ for(let y = dy - th; y <= base; y++){ put(tx - 1, y, '#3a4670'); put(tx + 1, y, '#3a4670'); } put(tx, dy - th, '#3a4670'); put(tx, dy - th + 4, '#3a4670'); BEACON.push([tx, dy - th - 1]); }
      for(let x = x0; x <= x1; x++){ let h; if(x < ta) h = (x - x0) / (ta - x0) * th; else if(x > tb) h = (x1 - x) / (x1 - tb) * th; else { const q = 2 * (x - ta) / (tb - ta) - 1; h = 2 + (th - 2) * q * q; }
        const y = Math.round(dy - h); put(x, y, '#5a6a98'); if(x % 4 === 0){ put(x, y, '#d6e2ff'); LIGHTS.push([x, y]); } } };
    sb(150, 260, 5, 16); sb(700, 770, 4, 12);
    // a distant cable-stayed bridge: two inverted-Y pylons and their fans
    const cs = (x0, x1, dh, th) => { const dy = base - dh; for(let x = x0; x <= x1; x++){ put(x, dy, '#2a3454'); if(x % 4 === 1) { put(x, dy - 1, '#e8a860'); LIGHTS.push([x, dy - 1]); } }
      const ta = x0 + Math.round((x1 - x0) * .25), tb = x1 - Math.round((x1 - x0) * .25);
      for(const tx of [ta, tb]){ for(let y = dy - th; y <= base; y++){ const sp = y > dy - th * .55 ? Math.round((y - (dy - th * .55)) * .18) : 0; put(tx - sp, y, '#8a9ac8'); put(tx + sp, y, '#4a5680'); }
        for(let k = 1; k <= 5; k++){ for(const sd of [-1, 1]){ const ex = tx + sd * k * Math.round((tb - ta) / 11), sy = dy - th + 2 + k; const n = Math.abs(ex - tx); for(let j = 0; j <= n; j++){ if(j % 2) continue; put(Math.round(tx + sd * j), Math.round(sy + (dy - sy) * j / n), '#36426c'); } } }
        BEACON.push([tx, dy - th - 1]); } };
    cs(420, 520, 4, 20);
    // a shipyard on the far shore: crane jibs with red tops, a cluster of sodium work lights
    for(let j = 0; j < 4; j++){ const x = 880 + j * 9; for(let y = base - 12; y <= base; y++) put(x, y, '#1a2240'); for(let i = 0; i < 7; i++) put(x - i, base - 12 + Math.round(i * .4), '#1a2240'); BEACON.push([x, base - 13]); }
    for(let j = 0; j < 22; j++){ const x = 872 + Math.floor(rnd() * 40), y = base - Math.floor(rnd() * 4); put(x, y, rnd() < .7 ? '#ffb850' : '#fff4d8'); LIGHTS.push([x, y]); }
    // reflections: still water, so each light hangs as a thin broken column; land masses become a darker, dithered mirror
    const refl = (src, sh, rate, lights) => { const c = canvas(P * 2, RH), k = c.getContext('2d'), d = src.getContext('2d').getImageData(0, 0, P, sh).data, rr = R(55 + sh);
      const put2 = (x, y, col) => { if(y < 0 || y >= RH) return; k.fillStyle = col; k.fillRect(x, y, 1, 1); k.fillRect(x + P, y, 1, 1); };
      for(let x = 0; x < P; x++) for(let y = sh - 1; y >= 0; y--){ const o = (y * P + x) * 4; if(!d[o + 3]) continue; const lum = d[o] + d[o + 1] + d[o + 2], ry = Math.floor((sh - 1 - y) * rate);
        if(lum < 240 && (ry % 2 === 0 || ry < 2) && H0(x * .37 + ry * 1.7) > .12) put2(x, ry, 'rgba(3,7,18,.4)'); }
      for(const [x, y] of lights){ if(rr() < .45) continue; const o = (y * P + (((x % P) + P) % P)) * 4, col = `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`, ry = Math.floor((sh - 1 - y) * rate), len = 4 + Math.floor(rr() * 12);
        for(let j = 0; j < len; j++){ if(j > 1 && (j + x) % 3 === 2) continue; k.globalAlpha = Math.max(.1, .7 - j * .05); put2(((x % P) + P) % P, ry + j, col); } k.globalAlpha = 1; }
      return c; };
    for(let j = 0; j < LIGHTS.length; j += 3){ const lx = ((LIGHTS[j][0] % P) + P) % P, d0 = mk.getImageData(lx, LIGHTS[j][1], 1, 1).data; LCOL.push([lx, `rgb(${d0[0]},${d0[1]},${d0[2]})`]); }
    MREF = refl(MID, MH, .7, LIGHTS); FREF = refl(FAR, FH, .5, []);
  }

  // ---------------------------------------------------------------- course and per-segment data
  let SIX = -2; const SI = () => LANDS.findIndex(L => L.key === 'shimanami');
  let zc = { z:-1 };
  function zoneOf(j){ const z = zoneOfSeg(j); if(zc.z !== z || zc.n !== gates.length) zc = { z, n:gates.length, a:z > 0 ? gates[2 * z - 1] : 0, b:gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9 }; return zc; }
  function rawLand(u){ const k = kindAt(u);
    if(k === 1){ for(const a of ISLETS) if(Math.abs(u - a) < 13) return [4.6, 4.2]; return [DECK, DECK]; }
    if(k === 2) return [DECK, DECK];
    const n = (H0(Math.floor(u / 14) * 1.3) - .5);
    return yardAt(u) ? [3.2 + n * .3, 8.5 + n * 2] : [2.6 + n * .3, 9 + n * 2]; }
  function cabH(u){ for(const [a, t1, t2, b] of KB){ if(u >= a && u <= b){
      if(u < t1) return lerp(.32, TOPH, Math.pow((u - a) / (t1 - a), 1.35));
      if(u > t2) return lerp(.32, TOPH, Math.pow((b - u) / (b - t2), 1.35));
      const q = 2 * (u - t1) / (t2 - t1) - 1; return CMIN + (TOPH - CMIN) * q * q; } } return -1; }
  function ensure(j){ const s = segs[j]; if(!s || s.smW || s.land !== SIX) return; s.smW = 1;
    const z = zoneOf(j), u = ((j - z.a) % CY + CY) % CY, r = sm(Math.min((j - z.a) / 40, (z.b - j) / 40)), kd = kindAt(u);
    let lw = 0, rw = 0, ws = 0; for(let d = -10; d <= 10; d += 2){ const w = 11 - Math.abs(d), [a, b] = rawLand(((u + d) % CY + CY) % CY); lw += a * w; rw += b * w; ws += w; }
    s.smU = u; s.smK = kd; s.smR = r; s.smLw = lw / ws; s.smRw = rw / ws; s.smB = kd > 0 && kindAt(u + 1) > 0;
    const add = o => s.sprites.push(Object.assign({ env:'shimanami', k:j }, o)), H1 = H0(j * 1.37), H2 = H0(j * 2.71), H3 = H0(j * 4.13);
    // ---- the sea: islets with pines (one with a lighthouse) and fishing boats, farther out on the bridges
    if(u % 28 === 11 && r > .5 && (kd > 0 || H1 < .5)){ const sd = (u / 28 | 0) % 2 ? 1 : -1, w = sd < 0 ? s.smLw : s.smRw; add({ type:'islet', x:sd * (w + 3.4 + H1 * 7), v:(H2 * 3) | 0, sd }); }
    if(H0(j * 5.9) < (kd > 0 ? .02 : .008) && r > .5){ const sd = H3 < .5 ? -1 : 1, w = sd < 0 ? s.smLw : s.smRw; add({ type:'boat', x:sd * (w + 1.2 + H1 * 5), sd }); }
    // ---- island props
    if(kd === 0 && r > .05){ const yard = yardAt(u);
      // hill side (right): mikan terraces in rows, a few houses up the slope, street lamps
      const nt = noTerr(u);
      if(!nt) add({ type:'terr', x:TWX[0] });
      if(u % 4 === 0 && !nt) for(let n = 0; n < 4; n++){ const xx = (TWX[n] + (TWX[n + 1] || TWX[n] + .85)) / 2 + (H0(j * 3.1 + n) - .5) * .12; if(xx < s.smRw - .5 && H0(j * 1.9 + n * 7) < .78) add({ type:'mikan', x:xx, v:(H0(j + n) * 3) | 0, lv:TLV[n] }); }
      // the towns' buildings, back rows first (each run only where the road is fully this one's, so no run is cut without its end)
      if(r > .5) for(const sd of [-1, 1]){ const bs = LT[sd][u]; if(bs) for(const b of bs){ const b0 = j - (u - b.u0); if(zoneOf(b0).a !== z.a || b0 < z.a + 22 || b0 + b.len > z.b - 40) continue;
        add({ type:'bld', kind:b.kind, side:sd, x:sd * b.X, xo:sd * b.X, b0, len:b.len, n:b.n + Math.floor((j - z.a) / CY) * 97, lift:b.lift, o:runOpts(b, b0, sd) }); } }
      if(u % 12 === 0) add({ type:'lamp', x:RAILX + .1, sd:1 });
      if(!yard){
        // harbour side (left): shore houses, boats moored at the quay, a red breakwater light
        if(u % 9 === 4 && H3 < .7) add({ type:'boat', x:-(s.smLw + .6 + H1 * .6), sd:-1, moored:1 });
        if(u === 95 || u === CY - 20) add({ type:'blight', x:-(s.smLw + 1.4) });
        if(u === 61) s.sprites.push({ type:'vend', x:-1.3, k:j });
      } else {
        // the shipyard: cranes on the quay, a ship fitting out, the goliath gantry over the dock
        if(u % 26 === 14) add({ type:'crane', x:-(s.smLw - .05), v:(u / 26 | 0) % 2 });
        if(u === 650 || u === 742) add({ type:'hull', x:-(s.smLw + 4) });
        if(u === 700) add({ type:'gantry', x:-(s.smLw + 4.5) });
        if(u % 8 === 2) add({ type:'yardlamp', x:-(s.smLw - .2) });
      }
    }
    // islets under the Kurushima anchorages: pines on the rocks
    if(kd === 1) for(const a of ISLETS) if(Math.abs(u - a) < 11 && u % 2 === 0) for(const sd of [-1, 1]) if(H0(j * 3.3 + sd) < .7) s.sprites.push({ type:'pine', x:sd * (2 + H0(j * 1.7 + sd) * 2) });
    // ---- the bridges
    if(kd === 1){ const h = cabH(u);
      if(KB.some(b => b[1] === u || b[2] === u)) add({ type:'ktower', x:0 });
      if(KB.some(b => b[0] === u || b[3] === u)) for(const sd of [-1, 1]) add({ type:'anchor', x:sd * (CABX + .05), sd });
      if(h > 0 && u % 2 === 0) for(const sd of [-1, 1]) add({ type:'cab', x:sd * CABX, sd, h, tw:KB.some(b => b[1] === u || b[2] === u) }); }
    if(kd === 2){ for(const p of TP){ if(u === p) add({ type:'pylon', x:0 }); const d = u - p, k = Math.abs(d) / STD; if(d && Math.abs(d) % STD === 0 && k <= NST && u > T0 + 4 && u < T1 - 4) add({ type:'stay', x:0, p:j - d, a:stayH(k), kk:k }); } }
    // the parapet runs the whole road; on the bridges it carries low sodium lamps every 4 segments
    for(const sd of [-1, 1]) add({ type:'rail', x:sd * RAILX, sd, lamp:kd > 0 && u % 4 === 0 });
  }
  function place(i, s){ if(SIX < -1) SIX = SI(); if(s.land === SIX) for(let j = Math.max(0, i - 40); j <= i + 40 && j < segs.length; j++) ensure(j); }

  // ---------------------------------------------------------------- drawing
  const SPANF = f => { f = fogPx(f); return f > .7 ? 4 : f > .45 ? 3 : f > .25 ? 2 : 1; };   // tiers by screen size (fogPx: the fog the old 260-segment draw distance gave here)
  const proj = j => { const t = segs[j]; return t && t.p1.screen.w && t.p1.camera.z > DEPTH ? t.p1.screen : null; };
  const nearIdx = () => Math.floor(position / SEG);
  const RC = { face:'#2a3044', faceL:'#6a5a4a', cap:'#8a96b4', top:'#c8d2e6', rail:'#5a6684', post:'#1a2032' };
  function drawRail(sp, x, y, uw, fog, now){ const s = segs[sp.k], nS = SPANF(fog); if(sp.k % nS && !sp.lamp) return; const q = proj(sp.k + nS); if(!q || q.y > y) return;
    const t = segs[sp.k + nS], r1 = s.smR, r2 = t.smR !== undefined ? t.smR : 0, fx = q.x + sp.x * q.w, fy = q.y, sd = sp.sd;
    if(!(sp.k % nS)){ const h = uw * WALLH * r1, fh = q.w * WALLH * r2, rh = uw * RAILH * r1, frh = q.w * RAILH * r2;
      if(h > .3 || fh > .3){
        // the parapet's inner face, its moonlit cap, and the steel handrail on posts above it
        poly(x, y + 1, x, y - h, fx, fy - fh, fx, fy + 1, fc(RC.face, fog));
        if(fog > .45){ poly(x, y - h, x, y - rh, fx, fy - frh, fx, fy - fh, fc(RC.rail, fog)); poly(x, y - rh, x, y - rh - PX * .6, fx, fy - frh - PX * .5, fx, fy - frh, fc(RC.top, fog)); }
        else { const ct = Math.max(PX * .7, uw * .018), fct = Math.max(PX * .5, q.w * .018); poly(x, y - h, x, y - h - ct, fx, fy - fh - fct, fx, fy - fh, fc(RC.cap, fog));
        if(fog < .8){ const tk = Math.max(PX * .7, uw * .016), ftk = Math.max(PX * .5, q.w * .016);
          poly(x, y - rh, x, y - rh + tk, fx, fy - frh + ftk, fx, fy - frh, fc(RC.top, fog));
          if(sp.k % 2 === 0){ cx.fillStyle = fc(RC.post, fog); cx.fillRect(Math.round(x - uw * .008), y - rh, Math.max(PX * .6, uw * .016), rh - h); } }
        } } }
    // a low lamp set into the parapet face: a hard warm pixel block and a small stepped halo
    if(sp.lamp && r1 > .3){ const lw = Math.max(PX, snap(uw * .05)), lh = Math.max(PX, snap(uw * .022)), ly = y - uw * WALLH * .55, a = 1 - fog * .75;
      cx.fillStyle = fog > .5 ? '#ffb860' : '#ffe8b8'; cx.fillRect(snap(x - (sd < 0 ? 0 : lw)), snap(ly - lh / 2), lw, lh);
      if(fog < .3) gl(x - sd * lw * .5, ly, clamp(uw * .16, PX * 2, PX * 9), '#ffa850', .42 * a * (1 - MOON.t * .3));
      else if(fog < .8){ cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .22 * a; cx.fillStyle = '#ff9a40'; cx.fillRect(snap(x - sd * lw * .5 - lw), snap(ly - lh * 1.5), lw * 2, lh * 3); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; } } }
  function drawCab(sp, x, y, uw, fog){ const n = segs[sp.k + 2], a = sp.h * uw, top = y - a, q = proj(sp.k + 2);
    // hanger (not at the tower, where the cable sits on its saddle)
    if(!sp.tw && fog < .85){ cx.fillStyle = fc('#6a7aa4', fog); cx.fillRect(Math.round(x), top, Math.max(PX * .5, uw * .008), a - uw * RAILH); }
    if(q && n && n.smU !== undefined && n.smK === 1 && q.y <= y + 1){ const nh = cabH(n.smU); if(nh < 0) return; const nx = q.x + sp.x * q.w, ny = q.y - nh * q.w, ct = Math.max(PX * .8, uw * .04), nct = Math.max(PX * .6, q.w * .04);
      poly(x - ct * .5, top, x + ct * .5, top, nx + nct * .5, ny, nx - nct * .5, ny, fc('#b8c8e4', fog));
      if(fog < .35) poly(x - ct * .5, top + ct * .6, x + ct * .5, top + ct * .6, nx + nct * .5, ny + nct * .6, nx - nct * .5, ny + nct * .6, fc('#465680', fog)); } }
  // the big towers rise out of the haze over the last ~24 segments before the draw distance instead of appearing whole in one frame
  const edgeA = fog => clamp((1 - fog) / .14, 0, 1);
  /* The tower legs near by (artpolish 2026-11-20): passing under a tower, a leg reached 5-8 canvas px per sprite pixel and its hard bands,
     floodlight steps and 1-px panel joints became pale slabs (the near sweep logged it under the islet key; it is this sprite, sm_kt).
     From 2.5x the legs are drawn again over the sprite at canvas resolution in the sprite's own geometry (same taper, same footprint, so
     nothing moves): a 1-px outline, a moonlit edge band and a shaded far band about 1.5 sprite px wide, the floodlight climbing from the
     foot in five hard steps instead of three, a 1-px joint with a lit lip every 22 rows. Rows of equal state are filled as one run. */
  const KLEG = ['#e2ecf8', '#9eb0d0', '#8a9cc4', '#7a8cb4', '#6a7ca4', '#5a6c94'];
  let LN_O = '', LN_D = '', LN_L = '', LN_H = '', LN_F = 0, LN_E = 1, LN_Y = 0;   // legsNear's colours and frame for its run filler (no closures per frame)
  function legRun(a0, r, L0, R0, mid, jt){ if(r <= a0) return; const cp = PX, yy = LN_Y + a0 * cp, hh = (r - a0) * cp, n = R0 - L0; if(n <= 0) return;
    cx.fillStyle = LN_O; cx.fillRect(L0 * cp, yy, n * cp, hh); if(n <= 2) return;
    cx.fillStyle = jt === 1 ? LN_D : fc(KLEG[mid], LN_F); cx.fillRect((L0 + 1) * cp, yy, (n - 2) * cp, hh); if(jt === 1) return;
    const e = Math.min(LN_E, n - 2); cx.fillStyle = jt === 2 || mid <= 1 ? LN_H : LN_L; cx.fillRect((L0 + 1) * cp, yy, e * cp, hh); cx.fillStyle = LN_D; cx.fillRect((R0 - 1 - e) * cp, yy, e * cp, hh); }
  function legsNear(x, y, k, fog){ const w = snap(TW * k), h = snap(TH * k), X0 = snap(x - w / 2), Y0 = snap(y) - h, ks = w / TW, kh = h / TH, cp = PX;
    LN_O = fc(KST[0], fog); LN_D = fc(KST[1], fog); LN_L = fc(KST[3], fog); LN_H = fc(KST[4], fog); LN_F = fog; LN_E = Math.max(1, Math.round(1.5 * ks / cp)); LN_Y = Y0;
    const r0 = Math.max(0, Math.floor(-Y0 / cp)), r1 = Math.ceil((snap(y) - Y0) / cp);
    for(let sd = -1; sd <= 1; sd += 2){ const c = X0 + (TW / 2 + sd * LEGC) * ks; if(c + 8 * ks < 0 || c - 8 * ks > W) continue;
      let a0 = r0, pL = 0, pR = 0, pM = -1, pJ = 0;
      for(let r = r0; r <= r1; r++){ let L = 0, R = 0, mid = -1, jt = 0;
        if(r < r1){ const sy = (r * cp + cp / 2) / kh, up = 1 - sy / TH, hw = (3.6 + 1.2 * (sy / TH) + 1) * ks, jr = (sy % 22) * kh / cp; L = Math.round((c - hw) / cp); R = Math.round((c + hw) / cp);
          mid = up < .05 ? 1 : up < .1 ? 2 : up < .17 ? 3 : up < .24 ? 4 : 5; jt = sy > 4 && jr < 1 ? 1 : sy > 4 && jr < 2 ? 2 : 0; }
        if(L !== pL || R !== pR || mid !== pM || jt !== pJ){ if(pM >= 0) legRun(a0, r, pL, pR, pM, pJ); pL = L; pR = R; pM = mid; pJ = jt; a0 = r; } } } }
  function drawKTower(sp, x, y, uw, fog, now){ const ea = edgeA(fog); if(ea <= 0) return; const spr = fogged(ktower(), 'kt', fog), k = uw * TK, a = (1 - fog * .8) * ea; cx.globalAlpha = ea; blit(spr, x, y, k); if(k / PX >= 2.5) legsNear(x, y, k, fog); cx.globalAlpha = 1;
    const blink = reduce ? 1 : (Math.sin(now / 520 + sp.k) > -.3 ? 1 : .2);
    for(let sd = -1; sd <= 1; sd += 2){ const lx = x + sd * LEGC * k; gl(lx, y - 20 * k, 24 * k, '#cfe4ff', .2 * a); gl(lx, y - 60 * k, 14 * k, '#cfe4ff', .1 * a);
      const rs = Math.max(PX, snap(2.2 * k)); cx.fillStyle = '#ff3a3a'; cx.globalAlpha = blink * ea; cx.fillRect(snap(lx - rs / 2), snap(y - TH * k - rs), rs, rs); cx.globalAlpha = 1; gl(lx, y - TH * k - rs / 2, 10 * k + PX * 2, '#ff2a3a', .45 * blink * a); } }
  function drawPylon(sp, x, y, uw, fog, now){ const ea = edgeA(fog); if(ea <= 0) return; const spr = fogged(pylon(), 'py', fog), k = uw * PK, sf = scaleFade(k), a = (1 - fog * .8) * ea * sf; if(sf <= 0) return; cx.globalAlpha = ea * sf; blit(spr, x, y, k); cx.globalAlpha = 1;
    const blink = reduce ? 1 : (Math.sin(now / 520 + sp.k) > -.3 ? 1 : .2);
    for(let sd = -1; sd <= 1; sd += 2) gl(x + sd * (LEGP - 6) * k, y - 26 * k, 22 * k, '#d8eaff', .2 * a);
    gl(x, y - (PH - 40) * k, 30 * k, '#d8eaff', .12 * a);
    const rs = Math.max(PX, snap(2.4 * k)); cx.fillStyle = '#ff3a3a'; cx.globalAlpha = blink * ea; cx.fillRect(snap(x - rs / 2), snap(y - PH * k - rs), rs, rs); cx.globalAlpha = 1; gl(x, y - PH * k, 10 * k + PX * 2, '#ff2a3a', .5 * blink * a); }
  // a stay: from the deck edge here up to its anchor on the pylon. When the pylon is behind the camera or past the draw distance, the
  // cable is cut where it crosses the last projected segment (a straight line in the world stays straight on screen)
  function drawStay(sp, x, y, uw, fog){ if(fog > .92) return; const b0 = nearIdx(); let m = clamp(sp.p, b0 + 2, b0 + DRAW - 2); if(m === sp.k) return;
    const u = (sp.k - m) / (sp.k - sp.p); if(u <= 0) return; const q = proj(m); if(!q) return; const s0 = segs[sp.k].p1.screen;
    const hA = lerp(.24, sp.a, u), col = fc(sp.kk < 4 ? '#c4d2ea' : '#9aaccc', fog);
    for(let sd = -1; sd <= 1; sd += 2){ const x0 = s0.x + sd * CABX * uw, y0 = y - .24 * uw, x1 = q.x + sd * lerp(CABX, .06, u) * q.w, y1 = q.y - hA * q.w;
      bar(x0, y0, x1, y1, Math.max(PX * .6, uw * .014), Math.max(PX * .5, q.w * .014), col); }
    if(fog < .6) for(let sd = -1; sd <= 1; sd += 2){ cx.fillStyle = fc('#2a3248', fog); cx.fillRect(Math.round(s0.x + sd * CABX * uw - uw * .02), y - uw * .26, Math.max(PX, uw * .04), uw * .06); } }
  function drawAnchor(sp, x, y, uw, fog){ const spr = fogged(anchor(), 'an', fog), k = uw * .55 / spr.width; flipBlit(spr, x, y, k, sp.sd > 0);
    if(fog < .6) gl(x + (sp.sd > 0 ? 12 : -12) * k, y - 20.5 * k, Math.min(uw * .1, PX * 8), '#ffc870', .35 * (1 - fog)); }
  function flipBlit(spr, x, y, k, flip){ if(flip){ cx.save(); cx.translate(Math.round(x), 0); cx.scale(-1, 1); blit(spr, 0, y, k); cx.restore(); } else blit(spr, x, y, k); }
  // a tree never comes close enough to fill the screen as flat blocks: it fades out while its crown grows from 11% to 15% of the screen width
  function drawMikan(sp, x, y, uw, fog){ if(fog > .85) return; const w = uw * .62, f = clamp((W * .15 - w) / (W * .04), 0, 1); if(f <= 0) return;
    if(f < 1) cx.globalAlpha = f; blit(fogged(mikan(sp.v), 'mk' + sp.v, fog), x, y - uw * (sp.lv || 0), w / MKW); cx.globalAlpha = 1; }
  // the terraced hillside for this segment, drawn back to front so nearer terraces cover farther ones: each wall a stone face rising from
  // the terrace below to the next level, its top edge moonlit, with mortar courses and stains; the terrace tops are planes raised to their level
  const TC = { top:['#0e1a12', '#111e15'], face:'#2c302c', faceD:'#202422', lit:'#66766a', joint:'#0c0f10' };
  function drawTerr(sp, x, y, uw, fog){ if(fog > .8) return; const s = segs[sp.k], q = proj(sp.k + 1); if(!q || q.y > y) return; const t = segs[sp.k + 1];
    if(!t || t.smK !== 0 || s.smK !== 0) return; const sx = s.p1.screen.x, rw = Math.min(s.smRw, t.smRw !== undefined ? t.smRw : s.smRw), st = Math.floor(sp.k / 4) % 2;
    for(let n = 0; n < TWX.length; n++){ const wx = TWX[n]; if(wx > rw - .2) break; const nx = Math.min(TWX[n + 1] || rw, rw), l0 = n ? TLV[n - 1] : 0, l1 = TLV[n];
      const a0x = sx + wx * uw, a0y = y - l0 * uw, a1y = y - l1 * uw, b0x = q.x + wx * q.w, b0y = q.y - l0 * q.w, b1y = q.y - l1 * q.w, a2x = sx + nx * uw, b2x = q.x + nx * q.w;
      poly(a0x, a1y, a2x, a1y, b2x, b1y, b0x, b1y, fc(TC.top[st], fog));
      poly(a0x, a0y + 1, a0x, a1y, b0x, b1y, b0x, b0y + 1, fc(sp.k % 7 === 3 ? TC.faceD : TC.face, fog));
      const lt = Math.max(PX * .6, uw * .012), blt = Math.max(PX * .5, q.w * .012); poly(a0x, a1y, a0x, a1y + lt, b0x, b1y + blt, b0x, b1y, fc(TC.lit, fog));
      if(fog < .35 && a0y - a1y > PX * 3){ cx.fillStyle = fc(TC.joint, fog); const hh = a0y - a1y, bh = b0y - b1y;
        poly(a0x, a1y + hh * .5, a0x, a1y + hh * .5 + Math.max(PX * .5, hh * .06), b0x, b1y + bh * .5 + Math.max(PX * .4, bh * .06), b0x, b1y + bh * .5, cx.fillStyle);   // a mortar course
        if(sp.k % 3 === 0) cx.fillRect(Math.round(a0x + (b0x - a0x) * .4), a1y + lt, Math.max(PX * .6, uw * .02), hh * (.35 + H0(sp.k + n) * .5)); } } }   // a stain

  function drawHouse(sp, x, y, uw, fog){ const spr = fogged(house(sp.v), 'ho' + sp.v, fog), k = uw * 1.05 / 34; flipBlit(spr, x, y, k, sp.x < 0);
    if(fog < .8){ const wx = sp.v ? (sp.x < 0 ? 34 - 23 : 23) : (sp.x < 0 ? 34 - 10 : 10), wy = sp.v ? 28 : 18; gl(x + (wx - 17) * k, y - (spr.height - wy) * k, uw * .18, '#ffb860', .3 * (1 - fog)); } }
  const LAMP_CONE = [2.5, .55, .035, 1.2, .3, .05], HULL_LT = [45, 75], HULL_COL = [16, 10, 45, 6, 75, 6], GANTRY_BCN = [2, 147];   // lamp cones (top, foot, alpha); the hull's lights and their columns (x, width); the gantry's beacons
  const SHOP_SK = ['tab', 'shk', 'sak'], SHOP_AW = [['#2a7a4a', '#d8dce0'], ['#a82a2a', '#e8e4dc'], ['#2a4a9a', '#dce0e8']], SHOP_G = [.2, .29, .37];   // the shop kinds' signs and awnings; the shelf lines
  const SEA_ST = [0, .35, 2, .2, 5, .1], HAZE_B = [.05, -9, 4, .003, 9, .06, -3, 2, .005, 5];   // the sea's steps toward the skyline (row, mix); the horizon haze bands
  function drawLamp(sp, x, y, uw, fog){ const spr = fogged(lamp(), 'lp', fog), k = uw * 1.5 / spr.height, nf = scaleFade(k); if(nf <= 0) return;   // beside the camera it reached 140x: fades as it passes
    cx.globalAlpha = nf; flipBlit(spr, x - (spr.width / 2 - 2) * k, y, k, true); cx.globalAlpha = 1;
    const hx0 = x - 15.5 * k, hy = y - spr.height * k + 7.5 * k, a = (1 - fog * .7) * nf;
    if(fog < .55 && fog > .02){ cx.globalCompositeOperation = 'lighter'; for(let c = 0; c < 6; c += 3){ const wt = LAMP_CONE[c], wb = LAMP_CONE[c + 1], al = LAMP_CONE[c + 2]; cx.fillStyle = `rgba(190,235,255,${al * (1 - fog) * nf})`; const tw = wt * k, bw = uw * wb; cx.beginPath(); cx.moveTo(hx0 - tw, hy); cx.lineTo(hx0 + tw, hy); cx.lineTo(hx0 + bw, y); cx.lineTo(hx0 - bw, y); cx.closePath(); cx.fill(); } cx.globalCompositeOperation = 'source-over'; }
    gl(hx0, hy, Math.min(uw * .2 + 2, H * .1), '#bfe8ff', .5 * a * a); }
  function drawCrane(sp, x, y, uw, fog, now){ const spr = fogged(crane(sp.v), 'cr' + sp.v, fog), k = uw * 4.2 / spr.height, x0 = x - spr.width * k / 2 + 0, y0 = y - spr.height * k; blit(spr, x - 20 * k, y, k);
    const a = 1 - fog * .7, blink = reduce ? 1 : (Math.sin(now / 600 + sp.k) > -.3 ? 1 : .2);
    for(const [lx, ly, col] of CRL){ const px0 = x0 - 20 * k + (lx + .5) * k, py0 = y0 + (ly + .5) * k, s = Math.max(PX, snap(k * 1.2)), bl = col === '#ff3030' ? blink : 1;
      cx.fillStyle = col; cx.globalAlpha = bl; cx.fillRect(snap(px0 - s / 2), snap(py0 - s / 2), s, s); cx.globalAlpha = 1; gl(px0, py0, Math.max(PX * 3, k * (col === '#fff4d8' ? 14 : 6)), col, .4 * a * bl); }
    // the work light on the jib head pools on the quay below
    if(fog < .7) gl(x0 - 20 * k + 3 * k, y - k * 2, uw * .5, '#ffe0a0', .12 * a); }
  function drawGantry(sp, x, y, uw, fog, now){ const spr = fogged(gantry(), 'ga', fog), k = uw * 8 / spr.width, x0 = x - spr.width * k / 2, y0 = y - spr.height * k, a = 1 - fog * .7; blit(spr, x, y, k);
    const s = Math.max(PX, snap(k * 1.3)); cx.fillStyle = '#fff4d8'; for(const [lx, ly] of GAL){ const px0 = x0 + lx * k, py0 = y0 + ly * k; cx.fillRect(snap(px0), snap(py0), s, s); }
    gl(x0 + 75 * k, y0 + 12 * k, 70 * k, '#fff0c8', .16 * a); gl(x0 + 71 * k, y0 + 55 * k, 30 * k, '#ffd890', .2 * a);
    const blink = reduce ? 1 : (Math.sin(now / 600) > -.3 ? 1 : .2); for(const ex of GANTRY_BCN){ cx.fillStyle = '#ff3030'; cx.globalAlpha = blink; cx.fillRect(snap(x0 + ex * k), snap(y0 + 5 * k), s, s); cx.globalAlpha = 1; gl(x0 + ex * k, y0 + 6 * k, PX * 4 + k * 4, '#ff2a2a', .4 * blink * a); } }
  function drawHull(sp, x, y, uw, fog, now){ const spr = fogged(hull(), 'hu', fog), k = uw * 6 / spr.width, x0 = x - spr.width * k / 2, a = 1 - fog * .7; blit(spr, x, y + 3 * k, k);
    gl(x0 + 16 * k, y - 28 * k, 22 * k, '#ffd890', .22 * a); for(const lx of HULL_LT) gl(x0 + lx * k, y - 24 * k, 14 * k, '#ffb850', .25 * a);
    if(fog < .8) for(let q = 0; q < 6; q += 2){ const lx = HULL_COL[q], w = HULL_COL[q + 1]; column(x0 + lx * k, y + 3 * k, Math.max(PX * 4, uw * 1.2), Math.max(PX, w * k), sp.k * 3 + lx, now, .3 * a, '#fff0c8', '#e0a050'); } }
  function drawBoat(sp, x, y, uw, fog, now){ if(x < -uw * 2 || x > W + uw * 2 || fog > .9) return; const spr = fogged(boat(), 'bt', fog), k = uw * .9 / spr.width, bob = reduce ? 0 : Math.round(Math.sin(now / 1300 + sp.k) * k * .5), a = 1 - fog * .8;
    const x0 = x - spr.width * k / 2; flipBlit(spr, x, y + bob, k, sp.sd > 0);
    const lx = sp.sd > 0 ? x0 + (30 - 18.5) * k : x0 + 18.5 * k, ly = y - 16 * k + bob, s = Math.max(PX, snap(k * 1.3));
    column(lx, y + bob + k, Math.max(PX * 4, uw * .9), Math.max(PX, k * 2.5), sp.k * 5, now, .45 * a, '#fff2c8', '#ffcf70');
    cx.fillStyle = '#fffbe8'; cx.fillRect(snap(lx - s / 2), snap(ly - s / 2), s, s); gl(lx, ly, Math.max(PX * 3, uw * .4), '#ffe0a0', .4 * a); }
  function drawBlight(sp, x, y, uw, fog, now){ const spr = fogged(blight(), 'bl', fog), k = uw * .9 / spr.height, a = 1 - fog * .7; blit(spr, x, y, k);
    const ph = reduce ? .5 : (now / 4000) % 1, on = ph < .5 ? 1 : .15, ly = y - 20 * k; gl(x, ly, Math.max(PX * 3, uw * .3), '#ff4a3a', .5 * on * a);
    column(x, y, Math.max(PX * 4, uw * 1.2), Math.max(PX, k * 2), sp.k, now, .35 * on * a, '#ff8a6a', '#c83a2a'); }
  function drawYardLamp(sp, x, y, uw, fog){ if(fog > .85) return; const h = uw * .9, a = 1 - fog * .7; cx.fillStyle = fc('#1a2032', fog); cx.fillRect(Math.round(x), y - h, Math.max(PX * .6, uw * .02), h);
    const s = Math.max(PX, snap(uw * .05)); cx.fillStyle = '#ffd890'; cx.fillRect(snap(x - s / 2), snap(y - h - s / 2), s, s); gl(x, y - h, Math.max(PX * 2, uw * .35), '#ffb850', .35 * a); }
  function drawIslet(sp, x, y, uw, fog, now){ if(x < -uw * 4 || x > W + uw * 4) return; const spr = fogged(islet(sp.v), 'is' + sp.v, fog), k = uw * 4.5 / ISW; blit(spr, x, y + ISR * k, k);
    if(sp.v === 2 && fog < .95){ const lx = x - ISW / 2 * k + (ISW - 25 + .5) * k; const ph = reduce ? .3 : (now / 5000 + sp.k * .1) % 1, fl = ph < .1 ? 1 - ph / .1 : 0;
      const ly = y - ISHT[2] * k; gl(lx, ly, Math.max(PX * 3, k * (6 + fl * 22)), '#fff2c8', (.35 + fl * .4) * (1 - fog * .6)); } }
  let ISHT = { 2:0 };
  // ---------------------------------------------------------------- the island towns as projected buildings (2026-11-19, buildings3d)
  /* Real geometry instead of billboards (the shared kit, ENV.bkit in env/buildings.js: Snow Onsen's and the Paddies rebuild's method):
     each building is a run of road segments, every segment draws one slice of the face parallel to the road and of the roof leaning back
     from it, and the end that faces the camera is drawn at the run's first segment as real quads. Nothing turns into upscaled blocks.
     Studied (Wikimedia Commons, looked at at pixel zoom, then drawn from scratch):
     - Onomichi hillside houses (尾道の坂と街並み): white plaster upper walls under a thick plaster eave band, dark charred-cedar (yakisugi)
       boards below, ibushi kawara roofs in clear tile rows with a beaded lip of round tile ends and a heavy ridge; small dark windows.
     - Onomichi machiya (Onomichi 9): two storeys, a pent roof (hisashi) between them, sliding glass doors with curtains on the ground floor,
       a railing upstairs; a neighbour in plain siding with a green shop awning.
     - Senkō-ji and Kaifuku-ji gates: a yakuimon on stone steps, two heavy posts and a tie beam under a deep tiled roof with a row of round
       tile ends; plaster walls either side capped with their own tiled coping (tsuijibei; the five white lines mark a temple's rank).
     - Port of Setoda: a big stone lantern on the quay, a small shrine, mixed tiled houses and plain three-storey shops along the harbour road.
     - Michi-no-eki Fukura: a wide low hall under a deep roof, a glazed front, a sign band, planters, a car park in front.
     - Imabari shipyard: long grey sheds with a blue base, huge dark open ends, a band of high windows, green jib cranes on the quay.
     Rules: the moon is upper left, so street faces on the right (facing left) are moonlit and faces on the left are in shade; warm light only
     from windows, shopfronts and lamps; every light is hashed from the building and its bay, fixed to the world. */
  const KW = { top:['#161c2c', '#1e2638', '#28324a', '#34405c'], rib:'#0c1018', rim:'#8c9ac0', ridge:'#0a0d16', fascia:'#1a1822', shade:'#0a0c16' };
  const PLA = ['#3c4468', '#5c6892'], PLE = '#2c3354', YK = ['#0e0c12', '#18141c', '#241e28'], WIN = '#ffc878', WIN2 = '#ffe0a0', GRD = '#9a6236';
  const TINR = { top:['#1e2432', '#242c3c', '#2a3446', '#323e52'], rib:'#141a26', rim:'#8a9ab8', ridge:'#10141e', fascia:'#1a1e28', shade:'#0c0f18' };
  const EKIR = { top:['#121c22', '#16242a', '#1c2c34', '#24363e'], rib:'#0c1418', rim:'#7a9aa8', ridge:'#0a1014', fascia:'#203038', shade:'#0a0e14' };
  const BK = {
    mchy:{ D:.72, hW:1.18, hR:1.5, ov:.14, R:KW, wall:PLA[0] },
    shop:{ D:.72, hW:1.12, hR:1.44, ov:.14, R:KW, wall:PLA[0] },
    soko:{ D:.82, hW:.95, hR:1.2, ov:.08, R:TINR, tile:'tin', end:'gab', wall:'#2c3650', rust:'#6a3a28' },
    rest:{ D:.66, hW:.64, hR:.9, ov:.16, R:KW, end:'gab', wall:'#3a2a24' },
    eki:{ D:1.6, hW:.8, hR:.98, ov:.44, R:EKIR, tile:'tin', end:'gab', wall:'#2e3448' },
    wall:{ D:.12, hW:.5, hR:.5, ov:0, R:KW, tile:'flat', wall:'#4e4430' },
    gate:{ D:.4, hW:1.04, hR:1.42, ov:.36, R:KW, end:'gab', wall:'#2a1c18' },
    hall:{ D:1.6, hW:.98, hR:2.05, ov:.36, R:KW, end:'iri', hip:3, wall:'#2a1c18' },
    shed:{ D:2.8, hW:1.75, hR:2.15, ov:.06, R:TINR, tile:'tin', end:'gab', wall:'#3a4660' }
  };
  // the town plan, world-anchored per cycle: LT[side][u] = { kind, u0, len, X, lift, n }
  const LT = { '-1':[], '1':[] }, TOWNS = [[6, 156], [1052, 1079]], NOTERR = [[36, 74], [90, 130], [618, 786]];
  (function plan(){ const put = (sd, kind, u0, len, X, lift, n) => { const o = { kind, u0, len, X, lift:lift || 0, n }; for(let u = u0; u < u0 + len; u++) (LT[sd][u] = LT[sd][u] || []).push(o); };
    let n = 0;
    // the harbour side: a row of houses and shops, two fishery warehouses, the cyclists' rest stop, gaps where the quay and the boats show
    const L = [['shop', 6], ['mchy', 6], ['mchy', 5], ['soko', 13], ['rest', 6], ['mchy', 7], ['shop', 5], ['mchy', 6], ['mchy', 5], ['soko', 12], ['mchy', 6], ['shop', 6], ['mchy', 5]];
    for(const [a, b] of TOWNS){ let u = a, i = a > 500 ? 5 : 0; while(u < b - 4){ const [k, len0] = L[i % L.length], len = Math.min(len0, b - u); if(len >= 4) put(-1, k, u, len, k === 'soko' ? 1.78 : k === 'rest' ? 1.86 : 1.72 + H0(n * 2.3) * .06, 0, n++);
      u += len + 1 + (H0(n * 4.1) > .6 ? 2 : 0) + (i % 5 === 4 ? 9 : 0); i++; } }
    // the hill side: a few houses at the road, the temple (walls, gate, hall), the michi-no-eki, houses up on the terraces
    put(1, 'mchy', 9, 6, 1.72, 0, n++); put(1, 'shop', 16, 5, 1.72, 0, n++); put(1, 'mchy', 22, 6, 1.74, 0, n++);
    put(1, 'hall', 46, 18, 2.62, 0, n++); put(1, 'wall', 38, 14, 1.64, 0, n++); put(1, 'gate', 52, 4, 1.56, 0, n++); put(1, 'wall', 56, 16, 1.64, 0, n++);
    put(1, 'eki', 96, 26, 2.75, 0, n++);
    for(const [u0, tl] of [[78, 1], [134, 2], [142, 1], [1056, 1], [1066, 2]]) put(1, 'mchy', u0, 6, TWX[tl] + .2, TLV[tl], n++);
    // the shipyard island: big sheds along the right of the yard road
    for(const [u0, len] of [[622, 28], [660, 34], [712, 30], [752, 30]]) put(1, 'shed', u0, len, 1.95, 0, n++); })();
  const noTerr = u => NOTERR.some(([a, b]) => u >= a && u < b);
  const RUNO = new Map();
  function runOpts(b, j0, sd){ const key = sd + ':' + j0 + ':' + b.kind; let o = RUNO.get(key); if(o) return o; if(RUNO.size > 300) RUNO.clear(); const B = BK[b.kind], R = B.R;
    o = { X:b.X, D:B.D, hW:B.hW, hR:B.hR, ov:B.ov, top:R.top, rib:R.rib, rim:R.rim, ridge:R.ridge, fascia:R.fascia, shade:R.shade, tile:B.tile || 'kawara',
      end:B.end || (H0(b.n * 5.7) > .5 ? 'hip' : 'gab'), hip:B.hip || 2, len:b.len, seed:b.n, rust:B.rust, wall:B.wall, near:false, gable:B.end === 'gab' && !B.tile ? PLE : undefined };
    if(b.kind === 'mchy' || b.kind === 'shop') o.wall = PLA[sd > 0 ? 1 : 0];
    RUNO.set(key, o); return o; }

  // sign lettering (DotGothic16), made in warm(): a late font repaints the same canvas
  const SGN = {};
  function makeSign(key, str, fg, bg, vert){ let c = SGN[key]; const n = str.length, cw = 16; if(!c){ c = SGN[key] = document.createElement('canvas'); c.width = vert ? cw + 4 : cw * n + 6; c.height = vert ? cw * n + 6 : cw + 4; }
    const k = c.getContext('2d'); k.fillStyle = bg; k.fillRect(0, 0, c.width, c.height); k.font = '16px DotGothic16, monospace'; k.textBaseline = 'middle'; k.textAlign = 'center'; k.fillStyle = fg;
    for(let i = 0; i < n; i++){ if(vert) k.fillText(str[i], c.width / 2, 3 + cw * i + cw / 2); else k.fillText(str[i], 3 + cw * i + cw / 2, c.height / 2); }
    const im = k.getImageData(0, 0, c.width, c.height), d = im.data, B = hx(bg), Fg = hx(fg); for(let p = 0; p < d.length; p += 4){ const dr = Math.abs(d[p] - B[0]) + Math.abs(d[p + 1] - B[1]) + Math.abs(d[p + 2] - B[2]), t = dr > 150 ? Fg : B; d[p] = t[0]; d[p + 1] = t[1]; d[p + 2] = t[2]; d[p + 3] = 255; }
    k.putImageData(im, 0, 0); }
  const SIGNS = [['tab', 'たばこ', '#f4f0e8', '#b82a24', 1], ['shk', '食堂', '#1a1418', '#f0ece0', 1], ['sak', '酒', '#f4f0e8', '#1c3a6a', 1], ['gyo', '漁協', '#f4f6f8', '#1e4a8a', 0],
    ['eki', '道の駅', '#f6f8fa', '#1a5a8a', 0], ['sma', 'しまなみ', '#1a2a3a', '#eef2f4', 0], ['saf', '安全第一', '#1a1a1a', '#eef0f0', 0], ['cyc', 'サイクル', '#f6f8fa', '#2a6ab0', 1]];
  function warmSigns(){ const go = () => { for(const [k, s, f, b, v] of SIGNS) makeSign(k, s, f, b, v); }; go(); try{ document.fonts.load('16px DotGothic16').then(go, go); }catch(e){} }
  // a sign card standing at (L, h) on the slice, w half-road widths wide (camera-facing: a kanban sticking out of the face, or one on an end)
  function signAt(key, L, h, t, w, a){ const c = SGN[key]; if(!c) return; const K = ENV.bkit, u = K.pu(t), k = w * u / c.width; if(k * c.width < PX * 3) return; const ga = cx.globalAlpha; cx.globalAlpha = ga * a; blit(c, K.px(L, h, t), K.py(L, h, t), k); cx.globalAlpha = ga; }

  // ---- shared parts
  const lit3 = (n, r, p) => H0(n * 3.31 + r * 1.73 + p) > .32;
  // the ground floor of a house: footing, yakisugi boards, bays of lit glass doors (curtains, a transom, a koshi lattice) or closed shutters
  function groundFloor(sp, o, m, F, near, lt, top){ const K = ENV.bkit, X = o.X, rel = K.rel; let on = 0;
    K.Q(X - .07, 0, X, 0, 0, 1, F('#262a36')); K.Q(X, 0, X, .05, 0, 1, F('#30343f'));
    K.Q(X, .05, X, top, 0, 1, F(YK[lt ? 2 : 1]));
    for(let r = rel - rel % 2; r < rel + m; r += 2){ const t0 = Math.max(0, (r - rel) / m), t1 = Math.min(1, (r + 2 - rel) / m); if(t1 <= t0) continue; const a = t0 + (t1 - t0) * .1, b = t1 - (t1 - t0) * .1;
      if(lit3(sp.n, r, 0)){ on++; K.Q(X, .08, X, top - .06, a, b, F(WIN)); K.Q(X, .3, X, top - .06, a, b, F('#e8a860')); K.Q(X, .08, X, .12, a, b, F('#7a4a2a'));
        if(near){ K.Q(X, .28, X, .3, a, b, F('#2a1c1c')); for(let c = 0; c <= 4; c++) K.V(X, .08, top - .06, a + (b - a) * c / 4, c % 4 ? .008 : .02, F('#2a1c1c')); if(H0(sp.n + r * 2.1) > .7) for(let c = 1; c < 8; c++) K.V(X, .1, .28, a + (b - a) * c / 8, .006, F('#4a2c1c')); } }
      else { K.Q(X, .08, X, top - .06, a, b, F(lt ? '#2c2834' : '#221e2a')); if(near) for(let c = 1; c < 6; c++) K.V(X, .08, top - .06, a + (b - a) * c / 6, .005, F('#141018')); }
      K.V(X, .05, top, t0, .03, F(YK[0])); }
    return on; }
  // a pent roof (hisashi) along the face between the floors, its tile courses, its lip of tile ends and its shadow on the wall below
  function pent(o, F, near, h0){ const K = ENV.bkit, X = o.X, m = K.m; K.Q(X, h0 - .05, X, h0, 0, 1, F('#08080e'));
    K.Q(X - .17, h0 + .01, X, h0 + .12, 0, 1, F(KW.top[1])); K.Q(X - .085, h0 + .065, X, h0 + .12, 0, 1, F(KW.top[2]));
    if(near){ const nk = m * 3; for(let c = 0; c < nk; c++){ const tt = (c + .5) / nk; poly(K.px(X - .17, 0, tt), K.py(0, h0 + .01, tt), K.px(X, 0, tt), K.py(0, h0 + .12, tt), K.px(X, 0, tt) + PX, K.py(0, h0 + .12, tt), K.px(X - .17, 0, tt) + PX, K.py(0, h0 + .01, tt), F(KW.top[3])); }
      const nl = m * 4; for(let c = 0; c < nl; c++) K.Q(X - .17, h0, X - .17, h0 + .025, (c + .1) / nl, (c + .6) / nl, F(KW.rim)); }
    else K.Q(X - .17, h0, X - .17, h0 + .02, 0, 1, F(KW.rim));
    if(K.end) K.T(X - .17, h0 + .01, X, h0 + .01, X, h0 + .12, F(KW.top[0])); }
  // the upper floor: plaster, a window per two-segment bay (shoji lit warm, or dark glass with a moon glint), a railing on some, laundry
  function upper(sp, o, m, F, near, h0, h1){ const K = ENV.bkit, X = o.X, rel = K.rel; K.Q(X, h0, X, h1, 0, 1, F(o.wall)); K.Q(X, h1 - .1, X, h1 - .07, 0, 1, F('#20263e'));
    for(let r = rel - rel % 2; r < rel + m; r += 2){ const t0 = Math.max(0, (r - rel) / m), t1 = Math.min(1, (r + 2 - rel) / m); if(t1 <= t0) continue; const a = t0 + (t1 - t0) * .22, b = t1 - (t1 - t0) * .22, w0 = h0 + .1, w1 = h1 - .16;
      K.Q(X, w0 - .02, X, w1 + .02, a - .01, b + .01, F('#14121a'));
      if(lit3(sp.n, r, 7)){ K.Q(X, w0, X, w1, a, b, F(H0(sp.n * 1.3 + r) > .7 ? WIN2 : WIN)); if(near){ K.Q(X, (w0 + w1) / 2, X, (w0 + w1) / 2 + .012, a, b, F(GRD)); for(let c = 1; c < 3; c++) K.V(X, w0, w1, a + (b - a) * c / 3, .006, F(GRD)); } }
      else { K.Q(X, w0, X, w1, a, b, F('#121828')); if(near) K.Q(X, w1 - .05, X, w1 - .03, a, a + (b - a) * .3, F('#3a4a6a')); }
      const hv = H0(sp.n * 7.7 + r * .9);
      if(hv > .55){ K.Q(X - .05, w0 + .05, X - .05, w0 + .07, t0 + .02, t1 - .02, F('#3a3c48')); if(near) for(let c = 0; c <= 6; c++) K.V(X - .05, w0 - .03, w0 + .06, t0 + .02 + (t1 - t0 - .04) * c / 6, .006, F('#2a2c36')); }
      if(hv > .82 && near){ K.Q(X - .09, w1 + .04, X - .09, w1 + .05, a, b, F('#4a4c58')); for(let c = 0; c < 3; c++){ const tc = a + (b - a) * (c + .3) / 3; K.RT(X - .09, w1 - .09, tc, .07, .09, F(['#c8ccd8', '#a8b8d8', '#d8b8b8'][(c + r) % 3])); } } } }
  // a plain end wall: boards below, plaster above, corner posts, an end window (lit or dark) and the ground's shadow line
  function endWall(sp, o, F, near, top, h0){ const K = ENV.bkit, X = o.X, D = o.D; K.E(X, 0, X + D, .05, F('#262a34')); K.E(X, .05, X + D, top, F(YK[0])); K.E(X, h0, X + D, o.hW, F(PLE));
    K.E(X, .05, X + .035, o.hW, F('#100c12')); if(near && H0(sp.n * 2.9) > .4){ const on = H0(sp.n * 4.3) > .45; K.E(X + D * .38, h0 + .12, X + D * .62, o.hW - .16, F(on ? WIN : '#121828')); if(on) K.E(X + D * .38, h0 + .2, X + D * .62, h0 + .21, F(GRD)); } }
  // small life at the end of a house: potted plants, a mama-chari, a cat on the step
  function life(sp, o, F){ const K = ENV.bkit, X = o.X, hv = H0(sp.n * 9.1);
    for(let c = 0; c < 2; c++){ const L = X - .08 - c * .1; K.R(L, 0, .06, .045, F('#5a2e22')); K.R(L, .045, .08, .06, F(c ? '#1e3a26' : '#24462c')); K.R(L - .02, .09, .03, .02, F('#3a6a40')); }
    if(hv > .45){ const L = X - .34, c = ['#9aa2b4', '#3a5a9a', '#8a2a2a'][(sp.n * 5) % 3]; K.R(L, 0, .02, .12, F('#08080c')); K.R(L, .05, .015, .08, F(c)); K.R(L, .13, .1, .012, F('#5a5e6a')); K.R(L, .145, .07, .035, F('#3a3e48')); K.R(L, .11, .035, .012, F('#16141a')); }
    if(hv < .18){ const L = X - .2; K.R(L, 0, .05, .035, F('#0a0a10')); K.R(L - .015, .035, .025, .025, F('#0a0a10')); K.R(L - .022, .06, .006, .008, F('#0a0a10')); K.R(L - .008, .06, .006, .008, F('#0a0a10')); K.R(L - .015, .045, .006, .006, '#c8e070'); } }

  // ---- the kinds
  const KIND = {
    // a two-storey fishing house (machiya): boards and glass doors below, the pent roof, plaster and windows above
    mchy(sp, o, m, F, near, fog, now){ const K = ENV.bkit, lt = sp.side > 0; const on = groundFloor(sp, o, m, F, near, lt, .54); pent(o, F, near, .54); upper(sp, o, m, F, near, .66, o.hW);
      if(on && fog < .25) K.spill(o.X - .5, o.X - .01, 0, 1, '255,186,110', .045 * on / Math.max(1, m / 2));
      if(K.end){ endWall(sp, o, F, near, .54, .66); if(fog < .14) life(sp, o, F); } },
    // a small shop: a lit shopfront with goods on shelves under a striped awning, a vertical kanban sticking out, a vending machine
    shop(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel, lt = sp.side > 0, sk = SHOP_SK[sp.n % 3], AW = SHOP_AW[sp.n % 3];
      K.Q(X - .07, 0, X, 0, 0, 1, F('#262a36')); K.Q(X, 0, X, .05, 0, 1, F('#30343f')); K.Q(X, .05, X, .56, 0, 1, F(YK[lt ? 2 : 1]));
      K.Q(X, .07, X, .44, .03, .97, F('#ffd890')); K.Q(X, .07, X, .12, .03, .97, F('#6a4a2a'));
      if(near){ for(const g of SHOP_G) K.Q(X, g, X, g + .012, .03, .97, F('#a0683a')); for(let c = 0; c < m * 6; c++){ const tt = .03 + .94 * (c + .3) / (m * 6), hv = H0(sp.n + rel * 7 + c); K.Q(X, .21 + (hv > .5 ? .085 : 0), X, .26 + (hv > .5 ? .085 : 0), tt, tt + .5 / (m * 6), F(['#e85a3a', '#3a8ae0', '#f0d040', '#e8e8e8'][(c + rel) % 4])); }
        for(let c = 0; c <= 2 * m; c++) K.V(X, .07, .44, .03 + .94 * c / (2 * m), .012, F('#2a2026')); }
      // the awning: canvas sloping out from the wall, its striped valance
      { const ns = Math.max(2, m * 4); for(let c = 0; c < ns; c++){ const ta = c / ns, tb = (c + 1) / ns; K.Q(X - .2, .46, X, .55, ta, tb, F(c % 2 ? AW[1] : AW[0])); K.Q(X - .2, .42, X - .2, .46, ta, tb, F(c % 2 ? AW[1] : AW[0])); }
        K.Q(X - .2, .415, X - .2, .425, 0, 1, F('#0c0a10')); }
      K.Q(X, .56, X, .62, 0, 1, F('#100e16'));
      upper(sp, o, m, F, near, .62, o.hW);
      if(fog < .3) K.spill(o.X - .6, o.X - .01, 0, 1, '255,206,130', .07);
      if(K.end){ endWall(sp, o, F, near, .56, .62); K.T(X - .2, .42, X, .42, X, .55, F(AW[0]));
        if(fog < .5){ const tc = Math.min(1, .5 / m); K.RT(X - .07, .62, tc, .028, .5, F('#1a1418')); signAt(sk, X - .13, .64, tc, .1, 1 - fog * 1.2); if(fog < .2) glow(K.px(X - .13, .85, tc), K.py(X, .85, tc), K.pu(tc) * .25, '#fff0d0', .12); }
        if(fog < .2){ const L = X + .2, BODY = ['#c82a2a', '#e8ecf0', '#2a5ab8'][sp.n % 3]; K.R(L, 0, .2, .36, F(BODY)); K.R(L, .17, .16, .12, '#e8f4ff'); for(let rw = 0; rw < 3; rw++) K.R(L, .19 + rw * .035, .14, .015, NEON[(rw + sp.n) % 5]); K.R(L, .04, .14, .06, F('#16161e')); K.R(L, .31, .16, .03, '#f4fbff'); glow(K.px(L, .2, 0), K.py(L, .2, 0), K.pu(0) * .35, '#d8ecff', .18); } } },
    // the fishery warehouse: corrugated walls on a concrete plinth, big sliding doors (one open on nets and floats), sodium lamps over
    // them; fish crates, floats and a net heap in front; 漁協 on the gable end
    soko(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel, lt = sp.side > 0;
      K.Q(X - .3, 0, X, 0, 0, 1, F('#1e2028')); K.Q(X, 0, X, o.hW, 0, 1, F(lt ? '#3c4862' : '#2c3650')); K.Q(X, 0, X, .12, 0, 1, F('#2a2e38')); K.Q(X, .12, X, .135, 0, 1, F('#3c404c'));
      if(near) for(let c = 0; c < m * 6; c++) K.V(X, .135, o.hW - .06, (c + .5) / (m * 6), .006, F(c % 2 ? '#222a3c' : (lt ? '#4c5a78' : '#3a4664')));
      for(let r = rel - rel % 4; r < rel + m; r += 4){ if(r < 1 || r + 3 > o.len) continue; const t0 = (r + .3 - rel) / m, t1 = (r + 2.7 - rel) / m, a = Math.max(0, t0), b = Math.min(1, t1); if(b <= a) continue; const open = H0(sp.n * 6.1 + r) > .62;
        K.Q(X, .02, X, .7, a, b, F('#14161e')); K.Q(X, .02, X, .67, a + .01, b - .01, F(open ? '#ffb860' : (lt ? '#4a5470' : '#384260')));
        if(open){ K.Q(X, .02, X, .3, a + .01, b - .01, F('#ffd890')); if(near){ K.Q(X, .02, X, .2, a + (b - a) * .1, a + (b - a) * .5, F('#1e3a2e')); K.Q(X, .02, X, .14, a + (b - a) * .55, a + (b - a) * .85, F('#3a5a8a')); } K.spill(X - .6, X - .01, a, b, '255,180,90', .08); }
        else { K.Q(X, .5, X, .54, a + .01, b - .01, F('#c8ccd4')); if(near) for(let c = 1; c < 4; c++) K.V(X, .02, .67, a + (b - a) * c / 4, .006, F('#262c3e')); }
        const tc = (a + b) / 2; K.Q(X - .06, .76, X, .78, tc - .02, tc + .02, F('#16181e')); K.bulb(X - .06, .74, tc, '#ffd070', '#ff9a30', .035, .35 * (1 - fog)); K.cone(X - .06, .74, tc, .36, '255,150,60', .055 * (1 - fog)); }
      if(fog < .14) for(let r = Math.max(rel, 2); r < rel + m; r += 3){ const tc = (r - rel + .5) / m, hv = H0(sp.n + r * 3.7); if(hv < .4) continue;
        if(hv < .7){ for(let s = 0; s < 3; s++) K.RT(X - .14, s * .06, tc, .12, .055, F(s % 2 ? '#2a5aa8' : '#3a6ac0')); K.RT(X - .14, .175, tc, .12, .012, F('#7aa0e0')); }
        else { K.RT(X - .16, 0, tc, .16, .06, F('#1e3a2e')); for(let s = 0; s < 3; s++) K.RT(X - .2 + s * .05, .06 + (s % 2) * .02, tc, .04, .04, F('#e86a2a')); } }
      if(K.end){ K.E(X, 0, X + o.D, o.hW, F('#262e44')); K.E(X, 0, X + o.D, .12, F('#22262e')); if(near) for(let c = 1; c < 8; c++) K.E(X + o.D * c / 8, .12, X + o.D * c / 8 + .01, o.hW, F('#1a2032'));
        K.E(X + o.D * .18, .02, X + o.D * .82, .62, F('#14161e')); K.E(X + o.D * .2, .02, X + o.D * .8, .6, F('#384260')); if(near) for(let c = 1; c < 6; c++) K.E(X + o.D * (.2 + c * .1), .02, X + o.D * (.2 + c * .1) + .008, .6, F('#262c3e'));
        K.E(X + o.D * .2, .3, X + o.D * .8, .44, F('#e8ecf0')); if(fog < .5) signAt('gyo', X + o.D * .5, .3, 0, o.D * .5, 1 - fog * 1.4);
        for(let c = 0; c < 5; c++){ const hv = H0(sp.n * 2.1 + c); if(hv > .45) K.E(X + o.D * (.05 + c * .2), o.hW - .06 - hv * .3, X + o.D * (.05 + c * .2) + .02, o.hW - .05, F('#5a3a2c')); }
        K.E(X + o.D * .82, .7, X + o.D * .95, .8, F(H0(sp.n * 5.3) > .3 ? WIN : '#121828'));
        K.E(X + o.D * .46, .66, X + o.D * .54, .68, F('#16181e')); K.bulb(X + o.D * .5, .64, 0, '#ffd070', '#ff9a30', .035, .4 * (1 - fog)); K.spill(X - .4, X + o.D, 0, .5, '255,150,60', .06 * (1 - fog));
        if(fog < .2){ for(let s0 = 0; s0 < 3; s0++) K.R(X - .14, s0 * .06, .14, .055, F(s0 % 2 ? '#2a5aa8' : '#3a6ac0')); K.R(X - .14, .18, .14, .012, F('#7aa0e0')); for(let c = 0; c < 3; c++) K.R(X + o.D + .1 + c * .05, .02 + (c % 2) * .03, .045, .045, F('#e86a2a')); } } },
    // the cyclists' rest stop: a little kiosk with a lit counter, a bench, a stand of road bikes, the blue sign
    rest(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel;
      K.Q(X - .55, 0, X, 0, 0, 1, F('#24262e')); K.Q(X, 0, X, o.hW, 0, 1, F('#3a2a24')); K.Q(X, 0, X, .05, 0, 1, F('#30343f'));
      K.Q(X, .14, X, .46, .08, .92, F(WIN)); K.Q(X, .26, X, .28, .08, .92, F('#7a4a2a')); if(near) for(let c = 0; c <= 3 * m; c++) K.V(X, .14, .46, .08 + .84 * c / (3 * m), .01, F('#2a1c18'));
      if(fog < .3) K.spill(X - .6, X - .01, 0, 1, '255,196,120', .06);
      if(fog < .18){ K.Q(X - .14, .14, X - .02, .14, .15, .85, F('#6a5240')); K.Q(X - .14, .13, X - .14, .14, .15, .85, F('#3a2a20'));
        K.Q(X - .42, .3, X - .42, .315, 0, 1, F('#8a92a4')); K.V(X - .42, 0, .3, .02, .015, F('#5a6070')); K.V(X - .42, 0, .3, .98, .015, F('#5a6070'));
        for(let c = 0; c < m * 2; c++){ if(H0(sp.n * 3 + rel * 5 + c) < .35) continue; const tc = (c + .5) / (m * 2), col = ['#2a6ab0', '#e8ecf0', '#c82a2a', '#2a8a5a'][(c + rel) % 4];
          K.RT(X - .42, 0, tc, .016, .15, F('#08080c')); K.RT(X - .42, .07, tc, .014, .1, F(col)); K.RT(X - .42, .17, tc, .07, .012, F('#2a2a30')); K.RT(X - .42, .29, tc, .035, .014, F('#16141a')); } }
      if(K.end){ K.E(X, 0, X + o.D, o.hW, F('#2a1e1a')); K.E(X + o.D * .3, .16, X + o.D * .7, .42, F(WIN)); if(fog < .4){ const L = X - .62; K.R(L, 0, .022, .62, F('#4a5060')); signAt('cyc', L, .3, 0, .09, 1 - fog * 1.5); } } },
    // the michi-no-eki: a wide hall under a deep metal roof on posts, a lit glazed front with shelves and people, the blue sign band,
    // planters, a car park in front with parked cars, vending machines and the tall pole sign at the end
    eki(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel, a = 1 - fog;
      K.Q(X - 1.08, 0, X - .46, 0, 0, 1, F('#1a1c24')); K.Q(X - .46, 0, X, 0, 0, 1, F('#2a2c34'));
      if(near) for(let r = rel; r < rel + m; r++){ const t0 = (r - rel) / m; K.Q(X - 1.02, 0, X - .52, 0, t0, t0 + .05 / m, F('#9aa0b0')); }
      K.Q(X - .47, 0, X - .45, .06, 0, 1, F('#1c3a26')); K.Q(X - .47, .06, X - .45, .07, 0, 1, F('#2e5a3a'));
      K.Q(X, 0, X, o.hW, 0, 1, F(o.wall)); K.Q(X, .04, X, .58, 0, 1, F('#ffe6b8')); K.Q(X, .04, X, .2, 0, 1, F('#e8b078'));
      if(near){ for(let c = 0; c <= m * 3; c++) K.V(X, .04, .58, c / (m * 3), .012, F('#2a2e3a')); K.Q(X, .38, X, .395, 0, 1, F('#2a2e3a'));
        for(let c = 0; c < m * 3; c++){ const tc = (c + .5) / (m * 3), hv = H0(sp.n * 1.7 + rel * 3.1 + c); K.RT(X, .04, tc, .14, .1, F('#a86a3a')); if(hv > .72){ K.RT(X, .04, tc + .04 / m, .03, .2, F('#2a2028')); K.RT(X, .24, tc + .04 / m, .035, .035, F('#2a2028')); } } }
      K.Q(X, .6, X, .76, 0, 1, F('#1a5a8a')); K.Q(X, .6, X, .615, 0, 1, F('#0e3a5a')); K.Q(X, .745, X, .76, 0, 1, F('#4a8ab8'));
      for(let r = rel - rel % 2; r < rel + m; r += 2){ const tc = (r - rel) / m; if(tc < 0) continue; K.V(X - o.ov + .04, 0, o.hW, tc, .03, F('#4a5262')); }
      K.Q(X - o.ov, o.hW - .03, X, o.hW - .03, 0, 1, F('#0c1016'));
      if(fog < .35){ cx.globalCompositeOperation = 'lighter'; K.Q(X - o.ov, 0, X, 0, 0, 1, 'rgba(255,228,180,' + (.09 * a).toFixed(3) + ')'); K.Q(X - 1.05, 0, X - o.ov, 0, 0, 1, 'rgba(255,228,180,' + (.04 * a).toFixed(3) + ')'); cx.globalCompositeOperation = 'source-over'; }
      if(fog < .5 && rel <= 3 && rel + m > 3) signAt('eki', X - .02, .64, (3 - rel) / m, .34, 1 - fog * 1.4);
      if(fog < .16) for(let r = rel; r < rel + m; r++){ const hv = H0(sp.n * 2.2 + r * 1.9); if(r % 4 !== 1 || hv < .35) continue; const tc = (r - rel + .5) / m, L = X - .78, c = ['#8a90a0', '#2a3040', '#7a2a2a', '#9a9484'][(r * 3) % 4];
        K.RT(L, .01, tc, .3, .045, '#08080c'); K.RT(L, .04, tc, .29, .1, F(c)); K.RT(L, .13, tc, .25, .085, F(dkSm(c))); K.RT(L, .15, tc, .2, .055, F('#18202e')); K.RT(L - .12, .07, tc, .035, .025, '#c8202a'); K.RT(L + .12, .07, tc, .035, .025, '#c8202a'); }
      if(K.end){ K.E(X, 0, X + o.D, o.hW, F('#262c3e')); K.E(X + .1, .04, X + o.D - .1, .58, F('#ffe2b0')); if(near) for(let c = 1; c < 6; c++) K.E(X + .1 + (o.D - .2) * c / 6, .04, X + .1 + (o.D - .2) * c / 6 + .012, .58, F('#2a2e3a'));
        K.E(X, .6, X + o.D, .76, F('#1a5a8a'));
        if(fog < .2){ const BODY = ['#e8ecf0', '#c82a2a', '#2a5ab8']; for(let c = 0; c < 3; c++){ const L = X - .2 - c * .22; K.R(L, 0, .2, .36, F(BODY[c])); K.R(L, .17, .16, .12, '#e8f4ff'); for(let rw = 0; rw < 3; rw++) K.R(L, .19 + rw * .035, .14, .015, NEON[(rw + c) % 5]); K.R(L, .04, .14, .06, F('#16161e')); K.R(L, .31, .16, .03, '#f4fbff'); }
          glow(K.px(X - .42, .2, 0), K.py(X, .2, 0), K.pu(0) * .5, '#d8ecff', .2 * a); }
        if(fog < .5){ const L = X - 1.15; K.R(L, 0, .035, 1.1, F('#3a4050')); K.R(L, .98, .44, .32, F('#1a5a8a')); K.R(L, 1.27, .44, .03, F('#4a8ab8')); signAt('eki', L, 1.06, 0, .36, 1 - fog * 1.4); signAt('sma', L, 1.24, 0, .3, 1 - fog * 1.4); if(fog < .3) glow(K.px(L, 1.14, 0), K.py(L, 1.14, 0), K.pu(0) * .5, '#a8d8ff', .14 * a); } } },
    // the temple wall (tsuijibei): a stone base, ochre plaster with the five white lines, a tiled coping
    wall(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel, lt = sp.side > 0;
      K.Q(X, 0, X, .1, 0, 1, F('#2e323c')); if(near) for(let r = 0; r < m * 3; r++) K.V(X, 0, .1, (r + .5) / (m * 3), .006, F('#1c1e26'));
      K.Q(X, .1, X, .46, 0, 1, F(lt ? '#4a3e2e' : '#3a3026')); if(fog < .12) for(let i = 0; i < 5; i++) K.Q(X, .2 + i * .045, X, .21 + i * .045, 0, 1, F(lt ? '#625a4c' : '#4a4438'));
      K.Q(X, .44, X, .46, 0, 1, F('#16141a')); K.Q(X - .07, .455, X + .03, .53, 0, 1, F(KW.top[2])); K.Q(X - .07, .45, X - .07, .47, 0, 1, F(KW.rim));
      if(near){ const nk = m * 4; for(let c = 0; c < nk; c++){ const tt = (c + .5) / nk; poly(K.px(X - .07, 0, tt), K.py(0, .455, tt), K.px(X + .03, 0, tt), K.py(0, .53, tt), K.px(X + .03, 0, tt) + PX, K.py(0, .53, tt), K.px(X - .07, 0, tt) + PX, K.py(0, .455, tt), F(KW.top[3])); } }
      K.Q(X + .02, .52, X + .08, .57, 0, 1, F(KW.ridge)); K.Q(X + .03, .565, X + .07, .58, 0, 1, F(KW.rim));
      if(K.end){ K.E(X, 0, X + o.D, .46, F('#3a3226')); K.T(X - .07, .455, X + o.D + .07, .455, X + o.D / 2, .57, F(KW.top[1])); } },
    // the temple gate: stone steps up to a platform, two heavy posts and a tie beam, the dark opening with the hall's light far inside,
    // a white chōchin under the beam, a stone lantern either side, and the deep tiled roof with its gable end
    gate(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel, a = 1 - fog;
      for(let s = 0; s < 3; s++){ const L = X - .42 + s * .1; K.Q(L, s * .045, L, (s + 1) * .045, 0, 1, F('#2c3038')); K.Q(L, (s + 1) * .045, L + .1, (s + 1) * .045, 0, 1, F('#545a68')); }
      const t0 = Math.max(0, (.6 - rel) / m), t1 = Math.min(1, (3.4 - rel) / m);
      if(t1 > t0){ K.Q(X + .02, .135, X + .02, .82, t0, t1, F('#0a080e')); K.Q(X + .02, .135, X + .02, .36, t0 + (t1 - t0) * .35, t1 - (t1 - t0) * .35, F('#5a3a22'));
        K.Q(X, .78, X, .88, 0, 1, F('#2a1c18')); K.Q(X, .78, X, .795, 0, 1, F('#4a3428')); K.Q(X, .66, X, .7, t0, t1, F('#241814'));
        for(const tp of [t0, t1]) if(tp > 0 && tp < 1){ K.V(X, .135, .88, tp, .085, F('#2a1c18')); K.V(X - .035, .135, .88, tp, .02, F('#5a4232')); }
        const tc = (2 - rel) / m; if(fog < .4 && tc >= 0 && tc <= 1){ K.RT(X - .01, .58, tc, .09, .13, F('#f4ecd8')); K.RT(X - .01, .6, tc, .09, .02, F('#b82a24')); if(fog < .25) glow(K.px(X, .52, tc), K.py(X, .52, tc), K.pu(tc) * .3, '#ffe0a0', .3 * a); } }
      if(K.end && fog < .3) for(const L of [X - .62]){ K.R(L, 0, .16, .05, F('#3a3e48')); K.R(L, .05, .06, .16, F('#4a4e58')); K.R(L, .21, .13, .03, F('#3a3e48')); K.R(L, .24, .11, .08, F('#2a2c34')); K.R(L, .26, .05, .045, '#ffc070'); K.R(L, .32, .17, .035, F('#4a4e58')); K.R(L, .355, .04, .03, F('#3a3e48')); glow(K.px(L, .28, 0), K.py(L, .28, 0), K.pu(0) * .2, '#ffb060', .4 * a); } },
    // the main hall up behind the wall: only what shows over it (dark wood, faintly lit lattice doors) and its big irimoya roof
    hall(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel;
      K.Q(X, .62, X, o.hW, 0, 1, F('#2a1c18')); for(let r = rel; r < rel + m; r++){ if(r % 3 !== 1) continue; const tc = (r - rel) / m; K.Q(X, .64, X, .88, tc, tc + 2 / m, F('#6a3e22')); if(near) for(let c = 1; c < 6; c++) K.V(X, .64, .88, tc + 2 / m * c / 6, .006, F('#2a1810')); }
      if(K.end) K.E(X, .62, X + o.D, o.hW, F('#20140f')); },
    // a shipyard shed: corrugated walls on a blue base, a band of high windows, the huge open bay (a ship block inside, a welder's blue
    // light breathing slowly), 安全第一 by the door, sodium lamps along the wall; rails out of the bay across the apron
    shed(sp, o, m, F, near, fog, now){ const K = ENV.bkit, X = o.X, rel = K.rel, lt = sp.side > 0, a = 1 - fog;
      K.Q(X - .7, 0, X, 0, 0, 1, F('#262a32')); K.Q(X, 0, X, o.hW, 0, 1, F(lt ? '#46526e' : '#3a4660')); K.Q(X, 0, X, .32, 0, 1, F('#1e3a7a')); K.Q(X, .32, X, .34, 0, 1, F('#5a7ac0'));
      if(near) for(let c = 0; c < m * 5; c++) K.V(X, .34, o.hW - .1, (c + .5) / (m * 5), .006, F(c % 2 ? '#2e3850' : '#56648a'));
      K.Q(X, 1.3, X, 1.52, 0, 1, F('#ffe6b0')); K.Q(X, 1.28, X, 1.3, 0, 1, F('#20283a')); K.Q(X, 1.52, X, 1.54, 0, 1, F('#20283a')); if(near) for(let c = 0; c <= m * 3; c++) K.V(X, 1.3, 1.52, c / (m * 3), .01, F('#20283a'));
      const d0 = 4, d1 = Math.min(o.len - 4, 14), ta = Math.max(0, (d0 - rel) / m), tb = Math.min(1, (d1 - rel) / m);
      if(tb > ta){ K.Q(X, 0, X, 1.18, ta, tb, F('#07080c')); K.Q(X, 0, X, .16, ta, tb, F('#3a2a1e')); K.Q(X + .4, .06, X + .4, .72, ta + (tb - ta) * .15, ta + (tb - ta) * .8, F('#3a1a18')); K.Q(X + .4, .72, X + .4, .76, ta + (tb - ta) * .15, ta + (tb - ta) * .8, F('#6a3a30'));
        const pul = reduce ? .7 : .55 + .45 * Math.sin(now / 900 + sp.n), tw = ta + (tb - ta) * .55; if(fog < .4){ K.bulb(X + .3, .5, tw, '#e8f4ff', '#8ac8ff', .02, .4 * pul * a); }
        for(const tp of [ta, tb]) if(tp > 0 && tp < 1) K.V(X, 0, 1.22, tp, .05, F('#1a2232')); K.Q(X, 1.18, X, 1.24, ta, tb, F('#1a2232'));
        if(near) for(const L of [-.1, .1]) K.Q(X - .7, 0, X, 0, ta + (tb - ta) * (.45 + L), ta + (tb - ta) * (.45 + L) + .01, F('#6a6e7a')); }
      if(fog < .45 && rel <= 2 && rel + m > 2){ const tc = (2 - rel) / m; K.Q(X, .78, X, 1.08, Math.max(0, tc), Math.min(1, tc + 1.4 / m), F('#e8ecf0')); signAt('saf', X - .02, .82, tc + .7 / m, .5, 1 - fog * 1.4); K.RT(X - .02, .9, tc + .7 / m, .08, .1, F('#1a8a3a')); }
      for(let r = rel - rel % 6 + 3; r < rel + m; r += 6){ const tc = (r - rel) / m; if(tc < 0) continue; K.Q(X - .08, 1.05, X, 1.07, tc - .02, tc + .02, F('#16181e')); K.bulb(X - .08, 1.03, tc, '#ffd070', '#ff9a30', .035, .3 * a); K.cone(X - .08, 1.03, tc, .5, '255,150,60', .05 * a); }
      if(K.end){ K.E(X, 0, X + o.D, o.hW, F('#2a3448')); K.E(X, 0, X + o.D, .32, F('#18306a')); if(near) for(let c = 1; c < 10; c++) K.E(X + o.D * c / 10, .32, X + o.D * c / 10 + .012, o.hW, F('#1e2638'));
        for(let c = 0; c < 4; c++) K.E(X + o.D * (.14 + c * .2), 1.34, X + o.D * (.26 + c * .2), 1.48, F(H0(sp.n + c) > .3 ? '#d8c08a' : '#1a2234')); K.E(X + .2, 0, X + .5, .5, F('#10141c')); K.E(X + .2, .5, X + .5, .52, F('#5a6a8a')); } }
  };
  const dkSm = c => mixc(c, '#05070c', .3);
  // (the building being drawn: drawBld sets it, bldBody draws it inside the kit's fade; no closure per slice)
  let SBsp = null, SBx = 0, SBy = 0, SBuw = 0, SBfog = 0, SBnow = 0; const sbF = c => fc(c, SBfog);
  function drawBld(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K) return; const B = BK[sp.kind], o = sp.o;
    SBsp = sp; SBx = x; SBy = y; SBuw = uw; SBfog = fog; SBnow = now; K.fade(fog, .62, bldBody); }
  function bldBody(){ const K = ENV.bkit, sp = SBsp, x = SBx, y = SBy, uw = SBuw, fog = SBfog, now = SBnow, o = sp.o;
    { const m = K.begin(sp, x, y, uw, fog, sp.lift); if(!m || !K.vis(o.X - 1.2, o.X + o.D)) return; const F = sbF, near = fog < .1 && m === 1;
      if(fog > .2){ const lt = sp.kind === 'eki' ? [.04, .58, F('#ffe2b0')] : sp.kind === 'shed' ? [1.3, 1.52, F('#ffe2a8')] : sp.kind === 'wall' || sp.kind === 'hall' || sp.kind === 'gate' ? null : lit3(sp.n, 0, 7) ? [.3, .5, F(WIN)] : null;
        if(sp.kind !== 'wall') K.far(o, F, lt); else KIND.wall(sp, o, m, F, false, fog, now); return; }
      o.near = near; KIND[sp.kind](sp, o, m, F, near, fog, now); if(sp.kind !== 'wall') K.roof(o, F); } }
  const DRAW_FN = { bld:drawBld, rail:drawRail, cab:drawCab, ktower:drawKTower, pylon:drawPylon, stay:drawStay, anchor:drawAnchor, mikan:drawMikan, terr:drawTerr, house:drawHouse, lamp:drawLamp, crane:drawCrane,
    gantry:drawGantry, hull:drawHull, boat:drawBoat, blight:drawBlight, yardlamp:drawYardLamp, islet:drawIslet };

  // a reflection column hanging below (x, y0): fixed dashes at fixed fractions of its length, widths eased between hashed values on a
  // slow clock, so nothing switches on or off from frame to frame
  function column(x, y0, len, w, seed, now, al0, colHi, colLo){ if(len < PX * 3 || al0 <= .01) return; const n = 10, ph = reduce ? 0 : now / 1500, p0 = Math.floor(ph), f = ph - p0;
    cx.globalCompositeOperation = 'lighter';
    for(let i = 0; i < n; i++){ const v = i / n, yy = snap(y0 + v * len); if(yy >= H) break;
      const h = lerp(H0(seed * 7.1 + i * 3.3 + p0 * .61), H0(seed * 7.1 + i * 3.3 + (p0 + 1) * .61), f), ww = Math.max(PX, w * (1 - v * .5) * (.55 + h * .7)), ox = (H0(seed * 3.7 + i * 1.9) - .5) * w * .4;
      cx.fillStyle = v < .2 ? colHi : colLo; cx.globalAlpha = al0 * (1 - v * .85); cx.fillRect(snap(x + ox - ww / 2), yy, Math.max(PX, snap(ww)), PX); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- road surface, shoulders, deck, land and the sea
  const SEA = '#0a1730', DECKC = ['#20242f', '#222631'], SHC = '#1c1e28', LIP = '#0a0e1a', GR = ['#0c1610', '#0e1912'], TOWN = ['#14161f', '#15171f'], QUAY = '#3a4052', ROCK = ['#101820', '#121b22'];
  let frameNow = -1, moonCol = '#f0ead8', offF = 0, offM = 0;
  function seaRow(s, a, b, fog, now, xa, xb, side){
    // xa..xb: the water span on this row (screen x), side -1 left / 1 right
    const ay = a.y, by = b.y, hz = HZ, h = ay - by; if(xb - xa < 1) return;
    // the islands' mirror, sliced row by row, parallax matched to the backdrop; a slow one-pixel sway per row, no per-frame noise
    const ry = by - hz; if(ry >= 0 && ry < RH * PX){ const sy = Math.floor(ry / PX), shh = Math.max(1, Math.min(RH - sy, Math.ceil(h / PX)));
      for(let q = 0; q < 2; q++){ const img = q ? MREF : FREF, off = q ? offM : offF, sx = ((off + xa / PX) % P + P) % P; cx.drawImage(img, sx, sy, (xb - xa) / PX, shh, xa, by, xb - xa, shh * PX); } }
    // on the bridges the sea lies far below: the near water darker, and the islands' lights reach toward you as broken columns
    if(s.smK > 0 && fog < .6 && h > .3){ cx.fillStyle = '#040a18'; cx.globalAlpha = .5 * (1 - fog / .6); cx.fillRect(Math.floor(xa), by, Math.ceil(xb - xa), h + 1); cx.globalAlpha = 1;
      const ph = reduce ? 0 : now / 1700, p0 = Math.floor(ph), fr = ph - p0, i = s.index, wd = Math.max(PX, snap(PX * (1 + (1 - fog) * 2.5)));
      cx.globalCompositeOperation = 'lighter';
      for(let j = 0; j < LCOL.length; j++){ const lx = LCOL[j][0], X = ((lx - offM + P) % P) * PX; if(X < xa || X > xb - wd) continue;
        const hv = lerp(H0(i * 1.9 + j * 7.3 + p0 * .43), H0(i * 1.9 + j * 7.3 + (p0 + 1) * .43), fr); if(hv < .3) continue;
        cx.globalAlpha = Math.min(.9, (hv - .3) * 1.3 * (.5 + fog)); cx.fillStyle = LCOL[j][1]; cx.fillRect(snap(X + (H0(i + j) < .2 ? PX : 0)), snap(by), wd, Math.max(PX, snap(h * .7))); }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
    // long, low swell catching the sky: one faint dash per row, fixed to the segment (only in the middle distance, where it reads as calm)
    if(fog > .03 && fog < .75 && h > .3 && H0(s.index * 2.3 + side) > .3){ const dw = PX * 2 + a.w * (.15 + H0(s.index * 7.7 + side) * .35), gx = lerp(xa, xb, H0(s.index * 5.1 + side * 3));
      if(gx + dw < xb){ cx.fillStyle = fc('#20345e', fog * .6); cx.fillRect(snap(gx), snap(by), snap(dw), PX); } }
    // the moon's road and the glitter: dashes fixed to this segment, brightness easing on a slow clock
    if(fog > .02 && fog < .97 && h > .3){ const ph = reduce ? 0 : now / 1300, p0 = Math.floor(ph), fr = ph - p0, i = s.index, mt = MOON.t;
      if(mt < .97 && MOON.x > xa && MOON.x < xb){ for(let g = 0; g < (s.smK > 0 ? 5 : 2); g++){ const hv = lerp(H0(i * 7.3 + g * 3 + p0 * .37), H0(i * 7.3 + g * 3 + (p0 + 1) * .37), fr), al = clamp(hv * 1.5 - .3, 0, 1) * .7 * (1 - fog * .3) * (1 - mt * .5);
          const spread = (W * .012 + a.w * .05) * (1 + fog) * (g > 1 ? 2.2 : 1), gx = MOON.x + (H0(i * 5.9 + g) - .5) * 2 * spread, ww = Math.max(PX, snap((PX + a.w * .05) * (.4 + H0(i * 1.7 + g)) * (1.3 - fog * .6)));
          if(al > .03 && gx > xa && gx + ww < xb){ cx.globalAlpha = al; cx.fillStyle = moonCol; cx.fillRect(snap(gx - ww / 2), snap(by), ww, Math.max(PX, snap(h * .6))); } } }
      if(fog > .04 && fog < .7){ for(let g = 0; g < 2; g++){ const hv = lerp(H0(i * 3.1 + g * 5 + side + p0 * .29), H0(i * 3.1 + g * 5 + side + (p0 + 1) * .29), fr), al = clamp(hv * 2 - 1, 0, 1) * .5 * (1 - fog * .5); if(al < .03) continue;
          const gx = lerp(xa, xb, H0(i * 1.3 + g * 9 + side * 2)); cx.globalAlpha = al; cx.fillStyle = H0(i * .7 + g) < .3 ? '#e8f0ff' : '#9ab4e0'; cx.fillRect(snap(gx), snap(by), PX * (H0(i + g) < .4 ? 2 : 1) * (fog < .2 ? 2 : 1), PX); } }
      cx.globalAlpha = 1; } }
  function roadFX(s, a, b, fog, f, now){
    if(s.smU === undefined){ if(SIX < -1) SIX = SI(); ensure(s.index); if(s.smU === undefined) return; }
    if(now !== frameNow){ frameNow = now; moonCol = mixc('#f0ead8', '#ffb070', clamp((MOON.t - .6) * 2.5, 0, 1)); offF = ((((skyPar('far')) / PX) % P) + P) % P; offM = ((((skyPar('mid')) / PX) % P) + P) % P; }
    const ay = a.y, by = b.y - 1, st = s.stripe, kd = s.smK, bridge = kd > 0;
    if(ay - by < .2) return;
    const t = segs[s.index + 1], lwB = t && t.smLw !== undefined ? t.smLw : s.smLw, rwB = t && t.smRw !== undefined ? t.smRw : s.smRw;
    // the sea beyond the land (or the deck) on each side
    const lA = a.x - a.w * s.smLw, lB = b.x - b.w * lwB, rA = a.x + a.w * s.smRw, rB = b.x + b.w * rwB;
    if(Math.max(lA, lB) > 0) seaRow(s, a, b, fog, now, 0, Math.min(lA, lB), -1);
    if(Math.min(rA, rB) < W) seaRow(s, a, b, fog, now, Math.max(rA, rB), W, 1);
    // land or deck between the parapet and the water
    const e = RAILX, eA = a.w * e, eB = b.w * e;
    if(bridge){ const dc = fc(DECKC[st], fog);
      poly(lA, ay, a.x - eA, ay, b.x - eB, by, lB, by, s.smLw > DECK + .1 ? fc(ROCK[st], fog) : dc); poly(a.x + eA, ay, rA, ay, rB, by, b.x + eB, by, s.smRw > DECK + .1 ? fc(ROCK[st], fog) : dc);
      if(s.smLw > DECK + .1){ poly(a.x - a.w * DECK, ay, a.x - eA, ay, b.x - eB, by, b.x - b.w * DECK, by, dc); }
      if(s.smRw > DECK + .1){ poly(a.x + eA, ay, a.x + a.w * DECK, ay, b.x + b.w * DECK, by, b.x + eB, by, dc); }
      if(a.w > 20){ const lc = fc(LIP, fog), lw = a.w * .05, lwb = b.w * .05; for(let sd = -1; sd <= 1; sd += 2){ const xa = a.x + sd * a.w * DECK, xb = b.x + sd * b.w * DECK; poly(xa, ay, xa - sd * lw, ay, xb - sd * lwb, by, xb, by, lc); } } }
    else { const yard = yardAt(s.smU), terr = Math.floor(s.index / 5) % 2;
      poly(lA, ay, a.x - eA, ay, b.x - eB, by, lB, by, fc(yard ? '#1a1c24' : TOWN[st], fog));
      poly(a.x + eA, ay, rA, ay, rB, by, b.x + eB, by, fc(GR[terr], fog));
      // the quay edge: a pale kerb along the water
      if(a.w > 6){ const qw = Math.max(PX * .5, a.w * .05), qwb = Math.max(PX * .4, b.w * .05); poly(lA, ay, lA + qw, ay, lB + qwb, by, lB, by, fc(QUAY, fog)); poly(rA - qw, ay, rA, ay, rB, by, rB - qwb, by, fc('#1c2a24', fog)); } }
    // shoulders: covers the built-in rumble with a concrete strip and a white edge line
    const shc = fc(SHC, fog); poly(a.x - eA, ay, a.x - a.w, ay, b.x - b.w, by, b.x - eB, by, shc); poly(a.x + a.w, ay, a.x + eA, ay, b.x + eB, by, b.x + b.w, by, shc);
    if(a.w > 8){ const lc = fc('#cfd2da', fog), lw = a.w * .025, lwb = b.w * .025; poly(a.x - a.w, ay, a.x - a.w + lw, ay, b.x - b.w + lwb, by, b.x - b.w, by, lc); poly(a.x + a.w - lw, ay, a.x + a.w, ay, b.x + b.w, by, b.x + b.w - lwb, by, lc); }
    // light pools: the parapet lamps on the bridges (warm, along each edge), the street lamps on the islands (cool, from the right)
    const u = s.smU; cx.globalCompositeOperation = 'lighter';
    if(bridge && fog < .85){ const d = Math.min(u % 4, 4 - u % 4); if(d <= 1){ const al = (d ? .035 : .07) * (1 - fog);
        cx.fillStyle = `rgba(255,170,90,${al})`; for(let sd = -1; sd <= 1; sd += 2) poly(a.x + sd * a.w * RAILX, ay, a.x + sd * a.w * .62, ay, b.x + sd * b.w * .62, by, b.x + sd * b.w * RAILX, by, cx.fillStyle); } }
    else if(!bridge && fog < .9){ const d = Math.min(u % 12, 12 - u % 12); if(d <= 2){ const al = [.08, .05, .025][d] * (1 - fog);
        cx.fillStyle = `rgba(170,220,255,${al})`; poly(a.x - a.w * .2, ay, a.x + a.w * 1.05, ay, b.x + b.w * 1.05, by, b.x - b.w * .2, by, cx.fillStyle); } }
    cx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- hooks
  ENV.shimanami = {
    warm(){ for(const _ of ENV.shimanami.warmSteps()); },
    // the same build with stopping points, for the staged warm-up (sundown.html WARM.q); warm() runs it straight through
    *warmSteps(){ SIX = SI(); for(const [s, n] of [[ktower(), 'kt'], [pylon(), 'py'], [anchor(), 'an'], [lamp(), 'lp'], [gantry(), 'ga'], [hull(), 'hu'], [boat(), 'bt'], [blight(), 'bl']]){ fogTintWarm(s, 'sm:' + n, 5, .86); yield; }
      for(let v = 0; v < 3; v++){ fogTintWarm(mikan(v), 'sm:mk' + v, 5, .86); fogTintWarm(islet(v), 'sm:is' + v, 5, .86); yield; } for(let v = 0; v < 2; v++){ fogTintWarm(house(v), 'sm:ho' + v, 5, .86); fogTintWarm(crane(v), 'sm:cr' + v, 5, .86); yield; } warmSigns(); if(!MID){ buildSea(); yield; } ktower(); pylon(); anchor(); for(let v = 0; v < 3; v++){ mikan(v); islet(v); } house(0); house(1); lamp(); crane(0); crane(1); gantry(); hull(); boat(); blight();
      ISHT[2] = (() => { const c = islet(2), d = c.getContext('2d').getImageData(ISW - 25, 0, 1, ISH).data; for(let y = 0; y < ISH; y++) if(d[y * 4 + 3]) return ISH - y - .5; return 10; })();
      const up = c => cx.drawImage(c, 0, 0, PX, PX); cx.save(); for(const k in SPR) if(k.startsWith('sm_')) up(SPR[k]); up(FAR); up(MID); up(FREF); up(MREF); cx.restore(); },
    road:['#191b26', '#1b1d29'],
    lampCol:'#6a5038',
    lit(){ return 0; },
    place,
    draw(sp, x, y, uw, fog, now, sk){ lastLow = sk.low; const fn = DRAW_FN[sp.type]; if(!fn) return; if(sp.type === 'cab' || sp.type === 'stay'){ const ea = edgeA(fog); if(ea <= 0) return; cx.globalAlpha = ea; fn(sp, x, y, uw, fog, now); cx.globalAlpha = 1; } else fn(sp, x, y, uw, fog, now); },   // cables fade in with their towers
    roadFX,
    backdrop(o){ const { hz, now, sk } = o; lastLow = sk.low; if(!MID) buildSea();
      const oF = ((((skyPar('far')) / PX) % P) + P) % P, oM = ((((skyPar('mid')) / PX) % P) + P) % P;
      // the still sea to the horizon, a shade paler in steps toward the skyline
      const seaLo = mixc(SEA, sk.low, .5); cx.fillStyle = seaLo; cx.fillRect(0, hz, W, H - hz);
      for(let q = 0; q < 6; q += 2){ const y0 = SEA_ST[q], al = SEA_ST[q + 1]; cx.fillStyle = mixc(seaLo, sk.low, al); cx.fillRect(0, hz + y0 * PX, W, PX * (y0 === 5 ? 6 : 3)); }
      // far ranges, then the near islands
      cx.drawImage(FAR, oF, 0, W / PX, FH, 0, hz - FH * PX + PX, W, FH * PX);
      cx.drawImage(MID, oM, 0, W / PX, MH, 0, hz - MH * PX + PX, W, MH * PX);
      // red aviation lights on the far bridge towers and cranes, slowly blinking (steady with reduced motion)
      const on = reduce ? 1 : (Math.sin(now / 700) > -.2 ? 1 : .25); cx.fillStyle = '#ff4a3a'; cx.globalAlpha = on;
      for(const [bx, by] of BEACON){ let sx = ((bx - oM) % P + P) % P; if(sx * PX > W) continue; cx.fillRect(snap(sx * PX), hz - MH * PX + PX + by * PX, PX, PX); } cx.globalAlpha = 1;
      cx.fillStyle = 'rgba(150,175,220,.3)'; cx.fillRect(0, hz, W, PX);
      return true; },
    overlay(al, now){ const hz = HZ;
      // a thin haze lying on the water at the horizon, in dither-width steps, drifting slowly
      for(let q = 0; q < 10; q += 5){ const aa = HAZE_B[q], y0 = HAZE_B[q + 1], amp = HAZE_B[q + 2], sp2 = HAZE_B[q + 3], thk = HAZE_B[q + 4]; cx.fillStyle = `rgba(130,150,200,${aa * al})`;
        for(let x = 0; x < W; x += PX * 4){ const n = Math.sin((x + now * sp2 * 20 + skyOff * 200) * .011) * .6 + Math.sin((x - now * sp2 * 33) * .027 + 2) * .4, top = snap(hz + y0 * PX - (n + 1) * amp * PX * .5), bot = snap(hz + (y0 + thk) * PX + n * PX); if(bot > top) cx.fillRect(x, top, PX * 4, bot - top); } } },
    // for set pieces: what the road is doing at segment i ('island', 'suspension' or 'stayed')
    kind(i){ const s = segs[i]; return !s || s.smK === undefined ? null : ['island', 'suspension', 'stayed'][s.smK]; }
  };
  // where this road's barrier is drawn, for the collider (half-road widths)
  ENV.shimanami.barrier = RAILX;
  // its shoulders cover the engine's red and white rumble blocks: the engine does not draw its far kerb rows here (laneMark)
  ENV.shimanami.kerbs = false;
})();
