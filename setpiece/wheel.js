/* Sundown set piece: 観覧車 RUNAWAY WHEEL on Minato Mirai (MECH.sp_wheel, director id 'wheel', hero tier). See setpiece/README.md.
   Load after mech/director.js and env/minato.js.

   The Cosmo Clock breaks off its axle in a storm of sparks, drops onto its rim with its lights failing and its clock gone to dashes,
   twists, and rolls off the pier into the basin toward the road. It ploughs through the shallows beside you throwing up a wall of spray,
   grinds onto the promenade in a fan of sparks, and flings its cabins over the parapet onto the lanes ahead: you dodge them. Then it
   leans away, rolls off the end of the quay and topples into the harbour in a huge spray, its last lights going under.

   Beats, all driven by the rider's distance s past the trigger (H - 260, H the wheel's hub), never by the clock:
     s 0..60     the break: sparks burst from the hub, the wheel drops onto the pier, bounces, its lights flicker (dim steadily under
                 reduced motion), the clock shows --:--, it twists to face the road. The card (cine) plays here, nothing dangerous yet.
     s 60..300   the roll: it rolls toward the road through the basin, turning to run alongside; spray where it meets the water.
     s 300..480  alongside: it keeps pace about 75 segments ahead on your right; cabins break off its top and are thrown across the road.
     s 480..560  the veer: it leans away, speeds up and rolls off the quay into the harbour.
     s 560..     the splash: it topples flat into the water: a column of spray, a ring of foam, mist; its lights die one by one.
   The wheel is the env road's own renderer (ENV.minato.wheel): true world-space geometry, re-projected every frame (no flat overlay,
   no sprite), drawn at its far end in the depth order so the street and the cabins pass in front of it, and doubled in the harbour.

   The dodge (fairness, taken from setpiece/fireball.js's rules): cabins land in rows on the three lane spots; a row never covers more than
   two, so a lane is always open, and between rows the open lane moves by at most one. Each landing is telegraphed from ~95 segments
   (~1.7 s at speed): an amber ring on the asphalt, the cabin visibly flying in from the wheel and its shadow tightening, a first bounce a
   few segments short. When a row launches, if the open lane is out of steering reach (a reaction gap, then 85% lock), the landing nearest
   the rider is thrown wide onto the promenade instead. Hitting a cabin is the game's normal crash (never an instant end). No slow motion.
   The director's guard keeps traffic and oil out of the stretch. The span is placed clear of fork windows (env/minato.js lay()).
   Reduced motion / no flash: no shake, no flicker (failing lights are dim and steady), the ring does not pulse, fewer particles.
   References (rules taken, nothing copied): the Cosmo Clock 21 night photographs (env/minato.js header); Burnout 3's crash debris (chunks
   tumble and bounce; the spark fan carries the speed); Uncharted 2's train and Spider-Man 2's runaway set pieces (the threat runs beside
   you at your pace, and its debris is what you dodge, never the giant itself); Hokusai's spray (water breaks into claws, then into dots).
   Performance: every sprite is built in warm(); particles are capped; nothing allocates a canvas mid-ride. */
