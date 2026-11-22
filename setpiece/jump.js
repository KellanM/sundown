/* Sundown set piece module: jump. See setpiece/README.md.
   JUMP HELPER (reusable by other set pieces):
     MECH.sp_jump.launch({ fromSeg, landSeg, peakH = 1600, startH = 0, landH = 0, slowmo = true, onLand })
     Flies the bike from segment fromSeg (default: the bike's own) to landSeg along a distance-driven arc (always lands at landSeg),
     with the true camera rise (the camera climbs with the bike; restored before each frame is projected), a gentle roll, a slow-mo dip
     at the apex, traffic immunity, and a landing thump with shake and sparks; onLand() runs on touchdown. MECH.sp_jump.flying() tells
     whether a jump is in the air. Returns false if one is already running. Keep the segments under the arc free of hazards yourself.
   Landmark jumps: one per road (harbour drawbridge, pass ravine, Sakurajima lava, Haneda taxiway, tunnels interchange, snow ski jump,
   paddies railway, refinery pipeline), each telegraphed, with a bypass lane, a clean-landing bonus and a name card.
   Two set pieces:
   1. Drawbridge (Harbour Line, once per visit). A bascule bridge over the channel opens as you come: bells, alternating red crossing lamps,
      gate arms, a 跳開橋 warning board and a lane gantry. Hit the rising leaf at speed and you fly the channel: a long AIR.h arc, a time-scale
      dip at the top, the camera lifting and rolling, the black water and broken city reflections below, then a heavy landing on the far leaf
      with sparks, a boost and "DRAWBRIDGE!". Too slow (after a crash) and the gate drops: a line of drums funnels you into the fixed bypass
      lane on the right, which is always open. Never a crash.
   2. Haneda. Jumbo jets on final approach, every one flying the same way as the rider: a rising roar from behind, the landing-light pool
      and then the jet's shadow sweeping forward over the road and the bike, the belly filling the top of the screen as it swoops low
      overhead (a slight downwash shake), then it goes around: nose up to a departure's ~15 deg, gear folding away, climbing off into the
      night sky ahead and fading into the haze with its strobes, beacon and nav lights (it never settles toward the road). A swoop is only
      booked where all of it, climb-out included, fits on Haneda's own road: before the border, clear of a fork's split window and tunnels. Four variants of the swoop (low over the rider twice, in from over the bay, banked from the right). The 747 is a low-poly 3D
      model rasterised every frame on the game's pixel grid (see "the 747 in 3D"); the old planform / side / front sprites stay for
      J.art() (setpiece/jetwash.js, ui/cutin.js). Beside the road, approach-light masts with the sequenced-flasher "rabbit".

   Reference rules (looked at, then drawn from scratch):
   - Amaliabrug / Tower Bridge opening: a raised leaf shows its road surface standing up like a wall, lane paint and all; the leaf edge is a
     lit girder; leaves hinge on heavy piers that house the machinery (Kachidoki's power unit sits in the pier house). -> the leaves keep
     their lane dashes, the edges carry lamp rails, a pier house with a counterweight frame stands at each hinge.
   - Tower Bridge at night: the structure is drawn by its lights (edge lamp lines), and the water under it is black with broken vertical
     streaks of reflected light. -> the void under the leaves is near-black with dashed reflection columns that shimmer.
   - Tower Bridge gates: a red traffic signal and a barrier at the pier; Blues Brothers / Driver staging: the jump is always telegraphed by
     the deck tilting up well ahead, so the player reads it from far off. -> the leaves start rising ~4 s out; gantry and board before that.
   - Approach lighting (EFJY, Bremen, the NARA landing photo): white barrettes on lattice masts in a line on the extended centreline, red
     side bars near the threshold, the sequenced flasher running toward the runway twice a second; a landing jet head-on is a thin wing line
     with a cluster of landing lights and the gear hanging. -> masts in a line beside the road, red bars at the runway end, a rabbit.
   - Boeing 747 3-view: 37.5 deg sweep, four podded engines ahead of the wing, tail cone, stabiliser at the back. -> analytic planform.
   Overhead 747s on short final (Commons: "LX-VCE Boeing 747-8R7F Cargolux underside Halstead", "747-400 City of Bangkok landing at
   Princess Juliana", "KLM Airplane Landing Passing Over Maho Bay Beach 4", "KLM landing at SXM, Maho Beach"), rules taken:
   - From straight below the belly is the lightest long shape; the wing undersides are a step darker, the flaps darker again, with the
     flap-track canoes as dark ticks along the trailing edge. -> belly ramp L/H, wing box M/L, flaps M/D, five canoe fins per side.
   - The nacelles are the strongest forms after the wings: fat cylinders hung well ahead of and below the leading edge on pylons, a bright
     lip around a black intake. -> 8-sided tubes 4 m ahead of the leading edge, 1.75 m below it, lit lip ring, black intake disc.
   - Seen from under the nose (Maho), the near wing and its engines dwarf everything, and the gear hangs as four dark four-wheel trucks plus
     the nose gear, with grey legs and hub caps the only light in them. -> true perspective, two-axle bogies, grey oleo legs and hubs.
   - Going away from behind and below (Maho, from the fence), the 747 is a cross with a fin: wings with dihedral (tips up), the tailplane
     spread, the tall fin, engines as dark rings, gear below the body line, and the flaps' drooped upper faces show. -> 7 deg dihedral,
     winglets, flaps drooped 1.5 m with their upper faces modelled, fin as a lit wedge.
   - On final the attitude barely changes: nose a few degrees up, a steady shallow descent, wings level; the drama is the camera. -> straight
     descending paths, +4 deg nose-up, only the banked variant rolls (and levels out).
   - At night the underside is lit only from below and by its own lamps: warm city bounce on what faces down, the lamps as hot points
     with beams reaching ahead to a pool on the ground. -> tone = base + 3 x (facing down) + a weak cool moon; beams and pool ahead.
   - After Burner / Strikers 1945 sprites: aircraft are a 3-4 tone grey ramp with a dark outline, lit along one edge, engine glows as hard
     discs; the horizon rolls to sell flight. -> belly ramp lit from the city below, hard light cores with stepped halos, a camera roll.
*/
"use strict";
(() => {
  const J = MECH.sp_jump = {};
  // rarity (mech/director.js): landmark jumps always stand (landmark tier), but their card and apex slow-mo play only when dress() says so;
  // Haneda's overhead jets are an ambient beat, thinned by the director's per-id cooldown
  const DIR = MECH.director;
  // ---------------------------------------------------------------- tuning (segments unless noted)
  const LEAD = 230;                  // bridge starts this many segments after the harbour road begins
  const NL = 22, G = 22, TOT = 2 * NL + G;   // leaf length, open gap, whole bridge
  const HT = 3600, TH = 260;          // leaf tip height and leaf thickness (world units)
  const PK = 1600;                    // extra arc height of the jump (world units)
  const LAND = 9;                    // touchdown, segments into the far leaf
  // BYPASS: the detour lane beside every landmark jump. Off for now (Kellan, 2026-11-19: "let's disable the detour for now this seems like a
  // bug"): the whole road leads onto the leaf, the jump lanes are the full width, the drawbridge never closes (a slow rider still flies: the
  // arc is driven by distance and the ramp and flight hold a minimum speed, so it always lands). Set true to bring the detour back.
  const BYPASS = false;
  const SPLIT = BYPASS ? .33 : 1, XL = -1;        // deck lanes are XL..SPLIT; the bypass lane (when BYPASS) is SPLIT..1
  const OPEN_SPEED = .7;             // fraction of MAXS needed to keep the jump gate up
  const JET_GAP = 270, JET_FIRST = 110;
  // one landmark jump per road. All share the leaf geometry, the bypass lane and the camera rise; each has its own ramp palette and
  // its own world below the gap. Only the harbour one is a drawbridge (leaves rise, gates, bells).
  const THEMES = {
    harbour:  { kj:'港', card:'跳開橋',   name:'DRAWBRIDGE',       bridge:true, below:'water',
      deck:['#6a3c26', '#5a321e'], bar:['#c87a1a', '#e8a030'], edge:'#ffb35a', edge2:'#a04a18', paint:'#e8dcc4', side:['#4a2416', '#3e1e12'], under:['#1c1214', '#120c10'], girder:'#3a1e16', tip:['#6a3218', '#2a140e', '#ffb35a'], lamp:['#ffd040', '#a0501a'], rail:'#ffb35a' },
    pass:     { kj:'峠', card:'谷越え',   name:'RAVINE JUMP',      below:'gorge',
      deck:['#4c4c56', '#40404a'], bar:['#d8c020', '#f0e060'], edge:'#e8e4d8', edge2:'#7a7a88', paint:'#f0ecd8', side:['#2e2e38', '#26262e'], under:['#16161c', '#101016'], girder:'#2a2a32', tip:['#3a3a44', '#1a1a20', '#f0e060'], lamp:['#fff0a0', '#6a6040'], rail:'#d8d8e0' },
    sakurajima:{ kj:'灰', card:'溶岩越え', name:'LAVA LEAP',        below:'lava',
      deck:['#3a2a28', '#30221f'], bar:['#ff5a1a', '#ff9a3a'], edge:'#ff7a2a', edge2:'#7a2a10', paint:'#e8c8a0', side:['#2a1a18', '#221412'], under:['#3a1408', '#2a0e06'], girder:'#5a1a08', tip:['#2a1a16', '#120a08', '#ff7a2a'], lamp:['#ffb040', '#6a2a10'], rail:'#ff9a3a' },
    haneda:   { kj:'空', card:'誘導路越え', name:'TAXIWAY JUMP',    below:'taxi',
      deck:['#3c4050', '#333744'], bar:['#f0d040', '#d8b020'], edge:'#6a9aff', edge2:'#2a3a7a', paint:'#f0f0e4', side:['#262a38', '#20232e'], under:['#14161e', '#101218'], girder:'#2a3044', tip:['#2e3444', '#14161e', '#6a9aff'], lamp:['#9ac8ff', '#2a3a6a'], rail:'#7ab0ff' },
    tunnels:  { kj:'隧', card:'首都高越え', name:'INTERCHANGE JUMP', below:'jct',
      deck:['#4e3e2c', '#423424'], bar:['#e8a030', '#c87a1a'], edge:'#ffb35a', edge2:'#7a4a18', paint:'#e8dcc4', side:['#2e2418', '#261e14'], under:['#16120e', '#100c0a'], girder:'#3a2a1a', tip:['#4a3420', '#1e140c', '#ffb35a'], lamp:['#ffd060', '#7a5020'], rail:'#ffc070' },
    snow:     { kj:'雪', card:'ジャンプ台', name:'SKI JUMP',        below:'snow',
      deck:['#c8d2e4', '#b6c2d8'], bar:['#5a8ad0', '#3a6ab0'], edge:'#ffffff', edge2:'#8aa0c8', paint:'#3a5a9a', side:['#9aaac8', '#8a9abc'], under:['#5a6a8a', '#4a5a7a'], girder:'#6a7a9a', tip:['#aab8d0', '#6a7a9a', '#ffffff'], lamp:['#bfe4ff', '#4a6a9a'], rail:'#d8ecff' },
    paddies:  { kj:'田', card:'線路越え',  name:'RAILWAY JUMP',     below:'rail',
      deck:['#4e3e2c', '#443624'], bar:['#f0e8c8', '#1a1814'], edge:'#e8d890', edge2:'#6a5a30', paint:'#f0ecd8', side:['#3a2e20', '#30261a'], under:['#1a1410', '#120e0c'], girder:'#3a2e20', tip:['#4a3a28', '#1a140e', '#e8d890'], lamp:['#ffe080', '#6a5a30'], rail:'#e8d890' },
    refinery: { kj:'油', card:'配管越え',  name:'PIPELINE JUMP',    below:'pipe',
      deck:['#5a3020', '#4a2a1c'], bar:['#3a8ac0', '#2a6a98'], edge:'#ff9a3a', edge2:'#6a3010', paint:'#e8dcc4', side:['#3a1e14', '#30180e'], under:['#1a0e0a', '#120a08'], girder:'#4a2416', tip:['#5a2a18', '#20100a', '#ff9a3a'], lamp:['#ffc060', '#7a3a10'], rail:'#ffb35a' } };
  for(const k in THEMES) THEMES[k].id = k;

  // ---------------------------------------------------------------- state
  let plans = [], lastPlaced = -1, visits = { harbour:0, haneda:0 };
  let air = null, ride = null, jh = 0, pitch = 0, jumps = 0, bellT = 0, lastSi = -1, tiltSgn = -1;
  let jet = null, jets = 0, sndT = 0;
  /* feel (research/sundown-craft/jumps.md): the approach winds up (deck-joint ticks synced to the amber bars, a rumble, an on-key riser,
     the bike rising in frame as the camera crouches under it), the lip hangs for a beat (LIP_T s of world at LIP_K slower), the landing
     lands (a few frames of hit-stop, the bike sinking into its forks and springing back, then the shake), and a level, centred touchdown
     is a PERFECT landing. One BIG AIR a ride: the second landmark jump flies higher and hangs longer. */
  const LIP_T = .16, LIP_K = .55, PERF_X = .14, BIG_PK = 2800, BIG_HANG = .34;
  let hold = 0, sqT = -1, sqA = 0, sqSet = false, perfects = 0, bigs = 0, tickSeg = -1;
  let low = '#24103a', warmed = false;

  // ---------------------------------------------------------------- pixel helpers
  const SP = {};
  function pix(key, w, h, fn){ if(SP[key]) return SP[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
    const P = { k, w, h,
      px(x, y, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col){ k.fillStyle = col; k.fillRect(x, y, ww, hh); },
      line(x0, y0, x1, y1, col){ k.fillStyle = col; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for(;;){ k.fillRect(x0, y0, 1, 1); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } },
      text(str, x, y, size, col, center){ const c2 = document.createElement('canvas'); c2.width = Math.ceil(size * str.length * 1.1) + 6; c2.height = size + 8; const g = c2.getContext('2d');
        g.font = size + 'px DotGothic16, monospace'; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(str, 2, 2); const tw = Math.ceil(g.measureText(str).width), d = g.getImageData(0, 0, c2.width, c2.height).data;
        const x0 = center ? Math.round(x - tw / 2) : x; k.fillStyle = col; for(let yy = 0; yy < c2.height; yy++) for(let xx = 0; xx < c2.width; xx++) if(d[(yy * c2.width + xx) * 4 + 3] > 120) k.fillRect(x0 + xx - 2, y + yy - 2, 1, 1); } };
    fn(P); return SP[key] = c; }
  // outline pass: any empty pixel touching a filled one becomes the dark-hue outline
  function outline(c, col){ const k = c.getContext('2d'), w = c.width, h = c.height, d = k.getImageData(0, 0, w, h).data, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
    k.fillStyle = col; for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) k.fillRect(x, y, 1, 1); return c; }
  function flip(c){ const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const k = f.getContext('2d'); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return f; }
  function tint(c, col, a){ const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const k = f.getContext('2d'); k.drawImage(c, 0, 0); k.globalCompositeOperation = 'source-atop'; k.globalAlpha = a; k.fillStyle = col; k.fillRect(0, 0, c.width, c.height); return f; }
  // fog colour cache
  let fogKey = '', FC = {};
  const fc = (col, fog) => { if(low !== fogKey){ fogKey = low; FC = {}; } const q = Math.round(fog * 10), key = col + q; return FC[key] || (FC[key] = mixc(col, low, q / 10 * .85)); };

  // ---------------------------------------------------------------- palettes
  const STEEL = { O:'#120a0c', D:'#2a1612', M:'#5a2c18', L:'#b0561e', H:'#ffb35a', W:'#fff0c4' };   // orange-lit steel
  const CONC = { O:'#0c0c16', D:'#20202e', M:'#363648', L:'#565670', H:'#8a8aa4' };
  const HAZ = ['#f0b020', '#1a1410'];
  const BELLY = { O:'#05060c', D:'#2a2c42', M:'#4c4a62', L:'#827482', H:'#c89c80' };   // lit from below by the city: cool shadow to warm sodium bounce

  // ---------------------------------------------------------------- bridge sprites
  // pier house at a hinge (Kachidoki-style low granite pier with a machine house), counterweight frame on the road-facing (right) side
  const pierSprite = () => pix('pier', 48, 108, P => { const { O, D, M, L, H } = CONC;
    // a floodlit lattice tower on the pier house (reads from far off): two legs, cross bracing, a lamp cap
    for(let y = 2; y < 48; y++){ const hw = 3 + Math.round((y - 2) * .16); P.px(17 - hw, y, STEEL.O); P.px(18 - hw, y, STEEL.H); P.px(17 + hw, y, STEEL.O); P.px(16 + hw, y, STEEL.L); }
    for(let y = 6; y < 44; y += 8){ const a = 3 + Math.round((y - 2) * .16), b = 3 + Math.round((y + 6) * .16); P.line(18 - a, y, 16 + b, y + 8, STEEL.M); P.line(16 + a, y, 18 - b, y + 8, STEEL.D); P.rect(18 - a, y, 2 * a - 1, 1, STEEL.L); }
    P.rect(12, 0, 11, 3, STEEL.O); P.rect(13, 1, 9, 1, STEEL.H); P.px(17, -1, '#ff3a3a');
    P.k.translate(0, 44);
    P.rect(0, 30, 34, 34, O); P.rect(1, 31, 32, 33, M); P.rect(1, 31, 2, 33, L); P.rect(30, 31, 3, 33, D);
    for(let y = 36; y < 64; y += 6){ P.rect(3, y, 27, 1, D); for(let x = 3 + (y / 6 % 2) * 4; x < 30; x += 8) P.rect(x, y - 5, 1, 5, D); }   // granite courses
    P.rect(0, 30, 34, 2, H); P.rect(0, 32, 34, 1, D);
    // machine house
    P.rect(3, 10, 28, 21, O); P.rect(4, 11, 26, 20, '#2a3048'); P.rect(4, 11, 1, 20, '#4a5478'); P.rect(28, 11, 2, 20, '#1a1e30');
    P.rect(1, 7, 32, 4, O); P.rect(2, 8, 30, 1, '#7a84a8'); P.rect(2, 9, 30, 1, '#3a4262');   // cornice
    for(const wx of [7, 15, 23]){ P.rect(wx, 15, 5, 9, O); P.rect(wx + 1, 16, 3, 7, '#ffcf80'); P.px(wx + 2, 15, O); P.rect(wx + 1, 16, 3, 1, '#fff0c4'); P.rect(wx + 1, 22, 3, 1, '#b8702a'); P.rect(wx + 1, 19, 3, 1, '#c88a40'); }
    P.rect(8, 26, 18, 3, '#1a1e30'); P.text('跳開橋', 17, 25, 8, '#ffd890', true);
    // counterweight frame: two steel posts and a head beam
    P.rect(35, 6, 3, 58, STEEL.O); P.rect(36, 6, 1, 58, STEEL.L); P.rect(45, 6, 3, 58, STEEL.O); P.rect(46, 6, 1, 58, STEEL.M);
    P.rect(34, 4, 14, 3, STEEL.O); P.rect(35, 4, 12, 1, STEEL.H); P.rect(40, 7, 2, 4, STEEL.D); });
  const cwSprite = () => pix('cw', 8, 14, P => { P.rect(0, 0, 8, 14, STEEL.O); for(let y = 1; y < 13; y++) for(let x = 1; x < 7; x++) P.px(x, y, ((x + y) >> 1) % 2 ? HAZ[0] : HAZ[1]); P.rect(1, 1, 6, 1, '#ffe080'); P.rect(3, -1, 2, 1, STEEL.D); });
  // Japanese crossing signal: striped post, crossbuck, two hooded lamps, a bell dome
  const signalSprite = () => pix('signal', 20, 50, P => { const O = '#0a0810';
    P.rect(9, 12, 3, 38, O); for(let y = 30; y < 50; y += 4){ P.rect(10, y, 1, 2, HAZ[0]); P.rect(10, y + 2, 1, 2, HAZ[1]); } P.rect(10, 12, 1, 18, '#3a3444'); P.rect(6, 46, 9, 4, O); P.rect(7, 46, 7, 1, '#4a4452');
    P.line(1, 1, 18, 9, O); P.line(1, 2, 18, 10, O); P.line(1, 9, 18, 1, O); P.line(1, 10, 18, 2, O);   // crossbuck outline
    for(let t = 0; t <= 16; t++){ const c = (t >> 2) % 2 ? HAZ[1] : HAZ[0]; P.px(2 + t, 2 + Math.round(t / 2.1), c); P.px(2 + t, 9 - Math.round(t / 2.1), c); }
    P.rect(1, 18, 19, 3, O); P.rect(2, 19, 17, 1, '#3a3444');
    for(const lx of [0, 14]){ P.rect(lx, 21, 6, 7, O); P.rect(lx + 1, 22, 4, 5, '#3a0a10'); P.rect(lx, 20, 6, 2, O); }   // lamp hoods, lenses dark (lit live)
    P.rect(8, 10, 5, 3, O); P.rect(9, 10, 3, 1, '#c8c4d0'); });
  // gate arm, down: yellow/black diagonal bands, red reflectors; and raised
  const armSprite = () => pix('arm', 64, 4, P => { P.rect(0, 0, 64, 4, '#0a0810'); for(let x = 1; x < 63; x++) for(let y = 1; y < 3; y++) P.px(x, y, ((x + y) >> 2) % 2 ? HAZ[0] : HAZ[1]); for(let x = 10; x < 64; x += 16) P.rect(x, 1, 2, 2, '#ff3a3a'); });
  const armUpSprite = () => pix('armup', 4, 40, P => { P.rect(0, 0, 4, 40, '#0a0810'); for(let y = 1; y < 39; y++) for(let x = 1; x < 3; x++) P.px(x, y, ((x + y) >> 2) % 2 ? HAZ[0] : HAZ[1]); });
  // crash cushion at the nose of the separator: chevrons pointing both ways, an amber lamp
  const cushionSprite = () => pix('cushion', 22, 18, P => { P.rect(0, 4, 22, 14, '#0a0810'); P.rect(1, 5, 20, 12, HAZ[0]);
    for(let y = 0; y < 12; y++){ const d = Math.abs(y - 5.5) | 0; for(let x = 1; x < 21; x++) if(((x + (x < 11 ? d : -d) + 40) >> 2) % 2) P.px(x, 5 + y, HAZ[1]); }
    P.rect(1, 5, 20, 1, '#ffe080'); P.rect(9, 0, 4, 4, '#0a0810'); P.rect(10, 1, 2, 2, '#8a5a10'); });
  // a water-filled drum: orange and white bands, a flasher on top
  const drumSprite = () => pix('drum', 9, 13, P => { P.rect(0, 2, 9, 11, '#140a08'); const b = ['#ff7a1a', '#ff7a1a', '#f0ece4', '#f0ece4', '#ff7a1a', '#ff7a1a', '#f0ece4', '#f0ece4', '#c85010', '#5a2008'];
    b.forEach((c, i) => { P.rect(1, 3 + i, 7, 1, c); P.px(1, 3 + i, mixc(c, '#ffffff', .25)); P.px(7, 3 + i, mixc(c, '#000000', .35)); }); P.rect(3, 0, 3, 2, '#140a08'); P.px(4, 0, '#8a5a10'); });
  // the warning board: yellow, 跳開橋 over a pictogram of two raised leaves over water
  // the lit sign on each leaf's lip: amber kanji in a steel frame on two legs
  const leafSignSprite = th => pix('leafsign' + th.id, 72, 30, P => { const O = '#0a0810', tsz = th.card.length > 3 ? 12 : 16;
    P.rect(12, 22, 3, 8, O); P.rect(57, 22, 3, 8, O); P.rect(13, 22, 1, 8, STEEL.L); P.rect(58, 22, 1, 8, STEEL.L);
    P.rect(0, 0, 72, 23, O); P.rect(1, 1, 70, 21, STEEL.L); P.rect(1, 1, 70, 1, STEEL.H); P.rect(2, 2, 68, 19, '#1a0c0a'); P.rect(3, 3, 66, 17, '#2a120c');
    P.text(th.card, 36, tsz > 12 ? 3 : 5, tsz, th.lamp[0], true);
    for(let x = 4; x < 68; x += 6){ P.px(x, 2, th.lamp[0]); P.px(x + 3, 20, th.lamp[0]); } });
  // the boom arm's stripes (the 3D gates' texture): red and white blocks along a 64 x 4 strip, a lit top row and a shaded bottom row
  const gateArmSprite = () => pix('garm', 64, 4, P => { for(let x = 0; x < 64; x++){ const red = (x >> 3) % 2 === 0; P.rect(x, 0, 1, 4, red ? '#c8202a' : '#f0ece0'); P.px(x, 0, red ? '#ff5a5a' : '#ffffff'); P.px(x, 3, red ? '#7a1018' : '#a8a49c'); } });
  const warnSprite = th => pix('warn' + th.id, 60, 66, P => { const O = '#0a0810';
    for(const x of [12, 46]){ P.rect(x, 38, 3, 28, O); P.rect(x + 1, 38, 1, 28, '#6a6478'); }
    P.rect(0, 0, 60, 40, O); P.rect(1, 1, 58, 38, '#f0c020'); P.rect(2, 2, 56, 1, '#fff0a0'); P.rect(2, 37, 56, 1, '#a07a10'); P.rect(3, 3, 54, 34, O); P.rect(4, 4, 52, 32, '#f0c020');
    P.text(th.card, 30, th.card.length > 3 ? 6 : 4, th.card.length > 3 ? 12 : 16, O, true);
    if(th.bridge){ P.line(10, 33, 26, 22, O); P.line(10, 32, 26, 21, O); P.line(50, 33, 34, 22, O); P.line(50, 32, 34, 21, O); P.rect(6, 33, 6, 2, O); P.rect(48, 33, 6, 2, O); for(let x = 14; x < 46; x += 4) P.rect(x, 34, 2, 1, '#1a4a8a'); }
    else { P.line(8, 33, 24, 24, O); P.line(8, 34, 24, 25, O); P.rect(24, 24, 2, 10, O); P.line(36, 26, 52, 33, O); P.line(36, 27, 52, 34, O); P.rect(34, 26, 2, 8, O); for(let x = 27; x < 34; x += 2) P.px(x, 23 - Math.round(Math.sin((x - 27) / 7 * 3.1) * 4), O); } });
  // the lane gantry: X from -1.25..1.25 maps to 0..150 px. Left panel over the jump lanes, right panel over the bypass.
  const gantrySprite = (open, th) => pix('gantry' + open + th.id, 150, 96, P => { const O = '#0a0810', S = { O:'#0a0c18', M:'#26304e', L:'#4a5a88', H:'#7a8cbc' };
    for(const x of [2, 144]){ P.rect(x, 6, 5, 90, S.O); P.rect(x + 1, 6, 1, 90, S.L); P.rect(x + 2, 6, 2, 90, S.M); }
    P.rect(0, 4, 150, 4, S.O); P.rect(0, 4, 150, 1, S.H); P.rect(0, 5, 150, 1, S.M); for(let x = 4; x < 146; x += 6) P.line(x, 7, x + 3, 11, S.M); P.rect(0, 11, 150, 2, S.O);
    // left panel
    const lx = BYPASS ? 15 : 35, lw = BYPASS ? 79 : 80; P.rect(lx - 1, 13, lw + 2, 34, '#d8d4c8'); P.rect(lx, 14, lw, 32, open ? '#e88a10' : '#b01828'); P.rect(lx, 14, lw, 1, open ? '#ffc060' : '#e04050'); P.rect(lx, 45, lw, 1, open ? '#8a4a08' : '#5a0a14');
    if(open){ P.text(th.card, lx + 30, th.card.length > 3 ? 17 : 15, th.card.length > 3 ? 12 : 16, O, true); P.text('JUMP', lx + 30, 31, 12, O, true);
      const ax = lx + 66; P.rect(ax, 22, 4, 20, O); for(let k = 0; k < 6; k++) P.rect(ax - 5 + k, 22 - k + 5, 14 - 2 * k, 1, O); }   // up arrow
    else { P.text('閉鎖', lx + 28, 15, 16, '#fff4e8', true); P.text('CLOSED', lx + 28, 31, 12, '#fff4e8', true);
      for(let k = 0; k < 14; k++){ P.rect(lx + 58 + k, 18 + k, 3, 2, '#fff4e8'); P.rect(lx + 71 - k, 18 + k, 3, 2, '#fff4e8'); } }
    // right panel (the detour, only with BYPASS)
    const rx = 98, rw = 38; if(BYPASS){ P.rect(rx - 1, 13, rw + 2, 34, '#d8d4c8'); P.rect(rx, 14, rw, 32, '#136a40'); P.rect(rx, 14, rw, 1, '#2a8c5a'); P.rect(rx, 45, rw, 1, '#0a4428');
    P.text('迂回', rx + 19, 15, 16, '#f0f0e4', true); P.rect(rx + 8, 38, 18, 3, '#f0f0e4'); for(let k = 0; k < 5; k++) P.rect(rx + 26 + k, 35 + k, 1, 9 - 2 * k, '#f0f0e4'); }
    for(const x of BYPASS ? [lx + 10, lx + lw - 12, rx + 8, rx + rw - 10] : [lx + 10, lx + lw - 12]) P.rect(x, 12, 4, 1, S.H); });
  // a floodlight mast for the lips of the landmark jumps: lattice pole, a bank of four lamps aimed at the ramp
  const floodSprite = () => pix('flood', 22, 84, P => { const O = '#0a0810', D = '#1a1e2c', M = '#3a4258', L = '#6a7698';
    P.rect(9, 12, 4, 72, O); P.rect(10, 12, 1, 72, L); P.rect(11, 12, 1, 72, M); for(let y = 16; y < 80; y += 5) P.px(11, y, D); P.rect(6, 80, 10, 4, O); P.rect(7, 80, 8, 1, M);
    P.rect(0, 2, 22, 10, O); P.rect(1, 3, 20, 1, L); for(let x = 1; x < 21; x += 5){ P.rect(x, 5, 4, 5, '#2a2a34'); P.rect(x + 1, 6, 2, 3, '#fff4d0'); } });
  // the side of a 747 (nose right), lit from below by the city: hump, fin with its logo light, engines and gear hanging, a window row
  const sideSprite = () => pix('jside', 128, 42, P => { const { O, D, M, L, H } = BELLY;
    for(let x = 4; x < 124; x++){ let top = 14, bot = 25; if(x > 112){ const u = (x - 112) / 12; top = 14 + Math.round(u * u * 5); bot = 25 - Math.round(u * u * 4); } if(x < 30){ const u = (30 - x) / 26; top = 14 + Math.round(u); bot = 25 - Math.round(u * 8); }
      if(x > 84 && x < 116) top = Math.min(top, 10 + Math.round(Math.max(0, (x - 108) / 8) * 4) + Math.round(Math.max(0, (92 - x) / 8) * 4));
      for(let y = top; y <= bot; y++) P.px(x, y, y > bot - 2 ? H : y > bot - 5 ? L : y < top + 2 ? D : M); }
    for(let x = 6; x < 30; x++){ const h = Math.round((30 - x) * .55); for(let y = 14 - h; y < 15; y++) P.px(x, y, x > 26 - (14 - y) * .3 ? D : M); }
    P.rect(8, 4, 3, 2, '#ffd890');
    for(let x = 4; x < 24; x++) P.px(x, 21 - Math.round((24 - x) * .1), D);
    for(let x = 22; x < 104; x += 3) if(x < 52 || x > 62) P.px(x, 17, '#ffd890');
    P.rect(116, 15, 4, 2, '#9ad0ff');
    for(let x = 44; x < 90; x++) P.px(x, 26 + Math.round((90 - x) * .04), D);
    for(const ex of [56, 72]){ P.rect(ex, 27, 13, 5, D); P.rect(ex, 28, 13, 3, M); P.rect(ex + 12, 27, 1, 5, H); P.rect(ex + 11, 28, 1, 3, '#0a0c14'); }
    for(const gx of [62, 76]){ P.rect(gx, 26, 1, 9, O); P.rect(gx - 2, 35, 5, 3, O); P.px(gx - 1, 36, '#6a7090'); P.px(gx + 1, 36, '#6a7090'); }
    P.rect(106, 25, 1, 9, O); P.rect(105, 34, 3, 3, O);
    outline(P.k.canvas, O); });
  // The 747 side view as pixel grids, nose right: hump over the front third, cockpit windows, the swept wing edge-on angling down and
  // back with two nacelles hung on pylons, the tall swept fin with its lit logo, the tailplane, gear down, the belly lit warm from below.
  // 96 x 30 and 192 x 60 (laid out off the Commons 747 3-view and side photos; see the header). Keys: K outline, D/M/L/H the belly ramp,
  // w windows, c cockpit, f lit logo, n intake, T tyre, h hub.
  const SIDE1 = [
    '...KKKKKKK......................................................................................',
    '..KMMMMMMLK.....................................................................................',
    '..KMMMMMMLLK....................................................................................',
    '..KMMMMMMMLLK...................................................................................',
    '..KMMMfLfMMLK...................................................................................',
    '..KMMMLffMMMLK..................................................................................',
    '..KMMMffLMMMLLK.................................................................................',
    '...KMMMMMMMMMLK.................................................................................',
    '...KMMMMMMMMMMLK......................................................KKKKKKKKKKKKKKKKKK........',
    '...KMMMMMMMMMMLLK................................................KKKKKDDDDDDDDDDDDDDDDDDK.......',
    '...KMMMMMMMMMMMLK............................................KKKKDDDDDDDDDDDDDDDDDDDDDDDDKK.....',
    '...KMMMMMMMMMMMMLK.......................................KKKKDDDDDDDDDMMMwMwMwMwMwMwMMMMDcDK....',
    '...KMMMMMMMMMMMMLLKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMcDDK...',
    '....KKKKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDDK..',
    'KKKKKKLLMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK..',
    'MMMMMMMMHLLLMMMMMMwMwMwMwMwMwMMMwMwMwMwMwMwMwMwMwMwMwMwMwMwMMMwMwMwMwLwLwLwLwLwLwLwLwLwLLMMMMMK.',
    'KKKKKKKKLLHLLLLLMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLMK',
    '........KKKKHLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLK.',
    '............KKHHLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLHHHHHHHHHHHHHHHHHHHHHHK..',
    '..............KKHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHKKK...',
    '................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKDDKKDDDLLKKKKKKKKKKKKKKKKKKKKKKKKKK......',
    '.................................................KKKKKKMMLLHHHKK................................',
    '...........................................KKKKKKDDKDMKMMMnKKK..................................',
    '......................................KKKKKDDDLLLHHKDLKLLLnK....................................',
    '.................................KKKKKDDDLMMMMMKKKKKKKKKKKK.....................................',
    '.............................KKKKDDDLLHHHDMMMMMnK..K..K.........................................',
    '............................KDLLLHHHKKKKKKKLLLKK...K..K.........................................',
    '............................KHKKKKKK.......KKK....KKK.KK..............................KK........',
    '.............................K...................KThTKhTK............................KTTK.......',
    '..................................................KKK.KK..............................KK........'];
  const SIDE2 = [
    '.....KKKKKKKKKKKKKK.............................................................................................................................................................................',
    '....KMMMMMMMMMMMLLLK............................................................................................................................................................................',
    '....KMMMMMMMMMMMMLLLK...........................................................................................................................................................................',
    '.....KMMMMMMMMMMMMLLLK..........................................................................................................................................................................',
    '.....KMMMMMMMMMMMMMLLK..........................................................................................................................................................................',
    '.....KMMMMMMMMMMMMMLLLK.........................................................................................................................................................................',
    '.....KMMMMMMMMMMMMMMLLLK........................................................................................................................................................................',
    '.....KMMMMMMMMMMMMMMMLLK........................................................................................................................................................................',
    '.....KMMMMMfLffLffLMMLLLK.......................................................................................................................................................................',
    '.....KMMMMMLffLffLfMMMLLLK......................................................................................................................................................................',
    '......KMMMMffLffLffMMMMLLLK.....................................................................................................................................................................',
    '......KMMMMfLffLffLMMMMLLLK.....................................................................................................................................................................',
    '......KMMMMLffLffLfMMMMMLLLK....................................................................................................................................................................',
    '......KMMMMffLffLffMMMMMMLLLK...................................................................................................................................................................',
    '......KMMMMfLffLffLMMMMMMMLLK...................................................................................................................................................................',
    '......KMMMMMMMMMMMMMMMMMMMLLLK..................................................................................................................................................................',
    '......KMMMMMMMMMMMMMMMMMMMMLLLK.................................................................................................................................................................',
    '.......KMMMMMMMMMMMMMMMMMMMMLLK................................................................................................................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.................',
    '.......KMMMMMMMMMMMMMMMMMMMMLLLK..........................................................................................................KKKKKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDKK...............',
    '.......KMMMMMMMMMMMMMMMMMMMMMLLLK....................................................................................................KKKKKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDK..............',
    '.......KMMMMMMMMMMMMMMMMMMMMMMLLLK..............................................................................................KKKKKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDK.............',
    '.......KMMMMMMMMMMMMMMMMMMMMMMLLLK..........................................................................................KKKKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDKK...........',
    '.......KMMMMMMMMMMMMMMMMMMMMMMMLLLK.....................................................................................KKKKDDDDDDDDDDDDDDDDDDMMMMwwMMwwMMwwMMwwMMwwMMwwMMwMMMMDDDDDDK..........',
    '........KMMMMMMMMMMMMMMMMMMMMMMMLLLK................................................................................KKKKDDDDDDDDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDcccDK.........',
    '........KMMMMMMMMMMMMMMMMMMMMMMMMLLK.............................................................................KKKDDDDDDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMcccDDK........',
    '........KMMMMMMMMMMMMMMMMMMMMMMMMLLLKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKDDDDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDDDK.......',
    '........KMMMMMMMMMMMDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDDDK......',
    '.........KKDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDDDK.....',
    '..........KLLMMMMMMMMMMMMMMMMMMMMMDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDK.....',
    '...........KKHLLLMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMDK....',
    '.KKKKKKKKKKKKKKHLLLLLLMMMMMMMMMMMMMMwwMMwwMMwwMMwwMMwwMMwwMMMMMMMwMMwwMMwwMMwwMMwwMMwwMMwwMMwwMMwwMMwwMMwwMMwwMMwwMMwMMMMMMMwwMMwwMMwwMMwwMMwwLLwwLLwwLLwwLLwwLLwwLLwwLLwwLLwwLLMMMMMMMMMMMDK...',
    'KMMMMMMMMMMMMMMMMHHLLLLLLLMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLMMMMMMMMDK..',
    '.KLLLLLLLLLLLLLLLLLHHLLLLLLLLLMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLMMMMMK.',
    '..KKKKKKKKKKKKKKKKKKKHHLLLLLLLLLLMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLK.',
    '.....................KKHHHLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLK..',
    '.......................KKHHHLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLHHK...',
    '.........................KKHHHLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLHHHHHKK....',
    '...........................KKHHHHLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHKK......',
    '.............................KKHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHKK........',
    '...............................KKHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHDDHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHKKHHHKKKK..........',
    '.................................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKDDDDKKKKKKKDDDDDLLKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..............',
    '......................................................................................................KK....KKDDDDKKDDDDDLLLLLHHK............................................KK.................',
    '......................................................................................................KK.KKKKKDDDDDDLLLLLHHHHHKK.............................................KK.................',
    '....................................................................................................KKKKKDMMKKMMMMMMHHHHHKKKKK...............................................KK.................',
    '........................................................................................KKKK...KKKKKDDKKDDMMKKMMMMMMMnKKK....................................................KK.................',
    '.......................................................................................KDDDDKKKDDDDDLLKKDDMMKKMMMMMMMnnK.....................................................KK.................',
    '....................................................................................KKKKDDDDDDDLLLLLHHKKDDLLKKLLLLLLLnK......................................................KK.................',
    '...............................................................................KKKKKDDDDDDDDLLLHHHHHKKKKKKLLKKLLLLLLKK.......................................................KK.................',
    '..........................................................................KKKKKDDDDDLLLMMMMDHHHKKKKK..KK..KKKKKKKKKK.........................................................KK.................',
    '.....................................................................KKKKKDDDDDLLLLDMMMMMMMMMMnK......KK....KK...............................................................KK.................',
    '...............................................................KKKKKKDDDDDLLLLLHHHDDMMMMMMMMMMnnK.....KK....KK...............................................................KK.................',
    '..........................................................KKKKKDDDDDDLLLLLHHHHHKKKDDLLLLLLLLLLnnK.....KK....KK...............................................................KK.................',
    '.........................................................KDDDDDLLLLLLHHHHHKKKKK...KKLLLLLLLLLLKK......KK....KK...............................................................KK.................',
    '.........................................................KLLLLLHHHHHHKKKKK..........KKKKKKKKKK........KK....KK...............................................................KK.................',
    '.........................................................KHHHHHKKKKKK................................KKKK..KKKK.............................................................KKKK................',
    '..........................................................KKKKK.....................................KThhTKKTThTK...........................................................KTTTTK...............',
    '....................................................................................................KThhTKKTThTK...........................................................KTTTTK...............',
    '....................................................................................................KThhTKKTThTK...........................................................KTTTTK...............',
    '.....................................................................................................KKKK..KKKK.............................................................KKKK................',
    '................................................................................................................................................................................................'];
  const SIDE_PAL = { K:'#05060c', D:'#2a2c42', M:'#4c4a62', L:'#827482', H:'#c89c80', w:'#ffd890', c:'#9ad0ff', f:'#a8906e', n:'#07080e', T:'#0a0b12', h:'#6a7090' };
  function sideFor(wPx, flipped){ const need = wPx / PX, l = 96 * 1.5 >= need ? 1 : 2, key = 'jside' + l + (flipped ? 'L' : '');
    if(!SP[key]){ const base = SP['jside' + l] || (SP['jside' + l] = makeSprite(l === 1 ? SIDE1 : SIDE2, SIDE_PAL, false)); SP[key] = flipped ? flip(base) : base; } return SP[key]; }
  function sideBlit(x, yBottom, w, flipped){ const spr = sideFor(w, flipped), h = w * spr.height / spr.width; cx.drawImage(spr, Math.round(x - w / 2), Math.round(yBottom - h), Math.round(w), Math.round(h)); }
  // the jump's name card, arrival-card style: big kanji in a box, the name, a coloured rule
  const cardSprite = th => pix('card' + th.id, 168, 40, P => { const O = '#07060c';
    P.rect(0, 0, 168, 40, O); P.rect(1, 1, 166, 38, '#14101e'); P.rect(1, 1, 166, 1, th.edge); P.rect(1, 38, 166, 1, th.edge2); P.rect(1, 1, 1, 38, th.edge);
    P.rect(4, 4, 32, 32, th.edge2); P.rect(5, 5, 30, 30, '#0c0a12'); P.text(th.kj, 20, 6, 28, th.lamp[0], true);
    P.text(th.name, 42, 6, 12, '#f4ecdf'); P.text('LANDMARK JUMP', 42, 24, 12, th.edge); });
  // ---------------------------------------------------------------- Haneda sprites
  // 747 planform seen from below, analytic (metres; nose at my = -35). Rotated by a (screen angle of the nose, 0 = up).
  let WIN = false;
  // region codes: 1 fuselage, 14 wing-root fairing, 2 wing, 7 leading edge, 8 flap, 10 flap edge, 15 flap-track fairing, 3 nacelle,
  // 6 intake lip, 16 intake, 4 stabiliser, 9 window, 11 tyre, 12 wheel hub, 13 lit wheel well
  function shape(mx, my){ const ax = Math.abs(mx);
    // main gear (two body bogies, two wing bogies) and the nose gear, down; the wells around them glow warm
    for(const [gx, gy0, gy1] of [[2.3, 3.2, 7.4], [5.9, .4, 4.6]]){ const dx = ax - gx; if(Math.abs(dx) < .95 && my > gy0 && my < gy1){ const r = Math.abs(dx) < .3 ? 12 : 11; return (Math.floor((my - gy0) * 1.6) % 2) ? r : 11; } if(Math.abs(dx) < 1.5 && my > gy0 - .6 && my < gy1 + .6) return 13; }
    if(ax < .8 && my > -28 && my < -24.5) return Math.floor(my * 2) % 2 ? 11 : 12;
    if(ax < 1.3 && my > -28.6 && my < -23.9) return 13;
    // engines: nacelles hung ahead of the leading edge, dark intakes with a lit lip
    for(const ex of [11.5, 21]){ const le = -13 + (ex - 3) * .78, d = Math.abs(ax - ex); if(d < 1.45 && my > le - 6.2 && my < le + 1.8){ if(my < le - 5.5) return d < .9 ? 16 : 6; return 3; } }
    let hw = 3.2; if(my < -29) hw = my < -35 ? -1 : 3.2 * Math.sqrt(Math.max(0, 1 - Math.pow((my + 29) / 6, 2))); else if(my > 22) hw = 3.2 * (1 - (my - 22) / 13 * .8);
    const fair = my > -16 && my < 9 ? 1.1 * Math.sin((my + 16) / 25 * Math.PI) : 0;
    if(my <= 35 && ax <= hw + fair){ if(ax > hw) return 14; if(WIN && ax > hw - .8 && my > -27 && my < 21 && Math.floor(my * .8) % 2 === 0) return 9; return 1; }
    if(ax <= 32 && ax >= 2){ const le = -13 + (ax - 3) * .78, te = ax < 12 ? 3 : 3 + (ax - 12) * .52; if(my >= le && my <= te) return my < le + .9 ? 7 : 2;
      for(const fx of [6.5, 10, 14.5, 18.5, 22.5]) if(Math.abs(ax - fx) < .45 && my > te && my < te + 3.4) return 15;   // flap-track fairings
      if(ax > 3.5 && ax < 24 && my > te && my < te + 2.6 && Math.round(ax) % 7 !== 0) return my > te + 1.9 ? 10 : 8; }
    if(ax <= 11){ const le = 22 + ax * .75, te = 30 + ax * .27; if(my >= le && my <= te) return 4; }
    return 0; }
  const LODR = [1, .5, .25];   // metres per art pixel: 64, 128 and 256 px of wingspan
  function planform(a, key, flat, R, top){ R = R || 1; const S = Math.ceil(76 / R), c = Math.cos(a), sn = Math.sin(a); WIN = Math.abs(sn) > .5;
    const dith = (px, py) => (px + py) % 2 === 0;
    const cv2 = procSprite('spj_' + key, S, S, (px, py) => { const vx = (px - S / 2 + .5) * R, vy = (py - S / 2 + .5) * R, mx = vx * c + vy * sn, my = -vx * sn + vy * c, t = shape(mx, my);
      if(!t) return null; if(flat) return '#000000';
      const ax = Math.abs(mx), B = BELLY;
      if(top){ const T = { O:'#05060c', D:'#3a3a4e', M:'#6a6a80', L:'#a8a6b8', H:'#dcd8e0' };   // moonlit roof
        if(t === 1 || t === 9 || t === 14 || t === 13 || t === 11 || t === 12) return ax < 1 ? T.H : ax < 2.3 ? T.L : T.M;
        if(t === 2 || t === 8 || t === 15){ const te = ax < 12 ? 3 : 3 + (ax - 12) * .52; return my > te - .9 ? T.D : ax > 24 && dith(px, py) ? T.D : T.M; }
        if(t === 7 || t === 10) return T.L; if(t === 3) return T.D; if(t === 6) return T.L; if(t === 16) return '#07080e'; if(t === 4) return T.L; return T.M; }
      switch(t){
        case 1: if(ax < .8) return my < -22 ? B.H : B.L; if(ax < 1.4) return dith(px, py) ? B.L : B.M; if(ax < 2.4) return B.M; return B.D;   // round belly, lit along its keel
        case 14: return ax < 3.6 ? (dith(px, py) ? B.H : B.L) : B.L;
        case 2: { const te = ax < 12 ? 3 : 3 + (ax - 12) * .52, le = -13 + (ax - 3) * .78; if(my > te - .9) return B.D; if(ax < 12 && my < le + 3) return B.L; if(ax > 25) return dith(px, py) ? B.M : B.D; return B.M; }
        case 7: return B.H; case 8: return B.D; case 10: return B.L; case 15: return B.L;
        case 3: return (mx > 0) === (Math.abs(mx) > (ax > 16 ? 21 : 11.5)) ? B.L : B.M;
        case 6: return B.H; case 16: return '#07080e';
        case 4: return my < 22 + ax * .75 + .8 ? B.L : B.M;
        case 9: return Math.round(my * 3) % 3 ? '#ffd890' : B.M;
        case 11: return '#0a0b12'; case 12: return '#6a7090'; case 13: return '#c88a50';
      } return null; });
    if(!flat && !cv2.spjOut){ cv2.spjOut = 1; outline(cv2, BELLY.O); }   // (top views share the outline pass)
    return cv2; }
  const ANG = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI, -Math.PI * 3 / 4, -Math.PI / 2, -Math.PI / 4];   // nose direction on screen, seen from below
  const jetTop = l => planform(Math.PI / 2, 'jtop' + l, false, LODR[l], true);
  const jetSpr = (i, l = 0) => planform(ANG[i], 'jet' + l + '_' + i, false, LODR[l]);
  // head-on silhouette for a distant approach: wing line with a little dihedral, four engines hanging, fin, gear down
  const frontSprite = () => pix('jfront', 120, 34, P => { const { O, D, M, L } = BELLY;
    for(let x = 0; x < 120; x++){ const ax = Math.abs(x - 59.5), y = 17 - Math.round(ax * .06); if(ax < 58){ P.rect(x, y, 1, 3, M); P.px(x, y, L); } }
    P.rect(53, 4, 3, 13, D); P.rect(54, 1, 2, 4, D); P.rect(54, 4, 1, 12, M);    // fin (offset left: lit side)
    for(let x = 38; x < 82; x++){ const ax = Math.abs(x - 59.5), y = 13 - Math.round(ax * .05); P.px(x, y, ax < 21 ? M : D); }   // stabiliser behind
    for(let y = 10; y < 26; y++) for(let x = 52; x < 68; x++){ const d = Math.hypot(x - 59.5, (y - 17.5) * 1.05); if(d < 7.5) P.px(x, y, d < 3 ? L : d < 5.5 ? M : D); }
    for(const ex of [-36, -21, 21, 36]){ const x0 = 59.5 + ex, y0 = 19 - Math.round(Math.abs(ex) * .06) + 2; for(let y = -2; y < 3; y++) for(let x = -3; x < 3; x++){ const d = Math.hypot(x + .5, y); if(d < 2.9) P.px(x0 + x, y0 + y, d < 1.5 ? '#0a0c14' : L); } }
    for(const gx of [-8, -4, 4, 8]){ P.rect(59 + gx, 24, 1, 5, D); P.rect(58 + gx, 29, 3, 2, O); P.px(59 + gx, 29, '#6a7090'); }
    P.rect(59, 25, 1, 4, D); P.rect(58, 29, 3, 2, O);
    outline(P.k.canvas, O); });
  // approach-light mast: yellow lattice, crossbar with five lamp heads (lamps drawn live)
  const mastSprite = h => pix('mast' + h, 26, 16 + h, P => { const O = '#05060c', Y = '#2a3048', YL = '#5a6488', YD = '#161a2a';   // dark steel over the water; the lamps carry it
    P.rect(11, 6, 4, 10 + h, O); P.rect(12, 6, 1, 10 + h, YL); P.rect(13, 6, 1, 10 + h, YD); for(let y = 8; y < 14 + h; y += 3) P.px(13, y, Y);
    P.rect(0, 3, 26, 4, O); P.rect(1, 4, 24, 1, YL); P.rect(1, 5, 24, 1, Y);
    for(let x = 1; x < 26; x += 5){ P.rect(x, 0, 4, 4, O); P.rect(x + 1, 1, 2, 2, '#3a3428'); }
    P.rect(9, 14 + h, 8, 2, O); });

  // ---------------------------------------------------------------- warm: build every sprite
  function build(){ for(const k in THEMES){ leafSignSprite(THEMES[k]); warnSprite(THEMES[k]); gantrySprite(true, THEMES[k]); gantrySprite(false, THEMES[k]); cardSprite(THEMES[k]); } floodSprite(); for(const w of [90, 250]){ sideFor(w * PX, false); sideFor(w * PX, true); } pierSprite(); SP.pierR = flip(SP.pier); cwSprite(); signalSprite(); SP.signalR = flip(SP.signal); armSprite(); armUpSprite(); cushionSprite(); drumSprite();
    for(let i = 0; i < ANG.length; i++){ for(let l = 0; l < LODR.length; l++) jetSpr(i, l); } for(let l = 0; l < LODR.length; l++) jetTop(l); frontSprite(); for(const h of [8, 14, 20]) mastSprite(h); gateArmSprite();
  }
  function warm(){ pbuf(); if(!buf) buf = document.createElement('canvas'); if(!dbuf) dbuf = document.createElement('canvas'); if(warmed) return;   // every buffer up front: no canvas is made mid-ride
   warmed = true; build();
    if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16').then(() => { for(const k in SP) if(/^(pier|warn|gantry|leafsign|card|clos)/.test(k)) delete SP[k]; pierSprite(); SP.pierR = flip(SP.pier); for(const k in THEMES){ leafSignSprite(THEMES[k]); warnSprite(THEMES[k]); gantrySprite(true, THEMES[k]); gantrySprite(false, THEMES[k]); cardSprite(THEMES[k]); } }).catch(() => {}); }
  J.warm = warm;

  // ---------------------------------------------------------------- placement
  const pv0 = i => { const q = segs[i - 1]; return q && q.spjP && q.hz; };
  /* THE ROADSIDE THROUGH A LANDMARK JUMP (research/sundown-craft/jumpsides.md). The jump used to strip every prop but the lamps from its
     segments, so monorails, rows, rails and shores stopped dead at the ramp and started again after the landing. Now the roadside stays:
     a prop is kept when ENV[road].jumpKeep(sp, o, p) says true, dropped when it says false, and when it says nothing (undefined, or no
     hook) the default keeps lamps, and env props and projBox building runs (sp.pb) standing clear of the deck (|x| >= KEEP_X). o = segment - p.b0: the ramp is 0..NL-1,
     the gap NL..NL+G-1, the far leaf NL+G..TOT-1 (r = 1; a drawbridge's leaves meet when closed). Everything outside 0..TOT-1 is untouched.
     Road lamps (type 'lamp') stay on the ramp and the far leaf and go over the gap. */
  const KEEP_X = 1.15;
  function keepSides(s, o, p, L){ const E = ENV[L.key], hk = E && E.jumpKeep, gap = inGap(p, o);
    s.sprites = s.sprites.filter(sp => { if(hk){ const k = hk(sp, o, p); if(k === true || k === false) return k; }
      return sp.type === 'lamp' ? !gap : (!!sp.env || !!sp.pb) && Math.abs(sp.x) >= KEEP_X; }); }   // (a road lamp has no road to light over the gap)
  /* inGap(p, o): is offset o over the open water / hole of jump p (placement geometry: the fully open leaves; a drawbridge's whole span
     crosses its channel, pier to pier). For env hooks: MECH.sp_jump.inGap(p, o). */
  function inGap(p, o){ return p.th.bridge ? o >= 0 && o < TOT : o >= NL && o < NL + G; }
  J.inGap = inGap; J.NL = NL; J.G = G; J.TOT = TOT;
  J.place = (i, s, L) => {
    if(i === 0){ plans = []; visits = { harbour:0, haneda:0 }; lastPlaced = -1; }
    if(i <= lastPlaced) plans = plans.filter(p => p.start < i);   // the road past a border was regenerated
    lastPlaced = i;
    if(pv0(i)) segs[i - 1].hz = null;   // hazards are rolled after place(): keep them off the bridge
    const pv = segs[i - 1], fresh = !pv || pv.land !== s.land;
    if(fresh && THEMES[L.key] && !(window.DEMO && DEMO.jumpOff && DEMO.jumpOff(i))){ const th = THEMES[L.key];   /* (a demo level can turn a road's jump off) */ let b0 = i + LEAD; if(L.tunnel) while(b0 % 320 !== 214) b0++;   // tunnels: launch straight out of a portal
      if(window.forkClear){ let d = forkClear(b0 - 210, b0 + TOT + 30); if(d){ b0 += d; if(L.tunnel) while(b0 % 320 !== 214) b0++; } }   // (?split=1: never in a fork's split window)
      let dress = true; if(DIR){ const jid = 'jump:' + L.key; DIR.request(jid, { tier:'landmark', seg:b0 }); dress = DIR.dress(jid); }
      plans.push({ kind:'bridge', th, start:i, b0, r:th.bridge ? 0 : 1, open:true, dress }); }
    if(fresh && L.key === 'haneda'){ const v = visits.haneda++; plans.push({ kind:'haneda', start:i, v }); }
    plans = plans.filter(p => p.start > i - 4000);
    for(const p of plans){
      if(p.kind === 'bridge'){ const a = p.b0 - 210, b = p.b0 + TOT + 30;
        if(i + 160 < a || i > b) continue;
        for(let j = Math.max(i, a); j <= Math.min(segs.length - 1, i + 160, b); j++){ const q = segs[j]; if(q.spjP === p) continue; q.spjP = p; q.skRes = 1; q.police = 1; q.hz = null;
          const o = j - p.b0, f = o < -100 ? clamp((-70 - o) / 30, 0, 1) : o > TOT + 8 ? clamp((o - TOT - 8) / 20, 0, 1) : 0; q.curve *= f; }
        if(s.spjP === p){ const o = i - p.b0; if(o >= 0 && o < TOT) keepSides(s, o, p, L); } }
      else if(p.kind === 'haneda' && s.land === segs[p.start].land){ const o = i - p.start;
        /* a slot only when the whole swoop, climb-out included, fits on this road: before its border, clear of the fork's split window
           (and of tunnels), and only for this visit's plan (a stale plan from an earlier Haneda road never places) */
        if(o >= JET_FIRST && (o - JET_FIRST) % JET_GAP === 0 && o < 4000 && zoneOfSeg(i) === zoneOfSeg(p.start) && !L.tunnel && jetFits(i) && (!DIR || DIR.request('jets', { tier:'ambient', seg:i }))) s.spjJet = { type:(p.v + (o - JET_FIRST) / JET_GAP) % 4, done:false };
        /* the approach-light pier and its rabbit belong to env/haneda.js (left, in the bay); we do not duplicate them */ } }
  };

  // ---------------------------------------------------------------- runtime
  /* Vehicle helper: MECH.sp_jump.vehAir(v) for any vehicle { z (world), x (half-road widths) } on the road.
     Returns null on flat road, or { h, pitch, air }: h = height above the road in world units on a landmark-jump deck lane or a skill.js
     kicker (the same distance-driven arc the player flies), pitch 0..~.5 nose-up, air = true while off the ramp. It also stores
     v.airH / v.airPitch, and spawns a landing puff (dust and sparks) when the vehicle touches down.
     MECH.sp_jump.vehLift(s, z, h) converts h to screen px on segment s at depth z; MECH.sp_jump.vehShadow(x, y, w) draws the ground shadow. */
  let puffs = [];
  function vehArc(z, x){ const zs = z / SEG, si = Math.floor(zs), sg = segs[si]; if(!sg) return null; const pl = sg.spjP;
    if(pl && pl.kind === 'bridge' && x < SPLIT && x > XL - .1){ const o = zs - pl.b0, r = pl.th.bridge ? (pl.r || 0) : 1; if(o >= 0 && o < TOT && r > .02){
      const Lh = leafLen(r), HTr = HT * r, gB = Lh + G * r, len = G * r + LAND;
      if(o < Lh) return { h:HTr * o / Lh, pitch:.3 * r, air:false };
      const u = (o - Lh) / len; if(u < 1) return { h:lerp(HTr, HTr * (1 - LAND / NL), u) + 4 * PK * r * u * (1 - u), pitch:.5 * (1 - u * 1.6), air:true };
      return { h:Math.max(0, HTr * (TOT - o) / Lh), pitch:0, air:false }; } }
    for(let k = 0; k <= 14; k++){ const q = segs[si - k], R = q && q.skR; if(!R) continue; if(Math.abs(x - R.x) > .3) return null;   // a skill.js kicker
      const d = z - R.z0; if(d < 0) return null; if(d <= 800) return { h:460 * d / 800, pitch:.35 * d / 800, air:false };
      const u = (d - 800) / 2200; return u < 1 ? { h:460 * (1 - u) + 4 * 560 * u * (1 - u), pitch:.4 * (1 - u * 1.8), air:true } : null; }
    return null; }
  J.vehAir = v => { let A = vehArc(v.z, v.x);
    // latch: once off the lip on the jump lane, stay on the arc (by distance) until touchdown, wherever x drifts
    if(A && A.air && !v._jmp){ const zs = v.z / SEG, pl = segs[Math.floor(zs)] && segs[Math.floor(zs)].spjP; v._jmp = { pl, x:v.x }; }
    if(v._jmp){ const L = vehArc(v.z, v._jmp.x); if(L && L.air) A = L; else { v._jmp = null; if(L) A = L; } } v.airH = A ? A.h : 0; v.airPitch = A ? A.pitch : 0;
    const was = v._spjAir; v._spjAir = !!(A && A.air); if(was && !v._spjAir && puffs.length < 12) puffs.push({ x:v.x, z:v.z, t:0 }); return A; };
  J.vehLift = (s, z, h) => { const f = (z % SEG) / SEG; return (s.p1.screen.scale + (s.p2.screen.scale - s.p1.screen.scale) * f) * h * H / 2; };
  J.vehShadow = (x, y, w) => { cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(Math.round(x), Math.round(y), Math.max(PX, w * .12), Math.max(1, w * .025), 0, 0, 6.283); cx.fill(); };
  function drawPuffs(s){ for(const f of puffs){ if(Math.floor(f.z / SEG) !== s.index) continue; const f2 = (f.z % SEG) / SEG, w = s.p1.screen.w + (s.p2.screen.w - s.p1.screen.w) * f2, x = s.p1.screen.x + (s.p2.screen.x - s.p1.screen.x) * f2 + f.x * w, y = s.p1.screen.y + (s.p2.screen.y - s.p1.screen.y) * f2, a = 1 - f.t / .7;
    for(let k = 0; k < 6; k++){ const ang = k / 6 * Math.PI, rr2 = w * (.06 + f.t * .25); cx.fillStyle = `rgba(200,190,180,${.35 * a})`; cx.fillRect(Math.round(x + Math.cos(ang) * rr2 - PX), Math.round(y - Math.sin(ang) * rr2 * .4 - PX), PX * 2, PX * 2); }
    if(!reduce && f.t < .25) for(let k = 0; k < 5; k++){ cx.fillStyle = k % 2 ? '#ffd04a' : '#fff0c4'; cx.fillRect(Math.round(x + (k - 2) * w * .04), Math.round(y - f.t * w * .3 * (1 + k % 3)), PX, PX); } } }
  J.reset = () => { for(const d of SHD) d.on = false; for(const c of CHK) c.on = false; CBP_ = null; camDown(); camSeg = null; camExt = 0; floatW = 0; pitchOff(); if(owning){ owning = false; AIR.h = 0; POSE.pitch = 0; } air = null; ride = null; jh = 0; pitch = 0; jumps = 0; cleanT = 0; hold = 0; sqT = -1; if(sqSet){ sqSet = false; AIR.h = 0; } perfects = 0; bigs = 0; tickSeg = -1; jet = null; jets = 0; lastSi = -1; bellT = 0; warm(); };
  const bikeHalf = () => { const bk = Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX); return 13 * bk / W; };
  function scrape(side){ speed = Math.max(MAXS * .45, speed - ACCEL * 1.2 / 60); if(!reduce) for(let k = 0; k < 2; k++) sparks.push({ x:W / 2 + side * W * .05, y:H - 30, vx:-side * rr(60, 220), vy:rr(-200, -60), life:.4, c:'#ffd04a' }); M.scrape && M.scrape(); }
  // ---- the traffic gates at the base of the leaf: real 3D boom barriers that break.
  // A bascule bridge (Kachidoki-bashi in its working years, Tower Bridge, US bascule spans) closes its road with boom gates just short of
  // the leaf, the same flimsy striped arms as a railway crossing (踏切 遮断機) or a car-park barrier: a pivot housing at the road edge, a
  // thin red-and-white arm across the lanes, red lamps on the housing flashing alternately, the bell ringing. Here a pair of them closes
  // the jump lanes at GZ segments before the leaf (one from the outer edge, one from the divider by the bypass, meeting in the middle);
  // on the roads where the jump is a broken road rather than a drawbridge they are the same arms as a work-zone barrier. The arms are up
  // until you come close, then swing down. Ride through and the arm you hit snaps where you hit it: the far piece spins away end over end
  // with its stripes, the stub stays on its pivot, swinging; the lamps keep flashing. The bypass lane has no gate. Never a crash.
  // Reduced motion: the arm snaps and the far piece drops. A low-poly model in world space (x across in road units, z along the road,
  // height in "iso" units = road units x H / W, so a turn in 3D keeps its shape on screen), projected every frame through the road's
  // own segment projection (so it stands on the road over crests and dips). No canvases mid-ride: the stripe texture is built in warm();
  // the piece pool and projection buffers are preallocated.
  const CBX = new Float32Array(8), CBY = new Float32Array(8);
  // a box's faces as corner indices (bit 0: +x, bit 1: +y, bit 2: +z), wound once here so every face's normal points outward
  const BOXF = [[0, 1, 3, 2], [6, 7, 5, 4], [0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6]], BOXN = [[0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0]];
  for(let fi = 0; fi < 6; fi++){ const F = BOXF[fi], cn = k => [k & 1 ? 1 : -1, k & 2 ? 1 : -1, k & 4 ? 1 : -1], a = cn(F[0]), b = cn(F[1]), d = cn(F[2]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]], n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if(n[0] * BOXN[fi][0] + n[1] * BOXN[fi][1] + n[2] * BOXN[fi][2] < 0) F.reverse(); }
  // the gates: GZ segments before the leaf; pivots at the outer edge and the divider; pivot height, housing and arm sizes in iso units
  const GZ = 12, GM = { XA:XL - .07, XB:SPLIT + .07, XM:(XL + SPLIT) / 2, HP:175, HH:240, AY:20, AZ:12 };   // pivot ~1 m up (a real boom arm's height: handlebar / chest height on the bike)
  const mkC = () => ({ on:false, kind:0, xw:0, zw:0, hE:0, vx:0, vz:0, vy:0, ax:0, ay:0, az:0, wx:0, wy:0, wz:0, ex:0, ey:0, ez:0, u0:0, u1:0, t:0, lit:0, tex:'', R:new Float32Array(9) });
  const CHK = []; for(let n = 0; n < 4; n++) CHK.push(mkC());   // pieces in flight (the far piece and two splinters)
  const GP = []; for(let n = 0; n < 8; n++) GP.push(mkC());     // the gates as drawn this frame: two housings, two arms (or stubs), four lamps
  const K_ARM = 1, K_LAMP = 2, K_HOUSE = 4, K_CHIP = 5;
  function setR(c){ const ca = Math.cos(c.ax), sa = Math.sin(c.ax), cb = Math.cos(c.ay), sb = Math.sin(c.ay), cc = Math.cos(c.az), sc_ = Math.sin(c.az), R = c.R;
    // R = Ry * Rx * Rz, local -> world, rows x, y, z
    R[0] = cb * cc + sb * sa * sc_; R[1] = -cb * sc_ + sb * sa * cc; R[2] = sb * ca;
    R[3] = ca * sc_; R[4] = ca * cc; R[5] = -sa;
    R[6] = -sb * cc + cb * sa * sc_; R[7] = sb * sc_ + cb * sa * cc; R[8] = cb * ca; }
  // a world point (x road units, z world, h iso) through the road's segment projection into CBX/CBY[k]; false if it isn't on the drawn road
  function cproj(xw, zw, hE, k){ const base = Math.floor(position / SEG), gi = Math.floor(zw / SEG); if(gi <= base || gi >= base + DRAW - 1) return false;
    const sg = segs[gi]; if(!sg || !sg.p1.screen.scale || sg.p1.camera.z <= DEPTH) return false;
    const f = (zw - gi * SEG) / SEG, a = sg.p1.screen, b = sg.p2.screen, sc = a.scale + (b.scale - a.scale) * f, w = a.w + (b.w - a.w) * f;
    CBX[k] = a.x + (b.x - a.x) * f + xw / ROADW * w; CBY[k] = a.y + (b.y - a.y) * f - sc * hE * W / 2; return true; }
  const CBCOL = { 1:['#f0ece0', '#a8a49c', '#3a3a44'], 2:['#ff3a3a', '#8a1a1a', '#2a0a0a'], 4:['#e8c020', '#a08010', '#2a2410'], 5:['#f0ece0', '#c02028', '#3a3a44'] };
  // one piece: a shaded box with a dark outline; an arm carries its slice of the striped texture on its -z face (the side facing you)
  function drawChunk(c, fog){ const R = c.R;
    for(let k = 0; k < 8; k++){ const lx = k & 1 ? c.ex : -c.ex, ly = k & 2 ? c.ey : -c.ey, lz = k & 4 ? c.ez : -c.ez;
      if(!cproj(c.xw + R[0] * lx + R[1] * ly + R[2] * lz, c.zw + R[6] * lx + R[7] * ly + R[8] * lz, c.hE + R[3] * lx + R[4] * ly + R[5] * lz, k)) return; }
    const pal = CBCOL[c.kind], spr = c.tex ? SP[c.tex] : null; cx.lineWidth = PX; cx.strokeStyle = '#0a0810';
    for(let fi = 0; fi < 6; fi++){ const F = BOXF[fi]; let ar = 0; for(let q = 0; q < 4; q++){ const a = F[q], b = F[(q + 1) & 3]; ar += CBX[a] * CBY[b] - CBX[b] * CBY[a]; } if(ar <= 0) continue;
      const nl = BOXN[fi], ny = R[3] * nl[0] + R[4] * nl[1] + R[5] * nl[2], nz = R[6] * nl[0] + R[7] * nl[1] + R[8] * nl[2], lt = .3 + .45 * Math.max(0, ny) + .4 * Math.max(0, -nz);
      cx.beginPath(); cx.moveTo(CBX[F[0]], CBY[F[0]]); for(let q = 1; q < 4; q++) cx.lineTo(CBX[F[q]], CBY[F[q]]); cx.closePath();
      cx.fillStyle = fc(c.lit && c.kind === K_LAMP ? '#ff5040' : pal[lt > .62 ? 0 : lt > .4 ? 1 : 2], fog); cx.fill();
      if(spr && (fi === 0 || fi === 5)){   // the stripes on the side facing you and on top: texture top-left at the face's first corner pair
        const o = fi === 0 ? [2, 3, 0] : [6, 7, 2]; cx.save(); cx.clip(); cx.transform(CBX[o[1]] - CBX[o[0]], CBY[o[1]] - CBY[o[0]], CBX[o[2]] - CBX[o[0]], CBY[o[2]] - CBY[o[0]], CBX[o[0]], CBY[o[0]]); cx.imageSmoothingEnabled = false;
        cx.drawImage(spr, c.u0, 0, Math.max(1, c.u1 - c.u0), spr.height, 0, 0, 1, 1); cx.restore();
        const dk = Math.min(.6, (.7 - Math.min(.7, lt)) * .8 + fog * .5); if(dk > .02){ cx.globalAlpha = dk; cx.fillStyle = '#05040a'; cx.fill(); cx.globalAlpha = 1; } }
      if(c.kind !== K_ARM || fi !== 5) cx.stroke(); }
    if(c.kind === K_LAMP && c.lit){ const x = (CBX[0] + CBX[7]) / 2, y = (CBY[0] + CBY[7]) / 2; glow(x, y, Math.max(PX * 4, Math.abs(CBX[1] - CBX[0]) * 3), '#ff2a2a', (reduce ? .35 : .6) * c.lit); } }
  // the deck under a point of the jump (road units): the road, the rising leaf, nothing over the gap, the far leaf coming down, the road
  function deckAt(p, zw){ const o = zw / SEG - p.b0, r = p.r || 0, Lh = leafLen(r), gB = Lh + G * r; if(o < 0) return 0; if(o < Lh) return HT * r * o / Lh; if(o < gB) return -1e9; if(o < TOT) return HT * r * (TOT - o) / NL; return 0; }
  const gateZ = p => (p.b0 - GZ) * SEG;
  // how far down the arms are (1 = across the lanes): they swing down as you come in, from 120 to 70 segments out (behind the title they
  // stay up: the attract ride takes the jump without a gate to break)
  const gateDown = (p, ps) => state === 'ready' ? 0 : clamp((p.b0 - GZ - ps - 70) / -50 + 1, 0, 1);
  // arm k (0: from the outer edge, 1: from the divider) at angle th above horizontal, pivot to length l along it, texture u from u0
  function poseArm(c, k, zG, th, l0, l1, L){ const s = k ? -1 : 1, px = (k ? GM.XB : GM.XA) * ROADW, m = (l0 + l1) / 2;
    c.kind = K_ARM; c.tex = 'garm'; c.xw = px + s * Math.cos(th) * m; c.hE = GM.HP + Math.sin(th) * m; c.zw = zG; c.ex = (l1 - l0) / 2; c.ey = GM.AY; c.ez = GM.AZ;
    c.ax = 0; c.ay = 0; c.az = s * th; c.u0 = 64 * l0 / L; c.u1 = 64 * l1 / L; c.lit = 0; setR(c); }
  const armLen = k => ((k ? GM.XB - GM.XM : GM.XM - GM.XA) * ROADW) + 60;
  let CBP_ = null;   // the plan whose broken arm is in flight
  const SHD = []; for(let n = 0; n < 20; n++) SHD.push({ on:false, x:0, y:0, vx:0, vy:0, t:0, life:1, col:'' });   // splinters and sparks at the break only
  // the gates as they stand this frame (shared by drawing and the break), into GP; returns the count
  function poseGates(p, ps, now){ const zG = gateZ(p), dn = gateDown(p, ps), th0 = (Math.PI / 2) * (1 - dn * dn * (3 - 2 * dn)), flash = reduce ? 1 : Math.floor(now / 420) % 2; let n = 0;
    for(let k = 0; k < 2; k++){ const s = k ? -1 : 1, px = (k ? GM.XB : GM.XA) * ROADW, L = armLen(k), hit = p.gHit === k;
      let c = GP[n++]; c.kind = K_HOUSE; c.tex = ''; c.xw = px - s * 40; c.zw = zG + 30; c.ex = 55; c.ey = GM.HH / 2; c.ez = 50; c.hE = GM.HH / 2; c.ax = c.ay = c.az = 0; c.lit = 0; setR(c);
      for(let j = 0; j < 2; j++){ c = GP[n++]; c.kind = K_LAMP; c.tex = ''; c.xw = px - s * 40 + (j ? 40 : -40); c.zw = zG - 40; c.ex = 30; c.ey = 30; c.ez = 14; c.hE = GM.HH + 45; c.ax = c.ay = c.az = 0; c.lit = dn > .02 && (reduce || flash === j) ? 1 : 0; setR(c); }
      c = GP[n++];
      if(hit){ const t = p.gT || 0, sw = reduce ? 0 : .32 * Math.exp(-t / 1.1) * Math.sin(8 * t); poseArm(c, k, zG, Math.max(-.25, sw), 0, p.gDb, L); }
      else poseArm(c, k, zG, th0, 0, L, L); }
    return n; }
  function drawGates(p, fog, now){ const ps = (position + PZ) / SEG, n = poseGates(p, ps, now); for(let k = 0; k < n; k++) drawChunk(GP[k], fog);
    if(!p.sg) p.sg = [0, 0, 0]; const zG = gateZ(p); if(cproj(clamp(playerX, GM.XA, GM.XB) * ROADW, zG, GM.HP, 0)){ p.sg[0] = CBX[0]; p.sg[1] = CBY[0]; } }
  function smash(p){ const k = playerX < GM.XM ? 0 : 1, L = armLen(k), px = (k ? GM.XB : GM.XA) * ROADW, s = k ? -1 : 1, db = clamp(Math.abs(playerX * ROADW - px), 200, L - 200), sp = Math.max(speed, MAXS * .8), zG = gateZ(p);
    p.smash = true; p.gHit = k; p.gDb = db; p.gT = 0; CBP_ = p;
    const c = CHK[0]; c.on = true; c.t = 0; poseArm(c, k, zG, 0, db, L, L);
    if(reduce){ c.vx = 0; c.vy = 0; c.vz = 0; c.wx = c.wy = c.wz = 0; }
    else { c.vz = sp * .82; c.vy = 2300; c.vx = s * 700; c.wz = s * 11; c.wy = s * 3; c.wx = 1.5; }
    for(let j = 1; j < CHK.length; j++){ const d = CHK[j]; if(reduce){ d.on = false; continue; } d.on = true; d.t = 0; const h1 = hash(j * 3.1 + p.b0), h2 = hash(j * 7.7 + p.b0);
      d.kind = K_CHIP; d.tex = ''; d.xw = px + s * db; d.zw = zG; d.hE = GM.HP; d.ex = 40 + 30 * h1; d.ey = GM.AY; d.ez = GM.AZ; d.ax = d.ay = d.az = 0; d.lit = 0; setR(d);
      d.vz = sp * (.6 + .3 * h1); d.vy = 1500 + 1500 * h2; d.vx = (h1 - .5) * 2400; d.wx = 10 * h2; d.wy = 6; d.wz = (h2 - .5) * 24; }
    const g = p.sg || [W / 2, H * .6]; let ns = 0;
    if(!reduce) for(const d of SHD){ const h1 = hash(ns * 2.3 + p.b0), h2 = hash(ns * 5.9 + p.b0); d.on = true; d.t = 0; d.x = g[0] + (h1 - .5) * W * .05; d.y = g[1] + (h2 - .5) * H * .03;
      d.vx = (h1 - .5) * 900; d.vy = -200 - h2 * 600; d.life = .25 + hash(ns * 1.1) * .3; d.col = ns % 3 === 0 ? '#c02028' : ns % 3 === 1 ? '#f0ece0' : '#fff0c4'; ns++; }
    p.hitT = .06;   // the impact frame
    try{ M.noise(.07, 3200, .24); M.noise(.18, 900, .14); M.tone(140, .12, { v:.08 }); M.noise(.12, 6000, .05); }catch(e){}   // the arm cracks: a sharp snap and a hollow knock
    if(!reduce) shake = Math.max(shake, 4);
    try{ if(MECH.style && MECH.style.act) MECH.style.act('smash', 150); }catch(e){} }
  function updateShards(dt){
    for(const d of SHD){ if(!d.on) continue; d.t += dt; if(d.t >= d.life){ d.on = false; continue; } d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 1500 * dt; }
    const p = CBP_; if(!p) return; p.gT = (p.gT || 0) + dt; let any = false; const gI = 6500;
    for(const c of CHK){ if(!c.on) continue; any = true; c.t += dt;
      c.xw += c.vx * dt; c.zw += c.vz * dt; c.hE += c.vy * dt; c.vy -= gI * dt; c.ax += c.wx * dt; c.ay += c.wy * dt; c.az += c.wz * dt;
      setR(c); const R = c.R, rad = Math.abs(R[3]) * c.ex + Math.abs(R[4]) * c.ey + Math.abs(R[5]) * c.ez, gH = deckAt(p, c.zw);
      if(gH > -1e8){ const g = gH * H / W; if(c.hE - rad < g){ c.hE = g + rad; if(c.vy < 0) c.vy = -c.vy * .3; c.vx *= .6; c.vz *= .55; c.wx *= .5; c.wy *= .5; c.wz *= .5; if(Math.abs(c.vy) < 300) c.vy = 0; } }
      if(c.hE < -5000 || c.t > 3.5 || c.zw < position - 400) c.on = false; }
    if(!any && p.gT > 4) CBP_ = null; }
  // pieces nearer than the bike go over everything (the overlay); the rest are drawn with their segment, among the scenery
  function drawFlying(segI, near, fog){ const p = CBP_; if(!p) return; const bz = position + PZ;
    for(const c of CHK){ if(!c.on) continue; if(near ? c.zw > bz : (c.zw <= bz || Math.floor(c.zw / SEG) !== segI)) continue; drawChunk(c, near ? 0 : fog); } }
  function drawShards(){ for(const d of SHD){ if(!d.on) continue; const a = Math.min(1, (d.life - d.t) / (d.life * .3)); cx.globalAlpha = a; cx.fillStyle = d.col; cx.fillRect(snapP(d.x), snapP(d.y), PX, PX); if(d.t < .08) glow(d.x, d.y, PX * 4, '#fff0c4', .35 * a); }
    cx.globalAlpha = 1; drawFlying(-1, true, 0);
    const p = CBP_; if(p && p.hitT > 0 && !reduce){ const g = p.sg || [W / 2, H / 2]; star(g[0], g[1], PX * 2.5, '#ffffff', .7); } }
  // the jump under the bike is the one its segments carry (what drawSeg draws there): take that first, so a plan the list has lost or a
  // second plan over the same road can never leave the gap drawn under you with no launch
  function activeBridge(ps){ const q = segs[Math.floor(ps)], qp = q && q.spjP; if(qp && qp.kind === 'bridge' && segs[qp.b0] && segs[qp.b0].spjP === qp) return qp; for(const p of plans) if(p.kind === 'bridge' && ps > p.b0 - 260 && ps < p.b0 + TOT + 20 && segs[p.b0] && segs[p.b0].spjP === p) return p; return null; }
  const leafLen = r => NL + G / 2 * (1 - r);

  // landing: sparks (powder on snow, embers over lava), a boost; land straight and centred on the target for a clean landing bonus
  let cardT = 0, cardTh = null, cleans = 0, cleanT = 0;
  // the shared landing hit: thump, shake, sparks (used by launch() jumps; landmark jumps add their bonus on top)
  function thump(cols){ shake = reduce ? 0 : 11; M.noise(.5, 160, .22); M.tone(55, .45, { v:.12 }); cols = cols || ['#fff0c4', '#ffd04a', '#ff9a2a'];
    const n = reduce ? 10 : 46; for(let k = 0; k < n; k++){ const sd = k % 2 ? 1 : -1; sparks.push({ x:W / 2 + sd * rr(4, W * .08), y:H - 12, vx:sd * rr(60, 460), vy:rr(-420, -60), life:rr(.35, .9), c:cols[k % 3] }); } }
  /* Reusable jump helper (see the header and setpiece/README.md): MECH.sp_jump.launch({ fromSeg, landSeg, peakH, startH, landH, slowmo, onLand })
     Starts a flight now. fromSeg/landSeg are segment indices along the road (fromSeg defaults to the bike's segment); the arc runs by distance
     from fromSeg to landSeg, rising from startH to landH (world units above the road, default 0) plus a parabola of peakH at the middle.
     It handles AIR.h, the camera rise (with restore), the gentle roll, the slow-mo dip (slowmo, default true), traffic immunity, and the
     landing thump/shake/sparks; onLand() is called on touchdown. Returns false if a jump is already running. */
  J.launch = (o = {}) => { if(air || ride) return false; const ps = (position + PZ) / SEG, lip = o.fromSeg == null ? ps : o.fromSeg;
    air = { p:null, lip, len:Math.max(4, (o.landSeg == null ? lip + 30 : o.landSeg) - lip), h0:o.startH || 0, h1:o.landH || 0, pk:o.peakH == null ? 1600 : o.peakH, slowmo:o.slowmo !== false, onLand:o.onLand };
    tiltSgn = -tiltSgn; M.noise(.6, 500, .08); return true; };
  J.flying = () => !!air;
  /* the landing hit, shared with mech/skill.js (kickers, crest hops): stop = seconds of hit-stop (the world nearly holds while the sparks
     fly: Vlambeer's "sleep"), squash = px the bike sinks into its forks before it springs back (a damped spring, ~.25 s) */
  J.impact = (o = {}) => { if(ATT() || state !== 'play') return; hold = Math.max(hold, o.stop || 0); const a = (o.squash || 0) * (reduce ? .5 : 1); if(a > 0){ sqA = Math.max(a, sqT >= 0 && sqT < .1 ? sqA : 0); sqT = 0; } };
  /* for other set pieces: the first segment after a landmark jump's window (approach, flight, landing and a settle), or i itself when
     segment i is not in one. Valid at placement for segments up to 160 ahead of the one being placed (jump.js places first). */
  J.clearAfter = i => { const s = segs[i], p = s && s.spjP; return p && p.kind === 'bridge' ? Math.max(i, p.b0 + TOT + 60) : i; };
  function landFX(th, a){ jumps++; shake = reduce ? 0 : 11; M.noise(.5, 160, .22); M.tone(55, .45, { v:.12 }); M.noise(.25, th.id === 'snow' ? 900 : 2600, .06);
    // level: not steering and the lean settled, now or within the last .12 s (the kicker's landing buffer: judged on intent, not one frame)
    const steering = keys.left || keys.right || touchSteer || padSteer, gen = window.ASSIST && ASSIST.jumps, dx = Math.abs(playerX - (XL + SPLIT) / 2),
      lvl = gen || (!steering && Math.abs(leanV) < .13) || (a && a.ok !== undefined && a.t - a.ok <= .12), clean = lvl && dx < (gen ? .6 : .3), perfect = lvl && dx < (gen ? .3 : PERF_X);   // assists: generous landings
    const big = a && a.big, bs = Math.min(W * .2, H * .27);
    J.impact({ stop:perfect ? .083 : clean ? .066 : .05, squash:bs * (perfect || big ? .04 : .03) });   // 5 / 4 / 3 frames of hit-stop, then the shake
    if(perfect || big) M.tone(41, .6, { v:.11 });   // the sub under a big touchdown
    if(perfect && !reduce) for(let k = 0; k < 28; k++){ const ang = Math.PI * (k / 27), v = rr(380, 560); sparks.push({ x:W / 2, y:H - 14, vx:Math.cos(ang) * v, vy:-Math.sin(ang) * v * .55, life:rr(.4, .6), c:k % 3 ? th.edge : '#ffffff' }); }   // a fan of sparks from the tyres: the touchdown zone hit
    const cols = th.id === 'snow' ? ['#ffffff', '#d8ecff', '#a8c8f0'] : th.id === 'sakurajima' ? ['#ffd04a', '#ff7a1a', '#ff3a10'] : ['#fff0c4', '#ffd04a', '#ff9a2a'];
    const n = reduce ? 10 : th.id === 'snow' ? 90 : 46; for(let k = 0; k < n; k++){ const sd = k % 2 ? 1 : -1; sparks.push({ x:W / 2 + sd * rr(4, W * .08), y:H - 12, vx:sd * rr(60, 460), vy:rr(-420, -60), life:rr(.35, .9), c:cols[k % 3] }); }
    const tierL = clean ? 3 : 2; boostTier = tierL; boostT = Math.max(boostT, perfect ? 2.9 : clean ? 2.3 : 1.7); speed = Math.max(speed, MAXS * (perfect ? 1.3 : clean ? 1.25 : 1.15)); M.boost(tierL, flow);
    flow += perfect ? 3 : clean ? 2 : 1; bestFlow = Math.max(bestFlow, flow); if(copT > 0) copT = Math.max(.01, copT - 3);
    if(!(MECH.arrival && MECH.arrival.callout && MECH.arrival.callout(th.name + '!', { kanji:th.kj, col:th.edge, size:'m' }))) floatText(th.name + '!', W / 2, H * .36, 40, th.edge);
    if(clean){ cleans++; cleanT = .22; cleanP = perfect; /* CLEAN / PERFECT LANDING a beat after the name, on game time */ }
    if(perfect){ perfects++; if(MECH.style && MECH.style.act) MECH.style.act('style', big ? 600 : 400); }
    else if(big && MECH.style && MECH.style.act) MECH.style.act('bigair', 300);
    hud(); }
  let cleanP = false;
  J.drawScreen = now => { if(cardT <= 0 || !cardTh) return; const c = SP['card' + cardTh.id]; if(!c) return; const k = PX * Math.max(1, Math.round(W / 1400)), a = Math.min(1, cardT * 2.5, (2.8 - cardT) * 6);
    const slide = reduce ? 0 : Math.round((1 - Math.min(1, (2.8 - cardT) * 5)) * W * .3 / PX) * PX; cx.globalAlpha = clamp(a, 0, 1); blit(c, W / 2 + slide, H * .2 + c.height * k / 2, k); cx.globalAlpha = 1; };

  // the title's attract ride (core attractLoop) flies the jump too, quietly: no bells, card, slow-mo, look-down pitch, roll or landing hit
  const ATT = () => state === 'ready' && typeof attractRun !== 'undefined' && attractRun && !reduce;
  function updateBridge(dt, ps){
    const p = activeBridge(ps); if(!p) return; const att = ATT();
    const d = p.b0 - ps, bE = p.b0 + TOT;
    p.r = p.th.bridge ? clamp((200 - d) / 140, 0, 1) : 1;
    if(p.th.bridge && d > 80) p.open = !BYPASS || speed >= MAXS * OPEN_SPEED;   // (no detour: the bridge stays open for everyone)
    // bells: kan-kan-kan (the crossing bell of the boom gates), louder as you close in; every jump's gates ring, a drawbridge's from farther out
    if(!att && d > -4 && d < (p.th.bridge ? 240 : 150)){ bellT -= dt; if(bellT <= 0){ bellT = .36; const v = .035 * clamp(1 - d / 240, .15, 1); M.tone(bellT > 0 && (Math.floor(ps) % 2) ? 760 : 700, .3, { type:'square', v:v * .45 }); M.tone(2280, .12, { type:'triangle', v:v * .35 }); } }
    // traffic merges out of the jump lanes well ahead, and nothing rides into the gap
    // traffic is held at the gates while the bridge is up (removed far ahead, out of sight); cars already near you put their foot down
    // and clear the bridge first. Nothing can pin you in the narrow bypass lane, and nothing rides into the gap.
    const deckSide = p.side ? p.side === 'deck' : playerX < SPLIT;
    cars = cars.filter(c => { const cs = c.z / SEG, zr = c.z - (position + PZ); if(cs < p.b0 - 150 || cs > bE + 4 || zr < -200) return true; if(zr > 4000) return false;
      if(c.x < SPLIT + .05){ if(deckSide || cs > p.b0 - 38){ c.x = Math.min(.66, c.x + dt * 1.3); c.speed = Math.max(c.speed, MAXS * 1.45); }   // you're on the deck side: it merges out of your way and clears off
        else { c.speed = Math.max(0, c.speed - MAXS * 1.2 * dt); if(c.z > (p.b0 - 40) * SEG) c.z = (p.b0 - 40) * SEG; c.spjHeld = true; } }   // you're in the bypass: it waits at the gate
      else c.speed = Math.max(c.speed, MAXS * 1.45);
      return true; });
    const bw = bikeHalf();
    // gate down: a diagonal line of drums funnels you into the bypass
    if(!p.open && d <= 75 && d >= 30){ const xmin = lerp(-1.2, SPLIT + .06 + bw, clamp((75 - d) / 43, 0, 1)); if(playerX < xmin){ playerX = xmin; scrape(-1); } }
    // which way you go is decided 40 segments out, and the jump is the default: anyone not hugging the far right (the right-hand lane included)
    // takes the jump and is eased smoothly into the jump lanes; only a rider holding the far edge, or one the closed drawbridge funnels
    // there, takes the bypass. (It used to be decided 30 out at x < SPLIT, so a rider in the right-hand lane was locked into the bypass,
    // on Night Tunnels while still inside the bore: "the player doesn't go on the jump and just keeps driving on the road".)
    if((d <= 40 || ps >= p.b0) && p.side === undefined) p.side = !BYPASS || (p.open && playerX < SPLIT + .45) ? 'deck' : 'by';
    if(p.side === 'by' && playerX < SPLIT - .05 && ps >= p.b0 - 30 && ps < p.b0 + NL) p.side = 'deck';   // never leave a rider in the jump lanes without the jump
    if(p.side === undefined || ps > bE + 6) return;
    if(p.side === 'by'){ if(playerX < SPLIT + .06 + bw){ playerX = SPLIT + .06 + bw; scrape(-1); } return; }
    if(playerX > SPLIT - .02 - bw){ if(ps < p.b0 && !air) playerX = Math.max(SPLIT - .02 - bw, playerX - 1.8 * dt); else { playerX = SPLIT - .02 - bw; if(!air) scrape(1); } }   // eased in on the approach, held on the leaf
    if(playerX < XL + bw){ playerX = XL + bw; }   // in the air too: you steer to line up, always over the landing ramp
    const lip = p.b0 + NL, len = G + LAND;
    // no falling through: anyone in the jump lanes past the lip who lost a flight gets one (the arc is by distance, so it still lands). Only
    // after a first launch (p.jumped): the first is the launch below, which carries the whoosh (this line used to beat it to every launch)
    if(p.jumped && !air && !ride && ps >= lip && ps < lip + len - 1 && !p.landed){ p.jumped = true; air = { p, lip, len, h0:HT, h1:HT * (1 - LAND / NL), pk:PK, slowmo:p.dress !== false && !att, att }; tiltSgn = -tiltSgn; cardT = att ? 0 : 2.8;   /* the card on every jump (Kellan: always show the event cards); the apex slow-mo stays on dressed visits */ cardTh = p.th; if(cardT && ((MECH.cutin && MECH.cutin.show('jump:' + p.th.id)) || (MECH.arrival && MECH.arrival.callout && MECH.arrival.callout(p.th.name, { kanji:p.th.card, sub:'LANDMARK JUMP', col:p.th.edge, size:'m', hold:.8 })))) cardT = 0; }
    if(!air && !ride && !p.jumped){
      if(ps >= p.b0 && ps < lip){ jh = HT * p.r * (ps - p.b0) / leafLen(p.r); pitch = .3; speed = Math.max(speed, MAXS * .75);
        if(!att){ const v = (ps - p.b0) / NL, sg = Math.floor(ps);
          if(!p.wound){ p.wound = true; const dur = (lip - ps) * SEG / Math.max(speed, 1); M.noise(dur + .1, 70, .1); M.noise(dur, 190, .035);   // the deck's rumble under the tyres
            if(M.ac && M.cur && M.ladder){ const L = M.ladder(), t0 = M.ac.currentTime; for(let k = 0; k < 4; k++) M.tone(midi(L[3 + k]), .16, { type:'triangle', v:.022 + k * .006, at:t0 + dur * k / 4 }); } }   // an on-key riser up the ramp: the music lifts with you
          if(sg !== tickSeg && sg % 4 === 0){ tickSeg = sg; M.noise(.04, 320 + 240 * v, .05); }   // deck-joint ticks, in step with the amber bars rushing at you
          if(!reduce) shake = Math.max(shake, .6 + 1.6 * v); } }
      else if(ps >= lip){ p.jumped = true; const big = !att && state === 'play' && jumps === 1 && !bigs; if(big) bigs++;   // jo-ha-kyu: the first jump of a ride sets the bar, the second is the BIG AIR
        air = { p, lip, len, h0:HT, h1:HT * (1 - LAND / NL), pk:big ? BIG_PK : PK, slowmo:big || (p.dress !== false && !att), att, big };
        if(!att && !reduce){ shake = Math.max(shake, 3); for(let k = 0; k < 12; k++){ const sd = k % 2 ? 1 : -1; sparks.push({ x:W / 2 + sd * rr(2, W * .03), y:H - 10, vx:sd * rr(40, 200), vy:rr(-120, 40), life:rr(.2, .4), c:k % 3 ? '#ffd04a' : '#fff0c4' }); } }   /* the rear tyre bites the lip */ tiltSgn = -tiltSgn; cardT = att ? 0 : 2.8;   /* the card on every jump (Kellan: always show the event cards); the apex slow-mo stays on dressed visits */ cardTh = p.th; if(cardT && ((MECH.cutin && MECH.cutin.show('jump:' + p.th.id)) || (MECH.arrival && MECH.arrival.callout && MECH.arrival.callout(p.th.name, { kanji:p.th.card, sub:'LANDMARK JUMP', col:p.th.edge, size:'m', hold:.8 })))) cardT = 0; if(!att){ M.noise(.6, 500, .08); M.tone(220, .5, { type:'triangle', v:.04 }); } }   // the launch whoosh and tone, once a launch; none behind the title
    }
  }
  function updateAir(dt, ps){
    if(air){ const u = clamp((ps - air.lip) / air.len, 0, 1); air.t = (air.t || 0) + dt;
      if(!(keys.left || keys.right || touchSteer || padSteer) && Math.abs(leanV) < .13) air.ok = air.t;   // last moment the rider was level (the landing buffer)
      jh = lerp(air.h0, air.h1, u) + 4 * air.pk * u * (1 - u); pitch = .5 * (1 - u * 1.6);
      speed = Math.max(speed, MAXS * .8);
      const hang = air.big ? BIG_HANG : .25, ts = !air.slowmo ? 1 : reduce ? 1 - .12 * Math.sin(Math.PI * u) : 1 - hang * Math.pow(Math.sin(Math.PI * u), 2);   // a light hang over the top (was to .42 of speed: it stalled the ride; quiet.md)
      const lipB = air.p && !air.att && air.t < LIP_T ? (reduce ? .3 : LIP_K) * (1 - air.t / LIP_T) : 0, back = Math.max(1 - ts, lipB);   // the lip: a beat of hang as the deck drops away
      position -= speed * dt * back; for(const c of cars) c.z -= c.speed * dt * back; if(state === 'play') sunLeft = Math.min(SUN_MAX, sunLeft + dt * back);
      if(u >= 1){ const lp = air.p, cb = air.onLand; if(lp){ ride = { p:lp }; lp.landed = true; const q = air.att, a0 = air; air = null; if(!q) landFX(lp.th, a0); } else { air = null; jh = 0; thump(); if(cb) try{ cb(); }catch(e){ console.error(e); } } } }
    else if(ride){ const bE = ride.p.b0 + TOT; if(ps >= bE){ ride = null; jh = 0; } else jh = HT * (bE - ps) / NL; pitch = 0; }
  }
  // ---------------------------------------------------------------- jets: every one comes from behind, swoops over and climbs away
  // A jet is a real object on a straight, descending final approach that runs the same way as the road. It starts ~24000 units behind
  // the camera, overtakes low over the rider (the belly fills the top of the screen), then climbs away (see the climb-out below). Its path is a line in the camera's frame of travel (x and altitude as
  // functions of zr), so the swoop plays the same at any speed; it always gains on the bike (rel >= 6000 units/s). alt is road units
  // above the road (4300+ near the camera, so it clears every gantry and mast), x is from the road centre.
  const JV = [
    { x0:1300, kx:.1, a0:4300, ka:.042, roll:0 },         // the low swoop: right over the rider, drifting toward the runway
    { x0:-2600, kx:.16, a0:5400, ka:.05, roll:-.05 },     // in from over the bay (behind-left), across the road ahead toward the runway
    { x0:600, kx:.11, a0:4500, ka:.045, roll:0 },         // the low swoop again, a touch left
    { x0:3900, kx:.07, a0:5000, ka:.05, roll:.16 } ];     // in from behind-right, banked, rolling level as it lines up
  const JZ0 = -24000;
  // The climb-out. Once its belly has passed over the rider the jet goes around and climbs away like a Haneda departure (Boeing FCTM
  // practice: rotate toward ~15 deg nose-up, gear up at a positive rate of climb, V2 + 10..25 kt): the flight path eases from the
  // shallow descent to GAM (tan ~9 deg, true units) while the attitude settles at path + AOA1 (~15 deg); the gear folds up from 0.8 s;
  // seen from the chasing bike the climb is laid out against the distance it gains on us (slope GR, ~20 deg), so it holds its height
  // in the sky above the horizon while it shrinks, instead of sinking back toward the road as a real one pulling away would;
  // it accelerates away (exaggerated, so it dwindles in seconds), sinks into the haze and fades out by TCO. Then it is gone: it never
  // rides on toward the road ahead. JL is the haze it climbs into (fog step), JFADE when the fade starts.
  const ZC = 1500, GAM = .16, GR = .36, AOA0 = .07, AOA1 = .12, TCO = 4.6, JFADE = 2.3, JL = .8, JMARGIN = 60, JK = 1.5;
  const jsm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  // how fast it gains on the bike: quickly from far behind (the roar rising), 6000+ units/s through the pass, then pulling away in the climb
  const jetRel = (zr, c, sp) => Math.max(6000, Math.max(17000, sp + 7000) - sp) + .5 * Math.max(0, -zr - 9000) + (c ? 1800 * c.t + 500 * c.t * c.t : 0);
  function jetPath(j){ const V = JV[j.type] || JV[0], zr = j.zr, rel = j.rel || 7000, vz = speed + rel, c = j.c, roll = V.roll * clamp(1 - (zr - JZ0) / 60000, 0, 1);
    if(c) return { x:V.x0 + V.kx * zr, z:position + zr, alt:c.a0 + c.climb, vx:V.kx * rel, vz, vy:c.g * vz * W / H, roll, ge:c.ge, aoa:lerp(AOA0, AOA1, jsm(c.t / 1.4)), fa:c.fa, haze:JL * jsm((c.t - .8) / 3.2) };
    const a = V.a0 - V.ka * zr;
    return { x:V.x0 + V.kx * zr, z:position + zr, alt:clamp(a, 300, 9000), vx:V.kx * rel, vz, vy:a > 300 ? -V.ka * rel : 0, roll, ge:1, aoa:AOA0, fa:1, haze:0 }; }
  function jetClimb(j){ const V = JV[j.type] || JV[0], vz = speed + j.rel; j.c = { t:0, a0:clamp(V.a0 - V.ka * j.zr, 300, 9000), climb:0, g:j.zr > -9000 ? -V.ka * j.rel * H / W / vz : 0, ge:1, fa:1, k:1 }; }
  // a swoop's whole life in segments the bike rides at top speed: the catch-up from JZ0 to the climb, then the climb-out (TCO), which
  // updateJet may play up to JK times quicker to finish JMARGIN short of the next barrier (so a slot needs room for that much)
  let LIFE_N = 0;
  function jetLife(){ if(LIFE_N) return LIFE_N; let zr = JZ0, t = 0; while(zr < ZC && t < 30){ zr += jetRel(zr, null, MAXS) / 60; t += 1 / 60; } return LIFE_N = Math.ceil((t + TCO / JK) * MAXS / SEG); }
  // segments from p to the first place a jet must be gone by, looking no farther than lim: the road's border, a fork's split window
  // (inForkWindow, the core's own rule), a tunnel or another road's segment (when they are built). Haneda is never a tunnel road.
  function jetBar(p, lim){ p = Math.floor(p); let b = lim; const z = zoneOfSeg(p), g = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : gates[gates.length - 1]; if(g !== undefined) b = Math.min(b, g - p);   // (a border not laid yet lies past the last laid gate)
    if(b > 0 && window.inForkWindow && inForkWindow(p, p + b)){ let lo = 0, hi = b; if(inForkWindow(p, p)) return 0; while(hi - lo > 1){ const m = (lo + hi) >> 1; if(inForkWindow(p, p + m)) hi = m; else lo = m; } b = hi; }
    const s0 = segs[p], land = s0 ? s0.land : -1; for(let k = 0; k < b; k += 2){ const q = segs[p + k]; if(!q) break; if(q.tunnel || q.land !== land){ b = k; break; } }
    return Math.max(0, b); }
  // placement and spawn: the whole swoop at top speed, plus a margin, must fit before the first barrier
  const jetFits = i => jetBar(i, jetLife() + JMARGIN + 1) > jetLife() + JMARGIN;
  function updateJet(dt){
    const si = Math.floor((position + PZ) / SEG);
    if(lastSi < 0 || si < lastSi || si - lastSi > 400) lastSi = si - 1;
    for(let i = lastSi + 1; i <= si; i++){ const q = segs[i]; if(q && q.spjJet && !q.spjJet.done && !jet){ q.spjJet.done = true; if(jetFits(i)){ jet = { type:q.spjJet.type, t:0, zr:JZ0, rel:7000, c:null }; jets++; } } }
    lastSi = si;
    if(!jet) return; jet.t += dt; let c = jet.c;
    // a barrier closer than the rest of the swoop needs (a boost, a test placement): pull up now and hurry the climb-out, so it has faded
    // before the bike gets there (never quicker than ~0.8 s: no pop)
    { const sp = Math.max(speed, MAXS * .3) / SEG, r0 = jetRel(0, null, speed), z9 = Math.max(0, -jet.zr - 9000);
      const pre = c ? 0 : Math.log(1 + .5 * z9 / r0) / .5 + (ZC - Math.max(jet.zr, -9000)) / r0, left = c ? TCO - c.t : pre + TCO / JK, need = left * sp, room = jetBar(si, Math.ceil(need) + JMARGIN + 10) - JMARGIN;
      if(need > room){ if(!c){ jetClimb(jet); c = jet.c; } c.k = Math.max(c.k, room > 0 ? Math.min(6, (TCO - c.t) * sp / room) : 6); } }
    jet.rel = jetRel(jet.zr, c, speed); jet.zr += jet.rel * dt;
    if(!c && jet.zr > ZC){ jetClimb(jet); c = jet.c; }
    if(c){ const k = c.k, d2 = dt * k; c.t += d2; c.g += (GAM - c.g) * (1 - Math.exp(-d2 / .7)); c.climb += c.g / GAM * GR * jet.rel * W / H * d2;
      c.ge = 1 - jsm((c.t - .8) / 2.2); c.fa = 1 - jsm((c.t - JFADE) / (TCO - JFADE)); if(c.t >= TCO){ jet = null; return; } }
    const J2 = jetPath(jet), zr = jet.zr, xr = J2.x - playerX * ROADW, ar = J2.alt - CAMH; jet.cur = { zr, xr, ar, J:J2 };
    if(jet.t > 24){ jet = null; return; }
    // the roar: rising from behind (pitched up while it closes), the fan whine, a body rumble overhead, falling away ahead
    const dist = Math.hypot(zr, xr, ar * 1.8), near = J2.fa / (1 + Math.pow(dist / 15000, 2)), dop = zr < 0 ? 1.1 + .1 * near : .88;
    sndT -= dt; if(sndT <= 0){ sndT = .25; M.noise(.55, (95 + near * 90) * dop, .3 * near + .008); M.noise(.4, 650 * dop, .08 * near);
      if(near > .15) M.tone(1250 * dop, .32, { type:'triangle', v:.007 * near });
      if(near > .45) M.tone(58 + near * 16, .45, { type:'sawtooth', v:.014 * near }); }
    if(!reduce && near > .4) shake = Math.max(shake, 2.2 * near);   // a slight downwash shake; none under reduced motion / no flashing
    if(!jet.wash && zr > -2500){ jet.wash = true; if(!reduce) shake = Math.max(shake, 4); M.noise(1.6, 80, .4); M.noise(1.1, 380, .13); M.tone(62, 1.3, { type:'sawtooth', v:.028 });
 }
  }
  J.update = dt => {
    updateShards(dt);
    for(const f of puffs) f.t += dt; puffs = puffs.filter(f => f.t < .7);
    cardT = Math.max(0, cardT - dt); if(cleanT > 0 && (cleanT -= dt) <= 0 && state === 'play') floatText(cleanP ? 'PERFECT LANDING' : 'CLEAN LANDING', W / 2, H * .46, cleanP ? 30 : 26, cleanP ? '#ffe9a0' : '#ffffff');
    // the landing's hit-stop: the world nearly holds (position and traffic wound back, as the apex hang does) while sparks and the squash play on
    if(hold > 0 && state === 'play'){ const k = Math.min(hold, dt) / dt * .9; hold -= dt; position -= speed * dt * k; for(const c of cars) c.z -= c.speed * dt * k; sunLeft = Math.min(SUN_MAX, sunLeft + dt * k); }
    if(sqSet){ sqSet = false; AIR.h = 0; } if(sqT >= 0 && (sqT += dt) > .3) sqT = -1;
    if(state !== 'play' && !ATT()){ if(state === 'ready'){ camDown(); camSeg = null; air = null; ride = null; jh = 0; ownAir(); pitchOff(); } return; }
    const ps = (position + PZ) / SEG;
    if(!air && !ride) jh = 0;
    camDown();
    updateBridge(dt, ps); updateAir(dt, ps); if(state === 'play') updateJet(dt);   // (no jets behind the title)
    { const p = activeBridge(ps); if(p && !p.smash){ const zg = p.b0 - GZ; if(ps >= zg - .1 && ps < zg + 3 && playerX < SPLIT && playerX > XL - .15 && gateDown(p, ps) > .6) smash(p); } if(p && p.hitT > 0) p.hitT -= dt; }   // through the boom gate
    // the camera rides up with the bike (true perspective: the road drops away below, the horizon stays put). In the air the bike floats a
    // little above the camera's ride height so its shadow and lift still read; it stays in the lower third.
    const u = air ? clamp(((position + PZ) / SEG - air.lip) / air.len, 0, 1) : 0;
    floatW = air ? 300 * Math.sin(Math.PI * u) + 60 : 0;
    // up the ramp the camera crouches under the bike (it lags the deck by up to the flight's opening 60), so the bike rises in frame into
    // the lip and leaves it with no pop (the bike used to jump 23 px in one frame at the launch)
    if(!air && !ride && jh > 0 && !ATT()){ const p = activeBridge(ps), v = p ? clamp((ps - p.b0) / NL, 0, 1) : 0; floatW = 60 * v * v; }
    // camera pitch-down over the gap (core CAM.pitch, px, + = look down): the floor below and its heroes rise into view at the apex,
    // the landing ramp stays in frame. Eased; none under reduced motion; handed back to 0 after landing. Every launch() flight gets it.
    { const tgt = air && !reduce && !air.att ? H * (air.big ? .2 : .15) * Math.pow(Math.sin(Math.PI * u), 1.3) : 0; camPitch += (tgt - camPitch) * (1 - Math.exp(-(tgt > camPitch ? 5 : 7) * dt)); if(!air && camPitch < .5) camPitch = 0;
      if(window.CAM && (camPitch > 0 || pitchOwn)){ CAM.pitch = camPitch; pitchOwn = camPitch > 0; } }
    camUp(segAt(position + PZ), Math.max(0, jh - floatW));
    ownAir();
  };
  // camera lift: the game derives the camera height from the world y of the segment under the bike, read once at the top of draw().
  // We raise that segment between update and draw, then put it back in drawBackdrop (before anything is projected); overlay re-applies
  // it so a frame drawn without an update in between keeps the same camera.
  let camSeg = null, camD = 0, camOn = false, floatW = 0, camPitch = 0, pitchOwn = false;
  const pitchOff = () => { camPitch = 0; if(pitchOwn && window.CAM) CAM.pitch = 0; pitchOwn = false; };
  function camUp(sg, d){ camDown(); if(jh <= 0) d = Math.max(d, camExt); camSeg = d > 0 ? sg : null; camD = d; camApply(); }
  // a kicker hop's camera rise (mech/skill.js), world units: the same lift, applied here so only one module ever moves the camera. A landmark
  // jump wins: while it lifts the bike (jh > 0) the kicker's rise is ignored and camLift returns false (skill.js then lifts the bike alone).
  let camExt = 0;
  J.camLift = d => { camExt = Math.max(0, d || 0); if(jh > 0) return false; camUp(segAt(position + PZ), camExt); return true; };
  function camApply(){ if(camSeg && !camOn){ camSeg.p1.world.y += camD; camSeg.p2.world.y += camD; camOn = true; } }
  function camDown(){ if(camSeg && camOn){ camSeg.p1.world.y -= camD; camSeg.p2.world.y -= camD; camOn = false; } }
  // AIR.h / POSE.pitch are written only while our ramp, flight or ride down the far leaf is active, and handed back as 0 the frame it ends
  // (and on reset). The bridge reserves its segments (skRes) so skill.js never runs a kicker there at the same time.
  let owning = false;
  function ownAir(){ if(jh > 0){ owning = true; AIR.h = floatW * H / 2000; POSE.pitch = clamp(pitch, 0, 1); } else if(owning){ owning = false; AIR.h = 0; POSE.pitch = 0; } }
  J.drawUnderBike = now => { if(jh > 0) ownAir();
    // the landing squash: the bike sinks into its forks and springs back (AIR.h below 0 lowers it; written only while nothing lifts it, and
    // handed back as 0 at the next update)
    if(sqT >= 0 && (AIR.h <= 0 || sqSet)){ const y = sqA * Math.exp(-sqT / .08) * Math.cos(sqT * 34); AIR.h = -Math.round(y); sqSet = true; } };   // (the screen-space look-down band is gone: the floor below is real geometry, revealed by the camera)
  // Looking down into the gap at the top of a landmark jump. The road engine can't pitch its camera, so the frame is lifted by S and the
  // band it uncovers at the bottom is the view straight down: the theme's world below, streaming past, with its hero right under the bike.
  let dbuf = null;
  function lookDown(now){ const u = clamp(((position + PZ) / SEG - air.lip) / air.len, 0, 1), S = Math.round(H * (reduce ? .14 : .26) * Math.pow(Math.sin(Math.PI * u), .8) / PX) * PX; if(S < PX * 2) return;
    if(!dbuf) dbuf = document.createElement('canvas'); if(dbuf.width !== cv.width || dbuf.height !== cv.height){ dbuf.width = cv.width; dbuf.height = cv.height; }
    const b = dbuf.getContext('2d'); b.clearRect(0, 0, dbuf.width, dbuf.height); b.drawImage(cv, 0, 0);
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false; cx.drawImage(dbuf, 0, -S / PX); cx.restore();
    cx.save(); cx.beginPath(); cx.rect(0, H - S, W, S); cx.clip(); drawDown(air.p.th, now, H - S, S, u); cx.restore();
    const fogc = { water:'#0a1020', lava:'#3a0c04', gorge:'#1a2430', taxi:'#181a22', jct:'#101016', snow:'#7a8ab0', rail:'#0a1420', pipe:'#140c0a' }[air.p.th.below] || '#0a0c14', y0 = H - S;
    cx.fillStyle = fogc; for(let r = 0; r < 6; r++){ const y = y0 - (r + 1) * PX, step = r + 2; for(let x = (r % 2) * PX; x < W; x += PX * step) cx.fillRect(x, y, PX, PX); }   // a dithered fog edge thinning upward
    cx.fillStyle = mixc(fogc, '#7a8aa0', .25); for(let x = 0; x < W; x += PX * 2) cx.fillRect(x + (Math.floor(now / 160) % 2) * PX, y0, PX, PX); }
  function drawDown(T, now, y0, S, u){ const t = now / 1000, q = v => Math.round(v / PX) * PX, sp = reduce ? .25 : 1, rows = (n, f) => { for(let k = 0; k < n; k++) f(k); };
    const bands = (cols) => cols.forEach((c, k) => { cx.fillStyle = c; cx.fillRect(0, q(y0 + S * k / cols.length), W, q(S / cols.length) + PX); });
    const stream = (n, cols, wd, len, speed) => rows(n, k => { const x = q(hash(k * 7.3) * W), ph = (t * speed * sp + hash(k * 3.1)) % 1, y = q(y0 - len + ph * (S + len)); cx.fillStyle = cols[k % cols.length]; cx.fillRect(x, y, q(wd * (.6 + hash(k) * .8)) || PX, q(len)); });
    switch(T.below){
      case 'water': bands(['#060a16', '#0a1020', '#0c1428']); stream(26, ['#ff9a3a', '#ff4a8a', '#ffd890', '#4ad0ff', '#b06bff'], PX * 2, S * .18, 1.6); return;   // the city's reflections streaking past below
      case 'lava': bands(['#2a0804', '#3a0c04', '#4a1206']); stream(22, ['#ff7a1a', '#ffd04a', '#c83a0a'], PX * 3, S * .22, 1.1);
        glow(W / 2, H, W * .45, '#ff4a10', .35); if(!reduce) rows(14, k => { cx.fillStyle = 'rgba(255,170,90,.3)'; cx.fillRect(q(hash(k * 5.1) * W + Math.sin(t * 3 + k) * PX * 2), q(H - ((t * .7 + hash(k)) % 1) * S), PX, PX * 3); }); return;
      case 'gorge': bands(['#0a1216', '#070c10', '#05080a', '#040608']);
        rows(3, k => { cx.fillStyle = `rgba(90,110,130,${.16 - k * .04})`; cx.fillRect(0, q(y0 + S * (.15 + k * .25)), W, q(S * .1)); });   // fog shelves dropping away
        rows(18, k => { const d = (k % 3) / 3, sz = q(S * (.16 - d * .09)) || PX, x = q(hash(k * 4.3) * W), y = q(y0 + S * (.35 + d * .5) + ((t * .5 * sp + hash(k)) % 1) * S * .2); cx.fillStyle = d > .5 ? '#0e1a14' : '#16281c';
          cx.beginPath(); cx.moveTo(x, y - sz * 2); cx.lineTo(x + sz * .7, y); cx.lineTo(x - sz * .7, y); cx.closePath(); cx.fill(); cx.fillStyle = '#3e5a48'; cx.fillRect(x - PX / 2, y - sz * 2, PX, PX); });
        { const yy = q(y0 + S * .62), xx = q(((t * .18 * sp) % 1.4 - .2) * W); cx.fillStyle = '#22222c'; cx.fillRect(0, yy - PX, W, PX * 3); star(xx, yy, PX, '#fff4d0', .55); cx.fillStyle = 'rgba(255,240,200,.2)'; cx.beginPath(); cx.moveTo(xx, yy); cx.lineTo(xx + W * .12, yy - PX * 3); cx.lineTo(xx + W * .12, yy + PX * 3); cx.closePath(); cx.fill(); star(q(W - xx * .7), yy + PX, PX, '#ff5a4a', .4); }   // the car on the hairpin far below
        return;
      case 'taxi': { bands(['#14161d', '#181a22', '#1a1c26']); const yc = q(y0 + S * .55); cx.fillStyle = '#d8b020'; cx.fillRect(0, yc, W, PX * 2);
        rows(12, k => { const x = q(((k / 12 + t * .25 * sp) % 1) * W); star(x, yc + PX, PX, '#3aff7a', .3); }); rows(16, k => { const x = q(((k / 16 - t * .25 * sp) % 1 + 1) % 1 * W); cx.fillStyle = '#3a6aff'; cx.fillRect(x, q(y0 + S * .12), PX * 2, PX * 2); cx.fillRect(x, q(y0 + S * .95), PX * 2, PX * 2); });
        const w = W * .6, k = Math.max(PX, Math.round(w / 128 / PX) * PX), x = q(W * (.75 - ((t / 7 * sp) % 1) * .5)), y = q(y0 + S * .92);   // the jumbo right under you: windows lit, beacon turning
        const span = Math.min(W * .55, S * 1.1), need = span / PX; let l = LODR.length - 1; for(let q2 = 0; q2 < LODR.length; q2++) if(64 / LODR[q2] * 1.5 >= need){ l = q2; break; }
        const spr = jetTop(l), dw = spr.width * LODR[l] * span / 64, yb = q(y0 + S * .55), mpx = span / 64;   // seen from above: the roof, the wings and four engines, the tail
        glow(x, yb, span * .45, '#ffd890', .1); cx.drawImage(spr, Math.round(x - dw / 2), Math.round(yb - dw / 2), Math.round(dw), Math.round(dw));
        if(reduce || t % 1.2 < .2){ glow(x - 2 * mpx, yb, mpx * 6, '#ff2a2a', .7); cx.fillStyle = '#ff4a3a'; cx.fillRect(Math.round(x - 2 * mpx - PX), Math.round(yb - PX), PX * 2, PX * 2); }   // the top beacon
        star(x - 9.6 * mpx, yb - 32 * mpx, PX, '#ff3a3a', .4); star(x - 9.6 * mpx, yb + 32 * mpx, PX, '#3aff6a', .4); star(x + 33 * mpx, yb, PX * 1.5, '#fff4dc', .5); return; }
      case 'jct': { bands(['#0c0c12', '#101016', '#121218']); rows(2, r => { const yy = q(y0 + S * (.3 + r * .4)), dir = r ? -1 : 1; cx.fillStyle = '#2c2c38'; cx.fillRect(0, yy, W, q(S * .16)); cx.fillStyle = '#c8b070'; cx.fillRect(0, yy + q(S * .08), W, PX);
          rows(10, k => { const x = q((((k / 10) + t * .5 * dir * sp) % 1 + 1) % 1 * W); star(x, yy + q(S * (r ? .05 : .11)), PX, dir > 0 ? '#fff4d0' : '#ff3a3a', .4); }); }); return; }
      case 'snow': bands(['#6a7aa0', '#7a8ab0', '#8494b8']); stream(30, ['#e8f0ff', '#ffffff', '#c8d8f0'], PX * 2, S * .12, 1.3); return;
      case 'rail': { bands(['#081018', '#0a1420', '#0c1826']); stream(8, ['#c8c0a0'], PX * 2, S * .1, .8); const yt = q(y0 + S * .5); cx.fillStyle = '#3a3430'; cx.fillRect(0, yt - q(S * .14), W, q(S * .36)); cx.fillStyle = '#9a9aa8'; cx.fillRect(0, yt - q(S * .1), W, PX); cx.fillRect(0, yt + q(S * .16), W, PX);
        const len = W * 1.6, x0 = q(-len * .3 + Math.sin(t * .5 * sp) * W * .25), hh = q(S * .34);   // the night train right under you, every carriage lit
        cx.fillStyle = '#1a1e2c'; cx.fillRect(x0, yt - hh / 2, len, hh); cx.fillStyle = '#4a5068'; cx.fillRect(x0, yt - hh / 2, len, PX);
        for(let x = x0 + PX * 2; x < x0 + len - PX * 2; x += PX * 4) if(((x - x0) / (len / 6)) % 1 > .06){ cx.fillStyle = '#ffd890'; cx.fillRect(x, yt - hh / 4, PX * 3, q(hh / 2)); }
        glow(x0 + len / 2, yt, len * .3, '#ffd890', .14); star(x0 + len, yt, PX * 2, '#fff4d0', .6); return; }
      case 'pipe': { bands(['#100a08', '#140c0a', '#180e0b']); rows(4, k => { const yy = q(y0 + S * (.15 + k * .22) + ((t * .4 * sp) % 1) * S * .22); cx.fillStyle = '#4a4a54'; cx.fillRect(0, yy, W, q(S * .08)); cx.fillStyle = '#9a9aa8'; cx.fillRect(0, yy, W, PX); });
        const fl = reduce ? 1 : .8 + .2 * Math.sin(t * 9); glow(W * .5, y0 + S * .6, W * .35 * fl, '#ff7a1a', .3); star(W * .5, y0 + S * .6, PX * 2, '#ffd04a', .6); return; }
    } }
  J.hitCar = c => !!air || jh > 60;
  J._proj = (a, b, c) => proj(a, b, c); J._draw = () => drawJet(0); J._items = () => depthItems.map(i => [Math.round(i.z), !!i.done]);
  J._setJumps = n => { jumps = n; bigs = 0; };   // test hook: the next landmark jump is the ride's BIG AIR when n = 1
  J._plans = () => plans; J._active = ps => activeBridge(ps);
  J._dbg = () => ({ jet:jet && { t:+jet.t.toFixed(2), type:jet.type, zr:Math.round(jet.zr), alt:jet.cur ? Math.round(jet.cur.J.alt) : 0, c:jet.c && { t:+jet.c.t.toFixed(2), g:+jet.c.g.toFixed(3), ge:+jet.c.ge.toFixed(2), fa:+jet.c.fa.toFixed(2), k:+jet.c.k.toFixed(2) } }, lastSi, jh:Math.round(jh), r3:rStats });   // test hook
  J._shards = () => CHK.filter(c => c.on).map(c => [c.kind, Math.round(c.zw / SEG), Math.round(c.hE), Math.round(c.ax * 10) / 10]);   // test hook
  J._jetLife = () => jetLife(); J._jetFits = i => jetFits(i); J._jetBar = (p, lim) => jetBar(p, lim);   // test hooks: the placement rule
  J._jetAt = (type, zr) => { jet = { type, t:6, zr, rel:7000, wash:zr > -2500, c:null }; jets = Math.max(jets, 2); };   // test hook: put a jet on its path
  // test hook: draw the model alone, centred at true camera offsets (X, Y, Z) with yaw / pitch / roll (radians), for the contact sheet
  J._pose3d = (X, Y, Z, yaw, pitch, roll, fog) => { const J2 = { x:X + playerX * ROADW, z:Z + position, alt:Y * W / H + CAMH, vx:Math.sin(yaw), vz:Math.cos(yaw), vy:Math.tan(pitch - .07) * Math.hypot(Math.sin(yaw), Math.cos(yaw)) * W / H, roll };
    const P = jetPose(J2); P.sx = P.sy = 0; return render3d(P, false, fog || 0); };
  J.finish = rec => { if(jumps) rec.landmarkJumps = jumps; if(cleans) rec.cleanLandings = cleans; if(jets) rec.jets = jets; };
  J.art = () => ({ SIDE1, SIDE2, SIDE_PAL, BELLY, jetSpr, jetTop, frontSprite, ANG, LODR });   // the 747 art, shared (setpiece/jetwash.js, ui/cutin.js); jetSpr/jetTop build lazily, so call them in warm()

  // ---------------------------------------------------------------- drawing: bridge geometry
  function P(s, f, X, h){ const a = s.p1.screen, b = s.p2.screen, sc = a.scale + (b.scale - a.scale) * f;
    return [a.x + (b.x - a.x) * f + X * (a.w + (b.w - a.w) * f), a.y + (b.y - a.y) * f - sc * h * H / 2]; }
  function quad(p1, p2, p3, p4, col){ cx.fillStyle = col; cx.beginPath(); cx.moveTo(p1[0], p1[1]); cx.lineTo(p2[0], p2[1]); cx.lineTo(p3[0], p3[1]); cx.lineTo(p4[0], p4[1]); cx.closePath(); cx.fill(); }
  // a flat strip (X0..X1) along the segment between fractions f0..f1 at heights h0..h1
  const strip = (s, f0, f1, X0, X1, h0, h1, col) => quad(P(s, f0, X0, h0), P(s, f0, X1, h0), P(s, f1, X1, h1), P(s, f1, X0, h1), col);
  function lamp(x, y, col, r, a, uw){ const z = Math.max(PX, Math.round(uw * .025)); cx.fillStyle = col; cx.fillRect(Math.round(x - z / 2), Math.round(y - z / 2), z, z); if(a > 0) glow(x, y, r, col, a); }

  function drawSlab(s, f0, f1, h0, h1, fog, near, now, p){
    const T = p.th, i = s.index, top0 = P(s, f0, 0, h0)[1], top1 = P(s, f1, 0, h1)[1], seeTop = top1 <= top0;
    const sideCol = fc(T.side[i % 2], fog);
    if(playerX > SPLIT) quad(P(s, f0, SPLIT, h0), P(s, f1, SPLIT, h1), P(s, f1, SPLIT, h1 - TH), P(s, f0, SPLIT, h0 - TH), sideCol);
    if(playerX < XL) quad(P(s, f0, XL, h0), P(s, f1, XL, h1), P(s, f1, XL, h1 - TH), P(s, f0, XL, h0 - TH), sideCol);
    if(seeTop){ strip(s, f0, f1, XL, SPLIT, h0, h1, fc(T.deck[i % 2], fog));
      if(i % 4 === 0){ const fm = lerp(f0, f1, .35), hm = lerp(h0, h1, .35); for(let k = 0; k < 6; k++){ const X0 = XL + (SPLIT - XL) * (k + .15) / 6; strip(s, f0, fm, X0, X0 + (SPLIT - XL) * .7 / 6, h0, hm, fc(T.bar[k % 2], fog)); } }   // amber cross-bars rush at you up the leaf
      strip(s, f0, f1, XL, XL + .06, h0, h1, fc(T.edge, fog * .6)); strip(s, f0, f1, SPLIT - .06, SPLIT, h0, h1, fc(T.edge, fog * .6)); strip(s, f0, f1, XL + .06, XL + .1, h0, h1, fc(T.edge2, fog)); strip(s, f0, f1, SPLIT - .1, SPLIT - .06, h0, h1, fc(T.edge2, fog));
      if(!near && i % 2 === 0) strip(s, f0, f1, (XL + SPLIT) / 2 - .1, (XL + SPLIT) / 2 + .1, h0, h1, fc(i % 4 ? T.edge : '#ffffff', fog * .5));   // the landing target: line up on it
      { const o = i - p.b0, c = (XL + SPLIT) / 2; if(!near && o >= NL + G + LAND - 2 && o <= NL + G + LAND + 1) for(const sd of [-1, 1]) strip(s, f0, f1, c + sd * PERF_X - .03, c + sd * PERF_X + .03, h0, h1, fc(o % 2 ? '#ffffff' : T.edge, fog * .4)); }   // the touchdown zone: land level between these bars for a PERFECT
      if(i % 4 < 2 && near) strip(s, f0, f1, -1 / 3 - .035, -1 / 3 + .035, h0, h1, fc(T.paint, fog));
      strip(s, f0, f1, -.06, -.04, h0, h1, fc(T.under[1], fog));   // a plate seam
      // hazard stripes on the last stretch of a near leaf tip
      if(near && p.tipF !== undefined){ const g0 = Math.max(f0, p.tipF - 1.1); if(f1 > g0){ const hh = t => lerp(h0, h1, (t - f0) / Math.max(.001, f1 - f0)); for(let k = 0; k < 9; k++){ const X0 = XL + (SPLIT - XL) * k / 9; strip(s, g0, f1, X0, X0 + (SPLIT - XL) / 9, hh(g0), hh(f1), fc(HAZ[k % 2], fog)); } } } }
    else { strip(s, f0, f1, XL, SPLIT, h0 - TH, h1 - TH, fc(T.under[i % 2], fog));   // the underside: cross girders and stringers
      for(const X of [-.68, -.18, .2]) strip(s, f0, f1, X, X + .04, h0 - TH, h1 - TH, fc(T.girder, fog)); }
    // railings on both edges: a lit handrail, posts, and warning lamps that chase up toward the lip (steady under reduced motion)
    if(fog < .97) for(const X of [XL + .03, SPLIT - .03]){ const RH = 220, t0 = P(s, f0, X, h0 + RH), t1 = P(s, f1, X, h1 + RH), w = Math.max(1, Math.round(s.p1.screen.w * .025));
      quad(t0, t1, [t1[0], t1[1] + w], [t0[0], t0[1] + w], fc(T.rail, fog * .5));
      const b0 = P(s, f0, X, seeTop ? h0 : h0 - TH * .5); cx.fillStyle = fc(T.under[0], fog); cx.fillRect(Math.round(b0[0]), Math.round(t0[1]), w, Math.max(1, Math.round(b0[1] - t0[1])));
      const ch = reduce ? i % 2 === 0 : (i + Math.floor(now / 70) * (near ? -1 : 1)) % 4 === 0;
      lamp(t0[0], t0[1], ch ? T.lamp[0] : fc(T.lamp[1], fog * .5), s.p1.screen.w * .16, ch ? .6 * (1 - fog * .7) : 0, s.p1.screen.w * 1.6); }
  }
  /* the landing ramp's abutment: the vertical face from under the tip down to the floor of the gap, across the deck's width (from the apex you
     look down past the tip; without it the ground under the far leaf, kerbs and all, showed through as a stretched road). Reinforced
     concrete in the ramp's own side colours: a shadow band under the tip, pilasters, a footing course, two dim service lamps. */
  function abut(s, f, h, fog, T){ const Q = (X0, X1, h0, h1, col) => quad(P(s, f, X0, h0), P(s, f, X1, h0), P(s, f, X1, h1), P(s, f, X0, h1), col), W5 = (SPLIT - XL) / 5;
    // the face in four hue-shifted steps, lit from above by the lip's floodlights (warm) and falling to the cool dark at its foot
    const R = [mixc(T.side[0], T.lamp[1], .3), T.side[0], mixc(T.side[0], T.under[0], .5), T.under[0]];
    for(let k = 0; k < 4; k++) Q(XL, SPLIT, h * (.86 - k * .215), h * (.86 - (k + 1) * .215), fc(R[k], fog));
    Q(XL, SPLIT, h, h * .86, fc(T.under[1], fog));   // the shadow under the tip
    for(let k = 0; k < 10; k++) Q(XL + (SPLIT - XL) * k / 10, XL + (SPLIT - XL) * (k + .5) / 10, h * .86, h * .8, fc(T.bar[k % 2], fog));   // hazard band: the end of the ramp
    const pw = Math.max(PX, snapP(s.p1.screen.w * .05)), lw = Math.max(1, Math.round(pw / 3));
    for(let k = 1; k < 5; k++){ const X = XL + W5 * k, t = P(s, f, X, h * .8), u = P(s, f, X, h * .07), x0 = snapP(t[0] - pw / 2), y0 = Math.round(t[1]), hh = Math.max(PX, Math.round(u[1] - t[1]));   // pilasters: lit left edge, shaded right
      cx.fillStyle = fc(T.side[1], fog); cx.fillRect(x0, y0, pw, hh); cx.fillStyle = fc(mixc(T.side[0], T.lamp[1], .5), fog); cx.fillRect(x0, y0, lw, hh); cx.fillStyle = fc(T.under[1], fog); cx.fillRect(x0 + pw - lw, y0, lw, hh); }
    for(const v of [.6, .38]){ const a = P(s, f, XL, h * v), c = P(s, f, SPLIT, h * v); cx.fillStyle = fc(T.under[1], fog); cx.fillRect(Math.round(a[0]), Math.round(a[1]), Math.round(c[0] - a[0]), PX); }   // formwork lines
    Q(XL - .04, SPLIT + .04, h * .07, 0, fc(T.girder, fog));   // the footing
    if(fog < .9) for(let k = 0; k < 5; k++){ const [x, y] = P(s, f, XL + W5 * (k + .5), h * .7); lamp(x, y, T.lamp[1], s.p1.screen.w * .08, .14 * (1 - fog), s.p1.screen.w * .7); } }   // service lamps between the pilasters
  // the vertical end face of a leaf (the far leaf's tip faces you)
  function drawTip(s, f, h, fog, now, T){ const a = P(s, f, XL, h), b = P(s, f, SPLIT, h), c = P(s, f, SPLIT, h - TH), d = P(s, f, XL, h - TH);
    if(!T.bridge) abut(s, f, h - TH, fog, T);   // a landing ramp stands on a solid abutment, not on air: its face fills the space under the tip
    quad(a, b, c, d, fc(T.tip[0], fog)); const n = 8; for(let k = 1; k < n; k++){ const X = XL + (SPLIT - XL) * k / n, t = P(s, f, X, h), u = P(s, f, X, h - TH); cx.fillStyle = fc(T.tip[1], fog); cx.fillRect(Math.round(t[0]), t[1], Math.max(1, Math.round(s.p1.screen.w * .012)), u[1] - t[1]); }
    quad(a, b, P(s, f, SPLIT, h - TH * .18), P(s, f, XL, h - TH * .18), fc(T.tip[2], fog)); quad(d, c, P(s, f, SPLIT, h - TH * .86), P(s, f, XL, h - TH * .86), fc(T.tip[1], fog));
    const on = reduce || Math.floor(now / 300) % 2 === 0; for(const X of [XL + .05, (XL + SPLIT) / 2, SPLIT - .05]){ const [x, y] = P(s, f, X, h - TH * .5); lamp(x, y, on ? '#ff3a3a' : '#5a1018', s.p1.screen.w * .16, on ? .45 * (1 - fog) : 0, s.p1.screen.w); } }
  /* The floor below a landmark jump: across the gap; under the ramp and the far leaf only beneath the deck (DECK_F), so the roadside's
     ground, water and roadFX carry on beside them (seen from the apex, the ground under the far leaf shows past its tip). In the gap it reaches ENV[road].jumpFloor half-road widths each side (default 7; or [left, right]; a
     drawbridge's whole span is its channel, so there it is the full span). When
     ENV[road].jumpBelow(s, o, fog, p) returns true the road drew its own ground there and the plain floor colour is skipped; the jump's
     crossing life (taxiway lights, a train, the expressways, the flare) still draws over it. Drawn in drawSegBack, before the segment's props. */
  let FA = -7, FB = 7, OWN = false;
  const DECK_F = 1.12;   // under the ramp and the far leaf the floor reaches only the deck's own footprint (its kerbs included): the ground in its shadow
  function drawVoid(s, f0, f1, fog, now){ const i = s.index; if(!OWN) strip(s, f0, f1, FA, FB, 0, 0, fc(i % 2 ? '#0a1020' : '#0c1428', fog * .5));
    const tq = Math.floor(now / 140);
    for(let k = 0; k < 6; k++){ const X = -.9 + k * .24 + (hash(k * 7.7) - .5) * .08; if(hash(i * 3.1 + k * 17 + tq) < .45) continue; const w = .01 + hash(k + i * .37) * .025;
      strip(s, f0, f1, X - w, X + w, 0, 0, fc(['#ff9a3a', '#ff4a8a', '#ffd890', '#4ad0ff', '#ffb35a', '#b06bff'][k], fog * .5)); } }
  function band(s, fa, fb, col){ strip(s, fa, fb, FA, FB, 0, 0, col); }
  function base(s, col){ if(!OWN) band(s, 0, 1, col); }   // the floor's ground colour (skipped where the road drew its own: jumpBelow)
  // a sprite seen through the gap: clipped to the hole's screen footprint
  function inHole(s, fn){ const l = P(s, 0, XL, 0)[0], r = P(s, 0, SPLIT, 0)[0]; cx.save(); cx.beginPath(); cx.rect(Math.min(l, r), 0, Math.abs(r - l), s.clip); cx.clip(); fn(); cx.restore(); }
  function drawBelow(s, fog, now, p, o){ const T = p.th, i = s.index, tq = Math.floor(now / 140), mid = NL + G - 6,   // the far half of the gap: what you see ahead and below at the apex
      uw = s.p1.screen.w, t = now / 1000;
    switch(T.below){
      case 'water': drawVoid(s, 0, 1, fog, now); return;
      case 'lava': { base(s, fc(i % 2 ? '#4a1006' : '#3a0c04', fog * .3));   // a cooled crust with molten cracks breathing through it
        for(let k = 0; k < 5; k++){ const X = -.92 + k * .3 + (hash(k * 5.1 + i * .3) - .5) * .12, w = .015 + hash(k + i) * .04, hot = hash(i * 2.3 + k * 11 + (reduce ? 0 : tq >> 1)); if(hot < .35) continue;
          strip(s, 0, 1, X - w, X + w, 0, 0, fc(hot > .8 ? '#ffd04a' : hot > .6 ? '#ff7a1a' : '#c83a0a', fog * .3)); }
        if(i % 3 === 0){ const [x, y] = P(s, .5, (FA + FB) / 2, 0); glow(x, y, uw * .9, '#ff4a10', .22); }
        if(!reduce && o === mid){ for(let k = 0; k < 8; k++){ const [x, y] = P(s, .5, FA + (FB - FA) * hash(k * 3.7), 0), rise = ((t * .6 + hash(k)) % 1) * uw * 1.4; cx.fillStyle = 'rgba(255,170,90,.18)'; cx.fillRect(Math.round(x + Math.sin(t * 3 + k) * PX * 2), Math.round(y - rise), PX, PX * 3); } }   // heat shimmer
        return; }
      case 'gorge': { base(s, fc(i % 2 ? '#060a0c' : '#070c0e', fog * .2));   // looking down into depth: stepped fog shelves, shrinking pines
        const deep = clamp((o - NL) / G, 0, 1);
        if(o >= NL && o < NL + G) inHole(s, () => { for(let k = 0; k < 5; k++){ if(hash(i * 1.7 + k * 9) < .35) continue; const X = FA + .1 + (FB - FA - .2) * hash(i * 3.3 + k), [x, y] = P(s, .5, X, 0), sz = Math.min(s.p1.screen.w * (.12 - .07 * deep) * (.7 + hash(i + k) * .6), H * .05);
          cx.fillStyle = fc(k % 2 ? '#0e1c16' : '#12241a', fog * .2); cx.beginPath(); cx.moveTo(x, y - sz * 2.2); cx.lineTo(x + sz * .7, y); cx.lineTo(x - sz * .7, y); cx.closePath(); cx.fill();
          cx.fillStyle = fc('#3e5a48', fog * .2); cx.fillRect(Math.round(x - PX / 2), Math.round(y - sz * 2.2), PX, Math.max(PX, Math.round(sz * .5))); } });
        if(o === NL + 4 || o === NL + 10 || o === NL + 16){ cx.globalAlpha = .45; band(s, 0, .6, '#2a3a4a'); cx.globalAlpha = .25; band(s, .6, 1, '#3a4a5a'); cx.globalAlpha = 1; }
        if(o === NL + G - 4 || o === NL + G - 3){ band(s, .2, .8, fc('#20202a', fog * .2)); if(o === NL + G - 4) for(let k = 0; k < 6; k++){ const X = FA + (k + .3) / 6 * (FB - FA); strip(s, .45, .55, X, X + .08, 0, 0, fc('#8a8478', fog * .2)); } }
        if(o === NL + G - 4){ for(let k = 0; k < 2; k++){ const u = ((t * .2 * (k ? -1 : 1) + k * .5) % 1 + 1) % 1, [x, y] = P(s, k ? .7 : .3, FA + u * (FB - FA), 0), dir = k ? -1 : 1;   // a car on the hairpin far below
            star(x + dir * uw * .02, y, PX, k ? '#ff6a4a' : '#fff4d0', .55); if(!k){ cx.fillStyle = 'rgba(255,240,200,.18)'; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + uw * .35, y - PX * 2); cx.lineTo(x + uw * .35, y + PX * 2); cx.closePath(); cx.fill(); } } }
        return; }
      case 'taxi': { base(s, fc(i % 2 ? '#16181f' : '#1a1c24', fog * .3));
        if(o === NL || o === NL + G - 1) for(let k = 0; k < 7; k++){ const [x, y] = P(s, o === NL ? .1 : .9, FA + (k + .5) / 7 * (FB - FA), 0); lamp(x, y, '#3a6aff', uw * .14, .5, uw); }   // taxiway edge lights
        if(o === mid){ band(s, .45, .55, fc('#d8b020', fog * .3)); for(let k = 0; k < 8; k++){ const [x, y] = P(s, .5, FA + (k + .5) / 8 * (FB - FA), 0); lamp(x, y, '#3aff7a', uw * .12, .4, uw); } }
        if(o === NL + G - 12 && air){ const far = segs[s.index + 10], mid = segs[s.index + 5];   // in flight you see it from above: the planform lying on the taxiway, its wings along the road
          if(far && mid && far.p1.screen.scale && mid.p1.screen.scale) inHole(s, () => { const u = reduce ? .4 : (t / 9) % 1, X = -3.5 + u * 5, yN = s.p1.screen.y, yF = far.p1.screen.y, wm = mid.p1.screen.w * 5.2, xm = mid.p1.screen.x + X * mid.p1.screen.w;
            const need = wm / PX; let l = LODR.length - 1; for(let q2 = 0; q2 < LODR.length; q2++) if(64 / LODR[q2] * 1.5 >= need){ l = q2; break; }
            const spr = jetTop(l); glow(xm, (yN + yF) / 2, wm * .5, '#ffd890', .1); cx.drawImage(spr, Math.round(xm - wm * 76 / 70 / 2), Math.round(yF), Math.round(wm * 76 / 70), Math.max(PX, Math.round(yN - yF)));
            if(reduce || t % 1.2 < .2){ glow(xm, (yN + yF) / 2, wm * .05, '#ff2a2a', .7); } star(xm + wm * .5, (yN + yF) / 2, PX * 1.5, '#fff4dc', .55); }); }
        if(o === NL + G - 2 && !air) inHole(s, () => { const u = reduce ? .4 : (t / 9) % 1, X = -3.5 + u * 5, [x, y] = P(s, .5, X, 0), w = 4 * uw, k = w / 128;   // a jumbo taxiing across the gap (seen on the approach)
          glow(x, y - 20 * k, w * .45, '#ffd890', .14); sideBlit(x, y + 4 * k, w, false); cx.fillStyle = 'rgba(255,216,144,.35)'; cx.fillRect(Math.round(x - 40 * k), Math.round(y - 25 * k), Math.round(82 * k), Math.max(PX, Math.round(k)));
          const nose = x + 58 * k, tail = x - 56 * k; star(nose, y - 18 * k, Math.max(PX * 2, k * 2), '#fff4dc', .7); if(reduce || t % 1.2 < .2){ glow(x, y - 33 * k, k * 12, '#ff2a2a', .7); cx.fillStyle = '#ff4a3a'; cx.fillRect(Math.round(x - k * 1.5), Math.round(y - 34 * k), Math.ceil(k * 3), Math.ceil(k * 2)); } star(tail, y - 26 * k, Math.max(PX, k), '#ffffff', .4); });
        return; }
      case 'jct': { base(s, fc(i % 2 ? '#101016' : '#121218', fog * .3));
        for(const [ro, dir] of [[NL + G - 11, 1], [NL + G - 4, -1]]){ if(o !== ro) continue; band(s, .1, .9, fc('#2c2c38', fog * .3)); band(s, .1, .16, fc('#6a6a7a', fog * .3)); band(s, .48, .52, fc('#c8b070', fog * .3));
          for(let k = 0; k < 7; k++){ const u = ((t * .35 * dir + k / 7) % 1 + 1) % 1, [x, y] = P(s, dir > 0 ? .3 : .7, FA + u * (FB - FA), 0); lamp(x, y, dir > 0 ? '#fff4d0' : '#ff3a3a', uw * .16, .45, uw); } }   // the expressways stacked below, streaming
        if(o === NL + G - 7){ const [x, y] = P(s, .5, (FA + FB) / 2, 0); glow(x, y, uw * 1.2, '#ffb35a', .12); }
        return; }
      case 'snow': { base(s, fc(i % 2 ? '#7a8ab0' : '#8494b8', fog * .3));
        for(let k = 0; k < 6; k++){ if(hash(i * 2.1 + k * 7) < .5) continue; const X = FA + (FB - FA) * hash(i + k * 3.1); strip(s, 0, 1, X - .03, X + .03, 0, 0, fc('#e8f0ff', fog * .3)); }
        if(o === mid) for(let k = 0; k < 3; k++){ const [x, y] = P(s, .5, FA + (k + .5) / 3 * (FB - FA), 0); glow(x, y, uw * .5, '#9ad0ff', .12); }
        return; }
      case 'rail': { base(s, fc(i % 2 ? '#0a1420' : '#0c1826', fog * .3));
        if(i % 2 && !OWN) strip(s, 0, 1, -.42, -.36, 0, 0, fc('#c8c0a0', fog * .4));   // the moon in the flooded paddy (not over a road's own water: jumpBelow)
        if(o === NL + G - 3){ band(s, .2, .8, fc('#3a3430', fog * .3)); band(s, .32, .36, fc('#9a9aa8', fog * .3)); band(s, .62, .66, fc('#9a9aa8', fog * .3));
          inHole(s, () => { const u = reduce ? .5 : (t / 5) % 1, X0 = -6 + u * 8, a = P(s, .5, X0 - 5, 0), b = P(s, .5, X0 + 5, 0), hh = s.p1.screen.scale * 700 * H / 2, y = a[1]; glow((a[0] + b[0]) / 2, y - hh / 2, (b[0] - a[0]) * .5, '#ffd890', .16);   // a night train runs under the hump
            cx.fillStyle = '#1a1e2c'; cx.fillRect(Math.round(a[0]), Math.round(y - hh), Math.round(b[0] - a[0]), Math.round(hh)); cx.fillStyle = '#4a5068'; cx.fillRect(Math.round(a[0]), Math.round(y - hh), Math.round(b[0] - a[0]), PX);
            cx.fillStyle = '#ffd890'; for(let x = a[0] + PX * 2; x < b[0] - PX * 2; x += PX * 3) if(((x - a[0]) / (b[0] - a[0]) * 4 % 1) > .08) cx.fillRect(Math.round(x), Math.round(y - hh * .66), PX * 2, Math.max(PX, Math.round(hh * .25)));
            star(b[0], y - hh * .4, PX * 1.5, '#fff4d0', .5); }); }
        return; }
      case 'pipe': { base(s, fc(i % 2 ? '#140c0a' : '#180e0b', fog * .3));
        if(o % 4 === 0){ band(s, .25, .6, fc('#4a4a54', fog * .3)); band(s, .25, .32, fc('#9a9aa8', fog * .3)); band(s, .55, .6, fc('#1a1a20', fog * .3)); }
        if(o === mid){ const [x, y] = P(s, .5, (FA + FB) / 2, 0), fl = .7 + (reduce ? 0 : .3 * Math.sin(t * 9)); glow(x, y, uw * 1.6 * fl, '#ff7a1a', .3); glow(x, y, uw * .5, '#ffd04a', .4); }
        return; }
    } }
  function drawSpan(s, fog){ const i = s.index; if(!BYPASS) return;   // the bypass lane's fixed span
    for(const X of [SPLIT + .03, 1.1]){ const a = P(s, 0, X, 0), b = P(s, 1, X, 0), c = P(s, 1, X, -520), d = P(s, 0, X, -520); quad(a, b, c, d, fc(i % 2 ? '#3a3e52' : '#32364a', fog)); quad(a, b, P(s, 1, X, -60), P(s, 0, X, -60), fc('#8a90b0', fog)); }   // girder faces of the fixed span, dropping into the gap
    strip(s, 0, 1, SPLIT + .03, 1.08, 0, 0, fc(i % 2 ? '#2e2c38' : '#34313e', fog));
    strip(s, 0, 1, .93, 1.0, 0, 0, fc(i % 3 ? '#d8d0c0' : '#8a8478', fog)); strip(s, 0, 1, SPLIT + .04, SPLIT + .1, 0, 0, fc('#e8c860', fog)); if(i % 2) strip(s, 0, 1, .64, .68, 0, 0, fc('#d8d0c0', fog));
    if(i % 2 === 0) for(const X of [SPLIT + .07, .97]){ const [x, y] = P(s, 0, X, 0); lamp(x, y, '#ffd890', s.p1.screen.w * .1, .3 * (1 - fog), s.p1.screen.w); }   // road studs along both edges
    const a = P(s, 0, 1.1, 0), b = P(s, 1, 1.1, 0), c = P(s, 1, 1.1, 160), d = P(s, 0, 1.1, 160); quad(a, b, c, d, fc('#2c2c3a', fog)); quad(d, c, P(s, 1, 1.1, 130), P(s, 0, 1.1, 130), fc('#6a6a80', fog));
  }
  function drawBarrier(s, f0, f1, fog){ const i = s.index, h = 110, X = SPLIT + .015; if(!BYPASS) return;   // the divider beside the bypass
    const a = P(s, f0, X, 0), b = P(s, f1, X, 0), c = P(s, f1, X, h), d = P(s, f0, X, h);
    quad(a, b, c, d, fc(i % 2 ? '#c8323a' : '#d8d4dc', fog)); quad(d, c, P(s, f1, X, h * .8), P(s, f0, X, h * .8), fc('#140e14', fog));
    if(i % 3 === 0){ cx.fillStyle = fc('#ffe6b0', fog); cx.fillRect(Math.round(d[0]) - 1, Math.round(d[1]) - 1, 2, 2); } }

  function drawBridge(s, p, sx0, sy0, uw, fog, now){
    const i = s.index, o = i - p.b0, r = p.r || 0, Lh = leafLen(r), gA = p.b0 + Lh, gB = p.b0 + Lh + G * r, bE = p.b0 + TOT, HTr = HT * r;
    p.tipF = gA - i;
    cx.globalAlpha = 1;
    if(o >= 0 && o < TOT){
      if(r > .01) drawSpan(s, fog);   // (the floor below is drawn in drawSegBack: drawFloor)
      const a0 = Math.max(i, p.b0), a1 = Math.min(i + 1, gA);
      if(a1 > a0) drawSlab(s, a0 - i, a1 - i, HTr * (a0 - p.b0) / Lh, HTr * (a1 - p.b0) / Lh, fog, true, now, p);
      if(r > .01 && gA >= i && gA < i + 1){ const on = reduce || Math.floor(now / 300) % 2 === 0; for(const X of [XL + .05, (XL + SPLIT) / 2, SPLIT - .05]){ const [x, y] = P(s, gA - i, X, HTr); lamp(x, y, on ? '#ff3a3a' : '#5a1018', uw * .14, on ? .45 * (1 - fog) : 0, uw); } }
      const c0 = Math.max(i, gB), c1 = Math.min(i + 1, bE);
      if(c1 > c0){ drawSlab(s, c0 - i, c1 - i, HTr * (bE - c0) / Lh, HTr * (bE - c1) / Lh, fog, false, now, p); if(r > .01 && gB >= i && gB < i + 1){ drawTip(s, gB - i, HTr, fog, now, p.th); } }
    }
    if(o >= -30 && o < TOT + 6) drawBarrier(s, 0, 1, fog);
    const a = 1 - fog * .5;
    // pier houses with counterweights at both hinges; the counterweight sinks as the leaf rises
    if(!p.th.bridge && (o === 0 || o === TOT)){ const k = uw * 2.4 / 84; for(const side of [-1, 1]){ const x = sx0 + side * 1.45 * uw; cx.globalAlpha = a; blit(SP.flood, x, sy0, k); cx.globalAlpha = 1; glow(x, sy0 - 77 * k, 30 * k, p.th.lamp[0], .3 * a); } }
    if(p.th.bridge && (o === 0 || o === TOT)){ const k = uw * 1.5 / 48;
      for(const side of [-1, 1]){ const x = sx0 + side * 1.62 * uw, spr = side < 0 ? SP.pier : SP.pierR; cx.globalAlpha = a; blit(spr, x, sy0, k);
        const cwx = x + (side < 0 ? 17.5 : -17.5) * k, cwy = sy0 - (40 - 30 * r) * k; blit(SP.cw, cwx, cwy, k);
        const on = reduce || Math.floor(now / 700) % 2 === 0; const tx = x + (side < 0 ? -6.5 : 6.5) * k; if(on) glow(tx, sy0 - 107 * k, 6 * k, '#ff3a3a', .6 * a); glow(tx, sy0 - 80 * k, 26 * k, '#ff9a3a', .16 * a); glow(x - side * 2 * k, sy0 - 45 * k, 18 * k, '#ffcf80', .18 * a); } }
    // the boom gates across the jump lanes at the base of the leaf (3D, see drawGates), drawn with their segment until you ride through
    if(o === -GZ) drawGates(p, fog, now);
    // crossing signals
    if(p.th.bridge && o === -34){ const k = uw * .42 / 20, flash = Math.floor(now / 420) % 2;
      const posts = BYPASS ? [[-1.2, SP.signal], [SPLIT + .06, SP.signal], [1.2, SP.signalR]] : [[-1.2, SP.signal], [1.2, SP.signalR]];
      for(const [X, spr] of posts){ const x = sx0 + X * uw; cx.globalAlpha = a; blit(spr, x, sy0, k);
        for(const [lx, ph] of [[-7, 0], [7, 1]]){ const lit = reduce ? true : flash === ph, col = lit ? '#ff2a2a' : '#4a0c12', ly = sy0 - 25.5 * k, xx = x + lx * k * (spr === SP.signalR ? -1 : 1);
          cx.fillStyle = col; cx.fillRect(Math.round(xx - 1.6 * k), Math.round(ly - 1.6 * k), Math.max(2, Math.round(3.2 * k)), Math.max(2, Math.round(3.2 * k)));
          if(lit) glow(xx, ly, (reduce ? 6 : 10) * k, '#ff2a2a', (reduce ? .25 : .55) * a); } }
      cx.globalAlpha = 1; }
    if(BYPASS && o === -30){ const k = uw * .3 / 22, x = sx0 + (SPLIT + .015) * uw; cx.globalAlpha = a; blit(SP.cushion, x, sy0, k); cx.globalAlpha = 1;
      const on = reduce || Math.floor(now / 350) % 2 === 0; if(on) glow(x, sy0 - 16 * k, 8 * k, '#ffb020', .6 * a); }
    // funnel drums when the gate is down
    if(!p.open && o >= -75 && o <= -32 && o % 3 === 0){ const t = clamp((-o - 32) / 43, 0, 1), X = lerp(SPLIT + .02, -1.15, t), k = uw * .16 / 9, x = sx0 + X * uw;
      cx.globalAlpha = a; blit(SP.drum, x, sy0, k); cx.globalAlpha = 1; const on = reduce || Math.floor(now / 250 + o) % 2 === 0; if(on) glow(x, sy0 - 12 * k, 5 * k, '#ffb020', .55 * a); }
    // a flare portal, readable from far off: two steel posts standing on the road edges of the jump lanes, a beam across their tops and
    // the name board hung from it (every point projected from this segment, so it sits on the road over crests and dips). The board's
    // bottom is 1650 up, above the camera (1000), whatever the screen's aspect (its height in road units is worked out from its on-screen
    // width): you ride under it, it never sweeps through the view.
    if(o === -80){ const X0 = XL - .04, X1 = SPLIT + .04, sc0 = s.p1.screen.scale || 1e-6, wq = (P(s, 0, X1 - .07, 0)[0] - P(s, 0, X0 + .07, 0)[0]) * 23 / 72, hW = wq / (sc0 * H / 2), BH = 110, PH = 1650 + hW * 1.12 + BH, fl = reduce ? 1 : .8 + .2 * Math.sin(now / 90), pw = Math.max(PX * 2, snapP(uw * .03)), al = 1 - fog * .3;
      cx.globalAlpha = al;
      for(const X of [X0, X1]){ const g0 = P(s, 0, X, 0), g1 = P(s, 0, X, PH); const x0 = snapP(g0[0] - pw / 2), y1 = snapP(g1[1]);
        cx.fillStyle = fc('#16141e', fog); cx.fillRect(x0, y1, pw, Math.max(PX, snapP(g0[1]) - y1)); cx.fillStyle = fc('#4a5068', fog); cx.fillRect(x0 + PX, y1, PX, Math.max(PX, snapP(g0[1]) - y1));
        cx.fillStyle = fc('#16141e', fog); cx.fillRect(snapP(g0[0] - pw), snapP(g0[1]) - PX, pw * 2, PX); }
      const b0 = P(s, 0, X0, PH), b1 = P(s, 0, X1, PH), b2 = P(s, 0, X1, PH - BH), b3 = P(s, 0, X0, PH - BH); quad(b0, b1, b2, b3, fc('#1c1a26', fog)); cx.fillStyle = fc('#5a6078', fog); cx.fillRect(Math.round(b0[0]), Math.round(b0[1]), Math.round(b1[0] - b0[0]), PX);
      const q0 = P(s, 0, X0 + .07, PH - BH), q1 = P(s, 0, X1 - .07, PH - BH), w = q1[0] - q0[0], h = w * 23 / 72, spr = SP['leafsign' + p.th.id];
      for(const hx of [q0[0] + w * .2, q0[0] + w * .8]){ cx.fillStyle = fc('#16141e', fog); cx.fillRect(snapP(hx), snapP(q0[1]), PX, Math.max(PX, snapP(h * .12))); }
      if(spr && w > PX * 3){ cx.imageSmoothingEnabled = false; cx.drawImage(spr, 0, 0, 72, 23, snapP(q0[0]), snapP(q0[1] + h * .1), Math.max(PX, snapP(w)), Math.max(PX, snapP(h))); }
      cx.globalAlpha = 1;
      for(const t of [b0, b1]){ glow(t[0], t[1], uw * .5 * fl, p.th.lamp[0], .45 * al); star(t[0], t[1], PX * 1.5, p.th.lamp[0], .5 * al); }
      glow((q0[0] + q1[0]) / 2, q0[1] + h * .6, w * .9, p.th.edge, .25 * (1 - fog * .4)); }
    if(o === -110){ const k = uw * 2.5 / 150; cx.globalAlpha = a; blit(SP['gantry' + p.open + p.th.id], sx0, sy0, k); cx.globalAlpha = 1;
      glow(sx0 - .35 * uw, sy0 - 66 * k, 30 * k, p.open ? '#ff9a2a' : '#ff2a3a', .22 * a); glow(sx0 + .75 * uw, sy0 - 66 * k, 18 * k, '#4aff9a', .12 * a); }
    if(o === -200 || o === -150){ const side = o === -200 ? -1 : 1, k = uw * .9 / 60, x = sx0 + side * 1.5 * uw; cx.globalAlpha = a; blit(SP['warn' + p.th.id], x, sy0, k); cx.globalAlpha = 1; glow(x, sy0 - 46 * k, 26 * k, '#ffd04a', .14 * a); }
  }

  // ---------------------------------------------------------------- drawing: approach lights
  function drawALS(s, A, sx0, sy0, uw, fog, now){ const k = uw * .62 / 26, x = sx0 - 2.4 * uw, spr = SP['mast' + A.h], a = 1 - fog * .6;
    cx.globalAlpha = a; blit(spr, x, sy0, k); cx.globalAlpha = 1;
    const red = A.k >= A.n - 4, col = red ? '#ff4a3a' : '#fff2d8', ly = sy0 - (16 + A.h - 1.5) * k, cyc = (now / 1000) % .5, run = Math.floor(cyc / .5 * 38);
    const strobe = !reduce && !red && run === A.k;
    for(let j = 0; j < 5; j++){ const lx = x + (-10 + j * 5) * k; cx.fillStyle = strobe ? '#ffffff' : col; cx.fillRect(Math.round(lx - k), Math.round(ly - k), Math.max(2, Math.round(2 * k)), Math.max(2, Math.round(2 * k))); }
    if(fog < .85) glow(x, ly, uw * .35, col, .3 * (1 - fog));
    if(strobe){ glow(x, ly, uw * 1.1, '#e8f0ff', .7 * (1 - fog * .5)); cx.fillStyle = '#ffffff'; cx.fillRect(Math.round(x - 13 * k), Math.round(ly - .6 * k), Math.round(26 * k), Math.max(1, Math.round(1.2 * k))); } }

  // the floor below the gap, before the segment's props (core drawSprites: drawSegBack runs ahead of s.sprites), so the roadside stands on it
  // the floor's reach on each side of this segment: [left, right] half-road widths (left as a positive number)
  function floorW(p, o, E){ const r = p.r || 0, Lh = leafLen(r), gap = p.th.bridge || (o >= Lh && o < Lh + G * r), jf = E && E.jumpFloor;
    if(!gap){ FL[0] = FL[1] = DECK_F; return false; } if(jf && jf.length === 2){ FL[0] = jf[0]; FL[1] = jf[1]; } else FL[0] = FL[1] = jf > 0 ? jf : 7; return true; }
  const FL = [7, 7];
  function drawFloor(s, p, fog, now){ const o = s.index - p.b0, r = p.r || 0; if((r <= .01 && !p.th.bridge) || o < 0 || o >= TOT) return;
    const E = ENV[p.th.id], gap = floorW(p, o, E); FA = -FL[0]; FB = FL[1]; OWN = false;
    if(gap && E && E.jumpBelow){ try{ OWN = E.jumpBelow(s, o, fog, p) === true; }catch(err){ console.error('jumpBelow', p.th.id, err); } }
    cx.globalAlpha = 1; drawBelow(s, fog, now, p, o); OWN = false; FA = -7; FB = 7; }
  J.drawSegBack = (s, sx0, sy0, uw, fog, now) => { const p = s.spjP; if(p && p.kind === 'bridge') drawFloor(s, p, fog * .55, now); };
  /* the floor's edges, where it stops short of the screen edge (jumpFloor < 7): a low parapet with a lit coping, so a narrow floor reads as
     a cutting or a sea wall with the roadside's own ground beyond. Drawn in drawSeg, over the props standing beyond it. ENV.jumpEdge = false
     turns it off (the road draws its own banks). */
  function drawEdges(s, p, fog){ const o = s.index - p.b0, E = ENV[p.th.id]; if(o < 0 || o >= TOT || (E && E.jumpEdge === false) || !floorW(p, o, E) || fog > .97) return;
    const T = p.th, i = s.index, EH = 150, face = fc(T.side[i % 2], fog), cap = fc(T.edge2, fog), lit = i % 6 === 0 && fog < .8;
    for(const X of [-FL[0], FL[1]]){ if(Math.abs(X) >= 6.9) continue; const d = X < 0 ? -.05 : .05;
      quad(P(s, 0, X, 0), P(s, 1, X, 0), P(s, 1, X, EH), P(s, 0, X, EH), face);
      quad(P(s, 0, X, EH), P(s, 1, X, EH), P(s, 1, X + d, EH), P(s, 0, X + d, EH), cap);
      if(lit){ const [x, y] = P(s, .5, X, EH); lamp(x, y, T.lamp[0], s.p1.screen.w * .1, .3 * (1 - fog), s.p1.screen.w * .8); } } }
  J.drawSeg = (s, sx0, sy0, uw, fog, now) => {
    if(puffs.length) drawPuffs(s);
    for(const it of depthItems) if(!it.done && s.index <= Math.floor(it.z / SEG)){ it.done = true; it.fn(it); }
    if(s.spjP && s.spjP.kind === 'bridge'){ drawEdges(s, s.spjP, fog * .55); drawBridge(s, s.spjP, sx0, sy0, uw, fog * .55, now); }   // floodlit: it cuts through the haze
    if(s.spjA) drawALS(s, s.spjA, sx0, sy0, uw, fog, now);
    if(CBP_) drawFlying(s.index, false, fog);   // the barricade's pieces in flight, over this segment's deck
  };

  // ---------------------------------------------------------------- drawing: the jet
  // world -> screen with the game's own projection: through the road segment at that depth while it is on screen, else straight math
  function projSeg(xw, zw, h){ const base = Math.floor(position / SEG), gi = Math.floor(zw / SEG);
    if(gi > base && gi < base + DRAW - 1){ const sg = segs[gi]; if(sg && sg.p1.screen.scale && sg.p1.camera.z > DEPTH){ const f = (zw % SEG) / SEG, a = sg.p1.screen, b = sg.p2.screen, sc = a.scale + (b.scale - a.scale) * f, w = a.w + (b.w - a.w) * f;
      return { x:a.x + (b.x - a.x) * f + xw / ROADW * w, y:a.y + (b.y - a.y) * f - sc * h * H / 2, sc }; } }
    return null; }
  function proj(xw, zw, h){ const p = projSeg(xw, zw, h); if(p) return p; const zr = zw - position;
    if(zr < 250) return null; const sc = DEPTH / zr; return { x:W / 2 + sc * (xw - playerX * ROADW) * W / 2, y:H / 2 - PITCH + sc * (CAMH - h) * H / 2, sc }; }

  // ---- the 747 in 3D. A low-poly 747-400 in metres (x starboard, y up, z forward; nose z +35.6, span 64.4 with winglets), built once,
  // posed every frame and rasterised straight onto the game's pixel grid with a z-buffer: flat shading from a 6-tone ramp (warm city
  // bounce on everything facing down, a cool moon on what faces up, the fin lit by its logo lights), dithered between tones, a dark-hue
  // outline at the silhouette and wherever a nearer part crosses a farther one (nacelle over wing, gear over belly). The camera is a true
  // pinhole matched to the road's projection (focal DEPTH * W / 2 on both axes; road heights are H / W of a true unit), so the wings,
  // nacelles and gear foreshorten and the near wing grows exactly as the road does. One buffer canvas, made in warm(); none mid-ride.
  const KM = 10700 / 64;   // world units per metre (the old planform's scale: 64 m of wingspan = 10700)
  const MV = [], MF = [], GEAR = [];
  const mv = (x, y, z) => (MV.push([x, y, z]), MV.length - 1);
  // a face: vertex ids (any winding), group (outline breaks between groups), base tone (or a fixed colour index), and a direction the
  // outward normal must agree with (Newell's normal, flipped to match)
  function mface(ids, g, b, out, col){ let nx = 0, ny = 0, nz = 0; for(let k = 0; k < ids.length; k++){ const a = MV[ids[k]], c = MV[ids[(k + 1) % ids.length]];
      nx += (a[1] - c[1]) * (a[2] + c[2]); ny += (a[2] - c[2]) * (a[0] + c[0]); nz += (a[0] - c[0]) * (a[1] + c[1]); }
    const l = Math.hypot(nx, ny, nz); if(l < 1e-9) return; nx /= l; ny /= l; nz /= l; if(nx * out[0] + ny * out[1] + nz * out[2] < 0){ nx = -nx; ny = -ny; nz = -nz; }
    MF.push({ i:ids, g, b, col:col || 0, n:[nx, ny, nz] }); }
  // a tube of N-gon rings [z, xc, yc, rx, rTop, rBottom]; ring vertices at half steps so the bottom is a flat keel face
  function tube(R, N, g, b){ const ids = R.map(r => { const a = []; for(let k = 0; k < N; k++){ const th = (k + .5) / N * 6.2832, c = Math.cos(th), s = Math.sin(th); a.push(mv(r[1] + r[3] * c, r[2] + (s > 0 ? r[4] : r[5]) * s, r[0])); } return a; });
    for(let j = 0; j + 1 < R.length; j++) for(let k = 0; k < N; k++){ const k1 = (k + 1) % N, th = (k + 1) / N * 6.2832; mface([ids[j][k], ids[j][k1], ids[j + 1][k1], ids[j + 1][k]], g, b, [Math.cos(th), Math.sin(th), 0]); }
    return ids; }
  const box = (x0, x1, y0, y1, z0, z1, g, b, col) => { const v = []; for(const z of [z0, z1]) for(const y of [y0, y1]) for(const x of [x0, x1]) v.push(mv(x, y, z));
    mface([v[0], v[1], v[3], v[2]], g, b, [0, 0, -1], col); mface([v[4], v[5], v[7], v[6]], g, b, [0, 0, 1], col); mface([v[0], v[1], v[5], v[4]], g, b, [0, -1, 0], col);
    mface([v[2], v[3], v[7], v[6]], g, b, [0, 1, 0], col); mface([v[0], v[2], v[6], v[4]], g, b, [-1, 0, 0], col); mface([v[1], v[3], v[7], v[5]], g, b, [1, 0, 0], col); };
  // fixed colours after the 6-tone ramp: 6 intake, 7 nozzle, 8 tyre, 9 hub, 10 window
  const RAMP = ['#05060c', '#2a2c42', '#4c4a62', '#827482', '#c89c80', '#e8c8a4'], FIXC = ['#07080e', '#1c1418', '#0a0b12', '#5a6080', '#d8a868'], CI = { intake:6, noz:7, tyre:8, hub:9, win:10 };
  const FUS = [[35.6, 0, -.7, .1, .1, .1], [34.8, 0, -.55, .95, .85, .8], [33, 0, -.25, 2, 2.1, 1.85], [30, 0, .05, 2.85, 3.3, 2.85], [26, 0, .15, 3.2, 4.2, 3.15], [14, 0, 0, 3.25, 4.5, 3.25],
    [9, 0, 0, 3.35, 3.6, 3.5], [1, 0, 0, 3.6, 3.25, 3.75], [-7, 0, 0, 3.4, 3.25, 3.45], [-14, 0, 0, 3.25, 3.25, 3.25], [-22, 0, .5, 2.9, 2.8, 2.5], [-29, 0, 1.3, 1.9, 1.9, 1.3], [-34, 0, 1.9, .8, .8, .55], [-35.9, 0, 2, .3, .3, .25]];
  const WLE = a => 12 - (a - 3) * .78, WTE = a => a < 12 ? -3 : -3 - (a - 12) * .52, WY = a => -2 + (a - 3) * .12, WTH = a => 1 - (a - 3) * .024, DROOP = a => a < 22 ? 1.5 : Math.max(0, 1.5 - (a - 22) * .15);
  const rxAt = z => { for(let j = 0; j + 1 < FUS.length; j++){ const p = FUS[j], q = FUS[j + 1]; if(z <= p[0] && z >= q[0]) return p[3] + (q[3] - p[3]) * (p[0] - z) / (p[0] - q[0]); } return 0; };
  (function buildModel(){
    const fus = tube(FUS, 8, 1, .9); mface(fus[fus.length - 1].slice(), 1, .4, [0, 0, -1]);
    for(const s of [-1, 1]){
      // wing: three span panels (root, kink, outboard, tip); lower surface in three chord strips (slats, box, flaps drooped for landing)
      const ST = [3.1, 12, 21.5, 32.2], U = [0, .12, .72, 1], L = [], T = [];
      for(const a of ST){ const le = WLE(a), te = WTE(a), y = WY(a), c = le - te;
        L.push(U.map(u => mv(s * a, y - (u === 1 ? DROOP(a) : u === .72 ? DROOP(a) * .15 : 0), le - u * c)));
        T.push([mv(s * a, y + WTH(a) * .45, le), mv(s * a, y + WTH(a), le - .3 * c), mv(s * a, y + WTH(a) * .7, le - .72 * c)]); }
      for(let i = 0; i < 3; i++){
        for(let q = 0; q < 3; q++) mface([L[i][q], L[i][q + 1], L[i + 1][q + 1], L[i + 1][q]], 2, [.9, .2, -.5][q], [0, -1, 0]);
        mface([L[i][0], T[i][0], T[i + 1][0], L[i + 1][0]], 2, .6, [0, -.2, 1]);   // leading edge
        mface([T[i][0], T[i][1], T[i + 1][1], T[i + 1][0]], 2, .3, [0, 1, .4]); mface([T[i][1], T[i][2], T[i + 1][2], T[i + 1][1]], 2, .2, [0, 1, 0]);
        mface([T[i][2], L[i][3], L[i + 1][3], T[i + 1][2]], 2, .1, [0, .6, -1]); }   // the flaps' upper face, seen from behind and below
      // the winglet, canted out and swept
      { const a = 32.2, y = WY(a), le = WLE(a), te = WTE(a), w = [mv(s * a, y, le), mv(s * a, y, te), mv(s * 33.1, y + 1.9, te - 1.1), mv(s * 33.1, y + 1.9, te - .2)]; mface(w, 2, .5, [s, -.4, 0]); mface(w.slice(), 2, .3, [-s, .4, 0]); }
      // flap-track fairings: canoe pods under the trailing edge
      for(const a of [7, 10.5, 15, 19, 23]){ const te = WTE(a), y = WY(a) - DROOP(a) * .5; mface([mv(s * a, y + .3, te + 2.4), mv(s * a, y - .7, te - .4), mv(s * a, y + .2, te - 1.6)], 2, .2, [s, 0, 0]); }
      // engines: nacelles hung ahead of and below the leading edge on pylons; lit intake lip, dark intake, dark nozzle
      for(const a of [11.6, 21.4]){ const le = WLE(a), wy = WY(a), ny = wy - 1.75, zf = le + 4.2, zb = le - 3.4, x = s * a;
        const nc = tube([[zf, x, ny, 1.2, 1.2, 1.2], [zf - .8, x, ny, 1.42, 1.42, 1.42], [zf - 3.8, x, ny, 1.38, 1.38, 1.38], [zb + .6, x, ny, 1.05, 1.05, 1.05], [zb, x, ny, .7, .7, .7]], 8, 3, 1.5);
        const inn = []; for(let k = 0; k < 8; k++){ const th = (k + .5) / 8 * 6.2832; inn.push(mv(x + .82 * Math.cos(th), ny + .82 * Math.sin(th), zf - .2)); }
        for(let k = 0; k < 8; k++){ const k1 = (k + 1) % 8; mface([nc[0][k], nc[0][k1], inn[k1], inn[k]], 3, 3.2, [0, 0, 1]); }
        mface(inn, 3, 0, [0, 0, 1], CI.intake); mface(nc[4].slice(), 3, 0, [0, 0, -1], CI.noz);
        const py = [mv(x, ny + 1.1, zf - 1.4), mv(x, ny + 1.0, zb + .3), mv(x, wy, zb - 1.2), mv(x, wy, le + .2)]; mface(py, 7, .7, [1, 0, 0]); mface(py.slice(), 7, .7, [-1, 0, 0]); }
      // horizontal stabiliser
      { const ST2 = [1.2, 11], Ls = [], Us = []; for(const a of ST2){ const le = -21.5 - (a - 1.2) * .75, te = -30 - (a - 1.2) * .27, y = 1.7 + (a - 1.2) * .12; Ls.push([mv(s * a, y, le), mv(s * a, y, te)]); Us.push(mv(s * a, y + .35, le - (le - te) * .3)); }
        mface([Ls[0][0], Ls[0][1], Ls[1][1], Ls[1][0]], 5, .5, [0, -1, 0]); mface([Ls[0][0], Us[0], Us[1], Ls[1][0]], 5, .3, [0, 1, .3]); mface([Us[0], Ls[0][1], Ls[1][1], Us[1]], 5, .2, [0, 1, -.3]); }
      // main gear: body bogies and wing bogies (four wheels each, hubs showing), oleo legs; and the side window rows
      for(const [gx, z0, z1, top] of [[2.0, -3.6, -7.4, -3.4], [5.9, -.6, -4.4, WY(5.9)]]){ const x = s * gx, zm = (z0 + z1) / 2, v0 = MV.length;
        box(x - .78, x + .78, -6.7, -5.6, z1, z1 + 1.35, 4, 0, CI.tyre); box(x - .78, x + .78, -6.7, -5.6, z0 - 1.35, z0, 4, 0, CI.tyre); box(x - .2, x + .2, -6.0, -5.6, z1 + 1.3, z0 - 1.3, 4, 1.8);
        box(x - .16, x + .16, -5.6, top, zm - .16, zm + .16, 4, 1.4);
        for(const zz of [z0 - .9, z1 + .9]) for(const xs of [-1, 1]){ const hx2 = x + xs * .8; mface([mv(hx2, -6.35, zz - .3), mv(hx2, -6.35, zz + .3), mv(hx2, -5.95, zz + .3), mv(hx2, -5.95, zz - .3)], 4, 0, [xs, 0, 0], CI.hub); }
        GEAR.push([v0, MV.length, gx < 3 ? -3 : top + .1]); }
      for(const [za, zb2] of [[29, 11], [-8, -26]]){ const xa = s * (rxAt(za) * .924 + .04), xb = s * (rxAt(zb2) * .924 + .04); mface([mv(xa, .5, za), mv(xb, .5, zb2), mv(xb, .85, zb2), mv(xa, .85, za)], 1, 0, [s, 0, 0], CI.win); }
    }
    // the fin: a thin wedge, lit by its logo lights
    { const fl = [mv(-.35, 3, -19.5), mv(-.3, 2.6, -33.5), mv(-.12, 15.5, -36.8), mv(-.12, 15.5, -32.5)], fr = [mv(.35, 3, -19.5), mv(.3, 2.6, -33.5), mv(.12, 15.5, -36.8), mv(.12, 15.5, -32.5)];
      mface(fl, 6, 2.1, [-1, 0, 0]); mface(fr, 6, 2.1, [1, 0, 0]); mface([fl[1], fr[1], fr[2], fl[2]], 6, 1, [0, 0, -1]); }
    // nose gear
    const n0 = MV.length; box(-.55, .55, -6.3, -5.3, 25, 26.5, 4, 0, CI.tyre); box(-.15, .15, -5.3, -2.7, 25.6, 25.9, 4, 1.4);
    for(const xs of [-1, 1]) mface([mv(xs * .57, -6, 25.5), mv(xs * .57, -6, 26), mv(xs * .57, -5.6, 26), mv(xs * .57, -5.6, 25.5)], 4, 0, [xs, 0, 0], CI.hub);
    GEAR.push([n0, MV.length, -2.7]);
  })();
  const NV = MV.length, VX = new Float32Array(NV), VY = new Float32Array(NV), VZ = new Float32Array(NV);
  // the gear's stowed height per vertex (NaN = not gear): retracting folds each leg and bogie up into the belly or the wing root
  const GTOP = new Float32Array(NV).fill(NaN); for(const [a, b, y] of GEAR) for(let i = a; i < b; i++) GTOP[i] = y;
  const MOON3 = (() => { const v = [-.35, .75, .55], l = Math.hypot(...v); return v.map(c => c / l); })();
  // the jet's lights in model metres: nav red (port, left), green (starboard, right), white tail; strobes; belly beacon; landing lights
  const LT3 = { red:[-32.4, 1.6, -10.4], green:[32.4, 1.6, -10.4], tail:[0, 2.1, -36], sL:[-32.6, 1.6, -11], sR:[32.6, 1.6, -11], sT:[0, 2, -36.2], bcn:[0, -3.9, 4], land:[[-4.8, -1.7, 11.4], [4.8, -1.7, 11.4], [0, -4.7, 26.6]] };

  // the raster buffer: one canvas the size of the game canvas (resized, never re-created), its pixels, a z-buffer and a group buffer.
  // willReadFrequently keeps it in CPU memory: putImageData into a GPU canvas cost ~1.7 ms a call, this way ~0.07 ms
  let PB = null;
  function pbuf(){ if(typeof cv === 'undefined' || !cv) return null; if(!PB){ const c = document.createElement('canvas'); PB = { c, k:c.getContext('2d', { willReadFrequently:true }), w:0, h:0, d:null }; }
    if(PB.w !== cv.width || PB.h !== cv.height){ PB.w = PB.c.width = cv.width; PB.h = PB.c.height = cv.height; PB.img = PB.k.createImageData(PB.w, PB.h); PB.u = new Uint32Array(PB.img.data.buffer); PB.z = new Float32Array(PB.w * PB.h); PB.g = new Uint8Array(PB.w * PB.h); PB.d = null; }
    return PB; }
  function pbClear(B){ const d = B.d; if(!d) return; for(let y = d[1]; y <= d[3]; y++){ const r = y * B.w; B.u.fill(0, r + d[0], r + d[2] + 1); B.z.fill(0, r + d[0], r + d[2] + 1); B.g.fill(0, r + d[0], r + d[2] + 1); } B.d = null; }
  // palette per fog step: the ramp and the fixed colours mixed toward the haze, as packed RGBA
  let PALS = new Map();
  function pal3(fog){ const q = Math.round(fog * 10), key = low + q; let P = PALS.get(key); if(P) return P; if(PALS.size > 40) PALS = new Map();
    P = new Uint32Array(11); RAMP.concat(FIXC).forEach((c, i) => { const v = hx(fc(c, q / 10)); P[i] = (255 << 24 | v[2] << 16 | v[1] << 8 | v[0]) >>> 0; }); PALS.set(key, P); return P; }
  // a triangle on the grid: barycentric edge walk over its clamped box, depth = 1/z (linear in screen space), checker dither c0/c1
  function rtri(B, x0, y0, w0, x1, y1, w1, x2, y2, w2, c0, c1, g, flat){
    const A = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0); if(A > -1e-6 && A < 1e-6) return;
    const mnx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), mxx = Math.min(B.w - 1, Math.ceil(Math.max(x0, x1, x2))), mny = Math.max(0, Math.floor(Math.min(y0, y1, y2))), mxy = Math.min(B.h - 1, Math.ceil(Math.max(y0, y1, y2)));
    if(mnx > mxx || mny > mxy) return; const ia = 1 / A, u = B.u, zb = B.z, gb = B.g, bw = B.w; let hit = false;
    const a0 = -(y2 - y1) * ia, a1 = -(y0 - y2) * ia, a2 = -(y1 - y0) * ia;
    for(let y = mny; y <= mxy; y++){ const py = y + .5, px = mnx + .5;
      let l0 = ((x2 - x1) * (py - y1) - (y2 - y1) * (px - x1)) * ia, l1 = ((x0 - x2) * (py - y2) - (y0 - y2) * (px - x2)) * ia, l2 = ((x1 - x0) * (py - y0) - (y1 - y0) * (px - x0)) * ia, i = y * bw + mnx;
      for(let x = mnx; x <= mxx; x++, i++, l0 += a0, l1 += a1, l2 += a2){ if(l0 < 0 || l1 < 0 || l2 < 0) continue;
        if(flat){ u[i] = c0; gb[i] = 1; hit = true; continue; }
        const w = l0 * w0 + l1 * w1 + l2 * w2; if(w > zb[i]){ zb[i] = w; u[i] = ((x + y) & 1) ? c1 : c0; gb[i] = g; hit = true; } } }
    if(hit){ const d = B.d; if(!d) B.d = [mnx, mny, mxx, mxy]; else { if(mnx < d[0]) d[0] = mnx; if(mny < d[1]) d[1] = mny; if(mxx > d[2]) d[2] = mxx; if(mxy > d[3]) d[3] = mxy; } } }
  // the jet's pose this frame: centre in true camera units (x right, y up, z ahead), rotation, and the curve/hill shift of its depth
  // (a jet flies straight: its x ignores the road's curve; only the hills' vertical shift is taken from the road at its depth)
  function jetPose(J2){ const H_W = H / W, X = J2.x - playerX * ROADW, Z = J2.z - position, Y = (J2.alt - CAMH) * H_W;
    const th = Math.atan2(J2.vy * H_W, Math.hypot(J2.vx, J2.vz)) + (J2.aoa === undefined ? .07 : J2.aoa), ps = Math.atan2(J2.vx, J2.vz), ph = J2.roll;
    const cr = Math.cos(ph), sr = Math.sin(ph), cp = Math.cos(th), sp = Math.sin(th), cy = Math.cos(ps), sy = Math.sin(ps);
    const rot = (x, y, z) => { const x1 = x * cr + y * sr, y1 = -x * sr + y * cr, y2 = y1 * cp + z * sp, z2 = -y1 * sp + z * cp; return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy]; };
    const m = [...rot(1, 0, 0), ...rot(0, 1, 0), ...rot(0, 0, 1)], f = DEPTH * W / 2; let sx = 0, sy2 = 0;
    if(Z > 1500){ const a = projSeg(J2.x, J2.z, J2.alt); if(a){ const k = clamp((Z - 1500) / 3000, 0, 1); sy2 = (a.y - (H / 2 - PITCH - f * Y / Z)) * k; } }
    return { X, Y, Z, m, f, sx, sy:sy2, fwd:[m[6], m[7], m[8]], ge:J2.ge === undefined ? 1 : J2.ge }; }
  // model point -> camera space (true units)
  const toCam = (P, x, y, z) => { const m = P.m; return [P.X + (m[0] * x + m[3] * y + m[6] * z) * KM, P.Y + (m[1] * x + m[4] * y + m[7] * z) * KM, P.Z + (m[2] * x + m[5] * y + m[8] * z) * KM]; };
  const scr = (P, c) => [W / 2 + P.f * c[0] / c[2] + P.sx, H / 2 - PITCH - P.f * c[1] / c[2] + P.sy];
  const ZN = 90, CX = new Float32Array(24), CY = new Float32Array(24), CZ = new Float32Array(24), QX = new Float32Array(24), QY = new Float32Array(24), QW = new Float32Array(24);
  let rStats = { faces:0, px:0 };
  // render the jet (shadow = its ground shadow, flat, cast by a light from behind and above so it runs ahead of the jet)
  function render3d(P, shadow, fog){
    const B = pbuf(); if(!B) return null; pbClear(B); const m = P.m, gH = -CAMH * H / W, LZ = 1.5, LX = -.25, pal = pal3(fog || 0), inv = 1 / PX, f = P.f, hx0 = W / 2, hy0 = H / 2 - PITCH;
    const ge = P.ge === undefined ? 1 : P.ge;
    for(let i = 0; i < NV; i++){ const v = MV[i], gt = GTOP[i], v1 = ge < 1 && gt === gt ? gt + (v[1] - gt) * ge : v[1]; let x = P.X + (m[0] * v[0] + m[3] * v1 + m[6] * v[2]) * KM, y = P.Y + (m[1] * v[0] + m[4] * v1 + m[7] * v[2]) * KM, z = P.Z + (m[2] * v[0] + m[5] * v1 + m[8] * v[2]) * KM;
      if(shadow){ const t = y - gH; x += LX * t; z += LZ * t; y = gH; } VX[i] = x; VY[i] = y; VZ[i] = z; }
    let nf = 0;
    for(let fi = 0; fi < MF.length; fi++){ const F = MF[fi], ids = F.i, n = F.n;
      if(shadow && (n[1] > -.2 || F.g === 4 || F.g === 6 || F.g === 7 || F.col)) continue;
      if(F.g === 4 && ge < .08) continue;   // the gear is stowed
      const wx = m[0] * n[0] + m[3] * n[1] + m[6] * n[2], wy = m[1] * n[0] + m[4] * n[1] + m[7] * n[2], wz = m[2] * n[0] + m[5] * n[1] + m[8] * n[2];
      let c0 = 0, c1 = 0;
      if(!shadow){ let mx = 0, my = 0, mz = 0; for(const k of ids){ mx += VX[k]; my += VY[k]; mz += VZ[k]; } if(wx * mx + wy * my + wz * mz >= 0) continue;   // back face
        if(F.col){ c0 = c1 = pal[F.col]; }
        else { let t = F.b + 3 * Math.max(0, -wy) + 1.1 * Math.max(0, wx * MOON3[0] + wy * MOON3[1] + wz * MOON3[2]); t = clamp(t, 1, 5); const lo = Math.floor(t), fr = t - lo;
          c0 = pal[fr > .62 ? Math.min(5, lo + 1) : lo]; c1 = fr > .38 && fr <= .62 ? pal[Math.min(5, lo + 1)] : c0; } }
      // clip against the near plane (Sutherland-Hodgman), then project and fan
      let n2 = 0; const L = ids.length;
      for(let k = 0; k < L; k++){ const a = ids[k], b = ids[(k + 1) % L], za = VZ[a], zb = VZ[b], ina = za >= ZN, inb = zb >= ZN;
        if(ina){ CX[n2] = VX[a]; CY[n2] = VY[a]; CZ[n2] = za; n2++; }
        if(ina !== inb){ const t = (ZN - za) / (zb - za); CX[n2] = VX[a] + (VX[b] - VX[a]) * t; CY[n2] = VY[a] + (VY[b] - VY[a]) * t; CZ[n2] = ZN; n2++; } }
      if(n2 < 3) continue; let allL = true, allR = true, allU = true, allD = true;
      for(let k = 0; k < n2; k++){ const iz = 1 / CZ[k], x = (hx0 + f * CX[k] * iz + P.sx) * inv, y = (hy0 - f * CY[k] * iz + P.sy) * inv; QX[k] = x; QY[k] = y; QW[k] = iz;
        if(x >= 0) allL = false; if(x < B.w) allR = false; if(y >= 0) allU = false; if(y < B.h) allD = false; }
      if(allL || allR || allU || allD) continue; nf++;
      for(let k = 1; k + 1 < n2; k++) rtri(B, QX[0], QY[0], QW[0], QX[k], QY[k], QW[k], QX[k + 1], QY[k + 1], QW[k + 1], shadow ? 0xff0a0604 : c0, c1, F.g, shadow); }
    rStats.faces = nf; const d = B.d; if(!d) return null; rStats.d = d.slice();
    if(!shadow){   // outline: empty pixels touching the jet; internal lines where a nearer group crosses a farther one (only once it is big)
      const x0 = Math.max(0, d[0] - 1), y0 = Math.max(0, d[1] - 1), x1 = Math.min(B.w - 1, d[2] + 1), y1 = Math.min(B.h - 1, d[3] + 1), u = B.u, g = B.g, z = B.z, w = B.w, O = pal[0], inner = (d[2] - d[0]) > 40;
      for(let y = y0; y <= y1; y++) for(let x = x0, i = y * w + x0; x <= x1; x++, i++){ const gi = g[i];
        if(gi === 0){ if((x > 0 && g[i - 1] && g[i - 1] < 200) || (x < w - 1 && g[i + 1] && g[i + 1] < 200) || (y > 0 && g[i - w] && g[i - w] < 200) || (y < B.h - 1 && g[i + w] && g[i + w] < 200)){ u[i] = O; g[i] = 200; } }
        else if(inner && gi < 200){ const zz = z[i] * 1.025; if((x > 0 && g[i - 1] && g[i - 1] < 200 && g[i - 1] !== gi && z[i - 1] > zz) || (y > 0 && g[i - w] && g[i - w] < 200 && g[i - w] !== gi && z[i - w] > zz) || (x < w - 1 && g[i + 1] && g[i + 1] < 200 && g[i + 1] !== gi && z[i + 1] > zz) || (y < B.h - 1 && g[i + w] && g[i + w] < 200 && g[i + w] !== gi && z[i + w] > zz)) u[i] = O; } }
      d[0] = x0; d[1] = y0; d[2] = x1; d[3] = y1; }
    rStats.px = (d[2] - d[0] + 1) * (d[3] - d[1] + 1);
    const bw = d[2] - d[0] + 1, bh = d[3] - d[1] + 1; B.k.putImageData(B.img, 0, 0, d[0], d[1], bw, bh);
    cx.imageSmoothingEnabled = false; cx.drawImage(B.c, d[0], d[1], bw, bh, d[0] * PX, d[1] * PX, bw * PX, bh * PX); return d; }

  // things drawn in depth order among the road's own sprites: each goes in at the first segment no farther than it; z < 0 = overlay
  let depthItems = [], depthFrame = -1;
  function frameItems(now){ depthFrame = now; depthItems = []; if(!jet || !jet.cur) return; const c = jet.cur, J2 = c.J, ht = J2.alt * H / W, yaw = Math.atan2(J2.vx, J2.vz);
    const zs = J2.z + ht * 1.5, pl = ht * 4.2, zp = J2.z + pl * Math.cos(yaw);
    if(J2.alt < 7000 && zs - position > -6000) depthItems.push({ z:zs - position < 5000 ? -1e9 : zs + 5800, fn:drawJetShadow });   // sweeping over the bike: over everything
    if(zp - position > 400) depthItems.push({ z:zp, x:J2.x + pl * Math.sin(yaw), fn:drawPool });
    // the jet at its depth among the road's sprites: in at the segment of its nearest point (tail first as it climbs away), so a gantry, sign,
    // lamp or Haneda pillar nearer than it is drawn over it; over everything only once it is overhead (its nearest point within 1500)
    { const zN = J2.z - 5600 * Math.cos(yaw); depthItems.push({ z:zN - position < 1500 ? -2e9 : zN, fn:drawJet }); }
    depthItems.sort((a, b) => b.z - a.z); }
  // a landing light as a hard pixel star: square core, short cross arms, a stepped halo
  function star(x, y, c, col, a){ const q = Math.max(PX, Math.round(c / PX) * PX); cx.fillStyle = '#ffffff'; cx.fillRect(Math.round(x - q), Math.round(y - q / 2), q * 2, q); cx.fillRect(Math.round(x - q / 2), Math.round(y - q), q, q * 2);
    cx.fillStyle = col; cx.fillRect(Math.round(x - q * 2.5), Math.round(y - PX / 2), q * 5, PX); cx.fillRect(Math.round(x - PX / 2), Math.round(y - q * 1.8), PX, q * 3.6); glow(x, y, q * 6, col, a); }
  const snapP = v => Math.round(v / PX) * PX;
  function dotL(x, y, r, col){ const q = Math.max(PX, snapP(r)); cx.fillStyle = col; cx.fillRect(snapP(x - q / 2), snapP(y - q / 2), q, q); }
  // in the climb-out it hazes over (fog toward JL) and fades (fa) as it dwindles: drawn whole through one alpha, lights included
  function drawJet(it){ if(!jet || !jet.cur) return; const fa = jet.cur.J.fa === undefined ? 1 : jet.cur.J.fa; if(fa <= .004) return; if(fa < 1) cx.globalAlpha = fa; drawJet0(it); cx.globalAlpha = 1; }
  function drawJet0(it){ const J2 = jet.cur.J, P = jetPose(J2); if(P.Z < -40000) return;
    const k = P.Z > ZN ? P.f * KM / P.Z : 1e9, span = 64 * k, fog = Math.max(clamp((P.Z - 6000) / 90000, 0, .5), J2.haze || 0), t = jet.t;
    if(P.Z > ZN){ const c = scr(P, [P.X, P.Y, P.Z]); if(c[0] < -span * 1.5 || c[0] > W + span * 1.5 || c[1] > H + span) return; }
    if(span > PX * 5 && !(it && it.lightsOnly)) render3d(P, false, fog);
    if(it && it.bodyOnly) return;
    // lights (drawn over the body; the camera is always below it, so all of these face us)
    const far = clamp((260 - span) / 200, 0, 1), r0 = clamp(Math.max(k * .32, PX * (1 + far * .6)), PX, PX * 3), dim = 1 - fog * .5, L = mp => { const c = toCam(P, mp[0], mp[1], mp[2]); return c[2] > ZN ? scr(P, c) : null; };
    const strobe = !reduce && (t % 1.2 < .06 || (t % 1.2 > .14 && t % 1.2 < .2)), beacon = !reduce && t % 1.4 < .18;
    for(const [mp, col] of [[LT3.red, '#ff3a3a'], [LT3.green, '#3aff6a'], [LT3.tail, '#e8f0ff']]){ const p = L(mp); if(p){ dotL(p[0], p[1], r0, col); glow(p[0], p[1], r0 * (5 + far * 3), col, (.4 + far * .2) * dim); } }
    for(const mp of [LT3.sL, LT3.sR, LT3.sT]){ const p = L(mp); if(!p) continue; if(strobe) star(p[0], p[1], r0, '#e8f0ff', .6); else if(reduce) glow(p[0], p[1], r0 * 3, '#ffffff', .18); }
    { const p = L(LT3.bcn); if(p){ if(beacon){ glow(p[0], p[1], r0 * 7, '#ff2a2a', .65); dotL(p[0], p[1], r0 * 1.6, '#ff6a4a'); } else { dotL(p[0], p[1], r0, '#8a1a1a'); if(reduce || far > 0) glow(p[0], p[1], r0 * 4, '#ff2a2a', reduce ? .2 : .15 * far); } } }
    // landing lights: aimed ahead and down, so from behind they are hot cores with a warm spill; far off they merge into one star
    if(span < 260){ const p = L([0, -2.5, 16]); if(p){ star(p[0], p[1], PX * (1 + far), '#fff4dc', (.25 + .3 * far) * dim); glow(p[0], p[1], PX * (10 + 14 * far), '#ffe8c0', .12 * dim); } }
    if(span > 120) for(const mp of LT3.land){ const p = L(mp); if(p){ dotL(p[0], p[1], r0 * 1.4, '#fff8e8'); glow(p[0], p[1], r0 * 6, '#ffe8c0', .35 * dim); } }
  }
  function drawJetShadow(){ if(!jet || !jet.cur) return; const P = jetPose(jet.cur.J), ht = jet.cur.J.alt * H / W, zs = jet.cur.J.z + ht * 1.5, xs = jet.cur.J.x - ht * .25;
    // the shadow lies on the road: lift it by the road's own hills at the shadow's depth (a jet flies straight: no curve shift)
    const a = projSeg(xs, zs, 0), Z = zs - position, f = P.f; P.sx = P.sy = 0;
    if(a && Z > 1500){ const k = clamp((Z - 1500) / 3000, 0, 1); P.sy = (a.y - (H / 2 - PITCH + f * CAMH * H / W / Z)) * k; }
    const fade = clamp(1 - (jet.cur.J.alt - 4500) / 2500, 0, 1) * clamp(1 - (Z - 20000) / 25000, 0, 1) * (jet.cur.J.fa === undefined ? 1 : jet.cur.J.fa); if(fade <= 0) return;
    cx.globalAlpha = .5 * fade; render3d(P, true); cx.globalAlpha = 1; }
  // the landing-light pool on the road ahead of it, and the beams from the lamps down to it through the haze
  function drawPool(it){ const g = proj(it.x, it.z, 0); if(!g || !jet || !jet.cur) return; g.x = W / 2 + g.sc * (it.x - playerX * ROADW) * W / 2;  /* straight, like the jet */ const zr = it.z - position, rw = 5600 * g.sc * W / 2;
    const a = .75 * clamp(1 - (zr - 4000) / 50000, 0, 1) * clamp((zr - 400) / 1500, 0, 1) * clamp(1 - (jet.cur.J.alt - 4500) / 2500, 0, 1) * (jet.cur.J.fa === undefined ? 1 : jet.cur.J.fa); if(rw < 4 || a <= 0 || g.y > H + rw * .3) return;
    cx.globalCompositeOperation = 'lighter';
    const P = jetPose(jet.cur.J); for(const mp of LT3.land.slice(0, 2)){ const c = toCam(P, mp[0], mp[1], mp[2]), bA = a * clamp((c[2] - 1200) / 3000, 0, 1); if(bA <= 0) continue; const s = scr(P, c);   // beams only once the lamp is ahead of us
      for(const [wf, al] of [[1, .045], [.5, .06]]){ cx.fillStyle = `rgba(255,236,200,${(bA * al * 2).toFixed(3)})`; cx.beginPath(); cx.moveTo(s[0], s[1]); cx.lineTo(g.x - rw * wf * .9, g.y); cx.lineTo(g.x + rw * wf * .9, g.y); cx.closePath(); cx.fill(); } }
    for(const [f, m] of [[1, .08], [.66, .14], [.36, .26]]){ cx.fillStyle = `rgba(255,240,210,${(a * m).toFixed(3)})`; cx.beginPath(); cx.ellipse(Math.round(g.x), Math.round(g.y), Math.max(PX, rw * f), Math.max(PX, rw * f * .22), 0, 0, 6.283); cx.fill(); }
    cx.globalCompositeOperation = 'source-over'; }
  J.drawBackdrop = o => { low = o.sk.low; camDown(); frameItems(o.now); };   // once per frame, before any segment

  // ---------------------------------------------------------------- overlay: the camera lifts and rolls in the air; jet up close
  let buf = null;
  J.overlay = (now, sk) => {
    for(const it of depthItems) if(!it.done){ it.done = true; it.fn(it); }
    drawShards();
    // (the jet routes itself here when it is overhead or above the skyline at its depth: see frameItems)
    camApply();
    if(jh <= 0 || !air || air.att) return;
    const u = clamp(((position + PZ) / SEG - air.lip) / air.len, 0, 1), lift = 0, ang = reduce ? 0 : tiltSgn * .045 * Math.sin(Math.PI * u);
    if(Math.abs(ang) < .002) return;
    if(!buf) buf = document.createElement('canvas'); if(buf.width !== cv.width || buf.height !== cv.height){ buf.width = cv.width; buf.height = cv.height; }
    const b = buf.getContext('2d'); b.clearRect(0, 0, buf.width, buf.height); b.drawImage(cv, 0, 0);
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false; cx.drawImage(buf, 0, 0);
    const zoom = 1 + Math.abs(ang) * 1.5 + .015; cx.translate(cv.width / 2, cv.height / 2 + Math.round(lift / PX)); cx.rotate(ang); cx.scale(zoom, zoom); cx.drawImage(buf, -cv.width / 2, -cv.height / 2);
    cx.restore();
    // wind lines at the top of the arc
    if(!reduce){ const k = Math.sin(Math.PI * u); cx.fillStyle = `rgba(255,240,220,${.18 * k})`; for(let n = 0; n < 14; n++){ const yy = (hash(n * 3.3) * H + now * .9 * (1 + hash(n))) % H, xx = hash(n * 7.1) < .5 ? hash(n) * W * .25 : W - hash(n) * W * .25; cx.fillRect(Math.round(xx), Math.round(yy), PX, Math.round(H * .06)); } }
  };
})();
