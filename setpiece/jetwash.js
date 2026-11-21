/* Sundown set piece: 噴射 JETWASH on Haneda (MECH.sp_jw, director id 'jetwash'). See setpiece/README.md.
   Load after setpiece/avalanche.js:   <script src="setpiece/jetwash.js"></script>

   A 747 takes off from a runway that ends just short of the expressway, rotates, and crosses low over the road ahead of you. Its blast
   comes back across the carriageway as a heat-shimmer wall with sheets of bay spray and apron dust, cones and paper tumbling, and a
   gentle shove toward the airfield side, while the frame shakes. Then it climbs away over the bay until its lights are one star.

   Beats, all driven by the rider's distance d (segments) to the crossing Zc; ~11 s from the first warning to the blast at top speed:
     d -560..-330  telegraph: the runway's lights come up on the right, the sequenced strobe ("rabbit") runs down the centreline toward the
                   road and across it; an amber 離陸注意 / JET BLAST board over the road (Zc - 300); DANGER JET BLAST boards on the
                   shoulders; the engines spool up (a whine over a low roar, building).
     d -330..-90   the approach: brake release, the take-off roll from the far end of the runway, rotation (nose up 11°), lift-off.
     d  -90..-10   the pass: it crosses the road low (belly ~18 m up), huge, gear retracting, strobes, beacons and landing lights;
                   the camera dips into a short slow-mo as it crosses; it rises off the top of the frame as you pass under its track.
     d  -40..+40   the blast: a dust/spray sweep comes from the bay side first (the visible cue), then the push toward the airfield side
                   (under a third of your steering, damped to nothing before the barrier), the heat shimmer, debris, a heavy shake.
     d   > +40     the exit: it turns out over the bay and climbs, dwindling to its landing lights and strobes, a star.
   Time: the plane's clock tau runs from the rider's distance, never slower than half of real time (a slow rider sees it pass a little
   farther ahead and meets a thinner blast); everything else keys off tau and d.

   References studied (Wikimedia Commons, viewed zoomed; rules taken, nothing copied):
   - "747 takeoff (3696524491)", "Cathay Pacific 747 takeoff (5895806723)", "United Airlines Boeing 747-400 takeoff at FRA",
     "747-8I (N6067E) takeoff": the climb-out attitude is a steep 10-15° nose-up; the main-gear bogies hang tilted with the gear still down
     just after lift-off; four engines hang low and forward of the wing; the hump reads first; a grey heat haze trails behind the engines.
     -> pre-rotated side sprites at 0/3/6/9/12°, gear down/retracting/up, a shimmer band behind the engines on the roll.
   - "Boeing 747 Runway 24R Takeoff-LAX" (night, long exposure): at night the departing jet IS its lights: a white landing-light line
     with a red beacon line under it, climbing off the runway's amber and red end lights. -> lights drawn hard and bright over a dim body,
     the far plane reduced to its landing-light star with a red beacon below it.
   - "St. Maarten Jet Blast Warning", "Warning sign on Maho Beach", "Airport Danger Jet Blast Sign (6543945505)", "Jet blast hazard sign,
     Reykjavík Airport", "Caution Jet Blast sign Docklands London": the boards are flat, high-contrast panels on two posts by the fence:
     a red DANGER band over white, a black jet silhouette with straight blast lines streaming from the tail, bold block capitals
     (or yellow with a black engine icon and rays). -> roadside boards: red band, white field, black jet with blast lines, JET BLAST.
   - Airfield lighting (as env/haneda.js): runway edges white, centreline white then red/white then red toward the end, red end lights,
     a sequenced flasher running toward the runway end; the blast fence of angled slats behind a runway end.
   Fairness: the zone is swept of traffic and hazards, the director's guard is up from the roll to the exit, nothing in the spectacle is
   solid, the push is telegraphed by the sweep from the bay side and the board, is a fraction of the steering, and fades to zero 0.6 half
   widths before the barrier (it can never put you on the wall). Reduced motion: no shake, flash, strobe or shimmer; slower sweeps, fewer
   particles, the slow-mo held gentle (the director's own rule). Performance: every sprite is built in warm(); nothing allocates mid-ride. */
