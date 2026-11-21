/* Sundown set piece module: rail (MECH.sp_rail). See setpiece/README.md.
   Two set pieces:
   1. 新幹線 race (Rice Paddies): a Tokaido-style viaduct swings in beside the farm road and a 0-series Hikari comes up from behind
      on it, whooshes past the bike and settles a few car-lengths ahead, matching your speed. Reel the nose in and boost past it before
      it pulls away: "新幹線 BEATEN", +1 flow and a free big boost. If not, it sounds its horn and pulls away, tail lights receding.
   2. 富士 at dawn (Shonan Coast, Night Tunnels): once the night is nearly over (MOON.t > .8), Mt Fuji fills the horizon. On the tunnels road
      it is framed by the next tunnel exit; on the coast it rises over the bay. First light touches the summit and slides down the cone
      in gold then pink bands; the music thins for a few seconds and a skein of birds crosses.

   References looked at (Wikimedia, through the zoom page), and the rules taken:
   - 0 series photos (Hikari 1989, JNR-colour R67, Yurakucho viaduct 1967, a night 0 series at a platform; 100 series for the era):
     the body is ivory, not white; ONE continuous blue band holds small square windows; a blue skirt sweeps up into the round nose; roof
     grey with lozenge pantographs on alternate cars; doors at the car ends break the blue band; at night the windows are the brightest
     thing and the white body reads mid-grey. -> 12-row body texture: grey roof, ivory 3-tone ramp, blue band with 2x2 windows and head
     silhouettes, blue skirt, dark bogies; nose and tail cars with the profile curve; panto + spark.
   - Shinkansen viaducts (Yurakucho photo): a flat girder deck with a parapet, square piers on a close rhythm, catenary masts with an arm
     over the track. -> deck face + parapet cap line, underside shadow band, piers every 8 segments, masts every 20.
   - Hokusai, Red Fuji (Gaifu kaisei) and Dawn at Isawa: the cone has CONCAVE flanks and a flat, notched summit; snow is a ragged cap with
     white fingers running down the gullies; the forest zone is a stipple of dots; colour is flat bands, not gradients; horizontal mist bands
     cut across the lower slopes. -> concave power profile, notched plateau, gully fingers, dotted lower slopes, stratus bands.
   - Photos of Fuji from Enoshima and Zushi at dawn/dusk: from Shonan it stands over a low blue range across the bay, its foot lost in
     haze; at first light the snow goes pink (beni-fuji) while the sky behind (west) stays cool. -> the base dissolves into the sky by
     ordered dither (so it sits on whatever sky env/sky.js drew); the light line slides DOWN the cone: gold band at the line, pink above.
   - Hiroshige, The Sea off Satta: a skein of small dark birds in loose V's across a pale sky. -> 7 birds, 2-frame flap, dark violet.
   - Pixel-art dawn mountains (Celeste summit, Octopath): one light side, 3-4 tone ramps per material, a lit rim on the sun side and a dark
     hue outline on the shadow side, no smooth gradients. */
