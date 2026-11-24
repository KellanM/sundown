/* Sundown traffic cars. Loaded before the game script; ENV.cars.init() runs once MODELS exists (see env/README.md, "Cars").
   Every model follows the rules that made the coupe read (observed from OutRun, Top Gear, Chase H.Q. tails, not copied):
   a full-width dark light band with the lamps at its ends, a centred plate, a black valance, tyres peeking below, dithered paint (%),
   mirrors poking out, a 3-tone body ramp and a dark-hue outline (O). Tail lamps get a hot core (H) so they stay the brightest thing.
   Silhouettes differ per model: low coupe, notchback sedan, spoilered hatch, long-roof wagon, tall kei van, round kei, taxi with a
   lit roof sign, and a tall delivery box truck. Rows are left halves, mirrored. Pixel density matches the coupe: wf = width / 40. */
"use strict";
ENV.cars = {};
ENV.cars.init = () => {
  const ROWS = {
    coupe:[
      '...........KKKKKKKKK', '.........KK111111111', '..KKK...K1GGGGGGGGGG', '.K221..K1GgGGGGGGGGG', '..KK.K11GgGGGGGGGGGG', '....K1%%%%%%%%%%%%%%', '...K1%%%%%%%%%%%%%%%',
      '..K12222222222222222', '.K122222222222222222', 'K1KKKKKKKKKKKKKKKKKK', 'K1KRRHRRAKKKKKKKKKKK', 'K2KrrrrrAKKKKKKKKKKK', 'K2KKKKKKKKKKKKKKKKKK', 'K222222222222KPPPPPP',
      'K333333333333KPpPpPp', 'K3333333333333KKKKKK', 'KKKKKKKKKKKKWWKKKKKK', '.KTtTtTK............', '.KTtTtTK............'],
    sedan:[
      '.........OOOOOOOOOOO',
      '........O11111111111',
      '.......O1GGGGGGGGGGG',
      '......O1GgGGGGGGGGGG',
      '..KK.O1GgGGGGGGGGGGG',
      '.K21O12GGGGGGGGGGGGG',
      '..KO1%%%%%%%%%%%%%%%',
      '.O1%%%%%%%%%%%%%%%%%',
      'O1222222222222222222',
      'O1KKKKKKKKKKKKKKKKKK',
      'O1KRRRHRRRRAKWWWWWWW',
      'O2KrrrrrrrrAKNNNNNNN',
      'O2KKKKKKKKKKKKKKKKKK',
      'O22222222222KPPPPPPP',
      'O33333333333KPpPpPpP',
      'O333333333333KKKKKKK',
      'KNNNNNNNNNNNNNNNNNNN',
      'KKKKKKKKKKKKKKKKKKKK',
      '.KTtTtTK............',
      '.KTtTtTK............'],
    hatch:[
      '...KKKKKKKKKKKKKKK',
      '...KNNNNNNNNNNMMMM',
      '.....O111111111111',
      '....O1GGGGGGGGGGGG',
      '.KK.O1GgGGGGGGGGGG',
      'K21O12GgGGGGGGGGGG',
      '.KO122GGGGGGGGGGGG',
      '.O1RRR%%%%%%%%%%%%',
      'O12RHR%%%%%%%%%%%%',
      'O12RRRKKKKKKKKKKKK',
      'O12rrrKKKKKKKKKKKK',
      'O12AAA2222222KPPPP',
      'O222222222222KPpPp',
      'KKKKKKKKKKKKKKKKKK',
      'KNNNNNNNNNNNNNNNNN',
      'KKKKKKKKKKKKWWKKKK',
      '.KTtTtK...........',
      '.KTtTtK...........'],
    wagon:[
      '....KWWWWWWWWWWWWWWW',
      '...KOOOOOOOOOOOOOOOO',
      '...O1111111111111111',
      '..O1GGGGGGGGGGGGGGGG',
      '..O1GgGGGGGGGGGGGGGG',
      'KKO1GGgGGGGGGGGGGGGG',
      'K2O1GGGGGGGGGGGGGGGG',
      '.O12GGGGGGGGGGGGGGGG',
      '.O1R%%%%%%%%%%%%%%%%',
      'O12HKKKKKKKKKKKKKKKK',
      'O12RRRRRAKKKKKKKKKKK',
      'O12rrrrrAKKKKKKKKKKK',
      'O12rKKKKKKKKKKKKKKKK',
      'O222222222222KPPPPPP',
      'O333333333333KPpPpPp',
      'O3333333333333KKKKKK',
      'KKKKKKKKKKKKKKKKKKKK',
      'KNNNNNNNNNNNNNNNNNNN',
      '.KTtTtTK............',
      '.KTtTtTK............'],
    keivan:[
      '....OOOOOOOOOOOOO',
      '...O111111111MMMM',
      '..O11GGGGGGGGGGGG',
      '..O1GgGGGGGGGGGGG',
      '..O1GgGGGGGGGGGGG',
      '..O1GGgGGGGGGGGGG',
      'KKO1GGgNNNGGGGGGG',
      'K2O1GGNNNNNGGGGGG',
      '.KO12%%%%%%%%%%%%',
      '..ORRKKKKKKKKKKKK',
      '..ORHKKKKKKKKKKKK',
      '..ORRK22222222222',
      '..OAAK222222222WW',
      '..OrrK2222222KPPP',
      '..O22K3333333KPpP',
      '..O333KKKKKKKKKKK',
      '..KKKKKKKKKKKKKKK',
      '..KNNNNNNNNNNNNNN',
      '...KTtTK.........',
      '...KTtTK.........'],
    kei:[
      '.......OOOOOOOOO',
      '.....OO111111111',
      '....O11GGGGGGGGG',
      '...O1GgGGGGGGGGG',
      '...O1GgGGGGGGGGG',
      '.KKO1GGgGGGGGGGG',
      'K22O1GGGGGGGGGGG',
      '.KO12%%%%%%%%%%%',
      '.O12%%%%%%%%%%%%',
      'O1KRRKKKKKKKKKKK',
      'O1RHRRAKKKKKKKKK',
      'O1RRRRAKKKKKKKKK',
      'O12rr222222KPPPP',
      'O2222222222KPpPp',
      '.O33333333333KKK',
      '.KWWWWWWWWWWWWWW',
      '.KNNNNNNNNNNNNNN',
      '..KTtTK.........',
      '..KTtTK.........'],
    taxi:[
      '...............KKKKK',
      '..............KSSSSS',
      '..............Ksssss',
      '.........OOOOOOOOOOO',
      '........O11111111111',
      '.......O1GGGGGGGGGGG',
      '......O1GgGGGGGGGGGG',
      '..KK.O1GgGGGGGGGGGGG',
      '.K21O12GGGGGGGGGGGGG',
      '..KO1%%%%%%%%%%%%%%%',
      '.O1%%%%%%%%%%%%%%%%%',
      'O1QwQwQwQwQwQwQwQwQw',
      'O1KKKKKKKKKKKKKKKKKK',
      'O1KRRRHRRRRAKKKKKKKK',
      'O2KrrrrrrrrAKKKKKKKK',
      'O22222222222KPPPPPPP',
      'O33333333333KPpPpPpP',
      'O333333333333KKKKKKK',
      'KNNNNNNNNNNNNNNNNNNN',
      'KKKKKKKKKKKKKKKKKKKK',
      '.KTtTtTK............',
      '.KTtTtTK............'],
    box:[
      'KKKKKKKKKKKKKKKKKKKKKK',
      'KAWWWWWWWWWWWWWWWWWWWW',
      'KNBBBBBDBBBBBBBDBBBBBK',
      'KNBBBBBDBBBBBBBDBBBBBK',
      'KNBBBBBDBBBBBBBDBBBBBK',
      'KN11111v1111111v11111K',
      'KN22222v2222222v22222K',
      'KNCCCCCDCCCCCCCDCCCCCK',
      'KNCCCCCDCCCCCCCDCCCCCK',
      'KNCCCCCDCCCCCCCDCCWWCK',
      'KNCCCCCDCCCCCCCDCCCCCK',
      'KNDDDDDDDDDDDDDDDDDDDK',
      'KNDDDDDDDDDDDDDDDDDDDK',
      'KNrvrvrvrvrvrvrvrvrvrv',
      'KKKKKKKKKKKKKKKKKKKKKK',
      'KRRHRRAKKKKKKKKKKKKKKK',
      'KrrrrrAKKKKKKKKKKKPPPP',
      '.KKKKKKKKKKKKKKKKKPpPp',
      '.KNNK..KTtTtTtTK..KKKK',
      '.KNNK..KTtTtTtTK......']
  };
  const TAXI = [['#ffe07a', '#e8a82a', '#8a5410'], ['#7ad0a0', '#2a7a5a', '#103a2a'], ['#5a5664', '#2c2a34', '#121018']];
  const BOX = [['#b8b4ac', '#8a8690', '#5a5664'], ['#a8b4c4', '#7a889a', '#4a5668']];
  const lightsOf = rows => { const hw = rows[0].length; let sx = 0, sy = 0, n = 0;
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if(ch === 'R' || ch === 'H'){ sx += x + .5; sy += y + .5; n++; } }));
    return [[hw - sx / n, rows.length - sy / n]]; };
  const make = name => c => { const key = 'cars:' + name + c.ci; if(SPR[key]) return SPR[key];
    let cols = CAR_COLS[c.ci]; if(name === 'taxi') cols = TAXI[c.ci % 3];
    const [l, m, d] = cols.map(shade), bx = BOX[c.ci % 2].map(shade);
    const pal = Object.assign({}, BASE, { 1:l, 2:m, 3:d, O:mixc(cols[2], '#05040a', .55), H:'#ffd8cc', B:bx[0], C:bx[1], D:bx[2],
      S:'#ffe9a0', s:'#e89a2a', Q:'#14121a', M:'#ff3a4a' });
    if(name === 'taxi') pal.w = shade('#f4f0e8');
    // Japanese plates (kodawari): kei cars carry yellow plates with dark lettering; taxis and delivery trucks green business plates with white
    if(name === 'kei' || name === 'keivan'){ pal.P = '#e8c64a'; pal.p = '#2a2214'; }
    else if(name === 'taxi' || name === 'box'){ pal.P = '#2e7a4a'; pal.p = '#e8e4d8'; }
    return SPR[key] = makeSprite(ROWS[name], pal); };
  for(const name in ROWS){ const rows = ROWS[name]; MODELS[name] = { rows, lights:lightsOf(rows), wf:rows[0].length / 20, make:make(name) }; }

  /* The semi: replaces the decorated truck (chosen 20% of the time by the game as model 'truck'). Seen from behind, after photos of real
     trailers: barn doors with four locking bars, cam handles and hinges on the corner posts; red/white conspicuity tape along the sill and
     up the corners; a low light bar with the lamps at its ends and an unlit plate; an under-ride (ICC) bar; dual tyres; mud flaps; static
     clearance lamps on the header. ci picks the trailer: 0/3 box van, 1/4 corrugated container on a chassis, 2/5 tanker (round end,
     ladder, hazard placard). Grimy ramps 1-4, shaded for night; only the tail lamps are pure bright red. 48 x 33, so wf 1.2. */
  const SW = 48, SH = 33, HW = SW / 2;
  const semiRows = kind => { const g = Array.from({ length:SH }, () => Array(SW).fill('.'));
    const set = (x, y, ch) => { g[y][x] = ch; g[y][SW - 1 - x] = ch; };
    const tape = i => (i >> 1) % 2 ? 'v' : 'r';
    if(kind === 2){ // tanker: oval tank end with a red reflective ring and a ladder up the middle
      for(let y = 0; y < 23; y++) for(let x = 0; x < HW; x++){ const dx = (HW - x - .5) / 22.6, dy = (y + .5 - 11.5) / 11.6, e = dx * dx + dy * dy;
        if(e > 1) continue; const ring = (HW - x - .5) / 21.2, rd = (y + .5 - 11.5) / 10.3, e2 = ring * ring + rd * rd, e3 = Math.pow((HW - x - .5) / 19.8, 2) + Math.pow((y + .5 - 11.5) / 9, 2);
        set(x, y, e2 > 1 ? 'K' : e3 > 1 ? 'r' : y < 5 ? '1' : y === 5 ? '%' : y < 15 ? '2' : y === 15 ? '&' : '3'); }
      for(let x = 4; x < HW; x++) set(x, 23, 'N');
      for(let y = 3; y < 24; y++){ set(20, y, 'v'); if(y % 3 === 0) for(let x = 21; x < HW; x++) set(x, y, 'W'); }
    } else { // box van or container: frame, doors, bars, hinges
      for(let x = 0; x < HW; x++){ set(x, 0, 'K'); set(x, 1, '4'); set(x, 2, '3'); set(x, 23, kind ? '4' : '3'); }
      set(2, 1, 'a'); set(18, 1, 'm'); set(21, 1, 'm');
      for(let y = 3; y < 23; y++){ set(0, y, 'K'); set(1, y, kind ? '4' : tape(y)); set(2, y, kind ? '4' : '3'); set(HW - 1, y, 'K');
        for(let x = 3; x < HW - 1; x++) set(x, y, kind ? '1223'[x % 4] : x === HW - 2 ? '3' : y < 6 ? '1' : y === 6 ? '%' : y < 16 ? '2' : y === 16 ? '&' : '3'); }
      if(kind){ for(const y of [1, 2, 22]) for(const x of [1, 2, 3]) set(x, y, 'N'); }
      else { for(const y of [5, 12, 19]){ set(2, y, 'K'); set(3, y, 'K'); set(3, y + 1, 'x'); } for(let y = 14; y < 23; y++) set(11, y, '3'); for(let y = 16; y < 23; y++) set(20, y, 'x'); }
      for(const bx of [7, 17]){ for(let y = 3; y < 23; y++) set(bx, y, 'b'); for(const y of [4, 21]){ set(bx - 1, y, 'K'); set(bx + 1, y, 'K'); } set(bx + 1, 17, 'W'); set(bx + 2, 17, 'W'); }
    }
    // the rear end every trailer shares: tape on the sill, a light bar, plate, ICC bar, dual tyres, mud flaps
    for(let x = 0; x < HW; x++){ set(x, 24, x ? tape(x) : 'K'); set(x, 25, x ? 'N' : 'K'); set(x, 26, 'N'); set(x, 27, 'N'); set(x, 28, 'K'); }
    set(0, 26, 'K'); set(0, 27, 'K'); for(let x = 2; x < 7; x++){ set(x, 26, 'R'); set(x, 27, 'R'); } set(4, 26, 'H'); set(3, 27, 'H'); set(7, 26, 'A'); set(7, 27, 'A');
    for(let x = 19; x < HW; x++){ set(x, 26, 'n'); set(x, 27, x % 2 ? 'p' : 'n'); }
    for(let x = 2; x < 11; x++){ set(x, 29, x === 2 || x === 6 || x === 10 ? 'K' : x % 2 ? 'T' : 't'); set(x, 30, x === 2 || x === 6 || x === 10 ? 'K' : 'T'); set(x, 31, x === 2 || x === 10 ? 'K' : 'N'); set(x, 32, x === 2 || x === 10 ? 'K' : 'N'); }
    for(let x = 12; x < HW; x++){ set(x, 29, tape(x)); set(x, 30, 'K'); } set(12, 28, 'K'); set(13, 28, 'K');
    if(kind === 2){ for(let x = 21; x < HW; x++) set(x, 24, 'K'); // the ladder foot; and one hazard placard, off-centre
      [[10, 13], [9, 14], [10, 14], [11, 14], [8, 15], [9, 15], [10, 15], [11, 15], [12, 15], [9, 16], [10, 16], [11, 16], [10, 17]].forEach(([x, y]) => g[y][x] = 'o');
      [9, 10, 11].forEach(x => g[15][x] = x === 10 ? 'K' : 'o'); }
    return g.map((r, y) => r.map((ch, x) => ch === '&' ? ((x + y) % 2 ? '2' : '3') : ch).join('')); };
  const SEMI = [[['#cfc8b8', '#a8a294', '#7a766c', '#4a4640'], ['#c06a48', '#94442e', '#62281c', '#3a1610'], ['#e0e4ea', '#a8b0bc', '#6a7280', '#363c48']],
                [['#b8c0c8', '#8e98a4', '#626c78', '#3a4048'], ['#4f82b8', '#305e94', '#1e3c64', '#10223a'], ['#5ec8c0', '#2a9a94', '#186460', '#0c3634']]];
  const SEMI_ROWS = [0, 1, 2].map(semiRows);
  const semiLights = (() => { const r = SEMI_ROWS[0]; let sx = 0, sy = 0, n = 0;
    r.forEach((row, y) => [...row].forEach((ch, x) => { if(x < HW && (ch === 'R' || ch === 'H')){ sx += x + .5; sy += y + .5; n++; } }));
    return [[HW - sx / n, SH - sy / n]]; })();
  const semiMake = c => { const key = 'cars:semi' + c.ci; if(SPR[key]) return SPR[key];
    const kind = c.ci % 3, ramp = SEMI[Math.floor(c.ci / 3) % 2][kind].map(shade);
    const pal = Object.assign({}, BASE, { 1:ramp[0], 2:ramp[1], 3:ramp[2], 4:ramp[3], H:'#ffd8cc', a:'#ffa83a', m:'#e8303a', b:shade('#6e6672'), x:shade('#7a4630'),
      n:shade('#2e7a4a'), p:shade('#d8d4c8'), r:shade('#c02434'), v:shade('#d8d4cc'), o:shade('#ff8a2a'), W:shade('#c8c4d0') });
    return SPR[key] = makeSprite(SEMI_ROWS[kind], pal, false); };
  // a truck the game spawns may be claimed, once, by the rare dekotora (ENV.cars.deko below); every other truck stays a semi
  MODELS.truck = { rows:SEMI_ROWS[0], lights:semiLights, wf:SW / 40, make:(c, now) => {
    if(c.deko === undefined && c.z !== undefined) c.deko = ENV.cars.deko.claim(c);
    return c.deko ? dekoMake(c, now) : semiMake(c); } };

  /* The dekotora (デコトラ, "decoration truck"): rare hero traffic, a 1970s art truck seen from behind at night. Drawn after photos looked
     at pixel by pixel (Wikimedia Commons; research/sundown-craft notes in the review card): Comyu's night shots of the Zenkoku Utamarokai
     trucks at Goka 2021 (CC BY-SA 4.0) for how they read in the dark (a ring of warm bulbs round the rear doors, lit andon name boards on a
     chrome bumper, every chrome edge carrying light); Asturio Cantabrio's Wajima 2022 set (CC BY-SA 4.0) for the rear: a painted mural on
     the doors under four chrome locking bars, hinges on the corner posts, jet-nacelle "rocket" marker lamps on the roof corners (end on:
     a chrome ring and a red lens), three round tail lamps a side, a green business plate; the 2009 Flickr night GIF (CC BY-SA 2.0) for the
     coloured under-bumper lights. Nothing copied: the mural is an original kohaku koi climbing the falls under a full moon (the old
     koi-to-dragon gate story, nobody's livery), the roof sign and the andon carry glyphs that spell nothing, and it is no film's truck.
     48 x 44, the semi's width (wf 1.2), so it hits, slips and formations exactly like any truck. The bulbs chase in three phases (DK_STEP
     ms a step; held steady under reduced motion). Far away it switches to hand-ruled LOD grids (2x2 and 4x4 blocks, drawn back at full
     size so drawCar's scale and the lamp glows stay put) that keep the lights, so the chase never shimmers into noise as it shrinks.
     Each LOD and frame is its own model ('dekoA'..'dekoL', same wf and lamps) so the fog tint (keyed by model) never shows a stale frame. */
  const DW = 48, DH = 44, MW = 38, MH = 23, DK_STEP = 140;
  const KOI = ['..kWWk............', '.kWooWk...........', 'kWkooWWk..........', 'kWWWoWWWk.........', '.kWWWWWWWk........', '.vvkWoooWWk.......',
    '..vvkooooWWk......', '....kWooooWWk.....', '.....kWWooWWWk....', '......kWWWWWWok...', '.......kWWWoooWk..', '........kWoooWk...',
    '.........kWWWkvv..', '..........kWkvvvv.', '..........vvvvWvvv', '.........vvW..vvvv'];
  const WAVE = ['..vvv....', '.vbbbv..v', 'vbBBbbvvb', 'bBBBBbbbB', 'BBBBBBBBB', 'BBBBBBBBB'];
  const muralRows = () => { const m = Array.from({ length:MH }, (_, y) => Array.from({ length:MW }, (_, x) => {
      const dm = Math.hypot(x - 9, y - 4); return dm < 8 && (x + y) % 2 === 0 && dm > 4.6 ? '2' : dm < 6.5 ? '2' : '1'; }));   // a moon-glow halo, dithered at its edge
    const P = (x, y, ch) => { if(x >= 0 && x < MW && y >= 0 && y < MH) m[y][x] = ch; };
    for(let y = 0; y < MH; y++) for(let x = 0; x < MW; x++) if(Math.hypot(x - 9, y - 4.2) < 3.4) P(x, y, 'm');   // the full moon, between two bars
    P(10, 3, 'M'); P(8, 5, 'M'); P(9, 5, 'M');
    for(let y = 6; y < 18; y++){ const w = Math.min(5, 1 + ((y - 6) >> 1)); for(let x = 0; x < w; x++) P(x, y, x === w - 1 ? 'i' : 'h'); }   // the cliff, moonlit rim
    for(let y = 0; y < 17; y++) for(let x = 14; x <= 17; x++) P(x, y, (x + (y >> 1)) % 3 === 0 ? 'b' : 'w');   // the falls, to the seam
    for(let y = 0; y < 17; y++) P(13, y, y % 4 === 3 ? 'w' : 'h');
    [[12, 15, 'v'], [13, 15, 'w'], [12, 16, 'w'], [11, 16, 'v'], [13, 16, 'w'], [18, 16, 'v'], [19, 15, 'v'], [19, 16, 'w'], [20, 16, 'v']].forEach(([x, y, ch]) => P(x, y, ch));   // spray
    [[37, 0], [36, 1], [35, 1], [34, 2], [33, 2], [32, 3], [31, 3], [30, 3], [35, 0], [29, 4]].forEach(([x, y]) => P(x, y, 'h'));   // the sakura bough
    [[36, 0, 's'], [34, 0, 'S'], [33, 1, 's'], [32, 1, 's'], [31, 2, 'S'], [30, 2, 's'], [29, 2, 's'], [28, 3, 's'], [27, 3, 'S'], [28, 4, 's'], [33, 3, 's'], [34, 3, 'S'],
     [36, 2, 's'], [37, 2, 'S'], [37, 1, 's'], [32, 0, 's'], [30, 4, 'S'], [26, 2, 's'], [35, 4, 's'], [24, 7, 's'], [36, 8, 's'], [33, 11, 'S'], [6, 11, 's']].forEach(([x, y, ch]) => P(x, y, ch));
    for(let y = 0; y < WAVE.length; y++) for(let x = 0; x < MW; x++){ const ch = WAVE[y][(x + (x > 18 ? 4 : 0)) % 9]; if(ch !== '.') P(x, MH - WAVE.length + y, ch); }
    KOI.forEach((r, y) => [...r].forEach((ch, i) => { if(ch !== '.') P(20 + i, 2 + y, ch); }));
    return m.map(r => r.join('')); };
  const dekoRows = () => { const g = Array.from({ length:DH }, () => Array(DW).fill('.'));
    const S = (x, y, ch) => { if(x >= 0 && x < DW && y >= 0 && y < DH) g[y][x] = ch; }, M = (x, y, ch) => { S(x, y, ch); S(DW - 1 - x, y, ch); };
    const ph = i => 'xyz'[((i % 3) + 3) % 3], uph = i => 'XYZ'[((i % 3) + 3) % 3];
    // roof: the lit sign on two stays, its border bulbs one chasing ring; rocket marker lamps on the box corners
    const sx0 = 13, sx1 = 34; let n = 0;
    for(let x = sx0; x <= sx1; x++){ S(x, 0, 'K'); S(x, 4, 'K'); } for(let y = 0; y <= 4; y++){ S(sx0, y, 'K'); S(sx1, y, 'K'); }
    for(let x = sx0 + 1; x < sx1; x++) S(x, 0, (x - sx0) % 2 ? ph(n++) : 'E');
    for(let y = 1; y <= 3; y++) S(sx1 - 1, y, y === 2 ? ph(n++) : 'E');
    for(let x = sx1 - 1; x > sx0; x--) S(x, 4, (x - sx0) % 2 ? ph(n++) : 'E');
    for(let y = 3; y >= 1; y--) S(sx0 + 1, y, y === 2 ? ph(n++) : 'E');
    for(let y = 1; y <= 3; y++) for(let x = sx0 + 2; x <= sx1 - 2; x++) S(x, y, 'F');
    [[16, ['.f..', 'ffff', '.f.f']], [22, ['ffff', 'f..f', 'ffff']], [28, ['f.f.', '.fff', 'f.f.']]].forEach(([x0, G]) => G.forEach((r, y) => [...r].forEach((ch, i) => { if(ch === 'f') S(x0 + i, 1 + y, 'f'); })));
    for(const x of [16, 31]) S(x, 5, 'd');
    ['.KccK.', 'KcRRdK', 'KcHRdK', 'KdRRdK', '.KddK.'].forEach((r, y) => [...r].forEach((ch, i) => { if(ch !== '.'){ S(2 + i, 1 + y, ch); S(45 - i, 1 + y, ch === 'c' ? 'd' : ch); } }));
    // the box: outline, chrome header with bulbs, corner posts with bulbs and hinges, the mural doors
    const B0 = 6, MY = 9, SILL = MY + MH, MU = muralRows();
    for(let x = 2; x <= 45; x++){ S(x, B0, 'K'); S(x, B0 + 1, 'c'); S(x, B0 + 2, 'C'); S(x, SILL, 'C'); S(x, SILL + 1, 'K'); }
    for(let y = B0; y <= SILL + 1; y++){ M(2, y, 'K'); M(3, y, 'C'); M(4, y, 'd'); }
    for(let x = 4, i = 0; x <= 43; x += 3, i++) S(x, B0 + 1, ph(i));
    for(let y = MY, i = 0; y <= SILL - 1; y += 3, i++) M(3, y, ph(i));
    for(let x = 5, i = 0; x <= 42; x += 3, i++) S(x, SILL, ph(i + 1));
    for(const y of [MY + 3, MY + 11, MY + 19]){ M(4, y, 'c'); M(5, y, 'd'); }
    for(let y = 0; y < MH; y++) for(let i = 0; i < MW; i++) S(5 + i, MY + y, MU[y][i]);
    // the four locking bars (dark chrome with glints, so the painting leads), the door seam, cam handles at mid height
    for(let y = MY; y < SILL; y++){ for(const x of [10, 18, 29, 37]) S(x, y, (y - MY) % 5 === 2 ? 'c' : 'd'); S(23, y, 'K'); S(24, y, 'e'); }
    for(const x of [18, 29]){ const s = x < 24 ? 1 : -1; S(x + s, MY + 12, 'c'); S(x + 2 * s, MY + 12, 'C'); }
    // bumper towers: chrome posts standing outside the bumper, stacked marker lamps
    const BU = SILL + 2;
    for(let y = BU - 9; y <= BU + 5; y++){ M(0, y, 'K'); M(1, y, (y - BU) % 2 ? 'C' : ph((y - BU) >> 1)); } M(1, BU - 10, 'K');
    // the bumper: chrome, three round tail lamps a side, the lit andon name board in the middle, underglow
    for(let x = 2; x <= 45; x++){ S(x, BU, 'c'); S(x, BU + 1, 'C'); S(x, BU + 2, 'C'); S(x, BU + 3, 'C'); S(x, BU + 4, 'd'); S(x, BU + 5, uph(x)); S(x, BU + 6, 'K'); }
    for(let y = BU; y <= BU + 5; y++) M(2, y, 'K');
    for(const lx of [3, 6, 9]){ M(lx, BU + 1, 'L'); M(lx + 1, BU + 1, 'R'); M(lx, BU + 2, 'R'); M(lx + 1, BU + 2, 'H'); M(lx, BU + 3, 'L'); M(lx + 1, BU + 3, 'R'); }
    M(12, BU + 2, 'A'); M(12, BU + 3, 'A'); M(12, BU + 1, 'q');
    for(let x = 15; x <= 32; x++){ S(x, BU, 'G'); S(x, BU + 4, 'G'); } for(let y = BU; y <= BU + 4; y++){ S(15, y, 'G'); S(32, y, 'G'); }
    for(let y = BU + 1; y <= BU + 3; y++) for(let x = 16; x <= 31; x++) S(x, y, 'g');
    [[17, ['jj.', '.jj', 'j.j']], [21, ['j.j', 'jjj', 'j.j']], [24, ['jjj', '.j.', 'jj.']], [28, ['j..', 'jjj', '.jj']]].forEach(([x0, G]) => G.forEach((r, y) => [...r].forEach((ch, i) => { if(ch === 'j') S(x0 + i, BU + 1 + y, 'j'); })));
    // under the bumper: dual tyres, chrome mud flaps with a reflector, the green business plate
    for(let y = BU + 7; y < DH; y++){ for(let x = 6; x <= 14; x++) M(x, y, x === 6 || x === 10 || x === 14 ? 'K' : y === BU + 7 ? (x % 2 ? 'T' : 't') : 'T'); M(3, y, 'K'); M(4, y, 'c'); M(5, y, 'C'); }
    M(4, BU + 8, 'R'); M(5, BU + 8, 'R');
    for(let x = 20; x <= 27; x++){ S(x, BU + 7, x === 20 || x === 27 ? 'K' : 'P'); S(x, BU + 8, x === 20 || x === 27 ? 'K' : (x % 2 ? 'p' : 'P')); S(x, BU + 9, 'K'); }
    return g.map(r => r.join('')); };
  // LOD: the grid at 1/n, each n x n block one char, drawn back at full size. A block holding a light keeps it (tail lamp first, then the
  // bulbs, the signs, the moon); otherwise its commonest char wins (outline counted low). A bulb block takes its phase from the block, so the
  // chase runs on round the coarse ring instead of the whole rim blinking at once.
  const LOD_PRI = 'HRxyzFEjGmXYZAf';
  const dekoLod = (rows, n) => { const out = rows.map(r => [...r]);
    for(let by = 0; by < DH; by += n) for(let bx = 0; bx < DW; bx += n){ const cnt = {}; let best = null, bp = 99;
      for(let y = by; y < Math.min(DH, by + n); y++) for(let x = bx; x < Math.min(DW, bx + n); x++){ const ch = rows[y][x], p = LOD_PRI.indexOf(ch); if(p >= 0 && p < bp){ bp = p; best = ch; } cnt[ch] = (cnt[ch] || 0) + (ch === 'K' ? .6 : ch === '.' ? .9 : 1); }
      if(!best){ let m = -1; for(const k in cnt) if(cnt[k] > m){ m = cnt[k]; best = k; } }
      const ci = ((bx + by) / n) % 3; if('xyz'.includes(best)) best = 'xyz'[ci]; else if('XYZ'.includes(best)) best = 'XYZ'[ci];
      for(let y = by; y < Math.min(DH, by + n); y++) for(let x = bx; x < Math.min(DW, bx + n); x++) out[y][x] = best; }
    return out.map(r => r.join('')); };
  // night palette: structure and paint shaded like every car; bulbs, signs and lamps unshaded. f 0-2: the chase step (one bulb in three
  // lit, the others glowing low; the underglow rotates magenta, cyan, green); f 3: steady, for reduced motion (every bulb at a warm middle).
  const BULB_ON = '#ffe9a8', BULB_DIM = '#b8641c', BULB_MID = '#ffb84a', UG = ['#ff3a9a', '#3af0ff', '#7aff6a'];
  const dekoPal = f => { const P = { K:'#0a0810', c:shade('#ece4f2'), C:shade('#9c90ac'), d:shade('#4e4662'), e:shade('#2a2438'), i:shade('#5a4a7a'), q:'#ffc880',
      E:'#ff3a8a', F:'#fff2cc', f:'#d0182e', G:'#4aff86', g:'#10201a', j:'#ffe45a', R:'#ff2a3a', H:'#ffd8cc', L:'#a01828', A:'#ff9a2a',
      P:shade('#2e7a4a'), p:shade('#e8e4d8'), T:'#18161c', t:'#4a4652', 1:shade('#20205a'), 2:shade('#34307a'), m:'#f4e6b0', M:'#c8b478', h:shade('#2a1c2c'),
      w:shade('#e0ecf8'), b:shade('#4a7ccc'), B:shade('#22387a'), v:shade('#a8d4f4'), o:shade('#f0402a'), W:shade('#f6f2ea'), k:shade('#2a0a14'), s:shade('#ffa0c8'), S:shade('#d84a80') };
    for(let i = 0; i < 3; i++){ P['xyz'[i]] = f === 3 ? BULB_MID : i === f ? BULB_ON : BULB_DIM; P['XYZ'[i]] = UG[f === 3 ? i : (i + f) % 3]; }
    return P; };
  const DKR = dekoRows(), DKL = [DKR, dekoLod(DKR, 2), dekoLod(DKR, 4)], DKS = new Array(12), DKM = 'ABCDEFGHIJKL'.split('').map(ch => 'deko' + ch);
  const dkSpr = i => DKS[i] || (DKS[i] = makeSprite(DKL[(i / 4) | 0], dekoPal(i % 4), false));
  const dkLights = (() => { let sx = 0, sy = 0, n = 0;   // the tail lamps only (not the roof's rocket markers or the mud-flap reflectors)
    DKR.forEach((row, y) => { if(y < DH - 9 || y > DH - 7) return; [...row].forEach((ch, x) => { if(x < DW / 2 && (ch === 'R' || ch === 'H')){ sx += x + .5; sy += y + .5; n++; } }); });
    return [[DW / 2 - sx / n, DH - sy / n]]; })();
  // which LOD: the truck's size on screen, from its distance the way the road projects it (drawCar's w is .36 of the road's half width)
  const dkLod = c => { if(typeof position !== 'number' || typeof DEPTH === 'undefined') return 0; const dz = c.z - position; if(dz <= 1) return 0;
    const s = .36 * DEPTH / dz * ROADW * W / 2 * (SW / 40) / DW / (typeof PX === 'number' ? PX : 1); return s >= .9 ? 0 : s >= .45 ? 1 : 2; };
  const dekoMake = (c, now) => { c.ci = 0; const i = dkLod(c) * 4 + (reduce ? 3 : Math.floor((now || 0) / DK_STEP) % 3); c.model = DKM[i]; return dkSpr(i); };
  DKM.forEach(m => MODELS[m] = { rows:DKR, lights:dkLights, wf:SW / 40, deko:true, make:dekoMake });
  ENV.cars.dekoSprite = dkSpr; ENV.cars.dekoModels = DKM;   // tests and the contact sheet: dkSpr(lod * 4 + frame)
  if(window.MECH && MECH.style && MECH.style.LABELS && !MECH.style.LABELS.includes('DEKOTORA')) MECH.style.LABELS.push('DEKOTORA');   // before hud.js prebuilds its labels
  MODELS.van = MODELS.keivan; // the old boxy van retires; anything still asking for 'van' gets the kei van
};
/* The dekotora's rarity (ENV.cars.deko). About one ride in five meets it (4.7, simulated over 200,000 rides): a ride rolls P at its start,
   never two rides running, and never more than PITY dry rides in a row (the count is kept across sessions, so a short session still sees one now and then). A ride that wins
   picks a moment T0-T1 s in; the first truck spawned after it, seen first far up the road (beyond half the spawn distance, so nothing ever
   changes where you can see it), is the dekotora. One a ride, and only in real rides (not the scripted demo). It drives as slow traffic
   like any truck; a close call past it adds a style act ('DEKOTORA', BONUS points) on top of the close call. ?deko=1 forces one every
   ride, about 4 s in (tests). D.log keeps the last 50 rides (1 = met it). */
