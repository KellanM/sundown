/* Sundown mechanic module: crew. See mech/README.md and research/sundown-craft/crew.md.
   Your own crew: two or three riders who line up with you at the start, ride with you in a loose formation, thin out over the night
   and, now and then, come back. You are the 総長 (the leader); they wear your colours.

   Studied (rules taken, nothing copied):
   - Bōsōzoku practice (ja.wikipedia 暴走族): a run is a column that owns the road. 特攻隊 ride at the front, the 本隊 in the middle, and
     the けつ持ち (rear guard) at the back, whose job is to block police cars chasing the group. The 旗持ち carries the gang's flag from the
     pillion seat. The コール (throttle and horn calls) is how the column talks.
   - Akira (1988), the Capsules: the gang reads as one body because every bike shares a colour and they answer each other.
   - Crazy Thunder Road / Burst City (Ishii): the column, flags up, is the image; the members are faces in it, not individuals.
   (Films not rewatched for this pass: the notes say what was borrowed from descriptions and stills, honestly.)

   Rules here (Kellan, after playing: "I like how you start with your gang but you should lose them until a rival gang comes in and then
   they should help you fight"):
   - The formation start: lined up with you through the countdown, flags up; they answer your horn on GO and launch with you, loose.
   - The fall-away: right after GO (about 1-2.5 s in; Kellan, 2026-11-19), the column breaks up. The rear guard takes an exit with a raised fist; the other two salute
     and drop back. From there you ride the night alone. They never drift back at random.
   - The return: when a rival pack turns up (gang.js onPack), two or three of them roar in from behind, horns and flags, and fight beside
     you (see "the fight" below). When the pack's business is done they call the victory and fall away again, until the next pack.
   - Physically the crew never touches you: no collision, no push, no speed change. They yield when you steer at them, dodge traffic and
     rivals, and never sit in your line ahead. The fight goes through gang.js's own rules (crewHit, the same takedowns and telegraphs).
   - The sacrifice (the けつ持ち's job) stays, but only while the crew is with you: during a chase a crewmate salutes, drops back, cuts
     across the patrol car's nose and leads it off (copT = 0, mech('decoy', info)). Once per crewmate, at most once a minute.
   - Own PRNG (never Math.random), so the ride's own randomness is the same with the crew on or off (?crew=0), and the bots can compare. */
"use strict";
(() => {
const C = MECH.crew = {};
// off by default (Kellan, 2026-11-19: no crew riding with you, even in rival duels); ?crew=1 brings it back
C.on = /[?&]crew=1/.test(location.search);

/* ------------------------------------------------------------------ randomness: our own stream */
let seed = 1;
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ------------------------------------------------------------------ the roster: who rides with you
   look: gang.js's rider looks (1 tokkō grunt, 2 sukajan). two: a 旗持ち on the pillion with the big hata. The order is also the order
   in which they give the gift (the rear guard first: it is their job). */
const ROSTER = [
  { id:0, role:'kesu', look:1, two:false, pitch:-5 },   // けつ持ち, the rear guard
  { id:1, role:'tokko', look:2, two:false, pitch:-2 },  // 特攻, the sukajan wing
  { id:2, role:'hata', look:1, two:true, pitch:-9 } ];  // 旗持ち, two-up with the flag
const CR = ROSTER.map(o => Object.assign({ st:'gone', z:0, x:0, vx:0, kvx:0, stun:0, speed:0, lean:0, rvb:0, sink:0, t:0, gift:true, side:1, launch:0, acc:1,
  fist:0, leaveSide:1, leaveAt:0, fired:false, fireT:0, cop:null, airH:0, tgt:null, blk:null, wind:0, kick:0, kside:1, kcd:0, prev:'ride', cross:0, sd:0, dz:0, sgap:0, soff:.4,
  dn:{ side:1, gap0:0, x0:0, rz:0, rx:0 } }, o));
let started = false, clock = 0, chaseT = 0, lastDecoy = -99;
const ST0 = () => ({ decoys:0, arrivals:0, victories:0, crewKicks:0, blocks:0, whiffs:0, crewKicked:0, downs:0 });
let ST = ST0();
const honkQ = [];   // scheduled horn answers: preallocated slots { at, id, kind } (no allocation in the frame)
for(let i = 0; i < 8; i++) honkQ.push({ at:-1, id:0, kind:0 });

/* ------------------------------------------------------------------ colours: yours */
// the crew wears your jacket's colours (ui/cosmetics.js), or your own leathers' (gang.js's PLEG, the player's rider colours)
function ramp(){ let c3 = null;
  try{ const st = window.COS && COS.state && COS.state(), j = st && COS.BY[st.eq.jacket]; if(j && j.c) c3 = j.c; }catch(e){}
  if(!c3){ const G = MECH.gang && MECH.gang._dbg, L = G && G.PLEG ? (G.PLEG[BIKE.id] || G.PLEG.sport) : { a:'#3ad0f0', b:'#1890b8', c:'#106a90' }; c3 = [L.a, L.b, L.c]; }
  return { col:[mixc(c3[0], '#ffffff', .45), c3[0], c3[1], c3[2], mixc(c3[2], '#05040a', .5)], K:mixc(c3[2], '#05040a', .8) }; }

/* ------------------------------------------------------------------ sprites
   The bikes and riders are gang.js's looks (same frame, same scale as the rivals and the player) repainted in crew colours. New art,
   drawn here as pixel grids: the pillion flag bearer, the big swallowtail hata with a 菱 (diamond) crest, the small swallowtail pennant,
   and the raised-fist salute. Rivals fly rectangles and triangles with a ring crest; the crew's swallowtails read as "ours" at a glance. */
const CW = 48, CH = 64, GY = 60, RM = { O:'S', '0':'1', h:'H', n:'N', Y:'y' };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function mk(rows, P, full){ const n = Math.max(...rows.map(r => r.length)), rs = rows.map(r => full ? r.padEnd(n, '.') : r.padStart(n, '.'));
  const c = canvas(full ? n : n * 2, rs.length), k = c.getContext('2d');
  rs.forEach((r0, y) => { const r = full ? r0 : r0 + [...r0].reverse().map(ch => RM[ch] || ch).join('');
    for(let x = 0; x < r.length; x++){ let ch = r[x]; if(ch === '.') continue; if(ch === '%') ch = (x + y) % 2 ? '1' : '2'; const col = P[ch]; if(!col) continue; k.fillStyle = col; k.fillRect(x, y, 1, 1); } });
  return c; }
const flipC = c => { const o = canvas(c.width, c.height), k = o.getContext('2d'); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return o; };
// paint with rects into a key grid, then outline every edge pixel in a dark version of the colour it borders (the game's outline rule)
function paint(w, h, P, fn){ const g = []; for(let y = 0; y < h; y++){ g.push(new Array(w).fill('')); }
  const R = (x, y, ww, hh, c) => { for(let j = y; j < y + hh; j++) for(let i = x; i < x + ww; i++) if(i >= 0 && j >= 0 && i < w && j < h) g[j][i] = c; };
  fn(R); const c = canvas(w, h), k = c.getContext('2d');
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let col = g[y][x] ? P[g[y][x]] : null;
    if(!col){ let nb = ''; for(const [i, j] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if(i >= 0 && j >= 0 && i < w && j < h && g[j][i] && g[j][i] !== 'V' && g[j][i] !== 'v'){ nb = g[j][i]; break; } if(nb) col = P.K; }
    if(col){ k.fillStyle = col; k.fillRect(x, y, 1, 1); } }
  return c; }

// The 旗持ち from behind, sitting on the pillion, both hands up the pole on the right (mirrored for the left). 18 x 24; the seat is the
// bottom row. Punch-perm hair with a white hachimaki (its tails stream back to the left), a crew-colour tokkōfuku with the gold kanji
// column down the back (dark gaps suggest characters), the near arm reaching up to the pole, the far hand crossing to it lower down.
function pillion(P){ return paint(18, 24, P, R => {
  R(14, 0, 1, 24, 'V'); R(15, 0, 1, 24, 'v');                                   // the pole (hands over it)
  R(3, 10, 10, 13, '2'); R(3, 11, 1, 12, '1'); R(4, 10, 1, 2, '1'); R(12, 11, 1, 12, '3'); R(4, 9, 8, 1, '2'); R(3, 22, 10, 1, '3');   // the coat
  R(7, 12, 2, 9, 'Y'); for(const y of [14, 17, 20]) R(7, y, 2, 1, 'y');        // the kanji column
  R(6, 7, 4, 2, 'E'); R(9, 7, 1, 2, 'e');                                       // the neck
  R(5, 1, 7, 6, 'H'); R(6, 0, 5, 1, 'H'); R(6, 1, 2, 2, 'h'); R(7, 3, 1, 1, 'h');   // the hair, a sheen top left
  R(5, 4, 7, 1, 'O'); R(10, 4, 2, 1, 'S');                                     // the hachimaki
  R(4, 4, 1, 1, 'O'); R(3, 5, 1, 1, 'O'); R(2, 6, 1, 1, 'S'); R(3, 4, 1, 1, 'S');   // its knot tails
  R(12, 9, 2, 2, '2'); R(13, 6, 1, 3, '2'); R(13, 5, 2, 1, '2'); R(12, 7, 1, 2, '3');   // the near arm, up to the pole
  R(13, 3, 3, 2, 'E'); R(13, 3, 1, 1, 'e');                                     // the upper hand round the pole
  R(12, 14, 2, 2, '3'); R(13, 15, 3, 2, 'E'); R(15, 16, 1, 1, 'e'); }); }      // the lower hand
// the big hata: a swallowtail on a gold-tipped pole, flying away from the pole; three ripple phases (FW x FH field)
function hata(P, ph){ const FW = 22, FH = 13, PH = 26, c = canvas(FW + 4, FH + PH), k = c.getContext('2d'), px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); };
  for(let y = 2; y < c.height; y++){ px(0, y, P.K); px(1, y, P.V); px(2, y, P.v); }
  px(1, 0, P.Y); px(1, 1, P.Y); px(0, 1, P.K); px(2, 1, P.y); px(0, 0, P.K); px(2, 0, P.K);   // finial
  for(let x = 0; x <= FW; x++){ const t = x / FW, off = Math.round(Math.sin(x * .5 - ph * 2.1) * 1.6 * t), slope = Math.cos(x * .5 - ph * 2.1) * t, X = x + 3;
    const notch = x > FW - 5 ? (x - (FW - 5)) * .9 : -1;
    for(let y = -1; y <= FH; y++){ const yy = 3 + y + off, cy = y - (FH - 1) / 2;
      if(notch >= 0 && Math.abs(cy) < notch - .5){ if(Math.abs(cy) >= notch - 1.5) px(X, yy, P.K); continue; }
      if(y === -1 || y === FH || x === FW){ px(X, yy, P.K); continue; }
      let col = x < 2 ? (y % 3 === 1 ? P.s : P.S) : y === 0 ? P[1] : y === FH - 1 ? P[3] : P[2];
      const dx = x - 10, ad = Math.abs(dx) + Math.abs(cy) * 1.25;              // the 菱 crest: a white diamond ring, the field's deepest colour inside
      if(x >= 2 && ad > 2.6 && ad < 4.4) col = P.O; else if(x >= 2 && ad <= 2.6) col = P[4];
      if(x >= 2 && (y === 1 || y === FH - 2) && x % 2 === 0 && col === P[2]) col = P.Y;   // a gold stitch line top and bottom
      if(slope < -.4 && col !== P.O && col !== P.Y) col = col === P.S || col === P.s ? P.s : P[4]; px(X, yy, col); } }
  return c; }
