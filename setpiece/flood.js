/* Sundown set piece: 浸水 FLOOD, the undersea tube springs a leak (MECH.sp_flood, director id 'flood', hero tier, road 'aqua').
   Load after setpiece/naruto.js:   <script src="setpiece/flood.js"></script>
   Notes, sources and the practice log: research/sundown-craft/flood.md.

   The stage. env/aqua.js lays its tube as 200-ring bores; this file books one LONG bore of its own (ENV.aqua.win.boreSet, the hook
   setpiece/megalodon.js uses), LEN rings long, glazed with observation windows over its deep part (s.aqWin), its walls kept clear of
   doors, hydrants and boards (s.aqQuiet). It never shares a stretch with the megalodon: placement skips any registered long bore (with
   a wide margin) and the director gives a road visit one hero moment at most.

   Beats (all driven by the rider's segment, never the clock; s = segments from the portal B; ~14 s at top speed):
     s -95   the alarm: letterbox, duck, the director's guard (traffic out); a two-tone siren starts
     s -85   the card 浸水 FLOOD (every occurrence)
     s 0..   inside: the red rotating lamps turn, the road is wet (a sheen with drip rings); jets spray from the window joints, more and more
     s 60    a pane beside the road spiders (the close-up crack, seen from 90 out), jets from the crack; it lets go behind you (s 165)
     s 165.. water rises behind you; its surge overtakes you along the kerbs (s ~225) and runs ahead; foam, crests, caustics on the walls
     H1      s 190: the pane at 330 bursts 140 ahead of you (slow motion): a torrent across the m side to -m*0.30; the -m lane is open
     H2      s 280: the pane at 420 on the other wall bursts 140 ahead: the m lane is open (a two-lane move over 90 segments)
     H3      s 365: both panes at 505 burst: the centre is open
     behind  s 262 / 372 / 470: more panes fail behind you (a boom, the level jumps)
     gate    s 360: the flood gate at 600 starts closing (a klaxon); its leaves slide from both walls toward a gap at -m*0.30 whose width is
             set by your distance to it (position driven: passable at any speed), 0.54 wide as you pass; it slams behind you, the roar
             stops, the road beyond is dry
     s 680   out into the night air
   Fairness (kikubari): every torrent is on the road 128+ segments before you reach it (>= 1.6 s boosted), each leaves at least a full
   lane, two-lane moves get 90 segments; the leaks and the surge are decor (they land on the walkways); one crash per hazard at most.
   Art: the road water, the torrents and the gate are pixel art at canvas resolution (scratch buffers made in warm()); ordered dither, no
   outlines on water; hue-shifted ramps; light from the lamps on the water, the walls and the bike. Reduced motion / no-flash: steady
   lamps (no rotation flare), no shake, gentler slow motion, fewer particles. */
