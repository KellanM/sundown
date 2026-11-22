/* Sundown set piece: 亡霊 BŌREI, the phantom riders (MECH.sp_phantom, director id 'phantom', hero tier). See setpiece/README.md.
   Load after setpiece/boss.js:   <script src="setpiece/phantom.js"></script>
   Research, references and the design: research/sundown-craft/phantom-gang.md. Uses mech/gang.js for the player's kick (G.kickExt, chained
   after the boss's) and its leg sprites; without gang.js the ride still runs but you cannot kick.

   Who. 亡霊 Bōrei ("the phantoms"): an invented crew, an homage to the 1970s Tokyo / Chiba bōsōzoku scene that names no real gang and
   copies no real insignia. Ghost-white tokkōfuku over long black hair, white half-helmets with a pale-blue stripe, pale-blue glyph columns
   down the coat panels, a hitodama (soul-flame) crest high on the back; ghost-white sandan seat-backs licked with blue-white flames, pale
   cyan tail lamps, and their nobori (pale field, night-blue hoist, the soul-flame). Two hitodama trail every rider. The words on their
   backs: 闇ヨリ来タリ闇ニ還ル "from the dark we come, to the dark we return".

   The ride (a hero moment, through the rarity governor; dark roads; the second road on):
     静 HUSH       the music ducks to a hollow bell; behind you pale headlights flicker on and their cold wash climbs the road
     現 ARRIVE     four riders pass, two each side (never in your lane), each fading in out of the dark through four dither steps with a
                   light streak and two hitodama; the 亡霊 title card plays; no threat until it has gone
     並走 RIDE     two ride beside you, two ahead; one threat at a time, each with a glance, a body tell, a sound and >= 0.85 s:
                   KICK (a flanker: head turns, knee cocks, "!" and two blips, 0.9 s) - move away or kick him first;
                   灯消し LIGHTS-OUT CUT (one ahead: lights die to a rimmed silhouette, he glances back, one deep bell, hitodama mark the
                   lane he will take; 1.1 s later his lights snap on and he cuts into it) - change lane or brake. Contact is a bump,
                   never a crash. Overtaking a phantom clean is SLIPPED style; a dodged cut or kick is DODGE; a kicked phantom knocked
                   into the barrier or a car (or countered in his wind-up) spins out and fades away (TAKEDOWN), never wrecked.
     消 VANISH     one by one they ride into the fog and fade out; the last flashes his lights twice; a bell. A clean ride (no bumps):
                   +3 s of night and a boost.
   Tests: ?force=phantom&land=N (plans it on the first road); MECH.sp_phantom._start() starts it now; .state(), .threat(), .report(),
   ._sheet() (the sprite atlas), ._sprites() (a contact sheet at 4x). */
