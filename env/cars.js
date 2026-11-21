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
  MODELS.truck = { rows:SEMI_ROWS[0], lights:semiLights, wf:SW / 40, make:c => { const key = 'cars:semi' + c.ci; if(SPR[key]) return SPR[key];
    const kind = c.ci % 3, ramp = SEMI[Math.floor(c.ci / 3) % 2][kind].map(shade);
    const pal = Object.assign({}, BASE, { 1:ramp[0], 2:ramp[1], 3:ramp[2], 4:ramp[3], H:'#ffd8cc', a:'#ffa83a', m:'#e8303a', b:shade('#6e6672'), x:shade('#7a4630'),
      n:shade('#2e7a4a'), p:shade('#d8d4c8'), r:shade('#c02434'), v:shade('#d8d4cc'), o:shade('#ff8a2a'), W:shade('#c8c4d0') });
    return SPR[key] = makeSprite(SEMI_ROWS[kind], pal, false); } };
  MODELS.van = MODELS.keivan; // the old boxy van retires; anything still asking for 'van' gets the kei van
};
ENV.cars.pick = () => { const r = Math.random();
  return r < .18 ? 'coupe' : r < .36 ? 'sedan' : r < .50 ? 'hatch' : r < .61 ? 'wagon' : r < .72 ? 'keivan' : r < .82 ? 'kei' : r < .91 ? 'taxi' : 'box'; };
/* Far cars fade toward the fog colour, opaque (sundown.html drawCar): every model's sprite in every colour gets its fog steps made here,
   one canvas per sprite and step, so none is made mid-ride. warmSteps() is the same build one model at a time, for the staged warm-up. */
ENV.cars.warmSteps = function*(){ if(typeof fogTintWarm !== 'function' || typeof CAR_FQ === 'undefined') return;
  for(const m in MODELS){ if(!MODELS[m].make) continue; for(let ci = 0; ci < 6; ci++) fogTintWarm(MODELS[m].make({ ci, model:m, truck:m === 'truck' }), 'car:' + m + ':' + ci, CAR_FQ, CAR_FS, FOG_COL); yield; } };
ENV.cars.warm = () => { for(const _ of ENV.cars.warmSteps()); };