// the small swallowtail pennant on the seat back (every crew bike carries one)
function pennant(P, ph){ const c = canvas(13, 24), k = c.getContext('2d'), px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); };
  for(let y = 1; y < 24; y++){ px(0, y, P.K); px(1, y, y < 3 ? P.Y : P.V); } px(1, 0, P.K);
  for(let x = 0; x < 10; x++){ const off = Math.round(Math.sin(x * .8 - ph * 2.1) * x / 7), h = 3, notch = x > 6 ? x - 6 : -1;
    for(let y = -h - 1; y <= h + 1; y++){ if(notch >= 0 && Math.abs(y) < notch){ continue; } const edge = Math.abs(y) > h || x === 9 || (notch >= 0 && Math.abs(y) === notch);
      px(x + 2, 5 + y + off, edge ? P.K : x === 0 ? P.S : y < 0 ? P[1] : y === 0 && x > 1 && x < 5 ? P.O : P[2]); } }
  return c; }
// the salute: a gloved fist raised straight up from the shoulder, crew sleeve
function fistSpr(P){ return paint(7, 15, P, R => { R(1, 1, 5, 4, 'W'); R(1, 1, 2, 1, 'O'); R(5, 2, 1, 3, 'V'); R(2, 5, 3, 1, 'V'); R(2, 6, 3, 8, '2'); R(2, 6, 1, 8, '1'); R(4, 7, 1, 7, '3'); }); }

// one set of sprites per colour signature, built when the colours change (at load and at reset, never mid-ride)
let SP = null; const SPC = {};
function build(){ const rp = ramp(), sig = rp.col.join() + rp.K; if(SPC[sig]){ SP = SPC[sig]; return; }
  const G = MECH.gang && MECH.gang._dbg; if(!G || !G.LOOKS || !G.pal){ SP = null; return; }
  const P = Object.assign(G.pal(0), { K:rp.K, 0:rp.col[0], 1:rp.col[1], 2:rp.col[2], 3:rp.col[3], 4:rp.col[4] });
  const pill = [pillion(P)]; pill.push(flipC(pill[0]));
  const parts = {}, part = (li, pi, ph) => { const key = li + ':' + pi + ':' + ph; if(parts[key]) return parts[key]; const p = G.LOOKS[li].parts[pi]; return parts[key] = mk(p.f ? p.f(ph) : p.rows, P, p.full); };
  // comp[look][two-up dir 0 none / 1 right / 2 left][tyre phase][hang+1]; the pillion sits between the rider and the sandan seat back
  const comp = {};
  for(const li of [1, 2]){ comp[li] = []; for(let d = 0; d < 3; d++){ if(d && li !== 1){ comp[li].push(null); continue; } const A = []; comp[li].push(A);
      for(let ph = 0; ph < 3; ph++){ const B = []; A.push(B); for(let h = -1; h <= 1; h++){ const c = canvas(CW, CH), k = c.getContext('2d');
          G.LOOKS[li].parts.forEach((p, i) => { const s = part(li, i, p.ph ? ph : 0); k.drawImage(s, Math.round(CW / 2 - s.width / 2 + (p.x || 0) + h * (p.hang || 0)), GY + (p.y || 0) - s.height);
            if(d && i === 2){ const q = pill[d - 1]; k.drawImage(q, Math.round(CW / 2 - 9 + (d === 1 ? 2 : -2) + h), GY - 5 - q.height); } });
          B.push(c); } } } }
  const two = (f) => { const a = [], b = []; for(let ph = 0; ph < 3; ph++){ const s = f(P, ph); a.push(s); b.push(flipC(s)); } return [a, b]; };
  // the kicking leg and the wind-up, in crew trousers (gang.js's leg art, our colours; flipped copies cached here); the wreck kit per look
  const LP = { id:'crew' + sig, a:rp.col[1], b:rp.col[2], c:rp.col[3], d:'#24222c', dl:'#3a3844', K:rp.K }, leg = {};
  for(let n = 4; n <= 14; n += 2){ const l = G.legSprite(LP, n); leg[n] = [l, flipC(l)]; } const ck = G.cockSprite(LP);
  const wk = MECH.gang.wreckKit ? { 1:MECH.gang.wreckKit(P, 1), 2:MECH.gang.wreckKit(P, 2) } : null;
  SP = SPC[sig] = { comp, hata:two(hata), pen:two(pennant), fist:[fistSpr(P), null], leg, cock:[ck, flipC(ck)], wreck:wk, col:rp.col, K:rp.K, P };
  SP.fist[1] = flipC(SP.fist[0]); }

