/* Sundown mechanic module: skill. See mech/README.md.
   Three skill verbs that sit on top of the lean-and-release drift, each from a proven racer:
   1. Slipstream (Super Hang-On's tow, F-Zero and Burnout drafting): tuck in behind a car in its lane and a draft meter fills, faster the
      closer you ride. Pull out and it slingshots you past. The longer and closer the tow, the bigger the shot, so it pays off at the same
      moment as a close call.
   2. Kickers and shortcuts (Excitebike ramps, Hydro Thunder's jump-over shortcuts): a steel kicker in one lane, telegraphed by painted
      chevrons and amber beacons. Hit it and you fly; land straight (not steering) for a boost. Half of them sit at the head of a closed
      lane of roadworks: traffic squeezes into the open lanes, and the kicker is the risky, faster line over the top.
   3. Wheelies: a boost pad (and a Thunder boost) pops the front wheel up over the rider's helmet, then it springs back down.
   Observed rules taken from the references (Excitebike NES, Hydro Thunder, F-Zero SNES, Super Hang-On; photos of supermoto wheelies):
   - Excitebike ramps read as a bright sloped face over a darker side; stripes run across the face; the lip is the brightest edge.
   - Hydro Thunder telegraphs a shortcut ramp with a light colour against the dark surround, visible from far off.
   - F-Zero sprites are 3-tone with dark outlines and sit on a hard drop shadow; boost plates use chevrons that point the way.
   - A wheelie from behind: the front tyre is seen edge-on, a tall dark bar with a sliver of rim, fork legs in bright chrome either side,
     the fender over the top; it rises above the rider's head. */