"use strict";
(() => {
  // rarity: mech/director.js decides whether a Rice Paddies visit gets the Shinkansen race (hero) and whether a dawn gets the Fuji reveal (ambient)
  const DIR = MECH.director; if(DIR){ DIR.register('shinkansen'); DIR.register('fuji'); }
  const snap = v => Math.round(v / PX) * PX;
  const fl = v => Math.floor(v / PX) * PX;
  const H1 = n => { const s = Math.sin(n * 78.233 + 12.9898) * 43758.5453; return s - Math.floor(s); };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function art(w, h, fn){ const c = canvas(w, h), k = c.getContext('2d'); const P = (x, y, col, ww = 1, hh = 1) => { if(!col) return; k.fillStyle = col; k.fillRect(x, y, ww, hh); }; fn(P, k); return c; }

  // ================================================================ the train (0 series), in world units
  const E = .5, VX = -1.7;                       // deck top above the ground, in half-road widths (sprite units, like lamp heights)
  const TW = 64, TH = 16, ROWU = .029; // car texture: 64 texels long, 16 rows (4 pantograph + 12 body); one row in uw
  const NC = 8, CARZ = 3200, TXZ = CARZ / TW, TLEN = NC * CARZ;
  const FACE = .2, DECKF = .42;        // the train's road-facing side and the deck's road-facing face, relative to the track centre
  const PANTO_U = 33;                  // pantograph contact texel
  const TEX = {};
  // palettes (night: the ivory reads a step down from white; the windows are the brightest thing)
  const C = { out:'#1c1a2a', roofL:'#9aa0b4', roofM:'#727a90', ivL:'#e4dece', ivM:'#bdb8ae', ivD:'#8e8c96', bL:'#3a5cb4', bM:'#22428e', bD:'#152a62',
    win:'#ffe6a8', win2:'#ffc66e', winD:'#c8945a', head:'#6a3e34', glass:'#2c3a66', glint:'#c8dcff', under:'#12131c', wheel:'#2c2e3c', wGl:'#6a6e84', gap:'#3a3a4c',
    pan:'#22242e', panL:'#8a8ea2', rim:'#b4bcd6' };
  function buildCar(kind){   // kind: 'lead' | 'mid' | 'midp' | 'tail'
    return art(TW, TH, (P) => {
      const nose = kind === 'lead' || kind === 'tail';
      for(let x = 0; x < TW; x++){
        const u = kind === 'tail' ? TW - 1 - x : x;          // the tail car is the lead car mirrored (its nose points back at you)
        // nose profile: from u = 42 the roof line falls on a bullet curve to the tip at row ~11; the skirt lifts a little
        let top = 4, bot = 15;
        if(nose && u >= 42){ const n = (u - 42) / 21; top = 4 + Math.round((1 - Math.sqrt(Math.max(0, 1 - n * n))) * 8.2); bot = 15 - Math.round(n * n * n * 3); }
        if(u === 0 || (!nose && u === TW - 1) || (nose && u === 0)){ P(x, 6, C.gap, 1, 8); P(x, 5, C.ivD); continue; }   // the gangway gap between cars
        for(let y = top; y <= bot; y++){
          const r = y - top, edge = y === top, btm = y === bot;
          let col;
          if(edge) col = C.rim;
          else if(btm) col = C.out;
          else if(y === 5 && top === 4) col = C.roofL;
          else if(y === 6 && top === 4) col = C.ivL;
          else if(y === 7) col = C.ivL;
          else if(y === 8) col = C.bL;
          else if(y === 9 || y === 10) col = C.bM;
          else if(y === 11) col = C.bD;
          else if(y === 12) col = C.ivM;
          else if(y === 13) col = C.bM;
          else col = C.under;
          if(nose && u >= 42){ // the nose: ivory cap, the band ends before the cab, the skirt sweeps up
            const n = (u - 42) / 21;
            if(!edge && !btm){ col = y <= top + 1 ? C.ivL : y >= bot - 1 ? C.bD : y >= bot - 3 + Math.round(n * 1.5) ? C.bM : n > .9 ? C.ivM : C.ivL;
              if(u >= 43 && u <= 54 && y >= top + 2 && y <= top + 3 && top <= 7) col = (u === 47 || u === 48) && y === top + 2 ? C.glint : u === 43 || u === 54 ? C.ivD : C.glass;                 // the cab windscreen
              
              if(n < .12 && y >= 8 && y <= 11) col = y === 8 ? C.bL : y === 11 ? C.bD : C.bM;    // the band runs on a little
            }
          }
          P(x, y, col);
        }
        if(!nose || u < 42){
          // windows: 2x2 in the band, pillars every third texel; heads in some, blinds in a few
          const door = (u >= 2 && u <= 5) || (u >= 58 && u <= 61);
          if(door){ for(let y = 7; y <= 12; y++) P(x, y, (u === 2 || u === 5 || u === 58 || u === 61) ? C.ivD : C.ivL); if(u === 3 || u === 59) P(x, 8, C.win2, 1, 2); P(x, 13, C.bM); }
          else if(u > 6 && u < 57 && u % 3 !== 0 && !(kind === 'lead' && u > 38)){
            const w = Math.floor(u / 3), h = H1(w * 7.3 + (kind.length * 3.1) + (kind === 'midp' ? 11 : 0)), blind = h > .9;
            P(x, 9, blind ? C.winD : C.win); P(x, 10, blind ? C.winD : C.win2);
            if(!blind && h < .4 && (u % 3 === 1) === (h < .2)) P(x, 10, C.head);           // a passenger's head against the lit cabin
            if(!blind && h > .84 && u % 3 === 2) P(x, 9, '#8a5a40');                                 // someone sitting tall
          }
          // bogies under the car ends
          if((u >= 7 && u <= 14) || (u >= 49 && u <= 56)){ P(x, 14, C.wheel); if(u === 8 || u === 13 || u === 50 || u === 55) P(x, 14, C.wGl); }
        }
        if(nose && u >= 56 && u <= 60) P(x, 14, u === 58 ? C.wGl : C.wheel);
      }
      // the lead car's cab glazing lit warm from inside, and a headlight / tail light lamp on the nose
      if(nose){ const lx = kind === 'tail' ? 1 : TW - 2; P(lx, 11, kind === 'tail' ? '#ff4a4a' : '#fff6d0'); }
      // pantograph: a lozenge frame on the roof with the contact strip on top
      if(kind === 'midp'){ const pc = C.pan, pl = C.panL;
        P(29, 3, pc); P(37, 3, pc);                    // insulators
        P(30, 2, pl); P(36, 2, pl); P(31, 1, pc); P(35, 1, pc);
        P(32, 1, pc); P(34, 1, pc); P(31, 0, pl, 5, 1); P(30, 0, pc); P(36, 0, pc); }
    });
  }
  // ================================================================ Fuji
  const FW = 264, FH = 78;
  const FJ = {};
  const FPAL = {
    pre:  { sL:'#c6cae8', sM:'#9ea4ce', sD:'#7478aa', rL:'#5c5c8e', rM:'#46467c', rD:'#34305e', dot:'#2a2650', rim:'#e2e4f6', out:'#221e48' },
    pink: { sL:'#fff0ec', sM:'#ffc2c6', sD:'#d496b2', rL:'#aa6c8a', rM:'#88587e', rD:'#5e3e6a', dot:'#4a3058', rim:'#fff8f2', out:'#3a2246' },
    gold: { sL:'#fff4d6', sM:'#ffd49c', sD:'#e89e86', rL:'#c47e5e', rM:'#9c6058', rD:'#6c4256', dot:'#563448', rim:'#fffae6', out:'#40243a' } };
  let FTOP = null, FSNOW = null;
  function fujiGeom(){ if(FTOP) return; FTOP = new Int16Array(FW); FSNOW = new Int16Array(FW); const c = FW / 2 - 6, plat = 7;
    for(let x = 0; x < FW; x++){ const d = x - c, ad = Math.abs(d), R = d < 0 ? 122 : 134; let top;
      if(ad < plat) top = (ad > 1.5 && ad < plat - 1.5 ? 1 : 0) + (H1(x * 3.7) > .72 ? 1 : 0);          // the flat, notched summit (crater rim)
      else { const u = Math.min(1, (ad - plat) / (R - plat)), h = FH * 1.06 * Math.pow(1 - u, 1.55);   // concave flanks
        top = FH * 1.06 - h; if(d < 0) top -= 3.2 * Math.exp(-Math.pow((u - .44) / .08, 2));            // the Hoei shoulder on the east flank
        top += (H1(Math.floor(x / 2) * 1.7) - .5) * 1.3 * u; }
      FTOP[x] = Math.round(top);
    } }
  // snow: a ragged cap with fingers that run DOWN the slope (they fan out from the summit, Red Fuji), longer on the shadow side
  function snowAt(x, y){ const c = FW / 2 - 6, ray = (x - c) / (y + 7), ri = Math.floor(ray * 24 + 200), g = H1(ri * 3.3);
    const len = g > .5 ? (4 + H1(ri * 9.1) * 17) * (ray > 0 ? 1.25 : .9) : g < .12 ? -5 : 0;
    return y < FH * .33 + (H1(ri * 5.1) - .5) * 4 + len && Math.abs(ray) < 2.2; }
  function buildFuji(key){ fujiGeom(); const p = FPAL[key], c = FW / 2 - 6;
    return art(FW, FH, P => {
      for(let x = 0; x < FW; x++){ const top = FTOP[x], d = x - c;
        for(let y = Math.max(0, top); y < FH; y++){
          const fade = y < FH * .86 ? 1 : 1 - (y - FH * .86) / (FH * .14);                // the foot dissolves into the haze (ordered dither)
          if(BAY[(y & 3) * 4 + (x & 3)] > fade) continue;
          const lit = d < 3 + (y - top) * .1 + y * .18, snow = snowAt(x, y), dep = y - top;
          let col;
          if(dep === 0) col = lit ? p.rim : p.out;                                           // lit rim on the sun side, dark hue outline on the other
          else if(snow) col = lit ? (y < FH * .14 || (dep < 3 && d < -10) ? p.sL : (H1(x * 1.3 + y * 7.1) > .86 ? p.sL : p.sM)) : (dep < 2 ? p.sD : (H1(x * 2.1 + y) > .8 ? p.sM : p.sD));
          else { const fz = y > FH * .62;                                                     // forest zone: a stipple of dots (Red Fuji)
            col = lit ? p.rL : p.rM; if(!lit && dep > 2) col = p.rD;
            if(lit && snowAt(x, y - 1)) col = p.sD;                                              // a soft edge under the snow
            if(fz && H1(x * 7.7 + y * 3.1) > (lit ? .62 : .5)) col = p.dot; else if(!fz && H1(x * 1.9 + y * 5.3) > .9) col = lit ? p.rM : p.rD; }
          P(x, y, col); } } }); }
  // mist bands that lie across the lower slopes (Isawa at dawn): a lit top edge, a body, ragged dithered ends
  function buildMist(key, w, seed){ const lit = { pre:'#8a8cba', pink:'#ffc8c0', gold:'#ffd8a8' }[key], body = { pre:'#5e5e90', pink:'#a87898', gold:'#b88078' }[key];
    return art(w, 4, P => { for(let x = 0; x < w; x++){ const e = Math.min(x, w - 1 - x) / (w * .25), th = H1(Math.floor(x / 4) + seed) > .5 ? 2 : 3;
      for(let y = 0; y < th; y++){ if(BAY[(y & 3) * 4 + (x & 3)] > e) continue; P(x, y + (3 - th), y === 0 ? lit : body); } } }); }
  const BIRD = [[[0, 0], [4, 0], [1, 1], [3, 1], [2, 2]], [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [2, 2]], [[1, 1], [3, 1], [0, 2], [2, 2], [4, 2]]];
  function buildBirds(){ for(let f = 0; f < 3; f++) FJ['bird' + f] = art(5, 3, P => BIRD[f].forEach(([x, y]) => P(x, y, '#2a1c3a'))); }

  // ================================================================ state
  const R = { built:false, goAt:{}, tr:null, lastSi:-1, fj:{ on:false, t:0, done:false }, duck:false, fx:-1, sk:null, fogKey:'', fog:null, loop:null, whoosh:false, lastHorn:0 };
  const G0 = 9000, RACE_T = 11.5;
  const PAD = () => LANDS.findIndex(L => L.key === 'paddies');
  const isFujiRoad = i => { const k = LANDS[i] && LANDS[i].key; return k === 'coast' || k === 'tunnels'; };

  function warm(){ if(R.built) return; R.built = true;
    TEX.lead = buildCar('lead'); TEX.mid = buildCar('mid'); TEX.midp = buildCar('midp'); TEX.tail = buildCar('tail');
    for(const k of ['pre', 'pink', 'gold']){ FJ[k] = buildFuji(k); FJ['m' + k] = buildMist(k, 150, 3); FJ['n' + k] = buildMist(k, 96, 17); }
    buildBirds();
    try{ document.fonts.load('16px DotGothic16', '新幹線').then(() => { R.callSpr = buildCall(); }, () => {}); }catch(e){}
    // up-load the canvases to the GPU once so the first reveal never hitches
    try{ const c = cx; c.save(); c.globalAlpha = 0; for(const k in TEX) c.drawImage(TEX[k], 0, 0); for(const k in FJ) c.drawImage(FJ[k], 0, 0); c.restore(); }catch(e){} }

  // concrete ramp, fogged toward the low sky in 12 steps (built when the sky colour changes, never per draw call)
  const CON = ['#7a8098', '#4a5064', '#33374a', '#181a28', '#5c6278', '#14151f', '#10111a'];   // cap, face, shade, underside, pier lit, wire, joint
  function fogTab(low){ if(R.fogKey === low && R.fog) return R.fog; R.fogKey = low; R.fog = CON.map(c => { const a = []; for(let f = 0; f < 12; f++) a.push(mixc(c, low, f / 11 * .85)); return a; }); return R.fog; }

  // ================================================================ placement: the viaduct runs along most of a Rice Paddies stretch
  // (?split=1) segments from the nearest fork split window, 0 inside it: the viaduct swings away across a fork as it does at the road's ends
  function fkDist(i){ if(!SPLIT_ON) return 1e9; let d = 1e9; for(let g = 0; g < gates.length; g += 2){ if(window.isForkZone && !isForkZone(g / 2)) continue; const a = gates[g] - SPLIT_PRE - 30, b = gates[g] + SPLIT_POST; d = Math.min(d, i < a ? a - i : i > b ? i - b : 0); } return d; }
  function place(i, s, L){
    if(!L || L.key !== 'paddies' || typeof gates === 'undefined') return;
    const z = zoneOfSeg(i), a = z > 0 ? gates[2 * z - 1] : 0, b = gates[2 * z + 1]; if(b === undefined) return;
    const A = a + 30, B = b - 20; if(i < A || i > B) return;
    const fw = window.inForkWindow ? fkDist(i) : 1e9, u = Math.min(i - A, B - i, fw), e0 = clamp(u / 90, 0, 1), e = e0 * e0 * (3 - 2 * e0);
    s.rv = { x:lerp(-15, VX, e), pier:i % 8 === 0, mast:i % 20 === 10, end:i === A || i === B };
    // where the race starts: the viaduct has converged, clear of a fork's split window and of the road's landmark jump (the paddies
    // RAILWAY JUMP flies right over this line: the race and its card wait until the bike has landed), and long enough to finish it
    if(i === A + 150){ let g = i + (window.forkClear ? forkClear(i, i + 700) : 0); const J = MECH.sp_jump; if(J && J.clearAfter){ const g2 = J.clearAfter(g); if(g2 !== g) g = g2 + (window.forkClear ? forkClear(g2, g2 + 700) : 0); } R.goAt[A] = g; }
    if(i === R.goAt[A] && B - i > 700 && (!DIR || DIR.request('shinkansen', { seg:i }))) s.rvGo = true;
    // clear roadside kit that would stand inside the viaduct
    if(e > .2) s.sprites = s.sprites.filter(sp => !(sp.x < -1.25 && sp.x > -2.9));   // poles, bus stops, crows, ridge trees: the viaduct stands there now
  }

  // ================================================================ audio (all through M.out, so the game's master gain still rules)
  function horn(v = 1, dur = .9){ if(!M.ac || !M.out) return; const a = M.ac, t = a.currentTime, lp = a.createBiquadFilter(), g = a.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * v, t + .06); g.gain.setValueAtTime(.05 * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + .35); lp.connect(g).connect(M.out);
    for(const f of [311, 370]){ const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .97, t + dur + .3); o.connect(lp); o.start(t); o.stop(t + dur + .4); } }
  function whoosh(){ if(!M.ac || !M.out || !M.noiseBuf) return; const a = M.ac, t = a.currentTime, src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
    src.buffer = M.noiseBuf; bp.type = 'bandpass'; bp.Q.value = .8; bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(1800, t + .45); bp.frequency.exponentialRampToValueAtTime(320, t + 1.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.2, t + .4); g.gain.exponentialRampToValueAtTime(.0001, t + 1.7); src.connect(bp).connect(g).connect(M.out); src.start(t, Math.random()); src.stop(t + 1.8); }
  function rumble(v){ if(!M.ac || !M.out || !M.noiseBuf) return; const a = M.ac;
    if(!R.loop){ if(v < .01) return; const src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain(), o = a.createOscillator(), og = a.createGain();
      src.buffer = M.noiseBuf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = 0; src.connect(lp).connect(g).connect(M.out); src.start();
      o.type = 'triangle'; o.frequency.value = 196; og.gain.value = 0; o.connect(og).connect(M.out); o.start(); R.loop = { src, g, o, og }; }
    const t = a.currentTime; R.loop.g.gain.setTargetAtTime(v * .11, t, .15); R.loop.og.gain.setTargetAtTime(v * .008, t, .15); R.loop.o.frequency.setTargetAtTime(150 + (R.tr ? R.tr.v / MAXS : 0) * 90, t, .2); }
  function chime(){ if(!M.ac) return; const t = M.ac.currentTime; [64, 71, 76, 83].forEach((m, i) => M.tone(midi(m), 2.6, { type:'triangle', v:.018, at:t + .4 + i * .32 })); }
  function chirp(){ if(!M.ac) return; const t = M.ac.currentTime; for(let i = 0; i < 3; i++) M.tone(2600 + Math.random() * 900, .07, { v:.006, at:t + i * .11 + Math.random() * .04 }); }

  // ================================================================ update
  function startRace(){ R.tr = { phase:'approach', head:position - 2600, v:speed + MAXS * .5, t:0, passed:false }; horn(.7, 1.1); }
  function update(dt){
    if(!R.built) warm();
    const T = R.tr, pz = position + PZ;
    if(state === 'play'){
      const si = Math.floor(pz / SEG);
      if(R.lastSi < 0 || R.lastSi > si) R.lastSi = si - 1;
      for(let i = R.lastSi + 1; i <= si; i++){ const s = segs[i]; if(s && s.rvGo && !R.tr && s.land === PAD()) startRace(); }
      R.lastSi = si;
    }
    if(T && state !== 'ready'){
      T.t += dt; const gap = T.head - pz;
      if(T.phase === 'approach'){ T.v = Math.max(T.v, speed + MAXS * .35); if(!T.passed && T.head > position + PZ * .4){ T.passed = true; whoosh(); floatText('新幹線', W * .32, H * .3, 30, '#e8f0ff'); }
        if(gap > G0){ T.phase = 'race'; T.t = 0; T.v = Math.min(T.v, MAXS * 1.02); if(state === 'play' && !(MECH.cutin && MECH.cutin.show('shinkansen') && !MECH.cutin.skipped)) floatText('Race it · boost past the nose', W / 2, H * .36, 18, '#4ff0ff'); } }   // the 超特急 title card (ui/cutin.js) says it
      else if(T.phase === 'race'){ T.v = lerp(T.v, clamp(speed, MAXS * .9, MAXS * .965), 1 - Math.exp(-2 * dt));
        if(R.hold){ T.v = speed; }
        else if(gap < 0 && state === 'play'){ T.phase = 'beaten'; win(); }
        else if(T.t > RACE_T || gap > 20000 || state !== 'play'){ T.phase = 'away'; horn(1, .7); } }
      else if(T.phase === 'away') T.v = Math.min(MAXS * 1.8, T.v + MAXS * .4 * dt);
      else if(T.phase === 'beaten') T.v = lerp(T.v, MAXS * .7, 1 - Math.exp(-.8 * dt));
      T.head += T.v * dt;
      // the bow wave: as the nose comes level with the bike the wind buffets it (a small lean wobble; none with reduced motion)
      const ag = Math.abs(T.head - pz); if(ag < 1400 && T.phase !== 'away') R.buf = Math.max(R.buf || 0, (1 - ag / 1400) * .7);
      const tail = T.head - TLEN, near = T.phase === 'beaten' ? clamp(1 - (pz - T.head) / 9000, 0, 1) : tail > pz ? clamp(1 - (tail - pz) / 14000, 0, 1) : clamp(1 - (pz - T.head) / 9000, 0, 1) * (gap > 0 ? 1 : .6);
      rumble(state === 'play' || state === 'pulled' ? near : 0);
      if((T.phase === 'away' && tail > position + 230 * SEG) || (T.phase === 'beaten' && T.head < position - 6000) || T.t > 40){ R.tr = null; rumble(0); }
    }
    // Fuji: on the coast as soon as the night is nearly over; on the tunnels road at the next tunnel exit (framed by the portal)
    const F = R.fj;
    if(!F.on && state === 'play' && MOON.t > .8 && isFujiRoad(landIdx(zone()))){
      const si = Math.floor(pz / SEG), s = segs[si], key = LANDS[landIdx(zone())].key; let go = key === 'coast';
      if(key === 'tunnels' && s){ if(s.tunnel){ for(let d = 1; d < 70; d++){ const q = segs[si + d]; if(q && !q.tunnel){ go = true; break; } } } else { const q = segs[si - 30]; go = !!(q && q.tunnel); } }
      if(go && DIR && !F.ask){ F.ask = true; F.no = !DIR.request('fuji', { tier:'ambient' }); }   // asked once per ride, at the first moment it could show
      if(go && F.no) go = false;
      if(go){ F.on = true; F.t = 0; F.beat = 0; chime();
        if(M.ac && M.out && state === 'play'){ R.duck = true; M.out.gain.setTargetAtTime(.36, M.ac.currentTime, .7); } } }
    if(R.buf > 0){ R.buf = Math.max(0, R.buf - dt); if(!reduce && state === 'play') leanV += Math.sin(performance.now() / 1000 * 38) * .016 * R.buf; }
    if(F.on){ F.t += dt;   // the reveal's beats on game time (a pause holds them): the title at 1.5 s, birds at 2.6 s and 5.2 s
      if(F.beat === 0 && F.t >= 1.5){ F.beat = 1; if(state === 'play' && MOON.t > .8 && isFujiRoad(landIdx(zone())) && !(MECH.cutin && MECH.cutin.show('fuji') && !MECH.cutin.skipped)) floatText('富士 · 夜明け', W / 2, H * .17, 24, '#ffd8c8'); }
      if(F.beat === 1 && F.t >= 2.6){ F.beat = 2; if(state === 'play') chirp(); }
      if(F.beat === 2 && F.t >= 5.2){ F.beat = 3; if(state === 'play') chirp(); } }
    if(R.duck && (F.t > 8 || state !== 'play')){ R.duck = false; if(state === 'play' && M.ac && M.out) M.out.gain.setTargetAtTime(.85, M.ac.currentTime, 1.4); }
  }
  function win(){ flow++; bestFlow = Math.max(bestFlow, flow); R.wins = (R.wins || 0) + 1;
    boostTier = Math.max(boostTier, 2); boostT = Math.max(boostT, 1.3); speed = Math.max(speed, MAXS * 1.12); M.boost(2, flow);
    if(!MECH.quiet || MECH.quiet.claim(2, 2.4)) R.call = { t0:performance.now() }; R.buf = .7;   /* the call asks the message arbiter (mech/arrival.js) first */ hud(); horn(1.4, .8); whoosh(); }

  // ================================================================ drawing: the viaduct and the train
  // Far away (beyond ZS from the camera) they are true pseudo-3D, drawn per segment. Nearer than that a pure projection would throw the
  // viaduct off the left edge long before the bike draws level with the nose, so the near field is drawn in screen space (like the gang
  // module's close riders): the same world positions run through a projector that starts exactly at the seam (same position, same slope)
  // and bends the near part into a band that runs above the left verge beside the bike, at the bike's depth just left of it, then sweeps
  // off the left edge behind you. Both are drawn in the core's back-to-front segment pass, never over the finished frame (see drawSeg).
  const ZS = 9000, ZN = 150, BIKEZ = 839;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function frameSeam(now){ if(R.frameNow === DRAWN) return R.seam; R.frameNow = DRAWN; R.seam = null;   // (keyed on the core's frame counter: a test may draw twice with one timestamp)
    const i = Math.ceil((position + ZS) / SEG), s = segs[i]; if(!s || !s.p1.screen.scale || s.p1.camera.z <= DEPTH) return null;
    const p = s.p1.screen; R.seam = { i, zc:s.p1.camera.z, x:p.x, y:p.y, w:p.w, rv:s.rv ? s.rv.x : VX, L:Math.log(s.p1.camera.z / ZN) }; return R.seam; }
  const rvAt = z => { const s = segs[Math.floor(z / SEG)]; return s && s.rv ? s.rv.x : null; };
  // near-field projector: world z, lateral offset from the track centre, height (uw units) -> [x, y, scale]
  function nearP(z, dl, h){ const S = R.seam, zc = Math.max(ZN * .4, z - position), u = clamp(Math.log(S.zc / zc) / S.L, 0, 1.4), r0 = rvAt(z), rvx = r0 === null ? S.rv : r0;
    const ub = Math.log(S.zc / BIKEZ) / S.L, xF0 = S.x + (rvx + FACE) * S.w;
    const XF = u <= ub ? lerp(xF0, W * .25, Math.pow(u / ub, .85)) : lerp(W * .25, -W * .32, Math.pow((u - ub) / (1 - ub), 1.5));
    const sY = S.w * (1 + 3 * u), sX = S.w * (1 + 1.2 * u);
    // the band's ground row sits H * .22 * u below the seam; on a straight road the left road edge at that row slides left by .44 W u per
    // unit of playerX (the seam already carries it through S.x), so with the bike right of centre the band slides with the road, keeping
    // the gap to the barrier it has at centre. (Left of centre the road edge moves away from the band: it holds still there.)
    const XP = -.44 * W * u * Math.max(0, playerX);
    return [XF + XP + (rvx - VX + dl - FACE) * sX, S.y + H * .22 * u - h * sY, sY]; }
  // the left barrier's screen line this frame (the real projected segments, so it follows playerX and the bends), near to far; edgeY(x) is
  // the row where it crosses x nearest the bike (H when the barrier never reaches x: open ground below), so a near pier stands behind it
  const BK = 1.24;   // the barrier (1.12) plus its post and a margin, in half-road widths
  function edgeLine(){ const L = R.edge || (R.edge = []); L.length = 0; const b = Math.floor(position / SEG);
    for(let n = 0; n < DRAW; n++){ const s = segs[b + n]; if(!s || !s.p1.screen.scale || s.p1.camera.z <= DEPTH) continue; const p = s.p1.screen; if(p.y < HZ - PX) break; L.push(p.x - p.w * BK, p.y); }
    return L; }
  function edgeY(L, x){ if(L.length < 4 || x < L[0]) return H;
    for(let k = 0; k + 3 < L.length; k += 2){ const x0 = L[k], x1 = L[k + 2]; if((x - x0) * (x - x1) <= 0 && x0 !== x1) return lerp(L[k + 1], L[k + 3], (x - x0) / (x1 - x0)); }
    return L[L.length - 1]; }
  function segP(s, a, b, rv1, rv2){ const z0 = s.index * SEG; return (z, dl, h) => { const t = (z - z0) / SEG, w = lerp(a.w, b.w, t); return [lerp(a.x + (rv1 + dl) * a.w, b.x + (rv2 + dl) * b.w, t), lerp(a.y, b.y, t) - h * w, w]; }; }
  const FCo = (k, fi) => (R.fog || fogTab(R.sk ? R.sk.low : '#24103a'))[k][fi];
  // the deck between two world z's (face, cap, joint line), and its wires, through any projector
  function underside(P, za, zb, fi){ const u1 = P(za, DECKF, E - .08), u2 = P(zb, DECKF, E - .08), v1 = P(za, -DECKF, E - .08), v2 = P(zb, -DECKF, E - .08);
    poly(u1[0], u1[1], v1[0], v1[1], v2[0], v2[1], u2[0], u2[1], FCo(3, fi)); }
  function deckStrip(P, za, zb, fi){
    const u1 = P(za, DECKF, E - .08), u2 = P(zb, DECKF, E - .08), t1 = P(za, DECKF, E + .055), t2 = P(zb, DECKF, E + .055), m1 = P(za, DECKF, E), m2 = P(zb, DECKF, E);
    poly(u1[0], u1[1], u2[0], u2[1], t2[0], t2[1], t1[0], t1[1], FCo(1, fi));
    const cap = Math.max(PX * .9, t1[2] * .012); poly(t1[0], t1[1], t2[0], t2[1], t2[0], t2[1] + cap, t1[0], t1[1] + cap, FCo(0, fi));
    const jl = Math.max(PX * .6, m1[2] * .006); poly(m1[0], m1[1], m2[0], m2[1], m2[0], m2[1] + jl, m1[0], m1[1] + jl, FCo(2, fi)); }
  function wires(P, za, zb, fi){ for(const h of [E + .02 + TH * ROWU, E + .6]){ const a = P(za, FACE, h), b = P(zb, FACE, h), lw = Math.max(PX * .5, a[2] * .004); poly(a[0], a[1], b[0], b[1], b[0], b[1] + lw, a[0], a[1] + lw, FCo(5, fi)); } }
  function pier(P, z, gy, fi, fog, end){ const t = P(z, 0, E - .08), pw = Math.max(PX, snap(t[2] * (end ? .5 : .11))), px = snap(t[0] - pw / 2), top = snap(t[1]), g = snap(gy), ph = g - top; if(ph <= 0) return;
    cx.fillStyle = FCo(1, fi); cx.fillRect(px, top, pw, ph); cx.fillStyle = FCo(4, fi); cx.fillRect(px, top, Math.max(PX, snap(pw * .35)), ph); cx.fillStyle = FCo(2, fi); cx.fillRect(px + pw - PX, top, PX, ph);
    if(fog < 1.5){ cx.globalAlpha = .28 * (1 - fog); cx.fillStyle = FCo(1, fi); cx.fillRect(px, g + PX, pw, Math.min(ph, H - g)); cx.globalAlpha = 1; } }
  function mast(P, z, fi){ const b = P(z, DECKF + .06, E + .055), t = P(z, DECKF + .06, E + .62), arm = P(z, FACE - .1, E + .6), mw = Math.max(PX, snap(b[2] * .014)), mx = snap(b[0]), mt = snap(t[1]);
    cx.fillStyle = FCo(5, fi); cx.fillRect(mx, mt, mw, Math.max(PX, snap(b[1]) - mt)); cx.fillRect(Math.min(mx, snap(arm[0])), mt + PX, Math.abs(mx - snap(arm[0])) + mw, Math.max(PX, snap(b[2] * .01)));
    if(mw > PX){ cx.fillStyle = FCo(2, fi); cx.fillRect(mx, mt, PX, Math.max(PX, snap(b[1]) - mt)); } }

  // Depth order. The viaduct is drawn in the core's back-to-front sprite pass through drawSegBack, which runs for each segment BEFORE that
  // segment's own props, cars, gates and set pieces: whatever stands nearer (the guard rail, the jump's gates and leaf, traffic, props)
  // draws over it, it draws over whatever stands farther, and it is inside the segment's crest clip, so nearer road surface covers it too.
  // Beyond the seam each segment draws its own projected slice (z0..z1). Nearer than the seam the band is screen space, so its world z says
  // nothing about where it sits on screen (the stretch beside the bike is drawn up by the horizon): each piece of it is drawn at the depth
  // it LOOKS to be at instead, in the nearest segment whose road row is at or above the piece's foot (where its piers meet the ground), the
  // painter's rule every roadside prop follows. drawSeg (after the props) only catches a segment the back hook did not reach (the fork's
  // split window); drawNear (under the bike) flushes anything left over.
  function drawSeg(s, sx0, sy0, uw, fog, now){
    if(s.rvF === DRAWN) return; s.rvF = DRAWN; if(nearFrame(now).on) nearDraw(s.index, now);
    const rv = s.rv; if(!rv) return; const S = R.seam; if(S && s.index < S.i) return;
    const a = s.p1.screen, b = s.p2.screen; if(!b.scale || b.scale <= 0 || !a.w) return;
    const n2 = segs[s.index + 1], rv2 = n2 && n2.rv ? n2.rv.x : rv.x, fi = Math.min(11, Math.round(fog * 11));
    const ax = a.x + rv.x * a.w, bx = b.x + rv2 * b.w;
    if((ax + a.w * .6 < -PX * 4 && bx + b.w * .6 < -PX * 4) || fog > .985) return;
    const P = segP(s, a, b, rv.x, rv2), z0 = s.index * SEG, z1 = z0 + SEG;
    underside(P, z0, z1, fi);
    if(rv.pier || rv.end) pier(P, z0, a.y, fi, fog, rv.end);
    if(R.tr) trainCols(P, z0, z1, fog, now);
    deckStrip(P, z0, z1, fi);
    if(rv.pier){ const t = P(z0, DECKF, E + .055), f = P(z0, DECKF, E - .08); cx.fillStyle = FCo(6, fi); cx.fillRect(snap(t[0]), snap(t[1]), PX, Math.max(PX, snap(f[1] - t[1]))); }
    if(rv.mast) mast(P, z0, fi);
    wires(P, z0, z1, fi);
  }
  // the near field, in screen space, cut into pieces once a frame: the band's sample depths (far, at the seam, to near, even in log depth)
  // cut again at segment ends, each piece tagged with the segment it is drawn in; the piers and masts likewise
  const NF = { k:-1, on:false, top:0, z0:0, z1:0, EL:null, zs:new Float64Array(41), n:0, pa:new Float64Array(192), pb:new Float64Array(192), pj:new Int32Array(192), pd:new Uint8Array(192),
    m:0, mi:new Int32Array(96), mj:new Int32Array(96), md:new Uint8Array(96) };
  // The depth a piece LOOKS to be at, from where it stands across the screen: the nearest segment the pass draws whose own (projected)
  // viaduct line, at the same offset from the track, lies at or right of screen x. Anything that overlaps the piece from the road side (the
  // guard rail, the leaf, gates, cars) then stands nearer than that segment and draws over it; anything out across the fields stands farther
  // and goes under it, as it would beside the real viaduct. (The seam's neighbour when none is.)
  function lineSeg(x, dl, S){ for(let i = Math.floor(position / SEG) + 1; i < S.i; i++){ const s = segs[i]; if(!s || !s.p1.screen.scale || s.p1.camera.z <= DEPTH) continue;
      const p = s.p1.screen; if(p.x + ((s.rv ? s.rv.x : VX) + dl) * p.w >= x) return i; } return S.i - 1; }
  // A pier is a post standing on the ground, so it goes by its foot, like every roadside prop: the nearest drawn segment whose road row is
  // at or above the foot. Its foot is held just above the guard rail's screen line (edgeY), so that is the rail beside it: the nearer rail
  // runs in front of it, and the segment's crest clip (its nearer road) sits at the foot and leaves the post whole.
  function rowSeg(y, S){ for(let i = Math.floor(position / SEG) + 1; i < S.i; i++){ const s = segs[i]; if(s && s.p1.screen.scale && s.p1.camera.z > DEPTH && s.p1.screen.y <= y) return i; } return S.i - 1; }
  function pierFoot(i, EL){ const rv = segs[i].rv, z = i * SEG, g = nearP(z, 0, 0), t = nearP(z, 0, E - .08), pw = Math.max(PX, snap(t[2] * (rv.end ? .5 : .11)));
    return Math.min(g[1], edgeY(EL, snap(t[0] + pw / 2)) - PX * 2); }
  function nearFrame(now){ if(NF.k === DRAWN) return NF; NF.k = DRAWN; NF.on = false; NF.n = NF.m = NF.top = 0;
    const S = frameSeam(now); if(!S || !R.built) return NF; const z1 = S.i * SEG, z0 = position + ZN * .55; if(z1 <= z0) return NF;
    let any = false; for(let i = Math.floor(z0 / SEG); i < S.i && !any; i++) any = !!(segs[i] && segs[i].rv); if(!any) return NF;
    NF.on = true; NF.z0 = z0; NF.z1 = z1; NF.EL = edgeLine(); const zs = NF.zs, N = zs.length - 1;
    for(let k = 0; k <= N; k++) zs[k] = position + S.zc * Math.exp(-k / N * S.L * 1.35);
    for(let k = 0; k < N; k++){ const za = Math.max(z0, zs[k + 1]); let hi = Math.min(z1, zs[k]);
      while(hi > za && NF.n < NF.pa.length){ const lo = Math.max(za, (Math.ceil(hi / SEG) - 1) * SEG);
        if(rvAt(lo) !== null && rvAt(hi) !== null){ const j = Math.min(lineSeg(nearP(lo, DECKF, 0)[0], DECKF, S), rowSeg(nearP(lo, DECKF, E - .08)[1], S));   /* (never deeper than the road row at its underside: over a crest the deck stays in view) */ NF.pa[NF.n] = lo; NF.pb[NF.n] = hi; NF.pj[NF.n] = j; NF.pd[NF.n] = 0; NF.n++; if(j > NF.top) NF.top = j; } hi = lo; } }
    for(let i = S.i - 1; i >= Math.ceil(z0 / SEG) && NF.m < NF.mi.length; i--){ const s = segs[i]; if(!s || !s.rv || !(s.rv.pier || s.rv.end || s.rv.mast)) continue;
      const j = s.rv.pier || s.rv.end ? rowSeg(pierFoot(i, NF.EL), S) : lineSeg(nearP(i * SEG, DECKF + .06, 0)[0], DECKF + .06, S); NF.mi[NF.m] = i; NF.mj[NF.m] = j; NF.md[NF.m] = 0; NF.m++; if(j > NF.top) NF.top = j; }
    return NF; }
  // draw the pieces tagged for segment j or a farther one not drawn yet (one the pass skipped), far to near in the band's own layer order:
  // underside, piers, the train, then the deck face, masts and wires in front
  function nearDraw(j, now){ const F = NF; if(j > F.top) return; F.top = j - 1; let any = false;
    for(let k = 0; k < F.n; k++) if(!F.pd[k] && F.pj[k] >= j){ F.pd[k] = 2; any = true; }
    for(let k = 0; k < F.m; k++) if(!F.md[k] && F.mj[k] >= j){ F.md[k] = 2; any = true; } if(!any) return;
    for(let k = 0; k < F.n; k++) if(F.pd[k] === 2) underside(nearP, F.pa[k], F.pb[k], 0);
    for(let k = 0; k < F.m; k++){ if(F.md[k] !== 2) continue; const i = F.mi[k], rv = segs[i].rv; if(rv.pier || rv.end) pier(nearP, i * SEG, pierFoot(i, F.EL), 0, 2, rv.end); }
    if(R.tr) for(let k = 0; k < F.n; k++){ if(F.pd[k] !== 2) continue; let e = k; while(e + 1 < F.n && F.pd[e + 1] === 2 && F.pb[e + 1] === F.pa[e]) e++; trainCols(nearP, F.pa[e], F.pb[k], 0, now); k = e; }   // per unbroken run of this group's pieces
    for(let k = 0; k < F.n; k++) if(F.pd[k] === 2) deckStrip(nearP, F.pa[k], F.pb[k], 0);
    for(let k = 0; k < F.m; k++) if(F.md[k] === 2 && segs[F.mi[k]].rv.mast) mast(nearP, F.mi[k] * SEG, 0);
    for(let k = 0; k < F.n; k++) if(F.pd[k] === 2){ wires(nearP, F.pa[k], F.pb[k], 0); F.pd[k] = 1; }
    for(let k = 0; k < F.m; k++) if(F.md[k] === 2) F.md[k] = 1; }
  // under the bike: whatever no segment drew (nothing, normally)
  function drawNear(now){ if(NF.k === DRAWN && NF.on) nearDraw(-1e9, now); }

  // texture columns of the train between world z's za..zb, through a projector
  function trainCols(P, za0, zb0, fog, now){
    const T = R.tr, head = T.head, tail = head - TLEN, za = Math.max(za0, tail, position + ZN * .5), zb = Math.min(zb0, head); if(zb <= za) return;
    cx.globalAlpha = fog > .2 ? 1 - (fog - .2) * .9 : 1;
    let z = za, sparks = null;
    while(z < zb - .5){
      const c = head - z, car = Math.min(NC - 1, Math.floor(c / CARZ)), within = c - car * CARZ, k = Math.min(TW - 1, Math.floor(within / TXZ));
      let u1 = TW - 1 - k, zEnd = head - (car * CARZ + k * TXZ); if(zEnd <= z) zEnd = z + TXZ * .5;
      const x0 = P(z, FACE, 0)[0]; let x1 = P(Math.min(zEnd, zb), FACE, 0)[0], u0 = u1;
      while(x1 - x0 < PX && zEnd < zb && u1 < TW - 1){ u1++; zEnd += TXZ; x1 = P(Math.min(zEnd, zb), FACE, 0)[0]; }
      const ze = Math.min(zEnd, zb), zm = (z + ze) / 2, pb = P(zm, FACE, E + .02), pt = P(zm, FACE, E + .02 + TH * ROWU);
      const X0 = snap(x0), X1 = snap(x1);
      if(X1 > X0 && X1 > -PX && X0 < W){ const tex = car === 0 ? TEX.lead : car === NC - 1 ? TEX.tail : car % 2 ? TEX.midp : TEX.mid;
        const Y0 = snap(pt[1]), Y1 = snap(pb[1]); if(Y1 > Y0) cx.drawImage(tex, u0, 0, u1 - u0 + 1, TH, X0, Y0, X1 - X0, Y1 - Y0);
        if(tex === TEX.midp && u0 <= PANTO_U && u1 >= PANTO_U){ sparks = sparks || []; sparks.push([lerp(X0, X1, (PANTO_U - u0 + .5) / (u1 - u0 + 1)), Y0, pb[2], car]); } }
      z = ze; }
    cx.globalAlpha = 1;
    // the pantograph arcing on the wire: a blue-white crackle with a stepped glow (steady and soft with reduced motion)
    if(sparks && fog < .8) for(const [x, y, w, car] of sparks){ const ph = Math.floor(now / 55) + car * 7, on = reduce ? .45 : H1(ph * 1.37) > .55 ? 1 : H1(ph * 2.1) > .7 ? .5 : 0; if(!on) continue;
      const sz = Math.max(PX, snap(w * .012)); cx.fillStyle = on > .6 ? '#ffffff' : '#b8e4ff'; cx.fillRect(snap(x) - sz, snap(y) - sz, sz * 2, sz);
      if(!reduce && on > .6){ cx.fillStyle = '#8ad0ff'; cx.fillRect(snap(x + (H1(ph) - .5) * w * .08), snap(y - w * .03), PX, PX); }
      glow(x, y, w * .12 * on + PX, '#9ad8ff', .5 * on * (1 - fog)); }
    // the nose lamp throws light ahead along the track; the tail end shows two red lamps
    if(head > za0 && head <= zb0){ const p = P(head, FACE, E + .02 + 4.5 * ROWU); glow(p[0] + p[2] * .02, p[1], p[2] * .25 + PX, '#fff2c8', .55 * (1 - fog));
      if(p[2] > 60){ const sz = Math.max(PX, snap(p[2] * .016)); cx.fillStyle = '#fffbe8'; cx.fillRect(snap(p[0]) - sz, snap(p[1]), sz, sz); } }
    if(tail > za0 && tail <= zb0 && tail > position + 60){ for(const sd of [-.06, .14]){ const p = P(tail, sd, E + .02 + (TH - 4.5) * ROWU), sz = Math.max(PX, snap(p[2] * .02)); cx.fillStyle = '#ff5a4a'; cx.fillRect(snap(p[0]) - sz / 2, snap(p[1]), sz, sz); glow(p[0], p[1], p[2] * .07 + PX, '#ff3a3a', .5 * (1 - fog)); } }
  }

  // ---------------------------------------------------------------- the call-out: 新幹線 BEATEN on a slab in the arrival card's manner (livery stripes, pixel type)
  const F3 = { A:'010101111101101', B:'110101110101110', E:'111100110100111', F:'111100110100100', L:'100100100100111', N:'110101101101101', O:'010101101101010', S:'011100010001110',
    T:'111010010010010', W:'101101111111101', '1':'010110010010111', '+':'000010111010000', ' ':'000000000000000', '.':'000000000000010' };
  function txt3(g, s, x, y, k, col, sh){ for(const [cc, o] of [[sh, k], [col, 0]]){ if(!cc) continue; g.fillStyle = cc; [...s].forEach((ch, n) => { const b = F3[ch] || F3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(x + (n * 4 + i % 3) * k + o, y + (i / 3 | 0) * k + o, k, k); }); } }
  function kanjiMask(str){ const fs = 16, c = canvas(fs * str.length + 8, fs + 8), k = c.getContext('2d'); k.font = fs + 'px DotGothic16'; k.textBaseline = 'top'; k.fillStyle = '#fff'; k.fillText(str, 2, 2);
    const d = k.getImageData(0, 0, c.width, c.height).data, o = canvas(c.width, c.height), g = o.getContext('2d'); g.fillStyle = '#fff';
    for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++) if(d[(y * c.width + x) * 4 + 3] >= 128) g.fillRect(x, y, 1, 1); return o; }
  function buildCall(){ const km = kanjiMask('新幹線'), kw = 16 * 3 + 4, w = 6 + kw + 6 + 14 * 4 + 6, h = 30, c = canvas(w, h), g = c.getContext('2d');
    g.fillStyle = 'rgba(7,6,12,.9)'; g.fillRect(0, 4, w, h - 8);
    g.fillStyle = '#e4dece'; g.fillRect(2, 0, w - 2, 2); g.fillStyle = '#3a5cb4'; g.fillRect(1, 2, w - 1, 1);                 // the 0-series livery: ivory over blue
    g.fillStyle = '#e0303a'; g.fillRect(0, h - 3, w - 2, 2); g.fillStyle = '#4ff0ff'; g.fillRect(0, h - 1, w - 4, 1);
    const tint = (col, dx, dy) => { const t = canvas(km.width, km.height), tg = t.getContext('2d'); tg.drawImage(km, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, t.width, t.height); g.drawImage(t, 4 + dx, 4 + dy); };
    tint('#07060c', 1, 0); tint('#07060c', -1, 0); tint('#07060c', 0, 1); tint('#07060c', 0, -1); tint('#22428e', 2, 2); tint('#22428e', 1, 1); tint('#f4ecdf', 0, 0);
    txt3(g, 'BEATEN', 6 + kw, 7, 2, '#4ff0ff', '#0c2a40'); txt3(g, '+1 FLOW. BOOST', 6 + kw, 20, 1, '#ffd04a', '#3a2a10'); return c; }
  function drawCall(now){ const C2 = R.call; if(!C2) return; const t = (now - C2.t0) / 1000; if(t > 2.4){ R.call = null; return; }
    if(!R.callSpr) R.callSpr = buildCall(); const spr = R.callSpr, k = PX, cw = spr.width * k, x1 = snap(W / 2 - cw / 2), y = snap(H * .26);
    const st = (p, n) => Math.floor(clamp(p, 0, 1) * n) / n; let x = x1, a = 1;
    if(reduce){ a = t < .25 ? st(t / .25, 3) : t > 2.0 ? 1 - st((t - 2) / .4, 3) : 1; }
    else { if(t < .2) x = lerp(-cw - 10, x1, st(t / .2, 5)); if(t > 2.0) x = lerp(x1, W + 10, st((t - 2) / .35, 6));
      if(t < .3){ cx.fillStyle = '#fff'; for(let n = 0; n < 6; n++) cx.fillRect(snap(x - 30 - H1(n * 3.1) * 80), snap(y + (4 + H1(n * 7.7) * 22) * k), snap(20 + H1(n) * 60), PX); } }
    cx.globalAlpha = a; cx.imageSmoothingEnabled = false; cx.drawImage(spr, x, y, cw, spr.height * k);
    if(!reduce && t > .2 && t < .27){ cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .35; cx.drawImage(spr, x, y, cw, spr.height * k); cx.globalCompositeOperation = 'source-over'; }
    cx.globalAlpha = 1; }

  // ================================================================ Fuji, in the far backdrop
  function drawBackdrop(o){ R.sk = o.sk; fogTab(o.sk.low);
    const F = R.fj; if(!F.on || !R.built) return;
    const al = (isFujiRoad(o.bgB) ? (o.bgA === o.bgB ? 1 : o.bgMix) : 0) + (o.bgA !== o.bgB && isFujiRoad(o.bgA) ? 1 - o.bgMix : 0); if(al <= .01) return;
    const key = LANDS[o.bgMix < .5 ? o.bgA : o.bgB].key, coast = key === 'coast';
    if(F.sk0 === undefined) F.sk0 = skyOff;   // the cone starts where the reveal frames it, then drifts a little with the bends (bounded)
    const k = PX, cxp = snap(W * (coast ? .44 : .5) - clamp((skyOff - F.sk0) * .6, -1, 1) * W * .22), lift = coast ? 7 : 4, y0 = snap(o.hz - (FH + lift) * k), x0 = snap(cxp - (FW / 2 - 6) * k);
    // fade in by hard steps; then first light: it touches the summit and slides down, a gold band at its edge and pink above
    const fade = reduce ? clamp(F.t / 2, 0, 1) : Math.floor(clamp(F.t / 2.4, 0, 1) * 4) / 4, a = al * fade; if(a <= 0) return;
    const p = clamp((F.t - 1.4) / 7, 0, 1), lineY = Math.round(p * p * (3 - 2 * p) * FH * .9), band = 4;
    cx.globalAlpha = a; cx.imageSmoothingEnabled = false;
    cx.drawImage(FJ.pre, x0, y0, FW * k, FH * k);
    if(lineY > 0){ const gy = Math.max(0, lineY - band), py = gy;
      if(py > 0) cx.drawImage(FJ.pink, 0, 0, FW, py, x0, y0, FW * k, py * k);
      cx.drawImage(FJ.gold, 0, gy, FW, lineY - gy, x0, y0 + gy * k, FW * k, (lineY - gy) * k); }
    // mist bands across the lower slopes, lit to match the light that has reached them
    const mk = p > .75 ? 'pink' : p > .5 ? 'gold' : 'pre', drift = reduce ? 0 : Math.sin(o.now / 9000) * 6;
    cx.drawImage(FJ['m' + mk], snap(x0 + (60 + drift) * k), snap(y0 + FH * .6 * k), 150 * k, 4 * k);
    cx.drawImage(FJ['n' + (p > .9 ? 'pink' : 'pre')], snap(x0 + (150 - drift) * k), snap(y0 + FH * .73 * k), 96 * k, 4 * k);
    cx.globalAlpha = 1;
    // a skein of birds crossing in front of the cone (Hiroshige), only during the held moment
    if(F.t > 1.5 && F.t < 16){ const bt = (F.t - 1.5) / 14.5, bx = x0 + (-30 + bt * (FW + 60)) * k, by = y0 + FH * .3 * k;
      for(let j = 0; j < 7; j++){ const off = j === 0 ? [0, 0] : [-(Math.ceil(j / 2)) * 9, (j % 2 ? -1 : 1) * Math.ceil(j / 2) * 4], fr = reduce ? 1 : Math.floor(o.now / 140 + j * 1.7) % 4;
        const spr = FJ['bird' + [0, 1, 2, 1][fr]]; cx.globalAlpha = a * (1 - Math.max(0, bt - .85) / .15); cx.drawImage(spr, snap(bx + off[0] * k), snap(by + (off[1] + (reduce ? 0 : Math.sin(o.now / 700 + j) * .8)) * k), 5 * k, 3 * k); }
      cx.globalAlpha = 1; }
    // the road's own far scenery goes back in front of the mountain (built-in skylines); the coast's sea, island and hills sit below it already
    const L = LANDS[o.bgB], E2 = ENV[L.key]; if(!(E2 && E2.backdrop) && isFujiRoad(o.bgB)){ cx.globalAlpha = o.bgA === o.bgB ? 1 : o.bgMix; backdrop(L, o.hz, o.far, o.near, o.now, o.sk); cx.globalAlpha = 1; }
  }

  function reset(){ if(!R.built) warm(); if(R.duck && M.ac && M.out) M.out.gain.setTargetAtTime(.85, M.ac.currentTime, .3);
    R.tr = null; R.call = null; R.buf = 0; R.lastSi = -1; R.fj = { on:false, t:0 }; R.duck = false; R.fx = -1; R.wins = 0; rumble(0); }
  function finish(rec){ if(R.wins) rec.shinkansen = R.wins; }

  MECH.sp_rail = { warm, place, update, drawSegBack:drawSeg, drawSeg, drawBackdrop, reset, finish, drawUnderBike:drawNear, drawScreen:drawCall,
    // test hooks for screenshots: force the race at a given gap, or the Fuji reveal at a given time
    _test:{ race(gap, phase = 'race', hold = true){ R.tr = { phase, head:position + PZ + gap, v:speed, t:1, passed:true }; R.hold = hold; },
      fuji(t){ R.fj = { on:true, t }; }, call(){ R.call = { t0:performance.now() }; }, R, TEX } };
})();