/* ------------------------------------------------------------------ geometry helpers (the same as gang.js) */
const kP = () => Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX);
const pzz = () => position + PZ;
const barrier = z => { const s = segAt(z), E = s ? ENV[LANDS[s.land].key] || {} : {}; return (E.barrier || 1.1) - .07; };
const SHEET = () => document.getElementById('sheet');
let sheetEl = null;
const showing = () => C.on && SP && (state === 'play' || state === 'pulled' || state === 'over' || (state === 'ready' && (sheetEl || (sheetEl = SHEET())) && sheetEl.hidden));

/* ------------------------------------------------------------------ the formation slots
   Wings ride level with you, one each side, at the edges of your view; the flag bearer rides a little ahead and further out, flag up.
   Gaps are world units (+ ahead of you), offsets half-road widths from you. A slow wander keeps it loose (Ishii's columns breathe). */
const SLOT3 = [[-1, 20, .40], [1, 20, .40], [1, 420, .50]], SLOT2 = [[-1, 30, .40], [1, 140, .40]], SLOT1 = [[1, 60, .40]];
const ACT = [];   // this frame's riding crew, in roster order (reused)
function slots(){ ACT.length = 0; for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]) if(r.st === 'ride' || r.st === 'fight' || r.st === 'arrive' || r.st === 'victory') ACT.push(r);
  const S = ACT.length >= 3 ? SLOT3 : ACT.length === 2 ? SLOT2 : SLOT1;
  const nar = clamp((W / 2 - 24 * kP()) / (W * .4), .6, 1);   // a narrow screen: the column closes up so riders and their flags stay in view
  for(let i = 0; i < ACT.length; i++){ const r = ACT[i], s = S[Math.min(i, S.length - 1)];
    let side = s[0]; if(ACT.length === 1) side = playerX > 0 ? -1 : 1;   // a lone crewmate takes the roomier side
    r.side = side; r.sgap = s[1]; r.soff = s[2] * nar; } }
function placeAtStart(){ slots(); const pz = pzz(); for(let ir_ = 0, r = ACT[0]; ir_ < ACT.length; r = ACT[++ir_]){ r.z = pz + r.sgap; r.x = clamp(playerX + r.side * r.soff, -.9, .9); r.speed = 0; r.vx = 0; r.lean = 0; r.rvb = 0; r.sink = 0; } }

/* ------------------------------------------------------------------ hooks */
C.warm = () => { try{ build(); }catch(e){ console.warn('crew warm', e); }
  try{ const A = MECH.arrival; if(A && A.prebuild){ A.prebuild('REAR GUARD', { kanji:'殿', sub:'DREW THEM OFF' }); A.prebuild('CREW', { kanji:'仲間', sub:'RIDING WITH YOU' }); A.prebuild('COVERED', { kanji:'援護' }); A.prebuild('CREW TAKEDOWN', { kanji:'援護' }); } }catch(e){} };
C.reset = () => { try{ build(); }catch(e){ console.warn('crew build', e); SP = null; }
  seed = (Date.now() ^ 0x5bd1e995) >>> 0; if(C._seed !== undefined) seed = C._seed >>> 0;
  started = false; clock = 0; chaseT = 0; lastDecoy = -99; ST = ST0(); victoryT = -1; arrivedCO = false;
  for(let ih_ = 0, h = honkQ[0]; ih_ < honkQ.length; h = honkQ[++ih_]) h.at = -1;
  for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]){ r.st = C.on ? 'ride' : 'gone'; r.gift = true; r.fist = 0; r.fired = false; r.cop = null; r.hold = 0; r.t = 0; r.airH = 0; r._jmp = null; r._spjAir = false; r.acc = .98 + rnd() * .12; r.launch = .04 + r.id * .1 + rnd() * .08; r.tgt = null; r.blk = null; r.wind = 0; r.kick = 0; r.stun = 0; r.kvx = 0; r.rvb = 0; r.sink = 0;
    r.leaveAt = [1.2, 1.7, 2.2][r.id] + rnd() * .3; }   // the fall-away schedule: the rear guard exits first, the flag goes last
  placeAtStart(); };

// horns: the crew answers in a voice of its own (square pairs, softer than yours). kind 0 a "pa-paan", 1 the farewell toot-toot,
// 2 the rear guard's long call, falling away as it recedes, 3 the echo of your 総長コール (only when you ride with it equipped)
function hornNow(r, kind){ const N = kind === 0 ? HN0 : kind === 1 ? HN1 : kind === 2 ? HN2 : kind === 4 ? HN4 : HN3, base = 440 * Math.pow(2, r.pitch / 12), st = .1;
  const pan = clamp((r.x - playerX) * .9, -.8, .8), S = window.SFX, ac = S && S.ready && S.ready() && S.ctx ? S.ctx() : null, bus = ac && S.bus ? S.bus() : null;
  const t0 = (ac || M.ac) ? (ac || M.ac).currentTime + .01 : 0; let t = t0;
  for(let i = 0; i < N.length; i++){ const fall = kind === 2 ? i * .12 : 0, f = base * Math.pow(2, (N[i][0] - fall) / 12), v = kind === 2 ? .022 * (1 - i * .14) : kind === 4 ? .02 : .018, d = st * N[i][1] * .9;
    if(bus) voice(ac, bus, f, d, v, t, pan); else if(M.ac && M.tone){ M.tone(f, d, { type:'square', v, at:t }); M.tone(f * 1.26, d, { type:'square', v:v * .35, at:t }); }
    t += st * N[i][1]; } }
const HN0 = [[0, 1], [0, 2.4]], HN1 = [[0, .8], [0, .8]], HN2 = [[0, 1], [0, 1], [5, 1], [3, 1], [0, 3]], HN3 = [[10, 1], [12, 3]], HN4 = [[0, 1], [0, 1], [4, 1], [7, 1], [12, 3.5]];
// one horn note on the SFX bus, panned to the rider's side: a square and a square a major third up (a two-trumpet air horn), a quick attack
// and a soft cut, through a low-pass so it sits under your own horn. (No Math.random: M.tone detunes with it, which would shift the ride's
// shared random stream every time the crew honked.)
function voice(ac, bus, f, d, v, at, pan){ try{ const g = ac.createGain(), lp = ac.createBiquadFilter(), pn = ac.createStereoPanner();
    lp.type = 'lowpass'; lp.frequency.value = 2400; pn.pan.value = pan; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(v * 1.6, at + .008); g.gain.setTargetAtTime(0, at + d, .02);
    for(const [m, w] of [[1, 1], [1.26, .4]]){ const o = ac.createOscillator(), og = ac.createGain(); o.type = 'square'; o.frequency.value = f * m; og.gain.value = w; o.connect(og).connect(lp); o.start(at); o.stop(at + d + .15); }
    lp.connect(g).connect(pn).connect(bus); }catch(e){} }
function honk(r, delay, kind){ for(let ih_ = 0, h = honkQ[0]; ih_ < honkQ.length; h = honkQ[++ih_]) if(h.at < 0){ h.at = clock + delay; h.id = r.id; h.kind = kind; return; } }
function answer(){ let eq = ''; try{ eq = window.COS && COS.state ? COS.state().eq.horn : ''; }catch(e){}
  let n = 0; for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]) if((r.st === 'ride' || r.st === 'fight') && r.z - pzz() > -600) honk(r, .45 + n++ * .24, eq === 'horn.call' ? 3 : 0); }

