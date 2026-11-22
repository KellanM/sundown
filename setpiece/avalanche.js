/* Sundown set piece: 雪崩 AVALANCHE on Snow Onsen (MECH.sp_aval, director id 'avalanche'). See setpiece/README.md.
   Load after setpiece/fireball.js:   <script src="setpiece/avalanche.js"></script>

   A white wall roars down the mountainside. You race for a snow shed (a concrete avalanche gallery, 雪崩覆道, as on the mountain roads
   of Niigata and Toyama) as the slide slams over its roof, ride the dark gallery while the snow thunders overhead and blasts in through
   the open side, then burst out into powder.

   Beats, all driven by the rider's distance d to the shed mouth W0 (never by the clock); about 15 s from the crack to the mouth at speed:
     d -720..-600  telegraph: a crack and a boom; the crown fracture opens high on the slope; dust streams off the ridge (world and
                   backdrop); an amber 雪崩注意 board on a gantry over the road at d -640; the snowfall thickens (ENV.snow.fall);
     d -600..-5    the slide: a powder plume rises over the road's far end (backdrop, so a crest, bend or the town never hides it all),
                   then the cloud wall itself runs down the face along 200 segments of road beside you (snapped cedars, slab blocks);
     d -300..0     the race: the front cue (崩 meter and your mark), the slide keeps its own pace (speed is given if it gets ahead), the
                   rumble builds; from d -75 the slide slams onto the roof (billows boiling over the lintel, powder off its edge);
     d 0..L        inside: pillars and ribs strobe past, sodium pools, falling streaks and sheets of snow past the open side, sprays fanning
                   in through the openings, a ceiling shower as you pass under the impact, the thunder overhead every 22 segments;
     d > L         the exit: a powder burst from the portal crowding the screen's edges (the road and bike stay clear), hashed grain,
                   settling flakes, calm, and a fresh snowbank at the road's edges.
   References studied (Wikimedia Commons, viewed zoomed; rules taken, nothing copied):
   - Oota dōmon, Niigata prefectural road 23 (snow shed in winter): a heavy concrete portal whose opening has 45° chamfered upper
     corners; an amber board with black text on the lintel; the valley side a row of arched windows; yellow/black delineators.
     -> the portal: chamfered opening, amber lintel board (雪見洞門), arched openings along the valley side.
   - Snow sheds on Route 105 (inside): transverse ceiling beams every bay with chamfered haunches; the open side a colonnade whose
     pillars converge hard to the vanishing point; the openings are the brightest thing inside and stripe the road.
     -> ribs and pillars every 6 segments (they strobe at speed); the openings are pale slots against a dark interior.
   - Kakinoki / Kizawa / Akahoki sheds (Route 252, 158): the mountain side is a solid wall dug into the slope, the roof continues
     the slope so the snow runs over it. -> a retaining wall rises beside the road into the portal; the slope meets the roof.
   - Avalanche at Zinal and avalanche on Everest (powder clouds): the cloud is a wedge, tallest and most billowed at the head, a
     cauliflower of round lobes each lit on top and shadowed beneath, deep crevices between lobes, a thinner smoky tail upslope.
     -> billows built from lobes shaded as balls in 4 tones (white to blue-grey), a dark-hue outline on the shadow side only, the head
     stacked 3 high, tail lobes dithered.
   - env/snow.js (Hasui, Celeste): snow shadows blue-violet, never grey; lit snow on upward faces; one light from above.
     -> every snow tone here is from the road's own ramp (SN), the cloud's shadow tones are blue-violet, the sodium light warms only
     the jets and surfaces near the lamps.
   Fairness: the zone is swept of traffic and hazards, the director's guard is up from the race to the exit, the cloud never lies on
   the road ahead of the rider (it crosses only behind), and if the slide's own pace would beat the rider to the road the rider is
   given speed (never a crash). No full-screen white ever. Reduced motion: a lighter, slower burst, a gentle shake, slower churn, steady board, fewer particles.
   Performance: every sprite is built in warm() (fog tints too); nothing allocates a canvas mid-ride. */