"use strict";
(() => {
const DIR = MECH.director, ID = 'phantom';
const CARD = { id:ID, kanji:'亡霊', name:'BOREI', sub:'the phantom riders', col:'#bfe8ff', tag:'RIVAL GANG', at:.35 };
const ROADS = ['tunnels', 'pass', 'paddies', 'snow', 'kurobe', 'coast', 'shimanami', 'gion'];   // the dark roads: tunnel mouths, unlit passes, fields
if(DIR) DIR.register(ID, { tier:'hero', roads:ROADS, chance:.5, card:CARD });
const ZONE_MIN = 1;

/* ------------------------------------------------------------------ small helpers (the same as setpiece/boss.js) */
const pzz = () => position + PZ;
const kP = () => Math.max(PX, Math.round(Math.min(W * .2, H * .27) / 30 / PX) * PX);
const can = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const calm = () => reduce || !!(window.ASSIST && ASSIST.noFlash);
const forced = () => /(^|[?&,=])force=([^&]*)phantom/.test(location.search);
const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
function nearScreen(z, x, cl){ const g = z - pzz(), f = PZ / Math.max(PZ * (cl || .35), PZ + g); return { x:W / 2 + (x - playerX) * W * f, y:H / 2 + (H / 2 - 8) * f, k:kP() * f, f }; }
function projOn(s, z, x){ const pct = (z % SEG) / SEG, w = lerp(s.p1.screen.w, s.p2.screen.w, pct); return { x:lerp(s.p1.screen.x, s.p2.screen.x, pct) + x * w, y:lerp(s.p1.screen.y, s.p2.screen.y, pct), w }; }
const barrier = z => { const s = segAt(z); const Ek = s ? ENV[LANDS[s.land].key] || {} : {}; return (Ek.barrier || 1.1) - .07; };
const pSeg = () => Math.floor(pzz() / SEG);
// riders between you and the camera fade as their projection passes 3 canvas px a sprite px (gone by 4.5): the W9 rule of setpiece/boss.js
const nearA = k => { const s = k / PX; return s <= 3 ? 1 : s >= 4.5 ? 0 : (4.5 - s) / 1.5; };

/* ------------------------------------------------------------------ art: key grids (sprite px; rows are LEFT halves, mirrored, light from
   the upper left: O drops to S and h to H on the right half; 'full' parts are drawn as written). Ground at (RCW/2, RGY) of a composite. */
const PAL = { K:'#0a0c18',
  O:'#f6f9ff', S:'#d6e0ee', s:'#a6b6ce', q:'#6a7a9a', u:'#3a4666',                 // the coat: ghost white, cooled into blue-grey
  H:'#12121e', h:'#3a3c56',                                                            // long black hair with a cold sheen
  B:'#f0fdff', b:'#9ae8ff', c:'#46aee8', d:'#1c5aa4',                                  // blue-white flame (white-hot core to night blue)
  T:'#16151c', t:'#46434f', W:'#e6eaf4', V:'#8a90a8', L:'#dcfcff', l:'#6ad0f0', P:'#d8dce6', n:'#2a2c44' };
// lights out: the same rider as a night silhouette with a pale rim on the lit edge, so he dims but never disappears
const DARK = { K:'#06070e', O:'#5a6a8e', S:'#2c3652', s:'#222a42', q:'#1a2034', u:'#141a2a', H:'#0a0b14', h:'#1a1c2c', B:'#3a6a9a', b:'#2a4e7a', c:'#203c64', d:'#162a4a',
  T:'#0e0d12', t:'#22202a', W:'#3a4058', V:'#262a3a', L:'#2a3448', l:'#1c2434', P:'#2a2e3a', n:'#14162a' };
const MIR = { O:'S', h:'H' };
const tyreRows = (hw, h, ph) => Array.from({ length:h }, (_, i) => 'K' + 'T'.repeat(hw - 3) + ((i + ph) % 3 === 0 ? 'TT' : 'tt')).concat(['.' + 'K'.repeat(hw - 1)]);
const RIDER = [   // white half-helmet with a pale-blue stripe, long black hair to the shoulder blades, the white tokkōfuku with glyph columns
  '......KKKK', '.....KOOOO', '....KOOOOb', '....KOOOSb', '....KOSSSb', '....KsSSsb', '....KKKKKK',
  '....KHhHHH', '...KHhHHHH', '..KKHhHHHH', '.KOOKhHHHH', 'KOOSSKhHHH', 'KOSSSSKhHH', 'KOcSSSSKHH', 'KOSSSSSSKK',
  'KScSSSSSSS', 'KSSSSSSSSS', 'KScSSSSSSS', 'KsSSSSSSSS', 'KscSSSSSSS', 'KqsSSSSSSS', 'KqcsSSSSSS', 'KqssSSSSSS',
  '.KqssSSSSS', '.KuqsssSSS', '..KKKKKKKK', 'KnK.......', 'KHHK......', '.KKK......'];
const CREST = ['....KK.', '...KbK.', '..KbcK.', '.KbBBcK', 'KbBBBcK', 'KcBBbcK', '.KcccK.'];   // the hitodama, its tail rising
const SEAT = [   // the sandan seat-back (ghost white, blue-white flames licking up from its foot), the ducktail with the pale lamp, the plate
  '..KKK', '.KOOO', '.KOOS', '.KOSS', '.KOSS', '.KOSc', '.KObc', '.KcSb', '.KcbB', '.KdcB', 'KKKKK', 'KOOOS', 'KdcbB', 'KLLLL', 'KllLl', '.KKPP', '..KKK'];
const PIPES = ['..KK......', '.KWVK.....', 'KWVVK.....', 'KVVK......', '.KK.......'];
const PARTS = [
  { y:0, ph:true, f:ph => tyreRows(5, 12, ph) },
  { y:-9, hang:2, rows:RIDER },
  { y:-18, hang:2, rows:CREST, full:true },
  { y:-3, rows:SEAT },
  { y:-1, rows:PIPES }];
const WISP = [['..K..', '.KbK.', '.KbK.', 'KbBbK', 'KBBBK', 'KbBbK', '.KKK.'], ['.K...', '.KbK.', '..KbK', 'KbBbK', 'KBBBK', 'KbBbK', '.KKK.']];
const BANG = ['.KKKKKKKK.', 'KbbbbbbbbK', 'KbddBBddbK', 'KbddBBddbK', 'KbddBBddbK', 'KbddBBddbK', 'KbddddddbK', 'KbddBBddbK', 'KbbbbbbbbK', '.KKKbbKKK.', '...KbbK...', '....KK....'];
const RCW = 48, RCH = 64, RGY = 60;
function grid(rows, P, full){ const n = Math.max(...rows.map(r => r.length)), rs = rows.map(r => full ? r.padEnd(n, '.') : r.padStart(n, '.'));
  return rs.map(r0 => full ? r0 : r0 + [...r0].reverse().map(ch => MIR[ch] || ch).join('')); }
function paintRows(g, rows, P, ox, oy){ rows.forEach((r, y) => { for(let x = 0; x < r.length; x++){ const ch = r[x], col = P[ch]; if(!col) continue; g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); } }); }
// one composite: (palette, tyre phase, hang -1/0/1)
function composite(P, ph, hang){ const c = can(RCW, RCH), g = c.getContext('2d');
  for(const p of PARTS){ const rows = grid(p.f ? p.f(ph) : p.rows, P, p.full), w = rows[0].length; paintRows(g, rows, P, Math.round(RCW / 2 - w / 2 + hang * (p.hang || 0)), RGY + p.y - rows.length); }
  return c; }
// the dissolve: ordered dither, filled from the head down (the feet go first when he fades, the yūrei's footless drift, never a cut body)
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
function dither(src, lv){ const c = can(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); const im = g.getImageData(0, 0, c.width, c.height), D = im.data;
  for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++){ const i = (y * c.width + x) * 4; if(!D[i + 3]) continue; const th = lv * 1.35 - ((y - 18) / 42) * .35; if(BAY[(y & 3) * 4 + (x & 3)] >= th) D[i + 3] = 0; }
  g.putImageData(im, 0, 0); return c; }
// their nobori: a pale field, a night-blue hoist, the soul-flame; three ripple phases (the gang flag of mech/gang.js, redrawn in their colours)
function flag(ph){ const FW = 12, FH = 10, c = can(FW + 3, FH + 28), g = c.getContext('2d'), px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for(let y = 1; y < c.height; y++){ px(FW + 1, y, y < 3 ? PAL.b : PAL.V); px(FW + 2, y, PAL.K); } px(FW + 1, 0, PAL.B); px(FW + 2, 0, PAL.K);
  const crest = ['..K.', '.Kb.', 'KbBK', 'KBBK', '.KK.'];
  for(let x = 0; x <= FW; x++){ const t = (FW - x) / FW, off = Math.round(Math.sin(x * .75 + ph * 2.1) * 1.2 * t), slope = Math.cos(x * .75 + ph * 2.1) * t;
    for(let y = -1; y <= FH; y++){ const yy = 3 + y + off; if(y === -1 || y === FH || x === 0){ px(x, yy, PAL.K); continue; }
      let col = x >= FW - 2 ? PAL.d : y === 0 ? PAL.O : y === FH - 1 ? PAL.s : PAL.S;
      const cx0 = x - 3, cy0 = y - 3; if(cx0 >= 0 && cx0 < 4 && cy0 >= 0 && cy0 < 5){ const k = crest[cy0][cx0]; if(k !== '.') col = PAL[k]; }
      if(slope < -.35 && col === PAL.S) col = PAL.s; px(x, yy, col); } }
  return c; }