"use strict";
(() => {
  const DIR = MECH.director, CARD = { kanji:'噴射', name:'JETWASH', sub:'a 747 departs over the road', col:'#ffb02a' };
  if(DIR) DIR.register('jetwash', { card:CARD });
  const PI = Math.PI, H1 = n => hash(n), V = 55;   // segments per second at top speed
  const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const pSeg = () => (position + PZ) / SEG;
  // timeline (segments from the crossing Zc)
  const JW_M = 40;   // segments a moment's end keeps from its road's border
  const TG = -560, BRD = 300, ROLL = -330, DX = -45, END = 300, RW = 18, SIGNS = { '-70':-1, '-110':-1, '-220':1 };   // DANGER boards: by the bay near the crossing, one by the field well before it (never in front of the rolling jet)
  // the plane's clock (seconds from brake release): rotation, lift-off, gear travel, the crossing
  const TR = 3.1, TL = 3.9, TGU = 4.7, TGS = 5.45, TC = (DX - ROLL) / V, TMAX = 16;
  const plans = [], S = {}, DBG = { prof:false };
  const snp = v => Math.round(v / PX) * PX;

  // ---------------------------------------------------------------- the flight, tabulated once (world units: x across, z along, alt up)
  const NT = TMAX * 60; let TAB = null;
  function table(){ if(TAB) return TAB; const T = new Float32Array((NT + 1) * 5); let x = 0, z = 0;
    for(let k = 0; k <= NT; k++){ const t = k / 60, v = t < 4.04 ? 3000 + 2600 * t : t < TC ? 13500 + 900 * (t - 4.04) : Math.min(26000, 13500 + 900 * (TC - 4.04) + 6000 * (t - TC));
      const psi = 1.5 * sm((t - TC) / 1.3), u = t - TL; let alt = u > 0 ? 2800 * u * u / (u + .35) : 0; if(t > TC + 1) alt += 650 * (t - TC - 1) * (t - TC - 1);
      const th = t < TR ? 0 : t < TC + 2 ? 11 * sm((t - TR) / 1.1) : lerp(11, 7, sm((t - TC - 2) / 2));
      T[k * 5] = x; T[k * 5 + 1] = z; T[k * 5 + 2] = alt; T[k * 5 + 3] = th; T[k * 5 + 4] = psi;
      x -= v * Math.cos(psi) / 60; z += v * Math.sin(psi) / 60; }
    const kc = Math.round(TC * 60), xc = T[kc * 5]; for(let k = 0; k <= NT; k++) T[k * 5] -= xc;
    return TAB = T; }
  const FL = { x:0, z:0, alt:0, th:0, psi:0, gear:0 };
  function flight(t){ const T = table(), q = clamp(t, 0, TMAX - .02) * 60, k = Math.floor(q), f = q - k, a = k * 5, b = a + 5;
    FL.x = T[a] + (T[b] - T[a]) * f; FL.z = T[a + 1] + (T[b + 1] - T[a + 1]) * f; FL.alt = T[a + 2] + (T[b + 2] - T[a + 2]) * f; FL.th = T[a + 3] + (T[b + 3] - T[a + 3]) * f; FL.psi = T[a + 4];
    FL.gear = t < TGU ? 0 : t < TGS ? 1 : 2; if(t < 0){ FL.x = T[0]; FL.th = 0; } return FL; }
  // the blast at the road: rises as the engines cross, holds, fades as it climbs away; space: the plume's footprint along the road
  const blastT = t => sm((t - TC - .05) / .35) * (1 - sm((t - TC - 1.6) / 1.6));
  const blastS = d => sm((d + 22) / 8) * (1 - sm((d - 20) / 14));

  // ---------------------------------------------------------------- sprites: the 747 side view (jump.js art), nose left, pitched, gear states
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // gear edits on the nose-right grids (rows of chars): clear a box / move a box up
  const edit = (G, x0, y0, x1, y1, f) => { for(let y = y0; y <= y1; y++) for(let x = x0; x <= x1; x++) f(x, y); };
  function gearGrid(src, big, st){ const G = src.map(r => r.split(''));
    const clr = (x0, y0, x1, y1) => edit(G, x0, y0, x1, y1, (x, y) => { if(G[y] && G[y][x] !== undefined) G[y][x] = '.'; });
    const move = (x0, y0, x1, y1, dy) => { const keep = []; edit(G, x0, y0, x1, y1, (x, y) => keep.push([x, y, G[y][x]])); clr(x0, y0, x1, y1); for(const [x, y, c] of keep) if(c !== '.' && G[y - dy]) G[y - dy][x] = c; };
    if(st === 0) return G.map(r => r.join(''));
    if(big){ if(st === 2){ clr(99, 49, 112, 58); clr(102, 41, 103, 42); clr(169, 41, 181, 58); }
      else { const w = []; edit(G, 99, 54, 112, 58, (x, y) => w.push([x, y, G[y][x]])); clr(99, 49, 112, 58); for(const [x, y, c] of w) if(c !== '.') G[y - 5][x] = c;   // bogies swing up toward the wells
        move(169, 45, 181, 58, 7); } }
    else { if(st === 2){ clr(49, 25, 57, 29); clr(84, 26, 90, 29); }
      else { const w = []; edit(G, 49, 28, 57, 29, (x, y) => w.push([x, y, G[y][x]])); clr(49, 25, 57, 29); for(const [x, y, c] of w) if(c !== '.') G[y - 3][x] = c; move(84, 26, 90, 29, 2); } }
    return G.map(r => r.join('')); }
  // EPX on a char grid (keeps the pixel look; the rotation then samples it, RotSprite-style, so pitched outlines stay clean)
  function epx(G){ const h = G.length, w = G[0].length, O = []; for(let y = 0; y < h * 2; y++) O.push(new Array(w * 2));
    const at = (x, y, P) => x < 0 || y < 0 || x >= w || y >= h ? P : G[y][x];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const P = G[y][x], A = at(x, y - 1, P), B = at(x + 1, y, P), C = at(x - 1, y, P), D = at(x, y + 1, P);
      O[y * 2][x * 2] = C === A && C !== D && A !== B ? A : P; O[y * 2][x * 2 + 1] = A === B && A !== C && B !== D ? B : P; O[y * 2 + 1][x * 2] = D === C && D !== B && C !== A ? C : P; O[y * 2 + 1][x * 2 + 1] = B === D && B !== A && D !== C ? D : P; }
    return O.map(r => r.join('')); }
  const RGBC = {}; const rgbOf = c => RGBC[c] || (RGBC[c] = hx(c));
  const THS = [0, 3, 6, 9, 12];
  // one pitched sprite: out = s canvas px per grid unit; pivot = the main wheels' contact point (grid units, nose left)
  function pitched(G4, gw, gh, pv, s, thDeg, pal){ const th = thDeg * PI / 180, c = Math.cos(th), sn = Math.sin(th), padT = Math.ceil(gw * .24), w = Math.ceil((gw + 4) * s), h = Math.ceil((gh + padT + 2) * s);
    const ox = (pv[0] + 2) * s, oy = (pv[1] + padT) * s, cv2 = can(w, h), k = cv2.getContext('2d'), img = k.createImageData(w, h), D = img.data, g4w = G4[0].length, g4h = G4.length;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const dx = (x + .5 - ox) / s, dy = (y + .5 - oy) / s, sx = dx * c + dy * sn + pv[0], sy = -dx * sn + dy * c + pv[1];
      const X = Math.floor(sx * 4), Y = Math.floor(sy * 4); if(X < 0 || Y < 0 || X >= g4w || Y >= g4h) continue; const ch = G4[Y][X]; if(ch === '.') continue; const col = pal[ch]; if(!col) continue;
      const v = rgbOf(col), i = (y * w + x) * 4; D[i] = v[0]; D[i + 1] = v[1]; D[i + 2] = v[2]; D[i + 3] = 255; }
    k.putImageData(img, 0, 0); cv2.px = ox; cv2.py = oy; cv2.s = s; return cv2; }
  // lights in SIDE2 grid units, nose left: landing (wing root, nose), taxi (nose gear), strobes (near wingtip, tail), nav (green, near tip),
  // beacons (top, belly), engine exhausts (inboard, outboard). Pivot: the main wheels.
  const PV2 = [86.5, 58.5], PV1 = [43, 29.5];
  const LT = { land:[[72, 42], [8, 33]], taxi:[[12, 46]], strobe:[[134, 55], [191, 31]], nav:[[133, 53]], bcn:[[52, 17], [82, 41]], exh:[[92, 46], [130, 51]] };
  function buildJet(){ const J = MECH.sp_jump && MECH.sp_jump.art ? MECH.sp_jump.art() : null; if(!J) return false;
    const pal = Object.assign({}, J.SIDE_PAL, { w:'#ffd890' }), flipG = G => G.map(r => r.split('').reverse().join(''));
    for(let st = 0; st < 3; st++){ const g2 = flipG(gearGrid(J.SIDE2, true, st)), g1 = flipG(gearGrid(J.SIDE1, false, st)), e2 = epx(epx(g2)), e1 = epx(epx(g1));
      for(let ti = 0; ti < THS.length; ti++){ S['j1_' + st + ti] = pitched(e1, 96, 30, PV1, 1, THS[ti], pal); S['j2_' + st + ti] = pitched(e2, 192, 60, PV2, 1, THS[ti], pal); S['j4_' + st + ti] = pitched(e2, 192, 60, PV2, 2, THS[ti], pal); } }
    S.tail = J.frontSprite(); return true; }

  // ---------------------------------------------------------------- sprites: boards, signs, cones (built in warm)
  // 3x5 capitals for the small boards
  const F3 = { A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', G:'011100101101011', H:'101101111101101', I:'111010010010111',
    J:'001001001101111', K:'101101110101101', L:'100100100100111', N:'110101101101101', O:'010101101101010', R:'110101110101101', S:'011100010001110', T:'111010010010010', U:'101101101101111', ' ':'000000000000000', '!':'010010010000010' };
  function t3(k, s, x, y, col, z){ z = z || 1; k.fillStyle = col; [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') k.fillRect(x + (n * 4 + i % 3) * z, y + ((i / 3) | 0) * z, z, z); }); }
  // a little jet silhouette, nose right, with straight blast lines from its tail (the warning boards' pictogram)
  function jetIcon(k, x, y, col){ const R = (a, b, w, h) => { k.fillStyle = col; k.fillRect(x + a, y + b, w, h); };
    R(8, 3, 15, 2); R(22, 3, 2, 1); R(5, 0, 3, 5); R(12, 5, 6, 1); R(13, 6, 3, 1); R(10, 2, 4, 1); for(let j = 0; j < 3; j++) R(-9 + j, 1 + j * 2, 11 - j * 2, 1); }
  // DANGER JET BLAST board (Maho / St Maarten rules): red band, white field, black jet with blast lines, black capitals, on two posts
  function signSpr(){ const w = 46, h = 44, c = can(w, h), k = c.getContext('2d'), R = (x, y, ww, hh, col) => { k.fillStyle = col; k.fillRect(x, y, ww, hh); };
    for(const x of [7, 37]){ R(x, 26, 3, 18, '#0a0c16'); R(x + 1, 26, 1, 18, '#4a5478'); }
    R(0, 0, w, 29, '#0a0c16'); R(1, 1, w - 2, 27, '#dcd8cc'); R(1, 1, w - 2, 8, '#c8201c'); R(1, 1, w - 2, 1, '#e8504a'); t3(k, 'DANGER', 12, 3, '#f4f0e8');
    jetIcon(k, 16, 11, '#101014'); t3(k, 'JET BLAST', 5, 20, '#101014'); R(1, 27, w - 2, 1, '#9a968c'); return c; }
  // the amber gantry board over the road: steel truss on two posts, a dark LED panel, two lines of amber pixels (lit / dim), red lamps
  function gantry(on, l1, l2){ const tw = Math.max(l1 ? l1.width : 60, l2 ? l2.width : 60), pw = tw + 14, w = pw + 44, h = 58, c = can(w, h), k = c.getContext('2d'), R = (x, y, ww, hh, col) => { k.fillStyle = col; k.fillRect(x, y, ww, hh); };
    for(const x of [4, w - 9]){ R(x, 8, 5, 50, '#0a0c18'); R(x + 1, 8, 1, 50, '#5a6890'); R(x + 2, 8, 2, 50, '#26304e'); R(x - 1, 54, 7, 4, '#0a0c18'); }
    R(0, 4, w, 4, '#0a0c18'); R(0, 4, w, 1, '#7a8cbc'); R(0, 5, w, 1, '#26304e'); R(0, 11, w, 3, '#0a0c18'); R(0, 11, w, 1, '#4a5a88');
    for(let x = 2; x < w - 2; x += 6){ k.fillStyle = '#161c30'; for(let t = 0; t < 4; t++) k.fillRect(x + t, 7 + t, 1, 1); }
    const x0 = (w - pw) >> 1; R(x0 - 1, 13, pw + 2, 40, '#d8dccc'); R(x0, 14, pw, 38, '#0c0a10'); R(x0, 14, pw, 1, '#2a2430');
    const lit = on ? '#ffb02a' : '#4a2a10', core = on ? '#ffe28a' : '#5a3418';
    [[l1, 17], [l2, 34]].forEach(([t, oy]) => { if(!t) return; const g = t.getContext('2d').getImageData(0, 0, t.width, t.height).data, ox = x0 + ((pw - t.width) >> 1);
      for(let y = 0; y < t.height; y++) for(let x = 0; x < t.width; x++) if(g[(y * t.width + x) * 4 + 3] > 0){ k.fillStyle = (x + y) % 3 === 0 ? core : lit; k.fillRect(ox + x, oy + y, 1, 1); } });
    for(const x of [x0 + 3, x0 + pw - 5]) R(x, 16, 2, 2, on ? '#ff4a3a' : '#3a1210'); return c; }
  // a traffic cone (orange, a white reflective band, a dark base), in four exact quarter-turns for tumbling
  const CONE = ['...KK...', '..KOOK..', '..KOOK..', '..KWWK..', '.KOOOOK.', '.KWWWWK.', '.KOOOOOK', 'KDDDDDDK'], CPAL = { K:'#120a08', O:'#ff6a1a', W:'#f0ece0', D:'#2a1a14' };
  function cone(r){ const n = 8, c = can(n, n), k = c.getContext('2d'); for(let y = 0; y < n; y++) for(let x = 0; x < n; x++){ let sx = x, sy = y; if(r === 1){ sx = y; sy = n - 1 - x; } else if(r === 2){ sx = n - 1 - x; sy = n - 1 - y; } else if(r === 3){ sx = n - 1 - y; sy = x; }
      const ch = CONE[sy][sx]; if(ch !== '.'){ k.fillStyle = CPAL[ch]; k.fillRect(x, y, 1, 1); } } return c; }
  // a dust/spray billow (the avalanche.js lobe method): round lobes shaded as balls lit from above-left, four tones, a dark-hue outline on the
  // shadow side only; f = churn frame. Apron dust is warm grey, the bay spray blue-white.
  const DUST = ['#d8ccb4', '#a8987e', '#7a6e5a', '#544a3e'], DOUT = '#2a241e', SPRAY = ['#dce6f6', '#a8b8d8', '#7484a8', '#4a5680'], SOUT = '#232a48';
  function billow(N, v, f, pal, out){ const c = can(N, N), k = c.getContext('2d'), img = k.createImageData(N, N), d = img.data, B = [], R = N * .5, rot = f * .4, br = [1, .95, 1.04, .98][f];
    const nl = 5 + (v % 3); B.push({ x:R, y:R * 1.1, r:R * .48 * br });
    for(let j = 0; j < nl; j++){ const an = j / nl * 6.283 + H1(v * 13 + j) * .7 + rot * (j % 2 ? 1 : -.6), dd = R * (.34 + H1(v * 7 + j * 3) * .14), rr = R * (.24 + H1(v * 5 + j * 11) * .15) * (j % 2 ? br : 2 - br);
      B.push({ x:R + Math.cos(an) * dd, y:R * 1.1 + Math.sin(an) * dd * .75, r:rr }); }
    const rgb = pal.map(hx), ob = hx(out), BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], mask = new Uint8Array(N * N), tone = new Int8Array(N * N);
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ let best = null, bz = -9; const px = x + .5, py = y + .5;
      for(const b of B){ const dx = (px - b.x) / b.r, dy = (py - b.y) / b.r, q = dx * dx + dy * dy; if(q > 1) continue; const z = Math.sqrt(1 - q) * b.r; if(z > bz){ bz = z; best = b; } }
      if(!best || py > N - 1) continue; const nx = (px - best.x) / best.r, ny = (py - best.y) / best.r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lit = -nx * .45 - ny * .7 + nz * .55, th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16;
      let t = lit + (th - .5) * .2; t = t > .62 ? 0 : t > .3 ? 1 : t > -.05 ? 2 : 3; mask[y * N + x] = 1; tone[y * N + x] = t; }
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const i = y * N + x; if(!mask[i]) continue; const o = i * 4; let col = rgb[tone[i]];
      if((y + 1 < N && !mask[i + N]) || (x + 1 < N && !mask[i + 1] && tone[i] >= 2) || y === N - 1) col = ob; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // a billow of on-screen diameter D (css px) at (x, y): the 32 or 64 px art, churning
  function puff(x, y, D, v, ph, spray, now, al){ if(D < PX * 3 || x < -D || x > W + D || y < -D || y > H + D) return; const N = D / PX > 40 ? 64 : 32, f = ((now / (reduce ? 600 : 200) + ph * 4) | 0) % 4, spr = S[(spray ? 's' : 'b') + N + '_' + (v % 3) + '_' + f]; if(!spr) return;
    cx.globalAlpha = al; blit(spr, x, y + D / 2, D / N); }
  function texts(){ const a = pixText('離陸注意', 16, false), b = pixText('JET BLAST', 16, false); S.gOn = gantry(true, a, b); S.gOff = gantry(false, a, b); }
  let SH = null;   // the shimmer scratch (allocated in warm, resized with the canvas)
  function build(){ if(!buildJet()) return false; S.sign = signSpr(); for(const N of [32, 64]) for(let v = 0; v < 3; v++) for(let f = 0; f < 4; f++){ S['b' + N + '_' + v + '_' + f] = billow(N, v, f, DUST, DOUT); S['s' + N + '_' + v + '_' + f] = billow(N, v + 4, f, SPRAY, SOUT); } for(let r = 0; r < 4; r++) S['cone' + r] = cone(r); texts();
    if(!SH) SH = can(8, 8); sizeSH();
    try{ cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = .004; for(const k in S) if(S[k] && S[k].width) cx.drawImage(S[k], 0, 0, 1, 1); cx.restore(); cx.clearRect(0, 0, W, H); }catch(e){}
    S.ok = true; return true; }
  function sizeSH(){ if(SH && typeof cv !== 'undefined' && (SH.width !== cv.width || SH.height !== cv.height)){ SH.width = cv.width; SH.height = cv.height; } }

  // ---------------------------------------------------------------- the plan
  function active(p){ for(const w of plans) if(!w.off && p >= w.Zc + TG - 60 && p <= w.Zc + END + 40 && segs[w.Zc] && segs[w.Zc].jwPlan === w) return w; return null; }
  let planKey = '';
  function plan(i, s, L2){ const ls = typeof landStart === 'number' ? landStart : 0, rel = i - ls; if(!L2 || L2.key !== 'haneda' || rel < 60 || rel > 900 || rel % 20 || LANDS[s.land].key !== 'haneda') return;
    // the border: gates are only laid ~2000 segments ahead of the road and the search runs far past that, so decide once this road's border
    // is laid (checking again every 20 segments); if it still is not by rel 900, stop short of the last laid gate's fork window. (A 1e9
    // fallback here let a crossing land past the border: its climb-out was seen from the next road's tunnels.)
    const z = zoneOfSeg(i), key = ls + ':' + s.land; if(planKey === key || (gates[2 * z + 1] === undefined && rel < 900)) return; planKey = key;
    const zEnd = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : gates.length ? gates[gates.length - 1] - 160 : 0;
    // the roll, the pass and the blast stay clear of checkpoints and forks (a fork's 60-segment approach counts) and of env/haneda's sign
    // gantries
    // the jet's whole life, from the roll to the climb-out in the sky (to END + 40, when active() lets go), stays on this road: JW_M short
    // of its border and clear of every fork's split window, so it can never be seen from the next road or a tunnel (the telegraph before
    // the roll keeps the gate rule below)
    const ok = Zc => { if(Zc + END + 40 + JW_M > zEnd) return false; if(window.inForkWindow && (inForkWindow(Zc + ROLL - 60, Zc + END + 40) || inForkWindow(Zc - 30, Zc + 120) || inForkWindow(Zc + ROLL - 30 + 190, Zc + 120 + 190))) return false; for(let k = 0; k < gates.length; k++){ const g = gates[k], g0 = g - (k % 2 ? 2 : 62); if(g + 2 >= Zc + ROLL - 30 && g0 <= Zc + 120) return false; if(Math.abs(g - (Zc - BRD)) < 14) return false; }
      if(Math.abs(((Zc - BRD) % 300) - 150) < 24) return false; return true; };
    let best = -1; for(let Zc = ls + 900; Zc < ls + 2660 && Zc + END + 40 + JW_M <= zEnd; Zc++){ if(!ok(Zc)) continue; const zz = Zc % 480; if(zz >= 300 && zz <= 420){ best = Zc; break; } if(best < 0) best = Zc; }
    if(best < 0) return; if(DIR && !DIR.request('jetwash', { tier:'hero', seg:best })) return; add(best); }
  function add(Zc){ const w = { Zc, off:false, cut:null, cut2:null, tau:-9, tt:-1, lastD:null, swept:false, shook:-1, boomed:false, done:false, push:0, minRoom:9 };
    plans.push(w); if(plans.length > 6) plans.shift(); const s2 = segs[Zc]; if(s2) s2.jwPlan = w; else w.pend = true; return w; }
  const inZone = (w, i) => i >= w.Zc + TG - 20 && i <= w.Zc + END;
  function placeSeg(i, s){ for(const w of plans){ if(w.off) continue;
      if(i >= w.Zc - 1300 && i <= w.Zc + 450) s.spjJet = null;   // no ambient jump.js jet while ours is up
      if(inZone(w, i)){ s.skRes = 1; s.hz = null; const pv = segs[i - 1]; if(pv && pv.jwZ) pv.hz = null; s.jwZ = 1; }
      if(i >= w.Zc - RW - 6 && i <= w.Zc + RW + 6) s.sprites = s.sprites.filter(sp => !(sp.env === 'haneda' && sp.x > 1.3));   // the runway takes the airfield's props here
      else if(i >= w.Zc - 280 && i < w.Zc) s.sprites = s.sprites.filter(sp => !(sp.env === 'haneda' && sp.x > 3)); } }   // and the view across the field to it stays open

  // ---------------------------------------------------------------- projection (the game's own, as setpiece/jump.js does it)
  function proj(xw, zw, h){ const base = Math.floor(position / SEG), gi = Math.floor(zw / SEG), zr = zw - position;
    if(gi > base && gi < base + DRAW - 1){ const sg = segs[gi]; if(sg && sg.p1.screen.scale && sg.p1.camera.z > DEPTH){ const f = (zw % SEG) / SEG, a = sg.p1.screen, b = sg.p2.screen, sc = a.scale + (b.scale - a.scale) * f, w = a.w + (b.w - a.w) * f;
      PR.x = a.x + (b.x - a.x) * f + xw / ROADW * w; PR.y = a.y + (b.y - a.y) * f - sc * h * H / 2; PR.sc = sc; return PR; } }
    if(zr < 250) return null; const sc = DEPTH / zr; PR.x = W / 2 + sc * (xw - playerX * ROADW) * W / 2; PR.y = (HZ || H / 2 + 2) - 2 + sc * (CAMH - h) * H / 2; PR.sc = sc; return PR; }
  const PR = { x:0, y:0, sc:0 };

  // ---------------------------------------------------------------- drawing: lights
  function star(x, y, c, col, a){ const q = Math.max(PX, snp(c)); cx.fillStyle = '#ffffff'; cx.fillRect(snp(x - q), snp(y - q / 2), q * 2, q); cx.fillRect(snp(x - q / 2), snp(y - q), q, q * 2);
    cx.fillStyle = col; cx.fillRect(snp(x - q * 2.5), snp(y - PX / 2), q * 5, PX); cx.fillRect(snp(x - PX / 2), snp(y - q * 1.8), PX, snp(q * 3.6)); glow(x, y, q * 6, col, a); }
  function dot(x, y, sz, col){ if(x < -sz || x > W + sz) return; cx.fillStyle = col; cx.fillRect(snp(x - sz / 2), snp(y - sz), sz, sz); }

  // ---------------------------------------------------------------- drawing: the plane
  const SHQ = []; let shN = 0;   // shimmer rectangles queued for the overlay: [x0, y0, x1, y1, amp]
  function queueShim(x0, y0, x1, y1, a){ if(reduce || a <= .02 || shN >= 4) return; const q = SHQ[shN] || (SHQ[shN] = [0, 0, 0, 0, 0]); q[0] = x0; q[1] = y0; q[2] = x1; q[3] = y1; q[4] = a; shN++; }
  function drawPlane(w, pr, t, fog, now){ const F = flight(t), kk = 61.5 * pr.sc * W / 2; if(kk * 192 < PX * 2) return; if(F.psi > .8) return drawTail(w, pr, t, fog, now, F);
    const ti = Math.max(0, Math.min(4, Math.round(F.th / 3))), thq = THS[ti] * PI / 180, c = Math.cos(thq), sn = Math.sin(thq);
    const lod = kk >= PX * 2.2 ? 4 : kk >= PX * .9 ? 2 : 1, s = lod === 4 ? 2 : lod === 2 ? 1 : .5, f = kk / s;
    const spr = S['j' + lod + '_' + F.gear + ti]; if(!spr) return;   // (no fog tint: at night a jet's lights and floodlit belly carry through the haze)
    LASTP = { x:Math.round(pr.x), y:Math.round(pr.y), kk:+kk.toFixed(3), lod, fog:+fog.toFixed(2) };
    const sx = pr.x, sy = pr.y, x0 = sx - spr.px * f, y0 = sy - spr.py * f, dw = spr.width * f, dh = spr.height * f;
    if(x0 > W + 4 || x0 + dw < -4 || y0 > H || y0 + dh < -4){ return; }
    const body = 1 - fog * .2; cx.globalAlpha = body * JA; cx.imageSmoothingEnabled = false; cx.drawImage(spr, snp(x0), snp(y0), Math.max(PX, snp(dw)), Math.max(PX, snp(dh))); cx.globalAlpha = JA;
    // lights, through the same pitch: (dx, dy) grid units from the wheels -> screen
    const L = (p) => { const dx = p[0] - PV2[0], dy = p[1] - PV2[1]; LP[0] = sx + (dx * c - dy * sn) * kk; LP[1] = sy + (dx * sn + dy * c) * kk; return LP; };
    const r0 = Math.max(PX, kk * 1.3), tt = now / 1000, strobe = !reduce && (tt % 1.2 < .05 || (tt % 1.2 > .13 && tt % 1.2 < .18)), beacon = reduce || tt % 1.1 < .16;
    for(const p of LT.nav){ L(p); dot(LP[0], LP[1] + r0 / 2, r0, '#3aff6a'); glow(LP[0], LP[1], r0 * 5, '#3aff6a', .35); }
    for(const p of LT.bcn){ L(p); if(beacon){ dot(LP[0], LP[1] + r0 / 2, r0, '#ff4a3a'); glow(LP[0], LP[1], r0 * 7, '#ff2a2a', reduce ? .2 : .6); } }
    for(const p of LT.strobe){ L(p); if(strobe) star(LP[0], LP[1], r0, '#e8f0ff', .6); else if(reduce) glow(LP[0], LP[1], r0 * 4, '#ffffff', .2); }
    // landing and taxi lights: on through the climb; the whole jet reduced to them far away (the long-exposure LAX rule)
    const big = kk * 192 > W * .12;
    for(const p of LT.land){ L(p); star(LP[0], LP[1], Math.max(PX * 1.5, r0 * (big ? 1.4 : 2.2)), '#fff4dc', big ? .55 : .7); }
    if(F.gear === 0) for(const p of LT.taxi){ L(p); dot(LP[0], LP[1] + r0, r0 * 1.5, '#fff0c8'); }
    // on the roll: the landing lights pool on the runway ahead of the nose; heat haze streams behind the engines
    if(F.alt < 300 && big){ L(LT.land[1]); glow(LP[0] - kk * 30, sy, kk * 26, '#ffe8c0', .1); }
    if(t > -1 && t < TC + 1.5 && kk * 192 > W * .05){ L(LT.exh[0]); const ex = LP[0], ey = LP[1]; queueShim(ex, ey - kk * 9, ex + kk * (t < TL ? 110 : 70), ey + kk * 5, t < TL ? 1 : .6);
      if(!reduce){ cx.fillStyle = '#8a8aa0'; for(let j = 0; j < 10; j++){ const ph = (tt * 1.6 + H1(j * 3.1)) % 1; cx.globalAlpha = .28 * (1 - ph) * (1 - fog) * JA; cx.fillRect(snp(ex + ph * kk * 90 + H1(j) * kk * 8), snp(ey + (H1(j * 7.3) - .5) * kk * 8 - ph * kk * 3), snp(Math.max(PX, kk * 4)), PX); } cx.globalAlpha = JA; } }
    w.onScreen = true; }
  const LP = [0, 0];
  // banking away over the bay, seen from behind: the jump.js head-on silhouette (wing line, four engines, fin), its tail light, strobes, wingtips
  function drawTail(w, pr, t, fog, now, F){ const spr = S.tail; if(!spr) return; const span = 10700 * pr.sc * W / 2, dw = span * 120 / 116, dh = dw * 34 / 120; LASTP = { tail:1, x:Math.round(pr.x), y:Math.round(pr.y), span:Math.round(span) }; if(span < PX * 6){ farLights(w, pr, t, now); return; }
    const x = pr.x, y = pr.y - 300 * pr.sc * H / 2; cx.globalAlpha = (1 - fog * .2) * JA; cx.imageSmoothingEnabled = false; cx.drawImage(spr, snp(x - dw / 2), snp(y - dh * .55), Math.max(PX, snp(dw)), Math.max(PX, snp(dh))); cx.globalAlpha = JA;
    const tt = now / 1000, r0 = Math.max(PX, dw * .012), strobe = !reduce && (tt % 1.2 < .05 || (tt % 1.2 > .13 && tt % 1.2 < .18)), beacon = reduce || tt % 1.1 < .16, wy = y + dh * .02;
    dot(x - dw * .48, wy + r0, r0, '#ff3a3a'); glow(x - dw * .48, wy, r0 * 5, '#ff3a3a', .4); dot(x + dw * .48, wy + r0, r0, '#3aff6a'); glow(x + dw * .48, wy, r0 * 5, '#3aff6a', .4);
    star(x, y - dh * .1, Math.max(PX, r0 * 1.2), '#fff4dc', .5);   // the white tail light: what is left of it far away
    if(strobe){ star(x - dw * .49, wy, r0, '#e8f0ff', .55); star(x + dw * .49, wy, r0, '#e8f0ff', .55); }
    if(beacon){ dot(x, y + dh * .12 + r0, r0, '#ff4a3a'); glow(x, y + dh * .12, r0 * 6, '#ff2a2a', reduce ? .2 : .55); } }
  // the far plane over the bay: its landing lights as one star, the beacon under it, a strobe now and then (backdrop, before the road)
  function farLights(w, pr, t, now){ const tt = now / 1000, g = clamp((pr.sc * 11800 * W / 2) / (W * .1), 0, 1), a = 1 - sm((t - TMAX + 3) / 2.5);
    if(a <= 0) return; const app = clamp(1 - FL.psi / 1.2, .25, 1);   // the lights point away as it turns
    star(pr.x, pr.y, PX * (1.2 + g * 1.4), '#fff4dc', .5 * a * app);
    if(reduce || tt % 1.1 < .16){ cx.fillStyle = '#ff4a3a'; cx.globalAlpha = a * JA; cx.fillRect(snp(pr.x - PX / 2), snp(pr.y + PX * 3), PX, PX); cx.globalAlpha = JA; glow(pr.x, pr.y + PX * 3, PX * 5, '#ff2a2a', .35 * a); }
    if(!reduce && tt % 1.2 < .05){ cx.fillStyle = '#ffffff'; cx.globalAlpha = a * JA; cx.fillRect(snp(pr.x - PX * 4), snp(pr.y), PX, PX); cx.globalAlpha = JA; } }

  // ---------------------------------------------------------------- drawing: the runway across the airfield, its lights, the blast fence
  const BASE = { i:0 };
  function drawRunway(w, s, fog, now, d, t){ const i = s.index, A = s.p1.screen, B = s.p2.screen; if(!A.w || !B.w) return; const k = i - w.Zc, X = (E, x) => E.x + E.w * x;
    const xa0 = X(A, 1.5), xb0 = X(B, 1.5); if(xa0 > W && xb0 > W) return;
    const fa = fogc0(fog), x1a = Math.min(W + 8, X(A, 80)), x1b = Math.min(W + 8, X(B, 80));
    poly(xa0, A.y, x1a, A.y, x1b, B.y - 1, xb0, B.y - 1, fc(Math.abs(k) >= RW - 1 ? '#22252f' : (i % 2 ? '#14161e' : '#15171f'), fog));
    // painted centreline dashes and the edge stripes (white paint)
    if(Math.abs(k) <= 1 && fog < .9) for(let x = 6; x < 60; x += 4){ const a0 = X(A, x), b0 = X(A, x + 2.2); if(a0 > W) break; poly(a0, A.y, b0, A.y, X(B, x + 2.2), B.y - 1, X(B, x), B.y - 1, fc('#8a8e9a', fog)); }
    if(Math.abs(k) === RW - 3 && fog < .9) poly(X(A, 4), A.y, x1a, A.y, x1b, B.y - 1, X(B, 4), B.y - 1, fc('#5a5e6a', fog));
    // the blast fence behind the runway end: angled slats, a lit top rail
    if(Math.abs(k) < RW){ const hf = .42, fx = 2.05; poly(X(A, fx), A.y, X(A, fx + .12), A.y - hf * A.w, X(B, fx + .12), B.y - hf * B.w, X(B, fx), B.y, fc(i % 2 ? '#2a3048' : '#323a56', fog));
      if(fog < .8){ cx.fillStyle = fc('#6a7698', fog); pxRect(X(A, fx + .12), A.y - hf * A.w - PX, Math.max(PX, X(A, fx + .3) - X(A, fx + .12)), PX); } }
    const sz = Math.max(PX, snp(A.w * .02)), dim = fog > .6 ? .6 : 1; cx.globalAlpha = dim;
    // runway end lights (red, facing the departing jet), every third segment across the runway
    if(Math.abs(k) < RW && i % 3 === 0) dot(X(A, 3.2), A.y, sz, '#ff3a2a');
    // edge lights along both edges, out to the far end; centreline lights: white, then red/white, then red toward the road
    if(Math.abs(k) === RW - 2) for(let x = 4; x < 70; x += 2.2){ const xx = X(A, x); if(xx > W + 4) break; dot(xx, A.y, sz, x < 12 ? '#ffc23a' : '#f4f7ff'); }
    if(k === 0){ for(let x = 4; x < 70; x += 1.4){ const xx = X(A, x); if(xx > W + 4) break; const n = Math.round(x / 1.4); dot(xx, A.y, sz, x < 9 ? '#ff3a2a' : x < 18 ? (n % 2 ? '#ff3a2a' : '#f4f7ff') : '#f4f7ff'); }
      // across the expressway: flush amber lights on the departure path
      for(let x = -.9; x <= .91; x += .3) dot(X(A, x), A.y, sz, reduce || ((now / 400 | 0) + Math.round(x * 3.4)) % 2 ? '#ffb02a' : '#7a4a10');
      // the rabbit: a strobe running down the centreline toward the road and across it, twice a second, from the telegraph to the blast
      if(!reduce && d > TG && t < TC + .3){ const ph = (now / 500) % 1, x = lerp(46, -4, ph), xx = X(A, x); star(xx, A.y - sz / 2, Math.max(PX, sz * .8), '#e8f0ff', .5 * (1 - fog * .5)); } }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- drawing: the blast at the road
  // sheets of spray (blown off the bay, left) and apron dust sweeping right across the carriageway, world-anchored per segment
  function drawSheets(w, s, sx0, sy0, uw, fog, now, t){ const i = s.index, k = i - w.Zc; if(k < -24 || k > 28 || i % 2 || fog > .85) return;
    const bt = blastT(t) + (t > TC - .1 && t < TC + .3 ? .5 * sm((t - TC + .1) / .4) : 0); if(bt <= .02) return;
    const ahead = clamp((k - D_F - 5) / 10, 0, 1); if(ahead <= 0) return;
    const lag = .05 + Math.abs(k - 2) * .012 + H1(i * 1.7) * .1, sp = reduce ? 2.2 : 3.4, xf = -2.6 + sp * (t - TC - lag); if(xf < -2.4) return;
    const len = 1.3 + H1(i * 2.9) * .9, xa = Math.max(-2.8, xf - len), xb = Math.min(3.2, xf); if(xb <= xa) return;
    const A = s.p1.screen, Y = h => sy0 - h * uw, Xp = x => sx0 + x * uw, al = Math.min(1, bt * 1.3) * (1 - fog * .8) * (1 - sm((xf - 2.6) / 1.2)) * ahead * .7;
    if(al <= .02) return; const ht = (.45 + H1(i * 3.3) * .45) * (.6 + .4 * bt), dust = k > 6;
    // the sheet as wind-driven streaks (spray off the bay pale blue-white, apron dust warm), the leading lip brightest
    const n = reduce ? 6 : 16, th = Math.max(PX, snp(uw * .012)), pal = dust ? ['#6a5e50', '#9a8a74', '#c8b89c'] : ['#7a8cb0', '#b8c8e2', '#eef4ff'];
    for(let j = 0; j < n; j++){ const r = H1(i * 3.7 + j * 1.3), u = H1(i * 7.1 + j * 2.9), x = xb - .05 - r * r * len, hh = u * ht * (1 - r * .4), l = (.12 + H1(j * 5.3 + i) * .3) * (1 - r * .5);
      cx.globalAlpha = al * (1 - r * .6); cx.fillStyle = pal[u > .66 ? 2 : u > .3 ? 1 : 0]; cx.fillRect(snp(Xp(x - l)), snp(Y(hh)), Math.max(PX, snp(l * uw)), th); }
    // the head of the sheet: billows rolling across at its front (the avalanche lobes, dust or spray), a smaller one behind
    if(i % 4 === 0){ const D = uw * (.55 + H1(i * 4.1) * .45) * (.7 + .3 * bt); puff(Xp(xb - .25), Y(ht * .45), D, i, H1(i * 2.3), !dust, now, al * 1.2); puff(Xp(xb - .25 - len * .55), Y(ht * .3), D * .7, i + 1, H1(i * 5.9), !dust, now, al * .8); }
    cx.fillStyle = pal[2]; const lz = Math.max(PX, snp(uw * .03)); for(let j = 0; j < 3; j++){ const hh = ht * (.1 + j * .22), xx = Xp(xb - .05 - H1(i + j) * .15); cx.globalAlpha = al; cx.fillRect(snp(xx), snp(Y(hh)), lz * 2, lz); }
    cx.globalAlpha = 1; }
  // cones (from the left shoulder), paper and grit tumbling across with the sheets; nothing is solid
  const CONES = [-8, -3, 4, 9, 15];
  function drawDebris(w, s, sx0, sy0, uw, fog, now, t){ const i = s.index, k = i - w.Zc; if(k < -24 || k > 28 || fog > .7) return;
    if(CONES.includes(k)){ const t0 = TC + .12 + (k + 8) * .012, u = t - t0; let x = -1.04, h = 0, r = 0, a = 1;
      if(u > 0){ x = -1.04 + u * (reduce ? 1.6 : 2.6); h = Math.abs(Math.sin(u * 6)) * .28 * Math.exp(-u * .8) + u * .05; r = ((u * (reduce ? 6 : 14)) | 0) % 4; a = 1 - sm((x - 2.2) / .8); }
      if(a > .02){ const spr = S['cone' + r], kk = uw * .09 / 8; if(kk * 8 > PX * 1.5){ cx.globalAlpha = a * (1 - fog * .6); blit(spr, sx0 + x * uw, sy0 - h * uw, kk); cx.globalAlpha = 1; } } }
    const bt = blastT(t); if(bt <= .05 || i % 3) return;
    const n = reduce ? 2 : 5, sz = Math.max(PX, snp(uw * .016));
    for(let j = 0; j < n; j++){ const ph = ((now / (reduce ? 1600 : 700)) + H1(i * 5.1 + j * 2.3)) % 1, x = lerp(-1.8, 2.6, ph), h = .05 + H1(i + j * 7) * .5 + Math.sin(ph * 9 + j) * .12, paper = j % 3 === 0;
      cx.globalAlpha = bt * (1 - fog * .7) * Math.min(1, (1 - ph) * 4); cx.fillStyle = paper ? (((now / 90 + j) | 0) % 2 ? '#e8e4d8' : '#a8a498') : (j % 2 ? '#8a7c68' : '#c8bca4');
      const xx = snp(sx0 + x * uw), yy = snp(sy0 - h * uw); if(paper){ if(((now / 120 + j) | 0) % 2) cx.fillRect(xx, yy, sz * 2, sz); else cx.fillRect(xx, yy, sz, sz * 2); } else cx.fillRect(xx, yy, sz, sz); }
    cx.globalAlpha = 1; }
  function drawGantry(s, sx0, sy0, uw, fog, now){ const on = reduce || (now / 520 | 0) % 2 === 0, spr = on ? S.gOn : S.gOff; if(!spr) return; const k = uw * 3.1 / spr.width;
    cx.globalAlpha = 1 - fog * .6; blit(spr, sx0, sy0, k); cx.globalAlpha = 1; if(on && fog < .9) glow(sx0, sy0 - spr.height * k * .55, uw * .8, '#ffa030', .3 * (1 - fog)); }
  function drawSign(s, sx0, sy0, uw, fog, now, sd){ const spr = S.sign; if(!spr) return; const k = uw * .62 / spr.width;
    { const x = sx0 + sd * 1.42 * uw; cx.globalAlpha = 1 - fog * .6; blit(spr, x, sy0, k); cx.globalAlpha = 1;
      const on = reduce || ((now / 600 | 0) + (sd > 0 ? 1 : 0)) % 2; if(on && fog < .9){ cx.fillStyle = '#ffb02a'; pxRect(x - PX / 2, sy0 - spr.height * k - PX * 2, PX, PX * 2); glow(x, sy0 - spr.height * k - PX, uw * .25, '#ffa030', .35 * (1 - fog)); }
      if(fog < .7) glow(x, sy0 - spr.height * k * .7, uw * .35, '#fff0d0', .08); } }

  // ---------------------------------------------------------------- screen space: the shimmer, grit, the wash from the bay side
  function shimmer(x0, y0, x1, y1, amp, now){ if(!SH || reduce) return; sizeSH(); const cw = cv.width, ch = cv.height;
    const X0 = clamp(Math.floor(x0 / PX), 0, cw - 1), X1 = clamp(Math.ceil(x1 / PX), 0, cw), Y0 = clamp(Math.floor(y0 / PX), 0, ch - 1), Y1 = clamp(Math.ceil(y1 / PX), 0, ch); if(X1 - X0 < 2 || Y1 - Y0 < 2) return;
    const g = SH.getContext('2d'); g.clearRect(0, 0, X1 - X0, Y1 - Y0); g.drawImage(cv, X0, Y0, X1 - X0, Y1 - Y0, 0, 0, X1 - X0, Y1 - Y0);
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false; const tt = now / 1000;
    for(let y = Y0; y < Y1; y++){ const e = Math.min(1, (y - Y0) / 3, (Y1 - y) / 3), v = (Math.sin(y * .9 + tt * 13) + Math.sin(y * .37 - tt * 7) * .6) * amp * e, s = Math.round(v); if(!s) continue;
      cx.drawImage(SH, 0, y - Y0, X1 - X0, 1, X0 + s, y, X1 - X0, 1); }
    cx.restore(); }
  // the blast reaching you: billows of dust and spray rolling in from the bay side along the screen's edges and across the top of the road,
  // flung right; the bike's window stays open. Reduced motion: fewer, slower, fainter.
  // a chase or a crash recovery under way (research/sundown-craft/chase_clean.md): the rider is busy regaining control, so only every other
  // billow rolls in, thinner, and none over the lower road
  function burst(amt, t, now){ if(amt <= .03) return; const n = reduce ? 5 : 11, bs = Math.min(W * .2, H * .27), u0 = t - TC - .05, busy = copT > 0 || recov > 0;
    for(let j = 0; j < n; j++){ const ph = u0 * (reduce ? .5 : .9) * (.8 + H1(j * 3.1) * .5) - H1(j * 7.7) * .45; if(ph < 0 || ph > 1.1 || (busy && (j % 2 || j % 3 === 1))) continue;
      const x = -W * .15 + ph * W * 1.3, row = j % 3, y = row === 0 ? H * (.36 + H1(j) * .08) : row === 1 ? H * (.62 + H1(j * 2) * .14) : H * (.48 + H1(j * 5) * .1), D = H * (.16 + H1(j * 9.3) * .14) * (1 + ph * .4);
      if(Math.abs(x - W / 2) < bs * .7 && y + D * .5 > H - bs * 1.1) continue; puff(x, y - D / 2, D * (busy ? .75 : 1), j, H1(j * 1.9), j % 2 === 0, now, amt * (1 - sm((ph - .75) / .35)) * (reduce ? .45 : .85) * (busy ? .55 : 1)); }
    cx.globalAlpha = 1; }
  function grit(amt, now, front){ if(amt <= .02) return; const n = reduce ? 18 : 80, bs = Math.min(W * .2, H * .27), sp = reduce ? .5 : 1.7;
    for(let j = 0; j < n; j++){ const vel = sp * (.7 + H1(j * 2.3) * .8), x = ((H1(j * 1.3) * W * 1.3 + now * vel) % (W * 1.3)) - W * .15, y = H * (.32 + H1(j * 3.7) * .6);
      if(x > front || (Math.abs(x - W / 2) < bs * .55 && y > H - bs * 1.05)) continue; const len = PX * (reduce ? 1 : 2 + ((j * 7) % 5)); cx.globalAlpha = Math.min(1, amt * (.6 + H1(j) * .6));
      cx.fillStyle = j % 4 === 0 ? '#e8f0ff' : j % 3 === 0 ? '#c8bca4' : '#9a8c78'; cx.fillRect(snp(x), snp(y), len, PX); }
    cx.globalAlpha = 1; }
  // ---------------------------------------------------------------- fog colour (scenery toward the sky's low colour)
  let LOWC = '#24284a'; const FCM = new Map(); const fc = (c, f) => { const q = Math.round(clamp(f, 0, 1) * 16), k = c + q; let v = FCM.get(k); if(!v){ if(FCM.size > 600) FCM.clear(); v = mixc(c, LOWC, q / 16 * .85); FCM.set(k, v); } return v; };
  const fogc0 = f => f;
  const setLow = c => { if(c === LOWC) return; LOWC = c; FCM.clear(); };

  // ---------------------------------------------------------------- sound: a synthesised jet (whine over a roar, hiss), through the director's loud bus
  let AU = null;
  function audio(){ if(AU !== null) return AU; if(typeof M === 'undefined' || !M.ac || !M.noiseBuf) return null; try{ const a = M.ac, dest = (DIR && DIR.bus && DIR.bus()) || M.out;
      const n1 = a.createBufferSource(), lp = a.createBiquadFilter(), g1 = a.createGain(); n1.buffer = M.noiseBuf; n1.loop = true; lp.type = 'lowpass'; lp.frequency.value = 300; g1.gain.value = 0;
      const n2 = a.createBufferSource(), bp = a.createBiquadFilter(), g2 = a.createGain(); n2.buffer = M.noiseBuf; n2.loop = true; bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 2.5; g2.gain.value = 0;
      const os = a.createOscillator(), of = a.createBiquadFilter(), g3 = a.createGain(); os.type = 'sawtooth'; os.frequency.value = 1700; of.type = 'lowpass'; of.frequency.value = 2800; g3.gain.value = 0;
      const mix = a.createGain(), pan = a.createStereoPanner ? a.createStereoPanner() : null;
      n1.connect(lp).connect(g1).connect(mix); n2.connect(bp).connect(g2).connect(mix); os.connect(of).connect(g3).connect(mix); if(pan) mix.connect(pan).connect(dest); else mix.connect(dest);
      n1.start(); n2.start(a.currentTime, .37); os.start(); AU = { a, lp, g1, g2, g3, os, pan }; }catch(e){ AU = false; } return AU; }
  function voice(lvl, hiss, whine, pitch, pan){ const A = audio(); if(!A) return; const t = A.a.currentTime, tc = .09;
    A.g1.gain.setTargetAtTime(.34 * lvl, t, tc); A.lp.frequency.setTargetAtTime(220 + 1100 * lvl, t, tc); A.g2.gain.setTargetAtTime(.07 * hiss, t, tc); A.g3.gain.setTargetAtTime(.02 * whine, t, tc);
    A.os.frequency.setTargetAtTime(pitch, t, .15); if(A.pan) A.pan.pan.setTargetAtTime(clamp(pan, -1, 1), t, .1); }
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function boom(){ if(!ac()) return; const t0 = M.ac.currentTime, out = DIR && DIR.bus ? DIR.bus() : null;
    M.noise(1.8, 80, .4, t0); M.noise(1.2, 380, .15, t0 + .03); M.noise(.9, 2200, .06, t0 + .1); M.tone(46, 1, { type:'sine', v:.12, at:t0 }); }
  function grind(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.5, 3000, .04 * v, t0); M.noise(.6, 900, .06 * v, t0 + .05); }

  // ---------------------------------------------------------------- the module
  MECH.sp_jw = {
    plans, S, DBG, _t:{ flight, blastT, blastS, TC, DX, st:() => ({ PI_F, D_F, last:LASTP }) },
    dbg(Zc){ return add(Zc); },
    rearm(){ for(const w of plans){ if(w.cut){ w.cut.end(); w.cut = null; } Object.assign(w, { tau:-9, tt:-1, lastD:null, swept:false, shook:-1, boomed:false, done:false, cut2:null }); } },   // testing: replay the moment   // testing: a crossing at segment Zc (place it before the road there is generated)
    warm(){ build(); if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16', '離陸注意JETBLAS').then(() => { if(S.ok) texts(); try{ if(MECH.arrival && MECH.arrival.momentWarm) MECH.arrival.momentWarm(CARD); }catch(e){} }).catch(() => {}); },
    reset(){ for(const w of plans){ if(w.cut){ w.cut.end(); w.cut = null; } if(w.cut2){ w.cut2.end(); w.cut2 = null; } } voice(0, 0, 0, 1700, 0); },
    place(i, s, L2){ if(i === 0){ for(const w of plans){ if(w.cut) w.cut.end(); if(w.cut2) w.cut2.end(); } plans.length = 0; planKey = ''; }   // a new ride: last ride's plans (one still pending past its end) must never attach to it
      for(const w of plans) if(w.pend && w.Zc === i){ w.pend = false; if(LANDS[s.land].key === 'haneda') s.jwPlan = w; else w.off = true; } plan(i, s, L2); placeSeg(i, s); },
    hitCar(){ const w = active(pSeg()); if(!w) return false; const d = pSeg() - w.Zc; return d > ROLL - 10 && d < 80; },
    pushing(){ const w = active(pSeg()); return w ? w.push : 0; },
    update(dt){ const p = pSeg(), w = active(p); if(!w){ if(AU) voice(0, 0, 0, 1700, 0); return; }
      const d = p - w.Zc, a = w.lastD === null ? d : w.lastD, X = v => a < v && d >= v; w.lastD = d; const play = state === 'play';
      // the plane's clock: from the rider's distance, never slower than half of real time once the roll has begun
      if(d >= ROLL){ if(w.tt < 0) w.tt = Math.max(0, (d - ROLL) / V); else if(play) w.tt += dt * .5; }
      const td = (d - ROLL) / V, t = Math.max(w.tau, td, w.tt >= 0 ? w.tt : -9); w.tau = t;
      // sweep the zone clear ahead of the rider: hazards off, traffic moved beyond the exit; later arrivals far ahead too
      if(!w.swept && d > TG - 30){ w.swept = true; for(let j = Math.floor(w.Zc + TG - 40); j < w.Zc + 130; j++) if(segs[j]) segs[j].hz = null;
        for(const c of cars){ const cs = c.z / SEG; if(cs > p - 2 && cs < w.Zc + 130) c.z = (Math.max(w.Zc + 140, p + 262) + hash(c.z) * 60) * SEG; } }
      if(w.swept && d < 120) for(const c of cars){ const cs = c.z / SEG; if(cs > p + 200 && cs < w.Zc + 130) c.z = (Math.max(w.Zc + 140, p + 262) + hash(c.z) * 60) * SEG; }
      // the push: toward the airfield side (right), a fraction of the steering, fading to nothing before the barrier
      const bs = blastS(d), bt = blastT(t), pw = bs * bt; let push = 0;
      if(play && pw > 0){ const room = (typeof wallX === 'function' ? wallX() : 1) - playerX, damp = clamp((room - .6) / .5, 0, 1); push = pw * damp;
        playerX += push * .55 * (.35 + .65 * Math.min(1, speed / MAXS)) * dt; w.minRoom = Math.min(w.minRoom, room); }
      w.push = push;
      // the cine: letterbox, duck, guard and the cut-in from the roll; a short slow-mo dip as it crosses
      if(X(ROLL) && DIR && DIR.cine){ let card = CARD;   // hero cut-ins play every time the moment fires (the governor already keeps it rare)
        if(card && MECH.cutin && MECH.cutin.show){ let shown = false; try{ shown = MECH.cutin.show('jetwash') !== false; }catch(e){} if(shown) card = null; }
        w.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, duck:.35, shake:2, guard:{ ahead:-ROLL + 140, behind:8 }, dur:0, card }); }
      if(!w.cut2 && t >= TC - .25 && t < TC + .3 && DIR && DIR.cine) w.cut2 = DIR.cine({ letterbox:0, slowmo:{ scale:.85, hold:.3 }, tilt:1.5, tiltDir:1, dur:1.1 });
      // the blast: a boom and a heavy hit as it reaches the road; rumbling shakes while you are in it
      if(!w.boomed && t >= TC + .12){ w.boomed = true; boom(); if(w.cut) w.cut.hit(10); else if(!reduce) shake = Math.max(shake || 0, 10); }
      if(pw > .2){ const id = Math.floor(t / .3); if(id !== w.shook){ w.shook = id; grind(pw); if(!reduce) shake = Math.max(shake || 0, 3.5 * pw); } }
      if(!w.done && d > 20){ w.done = true; if(DIR && DIR.done) DIR.done('jetwash'); }
      if(w.cut && (t > TC + 5 || d > 200)){ w.cut.end(); w.cut = null; }
      // the jet's voice: spool-up through the telegraph, the roll, the pass overhead, then away
      if(play){ const F = flight(Math.max(0, t)), zw = w.Zc * SEG + F.z, dx = F.x - playerX * ROADW, dz = zw - position - PZ, dy = F.alt + 600 - CAMH, dist = Math.hypot(dx, dz, dy);
        const near = 1 / (1 + Math.pow(dist / 15000, 2)), spool = sm((d - TG) / 160), thr = t < 0 ? .35 * spool : 1, lvl = clamp(Math.max(near * 1.4, .14 * spool) * thr, 0, 1) * (1 - sm((t - TMAX + 4) / 3)) * (1 - sm((d - END + 100) / 100));
        const app = clamp(-(dx * -Math.cos(F.psi) + dz * Math.sin(F.psi)) / (dist || 1), -1, 1);   // closing (+) or opening (-): a little Doppler on the whine
        voice(lvl, lvl * (.4 + .6 * bt), Math.min(1, lvl * 1.6) * (t < TC + 2 ? 1 : .6), 1500 + 500 * spool + 260 * app, dx / 12000); }
      else voice(0, 0, 0, 1700, 0); },
    drawSeg(s, sx0, sy0, uw, fog, now){ const w = W_F; if(!w) return; const i = s.index, k = i - w.Zc, d = D_F, t = w.tau;
      if(k < -BRD - 2 || k > RW + 30){ if(i === PI_F) drawPlaneHere(w, fog, now); return; }
      const T = window.__T && DBG.prof ? window.__T : null; let t0 = T ? performance.now() : 0;
      if(k >= -RW && k <= RW) drawRunway(w, s, fog, now, d, t);
      if(k === -BRD) drawGantry(s, sx0, sy0, uw, fog, now);
      if(SIGNS[k]) drawSign(s, sx0, sy0, uw, fog, now, SIGNS[k]);
      drawDebris(w, s, sx0, sy0, uw, fog, now, t); drawSheets(w, s, sx0, sy0, uw, fog, now, t);
      if(i === PI_F) drawPlaneHere(w, fog, now);
      if(T){ T.jw_seg = (T.jw_seg || 0) + performance.now() - t0; } },
    drawBackdrop(o){ setLow(o.sk.low); shN = 0; const p = pSeg(), w = active(p); W_F = w; PI_F = -1; SKY_F = false; if(!w){ return; } D_F = p - w.Zc; w.onScreen = false;
      // the climb-out fades away before active() lets go (no pop); and never drawn from a tunnel or another road (placement already keeps it
      // on its own road: this is the safety net for test placements)
      { const q = segs[Math.floor(p)], z = segs[w.Zc]; JA = q && z && (q.tunnel || q.land !== z.land) ? 0 : 1 - sm((D_F - END + 100) / 100); }
      if(!S.ok) build(); const t = w.tau; if(t < -1 || t > TMAX) return; const F = flight(Math.max(0, t)), zw = w.Zc * SEG + F.z, base = Math.floor(position / SEG), gi = Math.floor(zw / SEG);
      // in depth order among the road's sprites while its depth is on the drawn road; beyond it, in the sky over the backdrop; nearer, the overlay
      SKY_F = false;   // (it used to go over everything once it had climbed out; now it stays at its depth so nearer signs and lamps cover it)
      if(gi > base + 1 && gi < base + DRAW - 28) PI_F = gi;   // (not in the draw-distance fade: the plane is lit far beyond it)
      else if(gi >= base + DRAW - 28){ const pr = proj(F.x, zw, F.alt); if(pr && JA > .004){ cx.globalAlpha = JA; if(pr.sc * 11800 * W / 2 < W * .05) farLights(w, pr, t, o.now); else drawPlane(w, pr, t, .6, o.now); cx.globalAlpha = 1; } } },
    overlay(now, sk){ const w = W_F; if(!w) return; const d = D_F, t = w.tau;
      // the plane nearer than the drawn road (overhead, going behind): on top
      if(t >= 0 && t < TMAX && PI_F < 0){ const F = flight(t), zw = w.Zc * SEG + F.z, base = Math.floor(position / SEG), gi = Math.floor(zw / SEG); if(gi <= base + 1 || SKY_F){ const pr = proj(F.x, zw, F.alt); if(pr && JA > .004){ cx.globalAlpha = JA; if(pr.sc * 11800 * W / 2 < W * .045) farLights(w, pr, t, now); else drawPlane(w, pr, t, 0, now); cx.globalAlpha = 1; } } }
      const bt = blastT(t), near = blastS(d) * bt;
      // the heat-shimmer wall over the road where the blast crosses it, then around you
      // (a low band where the hot air lies over the road and the field: the heat-haze rule, not the whole frame)
      if(bt > .05 && !reduce){ const hz = HZ || H / 2, inside = d > -4; queueShim(0, hz - H * (inside ? .03 : .05), W, hz + H * (inside ? .2 : .13), .85 * bt); }
      for(let n = 0; n < shN; n++){ const q = SHQ[n]; shimmer(q[0], q[1], q[2], q[3], q[4], now); } shN = 0;
      burst(near, t, now);
      grit(near, now, W * 1.2 * clamp((t - TC - .05) / (reduce ? .9 : .55), 0, 1));   // the sweep enters from the bay side first: the cue
      // the plane's landing lights wash the road as it passes over (additive, stepped; never a flash)
      if(t > TC - 1 && t < TC + 1.2 && d < 0){ const a = (1 - Math.abs(t - TC) / 1.2) * .1; cx.globalCompositeOperation = 'lighter'; cx.fillStyle = 'rgba(255,232,190,' + a.toFixed(3) + ')'; pxRect(0, 0, W, snp(H * .4)); cx.globalCompositeOperation = 'source-over'; } }
  };
  let W_F = null, D_F = 0, PI_F = -1, LASTP = null, SKY_F = false, JA = 1;
  function drawPlaneHere(w, fog, now){ const t = w.tau; if(t < -1 || t > TMAX) return; const F = flight(Math.max(0, t)), pr = proj(F.x, w.Zc * SEG + F.z, F.alt); if(pr && JA > .004){ cx.globalAlpha = JA; drawPlane(w, pr, Math.max(0, t), fog, now); cx.globalAlpha = 1; } }
  addEventListener('load', () => { try{ if(!S.ok) build(); }catch(e){ console.warn('sp_jw warm', e); } });
})();