ENV.cars.deko = (() => { const D = { P:.2, PITY:6, T0:30, T1:100, BONUS:300, want:false, at:0, car:null, shown:false, armed:false, passed:false, cc:0, t:0, dry:0, last:false, rides:0, log:[], loaded:false,
    force:typeof location !== 'undefined' && /[?&]deko=1\b/.test(location.search) };
  D.roll = () => { if(!D.loaded){ D.loaded = true; try{ const s = store.get('sundown.deko', null); if(s){ D.dry = s.dry | 0; D.last = !!s.last; } }catch(e){} }
    if(D.armed){ D.rides++; if(D.shown){ D.dry = 0; D.last = true; } else { D.dry++; D.last = false; } D.log.push(D.shown ? 1 : 0); if(D.log.length > 50) D.log.shift();
      try{ store.set('sundown.deko', { dry:D.dry, last:D.last }); }catch(e){} }
    D.armed = D.shown = D.passed = false; D.car = null;
    D.want = D.force || (!D.last && (D.dry >= D.PITY || Math.random() < D.P)); D.at = D.force ? 4 : D.T0 + Math.random() * (D.T1 - D.T0); };
  D.claim = c => { if(!D.want || state !== 'play' || window.DEMO || playT < D.at || c.z - position < SPAWN_Z * .5) return false;
    D.want = false; D.shown = true; D.car = c; D.t = playT; D.cc = closeCalls; return true; };
  return D; })();
