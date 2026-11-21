/* Sundown set piece: 大画面 SCREENFALL on Shuto C1 (MECH.sp_screen, director id 'screenfall', hero tier). See setpiece/README.md.
   Load after env/shuto.js and the other set pieces:   <script src="setpiece/screenfall.js"></script>

   A giant bulb-matrix screen (an 80s 大型ビジョン, the kind Alta and Ginza hung on their towers) hangs across the expressway from a
   sky-bridge between two towers, playing the late news to the traffic below. Its picture tears, the hangers on one side snap in a storm of
   sparks, it swings down on the other side's hangers like a broken sign and slams its low corner into the deck. You ride round its corner
   on the side that snapped, through the one lane it leaves open, under the hanging slab of dead bulbs.

   Beats, all driven by the rider's distance d to the screen's segment A (never by the clock); all inside the 360-segment draw distance:
     d -420          an amber 落下物注意 (falling objects) board on a gantry
     d -600          the card (the cut-in, or the director's 大画面 SCREENFALL card) as a heads-up, before the screen is in view (it waits
                     while you are airborne), and the director's guard (traffic moved off the zone)
     d -360          the sky-bridge and its screen come into view over the road, playing the news ticker
     d -335          telegraph: the picture tears (glitch bands, then colour bars, then static), sparks from the hangers, a crack
     d -250          the first hanger goes: the screen lurches six degrees and hangs, sparking, creaking
     d -195 .. -95   the second goes: it swings down, gravity-eased, the torn picture still playing; a small KEEP LEFT / RIGHT callout at -195
     d -95           its low corner hits the deck just past the centre line: a crash, sparks and glass, shake; the picture dies
     d 0             you pass it: round the corner, under the open sky on the snapped side
   Fairness (kikubari): at rest the slab lies above a rider's height (0.42 half-road widths) only beyond its corner, so exactly one lane,
   the snapped side's outer lane, is open (u >= 0.42, 0.58 half-road widths wide), and the callout names it. It starts to fall 195 segments
   before you reach it (the callout), lands 95 before (about 1.7 s at top speed); a full lane change takes about 45 segments. Traffic is
   moved off the zone (the director's guard) and hazards are swept. One crash at most per event; the recovery blink protects as always.
   No slow motion.
   References (inspected): night photos of Shiodome and Nishi-Shinjuku (towers lit floor by floor), C1 at Ginza and Kyobashi (the deck
   between walls, overpasses spanning it). From memory, not inspected: Studio Alta's screen in Shinjuku (1980); the sky-bridges and the
   billboards of Akira's Neo-Tokyo; Burnout 3's crash junctions (a big object you read early and steer round).
   Reduced motion: no shake, no glitch flicker (the picture changes at most every 380 ms, the static is a still pattern), fewer sparks. */
