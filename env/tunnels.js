/* Sundown environment: Night Tunnels. See env/README.md for the hooks.
   References studied (photos and games), rules taken, art drawn fresh:
   - Shuto Expressway Wangan tunnel (photo, Wikimedia Commons): two unbroken rows of luminaires along the upper corners, not the crown; the ceiling
     stays dark; ribbed wall panels catch the light as long horizontal streaks that converge on the vanishing point; small green signs low on the
     walls at intervals; red tail lights are the only other hue.
   - Hakkogan tunnel, Japan (photo, Commons): sodium light makes the whole scene a single orange ramp, black-brown to white-yellow; the lamp is a
     hot white core in a dark housing; green signs are the only complementary accent and so pop hard.
   - Nanshan tunnel, Shenzhen (photo, Commons): white LED alternative, cool grey-blue ramp, tile grid read through joints, a light line at the
     wall/ceiling join.
   - Night Striker (Taito, 1989) and Chase H.Q. (Taito, 1988): pseudo-3D rules: hard bands of colour per road segment, no smooth shading,
     lit windows as flat yellow grids, contrast carried by stepped tone, not gradients.
   Built here: a stepped-arch tunnel section per segment (ceiling, three-step haunch, upper wall, tiled lower panel, walkway), lit by a strict
   4-tone ramp chosen by distance to the nearest luminaire, so the walls strobe past; denser "threshold" lighting by both mouths; jet fans,
   emergency signs and phones, lane-control gantries; a concrete portal with a name plate; cut walls on the approach; sodium tunnels and LED
   tunnels alternate; an overlay grades the whole frame (bike and traffic too) and pulses as each lamp passes overhead. */