/* ------------------------------------------------------------------ the atlas: every cell in one canvas (no texture is made mid-ride) */
let ATL = null, CELL = {}, warmed = false, TOUCH = null;
const LEGP = { id:'phantomR', a:'#e8eef8', b:'#a8b8d0', c:'#6a7c9c', d:'#141420', dl:'#34364e', K:'#0a0c18' };
const flipC = c => c._f || (c._f = (() => { const o = can(c.width, c.height), k = o.getContext('2d'); k.translate(c.width, 0); k.scale(-1, 1); k.drawImage(c, 0, 0); return o; })());
function* buildSteps(){ const list = [];
  for(let ph = 0; ph < 3; ph++) for(let h = -1; h <= 1; h++){ const base = composite(PAL, ph, h); list.push(['n' + ph + h, base]); list.push(['k' + ph + h, composite(DARK, ph, h)]);
    for(let lv = 1; lv <= 3; lv++) list.push(['d' + lv + ph + h, dither(base, lv / 4)]); yield; }
  for(let p = 0; p < 3; p++) list.push(['flag' + p, flag(p)]);
  for(let i = 0; i < 2; i++){ const rows = grid(WISP[i], PAL, true), c = can(rows[0].length, rows.length); paintRows(c.getContext('2d'), rows, PAL, 0, 0); list.push(['wisp' + i, c]); }
  { const rows = grid(BANG, PAL, true), c = can(rows[0].length, rows.length); paintRows(c.getContext('2d'), rows, PAL, 0, 0); list.push(['bang', c]); }
  yield;
  const AW = 512; let x = 0, y = 0, sh = 0; for(const it of list){ const w = it[1].width, h = it[1].height; if(x + w > AW){ x = 0; y += sh + 1; sh = 0; } it.push(x, y); x += w + 1; sh = Math.max(sh, h); }
  const cv = can(AW, y + sh + 1), g = cv.getContext('2d'); for(const [key, c, sx, sy] of list){ g.drawImage(c, sx, sy); CELL[key] = { sx, sy, w:c.width, h:c.height }; }
  ATL = cv; yield;
  const G0 = MECH.gang && MECH.gang._dbg; if(G0 && G0.legSprite){ flipC(G0.cockSprite(LEGP)); for(let n = 4; n <= 14; n += 2) flipC(G0.legSprite(LEGP, n)); }
  touch(); }
function touch(){ try{ if(!TOUCH) TOUCH = can(4, 4); const g = TOUCH.getContext('2d'), L = [ATL]; const G0 = MECH.gang && MECH.gang._dbg;
    if(G0 && G0.legSprite){ const c = G0.cockSprite(LEGP); L.push(c, flipC(c)); for(let n = 4; n <= 14; n += 2){ const l = G0.legSprite(LEGP, n); L.push(l, flipC(l)); } }
    for(const c of L) if(c && c.width) g.drawImage(c, 0, 0, 1, 1); }catch(e){ console.warn('phantom touch', e); } }
let IT = null;
function* warmSteps(){ if(warmed || typeof cx === 'undefined' || !cx) return; IT = IT || buildSteps(); for(;;){ const r = IT.next(); if(r.done) break; yield; } warmed = true; }
function warm(){ for(const _ of warmSteps()); }
const cell = (g, key, x, y, k) => { const c = CELL[key]; if(c) g.drawImage(ATL, c.sx, c.sy, c.w, c.h, Math.round(x), Math.round(y), c.w * k, c.h * k); };

/* ------------------------------------------------------------------ state */
const S = { plan:null, st:'idle', t:0, rideT:0, R:[], cut:null, cardSeen:false, ready:false, thrCD:0, bumps:0, endT:0, vanN:0, flashT:0, log:[], tele:[],
  hits:{ bumps:0, kicked:0, dodged:0, slipped:0, takedowns:0, counters:0 }, ran:null };
let uid = 0, clock = 0; const FX = [];
function reset(){ if(!S.plan || S.plan.segs !== segs) S.plan = null; endAll(); S.st = 'idle'; S.log.length = 0; S.tele.length = 0; FX.length = 0; for(const k in S.hits) S.hits[k] = 0; }
function endAll(){ S.R.length = 0; if(S.cut){ S.cut.end(); S.cut = null; } }

/* ------------------------------------------------------------------ placement: book it at the start of a dark road (second road on) */
function place(i, s){ if(S.plan && S.plan.segs !== segs) S.plan = null; if(S.plan || S.ran === segs || typeof landStart !== 'number' || i !== landStart) return;
  const key = LANDS[s.land] && LANDS[s.land].key, Tb = DIR && DIR.target ? DIR.target(ID, i) : null, frc = forced() || Tb != null;
  if(!frc && !ROADS.includes(key)) return; const z = typeof zoneOfSeg === 'function' ? zoneOfSeg(i) : 0; if(z < (frc ? 0 : ZONE_MIN)) return;   /* Tb: demo mode's authored start */
  let B = i + (z === 0 ? 480 : 300); if(Tb != null) B = Math.max(B, Tb); const span = 1700; if(window.forkClear) B += forkClear(B, B + span) || 0;
  if(DIR && !DIR.request(ID, { tier:'hero', seg:B, auto:false })) return;
  S.plan = { B, z, segs }; }

/* ------------------------------------------------------------------ sound (the core's synth): a temple bell, blips, the lights' snap */
function bell(v, f){ if(!ac()) return; const t0 = M.ac.currentTime, f0 = f || 1046; M.tone(f0, 2.4, { type:'sine', v:.045 * v, at:t0 }); M.tone(f0 * 2.76, 1.1, { type:'sine', v:.016 * v, at:t0 }); M.tone(f0 * .5, 2.8, { type:'triangle', v:.02 * v, at:t0 }); M.tone(f0 * 1.003, 2.2, { type:'sine', v:.02 * v, at:t0 + .01 }); }
function blip(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(1318, .07, { type:'square', v:.018 * v, at:t0 }); M.tone(1318, .07, { type:'square', v:.018 * v, at:t0 + .14 }); }
function snapOn(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.05, 3200, .05 * v, t0); M.tone(220, .3, { type:'sawtooth', v:.03 * v, fuzz:true, at:t0 }); M.tone(330, .25, { type:'sawtooth', v:.02 * v, fuzz:true, at:t0 + .04 }); }
function hush(v){ if(!ac()) return; const t0 = M.ac.currentTime; for(let i = 0; i < 8; i++) M.tone(62 + (i % 2) * 5, .3, { type:'sawtooth', v:.012 * v * (i / 8), fuzz:true, at:t0 + .9 + i * .14 }); }   // engines far behind, coming up
function thump(v){ if(!ac()) return; if(window.SFX && SFX.ready && SFX.ready()) SFX.play('kickHit', {}); else { M.tone(78, .25, { type:'square', v:.06 * v }); M.noise(.2, 380, .1 * v); } }