"use strict";
(() => {
  const DIR = MECH.director, ID = 'flood', CARD = { kanji:'浸水', name:'FLOOD', sub:'beat the flood gates', col:'#5ad8ff' };
  if(DIR) DIR.register(ID, { tier:'hero', roads:['aqua'], card:CARD });
  const LEN = 680, ZG = 600, END = LEN + 40, RA = 70, RB = 100;

  // the tube's section (env/aqua.js): circle RR about CY above the road; the glass runs between WT and WB (angles from the crown)
  const RR = 1.7, CY = .75, OW = Math.sqrt(RR * RR - CY * CY), WT = 1.28, WB = 1.70, UG = 1.64;   // UG: the glass, in half-road widths out
  const sm = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
  const snp = v => Math.round(v / PX) * PX;
  const pSeg = () => (position + PZ) / SEG;
  const H1 = n => hash(n);
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const ih = (x, y) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const QS = new URLSearchParams(location.search);
  const SNT = new Float32Array(1024); for(let i = 0; i < 1024; i++) SNT[i] = Math.sin(i / 1024 * 6.283185);
  const fsin = a => SNT[((a * 162.974) | 0) & 1023];   // (a coarse sine for per-pixel swell)
  let Tg = 0;
  const plans = [];

  // ---------------------------------------------------------------- the water palette (hue-shifted: violet-indigo darks, teal mids, cyan-white foam)
  // 0 deep  1 trough  2 base  3 mid  4 light  5 crest  6 crest hi  7 foam mid  8 foam  9 glint  10 sheen streak  11 submerged line  12 shadow  13 spray dark
  const WPAL = ['#050f1c', '#07202f', '#0a3040', '#104556', '#1a6272', '#3a93a2', '#92d8de', '#a8dee4', '#e4f8f6', '#ffffff', '#6ab4c8', '#2a7486', '#02080e', '#3c7c8c'];
  const NC = WPAL.length, NF = 9, NRED = 3;
  let PF = null, pfK = '';
  let pfRaw = '', pfQ = '#000000';
  function palette(){ if(FOG_COL !== pfRaw){ pfRaw = FOG_COL; const v = hx(FOG_COL); pfQ = '#' + [v[0], v[1], v[2]].map(c => (((c >> 3) << 3) | 4).toString(16).padStart(2, '0')).join(''); }   // (the fog colour drifts every frame: quantised, so the table is rebuilt only when it steps)
    if(PF && pfK === pfQ) return PF; pfK = pfQ; if(!PF) PF = new Uint32Array(NF * NRED * NC); const FOGQ = pfQ;
    for(let q = 0; q < NF; q++) for(let rd = 0; rd < NRED; rd++) for(let c = 0; c < NC; c++){ let col = WPAL[c];
      if(rd) col = mixc(col, c >= 7 && c <= 9 ? '#ffb8b0' : '#d0242c', c >= 7 && c <= 9 ? rd * .16 : rd * .2);
      const v = hx(mixc(col, FOGQ, q / (NF - 1) * .8)); PF[(q * NRED + rd) * NC + c] = (255 << 24 | v[2] << 16 | v[1] << 8 | v[0]) >>> 0; }
    return PF; }
  const fcm = new Map(); let fcK = '';
  const fc = (c, f) => { if(FOG_COL !== pfRaw) palette(); if(pfQ !== fcK){ fcK = pfQ; fcm.clear(); } const q = Math.round(clamp(f, 0, 1) * 12), k = c + q; let v = fcm.get(k); if(!v){ v = mixc(c, pfQ, q / 12 * .82); fcm.set(k, v); } return v; };

  // ---------------------------------------------------------------- textures (warm): foam lace and wall caustics, both tileable
  const LT = new Float32Array(64 * 64); let CTC = null;
  function worley(N, n, seed, out){ let sd = seed; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, P = []; for(let i = 0; i < n; i++) P.push([R() * N, R() * N]);
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ let d1 = 1e9, d2 = 1e9; for(const [px, py] of P) for(let oy = -1; oy <= 1; oy++) for(let ox = -1; ox <= 1; ox++){ const dx = x + .5 - px - ox * N, dy = y + .5 - py - oy * N, d = Math.sqrt(dx * dx + dy * dy); if(d < d1){ d2 = d1; d1 = d; } else if(d < d2) d2 = d; }
      out[y * N + x] = (d2 - d1) / (N / Math.sqrt(n)); } }
  function buildTex(){ worley(64, 30, 77, LT);
    // the caustic tile: the light network the moving water throws on the lower walls (cell borders of a warped Worley field), two tones
    const N = 64, T = new Float32Array(N * N); worley(N, 18, 313, T); CTC = can(N, N); const k = CTC.getContext('2d'), img = k.createImageData(N, N), d = img.data;
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const v = T[y * N + x], o = (y * N + x) * 4; if(v < .055){ d[o] = 150; d[o + 1] = 236; d[o + 2] = 236; d[o + 3] = 255; } else if(v < .12 && (x + y) % 2 === 0){ d[o] = 40; d[o + 1] = 140; d[o + 2] = 150; d[o + 3] = 255; } }
    k.putImageData(img, 0, 0); }

  // ---------------------------------------------------------------- the plan
  // a torrent: { id, Z (pane centre), sd (wall), sb (rider segment at the burst), dEnd (how far out from the glass it reaches), twin }
  function build(B, m){ const p = { B, m, off:false, done:false, on:false, cut:null, lastPs:null, hits:0, jets:[], cracks:[], leaks:[], src:[], beacons:[], P0b:B + 165, fz:-1e9,
      gate:{ Z:B + ZG, xg:-m * .3, gw0:.27, hit:false, slam:false, klax:false }, card:false, wet:0, sirenT:0, roarT:0, slammed:false, slowT:-1 };
    const J = (id, Zr, sd, sbr, reachU) => { const j = { id, Z:B + Zr, sd, sb:B + sbr, dEnd:UG - sd * reachU, hit:false, burst:false }; p.jets.push(j); return j; };
    J('H1', 330, m, 190, -m * .30); J('H2', 420, -m, 280, m * .30);
    const a = J('H3a', 505, m, 365, m * .27), b = J('H3b', 505, -m, 365, -m * .27); a.twin = b; b.twin = a;
    // the cracks: the close-up one beside the road (P0, never a hazard) and one on each torrent's pane before it goes
    p.cracks.push({ Z:B + 150, sd:-m, s0:B + 78, s1:B + 136, burst:B + 165, seed:3 });
    for(const j of p.jets) p.cracks.push({ Z:j.Z, sd:j.sd, s0:j.sb - 70, s1:j.sb - 8, burst:j.sb, seed:j.Z % 97, jet:j });
    // water sources: every pane that goes (torrents ahead, the ones behind you); a: how much water it adds
    p.src.push({ Z:B + 150, sb:B + 165, a:.45 });
    for(const j of p.jets) if(!j.twin || j.sd === m) p.src.push({ Z:j.Z, sb:j.sb, a:.5 });
    for(const [z, s] of [[240, 262], [345, 372], [440, 470]]) p.src.push({ Z:B + z, sb:B + s, a:.35, behind:true });
    // the leaks: at window joints (every 6 rings), more of them deeper in; each starts spraying as you come within 120
    for(let k = 30; k < ZG - 10; k += 6) for(const sd of [-1, 1]){ const pr = .22 + .4 * k / ZG; if(H1(k * 1.7 + sd * 3.1 + B * .01) > pr) continue;
      p.leaks.push({ Z:B + k, sd, a:H1(k * 2.3 + sd) < .5 ? WB - .01 : WT + .01, s0:B + Math.max(0, k - 120), land:1.18 + H1(k * 5.1 + sd) * .26, seed:k * 3 + (sd > 0 ? 1 : 0) }); }
    // the red rotating lamps on both walls, every 30 rings, up to the gate
    for(let k = 10; k < ZG; k += 24) for(const sd of [-1, 1]) p.beacons.push({ Z:B + k, sd, ph:H1(k * 3.7 + sd * 1.3) * 6.283 });
    return p; }

  // ---------------------------------------------------------------- placement: one long bore on an Aqua-Line road, clear of the megalodon's
  const zoneStart = z => z > 0 ? gates[2 * z - 1] : 0;
  const AQW = () => ENV.aqua && ENV.aqua.win;
  function findB(z, minS){ if(typeof gates === 'undefined' || gates[2 * z] === undefined) return null; const zs = zoneStart(z), G = gates[2 * z], bd = gates[2 * z + 1];
    const SPL = typeof SPLIT_ON !== 'undefined' && SPLIT_ON, pre = typeof SPLIT_PRE === 'number' ? SPLIT_PRE : 110, post = typeof SPLIT_POST === 'number' ? SPLIT_POST : 380;
    const st = SPL ? [[zs + 20, G - pre - 31]] : [[zs + 20, G - 70]]; if(bd !== undefined) st.push(SPL ? [G + post + 1, bd - 40] : [G + 40, bd - 40]);
    const fT = DIR && DIR.target ? DIR.target(ID, zs + 1) : null, want = fT != null ? Math.max(0, fT - 330 - zs) : +(QS.get('flB') || -1), A = AQW(),   /* fT: demo mode, the first valid spot from the authored one */ bores = A && A.bores ? A.bores : [];
    for(const [s0, s1] of st){ const lo = Math.max(s0 + 170, minS + 170, want >= 0 ? zs + want : 0);
      for(let a = lo; a + LEN + RB + 30 <= s1; a += 10){ let ok = true;
        for(const r of bores) if(a - RA - 400 < r.b + RB && a + LEN + RB + 400 > r.a - RA) { ok = false; break; }   // never the megalodon's stretch
        if(ok && window.inForkWindow && inForkWindow(a - 170, a + LEN + 60)) ok = false;
        if(ok) for(const g of gates) if(g >= a - 170 && g <= a + LEN + 60){ ok = false; break; }
        if(ok){ const Jm = MECH.sp_jump, q0 = a - 170; if(Jm && Jm.clearAfter && Jm.clearAfter(q0) !== q0) ok = false; }
        if(ok) return a; } }
    return null; }
  const decided = new Map(); let lastI = -1;
  function plan(i){ if(typeof zoneOfSeg !== 'function' || typeof gates === 'undefined') return; const z = zoneOfSeg(i + 1), L0 = LANDS[landIdx(z)]; if(!L0 || L0.key !== 'aqua') return;
    const zs = zoneStart(z); if(i + 1 < zs || i > zs + 60 || decided.has(zs)) return;
    const B = findB(z, i + 6); if(B === null){ if(gates[2 * z + 1] !== undefined) decided.set(zs, null); return; } decided.set(zs, B);
    if(DIR && !DIR.request(ID, { tier:'hero', seg:B + 330, visit:zs, road:'aqua' })) return;
    const qs = +(QS.get('flside') || 0), m = qs ? Math.sign(qs) : H1(B * .37 + 2.1) < .5 ? -1 : 1;
    const p = build(B, m); p.vk = zs; p.di = i; plans.push(p); if(plans.length > 4) plans.shift(); boreSet(B, B + LEN, true); }
  const boreSet = (a, b, on) => { const A = AQW(); if(A && A.boreSet) A.boreSet(a, b, on); };
  /* THE COMBINED EVENT (director id 'abyss', booked by setpiece/megalodon.js): the mosasaur's second bite breaks the tube, and this flood is
     what follows. megalodon.js lays one long bore whose last LEN rings are this plan's (B = its end - LEN), so the bitten pane is this plan's
     P0 pane (B + 150, on the wall it bit). The flood's own build-up (its card and alarm long before, the close-up crack, the needle jets
     from the window joints) is replaced: the alarm, the sirens and the red lamps start as the second bite lands (A0); the bitten pane bursts
     as you pass it (B + 138); the torrents, the panes failing behind you, the surge and the gate play as built. A 浸水 line is called out at
     the breach instead of a second card. */
  /* In the combined event the first torrent IS the bitten pane: H1 moves to B + 230 (megalodon.js puts its second bite there, 64 rings
     ahead of you), bursts while you are still 50 rings from it, in clear view, and reaches across the near lane only (a one-lane move,
     telegraphed by the bite, the spreading cracks and their spray); if you could not reach the open road in time it stops short of you
     (the mosasaur's corridor rule). The close-up pane P0 is not used. A0: the alarm, sirens and red lamps, as the bite lands. */
  const H1Z = 230, H1S = 180, A0R = 166;
  function abyssify(p, ms){ p.ab = true; p.A0 = p.B + A0R; p.P0b = p.B + H1S;
    const h = p.jets[0], oz = h.Z; h.Z = p.B + H1Z; h.sb = p.B + H1S; h.dEnd = UG - .3; h.cut = true;
    p.cracks = p.cracks.filter(c => c !== p.cracks[0]); for(const c of p.cracks) if(c.jet === h){ c.Z = h.Z; c.s0 = h.sb - 1; c.burst = h.sb; c.noCrack = true; }
    p.src = p.src.filter(q => q !== p.src[0]); for(const q of p.src) if(q.Z === oz){ q.Z = h.Z; q.sb = h.sb; }
    p.leaks = p.leaks.filter(l => l.Z > p.B + H1S + 10); void ms; return p; }
  // the corridor rule for the bitten pane's torrent: if the open road is out of reach in the time left (60% of it, after 0.45 s), it is cut
  function cutJet(j, ps){ const bw = bikeHalf() - HIT_GRACE, mx = j.sd * playerX, edge = UG - j.dEnd; if(mx < edge - bw - .05) return;
    const left = (j.Z - ps) / Math.max(1, speed / SEG), can = 2 * Math.max(.25, speed / MAXS) * Math.max(0, left - .45 * ((window.ASSIST && ASSIST.speed) || 1)) * .6;
    if(mx - (edge - bw - .1) <= can) return; j.dEnd = Math.max(.25, UG - Math.min(UG - .25, mx + bw + .12)); }
  function combine(B, m, ms, vk){ const p = abyssify(build(B, m), ms); p.vk = vk; p.nw = true; plans.push(p); if(plans.length > 4) plans.shift(); boreSet(B, B + LEN, true); return p; }
  // the sides are known only once the road ahead is laid (megalodon.js picks the wall the bend curves away from): rebuilt in place
  function side(p, m, ms){ if(!p || p.on) return; const q = abyssify(build(p.B, m), ms); for(const k of ['m', 'jets', 'cracks', 'leaks', 'src', 'beacons', 'gate', 'P0b', 'A0']) p[k] = q[k]; }
  function lay(p, i, s){ const k = i - p.B; if(k >= -110 && k < LEN && !s.fdCv){ s.fdCv = 1; s.curve *= .45; } if(k === 0) s.fdPlan = p; if(k === LEN - 1) boreSet(p.B, p.B + LEN, true);
    if(k >= -10 && k < LEN) s.aqQuiet = 1; }
  const live = p => !p.off && segs[p.B] && segs[p.B].fdPlan === p;
  const active = ps => { for(const p of plans) if(live(p) && !p.done && ps > p.B - 300 && ps < p.B + END + 20) return p; return null; };

  // ---------------------------------------------------------------- geometry of a torrent (in its pane's plane: u across, h up, half-road widths)
  // d: distance out from the glass. The jet leaves the burst pane (h 0.50..1.22) almost level, thickens and falls; its top meets the road
  // at dTop, its underside at dBot; between them and out to dEnd it lands in a heap of whitewater.
  const JG = { k:0, dTop:0, dBot:0, dEnd:0 };
  function jetGeo(j, grow){ const dEnd = j.dEnd * grow, dTop = Math.max(.3, dEnd - .1), k = (1.26 + .24 * dTop) / (dTop * dTop);
    JG.k = k; JG.dTop = dTop; JG.dEnd = dEnd; JG.dBot = (-.04 + Math.sqrt(.0016 + 2.16 * k)) / (2 * k); return JG; }
  const jetGrow = (j, ps) => j.burst ? sm((ps - j.sb) / 12) : 0;
  const jetX = j => { const uw = j.sd * 1.6, ur = j.sd * (UG - j.dEnd); return [(uw + ur) / 2, Math.abs(uw - ur) / 2]; };

  // water level over the floor at world segment Z (0 a wet sheen .. 1 deep), and the surge front
  function frame(p, ps){ p.fz = ps >= p.P0b ? Math.min(p.B + ZG, p.B + 150 + (ps - p.P0b) * 1.25) : -1e9; }
  function level(p, ps, Z){ if(Z > p.B + ZG + .5 || Z < p.B - 3 || (p.ab && ps < p.A0)) return -1; let L = 0;
    if(Z < p.fz) L = (.2 + .4 * sm((ps - p.P0b) / 380)) * sm((p.fz - Z) / 30);
    for(const q of p.src){ if(ps < q.sb) continue; const R = Math.min(170, (ps - q.sb) * 1.5 + 8), dd = Math.abs(Z - q.Z); if(dd < R) L += q.a * sm(1 - dd / R); }
    return L > 1 ? 1 : L; }

  // ---------------------------------------------------------------- the road water raster (rows from the projected road, canvas resolution)
  const RMAX = 1400, NS = 420;
  const RN = new Int16Array(RMAX), RXc = new Float32Array(RMAX), RWc = new Float32Array(RMAX), RZc = new Float32Array(RMAX), RFq = new Uint8Array(RMAX), RDL = new Uint8Array(RMAX), RDR = new Uint8Array(RMAX), RLv = new Float32Array(RMAX);
  const SG0 = new Int16Array(NS), SGN = new Int16Array(NS);
  let WC = null, WG = null, WI = null, WU = null, WWc = 0, WHc = 0, R0 = 0, R1 = -1, BASEI = 0, rowF = -1, okW = false, wR0 = -1, wR1 = -1, wB = -1, WSK = 0;
  function ensureW(cw, nr){ if(WC && WWc >= cw && WHc >= nr) return; WWc = Math.max(cw, WWc); WHc = Math.max(nr, WHc, 8); WC = can(WWc, WHc); WG = WC.getContext('2d', { willReadFrequently:true }); WI = WG.createImageData(WWc, WHc); WU = new Uint32Array(WI.data.buffer); }
  function rows(p){ const base = segAt(position), ch = cx.canvas.height; BASEI = base.index; R0 = 1e9; R1 = -1; SGN.fill(0); const nR = Math.min(ch, RMAX); for(let r = 0; r < nR; r++) RN[r] = -1; let maxy = H;
    const zA = p.B - 3, zB = p.B + ZG + 1;
    for(let n = 0; n < DRAW && n < NS; n++){ const s = segs[base.index + n]; if(!s) break; const a = s.p1.screen, b = s.p2.screen;
      if(s.p1.camera.z <= DEPTH || !s.p1.screen.scale || !s.p2.screen.scale || b.y >= a.y || b.y >= maxy){ continue; }
      const inside = s.index >= zA && s.index < zB, yb = Math.min(a.y, maxy);
      if(inside){ let r0 = Math.ceil(b.y / PX - .5), r1 = Math.ceil(yb / PX - .5) - 1; if(r0 < 0) r0 = 0; if(r1 >= nR) r1 = nR - 1;
        if(r1 >= r0){ const fog = clamp(Math.pow(n / DRAW, 1.6), 0, 1), q = Math.min(NF - 1, Math.round(fog * (NF - 1))), s1 = a.scale, s2 = b.scale, is1 = 1 / s1, is2 = 1 / s2, dy = a.y - b.y; SG0[n] = r0; SGN[n] = r1 - r0 + 1;
          for(let r = r0; r <= r1; r++){ const t = (a.y - (r + .5) * PX) / dy, sc = s1 + (s2 - s1) * t, fz = clamp((1 / sc - is1) / (is2 - is1), 0, 1);
            RN[r] = n; RXc[r] = a.x + (b.x - a.x) * t; RWc[r] = a.w + (b.w - a.w) * t; RZc[r] = s.index + fz; RFq[r] = q; }
          if(r0 < R0) R0 = r0; if(r1 > R1) R1 = r1; } }
      maxy = b.y; } }
  // the red of the rotating lamps on the floor, per row and side (three hard steps)
  const BCN = { on:false };
  function lampLv(p, b){ if(!BCN.on) return 0; if(reduce || (window.ASSIST && ASSIST.noFlash)) return .45; const th = Tg * 6.9 + b.ph, c = Math.cos(th); return .25 + .75 * (c > 0 ? c * c * c : 0); }
  const RBL = new Int16Array(RMAX), RBR = new Int16Array(RMAX);
  function redRows(p){ for(let r = R0; r <= R1; r++){ RDL[r] = 0; RDR[r] = 0; RBL[r] = -1; RBR[r] = -1; if(RN[r] < 0 || !BCN.on) continue; const Z = RZc[r]; let dl = 9, dr = 9;
      for(let n = 0; n < p.beacons.length; n++){ const b = p.beacons[n], dz = Math.abs(Z - b.Z); if(dz > 9) continue; if(b.sd < 0){ if(dz < dl){ dl = dz; RBL[r] = n; } } else if(dz < dr){ dr = dz; RBR[r] = n; } }
      if(RBL[r] >= 0) RDL[r] = Math.round(lampLv(p, p.beacons[RBL[r]]) * 100); if(RBR[r] >= 0) RDR[r] = Math.round(lampLv(p, p.beacons[RBR[r]]) * 100); } }
  // per frame: the torrents' landing foam (u centre, z) for the raster
  const JF = { u:new Float32Array(8), z:new Float32Array(8), r:new Float32Array(8), n:0 }, JL = new Int8Array(8);
  function rasterWater(p, ps){ okW = false; if(R1 < R0) return; const cw = cx.canvas.width, nr = R1 - R0 + 1; ensureW(cw, nr); const T = palette(), ip = 1 / PX;
    redRows(p); JF.n = 0;
    for(const j of p.jets){ const g = jetGrow(j, ps); if(g <= 0 || JF.n >= 8) continue; const G = jetGeo(j, g), k = JF.n++; JF.u[k] = j.sd * (UG - (G.dBot + G.dEnd) * .5); JF.z[k] = j.Z; JF.r[k] = (G.dEnd - G.dBot) * .5 + .2; }
    const tf = reduce ? Tg * .4 : Tg, flow = tf * 5.5, crestT = tf * 1.7, rip = tf * .75, fz = p.fz;
    for(let r = R0; r <= R1; r++){ const o = (r - R0) * WWc; if(RN[r] < 0){ WU.fill(0, o, o + WWc); continue; }
      const Z = RZc[r], L = level(p, ps, Z); RLv[r] = L; if(L < 0){ WU.fill(0, o, o + WWc); continue; }
      const xc = RXc[r], w = RWc[r], fp = PX / w, dzr = r < R1 && RN[r + 1] >= 0 ? Math.abs(Z - RZc[r + 1]) : .05, far = dzr > 1.2, base = RFq[r] * NRED * NC;
      const xa = Math.max(0, Math.ceil((xc - OW * w) * ip - .5)), xb = Math.min(cw, Math.ceil((xc + OW * w) * ip - .5));
      if(xa > 0) WU.fill(0, o, o + xa); if(xb < WWc) WU.fill(0, o + Math.max(0, xb), o + WWc); if(xb <= xa) continue;
      const mode = L < .1 ? 0 : L < .3 ? 1 : 2;
      // the lamps' red on the floor: an ellipse round the point under each lamp, by row (nearest lamp each side)
      const bl = RBL[r], br = RBR[r], blv = RDL[r] / 100, brv = RDR[r] / 100, dzl = bl >= 0 ? (Z - p.beacons[bl].Z) * .1 / .9 : 9, dzrr = br >= 0 ? (Z - p.beacons[br].Z) * .1 / .9 : 9;
      // crests across the flow: a 1 px line where a crest falls inside this row's depth span (none where a row spans several)
      const ph0 = Z * 1.2 + crestT, ph1 = (Z + dzr) * 1.2 + crestT, cid = Math.floor(ph1), crestRow = !far && dzr * 1.2 < .45 && Math.floor(ph0) !== cid;
      const troughRow = !far && !crestRow && dzr * 1.2 < .3 && Math.floor(ph0 - .06) !== Math.floor(ph1 - .06);
      const sf = Z - fz, surge = sf > -1.2 && sf < 2.6 ? 1.15 - Math.abs(sf - .6) / 1.8 : sf <= -1.2 && sf > -7 ? .32 * (1 + sf / 7) : 0;
      let jn = 0; for(let k = 0; k < JF.n; k++) if(Math.abs(Z - JF.z[k]) < 80){ JL[jn++] = k; }
      // foam lace sampled at a scale that keeps its cells a few pixels wide at every distance (finer in the world as it nears you)
      let lvl = 1; while(lvl < 64 && 46 * lvl * fp < 1.1) lvl *= 2; const lr = ((((Z * 4.6 * lvl - flow * lvl * .25) | 0) % 64) + 64) % 64 * 64, lsc = 46 * lvl;
      const zc4 = Math.floor(Z / 3);
      for(let x = xa; x < xb; x++){ const u = ((x + .5) * PX - xc) / w, au = u < 0 ? -u : u, bay = BAY4[(r & 3) * 4 + (x & 3)];
        let ci = -1;
        // red from the nearest lamp on this side
        let rd = 0; { const sdv = u < 0 ? blv : brv; if(sdv > 0){ const du = (au - 1.2) / .42, dz = (u < 0 ? dzl : dzrr) * 1.8, e = sdv * (1 - du * du - dz * dz); rd = e > .55 ? 2 : e > .25 ? 1 : 0; } }
        if(mode === 0){
          // the sheen: the LED strips mirrored as broken streaks, small drip rings
          if(Math.abs(au - .78) < .06 + fp * .5 && ih(Math.floor(Z * 2.5), u < 0 ? 1 : 2) > .25) ci = Math.abs(au - .78) < .018 + fp * .5 ? 6 : bay < 9 ? 10 : -1;
          else if(au > 1.12 && au < 1.36 && ih(Math.floor(Z * 1.7), Math.floor(au * 30)) > .8 && bay < 10) ci = 11;   // the windows' cyan sills mirrored near the walls
          else if(!far && dzr < .5){ const cu = Math.floor((u + 3) / .5), hh = ih(cu, zc4); if(hh < .2){ const uc = (cu + .25 + .5 * ih(cu + 7, zc4)) * .5 - 3, zcn = (zc4 + .5) * 3, t = (rip + hh * 5) % 1, rad = .012 + t * .06, du = u - uc, dzw = (Z - zcn) * .1, dd = Math.sqrt(du * du + dzw * dzw);
              if(t < .8 && Math.abs(dd - rad) < fp * .55) ci = t < .3 ? 6 : 5; } }
          if(au > 1.47 && L > .04 && bay < 6) ci = 11;
          if(ci < 0){ WU[o + x] = rd === 2 && bay < 3 ? T[base + 2 * NC + 1] : 0; continue; }
          WU[o + x] = T[base + rd * NC + ci]; continue; }
        // film and deep water
        let F = 0;
        if(au > 1.47) F = 1.2; else if(au > 1.4 && L > .5) F = (au - 1.4) / .07 * .5;
        if(surge > 0) F = Math.max(F, surge);
        for(let q2 = 0; q2 < jn; q2++){ const k = JL[q2], dzw = (Z - JF.z[k]) * .1; if(u < JF.u[k] - JF.r[k] * 1.25 - .17 || u > JF.u[k] + JF.r[k] * 1.25 + .17) continue; const du = (u - JF.u[k]) / JF.r[k], dv = dzw / .5, q = 1.2 - Math.sqrt(du * du + dv * dv);
          if(q > F) F = q; const lat = Math.abs(u - JF.u[k]); if(lat < .16 && dzw > -3.5 && dzw < 3.5){ const sk = Math.floor((u + 4) / .04); if(ih(sk, k + 3) > .55){ const tr = .7 * (1 - Math.abs(dzw) / 3.5) * (1 - lat / .16); if(tr > F) F = tr; } } }
        if(far){ ci = L > .6 ? 1 : 2; if(F > .6 && bay < 8) ci = 7; else if(Math.abs(au - .78) < .05 && ih(Math.floor(Z), x) > .6) ci = 5; }
        else {
          ci = L > .6 ? 1 : 2; { const sw = fsin(Z * .31 + u * 1.3 - crestT * .9 + 64) + .5 * fsin(Z * .83 - u * 2.1 + crestT * 1.3 + 64); if(sw > .9) ci = bay < 4 ? ci + 1 : ci; else if(sw < -.95 && bay < 4) ci = 0; }   // the swell: broad slow bands of the water lifting and dropping
          if(au > 1.12 && au < 1.36 && ih(Math.floor(Z * 1.7), Math.floor(au * 30)) > .78) ci = 5;   // the windows' cyan sills mirrored near the walls
          if(mode === 1 && bay < 8) ci = -1;   // a film: half the road shows through (ordered dither)
          if(mode === 2 && (Math.abs(au - .333) < .01 + fp * .5 || Math.abs(au - .95) < .01 + fp * .5) && bay < 10) ci = 3;   // the lane lines under the water
          if(Math.abs(au - .78) < .035 + fp * .5){ if(ih(Math.floor(Z * 3 + crestT * 2), u < 0 ? 5 : 6) > .5) ci = crestRow ? 6 : 4; }   // the LED strips mirrored, broken by the flow
          else if(crestRow){ const g = ih(Math.floor((u + 4) / (.06 + .06 * ih(cid, 3))), cid); if(g > .4) ci = g > .85 ? 5 : 4; }
          else if(troughRow && ci >= 0 && ih(Math.floor((u + 4) / .08), Math.floor(ph1)) > .5) ci = 0;
          if(F > .05){ if(F >= 1.1) ci = 8; else { const lv = LT[lr + ((((u + 4) * lsc) | 0) & 63)]; if(lv < F * .42) ci = 8; else if(lv < F * .58) ci = 7; else if(lv < F * .7 && ci >= 0) ci = 3; } }
          else if(mode === 2 && ci === 1 && ih(Math.floor((u + 4) / .05), Math.floor(Z * 2)) > .992) ci = 9;   // a glint
        }
        WU[o + x] = ci < 0 ? (rd === 2 && bay < 3 ? T[base + 2 * NC + 1] : 0) : T[base + rd * NC + ci]; } }
    WG.putImageData(WI, 0, 0, 0, 0, cw, nr); okW = true; }

  // ---------------------------------------------------------------- projection helpers
  const PJ = { x:0, y:0, w:0, cz:0 };
  function projZ(z){ const i = Math.floor(z), s = segs[i]; if(!s || !s.p1.screen.scale || !s.p2.screen.scale || s.p1.camera.z <= DEPTH) return null; const f = z - i, a = s.p1, b = s.p2;
    PJ.x = a.screen.x + (b.screen.x - a.screen.x) * f; PJ.y = a.screen.y + (b.screen.y - a.screen.y) * f; PJ.w = a.screen.w + (b.screen.w - a.screen.w) * f; PJ.cz = a.camera.z + (b.camera.z - a.camera.z) * f; return PJ; }
  // a point on the tube wall at angle a from the crown (signed: + right) on the ring at (x, y, w)
  const WPt = [0, 0]; const wallPt = (x, y, w, a) => { WPt[0] = x + RR * w * Math.sin(a); WPt[1] = y - CY * w - RR * w * Math.cos(a); return WPt; };
  // a stepped light pool (three hard levels, whole-pixel rows): the game's glow without its antialiased arcs, which cost ~0.3 ms each here
  const GW3 = [.3, .35, .45], GF3 = [1, .62, .3];
  function pool(x, y, r, rgb, a){ if(r < PX * 2 || a <= .01) return; cx.globalCompositeOperation = 'lighter';
    for(let l = 0; l < 3; l++){ const R = r * GF3[l], n = Math.max(2, Math.min(8, Math.round(R / PX / 2))); cx.fillStyle = rgbaA(rgb, a * GW3[l]); cx.beginPath();
      for(let k = -n; k < n; k++){ const t = (k + .5) / n, hw = R * Math.sqrt(1 - t * t); cx.rect(snp(x - hw), snp(y + k * R / n), snp(hw * 2), snp(R / n) || PX); } cx.fill(); }
    cx.globalCompositeOperation = 'source-over'; }
  function pline(x0, y0, x1, y1, col, wd){ const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / PX)); cx.fillStyle = col; const w2 = wd || PX;
    for(let i = 0; i <= n; i++){ const t = i / n; cx.fillRect(snp(x0 + (x1 - x0) * t), snp(y0 + (y1 - y0) * t), w2, w2); } }

  // ---------------------------------------------------------------- the crack: radial rays from the strike point, rings between them (warm)
  // pane-local coordinates: X along the tube (half-road widths, -0.3..0.3: the pane's six rings), Y down the glass (arc length from WT)
  const CRK = [];
  function buildCrack(seed){ let sd = seed * 7919 + 17; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, P = [], X0 = (R() - .5) * .16, Y0 = .22 + R() * .2, YM = RR * (WB - WT), rays = [];
    const n = 9 + (R() * 3 | 0);
    for(let k = 0; k < n; k++){ let a = k / n * 6.283 + (R() - .5) * .5, x = X0, y = Y0, t = 0; const pts = [[x, y, 0]];
      for(let st = 0; st < 9; st++){ a += (R() - .5) * .5; const L = .045 + R() * .05; x += Math.cos(a) * L; y += Math.sin(a) * L * .9; t += L; if(x < -.3 || x > .3 || y < 0 || y > YM){ x = clamp(x, -.3, .3); y = clamp(y, 0, YM); pts.push([x, y, t]); break; } pts.push([x, y, t]);
        if(R() < .22 && st > 1){ const b = a + (R() < .5 ? .7 : -.7); P.push([x, y, x + Math.cos(b) * .05, y + Math.sin(b) * .05, t + .05]); } }
      rays.push(pts); for(let i = 1; i < pts.length; i++) P.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], pts[i][2]]); }
    // the concentric rings: short chords between neighbouring rays at three radii
    for(const rad of [.06, .13, .22]) for(let k = 0; k < rays.length; k++){ if(R() < .25) continue; const A = rays[k], Bq = rays[(k + 1) % rays.length], pa = A.find(q => q[2] >= rad), pb = Bq.find(q => q[2] >= rad); if(!pa || !pb) continue;
      P.push([pa[0], pa[1], (pa[0] + pb[0]) / 2 + (R() - .5) * .02, (pa[1] + pb[1]) / 2 + (R() - .5) * .02, rad + .08]); P.push([(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, pb[0], pb[1], rad + .1]); }
    let tm = 0; for(const q of P) tm = Math.max(tm, q[4]); for(const q of P) q[4] /= tm;
    return { P, X0, Y0, ends:rays.map(r => r[r.length - 1]) }; }
  // the crack on pane c, the part between rings j and j+1 (drawn in segment j's drawSeg: after ring j+1, which drew that strip of wall)
  function drawCrack(p, c, j, g, fog, ps){ const C = CRK[c.seed % CRK.length]; if(!C) return; const sd = c.sd, a0 = WT, near = (projZ(j) || PJ).w > W * .07;
    const col = fc('#e6fbff', fog * .6), sh = fc('#05141c', fog * .4), wd = near && PJ.w > W * .18 ? PX * 2 : PX;
    for(const q of C.P){ if(q[4] > g) continue; const zm = c.Z + (q[0] + q[2]) * 5; if(zm < j || zm >= j + 1) continue;
      const A = projZ(c.Z + q[0] * 10); if(!A) continue; const ax = A.x, ay = A.y, aw = A.w, [x0, y0] = wallPt(ax, ay, aw, sd * (a0 + q[1] / RR));
      const Bq = projZ(c.Z + q[2] * 10); if(!Bq) continue; const [x1, y1] = wallPt(Bq.x, Bq.y, Bq.w, sd * (a0 + q[3] / RR));
      if(near) pline(x0 + PX, y0 + PX, x1 + PX, y1 + PX, sh, PX); pline(x0, y0, x1, y1, col, wd); } }

  // ---------------------------------------------------------------- a needle jet from a window joint or a crack: droplet dashes on a parabola
  function needle(z, sd, u0, h0, uL, now, fog, k, seed){ const P = projZ(z); if(!P || P.w < 6) return; const x = P.x, y = P.y, w = P.w, D = u0 - uL;
    const n = Math.max(6, Math.min(48, Math.round(w * D * 1.6 / PX))), sp = reduce ? .5 : 2.2, ph = (now / 1000 * sp + H1(seed)) % 1, c1 = fc('#eafcff', fog * .5), c2 = fc('#7ac0d0', fog * .5), sz = w > W * .18 ? PX * 2 : PX;
    for(let pass = 0; pass < 2; pass++){ cx.fillStyle = pass ? c2 : c1; cx.beginPath();
      for(let i = 0; i < n; i++){ const s = i / n; if((s < .45) === !!pass) continue; if(((s * 7 - ph * 3) % 1 + 1) % 1 > .62 * k + .2) continue; const u = sd * (u0 - D * s), h = h0 + .08 * s - (h0 + .08) * s * s; cx.rect(snp(x + u * w), snp(y - h * w), sz, sz); }
      cx.fill(); }
    // where it lands: a little splash on the walkway
    if(w > W * .05){ const lx = x + sd * uL * w, hh = Math.max(PX * 2, snp(w * .04)); cx.fillStyle = c1; for(let q = -1; q <= 1; q++){ if(H1(seed + q + Math.floor(now / 90)) < .4) continue; cx.fillRect(snp(lx + q * PX * 2), snp(y - hh * (1 - Math.abs(q) * .5)), PX, PX); } } }

  // ---------------------------------------------------------------- the torrent: rastered in its pane's plane, back slice to front slice
  const JW = 1024, JH = 640; let JC = null, JGx = null, JI = null, JU = null; const JB = [[128, 96, 4], [256, 160, 4], [512, 320, 2], [1024, 640, 2]], JCS = [], JGS = [], JSL = [0, 0, 0, 0]; let jF = -1;   // (canvases by size, several of each: drawing from a canvas snapshots all of it, so a small torrent is drawn from a small canvas, and none is re-filled in the frame that drew from it)
  const SLZ = [-3];   // (the face nearest you; a second, farther slice for the top surface cost more than it showed)
  function drawJet(p, j, now, ps){ const g = jetGrow(j, ps); if(g <= 0 || !JU) return; const G = jetGeo(j, g), sd = j.sd, T = palette(), cw = cx.canvas.width, chh = cx.canvas.height, ip = 1 / PX;
    const tf = reduce ? Tg * .45 : Tg, pulse = 1 + .05 * Math.sin(tf * 7.3 + j.Z) + .03 * Math.sin(tf * 17.1), dTop = G.dTop, dBot = G.dBot, dEnd = G.dEnd, k = G.k;
    const uMin = Math.min(sd * UG, sd * (UG - dEnd)) - .12, uMax = Math.max(sd * UG, sd * (UG - dEnd)) + .12, hMax = 1.62;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1; const SL = [];
    for(let si = 0; si < SLZ.length; si++){ const P = projZ(j.Z + SLZ[si]); if(!P || P.cz < 380 || P.w < 2) continue; if(P.w > W * 1.6) continue;
      const x0 = Math.max(0, Math.floor((P.x + uMin * P.w) * ip)), x1 = Math.min(cw - 1, Math.ceil((P.x + uMax * P.w) * ip)), y0 = Math.max(0, Math.floor((P.y - hMax * P.w) * ip)), y1 = Math.min(chh - 1, Math.ceil((P.y + .02 * P.w) * ip));
      if(x1 < x0 || y1 < y0) continue; SL.push([si, P.x, P.y, P.w, x0, y0, x1, y1, Math.min(NF - 1, Math.round(clamp(Math.pow(P.cz / (SEG * DRAW), 1.6), 0, 1) * (NF - 1)))]);
      if(x0 < bx0) bx0 = x0; if(y0 < by0) by0 = y0; if(x1 > bx1) bx1 = x1; if(y1 > by1) by1 = y1; }
    if(!SL.length) return; const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1; if(bw > JW || bh > JH) return;
    const front = SL[SL.length - 1];
    if(front[3] < 6){ cx.fillStyle = fc('#cfeef2', front[8] / 8); pxRect(front[1] + Math.min(sd * UG, sd * (UG - dEnd)) * front[3], front[2] - .9 * front[3], Math.max(PX, snp(dEnd * front[3])), Math.max(PX, snp(.9 * front[3]))); return; }
    for(let y = 0; y < bh; y++) JU.fill(0, y * JW, y * JW + bw);
    const flowS = tf * 7, veilOK = front[0] === SLZ.length - 1 && front[3] > W * .04 && dBot > .1;
    for(const [si, X0, Y0, w, x0, y0, x1, y1, fq] of SL){ const fp = PX / w, pb = fq * NRED * NC, isF = si === SLZ.length - 1, back = !isF, iw = 1 / w; let lvl = 1; while(lvl < 256 && 50 * lvl * fp < 2.2) lvl *= 2; const lsc = 50 * lvl, sZ = .8 * Math.sin(j.Z);
      // column by column (u, and so d, is fixed down a column): only the rows the jet, its veil or its heap can touch
      for(let xx = x0; xx <= x1; xx++){ const u = ((xx + .5) * PX - X0) * iw, d = UG - sd * u; if(d < -.02 || d > dEnd + .02) continue;
        const c = .9 + .1 * d - k * d * d, t = (.36 + .14 * d) * pulse, top = c + t, bot = Math.max(0, c - t), body = d <= dTop, veil = veilOK && isF && d >= 0 && d < dBot;
        const heap = d > dBot - .12, e = heap ? (d - dBot + .12) / (dEnd - dBot + .12) : 0, hs = heap ? (.42 * Math.sin(Math.PI * e) + .07) * pulse * (.85 + .3 * ih(Math.floor(u * 40), Math.floor(flowS * 2))) : 0;
        const hT = Math.max(body ? top + .14 : 0, hs * 1.8), ya = Math.max(y0, Math.floor((Y0 - hT * w) / PX)), yb = veil || heap ? y1 : Math.min(y1, Math.ceil((Y0 - bot * w) / PX));
        const sb = .8 * Math.sin(d * 3.1 + j.Z), s = d * 10 - flowS, mouth = d < .14, br = d > dBot ? (d - dBot) / Math.max(.05, dTop - dBot) : 0, ucol = Math.floor(u / fp / 2), uL = (((u + 4) * lsc) | 0) & 63, bndV = Math.floor(d * 26);
        for(let yy = ya; yy <= yb; yy++){ const h = (Y0 - (yy + .5) * PX) * iw, bay = BAY4[(yy & 3) * 4 + (xx & 3)];
          let ci = -1;
          if(body && h <= top && h >= bot){
            // the jet: aerated water, bright, in streaks along the flow; a white mouth at the glass; a lit top, a shaded underside
            const v = (h - c) / t, bb = (v * .5 + .5) * 8 + sb, bi = Math.floor(bb), bf = bb - bi, hb = ih(bi + 40, Math.floor(s * .5 + bi * .37));
            ci = hb > .6 ? 6 : hb > .25 ? 5 : 4;
            if(bf < .22) ci = hb > .5 ? 4 : 3;
            if(v < -.45) ci = Math.max(2, ci - 2); else if(v > .45 && ci < 6) ci++;
            if(v > -.1){ const fl = LT[((((s * lsc * .06 + v * 9) | 0) & 63) << 6) + ((((v * 2.3 + d * .7) * lsc * .1) | 0) & 63)]; if(fl < .05 + .08 * v) ci = fl < .04 ? 8 : 7; }   // whitewater lace riding the jet
            if(mouth){ if(d < .1 + .06 * hb && bf > .3) ci = hb > .4 ? 8 : 7; if(ih(Math.floor(h / fp / 2), Math.floor(flowS * 4) + ucol) < (.14 - d) / .14 * .8) ci = -1; }
            if(h > top - fp * 1.2) ci = 9; else if(h > top - fp * 2.3) ci = 8; else if(h < bot + fp * 1.5 && bot > 0) ci = 3;
            // ragged edges: the lace of the surface tears the silhouette
            if(v > .78 || v < -.82){ const lv = LT[((((h * lsc + flowS * 6) | 0) & 63) << 6) + uL]; if(lv > .55) ci = -1; else if(lv > .4) ci = 7; }
            // breaking up past the underside's landing: droplets
            if(br > 0 && ci >= 0 && ih(ucol + 99, Math.floor(h / fp / 2) + Math.floor(s * .5)) < br * .5) ci = br > .55 && bay < 8 ? 7 : -1;
            if(back && ci >= 0) ci = Math.min(8, ci + 1);   // the top surface, seen behind the face: a step lighter
          }
          else if(veil && h < bot && h >= 0){
            // the veil: sheets falling off the underside (bands that sag and darken as they fall, gaps where the tube shows, refracted)
            const fall = 1 - h / Math.max(.01, bot), bnd = bndV + (h * 9 + d * 4 > 0 && Math.sin(h * 9 + d * 4) > .6 ? 1 : 0), hv = ih(bnd + 7, j.Z);
            if(hv > .28 && ih(bnd, Math.floor(h * 16 + flowS * 1.4)) > .3 + fall * .25) ci = fall < .3 ? 6 : fall < .7 ? 5 : 4;
            else if(hv > .28 && bay < 3) ci = 4;
            if(h < .05 + .04 * hv) ci = bay < 10 ? 7 : 8;   // where it hits the floor
          }
          if(ci === -1 && heap && h < hs * 1.8){   // the landing heap: whitewater, its top torn into lace and mist
            const lv = LT[((((h * lsc - flowS * 8) | 0) & 63) << 6) + uL];
            if(h <= hs){ ci = lv < .22 ? 9 : lv < .45 ? 8 : h < hs * .3 ? 5 : 7; if(h > hs - fp * 1.2) ci = 9; }
            else if(bay < 16 * (1 - (h - hs) / (hs * .8)) * .45) ci = lv < .3 ? 8 : 6; }
          if(ci === -1 && body && h > top && h < top + .14 && ih(Math.floor(u / fp), Math.floor(h / fp) + Math.floor(flowS * 3)) > .955) ci = 7;   // spray off the top
          if(ci === -1) continue;
          JU[(yy - by0) * JW + xx - bx0] = T[pb + ci]; } } }
    // the veil's refraction. A canvas snapshot per torrent cost ~3 ms a frame in the software path, so the light behind the veil is redrawn
    // instead: the tube's own lines that run behind it (the far window sills' cyan light, the kerb's LED line in the wet floor), broken into
    // columns that waver as the sheets fall, inside the veil's outline
    if(veilOK){ const [, X0, Y0, w] = front, A = projZ(j.Z + 4), ax = A ? A.x : 0, ay = A ? A.y : 0, aw = A ? A.w : 0, Bq = A && projZ(Math.min(j.Z + 60, pSeg() + DRAW - 2));
      if(A && Bq){ const bx = Bq.x, by = Bq.y, bwq = Bq.w; cx.save(); cx.beginPath(); const N = 14; cx.moveTo(X0 + sd * UG * w, Y0);
        for(let i = 0; i <= N; i++){ const d = dBot * i / N, c = .9 + .1 * d - k * d * d, t = (.36 + .14 * d) * pulse; cx.lineTo(X0 + sd * (UG - d) * w, Y0 - Math.max(0, c - t) * w); } cx.lineTo(X0 + sd * (UG - dBot) * w, Y0); cx.closePath(); cx.clip();
        cx.globalAlpha = .3; cx.fillStyle = '#0e5262'; cx.fillRect(Math.min(X0 + sd * UG * w, X0 + sd * (UG - dBot) * w), Y0 - .6 * w, dBot * w + PX, .6 * w + PX); cx.globalAlpha = 1;
        const amp = (reduce ? 1 : 2) * PX, xs = Math.min(X0 + sd * UG * w, X0 + sd * (UG - dBot) * w), xe = xs + dBot * w;
        for(const [hh, uu, col] of [[.46, 1.68, '#56c4f0'], [0, 1.0, '#7ac8d8'], [.03, .78, '#3a8a9a']]){ const p0x = ax + sd * uu * aw, p0y = ay - hh * aw, p1x = bx + sd * uu * bwq, p1y = by - hh * bwq; if(Math.abs(p1x - p0x) < 1) continue; cx.fillStyle = col;
          for(let x = snp(xs); x < xe; x += PX * 3){ const t = (x - p0x) / (p1x - p0x); if(t < 0 || t > 1) continue; const y = p0y + (p1y - p0y) * t + Math.round(Math.sin(x / PX * .55 + tf * 8)) * amp; cx.fillRect(x - sd * PX * (1 + Math.round(Math.sin(x / PX * .23 - tf * 5))), snp(y), PX * 3, PX); } }
        cx.restore(); } }
    if(jF !== DRAWN){ jF = DRAWN; JSL.fill(0); } let bk = 0; while(bk < 3 && (bw > JB[bk][0] || bh > JB[bk][1])) bk++; const JCk = JCS[bk][JSL[bk] % JB[bk][2]], JGk = JGS[bk][JSL[bk] % JB[bk][2]]; JSL[bk]++; JGk.putImageData(JI, 0, 0, 0, 0, bw, bh); cx.imageSmoothingEnabled = false; cx.drawImage(JCk, 0, 0, bw, bh, bx0 * PX, by0 * PX, bw * PX, bh * PX);
    // the light it throws: cold, on the road under it and the wall it came from
    if(front[3] > W * .03 && front[3] < W * .6){ const w = front[3], lx = front[1] + sd * (UG - dEnd * .55) * w; pool(lx, front[2] - w * .25, Math.min(H * .22, w * .9), '90,216,255', .1 * g); }
    if(window.ASSIST && ASSIST.contrast && front[3] > W * .03){ const w = front[3], a = front[1] + sd * 1.5 * w, b2 = front[1] + sd * (UG - dEnd) * w, hy = Math.max(PX, snp(w * .03)); for(let q = 0; ; q++){ const x = Math.min(a, b2) + q * hy * 2; if(x > Math.max(a, b2)) break; cx.fillStyle = q % 2 ? '#101010' : '#ffd23a'; pxRect(x, front[2] + PX, hy * 2, hy); } } }

  // a pane of the observation glass (one bay, drawn here rather than through env/aqua.js's window rings: their sea is a pattern fill, and
  // even four short bays cost ~3 ms at p95): the murky sea in three stepped bands lit from far above, a slanting shaft, marine snow,
  // the steel head and sill with the sill's cyan lamp, a mullion at each end. Strip j..j+1 of it (drawn in segment j, as the crack).
  const PB = [[WT - .02, 1.42, '#1e6670'], [1.42, 1.57, '#134a58'], [1.57, WB, '#0a2e3a']];
  function drawPane(p, c, j, fog){ const e = j - c.Z; if(e < -4 || e >= 4) return; const A = projZ(j); if(!A) return; const ax = A.x, ay = A.y, aw = A.w, Bq = projZ(j + 1); if(!Bq) return; const bx = Bq.x, by = Bq.y, bwq = Bq.w, sd = c.sd;
    const q = (a0, a1, col) => { const [x0, y0] = wallPt(ax, ay, aw, sd * a0), X0 = x0, Y0 = y0, [x1, y1] = wallPt(ax, ay, aw, sd * a1), X1 = x1, Y1 = y1, [x2, y2] = wallPt(bx, by, bwq, sd * a1), X2 = x2, Y2 = y2, [x3, y3] = wallPt(bx, by, bwq, sd * a0); poly(X0, Y0, X1, Y1, X2, Y2, x3, y3, col); };
    for(const [a0, a1, col] of PB) q(a0, a1, fc(col, fog));
    if(aw > W * .02){ if((j * 3 + 1) % 5 < 2) q(1.30, 1.36, fc('#3a8a90', fog)); if(H1(j * 7.3) > .55) q(1.45 + H1(j) * .1, 1.465 + H1(j) * .1, fc('#5aa8ac', fog)); }   // a shaft of light, marine snow
    q(WT - .05, WT - .02, fc('#0a1018', fog)); q(WB, WB + .03, fc('#0a1018', fog)); q(WB - .015, WB, fog > .5 ? fc('#3a9ac8', fog) : '#56c4f0');
    if(e === -4 || e === 3){ const P2 = e === -4 ? A : Bq, [mx0, my0] = wallPt(e === -4 ? ax : bx, e === -4 ? ay : by, e === -4 ? aw : bwq, sd * (WT - .05)), MX = mx0, MY = my0, [, my1] = wallPt(e === -4 ? ax : bx, e === -4 ? ay : by, e === -4 ? aw : bwq, sd * (WB + .03)); cx.fillStyle = fc('#0a1018', fog); pxRect(snp(MX) - PX, snp(MY), Math.max(PX * 2, snp((e === -4 ? aw : bwq) * .05)), snp(my1 - MY)); } }

  // the burst pane: the glass gone, broken teeth round the frame, white water boiling out of the hole (drawn per strip, as the crack)
  function drawHole(p, c, j, fog, ps, now){ const sd = c.sd; { const e = j - c.Z, z = j; if(e < -3 || e >= 3) return; const A = projZ(z); if(!A) return; const ax = A.x, ay = A.y, aw = A.w, Bq = projZ(z + 1); if(!Bq) return;
      const [x0, yt0] = wallPt(ax, ay, aw, sd * WT), [, yb0] = wallPt(ax, ay, aw, sd * WB), x0b = x0; const xt1 = Bq.x + sd * RR * Bq.w * Math.sin(WT), yt1 = Bq.y - CY * Bq.w - RR * Bq.w * Math.cos(WT), yb1 = Bq.y - CY * Bq.w - RR * Bq.w * Math.cos(WB);
      // churning whitewater filling the opening
      const n = Math.max(2, Math.round(Math.abs(yb0 - yt0) / PX)), cA = fc('#e8fbff', fog * .5), cB = fc('#7ac4d0', fog * .5), cC = fc('#2a7486', fog * .5);
      for(let i = 0; i < n; i++){ const t = i / n, ya = yt0 + (yb0 - yt0) * t, yb = yt1 + (yb1 - yt1) * t, hh = ih(i + Math.floor(Tg * 14) * 3, e + 9); cx.fillStyle = hh > .55 ? cA : hh > .25 ? cB : cC; poly(x0b, ya, xt1, yb, xt1, yb + PX, x0b, ya + PX, cx.fillStyle); }
      // the teeth: glass left in the frame at the top and bottom edges
      if(aw > W * .04){ cx.fillStyle = fc('#bff0ff', fog * .4); for(let q = 0; q < 4; q++){ const t = (q + .5) / 4, xx = x0b + (xt1 - x0b) * t, tl = Math.max(PX, snp(aw * (.03 + .04 * H1(c.Z + e * 3 + q)))); pxRect(snp(xx), snp(yt0 + (yt1 - yt0) * t), PX, tl); pxRect(snp(xx + PX), snp(yb0 + (yb1 - yb0) * t) - tl, PX, tl); } } } }

  // ---------------------------------------------------------------- the rotating lamp on the wall: a red dome, its reflector flaring as it faces you
  function drawLamp(p, b, fog, now){ const P = projZ(b.Z); if(!P || P.w < 3) return; const lv = lampLv(p, b), [lx, ly] = wallPt(P.x, P.y, P.w, b.sd * 1.84), r = Math.max(PX, snp(P.w * .07)), al = 1 - fog * .6;
    const th = Tg * 6.9 + b.ph, still = reduce || (window.ASSIST && ASSIST.noFlash);
    // the bracket: a dark plate on the wall with a lit top edge
    cx.fillStyle = fc('#0a0d12', fog * .5); pxRect(lx - r * 1.3, ly, r * 2.6, Math.max(PX, snp(r * .5))); if(r > PX * 2){ cx.fillStyle = fc('#5a6a78', fog * .5); pxRect(lx - r * 1.3, ly, r * 2.6, PX); }
    // the dome: a red half-ellipse, the turning reflector a bright band crossing it, a specular pixel on top
    const n = Math.max(1, Math.round(r * 1.2 / PX)), hx0 = still ? 0 : Math.sin(th) * r * .55, face = still ? .5 : Math.max(0, Math.cos(th));
    for(let i = 0; i < n; i++){ const t = (i + .5) / n, hw = r * Math.sqrt(Math.max(0, 1 - t * t)), yy = snp(ly - (i + 1) * PX); if(hw < PX * .5) continue;
      cx.fillStyle = fc(i === 0 ? '#5a0a10' : '#b8121a', fog * .4); pxRect(snp(lx - hw), yy, Math.max(PX, snp(hw * 2)), PX);
      if(r > PX * 1.5){ cx.fillStyle = face > .6 ? '#ffd8c8' : face > .25 ? '#ff7a5a' : fc('#e0302a', fog * .3); pxRect(snp(lx + hx0 * (1 - t * .5) - PX / 2), yy, Math.max(PX, snp(r * .35 * (1 - t * .4))), PX); } }
    if(r > PX * 2){ cx.fillStyle = '#ffe8e0'; pxRect(snp(lx - r * .35), snp(ly - n * PX), PX, PX); }
    if(fog < .9 && P.w > W * .025){ pool(lx, ly - r * .6, Math.min(H * .1, Math.max(PX * 4, P.w * (.18 + .3 * lv))), '255,42,26', (.1 + .35 * lv) * al);
      // the beam crossing the tube when it faces you: a short horizontal flare
      if(lv > .7 && P.w > W * .03){ cx.globalAlpha = (lv - .7) * 2 * al; cx.fillStyle = '#ff6a50'; pxRect(snp(lx - P.w * .4), snp(ly - r * .5), snp(P.w * .8), PX); cx.globalAlpha = 1; }
      // and its red mirrored in the wet floor below, a column of broken dashes
      if(P.w > W * .035){ const fx = P.x + b.sd * 1.05 * P.w, n = 6; cx.globalCompositeOperation = 'lighter'; for(let i = 0; i < n; i++){ const v = i / n, yy = snp(P.y - P.w * .02 + v * P.w * .55), ww = Math.max(PX, snp(P.w * .1 * (1 - v * .5) * (.6 + .5 * H1(b.Z + i * 3.1 + Math.floor(Tg * .8))))); cx.globalAlpha = (.18 + .4 * lv) * (1 - v) * al; cx.fillStyle = v < .3 ? '#ff7a5a' : '#c81e1e'; pxRect(snp(fx - ww / 2), yy, ww, PX); } cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; } } }

  // ---------------------------------------------------------------- caustics: the water's light network rippling on the lower walls
  function caustic(p, s, L, fog){ if(L < .18 || fog > .6) return; const a = s.p1.screen, b = s.p2.screen; if(a.w < W * .04) return;
    const j = s.index, tt = reduce ? Tg * .3 : Tg, lw = a.w > W * .3 ? PX * 2 : PX, cHi = fc(L > .5 ? '#6ad0d8' : '#3a98a4', fog), cLo = fc('#2a7a88', fog);
    for(const sd of [-1, 1]) for(let k = 0; k < 3; k++){ if(ih(j * 3 + k, Math.floor(tt * 2.2 + k * .7 + sd)) < .4) continue;
      const hA = .05 + .1 * k + .035 * Math.sin(j * .7 + tt * 3.1 + k * 2 + sd), hB = .05 + .1 * k + .035 * Math.sin((j + 1) * .7 + tt * 3.1 + k * 2 + sd);
      const aA = Math.acos(clamp((hA - CY) / RR, -1, 1)), aB = Math.acos(clamp((hB - CY) / RR, -1, 1)), [x0, y0] = wallPt(a.x, a.y, a.w, sd * aA), x0c = x0, y0c = y0, [x1, y1] = wallPt(b.x, b.y, b.w, sd * aB);
      cx.fillStyle = k ? cLo : cHi; cx.fillRect(snp(Math.min(x0c, x1)), snp((y0c + y1) / 2), Math.max(PX, snp(Math.abs(x1 - x0c))), lw); } }

  // ---------------------------------------------------------------- the flood gate (防水扉): two steel leaves sliding in from the walls
  // Studied: Tokyo Metro's tunnel watertight gates and station flood doors (heavy ribbed steel leaves in a frame, yellow and black hazard
  // edges, rotating red lamps on the frame; they shut whole sections of tunnel). Seen face-on: the leaves are planes at the gate's ring.
  const gateGap = (g, ps) => { const d = g.Z - ps; return d <= 0 ? g.gw0 * clamp(1 + d / 6, 0, 1) : g.gw0 + (1.5 - g.gw0) * sm((d - 6) / 234); };
  function drawGate(p, g, fog, now, ps){ const P = projZ(g.Z); if(!P || P.cz < 360) return; const X0 = P.x, Y0 = P.y, w = P.w; if(w < 2) return;
    const gw = gateGap(g, ps), xg = g.xg, F = c => fc(c, fog * .8), red = BCN.on ? (reduce || (window.ASSIST && ASSIST.noFlash) ? .4 : .3 + .7 * Math.max(0, Math.cos(Tg * 6.9 + 1.1))) : 0, rq = red > .7 ? 2 : red > .4 ? 1 : 0;
    const steel = ['#07090e', '#141c26', '#223040', '#344a5c', '#5e7c90', rq ? '#d06a5a' : '#9ab4c4'].map(F);
    const cxC = X0, cyC = Y0 - CY * w, rC = RR * w * .995;
    // everything stays inside the tube's circle: each row of plate is cut to the circle's chord there (no clip path: a clip cost ~1 ms here)
    const chord = y => { const dy = y - cyC; return rC * rC > dy * dy ? Math.sqrt(rC * rC - dy * dy) : 0; }, yTop = x => cyC - chord2(x), chord2 = x => { const dx = x - cxC; return rC * rC > dx * dx ? Math.sqrt(rC * rC - dx * dx) : 0; };
    const top = Y0 - (CY + RR) * w, xL1 = X0 + (xg - gw) * w, xR0 = X0 + (xg + gw) * w;
    // the leaves: ribbed panels (a lit top line on each rib, its shadow under), seams, rivets where the leaf is big enough
    const leaf = (xa0, xb0, edge, sdE) => { if(xb0 - xa0 < PX * .5) return; const ribH = .26 * w, nR = Math.ceil((Y0 - top) / ribH), big = w > W * .12;
      for(let r = 0; r < nR; r++){ const ya = Y0 - (r + 1) * ribH, hx = Math.min(chord(ya), chord(ya + ribH)), xa = Math.max(xa0, cxC - hx, -PX), xb = Math.min(xb0, cxC + hx, W + PX), lw = xb - xa; if(lw < PX * .5) continue; const tone = r % 2 ? 2 : 3;
        cx.fillStyle = steel[tone]; pxRect(snp(xa), snp(ya), snp(lw) + PX, snp(ribH) + PX);
        // the plate darkens toward its foot (the rib above shades it); grime runs down from the rib in streaks
        cx.fillStyle = steel[tone - 1]; pxRect(snp(xa), snp(ya + ribH * .78), snp(lw) + PX, snp(ribH * .22));
        if(big){ cx.fillStyle = steel[1]; for(let q = 0; q < 7; q++){ const gx = edge - sdE * w * (.1 + q * .23 + .08 * H1(r * 7 + q)); if(gx < xa || gx > xb) continue; pxRect(snp(gx), snp(ya + PX * 2), PX, snp(ribH * (.3 + .5 * H1(r * 3 + q * 5)))); } }
        // the rib: a lit top line, a dark shadow line under it
        cx.fillStyle = steel[5]; pxRect(snp(xa), snp(ya), snp(lw) + PX, PX); cx.fillStyle = steel[0]; pxRect(snp(xa), snp(ya) + PX, snp(lw) + PX, big ? PX * 2 : PX);
        if(w > W * .2){ cx.fillStyle = steel[4]; const st = Math.max(PX * 3, snp(w * .07)); for(let x = snp(edge - sdE * w * .2); sdE > 0 ? x > xa : x < xb; x -= sdE * st){ if(x < -PX || x > W) continue; pxRect(x, snp(ya) + PX * 3, PX, PX); } } }
      // vertical seams every 0.45, measured from the moving edge (so they slide with it)
      for(let k = 1; k < 6; k++){ const sx = edge - sdE * k * .45 * w; if(sx < xa0 || sx > xb0 || sx < -PX || sx > W) continue; const yt = Math.max(0, yTop(sx)); cx.fillStyle = steel[0]; pxRect(snp(sx), snp(yt), big ? PX * 2 : PX, snp(Y0 - yt)); if(big){ cx.fillStyle = steel[4]; pxRect(snp(sx) + PX * 2, snp(yt), PX, snp(Y0 - yt)); } }
      // the leading edge: hazard stripes (yellow and black, slanting), a rubber seal, a lit rim
      const ew = Math.max(PX * 2, snp(.12 * w)), ex0 = sdE > 0 ? edge - ew : edge, sh = Math.max(PX * 2, snp(.1 * w)), et = Math.max(-sh, yTop(edge) + ew * .5);
      for(let k = 0; et + k * sh < Y0; k++){ const y0 = et + k * sh, y1 = Math.min(Y0, y0 + sh); cx.fillStyle = F(k & 1 ? '#16120a' : rq ? '#ffb02a' : '#f2c22a'); poly(ex0, y0, ex0 + ew, y0 - ew * .5, ex0 + ew, y1 - ew * .5, ex0, y1, cx.fillStyle); }
      const ys = Math.max(0, yTop(edge)); cx.fillStyle = F('#05070a'); pxRect(snp(edge) - (sdE > 0 ? PX : 0), snp(ys), PX, snp(Y0 - ys)); cx.fillStyle = F('#c8d4dc'); pxRect(snp(edge) - (sdE > 0 ? PX * 2 : -PX), snp(ys), PX, snp(Y0 - ys));
      // amber lamps up the leading edge, blinking in turn: they mark the gap
      const on = reduce || Math.floor(Tg * 3) % 2 === (sdE > 0 ? 0 : 1), lr = Math.min(PX * 4, Math.max(PX, snp(w * .045))); for(const hh of [.35, 1.0, 1.65]){ const ly = Y0 - hh * w, lx = edge - sdE * (ew + lr * 1.5); if(ly < yTop(lx)) continue; cx.fillStyle = on ? '#ffd27a' : F('#5a3a10'); pxRect(snp(lx - lr / 2), snp(ly), lr, lr); if(on && fog < .9) pool(lx, ly, Math.min(H * .12, Math.max(PX * 4, w * .2)), '255,160,32', .3 * (1 - fog)); }
      // 防水扉 stencilled on the leaf when it is big enough to read
      if(w > W * .16 && fontOK()){ const px2 = Math.floor(clamp(w * .16, 12, 64)), lx = edge - sdE * w * .55; if(lx > -W * .1 && lx < W * 1.1){ cx.font = px2 + 'px DotGothic16, monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = F('#e8b828');
        ['防', '水', '扉'].forEach((ch, i) => cx.fillText(ch, Math.round(lx), Math.round(Y0 - w * (1.3 - i * .2)))); cx.textAlign = 'left'; cx.textBaseline = 'alphabetic'; } } };
    leaf(X0 - 2 * w, xL1, xL1, 1); leaf(xR0, X0 + 2 * w, xR0, -1);
    // the gate's frame round the tube: a heavy steel band, a sill across the road, red lamps on the frame
    cx.strokeStyle = steel[1]; cx.lineWidth = Math.max(PX, w * .1); cx.beginPath(); for(let i = 0; i <= 24; i++){ const a = -Math.acos(-CY / RR) + 2 * Math.acos(-CY / RR) * i / 24; const px = cxC + rC * .97 * Math.sin(a), py = cyC - rC * .97 * Math.cos(a); i ? cx.lineTo(px, py) : cx.moveTo(px, py); } cx.stroke();
    cx.fillStyle = F('#2a2a24'); pxRect(snp(X0 - OW * w), snp(Y0 - w * .02), snp(OW * 2 * w), Math.max(PX, snp(w * .025)));
    for(const sx of [-.8, .8]){ const lx = X0 + sx * w, ly = Y0 - 2.12 * w, r = Math.max(PX, snp(w * .07)), lv = red; cx.fillStyle = lv > .6 ? '#ffd0c0' : '#e0281e'; pxRect(snp(lx - r / 2), snp(ly), r, r); if(fog < .9) pool(lx, ly, Math.max(PX * 5, w * (.3 + .5 * lv)), '255,42,26', (.15 + .35 * lv) * (1 - fog)); }
    // the dry side through the gap: steady white light
    if(gw > .05 && fog < .9){ pool(X0 + xg * w, Y0 - w * .7, Math.min(H * .4, w * (gw * 1.2 + .3)), '232,248,255', .16 * (1 - fog)); const gx0 = X0 + (xg - gw) * w, gx1 = X0 + (xg + gw) * w, sp = Math.min(H - Y0, w * 1.2); if(sp > PX * 2){ cx.globalCompositeOperation = 'lighter'; for(const [k2, a2] of [[1, .07], [.6, .07]]){ cx.fillStyle = rgbaA('200,240,255', a2 * (1 - fog)); cx.beginPath(); cx.moveTo(gx0 + (gx1 - gx0) * (1 - k2) / 2, Y0); cx.lineTo(gx1 - (gx1 - gx0) * (1 - k2) / 2, Y0); cx.lineTo(X0 + xg * w + (gx1 - gx0) * k2 * 1.4, Y0 + sp); cx.lineTo(X0 + xg * w - (gx1 - gx0) * k2 * 1.4, Y0 + sp); cx.closePath(); cx.fill(); } cx.globalCompositeOperation = 'source-over'; } } }
  const fontOK = () => { try{ return document.fonts.check('16px DotGothic16'); }catch(e){ return true; } };

  // ---------------------------------------------------------------- particles (world: z segments, x and h half-road widths), pooled
  const WPp = []; for(let k = 0; k < 220; k++) WPp.push({ on:false, z:0, x:0, h:0, vx:0, vh:0, vz:0, t:0, life:0, k:0 });
  let rs = 29; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  function emit(z, x, h, n, sp, up, kind, vz){ for(let k = 0; k < n; k++){ let q = null; for(const d of WPp) if(!d.on){ q = d; break; } if(!q) return; const a = rnd() * 6.283, v = sp * (.4 + rnd() * .8);
      q.on = true; q.z = z + (rnd() - .5) * 2; q.x = x + (rnd() - .5) * .1; q.h = h; q.vx = Math.cos(a) * v; q.vz = (vz || 0) + Math.sin(a) * v * 4; q.vh = up * (.5 + rnd()); q.t = 0; q.life = kind === 1 ? .9 + rnd() * .6 : .5 + rnd() * .6; q.k = kind; } }
  function stepP(dt){ for(const q of WPp){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.vh -= 3.6 * dt; if(q.h < 0){ q.h = 0; q.vh *= -.2; q.vx *= .4; q.vz *= .4; if(q.k !== 1) q.life = Math.min(q.life, q.t + .06); } } }
  function drawP(s, q, fog){ const P = projZ(q.z); if(!P || P.cz < 300) return; const sz = Math.max(PX, snp(P.w * (q.k === 1 ? .012 : .01))), x = snp(P.x + q.x * P.w), y = snp(P.y - q.h * P.w);
    if(q.k === 1){ cx.fillStyle = Math.floor(Tg * 20 + q.z) % 2 ? '#e8fbff' : '#4a8a9a'; cx.fillRect(x, y, sz, sz); return; }
    cx.fillStyle = fc(q.t / q.life < .4 ? '#e4f8f6' : '#7ab8c4', fog * .5); cx.fillRect(x, y, sz, sz); if(q.vh < -.4) cx.fillRect(x, y - sz, sz, sz); }

  // ---------------------------------------------------------------- the rooster tail and wake from your tyre (screen space), pooled
  const RT = []; for(let k = 0; k < 160; k++) RT.push({ on:false, x:0, y:0, vx:0, vy:0, t:0, life:0, c:0 });
  function tyreSpray(dt, L, sp){ const bs = Math.min(W * .2, H * .27), n = reduce ? Math.round(L * sp * 4) : Math.round(L * sp * 13 + (rnd() < L * sp * 13 % 1 ? 1 : 0));
    for(let k = 0; k < n; k++){ let q = null; for(const d of RT) if(!d.on){ q = d; break; } if(!q) break; const side = rnd() < .5 ? -1 : 1, centre = rnd() < .22;
      q.on = true; q.x = W / 2 + side * bs * (.02 + rnd() * .05); q.y = H - 8 - bs * .02; q.vx = centre ? side * bs * rnd() * .25 : side * bs * (.7 + rnd() * 1.1) * (.6 + L * .6); q.vy = -bs * (centre ? 1.6 + rnd() * 1.2 : .9 + rnd() * 1.3) * (.5 + L * .7); q.t = 0; q.life = centre ? .2 + rnd() * .12 : .3 + rnd() * .3; q.c = centre ? 1 : 0; }
    for(const q of RT){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vy += bs * 5.5 * dt; } }
  function drawTyre(){ for(const q of RT){ if(!q.on) continue; const u = q.t / q.life, x = snp(q.x), y = snp(q.y); cx.fillStyle = u < .3 ? '#f0fcff' : u < .65 ? '#9ad8e0' : '#3e8494'; cx.fillRect(x, y, PX, PX); if(Math.abs(q.vy) > Math.min(W * .2, H * .27) * .8) cx.fillRect(x, y + PX, PX, PX); } }

  // ---------------------------------------------------------------- the bike lit by the lamps: a red rim on top and toward the nearer lamp, cold light from the water underneath
  const UBW = 192; let UB = null, UGc = null, UB2 = null, UG2 = null;
  function rimLight(p, now, ps, L){ if(!UB || BIKE.hidden || !ENV.bikes || !ENV.bikes.render || !ENV.bikes._cur) return; let f = 0, sg = 1;
    if(BCN.on) for(const b of p.beacons){ const dz = b.Z - ps; if(dz < -6 || dz > 22) continue; const v = lampLv(p, b) * (1 - Math.abs(dz - 8) / 16); if(v > f){ f = v; sg = b.sd; } }
    if(f < .5) return;   // (only as a lamp's beam swings past: the re-render is not free)
    const bs = Math.min(W * .2, H * .27), kk = Math.max(PX, Math.round(bs / 30 / PX) * PX), bx = W / 2, by = H - 8 - AIR.h, id = BIKE.id || 'sport', half = UBW * PX / 2, ox = snp(bx - half), oy = snp(by - UBW * PX + 4 * PX);
    UGc.setTransform(1, 0, 0, 1, 0, 0); UGc.clearRect(0, 0, UBW, UBW); UGc.setTransform(1 / PX, 0, 0, 1 / PX, -ox / PX, -oy / PX); UGc.imageSmoothingEnabled = false;
    UGc.save(); UGc.beginPath(); UGc.rect(ox, oy, UBW * PX, by - oy - PX * 2); UGc.clip();
    try{ ENV.bikes.render(UGc, id, bx, by, kk, leanV, now, null, ENV.bikes._cur()); }catch(e){ UGc.restore(); return; }
    UGc.restore(); UGc.setTransform(1, 0, 0, 1, 0, 0);
    // the edge facing up and toward the lamp: pixels with nothing above them on that side
    const G2 = UG2; G2.globalCompositeOperation = 'source-over'; G2.clearRect(0, 0, UBW, UBW); G2.drawImage(UB, 0, 0); G2.globalCompositeOperation = 'destination-out'; G2.drawImage(UB, -sg, 1); G2.globalCompositeOperation = 'source-in'; G2.fillStyle = f > .8 ? '#ff7a62' : '#e8382a'; G2.fillRect(0, 0, UBW, UBW); G2.globalCompositeOperation = 'source-over';
    cx.imageSmoothingEnabled = false; cx.globalAlpha = f > .8 ? .95 : .7; cx.drawImage(UB2, 0, 0, UBW, UBW, ox, oy, UBW * PX, UBW * PX); cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- sound (the core's synth helpers)
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  const bus = () => (DIR && DIR.bus && DIR.bus()) || null;
  function siren(){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(960, .42, { type:'square', v:.011, at:t0 }); M.tone(770, .42, { type:'square', v:.011, at:t0 + .5 }); }
  function creak(v){ if(!ac()) return; const t0 = M.ac.currentTime; [2400, 2100, 2650, 1900].forEach((f, k) => M.tone(f, .05, { type:'sine', v:.012 * v, at:t0 + k * .07 + rnd() * .03 })); for(let k = 0; k < 3; k++) M.noise(.03, 4200, .05 * v, t0 + .1 + k * .06); }
  function burst(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.8, 55, .28 * v, t0); M.tone(36, 1.2, { type:'sine', v:.18 * v, at:t0 }); M.noise(.08, 5200, .12 * v, t0); M.noise(2.4, 1800, .09 * v, t0 + .05); M.noise(2.2, 420, .1 * v, t0 + .1); }
  function roar(v){ if(!ac() || v < .02) return; const t0 = M.ac.currentTime; M.noise(1.1, 260, .07 * v, t0); M.noise(1.0, 2600, .03 * v, t0 + .05); M.noise(1.2, 70, .06 * v, t0); }
  function klaxon(){ if(!ac()) return; const t0 = M.ac.currentTime; for(let k = 0; k < 2; k++){ M.tone(220, .5, { type:'sawtooth', v:.022, at:t0 + k * .7 }); M.tone(233, .5, { type:'sawtooth', v:.018, at:t0 + k * .7 }); } M.noise(1.6, 160, .05, t0 + .2); }
  function slam(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.6, 48, .3, t0); M.tone(32, 1.4, { type:'sine', v:.2, at:t0 }); [142, 286, 431].forEach((f, k) => M.tone(f, 1.6 - k * .3, { type:'triangle', v:.03 / (k + 1), at:t0 + .01 })); M.noise(.4, 900, .06, t0 + .02); }

  // ---------------------------------------------------------------- the card
  function showCard(){ if(!DIR || !DIR.cine) return; let card = CARD;
    if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has(ID)){ try{ if(MECH.cutin.show(ID) !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
    if(card) DIR.cine({ letterbox:false, dur:1.5, card }); }

  // ---------------------------------------------------------------- the far end of the tube
  /* A long straight bore shows ~360 rings at once (a regular 200-ring bore shows ~100 to its exit), and env/aqua.js's ring faces cost about
     three times a regular bore's there. Past FARN rings ahead, inside this bore, the rings are not drawn: their opening is capped with the
     tube's own far haze (they are in the last fog steps, a few pixels across). Wrapped here; env/aqua.js is unchanged. */
  const FARN = 200, HAZE = '#0c1c26'; let wrapped = false, capF = -1;
  function wrapTube(){ const A = ENV.aqua; if(wrapped || !A || !A.drawTunnel) return; wrapped = true; const oT = A.drawTunnel;
    A.drawTunnel = function(s, x, y, uw, fog, now, fogc){ const p = cur; if(p && s && s.index >= p.B && s.index < p.B + LEN){ const ps = pSeg(); if(s.index > ps + FARN){
          if(capF !== DRAWN){ capF = DRAWN; const P = projZ(Math.floor(ps) + FARN + 1); if(P && P.w > 0){ const r = RR * P.w + PX, yc = P.y - CY * P.w; cx.fillStyle = fc(HAZE, .9); cx.beginPath(); cx.arc(P.x, yc, r, 0, 6.2832); cx.fill(); } }
          return; }
        // the road's own observation bay (rings 88..121 of any bore) would glaze this bore too; its rings are shown as rings 80 further on
        // (the same lamp, joint, tone and collar pattern), so the only glass here is this event's panes
        const k = s.index - p.B; if(k >= 86 && k < 124){ VS.index = s.index + 80; VS.p1 = s.p1; VS.p2 = s.p2; VS.land = s.land; VS.aqD1 = s.aqD1; VS.aqD2 = s.aqD2; VS.aqQuiet = 1; VS.stripe = s.stripe; VS.clip = s.clip; VS.mgPano = s.mgPano; return oT.call(this, VS, x, y, uw, fog, now, fogc); } }
      return oT.call(this, s, x, y, uw, fog, now, fogc); }; }
  const VS = { mgPano:null, index:0, tunnel:true, p1:null, p2:null, land:0, aqD1:0, aqD2:0, aqQuiet:1, stripe:0, clip:0, sprites:[] };

  // ---------------------------------------------------------------- the module
  let cur = null;
  MECH.sp_flood = {
    plans, CARD, LEN, ZG, combine, side, skips:() => WSK,
    // tests: the hazards ahead { id, z, x, r (half-width of what hits), landed (it is on the road and fixed) }
    hazards(ahead){ const ps = pSeg(), out = []; for(const p of plans){ if(p.off || p.done) continue;
        for(const j of p.jets){ if(j.Z < ps - 4 || j.Z > ps + (ahead || 150)) continue; const [x, r] = jetX(j); out.push({ id:j.id, z:j.Z + 3.5, z0:j.Z - 3, x, r, landed:j.burst && ps >= j.sb + 12 }); }
        const g = p.gate; if(g.Z >= ps - 1 && g.Z <= ps + (ahead || 150)){ const xl = g.xg - g.gw0, xr = g.xg + g.gw0; out.push({ id:'GL', z:g.Z + 1.5, x:(xl - 1.6) / 2, r:(xl + 1.6) / 2, landed:ps > g.Z - 234 }); out.push({ id:'GR', z:g.Z + 1.5, x:(xr + 1.6) / 2, r:(1.6 - xr) / 2, landed:ps > g.Z - 234 }); } }
      return out; },
    hits(){ let n = 0; for(const p of plans) n += p.hits; return n; },
    report(){ const p = plans[plans.length - 1]; if(!p) return null; return { B:p.B, m:p.m, hits:p.hits, burst:p.jets.map(j => j.burst ? 1 : 0).join(''), hitIds:p.jets.filter(j => j.hit).map(j => j.id).join(','), gateHit:p.gate.hit, slam:p.gate.slam, gap:+gateGap(p.gate, pSeg()).toFixed(2) }; },
    dbg(B, m){ const p = build(B, m || 1); plans.push(p); boreSet(B, B + LEN, true); return p; },
    warm(){ wrapTube(); buildTex(); for(let s = 0; s < 6; s++) CRK.push(buildCrack(s * 13 + 5));
      if(!JC){ JC = can(JW, JH); JGx = JC.getContext('2d'); JI = JGx.createImageData(JW, JH); JU = new Uint32Array(JI.data.buffer); for(const [bw2, bh2, n] of JB){ const A = [], G = []; for(let k = 0; k < n; k++){ const c = can(bw2, bh2); A.push(c); G.push(c.getContext('2d', { willReadFrequently:true })); } JCS.push(A); JGS.push(G); } }
      ensureW(cx.canvas.width, cx.canvas.height);
      if(!UB){ UB = can(UBW, UBW); UGc = UB.getContext('2d'); UB2 = can(UBW, UBW); UG2 = UB2.getContext('2d'); }
      try{ cx.save(); for(const c of [CTC, ...JCS.flat(), WC, UB, UB2]) if(c) cx.drawImage(c, 0, 0, 1, 1); cx.restore(); cx.clearRect(0, 0, PX * 2, PX * 2); }catch(e){}
      try{ palette(); }catch(e){} },
    reset(){ for(const p of plans){ if(p.cut){ p.cut.end(); p.cut = null; } p.on = false; p.lastPs = null; p.hits = 0; p.card = false; p.slammed = false; p.gate.hit = false; p.gate.slam = false; p.gate.klax = false; for(const j of p.jets){ j.hit = false; j.burst = false; } }
      for(const q of WPp) q.on = false; for(const q of RT) q.on = false; cur = null; BCN.on = false; },
    place(i, s, L){ if(i === 0){ for(const p of plans) if(p.cut && !p.nw) p.cut.end(); const keep = plans.filter(p => p.nw); plans.length = 0; plans.push(...keep); decided.clear(); lastI = -1; }   /* (a combined plan megalodon.js made for this ride, on this very segment, stays) */
      if(i <= lastI){ for(const p of plans) if(!p.off && (p.vk >= i || (p.di || 0) >= i)){ p.off = true; boreSet(p.B, p.B + LEN, false); decided.delete(p.vk); } for(const k of [...decided.keys()]) if(k + 2 >= i) decided.delete(k); }
      lastI = i; plan(i); for(const p of plans){ p.nw = false; if(!p.off && i >= p.B - 110 && i < p.B + LEN) lay(p, i, s); } },
    hitCar(){ const p = cur; if(!p) return false; const d = pSeg() - p.B; return d > -100 && d < END; },
    update(dt){ Tg += dt; stepP(dt); const ps = pSeg(), p = active(ps); cur = p; if(!p){ BCN.on = false; tyreSpray(dt, 0, 0); return; }
      const a = p.lastPs === null ? ps : p.lastPs, B = p.B, X = v => a < v && ps >= v; p.lastPs = ps; const play = state === 'play';
      frame(p, ps); BCN.on = ps >= (p.ab ? p.A0 : B - 40) && ps < p.gate.Z + 4;
      if(!p.swept && ps > B - 300){ p.swept = true; for(let j = B - 110; j <= B + END; j++) if(segs[j]) segs[j].hz = null; }
      if(play && !p.on && ps >= (p.ab ? p.A0 : B - 95) && ps < B + LEN){ p.on = true; if(DIR && DIR.cine) p.cut = DIR.cine({ id:ID, letterbox:{ top:.1, bottom:.06 }, duck:.45, shake:0, guard:{ from:B - 110, to:B + END }, dur:0 }); }
      if(play && !p.card && ps >= (p.ab ? p.P0b : B - 85) && ps < B + 60){ p.card = true; if(p.ab){ const A = MECH.arrival; if(A && A.callout) A.callout('FLOOD', { prio:3, kanji:'浸水', col:'#5ad8ff', size:'m' }); else floatText('浸水 FLOOD', W / 2, H * .3, 26, '#5ad8ff'); } else if(!QS.get('flnocard')) showCard(); }   /* (?flnocard: perf tests without the card) */
      // the siren, every second until the gate shuts
      if(ps >= (p.ab ? p.A0 : B - 60) && !p.slammed){ p.sirenT -= dt; if(p.sirenT <= 0){ p.sirenT = 1.05; siren(); } }
      // the cracks: creaks as they spread; jets spray from them; the pane goes
      for(const c of p.cracks){ if(X(c.s0) || X(c.s0 + 30) || X(c.s1 - 10)) creak(clamp(1.3 - (c.Z - ps) / 160, .3, 1));
        if(X(c.burst) && !c.jet){ burst(.7); if(p.cut && !reduce) p.cut.hit(4); for(let k = 0; k < (reduce ? 3 : 10); k++) emit(ps + 1 + rnd() * 3, c.sd * (1 + rnd() * .5), .2 + rnd() * .8, 1, .4, .8, 0, MAXS / SEG * 1.3); } }
      // the torrents burst (the first in slow motion: the establishing shot); glass shards and spray
      for(const j of p.jets){ if(!j.burst && ps >= j.sb){ j.burst = true; if(j.cut) cutJet(j, ps); if(X(j.sb)){ burst(1); emit(j.Z, j.sd * 1.55, .9, reduce ? 6 : 22, .5, .6, 1); emit(j.Z, j.sd * 1.4, .6, reduce ? 6 : 18, .6, 1.4, 0);
            if(p.cut && !reduce) p.cut.hit(5); } } }
      // the hero beat: slow motion as the first torrent looms beside you (34 segments out it fills half the frame)
      { const h1 = p.jets[0]; if(play && X(h1.Z - 34) && DIR && DIR.cine){ DIR.cine({ slowmo:{ scale:reduce ? .78 : .45, hold:.9 }, shake:reduce ? 0 : 4, dur:1.6 }); if(DIR.done && !p.ab) DIR.done(ID); } }
      // spray off each landing heap, and from its root
      p.spT = (p.spT || 0) - dt; if(p.spT <= 0){ p.spT = reduce ? .14 : .05; for(const j of p.jets){ const g = jetGrow(j, ps); if(g <= .5 || Math.abs(j.Z - ps) > 140 || j.Z < ps) continue; const G = jetGeo(j, g); emit(j.Z, j.sd * (UG - (G.dBot + G.dEnd) * .5), .25, 2, .5, 1.6, 0); } }
      // panes failing behind you: a boom, a jolt
      for(const q of p.src) if(q.behind && X(q.sb)){ burst(.55); if(p.cut && !reduce) p.cut.hit(3); }
      // the roar of the water, rising with the level where you are
      const Lr = Math.max(0, level(p, ps, ps)); p.wet = Lr; p.roarT -= dt; if(!p.slammed && p.roarT <= 0){ p.roarT = .9; roar(Lr * .9 + (ps > B + 160 ? .2 : 0)); }
      // the gate: the klaxon as it starts to close, the slam behind you
      const g = p.gate; if(!g.klax && ps >= g.Z - 250){ g.klax = true; klaxon(); }
      if(!g.slam && ps >= g.Z + 5){ g.slam = true; p.slammed = true; slam(); if(p.cut && !reduce) p.cut.hit(6); if(DIR && DIR.cine && !reduce && play) DIR.cine({ shake:6, dur:.6 }); }
      tyreSpray(dt, ps < g.Z ? Lr : 0, Math.min(1, speed / MAXS));
      // the hits: a torrent where you are as you pass it; the gate's leaves if you miss the gap
      if(play && cool <= 0 && AIR.h < 6){ const bw = bikeHalf() - HIT_GRACE;
        for(const j of p.jets){ if(j.hit || !j.burst || ps < j.sb + 12) continue; if(ps < j.Z - 3 || ps > j.Z + 3.5) continue; const [x, r] = jetX(j); if(Math.abs(playerX - x) > r + bw) continue;
          j.hit = true; if(j.twin) j.twin.hit = true; p.hits++; crash({ x, z:j.Z * SEG }); }
        if(!g.hit && ps >= g.Z - .5 && ps <= g.Z + 1.5 && Math.abs(playerX - g.xg) > g.gw0 - bw){ g.hit = true; p.hits++; crash({ x:playerX, z:g.Z * SEG }); } }
      if(ps > B + END - 10 && p.cut){ p.cut.end(); p.cut = null; }
      if(ps > B + END) p.done = true; },
    drawSegBack(s, sx0, sy0, uw, fog, now){ const p = cur; if(!p) return; const i = s.index; if(i < p.B - 6 || i > p.B + ZG + 2 || (p.ab && pSeg() < p.A0)) return;
      // the whole floor of water in one blit, from the farthest segment's hook (so everything nearer stands over it); this segment's clip
      // is lifted for it (each row was already clipped to its own segment when the rows were found)
      /* in the combined event (the mosasaur's vault is drawn over the same stretch) the water is rastered every other frame when its rows
         have not moved: the floor is re-blitted from last frame's raster (the road advances under it about a segment a frame) */
      if(DRAWN !== rowF){ rowF = DRAWN; rows(p); if(p.ab && (DRAWN & 1) && okW && Math.abs(R0 - wR0) <= 2 && Math.abs(R1 - wR1) <= 2 && BASEI - wB <= 2){ R0 = wR0; R1 = wR1; WSK++; } else { rasterWater(p, pSeg()); wR0 = R0; wR1 = R1; wB = BASEI; }   /* (a skipped frame blits last frame's rows where they were) */
        if(okW){ cx.restore(); try{ cx.imageSmoothingEnabled = false; cx.globalAlpha = 1; cx.drawImage(WC, 0, 0, cx.canvas.width, R1 - R0 + 1, 0, R0 * PX, cx.canvas.width * PX, (R1 - R0 + 1) * PX); } finally { cx.save(); cx.beginPath(); cx.rect(0, 0, W, s.clip); cx.clip(); } } } },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = cur; if(!p) return; const i = s.index, B = p.B, ps = pSeg(); if(i < B - 12 || i > B + LEN) return;
      if(i <= B + ZG){ const L = level(p, ps, i); if(L > 0) caustic(p, s, L, fog); }
      if(BCN.on) for(const b of p.beacons) if(b.Z === i) drawLamp(p, b, fog, now);
      for(const c of p.cracks){ if(!c.behind) drawPane(p, c, i, fog); if(ps < c.s0 || i < c.Z - 3 || i >= c.Z + 3) continue; if(ps < c.burst){ if(!c.noCrack) drawCrack(p, c, i, clamp((ps - c.s0) / (c.s1 - c.s0), 0, 1), fog, ps); if(ps > c.s0 + 30 && i === c.Z){ const C = CRK[c.seed % CRK.length]; for(let k = 0; k < 3; k++){ const e = C.ends[k * 3 % C.ends.length]; const aa = WT + e[1] / RR; needle(c.Z + e[0] * 10, c.sd, RR * Math.sin(aa), CY + RR * Math.cos(aa), 1.2 + k * .08, now, fog, clamp((ps - c.s0 - 30) / 40, .3, 1), c.Z + k); } } }
        else if(c.jet || ps < c.burst + 40) drawHole(p, c, i, fog, ps, now); }
      for(const l of p.leaks){ if(l.Z !== i || ps < l.s0 || ps > l.Z + 4) continue; const s0 = Math.sin(l.a); needle(l.Z, l.sd, RR * s0, CY + RR * Math.cos(l.a), l.land, now, fog, clamp((ps - l.s0) / 60, .25, 1), l.seed); }
      for(const q of WPp) if(q.on && Math.floor(q.z) === i) drawP(s, q, fog);
      for(const j of p.jets){ const ds = Math.max(Math.floor(j.Z - 3), Math.floor(ps) + 1); if(i === ds && ds <= j.Z + 3)drawJet(p, j, now, ps); }
      if(i === p.gate.Z)drawGate(p, p.gate, fog, now, ps); },
    drawScreen(now){ const p = cur; drawTyre(); if(!p) return; const ps = pSeg(); if(ps < p.gate.Z + 2) rimLight(p, now, ps, p.wet); } };
})();