"use strict";
(() => {
  const DIR = MECH.director, CARD = { kanji:'大画面', name:'SCREENFALL', sub:'ride round its corner', col:'#ff4ad0' };
  if(DIR) DIR.register('screenfall', { tier:'hero', roads:['shuto'], card:CARD });
  // the screen, in half-road widths: top corners at x = +-SW, height HT; SH tall; hung from a sky-bridge at BR0..BR1 between towers at +-TX
  const SW = 2.6, HT = 6.0, SH = 4.17, BR0 = 6.4, BR1 = 7.1, TX = 3.2, NU = 28, NV = 14, CLR = .42;   // (SH is chosen so the corner lands at the centre line + 0.3)
  const CRD = -600, TEL = -335, LURCH = -250, FALL0 = -195, LAND = -95, BOARD = 420;   // the card (up to ~3.5 s) plays before the screen is even in view: it must never cover the hazard
  const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const pSeg = () => (position + PZ) / SEG;
  let rs = 7; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;   // the sparks' own generator (the road's Math.random sequence stays untouched)
  const plans = [];
  const S = { board:null };
  // ---------------------------------------------------------------- the geometry of the swing (in the screen's own plane, facing the road)
  // F: the side whose hangers snap (+1 right). The screen turns about its other top corner P = (-F SW, HT); a = 0 hanging .. A_REST lying.
  // corners in the order TL, TR, BR, BL as seen with F = +1 (mirrored for F = -1)
  const CN = new Float64Array(8);
  function corners(F, a){ const px = -F * SW, ph = HT, c = Math.cos(a), s = Math.sin(a);
    const L = [[-SW, HT], [SW, HT], [SW, HT - SH], [-SW, HT - SH]];
    for(let k = 0; k < 4; k++){ const vx = F * L[k][0] - px, vy = L[k][1] - ph, rx = vx * c + F * vy * s, ry = -F * vx * s + vy * c; CN[k * 2] = px + rx; CN[k * 2 + 1] = ph + ry; } return CN; }
  // the rest angle: the snapped side's lower corner touches the road
  let A_REST = 0; { for(let k = 0; k < 2000; k++){ const a = k / 2000 * 1.2; corners(1, a); if(CN[5] <= .02){ A_REST = a; break; } } }
  // the height of the slab's underside above lane x (side F), or 99 where it is not over the road
  function hAt(F, a, x){ corners(F, a); const cx0 = CN[4], cy0 = CN[5], bx = CN[6], by = CN[7]; const lo = Math.min(cx0, bx), hi = Math.max(cx0, bx); if(x < lo || x > hi) return 99;
    return cy0 + (by - cy0) * (x - cx0) / (bx - cx0); }
  // ---------------------------------------------------------------- the picture: cells of palette indices
  const PAL = ['#141424', '#0c1a5a', '#1e3aa8', '#f4f6ff', '#ffd84a', '#e8203a', '#2adf80', '#4ff0ff', '#ff4ad0', '#ffffff', '#7a7a86', '#3a3a46', '#ff8a2a', '#0a0a12'];
  function buildFrames(){ const T = S.T || (S.T = document.createElement('canvas')); T.width = 400; T.height = 24; const k = T.getContext('2d');   // (one canvas, made in warm; the font's arrival repaints it)
    k.fillStyle = '#000'; k.fillRect(0, 0, 400, 24); k.font = '16px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#fff'; k.fillText('ニュース速報 首都高 今夜 快晴 東京 23:41 ', 2, 2);
    const d = k.getImageData(0, 0, 400, 24).data, rows = 7, tick = new Uint8Array(400 * rows); for(let y = 0; y < rows; y++) for(let x = 0; x < 400; x++){ let on = 0; for(let q = 0; q < 2; q++){ const o = ((y * 2 + q + 2) * 400 + x) * 4; if(d[o] > 110) on = 1; } tick[y * 400 + x] = on; }
    let w = 0; for(let x = 399; x > 0; x--){ let any = 0; for(let y = 0; y < 24; y++) if(d[(y * 400 + x) * 4] > 110){ any = 1; break; } if(any){ w = x + 24; break; } }
    S.tick = tick; S.tickW = Math.max(60, w); S.rows = rows;
    const bars = new Uint8Array(NU * NV), stat = new Uint8Array(NU * NV), BC = [9, 4, 7, 6, 8, 5, 2];
    for(let v = 0; v < NV; v++) for(let u = 0; u < NU; u++){ bars[v * NU + u] = v < 8 ? BC[Math.floor(u / NU * 7)] : (u / NU < .3 ? 2 : u / NU < .6 ? 9 : 13); const h = hash(u * 7.1 + v * 13.3); stat[v * NU + u] = h < .3 ? 10 : h < .55 ? 11 : h < .62 ? 9 : 13; }
    S.bars = bars; S.stat = stat; }
  // the colour index of cell (u, v) (v = 0 at the top): g 0 ticker, 1 tearing, 2 bars, 3 static, 4 dead
  function cell(w, u, v, now){ const g = w.g;
    if(g === 4){ const h = hash(u * 3.1 + v * 7.7 + w.A); return h < .06 ? (hash(u + v * 9.1) < .5 ? 5 : 12) : h < .2 ? 1 : h < .3 ? 11 : 13; }
    if(g === 3) return S.stat[v * NU + u];
    if(g === 2) return S.bars[v * NU + u];
    let off = 0; if(g === 1){ const band = Math.floor(v / 3), st = reduce ? 0 : Math.floor(now / 380); off = Math.floor(hash(band * 5.3 + st * 1.7) * 30) - 15; if(hash(band + st * 3.3) < .25) return S.bars[v * NU + u]; }
    if(v < 2) return u % 8 < 5 ? 5 : 3;   // the red 速報 strip on top
    if(v >= NV - 2) return 2;
    const r = v - 3; if(r < 0 || r >= S.rows) return 1; const x = Math.floor(u + (reduce ? Math.floor(now / 500) * 2 : now / 110) + off); return S.tick[r * 400 + ((x % S.tickW) + S.tickW) % S.tickW] ? 3 : 1; }
  // ---------------------------------------------------------------- sound
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function crack(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.08, 3200, .14, t0); M.noise(.3, 1200, .1, t0 + .02); M.tone(90, .5, { type:'square', v:.04, at:t0 }); }
  function sizzle(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.9, 4200, .05 * v, t0); M.noise(.5, 2400, .04 * v, t0 + .1); }
  function creak(){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(140, 1.1, { type:'sawtooth', v:.035, at:t0, fuzz:true }); M.tone(118, .9, { type:'sawtooth', v:.03, at:t0 + .25, fuzz:true }); }
  function slam(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.4, 90, .24, t0); M.tone(42, .8, { type:'sine', v:.14, at:t0 }); M.noise(.6, 2600, .12, t0 + .03); M.noise(1.2, 5200, .06, t0 + .1); }
  function hum(){ if(!ac()) return; const t0 = M.ac.currentTime; M.tone(60, 1.6, { type:'sawtooth', v:.02, at:t0 }); }
  // ---------------------------------------------------------------- placement: once per Shuto visit, on plain deck (canyon or towers)
  function plan(i, s, L){ if(!L || L.key !== 'shuto' || LANDS[s.land].key !== 'shuto') return; const ls = typeof landStart === 'number' ? landStart : 0; if(i - ls !== 200) return;
    const E = ENV.shuto; if(!E || !E.zoneAt) return; const z = zoneOfSeg(i), zEnd = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9;
    // a zone that has not begun yet may be given up for the screen's stretch (E.claim turns it to canyon); one already being placed may not
    const plain = j => { const Z = E.zoneAt(j); return Z.k === 'canyon' || Z.k === 'towers' || (Z.k === 'trench' && Z.a > i + 2); };   // (only a trench not begun yet may be given up: never the junction or the river)
    // the screen and its fall stay on plain deck (no junction decks, no open railing), clear of a fork's window and of checkpoints
    const ok = A => { if(A + 160 > zEnd - 40) return false; if(window.inForkWindow && inForkWindow(A + CRD - 20, A + 120)) return false;
      for(let k = 0; k < gates.length; k++){ const g = gates[k]; if(g >= A - 320 && g <= A + 90) return false; }
      for(let j = A - 170; j <= A + 60; j += 6) if(!plain(j)) return false;
      for(let j = A + CRD - 40; j <= A + 60; j += 4) if(segs[j] && segs[j].spjP) return false;   // no landmark jump (setpiece/jump.js) under the card or the fall
      return true; };
    let best = -1; for(let A = i + 470; A + 200 < zEnd; A += 4) if(ok(A)){ best = A; break; }
    if(best < 0) return; if(DIR && !DIR.request('screenfall', { tier:'hero', seg:best })) return; if(E.claim) E.claim(best - 168, best + 60);   // (the same stretch the plain check covers: it must never reach into a junction or the river)
    for(let j = best - 640; j <= best + 60; j++) if(segs[j]) segs[j].skRes = 1;   // reserved: mech/skill.js lays no kicker or roadworks on the screen's approach
    // the approach runs straight, so the screen hangs dead ahead between its towers for the whole telegraph (the road there is not placed
    // or seen yet: only its bends are eased out, over 30 segments at each end)
    for(let j = best - 300; j <= best + 40; j++){ const sg = segs[j]; if(!sg || j <= i + 2) continue; const k = sm((j - (best - 300)) / 30) * (1 - sm((j - (best + 10)) / 30)); sg.curve *= 1 - k; }
    add(best); }
  function add(A, F){ const w = { A, F:F || (hash(A * .71) < .5 ? -1 : 1), g:0, a:0, lastD:null, cut:null, swept:false, landed:false, hit:false, done:false, called:false, spT:0 };
    if(ENV.shuto && ENV.shuto.mkBld){ w.tw = [-1, 1].map(sd => ENV.shuto.mkBld({ side:sd, b0:A - 26, len:60, x0:TX, h:sd === w.F ? 13.5 : 16.5, st:'glass', plate:sd < 0, seed:A * .37 + sd })); }
    plans.push(w); if(plans.length > 6) plans.shift(); return w; }
  const active = p => { for(const w of plans) if(!w.done && p > w.A - 900 && p < w.A + 160) return w; return null; };
  // ---------------------------------------------------------------- sparks (world space, pooled)
  const SPK = []; for(let k = 0; k < 140; k++) SPK.push({ on:false, z:0, x:0, h:0, vz:0, vx:0, vh:0, t:0, life:0 });
  function emit(n, z, X, h, up, spread){ for(let k = 0; k < n; k++){ const p = SPK.find(q => !q.on); if(!p) return; p.on = true; p.z = z + (rnd() - .5) * 1.2; p.x = X + (rnd() - .5) * (spread || .2); p.h = h;
      p.vz = -rnd() * 4; p.vx = (rnd() - .5) * 2.2; p.vh = up * (.3 + rnd() * 1.6); p.t = 0; p.life = .7 + rnd() * 1; } }
  function sparks(dt){ for(const p of SPK){ if(!p.on) continue; p.t += dt; if(p.t > p.life){ p.on = false; continue; } p.z += p.vz * dt; p.x += p.vx * dt; p.h += p.vh * dt; p.vh -= 7 * dt; if(p.h < 0 && p.vh < 0){ p.h = 0; p.vh *= -.3; p.vx *= .6; } } }
  // ---------------------------------------------------------------- the module
  // the card beat: every occurrence shows its card (Kellan's rule), the anime cut-in when it has one, else the director's card
  function showCard(w, d, late){ if(!DIR || !DIR.cine) return; let card = CARD;   // (late: the rider was airborne from -600 on; the card still shows, Kellan's rule, but placement keeps landmark jumps away so this should not happen)
    if(card && MECH.cutin && MECH.cutin.show){ let shown = false; try{ shown = MECH.cutin.show('screenfall') !== false && !MECH.cutin.skipped; }catch(e){} if(shown) card = null; }
    // two cines: a short one carries the card (a moment card is held while its cine lives, so it is gone long before the fall), a long
    // one without a card carries the letterbox, the music duck and the guard (traffic moved off the zone) until you are past the screen
    if(card) DIR.cine({ letterbox:false, dur:2.2, card });
    w.cut = DIR.cine({ letterbox:{ top:.11, bottom:.07 }, duck:.4, shake:reduce ? 0 : 3, guard:{ ahead:Math.max(60, -d + 60), behind:6 }, dur:0 }); }
  MECH.sp_screen = {
    plans, CARD, _hAt:hAt, _rest:() => A_REST,
    dbg(A, F){ return add(A, F); },   // testing: a screen at segment A (call before the road there is generated)
    warm(){ buildFrames(); if(!S.board){ S.board = document.createElement('canvas'); S.board.width = 64; S.board.height = 14; }
      const paint = () => { const k = S.board.getContext('2d'); k.fillStyle = '#0a0806'; k.fillRect(0, 0, 64, 14); k.font = '12px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#ffb030'; k.fillText('落下物注意', 2, 1);
        const d = k.getImageData(0, 0, 64, 14); for(let o = 0; o < d.data.length; o += 4){ const on = d.data[o] > 120; d.data[o] = on ? 255 : 10; d.data[o + 1] = on ? 176 : 8; d.data[o + 2] = on ? 48 : 6; d.data[o + 3] = 255; } k.putImageData(d, 0, 0); };
      paint(); if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16', 'ニュース速報首都高今夜快晴東京落下物注意大画面').then(() => { try{ buildFrames(); paint(); if(MECH.arrival && MECH.arrival.momentWarm) MECH.arrival.momentWarm(CARD); }catch(e){} }).catch(() => {});
      try{ cx.save(); cx.globalAlpha = .004; cx.drawImage(S.board, 0, 0, 1, 1); cx.restore(); }catch(e){} },
    reset(){ for(const w of plans) if(w.cut){ w.cut.end(); w.cut = null; } for(const p of SPK) p.on = false; },   // (the plans are cleared when the road is rebuilt from segment 0: reset() runs after that)
    place(i, s, L){ if(i === 0){ for(const w of plans) if(w.cut) w.cut.end(); plans.length = 0; if(ENV.shuto && ENV.shuto.claim) ENV.shuto.claim(-1); }
      for(const w of plans){
        // the two towers the sky-bridge spans replace the road's street row there; nothing of the road's stands over the screen's segment
        if(w.tw && i >= w.A - 26 && i < w.A + 34){ s.sprites = s.sprites.filter(sp => !(sp.env === 'shuto' && ((sp.type === 'bld' && Math.abs(sp.x) < 7) || sp.type === 'gant' || sp.type === 'lamp' && Math.abs(i - w.A) < 3)));
          for(const B of w.tw) s.sprites.push({ env:'shuto', type:'bld', x:B.side * B.x0, k:i, b:B }); }
        if(i >= w.A - 8 && i < w.A + 8) s.hz = null;
        if(i >= w.A - 260 && i < w.A + 40) s.sprites = s.sprites.filter(sp => !(sp.env === 'shuto' && sp.type === 'gant' && sp.v >= 0));   // no sign gantry in front of the screen
        if(i === w.A - BOARD && ENV.shuto.zoneAt(i).k !== 'jct' && !(window.inForkWindow && inForkWindow(i - 10, i + 10))){ s.sprites.push({ env:'shuto', type:'gant', x:0, k:i, v:-1 }); s.scBoard = w; } }
      plan(i, s, L); },
    hitCar(){ const w = active(pSeg()); if(!w) return false; const d = pSeg() - w.A; return d > CRD - 10 && d < 20; },
    update(dt){ const p = pSeg(), w = active(p); sparks(dt); if(!w) return;
      const d = p - w.A, a = w.lastD === null ? d : w.lastD, X = v => a < v && d >= v; w.lastD = d;
      if(!w.swept && d > TEL - 40){ w.swept = true; for(let j = Math.floor(w.A - 40); j < w.A + 40; j++) if(segs[j]) segs[j].hz = null; }
      // the picture and the swing, both from d
      w.g = d < TEL ? 0 : d < TEL + 30 ? 1 : d < TEL + 55 ? 2 : d < LURCH ? 3 : d < LAND ? 1 : 4;
      const lurch = sm((d - LURCH) / 14) * .1, fall = d < FALL0 ? 0 : Math.pow(clamp((d - FALL0) / (LAND - FALL0), 0, 1), 2.2);
      w.a = Math.min(A_REST, lurch + (A_REST - lurch) * fall); if(d >= LAND) w.landed = true;
      // beats
      if(X(TEL)){ crack(); sizzle(1); hum(); if(!reduce) shake = Math.max(shake || 0, 2); }
      if(d > TEL && d < LAND && state === 'play'){ w.spT -= dt; if(w.spT <= 0){ w.spT = reduce ? .25 : .06; const F = w.F; emit(reduce ? 2 : 4, w.A, F * SW * (d < LURCH ? .78 : 1), d < LURCH ? BR0 : HT, 1, .4); if(d > FALL0){ corners(F, w.a); emit(reduce ? 1 : 3, w.A, CN[2], CN[3], .5, .3); } } }
      if(X(CRD)) w.cardPend = true;
      if(w.cardPend && d < TEL - 20 && !(MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying())){ w.cardPend = false; showCard(w, d, false); }
      if(w.cardPend && d >= TEL - 20){ w.cardPend = false; showCard(w, d, true); }
      if(X(LURCH)){ crack(); creak(); sizzle(1.3); if(w.cut) w.cut.hit(reduce ? 0 : 4); else if(!reduce) shake = Math.max(shake || 0, 4); }
      if(X(FALL0)){ crack(); creak(); if(!w.called){ w.called = true; const txt = w.F > 0 ? 'KEEP RIGHT' : 'KEEP LEFT'; try{ const Ar = MECH.arrival; if(!(Ar && Ar.callout && Ar.callout(txt, { kanji:'避', sub:'角を回れ', col:'#ff4ad0', size:'s', hold:.2 }) !== false) && typeof floatText === 'function') floatText(txt, W / 2, H * .62, 22, '#ff4ad0'); }catch(e){} } }
      if(X(LAND)){ slam(); if(w.cut) w.cut.hit(reduce ? 0 : 10); else if(!reduce) shake = Math.max(shake || 0, 10); corners(w.F, A_REST); for(let k = 0; k < (reduce ? 12 : 40); k++) emit(1, w.A, CN[4] + (rnd() - .5) * .3, .05, 2.2, .2); }
      // the obstacle: where its underside is below a rider's height, as you pass its segment
      if(w.landed && !w.hit && state === 'play' && cool <= 0 && AIR.h < 6 && d > -.6 && d < 1.2){ if(hAt(w.F, w.a, playerX - .1) < CLR || hAt(w.F, w.a, playerX + .1) < CLR){ w.hit = true;
          crash({ x:playerX, z:position + PZ }); if(typeof floatText === 'function') floatText('CRUSHED', W / 2, H * .45, 30, '#ff4ad0'); } }
      if(X(2) && DIR && DIR.done) DIR.done('screenfall');
      if(d > 50 && w.cut){ w.cut.end(); w.cut = null; }
      if(d > 150) w.done = true; },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = pSeg(), w = active(p); if(!w) return; const i = s.index;
      if(s.scBoard === w && i === w.A - BOARD && S.board){ // the amber board hung under the gantry's beam: 落下物注意 (falling objects)
        const bw = uw * .9, k = bw / S.board.width; if(k > .2){ const by = sy0 - uw * 1.72 + uw * .14; cx.fillStyle = '#121218'; pxRect(sx0 - bw / 2 - PX, by - PX, bw + PX * 2, S.board.height * k + PX * 2); const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .6); blit(S.board, sx0, by + S.board.height * k, k); cx.globalAlpha = a0; } }
      if(i === w.A) drawScreen(w, s, sx0, sy0, uw, fog, now);
      drawSparks(i); },
    overlay(now, sk){} };
  // ---------------------------------------------------------------- drawing: the sky-bridge, the hangers, the screen and its light
  function drawScreen(w, s, x, y, uw, fog, now){ const F = w.F, f = c => mixc(c, FOG_COL, fog * .7), P = (X, h) => [x + X * uw, y - h * uw], q = s.p2.screen;
    // the sky-bridge: a lit glass-and-steel skywalk between the towers, seen face on: a steel deck beam under it, a roof beam, the glazing
    // between them warm with its ceiling lights, mullions, a few late walkers crossing; floodlights under the beam light the screen's top
    { const [x0, y0] = P(-TX, BR1 + .55), [x1, y1] = P(TX, BR0), ww = x1 - x0, hh = y1 - y0, wb = Math.max(PX, uw * .09);
      cx.fillStyle = f('#2c3040'); pxRect(x0, y1 - wb, ww, wb); cx.fillStyle = f('#5a6078'); pxRect(x0, y1 - wb, ww, Math.max(PX, uw * .02));          // the deck beam
      cx.fillStyle = f('#22242e'); pxRect(x0, y0, ww, wb * .8); cx.fillStyle = f('#6a7088'); pxRect(x0, y0, ww, Math.max(PX, uw * .015));          // the roof beam
      const g0 = y0 + wb * .8, gh = hh - wb * 1.8; cx.fillStyle = f(w.g === 4 ? '#3a3040' : '#ffd8a0'); pxRect(x0, g0, ww, gh);                     // the glazing, lit warm
      cx.fillStyle = f('#fff2d0'); pxRect(x0, g0, ww, Math.max(PX, gh * .12)); cx.fillStyle = f('#c89060'); pxRect(x0, g0 + gh * .7, ww, gh * .3);   // its ceiling lights, its floor glow
      if(uw > 5) for(let k = 0; k <= 16; k++){ cx.fillStyle = f('#1e2028'); pxRect(x0 + ww * k / 16 - Math.max(PX, uw * .01) / 2, g0, Math.max(PX, uw * .012), gh); }   // mullions
      if(uw > 8) for(let k = 0; k < 3; k++){ const ph = (((now / 1000) * (k & 1 ? .03 : -.025) + hash(w.A + k)) % 1 + 1) % 1, px = x0 + ww * (.08 + ph * .84), fh = gh * .62, fw = Math.max(PX, uw * .07);
        cx.fillStyle = f('#2a2030'); pxRect(px - fw / 2, g0 + gh - fh, fw, fh * .72); pxRect(px - fw * .35, g0 + gh - fh * 1.04, fw * .7, fh * .26); }   // walkers
      if(uw > 6) for(let k = 0; k < 5; k++){ const [lx, ly] = P(-TX * .8 + k * TX * .4, BR0); glow(lx, ly + uw * .05, Math.min(H * .06, uw * .3), '#ffd8a0', .15 * (1 - fog)); }
      glow(x, (y0 + y1) / 2, Math.min(H * .2, ww * .45), '#ffb870', .08 * (1 - fog)); }
    // the hangers: two each side; the snapped side's hang loose after the lurch, sparking at their ends
    corners(F, w.a); const tl = [CN[0], CN[1]], tr = [CN[2], CN[3]];
    for(const sd of [-1, 1]){ for(const fx of [.45, .95]){ const top = P(sd * SW * fx, BR0), snapped = sd === F && (w.a > .02 && (fx > .5 || w.a > .12));
        let bot; if(!snapped){ const t = sd === -F ? tl : tr; bot = P(t[0] + (sd === -F ? 1 : -1) * F * SW * (1 - fx) * 0, t[1]); if(sd !== -F && w.a > .02) bot = P(sd * SW * fx, BR0 - .7); }
        else bot = P(sd * SW * fx + (now % 1000 < 500 && !reduce ? .03 : 0), BR0 - .55);
        const lw = Math.max(PX, Math.round(uw * .018 / PX) * PX); poly(top[0] - lw / 2, top[1], top[0] + lw / 2, top[1], bot[0] + lw / 2, bot[1], bot[0] - lw / 2, bot[1], f('#5a5e70')); } }
    // the slab: a dark frame, then the cells of the picture (bilinear over the four corners), lit bulbs with a dark grid between them up close
    corners(F, w.a); const C = [[CN[0], CN[1]], [CN[2], CN[3]], [CN[4], CN[5]], [CN[6], CN[7]]].map(c => P(c[0], c[1]));
    const fr = .07; poly(C[0][0] - uw * fr, C[0][1] - uw * fr, C[1][0] + uw * fr, C[1][1] - uw * fr, C[2][0] + uw * fr, C[2][1] + uw * fr, C[3][0] - uw * fr, C[3][1] + uw * fr, f('#1c1c26'));
    const nu = uw > 10 ? NU : uw > 4 ? NU / 2 : NU / 4, nv = uw > 10 ? NV : uw > 4 ? NV / 2 : NV / 4, grid = uw > 26, L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    // screen space: the top edge C0..C1 (as seen for F = +1 the picture's left is C0); for F = -1 the corners are mirrored, so the picture is too
    const T0 = F > 0 ? C[0] : C[1], T1 = F > 0 ? C[1] : C[0], B0 = F > 0 ? C[3] : C[2], B1 = F > 0 ? C[2] : C[3];
    for(let v = 0; v < nv; v++){ const v0 = v / nv, v1 = (v + 1) / nv, a0 = L(T0, B0, v0), a1 = L(T0, B0, v1), b0 = L(T1, B1, v0), b1 = L(T1, B1, v1), cv = Math.floor(v * NV / nv);
      for(let u = 0; u < nu; u++){ const u0 = u / nu, u1 = (u + 1) / nu, g = grid ? .12 : 0, p0 = L(a0, b0, u0 + g / nu), p1 = L(a0, b0, u1 - g / nu), p2 = L(a1, b1, u1 - g / nu), p3 = L(a1, b1, u0 + g / nu);
        const col = PAL[cell(w, Math.floor(u * NU / nu), cv, now)]; const gy = grid ? (p3[1] - p0[1]) * .12 : 0; poly(p0[0], p0[1] + gy, p1[0], p1[1] + gy, p2[0], p2[1] - gy, p3[0], p3[1] - gy, f(col)); } }
    // its light on the road and the air under it (steady), and the crushed deck where its corner rests
    if(w.g < 4){ const [gx, gy] = P(0, 0); glow(gx, y - uw * (HT - SH * .5), Math.min(H * .3, uw * 2.4), '#5a6aff', .1 * (1 - fog)); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = 'rgba(110,120,255,.06)'; pxRect(x - SW * uw, gy - uw * .06, SW * 2 * uw, uw * .06); cx.globalCompositeOperation = 'source-over'; }
    if(w.landed){ const [cx1, cy1] = P(CN[4], 0); const sz = Math.max(PX, uw * .06); cx.fillStyle = f('#8aa0c0'); pxRect(cx1 - sz * 2, cy1 - sz, sz * 4, sz); cx.fillStyle = f('#3a3a48'); pxRect(cx1 - sz * 3, cy1 - sz * .6, sz * 1.5, sz * .6); pxRect(cx1 + sz * 1.5, cy1 - sz * .8, sz * 1.2, sz * .8); } }
  function drawSparks(i){ for(const p of SPK){ if(!p.on || Math.floor(p.z) !== i) continue; const s = segs[i]; if(!s || !s.p1.screen.w) continue; const a = s.p1.screen, u = a.w, x = a.x + p.x * u, y = a.y - p.h * u;
      const life = 1 - p.t / p.life, sz = Math.max(PX, Math.min(PX * 2, Math.round(u * .02 / PX) * PX)); cx.fillStyle = life > .6 ? '#fff8d0' : life > .3 ? '#ffd040' : '#ff7a20';
      cx.fillRect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, sz, sz); if(u > 20 && life > .5) cx.fillRect(Math.round(x / PX) * PX, Math.round((y + p.vh * u * .02) / PX) * PX, sz, sz); } }
})();
