/* Sundown set piece: 大波 the Great Wave barrel ride (Shonan Coast). See setpiece/README.md. Registers MECH.sp_wave, director id 'greatwave'.
   A rogue wave rises beside the sea wall, curls OVER the road into a tube of water, and you ride through the barrel while it collapses
   behind you. Scheduled by world position (about 820 segments into a coast visit, clear of gates, never in the typhoon's visit: both are
   hero-tier, so the director allows only one per road visit, and it also stands down at runtime if the typhoon wind is up).
   Beats, all driven by the rider's distance d to the barrel mouth W0 (never by time):
     d -340..-200  telegraph: the sea draws back (env/coast.js reads recede(i): the shoreline retreats, wet sand and tetrapods exposed),
                   a deep rumble, an amber 大波 board on a gantry over the road;
     d -230..-60   the rise: a dark Prussian wall climbs beside the wall, foam veins running along it, claw fingers on its crest;
     d -110..-15   the curl: the crest arches over the road into a tube (rings of water per segment, projected like the tunnels);
     d 0..L        inside: light shafts through the thin lip, the moon glowing through it, spray streaming past, the collapse chasing;
     d > L         the exit: a burst of spray and mist, the road soaked (coast.js reads wetAt(i)), then calm.
   References (rules taken): Hokusai's Great Wave (claws on the lip; Prussian with lighter streak bands; white specks); barrel photos
   from Pipeline (the tube's inside is a smooth face streaked ALONG the wave, darkest at the base, lighter and translucent toward the
   thin lip; the lip a bright curtain); a Pipeline wipeout (the lip lands as an explosion of whitewater that fills the tube behind);
   Wave Race 64 (water in pseudo-3D reads by foam streaks converging to the vanishing point; whitewater as flat bright sheets);
   Sayonara Wild Hearts (a tunnel reads by strong converging lines and a bright opening ahead); Tetris Effect (particles streaming at
   the camera sell speed in an enclosed space).
   Fairness: hazards in the zone are removed, traffic is swept beyond it (and the director's guard is up through the ride), the barrel
   never touches the road surface, and if the collapse catches up the bike is given speed. Reduced motion: no flow crawl, no shake,
   static shafts, fewer particles, a gentle exit. Performance: every sprite is built in warm(); nothing allocates a canvas mid-ride. */