/* ------------------------------------------------------------------ start */
function canStart(){ if(state !== 'play' || copT > 0) return false; const G0 = MECH.gang, E = G0 && G0._dbg ? G0._dbg.E() : null; if(E && !E.over) return false;
  const BO = MECH.sp_boss; if(BO && BO.state && BO.state().st !== 'idle') return false;
  const J = MECH.sp_jump; if(J && J.flying && J.flying()) return false; const ps = pSeg(); if(segs[ps] && segs[ps].spjP) return false;
  if(window.inForkWindow && inForkWindow(ps, ps + 1500)) return false; return true; }
function start(){ const pz = pzz(); S.st = 'hush'; S.t = 0; S.rideT = 0; S.cardSeen = false; S.ready = false; S.thrCD = 1.2; S.bumps = 0; S.endT = 0; S.vanN = 0; S.ran = segs; S.R.length = 0; FX.length = 0;
  // four riders far behind you, lights out; they come up both sides, never in your lane
  const SL = [['L', -1, -900, .26], ['R', 1, -1000, .26], ['F1', -1, -1250, .4], ['F2', 1, -1350, .4]];
  for(const [role, sd, dz, off] of SL) S.R.push({ id:uid++, role, sd, z:pz + dz, x:clamp(playerX + sd * .62, -.9, .9), off, speed:MAXS * 1.3, vx:0, kvx:0, lean:0, a:0, dark:1, st:'ride',
    windT:0, windSide:0, kickT:0, kickSide:0, kickCD:0, stunT:0, cutT:0, look:0, flagPh:uid * .7, front:false, lastGap:dz, bumpT:-9, wisp:uid * 1.7 });
  bell(.9); setTimeout(() => bell(.6, 1046 * .75), 700); hush(1);
  if(DIR && DIR.cine) S.cut = DIR.cine({ id:ID, letterbox:{ top:.07, bottom:.04 }, duck:.5, dur:0, card:CARD, guard:{ ahead:60, behind:0 } });
  else floatText('亡霊', W / 2, H * .3, 34, '#bfe8ff');
  if(DIR && DIR.done) DIR.done(ID);
  S.log.push({ ev:'start', seg:pSeg(), t:+playT.toFixed(1) }); }
function finish(){ const clean = S.bumps === 0, A = MECH.arrival;
  if(clean){ sunLeft = Math.min(SUN_MAX, sunLeft + 3); if(boostT <= 0) boostTier = 1; boostT = Math.max(boostT, 1.1); hud(); }
  if(A && A.callout) A.callout(clean ? 'THE PHANTOMS SALUTE YOU' : 'GONE INTO THE DARK', { kanji:'消', col:'#bfe8ff', size:'m', prio:2, hold:.6 }); else floatText(clean ? 'THE PHANTOMS SALUTE YOU' : 'GONE', W / 2, H * .32, 30, '#bfe8ff');
  if(clean) setTimeout(() => { if(state === 'play') floatText('+3s', W / 2, H * .4, 26, '#f4ecdf'); }, 500);
  S.log.push({ ev:'end', clean, bumps:S.bumps, t:+playT.toFixed(1) }); }

/* ------------------------------------------------------------------ the player's kick (from mech/gang.js), chained after any earlier hook */
function kickExt(side){ if(S.st !== 'ride' && S.st !== 'arrive' || AIR.h >= 6) return null; const pz = pzz(); let best = null, bd = 1e9;
  for(const r of S.R){ if(r.st !== 'ride' || r.a < .75) continue; const gap = r.z - pz, dx = r.x - playerX; if(Math.abs(gap) > 380 || dx * side < .07 || Math.abs(dx) > .3) continue; const d = Math.abs(dx) + Math.abs(gap) / 2000; if(d < bd){ bd = d; best = r; } }
  if(!best) return null; const r = best, counter = r.windT > 0 || r.cutT > 0; r.kvx += side * (counter ? 3 : 2.5); r.stunT = .8; r.windT = 0; r.cutT = 0; r.cutGo = 0; r.kickCD = Math.max(r.kickCD, 1.6); S.hits.kicked++;
  if(counter){ S.hits.counters++; act('counter'); disperse(r, 'counter'); } else { const p = nearScreen(r.z, r.x); sparkle(p.x, p.y - 14 * p.k, side); }
  thump(.7); return r; }
let prevKick = null; const chained = side => kickExt(side) || (prevKick ? prevKick(side) : null);
const act = (k, pts) => { try{ if(MECH.style && MECH.style.act) MECH.style.act(k, pts); }catch(e){} };
function sparkle(x, y, side){ if(reduce) return; for(let i = 0; i < 7; i++) spark(x, y, side * rr(80, 240), rr(-200, -40), .35, i % 2 ? '#9ae8ff' : '#f0fdff'); }
// the phantom goes: no wreck, no body; he spins out, his hitodama flare and rise, he fades into the fog
function disperse(r, how){ if(r.st !== 'ride') return; r.st = 'gone'; r.goneT = 0; S.hits.takedowns++; act('takedown', 400); flow++; bestFlow = Math.max(bestFlow, flow); hud();
  const p = nearScreen(r.z, r.x), x = clamp(p.x, W * .06, W * .94), y = clamp(p.y - 14 * p.k, H * .3, H * .85); FX.push({ t:0, x, y, k:p.k, kind:'puff' });
  if(!reduce) for(let i = 0; i < 18; i++) spark(x + rr(-8, 8) * p.k, y + rr(-6, 6) * p.k, rr(-160, 160), rr(-320, -60), rr(.4, .9), ['#f0fdff', '#9ae8ff', '#46aee8'][i % 3]);
  bell(.5, 1396); const A = MECH.arrival; if(A && A.callout) A.callout('PHANTOM GONE', { kanji:'祓', col:'#9ae8ff' }); S.log.push({ ev:'disperse', how, t:+playT.toFixed(1) }); }
