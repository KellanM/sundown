/* Sundown set piece: 宵闇連合 THE LEGEND, a gang leader's three-phase duel (MECH.sp_boss, director id 'boss', hero tier). See setpiece/README.md.
   Load after setpiece/naruto.js:   <script src="setpiece/boss.js"></script>
   It needs mech/gang.js for the player's kick (G.kickExt, a one-line hook there) and borrows its leg and wreck sprites; without gang.js the
   duel still runs but you cannot kick.

   Who. 鬼火の鉄 Onibi no Tetsu ("Will-o'-the-wisp Tetsu"), sōchō of 宵闇連合 Yoiyami Rengō ("the Dusk-Dark Union"): invented names, no real
   gang. Black tokkōfuku with a gold onibi crest (a crescent round a flame) and gold kanji columns down the coat panels, a crimson tasuki,
   a white hachimaki whose tails stream in the wind. His machine is an original late-70s four with a rocket cowl painted in a rising-sun
   flake (crimson rays on pearl, gold flake), a tall pearl sandan seat with crimson piping, two takeyari pipes splayed in a V with
   bamboo-cut crimson tips, amber indicators on stalks, a bent-up plate, and the gang flag (night black, crimson hoist, gold crescent) on
   a pole over his right shoulder. His riders: gold pudding-bowl helmets, black gakuran, gold seats, the same flag on short poles.
   The text on his back: 夜ハ我等ノモノ "the night is ours" (shown in full in the arrival line; on the sprite it is gold glyph marks).

   References (rules taken, nothing copied):
   - Bōsōzoku photos (Wikimedia Commons: "鬼羅連合 白龍 九十九里総本部" 1-3, "Bōsōzoku at Kobe", "Bosozoku-style Kawasaki Zephyr 400 ...
     Roppongi", "Kawasaki Z400FX 1979", "CBX400F01/03"): the rear view of a sandan bike at night (a tall seat-back narrower than the
     rider, the tail light under a ducktail cowl, amber indicators on stalks, boots out on the pegs, a red tasuki crossed over a black
     tokkōfuku with a gold crest high on the back), the Z/CBX tank-and-tail lines, rocket cowls, takeyari.
   - Crazy Thunder Road (Ishii, 1980): the pack arrives as sound first, then as a wall of lights in formation; the leader is framed alone
     against his crew; the respect between rivals is a gesture, not a speech.
   - Road Rash II (EA, 1992) boss rivals: a named rival who fights side by side, both bikes at one scale, one attack per side.
   - Super Hang-On / OutRun rival pacing: the rival stays in reach, ahead and behind, so the finish is decided in the last seconds.
   - GDC boss-design talks (telegraphs and readable patterns: anticipation, a distinct tell per attack, a consistent wind-up length,
     a window to punish, phases that add one idea at a time). Every attack here: a glance, a body tell, a sound, and at least 0.85 s.

   The duel (a hero moment: at most once a ride, only from the third road on, through the rarity governor):
     ARRIVE  a horn call from behind (an original phrase on twin horns), the formation roars past both sides of you in a V and forms up
             ahead; the gang-name card 宵闇連合 in the arrival-card style; letterbox and a music duck while they pass.
     I  囲み  BOX-IN: three of his riders box you: one ahead in your lane (his tail light flares before he brake-checks), one each side
             (a cocked leg and a "!" before each kick). Kick a side rider into the barrier or a car for a takedown; ride out of the box.
             Two riders down, or 14 s, and he calls them off with his horn.
     II 一騎打ち ONE ON ONE: he drops back beside you. Two attacks, each with its own tell: KICK (he glances, cocks his leg, two horn
             blips: 0.9 s) and SWERVE (he glances and leans away while crimson chevrons paint the road he will sweep, an engine rise:
             1.0 s). Kick him during a tell for a counter. When your spirit is empty his next attack is the FINISHER (gold chevrons, 1.2 s):
             if it lands you crash; dodge it and you get your nerve back.
     III 旗まで TO THE FLAGS: a sprint to his gang's flag line (two poles, a banner across the road, flares) about ten seconds ahead.
             Cross it first, or out-style him (close calls and boosts drain him) until he concedes.
     WIN     he holds just ahead of you, looks back at you, lowers his flag down its pole in salute (a flag dip), sounds a horn salute,
             and peels away behind.  +6 s, a boost, flow.
     LOSE    you crash (any crash in the duel), or he takes the line: he raises his flag high and rides on.
   Fairness (kikubari): every attack is telegraphed >= 0.85 s and can be dodged (move away) or countered (kick); the box always leaves a
   way out (brake or kick); riders keep off you while you are airborne or blinking after a crash; the police come only through the
   core's own first-crash rule.
   Tests: ?force=boss (plans it on the first road, after the warm-up); MECH.sp_boss._start() starts it now; .state(), .report(),
   .threat() (the attack in progress, for bots), ._sheet() (a contact sheet of the poses). */
