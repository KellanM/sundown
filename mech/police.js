/* Sundown mechanic module: police roadblocks (検問) and spike strips. See mech/README.md.

   References studied (rules taken, no art copied):
   - Chase H.Q. (Taito 1988): the target is called out on screen ("CRIMINALS HERE!" arrow) before you reach it; the
     danger is always visible down the road first, then named by the HUD.
   - Tokyo MPD Toyota Crown patrol cars (GRS214 / S210 photos): the "panda" livery - white roof, pillars and upper doors,
     black lower body, a black nose wedge up onto the hood, black bumpers; a long red roof bar with a clear centre;
     a gold emblem and white POLICE lettering on the black door.
   - MPD checkpoint van and Fukushima Route 6 checkpoint photos: officers in white helmets, dark uniforms and white
     reflective cross-belts, each waving a red light baton (誘導灯) toward the open lane; red/white barricades and cones.
   - Israel Police / West Midlands "Stinger" spike-strip photos: a yellow accordion lattice with steel teeth, thrown
     from the roadside on a cord by an officer standing on the shoulder.
   Rules: one texel density for every police sprite (11 px per metre, like the traffic), dark-hue outlines, 3-tone ramps,
   stepped glows; lights alternate halves about once a second (never a strobe) and hold steady under `reduce`.
   Design rules: every roadblock leaves one clear lane, flanked by officers with glowing batons; it is placed 2-4 s
   ahead, named by a radio crackle and a HUD plate that shows which lane is open. Spike strips never cover more than two
   lanes, are thrown in full view, and running over one costs speed, never the run. Threading a roadblock while chased
   ends the chase with a big boost; hitting it while chased is the second strike (pulled over). Unchased, a roadblock is a
   checkpoint (検問): slip through for a small boost, clip it and you only lose your speed - it never starts a chase. */
"use strict";
(() => {
const P = MECH.police = {};

/* ---------------- tuning ---------------- */
const T = {
  pBlock:.6, pSpike:.3,          // per chase: chance of a roadblock, else chance of a spike strip
  blockAhead:[115, 145],          // segments ahead a roadblock is placed (2.2-2.8 s at full speed, 3-4 s just after a crash)
  spikeAhead:[110, 140],
  gap:.34,                        // half-width of the open lane, in half-road widths, for the bike's centre
  checkRate:1 / 100, checkAfter:45, checkGap:75,   // a rare checkpoint when you are not being chased
  flat:1.5,                       // seconds of flat-tyre wobble after spikes
};
const PXM = 60;   // sprite pixels per half-road width (11.4 px per metre): one texel density for every police sprite

/* ---------------- palette ---------------- */
const C = {
  K:'#0a0810', w:'#ecE8f0', W:'#bcb8cc', V:'#7c7894', N:'#1e1c28', n:'#3c3a52', k:'#0e0c14',
  G:'#18203a', g:'#3c4a7a', h:'#8a96c4', T:'#16141a', t:'#3e3a48', S:'#b4b0c0', s:'#5a5668',
  Y:'#fff4c0', A:'#ff9a2a', E:'#c01828', P:'#ffd04a', L:'#d8d4e0', x:'#3a3844', c:'#e8e0f0',
  red:'#ff2a3a', redD:'#5a1018', amber:'#ffb020', amberD:'#5a3010',
};
const reduceOn = () => typeof reduce !== 'undefined' && reduce;

/* ---------------- sprites (cached in SPR) ---------------- */
function grid(key, w, h, fn){ return procSprite('pol:' + key, w, h, fn); }
function flipped(key, src){ const k = 'pol:' + key + ':flip'; if(SPR[k]) return SPR[k]; const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return SPR[k] = c; }

/* (The roadblock's cars are the ray-cast Crown below, the same model that chases you; the old hand-drawn 56 x 22 side sprite is gone.) */

/* Sawhorse barricade: red/white board, splayed legs, an amber lamp on top. 22 x 15. */
const SAW = ['.........KK', '........KAA', '........KAa', '.........KK', '..........K', 'KKKKKKKKKKK', 'KwwRRwwRRww', 'KwRRwwRRwwR', 'KRRwwRRwwRR', 'KKKKKKKKKKK', '.KVK.....KV', '.KVK.....KV', 'KVK.......K', 'KVK........', 'KK.........'];
function sawSpr(on){ const k = 'pol:saw' + on; return SPR[k] || (SPR[k] = makeSprite(SAW, { K:C.K, w:'#e8e4ec', R:'#d02838', V:'#8a8698', A:on ? C.amber : C.amberD, a:on ? '#ffe080' : '#3a2008' })); }

/* The officers' palette and painter (the chibi officer itself is below, after the canvas size). */
const OFFPAL = { H:'#ffffff', M:'#eef1f6', o:'#c4c8d6', P:'#ff8aa0', d:'#141732', N:'#222a52', n:'#323d72', m:'#4a5894', k:'#08070c', q:'#34344a', Y:'#ffd04a', y:'#b07a10', h:'#1c1618',
  s:'#e8b48e', S:'#c48464', T:'#8e5640', E:'#1a1012', L:'#9ec6e8', X:'#eef2ea', x:'#9aa49a', G:'#f6f4f0', g:'#c4c2d0', B:'#121018', b:'#d8d4e0',
  R:'#ff3a3a', r:'#ffe0d8', Q:'#a01828' };
// paint into a char grid with rects, then outline every edge pixel-out in a dark version of the colour it borders (the game's rule)
function paintFig(key, w, h, pal, fn){ if(SPR[key]) return SPR[key]; const g = Array.from({ length:h }, () => new Array(w).fill(''));
  const R = (x, y, ww, hh, c) => { for(let j = y; j < y + hh; j++) for(let i = x; i < x + ww; i++) if(i >= 0 && j >= 0 && i < w && j < h) g[j][i] = c; };
  const D = (x0, y0, x1, y1, c, t) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for(let i = 0; i <= n; i++) R(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), t || 1, 1, c); };
  fn(R, D);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let col = g[y][x] ? pal[g[y][x]] || g[y][x] : null;
    if(!col){ const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].map(([i, j]) => i >= 0 && j >= 0 && i < w && j < h ? g[j][i] : '').find(v => v); if(nb) col = mixc(pal[nb] || nb, '#06050c', .78); }
    if(col){ k.fillStyle = col; k.fillRect(x, y, 1, 1); } }
  return SPR[key] = c; }
const OW = 24, OH = 32, OX = 6, OY = 8;   // the body's origin inside the canvas (room for a reaching arm on the left, a pointing hand on the right, a raised baton above)
/* The officer: tiny chibi, native small pixel art the size of the rider on the bike - a 9-row head on a 13-row body (about 2.4 heads,
   22 rows in all) - a stubby little figure that scurries round the car. MPD kit from the reference photos: navy peaked cap with the black
   visor and a gold badge pixel, light-blue collar, navy jacket, white reflective X, black belt, and the white surgical mask many Japanese
   officers wear (nose and mouth covered, ear loops). Anger reads through the brows and squinted eyes; the shout is the mask puffing out
   (the anger mark is a separate sprite). Big white gloves, chunky boots, 4-tone ramps, outlined in a dark version of what each edge borders.
   pose: idle | look | radio | point | reach | escort | head | cuff | kneel | kneel2 | run | wave0 | wave1;  f: walk / run frame 0-3. */
function officerSpr(pose, f, face){ return paintFig('pol:of:' + pose + (f || 0) + (face || ''), OW, OH, OFFPAL, (R, D) => {
  const run = pose === 'run', kneel = pose === 'kneel' || pose === 'kneel2', walk = pose === 'idle' || pose === 'escort' || pose === 'look' || pose === 'head' || run ? (f || 0) : 0;
  const bob = walk % 2 ? -1 : 0, X = OX, Y = OY + bob, U = Y + (kneel ? 3 : 0), liftL = [0, run ? 2 : 1, 0, 0][walk], liftR = [0, 0, 0, run ? 2 : 1][walk];
  // legs and boots
  const leg = (x, lift, shade) => { R(X + x, Y + 16, 2, 3 - lift, 'N'); R(X + x + (shade ? 1 : 0), Y + 16, 1, 3 - lift, shade ? 'd' : 'n');
    R(X + x - 1, Y + 19 - lift - bob, 4, 3, 'k'); R(X + x - 1, Y + 19 - lift - bob, 1, 1, 'q'); };
  if(kneel){ R(X + 2, Y + 19, 3, 1, 'N'); R(X + 1, Y + 20, 5, 2, 'k'); R(X + 7, Y + 18, 2, 2, 'N'); R(X + 6, Y + 20, 4, 2, 'k'); R(X + 7, Y + 20, 1, 1, 'q'); }   // one knee down, one up
  else { leg(3, liftL, false); leg(7, liftR, true); }
  // the little round body: jacket, collar, the reflective X, belt and buckle
  R(X + 2, U + 9, 8, 1, 'N'); R(X + 1, U + 10, 10, 5, 'N'); R(X + 2, U + 15, 8, 1, 'B'); R(X + 1, U + 10, 1, 5, 'm'); R(X + 10, U + 10, 1, 5, 'd');
  R(X + 4, U + 9, 4, 1, 'L'); D(X + 2, U + 10, X + 8, U + 14, 'X'); D(X + 9, U + 10, X + 3, U + 14, 'X'); R(X + 5, U + 12, 2, 1, 'Y'); R(X + 5, U + 15, 2, 1, 'b'); R(X + 9, U + 10, 1, 1, 'k');
  // the head: cap (navy dome, a gold badge pixel, black band and visor), a round face, the surgical mask with its ear loops
  const angry = face === 'angry', lk = pose === 'look' ? -1 : pose === 'radio' || pose === 'point' ? 1 : 0;
  R(X + 1, U + 4, 10, 4, 's'); R(X + 2, U + 8, 8, 1, 's'); R(X + 9, U + 4, 2, 4, 'S'); R(X, U + 4, 1, 2, 'h'); R(X + 11, U + 4, 1, 2, 'h');
  if(angry){ R(X + 2 + lk, U + 4, 2, 1, 'h'); R(X + 4 + lk, U + 5, 1, 1, 'h'); R(X + 8 + lk, U + 4, 2, 1, 'h'); R(X + 7 + lk, U + 5, 1, 1, 'h'); R(X + 3 + lk, U + 5, 1, 1, 'E'); R(X + 8 + lk, U + 5, 1, 1, 'E'); R(X + 3 + lk, U + 4, 1, 1, 'S'); }   // brows slammed down, eyes squinting
  else { R(X + 3 + lk, U + 4, 1, 2, 'E'); R(X + 8 + lk, U + 4, 1, 2, 'E'); R(X + 2 + lk, U + 4, 1, 1, 'S'); R(X + 9 + lk, U + 4, 1, 1, 'S'); }
  R(X + 2, U + 6, 8, 2, 'M'); R(X + 3, U + 8, 6, 1, 'M'); R(X + 3, U + 8, 6, 1, 'o'); R(X + 4, U + 6, 4, 1, 'H'); R(X + 1, U + 5, 1, 2, 'o'); R(X + 10, U + 5, 1, 2, 'o');   // the mask, its pleat and loops
  if(angry){ R(X + 2, U + 8, 8, 1, 'M'); R(X + 3, U + 9, 6, 1, 'M'); R(X + 4, U + 9, 4, 1, 'o'); R(X + 1, U + 7, 1, 1, 'M'); R(X + 10, U + 7, 1, 1, 'M'); }   // the shout puffs the mask out
  R(X + 3, U, 6, 1, 'n'); R(X + 1, U + 1, 10, 1, 'N'); R(X + 2, U + 1, 2, 1, 'm'); R(X + 5, U + 1, 2, 1, 'Y'); R(X + 1, U + 2, 10, 1, 'k'); R(X, U + 3, 12, 1, 'k'); R(X + 1, U + 3, 3, 1, 'q');
  // stubby arms, big gloves
  const glove = (x, y) => { R(x, y, 3, 2, 'G'); R(x + 2, y + 1, 1, 1, 'g'); };
  const armDown = (x, sw, shade) => { R(X + x, U + 10, 2, 3 - sw, 'N'); glove(X + x - (shade ? 0 : 1), U + 13 - sw); };
  const sw = pose === 'escort' || pose === 'idle' || pose === 'look' || pose === 'head' ? [0, 1, 0, 0][walk] : 0, sw2 = pose === 'idle' || pose === 'look' ? [0, 0, 0, 1][walk] : 0;
  if(run){ if(walk >= 2){ R(X, U + 10, 2, 2, 'N'); glove(X + 1, U + 11); } else { R(X - 1, U + 10, 2, 3, 'N'); glove(X - 3, U + 12); }
    if(walk <= 1){ R(X + 10, U + 10, 2, 2, 'N'); glove(X + 8, U + 11); } else { R(X + 11, U + 10, 2, 3, 'N'); glove(X + 12, U + 12); } return; }
  if(kneel){ const lo = pose === 'kneel2' ? 1 : 0; R(X - 1, U + 10, 2, 3, 'N'); R(X + 11, U + 10, 2, 3, 'N');
    if(lo){ glove(X + 2, U + 14); glove(X + 7, U + 14); } else { glove(X - 1, U + 13); glove(X + 10, U + 13); } return; }   // pressing down on the back
  if(pose === 'head'){ D(X, U + 10, X - 3, U + 5, 'N', 2); glove(X - 6, U + 2); }   // a hand down on the rider's helmet
  else if(pose === 'reach' || pose === 'escort'){ R(X - 4, U + 11, 5, 2, 'N'); glove(X - 7, U + (pose === 'escort' ? 9 : 10)); }
  else if(pose === 'cuff'){ R(X - 1, U + 10, 2, 2, 'N'); R(X + 11, U + 10, 2, 2, 'N'); glove(X + 2, U + 12); glove(X + 7, U + 12); }
  else armDown(-1, sw, false);
  if(pose === 'radio'){ R(X + 11, U + 10, 2, 2, 'N'); glove(X + 8, U + 8); }
  else if(pose === 'point'){ R(X + 11, U + 11, 4, 2, 'N'); glove(X + 15, U + 10); R(X + 18, U + 11, 1, 1, 'G'); }
  else if(pose === 'wave0'){ R(X + 11, U + 5, 2, 6, 'N'); glove(X + 10, U + 3); R(X + 11, U - 7, 2, 10, 'R'); R(X + 11, U - 7, 1, 10, 'r'); R(X + 11, U + 1, 2, 2, 'Q'); }
  else if(pose === 'wave1'){ R(X + 11, U + 10, 4, 2, 'N'); glove(X + 14, U + 9); D(X + 16, U + 9, X + 18, U + 1, 'R'); D(X + 15, U + 9, X + 17, U + 1, 'r'); }
  else if(pose !== 'cuff') armDown(11, sw2, true); }); }
// the flying tackle, side-on, nose to the right: 30 x 16 - a big head (cap, mask, a furious brow), a little body flat out, gloves first
function officerDive(){ return paintFig('pol:dive', 30, 16, OFFPAL, (R, D) => {
  R(0, 5, 3, 3, 'k'); R(0, 10, 3, 3, 'k'); R(3, 6, 5, 2, 'N'); R(3, 10, 5, 2, 'N');   // stubby legs, boots
  R(8, 5, 8, 7, 'N'); R(8, 5, 8, 1, 'm'); R(8, 11, 8, 1, 'd'); D(9, 6, 14, 10, 'X'); R(8, 6, 1, 5, 'B');   // body
  R(16, 3, 8, 8, 's'); R(17, 2, 6, 1, 's'); R(16, 10, 1, 1, 'S');   // the head
  R(16, 0, 8, 2, 'N'); R(18, 0, 2, 1, 'Y'); R(16, 2, 9, 1, 'k'); R(23, 3, 4, 1, 'k');   // cap and visor
  R(21, 4, 2, 1, 'h'); R(22, 5, 1, 1, 'E'); R(20, 6, 6, 3, 'M'); R(20, 8, 6, 1, 'o'); R(25, 7, 1, 1, 'M');   // brow, eye, the mask puffed with the shout
  R(16, 11, 8, 2, 'N'); R(24, 10, 4, 4, 'G'); R(26, 13, 2, 1, 'g'); }); }   // gloves out front
// the anger mark: four red brackets round a point (7 x 7), two sizes for a throb
function veinSpr(big){ return paintFig('pol:vein' + (big ? 1 : 0), 7, 7, { R:'#ff2a3a', r:'#ffb0b0' }, R => { const o = big ? 0 : 1, e = 6 - o;
  for(const [x, y, dx, dy] of [[o, o, 1, 1], [e, o, -1, 1], [o, e, 1, -1], [e, e, -1, -1]]){ R(x + (dx > 0 ? 0 : -1), y, 2, 1, 'R'); R(x, y + (dy > 0 ? 0 : -1), 1, 2, 'R'); } }); }
const BATON_AT = { wave0:[[OX + 11.5, OY - 6], [OX + 11.5, OY - 2]], wave1:[[OX + 18, OY + 2], [OX + 17, OY + 5]] };
P.officer = officerSpr; P.officerDive = officerDive; P.vein = veinSpr; P.paint = paintFig; P.batonAt = p => BATON_AT[p] || []; P.OFFICER = { w:OW, h:OH, ox:OX, oy:OY, rows:22 };
// the roadblock officers: the same sprite at road scale, waving the baton (f: 0 up, 1 out)
const OFF_K = 21 / 22;   // keeps them the height the roadblock was laid out for (21 px of the old sprite; the little officer stands 22 rows)
function offSpr(f, face){ const s = officerSpr(f ? 'wave1' : 'wave0', 0); return face > 0 ? s : flipped('ofw' + f, s); }
const BATON = [BATON_AT.wave0, BATON_AT.wave1];

/* Pixel kanji 検問, 11 x 11 each, hand-set so they stay sharp at any size */
const KJ = {
  ken:['.X.....X...', '.X....X.X..', 'XXX..X...X.', '.XX.X.XXX.X', 'X.X........', '.X...XXXXX.', '.X...X.X.X.', '.X...XXXXX.', '.X....X.X..', '.X...X...X.', '.X..X.....X'],
  mon:['XXXX...XXXX', 'X..X...X..X', 'XXXX...XXXX', 'X..X...X..X', 'XXXX...XXXX', 'X.........X', 'X..XXXXX..X', 'X..X...X..X', 'X..XXXXX..X', 'X.........X', 'X.......XXX'] };
function kanji(col){ const k = 'pol:kj' + col; if(SPR[k]) return SPR[k]; const c = document.createElement('canvas'); c.width = 23; c.height = 11; const g = c.getContext('2d'); g.fillStyle = col;
  ['ken', 'mon'].forEach((n, i) => KJ[n].forEach((r, y) => [...r].forEach((ch, x) => { if(ch === 'X') g.fillRect(i * 12 + x, y, 1, 1); }))); return SPR[k] = c; }

/* Roadside sign: 検問 in red on a white board, red rim, on two legs. 27 x 22. */
function signSpr(){ return grid('sign', 27, 22, (x, y) => { if(y >= 15){ return (x === 5 || x === 21) ? C.V : (y === 21 && (x === 4 || x === 22) ? C.K : null); }
  if(x === 0 || x === 26 || y === 0 || y === 14) return C.K; if(x === 1 || x === 25 || y === 1 || y === 13) return '#d02838';
  const kx = x - 2, ky = y - 2, n = kx < 11 ? 'ken' : 'mon', cx2 = kx < 11 ? kx : kx - 12;
  if(ky >= 0 && ky < 11 && cx2 >= 0 && cx2 < 11 && KJ[n][ky][cx2] === 'X') return '#c01828'; return y < 7 ? '#ecE8f0' : '#d4d0dc'; }); }

/* Spike strip: yellow accordion lattice with steel teeth, 100 x 5 (cropped as it unrolls) */
const SW_ = 100;
function stripSpr(){ return grid('strip', SW_, 6, (x, y) => { const u = x % 4;
  if(y === 0) return u === 1 ? '#ffffff' : null; if(y === 1) return u === 1 ? '#c8c4d8' : u === 3 ? '#6a6680' : null; if(y === 2) return u === 1 || u === 3 ? '#6a6680' : null;
  if(y === 3) return x % 6 < 3 ? '#ffe070' : '#9a7014'; if(y === 4) return x % 6 >= 3 ? '#ffd04a' : '#7a5410'; return C.K; }); }