function bump(r){ S.bumps++; S.hits.bumps++; r.bumpT = clock; speed = Math.max(MAXS * .55, speed * .86); const sd = Math.sign(playerX - r.x) || 1; playerX += sd * .05; wob = sd * .3; wobT = .45; shake = reduce ? 0 : Math.max(shake, 5); thump(1);
  r.kvx -= sd * .6; floatText('Bump', W / 2, H * .58, 22, '#c8dcff'); S.log.push({ ev:'bump', role:r.role, t:+playT.toFixed(1) }); }
let wob = 0, wobT = 0;

/* ------------------------------------------------------------------ update */
function steerTo(e, tx, dt, vmax){ const blocked = L => cars.some(c => c.z > e.z - 200 && c.z - e.z < 2400 && Math.abs(c.x - L) < .3);
  if(blocked(tx)){ let bl = null, bd = 9; for(const L of [-.66, 0, .66]) if(!blocked(L) && Math.abs(L - tx) < bd){ bd = Math.abs(L - tx); bl = L; } if(bl !== null) tx = bl; }
  const s = segAt(e.z); if(s && s.gore && Math.abs(tx) < .3) tx = Math.sign(tx || e.x || 1) * .4;
  tx = clamp(tx, -.92, .92); const want = e.stunT > 0 ? 0 : clamp((tx - e.x) * 2.6, -vmax, vmax); e.vx = lerp(e.vx, want, 1 - Math.exp(-5 * dt)); e.x += (e.vx + e.kvx) * dt; e.kvx *= Math.exp(-3.5 * dt);
  const curve = s ? s.curve : 0; e.lean = lerp(e.lean, clamp(curve * .075 + (e.vx + e.kvx * .6) * .38, -.5, .5), 1 - Math.exp(-6 * dt)); }
const TELL = { kick:.9, cut:1.1 };
const busy = () => S.R.some(r => r.windT > 0 || r.kickT > 0 || r.cutT > 0 || r.cutGo > 0);
function update(dt){ clock += dt;
  if(state !== 'play'){ if(S.st !== 'idle'){ S.st = 'idle'; endAll(); } return; }
  const ps = pSeg(), G0 = MECH.gang;
  if(G0 && G0.kickExt !== chained){ prevKick = G0.kickExt || null; G0.kickExt = chained; }
  if(S.plan && S.st === 'idle' && ps > S.plan.B - 1300 && ps < S.plan.B + 900 && G0 && G0._dbg) G0._dbg.set({ nextT:playT + 6 });
  if(S.st !== 'idle' && G0 && G0._dbg) G0._dbg.set({ nextT:playT + 20 });
  if(S.plan && S.st === 'idle' && ps >= S.plan.B){ if(canStart()){ S.plan = null; start(); } else if(ps > S.plan.B + 900){ S.log.push({ ev:'skipped', seg:ps }); S.plan = null; } }
  for(let i = FX.length - 1; i >= 0; i--) if((FX[i].t += dt) > .6) FX.splice(i, 1);
  if(wobT > 0){ wobT -= dt; leanV += wob * Math.sin(wobT * 40) * (wobT / .45) * (reduce ? .3 : 1); }
  if(S.st === 'idle') return;
  S.t += dt; const pz = pzz();
  if(!busy() && S.st === 'ride') for(const c of cars) if(c.z - pz > 290 * SEG && c.z - pz < 380 * SEG) c.z += 1800 * SEG;   // the night empties ahead of them (only at the edge of the draw distance)
  // phases
  if(S.st === 'hush'){ if(S.t > 1.6) S.st = 'arrive'; }
  else if(S.st === 'arrive'){ const A = MECH.arrival, on = !!(A && ((A.momentOn && A.momentOn()) || (A.cardOn && A.cardOn())) || (MECH.cutin && MECH.cutin.on && MECH.cutin.on()));
    if(on) S.cardSeen = true;
    const formed = S.R.every(r => r.st !== 'ride' || r.a >= 1 && r.z - pz > -60);
    if(((S.cardSeen && !on) || S.t > 7) && formed || S.t > 9){ if(S.cut){ S.cut.end(); S.cut = null; } S.st = 'ride'; S.rideT = 0; S.log.push({ ev:'ride', t:+playT.toFixed(1) }); } }
  else if(S.st === 'ride'){ S.rideT += dt; const live = S.R.filter(r => r.st === 'ride');
    if(!live.length || (S.rideT > 18 && !busy())){ S.st = 'vanish'; S.endT = 0; S.vanN = 0; S.vanT = 0; S.log.push({ ev:'vanish', t:+playT.toFixed(1) }); }
    else if(!busy() && AIR.h < 6 && recov <= 0){ S.thrCD -= dt; if(S.thrCD <= 0) threat(live, pz); } }
  else if(S.st === 'vanish'){ S.endT += dt; S.vanT -= dt;
    const live = S.R.filter(r => r.st === 'ride'); if(live.length && S.vanT <= 0){ const r = live.sort((a, b) => (b.z - pz) - (a.z - pz))[live.length - 1]; r.st = 'fade'; r.fadeT = 0; r.last = live.length === 1; S.vanT = .7; if(r.last) r.flash = 0; }
    if(!live.length && S.R.every(r => r.st === 'gone' ? r.goneT > 1 : r.st === 'fade' ? r.fadeT > (r.last ? 2.2 : 1.2) : true) && !S.done){ S.done = true; bell(.8, 784); finish(); }
    if(S.done && S.endT > 1.5 || S.endT > 12){ S.done = false; S.st = 'idle'; endAll(); if(G0 && G0._dbg) G0._dbg.set({ nextT:playT + 25 }); return; } }
  for(const r of S.R) rider(r, dt, pz);
  { let n = 0; for(const r of S.R) if(!(r.st === 'gone' && r.goneT > 1.4) && !(r.st === 'fade' && r.fadeT > 2.6)) S.R[n++] = r; S.R.length = n; } }