C.key = (code, down, e) => { if(code === 'KeyH' && down && !(e && e.repeat) && state === 'play') onHorn(); return false; };
C.pad = (gp, prev) => { const b = gp.buttons[3]; if(b && b.pressed && !prev[3] && state === 'play') onHorn(); };
function onHorn(){ if(!C.on) return; if(copT > 0 && chaseT > .6 && tryDecoy(true)) return; answer(); }

/* ------------------------------------------------------------------ update */
C.update = dt => {
  if(!C.on || !SP) return;
  clock += dt;
  for(let ih_ = 0, h = honkQ[0]; ih_ < honkQ.length; h = honkQ[++ih_]) if(h.at >= 0 && clock >= h.at){ h.at = -1; hornNow(CR[h.id], h.kind); }
  if(state === 'ready'){ started = false; placeAtStart(); return; }
  if(state === 'play' && !started){ started = true; answer(); }   // GO: your horn (mech/arrival.js) and the crew's answer
  const pz = pzz();
  if(state !== 'play'){   // pulled over or the night is over: the crew rides on and away up the road (a decoy sinks out of the rear view)
    for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]){ if(r.st === 'gone') continue; if(r.st === 'down'){ downStep(r, dt, pz); continue; }
      if(r.st === 'decoy'){ r.t += dt; if(!r.fired){ r.fired = true; r.fireT = r.t - .8; } r.sink = clamp((r.t - r.fireT - .8) / 1.2, 0, 1); if(r.sink >= 1) r.st = 'gone'; continue; }
      r.rvb = Math.max(0, r.rvb - dt * 2.5);
      r.speed = lerp(r.speed, MAXS * .85, 1 - Math.exp(-1.2 * dt)); r.z += r.speed * dt; r.x += clamp((Math.sign(r.x - playerX || r.side) * .7 - r.x) * 2, -.6, .6) * dt;
      if(r.z - pz > farZ()) r.st = 'gone'; }
    return; }
  if(copT > 0){ chaseT += dt; } else chaseT = 0;
  // the gift: chased for a while, no lunge in the air, a crewmate with the gift riding with you
  if(copT > 1.4 && chaseT > 2.6) tryDecoy(false);
  // the fall-away: a few seconds after GO the column breaks up (one takes an exit with a salute, two drop back); you ride the night alone
  for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]) if(r.st === 'ride' && playT >= r.leaveAt){ r.fist = 1; honk(r, 0, 1);
    if(r.id === 0){ leave(r, 'exit', pz); r.leaveSide = Math.sign(r.x - playerX) || -1; } else leave(r, 'drop', pz); }
  const G = MECH.gang && MECH.gang._dbg, RV = G && G.R ? G.R() : null, E = G && G.E ? G.E() : null;
  fightState(E, RV, pz);
  slots();
  const caution = cautionAhead(pz);
  for(let i = 0; i < CR.length; i++){ const r = CR[i]; if(r.st === 'gone') continue; r.t += dt; r.fist = Math.max(0, r.fist - dt);
    if(r.st === 'decoy'){ decoyStep(r, dt, pz); continue; }
    if(r.st === 'down'){ downStep(r, dt, pz); continue; }
    const gap = r.z - pz, wx = barrier(r.z) - .03;
    // where they want to be
    let tgap = 0, tx = 0;
    if(r.st === 'ride' || r.st === 'fight' || r.st === 'arrive' || r.st === 'victory'){ const k = ACT.indexOf(r);
      tgap = r.sgap + Math.sin(clock * .37 + r.id * 2.1) * 80; let off = r.soff + Math.sin(clock * .29 + r.id) * .04;
      tx = playerX + r.side * off;
      if(r.st === 'fight' && r.blk){ const T = r.blk, sd = Math.sign(T.x - playerX) || r.side; tgap = T.z - pz; tx = T.x + sd * .2; }   // dash in on a rival winding up on you
      else if(r.st === 'fight' && r.tgt){ const T = r.tgt, sd = Math.sign(T.x) || r.side;   // ride inboard of the rival you drew off, a little ahead of you, and work it to the barrier
        tgap = clamp(T.z - pz, 60, 700); tx = T.x - sd * .19; }
      if(r.st === 'arrive') tgap = Math.max(tgap, -200);
      if(copT > 0 && r.st === 'ride') tgap = Math.max(tgap, 260 + k * 160);
      if(caution){ tgap = -300 - k * 190; tx = playerX + (k % 2 ? .1 : -.1); }   // a roadblock, spikes or a set piece ahead: single file behind you
      if(!caution && !r.tgt && !r.blk && Math.abs(tx) > wx){ tx = Math.sign(tx) * wx; if(Math.abs(tx - playerX) < .3){ tx = playerX - r.side * off; tgap += 280; if(Math.abs(tx) > wx) tx = Math.sign(tx) * wx; } }
      if(tgap > 100 && !r.tgt && !r.blk) for(let j = 0; j < cars.length; j++){ const c = cars[j], gc = c.z - pz; if(!c.oth && gc > tgap - 200 && gc < 6500 && Math.abs(c.x - tx) < .28){ tgap = Math.min(tgap, 40); break; } }   // never in front of a car you need to read
      if(r.st === 'arrive' && gap > -300) r.st = 'fight';
      if(r.st === 'victory' && r.t > 2.2) leave(r, 'drop', pz);
    }
    // Leaving is physical, never a fade (Kellan: "they should go slower than the player and exit off screen behind"). The rear guard
    // rides on a moment, then pulls over onto the hard shoulder and brakes; the others ease off and drop back down the outside of
    // you. Either way they grow as they pass the camera and leave by the side or the bottom edge, and only then are they gone.
    if(r.st === 'exit'){ tgap = 240; tx = r.leaveSide * (r.t > 1.4 ? wx : .74); }
    else if(r.st === 'drop'){ tgap = gap - 900; const sd = Math.sign(r.x - playerX) || r.side; tx = clamp(playerX + sd * .45, -wx, wx);
      if(Math.abs(tx - playerX) < .3) tx = gap < -120 ? clamp(playerX - sd * .45, -wx, wx) : r.x; }   // no room on its side: hold, then cross once behind you
    if(r.st === 'exit' || r.st === 'drop') r.rvb = Math.max(0, r.rvb - dt * 2.5);
    let ts = speed + clamp((pz + tgap - r.z) * 1.5, -MAXS * .35, MAXS * (r.z - pz < -400 ? .8 : .35));
    if(r.st === 'drop') ts = Math.max(0, speed - Math.max(MAXS * .045, speed * .065));   // eases off: a little slower than you, so it drifts back past you (readable, not a blink)
    else if(r.st === 'exit' && r.t > 1.4) ts = Math.max(0, Math.min(ts, speed * .7));                // pulls over and brakes
    const far = gap < -600 && r.st !== 'drop';   // out of view behind you: they filter through traffic freely (a margin past -400: they close up to 150 a frame)
    let cand = tx;
    if(!far && blocked(r, cand, RV)){ let best = 9;   // (fighting too: a crewmate after a rival still never rides into traffic)
      for(let q = -2; q <= 2; q++){ const L = q * .33; if(Math.abs(L) > wx || blocked(r, L, RV)) continue; if(Math.abs(gap) < 500 && Math.abs(L - playerX) < .3) continue; const dd = Math.abs(L - tx); if(dd < best){ best = dd; cand = L; } }
      if(best === 9){ cand = r.x; if(blocked(r, r.x, RV) && carAhead && carAhead.z - r.z < 900) ts = Math.min(ts, carAhead.speed * .95); } }
    tx = cand;
    if(s_gore(r.z) && Math.abs(tx) < .3) tx = Math.sign(tx || r.x || 1) * .4;
    tx = clamp(tx, -wx, wx);
    const up = state === 'play' && r.launch > 0 ? 0 : far ? MAXS * 1.2 : ACCEL * r.acc * (boostT > 0 ? 2.6 : 1.3); r.launch = Math.max(0, r.launch - dt);
    r.speed += clamp(ts - r.speed, -MAXS * 1.4 * dt, up * dt); r.speed = Math.max(0, r.speed); r.z += r.speed * dt;
    const want = r.stun > 0 ? 0 : clamp((tx - r.x) * 2.6, -.9, .9); r.vx = lerp(r.vx, want, 1 - Math.exp(-5 * dt)); r.x += (r.vx + r.kvx) * dt; r.kvx *= Math.exp(-3.5 * dt); r.stun = Math.max(0, r.stun - dt);
    // knocked into the barrier or a car while reeling from a rival's kick: down (the same live wreck as a rival's takedown)
    if(r.stun > 0 && Math.abs(r.kvx) > .3 && Math.abs(r.x) > wx){ r.x = Math.sign(r.x) * wx; goDown(r, pz); continue; }
    if(r.stun > 0) for(let j = 0; j < cars.length; j++){ const c = cars[j]; if(!c.oth && Math.abs(c.z - r.z) < 240 && Math.abs(c.x - r.x) < .24){ goDown(r, pz); break; } }
    if(r.st === 'down') continue;
    r.x = clamp(r.x, -wx, wx);
    separate(r, pz, RV, far);
    if(r.st === 'fight') fightStep(r, dt, pz);
    const sg = segAt(r.z), curve = sg ? sg.curve : 0; r.lean = lerp(r.lean, clamp(curve * .075 + (r.vx + r.kvx * .6) * .3, -.35, .35), 1 - Math.exp(-6 * dt));   // (a crewmate leans less than a rival: they ride alongside, not at you)
    if((r.st === 'exit' || r.st === 'drop') && offBehind(r, pz)) r.st = 'gone';   // (after this frame's move: what is drawn next is what was tested)
    if(r.z - pz < -30000 || r.z - pz > farZ()) r.st = 'gone';   // (far behind: out of view, catching up; ahead: past the draw distance, after the edge fade)
  }
};
// start leaving: 'exit' (the shoulder) or 'drop' (fall back). rvb carries the rear-view blend the rider was drawn in, so a rider already
// tucked in behind you eases into the true projection instead of jumping
function leave(r, st, pz){ r.st = st; r.t = 0; r.rvb = clamp((-(r.z - pz) - 120) / 300, 0, 1); }
// gone only once fully off screen behind you: past the side edge (inner edge of the body) or below the bottom (top of the head or the
// flag); the near projection here is the one drawUnderBike uses for a leaving rider (it may grow to 5x before the camera plane)
const farZ = () => (DRAW - 2) * SEG;   // (a function: the core's DRAW is declared after the mech files load)
function offBehind(r, pz){ const g = r.z - pz; if(g >= -60) return false; if(g < -PZ * .8) return true;
  const f = PZ / (PZ + g), k = kP() * f, dx = Math.abs(r.x - playerX) * W * f, top = H / 2 + (H / 2 - 8) * f - (r.two ? 68 : 44) * k;
  return dx - 24 * k > W / 2 || top > H; }   // (24: the body, bars and fist on the inner side, with the lean's rotation)
