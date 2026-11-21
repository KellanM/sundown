/* Sundown bikes: every rider and bike look (cosmetic only), the default sport bike included, and the one renderer that leans them all. See env/README.md, "Bikes".
   Every bike is built like the game's sport bike (studied from Super Hang-On / Hang-On's rider): layers in the same order and the same
   footprint (about 26 x 28 sprite px): parts beyond the rider (fairing, cowl, bars), the rear tyre, the rider (hung off toward the inside
   of the lean), then the parts nearer than the rider (tail, seat, pipes). Rider about 60% of the height, helmet about a sixth, striped;
   a fat dark tyre with grey tread that rolls; dark-hue outline; 3-4 tone ramps lit from the upper left (the right half of a mirrored row
   drops one step on highlight keys); a red tail light that is the brightest thing on the sprite.
   Rows are LEFT HALVES (last character = centre column), mirrored, unless the part is full:true. '.' is transparent.
   Short rows are padded on the outside, so every row lines up on the centre line. */
"use strict";
(() => {
  const RM = { '0':'1', h:'i', a:'b' };   // light from the upper left: these keys drop one step on the right half
  // the rear tyre from behind, as the sport bike draws it: half width hw (incl. outline), h rows, grey tread bands rolling down
  const tyreRows = (hw, h, ph) => Array.from({ length:h }, (_, i) => 'K' + 'T'.repeat(hw - 3) + ((i + ph) % 3 === 0 ? 'TT' : 'tt')).concat(['.' + 'K'.repeat(hw - 1)]);
  // a straight tube in half rows from column x0 (bottom) to x1 (top), h rows, padded to hw; tip = rows at the top end
  const tube = (h, x0, x1, body, tip, hw) => Array.from({ length:h }, (_, i) => { const p = Math.round(x1 + (x0 - x1) * i / (h - 1)); return ('.'.repeat(p) + (tip && i < tip.length ? tip[i] : body)).padEnd(hw, '.'); });
  const BASEP = { K:'#0a0810', T:'#18161c', t:'#4a4652', R:'#ff2a3a', r:'#a01828', Q:'#ffd8cc', A:'#ff9a2a', W:'#e4e0ec', V:'#8a8698', N:'#24222c', n:'#3a3844',
    P:'#e8e4d8', p:'#3a3a48', G:'#1c2238', g:'#4a5684', Y:'#ffd070', y:'#d0862a' };
  const P = o => Object.assign({}, BASEP, o);
  const B = {};

  /* parts: { rows | f(ph), y: bottom in sprite px (negative is up), x, hang: px of hang-off at full lean, ph:[phases, ms], full, pal }
     lights: red tail glows [x, y, r]; glows: other lights [x, y, r, col, a]; ex: exhaust mouths [x, y] for the boost flame */

  // the game's own sport bike, from its rows in sundown.html (BIKE_TOP, RIDER, TAIL, EXH), drawn here like every other bike
  B.sport = { name:'Sport', note:'the default racer', shadow:9, parts:[
    { y:0, ph:[3, 45], f:ph => BIKE_TOP.concat(tyre(ph)), pal:() => BIKE_PAL },
    { y:-10, hang:2, f:() => RIDER, pal:() => BIKE_PAL },
    { y:-6, f:() => TAIL, pal:() => BIKE_PAL },
    { y:-1, x:5, full:true, f:() => EXH, pal:() => BIKE_PAL }],
    lights:[[0, -11.5, 6]], ex:[[5, -3]] };

  /* Red Capsule. Mood and proportions only from the famous anime capsule bike (a long red machine, the rider low on it, a wide
     tail bar); everything drawn is original: the shell lines, the striped setting-sun disc on the jacket, the orange helmet stripe.
     Built on the sport bike: the same fairing (in glossy red with a smoked screen) and the same rider shape, sitting 2 px lower;
     what changes is a fat 14 px wheel, a big 20 px tail with one light bar across it, and skirts that wrap the wheel. */
  {
    const pal = P({ K:'#1c0610', 0:'#fff2ec', 1:'#ff6e66', 2:'#e01c32', 3:'#980e22', 4:'#520816', w:'#f6f2ee', v:'#bcb4b8', U:'#ff8a2a',
      a:'#ff7a56', b:'#c8301e', c:'#741410', G:'#2a1c30', g:'#6a5a78', T:'#141016', t:'#46404c', Y:'#ffd070', y:'#ff8a2a' });
    B.capsule = { name:'Red Capsule', note:'low, long and glossy', pal, shadow:11, parts:[
      { y:0, ph:[3, 40], f:ph => BIKE_TOP.map(r => r.replace(/w/g, '0')).concat(tyreRows(7, 11, ph)) },        // red fairing, smoked screen, fat wheel
      { y:-12, hang:2, rows:[                                                                                // rider in a red-orange jacket, sun disc on the back
        '......KKK', '.....KwwU', '....KwwwU', '....KvwwU', '....KvwwU', '.....KvwU', '....KKKKK',
        '..KKaaaaa', '.KbaaaaYY', '.KbaaaYYY', 'KbbaaaKKK', 'KcbaaayyY', 'KKcbaaaaa', '.KKKKKKKK'] },
      { y:-4, rows:[                                                                                         // big tail, one light bar, skirts round the wheel
        '..KKKKKKKK', '.K00011111', 'K001112222', 'K011222222', 'K122222222', 'KKKKKKKKKK', 'KRRRRRRRRQ', 'KrrrrrrrrR', 'KKKKKKKKKK', 'K33332K...', 'K34442K...', '.KKKKK....'] }],
      lights:[[-7, -9.5, 4], [0, -9.5, 6], [7, -9.5, 4]], ex:[[-5, -2], [5, -2]] };
  }

  /* Kaidō racer (bōsōzoku). From photos of kaidō-style bikes (Kobe, Roppongi, Wikimedia Commons): rocket cowl with a tall screen,
     the rider upright, a tall padded seat-back standing behind him, upswept pipes. Built on the sport bike: same fairing (teal, with a
     tall screen added), same rider shape in a purple tokkōfuku coat with a gold crest whose tails hang where the legs were, then a
     white tuck-roll sandan seat-back and two chrome takeyari pipes with red tips. No flags. */
  {
    const pal = P({ K:'#0a0a1e', 1:'#7af0e0', 2:'#20a8b0', 3:'#0e5068', w:'#aee8ff', a:'#a87af0', b:'#6a3ab8', c:'#2e1660', W:'#f4f4fc', V:'#7a8aa8',
      h:'#ffe48a', i:'#d8a838', U:'#e0303a', S:'#f6f0e2', s:'#c4b8a4', e:'#e0303a', G:'#1a2c40', g:'#6a9ab8' });
    B.kaido = { name:'Kaidō Racer', note:'sandan seat and takeyari pipes', pal, shadow:10, parts:[
      { y:-21, rows:['......KKK', '....KKggg', '...KgGGGG', '...KgGGGG', '...KgGGGG', '...KgGGGG'] },               // tall screen beyond the helmet
      { y:0, ph:[3, 45], f:ph => BIKE_TOP.concat(tyre(ph)) },
      { y:-14, hang:2, rows:[                                                                                // upright rider, purple coat, gold crest
        '......KKK', '.....KhhU', '....KhhhU', '....KihhU', '....KihhU', '.....KihU', '....KKKKK',
        '..KKaaaaa', '.KbaaaaaY', '.KbaaaaYa', 'KbbaaaYaa', 'KcbaaaaYa', 'KKcbaaaaY', '.KcbbaaaK', 'KcbK.....', 'KcbK.....', 'KccK.....', '.KKK.....'] },
      { y:-5, rows:[                                                                                         // sandan seat-back, tail, light
        '...KKK', '..KSSS', '..Ksss', '..KSSS', '.KKsss', '.KSSSS', '.Kssss', '.KSSSS', 'KKKKKK', 'K22222', 'KRRRRQ', 'KrrrrR', '.K3333', '..KKKK'] },
      { y:-3, rows:tube(16, 7, 1, 'KWVK', ['KRRK', 'KrrK'], 13) }],                                         // takeyari pipes, both sides
      lights:[[0, -8.5, 5]], glows:[[-10.5, -17.5, 2.5, '#ff2a3a', .4], [10.5, -17.5, 2.5, '#ff2a3a', .4]], ex:[[-10.5, -18], [10.5, -18]] };
  }

  /* Café racer. From the Triton and other café racers (Wikimedia Commons): no fairing, clip-on bars with bar-end mirrors, a round
     silver humped seat with a red stripe and a small round light, chrome megaphones low at the sides, a narrower tyre. Built on the sport bike's rider shape
     in a brown leather jacket and jeans, an open-face cream helmet with a red stripe and a goggle strap, and a white scarf streaming. */
  {
    const pal = P({ K:'#0c0c16', 0:'#ffffff', 1:'#d4d4e2', 2:'#9494ac', 3:'#4a4a62', 4:'#d8303a', a:'#d0946a', b:'#8a5232', c:'#40220f',
      h:'#fff6e0', i:'#d8c8a0', U:'#d8303a', u:'#6a3a20', k:'#3a2418', l:'#4a6aa8', m:'#2a3a6a', S:'#ffffff', q:'#b0aac4', T:'#16141a' });
    const scarf = [
      ['SS.....', 'qSS....', '.qSSS..', '..qSSS.', '...qqSS', '.....qS', '......q'],
      ['SS.....', 'qSS....', '.qSS...', '..qSSS.', '..qSSSq', '....qSq', '.....q.'],
      ['SS.....', 'qSS....', '.qSS...', '.qSSS..', '..qqSSS', '....qqq', '.......']];
    B.cafe = { name:'Café Racer', note:'clip-ons, hump and a scarf', pal, shadow:9, parts:[
      { y:-13, rows:['.KK.........', 'KWVK........', 'KVVKKKK.....', '.KKNNNNK....', '...KKKK.....'] },   // bar-end mirrors on the clip-ons
      { y:0, ph:[3, 45], f:ph => tyreRows(4, 12, ph) },                                                       // narrower, taller tyre
      { y:-9, hang:2, rows:[                                                                                 // rider in leather and jeans
        '......KKK', '.....KhhU', '....KhhhU', '....KihhU', '....KuuuU', '.....KkkK', '....KKKKK',
        '..KKaaaaa', '.Kcaaaaab', '.Kcaabbbb', 'Kccabbbbb', 'Kccabbbbb', 'KKccbbbbb', 'KllKKKKKK', 'KlllK....', 'KmllK....', 'KmllK....', 'KNNNK....', '.KKK.....'] },
      { y:-21, x:5, hang:2, full:true, ph:[3, 110], f:ph => scarf[ph] },                                        // scarf streaming right from the collar
      { y:-6, rows:['..KKKK', '.K0114', 'K01224', 'K12224', 'K22224', 'KKKKKK', '.KKRRQ', '..KrrR', '...KKK'] },  // round hump, stripe, round light
      { y:-1, rows:['.KK......', 'KWWK.....', 'KVNKKK...', '.KKVVK...', '...KKK...'] }],                       // megaphones, both sides
      lights:[[0, -9.5, 4]], ex:[[-7, -3], [7, -3]] };
  }

  /* Neon Ghost. The sport bike's rider shape in a dark suit with cyan seams and a magenta visor band, on a dark modern bike with two
     blade fins whose cyan strips chase, a magenta lip, and a cyan-rimmed wheel. The red tail bar is still the brightest thing. */
  {
    const pal = P({ K:'#05040c', 1:'#3c3c60', 2:'#1e1c30', 3:'#0e0c18', a:'#4a4870', b:'#24223a', c:'#121020',
      h:'#4a4a70', i:'#2a2840', u:'#ff3bd0', E:'#4ff0ff', e:'#1a7a90', F:'#ff3bd0', f:'#7a1a6a', Z:'#e8ffff', T:'#0c0a10', t:'#2a2836' });
    const chase = (rows, ph) => rows.map((r, i) => (i + ph) % 4 === 0 ? r.replace(/E/g, 'Z') : (i + ph) % 4 === 2 ? r.replace(/E/g, 'e') : r);
    B.neon = { name:'Neon Ghost', note:'light strips and a ring wheel', pal, shadow:10, parts:[
      { y:-13, rows:['.......KKK', '.....KKFFF', '....KfFFFF', '...KK33333', '...K333333'] },                    // low nose cowl, magenta lip
      { y:0, ph:[3, 45], f:ph => tyreRows(6, 11, ph).map((r, i) => i < 11 ? 'E' + r.slice(1) : r) },            // tyre with a cyan rim
      { y:-10, hang:2, rows:[                                                                                // rider in a dark suit, cyan seams
        '......KKK', '.....KhhK', '....KhhhK', '....Kuuuu', '....KihhK', '.....KihK', '....KKKKK',
        '..KKbbbbE', '.KEbbbbbE', '.KEbbbbbE', 'KcEbbbbEE', 'KcEbbbbEE', 'KKcEbbbbb', '.KKKKKKKK', 'KbK......', 'KbbK.....', 'KEbK.....', '.KKK.....'] },
      { y:-4, ph:[4, 90], f:ph => chase([                                                                    // blade fins and tail
        'K............', 'EK...........', 'KEK..........', '.KEK.........', '.K2EK........', '..K2EK.......', '..K22EK......', '...K22EKKKKKK', '...K222EEEEEE',
        '...K2222222222', '...KKKKKKKKKKK', '...KRRRRRRRRRQ', '....KrrrrrrrrR', '....KKKKKKKKKK', '.....KFFFFFFFF', '......KKKKKKKK'], ph) }],
      lights:[[-5, -7, 4], [5, -7, 4]], glows:[[-12, -18, 3, '#4ff0ff', .4], [12, -18, 3, '#4ff0ff', .4], [0, -5, 4, '#ff3bd0', .3]],
      ex:[[0, -2]] };
  }
  /* Grand Prix. The sport bike itself in a white, blue and red late-80s works livery (the colours of Super Hang-On's player bike):
     blue fairing, white leathers with red side panels and blue stripes, a white tail with a blue band. Same silhouette on purpose. */
  {
    const swap = (rows, m) => rows.map(r => r.replace(/./g, ch => m[ch] || ch));
    const pal = P({ K:'#080a18', 1:'#7aa4ff', 2:'#2050d0', 3:'#10206a', w:'#f6f4ee', v:'#b0b0c8', c:'#ff4a4a', b:'#b01828', x:'#2050d0',
      4:'#f6f4ee', 5:'#c4c4d8', 6:'#2050d0', W:'#c8c4d0' });
    B.gp = { name:'Grand Prix', note:'a white, blue and red works livery', pal, shadow:9, parts:[
      { y:0, ph:[3, 45], f:ph => BIKE_TOP.concat(tyre(ph)) },
      { y:-10, hang:2, f:() => swap(RIDER, { R:'x' }) },
      { y:-6, f:() => swap(TAIL, { 1:'4', 2:'5', 3:'6' }) },
      { y:-1, x:5, full:true, f:() => EXH }],
      lights:[[0, -11.5, 6]], ex:[[5, -3]] };
  }

  const ORDER = ['sport', 'capsule', 'kaido', 'cafe', 'neon', 'gp'];
  const LIST = ORDER.map(id => ({ id, name:B[id].name, note:B[id].note }));

  /* ------------------------------------------------------------------ lean poses (Super Hang-On's way, not a rotated canvas)
     The bike used to lean by rotating the canvas, which drew every sprite pixel as a tilted k x k block off the canvas grid (pixels of
     mixed size). Now each bike has 7 poses, upright and three a side (12, 20 and 29 degrees), built as pixel grids in warm() and picked by
     lean with hysteresis, as Super Hang-On and OutRun pick a per-angle sprite. Each part of each pose is built the way a pixel artist starts
     a rotated small sprite: an underdrawing at the sprite's own resolution, sampled 4 x 4 per pixel through the rotation about the contact
     patch (the commonest key wins, outlines count 1.5x so 1-px lines survive), with the rider hung off 1-3 px to the inside and his helmet
     a pixel further in from the 2nd pose; then hand-drawn pixels over it: the inside knee (KNEE), and any HAND grid.
     Computed alternatives were tried and judged worse at game scale: RotSprite (roads_b.md S3), row shear, banded shears, three-shear
     rotation (research/sundown-craft/vehicles.md). Blind text-grid redraws of the sport rider were also worse and were taken out; HAND is
     the place for a pixel artist's cleanup pass.
     Every pixel of a pose remembers the upright pixel it came from, so tyre and part animation phases and the cosmetics (ui/cosmetics.js:
     palette, helmet patterns, jacket panels, tank art) reach every pose.
     A right-lean pose serves the left lean too (mirrored, taking its colours from the mirrored upright pixels, so the light stays on the
     upper left); parts off the centre line (the sport bike's exhaust, the cafe racer's scarf) are posed per side.
     All of a bike's poses and phases are packed in one atlas canvas per bike and cosmetics signature. */
  const FR = [{ a:0, hang:0, head:0 }, { a:12, hang:1, head:0 }, { a:20, hang:2, head:1 }, { a:29, hang:3, head:1 }];
  FR.forEach(F => { F.t = F.a * Math.PI / 180; });
  const LEAN_B = [.10, .28, .43], HYS = .03;   // pose boundaries in radians of the game's lean, and the hysteresis either side of each
  const MARGIN = 2;   // room round each underdrawing for hand-drawn pixels (the rider gets 6 more, for the knee)
  /* HAND['id:part:pose'] = rows, the same size as the underdrawing (ENV.bikes._guide prints it). A pixel left at the underdrawing's key
     follows the upright pixel it came from; any other key is drawn as written. Extra keys: '(' / ')' / '!' the rider's leg light / dark /
     knee slider (LEG, per bike), '<' '>' '^' 'v' copy the finished pixel to the left / right / above / below (mends a gap in the bike's
     own colour, so one grid serves riders of the same shape on different bikes). */
  /* The two deep poses (20 and 29 degrees), cleaned by hand as one composite each and split back into their parts (artpolish, 2026-11-20;
     notes in research/sundown-craft/artpolish.md): a 1-px collar that parts the helmet from the back, the helmet and back stripes on the
     pose's own stair (2:1 at 29, 3:1 at 20), the wing with one outline, a highlight rim, a steep screen streak and a shaded foot, the
     mirror as a lit pod, the tail bands as clean stairs, a tidy plate and tyre end, and upright exhaust cans. In the tyre, every tread
     pixel sits on one lattice (a pixel whose own source is off it copies a neighbour on the right bar: '<' '>' '^' 'v'), so the three
     rolling phases step as clean bars instead of shimmering. The left leans mirror these (the exhaust has its own grids). The Grand
     Prix bike has the same silhouette, so it takes the same grids in its own keys. */
  const HAND = {
    'sport:0:3':['............................', '............................', '........KKK.................', '........KAK.................', '.......KKKK.................', '......K11111................', '.....K1ww2222111............', '.....K12ww2222111...........', '.....K122w22222211..........', '.....K122w2222222211........', '.....K322ww22222222111KKK...', '.....KK322w222222222211KKAK.', '......K3322w22222222221KKK..', '......KKK322222222222ww1K...', '.......KKK33222w22wwwww1K...', '......KKTTKK3322w2w22211K...', '......KTTTTTKK33222221KK....', '.....KKTTt>TTKKK3333KKK.....', '....KKTTTt>ttTTKKK3KK.......', '....K>TT>T>tTTTK.K..........', '...K>TTt>t>TTTK.............', '...K>TTTtttTTTK.............', '..K>TTttTTtT................', '..KTTTttttTK................', '...KT<TTttTTK...............', '...KK^t<TTTKK...............', '.....KK>tTTK................', '.......KKT<K................', '.........KK.................', '............................', '............................'],
    'sport:1:3':['....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '.....................KK.............', '....................KwwKK...........', '...................KwwwRRKK.........', '..................KvwwwRRwwK........', '.............KKKKKKwwwRRwwwK........', '...........wKcwwwwKKvwRRwwvK........', '...........KccwwwwwwKKRwwwvK........', '..........2KbcwwwwwRRKKKwwKK........', '..........KKbcwwwwwRRwwwKK..........', '.........KKKKcwwwRRRRwwwww..........', '........KKcKKKKwRRRRwwwwwcK.........', '........KPcK..KKKwwwwwwwwcK.........', '........KKcK....KKKwwwwwccK.........', '.........KKK......KKKwwwcbK.........', '...................KKKKKcbK.........', '.....................KKKKK..........', '......................KKKK..........', '.....................KccK...........', '....................KKcKK...........', '....................KKKK............', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................'],
    'sport:2:3':['.................', '.................', '..KKK............', '..K11KK..........', '..K1211KK........', '..KRR2211KK......', '..K33RR2211K.....', '..K3333RR2211K...', '..KKK3333RR2211..', '..TTKKK3333RR11..', '..TTKPPKK3333K...', '...TKKpPPK33K....', '....TTKKKK.K.....', '......TK.........', '.................', '.................'],
    'sport:3:3':['........', '........', '...KK...', '..TKWWK.', '..TKWwK.', '..TKWWK.', '..KKKK..', '........', '........'],
    'sport:3:-3':['.........', '.........', '..KKK....', '..KWWK...', '..KWwK...', '..KWWK...', '...KKK...', '.........', '.........'],
    'sport:0:2':['.........................', '.........................', '.........................', '.....KKK.................', '.....KAK.................', '...KKKKK111..............', '..K1ww222111.............', '..K12ww2222111...........', '..K122w2222222111...KKK..', '..K12ww222222222211KKAK..', '..K322ww222222222221KKK..', '..KK322w2222222222221K...', '...K3222w222222222www1...', '...K333222222222wwww21...', '....KKK333222ww2w221KK...', '.....KKKKK3332222221K....', '.....KTTTKKKK332233K.....', '....KKTT>TTTKKK33KKK.....', '....KTTt>ttTTTKKKK.......', '....KTTT>ttTTKK..........', '...KKTTt>TTTTK...........', '...KTTttttTTTK...........', '...KTTTTttTTK............', '..KTTTttTTTTK............', '..KTT>tttTTKK............', '..KTTTTTtTTK.............', '..KKKtttTTTK.............', '....KKKKTTKK.............', '.......KKKK..............', '.........................', '.........................'],
    'sport:1:2':['...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................KKK.............', '..................KwwwKKK..........', '.................KwwwwRRwK.........', '.................KwwwwRRwwK........', '................KKwwwRRwwwK........', '............2KKKKKKKwRRwwvK........', '............KcwwwwwKKKwwvKK........', '..........2KcwwwwwwRRKKKK..........', '..........2KbcwwwwwRRRwww..........', '..........3KbcwwwwRRRwwwwwK........', '.........KKKKwwwwRRRRwwwwcK........', '.........KcKKKKwwwRRRwwwwcK........', '........KKcK..KKKKwwwwwwccK........', '.........PcKK....KKKKwwwcbK........', '.........KKK........KKKKbKK........', '...........K...........KKKK........', '......................KKcK.........', '.....................KKccK.........', '.....................KKPKK.........', '......................KK...........', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................'],
    'sport:2:2':['..................', '..................', '..KKKK............', '..K11KKK..........', '..K12111KKK.......', '..KRR22211KKKK....', '..K33RR222111KKK..', '..KK333RRR2221K...', '...K333333RRR1K...', '...KKPP33333KK....', '...KKpPPPP3KK.....', '...KKKKPpPK.......', '......KKKK........', '..................', '..................'],
    'sport:3:2':['........', '........', '..KKKK..', '..KWWK..', '..KWwK..', '..KWWK..', '..KKK...', '........', '........'],
    'sport:3:-2':['.........', '.........', '..KKK....', '..KWWK...', '..KWwK...', '..KWWK...', '...KKK...', '.........', '.........', '.........'],
    'gp:0:3':['............................', '............................', '........KKK.................', '........KAK.................', '.......KKKK.................', '......K11111................', '.....K1ww2222111............', '.....K12ww2222111...........', '.....K122w22222211..........', '.....K122w2222222211........', '.....K322ww22222222111KKK...', '.....KK322w222222222211KKAK.', '......K3322w22222222221KKK..', '......KKK322222222222ww1K...', '.......KKK33222w22wwwww1K...', '......KKTTKK3322w2w22211K...', '......KTTTTTKK33222221KK....', '.....KKTTt>TTKKK3333KKK.....', '....KKTTTt>ttTTKKK3KK.......', '....K>TT>T>tTTTK.K..........', '...K>TTt>t>TTTK.............', '...K>TTTtttTTTK.............', '..K>TTttTTtT................', '..KTTTttttTK................', '...KT<TTttTTK...............', '...KK^t<TTTKK...............', '.....KK>tTTK................', '.......KKT<K................', '.........KK.................', '............................', '............................'],
    'gp:1:3':['....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '.....................KK.............', '....................KwwKK...........', '...................KwwwxxKK.........', '..................KvwwwxxwwK........', '.............KKKKKKwwwxxwwwK........', '...........wKcwwwwKKvwxxwwvK........', '...........KccwwwwwwKKxwwwvK........', '..........2KbcwwwwwxxKKKwwKK........', '..........KKbcwwwwwxxwwwKK..........', '.........KKKKcwwwxxxxwwwww..........', '........KKcKKKKwxxxxwwwwwcK.........', '........KPcK..KKKwwwwwwwwcK.........', '........KKcK....KKKwwwwwccK.........', '.........KKK......KKKwwwcbK.........', '...................KKKKKcbK.........', '.....................KKKKK..........', '......................KKKK..........', '.....................KccK...........', '....................KKcKK...........', '....................KKKK............', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................', '....................................'],
    'gp:2:3':['.................', '.................', '..KKK............', '..K44KK..........', '..K4544KK........', '..KRR5544KK......', '..K66RR5544K.....', '..K6666RR5544K...', '..KKK6666RR5544..', '..TTKKK6666RR44..', '..TTKPPKK6666K...', '...TKKpPPK66K....', '....TTKKKK.K.....', '......TK.........', '.................', '.................'],
    'gp:3:3':['........', '........', '...KK...', '..TKWWK.', '..TKWwK.', '..TKWWK.', '..KKKK..', '........', '........'],
    'gp:3:-3':['.........', '.........', '..KKK....', '..KWWK...', '..KWwK...', '..KWWK...', '...KKK...', '.........', '.........'],
    'gp:0:2':['.........................', '.........................', '.........................', '.....KKK.................', '.....KAK.................', '...KKKKK111..............', '..K1ww222111.............', '..K12ww2222111...........', '..K122w2222222111...KKK..', '..K12ww222222222211KKAK..', '..K322ww222222222221KKK..', '..KK322w2222222222221K...', '...K3222w222222222www1...', '...K333222222222wwww21...', '....KKK333222ww2w221KK...', '.....KKKKK3332222221K....', '.....KTTTKKKK332233K.....', '....KKTT>TTTKKK33KKK.....', '....KTTt>ttTTTKKKK.......', '....KTTT>ttTTKK..........', '...KKTTt>TTTTK...........', '...KTTttttTTTK...........', '...KTTTTttTTK............', '..KTTTttTTTTK............', '..KTT>tttTTKK............', '..KTTTTTtTTK.............', '..KKKtttTTTK.............', '....KKKKTTKK.............', '.......KKKK..............', '.........................', '.........................'],
    'gp:1:2':['...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................KKK.............', '..................KwwwKKK..........', '.................KwwwwxxwK.........', '.................KwwwwxxwwK........', '................KKwwwxxwwwK........', '............2KKKKKKKwxxwwvK........', '............KcwwwwwKKKwwvKK........', '..........2KcwwwwwwxxKKKK..........', '..........2Kbcwwwwwxxxwww..........', '..........3KbcwwwwxxxwwwwwK........', '.........KKKKwwwwxxxxwwwwcK........', '.........KcKKKKwwwxxxwwwwcK........', '........KKcK..KKKKwwwwwwccK........', '.........PcKK....KKKKwwwcbK........', '.........KKK........KKKKbKK........', '...........K...........KKKK........', '......................KKcK.........', '.....................KKccK.........', '.....................KKPKK.........', '......................KK...........', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................', '...................................'],
    'gp:2:2':['..................', '..................', '..KKKK............', '..K44KKK..........', '..K45444KKK.......', '..KRR55544KKKK....', '..K66RR555444KKK..', '..KK666RRR5554K...', '...K666666RRR4K...', '...KKPP66666KK....', '...KKpPPPP6KK.....', '...KKKKPpPK.......', '......KKKK........', '..................', '..................'],
    'gp:3:2':['........', '........', '..KKKK..', '..KWWK..', '..KWwK..', '..KWWK..', '..KKK...', '........', '........'],
    'gp:3:-2':['.........', '.........', '..KKK....', '..KWWK...', '..KWwK...', '..KWWK...', '...KKK...', '.........', '.........', '.........'] };
  const LEG = { sport:['c', 'b', 'P'], gp:['c', 'b', 'P'], capsule:['b', 'c', 'Y'], kaido:['b', 'c', 'i'], cafe:['l', 'm', 'N'], neon:['b', 'c', 'E'] };
  /* The inside knee (a right lean; mirrored for the left), stamped where the rider's inside boot ended up: the thigh out over the fairing,
     the knee slider ('!') reaching for the road. Keys as in HAND; '.' leaves the pixel as it was. */
  const KNEE = [null, null, [
    'K(K.',
    'K)(K',
    '.K!K',
    '..K.'], [
    'K((K.',
    'K()(K',
    '.K)))K',
    '..K)!K',
    '...KK.']];
  const NB = { '<':[-1, 0], '>':[1, 0], '^':[0, -1], 'v':[0, 1] };
  // a part's rows as full rows (mirrored halves, the right half one step darker on the highlight keys, '%' resolved), as mk paints them
  function fullRows(rows, full){ const n = Math.max(...rows.map(r => r.length));
    return rows.map((r0, y) => { const r = full ? r0.padEnd(n, '.') : r0.padStart(n, '.'), f = full ? r : r + [...r].reverse().map(ch => RM[ch] || ch).join('');
      return [...f].map((ch, x) => ch === '%' ? ((x + y) % 2 ? '1' : '2') : ch).join(''); }); }
  /* The underdrawing of one part in pose j to side d (+1 right, -1 left): every destination pixel looks up, through the inverse rotation
     about the contact patch, the upright pixel under its centre. Returns { w, h, ox, oy, src } with src[i] = row * w0 + col of the upright
     grid or -1 (ox, oy: top-left in sprite px, y down from the ground line). */
  function guide(G, x0, Y0, j, d, rider){ const F = FR[j], n = G.length, w0 = G[0].length, t = F.t * d, c = Math.cos(t), s = Math.sin(t);
    const sh = r => rider ? d * (F.hang + (r < 6 ? F.head : 0)) : 0;
    // forward-map the corners to bound the result
    let lx = 1e9, hx = -1e9, lv = 1e9, hv = -1e9;
    for(const [x, v] of [[x0 - 4, -Y0 + 1], [x0 + w0 + 4, -Y0 + 1], [x0 - 4, -(Y0 + n) - 1], [x0 + w0 + 4, -(Y0 + n) - 1]]){ const X = x * c + v * s, V = -x * s + v * c;
      lx = Math.min(lx, X); hx = Math.max(hx, X); lv = Math.min(lv, V); hv = Math.max(hv, V); }
    lx = Math.floor(lx) - MARGIN; hx = Math.ceil(hx) + MARGIN; lv = Math.floor(lv) - MARGIN; hv = Math.ceil(hv) + MARGIN;
    const w = hx - lx + 1, h = hv - lv + 1, src = new Int32Array(w * h).fill(-1);
    // 4 x 4 samples a pixel: the commonest upright key wins (outlines count double, so a 1-px line survives), transparent under 6/16 cover;
    // the pixel follows the sample of the winning key nearest its centre
    const S = 4, KW = 1.5, cnt = new Map();
    for(let yy = 0; yy < h; yy++) for(let xx = 0; xx < w; xx++){ cnt.clear(); let cover = 0;
      for(let sy = 0; sy < S; sy++) for(let sx = 0; sx < S; sx++){ const X = lx + xx + (sx + .5) / S, V = hv - yy + 1 - (sy + .5) / S, xs = X * c - V * s, vs = X * s + V * c;
        const r = -Y0 - 1 - Math.floor(vs); if(r < 0 || r >= n) continue; const q = Math.floor(xs - sh(r)) - x0; if(q < 0 || q >= w0) continue; const ch = G[r][q]; if(ch === '.') continue;
        cover++; const dd = (sx - 1.5) * (sx - 1.5) + (sy - 1.5) * (sy - 1.5), e = cnt.get(ch); if(!e) cnt.set(ch, [ch === 'K' ? KW : 1, dd, r * w0 + q]); else { e[0] += ch === 'K' ? KW : 1; if(dd < e[1]){ e[1] = dd; e[2] = r * w0 + q; } } }
      if(cover < 6) continue; let best = null; for(const e of cnt.values()) if(!best || e[0] > best[0] || (e[0] === best[0] && e[1] < best[1])) best = e; src[yy * w + xx] = best[2]; }
    // crop to the pixels, then leave MARGIN round them for hand-drawn ones
    let ax = w, bx = -1, ay = h, by = -1; for(let i = 0; i < w * h; i++) if(src[i] >= 0){ const xx = i % w, yy = (i - xx) / w; ax = Math.min(ax, xx); bx = Math.max(bx, xx); ay = Math.min(ay, yy); by = Math.max(by, yy); }
    const M = rider ? MARGIN + 6 : MARGIN; ax -= M; bx += M; ay -= M; by += M; const w2 = bx - ax + 1, h2 = by - ay + 1, s2 = new Int32Array(w2 * h2).fill(-1);
    for(let yy = 0; yy < h2; yy++) for(let xx = 0; xx < w2; xx++){ const X = ax + xx, Y = ay + yy; if(X >= 0 && X < w && Y >= 0 && Y < h) s2[yy * w2 + xx] = src[Y * w + X]; }
    return { w:w2, h:h2, ox:lx + ax, oy:-hv - 1 + ay, src:s2 }; }
  // crop a key grid to its pixels: { g, w, h, ox, oy }
  function crop(g, w, h, ox, oy){ let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(g[y * w + x] !== '.'){ x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if(x1 < 0) return { g:['.'], w:1, h:1, ox:0, oy:0 };
    const rows = []; for(let y = y0; y <= y1; y++){ let r = ''; for(let x = x0; x <= x1; x++) r += g[y * w + x]; rows.push(r); }
    return { g:rows, w:x1 - x0 + 1, h:y1 - y0 + 1, ox:ox + x0, oy:oy + y0 }; }
  /* One finished pose of one part: P = { w, h, ox, oy, src, lit } (lit[i]: a hand-drawn key, or null to follow src); Gv = the upright full
     rows of this phase and look; mirror: flip it (the left lean of a centred part). */
  function finish(P, Gv, w0, leg, mirror){ const { w, h } = P, g = new Array(w * h).fill('.');
    for(let i = 0; i < w * h; i++){ const L = P.lit[i]; if(L) continue; const sI = P.src[i]; if(sI < 0) continue; let r = Math.floor(sI / w0), q = sI % w0; if(mirror) q = w0 - 1 - q;
      g[i] = Gv[r][q]; }
    for(let i = 0; i < w * h; i++){ const L = P.lit[i]; if(!L || NB[L]) continue; g[i] = L === '(' ? leg[0] : L === ')' ? leg[1] : L === '!' ? leg[2] : L; }
    if(P.knee){ const [kx, ky, kg] = P.knee; kg.forEach((row, y) => [...row].forEach((ch, x) => { if(ch === '.') return; const X = kx + x, Y = ky + y; if(X < 0 || X >= w || Y < 0 || Y >= h) return;
      g[Y * w + X] = ch === '(' ? leg[0] : ch === ')' ? leg[1] : ch === '!' ? leg[2] : ch; })); }
    for(let pass = 0; pass < 2; pass++) for(let i = 0; i < w * h; i++){ const L = P.lit[i]; if(!L || !NB[L]) continue; const [dx, dy] = NB[L], x = i % w + dx, y = Math.floor(i / w) + dy;
      if(x >= 0 && x < w && y >= 0 && y < h) g[i] = g[y * w + x]; }
    if(mirror){ const m = new Array(w * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) m[y * w + x] = g[y * w + (w - 1 - x)]; return crop(m, w, h, -(P.ox + w), P.oy); }
    return crop(g, w, h, P.ox, P.oy); }
  // the underdrawing with the hand grid laid over it: which pixels follow the upright and which are drawn by hand
  function handOver(P, G0, w0, key){ const lit = new Array(P.w * P.h).fill(null), H = HAND[key], src0 = P.src.slice();
    if(H){ if(H.length !== P.h || H.some(r => r.length !== P.w)) console.warn('bikes: hand grid ' + key + ' is not ' + P.w + ' x ' + P.h);
      else for(let y = 0; y < P.h; y++) for(let x = 0; x < P.w; x++){ const i = y * P.w + x, ch = H[y][x], sI = P.src[i], auto = sI < 0 ? '.' : G0[Math.floor(sI / w0)][sI % w0];
        if(ch === auto) continue; if(ch === '.'){ P.src[i] = -1; continue; }
        // a drawn key borrows the upright pixel of the nearest underdrawn pixel with that key, so phases and cosmetics still reach it
        let best = -1, bd = 1e9; if(!NB[ch] && !'()!'.includes(ch)) for(let dy = -3; dy <= 3; dy++) for(let dx = -3; dx <= 3; dx++){ const xx = x + dx, yy = y + dy; if(xx < 0 || xx >= P.w || yy < 0 || yy >= P.h) continue;
          const s2 = src0[yy * P.w + xx]; if(s2 >= 0 && G0[Math.floor(s2 / w0)][s2 % w0] === ch && dx * dx + dy * dy < bd){ bd = dx * dx + dy * dy; best = s2; } }
        if(best >= 0) P.src[i] = best; else lit[i] = ch; } }
    P.lit = lit; return P; }
  const ATL = {};   // id + sig -> { cv, cells }
  const roleOf = p => p.hang && !p.full ? 'rider' : (p.y || 0) === 0 ? 'top' : 'tail';
  function partRows(id, i, ph, C, sig){ const b = B[id], p = b.parts[i], pal = p.pal || b.pal, P0 = typeof pal === 'function' ? pal() : pal;
    const rows = p.f ? p.f(ph) : p.rows, role = roleOf(p);   // cosmetics: ui/cosmetics.js ('' = unchanged)
    return { rows:sig ? C.rows(id, role, rows) : rows, pal:sig ? C.pal(id, role, P0) : P0, role }; }
  // the poses of part i of bike id (default look, phase 0): { j*d: P } with mirrored: true where the left lean is the right one flipped
  const POSES = {};
  function posesOf(id, i){ const k = id + ':' + i; if(POSES[k]) return POSES[k]; const p = B[id].parts[i], R = partRows(id, i, 0, null, ''), G0 = fullRows(R.rows, p.full), w0 = G0[0].length, n = G0.length;
    const x0 = Math.round((p.x || 0) - w0 / 2), Y0 = (p.y || 0) - n, sym = !p.full && !p.x, out = { w0, x0, Y0, G0 };
    for(let j = 0; j < FR.length; j++) for(const d of j ? [1, -1] : [1]){ if(d < 0 && sym){ out[-j] = Object.assign({ mirror:true }, out[j]); continue; }
      const P = out[j * d] = handOver(guide(G0, x0, Y0, j, d, !!p.hang), G0, w0, id + ':' + i + ':' + j * d);
      if(roleOf(p) === 'rider' && KNEE[j]){ const tr = n - 3, tq = w0 - 2; let bi = -1, bd = 1e9;   // the inside boot: nearest posed pixel to the upright one
        for(let k = 0; k < P.src.length; k++){ const sI = P.src[k]; if(sI < 0) continue; const r = Math.floor(sI / w0), q = sI % w0, dd = (r - tr) * (r - tr) + (q - tq) * (q - tq); if(dd < bd){ bd = dd; bi = k; } }
        if(bi >= 0) P.knee = [bi % P.w - 2, Math.floor(bi / P.w) - 1, KNEE[j]]; } }
    return POSES[k] = out; }
  function build(id){ const C = window.COS, sig = C ? C.sig : '', key = id + sig; if(ATL[key]) return ATL[key];
    const b = B[id], cells = {}, list = [], leg = LEG[id] || LEG.sport;
    b.parts.forEach((p, i) => { const PS = posesOf(id, i);
      for(let ph = 0; ph < (p.ph ? p.ph[0] : 1); ph++){ const R = partRows(id, i, ph, C, sig), Gv = fullRows(R.rows, p.full);
        for(const f in PS){ if(!/^-?\d+$/.test(f)) continue; const P = PS[f], c = finish(P, Gv, PS.w0, leg, !!P.mirror); c.pal = R.pal; cells[i + ':' + ph + ':' + f] = c; list.push(c); } } });
    // pack the cells on shelves in one canvas and paint it through ImageData (one texture per bike and look)
    const AW = 256; let x = 0, y = 0, sh = 0; for(const c of list){ if(x + c.w > AW){ x = 0; y += sh + 1; sh = 0; } c.sx = x; c.sy = y; x += c.w + 1; sh = Math.max(sh, c.h); }
    const cv = document.createElement('canvas'); cv.width = AW; cv.height = y + sh; const g = cv.getContext('2d'), im = g.createImageData(AW, cv.height), D = im.data;
    for(const c of list) for(let r = 0; r < c.h; r++){ const row = c.g[r]; for(let q = 0; q < row.length; q++){ const ch = row[q]; if(ch === '.') continue; const col = c.pal[ch]; if(!col) continue;
      const [R0, G0, B0] = hx(col), o = ((c.sy + r) * AW + c.sx + q) * 4; D[o] = R0; D[o + 1] = G0; D[o + 2] = B0; D[o + 3] = 255; } }
    g.putImageData(im, 0, 0); for(const c of list) delete c.pal;
    return ATL[key] = { cv, cells }; }
  const poseOf = lean => { const a = Math.abs(lean); let j = 0; while(j < LEAN_B.length && a >= LEAN_B[j]) j++; return j * (lean < 0 ? -1 : 1); };
  // with hysteresis: the pose changes only once the lean is HYS past the boundary, so it never flickers between two poses
  let curF = 0;
  function poseHys(lean){ let f = curF; for(let t = 0; t < 6; t++){ const a = Math.abs(f), s = f < 0 ? -1 : 1;
      const up = a < LEAN_B.length ? LEAN_B[a] + HYS : Infinity, dn = a > 0 ? LEAN_B[a - 1] - HYS : -Infinity, v = lean * (f === 0 ? 1 : s);
      if(f === 0){ if(Math.abs(lean) > LEAN_B[0] + HYS) f = lean < 0 ? -1 : 1; else break; }
      else if(v > up) f += s; else if(v < dn) f -= s; else break; }
    return curF = f; }
  // a point on the bike (sprite px, y up negative) in pose f: the tail light, exhausts and glows ride with the lean
  const ptOf = (lx, ly, f) => { const F = FR[Math.abs(f)], t = F.t * (f < 0 ? -1 : 1), v = -ly; return [lx * Math.cos(t) + v * Math.sin(t), -(-lx * Math.sin(t) + v * Math.cos(t))]; };
  function glowOn(g, x, y, r, col, a){ if(r < 1 || a <= 0) return; const [R, G, Bl] = hx(col); g.globalCompositeOperation = 'lighter';
    for(const [f, m] of [[1, .07], [.6, .16], [.3, .4]]){ g.fillStyle = `rgba(${R},${G},${Bl},${a * m})`; g.beginPath(); g.arc(x, y, Math.max(1, r * f), 0, 6.283); g.fill(); }
    g.globalCompositeOperation = 'source-over'; }
  const cellAt = (A, key, x, y, k, g) => { const c = A.cells[key]; if(c) g.drawImage(A.cv, c.sx, c.sy, c.w, c.h, Math.round(x + c.ox * k), Math.round(y + c.oy * k), c.w * k, c.h * k); };
  // draw bike `id` on context g at pixel size k in pose f (signed -3..3; omitted: the nearest pose for `lean`); boost = flame colour or null
  /* draw bike `id` on context g at pixel size k in pose f (signed -3..3; omitted: the nearest pose for `lean`); boost = flame colour or null.
     Between poses the drawn pose turns by the rest of the lean (lean minus the pose's own angle, under 0.1 rad: about half the gap between
     poses) about the contact patch, nearest-neighbour at the bike's pixel size, so steering moves continuously like in-between frames and
     the drawn poses carry the shape. Pose angle + residual = the lean, so a pose switch changes the drawing, never the angle. */
  function render(g, id, x, y, k, lean, now, boost, f){ if(!B[id]) id = 'sport'; const b = B[id], A = build(id); lean = lean || 0; if(f === undefined) f = poseOf(lean);
    const noR = typeof BIKE !== 'undefined' && BIKE.noRider, res = clamp(lean - FR[Math.abs(f)].t * (f < 0 ? -1 : 1), -.14, .14);   // rider parts hidden while the rider is off the bike (arrest)
    g.save(); g.imageSmoothingEnabled = false; g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(x, y, b.shadow * k, 1.6 * k, 0, 0, 6.283); g.fill();
    g.translate(Math.round(x), Math.round(y)); if(Math.abs(res) > .002) g.rotate(res);
    b.parts.forEach((p, i) => { if(p.hang && noR) return; const ph = p.ph ? Math.floor((now || 0) / p.ph[1]) % p.ph[0] : 0;
      cellAt(A, i + ':' + ph + ':' + f, 0, 0, k, g); });
    for(const [lx, ly, r] of b.lights){ const [X, Y] = ptOf(lx, ly, f); glowOn(g, X * k, Y * k, r * k, '#ff2a3a', .55); }
    for(const [lx, ly, r, col, a] of b.glows || []){ const [X, Y] = ptOf(lx, ly, f); glowOn(g, X * k, Y * k, r * k, col, a); }
    if(boost) for(const [ex, ey] of b.ex){ const [X, Y] = ptOf(ex, ey, f); g.fillStyle = boost; g.fillRect(Math.round((X - .5) * k), Math.round((Y - .5) * k), k, k); glowOn(g, X * k, Y * k, (4 + Math.random() * 2) * k, boost, .75); }
    g.restore(); }

  ENV.bikes = {
    list:LIST,
    frames:true,   // every bike, the default 'sport' included, is drawn here in hand-built lean poses (sundown.html drawBike hands over)
    // the ride: pose picked with hysteresis; the size is exactly the old one (k from the size budget s)
    draw(id, x, y, s, lean, now){ if(!B[id]) id = 'sport'; const k = Math.max(PX, Math.round(s / 30 / PX) * PX), f = poseHys(lean || 0);
      render(cx, id, x, y, k, lean, now, typeof boostT !== 'undefined' && boostT > 0 ? TIER_COL[boostTier] || '#ffb35a' : null, f); if(window.COS) COS.trail(cx, x, y, k, lean, now); },
    preview(id, canvas){ if(!B[id]) id = 'sport'; const g = canvas.getContext('2d'), k = Math.max(1, Math.floor(Math.min(canvas.width / 30, canvas.height / 32)));
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height); render(g, id, canvas.width / 2, canvas.height - Math.max(2, k * 2), k, 0, 0, null, 0); },
    noRiderOK:true,   // render() honours BIKE.noRider (mech/arrival.js dismount)
    // the composed key grid of one pose (for contact sheets and notes): layers in draw order, '.' transparent
    _grid(id, f, ph = 0){ const b = B[id], A = build(id), L = []; b.parts.forEach((p, i) => { const q = p.ph ? ph % p.ph[0] : 0; for(const k of [i + ':' + q + ':' + f, 'k' + i + ':' + q + ':' + f]) if(A.cells[k]) L.push(A.cells[k]); });
      const x0 = Math.min(...L.map(c => c.ox)), x1 = Math.max(...L.map(c => c.ox + c.w)), y0 = Math.min(...L.map(c => c.oy)), y1 = Math.max(...L.map(c => c.oy + c.h)), G = Array.from({ length:y1 - y0 }, () => Array(x1 - x0).fill('.'));
      for(const c of L) c.g.forEach((r, y) => [...r].forEach((ch, x) => { if(ch !== '.') G[c.oy - y0 + y][c.ox - x0 + x] = ch; })); return G.map(r => r.join('')).join(String.fromCharCode(10)); },
    // the underdrawing of part i in pose f (right lean), the size a HAND grid must be: for authoring
    _guide(id, i, f){ const PS = posesOf(id, i), P = PS[f], G0 = PS.G0, w0 = PS.w0, out = [];
      for(let y = 0; y < P.h; y++){ let r = ''; for(let x = 0; x < P.w; x++){ const sI = P.src[y * P.w + x]; r += sI < 0 ? '.' : G0[Math.floor(sI / w0)][sI % w0]; } out.push(r); } return out.join(String.fromCharCode(10)); },
    _cur:() => curF,
    render, poseOf, poses:FR.length * 2 - 1, poseLean:j => FR[Math.abs(j)].t * Math.sign(j),
    warm(){ for(const _ of ENV.bikes.warmSteps()); },
    *warmSteps(){ for(const id of ORDER){ build(id); yield; } }   // one bike (one atlas) per step, for the staged warm-up
  };
})();