// pick the next threat: a kick from a flanker beside you, or the lights-out cut from a rider ahead (they alternate when both can)
function threat(live, pz){ const fl = live.filter(r => (r.role === 'L' || r.role === 'R') && Math.abs(r.z - pz) < 260 && Math.abs(r.x - playerX) > .1 && Math.abs(r.x - playerX) < .3 && r.kickCD <= 0);
  const fr = live.filter(r => (r.role === 'F1' || r.role === 'F2') && r.z - pz > 200 && r.z - pz < 900);
  const want = S.lastThr === 'kick' && fr.length ? 'cut' : fl.length ? 'kick' : fr.length ? 'cut' : null; if(!want) return;
  if(want === 'kick'){ const r = fl[0]; r.windT = TELL.kick; r.windSide = -Math.sign(r.x - playerX); r.look = r.windSide; blip(1); S.tele.push({ type:'kick', tell:TELL.kick, t:+playT.toFixed(2) }); }
  else { const r = fr.sort((a, b) => (a.z - pz) - (b.z - pz))[0]; r.cutT = TELL.cut; r.cutX = clamp(playerX, -barrier(r.z) + .1, barrier(r.z) - .1); r.look = Math.sign(playerX - r.x) || 1; bell(.7, 523);
    if(ac()){ const t0 = M.ac.currentTime; M.tone(110, .5, { type:'sawtooth', v:.02, fuzz:true, at:t0 }); } S.tele.push({ type:'cut', tell:TELL.cut, t:+playT.toFixed(2) }); }
  S.lastThr = want; S.thrCD = rr(1.6, 2.6); }

function rider(r, dt, pz){ const gap = r.z - pz, dx = r.x - playerX; r.flagPh += dt; r.wisp += dt;
  if(r.st === 'gone'){ r.goneT += dt; r.a = Math.max(0, 1 - r.goneT / .6); r.z += r.speed * dt; r.x += r.kvx * dt; r.kvx *= Math.exp(-2 * dt); r.lean = clamp(r.lean + Math.sign(r.kvx || 1) * dt * 2, -.6, .6); return; }
  if(r.st === 'fade'){ r.fadeT += dt; const d = r.last ? 1.2 : 0; r.speed = lerp(r.speed, MAXS * 1.3, 1 - Math.exp(-1.2 * dt)); r.z += r.speed * dt; steerTo(r, r.x, dt, .6);
    if(r.last && r.fadeT < d){ const f = Math.floor(r.fadeT / .2); r.dark = f % 2 === 1 ? 0 : f < 4 ? 1 : 0; if(f !== r.flashF){ r.flashF = f; if(f % 2 === 1) snapOn(.6); } } else r.dark = 0;
    r.a = r.fadeT < d ? 1 : Math.max(0, 1 - (r.fadeT - d) / .8); return; }
  // materialise as they come past the bike (four dither steps over 0.6 s), lights snapping on as they do
  if(gap > -320 && r.a < 1){ r.a = Math.min(1, r.a + dt / .6); if(r.dark > 0 && r.a > .5 && !r.cutT){ r.dark = 0; snapOn(.5); } }
  let ts, tx;
  if(S.st === 'hush' || S.st === 'arrive'){ const ahead = r.role === 'F1' || r.role === 'F2', want = ahead ? (r.role === 'F1' ? 420 : 700) : 30;
    ts = gap < want - 200 ? Math.max(speed * 1.16, MAXS * 1.16) : speed + clamp((pz + want - r.z) * 1.4, -MAXS * .3, MAXS * .3);
    tx = clamp(playerX + r.sd * (gap < 260 ? .36 : r.off), -.9, .9); }
  else { const ahead = r.role === 'F1' || r.role === 'F2'; let want = ahead ? (r.role === 'F1' ? 420 : 700) : 30;
    tx = clamp(playerX + r.sd * (ahead ? r.off : .22), -.9, .9); if(Math.abs(tx - playerX) < .18) tx = playerX - r.sd * .22;
    if(r.cutT > 0){ want = lerp(200, Math.max(200, gap), r.cutT / TELL.cut); tx = r.x; r.dark = Math.min(1, r.dark + dt / .2); }
    if(r.cutGo > 0){ want = 150; tx = r.cutX; }
    ts = speed + clamp((pz + want - r.z) * 1.6, -MAXS * .35, MAXS * .35); }
  if(r.stunT > 0){ r.stunT -= dt; ts *= .9; }
  r.speed = lerp(r.speed, ts, 1 - Math.exp(-1.6 * dt)); r.z += r.speed * dt;
  steerTo(r, tx, dt, r.cutGo > 0 ? 2.4 : .85);
  const wx = barrier(r.z); if(Math.abs(r.x) > wx){ if(r.stunT > 0 && Math.abs(r.kvx) > .35){ r.x = Math.sign(r.x) * wx; disperse(r, 'wall'); return; } r.x = Math.sign(r.x) * wx; r.kvx = 0; }
  if(r.stunT > 0) for(const c of cars) if(Math.abs(c.z - r.z) < 260 && Math.abs(c.x - r.x) < .25){ disperse(r, 'car'); return; }
  if(S.st !== 'ride') return;
  // the cut: the tell ends, his lights snap on and he takes the lane; contact while he sweeps in is a bump, never a crash
  if(r.cutT > 0){ r.cutT -= dt; if(r.cutT <= 0){ r.cutT = 0; r.cutGo = .8; r.dark = 0; r.look = 0; r.flashT = .25; snapOn(1); } }
  else if(r.cutGo > 0){ r.cutGo -= dt; if(Math.abs(gap) < 170 && gap > -60 && Math.abs(dx) < .13 && AIR.h < 6 && recov <= 0 && clock - r.bumpT > 1){ bump(r); r.cutGo = 0; }
    if(r.cutGo <= 0){ r.cutGo = 0; if(clock - r.bumpT > 1){ S.hits.dodged++; act('dodge'); } } }
  // clean overtake: you pass a phantom ahead of you without touching him
  if(r.lastGap > 0 && gap <= 0 && Math.abs(dx) > .1 && clock - r.bumpT > 2 && r.a >= 1){ S.hits.slipped++; act('through'); }
  r.lastGap = gap;
  // side contact: a shove apart (never a crash); a flanker's kick after its tell
  if(Math.abs(gap) < 150 && Math.abs(dx) < .12 && AIR.h < 6 && recov <= 0 && !r.cutGo){ const sd = Math.sign(dx) || 1, push = .12 - Math.abs(dx); playerX -= sd * push * .5; r.x += sd * push * .5; r.kvx += sd * .4; speed *= .99; }
  r.kickCD -= dt;
  if(r.windT > 0){ r.windT -= dt; if(r.windT <= 0){ r.kickT = .25; r.kickSide = r.windSide; r.kickCD = rr(2.6, 4); r.look = 0;
      if(Math.abs(r.z - pzz()) < 330 && (playerX - r.x) * r.kickSide > .07 && Math.abs(playerX - r.x) < .3 && AIR.h < 6 && recov <= 0){ S.hits.bumps++; S.bumps++; r.bumpT = clock; playerX += r.kickSide * .06; speed = Math.max(MAXS * .55, speed * .9); wob = r.kickSide * .3; wobT = .45; thump(1); floatText('Kicked', W / 2, H * .6, 22, '#c8dcff'); }
      else { S.hits.dodged++; act('dodge'); } } }
  if(r.kickT > 0) r.kickT -= dt; }