let carAhead = null;
// a line is blocked for rider r if a car (or a rival) sits in it from just behind the rider to 2000 ahead
function blocked(r, L, RV){ carAhead = null; let best = 1e9;
  for(let i = 0; i < cars.length; i++){ const c = cars[i]; if(c.oth) continue; const dz = c.z - r.z; if(dz > -260 && dz < 2000 && Math.abs(c.x - L) < .3 && dz < best){ best = dz; carAhead = c; } }
  if(RV) for(let i = 0; i < RV.length; i++){ const v = RV[i]; if(v.st === 'down') continue; const dz = v.z - r.z; if(dz > -260 && dz < 900 && Math.abs(v.x - L) < .22) return true; }
  return !!carAhead; }
// hard guarantees: never inside a car, never on top of you (they yield: you can always steer where they are), never inside a rival
function separate(r, pz, RV, far){
  if(RV) for(let i = 0; i < RV.length; i++){ const v = RV[i]; if(v.st === 'down') continue; const d = r.x - v.x; if(Math.abs(v.z - r.z) < 260 && Math.abs(d) < .15) r.x = v.x + (Math.sign(d) || 1) * .15; }
  for(let i = 0; i < CR.length; i++){ const q = CR[i]; if(q === r || q.st === 'gone' || q.st === 'decoy' || q.st === 'down') continue; const d = r.x - q.x;   // two crewmates never ride through each other
    if(Math.abs(q.z - r.z) < 260 && Math.abs(d) < .17){ if(Math.abs(d) > .02 || q.id < r.id) r.x = q.x + (Math.sign(d) || (r.id > q.id ? 1 : -1)) * .17; } }
  if(!far) for(let i = 0; i < cars.length; i++){ const c = cars[i]; if(c.oth) continue; const dz = c.z - r.z, dx = r.x - c.x;
    if(dz > -220 && dz < 340 && Math.abs(dx) < .26){ if(dz > 0 && Math.abs(dx) < .2){ r.z = Math.min(r.z, c.z - 340); r.speed = Math.min(r.speed, c.speed); } else r.x = c.x + (Math.sign(dx) || 1) * .26; } }
  const gap = r.z - pz, dx = r.x - playerX, wx = barrier(r.z) - .03;
  if(gap > -260 && gap < 300 && Math.abs(dx) < .22){ const sd = Math.sign(dx) || r.side; let nx = playerX + sd * .22;   // you come first: they yield
    if(Math.abs(nx) > wx){ nx = playerX - sd * .22; r.side = -sd; } r.x = nx; }
  if(gap > 0 && gap < 2600 && Math.abs(r.x - playerX) < .2){ const sd = Math.sign(r.x - playerX) || r.side; let nx = playerX + sd * .2; if(Math.abs(nx) > wx) nx = playerX - sd * .2; r.x = nx; }   // never in your line ahead (the side with room)
  r.x = clamp(r.x, -wx, wx);   // and never through the barrier
  if(!far) for(let i = 0; i < cars.length; i++){ const c = cars[i]; if(c.oth) continue; const dz = c.z - r.z;   // and still never inside a car
    if(dz > -220 && dz < 340 && Math.abs(r.x - c.x) < .2){ r.z = c.z - 340; r.speed = Math.min(r.speed, c.speed); } } }
function s_gore(z){ const s = segAt(z); return !!(s && s.gore); }
// a police roadblock or spike strip, or a set piece's reserved road, within the next stretch: the crew tucks in behind the leader
function cautionAhead(pz){ const i0 = Math.floor(pz / SEG); for(let i = i0 - 4; i < i0 + 70; i++){ const s = segs[i]; if(s && (s.polHz || s.police || s.skR)) return true; }
  return !!(MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying()) || AIR.h > 0; }

/* ------------------------------------------------------------------ the fight
   A rival pack arrives (gang.js onPack): your crew roars in from behind, horns and flags, as many as the pack is big (two or three).
   - The leader is yours: the duel is still yours to win. The crew never kicks the leader except to block a kick it aims at you.
   - Each crewmate takes a wing: it marks it (gang.js then has that wing ride with the crewmate, not you: drawn off), rides inboard of it
     and works it toward the barrier with kicks of its own (wind-up 0.4 s, then the kick; about half land). A wing kicked into the
     barrier or a car goes down: a crew takedown (no boost or flow for you, a style assist, the same live wreck).
   - A wing can kick back (gang.js: the same telegraph as at you); a crewmate kicked into the barrier or a car goes down in a wreck.
   - Anyone winding up on you is fair game: the nearest free crewmate dashes in and kicks first if it gets there in time.
   - When the pack's business is over (duel decided, or the riders gone), the crew calls the victory (or a quiet toot) and falls away. */