"use strict";
(() => {
const DIR = MECH.director, ID = 'boss';
const CARD = { kanji:'宵闇連合', name:'YOIYAMI RENGO', sub:'their leader rides out  -  onibi no tetsu', col:'#ffd04a', tag:'RIVAL BOSS', at:.5 };
if(DIR) DIR.register(ID, { tier:'hero', roads:['*'], card:CARD });
const ZONE_MIN = 2;   // the third road on: a legend has to hear about you first
/* THE COMBINED EVENT (director id 'teiden_boss', booked by env/akiba.js): 停電 and this duel as one hero moment. As the blackout reaches
   you, his headlight comes up the dead street from behind and lights the road (your shadow thrown ahead in it), the call sounds in the
   hush (its notes on the director's moment bus, past a deep music duck), then his card. The duel plays out in the dark as built: every
   tell unchanged (glance, body, sound, >= 0.85 s), his sprite graded to the moonlit street with the onibi crest, tail light and indicators
   kept whole, a teal rim from the two onibi flames that ride beside him, his headlight pool on the road ahead. The lights hold until the
   duel ends and come back as its last beat (env/akiba.js). Only authored (a demo level) or named (?force=teiden_boss): see combine(). */
const TB = 'teiden_boss', CARD_TB = { kanji:'宵闇連合', name:'YOIYAMI RENGO', sub:'out of the dark  -  onibi no tetsu', col:'#ffd04a', tag:'RIVAL BOSS', at:2.3 };
const tbNamed = () => /(^|[?&])force=([^&]*,)?teiden_boss(,|&|$)/.test(location.search);
if(DIR && (DIR.demo || tbNamed())) DIR.register(TB, { tier:'hero', roads:['akiba'], card:CARD_TB });
// the named test lengthens every Akihabara visit before its fork so the dark street holds the whole duel (as setpiece/megalodon.js does
// for its bore, chained onto its GATE_EXTRA / GATE_TIME). A demo level sets the road's length itself.
const TB_EXTRA = 3550, TBX = new Set();
if(tbNamed() && !window.DEMO){ const GX0 = window.GATE_EXTRA, GT0 = window.GATE_TIME;
  window.GATE_EXTRA = n => { const a = GX0 ? GX0(n) || 0 : 0; if(n === 0) TBX.clear(); if(n % 2 || typeof LANDS === 'undefined') return a; const z = n / 2, ak = LANDS.findIndex(l => l.key === 'akiba'); let can = false;
    try{ can = z === 0 ? landIdx(0) === ak : forkChoices(z - 1).includes(ak); }catch(e){ can = false; } if(!can) return a; TBX.add(n); return a + TB_EXTRA; };
  window.GATE_TIME = n => (GT0 ? GT0(n) || 0 : 0) + (TBX.has(n) ? Math.round(TB_EXTRA / 55 * 1.1) : 0); }
// key grids (sprite px, y up negative; x0/y0 = top-left), authored in the scratchpad's boss/art/art2.py (side: side.py) and inlined here
const ART = {
  pal:{ K:'#0c0710', a:'#5a5478', b:'#2e2a44', c:'#1c1930', d:'#100e1a', Y:'#ffd04a', y:'#b8862a', Z:'#fff2b0', R:'#ff3a46', r:'#b81428', q:'#5e0a16', E:'#e8a882', e:'#a8643e', H:'#221c2a', h:'#463e58', O:'#fffaf0', S:'#e4ded4', s:'#aea4b6', u:'#6e6484', W:'#f4f2fc', V:'#a8a4bc', v:'#5a566e', T:'#18161c', t:'#4a4652', L:'#ff2a3a', l:'#a01828', Q:'#ffd8cc', I:'#ffb030', i:'#a85e10', N:'#6a4430', n:'#9a6440', m:'#341e14', G:'#24264a', g:'#5a62a0', w:'#9aa8e0', P:'#e8e4d8', p:'#3a3a48' },
  // centre lines boss.js strokes per lean pose: the takeyari and the flag pole
  geom:{ pipeL:[-9, -3, -18, -33], pipeR:[8, -3, 17, -33], pole:[6, -24, 6, -58], cloth:[7, -62] },
  L:{
    back:{ x0:-14, y0:-35, rows:['.........KKKKKKKKKK.........', '........KwgGGGGGGGgK........', '........KwgGGGGGGGgK........', '........KgGGGGGGGGGK........', '........KgGGGGGGGGGK........', '........KGGGGGGGGGGK........', '........KGGGGGGGGGGK........', '............................', '....KKKKKKKKKKKKKKKKKKKK....', '..KKOOSRRRRRRRRRRRRRRSSSKK..', '.KOOSRRRRRRRRRRRRRRRRRRSSSK.', 'KOZRRRRrSSSSSSSSSSSSrRRRRYSK', 'KORRRrrSSOOOOOSSSSSSSrrRRRSK', 'KSRYrrSSOOOOOOSSSSSSSSrrYRSK', 'KsSSSSSSSRRRRRRRRRRSSSSSSSsK', 'KsssSSRRRRRRRRRRRRRRRRSSsssK', '.KussRRRRrrrrrrrrrrRRRRssuK.', '..KKuurrrrqqqqqqqqrrrruuKK..', '....KKKKKKKKKKKKKKKKKKKK....'] },
    front:{ x0:-10, y0:-18, rows:['.......KKKKKK.......', '......KOOOSSSK......', '.....KOOOOSSSSK.....', '.....KRRRRRRRRK.....', '.....KOOOOSSSSK.....', '.....KOOOOSSSSK.....', '.....KRRYRRYRRK.....', '.....KOOOOSSSSK.....', '.....KsOOOSSSsK.....', '....KKKKKKKKKKKK....', 'KKKKrRRRRRRRRRRrKKKK', 'KIiKLLLLLQQLLLLLKiIK', 'KiiKllLLLLLLLLllKiiK', '.KKKKKKKKKKKKKKKKKK.', '..KWVK.KPPPPK.KVVK..', '..KVvK.KPppPK.KvVK..', '...KK...KKKK...KK...'] },
    tyre0:{ x0:-6, y0:-13, rows:['KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', '.KKKKKKKKKK.'] },
    ht0:{ x0:-11, y0:-34, rows:['....KSOK', '..KSOSK.', '.KOSsK..', 'KSsK....', '.KK.....'] },
    cloth0:{ x0:1, y0:-2, rows:['......KK.....', 'KKKKKKbbKK...', 'RRbbbbYYbbKKK', 'RRcccYYYccbbK', 'RRcccccYYcccK', 'RRccccccYYccK', 'RRccRRccYYccK', 'RRccRRccYYccK', 'RRccccYYYcccK', 'RRccccccccccK', 'RRccccKKccccK', 'KKKKKK..KKccK', '..........KKK'] },
    clothD1:{ x0:1, y0:1, rows:['......KK.....', 'KKKKKKbbKK...', 'RRbbbbYYbbKKK', 'RRcccYYYccbbK', 'RRcccccYYcccK', 'RRccccccYYccK', 'RRccRRccYYccK', 'RRccRRccYYccK', 'RRccccYYYcccK', 'RRccccccccccK', 'RRccccKKccccK', 'KKKKKK..KKccK', '..........KKK'] },
    clothD2:{ x0:1, y0:4, rows:['......KK.....', 'KKKKKKbbKK...', 'RRbbbbYYbbKKK', 'RRcccYYYccbbK', 'RRcccccYYcccK', 'RRccccccYYccK', 'RRccRRccYYccK', 'RRccRRccYYccK', 'RRccccYYYcccK', 'RRccccccccccK', 'RRccccKKccccK', 'KKKKKK..KKccK', '..........KKK'] },
    clothD3:{ x0:1, y0:7, rows:['......KK.....', 'KKKKKKbbKK...', 'RRbbbbYYbbKKK', 'RRcccYYYccbbK', 'RRcccccYYcccK', 'RRccccccYYccK', 'RRccRRccYYccK', 'RRccRRccYYccK', 'RRccccYYYcccK', 'RRccccccccccK', 'RRccccKKccccK', 'KKKKKK..KKccK', '..........KKK'] },
    tyre1:{ x0:-6, y0:-13, rows:['KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', '.KKKKKKKKKK.'] },
    ht1:{ x0:-11, y0:-34, rows:['....KSOK', '.KSSOSK.', 'KOSsK...', 'ssK.....', 'KK......'] },
    cloth1:{ x0:1, y0:-2, rows:['........KKK..', 'KKKKK.KKcbbK.', 'RRbbbKbcdccbK', 'RRcccbYYYcccK', 'RRcccYYYYYccK', 'RRcccccYYYccK', 'RRccRccdYYccK', 'RRccRRcdYcccK', 'RRcccRcddcccK', 'RRccccYYdcccK', 'RRcccccdKKKcK', 'KKKKKcKK...KK', '.....K......K'] },
    tyre2:{ x0:-6, y0:-13, rows:['KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', 'KTTTttttTTTK', 'KTTTTTTTTTTK', 'KTTTttttTTTK', '.KKKKKKKKKK.'] },
    ht2:{ x0:-11, y0:-34, rows:['....KSOK', '..KSOSK.', '.KSOSsK.', 'KsSsK...', '.KKK....'] },
    cloth2:{ x0:1, y0:-2, rows:['...........KK', 'KKKKKKK...KcK', 'RRbbbbbKKKcdK', 'RRcccYYbbcddK', 'RRccccYYcdddK', 'RRcccccYYdddK', 'RRccRRcYYYddK', 'RRccRRccYYddK', 'RRccccccYYddK', 'RRccccYcYdddK', 'RRcccccYcddKK', 'KKKKKKKccdK..', '.......KKK...'] },
    rider:{ x0:-10, y0:-37, rows:['........KKKK........', '.......KhhHHK.......', '......KhhHHHHK......', '......KhHHHHHK......', '......OSOOSSSK......', '......KsSSSSsK......', '......KHHHHHHK......', '......KHHHHHHK......', '.......KEeeeK.......', '......KdKKKKdK......', '..KKKKKKKKKKKKKKKK..', '.RraabbbYYYYbbbbbqr.', 'KaRrbbbYyRRZYbbbqrbK', 'KaRrbbbYRRRyYbbbqrbK', 'KaaRrbbYyRqyYbbqrbbK', 'KabbRrbbYYYYbbqrbbbK', 'KabbbRrbbbbbbqrbbbbK', 'KabbbRrbbbbbbqrbbbbK', 'KYyYbbRrbbbbqrbbYyyK', 'KaYbbbbRrbbqrbbbbYbK', 'KYyYbbbbbbbbbbbbYyyK', 'KabbbbbbbbbbbbbbbbbK', 'KYbYbbbbbbbbbbbbYbyK', 'KYYYbbbbbbbbbbbbYYyK', 'KaYbbbbbbbbbbbbbbYbK', 'KaabbbbbbYYbbbbbbbbK', 'KYYYYYYYYYYYYYYYYYyK', '.YKyKKKKKKKKKKKKYKy.', '.YYy............YYy.'] },
    riderLL:{ x0:-10, y0:-37, rows:['........KKKK........', '.......KhhhHK.......', '......KhhhHHHK......', '......KhhHHHHK......', '......OSOOOOSK......', '......KEwSSSsK......', '......KEKHHHHK......', '......KEEHHHHK......', '.......KEEEeK.......', '......KdKKKKdK......', '..KKKKKKKKKKKKKKKK..', '.RraabbbYYYYbbbbbqr.', 'KaRrbbbYyRRZYbbbqrbK', 'KaRrbbbYRRRyYbbbqrbK', 'KaaRrbbYyRqyYbbqrbbK', 'KabbRrbbYYYYbbqrbbbK', 'KabbbRrbbbbbbqrbbbbK', 'KabbbRrbbbbbbqrbbbbK', 'KYyYbbRrbbbbqrbbYyyK', 'KaYbbbbRrbbqrbbbbYbK', 'KYyYbbbbbbbbbbbbYyyK', 'KabbbbbbbbbbbbbbbbbK', 'KYbYbbbbbbbbbbbbYbyK', 'KYYYbbbbbbbbbbbbYYyK', 'KaYbbbbbbbbbbbbbbYbK', 'KaabbbbbbYYbbbbbbbbK', 'KYYYYYYYYYYYYYYYYYyK', '.YKyKKKKKKKKKKKKYKy.', '.YYy............YYy.'] },
    riderLR:{ x0:-10, y0:-37, rows:['........KKKK........', '.......KHhhhK.......', '......KHHHhhhK......', '......KHHHHhhK......', '......OSOOOOOK......', '......KsSSSwEK......', '......KHHHHKEK......', '......KHHHHEEK......', '.......KeEEEK.......', '......KdKKKKdK......', '..KKKKKKKKKKKKKKKK..', '.RraabbbYYYYbbbbbqr.', 'KaRrbbbYyRRZYbbbqrbK', 'KaRrbbbYRRRyYbbbqrbK', 'KaaRrbbYyRqyYbbqrbbK', 'KabbRrbbYYYYbbqrbbbK', 'KabbbRrbbbbbbqrbbbbK', 'KabbbRrbbbbbbqrbbbbK', 'KYyYbbRrbbbbqrbbYyyK', 'KaYbbbbRrbbqrbbbbYbK', 'KYyYbbbbbbbbbbbbYyyK', 'KabbbbbbbbbbbbbbbbbK', 'KYbYbbbbbbbbbbbbYbyK', 'KYYYbbbbbbbbbbbbYYyK', 'KaYbbbbbbbbbbbbbbYbK', 'KaabbbbbbYYbbbbbbbbK', 'KYYYYYYYYYYYYYYYYYyK', '.YKyKKKKKKKKKKKKYKy.', '.YYy............YYy.'] },
    gflag0:{ x0:-9, y0:-16, rows:['.KKK.......', 'KccdKKKKKK.', 'KcYddccRRYK', 'KYYddccRRYK', 'KYYddccRRVK', 'KYYddccRRVK', 'KcYYdccRRVK', 'KccdYccRRVK', 'KKKKdccRRVK', 'K...KKKKKVK', '.........VK', '.........VK', '.........VK', '.........VK', '.........VK', '.........VK'] },
    gflag1:{ x0:-9, y0:-16, rows:['K..........', 'KKK..KKKKK.', 'KddKKccRRYK', 'KdYccccRRYK', 'KYYccccRRVK', 'KYYccccRRVK', 'KYYccccRRVK', 'KdYccccRRVK', 'KddYYccRRVK', '.KKccKKKKVK', '...KK....VK', '.........VK', '.........VK', '.........VK', '.........VK', '.........VK'] },
    gflag2:{ x0:-9, y0:-16, rows:['....K......', '..KKcKKKKK.', 'KKcccccRRYK', 'KcYccccRRYK', 'KcYccccRRVK', 'KYYccccRRVK', 'KYYcYccRRVK', 'KYYYcccRRVK', 'KcccKccRRVK', 'KcKK.KKKKVK', 'KK.......VK', '.........VK', '.........VK', '.........VK', '.........VK', '.........VK'] },
    side:{ x0:0, y0:0, rows:['.........KYK........................................................................', 'KKKKKKKKKKVK........................................................................', 'KcccKKcRRKVK........................................................................', 'KccKRqKRRKVK..KKKKK.................................................................', 'KcYKRRKRRKVK.KOOOOSK................................................................', 'KcYcKWVKRKVKKOOOOSSsK.............KKKK..................KKKKKK......................', 'KccYcKYyKKVKKOOOSSssK............KhhhHK................KgwgGGGK.....................', 'KcccYYcRRKVKKRRRRRRrK...........KhhhHHHK..............KgwgGGGK......................', 'KKKKKKWVKKVKKOOOSSssK.......KKKKKOOOOOOK..............KgwgGGGK......................', '......KWVKVKKOOSSSssK.....KKSOSKKSEEwKKK.............KgwgGGGGK......................', '......KWVKVKKOOSSsssK....KSOsKK.KHEEEEK.........KKKK.KgwgGGGGK......................', '.......KWVKKKRRYRRRrK...KsSKK...KHHEeeK.....KKKKKcaaKgwgGGGGK.......................', '........KKVKKOOSSsssK....KK.....KKdEeK..KKKKaaaaKcccKgwgGGGGGK......................', '........KWVKKOSSSsssK..........KabbdKKKKaaaabbbbbKKKKKKGGGGGK.......................', '........KWVKKOSSsssuK.........KabbbbbKaabbbbbKKKK...KWWKGGGGKKKKKKKKKKK.............', '.........KYyKRRRRRrrK........KaRbbbbbbbbbbbbaK.......KVKZOOOOOORRRRRYOOK............', '.........KVKKOSSssuuK........KabRbbbbYbcccccKK....KKKKOOOYOOOOOORRRROOORK...........', '.........KWVKSSsssuuK.......KaabbRbbbYbcKKKK.....KYRRRRROOOOOOZOORRRROORRK..........', '..........KWVKSssuuuK.......KabbbbRbbbbbK........KRRRRRRRRROOOOOOOORRROYROK.........', '.........KVKWVKssuuuK......KaabYbbbRbbbbK........KRRRRRRRRRRRROOOOOORROOYOK.........', '.........KVKWVKsuuuuKKKKKKKKabbybbbbRbbcKKKKKKKKKKRRRRRRRRRRRYRRSSSSSRRVVVRK........', '.........KVKKssuuuuuKcccccKaabbYbbbbbRbcKRRRRRRRRKRRRRRRRRRRRRRRRRRSSSVOOOVK........', '..........K.KWVKKKKKKbbbbbKabbbybbbbbbRcKRRRRRRRRrRRRRRRRRRYRRRRRRRRRVOOwOOVK.......', '........KKKKKKWVKKKKKKKKKKaabbbbbbbbbbbbKYYYYYYRrrRRRRRRRRRRYRRRRRRRRVOwwwOVK.......', '.......KKIRRRKYyKRRRRRRRKaabbbbbbbbbbbbbccKRRRrrrrSSSZSSSSSSSSSSSSSSSVOOwOOVK.......', '......KLKiRYYYYYYYYYYYYYKYYYYYYYYYbbbbbbcccKrrrrqqSSSSSSSSSSSSSSSSSRRRVOOOVK........', '......KlLrrrrrKWVKrrrrrrrKKKKKKKKKKabbbbbccKKKKKKKSSSSSSSSSZSSSYRRRRRSSVVVSK........', '.......KKqqqqqKWVKqqqqqqqqqqqqqqK.KabbbccccKVVVVvvSSSSSSSSSSZSRRYRRRSSRRSRK.........', '.........KKKKKKKWVKKKKKKKKKKKKKK...KabcccccKWWWWvvsssssssssrrrrrrrrsssrrsrK.........', '...........KKTTTKWVKTKK........KKKKKaccKKKKVVVVVvvssssssrrrrrrrrrsssTTKssK..........', '..........KTTTTtTTTTtTTK......KvvvvKNnnNKWWWWWWWvvsssrrrrrrrrrrrstTTTTtsK...........', '.........KTTTTYYKWVKTTTTK....KvVVVVKNnnnNKKVVVVVvvsrrrrrrrrrrTTWVYYYYtTTTK..........', '........KTTTYYYYdKWVKYTtTK...KvVWWVKKmmmmmKWWWWWvvrKKKKKKKtTTYYWVddddYYTTtK.........', '........KTTYYYYYdKYyKYYTTK...KvVVVVvKKvVvvVvvVvvvWK......KTTYYYYWVddddYYtTK.........', '.......KTTTYdYYYddddddYTTTK..KKvvvvK..KvvVvvVvvVVWK.....KTTTYdYVWVWVWddYTTTK........', '.......KTTYdddYYddKWVKdYTtKKKvvvvKK...KvVvvVvvVWVvK.....KTTYddVWWVdWVWddYTTK........', '.......KTtYddddYvvdKWVKvvvvvvVVVVK....KVvvVvvVVWWvK.....KTTYddWVYWVdWVdYYTtK........', '.......KtTYddddvvvvKWVKVVVVVVKKKK......KKKKKKVWVWK......KTtYddVdvWVvYWYYYtTK........', '.......KTTyddddvvvVVKWVKTTKKK...............KVWWK.......KtTyddWdvvvvyVyyyTTK........', '.......KTTyddddyvvddddyyTTK.......KKKKKKKKKKVWVWK.......KTTyddVWyvvdVWdyyTTK........', '.......KTTydddyyddddKWVKTtKKKKKKKKWWWWWWWWWWWWWWK.......KTTyddWVWddVWVddyTTK........', '.......KTtTydyyydddddKWVKWWWWWWWWWWWWWWVVVVVVVVK........KTTtydyWVWVWVddyTTtK........', '........KTTyyyyydddddyVVVVVVVVVVVVVVVVVKKKKKKKK..........KtTyyyyydddddyyTtK.........', '........KTTTyyyyddddyytTTKKKKKKKKKKKKKK..................KTTTyyyyddddyyTtTK.........', '.........KTtTTyyyyyyTtTTK.................................KTTtTyyyyyyTTtTK..........', '..........KTTTTtTTTTtTTK...................................KtTTTTtTTTTtTK...........', '...........KKTtTTTTtTKK.....................................KKTTtTTTTtKK............', '.............KKKKKKKK.........................................KKKKKKKK..............', '....................................................................................', '....................................................................................'] } } };

/* ------------------------------------------------------------------ small helpers */
const pzz = () => position + PZ;
const kP = () => Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX);
const can = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const calm = () => reduce || !!(window.ASSIST && ASSIST.noFlash);
const forced = () => /(^|[?&])force=([^&]*,)?(boss|all)(,|&|$)/.test(location.search);   // (exact ids: 'teiden_boss' is not 'boss')
// the street's light at z (env/akiba.js's blackout): true where its lights are out. The combined event's dark drawing follows it.
const darkAt = z => { const A = ENV.akiba, P = A && A._spa; return !!(P && P.on && !P.rel && A._onAt && !A._onAt(z / SEG)); };
const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
function nearScreen(z, x, cl){ const g = z - pzz(), f = PZ / Math.max(PZ * (cl || .35), PZ + g); return { x:W / 2 + (x - playerX) * W * f, y:H / 2 + (H / 2 - 8) * f, k:kP() * f, f }; }
function projOn(s, z, x){ const pct = (z % SEG) / SEG, w = lerp(s.p1.screen.w, s.p2.screen.w, pct); return { x:lerp(s.p1.screen.x, s.p2.screen.x, pct) + x * w, y:lerp(s.p1.screen.y, s.p2.screen.y, pct), w }; }
const barrier = z => { const s = segAt(z); const Ek = s ? ENV[LANDS[s.land].key] || {} : {}; return (Ek.barrier || 1.1) - .07; };

/* ------------------------------------------------------------------ the pose builder: a key grid turned about the contact patch, the rider
   hung off toward the inside (the same lean poses and hang as env/bikes.js: 0, 12, 20, 29 degrees). See rotSprite and buildAtlas below. */
const FR = [{ t:0, hang:0, head:0 }, { t:12, hang:1, head:0 }, { t:20, hang:2, head:1 }, { t:29, hang:3, head:1 }].map(f => ({ t:f.t * Math.PI / 180, hang:f.hang, head:f.head }));
const LEAN_B = [.10, .28, .43];
const poseOf = lean => { const a = Math.abs(lean); let j = 0; while(j < LEAN_B.length && a >= LEAN_B[j]) j++; return j * (lean < 0 ? -1 : 1); };
/* RotSprite (Xenowhirl's method for pixel art): blow the key grid up 8x with three passes of Scale2x (EPX), which rounds diagonals
   without inventing keys, then sample each turned output pixel's centre from the big grid. Much cleaner than voting on fine detail
   (tuck-and-roll, glyphs, the tasuki), which the vote broke into speckle. */
const SCALED = new Map();
function scale2x(G, w, h){ const W2 = w * 2, out = new Array(W2 * h * 2); const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? '.' : G[y * w + x];
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1), o = y * 2 * W2 + x * 2;
    out[o] = C === A && C !== D && A !== B ? A : P; out[o + 1] = A === B && A !== C && B !== D ? B : P;
    out[o + W2] = D === C && D !== B && C !== A ? C : P; out[o + W2 + 1] = B === D && B !== A && D !== C ? D : P; }
  return out; }
function big8(L){ let e = SCALED.get(L); if(e) return e; const w = L.rows[0].length, h = L.rows.length; let G = []; for(const r of L.rows) for(const ch of r) G.push(ch);
  let cw = w, chh = h; for(let i = 0; i < 3; i++){ G = scale2x(G, cw, chh); cw *= 2; chh *= 2; } e = { G, w:cw, h:chh }; SCALED.set(L, e); return e; }
function rotSprite(L, t, hang, head, headY){ const B8 = big8(L), n = L.rows.length, w0 = L.rows[0].length, c = Math.cos(t), s = Math.sin(t);
  let lx = 1e9, hx = -1e9, ly = 1e9, hy = -1e9;
  for(const [x, y] of [[L.x0 - 5, L.y0 - 2], [L.x0 + w0 + 5, L.y0 - 2], [L.x0 - 5, L.y0 + n + 1], [L.x0 + w0 + 5, L.y0 + n + 1]]){ const V = -y, Xr = x * c + V * s, Vr = -x * s + V * c;
    lx = Math.min(lx, Xr); hx = Math.max(hx, Xr); ly = Math.min(ly, -Vr); hy = Math.max(hy, -Vr); }
  lx = Math.floor(lx) - 2; hx = Math.ceil(hx) + 2; ly = Math.floor(ly) - 2; hy = Math.ceil(hy) + 2;
  const w = hx - lx + 1, h = hy - ly + 1, out = new Array(w * h).fill('.');
  for(let yy = 0; yy < h; yy++) for(let xx = 0; xx < w; xx++){ const X = lx + xx + .5, V = -(ly + yy + .5), xs = X * c - V * s, ys = -(X * s + V * c);
    const sh = hang + (ys < headY ? head : 0), gx = Math.floor((xs - sh - L.x0) * 8), gy = Math.floor((ys - L.y0) * 8);
    if(gx < 0 || gy < 0 || gx >= B8.w || gy >= B8.h) continue; out[yy * w + xx] = B8.G[gy * B8.w + gx]; }
  let ax = w, bx = -1, ay = h, by = -1; for(let i = 0; i < w * h; i++) if(out[i] !== '.'){ const x = i % w, y = (i - x) / w; if(x < ax) ax = x; if(x > bx) bx = x; if(y < ay) ay = y; if(y > by) by = y; }
  if(bx < 0) return { x0:0, y0:0, rows:['.'] };
  const rows = []; for(let y = ay; y <= by; y++){ let r = ''; for(let x = ax; x <= bx; x++) r += out[y * w + x]; rows.push(r); }
  return { x0:lx + ax, y0:ly + ay, rows }; }

/* ------------------------------------------------------------------ the atlas: every posed layer of the boss in one canvas, painted through ImageData */
let ATL = null, CELL = {}, warmed = false; const POLE_TOP = []; let ATLD = null, SRC = null;   // ATLD: the dark atlas (buildDark); SRC: the atlas a draw reads (null: ATL)
const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
/* Round 2 (Kellan's review: the turned pipes broke into dashes and speckle). The broad parts (cowl, rider, seat and tail, tyre) are still
   turned and voted, then cleaned: a pixel with no neighbour of its own key takes its neighbours' key. The thin parts (the takeyari and the
   flag pole) are never turned as pixels: their centre lines are turned and drawn fresh in every pose as clean lines, one pixel of chrome
   between outline pixels, with gold nodes every seventh pixel and crimson bamboo-cut tips. The flag's cloth is never turned: it flies
   from wherever the pole's top lands. */
function despeckle(L){ const n = L.rows.length, w = L.rows[0].length, G0 = L.rows.map(r => [...r]), out = G0.map(r => r.slice());
  for(let y = 0; y < n; y++) for(let x = 0; x < w; x++){ const k = G0[y][x]; if(k === '.' || k === 'K') continue; let same = 0; const cnt = {};
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){ if(!dx && !dy) continue; const q = (G0[y + dy] || [])[x + dx]; if(!q || q === '.') continue; if(q === k) same++; else cnt[q] = (cnt[q] || 0) + 1; }
    if(same) continue; let best = null, bv = 0; for(const q in cnt) if(q !== 'K' && cnt[q] > bv){ bv = cnt[q]; best = q; } if(best) out[y][x] = best; }
  return { x0:L.x0, y0:L.y0, rows:out.map(r => r.join('')) }; }