/* ------------------------------------------------------------------ drawing */
function drawRider(r, x, y, k, fog, now, am){ if(!ATL) return; const lv = r.a >= 1 ? 4 : Math.floor(r.a * 4); if(lv <= 0) return; const a = (1 - fog * .6) * (am === undefined ? 1 : am); if(a <= .01) return;
  const g = cx, hang = Math.round(clamp(r.lean / .5, -1, 1)), ph = Math.floor(now / 45 + r.id) % 3, dk = r.dark > .5, key = lv < 4 ? 'd' + lv + ph + hang : (dk ? 'k' : 'n') + ph + hang, c = CELL[key]; if(!c) return;
  g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = false;
  if(lv >= 3){ g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x, y, 9 * k, Math.max(1, 1.6 * k), 0, 0, 6.283); g.fill(); }
  // lights on: the beam pools on the road ahead of him (his headlight faces away from you); lights out: nothing but the rim and the flames
  if(!dk && lv >= 2){ glow(x, y - 3 * k, 16 * k, '#bfe8ff', (r.flashT > 0 ? .6 : .16) * a); }
  g.translate(x, y); g.rotate(r.lean); g.drawImage(ATL, c.sx, c.sy, c.w, c.h, Math.round(-RCW / 2 * k), Math.round(-RGY * k), RCW * k, RCH * k);
  if(r.role === 'F2' && lv >= 3){ const fl = CELL['flag' + (Math.floor(now / 110 + r.flagPh) % 3)]; if(fl) g.drawImage(ATL, fl.sx, fl.sy, fl.w, fl.h, Math.round(-4 * k), Math.round((-4 - fl.h) * k), fl.w * k, fl.h * k); }
  // the tail lamp: pale cyan; dark with the lights out; a streak behind it while he comes past you (the light trail)
  if(!dk && lv >= 2){ glow(0, -5 * k, 4 * k, '#9ae8ff', .55 * a); if(r.a < 1 || r.speed - speed > MAXS * .08){ const L = Math.round(4 + Math.min(10, (r.speed - speed) / MAXS * 40)); for(let i = 1; i <= 3; i++){ g.globalAlpha = a * (.5 - i * .13); g.fillStyle = '#9ae8ff'; g.fillRect(Math.round(-1 * k), Math.round((-5 + i * L / 3) * k), Math.max(1, Math.round(2 * k)), Math.max(1, Math.round(L / 3 * k))); } g.globalAlpha = a; } }
  // the kick: his leg cocks out toward you, then shoots out (mech/gang.js's leg in his white trousers)
  const G0 = MECH.gang && MECH.gang._dbg;
  if(G0 && G0.legSprite && (r.windT > 0 || r.kickT > 0)){ const sd = r.kickT > 0 ? r.kickSide : r.windSide, hip = -12;
    if(r.kickT > 0){ const ext = Math.sin(clamp(1 - r.kickT / .25, 0, 1) * Math.PI), len = Math.max(4, Math.round(ext * 12 / 2) * 2), s0 = G0.legSprite(LEGP, len), s = sd < 0 ? s0 : flipC(s0); g.drawImage(s, sd < 0 ? (-9 - s.width) * k : 9 * k, (hip - 5) * k, s.width * k, s.height * k); }
    else { const s0 = G0.cockSprite(LEGP), s = sd < 0 ? s0 : flipC(s0); g.drawImage(s, sd < 0 ? (-9 - s.width) * k : 9 * k, (hip - 10) * k, s.width * k, s.height * k); glow(sd * 15 * k, (hip - 6) * k, 7 * k, '#9ae8ff', .45); } }
  g.restore();
  // two hitodama trail him, pixel flames that bob on their own beat (they stay when his lights are out: the tell that he is still there)
  const wk = Math.max(PX, Math.round(k * .8 / PX) * PX); if(lv >= 2) for(const sd of [-1, 1]){ const t = r.wisp + (sd > 0 ? 1.3 : 0), bob = calm() ? 0 : Math.round(Math.sin(t * 3.1) * 2), w = CELL['wisp' + ((Math.floor(t * 4) + (sd > 0 ? 1 : 0)) % 2)];
    if(!w) continue; g.globalAlpha = a * (lv / 4) * (dk ? 1 : .85); g.drawImage(ATL, w.sx, w.sy, w.w, w.h, Math.round(x + sd * 15 * k - w.w * wk / 2), Math.round(y - (30 + bob) * k - w.h * wk), w.w * wk, w.h * wk);
    if(!calm()) glow(x + sd * 15 * k, y - (30 + bob) * k - w.h * wk / 2, 5 * wk, '#46aee8', .3 * a); }
  // the tell's bubble ("!"), upright, never smaller than 2 canvas px a sprite px
  if(r.windT > 0){ const bb = CELL.bang, bk = Math.max(2 * PX, Math.round(k * .7 / PX) * PX), bob = calm() ? 0 : (Math.floor(now / 140) % 2) * PX; if(bb){ g.globalAlpha = 1; g.drawImage(ATL, bb.sx, bb.sy, bb.w, bb.h, Math.round(x - bb.w * bk / 2), Math.round(y - 44 * k - bb.h * bk) - bob, bb.w * bk, bb.h * bk); } }
  g.globalAlpha = 1; }