/* tiny 3x5 font for HUD labels (same shapes as the game HUD) */
const F3 = { '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111', '6':'111100111101111',
  '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111',
  H:'101101111101101', I:'111010010010111', K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100',
  R:'110101110101101', S:'011100010001110', T:'111010010010010', ' ':'000000000000000' };
function txt(s, col){ const k = 'pol:t' + s + col; if(SPR[k]) return SPR[k]; const c = document.createElement('canvas'); c.width = s.length * 4 + 1; c.height = 6; const g = c.getContext('2d');
  for(const [cc, o] of [['#000', 1], [col, 0]]){ g.fillStyle = cc; [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(n * 4 + i % 3 + o, (i / 3 | 0) + o, 1, 1); }); }
  return SPR[k] = c; }

/* The chase car seen from the rider looking back: a Toyota Crown patrol car head-on, a little from above. 40 x 24, left half
   mirrored (X/x lamps become Z/z, so each half of the bar flashes on its own). Read top to bottom: the long red bar on its
   stand with a clear centre and the 警察 roof board, white roof and pillars, dark windscreen, white bonnet with the black
   panda nose wedging up its middle, chrome grille with the gold sakura emblem, wide headlamps with amber corners, a black
   bumper with red warning lamps, the plate. */
const COPF = [
  '......KKKKKKKKKKKKKK',
  '......KXXXXXXXXXXXcc',
  '......KxxxxxxxxxxxcW',
  '......KKKKKKKKKKKKKK',
  '..........KVK..Kwkkw',
  '.....KKKKKKKKKKKKKKK',
  '....Kwwwwwwwwwwwwwww',
  '...KwWWWWWWWWWWWWWWW',
  '..KwKKKKKKKKKKKKKKKK',
  '..KWKGgGGGGGGGGGGGGG',
  '.KWKGGgGGGGGGGGGGGGG',
  '.KWKGGGgGGGGGGGGGGGh',
  'KNWKGGGGGGGGGGGGGGhh',
  'KNKKKKKKKKKKKKKKKKKK',
  'KwwwwwwwwwwwwwwwwwwN',
  'KWWWWWWWWWWWNNNNNNNN',
  'KVVVVVVNNNNNNNNnNNNN',
  'KYYYYAKWWWWWWWWWWWWW',
  'KYyYYAKkNkNkNkNkNkpP',
  'KNNNNNKkNkNkNkNkNkPp',
  'KNxXNNKWWWWWWWWWWWWW',
  'KNxxNnNNNNNNNNKLLLLL',
  'KKKKKKKKKKKKKKKLlLlL',
  '.KTTTK........KKKKKK'];
const FMIR = { X:'Z', Z:'X', x:'z', z:'x' };
function copFront(ph){ const key = 'pol:copF' + ph; if(SPR[key]) return SPR[key];
  const on = h => ph === 2 || (ph === 0) === (h === 0);   // h 0 = left half, 1 = right half
  const pal = { K:'#0a0810', w:'#eae6f0', W:'#b8b4c8', V:'#7c7894', N:'#1c1a26', n:'#3a3850', k:'#0c0a12', G:'#18203a', g:'#4a5a8a', h:'#2a3456',
    Y:'#fff4c0', y:'#ffe080', A:'#ff9a2a', P:'#ffd04a', p:'#a07010', L:'#e8e4d8', l:'#3a3a48', T:'#16141a', c:'#f4eef8',
    X:on(0) ? '#ffb0b0' : '#6a1420', x:on(0) ? '#ff2a3a' : '#3a0a14', Z:on(1) ? '#ffb0b0' : '#6a1420', z:on(1) ? '#ff2a3a' : '#3a0a14' };
  const c = document.createElement('canvas'); c.width = 40; c.height = COPF.length; const g = c.getContext('2d');
  COPF.forEach((r0, y) => { const r = r0 + [...r0].reverse().map(ch => FMIR[ch] || ch).join('');
    for(let x = 0; x < r.length; x++){ const col = pal[r[x]]; if(col){ g.fillStyle = col; g.fillRect(x, y, 1, 1); } } });
  return SPR[key] = c; }
let ghost = null;   // a transparent stand-in, tall enough that the game's light-bar glow lands far above the screen
P.parked = false;   // set by mech/arrival.js while it draws the parked patrol car itself (the pull-over staging)
P.copSprite = ph => P.parked ? ghost || (ghost = (() => { const c = document.createElement('canvas'); c.width = 40; c.height = 4000; return c; })()) : copFront(ph);
P.copFront = copFront;
function warm(){ sawSpr(0); sawSpr(1); for(const f of [0, 1]) for(const d of [1, -1]) offSpr(f, d); signSpr(); stripSpr(); copFront(0); copFront(1); copFront(2);
  for(const c of ['#ff3b5c', '#ffd04a']) kanji(c); for(const s of ['ROADBLOCK', 'CHECKPOINT', 'SPIKES']) for(const c of ['#f4ecdf']) txt(s, c); for(const ch of '0123456789M') txt(ch, '#ffd04a'); try{ warmChase(); }catch(err){ console.warn('chase warm', err); } }
P.warm = warm;

/* ---------------- state ---------------- */
let items = [], lastZ = 0, wasChased = false, sched = null, lastBlockT = -99, flatT = 0, flapT = 0, warned = 0;
let stats = { threaded:0, checkpoints:0, blocksHit:0, spiked:0, dodged:0 };
P.stats = () => stats;
P.items = () => items;
// the nearest unresolved hazard ahead, for bots and tests: { kind, z, gx (open lane) | side, endX }
P.ahead = () => { const pz = position + PZ; let best = null; for(let i = 0; i < items.length; i++){ const b = items[i]; if(!b.done && b.z > pz && (!best || b.z < best.z)) best = b; } return best; };   // indexed: read every frame by heat.js, no iterator
P.reset = () => { if(!SPR['pol:strip']) warm(); cueWarm(); CUE.t0 = -99; resetChase(); for(const b of items) if(segs[b.i] && segs[b.i].polHz === b) delete segs[b.i].polHz;
  items = []; lastZ = 0; wasChased = false; sched = null; lastBlockT = -99; flatT = 0; flapT = 0; stats = { threaded:0, checkpoints:0, blocksHit:0, spiked:0, dodged:0 }; };

/* ---------------- placement ---------------- */
function pickSeg(lo, hi){ const base = Math.floor((position + PZ) / SEG), ok = [], straight = [];
  for(let i = base + lo; i <= base + hi; i++){ const s = segs[i]; if(!s || s.police || s.polHz) continue; let bad = false;
    for(let j = i - 45; j <= i + 4 && !bad; j++){ const q = segs[j]; if(q && (q.gore || q.police || q.polHz || q.tunnel !== s.tunnel)) bad = true; }   // s.police marks segments a set piece reserved
    for(const g of gates) if(Math.abs(g - i) < 14) bad = true;
    if(window.inForkWindow && inForkWindow(i - 45, i + 4)) bad = true;   // (?split=1: nothing in a fork's split window)
    for(const b of items) if(Math.abs(b.i - i) < 60) bad = true;
    if(bad) continue; ok.push(i); let c = 0; for(let j = i - 25; j <= i; j++) c = Math.max(c, Math.abs(segs[j] ? segs[j].curve : 0)); if(c < 2.6) straight.push(i); }
  const L = straight.length ? straight : ok; return L.length ? L[(Math.random() * L.length) | 0] : -1; }
function clearRoad(i){ for(let j = i - 14; j <= i + 4; j++){ const q = segs[j]; if(q && q.hz && !q.hz.hit) delete q.hz; } }

function layout(gx){   // obstacles across the road, leaving the lane at gx open (visual inner edges at gx +/- .40)
  const it = [];
  if(gx === 0){ it.push({ t:'sign', x:-1.95 }, { t:'saw', x:-1.45 }, { t:'saw', x:1.45 }, { t:'car', x:-.88, f:1 }, { t:'car', x:.88, f:-1 }, { t:'off', x:-.5, f:1 }, { t:'off', x:.5, f:-1 }); }
  else { const s = Math.sign(gx), e = gx + s * -.40;   // inner edge, towards the road centre
    it.push({ t:'sign', x:-s * 1.95 }, { t:'saw', x:-s * 1.42 }, { t:'car', x:e - s * .655, f:s }, { t:'saw', x:e - s * .17 }, { t:'off', x:e - s * .1, f:s }, { t:'off', x:s * 1.2, f:-s }); }
  return it; }

function placeBlock(kind){ const i = pickSeg(T.blockAhead[0], T.blockAhead[1]); if(i < 0) return false;
  const lanes = [-.66, 0, .66];
  const gx = lanes[(Math.random() * 3) | 0];   // any lane, your own included: reading the block is the skill, not a forced swerve
  const b = { kind, i, z:i * SEG, gx, lane:lanes.indexOf(gx), items:layout(gx), stop:{}, t0:playT };
  items.push(b); segs[i].polHz = b; clearRoad(i); lastBlockT = playT; crackle(); warned = performance.now(); return true; }
function placeSpike(){ const i = pickSeg(T.spikeAhead[0], T.spikeAhead[1]); if(i < 0) return false;
  const side = Math.random() < .5 ? -1 : 1, n = Math.random() < .6 ? 1 : 2, endX = side * (n === 1 ? .33 : -.33);
  const b = { kind:'spike', i, z:i * SEG, side, n, endX, t0:playT, d0:i - Math.floor((position + PZ) / SEG) };
  items.push(b); segs[i].polHz = b; clearRoad(i); crackle(true); warned = performance.now(); return true; }
P.placeBlock = placeBlock; P.placeSpike = placeSpike;
// tests: force a hazard d segments ahead (kind 'chase' | 'check' with gx, or 'spike' with side and n lanes)
P.debugPlace = (kind, d, a, n) => { const i = Math.floor((position + PZ) / SEG) + d, s = segs[i]; if(!s) return;
  const b = kind === 'spike' ? { kind, i, z:i * SEG, side:a, n, endX:a * (n === 1 ? .33 : -.33), t0:playT, d0:Math.max(d, 60) } : { kind, i, z:i * SEG, gx:a, lane:[-.66, 0, .66].indexOf(a), items:layout(a), stop:{}, t0:playT };
  items.push(b); s.polHz = b; clearRoad(i); warned = performance.now(); return b; };

/* ---------------- sound ---------------- */
function crackle(short){ if(!M.ac) return; const t0 = M.ac.currentTime;
  for(let k = 0; k < (short ? 3 : 6); k++) M.noise(.04 + Math.random() * .05, 1800 + Math.random() * 1800, .05, t0 + k * .07);
  M.tone(1350, .07, { type:'square', v:.018, at:t0 + (short ? .25 : .46) }); if(!short) M.tone(1350, .07, { type:'square', v:.018, at:t0 + .6 });
  M.noise(.3, 3200, .035, t0 + (short ? .34 : .72)); }
function flatSound(){ if(!M.ac) return; const t0 = M.ac.currentTime; M.noise(.18, 700, .16, t0); M.noise(.9, 2600, .07, t0 + .05); M.tone(150, .45, { type:'square', v:.03, at:t0 }); }

/* ---------------- update ---------------- */
P.update = dt => {
  try{ chaseUpdate(dt); }catch(err){ console.warn('chase', err); }
  const pz = position + PZ;
  if(state !== 'play'){ lastZ = pz; wasChased = copT > 0; return; }
  // a new chase: maybe a roadblock ahead, maybe a spike strip (with mech/heat.js loaded, its stages own the escalation instead)
  if(copT > 0 && !wasChased && !heatOn()){ const r = Math.random(), act = items.some(b => !b.done);
    if(!act && r < T.pBlock && playT - lastBlockT > 18) sched = { kind:'block', at:playT + rr(.2, .7) };
    else if(!act && r < T.pBlock + T.pSpike) sched = { kind:'spike', at:playT + rr(.5, 1.8) }; }
  wasChased = copT > 0; if(window.ASSIST && ASSIST.police === false) sched = null;   // assists: police off
  if(sched && playT >= sched.at){ const s = sched; sched = null; if(copT > 2.2) s.kind === 'block' ? placeBlock('chase') : placeSpike(); }
  // a rare checkpoint (検問) when nobody is chasing you: slip through it for a bonus
  if(copT <= 0 && !(window.ASSIST && ASSIST.police === false) && playT > T.checkAfter && playT - lastBlockT > T.checkGap && !items.some(b => !b.done) && Math.random() < dt * T.checkRate) placeBlock('check');

  for(const b of items){
    if(b.done) continue;
    if(b.kind !== 'spike') traffic(b, pz);
    if(lastZ < b.z && pz >= b.z) resolve(b);
  }
  // drop what is well behind the camera
  for(const b of items) if(b.z < position - 3000 && segs[b.i] && segs[b.i].polHz === b){ delete segs[b.i].polHz; b.gone = true; }
  { let w = 0; for(let r = 0; r < items.length; r++) if(!items[r].gone) items[w++] = items[r]; items.length = w; }   // in place: no new array a frame

  // flat tyre: hard drag, a wobble, sparks off the rim
  if(flatT > 0){ flatT = Math.max(0, flatT - dt); const f = flatT / T.flat;
    speed = Math.min(speed, MAXS * (.48 + .45 * (1 - f)));
    const amp = reduceOn() ? .3 : 1; leanV += Math.sin(playT * 21) * .07 * f * amp; playerX += Math.sin(playT * 7.3) * dt * .22 * f * amp;
    if(!reduceOn() && Math.random() < .7) sparks.push({ x:W / 2 + rr(-6, 6), y:H - 10, vx:rr(-140, 140), vy:rr(-160, -40), life:.3, c:Math.random() < .5 ? '#ffd04a' : '#fff4c0' });
    flapT -= dt; if(flapT <= 0 && M.ac){ flapT = .07 + .1 * (1 - f); M.noise(.035, 900, .05 * f + .01); } }
  lastZ = pz;
};

// traffic around a roadblock: cars in the closed lanes queue at the barrier; cars in the open lane are waved through quickly
const SORTED = [], byZ = (p, q) => q.z - p.z;   // reused each frame (no allocation)
function traffic(b, pz){ if(b.z - pz > 32000 || b.done) return;
  SORTED.length = 0; for(let i = 0; i < cars.length; i++) SORTED.push(cars[i]); SORTED.sort(byZ);
  for(const c of SORTED){ const open = Math.abs(c.x - b.gx) < .4;
    if(open){ if(c.z > pz + 300 && c.z < b.z + 7000){ c.waved = b; c.speed = Math.max(c.speed, MAXS * 1.3); } }
    else if(c.z > b.z - 8000 && c.z < b.z + 150){ const k = Math.round(c.x * 100), line = b.stop[k] ?? b.z - 420;
      if(c.stopped === b) c.speed = 0;
      else if(c.z >= line){ if(b.z - pz > 14000) c.z = -1e9;   // far ahead: officers pull it off the road (culled next frame)
        else { c.stopped = b; c.speed = 0; c.z = line; b.stop[k] = line - 1000; } } } } }
P.hitCar = c => !!(c.waved && !c.waved.done);   // a car being waved through the open lane never closes it

function blockedAt(b, x){ if(b.kind === 'spike') return b.side * x > b.side * b.endX + .04;
  const d = x - b.gx; return b.gx === 0 ? Math.abs(d) > T.gap : (b.gx > 0 ? d < -T.gap : d > T.gap); }
P.blockedAt = blockedAt;

function resolve(b){ b.done = true;
  for(const c of cars) if(c.waved === b){ c.waved = null; c.speed = MAXS * rr(.35, .6); }
  const hit = cool <= 0 && AIR.h < 6 && blockedAt(b, playerX);
  if(b.kind === 'spike'){
    if(hit){ stats.spiked++; flatT = T.flat; speed *= .5; drift = 0; charge = 0; tier = 0; boostT = 0; flatSound(); shake = reduceOn() ? 0 : 4;
      floatText('Spikes!', W / 2, H * .5, 26, '#ffb35a'); }
    else { stats.dodged++; if(copT > 0) copT = Math.max(.01, copT - 1); floatText('Dodged', W / 2 + b.side * W * .12, H * .56, 20, '#4ff0ff'); }
    return; }
  if(hit){ stats.blocksHit++; const ob = b.items.filter(o => o.t !== 'sign').reduce((a, o) => Math.abs(o.x - playerX) < Math.abs(a.x - playerX) ? o : a);
    // a sawhorse you clip is knocked flying (mech/breakfx.js), not passed through; a parked Crown stays solid
    if(ob.t === 'saw' && !ob.broken && MECH.breakfx){ ob.broken = true; MECH.breakfx.hit({ spr:sawSpr(1), z:b.z, x:ob.x, r:1 / PXM, n:2, pts:0 }); }
    if(copT <= 0){   // not being chased: you clip a barricade, lose your speed and flow, and are waved on. A checkpoint never starts a chase by itself.
      speed *= .35; flow = 0; drift = 0; charge = 0; tier = 0; boostT = 0; cool = .9; shake = reduceOn() ? 0 : 8; M.crash(); hud();
      playerX = b.gx + clamp(playerX - b.gx, -.22, .22); floatText('Bump', W / 2, H * .55, 24, '#ffc0c0'); return; }
    crash({ x:ob.x });
    if(state === 'pulled'){ speed = 0; position = Math.min(position, b.z - PZ - 1500); }   // thrown back off the barrier, stopped in front of it
    else playerX = b.gx + clamp(playerX - b.gx, -.22, .22);   // clipped the barricade and bounced through the gap
    return; }
  if(b.kind === 'chase' && copT > 0){ stats.threaded++; copT = 0; boostTier = 2; boostT = 1.3; speed = Math.max(speed, MAXS * 1.12); flow++; bestFlow = Math.max(bestFlow, flow);
    M.boost(2, flow);
    if(CL.text){ const SY = MECH.style; try{ if(SY && SY.hear) SY.hear('Lost them!'); }catch(e){} P.escaped(true); }   // clean: the block run still pays (style.js hears it); one card, the escape
    else { floatText('Lost them!', W / 2, H * .4, 30, '#4ff0ff'); floatText('検問突破', W / 2, H * .48, 22, '#ffd04a'); }
    hud(); }
  else { stats.checkpoints++; if(boostT <= 0) boostTier = 1; boostT = Math.max(boostT, .9); speed = Math.max(speed, MAXS * 1.05); flow++; bestFlow = Math.max(bestFlow, flow);
    M.boost(1, flow); floatText('Slipped through', W / 2, H * .44, 24, '#ffd04a'); hud(); } }

/* ---------------- drawing ---------------- */
const phase = now => reduceOn() ? 2 : Math.floor(now / 450) % 2;