let victoryT = -1, arrivedCO = false;
const ROSTER_FIGHT = [1, 0, 2];   // the sukajan wing first, the rear guard, then the flag
function onPack(E0){ if(!C.on || !SP || state !== 'play') return; victoryT = -1; arrivedCO = false; const pz = pzz(), n = clamp(E0.n || 2, 2, 3); let k = 0;
  for(let i = 0; i < CR.length && k < n; i++){ const r = CR[ROSTER_FIGHT[i]]; if(r.st === 'decoy') continue;
    const side = k % 2 ? 1 : -1, wasGone = r.st === 'gone' || r.st === 'down'; r.st = 'arrive'; r.t = 0; r.rvb = 0; r.sink = 0; r.tgt = null; r.blk = null; r.kcd = 1 + k * .4; r.wind = 0; r.kick = 0; r.stun = 0; r.kvx = 0; r._jmp = null;
    if(wasGone || r.z - pz > -1200){ r.z = pz - 1700 - k * 320; r.x = clamp(playerX + side * .45, -.85, .85); } r.speed = Math.max(speed, MAXS) * 1.25; r.vx = 0;
    honk(r, 1.1 + k * .22, 0); k++; }
  ST.arrivals++; }
function fightState(E, RV, pz){
  let fighting = 0; for(let i = 0; i < CR.length; i++){ const r = CR[i]; if(r.st === 'fight' || r.st === 'arrive') fighting++; }
  if(!fighting) return;
  // the arrival beat: once the first of them is in view, one card
  if(!arrivedCO){ for(let i = 0; i < CR.length; i++){ const r = CR[i]; if((r.st === 'fight' || r.st === 'arrive') && r.z - pz > -500){ arrivedCO = true; const A = MECH.arrival; if(A && A.callout) A.callout('CREW', { kanji:'仲間', sub:'RIDING WITH YOU', col:SP.col[1] }); break; } } }
  const d = E && E.duel; let live = 0; if(RV) for(let i = 0; i < RV.length; i++) if(RV[i].st === 'ride') live++;
  const over = !E || (d && d.res) || (!live && E.t > 3);
  if(over){ if(victoryT >= 0) return; victoryT = clock; const won = !E || !d || d.res === 'win'; let n = 0;
    for(let i = 0; i < CR.length; i++){ const r = CR[i]; if(r.st !== 'fight' && r.st !== 'arrive') continue; r.st = 'victory'; r.t = 0; r.fist = won ? 1.6 : .6; clearMark(r); honk(r, .5 + n * .2, won ? 4 : 1); n++; }
    if(won) ST.victories++; return; }
  // marks: each fighting crewmate takes the nearest unmarked wing; blocks: a rival winding up on you
  for(let i = 0; i < CR.length; i++){ const r = CR[i]; if(r.st !== 'fight') continue;
    if(r.tgt && (r.tgt.st !== 'ride' || r.tgt.mark !== r)) clearMark(r);
    if(!r.tgt && RV){ let best = null, bd = 9e9; for(let j = 0; j < RV.length; j++){ const v = RV[j]; if(v.role !== 'wing' || v.st !== 'ride' || (v.mark && v.mark !== r && v.mark.st === 'fight')) continue; const dd = Math.abs(v.z - r.z); if(dd < bd){ bd = dd; best = v; } }
      if(best && bd < 3000){ r.tgt = best; best.mark = r; } }
    if(r.blk && (r.blk.st !== 'ride' || r.blk.windT <= 0)) r.blk = null; }
  if(RV) for(let j = 0; j < RV.length; j++){ const v = RV[j]; if(v.st !== 'ride' || v.windT <= 0 || v.windTgt || Math.abs(v.z - pz) > 420) continue;
    let taken = false; for(let i = 0; i < CR.length; i++) if(CR[i].blk === v) taken = true; if(taken) continue;
    let best = null, bd = 9; for(let i = 0; i < CR.length; i++){ const r = CR[i]; if(r.st !== 'fight' || r.blk || r.wind > 0 || r.kick > 0 || Math.abs(r.z - v.z) > 1100) continue; const dd = Math.abs(r.x - v.x) + Math.abs(r.z - v.z) / 3000; if(dd < bd){ bd = dd; best = r; } }
    if(best){ best.blk = v; best.kcd = 0; } } }
function clearMark(r){ if(r.tgt && r.tgt.mark === r) r.tgt.mark = null; r.tgt = null; r.blk = null; }
// a crewmate's own kick: a short wind-up (knee cocked), then the leg; it lands if the rival is still in reach (and about half the time it
// is dodged). A block skips the wind-up: it has to beat the rival's own.
function fightStep(r, dt, pz){ r.kcd -= dt; const T = r.blk || r.tgt;
  if(r.wind > 0){ r.wind -= dt; if(r.wind <= 0){ r.kick = .25; strike(r, T, false); } return; }
  if(r.kick > 0){ r.kick -= dt; return; }
  if(!T || r.kcd > 0 || r.stun > 0) return; const dz = Math.abs(T.z - r.z), dx = T.x - r.x;
  if(dz < 250 && Math.abs(dx) > .09 && Math.abs(dx) < .27){ r.kside = Math.sign(dx); if(r.blk){ r.kick = .25; strike(r, T, true); } else r.wind = .4; } }
function strike(r, T, block){ r.kcd = block ? 1.2 : 1.4 + rnd() * 1.1; if(!T || T.st !== 'ride') return; const dz = Math.abs(T.z - r.z), dx = T.x - r.x;
  if(dz > 330 || dx * r.kside < .06 || Math.abs(dx) > .3 || (!block && rnd() < .45)){ ST.whiffs++; return; }   // out of reach, or dodged
  const away = block ? (Math.sign(T.x - playerX) || r.kside) : r.kside;   // a block knocks the rival away from you; a fight kick knocks it the way the leg goes
  if(MECH.gang.crewHit && MECH.gang.crewHit(T, away)){ ST.crewKicks++; if(block){ ST.blocks++; const A = MECH.arrival; if(A && A.callout) A.callout('COVERED', { kanji:'援護', col:SP.col[1] }); } } }
// gang.js calls this when a wing's kick lands on a crewmate
function kicked(r, by){ const side = Math.sign(r.x - by.x) || 1; r.kvx += side * 2; r.stun = .7; r.wind = 0; r.kick = 0; ST.crewKicked++;
  if(window.SFX && SFX.ready && SFX.ready()) SFX.play('kickHit', { pan:clamp((r.x - playerX) * 1.5, -1, 1), k:.7 }); }
// a crewmate goes down: the bike cartwheels and skids beside you, the rider tumbles, both drop back past you (gang.js's takedown beats)
function goDown(r, pz){ clearMark(r); r.st = 'down'; r.t = 0; ST.downs++; const D = r.dn; D.side = Math.sign(r.x || r.kvx || 1); D.gap0 = clamp(r.z - pz, 80, 900); D.x0 = r.x; D.rz = r.z; D.rx = r.x;
  if(window.SFX && SFX.ready && SFX.ready()) SFX.play('takedown', { pan:clamp((r.x - playerX) * 1.5, -1, 1), k:.5 }); }
function downStep(r, dt, pz){ const D = r.dn, t = r.t; r.t += dt; const wx = barrier(r.z) + .02, sd = D.side;
  const g = t < 1.05 ? D.gap0 : D.gap0 - (t - 1.05) * 2600; r.z = pz + g; r.speed = speed;
  r.x = t < .22 ? lerp(D.x0, sd * wx, t / .22) : lerp(r.x, sd * (wx - .1), 1 - Math.exp(-4 * dt));
  D.rz = r.z + Math.min(1, t / .3) * 220 - Math.max(0, t - 1) * 320; D.rx = lerp(D.x0, sd * (wx - .3), clamp(t / .5, 0, 1));
  if(!reduce && t > .55 && t < 1.4 && g > 0){ const p = near(r.z, r.x); spark(p.x + (rnd() - .5) * 12 * p.k, p.y, -sd * (20 + rnd() * 200), -140 + rnd() * 180, .2 + rnd() * .2, rnd() < .5 ? '#ffd04a' : '#fff4c0'); }
  if(t > 2.6) r.st = 'gone'; }   // (by then the bike and the rider are both well behind the camera)
