/* Sundown environment: Shuto C1 (環), the Inner Circular Route of the Shuto Expressway at night. See env/README.md for the hooks;
   study, rules and practice log in research/sundown-craft/shuto.md. Set piece: setpiece/screenfall.js.

   An elevated deck at office-tower third-to-fifth-floor height threading between towers in Ginza, Kyobashi, Kasumigaseki and Shinjuku.
   References inspected at pixel zoom (Wikimedia Commons; rules taken, nothing copied):
   - Edobashi JCT, inner loop and Route 6 sides (2005, 2013 photos): another route's deck crosses overhead on massive square piers and
     makes a dark "cave" with green signs hung on its fascia; the parallel ramp climbs beside you on its own piers; buildings stand a few
     metres off the parapet, their 4th-6th floors at eye level.
     -> the jct zone: a crossing deck (fascia, soffit with a row of sodium lights, piers), a ramp that climbs beside the road and crosses
        over it on the skew, signs on the fascia.
   - C1 near Kasumigaseki, Tanimachi JCT, Ginza, Kyobashi: a concrete parapet with a steel rail on top; sound walls of louvred panels with
     a pale translucent top band; tall single-arm lamp poles; green overhead signs with a white border, a white route badge (C1), kanji
     destination above romaji, a white arrow; red anti-skid paint and red/white chevron boards on the sharp bends; a solid yellow line.
     -> parapets ('con', 'snd', 'rail'), gantries, the red pavement where the bend is sharp, chevrons on the outside of the bend.
   - Shiodome C1 and Route 3 / Route 5 at night from above: the expressway is a sodium ribbon through the towers; office floors glow as
     whole horizontal bands of cool fluorescent white broken by mullions, with whole floors dark; red aviation lights on every roof.
     -> floor-by-floor lighting (a state per floor and per section, never per random window), red roof lights that blink slowly together.
   - Nishi-Shinjuku at night (Tocho, Sumitomo, Mitsui): slabs with dense regular window grids, lit windows white in bays; Tocho's twin
     crowned towers; Sumitomo's prism. Tokyo Tower at night: orange lattice, white main deck. -> the far skyline (backdrop()).
   - Nihonbashi under the expressway at night: white fascia panels with vertical seams, a row of lights on the soffit; Route 6 along the
     Sumida: the river wide and dark, far-bank lights laid on the water as long broken columns, lit bridges across it.
     -> the river zone: an open railing on one side, and below it the river with its bridges, boats and reflections.
   - Wangan Midnight / Tokyo Xtreme Racer (recalled, not inspected): sodium orange on concrete, green signs the only cool accent, the walls
     of the expressway close and continuous; Akira's Neo-Tokyo (recalled): towers of uncountable windows with red lights on top.
   Everything here is projected geometry on the pixel grid (poly / pxRect): building faces are slices between segments, crisp next to the
   camera; text and the gantry signs are the only sprites, built in warm() at two sizes so they are never drawn far above 2.5x.
   The view down: from a parapet you cannot see the street (the eye is barely above the parapet), so the street, the river and the city
   below are drawn only where the deck has an open railing, in one pass behind everything else, clipped to what lies outside the deck. */