"use strict";
(() => {
  const DIR = MECH.director, CARD = { kanji:'雪崩', name:'AVALANCHE', sub:'make the snow shed', col:'#bfe0ff' };
  if(DIR) DIR.register('avalanche', { card:CARD });
  const L = 110, BAY = 6, PI = Math.PI;
  // the timeline in segments from the mouth: crack, slide starts, race (the front keeps its own pace), the board's place; ~15 s crack to mouth
  const TG = -720, SL = -600, RC = -300, BRD = 640, PATH0 = 200;
  const snp = v => Math.round(v / PX) * PX, sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const H1 = n => hash(n);
  const pSeg = () => (position + PZ) / SEG;
  const plans = [], DBG = { prof:false };   // DBG.prof: per-part timings into window.__T (perf tooling)
  const S = {};
  // ---- the cross-section of the shed, in half-road widths: inner walls, outer face, ceiling, chamfer, roof top, parapet
  const XI = 1.32, XO = 1.62, XF = 1.78, HC = 1.36, HCH = .22, HR = 1.72, HF = 1.84, PAR = .3, LIN = HC - HCH - .05;
  // ---- palettes: the road's snow ramp (env/snow.js), cold concrete at night, the sodium lamps
  const SN = { O:'#20264a', D:'#38416e', M:'#5c6898', L:'#93a0cc', H:'#d6def2' };
  const CON = { O:'#05060a', D:'#0b0d15', M:'#131722', L:'#1c2131', H:'#2a3046', E:'#46506e' }, PORT = { L:'#3a4260', H:'#4e5878', E:'#6c7898' };   // the portal face catches the snow light outside
  const NA = { core:'#fff2c8', hot:'#ffc870', glow:'#ffa040', tint:'#9a6430' };
  const BILL = ['#eef4fc', '#c6d2ee', '#93a0cc', '#5c6898'], BOUT = '#2a3060';                 // powder: lit, light, mid, shade; outline
  const WARMB = ['#fff0dc', '#e8ceb0', '#a89cb4', '#625e80'], WOUT = '#2a2238';                // a jet lit by the sodium lamps inside
  // ---- fog: scenery toward the sky's low colour (like the road), the interior toward the dark of the gallery
  let low = '#24284a', FC = new Map(); const fc = (c, f) => { let a = FC.get(c); if(!a){ a = new Array(17); FC.set(c, a); } const q = Math.round(clamp(f, 0, 1) * 16); return a[q] || (a[q] = mixc(c, low, q / 16 * .85)); };
  const IC = new Map(); const ic = (c, f, lt) => { const q = Math.round(clamp(f, 0, 1) * 8), l = Math.round(clamp(lt, 0, 1) * 6), k = c + q * 10 + l; let v = IC.get(k); if(!v){ v = mixc(mixc(c, NA.tint, l / 6 * .55), '#05060a', q / 8 * .8); IC.set(k, v); } return v; };
  const setLow = c => { const [r, g, b] = hx(c), q = '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); if(q === low) return; low = q; FC.clear(); };   // quantised: the slow night reuses caches

  // ---------------------------------------------------------------- sprites (all built in warm)
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // a powder billow: overlapping round lobes, each shaded as a ball lit from above-left (the moon), so the four tones follow the lobes and the
  // crevices between them go dark; a dark-hue outline only on the shadow side (bottom and right). tail = dithered (thin smoke upslope).
  // f = churn frame 0..3: the lobes roll forward and breathe, so the cloud boils without changing shape class.
  function billow(N, v, f, pal, out, tail){ const c = can(N, N), k = c.getContext('2d'), img = k.createImageData(N, N), d = img.data, B = [], R = N * .5, rot = f * .38, br = [1, .96, 1.03, .98][f];
    const nl = 6 + (v % 3); B.push({ x:R, y:R * 1.08, r:R * .5 * br });
    for(let j = 0; j < nl; j++){ const an = j / nl * 6.283 + H1(v * 13 + j) * .7 + rot * (j % 2 ? 1 : -.6), dd = R * (.36 + H1(v * 7 + j * 3) * .14), rr = R * (.26 + H1(v * 5 + j * 11) * .16) * (j % 2 ? br : 2 - br);
      const yy = R * 1.08 + Math.sin(an) * dd * .8 - (Math.sin(an) < 0 ? R * .08 : 0); B.push({ x:R + Math.cos(an) * dd, y:yy, r:rr }); }
    const rgb = pal.map(hx), ob = hx(out), BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], mask = new Uint8Array(N * N), tone = new Int8Array(N * N);
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ let best = null, bz = -9; const px = x + .5, py = y + .5;
      for(const b of B){ const dx = (px - b.x) / b.r, dy = (py - b.y) / b.r, q = dx * dx + dy * dy; if(q > 1) continue; const z = Math.sqrt(1 - q) * b.r + (N - b.y) * .02; if(z > bz){ bz = z; best = b; } }
      if(!best) continue; if(py > N - 1) continue;
      const nx = (px - best.x) / best.r, ny = (py - best.y) / best.r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lit = -nx * .45 - ny * .7 + nz * .55, th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16;
      let t = lit + (th - .5) * .18; t = t > .62 ? 0 : t > .3 ? 1 : t > -.05 ? 2 : 3;
      const rim = (nx * nx + ny * ny) > .78; if(rim && t < 3 && ny > .1) t++;   // the edge of a lobe turns away: one tone darker below
      if(tail && (th > (y < N * .55 ? .45 : .62) || th > Math.min(px, py, N - px, N - py) / (N * .14))) continue;   // (the dither thins to nothing toward the sprite's border: lobes that ran past it were cut square, W11 #27)
      mask[y * N + x] = 1; tone[y * N + x] = t; }
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const i = y * N + x; if(!mask[i]) continue; const o = i * 4; let col = rgb[tone[i]];
      // outline on the shadow side: an empty pixel below or to the right (never on the lit top-left)
      if(!tail && ((y + 1 < N && !mask[i + N]) || (x + 1 < N && !mask[i + 1] && tone[i] >= 2) || y === N - 1)) col = ob;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // a slab block of snow: a rough cube, lit top, mid face, dark side, outline; four rotations
  function block(v, r){ const N = 12, c = can(N, N), k = c.getContext('2d'), a = r * PI / 4 + v * .3, ca = Math.cos(a), sa = Math.sin(a), hw = 4.4 + v * .4, hh = 3.2 + (v % 2) * .6;
    const inside = (x, y) => { const u = (x - N / 2) * ca + (y - N / 2) * sa, w = -(x - N / 2) * sa + (y - N / 2) * ca; return Math.abs(u) <= hw && Math.abs(w) <= hh ? [u, w] : null; };
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const p = inside(x + .5, y + .5); if(!p) continue; const edge = !inside(x + 1.5, y + .5) || !inside(x + .5, y + 1.5) || !inside(x - .5, y + .5) || !inside(x + .5, y - .5);
      k.fillStyle = edge ? SN.O : p[1] < -hh + 1.3 ? SN.H : p[0] > hw - 1.5 ? SN.M : SN.L; k.fillRect(x, y, 1, 1); }
    return c; }
  // a snapped cedar: a broken trunk with two snow-laden needle tiers; four rotations
  function pine(r){ const N = 24, c = can(N, N), k = c.getContext('2d'), a = r * PI / 4 + .2, ca = Math.cos(a), sa = Math.sin(a), SG = ['#020507', '#0b1f1b', '#14302a'];
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const u = (x + .5 - N / 2) * ca + (y + .5 - N / 2) * sa, w = -(x + .5 - N / 2) * sa + (y + .5 - N / 2) * ca; let col = null;
      if(Math.abs(w) < 1.3 && u > -10 && u < 10) col = u > 8 ? (Math.abs(w) < .6 ? '#e8d8b0' : '#a08860') : w < 0 ? '#5a3a30' : '#24161a';   // trunk, the splintered end pale
      for(const t0 of [-9, -4.5, 0]) if(u > t0 && u < t0 + 6){ const hw = (u - t0) * .8 + .5; if(Math.abs(w) < hw) col = w < -hw + 1.6 ? (w < -hw + .8 ? SN.H : SN.L) : Math.abs(w) > hw - .9 ? SG[0] : SG[1]; }
      if(col){ k.fillStyle = col; k.fillRect(x, y, 1, 1); } }
    return c; }
  // amber 雪崩注意 board on a gantry over the road: steel truss on two posts, a dark LED panel, the text as hard amber pixels (lit / dim)
  function gantry(on, txt){ const w = 120, h = 46, c = can(w, h), k = c.getContext('2d'), R = (x, y, ww, hh, col) => { k.fillStyle = col; k.fillRect(x, y, ww, hh); };
    for(const x of [4, 111]){ R(x, 8, 5, 38, '#0a0c18'); R(x + 1, 8, 1, 38, '#4a5a88'); R(x + 2, 8, 2, 38, '#26304e'); R(x - 1, 42, 7, 4, '#0a0c18'); R(x - 1, 41, 7, 1, SN.L); }
    R(0, 4, w, 4, '#0a0c18'); R(0, 4, w, 1, '#7a8cbc'); R(0, 5, w, 1, '#26304e'); R(0, 3, w, 1, SN.L); R(1, 2, w - 2, 1, SN.H); R(0, 11, w, 3, '#0a0c18'); R(0, 11, w, 1, '#4a5a88');
    for(let x = 2; x < w - 2; x += 6){ k.fillStyle = '#161c30'; for(let t = 0; t < 4; t++) k.fillRect(x + t, 7 + t, 1, 1); }
    const pw = Math.max(76, (txt ? txt.width : 64) + 10), px0 = (w - pw) >> 1; R(px0 - 1, 14, pw + 2, 26, '#d8dccc'); R(px0, 15, pw, 24, '#0c0a10'); R(px0, 15, pw, 1, '#2a2430'); R(px0 + 8, 13, 1, 2, '#0a0c18'); R(px0 + pw - 9, 13, 1, 2, '#0a0c18');
    R(px0 - 1, 13, pw + 2, 1, SN.L);
    if(txt){ const lit = on ? '#ffb02a' : '#4a2a10', core = on ? '#ffe28a' : '#5a3418', g = txt.getContext('2d').getImageData(0, 0, txt.width, txt.height).data, ox = px0 + ((pw - txt.width) >> 1), oy = 18;
      for(let y = 0; y < txt.height; y++) for(let x = 0; x < txt.width; x++) if(g[(y * txt.width + x) * 4 + 3] > 0){ k.fillStyle = (x + y) % 3 === 0 ? core : lit; k.fillRect(ox + x, oy + y, 1, 1); } }
    R(px0 + pw - 5, 17, 2, 2, on ? '#ff4a3a' : '#3a1210'); R(px0 + 3, 17, 2, 2, on ? '#ff4a3a' : '#3a1210'); return c; }
  // the lintel board (Oota dōmon): amber with black type, a thin frame
  function board(txt){ const w = (txt ? txt.width : 60) + 10, h = 16, c = can(w, h), k = c.getContext('2d'); k.fillStyle = '#2a1a08'; k.fillRect(0, 0, w, h); k.fillStyle = '#e8a024'; k.fillRect(1, 1, w - 2, h - 2); k.fillStyle = '#ffc860'; k.fillRect(1, 1, w - 2, 1); k.fillStyle = '#b07018'; k.fillRect(1, h - 2, w - 2, 1);
    if(txt){ const g = txt.getContext('2d').getImageData(0, 0, txt.width, txt.height).data; k.fillStyle = '#140c06'; for(let y = 0; y < txt.height; y++) for(let x = 0; x < txt.width; x++) if(g[(y * txt.width + x) * 4 + 3] > 0) k.fillRect(5 + x, 2 + y - 1, 1, 1); }
    return c; }
  // yellow/black delineator for the portal's feet
  function delin(){ const c = can(4, 14), k = c.getContext('2d'); for(let y = 0; y < 14; y++){ k.fillStyle = ((y >> 1) % 2) ? '#141016' : '#f0c020'; k.fillRect(0, y, 4, 1); } k.fillStyle = '#0a0810'; k.fillRect(3, 0, 1, 14); return c; }
  function lbl(t, col, size){ const m = textMask(t), c = can(m.width, m.height), k = c.getContext('2d'); k.drawImage(m, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = col; k.fillRect(0, 0, c.width, c.height); return c; }
  // 雪 and 崩 are hand-set (DotGothic16's dense strokes fill in when thresholded at this size); the other glyphs come from the font
  const HAND = { '雪':['.XXXXXXXXXXX.', '......X......', 'XXXXXXXXXXXXX', 'X.....X.....X', 'X.XXX.X.XXX.X', 'X.....X.....X', '..XX.....XX..', '.............', '..XXXXXXXXX..', '..........X..', '..XXXXXXXXX..', '..........X..', '..XXXXXXXXX..'],
    '崩':['X.....X.....X', 'X.....X.....X', 'XXXXXXXXXXXXX', '.............', '.XXXX..XXXXX.', '.X..X..X...X.', '.XXXX..XXXXX.', '.X..X..X...X.', '.XXXX..XXXXX.', '.X..X..X...X.', 'X...X.X.....X', 'X..XX.X...XXX', '.............'] };
  function textMask(str){ const parts = [...str].map(ch => { const g = HAND[ch]; if(!g) return pixText(ch, 16, false); const c = can(14, 13), k = c.getContext('2d'); k.fillStyle = '#fff'; g.forEach((row, y) => [...row].forEach((q, x) => { if(q === 'X') k.fillRect(x, y, 2, 1); })); c.hand = 1; return c; });   // 2-pixel verticals, the font's stroke weight
    const hh = Math.max(...parts.map(c => c.height)), ww = parts.reduce((t, c) => t + (HAND_W(c)) + 2, 0), out = can(ww, hh), k = out.getContext('2d'); let x = 0;
    for(const c of parts){ k.drawImage(c, x, c.hand ? ((hh - 13) >> 1) + 1 : 0); x += HAND_W(c) + 2; } return out; }
  const HAND_W = c => c.hand ? 14 : c.width - 2;
  function texts(){ S.tWarn = textMask('雪崩注意'); S.tName = textMask('雪見洞門'); S.gOn = gantry(true, S.tWarn); S.gOff = gantry(false, S.tWarn); S.board = board(S.tName); S.label = lbl('崩', '#d6def2', 16); }
  /* W11 #27 (2026-11-21): a big tail puff (the exit cloud and the run-out beside the road, D up to ~450 canvas px) drew the 64-px sprite at
     ~7x, so its 4x4 ordered dither became a coarse checkerboard of 7-px squares, cut square where lobes met the sprite's edge. Tails now
     also come at 128 and 256 px (used above 88 and 176 canvas px across), so the dither cell stays at about 2 canvas px or under, and
     their dither dissolves toward the border. */
  const BV = 4, BF = 4, SIZES = [32, 64], TSIZES = [32, 64, 128, 256];
  function build(){
    for(const N of SIZES) for(let v = 0; v < BV; v++) for(let f = 0; f < BF; f++){ S['b' + N + '_' + v + '_' + f] = billow(N, v, f, BILL, BOUT, false); }
    for(const N of TSIZES) for(let v = 0; v < 2; v++) for(let f = 0; f < BF; f++) S['t' + N + '_' + v + '_' + f] = billow(N, v + 5, f, BILL, BOUT, true);
    for(let v = 0; v < 3; v++) for(let f = 0; f < BF; f++) S['w_' + v + '_' + f] = billow(48, v + 9, f, WARMB, WOUT, false);
    for(let v = 0; v < 3; v++) for(let r = 0; r < 4; r++) S['k' + v + r] = block(v, r);
    for(let r = 0; r < 4; r++) S['p' + r] = pine(r);
    S.delin = delin(); texts();
    // fog tints for the cold billows (two steps), built now so nothing is allocated mid-ride
    for(const key in S) if(/^[bt]\d/.test(key)) fogTintWarm(S[key], 'av:' + key, 2, .5, low);
    try{ cx.save(); for(const k in S) cx.drawImage(S[k], 0, 0, 1, 1); cx.restore(); cx.clearRect(0, 0, PX * 2, PX * 2); }catch(e){} }
  const bSpr = (N, v, f, tail) => S[(tail ? 't' : 'b') + N + '_' + v + '_' + f];
  const fogB = (spr, key, fog) => { const q = fog > .55 ? 2 : fog > .22 ? 1 : 0; return q ? fogTint(spr, 'av:' + key, q, 2, low, .5) : spr; };

  // ---------------------------------------------------------------- the plan for this rider
  function active(p){ for(const w of plans) if(!w.off && p >= w.W0 + TG - 60 && p <= w.W1 + 170 && segs[w.W0] && segs[w.W0].avPlan === w) return w; return null; }
  // the slope beside the road on the mountain side: its foot X0 (half-road widths out), foot height hb, lateral extent XS and crest height
  const vn = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return H1(i * 1.37 + s) * (1 - u) + H1((i + 1) * 1.37 + s) * u; };
  function slopeAt(w, i, o){ const W0 = w.W0, W1 = w.W1, near = sm((i - (W0 - PATH0 - 100)) / 90) * (1 - sm((i - (W1 + 20)) / 70));
    o.x0 = lerp(6.8, 3.2, near); o.hb = 0; if(i >= W0 - 34 && i <= W1 + 34) o.hb = HR * Math.min(sm((i - (W0 - 34)) / 30), 1 - sm((i - (W1 + 4)) / 30));
    if(i >= W0 && i < W1){ o.x0 = 3.0; o.hb = HR; }
    // the mountain stands tall only around the avalanche path; before and after it a low forested shoulder, so the face (and the cloud on
    // it) is seen from the road instead of being hidden behind the nearer slope
    const env = sm((i - (W0 - PATH0 - 260)) / 80) * (1 - sm((i - (W1 + 60)) / 60)), big = sm((i - (W0 - PATH0 - 70)) / 55) * (1 - sm((i - (W1 + 15)) / 50)); o.xs = 5.5 + vn(i / 23, 3) * 3;
    o.ht = o.hb + (big * (o.xs * 1.2 + vn(i / 9, 7) * 2) + (1 - big) * (1.1 + vn(i / 7, 5) * .9)) * env; o.env = env; return o; }
  const hAt = (o, f) => o.hb + (o.ht - o.hb) * (f * .55 + f * f * .45);   // a little concave: steeper toward the crest
  // the front: how far down the slope the head of the cloud has come (0 at the crown, 1 at the foot), per segment, never on the road ahead
  function frontAt(w, i, p){ const P0 = w.W0 - PATH0, P1 = w.W1 + 8; if(i < P0 || i > P1) return -1; const lag = .34 * (1 - sm(Math.min(i - P0, P1 - i) / 26)) + .05 * Math.sin(i * .21) + .03 * Math.sin(i * .57);
    let u = clamp(w.u - lag * (1 - w.u * .5), 0, 1); if(i > p - 2 && i < w.W0) u = Math.min(u, .9); return u; }
  // the shed's interior light: sodium lamps every 12 segments
  const lampSeg = (w, i) => i >= w.W0 + 2 && i < w.W1 - 2 && (i - w.W0) % 12 === 3;
  const lampLit = (w, i) => { const r = ((i - w.W0 - 3) % 12 + 12) % 12, dd = Math.min(r, 12 - r); return Math.max(0, 1 - dd / 3.2); };   // pools, with dark between

  // ---------------------------------------------------------------- drawing helpers
  const CA = new Float64Array(32), CB = new Float64Array(32);
  // a quad: on the engine's pixel grid when it is on screen; clipped to a margin first when a vertex is far off (walls beside the camera)
  function quad(x1, y1, x2, y2, x3, y3, x4, y4, col){ const lo = -W * .3, hiX = W * 1.3, loY = -H * .3, hiY = H * 1.3;
    if(x1 >= lo && x2 >= lo && x3 >= lo && x4 >= lo && x1 <= hiX && x2 <= hiX && x3 <= hiX && x4 <= hiX && y1 >= loY && y2 >= loY && y3 >= loY && y4 >= loY && y1 <= hiY && y2 <= hiY && y3 <= hiY && y4 <= hiY){ poly(x1, y1, x2, y2, x3, y3, x4, y4, col); return; }
    let a = CA, b = CB, n = 4; a[0] = x1; a[1] = y1; a[2] = x2; a[3] = y2; a[4] = x3; a[5] = y3; a[6] = x4; a[7] = y4;
    for(let e = 0; e < 4 && n; e++){ let o = 0; const ax = e < 2, sg = e % 2 ? -1 : 1, lim = e === 0 ? lo : e === 1 ? hiX : e === 2 ? loY : hiY;
      for(let i = 0; i < n; i++){ const j = (i + 1) % n, px = a[i * 2], py = a[i * 2 + 1], qx = a[j * 2], qy = a[j * 2 + 1], pv = (ax ? px : py) * sg, qv = (ax ? qx : qy) * sg, Lm = lim * sg, pin = pv >= Lm, qin = qv >= Lm;
        if(pin){ b[o++] = px; b[o++] = py; } if(pin !== qin){ const t = (Lm - pv) / (qv - pv); b[o++] = px + (qx - px) * t; b[o++] = py + (qy - py) * t; } }
      n = o / 2; const t = a; a = b; b = t; }
    if(n < 3) return; cx.fillStyle = col; cx.beginPath(); cx.moveTo(snp(a[0]), snp(a[1])); for(let i = 1; i < n; i++) cx.lineTo(snp(a[i * 2]), snp(a[i * 2 + 1])); cx.closePath(); cx.fill(); }
  // a band of a surface between near edge A and far edge B: lateral x and height h at both ends (half-road widths)
  const PX_ = (E, x) => E.x + x * E.w, PY_ = (E, h) => E.y - h * E.w;
  function band(A, B, xa0, ha0, xa1, ha1, xb0, hb0, xb1, hb1, col){ quad(PX_(A, xa0), PY_(A, ha0), PX_(A, xa1), PY_(A, ha1), PX_(B, xb1), PY_(B, hb1), PX_(B, xb0), PY_(B, hb0), col); }
  const SPAN = f => f > .6 ? 5 : f > .4 ? 4 : f > .22 ? 3 : f > .1 ? 2 : 1;
  let BASE_I = 0;   // the first segment drawn this frame (screens beyond BASE_I + DRAW are stale)
  const farOf = (i, n) => { const j = Math.min(i + n - 1, BASE_I + DRAW - 1), t = segs[j]; return t && t.p2.screen.w > 0 ? t.p2.screen : null; };

  // ---------------------------------------------------------------- the mountainside
  const SA = {}, SB = {};
  function drawSlope(w, s, fog, now, p){ const i = s.index, n = SPAN(fog); if(i % n) return; const A = s.p1.screen, B = farOf(i, n); if(!A.w || !B) return;
    const m = w.m, a = slopeAt(w, i, SA), b = slopeAt(w, i + n, SB); if(a.env <= .01 && b.env <= .01) return;
    const X = (o, f) => m * (o.x0 + o.xs * f), Hh = (o, f) => hAt(o, f), j1 = H1(i * .71) * .03, d = p - w.W0;
    const B2 = (f0, f1, col) => band(A, B, X(a, f0), Hh(a, f0), X(a, f1), Hh(a, f1), X(b, f0), Hh(b, f0), X(b, f1), Hh(b, f1), col);
    // retaining wall where the foot of the slope rises into the shed's roof (the road cut): concrete with a snow lip
    if(a.hb > .02 || b.hb > .02){ const xw = m * 1.44, lt = 0; band(A, B, xw, 0, xw, a.hb, xw, 0, xw, b.hb, fc(CON.L, fog)); if(fog < .5){ band(A, B, xw, a.hb * .94, xw, a.hb, xw, b.hb * .94, xw, b.hb, fc(SN.L, fog)); if(i % 4 === 0) band(A, B, xw, 0, xw, a.hb * .9, xw, 0, xw, b.hb * .9, fc(CON.M, fog)); }
      band(A, B, xw, a.hb, X(a, 0), a.hb, xw, b.hb, X(b, 0), b.hb, fc(SN.L, fog)); }
    // the face: shaded foot, body, lit upper slope, the moonlit crest (Hasui: palest along the top); strata and rock bands, jittered per segment
    const path = i >= w.W0 - PATH0 && i <= w.W1 + 8, scour = path && w.u > 0 ? clamp(.84 * Math.max(0, 1 - (frontAt(w, i, p) || 0) / .78), 0, .84) : 0;
    // a steep face in the moon's shadow: dark foot, blue-violet body, the upper slope catching light, a moonlit crest (Hasui, Celeste)
    if(fog > .4){ B2(0, .5 + j1, fc(SN.D, fog)); B2(.5 + j1, .86, fc(SN.M, fog)); B2(.86, 1, fc(SN.L, fog)); }
    else { B2(0, .06, fc('#262c52', fog)); B2(.06, .5 + j1, fc(SN.D, fog)); B2(.5 + j1, .84, fc(SN.M, fog)); B2(.84, .97, fc(SN.L, fog)); B2(.97, 1, fc(SN.H, fog)); }
    if(fog < .4){ const r = H1(Math.floor(i / 7) * 3.3); if(r > .55) B2(.6 + r * .1, .63 + r * .1, fc(SN.O, fog)); B2(.3 + j1, .32 + j1, fc('#4c5688', fog)); if(r < .35) B2(.7, .74 + r * .1, fc(SN.L, fog)); }
    // the dark cedar band on the lower slope (far), cedars themselves near
    if(!(path && scour < .3) && fog < .6) B2(.07, .13 + H1(i * 1.9) * .05, fc('#0b1f1b', fog));
    // the bed surface behind the passing front: scoured, darker, streaked downhill
    if(path && w.u > .02){ const fF = .84 * Math.max(0, 1 - (frontAt(w, i, p) || 0) / .78); if(fF < .82) B2(fF + .05, .84, fc(SN.M, fog)); }
    // the crown: once the slab has broken, a dark fracture line with a moonlit lip, across the path high on the slope
    if(path && d > TG - 1 && i % n === 0){ const cj = H1(Math.floor(i / 3) * 5.1) * .02; B2(.835 + cj, .855 + cj, fc(SN.H, fog)); B2(.855 + cj, .875 + cj, fc(SN.O, fog)); } }
  // cedars on the lower slope (env/snow.js art), until the front swallows them; then a snapped trunk tumbles in the cloud
  function drawSlopeTrees(w, s, sx0, sy0, uw, fog, p){ const i = s.index; if(fog > .5 || i % 4 || !ENV.snow || !ENV.snow.drawTreeAt) return; const a = slopeAt(w, i, SA); if(a.env < .3) return;
    const ft = .05 + H1(i * 2.3) * .26, x = w.m * (a.x0 + a.xs * ft), h = hAt(a, ft), fr = frontAt(w, i, p); if(fr >= 0 && .84 * Math.max(0, 1 - fr / .78) < ft + .06 && w.u > 0) return;
    ENV.snow.drawTreeAt(sx0 + x * uw, sy0 - h * uw, uw, fog, i, .8 + H1(i * 3.7) * .5, 0); }
  // spindrift streaming off the crest (telegraph): pixel streaks blown downslope and up, world-anchored per segment
  function drawSpindrift(w, s, sx0, sy0, uw, fog, now, p){ const i = s.index, d = p - w.W0, tg = sm((d - TG + 10) / 40) * (1 - sm((d - SL - 120) / 80)); if(tg <= .02 || fog > .8 || i % 3) return;
    if(i < w.W0 - PATH0 - 80 || i > w.W1 + 40) return; const a = slopeAt(w, i, SA); if(a.env < .4) return; const cx0 = sx0 + w.m * (a.x0 + a.xs) * uw, cy0 = sy0 - a.ht * uw, sz = Math.max(PX, snp(uw * .05));
    if(cx0 < -uw * 4 || cx0 > W + uw * 4 || cy0 < -uw * 3) return;
    cx.fillStyle = fc('#e4ecfa', fog * .6);
    for(let j = 0; j < (reduce ? 2 : 5); j++){ const ph = ((now / (reduce ? 3200 : 1500)) + H1(i * 1.3 + j * 2.9)) % 1; cx.globalAlpha = (1 - ph) * .75 * tg * (1 - fog * .6);
      const xx = cx0 - w.m * ph * uw * (1.6 + j * .5), yy = cy0 - ph * uw * (.9 + H1(j + i) * .7) + Math.sin(ph * 6 + j) * uw * .08; cx.fillRect(snp(xx), snp(yy), sz * (j % 2 ? 2 : 3), sz); }
    cx.globalAlpha = 1; }

  // the telegraph seen over the town's roofs: snow dust streaming off the far ridgeline on the mountain side (backdrop layer)
  function ridgeDust(w, o, d){ const tg = sm((d - TG + 5) / 25) * (1 - sm((d - SL - 60) / 60)); if(tg <= .02 || o.L.key !== 'snow') return; const hz = o.hz, now = o.now, sz = PX;
    // anchored over the far end of the road (where the mountain is), from last frame's projection
    const fs = segs[Math.min(segs.length - 1, BASE_I + DRAW - 30)], vx = fs && fs.p1.screen.w ? clamp(fs.p1.screen.x, W * .2, W * .8) : W / 2;
    for(let c = 0; c < 6; c++){ const bx = (c % 2 ? vx : W / 2) + w.m * W * ((c - 2) * .03 + H1(c * 3.1) * .02),   // over the road's far end and over the view's centre
         by = hz - H * (.07 + H1(c * 5.7) * .04) + PX * 2;
      for(let j = 0; j < (reduce ? 6 : 14); j++){ const ph = ((now / (reduce ? 4200 : 2200)) + H1(c * 7.7 + j * 1.3)) % 1, x = bx - w.m * ph * W * (.05 + H1(j) * .03), y = by - ph * H * (.035 + H1(j * 2.2) * .02) + Math.sin(ph * 5 + j) * PX;
        cx.fillStyle = j % 3 ? '#c6d2ee' : '#eef4fc'; cx.globalAlpha = tg * (1 - ph * ph) * .85; cx.fillRect(snp(x), snp(y), sz * (j % 2 ? 2 : 4), sz * (j % 4 ? 1 : 2)); } }
    cx.globalAlpha = 1; }

  // the powder plume over the mountain, seen from anywhere on the road (behind the slope, the town, a crest or a bend): a leaning column of
  // billows rising over the treeline where the path is, growing with the slide. It sits in the backdrop, so nearer scenery and the slope's
  // own (projected) cloud draw over it; once that cloud fills the view it fades.
  let plX = -1;
  function plume(w, o, d){ const a = sm((d - SL + 10) / 40) * (1 - sm((d + 50) / 40)); if(a <= .02) return; const m = w.m, ic = w.W0 - 90, sg = segs[ic];
    let tx; if(sg && ic > BASE_I + 3 && ic < BASE_I + DRAW && sg.p1.screen.w > 0){ const sa = slopeAt(w, ic, SA); tx = sg.p1.screen.x + m * (sa.x0 + 2.5) * sg.p1.screen.w; }
    else { const fs = segs[Math.min(segs.length - 1, BASE_I + DRAW - 20)]; tx = (fs && fs.p1.screen.w ? fs.p1.screen.x : W / 2) + m * W * .09; }   // just to the mountain side of the road's far end, where the sky is open between the roadside trees and roofs
    tx = clamp(tx, W * .1, W * .9); plX = plX < 0 ? tx : lerp(plX, tx, .12);
    const u = w.u, grow = .75 + .45 * sm((d - SL) / 500), hp = H * (.36 + .3 * u) * grow, d0 = H * (.15 + .1 * u) * grow, base = o.hz + PX * 2, now = o.now;
    for(let k = 0; k < 8; k++){ const t = k / 7, x = plX - m * t * hp * .25 + Math.sin(now / 1300 + k * 1.7) * d0 * .08 + (k % 2 ? 1 : -1) * d0 * .22, y = base - t * hp - d0 * .25;
      puff(x, y, d0 * (1.25 - t * .55), k + 11, H1(k * 4.3), .25, t > .6, now, a * (t > .6 ? .85 : 1)); }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- the cloud
  // a billow of on-screen diameter D (css px) centred at (x, y): the 32 or 64 px art, fog-tinted, churning on its own phase
  function puff(x, y, D, v, ph, fog, tail, now, al){ if(D < PX * 2 || x < -D || x > W + D || y < -D || y > H + D * .6) return; const N = tail && D / PX > 176 ? 256 : tail && D / PX > 88 ? 128 : D / PX > 44 ? 64 : 32, f = ((now / (reduce ? 700 : 240) + ph * 4) | 0) % BF, key = (tail ? 't' : 'b') + N + '_' + (v % (tail ? 2 : BV)) + '_' + f;
    const spr = fogB(S[key], key, fog), k = D / N; cx.globalAlpha = al; blit(spr, x, y + D / 2, k); }
  function drawCloud(w, s, sx0, sy0, uw, fog, now, p){ const i = s.index, u = frontAt(w, i, p); if(u < 0 || w.u <= 0) return; const n = fog > .45 ? 5 : fog > .2 ? 4 : 3; if(i % n) return;
    // down the face for u < .78, then running out across the flat between the slope's foot and the road (Zinal: the cloud runs out over
    // the valley floor, towering at its head); it never crosses the road ahead of the rider (clamped off the bank)
    const a = slopeAt(w, i, SA), m = w.m, ahead = i > p - 2, fF = .84 * Math.max(0, 1 - u / .78), ro = sm((u - .78) / .22), C = (1.2 + 3.4 * u) * (.75 + H1(i * 3.1) * .4);
    const xh = lerp(a.x0 + a.xs * fF, 1.45, ro), hh = u < .78 ? hAt(a, fF) : a.hb * (1 - ro) + (i >= w.W0 - 34 && i < w.W1 + 34 ? a.hb * ro : 0), al = 1 - fog * .35, inShed = i >= w.W0 && i < w.W1;
    const P = (x, h, D) => [sx0 + m * (D && x < 1.3 + D * .45 ? 1.3 + D * .45 : x) * uw, sy0 - h * uw];
    const lift = inShed ? Math.max(0, HR + .1 - hh) : 0;   // over the shed, the cloud rides on its roof (never inside the gallery)
    // tail: thinner smoke upslope; then the head, stacked three high (Zinal: tallest, most billowed at the head)
    // the powder trails all the way back up the track, thinner with height (the tail lobes are dithered)
    const TL = i % (n * 2) === 0 ? [[.62, .5, .5, 1], [.44, .6, .45, 1], [.28, .7, .45, 1], [.14, .82, .42, 0]] : [[.36, .65, .45, 1], [.14, .82, .42, 0]];
    for(const [df, sc, hy, tl] of TL){ const f2 = fF + df - ro * .1; if(f2 > .86) continue; const q = f2 < 0 ? P(lerp(a.x0, xh, -f2 * 6), a.hb + C * sc * hy + lift, C * sc) : P(a.x0 + a.xs * f2, hAt(a, f2) + C * sc * hy + lift, C * sc); puff(q[0], q[1], C * sc * uw, i + df * 50, H1(i * 5.1 + df), fog, !!tl, now, al * (tl ? .85 : 1)); }
    const parts = [[.25, .32, 1], [-.18, .78, .85], [.3, 1.22, .66], [.05, 1.62, .5]];
    for(let j = 0; j < parts.length; j++){ const [dx, dy, sc] = parts[j]; if(j >= 2 && u < .25 * (j - 1)) continue; const q = P(xh + dx * C, hh + dy * C + lift, C * sc); puff(q[0], q[1], C * sc * uw, i * 3 + j, H1(i * 7.3 + j), fog, false, now, al); }
    // tumbling slab blocks and, now and then, a snapped cedar, thrown about just behind the head
    if(fog < .55 && !inShed){ if(i % 4 === 0) for(let j = 0; j < 2; j++){ const ph = H1(i * 2.1 + j), bnc = Math.abs(Math.sin(now / (reduce ? 700 : 320) + ph * 6)) * .3 * C, q = P(xh + (ph - .3) * C * .9, hh + .15 * C + bnc), rf = ((now / (reduce ? 400 : 130) + ph * 8) | 0) % 4, spr = S['k' + (i + j) % 3 + rf], kk = (.22 + ph * .2) * uw / 12 * C * .6;
        if(kk * 12 > PX * 1.5){ cx.globalAlpha = al; blit(spr, q[0], q[1] + spr.height * kk / 2, kk); } }
      if(i % 9 === 0 && u > .2 && u < .98){ const ph = H1(i * 4.7), q = P(xh + .1 * C, hh + (.35 + Math.abs(Math.sin(now / 450 + ph * 5)) * .4) * C), rf = ((now / (reduce ? 600 : 200) + ph * 4) | 0) % 4, spr = S['p' + rf], kk = .9 * uw / 24 * Math.min(1.6, C * .5);
        if(kk * 24 > PX * 3){ cx.globalAlpha = al; blit(spr, q[0], q[1] + spr.height * kk / 2, kk); } } }
    // over the roof and pouring off the valley side, once the slide reaches the shed (seen from outside: above and beside the portal)
    if(inShed && w.ov > 0 && position / SEG < w.W0){ const ov = w.ov, x1 = lerp(XO, -XO - .2, ov), q = P(x1, HR + .55 * C * .6); puff(q[0], q[1], C * .7 * uw, i * 5, H1(i * 9.1), fog, false, now, al);
      if(ov > .5){ const q2 = P(-(XO + .45 + .4 * (1 - ov)), HR * .9 * (1 - (ov - .5)) + .5); puff(q2[0], q2[1], C * .6 * uw, i * 5 + 1, H1(i * 2.9), fog, false, now, al); } }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- the snow shed
  // per segment: the inner surfaces between the near edge A and far edge B, then the faces at A (rib, pillar end), lamps, dust, jets
  function drawShed(w, s, fog, now, p){ const i = s.index, A = s.p1.screen; if(!A.w) return;
    const m = w.m, v = -m, k = i - w.W0, bayK = k % BAY, pillar = bayK === 0;
    // far rings are a few pixels deep: their surfaces go two segments at a time (the pillars' and ribs' faces stay per bay)
    const far = A.w < W * .03 && !pillar && bayK !== BAY - 1; if(far && k % 2 === 0 && !lampSeg(w, i)) return;
    const B = far ? (farOf(i, 2) || s.p2.screen) : s.p2.screen; if(!B.w) return;
    const lt = lampLit(w, i), lt2 = lampLit(w, i + 1), ff = fog, inside = p > w.W0 - .5;
    const C = (c, l) => ic(c, ff, l == null ? lt : l);
    // outside the open side: the slide pouring off the roof, seen through the openings. Not a panel: a thin dithered sheet far back, then
    // falling streaks and sheets in four tones at three depths, each segment cut into slices along the road so they read as separate
    // falls, world-anchored, sliding down at their own speeds
    if(!pillar && w.ov > .45){ const near = A.w > W * .022, sh = fc(SN.M, fog * .6);
      { const xb = v * (XO + .34); cx.fillStyle = ditherPat(sh, .5); band(A, B, xb, -.1, xb, HC + .15, xb, -.1, xb, HC + .15, cx.fillStyle); }
      const ns = near ? (reduce ? 3 : 5) : 2, top = HC + .18, span2 = HC + .5, sp = reduce ? 1700 : 560, TONE = [BILL[0], BILL[1], BILL[2], BILL[1], BILL[0]];
      for(let j = 0; j < ns; j++){ const t0 = j / ns, t1 = (j + .62) / ns, E0 = { x:lerp(A.x, B.x, t0), y:lerp(A.y, B.y, t0), w:lerp(A.w, B.w, t0) }, E1 = { x:lerp(A.x, B.x, t1), y:lerp(A.y, B.y, t1), w:lerp(A.w, B.w, t1) };
        const dep = j % 3, xx = v * (XO + .04 + dep * .1), rate = 1 + dep * .35 + H1(i * 2.7 + j) * .4;
        for(let r = 0; r < 2; r++){ const ph = ((now / sp) * rate + H1(i * 3.1 + j * 1.7) + r * .5) % 1, h1 = top - ph * span2, h0 = h1 - (.3 + H1(i + j * 5 + r) * .35); if(h1 < -.1) continue;
          const a1 = Math.min(top, h1), a0 = Math.max(-.1, h0); if(a1 <= a0) continue;
          band(E0, E1, xx, a0, xx, a1, xx, a0, xx, a1, fc(TONE[(j + r + dep) % 5], fog * .6)); }
        if(near && j % 2 === 0){ const hh = top - ((now / (sp * .8)) * rate + H1(i * 9 + j)) % 1 * span2; if(hh > 0) band(E0, E1, xx, hh - .05, xx, hh, xx, hh - .05, xx, hh, fc(BILL[3], fog * .6)); } } }
    // ceiling, haunches (chamfered, catching the lamp light), the mountain wall with its lower panel
    band(A, B, -XI + HCH, HC, XI - HCH, HC, -XI + HCH, HC, XI - HCH, HC, C(CON.D));
    for(const sd of [-1, 1]) band(A, B, sd * XI, HC - HCH, sd * (XI - HCH), HC, sd * XI, HC - HCH, sd * (XI - HCH), HC, C(CON.L, lt * 1.1));
    band(A, B, m * XI, PAR + .05, m * XI, HC - HCH, m * XI, PAR + .05, m * XI, HC - HCH, C(CON.M));
    band(A, B, m * XI, 0, m * XI, PAR + .05, m * XI, 0, m * XI, PAR + .05, C(CON.L));
    if(fog < .4 && i % 2 === 0) band(A, B, m * XI, HC - HCH - .02, m * XI, HC - HCH, m * XI, HC - HCH - .02, m * XI, HC - HCH, C(CON.H));
    // the open side: a pillar's inner face, or the parapet and the arched head of an opening (Oota's windows)
    if(pillar) band(A, B, v * XI, 0, v * XI, HC - HCH, v * XI, 0, v * XI, HC - HCH, C(CON.L));
    else { band(A, B, v * XI, 0, v * XI, PAR, v * XI, 0, v * XI, PAR, C(CON.L)); band(A, B, v * XI, PAR - .03, v * XI, PAR, v * XI, PAR - .03, v * XI, PAR, C(CON.H));
      const ta = (bayK - 1) / (BAY - 1), tb = bayK / (BAY - 1), ar = t => LIN - .2 * (1 - Math.sin(clamp(t, 0, 1) * PI));
      band(A, B, v * XI, ar(ta), v * XI, HC - HCH, v * XI, ar(tb), v * XI, HC - HCH, C(CON.M)); }
    // the road inside: darker, lamp pools on it
    { const rd = Math.max(0, .5 - lt * .35); if(rd > .02){ cx.globalAlpha = rd; band(A, B, -XI, 0, XI, 0, -XI, 0, XI, 0, '#04050a'); cx.globalAlpha = 1; }
      if(lt > .25 && fog < .8){ cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .1 * lt * (1 - fog); band(A, B, -.9, 0, .9, 0, -.9, 0, .9, 0, NA.glow); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; } }
    // faces at the near edge: the transverse rib under the ceiling, the pillar's end face (they strobe past), stripes of a bay's joint
    if(pillar){ const x = A.x, y = A.y, wd = A.w, ry0 = y - HC * wd, ry1 = y - (HC - .13) * wd, ce = C(CON.L, lt * 1.2), ed = C(CON.E, lt);
      quad(x - XI * wd, ry0, x + XI * wd, ry0, x + XI * wd, ry1, x - XI * wd, ry1, ce);
      for(const sd of [-1, 1]) quad(x + sd * XI * wd, y - (HC - HCH - .13) * wd, x + sd * XI * wd, ry1, x + sd * (XI - HCH - .13) * wd, ry1, x + sd * XI * wd, ry1, ce);
      for(const sd of [-1, 1]) quad(x + sd * XI * wd, y - (HC - HCH) * wd, x + sd * (XI - HCH) * wd, ry0, x + sd * (XI - HCH - .13) * wd, ry1, x + sd * XI * wd, y - (HC - HCH - .13) * wd, ce);
      if(wd > 8){ cx.fillStyle = ed; pxRect(x - XI * wd, ry1 - PX, XI * 2 * wd, PX); }
      // the pillar's end face on the open side, a lit edge toward the road
      quad(x + v * XI * wd, y, x + v * (XI + .26) * wd, y, x + v * (XI + .26) * wd, y - (HC - HCH) * wd, x + v * XI * wd, y - (HC - HCH) * wd, C(CON.H, lt * 1.2));
      if(wd > 6){ cx.fillStyle = C(CON.E, lt * 1.3); pxRect(v > 0 ? x + v * XI * wd : x + v * XI * wd - PX, y - (HC - HCH) * wd, PX, (HC - HCH) * wd); } }
    // sodium lamps under the ceiling: a dark housing, a hot core, a stepped halo
    if(lampSeg(w, i)){ const lw = Math.max(PX, snp(A.w * .24)), lh = Math.max(PX, snp(A.w * .05)), lx = A.x, ly = A.y - (HC - .02) * A.w;
      cx.fillStyle = C(CON.O, 0); pxRect(lx - lw / 2 - PX, ly - PX, lw + PX * 2, lh + PX * 2); cx.fillStyle = fog > .6 ? NA.hot : NA.core; pxRect(lx - lw / 2, ly, lw, lh);
      if(A.w > W * .02) glow(lx, ly + lh, Math.min(A.w * .7, H * .2), NA.glow, .32 * (1 - fog)); }
    // dust sifting from the ceiling joints while the snow thunders overhead (near only)
    if(inside && pillar && fog < .3 && w.ov > .5 && A.w > 30){ const sz = Math.max(PX, snp(A.w * .012)); cx.fillStyle = ic('#c8c0b4', fog, lt);
      for(let j = 0; j < (reduce ? 2 : 5); j++){ const xx = A.x + (H1(i * 5.1 + j) * 2 - 1) * A.w * 1.1, ph = ((now / (reduce ? 2600 : 900)) + H1(i * 3.3 + j)) % 1; cx.globalAlpha = .7 * (1 - ph);
        for(let g = 0; g < 3; g++){ const hy = HC - .13 - (ph + g * .07) * (HC - .13); if(hy > 0) cx.fillRect(snp(xx + Math.sin(g + j) * sz), snp(A.y - hy * A.w), sz, sz); } }
      cx.globalAlpha = 1; } }
  // snow blasting in through an opening: a directional spray fanning from the opening toward the road and slightly down, streaks in four
  // tones (pale near the opening, blue-grey as they spread), a few dissipating puffs at its reach. World-anchored at the opening; its
  // strength rises and falls with the rider's distance to it, the streaks themselves fly on game time.
  function drawJet(w, s, fog, now, p){ const i = s.index, k = i - w.W0; if(k % BAY !== 3 || w.ov < .5 || fog > .55) return; const A = s.p1.screen; if(!A.w || A.w < 5) return;
    if(H1(i * 1.91) < .3) return; const e = clamp((p - (i - 50)) / 46, 0, 1); if(e <= 0 || e >= 1) return; const pw = Math.sin(e * PI), v = -w.m;
    const ox = A.x + v * (XI + .02) * A.w, oy = A.y - (PAR + .36) * A.w, n = reduce ? 10 : 30, reach = (reduce ? .5 : 1.05) * A.w, sz = Math.max(PX, snp(A.w * .02)), st = reduce ? 1 : 3, al0 = pw * (1 - fog);
    for(let j = 0; j < n; j++){ const an = .2 + (H1(i * 5.1 + j) - .5) * .95, dx = -v * Math.cos(an), dy = Math.sin(an), ph = ((now / (reduce ? 1100 : 420)) + H1(i * 3.3 + j * 1.9)) % 1;
      const dist = ph * reach * (.55 + .45 * pw) * (.7 + H1(j * 2.9) * .5), px = ox + dx * dist, py = oy + dy * dist + ph * ph * A.w * .12;
      cx.fillStyle = ph < .25 ? BILL[0] : ph < .55 ? BILL[1] : ph < .8 ? BILL[2] : BILL[3]; cx.globalAlpha = al0 * (1 - ph * .8);
      for(let q = 0; q < st; q++) cx.fillRect(snp(px - dx * q * sz * 1.6), snp(py - dy * q * sz * 1.6), q ? sz : sz * 2, sz); }
    if(!reduce || pw > .5) for(let j = 0; j < 3; j++){ const t = .45 + j * .2, an = .2 + (j - 1) * .3, D = A.w * (.12 + t * .2), ph2 = ((now / 900) + H1(i + j)) % 1;
      puff(ox - v * Math.cos(an) * reach * t, oy + Math.sin(an) * reach * t, D * (1 + ph2 * .3), i + j, H1(i * 2 + j), fog, true, now, al0 * (1 - t * .6) * (1 - ph2 * .5)); }
    cx.globalAlpha = 1; }
  // the portal at the shed mouth, a face at W0's near edge: chamfered opening, the roof slab with its snow, the amber board, delineators
  function drawPortal(w, s, fog, now){ const A = s.p1.screen; if(!A.w) return; const x = A.x, y = A.y, wd = A.w, m = w.m, F = c => fc(c, fog * .9);
    const X = xx => x + xx * wd, Y = hh => y - hh * wd;
    quad(X(-XF), Y(0), X(-XI), Y(0), X(-XI), Y(HF), X(-XF), Y(HF), F(PORT.H)); quad(X(XI), Y(0), X(XF), Y(0), X(XF), Y(HF), X(XI), Y(HF), F(PORT.H));
    quad(X(-XI), Y(HC), X(XI), Y(HC), X(XI), Y(HF), X(-XI), Y(HF), F(PORT.H));
    for(const sd of [-1, 1]) quad(X(sd * XI), Y(HC - HCH), X(sd * XI), Y(HC), X(sd * (XI - HCH)), Y(HC), X(sd * (XI - HCH)), Y(HC), F(PORT.H));
    if(wd > 4){ // edges: the opening's lit lip, the slab's shadow line, weather stains, the snow on the roof
      cx.fillStyle = F(PORT.E); pxRect(X(-XI + HCH), Y(HC), (XI - HCH) * 2 * wd, PX); cx.fillStyle = F(PORT.L); pxRect(X(-XF), Y(HR - .1), (XF * 2) * wd, Math.max(PX, .05 * wd));
      cx.fillStyle = F(PORT.L); for(let j = 0; j < 6; j++){ const sx = -XF + .08 + j * .6 + H1(j * 3.3 + w.W0) * .2; if(Math.abs(sx) < XI && sx > -XI) continue; pxRect(X(sx), Y(HR - .12), Math.max(PX, .04 * wd), (HR - .4 - H1(j) * .6) * wd); }
      cx.fillStyle = F(CON.M); pxRect(X(-XF), Y(HF), PX, HF * wd); pxRect(X(XF) - PX, Y(HF), PX, HF * wd);
      quad(X(-XF - .06), Y(HF), X(XF + .06), Y(HF), X(XF + .02), Y(HF + .13), X(-XF - .02), Y(HF + .13), F(SN.L)); quad(X(-XF), Y(HF + .13), X(XF), Y(HF + .13), X(XF - .05), Y(HF + .18), X(-XF + .05), Y(HF + .18), F(SN.H));
      if(S.board){ const kb = (XI * 1.05 * wd) / S.board.width; if(kb * S.board.height > PX * 3) blit(S.board, x, Y(HC + .06), Math.min(kb, wd * .2 / S.board.height * 1.2)); }
      const kd = wd * .5 / 14; for(const sd of [-1, 1]) blit(S.delin, X(sd * (XI + .05)), y, kd); }
    // the mountain side's retaining wall meets the portal: a wing face from the frame to the slope foot
    quad(X(m * XF), Y(0), X(m * 2.1), Y(0), X(m * 2.1), Y(HR), X(m * XF), Y(HF), F(PORT.L));
    if(fog < .9) glow(x, Y(HC - .1), wd * .5, NA.glow, .12 * (1 - fog));
    // the slide slamming onto the roof as the portal fills the view: billows boiling over the lintel and down its face, rolling across
    // from the mountain side; powder spilling off the lintel's edge in front of the opening's top (the road below stays clear)
    if(w.ov > 0 && wd > 3){ const ov = w.ov, D = wd * (.55 + ov * .35);
      for(let j = 0; j < 7; j++){ const t = clamp(ov * 1.5 - j * .1, 0, 1); if(t <= 0) continue; const xx = m * lerp(XF + .5, -XF + .1, (j + .5) / 7 * t + (1 - t) * .02), hh = HF - .02 - (j % 3) * .12 + (1 - t) * .5;
        puff(X(xx), Y(hh), D * (.8 + H1(j * 2.2) * .4), j + 3, H1(j * 3.7), fog * .5, false, now, Math.min(1, t * 2)); }
      if(ov > .3){ const fall = (now / (reduce ? 1200 : 380)) % 1, sz = Math.max(PX, snp(wd * .016));
        for(let j = 0; j < (reduce ? 10 : 26); j++){ const xx = (H1(j * 7.3) * 2 - 1) * (XI - .05), ph = (fall * (1 + H1(j) * .6) + H1(j * 2.1)) % 1, hh = HC + .02 - ph * .38;
          cx.fillStyle = j % 3 ? BILL[0] : BILL[2]; cx.globalAlpha = Math.min(1, (ov - .3) * 2) * (1 - ph); cx.fillRect(snp(X(xx)), snp(Y(hh)), sz, sz * (reduce ? 1 : 3)); } }
      cx.globalAlpha = 1; } }
  // the gantry board, 250 segments before the mouth
  function drawGantry(w, s, sx0, sy0, uw, fog, now){ const on = reduce || (now / 520 | 0) % 2 === 0, spr = on ? S.gOn : S.gOff; if(!spr) return; const k = uw * 2.9 / spr.width;
    cx.globalAlpha = 1 - fog * .6; blit(spr, sx0, sy0, k); cx.globalAlpha = 1; if(on && fog < .9) glow(sx0, sy0 - spr.height * k * .6, uw * .7, '#ffa030', .35 * (1 - fog)); }
  // the fresh snowbank after the slide: lumpy debris along both road edges past the exit (never on the road)
  function drawDebris(w, s, sx0, sy0, uw, fog, now){ const i = s.index; if(w.ov < .5 || i < w.W1 - 2 || i > w.W1 + 70) return; const n = SPAN(fog); if(i % n) return; const A = s.p1.screen, B = farOf(i, n); if(!B) return;
    const t = sm((i - w.W1 + 2) / 6) * (1 - sm((i - w.W1 - 50) / 20));
    for(const sd of [-1, 1]){ const big = sd === -w.m ? 1 : .7, h0 = (.32 + H1(i * 1.7 + sd) * .22) * big * t, h1 = (.32 + H1((i + n) * 1.7 + sd) * .22) * big * t; if(h0 < .02) continue;
      band(A, B, sd * 1.12, 0, sd * 1.12, h0 * .5, sd * 1.12, 0, sd * 1.12, h1 * .5, fc(SN.M, fog)); band(A, B, sd * 1.12, h0 * .5, sd * 1.5, h0, sd * 1.12, h1 * .5, sd * 1.5, h1, fc(SN.L, fog)); band(A, B, sd * 1.5, h0, sd * 2.3, h0 * .6, sd * 1.5, h1, sd * 2.3, h1 * .6, fc(SN.H, fog));
      if(fog < .5 && i % 4 === 0){ const spr = S['k' + (i % 3) + ((i >> 2) % 4)], kk = uw * (.3 + H1(i * 3 + sd) * .2) / 12; blit(spr, sx0 + sd * (1.3 + H1(i + sd) * .5) * uw, sy0 - h0 * .6 * uw, kk); }
      if(fog < .4 && i % 11 === 5 && sd === -w.m){ const spr = S['p' + (i % 4)], kk = uw * 1.1 / 24; blit(spr, sx0 + sd * 1.9 * uw, sy0 - h0 * .5 * uw, kk); } } }
  // the powder cloud the exit bursts into: tail billows hanging over the road edges just past the mouth (thin; the road stays readable)
  function drawExitCloud(w, s, sx0, sy0, uw, fog, now, p){ const i = s.index; if(w.ov < .5 || i < w.W1 - 2 || i > w.W1 + 34 || fog > .5 || i % 2) return; const t = 1 - sm((p - w.W1 - 6) / 30); if(t <= 0) return;
    for(const sd of [-1, 1]){ const x = sx0 + sd * (1.05 + H1(i * 2.3 + sd) * .9) * uw, h = .5 + H1(i * 5 + sd) * .9; puff(x, sy0 - h * uw, (1.1 + H1(i + sd) * .8) * uw, i + sd, H1(i * 1.3), fog, true, now, .85 * t); }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- screen space: the cue, the wash behind, ceiling grains, the exit
  function drawCue(w, now, d){ if(d < RC - 10 || d > 2 || !S.label) return; const a = sm((d - RC + 10) / 12) * (1 - sm(d / 2)); if(a <= .05) return;
    const right = w.m > 0, x = snp(right ? W * .97 - PX * 4 : W * .03), y0 = snp(H * .36), bh = snp(H * .3), bw = PX * 4, n = 10, fill = Math.round(clamp(w.u, 0, 1) * n), q = w.q != null ? w.q : 0, losing = w.u > q + .08;
    cx.globalAlpha = a; blit(S.label, x + bw / 2, y0 - PX, PX); cx.fillStyle = '#07060c'; cx.fillRect(x - PX, y0, bw + PX * 2, bh + PX);
    for(let j = 0; j < n; j++){ const on = j < fill; cx.fillStyle = on ? (losing ? (reduce || (now / 250 | 0) % 2 ? '#ff6a5a' : '#ffd8d0') : j > 6 ? '#eef4fc' : '#93a0cc') : '#1a1e30'; cx.fillRect(x, y0 + j * bh / n + PX, bw, snp(bh / n) - PX); }
    // the shed at the foot of the meter (amber), the rider's mark beside it: above the snow line = winning
    cx.fillStyle = '#e8a024'; cx.fillRect(x - PX, y0 + bh + PX, bw + PX * 2, PX * 2); const ry = snp(y0 + q * bh), tx = right ? x - PX * 3 : x + bw + PX;
    cx.fillStyle = '#07060c'; cx.fillRect(tx - PX, ry - PX * 2, PX * 4, PX * 5); cx.fillStyle = '#f4ecdf'; if(right){ cx.fillRect(tx, ry - PX, PX, PX * 3); cx.fillRect(tx + PX, ry, PX, PX); } else { cx.fillRect(tx + PX, ry - PX, PX, PX * 3); cx.fillRect(tx, ry, PX, PX); }
    cx.globalAlpha = 1; }
  // ragged powder rising at the screen's lower corners: the slide crossing the road behind you (never over the bike in the centre)
  function washBehind(amt, now){ if(amt <= .02) return; const bs = Math.min(W * .2, H * .27), cw = W * .36, ch = H * (.12 + .3 * amt), tk = reduce ? 0 : Math.floor(now / 140), st = PX * 2;
    for(const side of [-1, 1]) for(let y = Math.floor((H - ch) / st) * st; y < H; y += st) for(let x = 0; x < cw; x += st){ const uu = x / cw, vv = (H - y) / ch, edge = (1 - uu) * (1 - uu) * (.85 + .3 * Math.sin(uu * 8 + side * 2 + tk * .6) * .5);
      if(vv > edge) continue; const xx = side < 0 ? x : W - x - st; if(Math.abs(xx - W / 2) < bs * .45) continue; const hv = hash(Math.floor(xx / PX) * 7.1 + Math.floor(y / PX) * 3.3 + tk * 1.7), dens = vv > edge * .65 ? .35 : .85;
      if(hv > dens) continue; cx.fillStyle = hv < .1 ? BILL[3] : hv < .3 ? BILL[1] : BILL[0]; cx.globalAlpha = .9 * Math.min(1, amt * 1.4); cx.fillRect(xx, y, st, st); }
    cx.globalAlpha = 1; }
  function grains(now, amt){ if(amt <= .02) return; const n = reduce ? 10 : 34; cx.fillStyle = '#b8b0a8';
    for(let j = 0; j < n; j++){ const ph = ((now / (reduce ? 3000 : 1100)) + hash(j * 3.7)) % 1, x = hash(j * 9.1) * W, y = ph * H * .8; cx.globalAlpha = amt * .6 * (1 - ph); cx.fillRect(snp(x), snp(y), PX, PX * (reduce ? 1 : 2)); }
    cx.globalAlpha = 1; }
  // the exit: a powder burst from the portal behind. Billows crowd the screen's edges and corners and are flung outward, thinning fast;
  // the centre (the road ahead and the bike) always stays open. Irregular hashed grain (never an ordered pattern) and settling flakes follow.
  // Never a full-screen white: the brightest moment covers the rim only, and reduced motion holds it lower and slower.
  function exitBurst(w, now){ const ex = w.exitT; if(ex < 0 || ex > 7) return; const bs = Math.min(W * .2, H * .27);
    const T = reduce ? 1.9 : .95, bt = ex / T;
    if(bt < 1){ const n = reduce ? 10 : 20, e = sm(bt);
      for(let j = 0; j < n; j++){ const an = j / n * 6.283 + H1(j * 2.3) * .4, ca = Math.cos(an), sa = Math.sin(an); if(sa > .55 && Math.abs(ca) < .45) continue;   // the bike's window
        const rW = W * (.36 + .4 * e + H1(j) * .05), rH = H * (.34 + .38 * e + H1(j * 3) * .05), D = H * (.62 - .3 * e) * (.75 + H1(j * 5.1) * .5);
        const x = W / 2 + ca * rW, y = H * .46 + sa * rH; puff(x, y, D, j + 20, H1(j * 7.7), 0, bt > .4, now, Math.pow(1 - e, 1.4) * (reduce ? .6 : .97)); }
      cx.globalAlpha = 1; }
    // grain: hashed flecks drifting outward from the mouth, each with its own size and path, thinning to nothing (no screen-door veil)
    const ga = 1 - sm(ex / (reduce ? 2.2 : 1.6)); if(ga > .01){ const n = reduce ? 70 : 190;
      for(let j = 0; j < n; j++){ const an = H1(j * 5.3) * 6.283, r0 = H1(j * 1.7), r = (.12 + r0 * .8 + ex * (.25 + H1(j * 9.1) * .5)) * Math.hypot(W, H) * .5, x = W / 2 + Math.cos(an) * r, y = H * .46 + Math.sin(an) * r * .7;
        if(x < 0 || x > W || y < 0 || y > H || (Math.abs(x - W / 2) < bs * .55 && y > H - bs * 1.05)) continue; if(H1(j * 3.9 + Math.floor(ex * 3)) > ga + .15) continue;
        cx.fillStyle = BILL[j % 4 === 0 ? 1 : j % 7 === 0 ? 2 : 0]; cx.globalAlpha = ga * (.5 + H1(j) * .5); const sz = PX * (1 + (j % 3 === 0 ? 1 : 0)); cx.fillRect(snp(x), snp(y), sz, j % 5 === 0 ? sz * 2 : sz); } }
    const sa = sm(ex / .8) * (1 - sm((ex - 4.5) / 2.5)); if(sa > .01){ for(let j = 0; j < (reduce ? 24 : 60); j++){ const sp = .05 + hash(j * 2.3) * .05, ph = ((ex * sp) + hash(j * 7.7)) % 1, x = hash(j * 1.9) * W + Math.sin(ex * .8 + j) * PX * 4, y = ph * H;
        cx.fillStyle = j % 3 ? BILL[0] : BILL[1]; cx.globalAlpha = sa * .8; const sz = PX * (j % 5 === 0 ? 3 : 2); cx.fillRect(snp(x), snp(y), sz, sz); } }
    cx.globalAlpha = 1; }
  // the ceiling shower as you pass under the impact: streams of grit and powder sifting from the roof joints (screen space, near)
  function shower(now, amt){ if(amt <= .02) return; const n = reduce ? 6 : 16, bs = Math.min(W * .2, H * .27);
    for(let j = 0; j < n; j++){ const x = snp((.04 + H1(j * 3.3) * .92) * W); if(Math.abs(x - W / 2) < bs * .35) continue; const len = H * (.25 + H1(j * 1.9) * .35), sp = reduce ? 2600 : 900;
      for(let g = 0; g < (reduce ? 4 : 9); g++){ const ph = ((now / sp) + H1(j * 7.1 + g * 1.3)) % 1, y = ph * len; cx.fillStyle = g % 3 ? '#c8c0b4' : '#eee6da'; cx.globalAlpha = amt * (1 - ph) * .85; cx.fillRect(x + (g % 2) * PX, snp(y), PX, PX * (reduce ? 1 : 2)); } }
    cx.globalAlpha = 1; }
  // ---------------------------------------------------------------- sound
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function crack(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.12, 2600, .16, t0); M.noise(.25, 900, .1, t0 + .02); M.tone(62, 1.6, { type:'sine', v:.12, at:t0 + .05 }); M.noise(2.4, 80, .2, t0 + .1); }
  function rumble(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(2.2, 60, .16 * v, t0); M.tone(31, 2, { type:'sawtooth', v:.05 * v, fuzz:true, at:t0 }); }
  function roar(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(2.6, 220, .13 * v, t0); M.noise(2.2, 700, .06 * v, t0 + .25); }
  function thud(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.7, 110, .2 * v, t0); M.tone(44, .5, { type:'sine', v:.1 * v, at:t0 }); }
  function whoosh(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.2, 1400, .12, t0); M.noise(1.6, 300, .1, t0 + .05); }

  // ---------------------------------------------------------------- placement: decide once per snow visit, for a mouth well inside the road
  // A mouth W0 is valid when no checkpoint gate (or fork approach) falls in [W0 - 350, W0 + L + 90] and the zone ends before the road does.
  // With the visible fork: the shed stays out of a fork's whole split window, and the race (with its cut-in) out of [G - 330, G + 90], so
  // the card never lands on the commit's swing (inForkWindow's window is [G - 140, G + SPLIT_POST]; +190 shifts the test).
  // Preferred: the mouth at the end of the open forest (the snow cycle's m 345..395), so the shed stands in the snow corridor and the
  // onsen street is untouched; otherwise the first valid mouth.
  function plan(i, s, L2){ const rel = i - (typeof landStart === 'number' ? landStart : 0); if(!L2 || L2.key !== 'snow' || rel !== 60 || LANDS[s.land].key !== 'snow') return;
    const z = zoneOfSeg(i), zEnd = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9, ok = W0 => { if(W0 + L + 92 > zEnd) return false; if(window.inForkWindow && (inForkWindow(W0 - 20, W0 + L + 92) || inForkWindow(W0 + RC - 10 + 190, W0 + L + 92 + 190))) return false; for(let k = 0; k < gates.length; k++){ const g = gates[k], g0 = g - (k % 2 ? 2 : 62); if(g + 2 >= RC + W0 - 10 && g0 <= W0 + L + 92) return false; if(Math.abs(g - (W0 - BRD)) < 14) return false; } return W0 + TG - 40 > (typeof landStart === 'number' ? landStart : 0); };   // the race, shed and exit stay clear of gates (a fork's 60-segment approach counts); the long slide may pass one
    const Ta = DIR && DIR.target ? DIR.target('avalanche', i) : null;   /* demo mode: the valid mouth nearest the authored one */
    let best = -1; for(let W0 = i + 780; W0 < (Ta != null ? zEnd : i + 2600) && W0 + L + 92 <= zEnd; W0++){ if(!ok(W0)) continue; if(Ta != null){ if(best < 0 || Math.abs(W0 - Ta) < Math.abs(best - Ta)) best = W0; continue; } const mm = W0 % 400; if(mm >= 345 && mm <= 395){ best = W0; break; } if(best < 0) best = W0; }
    if(best < 0) return; if(DIR && !DIR.request('avalanche', { tier:'hero', seg:best })) return;
    // the mountain goes on the outside of the approach's bends, where the view opens toward it (a bend toward it would hide the slide)
    let cv = 0; for(let j = best - PATH0 - 260; j < best; j++) if(segs[j]) cv += segs[j].curve; add(best, cv > 40 ? -1 : cv < -40 ? 1 : 0); }
  function add(W0, side){ const w = { W0, W1:W0 + L, m:side || (H1(W0 * 1.7) > .5 ? 1 : -1), off:false, cut:null, u:0, tR:-1, ov:0, exitT:-1, lastD:null, swept:false, assist:0, thudId:-1 };
    plans.push(w); if(plans.length > 6) plans.shift(); const s2 = segs[W0]; if(s2) s2.avPlan = w; else w.pend = true; return w; }
  // env/snow.js asks, per segment and side, whether we claim it: -1 = the road's own look; else a bank-height cap (0 = none) and no props
  function claim(i, side){ for(const w of plans){ if(w.off || i < w.W0 - PATH0 - 140 || i > w.W1 + 100 || !(w.pend || (segs[w.W0] && segs[w.W0].avPlan === w))) continue;   // plans from an earlier generation of the road are ignored
      if(i >= w.W0 - 1 && i < w.W1 + 1) return 0;
      if(side === w.m) return i < w.W0 ? lerp(2, .15, sm((i - (w.W0 - PATH0 - 140)) / 40)) : lerp(.15, 2, sm((i - (w.W1 + 50)) / 45));
      return -1; }
    return -1; }
  function hookSnow(){ if(ENV.snow && !ENV.snow.clear) ENV.snow.clear = claim; }
  hookSnow();

  // ---------------------------------------------------------------- the module
  MECH.sp_aval = {
    plans, S, L, DBG, _t:{ frontAt:(i) => frontAt(active(pSeg()), i, pSeg()), slopeAt:(i) => slopeAt(active(pSeg()), i, {}) },
    dbg(W0, side){ hookSnow(); return add(W0, side); },   // testing: a shed mouth at segment W0 (place it before the road there is generated)
    assisting(){ const w = active(pSeg()); return !!w && w.assist > 0; },
    warm(){ build(); hookSnow(); if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16', '雪崩注意見洞門').then(() => { texts(); try{ if(MECH.arrival && MECH.arrival.momentWarm) MECH.arrival.momentWarm(CARD); }catch(e){} }).catch(() => {}); },
    reset(){ for(const w of plans){ if(w.cut){ w.cut.end(); w.cut = null; } } if(ENV.snow) ENV.snow.fall = 1; },
    place(i, s, L2){ for(const w of plans) if(w.pend && w.W0 === i){ s.avPlan = w; w.pend = false; } plan(i, s, L2); },
    hitCar(){ const w = active(pSeg()); if(!w) return false; const d = pSeg() - w.W0; return d > RC - 10 && d < L + 30; },
    update(dt){ const p = pSeg(), w = active(p); if(!w){ if(ENV.snow && ENV.snow.fall !== 1) ENV.snow.fall = 1; return; }
      const d = p - w.W0, a = w.lastD === null ? d : w.lastD, X = v => a < v && d >= v; w.lastD = d;
      // sweep the zone clear ahead of the rider: hazards off, traffic moved beyond the exit; later arrivals far ahead too
      if(!w.swept && d > TG - 30){ w.swept = true; for(let j = Math.floor(w.W0 - PATH0 - 60); j < w.W1 + 95; j++) if(segs[j]) segs[j].hz = null;
        for(const c of cars){ const cs = c.z / SEG; if(cs > p - 2 && cs < w.W1 + 95) c.z = (Math.max(w.W1 + 100, p + 262) + hash(c.z) * 60) * SEG; } }
      if(w.swept && d < L + 60) for(const c of cars){ const cs = c.z / SEG; if(cs > p + 200 && cs > w.W0 - PATH0 - 60 && cs < w.W1 + 95) c.z = (Math.max(w.W1 + 100, p + 262) + hash(c.z) * 60) * SEG; }
      // the front: distance-driven, but from the race on it keeps its own pace; it never reaches the road ahead of the rider (speed is given)
      const ud = sm((d - SL) / (-SL - 5)); if(d > RC && w.tR < 0) w.tR = 0; if(w.tR >= 0 && state === 'play') w.tR += dt;
      // if the slide's own pace gets 10% ahead of the rider's progress to the mouth, the rider is given speed until level again (hysteresis)
      const ut = w.tR >= 0 ? clamp(.5 + w.tR / 7.4 * .5, 0, 1) : 0, q = clamp(.5 + (d - RC) / -RC * .5, 0, 1); w.ut = ut; w.q = q;   // both from the race's start (where the slide is half way)
      if(d < -1 && d > RC && state === 'play' && (ut > q + .1 || (w.assist && ut > q - .02))){ w.assist = 1; speed = Math.max(speed, MAXS * .97); } else w.assist = 0;
      w.u = Math.min(Math.max(ud, ut), d < -2 ? .97 : 1); w.ov = sm((d + 75) / 40);   // the slide reaches the roof as the portal fills the view
      // snowfall: thickens with the telegraph, stops under the roof, falls thick and slow after the exit
      if(ENV.snow){ const tf = 1 + 1.1 * sm((d - TG) / 120); ENV.snow.fall = d < -2 ? tf : d < L ? lerp(tf, 0, sm((d + 2) / 6)) : lerp(1.7, 1, sm((d - L - 20) / 80)); if(d > L + 99) ENV.snow.fall = 1; }
      // beats
      if(X(TG)){ crack(); if(DIR && !reduce && state !== 'ready') shake = Math.max(shake || 0, 3); }
      if(X(TG + 40)) rumble(.6); if(X(SL)){ roar(.7); rumble(.9); } if(X(-470)) roar(.8); if(X(-380)) rumble(1); if(X(RC)) roar(1); if(X(-220)) rumble(1.1); if(X(-150)) roar(1.1); if(X(-80)){ roar(1.3); rumble(1.2); }
      // the card beat: the anime cut-in (ui/cutin.js) when it is loaded, else the director's own 雪崩 AVALANCHE card
      if(X(RC) && DIR && DIR.cine){ let card = CARD;   // every occurrence (Kellan: always show the event cards)
        if(card && MECH.cutin && MECH.cutin.show){ let shown = false; try{ shown = MECH.cutin.show('avalanche') !== false; }catch(e){} if(shown) card = null; }
        w.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, duck:.35, shake:4, guard:{ ahead:L + 140, behind:8 }, dur:0, card }); }
      if(X(-2)){ thud(1.3); if(w.cut) w.cut.hit(7); else if(!reduce) shake = Math.max(shake || 0, 7); }
      // inside: the thunder overhead, every 22 segments; a gentle nudge under reduced motion
      if(d > 0 && d < L){ const id = Math.floor(d / 22); if(id !== w.thudId){ w.thudId = id; thud(.8); if(reduce) shake = Math.max(shake || 0, 1.5); else if(w.cut) w.cut.hit(3.5); else shake = Math.max(shake || 0, 3.5); } }
      if(X(L)){ w.exitT = 0; whoosh(); if(DIR && DIR.done) DIR.done('avalanche'); }
      if(w.exitT >= 0){ w.exitT += dt; if(w.cut && w.exitT > 1.4){ w.cut.end(); w.cut = null; } } },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = pSeg(), w = active(p); if(!w) return; const i = s.index, camP = position / SEG;
      if(i < w.W0 - PATH0 - 300 || i > w.W1 + 110) return;
      if(i === w.W0 - BRD && p < w.W0 - BRD + 10) drawGantry(w, s, sx0, sy0, uw, fog, now);
      const inShed = i >= w.W0 && i < w.W1, insideCam = camP > w.W0 + .2 && camP < w.W1;   // the camera rides ~4 segments behind the bike
      const T = window.__T && DBG.prof ? window.__T : null; let t0 = T ? performance.now() : 0; const tk = k => { if(T){ const t1 = performance.now(); T[k] = (T[k] || 0) + t1 - t0; t0 = t1; } };
      if(!(inShed && insideCam)){ drawSlope(w, s, fog, now, p); tk('a_slope'); drawSlopeTrees(w, s, sx0, sy0, uw, fog, p); tk('a_trees'); drawSpindrift(w, s, sx0, sy0, uw, fog, now, p); drawCloud(w, s, sx0, sy0, uw, fog, now, p); tk('a_cloud'); }
      drawDebris(w, s, sx0, sy0, uw, fog, now); drawExitCloud(w, s, sx0, sy0, uw, fog, now, p); tk('a_exit');
      if(inShed){ drawShed(w, s, fog, now, p); drawJet(w, s, fog, now, p); if(i === w.W0 && camP < w.W0) drawPortal(w, s, fog, now); tk('a_shed'); } },
    drawBackdrop(o){ setLow(o.sk.low); BASE_I = Math.floor(position / SEG); const w = active(pSeg()); if(w){ ridgeDust(w, o, pSeg() - w.W0); plume(w, o, pSeg() - w.W0); } },
    overlay(now, sk){ const p = pSeg(), w = active(p); if(!w) return; const d = p - w.W0;
      drawCue(w, now, d);
      washBehind(d > -30 && d < 40 ? sm((d + 30) / 30) * (1 - sm((d - 5) / 35)) * (reduce ? .5 : 1) : 0, now);
      if(d > 0 && d < L) grains(now, w.ov * sm(d / 8) * (1 - sm((d - L + 8) / 8)));
      shower(now, sm((d + 2) / 4) * (1 - sm((d - 14) / 16)) * (d < 40 ? 1 : 0));
      exitBurst(w, now); }
  };
  addEventListener('load', () => { try{ hookSnow(); if(!S.b32_0_0) build(); }catch(e){ console.warn('sp_aval warm', e); } });
})();