"use strict";
(() => {
  // ---- palettes: 5-step ramps (0 darkest .. 4 hottest); sodium and LED tunnels alternate
  const SOD = { id:'s', ceil:['#0c0706', '#160c08', '#22130a', '#301a0c'], wall:['#1c0f08', '#2e190c', '#4a2a12', '#784418', '#b86e22'],
    panel:['#2a170c', '#4a2a12', '#7a4618', '#b0681e', '#eaa040'], kerb:['#20140c', '#3a2414', '#5a3a1c', '#86562a'], road:['#140d0a', '#1e140e', '#2a1c12', '#3a2716', '#4e3418'],
    line:'#0e0806', hot:'#fff4c8', lamp:'#ffcf6a', glow:'#ff9a30', haze:'#2a1608', fogA:.8, lane:'#e8a838', metal:['#120c0a', '#3a2a1e', '#6a4c2e', '#a8783e'], grade:'#ffb070', gradeA:.42, cool:'#3c4a78' };
  const LED = { id:'l', ceil:['#06080c', '#0c1018', '#121824', '#1a2230'], wall:['#0e121a', '#182030', '#263446', '#3e5468', '#6a8aa0'],
    panel:['#141c28', '#24344a', '#3e5670', '#6a8ca6', '#b8d4e4'], kerb:['#121822', '#222c3a', '#36465a', '#56687e'], road:['#0c0e14', '#12161e', '#1a2029', '#232b36', '#2e3846'],
    line:'#06080c', hot:'#f4fcff', lamp:'#d8f0ff', glow:'#9ad0ff', haze:'#101824', fogA:.8, lane:'#e8e4d8', metal:['#0a0c10', '#262e3a', '#4a5868', '#8a9cb0'], grade:'#c8dcff', gradeA:.25, cool:'#3c4a78' };
  SOD.T = {}; SOD.TC = {}; LED.T = {}; LED.TC = {};
  const palOf = i => Math.floor(i / 320) % 2 ? LED : SOD;
  const NAMES = ['夜光トンネル', '月見トンネル', '星川トンネル', '火影トンネル', '龍門トンネル', '風谷トンネル'];
  // lighting: lamps every 4 segments, every 2 in the threshold zones by both mouths; tone 0..3 by distance to the nearest lamp
  const thr = k => k < 18 || k > 181;
  const lampAt = i => { const k = i % 320; return k < 10 || i % (thr(k) ? 2 : 4) === 0; };   // (the first ten rings by the mouth: a lamp at every ring)
  const tone = i => { const k = i % 320; return thr(k) ? (i % 2 ? 2 : 3) : [3, 2, 1, 2][i % 4]; };
  // stepped fog toward the tunnel's own haze, cached (no smooth fade: 7 hard steps)
  const fogTab = (P, col) => { const t = []; for(let st = 0; st < 7; st++) t.push(mixc(col, P.haze, st / 6 * P.fogA)); return t; };
  const fc = (P, col, fog) => (P.T[col] || (P.T[col] = fogTab(P, col)))[Math.min(6, Math.floor(fog * 7))];
  // cool-tinted copies for the rings by the mouths, one table per tint step
  const fcc = (P, col, cs, fog) => { const T = P.TC[cs] || (P.TC[cs] = {}); return (T[col] || (T[col] = fogTab(P, mixc(col, P.cool, cs / 12))))[Math.min(6, Math.floor(fog * 7))]; };
  // outdoor colours mixed toward the sky, quantised (16 steps) and cached
  let MQ = {}, mqN = 0;
  const mq = (c, low, t) => { const st = Math.round(t * 16), key = c + low + st; let v = MQ[key]; if(v === undefined){ if(++mqN > 3000){ MQ = {}; mqN = 0; } v = MQ[key] = mixc(c, low, st / 16); } return v; };
  let cP = null, cF = 0, cS = 0;
  const C = c => fc(cP, c, cF), CC = c => cS ? fcc(cP, c, cS, cF) : fc(cP, c, cF);
  const SX = [-1, 1], LANE = [-2 / 3, 2 / 3], EDGE = [-.95, .95], FANX = [-.48, .48], SIGX = [-.66, 0, .66];
  const q = v => Math.round(v / PX) * PX;
  // a halo that used to switch on at uw > W * k (a pop ~70-85 segments out) now fades in over the band below it, from 40 % of that size
  const gIn = (uw, k) => clamp((uw / W - k * .4) / (k * .6), 0, 1);
  // tunnel section in half-road widths: opening half-width, wall top, crown, haunch inset
  const OW = 1.42, WT = 1.02, CH = 1.5, HI = .4, PT = .55, KB = .1;

  // ---- sprites (cached per palette)
  const fanSprite = P => procSprite('tun_fan' + P.id, 22, 11, (x, y) => {   // jet fan: cylinder, lit from above, dark outline, bracket
    if(y < 2) return (x === 6 || x === 15) ? P.metal[1] : null;
    const yy = y - 2, end = x < 2 || x > 19;
    if(yy === 0 || yy === 8 || x === 0 || x === 21) return (yy === 0 || yy === 8) && (x === 0 || x === 21) ? null : P.metal[0];
    if(end) return yy < 3 ? P.metal[2] : P.metal[1];
    if(x === 6 || x === 15) return P.metal[0];
    return yy < 2 ? P.metal[3] : yy < 4 ? P.metal[2] : yy < 6 ? P.metal[1] : P.metal[0]; });
  const exitSprite = () => procSprite('tun_exit', 12, 7, (x, y) => {   // green emergency-exit plate, white running figure
    if(x === 0 || x === 11 || y === 0 || y === 6) return '#0a3a1c';
    const fig = ['..........', '...ww.....', '..www..ww.', '.w.ww..ww.', '..w.w.....'][y - 1]; return fig && fig[x - 1] === 'w' ? '#f4fff0' : '#21c25a'; });
  const sosSprite = () => procSprite('tun_sos', 7, 10, (x, y) => {   // emergency phone cabinet: red lamp on top, white door panel
    if(y < 2) return x > 1 && x < 5 ? '#ff4a3a' : null;
    if(x === 0 || x === 6 || y === 2 || y === 9) return '#2a0608';
    if(y > 3 && y < 8 && x > 1 && x < 5) return y === 4 ? '#ffffff' : '#d8d0c8';
    return y < 4 ? '#ff5a48' : '#b81e28'; });
  const arrowSprite = red => procSprite('tun_arr' + (red ? 'r' : 'g'), 9, 9, (x, y) => {   // lane-control signal
    if(x === 0 || x === 8 || y === 0 || y === 8) return '#16161c';
    if(red){ const a = x - 1, b = y - 1; return a === b || a === 6 - b ? '#ff3030' : '#08080c'; }
    const c = 4, on = (y >= 2 && y <= 4 && x === c) || (y === 5 && Math.abs(x - c) <= 2) || (y === 6 && Math.abs(x - c) <= 1) || (y === 7 && x === c);
    return on ? '#5aff7a' : '#08080c'; });

  const fontOK = () => { try{ return document.fonts.check('16px DotGothic16'); }catch(e){ return true; } };
  function textSprite(str, col, px){ const key = 'tun_t' + str + col + px; if(SPR[key]) return SPR[key]; if(!fontOK()) return null;
    const c = document.createElement('canvas'), k = c.getContext('2d'); k.font = px + 'px DotGothic16, monospace'; c.width = Math.ceil(k.measureText(str).width) + 2; c.height = px + 4;
    k.font = px + 'px DotGothic16, monospace'; k.textBaseline = 'middle'; k.fillStyle = col; k.fillText(str, 1, c.height / 2);
    const im = k.getImageData(0, 0, c.width, c.height), d = im.data; for(let n = 3; n < d.length; n += 4) d[n] = d[n] > 60 ? 255 : 0; k.putImageData(im, 0, 0); return SPR[key] = c; }
  const blitW = (c, x, yMid, w) => { const sc = w / c.width; blit(c, x, yMid + c.height * sc / 2, sc); };

  // ---- near art (nearprops pass): beside the camera the 7-12 px sprites above were scaled to 4-6 canvas px per sprite pixel and read as
  // flat blocks. Past ~2 canvas px per sprite pixel each prop switches to a version drawn at canvas resolution (1 px outlines, lit top
  // edges, inner shading), with the same footprint, so nothing moves at the switch. Far away the sprites are untouched.
  // 非常口 (evacuation exit) at three times the plate's resolution: the running figure and the doorway (studied: the Japanese 避難口誘導灯
  // pictogram, Ota Yukio 1982, as standardised in ISO 7010 E002: a white figure in mid-stride leaning into the run, toward a white door
  // frame; green field). Hand-placed joints, limbs as 2 px strokes, the torso 3 px, the head a 4 px disc.
  const EXIT_FIG = [[[18.6, 3.4], [18.6, 3.4], 1.9], [[17.6, 6.4], [15, 10.6], 1.45], [[17.4, 6.6], [20.2, 8.6], .95], [[20.2, 8.6], [22.4, 6.8], .95], [[16.6, 6.8], [13.4, 7.2], .95], [[13.4, 7.2], [11.2, 9.6], .95],
    [[15, 10.6], [18.8, 12.6], 1.05], [[18.8, 12.6], [19.4, 16.6], 1.05], [[19.4, 16.6], [21.2, 16.6], .8], [[15, 10.6], [12.6, 13.8], 1.05], [[12.6, 13.8], [9, 14.4], 1.05], [[9, 14.4], [8.4, 16], .8]];
  const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1) : 0, ex = x - a[0] - dx * t, ey = y - a[1] - dy * t; return Math.sqrt(ex * ex + ey * ey); };
  const exitNear = () => procSprite('tun_exit3', 36, 21, (x, y) => {
    if(x === 0 || x === 35 || y === 0 || y === 20) return (x === 0 || x === 35) && (y === 0 || y === 20) ? null : '#0a2a16';   // housing outline, corners cut
    if(x === 1 || x === 34 || y === 1 || y === 19) return y === 1 ? '#6a8a7a' : y === 19 ? '#1a2a22' : '#34463e';               // the metal frame: lit top edge, shadowed foot
    const fx = x - 2 + .5, fy = y - 2 + .5;                                                                                  // the face (32 x 17)
    if(fx > 24 && fx < 31 && fy > 1 && fy < 16.5){ if(fx < 26 || fx > 29 || fy < 3) return '#f4fff0'; return fy < 4 ? '#1aa24c' : '#21c25a'; }   // the door frame, its opening in shade at the lintel
    for(const [a, b, r] of EXIT_FIG) if(segD(fx, fy, a, b) <= r) return '#f4fff0';
    return y === 2 ? '#5aec8e' : y === 18 ? '#18a24a' : '#21c25a'; });                                                     // the lit face: a brighter top row, a darker foot row
  // the emergency phone cabinet (非常電話), in sprite units of the 7 x 10 sprite (sk css px each), drawn at canvas resolution
  function sosNear(x0, yb, sk, on){ const g = v => x0 + v * sk, h = v => yb - (10 - v) * sk, o = PX;
    cx.fillStyle = '#5a0a0c'; pxRect(g(1.8), h(1.5), 3.4 * sk, .5 * sk + o);                                       // the lamp's base
    cx.fillStyle = on ? '#ff4a3a' : '#c0281e'; pxRect(g(2), h(.3), 3 * sk, 1.3 * sk); cx.fillStyle = '#5a0a0c'; pxRect(g(2), h(.3), o, o); pxRect(g(5) - o, h(.3), o, o);   // the dome, its top corners rounded off
    cx.fillStyle = on ? '#ffd8c8' : '#ff7a66'; pxRect(g(2) + o, h(.3) + o, Math.max(o, sk * .5), o);                       // its highlight
    cx.fillStyle = '#2a0608'; pxRect(g(0), h(2), 7 * sk, 8 * sk);                                                     // the cabinet: outline
    cx.fillStyle = '#b81e28'; pxRect(g(0) + o, h(2) + o, 7 * sk - 2 * o, 8 * sk - 2 * o);
    cx.fillStyle = '#ff5a48'; pxRect(g(0) + o, h(2) + o, 7 * sk - 2 * o, 1.6 * sk);                                    // the lit sign band across the top
    cx.fillStyle = '#ffb0a0'; pxRect(g(0) + o, h(2) + o, 7 * sk - 2 * o, o);                                           // the top edge, catching the crown lamps
    cx.fillStyle = '#7a1018'; pxRect(g(0) + o, h(10) - 2 * o, 7 * sk - 2 * o, o); pxRect(g(7) - 2 * o, h(3.6), o, 6.4 * sk - 2 * o);   // shadowed foot and right side
    cx.fillStyle = '#f4ecdf'; for(let j = 0; j < 4; j++) pxRect(g(1.1 + j * 1.3), h(2.5), Math.max(o, sk * .7), Math.max(o, sk * .5));   // 非常電話 as four small lit glyph blocks
    cx.fillStyle = '#7a1018'; pxRect(g(1.6), h(4) - o, 3.8 * sk, 4 * sk + 2 * o);                                     // the door: its recess
    cx.fillStyle = '#d8d0c8'; pxRect(g(1.6) + o, h(4), 3.8 * sk - 2 * o, 4 * sk); cx.fillStyle = '#ffffff'; pxRect(g(1.6) + o, h(4), 3.8 * sk - 2 * o, o);
    cx.fillStyle = '#a89c94'; pxRect(g(5.4) - 2 * o, h(4) + o, o, 4 * sk - o); pxRect(g(1.6) + o, h(8) - o, 3.8 * sk - 2 * o, o);   // its shaded right and lower edges
    cx.fillStyle = '#3a2a2a'; pxRect(g(4.6) - o, h(5.6), o, Math.max(o, sk * 1.1)); }                                   // the handle
  // a jet fan as a rider sees it, from behind and below (borrowed from setpiece/cavein.js fan(), studied from the Misiryeong tunnel jet fan
  // photo): a 0.9 half-road-width drum along the bore, its outline the near and far discs joined by their tangents, a lit side toward the
  // lamp row, a shadowed inner side, two dark bands, the near intake (pale lip, dark ring, hub, guard bar) and two rods to the crown.
  const FL = 9, FRR = .12, FHC = CH - .22, FW = { x:0, y:0, w:0 };
  function fw(s, x, y, j, fx, h){ const t = segs[j]; if(!t || !(t.p1.screen.w > 0) || t.p1.camera.z <= DEPTH) return false; const p = t.p1.screen; FW.w = p.w; FW.x = p.x + (x - s.p1.screen.x) + fx * p.w; FW.y = p.y + (y - s.p1.screen.y) - h * p.w; return true; }
  function disc(x, y, r, col){ cx.fillStyle = col; if(r < PX * .6){ pxRect(x - PX / 2, y - PX / 2, PX, PX); return; } const n = Math.ceil(r / PX);
    for(let k = -n; k <= n; k++){ const yy = k * PX, ww = Math.sqrt(Math.max(0, r * r - yy * yy)); if(ww < PX * .5) continue; cx.fillRect(q(x - ww), q(y + yy), q(ww * 2), PX); } }
  function jetFan(s, x, y, uw, fx, P, fog, a){ const T = P.metal, F = c => C(c);
    const real = segs[s.index] === s, r0 = FRR * uw;
    if(!real || r0 < PX * 2.2 || !fw(s, x, y, s.index + FL, fx, FHC)){ const sp = fanSprite(P), sk = uw * .62 / 22; cx.globalAlpha = a; blit(sp, x + fx * uw, y - CH * uw + 11 * sk + uw * .02, sk); cx.globalAlpha = 1; return; }
    const ex = FW.x, ey = FW.y, r1 = FRR * FW.w, nx = x + fx * uw, ny = y - FHC * uw, al = a * clamp(1.4 - uw / (W * .55), 0, 1); if(al <= .02) return; cx.globalAlpha = al;
    for(const t of [.17, .83]){ if(!fw(s, x, y, s.index + Math.round(FL * t), fx, CH)) continue; const tx = FW.x, ty = FW.y, tw = FW.w; fw(s, x, y, s.index + Math.round(FL * t), fx, FHC + FRR * .8);
      cx.fillStyle = F(T[1]); pxRect(tx - Math.max(PX, q(tw * .012)), ty, Math.max(PX, q(tw * .024)), FW.y - ty); cx.fillStyle = F(T[3]); pxRect(tx - Math.max(PX, q(tw * .03)), ty, Math.max(PX * 2, q(tw * .06)), Math.max(PX, q(tw * .012))); }
    const dx = ex - nx, dy = ey - ny, dl = Math.hypot(dx, dy); let px = 1, py = 0; if(dl > .5){ px = -dy / dl; py = dx / dl; } if(px * fx < 0){ px = -px; py = -py; }   // across the drum, toward the outer wall
    const band = (o1, o2, col) => poly(nx + px * o1 * r0, ny + py * o1 * r0, nx + px * o2 * r0, ny + py * o2 * r0, ex + px * o2 * r1, ey + py * o2 * r1, ex + px * o1 * r1, ey + py * o1 * r1, col);
    const gg = PX / r0; band(-1 - gg, 1 + gg, F(P.line)); disc(nx, ny, r0 + PX, F(P.line));
    band(-1, -.5, F(T[1])); band(-.5, 1, F(T[2])); band(.45, .7, F(T[3])); band(.84, 1, F(T[1]));
    for(const t of [.3, .62]){ const bx = nx + dx * t, by = ny + dy * t, br = r0 + (r1 - r0) * t, w = Math.max(PX, q(br * .16)), ax = px * br, ay = py * br;
      poly(bx + ax, by + ay, bx - ax, by - ay, bx - ax + dx / dl * w, by - ay + dy / dl * w, bx + ax + dx / dl * w, by + ay + dy / dl * w, F(T[0])); }
    disc(nx, ny, r0, F(T[3])); if(r0 < PX * 4){ disc(nx, ny, r0 - PX, F(T[2])); cx.globalAlpha = 1; return; }   // (small: a pale drum end, no intake ring; with one it read as a wheel)
    disc(nx, ny, r0 - Math.max(PX, r0 * .14), F(T[0])); disc(nx, ny, r0 * .62, F(T[1]));
    if(r0 > PX * 3){ disc(nx, ny, Math.max(PX, r0 * .32), F(T[2])); cx.fillStyle = F(T[3]); pxRect(nx - px * r0 * .1 - PX / 2, ny - py * r0 * .1 - PX, PX, PX); }
    if(r0 > PX * 6){ cx.fillStyle = F(T[0]); pxRect(nx - r0 * .86, ny - PX * .5, r0 * .5, PX); pxRect(nx + r0 * .36, ny - PX * .5, r0 * .5, PX); }
    cx.globalAlpha = 1; }
  // the evacuation-route light: far away one green pixel; near, a lamp housing with a lit lens (bright top row) instead of a flat green block
  function evacLight(x0, y0, d){ if(d < PX * 2.5){ pxRect(x0, y0, d, d); return; } const o = PX, w = d * 1.4, xa = x0 + d / 2 - w / 2;
    const c = cx.fillStyle; cx.fillStyle = '#10141a'; pxRect(xa - o, y0 - o, w + 2 * o, d + 2 * o); cx.fillStyle = c; pxRect(xa, y0, w, d); cx.fillStyle = '#c8ffd8'; pxRect(xa, y0, w, o); cx.fillStyle = '#1a9a48'; pxRect(xa, y0 + d - o, w, o); }

  // ---- the portal. Studied from Japanese road and expressway portals (Wikimedia Commons, "Road tunnel portals in Japan": Enasan, Tennozan,
  // Shin-Kuwadai, Kan-etsu Yuzawa side, Ken-O Sagamihara-Hachioji, Kamura): a bell-mouth hood projects from a concrete headwall; its front
  // is cut on a slant, so the sides reach out further than the crown and the cut face reads as a thick pale band round a dark, warm mouth;
  // wing walls step up the cutting to the headwall, a concrete lattice (nori-waku) holds the slope above them, the hill over the bore is
  // wooded, the name plate sits on the headwall over the hood, and a signal gantry stands just before the mouth.
  // Here: rings 0..HL-1 of every bore are the hood. Seen from outside only its shell is drawn (a band TH thick round the opening, cut lower
  // on the nearer rings: the bevel); ring HL carries the headwall, the hill and the plate; every ring past the headwall is cropped to the
  // headwall's mouth, so no ring box ever shows round the hill. Once the camera is under the full shell (ring 3) the rings are whole again.
  const HL = 6, TH = .24, EW = 3.7, EH = 2.3, WX = OW + TH + .14, SW = 2.1;
  const HCUT = [WT * .55, WT + (CH - WT) * .67, CH + TH, CH + TH, CH + TH, CH + TH];   // how high each hood ring's shell reaches (half-road widths)
  const hh0 = (CH - WT) / 3;
  // the opening's half-width at height h (0 above the crown) and the hood's outer outline (the opening grown by TH)
  const openW = h => h < WT ? OW : h < CH ? OW - (Math.min(2, Math.floor((h - WT) / hh0)) + 1) * HI / 3 : 0;
  const growW = h => h < TH ? OW + TH : h < CH + TH ? openW(h - TH) + TH : 0;
  const BRK = [0, WT, WT + hh0, WT + 2 * hh0, CH, TH, WT + TH, WT + hh0 + TH, WT + 2 * hh0 + TH, CH + TH, 99].sort((a, b) => a - b);
  // fill between an inner profile fa and an outer fb over heights h0..h1 as stepped slabs, each slab's colour from col(h) (null: skip)
  function slabs(x, y, uw, fa, fb, h0, h1, col){
    for(let n = 0; n + 1 < BRK.length; n++){ const a = Math.max(h0, BRK[n]), b = Math.min(h1, BRK[n + 1]); if(b <= a) continue;
      const m = (a + b) / 2, wi = fa(m), wo = fb(m); if(wo <= wi) continue; const c = col(m); if(!c) continue;
      const ya = q(y - b * uw), yb = q(y - a * uw), xo = q(x - wo * uw), xO = q(x + wo * uw); if(yb <= ya) continue; cx.fillStyle = c;
      if(wi <= 0) R(xo, ya, xO - xo, yb - ya); else { const xi = q(x - wi * uw), xI = q(x + wi * uw); R(xo, ya, xi - xo, yb - ya); R(xI, ya, xO - xI, yb - ya); } } }
  const R = (x, y, w, h) => { if(w > 0 && h > 0) pxRect(x, y, w, h); };
  // per frame: the camera's segment, and each bore's headwall mouth on screen (4 slots, by bore number)
  let fNow = -1, camS = 0; const MK = [-1, -1, -1, -1], MV = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  const outside = c0 => camS < c0 + 3;
  function mouth(c0){ const n = (c0 / 320) & 3, m = MV[n]; if(MK[n] === c0) return m[4] ? m : null; MK[n] = c0; m[4] = 0;
    const t = segs[c0 + HL]; if(t && t.p1.screen.scale && t.p1.camera.z > DEPTH){ const p = t.p1.screen, w = p.w; m[0] = p.x - (OW + TH) * w; m[1] = p.y - (CH + TH) * w; m[2] = p.x + (OW + TH) * w; m[3] = p.y; m[4] = 1; }
    return m[4] ? m : null; }
  // the cutting: a retaining wall parallel to the road at X (heights Ha / Hb at the segment's two ends) and a lattice slope rising from its
  // top back toward the hill (Sa / Sb above the wall, SW across), as quads between the segment's two ends: projected, never a billboard
  const CUTC = { wall:['#1d2130', '#222738'], wallL:'#2c3248', cope:'#5c6482', copeL:'#8890b0', joint:'#141724', slope:'#0f1d16', cell:'#16281e', beam:'#202c2a', beamL:'#34403e', bush:'#08120d', rim:'#22382c' };
  function cutting(i, xa, ya, ua, sd, Xa, Xb, Ha, Hb, Sa, Sb, M, lit){
    const t = segs[i]; if(!t || !t.p2.screen.scale) return; const p = t.p2.screen, xb = p.x, yb = p.y, ub = p.w;
    const ax = xa + sd * Xa * ua, bx = xb + sd * Xb * ub, aY = ya - Ha * ua, bY = yb - Hb * ub;
    const ox = xa + sd * (Xa + SW) * ua, oY = aY - Sa * ua, px = xb + sd * (Xb + SW) * ub, pY = bY - Sb * ub;
    if(Math.max(ax, bx, ox, px) < -PX || Math.min(ax, bx, ox, px) > W + PX) return;
    // the slope first (it is behind the wall's top edge): lattice cells, two beams along it, a beam up it at every second segment, bushes on top
    poly(ax, aY, bx, bY, px, pY, ox, oY, M(CUTC.slope));
    const L1 = f => [ax + (ox - ax) * f, aY + (oY - aY) * f, bx + (px - bx) * f, bY + (pY - bY) * f];
    if(ua > W * .02){ const bw = Math.max(.02, PX / Math.max(1, ua)); for(const f of [.34, .67]){ const [a1, a2, b1, b2] = L1(f), [c1, c2, d1, d2] = L1(f + bw * 2.2); poly(a1, a2, b1, b2, d1, d2, c1, c2, M(CUTC.beam)); }
      if(i % 2 === 0){ const w = Math.max(PX, ua * .035) * -sd; poly(ax, aY, ox, oY, ox + w, oY, ax + w, aY, M(lit ? CUTC.beamL : CUTC.beam)); } }
    // the wood on top: a row of crowns, one per segment, each a stepped bump with a moonlit top
    const bh = .32, ha = bh * (1 + hash(i * 1.7) * .9), hb = bh * (1 + hash(i * 1.7 + 1.7) * .9); poly(ox, oY, px, pY, px, pY - hb * ub, ox, oY - ha * ua, M(CUTC.bush));
    if(ua > W * .006){ const cy = Math.min(oY - ha * ua, pY - hb * ub), cw = Math.abs(px - ox); if(cw >= PX){ const t0 = q(cy - Math.max(PX, ua * .1)); cx.fillStyle = M(CUTC.bush); R(q(Math.min(ox, px) + cw * .2), t0, q(cw * .6), q(cy) - t0 + PX); cx.fillStyle = M(CUTC.rim); R(q(Math.min(ox, px) + cw * .2), t0, q(cw * .6), PX); } }
    // the wall: face, coping (lit on top), a joint at every second segment, an amber delineator every third
    poly(ax, ya, bx, yb, bx, bY, ax, aY, M(lit ? CUTC.wallL : CUTC.wall[i & 1]));
    const ca = Math.max(PX, ua * .07), cb = Math.max(PX, ub * .07); poly(ax, aY + ca, bx, bY + cb, bx, bY, ax, aY, M(lit ? CUTC.copeL : CUTC.cope));
    if(ua > W * .012){ if(i % 2 === 0){ cx.fillStyle = M(CUTC.joint); R(q(ax), q(aY + ca), PX, q(ya) - q(aY + ca)); }
      if(i % 3 === 0 && Ha > .5){ const d = Math.max(PX, q(ua * .05)), dy = ya - .45 * ua; cx.fillStyle = '#ffb040'; R(q(ax) - (sd > 0 ? d : 0), q(dy), d, d); const gi = gIn(ua, .05); if(gi > 0) glow(ax, dy, Math.min(ua * .15, H * .05), '#ff9a30', .3 * gi); } } }
  // the cutting's shape along the approach (t 0 -> 1 toward the hood) and away from each exit: it narrows as it rises
  const cutX = t => 2.75 - t * (2.75 - WX), cutH = t => .12 + t * t * (EH - .12), cutS = t => .25 + t * 1.35;

  // ---- the ring: one slice of tunnel per segment, drawn back to front
  function drawTunnel(s, x, y, uw, fog, now, fogc){
    if(now !== fNow){ fNow = now; camS = Math.floor(position / SEG); MK[0] = MK[1] = MK[2] = MK[3] = -1; }
    const i = s.index, k = i % 320, c0 = i - k, P = palOf(i), far = uw < W * .025;   // (the plain far ring from ~170 segments, was ~85: the haunch steps and lit edges read that far)
    const nextT = segs[i + 1] ? segs[i + 1].tunnel : true, exit = k === 199 || !nextT, out = outside(c0), hood = out && k < HL, head = out && k === HL;
    // far rings are under a pixel deep: draw every 2nd face beyond ~40 segments, every 4th beyond ~90 (fixtures still drawn)
    const stride = uw < W * .045 ? 4 : uw < W * .1 ? 2 : 1, face = k <= HL || exit || i % stride === 0, L = stride === 4 && k > HL ? 2 : tone(i);
    // light from outside bleeds into the last and first few rings: a cool rim
    const edge = Math.min(k, 199 - k), cs = edge < 6 ? 6 - edge : 0; cP = P; cF = fog; cS = cs;
    const M = c => mq(c, fogc, fog * .75);
    if(hood){ drawHood(s, k, x, y, uw, fog, P, M); return; }
    // seen from outside, a ring past the headwall shows only through the headwall's mouth
    let cl = -1e9, cr = 1e9, ct = -1e9; if(out && k > HL){ const m = mouth(c0); if(m){ cl = m[0]; ct = m[1]; cr = m[2]; } }
    const l = x - OW * uw, r = x + OW * uw, fl = x - 4.4 * uw, fr = x + 4.4 * uw, ft = y - 3.6 * uw, yW = y - WT * uw, yC = y - CH * uw, yP = y - PT * uw, yK = y - KB * uw;
    const ql = q(l), qr = q(r), qfl = Math.max(-PX, Math.floor(fl), q(cl)), qfr = Math.min(W + PX, Math.ceil(fr), q(cr)), qy = q(y), qft = Math.max(-PX, ft, q(ct)), hh = (CH - WT) / 3 * uw;
    const qL = Math.min(ql, qfr), qR = Math.max(qr, qfl);   // (a cropped ring may not reach its own opening)
    if(face){
    // ceiling and haunch (three steps), upper wall, lower panel, walkway kerb
    cx.fillStyle = CC(P.ceil[L]); R(qfl, qft, qfr - qfl, q(yC) - qft + 1);
    if(far){ const ya = Math.max(q(yC), qft), ins = q(HI * .5 * uw); cx.fillStyle = CC(P.ceil[Math.min(3, L + 1)]); R(qfl, ya, Math.min(ql + ins, qfr) - qfl, q(yW) - ya); R(Math.max(qr - ins, qfl), ya, qfr - Math.max(qr - ins, qfl), q(yW) - ya); }
    else for(let n = 0; n < 3; n++){ const ya = Math.max(qft, q(yW - (n + 1) * hh)), ins = q((n + 1) * HI / 3 * uw); cx.fillStyle = CC(n === 0 ? P.wall[Math.min(4, L + 1)] : P.ceil[Math.min(3, L + n % 2)]);
      R(qfl, ya, Math.min(ql + ins, qfr) - qfl, q(yW - n * hh) - ya); R(Math.max(qr - ins, qfl), ya, qfr - Math.max(qr - ins, qfl), q(yW - n * hh) - ya); }
    const yw = Math.max(qft, q(yW)), yp = Math.max(qft, q(yP)), yk = Math.max(qft, q(yK));
    cx.fillStyle = CC(P.wall[L]); R(qfl, yw, qL - qfl, yp - yw); R(qR, yw, qfr - qR, yp - yw);
    cx.fillStyle = CC(P.panel[L]); R(qfl, yp, qL - qfl, yk - yp); R(qR, yp, qfr - qR, yk - yp);
    cx.fillStyle = CC(P.kerb[L]); R(qfl, yk, qL - qfl, qy - yk + PX); R(qR, yk, qfr - qR, qy - yk + PX);
    // light catching edges: the panel's top lip and the wall/haunch join; dark joints (tile seams) at this ring's own mouth
    if(!far){ cx.fillStyle = CC(P.panel[Math.min(4, L + 1)]); R(qfl, yp, qL - qfl, PX); R(qR, yp, qfr - qR, PX);
      cx.fillStyle = C(P.line); R(qfl, yk - PX, qL - qfl, PX); R(qR, yk - PX, qfr - qR, PX);
      if(uw > 10 && i % 2 === 0 && cl < l){ R(ql - PX, q(yC), PX, qy - q(yC)); R(qr, q(yC), PX, qy - q(yC)); }
      // the lining's ring joint every 4 rings: the seam runs round the whole section (walls, haunch steps, crown), so the bore reads as rings
      if(i % 4 === 0 && uw > W * .035 && cl < l){ const ci = q(HI * uw); R(ql + ci, q(yC), qr - ql - 2 * ci, PX); for(let n = 0; n < 3; n++){ const ya = q(yW - (n + 1) * hh), ins = q((n + 1) * HI / 3 * uw), i0 = q(n * HI / 3 * uw); R(ql + i0 - PX, ya, ins - i0 + PX, PX); R(qr - ins, ya, ins - i0 + PX, PX); } }
      if(L === 3){ cx.fillStyle = C(P.wall[4]); R(qfl, yw, qL - qfl, PX); R(qR, yw, qfr - qR, PX); } }
    }
    if(head){ drawHead(s, x, y, uw, fog, P, M, now); return; }
    // luminaires in both upper corners: dark housing, hot core, stepped halo; in the threshold zone by the mouth a second, lower row too
    if(lampAt(i)){ const lw = Math.max(PX, q(uw * .2)), lh = Math.max(PX, q(uw * .05)), rows = k < 14 && k > 0 ? 2 : 1;
      for(let rw = 0; rw < rows; rw++){ const ly = q(yW - hh * (rw ? -.15 : 1.5)), inn = rw ? .1 : HI * .5;
        for(let m = 0; m < 2; m++){ const lx = m ? q(r - inn * uw) : q(l + inn * uw); if(lx < cl || lx > cr || ly < ct) continue; cx.fillStyle = C(P.metal[0]); pxRect(lx - lw / 2 - PX, ly - PX, lw + PX * 2, lh + PX * 2);
          cx.fillStyle = fog > .6 ? C(P.lamp) : P.hot; pxRect(lx - lw / 2, ly, lw, lh);
          const gi = gIn(uw, .06); if(gi > 0) glow(lx, ly + lh / 2, Math.min(uw * .55, H * .07), P.glow, .3 * (1 - fog) * gi * (rw ? .7 : 1)); } } }
    if(out && (l < cl || r > cr)) return;   // the rest only shows through the mouth
    // evacuation-route lights: a low green dot every 8 rings on both walls
    if(i % 8 === 4 && (face || i % 4 === 0)){ const d = Math.max(PX, q(uw * .04)); cx.fillStyle = C('#3aff7a'); evacLight(ql - d - PX, q(y - .2 * uw), d); cx.fillStyle = C('#3aff7a'); evacLight(qr + PX, q(y - .2 * uw), d); }
    if(uw < 3) return;
    const a = 1 - fog * .7;
    // emergency-exit sign (left) and emergency phone (right), every 40 rings
    if(k % 40 === 20){ const sk = Math.max(1, uw * .24 / 12), nr = sk > PX * 2; cx.globalAlpha = a; blit(nr ? exitNear() : exitSprite(), l + 6 * sk + PX, q(y - .62 * uw), nr ? sk / 3 : sk); cx.globalAlpha = 1; const gi = gIn(uw, .05); if(gi > 0) glow(l + 6 * sk, y - .62 * uw - 3 * sk, uw * .3, '#2aff6a', .25 * a * gi); }
    if(k % 40 === 10){ const sk = Math.max(1, uw * .2 / 10), on = reduce || Math.floor(now / 500) % 2; cx.globalAlpha = a; if(sk > PX * 2) sosNear(r - 7.5 * sk - PX, q(y - .1 * uw), sk, on); else blit(sosSprite(), r - 4 * sk - PX, q(y - .1 * uw), sk); cx.globalAlpha = 1;
      const gi = gIn(uw, .05); if(on && gi > 0) glow(r - 4 * sk, y - .1 * uw - 9 * sk, uw * .18, '#ff3a2a', .4 * a * gi); }
    // jet fans hung in pairs from the crown (the first pair just inside the mouth, so it shows from the approach)
    if(k % 30 === 15 && k > 10 && k < 190) for(const fx of FANX) jetFan(s, x, y, uw, fx, P, fog, a);
    // lane-control gantry: a beam under the crown with a signal over each lane
    if(k % 80 === 50){ const by = q(yC + uw * .12), bh = Math.max(PX, q(uw * .05)); cx.fillStyle = C(P.metal[1]); pxRect(q(l + HI * uw), by, q(r - l - 2 * HI * uw), bh); cx.fillStyle = C(P.metal[3]); pxRect(q(l + HI * uw), by, q(r - l - 2 * HI * uw), PX);
      const sk = Math.max(1, uw * .16 / 9); for(const lx of SIGX){ const red = lx > 0 && Math.floor(i / 320) % 3 === 0; blit(arrowSprite(red), x + lx * uw, by + bh + 9 * sk, sk); const gi = gIn(uw, .05); if(gi > 0) glow(x + lx * uw, by + bh + 4.5 * sk, uw * .16, red ? '#ff3030' : '#4aff7a', .3 * a * gi); } }
    // the exit mouth: a cold rim of city light around the last opening
    if(exit){ cx.fillStyle = '#7a8cc8'; pxRect(ql, q(yW), PX, qy - q(yW)); pxRect(qr - PX, q(yW), PX, qy - q(yW)); pxRect(q(l + HI * uw), q(yC), q(r - l - 2 * HI * uw), PX); }
  }

  // ---- the hood, seen from outside: one ring of its shell. The part below the nearer ring's cut is lining (it shows only through that ring's
  // mouth); above it is the exposed slanted cut, pale concrete with a lit edge; the front ring is all cut face. The wing walls run beside it.
  const HOODC = ['#5a6280', '#6c7494', '#868eae'];
  function drawHood(s, k, x, y, uw, fog, P, M){
    const i = s.index, hc = HCUT[k], hp = k > 0 ? HCUT[k - 1] : 0, L = 2;
    // wing walls and the lattice slope above them, full height along the hood, meeting the headwall at ring HL
    for(const sd of SX) cutting(i, x, y, uw, sd, WX, WX, EH, EH, cutS(1), cutS(1), M, false);
    const face = M(HOODC[k === 0 ? 2 : 1]), lin = h => h < PT ? CC(P.panel[L]) : h < WT ? CC(P.wall[L]) : CC(P.ceil[L]);
    slabs(x, y, uw, openW, growW, 0, hc, h => h < hp ? lin(h) : face);
    const pu = PX / uw;
    // a dark line round the shell's outside (its silhouette against the headwall and the hill), the lit cut edge, a warm lip in the mouth
    slabs(x, y, uw, growW, h => growW(Math.max(0, h - pu)) + pu, 0, hc + (hc >= CH + TH - .001 ? pu : 0), () => M('#0c0e16'));
    if(hc < CH + TH - .001) slabs(x, y, uw, openW, growW, hc - pu, hc, () => M(HOODC[2]));
    else slabs(x, y, uw, openW, growW, CH + TH - pu, CH + TH, () => M(HOODC[k === 0 ? 2 : 1]));
    if(k < 3 && uw > W * .02) slabs(x, y, uw, openW, h => openW(h) + pu, 0, Math.min(hc, CH), () => fog > .6 ? CC(P.wall[3]) : P.wall[4]);
    // a lit LED band round the front of the full shell (Kan-etsu's blue ring, here in the tunnel's own light)
    if(k === 3 && uw > W * .015) slabs(x, y, uw, h => openW(h) + TH * .4, h => openW(h) + TH * .4 + pu * (uw > W * .05 ? 2 : 1), WT * .2, CH + TH * .4 + pu * 2, () => fog > .6 ? CC(P.lamp) : P.lamp);
  }

  // ---- the headwall at ring HL: the hill and the towers on its ridge behind, the lattice slopes either side, the concrete face with its
  // coping, joints and form-tie rows, the lit name plate over the hood, a pair of floodlights; then the approach's signal gantry is a sprite
  const HILL = { leaf:['#08120e', '#0c1814', '#0f1d17'], rim:'#2e4a3c', tower:['#0c101c', '#121828'], win:['#ffd890', '#c8dcff', '#ffb860'] };
  function drawHead(s, x, y, uw, fog, P, M, now){
    const id = Math.floor(s.index / 320), u = uw, yT = y - EH * u;
    // towers of the city standing on the ridge behind (the hill hides their feet)
    if(fog < .85) for(let n = 0; n < 6; n++){ const hv = hash(id * 7.1 + n * 3.3); if(hv < .3) continue; const bx = x + (n - 2.5) * 3.1 * u + (hash(id + n * 1.7) - .5) * 1.2 * u, bw = (1.1 + hash(id * 2.3 + n) * 1.1) * u, bh = (4.4 + hv * 2.6) * u;
      if(bx + bw < 0 || bx - bw > W) continue; cx.fillStyle = M(HILL.tower[n & 1]); R(q(bx - bw / 2), q(y - bh), q(bw), q(bh - EH * u));
      if(u > 5 && fog < .6){ const cw = .3 * u, rh = .3 * u; for(let r0 = 0; r0 * rh < bh - EH * u - rh; r0++) for(let c = 0; c * cw < bw - cw * .6; c++){ const hw = hash(id * 3.1 + n * 17 + r0 * 5.3 + c * 1.9); if(hw > .32) continue;
        cx.fillStyle = M(HILL.win[(hw * 9 | 0) % 3]); R(q(bx - bw / 2 + cw * (c + .3)), q(y - bh + rh * (r0 + .4)), Math.max(PX, q(cw * .4)), Math.max(PX, q(rh * .35))); } } }
    // the wooded hill: stepped columns, highest over the bore, falling to the plain; tree crowns make the skyline ragged; a moonlit rim
    const cw = Math.max(PX, q(u * .32)), x0 = q(x - 15 * u), x1 = x + 15 * u;
    for(let cxp = x0; cxp < x1; cxp += cw){ if(cxp + cw < 0 || cxp > W) continue; const uu = (cxp + cw / 2 - x) / u, f = Math.min(1, Math.abs(uu) / 15), cr = Math.floor(uu * 2.6 + id * 31);
      const hp = EH + .3 + 2.5 * (1 - Math.pow(f, 1.5)) + hash(cr * .37) * .45 * (1 - f * .5) + (hash(cr * 1.13 + 2) > .7 ? .25 : 0), top = q(y - hp * u), bot = Math.abs(uu) < EW ? q(yT) : q(y);
      cx.fillStyle = M(HILL.leaf[(cr & 1) + (hash(cr * 2.9) > .8 ? 1 : 0)]); R(cxp, top, cw, bot - top);
      cx.fillStyle = M(HILL.rim); R(cxp, top, cw, PX); }
    // nori-waku: the concrete lattice on the hill face either side of the headwall
    for(const sd of SX){ const xa = x + sd * EW * u, xb = x + sd * (EW + 3) * u, lo = Math.min(xa, xb), hi = Math.max(xa, xb), top = y - (EH + 1.4) * u;
      if(hi < 0 || lo > W) continue; cx.fillStyle = M('#13241c'); R(q(lo), q(top), q(hi) - q(lo), q(y) - q(top));
      cx.fillStyle = M(CUTC.beam); const bw = Math.max(PX, q(u * .06)); for(let h = .3; h < EH + 1.4; h += .5) R(q(lo), q(y - h * u), q(hi) - q(lo), bw);
      for(let d = 0; d <= 3; d += .6) R(q(x + sd * (EW + d) * u), q(top), bw, q(y) - q(top)); }
    // the headwall: face round the hood's outline, a darker plinth, the coping (lit), panel joints, rows of form ties
    slabs(x, y, u, growW, () => EW, 0, EH, h => h < .14 ? M('#1c2030') : M('#343a52'));
    cx.fillStyle = M('#8890b0'); R(q(x - (EW + .06) * u), q(yT - u * .08), q(2 * (EW + .06) * u), Math.max(PX, q(u * .08)));
    cx.fillStyle = M('#151826'); R(q(x - EW * u), q(yT), q(2 * EW * u), Math.max(PX, q(u * .07)));
    if(u > W * .008){ cx.fillStyle = M('#262a3e'); for(let n = 1; n < 4; n++){ const jx = (OW + TH + n * .8) * u; if(jx > EW * u) break; R(q(x - jx), q(yT + u * .07), PX, q(y) - q(yT + u * .07)); R(q(x + jx), q(yT + u * .07), PX, q(y) - q(yT + u * .07)); }
      if(u > W * .03){ cx.fillStyle = M('#1e2232'); for(let h = .45; h < EH - .1; h += .5) for(let d = OW + TH + .3; d < EW; d += .45){ R(q(x - d * u), q(y - h * u), PX, PX); R(q(x + d * u), q(y - h * u), PX, PX); } } }
    // name plate over the hood: a dark slab in a pale frame, warm lit characters
    const pw = 2.0 * u, ph = .36 * u, px = x - pw / 2, py = y - (CH + TH + .14) * u - ph;
    cx.fillStyle = M('#9aa0b4'); R(q(px - PX * 2), q(py - PX * 2), q(pw) + PX * 4, q(ph) + PX * 4); cx.fillStyle = M('#14121a'); R(q(px), q(py), q(pw), q(ph));
    const ts = u > 6 && textSprite(NAMES[Math.floor(s.index / 320) % NAMES.length], '#ffe2a8', 16); if(ts){ cx.globalAlpha = 1 - fog * .6; blitW(ts, x, py + ph / 2, pw * .86); cx.globalAlpha = 1; }
    if(fog < .7) glow(x, py + ph / 2, Math.min(pw * .6, H * .25), '#ffb060', .16 * (1 - fog));
    // floodlights on the coping, aimed down at the mouth
    for(const sd of SX){ const lx = x + sd * (OW + .2) * u, ly = yT - u * .16; cx.fillStyle = M('#20222e'); R(q(lx - u * .1), q(ly), q(u * .2), Math.max(PX, q(u * .08)));
      cx.fillStyle = '#fff0c0'; R(q(lx - u * .07), q(ly + u * .05), Math.max(PX, q(u * .14)), Math.max(PX, q(u * .03))); const gi = gIn(uw, .03); if(gi > 0) glow(lx, ly + u * .06, Math.min(u * .5, H * .08), P.glow, .22 * (1 - fog) * gi); }
  }

  // ---- road surface inside: the road takes the tunnel's ramp, solid no-passing lines, a concrete walkway, lamp sheen
  function roadFX(s, a, b, fog, f, now){
    if(!s.tunnel) return;
    /* The road in the bore is one smooth tone of wet asphalt. (It used to take the lamp ramp per segment, tone 3-2-1-2 by the distance to the
       nearest luminaire: near the camera each segment is tens of pixels deep, so the road read as hard brown bands across it, every ring;
       Kellan: "strange brown lines covering the road horizontally".) The light now lies along the road, where the luminaires are: a soft pool
       on each side under every lamp, one step brighter than the road, fading over the next segment. Ring seams stay on the walls.
       The lane dashes are the engine's own (laneMark, drawn after this), as on every road; this file draws the solid edge lines. */
    const i = s.index, P = palOf(i), thin = a.y - b.y < PX * .6, yb = b.y - 1; cP = P; cF = fog; cS = 0;
    const rd = C(P.road[2]); cx.fillStyle = rd; quad(a.x - a.w, a.y, a.x + a.w, a.y, b.x + b.w, yb, b.x - b.w, yb);
    cx.fillStyle = C(P.kerb[2]); quad(a.x - a.w * OW, a.y, a.x - a.w, a.y, b.x - b.w, yb, b.x - b.w * OW, yb); quad(a.x + a.w, a.y, a.x + a.w * OW, a.y, b.x + b.w * OW, yb, b.x + b.w, yb);
    cx.fillStyle = C(P.line); const e1 = a.w * .03, e2 = b.w * .03; quad(a.x - a.w - e1, a.y, a.x - a.w + e1, a.y, b.x - b.w + e2, yb, b.x - b.w - e2, yb); quad(a.x + a.w - e1, a.y, a.x + a.w + e1, a.y, b.x + b.w + e2, yb, b.x + b.w - e2, yb);
    // far away a segment is under a pixel deep: the edge lines run on to the far end of the bore as steady one-pixel lines (poly: each pixel
    // row belongs to exactly one segment), mixed toward the road by how much of the pixel they cover; no pools (they would flicker row to row)
    const ec = C(P.id === 's' ? '#d8b070' : '#d8dce0');
    if(thin){ const cv = Math.max(.6, Math.min(1, (a.w + b.w) / 44 / PX)), l1 = a.w / 44, l2 = b.w / 44, ed = mixc(rd, ec, cv);
      for(const lx of EDGE) poly(a.x + a.w * lx - l1, a.y, a.x + a.w * lx + l1, a.y, b.x + b.w * lx + l2, yb, b.x + b.w * lx - l2, yb, ed); return; }
    // the lamp pools: under a lamp ring and the one after it, a soft band along each side of the road (one tone up, then half a tone)
    const lp = lampAt(i) ? 1 : lampAt(i - 1) ? .5 : 0;
    if(lp > 0){ cx.fillStyle = lp >= 1 ? C(P.road[3]) : mixc(rd, C(P.road[3]), .5); for(const sd of SX){ const o1 = .55, o2 = .92; quad(a.x + sd * a.w * o1, a.y, a.x + sd * a.w * o2, a.y, b.x + sd * b.w * o2, yb, b.x + sd * b.w * o1, yb); } }
    // solid edge lines
    const l1 = Math.max(.6, a.w / 44), l2 = Math.max(.6, b.w / 44); cx.fillStyle = ec;
    for(const lx of EDGE) quad(a.x + a.w * lx - l1, a.y, a.x + a.w * lx + l1, a.y, b.x + b.w * lx + l2, yb, b.x + b.w * lx - l2, yb);
  }
  // fills land on the pixel grid (the engine's poly: whole-pixel spans, shared edges tile exactly); a line narrower than a canvas pixel keeps
  // the antialiased path, so far away it reads as a faint tint instead of a 1-pixel line that blinks in and out
  function quad(x1, y1, x2, y2, x3, y3, x4, y4){ if(Math.abs(x2 - x1) >= PX) return poly(x1, y1, x2, y2, x3, y3, x4, y4, cx.fillStyle); cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.lineTo(x3, y3); cx.lineTo(x4, y4); cx.closePath(); cx.fill(); }

  // ---- outside: city blocks and lamps, cut walls rising toward each portal, a tunnel-ahead sign
  // is there a real bore starting at c0? (the engine's boreAt: none too near the road's border or across a fork, and only on this road)
  let TLI = -1; const boreOK = c0 => { if(typeof boreAt !== 'function') return true; if(TLI < 0) TLI = LANDS.findIndex(l => l.key === 'tunnels'); const z = zoneOfSeg(c0); return landIdx(z) === TLI && boreAt(c0, LANDS[TLI]); };
  // cut-wall height 0..1 outside: rising toward each real portal, falling away after each real exit (0 where a bore was left out)
  const cutOf = i => { const k = i % 320; return k >= 288 ? (boreOK(i - k + 320) ? (k - 287) / 32 : 0) : k >= 200 && k < 232 ? (boreOK(i - k) ? (232 - k) / 32 : 0) : 0; };
  function place(i, s, L){
    const k = i % 320, cut = cutOf(i);
    // the city between the tunnels as projected buildings (engine projBox), so nothing beside the road turns into upscaled blocks: a back row
    // of towers, then a street row of shops, tiled offices and neon blocks; where the road cuts down toward a portal the street row stands
    // back behind the cut wall. (The old billboard placement drew 3 randoms every 6th segment: drawn the same, so curves and traffic don't move.)
    if(i % 6 === 0){ Math.random(); Math.random(); Math.random(); }
    for(const side of SX){ const sd = side > 0 ? 1 : 0;
      { const r = pbAt(i, side, 9, 5, 8, 21 + sd); if(r && cutOf(r.b0) < .6){ const hv = hash(r.n * 3.3 + sd); projBox(s, side, { b0:r.b0, len:r.len, x0:3.5 + hash(r.n * 1.9 + sd) * .6, h:2.2 + hv * 2.2, depth:1.1, lo:true, style:hv > .55 ? 'glass' : 'concrete', win:{ floor:.3, w:.5, h:.45, lit:.3 } }); } }
      // the street row: upper floors from projBox; at street level a konbini, an izakaya or a ramen shop (drawn here as quads on the face, so
      // the engine's plain ground floor is switched off for them), or the engine's own shopfront. Sign blades stick out over the pavement,
      // vending machines stand against the wall, and a signal stands at each alley crossing.
      { const r = pbAt(i, side, 11, 6, 9, 31 + sd); if(r && Math.max(cutOf(r.b0), cutOf(r.b0 + r.len - 1)) <= .1){ const c0 = cutOf(r.b0), hv = hash(r.n * 4.1 + sd), x0 = (c0 > .1 ? 2.9 : 1.8) + hash(r.n * 1.3 + sd) * .2, open = c0 <= .1, kind = open ? FRONT_OF(hash(r.n * 6.7 + sd)) : -1, blade = open && hash(r.n * 8.3 + sd) > .35;
          projBox(s, side, { b0:r.b0, len:r.len, x0, h:(c0 > .1 ? 1.5 : 1) + hv * 1.3, depth:.9, style:['concrete', 'tile', 'shutter', 'neon'][(r.n + sd) % 4], signs:!blade && hash(r.n * 8.3 + sd) > .2, ground:kind >= 0 || !open ? 'none' : undefined });
          if(kind >= 0) s.sprites.push({ env:'tunnels', type:'front', x:side * x0, k:i, b0:r.b0, len:r.len, kind, v:(hash(r.n * 2.3 + sd) * 4) | 0, side });
          if(blade && i === r.b0 + 1) s.sprites.push({ env:'tunnels', type:'blade', x:side * x0, k:i, v:(hash(r.n * 5.9 + sd) * BLADE.length) | 0, side, h:.95 + hash(r.n * 3.7 + sd) * .5 });
          if(open && kind !== 0 && hash(r.n * 9.1 + sd) > .45 && (i === r.b0 + r.len - 2 || i === r.b0 + r.len - 3)) s.sprites.push({ env:'tunnels', type:'vend', x:side * (x0 - .16), k:i, v:(hash(r.n * 4.7 + i) * 3) | 0, side }); }
        else if(cutOf(i) <= .1 && pbAt(i - 1, side, 11, 6, 9, 31 + sd) && hash(i * 1.3 + sd) > .4 && i % 12 > 1 && i % 12 < 11) s.sprites.push({ env:'tunnels', type:'signal', x:side * 1.2, k:i, side }); } }
    if(i % 12 === 0) s.sprites.push({ type:'lamp', x:-1.12 }, { type:'lamp', x:1.12 });
    // the cutting either side (projected walls and lattice slopes, narrowing toward the hood), the advance sign, the signal gantry
    if(cut > 0){ const t1 = k === 319 ? 1 : cutOf(i + 1), X = cutX(cut); s.sprites.push({ env:'tunnels', type:'cut', x:-X, h:cut, t1, k:i }, { env:'tunnels', type:'cut', x:X, h:cut, t1, k:i }); }
    if(k === 262 && cut > 0) s.sprites.push({ env:'tunnels', type:'tsign', x:0, k:i });
    if(k === 304 && cut > 0) s.sprites.push({ env:'tunnels', type:'gant', x:0, k:i });
  }
  /* ---- street life between the tunnels (studied: a Shinjuku side street at night; the old billboard city's konbini, signal and yellow blades).
     Everything is quads on the building's street face (the same span LOD as the engine's projBox, so details sit on their own face at any
     distance) or camera-facing cards made of grid rects, so nothing is a scaled sprite and nothing turns into blocks beside the camera. */
  const FRONT_OF = h => h < .34 ? 0 : h < .62 ? 1 : h < .84 ? 2 : -1;   // 0 konbini, 1 izakaya, 2 ramen, -1 the engine's own shopfront
  const KONBINI = [['#2aa0a0', '#3ac85a'], ['#2a5ab8', '#f4f6f8'], ['#ff8a2a', '#e8303a'], ['#3ac85a', '#ff8a2a']];   // fascia stripe pairs (generic, no brand)
  const NOREN = ['#1e2a5a', '#a01e24', '#1e2a5a', '#2a2a30'];
  const BLADE = [['#ffd04a', '#2a1410'], ['#f6f2ea', '#c8183a'], ['#ffd04a', '#c8183a'], ['#e8203a', '#fff4e0'], ['#4ff0ff', '#0c1a2a']];
  const fz = fog => { const q = Math.round(fog * .85 * 32); return c => fogc(c, q); };
  // the span this slice draws (1 near, up to 8 far; anchored to the run start, as the engine's drawPBox), or 0 if a nearer slice draws it
  function span(j, b0, len, fog){ const bse = j - Math.round(DRAW * Math.pow(fog, 1 / 1.6)), at = k => PB_SPAN(clamp(Math.pow((k - bse) / DRAW, 1.6), 0, 1));
    if(j > b0 && (j - b0) % at(j)) return 0; let n = 1; while(j + n < b0 + len && n < 8 && (j + n - b0) % at(j + n)) n++; return n; }
  // a quad on the plane parallel to the road at X, heights h0..h1 (half-road widths), sub-span ta..tb of this slice
  function faceQ(x, y, uw, X, k, n){ const t = segs[k + n - 1]; if(!t || !t.p2.screen.scale) return null; const q = t.p2.screen, x2 = q.x + X * q.w, y2 = q.y, u2 = q.w;
    const Q = (h0, h1, col, ta = 0, tb = 1) => { const xa = x + (x2 - x) * ta, xb = x + (x2 - x) * tb, ya = y + (y2 - y) * ta, yb = y + (y2 - y) * tb, ua = uw + (u2 - uw) * ta, ub = uw + (u2 - uw) * tb;
      poly(xa, ya - ua * h0, xb, yb - ub * h0, xb, yb - ub * h1, xa, ya - ua * h1, col); };
    Q.pt = (t, h) => [x + (x2 - x) * t, y + (y2 - y) * t - (uw + (u2 - uw) * t) * h, uw + (u2 - uw) * t]; Q.x2 = x2; Q.y2 = y2; Q.u2 = u2; return Q; }
  // light spilled from a front onto the pavement: one additive ground quad from the wall out toward the road
  function spill(x, y, uw, Q, side, out, rgb, a){ if(a <= .005) return; cx.globalCompositeOperation = 'lighter'; const o = side * out;
    poly(x, y, x - o * uw, y, Q.x2 - o * Q.u2, Q.y2, Q.x2, Q.y2, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); cx.globalCompositeOperation = 'source-over'; }
  // a paper lantern hung at a point: stacked grid rects (caps, body, a lit band) and a warm halo
  function chochin(px, py, u, F, a){ const w = Math.max(PX, u * .07), h = Math.max(PX * 2, u * .1); cx.fillStyle = F('#1a0e0a'); pxRect(px - w * .3, py - h * .62, w * .6, h * .12); pxRect(px - w * .3, py + h * .5, w * .6, h * .12);
    cx.fillStyle = F('#c8281e'); pxRect(px - w * .5, py - h * .5, w, h); pxRect(px - w * .62, py - h * .3, w * 1.24, h * .6); cx.fillStyle = F('#ff7a4a'); pxRect(px - w * .62, py - h * .08, w * 1.24, h * .16);
    if(a > .05) glow(px, py, Math.min(u * .22, H * .08), '#ff6a3a', .35 * a); }
  const GOODS = ['#e8303a', '#ffd04a', '#3ac85a', '#2a5ab8', '#ff8ab8'];
  function drawFront(sp, x, y, uw, fog, now){ const j = sp.k, n = span(j, sp.b0, sp.len, fog); if(!n) return; const Q = faceQ(x, y, uw, sp.x, j, n); if(!Q) return;
    if(sp.side < 0 ? Math.max(x, Q.x2) < 0 : Math.min(x, Q.x2) > W) return;   // beside the camera, off the screen edge
    const F = fz(fog);
    // far tier (most slices on screen): three plain quads, the base, the lit glass and the fascia, in each front's own colours
    if(fog > .22){ const k = sp.kind; Q(0, .3, F(k === 0 ? '#1a1c26' : k === 2 ? '#2a1410' : '#2a160e')); Q(.04, .23, F(k === 0 ? '#eef4ff' : k === 2 ? '#ffd890' : '#ffb860'), .04 / n, 1 - .04 / n);
      Q(.24, .34, F(k === 0 ? '#f4f6f8' : k === 2 ? '#c8202a' : '#1a0e0a'));
      if(k > 0 && fog < .5 && j <= sp.b0 + 1 && j + n > sp.b0 + 1){ const [px, py, u] = Q.pt((sp.b0 + 1 - j + .18) / n, .2), w = Math.max(PX, u * .08); cx.fillStyle = F('#e83a2a'); pxRect(px - w / 2, py - w * .7, w, w * 1.4); glow(px, py, Math.min(u * .22, H * .08), '#ff6a3a', .35 * (1 - fog / .5)); }   // the door lantern still reads from afar
      return; }
    const near = fog < .12 && n === 1, mid = fog < .25, door = j <= sp.b0 + 1 && j + n > sp.b0 + 1, dt = door ? (sp.b0 + 1 - j) / n : 0, side = sp.side;
    if(sp.kind === 0){ // konbini: a white-lit glass front, a white fascia with two colour stripes, shelves of goods, a door, light on the pavement
      const [c1, c2] = KONBINI[sp.v]; Q(0, .3, F('#1a1c26')); Q(.03, .24, F('#eef4ff'), .02 / n, 1 - .02 / n);
      if(near){ for(const h of [.085, .145, .2]) Q(h, h + .014, F('#9aa8c0'), .05, .95); Q(.03, .24, F('#2a2e3a'), .47, .53);
        for(let m = 0; m < 5; m++) Q(.15, .19, F(GOODS[(m + sp.v + j) % 5]), .1 + m * .17, .16 + m * .17);
        if(door){ Q(.03, .24, F('#c8d8ee'), dt + .3 / n, dt + .7 / n); Q(.03, .045, F('#3a4a5a'), dt + .25 / n, dt + .75 / n); } }
      Q(.24, .34, F('#f4f6f8')); Q(.262, .284, F(c1)); Q(.292, .314, F(c2)); Q(.34, .352, F('#a8acb8'));
      if(mid) spill(x, y, uw, Q, side, .5, '200,225,255', .09 * (1 - fog / .25)); return; }
    const ram = sp.kind === 2;   // izakaya (dark wood, a lit lattice window, an eave) or ramen (a red fascia with white characters, a lit counter); noren and lanterns at the door
    Q(0, .3, F(ram ? '#2a1410' : '#2a160e')); Q(.05, .22, F(ram ? '#ffd890' : '#ffb860'), .06 / n, 1 - .06 / n);
    if(near){ if(ram) Q(.05, .1, F('#8a4a24'), .06, .94); else { for(let m = 1; m < 6; m++) Q(.05, .22, F('#5a3018'), m / 6 - .012, m / 6 + .012); Q(.13, .14, F('#5a3018'), .06, .94); } }
    if(ram){ Q(.24, .34, F('#c8202a')); if(fog < .3) for(let m = 0; m < 3; m++) Q(.265, .315, F('#fff4e0'), (.2 + m * .25) / n, (.32 + m * .25) / n); Q(.34, .352, F('#7a1018')); }
    else { Q(.25, .33, F('#1a0e0a')); Q(.33, .35, F('#4a3a34')); }
    if(door){ Q(.03, .27, F('#ffcf80'), dt + .3 / n, dt + .7 / n);
      const nc = ram ? '#a01e24' : NOREN[sp.v]; for(let m = 0; m < 4; m++) Q(.14, .26, F(nc), dt + (.31 + m * .1) / n, dt + (.39 + m * .1) / n);
      if(fog < .3) Q(.19, .22, F('#f0ece0'), dt + .46 / n, dt + .54 / n);
      if(fog < .5){ const al = 1 - fog / .5, [px, py, u] = Q.pt(dt + .18 / n, .2); chochin(px, py, u, F, al); if(!ram){ const [qx, qy, v] = Q.pt(dt + .82 / n, .2); chochin(qx, qy, v, F, al); } } }
    if(mid) spill(x, y, uw, Q, side, .35, '255,170,90', .07 * (1 - fog / .25)); }
  // a vertical sign blade on two brackets, sticking out from the wall over the pavement toward the road (a card that faces the camera)
  function drawBlade(sp, x, y, uw, fog, now){ if(fog > .6 || uw < 2) return; const F = fz(fog), [bg, ink] = BLADE[sp.v], o = -sp.side, x0 = x + o * uw * .04, x1 = x + o * uw * .24, top = y - uw * (sp.h + .3), bot = y - uw * .42;
    const l = Math.min(x0, x1), w = Math.abs(x1 - x0); cx.fillStyle = F('#16121c'); pxRect(Math.min(x, x0), top + uw * .06, Math.abs(x0 - x) + PX, uw * .02); pxRect(Math.min(x, x0), bot - uw * .08, Math.abs(x0 - x) + PX, uw * .02);
    cx.fillStyle = F('#07050c'); pxRect(l - PX, top - PX, w + PX * 2, bot - top + PX * 2); cx.fillStyle = F(bg); pxRect(l, top, w, bot - top);
    if(fog < .35){ cx.fillStyle = F(mixc(bg, '#ffffff', .35)); pxRect(l + w * .38, top, w * .24, bot - top); cx.fillStyle = F(ink); const gh = (bot - top) / 4;
      for(let m = 0; m < 3; m++){ const gy = top + gh * (m + .55), hm = hash(sp.v * 7 + m * 3.1 + sp.k); pxRect(l + w * .22, gy, w * .56, Math.max(PX, gh * .14)); pxRect(l + w * (hm > .5 ? .3 : .55), gy, Math.max(PX, w * .14), gh * .7); pxRect(l + w * .25, gy + gh * .45, w * .5, Math.max(PX, gh * .12)); } }
    if(fog < .5) glow(l + w / 2, (top + bot) / 2, Math.min(uw * .45, H * .12), bg, .25 * (1 - fog / .5)); }
  // a lit vending machine against the wall: its front facing the road (a face quad one segment long) and its side toward us
  function drawVend(sp, x, y, uw, fog, now){ if(fog > .45 || uw < 2) return; const Q = faceQ(x, y, uw, sp.x, sp.k, 1); if(!Q) return; const F = fz(fog), body = ['#e8e4ec', '#c8203a', '#2050b0'][sp.v];
    Q(0, .38, F('#0c0a12')); Q(.01, .37, F(body), .06, .94); Q(.22, .34, F('#f4f8ff'), .14, .86);
    if(fog < .2){ for(let r = 0; r < 2; r++) for(let m = 0; m < 4; m++) Q(.245 + r * .05, .27 + r * .05, F(NEON[(m + r * 2 + sp.v) % 5]), .18 + m * .17, .26 + m * .17); Q(.08, .12, F('#1a1a22'), .2, .8); Q(.16, .19, F('#5a5a6a'), .62, .8); }
    const d = -sp.side * .16 * uw; cx.fillStyle = F(mixc(body, '#07050c', .45)); pxRect(Math.min(x, x - d), y - uw * .37, Math.abs(d), uw * .37);
    spill(x, y, uw, Q, sp.side, .3, '230,240,255', .12 * (1 - fog / .45)); glow((x + Q.x2) / 2, y - uw * .28, Math.min(uw * .3, H * .1), '#e8f4ff', .25 * (1 - fog / .45)); }
  // a Japanese signal at an alley crossing: a pole, an arm over the pavement, a horizontal three-lamp head (green, amber, red, left to right)
  // and a pedestrian head on the pole. It cycles slowly (12 s go, 3 s amber, 6 s stop): a change every few seconds, never a flash.
  const SIG = ['#3affc0', '#ffb020', '#ff3a2a'];
  function drawSignal(sp, x, y, uw, fog, now){ if(fog > .7 || uw < 2) return; const F = fz(fog), o = -sp.side, ph = (now / 1000 + hash(sp.k) * 21) % 21, st = ph < 12 ? 0 : ph < 15 ? 1 : 2;
    const pw = Math.max(PX, uw * .03), ay = y - uw * 1.25, ax = x + o * uw * .75; cx.fillStyle = F('#3a3e4a'); pxRect(x - pw / 2, ay, pw, uw * 1.25); pxRect(Math.min(x, ax), ay, Math.abs(ax - x), Math.max(PX, uw * .025));
    const hw = uw * .42, hh = Math.max(PX * 2, uw * .12), hx = ax - hw / 2, hy = ay - hh * .3; cx.fillStyle = F('#1a1c22'); pxRect(hx, hy, hw, hh); cx.fillStyle = F('#2e323c'); pxRect(hx, hy, hw, Math.max(PX, hh * .12));
    const ls = hw / 3, lr = Math.max(PX, ls * .55);
    for(let m = 0; m < 3; m++){ const cxm = hx + ls * (m + .5); cx.fillStyle = m === st ? SIG[m] : F(mixc(SIG[m], '#07050c', .78)); pxRect(cxm - lr / 2, hy + hh * .5 - lr * .36, lr, lr * .72); pxRect(cxm - lr * .36, hy + hh * .5 - lr / 2, lr * .72, lr); }
    if(fog < .55) glow(hx + ls * (st + .5), hy + hh * .5, Math.min(uw * .25, H * .1), SIG[st], .4 * (1 - fog / .55));
    const walk = st === 2, py = y - uw * .78, ps = Math.max(PX * 2, uw * .09), bx = o > 0 ? x + pw / 2 : x - pw / 2 - ps; cx.fillStyle = F('#1a1c22'); pxRect(bx, py, ps, ps * 1.6);
    cx.fillStyle = walk ? SIG[0] : SIG[2]; pxRect(bx + ps * .3, py + ps * (walk ? .9 : .2), ps * .4, ps * .5); }
  function draw(sp, x, y, uw, fog, now, sk){
    const M = c => mq(c, sk.low, fog * .8);
    if(sp.type === 'front') return drawFront(sp, x, y, uw, fog, now); if(sp.type === 'blade') return drawBlade(sp, x, y, uw, fog, now); if(sp.type === 'vend') return drawVend(sp, x, y, uw, fog, now); if(sp.type === 'signal') return drawSignal(sp, x, y, uw, fog, now);
    // far away one slice of the cutting spans 2 (past ~120 segments) or 4 (past ~210) segments, anchored to the world (k % m), its far end the
    // last segment's: a tenth of a pixel deep each, so nothing shows the merge, and the far view costs a quarter of the quads
    if(sp.type === 'cut'){ const fp = fogPx(fog), m = fp > .7 ? 4 : fp > .3 ? 2 : 1; if(sp.k % m) return;
      const sd = sp.x < 0 ? -1 : 1, ke = sp.k + m - 1, t0 = sp.h, t1 = m === 1 ? sp.t1 : ke % 320 === 319 ? 1 : cutOf(ke + 1), lit = sp.k % 12 < 2 || sp.k % 12 > 10;
      cutting(ke, x - sp.x * uw, y, uw, sd, cutX(t0), cutX(t1), cutH(t0), cutH(t1), cutS(t0), cutS(t1), M, lit); return; }
    if(sp.type === 'gant') return drawGant(sp, x, y, uw, fog, M, now);
    if(sp.type === 'tsign'){ const pw = uw * 2.2, ph = uw * .62, px = x - pw / 2, py = y - uw * 2.2, a = 1 - fog * .6; cx.globalAlpha = a;
      cx.fillStyle = M('#16121c'); pxRect(q(x - pw * .42), q(py + ph), Math.max(PX, q(uw * .05)), q(y - py - ph)); pxRect(q(x + pw * .4), q(py + ph), Math.max(PX, q(uw * .05)), q(y - py - ph));
      cx.fillStyle = '#e8e4d8'; pxRect(q(px - uw * .03), q(py - uw * .03), q(pw + uw * .06), q(ph + uw * .06)); cx.fillStyle = '#17784a'; pxRect(q(px), q(py), q(pw), q(ph));
      // tunnel pictogram: a white arch over a road
      const ax = px + ph * .5, ay = py + ph * .5, ar = ph * .3; cx.fillStyle = '#ffffff'; pxRect(q(ax - ar), q(ay - ar * .4), q(ar * 2), q(ar * 1.3)); cx.fillStyle = '#17784a'; pxRect(q(ax - ar * .6), q(ay - ar * .1), q(ar * 1.2), q(ar));
      if(uw > 6){ const t1 = textSprite(NAMES[Math.floor(sp.k / 320 + 1) % NAMES.length], '#ffffff', 16), t2 = textSprite('全長 4 km', '#ffffff', 16), w1 = pw - ph * 1.2;
        if(t1) blitW(t1, px + ph + w1 / 2, py + ph * .33, w1); if(t1 && t2){ const w2 = t2.width * w1 / t1.width * .75; blitW(t2, px + ph + w2 / 2, py + ph * .74, w2); } }
      cx.globalAlpha = 1; }
  }
  // the signal gantry just before the mouth (Enasan): two posts, a beam, a dark LED board in amber (トンネル情報 / 点灯), a green signal over
  // each carriageway half and a yellow "lights on" plate on the right post. Grid rects facing the camera.
  function drawGant(sp, x, y, uw, fog, M, now){ if(uw < 1.5) return; const a = 1 - fog * .6, ph = uw * 1.62, pw = Math.max(PX, q(uw * .06)), xl = x - 1.6 * uw, xr = x + 1.6 * uw, by = y - ph;
    cx.globalAlpha = a; cx.fillStyle = M('#2a2e3e'); R(q(xl), q(by), pw, q(y) - q(by)); R(q(xr) - pw, q(by), pw, q(y) - q(by));
    cx.fillStyle = M('#3a3f54'); R(q(xl), q(by), q(xr) - q(xl), Math.max(PX, q(uw * .07))); R(q(xl), q(by + uw * .14), q(xr) - q(xl), Math.max(PX, q(uw * .04)));
    const bw = uw * 1.25, bh = uw * .42, bx = x - bw / 2, bt = by - bh * .6; cx.fillStyle = M('#07070b'); R(q(bx - PX), q(bt - PX), q(bw) + PX * 2, q(bh) + PX * 2); cx.fillStyle = M('#121218'); R(q(bx), q(bt), q(bw), q(bh));
    if(uw > 5){ const t1 = textSprite('トンネル情報', '#ffb030', 16), t2 = textSprite('点灯', '#ffb030', 16); if(t1) blitW(t1, x, bt + bh * .3, bw * .86); if(t2){ const w2 = t1 ? t2.width * bw * .86 / t1.width : bw * .3; blitW(t2, x, bt + bh * .74, w2); } }
    else { cx.fillStyle = '#c8801c'; R(q(bx + bw * .1), q(bt + bh * .4), q(bw * .8), PX); }
    if(fog < .7) glow(x, bt + bh / 2, Math.min(bw * .7, H * .12), '#ff9a20', .12 * (1 - fog));
    for(const sd of SX){ const hx = x + sd * 1.05 * uw, hw = uw * .3, hh = uw * .13, hy = by - hh * .2; cx.fillStyle = M('#0a0a10'); R(q(hx - hw / 2), q(hy), q(hw), Math.max(PX * 2, q(hh)));
      const lr = Math.max(PX, q(hh * .6)); for(let m = 0; m < 3; m++){ const lx = hx - hw / 2 + hw * (m + .5) / 3; cx.fillStyle = m === 0 ? '#3affc0' : M('#1c2a24'); R(q(lx - lr / 2), q(hy + hh * .2), lr, lr); }
      if(fog < .7) glow(hx - hw / 3, hy + hh * .5, Math.min(uw * .25, H * .08), '#3affc0', .3 * (1 - fog)); }
    const yw = uw * .3, yh = uw * .17, yx = xr - pw - PX, yy = y - uw * 1.05; cx.fillStyle = M('#1a1408'); R(q(yx - yw) - PX, q(yy) - PX, q(yw) + PX * 2, q(yh) + PX * 2); cx.fillStyle = M('#e8b820'); R(q(yx - yw), q(yy), q(yw), q(yh));
    { const t3 = uw > 5 && textSprite('点灯', '#14100a', 16); if(t3) blitW(t3, yx - yw / 2, yy + yh / 2, yw * .7); }
    cx.globalAlpha = 1; }
  function lit(i){ const d = Math.min(i % 12, 12 - i % 12); return Math.max(0, 1 - d / 3); }

  // ---- screen grade: sodium (or LED) wash on everything inside, a pulse as each lamp row passes overhead, stepped vignette
  function overlay(al, now, sk){
    const z = (position + PZ) / SEG, i = Math.floor(z), s = segAt(position + PZ); if(!s) return;
    const k = i % 320 + (z - i), P = palOf(i);
    const g = s.tunnel ? clamp(Math.min(k, 200 - k) / 4, 0, 1) * al : 0;
    if(g <= 0) return;
    cx.globalCompositeOperation = 'multiply'; cx.globalAlpha = g * P.gradeA; cx.fillStyle = P.grade; pxRect(0, 0, W, H);
    cx.globalCompositeOperation = 'lighter'; const per = thr(i % 320) ? 2 : 4, ph = (z % per) / per, v = reduce ? .5 : ph < .2 ? 1 : ph < .45 ? .55 : ph < .8 ? .2 : .55;
    cx.globalAlpha = g * .07 * v; cx.fillStyle = P.glow; pxRect(0, 0, W, H);
    cx.globalCompositeOperation = 'source-over';
    // stepped vignette, three hard frames
    cx.fillStyle = '#000000'; for(let n = 0; n < 3; n++){ const m = q(Math.min(W, H) * (.03 + n * .035)); cx.globalAlpha = g * .14; pxRect(0, 0, W, m); pxRect(0, H - m, W, m); pxRect(0, m, m, H - 2 * m); pxRect(W - m, m, m, H - 2 * m); }
    cx.globalAlpha = 1;
  }

  // build every sprite and colour table up front so nothing is made mid-ride
  function warm(){
    for(const P of [SOD, LED]){ fanSprite(P); for(const key of ['ceil', 'wall', 'panel', 'kerb', 'road', 'metal']) for(const c of P[key]){ fc(P, c, 0); for(let cs = 1; cs < 6; cs++) fcc(P, c, cs, 0); } for(const c of [P.line, P.lamp, P.lane, '#3aff7a', '#d8b070', '#d8dce0']) fc(P, c, 0); }
    exitSprite(); exitNear(); sosSprite(); arrowSprite(true); arrowSprite(false);
    const txt = () => { for(const n of NAMES){ textSprite(n, '#ffe2a8', 16); textSprite(n, '#ffffff', 16); } textSprite('全長 4 km', '#ffffff', 16); textSprite('トンネル情報', '#ffb030', 16); textSprite('点灯', '#ffb030', 16); textSprite('点灯', '#14100a', 16); };
    try{ document.fonts.load('16px DotGothic16').then(txt, txt); }catch(e){ txt(); }
  }
  // inside a bore the lane lines are solid no-overtaking lines (Japanese tunnels: no lane changes), amber under sodium, pale under LED: the
  // engine draws them through its lane path (laneMark), so they run to the far end of the bore like every road's dashes
  const laneSolid = s => palOf(s.index).lane;
  ENV.tunnels = { warm, drawTunnel, roadFX, place, draw, lit, overlay, laneSolid, lampCol:'#8a5a2a', road:['#1e1c26', '#22202b'],
    /* the interchange jump (setpiece/jump.js, research/sundown-craft/jumpsides.md): the gap is a sunken expressway slot as wide as the
       road and its pavements, walled by the jump's parapets (a Shuto cutting between the blocks); both street rows carry on beside it. The
       alley signals hang their heads over the carriageway, which the ramp and the slot replace, so none stand along the jump. */
    jumpFloor:1.55,
    jumpKeep(sp, o, p){ return sp.type === 'signal' ? false : undefined; } };
})();

// where this road's barrier is drawn, for the collider (half-road widths)
ENV.tunnels.barrier = 1.1;