// the roadblock's lamp glows, gathered while its sprites draw and laid on top after (a fixed pool: no arrays a frame)
const GL = Array.from({ length:40 }, () => [0, 0, 0, '', 0]); let GN = 0;
function gpush(x, y, r, c, a){ if(GN >= GL.length) return; const g = GL[GN++]; g[0] = x; g[1] = y; g[2] = r; g[3] = c; g[4] = a; }
const LAYERS = ['sign', 'car', 'saw', 'off'];   // back to front
P.drawSeg = (s, sx0, sy0, uw, fog, now) => {
  if(FR.n) try{ chaseSeg(s, sx0, sy0, uw, fog, now); }catch(err){ console.warn('chase seg', err); }
  if(!items.length) return;
  // the road lit red on the approach to a roadblock: a few stepped bands, additive, two quads per segment
  for(const b of items){ if(b.kind === 'spike') continue; const d = b.i - s.index; if(d < -4 || d > 26) continue;
    const a = s.p1.screen, q = s.p2.screen; if(q.y >= a.y) continue;
    const st = Math.abs(d) < 6 ? .22 : d < 13 ? .13 : d < 20 ? .07 : .035, al = st * (1 - fog * .6) * (FR.amb < 0 ? 1 : FR.g), ph = phase(now);
    cx.globalCompositeOperation = 'screen';
    const L = ph === 2 ? '#b01c2c' : ph ? C.redD : C.red, R = ph === 2 ? '#b01c2c' : ph ? C.red : C.redD;   // red only, like the chase car (MPD bars carry no blue): the halves alternate bright and dim
    cx.globalAlpha = al; poly(a.x - a.w * 1.1, a.y, a.x, a.y, q.x, q.y, q.x - q.w * 1.1, q.y, L); poly(a.x, a.y, a.x + a.w * 1.1, a.y, q.x + q.w * 1.1, q.y, q.x, q.y, R);
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
  const b = s.polHz; if(!b) return;
  const k = uw / PXM, al = (1 - fog * .6) * (CL.mirror ? clamp((b.z - position - 300) / 700, 0, 1) : 1);   // clean: as it passes the bike it fades instead of filling the frame edges
  if(al <= 0) return;
  if(b.kind === 'spike') return drawSpike(b, s, sx0, sy0, uw, k, fog, al, now);
  const ph = phase(now); GN = 0;
  cx.globalAlpha = al;
  // ground shadows first
  for(const o of b.items){ if((o.t !== 'car' && o.t !== 'saw') || o.broken) continue; const w = (o.t === 'car' ? 28 : 11) * k; spanFill(sx0 + o.x * uw, sy0, w, Math.max(PX * .5, w * .08), 'rgba(0,0,0,.45)'); }   // whole-pixel rows
  for(const t of LAYERS) for(const o of b.items){ if(o.t !== t || o.broken) continue; const x = sx0 + o.x * uw;
    if(t === 'car'){   // the same ray-cast Crown that chases you, side-on across the lane (one car, one look: no second hand-drawn model)
      const A = drawCar3('side', uw / MPH, ph, o.f > 0, x, sy0, al); if(!A.ok) continue; hc(A.x, A.y, A.w, A.h);
      const r = uw * .3 + 6, a = .75 + fog * .5, bx = (A.bar[0][0] + A.bar[1][0]) / 2, by = (A.bar[0][1] + A.bar[1][1]) / 2;
      gpush(bx, by, r, C.red, ph === 2 ? a * .75 : ph === 0 ? a : a * .35); gpush(bx, by, r * .35, '#ff8a8a', ph === 1 ? .2 : .5);
      for(let i = 0; i < A.head.length; i++) gpush(A.head[i][0], A.head[i][1], uw * .12 + 2, '#fff4c0', .3); }
    else if(t === 'saw'){ const on = reduceOn() || Math.floor(now / 600 + o.x * 3) % 2 === 0, ss = sawSpr(on ? 1 : 0); blit(ss, x, sy0, k); hc(x - ss.width * k / 2, sy0 - ss.height * k, ss.width * k, ss.height * k);
      if(on) gpush(x, sy0 - 13.5 * k, uw * .1 + 2, C.amber, .6); }
    else if(t === 'off'){ const f = reduceOn() ? 0 : Math.floor(now / 380 + o.x * 2) % 2, sp = offSpr(f, o.f), k2 = k * OFF_K, sf = scaleFade(k2);
      if(sf <= 0) continue; cx.globalAlpha = al * sf; blit(sp, x, sy0, k2); cx.globalAlpha = al;   // an officer beside the gap fades as he passes the camera (8x..14x) instead of growing into screen-sized blocks
      for(const [bx, by] of BATON[f]){ const gx = x + (o.f > 0 ? bx - OW / 2 : OW / 2 - bx) * k2; gpush(gx, sy0 - (OH - by) * k2, uw * .07 + 2, '#ff3a3a', .45 * sf); } }
    else if(t === 'sign') blit(signSpr(), x, sy0, k); }
  cx.globalAlpha = 1;
  for(let i = 0; i < GN; i++){ const g = GL[i]; glow(g[0], g[1], g[2], g[3], g[4] * (1 - fog * .3) * (al / (1 - fog * .6))); }
};

// assists, high-contrast hazards: a hard yellow-and-black frame round a hazard's sprite
function hc(x, y, w, h){ if(!(window.ASSIST && ASSIST.contrast) || w < 1) return; const t = Math.max(2, PX), a = cx.globalAlpha; cx.globalAlpha = 1;
  cx.fillStyle = '#000'; cx.fillRect(Math.round(x) - t * 2, Math.round(y) - t * 2, Math.round(w) + t * 4, t); cx.fillRect(Math.round(x) - t * 2, Math.round(y + h) + t, Math.round(w) + t * 4, t); cx.fillRect(Math.round(x) - t * 2, Math.round(y) - t * 2, t, Math.round(h) + t * 4); cx.fillRect(Math.round(x + w) + t, Math.round(y) - t * 2, t, Math.round(h) + t * 4);
  cx.fillStyle = '#ffe600'; cx.fillRect(Math.round(x) - t, Math.round(y) - t, Math.round(w) + t * 2, t); cx.fillRect(Math.round(x) - t, Math.round(y + h), Math.round(w) + t * 2, t); cx.fillRect(Math.round(x) - t, Math.round(y) - t, t, Math.round(h) + t * 2); cx.fillRect(Math.round(x + w), Math.round(y) - t, t, Math.round(h) + t * 2); cx.globalAlpha = a; }
function drawSpike(b, s, sx0, sy0, uw, k, fog, al, now){ const side = b.side, pz = position + PZ, dSeg = (b.z - pz) / SEG;
  // thrown when you are about 2.2 s out; fully across by 1.6 s out
  const e = b.done ? 1 : clamp((Math.min(105, b.d0 - 12) - dSeg) / 28, 0, 1), x0 = side * .98, tip = lerp(x0, b.endX, e), sp = stripSpr();
  const ox = sx0 + side * 1.04 * uw, f = e > 0 && e < 1 ? 1 : 0;
  cx.globalAlpha = al;
  { const ph = phase(now), A = drawCar3('front', uw / MPH, ph, false, sx0 + side * 1.5 * uw, sy0, al);   // the patrol car on the shoulder, the same Crown that chases you (red bar only)
    if(A.ok) for(let i = 0; i < 2; i++){ const lit = ph === 2 || ph === i; glow(A.bar[i][0], A.bar[i][1], uw * .2 + 3, C.red, (lit ? .7 : .2) * al); } }
  // the strip: cropped to how far it has unrolled, lying flat on the road
  const wpx = Math.max(4, Math.round(Math.abs(tip - x0) * PXM)), xl = sx0 + Math.min(x0, tip) * uw, h = 6 * k * .7;
  cx.imageSmoothingEnabled = false; cx.drawImage(sp, side > 0 ? 0 : SW_ - wpx, 0, wpx, 6, Math.round(xl), Math.round(sy0 - h), Math.round(wpx * k), Math.max(1, Math.round(h))); hc(xl, sy0 - h, wpx * k, h);
  // the cord back to the officer's hand
  cx.fillStyle = C.K; cx.fillRect(Math.min(ox, sx0 + x0 * uw), sy0 - Math.max(1, k * .5), Math.abs(ox - (sx0 + x0 * uw)) + 1, Math.max(1, k * .5));
  blit(offSpr(f, -side), ox, sy0, k * OFF_K);
  cx.globalAlpha = 1;
  // a glint running along the teeth, so the strip catches your eye
  if(e > .3){ const g = reduceOn() ? .5 : (now / 650) % 1, gx = sx0 + lerp(x0, tip, g) * uw; glow(gx, sy0 - h * .8, uw * .09 + 4, '#f4f8ff', .85 * (1 - fog * .4)); }
  glow(ox + (f ? -side * 5 : -side * 4) * k, sy0 - (f ? 13.5 : 9.5) * k, uw * .07 + 2, '#ff3a3a', .45); }

/* the HUD plate: 検問 / ROADBLOCK, the distance, and which lane is open */
P.drawScreen = now => {
  if(FR.n) try{ chaseOver(now); chaseFront(now); }catch(err){ console.warn('chase over', err); }   // the light on the rider first, then the car over him
  if(state === 'play' && CL.text && copT > 0) try{ drawCue(now); }catch(err){ console.warn('police cue', err); }
  if(state !== 'play') return; const b = P.ahead(); if(!b) return; const pz = position + PZ, dist = Math.round((b.z - pz) / 100); if(dist > 420) return;
  const p = PX, R_ = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(x * p, y * p, w * p, h * p); }, B_ = (c, x, y) => cx.drawImage(c, x * p, y * p, c.width * p, c.height * p);
  cx.save(); cx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  const spike = b.kind === 'spike', check = b.kind === 'check', cw = Math.ceil(W / p), label = spike ? 'SPIKES' : check ? 'CHECKPOINT' : 'ROADBLOCK';
  const ph = phase(now), age = (performance.now() - warned) / 1000, blinkIn = !reduceOn() && age < 1.2 && Math.floor(age * 5) % 2 === 1;
  const bare = CL.text && b.kind === 'chase';   // clean: a chase roadblock shows only which lane is open (the block itself is lit on the road ahead)
  const lw = label.length * 4, iw = spike ? 13 : 23, w = bare ? 3 + 3 * 7 - 1 + 3 : 3 + iw + 4 + Math.max(lw, 22) + 4 + 3 * 7 - 1 + 3, h = 17, x0 = (cw - w) >> 1, y0 = W < 640 ? Math.max(Math.round(H * .17 / p), Math.ceil(52 / p) + 28 + 9 + 9) : Math.round(H * .17 / p);   // narrow: under env/hud.js's night strip (its layout: the first free row, the 28-row speed plate, 9, the 7-row strip)
  const edge = check ? '#ffd04a' : ph === 1 ? '#8a1424' : '#ff3b5c';   // red only: bright and dim halves, like the bar
  R_(x0, y0, w, h, 'rgba(7,6,12,.8)'); if(!blinkIn){ R_(x0, y0, w, 1, edge); R_(x0, y0 + h - 1, w, 1, edge); R_(x0, y0, 1, h, edge); R_(x0 + w - 1, y0, 1, h, edge); }
  let x = x0 + 3;
  if(spike){ for(let i = 0; i < 13; i++){ R_(x + i, y0 + 9 + (i % 4 < 2 ? 0 : 1), 1, 1, '#ffd04a'); if(i % 4 === 1) R_(x + i, y0 + 7, 1, 2, '#c8c4d0'); } R_(x, y0 + 11, 13, 1, '#5a4410'); }
  else if(!bare) B_(kanji(check ? '#ffd04a' : '#ff3b5c'), x, y0 + 3);
  if(!bare){ x += iw + 4; B_(txt(label, '#f4ecdf'), x, y0 + 3);
    const ds = String(Math.max(0, dist)) + 'M'; for(let i = 0; i < ds.length; i++) B_(txt(ds[i], '#ffd04a'), x + i * 4, y0 + 10);   // per-glyph (cached): a new distance never makes a canvas
    x += Math.max(lw, 22) + 4; }
  // three lane cells, left to right: open lane cyan with a down chevron, closed lanes red with a cross
  for(let i = 0; i < 3; i++){ const lx = [-.66, 0, .66][i], open = !blockedAt(b, lx), cx0 = x + i * 7, cy0 = y0 + 3;
    R_(cx0, cy0, 6, 11, open ? '#0e3a44' : '#3a0c18');
    if(open){ for(let r = 0; r < 3; r++) R_(cx0 + r, cy0 + 4 + r, 6 - r * 2, 1, '#4ff0ff'); R_(cx0 + 2, cy0 + 1, 2, 3, '#4ff0ff'); }
    else for(let r = 0; r < 4; r++){ R_(cx0 + 1 + r, cy0 + 3 + r, 1, 1, '#ff3b5c'); R_(cx0 + 4 - r, cy0 + 3 + r, 1, 1, '#ff3b5c'); } }
  cx.restore();
};

/* The chase's one cue (clean text): a small plate with a turning beacon and 警察, for 2.6 s from the first crash, in place of the
   core's "Police!" card (sundown.html asks mech('policeCue') first). The siren, rising behind you, is the real announcement; the plate
   is for whoever plays muted. Built at the ride's reset from the game's pixel font (never mid-ride); without the font it is the beacon
   alone. */
const CUE = { t0:-99, m:null, tries:0 };
const BEACON = ['..KKK..', '.KRRRK.', 'KRrRRRK', 'KRRRRRK', 'KKKKKKK', 'KwwwwwK', 'KKKKKKK'];
function cueWarm(){ if(CUE.m || CUE.tries > 40 || typeof pixText !== 'function' || typeof tintMask !== 'function') return; CUE.tries++;
  try{ if(document.fonts && document.fonts.check && !document.fonts.check('16px DotGothic16')) return; CUE.m = tintMask(pixText('警察', 16), '#fff0f2'); }catch(e){ CUE.m = null; } }
P.policeCue = () => { if(!CL.text) return false; CUE.t0 = playT; return true; };   // the core's crash(): true = it shows no "Police!" card
function drawCue(now){ const age = playT - CUE.t0; if(age < 0 || age > 2.6) return;
  const p = PX, cw = Math.ceil(W / p), m = CUE.m, mw = m ? m.width : 0, mh = m ? m.height : 0, w = 3 + 7 + (m ? 3 + mw : 0) + 3, h = Math.max(mh, 7) + 4;
  const x0 = (cw - w) >> 1, y0 = W < 640 ? Math.max(Math.round(H * .17 / p), Math.ceil(52 / p) + 28 + 9 + 9) : Math.round(H * .17 / p);   // the roadblock plate's place
  const fade = age > 2.2 ? Math.ceil((2.6 - age) / .1) / 4 : 1, ph = reduceOn() ? 2 : Math.floor(now / 450) % 2;
  cx.save(); cx.setTransform(1 / p, 0, 0, 1 / p, 0, 0); cx.imageSmoothingEnabled = false; cx.globalAlpha = fade; cx.globalCompositeOperation = 'source-over';
  const R_ = (x, y, ww, hh, c) => { cx.fillStyle = c; cx.fillRect(x * p, y * p, ww * p, hh * p); };
  R_(x0, y0, w, h, 'rgba(7,6,12,.94)'); R_(x0, y0, w, 1, '#8a1424'); R_(x0, y0 + h - 1, w, 1, '#8a1424');
  const by = y0 + ((h - 7) >> 1), lit = ph !== 1;
  for(let j = 0; j < 7; j++) for(let i = 0; i < 7; i++){ const ch = BEACON[j][i]; if(ch === '.') continue;
    R_(x0 + 3 + i, by + j, 1, 1, ch === 'K' ? '#0a0810' : ch === 'w' ? '#8c88a4' : ch === 'r' ? (lit ? '#fff0f0' : '#8a2030') : (lit ? '#ff2a3a' : '#5a1018')); }
  if(m) cx.drawImage(m, (x0 + 13) * p, (y0 + 2) * p, mw * p, mh * p);
  cx.restore();
  if(lit && fade >= 1) glow((x0 + 6.5) * p, (by + 2) * p, 7 * p, WASH, .35); }
P.finish = rec => { rec.roadblocks = stats.threaded; rec.checkpoints = stats.checkpoints; rec.spiked = stats.spiked; rec.copDodged = CS.dodged; rec.copScraped = CS.scraped; };

/* ================================================================== THE CHASE: the patrol car as a real object on the road
   References (rules taken, no art copied):
   - Chase H.Q. (Taito 1988): the pursuit is framed from right behind and the target is always on screen; ramming is the verb and the
     radio ("Nancy") narrates the chase. Rule 1: the pursuer must be visible and physically present, never a HUD icon.
   - Need for Speed: Hot Pursuit (2010) / Most Wanted (2005): heat climbs over a ride; cops pull alongside on straights, get ahead and
     brake-check, and try a PIT from behind; their bars wash the road and the player's car in red and blue. Rule 2: heat escalates across
     the night (chase count), and each attack is announced by the car's own body language before it lands.
   - Burnout 3: Takedown: a hit has weight (sparks, wobble, screen shake) but a glancing one is survivable; only a hit while you are
     already unsettled takes you out. Rule 3: a scrape wobbles you; a second contact while wobbling is the strike.
   - Road Rash: rivals ride level with you in the frame and drop back when they miss. Rule 4: a missed lunge costs the cop ground.
   - Spy Hunter: enemies close from behind and nose in at your rear; you read them at the bottom of the screen. Rule 5: the rear view
     lives at the bottom of the screen, the car's front rising as it gains, its side view beside you once level.
   - Japanese police pursuit footage (MPD Crown patrol cars): a red-only bar on a low stand, high beams flashed at the car in front, and
     the loudspeaker "止まりなさい!" (stop!) and "左に寄せなさい" (pull over to the left). Rule 6: red only; the voice, not a siren alone,
     tells you that you are the target.
   - (Fairness, after Celeste's and Hades' telegraphs) Rule 7: every lunge locks its target lane at the start of a 0.8 s warning (a red
     strip on the road, the car's nose turning in, a tyre squeal); the lunge goes where you WERE, so moving is always enough.
   - Rule 8: the car peels off visibly when you escape: it brakes, drops back in the rear view and pulls onto the shoulder, lights on.
   Art: the Crown is a few solids in metres (u forward, v to its right, h up) ray-cast at warm() into pixel sprites: five view angles
   (rear, rear three-quarter, side, front three-quarter, front) at three texel densities (12, 24, 48 px/m), three light-bar phases,
   both facings; each drawn at most 1.5x its size. Panda livery from the side and front sprites above; the bar is red only.
   Nothing is allocated after warm(): every canvas, dither pattern and callout is built before the ride. */
const CHV = { rear:0, r34:32, side:90, f34:146, front:180 }, VIEWN = ['rear', 'r34', 'side', 'f34', 'front'], LVS = [12, 24, 48], TILT = 13 * Math.PI / 180;
const CAR_L = 2.42, AXLE = [-1.38, 1.47], WHR = .32;
function pwl(pts){ const a = new Float32Array(1001); for(let i = 0; i < 1001; i++){ const u = -2.5 + i * .005; let y = u >= pts[pts.length - 1][0] ? pts[pts.length - 1][1] : pts[0][1];
  if(u > pts[0][0] && u < pts[pts.length - 1][0]) for(let k = 1; k < pts.length; k++) if(u <= pts[k][0]){ const p = pts[k - 1], q = pts[k]; y = p[1] + (q[1] - p[1]) * (u - p[0]) / (q[0] - p[0]); break; } a[i] = y; } return a; }
const DECK_T = pwl([[-2.42, .52], [-2.37, .80], [-2.25, .89], [-1.55, .92], [1.15, .94], [2.2, .84], [2.36, .75], [2.42, .56]]);
const GH_T = pwl([[-1.55, .92], [-.85, 1.41], [.35, 1.43], [1.15, .94]]);
const tab = (T, u) => { let i = (u + 2.5) * 200; i = i < 0 ? 0 : i > 1000 ? 1000 : i; return T[i | 0]; };
const slope = (T, u) => (tab(T, u + .02) - tab(T, u - .02)) / .04;
const deckH = u => tab(DECK_T, u), ghH = u => u > -1.55 && u < 1.15 ? tab(GH_T, u) : 0;
const hwB = (u, h) => { const e = Math.max(0, Math.abs(u) - 2.1) / .32; return .88 - .12 * e * e - (h < .34 ? (.34 - h) * .5 : 0); };
const hwG = h => .79 - (h - .92) * .34;
const BAR = { u0:-.3, u1:.1, v:.66, h0:1.49, h1:1.62 };
// which solid a point is in: 0 air, 1 body, 2 greenhouse, 3 tyre, 4 light bar, 5 its stand, 6 a mirror
function partAt(u, v, h){ const av = v < 0 ? -v : v;
  if(h < 0 || h > 1.63 || u < -CAR_L || u > CAR_L) return 0;
  for(let k = 0; k < 2; k++){ const du = u - AXLE[k], dh = h - WHR; if(av > .6 && av < .845 && du * du + dh * dh < WHR * WHR) return 3; }
  if(h >= BAR.h0) return u >= BAR.u0 && u <= BAR.u1 && av <= BAR.v && h <= BAR.h1 ? 4 : 0;
  if(h >= 1.4 && u >= -.2 && u <= 0 && av <= .5) return 5;
  if(u >= .86 && u <= 1 && av >= .84 && av <= 1 && h >= .97 && h <= 1.07) return 6;
  if(h < .2) return 0;
  if(h <= deckH(u)){ if(av > hwB(u, h)) return 0;
    if(av > .58 && h < .78) for(let k = 0; k < 2; k++){ const du = u - AXLE[k], dh = h - WHR; if(du * du + dh * dh < .1681) return 0; }   // the wheel arches
    return 1; }
  if(u > -1.55 && u < 1.15 && h <= ghH(u) && av <= hwG(h)) return 2;
  return 0; }