// the road paint: the cold headlight wash ahead of riders with their lights on (the "mirror" cue before you see them), and during a cut
// the hitodama path, small pale flames down the lane he will take, from just ahead of you to his wheel
function drawSegBack(s, sx0, sy0, uw, fog, now){ if(S.st === 'idle' || !s.p1.screen || !s.p2.screen) return; const p1 = s.p1.screen, p2 = s.p2.screen; if(p1.y <= p2.y) return; const pz = pzz(), z0 = s.index * SEG;
  for(const r of S.R){ if(r.st !== 'ride' || r.dark > .5) continue; const d = z0 - r.z; if(d < 0 || d > 1600) continue;
    const fl = S.st === 'hush' && !calm() ? (Math.floor(S.t * 9 + r.id) % 4 ? 1 : .4) * Math.min(1, S.t / .8) : 1, a = .1 * (1 - d / 1600) * fl * (r.a < 1 && r.z - pz > -320 ? 1 : 1); if(a <= .005) continue;
    const hw = .14 + d / 1600 * .22; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a; cx.fillStyle = '#7ac8ff';
    cx.beginPath(); cx.moveTo(p1.x + (r.x - hw) * p1.w, p1.y); cx.lineTo(p1.x + (r.x + hw) * p1.w, p1.y); cx.lineTo(p2.x + (r.x + hw) * p2.w, p2.y); cx.lineTo(p2.x + (r.x - hw) * p2.w, p2.y); cx.closePath(); cx.fill();
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; }
  for(const r of S.R){ if(!(r.cutT > 0)) continue; const i0 = Math.floor((pz + 60) / SEG), i1 = Math.floor((r.z + 120) / SEG); if(s.index < i0 || s.index > i1 || s.index % 2) continue;
    const on = calm() || Math.floor(now / 120 + s.index) % 3, w = CELL['wisp' + (s.index / 2 % 2)]; if(!w) continue; const kk = Math.max(PX, Math.round(p1.w / ROADW * 18 / PX) * PX) || PX, X = p1.x + r.cutX * p1.w;
    cx.globalAlpha = (on ? .95 : .55) * Math.min(1, (TELL.cut - r.cutT) / .15); cx.drawImage(ATL, w.sx, w.sy, w.w, w.h, Math.round(X - w.w * kk / 2), Math.round(p1.y - w.h * kk), w.w * kk, w.h * kk); cx.globalAlpha = 1; } }
function drawSeg(s, sx0, sy0, uw, fog, now){ if(S.st === 'idle') return; const pz = pzz(), K = kP();
  for(const r of S.R) if(Math.floor(r.z / SEG) === s.index && r.z - pz >= 0){ const P = projOn(s, r.z, r.x); drawRider(r, P.x, P.y, P.w * K / W, fog, now, EDGE); } }
// riders between you and the camera: drawn UNDER the bike and faded before they turn to blocks (setpiece/boss.js, W9)
function drawUnder(now){ if(S.st === 'idle') return; const pz = pzz();
  for(const r of S.R){ const g = r.z - pz; if(g >= 0 || g < -PZ * .8) continue; const p = nearScreen(r.z, r.x, .2), a = nearA(p.k); if(a > .01) drawRider(r, p.x, p.y, p.k, 0, now, a); } }
function drawScreen(now){ if(S.st === 'idle') return;
  for(const f of FX){ if(f.kind !== 'puff') continue; const kk = Math.max(PX, Math.round(kP() * 1.6 / PX) * PX), st = Math.min(3, Math.floor(f.t / .15)), w = CELL['wisp' + (st % 2)]; if(!w || !ATL) continue;
    cx.globalAlpha = 1 - st / 4; for(let i = 0; i < 5; i++){ const an = i / 5 * 6.283 + f.t, rr0 = (6 + f.t * 40) * kk / PX; cx.drawImage(ATL, w.sx, w.sy, w.w, w.h, Math.round(f.x + Math.cos(an) * rr0), Math.round(f.y - f.t * 60 * kk / PX + Math.sin(an) * rr0 * .5), w.w * kk, w.h * kk); } }
  cx.globalAlpha = 1;
  for(const r of S.R) if(r.flashT > 0) r.flashT -= 1 / 60; }

/* ------------------------------------------------------------------ the module */
MECH.sp_phantom = { warm, warmSteps, reset, place, update, drawSeg, drawSegBack, drawScreen, drawUnderBike:drawUnder,
  finish(rec){ if(S.log.some(e => e.ev === 'start')) rec.phantom = { bumps:S.hits.bumps, gone:S.hits.takedowns, slipped:S.hits.slipped }; },
  _start(){ warm(); if(S.st === 'idle'){ start(); return true; } return false; },
  state(){ return { st:S.st, t:+S.t.toFixed(2), rideT:+S.rideT.toFixed(2), plan:S.plan && { B:S.plan.B, z:S.plan.z }, bumps:S.bumps, riders:S.R.map(r => ({ role:r.role, st:r.st, gap:Math.round(r.z - pzz()), x:+r.x.toFixed(2), a:+r.a.toFixed(2), dark:r.dark })) }; },
  report(){ return { log:S.log.slice(), tele:S.tele.slice(), hits:Object.assign({}, S.hits), minTell:S.tele.length ? Math.min(...S.tele.map(t => t.tell)) : null }; },
  threat(){ const out = []; for(const r of S.R){ if(r.windT > 0) out.push({ type:'kick', side:r.windSide, x:r.x, gap:r.z - pzz(), left:r.windT }); if(r.cutT > 0) out.push({ type:'cut', x:r.x, x1:r.cutX, gap:r.z - pzz(), left:r.cutT }); if(r.cutGo > 0) out.push({ type:'cutgo', x:r.x, x1:r.cutX, gap:r.z - pzz(), left:r.cutGo }); } return out; },
  entities(){ return S.R; },
  _sheet(){ warm(); return ATL ? ATL.toDataURL('image/png') : ''; },
  _sprites(k){ warm(); k = k || 4; const keys = ['n10', 'n1-1', 'n11', 'k10', 'd110', 'd210', 'd310'], c = can(keys.length * RCW * k + 40 * k, RCH * k), g = c.getContext('2d'); g.fillStyle = '#0c0e1c'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
    keys.forEach((key, i) => cell(g, key, i * RCW * k, 0, k)); cell(g, 'flag0', keys.length * RCW * k + 4 * k, 4 * k, k); cell(g, 'wisp0', keys.length * RCW * k + 24 * k, 8 * k, k); cell(g, 'bang', keys.length * RCW * k + 24 * k, 24 * k, k); return c.toDataURL('image/png'); },
  _draw:{ drawRider, CELL:() => CELL, ATL:() => ATL } };
})();