const NP = { x:0, y:0, k:0 };
function near(z, x){ const g = z - pzz(), f = PZ / Math.max(PZ * .35, PZ + g); NP.x = W / 2 + (x - playerX) * W * f; NP.y = H / 2 + (H / 2 - 8) * f; NP.k = kP() * f; return NP; }

/* ------------------------------------------------------------------ the sacrifice */
function leadCop(){ const P = MECH.police; if(!P || !P.chase) return null; let c0 = null; try{ const ch = P.chase(); for(let ic_ = 0, c = ch.cops[0]; ic_ < ch.cops.length; c = ch.cops[++ic_]) if(c.ph !== 'leave' && (!c0 || c.lead)) c0 = c; }catch(e){} return c0; }
function lunging(){ const P = MECH.police; if(!P || !P.chase) return false; try{ for(const c of P.chase().cops) if(c.ph === 'tele' || c.ph === 'strike' || c.ph === 'over') return true; }catch(e){} return false; }
function tryDecoy(called){ if(state !== 'play' || copT <= 0 || playT - lastDecoy < 60) return false;
  for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]) if(r.st === 'decoy') return false;
  let r = null; const pz = pzz(); for(let iq_ = 0, q = CR[0]; iq_ < CR.length; q = CR[++iq_]) if((q.st === 'ride' || q.st === 'fight') && q.gift && q.z - pz > -350 && q.z - pz < 900){ r = q; break; } if(!r || (!called && lunging())) return false;   // only one you can see salute; never while a lunge is in the air
  r.prev = r.st; clearMark(r); r.st = 'decoy'; r.t = 0; r.sink = 0; r.gift = false; r.fired = false; r.cop = null; r.cross = 0; r.sd = 0; r.fist = .7; r.dz = r.z - pzz(); r.side = Math.sign(r.x - playerX) || r.side; lastDecoy = playT;
  honk(r, 0, 0); return true; }
function decoyStep(r, dt, pz){ const t = r.t, cop = leadCop() || r.cop; if(cop && !r.cop && cop.ph !== 'leave') r.cop = cop;
  const c = r.cop;
  if(!r.fired && copT <= 0){ r.st = r.prev === 'fight' ? 'fight' : 'ride'; r.gift = true; return; }   // you lost them yourself first: back into the column, gift kept
  let tdz, tx, rate = 2.6;
  if(t < .55){ tdz = r.dz; tx = r.x; }                                                       // the salute, in the slot
  else if(!r.fired){ const cdz = c ? c.dz : -820, cxp = c ? c.x : playerX + r.side * .3, wx = barrier(r.z) - .05;
    if(!r.sd) r.sd = Math.sign(cxp - playerX) || r.side;                                     // the side the patrol car will pull off to
    tdz = cdz + 300; tx = clamp(cxp + r.sd * .4, -wx, wx);                                    // down the outside of the car, to its nose
    if(!r.cross && (t > 1.9 || (t > 1.25 && Math.abs(r.dz - tdz) < 240))) r.cross = 0.0001;
    if(r.cross){ r.cross += dt; tx = cxp - r.sd * .06; if(r.cross > .22) fire(r); } rate = 3.2; }   // then a hook across its nose
  else { const cdz = c && c.dz > -4200 ? c.dz : r.dz - 1500 * dt, cxp = c ? c.x : r.x; tdz = cdz + 290; tx = cxp + (r.sd || r.side) * .14;   // lead it off
    // then it drops out of the rear view: after a beat leading the car off, it sinks below the bottom edge (no fade), and only then is gone
    r.sink = clamp((t - r.fireT - .8) / 1.2, 0, 1);
    if(r.sink >= 1){ r.st = 'gone'; r.cross = 0; r.sink = 0; } }
  r.dz += clamp((tdz - r.dz) * (1 - Math.exp(-rate * dt)), -2600 * dt, 2600 * dt);
  const lat = r.cross ? 1.9 : 1.1; r.vx = clamp(tx - r.x, -lat * dt, lat * dt) / Math.max(dt, 1e-4); r.x += r.vx * dt;
  r.z = pz + r.dz; r.speed = speed; r.lean = lerp(r.lean, clamp(r.vx * .3, -.5, .5), 1 - Math.exp(-6 * dt)); }
function fire(r){ if(r.fired) return; r.fired = true; r.fireT = r.t; ST.decoys++;
  copT = 0;   // the chase ends: the patrol car follows the decoy off (mech/police.js puts every chase car into its 'leave' when copT hits 0)
  try{ mech('decoy', { by:'crew', role:r.role, x:r.x, side:r.sd || r.side }); }catch(e){}
  hornNow(r, 2);
  const A = MECH.arrival; if(A && A.callout) A.callout('REAR GUARD', { kanji:'殿', sub:'DREW THEM OFF', col:SP.col[1] }); else floatText('殿 Rear guard', W / 2, H * .4, 26, SP.col[1]); }

C.finish = rec => { rec.crewDecoys = ST.decoys; rec.crewKicks = ST.crewKicks; rec.crewBlocks = ST.blocks; const g = MECH.gang && MECH.gang._dbg && MECH.gang._dbg.ST(); rec.crewTakedowns = g ? g.crewTakedowns || 0 : 0; };
// wire into gang.js: its packs call us in; its wings can kick the crewmates they ride beside
if(MECH.gang){ if(MECH.gang.onPack) MECH.gang.onPack(onPack); MECH.gang.crew = { riders:CR, kicked }; }

/* ------------------------------------------------------------------ drawing */
function drawRider(r, x, y, k, fog, now, am){ const a = (1 - fog * .6) * (am === undefined ? 1 : am); if(a <= .02 || !SP) return; const L = MECH.gang._dbg.LOOKS[r.look];
  const hang = Math.round(clamp(r.lean / .5, -1, 1)), moving = state !== 'ready' && r.speed > 30, ph = moving && !reduce ? Math.floor(now / 45 + r.id) % 3 : 0;
  const fd = Math.sign(r.x - playerX) || r.side, fph = reduce ? 0 : Math.floor(now / 110 + r.id * 1.3) % 3;
  cx.globalAlpha = a; cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(x, y, L.shadow * k, Math.max(1, 1.6 * k), 0, 0, 6.283); cx.fill();
  cx.save(); cx.translate(x, y); cx.rotate(r.lean); cx.imageSmoothingEnabled = false;
  if(r.two){ const f = SP.hata[fd > 0 ? 0 : 1][fph], hx = fd > 0 ? 7 : -8;   // the pole rises from the pillion's upper hand
    cx.drawImage(f, (fd > 0 ? hx - 1 : hx - f.width + 2) * k, (-29 - f.height + 3) * k, f.width * k, f.height * k); }
  else { const f = SP.pen[fd > 0 ? 0 : 1][fph], bx = fd > 0 ? 7 : -7; cx.drawImage(f, (fd > 0 ? bx - 1 : bx - f.width + 2) * k, (-4 - f.height) * k, f.width * k, f.height * k); }
  const c = SP.comp[r.look][r.two ? (fd > 0 ? 1 : 2) : 0][ph][hang + 1]; cx.drawImage(c, Math.round(-CW / 2 * k), Math.round(-GY * k), CW * k, CH * k);
  if(r.fist > 0){ const s = SP.fist[fd > 0 ? 1 : 0], sx = fd > 0 ? -12 : 5; cx.drawImage(s, sx * k, (-41 + (r.fist > .55 && !reduce ? 3 : 0)) * k, s.width * k, s.height * k); }   // the salute, on your side
  if(r.wind > 0 || r.kick > 0){ const sd = r.kside, hip = L.legY;   // the crewmate's kick: knee cocked, then the leg out (gang.js's leg, crew trousers)
    if(r.kick > 0){ const ext = Math.sin(clamp(1 - r.kick / .25, 0, 1) * Math.PI), n = Math.max(4, Math.round(ext * 12 / 2) * 2), s = SP.leg[n][sd < 0 ? 0 : 1];
      cx.drawImage(s, sd < 0 ? (-8 - s.width) * k : 8 * k, (hip - 5) * k, s.width * k, s.height * k); }
    else { const s = SP.cock[sd < 0 ? 0 : 1]; cx.drawImage(s, sd < 0 ? (-8 - s.width) * k : 8 * k, (hip - 10) * k, s.width * k, s.height * k); } }
  for(let i = 0; i < L.tail.length; i++){ const q = L.tail[i]; glow(q[0] * k, q[1] * k, q[2] * k, '#ff2a3a', .55 * a); }
  cx.restore(); cx.globalAlpha = 1; }