// strokes: [x0, y0, x1, y1, body key, tip?] in sprite px (centre lines); every outline first, then every core, so crossings stay clean
function strokes(list){ let lx = 1e9, hx = -1e9, ly = 1e9, hy = -1e9;
  for(const s of list){ lx = Math.min(lx, s[0], s[2]) ; hx = Math.max(hx, s[0], s[2]); ly = Math.min(ly, s[1], s[3]); hy = Math.max(hy, s[1], s[3]); }
  lx = Math.floor(lx) - 3; hx = Math.ceil(hx) + 3; ly = Math.floor(ly) - 3; hy = Math.ceil(hy) + 3;
  const w = hx - lx + 1, h = hy - ly + 1, out = new Array(w * h).fill('.'), put = (x, y, k) => { const X = x - lx, Y = y - ly; if(X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = k; };
  const pts = s => { const dx = s[2] - s[0], dy = s[3] - s[1], n = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy)))), P = [];
    for(let i = 0; i <= n; i++) P.push([Math.round(s[0] + dx * i / n), Math.round(s[1] + dy * i / n), i, n]); return { P, steep:Math.abs(dy) >= Math.abs(dx) }; };
  for(const s of list){ const { P, steep } = pts(s); for(const [x, y] of P){ if(steep){ put(x - 1, y, 'K'); put(x + 1, y, 'K'); } else { put(x, y - 1, 'K'); put(x, y + 1, 'K'); } }
    const e = P[P.length - 1], d = P.length > 1 ? [Math.sign(e[0] - P[P.length - 2][0]), Math.sign(e[1] - P[P.length - 2][1])] : [0, -1]; put(e[0] + d[0], e[1] + d[1], 'K'); }
  for(const s of list){ const { P } = pts(s); for(const [x, y, i, n] of P) put(x, y, s[5] && i >= n - 1 ? (i === n ? 'R' : 'r') : s[5] !== undefined && i % 7 === 6 ? 'Y' : s[4]);
    if(s[5] === undefined){ const e = P[P.length - 1]; put(e[0], e[1], 'Y'); } }
  const rows = []; for(let y = 0; y < h; y++){ let r = ''; for(let x = 0; x < w; x++) r += out[y * w + x]; rows.push(r); }
  return { x0:lx, y0:ly, rows }; }
const turnPt = (x, y, t) => { const v = -y, c = Math.cos(t), s = Math.sin(t); return [x * c + v * s, -(-x * s + v * c)]; };
function buildAtlas(){ const A = ART.L, list = [], HEADY = -28, GM = ART.geom;
  const add = (key, L) => { list.push({ key, L }); };
  POLE_TOP.length = 0;
  for(let j = 0; j < FR.length; j++) for(const d of j ? [1, -1] : [1]){ const F = FR[j], f = j * d, t = F.t * d, cl = L => j ? despeckle(L) : L;
    for(const nm of ['back', 'front', 'tyre0', 'tyre1', 'tyre2']) add(nm + ':' + f, cl(j ? rotSprite(A[nm], t, 0, 0, -999) : A[nm]));
    for(const nm of ['rider', 'riderLL', 'riderLR', 'ht0', 'ht1', 'ht2']) add(nm + ':' + f, cl(j ? rotSprite(A[nm], t, F.hang * d, F.head * d, HEADY) : A[nm]));
    // the lines, turned as centre lines (pixel centres), drawn clean
    const T = (x, y) => { const [X, Y] = turnPt(x + .5, y + .5, t); return [X - .5, Y - .5]; };
    const pl = GM.pipeL, pr = GM.pipeR, po = GM.pole, a0 = T(pl[0], pl[1]), a1 = T(pl[2], pl[3]), b0 = T(pr[0], pr[1]), b1 = T(pr[2], pr[3]), c0 = T(po[0], po[1]), c1 = T(po[2], po[3]);
    add('pipes:' + f, strokes([[a0[0], a0[1], a1[0], a1[1], 'W', true], [b0[0], b0[1], b1[0], b1[1], 'V', true]]));
    add('pole:' + f, strokes([[c0[0], c0[1], c1[0], c1[1], 'V']]));
    POLE_TOP[f + 3] = [Math.round(c1[0]), Math.round(c1[1])]; }
  for(let p = 0; p < 3; p++) add('cloth' + p, A['cloth' + p]); for(let k = 1; k <= 3; k++) add('clothD' + k, A['clothD' + k]);
  for(let p = 0; p < 3; p++) add('gflag' + p, A['gflag' + p]); if(A.side) add('side', A.side);
  const AW = 512; let x = 0, y = 0, sh = 0;
  for(const c of list){ const w = c.L.rows[0].length, h = c.L.rows.length; if(x + w > AW){ x = 0; y += sh + 1; sh = 0; } c.sx = x; c.sy = y; c.w = w; c.h = h; x += w + 1; sh = Math.max(sh, h); }
  // his riders' composites (mech/gang.js looks in the gang's paint, built as canvases) ride in the same atlas, so a rider's first draw
  // never pays for a new texture mid-ride (it cost ~11 ms a frame in headless Chrome when each was its own canvas)
  const RY = y + sh + 1, RL = []; for(const li of [1, 2]) for(let ph = 0; ph < 3; ph++) for(let h = -1; h <= 1; h++) RL.push([li, ph, h]);
  const perRow = Math.floor(AW / (RCW + 1)), RH = Math.ceil(RL.length / perRow) * (RCH + 1);
  const cv = can(AW, RY + RH), g = cv.getContext('2d'), im = g.createImageData(AW, cv.height), D = im.data, PC = {};
  for(const k in ART.pal) PC[k] = hexRGB(ART.pal[k]);
  for(const c of list){ for(let r = 0; r < c.h; r++){ const row = c.L.rows[r]; for(let q = 0; q < c.w; q++){ const ch = row[q], col = PC[ch]; if(!col) continue; const o = ((c.sy + r) * AW + c.sx + q) * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255; } }
    CELL[c.key] = { sx:c.sx, sy:c.sy, w:c.w, h:c.h, ox:c.L.x0, oy:c.L.y0 }; }
  g.putImageData(im, 0, 0);
  RL.forEach(([li, ph, h], i) => { const c = rcomp(li, ph, h); if(!c) return; const sx = (i % perRow) * (RCW + 1), sy = RY + Math.floor(i / perRow) * (RCH + 1); g.drawImage(c, sx, sy); CELL['r' + li + ph + h] = { sx, sy, w:RCW, h:RCH, ox:-RCW / 2, oy:-RGY }; });
  ATL = cv; }
const cell = (g, key, x, y, k) => { const c = CELL[key]; if(c) g.drawImage(SRC || ATL, c.sx, c.sy, c.w, c.h, Math.round(x + c.ox * k), Math.round(y + c.oy * k), c.w * k, c.h * k); };

/* the dark atlas (the combined event: the duel in the blackout). The same cells graded to the moonlit street (about 45% of their light,
   cooled), with what glows kept whole: the gold onibi crest and the kanji on his coat, the tail light, the amber indicators; his face at 70%
   so the glance still reads. His riders get the same grade with only their tail lights kept. ATLS is every cell as a flat teal silhouette:
   drawBoss lays it a sprite pixel to either side of his whole composite before the dark layers, a rim of the light from the two onibi
   flames beside him, so his silhouette reads on black (round 2: a rim per cell outlined every layer inside him in cyan). Built once at
   warm-up (one read-back of the atlas); drawing from it costs what drawing from the lit one does. */
let ATLS = null;
function buildDark(){ if(!ATL) return; const w = ATL.width, h = ATL.height, c = can(w, h), g = c.getContext('2d', { willReadFrequently:true }); g.drawImage(ATL, 0, 0);
  const im = g.getImageData(0, 0, w, h), D = im.data, key = s => hexRGB(s).join(','), KEEP = new Set(['#ffd04a', '#fff2b0', '#b8862a', '#ff2a3a', '#ffd8cc', '#ffb030', '#a85e10'].map(key)),
    KEEPR = new Set(['#ff2a3a', '#ffd8cc'].map(key)), SKIN = new Set(['#e8a882', '#a8643e', '#9aa8e0', '#fffaf0'].map(key));
  let ry = h; for(const k in CELL) if(/^r\d/.test(k)) ry = Math.min(ry, CELL[k].sy);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const o = (y * w + x) * 4; if(!D[o + 3]) continue; const id = D[o] + ',' + D[o + 1] + ',' + D[o + 2];
    if(y < ry ? KEEP.has(id) : KEEPR.has(id)) continue; const m = y < ry && SKIN.has(id) ? .72 : 1;
    D[o] = Math.round(D[o] * .42 * m + 8); D[o + 1] = Math.round(D[o + 1] * .46 * m + 10); D[o + 2] = Math.round(D[o + 2] * .56 * m + 24); }
  g.putImageData(im, 0, 0); ATLD = c;
  const s = can(w, h), sg = s.getContext('2d'); sg.drawImage(ATL, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#3cc4d6'; sg.fillRect(0, 0, w, h); ATLS = s;
  try{ const t = can(2, 2).getContext('2d'); t.drawImage(c, 0, 0, 1, 1); t.drawImage(s, 0, 0, 1, 1); }catch(e){} }
// the onibi: two will-o'-the-wisp flames riding beside him in the dark (three flicker frames, teal and white), built at warm-up
const FLM = [];
function buildFlames(){ if(FLM.length) return; const P = { b:'#1e6aa8', c:'#4fd8f0', W:'#e8ffff' };
  for(const rows of [['...b.', '..bc.', '.bcc.', '.cWcb', 'bcWWc', 'cWWWc', 'cWWWc', '.cWc.', '..c..'], ['.b...', '.cb..', '.ccb.', 'bcWc.', 'cWWcb', 'cWWWc', 'cWWWc', '.cWc.', '..c..'],
    ['..b..', '..cb.', '.bcc.', '.cWc.', 'bcWWc', 'cWWWc', 'cWWWc', '.cWc.', '..c..']]){ const c = can(5, rows.length), g = c.getContext('2d'); rows.forEach((r, y) => { for(let x = 0; x < r.length; x++){ const col = P[r[x]]; if(col){ g.fillStyle = col; g.fillRect(x, y, 1, 1); } } }); FLM.push(c); } }
function onibi(g, k, now, a){ if(!FLM.length) return; const cm = calm();
  for(const sd of [-1, 1]){ const fx = sd * 21, fy = -31 + (sd > 0 ? 3 : 0) + (cm ? 0 : Math.round(Math.sin(now / 260 + sd * 1.7) * 2)), f = FLM[cm ? 0 : (Math.floor(now / 120) + (sd > 0 ? 1 : 0)) % 3];
    glow(fx * k, (fy + 5) * k, 10 * k, '#4fd8f0', .32 * a); g.drawImage(f, Math.round((fx - 2.5) * k), Math.round(fy * k), 5 * k, f.height * k); } }

/* ------------------------------------------------------------------ the riders: mech/gang.js's grunt and sukajan looks in the gang's gold and black */
const GP = { K:'#0a0810', 0:'#ffd04a', 1:'#6a6488', 2:'#3e3a58', 3:'#262238', 4:'#141220' };   // gunmetal black with gold glints: the riders are one black-and-gold wall; their leader is the colour
const BASEP = { T:'#18161c', t:'#4a4652', R:'#ff2a3a', r:'#a01828', Q:'#ffd8cc', W:'#e4e0ec', V:'#8a8698', A:'#ff9a2a', P:'#e8e4d8', p:'#3a3a48',
  Y:'#ffd04a', y:'#b8862a', O:'#fffaf0', S:'#e8e0d2', s:'#b4a8bc', q:'#6e6284', N:'#1c1a26', n:'#34304a', m:'#0a0910', H:'#221f30', h:'#5a6aa8',
  G:'#1c2238', g:'#5a6a98', w:'#9ab8d8', L:'#2a2838', l:'#1a1824', E:'#d89a78', e:'#9a5a44' };
const RPAL = Object.assign({}, BASEP, GP);
const RMG = { O:'S', '0':'1', h:'H', n:'N', Y:'y' };
function mk(rows, P, full){ const n = Math.max(...rows.map(r => r.length)), rs = rows.map(r => full ? r.padEnd(n, '.') : r.padStart(n, '.'));
  const c = can(full ? n : n * 2, rs.length), k = c.getContext('2d');
  rs.forEach((r0, y) => { const r = full ? r0 : r0 + [...r0].reverse().map(ch => RMG[ch] || ch).join('');
    for(let x = 0; x < r.length; x++){ let ch = r[x]; if(ch === '.') continue; if(ch === '%') ch = (x + y) % 2 ? '1' : '2'; const col = P[ch]; if(!col) continue; k.fillStyle = col; k.fillRect(x, y, 1, 1); } });
  return c; }
const RCW = 48, RCH = 64, RGY = 60, RSP = {};
function rcomp(li, ph, hang){ const key = li + ':' + ph + ':' + hang; if(RSP[key]) return RSP[key]; const G0 = MECH.gang && MECH.gang._dbg; if(!G0 || !G0.LOOKS) return null;
  const c = can(RCW, RCH), k = c.getContext('2d');
  G0.LOOKS[li].parts.forEach(p => { const s = mk(p.f ? p.f(p.ph ? ph : 0) : p.rows, RPAL, p.full); k.drawImage(s, Math.round(RCW / 2 - s.width / 2 + (p.x || 0) + hang * (p.hang || 0)), RGY + (p.y || 0) - s.height); });
  return RSP[key] = c; }
const flipC = c => c._f || (c._f = (() => { const o = can(c.width, c.height), k = o.getContext('2d'); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return o; })());
// legs (the kick and its wind-up) from mech/gang.js's builders, in the boss's black trousers and brown engineer boots / the riders' gakuran
const smear = u => !!(MECH.gang && MECH.gang.smearOn && MECH.gang._dbg.smearSprite && MECH.gang.smearOn(u));   // the kick's smear frame window (mech/gang.js)
const LEGB = { id:'bossT', a:'#5a5478', b:'#2e2a44', c:'#1c1930', d:'#341e14', dl:'#6a4430', K:'#0c0710' };
const LEGR = { id:'bossR', a:'#5a587e', b:'#3e3c58', c:'#24222e', d:'#121018', dl:'#3e3c58', K:'#140c04' };
let WRK = [];   // wreck kits per look (mech/gang.js wreckKit), built at warm-up
// the boss's "!" bubble: crimson rim, gold mark; two rims for a pulse. And the finisher's "!!"
const BUB = {};
function bubble(ph, two){ const key = ph + ':' + two; if(BUB[key]) return BUB[key];
  const r1 = two ? ['.KKKKKKKKKKK.', 'KAAAAAAAAAAAK', 'KAkOOkkkOOkAK', 'KAkOOkkkOOkAK', 'KAkOOkkkOOkAK', 'KAkOOkkkOOkAK', 'KAkkkkkkkkkAK', 'KAkOOkkkOOkAK', 'KAAAAAAAAAAAK', '.KKKKAAAKKKK.', '.....KAK.....', '......K......']
    : ['.KKKKKKKK.', 'KAAAAAAAAK', 'KAkkOOkkAK', 'KAkkOOkkAK', 'KAkkOOkkAK', 'KAkkOOkkAK', 'KAkkkkkkAK', 'KAkkOOkkAK', 'KAAAAAAAAK', '.KKKAAKKK.', '...KAAK...', '....KK....'];
  return BUB[key] = mk(r1, { K:'#14040a', A:two ? (ph ? '#ffd04a' : '#ffa03a') : (ph ? '#ff3a46' : '#b81428'), k:'#2a0810', O:two ? '#fff4c0' : '#ffd04a' }, true); }

/* ------------------------------------------------------------------ pixel type: the HUD's 3x5 font, and kanji thresholded from DotGothic16 */
const F3 = { A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101',
  I:'111010010010111', K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', R:'110101110101101',
  S:'011100010001110', T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', Z:'111001010100111', J:'001001001101111', Q:'010101101111011',
  '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111', '6':'111100111101111', '7':'111001010010010',
  '8':'111101111101111', '9':'111101111001111', ' ':'000000000000000', '-':'000000111000000', '!':'010010010000010', '+':'000010111010000', '.':'000000000000010' };
const TX = {};
function txt(s, col){ const key = s + col; if(TX[key]) return TX[key]; const c = can(s.length * 4 + 1, 6), g = c.getContext('2d');
  for(const [cc, o] of [['#000', 1], [col, 0]]){ g.fillStyle = cc; [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(n * 4 + i % 3 + o, (i / 3 | 0) + o, 1, 1); }); }
  return TX[key] = c; }