"use strict";
(() => {
  const DIR = MECH.director; if(DIR) DIR.register('greatwave');
  const L = 112, PI = Math.PI, snap = v => Math.round(v / PX) * PX, sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const pSeg = () => (position + PZ) / SEG;
  const plans = [];          // { W0, W1, off, cut, col, rumbled, ... }
  const S = {};              // sprites, built in warm()
  // ---- palette: Prussian deep, mid, light, the translucent lip, foam veins, white crest; fogged toward the sky's low colour (cached)
  const WC = { deep:'#0b1f44', mid:'#16376a', light:'#2a5a92', lip:'#5a96c4', vein:'#8cc4e2', crest:'#eef6fb', P:'#14305c', C:'#bfe2ee' };
  let fogLow = '', FCC = new Map(); const fcol = (c, fog, low) => { if(low !== fogLow){ fogLow = low; FCC = new Map(); } const q = Math.round(fog * 12), k = c + q; let v = FCC.get(k); if(!v){ v = mixc(c, low, q / 12 * .85); FCC.set(k, v); } return v; };
  // ---- hand-laid claw fingers (the same shapes as the coast's wave hit): root lower left, rising, hooking down at the tip
  const CLAW = [
    ['.......WWWWW....', '.....WWWWWWWWW..', '....WWCCCPPWWWW.', '...WWCP.....PWWW', '..WWCP........PW', '.WWCP..........W', 'WWCP............', 'WCP.............', 'WC..............'],
    ['.....WWWW..', '...WWWWWWW.', '..WWCPPWWWW', '.WWCP...PWW', 'WWCP......W', 'WCP........', 'WC.........'],
    ['..WWW..', '.WWCWW.', 'WWP..WW', 'WP....W', 'W......']];
  const rotCW = g => { const h = g.length, w = g[0].length, o = []; for(let x = 0; x < w; x++){ let r = ''; for(let y = h - 1; y >= 0; y--) r += g[y][x]; o.push(r); } return o; };
  // Scale2x (EPX): a 2x claw with its stair-steps rounded off, so near claws get real detail instead of being blown up past 1.5x
  const epx = g => { const h = g.length, w = g[0].length, at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? '.' : g[y][x], o = [];
    for(let y = 0; y < h; y++){ let r0 = '', r1 = ''; for(let x = 0; x < w; x++){ const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      r0 += (C === A && C !== D && A !== B ? A : P) + (A === B && A !== C && B !== D ? B : P); r1 += (D === C && D !== B && C !== A ? C : P) + (B === D && B !== A && D !== C ? D : P); } o.push(r0, r1); } return o; };
  // front row: white with the pale-blue inner curl and a Prussian line on the shadow side; back row: one step darker all round
  const CLAWPAL = [{ W:WC.crest, C:WC.C, P:WC.P }, { W:'#a8d4ee', C:'#4a82bc', P:'#071433' }];
  function clawSpr(v, down, back, big){ const key = 'wv_claw' + v + (down ? 'd' : 'u') + (back ? 'b' : '') + (big ? 'B' : ''); if(S[key]) return S[key]; let g = down ? rotCW(CLAW[v]) : CLAW[v]; if(big) g = epx(g);
    return S[key] = makeSprite(g, CLAWPAL[back ? 1 : 0], false); }
  // a canvas from a per-pixel function (warm-up only)
  function pixCanvas(w, h, fn){ const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), id = k.createImageData(w, h), D = id.data;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const col = fn(x, y); if(!col) continue; const [r, g, b] = hx(col), o = (y * w + x) * 4; D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = 255; }
    k.putImageData(id, 0, 0); return c; }
  const flipC = c => { const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const k = f.getContext('2d'); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return f; };
  // ---- L2 the second wave's profile (Hokusai's smaller wave): back slope, crest, a lip thrown shoreward (right) over a hollow face.
  // Paler than the main wave (it is further off): body 2 tones, streak bands, a foam cap and dangling claws; dark line on the shadow side only.
  const MIDH = [10, 15, 22, 33, 50, 75, 112, 168], MP = { deep:'#2a4f7c', mid:'#3a6696', streak:'#6a96c0', rim:'#7aa4cc', foam:'#e8f2f8', foamC:'#a8c8de', line:'#1a3660', speck:'#d0e2ee' };
  // four profiles: 0-1 the tall set wave behind the approach (steep, deep hook), 2-3 the broader one beyond the exit (low, long lip)
  const MIDF = [[.5, .86, .4], [.55, .83, .36], [.58, .8, .3], [.63, .79, .27]];
  function midSpr(h, seed){ const w = Math.round(h * 1.75), [uc, ut, vt] = MIDF[seed], fU = v => .62 + .31 * Math.pow((v - .42) / .58, 2.2);
    const top = u => u <= uc ? 1 - .9 * Math.pow(u / uc, 1.7) : u <= ut ? .1 + (vt - .1) * Math.pow((u - uc) / (ut - uc), 1.6) : 2, thick = u => u <= uc ? 9 : .3 * Math.pow(1 - (u - uc) / (ut - uc), .8);
    const inside = (x, y) => { if(x < 0 || y < 0 || x >= w || y >= h) return false; const u = (x + .5) / w, v = (y + .5) / h, t = top(u); if(v < t) return false;
      if(v >= .42) return u <= fU(v); return u <= .62 || v <= t + thick(u); };
    // claws dangling from the lip's underside and the tip: small hooked fingers (every few pixels), only when there is room for them
    const claws = new Set(); if(h >= 22){ const g = rotCW(CLAW[2]); for(let x = Math.round(w * .66); x < Math.round(w * ut); x += Math.max(3, Math.round(h / 8))){ let y = 0; while(y < h && !(inside(x, y) && !inside(x, y + 1))) y++;
      if(y >= h * .5) continue; g.forEach((row, gy) => [...row].forEach((ch, gx) => { if(ch !== '.') claws.add((x + gx - 2) + ',' + (y + gy) + ',' + ch); })); } }
    const cm = new Map(); for(const c of claws){ const [a, b, ch] = c.split(','); cm.set(a + ',' + b, ch); }
    return pixCanvas(w, h, (x, y) => { const u = (x + .5) / w, v = (y + .5) / h, cl = cm.get(x + ',' + y);
      if(!inside(x, y)){ if(cl && !inside(x, y)) return cl === 'W' ? MP.foam : cl === 'C' ? MP.foamC : MP.line; return null; }
      const dTop = (() => { let n = 0; while(n < 4 && inside(x, y - n - 1)) n++; return n; })();
      if((!inside(x + 1, y) && u > .5) || (!inside(x, y + 1) && y < h - 1)) return MP.line;   // the shadow side: the face edge and the lip's underside
      if(u > uc - .28 || v < .3){ if(dTop === 0) return MP.foam; if(dTop === 1 && h >= 15) return u > uc - .1 ? MP.foam : MP.foamC; if(dTop === 2 && h >= 33) return MP.foamC; }
      else if(dTop === 0) return MP.rim;   // the back slope's lit edge (a light rim, not an outline)
      if(h >= 15 && v > .3){ const q = (fU(clamp(v, .42, 1)) - u) * h, pr = Math.max(4, h * .19); if(((q + 2 * Math.sin(v * 5 + seed)) % pr + pr) % pr < (h >= 50 ? 1.6 : 1)) return MP.streak; }
      if(h >= 22 && v > .35 && hash(x * 7.3 + y * 13.1 + seed * 5) < .018) return MP.speck;
      const qf = (fU(clamp(v, .42, 1)) - u) * h; return (v > .42 && qf < h * .1) || v > .9 ? MP.deep : MP.mid; }); }
  // ---- L4 near: lacy foam sheets (torn whitewater, holes in it) and droplets, shadow-side outline only; drawn at 1x or 1.5x
  const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h2 = (a, b) => hash(a * 12.9898 + b * 78.233 + s * 37.7), sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), sx), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), sx), sy); };
  function sheetSpr(seed, w = 96, h = 18){ const rows = [];   // a sheet of spray torn off the lip: horizontal dashes, long and bright in the middle, short and pale at the edges
    for(let y = 1; y < h - 2; y++){ const m = 1 - Math.abs(y - h * .45) / (h * .5); if(hash(seed * 7 + y * 3.3) > .25 + m * .7) continue; const len = Math.round(w * (.15 + .7 * m * hash(seed + y * 1.9))), x0 = Math.round((w - len) * (.2 + .6 * hash(seed * 3 + y)));
      rows.push([y, x0, len]); }
    const at = new Map(); for(const [y, x0, len] of rows) for(let x = x0; x < x0 + len; x++){ const u = (x - x0) / len; at.set(x + ',' + y, u > .6 ? '#f4fafd' : u > .25 ? '#cfe6f2' : '#8fb6d2'); if(len > w * .35 && !at.has(x + ',' + (y + 1))) at.set(x + ',' + (y + 1), 'L'); }
    return pixCanvas(w, h, (x, y) => { const c = at.get(x + ',' + y); return c === 'L' ? '#4a6f96' : c || null; }); }
  // a mist bank for the exit: lumpy, two tones, its edge broken by a checker dither two pixels deep (soft without a gradient).
  // (kodawari audit #20: it was drawn whole and faded with globalAlpha, a smooth translucent wash over the frame. Now it is pixel art all the
  // way: every pixel opaque, the body an ordered (Bayer) dither at a fixed density per level, the lit tone up-left, the shade down-right, the
  // rim thinner still; it thins by stepping down three levels, 10/16 -> 5/16 -> 2/16, never by alpha. The pattern is fixed to the sprite, so it
  // drifts with the bank and never boils.)
  const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], MLV = [10, 5, 2];
  function mistSpr(seed, lv){ const w = 200, h = 84, lobes = [], dn = MLV[lv]; for(let j = 0; j < 10; j++){ const t = j / 9; lobes.push({ x:w * (.1 + .8 * t) + (hash(seed + j) - .5) * 20, y:h * (.52 + (hash(seed * 3 + j) - .5) * .3), r:h * (.24 + .2 * hash(seed * 7 + j)) * (1 - Math.abs(t - .45) * .6) }); }
    const dep = (x, y) => { let m = -9; for(const L2 of lobes) m = Math.max(m, L2.r - Math.hypot(x - L2.x, (y - L2.y) * 1.25)); return m; };
    return pixCanvas(w, h, (x, y) => { const e = dep(x, y); if(e < 0) return null; const b = BAY4[(y & 3) * 4 + (x & 3)];
      if(b >= (e < 3 ? dn / 2 : e < 8 ? dn * .75 : dn)) return null;   // the body at its level's density, feathered thinner over the last few pixels
      return dep(x + 3, y + 4) < 0 ? '#9cc2dc' : dep(x - 4, y - 4) < 0 ? '#eef6fb' : '#cfe4f0'; }); }
  const DROPS = [['WC', 'CP'], ['.WC.', 'WCCP', '.CP.'], ['..WW..', '.WWCC.', 'WWCCCP', '.CCCP.', '..PP..']], DPAL = { W:'#f2fafe', C:'#a8d0e6', P:'#4a6f96' };
  // ---- L5 the collapse: billows (cauliflower whitewater). Lobes stack back to front; each lobe lit from the upper left, with a shade line where
  // a nearer lobe overlaps a farther one and a dark line on the shadow side (bottom, right). Three rows: back dark, mid pale, front white.
  const BROWS = [{ h:62, w:104, n:3, dx:.13, in:.2, per:900, pal:['#2c4668', '#3e5f86', '#5f84aa', '#1a2c48'] },
    { h:50, w:86, n:3, dx:.11, in:.25, per:700, pal:['#6f98ba', '#9cc4dc', '#cfe6f2', '#3c5f86'] },
    { h:40, w:70, n:2, dx:.11, in:.3, per:520, pal:['#a8c8dc', '#e6f2f8', '#ffffff', '#5a7ea0'] }];
  function billowSpr(R, seed){ const w = R.w, h = R.h, lobes = [], n = 7;
    for(let j = 0; j < n; j++){ const t = j / (n - 1), r = h * (.2 + .16 * hash(seed * 9 + j)), cxp = w * (.12 + .76 * t) + (hash(seed + j * 3) - .5) * w * .08, cyp = h * (.42 + .22 * Math.abs(t - .45) * 2 + .1 * hash(seed * 3 + j)) + (j % 2 ? h * .12 : 0);
      lobes.push({ x:cxp, y:cyp, r }); }
    lobes.sort((a, b) => a.y - b.y);   // farther (higher) lobes first
    const own = (x, y) => { if(x < 0 || y < 0 || x >= w || y >= h) return -1; let o = -1; for(let j = 0; j < lobes.length; j++){ const L2 = lobes[j]; if((x - L2.x) ** 2 + (y - L2.y) ** 2 <= L2.r * L2.r) o = j; } if(o < 0 && y > h * .66 && x > w * .04 && x < w * .96) o = 99; return o; };
    return pixCanvas(w, h, (x, y) => { const o = own(x, y); if(o < 0) return null; const [sh, base, lit, line] = R.pal;
      if(own(x + 1, y) < 0 || own(x, y + 1) < 0 && y < h - 1) return line;   // shadow side
      const up = own(x, y - 1); if(o !== 99 && up >= 0 && up !== o && up < o) return lit;   // the rim of a nearer lobe against the one behind it
      if(o !== 99 && own(x, y + 1) !== o && own(x, y + 1) > o) return sh;                     // the farther lobe in shadow under a nearer one
      if(o === 99) return hash(x * 3.1 + y * 7.7 + seed) < .3 ? sh : base;
      const L2 = lobes[o], l = (-(x - L2.x) * .6 - (y - L2.y) * .8) / L2.r; return l > .35 ? lit : l > -.3 ? base : sh; }); }
  // ---- 大波 board on a gantry over the road: steel truss on two posts, a dark LED panel; amber glyphs lit / dim (blink)
  const GL = { dai:['....X....', '....X....', 'XXXXXXXXX', '....X....', '...X.X...', '...X.X...', '..X...X..', '.X.....X.', 'X.......X'],
    nami:['X...X....', '.X..XXXXX', '....X...X', 'X...XXXX.', '.X..XX..X', '...X.X.X.', '..X..XX..', '.X..X..X.', 'X..X....X'] };
  function gantry(on){ const key = 'wv_gantry' + (on ? 1 : 0); if(S[key]) return S[key]; const w = 104, h = 44, c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), R = (x, y, ww, hh, col) => { k.fillStyle = col; k.fillRect(x, y, ww, hh); };
    for(const x of [4, 95]){ R(x, 8, 5, 36, '#0a0c18'); R(x + 1, 8, 1, 36, '#4a5a88'); R(x + 2, 8, 2, 36, '#26304e'); R(x - 1, 40, 7, 4, '#0a0c18'); }
    R(0, 4, w, 4, '#0a0c18'); R(0, 4, w, 1, '#7a8cbc'); R(0, 5, w, 1, '#26304e'); R(0, 11, w, 3, '#0a0c18'); R(0, 11, w, 1, '#4a5a88');
    for(let x = 2; x < w - 2; x += 6){ k.fillStyle = '#161c30'; for(let t = 0; t < 4; t++) k.fillRect(x + t, 7 + t, 1, 1); }
    R(28, 14, 48, 24, '#d8dccc'); R(29, 15, 46, 22, '#0c0a10'); R(29, 15, 46, 1, '#2a2430'); R(36, 13, 1, 2, '#0a0c18'); R(67, 13, 1, 2, '#0a0c18');
    const lit = on ? '#ffb02a' : '#4a2a10', core = on ? '#ffe28a' : '#5a3418';
    [['dai', 33], ['nami', 51]].forEach(([g, ox]) => GL[g].forEach((row, yy) => [...row].forEach((ch, xx) => { if(ch === 'X'){ R(ox + xx * 2, 17 + yy * 2, 2, 2, lit); k.fillStyle = core; k.fillRect(ox + xx * 2, 17 + yy * 2, 1, 1); } })));
    R(70, 18, 2, 2, on ? '#ff4a3a' : '#3a1210'); return S[key] = c; }
  // build() makes every sprite now; buildSteps() is the same build with stopping points, for the staged warm-up (sundown.html WARM.q)
  function build(){ for(const _ of buildSteps()); }
  function* buildSteps(){ for(let v = 0; v < 3; v++) for(const dn of [false, true]){ for(const bk of [false, true]) for(const bg of [false, true]) clawSpr(v, dn, bk, bg); yield; } gantry(true); gantry(false); yield;
    for(let lv = 0; lv < MIDH.length; lv++){ const h = MIDH[lv]; for(let sd = 0; sd < 4; sd++) if(!S['wv_mid' + lv + '_' + sd]) S['wv_mid' + lv + '_' + sd] = midSpr(h, sd); yield; }
    for(let j = 0; j < 3; j++) if(!S['wv_sheet' + j]) S['wv_sheet' + j] = sheetSpr(j * 5 + 1);
    for(let j = 0; j < 2; j++) if(!S['wv_bsheet' + j]) S['wv_bsheet' + j] = sheetSpr(j * 9 + 4, 170, 30);
    yield; for(let j = 0; j < 3; j++) for(let lv = 0; lv < MLV.length; lv++) if(!S['wv_mist' + j + '_' + lv]){ const k = 'wv_mist' + j + '_' + lv; S[k] = mistSpr(j * 11 + 2, lv); S[k + 'f'] = flipC(S[k]); yield; }
    DROPS.forEach((g, j) => { if(!S['wv_drop' + j]) S['wv_drop' + j] = makeSprite(g, DPAL, false); }); yield;
    for(let r = 0; r < BROWS.length; r++){ const R = BROWS[r]; for(let j = 0; j < 3; j++){ const k = 'wv_bil' + r + '_' + j; if(!S[k]){ S[k] = billowSpr(R, r * 7 + j * 3 + 1); S[k + 'f'] = flipC(S[k]); yield; } } } }

  // ---- the plan for this rider: the active wave and where the rider is in it
  function active(p){ for(const w of plans) if(!w.off && p >= w.W0 - 360 && p <= w.W1 + 140 && segs[w.W0] && segs[w.W0].wvPlan === w) return w; return null; }   // plans are validated against the current road (a new ride regenerates segs)
  // per-segment barrel shape for wave w at rider position p: growth g, curl c, end taper e; returns null where there is no wave
  function shape(w, i, p){ const d = p - w.W0, g = sm((d + 300) / 210), c = sm((d + 60) / 62), end = sm((w.W1 + 14 - i) / 24), e = sm((i - w.W0 + 110) / 40) * end, ec = sm((i - w.W0 + 26) / 30) * end;
    // the wall's shoulder runs ~110 segments before the mouth, set out from the road and leaning seaward, so its crest shows against the sky
    if(e <= 0 || g <= 0) return null; const ry = (1.4 + 6.0 * g - 2.8 * c * ec) * (.5 + .5 * e), the = Math.max(.12 * PI, lerp(.26 * PI * g, .975 * PI, c * ec) * (.32 + .68 * e));
    const out = (1 - ec) * 1.5, lean = (1 - ec) * .35 * PI;
    const br = (i >= w.W0 - 20 ? (w.br || 1) : 1) * (1 - .55 * sm((i - w.W1 + 95) / 85) * c);   // the throat: the tube narrows toward the mouth (a small bright opening ahead, not
    // an open sky), and inside it breathes and tightens in the crescendo; the ceiling stays well above the rider
    return { ry:ry * br, rx:(1.9 + .55 * c * ec) * (.45 + .55 * br), xc:.27 - .2 * c * ec - out, the:Math.max(.1 * PI, the - lean * (1 - c)), g, c:c * ec, e }; }
  // which segments the barrel covers right now (props on land are hidden there; decided while the barrel is still beyond draw distance)
  function inTube(i){ const w = active(pSeg()); return !!w && i >= w.W0 - 26 && i <= w.W1 + 14; }
  // ---- the hooks env/coast.js reads (0 when no wave is near)
  function recede(i){ const w = active(pSeg()); if(!w) return 0; const p = pSeg(), d = p - w.W0, t = sm((d + 365) / 70) * (1 - sm((d - w.W1 + w.W0 - 10) / 60));
    return t * sm((i - (w.W0 - 440)) / 50) * sm((w.W1 + 90 - i) / 50); }
  let wetT = -1, wetW = null;
  function wetAt(i){ if(!wetW || wetT < 0) return 0; return clamp(1 - wetT / 9, 0, 1) * sm((i - wetW.W0 + 4) / 8) * sm((wetW.W1 + 90 - i) / 40); }

  // ================================================================ the layers, far to near
  // L1 far swell: two lines of swell on the horizon (backdrop); L2 the second wave: a smaller Hokusai crest further out to sea (projected
  // billboards, paler); L3 the main wave and its barrel (projected rings); L4 near: spray, foam sheets and droplets crossing the camera
  // (screen space, three depths); L5 the collapse: three rows of whitewater billows behind you. Debug: window.WV_ONLY = 'far'|'mid'|'main'|'near'|'collapse'.
  const ON = k => { const o = window.WV_ONLY; return !o || o === k; };
  const calm = () => reduce || !!(window.ASSIST && ASSIST.noFlash);

  // ---- L3 the barrel: the inner surface of the tube between each segment's near and far edge, banded by angle
  function ringPt(E, sh, th, inset){ const r = 1 - inset; return [E.x + (sh.xc - sh.rx * r * Math.cos(th)) * E.w, E.y - sh.ry * r * Math.sin(th) * E.w]; }
  function quad(a, b, c2, d2, col){ cx.fillStyle = col; cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.lineTo(c2[0], c2[1]); cx.lineTo(d2[0], d2[1]); cx.closePath(); cx.fill(); }
  const qp = (P, a, b, c2, d2) => { P.moveTo(a[0], a[1]); P.lineTo(b[0], b[1]); P.lineTo(c2[0], c2[1]); P.lineTo(d2[0], d2[1]); P.closePath(); };
  // the face in three translucent sub-layers, graded relative to the crest (Pipeline, Teahupo'o): a deep base (2 tones), a mid band (2 tones),
  // and a thin lip the moon glows through (3 tones, translucent). Stepped, no gradient.
  const BANDS = [[0, .16, '#020716', 1], [.16, .32, '#071433', 1], [.32, .48, '#133272', 1], [.48, .64, '#20509a', 1], [.64, .8, '#4a8ccc', 1], [.8, .93, '#92d0f0', .85], [.93, 1.01, '#e8f8fe', .8]];
  const bandOf = v => { for(const b of BANDS) if(v < b[1]) return b; return BANDS[BANDS.length - 1]; };
  let FR = { now:-1 };   // per-frame batches (light shafts), flushed under the bike
  function frame(now){ if(FR.now === now) return FR; FR = { now, sh:[new Path2D(), new Path2D(), new Path2D()], shN:0, shell:SHELLS.map(() => [new Path2D(), new Path2D(), new Path2D()]), shellN:0, w:null }; return FR; }
  // ---- the shells: nested tubes of moving water inside the face, each its own projected ring at a smaller radius (so nearer you, with its own
  // parallax), flowing round the tube axis (up the sea wall, over the ceiling, down the curtain) at its own speed and twist, so the bands spiral.
  // Each band is a body tone with a bright leading edge and a dark trailing edge (the shadow side); bands tear (narrow, vanish) and re-form.
  // Batched per frame into 3 fills per shell (a convex tube seen from inside: the shells of different segments do not overlap on screen).
  const SHELLS = [
    { inset:.07, lo:.04, hi:.9,  n:4, sp:.42, tw:.0045, w:.075, gap:.2,  a:.5,  fog:.55, col:'#1d4c90', hi2:'#4f8cca', dk:'#050f28' },   // the churn: broad bands, slow
    { inset:.14, lo:.18, hi:.95, n:5, sp:.85, tw:-.007, w:.04,  gap:.3,  a:.42, fog:.3,  col:'#5a98d0', hi2:'#b0dcf4', dk:'#12306a' },   // veins: thin, fast, counter-twisted
    { inset:.21, lo:.74, hi:.985, n:4, sp:.55, tw:.012, w:.06,  gap:.25, a:.3,  fog:.3,  col:'#cfeaf8', hi2:'#ffffff', dk:'#5a8cbc' }];  // the curtain: falling sheets on the land side

  function drawBarrel(w, s, fog, now, low, p){ const i = s.index, span = fog > .4 ? 3 : fog > .07 ? 2 : 1; if(i % span) return;   // far away one quad spans 2-3 segments
    const sf = segs[i + span - 1], A = s.p1.screen, B = sf && sf.p2.screen.w ? sf.p2.screen : s.p2.screen; if(!A.w || !B.w || B.y >= A.y + 1) return;
    const sa = shape(w, i, p), sb = shape(w, i + span, p) || sa; if(!sa) return; const K = fog > .45 ? 7 : fog > .2 ? 9 : 12, f2 = (sh, f) => f * sh.the, F = frame(now), cm = calm();
    function shells(){ if(!(sa.c > .45 && ON('shells') && i <= w.W1) || window.WV_PROF === 1) return; F.w = w; const st = span * (fog > .12 ? 3 : 2); if(i % st) return;   // one shell slice spans 2-3 face slices
      const s2 = segs[i + st - 1], B2 = s2 && s2.p2.screen.w ? s2.p2.screen : B, sb2 = shape(w, i + st, p) || sb, t = cm ? 3 : now / 1000, fr2 = x => x - Math.floor(x), mid = (P, Q, k) => [P[0] + (Q[0] - P[0]) * k, P[1] + (Q[1] - P[1]) * k];
      SHELLS.forEach((sh, q) => { if(fog > sh.fog || (q === 2 && sa.c < .6)) return; const Pq = F.shell[q], span2 = sh.hi - sh.lo, ins = sh.inset * (w.br || 1);
        for(let b = 0; b < sh.n; b++){ const ph = b / sh.n + sh.sp * t, ua = fr2(ph + sh.tw * i), ub = fr2(ph + sh.tw * (i + st)); if(Math.abs(ua - ub) > .5) continue;
          if(hash(b * 7.3 + q * 31 + Math.floor(ph * 2 + i * .02)) < sh.gap) continue;   // a gap: the band has torn here
          const wd = sh.w * (.55 + .45 * Math.sin(t * 2.3 + b * 1.7 + i * .06)), fa0 = sh.lo + span2 * ua, fb0 = sh.lo + span2 * ub, fa1 = Math.min(sh.hi, fa0 + wd), fb1 = Math.min(sh.hi, fb0 + wd); if(fa1 - fa0 < .004) continue;
          const A0 = ringPt(A, sa, f2(sa, fa0), ins), A1 = ringPt(A, sa, f2(sa, fa1), ins), B0 = ringPt(B2, sb2, f2(sb2, fb0), ins), B1 = ringPt(B2, sb2, f2(sb2, fb1), ins);
          qp(Pq[0], A0, A1, B1, B0);
          qp(Pq[1], mid(A1, A0, .22), A1, B1, mid(B1, B0, .22));   // leading edge, lit
          qp(Pq[2], A0, mid(A0, A1, .16), mid(B0, B1, .16), B0); } });   // trailing edge, the shadow side
      F.shellN++; }
    if(window.WV_ONLY === 'shells'){ shells(); return; }   // debug: the shells alone
    // ---- the road inside the tube: wet, blue, with water sheeting across it from the sea side and the lip's light reflected in broken columns
    if(sa.c > .45 && sa.the > .6 * PI && fog < .9){ const wa = sa.c * (1 - fog); cx.globalAlpha = .26 * wa; quad([A.x - A.w, A.y], [A.x + A.w, A.y], [B.x + B.w, B.y], [B.x - B.w, B.y], fcol('#2a5a92', fog, low));
      if(fog < .6 && A.y - B.y > PX * .5){ const yy = snap(A.y) - PX;
        // the lip's reflection: two broken columns under the bright lip (right half), converging on the mouth like the lane lines
        cx.fillStyle = fcol('#7ab8dc', fog * .6, low); for(const [lx, lw, ph] of [[.58, .1, 1.3], [.86, .07, 4.1]]){ if(hash(i * .7 + ph) < .35) continue; cx.globalAlpha = (lx > .7 ? .45 : .32) * wa; const ww = Math.max(PX, snap(A.w * lw)); cx.fillRect(snap(A.x + lx * A.w - ww / 2), yy, ww, PX); }
        // the face's dark reflection on the left half
        if(i % 2 === 0){ cx.globalAlpha = .18 * wa; cx.fillStyle = '#020610'; cx.fillRect(snap(A.x - A.w * .95), yy, snap(A.w * .7), PX); }
        // a sheet of water running across the asphalt: a thin film with a bright leading edge, every third segment
        if(i % 3 === 0){ const t = cm ? hash(i * 2.1) : ((now / 1500) + hash(i * 2.1)) % 1, xf = A.x + A.w * (-1.1 + 2.3 * t), x0 = A.x - A.w * 1.1;
          cx.globalAlpha = .22 * wa; cx.fillStyle = fcol('#5a96c4', fog * .6, low); cx.fillRect(snap(x0), yy, snap(xf - x0), PX);
          cx.globalAlpha = .6 * wa * (1 - t * .5); cx.fillStyle = fcol('#d6eef8', fog * .5, low); cx.fillRect(snap(xf) - PX * 2, yy, PX * 2, PX); } }
      cx.globalAlpha = 1; }
    // ---- the face: one path per band per segment (nearer segments overdraw farther ones)
    let curB = null, path = null; const thin = sa.c < .5 && ON('mid') ? .7 : 1;   // while it is still a wall, its upper face is thin water: the set wave behind shows through it
    const flush = () => { if(path){ cx.globalAlpha = curB[3] * (curB[0] >= .64 ? thin : 1); cx.fillStyle = fcol(curB[2], fog, low); cx.fill(path); path = null; } };
    let P0 = ringPt(A, sa, 0, 0), Q0 = ringPt(B, sb, 0, 0);
    for(let k = 0; k < K; k++){ const f1 = (k + 1) / K, v = (k + .5) / K, P1 = ringPt(A, sa, f2(sa, f1), 0), Q1 = ringPt(B, sb, f2(sb, f1), 0), band = bandOf(v);
      if(band !== curB){ flush(); curB = band; path = new Path2D(); } qp(path, P0, P1, Q1, Q0); P0 = P1; Q0 = Q1; }
    flush(); cx.globalAlpha = 1;
    // the boil where the face meets the sea: a broken pale line at the foot of the wall (Pipeline: the bottom of the face is whitewater)
    if(fog < .8 && A.w < 240){ const t = f2(sa, .016), a1 = ringPt(A, sa, 0, 0), a2 = ringPt(A, sa, t, 0), b1 = ringPt(B, sb, 0, 0), b2 = ringPt(B, sb, f2(sb, .016), 0); cx.globalAlpha = .7 * (1 - fog); quad(a1, a2, b2, b1, fcol('#9cc8e4', fog * .6, low)); cx.globalAlpha = 1; }
    shells();
    // ---- streaks round the tube at two speeds: broad slow ones low on the face, thin fast bright ones high, world-anchored per segment;
    // they fade in and out at their ends (no pops)
    if(fog < .85){ const SP = {};
      const set = (nv, per, lo, hi, cols, wd) => { const flow = cm ? 0 : (now / per) % 1;
        for(let j = 0; j < nv; j++){ const fr = ((j / nv) + flow / nv * 2) % 1, fv = lo + (hi - lo) * fr, fade = Math.min(1, fr / .15, (1 - fr) / .15); if(fade <= 0) continue;
          const wob = Math.sin(i * .31 + j * 2.3) * .012, fa = clamp(fv + wob, .01, .985), fb = clamp(fv + Math.sin((i + span) * .31 + j * 2.3) * .012, .01, .985), df = wd * (j % 3 === 0 ? 1.6 : 1);
          const ci = fr < .5 ? 0 : 1, al = Math.round(fade * (ci ? .7 : .55) * 4) / 4; if(al <= 0) continue; const col = cols[ci], key = col + al;
          const P = SP[key] || (SP[key] = { col, al, p:new Path2D() }); qp(P.p, ringPt(A, sa, f2(sa, fa), .003), ringPt(A, sa, f2(sa, fa + df), .003), ringPt(B, sb, f2(sb, fb + df), .003), ringPt(B, sb, f2(sb, fb), .003)); } };
      set(fog > .4 ? 1 : fog > .15 ? 2 : 4, 4200, .04, .62, ['#2f62a0', '#5a8ec4'], .026);
      set(fog > .4 ? 1 : fog > .15 ? 2 : 4, 1700, .45, .97, ['#5a8ec0', '#bfe4f4'], .011);
      for(const k2 in SP){ const P = SP[k2]; cx.globalAlpha = P.al * (1 - fog * .8); cx.fillStyle = fcol(P.col, fog * .7, low); cx.fill(P.p); }
      cx.globalAlpha = 1;
      // Hokusai's white specks on the face, fixed to the water's segment
      cx.fillStyle = fcol('#eef6fb', fog * .6, low); for(let j = 0; j < (fog > .3 ? 1 : 3); j++){ const fs = .08 + hash(i * 5.3 + j * 7.1) * .6, pt = ringPt(A, sa, f2(sa, fs), .01), sz = Math.max(PX, snap(A.w * .022)); cx.globalAlpha = (1 - fog) * .8; cx.fillRect(snap(pt[0]), snap(pt[1]), sz, sz); } cx.globalAlpha = 1; }
    // ---- the lip curtain: inside, the thrown lip falls as a translucent sheet; strands of water fall through it (dashes sliding down)
    if(sa.c > .6 && fog < .6 && i % 2 === 0){ const u = .5, E = { x:lerp(A.x, B.x, u), y:lerp(A.y, B.y, u), w:lerp(A.w, B.w, u) }, sw = Math.max(PX, snap(E.w * .014)), t0 = cm ? .3 : ((now / 650) + hash(i * 3.3)) % 1;
      cx.fillStyle = fcol('#e4f4fb', fog * .5, low); cx.globalAlpha = .55 * (1 - fog);
      for(let j = 0; j < 2; j++){ const ta = .8 + .17 * ((t0 + j * .5) % 1), tb = Math.min(.985, ta + .05), pa = ringPt(E, sa, f2(sa, ta), .004), pb = ringPt(E, sa, f2(sa, tb), .004);
        cx.beginPath(); cx.moveTo(pa[0], pa[1]); cx.lineTo(pa[0] + sw, pa[1]); cx.lineTo(pb[0] + sw, pb[1]); cx.lineTo(pb[0], pb[1]); cx.closePath(); cx.fill(); }   // a thin strand, not its bounding box
      cx.globalAlpha = 1; }
    // the crest: a white foam line along the lip's edge
    quad(ringPt(A, sa, f2(sa, .982), 0), ringPt(A, sa, sa.the, 0), ringPt(B, sb, sb.the, 0), ringPt(B, sb, f2(sb, .982), 0), fcol(WC.crest, fog * .5, low));
    // ---- Hokusai claws in two rows: a back row, darker and set behind the edge (odd segments), and the bright front row (even)
    if(fog < .88){ const back = i % 2 === 1, down = sa.the > .58 * PI, v = (i / 2 | 0) % 3, lp = ringPt(A, sa, back ? f2(sa, down ? .95 : .64) : sa.the, back && down ? -.04 : 0), want = A.w * .5 / 16;
      const big = want > PX, spr = clawSpr(v === 2 ? 0 : v, down, back, big), kk = Math.min(big ? want / 2 : want, PX * 1.5); if(kk > .25){ cx.globalAlpha = 1 - fog * .6;
        if(down) blit(spr, lp[0] + spr.width * kk * .3, lp[1] + spr.height * kk * .95, kk); else blit(spr, lp[0] + spr.width * kk * .42 - (back ? spr.width * kk * .3 : 0), lp[1] + kk * 2, kk); cx.globalAlpha = 1; } }
    // ---- spindrift: the offshore wind tears streaks of spray back off the crest and over the back of the wave (seaward, up), in three tones
    if(i % 3 === 0 && fog < .78 && sa.c < .9){ const lp = ringPt(A, sa, sa.the, 0), u0 = Math.max(PX, A.w * .025);
      for(let j = 0; j < (cm ? 1 : 3); j++){ const ph = cm ? .35 : ((now / (900 + j * 260)) + hash(i * 1.7 + j * 3.1)) % 1, len = snap(u0 * (5 - 3 * ph) * (1 + j * .4)), x = lp[0] - ph * A.w * (.9 + j * .35), y = lp[1] - ph * A.w * (.32 + j * .12) - hash(j + i) * A.w * .12;
        cx.globalAlpha = (1 - ph) * .85 * (1 - fog); cx.fillStyle = fcol(ph < .3 ? '#eef6fb' : ph < .65 ? '#a8cce0' : '#5f86b0', fog * .5, low); cx.fillRect(snap(x - len), snap(y), Math.max(PX, len), PX); } cx.globalAlpha = 1; }
    // ---- light shafts through the thin lip onto the road, in layers (a broad faint one, a narrow core; far ones fainter), batched per frame
    if(i % 6 === 2 && fog < .7 && sa.c > .8){ const far = fog > .3 ? 2 : 0, la = ringPt(A, sa, f2(sa, .84), 0), lb = ringPt(B, sb, f2(sb, .84), 0), ga = [A.x + .2 * A.w, A.y], gb = [B.x + .2 * B.w, B.y];
      qp(F.sh[far], la, lb, gb, ga); if(!far && i % 12 === 2){ const ca = ringPt(A, sa, f2(sa, .88), 0), cb = ringPt(B, sb, f2(sb, .88), 0); qp(F.sh[1], ca, cb, [B.x + .4 * B.w, B.y], [A.x + .4 * A.w, A.y]); } F.shN++; }
    // the far mouth: the last ring's rim, drawn as the bright translucent lip seen end-on, framing the sky, the moon and the road beyond.
    // It is the tube's own cross-section, so it grows as you approach it.
    if(i === w.W1 + 6 - (w.W1 + 6) % span && sa.c > .6){ const M2 = 10, rim = .16; let pth = new Path2D(), inner = new Path2D();
      for(let k = 0; k <= M2; k++){ const o = ringPt(A, sa, k / M2 * sa.the, -rim); if(k === 0) pth.moveTo(o[0], o[1]); else pth.lineTo(o[0], o[1]); }
      for(let k = M2; k >= 0; k--){ const n = ringPt(A, sa, k / M2 * sa.the, 0); pth.lineTo(n[0], n[1]); } pth.closePath();
      cx.globalAlpha = .78 * (1 - fog * .6); cx.fillStyle = fcol('#9cd0ea', fog * .5, low); cx.fill(pth);
      for(let k = 0; k < M2; k++){ const a1 = ringPt(A, sa, k / M2 * sa.the, 0), a2 = ringPt(A, sa, (k + 1) / M2 * sa.the, 0); inner.moveTo(a1[0], a1[1]); inner.lineTo(a2[0], a2[1]); }
      cx.globalAlpha = .9 * (1 - fog * .5); cx.strokeStyle = '#f2faff'; cx.lineWidth = Math.max(PX, snap(A.w * .03)); cx.stroke(inner); cx.globalAlpha = 1;
      w.mx = A.x + sa.xc * A.w; w.my = A.y - sa.ry * A.w * .45; w.mt = now; } }
  function flushShells(now){ const F = FR; if(F.now !== now || !F.shellN) return;
    SHELLS.forEach((sh, q) => { const P = F.shell[q]; cx.globalAlpha = sh.a; cx.fillStyle = sh.col; cx.fill(P[0]); cx.globalAlpha = Math.min(1, sh.a + .3); cx.fillStyle = sh.hi2; cx.fill(P[1]); cx.globalAlpha = sh.a + .15; cx.fillStyle = sh.dk; cx.fill(P[2]); });
    cx.globalAlpha = 1; F.shellN = 0; }
  // the far mouth's light grows as you near it (stepped glow), stronger in the crescendo
  function mouthLight(now){ const F = FR, w = F.w; if(F.now !== now || !w || w.mt !== now) return; const d = pSeg() - w.W0, g = sm(d / L); if(g <= 0) return; const r = W * (.06 + .22 * g + .06 * (w.tight || 0));
    glow(w.mx, w.my, r, '#d8f0ff', (calm() ? .12 : .2) * g); }
  function flushShafts(now){ const F = FR; if(F.now !== now || !F.shN) return; cx.globalCompositeOperation = 'lighter'; cx.fillStyle = '#bfe8ff';
    const fl = calm() ? 1 : [1, .6, .85, .7, .95][Math.floor(now / 85) % 5];   // the lip ripples: the shafts flicker in steps
    cx.globalAlpha = .05 * fl; cx.fill(F.sh[0]); cx.globalAlpha = .06 * fl; cx.fill(F.sh[1]); cx.globalAlpha = .03 * fl; cx.fill(F.sh[2]); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; F.shN = 0; }

  // ---- L2 the second wave: a smaller crest further out to sea, drawn as cached Hokusai-profile billboards every few segments (each at its
  // own depth, so it parallaxes against the main wave). Two stretches: one rising beside the approach, one breaking beyond the exit, seen
  // through the far mouth. It sinks into the sea (the segment's clip cuts it at the waterline) while it grows.
  function midWave(w, s, sx0, sy0, uw, fog, p){ const i = s.index, st = fog > .4 ? 6 : 3; if(i % st || fog > .92) return; const d = p - w.W0;
    // stretch 1: a tall set wave far out behind the approach and the barrel, its crest showing over the main wave's shoulder;
    // stretch 2: a broader wave breaking beyond the exit, close enough to the road to be seen through the far mouth
    let g = 0, two = false; if(i >= w.W0 - 270 && i <= w.W0 + 150) g = sm((d + 340) / 160) * sm((i - w.W0 + 270) / 40) * sm((w.W0 + 150 - i) / 40);
    else if(i >= w.W1 + 8 && i <= w.W1 + 170){ two = true; g = sm((d + 30) / 80) * sm((i - w.W1 - 8) / 25) * sm((w.W1 + 170 - i) / 40); }
    if(g < .04) return; const sw2 = Math.sin(i * .045), n2 = Math.sin(i * .13 + 2) * .5 + Math.sin(i * .031) * .5;
    const lat = two ? -(4.6 + .8 * sw2 + .5 * hash(i * .37)) : -(11.5 + 1.6 * sw2 + .8 * hash(i * .37)), hw = (two ? 3.6 + .9 * n2 : 9.6 + 1.8 * n2) * uw, x = sx0 + lat * uw;
    if(x + hw * 1.2 < 0 || x - hw * 1.2 > W) return; const near = clamp((230 - uw) / 110, 0, 1); if(near <= 0) return;   // right beside the camera it stands down (no giant cutout)
    let lv = 0; while(lv < MIDH.length - 1 && MIDH[lv] * PX * 1.5 < hw) lv++; const spr = S['wv_mid' + lv + '_' + ((two ? 2 : 0) + (i / st | 0) % 2)], k = Math.min(hw / MIDH[lv], PX * 1.5);
    cx.globalAlpha = (two ? (uw > 120 ? .7 : .9) : .9) * near * (1 - fog * .6); blit(spr, x, sy0 + (1 - g) * spr.height * k * .9, k); cx.globalAlpha = 1; }

  // ---- L1 the far swell: two lines of swell on the horizon over the sea, paler and bluer with distance, each with its own parallax. Stepped
  // silhouettes (a lit rim, a body), whitecaps at the peaks; they heave up while the sea draws back.
  let vpX = 0, vpY = 0, vpNow = -1;
  function farSwell(o, w, p){ const d = p - w.W0, amp = sm((d + 380) / 150) * (1 - sm((d - L - 90) / 90)); if(amp < .03) return;  window.__fs = [amp, vpX, o.hz, W]; const low = o.sk.low, hz = snap(Math.min(o.hz, vpY || o.hz)) - PX, x1 = Math.min(W, (vpX || W / 2) + W * .06), cm = calm();
    const row = (par, per, hmax, body, rim, cap, seed, fade) => { const off = skyOff * W * par + (cm ? 0 : o.now / 90 * par), st = PX * 3, P = new Path2D(), R = new Path2D(), pk = [];
      P.moveTo(0, hz + PX); let prev = 0;
      for(let x = 0; x <= x1 + st; x += st){ const u = (x + off) / per, h = (Math.max(0, Math.sin(u * 6.283 + seed)) * .7 + Math.max(0, Math.sin(u * 2.7 + seed * 2)) * .3) * hmax * amp * Math.min(1, (x1 - x) / (W * .12) + .15), y = snap(hz - h);
        P.lineTo(x, y); P.lineTo(x + st, y); R.rect(x, y, st, PX); if(h > hmax * amp * .72 && prev <= h) pk.push(x, y); prev = h; }
      P.lineTo(x1 + st, hz + PX); P.closePath(); cx.fillStyle = mixc(body, low, fade); cx.fill(P); cx.fillStyle = mixc(rim, low, fade * .8); cx.fill(R);
      cx.fillStyle = mixc(cap, low, fade * .6); for(let j = 0; j < pk.length; j += 2) cx.fillRect(pk[j], pk[j + 1] - PX, st, PX); };
    cx.save(); cx.beginPath(); cx.rect(0, 0, x1, hz + PX); cx.clip();
    row(.35, W * .33, PX * 16, '#4a7aa8', '#8cb4d4', '#d8e8f2', 1.3, .25);   // the farthest line: paler, flatter, slower
    row(.7, W * .52, PX * 28, '#2a5888', '#78a8cc', '#eef6fb', 4.1, .1);
    cx.restore(); }

  // ---- L4 near: spray, foam sheets and droplets crossing the camera, at three depths (far specks slow and dim, mid flecks, near droplets
  // and foam sheets fast and bright); L5 the collapse: three rows of billows rising at the screen's lower corners
  function drop(spr, x, y, a){ cx.globalAlpha = a; blit(spr, x, y, PX); }
  function overlay(now, w, p){ const d = p - w.W0, inside = d > -6 && d < L + 2, cm = calm(), rm = reduce, ox = w.mt === undefined ? W / 2 : clamp(w.mx, W * .2, W * .8), oy = w.mt === undefined ? H * .42 : clamp(w.my, H * .15, H * .6), dg = Math.hypot(W, H);
    if(ON('near')){
      // foam sheets torn off the curling lip, blowing across the road in front of the camera (the curl), two depths
      const sh = sm((d + 75) / 25) * (1 - sm((d + 4) / 10)); if(sh > .02){ const n = rm ? 1 : 3;
        for(let j = 0; j < n; j++){ const near = j === n - 1 && !rm, per = rm ? 5200 : near ? 1500 : 2600 + j * 500, ph = ((now / per) + hash(j * 4.7)) % 1, spr = S['wv_sheet' + (j % 3)], k = near ? PX * 1.5 : PX, sw = spr.width * k;
          const x = -sw + ph * (W + sw * 2), y = H * (.08 + hash(j * 2.3 + Math.floor(now / per + hash(j * 4.7))) * .16) + ph * H * .3; drop(spr, x, y, sh * (near ? .85 : .55)); } cx.globalAlpha = 1; }
      if(d > -115 && d < L - 4){ const P = cm ? 4200 : 1500, n = Math.floor(now / P), ph = (now % P) / P / .7; if(ph < 1 && hash(n * 3.7) > .15){ const spr = S['wv_bsheet' + (n % 2)], k = PX * 1.5, sw = spr.width * k, fr = Math.min(1, ph / .15, (1 - ph) / .15);
        const x = -sw + ph * (W + sw * 2), y = H * (.12 + .22 * hash(n * 1.3)) + ph * H * .1; drop(spr, x, y, .8 * fr);
        if(!cm) for(let j = 0; j < 6; j++){ const dx = x - sw * (.1 + .12 * j) - hash(n + j) * 30, dy = y + (hash(n * 2 + j) - .3) * H * .12; if(dy < H * .55) { cx.globalAlpha = .85 * fr; blit(S['wv_drop' + (j % 3 ? 2 : 1)], dx, dy, PX * 1.5); } }
        cx.globalAlpha = 1; } }
      if(inside){
        // three depths of spray streaming out of the barrel past the camera
        const tk = w.tight || 0, mul = 1 + (rm ? .3 : 1.4) * tk;
        // sheets of spray bursting in from the curtain (land side) toward the camera, every ~0.7 s, growing as they come
        { const P = cm ? 2200 : 700 - 250 * tk, n = Math.floor(now / P), ph = (now % P) / P; if(hash(n * 5.1) > .2){ const spr = S['wv_sheet' + (n % 3)], k = PX * (1 + .5 * ph), x = W * (.66 + .1 * hash(n)) + ph * W * .45, y = H * (.34 + .12 * hash(n * 2.2)) - ph * H * .22;
          cx.globalAlpha = .75 * Math.min(1, ph / .2, (1 - ph) / .3); blit(spr, x, y, k); if(!cm) for(let j = 0; j < 3; j++){ cx.globalAlpha = .8 * (1 - ph); blit(S['wv_drop' + (j ? 2 : 1)], x - (j + 1) * 22 + ph * 40 * j, y + j * 14 + ph * 30, PX * (1 + .5 * ph)); } cx.globalAlpha = 1; } }
        const L3 = [[Math.round((rm ? 6 : 16) * mul), rm ? 3200 : 2400 - 900 * tk, 0], [Math.round((rm ? 4 : 12) * mul), rm ? 2000 : 1150 - 400 * tk, 1], [Math.round((rm ? 1 : 5) * mul), rm ? 1400 : 620 - 200 * tk, 2]];
        for(const [n, per, depth] of L3) for(let j = 0; j < n; j++){ const sd = j * 3.1 + depth * 17, ph = ((now / per) + hash(sd)) % 1, an = hash(sd * 2.3) * 6.283, r = (.08 + ph * ph) * dg * (depth === 2 ? .75 : .5), x = ox + Math.cos(an) * r, y = oy + Math.sin(an) * r * .62;
          if(x < -20 || x > W + 20 || y < -20 || y > H) continue;
          if(depth === 0){ cx.globalAlpha = .25 + ph * .25; cx.fillStyle = '#6f9cc4'; cx.fillRect(snap(x), snap(y), PX, PX); }
          else if(depth === 1){ cx.globalAlpha = .35 + ph * .45; cx.fillStyle = '#bfe2ee'; cx.fillRect(snap(x), snap(y), PX * 2, PX * (ph > .5 ? 2 : 1)); }
          else if(ph > .25) drop(S['wv_drop' + (j % 2 + 1)], x, y, .5 + ph * .4); }
        cx.globalAlpha = 1; } }
    // the collapse behind: rows of billows rising at the screen's lower corners as it closes in (never over the bike in the centre)
    if(inside && ON('collapse')){ const close = clamp(1 - (p - w.col - 4) / 14, 0, 1) * (rm ? .5 : 1); if(close > .02){ const bs = Math.min(W * .2, H * .27), gap = bs * .5;
      BROWS.forEach((R, r) => { const hgt = R.h * PX, rise = close * (1.15 - r * .12), bob = cm ? 0 : snap(Math.sin(now / R.per + r * 1.7) * PX * (2 + 3 * close) + (hash(Math.floor(now / 70) + r) - .5) * PX * 3 * close);
        for(const side of [-1, 1]) for(let j = 0; j < R.n; j++){ const spr = S['wv_bil' + r + '_' + ((j + r) % 3) + (side > 0 ? 'f' : '')], sw = spr.width * PX, cxp = j * R.dx * W + sw * .5 - R.in * sw, x = side < 0 ? cxp : W - cxp;
          if(Math.abs(x - W / 2) < gap + sw * .5) continue; const y = H + hgt * (1 - rise) + j * PX * 4 + bob * (j % 2 ? 1 : -1); cx.globalAlpha = 1; blit(spr, x, y, PX); } }); cx.globalAlpha = 1; } }
    // the exit burst: specks and droplets flung outward from the opening at two depths; a pale mist band (thinner under reduced motion / no flash)
    const ex = w.exitT; if(ex >= 0 && ex < 2.2 && ON('near')){ const u = ex / 2.2;
      // (all opaque pixels: a speck or droplet goes out whole, at its own moment, instead of every one fading together through alpha)
      for(let j = 0; j < (rm ? 16 : 30); j++){ if(hash(j * 7.7 + 3) < u * 1.15 - .05) continue; const an = hash(j * 5.3) * 6.283, r = (.22 + u * (.7 + hash(j) * .7)) * W * .55, x = W / 2 + Math.cos(an) * r, y = H * .45 + Math.sin(an) * r * .55;
        if(j % 6 === 0 && !rm){ drop(S['wv_drop' + (j % 12 ? 1 : 2)], x, y, 1); continue; }
        cx.fillStyle = j % 2 ? (j % 4 === 1 ? '#bfe2ee' : '#eef6fb') : '#7fa6c4'; cx.globalAlpha = 1; const sz = PX * (j % 2 ? 2 : 1); cx.fillRect(snap(x), snap(y), sz, sz); }
      // behind: fine droplets drifting down and out, slow
      for(let j = 0; j < (rm ? 10 : 28); j++){ if(hash(j * 3.9 + 1) < u * 1.15 - .05) continue; const sx = hash(j * 9.1), side = sx < .5 ? -1 : 1, x = side < 0 ? sx * 2 * W * .3 : W - (sx - .5) * 2 * W * .3, y = H * hash(j * 4.3) * .8 + u * H * .15;
        cx.globalAlpha = 1; cx.fillStyle = j % 3 ? '#8fb8d4' : '#5f86b0'; cx.fillRect(snap(x + side * u * W * .05), snap(y), PX, PX * (j % 2 + 1)); }
      // mid: mist banks hanging at the sides, drifting outward as they thin a dither level at a time; the low banks keep their inner edge off
      // the road's centre (the lane ahead stays readable)
      const lv = (cm ? 1 : 0) + (u < .3 ? 0 : u < .6 ? 1 : 2); if(lv < MLV.length && u < .88) [[.05, .22, 0], [.2, .48, 1], [-.05, .66, 2]].forEach(([ox3, oy3, j]) => { for(const side of [-1, 1]){ const spr = S['wv_mist' + ((j + (side > 0 ? 1 : 0)) % 3) + '_' + lv + (side > 0 ? 'f' : '')], sw = spr.width * PX;
        const off = (ox3 + (side > 0 ? .06 : 0)) * W - u * W * .14, lim = j ? W * .38 - sw * .5 : W, x0 = Math.min(off + sw * .25, lim), x = side < 0 ? x0 : W - x0, y = H * (oy3 + (side > 0 ? .04 : 0)) + spr.height * PX * .5; cx.globalAlpha = 1; blit(spr, x, y, PX); } });
      // front: big billows at the lower corners, sinking away (one sprite pixel per game pixel, as the collapse rows; opaque)
      BROWS[2] && [0, 1].forEach(j => { for(const side of [-1, 1]){ const spr = S['wv_bil2_' + ((j + 1) % 3) + (side > 0 ? 'f' : '')], sw = spr.width * PX, x = side < 0 ? sw * (.35 + .75 * j) - u * W * .1 : W - sw * (.35 + .75 * j) + u * W * .1;
        if(Math.abs(x - W / 2) < Math.min(W * .2, H * .27) * .5 + sw * .5) continue; cx.globalAlpha = 1; blit(spr, x, H + u * spr.height * PX * 1.3 + j * PX * 6, PX); } });
      cx.globalAlpha = 1; } }
  function drawGantry(s, sx0, sy0, uw, fog, now, p, w){ const on = calm() || (now / 520 | 0) % 2 === 0, spr = gantry(on), k = uw * 2.9 / spr.width;
    cx.globalAlpha = 1 - fog * .6; blit(spr, sx0, sy0, k); cx.globalAlpha = 1; if(on && fog < .9) glow(sx0, sy0 - spr.height * k * .62, uw * .7, '#ffa030', .35 * (1 - fog)); }

  // ---- sound
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function rumble(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(3.6, 70, .22, t0); M.tone(34, 3.2, { type:'sawtooth', v:.07, fuzz:true, at:t0 }); }
  function roar(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(3.2, 260, .14 * v, t0); M.noise(2.4, 900, .08 * v, t0 + .3); }
  function crash(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.2, 160, .2 * v, t0); M.noise(.8, 1600, .1 * v, t0 + .05); }

  // ---- placement: decide once, ~560 segments into a coast visit, for a barrel mouth ~300 further on, clear of gates and the road's end
  function plan(i, s, L2){ const rel = i - (typeof landStart === 'number' ? landStart : 0); if(!L2 || L2.key !== 'coast' || rel !== 520 || LANDS[s.land].key !== 'coast') return;
    let W0 = i + 300; const z = zoneOfSeg(i), zEnd = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9;
    for(const g of gates) if(g > W0 - 320 && g < W0 + L + 50){ W0 = g + 330; break; }
    if(window.forkClear) W0 += forkClear(W0 - 320, W0 + L + 50);
    if(W0 + L + 110 > zEnd) return; for(const g of gates) if(g > W0 - 320 && g < W0 + L + 50) return;
    if(DIR && !DIR.request('greatwave', { seg:W0 })) return;
    const w = { W0, W1:W0 + L, off:false, cut:null, col:-1, beats:{}, exitT:-1, lastD:null, swept:false }; plans.push(w); if(plans.length > 6) plans.shift(); tag(w); }
  function tag(w){ const s2 = segs[w.W0]; if(s2) s2.wvPlan = w; else w.pend = true; }

  MECH.sp_wave = {
    recede, wetAt, plans, inTube,
    dbg(W0){ const w = { W0, W1:W0 + L, off:false, cut:null, col:-1, beats:{}, exitT:-1, lastD:null, swept:false }; plans.push(w); tag(w); return w; },   // testing: a wave at segment W0
    warm(){ build(); cx.save(); for(const k in S) cx.drawImage(S[k], 0, 0, PX, PX); cx.restore(); },
    *warmSteps(){ yield* buildSteps(); cx.save(); for(const k in S) cx.drawImage(S[k], 0, 0, PX, PX); cx.restore(); },   // first draw uploads each texture now, not mid-ride
    reset(){ wetT = -1; wetW = null; for(const w of plans){ if(w.cut){ w.cut.end(); w.cut = null; } } },
    place(i, s, L2){ for(const w of plans) if(w.pend && w.W0 === i){ s.wvPlan = w; w.pend = false; } plan(i, s, L2); },
    hitCar(){ const w = active(pSeg()); if(!w) return false; const d = pSeg() - w.W0; return d > -60 && d < L + 10; },
    update(dt){ const p = pSeg(); if(wetT >= 0){ wetT += dt; if(wetT > 10){ wetT = -1; wetW = null; } }
      const w = active(p); if(!w) return; const d = p - w.W0, a = w.lastD === null ? d : w.lastD, X = v => a < v && d >= v; w.lastD = d;
      // never in the typhoon's stretch
      if(d < -10 && !w.cut && MECH.sp_kaiju && MECH.sp_kaiju.wind && MECH.sp_kaiju.wind() > .01){ w.off = true; return; }
      // sweep the zone clear ahead of the rider: hazards off, traffic moved beyond the barrel
      if(!w.swept && d > -340){ w.swept = true; for(let j = Math.floor(w.W0 - 80); j < w.W1 + 40; j++) if(segs[j]) segs[j].hz = null;
        if(typeof cars !== 'undefined') for(const c of cars){ const cs = c.z / SEG; if(cs > p - 2 && cs < w.W1 + 30) c.z = (w.W1 + 50 + hash(c.z) * 60) * SEG; } }
      if(X(-335)) rumble(); if(X(-205)) roar(.8); if(X(-60)) roar(1.2);
      if(X(-80) && DIR && DIR.cine) w.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, slowmo:{ scale:.85, hold:.5 }, duck:.35, shake:5, tilt:-2, zoom:.05, guard:{ ahead:L + 110, behind:6 }, dur:0,
        id:'greatwave', card:window.WV_NOCARD ? null : { kanji:'大波', name:'GREAT WAVE', sub:'ride the barrel', col:'#7ad8ff' } });   // the title card (ui/cutin.js) plays every time the wave fires: the governor already keeps it rare
      if(X(0)){ w.col = w.W0 - 8; crash(1); }
      // the collapse chases the rider through the tube; if it closes in, the bike is given speed (never a crash)
      if(w.col >= 0 && d < L + 4){ w.col += 52 * dt; if(p - w.col < 9 && state === 'play'){ speed = Math.max(speed, MAXS * .97); } w.col = Math.min(w.col, p - 5);
        const id = Math.floor(w.col / 14); if(id !== w.boomId){ w.boomId = id; crash(.6); if(w.cut && !reduce) w.cut.hit(3); } }
      if(X(L)){ w.exitT = 0; crash(1.3); if(w.cut){ w.cut.end(); w.cut = null; } wetT = 0; wetW = w; if(DIR && DIR.done) DIR.done('greatwave'); }
      if(w.exitT >= 0) w.exitT += dt;
      // inside: the tube breathes, tightens toward the mouth (the crescendo), and the roar pulses with a shudder (no shake when calm)
      const ins = d > -6 && d < L, tight = sm((d - 72) / 30) * (1 - sm((d - L + 3) / 5)); w.tight = ins ? tight : 0; w.bt = (w.bt || 0) + dt;
      w.br = ins ? (1 - (calm() ? 0 : .035 * Math.sin(w.bt * 5.2)) * sm((d + 6) / 12)) * (1 - (calm() ? .05 : .11) * tight) : 1;
      if(ins){ w.pt = (w.pt || 0) + dt; const per = .95 - .4 * tight; if(w.pt > per){ w.pt = 0; roar(.3 + .6 * tight); if(w.cut && !calm()) w.cut.hit(2 + 3 * tight); } } },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = pSeg(), w = active(p); if(!w) return; const i = s.index;
      if(i === w.W0 - 262 && p < w.W0 - 10 && ON('main')) drawGantry(s, sx0, sy0, uw, fog, now, p, w);
      if(i % 5 === 0 && ENV.coast && ENV.coast.drawTetraAt && ON('main')){ const r = recede(i); if(r > .35 && i < w.W0 - 30) ENV.coast.drawTetraAt(sx0 - (2.2 + hash(i * 1.7) * 2.2) * uw, sy0, uw, fog, now, i); }
      if(now !== vpNow){ vpNow = now; vpX = sx0; vpY = sy0; } else if(sy0 < vpY) vpY = sy0;   // and the highest ground row (the sea's skyline)   // the farthest segment drawn: where the sea meets the sky ahead (the far swell stops there)
      if(ON('mid')) midWave(w, s, sx0, sy0, uw, fog, p);
      if((ON('main') || ON('shells')) && i >= w.W0 - 112 && i <= w.W1 + 14) drawBarrel(w, s, fog, now, MECH.sp_wave._low || '#101c34', p); },
    drawUnderBike(now){ flushShells(now); mouthLight(now); flushShafts(now); },
    drawBackdrop(o){ MECH.sp_wave._low = o.sk.low; const p = pSeg(), w = active(p); if(w && ON('far')) farSwell(o, w, p); },
    overlay(now, sk){ const p = pSeg(), w = active(p); if(w) overlay(now, w, p); }
  };
})();