// a crewmate's wreck (gang.js's beats): the bike holds its impact pose, cartwheels in quarter turns on a hop, then skids on its side
function drawWreck(r, x, y, k, fog){ const W0 = SP.wreck && SP.wreck[r.look]; if(!W0) return; const D = r.dn, t = r.t, a = 1 - fog * .6; k *= 1.4;
  const cart = !reduce && t >= .07 && t < .55, u = cart ? (t - .07) / .48 : 0, q = cart ? (Math.floor(u * 7) * (D.side > 0 ? 1 : 3)) % 4 : 0, b = W0.bike[D.side < 0 ? 0 : 1][q], lift = cart ? Math.round(Math.sin(u * Math.PI) * 12) * k : 0;
  cx.globalAlpha = a; cx.fillStyle = 'rgba(0,0,0,.4)'; cx.beginPath(); cx.ellipse(x, y, 11 * k, Math.max(1, 1.4 * k), 0, 0, 6.283); cx.fill();
  cx.drawImage(b, Math.round(x - b.width * k / 2), Math.round(y - b.height * k - lift), b.width * k, b.height * k);
  if(t >= .55 && t < 1.5) glow(x, y - 2 * k, 9 * k, '#ffb040', .4 * a); cx.globalAlpha = 1; }
function drawTumble(r, x, y, k, fog){ const W0 = SP.wreck && SP.wreck[r.look]; if(!W0) return; const t = r.t, a = 1 - fog * .6, f = Math.floor(t * (reduce ? 4 : 10)) % 4, s = W0.tumble[t < 1.6 ? f : 1];
  const bounce = t < 1.6 ? Math.abs(Math.sin(t * 7)) * (1.6 - t) * 12 * k : 0; k *= 1.3; cx.globalAlpha = a;
  cx.drawImage(s, Math.round(x - s.width * k / 2), Math.round(y - s.height * k - bounce), s.width * k, s.height * k); cx.globalAlpha = 1; }
function projOn(s, z, x){ const pct = (z % SEG) / SEG, w = lerp(s.p1.screen.w, s.p2.screen.w, pct); return { x:lerp(s.p1.screen.x, s.p2.screen.x, pct) + x * w, y:lerp(s.p1.screen.y, s.p2.screen.y, pct), w }; }
const PJ = { x:0, y:0, w:0 };
C.drawSeg = (s, sx0, sy0, uw, fog, now) => { if(!showing()) return; const pz = pzz(), K = kP();
  for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]){ if(r.st === 'gone') continue;
    if(r.st === 'down'){ const kk = K / W; if(r.z - pz >= 0 && Math.floor(r.z / SEG) === s.index){ const pc = (r.z % SEG) / SEG, w = lerp(s.p1.screen.w, s.p2.screen.w, pc); drawWreck(r, lerp(s.p1.screen.x, s.p2.screen.x, pc) + r.x * w, lerp(s.p1.screen.y, s.p2.screen.y, pc), w * kk, fog); }
      const D = r.dn; if(D.rz - pz >= 0 && Math.floor(D.rz / SEG) === s.index){ const pc = (D.rz % SEG) / SEG, w = lerp(s.p1.screen.w, s.p2.screen.w, pc); drawTumble(r, lerp(s.p1.screen.x, s.p2.screen.x, pc) + D.rx * w, lerp(s.p1.screen.y, s.p2.screen.y, pc), w * kk, fog); }
      continue; }
    if(r.z - pz < 0 || Math.floor(r.z / SEG) !== s.index) continue;
    const pct = (r.z % SEG) / SEG, w = lerp(s.p1.screen.w, s.p2.screen.w, pct), px = lerp(s.p1.screen.x, s.p2.screen.x, pct) + r.x * w, py = lerp(s.p1.screen.y, s.p2.screen.y, pct);
    const J = MECH.sp_jump, A = J && J.vehAir && state === 'play' ? J.vehAir(r) : null, lift = A ? J.vehLift(s, r.z, A.h) : 0; if(lift > 1) J.vehShadow(px, py, w);
    drawRider(r, px, py - lift, w * K / W, fog, now, EDGE); } };   // (EDGE: the core's fade in the last stretch of the draw distance)
// riders behind you (and the decoy at the patrol car) are drawn before your bike, so your bike always reads on top
C.drawUnderBike = now => { if(!showing()) return; const pz = pzz(), K = kP();
  for(let ir_ = 0, r = CR[0]; ir_ < CR.length; r = CR[++ir_]){ if(r.st === 'gone') continue; const g = r.z - pz;
    if(r.st === 'down'){ if(g < 0 && g > -700){ const p = near(r.z, r.x); drawWreck(r, p.x, p.y, p.k, 0); } if(r.dn.rz - pz < 0 && r.dn.rz - pz > -700){ const p = near(r.dn.rz, r.dn.rx); drawTumble(r, p.x, p.y, p.k, 0); } continue; }
    if(g >= 0) continue;
    // near view (gang.js's nearScreen). A leaving rider (exit, drop) is drawn only in it, as traffic you overtake: it grows as it passes
    // the camera and leaves by the side or the bottom edge (offBehind uses the same projection, up to 5x)
    const lv = r.st === 'exit' || r.st === 'drop';
    const f = PZ / Math.max(PZ * (lv ? .2 : .35), PZ + g); let x = W / 2 + (r.x - playerX) * W * f, y = H / 2 + (H / 2 - 8) * f, k = K * f;
    // the rear view the patrol car is drawn in (mech/police.js chaseUnder), blended in from 120 to 420 behind: a crewmate tucked in behind
    // you, catching up, or the decoy at the patrol car. Further back it sinks below the bottom edge, as the patrol car does (never a fade)
    const b = lv ? Math.min(r.rvb, clamp((-g - 120) / 300, 0, 1)) : clamp((-g - 120) / 300, 0, 1);
    if(b > 0){ const gg = -g, cc = clamp((3300 - gg) / 2800, 0, 1), wd = W * lerp(.07, .25, Math.pow(cc, 1.15)), dxr = r.x - playerX;
      const rk = wd * .42 / 22, tall = (r.two ? 68 : 44) * rk, sink = r.st === 'decoy' ? r.sink : clamp((gg - 800) / 700, 0, 1);
      if(sink >= 1) continue;
      const rx = clamp(W / 2 + dxr * W * lerp(.3, .62, cc), W * .2, W * .8), ry = H + wd * .1 + sink * tall;
      x = lerp(x, rx, b); y = lerp(y, ry, b); k = lerp(k, rk, b); }
    drawRider(r, Math.round(x), Math.round(y), k, 0, now); } };

C._dbg = { CR:() => CR, ST:() => ST, decoy:() => tryDecoy(true), build, SP:() => SP, slots, onPack, goDown, offBehind, kP, set:o => { if(o.lastDecoy !== undefined) lastDecoy = o.lastDecoy; } };
})();