const KJ = {};
function kanji(str, col, sh){ const key = str + col; if(KJ[key]) return KJ[key]; if(typeof pixText !== 'function' || (document.fonts && !document.fonts.check('16px DotGothic16'))) return null;
  const m = pixText(str, 16, false), o = can(m.width + 1, m.height + 1), g = o.getContext('2d');
  if(sh){ g.drawImage(tintMask(m, sh), 1, 1); } g.drawImage(tintMask(m, col), 0, 0); return KJ[key] = o; }
const TEXTS = [['ONIBI NO TETSU', '#ffd04a'], ['SOCHO', '#f4ecdf'], ['YOIYAMI RENGO', '#ff8a96'], ['YOU', '#4ff0ff'], ['ONIBI', '#ffd04a'], ['VS', '#f4ecdf'], ['I BOX-IN', '#ffd04a'], ['II ONE ON ONE', '#ffd04a'], ['III TO THE FLAGS', '#ffd04a'], ['WIN', '#ffd04a'], ['LOST', '#b9adc4'],
  ['KICK', '#ffd04a'], ['Z', '#f4ecdf'], ['X', '#f4ecdf'], ['B', '#f4ecdf'], ['TAP', '#f4ecdf'], ['DODGE OR KICK', '#ff8a96'], ['FINISHER', '#ffd04a'], ['BOXED', '#ff3a46'], ['M', '#ffd04a']];
function warmKanji(){ for(const [s, c, h] of [['宵闇', '#ffd04a', '#5e0a16'], ['夜ハ我等ノモノ', '#ffd04a', '#14040a'], ['一騎打ち', '#ffd04a', '#5e0a16']]) kanji(s, c, h); }

// draw every separate sprite canvas once into a scratch at warm-up, so its first use mid-ride costs nothing extra
let TOUCH = null;
function touch(){ try{ if(!TOUCH) TOUCH = can(4, 4); const g = TOUCH.getContext('2d'), list = [ATL]; for(const k in BUB) list.push(BUB[k]); for(const k in TX) list.push(TX[k]);
  for(const kit of WRK) if(kit){ for(const f of kit.bike) list.push(...f); list.push(...kit.tumble); }
  const D = MECH.gang && MECH.gang._dbg; if(D) for(const P of [LEGB, LEGR]){ const c = D.cockSprite(P); list.push(c, flipC(c)); for(let n = 4; n <= 16; n += 2){ const l = D.legSprite(P, n); list.push(l, flipC(l)); } }
  for(const c of list) if(c && c.width) g.drawImage(c, 0, 0, 1, 1); }catch(e){ console.warn('boss touch', e); } }
function warm(){ if(warmed || !ART || typeof cx === 'undefined' || !cx) return; warmed = true;
  const G0 = MECH.gang;
  for(const li of [1, 2]) for(let ph = 0; ph < 3; ph++) for(let h = -1; h <= 1; h++) rcomp(li, ph, h);
  if(G0 && G0._dbg){ const D = G0._dbg; for(const P of [LEGB, LEGR]){ flipC(D.cockSprite(P)); for(let n = 4; n <= 16; n += 2) flipC(D.legSprite(P, n)); } if(D.smearSprite){ D.smearSprite(LEGB, 14, 1); D.smearSprite(LEGR, 12, 1); } }
  if(G0 && G0.wreckKit){ const P = Object.assign({}, RPAL); WRK = [null, G0.wreckKit(P, 1), G0.wreckKit(P, 2)]; }
  for(let p = 0; p < 2; p++){ bubble(p, false); bubble(p, true); }
  try{ buildAtlas(); }catch(e){ console.warn('boss atlas', e); }
  try{ buildDark(); buildFlames(); for(const f of FLM) can(2, 2).getContext('2d').drawImage(f, 0, 0, 1, 1); }catch(e){ console.warn('boss dark atlas', e); }
  for(const [s, c] of TEXTS) txt(s, c); for(let n = 0; n < 100; n++){ txt(String(n), '#ff8a96'); txt(String(n), '#4ff0ff'); } for(let n = 0; n <= 120; n++) for(const c of ['#ffd04a', '#14040a']) txt('III FLAGS ' + n * 10 + 'M', c); for(const t of ['I BOX-IN', 'II ONE ON ONE', 'BOXED']) txt(t, '#14040a');
  try{ if(document.fonts) document.fonts.load('16px DotGothic16', '宵闇夜ハ我等ノモノ一騎打ち').then(warmKanji, () => {}); else warmKanji(); }catch(e){} }
  touch();

/* ------------------------------------------------------------------ state */
const S = { plan:null, planned:false, st:'idle', t:0, ph:0, phT:0, you:100, them:100, boss:null, R:[], res:null, endT:0, fin:null, cut:null, hold:0,
  log:[], tele:[], hits:{ you:0, them:0, crash:0, takedowns:0, counters:0, dodged:0 }, kick:null, lastBoosts:0, lastClose:0, lastCrashes:0, prompt:false, boxT:0, boxCall:false, suppress:0, tb:null };
let uid = 0, clock = 0, FX = [], DEB = [];
const RES = { won:0, lost:0 };
const pSeg = () => Math.floor(pzz() / SEG);

function reset(){ warm(); if(!S.plan || S.plan.segs !== segs){ S.plan = null; S.planned = false; } endAll();   // (the core places the new ride's first road before it calls reset: keep a booking made on these segs)
  S.st = 'idle'; S.tb = null; S.log.length = 0; S.tele.length = 0; FX.length = 0; DEB.length = 0;
  for(const k in S.hits) S.hits[k] = 0; RES.won = 0; RES.lost = 0; }

function endAll(){ S.boss = null; S.R.length = 0; S.res = null; S.fin = null; S.kick = null; if(S.cut){ S.cut.end(); S.cut = null; } }

/* ------------------------------------------------------------------ placement: book it at the start of a road visit (third road on) */
function place(i, s){ if(S.planned && S.plan && S.plan.segs !== segs) S.planned = false; if(S.planned || S.ran === segs || typeof landStart !== 'number' || i !== landStart) return;
  const z = typeof zoneOfSeg === 'function' ? zoneOfSeg(i) : 0, Tb = DIR && DIR.target ? DIR.target(ID, i) : null, frc = forced() || Tb != null; if(z < (frc ? 0 : ZONE_MIN)) return;   /* Tb: demo mode's authored start */
  let B = i + (z === 0 ? 420 : 90); if(Tb != null) B = Math.max(B, Tb); const span = 2300; if(window.forkClear) B += forkClear(B, B + span) || 0;
  if(DIR && !DIR.request(ID, { tier:'hero', seg:B, auto:false })) return;
  S.planned = true; S.plan = { B, z, t0:-1, segs }; }

/* the combined event's booking (env/akiba.js, as the blackout's stretch is laid): he starts at segment B, the moment the dark reaches you.
   hook(why) is told once how it ended: 'win' / 'lose' (the duel's result), 'skip' (he could not start in time), 'abort' (the ride ended). */
function canCombine(){ return S.st === 'idle' && S.ran !== segs && !(S.planned && S.plan && S.plan.segs === segs && !S.plan.tb); }
function combine(o){ if(!o || !canCombine()) return false; warm(); S.planned = true; S.plan = { B:o.B | 0, z:o.z | 0, t0:-1, segs, tb:true, hook:o.hook || null }; return true; }
function tbHook(why){ const T = S.tb || (S.plan && S.plan.tb ? S.plan : null); if(!T || T.told) return; T.told = why; S.log.push({ ev:'tb', why, t:typeof playT === 'number' ? +playT.toFixed(1) : 0 });
  if(T.hook) try{ T.hook(why); }catch(e){ console.warn('boss tb hook', e); } }
// the combined event's call sounds in the hush: its notes go to the director's moment bus, past the music duck (the synth reads M.out per note)
function loud(f){ const B2 = S.tb && DIR && DIR.bus ? DIR.bus() : null; if(!B2 || typeof M === 'undefined' || !M.out || B2 === M.out){ f(); return; } const o = M.out; M.out = B2; try{ f(); } finally { M.out = o; } }

/* ------------------------------------------------------------------ sounds (the core's synth) */
const HORN = [[0, 76, .16], [.18, 79, .16], [.36, 83, .16], [.56, 79, .12], [.70, 76, .12], [.84, 72, .42]];   // an original call: up, back, and a long low note
function horn(v, phrase, rate){ if(!ac()) return; const t0 = M.ac.currentTime, r = rate || 1, mf = m => 440 * Math.pow(2, (m - 69) / 12);
  for(const [at, m, d] of phrase || HORN){ M.tone(mf(m), d / r, { type:'square', v:.028 * v, at:t0 + at / r }); M.tone(mf(m - 4), d / r, { type:'sawtooth', v:.016 * v, at:t0 + at / r }); } }
function callRev(v){ if(!ac()) return; const t0 = M.ac.currentTime; [0, .14, .28, .52, .66, .80, 1.0].forEach((a, i) => { M.noise(.12, 160 + (i % 3) * 60, .06 * v, t0 + a); M.tone(70 + (i % 3) * 12, .12, { type:'sawtooth', v:.02 * v, fuzz:true, at:t0 + a }); }); }
function blip(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(988, .07, { type:'square', v:.02 * v, at:t0 }); M.tone(988, .07, { type:'square', v:.02 * v, at:t0 + .14 }); }
function rise(v, dur){ if(!ac()) return; const t0 = M.ac.currentTime; for(let i = 0; i < 6; i++) M.tone(90 + i * 22, dur / 6 + .03, { type:'sawtooth', v:.018 * v, fuzz:true, at:t0 + i * dur / 6 }); }
function thump(v){ if(!ac()) return; if(window.SFX && SFX.ready && SFX.ready()) SFX.play('kickHit', { heavy:true }); else { M.tone(78, .25, { type:'square', v:.07 * v }); M.noise(.2, 380, .12 * v); } }

/* ------------------------------------------------------------------ the start */
function canStart(){ if(state !== 'play' || copT > 0) return false; const G0 = MECH.gang, E = G0 && G0._dbg ? G0._dbg.E() : null; if(E && !E.over) return false;
  const J = MECH.sp_jump; if(J && J.flying && J.flying()) return false; const ps = pSeg(); if(segs[ps] && segs[ps].spjP) return false;
  if(window.inForkWindow && inForkWindow(ps, ps + 2200)) return false; return true; }
function start(P){ const pz = pzz(); S.tb = P && P.tb ? P : null; S.st = 'arrive'; S.t = 0; S.ph = 0; S.phT = 0; S.you = 100; S.them = 100; S.res = null; S.endT = 0; S.fin = null; S.boxT = 0; S.boxCall = false;
  S.lastBoosts = boosts; S.lastClose = closeCalls; S.lastCrashes = crashes; S.R.length = 0; FX.length = 0; S.panOK = null; S.pan0 = null; S.cardSeen = false; S.ran = segs;
  try{ S.prompt = (+localStorage.getItem('sundown.boss.seen') || 0) < 1; localStorage.setItem('sundown.boss.seen', String((+localStorage.getItem('sundown.boss.seen') || 0) + 1)); }catch(e){ S.prompt = true; }
  // the formation, behind you: the boss in the middle, four riders in a V either side
  const side = playerX > 0 ? -1 : 1;
  S.boss = { z:pz - (S.tb ? 3800 : 2600), x:playerX + side * .42, speed:MAXS * 1.2, vx:0, kvx:0, lean:0, tx:0, look:0, lookT:0, att:null, cd:2.2, stun:0, boostT:0, nBoost:0, flagPh:0, dip:0, side };
  const SL = [[-.62, -500, 1], [.62, -500, 2], [-.84, -950, 2], [.84, -950, 1]];
  SL.forEach(([dx, dz, li], i) => S.R.push({ id:uid++, li, role:i === 0 ? 'L' : i === 1 ? 'R' : i === 2 ? 'front' : 'spare', z:S.boss.z + dz, x:clamp(dx * .9, -.9, .9), slot:dx, speed:MAXS * 1.2, vx:0, kvx:0, lean:0,
    st:'ride', windT:0, windSide:0, kickT:0, kickSide:0, kickCD:1.5 + i * .4, stunT:0, brakeT:0, brk:0, brkCD:3 + i, flagPh:i * .7 }));
  loud(() => horn(.6)); setTimeout(() => loud(() => callRev(.8)), 700); setTimeout(() => { if(S.st === 'arrive') loud(() => horn(1)); }, 1700);
  if(S.tb && S.tb.z === 0 && TBX.has(0) && typeof sunLeft === 'number') sunLeft = Math.min(SUN_MAX + 60, sunLeft + 50);   // (the named test's first road has no gate before its long stretch to pay for it)
  if(DIR && DIR.cine) S.cut = DIR.cine({ letterbox:{ top:.1, bottom:.05 }, duck:S.tb ? .3 : .55, dur:0, card:S.tb ? CARD_TB : CARD, guard:{ ahead:60, behind:0 } });
  else floatText('宵闇連合', W / 2, H * .3, 34, '#ffd04a');
  if(DIR && DIR.done) DIR.done(ID);
  S.log.push({ ev:'start', seg:pSeg(), t:+playT.toFixed(1), tb:!!S.tb }); }

// Round 2 (Kellan: the arrival stacked card, panel, a big BOX-IN label and the bars for ~7 s): a phase is announced on the duel plate
// itself, a small stamped label under the bars, in the sky, never over the riders. One message at a time: card, then panel, then plate.
function phase(n){ S.ph = n; S.phT = 0; const co = () => { S.stampT = 0; };
  if(n === 1){ co(); if(S.cut){ S.cut.end(); S.cut = null; } }
  else if(n === 2){ co(); horn(1, [[0, 72, .2], [.24, 72, .2], [.5, 79, .5]]); for(const r of S.R) if(r.st === 'ride'){ r.st = 'leave'; r.win = false; } const b = S.boss; b.att = null; b.cd = 2.4; }
  else if(n === 3){ co(); const ps = pSeg(); S.fin = { seg:ps + 560, t:0 }; S.tow = 0; S.tows = 0; const b = S.boss; b.att = null; b.boostT = 0; b.nBoost = 0; b.cd = 3.5; horn(1, [[0, 76, .14], [.16, 76, .14], [.32, 83, .5]]); }
  S.log.push({ ev:'phase', n, t:+playT.toFixed(1), you:Math.round(S.you), them:Math.round(S.them) }); }

function finish(won, how){ if(S.res) return; S.res = won ? 'win' : 'lose'; S.how = how; S.endT = 0; const b = S.boss; if(b){ b.att = null; b.fin = won ? 'salute' : 'proud'; b.finT = 0; }
  for(const r of S.R) if(r.st === 'ride'){ r.st = 'leave'; r.win = !won; }
  const A = MECH.arrival, co = (t, k, c) => { if(A && A.callout) A.callout(t, { kanji:k, col:c, size:'m', prio:2, hold:.6 }); else floatText(k + ' ' + t, W / 2, H * .32, 34, c); };
  if(won){ RES.won++; sunLeft = Math.min(SUN_MAX, sunLeft + 6); if(boostT <= 0) boostTier = 1; boostT = Math.max(boostT, 1.2); flow++; bestFlow = Math.max(bestFlow, flow); hud();
    co('THE LEGEND SALUTES YOU', '勝', '#ffd04a'); setTimeout(() => { if(state === 'play') floatText('+6s', W / 2, H * .4, 28, '#f4ecdf'); }, 500);
    try{ if(MECH.style && MECH.style.act) MECH.style.act('takedown', 1500); }catch(e){} setTimeout(() => horn(1, [[0, 72, .2], [.22, 76, .2], [.44, 79, .2], [.7, 84, .7]]), 900); }
  else { RES.lost++; co(how === 'line' ? 'ONIBI TAKES THE LINE' : 'ONIBI RIDES ON', '負', '#b9adc4'); setTimeout(() => horn(1), 600); }
  S.log.push({ ev:'end', won, how, t:+playT.toFixed(1), you:Math.round(S.you), them:Math.round(S.them) }); tbHook(won ? 'win' : 'lose'); }

/* ------------------------------------------------------------------ spirit */
function drainYou(v){ if(S.res) return; S.you = Math.max(0, S.you - v); }
function drainThem(v){ if(S.res) return; S.them = Math.max(0, S.them - v); }