const nrm = (a, b, c) => { const l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
function boxN(u, v, h, u0, u1, vv, h0, h1){ const f = [[u - u0, -1, 0, 0], [u1 - u, 1, 0, 0], [vv - Math.abs(v), 0, Math.sign(v) || 1, 0], [h - h0, 0, 0, -1], [h1 - h, 0, 0, 1]];
  let b = f[0]; for(const q of f) if(q[0] < b[0]) b = q; return [b[1], b[2], b[3]]; }
// the surface at a hit: its normal and paint. text: leave the side door plain (the POLICE letters are stamped on the big side view)
function surfAt(p, u, v, h, S, text){ const av = Math.abs(v), sv = v < 0 ? -1 : 1, lw = .75 / S;
  if(p === 3){ const k = Math.abs(u - AXLE[0]) < Math.abs(u - AXLE[1]) ? 0 : 1, du = u - AXLE[k], dh = h - WHR, r = Math.hypot(du, dh) || 1;
    if(.845 - av < WHR - r) return [[0, sv, 0], r < .07 ? 'S' : r < .2 ? (r < .16 && ((Math.atan2(dh, du) * 2.55 + 9) | 0) % 2 ? 'S' : 'Sd') : 'T'];
    return [[du / r, 0, dh / r], 'T']; }
  if(p === 4){ const n = boxN(u, v, h, BAR.u0, BAR.u1, BAR.v, BAR.h0, BAR.h1);
    if(h < BAR.h0 + .03 || (n[2] > .5 && (av > BAR.v - .04 || u < BAR.u0 + .04 || u > BAR.u1 - .04))) return [n, 'K'];
    if(av < .085) return [n, 'c'];
    const core = n[2] < .5 && av > .22 && av < .46 && h > 1.535 && h < 1.585; return [n, (v < 0 ? 'L0' : 'L1') + (core ? 'c' : '')]; }
  if(p === 5){ const n = boxN(u, v, h, -.2, 0, .5, 1.4, 1.49); return [n, Math.abs(n[0]) > .5 && av < .3 ? ((((av * S) | 0) % 3 === 1 && h > 1.42 && h < 1.47) ? 'k' : 'wb') : 'K']; }
  if(p === 6) return [boxN(u, v, h, .86, 1, 1, .97, 1.07), 'w'];
  if(p === 2){ const dT = ghH(u) - h, dS = hwG(h) - av;
    if(dT < dS){ const n = nrm(-slope(GH_T, u), 0, 1); if(u > .32 || u < -.82) return [n, av > hwG(h) - .07 ? 'w' : 'Gl']; return [n, 'w']; }
    const n = nrm(0, sv, .34), uR = -1.55 + (h - .92) / .49 * .7, uF = 1.15 - (h - .94) / .49 * .8;
    const glass = dT > .06 && h > .97 && u > uR + .26 && u < uF - .1 && !(u > -.34 && u < -.18);
    return [n, glass ? 'Gl' : 'w']; }
  // the body
  if(av > .55 && av <= .585 && h < .78) for(let k = 0; k < 2; k++){ const du = u - AXLE[k], dh = h - WHR; if(du * du + dh * dh < .1681) return [[0, sv, 0], 'arch']; }
  const dTop = deckH(u) - h, dSide = hwB(u, h) - av, dFr = CAR_L - u, dRe = u + CAR_L, dBot = h - .2, m = Math.min(dTop, dSide, dFr, dRe, dBot);
  let n;
  if(m === dTop) n = nrm(-slope(DECK_T, u), 0, 1); else if(m === dSide) n = nrm(Math.abs(u) > 2.1 ? Math.sign(u) * (Math.abs(u) - 2.1) * 2.5 : 0, sv, h < .34 ? -.6 : 0);
  else if(m === dFr) n = [1, 0, 0]; else if(m === dRe) n = [-1, 0, 0]; else n = [0, 0, -1];
  if(u > 2.33 && m !== dSide){   // the front: headlamps with amber corners, the chrome grille with its gold emblem, a black bumper with red lamps, the plate
    if(h > .7) return [n, av < (u - 1.32) * .95 ? 'N' : 'w'];
    if(h >= .55 && av >= .46 && av <= .84) return [n, av > .76 ? 'A' : 'Y'];
    if(h >= .5 && av < .44){ if(av < .07 && h > .56 && h < .66) return [n, 'G']; if(h > .67 || av > .41) return [n, 'C']; return [n, ((h * S * .5) | 0) % 2 ? 'N' : 'C']; }
    if(h >= .46 && h < .5 && av < .7) return [n, 'C'];
    if(av < .2 && h > .26 && h < .4) return [n, 'P'];
    if(av > .5 && av < .72 && h > .35 && h < .43) return [n, 'R'];
    return [n, 'N']; }
  if(u < -2.33 && m !== dSide){   // the back: taillamps, the plate, a black bumper
    if(av > .5 && av < .86 && h > .6 && h < .78) return [n, av > .8 ? 'A' : 'E'];
    if(av < .2 && h > .44 && h < .58) return [n, 'P'];
    return [n, h < .5 ? 'N' : 'w']; }
  if(m === dTop){ if(u > 1.15) return [n, av < (u - 1.32) * .95 ? 'N' : 'w']; return [n, 'w']; }   // the hood with the black nose wedge; the trunk
  if(m === dBot) return [n, 'N'];
  // the flank: white over black, the line rising into the black nose; door seams, the gold emblem, POLICE
  const hb = .6 + (u > 1.72 ? (u - 1.72) * .62 : 0), black = h < hb;
  if(h > .25 && h < deckH(u) - .02 && (Math.abs(u - .9) < lw || Math.abs(u + .24) < lw || Math.abs(u + 1.3) < lw)) return [n, black ? 'lnN' : 'lnW'];
  if(u > 2.12 && u < 2.24 && h > .6 && h < .67) return [n, 'A'];
  if(!black) return [n, 'w'];
  if(u > .5 && u < .66 && h > .41 && h < .54) return [n, 'G'];
  if(!text && S >= 20 && u > -.78 && u < .36 && h > .42 && h < .52){ const c = ((.36 - u) * S) | 0, r = h > .47 ? 0 : 1; if(((r ? '1010110101' : '1101101011')[c % 10]) === '1') return [n, 'Lt']; }
  return [n, h < .27 ? 'Nd' : 'N']; }
// 3-tone ramps: lit, mid, shade
const RAMP = { w:['#f4f0f8', '#c8c4d8', '#8c88a4'], wb:['#f4f0f8', '#dcd8e4', '#b4b0c4'], N:['#4a4862', '#262434', '#12101a'], Nd:['#262434', '#16141e', '#0c0a12'], Gl:['#5a6aa0', '#24325e', '#141a36'],
  C:['#ece8f4', '#a8a4b8', '#5a5668'], G:['#ffe890', '#ffd04a', '#a87410'], T:['#46424e', '#22202a', '#0e0c14'], S:['#e0dcec', '#a8a4b8', '#5a5668'], Sd:['#6a6680', '#4a4658', '#2a2834'],
  Y:['#ffffff', '#fff4c0', '#ffd890'], A:['#ffc870', '#ff9a2a', '#c06a14'], R:['#ff6a6a', '#e01828', '#901020'], E:['#ff6a6a', '#d01828', '#801020'], P:['#f4f0e4', '#d8d4c8', '#a8a498'],
  K:['#2a2834', '#16141e', '#0a0810'], k:['#2a2834', '#1a1822', '#0a0810'], c:['#ffffff', '#ece4f4', '#b8b0c8'], arch:['#0a0810', '#0a0810', '#0a0810'], lnW:['#8c88a4', '#7c7894', '#5c5874'], lnN:['#0a0810', '#08070c', '#060508'], Lt:['#e8e4f0', '#d8d4e0', '#a8a4b8'],
  L0:['#ff8a8a', '#ff2a3a', '#c8102a'], L1:['#ff8a8a', '#ff2a3a', '#c8102a'], L0c:['#fff0f0', '#ffd0d0', '#ff8a8a'], L1c:['#fff0f0', '#ffd0d0', '#ff8a8a'] };
const OFF = { L0:['#7a1a28', '#5a1018', '#3a0a14'], L0c:['#8a2030', '#6a1420', '#4a0c18'] }; OFF.L1 = OFF.L0; OFF.L1c = OFF.L0c;
const EMIT = { Y:1, A:1, R:1, E:1, L0:1, L1:1, L0c:1, L1c:1, c:1, P:1 };
const MATS = Object.keys(RAMP), MATI = {}; MATS.forEach((k, i) => MATI[k] = i + 1);
const LV3 = nrm(-.45, .8, .42);   // the key light in view space: from the upper left, a little toward the camera (street lamps overhead)
const CM = {};   // per view and density: { w, h, ox, oy, S, mat, lv, anc }
function rasterCar(view, S, tilt, key){ const T0 = tilt === undefined ? TILT : tilt, psi = CHV[view] * Math.PI / 180, cp = Math.cos(T0), spt = Math.sin(T0);
  const d = [Math.cos(psi) * cp, Math.sin(psi) * cp, -spt], r = [-Math.sin(psi), Math.cos(psi), 0], up = [d[1] * r[2] - d[2] * r[1], d[2] * r[0] - d[0] * r[2], d[0] * r[1] - d[1] * r[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], B = [-2.45, 2.45, -1.01, 1.01, 0, 1.64];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for(const a of [B[0], B[1]]) for(const b of [B[2], B[3]]) for(const c of [B[4], B[5]]){ const p = [a, b, c], x = dot(p, r), y = dot(p, up); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = Math.ceil((x1 - x0) * S) + 2, h = Math.ceil((y1 - y0) * S) + 2, ox = -x0 * S + 1, oy = y1 * S + 1;
  const mat = new Uint8Array(w * h), lv = new Uint8Array(w * h), dep = new Float32Array(w * h).fill(1e9), side = view === 'side' && S >= 40, st = Math.max(.012, Math.min(.03, .7 / S));
  for(let j = 0; j < h; j++) for(let i = 0; i < w; i++){ const X = (i + .5 - ox) / S, Y = (oy - j - .5) / S, b0 = X * r[0] + Y * up[0], b1 = X * r[1] + Y * up[1], b2 = X * r[2] + Y * up[2];
    let t0 = -1e9, t1 = 1e9;   // the ray against the bounding box (slabs)
    for(let a = 0; a < 3; a++){ const o = a === 0 ? b0 : a === 1 ? b1 : b2, dd = d[a], lo = B[a * 2], hi = B[a * 2 + 1];
      if(Math.abs(dd) < 1e-9){ if(o < lo || o > hi){ t0 = 1; t1 = 0; } continue; } let ta = (lo - o) / dd, tb = (hi - o) / dd; if(ta > tb){ const q = ta; ta = tb; tb = q; } if(ta > t0) t0 = ta; if(tb < t1) t1 = tb; }
    if(t1 <= t0) continue;
    let prev = t0, hitT = -1, pp = 0, got = false;
    for(let t = t0; t <= t1; t += st){ const p = partAt(b0 + t * d[0], b1 + t * d[1], b2 + t * d[2]); if(p){ let lo = prev, hi = t; pp = p;
        for(let k = 0; k < 6; k++){ const m = (lo + hi) / 2, q = partAt(b0 + m * d[0], b1 + m * d[1], b2 + m * d[2]); if(q){ hi = m; pp = q; } else lo = m; } hitT = hi; got = true; break; } prev = t; }
    if(!got) continue;
    const u = b0 + hitT * d[0], v = b1 + hitT * d[1], hh = b2 + hitT * d[2], sf = surfAt(pp, u, v, hh, S, side), n = sf[0];
    const vn = [dot(n, r), dot(n, up), -dot(n, d)], I = vn[0] * LV3[0] + vn[1] * LV3[1] + vn[2] * LV3[2];
    let l = I > .6 ? 0 : I > .16 ? 1 : 2; if(EMIT[sf[1]]) l = sf[1].endsWith('c') ? 0 : Math.min(l, 1);
    if(sf[1] === 'Gl' && ((i - j * 2) % 11 + 11) % 11 < 2 && l > 0) l--;   // a streak of sky in the glass
    const o = j * w + i; mat[o] = MATI[sf[1]]; lv[o] = l; dep[o] = hitT; }
  const rows = new Int16Array(h * 2).fill(-1); for(let j = 0; j < h; j++){ for(let i = 0; i < w; i++) if(mat[j * w + i]){ if(rows[j * 2] < 0) rows[j * 2] = i; rows[j * 2 + 1] = i; } }   // the silhouette per row (the backing's clip)
  const proj = (u, v, hh) => { const p = [u, v, hh]; return [ox + dot(p, r) * S, oy - dot(p, up) * S, dot(p, d)]; };
  const vis = a => { const i = Math.round(a[0] - .5), j = Math.round(a[1] - .5); if(i < 0 || j < 0 || i >= w || j >= h) return false; let best = 1e9; for(let y = j - 1; y <= j + 1; y++) for(let x = i - 1; x <= i + 1; x++) if(x >= 0 && y >= 0 && x < w && y < h) best = Math.min(best, dep[y * w + x]); return a[2] <= best + .12; };
  const anc = { bar:[proj(-.1, -.38, 1.57), proj(-.1, .38, 1.57)], head:[proj(2.43, -.65, .63), proj(2.43, .65, .63)].filter(vis), tail:[proj(-2.43, -.68, .69), proj(-2.43, .68, .69)].filter(vis), door:proj(.36, -.885, .52) };
  return CM[key || view + S] = { w, h, ox, oy, S, mat, lv, dep, anc, view, rows, roofY:proj(-.1, .6, 1.43)[1], sillY:proj(0, .88, .22)[1] }; }
const darkOf = c => mixc(c, '#06050c', .72);
function paintCar(m, ph, flip){ const key = 'pol:3d:' + m.view + m.S + ':' + ph + (flip ? 'f' : ''); if(SPR[key]) return SPR[key];
  const c = document.createElement('canvas'); c.width = m.w; c.height = m.h; const g = c.getContext('2d'), img = g.createImageData(m.w, m.h), D = img.data, { w, h, mat, lv, dep } = m;
  const lit = k => k === 'L0' || k === 'L0c' ? ph !== 1 : k === 'L1' || k === 'L1c' ? ph !== 0 : true;
  for(let j = 0; j < h; j++) for(let i = 0; i < w; i++){ const o = j * w + i, mi = mat[o]; if(!mi) continue; const k = MATS[mi - 1];
    let col = (lit(k) ? RAMP[k] : OFF[k])[lv[o]];
    // outline: the silhouette, and where the surface steps back (a wheel behind the body, the bar over the roof) - a dark version of the colour
    let edge = false; for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const x = i + dx, y = j + dy; if(x < 0 || y < 0 || x >= w || y >= h || !mat[y * w + x]){ edge = true; break; } if(dep[y * w + x] < dep[o] - .3){ edge = true; break; } }
    if(edge && !EMIT[k]) col = darkOf(col); else if(edge) col = mixc(col, '#06050c', .35);
    const q = hx(col), p = ((j) * w + (flip ? w - 1 - i : i)) * 4; D[p] = q[0]; D[p + 1] = q[1]; D[p + 2] = q[2]; D[p + 3] = 255; }
  g.putImageData(img, 0, 0);
  if(m.view === 'side' && m.S >= 40){ const a = m.anc.door, x0 = Math.round(flip ? m.w - a[0] - 23 : a[0]), y0 = Math.round(a[1]);   // POLICE on the door, stamped so it reads either way round
    g.fillStyle = '#e8e4f0'; [...'POLICE'].forEach((ch, n) => { const b = F3[ch]; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(x0 + n * 4 + i % 3, y0 + (i / 3 | 0), 1, 1); }); }
  return SPR[key] = c; }
function warmChase(){ if(CM.front48) return; const t0 = performance.now(); parkWarm();
  for(const v of VIEWN) for(const S of LVS){ const m = rasterCar(v, S); for(const ph of [0, 1, 2]) for(const f of [false, true]) paintCar(m, ph, f); m.dep = null; }
  // the dither patterns the wash uses (cached by colour and density in the core)
  if(typeof ditherPat === 'function') for(const col of [WASH, WASHD, BEAM, SHADE, MARK, LAMP]) for(let q = 1; q <= 8; q++) ditherPat(col, q / 8);
  const A = MECH.arrival; if(A && A.prebuild) for(const L of Object.values(LINES)) A.prebuild(L.text, { kanji:L.kanji, sub:L.sub, col:L.col, idle:true });
  P.warmMs = performance.now() - t0; }
P.chaseSheet = () => CM;
/* The arrest's parked car (mech/arrival.js): the same Crown head-on and nearly level (5 degrees), at about 20 px per metre so it is 40-odd
   texels wide like the old sticker and arrival.js's hand-drawn rear flank, cropped to its pixels. { c, w, h, bar:[[x, y] x2], roof, sill } */
const PARK = {};
function parkWarm(){ if(PARK[2]) return; CHV.park = 180; const m = rasterCar('park', 20, 5 * Math.PI / 180, 'park');
  let x0 = m.w, x1 = 0, y0 = m.h, y1 = 0; for(let j = 0; j < m.h; j++) for(let i = 0; i < m.w; i++) if(m.mat[j * m.w + i]){ x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  for(const ph of [0, 1, 2]){ const src = paintCar(m, ph, false), c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(src, -x0, -y0);
    let xr = 0; const yb0 = Math.round(m.sillY) - 2; for(let i = 0; i < m.w; i++) if(m.mat[yb0 * m.w + i]) xr = i;   // the body's right edge (the mirror sticks out past it)
    PARK[ph] = { c, w, h, bar:m.anc.bar.map(a => [a[0] - x0, a[1] - y0]), roof:Math.round(m.roofY - y0), sill:Math.round(h - (m.sillY - y0)), inset:Math.max(0, x1 - xr) }; } }
P.parkCar = ph => { if(!PARK[2]) try{ parkWarm(); }catch(e){ return null; } return PARK[ph] || PARK[2]; };

/* ---------------- chase tuning ---------------- */
const CT = {
  spawn:3000,       // world units behind the bike where a chase car appears
  tail:820,         // how far behind it rides while tailing
  sideDz:240,       // alongside: its centre this far ahead of the bike
  aheadDz:900,      // ahead, before a brake-check
  tele:.8,          // the warning before every lunge
  ramT:.5, cutT:.38, // strike times
  hit:.27,          // lateral reach of a hit (half-road widths): a lunge goes where you were at the start of the warning
  wob:1.4,          // seconds of wobble after a scrape
  room:.42,         // free road needed on the far side before the car will cut in
  minCop:2,         // seconds of chase left needed to start a lunge
  nextKind:'',      // tests: force the next attack ('ram' | 'cut')
  relMax:2900,      // fastest it closes or drops back (world units per s)
  latMax:1.25,      // fastest it moves across the road (half-road widths per s)
};
/* The clean chase (research/sundown-craft/chase_clean.md; Kellan, 2026-11-19: "messy and distracting"). Each switch can be set false to
   bring back the old behaviour, for side-by-side strips.
   mirror: the car behind is a pursuer in the mirror: smaller, low at the bottom edge on one side of the bike (bar, screen and bonnet
     show), never over the rider; crossing behind you it dips out of view. Its warning before a ram is on the car itself: it turns its
     nose in, rises and flashes its high beams.
   light: red light only near the bike on the car's side and on the rail beside it, a slow 1.1 Hz alternation; no frame-edge glow.
   text: no PATROL CAR / STOP / BACKUP / PULL OVER / SCRAPE callouts (the loudspeaker voice, the radio crackle and the sparks carry
     them), one small 警察 mark with a beacon at the start, an icon-only lane plate for a chase roadblock, one ESCAPED card at the end. */
const CL = { mirror:true, light:true, text:true, oneView:true, subway:true };
/* subway (Kellan, 2026-11-19: "the cop when it pulls up behind you should have the same styling as the other cars and never scale. it is
   moving around too much. think of how the cop chases you in subway surfers"). Subway Surfers' inspector and his dog: after the first
   stumble they appear right behind you at the bottom of the screen, at one size, following your lane with a little lag and a running bob;
   they never attack, they are the visible promise that a second stumble is the catch, and after a while they drop back out of the frame.
   Here: the Crown head-on in the traffic's own pixel-art style (COPF above: row halves mirrored, dark outline, 3-tone ramps, the red bar
   flashing in halves) at the bike's own pixel scale, close behind the rider and cut by the bottom edge. It never grows, shrinks or turns;
   it rises from the edge over .5 s once the siren is already heard, follows your x with a .32 s lag and a one-pixel suspension bob, and
   sinks below the edge when the chase ends. No lunges, no warning strip: the threat is the core's two-strike rule (a crash while it is
   behind you is the arrest). The one escalation (heat.js) is the roadblock ahead or the helicopter, or none. */
/* oneView (Kellan, 2026-11-19: "the 3d copcar from different angles is pretty bad and distracting ... only see it from one angle again and
   it drops below the screen when it is done"): the chase car is only ever the mirror pursuer, the Crown head-on (the front view), moved
   and scaled, never turned. It is never handed to the road as a world sprite; its lunges are rams from behind only (no pull-alongside
   or brake-check cut, which need side and rear views); a ram lifts it beside you and a miss drops it back; when the chase ends it drops
   back and sinks below the bottom edge, no fade and no turn. */
P.CL = CL;
/* Light on the road is blended 'screen' (1 - (1 - road)(1 - light)), never additive, and no light colour has a channel at 255, so it can
   never clip: on a dark road it lifts almost as 'lighter' did; on Neon Ward's wet, sign-lit road it tints red instead of blowing out
   to white (Kellan, 2026-11-19; research/sundown-craft/chase_clean.md, "Light on bright roads"). */
const WASH = '#ee2838', WASHD = '#8a1424', BEAM = '#7a6a48', SHADE = '#05040a', MARK = '#f03858';
const LITROAD = { neon:.55 };
// the core's glow() is additive; light falling on a surface (the rider, a car's flank, the road) uses this 'screen' twin, which can't clip.
// Lamps themselves (the bar, the headlamps) keep glow(): a light source may be hot.
function sglow(x, y, r, col, a){ if(r < 1 || a <= 0) return; const rgb = rgb3(col); cx.globalCompositeOperation = 'screen';
  for(let i = 0; i < 3; i++){ cx.fillStyle = rgbaA(rgb, a * GLOW_W[i]); cx.beginPath(); cx.arc(x, y, Math.max(PX, r * GLOW_F[i]), 0, 6.283); cx.fill(); }
  cx.globalCompositeOperation = 'source-over'; }   // roads whose surface is lit by more than lamps (Neon Ward's sign reflections): the gain is capped here (measured: neon 101 luminance under the pool, the others 46-66)
const LINES = { stop:{ text:'STOP!', kanji:'止まりなさい', sub:'PATROL CAR', col:'#ff5a6a', mora:'so ko no ba i ku | to ma ri na sa i' },
  pull:{ text:'PULL OVER', kanji:'左に寄せなさい', sub:'PATROL CAR', col:'#ff5a6a', mora:'hi da ri ni | yo se na sa i' },
  dodge:{ text:'DODGED', kanji:'かわした', col:'#4ff0ff' }, scrape:{ text:'SCRAPE', kanji:'接触', col:'#ffb35a' }, esc:{ text:'ESCAPED', kanji:'振り切った', col:'#4ff0ff' },
  two:{ text:'BACKUP', kanji:'応援', sub:'PATROL CAR', col:'#ff5a6a' } };
const policeOn = () => !(window.ASSIST && ASSIST.police === false);
let cops = [], chaseN = 0, chaseT = 0, wobT = 0, wasC = false, spoke = 0, CS = { chases:0, lunges:0, dodged:0, scraped:0, busted:0, escaped:0, rams:0, cuts:0 };
/* The chase director (mech/heat.js): every chase (the core starts it on the first crash) escalates by heat.js's stage
   (1 one car, 2 the backup, 3 a roadblock, 4 the helicopter) instead of by how many times you have crashed tonight. */
const heatOn = () => !!(MECH.heat && MECH.heat.owns);   // the module is loaded (true from the chase's first frame, before heat.js has seen it)
const heatOwns = () => !!(MECH.heat && MECH.heat.owns && MECH.heat.owns());
const clock = () => heatOwns() && MECH.heat.clock ? MECH.heat.clock() : copT;   // the pursuit clock: heat.js keeps the real one during a chase
const level = () => heatOwns() ? Math.min(3, MECH.heat.stage() || 1) : Math.min(3, chaseN);
P.CT = CT; P.chase = () => ({ cops, wobT, heat:level(), stats:CS, t:chaseT });
P.cs = () => CS;   // the chase tallies without a new object (mech/heat.js reads them every frame)
P.lead = () => { for(let i = 0; i < cops.length; i++){ const c = cops[i]; if(c.lead && c.ph !== 'leave') return c; } return null; };
// the backup car, called in by mech/heat.js at stage 2: it comes up behind on the other quarter (the same car heat 3 has always brought)
P.backup = () => { const lead = P.lead(); if(!lead || state !== 'play' || copT <= 0) return false; for(let i = 0; i < cops.length; i++) if(!cops[i].lead && cops[i].ph !== 'leave') return false;
  cops.push(newCop(-lead.side, false)); say('two', lead); return true; };
const held = () => state === 'pulled' && pullT === 0 && !P.parked;   // the second strike's crash cam holds the arrest at its first frame; once mech/arrival.js stages its own parked car (P.parked) this one is gone, so two patrol cars never show
P.ownChase = () => state === 'play' || state === 'ready' || (held() && cops.length > 0);
function resetChase(){ cops = []; chaseN = 0; chaseT = 0; wobT = 0; wasC = false; spoke = 0; CS = { chases:0, lunges:0, dodged:0, scraped:0, busted:0, escaped:0, rams:0, cuts:0 }; }
function newCop(side, lead){ return { ph:'in', t:0, dz:-CT.spawn - (lead ? 0 : 700), x:clamp(playerX + side * .5, -.8, .8), vx:0, side, lead, lockX:0, kind:'', hit:false, lunges:0, cool:0, fade:1, brake:0, flash:0, x0:0, dz0:0, so:side }; }   // so: its place in the mirror, -1 left of the bike .. 1 right (eased; mirror framing)
function go(c, ph){ c.ph = ph; c.t = 0; }
// how sharp the road gets over the next n segments
function curveAhead(n){ const i0 = Math.floor((position + PZ) / SEG); let m = 0; for(let i = i0; i < i0 + n; i++){ const s = segs[i]; if(!s) break; m = Math.max(m, Math.abs(s.curve)); if(s.gore || s.lane) m = 9; } return m; }
function quietRoad(){ return !items.some(b => !b.done) && !(MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying()); }
function farRoom(c, lx){ const WX = wallX(), s = Math.sign(lx - c.x) || 1; return s > 0 ? WX - lx : lx + WX; }   // free road beyond the target, away from the car

/* ---------------- sound: the loudspeaker, the squeal, the engine ---------------- */
let AU = null;
function au(){ if(AU !== null) return AU; if(!window.SFX || !SFX.ready || !SFX.ready()) return null; const ac = SFX.ctx(), bus = SFX.bus(); if(!ac || !bus){ AU = false; return AU; }
  const sr = ac.sampleRate, nb = ac.createBuffer(1, sr, sr), d = nb.getChannelData(0); let s = 23; for(let i = 0; i < d.length; i++){ s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
  return AU = { ac, bus, nb }; }
let HORN = null;
const FORM = { a:[760, 1220], i:[310, 2250], u:[360, 1300], e:[480, 1850], o:[500, 860], n:[280, 1450] };
function voice(L, pan){ const A = au(); if(!A || reduceSound()) return; try{ const ac = A.ac, t0 = ac.currentTime + .05, G = v => { const g = ac.createGain(); g.gain.value = v; return g; }, BQ = (ty, f, q) => { const b = ac.createBiquadFilter(); b.type = ty; b.frequency.value = f; b.Q.value = q; return b; };
    const ms = L.mora.split(' '), N = ms.filter(m => m !== '|').length, MD = .1, dur = ms.reduce((a, m) => a + (m === '|' ? .12 : MD), 0) + .3;
    const src = ac.createOscillator(); src.type = 'sawtooth'; const f1 = BQ('bandpass', 700, 5), f2 = BQ('bandpass', 1500, 7), f2g = G(.7), mix = G(1);
    const sh = ac.createWaveShaper(); sh.curve = HORN || (HORN = (() => { const cv = new Float32Array(512); for(let i = 0; i < 512; i++){ const x = i / 255.5 - 1; cv[i] = Math.tanh(x * 6) / Math.tanh(6); } return cv; })());   // a cheap horn speaker: driven hard (the curve built once)
    const hp = BQ('highpass', 520, .7), lp = BQ('lowpass', 2600, .9), env = G(0), dl = ac.createDelay(.5), fb = G(.25), wet = G(.3), out = G(Math.pow(10, -28 / 20)), pn = ac.createStereoPanner();
    dl.delayTime.value = .11; pn.pan.value = clamp(pan, -.8, .8);
    src.connect(f1).connect(mix); src.connect(f2).connect(f2g).connect(mix); mix.connect(sh).connect(hp).connect(lp).connect(env).connect(out); env.connect(dl).connect(fb).connect(dl); dl.connect(wet).connect(out); out.connect(pn).connect(A.bus);
    const sq = ac.createOscillator(); sq.frequency.setValueAtTime(1900, t0); sq.frequency.linearRampToValueAtTime(2050, t0 + .1); const sqg = G(0); sq.connect(sqg).connect(out);   // the key-up squeal
    sqg.gain.setValueAtTime(0, t0); sqg.gain.linearRampToValueAtTime(.05, t0 + .02); sqg.gain.linearRampToValueAtTime(0, t0 + .12); sq.start(t0); sq.stop(t0 + .14);
    let t = t0 + .15, k = 0; src.frequency.setValueAtTime(170, t); env.gain.setValueAtTime(0, t0);
    for(const m of ms){ if(m === '|'){ env.gain.setTargetAtTime(0, t, .015); t += .12; continue; }
      const vw = m.length === 1 ? m : m[m.length - 1], cons = m.length > 1 ? m[0] : '', fm = FORM[vw] || FORM.a, last = k === N - 1;
      src.frequency.setTargetAtTime(178 - 22 * (k / N) + (last ? 30 : 0), t, .02); f1.frequency.setTargetAtTime(fm[0], t, .018); f2.frequency.setTargetAtTime(fm[1], t, .018);
      env.gain.setTargetAtTime(cons && 'sktpch'.includes(cons) ? .25 : .6, t, .008); env.gain.setTargetAtTime(vw === 'n' ? .45 : 1, t + .02, .012); env.gain.setTargetAtTime(.55, t + MD * .8, .01);
      t += last ? MD * 1.7 : MD; k++; }
    env.gain.setTargetAtTime(0, t, .03); src.start(t0); src.stop(t + .3); }catch(e){ console.warn('cop voice', e); } }
function reduceSound(){ return false; }
// a tyre squeal: band-passed noise and a wavering tone, falling; k 0..1
function squeal(pan, k, dur){ const A = au(); if(!A){ if(M.ac) M.noise(dur || .5, 2600, .05 * k); return; } try{ const ac = A.ac, t0 = ac.currentTime, D = dur || .55;
    const n = ac.createBufferSource(); n.buffer = A.nb; n.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2900, t0); bp.frequency.linearRampToValueAtTime(2100, t0 + D); bp.Q.value = 4;
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(1650, t0); o.frequency.linearRampToValueAtTime(1180, t0 + D); const lfo = ac.createOscillator(); lfo.frequency.value = 23; const lg = ac.createGain(); lg.gain.value = 60; lfo.connect(lg).connect(o.frequency);
    const og = ac.createGain(); og.gain.value = .35; const g = ac.createGain(), pn = ac.createStereoPanner(); pn.pan.value = clamp(pan, -.9, .9);
    const v = Math.pow(10, -21 / 20) * k; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .03); g.gain.setTargetAtTime(v * .6, t0 + .1, .1); g.gain.setTargetAtTime(0, t0 + D - .08, .04);
    n.connect(bp).connect(g); o.connect(og).connect(g); g.connect(pn).connect(A.bus); n.start(t0); o.start(t0); lfo.start(t0); n.stop(t0 + D + .2); o.stop(t0 + D + .2); lfo.stop(t0 + D + .2); }catch(e){} }
// the engine surging for a ram: a sawtooth growl climbing
function roar(pan){ const A = au(); if(!A) return; try{ const ac = A.ac, t0 = ac.currentTime, o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(), pn = ac.createStereoPanner();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(62, t0); o.frequency.exponentialRampToValueAtTime(150, t0 + .55); o2.frequency.setValueAtTime(31, t0); o2.frequency.exponentialRampToValueAtTime(75, t0 + .55);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t0); lp.frequency.linearRampToValueAtTime(1400, t0 + .5); const v = Math.pow(10, -28 / 20); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .08);   // -28 dB: measured offline it peaked 10 dB over a crash (scratchpad craft_police/audio_test.html) g.gain.setTargetAtTime(0, t0 + .5, .08);
    pn.pan.value = clamp(pan, -.8, .8); o.connect(lp); o2.connect(lp); lp.connect(g).connect(pn).connect(A.bus); o.start(t0); o2.start(t0); o.stop(t0 + .9); o2.stop(t0 + .9); }catch(e){} }