"use strict";
(() => {
  const DIR = MECH.director, CARD = { kanji:'観覧車', name:'RUNAWAY WHEEL', sub:'dodge the falling cabins', col:'#ff8ad8' };
  if(DIR) DIR.register('wheel', { tier:'hero', roads:['minato'], card:CARD });
  const W0 = MECH.sp_wheel = {};
  const T0 = -260, BRK = 60, ALG = 300, VEER = 480, SPLS = 560, END = 720;   // s marks (segments past the trigger)
  const LANES = [-.66, 0, .66], HIT_L = 1.4, HIT_R = .3, DL = 95, REACT = 10;
  const ROWS = [[340, 1], [385, 1], [425, 2], [462, 1], [500, 2], [535, 2]];   // landing s, how many cabins
  const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const H1 = n => hash(n);
  const snp = v => Math.round(v / PX) * PX;
  const pSeg = () => (position + PZ) / SEG;
  const E = () => ENV.minato;
  const plans = [];
  let Tg = 0, cur = null;
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function boom(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.4, 80, .2 * v, t0); M.noise(.5, 700, .07 * v, t0); M.tone(46, 1.1, { type:'sawtooth', v:.07 * v, fuzz:true, at:t0 }); }
  function groan(){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(70, 1.6, { type:'sawtooth', v:.05, fuzz:true, at:t0 }); M.tone(52, 1.8, { type:'square', v:.03, at:t0 + .2 }); M.noise(.8, 2400, .05, t0); }
  function clank(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.35, 1300, .07 * v, t0); M.tone(180 + 60 * Math.random(), .25, { type:'square', v:.03 * v, at:t0 }); }
  function whoosh(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.8, 500, .12 * v, t0); M.noise(2.6, 140, .14 * v, t0 + .1); }

  // ---------------------------------------------------------------- sprites (warm): cabins in four quarter turns, spray puffs
  const S = {};
  const CAB = [6, 9, 13, 18, 26, 36];
  function cabSpr(si, rot){ const k = 'cab' + si + '_' + rot; if(S[k]) return S[k]; const h = CAB[si], w = Math.max(4, Math.round(h * .82)), c = document.createElement('canvas'), sw = rot % 2 ? h : w, sh = rot % 2 ? w : h; c.width = sw; c.height = sh; const g = c.getContext('2d');
    const px = (x, y, col) => { let X = x, Y = y; if(rot === 1){ X = h - 1 - y; Y = x; } else if(rot === 2){ X = w - 1 - x; Y = h - 1 - y; } else if(rot === 3){ X = y; Y = w - 1 - x; } g.fillStyle = col; g.fillRect(X, Y, 1, 1); };
    // a gondola seen side-on: a rounded orange-red shell, a wide band of lit windows with a dark frame, a grey roof cap with the hanger
    const cap = Math.max(1, Math.round(h * .12)), w0 = Math.round(h * .3), w1 = Math.round(h * .66), r = Math.max(1, Math.round(w * .18));
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const cy2 = y < r ? r - y : y > h - 1 - r ? y - (h - 1 - r) : 0, cx2 = x < r ? r - x : x > w - 1 - r ? x - (w - 1 - r) : 0; if(cx2 * cx2 + cy2 * cy2 > r * r + .5) continue;
      const edgeL = x === 0 || (cx2 > 0 && cx2 * cx2 + cy2 * cy2 > (r - 1) * (r - 1)), dark = y === h - 1 || x === w - 1;
      let col = y < cap ? (y === 0 ? '#b8bccb' : '#6a6e7c') : y < w0 ? '#d8582e' : y < w1 ? '#ffd890' : '#b8401e';
      if(y >= w0 && y < w1){ if(x === 0 || x === w - 1 || y === w0 || y === w1 - 1) col = '#2a1a1c'; else if(h >= 14 && (x === Math.round(w / 2))) col = '#5a3a2a'; else if(y === w0 + 1) col = '#fff4d0'; }
      if(y >= cap && (y < w0 || y >= w1)){ if(edgeL) col = '#f08050'; if(dark) col = '#5a1810'; }
      px(x, y, col); }
    return S[k] = c; }
  const PUF = [4, 6, 9, 13, 18, 26, 36, 50];
  // spray, not cloud: a white foam core with a broken edge that tears into claws, a blue-grey shadow side, and a fringe of loose droplets
  // round it (Hokusai's wave: the water breaks into fingers, then into dots)
  function pufSpr(si, v){ const k = 'puf' + si + '_' + v; if(S[k]) return S[k]; const d = PUF[si], c = document.createElement('canvas'); c.width = d; c.height = d; const g = c.getContext('2d');
    let sd = 11 + si * 7 + v * 131; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const r0 = d / 2;
    const lobes = [[0, r0 * .1, .62]]; for(let j = 0; j < 5; j++){ const a = rnd() * 6.283; lobes.push([Math.cos(a) * r0 * .38, Math.sin(a) * r0 * .3 - r0 * .08, .3 + rnd() * .22]); }
    const fing = []; for(let j = 0; j < 5; j++){ const a = -Math.PI / 2 + (rnd() - .5) * 2.6; fing.push([a, .55 + rnd() * .4]); }
    for(let y = 0; y < d; y++) for(let x = 0; x < d; x++){ const dx = x + .5 - r0, dy = y + .5 - r0; let best = -1e9, lit = 0;
      for(const [ox, oy, rf] of lobes){ const ex = dx - ox, ey = dy - oy, rr = r0 * rf, q = 1 - (ex * ex + ey * ey) / (rr * rr); if(q > best){ best = q; lit = (-ex - ey) / (rr * 1.4); } }
      // claws: thin fingers of water torn out of the top of the mass
      if(best < 0){ const ang = Math.atan2(dy, dx), rad = Math.hypot(dx, dy) / r0; for(const [fa, fl] of fing){ let da = Math.abs(ang - fa); if(da > Math.PI) da = 6.283 - da; if(da < .12 * (1 - rad * .5) && rad < fl + .4 && rad > .35){ best = .05; lit = .6; } } }
      if(best < 0){ if(d >= 9 && rnd() < .035 && Math.hypot(dx, dy) < r0 * 1.02){ g.fillStyle = rnd() < .5 ? '#e8f6ff' : '#9ac4ec'; g.fillRect(x, y, 1, 1); } continue; }
      const t = lit * .9 + best * .4; g.fillStyle = t > .5 ? '#ffffff' : t > .22 ? '#e2f2fc' : t > -.05 ? '#a8cce8' : '#6a94c4'; g.fillRect(x, y, 1, 1); }
    return S[k] = c; }

  // ---------------------------------------------------------------- the plan of one visit
  function newPlan(L, o){ return { H:L.H, L, o, s:-1, on:false, done:false, cut:null, st:{ z:L.H, x:o.x, h:6.4 + 1.35, yaw:.5, roll:0, rot:.3, mode:0, broken:0, lost:new Set(), swing:0, lights:1, free:true }, rows:null, P:[], puffs:[], dist:0, lastS:0, splashT:-1, ring:-1, sparkT:0, cab:0, crashes:0 }; }
  W0.place = (i, s, L) => { for(const p of plans) if(i >= p.H + T0 - 20 && i <= p.H + T0 + 600){ s.skRes = 1; break; }   // (our span: skill.js puts no kicker ramp in it)
    if(!L || L.key !== 'minato' || !E()) return; const V = E()._visit(i); if(!V || !V.set || i !== V.H - 300) return; if(plans.some(p => p.H === V.H)) return;
    const o = E().wheelOf(V); if(!o) return; if(DIR && !DIR.request('wheel', { seg:V.H + T0, visit:V.B0, road:'minato' })) return; plans.push(newPlan(V, o)); };
  // (the engine builds the first stretch of road before mech('reset') runs: plans for segments already placed are made again here)
  W0.reset = () => { for(const p of plans) if(p.o) p.o.gone = false; plans.length = 0; cur = null; Tg = 0;
    if(typeof segs !== 'undefined') for(let i = 0; i < segs.length; i++){ const sg = segs[i]; if(sg) W0.place(i, sg, LANDS[sg.land]); } };

  // ---------------------------------------------------------------- the wheel's path, as a function of s
  const WR = 6.4;
  function lead(s){ return s < BRK ? 260 - s : s < ALG ? 200 - 65 * sm((s - BRK) / (ALG - BRK)) : s < VEER ? 135 : 135 + 70 * sm((s - VEER) / (SPLS - VEER + 40)); }   // (alongside: the hub ~135 ahead, so the whole wheel stands in the right half of the screen)
  const gz = (p, s) => p.H + s - 260 + lead(s);   // the hub's segment
  function xAt(s){ return s < BRK ? 10 : s < ALG ? 10 - 6.2 * sm((s - BRK) / (ALG - BRK)) : s < VEER ? 3.6 + .25 * Math.sin((s - ALG) / 30) : 3.6 + 10 * sm((s - VEER) / (SPLS - VEER)); }
  function pose(p, s){ const st = p.st, z = gz(p, s), x = xAt(s), z2 = gz(p, s + 2), x2 = xAt(s + 2), dx = x2 - x, dz = (z2 - z) / 10, len = Math.hypot(dx, dz) || 1;
    let yaw = Math.atan2(dz / len, dx / len); if(yaw > Math.PI / 2) yaw -= Math.PI; if(yaw < -Math.PI / 2) yaw += Math.PI;   // the plane is the same either way round
    if(s < BRK){ const t = sm((s - 12) / 40); yaw = .5 + (yaw - .5) * t; }
    st.z = z; st.x = x; st.yaw = yaw;
    // the hub's height: off the axle (it drops and bounces), then on its rim; it sits lower in the water; toppling at the end
    const qx = E().qx(Math.floor(z)), wet = x > qx + .25; let h = WR + (wet ? -.3 : 0);
    if(s < 18) h = WR + 1.35 - 1.65 * (s / 18) * (s / 18); else if(s < 42) h = WR - .3 + .55 * Math.sin((s - 18) / 24 * Math.PI);
    st.roll = s < VEER ? .08 * Math.sin(s / 40) : -.22 * sm((s - VEER) / 60) - 1.35 * sm((s - SPLS + 10) / 70);
    st.sink = sm((s - SPLS) / 120); h -= st.sink * 2.2 + Math.max(0, -Math.sin(st.roll)) * 0;
    st.h = h; st.wet = wet; return st; }

  // ---------------------------------------------------------------- particles (world space: z segments, x and h half-road widths)
  const PMAX = 520;
  function emit(p, kind, z, x, h, n, sp){ for(let k = 0; k < n && p.P.length < PMAX; k++){ const a = Math.random() * 6.283, v = sp * (.4 + Math.random() * .8);
      p.P.push({ kind, z, x, h, vz:Math.cos(a) * v * 6, vx:Math.sin(a) * v, vh:(kind === 1 ? 1.2 : 1.6) * (.4 + Math.random()) * sp, life:kind === 1 ? .6 + Math.random() * .8 : 1 + Math.random() * 1.2, t:0 }); } }
  function stepP(p, dt){ const g = 2.2; for(let k = p.P.length - 1; k >= 0; k--){ const q = p.P[k]; q.t += dt; q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.vh -= g * dt * (q.kind === 1 ? 1.4 : 1);
      if(q.h < 0){ if(q.kind === 1 && q.vh < -1){ q.h = 0; q.vh *= -.35; q.vx *= .6; } else q.h = 0; } if(q.t > q.life) p.P.splice(k, 1); }
    for(let k = p.puffs.length - 1; k >= 0; k--){ const q = p.puffs[k]; q.t += dt; q.h += q.vh * dt; q.x += q.vx * dt; q.z += q.vz * dt; q.vh -= 2.6 * dt; q.vh *= 1 - .2 * dt; q.r += q.gr * dt * (q.vh > 0 ? 1 : .4); if(q.h < 0){ q.h = 0; q.vh = 0; q.gr = 1.4; } if(q.t > q.life) p.puffs.splice(k, 1); } }

  // ---------------------------------------------------------------- the cabins thrown onto the road
  function planRows(p){ const rows = [], base = p.H + T0; let open = 1; let n = 0;
    for(const [sl, cnt] of ROWS){ let xs; if(cnt === 1){ const k = H1(p.H + n * 3.1) < .65 ? open : Math.floor(H1(p.H + n * 5.3) * 3); xs = [k]; open = k === 1 ? (H1(p.H + n * 2.9) < .5 ? 0 : 2) : 1; }
      else { if(H1(p.H + n * 4.3) < .6) open = open === 1 ? (H1(p.H + n * 6.1) < .5 ? 0 : 2) : 1; xs = [0, 1, 2].filter(k => k !== open); }
      rows.push({ j:base + sl, ds:xs.map(k => ({ x:LANES[k], st:0, t0:0, fly:.75, ghost:false, hit:false, landT:-1, z0:0, x0:0, h0:0, rot:H1(p.H + n * 7 + k) * 4 | 0 })), open, st:0 }); n++; }
    return rows; }
  function reachTo(x0, xt, s0, s1){ const dir = Math.sign(xt - x0); if(!dir) return 0; let x = x0; for(let i = Math.floor(s0); i < s1; i++){ const sg = segs[i]; if(!sg) break; const c = sg.curve || 0, st = i - s0 < REACT ? 0 : dir * .85; x += (st - c * .3 * .5) * 2 / 55; if((x - xt) * dir >= 0) return Math.abs(xt - x0); } return Math.max(0, (x - x0) * dir); }
  function launch(p, row, ps){ row.st = 1; const live = () => row.ds.filter(d => !d.ghost);
    for(let guard = 0; guard < 3; guard++){ const xs = live().map(d => d.x); let best = null, bd = 1e9; for(const lx of LANES){ if(xs.some(x => Math.abs(x - lx) < .4)) continue; const dd = Math.abs(lx - playerX); if(dd < bd){ bd = dd; best = lx; } }
      if(best === null) best = playerX; const need = Math.abs(best - playerX), reach = reachTo(playerX, best, ps, row.j - HIT_L); if(need <= reach + 1e-6 || !live().length) break;
      const d = live().sort((a, b) => Math.abs(a.x - playerX) - Math.abs(b.x - playerX))[0]; d.ghost = true; d.x = 1.75 + H1(row.j) * .4; }
    const st = p.st; row.ds.forEach((d, k) => { d.st = 1; d.t0 = Tg + k * .14; d.fly = .75 + k * .06; const a = st.rot + (k + 1) * .9; d.z0 = st.z - Math.sin(st.yaw) * 0 + Math.sin(a) * 3; d.x0 = st.x - .3; d.h0 = st.h + WR * .8; p.st.lost.add((p.cab++ * 7) % 60); });
    clank(1); }
  // a row never lands on a landmark jump's approach, flight or landing (setpiece/jump.js marks those segments spjP), nor at a checkpoint
  // gate: those rows are simply not thrown
  const busyAt = j => { for(let k = j - 30; k <= j + 30; k++){ const t = segs[k]; if(t && (t.spjP || t.skR)) return true; } for(const g of gates) if(Math.abs(g - j) < 14) return true; return false; };
  function rowsUpdate(p, ps){ if(!p.rows) return; for(const row of p.rows){ if(!row.st){ if(row.j - ps <= DL){ if(busyAt(row.j)){ row.st = 2; row.ds.length = 0; continue; } launch(p, row, ps); } else continue; }
      for(const d of row.ds){ if(d.st === 1 && Tg >= d.t0 + d.fly){ d.st = 2; d.landT = Tg; if(row.j - ps < 160){ clank(1.3); boom(.35); if(!reduce){ if(p.cut) p.cut.hit(2.5); } } emit(p, 1, row.j, d.x, .15, reduce ? 8 : 22, 1.6); }
        if(d.st === 2 && !d.ghost && !d.hit && state === 'play' && cool <= 0 && AIR.h < 6 && Math.abs(ps - row.j) < HIT_L && Math.abs(playerX - d.x) < HIT_R){ d.hit = true; p.crashes++; crash({ x:d.x, z:row.j * SEG }); if(typeof floatText === 'function') floatText('CRUSHED', W / 2, H * .45, 30, '#ff8ad8'); } } } }

  // ---------------------------------------------------------------- update
  W0.update = dt => { Tg += dt; if(!E()) return; const ps = pSeg(); cur = null;
    for(const p of plans){ if(p.done) continue; const s = ps - (p.H + T0); if(s < -40) continue; if(s > END){ p.done = true; if(p.o) p.o.gone = true; if(p.cut){ p.cut.end(); p.cut = null; } continue; } cur = p;
      if(s < 0 || state !== 'play' && !p.on) continue;
      if(!p.on){ p.on = true; p.o.gone = true; p.rows = planRows(p); groan(); boom(.8); p.lastS = 0;
        if(DIR && DIR.cine){ let card = CARD; if(MECH.cutin && MECH.cutin.show){ let shown = false; try{ shown = MECH.cutin.show('wheel') !== false; }catch(e){} if(shown) card = null; }
          p.cut = DIR.cine({ letterbox:{ top:.1, bottom:.06 }, duck:.4, shake:reduce ? 0 : 5, guard:{ from:p.H + T0 - 10, to:p.H + T0 + END }, dur:0, card }); }
        const st = pose(p, 0); emit(p, 1, st.z, st.x, st.h, reduce ? 60 : 160, 2.4); }
      const pz = p.st.z, px = p.st.x, pyaw = p.st.yaw, st = pose(p, Math.max(0, s)), ds = Math.max(0, s - p.lastS); p.lastS = Math.max(p.lastS, s); p.dist += ds;
      // Kellan 2026-11-24: it rolled the wrong way and at the wrong speed. The spin follows the hub's own ground travel along the rim's
      // plane (rolling without slip: x and r in half-road widths, z/10 likewise), not the rider's progress; and when pose() turns the
      // plane half a turn (yaw folds to +-pi/2) the angle is mirrored with it, so the spokes, gaps and lights don't jump or run backwards
      if(Math.abs(st.yaw - pyaw) > Math.PI / 2) st.rot = Math.PI - st.rot;
      { const tr = (st.x - px) * Math.cos(st.yaw) + (st.z - pz) / 10 * Math.sin(st.yaw); if(s >= 42 && s < SPLS + 10 && Math.abs(tr) < WR) st.rot -= tr / WR * (1 - st.sink); else if(s < 42) st.rot -= ds * .02 / (WR * 10) * 6.283 * .5; } st.broken = s < BRK ? .55 : s < SPLS ? .3 : .3 + .7 * st.sink; st.clock = s < 20 ? '88:88' : '--:--'; st.swing = s < BRK ? .2 : .55; st.lights = 1 - sm((s - SPLS) / 140);
      // the rim's contact: spray in the water, sparks on stone
      const cz = st.z, cxp = st.x; p.sparkT -= dt;
      if(s > 16 && s < SPLS + 20 && p.sparkT <= 0){ p.sparkT = reduce ? .08 : .03; if(st.wet) emit(p, 2, cz, cxp, .1, reduce ? 2 : 5, 1.5); else emit(p, 1, cz, cxp, .05, reduce ? 2 : 6, 1.3); }
      if(s >= 16 && s < 20 && !p.thud1){ p.thud1 = true; boom(1); if(p.cut && !reduce) p.cut.hit(6); for(let k = 0; k < (reduce ? 6 : 14); k++) p.puffs.push({ z:cz + (Math.random() - .5) * 20, x:cxp + (Math.random() - .5) * 2, h:.2, vh:1 + Math.random() * 1.6, vx:(Math.random() - .5) * .8, vz:(Math.random() - .5) * 6, r:.5, gr:.5, t:0, life:1.4 + Math.random(), v:k % 3 }); }
      if(s > BRK && s < ALG && st.wet && Math.random() < (reduce ? .1 : .35)) p.puffs.push({ z:cz + (Math.random() - .5) * 8, x:cxp + (Math.random() - .5), h:.1, vh:.8 + Math.random(), vx:-.3 - Math.random() * .5, vz:(Math.random() - .5) * 3, r:.35, gr:.6, t:0, life:1 + Math.random() * .6, v:Math.floor(Math.random() * 3) });
      // the splash: the wheel lands flat on the water
      if(s >= SPLS + 20 && p.splashT < 0){ p.splashT = Tg; whoosh(1.4); boom(1.2); if(p.cut) p.cut.hit(reduce ? 0 : 8);
        // the column: a tall tower of spray thrown straight up where the hub goes in, crowned with a mushrooming head (Hokusai: claws, then dots)
        for(let k = 0; k < (reduce ? 14 : 30); k++){ const f = k / 30; p.puffs.push({ z:cz + (Math.random() - .5) * 14, x:cxp + (Math.random() - .5) * 1.4, h:.2 + f * 2, vh:3.2 + f * 5.2 + Math.random(), vx:(Math.random() - .5) * .5, vz:(Math.random() - .5) * 3, r:.7 + f * .9, gr:.5 + f * .6, t:0, life:3 + Math.random() * 1.2, v:k % 3 }); }
        // the skirt: low walls of spray all round the rim as it slaps the water
        for(let k = 0; k < (reduce ? 10 : 26); k++){ const a = k / 26 * 6.283, r = WR * (.8 + Math.random() * .3); p.puffs.push({ z:cz + Math.sin(a) * r * 10, x:cxp + Math.cos(a) * r, h:.1, vh:1.4 + Math.random() * 1.8, vx:Math.cos(a) * .6, vz:Math.sin(a) * 3, r:.5 + Math.random() * .5, gr:.7, t:0, life:2 + Math.random(), v:k % 3 }); }
        emit(p, 2, cz, cxp, .3, reduce ? 60 : 180, 3.2); p.ring = Tg;
        // the jet: droplets thrown nearly straight up out of the column, falling back as rain on the water
        for(let k = 0; k < (reduce ? 50 : 160) && p.P.length < PMAX; k++){ const a = Math.random() * 6.283, sp = Math.random(); p.P.push({ kind:2, z:cz + (Math.random() - .5) * 16, x:cxp + (Math.random() - .5) * 1.6, h:.4 + Math.random() * 2, vz:Math.cos(a) * 4 * sp, vx:Math.sin(a) * .7 * sp, vh:4 + Math.random() * 6, life:2.4 + Math.random() * 1.6, t:0 }); }
        if(DIR && DIR.done) DIR.done('wheel');
        { const A = MECH.arrival; try{ if(A && A.callout) A.callout('SPLASHDOWN', { kanji:'着水', sub:'観覧車', col:'#ff8ad8', size:'m', hold:.6 }); }catch(e){} } }
      if(p.splashT >= 0 && Tg - p.splashT > 2.6 && p.cut){ p.cut.end(); p.cut = null; }
      rowsUpdate(p, ps); stepP(p, dt); } };

  // ---------------------------------------------------------------- drawing
  const live = () => cur && cur.on && !cur.done ? cur : null;
  W0.drawBackdrop = o => { const p = live(); if(!p || !E()) return; E().wheel.refl(p.st, o.now); };
  function farZ(st){ return st.z + Math.abs(Math.sin(st.yaw)) * WR * 10 + 2; }
  W0.drawSeg = (s, sx0, sy0, uw, fog, now) => { const p = live(); if(!p) return; const en = E(), BI = en.BI(), NN = en.nearN(), anchor = Math.max(BI + 1, Math.min(Math.floor(farZ(p.st)), BI + NN));
    // the cabins in flight and on the road: each at its own segment
    if(p.rows) for(const row of p.rows) for(const d of row.ds){ if(d.st === 0) continue; drawCabin(p, row, d, s, now); }
    // the wheel in depth bands of BAND segments, each drawn at its own place in the depth order, so the lamps, boats and cabins nearer
    // than a part of the wheel draw over it and those beyond it are hidden by it (one band per call; the bands past NN go in one, farthest)
    const st = p.st, zmin = st.z - Math.abs(Math.sin(st.yaw)) * WR * 10 - 3, zmax = farZ(st), i = s.index;
    if(i > anchor || i < BI + 1) return;
    const b0 = i === BI + 1 ? -1e9 : i, b1 = i === anchor ? 1e9 : (i % BAND === 0 ? Math.min(i + BAND, anchor) : -1);
    if(b1 < 0 && i !== BI + 1) return; if(i === BI + 1 && zmin > BI + 1 + BAND) return;
    const hiZ = i === anchor ? 1e9 : i === BI + 1 ? Math.min(anchor, Math.ceil((BI + 2) / BAND) * BAND) : b1; if(hiZ <= zmin && i !== anchor) return;
    st.zlo = b0; st.zhi = hiZ; en.wheel.draw(st, now, 0); st.zlo = st.zhi = undefined;
    if(i === anchor) drawParticles(p, now); };
  const BAND = 10;
  function drawCabin(p, row, d, s, now){ const en = E(), P = en.P; let z, x, h, rot = d.rot;
    if(d.st === 1){ const t = clamp((Tg - d.t0) / d.fly, 0, 1), zb = row.j - 6; if(t <= 0) return;
      // flies from the wheel to a first bounce a few segments short, then hops onto its spot
      if(t < .8){ const u = t / .8; z = lerp(d.z0, zb, u); x = lerp(d.x0, d.x, u); h = lerp(d.h0, 0, u) + Math.sin(u * Math.PI) * 2.4; rot = (d.rot + Math.floor(u * 6)) % 4; }
      else { const u = (t - .8) / .2; z = lerp(zb, row.j, u); x = d.x; h = Math.sin(u * Math.PI) * .45; rot = (d.rot + 1) % 4; } }
    else { z = row.j; x = d.x; h = 0; rot = (d.rot + 1) % 4 | 1; }
    if(Math.floor(z) !== s.index) return; if(z - en.camSeg() < .6) return;
    // the ring: where it will lie (until it has landed); its shadow
    if(d.st === 1 && !d.ghost){ en.pj(row.j, d.x, 0); const cx0 = P.x, cy0 = P.y, ru = P.u, pul = reduce ? 1 : .75 + .25 * Math.sin(Tg * 9); cx.fillStyle = typeof ASSIST !== 'undefined' && ASSIST.contrast ? '#ffe000' : '#ffb050'; cx.globalAlpha = .85 * pul;
      for(let k = 0; k < 18; k++){ const a = k / 18 * 6.283; cx.fillRect(snp(cx0 + Math.cos(a) * ru * .3), snp(cy0 + Math.sin(a) * ru * .07), Math.max(PX, snp(ru * .04)), PX); } cx.globalAlpha = 1;
      const sh = clamp(1 - h / 3, .2, 1); cx.fillStyle = 'rgba(0,0,0,.35)'; en.pj(z, x, 0); cx.fillRect(snp(P.x - P.u * .2 * sh), snp(P.y - PX), Math.max(PX, snp(P.u * .4 * sh)), PX * 2); }
    en.pj(z, x, h); const hp = P.u * .5; if(hp < PX) return; let si = 0; while(si < CAB.length - 1 && CAB[si + 1] <= hp / PX * 1.1) si++;
    // near the camera the cabin is real geometry (never an upscaled sprite): a shell lying on its side, its window band, its roof cap
    if(hp > CAB[CAB.length - 1] * PX * 1.6 && d.st === 2){ cabinGeo(row.j, d.x, en); }
    else { const spr = cabSpr(si, rot), k = hp / CAB[si]; blit(spr, P.x, P.y, k); }
    if(d.st === 2 && Tg - d.landT < 1.2 && !reduce){ glow(P.x, P.y - hp * .3, hp * .8, '#ffb050', .3 * (1 - (Tg - d.landT) / 1.2)); } }
  // a wrecked cabin lying across its lane, as geometry: the shell's side toward you with its band of windows still lit, the roof cap on its
  // end, the upper side catching the light, a dark shadow under it
  function cabinGeo(z, x, en){ const q = (z1, x1, h1, z2, x2, h2, z3, x3, h3, z4, x4, h4, c) => en.wq(z1, x1, h1, z2, x2, h2, z3, x3, h3, z4, x4, h4, c), L = 2.6, w = .26, hh = .3;
    q(z - .3, x - w - .05, 0, z - .3, x + w + .05, 0, z + L, x + w + .05, 0, z + L, x - w - .05, 0, '#0c0a10');
    q(z, x - w, hh, z, x + w, hh, z + L, x + w, hh, z + L, x - w, hh, '#e8703e');
    q(z, x - w, 0, z, x + w, 0, z, x + w, hh, z, x - w, hh, '#b8401e');
    q(z, x - w * .86, hh * .28, z, x + w * .7, hh * .28, z, x + w * .7, hh * .74, z, x - w * .86, hh * .74, '#2a1a1c');
    q(z, x - w * .8, hh * .34, z, x + w * .64, hh * .34, z, x + w * .64, hh * .68, z, x - w * .8, hh * .68, '#ffc870');
    q(z, x - w * .8, hh * .62, z, x + w * .64, hh * .62, z, x + w * .64, hh * .68, z, x - w * .8, hh * .68, '#fff0c0');
    q(z, x + w * .76, hh * .1, z, x + w, hh * .1, z, x + w, hh * .9, z, x + w * .76, hh * .9, '#8a8e9c');
    q(z, x - w, hh - .03, z, x + w, hh - .03, z, x + w, hh, z, x - w, hh, '#f89a64'); }
  function drawParticles(p, now){ const en = E(), P = en.P, cs = en.camSeg();
    for(const q of p.puffs){ if(q.z - cs < .8) continue; en.pj(q.z, q.x, q.h); const d = q.r * P.u / PX; if(d < 1) continue; let si = 0; while(si < PUF.length - 1 && PUF[si + 1] <= d * 1.1) si++; const spr = pufSpr(si, q.v), k = q.r * P.u / PUF[si];
      cx.globalAlpha = clamp(1.4 - q.t / q.life * 1.4, 0, 1) * .95; blit(spr, P.x, P.y + spr.height * k / 2, k); } cx.globalAlpha = 1;
    for(const q of p.P){ if(q.z - cs < .6) continue; en.pj(q.z, q.x, q.h); const a = clamp(1 - q.t / q.life, 0, 1); if(q.kind === 1){ cx.fillStyle = a > .6 ? '#fff4c0' : a > .3 ? '#ffb040' : '#c85020'; cx.fillRect(snp(P.x), snp(P.y), PX, PX); if(P.u > PX * 6 && !reduce){ cx.fillRect(snp(P.x - q.vx * P.u * .03), snp(P.y + q.vh * P.u * .03), PX, PX); } }
      else { cx.fillStyle = a > .5 ? '#e8f4ff' : '#9ab8e0'; cx.globalAlpha = .4 + .6 * a; cx.fillRect(snp(P.x), snp(P.y), PX, P.u > PX * 8 ? PX * 2 : PX); cx.globalAlpha = 1; } }
    // the ring of foam spreading from the splash
    if(p.ring >= 0) for(const dl of [0, .55, 1.25]){ const t = Tg - p.ring - dl; if(t > 0 && t < 4){ const st = p.st, rr = WR * (.6 + t * (dl ? 1.3 : .9)), al = clamp(1 - t / 4, 0, 1); cx.fillStyle = '#d8ecff'; cx.globalAlpha = .7 * al;
        for(let k = 0; k < 64; k++){ const a = k / 64 * 6.283; en.pj(st.z + Math.sin(a) * rr * 10, st.x + Math.cos(a) * rr, 0); if(P.z < SEG) continue; cx.fillRect(snp(P.x), snp(P.y), Math.max(PX, snp(P.u * (dl ? .15 : .25))), PX); } cx.globalAlpha = 1; } } }
  // the break's light: a hard white-orange bloom at the hub for a moment (never under reduced motion), and a spray mist at the splash
  W0.overlay = (now, sk) => { const p = live(); if(!p) return; const s = pSeg() - (p.H + T0); if(s > 0 && s < 14 && !reduce){ const en = E(); en.pj(p.st.z, p.st.x, p.st.h); glow(en.P.x, en.P.y, Math.max(PX * 6, en.P.u * 2), '#ffd0a0', .4 * (1 - s / 14)); }
    if(p.splashT >= 0){ const t = Tg - p.splashT; if(t < 3){ cx.fillStyle = ditherPat('#c8dcf0', .125); cx.globalAlpha = .5 * (1 - t / 3); cx.fillRect(W * .5, snp(HZ - H * .1), W * .5, snp(H * .2)); cx.globalAlpha = 1; } } };

  W0.warm = () => { for(let si = 0; si < CAB.length; si++) for(let r = 0; r < 4; r++) cabSpr(si, r); for(let si = 0; si < PUF.length; si++) for(let v = 0; v < 3; v++) pufSpr(si, v);
    try{ cx.save(); cx.globalAlpha = .004; for(const k in S) cx.drawImage(S[k], 0, 0, 1, 1); cx.restore(); }catch(e){} };
  W0.S = S; W0.plans = plans; W0.debug = () => { const p = cur; return p ? { H:p.H, s:pSeg() - (p.H + T0), st:p.st, rows:p.rows && p.rows.map(r => [r.j, r.ds.map(d => d.ghost ? 'w' : d.x).join('/'), r.st]), crashes:p.crashes, P:p.P.length } : null; };
})();