/* ------------------------------------------------------------------ the player's kick (from mech/gang.js): a boss rider or the boss in reach */
function kickExt(side){ if(S.st === 'idle' || S.st === 'done' || AIR.h >= 6) return null; const pz = pzz(); let best = null, bd = 1e9;
  const test = (e, isBoss) => { if(!e || (!isBoss && e.st !== 'ride' && e.st !== 'leave')) return; const gap = e.z - pz, dx = e.x - playerX; if(Math.abs(gap) > 380 || dx * side < .07 || Math.abs(dx) > .3) return;
    const d = Math.abs(dx) + Math.abs(gap) / 2000; if(d < bd){ bd = d; best = { e, isBoss }; } };
  for(const r of S.R) test(r, false); if(S.boss && !S.res) test(S.boss, true);
  if(!best) return null; const e = best.e;
  if(best.isBoss){ const b = e, counter = !!(b.att && b.att.ph === 'tell');
    // the punish window is the tell: a counter always lands; between attacks he blocks for a beat after any hit (no kick-spam win)
    if(!counter && b.guard > 0){ S.hits.blocked = (S.hits.blocked || 0) + 1; if(ac()){ M.noise(.08, 2600, .05); M.tone(620, .06, { type:'square', v:.02 }); } const p = nearScreen(b.z, b.x); FX.push({ t:.1, x:(W / 2 + p.x) / 2, y:p.y - 14 * p.k, kind:'star' }); return e; }
    b.kvx += side * (counter ? 1.6 : 1.1); b.stun = counter ? 1.0 : .45; b.guard = 1.4; S.hits.them++;
    if(counter){ S.hits.counters++; b.att = null; b.cd = 1.8; drainThem(16); floatText('Counter!', W / 2 + side * W * .18, H * .58, 26, '#ffd04a'); } else drainThem(6);
    spark3(e, side); thump(.8); }
  else { const r = e, counter = r.windT > 0; r.kvx += side * (counter ? 3 : 2.5); r.stunT = .8; r.speed *= .94; r.windT = 0; r.brakeT = 0; r.brk = 0; r.kickCD = Math.max(r.kickCD, 1.6); r.hitT = clock;
    if(counter){ S.hits.counters++; floatText('Counter!', W / 2 + side * W * .18, H * .6, 24, '#ffd04a'); } spark3(e, side); thump(.6); }
  return e; }
function spark3(e, side){ if(reduce) return; const p = nearScreen(e.z, e.x); for(let i = 0; i < 7; i++) spark((W / 2 + p.x) / 2, p.y - 13 * p.k, side * rr(80, 260), rr(-220, -40), .35, i % 2 ? '#ffd04a' : '#f4ecdf');
  FX.push({ t:0, x:(W / 2 + p.x) / 2, y:p.y - 14 * p.k, kind:'star' }); }
function playerHit(from, side, push, cost, what){ S.hits.you++; drainYou(cost); playerX += side * push; speed = Math.max(MAXS * .55, speed * .88); wob = side * .32; wobT = .45; shake = reduce ? 0 : Math.max(shake, 6); thump(1);
  floatText(what, W / 2 + side * W * .06, H * .62, 22, '#ffc0c0'); }
let wob = 0, wobT = 0;

// the finisher lands: the crash itself is the core's (shake, sound, the blink); this is his half of it, a white-hot burst where the bikes met,
// a spray of sparks and fairing chips toward the barrier, and the impact star (none of the flashing under reduced motion)
function finBurst(side){ const x = W / 2 - side * W * .04, y = H - 34 * kP() / 3; FX.push({ t:0, x, y, kind:'big', k:kP() });
  if(!reduce){ for(let i = 0; i < 46; i++) spark(x + rr(-10, 10), y + rr(-8, 8), side * rr(60, 700) + rr(-160, 160), rr(-560, 60), rr(.3, .9), ['#fff4c0', '#ffd04a', '#ff8a3a', '#f4ecdf'][i % 4]);
    for(let i = 0; i < 16; i++) DEB.push({ x, y, vx:side * rr(80, 520) + rr(-120, 120), vy:rr(-520, -120), life:rr(.7, 1.2), w:(1 + i % 2) * kP() * .8, h:(2 - i % 2) * kP() * .8, c:['#ff3a46', '#fffaf0', '#4ff0ff'][i % 3], floor:H - 10 + rr(-6, 6) }); } }

/* ------------------------------------------------------------------ takedowns of his riders (the wreck slides beside you, then drops back) */
function takedown(r, how){ if(r.st === 'down') return; r.st = 'down'; const sd = Math.sign(r.kvx || r.x || 1); r.down = { t:0, how, side:sd, gap0:r.z - pzz() };
  S.hits.takedowns++; drainThem(10); if(boostT <= 0) boostTier = 1; boostT = Math.max(boostT, 1.1); speed = Math.max(speed, MAXS * 1.04); flow++; bestFlow = Math.max(bestFlow, flow); hud();
  const p = nearScreen(r.z, r.x), ex = clamp(p.x, W * .06, W * .94), ey = clamp(p.y - 12 * p.k, H * .3, H * .85);
  if(!reduce){ for(let i = 0; i < 36; i++) spark(ex + rr(-6, 6) * p.k, ey + rr(-4, 4) * p.k, -sd * rr(40, 600) + rr(-120, 120), rr(-500, 80), rr(.3, .75), ['#ffd04a', '#ff8a3a', '#f4ecdf', '#fff4c0'][i % 4]);
    for(let i = 0; i < 22; i++) DEB.push({ x:ex, y:ey, vx:-sd * rr(40, 480) + rr(-140, 140), vy:rr(-520, -100), life:rr(.7, 1.2), w:(1 + i % 2) * p.k * .8, h:(2 - i % 2) * p.k * .8, c:i % 3 ? GP[1 + i % 3] : '#e8ffff', floor:p.y + rr(-3, 3) * p.k }); }
  FX.push({ t:0, x:ex, y:ey, kind:'big', k:p.k }); shake = reduce ? 0 : Math.max(shake, 8);
  if(window.SFX && SFX.ready && SFX.ready()) SFX.play('takedown', { pan:Math.sign(r.x - playerX) || sd }); else { M.noise(.8, 240, .17); M.tone(58, .55, { v:.1 }); }
  const A = MECH.arrival; if(A && A.callout) A.callout('TAKEDOWN', { kanji:'撃墜', col:'#ff6a3a' }); S.log.push({ ev:'takedown', how, t:+playT.toFixed(1) }); }