const sfx = (n, o) => { if(window.SFX && SFX.ready && SFX.ready()) SFX.play(n, o); };
P._sfx = (n, k) => n === 'voice' ? voice(LINES[k || 'stop'], 0) : n === 'squeal' ? squeal(0, k || .9, .5) : n === 'tele' ? squeal(0, .6, .3) : roar(0);   // tests (offline loudness)
P._reset_au = () => { AU = null; };
const QUIET_LINES = { stop:1, pull:1, two:1, scrape:1 };   // clean mode: these are heard (voice, radio, sparks), not read
function say(key, c){ const L = LINES[key], CO = MECH.arrival && MECH.arrival.callout;
  if(CL.text && QUIET_LINES[key]){ TXN.quiet++;
    if(key === 'two') crackle(true);   // the backup is a radio call, not a card
    if(key === 'scrape'){ const SY = MECH.style; try{ if(SY && SY.hear) SY.hear('SCRAPE'); }catch(e){} }   // the chain still breaks on a scrape (mech/style.js hears it)
    if(L.mora) voice(L, c ? clamp(c.x - playerX, -1, 1) * .6 : 0); return; }
  if(CO) CO(L.text, { kanji:L.kanji, sub:L.sub, col:L.col }); else floatText(L.text, W / 2, H * .42, 24, L.col);
  if(L.mora) voice(L, c ? clamp(c.x - playerX, -1, 1) * .6 : 0); }
const TXN = { quiet:0 };   // tests: lines kept off the screen
P.txn = () => TXN;

/* ---------------- the chase: update ---------------- */
function chaseUpdate(dt){
  const chased = state === 'play' && copT > 0 && policeOn();
  if(state === 'pulled' || state === 'over'){ if(cops.length && state === 'over') cops = []; wasC = false; return; }   // the arrest (mech/arrival.js) draws its own parked car
  if(state !== 'play'){ return; }
  if(chased && !wasC){ chaseN++; CS.chases++; chaseT = 0; spoke = 0;
    const side = playerX > .25 ? -1 : playerX < -.25 ? 1 : (Math.random() < .5 ? -1 : 1); cops = cops.filter(c => c.ph === 'leave'); cops.push(newCop(side, true)); }
  wasC = chased;
  if(chased){ chaseT += dt; const heat = level(), lead = P.lead();
    if(!spoke && chaseT > .9 && lead){ spoke = 1; say('stop', lead); }
    if(heat >= 3 && !heatOwns() && chaseT > 1.6 && copT > 2.5 && lead && !cops.some(c => !c.lead && c.ph !== 'leave')){ cops.push(newCop(-lead.side, false)); say('two', lead); } }
  for(const c of cops) stepCop(c, dt, chased);
  if(chased && cops.some(c => c.ph === 'tele' || c.ph === 'strike')) copT = Math.min(COP_T, copT + dt);   // the chase clock holds while a lunge is in the air: it always plays out
  { let w = 0; for(let r = 0; r < cops.length; r++){ const c = cops[r]; if(!(c.ph === 'leave' && (c.dz < -4300 || c.t > 3.2))) cops[w++] = c; } cops.length = w; }
  // the wobble after a scrape: the bike shimmies and drifts, settling as it fades
  if(wobT > 0){ wobT = Math.max(0, wobT - dt); const f = wobT / CT.wob, amp = reduce ? .35 : 1;
    leanV += Math.sin(playT * 19) * .08 * f * amp; playerX += Math.sin(playT * 7.1) * dt * .2 * f * amp; }
  // the siren follows the car: louder as it closes, panned to its side (audio/sfx.js reads copShown and copSide)
  let near = 0, sd = copSide; for(const c of cops){ const g = c.dz < 0 ? -c.dz : 0, k = clamp(1 - (g - 500) / 3300, .18, 1) * c.fade; if(k > near){ near = k; sd = Math.sign(c.x - playerX) || copSide; } }
  if(cops.length){ copShown = lerp(copShown, near, 1 - Math.exp(-6 * dt)); copSide = sd; }
}
function stepCop(c, dt, chased){ c.t += dt; c.cool = Math.max(0, c.cool - dt); c.flash = Math.max(0, c.flash - dt);
  const heat = level(), WX = wallX(), sp = speed / MAXS;
  if(!chased && c.ph !== 'leave'){ go(c, 'leave'); c.side = c.x - playerX > 0 ? 1 : -1; }
  let tdz = c.dz, tx = c.x, rate = 2.4, lat = CT.latMax;
  const straight = curveAhead(28) < 3.2, quiet = quietRoad();
  switch(c.ph){
    case 'in': tdz = -CT.tail; rate = 1.7 + heat * .4; tx = playerX + (c.lead ? c.side * .1 : c.side * .38); if(c.dz > -CT.tail - 320) go(c, 'tail'); break;
    case 'tail':   // its resting place: right behind you, tailgating - swaying a little across your line, never parked off to one side
      if(c.lead){ tdz = -CT.tail + Math.sin(c.t * 1.9) * 120; tx = playerX + c.side * (.15 + .08 * Math.sin(c.t * 1.5)); if(Math.sin(c.t * .55) > .93) c.side = -c.side; }   // just off your line, swapping quarters now and then
      else { tdz = -CT.tail - 330 + Math.sin(c.t * 1.6) * 90; tx = playerX + c.side * (.36 + .06 * Math.sin(c.t * 1.2)); }   // the backup: behind, on the other quarter
      const canHit = !CL.subway && quiet && !recovering() && clock() > CT.minCop + .4 && c.lunges < (heat >= 2 ? 2 : 1) && calm();
      if(c.lead && canHit && c.t > (heat >= 2 ? .9 : 1.3) && c.cool <= 0 && sp > .45 && curveAhead(16) < 3.4){   // never on a hard bend, where the outward pull could pin you in its path
        // one view: rams only
        const kind = CL.mirror && CL.oneView ? 'ram' : CT.nextKind || (straight && Math.random() < .35 ? 'cut' : 'ram'); if(kind === 'cut' && !straight && CT.nextKind) break; CT.nextKind = '';
        if(kind === 'cut' && straight){ go(c, 'side'); c.side = playerX > .3 ? -1 : playerX < -.3 ? 1 : (Math.random() < .5 ? -1 : 1); }   // a brief pull-alongside, only as the run-up to a cut
        else startTele(c, 'ram'); }   // the usual attack: a ram from right behind
      break;
    case 'side': tdz = CT.sideDz; tx = clamp(playerX + c.side * .55, -WX + .12, WX - .12); rate = 2.4;
      if(c.t > .35 && c.t - dt <= .35 && c.lead && spoke < 2){ spoke = 2; say('pull', c); }
      if(!straight){ go(c, 'back'); break; }
      if(c.lead && c.t > .9 && quiet && clock() > CT.minCop + .3 && !recovering() && c.lunges < (heat >= 2 ? 2 : 1)){ go(c, 'ahead'); } else if(c.t > 1.4) go(c, 'back');
      break;
    case 'ahead': tdz = CT.aheadDz; tx = clamp(playerX + c.side * .62, -WX + .12, WX - .12); rate = 2.2;
      if(!straight || !quiet){ go(c, 'back'); break; }
      if(c.dz > CT.aheadDz - 150 && clock() > CT.minCop && !recovering() && farRoom(c, playerX) >= CT.room) startTele(c, 'cut');
      else if(c.t > 1.2) go(c, 'back');
      break;
    case 'tele': { const k = c.t / CT.tele;   // the warning: the nose turns in, the lane is marked, the tyres squeal
      if(c.kind === 'ram'){ tdz = -CT.tail + 120; tx = c.lockX; rate = 3; lat = 2.2; }
      else { tdz = CT.aheadDz; tx = c.x0 + (c.lockX - c.x0) * .12 * Math.sin(Math.min(1, k * 1.6) * Math.PI); lat = 2; c.brake = .5 + .5 * Math.sin(c.t * 18); }
      if(c.t >= CT.tele){ go(c, 'strike'); c.dz0 = c.dz; c.x0 = c.x; c.hit = false; if(c.kind === 'ram') roar(clamp(c.x - playerX, -1, 1)); squeal(clamp(c.x - playerX, -1, 1), .9, .5); } }
      break;
    case 'strike': { const T = c.kind === 'ram' ? CT.ramT : CT.cutT, k = Math.min(1, c.t / T);
      if(c.kind === 'ram'){ c.x = lerp(c.x0, c.lockX, Math.min(1, k * 2.5)); c.dz = lerp(c.dz0, 520, k * k); }
      else { c.x = lerp(c.x0, c.lockX, 1 - Math.pow(1 - k, 2)); c.dz = lerp(c.dz0, 140, k); c.brake = 1; }
      c.vx = 0; contact(c);
      if(k >= 1){ c.lunges++; CS.lunges++; c.kind === 'ram' ? CS.rams++ : CS.cuts++;
        if(!c.hit){ CS.dodged++; if(copT > 0) copT = Math.max(.01, copT - 1.2); say('dodge'); sfx('whoosh', { pan:Math.sign(c.x - playerX) || 1, k:1, lead:.02 }); }
        go(c, 'over'); c.cool = 1.2; }
      return; }
    case 'over':   // one view: a missed ram brakes and drops back behind you
      tdz = c.kind === 'ram' && !c.hit ? (CL.mirror && CL.oneView ? -900 : 700) : -1300; rate = c.kind === 'ram' && c.t < .35 ? 1.5 : 2.6; c.brake = c.kind === 'cut' || c.t > .35 ? 1 : 0;
      tx = c.hit ? c.x + (c.x - playerX > 0 ? .3 : -.3) : c.x;
      if(CL.mirror && !c.hit && c.t > .2) tx = playerX + (Math.sign(c.x - playerX) || c.side) * .72;   // clean: a missed lunge veers off wide, clear of the rider, then drops back
      if(c.t > .2) contact(c);
      if(c.t > (c.kind === 'ram' ? .9 : .6)){ go(c, 'back'); c.side = c.x - playerX > 0 ? 1 : -1; }
      break;
    case 'back':   // clean: it drops back past you on its own side, wide, before tucking in behind
      tdz = -1250; tx = playerX + c.side * (CL.mirror && c.dz > -700 ? .72 : .15); c.brake = c.dz > -400 ? 1 : 0; if(c.t > 1.1) go(c, 'tail'); break;
    case 'leave': { const k = c.t; tdz = -4600; rate = .5 + k * .9; tx = c.side * (WX - .12); lat = .6; c.brake = k < 1.2 ? 1 : 0; c.fade = clamp(1 - (k - 1.9) / 1.2, 0, 1); }   // it brakes, drops back and pulls onto the shoulder
      break; }
  if(c.ph !== 'tele' || c.kind !== 'cut') c.brake = c.ph === 'ahead' || c.ph === 'side' ? 0 : c.brake;
  // keep clear of the bike unless it is attacking; never through the barrier
  if(c.ph !== 'strike' && c.ph !== 'over' && Math.abs(c.dz) < 450 && Math.abs(tx - playerX) < .5) tx = playerX + (Math.sign(c.x - playerX) || c.side) * .5;
  tx = clamp(tx, -WX + .1, WX - .1);
  const ddz = clamp((tdz - c.dz) * (1 - Math.exp(-rate * dt)), -CT.relMax * dt, CT.relMax * dt); c.dz += ddz;
  const dx = clamp(tx - c.x, -lat * dt, lat * dt); c.vx = dx / Math.max(dt, 1e-4); c.x += dx;
  // traffic: it changes lanes round a car instead of driving through it
  for(const k of cars){ const g = k.z - (position + PZ + c.dz); if(g > -300 && g < 900 && Math.abs(k.x - c.x) < .42 && c.ph !== 'strike'){ c.x += (Math.sign(c.x - k.x) || 1) * lat * dt; } }
  c.x = clamp(c.x, -WX + .08, WX - .08); }