"use strict";
(() => {
  const P = 'sh_', KEY = 'shuto';
  const snp = v => Math.round(v / PX) * PX;
  const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const H0 = n => hash(n);
  let KI = -1; const landK = () => KI >= 0 ? KI : (KI = LANDS.findIndex(l => l.key === KEY));

  // ---------------------------------------------------------------- palette (night; ramps hue-shifted: shadows to indigo, lights to sodium)
  const CON = { K:'#0b0c13', D:'#1b1d29', M:'#2c2f40', L:'#41455a', H:'#5c6178', T:'#7a6450', W:'#a08060' };   // T, W: the coping and kerb lit warm by the lamps
  const STL = ['#141822', '#2e3644', '#56607a', '#8e98ae'];
  const SOD = { core:'#fff6dc', hot:'#ffd27a', glow:'#ff9a3a', pool:'#8a5a32' };
  const SGN = { face:'#16804c', lit:'#22a060', edge:'#eef6f0', dark:'#0a3a24' };
  const AVL = '#ff2a2a';
  const WATER = ['#15263e', '#1a2e4a', '#2a4a6e', '#3e6a92'];
  const BST = {
    office:{ face:['#191d2c', '#282e44', '#444e6c'], spd:'#21263a', lit:['#cadcf2', '#b2c8e6'], warm:'#f4cf8c', dim:'#34405a', dark:'#0d1322', mull:'#121624', win:[.2, .52], pl:.5 },
    tile:{ face:['#22171b', '#38292b', '#584238'], spd:'#2e2226', lit:['#ffe2a0', '#fff0c8'], warm:'#ffcf80', dim:'#46362e', dark:'#120c11', mull:'#180f13', win:[.24, .48], pl:.38, punched:true },
    glass:{ face:['#09121c', '#0f1e2b', '#22405a'], spd:'#0c1824', lit:['#94bfe6', '#b6d6f4'], warm:'#f0c890', dim:'#1e3250', dark:'#09131f', mull:'#1a2e42', win:[.06, .58], pl:.44, glass:true },
    neon:{ face:['#130d19', '#21172b', '#392b47'], spd:'#191121', lit:['#ffd6ee', '#e6dcff'], warm:'#ffc68c', dim:'#382646', dark:'#0d0913', mull:'#110b17', win:[.22, .5], pl:.42 } };
  /* The wider kit (research/sundown-craft/shuto.md section 10, from the C1 references at pixel zoom). Each kind has its own face recipe,
     window rhythm, light temperature (wr: the share of lit floors under warm tungsten instead of cool fluorescent) and roof:
     band70 a 70s mixed-use block (mosaic tile, ribbon windows with sashes); hotel a business hotel (white tile, one small window per room,
     curtains); dept an old department store (floodlit stone, tall windows, cornices); park a multi-storey car park (open decks, tube
     lights, cars); capsule a stack of capsule modules with portholes (generic, after the 1972 Ginza type); ministry a Kasumigaseki slab
     (sun louvres, nearly every floor lit late, sometimes a round stair core); pencil a one-bay pencil building with balconies and a column
     of projecting signboards (tate-kanban). */
  Object.assign(BST, {
    band70:{ face:['#24161a', '#45291f', '#6e4630'], spd:'#36231c', lit:['#ffe4b0', '#f2ecd8'], warm:'#ffc070', dim:'#4a362c', dark:'#120b0e', mull:'#1a100e', win:[.26, .5], pl:.42, wr:.5 },
    hotel:{ face:['#272a36', '#4a4e60', '#767c92'], spd:'#3a3e4e', lit:['#ffd8a0', '#ffe6c0'], warm:'#ffb46a', dim:'#3e3a40', dark:'#11131c', mull:'#1c1e2a', win:[.22, .48], pl:.55, punched:true, wr:.8 },
    dept:{ face:['#302828', '#544840', '#86745e'], spd:'#4a424c', lit:['#ffe2b0', '#fff0d0'], warm:'#ffcf88', dim:'#4a3e3a', dark:'#16121a', mull:'#2a2228', win:[.1, .5], pl:.3, punched:true, wr:.7 },
    park:{ face:['#24262e', '#464854', '#7a7c88'], spd:'#3a3c46', lit:['#46526a', '#4a566e'], warm:'#46526a', dim:'#46526a', dark:'#46526a', mull:'#121420', win:[.17, .5], pl:2, wr:0 },
    capsule:{ face:['#262a34', '#4e5462', '#868c9c'], spd:'#3c404c', lit:['#ffd890', '#ffe8b8'], warm:'#ffc070', dim:'#3a3a44', dark:'#10121a', mull:'#14161e', win:[.12, .5], pl:.38, wr:.9 },
    ministry:{ face:['#1e222c', '#3c424e', '#6a7280'], spd:'#2a2e3a', lit:['#dce8fc', '#c4d6f2'], warm:'#f2d8a8', dim:'#2e3a52', dark:'#0e121c', mull:'#141822', win:[.24, .54], pl:.8, wr:.08 },
    pencil:{ face:['#2a1e24', '#4a3640', '#7a5e66'], spd:'#3a2a30', lit:['#f4e8d8', '#ffe8c0'], warm:'#ffc884', dim:'#3e3238', dark:'#130d12', mull:'#1c1418', win:[.2, .5], pl:.5, wr:.55 } });
  // other face ramps a kind may take (shadow toward indigo, light toward warm): the 70s tiles, the pencils' painted and tiled fronts, hotel tile
  const RAMPS = { band70:[['#24161a', '#45291f', '#6e4630'], ['#262018', '#4e4230', '#82704c'], ['#1c1a22', '#3a3642', '#64606e'], ['#2a1c14', '#5a3a22', '#8a6034']],
    pencil:[['#2a1e24', '#4a3640', '#7a5e66'], ['#1e2230', '#3c4458', '#6a7690'], ['#2c2418', '#54482e', '#8a7a52'], ['#2e1a1e', '#5a2e34', '#8c4c50'], ['#22262c', '#4a5058', '#80868e']],
    hotel:[['#272a36', '#4a4e60', '#767c92'], ['#2c2826', '#55504a', '#8a8278']],
    office:[['#191d2c', '#282e44', '#444e6c'], ['#1c1e26', '#30343e', '#4e5462']], tile:[['#22171b', '#38292b', '#584238'], ['#1e1a22', '#3a3240', '#5e5268']] };
  // the street row's kinds by zone, weighted; lengths [min, extra] in segments and heights [min, extra] in half-road widths
  const KW = { canyon:[['office', 5], ['tile', 2], ['band70', 4], ['glass', 2], ['pencil', 4], ['hotel', 3], ['park', 2], ['capsule', 1], ['dept', 1]],
    jct:[['office', 4], ['band70', 3], ['park', 3], ['hotel', 2], ['tile', 2], ['pencil', 2]],
    trench:[['office', 3], ['band70', 3], ['pencil', 3], ['hotel', 2], ['tile', 2], ['park', 1]],
    towers:[['glass', 5], ['ministry', 5], ['office', 3], ['hotel', 1]],
    ginza:[['neon', 4], ['pencil', 5], ['dept', 3], ['band70', 3], ['hotel', 1], ['capsule', 2], ['park', 1]] };
  const KLEN = { office:[15, 15], tile:[15, 15], glass:[18, 12], neon:[15, 15], band70:[15, 13], hotel:[12, 8], dept:[24, 8], park:[13, 6], capsule:[10, 4], ministry:[26, 6] };
  const KH = { band70:[3.8, 3.4], hotel:[5.5, 4], dept:[4.2, 2], park:[3.1, 1.6], capsule:[6.4, 2.2], ministry:[4.6, 2.6], pencil:[4.4, 3.6] };
  function pickK(L, r){ let t = 0; for(const q of L) t += q[1]; let a = r * t; for(const q of L){ a -= q[1]; if(a < 0) return q[0]; } return L[0][0]; }
  // the signboards' words (generic, no brands): [word, plate, ink]; and the tall vertical signs' words
  // (a projecting plate is about 1 m square: one or two characters fit it; the long names go on the tall vertical signs)
  const KBW = [['麻雀', '#e8fff0', '#0e6a3a'], ['喫茶', '#fff0d8', '#5a2a10'], ['歯科', '#f0f6ff', '#1a4ab0'], ['焼肉', '#ffe2c0', '#a01010'], ['理容', '#f4f8ff', '#2040a0'],
    ['酒場', '#fff0c8', '#3a1a10'], ['金融', '#fffbe8', '#1a2a6a'], ['鮨', '#f8fff4', '#1a1a1a'], ['書店', '#f4f0e8', '#2a2a2a'], ['バー', '#1a1a28', '#ffd890'], ['薬', '#2a8a4a', '#ffffff'],
    ['質', '#ffd84a', '#141018'], ['整体', '#f0fff8', '#0a6a5a'], ['珈琲', '#3a2418', '#ffe8c8'], ['中華', '#c0182a', '#ffe8a0'], ['囲碁', '#f4f8ff', '#1a1a1a'], ['塾', '#1a4ab0', '#ffffff'],
    ['眼科', '#f0f6ff', '#1a3a7a'], ['画廊', '#f4f0e8', '#5a1a2a'], ['和食', '#fff4e0', '#3a1a10'], ['占い', '#2a1040', '#e8c8ff'], ['写真', '#f4fff0', '#108a4a']];
  const KBV = [['ホテル', '#f8f0dc', '#7a1a1a'], ['カプセル', '#1a2a5a', '#ffffff'], ['百貨店', '#f4ece0', '#2a1a10'], ['旅館', '#fff4e0', '#3a1a10'], ['満車', '#1a1a22', '#ff3a2a'], ['空車', '#1a1a22', '#3aff8a'],
    ['スナック', '#b0182a', '#fff4e0'], ['カラオケ', '#ffe0f4', '#8a1a7a'], ['クラブ', '#2a1030', '#ffc8ec'], ['居酒屋', '#fff8ec', '#1a1418'], ['不動産', '#f4f8ff', '#1a3a7a']];
  const KBS = [8, 11, 15, 20];   // text sizes (canvas px): a plate takes the largest that fits, drawn 1:1 so its pixels are the game's pixels
  const FH = .62;   // a storey, in half-road widths (the lane is about 3.5 m; a storey about 3.6 m)

  // ---------------------------------------------------------------- fog toward the sky's low colour (quantised, cached)
  let fogLow = '#1c1630', FC = new Map();
  const fc = (c, f) => { const q = Math.round(clamp(f, 0, 1) * 24); let a = FC.get(c); if(a === undefined){ if(FC.size > 600) FC.clear(); a = new Array(25); FC.set(c, a); } return a[q] || (a[q] = mixc(c, fogLow, q / 24 * .88)); };   // (no string key per call)
  let LOWIN = '';   // (the last sky colour seen: setLow runs on every sprite, and its parse made strings each time)
  const setLow = c => { if(c === LOWIN) return; LOWIN = c; const [r, g, b] = hx(c), q = '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); if(q !== fogLow){ fogLow = q; FC.clear(); } };
  // coordinates far off screen are clamped before the scanline fill (a slice beside the camera can project to tens of thousands of px)
  const CLX = v => v < -W ? -W : v > 2 * W ? 2 * W : v, CLY = v => v < -H ? -H : v > 2 * H ? 2 * H : v;
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col){ window.poly(CLX(x1), CLY(y1), CLX(x2), CLY(y2), CLX(x3), CLY(y3), CLX(x4), CLY(y4), col); }
  function R(x, y, w, h, col){ cx.fillStyle = col; pxRect(x, y, w, h); }

  // ---------------------------------------------------------------- the visit and its zones
  /* A visit runs from its border B. The first 170 segments are the canyon (the border blend lies there), then a cycle of PER segments:
     canyon, the Edobashi junction, the river (open on one side), Kasumigaseki towers, Ginza (open on the other side), canyon, the
     Kyobashi trench (covered by street bridges), canyon. A zone that would overlap a fork's split window or the last 260 segments before
     the next border is canyon instead. Everything reads only the gates, so place(), lit() and the set piece agree. */
  const Z0 = 170;
  // two orders (a visit takes one by its hash): the first 700 or so segments after the border must hold a signature zone, because the first
  // visit of a ride is only ~1100 segments long
  const ORDERS = [[[0, 40, 'canyon'], [40, 340, 'river'], [340, 380, 'canyon'], [380, 550, 'jct'], [550, 590, 'canyon'], [590, 680, 'trench'], [680, 720, 'canyon'], [720, 970, 'towers'], [970, 1230, 'ginza'], [1230, 1260, 'canyon']],
    [[0, 30, 'canyon'], [30, 290, 'ginza'], [290, 330, 'canyon'], [330, 420, 'trench'], [420, 460, 'canyon'], [460, 630, 'jct'], [630, 880, 'towers'], [880, 1180, 'river'], [1180, 1260, 'canyon']]];
  const PER = 1260;
  const KIND_ID = { canyon:0, jct:1, river:2, towers:3, ginza:4, trench:5 };
  function visitB(i){ const z = zoneOfSeg(i), K = landK(); if(typeof ROUTE !== 'undefined' && ROUTE[z] !== undefined && ROUTE[z] !== K){ const b = gates[2 * z + 1]; return { B:b !== undefined ? b : i, z:z + 1 }; } return { B:z > 0 ? gates[2 * z - 1] : 0, z }; }
  const ZC = new Map(), CLAIMS = [];   // CLAIMS: [a, b] stretches a set piece keeps plain (setpiece/screenfall.js): a zone that overlaps one is canyon
  function claim(a, b){ if(a < 0){ CLAIMS.length = 0; ZC.clear(); return; } CLAIMS.push([a, b]); if(CLAIMS.length > 8) CLAIMS.shift(); ZC.clear(); }
  // the zone at i: { k (kind), m (segments into the zone), a, b (zone start and end), B (visit start) }
  function zoneAt(i){ const V = visitB(i), B = V.B, rel = i - B; if(rel < Z0) return { k:'canyon', m:rel, a:B, b:B + Z0, B };
    const cyc = Math.floor((rel - Z0) / PER), m0 = (rel - Z0) - cyc * PER, ZONES = ORDERS[orderOf(B)]; let zz = null; for(const q of ZONES) if(m0 >= q[0] && m0 < q[1]){ zz = q; break; }
    const a = B + Z0 + cyc * PER + zz[0], b = B + Z0 + cyc * PER + zz[1], key = a + ':' + zz[2]; let ok = ZC.get(key);
    if(ok === undefined){ const e = gates[2 * V.z + 1]; ok = zz[2] === 'canyon' || ((e === undefined || b < e - 260) && !(window.inForkWindow && inForkWindow(a - 60, b + 60)) && (zz[2] === 'towers' || !CLAIMS.some(c => c[0] <= b && c[1] >= a))); if(ZC.size > 400) ZC.clear(); ZC.set(key, ok); }
    return { k:ok ? zz[2] : 'canyon', m:i - a, a, b, B }; }
  const orderOf = B => { const q = typeof QS !== 'undefined' ? QS.get('shutoorder') : null; return q === '0' || q === '1' ? +q : hash(B * .53 + 1.3) < .55 ? 0 : 1; };   // ?shutoorder=0|1 for tests
  const riverSide = B => hash(B * .37 + 3.1) > .5 ? 1 : -1;
  const wetVisit = B => { const q = typeof QS !== 'undefined' ? QS.get('shutowet') : null; if(q !== null && q !== undefined) return q !== '0'; return hash(B * 1.91 + .7) < .45; };

  // ---------------------------------------------------------------- the deck: parapets, lamps, furniture
  // parapet kind per segment and side: 'con' concrete with a steel rail, 'snd' sound wall, 'rail' open railing (the view down)
  function parKind(i, side, Z){ if(Z.k === 'river' && side === riverSide(Z.B) && Z.m > 6 && Z.b - i > 6) return 'rail';
    if(Z.k === 'ginza' && side === -riverSide(Z.B) && Z.m > 6 && Z.b - i > 6) return 'rail';
    if(Z.k === 'jct' || Z.k === 'trench') return 'snd';
    return hash(Math.floor(i / 90) * 3.3 + side * 1.7) < .38 ? 'snd' : 'con'; }
  const PAR_X = 1.13, DECK_X = 1.24;
  const PH = { con:.24, snd:.62, rail:.16 };
  const LAMP_EVERY = 16;

  // ---------------------------------------------------------------- buildings
  /* Two rows each side, world-anchored like the engine's pbAt: a street row standing a few metres off the deck and a back row of taller
     towers. A building belongs to the zone at both its ends (it never straddles the river or the open side). */
  /* The rows (2026-11-24, Kellan: "we want to make it so the buildings look layered and you can't see the ground texture"): the street
     row and the back row keep their approved rhythm, and a deep row of mid-rise blocks (row 2) runs unbroken behind them, so every gap
     between near buildings opens onto deeper buildings, and below them onto the street and the low roofs (belowDeck), never onto ground
     (the C1 from its deck at night: Route 5 / Ginza / Kyobashi photos, a carpet of blocks with no street showing). (An abutting street
     row was tried and dropped: once the floor covers the ground plane it adds cost without hiding anything more.) */
  const RUN2 = new Map();
  function runAt(i, side, row){ const per = row === 2 ? 40 : row ? 46 : 34, c = Math.floor(i / per), h = k => hash(c * 7.31 + side * 13.7 + row * 31.1 + k);
    if(row === 0){ const L = run0(c, side); for(let q = 0; q < L.length; q++){ const r = L[q]; if(i >= r.b0 && i < r.b0 + r.len) return r; } return null; }
    if(row === 2){ const key = c * 2 + (side > 0 ? 1 : 0); let L = RUN2.get(key); if(L === undefined){ const l1 = 12 + Math.floor(h(1) * 16); L = [{ b0:c * per, len:l1, c }, { b0:c * per + l1, len:per - l1, c }]; if(RUN2.size > 1200) RUN2.clear(); RUN2.set(key, L); }
      return i < L[1].b0 ? L[0] : L[1]; }
    const len = 24 + Math.floor(h(1) * 18), b0 = c * per + Math.floor(h(2) * (per - len)); return i >= b0 && i < b0 + len ? { b0, len, c } : null; }
  /* The street row, per 34-segment period: one building, or a pencil building beside a neighbour. The kind is a weighted pick for the zone,
     with the neighbour rule: a building never takes the kind of the one before it on its side (the chain restarts every 8 periods, so
     finding a kind never looks back more than 7 periods). Cached; the arrays are made once per period, at place() time. */
  const RUN0 = new Map();
  function run0(c, side){ const key = c * 2 + (side > 0 ? 1 : 0); let L = RUN0.get(key); if(L !== undefined) return L;
    const per = 34, h = k => hash(c * 7.31 + side * 13.7 + k), Z = zoneAt(c * per + 17), WL = KW[Z.k] || KW.canyon;
    const prev = c % 8 ? run0(c - 1, side) : null, last = prev && prev.length ? prev[prev.length - 1].kind : '';
    let k1 = pickK(WL, h(11)); if(k1 === last) k1 = pickK(WL, h(12)); if(k1 === last) k1 = WL[(WL.findIndex(q => q[0] === k1) + 1) % WL.length][0];
    const fk = typeof QS !== 'undefined' ? QS.get('shutokind') : null; if(fk && BST[fk]) k1 = fk;   // ?shutokind=<kind> for tests: every street-row building that kind
    L = [];
    if(k1 === 'pencil'){ const lp = 5 + Math.floor(h(13) * 3); let k2 = pickK(WL, h(14)); if(k2 === 'pencil') k2 = WL[0][0] === 'pencil' ? WL[1][0] : WL[0][0];
      const l2 = 12 + Math.floor(h(15) * 9), off = Math.floor(h(2) * Math.max(0, per - lp - l2 - 2)), pf = k2 === last || h(16) < .5;   // (the pencil first when the neighbour would repeat the last kind)
      if(pf) L.push({ b0:c * per + off, len:lp, c, kind:'pencil' }, { b0:c * per + off + lp + 1, len:l2, c, kind:k2 });
      else L.push({ b0:c * per + off, len:l2, c, kind:k2 }, { b0:c * per + off + l2 + 1, len:lp, c, kind:'pencil' }); }
    else { const LR = KLEN[k1] || KLEN.office, len = LR[0] + Math.floor(h(1) * LR[1]); L.push({ b0:c * per + Math.floor(h(2) * (per - len)), len, c, kind:k1 }); }
    if(RUN0.size > 1200) RUN0.clear(); RUN0.set(key, L); return L; }
  const BLD = new Map();
  function bldAt(i, side, row){ const r = runAt(i, side, row); if(!r) return null; const key = side + ':' + row + ':' + r.b0; let B = BLD.get(key); if(B !== undefined) return B;
    const Za = zoneAt(r.b0), Zb = zoneAt(r.b0 + r.len - 1), rs = riverSide(Za.B), h = k => hash(r.b0 * 1.37 + side * 5.1 + row * 9.7 + k);
    B = null;
    const open = Z => (Z.k === 'river' && side === rs) || (Z.k === 'ginza' && side === -rs);
    if(Za.k === Zb.k || (Za.k !== 'river' && Zb.k !== 'river' && Za.k !== 'ginza' && Zb.k !== 'ginza') || row === 2){   // (a street or back-row building over a river or Ginza edge is left out, as approved; the deep row and the floor fill that gap)
      const far = open(Za) || open(Zb), k = far ? (open(Za) ? Za.k : Zb.k) : Za.k;
      if(far){ if(row === 1) B = { x0:k === 'river' ? 29.5 : 44 + h(3) * 6, h:5 + h(4) * (k === 'river' ? 9 : 14), st:h(5) < .5 ? 'office' : k === 'river' ? 'tile' : 'glass', lo:true, depth:2 }; }
      else if(row === 2){ const x0 = (k === 'towers' ? 9 : k === 'jct' ? 8.5 : 7.4) + h(3) * 4.5, tall = k === 'towers' ? 9 + h(4) * 16 : 4.5 + h(4) * h(11) * 13;
        B = { x0, h:tall, st:pickK(k === 'towers' ? [['glass', 3], ['ministry', 2], ['office', 2]] : [['office', 4], ['tile', 3], ['hotel', 2], ['band70', 2], ['glass', 1]], h(5)), lo:true, depth:2.6, deep:true }; }
      else if(row === 0){ const x0 = k === 'jct' ? 3.3 + h(3) * .5 : k === 'trench' ? 2.5 + h(3) * .4 : k === 'ginza' ? 1.6 + h(3) * .35 : 1.75 + h(3) * .7;
        const st = r.kind || 'office', HR = KH[st]; let hh = k === 'towers' ? 9 + h(4) * 14 : k === 'ginza' ? 3.6 + h(4) * 4.4 : 4 + h(4) * 9; if(HR) hh = HR[0] + h(4) * HR[1] * (k === 'towers' ? 1.6 : 1);
        B = { x0, h:hh, st, lo:false, depth:st === 'pencil' ? .6 + h(6) * .3 : .9 + h(6) * .7, bill:st !== 'park' && st !== 'ministry' && (k === 'ginza' ? h(7) < .7 : h(7) < .16), plate:st !== 'pencil' && st !== 'park' && h(8) < .45 }; }
      else { B = { x0:(k === 'towers' ? 4 : 3.7) + h(3) * 1.8, h:(k === 'towers' ? 16 : 10) + h(4) * 14, st:h(5) < .5 ? 'glass' : 'office', lo:true, depth:1.6 }; } }
    if(B){ B.side = side; B.b0 = r.b0; B.len = r.len; B.seed = r.b0 * .731 + side * 3.3 + row * 7.7; B.nF = Math.max(2, Math.floor(B.h / FH)); B.row = row;
      B.occ = .75 + h(9) * .5; B.ph = h(10); B.av = B.h > 7.5; dress(B, h); }
    if(BLD.size > 900) BLD.clear(); BLD.set(key, B); return B; }
  /* A building's own variation, from its hash: the face ramp, the light temperature, ceiling lights (tubes or square panels), blinds, the
     window rhythm (bays per slice), a glass tower's crown, a ministry's round core, the signboard columns and the roof clutter. */
  function dress(B, h){ const K = B.k = B.st, R = RAMPS[K], base = BST[K] || BST.office;
    B.S = R ? Object.assign({}, base, { face:R[Math.floor(h(18) * R.length)] }) : base;
    B.wr = clamp((base.wr !== undefined ? base.wr : .2) + (h(17) - .5) * .36, 0, 1); B.cp = h(19) < .45; B.bl = h(20) * .45;
    // the bay (P segments; one segment is .35 m): the window rhythm, world-anchored; punched windows fill wa..wb of their bay
    B.P = K === 'hotel' ? 8 : K === 'dept' || K === 'capsule' ? 7 : K === 'tile' ? 5 : K === 'park' ? 9 : K === 'pencil' ? Math.max(3, Math.ceil(B.len / 2)) : 4 + Math.floor(h(23) * 3);
    B.wa = K === 'hotel' ? .3 : K === 'dept' ? .24 : .18; B.wb = K === 'hotel' ? .74 : K === 'dept' ? .76 : .82;
    if(K === 'dept') B.dfc = [mixc(B.S.face[1], B.S.face[2], .4)];   // the floodlit lower floors
    B.crown = K === 'glass' && B.h > 8 && h(21) < .65; B.cyl = K === 'ministry' && B.row === 0 && h(22) < .45; B.kbs = []; B.roof = [];
    if(B.lo && B.row >= 1){ if(B.h > 6 && h(24) < .5) B.roof.push({ a:Math.floor(B.len * .3), b:Math.floor(B.len * .3), t:'mast' }); if(B.row === 2 && h(25) < .55) B.roof.push({ a:Math.floor(B.len * (.5 + h(26) * .3)), b:Math.min(B.len - 1, Math.floor(B.len * (.5 + h(26) * .3)) + 3), t:h(27) < .6 ? 'tank' : 'ac' }); return; }
    // signboard columns (tate-kanban) projecting toward the road: z (segments from b0), the top floor, and a word seed per plate
    const kn = K === 'pencil' ? 1 : K === 'neon' ? 2 + (h(25) < .5 ? 1 : 0) : K === 'band70' ? (h(25) < .55 ? 1 + (h(26) < .4 ? 1 : 0) : 0) : K === 'tile' || K === 'office' ? (h(25) < .22 ? 1 : 0) : 0;
    for(let q = 0; q < kn; q++) B.kbs.push({ z:K === 'pencil' ? 1 : 1 + Math.floor((q + .3 + h(27 + q) * .4) / kn * (B.len - 2)), top:Math.min(B.nF, 3 + Math.floor(h(30 + q) * 7)), sd:h(33 + q) * 97, tall:-1 });
    const tv = K === 'hotel' ? (h(36) < .5 ? 0 : 3) : K === 'capsule' ? 1 : K === 'dept' ? 2 : K === 'park' ? 4 : K === 'neon' || (K === 'band70' && h(36) < .3) ? 6 + Math.floor(h(35) * 5) : -1;   // a tall vertical sign: its word in KBV
    if(tv >= 0) B.kbs.push({ z:1 + Math.floor(h(37) * 2), top:B.nF, sd:0, tall:tv });
    // the roof: water tanks on stands, condenser rows, antenna masts, a rooftop shrine, a golf net, or the old plant room
    const L = B.len, at = (u, w) => { const a = Math.max(1, Math.floor(L * u)); return { a, b:Math.min(L - 1, a + Math.max(1, Math.round(w))) }; };
    if(K === 'park'){ if(h(38) < .6) B.roof.push(Object.assign(at(.4, 3), { t:'ac' })); return; }
    if(h(39) < .55) B.roof.push(Object.assign(at(.15 + h(40) * .2, 2 + h(41) * 2), { t:'tank' }));
    if(h(42) < .5) B.roof.push(Object.assign(at(.5 + h(43) * .2, 3 + h(44) * 4), { t:'ac' }));
    if(h(45) < (K === 'ministry' || K === 'office' ? .5 : .25)) B.roof.push(Object.assign(at(.75 + h(46) * .15, 0), { t:'mast' }));
    if(K !== 'ministry' && K !== 'glass' && h(47) < .12 && L > 10) B.roof.push(Object.assign(at(.62, 3), { t:'shrine' }));
    else if(K !== 'pencil' && K !== 'ministry' && h(48) < .07 && L > 14) B.roof.push(Object.assign(at(.2, L * .6), { t:'net' }));
    if(!B.roof.length || h(49) < .4) B.roof.push(Object.assign(at(.3, L * .4), { t:'plant' })); }
  // a building record for a set piece's own tower (setpiece/screenfall.js): { side, b0, len, x0, h, st, ... }
  function mkBld(o){ const B = Object.assign({ lo:false, depth:1.2, bill:false, plate:false, row:0, occ:1, ph:.3 }, o); B.nF = Math.max(2, Math.floor(B.h / FH)); if(B.seed === undefined) B.seed = B.b0 * .731 + B.side * 3.3; B.av = B.h > 7.5;
    dress(B, k => hash(B.seed * 3.7 + k)); B.S = BST[B.st]; B.kbs.length = 0; B.cyl = false; return B; }
  // floor state: 0 dark, 1 lit (fluorescent), 2 lit warm, 3 dim (corridor and night lights); floors switch off one by one through the night
  function floorState(B, f, sec){ const hv = hash(B.seed * 7.13 + f * 13.37), pl = B.S.pl * B.occ * (1 - .3 * MOON.t);
    let s = hv < pl ? (hash(hv * 91.7 + 3) < B.wr ? 2 : 1) : hv < pl + .15 ? 3 : 0;
    if(hash(B.seed * 3.1 + f * 5.3 + sec * 11.9) < .17) s = s === 0 ? 3 : 0; return s; }

  // ---------------------------------------------------------------- text and sign sprites (all made in warm(); repainted when the font arrives)
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const fontOK = () => !document.fonts || !document.fonts.check || document.fonts.check('16px DotGothic16');
  // 3x5 pixel font for romaji, route numbers and the kilometre posts
  const F3 = { A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111',
    J:'001001001101111', K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', Q:'010101101110011', R:'110101110101101',
    S:'011100010001110', T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', Z:'111001010100111',
    '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111', '6':'111100111101111', '7':'111001010010010',
    '8':'111101111101111', '9':'111101111001111', '.':'000000000000010', ' ':'000000000000000', '-':'000000111000000' };
  const f3w = s => s.length * 4 - 1;
  function f3(k, s, x, y, col, sc){ sc = sc || 1; k.fillStyle = col; for(let c = 0; c < s.length; c++){ const g = F3[s[c]] || F3[' ']; for(let p = 0; p < 15; p++) if(g[p] === '1') k.fillRect(x + (c * 4 + p % 3) * sc, y + ((p / 3) | 0) * sc, sc, sc); } }
  // hard-edged text (DotGothic16 thresholded): returns the bitmap's width
  function hardText(k, str, x, y, size, col){ const m = TXT; const g = m.getContext('2d'); g.clearRect(0, 0, m.width, m.height); g.font = size + 'px DotGothic16'; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(str, 1, 1);
    const w = Math.min(m.width, Math.ceil(g.measureText(str).width) + 2), h = size + 4, d = g.getImageData(0, 0, w, h).data; k.fillStyle = col;
    for(let yy = 0; yy < h; yy++) for(let xx = 0; xx < w; xx++) if(d[(yy * w + xx) * 4 + 3] > 110) k.fillRect(x + xx, y + yy, 1, 1); return w; }
  let TXT = null;
  // the signboards' text: KBT[word][size] for the plates (one canvas per word and size), KBC[word][char][size] for the tall signs' characters;
  // each canvas keeps tw, the width its text drew (centring); made in warm, repainted when the font arrives
  const KBT = [], KBC = [];
  function textSpr(c, str, size, col){ const k = c.getContext('2d'); k.clearRect(0, 0, c.width, c.height); c.tw = fontOK() ? Math.min(c.width, hardText(k, str, -1, -1, size, col) - 2) : 0; return c; }
  /* All the signboard text in one atlas (ATL): each sprite canvas keeps its place (ax, ay) there, and blitA draws from the atlas at one
     canvas px per sprite px, exactly as blit(c, x, y, PX) would. (perf: ~190 small canvases were ~190 textures; one sign blit cost ~17 µs) */
  let ATL = null;
  function packKB(){ const L = []; for(const T of KBT) for(const c of T) L.push(c); for(const C of KBC) for(const T of C) for(const c of T) L.push(c);
    const AW = 512; let x = 0, y = 0, rh = 0; for(const c of L){ if(x + c.width > AW){ x = 0; y += rh + 1; rh = 0; } c.ax = x; c.ay = y; x += c.width + 1; if(c.height > rh) rh = c.height; }
    if(!ATL) ATL = can(AW, y + rh + 1); else { if(ATL.height < y + rh + 1) ATL.height = y + rh + 1; }
    const k = ATL.getContext('2d'); k.clearRect(0, 0, ATL.width, ATL.height); for(const c of L) k.drawImage(c, c.ax, c.ay); }
  function blitA(c, x, yb){ if(!ATL) return; const w = c.width * PX, h = c.height * PX; cx.imageSmoothingEnabled = false; cx.drawImage(ATL, c.ax, c.ay, c.width, c.height, snap(x - w / 2), snap(yb) - h, w, h); }
  function* buildKBG(){ for(let w = 0; w < KBW.length; w++){ const T = KBT[w] || (KBT[w] = []); for(let si = 0; si < KBS.length; si++){ const z = KBS[si]; T[si] = textSpr(T[si] || can(KBW[w][0].length * z + 4, z + 3), KBW[w][0], z, KBW[w][2]); }  yield; } yield;
    for(let v = 0; v < KBV.length; v++){ const C = KBC[v] || (KBC[v] = []); for(let c = 0; c < KBV[v][0].length; c++){ const T = C[c] || (C[c] = []); for(let si = 0; si < KBS.length; si++){ const z = KBS[si]; T[si] = textSpr(T[si] || can(z + 4, z + 3), KBV[v][0][c], z, KBV[v][2]); } }  yield; } yield; packKB(); yield; }
  function buildKB(){ for(const _ of buildKBG()); }   // (the same build at once; buildKBG is it stepped)
  // gantry panels: { kj, ro, rt (route badge), ar (arrow: 0 up, -1 up-left, 1 up-right, 2 down) }
  const PANELS = [ { kj:'銀座', ro:'GINZA', rt:'C1', ar:0 }, { kj:'新宿', ro:'SHINJUKU', rt:'4', ar:1 }, { kj:'霞が関', ro:'KASUMIGASEKI', rt:'C1', ar:0 }, { kj:'羽田', ro:'HANEDA', rt:'1', ar:-1 },
    { kj:'江戸橋', ro:'EDOBASHI JCT', rt:'C1', ar:0 }, { kj:'箱崎', ro:'HAKOZAKI', rt:'6', ar:1 }, { kj:'京橋', ro:'KYOBASHI', rt:'C1', ar:2 }, { kj:'渋谷', ro:'SHIBUYA', rt:'3', ar:-1 },
    { kj:'神田橋', ro:'KANDABASHI', rt:'C1', ar:0 }, { kj:'上野', ro:'UENO', rt:'1', ar:1 } ];
  const GANTRIES = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
  const SIGN = [];   // SIGN[p] = [small, big] canvases
  const PW = 88, PHh = 40;   // big panel size (canvas px); the small one is half
  function paintPanel(c, p, big){ const k = c.getContext('2d'), w = c.width, h = c.height, s = big ? 1 : 0; k.clearRect(0, 0, w, h);
    if(!big){ const B2 = SIGN[PANELS.indexOf(p)] && SIGN[PANELS.indexOf(p)][1]; if(B2){ // the far size: the big one pooled 2x2 (any white wins), so its text stays text-like
        const d = B2.getContext('2d').getImageData(0, 0, B2.width, B2.height).data; for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let wt = 0, gr = 0, bd = 0;
          for(let dy = 0; dy < 2; dy++) for(let dx = 0; dx < 2; dx++){ const o = ((y * 2 + dy) * B2.width + (x * 2 + dx)) * 4; if(d[o + 3] < 128) continue; if(d[o] > 200 && d[o + 1] > 200) wt++; else if(d[o + 1] > 100) gr++; else bd++; }
          k.fillStyle = wt >= 2 ? SGN.edge : wt === 1 ? '#7ac89c' : gr ? SGN.lit : bd ? SGN.dark : 'rgba(0,0,0,0)'; if(wt || gr || bd) k.fillRect(x, y, 1, 1); } return; } }
    k.fillStyle = SGN.dark; k.fillRect(0, 0, w, h); k.fillStyle = SGN.lit; k.fillRect(1, 1, w - 2, h - 2);
    k.fillStyle = SGN.face; k.fillRect(1, h - 6, w - 2, 5); k.fillRect(w - 6, 1, 5, h - 2);   // the lower and right edge a step darker (lit from the floodlights below-left)
    k.fillStyle = SGN.edge; k.fillRect(3, 3, w - 6, 1); k.fillRect(3, h - 4, w - 6, 1); k.fillRect(3, 3, 1, h - 6); k.fillRect(w - 4, 3, 1, h - 6);   // the white border, inset
    // the route badge: a white rounded plate with the route in green
    const bw = p.rt.length > 1 ? 13 : 9; k.fillStyle = SGN.edge; k.fillRect(6, 6, bw, 9); k.fillRect(5, 7, bw + 2, 7); f3(k, p.rt, 6 + Math.floor((bw - f3w(p.rt)) / 2), 8, SGN.dark);
    // the destination: kanji over romaji, centred in the space left of the arrow
    const ax = w - 17, tx0 = 7 + bw;
    if(fontOK()){ const m = TXT.getContext('2d'); m.font = '16px DotGothic16'; const tw = Math.ceil(m.measureText(p.kj).width); hardText(k, p.kj, Math.round(tx0 + (ax - tx0 - tw) / 2) - 1, 5, 16, SGN.edge); }
    const rw = f3w(p.ro); if(rw <= ax - 6) f3(k, p.ro, Math.round(6 + (ax - 6 - rw) / 2), h - 11, SGN.edge); else f3(k, p.ro.split(' ')[0], 6, h - 11, SGN.edge);
    // the arrow
    k.fillStyle = SGN.edge; const ay = 8, ac = ax + 6;
    if(p.ar === 2){ k.fillRect(ac - 1, ay, 3, 14); for(let i = 0; i < 5; i++) k.fillRect(ac - 4 + i, ay + 13 + i, 9 - 2 * i, 1); }
    else if(p.ar === 0){ k.fillRect(ac - 1, ay + 5, 3, 16); for(let i = 0; i < 5; i++) k.fillRect(ac - i, ay + i, 2 * i + 1, 1); }
    else { const d = p.ar, tx = ac + d * 5 - (d > 0 ? 1 : 0), ty = ay + 7; for(let i = 0; i < 12; i++) k.fillRect(ac + d * (i - 6) - 1, ay + 20 - i, 3, 2);   // the diagonal shaft, bottom to the tip
      k.fillRect(d > 0 ? tx - 6 : tx, ty, 7, 2); k.fillRect(d > 0 ? tx : tx - 1, ty, 2, 7); } }   // the head: an L at the tip
  // rooftop billboards (Ginza): a word in a frame, lit, at two sizes
  const BILLS = [['電機', '#f4f6ff', '#d8202c'], ['カメラ', '#ffd84a', '#141018'], ['時計', '#e8fbff', '#1a4ab0'], ['洋酒', '#ffe8c0', '#7a1020'], ['真珠', '#fff4f8', '#c0186a'], ['化粧品', '#141018', '#ffe0ec'], ['写真', '#f4fff0', '#108a4a'], ['ホテル', '#fff0c0', '#2a1a40']];
  const BILL = [];
  function paintBill(c, b, sz){ const k = c.getContext('2d'); k.clearRect(0, 0, c.width, c.height); const [txt, fg, bg] = b; k.fillStyle = '#0a0810'; k.fillRect(0, 0, c.width, c.height);
    k.fillStyle = bg; k.fillRect(1, 1, c.width - 2, c.height - 2); k.fillStyle = mixc(bg, '#000', .35); k.fillRect(1, c.height - 3, c.width - 2, 2);
    if(fontOK()){ const m = TXT.getContext('2d'); m.font = sz + 'px DotGothic16'; const tw = Math.ceil(m.measureText(txt).width); hardText(k, txt, Math.round((c.width - tw) / 2) - 1, Math.round((c.height - sz) / 2) - 2, sz, fg); } }
  // the far skyline: two strips at native canvas resolution (far haze towers; the near towers with Shinjuku and Tokyo Tower)
  let SKY = null;
  const SW = 1100;

  // ---------------------------------------------------------------- per-frame state
  let FR = -1, VIS = null;   // VIS: the visit under the rider (B, wet, river side)
  // a slice's face: set once per slice, then FQ(h0, h1, col, ta, tb) fills the band h0..h1 (half-road widths up) of sub-span ta..tb
  let FX1 = 0, FY1 = 0, FU1 = 0, FX2 = 0, FY2 = 0, FU2 = 0;
  let FF = 0; const F0 = c => fc(c, FF);   // a prop's fogged colour: FF is set at the top of each draw function (no closure per prop)
  function face(x, y, uw, x2, y2, u2){ FX1 = x; FY1 = y; FU1 = uw; FX2 = x2; FY2 = y2; FU2 = u2; }
  function FQ(h0, h1, col, ta, tb){ if(ta === undefined){ ta = 0; tb = 1; } const xa = FX1 + (FX2 - FX1) * ta, xb = FX1 + (FX2 - FX1) * tb, ya = FY1 + (FY2 - FY1) * ta, yb = FY1 + (FY2 - FY1) * tb, ua = FU1 + (FU2 - FU1) * ta, ub = FU1 + (FU2 - FU1) * tb;
    const t0 = ya - ua * h1, t1 = yb - ub * h1, b0 = ya - ua * h0, b1 = yb - ub * h0;
    if((xa < -PX * 2 && xb < -PX * 2) || (xa > W + PX * 2 && xb > W + PX * 2) || (t0 > H + PX * 2 && t1 > H + PX * 2) || (b0 < -PX * 2 && b1 < -PX * 2)) return;   // wholly off the screen: nothing to draw (exact; the near walls run off its edges)
    if(Math.abs(xb - xa) < PX * 3 && Math.max(b0, b1) - Math.min(t0, t1) < PX * 3){ cx.fillStyle = col; pxRect(Math.min(xa, xb), Math.min(t0, t1), Math.abs(xb - xa), Math.max(b0, b1) - Math.min(t0, t1)); return; }
    // a sliver under 2.5 px wide (a mullion, a fin, a far slice), or a band whose edges slope under 3/4 px across it: one rect between its edges' mean heights (under a pixel off; bands that share an
    // edge still tile). Tall quads would otherwise go to the engine's antialiased path fill, one per mullion (measured: the GPU cost of the kit)
    if(Math.abs(xb - xa) < PX * 2.5 || (Math.abs(t1 - t0) < PX * .75 && Math.abs(b1 - b0) < PX * .75)){ const tm = CLY((t0 + t1) / 2), bm = CLY((b0 + b1) / 2), xl = CLX(Math.min(xa, xb)); cx.fillStyle = col; pxRect(xl, Math.min(tm, bm), CLX(Math.max(xa, xb)) - xl, Math.abs(bm - tm)); return; }
    poly(xa, b0, xb, b1, xb, t1, xa, t0, col); }
  const FPT = [0, 0, 0];   // a point on the face: FPT = [x, y, uw] at sub-span t, height h
  function fpt(t, h){ const u = FU1 + (FU2 - FU1) * t; FPT[0] = FX1 + (FX2 - FX1) * t; FPT[1] = FY1 + (FY2 - FY1) * t - u * h; FPT[2] = u; return FPT; }
  // the span a slice draws far away (1 near .. up to N), anchored to the run start; 0 if a nearer slice of the run covers this segment
  const SPANF = f => { f = fogPx(f); return f < .022 ? 1 : f < .06 ? 2 : f < .14 ? 4 : f < .3 ? 8 : 16; };   // (measured: building slices were 6.8 ms a frame at the finer tiers)
  function spanOf(j, b0, end, fog, mn){ mn = mn || 1; const bse = j - Math.round(DRAW * Math.pow(fog, 1 / 1.6)), at = k => Math.max(mn, SPANF(clamp(Math.pow((k - bse) / DRAW, 1.6), 0, 1))), lx = laneDX(j), lcut = j > b0 && laneDX(j - 1) !== lx;
    if(j > b0 && !lcut && (j - b0) % at(j)) return 0; let n = 1; while(j + n < end && n < 16 && (j + n - b0) % at(j + n) && laneDX(j + n) === lx) n++; return n; }
  // the far end of a slice of n segments at lateral X: sets FX2/FY2/FU2 relative to the engine's projection of segment j + n - 1's far edge
  function farEnd(j, n, X){ const t = segs[j + n - 1]; if(!t || !t.p2.screen.scale) return false; const q = t.p2.screen; FX2 = q.x + X * q.w; FY2 = q.y; FU2 = q.w; return true; }

  // ---------------------------------------------------------------- drawing: buildings
  // a back-row slice is hidden when the street-row building it is seen through (the same ray crosses the street row's face plane nearer
  // the camera) stands taller than the ray there: skip it (measured: back rows were most of the overdraw in the canyon)
  function hidden(B, j, n){ if(B.row === 0 || B.x0 > 16) return false; const cz = (position + PZ) / SEG, d = j - cz; if(d < 4) return false;
    return occl(B, cz, d, n, 0, 2.1) || (B.row === 2 && occl(B, cz, d, n, 1, 4.6)); }
  function occl(B, cz, d, n, row, xg){ const S0 = bldAt(Math.floor(cz + d * xg / B.x0), B.side, row); if(!S0 || S0.x0 >= B.x0) return false; const r = S0.x0 / B.x0, hTop = .3 + (B.h - .3) * r; return S0.h > hTop + .2 && bldAt(Math.floor(cz + (d + n) * S0.x0 / B.x0), B.side, row) === S0; }
  // the band partition of a building face (drawBld): bands fill upward from BCUR, the face colour BFCOL fills any gap below each one, capped at BHV
  let BCUR = 0, BHV = 0, BFCOL = '';
  function bandB(a, b, col){ if(b > BHV) b = BHV; if(b <= a) return; if(a > BCUR) FQ(BCUR, a, BFCOL); FQ(a, b, col); BCUR = b; }
  function flushB(f0, st0, f1, S, wb0, wb1){ if(st0 > 0 && f0 >= 0){ const col = st0 === 1 ? S.lit[0] : st0 === 2 ? S.warm : S.dim; bandB(f0 * FH + wb0, (f1 - 1) * FH + wb1, F0(col)); } }   // a run of same-state floors f0..f1 as one band
  function drawBld(sp, x, y, uw, fog, now){ const B = sp.b, j = sp.k, end = B.b0 + B.len, n = spanOf(j, B.b0, end, fog, B.deep ? 16 : 1); if(!n) return; if(B.deep && fog > .4) return; if(hidden(B, j, n)) return;   // (perf, round 2: past ~200 segments the backdrop's city wall stands in for the deep row)   // (the deep row, seen only through gaps, never slices finer than 16 segments)
    FX1 = x; FY1 = y; FU1 = uw; if(!farEnd(j, n, sp.x)) return; KBD = -1;
    if(B.side < 0 ? Math.max(FX1, FX2) < -PX * 2 : Math.min(FX1, FX2) > W + PX * 2){ if(B.kbs.length) kbSlice(B, j, n, fog, now); if(!(j === B.b0)) return; KBD = j; }   // beside the camera, off the screen edge (its signs and the end wall may still show)
    const S = B.S, K = B.k, side = B.side, fq = fog; FF = fq; const F = F0;
    // the face is drawn only as high as the screen shows it
    const hv = Math.min(B.h, Math.max(FY1 / Math.max(FU1, .01), FY2 / Math.max(FU2, .01)) + .1); if(hv <= 0) return;
    const fpx = Math.max(FU1, FU2) * FH, w = Math.abs(FX2 - FX1), lo = B.lo, far = fpx < FARPX || lo;
    /* The face is filled as a partition of bands from the road up to the top of the screen (spandrels in the face colour, window bands in
       theirs): every pixel once, no full face under the windows (the overdraw of the tall walls beside the camera was the GPU cost) */
    const sec = Math.floor((j - B.b0) / 7), nf = Math.min(B.nF, Math.ceil(hv / FH)), wb0 = S.win[0], wb1 = S.win[1], fcol = F(S.face[1]);
    BCUR = 0; BHV = hv; BFCOL = fcol;   // the face's band partition so far (bandB)
    if(S.punched && !far){ if(K === 'dept'){ FQ(0, Math.min(hv, FH * 2), F(B.dfc[0])); if(hv > FH * 2) FQ(FH * 2, hv, fcol); } else FQ(0, hv, fcol); BCUR = hv; }   // (dept: the lower floors floodlit from the street)   // (punched: the windows are separate panes over the face)
    if(K === 'capsule' && !far) capFace(B, j, n, nf, hv, F, fpx);
    else if(far){   // far: the lit floors only, runs of the same state merged into one band
      let f0 = -1, st0 = -1;
      const merge = fpx < 2.5 || lo && fpx < 8 || B.deep; for(let f = 0; f < nf; f++){ let st = floorState(B, f, sec); if(merge && st > 0 && st0 > 0) st = st0; if(st !== st0 || (st > 0 && !merge)){ flushB(f0, st0, f, S, wb0, wb1); f0 = f; st0 = st; } }   // (perf 2026-11-24: the back rows merge their lit runs up to 8 px storeys)
      flushB(f0, st0, nf, S, wb0, wb1); if(BCUR < hv) FQ(BCUR, hv, fcol); }
    else {
      const near = fpx >= 15 && n === 1, mid = fpx >= 7, P = B.P, b0 = B.b0, ba = Math.floor((j - b0) / P), bz = Math.floor((j + n - 1 - b0) / P);   // the bays this slice crosses
      for(let f = 0; f < nf; f++){ const fy = f * FH; if(fy > hv) break; if(FY1 - FU1 * (fy + FH) > H + PX * 2 && FY2 - FU2 * (fy + FH) > H + PX * 2) continue;   // (a floor wholly under the screen's foot)
        const st = floorState(B, f, sec), col = st === 1 ? S.lit[(f + sec) & 1 ? 0 : 1] : st === 2 ? S.warm : st === 3 ? S.dim : S.dark;
        if(S.punched){ const c = F(col);   // separate windows, world-anchored in their bays
          for(let bb = ba; bb <= bz; bb++){ const ta = (b0 + bb * P + P * B.wa - j) / n, tb = (b0 + bb * P + P * B.wb - j) / n; if(tb <= 0 || ta >= 1) continue; const a = ta < 0 ? 0 : ta, e = tb > 1 ? 1 : tb;
            if(K === 'hotel'){ hotelWin(B, f, fy, bb, a, e, ta, tb, F, fpx >= 12); continue; }
            FQ(fy + wb0, fy + wb1, c, a, e); if(K === 'dept' && fpx >= 12) FQ(fy + wb1, fy + wb1 + .05, F(S.face[2]), a, e); } }   // (dept: the window's lit stone head)
        else if(st || !S.glass || near) bandB(fy + wb0, fy + wb1, F(col));   // (a dark floor of curtain glass is the face itself: it joins the spandrel band)
        if(st === 0 && S.glass && f < 4 && mid){ // dark curtain glass catches the sodium lamps of the deck below: a warm smear near each lamp
          const dl = Math.abs(((j % LAMP_EVERY) + LAMP_EVERY) % LAMP_EVERY - LAMP_EVERY / 2) ; if(dl > LAMP_EVERY / 2 - 3) FQ(fy + wb0 + .04, fy + wb0 + .2 - f * .03, F(f ? '#5a3a22' : '#8a5428'), .1, .9); }
        if(K === 'park'){ if(fpx >= 12) parkFloor(B, j, n, f, fy, F, near); }
        else if(S.punched) continue;
        else if(near && !AB_IN) interior(B, j, f, fy, st, F, now);
        else if(mid && (st === 1 || st === 2)) for(let bb = ba; bb <= bz; bb++){ if(hash(B.seed * 5.9 + f * 2.3 + bb * 1.7) > .12) continue;   // a figure at the window, now and then in a bay
          const t0 = (b0 + bb * P + P * .45 - j) / n, t1 = t0 + 1.2 / n; if(t1 <= 0 || t0 >= 1) continue; FQ(fy + wb0, fy + wb0 + .2, F('#1a1724'), Math.max(0, t0), Math.min(1, t1)); FQ(fy + wb0 + .21, fy + wb0 + .28, F('#1a1724'), Math.max(0, t0 + .25 / n), Math.min(1, t1 - .25 / n)); } }
      if(BCUR < hv) FQ(BCUR, hv, fcol);
      // floor lines (the spandrel's lit lip) near: one band per floor
      if(fpx >= 10 && !S.glass && K !== 'capsule') for(let f = 1; f < nf; f++){ const fy = f * FH; if(fy > hv) break; FQ(fy - .02, fy, F(S.face[2])); }
      // each kind's own lines across the floors: sash frames, balconies, sun louvres, cornices, lit floor plates
      if(fpx >= 14 && !AB_LN) kindLines(B, nf, hv, sec, F);
      // the bay lines, world-anchored: mullions (sashes too, on the 70s blocks), office fins with a lit edge, a store's pilasters
      if(fpx >= 9 && !AB_LN && w >= PX * 4 && K !== 'capsule' && K !== 'park' && K !== 'hotel' && K !== 'tile'){ const half = K === 'band70' && fpx >= 12 ? 2 : 1, fin = (K === 'office' || K === 'ministry') && fpx >= 12;
        for(let q = Math.ceil((j - b0) * half / P); ; q++){ const z = b0 + q * P / half; if(z >= j + n) break; const t = (z - j) / n, sash = half > 1 && (q & 1);
          if(fin){ FQ(0, hv, F(S.face[0]), t, Math.min(1, t + .35 / n)); FQ(0, hv, F(S.face[2]), Math.min(1, t + .35 / n), Math.min(1, t + .45 / n)); }
          else if(K === 'dept'){ FQ(0, hv, F(S.face[2]), t, Math.min(1, t + .3 / n)); FQ(0, hv, F(S.face[0]), Math.min(1, t + .3 / n), Math.min(1, t + .45 / n)); }
          else FQ(0, hv, F(S.mull), t, Math.min(1, t + Math.max((sash ? .12 : .2) / n, PX * 1.1 / Math.max(w, 1)))); } } }
    // roof: cornice, the roof clutter, a lit crown, aviation lights, a billboard
    if(hv >= B.h){ const h = B.h; FQ(h - .06, h, F(S.face[2]));
      if(B.crown){ FQ(h - .45, h - .06, F(B.ph < .5 ? '#cfe2ff' : '#ffe6c4')); FQ(h, h + .4, F(S.face[0])); FQ(h + .36, h + .4, F('#9ab8e0')); }   // a glass tower's crown: its top floor lit, the screen wall above
      if(B.roof.length && !AB_RF && !(B.deep && fpx < 3)) roofItems(B, j, n, h, fog, now, F, fpx);
      if(B.av && fog < .92){ const on = reduce || ((now / 1000) * .55 + B.ph) % 1 < .55, a = on ? 1 : .18, hc = h + (B.crown ? .4 : 0);
        for(let ei = 0; ei < 2; ei++){ const e = ei ? end - 1 : B.b0; if(!(e >= j && e < j + n)) continue; const [px, py, u] = fpt((e - j + (e === B.b0 ? .1 : .9)) / n, hc + (lo ? 0 : .08)), s = Math.max(PX, Math.min(PX * 2, snp(u * .05)));
          R(px - s / 2, py - s, s, s, on ? AVL : '#5a1414'); if(on && fog < .45 && u > 6) glow(px, py - s / 2, Math.min(H * .05, Math.max(PX * 2.5, u * .35)), '#ff2020', .5 * a * (1 - fog * .5)); } }
      if(B.bill && j <= B.b0 + (B.len >> 1) && j + n > B.b0 + (B.len >> 1) && fog < .7) bill(B, j, n, h, fog); }
    // a vertical company plate near the top of the street face (pale plate, dark glyph blocks)
    if(B.plate && !lo && fpx >= 3 && j <= B.b0 + 2 && j + n > B.b0 + 2 && hv > B.h - 2){ const t = (B.b0 + 2 - j + .2) / n, t2 = Math.min(1, t + .5 / n); FQ(B.h - 1.9, B.h - .25, F('#d8dce8'), t, t2);
      if(fpx >= 6) for(let g = 0; g < 4; g++) FQ(B.h - .45 - g * .38, B.h - .45 - g * .38 - .26, F('#1a1c28'), t + (t2 - t) * .22, t + (t2 - t) * .78); }
    if(B.kbs.length && KBD !== j) kbSlice(B, j, n, fog, now); KBD = -1;
    // the end wall that faces the camera at the run's start
    if(j === B.b0){ const dx = side * B.depth * uw, xl = Math.min(x, x + dx), wd = Math.abs(dx), h1 = Math.min(B.h, y / Math.max(uw, .01) + .1); if(h1 > 0 && wd >= 1){
        R(xl, y - uw * h1, wd, uw * h1, F(S.face[0]));
        if(K === 'park') parkEnd(B, xl, y, uw, wd, h1, F);
        else if(fpx >= 2.5) for(let f = 0; f < nf && f * FH < h1; f++){ const st = floorState(B, f, 99); if(!st && fpx < 7) continue; const c = st === 1 ? S.lit[1] : st === 2 ? S.warm : st === 3 ? S.dim : S.dark;
          R(xl + wd * .25, y - uw * (f * FH + wb1), wd * .5, uw * (wb1 - wb0), F(c));
          if(wd > PX * 14){ const yt = y - uw * (f * FH + wb1), hh = uw * (wb1 - wb0); R(xl + wd * .5 - PX / 2, yt, PX, hh, F(S.mull)); R(xl + wd * .23, yt - PX, wd * .54, PX, F(S.face[2])); R(xl + wd * .23, yt + hh, wd * .54, PX, F(S.face[2]));   // close by: a mullion, the lit head and sill
            if(st === 1 || st === 2) R(xl + wd * .3, yt + Math.max(PX, hh * .12), wd * .4, PX, F('#ffffff')); } }   // and a ceiling tube inside
        R(side > 0 ? xl : xl + wd - Math.max(PX, wd * .06), y - uw * h1, Math.max(PX, wd * .06), uw * h1, F(S.face[2])); }
      if(K === 'capsule') capCores(B, x, y, uw, F, now);
      if(B.cyl) cylCore(B, x, y, uw, F, fpx, now); } }
  // each kind's horizontal lines across its floors (mid and near)
  function kindLines(B, nf, hv, sec, F){ const S = B.S, K = B.k, wb0 = S.win[0], wb1 = S.win[1];
    if(K !== 'band70' && K !== 'pencil' && K !== 'ministry' && K !== 'dept' && K !== 'glass') return;
    for(let f = 0; f < nf; f++){ const fy = f * FH; if(fy > hv) break;
      if(K === 'band70'){ FQ(fy + wb1 - .025, fy + wb1, F('#8a7c66')); FQ(fy + wb0, fy + wb0 + .015, F('#5a4c3c')); }   // the aluminium sash frame's lit head and its sill
      else if(K === 'pencil'){ FQ(fy, fy + .06, F(S.face[2])); FQ(fy + .06, fy + .085, F(S.face[0])); FQ(fy + .24, fy + .255, F(STL[3])); }   // a balcony slab, its shadow, the rail
      else if(K === 'ministry'){ FQ(fy + wb1, fy + wb1 + .025, F(S.face[0])); FQ(fy + wb1 + .025, fy + wb1 + .09, F(S.face[2])); }   // a sun louvre over each window band
      else if(K === 'dept'){ if(f && f % 3 === 0){ FQ(fy - .08, fy - .03, F(S.face[0])); FQ(fy - .03, fy + .03, F(S.face[2])); } }   // a stone string course every third floor
      else { const st = floorState(B, f, sec); if(st === 1 || st === 2) FQ(fy + wb1 - .03, fy + wb1, F(st === 2 ? '#fff4dc' : '#eef6ff')); } } }   // glass: the lit edge of each floor plate
  /* The interior of one bay of one floor, seen through the glass beside the camera (only on the nearest, one-segment slices). Everything
     is placed by the segment's place in its bay (u, 0..P-1; one segment is .35 m), so a desk, a terminal and a person keep their real
     sizes: ceiling tubes or square panels, a desk run, a terminal, a late worker, a desk lamp's pool on warm floors, a cabinet, a pot plant,
     blinds lowered in some bays; on a dim floor the corridor light, a cleaner's cart and the green exit sign. */
  function interior(B, j, f, fy, st, F, now){ const S = B.S, P = B.P, g = fy + S.win[0], top = fy + S.win[1], rel = j - B.b0, u = rel % P, bi = (rel - u) / P, hb = hash(B.seed * 1.7 + f * 3.9 + bi * 7.3), warm = st === 2;
    if(u === 0) return;   // the mullion's segment
    if(st === 1 || st === 2){
      if(B.cp){ if(u === (P >> 1)){ FQ(top - .07, top - .03, F(warm ? '#fff2d0' : '#f4f8ff'), .04, .96); FQ(top - .03, top - .02, F(warm ? '#b08a5a' : '#8a9ab8'), .04, .96); } }   // a square ceiling panel
      else if(u & 1) FQ(top - .04, top - .02, F('#ffffff'), .1, .9);   // a tube, every other segment
      if(u === P - 1 && hb > .5){ FQ(g, g + .22, F(warm ? '#8a6a48' : '#7a86a2'), .1, .9); FQ(g + .2, g + .22, F(warm ? '#b0905e' : '#a0aac0'), .1, .9); }   // a cabinet
      else { FQ(g, g + .08, F(warm ? '#6a4a30' : '#56607a')); FQ(g + .08, g + .1, F(warm ? '#9a7a50' : '#8a96b0'));   // the desk run
        if(u === 2 && hb < .8){ FQ(g + .1, g + .19, F('#262a36'), .08, .92); FQ(g + .115, g + .175, F(hb < .4 ? '#6ae8b0' : '#9ab8ff'), .18, .82); }   // a terminal, green or blue
        if(u === 3 && hb > .55){ const seat = hb < .8, bh = seat ? .16 : .26, y0 = seat ? g + .04 : g;   // a late worker, seated or standing at the desk
          FQ(y0, y0 + bh, F('#1a1724'), .05, .95); FQ(y0 + bh + .01, y0 + bh + .08, F('#1a1724'), .2, .8); if(warm) FQ(y0 + bh + .06, y0 + bh + .08, F('#4a3428'), .3, .8); }   // (the lamp catches the hair)
        if(u === 4 && warm && hb > .3){ FQ(g + .1, g + .19, F('#2a2420'), .45, .55); FQ(g + .19, g + .22, F('#fff0c0'), .25, .75); FQ(g + .1, g + .12, F('#ffd890'), .05, .95); }   // a desk lamp: stem, hot shade, its pool
        if(u === 1 && hb < .25){ FQ(g, g + .18, F('#1e3a26'), .2, .8); FQ(g + .14, g + .22, F('#2e5a36'), .1, .9); } }   // a pot plant
      if(hash(B.seed * 4.1 + f * 1.3 + bi * 2.9) < B.bl){ const bc = warm ? '#c8b088' : '#a8b4c8', sl = warm ? '#8a7050' : '#6a7690';   // blinds lowered over the top of this bay
        FQ(top - .2, top, F(bc)); FQ(top - .2, top - .188, F(sl)); FQ(top - .13, top - .12, F(sl)); FQ(top - .065, top - .055, F(sl)); } }
    else if(st === 3){ if(u === 2) FQ(top - .05, top - .03, F('#8a9ab8'), .1, .9);   // the corridor light
      if(hb < .14){ if(u === 2){ FQ(g, g + .1, F('#3a5a9a'), .1, .9); FQ(g + .1, g + .2, F('#c8c8d0'), .45, .55); } else if(u === 3){ FQ(g, g + .26, F('#14121c'), .2, .8); FQ(g + .27, g + .33, F('#14121c'), .3, .7); } }   // a cleaner's cart, its mop; the cleaner
      if(hb > .9 && u === 1) FQ(top - .1, top - .06, F('#3aff8a'), .2, .8); }   // the green exit light
    else if(hb < .06 && u === 1) FQ(g + .2, g + .24, F('#3aff8a'), .2, .8); }   // a dark floor: only its exit light
  // a business hotel room's window: lit with the curtains open or half drawn, or closed and dark; a bedside lamp; the sill
  function hotelWin(B, f, fy, bb, a, e, ta, tb, F, mid){ const S = B.S, wb0 = S.win[0], wb1 = S.win[1], r = hash(B.seed * 3.3 + f * 7.1 + bb * 1.9), lit = r < S.pl * B.occ * (1 - .3 * MOON.t);
    FQ(fy + wb0, fy + wb1, F(lit ? (r < .2 ? S.lit[0] : S.warm) : r > .9 ? '#2a2a3a' : S.dark), a, e);
    if(!mid) return; const span = tb - ta, cl = r * 7 % 1 < .5;
    if(lit && cl){ const c1 = ta + span * .28, c2 = tb - span * .28; if(c1 > a) FQ(fy + wb0, fy + wb1, F('#b07a4a'), a, Math.min(e, c1)); if(c2 < e) FQ(fy + wb0, fy + wb1, F('#b07a4a'), Math.max(a, c2), e); }   // curtains half drawn
    if(lit && r * 13 % 1 < .4){ const lt = ta + span * .62; if(lt >= a && lt < e) FQ(fy + wb0 + .05, fy + wb0 + .1, F('#fff4d0'), lt, Math.min(e, lt + span * .1)); }   // a bedside lamp
    FQ(fy + wb0 - .02, fy + wb0, F(S.face[2]), Math.max(a, ta - span * .05), Math.min(e, tb + span * .05)); }
  // a car park deck: the next slab's soffit with its tube lights, parked cars (nose out, a few braking) behind the low wall, world-anchored bays
  const CARS = [['#2a2e3a', '#1c1f28'], ['#d8d8e0', '#8a8a96'], ['#8a1a22', '#5a1016'], ['#1a1c22', '#101116'], ['#b8bcc4', '#7a7e88'], ['#2a4a7a', '#1a304e']];
  function parkFloor(B, j, n, f, fy, F, near){ const wb0 = B.S.win[0], wb1 = B.S.win[1];
    FQ(fy + wb1 - .05, fy + wb1, F('#20242e'));
    if(near){ if(((j - B.b0) % 3) === 1) FQ(fy + wb1 - .048, fy + wb1 - .034, F('#f4fbff'), .05, .95); } else FQ(fy + wb1 - .046, fy + wb1 - .036, F('#c8dcf4'));   // tube lights
    for(let c = Math.floor((j - B.b0) / 7); c * 7 + B.b0 < j + n; c++){ const hv = hash(B.seed * 2.3 + f * 5.1 + c * 1.7); if(hv > .7) continue;   // a car per 7-segment bay (2.5 m), 5 segments wide
      const za = B.b0 + c * 7 + 1, ta = Math.max(0, (za - j) / n), tb = Math.min(1, (za + 5 - j) / n); if(tb <= ta) continue; const C = CARS[Math.floor(hv * 9.7) % CARS.length];
      FQ(fy + wb0, fy + wb0 + .1, F(C[0]), ta, tb); const ra = Math.max(ta, (za + 1 - j) / n), rb = Math.min(tb, (za + 4 - j) / n); if(rb > ra) FQ(fy + wb0 + .1, fy + wb0 + .16, F(C[1]), ra, rb);   // body, cabin
      if(hv < .1){ const la = (za + .3 - j) / n, lb = (za + 4.7 - j) / n; if(la >= 0 && la < 1) FQ(fy + wb0 + .05, fy + wb0 + .075, '#ff3030', la, Math.min(1, la + .6 / n)); if(lb > 0 && lb <= 1) FQ(fy + wb0 + .05, fy + wb0 + .075, '#ff3030', Math.max(0, lb - .6 / n), lb); } } }   // brake lights
  // the car park's end facing the camera: its open decks and the ramp climbing across them, lit
  function parkEnd(B, xl, y, uw, wd, h1, F){ const wb0 = B.S.win[0], wb1 = B.S.win[1];
    for(let f = 0; f * FH < h1; f++){ const fy = f * FH; R(xl + wd * .06, y - uw * (fy + wb1), wd * .88, uw * (wb1 - wb0), F(B.S.lit[0]));
      if(uw * FH > PX * 6){ const a = y - uw * (fy + wb0), b = y - uw * (fy + wb1 - .04), th = Math.max(PX, uw * .04), l = xl + wd * .08, r = xl + wd * .92, up = f & 1;
        poly(l, up ? a : b, r, up ? b : a, r, (up ? b : a) + th, l, (up ? a : b) + th, F('#9aa2b4')); R(xl + wd * .06, y - uw * (fy + wb1 - .045), wd * .88, Math.max(PX, uw * .012), F('#e8f2ff')); } } }   // the ramp slab, the deck's tubes
  // the capsule stack: modules in a staggered grid (2.5 m, 7 segments), each with a round window, lit warm or dark, on a dark core
  function capFace(B, j, n, nf, hv, F, fpx){ const S = B.S; FQ(0, hv, F(S.face[0])); BCUR = hv; const P = B.P, mid = fpx >= 7;
    for(let f = 0; f < nf; f++){ const fy = f * FH; if(fy > hv) break; const o = (f % 3) * 2.3;
      for(let c = Math.floor((j - B.b0 - o) / P); B.b0 + o + c * P < j + n; c++){ const za = B.b0 + o + c * P, ta = Math.max(0, (za + .3 - j) / n), tb = Math.min(1, (za + P - .3 - j) / n); if(tb <= ta) continue;
        const r = hash(B.seed * 1.3 + f * 4.7 + c * 2.9); FQ(fy + .03, fy + FH - .03, F(r < .5 ? S.face[1] : S.face[2]), ta, tb); if(mid) FQ(fy + FH - .07, fy + FH - .03, F(S.face[2]), ta, tb);   // the module, its lit top
        const tc = (za + P / 2 - j) / n, lit = r * 5 % 1 < S.pl * B.occ, gc = F(lit ? (r * 11 % 1 < .5 ? S.lit[0] : S.warm) : '#1a2230');
        if(!mid){ if(lit){ const pa = Math.max(0, tc - 1.2 / n), pb = Math.min(1, tc + 1.2 / n); if(pb > pa) FQ(fy + .22, fy + .4, gc, pa, pb); } continue; }
        const rim = F(S.face[0]); for(let k = 0; k < PORT.length; k++){ const pt = PORT[k], pa = Math.max(0, tc - pt[1] / n), pb = Math.min(1, tc + pt[1] / n); if(pb > pa) FQ(fy + .31 - pt[0], fy + .31 + pt[0], pt[2] ? rim : gc, pa, pb); }   // the porthole: an octagon of two rects for the rim, two for the glass
        if(fpx >= 14){ const hx = Math.max(0, tc - .7 / n), hy = Math.min(1, tc - .2 / n); if(hy > hx) FQ(fy + .37, fy + .41, F(lit ? '#fff8e8' : '#4a5a70'), hx, hy); } } } }   // a highlight on the glass
  const PORT = [[.1, 1.75, 1], [.17, 1.05, 1], [.08, 1.35, 0], [.13, .8, 0]];   // [half height, half width in segments, rim?]: a .5 m round window
  // the capsule tower's two service cores at its end: tall rust-brown shafts with a slit and an antenna
  function capCores(B, x, y, uw, F, now){ const s = B.side, h1 = Math.min(B.h + 1.5, y / Math.max(uw, .01) + .1), L = v => x + s * (v - B.x0) * uw;
    for(let q = 0; q < 2; q++){ const a = B.x0 + .05 + q * .55, b = a + .4, top = Math.min(h1, B.h + (q ? 1.0 : 1.5)), xa = Math.min(L(a), L(b)), wd = Math.abs(L(b) - L(a));
      R(xa, y - uw * top, wd, uw * top, F(q ? '#4a2418' : '#5a2c1c')); R(s > 0 ? xa : xa + wd - Math.max(PX, wd * .15), y - uw * top, Math.max(PX, wd * .15), uw * top, F('#8a4a2a'));
      if(wd > PX * 6) R(xa + wd * .45, y - uw * (top - .2), Math.max(PX, wd * .08), uw * (top - .6), F('#24120c'));
      if(top < h1) R(xa + wd * .5, y - uw * (top + .8), Math.max(PX, uw * .015), uw * .8, F(STL[1])); } }
  // a ministry's round stair core at its end (after the Kasumigaseki and Takebashi cores): a floodlit drum, staggered slit windows, masts
  const CYL7 = ['#3a3e4a', '#5e6472', '#848a98', '#a0a6b2', '#949aa8', '#727886', '#464a56'], CYL3 = ['#565a68', '#8e94a2', '#626674'];
  function cylCore(B, x, y, uw, F, fpx, now){ const s = B.side, r = .62, cc = B.x0 + B.depth * .5, h1 = Math.min(B.h + .9, y / Math.max(uw, .01) + .1), L = v => x + s * (v - B.x0) * uw;
    const big = uw * r * 2 > PX * 12, T = big ? CYL7 : CYL3, NB = T.length, xs = [];
    for(let k = 0; k <= NB; k++) xs.push(L(cc + r * Math.sin((-1 + 2 * k / NB) * Math.PI / 2)));
    for(let k = 0; k < NB; k++){ const a = Math.min(xs[k], xs[k + 1]), b = Math.max(xs[k], xs[k + 1]); R(a, y - uw * h1, b - a, uw * h1, F(T[s > 0 ? k : NB - 1 - k])); }
    if(big && fpx >= 6){ cx.fillStyle = F('#22262e'); const sw = Math.max(PX, uw * .03), sh = Math.max(PX, uw * .1);   // the slits, staggered row by row
      for(let rr = 0; rr * .24 + .2 < h1; rr++){ const yy = y - uw * (rr * .24 + .3); if(yy < -sh) break; for(let k = 1 + (rr & 1); k < NB - 1; k += 2){ const xm = (xs[k] + xs[k + 1]) / 2; pxRect(xm - sw / 2, yy, sw, sh); } } }
    if(h1 >= B.h + .9){ const yt = y - uw * h1; R(xs[0], yt, xs[NB] - xs[0], Math.max(PX, uw * .05), F('#c4c8d2'));   // the crown ring, two masts with a red light
      for(const v of [-.3, .25]){ const mx = L(cc + v), mh = uw * 1.1; R(mx, yt - mh, Math.max(PX, uw * .015), mh, F(STL[1])); const on = reduce || ((now / 1000) * .55 + B.ph + v) % 1 < .55; R(mx - PX / 2, yt - mh - PX, PX * 2, PX * 2, on ? AVL : '#5a1414'); } } }
  /* The roof clutter, seen from below against the sky (the deck is at the street row's fourth floor, so no roof surface ever shows, only
     what stands on it): FRP panel water tanks on steel stands, condenser rows with their fans, antenna masts with a red light, a rooftop
     shrine (torii, hokora, its trees), a golf practice net, the plant room. Long things lie in the face plane; a tank's end, the masts and
     the shrine face the camera at their own segment. */
  const TANK = ['#3e4250', '#7c7e88', '#aaa8a6'];
  function roofItems(B, j, n, h, fog, now, F, fpx){ const RL = B.roof, side = B.side;
    for(let q = 0; q < RL.length; q++){ const it = RL[q], za = B.b0 + it.a, zb = B.b0 + it.b + 1; if(zb <= j || za >= j + n) continue;
      const t = it.t, ta = Math.max(0, (za - j) / n), tb = Math.min(1, (zb - j) / n);
      if(t === 'plant'){ if(B.lo) continue; FQ(h, h + .55, F(B.S.face[0]), ta, tb); FQ(h + .5, h + .55, F(B.S.face[2]), ta, tb); if(fpx >= 8) FQ(h + .18, h + .4, F(B.S.mull), ta + (tb - ta) * .3, ta + (tb - ta) * .55); }   // a plant room with a louvre
      else if(t === 'tank'){ FQ(h + .2, h + .23, F(STL[2]), ta, tb); FQ(h + .23, h + .78, F(TANK[1]), ta, tb); FQ(h + .74, h + .78, F(TANK[2]), ta, tb);   // the stand's beam, the FRP panel tank, its lit top
        if(fpx >= 6) FQ(h + .49, h + .51, F(TANK[0]), ta, tb);
        if(fpx >= 10) for(let z = Math.max(za, j); z < Math.min(zb, j + n); z++){ const tz = (z - j) / n; FQ(h, h + .2, F(STL[1]), tz, Math.min(1, tz + .3 / n)); if((z - za) % 3 === 0) FQ(h + .23, h + .74, F(TANK[0]), tz, Math.min(1, tz + .12 / n)); }   // posts, panel joints
        else FQ(h, h + .2, F(STL[0]), ta, tb);
        if(za >= j && CF(za)){ const X0 = side * B.x0, X1 = side * (B.x0 + .6); CR(X0, X1, h + .23, h + .78, F(TANK[0])); CR(X0, X1, h + .74, h + .78, F(TANK[1])); if(fpx >= 6) CR(X0, X1, h + .49, h + .51, F(STL[0])); } }   // its end, in shade
      else if(t === 'ac'){ FQ(h, h + .2, F('#3c404c'), ta, tb); FQ(h + .18, h + .2, F('#6a6e7a'), ta, tb);
        if(fpx >= 10) for(let z = Math.max(za, j); z < Math.min(zb, j + n); z += 2){ const tz = (z - j) / n; FQ(h + .04, h + .15, F('#1a1c24'), tz + .2 / n, Math.min(1, tz + 1.2 / n)); FQ(h + .08, h + .11, F('#4a4e5a'), tz + .55 / n, Math.min(1, tz + .85 / n)); } }   // a fan per unit, its hub
      else if(t === 'mast'){ if(za >= j && CF(za + .5)){ const X = side * (B.x0 + .3), u = CFU, px = CFX + X * u, pw = Math.max(PX, snp(u * .02)), mh = 1.6;
          cx.fillStyle = F(STL[1]); pxRect(px - pw / 2, CFY - (h + mh) * u, pw, mh * u);
          if(u * .24 > PX * 3){ cx.fillStyle = F(STL[2]); for(let k = 1; k < 4; k++) pxRect(px - u * .12, CFY - (h + k * .4) * u, u * .24, Math.max(PX, u * .012)); }   // crossbars
          const on = reduce || ((now / 1000) * .55 + B.ph + .3) % 1 < .55, sz = Math.max(PX, Math.min(PX * 2, snp(u * .04))); cx.fillStyle = on ? AVL : '#5a1414'; pxRect(px - sz / 2, CFY - (h + mh) * u - sz, sz, sz); } }
      else if(t === 'shrine'){ if(za >= j && CF(za + .5)) shrine(B, h, F); }
      else if(t === 'net'){ const a0 = cx.globalAlpha; cx.globalAlpha = a0 * .42; FQ(h, h + 2.4, F('#1e3a2a'), ta, tb); cx.globalAlpha = a0;   // a golf net: the netting (see-through), its lines, the top cable, poles
        if(fpx >= 6) for(let k = 1; k < 4; k++) FQ(h + k * .6, h + k * .6 + .02, F('#3a6a4a'), ta, tb); FQ(h + 2.38, h + 2.42, F(STL[2]), ta, tb);
        for(const z of [za, zb - 1, (za + zb) >> 1]) if(z >= j && z < j + n && CF(z + .5)) CR(side * (B.x0 + .1), side * (B.x0 + .16), h, h + 2.5, F(STL[2])); } } }
  // a rooftop shrine facing the camera: its trees, the hokora (body, roof, lit ridge), a red torii (posts, kasagi with its black cap, nuki)
  function shrine(B, h, F){ const s = B.side, X = v => s * (B.x0 + v), u = CFU; if(u * .5 < PX * 3){ CR(X(.2), X(1.1), h, h + .4, F('#2a1a1c')); return; }
    CR(X(.05), X(1.25), h, h + .5, F('#14261a')); CR(X(.3), X(.9), h + .45, h + .62, F('#1a3020'));
    CR(X(.62), X(1.02), h, h + .3, F('#5a4030')); CR(X(.57), X(1.07), h + .3, h + .38, F('#22202a')); CR(X(.62), X(1.02), h + .37, h + .39, F('#6a6a78'));
    const rr = F('#c8282a'); CR(X(.2), X(.25), h, h + .5, rr); CR(X(.45), X(.5), h, h + .5, rr); CR(X(.18), X(.52), h + .38, h + .41, rr);
    CR(X(.13), X(.57), h + .46, h + .52, F('#7a1418')); CR(X(.11), X(.59), h + .52, h + .55, F('#2a1416')); }
  // camera-facing geometry at segment z (a float): CF sets the projection, CR fills lateral X0..X1 (signed half-road widths), heights h0..h1
  let CFX = 0, CFY = 0, CFU = 0;
  function CF(z){ const i = Math.floor(z), sg = segs[i]; if(!sg) return false; const a = sg.p1.screen, b = sg.p2.screen; if(!a.w || !b.w) return false; const f = z - i; CFX = a.x + (b.x - a.x) * f; CFY = a.y + (b.y - a.y) * f; CFU = a.w + (b.w - a.w) * f; return true; }
  function CR(X0, X1, h0, h1, col){ const xa = CFX + X0 * CFU, xb = CFX + X1 * CFU; if(CFY - h1 * CFU > H + PX * 2 || CFY - h0 * CFU < -PX * 2) return; cx.fillStyle = col; pxRect(Math.min(xa, xb), CFY - h1 * CFU, Math.abs(xb - xa), (h1 - h0) * CFU); }
  /* Tate-kanban: a column of lit plates, one per floor, projecting from the face toward the road at its segment, facing the camera. LOD by
     the plate's height on screen: far, one lit strip for the column; mid, each plate in its frame with a dash of ink; near, its word in
     DotGothic at the largest size that fits (KBS), drawn 1:1 so its pixels are the game's. A tall sign (kb.tall) is one plate over several
     floors with its word set top to bottom; a car park's is the blue P with a 空車 / 満車 plate under it. */
  let KBD = -1;   // (the slice whose signs were drawn already, before an early return)
  function kbSlice(B, j, n, fog, now){ if(AB_KB) return; const L = B.kbs; for(let q = 0; q < L.length; q++){ const kb = L[q], z = B.b0 + kb.z; if(z >= j && z < j + n) kanban(B, kb, z, fog); } }
  function kanban(B, kb, z, fog){ if(!CF(z + .5)) return; const side = B.side, pr = Math.min(kb.tall === 4 ? .52 : kb.tall >= 0 ? .4 : .34, B.x0 - 1.24); if(pr < .16) return;
    const Xo = side * (B.x0 - .04), Xi = side * (B.x0 - .04 - pr), u = CFU; { const xa = CFX + Xo * u, xb = CFX + Xi * u; if((xa < -PX * 2 && xb < -PX * 2) || (xa > W + PX * 2 && xb > W + PX * 2)) return; }   // (off the screen's side)
    const ff = fog * .7, top = Math.min(kb.top, Math.floor(CFY / Math.max(u, .01) / FH) + 1); if(top <= 0) return;
    if(kb.tall >= 0) return tallSign(B, kb, Xo, Xi, pr, u, ff);
    const ph = u * FH * .56;
    if(ph < PX * 3.5){ CR(Xi, Xo, .12, top * FH - .12, fc('#b8a68c', ff)); return; }   // far: one strip
    const pw = pr * u, ins = side * .025, w0 = Math.floor(hash(kb.sd) * KBW.length);
    CR(Xi, Xo, .1, top * FH - .1, fc('#16141c', ff)); CR(Xo - side * .04, Xo, .04, top * FH, fc('#2a2a34', ff));   // the column's steel frame and its backbone on the wall
    for(let f = 0; f < top; f++){ const wi = (w0 + f * 7) % KBW.length, wd = KBW[wi], hb = f * FH + .14, ht = hb + FH * .56;   // (a stride of 7: no two plates of a column alike)
      CR(Xi + ins, Xo - ins, hb, ht, fc(wd[1], ff));
      const ip = (ht - hb) * u - PX * 2, iw = pw - .06 * u - PX * 2, T = KBT[wi]; let spr = null;
      if(T) for(let si = KBS.length - 1; si >= 0; si--){ const c = T[si]; if(c && c.tw && c.height * PX <= ip && c.tw * PX <= iw){ spr = c; break; } }
      if(spr){ const xm = CFX + (Xi + Xo) / 2 * u, yb = CFY - (hb + ht) / 2 * u + spr.height * PX / 2; const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - ff * .6); blitA(spr, xm + (spr.width - spr.tw) * PX / 2, yb); cx.globalAlpha = a0;
        CR(Xi + ins, Xo - ins, ht - .015, ht, fc(mixc(wd[1], '#ffffff', .5), ff)); }   // its lit top edge
      else if(ph >= PX * 5){ const m = wd[0].length; CR(Xi + side * pr * (m > 1 ? .2 : .34), Xo - side * pr * (m > 1 ? .2 : .34), hb + FH * .22, hb + FH * .34, fc(wd[2], ff)); } } }   // mid: one bar of ink (two blocks read as eyes)
  function tallSign(B, kb, Xo, Xi, pr, u, ff){ const side = B.side, wd = KBV[kb.tall], m = wd[0].length, cell = FH * .8, Xa = Xi + side * pr * (kb.tall === 4 ? .05 : .22);
    if(kb.tall === 4){ // a car park: the blue P plate and the 空車 / 満車 plate under it
      const ht = Math.min(B.h - .2, 3.2), hb = ht - 1.1; CR(Xa, Xo, hb, ht, fc('#1a3a9a', ff)); CR(Xa, Xo, ht - .03, ht, fc('#5a7ad8', ff)); if(u * 1.1 > PX * 12 && Math.abs(Xo - Xa) * u > PX * 6){ const g = F3.P, k = Math.max(1, Math.floor(Math.min(u * .8 / 5, Math.abs(Xo - Xa) * u * .75 / 3) / PX)) * PX, x0 = CFX + (Xa + Xo) / 2 * u - k * 1.5, y0 = CFY - (hb + ht) / 2 * u - k * 2.5;
        cx.fillStyle = fc('#f4f8ff', ff); for(let p = 0; p < 15; p++) if(g[p] === '1') cx.fillRect(snp(x0 + (p % 3) * k), snp(y0 + ((p / 3) | 0) * k), k, k); }
      const full = hash(B.seed * 9.1) < .4, w2 = KBV[full ? 4 : 5]; CR(Xa, Xo, hb - .5, hb - .06, fc(w2[1], ff)); charCol(w2[0], full ? 4 : 5, (Xa + Xo) / 2, hb - .5, hb - .06, Math.abs(Xo - Xa) * u, ff, true); return; }
    const ht = Math.min(B.h - .15, (kb.top) * FH), hb = Math.max(.15, ht - m * cell - .1); if(ht - hb < .5) return;
    CR(Xa - side * .03, Xo + side * .03, hb - .03, ht + .03, fc('#16141c', ff)); CR(Xa, Xo, hb, ht, fc(wd[1], ff));
    charCol(wd[0], kb.tall, (Xa + Xo) / 2, hb + .05, ht - .05, Math.abs(Xo - Xa) * u, ff, false); }
  // a word set in a column (or a row, for the short car park plate) between heights h0..h1 at lateral Xm; mid: a dash per character
  function charCol(word, vi, Xm, h0, h1, wpx, ff, row){ const m = word.length, u = CFU, xm = CFX + Xm * u, ink = fc(KBV[vi][2], ff), a0 = cx.globalAlpha;
    const cellH = row ? (h1 - h0) * u : (h1 - h0) / m * u, cellW = row ? wpx / m : wpx, C = KBC[vi]; let si = -1;
    for(let k = KBS.length - 1; k >= 0; k--){ if((KBS[k] + 3) * PX <= Math.min(cellH, cellW) - PX){ si = k; break; } }
    if(si < 0 && row){ if(cellH > PX * 2.5){ cx.fillStyle = ink; pxRect(xm - cellW * m * .3, CFY - (h0 + h1) / 2 * u - cellH * .12, cellW * m * .6, Math.max(PX, cellH * .24)); } return; }   // a row too small for its characters: one bar (two blocks read as eyes)
    for(let c = 0; c < m; c++){ const yc = row ? CFY - (h0 + h1) / 2 * u : CFY - (h1 - (c + .5) * (h1 - h0) / m) * u, xc = row ? xm + (c - (m - 1) / 2) * cellW : xm;
      const spr = si >= 0 && C ? C[c][si] : null;
      if(spr){ cx.globalAlpha = a0 * (1 - ff * .6); blitA(spr, xc, yc + spr.height * PX / 2); cx.globalAlpha = a0; }
      else if(cellH > PX * 2.5){ cx.fillStyle = ink; pxRect(xc - Math.min(cellW * .3, cellH * .3), yc - cellH * .15, Math.min(cellW * .6, cellH * .6), Math.max(PX, cellH * .3)); } } }
  function bill(B, j, n, h, fog){ const t = (B.b0 + (B.len >> 1) - j + .5) / n, [px, py, u] = fpt(t, h + .25), bi = Math.floor(hash(B.seed * 2.9) * BILLS.length), hh = u * .9; if(hh < PX * 3) return;
    const pair = BILL[bi]; if(!pair) return; const spr = hh > pair[0].height * 1.6 ? pair[1] : pair[0], k = hh / spr.height;
    // the frame's legs, then the lit board (a camera-facing card, as a real roof sign is seen from the street) and its glow on the roof
    R(px - spr.width * k * .35, py - hh * .1, Math.max(PX, u * .03), hh * .2, fc('#2a2830', fog)); R(px + spr.width * k * .32, py - hh * .1, Math.max(PX, u * .03), hh * .2, fc('#2a2830', fog));
    const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .6); blit(spr, px, py - hh * .1, k); cx.globalAlpha = a0; glow(px, py - hh * .6, Math.min(H * .08, spr.width * k * .6), BILLS[bi][2], .22 * (1 - fog)); }

  // ---------------------------------------------------------------- drawing: the deck's parapets
  const WSP = f => { f = fogPx(f); return f < .03 ? 1 : f < .08 ? 2 : f < .2 ? 4 : f < .4 ? 8 : 16; };
  /* The parapet's slices (Kellan, 2026-11-23: "some of them disappear when they are between the farground and the foreground"). Each
     slice used to be drawn from a segment j only when j % WSP(fog at j) === 0, covering WSP segments. Where the tier changed (n 1 -> 2 at
     about 30 segments out, 2 -> 4 at 55, 4 -> 8 at 100) the first segments of the coarser tier were neither drawn by the finer slice
     before them nor started a slice of their own: a hole of one to four segments that slid along with the camera. Now (as the buildings'
     spanOf) a slice starts at every segment whose tier divides it, or where the parapet's kind or the side-lane push changes, and runs on to
     the next start: every segment is covered exactly once at every distance. The span per distance is a table (fog depends on it alone). */
  const WST = new Uint8Array(1024); let WSTOK = false, WSF = -1, WSB = 0;
  const wsAt = k => { const d = k - WSB; return d < 1 ? 1 : d > 1023 ? 16 : WST[d]; };
  const pkOf = (k, side) => { const t = segs[k]; return t ? (side < 0 ? t.shPK & 3 : t.shPK >> 2) : -1; };
  function parSpan(j, side){ if(!WSTOK){ WSTOK = true; for(let d = 0; d < 1024; d++) WST[d] = WSP(clamp(Math.pow(d / DRAW, 1.6), 0, 1)); } if(WSF !== DRAWN){ WSF = DRAWN; WSB = segAt(position).index; }
    const kd = pkOf(j, side), lx = laneDX(j); if(j % wsAt(j) && pkOf(j - 1, side) === kd && laneDX(j - 1) === lx) return 0;
    let n = 1; while(n < 16 && (j + n) % wsAt(j + n) && pkOf(j + n, side) === kd && laneDX(j + n) === lx && segs[j + n]) n++; return n; }
  function drawPar(sp, x, y, uw, fog, now){ const j = sp.k, side = sp.side, n = parSpan(j, side); if(!n) return; const s = sp.s, kd = sp.kd;
    if(n <= 2 && kd !== 'rail' && uw > 5 && RFA) for(let m = 0; m < n; m++) roofProps(j + m, side, now);   // the low roofs' clutter beyond the parapet (drawn before it: the parapet covers their feet)
    const t = segs[j + n - 1] || s; const q = t.p2.screen; if(!q.w) return; const x2 = q.x + sp.x * q.w, y2 = q.y, u2 = q.w; face(x, y, uw, x2, y2, u2);
    if(side < 0 ? Math.max(x, x2) < -PX : Math.min(x, x2) > W + PX) return;
    FF = fog; const F = F0, near = uw > 26;
    if(kd === 'rail'){ // an open railing: a low kerb, three rails, posts every 3 segments (see-through: the view down is behind it)
      FQ(0, .04, F(CON.M)); FQ(.035, .045, F(CON.T));
      for(const h of [.1, .16]) FQ(h - (near ? .016 : .01), h, F(h === .16 ? STL[3] : STL[2]));
      if(j % 4 === 0 && n === 1){ const pw = Math.max(PX, uw * .02); R(x - pw / 2, y - uw * .16, pw, uw * .16, F(STL[1])); R(x - pw / 2, y - uw * .16, pw, Math.max(PX, uw * .012), F(STL[3])); }
      return; }
    const hh = kd === 'snd' ? PH.snd : PH.con;
    FQ(0, .24, F(j & 2 ? CON.M : '#2a2d3e')); FQ(.215, .24, F(CON.T));   // the concrete parapet and its coping (lit warm)
    FQ(0, .025, F(CON.D));
    if(n <= 2 && uw > 9) for(let m = 0; m < n; m++){ const z = j + m; if(z % 6) continue; const ta = m / n, tb = Math.min(1, ta + .09 / n), hv = hash(z * .37 + side);
      FQ(.025, .215, F(CON.D), ta, tb); if(hv < .45){ const tc = Math.min(1, ta + (.1 + hv * .3) / n); FQ(.11 + hv * .06, .212, F(hv < .2 ? '#3a2c2a' : '#22242f'), Math.min(1, ta + .09 / n), tc); } }   // a panel joint, a stain below the coping
    if(kd === 'snd'){ // a sound wall: louvred panels, a pale translucent band on top, H-steel posts every 4 segments
      FQ(.24, .5, F('#26303a')); if(near) for(let k = 0; k < 4; k++) FQ(.28 + k * .055, .29 + k * .055, F('#344250'));
      FQ(.5, .62, F('#3a4a64')); FQ(.6, .62, F('#7a8aa8'));
      if(j % 4 === 0 && n === 1){ const pw = Math.max(PX, uw * .03); R(x - pw / 2, y - uw * .63, pw, uw * .39, F(STL[0])); R(x - pw / 2 - (side > 0 ? 0 : 0), y - uw * .63, Math.max(PX, pw * .4), uw * .39, F(STL[2])); } }
    else { // the steel rail on the parapet
      FQ(.27, .3, F(STL[2])); FQ(.29, .3, F(STL[3]));
      if(j % 3 === 0 && n === 1){ const pw = Math.max(PX, uw * .018); R(x - pw / 2, y - uw * .3, pw, uw * .06, F(STL[1])); } }
    // delineators on the coping every 4 segments; red/white chevron boards on the outside of a sharp bend; the end of a run is capped
    if(j % 4 === 0 && fog < .7){ const sz = Math.max(PX, Math.min(PX * 3, snp(uw * .03))), ry = y - uw * .24 - sz; R(x - sz / 2, ry, sz, sz, fog < .25 ? '#ffc060' : F('#c07028')); }
    for(let m = 0; m < n; m++){ const sb = segs[j + m]; if(sb && sb.shCv & (side < 0 ? 1 : 2)){ drawChev(sb, side, fog); face(x, y, uw, x2, y2, u2); FF = fog; } }   // the chevron boards whose first segment this slice covers
    if(sp.phone && n === 1 && uw > 6){ // an emergency phone box in the parapet: green, a white handset, a red lamp over it
      FQ(.04, .2, F('#1a7a4a'), .2, .7); FQ(.06, .18, F('#0e4a2c'), .26, .64); if(uw > 18){ FQ(.1, .12, F('#eef6f0'), .32, .58); FQ(.08, .14, F('#eef6f0'), .32, .38); FQ(.08, .14, F('#eef6f0'), .52, .58); }
      fpt(.45, .22); R(FPT[0] - PX, FPT[1] - PX * 2, PX * 2, PX * 2, '#ff3a2a'); glow(FPT[0], FPT[1] - PX, Math.min(H * .04, uw * .1), '#ff3a2a', .3); }
    if(sp.km !== undefined && n === 1 && uw > 10){ // a kilometre post: a white plate with the distance in black
      FQ(.07, .19, F('#e8e8ee'), .3, .9); if(uw > 22){ const s = sp.km.toFixed(1); fpt(.38, .17); const px0 = FPT[0], py0 = FPT[1], u = FPT[2], k = Math.max(1, Math.floor(u * .018 / PX)) * PX;
        cx.fillStyle = F('#141420'); for(let c = 0; c < s.length; c++){ const g = F3[s[c]]; if(!g) continue; for(let p = 0; p < 15; p++) if(g[p] === '1') cx.fillRect(snp(px0 + side * 0 + (c * 4 + p % 3) * k), snp(py0 + ((p / 3) | 0) * k), k, k); } } } }

  /* A red/white chevron board on the outside of a sharp bend, 3 segments long from its first segment sb, drawn by the parapet slice that
     covers sb (after it, so the board is on top) at every distance, with a level of detail by its size on screen (no step pops):
     the retroreflective red fogs at half the rate (it carries as far as the delineators do); far, a red dash at the boards' rhythm, at least one pixel tall, its red blended by coverage as the core's lane marks are;
     mid, the white chevrons fade in once each is a few pixels wide; near, a dark frame, a lit top edge and the bolts. */
  const CHEV_C = ['#c8182a', '#e8e8f0', '#5a0a14', '#ff5a5a'];
  function drawChev(sb, side, fog){ const a = sb.p1.screen, t = segs[sb.index + 2]; if(!a.w || !t || !t.p2.screen.w) return; const q = t.p2.screen, X = side * PAR_X;
    face(a.x + X * a.w, a.y, a.w, q.x + X * q.w, q.y, q.w); if(side < 0 ? Math.max(FX1, FX2) < -PX : Math.min(FX1, FX2) > W + PX) return;
    FF = fog * .55; const F = F0, bh = Math.max(FU1, FU2) * .16, len = Math.abs(FX2 - FX1), d = -side;
    if(bh < PX * 1.5){ const cov = clamp(bh / PX, .55, 1), y0 = Math.min(FY1 - FU1 * .17, FY2 - FU2 * .17);   // far: one row of red at the board's middle height
      cx.fillStyle = F(mixc(CON.M, CHEV_C[0], cov)); pxRect(Math.min(FX1, FX2), y0, Math.max(PX, len), PX); return; }
    FQ(.05, .21, F(CHEV_C[0]));
    const cw = len * .1, al = clamp((Math.min(bh * .6, cw) / PX - 2) / 2.5, 0, 1), tk = clamp((len / 3 / PX - 1.4) / 1.2, 0, 1) * (1 - al), a0 = cx.globalAlpha, wht = F(CHEV_C[1]);
    if(tk > 0){ cx.globalAlpha = a0 * tk; cx.fillStyle = wht; for(let k = 1; k < 6; k += 2){ fpt(.09 + k * .16, .18); const tx = FPT[0], ty = FPT[1]; fpt(.09 + k * .16, .08); pxRect(tx - PX / 2, ty, PX, Math.max(PX, FPT[1] - ty)); } cx.globalAlpha = a0; }   // mid: a white tick at every other chevron's place
    if(al <= 0) return; cx.globalAlpha = a0 * al;   // then the chevrons themselves fade in (2 to 4.5 px wide) as the ticks fade out
    for(let k = 0; k < 6; k++){ const c0 = .04 + k * .16, c1 = c0 + .1; fpt(d > 0 ? c0 : c1, .19); const tx = FPT[0], ty = FPT[1]; fpt(d > 0 ? c1 : c0, .13); const px = FPT[0], py = FPT[1]; fpt(d > 0 ? c0 : c1, .07); const bx = FPT[0], by = FPT[1];
      fpt(d > 0 ? c0 + .04 : c1 - .04, .13); poly(tx, ty, px, py, bx, by, FPT[0], FPT[1], wht); }
    if(bh > PX * 9){ FQ(.05, .065, F(CHEV_C[2])); FQ(.195, .21, F(CHEV_C[2])); FQ(.19, .195, F(CHEV_C[3]));   // near: the frame, the lit top edge
      if(bh > PX * 14) for(let k = 0; k < 3; k++){ fpt(.02 + k * .48, .2); const bs = Math.max(PX, snp(FPT[2] * .012)); R(FPT[0] - bs / 2, FPT[1], bs, bs, F('#d8d8e0')); } }   // and the bolts at the board's posts
    cx.globalAlpha = a0; }

  // ---------------------------------------------------------------- drawing: lamps, gantries, overhead decks
  function drawLamp(sp, x, y, uw, fog, now){ if(fog > .97) return; const a = 1 - fog * .7, dir = -Math.sign(sp.x), h = sp.h || 1.85, top = y - uw * h, pw = Math.max(PX, uw * .026); FF = fog; const F = F0;
    const ax = x + dir * uw * (sp.arm || .36);
    R(x - pw / 2, top, pw, uw * (h - .24), F(STL[1])); R(x - pw / 2 + (dir < 0 ? pw * .5 : 0), top, Math.max(PX, pw * .5), uw * (h - .24), F(STL[2]));
    // the arm, a thin quad from the pole top to the luminaire, then the luminaire (a dark box with a hot sodium face below)
    const aw = Math.max(PX, uw * .018); poly(x, top, ax, top + uw * .03, ax, top + uw * .03 + aw, x, top + aw, F(STL[1]));
    const lw = Math.max(PX * 2, uw * .16), lh = Math.max(PX, uw * .04), lx = ax - lw / 2 + dir * lw * .3;
    R(lx, top + uw * .02, lw, lh, F(STL[0])); R(lx + lw * .1, top + uw * .02 + lh, lw * .8, Math.max(PX, uw * .014), fog < .5 ? SOD.core : F(SOD.hot));
    glow(lx + lw / 2, top + uw * .05, Math.min(H * .08, uw * .45), SOD.glow, .32 * a); if(uw > 30 && uw < 200) glow(lx + lw / 2, top + uw * .05, Math.min(H * .04, uw * .16), SOD.hot, .3 * a); }   // (halos capped: big additive fills near the camera were the GPU cost)
  function drawGant(sp, x, y, uw, fog, now){ if(uw < 1) return; FF = fog; const F = F0, pw = Math.max(PX, uw * .07), ph = 1.72, bot = y - uw * .3, by = y - uw * ph;
    for(let sd = -1; sd <= 1; sd += 2){ const px = x + sd * 1.3 * uw; R(px - pw / 2, by, pw, bot - by, F(STL[1])); R(px - pw / 2, by, Math.max(PX, pw * .35), bot - by, F(STL[2])); }
    R(x - 1.36 * uw, by, 2.72 * uw, Math.max(PX, uw * .045), F(STL[2])); R(x - 1.36 * uw, by + uw * .1, 2.72 * uw, Math.max(PX, uw * .035), F(STL[1]));   // the twin beams
    if(uw > 8) for(let k = -6; k <= 6; k++){ const bx = x + k * .21 * uw; poly(bx, by + uw * .045, bx + uw * .1, by + uw * .1, bx + uw * .1 + Math.max(PX, uw * .012), by + uw * .1, bx + Math.max(PX, uw * .012), by + uw * .045, F(STL[1])); }   // lattice diagonals
    if(sp.v < 0) return;   // a bare gantry (a set piece hangs its own board on it)
    // the variable message board on the beam (Hamazakibashi JCT, inspected: a black box of red-orange LED dots over the green signs, a
    // grey controller box on its roof): its own message by gantry, dots drawn 1:1 at warm-up, a faint red bloom
    const V = VMS[sp.v % VMS.length]; if(V && V.width > 1){ const bw = 1.5 * uw, k = bw / V.width, bh = V.height * k, vx = x - .55 * uw, vy = by - bh - uw * .03;
      if(bh >= PX * 2){ R(vx - bw / 2 - uw * .03, vy - uw * .03, bw + uw * .06, bh + uw * .06, F('#101014')); const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .6); blit(V, vx, vy + bh, k); cx.globalAlpha = a0;
        R(vx + bw * .2, vy - uw * .13, bw * .22, uw * .1, F(STL[2])); R(vx + bw * .2, vy - uw * .13, bw * .22, Math.max(PX, uw * .012), F(STL[3]));   // the controller box
        if(fog < .5 && uw > 6) glow(vx, vy + bh / 2, Math.min(H * .06, bw * .4), '#ff4a20', .08 * (1 - fog)); } }
    const G = GANTRIES[sp.v % GANTRIES.length], pwid = .7, pos = G.length === 2 ? GPOS2 : GPOS3;
    for(let q = 0; q < G.length; q++){ const pi = G[q], pair = SIGN[PANELS.indexOf(PANELS[pi])]; if(!pair) continue; const sw = pwid * uw, spr = sw > pair[0].width * 2.2 ? pair[1] : pair[0], k = sw / spr.width;
      const px = x + pos[q] * uw, pyb = by + uw * .1 + spr.height * k + uw * .06; const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .75); blit(spr, px, pyb, k); cx.globalAlpha = a0;
      if(fog < .6){ R(px - sw * .3, pyb, Math.max(PX, sw * .05), Math.max(PX, uw * .02), F(STL[0])); R(px + sw * .25, pyb, Math.max(PX, sw * .05), Math.max(PX, uw * .02), F(STL[0])); }   // floodlights under the panel
      glow(px, pyb - spr.height * k * .5, Math.min(H * .1, sw * .55), '#2adf80', .1 * (1 - fog)); } }
  const GPOS2 = [-.42, .42], GPOS3 = [-.66, 0, .66];   // the panels' places across a gantry
  // the message boards' texts (generic road messages) and their canvases (made in warm: 12 px DotGothic, every LED a 2x2 cell, one dark)
  const VMS_T = ['この先 渋滞 2km', '事故 車線規制', '雨天 スリップ注意', '銀座 5分 新宿 18分', '工事 夜間通行止'], VMS = [];
  function paintVMS(c, str){ const k = TXT.getContext('2d'); k.clearRect(0, 0, TXT.width, TXT.height); k.font = '12px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#fff'; k.fillText(str, 1, 1);
    const w = Math.min(120, Math.ceil(k.measureText(str).width) + 3), d = k.getImageData(0, 0, w, 14).data, g = c.getContext('2d'); c.width = w * 2; c.height = 28; const o = g.createImageData(w * 2, 28);
    for(let y = 0; y < 14; y++) for(let x = 0; x < w; x++){ const on = d[(y * w + x) * 4 + 3] > 110; for(let q = 0; q < 4; q++){ const px = x * 2 + (q & 1), py = y * 2 + (q >> 1), i = (py * w * 2 + px) * 4, gap = q === 3;
        o.data[i] = on ? (gap ? 120 : 255) : (gap ? 10 : 34); o.data[i + 1] = on ? (gap ? 30 : 90) : (gap ? 4 : 10); o.data[i + 2] = on ? (gap ? 10 : 40) : (gap ? 4 : 8); o.data[i + 3] = 255; } }
    g.putImageData(o, 0, 0); }
  // a deck crossing overhead (the Edobashi stack, the Kyobashi street bridges): drawn as one slice per segment of its depth. At its first
  // segment the fascia faces the camera; every segment carries its slice of the soffit (lit by a row of sodium lights) and the piers'
  // inner faces. o: { b0, dep, h0 (soffit), h1 (top of the fascia), span (half width), pier (pier x or 0), street (a street bridge) }
  function drawXdeck(sp, x, y, uw, fog, now){ FF = fog; const o = sp.o, j = sp.k, F = F0, t = segs[j]; if(!t) return; const q = t.p2.screen; if(!q.w) return; const x2 = q.x, y2 = q.y, u2 = q.w;
    const L = o.span, h0 = o.h0, h1 = o.h1;
    // the soffit slice (seen from below), dark, with lights in rows across
    if(j < o.b0 + o.dep){ poly(x - L * uw, y - h0 * uw, x + L * uw, y - h0 * uw, x2 + L * u2, y2 - h0 * u2, x2 - L * u2, y2 - h0 * u2, F(o.street ? '#18161e' : '#121219'));
      if((j - o.b0) % 2 === 1 && !o.street){ const ly = y - h0 * uw, sz = Math.max(PX, Math.min(PX * 3, snp(uw * .025))); for(let k = -4; k <= 4; k++){ const lx = x + k * .8 * uw; if(lx < -PX || lx > W + PX) continue; R(lx - sz, ly - sz / 2, sz * 2, sz, fog < .4 ? '#ffe0a0' : F(SOD.hot)); if(uw > 12 && uw < 160) glow(lx, ly, Math.min(H * .05, uw * .2), SOD.glow, .18 * (1 - fog)); } } }
    // the piers: inner faces between this segment and the next, from the deck up to the soffit
    if(o.pier && j >= o.b0 && j < o.b0 + o.dep) for(let sd = -1; sd <= 1; sd += 2){ const X = sd * o.pier; poly(x + X * uw, y, x2 + X * u2, y2, x2 + X * u2, y2 - h0 * u2, x + X * uw, y - h0 * uw, F(j & 1 ? CON.L : CON.M)); }
    if(j !== o.b0) return;
    // the front: pier faces, then the fascia across the whole view
    if(o.pier) for(let sd = -1; sd <= 1; sd += 2){ const X = sd * o.pier, pw = .32 * uw; pierArt(sd < 0 ? x + X * uw - pw : x + X * uw, y - h0 * uw, pw, h0 * uw, uw, F, o.b0 + sd, sd < 0); }
    const fy0 = y - h1 * uw, fh = (h1 - h0) * uw, xl = Math.max(-PX, x - L * uw), xr = Math.min(W + PX, x + L * uw);
    R(xl, fy0, xr - xl, fh, F(o.street ? '#3a3a48' : '#c8ccd4')); R(xl, fy0 + fh * .82, xr - xl, fh * .18, F(o.street ? '#24242e' : '#8a8e9e')); R(xl, fy0, xr - xl, Math.max(PX, fh * .08), F(o.street ? '#5a5a6a' : '#eef0f4'));
    if(!o.street && uw > 5){ const gb = fy0 + fh, gf = Math.max(PX, snp(uw * .035)); R(xl, gb, xr - xl, gf, F('#353a48')); R(xl, gb, xr - xl, PX, F('#6a7488'));   // the steel girder's bottom flange under the fascia
      if(uw > 10){ const st = .45 * uw; for(let k = Math.ceil((xl - x) / st); x + k * st < xr; k++) R(x + k * st, fy0 + fh * .82, Math.max(PX, snp(uw * .012)), fh * .18, F('#5a6070')); } }   // its web stiffeners
    if(!o.street && uw > 6){ const sx = 1.1 * uw; for(let k = Math.ceil((xl - x) / sx); x + k * sx < xr; k++) R(x + k * sx, fy0 + fh * .08, Math.max(PX, uw * .012), fh * .74, F('#9a9eae')); }   // the panel seams
    // on top: its own railing and lamps (a street bridge: pedestrians' railing and street lamps)
    R(xl, fy0 - uw * .12, xr - xl, Math.max(PX, uw * .02), F(STL[2])); if(uw > 6) for(let k = -8; k <= 8; k++){ const px = x + k * .55 * uw; if(px < xl || px > xr) continue; R(px, fy0 - uw * .12, Math.max(PX, uw * .012), uw * .12, F(STL[1])); }
    for(let k = -3; k <= 3; k++){ const px = x + k * 2.1 * uw; if(px < -PX || px > W + PX) continue; const lh = uw * (o.street ? .7 : .55); R(px - Math.max(PX, uw * .012), fy0 - lh, Math.max(PX, uw * .024), lh, F(STL[1]));
      R(px - uw * .06, fy0 - lh, uw * .12, Math.max(PX, uw * .025), fog < .5 ? (o.street ? '#f0f4ff' : SOD.core) : F(SOD.hot)); glow(px, fy0 - lh, Math.min(H * .07, uw * .3), o.street ? '#bcd0ff' : SOD.glow, .2 * (1 - fog)); }
    // a street bridge: a blue street-name plate on its fascia and people crossing over the trench (walking, world-anchored)
    if(o.street && fog < .7){ const pw = uw * .9; R(x - pw / 2, fy0 + fh * .22, pw, fh * .5, F('#1a4ab0')); R(x - pw / 2, fy0 + fh * .22, pw, Math.max(PX, uw * .015), F('#e8eef8'));
      if(uw > 10) for(let g = 0; g < 4; g++) R(x - pw * .4 + g * pw * .22, fy0 + fh * .36, pw * .14, fh * .2, F('#e8eef8'));
      for(let k = 0; k < 4; k++){ const ph = ((now / 1000) * (k & 1 ? .05 : -.04) + hash(o.b0 * .3 + k)) % 1, X = (((ph % 1) + 1) % 1 - .5) * 2 * L * .7, px = x + X * uw; if(px < -PX || px > W + PX) continue; const hh = uw * .2, ww = Math.max(PX, uw * .05);
        R(px - ww / 2, fy0 - hh, ww, hh * .7, F(k & 1 ? '#2a2a3a' : '#3a2a2a')); R(px - ww * .4, fy0 - hh * 1.2, ww * .8, hh * .26, F('#d8b090')); } }
    // signs hung on the fascia (Edobashi's cave)
    if(o.signs && fog < .8){ const sw = .6 * uw; for(let qq = 0; qq < o.signs.length; qq++){ const pair = SIGN[o.signs[qq]]; if(!pair) continue; const spr = sw > pair[0].width * 2.2 ? pair[1] : pair[0], k = sw / spr.width, px = x + (qq ? .5 : -.5) * uw;
        const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .75); blit(spr, px, fy0 + fh * .9, k); cx.globalAlpha = a0; } }
    if(o.name && uw > 10 && fog < .6) R(x - uw * .5, fy0 + fh * .2, uw, fh * .45, F('#1a1c26')); }
  /* A concrete pier face (round 2; Hamazakibashi and Nihonbashi at pixel zoom): board-formed lifts with tie holes, a cap beam, water and
     rust stains running down from the bearings, a drain pipe on brackets, the deck lamps' warm light on one edge; plain when small. */
  function pierArt(x0, y0, pw, ph, uw, F, seed, litR){ if(pw < PX || ph < PX) return; R(x0, y0, pw, ph, F(CON.M));
    const le = Math.max(PX, snp(pw * .12)); R(litR ? x0 + pw - le : x0, y0, le, ph, F(CON.W)); R(litR ? x0 : x0 + pw - le * 1.5, y0, le * 1.5, ph, F(CON.D));
    const cap = Math.max(PX, snp(Math.min(ph * .08, uw * .1))); R(x0 - pw * .1, y0, pw * 1.2, cap, F(CON.H)); R(x0 - pw * .1, y0 + cap, pw * 1.2, PX, F(CON.K));
    if(pw < PX * 5) return;
    const lift = Math.max(PX * 4, snp(uw * .26)); for(let yy = y0 + cap + lift; yy < y0 + ph - PX; yy += lift){ R(x0, yy, pw, PX, F(CON.D));   // the formwork's lifts
      if(pw > PX * 14) for(const u of [.28, .52, .76]) R(x0 + pw * u, yy - lift / 2, PX, PX, F(CON.K)); }   // tie holes
    for(let q = 0; q < 3; q++){ const hv = hash(seed * 3.1 + q * 7.7); if(hv > .7) continue; R(x0 + pw * (.15 + q * .25 + hv * .08), y0 + cap, Math.max(PX, snp(pw * .05)), ph * (.18 + hv * .5), F(q === 1 ? '#3a2a26' : '#262430')); }   // stains from the bearings
    const pxp = x0 + pw * (litR ? .14 : .8), pwp = Math.max(PX, snp(pw * .06)); R(pxp, y0 + cap, pwp, ph - cap, F('#4a505e')); R(pxp, y0 + cap, Math.max(PX, pwp / 2), ph - cap, F('#6e7486'));   // the drain pipe
    for(let yy = y0 + cap + lift * .5; yy < y0 + ph; yy += lift) R(pxp - PX, yy, pwp + PX * 2, PX, F(STL[1])); }   // its brackets
  // the parallel ramp of the junction: it climbs beside the road, then crosses over it on the skew. Each segment of it carries one slice:
  // the soffit (when above the eye), the fascia facing the camera's side, its parapet with a lit coping, its lamps and its piers.
  function rampAt(m){ // m: segments into the jct zone -> { x (centre), h (deck top) } or null
    if(m < 18 || m > 158) return null; const u = (m - 18) / 140, rise = sm(u / .62), cross = sm((u - .6) / .32);
    return { x:lerp(2.95, -3.4, cross), h:-.35 + 2.35 * rise + .25 * cross }; }
  const RW2 = .55;
  function drawRamp(sp, x, y, uw, fog, now){ const j = sp.k, a = rampAt(sp.m), b = rampAt(sp.m + 1); if(!a || !b) return; const t = segs[j]; if(!t) return; const q = t.p2.screen; if(!q.w) return;
    FF = fog; const F = F0, x2 = q.x, y2 = q.y, u2 = q.w, P1 = (X, h) => [x + X * uw, y - h * uw], P2 = (X, h) => [x2 + X * u2, y2 - h * u2];
    const bot = a.h - .34, bot2 = b.h - .34;
    if(bot > .3){ const p = P1(a.x - RW2, bot), pp = P1(a.x + RW2, bot), r = P2(b.x + RW2, bot2), rr = P2(b.x - RW2, bot2); poly(p[0], p[1], pp[0], pp[1], r[0], r[1], rr[0], rr[1], F('#14141c')); }
    // the fascia on the camera's side (the inner face while it runs beside the road)
    const fx = a.x > 0 ? a.x - RW2 : a.x + RW2, fx2 = b.x > 0 ? b.x - RW2 : b.x + RW2, top = Math.max(.02, a.h), top2 = Math.max(.02, b.h);
    if(Math.abs(a.x) > RW2 + .1){ const p = P1(fx, Math.max(0, bot)), r = P2(fx2, Math.max(0, bot2)), pt = P1(fx, top + .22), rt = P2(fx2, top2 + .22);
      poly(p[0], p[1], r[0], r[1], rt[0], rt[1], pt[0], pt[1], F(sp.m & 2 ? '#7e8496' : '#868c9e'));
      const pc = P1(fx, top + .2), rc = P2(fx2, top2 + .2), pd = P1(fx, top + .17), rd = P2(fx2, top2 + .17); poly(pd[0], pd[1], rd[0], rd[1], rc[0], rc[1], pc[0], pc[1], F('#eef0f4'));
      const pe = P1(fx, top), re = P2(fx2, top2); poly(pe[0], pe[1], re[0], re[1], r[0], r[1], p[0], p[1], F('#9a9eae')); }
    else { const p = P1(a.x - RW2, a.h + .22), pp = P1(a.x + RW2, a.h + .22), pb = P1(a.x + RW2, bot), pa = P1(a.x - RW2, bot); if(sp.m % 3 === 0) poly(p[0], p[1], pp[0], pp[1], pb[0], pb[1], pa[0], pa[1], F('#a8acb8')); }
    // an expansion joint every 10 segments (a dark seam down the fascia)
    if(sp.m % 10 === 0 && Math.abs(a.x) > RW2 + .1 && uw > 6){ const p = P1(fx, Math.max(0, bot)), pt = P1(fx, top + .2), pw = Math.max(PX, uw * .012); R(p[0] - pw / 2, pt[1], pw, p[1] - pt[1], F('#4a4e5e')); R(p[0] + pw, pt[1] + (p[1] - pt[1]) * .3, Math.max(PX, uw * .025), (p[1] - pt[1]) * .7, F('#5a4a44')); }   // (and the rust stain that runs down from it)
    if(Math.abs(a.x) > RW2 + .1 && bot > 0 && uw > 4){ const p = P1(fx, bot), r = P2(fx2, bot2), g = Math.max(PX, uw * .03); poly(p[0], p[1] - g, r[0], r[1] - g * u2 / uw, r[0], r[1], p[0], p[1], F('#3a4050')); }   // the girder's bottom flange along the fascia
    // its traffic: tail lights going up the ramp (two cars on a 140-segment loop), seen over its parapet
    for(let k = 0; k < 2; k++){ const cm = 18 + (((now / 1000) * (reduce ? 8 : 14) + k * 70) % 140); if(Math.floor(cm) !== sp.m) continue; const cxm = a.x - (a.x > 0 ? .2 : -.2), [tx, ty] = P1(cxm, top + .26), sz = Math.max(PX, Math.min(PX * 2, Math.round(uw * .03 / PX) * PX));
      R(tx - uw * .1, ty, sz, sz, '#ff3030'); R(tx + uw * .1 - sz, ty, sz, sz, '#ff3030'); glow(tx, ty, Math.min(H * .05, uw * .25), '#ff2a2a', .25 * (1 - fog)); }
    // piers under it, every 12 segments, while it is above the parapet
    if(sp.m % 12 === 0 && bot > .35){ const pw = .26 * uw, px = x + a.x * uw; pierArt(px - pw / 2, y - bot * uw, pw, bot * uw, uw, F, sp.m * 1.7, a.x < 0); }
    // lamps on its parapet, every 16 segments
    if(sp.m % 16 === 8){ const [lx, ly] = P1(a.x + (a.x > 0 ? -RW2 : RW2), top + .9), pw = Math.max(PX, uw * .02); R(lx - pw / 2, ly, pw, uw * .68, F(STL[1])); R(lx - uw * .06, ly, uw * .12, Math.max(PX, uw * .03), fog < .5 ? SOD.core : F(SOD.hot)); glow(lx, ly, Math.min(H * .1, uw * .35), SOD.glow, .25 * (1 - fog)); } }

  // ---------------------------------------------------------------- the view down: one pass, behind everything, clipped to outside the deck
  /* Drawn when the first of our 'bw' markers is drawn at the host segment (the farthest drawn without the draw-distance fade), so every
     other sprite of the frame comes after it. The engine's per-segment clip is lifted for the pass and put back afterwards. What lies
     outside the deck below the horizon: the river (its far bank, bridges, boats and the long reflections) or the city (blocks of low
     buildings, avenues with taxis, crossings with signals). Only the open (railing) side is drawn, and only while a railing is near. */
  let HOST = -1, BWF = -1, OPEN = 0, CAMC = .3, BWZ = null; const DBG = { bw:0, host:0, open:0, err:'' };
  const DW = 1.5;   // the open stretches stand DW half-road widths above the street or the water (lower than the canyon's deck: from a bike's eye height a deeper drop is all hidden by the rail)
  function hostPrep(){ HOST = -1; OPEN = 0; const b = segAt(position).index; if(FKG >= 0 || (SPLIT_LOCK && b < SPLIT_LOCK.G + SPLIT_POST + 40)) return;
    for(let n = 2; n < 110; n++){ const s = segs[b + n]; if(!s || !s.shOpen) continue; OPEN |= s.shOpen; }
    DBG.open = OPEN; if(!OPEN) return; HOST = b + DRAW - EDGE_N - 3; DBG.host = HOST; }
  // projection of a world point at segment-float z, lateral X, height h (prop units): segment p1 screens of this frame, interpolated
  let PX0 = 0, PY0 = 0, PU0 = 0;
  function pj(z, X, h){ const i = Math.floor(z), f = z - i, s = segs[i]; if(!s) return false; const a = s.p1.screen, b = s.p2.screen; if(!a.scale || !b.scale) return false;
    const sx = a.x + (b.x - a.x) * f, sy = a.y + (b.y - a.y) * f, w = a.w + (b.w - a.w) * f; PX0 = sx + X * w; PY0 = sy - h * w; PU0 = w; return true; }
  function bpoly(z1, x1, h1, z2, x2, h2, z3, x3, h3, z4, x4, h4, col){ if(!pj(z1, x1, h1)) return; const ax = PX0, ay = PY0; if(!pj(z2, x2, h2)) return; const bx = PX0, by = PY0;
    if(!pj(z3, x3, h3)) return; const cxx = PX0, cy = PY0; if(!pj(z4, x4, h4)) return; poly(ax, ay, bx, by, cxx, cy, PX0, PY0, col); }
  function belowPass(now){ const b = segAt(position).index, top = Math.min(HOST, b + DRAW - 2), F = null; BWB = b;
    // the camera height in prop units (the engine draws heights in uw): from a segment well ahead
    { const s = segs[b + 40]; if(s && s.p1.screen.w) CAMC = Math.max(.1, (s.p1.screen.y - HZ) / s.p1.screen.w); }
    // the clip: below the horizon, outside the deck's outline (DECK_X), from the nearest drawn segment to the host
    const C = new Path2D(); C.rect(0, HZ, W, H - HZ + PX); let first = true, n0 = -1;
    for(let i = b + 1; i <= top; i++){ const s = segs[i]; if(!s || !s.p1.screen.scale || s.p1.camera.z <= DEPTH) continue; const p = s.p1.screen; if(first){ C.moveTo(p.x - DECK_X * p.w, Math.max(p.y, H + PX * 4)); first = false; n0 = i; } C.lineTo(p.x - DECK_X * p.w, p.y); }
    if(first) return;
    for(let i = top; i >= n0; i--){ const s = segs[i]; if(!s || !s.p1.screen.scale || s.p1.camera.z <= DEPTH) continue; const p = s.p1.screen; C.lineTo(p.x + DECK_X * p.w, i === n0 ? Math.max(p.y, H + PX * 4) : p.y); }
    C.closePath();
    /* (perf) The region C (evenodd) used to be the clip of the whole pass, but every fill under a path clip costs the GPU: ~1,500 of them
       held Shuto's p95 frame at 20-22 ms against 16.9 ms with a rectangle clip (measured, 2026-11-20). So the pass draws unclipped, and
       then the frame as it was before the pass is put back everywhere outside C in one drawImage under the inverse path. Inside C and
       outside it the pixels are the same as before; only the antialiased fringe of C's edge can differ by a blend step. */
    const cw = cv.width, ch = cv.height; if(!BWS || BWS.width !== cw || BWS.height !== ch){ BWS = can(cw, ch); BWSX = BWS.getContext('2d'); }
    BWSX.globalCompositeOperation = 'copy'; BWSX.drawImage(cv, 0, 0);
    cx.save();
    // back to front, by depth: each segment's below-world slice on each open side
    const Z = BWZ || (BWZ = []);
    for(let i = top; i > b; i--){ const s = segs[i]; if(!s || !s.p1.screen.scale) continue; const zk = s.shK === undefined ? 0 : s.shK, rs = s.shRS || 1, n = i - b;
      const cst = n > 200 ? 3 : n > 110 ? 2 : 1; if(zk !== 2 && i % cst) continue;   // the city far below: every 2nd, then 3rd segment far away (its blocks are 36 long)
      for(let side = -1; side <= 1; side += 2){ if(!(OPEN & (side < 0 ? 1 : 2))) continue; if(zk === 2 && side === rs) riverSlice(s, i, side, now, F); else citySlice(s, i, side, now, F, cst); } }
    if(OPEN) moonPath(b, top, now);
    cx.restore();
    const I = new Path2D(); I.rect(-W, -H, W * 3, H * 3); I.addPath(C);   // everything but C (evenodd)
    cx.save(); cx.clip(I, 'evenodd'); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; cx.imageSmoothingEnabled = false; cx.drawImage(BWS, 0, 0); cx.restore(); }
  let BWB = 0, BWI = 0, BWS = null, BWSX = null;   // the view down: its camera segment, the slice being drawn; the frame before it (BWS)
  const bwF = c => fc(c, Math.pow(clamp((BWI - BWB) / DRAW, 0, 1), 1.6));   // a below-world colour fogged by the slice's depth
  // the street below: low blocks (roof, inner face, front face) between avenues every 8 half-road widths and cross streets every 36 segments
  const AV0 = 8.6, AVW = 2.2, BLK = 8, XST = 36, XSTW = 7;
  const atX = (m, st, q) => ((m - q) % XST + XST) % XST < st;   // this slice (m along the 36-segment block, st segments wide) covers block row q
  function citySlice(s, i, side, now, F, st){ st = st || 1; BWI = i; const h0 = -DW, f = bwF, m = ((i % XST) + XST) % XST, cross = m < XSTW, w = s.p1.screen.w;
    if(w < .4) return; const xmax = Math.min(46, (W * .75) / Math.max(1, w) + 4), xmin = Math.max(AV0, DECK_X * (CAMC + DW) / CAMC - 3);
    // the street surface for this slice (asphalt), with the pavement lit warm under the shops
    bpoly(i, side * xmin, h0, i, side * xmax, h0, i + st, side * xmax, h0, i + st, side * xmin, h0, f('#17151d'));
    if(cross){ // a cross street: zebra stripes where it meets each avenue, and a car or two crossing
      if(atX(m, st, 1) || atX(m, st, XSTW - 2)) for(let k = 0; k * BLK + AV0 < xmax; k++){ const xa = AV0 + k * BLK; for(let z = 0; z < 4; z++) bpoly(i, side * (xa + z * .55), h0, i, side * (xa + z * .55 + .3), h0, i + st, side * (xa + z * .55 + .3), h0, i + st, side * (xa + z * .55), h0, f('#9a98a4')); }
      if(atX(m, st, 3)){ const ph = (now / 1000 * .08 + hash(Math.floor(i / XST) * 3.1)) % 1, X = xmin + ph * (xmax - xmin); taxi(i + st, side * X, h0, f, true, hash(Math.floor(i / XST)) < .6);
        const ph2 = (now / 1000 * .06 + hash(Math.floor(i / XST) * 5.3) + .5) % 1; taxi(i + 4, side * (xmax - ph2 * (xmax - xmin)), h0, f, true, false); }
      return; }
    // blocks: from each avenue's far kerb to the next avenue
    for(let k = 0; ; k++){ const xa = AV0 + k * BLK + AVW, xb = AV0 + (k + 1) * BLK; if(xa > xmax) break; const id = Math.floor(i / XST) * 17 + k * 3 + side, bh = h0 + .45 + hash(id * 1.3) * 1.5;
      // lamps along the avenue at this block (every 6 segments)
      if(m % 6 < st){ pj(i, side * (xa - .2), h0 + .55); const sz = Math.max(PX, Math.min(PX * 2, snp(PU0 * .06))); R(PX0 - sz / 2, PY0 - sz / 2, sz, sz, f('#ffe0a0')); if(PU0 > 5) glow(PX0, PY0, Math.min(H * .04, PU0 * .5), SOD.glow, .25); }
      // the roof (seen from above), the face toward the road, and the front face at the block's first segment
      bpoly(i, side * xa, bh, i, side * xb, bh, i + st, side * xb, bh, i + st, side * xa, bh, f(hash(id * 2.1) < .5 ? '#22202a' : '#1c1c26'));
      bpoly(i, side * xa, h0, i + st, side * xa, h0, i + st, side * xa, bh, i, side * xa, bh, f(m & 1 ? '#2c2834' : '#302c38'));
      // its shopfronts: a warm lit band at street level, a neon sign above now and then
      bpoly(i, side * xa, h0 + .04, i + st, side * xa, h0 + .04, i + st, side * xa, h0 + .24, i, side * xa, h0 + .24, f(hash(id + m * .37) < .55 ? '#ffc070' : '#3a2a26'));
      if(hash(id * 4.7 + Math.floor(m / 5)) < .3) bpoly(i, side * xa, h0 + .3, i + st, side * xa, h0 + .3, i + st, side * xa, h0 + .42, i, side * xa, h0 + .42, f(NEON[Math.floor(hash(id * 5.9) * 5)]));
      if(atX(m, st, XSTW)){ bpoly(i, side * xa, h0, i, side * xb, h0, i, side * xb, bh, i, side * xa, bh, f('#26222e')); if(hash(id * 7.7) < .5) bpoly(i, side * (xa + .5), h0 + .3, i, side * (xa + 1.6), h0 + .3, i, side * (xa + 1.6), h0 + .5, i, side * (xa + .5), h0 + .5, f('#ffd890')); }
      // the avenue in front of it: a taxi now and then, running along it
      if(atX(m, st, 20) && k < 3){ const ph = (now / 1000 * (.6 + hash(id) * .5) + hash(id * 3.3)) % 1; taxi(i + (side * (k & 1 ? 1 : -1) > 0 ? ph : 1 - ph) * XST * .9 - 18, side * (xa - AVW * .55), h0, f, false, hash(id * 9.1) < .55); }
      if(atX(m, st, XSTW + 1)){ pj(i, side * (xa - .25), h0 + .5); const sz = Math.max(PX, snp(PU0 * .05)), red = ((now / 1000 + id) % 14) < 8; R(PX0, PY0, sz, sz, red ? '#ff3a2a' : '#2a0a08'); R(PX0, PY0 + sz, sz, sz, red ? '#082a14' : '#3aff9a'); } } }
  // a taxi (black or green with the yellow roof lamp) seen from above: body, cabin, lamps; along the street or across it
  function taxi(z, X, h0, f, across, green){ const ln = across ? .3 : .9, wd = across ? .9 : .42;
    if(!pj(z, X, h0)) return; const u = PU0; if(u * wd < PX * .8) return;
    const x0 = PX0 - u * wd / 2, y0 = PY0 - u * .3, bw = u * wd, bh = u * .3;
    R(x0, y0, bw, bh, f(green ? '#1a5a3a' : '#16141c')); R(x0 + bw * .2, y0 - u * .08, bw * .6, u * .1, f(green ? '#2a7a52' : '#262432')); R(x0 + bw * .42, y0 - u * .12, bw * .16, Math.max(PX, u * .04), '#ffd84a');
    if(!across){ R(x0, y0 + bh * .3, Math.max(PX, bw * .12), Math.max(PX, bh * .25), '#ff3030'); R(x0 + bw - Math.max(PX, bw * .12), y0 + bh * .3, Math.max(PX, bw * .12), Math.max(PX, bh * .25), '#ff3030'); }
    else { R(across && X > 0 ? x0 : x0 + bw - PX, y0 + bh * .3, PX, PX, '#fff0c0'); } }
  // the river: water from the deck to the far bank (RIV), the far bank's wall, promenade lamps and buildings' lower floors, bridges across,
  // boats with lantern rows, and every light laid on the water as a long broken column toward you
  const RIV = 26, DWR = .55;   // the river runs just under the deck (the C1 along the moats is a low causeway): from a bike's eye only a near drop shows the water
  const BRIDGE_X = [9.5, 17.5, RIV - .6];   // the canal bridge's piers
  function riverSlice(s, i, side, now, F){ BWI = i; const h0 = -DWR, f = bwF, w = s.p1.screen.w; if(w < .3) return; const m = s.shM;
    bpoly(i, side * 1.3, h0, i, side * (RIV + .3), h0, i + 1, side * (RIV + .3), h0, i + 1, side * 1.3, h0, f(WATER[(i >> 3) & 1 ? 1 : 0]));
    // a fleck of moonlight on the water, eased (never a flicker)
    if(hash(i * 3.7) < .35){ const X = 4 + hash(i * 1.9) * (RIV - 6), ph = .5 + .5 * Math.sin(now / 1400 + i * 1.7), c = ph > .66 ? WATER[3] : WATER[2]; pj(i, side * X, h0); R(PX0 - PU0 * .6, PY0, Math.max(PX, PU0 * 1.2), PX, f(c)); }
    // the far bank: wall face, promenade, building feet (lit windows), lamps and their columns on the water
    bpoly(i, side * RIV, h0, i + 1, side * RIV, h0, i + 1, side * RIV, h0 + .45, i, side * RIV, h0 + .45, f(i & 2 ? '#34343e' : '#3a3a46'));
    bpoly(i, side * RIV, h0 + .45, i, side * (RIV + 3.5), h0 + .45, i + 1, side * (RIV + 3.5), h0 + .45, i + 1, side * RIV, h0 + .45, f('#26242c'));
    const B = bldAt(i, side, 1); if(B && B.x0 > 20){ bpoly(i, side * B.x0, h0 + .45, i + 1, side * B.x0, h0 + .45, i + 1, side * B.x0, 0, i, side * B.x0, 0, f(B.S.face[1]));
      for(let fl = 0; fl < 3; fl++){ const st = floorState(B, fl + 30, Math.floor((i - B.b0) / 7)); if(!st) continue; const y0 = h0 + .45 + fl * FH + B.S.win[0], y1 = h0 + .45 + fl * FH + B.S.win[1];
        bpoly(i, side * B.x0, y0, i + 1, side * B.x0, y0, i + 1, side * B.x0, y1, i, side * B.x0, y1, f(st === 2 || fl === 0 ? B.S.warm : B.S.lit[0]));
        if(fl === 0 && (i & 1)) refl(i, side * B.x0, y1, '255,200,120', .2, f, now); } }
    if(i % 14 === 0){ pj(i, side * (RIV + .4), h0 + 1.1); const sz = Math.max(PX, Math.min(PX * 2, snp(PU0 * .08))); R(PX0 - sz / 2, PY0, sz, sz, '#fff0c8'); glow(PX0, PY0, Math.min(H * .04, Math.max(PX * 2, PU0 * .6)), SOD.glow, .3); refl(i, side * (RIV + .4), h0 + 1.1, '255,190,110', .45, f, now); }
    // a bridge across the river every 92 segments of the zone: its face, three spans on piers, lamps along it, a car or two crossing
    if(m % 92 === 46){ const hb = h0 + .42, ht = h0 + .26; bpoly(i, side * 1.3, ht, i, side * (RIV + 3), ht, i, side * (RIV + 3), hb, i, side * 1.3, hb, f('#4a4652'));   // a low canal bridge just over the water (it passes under the deck): its face
      bpoly(i, side * 1.3, hb, i, side * (RIV + 3), hb, i, side * (RIV + 3), hb + .05, i, side * 1.3, hb + .05, f('#8a8494'));
      for(const X of BRIDGE_X) bpoly(i, side * X, h0, i, side * (X + .8), h0, i, side * (X + .8), ht, i, side * X, ht, f('#2c2a34'));
      for(let X = 3; X < RIV + 2; X += 2.6){ pj(i, side * X, hb + .3); const sz = Math.max(PX, Math.min(PX * 2, snp(PU0 * .07))); R(PX0 - sz / 2, PY0, sz, sz, '#fff4d0'); glow(PX0, PY0, Math.min(H * .04, Math.max(PX * 2, PU0 * .5)), '#ffb060', .28); if(X < RIV - 2) refl(i, side * X, hb + .3, '255,200,130', .4, f, now); }
      const ph = (now / 1000 * .09 + hash(i)) % 1; taxi(i, side * (2 + ph * (RIV - 1)), hb, f, true, hash(i * 2.3) < .5); }
    // boats: yakatabune, roofed and lantern-lined, idling up and down the river
    for(let k = 0; k < 2; k++){ const L0 = 340, ph = ((now / 1000) * (k ? .9 : -.7) + hash(s.shA * .3 + k) * L0) % L0, bz = s.shA + ((ph % L0) + L0) % L0; if(Math.floor(bz) !== i) continue;
      const X = side * (12 + k * 6.5); boat(bz, X, h0, f, now); } }
  function boat(z, X, h0, f, now){ if(!pj(z, X, h0)) return; const u = PU0, bw = u * 2.4, bh = u * .22, x0 = PX0 - bw / 2, y0 = PY0 - bh; if(bw < PX * 2) return;
    R(x0, y0, bw, bh, f('#2a1a14')); R(x0 + bw * .08, y0 - u * .26, bw * .84, u * .26, f('#c87a3a')); R(x0 + bw * .1, y0 - u * .22, bw * .8, u * .14, f('#ffd890'));
    R(x0 + bw * .04, y0 - u * .34, bw * .92, Math.max(PX, u * .08), f('#1a1418'));
    for(let k = 0; k < 7; k++){ const lx = x0 + bw * (.1 + k * .13); R(lx, y0 - u * .26, Math.max(PX, u * .06), Math.max(PX, u * .08), '#ff4a2a'); }
    glow(PX0, y0 - u * .15, Math.min(H * .06, bw * .6), '#ff8a3a', .22);
    refl(z, X, h0 + .3, '255,140,70', .35, f, now, bw * .6); }
  // a light's reflection on the water: a column from the water line toward the viewer, in dashes that ease slowly (never re-rolled)
  function refl(z, X, hl, rgb, a, f, now, wid){ if(!pj(z, X, -DWR)) return; const xw = PX0, yw = PY0, u = PU0; pj(z, X, -DWR - (hl + DWR) * 1.8); const ym = PY0, len = ym - yw; if(len < PX) return;
    const wd = Math.max(PX, wid || u * .14), seed = z * 1.37 + X * .71; cx.globalCompositeOperation = 'lighter';
    for(let k = 0; k < 5; k++){ const t = reduce ? 0 : now / 2600, e = .5 + .5 * Math.sin(t + hash(seed + k) * 6.3), y0 = yw + len * (k / 5 + .03 * e), hh = len * (.12 + .06 * e) * (1 - k * .12);
      cx.fillStyle = 'rgba(' + rgb + ',' + (a * (1 - k * .17)).toFixed(3) + ')'; pxRect(xw - wd / 2 + (hash(seed + k * 3) - .5) * wd * .8, y0, wd * (1 - k * .1), Math.max(PX, hh)); }
    cx.globalCompositeOperation = 'source-over'; }
  // the moon's path on the river: dashes under the moon down the river's rows (inside the clip)
  function moonPath(b, top, now){ const mx = MOON.x; if(MOON.y > HZ) return; let yA = -1, yB = -1;
    for(let i = b + 2; i < top; i += 2){ const s = segs[i]; if(!s || s.shK !== 2 || !s.p1.screen.w) continue; const side = s.shRS || 1; if((mx - s.p1.screen.x) * side < DECK_X * s.p1.screen.w * 3) continue;
      if(!pj(i, side * 10, -DWR)) continue; if(yA < 0 || PY0 > yA) yA = PY0; if(yB < 0 || PY0 < yB) yB = PY0; }
    if(yA < 0) return; cx.globalCompositeOperation = 'lighter';
    for(let y = Math.max(HZ + PX, yB); y < yA; y += PX * 2){ const k = (y - HZ) / Math.max(1, yA - HZ), e = .5 + .5 * Math.sin((reduce ? 0 : now / 1700) + y * .37), wd = PX * (2 + Math.round(k * 10 * hash(y * .13)));
      if(hash(Math.round(y / PX) * .71) < .45) continue; cx.fillStyle = 'rgba(240,226,190,' + (.12 + .1 * e).toFixed(3) + ')'; pxRect(mx - wd / 2, y, wd, PX); }
    cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- placement
  function place(i, s, L){ const Z = zoneAt(i), rs = riverSide(Z.B), kid = KIND_ID[Z.k], sp = s.sprites;
    s.shK = kid; s.shM = Z.m; s.shA = Z.a; s.shRS = rs; s.shB = Z.B; s.shOpen = 0;
    sp.push({ env:KEY, type:'bw', x:0, k:i });
    // buildings: back rows, then street rows (nearer draws over)
    for(const row of [2, 1, 0]) for(const side of [-1, 1]){ if(row === 2 && AB_R2) continue; const B = bldAt(i, side, row); if(B) sp.push({ env:KEY, type:'bld', x:side * B.x0, k:i, b:B }); }
    // the deck: parapets each side, lamps, gantries
    s.shPK = 0; for(const side of [-1, 1]){ const kd = parKind(i, side, Z); if(kd === 'rail') s.shOpen |= side < 0 ? 1 : 2; s.shPK |= (kd === 'rail' ? 3 : kd === 'snd' ? 2 : 1) << (side < 0 ? 0 : 2);
      const o = { env:KEY, type:'par', x:side * PAR_X, k:i, s, side, kd };
      if(Math.abs(s.curve) >= 3.4 && Math.sign(s.curve) === -side && kd !== 'rail' && i % 10 === 0) s.shCv = (s.shCv || 0) | (side < 0 ? 1 : 2);   // a chevron board's first segment (it spans 3)
      if(side < 0 && i % 240 === 120 && kd === 'con') o.phone = 1;
      if(side > 0 && i % 150 === 75 && kd !== 'rail') o.km = ((i - Z.B) / 150 * .2 + 1.2);
      sp.push(o); }
    if(Z.k !== 'jct' && Z.k !== 'trench'){ for(const side of [-1, 1]) if(((i + (side > 0 ? LAMP_EVERY / 2 : 0)) % LAMP_EVERY) === 0){ sp.push({ env:KEY, type:'lamp', x:side * 1.16, k:i, h:parKind(i, side, Z) === 'snd' ? 2 : 1.85 });
        } }   // (their images on the wet deck: wetSrc, through env/roadmat.js's pools)
    // the junction: the stack of crossing decks, the climbing ramp; the trench: street bridges every 22 segments
    if(Z.k === 'jct'){ const m = Z.m;
      if(m >= 52 && m < 60) sp.push({ env:KEY, type:'xd', x:0, k:i, o:{ b0:Z.a + 52, dep:8, h0:1.3, h1:1.72, span:9, pier:1.45, signs:[PANELS.indexOf(PANELS[4]), PANELS.indexOf(PANELS[5])] } });
      if(m >= 138 && m < 146) sp.push({ env:KEY, type:'xd', x:0, k:i, o:{ b0:Z.a + 138, dep:8, h0:2.45, h1:2.85, span:9, pier:0 } });
      if(rampAt(m)) sp.push({ env:KEY, type:'ramp', x:rampAt(m).x, k:i, m });
      if(m % LAMP_EVERY === 4 && m > 8 && m < 165) for(const side of [-1, 1]) sp.push({ env:KEY, type:'lamp', x:side * 1.16, k:i, h:1.15, arm:.22 }); }
    if(Z.k === 'trench'){ const m = Z.m % 22; if(Z.m > 8 && Z.m < 82 && m < 3) sp.push({ env:KEY, type:'xd', x:0, k:i, o:{ b0:Z.a + Z.m - m, dep:3, h0:1.05, h1:1.3, span:9, pier:0, street:true } });
      if(Z.m % LAMP_EVERY === 6) for(const side of [-1, 1]) sp.push({ env:KEY, type:'lamp', x:side * 1.16, k:i, h:1.0, arm:.2 }); }
    // gantries: every 220 segments where the deck is plain, and one at the junction's entry
    if((Z.k === 'canyon' || Z.k === 'towers') && (i - Z.B) % 220 === 110 && Z.m > 10 && Z.b - i > 10) sp.push({ env:KEY, type:'gant', x:0, k:i, v:Math.floor(hash(i * .13) * GANTRIES.length) });
    if(Z.k === 'jct' && Z.m === 10) sp.push({ env:KEY, type:'gant', x:0, k:i, v:2 });
  }
  function lit(i, s){ const k = s.shK; if(k === 1){ const m = s.shM; if((m >= 52 && m < 60) || (m >= 138 && m < 146)) return .55; return Math.max(0, 1 - Math.min(Math.abs((m % LAMP_EVERY) - 4), LAMP_EVERY - Math.abs((m % LAMP_EVERY) - 4)) / 3) * .7; }
    if(k === 5) return .45 + .3 * Math.max(0, 1 - Math.abs((s.shM % LAMP_EVERY) - 6) / 3);
    const d = Math.min(i % (LAMP_EVERY / 2), LAMP_EVERY / 2 - i % (LAMP_EVERY / 2)); return Math.max(0, 1 - d / 3.2) * .85; }

  // ---------------------------------------------------------------- the road surface
  /* Beyond the deck, on the engine's ground plane (the deck's own level): the ground never shows (Kellan, 2026-11-23). Out to the street
     row, the street far below the deck's edge: a dark slot with its lamps; beyond it the flat roofs of the low blocks between the rows, in
     world-anchored cells (9 segments by ~3 half-road widths) of five roof tones, their parapet lines, plant boxes and a lit stair hatch
     now and then, all coarser with distance (one band per side far away). On an open side the view down is drawn over it. */
  let EYE = .3;   // the camera's height over the deck in prop units (half-road widths), measured each frame in backdrop()
  const ROOFC = ['#1a1822', '#201c28', '#17161f', '#1d1f27', '#231d22'], VOIDC = ['#0c0a12', '#0e0b14'];
  function bq(a, b, sd, X1, X2, col){ poly(a.x + sd * X1 * a.w, a.y, a.x + sd * X2 * a.w, a.y, b.x + sd * X2 * b.w, b.y, b.x + sd * X1 * b.w, b.y, col); }
  function belowDeck(s, a, b, fog, f, sd){ const i = s.index, XF = Math.max(60, W * 1.6 / Math.max(.5, b.w)), cl = Math.floor(i / 9), XV = 2.5;
    // (perf) the parapet hides the ground plane out to Xh (the eye's ray over its top; the eye height EYE is measured each frame: low at
    // desktop, high in portrait). The band just behind the parapet is always drawn (the parapet's slices leave pixel seams, which must show
    // the street's dark, not ground); the roofs beyond are drawn only where the eye can reach them
    const pk = sd < 0 ? s.shPK & 3 : s.shPK >> 2, ph = pk === 2 ? PH.snd : pk === 3 ? PH.rail : PH.con, Xh = s.shPK === undefined ? 0 : EYE > ph + .01 ? PAR_X * EYE / (EYE - ph) * .9 : 1e9;
    const B0 = bldAt(i, sd, 0);   // (behind a street-row building the ground plane is hidden from its face on: only the street below the deck is drawn)
    if(!B0 && Xh >= XF){ bq(a, b, sd, DECK_X, XF, f(fog > .16 ? '#0e0c14' : VOIDC[(i >> 2) & 1])); return; }   // all hidden but the parapet's seams: one band
    if(B0){ const rc = f(ROOFC[Math.floor(hash(cl * 1.3 + sd) * 5)]);   // (on a bend the eye sees behind a building's end: the roofs beyond it are drawn too, as one band)
      if(fog > .16){ bq(a, b, sd, DECK_X, XF, f('#0e0c14')); return; } bq(a, b, sd, DECK_X, B0.x0 + .05, f(VOIDC[(i >> 2) & 1])); bq(a, b, sd, B0.x0 + .05, XF, rc); if(!(i % 12 === 0 && a.w > 8)) return; }
    else if(fog > .16){ bq(a, b, sd, DECK_X, XF, f(ROOFC[Math.floor(hash(cl * 1.3 + sd) * 5)])); return; }
    else bq(a, b, sd, DECK_X, XV, f(VOIDC[(i >> 2) & 1]));   // the street below the deck's edge
    if(i % 12 === 0 && a.w > 8){ const lx = a.x + sd * 1.9 * a.w, sz = Math.max(PX, Math.min(PX * 2, snp(a.w * .025))); cx.fillStyle = f('#ffcf80'); pxRect(lx - sz / 2, a.y - sz, sz, sz); }   // its lamps, seen far below
    if(B0) return;
    // the roofs: cells across, each its own tone, a parapet line on its near edge
    let X = XV; for(let k = 0; X < XF; k++){ const w = 2.2 + hash(cl * 3.7 + k * 1.9 + sd) * 2.4, X2 = Math.min(XF, X + w), hv = hash(cl * 5.1 + k * 2.3 + sd * 7);
      bq(a, b, sd, X, X2, f(ROOFC[Math.floor(hv * 5)]));
      if(fog < .06 && k < 4){ if(i % 9 === 0) bq(a, b, sd, X, X2, f('#2c2834'));   // the cell's parapet toward you
        bq(a, b, sd, X, X + .08, f('#2a2632'));
        if(hv > .7 && (i % 9) >= 3 && (i % 9) < 5) bq(a, b, sd, X + w * .3, X + w * .3 + .5, f(hv > .9 ? '#e8c890' : '#34303c')); }   // a plant box, or a lit stair hatch
      X = X2; if(k > 4 || fog > .06 && k > 1){ if(X < XF) bq(a, b, sd, X, XF, f(ROOFC[Math.floor(hash(cl * 1.3 + sd) * 5)])); break; } } }
  /* The low roofs' clutter (round 2, Kellan via the coordinator: "make them real rooftops"): FRP water tanks on steel stands, condenser
     rows, stair huts (some with a lit door), antenna masts with a red light, lit skylights; baked once into one atlas (RFA) as pixel
     sprites in two or three variants each, then placed on the floor's roof cells world-anchored by hash (one chance per cell per 9
     segments, its kind, variant and place in the cell all hashed: no two neighbouring roofs alike). Drawn in the parapet pass (near only,
     never on an open side) and only short of the nearest building, so the sprite order hides them correctly. */
  const RFS = 24;   // sprite px per half-road width
  let RFA = null; const RFR = {};   // the atlas, and each sprite's rect { x, y, w, h }
  function buildRoofAtlas(){ const c = can(160, 40), k = c.getContext('2d'); let cx0 = 0; const put = (id, w, h, fn) => { RFR[id] = { x:cx0, y:40 - h, w, h }; const R2 = (x, y, ww, hh, col) => { k.fillStyle = col; k.fillRect(cx0 + x, 40 - h + y, ww, hh); }; fn(R2, w, h); cx0 += w + 1; };
    for(let v = 0; v < 2; v++) put('tank' + v, 12 + v * 2, 14, (R, w, h) => { const tw = w - 2; R(2, h - 5, 1, 5, '#2a2e38'); R(w - 3, h - 5, 1, 5, '#2a2e38'); R(1, h - 6, w - 2, 1, '#3a404c');   // the steel stand
      R(1, 1, tw, h - 7, v ? '#6a7488' : '#5a6878'); R(1, 1, tw, 1, '#9aa6b8'); R(1 + tw - 2, 1, 2, h - 7, v ? '#4a5262' : '#424e5e');   // the FRP tank: lit top, its shaded end
      for(let x = 4; x < tw; x += 3) R(1 + x, 2, 1, h - 9, v ? '#5a6476' : '#4c5868'); R(1, Math.floor((h - 6) / 2), tw, 1, '#4c5868'); R(3, 0, 3, 1, '#2a2e38'); });   // panel joints, the manhole
    for(let v = 0; v < 2; v++) put('ac' + v, 9 + v * 6, 6, (R, w, h) => { R(0, 1, w, h - 1, '#4a4e5a'); R(0, 1, w, 1, '#7a7e8c'); for(let x = 1; x + 3 < w; x += 5){ R(x, 2, 3, 3, '#1c1e26'); R(x + 1, 3, 1, 1, '#5a5e6a'); } R(0, h - 1, w, 1, '#2a2c36'); });   // condensers, their fans
    for(let v = 0; v < 3; v++) put('hut' + v, 14, 13, (R, w, h) => { R(0, 2, w, h - 2, v === 1 ? '#3e3844' : '#363a46'); R(0, 2, w, 1, '#5a5664'); R(-0, 0, w, 2, '#2a2830'); R(w - 3, 3, 3, h - 3, '#2a2e38');   // a stair hut: its roof slab, its shaded side
      R(3, 6, 4, h - 6, v === 2 ? '#1a1820' : '#ffd890'); if(v !== 2){ R(3, 6, 4, 1, '#fff2c8'); R(8, 6, 2, 2, '#ffcf80'); } R(1, 4, 1, 1, '#2adf80'); });   // the door, lit (or not), a small window, the exit sign
    put('mast', 5, 26, (R, w, h) => { R(2, 2, 1, h - 2, '#5a6070'); R(0, 6, 5, 1, '#5a6070'); R(1, 11, 3, 1, '#5a6070'); R(1, 16, 3, 1, '#4a5060'); R(1, h - 2, 3, 2, '#2a2e38'); });   // an antenna mast (its red light is drawn live)
    put('sky', 10, 3, (R, w, h) => { R(0, 0, w, h, '#3a3440'); R(1, 1, w - 2, 1, '#e8c890'); });   // a lit skylight, edge on
    RFA = c; }
  const RFK = ['tank0', 'tank1', 'ac0', 'ac1', 'hut0', 'hut1', 'hut2', 'mast', 'sky', 'ac0', 'tank0', 'hut2'];
  function roofProps(z, sd, now){ const sg = segs[z]; if(!sg || !sg.p1.screen.w) return; const p = sg.p1.screen, uw = p.w; if(uw < 5) return;
    const cl = Math.floor(z / 9), slot = z - cl * 9; let lim = 99; for(let r = 0; r < 3; r++){ const B = bldAt(z, sd, r); if(B && B.x0 < lim) lim = B.x0; }   // nothing past the nearest building at this segment
    let X = 2.5; for(let k = 0; k < 5 && X < lim; k++){ const w = 2.2 + hash(cl * 3.7 + k * 1.9 + sd) * 2.4, hv = hash(cl * 11.3 + k * 4.1 + sd * 2.7);   // (the floor's own cells: belowDeck)
      if(hv < .62 && slot === Math.floor(hash(cl * 2.9 + k + sd) * 9)){ const id = RFK[Math.floor(hash(cl * 5.7 + k * 3.3 + sd) * RFK.length)], r = RFR[id], X0 = X + w * (.15 + hv * .9);
        if(r && X0 + r.w / RFS < lim - .1){ const kk = uw / RFS, sx = Math.round((p.x + sd * X0 * uw) / PX) * PX, sy = Math.round(p.y / PX) * PX, dw = Math.max(PX, Math.round(r.w * kk / PX) * PX), dh = Math.max(PX, Math.round(r.h * kk / PX) * PX);
          if(sx > -dw && sx < W + dw){ cx.imageSmoothingEnabled = false; cx.drawImage(RFA, r.x, r.y, r.w, r.h, sx - (sd < 0 ? dw : 0), sy - dh, dw, dh);
            if(id === 'mast' && (reduce || ((now / 1000) * .55 + hv * 3) % 1 < .55)){ const ls = Math.max(PX, Math.min(PX * 2, snp(kk * 2))); R(sx - (sd < 0 ? dw : 0) + dw / 2 - ls / 2, sy - dh - ls, ls, ls, AVL); } } } }
      X += w; } }
  /* The wet deck's light (round 2; the roadmat preset 'shuto' turns the pools on): every light that stands over the deck lays its image on
     it through env/roadmat.js's POOL: the sodium heads of the lamps, the gantries' green panels and red message boards, the junction's soffit
     lights. Harder and longer on drizzle visits. */
  function wetSrc(s, n, a, P){ const uw = a.w; if(!(uw > .5)) return; const wv = s.shB !== undefined && wetVisit(s.shB) ? 1 : .55;
    for(const sp of s.sprites){ if(sp.env !== KEY) continue;
      if(sp.type === 'lamp'){ const dir = -Math.sign(sp.x), h = sp.h || 1.85, lx = a.x + (sp.x + dir * (sp.arm || .36)) * uw; P(lx, a.y, uw, h - .06, h, uw * .16, '#ffb060', .85 * wv); }
      else if(sp.type === 'gant' && sp.v >= 0){ const G = GANTRIES[sp.v % GANTRIES.length], pos = G.length === 2 ? GPOS2 : GPOS3; for(let q = 0; q < G.length; q++) P(a.x + pos[q] * uw, a.y, uw, 1.28, 1.6, uw * .62, '#2adf80', .32 * wv);
        P(a.x - .55 * uw, a.y, uw, 1.72, 1.92, uw * 1.3, '#ff4a20', .28 * wv); }
      else if(sp.type === 'xd' && !sp.o.street && sp.k === sp.o.b0 + 1) for(let k = -4; k <= 4; k += 2) P(a.x + k * .8 * uw, a.y, uw, sp.o.h0 - .02, sp.o.h0, uw * .14, '#ffd080', .4 * wv); } }
  const RED = '#4e2624';
  function roadFX(s, a, b, fog, f, now){ if(a.y - b.y < .5) return;
    // the deck's margin beyond the road edge, out to the parapet foot (concrete, lit warm under the lamps)
    const mc = f(s.lit > .3 ? '#3a3238' : '#26252f');
    if(fog > .16 && !AB_FL){ const fc2 = f(s.lit > .3 ? '#221e26' : '#16141c'), XF = Math.max(60, W * 1.6 / Math.max(.5, b.w)); bq(a, b, -1, 1, XF, fc2); bq(a, b, 1, 1, XF, fc2); }   // (perf, round 2: far away the deck's margin, the street below and the roofs are one band each side)
    else { poly(a.x - a.w, a.y, a.x - a.w * DECK_X, a.y, b.x - b.w * DECK_X, b.y, b.x - b.w, b.y, mc); poly(a.x + a.w, a.y, a.x + a.w * DECK_X, a.y, b.x + b.w * DECK_X, b.y, b.x + b.w, b.y, mc);
      if(!AB_FL){ belowDeck(s, a, b, fog, f, -1); belowDeck(s, a, b, fog, f, 1); } }
    // the red anti-skid paint on the sharp bends (and through the junction), eased in and out over the segments either side
    const c = Math.abs(s.curve), rw = s.shK === 1 && s.shM > 60 && s.shM < 140 ? 1 : clamp((c - 4.3) / .5, 0, 1);   // (only the sharpest bends: this road's curve scale runs to about 4.6)
    if(rw > .1){ const col = f(mixc(s.stripe ? '#26262f' : '#282832', RED, Math.round(rw * 4) / 4)); poly(a.x - a.w * .985, a.y, a.x + a.w * .985, a.y, b.x + b.w * .985, b.y, b.x - b.w * .985, b.y, col); }
    // an expansion joint across the deck every 42 segments: a steel strip at the segment's near edge, its finger teeth catching the light
    if(s.index % 42 === 0){ const t = Math.max(PX, (a.y - b.y) * .18), jc = f('#121218'); poly(a.x - a.w * DECK_X, a.y - t, a.x + a.w * DECK_X, a.y - t, a.x + a.w * DECK_X, a.y, a.x - a.w * DECK_X, a.y, jc);
      if(a.w > 60){ cx.fillStyle = f('#6a6470'); const st = Math.max(PX * 3, snp(a.w * .05)); for(let X = a.x - a.w * DECK_X; X < a.x + a.w * DECK_X; X += st) pxRect(X, a.y - t, PX, Math.max(PX, t * .6)); } }
    // solid white edge lines (no rumble kerbs on the Shuto)
    const lc = f('#c8c6d0'); poly(a.x - a.w * .965, a.y, a.x - a.w * .935, a.y, b.x - b.w * .935, b.y, b.x - b.w * .965, b.y, lc); poly(a.x + a.w * .935, a.y, a.x + a.w * .965, a.y, b.x + b.w * .965, b.y, b.x + b.w * .935, b.y, lc); }

  // ---------------------------------------------------------------- the far skyline (built in warm at native resolution)
  function* buildSkyG(){ const hgt = 120, c0 = can(SW, hgt), c1 = can(SW, hgt), k0 = c0.getContext('2d'), k1 = c1.getContext('2d'); yield; let sd = 1234567; yield;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647, av = []; yield;
    // the far layer: a carpet of lights at the horizon, then hazy towers
    for(let x = 0; x < SW; x++){ for(let y = hgt - 6; y < hgt; y++){ const r = rnd(); k0.fillStyle = r < .1 ? '#c8a878' : r < .16 ? '#8a9ac0' : '#151428'; k0.fillRect(x, y, 1, 1); }  yield; } yield;
    for(let t = 0; t < 120; t++){ const w = 4 + Math.floor(rnd() * 12), h = 6 + Math.floor(rnd() * rnd() * 40), x0 = Math.floor(rnd() * SW); for(let x = x0; x < x0 + w; x++) for(let y = hgt - 6 - h; y < hgt - 5; y++){ const xx = x % SW;
        k0.fillStyle = (x - x0) % 2 === 1 && (y % 2 === 0) && rnd() < .22 ? (rnd() < .7 ? '#7a86a8' : '#a08a6a') : x === x0 ? '#1e1e36' : '#18182c'; k0.fillRect(xx, y, 1, 1); }
      if(h > 26) av.push([ (x0 + (w >> 1)) % SW, hgt - 7 - h, 0 ]);  yield; } yield;
    /* the city wall (2026-11-24): an unbroken band of mid-rise blocks between the far haze and the named towers, so no gap between the
       rows ever opens onto sky at the horizon (Route 5 at night from above: blocks shoulder to shoulder, most windows dark, warm stair
       cores lit floor by floor, red lights on the taller roofs) */
    const c2 = can(SW, hgt), k2 = c2.getContext('2d'), av2 = []; yield;
    for(let x0 = 0; x0 < SW;){ const w = 3 + Math.floor(rnd() * 7), h = 7 + Math.floor(rnd() * rnd() * 24), face = rnd() < .5 ? '#121228' : '#16162e', core = rnd() < .18 ? x0 + 1 + Math.floor(rnd() * (w - 2)) : -1, warm = rnd() < .35;
      for(let x = x0; x < Math.min(SW, x0 + w); x++) for(let y = hgt - h; y < hgt; y++){ let col = x === x0 ? '#1c1c38' : y === hgt - h ? '#24243e' : face;
        if(x === core && (y - (hgt - h)) % 2 === 1 && y < hgt - 1) col = '#d8a860';   // a stair core, lit floor by floor
        else if((x - x0) % 2 === 1 && (y - (hgt - h)) % 2 === 1 && y < hgt - 1 && rnd() < .16) col = warm ? '#c8a070' : '#8a9ac8';
        k2.fillStyle = col; k2.fillRect(x, y, 1, 1); }
      if(h > 22) av2.push([(x0 + (w >> 1)) % SW, hgt - h - 1, 1]); x0 += w; if((x0 & 31) < 8) yield; }
    for(let x = 0; x < SW; x++){ const r = rnd(); k2.fillStyle = r < .3 ? '#5a3a2a' : '#2a1e24'; k2.fillRect(x, hgt - 1, 1, 1); } yield;   // the sodium-lit street line at its feet
    // the near layer: towers with lit windows, Shinjuku's cluster and Tokyo Tower
    const tower = (x0, w, h, face, lit, edge) => { for(let x = x0; x < x0 + w; x++) for(let y = hgt - h; y < hgt; y++){ const xx = ((x % SW) + SW) % SW; let col = face;
        if(x === x0) col = edge; else if((x - x0) % 2 === 0 && (y - (hgt - h)) % 2 === 1 && y < hgt - 2 && rnd() < lit) col = rnd() < .75 ? '#dce8ff' : '#ffd890'; k1.fillStyle = col; k1.fillRect(xx, y, 1, 1); }
      av.push([((x0 + 1) % SW + SW) % SW, hgt - h - 1, 1]); if(w > 6) av.push([((x0 + w - 2) % SW + SW) % SW, hgt - h - 1, 1]); }; yield;
    for(let t = 0; t < 46; t++){ const w = 5 + Math.floor(rnd() * 10), h = 10 + Math.floor(rnd() * rnd() * 46), x0 = Math.floor(rnd() * SW); if((x0 > 250 && x0 < 400) || (x0 > 720 && x0 < 800)) continue; tower(x0, w, h, '#101020', .26, '#262640');  yield; } yield;
    // Shinjuku (west): Keio Plaza, Sumitomo's prism, Mitsui, NS, and Tocho's twin crowned towers
    tower(262, 12, 52, '#1e2236', .5, '#5a6280'); yield; tower(276, 6, 46, '#1e2236', .45, '#5a6280'); yield;   // Keio Plaza's two slabs
    { const x0 = 300, h = 74; yield; for(let x = 0; x < 16; x++) for(let y = hgt - h; y < hgt; y++){ const top = hgt - h + (x < 6 ? 6 - x : 0); if(y < top) continue; const lf = x < 8;
        let col = lf ? '#2a3048' : '#1c2034'; if(x % 2 === 1 && y % 2 === 0 && y > top + 1 && rnd() < .36) col = '#dfe9ff'; if(x === 0 || y === top) col = '#56607e'; k1.fillStyle = col; k1.fillRect(x0 + x, y, 1, 1); } yield; av.push([x0 + 10, hgt - h - 1, 1]); yield; } yield;   // Sumitomo
    { const x0 = 322, h = 70; yield; for(let x = 0; x < 13; x++) for(let y = hgt - h; y < hgt; y++){ let col = '#0e0e18'; if(y % 3 === 0 && x > 0 && x < 12 && rnd() < .6) col = '#a0b4d8'; if(x === 0) col = '#2a2a3c'; k1.fillStyle = col; k1.fillRect(x0 + x, y, 1, 1); } yield; av.push([x0 + 1, hgt - h - 1, 1]); yield; av.push([x0 + 11, hgt - h - 1, 1]); yield; } yield;   // Mitsui, dark with lit bands
    { const x0 = 340, h = 62; yield; for(let x = 0; x < 14; x++) for(let y = hgt - h; y < hgt; y++){ let col = x < 3 ? '#3a3e56' : '#24283c'; if(x > 3 && x % 2 === 0 && y % 2 === 0 && rnd() < .42) col = '#e6eeff'; if(x === 3) col = '#4a4e66'; k1.fillStyle = col; k1.fillRect(x0 + x, y, 1, 1); } yield; av.push([x0 + 7, hgt - h - 1, 1]); yield; } yield;   // NS
    // Tocho: a wide base to two thirds of its height, then two towers stepping in to their crowns; pale granite floodlit, a dense grid of windows
    { const x0 = 362, h = 92, base = 58; yield; const px = (x, y, col) => { k1.fillStyle = col; k1.fillRect(x0 + x, hgt - 1 - y, 1, 1); }; yield;
      for(let y = 0; y < base; y++) for(let x = 0; x < 30; x++){ let col = x < 15 ? '#6a7088' : '#4a4e66'; if(x % 2 === 1 && y % 2 === 0 && y > 2) col = rnd() < .5 ? '#f0f4ff' : (x < 15 ? '#4a5068' : '#363a50'); if(x === 0) col = '#9aa0b8'; px(x, y, col); } yield;
      for(const tx of [1, 17]) for(let y = base; y < h; y++){ const st = y > h - 6 ? 3 : y > h - 14 ? 2 : y > h - 22 ? 1 : 0, wdt = 12 - st * 2, xs = tx + st; for(let x = xs; x < xs + wdt; x++){ let col = x < xs + wdt / 2 ? '#727892' : '#50546c';
          if((x - xs) % 2 === 1 && y % 2 === 0 && y < h - 2) col = rnd() < .55 ? '#f4f6ff' : '#454a62'; if(x === xs) col = '#a0a6be'; if(y === h - 1 || y === h - 6 || y === h - 14 || y === h - 22) col = '#a8aec6'; px(x, y, col); } av.push([x0 + tx + 5, hgt - 1 - h - 1, 1]); } yield; } yield;
    // Tokyo Tower (south-east): an orange lattice tapering to the main deck, a white-lit deck, the upper deck, the antenna
    { const x0 = 760, h = 96, px = (x, y, col) => { k1.fillStyle = col; k1.fillRect(x0 + x, hgt - 1 - y, 1, 1); }, md = 40, ud = 68; yield;
      for(let y = 0; y < h; y++){ const hw = y < md ? 13 - y * 9 / md : y < ud ? 4 - (y - md) * 2.5 / (ud - md) : y < 80 ? 1.5 : .5;
        for(let x = -Math.ceil(hw); x <= Math.ceil(hw); x++){ const ax = Math.abs(x), edge = ax >= Math.floor(hw) - (y < md ? 1 : 0); let col = null;
          if(y < md){ if(edge || (x + y) % 4 === 0 || (y % 6 === 0) || (y < 8 && ax < 3 && (y + x) % 2)) col = edge ? '#ffb070' : '#ff7a24'; }
          else if(y < 80){ if(ax <= hw) col = (y + ax) % 3 === 0 ? '#ffd090' : '#ff8a30'; }
          else col = '#ffe8c8'; if(y >= md && y < md + 4 && ax <= 6) col = y === md + 1 || y === md + 2 ? (ax % 2 ? '#fff4d8' : '#ffd890') : '#c86020';
          if(y >= ud && y < ud + 2 && ax <= 3) col = '#fff0d0'; if(col) px(x, y, col); }  yield; } yield;
      av.push([x0, hgt - 1 - h - 1, 2]); yield; } yield;
    SKY = { c0, c1, c2, av, av2, hgt }; yield; }
  function buildSky(){ for(const _ of buildSkyG()); }
  let BDL = null;   // the backdrop's layers: [canvas, parallax tier, y offset, alpha], made once   // (the same build at once; buildSkyG is it stepped)
  function backdrop(o){ const { hz, sk, now } = o; setLow(sk.low); if(!SKY) return; const a0 = cx.globalAlpha, sc = PX, hgt = SKY.hgt;
    // the far layer then the near layer, each at its own parallax; drawn in whole canvas pixels
    for(const [c, par, yo, al] of BDL || (BDL = [[SKY.c0, 'far', 2, .9], [SKY.c2, 180, 1, 1], [SKY.c1, 'mid', 0, 1]])){ const off = ((Math.round(skyPar(par) / sc) % SW) + SW) % SW, y = snp(hz - hgt * sc + yo * sc), wpx = Math.ceil(W / sc);
      cx.globalAlpha = a0 * al; for(let x = -off; x < wpx; x += SW) cx.drawImage(c, x * sc, y, SW * sc, hgt * sc);
      if(c === SKY.c2) for(const [ax, ay] of SKY.av2){ const xs = (((ax - off) % SW) + SW) % SW; if(xs > wpx) continue; if(!(reduce || ((now / 1000) * .55 + hash(ax * .7)) % 1 < .55)) continue; cx.fillStyle = AVL; cx.fillRect(xs * sc, y + ay * sc, sc, sc); }   // the wall's roof lights (no glow: they are small and far)
      if(c === SKY.c1){ // aviation lights blinking slowly together (each tower its own phase); Tokyo Tower's glow
        for(const [ax, ay, t] of SKY.av){ if(t === 0) continue; const xs = (((ax - off) % SW) + SW) % SW; if(xs > wpx) continue; const X = xs * sc, Y = y + ay * sc;
          if(t === 2){ glow(X, Y + 60 * sc, 26 * sc, '#ff7a2a', .16); continue; } const on = reduce || ((now / 1000) * .55 + hash(ax * .3)) % 1 < .55; if(!on) continue; cx.fillStyle = AVL; cx.fillRect(X, Y, sc, sc); glow(X + sc / 2, Y + sc / 2, sc * 3, '#ff2020', .35); } } }
    cx.globalAlpha = a0;
    // the sodium-lit haze over the city at the horizon (a dithered band)
    cx.fillStyle = 'rgba(106,58,42,.09)'; cx.fillRect(0, snp(hz - H * .03), W, snp(H * .03)); cx.globalAlpha = a0; }   // (a flat wash: the dithered pattern cost GPU time every frame)

  // ---------------------------------------------------------------- weather: a light drizzle on some visits (and the wet road it gives)
  const DRZ_V = [.35, .6, 1], DRZ_L = [3, 5, 8], DRZ_C = ['#3a3a58', '#55597a', '#7a7e9e'];   // the drizzle's three depths: speed, length (px), colour
  const DRZ = [];   // (filled in warm: the game's hash() does not exist yet while env files load)
  function overlay(al, now, sk){ const s = segAt(position + PZ); if(!s || s.shB === undefined || !wetVisit(s.shB) || !DRZ.length) return; const sp = speed / MAXS, t = now / 1000;
    const n = reduce ? 30 : 90; cx.globalAlpha = al;
    for(let i = 0; i < n; i++){ const D = DRZ[i], a = D[0], b = D[1], c = D[2], tier = c < .5 ? 0 : c < .85 ? 1 : 2, v = DRZ_V[tier] * (reduce ? .5 : 1), len = DRZ_L[tier] * PX * (1 + sp * .8), x = ((a * W + t * (20 + sp * 90) * (tier + 1)) % (W + 40)) - 20, y = ((b * H + t * H * v) % (H + 40)) - 20;
      cx.fillStyle = DRZ_C[tier]; const dx = -(1 + sp) * PX * (tier + 1) * .5;
      // the streak's pixels, a run of pixels in one column drawn as one rect (the same pixels as one rect each: ~3x fewer fills)
      let rx = 0, ry = 0, rh = 0; for(let k = 0; k < len; k += PX){ const qx = snp(x + dx * k / len), qy = snp(y + k); if(rh && qx === rx && qy === ry + rh) rh += PX; else { if(rh) cx.fillRect(rx, ry, PX, rh); rx = qx; ry = qy; rh = PX; } } if(rh) cx.fillRect(rx, ry, PX, rh); }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- warm-up
  function* warmSteps(){ if(!TXT) TXT = can(256, 48); if(!BWS && typeof cv !== 'undefined' && cv.width){ BWS = can(cv.width, cv.height); BWSX = BWS.getContext('2d'); } yield;   // the view-down's frame snapshot, made here, not on the first ride (a resize still remakes it)
    if(!DRZ.length) for(let i = 0; i < 90; i++) DRZ.push([hash(i * 1.3), hash(i * 2.7), hash(i * 4.1)]);   // the drizzle's streaks (hash() exists by now)
    for(let p = 0; p < PANELS.length; p++){ if(!SIGN[p]) SIGN[p] = [can(PW / 2, PHh / 2), can(PW, PHh)]; paintPanel(SIGN[p][1], PANELS[p], true); paintPanel(SIGN[p][0], PANELS[p], false); yield; }
    for(let b = 0; b < BILLS.length; b++){ const n = BILLS[b][0].length; if(!BILL[b]) BILL[b] = [can(n * 16 + 8, 22), can(n * 32 + 12, 40)]; paintBill(BILL[b][0], BILLS[b], 16); paintBill(BILL[b][1], BILLS[b], 32); yield; }
    for(let v = 0; v < VMS_T.length; v++){ if(!VMS[v]) VMS[v] = can(2, 2); paintVMS(VMS[v], VMS_T[v]); } yield;
    yield; yield* buildKBG(); yield; if(!RFA) buildRoofAtlas(); yield; if(!SKY) yield* buildSkyG(); yield;   // (stepped: first 60 s, research/sundown-craft/first60.md)
    if(document.fonts && document.fonts.ready && !warmSteps.fontHook){ warmSteps.fontHook = true; document.fonts.load('16px DotGothic16', '銀座新宿霞が関羽田江戸橋箱崎京橋渋谷神田上野電機カメラ時計洋酒真珠化粧品写真ホテル' + KBW.map(w => w[0]).join('') + KBV.map(w => w[0]).join('') + VMS_T.join('')).then(() => {
        try{ for(let p = 0; p < PANELS.length; p++){ paintPanel(SIGN[p][1], PANELS[p], true); paintPanel(SIGN[p][0], PANELS[p], false); } for(let b = 0; b < BILLS.length; b++){ paintBill(BILL[b][0], BILLS[b], 16); paintBill(BILL[b][1], BILLS[b], 32); } for(let v = 0; v < VMS.length; v++) paintVMS(VMS[v], VMS_T[v]); buildKB(); }catch(e){} }).catch(() => {}); }
    // upload every canvas once, and prime the patterns this road uses
    try{ cx.save(); cx.globalAlpha = .004; for(const pr of SIGN) for(const c of pr) cx.drawImage(c, 0, 0, 1, 1); for(const pr of BILL) for(const c of pr) cx.drawImage(c, 0, 0, 1, 1); if(ATL) cx.drawImage(ATL, 0, 0, 1, 1); if(RFA) cx.drawImage(RFA, 0, 0, 1, 1); cx.drawImage(SKY.c0, 0, 0, 1, 1); cx.drawImage(SKY.c1, 0, 0, 1, 1); cx.drawImage(SKY.c2, 0, 0, 1, 1);
      cx.fillStyle = ditherPat('#6a3a2a', .25); cx.fillRect(0, 0, PX, PX); cx.restore(); }catch(e){}
    yield; }

  const FARPX = 4.5;   // the far/mid switch in storey px
  const ABL = (new URLSearchParams(location.search).get('shutoabl') || '').split(','), AB_KB = ABL.includes('kb'), AB_RF = ABL.includes('roof'), AB_LN = ABL.includes('lines'), AB_IN = ABL.includes('int'), AB_R2 = ABL.includes('row2'), AB_FL = ABL.includes('floor');   // dev: ?shutoabl=bld,par,... skips parts (perf ablation; read from the URL here: the engine's QS doesn't exist yet while env files load, so it never took effect)
  function draw(sp, x, y, uw, fog, now, sk){ if(sk && sk.low) setLow(sk.low); if(ABL.length > 1 || ABL[0]) { if(ABL.includes(sp.type)) return; }
    switch(sp.type){
      case 'bw': if(HOST >= 0 && sp.k === HOST && BWF !== now){ BWF = now; // lift the engine's per-segment clip for the pass, then put it back as it was
          const s = segs[sp.k]; cx.restore(); try{ belowPass(now); DBG.bw++; }catch(e){ DBG.err = String(e && e.stack || e).slice(0, 300); console.error('shuto below', e); } cx.save(); cx.beginPath(); cx.rect(0, 0, W, s ? s.clip : H); cx.clip(); } return;
      case 'bld': return drawBld(sp, x, y, uw, fog, now);
      case 'par': return drawPar(sp, x, y, uw, fog, now);
      case 'lamp': return drawLamp(sp, x, y, uw, fog, now);
      case 'gant': return drawGant(sp, x, y, uw, fog, now);
      case 'xd': return drawXdeck(sp, x, y, uw, fog, now);
      case 'ramp': return drawRamp(sp, x, y, uw, fog, now); } }

  ENV.shuto = {
    barrier:1.1,
    kerbs:false,
    road:['#24242e', '#262631'],
    lampCol:'#7a5634',
    warm(){ for(const _ of ENV.shuto.warmSteps()); },
    warmSteps,
    place,
    lit,
    draw,
    roadFX,
    backdrop(o){ if(!ABL.includes('sky')) backdrop(o); if(FR !== DRAWN){ FR = DRAWN; hostPrep(); const e = segs[segAt(position).index + 40]; if(e && e.p1.screen.w) EYE = Math.max(.05, (e.p1.screen.y - HZ) / e.p1.screen.w); } },
    overlay,
    wetSrc,
    // for setpiece/screenfall.js and tests
    zoneAt, claim, bldAt, mkBld, riverSide, wetVisit, DBG, PANELS, SIGN, face, FQ, fpt, FPT, fc, KBT, KBC, _parSpan:parSpan
  };
})();