/* ------------------------------------------------------------------ update */
function update(dt){ clock += dt;
  if(state !== 'play'){ if(S.st !== 'idle' && state !== 'pulled'){ tbHook('abort'); S.st = 'idle'; S.tb = null; endAll(); } else if(state === 'pulled' && S.st !== 'idle'){ for(const r of S.R) r.z += r.speed * dt; if(S.boss) S.boss.z += S.boss.speed * dt; } return; }
  const ps = pSeg(), G0 = MECH.gang;
  // keep the gang's packs away from the legend: from a little before the booked segment until after the duel
  if(S.plan && S.st === 'idle' && ps > S.plan.B - 1300 && ps < S.plan.B + 900 && G0 && G0._dbg) G0._dbg.set({ nextT:playT + 6 });
  if(S.st !== 'idle' && S.st !== 'done' && G0 && G0._dbg) G0._dbg.set({ nextT:playT + 20 });
  if(S.plan && S.st === 'idle'){ if(ps >= S.plan.B){ const P = S.plan; if(canStart()){ S.plan = null; start(P); } else if(ps > P.B + (P.tb ? 300 : 900)){ S.log.push({ ev:'skipped', seg:ps }); tbHook('skip'); S.plan = null; } } }
  if(G0 && !G0.kickExt) G0.kickExt = kickExt;
  for(let i = FX.length - 1; i >= 0; i--) if((FX[i].t += dt) > .4) FX.splice(i, 1);
  for(let i = DEB.length - 1; i >= 0; i--){ const p = DEB[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1500 * dt; if(p.y > p.floor && p.vy > 0){ p.y = p.floor; p.vy = -p.vy * .3; p.vx *= .7; } if((p.life -= dt) <= 0) DEB.splice(i, 1); }
  if(wobT > 0){ wobT -= dt; leanV += wob * Math.sin(wobT * 40) * (wobT / .45) * (reduce ? .3 : 1); }
  if(S.st === 'idle' || !S.boss) return;
  S.t += dt; S.phT += dt; S.stampT = (S.stampT || 0) + dt; const pz = pzz(), b = S.boss;
  // the pack owns the road (Crazy Thunder Road's packs hold the traffic back): cars that reach the far edge of the draw distance while the
  // duel runs are sent on past where it will end, so the road ahead empties as the duel goes on (they vanish in the distance fog, never
  // near you). Cars already close stay: the box and the takedowns use them.
  if(!S.res) for(const c of cars) if(c.z - pz > 290 * SEG && c.z - pz < 380 * SEG) c.z += 2600 * SEG;
  // what the duel listens to: your boosts and close calls (style), your crashes
  if(S.ph >= 1 && !S.res){ if(boosts > S.lastBoosts) drainThem([0, 6, 10, 15][boostTier] || 6); if(closeCalls > S.lastClose) drainThem(3 * (closeCalls - S.lastClose)); if(crashes > S.lastCrashes){ S.hits.crash++; finish(false, 'crash'); } }
  S.lastBoosts = boosts; S.lastClose = closeCalls; S.lastCrashes = crashes;
  // phases
  if(S.st === 'arrive'){ // the card first (it may wait for a road's own card), then the rival panel, then the box
    const A = MECH.arrival, on = !!(A && ((A.momentOn && A.momentOn()) || (A.cardOn && A.cardOn())) || (MECH.cutin && MECH.cutin.on && MECH.cutin.on()));
    // the bars lift for the panel; it waits while a checkpoint gantry is about to pass over the camera (its banner filled the sky round
    // the panel), and is dropped if that takes too long
    const ps0 = pSeg(), gateNear = gates.some(g0 => g0 - ps0 > -6 && g0 - ps0 < 130) || skyBusy(ps0);
    if(on) S.cardSeen = true; if(S.pan0 == null && ((S.cardSeen && !on && S.t > 2.7) || S.t > 6)){ if(S.cut){ S.cut.end(); S.cut = null; } if(!gateNear) S.pan0 = S.t + .3; else if(S.t > 7.5) S.pan0 = -99; }
    const ahead = S.R.every(r => r.z - pz > 600) && b.z - pz > 1200; if(ahead && S.pan0 != null && S.t > S.pan0 + PAN.dur + .2 || S.t > 9.5){ S.st = 'duel'; phase(1); } }
  else if(S.st === 'duel' && !S.res){
    if(S.ph === 1){ const down = S.R.filter(r => r.st === 'down').length; if(down >= 2 || S.phT > 14) phase(2); }
    else if(S.ph === 2){ if(S.them <= 40 || S.phT > 20) phase(3); }
    else if(S.ph === 3){ const fz = S.fin.seg * SEG; S.fin.t += dt; if(S.them <= 0) finish(true, 'style'); else if(pz >= fz && b.z < pz + 40) finish(true, 'line'); else if(b.z >= fz && pz < b.z - 40) finish(false, 'line'); } }
  if(S.res){ S.endT += dt; if(S.endT > 7 || (S.endT > 2.5 && Math.abs(b.z - pz) > 9000 && S.R.every(r => r.st === 'down' || Math.abs(r.z - pz) > 9000))){ S.st = 'done'; endAll(); S.st = 'idle'; S.tb = null; if(G0 && G0._dbg) G0._dbg.set({ nextT:playT + 25 }); return; } }
  // your spirit is spent: his next attack is the finisher; the box squeezes you
  updateBoss(b, dt, pz); for(const r of S.R) updateRider(r, dt, pz);
  if(S.ph === 1 && !S.res){ const fr = S.R.find(r => r.role === 'front' && r.st === 'ride'), sides = S.R.filter(r => (r.role === 'L' || r.role === 'R') && r.st === 'ride' && Math.abs(r.z - pz) < 320 && Math.abs(r.x - playerX) < .3);
    const boxed = fr && fr.z - pz > 100 && fr.z - pz < 800 && Math.abs(fr.x - playerX) < .2 && sides.length >= 1; S.boxT = boxed ? S.boxT + dt : 0;
    if(S.boxT > .6){ drainYou(5 * dt); if(!S.boxCall){ S.boxCall = true; S.stampT = 0; } } }
  { let n = 0; for(let i = 0; i < S.R.length; i++){ const r = S.R[i]; if(!(r.st === 'down' ? r.down.t > 2.6 : (r.st === 'leave' && Math.abs(r.z - pz) > 9000) || r.z - pz < -7000)) S.R[n++] = r; } S.R.length = n; } }   // (in place: no garbage)

function skyBusy(p){ for(let i = Math.max(0, p - 6); i < p + 130 && i < segs.length; i++) if(segs[i].akG) return true; return false; }   // env/akiba.js's gantry screens

// lateral steering shared by the boss and his riders: avoid traffic, keep off the gore, stay inside the barrier
function steerTo(e, tx, dt, vmax){ const blocked = L => cars.some(c => c.z > e.z - 200 && c.z - e.z < 2400 && Math.abs(c.x - L) < .3);
  if(blocked(tx)){ let bl = null, bd = 9; for(const L of [-.66, 0, .66]) if(!blocked(L) && Math.abs(L - tx) < bd){ bd = Math.abs(L - tx); bl = L; } if(bl !== null) tx = bl; }
  const s = segAt(e.z); if(s && s.gore && Math.abs(tx) < .3) tx = Math.sign(tx || e.x || 1) * .4;
  tx = clamp(tx, -.92, .92); const want = e.stun > 0 || e.stunT > 0 ? 0 : clamp((tx - e.x) * 2.6, -vmax, vmax); e.vx = lerp(e.vx, want, 1 - Math.exp(-5 * dt)); e.x += (e.vx + e.kvx) * dt; e.kvx *= Math.exp(-3.5 * dt);
  const curve = s ? s.curve : 0; e.lean = lerp(e.lean, clamp(curve * .075 + (e.vx + e.kvx * .6) * .38 + (e.leanX || 0), -.5, .5), 1 - Math.exp(-6 * dt)); }

function updateBoss(b, dt, pz){ const gap = b.z - pz, dx = b.x - playerX; b.flagPh += dt; if(b.stun > 0) b.stun -= dt; if(b.guard > 0) b.guard -= dt; if(b.lookT > 0){ b.lookT -= dt; if(b.lookT <= 0) b.look = 0; }
  let ts = MAXS, tx = b.x; b.leanX = 0;
  if(S.res){ b.finT += dt;
    // the salute: he holds just ahead of you, in view, for the gesture; then drops back
    if(b.fin === 'salute'){ ts = b.finT < 3.4 ? speed + clamp((pz + 260 - b.z) * 2, -MAXS * .3, MAXS * .3) : Math.max(MAXS * .3, speed - MAXS * .25); const sd = Math.sign(dx) || b.side; tx = playerX + sd * .42; b.dip = b.finT > .4 && b.finT < 3.4 ? Math.min(3, Math.floor((b.finT - .4) / .12) + 1) : b.finT >= 3.4 && b.finT < 3.76 ? 3 - Math.floor((b.finT - 3.4) / .12) : 0; b.look = b.finT > .3 && b.finT < 2.6 ? -sd : 0; }
    else { ts = MAXS * 1.2; tx = b.x + Math.sin(b.finT) * .05; } }
  else if(S.st === 'arrive'){ ts = gap < 1500 ? Math.max(speed * 1.12, MAXS * 1.12) : MAXS * .8; tx = clamp(playerX + b.side * .45, -.85, .85); if(gap > 0) tx = lerp(tx, playerX * .2, clamp(gap / 1500, 0, 1)); }
  else if(S.ph === 1){ ts = MAXS * .98; if(gap > 2200) ts = MAXS * .9; if(gap < 1300) ts = speed + MAXS * .1; tx = playerX * .6; if(Math.floor(S.phT * .5) % 4 === 1){ b.look = Math.sign(playerX - b.x) || 1; b.lookT = .2; } }   // he rides ahead, glancing back at the box
  else if(S.ph === 2){ const want = 160; ts = speed + clamp((pz + want - b.z) * 2.2, -MAXS * .3, MAXS * .35); if(b.z - pz > 1500) ts = Math.min(ts, MAXS * .85);
    if(!b.att){ const room = Math.abs(playerX + b.side * .2) > .86; if(room) b.side = -b.side; tx = playerX + b.side * .21; }
    attacks(b, dt, gap, dx); if(b.att){ tx = b.att.tx; ts = speed + clamp((pz + b.att.g0 - b.z) * 3, -MAXS * .3, MAXS * .35); } }   // committed to you: he holds his place beside you through the tell and the strike
  else if(S.ph === 3){ // OutRun / Hang-On pacing: flat out he is a shade faster than you (you need his wake or a boost), he eases when far ahead; he never lets a boosted rider vanish (a race to the line); he answers once when you pass him; his wake tows you
    const ahead = gap; ts = MAXS * 1.02; if(ahead > 1600) ts = MAXS * .99; if(ahead > 3000) ts = MAXS * .95; if(ahead < -800) ts = Math.max(MAXS * 1.02, speed * .97); if(ahead < -350 && b.nBoost < 1 && b.boostT <= 0 && S.fin.t > 2){ b.boostT = 1.0; b.nBoost++; b.bmul = 1.12; if(ac()) M.noise(.4, 800, .04); }
    const inWake = ahead > 120 && ahead < 1300 && Math.abs(dx) < .17 && !b.att; S.tow = inWake ? S.tow + dt : Math.max(0, S.tow - dt * 2);
    if(S.tow > 1.0 && S.tows < 2 && S.fin.t > 2.5){ S.tow = 0; S.tows++; if(boostT <= 0) boostTier = 1; boostT = Math.max(boostT, 1.2); speed = Math.max(speed, MAXS * 1.05); drainThem(8); const A = MECH.arrival; if(A && A.callout) A.callout('SLIPSTREAM', { kanji:'風', col:'#4ff0ff' }); S.log.push({ ev:'tow', t:+playT.toFixed(1) }); }
    tx = b.att ? b.att.tx : clamp(playerX + (Math.abs(gap) < 600 ? b.side * .3 : 0), -.8, .8); if(Math.abs(gap) < 260 && b.nSw !== 1 && S.fin.t > 3) attacks(b, dt, gap, dx); }
  if(b.boostT > 0){ b.boostT -= dt; ts *= b.bmul || 1.18; } else b.bmul = 0; if(b.stun > 0) ts *= .9;
  b.speed = lerp(b.speed, ts, 1 - Math.exp(-(S.ph === 2 || (S.res && b.finT < 3.4) ? 3 : 1.6) * dt)); b.z += b.speed * dt;
  steerTo(b, tx, dt, b.att && b.att.ph === 'go' ? 2.2 : .7);
  const wx = barrier(b.z); if(Math.abs(b.x) > wx){ b.x = Math.sign(b.x) * wx; if(Math.abs(b.kvx) > .35){ drainThem(6); if(!reduce) for(let i = 0; i < 8; i++){ const p = nearScreen(b.z, b.x); spark(p.x, p.y - 4 * p.k, -Math.sign(b.x) * rr(40, 200), rr(-160, -20), .4, '#ffd04a'); } } b.kvx = 0; }
  // contact: a side shove (Road Rash); never while either is airborne or you are blinking after a crash
  if(!S.res && Math.abs(gap) < 170 && Math.abs(dx) < .13 && AIR.h < 6 && recov <= 0){ const sd = Math.sign(dx) || 1, push = .13 - Math.abs(dx); playerX -= sd * push * .5; b.x += sd * push * .5; speed *= .99; } }

/* the boss's attacks. Each: a tell (the glance, the body, a sound, the road paint) of at least TELL[type] seconds, then the action. */
const TELL = { kick:.9, swerve:1.0, fin:1.2 };
function attacks(b, dt, gap, dx){ const a = b.att;
  if(!a){ if(b.stun > 0 || recov > 0 || AIR.h >= 6) return; b.cd -= dt; if(b.cd > 0 || Math.abs(gap) > 300) return;
    const fin = S.you <= 0, side = Math.sign(playerX - b.x) || 1, d = Math.abs(dx);
    let type = fin ? 'fin' : S.ph === 3 ? 'swerve' : (b.nAtt || 0) % 2 ? 'swerve' : 'kick'; if(type === 'kick' && (d < .1 || d > .27)) type = 'swerve';
    const ex = playerX + side * .3, room = Math.abs(ex) < wallX() - .02 && !cars.some(c => c.z - pzz() > -200 && c.z - pzz() < 2600 && Math.abs(c.x - ex) < .3);   // a sweep always leaves you a way out on the far side
    if(type !== 'kick' && !room){ if(d >= .1 && d <= .27 && !fin) type = 'kick'; else { b.cd = .3; b.side = -side; return; } }
    const x0 = b.x, x1 = type === 'kick' ? b.x : clamp(playerX, -.95, .95);
    b.att = { type, ph:'tell', t:0, side, tell:TELL[type], x0, x1, tx:b.x, hit:false, g0:clamp(gap, 40, 220) }; b.nAtt = (b.nAtt || 0) + 1; if(S.ph === 3) b.nSw = 1;
    b.look = side; b.lookT = TELL[type] + .3; S.tele.push({ type, tell:TELL[type], t:+playT.toFixed(2) });
    if(type === 'kick') blip(1); else rise(type === 'fin' ? 1.3 : 1, TELL[type]);
    if(type === 'fin'){ const A = MECH.arrival; if(A && A.callout) A.callout('FINISHER', { kanji:'覚悟', col:'#ffd04a', prio:3 }); horn(.7, [[0, 64, .5]]); }
    return; }
  a.t += dt;
  if(a.ph === 'tell'){ a.tx = a.x0 - (a.type === 'kick' ? 0 : a.side * .04); if(a.type !== 'kick') b.leanX = -a.side * .3 * Math.min(1, a.t / .3);
    if(a.t >= a.tell){ a.ph = 'go'; a.t = 0; } return; }
  if(a.type === 'kick'){ b.kickT = .25; const pz = pzz();
    if(!a.hit && a.t >= .06){ a.hit = true; const ok = Math.abs(b.z - pz) < 330 && (playerX - b.x) * a.side > .07 && Math.abs(playerX - b.x) < .3 && AIR.h < 6 && recov <= 0;
      if(ok) playerHit(b, a.side, .06, 14, 'Kicked'); else { S.hits.dodged++; M.noise(.12, 1300, .04); } }
    if(a.t >= .25){ b.kickT = 0; b.att = null; b.cd = S.them < 60 ? rr(.9, 1.4) : rr(1.4, 2.2); } return; }
  // swerve / finisher: a fast sweep across the painted zone
  a.tx = a.x1; const pz = pzz(), inZone = Math.abs(b.z - pz) < 260 && Math.abs(playerX - b.x) < .15 && AIR.h < 6 && recov <= 0;
  if(!a.hit && inZone){ a.hit = true; if(a.type === 'fin'){ S.hits.you++; crash({ x:b.x }); finBurst(a.side); } else playerHit(b, a.side, .28, 16, 'Shoved'); }
  if(a.t >= .45){ if(!a.hit){ S.hits.dodged++; if(a.type === 'fin'){ S.you = 30; floatText('Nerve!', W / 2, H * .5, 26, '#4ff0ff'); } b.stun = .8; b.kvx -= a.side * .3; }
    b.att = null; b.cd = S.them < 60 ? rr(1.0, 1.5) : rr(1.5, 2.3); } }

function updateRider(r, dt, pz){ const gap = r.z - pz, dx = r.x - playerX; r.flagPh += dt;
  if(r.st === 'down'){ const D = r.down; D.t += dt; const sd = D.side, wx = barrier(r.z) + .02, t = D.t; const g = t < .25 ? lerp(D.gap0, 170, t / .25) : t < 1.05 ? 170 - (t - .25) * 60 : 170 - 48 - (t - 1.05) * (900 + (t - 1.05) * 2600);
    r.z = pz + g; r.speed = speed; r.x = t < 1.05 ? lerp(r.x, clamp(playerX + sd * .36, -(wx - .06), wx - .06), 1 - Math.exp(-9 * dt)) : lerp(r.x, sd * wx, 1 - Math.exp(-2 * dt)); return; }
  let ts, tx;
  if(r.st === 'leave'){ ts = r.win ? MAXS * 1.2 : Math.max(MAXS * .3, speed - MAXS * .12); tx = r.x + (Math.sign(r.x - playerX) || 1) * .3; if(Math.abs(gap) < 1600 && Math.abs(tx - playerX) < .32) tx = playerX + (Math.sign(r.x - playerX) || 1) * .36; }
  else if(S.st === 'arrive'){ const b = S.boss; ts = r.z < b.z - 200 ? Math.max(speed * 1.14, MAXS * 1.14) : b.speed; tx = clamp(b.x + r.slot * .55, -.9, .9);
    if(Math.abs(gap) < 600 && Math.abs(tx - playerX) < .3) tx = playerX + (Math.sign(r.x - playerX) || 1) * .34; }   // passing you: they keep a lane off you
  else if(r.role === 'spare'){ ts = S.boss.speed; tx = clamp(S.boss.x + .3, -.85, .85); r.z = Math.max(r.z, pz - 500); }   // rides with his leader
  else if(r.role === 'front'){ // ahead in your lane; now and then the brake check: the tail light flares (0.9 s), then he rolls off
    const want = 360; ts = speed + clamp((pz + want - r.z) * 1.4, -MAXS * .3, MAXS * .3); tx = playerX;
    r.brkCD -= dt; if(r.brkCD <= 0 && !r.brakeT && !r.brk && Math.abs(gap - want) < 300 && boostT <= 0){   // (never on a boosting rider: a brake check is a squeeze, not a wall)
      r.brakeT = .9; S.tele.push({ type:'brake', tell:.9, t:+playT.toFixed(2) }); }
    if(r.brakeT > 0){ r.brakeT -= dt; if(r.brakeT <= 0){ r.brakeT = 0; r.brk = 1.1; } }
    if(r.brk > 0){ r.brk -= dt; ts = MAXS * .8; if(r.brk <= 0){ r.brk = 0; r.brkCD = rr(3.5, 5); } } }
  else { const off = r.role === 'L' ? -1 : 1, want = 30; ts = speed + clamp((pz + want - r.z) * 1.4, -MAXS * .3, MAXS * .32); tx = playerX + off * (S.boxT > .6 ? .15 : .19);
    if(Math.abs(tx) > .9) tx = playerX - off * .19; }
  if(r.stunT > 0){ r.stunT -= dt; ts *= .9; }
  r.speed = lerp(r.speed, ts, 1 - Math.exp(-1.5 * dt)); r.z += r.speed * dt;
  steerTo(r, tx, dt, .85);
  const wx = barrier(r.z); if(Math.abs(r.x) > wx){ if(r.stunT > 0 && Math.abs(r.kvx) > .35){ r.x = Math.sign(r.x) * wx; takedown(r, 'wall'); return; } r.x = Math.sign(r.x) * wx; r.kvx = 0; }
  if(r.stunT > 0) for(const c of cars) if(Math.abs(c.z - r.z) < 260 && Math.abs(c.x - r.x) < .25){ takedown(r, 'car'); return; }
  if(r.st === 'leave') return;
  // contact: a side shove; riding into one from behind is a hard bump (speed, spirit), not a crash
  if(Math.abs(gap) < 170 && Math.abs(dx) < .13 && AIR.h < 6 && recov <= 0){
    if(gap > 40 && speed - r.speed > MAXS * .12){ // a rear-end is a hard bump, never a crash: his riders crowd you, they don't kill you (the duel's crashes are traffic and the finisher)
      if(!r.bumpT || clock - r.bumpT > .5){ r.bumpT = clock; speed = Math.min(speed, r.speed * .96); r.speed += MAXS * .08; r.kvx += Math.sign(dx || 1) * .8; r.stunT = .5; drainYou(6); thump(.9); shake = reduce ? 0 : Math.max(shake, 5);
        if(!reduce) for(let i = 0; i < 8; i++) spark(W / 2 + rr(-20, 20), H - 50, rr(-160, 160), rr(-260, -60), .35, i % 2 ? '#ffd04a' : '#f4ecdf'); floatText('Bump', W / 2, H * .55, 22, '#ffc0c0'); } }
    else { const sd = Math.sign(dx) || 1, push = .13 - Math.abs(dx); playerX -= sd * push * .5; r.x += sd * push * .5; r.kvx += sd * .5; r.stunT = Math.max(r.stunT, .3); speed *= .985; } }
  // a side rider's kick: the same tell as mech/gang.js, held a little longer (0.85 s)
  r.kickCD -= dt;
  if(S.ph === 1 && r.role !== 'front' && r.windT <= 0 && r.kickT <= 0 && r.kickCD <= 0 && AIR.h < 6 && recov <= 0 && Math.abs(gap) < 260 && Math.abs(dx) > .1 && Math.abs(dx) < .26){
    r.windT = .85; r.windSide = -Math.sign(dx); S.tele.push({ type:'rkick', tell:.85, t:+playT.toFixed(2) }); if(ac()){ M.tone(880, .07, { type:'square', v:.018 }); M.tone(880, .07, { type:'square', v:.018, at:M.ac.currentTime + .14 }); } }
  if(r.windT > 0){ r.windT -= dt; if(r.windT <= 0){ r.kickT = .25; r.kickSide = r.windSide; r.kickCD = rr(2.6, 4.2);
      if(Math.abs(r.z - pzz()) < 330 && (playerX - r.x) * r.kickSide > .07 && Math.abs(playerX - r.x) < .3 && AIR.h < 6 && recov <= 0) playerHit(r, r.kickSide, .06, 8, 'Kicked'); else S.hits.dodged++; } }
  if(r.kickT > 0) r.kickT -= dt; }

/* ------------------------------------------------------------------ drawing: the boss */
function drawBoss(b, x, y, k, fog, now, am){ if(!ATL) return; const a = (1 - fog * .6) * (am === undefined ? 1 : am); if(a <= .01) return; const dk = !!ATLD && darkAt(b.z); SRC = dk ? ATLD : null;
  const f = poseOf(b.lean), F = FR[Math.abs(f)], res = clamp(b.lean - F.t * Math.sign(f), -.14, .14), ph = Math.floor(now / 45) % 3, fph = Math.floor(now / 110 + b.flagPh) % 3;
  const g = cx; g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = false;
  pxShadow(g, x, y, 13, Math.max(1 / k, 1.8), k, .45);   // the core's stepped pixel shadow
  g.translate(Math.round(x), Math.round(y)); if(Math.abs(res) > .002) g.rotate(res);
  const rider = b.look < 0 ? 'riderLL' : b.look > 0 ? 'riderLR' : 'rider', top = POLE_TOP[f + 3] || [6, -58];
  // back to front: the cowl and screen, the pole (it stands behind him) and its cloth (lowered in steps for the salute), the tyre, the
  // rider and his hachimaki, the seat-back and tail, and the takeyari nearest of all
  const lay = () => { cell(g, 'back:' + f, 0, 0, k); cell(g, 'pole:' + f, 0, 0, k); cell(g, b.dip ? 'clothD' + b.dip : 'cloth' + fph, top[0] * k, top[1] * k, k);
    cell(g, 'tyre' + ph + ':' + f, 0, 0, k); cell(g, rider + ':' + f, 0, 0, k); cell(g, 'ht' + fph + ':' + f, 0, 0, k); cell(g, 'front:' + f, 0, 0, k); cell(g, 'pipes:' + f, 0, 0, k); };
  if(dk && ATLS){ const rk = Math.max(1, Math.round(k)); SRC = ATLS; g.globalAlpha = a * .85; g.translate(-rk, 0); lay(); g.translate(2 * rk, 0); lay(); g.translate(-rk, 0); g.globalAlpha = a; SRC = ATLD; }   // the onibi rim, then him
  lay();
  // tail light and indicator glows ride with the pose
  const tl = (lx, ly) => { const t = F.t * Math.sign(f), v = -ly; return [lx * Math.cos(t) + v * Math.sin(t), -(-lx * Math.sin(t) + v * Math.cos(t))]; };
  { const [X, Y] = tl(0, -7.5); glow(X * k, Y * k, 7 * k, '#ff2a3a', .55 * a); }
  if(dk){ onibi(g, k, now, a); const [X, Y] = tl(0, -24); glow(X * k, Y * k, 6 * k, '#ffd04a', .22 * a); }   // in the dark: the flames beside him, and the crest on his back catching them
  { const on = Math.floor(now / 380) % 2 === 0; if(on && b.att && b.att.ph === 'tell' && b.att.type !== 'kick'){ const [X, Y] = tl(b.att.side * 9, -7); glow(X * k, Y * k, 4 * k, '#ffb030', .7 * a); } }
  if(b.boostT > 0 || (S.res === 'lose' && b.finT < 3)) for(const sx of [-1, 1]){ const [X, Y] = tl(sx < 0 ? -17.5 : 17.5, -33); glow(X * k, Y * k, (5 + (reduce ? 1 : Math.random() * 2)) * k, '#ff8a3a', .7 * a); }
  // the kick: his leg cocks out toward you, then shoots out
  const G0 = MECH.gang && MECH.gang._dbg, at = b.att;
  if(G0 && at && at.type === 'kick'){ const sd = at.side, hip = -12;
    if(at.ph === 'go'){ const u = clamp(at.t / .25, 0, 1), ext = Math.sin(u * Math.PI), len = Math.max(4, Math.round(ext * 14 / 2) * 2), sm = smear(u), s0 = G0.legSprite(LEGB, len), s = sm ? G0.smearSprite(LEGB, 14, sd) : sd < 0 ? s0 : flipC(s0);   // sm: gang.js's smear frame
      g.drawImage(s, sd < 0 ? (-9 - s.width) * k : 9 * k, (hip - (sm ? 6 : 5)) * k, s.width * k, s.height * k); }
    else { const s0 = G0.cockSprite(LEGB), s = sd < 0 ? s0 : flipC(s0); g.drawImage(s, sd < 0 ? (-9 - s.width) * k : 9 * k, (hip - 10) * k, s.width * k, s.height * k); glow(sd * 15 * k, (hip - 6) * k, 8 * k, '#ffb35a', .5); } }
  g.restore();
  // the tell's bubble, upright, never smaller than 2 canvas pixels a sprite pixel
  if(at && at.ph === 'tell'){ const bb = bubble(calm() ? 0 : Math.floor(now / 140) % 2, at.type === 'fin'), bk = Math.max(2 * PX, Math.round(k * .8 / PX) * PX), bob = calm() ? 0 : Math.round(Math.sin(now / 90)) * PX;
    g.globalAlpha = 1; g.drawImage(bb, Math.round(x - bb.width * bk / 2), Math.round(y - 50 * k - bb.height * bk) - bob, bb.width * bk, bb.height * bk); }
  g.globalAlpha = 1; SRC = null; }

function drawRider(r, x, y, k, fog, now, am){ const a = (1 - fog * .6) * (am === undefined ? 1 : am); if(a <= .01) return; const hang = Math.round(clamp(r.lean / .5, -1, 1)), ph = Math.floor(now / 45 + r.id) % 3, c = CELL['r' + r.li + ph + hang]; if(!c || !ATL) return;
  const g = cx; g.globalAlpha = a; pxShadow(g, x, y, 9, Math.max(1 / k, 1.6), k, .45);
  const AS = ATLD && darkAt(r.z) ? ATLD : ATL;
  g.save(); g.translate(x, y); g.rotate(r.lean); g.imageSmoothingEnabled = false; g.drawImage(AS, c.sx, c.sy, c.w, c.h, Math.round(-RCW / 2 * k), Math.round(-RGY * k), RCW * k, RCH * k);
  const fl = CELL['gflag' + (Math.floor(now / 110 + r.flagPh) % 3)]; if(fl && ATL){ const fx0 = r.li === 1 ? 8 : 6; g.drawImage(AS, fl.sx, fl.sy, fl.w, fl.h, Math.round((fx0 + fl.ox) * k), Math.round((-4 + fl.oy) * k), fl.w * k, fl.h * k); }
  const tl = r.li === 1 ? [0, -7.5, 5] : [0, -5, 4], bright = r.brakeT > 0 && Math.floor(now / 110) % 2 === 0 || r.brk > 0; glow(tl[0] * k, tl[1] * k, tl[2] * k * (bright ? 2.2 : 1), '#ff2a3a', (bright ? .95 : .55) * a);
  const G0 = MECH.gang && MECH.gang._dbg;
  if(G0 && (r.windT > 0 || r.kickT > 0)){ const sd = r.kickT > 0 ? r.kickSide : r.windSide, hip = -12;
    if(r.kickT > 0){ const u = clamp(1 - r.kickT / .25, 0, 1), ext = Math.sin(u * Math.PI), len = Math.max(4, Math.round(ext * 12 / 2) * 2), sm = smear(u), s0 = G0.legSprite(LEGR, len), s = sm ? G0.smearSprite(LEGR, 12, sd) : sd < 0 ? s0 : flipC(s0);
      g.drawImage(s, sd < 0 ? (-8 - s.width) * k : 8 * k, (hip - (sm ? 6 : 5)) * k, s.width * k, s.height * k); }
    else { const s0 = G0.cockSprite(LEGR), s = sd < 0 ? s0 : flipC(s0); g.drawImage(s, sd < 0 ? (-8 - s.width) * k : 8 * k, (hip - 10) * k, s.width * k, s.height * k); glow(sd * 14 * k, (hip - 6) * k, 7 * k, '#ffb35a', .45); } }
  g.restore();
  if(r.windT > 0){ const bb = bubble(calm() ? 0 : Math.floor(now / 140) % 2, false), bk = Math.max(2 * PX, Math.round(k * .7 / PX) * PX); g.globalAlpha = 1; g.drawImage(bb, Math.round(x - bb.width * bk / 2), Math.round(y - 40 * k - bb.height * bk), bb.width * bk, bb.height * bk); }
  g.globalAlpha = 1; }
function drawWreck(r, x, y, k){ const D = r.down, kit = WRK[r.li]; if(!kit) return; const t = D.t, sd = D.side, fl = sd < 0 ? 0 : 1; k *= 1.5;
  const cart = !reduce && t < .55, q = cart ? (Math.floor(t / .55 * 7) * (sd > 0 ? 1 : 3)) % 4 : 0, bb = kit.bike[fl][q], lift = cart ? Math.round(Math.sin(t / .55 * Math.PI) * 14) * k : 0;
  cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(snap(x - 9 * k), snap(y - k * .6), snap(18 * k), Math.max(PX, snap(k * 1.2)));
  cx.drawImage(bb, Math.round(x - bb.width * k / 2), Math.round(y - bb.height * k - lift), bb.width * k, bb.height * k);
  if(!cart && t < 1.5 && !reduce) for(let i = 0; i < 3; i++) spark(x - sd * rr(0, 10) * k, y - rr(0, 3) * k, -sd * rr(40, 320), rr(-200, 120), rr(.2, .5), ['#fff4c0', '#ffd04a', '#ff8a3a'][i]);
  if(!cart && t < 1.5) glow(x, y - 2 * k, 10 * k, '#ffb040', .5);
  const tb = kit.tumble[Math.floor(t * (reduce ? 4 : 10)) % 4], bo = t < 1.6 ? Math.abs(Math.sin(t * 7)) * (1.6 - t) * 12 * k : 0, rxp = x + sd * 22 * k; cx.drawImage(tb, Math.round(rxp - tb.width * k / 2), Math.round(y - 30 * k - tb.height * k - bo), tb.width * k, tb.height * k); }

/* the swerve's road paint: chevrons across the band he will sweep, on the road between you and him (drawn under traffic, in depth order) */
function drawPaint(s){ const b = S.boss, a = b && b.att; if(!a || a.ph !== 'tell' || a.type === 'kick') return; const pz = pzz(), z0 = pz + 40, z1 = pz + 1100;   // the road just ahead of both bikes: where he will sweep, read before it happens
  const i0 = Math.floor(z0 / SEG), i1 = Math.floor(z1 / SEG); if(s.index < i0 || s.index > i1 || !s.p1.screen || !s.p2.screen) return; if(s.p1.screen.y <= s.p2.screen.y) return;
  const ex = a.x1 + a.side * .15, lo = Math.min(a.x0, ex), hi = Math.max(a.x0, ex), fin = a.type === 'fin', on = calm() || Math.floor(a.t / .14) % 2 === 0, col = fin ? '#ffd04a' : '#ff3a46', p1 = s.p1.screen, p2 = s.p2.screen;
  cx.globalAlpha = (on ? .42 : .22) * Math.min(1, a.t / .15); cx.fillStyle = col;
  cx.beginPath(); cx.moveTo(p1.x + lo * p1.w, p1.y); cx.lineTo(p1.x + hi * p1.w, p1.y); cx.lineTo(p2.x + hi * p2.w, p2.y); cx.lineTo(p2.x + lo * p2.w, p2.y); cx.closePath(); cx.fill();
  // a chevron per segment pointing the way he will come
  if(s.index % 2 === 0){ cx.globalAlpha = on ? .9 : .5; const mid = (lo + hi) / 2, yy = Math.round((p1.y + p2.y) / 2), w = (p1.w + p2.w) / 2, cw = Math.max(PX, (hi - lo) * w * .18), sd = a.side;
    for(const off of [-.3, 0, .3]){ const cxp = (p1.x + p2.x) / 2 + (mid + off * (hi - lo)) * w, hh = Math.max(PX, Math.min(cw * .6, (p1.y - p2.y) * .45));
      cx.beginPath(); cx.moveTo(cxp - sd * cw * .5, yy - hh); cx.lineTo(cxp + sd * cw * .5, yy); cx.lineTo(cxp - sd * cw * .5, yy + hh); cx.lineTo(cxp - sd * cw * .15, yy); cx.closePath(); cx.fill(); } }
  cx.globalAlpha = 1; }

/* the flag line: two poles at the road's edges, a banner across (宵闇 in gold on black), the gang's flags, flares burning on the road */
function drawLine(s, now){ const F = S.fin; if(!F || s.index !== F.seg || !s.p1.screen) return; const p = s.p1.screen, sc = p.w / ROADW, X = u => p.x + u * p.w, Yh = h => p.y - h * sc, u = PX;
  if(p.w < 4) return; const pole = Math.max(u, Math.round(55 * sc / u) * u), top = 2300, bh = 520;
  const poleAt = ux => { const x = Math.round(X(ux) - pole / 2); cx.fillStyle = '#0c0710'; cx.fillRect(x - u, Math.round(Yh(top)) - u, pole + 2 * u, Math.round(top * sc) + u); cx.fillStyle = '#a8a4bc'; cx.fillRect(x, Math.round(Yh(top)), pole, Math.round(top * sc)); cx.fillStyle = '#ffd04a'; cx.fillRect(x, Math.round(Yh(top)) - 2 * u, pole, 2 * u); };
  poleAt(-1.2); poleAt(1.2);
  // the banner: black field, crimson borders, gold kanji, sagging a little in the middle
  const bx0 = Math.round(X(-1.2)), bx1 = Math.round(X(1.2)), by = Math.round(Yh(top - 60)), bhp = Math.max(2 * u, Math.round(bh * sc / u) * u), sag = Math.round(70 * sc / u) * u, n = 12;
  for(let i = 0; i < n; i++){ const t0 = i / n, x0 = Math.round(bx0 + (bx1 - bx0) * t0), x1 = Math.round(bx0 + (bx1 - bx0) * (i + 1) / n), dy = Math.round(Math.sin(t0 * Math.PI) * sag / u) * u;
    cx.fillStyle = '#0c0710'; cx.fillRect(x0, by + dy - u, x1 - x0, bhp + 2 * u); cx.fillStyle = '#1c1930'; cx.fillRect(x0, by + dy, x1 - x0, bhp); cx.fillStyle = '#c81e2a'; cx.fillRect(x0, by + dy, x1 - x0, Math.max(u, Math.round(bhp * .12 / u) * u)); cx.fillRect(x0, by + dy + bhp - Math.max(u, Math.round(bhp * .12 / u) * u), x1 - x0, Math.max(u, Math.round(bhp * .12 / u) * u)); }
  const kj = kanji('宵闇', '#ffd04a', '#5e0a16'); if(kj){ const kk = Math.max(u, Math.floor(bhp * .7 / kj.height / u) * u); if(kk * kj.width < bx1 - bx0){ cx.imageSmoothingEnabled = false; cx.drawImage(kj, Math.round((bx0 + bx1) / 2 - kj.width * kk / 2), by + sag + Math.round((bhp - kj.height * kk) / 2), kj.width * kk, kj.height * kk); } }
  // flares on the road at both edges: a red core, a stepped glow, a little smoke
  for(const ux of [-1.05, 1.05]){ const fx0 = X(ux), fy = p.y, fr = Math.max(u, Math.round(18 * sc / u) * u); cx.fillStyle = '#fff4c0'; cx.fillRect(Math.round(fx0 - fr / 2), Math.round(fy - fr), fr, fr); glow(fx0, fy - fr, Math.max(4 * u, 260 * sc), '#ff3a2a', calm() ? .6 : .5 + .2 * Math.sin(now / 60 + ux)); }
  // the line itself: a gold paint stripe across the road
  cx.fillStyle = '#ffd04a'; cx.globalAlpha = .8; const lh = Math.max(u, Math.round(40 * sc / u) * u); cx.fillRect(Math.round(X(-1)), Math.round(p.y - lh), Math.round(X(1) - X(-1)), lh); cx.globalAlpha = 1; }

function drawSeg(s, sx0, sy0, uw, fog, now){ if(S.st === 'idle') return; const pz = pzz(), K = kP();
  for(const r of S.R){ if(r.st === 'down'){ if(Math.floor(r.z / SEG) === s.index && r.z - pz >= 0){ const P = projOn(s, r.z, r.x); drawWreck(r, P.x, P.y, P.w * K / W); } continue; }
    if(Math.floor(r.z / SEG) === s.index && r.z - pz >= 0){ const P = projOn(s, r.z, r.x); drawRider(r, P.x, P.y, P.w * K / W, fog, now, EDGE); } }
  const b = S.boss; if(b && Math.floor(b.z / SEG) === s.index && b.z - pz >= 0){ const P = projOn(s, b.z, b.x); drawBoss(b, P.x, P.y, P.w * K / W, fog, now, EDGE); } }
function drawSegBack(s, sx0, sy0, uw, fog, now){ if(S.st === 'idle') return; if(ATLD) drawBeams(s); drawPaint(s); drawLine(s, now); }
/* the headlights in the dark (only where the street's lights are out): a long pale pool on the road ahead of his wheel, widening and
   fading over 1500 units in four steps, and each rider's fainter one. While he comes up behind you it lights the road round you first,
   and your own shadow is thrown ahead in it (Crazy Thunder Road: the pack is sound first, then a wall of light). */
const BEAM_L = 1500;
function drawBeams(s){ const b = S.boss; if(!b || !s.p1.screen || !s.p2.screen || s.p1.screen.y <= s.p2.screen.y || s.index < Math.floor(position / SEG) + 6) return; const z1 = s.index * SEG, z2 = z1 + SEG;   // (not the strips under the camera: there a beam's end read as a bar)
  const bk = b.z < pzz() ? 1.7 : 1;   // his light from behind you is the strongest light in the street
  cx.globalCompositeOperation = 'lighter'; for(const r of S.R) if(r.st !== 'down') beam(s, r, z1, z2, .5, .1, .3); beam(s, b, z1, z2, .6 * bk, .22, .55); beam(s, b, z1, z2, .8 * bk, .1, .32); cx.globalCompositeOperation = 'source-over';
  // your shadow: the boss's light from behind you, cut by your bike, out ahead of you along the road
  const pz = pzz(), bg = pz - b.z; if(bg > 0 && bg < BEAM_L * .85 && darkAt(b.z)){ const sl = 900 * (1 - bg / BEAM_L), wb = .06 + (.3 - .06) * bg / BEAM_L;
    if(Math.abs(playerX - b.x) < wb && z2 > pz && z1 < pz + sl){ const lo = playerX - .055, hi = playerX + .055, p1 = s.p1.screen, p2 = s.p2.screen; cx.globalAlpha = .55 * (1 - Math.max(0, z1 - pz) / sl); cx.fillStyle = '#05040a';
      cx.beginPath(); cx.moveTo(p1.x + lo * p1.w, p1.y); cx.lineTo(p1.x + hi * p1.w, p1.y); cx.lineTo(p2.x + hi * p2.w * .8, p2.y); cx.lineTo(p2.x + lo * p2.w * .8, p2.y); cx.closePath(); cx.fill(); cx.globalAlpha = 1; } } }
function beam(s, e, z1, z2, a0, w0, wd){ const d1 = z1 - e.z, d2 = z2 - e.z; if(d2 < 0 || d1 > BEAM_L || !darkAt(e.z)) return; const p1 = s.p1.screen, p2 = s.p2.screen;
  const t = clamp(((d1 + d2) / 2) / BEAM_L, 0, 1), al = a0 * Math.ceil(Math.min(1, t * 5, (1 - t) * 1.6) * 4) / 4, w1 = w0 + (wd - w0) * clamp(d1 / BEAM_L, 0, 1), w2 = w0 + (wd - w0) * clamp(d2 / BEAM_L, 0, 1); if(al <= 0) return;   // (lit additively: a warm glow on the wet road, rising from just ahead of the wheel and fading in four steps)
  cx.globalAlpha = al; cx.fillStyle = '#3a3222'; cx.beginPath(); cx.moveTo(p1.x + (e.x - w1) * p1.w, p1.y); cx.lineTo(p1.x + (e.x + w1) * p1.w, p1.y); cx.lineTo(p2.x + (e.x + w2) * p2.w, p2.y); cx.lineTo(p2.x + (e.x - w2) * p2.w, p2.y); cx.closePath(); cx.fill(); cx.globalAlpha = 1; }
// riders and the boss between you and the camera (they grow as they pass, like traffic you overtake). Drawn UNDER the bike: a rival
// alongside or just behind never covers yours (audit #12: he sat over it at 6x). And faded out as the near projection passes 3 canvas px a
// sprite px (gone by 4.5), before the art turns to blocks. Every tell (kick wind-up, swerve, finisher) starts within 330 of you, where
// the fade is still 1, so they all read exactly as before.
const nearA = k => { const s = k / PX; return s <= 3 ? 1 : s >= 4.5 ? 0 : (4.5 - s) / 1.5; };
function drawUnder(now){ if(S.st === 'idle') return; const pz = pzz();
  for(const r of S.R){ const g = r.z - pz; if(g >= 0 || g < -PZ * .8 || r.st === 'down') continue; const p = nearScreen(r.z, r.x, .2), a = nearA(p.k); if(a > .01) drawRider(r, p.x, p.y, p.k, 0, now, a); }
  const b = S.boss; if(b && b.z - pz < 0 && b.z - pz > -PZ * .8){ const p = nearScreen(b.z, b.x, .2), a = nearA(p.k); if(a > .01) drawBoss(b, p.x, p.y, p.k, 0, now, a); } }
// over the bike: the wrecks (they tumble out to the side), the hit stars and debris, the panel and the duel plate
function drawScreen(now){ if(S.st === 'idle') return; const pz = pzz();
  for(const r of S.R){ if(r.st === 'down' && r.z - pz < 0){ const p = nearScreen(r.z, r.x); drawWreck(r, p.x, p.y, p.k); } }
  for(const f of FX){ const sz = f.kind === 'big' ? 3 : 1.4, kk = Math.max(PX, Math.round(kP() * sz * (f.t < .1 ? 1 : .7) / PX) * PX); cx.fillStyle = '#fff4c0'; cx.globalAlpha = f.t > .28 ? .5 : 1;
    cx.fillRect(snap(f.x - 3 * kk), snap(f.y - kk / 2), 6 * kk, kk); cx.fillRect(snap(f.x - kk / 2), snap(f.y - 3 * kk), kk, 6 * kk); cx.globalAlpha = 1; }
  for(const p of DEB){ cx.globalAlpha = Math.min(1, p.life * 3); cx.fillStyle = p.c; cx.fillRect(snap(p.x), snap(p.y), Math.max(PX, snap(p.w)), Math.max(PX, snap(p.h))); } cx.globalAlpha = 1;
  drawPanel(now); if(S.st !== 'arrive') drawMeter(now); }

/* the rival panel (Road Rash's rival portraits, TXR's rival intro, an anime title insert): after the card, his machine side-on, the
   livery the rear view hides, on a black slab in the sky with speed streaks, his name and the words on his back. Never over the road. */
const PAN = { dur:2.0 };
function drawPanel(now){ if(S.st !== 'arrive' || !ATL || !CELL.side) return; if(S.pan0 == null) return; const t = S.t - S.pan0, dur = PAN.dur; if(t < 0 || t > dur) return;
  if(!S.panOK){ if(S.panOK === false) return; S.panOK = !MECH.quiet || !MECH.quiet.claim || MECH.quiet.claim(2, dur) ? true : false; if(!S.panOK) return; }
  const P = PX, cw = cv.width, ch = cv.height, c = CELL.side, hz = typeof HZ === 'number' && HZ > 0 ? HZ / P : ch / 2, sc = cw >= 400 && hz - 10 >= c.h * 2 + 8 ? 2 : 1, words = c.w * sc + 18 + 118 <= cw - 6, pw = c.w * sc + (words ? 18 + 118 : 12), ph = c.h * sc + 8; if(pw > cw - 4 || cw < 300) return;   // (a phone: the HUD owns the top of the screen, no panel)
  const y0 = Math.max(4, Math.round(Math.min(ch * .14, hz - ph - 6))), xin = Math.round(cw / 2 - pw / 2);
  // wipe in from the right and out to the left, in steps (reduced motion: a four-step fade)
  const st = calm() ? 0 : t < .25 ? 1 - Math.floor(t / .25 * 5) / 5 : t > dur - .25 ? -Math.floor((t - dur + .25) / .25 * 5) / 5 : 0, x0 = Math.round(xin + st * (cw - xin + 4));
  const al = calm() ? Math.min(1, Math.floor(Math.min(t, dur - t) / .3 * 4) / 4) : 1; if(al <= 0) return;
  cx.save(); if(MECH.quiet && MECH.quiet.clipRoad){ cx.setTransform(1, 0, 0, 1, 0, 0); MECH.quiet.clipRoad(cx); } cx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = al;
  const R_ = (x, y, w, h, col) => { cx.fillStyle = col; cx.fillRect(x * P, y * P, w * P, h * P); };
  R_(x0 + 3, y0 + 3, pw, ph, '#000'); R_(x0, y0, pw, ph, '#0b0912'); R_(x0, y0, pw, 1, '#c8902a'); R_(x0, y0 + ph - 1, pw, 1, '#c8902a'); R_(x0, y0, 1, ph, '#c81e2a'); R_(x0 + pw - 1, y0, 1, ph, '#c81e2a');
  // speed streaks behind the machine (anime pan), stepped, none under reduced motion
  if(!calm()) for(let i = 0; i < 9; i++){ const yy = y0 + 4 + ((i * 37) % (ph - 8)), len = 10 + (i * 13) % 24, xx = x0 + 2 + ((i * 53 - Math.floor(now / 16) * 9) % (c.w * sc + 12) + c.w * sc + 12) % (c.w * sc + 12); R_(xx, yy, Math.min(len, x0 + c.w * sc + 14 - xx), 1, i % 3 ? '#2a2438' : '#4a3a20'); }
  const bob = calm() ? 0 : Math.floor(now / 90) % 2; cx.drawImage(ATL, c.sx, c.sy, c.w, c.h, (x0 + 6) * P, (y0 + 4 - bob) * P, c.w * sc * P, c.h * sc * P);
  // the name, the gang, and the words on his back
  if(!words){ cx.restore(); return; }
  const tx0 = x0 + 12 + c.w * sc, n1 = txt('ONIBI NO TETSU', '#ffd04a'), n2 = txt('SOCHO', '#f4ecdf'), n3 = txt('YOIYAMI RENGO', '#ff8a96');
  cx.drawImage(n1, tx0 * P, (y0 + 8) * P, n1.width * P * 1, n1.height * P); cx.drawImage(n2, tx0 * P, (y0 + 18) * P, n2.width * P, n2.height * P); cx.drawImage(n3, tx0 * P, (y0 + 26) * P, n3.width * P, n3.height * P);
  const kj = kanji('夜ハ我等ノモノ', '#ffd04a', '#14040a'); if(kj && tx0 + kj.width < x0 + pw - 2) cx.drawImage(kj, tx0 * P, (y0 + 36) * P, kj.width * P, kj.height * P);
  cx.restore(); }

/* the duel plate: TXR's two bars in the HUD's pixel style, three phase pips, and what the phase asks of you */
function drawMeter(now){ const P = PX, sx = W / cv.width, narrow = W < 640, show = S.res ? clamp(1.6 - S.endT * .6, 0, 1) : clamp(S.phT * 3, 0, 1); if(show <= 0) return;
  const R_ = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(x * P, y * P, w * P, h * P); }, B_ = (c, x, y) => cx.drawImage(c, x * P, y * P, c.width * P, c.height * P);
  const cells = narrow ? 10 : 16, cw = narrow ? 2 : 3, bw = cells * (cw + 1) - 1, mid = 23, plW = 3 + bw + 2 + mid + 2 + bw + 3, plH = 20;
  const below = Math.ceil(52 / sx), nY = narrow ? below + 37 : Math.ceil(16 / sx), y0 = nY + 10, x0 = Math.round((cv.width - plW) / 2);
  cx.save(); cx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = Math.floor(show * 4) / 4;
  for(let i = 0; i < plH; i++) R_(x0, y0 + i, plW - Math.max(0, 4 - i), 1, 'rgba(7,6,12,.8)');
  const edge = S.res === 'win' ? '#ffd04a' : S.res === 'lose' ? '#4a4260' : '#c8902a';
  R_(x0, y0 + plH - 1, plW, 1, edge); R_(x0, y0 + 4, 1, plH - 4, edge); R_(x0 + plW - 1, y0 + 4, 1, plH - 4, edge); R_(x0, y0, plW - 4, 1, edge); for(let i = 0; i < 4; i++) R_(x0 + plW - 4 + i, y0 + i, 1, 1, edge);
  B_(txt('YOU', '#4ff0ff'), x0 + 3, y0 + 3); const nm = txt('ONIBI', '#ffd04a'); B_(nm, x0 + plW - 3 - nm.width, y0 + 3);
  const by = y0 + 10, low = !calm() && Math.floor(now / 220) % 2;
  const bar = (x, v, col, hi, dir) => { const n = Math.ceil(v / 100 * cells - 1e-6); for(let i = 0; i < cells; i++){ const lit = i < n, cxp = dir < 0 ? x + bw - cw - i * (cw + 1) : x + i * (cw + 1); let c = lit ? col : '#221d30';
      if(lit && n <= 3 && low && !S.res) c = '#ff3b5c'; R_(cxp, by, cw, 5, c); if(lit) R_(cxp, by, cw, 1, hi); } };
  bar(x0 + 3, S.you, '#4ff0ff', '#d8ffff', -1); bar(x0 + 3 + bw + 2 + mid + 2, S.them, '#c8902a', '#fff0b0', 1);
  const vx = x0 + 3 + bw + 2;
  if(S.res){ const t = txt(S.res === 'win' ? 'WIN' : 'LOST', S.res === 'win' ? '#ffd04a' : '#b9adc4'); B_(t, vx + ((mid - t.width) >> 1) + 1, y0 + 3); }
  else { for(let i = 1; i <= 3; i++){ const px = vx + 4 + (i - 1) * 6, on = i === S.ph, done = i < S.ph; R_(px, y0 + 4, 4, 4, on ? '#ffd04a' : done ? '#7a4e14' : '#2a2438'); if(on) R_(px, y0 + 4, 4, 1, '#fff0b0'); }
    const b = S.boss; if(b && S.ph >= 2){ const gm = Math.round((b.z - pzz()) / 100), t = txt(String(Math.min(99, Math.abs(gm))), gm > 0 ? '#ff8a96' : '#4ff0ff');   // who leads, by how much (TXR)
      B_(t, vx + ((mid - t.width) >> 1) + 1, by); const ax = gm > 0 ? vx + mid - 3 : vx + 1; for(let i = 0; i < 3; i++) R_(gm > 0 ? ax + i : ax + 2 - i, by + 1 + i - (i > 1 ? 2 * (i - 1) : 0), 1, 1, gm > 0 ? '#ffd04a' : '#4ff0ff'); } }
  // the line under the plate: what this phase asks
  const lbl = S.res ? null : S.ph === 1 ? 'I BOX-IN' : S.ph === 2 ? 'II ONE ON ONE' : S.ph === 3 ? 'III FLAGS ' + Math.max(0, Math.min(1200, Math.round((S.fin.seg * SEG - pzz()) / 1000) * 10)) + 'M' : null;
  // the phase label, stamped: for its first second it shows on a gold plate (BOXED in red while the box holds you), then settles
  const boxed = S.ph === 1 && S.boxT > .6, stamp = (S.stampT || 0) < 1 && !calm() ? Math.floor((S.stampT || 0) * 6) % 2 === 0 : false, lb2 = boxed ? 'BOXED' : lbl;
  if(lb2){ const hot = stamp || boxed, t = txt(lb2, hot ? '#14040a' : '#ffd04a'); R_(x0 + plW / 2 - t.width / 2 - 3, y0 + plH + 1, t.width + 6, 9, hot ? (boxed ? '#ff3a46' : '#ffd04a') : 'rgba(7,6,12,.72)'); B_(t, Math.round(x0 + plW / 2 - t.width / 2), y0 + plH + 3);
    if(S.prompt && S.ph <= 2 && S.phT < 8){ const pad = navigator.getGamepads && [...navigator.getGamepads()].some(Boolean), [ka, kb] = pad ? ['X', 'B'] : ['Z', 'X'], kk = txt('KICK', '#ffd04a');
      const a = txt(ka, '#f4ecdf'), bb = txt(kb, '#f4ecdf'), tw = a.width + 3 + kk.width + 3 + bb.width, xx = Math.round(x0 + plW / 2 - tw / 2), yy = y0 + plH + 12;
      R_(xx - 3, yy - 2, tw + 6, 9, 'rgba(7,6,12,.72)'); B_(a, xx, yy); B_(kk, xx + a.width + 3, yy); B_(bb, xx + a.width + 3 + kk.width + 3, yy); } }
  cx.restore(); }