const calm = () => !(MECH.heat && MECH.heat.calm) || MECH.heat.calm();   // one thing at a time: no lunge just as the chase's escalation arrives
function startTele(c, kind){ if(MECH.heat && MECH.heat.beat) MECH.heat.beat(); go(c, 'tele'); c.kind = kind; c.lockX = playerX; c.x0 = c.x; c.hit = false; c.flash = CT.tele;
  squeal(clamp(c.x - playerX, -1, 1), .6, .3); }   // the warning's own sound: .6 (was .45, 33 dB under the music's loud moments, easy to miss)
// contact while the car lunges: a scrape and a wobble; a second contact while still wobbling is the strike (pulled over)
const recovering = () => typeof recov === 'number' && recov > 0;   // the core's recovery window after a crash: no lunge may start and no contact counts
function contact(c){ if(c.hit || cool > 0 || recovering() || AIR.h >= 6 || state !== 'play') return;
  const reach = c.ph === 'over' ? CT.hit * .8 : CT.hit, near = c.kind === 'ram' ? c.dz > -360 && c.dz < 220 : c.dz > -160 && c.dz < 260;
  if(!near || Math.abs(c.x - playerX) >= reach) return;
  c.hit = true; const side = Math.sign(playerX - c.x) || 1;
  if(wobT > 0){ CS.busted++; wobT = 0; crash({ x:c.x }); return; }
  CS.scraped++; wobT = CT.wob; speed *= .84; drift = 0; charge = 0; tier = 0; playerX = clamp(playerX + side * .22, -wallX(), wallX()); if(copT > 0) copT = Math.min(COP_T, copT + 1);
  shake = reduce ? 0 : 6; sfx('clank', { pan:-side }); sfx('spark', { pan:-side }); if(!(window.SFX && SFX.ready && SFX.ready()) && M.scrape) M.scrape();
  if(!reduce) for(let i = 0; i < 14; i++) spark(W / 2 - side * W * .05, H - 26, -side * rr(60, 260), rr(-240, -60), .45, i % 2 ? '#ffd04a' : '#fff4c0');
  say('scrape'); }
P.escaped = () => { if(!cops.length) return false; CS.escaped++;
  // prio 3 (MECH.quiet's danger class): the escape closes the chase's danger stream, so a police or helicopter line still queued from
  // the chase must not outrank it and let it expire unseen
  if(heatOwns()){ const L = LINES.esc, CO = MECH.arrival && MECH.arrival.callout, sub = MECH.heat.escSub ? MECH.heat.escSub() : '';   // an escape: the big card
    if(CO) CO(L.text, { kanji:L.kanji, sub, col:L.col, size:'m', hold:.35, rank:5, prio:3 }); else floatText(L.text, W / 2, H * .42, 28, L.col); return true; }
  say('esc'); return true; };
P.wobble = () => wobT;

/* ---------------- the chase: drawing ---------------- */
const MPH = 5.26;   // metres in a half-road width (the police texel density: 60 px per half-road at 11.4 px/m)
const FR = { n:0, ph:2, bikeSeg:0, bikeZ:0, flashOn:false, E:[{}, {}, {}], amb:-1, g:1, tele:0, dt:0, now:0 };   // this frame's chase cars, filled before the road is drawn (no allocation)
/* The light's strength against the road's own light. Additive red over a lamp-lit road (Neon Ward, the tunnels, Aqua Line) reads as a
   pink haze and buries the warning strip; over an unlit road (the pass, the paddies, the bay in the rain) the same red is barely there.
   s.lit (0..1, the lamp light the core pools on each segment) is averaged round the bike, eased over ~0.6 s so passing one lamp never
   pumps it, and maps to a gain of 1.25 (dark) .. 0.6 (lit). Measured road luminance per road: research/sundown-craft/police.md. */
function ambient(dt){ const b = Math.floor((position + PZ) / SEG); let a = 0, n = 0; for(let i = b - 2; i < b + 15; i++){ const s = segs[i]; if(s){ a += s.lit || 0; n++; } }
  a = n ? a / n : 0; FR.amb = FR.amb < 0 ? a : FR.amb + (a - FR.amb) * (1 - Math.exp(-dt / .6)); FR.g = clamp(1.25 - FR.amb * .9, .6, 1.25);
  const sg = segs[b], cap = sg && LANDS[sg.land] ? LITROAD[LANDS[sg.land].key] : undefined; if(cap !== undefined) FR.g = Math.min(FR.g, cap); }
P.lightGain = () => FR.g;   // tests
P.chaseFrame = () => FR;   // tests: this frame's chase cars (the subway lamps: E[n].o0, o1, ay, kB)
let prepT = 0;
function chasePrep(now){ FR.n = 0; MIR.n = 0; const dt = prepT ? clamp((now - prepT) / 1000, 0, .1) : 0; prepT = now;
  if(!(cops.length || items.length) || !(state === 'play' || held())){ FR.amb = -1; return; } ambient(dt); if(!cops.length) return;
  FR.dt = dt; FR.ph = reduce ? 2 : Math.floor(now / (CL.light ? 450 : 300)) % 2; FR.bikeZ = position + PZ; FR.bikeSeg = Math.floor(FR.bikeZ / SEG); FR.now = now; FR.tele = 0;
  for(const c of cops) if(c.ph === 'tele') FR.tele = Math.max(FR.tele, Math.min(1, c.t / .12));   // a lunge's warning: the ambient wash steps down so the strip stands alone
  for(const c of cops){ if(FR.n >= 3) break; const e = FR.E[FR.n++]; e.c = c; e.z = FR.bikeZ + c.dz; e.si = Math.floor(e.z / SEG); e.world = !(CL.mirror && CL.oneView) && !CL.subway && c.dz > -300; e.k = c.fade;
    e.flash = !reduce && (c.ph === 'tele' && c.kind === 'ram' && Math.floor(c.t / .2) % 2 === 0 || CL.subway && c.hb > 0 && hbOn(c.hb));   // high beams flashed at you (2.5 Hz, never a strobe; the subway car: two blinks as it closes)
    e.beam = (c.ph === 'tele' && c.kind === 'ram' ? 1.6 : 1) * (e.flash ? 1.5 : 1); } }
P.drawBackdrop = o => chasePrep(o && o.now || performance.now());
// pick the density that is drawn at no more than 1.5x (and at least 0.75x where possible): need = canvas px per metre
function pickS(need){ for(const S of LVS) if(need <= S * 1.5) return S; return LVS[LVS.length - 1]; }
// draw a car sprite with its ground anchor at (x, yb) in CSS px, at mpx CSS px per metre; returns the anchors' screen positions in AN
const AN = { ok:false, m:null, flip:false, bar:[[0, 0], [0, 0]], head:[], tail:[], x:0, y:0, w:0, h:0, k:0 };
const AH = [[0, 0], [0, 0]], AT = [[0, 0], [0, 0]];
function drawCar3(view, mpx, ph, flip, x, yb, alpha){ const S = pickS(mpx / PX), m = CM[view + S]; if(!m){ AN.ok = false; return AN; }
  const sc = Math.min(1.5, mpx / PX / S), k = sc * PX, spr = paintCar(m, ph, flip), ox = flip ? m.w - m.ox : m.ox;
  const dw = snap(m.w * k), dh = snap(m.h * k), X = snap(x - ox * k), Y = snap(yb - m.oy * k);
  cx.globalAlpha = alpha; cx.imageSmoothingEnabled = false; cx.drawImage(spr, X, Y, dw, dh); cx.globalAlpha = 1;
  const mapA = (a, o) => { o[0] = X + (flip ? m.w - a[0] : a[0]) * k; o[1] = Y + a[1] * k; return o; };
  mapA(m.anc.bar[0], AN.bar[0]); mapA(m.anc.bar[1], AN.bar[1]);
  AN.head.length = 0; for(let i = 0; i < m.anc.head.length; i++) AN.head.push(mapA(m.anc.head[i], AH[i]));
  AN.tail.length = 0; for(let i = 0; i < m.anc.tail.length; i++) AN.tail.push(mapA(m.anc.tail[i], AT[i]));
  AN.m = m; AN.flip = flip; AN.x = X; AN.y = Y; AN.w = dw; AN.h = dh; AN.k = k; AN.ok = true; return AN; }
// the bar's light and the lamps, as stepped glows
function carGlows(A, e, r0, a){ if(!A.ok) return; const ph = FR.ph, f = a * e.k;
  for(let i = 0; i < 2; i++){ const lit = ph === 2 || ph === i; const [gx, gy] = A.bar[i]; glow(gx, gy, r0 * (lit ? 1 : .45), WASH, (lit ? (ph === 2 ? .55 : .8) : .25) * f); if(lit) glow(gx, gy, r0 * .3, '#ffb0b0', .5 * f); }
  for(const p of A.head) glow(p[0], p[1], r0 * (e.flash ? 1.3 : .7), '#fff4d0', (e.flash ? .75 : .45) * f);
  if(e.c.brake > .5) for(const p of A.tail) glow(p[0], p[1], r0 * .5, '#ff3a3a', .6 * f); }
