/* Sundown environment: Harbour Line. See env/README.md for the hooks.
   An elevated expressway along a night harbour: the city on the left behind a concrete sound barrier, a water channel and a container quay
   with gantry cranes on the right, a lit lattice tower across the bay, sodium lamps in pairs with orange pools and wet streaks on the asphalt.

   Reference rules (studied, then drawn from scratch):
   - Streets of Rage 2 (Sega, 1992), night pier stage: night is blue, not black; lamp globes get a bright rim and a stepped halo; dark rails and
     posts in the foreground frame the scene; the far skyline is a flat haze band with sparse star-like window dots. -> cool navy base,
     stepped glows, sparse warm windows, the parapet rail as a foreground frame.
   - Rad Mobile (Sega, 1990): the road is walled by a continuous concrete barrier with a bright top band and a darker face; the walls give speed
     and perspective. -> a continuous parapet drawn per segment with a lit cap, panel joints and lamp-warmed faces.
   - Katana Zero (2019) neon-noir: lights are few and saturated against desaturated surroundings; reflections are vertical streaks broken into
     horizontal bands. -> sodium orange as the one warm key, cyan/red only as tiny accents, wet reflections as broken vertical dashes.
   - Super Hang-On / OutRun (Sega, 1987/86): roadside objects repeat in a strict rhythm (lamp, lamp, lamp) and the rhythm itself sells speed;
     big set pieces (gantries) pass overhead every so often. -> lamps every 12 segments in pairs, a sign gantry every 150. */