"use strict";
(() => {
  const S = MECH.skill = {};
  // tuning
  const DZ = 6000, DX = .25, DMIN = .25;          // draft window ahead, lane tolerance, smallest meter that slingshots
  const RAMP_GAP = 520, RAMP_P = .012;             // segments between kickers, chance per eligible segment
  const RH = 460, RLEN = 800, RHW = .3;   // RLEN = 4 segments (SEG is defined later, by the game script)        // kicker height and length (world units), half width (half-roads)
  const LAND_BUF = .12, landThr = () => window.ASSIST && ASSIST.jumps ? .32 : .13;   // landing: straight-lean threshold (assists: generous), buffer (s)
  /* crest air (Kellan, 2026-11-19: "when you go over tall bumps could you get some air?"): OutRun's and Burnout's hill hop. At a crest the road
     bends away under you; when the downward acceleration it would take to follow it (speed squared times the road's vertical curvature)
     is more than CREST.G, the bike leaves the road for a short hop on the kicker's arc, shadow and landing rules. Sharper crests and more
     speed give longer, higher hops, from T0 to T1 seconds. Hops of JUDGE s or more are judged like a kicker landing (land straight; the
     0.12 s buffer), but pay only a style act, no boost. ASSIST.jumps (gentle jumps): fewer, lower hops and the generous landing. */
  const CREST = { G:36000, span:1, minSp:.75, T0:.3, T1:.8, h0:.14, h1:.36, cd:.9, judge:.45, pre:.06 };
  const ZLEN = 30;                               // roadworks length in segments, past the lip
  const DBL = 40, DBL_P = .4;                    // a double's second kicker, segments after the first; chance for an open-road kicker
  const PERF_LVL = .3;                           // a PERFECT kicker landing: level (not steering, lean settled) for this long before touchdown
  // state
  let dm = 0, dCar = null, dScr = null, dTow = 0, streaks = [], puffs = [];
  let air = null, deck = null, lastPZ = null, lastCrashes = 0, lastBoosts = 0, lastRamp = -1e9, zones = [];
  let wp = 0, wv = 0, wHold = 0, wPeak = 0, airPitch = 0, crestCD = 0, hops = 0, hopT = 0, hopBy = {};
  let st = { slips: 0, bestSlip: 0, jumps: 0, bigAir: 0, shortcuts: 0, wheelies: 0 };
  let warmed = false, placed = 0, ownAir = false, lastMine = 0;
  let lift = 0, camK = false;   // a kicker's lift above the road (screen px at the bike); camK: the camera is rising with it (see S.update)
  let smashT = -9;   // the last cone smash that paid a style act (one a run of cones, not one a cone)

  /* ---------------------------------------------------------------- sprites (all cached) */
  const K = '#0a0810';
  // kicker deck, 48 x 32 texels, row 0 = the lip (far, high), last row = the toe on the asphalt. Lamps chase up the rails (ph).
  const TW = 48, TH = 32;
  function deckTex(ph){ return procSprite('sk_deck' + ph, TW, TH, (x, y) => {
    const e = Math.min(x, TW - 1 - x), left = x < TW / 2;
    if(y === 0 || e === 0) return K;
    if(y <= 4){ if(y === 4) return K; const on = ((x + y) >> 2) % 2 === 0;   // the lip: diagonal hazard stripes, a lit top edge
      return on ? (y === 1 ? '#fff0a0' : y === 3 ? '#d89a2a' : '#ffd04a') : (y === 1 ? '#3a3040' : '#1a1418'); }
    if(y >= TH - 2) return y === TH - 1 ? K : left ? '#8a8698' : '#6a6878';   // the toe plate catches the light
    if(e <= 4){ if(e === 4) return K;   // side rails: steel, with a lamp every 5 rows
      const r = (y - 5) % 5, n = Math.floor((y - 5) / 5);
      if(e === 2 && r === 2) return (n + ph) % 3 === 0 ? '#fff4c0' : '#ff9a2a';
      if(e === 2 && (r === 1 || r === 3)) return '#5a3a18';
      return e === 1 ? (left ? '#7a788c' : '#4a4858') : (r === 0 ? '#ffd04a' : '#2a2836'); }
    // two chevrons point up the deck
    const cxp = TW / 2 - .5, ax = Math.abs(x - cxp);
    for(const ty of [7, 17]){ const d = y - ty - ax * .6; if(ax < 13 && d >= 0 && d < 3.2) return d < 1 ? '#fff0b0' : d < 2.2 ? '#ffb35a' : '#a8521c'; }
    // diamond tread plate, a step lighter toward the lit lip
    const stud = y % 2 === 0 && (x + (y % 4 === 0 ? 0 : 2)) % 4 === 0;
    if(stud) return y < 14 ? '#8a889c' : '#706e82';
    return y < 12 ? '#5a5870' : y < 22 ? '#4c4a60' : '#423f54'; }); }
  // the lip's cast shadow on the asphalt ahead: stepped dark bands, darkest at the lip
  function shadowTex(){ return procSprite('sk_shadow', 4, 8, (x, y) => ['rgba(0,0,0,.18)', 'rgba(0,0,0,.18)', 'rgba(0,0,0,.3)', 'rgba(0,0,0,.3)', 'rgba(0,0,0,.42)', 'rgba(0,0,0,.42)', 'rgba(0,0,0,.6)', 'rgba(0,0,0,.6)'][y]); }
  // painted road arrow before a kicker, 16 x 20 texels
  function arrowTex(){ return procSprite('sk_arrow', 16, 20, (x, y) => { const ax = Math.abs(x - 7.5);
    for(const ty of [1, 9]){ const d = y - ty - ax * .9; if(ax < 7.6 && d >= 0 && d < 3.4) return d < 2.4 ? '#ffd04a' : '#b07a1c'; }
    return null; }); }
  // amber beacon on a short post (lip corners), lit or dim
  function beacon(on){ return procSprite('sk_beacon' + on, 5, 11, (x, y) => {
    if(y <= 3){ if(y === 0 && (x === 0 || x === 4)) return null; if(x === 0 || x === 4 || y === 0) return K; return on ? (y === 1 && x === 1 ? '#fffbe0' : '#ffb040') : (x === 1 ? '#a0601c' : '#6a3a10'); }
    if(y === 4 || y === 10) return x >= 1 && x <= 3 ? K : null; if(x === 2) return y % 3 === 0 ? '#ffd04a' : '#3a3844'; return x === 1 || x === 3 ? K : null; }); }
  // a Japanese roadworks barricade: yellow-and-black board with a reflective white rim, a flasher on top, splayed legs
  function barricade(on){ const key = 'sk_bar' + on; return SPR[key] || (SPR[key] = makeSprite([
    '...........KK', '..........KAA', '..........KAA', 'KKKKKKKKKKKKK', 'KwwwwwwwwwwWW', 'Kw1y1KKyyyKKy', 'KwyyKKyyyKKyy', 'KwyKKyyyKKyyy', 'KwKKyyyKKyyyK', 'KwwwwwwwwwwWW', 'KKKKKKKKKKKKK',
    '..KN.......KN', '..KN.......KN', '.KN.......KN.', '.KN.......KN.', 'KKK......KKK.'],
    { K, w:'#e8e4d8', W:'#c8c4cc', y:'#ffc83a', 1:'#fff0a0', N:'#4a4858', A:on ? '#ffb040' : '#6a3a10' })); }
  // a traffic cone: red-orange with two reflective bands and a black foot
  function cone(){ return SPR.sk_cone || (SPR.sk_cone = makeSprite(['....K', '...KR', '...KR', '..KWw', '..KRR', '..KRR', '.KWWw', '.KRRR', 'KRRRr', 'KKKKK', 'KNNNN', 'KKKKK'],
    { K, R:'#ff5a32', r:'#c0301e', W:'#f4f0e8', w:'#c8c4cc', N:'#2a2830' })); }
  // the arrow board trailer at the head of the closure: amber LED arrow chasing toward the open side (dir -1 left, 1 right)
  function arrowBoard(dir, ph){ return procSprite('sk_ab' + dir + ph, 26, 22, (x0, y) => { const x = dir > 0 ? x0 : 25 - x0;
    if(y >= 18){ if(y === 21) return (x >= 3 && x <= 6) || (x >= 19 && x <= 22) ? K : null; if(y === 18) return x >= 2 && x <= 23 ? K : null;
      if((x >= 3 && x <= 6) || (x >= 19 && x <= 22)) return x === 3 || x === 19 ? K : (y === 19 ? '#4a4652' : '#18161c'); return x >= 7 && x <= 18 && y === 19 ? '#3a3844' : null; }
    if(y >= 15){ if(x === 12 || x === 13) return y === 15 ? K : '#3a3844'; return null; }
    if(x === 0 || x === 25 || y === 0 || y === 14) return K;
    if(x === 1 || x === 24 || y === 1 || y === 13) return ((x + y) >> 1) % 2 ? '#ffd04a' : '#1a1418';
    // LED field: dots on even pixels inside 2..23 x 3..11; the arrow shaft on rows 6..8 and the head at the right
    if(x % 2 || y % 2 === 0 || x < 3 || x > 22) return '#121016';
    const cy = 7, head = x >= 15 && Math.abs(y - cy) <= (22 - x) * .9, shaft = x <= 16 && Math.abs(y - cy) <= 1, lit = head || shaft;
    if(!lit) return '#2a2018';
    const seg = x < 9 ? 0 : x < 15 ? 1 : 2; return (seg + 3 - ph) % 3 === 0 || ph < 0 ? '#fff0b0' : '#ff9a2a'; }); }
  // the front wheel in a wheelie, seen from behind: fender, edge-on tyre with a sliver of rim, chrome fork legs. 13 x 22.
  /* the front wheel in a wheelie, seen from behind and below (rear three-quarter photos of wheelies): the tyre reads as a tilted ellipse
     ring with the grey rim inside it, a short fender on top, and two chrome fork legs splaying out and down toward the bars. 16 x 15. */
  // the front wheel nearly edge-on from behind: a narrow dark tyre (12 x 7), a thin lit arc on its upper left, the fender, chrome fork legs to the bars
  const WHEEL = ['....KKKKKKKK....','...KnnnnnNNNK...','...KwwtTTTTTK...','..KwtTTTTTTTTK..','.KwTTTTTTTTTTTK.','KWKTTTTTTTTTTKvK','KWKTTTTTTTTTTKvK','KWvKTTTTTTTTKvvK','KWvKKTTTTTTKKvvK','.KWvKKKKKKKKvvK.','KWvK........KvvK','KWvK........KvvK','KWK..........KvK','KK............KK'];
  function wheel(ph){ const key = 'sk_wheel' + ph; return SPR[key] || (SPR[key] = makeSprite(WHEEL.map((r, y) => y >= 2 && y <= 8 ? [...r].map((ch, x) => ch === 'T' || ch === 't' ? ((x + y + ph) % 3 === 0 && y <= 4 ? 't' : 'T') : ch).join('') : r),
    { K, T:'#1c1a22', t:'#4a4652', w:'#c8c4d4', n:'#5a5868', N:'#34323e', W:'#e4e0ec', v:'#9894a4' }, false)); }
  // the underside a wheelie shows from behind: a dark chassis wedge around the rear tyre, the chain on the left, a chrome can on the right
  function belly(){ return procSprite('sk_belly', 26, 9, (x, y) => { const X = x + .5 - 13, hw = 4 + y * .45; if(Math.abs(X) > hw) return null;
    if(Math.abs(X) > hw - 1 || y === 0) return K;
    if(X > 3 && X < 8 && y >= 3 && y <= 7){ return y === 3 || y === 7 || X > 7 ? K : y === 3 ? '#e4e0ec' : y === 4 ? '#a8a4b0' : '#6a6878'; }   // exhaust can
    if(X < -3 && X > -8 && (x + y) % 3 === 0 && y >= 3 && y <= 7) return y < 4 ? '#c8c4d0' : '#8a8698';   // chain links
    return y < 3 ? '#3a3844' : '#1e1c26'; }); }
  // draft meter chevron: 0 unlit, 1 lit, 2 full
  function chev(m){ const key = 'sk_chev' + m; return SPR[key] || (SPR[key] = makeSprite(['...K...', '..KcK..', '.KcCcK.', 'KcK.KcK', 'KK...KK'],
    { K:m ? '#06121e' : '#0a0e18', c:['#122036', '#4ff0ff', '#bffcff'][m], C:['#182c46', '#e8ffff', '#ffffff'][m] }, false)); }
  // rubber smoke / dust puff: a stepped disc, lit from the upper left. r = radius in texels
  function puff(r, dust){ return procSprite('sk_puff' + r + dust, r * 2 + 1, r * 2 + 1, (x, y) => { const dx = x - r, dy = y - r, d = Math.hypot(dx, dy); if(d > r + .2) return null;
    const lit = (-dx - dy) / (r * 1.4) + (1 - d / r) * .5; const P = dust ? ['#3a3028', '#6a5a48', '#9a8a70'] : ['#3a3848', '#6a687c', '#a6a2b8'];
    return d > r - .9 ? P[0] : lit > .55 ? P[2] : P[1]; }); }
  // the bike's silhouette at 1x (rider hang f = -1..1), thresholded, plus the helmet top row, for hiding the wheel behind the rider
  function mask(id, f){ const key = 'sk_mask:' + id + ':' + f; if(SPR[key]) return SPR[key];
    const c = document.createElement('canvas'); c.width = 48; c.height = 60; const g = c.getContext('2d'), lean = f * .5;
    try{ g.translate(24, 56); g.rotate(-lean); if(ENV.bikes && ENV.bikes.render) ENV.bikes.render(g, id, 0, 0, 1, lean, 0, null); }catch(e){}
    g.setTransform(1, 0, 0, 1, 0, 0); const im = g.getImageData(0, 0, 48, 60), d = im.data; let top = 56 - 28;
    for(let i = 0; i < d.length; i += 4){ const on = d[i + 3] >= 150; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = on ? 255 : 0; }
    for(let y = 0; y < 60; y++){ let hit = false; for(let x = 20; x < 28; x++) if(d[(y * 48 + x) * 4 + 3]){ hit = true; break; } if(hit){ top = y; break; } }
    g.putImageData(im, 0, 0); c.top = top - 56; wheelCuts(c); return SPR[key] = c; }
  /* the wheelie's front wheel with this silhouette already cut out of it, for every spin phase and height (yo) drawWheel can ask for,
     built with the mask at warm-up: the wheel is then one draw of a prebuilt sprite, not the 48 x 100 buffer composed and copied every
     frame (a canvas drawn to in the same frame: WebKit stalls on those). One small sheet per mask (60 x 108: 3 phases across, 6 heights
     down, a 20 x 18 cell each), so warm-up makes 30 canvases, not 540 (5 ms for all six bikes, not 34). Each cut keeps a clear border in
     its cell, so the rotated draw's edge falls on empty texels. The pixels are the buffer's own: wheel at (16, OY + top - yo), the mask
     at (0, OY - 56). */
  const WC_Y0 = 3, WC_Y1 = 8, WC_W = 20, WC_H = 18;
  function wheelCuts(m){ const c = document.createElement('canvas'); c.width = 3 * WC_W; c.height = (WC_Y1 - WC_Y0 + 1) * WC_H; const g = c.getContext('2d');
    for(let ph = 0; ph < 3; ph++){ const wh = wheel(ph); for(let yo = WC_Y0; yo <= WC_Y1; yo++){ const x = ph * WC_W + 1, y = (yo - WC_Y0) * WC_H + 1;
      g.save(); g.beginPath(); g.rect(x, y, wh.width, wh.height); g.clip(); g.drawImage(wh, x, y); g.globalCompositeOperation = 'destination-out'; g.drawImage(m, x - 16, y - 56 - m.top + yo); g.restore(); } }
    m.wc = c; }
  function warm(){ if(warmed) return; warmed = true;
    for(let p = 0; p < 3; p++){ deckTex(p); wheel(p); arrowBoard(-1, p); arrowBoard(1, p); chev(p); }
    arrowBoard(-1, -1); arrowBoard(1, -1); arrowTex(); shadowTex(); belly(); beacon(0); beacon(1); barricade(0); barricade(1); cone();
    for(const r of [2, 3, 4, 5]){ puff(r, 0); puff(r, 1); }
    const ids = ENV.bikes && ENV.bikes.list ? ENV.bikes.list.map(b => b.id) : ['sport'];
    for(const id of ids) for(const f of [-1, -.5, 0, .5, 1]) mask(id, f); }
  S.warm = warm;
  const comp = document.createElement('canvas'); comp.width = 48; comp.height = 100; const cg = comp.getContext('2d');

  /* ---------------------------------------------------------------- placing kickers and roadworks */
  const LANES = [-.66, 0, .66];
  S.place = (i, s, L) => {
    if(i === 0){ zones = []; lastRamp = -1e9; }
    if(i <= lastRamp){ lastRamp = -1e9; zones = zones.filter(z => z.r0 < i); }   // the road past a border was regenerated
    const pv = segs[i - 1]; if(pv && pv.skRes && pv.hz) pv.hz = null;   // keep oil and pads off our stretch
    if(i < 380 || i - lastRamp < RAMP_GAP || s.tunnel || s.gore || Math.random() > RAMP_P) return;
    const a = i - 44, b = i + 4 + ZLEN + 5; if(!segs[b] || a < 0) return;
    for(let j = a; j <= b; j++){ const q = segs[j]; if(Math.abs(q.curve) > (j >= i - 6 && j <= i + 8 ? .5 : 1.2) || q.gore || q.tunnel || q.skRes || gates.includes(j)) return; }
    for(const g of gates) if(g >= a - 20 && g <= b + 30) return;
    if(window.inForkWindow && inForkWindow(a, b)) return;   // the visible fork (?split=1) keeps its window clear
    const x = LANES[(Math.random() * 3) | 0], zone = Math.random() < .55;
    // a double (Excitebike's double hill): a second kicker in the same lane DBL segments on, landed on by distance, so holding the line flies
    // you off both. Only on a clear straight stretch, and never at the head of roadworks.
    let dbl = !zone && Math.random() < DBL_P && segs[i + DBL + 10]; if(dbl) for(let j = b; j <= i + DBL + 10; j++){ const q = segs[j]; if(Math.abs(q.curve) > .5 || q.gore || q.tunnel || q.skRes || gates.includes(j)) { dbl = false; break; } }
    if(dbl && window.inForkWindow && inForkWindow(a, i + DBL + 10)) dbl = false;
    lastRamp = i; placed++; const R = makeRamp(i, x, zone, a, dbl ? i + DBL + 10 : b);
    if(dbl){ const R2 = makeRamp(i + DBL, x, false, i + DBL, i + DBL + 10, true); R.next = R2; R2.second = true; lastRamp = i + DBL; }
  };
  function makeRamp(i, x, zone, a, b, solo){ const open = x === 0 ? (Math.random() < .5 ? -1 : 1) : -Math.sign(x);
    const R = { r0:i, z0:i * SEG, x, zone, used:false, za:i + 7, zb:i + 7 + ZLEN, hit:false, open };
    zones.push(R);
    for(let j = a; j <= b; j++){ segs[j].skRes = 1; if(j < i) segs[j].hz = null; }
    for(let j = i; j < i + 4; j++) segs[j].skR = R;
    if(!solo) for(const d of [36, 24, 12]) (segs[i - d].sk = segs[i - d].sk || []).push({ t:'arrow', x, len:2 * SEG });
    const put = (j, e) => { const q = segs[j]; (q.sk = q.sk || []).push(e); };
    if(zone){ put(R.za, { t:'board', x, dir:open });
      for(let j = R.za; j <= R.zb; j++){ const k = j - R.za;
        if(k % 2 === 0) for(const sd of [-1, 1]) if(Math.abs(x + sd * .36) < 1) put(j, { t:'cone', x:x + sd * .36 });
        if(k % 6 === 0) for(const o of [-.17, .17]) put(j, { t:'bar', x:x + o }); }
    }
    R.end = zone ? R.zb : i + 4; return R; }
  S.force = (i, x, zone, dbl) => { const R = makeRamp(i, x, zone, i - 44, dbl ? i + DBL + 10 : i + 4 + ZLEN + 5); if(dbl){ R.next = makeRamp(i + DBL, x, false, i + DBL, i + DBL + 10, true); R.next.second = true; } return R; };   // testing: put a kicker (or a double) at segment i   // testing: put a kicker at segment i

  /* ---------------------------------------------------------------- update */
  const bsz = () => Math.min(W * .2, H * .27);
  const bikeHW = () => 13 * Math.max(PX, Math.round(bsz() / 30 / PX) * PX) / W;   // the bike's half width in half-roads at its depth (as the core's wallX)
  function kick(peak){ wPeak = Math.max(wPeak, peak); wHold = .32; wv = Math.max(wv, 10); st.wheelies++;
    if(!reduce){ for(let k = 0; k < 10; k++) sparks.push({ x:W / 2 + rr(-10, 10), y:H - 12, vx:rr(-220, 220), vy:rr(-320, -80), life:rr(.25, .45), c:k % 3 ? '#ffd04a' : '#ff8a2a' }); }
    for(let k = 0; k < 6; k++) puffs.push({ x:(k % 2 ? 1 : -1) * rr(10, 40), y:-rr(8, 20), vx:(k % 2 ? 1 : -1) * rr(40, 140), vy:rr(-40, 10), life:rr(.45, .7), max:.7, r:2 + (k % 3), dust:0 }); }
  S.pad_boost = () => { if(state === 'play') kick(.85); };
  function sling(){ const p = dm; if(p < DMIN || S._nosling){ dm = 0; return; }
    const had = boostT > 0; speed = Math.max(speed, MAXS * (1 + .07 * p)); boostT = Math.max(boostT, .2 + .5 * p); if(!had) boostTier = 1;
    if(copT > 0) copT = Math.max(.01, copT - p);
    st.slips++; st.bestSlip = Math.max(st.bestSlip, p);
    if(p >= .9){ flow++; bestFlow = Math.max(bestFlow, flow); }
    M.noise(.45, 2600, .05 + p * .04); M.tone(660 + p * 440, .25, { type:'triangle', v:.025 });
    floatText(p >= .9 ? 'Slipstream!' : 'Slipstream', W / 2, H * .46, 20 + Math.round(p * 8), '#9ff6ff'); hud();
    for(let k = 0; k < 16; k++) streaks.push(ray(rr(.2, .5), 2.4)); dm = 0; }
  // a wind streak: a pixel line running out along a ray from the car's tail (the air parting around it), growing as it nears you
  function ray(r, f){ return { a:rr(-.12, 1.12) * Math.PI, r, v:rr(.9, 1.5) * f, fat:Math.random() < .35, back:Math.random() < .45 }; }
  function launch(R){ const sp = speed / MAXS, bs = bsz(); let T = lerp(.6, 1.2, clamp((sp - .5) / .7, 0, 1));
    if(R.zone) T = Math.max(T, Math.min(1.35, ((R.zb + 2) * SEG - (position + PZ)) / Math.max(speed, 1)));
    // over roadworks the flight lasts until you are past them: by distance as well as time (a slide or a slow lip used to set you down
    // among the barricades, a crash right after a good jump); held to 2.2 s at most
    const z0 = position + PZ, D = R.zone ? (R.zb + 2) * SEG - z0 : 0;
    air = { t:0, T, h0:RH * H / ROADW, hpk:bs * (.22 + .4 * clamp((T - .6) / .6, 0, 1)), R, z0, D }; st.jumps++;
    if(R.next){ air.dbl = R.next; air.D = R.next.z0 + RLEN * .5 - z0; air.T = Math.max(.6, air.D / Math.max(speed, 1)); air.hpk = bs * (.22 + .3 * clamp((air.T - .5) / .6, 0, 1)); air.h1 = 0; }
    M.noise(.35, 600, .08); M.tone(220, .3, { type:'triangle', v:.04 }); }
  // touching down on a double's second deck: a thud, a short hit, a style beat, and you ride it up and off its lip
  function doubleHit(){ M.noise(.18, 240, .12); M.tone(70, .2, { v:.06 }); const J = MECH.sp_jump; if(J && J.impact) J.impact({ stop:.033, squash:bsz() * .02 });
    if(!reduce){ shake = Math.max(shake, 3); for(let k = 0; k < 8; k++) spark(W / 2 + rr(-14, 14), H - 10, rr(-220, 220), rr(-160, -40), .25, '#ffd04a'); }
    st.doubles = (st.doubles || 0) + 1; if(MECH.style && MECH.style.act) MECH.style.act('style', 250); floatText('Double', W / 2, H * .46, 24, '#ffb35a'); }
  function land(){ const a = air; air = null; AIR.h = 0; lift = 0;
    if(a.crest){ crestLand(a); return; }
    if(!a.R){ M.noise(.25, 220, .14); return; }   // a side drop off the deck: just the thump (no jump, so no landing callout or reward)
    // straight within the last LAND_BUF s counts (a landing buffer, like Celeste's jump buffer): you see the road come up and straighten a
    // beat early or a hair late, and the lean, which eases, no longer punishes the frame you let go
    const clean = (Math.abs(leanV) < landThr() || (a.ok !== undefined && a.t - a.ok <= LAND_BUF)) && Math.abs(playerX) < wallX() && state === 'play';
    for(let k = 0; k < 8; k++) puffs.push({ x:(k % 2 ? 1 : -1) * rr(14, 60), y:-rr(6, 16), vx:(k % 2 ? 1 : -1) * rr(80, 220), vy:rr(-60, 0), life:rr(.4, .65), max:.65, r:2 + (k % 4), dust:1 });
    if(!reduce){ shake = Math.max(shake, 4); for(let k = 0; k < 8; k++) sparks.push({ x:W / 2 + rr(-14, 14), y:H - 10, vx:rr(-260, 260), vy:rr(-200, -40), life:.3, c:'#ffd04a' }); }
    M.noise(.25, 220, .14); if(state !== 'play') return;
    const big0 = a.T >= .95, perfect = clean && a.lvl0 !== undefined && a.t - a.lvl0 >= PERF_LVL, J = MECH.sp_jump;
    if(J && J.impact) J.impact({ stop:perfect ? .066 : clean ? (big0 ? .05 : .033) : .033, squash:bsz() * (perfect ? .034 : clean ? .026 : .02) });   // the landing hit (setpiece/jump.js): hit-stop, then the forks
    if(perfect){ M.tone(46, .45, { v:.09 }); if(MECH.style && MECH.style.act) MECH.style.act('style', big0 ? 300 : 200); if(!reduce) for(let k = 0; k < 16; k++){ const ang = Math.PI * k / 15; spark(W / 2, H - 12, Math.cos(ang) * rr(300, 460), -Math.sin(ang) * rr(150, 260), rr(.3, .45), k % 3 ? '#4ff0ff' : '#ffffff'); } }   // a level touchdown: a style beat and a fan of sparks
    if(clean){ const big = a.T >= .95, had = boostT > 0; boostT = Math.max(boostT, (big ? 1.1 : .7) + (perfect ? .4 : 0)); if(!had || boostTier < (big ? 2 : 1)) boostTier = big ? 2 : 1;
      speed = Math.max(speed, MAXS * (big ? 1.1 : 1.05)); M.boost(big ? 2 : 1, flow); if(copT > 0) copT = Math.max(.01, copT - (big ? 2 : 1));
      if(big){ st.bigAir++; flow++; bestFlow = Math.max(bestFlow, flow); }
      const sc = a.R && a.R.zone; if(sc){ st.shortcuts++; if(copT > 0) copT = Math.max(.01, copT - 1); }
      floatText(sc ? (big ? 'Big air · shortcut' : 'Shortcut') : big ? 'Big air' : 'Clean landing', W / 2, H * .46, big ? 28 : 22, big ? '#ffb35a' : '#4ff0ff'); kick(.3); hud(); }
    else { speed *= .9; slideT = Math.max(slideT, .3); slideDir = Math.sign(leanV) || 1; floatText('Wobble', W / 2, H * .5, 22, '#ffc0c0'); } }
  // the road's downward bend under you, as the acceleration it would take to follow it (world units/s^2), over 3 segments
  const gradeAt = i => { const q = segs[i]; return q ? (q.p2.world.y - q.p1.world.y) / SEG : 0; };
  function crestAcc(pz){ const i = Math.floor(pz / SEG); return -speed * speed * (gradeAt(i + 2) - gradeAt(i - 1)) / (3 * SEG); }
  function crest(pz, dt){ crestCD = Math.max(0, crestCD - dt);
    if(crestCD > 0 || state !== 'play' || speed < MAXS * CREST.minSp || AIR.h >= 1 || cool > 0 || (MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying())) return;
    const gentle = window.ASSIST && ASSIST.jumps, G = CREST.G * (gentle ? 1.5 : 1), acc = crestAcc(pz); if(acc < G) return;
    const I = Math.sqrt(clamp((acc - G) / (G * CREST.span), 0, 1)) * (gentle ? .6 : 1),   /* (square root: a crest just over the line already reads as a hop) */ T = lerp(CREST.T0, CREST.T1, I);
    air = { t:-CREST.pre, T, h0:0, hpk:bsz() * lerp(CREST.h0, CREST.h1, I), R:null, crest:true, I }; crestCD = CREST.cd; hops++; hopT += T; { const k = LANDS[segAt(pz).land].key; hopBy[k] = (hopBy[k] || 0) + 1; }
    // never land on a car you could not see: traffic beyond the crest that would be under you at touchdown moves to a free lane (it is out
    // of sight behind the crest) or, with none free, a little further up the road
    const zl = pz + speed * T, hb = .2 + bikeHW();
    for(const c of cars){ if(c.oth || c.z < pz + 800) continue; const at = c.z + c.speed * T; if(Math.abs(at - zl) > 900 || Math.abs(c.x - playerX) > hb + .2) continue;
      const L = LANES.find(L2 => Math.abs(L2 - playerX) > hb + .25 && !cars.some(k => k !== c && Math.abs(k.x - L2) < .4 && Math.abs(k.z - c.z) < 2000));
      if(L !== undefined){ c.x = L; c.tl = undefined; c.sig = 0; } else c.z = zl + 2400 - c.speed * T; } }
  function crestLand(a){ const I = a.I || 0; S._landT = playT;
    M.noise(.18 + .1 * I, 240, .1 + .06 * I);
    for(let k = 0; k < 4 + Math.round(4 * I); k++) puffs.push({ x:(k % 2 ? 1 : -1) * rr(10, 44), y:-rr(4, 12), vx:(k % 2 ? 1 : -1) * rr(60, 180), vy:rr(-50, 0), life:rr(.3, .5), max:.5, r:2 + (k % 3), dust:1 });
    { const J = MECH.sp_jump; if(J && J.impact) J.impact({ stop:a.T >= .65 ? .033 : 0, squash:bsz() * (.01 + .018 * I) }); }   // a hop lands too: the forks take it (and a big one holds two frames)
    if(!reduce){ shake = Math.max(shake, 2 + 3 * I); for(let k = 0; k < 4 + Math.round(6 * I); k++) spark(W / 2 + rr(-14, 14), H - 10, rr(-240, 240), rr(-180, -40), .28, '#ffd04a'); }
    if(state !== 'play' || a.T < CREST.judge) return;
    const clean = (Math.abs(leanV) < landThr() || (a.ok !== undefined && a.t - a.ok <= LAND_BUF)) && Math.abs(playerX) < wallX();
    if(clean){ if(MECH.style && MECH.style.act) MECH.style.act(a.T >= .65 ? 'bigair' : 'land', Math.round(60 + 140 * I)); kick(.2 + .2 * I); }
    else { speed *= .93; leanV += (Math.sign(leanV) || 1) * .12; floatText('Wobble', W / 2, H * .5, 22, '#ffc0c0'); } }   /* (a crest wobble costs speed but never slides you: you didn't choose the hop) */
  S.hops = () => ({ hops, hopT, by:hopBy });
  S.update = dt => {
    const pz = position + PZ, prev = lastPZ === null ? pz : lastPZ; lastPZ = pz;
    // wheelie spring: a quick throttle pop held for a moment, then the front drops and bounces once on the fork
    if(wHold > 0){ wHold -= dt; wv += (180 * (wPeak - wp) - 22 * wv) * dt; }
    else { wv += (-40 * wp - 3.2 * wv) * dt; if(wPeak && wp < .02) wPeak = 0; }
    wp += wv * dt; if(wp < 0){ wp = 0; wv = wv < -.6 ? -wv * .28 : 0; } wp = Math.min(wp, 1);
    if(state === 'ready'){ lift = 0; if(camK){ camK = false; MECH.sp_jump.camLift(0); } if(ownAir){ AIR.h = 0; ownAir = false; } if(lastMine){ POSE.pitch = 0; lastMine = 0; } air = null; deck = null; return; }
    if(crashes !== lastCrashes){ lastCrashes = crashes; dm = 0; dCar = null; }
    if(boosts !== lastBoosts){ lastBoosts = boosts; if(boostTier >= 3 && state === 'play') kick(.5); }
    // kickers: ride up the deck, fly off the lip
    // On the deck is judged by what you see: the bike's centre line within the drawn deck plus half the bike's width gets you on, and
    // you stay on until the whole bike is past the edge. (It used to be the bare deck half width both ways, so a bike half over the edge
    // never launched, and one frame's wobble past the edge dropped you off for good, even when you were back on the deck at the lip.)
    const sg = segs[Math.floor(pz / SEG)], R = sg && sg.skR, dR = R ? Math.abs(playerX - R.x) : 9, bw = bikeHW();
    if(air && !air.R && R && !R.used && dR < RHW + bw * .5 && state === 'play'){ air = null; deck = R; }   // a side drop that swings back onto the deck rides it on
    if(air && air.crest){ air.t += dt; if(Math.abs(leanV) < landThr()) air.ok = air.t; if(state === 'play') M.rev = Math.max(M.rev, .55);   // the engine note climbs as the rear wheel spins free
      if(air.t < 0){ AIR.h = 2 * (1 + air.t / CREST.pre); airPitch = 0; }   // the suspension unloads for a beat before the wheels leave the road
      else { const u = air.t / air.T; if(u >= 1) land(); else { AIR.h = 4 * air.hpk * u * (1 - u); airPitch = clamp(.28 - u * .7, 0, .28); } } }
    else if(air){ air.t += dt; const lv = Math.abs(leanV) < landThr() && !(keys.left || keys.right || touchSteer || padSteer); if(Math.abs(leanV) < landThr()) air.ok = air.t; if(lv){ if(air.lvl0 === undefined) air.lvl0 = air.t; } else air.lvl0 = undefined;
      if(air.dbl){ const on = Math.abs(playerX - air.dbl.x) < RHW + bw * .5 && !air.dbl.used; air.h1 += ((on ? RH * .5 * H / ROADW : 0) - air.h1) * (1 - Math.exp(-6 * dt)); }   // lined up on the second deck, the arc comes down onto it
      const u = air.dbl ? Math.max((pz - air.z0) / air.D, air.t / 2.2) : air.D > 0 ? Math.min(air.t / air.T, Math.max((pz - air.z0) / air.D, air.t / 2.2)) : air.t / air.T;
      if(u >= 1){ const R2 = air.dbl; if(R2 && !R2.used && Math.abs(playerX - R2.x) < RHW + bw * .5 && state === 'play'){ air = null; deck = R2; doubleHit(); } else land(); }
      else { lift = air.h0 * (1 - u) + (air.h1 || 0) * u + 4 * air.hpk * u * (1 - u); airPitch = clamp(.55 - u * 1.4, 0, .55); } }
    else { const pR = deck;
      if(R && state === 'play' && (dR < RHW + bw * .5 || (R === pR && dR < RHW + bw))){ deck = R; const v = clamp((pz - R.z0) / RLEN, 0, 1); lift = RH * v * H / ROADW; airPitch = .35 * v; }
      else if(pR && pz >= pR.z0 + RLEN && prev < pR.z0 + RLEN + 400){ deck = null; if(!pR.used){ pR.used = true; launch(pR); } }
      else if(pR){ deck = null; air = { t:0, T:.22, h0:lift, hpk:0, R:null }; }   // rolled off the side of the deck: a short drop
      else { if(ownAir) AIR.h = 0; airPitch = 0; crest(pz, dt); } }
    // a kicker hop raises the camera with the bike, as a landmark jump does (setpiece/jump.js camUp / floatW): of the lift, the bike floats
    // a modest share above the camera's ride height (AIR.h: all of a small lift, easing to 20% of the rest, ~95 px at the top of a big hop)
    // and the camera takes the rest, eased in off the road and out onto it (zero slope at zero lift). So the bike stays in the lower third,
    // clear of the HUD. AIR.h never drops under 7 px while the lift is 7+, so every 'AIR.h >= 6' airborne test reads as before. jump.js
    // applies the rise (camLift) and owns the camera while its own jump lifts the bike; then the bike just takes the whole lift, as before.
    { const kk = (air && !air.crest) || deck, J = MECH.sp_jump;
      if(kk){ const a = bsz() * .3, f = Math.min(lift, Math.max(.2 * lift + .8 * a * Math.tanh(lift / a), 7)); camK = !!(J && J.camLift && J.camLift((lift - f) * ROADW / H)); AIR.h = camK ? f : lift; }
      else if(camK){ camK = false; if(J && J.camLift) J.camLift(0); } }
    ownAir = !!(air || deck);
    if(wp > .3 && AIR.h < 1 && state === 'play' && !reduce && Math.random() < .7) spark(W / 2 + rr(-6, 6), H - 10, rr(-90, 90), rr(-140, -30), rr(.15, .3), Math.random() < .5 ? '#ffd04a' : '#ff8a2a');   // (the core's pooled sparks: no garbage per frame)
    // only touch AIR / POSE while we own them, so other set pieces (setpiece/jump.js) can lift the bike too
    const mine = Math.max(wp, airPitch); if(mine > 0 || lastMine > 0) POSE.pitch = mine; lastMine = mine;
    if(state !== 'play'){ dm = Math.max(0, dm - dt * 2); return; }
    // roadworks: the closed lane is solid; traffic merges out of it well ahead
    for(const z of zones){ if(!z.zone || z.hit) continue; if(pz < z.za * SEG || pz > (z.zb + 1) * SEG) continue;
      if(Math.abs(playerX - z.x) < .36 && AIR.h < 6 && cool <= 0 && recov <= 0){ z.hit = true; crash({ x:z.x + (playerX > z.x ? -.2 : .2) }); } }
    // soft roadworks kit the bike's body passes through (a cone on the lane line, a barricade or the arrow board you hit) breaks apart
    // instead of passing through you (mech/breakfx.js: the prop's own sprite splits and tumbles away)
    if(MECH.breakfx && AIR.h < 6){ const j0 = Math.floor(prev / SEG) + 1, j1 = Math.min(Math.floor(pz / SEG), j0 + 6);
      for(let j = j0; j <= j1; j++){ const q = segs[j]; if(!q || !q.sk) continue;
        for(const e of q.sk){ if(e.broken || e.t === 'arrow' || Math.abs(playerX - e.x) > (e.t === 'board' ? .2 : .13)) continue; e.broken = true;
          const spr = e.t === 'cone' ? cone() : e.t === 'bar' ? barricade(1) : arrowBoard(e.dir, 0), r = e.t === 'cone' ? .0055 : e.t === 'bar' ? .0065 : .011;
          MECH.breakfx.hit({ spr, z:j * SEG, x:e.x, r, n:e.t === 'board' ? 3 : 2, kind:'smash', pts:e.t === 'cone' && playT - smashT > 2 ? (smashT = playT, 30) : 0, vol:e.t === 'cone' ? .7 : 1 }); } } }
    { let n = 0; for(let i = 0; i < zones.length; i++){ const z = zones[i]; if((z.end || z.zb) * SEG > pz - 2000 || z.r0 * SEG > pz) zones[n++] = z; } zones.length = n; }   // compacted in place (no array per frame)
    if(!S._nomerge) for(const c of cars){ for(const z of zones){ const zi = c.z / SEG; if(zi < z.r0 - 90 || zi > (z.zone ? z.zb : z.r0 + 4) || Math.abs(c.x - z.x) > .4 || c.z - pz < 5000) continue;
      const to = z.x + z.open * .66; c.x += clamp(to - c.x, -1.3 * dt, 1.3 * dt); c.sig = Math.abs(to - c.x) > .01 ? Math.sign(to - c.x) : 0; } }   // blinker on while merging (core drawCar)
    // slipstream: in a car's lane, close behind it, at speed
    let best = null, bd = DZ;
    if(speed > MAXS * .6 && AIR.h < 1 && cool <= 0) for(const c of cars){ const d = c.z - pz; if(d > 80 && d < bd && Math.abs(c.x - playerX) < DX){ bd = d; best = c; } }
    if(best){ if(dCar && best !== dCar && dm >= DMIN) sling(); dCar = best; dTow += dt; dm = Math.min(1, dm + dt * (.4 + 1.15 * (1 - bd / DZ))); }
    else { if(dCar && dm >= DMIN && dCar.z > pz - 150 && Math.abs(dCar.x - playerX) >= DX) sling(); dCar = null; dTow = 0; dm = Math.max(0, dm - dt * 2.5); }
    // particles
    if(dCar && dScr && !reduce){ const n = dt * (30 + 90 * dm), cnt = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); for(let k = 0; k < cnt; k++) streaks.push(ray(.04, 1)); }
    for(const p of streaks) p.r += p.v * dt * (.25 + p.r * 1.6);
    { let n = 0; for(let i = 0; i < streaks.length; i++) if(streaks[i].r < 1.25) streaks[n++] = streaks[i]; streaks.length = n; } if(streaks.length > 70) streaks.splice(0, streaks.length - 70);
    { let n = 0; for(let i = 0; i < puffs.length; i++){ const p = puffs[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-2.5 * dt); p.vy -= 30 * dt; p.life -= dt; if(p.life > 0) puffs[n++] = p; } puffs.length = n; }
  };
  S.reset = () => { dm = 0; dCar = null; dScr = null; streaks = []; puffs = []; air = null; deck = null; lastPZ = null; lastCrashes = 0; lastBoosts = 0;
    wp = 0; wv = 0; wHold = 0; wPeak = 0; airPitch = 0; crestCD = 0; hops = 0; hopT = 0; hopBy = {}; ownAir = false; lastMine = 0; lift = 0; camK = false; st = { slips:0, bestSlip:0, jumps:0, bigAir:0, shortcuts:0, wheelies:0 }; warm(); };

  /* ---------------------------------------------------------------- drawing in the world */
  const near0 = () => Math.floor(position / SEG) + 1;
  // the road point at world z, x half-roads across, lifted hW world units; null if that segment isn't projected this frame
  function proj(z, x, hW){ const j = Math.floor(z / SEG), n0 = near0(); if(j < n0 || j >= n0 + DRAW - 2) return null; const s = segs[j]; if(!s || !s.p1.screen.scale) return null;
    const p = (z - j * SEG) / SEG, a = s.p1.screen, b = s.p2.screen, w = lerp(a.w, b.w, p); return { x:lerp(a.x, b.x, p) + x * w, y:lerp(a.y, b.y, p) - hW * w * H / (ROADW * W), w }; }
  // a textured quad lying along the road from z0 for len, half width hw, rising to hTop at the far end, drawn in pixel rows
  const TB = [];
  function quad(tex, z0, len, x, hw, hTop, alpha){ TB.length = 0; const n0z = near0() * SEG;
    for(let k = 0; k <= 12; k++){ const v = k / 12, z = z0 + v * len; if(z < n0z) continue; const p = proj(z, x, hTop * v); if(p){ p.v = v; TB.push(p); } }
    if(TB.length < 2) return null; const yb = Math.min(H, TB[0].y), yt = TB[TB.length - 1].y; if(yb - yt < 1) return TB;
    cx.imageSmoothingEnabled = false; cx.globalAlpha = alpha; let k = 0;
    for(let yy = Math.ceil(yb / PX) * PX - PX; yy >= Math.floor(yt / PX) * PX; yy -= PX){ const ym = yy + PX / 2; while(k < TB.length - 2 && TB[k + 1].y > ym) k++;
      const A = TB[k], B = TB[k + 1], f = A.y === B.y ? 0 : clamp((A.y - ym) / (A.y - B.y), 0, 1), v = lerp(A.v, B.v, f), xc = lerp(A.x, B.x, f), w = lerp(A.w, B.w, f) * hw;
      if(w < .5) continue; const tr = clamp(Math.floor((1 - v) * tex.height), 0, tex.height - 1), x0 = Math.round((xc - w) / PX) * PX, x1 = Math.round((xc + w) / PX) * PX;
      cx.drawImage(tex, 0, tr, tex.width, 1, x0, yy, Math.max(PX, x1 - x0), PX); }
    cx.globalAlpha = 1; return TB; }
  function drawRamp(R, fog, now){ const ph = reduce ? 0 : Math.floor(now / 140) % 3, a = 1 - fog * .55, z1 = R.z0 + RLEN;
    // the side wall facing us: a dark steel web with struts, under the deck's edge
    const camX = playerX, sd = R.x > camX ? -1 : 1, ex = R.x + sd * RHW;
    if(Math.abs(R.x - camX) > .05){ const zN = Math.max(R.z0, near0() * SEG), F = proj(z1, ex, 0), T = proj(z1, ex, RH), N = proj(zN, ex, RH * clamp((zN - R.z0) / RLEN, 0, 1)), G0 = proj(zN, ex, 0);
      if(F && T && N && G0){ cx.globalAlpha = a; cx.fillStyle = '#3a3850'; cx.beginPath(); cx.moveTo(N.x, N.y); cx.lineTo(T.x, T.y); cx.lineTo(F.x, F.y); cx.lineTo(G0.x, G0.y); cx.closePath(); cx.fill();
        for(const v of [.4, .7, 1]){ const z = R.z0 + v * RLEN, P = proj(z, ex, RH * v), G = proj(z, ex, 0); if(!P || !G) continue; const sw = Math.max(PX, Math.round(P.w * .014 / PX) * PX);
          cx.fillStyle = '#56546a'; cx.fillRect(Math.round(P.x / PX) * PX - (sd < 0 ? sw : 0), P.y, sw, G.y - P.y); cx.fillStyle = '#ffd04a'; cx.fillRect(Math.round(P.x / PX) * PX - (sd < 0 ? sw : 0), P.y, sw, Math.max(PX, sw)); }
        // a hazard-striped skirt along the deck's edge, stepped on the pixel grid
        const len = Math.hypot(T.x - N.x, T.y - N.y), n = Math.floor(len / PX), sw = Math.max(PX, Math.round(T.w * .012 / PX) * PX);
        for(let i = 0; i <= n; i++){ const t = i / Math.max(1, n), X = Math.round(lerp(N.x, T.x, t) / PX) * PX - (sd < 0 ? sw : 0), Y = Math.round(lerp(N.y, T.y, t) / PX) * PX;
          cx.fillStyle = Math.floor(i / 4) % 2 ? '#1a1418' : '#ffc83a'; cx.fillRect(X, Y, sw, sw + PX); }
        cx.globalAlpha = 1; } }
    quad(deckTex(ph), R.z0, RLEN, R.x, RHW, RH, a);
    // the lip stands proud: a dark top edge, a hot highlight row, then a lit hazard face under it
    const L1 = proj(z1, R.x - RHW, RH), R1 = proj(z1, R.x + RHW, RH);
    if(L1 && R1){ const th = Math.max(PX * 2, Math.round(L1.w * .022 / PX) * PX), x0 = Math.round(L1.x / PX) * PX, x1 = Math.round(R1.x / PX) * PX, y0 = Math.round(Math.min(L1.y, R1.y) / PX) * PX, sw = Math.max(PX * 2, Math.round(L1.w * .03 / PX) * PX);
      cx.globalAlpha = a; cx.fillStyle = K; cx.fillRect(x0 - PX, y0 - PX * 2, x1 - x0 + PX * 2, th + PX * 3);
      cx.fillStyle = '#fff4c0'; cx.fillRect(x0, y0 - PX, x1 - x0, PX);
      for(let x = x0; x < x1; x += sw){ cx.fillStyle = Math.floor((x - x0) / sw) % 2 ? '#2a1a14' : '#ffc040'; cx.fillRect(x, y0, Math.min(sw, x1 - x), th); }
      cx.fillStyle = '#a86a1c'; cx.fillRect(x0, y0 + th - PX, x1 - x0, PX);
      // the overhang's shadow wedge on the deck under the lip: stepped dark bands, narrowing toward the toe
      for(let i = 0; i < 3; i++){ const inset = (i + 1) * PX; cx.fillStyle = `rgba(6,4,10,${.7 - i * .2})`; cx.fillRect(x0 + inset, y0 + th + i * PX * 2, x1 - x0 - inset * 2, PX * 2); }
      cx.globalAlpha = 1;
      glow((x0 + x1) / 2, y0, (x1 - x0) * .45, '#ffb050', .22 * (1 - fog * .5)); }
    // amber lamps down both deck edges, chasing toward the lip (steady when motion is reduced)
    for(let q = 1; q <= 3; q++){ const v = q / 4, on = reduce ? 1 : (q + Math.floor(now / 150)) % 3 === 0 ? 1 : 0;
      for(const s2 of [-1, 1]){ const P = proj(R.z0 + v * RLEN, R.x + s2 * (RHW - .015), RH * v); if(!P) continue; const z = Math.max(PX, Math.round(P.w * .012 / PX) * PX);
        cx.globalAlpha = a; cx.fillStyle = K; cx.fillRect(Math.round(P.x / PX) * PX - z, P.y - z * 2, z * 2 + PX, z * 2 + PX); cx.fillStyle = on ? '#fff0b0' : '#ff9a2a'; cx.fillRect(Math.round(P.x / PX) * PX - z + PX, P.y - z * 2 + PX, z * 2 - PX, z * 2 - PX); cx.globalAlpha = 1;
        glow(P.x, P.y - z, P.w * (on ? .09 : .05), '#ffa040', (on ? .5 : .28) * (1 - fog * .5)); } }
    // beacons on the lip corners, stepped amber glow (steady when motion is reduced)
    for(const s2 of [-1, 1]){ const P = proj(z1, R.x + s2 * (RHW - .02), RH); if(!P) continue; const k = Math.max(1, P.w * .0065), on = reduce ? 1 : (Math.floor(now / 260) + (s2 > 0 ? 1 : 0)) % 2;
      cx.globalAlpha = a; blit(beacon(on), P.x, P.y + k, k); cx.globalAlpha = 1; glow(P.x, P.y - 9 * k, P.w * (on ? .16 : .1), '#ffa040', (on ? .55 : .3) * (1 - fog * .5)); } }
  S.drawSeg = (s, sx0, sy0, uw, fog, now) => {
    if(state === 'ready' && typeof attractRun !== 'undefined' && attractRun) return;   // no kickers or roadworks behind the title: the attract ride keeps the centre line, and a kicker's hop would lift the bike behind PRESS START
    if(dCar && Math.floor(dCar.z / SEG) === s.index){ const pct = (dCar.z % SEG) / SEG; dScr = { x:lerp(s.p1.screen.x, s.p2.screen.x, pct) + dCar.x * lerp(s.p1.screen.w, s.p2.screen.w, pct), y:lerp(s.p1.screen.y, s.p2.screen.y, pct), w:lerp(s.p1.screen.w, s.p2.screen.w, pct) * .36 }; }
    const n0 = near0();
    if(s.skR){ const R = s.skR; if(s.index === Math.max(R.r0, n0)) drawRamp(R, fog, now); }
    if(s.sk){ const a = 1 - fog * .6, list = s.sk;
      for(let q = 0; q < list.length; q++){ const e = list[q]; if(e.broken) continue;
        if(e.t === 'arrow'){ quad(arrowTex(), s.index * SEG, e.len, e.x, .17, 0, .85 * (1 - fog * .7)); continue; }
        const x = sx0 + e.x * uw; cx.globalAlpha = a;
        if(e.t === 'cone'){ const k = uw * .0055; blit(cone(), x, sy0, k); }
        else if(e.t === 'bar'){ const k = uw * .0065, on = reduce ? 1 : (Math.floor(now / 330) + s.index) % 2; cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(x - 12 * k, sy0 - k, 24 * k, k); blit(barricade(on), x, sy0, k); cx.globalAlpha = 1; if(on) glow(x + .5 * k, sy0 - 14 * k, uw * .09, '#ffa040', .45 * (1 - fog * .5)); }
        else if(e.t === 'board'){ const k = uw * .011, ph = reduce ? -1 : Math.floor(now / 200) % 3; cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(x - 12 * k, sy0 - k, 24 * k, k); blit(arrowBoard(e.dir, ph), x, sy0, k); cx.globalAlpha = 1; glow(x, sy0 - 15 * k, uw * .22, '#ff9a2a', .35 * (1 - fog * .5)); }
        cx.globalAlpha = 1; } } };

  /* ---------------------------------------------------------------- drawing in screen space */
  const SC = ['#e8ffff', '#9ff0ff', '#4fb0e8', '#2a5a9a'];
  // each ray is a solid stepped line on the pixel grid (one cell per PX along it, no gaps), hot white at the tip cooling to blue at the tail.
  // Rays are batched by colour and alpha step into a few paths, so overlaps never stack and it costs a handful of fills. (Rays used to be
  // up to 26 separate dots spaced several pixels apart, which read as blue dither on the road behind the car.)
  const SPATH = []; for(let i = 0; i < 16; i++) SPATH.push(null);
  function drawStreaks(back){ if(!streaks.length) return; const o = dScr || { x:W / 2, y:H * .55, w:W * .1 }, R = Math.hypot(W, H) * .62, oy = o.y - o.w * .2;
    let any = false; for(let i = 0; i < 16; i++) SPATH[i] = null;
    for(const p of streaks){ if(p.back !== back) continue; const ux = Math.cos(p.a), uy = Math.sin(p.a) * .75 + .25, r1 = p.r * R, r0 = Math.max(o.w * .5, r1 * .62), m = Math.min(90, Math.floor((r1 - r0) / PX));
      if(m < 2) continue; const al = clamp((1.25 - p.r) * 3, 0, 1) * (.35 + .45 * Math.max(dm, .5)), aq = Math.round(al * 4); if(aq < 1) continue;
      for(let i = 0; i <= m; i++){ const t = i / m, c = t > .8 ? 0 : t > .5 ? 1 : t > .25 ? 2 : 3, rr2 = r0 + (r1 - r0) * t, sz = p.fat && c < 2 ? PX * 2 : PX, key = c * 4 + aq - 1;
        const P = SPATH[key] || (SPATH[key] = new Path2D()); P.rect(Math.round((o.x + ux * rr2) / PX) * PX, Math.round((oy + uy * rr2) / PX) * PX, sz, sz); any = true; } }
    if(!any) return; cx.globalCompositeOperation = 'lighter';
    for(let key = 0; key < 16; key++){ const P = SPATH[key]; if(!P) continue; cx.globalAlpha = ((key & 3) + 1) / 4; cx.fillStyle = SC[key >> 2]; cx.fill(P); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
  S.drawUnderBike = now => { drawStreaks(true);
    if(POSE.pitch >= .15){ const g = wgeo(now); drawGround(g); drawBeam(g, now); drawBelly(g); }
    for(const p of puffs){ if(p.dust !== 1) continue; drawPuff(p); } };
  function drawPuff(p){ const t = p.life / p.max, r = clamp(Math.round(p.r + (1 - t) * 2), 2, 5); cx.globalAlpha = Math.ceil(t * 4) / 4 * .7; blit(puff(r, p.dust), W / 2 + p.x, H + p.y, PX); cx.globalAlpha = 1; }
  // wheelie geometry: bike scale, bob, the wheel's place over the helmet, and a mapper from bike-local sprite px to screen
  function wgeo(now){ const p = POSE.pitch, id = ENV.bikes && ENV.bikes.render && BIKE.id ? BIKE.id : 'sport', hang = Math.round(clamp(leanV / .5, -1, 1) * 2) / 2, m = mask(id, hang);
    const bs = bsz(), k = Math.max(PX, Math.round(bs / 30 / PX) * PX), bob = speed > 10 ? Math.sin(now / 40) * (Math.abs(playerX) > 1 ? 2 : .6) : 0;
    const wy = Math.round(m.top - 2 - p * 3);   // wheel centre (local px): just behind the helmet, rising with the pitch
    const to = (lx, ly) => [W / 2 + (lx * Math.cos(leanV) - ly * Math.sin(leanV)) * k * (1 - p * .06), H - 8 + ((lx * Math.sin(leanV) + ly * Math.cos(leanV)) * k + bob - AIR.h) * (1 + p * .22)];
    return { p, m, k, bob, wy, to }; }
  function bikeXf(g){ cx.save(); cx.translate(W / 2, H - 8); cx.scale(1 - g.p * .06, 1 + g.p * .22); cx.translate(0, g.bob - AIR.h); cx.rotate(leanV); cx.imageSmoothingEnabled = false; }
  // the hero cue: the headlight now points at the sky, a stepped pixel cone from the front of the bike straight up
  function drawBeam(g, now){ const p = g.p; if(p < .2) return; const [ox, oy] = g.to(0, g.wy), f = clamp((p - .2) / .45, 0, 1), sx = Math.sin(leanV), step = PX * 2;
    cx.globalCompositeOperation = 'lighter';
    // lighter touch: thin additive bands that fade toward the sky, so the scene still reads through the beam
    for(const [wk, al, col] of [[1, .045, '#ffc870'], [.6, .07, '#ffe8b0'], [.26, .13, '#fffef0']]){ cx.fillStyle = col;
      for(let y = Math.floor(oy / step) * step; y > -step; y -= step){ const d = oy - y; cx.globalAlpha = al * f * Math.max(.15, 1 - d / Math.max(1, oy) * .85); const w = Math.round((g.k * 2 + d * .42 + d * d * .00035) * wk / step) * step, cxp = Math.round((ox + sx * d) / PX) * PX; cx.fillRect(cxp - w, y, w * 2, step); } }
    // motes of rain and dust caught in the beam, drifting up it
    cx.fillStyle = '#fffbe8';
    for(let i = 0; i < 14; i++){ const t = reduce ? hash(i * 7) : (now / 1400 + hash(i * 7)) % 1, d = t * oy, y = oy - d, w = g.k * 2 + d * .42, x = ox + sx * d + (hash(i * 13) - .5) * w * 1.4;
      cx.globalAlpha = f * .5 * (1 - t * .7); cx.fillRect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, PX, PX * (1 + (i % 3 === 0))); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; glow(ox, oy, g.k * 4, '#fff0c0', .4 * f); }
  function drawBelly(g){ const p = g.p; if(p < .2) return; const b = belly(), dy = Math.round(-1 - p * 3); bikeXf(g); cx.globalAlpha = clamp((p - .2) * 4, 0, 1);
    cx.drawImage(b, -13 * g.k, (dy - 9) * g.k, 26 * g.k, 9 * g.k); cx.globalAlpha = 1; cx.restore(); }
  // the shadow stretches ahead of the rearing bike and the rear tyre leaves a dark scuff
  function drawGround(g){ const p = g.p; if(p < .15) return; const k = g.k, n = 3;
    for(let i = 0; i < n; i++){ const h = Math.round(k * (2 + p * 10) * (1 - i / n) / PX) * PX, w = Math.round(k * (8 - i * 2) / PX) * PX; cx.fillStyle = `rgba(0,0,0,${.18 + i * .06})`; cx.fillRect(Math.round(W / 2 - w), H - 8 - h, w * 2, h); }
    cx.fillStyle = 'rgba(10,8,16,.55)'; for(const sd of [-1, 1]) cx.fillRect(Math.round((W / 2 + sd * k * 1.5) / PX) * PX, H - 8, PX, 8); }
  function drawWheel(now, g){ const p = g.p; if(p < .15) return; const m = g.m, OY = 96, ph = reduce ? 0 : Math.floor(now / 40) % 3, wh = wheel(ph);
    { const yo = Math.round(2 + p * 3.6), c = yo >= WC_Y0 && yo <= WC_Y1 ? m.wc : null;   // the prebuilt cut (wheelCuts); the buffer below only off its range
      if(c){ bikeXf(g); cx.drawImage(c, ph * WC_W, (yo - WC_Y0) * WC_H, WC_W, WC_H, -9 * g.k, (m.top - yo - 1) * g.k, WC_W * g.k, WC_H * g.k); cx.restore(); return; } }
    cg.globalCompositeOperation = 'source-over'; cg.clearRect(0, 0, 48, 100); cg.drawImage(wh, 16, OY + g.m.top - Math.round(2 + p * 3.6));
    cg.globalCompositeOperation = 'destination-out'; cg.drawImage(m, 0, OY - 56); cg.globalCompositeOperation = 'source-over';
    bikeXf(g); cx.drawImage(comp, -24 * g.k, -OY * g.k, 48 * g.k, 100 * g.k); cx.restore(); }
  S.drawScreen = now => { if(POSE.pitch >= .15) drawWheel(now, wgeo(now)); drawStreaks(false);
    for(const p of puffs) if(p.dust !== 1) drawPuff(p);
    // draft meter: five chevrons over the rider, filling as the tow builds; all white when a full slingshot is ready
    if(dm > .02 && state === 'play'){ const n = 5, lit = Math.floor(dm * n + .001), full = dm >= .999, bs = bsz(), k = PX, y0 = H - 8 - bs * .9 - AIR.h - POSE.pitch * bs * .5, gap = 9 * k;
      for(let i = 0; i < n; i++){ const c = chev(full ? 2 : i < lit ? 1 : 0); blit(c, W / 2 + (i - (n - 1) / 2) * gap, y0, k); }
      if(full) glow(W / 2, y0 - 2 * k, bs * .3, '#4ff0ff', reduce ? .2 : .2 + .1 * Math.sin(now / 90)); } };
  S.finish = rec => { rec.slipstreams = st.slips; rec.jumps = st.jumps; rec.bigAir = st.bigAir; rec.shortcuts = st.shortcuts; rec.wheelies = st.wheelies; };
  S._st = () => ({ st, dm, air, zones, puffs, placed });
})();