const qd = v => Math.max(0, Math.min(8, Math.round(v * 8))) / 8;
function washQuad(a, b, xl1, xr1, xl2, xr2, col, dens){ if(dens <= 0) return; poly(a.x + xl1 * a.w, a.y, a.x + xr1 * a.w, a.y, b.x + xr2 * b.w, b.y, b.x + xl2 * b.w, b.y, ditherPat(col, dens)); }
function chaseSeg(s, sx0, sy0, uw, fog, now){
  if(!FR.n) return; const a = s.p1.screen, b = s.p2.screen; if(b.y >= a.y) return;
  const wet = !!(LANDS[s.land] && LANDS[s.land].rain), E = ENV[LANDS[s.land].key], bx = (E && E.barrier) || 1.1, ff = 1 - fog;
  for(let n = 0; n < FR.n; n++){ const e = FR.E[n], c = e.c, d = s.index - e.si, ad = Math.abs(d);
    if(!P._dark){   // tests: P._dark draws the cars without their light (the light-pool exposure measurement)
    // 1 (clean). The bar's light as a pool, not a wash: only the road beside the bike on the car's side (or round the car itself when
    // it is up on the road), a dimmer spill on the far side, and the rail on its side; the halves alternate slowly (FR.ph, 1.1 Hz)
    if(CL.light){ const bd = s.index - FR.bikeSeg, near = e.world ? d >= -1 && d <= 5 : bd >= -2 && bd <= 6;
      if(near){ const r = e.world ? ad : Math.abs(bd), pr = clamp(1 - (Math.abs(c.dz) - 300) / 2600, 0, 1);
        const L = (r < 2 ? 2.4 : r < 4 ? 1.7 : 1) * ff * e.k * pr * (wet ? 1.25 : 1) * FR.g * (1 - .55 * FR.tele) / 8, ph = FR.ph;
        const ox = e.world ? c.x : playerX, sub = CL.subway && !e.world; cx.globalCompositeOperation = 'screen';
        for(let q = 0; q < (sub ? 2 : 1); q++){   // the subway car sits square behind you: each half of its bar lights its own side of the road and its own rail, in turn
          const sd = sub ? (q ? 1 : -1) : e.world ? (Math.sign(c.x - playerX) || c.side) : (Math.sign(c.so) || c.side);
          const hi = qd(ph === 2 ? L * (sub ? .6 : .8) : ph === (sd > 0 ? 1 : 0) ? L : L * (sub ? .3 : .45)), lo = qd(L * .35);
          washQuad(a, b, Math.min(ox, ox + sd * .6), Math.max(ox, ox + sd * .6), Math.min(ox, ox + sd * .6), Math.max(ox, ox + sd * .6), WASHD, hi);
          if(!sub) washQuad(a, b, Math.min(ox, ox - sd * .3), Math.max(ox, ox - sd * .3), Math.min(ox, ox - sd * .3), Math.max(ox, ox - sd * .3), WASHD, lo);
          const dd = qd(hi * (bd >= 0 ? 1 : .5)); if(dd > 0) poly(a.x + sd * a.w * bx, a.y, a.x + sd * a.w * bx, a.y - a.w * .2, b.x + sd * b.w * bx, b.y - b.w * .2, b.x + sd * b.w * bx, b.y, ditherPat(WASH, dd)); }
        cx.globalCompositeOperation = 'source-over'; } }
    // 1. the bar washes the road and the rails red, stepped and dithered; each half of the road takes its half of the bar
    else if(d >= -4 && d <= 12){ const L = (ad < 3 ? 3 : ad < 6 ? 2.5 : ad < 10 ? 1.6 : 1) * ff * e.k * (wet ? 1.3 : 1) * FR.g * (1 - .55 * FR.tele) / 8, ph = FR.ph;
      const dl = qd(ph === 2 ? L * .75 : ph === 0 ? L : L * .4), dr = qd(ph === 2 ? L * .75 : ph === 1 ? L : L * .4);
      cx.globalCompositeOperation = 'screen';
      washQuad(a, b, -bx, c.x, -bx, c.x, WASHD, dl); washQuad(a, b, c.x, bx, c.x, bx, WASHD, dr);
      for(let sd = -1; sd <= 1; sd += 2){ const dd = qd((sd < 0 ? dl : dr) * 1.5); if(dd <= 0) continue;
        poly(a.x + sd * a.w * bx, a.y, a.x + sd * a.w * bx, a.y - a.w * .2, b.x + sd * b.w * bx, b.y - b.w * .2, b.x + sd * b.w * bx, b.y, ditherPat(WASH, dd)); }
      cx.globalCompositeOperation = 'source-over'; }
    // 2. its headlights (high beams) pool on the road ahead of it - over you, when it is behind
    if(CL.subway && !e.world) subBeams(s, a, b, e, c, ff);   // the subway car: two beams out of its own lamps, and the bike's two shadows
    else if(d >= 1 && d <= 22 && c.ph !== 'leave' && !(CL.oneView && c.dz > -150)){ const hw1 = .2 + d * .02, hw2 = .2 + (d + 1) * .02, B = (d < 5 ? 2.2 : d < 10 ? 1.6 : d < 16 ? 1 : .6) * e.beam * ff * e.k / 8;
      cx.globalCompositeOperation = 'screen'; washQuad(a, b, c.x - hw1, c.x + hw1, c.x - hw2, c.x + hw2, BEAM, qd(B)); cx.globalCompositeOperation = 'source-over';
      // the bike's shadow, thrown forward up the road by the beams
      if(c.dz < -150 && s.index >= FR.bikeSeg && s.index < FR.bikeSeg + 16){ const span = FR.bikeZ - e.z, z1 = s.index * SEG - FR.bikeZ, z2 = z1 + SEG, sl = (playerX - c.x) / span;
        const x1 = playerX + sl * Math.max(0, z1), x2 = playerX + sl * z2, w1 = .045 + Math.max(0, z1) * .000012, w2 = .045 + z2 * .000012, sd = qd((s.index - FR.bikeSeg < 5 ? .5 : .3) * Math.min(1, e.beam) * e.k * (1 - clamp((-c.dz - 600) / 2400, 0, .8)));
        washQuad(a, b, x1 - w1, x1 + w1, x2 - w2, x2 + w2, SHADE, sd); } }
    // 3. the warning: a red strip down the lane the lunge is aimed at (blinks at 2.5 Hz; steady under reduced motion)
    if(c.ph === 'tele' && s.index >= FR.bikeSeg + (c.kind === 'cut' ? 1 : -1) && s.index <= FR.bikeSeg + (c.kind === 'cut' ? 16 : 10)){ const on = reduce || Math.floor(c.t / .2) % 2 === 0, zb = (s.index & 1) ? 1 : .6;
      cx.globalCompositeOperation = 'screen'; washQuad(a, b, c.lockX - CT.hit, c.lockX + CT.hit, c.lockX - CT.hit, c.lockX + CT.hit, MARK, qd((on ? .625 : .375) * (CL.light ? .45 : 1) * zb * ff));   // clean: a light fill; the hard edges and the chevron carry the lane
      cx.globalCompositeOperation = 'source-over';
      // its two edges as hard lines (one canvas pixel, at least): the strike zone's border reads even through the bar's wash and the rain
      if(on || reduce){ const ew = Math.max(PX / Math.max(1, a.w), .018); cx.globalAlpha = ff; washQuad(a, b, c.lockX - CT.hit - ew, c.lockX - CT.hit, c.lockX - CT.hit - ew, c.lockX - CT.hit, MARK, 1); washQuad(a, b, c.lockX + CT.hit, c.lockX + CT.hit + ew, c.lockX + CT.hit, c.lockX + CT.hit + ew, MARK, 1); cx.globalAlpha = 1; }
      if(s.index === FR.bikeSeg + 3){ cx.fillStyle = MARK; const cxm = a.x + c.lockX * a.w, hh = Math.max(PX * 2, (a.y - b.y) * .5);   // a chevron pointing where it will strike
        for(let i = 0; i < 3; i++) pxRect(cxm - a.w * (.12 - i * .04), b.y + i * hh * .3, a.w * (.24 - i * .08), Math.max(PX, hh * .25)); } }
    // 4. cars near it catch the light on the side facing it
    if(ad < 13 && cars.length){ for(const k of cars){ if(Math.floor(k.z / SEG) !== s.index) continue; const pct = (k.z % SEG) / SEG, kx = lerp(a.x, b.x, pct) + k.x * lerp(a.w, b.w, pct), ky = lerp(a.y, b.y, pct), kw = lerp(a.w, b.w, pct);
      const sd = Math.sign(c.x - k.x) || 1, on = FR.ph === 2 ? .6 : 1; sglow(kx + sd * kw * .14, ky - kw * .14, kw * .3, WASH, .32 * on * ff * e.k * (ad < 5 ? 1 : .6)); } }
    }
    // 5. the car itself, when it is in front of the camera
    if(e.world && s.index === e.si){ const pct = (e.z % SEG) / SEG, w = lerp(a.w, b.w, pct), x = lerp(a.x, b.x, pct) + c.x * w, y = lerp(a.y, b.y, pct), dzc = e.z - position;
      if(dzc < 200) continue; const alpha = (1 - fog * .6) * e.k, ang = Math.atan2(Math.abs(c.x - playerX) * ROADW, dzc) * 180 / Math.PI;
      const view = ang < 14 ? 'rear' : ang < 40 ? 'r34' : 'side', flip = c.x < playerX, mpx = w / MPH, fw = (view === 'rear' ? 2 : view === 'r34' ? 3.6 : 4.9) * mpx;
      cx.fillStyle = ditherPat(SHADE, .625); pxRect(x - fw * .5, y - Math.max(PX, mpx * .12), fw, Math.max(PX, mpx * .16)); cx.fillStyle = ditherPat(SHADE, .375); pxRect(x - fw * .58, y - Math.max(PX, mpx * .06), fw * 1.16, Math.max(PX, mpx * .1));
      if(wet && !reduce){ cx.globalCompositeOperation = 'screen'; const lit = FR.ph === 2 ? 2 : FR.ph;   // the bar's flashes in the wet road
        reflColumn(x + (lit === 1 ? .25 : lit === 0 ? -.25 : 0) * mpx * (flip ? -1 : 1), y, Math.min(H - y, w * .9), Math.max(PX, mpx * .5), s.index * 3, now, .55 * e.k * ff, '#f08484', '#a01428'); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
      const A = drawCar3(view, mpx, FR.ph, flip, x, y, alpha); carGlows(A, e, mpx * .55 + 2, 1 - fog * .4); warnSign(c, A); mirRec(A); } }
}
/* The subway car's headlights (Kellan, 2026-11-20: "so it seems like it is coming out of the car behind the player. not just a rectangle").
   The old pool was one strip of road on the car's road x, widening a little per segment: seen from a camera this close behind the lamps a
   cone of light projects to a band of even width, so it read as a flat dotted rectangle with no source. Now (dashcam stills from a bike
   ahead of a car; the Crown in pursuit at night): two beams, one per lamp, each a wedge whose apex is the lamp itself (just under the bottom
   edge, at the sprite's lamp columns), narrow where it leaves the car's front corner and opening up the screen until it is a lane wide,
   then following the road to its end: a lozenge thrown from each lamp. A warmer core down the nearer part, the lane dashes catching it,
   and the bike's two shadows (one per lamp) splaying forward from the tyre.
   Falloff (Kellan: "fade the further out the dither gets on the road"): brightness drops with the square of the distance from the lamps,
   1 / (1 + (d / d0)^2), less its value at the beam's reach so it ends at nothing well before the fog: a dense wash (11/16) up to the
   tyre, a checker by mid distance, then 4/16, 2/16, 1/16 dots. The 16 levels of the core's 4x4 Bayer pattern are each used once, so each
   step is one threshold (one more dot in 16), not a band. The pool is cut where the level changes, at fixed distances from the lamps
   (the road is split there, within its segments), so the steps hold still on the screen while the road scrolls under them, as a car's
   own light does; the dots are screen-anchored inside them (a flat pattern cannot follow perspective). Lane dashes fade the same way.
   High beams flashed: the whole falloff reaches further out (reach 13 -> 20 segments, d0 x1.35), no brighter. Reduced motion: softer. */
const LAMP = '#b8a478', SB = { span:520, hw:.46, sl:1, reach:13, vmax:.7, d0:2000 };   // span: lamps to tyre (world units; the car is drawn at one size, so one span); sl: the beam's spread up the screen (1: 45 degrees each side of its line)
const q16 = v => Math.max(0, Math.min(16, Math.round(v * 16))) / 16, PA = { x:0, y:0, w:0 }, PB = { x:0, y:0, w:0 };
const fall = (d, d0) => 1 / (1 + (d / d0) * (d / d0));
function pAt(a, b, t, P){ P.x = a.x + (b.x - a.x) * t; P.y = a.y + (b.y - a.y) * t; P.w = a.w + (b.w - a.w) * t; return P; }
function subLamps(e, c){ if(e.lt === FR.now) return; e.lt = FR.now;   // where this frame's lamps sit (the car's x, as subwayCar places it), in road units at the bike
  const kB = Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX), w = 40 * kB, xc = clamp(W / 2 + ((c.lx === undefined ? playerX : c.lx) - playerX) * W * .45, w * .5, W - w * .5);
  const sb = segs[FR.bikeSeg], wr = sb && sb.p1.screen.w > 1 ? sb.p1.screen.w : W;
  e.kB = kB; e.o0 = (xc - 17 * kB - W / 2) / wr; e.o1 = (xc + 17 * kB - W / 2) / wr; e.ay = H + 2 * kB;
  // the falloff: its reach, its shape, and the distances (past the tyre) where the dither steps a level, nearest first, with the tyre itself
  e.R = SB.span + (e.flash ? 20 : SB.reach) * SEG; e.d0 = SB.d0 * (e.flash ? 1.35 : 1); e.fR = fall(e.R, e.d0); e.fN = fall(SB.span, e.d0) - e.fR;
  e.G = (c.subUp || 0) * e.k * (reduce ? .75 : 1); if(!e.bz) e.bz = new Float64Array(20); let n = 0, tyre = false; const vm = SB.vmax * e.G, top = Math.round(vm * 16);
  for(let L = top; L >= 1 && n < 19; L--){ const f = e.fR + (L - .5) / 16 / vm * e.fN; if(f >= 1 || f <= 0) continue; const z = e.d0 * Math.sqrt(1 / f - 1) - SB.span; if(z <= 0) continue;
    if(!tyre && z > 0){ e.bz[n++] = 0; tyre = true; } e.bz[n++] = z; }
  if(!tyre) e.bz[n++] = 0; e.nb = n; }
function subBeams(s, a, b, e, c, ff){ subLamps(e, c);
  const z0 = s.index * SEG - FR.bikeZ, zEnd = Math.min(z0 + SEG, e.R - SB.span), G = e.G * ff; if(z0 >= zEnd || G <= .03) return;
  cx.globalCompositeOperation = 'screen';
  let za = z0, bi = 0; while(bi < e.nb && e.bz[bi] <= za) bi++;
  while(za < zEnd){ const zb = bi < e.nb && e.bz[bi] < zEnd ? e.bz[bi++] : zEnd; subStrip(s, a, b, e, c, z0, za, zb, G); za = zb; }
  cx.globalCompositeOperation = 'source-over'; }
// one strip of a segment, za..zb past the tyre, inside which the light is one dither level
const SH = { on:false, al1:0, ar1:0, bl1:0, br1:0, al2:0, ar2:0, bl2:0, br2:0 };   // this strip's two shadows at its near (1) and far (2) edge
// a quad [l1, r1] (near edge) .. [l2, r2] (far edge) with the two shadows cut out of it (A's left of B's), skipping empty pieces
function cutQuad(A, B, l1, r1, l2, r2, col, dd){ if(dd <= 0 || (r1 - l1 < 1e-4 && r2 - l2 < 1e-4)) return;
  if(!SH.on){ washQuad(A, B, l1, r1, l2, r2, col, dd); return; }
  const al1 = clamp(SH.al1, l1, r1), ar1 = clamp(SH.ar1, l1, r1), bl1 = Math.max(ar1, clamp(SH.bl1, l1, r1)), br1 = Math.max(ar1, clamp(SH.br1, l1, r1));
  const al2 = clamp(SH.al2, l2, r2), ar2 = clamp(SH.ar2, l2, r2), bl2 = Math.max(ar2, clamp(SH.bl2, l2, r2)), br2 = Math.max(ar2, clamp(SH.br2, l2, r2));
  cq(A, B, l1, al1, l2, al2, col, dd); cq(A, B, ar1, bl1, ar2, bl2, col, dd); cq(A, B, br1, r1, br2, r2, col, dd); }
function cq(A, B, x1, y1, x2, y2, col, dd){ if(y1 - x1 > 1e-4 || y2 - x2 > 1e-4) washQuad(A, B, x1, y1, x2, y2, col, dd); }
function subStrip(s, a, b, e, c, z0, za, zb, G){
  const A = pAt(a, b, (za - z0) / SEG, PA), B = pAt(a, b, (zb - z0) / SEG, PB); if(A.y - B.y < .25) return;
  const v = clamp((fall(Math.max(SB.span, (za + zb) / 2 + SB.span), e.d0) - e.fR) / e.fN, 0, 1), D = q16(v * SB.vmax * G), Dc = v > .45 ? q16(v * .25 * G) : 0; if(D <= 0) return;
  const s0 = e.kB * 1.5, h1 = Math.min(SB.hw, (s0 + Math.max(0, e.ay - A.y) * SB.sl) / A.w), h2 = Math.min(SB.hw, (s0 + Math.max(0, e.ay - B.y) * SB.sl) / B.w);
  // the bike's two shadows, one per lamp, from the tyre forward: each splays away from its lamp and widens (the rider stands taller than
  // the lamps, so it runs on to the end of the beam). A shadow is the beams cut away, not a dark fill: the beams are drawn either side of
  // the two shadows, so inside them the road keeps its own colour (a black fill over a dark road reads as a hole, not a shadow)
  const sh = za >= 0 && !BIKE.hidden, z2 = zb;
  const w1 = .02 + .035 * Math.min(1, za / 600) + za * .000006, w2 = .02 + .035 * Math.min(1, z2 / 600) + z2 * .000006;
  const A1 = playerX - e.o1 * za / SB.span, A2 = playerX - e.o1 * z2 / SB.span, B1 = playerX - e.o0 * za / SB.span, B2 = playerX - e.o0 * z2 / SB.span;   // A: the right lamp's shadow (it falls to the left), B: the left lamp's
  const yw = (c.yaw || 0) + (c.fish || 0) * Math.sin(c.fp || 0), sw1 = yw * (Math.max(0, za) + SB.span * 2) / ROADW * 1.5, sw2 = yw * (Math.max(0, zb) + SB.span * 2) / ROADW * 1.5;   // the beams swing with the car's heading
  // the two beams as three regions that never overlap (each pixel is filled once: every fill is a screen blend, and the GPU pays per
  // fill): the left beam alone, where the two cross (a warmer core), the right beam alone; each with the shadows cut out
  const u0 = playerX + e.o0, u1 = playerX + e.o1, l01 = u0 + sw1 - h1, r01 = u0 + sw1 + h1, l11 = u1 + sw1 - h1, r11 = u1 + sw1 + h1, l02 = u0 + sw2 - h2, r02 = u0 + sw2 + h2, l12 = u1 + sw2 - h2, r12 = u1 + sw2 + h2;
  const m1 = Math.min(r01, l11), n1 = Math.max(r01, l11), m2 = Math.min(r02, l12), n2 = Math.max(r02, l12);
  SH.on = sh; SH.al1 = A1 - w1; SH.ar1 = A1 + w1; SH.bl1 = B1 - w1; SH.br1 = B1 + w1; SH.al2 = A2 - w2; SH.ar2 = A2 + w2; SH.bl2 = B2 - w2; SH.br2 = B2 + w2;
  cutQuad(A, B, l01, m1, l02, m2, BEAM, D); cutQuad(A, B, l11, Math.max(l11, r01), l12, Math.max(l12, r02), Dc ? LAMP : BEAM, Dc ? q16(v * (SB.vmax + .1) * G) : D); cutQuad(A, B, n1, r11, n2, r12, BEAM, D);
  if(s.stripe) for(const lx of LANE_X){ const L = lx * 2, hm = (h1 + h2) / 2, sw = (sw1 + sw2) / 2;   // the lane dashes inside a beam catch it, with the same falloff
    if(Math.abs(L - playerX - e.o0 - sw) < hm || Math.abs(L - playerX - e.o1 - sw) < hm) washQuad(A, B, L - .025, L + .025, L - .025, L + .025, LAMP, q16(v * G)); } }
// the warning over the car's roof during a lunge's 0.8 s: a red plate with a white '!', blinking at 2.5 Hz (steady under reduced motion)
const WARN = ['.KKKKK.', 'KRRwRRK', 'KRRwRRK', 'KRRwRRK', 'KRRRRRK', 'KRRwRRK', '.KKKKK.', '...K...'];
function warnSign(c, A){ if(c.ph !== 'tele' || !A.ok || CL.text) return;   // clean: the warning is the car's own body language and the lane strip, no sign
  if(!reduce && Math.floor(c.t / .2) % 2) return; const k = Math.max(PX * 2, snap(Math.min(A.w * .05, PX * 4))), bx = (A.bar[0][0] + A.bar[1][0]) / 2, by = Math.min(A.bar[0][1], A.bar[1][1]) - k * 10;
  const x0 = snap(clamp(bx, k * 5, W - k * 9) - k * 3.5), y0 = snap(Math.max(k * 2, by));
  for(let j = 0; j < WARN.length; j++) for(let i = 0; i < 7; i++){ const ch = WARN[j][i]; if(ch === '.') continue; cx.fillStyle = ch === 'K' ? '#0a0810' : ch === 'w' ? '#fff4f0' : '#ff2a3a'; cx.fillRect(x0 + i * k, y0 + j * k, k, k); } }
// the rear view: a car behind the camera rises at the bottom of the screen, its front growing as it gains (drawn before the bike)
function chaseUnder(now){ if(!FR.n) return; const bs = Math.min(W * .2, H * .27);
  for(let n = 0; n < FR.n; n++){ const e = FR.E[n], c = e.c; if(e.world) continue;
    if(CL.subway) continue;   // drawn over the bike instead (chaseFront, from drawScreen)
    if(CL.mirror){ mirrorCar(e, c, bs); continue; }
    const g = -c.dz, cc = clamp((3300 - g) / 2800, 0, 1), wd = W * lerp(.07, .25, Math.pow(cc, 1.15)), mpx = wd / 1.95, dxr = c.x - playerX, sd = Math.sign(dxr) || c.side;
    const view = Math.abs(dxr) < .09 ? 'front' : 'f34', flip = view === 'f34' && dxr > 0, S = pickS(mpx / PX), m = CM[view + S]; if(!m) continue;
    const hd = m.h * Math.min(1.5, mpx / PX / S) * PX, q = clamp((700 - g) / 400, 0, 1);   // as it draws level it slides out past the corner
    const x = clamp(W / 2 + dxr * W * lerp(.3, .62, cc), W * .24, W * .76) + sd * W * .28 * q, yb = H + hd * lerp(.45, .1, cc) + hd * .6 * q;

    const A = drawCar3(view, mpx, FR.ph, flip, x, yb, e.k); carGlows(A, e, wd * .22, 1); backing(A, bs, e.k); warnSign(c, A); mirRec(A);
    if(A.ok && e.k > .3){ for(const p of A.head) sglow(p[0], p[1] - hd * .05, wd * (e.flash ? .9 : .55), BEAM, (e.flash ? .35 : .18) * e.k * cc); }   // the beams in your eyes
  } }
/* The pursuer in the mirror (Wangan Midnight / Initial D: the rival is a pair of headlights and a light bar low in the frame behind you).
   The car sits at the bottom edge on its own side of the bike, never under the rider: its inner edge keeps a gap from the bike's
   silhouette, and only its top shows (the bar, the screen, the bonnet), more as it closes. Crossing to your other side it sinks out of
   view first, slides across hidden and rises again. The ram's warning is the car's own body language: its nose turns square on to you
   (the front view), it lifts in the frame and flashes its high beams (2.5 Hz), with the squeal. Drawn before the bike. */
// the Subway Surfers pursuer (CL.subway): fixed size, fixed height, the traffic's sprite style, driven like a car (subDrive)
const SUB = { rise:.5, riseAt:.45, sink:1.0, rows:16 };   // rows of the 24-row sprite showing above the bottom edge: bar, roof, screen and the top of the bonnet (was 21, down to the lamps: drawn over the bike now, that hid all but the helmet)
/* How it drives (Kellan, 2026-11-20: "like a real police car instead of just what looks like a dampened spring following the player's
   position"). It was c.lx easing toward playerX: every wiggle copied, smoothed. Now it is a vehicle with its own state, steered at a target
   line the way racing AI is (Need for Speed's target-line steering with rate limits; Reynolds' pursuit and offset pursuit; Burnout's cops):
   - target: where the bike is heading (its x plus its lateral velocity times 0.45 s), a little inside on a bend (as traffic hugs it),
     and every 6-10 s an offset pursuit, swinging out a third of a road to look past you for 1.6 s, then back onto your tail;
   - commitment: a change of target under 0.6 must persist 0.4 s before it is taken (a quick weave is not copied), a bigger one is taken at once;
   - steering: a steering angle that moves at most 6 per s toward what closes on the target, the lateral acceleration it gives (3.2
     half-roads per s squared at full lock) and tyre drag: so it reacts late, commits, overshoots a touch and settles;
   - traffic: a car in its path ahead of it moves its target to that car's other side;
   - body: yaw from its lateral velocity and a roll to the outside from its steering, drawn as a whole-pixel shear of the sprite's rows
     (the roof moves most, the bumper not at all); a hard reversal at speed starts a short fishtail; a squat (one pixel up) as it pushes
     on, a nose dip (one pixel down) as it drops back;
   - longitudinal beats: it drops back four rows when you boost, then pushes to catch up; when you brake hard it surges a row closer;
     either way it flashes its high beams (two blinks, once in 6 s at most; never under reduced motion or no-flash).
   It is drawn only: no hit test reads it (CL.subway has no lunges), so it can never cause a crash; the arrest stays the core's two-strike rule. */