MECH.dekotora = { reset(){ ENV.cars.deko.roll(); },
  update(){ const D = ENV.cars.deko; if(state !== 'play' || window.DEMO) return; D.armed = true; const c = D.car;
    if(c && !D.passed && c.passed){ D.passed = true; const m = MODELS[c.model]; if(closeCalls > D.cc && m && m.deko && MECH.style && MECH.style.act) MECH.style.act('style', D.BONUS, 'DEKOTORA'); }
    D.cc = closeCalls; } };
ENV.cars.pick = () => { const r = Math.random();
  return r < .18 ? 'coupe' : r < .36 ? 'sedan' : r < .50 ? 'hatch' : r < .61 ? 'wagon' : r < .72 ? 'keivan' : r < .82 ? 'kei' : r < .91 ? 'taxi' : 'box'; };
/* Far cars fade toward the fog colour, opaque (sundown.html drawCar): every model's sprite in every colour gets its fog steps made here,
   one canvas per sprite and step, so none is made mid-ride. warmSteps() is the same build one model at a time, for the staged warm-up. */
ENV.cars.warmSteps = function*(){ if(typeof fogTintWarm !== 'function' || typeof CAR_FQ === 'undefined') return;
  for(const m in MODELS){ if(!MODELS[m].make || MODELS[m].deko) continue; for(let ci = 0; ci < 6; ci++) fogTintWarm(MODELS[m].make({ ci, model:m, truck:m === 'truck' }), 'car:' + m + ':' + ci, CAR_FQ, CAR_FS, FOG_COL); yield; }
  const DM = ENV.cars.dekoModels || [];   // the dekotora: one canvas per LOD and chase step (always ci 0), one step each
  for(let i = 0; i < DM.length; i++){ fogTintWarm(ENV.cars.dekoSprite(i), 'car:' + DM[i] + ':0', CAR_FQ, CAR_FS, FOG_COL); yield; } };
ENV.cars.warm = () => { for(const _ of ENV.cars.warmSteps()); };