/* ------------------------------------------------------------------ the module */
MECH.sp_boss = { warm, reset, place, update, drawSeg, drawSegBack, drawScreen, drawUnderBike:drawUnder, canCombine, combine, TB, get tb(){ return !!S.tb; },
  finish(rec){ if(RES.won || RES.lost) rec.boss = { won:RES.won, lost:RES.lost }; },
  // tests and bots
  _start(){ warm(); if(S.st === 'idle'){ start(); return true; } return false; },
  state(){ return { st:S.st, ph:S.ph, t:+S.t.toFixed(2), phT:+S.phT.toFixed(2), you:Math.round(S.you), them:Math.round(S.them), res:S.res, how:S.how, plan:S.plan, boss:S.boss ? { gap:Math.round(S.boss.z - pzz()), x:+S.boss.x.toFixed(2), att:S.boss.att && S.boss.att.type } : null, riders:S.R.map(r => ({ role:r.role, st:r.st, gap:Math.round(r.z - pzz()), x:+r.x.toFixed(2) })), fin:S.fin }; },
  report(){ return { log:S.log.slice(), tele:S.tele.slice(), hits:Object.assign({}, S.hits), minTell:S.tele.length ? Math.min(...S.tele.map(t => t.tell)) : null }; },
  threat(){ const out = []; const b = S.boss; if(b && b.att && b.att.ph === 'tell') out.push({ who:'boss', type:b.att.type, side:b.att.side, x:b.x, x0:b.att.x0, x1:b.att.x1, gap:b.z - pzz(), left:b.att.tell - b.att.t });
    for(const r of S.R) if(r.windT > 0) out.push({ who:'rider', type:'kick', side:r.windSide, x:r.x, gap:r.z - pzz(), left:r.windT }); else if(r.brakeT > 0) out.push({ who:'rider', type:'brake', x:r.x, gap:r.z - pzz(), left:r.brakeT });
    return out; },
  entities(){ return { boss:S.boss, R:S.R }; },
  _phase(n){ if(S.st === 'idle') start(); S.st = 'duel'; const b = S.boss, pz = pzz(); b.z = pz + 160; b.x = clamp(playerX + b.side * .21, -.85, .85); b.speed = speed; if(n >= 2) for(const r of S.R) if(r.st === 'ride'){ r.st = 'leave'; } else for(const r of S.R) r.z = pz + (r.role === 'front' ? 360 : r.role === 'spare' ? 1800 : 30); phase(n); },
  _attack(type){ const b = S.boss; if(!b) return false; b.att = null; b.cd = 0; b.nAtt = type === 'kick' ? 0 : 1; if(type === 'fin') S.you = 0; return true; },
  _finish(won){ finish(!!won, 'test'); },
  _poses(k){ warm(); k = k || 4; const CW_ = 64, c = can(7 * CW_ * k, 2 * 80 * k), g = c.getContext('2d'); g.fillStyle = '#16183a'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
    // a contact sheet: the 7 lean poses (top), and the same with the look toward you and the flag lowered (bottom)
    for(let row = 0; row < 2; row++) for(let f = -3; f <= 3; f++){ const x = ((f + 3) * CW_ + CW_ / 2) * k, y = (row * 80 + 72) * k, top = POLE_TOP[f + 3];
      cell(g, 'back:' + f, x, y, k); cell(g, 'pole:' + f, x, y, k); cell(g, row ? 'clothD2' : 'cloth0', x + top[0] * k, y + top[1] * k, k);
      for(const nm of ['tyre0', row ? (f < 0 ? 'riderLR' : 'riderLL') : 'rider', 'ht0', 'front', 'pipes']) cell(g, nm + ':' + f, x, y, k); }
    return c.toDataURL('image/png'); },
  _sheet(){ warm(); return ATL ? ATL.toDataURL('image/png') : ''; },
  _draw:{ drawBoss, drawRider, CELL:() => CELL, ATL:() => ATL } };
})();