"use strict";
(() => {
  const SP = {};   // our own sprite cache (also mirrored into SPR keys with an hb_ prefix so the game can see them)
  // ---------------------------------------------------------------- tiny pixel canvas helpers
  function pix(key, w, h, fn){ const kk = 'hb_' + key; if(SPR[kk]) return SPR[kk]; const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
    const P = { k, w, h,
      px(x, y, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col){ k.fillStyle = col; k.fillRect(x, y, ww, hh); },
      line(x0, y0, x1, y1, col){ k.fillStyle = col; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for(;;){ k.fillRect(x0, y0, 1, 1); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } } };
    fn(P); return SPR[kk] = c; }
  const H0 = n => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };

  // ---------------------------------------------------------------- palette (cool night base, one warm key)
  const SODIUM = '#ffb35a', SODIUM_HI = '#fff0c4';
  const STEEL = { O:'#0a0c18', D:'#161c30', M:'#26304e', L:'#4a5a88', H:'#7a8cbc' };
  const CONC = { O:'#100f1a', D:'#1e1e2e', M:'#2c2c42', L:'#4a4a66', H:'#77779a' };
  const BOX = [['#200c0c', '#4a1a16', '#7a2e20', '#a8503a'], ['#0a1028', '#18284e', '#284480', '#4a70b0'], ['#081a1c', '#123234', '#1e5250', '#367c74'],
    ['#221e1a', '#4a443a', '#787060', '#a89c80'], ['#0c180e', '#18321e', '#28502e', '#44784a'], ['#24140a', '#4e2c12', '#7e4a1a', '#b07028']];

  // fog colour cache: fogged palette colours, rebuilt only when the fog colour changes
  let fogKey = '', fogC = {};
  const fc = (col, fog, low) => { if(low !== fogKey){ fogKey = low; fogC = {}; } const q = Math.round(fog * 12), key = col + q; return fogC[key] || (fogC[key] = mixc(col, low, q / 12 * .85)); };
  let lastLow = '#24103a';

  // fogged copies come from the engine's bounded fog-tint cache (one canvas per sprite and step, built in warm(), re-tinted in place as the night moves on)
  function fogged(spr, name, fog, low){ return fogTint(spr, 'hb:' + name, Math.min(4, Math.round(fog * 5)), 4, low, .82); }
  if(document.fonts) document.fonts.load('10px DotGothic16').catch(() => {});

  // ---------------------------------------------------------------- sprites
  // sodium streetlamp: tapered pole lit from the left, gooseneck arm to the road, a flat head with a glowing lens. Arm points right (road side
  // for a left-hand lamp); mirrored for the right side.
  const lampSprite = () => pix('lamp', 20, 58, P => { const { O, D, M, L } = STEEL;
    P.rect(1, 8, 4, 50, O); P.rect(2, 8, 1, 50, L); P.rect(3, 8, 1, 50, M); P.rect(2, 30, 2, 1, D); P.rect(0, 52, 6, 6, O); P.rect(1, 52, 1, 5, L); P.rect(2, 52, 3, 5, D); P.rect(1, 52, 4, 1, M);
    // gooseneck
    P.rect(2, 5, 3, 3, O); P.px(3, 6, M); P.px(2, 7, L); P.rect(4, 3, 3, 3, O); P.px(5, 4, M); P.rect(6, 2, 8, 3, O); P.rect(6, 3, 8, 1, M); P.rect(6, 2, 8, 1, O);
    // head
    P.rect(12, 1, 8, 4, O); P.rect(13, 2, 6, 1, L); P.rect(13, 3, 6, 1, M); P.rect(13, 5, 6, 1, '#c87a2e'); P.rect(14, 5, 4, 1, '#ffe2a0'); P.px(15, 5, SODIUM_HI); P.px(16, 5, SODIUM_HI); });
  // the gantry: a box truss across the road on two posts, two green expressway signs hung from it with their own small down-lights
  const SIGNS = [[14, 40, '湾岸線', 'WANGAN'], [60, 38, '芝浦', 'SHIBAURA']];
  function gantrySprite(){ const key = 'gantry';
    return pix(key, 112, 60, P => { const { O, D, M, L, H } = STEEL;
      for(const x of [3, 104]){ P.rect(x, 10, 5, 50, O); P.rect(x + 1, 10, 1, 50, L); P.rect(x + 2, 10, 2, 50, M); P.rect(x - 1, 56, 7, 4, O); P.rect(x, 56, 1, 3, L); }
      // truss: top and bottom chords, zigzag web
      P.rect(0, 6, 112, 3, O); P.rect(0, 6, 112, 1, H); P.rect(0, 7, 112, 1, M); P.rect(0, 16, 112, 3, O); P.rect(0, 16, 112, 1, L);
      for(let x = 2; x < 110; x += 8){ P.line(x, 9, x + 4, 15, D); P.line(x + 4, 9, x + 8, 15, D); P.px(x + 4, 9, L); }
      // signs
      const sign = (x0, w, main, sub, arrow) => { P.rect(x0 - 1, 19, w + 2, 22, '#d8dccc'); P.rect(x0, 20, w, 20, '#136a40'); P.rect(x0, 20, w, 1, '#2a8c5a'); P.rect(x0, 39, w, 1, '#0a4428');
        P.rect(x0 + 4, 17, 1, 3, O); P.rect(x0 + w - 5, 17, 1, 3, O);
        if(arrow){ const ax = x0 + w - 7; P.rect(ax, 25, 2, 12, '#f0f0e4'); P.rect(ax - 2, 26, 6, 1, '#f0f0e4'); P.rect(ax - 1, 25, 4, 1, '#f0f0e4'); P.px(ax, 24, '#f0f0e4'); P.px(ax + 1, 24, '#f0f0e4'); }
        // down-light housings on the top chord
        P.rect(x0 + 6, 18, 3, 1, H); P.rect(x0 + w - 9, 18, 3, 1, H); };
      for(const [x0, w] of SIGNS) sign(x0, w, '', '', true);
    }); }
  // container stacks on the quay, 4 columns x 1-3 tiers, corrugated, a floodlit top edge; v picks a layout
  const stackSprite = v => pix('stack' + v, 52, 24, P => { let sd = v * 977 + 5; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for(let c = 0; c < 4; c++){ const tiers = 1 + ((R() * 3) | 0), x0 = c * 13;
      for(let t = 0; t < tiers; t++){ const [O, D, M, L] = BOX[(R() * BOX.length) | 0], y0 = 24 - (t + 1) * 7;
        P.rect(x0, y0, 13, 7, O); P.rect(x0 + 1, y0 + 1, 11, 5, M);
        for(let x = x0 + 2; x < x0 + 12; x += 2) P.rect(x, y0 + 1, 1, 5, D);   // corrugation
        P.rect(x0 + 1, y0 + 1, 1, 5, L);   // lit left edge
        if(t === tiers - 1){ P.rect(x0 + 1, y0, 11, 1, L); P.rect(x0 + 2, y0, 9, 1, mixc(L, SODIUM_HI, .35)); }   // floodlit roof
        P.rect(x0 + 1, y0 + 6, 11, 1, O); } } });
  // ship-to-shore container crane: portal legs on the quay, a lattice boom reaching out over the water toward the road, A-frame and stays,
  // machinery house at the back, a lit operator cab. Light from the upper left. Red aviation lights and floodlights are drawn live.
  const CRANE_LIGHTS = { red:[[52, 1], [1, 36], [72, 31]], flood:[[12, 41], [30, 41], [46, 46]] };
  const craneSprite = () => pix('crane', 74, 100, P => { const { O, D, M, L, H } = STEEL, RED = '#7a2a30', REDL = '#b04a50', WHT = '#9a98b0', WHTL = '#c8c6d8';
    // portal legs, a portal beam and one sill; bogies on the rail
    for(const x of [40, 60]){ P.rect(x, 40, 5, 57, O); P.rect(x + 1, 40, 1, 56, L); P.rect(x + 2, 40, 2, 56, M); P.rect(x + 3, 40, 1, 56, D); }
    P.rect(40, 40, 25, 5, O); P.rect(41, 41, 23, 1, H); P.rect(41, 42, 23, 2, M); P.rect(40, 70, 25, 3, O); P.rect(41, 70, 23, 1, L);
    P.rect(37, 95, 11, 5, O); P.rect(57, 95, 11, 5, O); P.rect(38, 95, 9, 1, M); P.rect(58, 95, 9, 1, M); P.px(39, 98, D); P.px(45, 98, D); P.px(59, 98, D); P.px(65, 98, D);
    // the boom: a box girder with a bright top edge; lattice hinted by dark ticks; red and white bands at the seaward tip
    P.rect(0, 34, 74, 6, O); P.rect(1, 35, 73, 1, H); P.rect(1, 36, 73, 1, L); P.rect(1, 37, 73, 2, M);
    for(let x = 3; x < 72; x += 5){ P.px(x, 37, D); P.px(x + 1, 38, D); }
    for(let x = 1; x < 25; x += 6){ const red = (x / 6 | 0) % 2 === 0; P.rect(x, 35, 6, 1, red ? REDL : WHTL); P.rect(x, 36, 6, 3, red ? RED : WHT); }
    // A-frame, apex cap, stays
    P.line(46, 34, 51, 4, O); P.line(47, 34, 52, 4, L); P.line(59, 34, 54, 4, O); P.line(58, 34, 53, 4, M);
    P.rect(49, 1, 7, 4, O); P.rect(50, 2, 5, 1, H); P.rect(50, 3, 5, 1, M);
    P.line(50, 3, 2, 34, D); P.line(55, 3, 72, 30, D);
    // machinery house with one lit window
    P.rect(58, 26, 16, 8, O); P.rect(59, 27, 14, 6, M); P.rect(59, 27, 14, 1, H); P.rect(59, 27, 1, 6, L); P.rect(72, 27, 1, 6, D); P.rect(66, 29, 2, 2, '#ffd890'); P.px(66, 29, SODIUM_HI);
    // trolley + operator cab under the boom, lit
    P.rect(16, 40, 11, 2, O); P.rect(17, 42, 9, 6, O); P.rect(18, 43, 7, 3, '#ffcf80'); P.rect(18, 43, 7, 1, SODIUM_HI); P.rect(18, 46, 7, 1, '#7a4a28');
    // floodlight housings
    for(const [fx, fy] of CRANE_LIGHTS.flood){ P.rect(fx - 1, fy - 1, 3, 1, O); P.px(fx, fy, '#ffe6b0'); } });
  // the landmark: a lattice tower across the bay, floodlit orange; two observation decks with white windows; a tall antenna
  // a yakatabune: a low Tokyo pleasure boat moored in the channel, a long cabin of lit paper windows and a row of red lanterns under the eaves
  const boatSprite = () => pix('boat', 50, 18, P => { const O = '#0c0a14', HULL = '#1e1a2a', HULLL = '#3e3854', WALL = '#2a1c22', ROOF = '#1a1420', ROOFL = '#6a4a4a';
    P.rect(2, 12, 46, 5, O); P.rect(3, 12, 44, 1, HULLL); P.rect(3, 13, 44, 3, HULL); P.rect(0, 10, 4, 4, O); P.px(1, 11, HULLL); P.px(2, 11, HULL); P.rect(46, 11, 3, 3, O);
    P.rect(5, 5, 40, 7, O); P.rect(6, 6, 38, 5, WALL);
    for(let x = 7; x < 43; x += 3){ P.rect(x, 7, 2, 3, '#ffd890'); P.px(x, 7, '#fff2c8'); P.px(x + 1, 9, '#d8904a'); }
    P.rect(3, 3, 44, 2, O); P.rect(4, 2, 42, 1, ROOF); P.rect(4, 3, 42, 1, ROOFL); P.px(3, 2, ROOF); P.px(46, 2, ROOF); P.px(2, 1, ROOFL); P.px(47, 1, ROOFL);
    for(let x = 6; x < 45; x += 4){ P.px(x, 5, '#ff4a3a'); P.px(x, 6, '#a01e1e'); }
    P.rect(45, 0, 1, 3, O); P.px(45, 0, '#fff2c8'); });
  const BOAT = 70;
  const towerSprite = () => pix('tower', 33, 96, P => { const cxp = 16, top = 12;
    for(let y = top; y < 96; y++){ const v = (y - top) / (96 - top), hw = 1 + Math.pow(v, 2.3) * 15;
      for(let x = 0; x < 33; x++){ const dx = x - cxp, a = Math.abs(dx);
        if(a > hw) continue; const left = dx < 0;
        const edge = a > hw - 1.6, web = ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) && a < hw - 1;
        if(y > 84 && a < hw - 3.5 - (y - 84) * .2) continue;   // arched opening at the foot
        if(edge) P.px(x, y, left ? '#ffa860' : '#c8482a'); else if(web) P.px(x, y, left ? '#c8582e' : '#82281e');
        else if(a < hw - 1 && (y % 6 === 0)) P.px(x, y, left ? '#a03e26' : '#5a1c18'); } }
    // decks
    const deck = (y, hw, h) => { P.rect(cxp - hw, y, hw * 2 + 1, h, '#2a1820'); P.rect(cxp - hw, y, hw * 2 + 1, 1, '#ff9a5a'); for(let x = cxp - hw + 1; x < cxp + hw; x += 2) P.px(x, y + 1 + (h > 3 ? 1 : 0), x < cxp ? '#fff4d8' : '#ffd890'); P.rect(cxp - hw, y + h - 1, hw * 2 + 1, 1, '#1a0e14'); };
    deck(58, 6, 4); deck(32, 3, 3);
    // antenna: white and red bands
    for(let y = 0; y < top + 1; y++) P.px(cxp, y, (y >> 1) % 2 ? '#f4ecdf' : '#e8443a'); P.rect(cxp - 1, top - 2, 3, 2, '#c8482a'); });
  // far shore skyline strip across the bay, periodic; dark blue-violet, sparse warm windows, a few tiny harbour cranes, rooftop signs
  const SKY_W = 420, SKY_H = 64;
  const AVIA = [];
  const shoreSprite = () => pix('shore', SKY_W, SKY_H, P => { AVIA.length = 0;
    const body = ['#121630', '#161a38', '#1a1c3e'], edge = '#2a3060', top = '#3a4278';
    let x = 0, i = 0;
    while(x < SKY_W){ const w = 8 + ((H0(i) * 18) | 0), tall = H0(i * 3.3) > .86, h = tall ? 34 + H0(i * 7) * 22 : 8 + H0(i * 5.1) * 26, y0 = SKY_H - (h | 0), col = body[i % 3];
      P.rect(x, y0, w, SKY_H - y0, col); P.rect(x, y0, 1, SKY_H - y0, edge); P.rect(x, y0, w, 1, top);
      for(let yy = y0 + 3; yy < SKY_H - 2; yy += 3) for(let xx = x + 2; xx < x + w - 1; xx += 2) { const r = H0(xx * 13.1 + yy * 7.7); if(r > .86) P.px(xx, yy, r > .975 ? '#bfe6ff' : r > .93 ? '#ffd890' : '#a87a48'); }
      if(tall || h > 28) AVIA.push([x + (w >> 1), y0 - 1]);
      if(tall) { P.rect(x + (w >> 1), y0 - 4, 1, 4, edge); }
      x += w + (H0(i * 2.2) > .7 ? 2 + ((H0(i * 9) * 6) | 0) : 0); i++; }
    // small cranes standing on the far quay
    for(const cx0 of [60, 72, 230, 244, 340]){ const b = SKY_H - 14; P.rect(cx0, b - 16, 1, 16, '#0c0e22'); P.rect(cx0 + 6, b - 16, 1, 16, '#0c0e22'); P.rect(cx0 - 10, b - 16, 22, 1, '#20264c'); P.line(cx0 + 3, b - 23, cx0 - 10, b - 16, '#181c3c'); P.line(cx0 + 3, b - 23, cx0 + 12, b - 16, '#181c3c'); AVIA.push([cx0 + 3, b - 24]); }
    // a low band of waterfront warehouses with a lit quay line
    P.rect(0, SKY_H - 6, SKY_W, 6, '#0c0e22'); for(let xx = 0; xx < SKY_W; xx += 1) if(H0(xx * 3.7) > .55) P.px(xx, SKY_H - 6, H0(xx) > .8 ? '#ffcf80' : '#a06a3a'); });
  // ---------------------------------------------------------------- layout
  const LAMP = 12, GANTRY = 300, CRANE = 64;
  const lampD = i => Math.min(i % LAMP, LAMP - i % LAMP);
  const WALL_L = .3, WALL_R = .06, RAIL_R = .2;   // in half-road widths: a sound barrier on the city side; a kerb and an open rail on the water side

  // a far segment flatter than a pixel still draws (as Bay's railing does): skipping it left most of the far barrier out, and which pieces
  // were left out changed as you rode, so the far wall blinked. Its thin bands keep a whole pixel for the same reason.
  // far away one wall slice spans 2 (past ~145 segments) or 4 (past ~210) segments, anchored to the world (k % m), its far end the last
  // segment's: each is a fraction of a pixel deep there, so the merge never shows, and the far walls cost a half or a quarter of the quads
  /* (2026-11-24, research/sundown-craft/aquaportal.md) A slice off a multiple of m used to skip itself, trusting its run's first segment;
     but that one is nearer, so its fog can pick a smaller m (it then drew only itself), or it carries no such wall (a border blend, a
     side lane), or its run's end is not in front of the camera: the skipped segments drew nothing, a hole of 1-3 segments at each tier
     boundary that moved with the camera. Now a segment skips only when its run's first segment will draw the whole run. */
  const wallM = fog => { const fp = fogPx(fog); return fp > .7 ? 4 : fp > .4 ? 2 : 1; };
  function wallHas(t, x){ const L = t.sprites; for(let n = 0; n < L.length; n++){ const q = L[n]; if(q.type === 'wall' && q.x === x && !q.ls) return true; } return false; }
  function wallFull(g, m, x){ for(let j = g; j < g + m; j++){ const t = segs[j]; if(!t || !wallHas(t, x)) return false; } const t = segs[g + m - 1]; return t.p2.screen.scale > 0 && t.p2.camera.z > 0; }
  function wallRun(k, m, x){ if(m === 1) return 1; const g = k - k % m; if(g === k) return wallFull(k, m, x) ? m : 1;
    const t = segs[g], n = g - segAt(position).index; if(!t || !(t.p1.screen.scale > 0) || t.p1.camera.z <= DEPTH || n < 1 || n > DRAW - 3) return 1;
    return wallM(clamp(Math.pow(n / DRAW, 1.6), 0, 1)) === m && wallFull(g, m, x) ? 0 : 1; }
  function drawWall(sp, x, y, uw, fog, now, sk){ const m = wallRun(sp.k, wallM(fog), sp.x); if(!m) return; const s = segs[sp.k + m - 1]; if(!s || !s.p2.screen.scale) return; const q = s.p2.screen, fx = q.x + sp.x * q.w, fy = q.y;   /* (no 'far end below the near end' early-out: over a crest seen from below it dropped walls whose tops stand above the crest, and a run's start dropping out left its whole run empty; the segment's clip hides what the crest covers) */
    const left = sp.x < 0, low = sk.low, warm = (s.lit || 0) * .5;
    if(left){ const h = uw * WALL_L, fh = q.w * WALL_L;
      const face = fc(mixc(CONC.M, '#8a5a3a', warm), fog, low), cap = fc(mixc(CONC.H, '#ffcf90', warm), fog, low), dark = fc(CONC.D, fog, low);
      poly(x, y + 1, x, y - h, fx, fy - fh, fx, fy + 1, face);
      // a dark rib low on the face and the lit cap on top
      const bh = Math.max(PX, h * .12), fbh = Math.max(PX, fh * .12);
      poly(x, y - h * .3, x, y - h * .3 - bh, fx, fy - fh * .3 - fbh, fx, fy - fh * .3, dark);
      poly(x, y - h, x, y - h - Math.max(PX, h * .1), fx, fy - fh - Math.max(PX, fh * .1), fx, fy - fh, cap);
      // joints and posts every 6 segments: a 2-segment period aliases (strobes) near the camera at full speed, ~1 segment per frame
      if(sp.k % 6 === 0 && fog < .7){ cx.fillStyle = fc(CONC.O, fog, low); pxRect(x, y - h, PX, h); }   // panel joint
      return; }
    // water side: a low kerb and an open steel rail on posts, so the harbour shows through (the Streets of Rage 2 pier rail as a foreground frame)
    const h = uw * WALL_R, fh = q.w * WALL_R; poly(x, y + 1, x, y - h, fx, fy - fh, fx, fy + 1, fc(mixc(CONC.L, '#a07048', warm), fog, low));
    if(fog > .85) return;
    const rh = uw * RAIL_R, frh = q.w * RAIL_R, t = Math.max(PX, uw * .014), ft = Math.max(PX, q.w * .014);
    poly(x, y - rh, x, y - rh - t, fx, fy - frh - ft, fx, fy - frh, fc(mixc(STEEL.H, '#ffcf90', warm), fog, low));
    poly(x, y - rh * .5, x, y - rh * .5 - t * .8, fx, fy - frh * .5 - ft * .8, fx, fy - frh * .5, fc(STEEL.M, fog, low));
    if(sp.k % 6 === 0){ cx.fillStyle = fc(STEEL.D, fog, low); pxRect(x, y - rh, Math.max(PX, uw * .016), rh); } }

  function drawLamp(sp, x, y, uw, fog, now, sk){ const left = sp.x < 0, spr = fogged(lampSprite(), 'lamp', fog, sk.low), k = uw * 1.55 / spr.height, base = y - uw * (left ? WALL_L : WALL_R), sf = scaleFade(k, 6, 10), ga = cx.globalAlpha;
    if(sf <= 0) return; cx.globalAlpha = ga * sf;
    if(!left){ cx.save(); cx.translate(x, 0); cx.scale(-1, 1); blit(spr, 0, base, k); cx.restore(); } else blit(spr, x, base, k);
    const hx0 = x + (left ? 1 : -1) * 6 * k, hy = base - spr.height * k + 6 * k, a = 1 - fog * .7;
    // the light cone: two stepped additive bands down to the road (no smooth gradient)
    if(fog < .8 && fog > .03){ cx.globalCompositeOperation = 'lighter';
      for(const [wt, wb, al] of [[3, .46, .045], [1.5, .22, .06]]){ cx.fillStyle = `rgba(255,150,60,${al * (1 - fog)})`; const tw = wt * k, bw = uw * wb;
        poly(hx0 - tw, hy, hx0 + tw, hy, hx0 + bw, y, hx0 - bw, y, cx.fillStyle); }
      cx.globalCompositeOperation = 'source-over'; }
    glow(hx0, hy + k, Math.min(uw * .26 + 2, H * .12), SODIUM, .5 * a); cx.globalAlpha = ga; }

  function drawGantry(sp, x, y, uw, fog, now, sk){ const spr = fogged(gantrySprite(), 'gantry', fog, sk.low), k = uw * 2.8 / spr.width, a = 1 - fog * .7; blit(spr, x, y, k);
    const top = y - spr.height * k;
    // sign text: drawn live in the pixel font at screen resolution when big enough to read; far away, two white bars stand in for it
    for(const [x0, w, main, sub] of SIGNS){ const lx = snap(x + (x0 + 3 - 56) * k), ty = snap(top + 21 * k), col = fog > .3 ? mixc('#f0f0e4', '#136a40', fog * .6) : '#f0f0e4';
      if(k * 9 >= 11){ cx.fillStyle = col; cx.textBaseline = 'top'; cx.textAlign = 'left'; cx.font = `${Math.round(k * 9)}px DotGothic16, monospace`; cx.fillText(main, lx, ty);
        cx.font = `${Math.round(k * 5.5)}px DotGothic16, monospace`; cx.fillText(sub, lx, ty + k * 10.5); cx.textBaseline = 'alphabetic'; }
      else { cx.fillStyle = col; pxRect(lx, ty + k, w * .5 * k, Math.max(PX, 3 * k)); pxRect(lx, ty + k * 10.5, w * .6 * k, Math.max(PX, 1.5 * k)); } }
    if(fog < .8){ for(const sx of [20, 47, 66, 90]) glow(x + (sx - 56) * k, top + 18 * k, uw * .1 + 1, '#e8f8e0', .3 * a); } }

  function drawStack(sp, x, y, uw, fog, now, sk){ blit(fogged(stackSprite(sp.v), 'stack' + sp.v, fog, sk.low), x, y, uw * 1.5 / 52); }

  // the crane drawn at screen resolution (2026-11-20, buildings3d round 4). Its portal and boom stand in a plane facing the road, so the card
  // was the right shape, but beside you each art pixel grew into a block. Past ~1.3 screen pixels per art pixel the same design is drawn in
  // its own art coordinates with every edge on the screen grid: outlines one screen pixel thin; the legs with a moonlit strip, panel seams
  // and a ladder; the boom's lattice as one-pixel web lines over its chords; the A-frame members as true diagonals; the stays as one-pixel
  // cables; louvres on the machinery house; mullions and a driver in the cab. The extra detail fades in between 1.3 and 2 screen pixels per
  // art pixel, so the switch from the sprite does not pop.
  let CX0 = 0, CY0 = 0, CK = 1, CF = c => c;
  const cX = ax => CX0 + ax * CK, cY = ay => CY0 + ay * CK;
  function cR(ax0, ay0, ax1, ay1, col){ const a = snap(cX(ax0)), b = snap(cX(ax1)), c = snap(cY(ay0)), d = snap(cY(ay1)); if(b > a && d > c && b > 0 && a < W && d > 0 && c < H){ cx.fillStyle = CF(col); cx.fillRect(a, c, b - a, d - c); } }
  // a hairline row or column: one screen pixel thick at an art coordinate
  function cHz(ax0, ax1, ay, col){ const a = snap(cX(ax0)), b = snap(cX(ax1)), y = snap(cY(ay)); if(b > a && y > -PX && y < H && b > 0 && a < W){ cx.fillStyle = CF(col); cx.fillRect(a, y, b - a, PX); } }
  function cVt(ax, ay0, ay1, col){ const x = snap(cX(ax)), a = snap(cY(ay0)), b = snap(cY(ay1)); if(b > a && x > -PX && x < W && b > 0 && a < H){ cx.fillStyle = CF(col); cx.fillRect(x, a, PX, b - a); } }
  // a straight member between two art points, w screen pixels thick (at least one)
  function cL(ax0, ay0, ax1, ay1, w, col){ const x0 = cX(ax0), y0 = cY(ay0), x1 = cX(ax1), y1 = cY(ay1), t = Math.max(PX, w); col = CF(col);
    if(Math.abs(x1 - x0) < Math.abs(y1 - y0)) poly(x0 - t / 2, y0, x0 + t / 2, y0, x1 + t / 2, y1, x1 - t / 2, y1, col); else poly(x0, y0 - t / 2, x1, y1 - t / 2, x1, y1 + t / 2, x0, y0 + t / 2, col); }
  // a sloping member of art width aw between y = ya (x from xa) and y = yb (x from xb), filled as one quad
  const cM = (xa, ya, xb, yb, aw, col) => poly(cX(xa), cY(ya), cX(xa + aw), cY(ya), cX(xb + aw), cY(yb), cX(xb), cY(yb), CF(col));
  function craneGeo(x0, y0, k, F, a){ CX0 = x0; CY0 = y0; CK = k; CF = F; const { O, D, M, L, H: Hh } = STEEL, RED = '#7a2a30', REDL = '#b04a50', WHT = '#9a98b0', WHTL = '#c8c6d8', p = PX / k;
    const ex = clamp((k / PX - 1.3) / .7, 0, 1), ga = cx.globalAlpha, extra = fn => { if(ex <= 0) return; cx.globalAlpha = ga * ex; fn(); cx.globalAlpha = ga; };
    // the stays first (the boom and the A-frame draw over their ends): one-pixel cables from the apex to the boom tip and the backstay
    cL(50, 3, 2, 34, PX, D); cL(55, 3, 72, 30, PX, D);
    extra(() => { cL(50.5, 3.4, 26, 34, PX, D); cL(50, 3, 2, 34, PX, mixc(D, L, .35)); cL(55, 3, 72, 30, PX, mixc(D, L, .35)); });
    // portal legs: a one-pixel outline, the moonlit strip, the body, the shadow strip; panel seams with a glint under them, a ladder on the land leg
    for(const lx of [40, 60]){ cR(lx, 40, lx + 5, 97, O); cR(lx + p, 40, lx + 2, 96, L); cR(lx + 2, 40, lx + 3, 96, M); cR(lx + 3, 40, lx + 5 - p, 96, D);
      extra(() => { for(let ay = 52; ay < 94; ay += 10){ cHz(lx + p, lx + 5 - p, ay, O); cHz(lx + p, lx + 2.4, ay + p, Hh); } }); }
    extra(() => { cVt(65.4, 46, 95, O); cVt(66.9, 46, 95, O); for(let ay = 47; ay < 95; ay += 1.6) cHz(65.4, 66.9 + p, ay, D); cHz(65, 67.4, 46, O); });
    // the portal beam and the sill: a lit top edge, the body, a dark underside
    cR(40, 40, 65, 45, O); cR(41, 41, 64, 42, Hh); cR(41, 42, 64, 44, M); extra(() => cHz(41, 64, 44, D));
    cR(40, 70, 65, 73, O); cR(41, 70, 64, 71, L); extra(() => { cHz(41, 64, 72, D); for(const bx of [45, 52.5, 60]) cVt(bx, 71, 73, D); });
    // bogies on the rail, their wheels
    for(const bx of [37, 57]){ cR(bx, 95, bx + 11, 100, O); cR(bx + 1, 95, bx + 10, 96, M); cR(bx + 2, 98, bx + 3, 99, D); cR(bx + 8, 98, bx + 9, 99, D);
      extra(() => { for(let w = 0; w < 4; w++){ const wx = bx + 1.6 + w * 2.6; cR(wx, 97.4, wx + 1.6, 99.6, D); cHz(wx + .2, wx + 1.4, 97.4, L); } cHz(bx + 1, bx + 10, 96, D); }); }
    // the boom: a box girder with a bright top edge over its lattice, the red and white bands at the seaward tip
    cR(0, 34, 74, 40, O); cR(1, 34 + p, 74, 36, Hh); cR(1, 36, 74, 37, L); cR(1, 37, 74, 39, M);
    for(let bx = 3; bx < 72; bx += 5){ cR(bx, 37, bx + 1, 38, D); cR(bx + 1, 38, bx + 2, 39, D); }
    for(let bx = 1; bx < 25; bx += 6){ const red = (bx / 6 | 0) % 2 === 0; cR(bx, 34 + p, bx + 6, 36, red ? REDL : WHTL); cR(bx, 36, bx + 6, 39, red ? RED : WHT); }
    extra(() => { for(let bx = 28; bx < 72; bx += 5){ cL(bx, 37, bx + 2.5, 39, PX, D); cL(bx + 2.5, 39, bx + 5, 37, PX, D); cVt(bx, 37, 39, D); } cHz(25, 74, 37, O); cHz(1, 74, 39 - p, L); cVt(25, 34 + p, 39, O); });
    // the A-frame: two sloping members, the land one lit on its inner face, the cap over the apex with its sheaves
    cM(46, 34, 51, 4, 2, O); cM(46 + p, 34, 51 + p, 4, 2 - p, L); cM(58, 34, 53, 4, 2, O); cM(58, 34, 53, 4, 2 - p, M);
    extra(() => { cL(49.6, 24, 56.4, 24, PX, O); cL(51.3, 14, 54.7, 14, PX, O); cL(46.5, 34, 51.5, 4, PX, Hh); });
    cR(49, 1, 56, 5, O); cR(50, 2, 55, 3, Hh); cR(50, 3, 55, 4, M); extra(() => { cR(50.5, 3.2, 52, 4.6, D); cR(53, 3.2, 54.5, 4.6, D); });
    // the machinery house with one lit window and louvres
    cR(58, 26, 74, 34, O); cR(59, 27, 73, 33, M); cR(59, 27, 73, 28, Hh); cR(59, 27, 60, 33, L); cR(72, 27, 73, 33, D); cR(66, 29, 68, 31, '#ffd890'); cR(66, 29, 67, 30, SODIUM_HI);
    extra(() => { for(let lx = 61; lx < 65; lx += 1.2) cVt(lx, 29, 32, D); for(let lx = 69; lx < 72; lx += 1.2) cVt(lx, 29, 32, D); cHz(65.6, 68.4, 31, O); cVt(65.6, 28.6, 31, O); cHz(59, 73, 33 - p, D); });
    // the trolley and the operator's cab under the boom, lit; mullions and the driver up close
    cR(16, 40, 27, 42, O); cR(17, 42, 26, 48, O); cR(18, 43, 25, 46, '#ffcf80'); cR(18, 43, 25, 44, SODIUM_HI); cR(18, 46, 25, 47, '#7a4a28');
    extra(() => { cR(20.4, 44.6, 22.2, 46, '#4a2c1c'); cR(20.8, 44, 21.8, 44.8, '#4a2c1c'); cVt(19.8, 43, 46, O); cVt(23.2, 43, 46, O); cHz(17, 26, 47.6, D); for(const tx of [17.5, 25]) cR(tx, 39.4, tx + 1, 40, D); });
    // floodlight housings
    for(const [fx, fy] of CRANE_LIGHTS.flood){ cR(fx - 1, fy - 1, fx + 2, fy, O); cR(fx, fy, fx + 1, fy + 1, '#ffe6b0'); extra(() => cHz(fx - 1, fx + 2, fy - 1, L)); } }

  function drawCrane(sp, x, y, uw, fog, now, sk){ const spr = fogged(craneSprite(), 'crane', fog, sk.low), k = uw * 6.2 / spr.height, a = 1 - fog * .75, x0 = x - spr.width * k / 2, y0 = y - spr.height * k;
    if(k > PX * 1.3){ const w = snap(spr.width * k), h = snap(spr.height * k); craneGeo(snap(x - w / 2), snap(y) - h, h / spr.height, c => fc(c, fog, sk.low), a); } else blit(spr, x, y, k);
    // a working crane (one of each pair), the way the Ohi and Daikoku quays work through the night: on a slow 18 s cycle the spreader lowers
    // empty to a box waiting on the quay, pauses, lifts it, and the box fades into the dark at the top (swung aboard); the next box fades in
    // on the quay. Under reduced motion it hangs still, part-lifted.
    if(sp.k % CRANE === 0 && fog < .6){ const ph = reduce ? .7 : ((now / 18000 + H0(sp.k)) % 1), u = ph < .1 ? 0 : ph < .45 ? (ph - .1) / .35 : ph < .55 ? 1 : ph < .9 ? 1 - (ph - .55) / .35 : 0, e = u * u * (3 - 2 * u);
      const Fc = c => fc(c, fog, sk.low), tx0 = x0 + 17 * k, ty = y0 + 48 * k, sy = ty + (6 + e * 36) * k, ga = cx.globalAlpha, [O, D, M, L] = BOX[(sp.k / CRANE | 0) % BOX.length];
      const box = (by, al) => { if(al <= 0) return; cx.globalAlpha = ga * al; cx.fillStyle = Fc(O); pxRect(tx0 - 2.5 * k, by, 13 * k, 6 * k); cx.fillStyle = Fc(M); pxRect(tx0 - 1.5 * k, by + k * .5, 11 * k, 5 * k);
        cx.fillStyle = Fc(D); for(let c = 0; c < 4; c++) pxRect(tx0 + (c * 2.6 - .5) * k, by + k, Math.max(PX, k * .5), 4 * k); cx.fillStyle = Fc(mixc(L, SODIUM_HI, .3)); pxRect(tx0 - 1.5 * k, by + k * .5, 11 * k, Math.max(PX, k * .5)); cx.globalAlpha = ga; };
      cx.fillStyle = Fc(STEEL.D); pxRect(tx0, ty, Math.max(PX, k * .6), sy - ty); pxRect(tx0 + 8 * k, ty, Math.max(PX, k * .6), sy - ty);
      cx.fillStyle = Fc(STEEL.L); pxRect(tx0 - 2 * k, sy, 12 * k, Math.max(PX, k * 1.2));
      if(ph < .55) box(ty + 43.2 * k, ph < .1 ? ph / .1 : 1); else box(sy + k * 1.2, ph > .9 ? 1 - (ph - .9) / .1 : 1); }
    // floodlights: stepped additive cones down onto the quay and water
    if(fog < .9){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,170,80,${.05 * (1 - fog)})`;
      for(const [fx, fy] of CRANE_LIGHTS.flood){ const lx = x0 + fx * k, ly = y0 + fy * k, bw = uw * .5; poly(lx - k, ly, lx + k, ly, lx + bw, y, lx - bw, y, cx.fillStyle); }
      cx.globalCompositeOperation = 'source-over';
      for(const [fx, fy] of CRANE_LIGHTS.flood){ glow(x0 + fx * k, y0 + fy * k + k, uw * .2 + 2, '#ffd08a', .4 * a); } }
    // red aviation lights, slow blink (steady when reduced motion)
    const on = reduce || Math.sin(now / 520 + sp.k) > -.2, sz = Math.max(PX, Math.round(k * 1.5));
    for(const [rx, ry] of CRANE_LIGHTS.red){ const lx = x0 + rx * k, ly = y0 + ry * k; cx.fillStyle = on ? '#ff5a46' : '#5a1418'; pxRect(lx - sz / 2, ly - sz / 2, sz, sz); if(on) glow(lx, ly, uw * .25 + 3, '#ff3a2a', .45 * a); } }

  function drawBoat(sp, x, y, uw, fog, now, sk){ const spr = fogged(boatSprite(), 'boat', fog, sk.low), k = uw * 1.4 / 50, bob = reduce ? 0 : Math.round(Math.sin(now / 900 + sp.k) * k * .6), a = 1 - fog * .7;
    blit(spr, x, y + k * 2 + bob, k); if(fog < .85){ glow(x, y - 9 * k + bob, uw * .7, '#ffb060', .25 * a); for(let i = 0; i < 4; i++) glow(x + (-18 + i * 12) * k, y - 12 * k + bob, uw * .08 + 1, '#ff4a3a', .4 * a); } }
  /* ---------------------------------------------------------------- the waterfront as projected geometry (engine projBox + our own details)
     Studied (research/sundown-buildings.md): Port of Tokyo sheds are long, low and pale with a dark gabled roof, few windows and one painted
     company stripe; port offices are 3-6 storeys of ribbon windows with a lit sign on legs on the roof; the container yard is stacks of
     corrugated boxes in 3-4 colours with floodlit tops. Everything below is quads between this segment and the next (or a span of them far
     away, the same span the engine's projBox uses, so our details always sit on the face they belong to): nothing is a scaled sprite. */
  const pbF = fog => { const q = Math.round(fog * .85 * 32); return c => fogc(c, q); };
  // the span this slice draws (1 near, up to 8 far; anchored to the run start, matching drawPBox), or 0 if a nearer slice of the span draws it
  function pbSpan(j, b0, len, fog){ const bse = j - Math.round(DRAW * Math.pow(fog, 1 / 1.6)), at = k => PB_SPAN(clamp(Math.pow((k - bse) / DRAW, 1.6), 0, 1));
    if(j > b0 && (j - b0) % at(j)) return 0; let n = 1; while(j + n < b0 + len && n < 8 && (j + n - b0) % at(j + n)) n++; return n; }
  // a quad on a plane parallel to the road at sp.x, heights h0..h1 (half-road widths), from this segment's start to n segments on, sub-span ta..tb
  function faceQ(x, y, uw, sp, n){ const t = segs[sp.k + n - 1]; if(!t || !t.p2.screen.scale) return null; const q = t.p2.screen, x2 = q.x + sp.x * q.w, y2 = q.y, u2 = q.w;
    return (h0, h1, col, ta = 0, tb = 1) => { const xa = x + (x2 - x) * ta, xb = x + (x2 - x) * tb, ya = y + (y2 - y) * ta, yb = y + (y2 - y) * tb, ua = uw + (u2 - uw) * ta, ub = uw + (u2 - uw) * tb;
      poly(xa, ya - ua * h0, xb, yb - ub * h0, xb, yb - ub * h1, xa, ya - ua * h1, col); }; }
  const STRIPE = ['#2a5cb0', '#b8402e', '#2a8a72', '#2a5cb0'];
  const BOARD = [['#f0ece0', '#c8203a'], ['#f0ece0', '#1a3a8a'], ['#ffd04a', '#1a1430'], ['#c8203a', '#f6efe4']];
  // the street row's details, drawn over its projBox slice: warehouse stripe, gable and door numbers; office roof sign on legs
  function drawBx(sp, x, y, uw, fog, now, sk){ const n = pbSpan(sp.k, sp.b0, sp.len, fog); if(!n) return; const Q = faceQ(x, y, uw, sp, n); if(!Q) return; const F = pbF(fog), j = sp.k, h = sp.h, ga = cx.globalAlpha;
    if(sp.kind === 0){ // warehouse: a painted company stripe under the eaves, a gable over the end wall facing us, a dark roof edge
      Q(h * .62, h * .62 + .045, F(STRIPE[sp.v % 4])); Q(h - .02, h + .025, F('#0c0e18'));
      if(j === sp.b0){ const dx = -sp.depth * uw, top = y - uw * h; poly(x, top, x + dx, top, x + dx / 2, top - uw * .2, F('#141826')); poly(x, top, x + dx * .5, top - uw * .2, x + dx * .5, top - uw * .17, x + dx * .06, top, F('#3a4466'));
        if(fog < .3){ cx.globalAlpha = ga * Math.min(1, (.3 - fog) / .08); cx.fillStyle = F('#c8ccd8'); pxRect(x + dx * .62, top + uw * h * .2, -dx * .14, uw * .1); pxRect(x + dx * .38, top + uw * h * .2, -dx * .06, uw * .1); cx.globalAlpha = ga; } }
      return; }
    if(sp.kind === 1 && sp.sign && j < sp.b0 + 5 && j + n > sp.b0 + 1 && fog < .7){ // office: a lightbox sign on two legs along the roof, the brand's colours; far away a plain lit bar
      const [bg, ink] = BOARD[sp.v % 4], s0 = h + .07, s1 = h + .3;
      if(n > 1){ Q(s0, s1, F(bg), Math.max(0, (sp.b0 + 1 - j) / n) + .02, Math.min(1, (sp.b0 + 5 - j) / n) - .02); return; }
      const first = j === sp.b0 + 1, last = j === sp.b0 + 4 || j + 1 >= sp.b0 + sp.len;
      if(first) Q(h, s0, F('#1a1e2c'), .1, .16); if(last) Q(h, s0, F('#1a1e2c'), .84, .9);
      Q(s0, s1, F(bg), first ? .05 : 0, last ? .95 : 1);
      if(fog < .35){ cx.globalAlpha = ga * Math.min(1, (.35 - fog) / .1); for(let c = 0; c < 2; c++){ const ta = (first ? .2 : 0) + c * .5, tb = ta + .3; if(tb > (last ? .9 : 1.05)) break; Q(s0 + .05, s1 - .05, F(ink), ta, tb); } cx.globalAlpha = ga; }
      Q(s1 - .015, s1, F(mixc(bg, '#ffffff', .4)), first ? .05 : 0, last ? .95 : 1); } }
  // container stacks on the quay: 1-3 tiers of corrugated boxes per run, floodlit tops, the door end facing the camera
  const TIER = .2;
  function drawBox(sp, x, y, uw, fog, now, sk){ const n = pbSpan(sp.k, sp.b0, sp.len, fog); if(!n) return; const Q = faceQ(x, y, uw, sp, n); if(!Q) return; const F = pbF(fog), j = sp.k, ga = cx.globalAlpha, warm = sp.flood;
    for(let t = 0; t < sp.tiers; t++){ const [O, D, M, L] = BOX[sp.cols[t]], h0 = t * TIER, h1 = h0 + TIER;
      Q(h0, h1, F(M)); Q(h0, h0 + .018, F(O));
      if(fog < .14 && n === 1){ cx.globalAlpha = ga * Math.min(1, (.14 - fog) / .05); for(let r = 0; r < 4; r++) Q(h0 + .03, h1 - .02, F(D), r / 4 + .06, r / 4 + .12); cx.globalAlpha = ga; }
      if(t === sp.tiers - 1) Q(h1 - .022, h1, F(mixc(L, SODIUM_HI, warm))); }
    if(j === sp.b0){ const dx = sp.depth * uw, H1 = uw * TIER;
      for(let t = 0; t < sp.tiers; t++){ const [O, D, M, L] = BOX[sp.cols[t]], yb = y - uw * t * TIER; cx.fillStyle = F(D); pxRect(x, yb - H1, dx, H1);
        if(dx > PX * 4 && fog < .5){ cx.fillStyle = F(O); pxRect(x + dx * .49, yb - H1 * .92, Math.max(PX, dx * .03), H1 * .86); pxRect(x + dx * .2, yb - H1 * .9, Math.max(PX, dx * .02), H1 * .8); pxRect(x + dx * .78, yb - H1 * .9, Math.max(PX, dx * .02), H1 * .8); }
        cx.fillStyle = F(L); pxRect(x, yb - H1, Math.max(PX, dx * .04), H1); }
      cx.fillStyle = F(mixc(BOX[sp.cols[sp.tiers - 1]][3], SODIUM_HI, warm)); pxRect(x, y - uw * sp.tiers * TIER, dx, Math.max(PX, uw * .02)); } }
  /* a granite river wall at each bank of the drawbridge's channel, beyond the bascule piers on both sides: a dressed face with courses, a
     lit coping, and the riverside walk's lamps (the Sumida terrace at Kachidoki). A plane across the road, so a camera-facing card is exact. */
  const BANK_X0 = 2.36, BANK_H = .2, BANK_LAMP = [2.9, 4.3, 5.7];
  function drawBank(sp, x, y, uw, fog, now, sk){ if(fog > .97 || uw < 1) return; const low = sk.low, h = Math.max(PX, uw * BANK_H), a = 1 - fog * .7;
    const face = fc(CONC.M, fog, low), dark = fc(CONC.D, fog, low), cap = fc(mixc(CONC.H, '#ffcf90', .35), fog, low), crs = fc(CONC.O, fog, low);
    for(const sd of [-1, 1]){ const xa = x + sd * BANK_X0 * uw, xb = x + sd * 7 * uw, l = Math.min(xa, xb), w = Math.abs(xb - xa);
      cx.fillStyle = face; pxRect(l, y - h, w, h); cx.fillStyle = dark; pxRect(l, y - Math.max(PX, h * .3), w, Math.max(PX, h * .3));   // the face and its damp foot
      cx.fillStyle = cap; pxRect(l, y - h - Math.max(PX, h * .12), w, Math.max(PX, h * .12));
      if(h > PX * 4){ cx.fillStyle = crs; pxRect(l, y - h * .62, w, PX); for(let X = BANK_X0 + .45; X < 7; X += .45) pxRect(x + sd * X * uw, y - h, PX, h * .62); }   // courses and joints
      if(fog < .85) for(const X of BANK_LAMP){ const lx = x + sd * X * uw, ph = uw * .55, pw = Math.max(PX, uw * .018);   // the walk's lamps: a post and a warm globe
        cx.fillStyle = crs; pxRect(lx - pw / 2, y - h - ph, pw, ph); const g = Math.max(PX, uw * .045); cx.fillStyle = fc('#ffe0a0', fog * .6, low); pxRect(lx - g / 2, y - h - ph - g, g, g);
        glow(lx, y - h - ph - g / 2, uw * .3, '#ffb35a', .3 * a); } } }
  const DRAW_FN = { bank:drawBank, boat:drawBoat, wall:drawWall, lamp:drawLamp, gantry:drawGantry, stack:drawStack, crane:drawCrane, bx:drawBx, box:drawBox };
  // the city side: a street row of warehouses, port offices and tiled 1980s mid-rises, and a back row of towers with gaps for the bay vista
  const CITY_FACE = [['#1a1e30', '#2c3250', '#4c5678'], ['#161c30', '#26304a', '#46567e'], ['#241a22', '#3a2c36', '#64525c']];
  /* The drawbridge (setpiece/jump.js) crosses a channel that runs across the road from pier to pier. A building or container run stops at
     the near bank and a fresh run starts at the far bank, so each keeps its camera-facing end face (a run cut at the bank would stand open).
     Kachidoki-bashi: the city and the wharves end at a granite river wall; only water and the bascule piers stand between. */
  function chanRun(i, r){ if(!r) return r; const p = segs[i] && segs[i].spjP, J = MECH.sp_jump; if(!p || p.kind !== 'bridge' || !p.th.bridge || !J || !J.TOT) return r;
    const a = p.b0, b = p.b0 + J.TOT, e = r.b0 + r.len; if(i >= a && i < b) return null;
    if(i < a && e > a) return a - r.b0 >= 2 ? { b0:r.b0, len:a - r.b0, n:r.n } : null;
    if(i >= b && r.b0 < b) return e - b >= 3 ? { b0:b, len:e - b, n:r.n } : null;
    return r; }
  function placeCity(i, s, sp){
    { const r = chanRun(i, pbAt(i, -1, 12, 5, 8, 7)); if(r && hash(r.n * 1.13 + 3) > .35){ const hv = hash(r.n * 3.3);   // (lo: lit windows only; tall floors keep the window count down)
        projBox(s, -1, { b0:r.b0, len:r.len, x0:3.3 + hash(r.n * 1.9) * .7, h:2 + hv * 2.4, depth:1.2, lo:true, style:hv > .6 ? 'glass' : 'concrete', win:{ floor:.3, w:.5, h:.45, lit:.26 } }); } }
    const r = chanRun(i, pbAt(i, -1, 15, 8, 13, 4)); if(!r) return; const kd = hash(r.n * 2.7), kind = kd < .4 ? 0 : kd < .7 ? 1 : kd < .87 ? 2 : 3, v = (hash(r.n * 6.1) * 4) | 0, x0 = 1.68 + hash(r.n * 1.3) * .14;
    let o;
    if(kind === 0) o = { b0:r.b0, len:r.len, x0, h:.72 + hash(r.n * 4.1) * .28, depth:1, style:'shutter', face:CITY_FACE[0], band:'#10131f', ground:'none', win:{ floor:.3, w:.3, h:.3, lit:.22, cols:['#ffd890', '#a8c0e8'], dark:'#121624' } };
    else if(kind === 1) o = { b0:r.b0, len:r.len, x0, h:1.25 + hash(r.n * 4.1) * .8, depth:.8, style:'concrete', face:CITY_FACE[1], ground:'none', win:{ floor:.22, w:.94, h:.42, lit:.45, cols:['#e8f0ff', '#c8dcff', '#ffe6b0'] } };
    else if(kind === 2) o = { b0:r.b0, len:r.len, x0, h:1.15 + hash(r.n * 4.1) * .5, depth:.8, style:'tile', face:CITY_FACE[2], ground:'none', signs:true };
    else o = { b0:r.b0, len:r.len, x0, h:1.3 + hash(r.n * 4.1) * .6, depth:.7, style:'neon', ground:'none', win:{ floor:.2, lit:.45 } };   // a hotel or pachinko block: the old skyline's pink and cyan, kept
    if(kind === 1 && hash(r.n * 9.7) > .65) o.signs = true;   // a vertical neon blade now and then: the city's few saturated accents
    projBox(s, -1, o);
    if(kind < 2) sp.push({ env:'harbour', type:'bx', x:-x0, k:i, b0:r.b0, len:r.len, h:o.h, depth:o.depth, kind, v, sign:hash(r.n * 8.3) > .35 }); }
  // two rows of stacks (the back row first, so the front row draws over it), gaps between runs; floodlit tops warmer near the cranes
  function placeYard(i, s, sp){ for(const [per, lo, hi, sd, xa, xw, gap] of [[7, 3, 5, 11, 4.5, .6, .4], [6, 4, 5, 9, 3.2, .55, .15]]){ const r = chanRun(i, pbAt(i, 1, per, lo, hi, sd)); if(!r || hash(r.n * 1.7 + sd) < gap) continue;
    const tiers = 1 + ((hash(r.n * 2.9 + sd) * 3) | 0), x0 = xa + hash(r.n * 4.3 + sd) * xw;
    sp.push({ env:'harbour', type:'box', x:x0, k:i, b0:r.b0, len:r.len, tiers, depth:.42, flood:(r.b0 % CRANE < 22 ? .4 : .15), cols:[0, 1, 2].map(t => (hash(r.n * 5.3 + t * 1.7 + sd) * BOX.length) | 0) }); } }


  // ---------------------------------------------------------------- road surface: water and quay on the harbour side, wet reflections on the asphalt
  const QUAY0 = 2.8, QUAY1 = 7.4, WATER0 = 1.2;
  ENV.harbour = {
    warm(){ lampSprite(); gantrySprite(); craneSprite(); towerSprite(); shoreSprite(); boatSprite(); for(let v = 0; v < 8; v++) stackSprite(v);
      for(const [s, n] of [[lampSprite(), 'lamp'], [gantrySprite(), 'gantry'], [craneSprite(), 'crane'], [boatSprite(), 'boat']]) fogTintWarm(s, 'hb:' + n, 4, .82); for(let v = 0; v < 8; v++) fogTintWarm(stackSprite(v), 'hb:stack' + v, 4, .82); },
    road:['#191a2a', '#1c1d2e'],
    lampCol:'#d07a30',
    lit(i){ const d = lampD(i); return d === 0 ? .32 : d === 1 ? .12 : 0; },
    place(i, s){ const sp = s.sprites, add = o => sp.push(Object.assign({ env:'harbour', k:i }, o));
      // the city: buildings behind the sound barrier on the left, sometimes a second row further back
      // (projected geometry, back row first so the street row draws in front; see placeCity)
      placeCity(i, s, sp);
      // the harbour: container stacks and cranes along the quay
      const ci = i % CRANE;
      if(ci === 0 || ci === 10) add({ type:'crane', x:5.7 });
      placeYard(i, s, sp);
      // the old billboard placement drew from Math.random; draw the same so the road's curves, traffic and hazards stay exactly as they were
      if(i % 5 === 0) Math.random(); if(i % 11 === 3) Math.random(); if(ci !== 0 && ci !== 10 && i % 4 === 2 && H0(i * 1.7) > .25) Math.random();
      // walls every segment, lamps in pairs
      add({ type:'wall', x:-1.12 }); add({ type:'wall', x:1.12 });
      // each lamp head mirrored in the wet asphalt; the engine's reflection layer draws it (env/README.md, addReflection), so it never blinks out
      if(i % LAMP === 0){ add({ type:'lamp', x:-1.12 }); add({ type:'lamp', x:1.12 }); addReflection(s, -.96, .1, .9, '#ffd696', .42, '#ffa050'); addReflection(s, .96, .1, .9, '#ffd696', .42, '#ffa050'); }
      if(i % GANTRY === 75) add({ type:'gantry', x:0 });
      { const p = s.spjP, J = MECH.sp_jump; if(p && p.kind === 'bridge' && p.th.bridge && J && (i === p.b0 || i === p.b0 + J.TOT)) add({ type:'bank', x:0, far:i !== p.b0 }); }   // the river walls at the drawbridge
      if(i % BOAT === 35){ add({ type:'boat', x:2.02 }); for(let c = 0; c < 6; c++) addReflection(s, 1.5 + c * .11, .07, .5, c % 2 ? '#ffbe6e' : '#ff503c', c % 2 ? .4 : .3); } },   // the boat's windows in the channel
    draw(sp, x, y, uw, fog, now, sk){ const fn = DRAW_FN[sp.type]; if(fn) fn(sp, x, y, uw, fog, now, sk); },
    // the drawbridge (setpiece/jump.js, research/sundown-craft/jumpsides.md): from pier to pier only water, the boats and the river walls
    jumpKeep(sp, o, p){ return sp.type === 'boat' || sp.type === 'bank'; },
    roadFX(s, a, b, fog, f, now){ const low = lastLow, ay = a.y, by = b.y - 1;
      if(ay - by < .5) return;
      // the core skips a segment whose far end is level with its near end (most of them, far away), so roadFX never sees it, and which ones
      // are level changes as you ride: far channel edges, ripples, the moon path and lamp pools came and went. This segment also covers the
      // run of level segments just nearer than it (same row): its bands start at the run's near end, and the run's ripples, moon band and
      // pools are drawn with it (pools and the moon band once per row, so they don't stack brighter)
      let j0 = s.index; while(s.index - j0 < 64){ const q = segs[j0 - 1]; if(!q || q.p1.camera.z <= DEPTH || q.p1.screen.y !== ay || q.p2.screen.y !== ay) break; j0--; }
      const sh = j0 < s.index ? a.x - segs[s.index - 1].p2.screen.x : 0, nr = j => j === s.index ? a : segs[j].p1.screen, nx = j => j === s.index ? a.x : segs[j].p1.screen.x + sh;
      const A = j0 < s.index ? { x:nx(j0), y:ay, w:segs[j0].p1.screen.w } : a;
      // the harbour side: water channel, the quay, open water beyond
      const wa = A.x + A.w * WATER0, wb = b.x + b.w * WATER0;
      if(wb < W){ const st = s.stripe; poly(wa, ay, W + 4, ay, W + 4, by, wb, by, fc(st ? '#0b1430' : '#0d1734', fog, low));
        const qa0 = A.x + A.w * QUAY0, qb0 = b.x + b.w * QUAY0, qa1 = A.x + A.w * QUAY1, qb1 = b.x + b.w * QUAY1;
        if(qb0 < W){ poly(qa0, ay, qa1, ay, qb1, by, qb0, by, fc(st ? '#1a1826' : '#1c1a28', fog, low));
          const e = Math.max(PX, A.w * .03); poly(qa0, ay, qa0 + e, ay, qb0 + Math.max(PX, b.w * .03), by, qb0, by, fc(s.index % CRANE < 20 ? '#8a6438' : '#5a4430', fog, low)); }
        // the boat's windows reflected in the channel: warm vertical dashes below its hull
        // ripples: short bright dashes; moonlit blue, warm under the cranes
        // only in the middle distance: near the camera a per-segment hash pattern would change every frame and sparkle
        if(fog > .2 && fog < .9) for(let j = j0; j <= s.index; j++){ const q = nr(j), qx = nx(j), h = H0(j), near = j % CRANE < 16 || j % CRANE > 58, dw = 2 + q.w * .08 * h, rx = lerp(qx + q.w * WATER0, qx + q.w * QUAY0, .15 + h * .7), ry = by, q1 = qx + q.w * QUAY1;
          cx.fillStyle = near ? `rgba(255,170,90,${.55 * (1 - fog)})` : `rgba(120,150,230,${.45 * (1 - fog)})`; pxRect(rx - dw / 2, ry, Math.max(PX, dw), PX);
          if(H0(j * 3) > .5 && q1 < W){ const ox = q1 + (W - q1) * H0(j * 5); cx.fillStyle = `rgba(110,140,220,${.3 * (1 - fog)})`; pxRect(ox, ry, Math.max(PX, dw * 1.5), PX); } }
        // the moon's path on the water, broken into bands
        const mx = MOON.x, jm = j0 + (j0 & 1); if(fog > .15 && MOON.t < .95 && mx > wb && (mx < qb0 || mx > qb1) && jm <= s.index){ const ww = (4 + H0(jm * 7) * 14) * (1.2 - fog) ;
          cx.fillStyle = `rgba(240,228,200,${.32 * (1.1 - fog)})`; pxRect(mx - ww / 2 + (H0(jm * 11) - .5) * 10, by, Math.max(PX, ww), PX); } }
      // light pools: two stepped warm bands on the outer lanes under each lamp pair (the game's own lit tint stays low so pools read as pools)
      let d = 9; for(let j = j0; j <= s.index; j++) d = Math.min(d, lampD(j)); if(d <= 2 && fog < .9){ cx.globalCompositeOperation = 'lighter';
        cx.fillStyle = `rgba(255,150,70,${[.12, .07, .035][d] * (1 - fog)})`; for(const sd of [-1, 1]) poly(A.x + sd * A.w * .25, ay, A.x + sd * A.w * 1.05, ay, b.x + sd * b.w * 1.05, by, b.x + sd * b.w * .25, by, cx.fillStyle);
        if(d === 0){ cx.fillStyle = `rgba(255,170,90,${.08 * (1 - fog)})`; for(const sd of [-1, 1]) poly(A.x + sd * A.w * .62, ay, A.x + sd * A.w, ay, b.x + sd * b.w, by, b.x + sd * b.w * .62, by, cx.fillStyle); }
        cx.globalCompositeOperation = 'source-over'; }
      // wet asphalt: each lamp head reflected as a vertical column of broken dashes hanging below the lamp's ground point toward the viewer
      // (reflections are vertical on screen, not along the road). Drawn from the lamp's own segment over the nearer road, which is already painted.
      // (the lamp and boat reflection columns are registered in place() and drawn by the engine's reflection layer)
    },
    backdrop(o){ const { hz, now, sk } = o; lastLow = sk.low;
      // city glow over the horizon: stepped warm-violet bands
      const bands = [['#ff9a5a', .05, 30], ['#c8506a', .06, 18], ['#ff9a5a', .07, 9]];
      for(const [c, al, hh] of bands){ const [R, G, B] = hx(c); cx.fillStyle = `rgba(${R},${G},${B},${al})`; cx.fillRect(0, hz - hh * PX, W, hh * PX); }
      // the landmark tower, far across the bay; its own slow parallax over a wide period so it comes round now and then
      const shore = shoreSprite(), k = PX, sw = SKY_W * k, off = ((skyPar('mid')) % sw + sw) % sw;
      const tw = towerSprite(), per = W * 2.2, tx = ((W * .72 - skyPar('far')) % per + per) % per - W * .3;
      if(tx > -60 && tx < W + 60){ glow(tx, hz - 52 * k, 40 * k, '#ff7a3a', .2); blit(tw, tx, hz - 4 * k, k); }
      // far shore skyline, tiled
      for(let x = -off; x < W; x += sw) blit(shore, x + sw / 2, hz + PX, k);
      // aviation lights on the tall roofs and cranes, a slow shared blink
      const on = reduce || Math.sin(now / 600) > -.3; if(on){ cx.fillStyle = '#ff4a3a'; for(const [ax, ay] of AVIA){ for(let x = -off + ax * k; x < W; x += sw) if(x > -4) pxRect(x, hz + PX - (SKY_H - ay) * k, PX, PX); } }
      if(tx > -60 && tx < W + 60){ cx.fillStyle = on ? '#ff4a3a' : '#7a2018'; pxRect(tx - PX / 2, hz - 4 * k - 96 * k, PX, PX); }
      // light trails on the shore road: a few moving head- and tail-light dashes
      if(!reduce) for(let i = 0; i < 14; i++){ const sp2 = 30 + H0(i) * 40, dir = i % 2 ? 1 : -1, px0 = ((H0(i * 3) * W + dir * now / 1000 * sp2 - skyPar('mid')) % W + W) % W;
        cx.fillStyle = dir > 0 ? 'rgba(255,240,210,.8)' : 'rgba(255,70,60,.8)'; cx.fillRect(Math.round(px0 / PX) * PX, hz - PX, PX * 3, PX); }
      return false; },
    overlay(al, now, sk){ const b = Math.round(H * .05 / PX) * PX; cx.fillStyle = `rgba(6,6,24,${.28 * al})`; cx.fillRect(0, 0, W, b); cx.fillStyle = `rgba(6,6,24,${.14 * al})`; cx.fillRect(0, b, W, b); }
  };
})();

// where this road's barrier is drawn, for the collider (half-road widths)
ENV.harbour.barrier = 1.12;