const DRV = { look:.45, inside:.025, hold:.4, big:.6, small:.14, gain:2, vmax:1, rate:6, amax:3.2, drag:.6, swing:.32, swingT:1.6, hbCool:6 };
function subDrive(c, dt){
  if(c.lx === undefined){ c.lx = playerX; c.dvx = 0; c.st = 0; c.yaw = 0; c.tgt = playerX; c.pt = 0; c.sw = 0; c.swT = 6 + Math.random() * 4; c.fish = 0; c.fp = 0; c.hb = 0; c.hbc = 2; c.zb = 0; c.vz = 0; c.px = playerX; c.bvx = 0; c.ps = speed; c.ba = 0; c.age = 0; c.bo = false; }
  c.age += dt; if(dt <= 0) return;
  c.bvx += ((playerX - c.px) / dt - c.bvx) * (1 - Math.exp(-dt / .3)); c.px = playerX;   // the bike's lateral velocity, smoothed over 0.3 s (a wiggle averages out)
  c.ba += ((speed - c.ps) / dt - c.ba) * (1 - Math.exp(-dt / .2)); c.ps = speed;
  // the swing-out (offset pursuit) now and then, to the side with room
  c.swT -= dt; if(c.swT <= 0){ if(c.sw){ c.sw = 0; c.swT = 6 + Math.random() * 4; } else { c.sw = (Math.abs(playerX) > .3 ? -Math.sign(playerX) : (Math.random() < .5 ? -1 : 1)) * DRV.swing; c.swT = DRV.swingT; } }
  const sg = segs[FR.bikeSeg], cv = sg ? sg.curve || 0 : 0;
  const want = clamp(playerX + clamp(c.bvx * DRV.look, -.3, .3) + cv * DRV.inside + c.sw, -.9, .9), dv = Math.abs(want - c.tgt);
  if(dv > DRV.big){ c.tgt = want; c.pt = 0; } else if(dv > DRV.small){ c.pt += dt; if(c.pt > DRV.hold){ c.tgt = want; c.pt = 0; } } else c.pt = 0;
  let tgt = c.tgt; const cz = FR.bikeZ + c.dz;   // traffic in its path, up to 6 segments ahead of it: pass on the far side
  for(const k of cars){ const ahead = k.z - cz; if(ahead < 0 || ahead > SEG * 6 || Math.abs(k.x - tgt) > .32) continue; tgt = k.x + (want >= k.x ? .34 : -.34); }
  tgt = clamp(tgt, -.9, .9);
  const vdes = clamp((tgt - c.lx) * DRV.gain, -DRV.vmax, DRV.vmax), sd = clamp((vdes - c.dvx) * 2.2, -1, 1), st0 = c.st;
  c.st += clamp(sd - c.st, -DRV.rate * dt, DRV.rate * dt);
  c.dvx += (c.st * DRV.amax - c.dvx * DRV.drag) * dt; c.lx = clamp(c.lx + c.dvx * dt, -1, 1); if(Math.abs(c.lx) >= 1) c.dvx = 0;
  if(!reduce && Math.sign(c.st) !== Math.sign(st0) && Math.abs(c.dvx) > .45 && Math.abs(st0) > .5) c.fish = .07;   // a hard reversal at speed: the tail steps out
  c.fp += dt * 15; c.fish *= Math.exp(-dt * 3); c.yaw += (c.dvx * .18 - c.yaw) * (1 - Math.exp(-dt / .12));
  // longitudinal: drop back on a boost and push back after; surge on hard braking
  const boost = typeof boostT !== 'undefined' && boostT > 0, brake = c.ba < -MAXS * .25, zt = boost ? -4 : brake ? 1 : 0;
  const az = clamp((zt - c.zb) * 9 - c.vz * 5, -40, 40); c.vz += az * dt; c.zb += c.vz * dt;
  c.hbc -= dt; c.hb = Math.max(0, c.hb - dt);
  const flash = c.ph !== 'leave' && c.hbc <= 0 && !reduce && (brake || (c.bo && !boost)); if(flash){ c.hb = .5; c.hbc = DRV.hbCool; }   // closing in on you: the high beams
  c.bo = boost; }
const hbOn = t => t > .38 || (t > .12 && t < .24);   // two blinks in half a second
function subwayCar(e, c, bs, now){
  const dt = FR.dt, kB = Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX);   // the bike's own pixel size (bikeHalf in the core)
  subDrive(c, dt);
  const out = c.ph === 'leave', up = sm01((c.age - SUB.riseAt) / SUB.rise), down = out ? sm01(c.t / SUB.sink) : 0;
  const spr = copFront(reduce ? 2 : FR.ph), w = spr.width * kB, h = spr.height * kB;
  const bob = reduce ? 0 : (Math.floor(now / 260) % 2) * kB;   // one sprite pixel, stepped (a suspension bob, not a slide)
  const pitch = c.vz > 2.5 ? -kB : c.vz < -2.5 ? kB : 0;   // squat as it pushes on, nose dip as it drops back
  c.subUp = up * (1 - down);   // the beams (subBeams) rise and sink with the car
  const show = Math.round(Math.min(SUB.rows + 1, SUB.rows + c.zb) * up * (1 - down)) * kB; if(show <= 0) return;
  const x = snap(clamp(W / 2 + (c.lx - playerX) * W * .45, w * .5, W - w * .5) - w / 2), y = snap(H - show + bob + pitch);
  // yaw and roll as a whole-pixel shear: row j moves round(sh * (1 - j / 23)) sprite pixels (the roof most, the bumper not at all)
  const sh = clamp(-(c.yaw + c.fish * Math.sin(c.fp)) / .18 * 1.5 - c.st * .8, -2.5, 2.5) * (reduce ? .5 : 1);
  cx.imageSmoothingEnabled = false;
  for(let j0 = 0, j = 1; j <= spr.height; j++){ const d0 = Math.round(sh * (1 - j0 / 23)); if(j < spr.height && Math.round(sh * (1 - j / 23)) === d0 && y + j * kB < H) continue;
    if(y + j0 * kB < H) cx.drawImage(spr, 0, j0, spr.width, j - j0, x + d0 * kB, y + j0 * kB, w, (j - j0) * kB); j0 = j; }
  const A = AN; A.ok = true; A.x = x; A.y = y; A.w = w; A.h = h; mirRec(A);
  const bx = x + Math.round(sh * (1 - 1.5 / 23)) * kB;   // the bar rides on the roof's shear
  // the bar's halves and the headlamps glow (lamps may be hot: the core's additive glow)
  const ph = reduce ? 2 : FR.ph, f = e.k;
  for(let i = 0; i < 2; i++){ const lit = ph === 2 || ph === i, gx = bx + (i ? 27.5 : 12.5) * kB, gy = y + 1.5 * kB; glow(gx, gy, kB * (lit ? 7 : 3), WASH, (lit ? .55 : .2) * f); }
  // the headlamps sit just under the bottom edge (rows 17-18): their bloom spills up over the bumper corners, stepped whole-pixel discs
  // (a dim outer ring, a half-dithered ring, a hot core), where the two beams start; flashed high beams open it up
  const fl = e.flash ? 1.35 : 1, lf = f * c.subUp * (reduce ? .75 : 1); cx.globalCompositeOperation = 'lighter';
  for(const hx of [3, 37]){ const lx = x + hx * kB, ly = y + 18 * kB;
    spanFill(lx, ly, kB * 10 * fl, kB * 7.5 * fl, ditherPat(BEAM, qd(.25 * lf))); spanFill(lx, ly, kB * 6.5 * fl, kB * 5 * fl, ditherPat(LAMP, qd(.5 * lf)));
    cx.globalAlpha = Math.min(1, .7 * lf * fl); spanFill(lx, ly, kB * 4 * fl, kB * 3.4 * fl, '#fff4d8'); cx.globalAlpha = 1; }
  cx.globalCompositeOperation = 'source-over'; }
const sm01 = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const MIR = { n:0, r:[[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]] };   // tests: this frame's mirror cars as [x, y, w, h] (no allocation)
P.mirror = () => MIR;
function mirRec(A){ if(!A.ok || MIR.n >= 3) return; const r = MIR.r[MIR.n++]; r[0] = A.x; r[1] = A.y; r[2] = A.w; r[3] = A.h; }
function mirrorCar(e, c, bs){
  const g = -c.dz, cc = clamp((3300 - g) / 2800, 0, 1), dxr = c.x - playerX, tele = c.ph === 'tele' && c.kind === 'ram';
  const lunge = c.ph === 'tele' || c.ph === 'strike' || c.ph === 'over';   // through a lunge it holds its side of the mirror: it lifts and drops back, never crosses (the bike passing it mid-strike would make it ping-pong)
  const want = lunge || Math.abs(dxr) <= .05 ? (Math.sign(c.so) || c.side) : Math.sign(dxr);
  const one = CL.oneView, out = one && c.ph === 'leave', cr = FR.dt * (tele || c.ph === 'strike' || c.ph === 'over' ? 6 : 3.5); if(!out) c.so += clamp(want - c.so, -cr, cr);   // a warning never hides mid-crossing; leaving, it keeps its side
  const sd = Math.sign(c.so) || c.side, a = Math.abs(c.so), vis = sm01((a - .35) / .65), slide = Math.min(1, a / .35);
  const wd = bs * lerp(.42, .95, Math.pow(cc, 1.1)), mpx = wd / 1.95;   // sized to the bike, not the screen: it reads the same at 400 px and on a desktop
  const view = one || tele ? 'front' : 'f34', flip = view === 'f34' && sd > 0, S = pickS(mpx / PX), m = CM[view + S]; if(!m) return;
  const k = Math.min(1.5, mpx / PX / S) * PX, dw = m.w * k, hd = m.h * k, ox = (flip ? m.w - m.ox : m.ox) * k;
  const q = one ? 0 : clamp((700 - g) / 400, 0, 1);   // (two views) drawing level for a strike or a pull-alongside: it slides out past the corner and hands over to the road
  const along = one ? clamp((c.dz + 700) / 900, 0, 1) : 0, sink = out ? sm01(c.t / 1.3) : 0;   // one view: level with you it rises beside you; leaving, it sinks out
  const gap = bs * .3 + Math.max(PX * 3, W * .012);   // the bike's half-width (its widest lean) plus a clear margin
  const x = W / 2 + (sd > 0 ? gap + ox : -(gap + dw - ox)) * slide + sd * W * .2 * q;
  const show = (hd * lerp(.36, .56, cc) * vis * (1 - q * .7) + (tele ? hd * .12 * Math.min(1, c.t / .25) * vis : 0) + hd * .16 * along * vis) * (1 - sink);
  if(show < PX) return;
  const yb = H - show + m.oy * k;
  const A = drawCar3(view, mpx, FR.ph, flip, x, yb, one ? 1 : e.k); if(!A.ok) return;   // one view: solid while it sinks (no fade)
  mirRec(A);
  carGlows(A, e, wd * .16, .8);
  if(e.k > .3) for(const p of A.head) sglow(p[0], p[1], wd * (e.flash ? .5 : .28), BEAM, (e.flash ? .3 : .12) * e.k * cc); }
/* Behind, not beside: where the rear-view car sits under the rider, a dithered dark backing round the bike (clipped to the car's own
   box) separates the white helmet and fairing from the white bonnet, so the bike reads as the nearer, occluding layer and the car as the
   one behind it (the depth outline of pixel-art layering; Akira's bikes cut out against the lit traffic behind them). Two stepped rings. */
function backing(A, bs, k){ if(!A.ok || k < .2) return; const cxB = W / 2, cyB = H - 8 - bs * .4;
  if(A.x + A.w < cxB - bs * .4 || A.x > cxB + bs * .4) return;   // the car is clear of the rider: nothing to separate
  const ov = (H - 8) - Math.max(A.y, H - 8 - bs * .85); if(ov < bs * .3) return;   // only its roof and bar behind the tyre: leave the bar's light alone
  k = ov > bs * .55 ? k : k * .5;
  const m = A.m, R = m.rows, k0 = A.k; cx.save(); cx.beginPath();   // clip to the car's own pixels, row by row (never onto the road beside it)
  for(let j = 0; j < m.h; j++){ const a = R[j * 2]; if(a < 0) continue; const b = R[j * 2 + 1], x0 = A.flip ? m.w - 1 - b : a; const y0 = snap(A.y + j * k0), y1 = snap(A.y + (j + 1) * k0), xa = snap(A.x + x0 * k0); if(y1 > y0) cx.rect(xa, y0, snap(A.x + (x0 + b - a + 1) * k0) - xa, y1 - y0); }
  cx.clip();
  spanFill(cxB, cyB, bs * .4, bs * .56, ditherPat(SHADE, k > .6 ? .5 : .25)); spanFill(cxB, cyB + bs * .04, bs * .36, bs * .52, ditherPat(SHADE, k > .6 ? .75 : .5));
  cx.restore(); }
// an ellipse as whole-pixel row spans (no antialiased edge)
function spanFill(x, y, rx, ry, fill){ cx.fillStyle = fill; const r0 = Math.round((y - ry) / PX), r1 = Math.round((y + ry) / PX); cx.beginPath();   // one path, one draw call
  for(let r = r0; r <= r1; r++){ const v = ((r + .5) * PX - y) / ry; if(v <= -1 || v >= 1) continue; const hw = rx * Math.sqrt(1 - v * v), a = Math.round((x - hw) / PX), b = Math.round((x + hw) / PX); if(b > a) cx.rect(a * PX, r * PX, (b - a) * PX, PX); }
  cx.fill(); }
P.drawUnderBike = now => { try{ chaseUnder(now); }catch(err){ console.warn('chase under', err); } };
/* The Subway Surfers pursuer is drawn OVER the bike (Kellan, 2026-11-20: "the police car shows up below the bike"). Its true depth is never
   in doubt: it only ever rides behind you (dz -3000 .. about -700; with CL.subway there are no lunges, so no 'side' or 'ahead' phase),
   and the camera sits PZ (~839) behind the bike, so the car is always between the camera and the rider: the nearer layer. */
function chaseFront(now){ if(!FR.n || !CL.subway) return; const bs = Math.min(W * .2, H * .27);
  for(let n = 0; n < FR.n; n++){ const e = FR.E[n]; if(!e.world) subwayCar(e, e.c, bs, now); } }
/* The subway car's lamps on the rider: a light map per bike, pose and animation step, built once from the bike's own sprite cells (drawn
   at one pixel per sprite pixel through a stand-in context that keeps only the cells: no shadow ellipse, no lamp glows) and cached. Its
   back is lit warm in three flat bands up from the tyre (the lamps sit low; no dither: on a sprite it reads as noise), and a one-pixel rim
   runs down each outer edge below the helmet (each lamp lights the flank on its own side). Per frame it is one drawImage, 'screen', with
   the core's own transform for the bike (the same x, y, pixel size, pose and lean residual as render()). */
const RIM = { m:new Map(), s:null, g:null };
const RG = { imageSmoothingEnabled:false, fillStyle:'', globalCompositeOperation:'source-over', save(){ RIM.g.save(); }, restore(){ RIM.g.restore(); }, translate(x, y){ RIM.g.translate(x, y); }, rotate(r){ RIM.g.rotate(r); },
  drawImage(i, a, b, c, d, e, f, g, h){ RIM.g.drawImage(i, a, b, c, d, e, f, g, h); }, beginPath(){}, ellipse(){}, arc(){}, fill(){}, fillRect(){} };
const RIMS = 64, RIMY = 52;   // the light map's size and the tyre's row in it (sprite pixels)
function rimMap(id, f, q){ const key = id + '|' + f + '|' + q; let m = RIM.m.get(key); if(m) return m;
  if(!RIM.s){ RIM.s = document.createElement('canvas'); RIM.s.width = RIM.s.height = RIMS; RIM.g = RIM.s.getContext('2d', { willReadFrequently:true }); }
  const g = RIM.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, RIMS, RIMS);
  ENV.bikes.render(RG, id, RIMS / 2, RIMY, 1, ENV.bikes.poseLean(f), q * 45, null, f);
  const src = g.getImageData(0, 0, RIMS, RIMS).data, out = new ImageData(RIMS, RIMS), D = out.data, on = (x, y) => x >= 0 && x < RIMS && src[(y * RIMS + x) * 4 + 3] > 0;
  for(let y = 0; y < RIMS; y++) for(let x = 0; x < RIMS; x++){ if(!on(x, y)) continue; const up = RIMY - y, o = (y * RIMS + x) * 4;
    const band = up < 9 ? .26 : up < 18 ? .17 : up < 27 ? .085 : 0, rim = up < 21 && (!on(x - 1, y) || !on(x + 1, y));
    const c = rim ? [216, 196, 148] : [184, 164, 120], al = rim ? .55 : band; if(al <= 0) continue; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = Math.round(al * 255); }
  m = document.createElement('canvas'); m.width = m.height = RIMS; m.getContext('2d').putImageData(out, 0, 0); if(RIM.m.size > 80) RIM.m.clear(); RIM.m.set(key, m); return m; }
function rimLight(e, bs, now){ const B = ENV.bikes, c = e.c; if(!B || !B.render || !B._cur || !B.poseLean || BIKE.hidden || POSE.pitch > .01) return;
  const gh = recov > 0 && state === 'play' ? (reduce ? .55 : (Math.floor(recov * 8) % 2 ? .4 : .9)) : 1;   // the core's recovery blink (the bike is drawn at this alpha)
  const lf = (c.subUp || 0) * e.k * FR.g * gh * (e.flash ? 1.4 : 1) * (reduce ? .75 : 1); if(lf <= .05) return;
  const k = Math.max(PX, Math.round(bs / 30 / PX) * PX), bob = speed > 10 ? Math.sin(now / 40) * (Math.abs(playerX) > 1 ? 2 : .6) : 0, x = W / 2, y = H - 8 + bob - AIR.h;   // as the core draws it
  const id = BIKE.id || 'sport', f = B._cur(), res = clamp(leanV - B.poseLean(f), -.14, .14), m = rimMap(id, f, Math.floor(now / 45) % 3);
  cx.save(); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = Math.min(1, lf); cx.imageSmoothingEnabled = false;
  cx.translate(Math.round(x), Math.round(y)); if(Math.abs(res) > .002) cx.rotate(res); cx.drawImage(m, -RIMS / 2 * k, -RIMY * k, RIMS * k, RIMS * k); cx.restore(); }
// the light on the rider and the edge of the frame
function chaseOver(now){ if(!FR.n || P._dark) return; const bs = Math.min(W * .2, H * .27), ph = FR.ph; let best = null, bn = 0;
  for(let n = 0; n < FR.n; n++){ const e = FR.E[n], c = e.c, g = Math.abs(c.dz), k = clamp(1 - (g - 300) / 2600, 0, 1) * e.k; if(k > bn){ bn = k; best = e; } }
  if(!best || bn <= .02) return; bn *= FR.g; const c = best.c, sub = CL.subway && !best.world;
  const sd = (sub ? (ph === 0 ? -1 : ph === 1 ? 1 : 0) : 0) || (CL.mirror && !best.world ? Math.sign(c.so) : Math.sign(c.x - playerX)) || c.side, on = ph === 2 ? .65 : (sub || ph === (sd > 0 ? 1 : 0) ? 1 : .45);   // subway: the lit half of the bar's side
  sglow(W / 2 + sd * bs * .22, H - bs * .55, bs * .5, WASH, (CL.light ? .2 : .28) * on * bn);   // the bar's red on the bike's near side
  if(sub){ if(c.dz < -150 || c.ph === 'leave') rimLight(best, bs, now); }   // the lamps behind light the rider's back and edges
  else if(c.dz < -150) sglow(W / 2, H - bs * .5, bs * .6, BEAM, (best.flash ? .3 : .12) * bn);     // the high beams on your back
  if(!CL.light) glow(sd > 0 ? W : 0, H * .78, H * .7, WASH, (ph === 2 ? .14 : .22 * on) * bn);   // the frame's edge on its side (clean: none; the light stays on the road and the rider)
  if(wobT > 0 && !reduce){ const f = wobT / CT.wob; glow(W / 2, H - bs * .2, bs * .35, '#ffd04a', .12 * f); } }
})();
