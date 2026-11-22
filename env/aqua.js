/* Sundown environment: Aqua-Line (Tokyo Bay Aqua-Line). See env/README.md for the hooks.
   A shield tunnel under Tokyo Bay, then out over the open water on a low sea bridge, past Umihotaru, the ship-shaped rest island,
   toward the wind towers that breathe for the next tunnel.

   References studied (Wikimedia Commons photos, looked at, rules taken, art drawn fresh):
   - "Tokyo Wan Aqualine 01" and "Tokyo Bay Aqua-Line Highway (30700131481)" (night): sodium-orange lamps on single-arm poles, dense and on
     both sides, read as two converging strings of warm dots; the road itself is the brightest band in a black field; far shore is a thin
     dotted line of warm and white points just above the water. -> orange poles every 8 segments both sides, deck lit, everything else dark.
   - "Tokyo Aqua line bridge", "Tokyo-bay aqualine01": the bridge is LOW over the water, white concrete parapets with a slim rail on top,
     the deck is a thin pale lip. -> a solid lit parapet (no see-through panels), a pale deck lip, water right up to it.
   - "海ほたる（夜景）" and the Umihotaru aerial photo: a long terraced ship on a seawall; white sail tents lit violet-white; white funnels
     with a dark band; long bands of warm windows; tetrapods along the waterline. -> Umihotaru sprite: terraced decks, warm window bands,
     violet-white sails, banded funnels, tetrapod revetment, a baked broken reflection.
   - "Kawasaki artificial island" (Kaze no Tō): a striped egg-shaped tower with a leaning elliptical sail beside it, on a flat low platform;
     red-white stacks and tanks of the Kawasaki works behind. -> the wind towers stand behind each tunnel portal; the Kawasaki works glow on
     the horizon (factory night view: dense white/sodium pinpoints, red aviation lights, a flare).
   - "Tromsøysundtunnelen - Inside" / "Eiksundtunnelen" (undersea road tunnels): a round tube of ring-jointed lining, a pale wainscot of panels
     low on the walls, a recessed lit door, the light pooled in a strip; the crown stays dark. -> 19-facet tube, ring joints every 4 rings,
     pale wainscot with an aqua stripe, two continuous LED line lights (steady, no strobe), evacuation doors, hydrant cabinets.
   - Pixel-art rules from this game's own bar (Night Tunnels, Bay Bridge, Harbour Line) and Night Striker / Chase H.Q.: hard colour bands per
     ring, stepped halos, one warm key on a cool base, reflections as broken vertical dashes that ride with their light.
   Under the bay (the dive; Commons: "Tower of Wind at Tokyo bay (Kaze no Tou)", "Thetowerofwind-jan7-2015", "Tokyo Bay Aqua-Line" (aerial),
   "Tokyo Wan Aqua-Line Expressway" (Umihotaru from the deck), "Tunnel drill cutting shield at Umihotaru Parking Area"). Rules taken:
   1. The road meets the sea at an island and goes DOWN: at Umihotaru the carriageway drops into a walled U-cutting along the island's spine,
      seawall and tetrapods right beside it, open water on both sides. -> before every portal the road ramps down ~0.65 road widths below
      sea level between retaining walls whose coping sits at the waterline; the sea fills everything beyond the coping.
   2. Seen from the road the sea is a flat dark plane that meets the walls, so the cutting reads as "below the water" only when the water's
      edge is level with the coping and the road keeps falling. -> sea drawn at true sea level (the undipped road height), foam where it
      laps the coping, swell crests that show over the wall top once your eye is below the sea.
   3. Kaze-no-To stands alone in open water over the middle of the tunnel: a low round white platform, two striped towers leaning together;
      from far off a single white egg on the horizon. -> it rises from the sea well off the road, ~70 segments past the portal, so it is
      seen beside the headwall on the approach, with a foam ring and a broken reflection.
   4. The bridge is low over the water and the island is where road and sea meet (aerial: a thin line ending in the island). -> after the
      climb out, the Umihotaru apron and the ship-island sit right where you surface; then the low bridge.
   5. Undersea road tunnels (Tromso/Eiksund, Aqua Tunnel) are wet: dark seepage tracks down the lining, white calcite at their feet, drips
      from the crown, a cold cast. -> sparse world-anchored streaks and slow drips, a blue-green grade, a low swell of sea rumble.
   6. Artistic licence: one observation-window strip in the deepest stretch, framed in steel with a cyan sill light, looking into murky
      water lit from far above (light shafts, kelp, a passing school), drifting slowly like a distant view, never like a texture glitch.
   Lessons kept: reflections are world-anchored (lamp/car columns hang from their own segment) or physically screen-anchored (moon glade,
   far-shore mirror) and only shimmer on a slow 1.2 s phase; fog tints sprites opaque, never alpha; every sprite and table is built in warm(). */
"use strict";
(() => {
  /* Larger art sizes for the big roadside buildings (research/sundown-buildings.md): the pixel sprite scaled 2x (and 4x) with Scale2x (EPX),
     built in warm(), which keeps the pixel look but rounds the staircases. artK(spr, k) hands back whichever size keeps one sprite pixel
     within ~1.5 canvas pixels as it passes the camera (a fog-tinted copy has no larger size, but those are only drawn far away). */
  function artX2(c){ const w = c.width, h = c.height, src = new Uint32Array(c.getContext('2d').getImageData(0, 0, w, h).data.buffer.slice(0)), o = document.createElement('canvas'); o.width = w * 2; o.height = h * 2;
    const k = o.getContext('2d'), img = k.createImageData(w * 2, h * 2), dst = new Uint32Array(img.data.buffer), at = (x, y, P) => x < 0 || y < 0 || x >= w || y >= h ? P : src[y * w + x];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const P = src[y * w + x], A = at(x, y - 1, P), B = at(x + 1, y, P), C = at(x - 1, y, P), D = at(x, y + 1, P), o0 = y * 4 * w + x * 2, o1 = o0 + w * 2;
      dst[o0] = C === A && C !== D && A !== B ? A : P; dst[o0 + 1] = A === B && A !== C && B !== D ? B : P; dst[o1] = D === C && D !== B && C !== A ? C : P; dst[o1 + 1] = B === D && B !== A && D !== C ? D : P; }
    k.putImageData(img, 0, 0); return o; }
  function artSizes(c, four){ if(!c._x2) c._x2 = artX2(c); if(four && !c._x4) c._x4 = artX2(c._x2); cx.drawImage(c._x2, 0, 0, 1, 1); if(c._x4) cx.drawImage(c._x4, 0, 0, 1, 1); return c; }
  const artK = (c, k) => { const s = k / PX; return s > 3 && c._x4 ? [c._x4, k / 4] : s > 1.5 && c._x2 ? [c._x2, k / 2] : [c, k]; };
  const q = v => Math.round(v / PX) * PX;
  const H0 = n => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };
  const RND = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function pix(key, w, h, fn){ const kk = 'aq_' + key; if(SPR[kk]) return SPR[kk]; const c = mk(w, h), k = c.getContext('2d');
    const P = { k, w, h,
      px(x, y, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col){ k.fillStyle = col; k.fillRect(x, y, ww, hh); },
      line(x0, y0, x1, y1, col){ k.fillStyle = col; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for(;;){ k.fillRect(x0, y0, 1, 1); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } } };
    fn(P); return SPR[kk] = c; }

  // ---------------------------------------------------------------- the outdoor fog colour (sky low), quantised so colour caches stay valid
  let LOW = '#0a2030', lowKey = '';
  function setLow(c){ const [r, g, b] = hx(c), k = (r >> 3) + ',' + (g >> 3) + ',' + (b >> 3); if(k !== lowKey){ lowKey = k; LOW = `rgb(${(r >> 3) << 3},${(g >> 3) << 3},${(b >> 3) << 3})`; FC = new Map(); } }
  let FC = new Map();
  const fc = (col, fog) => { const st = Math.round(clamp(fog, 0, 1) * 12), key = col + st; let v = FC.get(key); if(v === undefined){ v = mixc(col, LOW, st / 12 * .88); FC.set(key, v); } return v; };
  // fogged sprite copies (opaque tint toward the fog colour, so nothing turns see-through)
  function fogged(spr, name, fog){ return fogTint(spr, 'aq:' + name, Math.min(4, Math.round(fog * 5)), 4, LOW, .84); }   // the engine's bounded fog-tint cache (built in warm())

  const fontOK = () => { try{ return document.fonts.check('16px DotGothic16'); }catch(e){ return true; } };
  function textSprite(str, col, px){ const key = 'aq_t' + str + col + px; if(SPR[key]) return SPR[key]; if(!fontOK()) return null;
    const c = mk(8, 8), k = c.getContext('2d'); k.font = px + 'px DotGothic16, monospace'; c.width = Math.ceil(k.measureText(str).width) + 2; c.height = px + 4;
    k.font = px + 'px DotGothic16, monospace'; k.textBaseline = 'middle'; k.fillStyle = col; k.fillText(str, 1, c.height / 2);
    const im = k.getImageData(0, 0, c.width, c.height), d = im.data; for(let n = 3; n < d.length; n += 4) d[n] = d[n] > 70 ? 255 : 0; k.putImageData(im, 0, 0); return SPR[key] = c; }
  /* Type for signs (audit #16: it was drawn live at screen resolution, thin anti-aliased strokes much finer than the world's grid, so it
     read as a UI overlay): the pixel font rasterised once per string as a hard mask (16 px, its native grid, then 13, 11 and 9 px for the
     middle distance), drawn at a whole number of canvas pixels a font pixel, tinted through one scratch canvas (the sign colours carry the fog).
     Too small for even one canvas pixel a font pixel: false, and the caller draws its bars. Masks and scratch are built in warm(). */
  const TMK = {}, TSZ = [16, 13, 11, 9]; let TSC = null;
  function textMask(str, px){ const key = str + '|' + px; if(TMK[key]) return TMK[key]; if(!fontOK()) return null;
    const c = mk(8, 8), k = c.getContext('2d'); k.font = px + 'px DotGothic16, monospace'; c.width = Math.ceil(k.measureText(str).width) + 2; c.height = px + 4;
    k.font = px + 'px DotGothic16, monospace'; k.textBaseline = 'middle'; k.fillStyle = '#fff'; k.fillText(str, 1, c.height / 2);
    const im = k.getImageData(0, 0, c.width, c.height), d = im.data, th = px >= 16 ? 70 : 150; for(let n = 3; n < d.length; n += 4) d[n] = d[n] > th ? 255 : 0; k.putImageData(im, 0, 0); return TMK[key] = c; }   // (below its native size the font is cut harder, so strokes stay one pixel)
  function liveText(str, x, yMid, maxW, maxH, col){ if(!TSC) return false;
    for(const px of TSZ){ const m = textMask(str, px); if(!m) return false; const fit = Math.min(maxW / m.width, maxH / (m.height - 4)); if(fit < PX) continue;
      const s = px === 16 ? Math.floor(fit / PX) * PX : PX, w = m.width, h = m.height; if(w > TSC.width || h > TSC.height) return false;
      const g = TSC.getContext('2d'); g.clearRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
      cx.imageSmoothingEnabled = false; cx.drawImage(TSC, 0, 0, w, h, Math.round((x - w * s / 2) / PX) * PX, Math.round((yMid - h * s / 2) / PX) * PX, w * s, h * s); return true; }
    return false; }
  const blitW = (c, x, yMid, w) => { const sc = w / c.width; blit(c, x, yMid + c.height * sc / 2, sc); };
  const gl = (x, y, r, col, a) => { if(a <= .01 || x + r < 0 || x - r > W || y + r < 0 || y - r > H) return; glow(x, y, Math.min(r, H * .3), col, a); };

  // ================================================================ the undersea tube
  // section in half-road widths: a circle of radius RR whose centre sits CY above the road; the deck is a chord across it
  const RR = 1.7, CY = .75, OW = Math.sqrt(RR * RR - CY * CY), PHI0 = Math.acos(-CY / RR);
  // facet angles (from the crown, + to the right); the band boundaries are facet vertices so every band edge is a clean converging line
  const B_SKIRT = 1.95, B_STRIPE = 1.80, B_LINING = 1.74, B_SHEEN = 1.26, B_LED = 1.07, B_HOUSE = .99, B_CROWN = .93;
  const ANG = [PHI0, 1.95, 1.80, 1.74, 1.5, 1.26, 1.07, .99, .93, .62, .31];
  const PHIS = [...ANG.map(a => -a), 0, ...ANG.slice().reverse()];
  const UX = PHIS.map(Math.sin), UY = PHIS.map(a => -Math.cos(a)), NA = PHIS.length;
  const idxOf = a => PHIS.indexOf(a);
  const T = {
    crown:['#08131b', '#0a1720'], house:'#04090e', led:'#effdff', ledLo:'#9fe2f4', sheen:['#2c5466', '#2a5062'], lining:['#183040', '#1a3446'],
    stripe:'#1a78b8', stripeHi:'#56c4f0', wain:['#3e6676', '#426a7a'], wainHi:'#7aa6b6', skirt:'#142430', joint:'#071018', guide:'#bff4ff',
    road:['#121a22', '#141c25'], sheenRd:'#223644', kerb:'#2c3e4a', kerbHi:'#5a7a8a', lane:'#e6dcb0', edge:'#d4e6ee', line:'#05090d',
    haze:'#08141c', steel:['#0a0e14', '#26303c', '#4a5a6c', '#8a9cb0'], rim:'#2c3c64'
  };
  // stepped fog toward the tube's own haze (7 hard steps), with an optional cool tint for the rings by the mouths
  const TQ = new Map();
  const tc = (col, fog, cs) => { const st = Math.min(6, Math.floor(fog * 7)), key = col + st + '|' + cs; let v = TQ.get(key);
    if(v === undefined){ const c = cs ? mixc(col, T.rim, cs / 10) : col; v = mixc(c, T.haze, st / 6 * .85); TQ.set(key, v); } return v; };

  // one fan: the wall region outside the opening between -a and +a, out to a big box (clamped above the road line)
  // every ring's face is bounded by the portal headwall's box at that ring's scale (EXW x EXH), so from outside nothing pokes past the
  // headwall; inside, the nearest rings' boxes are far bigger than the screen
  const EXW = 3.6, EXH = 3.0;
  let fx = 0, fyc = 0, fr = 0, fyRoad = 0, fbx = 0, fby = 0;
  const cxp = v => clamp(v, fx - fbx, fx + fbx), cyp = v => clamp(v, fby, fyRoad);
  let G = null;   // the context the fans paint into: the game canvas, or a cached ring image
  function fan(a, col){ const g = G || cx, i0 = idxOf(-a), i1 = idxOf(a), big = fr * 6; g.fillStyle = col; g.beginPath();
    for(let n = i0; n <= i1; n++) n === i0 ? g.moveTo(fx + fr * UX[n], fyc + fr * UY[n]) : g.lineTo(fx + fr * UX[n], fyc + fr * UY[n]);
    g.lineTo(cxp(fx + big * UX[i1]), cyp(fyc + big * UY[i1])); g.lineTo(fx + fbx, fby); g.lineTo(fx - fbx, fby); g.lineTo(cxp(fx + big * UX[i0]), cyp(fyc + big * UY[i0]));
    g.closePath(); g.fill(); }
  function arcStroke(a, rf, col, lw){ const g = G || cx, i0 = idxOf(-a), i1 = idxOf(a); g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
    for(let n = i0; n <= i1; n++){ const px = fx + fr * rf * UX[n], py = fyc + fr * rf * UY[n]; n === i0 ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke(); }
  // the bands of one ring face (C picks the fogged colour); 'far' rings drop the thin bands
  function ringFace(C, blk, far, fog, joint, jw){
    fan(PHI0, C(T.skirt)); fan(B_SKIRT, C(T.wain[blk]));
    if(!far){ fan(B_STRIPE, C(T.stripe)); fan(B_LINING, C(T.lining[blk])); fan(B_SHEEN, C(T.sheen[blk])); }
    else fan(B_LINING, C(T.lining[blk]));
    fan(B_LED, fog > .55 ? C(T.ledLo) : T.led);
    if(!far) fan(B_HOUSE, C(T.house));
    fan(B_CROWN, C(T.crown[blk]));
    // a ring joint every 4 rings (period 4 keeps it from strobing at full speed)
    if(joint) arcStroke(PHI0, 1, C(T.joint), jw); }
  // ring faces are the same shape at every distance, so all but the nearest are cached images (one per size level, block tone, joint and
  // fog step) blitted at the ring's scale: one textured quad per ring instead of seven path fills. Levels are in canvas pixels per
  // half-road width; a ring uses the smallest level at least as big as itself, so it is only ever scaled down (by at most 2x).
  const LV = [6, 12, 24, 48, 96], RINGS = new Map();
  function ringImg(L, blk, joint, st){ const key = L * 100 + blk * 20 + joint * 10 + st; let c = RINGS.get(key); if(c) return c;
    const w = Math.ceil(2 * EXW * L), h = Math.ceil(EXH * L); c = mk(w, h); G = c.getContext('2d');
    const sfx = fx, sfyc = fyc, sfr = fr, sfy = fyRoad, sbx = fbx, sby = fby;
    fx = w / 2; fyRoad = EXH * L; fyc = fyRoad - CY * L; fr = RR * L; fbx = EXW * L; fby = 0;
    const fog = st / 7 + .01; ringFace(col => tc(col, fog, 0), blk, L < 24, fog, joint, 1);
    fx = sfx; fyc = sfyc; fr = sfr; fyRoad = sfy; fbx = sbx; fby = sby; G = null; RINGS.set(key, c); return c; }
  // a point on the tube wall of any ring (for panels that span several rings)
  const wallPt = (sx, sy, w, a) => [sx + RR * w * Math.sin(a), sy - CY * w - RR * w * Math.cos(a)];
  function wallQuad(i, n, a0, a1, col){ const A = segs[i], B = segs[i + n]; if(!A || !B || !B.p1.screen.w) return false;
    const p = A.p1.screen, r = B.p1.screen, [x1, y1] = wallPt(p.x, p.y, p.w, a0), [x2, y2] = wallPt(p.x, p.y, p.w, a1), [x3, y3] = wallPt(r.x, r.y, r.w, a1), [x4, y4] = wallPt(r.x, r.y, r.w, a0);
    poly(x1, y1, x2, y2, x3, y3, x4, y4, col); return true; }

  const TUN_NAME = '東京湾アクアトンネル';
  const DEPTH = { 20:'海面下 25m', 60:'海面下 45m', 100:'海面下 60m', 140:'海面下 45m', 180:'海面下 25m' };
  const KMB = { 35:'出口まで 4km', 85:'出口まで 3km', 135:'出口まで 2km', 185:'出口まで 500m' };
  const exitSign = () => pix('exit', 15, 7, P => { P.rect(0, 0, 15, 7, '#0a3a1c'); P.rect(1, 1, 13, 5, '#22c45c');
    ['.ww..', 'www.w', '.w.w.', 'w...w'].forEach((r, y) => { for(let x = 0; x < 5; x++) if(r[x] === 'w') P.px(2 + x, 1 + y + (y > 1 ? 1 : 0) - (y > 2 ? 1 : 0), '#f4fff0'); });
    P.rect(8, 2, 5, 1, '#f4fff0'); P.rect(8, 4, 4, 1, '#f4fff0'); });
  // evacuation door, seen face-on at the foot of the wall: a dark recess, a pale steel door with a wired window, a green lamp strip over it
  const doorSpr = () => pix('door', 14, 22, P => { P.rect(0, 2, 14, 20, '#081016'); P.rect(1, 3, 12, 19, '#0e1a20'); P.rect(2, 5, 10, 17, '#6a8c98'); P.rect(2, 5, 1, 17, '#9ab8c4'); P.rect(11, 5, 1, 17, '#3e5a66');
    P.rect(4, 8, 6, 5, '#1e3440'); P.rect(4, 8, 6, 1, '#b8e0ec'); P.px(6, 10, '#3a5a68'); P.px(8, 11, '#3a5a68'); P.rect(9, 14, 2, 1, '#e8f0f0'); P.rect(0, 0, 14, 2, '#18c868'); P.rect(1, 0, 12, 1, '#7affb0'); });
  const hydrant = () => pix('hyd', 9, 12, P => { P.rect(0, 2, 9, 10, '#2a0608'); P.rect(1, 3, 7, 8, '#b81e28'); P.rect(1, 3, 7, 1, '#ff5a48'); P.rect(2, 5, 5, 4, '#7a1018'); P.rect(3, 6, 3, 2, '#e8d8c8'); P.rect(3, 0, 3, 2, '#ff6a50'); });

  // ---- near art (nearprops pass): beside the camera the door, its exit sign and the hydrant cabinet were drawn at 4-6 canvas px per sprite
  // pixel and read as flat blocks. Past 2 canvas px per pixel each switches to the same design at three times the resolution (hand-placed
  // rects: 1 px rims, lit top edges, shaded sides, the door's wired glass, the cabinet's 消火栓 plate), the same footprint, drawn at sk / 3.
  // The running figure is the 避難口誘導灯 pictogram (Ota Yukio, 1982; ISO 7010 E002), as env/tunnels.js draws it near by.
  const FIG3 = [[[18.6, 3.4], [18.6, 3.4], 1.9], [[17.6, 6.4], [15, 10.6], 1.45], [[17.4, 6.6], [20.2, 8.6], .95], [[20.2, 8.6], [22.4, 6.8], .95], [[16.6, 6.8], [13.4, 7.2], .95], [[13.4, 7.2], [11.2, 9.6], .95],
    [[15, 10.6], [18.8, 12.6], 1.05], [[18.8, 12.6], [19.4, 16.6], 1.05], [[19.4, 16.6], [21.2, 16.6], .8], [[15, 10.6], [12.6, 13.8], 1.05], [[12.6, 13.8], [9, 14.4], 1.05], [[9, 14.4], [8.4, 16], .8]];
  const sD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1) : 0, ex = x - a[0] - dx * t, ey = y - a[1] - dy * t; return Math.sqrt(ex * ex + ey * ey); };
  const GLY = ['..x.x..xxx.xxx..x.x..xxx.xxx..x.x..xxx.xxx.x...x.', '.x.x.x.xxxxxxxx.....x..xxx....x.x..xxxxxxxx..x..x', '.......xxxxxx.x....x.x....x.x....x.xxxxxx........'];   // 非 常 口, 7 x 7 each
  const exitSign3 = () => pix('exit3', 45, 21, P => { P.rect(0, 0, 45, 21, '#0a2a16'); P.rect(1, 1, 43, 19, '#34463e'); P.rect(1, 1, 43, 1, '#6a8a7a'); P.rect(1, 19, 43, 1, '#1a2a22');
    P.rect(2, 2, 41, 17, '#21c25a'); P.rect(2, 2, 41, 1, '#5aec8e'); P.rect(2, 18, 41, 1, '#18a24a');
    for(let y = 0; y < 17; y++) for(let x = 0; x < 20; x++){ const fx = x + 3.5, fy = y + .5; for(const [a, b, r] of FIG3) if(sD(fx, fy, a, b) <= r){ P.px(x + 2 - 3, y + 2, '#f4fff0'); break; } }
    GLY.forEach((g, n) => { for(let i = 0; i < 49; i++) if(g[i] === 'x') P.px(21 + n * 8 + (i % 7), 7 + ((i / 7) | 0), '#f4fff0'); }); });
  const doorSpr3 = () => pix('door3', 42, 66, P => { P.rect(0, 6, 42, 60, '#081016'); P.rect(3, 9, 36, 57, '#0e1a20'); P.rect(3, 9, 36, 1, '#2a3e48');
    P.rect(6, 15, 30, 51, '#6a8c98'); P.rect(6, 15, 1, 51, '#c8e0ea'); P.rect(7, 15, 2, 51, '#9ab8c4'); P.rect(33, 15, 3, 51, '#3e5a66'); P.rect(35, 15, 1, 51, '#2a4048'); P.rect(6, 15, 30, 1, '#b8d4dc');
    P.rect(11, 23, 20, 17, '#0e1a20'); P.rect(12, 24, 18, 15, '#1e3440'); P.rect(12, 24, 18, 1, '#b8e0ec');
    for(let y = 25; y < 39; y++) for(let x = 12; x < 30; x++) if((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) P.px(x, y, '#2e4a58');   // wired glass
    P.px(14, 26, '#8ab8c8'); P.px(15, 27, '#8ab8c8');
    P.rect(27, 42, 6, 2, '#e8f0f0'); P.rect(27, 44, 6, 1, '#3e5a66'); P.rect(6, 63, 30, 3, '#2a4048');
    P.rect(0, 0, 42, 6, '#18c868'); P.rect(3, 1, 36, 2, '#7affb0'); P.rect(3, 1, 36, 1, '#d8ffe8'); P.rect(0, 5, 42, 1, '#0e6a38'); P.rect(0, 0, 1, 6, '#0e6a38'); P.rect(41, 0, 1, 6, '#0e6a38'); });
  const hydrant3 = () => pix('hyd3', 27, 36, P => { P.rect(8, 5, 11, 1, '#5a0a0c'); P.rect(10, 1, 7, 4, '#ff6a50'); P.rect(9, 2, 9, 3, '#ff6a50'); P.rect(10, 2, 2, 1, '#ffd8c8'); P.rect(16, 3, 1, 2, '#c8341e');
    P.rect(0, 6, 27, 30, '#2a0608'); P.rect(1, 7, 25, 28, '#b81e28'); P.rect(1, 7, 25, 1, '#ffb0a0'); P.rect(1, 8, 25, 2, '#ff5a48'); P.rect(1, 34, 25, 1, '#7a1018'); P.rect(25, 8, 1, 26, '#8a1420');
    P.rect(6, 15, 15, 12, '#7a1018'); P.rect(7, 16, 13, 10, '#a81a24'); P.rect(7, 16, 13, 1, '#d83a3a');
    P.rect(9, 18, 9, 6, '#e8d8c8'); P.rect(9, 18, 9, 1, '#ffffff'); P.rect(9, 23, 9, 1, '#a89c94'); for(const gx of [10, 13, 16]) P.rect(gx, 20, 2, 2, '#4a0a10');   // 消火栓
    P.rect(18, 19, 1, 4, '#3a0a0a'); P.rect(4, 29, 19, 2, '#7a1018'); });
  // seen from outside, everything past the portal (rings, cars inside) shows only through the portal's mouth, even where the tube curves away
  let pvNow = -1, pvIdx = -1;
  function portalAhead(now){ if(now === pvNow) return pvIdx; pvNow = now; pvIdx = -1; const b = segAt(position); if(!b || b.tunnel) return -1;
    for(let n = 1; n < DRAW; n++){ const t = segs[b.index + n]; if(!t) break; if(t.tunnel){ pvIdx = t.index; break; } } return pvIdx; }
  function mouthPath(x, y, uw, rf){ const r = RR * uw, yc = y - CY * uw, p0 = Math.acos(clamp(-CY / (RR * rf), -1, 1)), n = 18;
    for(let j = 0; j <= n; j++){ const ph = -p0 + 2 * p0 * j / n, px0 = x + r * rf * Math.sin(ph), py0 = yc - r * rf * Math.cos(ph); j ? cx.lineTo(px0, py0) : cx.moveTo(px0, py0); } cx.closePath(); }

  // ---- under the sea, inside: wedges of the wall between two angles (one side), out to the ring's face box. Drawn right after a ring's
  // face, so the nearer rings cover all but this ring's own strip of wall (the same way the bands of the lining work)
  function wedgeQ(a0, a1, col){ const big = fr * 3, s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
    (typeof col === 'string' && !SOLQ ? poly : patQuad)(fx + fr * s0, fyc - fr * c0, fx + fr * s1, fyc - fr * c1, cxp(fx + big * s1), cyp(fyc - big * c1), cxp(fx + big * s0), cyp(fyc - big * c0), col); }
  /* A wedge filled with a pattern (the sea through the glass, perf 2026-11-20): the same spans as the core's pxPolyN (its code, copied), but
     gathered into one path and filled once. A pattern fillRect is a GPU draw of its own while solid ones batch, and the far window rings'
     short wedges came to ~15,000 pattern fillRects a frame: the cost that kept Aqua off vsync. Whole-pixel rects, so the pixels are the same.
     Tall wedges go to the core's own path fill unchanged. */
  const PQ4 = new Float64Array(8);
  function patQuad(x1, y1, x2, y2, x3, y3, x4, y4, col){ const Q = PQ4; Q[0] = x1; Q[1] = y1; Q[2] = x2; Q[3] = y2; Q[4] = x3; Q[5] = y3; Q[6] = x4; Q[7] = y4;
    let y0 = Infinity, y9 = -Infinity; for(let i = 0; i < 4; i++){ const y = Q[i * 2 + 1]; if(!(y === y)) return; if(y < y0) y0 = y; if(y > y9) y9 = y; }
    const ch = cv.height, r0 = Math.max(0, Math.ceil(y0 / PX - .5)), r1 = Math.min(ch - 1, Math.floor(y9 / PX - .5)); if(r1 < r0) return;
    if(r1 - r0 > 32){ poly(x1, y1, x2, y2, x3, y3, x4, y4, col); return; }
    cx.fillStyle = col; if(!SOLQ) cx.beginPath();
    const xmn = -PX, xmx = W + PX; let rl = 0, rr = 0, rs = 0, re = 0;
    for(let r = r0; r <= r1; r++){ const yc = (r + .5) * PX; let a = Infinity, b = -Infinity;
      for(let i = 0; i < 4; i++){ const j = (i + 1) % 4, px = Q[i * 2], py = Q[i * 2 + 1], qx = Q[j * 2], qy = Q[j * 2 + 1];
        if((py <= yc && qy > yc) || (qy <= yc && py > yc)){ const xx = px + (yc - py) * (qx - px) / (qy - py); if(xx < a) a = xx; if(xx > b) b = xx; } }
      if(!(b >= a)) continue; if(a < xmn) a = xmn; if(b > xmx) b = xmx; let xl = Math.round(a / PX), xr = Math.round(b / PX);
      if(xr <= xl){ xl = Math.floor((a + b) / 2 / PX); xr = xl + 1; }
      if(xl === rl && xr === rr && r === re){ re = r + 1; continue; }
      if(re > rs) patSpan(rl, rr, rs, re); rl = xl; rr = xr; rs = r; re = r + 1; }
    if(re > rs) patSpan(rl, rr, rs, re);
    if(!SOLQ) cx.fill(); }
  /* The water (or school) wedges between a0..a1 and a1..a2 in one path and one fill, row by row, with the same spans pxPolyN gives each (where
     the two meet edge to edge in a row, one rect). Half the pattern fills, each over a tighter box. A tall wedge goes the usual way (wedgeQ). */
  const QA = new Float64Array(8), QB = new Float64Array(8), RUN = [0, 0];
  function wedgePts(a0, a1, Q){ const big = fr * 3, s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
    Q[0] = fx + fr * s0; Q[1] = fyc - fr * c0; Q[2] = fx + fr * s1; Q[3] = fyc - fr * c1; Q[4] = cxp(fx + big * s1); Q[5] = cyp(fyc - big * c1); Q[6] = cxp(fx + big * s0); Q[7] = cyp(fyc - big * c0); }
  function rowsOf(Q){ let y0 = Infinity, y9 = -Infinity; for(let i = 0; i < 4; i++){ const y = Q[i * 2 + 1]; if(!(y === y)) return -1; if(y < y0) y0 = y; if(y > y9) y9 = y; }
    RUN[0] = Math.max(0, Math.ceil(y0 / PX - .5)); RUN[1] = Math.min(cv.height - 1, Math.floor(y9 / PX - .5)); return RUN[1] - RUN[0]; }
  // pxPolyN's span of quad Q on row r into RUN (false: none)
  function spanOf(Q, r){ const yc = (r + .5) * PX; let a = Infinity, b = -Infinity;
    for(let i = 0; i < 4; i++){ const j = (i + 1) % 4, px = Q[i * 2], py = Q[i * 2 + 1], qx = Q[j * 2], qy = Q[j * 2 + 1];
      if((py <= yc && qy > yc) || (qy <= yc && py > yc)){ const xx = px + (yc - py) * (qx - px) / (qy - py); if(xx < a) a = xx; if(xx > b) b = xx; } }
    if(!(b >= a)) return false; if(a < -PX) a = -PX; if(b > W + PX) b = W + PX; let xl = Math.round(a / PX), xr = Math.round(b / PX);
    if(xr <= xl){ xl = Math.floor((a + b) / 2 / PX); xr = xl + 1; } RUN[0] = xl; RUN[1] = xr; return true; }
  function patPair(a0, a1, a2, col){ wedgePts(a0, a1, QA); wedgePts(a1, a2, QB); const ta = rowsOf(QA), ra0 = RUN[0], ra1 = RUN[1], tb = rowsOf(QB), rb0 = RUN[0], rb1 = RUN[1];
    if(ta > 32 || tb > 32){ wedgeQ(a0, a1, col); wedgeQ(a1, a2, col); return; }
    cx.fillStyle = col; cx.beginPath(); const r0 = Math.min(ta >= 0 ? ra0 : Infinity, tb >= 0 ? rb0 : Infinity), r1 = Math.max(ta >= 0 ? ra1 : -Infinity, tb >= 0 ? rb1 : -Infinity);
    for(let r = r0; r <= r1; r++){ const ha = ta >= 0 && r >= ra0 && r <= ra1 && spanOf(QA, r), al = RUN[0], ar = RUN[1], hb = tb >= 0 && r >= rb0 && r <= rb1 && spanOf(QB, r), bl = RUN[0], br = RUN[1];
      if(ha && hb && ar === bl) patSpan(al, br, r, r + 1); else if(ha && hb && br === al) patSpan(bl, ar, r, r + 1);
      else { if(ha) patSpan(al, ar, r, r + 1); if(hb) patSpan(bl, br, r, r + 1); } } cx.fill(); }
  /* ...and only the parts of each span that can still show. Rings are drawn back to front, and the next nearer ring that draws a face covers its
     face box (above its road line and clip row) outside its own opening with opaque bands; a far ring's wedge reaches out to its own box, so most
     of it is painted only to be covered. OCS (set per window ring by seaWindow) are the next nearer faces; against each, a span keeps the part
     inside its opening (plus a margin for its antialiased, nearest-scaled edge) and any part outside its box; spans are whole canvas pixels, so
     the pixels are the same. */
  let OCN = 0; const OCS = [0, 1, 2].map(() => ({ x:0, y:0, r2:0, l:0, r:0, t:0, b:0 })), PIV = [0, 1, 2].map(() => new Float64Array(6));
  // the glass's steel frame (solid colours) the same way: its short wedges' spans less what the nearer faces cover, as plain fillRects
  let SOLQ = false;
  const frameQ = (a0, a1, col) => { SOLQ = true; try{ wedgeQ(a0, a1, col); }finally{ SOLQ = false; } };
  // (the canvas's last column lies partly past W, where every segment's clip ends: nothing covers it fully, so it is never culled)
  function patSpan(rl, rr, rs, re){ const x0 = rl * PX, x1 = rr * PX, y0 = rs * PX, y1 = re * PX, xw = Math.floor(W / PX) * PX;
    if(x1 <= xw) patPiece(x0, x1, y0, y1, 0); else { patPiece(Math.max(x0, xw), x1, y0, y1, OCN); if(x0 < xw) patPiece(x0, xw, y0, y1, 0); } }
  // a rect of pixels less what nearer face lv (and the ones after it) will cover
  function patPiece(x0, x1, y0, y1, lv){ if(lv >= OCN){ if(SOLQ) cx.fillRect(x0, y0, x1 - x0, y1 - y0); else cx.rect(x0, y0, x1 - x0, y1 - y0); return; } const o = OCS[lv];
    if(y0 < o.t || y1 > o.b){ patPiece(x0, x1, y0, y1, lv + 1); return; }   // (not every row is under that face: try the next one)
    // what can show: left of its box [x0, l), inside its opening [a, b), right of its box [r, x1); passed on as disjoint runs (a pixel drawn
    // twice would blend twice where a clip's edge leaves it partly covered)
    const dy = o.y < y0 ? y0 - o.y : o.y > y1 ? o.y - y1 : 0, l = Math.min(x1, Math.ceil(o.l / PX) * PX), r = Math.max(x0, Math.floor(o.r / PX) * PX);
    let a = Infinity, b = -Infinity; if(dy * dy < o.r2){ const h = Math.sqrt(o.r2 - dy * dy); a = Math.max(x0, Math.floor((o.x - h) / PX) * PX); b = Math.min(x1, Math.ceil((o.x + h) / PX) * PX); }
    const IV = PIV[lv]; let n = 0; if(l > x0){ IV[0] = x0; IV[1] = l; n = 1; } if(b > a){ IV[n * 2] = a; IV[n * 2 + 1] = b; n++; } if(x1 > r){ IV[n * 2] = r; IV[n * 2 + 1] = x1; n++; }
    for(let i = 1; i < n; i++) for(let j = i; j > 0 && IV[j * 2] < IV[j * 2 - 2]; j--){ const t0 = IV[j * 2], t1 = IV[j * 2 + 1]; IV[j * 2] = IV[j * 2 - 2]; IV[j * 2 + 1] = IV[j * 2 - 1]; IV[j * 2 - 2] = t0; IV[j * 2 - 1] = t1; }
    let s = 0, e = -Infinity;   // the open run [s, e), sorted by start and merged
    for(let i = 0; i < n; i++){ const p = IV[i * 2], q2 = IV[i * 2 + 1]; if(p <= e){ if(q2 > e) e = q2; } else { if(e > s) patPiece(s, e, y0, y1, lv + 1); s = p; e = q2; } }
    if(e > s) patPiece(s, e, y0, y1, lv + 1); }
  // the next three nearer rings that will draw a face over ring i, into OCS (OCN of them; 0 when that isn't certain)
  function occluders(i){ const b0 = segAt(position).index; OCN = 0;
    for(let j = i - 1; j > b0 && j >= i - 24 && OCN < 3; j--){ const t = segs[j]; if(!t || !t.tunnel || LANDS[t.land].key !== 'aqua' || !t.p1.screen.scale || t.p1.camera.z <= DEPTH) return;
      const kj = kOf(j), uj = t.p1.screen.scale * ROADW * W / 2, pT = segs[j - 1] && segs[j - 1].tunnel, nT = segs[j + 1] ? segs[j + 1].tunnel : true;
      if(kj === 0 || !pT) return; const st = uj < W * .02 ? 4 : uj < W * .05 ? 2 : 1;
      if(kj === kLen(j) - 1 || !nT || j % st === 0){ const o = OCS[OCN++], xj = t.p1.screen.x, yj = t.p1.screen.y, rp = RR * uj + PX * 3, mb = PX * 2;
        o.x = xj; o.y = yj - CY * uj; o.r2 = rp * rp; o.l = xj - EXW * uj + mb; o.r = xj + EXW * uj - mb; o.t = yj - EXH * uj + mb; o.b = Math.min(yj, t.clip) - mb; }
      else if(j < i - 8 && !OCN) return; } }
  // the glass runs from the LED housing band down to the aqua stripe; three facets per side
  const WA = [1.26, 1.5, 1.74];
  let UWC = null, UWFC = null, UWP = null, UWFP = null, UWM = null;
  /* Window hooks for set pieces (setpiece/megalodon.js). A segment with s.aqWin set (1, or 2 at an end of the run) gets the glass
     wherever it is under the sea, not only in WIN0..WIN1. WINX.layer(i, sd, fog, now), when set, paints behind the frame of each
     window ring (after the water); WINX.fish = false leaves the far school out. wedge(a0, a1, col) fills the current ring's wedge;
     wedgeAt(x, y, uw, a0, a1, col) a wedge of a ring at any projected point (the ring geometry is restored after). */
  function wedgeAt(x, y, uw, a0, a1, col){ const s0 = fx, s1 = fyc, s2 = fr, s3 = fbx, s4 = fby, s5 = fyRoad; fx = x; fyc = y - CY * uw; fr = RR * uw; fbx = EXW * uw; fby = y - EXH * uw; fyRoad = y;
    wedgeQ(a0, a1, col); fx = s0; fyc = s1; fr = s2; fbx = s3; fby = s4; fyRoad = s5; }
  /* Long bores (setpiece/megalodon.js): a bore registered as a range [a, b) of any length, starting anywhere. Inside it every segment is
     tube; its approach (140 segments before a, the bridge and the dive cutting) and its exit (100 after b) stay open; a regular bore that
     would only partly fit there is left out whole (no stubs). The core asks tunOver(i): true / false / undefined (no say). kOf(i): a ring's
     index from its own portal; kLen(i): its bore's length. Registered when the road begins, before any of its segments exist; boreSet()
     re-derives whatever was already worked out over the stretch (the dip, trench walls), so no ordering can leave a stale half-bore. */
  const LR = [], RA = 70, RB = 100;
  const lrIn = i => { for(const r of LR) if(i >= r.a && i < r.b) return r; return null; };
  function tunOver(i){ for(const r of LR){ if(i >= r.a && i < r.b) return true; const k = i % 320, c = i - k;
      if(k < 200 && ((c < r.a && c + 200 > r.a - RA) || (c < r.b + RB && c + 200 > r.b))) return false;
      if(i >= r.a - RA && i < r.b + RB) return false; }
    return undefined; }
  const kOf = i => { const r = lrIn(i); return r ? i - r.a : i % 320; }, kLen = i => { const r = lrIn(i); return r ? r.b - r.a : 200; };
  const WINX = { layer:null, fish:true, WA, RR, CY, wedge:(a0, a1, col) => wedgeQ(a0, a1, col), wedgeAt,
    /* the same wedge added to the current path (whole canvas pixels), so a set piece can fill many panes' facets in one fill call */
    wedgePath:(a0, a1) => { const big = fr * 3, s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1); cx.moveTo(q(fx + fr * s0), q(fyc - fr * c0)); cx.lineTo(q(fx + fr * s1), q(fyc - fr * c1)); cx.lineTo(q(cxp(fx + big * s1)), q(cyp(fyc - big * c1))); cx.lineTo(q(cxp(fx + big * s0)), q(cyp(fyc - big * c0))); cx.closePath(); }, fishC:() => UWFC, bores:LR, boreSet };
  function boreSet(a, b, on){ const n = LR.findIndex(r => r.a === a); if(n >= 0) LR.splice(n, 1); if(on) LR.push({ a, b });
    OCC.clear(); if(typeof segs === 'undefined' || !segs) return;
    for(let j = Math.max(0, a - RA - 220); j < b + RB + 220 && j < segs.length; j++){ const s = segs[j]; if(!s) continue;
      if(s.aqD){ s.p1.world.y = s.aqS1; s.p2.world.y = s.aqS2; s.aqD = 0; }
      if(s.aqTr && s.tunnel){ s.aqTr = 0; s.sprites = s.sprites.filter(sp => sp.type !== 'trench'); } }
    if(scanJ > a - RA - 220) scanJ = Math.max(0, a - RA - 220); }
  function seaWindow(i, k, uw, fog, now){ const u = (position + PZ) / SEG; occluders(i);
    try{ for(const sd of [-1, 1]){
      if(fog < .5 && UWP){ UWM.a = UWM.d = PX; UWM.b = UWM.c = 0; UWM.f = HZ - 200 * PX;
        // the far water drifts slowly outward as you pass (a distant view); the school swims against it
        UWM.e = q((sd * u * .6 * PX) % (256 * PX)); UWP.setTransform(UWM); patPair(sd * WA[0], sd * WA[1], sd * WA[2], UWP);
        if(WINX.fish){ UWM.e = q((sd * u * 1.1 * PX - (reduce ? 0 : now * .012 * PX)) % (256 * PX)); UWFP.setTransform(UWM); patPair(sd * WA[0], sd * WA[1], sd * WA[2], UWFP); } }
      else { const c = tc('#0e4250', fog, 0); wedgeQ(sd * WA[0], sd * WA[1], c); wedgeQ(sd * WA[1], sd * WA[2], tc('#082a36', fog, 0)); }
      if(WINX.layer) WINX.layer(i, sd, fog, now);
      // the frame: a steel head and sill along the glass, a cyan light on the sill
      frameQ(sd * (WA[0] - .03), sd * (WA[0] + .02), tc('#0a1018', fog, 0)); frameQ(sd * (WA[2] - .02), sd * (WA[2] + .04), tc('#0a1018', fog, 0));
      if(fog < .7) frameQ(sd * (WA[2] - .04), sd * (WA[2] - .02), fog > .45 ? tc('#3a9ac8', fog, 0) : '#56c4f0'); } } finally { OCN = 0; }
    // a mullion every sixth ring (and at both ends): a steel bar round the glass with a lit edge
    const sw = segs[i] && segs[i].aqWin, wend = sw ? sw === 2 : k === WIN0 || k === WIN1 - 1;
    if(uw > W * .015 && (i % 6 === 0 || wend)){ const lw = Math.max(PX, q(uw * (wend ? .08 : .028)));
      for(const sd of [-1, 1]){ cx.fillStyle = tc('#0a1018', fog, 0); const n = Math.max(3, Math.ceil(fr * .5 / lw));
        for(let j = 0; j <= n; j++){ const a = sd * (WA[0] + (WA[2] - WA[0]) * j / n); pxRect(q(fx + fr * Math.sin(a) - lw / 2), q(fyc - fr * Math.cos(a) - lw / 2), lw, lw); }
        if(uw > W * .05){ cx.fillStyle = tc('#4a6a7a', fog, 0); for(let j = 0; j <= n; j++){ const a = sd * (WA[0] + (WA[2] - WA[0]) * j / n); pxRect(q(fx + fr * Math.sin(a) - lw / 2 - sd * PX), q(fyc - fr * Math.cos(a) - lw / 2), PX, lw); } } } } }
  // a wet track down the lining (from the LED housing toward the wainscot), calcite white at its foot; sparse and fixed to the ring
  function seep(i, uw, fog){ if(uw < W * .035 || H0(i * .37) > .16) return; const sd = H0(i * 1.3) < .5 ? -1 : 1, a0 = 1.12 + H0(i * 2.1) * .14, a1 = 1.62 + H0(i * 3.3) * .22;
    const lw = Math.max(PX, q(uw * .03)), n = Math.max(4, Math.ceil(fr * (a1 - a0) / lw)), wet = tc('#0a1a24', fog, 0), lt = tc('#3a6474', fog, 0);
    for(let j = 0; j <= n; j++){ const t = j / n, a = sd * (a0 + (a1 - a0) * t), px0 = q(fx + fr * .995 * Math.sin(a)), py0 = q(fyc - fr * .995 * Math.cos(a)), w = t < .3 ? lw * 2 : lw;
      cx.fillStyle = wet; pxRect(px0 - (sd > 0 ? w - PX : 0), py0, w, lw); if(j % 3 === 1 && uw > W * .06){ cx.fillStyle = lt; pxRect(px0 + (sd > 0 ? PX : -PX), py0, PX, lw); } }
    const af = sd * a1, bx = q(fx + fr * Math.sin(af)), by = q(fyc - fr * Math.cos(af)); cx.fillStyle = tc('#8aa8ac', fog, 0); pxRect(bx - lw, by, lw * 2, lw); }
  // Kaze-no-To in the open sea: a low round platform with a foam ring, the striped towers, a broken reflection
  const KZ_K = 70, KZ_X = -12;
  function drawKaze(s, x, y, uw, fog, now){ const sea = y - (s.aqD1 || 0) * uw * H / (ROADW * W), tx = x + KZ_X * uw; if(tx < -W * .5 || tx > W * 1.5) return;
    const wt = fogged(windSprite(), 'wind', fog * .9), kk = uw * 5.2 / WTH, a = 1 - fog * .6, rw = WTW * kk * .62, rh = Math.max(PX, rw * .16);
    // reflection, then the platform disc, then the towers on it
    const rf = windRefl(); cx.globalAlpha = 1 - fog * .5; blit(rf, tx, sea + rf.height * kk, kk); cx.globalAlpha = 1;
    cx.fillStyle = fc('#c8d0dc', fog * .8); for(let r = -rh; r < rh; r += PX){ const hw = rw * Math.sqrt(Math.max(0, 1 - (r + PX / 2) * (r + PX / 2) / (rh * rh))); pxRect(q(tx - hw), q(sea - rh * .4 + r), q(hw * 2), PX); }
    cx.fillStyle = fc('#5a6478', fog * .8); pxRect(q(tx - rw), q(sea - rh * .4), q(rw * 2), Math.max(PX, q(rh * .5)));
    cx.fillStyle = fc('#9ac8d8', fog * .7); pxRect(q(tx - rw * 1.08), q(sea), q(rw * 2.16), PX);
    blit(wt, tx, sea - rh * .3, kk); windLights(tx, sea - rh * .3, kk, a, now); }
  function windRefl(){ if(SPR.aq_windR) return SPR.aq_windR; const s = windSprite(), w = s.width, h = s.height, RH2 = 40, c = mk(w + 6, RH2), k = c.getContext('2d'), d = s.getContext('2d').getImageData(0, 0, w, h).data;
    for(let r = 0; r < RH2; r++){ const sy = h - 10 - Math.floor(r * 1.6); if(sy < 0) break; if(r > 3 && r % 2) continue; const off = 3 + Math.round(Math.sin(r * 1.7) * 2);
      for(let x = 0; x < w; x++){ const o = (sy * w + x) * 4; if(!d[o + 3]) continue; const lum = d[o] + d[o + 1] + d[o + 2];
        if(lum > 500){ k.fillStyle = `rgba(${d[o]},${d[o + 1]},${d[o + 2]},${Math.max(.1, .45 - r * .012)})`; k.fillRect(x + off, r, 1, 1); } else if((x + r) % 2 === 0){ k.fillStyle = 'rgba(2,6,14,.45)'; k.fillRect(x + off, r, 1, 1); } } }
    return SPR.aq_windR = c; }
  // the murky sea behind the windows: lit from far above (stepped bands, slanting shafts, marine snow), kelp and rocks below, and a
  // separate layer of fish that swims. Both 256 x 400 art pixels; row 200 sits on the horizon. Built in warm().
  function buildUnder(){ if(UWC) return; const w = 256, h = 400, rnd = RND(4242); UWC = mk(w, h); const k = UWC.getContext('2d');
    // depth bands: bright under the far surface, sinking to near-black at the seabed, which sits just below the horizon (the glass's sill
    // is at eye level, so the seabed and the kelp show along its lower edge)
    const ST = ['#5ab8b4', '#3e98a0', '#2c7886', '#216474', '#185262', '#114252', '#0c3442', '#082834', '#061e28', '#04141c'];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const v = clamp((y - 20) / 190, 0, 1) * (ST.length - 1), th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16; let c = Math.min(ST.length - 1, Math.floor(v + th * .999));
      // light shafts from the surface: slanting bands, two steps brighter near the top, thinning out with depth
      const sh = ((x + y * .35) % 80 + 80) % 80, bandW = sh < 12 ? 1 : (sh > 40 && sh < 46) ? .6 : 0;
      if(bandW && th < bandW * (1 - y / 190) * 1.2) c = Math.max(0, c - (y < 90 ? 2 : 1));
      k.fillStyle = ST[c]; k.fillRect(x, y, 1, 1); }
    // marine snow
    for(let n = 0; n < 160; n++){ k.fillStyle = rnd() < .6 ? '#6abcc0' : '#3a8a94'; k.fillRect(Math.floor(rnd() * w), 30 + Math.floor(rnd() * 170), 1, 1); }
    // kelp stands rising from the seabed, swaying (fixed in the art), then the rocks
    for(let n = 0; n < 16; n++){ const bx = Math.floor(rnd() * w), ht = 30 + Math.floor(rnd() * 70), ph = rnd() * 6, tone = rnd() < .5;
      for(let y = 0; y < ht; y++){ const yy = 212 - y, xx = (bx + Math.round(Math.sin(y * .08 + ph) * 3) + w) % w; k.fillStyle = tone ? '#0a2c22' : '#06221a'; k.fillRect(xx, yy, 2, 1);
        if(y % 8 === 3){ k.fillStyle = tone ? '#12402e' : '#0c3424'; k.fillRect((xx + (y % 16 < 8 ? 2 : -3) + w) % w, yy, 3, 2); } } }
    for(let x = 0; x < w; x++){ const top = 206 + Math.round(5 * Math.sin(x * .07) + 3 * Math.sin(x * .23 + 1) + (H0(x * .3) > .85 ? -3 : 0)); k.fillStyle = '#031014'; k.fillRect(x, top, 1, h - top); if(x % 3 === 0){ k.fillStyle = '#0a2228'; k.fillRect(x, top, 1, 1); } }
    UWFC = mk(w, h); const f = UWFC.getContext('2d');
    // a school: small dark fish (a body, a tail notch) in a loose shoal; one big bream lower down
    const fish = (x, y, s) => { f.fillStyle = '#03141a'; f.fillRect(x, y, 3 * s, s); f.fillRect(x + s, y - (s > 1 ? 1 : 0), s, s + (s > 1 ? 2 : 0)); f.fillRect(x + 3 * s, y - (s > 1 ? 1 : 0), s, s); f.fillRect(x + 3 * s, y + (s > 1 ? 1 : 0), s, s); };
    for(let n = 0; n < 34; n++){ const t = rnd() * 6.28, r = rnd(); fish(Math.floor(70 + Math.cos(t) * 46 * r), Math.floor(150 + Math.sin(t) * 18 * r), rnd() < .3 ? 2 : 1); }
    for(let n = 0; n < 18; n++){ const t = rnd() * 6.28, r = rnd(); fish(Math.floor(190 + Math.cos(t) * 30 * r), Math.floor(110 + Math.sin(t) * 12 * r), 1); }
    f.fillStyle = '#03141a'; for(let yy = -5; yy <= 5; yy++){ const hw = Math.round(12 * Math.sqrt(1 - yy * yy / 30.25)); f.fillRect(150 - hw, 185 + yy, hw * 2, 1); } f.fillRect(161, 179, 3, 13); f.fillRect(146, 178, 6, 3);
    UWP = cx.createPattern(UWC, 'repeat'); UWFP = cx.createPattern(UWFC, 'repeat'); UWM = new DOMMatrix(); }

  // ---- one ring of tube per segment, back to front
  function drawTunnel(s, x, y, uw, fog, now, fogc){
    // seen from outside, the tube shows only through the portal's mouth: ring images are cropped to the mouth's box (the headwall, drawn
    // later, covers the box's corners); the few path-drawn rings right behind the portal get a real clip
    const pa = portalAhead(now); let crop = null; if(pa >= 0 && s.index > pa){ const p = segs[pa].p1.screen; if(p.w) crop = [p.x - RR * p.w, p.y - (CY + RR) * p.w, p.x + RR * p.w, p.y, p]; }
    const i = s.index, k = kOf(i), kL = kLen(i), prevT = segs[i - 1] && segs[i - 1].tunnel, nextT = segs[i + 1] ? segs[i + 1].tunnel : true;
    const portal = k === 0 || !prevT, exit = k === kL - 1 || !nextT;
    const stride = uw < W * .02 ? 4 : uw < W * .05 ? 2 : 1, face = portal || exit || i % stride === 0;
    const edge = Math.min(k, kL - 1 - k), cs = edge < 6 ? 6 - edge : 0, blk = (i >> 3) & 1, far = uw < W * .06;
    fx = x; fyc = y - CY * uw; fr = RR * uw; fyRoad = y; fbx = EXW * uw; fby = y - EXH * uw;
    const C = c => tc(c, fog, cs);
    // Kaze-no-To stands in the open sea over the bore: drawn from its own segment while you are still outside (the headwall, nearer,
    // covers it when it passes behind)
    if(k === KZ_K && pa >= 0 && s.index > pa) drawKaze(s, x, y, uw, fog, now);
    if(face && !portal){ const uL = uw / PX, joint = i % 4 === 0 && uw > W * .05 ? 1 : 0;
      if(!cs && !exit && uL <= LV[LV.length - 1]){ let L = LV[0]; for(const l of LV) if(l >= uL){ L = l; break; }
        const img = ringImg(L, blk, joint, Math.min(6, Math.floor(fog * 7))), f = uw / L, dx = x - img.width / 2 * f, dy = y - EXH * L * f, dw = img.width * f, dh = img.height * f; cx.imageSmoothingEnabled = false;
        if(!crop) cx.drawImage(img, dx, dy, dw, dh);
        else { const x0 = Math.max(dx, crop[0]), y0 = Math.max(dy, crop[1]), x1 = Math.min(dx + dw, crop[2]), y1 = Math.min(dy + dh, crop[3]);
          if(x1 > x0 && y1 > y0) cx.drawImage(img, (x0 - dx) / f, (y0 - dy) / f, (x1 - x0) / f, (y1 - y0) / f, x0, y0, x1 - x0, y1 - y0); } }
      else { if(crop){ const p = crop[4]; cx.beginPath(); mouthPath(p.x, p.y, p.w, 1); cx.clip(); } ringFace(C, blk, far, fog, joint, Math.max(1, PX * .75)); }
      // under the sea: the observation windows in the deepest stretch, else wet seepage tracks on the lining
      if(!crop && !exit && uw >= 3){ const under = (s.aqD1 || 0) > DP * .5;
        if(under && (s.aqWin || (k >= WIN0 && k < WIN1))) seaWindow(i, k, uw, fog, now); else if(under || pa < 0) seep(i, uw, fog); }
    }
    if(portal) return drawPortal(s, x, y, uw, fog, now);
    if(uw < 3) return;
    // drips from the crown seams, near the camera only (a slow fall, three pixels long so it never blinks)
    if(!crop && !reduce && uw > W * .08 && H0(i * 5.13) < .09){ const sd = H0(i * 2.7) < .5 ? -1 : 1, a = sd * (.55 + H0(i * 1.9) * .25), x0 = q(fx + fr * Math.sin(a)), y0 = fyc - fr * Math.cos(a), ph = (now / 1400 + H0(i * 3.1)) % 1, yy = q(y0 + (y - y0) * ph), dl = Math.max(PX * 3, q((y - y0) / 28));   // (a streak at least twice a frame's fall: no pixel lit for one frame only)
      cx.fillStyle = '#9fe2f4'; pxRect(x0, yy, PX, dl); if(ph > .9){ cx.fillStyle = '#5a8a9a'; pxRect(x0 - PX * 2, q(y - PX * 2), PX * 5, PX); } }
    // guide lights low on both walls: a dotted line of cold points converging on the far end
    if(i % 4 === 2){ const d = Math.max(PX, q(uw * .035)); cx.fillStyle = fog > .6 ? C(T.ledLo) : T.guide;
      for(const sd of [-1, 1]){ const a = sd * 1.92, px0 = x + fr * Math.sin(a), py0 = fyc - fr * Math.cos(a); pxRect(q(px0 - d / 2), q(py0 - d / 2), d, d); } }
    const al = 1 - fog * .7;
    // collar: a steel pressure ring every 40 rings, chevron lip, a lit depth board at the crown
    if(k % 40 === 20){ const lw = Math.max(PX, uw * .16); arcStroke(PHI0 - .02, .955, C(T.steel[1]), lw); arcStroke(PHI0 - .02, .955 - .045, C(T.steel[3]), Math.max(1, uw * .02));
      if(uw > W * .03){ cx.setLineDash([uw * .12, uw * .12]); arcStroke(1.7, .905, C('#e8b02a'), Math.max(1, uw * .035)); cx.setLineDash([]); }
      const bw = uw * 1.0, bh = uw * .22, by = fyc - fr * .88 + uw * .05; cx.fillStyle = C('#05121a'); pxRect(q(x - bw / 2 - PX), q(by - PX), q(bw) + PX * 2, q(bh) + PX * 2);
      cx.fillStyle = C('#0c2c3c'); pxRect(q(x - bw / 2), q(by), q(bw), q(bh));
      if(!liveText(DEPTH[k] || DEPTH[100], x, by + bh / 2, bw * .86, bh * .8, C('#8ff0ff'))){ cx.fillStyle = C('#4ab8d0'); pxRect(q(x - bw * .38), q(by + bh * .35), q(bw * .76), Math.max(PX, q(bh * .3))); }
      if(uw > W * .05) gl(x, by + bh / 2, Math.min(bw * .7, H * .1), '#4ad8ff', .16 * al);
      for(const sd of [-1, 1]){ const a = sd * 1.3, px0 = x + fr * .9 * Math.sin(a), py0 = fyc - fr * .9 * Math.cos(a), d = Math.max(PX, q(uw * .05)); cx.fillStyle = '#ffb030'; pxRect(q(px0 - d / 2), q(py0 - d / 2), d, d); if(uw > W * .05) gl(px0, py0, uw * .2, '#ff9a30', .3 * al); } }
    // evacuation door on the left wall, every 50 rings: a recessed steel door, a lit green frame, the running-man sign above
    if(k % 50 === 25 && uw > 4 && !s.aqQuiet){ const sk = Math.max(1, uw * .4 / 22), [sx, sy] = wallPt(x, y, uw, -PHI0 + .04); if(sk > PX * 2) blit(doorSpr3(), sx + 8 * sk, sy, sk / 3); else blit(doorSpr(), sx + 8 * sk, sy, sk);
      const ek = Math.max(1, uw * .26 / 15); if(ek > PX * 2) blit(exitSign3(), sx + 8 * sk, sy - 24 * sk, ek / 3); else blit(exitSign(), sx + 8 * sk, sy - 24 * sk, ek); if(uw > W * .04){ gl(sx + 8 * sk, sy - 22 * sk, uw * .4, '#2aff6a', .22 * al); gl(sx + 8 * sk, sy - 4 * sk, uw * .3, '#2aff6a', .1 * al); } }
    // hydrant cabinet on the right wall, every 50 rings (offset), a steady red lamp
    if(k % 50 === 0 && k > 0 && uw > 4 && !s.aqQuiet){ const sk = Math.max(1, uw * .2 / 9), [sx, sy] = wallPt(x, y, uw, PHI0 - .05); if(sk > PX * 2) blit(hydrant3(), sx - 5 * sk, sy, sk / 3); else blit(hydrant(), sx - 5 * sk, sy, sk); if(uw > W * .04) gl(sx - 5 * sk, sy - 11 * sk, uw * .2, '#ff3a2a', .3 * al); }
    // distance board on the right wall, white with black type
    if(KMB[k] && uw > 5 && !s.aqQuiet){   /* (s.aqQuiet: a set piece keeps this stretch's walls clear, setpiece/megalodon.js) */ const [sx, sy] = wallPt(x, y, uw, 1.62), bw = uw * .7, bh = uw * .17, bx = sx - bw - uw * .04; cx.fillStyle = C('#0a1218'); pxRect(q(bx - PX), q(sy - bh - PX), q(bw) + PX * 2, q(bh) + PX * 2); cx.fillStyle = C('#e8eef0'); pxRect(q(bx), q(sy - bh), q(bw), q(bh));
      if(!liveText(KMB[k], bx + bw / 2, sy - bh / 2, bw * .9, bh * .8, C('#0a1a24'))){ cx.fillStyle = C('#0a1a24'); pxRect(q(bx + bw * .08), q(sy - bh * .62), q(bw * .5), Math.max(PX, q(bh * .3))); pxRect(q(bx + bw * .64), q(sy - bh * .62), q(bw * .26), Math.max(PX, q(bh * .3))); } }
    // the exit mouth: the last ring catches the night outside, a cold rim
    if(exit){ arcStroke(PHI0, 1, '#9ab8e0', Math.max(PX, uw * .03)); }
  }

  // the portal: a concrete headwall on a seawall island, an aqua LED band round the mouth, a lit name plate, the wind towers rising behind
  function drawPortal(s, x, y, uw, fog, now){
    const M = c => fc(c, fog * .8), r = RR * uw, yc = y - CY * uw, a = 1 - fog * .6;
    // (Kaze-no-To now stands out in the sea over the bore: see drawKaze)
    // headwall with the opening cut out (even-odd), stepped concrete
    const top = y - ((s.aqD1 || 0) > 1000 ? 2.72 : EXH) * uw, ex = 2.5 * uw;   // a hood just wider than the cutting: the sea runs on either side of it
    const opening = rf => { const p0 = Math.acos(clamp(-CY / (RR * rf), -1, 1)), n = 18; for(let j = 0; j <= n; j++){ const ph = -p0 + 2 * p0 * j / n, px0 = x + r * rf * Math.sin(ph), py0 = yc - r * rf * Math.cos(ph); j ? cx.lineTo(px0, py0) : cx.moveTo(px0, py0); } cx.closePath(); };
    cx.fillStyle = M('#2a3244'); cx.beginPath(); cx.rect(x - ex, top, ex * 2, y - top); opening(1.0); cx.fill('evenodd');
    // under the bay the hood is a sea wall: a dark tidal band of weed just above the waterline (the cutting's coping), dithered at its top
    if((s.aqD1 || 0) > 1000){ const wl = y - (s.aqD1 + FB) * uw * H / (ROADW * W), bh = uw * .3; cx.save(); cx.beginPath(); cx.rect(x - ex, top, ex * 2, y - top); opening(1.0); cx.clip('evenodd');
      cx.fillStyle = M('#1a2626'); pxRect(q(x - ex), q(wl - bh), q(ex * 2), q(bh) + PX * 4); cx.fillStyle = M('#24302e'); for(let xx = Math.max(0, q(x - ex)); xx < Math.min(W, x + ex); xx += PX * 2) pxRect(xx, q(wl - bh) - PX * (((xx / PX / 2) | 0) % 3 ? 1 : 2), PX, PX * 2); cx.restore(); }
    // a raised surround band, then the aqua LED ring
    cx.fillStyle = M('#4a566c'); cx.beginPath(); opening(1.2); opening(1.0); cx.fill('evenodd');
    cx.fillStyle = fog > .6 ? M('#3aa8e0') : '#6ad8ff'; cx.beginPath(); opening(1.08); opening(1.04); cx.fill('evenodd');
    if(fog < .8) gl(x, yc - r * 1.06, Math.min(r * 1.2, H * .18), '#3ac8ff', .16 * a);
    // coping, shadow band, panel joints
    cx.fillStyle = M('#8a96b0'); pxRect(q(x - ex), q(top), q(ex * 2), Math.max(PX, q(uw * .06)));
    cx.fillStyle = M('#161c28'); pxRect(q(x - ex), q(top + uw * .06), q(ex * 2), Math.max(PX, q(uw * .08)));
    cx.fillStyle = M('#1c2434'); for(let n = 2; n < 3; n++){ pxRect(q(x - n * uw), q(top + uw * .14), PX, q(y - top - uw * .14)); pxRect(q(x + n * uw), q(top + uw * .14), PX, q(y - top - uw * .14)); }
    // name plate
    const pw = 2.6 * uw, ph = .4 * uw, px0 = x - pw / 2, py0 = yc - r * 1.2 - uw * .12 - ph;
    cx.fillStyle = M('#060a12'); pxRect(q(px0 - PX * 2), q(py0 - PX * 2), q(pw) + PX * 4, q(ph) + PX * 4); cx.fillStyle = M('#0e2234'); pxRect(q(px0), q(py0), q(pw), q(ph));
    if(!liveText(TUN_NAME, x, py0 + ph / 2, pw * .9, ph * .8, M('#c8f4ff'))){ cx.fillStyle = M('#7ac8e0'); pxRect(q(px0 + pw * .08), q(py0 + ph * .38), q(pw * .84), Math.max(PX, q(ph * .25))); }
    if(fog < .8) gl(x, py0 + ph / 2, Math.min(pw * .5, H * .2), '#5ad0ff', .14 * a);
    // a row of cool floodlights along the coping
    for(let n = -2; n <= 2; n++){ const lx = x + n * uw * 1.05; cx.fillStyle = '#e8f8ff'; pxRect(q(lx - uw * .05), q(top - uw * .05), Math.max(PX, q(uw * .1)), Math.max(PX, q(uw * .05))); if(uw > W * .03 && n % 2 === 0) gl(lx, top, Math.min(uw * .4, H * .08), '#9ad8ff', .18 * a); }
  }

  // ---- road surface inside: cold concrete, two sheen lines under the LED strips, solid lines (no lane changes), a raised walkway
  function tunnelRoad(s, a, b, fog, now){
    const i = s.index, yb = b.y - 1, k = kOf(i), edge = Math.min(k, kLen(i) - 1 - k), cs = edge < 6 ? (6 - edge) >> 1 : 0, C = c => tc(c, fog, cs);
    // far away (a segment under half a pixel deep) the edge lines still run to the far end as steady one-pixel lines (poly: each row
    // belongs to one segment), mixed toward the road by how much of the pixel they cover; they used to stop ~35 segments out
    if(a.y - b.y < PX * .5){ const rd = C(T.road[0]); poly(a.x - a.w * OW, a.y, a.x + a.w * OW, a.y, b.x + b.w * OW, yb, b.x - b.w * OW, yb, rd);
      const cv = Math.max(.35, Math.min(1, (a.w + b.w) / 46 / PX)), l1 = a.w / 46, l2 = b.w / 46, ed = mixc(rd, C(T.edge), cv);
      for(const lx of [-.95, .95]) poly(a.x + a.w * lx - l1, a.y, a.x + a.w * lx + l1, a.y, b.x + b.w * lx + l2, yb, b.x + b.w * lx - l2, yb, ed); return; }
    if(portalAhead(now) >= 0){ const water = fc(s.stripe ? '#081a28' : '#0a1d2c', fog * .9); poly(-PX * 4, a.y + 1, a.x - a.w * OW, a.y + 1, b.x - b.w * OW, yb, -PX * 4, yb, water); poly(a.x + a.w * OW, a.y + 1, W + PX * 4, a.y + 1, W + PX * 4, yb, b.x + b.w * OW, yb, water); }
    poly(a.x - a.w, a.y, a.x + a.w, a.y, b.x + b.w, yb, b.x - b.w, yb, C(T.road[s.stripe]));
    poly(a.x - a.w * OW, a.y, a.x - a.w, a.y, b.x - b.w, yb, b.x - b.w * OW, yb, C(T.kerb)); poly(a.x + a.w, a.y, a.x + a.w * OW, a.y, b.x + b.w * OW, yb, b.x + b.w, yb, C(T.kerb));
    const e1 = a.w * .03, e2 = b.w * .03; cx.fillStyle = C(T.kerbHi); quad(a.x - a.w - e1, a.y, a.x - a.w + e1, a.y, b.x - b.w + e2, yb, b.x - b.w - e2, yb); quad(a.x + a.w - e1, a.y, a.x + a.w + e1, a.y, b.x + b.w + e2, yb, b.x + b.w - e2, yb);
    // the LED strips mirrored softly in the polished concrete: two continuous pale bands
    cx.fillStyle = C(T.sheenRd); for(const sd of [-1, 1]) quad(a.x + sd * a.w * .66, a.y, a.x + sd * a.w * .9, a.y, b.x + sd * b.w * .9, yb, b.x + sd * b.w * .66, yb);
    const l1 = Math.max(.6, a.w / 46), l2 = Math.max(.6, b.w / 46);
    // (the lane dashes are the engine's own, drawn after this on every road: laneMark)
    cx.fillStyle = C(T.edge); for(const lx of [-.95, .95]) quad(a.x + a.w * lx - l1, a.y, a.x + a.w * lx + l1, a.y, b.x + b.w * lx + l2, yb, b.x + b.w * lx - l2, yb);
  }
  function quad(x1, y1, x2, y2, x3, y3, x4, y4){ cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.lineTo(x3, y3); cx.lineTo(x4, y4); cx.closePath(); cx.fill(); }

  // ================================================================ sprites outside
  const STEEL = { O:'#0e1220', D:'#3a4256', M:'#7a8498', L:'#b8c2d2', H:'#e4eaf2' };
  const SOD = '#ffa848', SOD_HI = '#fff0c8';
  // bridge lamp (left side; the arm reaches right over the road): a slim white pole, a single sweeping arm, a flat head with an orange lens
  const poleSprite = () => pix('pole', 26, 74, P => { const { O, D, M, L, H } = STEEL;
    P.rect(1, 10, 4, 60, O); P.rect(2, 10, 1, 60, H); P.rect(3, 10, 1, 60, M); P.rect(0, 68, 6, 6, O); P.rect(1, 68, 1, 5, L); P.rect(2, 68, 3, 5, D); P.rect(1, 68, 4, 1, M);
    P.rect(2, 40, 2, 1, D);
    // the arm sweeps up and out
    P.rect(1, 7, 4, 3, O); P.px(2, 8, H); P.px(3, 8, L); P.rect(3, 4, 4, 4, O); P.px(4, 6, H); P.px(5, 5, L); P.rect(6, 2, 4, 3, O); P.px(7, 3, H); P.px(8, 3, L);
    P.rect(9, 1, 9, 3, O); P.rect(9, 2, 9, 1, L);
    // head
    P.rect(16, 0, 10, 5, O); P.rect(17, 1, 8, 1, M); P.rect(17, 2, 8, 1, D); P.rect(17, 4, 8, 1, '#c8702a'); P.rect(18, 4, 6, 1, '#ffd890'); P.px(20, 4, SOD_HI); P.px(21, 4, SOD_HI); });

  // Umihotaru: the ship-shaped island, broadside, bow to the left. Terraced decks with warm window bands, white funnels with a dark band,
  // two violet-white sail tents, a mast, tetrapods along the waterline.
  const UW = 200, UH = 84;
  const UMI_L = { red:[[73, 3], [158, 10]], warm:[[60, 66], [110, 58], [150, 62]], sail:[[73, 34], [118, 42]] };
  const umiSprite = () => pix('umi', UW, UH, P => { const rnd = RND(77);
    const base = UH - 1;
    // the island: a long seawall platform tapering to a point at the bow, tetrapods along the water
    for(let y = 70; y <= base; y++){ const x0 = Math.max(0, 22 - (y - 70) * 2), x1 = UW - 2;
      for(let x = x0; x <= x1; x++){ const t = (x * 3 + y * 5) % 7, hi = BY[(y & 3) * 4 + (x & 3)] < 5;
        P.px(x, y, y === 70 ? '#6a7286' : y < 73 ? '#3a4254' : hi && t < 3 ? '#4a5266' : t < 2 ? '#262c3a' : '#1a1e2a'); } }
    P.rect(18, 66, 30, 4, '#2a2420'); for(let x = 19; x < 48; x += 2) P.px(x, 66, '#4a3a2e');   // the bow deck (timber)
    // terraced decks: each a pale rail line, a dark facade and a band of windows; stepping in as they rise
    const decks = [[36, 186, 60, 10], [50, 176, 50, 10], [62, 166, 41, 9], [78, 150, 33, 8]];
    for(const [x0, x1, top, h] of decks){ P.rect(x0, top, x1 - x0, h, '#1e2234'); P.rect(x0, top, x1 - x0, 1, '#d8dcec'); P.rect(x0, top + 1, x1 - x0, 1, '#5a6278'); P.rect(x0, top + h - 1, x1 - x0, 1, '#0c0e18');
      for(let x = x0 + 2; x < x1 - 2; x += 3){ const r = rnd(); if(r < .82){ const c = r < .55 ? '#ffd48a' : r < .72 ? '#f2f6ff' : '#e8a050'; P.rect(x, top + 3, 2, h - 5, c); P.px(x, top + 3, r < .55 ? '#fff2cc' : '#ffffff'); } else P.rect(x, top + 3, 2, h - 5, '#2a3048'); }
      // dark posts between window bays
      for(let x = x0 + 10; x < x1 - 4; x += 16) P.rect(x, top + 2, 1, h - 3, '#0c0e18'); }
    // a glazed arched canopy at the bow end, lit warm
    for(let x = 40; x < 60; x++){ const t = (x - 50) / 10, yy = Math.round(56 - 5 * Math.sqrt(Math.max(0, 1 - t * t))); P.px(x, yy, '#ffe2a8'); for(let y = yy + 1; y < 60; y++) P.px(x, y, x % 3 === 0 ? '#e8a860' : y > 57 ? '#ffcf80' : '#4a3028'); }
    // superstructure and bridge windows
    P.rect(96, 20, 44, 13, '#262a3e'); P.rect(96, 20, 44, 1, '#e4e8f4'); for(let x = 99; x < 138; x += 3) P.rect(x, 24, 2, 5, x % 2 ? '#ffe2a8' : '#cfe6ff');
    // funnels: white with a navy band and a dark cap
    for(const [fx0, fh] of [[146, 22], [154, 26], [162, 20]]){ const fy = 33 - fh; P.rect(fx0, fy, 6, fh, '#c8ccdc'); P.rect(fx0, fy, 2, fh, '#f4f6ff'); P.rect(fx0 + 5, fy, 1, fh, '#7a8098'); P.rect(fx0, fy + 4, 6, 3, '#1e3a72'); P.rect(fx0, fy, 6, 2, '#141826'); }
    // the mast
    P.rect(158, 6, 1, 14, '#8a92a8'); P.rect(155, 12, 7, 1, '#8a92a8');
    // two sail tents, lit violet-white from below: bright on the lit side, a shaded side, seams
    const sail = (cxs, peak, base0, hw) => { for(let y = peak; y < base0; y++){ const t = (y - peak) / (base0 - peak), w = Math.round(hw * Math.pow(t, .8));
        for(let x = cxs - w; x <= cxs + w; x++){ const lit = x < cxs - w * .15, edgeL = x === cxs - w, edgeR = x === cxs + w, glowB = t > .7;
          P.px(x, y, edgeL ? '#ffffff' : edgeR ? '#6a5aa8' : lit ? (glowB ? '#f6f0ff' : '#e0d6ff') : (glowB ? '#b8a8f0' : '#9886d8')); }
        if(y % 6 === 0) for(let x = cxs - w + 1; x < cxs + w; x += 1) if(x !== cxs) P.px(x, y, x < cxs ? '#c8bcf4' : '#7e6cc0'); }
      P.rect(cxs, peak - 3, 1, base0 - peak + 3, '#5a4a90'); };
    sail(73, 6, 60, 15); sail(118, 22, 50, 10);
  });
  // its reflection: lit pixels as broken, offset dashes, the hull as a dark dither
  function umiRefl(){ if(SPR.aq_umiR) return SPR.aq_umiR; const s = umiSprite(), w = s.width, h = s.height, RH2 = 34, c = mk(w + 6, RH2), k = c.getContext('2d'), d = s.getContext('2d').getImageData(0, 0, w, h).data;
    for(let r = 0; r < RH2; r++){ const sy = h - 1 - Math.floor(r * 1.4); if(sy < 0) break; if(r > 3 && r % 2) continue; const off = 3 + Math.round(Math.sin(r * 1.7) * 2);
      for(let x = 0; x < w; x++){ const o = (sy * w + x) * 4; if(!d[o + 3]) continue; const lum = d[o] + d[o + 1] + d[o + 2];
        if(lum > 420){ k.fillStyle = `rgba(${d[o]},${d[o + 1]},${d[o + 2]},${Math.max(.12, .62 - r * .018)})`; k.fillRect(x + off, r, 1, 1); }
        else if((x + r) % 2 === 0){ k.fillStyle = 'rgba(2,6,14,.5)'; k.fillRect(x + off, r, 1, 1); } } }
    return SPR.aq_umiR = c; }

  // the wind towers: a tall striped egg with an elliptical sail leaning on it, on a low concrete platform (floodlit from below)
  const WTW = 80, WTH = 96, EGX = 47;
  const windSprite = () => pix('wind', WTW, WTH, P => {
    const pTop = WTH - 9;
    P.rect(2, pTop, WTW - 4, 9, '#262c3a'); P.rect(2, pTop, WTW - 4, 1, '#9aa4b8'); P.rect(2, pTop + 1, WTW - 4, 1, '#4a5266'); for(let x = 6; x < WTW - 4; x += 8) P.rect(x, pTop + 3, 1, 5, '#141826');
    // the egg: a round crown that swells to full width two-thirds down, broad navy and white bands, lit from the left, floodlit low
    const top = 8, R = 23, h = pTop - top;
    for(let y = top; y < pTop; y++){ const t = (y - top) / h, tt = Math.min(1, t / .7), hw = R * Math.sqrt(Math.max(0, 1 - (1 - tt) * (1 - tt)));
      for(let x = Math.round(EGX - hw); x <= Math.round(EGX + hw); x++){ const u = (x - EGX) / Math.max(1, hw), band = Math.floor((y - top + 3) / 9) % 2, flood = t > .72;
        let c = band ? (u < -.35 ? '#3a5ca0' : u < .3 ? '#284480' : '#182a56') : (u < -.35 ? '#eef2fa' : u < .3 ? '#c0c8da' : '#7a8298');
        if(flood) c = band ? (u < .3 ? '#4a70b8' : '#2a4482') : (u < .3 ? '#ffffff' : '#a8b0c4');
        if(Math.abs(u) > .95 || y === top) c = '#0e1424'; P.px(x, y, c); } }
    // the leaning elliptical sail, a grid of panels
    const sa = -.22, ca = Math.cos(sa), sn = Math.sin(sa);
    for(let y = 20; y < pTop; y++) for(let x = 4; x < 40; x++){ const dx = x - 22, dy = y - 56, rx = dx * ca + dy * sn, ry = -dx * sn + dy * ca, e = (rx / 11) * (rx / 11) + (ry / 30) * (ry / 30);
      if(e > 1) continue; const g = (Math.round(rx) % 4 === 0) || (Math.round(ry) % 4 === 0); P.px(x, y, e > .82 ? '#3a4258' : g ? '#8a94ac' : (rx < 0 ? '#dce2ee' : '#b0b8ca')); }
    P.rect(60, pTop - 6, 12, 6, '#3a4256'); P.rect(60, pTop - 6, 12, 1, '#aab4c8'); P.rect(63, pTop - 4, 2, 2, '#ffd890'); P.rect(67, pTop - 4, 2, 2, '#ffd890'); });
  function windLights(x, y, k, a, now){ const on = reduce || Math.sin(now / 640) > -.3, top = y - WTH * k;
    const sz = Math.max(PX, q(k * 1.5)); cx.fillStyle = on ? '#ff4a3a' : '#5a1418'; pxRect(q(x + (EGX - WTW / 2) * k - sz / 2), q(top + 6 * k), sz, sz);
    if(on) gl(x + (EGX - WTW / 2) * k, top + 6 * k, Math.max(PX * 3, k * 6), '#ff3a2a', .5 * a);
    gl(x + (EGX - WTW / 2) * k, y - 16 * k, k * 26, '#9ac8ff', .12 * a); }

  // a container ship at anchor: dark hull, container stacks under amber deck lights, a lit white bridge house aft, mast lights
  const SHIP = [
    '...........................................................................W....',
    '..................W........................................................O....',
    '..................O.......................................................OOO...',
    '.................OOO......................................................OHO...',
    '..................O.................................................OOOOOOOHOOO.',
    '..aaaa.bbbb.cccc..O.dddd.aaaa.bbbb.dddd.cccc.aaaa.bbbb.cccc.dddd....OHyHyHyHyHO.',
    '..aaaa.bbbb.cccc..O.dddd.aaaa.bbbb.dddd.cccc.aaaa.bbbb.cccc.dddd....OHHHHHHHHHO.',
    '..AAAA.BBBB.CCCC..O.DDDD.AAAA.BBBB.DDDD.CCCC.AAAA.BBBB.CCCC.DDDD....OHyHyHyHyHO.',
    '..aaaa.bbbb.cccc..O.dddd.aaaa.bbbb.dddd.cccc.aaaa.bbbb.cccc.dddd....OHHHHHHHHHO.',
    'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO',
    '.OLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLO.',
    '..OKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKO..',
    '...OrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrO...',
    '....OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO....'];
  const SPAL = { O:'#06080f', W:'#fff6dc', H:'#c8ccd8', y:'#ffd88a', L:'#4a3a2e', K:'#121722', r:'#4a1a1e',
    a:'#5a2a22', A:'#c87a40', b:'#1e3a5a', B:'#6a8aa0', c:'#2a4a32', C:'#8aa060', d:'#4a4a52', D:'#a09a8a' };
  const shipSprite = () => SPR.aq_ship || (SPR.aq_ship = makeSprite(SHIP, SPAL, false));
  function shipRefl(){ if(SPR.aq_shipR) return SPR.aq_shipR; const s = shipSprite(), w = s.width, h = s.height, c = mk(w + 4, 12), k = c.getContext('2d'), d = s.getContext('2d').getImageData(0, 0, w, h).data;
    for(let r = 0; r < 12; r++){ const sy = h - 1 - Math.floor(r * 1.2); if(sy < 0) break; if(r > 2 && r % 2) continue; const off = 2 + Math.round(Math.sin(r * 1.9) * 1.5);
      for(let x = 0; x < w; x++){ const o = (sy * w + x) * 4; if(!d[o + 3]) continue; const lum = d[o] + d[o + 1] + d[o + 2];
        if(lum > 360){ k.fillStyle = `rgba(${d[o]},${d[o + 1]},${d[o + 2]},${.6 - r * .04})`; k.fillRect(x + off, r, 1, 1); } else if((x + r) % 2 === 0){ k.fillStyle = 'rgba(2,6,14,.5)'; k.fillRect(x + off, r, 1, 1); } } }
    return SPR.aq_shipR = c; }

  // ================================================================ the bay at night: Kawasaki works to one side, the Chiba shore to the other
  const P = 1100, SH = 64, RH = 44;
  let SKY = null, GLOW = null, REF = null, LIGHTS = [];
  function buildBay(){
    const c = mk(P * 2, SH), k = c.getContext('2d'), rnd = RND(9091), base = SH - 1;
    const px = (x, y, col) => { k.fillStyle = col; k.fillRect(x, y, 1, 1); k.fillRect(x + P, y, 1, 1); };
    const rect = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); k.fillRect(x + P, y, w, h); };
    LIGHTS = [];
    // haze over the works: warm sodium dither, densest over the plant (drawn additively)
    const g = mk(P * 2, SH), gk = g.getContext('2d'), gp = (x, y, col) => { gk.fillStyle = col; gk.fillRect(x, y, 1, 1); gk.fillRect(x + P, y, 1, 1); };
    const dens = x => { const f = (m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s)); return .9 * f(200, 90) + .5 * f(380, 50) + .45 * f(900, 40) + .9 * f(200 + P, 90) + .9 * f(200 - P, 90) + .45 * f(900 - P, 40); };
    for(let y = 0; y < SH; y++) for(let x = 0; x < P; x++){ const v = y / SH, dd = dens(x) * (v * 1.2 - .2); if(dd <= 0) continue; const th = (BY[(y & 3) * 4 + (x & 3)] + .5) / 16;
      if(dd * .6 > th + .25) gp(x, y, '#3a1c0c'); else if(dd * .6 > th) gp(x, y, '#1e0e08'); }
    GLOW = g;
    // Kawasaki: a low dark landfill strip, tanks, process towers glittering with pinpoints, banded stacks, a flare
    for(let x = 20; x < 470; x++){ const h = 3 + Math.round(2 * Math.sin(x * .05) + 1); rect(x, base - h, 1, h + 1, '#0a0e1a'); }
    for(let x = 30; x < 460;){ const r = rnd(), dn = dens(x);
      if(r < .22){ const w = 8 + Math.floor(rnd() * 7), h = 4 + Math.floor(rnd() * 3), y0 = base - 3 - h;   // a storage tank: rounded roof, a lit rim, a ring of lights
        rect(x + 1, y0, w - 2, 1, '#5a6478'); rect(x, y0 + 1, w, h, '#161c2c'); rect(x, y0 + 1, w, 1, '#3a4458'); rect(x, y0 + 1, 1, h, '#2a3246');
        for(let xx = x + 1; xx < x + w - 1; xx += 3) px(xx, y0 + 2, '#ffe2a8'); x += w + 2 + Math.floor(rnd() * 4); }
      else if(r < .82){ const w = 10 + Math.floor(rnd() * 16), y0 = base - 3;   // a process unit: pipe racks, distillation columns, pinpoint lights
        for(const rh of [4, 8]) rect(x, y0 - rh, w, 1, '#1a2236');
        for(let xx = x; xx < x + w; xx += 3) if(rnd() < .55) px(xx, y0 - 4 - (rnd() < .5 ? 4 : 0) - 1, rnd() < .65 ? '#ffd890' : '#f4f8ff');
        const n = 2 + Math.floor(rnd() * 3);
        for(let c = 0; c < n; c++){ const cxx = x + 1 + Math.floor(rnd() * (w - 3)), cw = 1 + Math.floor(rnd() * 2), h = 7 + Math.floor(rnd() * 18 * (.4 + dn));
          rect(cxx, y0 - h, cw, h, '#111828'); rect(cxx, y0 - h, 1, h, '#28344e'); rect(cxx - 1, y0 - h, cw + 2, 1, '#1e2840');
          for(let yy = y0 - h + 2; yy < y0 - 1; yy += 4){ rect(cxx - 1, yy, cw + 2, 1, '#18203a'); if(rnd() < .7) px(cxx + (rnd() < .5 ? -1 : cw), yy, rnd() < .6 ? '#ffd890' : rnd() < .7 ? '#f4f8ff' : '#7adcff'); } }
        x += w + Math.floor(rnd() * 5); }
      else { const h = 18 + Math.floor(rnd() * 16); for(let yy = 0; yy < h; yy++) rect(x + 1, base - 3 - yy, 2, 1, Math.floor(yy / 4) % 2 ? '#8a90a4' : '#7a2a2e');   // a banded stack
        LIGHTS.push([x + 2, base - 4 - h, 'red']); x += 5 + Math.floor(rnd() * 4); } }
    // the flare stack
    rect(300, base - 34, 1, 31, '#3a4256'); LIGHTS.push([300, base - 35, 'flare']);
    // a long row of sodium shore lights under the works
    for(let x = 20; x < 470; x += 2) if(rnd() < .6) px(x, base - 1, rnd() < .7 ? '#ffb45a' : '#fff0c8');
    // the Chiba shore: the low Boso hills, a dotted coast road, the Kimitsu works far right
    for(let x = 560; x < 1080; x++){ const h = Math.round(4 + 6 * Math.max(0, Math.sin((x - 560) / 520 * Math.PI)) + 2 * Math.sin(x * .07)); rect(x, base - h, 1, h + 1, '#0a1020'); if(x % 3 === 0) px(x, base - h, '#16203a'); }
    for(let x = 560; x < 1080; x += 1){ const r = rnd(); if(r < .35) px(x, base - 1, r < .2 ? '#ffc874' : '#e8f0ff'); else if(r < .42) px(x, base - 2 - Math.floor(rnd() * 3), '#c89050'); }
    for(let x = 880; x < 930; x += 5){ const h = 8 + Math.floor(rnd() * 10); rect(x, base - 2 - h, 2, h, '#141a2a'); for(let yy = base - h; yy < base - 2; yy += 2) if(rnd() < .5) px(x + (yy % 2), yy, '#ffcf80'); LIGHTS.push([x, base - 3 - h, 'red']); }
    LIGHTS.push([905, base - 26, 'flare']); rect(905, base - 25, 1, 22, '#2a3042');
    // Tokyo far behind the works: a faint band of towers
    for(let x = 470; x < 560; x += 3){ const h = 2 + Math.floor(rnd() * 5); rect(x, base - h, 3, h, '#0c1224'); if(rnd() < .5) px(x + 1, base - h + 1, '#a87a48'); }
    SKY = c; buildRefl(); }
  // the mirror: lit pixels become broken vertical streaks (fixed per light), dark land a checker of deeper water; anchored ships' lights
  function buildRefl(){ const c = mk(P * 2, RH), k = c.getContext('2d'), d = SKY.getContext('2d').getImageData(0, 0, P, SH).data, rnd = RND(313);
    const put = (x, y, col) => { if(y < RH && y >= 0){ k.fillStyle = col; k.fillRect(x, y, 1, 1); k.fillRect(x + P, y, 1, 1); } };
    for(let x = 0; x < P; x++) for(let y = SH - 1; y >= 0; y--){ const o = (y * P + x) * 4; if(!d[o + 3]) continue; const r = d[o], g = d[o + 1], b = d[o + 2], lum = r + g + b, ry = Math.floor((SH - 1 - y) * .5);
      if(ry >= RH) continue;
      if(lum > 330){ const len = 2 + Math.floor(rnd() * 8); for(let j = 0; j < len; j++){ if(j > 1 && rnd() < .35) continue; put(x + (j > 3 && rnd() < .3 ? (rnd() < .5 ? -1 : 1) : 0), ry + j, `rgba(${r},${g},${b},${Math.max(.15, .7 - j * .07)})`); } }
      else if(lum < 120 && (x + ry) % 2 === 0 && ry < 6) put(x, ry, 'rgba(2,6,16,.35)'); }
    // ships at anchor on the open water: a white masthead light, a deck glow, a long trembling streak below
    for(let n = 0; n < 16; n++){ const x = Math.floor(rnd() * P), y = 2 + Math.floor(rnd() * rnd() * 16), cool = rnd() < .5;
      put(x, y, '#fff6dc'); put(x + 1, y, cool ? '#cfe6ff' : '#ffd890'); if(rnd() < .5) put(x - 2, y + 1, rnd() < .5 ? '#ff4a3a' : '#3aff8a');
      for(let j = 2; j < 4 + y * .6; j++) if(rnd() < .7) put(x + (j % 3 === 2 ? 1 : 0), y + j, `rgba(255,236,200,${Math.max(.12, .5 - j * .04)})`); }
    REF = c; }

  // ================================================================ layout
  const LAMP = 8, DECK = 1.24, RAIL = 1.18, UMI_K = 246, SHIP_K = 268;
  const lampD = i => Math.abs(i % LAMP - 4);
  // island aprons: Umihotaru on the right where you surface; the portal island on both sides right at the next portal
  const apron = (k, sd) => { if(sd > 0 && k >= 204 && k < 262) return clamp((262 - k) / 8, 0, 1) * clamp((k - 204) / 6, 0, 1) * 2.2 + DECK;
    if(k >= 308) return clamp((k - 308) / 6, 0, 1) * 2.4 + DECK; return 0; };

  // ================================================================ the dive: the road ramps down under the sea before every portal
  /* World heights. The road's own height (hills and all) is sea level; around each bore it is lowered by dip(v) (world units, per segment
     vertex): down RD segments to DP before the portal, deeper (DM) mid-bore, back to DP at the exit and up RU segments to the sea again.
     The dip only ever spans Aqua-Line segments and is zero at both ends of the road's stretch, so a border never steps. Where there is no
     room outside (the ride starts in a bore, or the road begins or ends inside one) the dive happens inside the bore instead.
     Applied once per segment, as soon as the whole stretch it depends on exists (well beyond the draw distance): p1/p2 world y are lowered
     and the sea level kept in s.aqS1/aqS2 (dip in s.aqD1/aqD2). Additive, like the jump's camera lift and the kaiju's stomp. */
  const RD = 50, RU = 34, DP = 4000, DM = 4600, DX = 1600, FB = 150, WIN0 = 88, WIN1 = 122;
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.cos(t * Math.PI)) / 2;
  const isAqua = j => { const s = segs[j]; return !!s && LANDS[s.land].key === 'aqua'; };
  const tunAt = j => { const s = segs[j]; return !!s && !!s.tunnel; };   /* the core's own answer (regular bores, forks and long bores alike) */
  const OCC = new Map(); let occRef = null;
  function occ(T){ if(T < 0) return null; for(const r of LR) if(T < r.b + RB && T + 200 > r.a - RA) return null;   /* (a long bore has its own profile) */
    if(segs !== occRef){ occRef = segs; OCC.clear(); }
    const BL = 200, end = T + BL + RU; if(segs.length <= end) return undefined;   // not all built yet
    const o = OCC.get(T); if(o && o.ref === segs[end] && o.r0 === segs[T]) return o.p;
    let TS = -1, TE = -1; for(let j = T; j < T + BL; j++){ if(isAqua(j) && tunAt(j)){ if(TS < 0) TS = j; TE = j + 1; } else if(TS >= 0) break; }
    let p = null;
    if(TS >= 0 && TE - TS >= 90){ let d0 = TS; while(d0 > TS - RD && d0 > 0 && isAqua(d0 - 1)) d0--; let d1 = TS;
      if(TS - d0 < 16){ d0 = TS === 0 ? 44 : TS + 4; d1 = d0 + RD; }
      let e1 = TE; while(e1 < TE + RU && isAqua(e1)) e1++; let e0 = TE;
      if(e1 - TE < 16){ e1 = TE - 4; e0 = e1 - RU; }
      if(e0 - d1 >= 10) p = { d0, d1, e0, e1, deep:e0 - d1 >= 120 }; }
    OCC.set(T, { ref:segs[end], r0:segs[T], p }); return p; }
  function prof(p, v){ if(!p || v <= p.d0 || v >= p.e1) return 0;
    if(v < p.d1) return DP * ease((v - p.d0) / (p.d1 - p.d0));
    if(v > p.e0) return DX * (1 - ease((v - p.e0) / (p.e1 - p.e0)));
    // inside: on down to DM, then up to the shallower exit depth DX (the climb out starts in the bore)
    if(!p.deep) return DP + (DX - DP) * ease((v - p.d1) / (p.e0 - p.d1));
    return DP + (DM - DP) * ease((v - p.d1) / 50) + (DX - DM) * ease((v - p.e0 + 70) / 70); }
  function dipAt(v){ const T1 = v - v % 320, T2 = T1 + 320; let d = 0;
    for(const r of LR) if(v > r.a - RD - 2 && v < r.b + RU + 2) return Math.round(prof(r.a < 60 ? { d0:r.a + 44, d1:r.a + 44 + RD, e0:r.b, e1:r.b + RU, deep:true } : { d0:r.a - RD, d1:r.a, e0:r.b, e1:r.b + RU, deep:true }, v));   /* (a bore that starts the ride dives inside itself, as before) */
    if(v <= T1 + 200 + RU){ const p = occ(T1); if(p === undefined) return undefined; d = Math.max(d, prof(p, v)); }
    if(v >= T2 - RD){ const p = occ(T2); if(p === undefined) return undefined; d = Math.max(d, prof(p, v)); }
    return Math.round(d); }
  let scanRef = null, scanJ = 0, scanNow = -1;
  function dipScan(){ if(!segs || !gates) return; if(segs !== scanRef){ scanRef = segs; scanJ = 0; } if(scanJ > segs.length - 1) scanJ = Math.max(0, segs.length - 1);
    while(scanJ < segs.length - 1){ const s = segs[scanJ]; if(!s.aqD){ const d1 = dipAt(scanJ), d2 = dipAt(scanJ + 1); if(d1 === undefined || d2 === undefined) break;
        s.aqD = 1; s.aqS1 = s.p1.world.y; s.aqS2 = s.p2.world.y; s.aqD1 = d1; s.aqD2 = d2;
        if(d1 || d2){ s.p1.world.y -= d1; s.p2.world.y -= d2; if(!tunAt(scanJ)) toTrench(s, scanJ); } }
      scanJ++; } }
  // an open segment in the cutting: its parapets become the retaining walls (one sprite draws both walls and the sea beyond)
  function toTrench(s, i){ if(s.aqTr || s.tunnel) return;   /* (never inside a bore: the core's s.tunnel is the truth, e.g. a long bore's middle) */ s.aqTr = 1; s.sprites = s.sprites.filter(sp => !(sp.env === 'aqua' && (sp.type === 'wall' || sp.type === 'pole'))); s.sprites.unshift({ env:'aqua', type:'trench', x:0, k:i }); }

  // the parapet: a solid concrete wall with a lit cap and a slim rail above, drawn from this segment to the next
  function drawWall(sp, x, y, uw, fog, now){ const s = segs[sp.k], n = segs[sp.k + 1]; if(!s || !n || n.tunnel || !s.p2.screen.scale) return; const qq = s.p2.screen, fx2 = qq.x + sp.x * qq.w, fy = qq.y; if(fy > y + 1) return;
    const d = lampD(sp.k), warm = d === 0 ? .55 : d === 1 ? .32 : d === 2 ? .12 : 0, h = uw * .12, fh = qq.w * .12;
    poly(x, y + 1, x, y - h, fx2, fy - fh, fx2, fy + 1, fc(mixc('#5a647a', '#c88a50', warm), fog));
    poly(x, y - h * .25, x, y - h * .25 - Math.max(PX * .6, h * .1), fx2, fy - fh * .25 - Math.max(PX * .4, fh * .1), fx2, fy - fh * .25, fc('#2a3042', fog));
    poly(x, y - h, x, y - h - Math.max(PX, h * .14), fx2, fy - fh - Math.max(PX * .6, fh * .14), fx2, fy - fh, fc(mixc('#c4ccdc', '#ffe0b0', warm), fog));
    if(fog > .8) return;
    const rh = uw * .2, frh = qq.w * .2, t = Math.max(PX * .7, uw * .014), ft = Math.max(PX * .4, qq.w * .014);
    poly(x, y - rh, x, y - rh - t, fx2, fy - frh - ft, fx2, fy - frh, fc(mixc('#9aa6bc', '#ffd8a0', warm), fog));
    if(sp.k % 4 === 0){ cx.fillStyle = fc('#4a5468', fog); pxRect(Math.round(x), y - rh, Math.max(PX * .7, uw * .014), rh - h); } }

  // the retaining walls of the cutting and the sea beyond them, for one segment. The wall's coping sits FB above sea level (never lower
  // than the bridge parapet); the sea is drawn at sea level, so on the ramp it lies above the road and level with the coping
  let WALLC = null;   // (built on first use: mixc belongs to the game script, which loads after this file)
  const wallC = () => WALLC || (WALLC = [0, .12, .32, .55].map(w => ({ face:mixc('#4a5468', '#b07a48', w), lip:mixc('#c4ccdc', '#ffe0b0', w), top:mixc('#8a94a8', '#d8b088', w) })));
  const wallH = d => Math.max(240, d + FB);
  function drawTrench(sp, x, y, uw, fog, now){ const s = segs[sp.k]; if(!s || !s.p2.screen.scale || s.p2.camera.z <= 0) return;
    const i = sp.k, k = i % 320, a = s.p1.screen, b = s.p2.screen, f = H / (ROADW * W), kA = a.w * f, kB = b.w * f;
    const sA = a.y - (s.aqD1 || 0) * kA, sB = b.y - (s.aqD2 || 0) * kB, hA = wallH(s.aqD1 || 0), hB = wallH(s.aqD2 || 0), cA = a.y - hA * kA, cB = b.y - hB * kB;
    const camY = s.p1.world.y - s.p1.camera.y, above = camY > s.aqS1 + 30, ld = lampD(i), wc = wallC()[ld === 0 ? 3 : ld === 1 ? 2 : ld === 2 ? 1 : 0];
    // the sea, seen over the walls while your eye is above it
    if(above && sA - sB > -PX) seaBand(i, k, sA, sB - 1, a, b, fog, now, DECK);
    const swell = v => reduce ? 80 : 50 + 170 * Math.max(0, Math.sin(v * .45 - now / 2600)) * (.6 + .4 * H0(v * .7));
    for(const sd of [-1, 1]){ const xa = a.x + sd * a.w * RAIL, xb = b.x + sd * b.w * RAIL, oa = a.x + sd * a.w * DECK, ob = b.x + sd * b.w * DECK;
      // foam where the sea laps the wall (only seen from above it), shifting slowly
      if(above && fog < .85){ const fo = (i + (reduce ? 0 : Math.floor(now / 700))) % 3; if(fo) poly(oa, sA + 1, oa + sd * a.w * (fo === 1 ? .1 : .05), sA + 1, ob + sd * b.w * (fo === 1 ? .06 : .1), sB, ob, sB, fc(fo === 1 ? '#8ab8c8' : '#4a7a90', fog)); }
      // a swell crest showing just behind the coping (over the wall top once your eye is below the sea)
      if(fog < .8 && (s.aqD1 || s.aqD2)){ const wA = swell(i) * kA, wB = swell(i + 1) * kB; poly(oa, cA, oa, cA - wA, ob, cB - wB, ob, cB, fc('#0e2a3e', fog));
        if(wA > PX * .6) poly(oa, cA - wA, oa, cA - wA - Math.max(PX * 2, wA * .3), ob, cB - wB - Math.max(PX * 1.2, wB * .3), ob, cB - wB, fc('#bfe2ee', fog)); }
      // the coping's top, then the face: base kerb, concrete, a wet band under the lip, the pale lip
      poly(xa, cA, oa, cA, ob, cB, xb, cB, fc(wc.top, fog));
      const band = (h0, h1, col) => poly(xa, a.y - h0(hA) * kA, xa, a.y - h1(hA) * kA, xb, b.y - h1(hB) * kB, xb, b.y - h0(hB) * kB, col);
      if(fog > .6) band(() => 0, h => h, fc(wc.face, fog));
      else { band(() => 0, () => 60, fc('#1e2430', fog)); band(() => 60, h => h - 150, fc(wc.face, fog)); band(h => h - 150, h => h - 45, fc('#2c3646', fog)); band(h => h - 45, h => h, fc(wc.lip, fog));
        // panel joints, and a row of cyan delineators leading into the portal
        if(uw > W * .04 && i % 3 === 0){ cx.fillStyle = fc('#323a4c', fog); pxRect(q(xa), q(cA + 45 * kA), PX, q((hA - 105) * kA)); }
        if(i % 2 === 0 && uw > W * .015){ const d = Math.max(PX, q(uw * .028)); cx.fillStyle = fog > .5 ? fc('#4ab8d8', fog) : '#8ae8ff'; pxRect(q(xa - d / 2), q(a.y - 200 * kA), d, d); } } }
    // sodium lamps on the wall faces (the cutting has no poles, so the sky over the walls stays open), the sea's glitter and spray
    if(i % LAMP === 4 && fog < .9) for(const sd of [-1, 1]){ const lx = a.x + sd * a.w * (RAIL - .01), ly = a.y - Math.min(hA - 120, 900) * kA, lw = Math.max(PX, q(uw * .09)), lh = Math.max(PX, q(uw * .035));
      cx.fillStyle = fc('#0e1220', fog); pxRect(q(lx - (sd > 0 ? lw : 0)) - PX, q(ly) - PX, lw + PX * 2, lh + PX * 2); cx.fillStyle = '#ffd890'; pxRect(q(lx - (sd > 0 ? lw : 0)), q(ly + lh * .4), lw, Math.max(PX, q(lh * .6)));
      gl(lx - sd * lw * .5, ly + lh, Math.min(uw * .35 + 2, H * .12), SOD, .45 * (1 - fog * .7)); }
    if(fog < .75) for(const sd of [-1, 1]){ const oa = a.x + sd * a.w * DECK;
      if(above && sA - sB > PX){ const ph = reduce ? 0 : Math.floor(now / 1300 + H0(i * 2.3 + sd)); for(let n = 0; n < 2; n++){ if(H0(i * 3.7 + n * 5.1 + sd + ph * .37) > .55) continue;
          const gx = oa + sd * a.w * (.15 + H0(i * 1.7 + n * 2.9 + sd) * 1.6), gy = q(lerp(sA, sB, .3 + .4 * H0(i + n))); cx.fillStyle = fc('#dce8f4', fog * .6); pxRect(q(gx), gy, Math.max(PX, q(a.w * .05)), PX); } }
      // spray: now and then a wave bursts on the outer face and its spray stands over the coping for a moment
      if(!reduce && (s.aqD1 || 0) > 300 && uw > W * .03 && uw < W * .9){ const T = now / 1700, slot = Math.floor(T), t = T - slot; if(H0(i * 3.31 + slot * 7.13 + sd * 1.7) < .045){ const hh = Math.sin(t * Math.PI) * 420 * kA, wd = a.w * .22, cs = fc('#cfe6f0', fog), cs2 = fc('#7aa8bc', fog);
          for(let c = 0; c < 5; c++){ const px0 = q(oa - sd * a.w * .04 + sd * (c - 1) * wd / 4), top = Math.max(-PX * 2, q(cA - hh * (.55 + .45 * H0(c * 3.1 + i)))); const c0 = q(cA); for(let j = 1, yy = c0 - PX * 2; yy >= top; j++, yy -= PX * 2){ if(yy >= H) continue; cx.fillStyle = (yy - top) < hh * .3 ? cs : cs2; pxRect(px0 + (j & 1) * PX, yy, PX, PX); }   /* rows fixed to the coping: the plume grows and falls, its dots never jitter */ } } } }
    // a tide gauge on the left wall near the portal: red and white staff, the sea-level mark lit level with the water outside
    if(k === 300 && uw > W * .03 && fog < .7){ const gx = a.x - a.w * (RAIL - .03), gw = Math.max(PX * 2, q(uw * .07)), st = 200;
      for(let h = 0; h < hA - 60; h += st){ cx.fillStyle = fc((h / st) % 2 ? '#e8e4dc' : '#c82a2a', fog); pxRect(q(gx), q(a.y - (h + st) * kA), gw, Math.max(PX, q(st * kA))); }
      cx.fillStyle = '#7af0ff'; pxRect(q(gx - gw), q(sA), gw * 3, PX); gl(gx, sA, uw * .2, '#4ad8ff', .25 * (1 - fog));
      if(uw > W * .1 && uw < W * .35) liveText('海面', gx + gw * 2.6, sA - uw * .05, uw * .25, uw * .09, fc('#c8f4ff', fog)); } }

  function drawPole(sp, x, y, uw, fog, now){ const s = segs[sp.k], lift = s && s.aqTr ? Math.min(wallH(s.aqD1 || 0), 240 + 300) * uw * H / (ROADW * W) : uw * .12;   // in the cutting: on a bracket low on the wall
    const left = sp.x < 0, spr = fogged(poleSprite(), 'pole', fog), k = uw * 1.75 / spr.height, base = y - lift;
    // the pole (sprite x 2.5) stands on the parapet at x; the lens (sprite x 20.5) hangs 18 art px out over the road
    if(!left){ cx.save(); cx.translate(x, 0); cx.scale(-1, 1); blit(spr, 10.5 * k, base, k); cx.restore(); } else blit(spr, x + 10.5 * k, base, k);
    const hy = base - spr.height * k + 5 * k, a = 1 - fog * .7, hxx = x + (left ? 18 : -18) * k;
    if(fog < .8 && fog > .03){ cx.globalCompositeOperation = 'lighter';
      for(const [wt, wb, al] of [[3, .5, .04], [1.6, .25, .055]]){ cx.fillStyle = `rgba(255,150,60,${al * (1 - fog)})`; const tw = wt * k, bw = uw * wb;
        cx.beginPath(); cx.moveTo(hxx - tw, hy); cx.lineTo(hxx + tw, hy); cx.lineTo(hxx + bw, y); cx.lineTo(hxx - bw, y); cx.closePath(); cx.fill(); }
      cx.globalCompositeOperation = 'source-over'; }
    gl(hxx, hy, Math.min(uw * .3 + 2, H * .12), SOD, .5 * a); }

  function drawUmi(sp, x, y, uw, fog, now){ const spr = fogged(umiSprite(), 'umi', fog * .85), k = uw * 6.4 / spr.width, a = 1 - fog * .7, x0 = x - spr.width * k / 2, y0 = y - spr.height * k;
    const rf = umiRefl(); cx.globalAlpha = 1 - fog * .6; { const [r2, k2] = artK(rf, k); blit(r2, x + 3 * k, y + rf.height * k, k2); } cx.globalAlpha = 1;
    { const [s2, k2] = artK(spr, k); blit(s2, x, y, k2); }
    for(const [sx, sy] of UMI_L.sail) gl(x0 + sx * k, y0 + sy * k, 26 * k, '#a890ff', .16 * a);
    for(const [sx, sy] of UMI_L.warm) gl(x0 + sx * k, y0 + sy * k, 22 * k, '#ffb868', .16 * a);
    const on = reduce || Math.sin(now / 560 + 1) > -.3, sz = Math.max(PX, q(k * 1.6));
    for(const [rx, ry] of UMI_L.red){ cx.fillStyle = on ? '#ff5a46' : '#5a1418'; pxRect(q(x0 + rx * k - sz / 2), q(y0 + ry * k - sz / 2), sz, sz); if(on) gl(x0 + rx * k, y0 + ry * k, k * 6 + PX * 2, '#ff3a2a', .45 * a); } }

  function drawShip(sp, x, y, uw, fog, now){ const spr = fogged(shipSprite(), 'ship', fog * .8), k = uw * 6 / spr.width, a = 1 - fog * .7, bob = reduce ? 0 : Math.round(Math.sin(now / 1100 + sp.k) * k * .4);
    cx.globalAlpha = 1 - fog * .6; blit(shipRefl(), x, y + bob + shipRefl().height * k, k); cx.globalAlpha = 1; blit(spr, x, y + bob, k);
    const x0 = x - spr.width * k / 2, y0 = y + bob - spr.height * k;
    gl(x0 + 76 * k, y0 + 6 * k, 10 * k, '#ffd890', .25 * a); gl(x0 + 30 * k, y0 + 7 * k, 30 * k, '#ffb050', .1 * a);
    for(const [mx, my] of [[18, 0], [75, 0]]) gl(x0 + mx * k, y0 + my * k, 3 * k + PX, '#fff6dc', .5 * a); }

  const DRAW_FN = { wall:drawWall, pole:drawPole, umi:drawUmi, ship:drawShip, trench:drawTrench };

  // ---- reflections: a column of broken dashes hanging below a light, at fixed fractions of its length (rides with the light; slow 1.2 s shimmer)
  function column(x, y0, len, w, seed, now, al0, colHi, colLo){ if(len < PX * 3 || al0 <= .01) return; const n = 12, ph = reduce ? 0 : now / 1200, p0 = Math.floor(ph), f = ph - p0;
    cx.globalCompositeOperation = 'lighter';
    for(let i = 0; i < n; i++){ const v = i / n, yy = Math.round((y0 + v * len) / PX) * PX; if(yy >= H) break;
      const h = lerp(H0(seed * 7.1 + i * 3.3 + p0 * .61), H0(seed * 7.1 + i * 3.3 + (p0 + 1) * .61), f), ww = Math.max(PX, w * (1 - v * .55) * (.6 + h * .6)), ox = (H0(seed * 3.7 + i * 1.9) - .5) * w * .35;
      cx.fillStyle = v < .2 ? colHi : colLo; cx.globalAlpha = al0 * (1 - v * .85); pxRect(Math.round((x + ox - ww / 2) / PX) * PX, yy, Math.max(PX, Math.round(ww / PX) * PX), v < .45 && len > PX * 40 ? PX * 2 : PX); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }

  // the moon's glade: rows of pale dashes under the moon. Physically it stays put under the moon while the water runs past, so it is
  // anchored to screen rows; each row's width eases between two hashed values on a slow 1.2 s phase (no per-frame flicker)
  function glade(by, ay, a, b, fog, now, wetRoad = true){ const t = MOON.t; if(t > .97) return; const hz = HZ, st = PX * 2, mx = MOON.x, str = (1 - clamp((t - .85) * 8, 0, 1));
    const ph = reduce ? 0 : now / 1200, p0 = Math.floor(ph), f = ph - p0;
    const r0 = Math.max(0, Math.ceil((by - hz) / st)), r1 = Math.min(Math.floor((H - hz) / st), Math.floor((ay - hz) / st)); if(r1 < r0) return; cx.globalCompositeOperation = 'lighter';
    for(let r = r0; r <= r1; r++){ const y = hz + r * st; if(y < by || y >= ay) continue; if(H0(r * 1.37) < .22) continue;
      const d = (y - hz) / (H - hz), hh = lerp(H0(r * 5.3 + p0 * .7), H0(r * 5.3 + (p0 + 1) * .7), f), w = (PX * 3 + d * W * .16) * (.35 + hh * .9), ox = (H0(r * 3.1) - .5) * (PX * 4 + d * W * .1);
      const tt = (y - by) / Math.max(1, ay - by), dl = lerp(b.x - b.w * DECK, a.x - a.w * DECK, tt), dr = lerp(b.x + b.w * DECK, a.x + a.w * DECK, tt);
      const x0 = q(mx + ox - w / 2), x1 = q(mx + ox + w / 2), al = (.42 - d * .22) * str;
      cx.fillStyle = `rgba(240,230,205,${al})`;
      // on the water at full strength, on the wet road (between the parapets) faintly
      const segsX = [[x0, Math.min(x1, dl)], [Math.max(x0, dr), x1]]; for(const [u0, u1] of segsX) if(u1 > u0) pxRect(u0, y, u1 - u0, PX);
      const m0 = Math.max(x0, dl), m1 = Math.min(x1, dr); if(wetRoad && m1 > m0){ cx.fillStyle = `rgba(240,230,205,${al * .45})`; pxRect(m0, y, m1 - m0, PX); } }
    cx.globalCompositeOperation = 'source-over'; }

  // per frame: cars by segment, for tail-light reflections
  let carNow = -1, carMap = new Map();
  function mapCars(now){ if(now === carNow) return; carNow = now; carMap.clear(); if(typeof cars === 'undefined') return; for(const c of cars){ const i = Math.floor(c.z / SEG); if(!carMap.has(i)) carMap.set(i, []); carMap.get(i).push(c); if(c.aqSeed === undefined) c.aqSeed = Math.random() * 1000; } }

  // the sea between rows by (far) and ay (near), outside ix half-road widths: water, the far-shore mirror, the island aprons, ripples, the
  // moon's glade, lamp reflections. On the bridge it lies at road level; beside the cutting at sea level (drawn by the trench sprite)
  function seaBand(i, k, ay, by, a, b, fog, now, ix, wetRoad){
    const hz = HZ, st = segs[i] ? segs[i].stripe : 0, water = fc(st ? '#081a28' : '#0a1d2c', fog * .9);
    const L = a.x - a.w * ix, Lb = b.x - b.w * ix, Rr = a.x + a.w * ix, Rb = b.x + b.w * ix;
    poly(-PX * 4, ay + 1, L, ay + 1, Lb, by, -PX * 4, by, water); poly(Rr, ay + 1, W + PX * 4, ay + 1, W + PX * 4, by, Rb, by, water);
    // the far-shore mirror (screen rows below the horizon), skipping the deck
    const ry0 = by + 1 - hz;
    if(REF && ry0 >= 0 && ry0 < RH * PX){ const off = ((((skyPar('mid')) / PX) % P) + P) % P, sy = ry0 / PX, shh = Math.min(RH - sy, (ay - by + 1) / PX), Lm = Math.min(L, Lb), Rm = Math.max(Rr, Rb);
      if(shh > 0){ if(Lm > 0) cx.drawImage(REF, off, sy, Lm / PX, shh, 0, by + 1, Lm, shh * PX); if(Rm < W) cx.drawImage(REF, off + Rm / PX, sy, (W - Rm) / PX, shh, Rm, by + 1, W - Rm, shh * PX); } }
    if(ay - by < PX * .5) return;
    // islands: the Umihotaru seawall and the portal island, concrete aprons edged with tetrapods
    for(const sd of [-1, 1]){ const ap = apron(k, sd), apN = apron((i + 1) % 320, sd); if(ap <= DECK + .01 && apN <= DECK + .01) continue;
      const e = Math.max(DECK, ap), eN = Math.max(DECK, apN), xa = a.x + sd * a.w * e, xb = b.x + sd * b.w * eN, xa0 = a.x + sd * a.w * DECK, xb0 = b.x + sd * b.w * DECK;
      poly(xa0, ay + 1, xa, ay + 1, xb, by, xb0, by, fc((i >> 1) % 3 ? '#1e2230' : '#22263a', fog));
      const tw = a.w * .5, twb = b.w * .5; poly(xa, ay + 1, xa + sd * tw, ay + 1, xb + sd * twb, by, xb, by, fc('#141824', fog));
      if(fog < .7 && a.w > 8){ cx.fillStyle = fc('#4a5468', fog); for(let n = 0; n < 3; n++){ const u = H0(i * 3.1 + n * 7.7 + sd), xx = lerp(xa, xa + sd * tw, u), ww = Math.max(PX, q(a.w * .08)); pxRect(q(xx - ww / 2), q(by), ww, Math.max(PX, q((ay - by) * .5))); } }
      cx.fillStyle = fc('#6a7488', fog); const lw = Math.max(PX * .6, a.w * .02); poly(xa - sd * lw, ay + 1, xa, ay + 1, xb, by, xb - sd * Math.max(PX * .4, b.w * .02), by, cx.fillStyle);
      // apron lamps glow pools on the concrete, warm
      if(lampD(i) <= 1 && fog < .9){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,150,70,${(lampD(i) ? .04 : .08) * (1 - fog)})`; poly(xa0, ay, lerp(xa0, xa, .6), ay, lerp(xb0, xb, .6), by, xb0, by, cx.fillStyle); cx.globalCompositeOperation = 'source-over'; } }
    // ripples catching the sky, only in the middle distance (near the camera a per-segment pattern would sparkle)
    if(fog > .14 && fog < .9 && i % 2 === 0){ cx.fillStyle = fc('#1c3c58', fog * .6);
      for(let n = 0; n < 3; n++){ const sd = n % 2 ? 1 : -1, u = H0(i * 7 + n), xx = (sd < 0 ? L : Rr) + sd * a.w * (.4 + u * 7), ww = q(a.w * (.12 + H0(i + n * 3) * .35)) + PX; if(apron(k, sd) > DECK && Math.abs(xx - a.x) < a.w * (apron(k, sd) + .6)) continue; pxRect(q(xx), q(by), ww, PX); } }
    glade(by, ay, a, b, fog, now, wetRoad);
    // each lamp head mirrored in the water outside the parapet
    if(i % LAMP === 4 && fog < .92) for(const sd of [-1, 1]) if(apron(k, sd) <= DECK) column(a.x + sd * a.w * (DECK + .22), ay + a.w * .02, a.w * .7, a.w * .12, i * 2 + 5 + sd, now, .32 * (1 - fog), '#ffc078', '#c86a30'); }

  // the sea and the bridge deck, per segment (in the cutting only the deck: the sea there is drawn at sea level by the trench sprite)
  function seaRoad(s, a, b, fog, now){
    const i = s.index, k = i % 320, ay = a.y, by = b.y - 1, st = s.stripe, cut = !!(s.aqD1 || s.aqD2);
    if(ay - by < .3) return;
    if(ay - by < PX * .5){ const dk = fc('#23272f', fog); if(!cut) seaBand(i, k, ay, by, a, b, fog, now, DECK, true);
      poly(a.x - a.w * DECK, ay + 1, a.x - a.w, ay + 1, b.x - b.w, by, b.x - b.w * DECK, by, dk); poly(a.x + a.w, ay + 1, a.x + a.w * DECK, ay + 1, b.x + b.w * DECK, by, b.x + b.w, by, dk);
      return; }
    const L = a.x - a.w * DECK, Lb = b.x - b.w * DECK, Rr = a.x + a.w * DECK, Rb = b.x + b.w * DECK;
    if(!cut) seaBand(i, k, ay, by, a, b, fog, now, DECK, true); else glade(by, ay, a, b, fog, now, true);
    // the deck beside the road: wet pale concrete, white edge line, the deck lip
    const lit = s.lit || 0, dc = fc(mixc(st ? '#20242e' : '#23272f', '#7a5230', lit * .6), fog);
    poly(L, ay + 1, a.x - a.w, ay + 1, b.x - b.w, by, Lb, by, dc); poly(a.x + a.w, ay + 1, Rr, ay + 1, Rb, by, b.x + b.w, by, dc);
    if(a.w > 14){ const cc = fc('#c8d0dc', fog), cw = a.w * .03, cwb = b.w * .03;
      poly(a.x - a.w, ay + 1, a.x - a.w + cw, ay + 1, b.x - b.w + cwb, by, b.x - b.w, by, cc); poly(a.x + a.w - cw, ay + 1, a.x + a.w, ay + 1, b.x + b.w, by, b.x + b.w - cwb, by, cc); }
    // light pools on the outer lanes under each lamp pair, stepped
    const d = lampD(i); if(d <= 2 && fog < .9){ cx.globalCompositeOperation = 'lighter';
      cx.fillStyle = `rgba(255,150,70,${[.11, .065, .03][d] * (1 - fog)})`; for(const sd of [-1, 1]) poly(a.x + sd * a.w * .3, ay, a.x + sd * a.w * 1.1, ay, b.x + sd * b.w * 1.1, by, b.x + sd * b.w * .3, by, cx.fillStyle);
      cx.globalCompositeOperation = 'source-over'; }
    // wet asphalt: each lamp head as a column of broken dashes hanging from its own segment; and on the water outside the parapet
    if(i % LAMP === 4 && fog < .92){ const al0 = .4 * (1 - fog);
      for(const sd of [-1, 1]) column(a.x + sd * a.w * .74, ay, a.w * .9, a.w * .1, i * 2 + (sd > 0 ? 1 : 0), now, al0, '#ffd696', '#ffa050'); }
    // tail lights in the wet road
    const cs = carMap.get(i); if(cs && fog < .85) for(const c of cs){ const pct = (c.z % SEG) / SEG, w = lerp(a.w, b.w, pct), xx = lerp(a.x, b.x, pct) + c.x * w, yy = lerp(a.y, b.y, pct);
      for(const sd of [-1, 1]) column(xx + sd * w * .12, yy, w * .32, Math.max(PX, w * .06), c.aqSeed + sd, now, .4 * (1 - fog), '#ff5a4a', '#c8202a'); }
  }

  // the sea's rumble under the bay: brown noise through a low-pass, swelling slowly (a long wave period). Fed every frame while you are
  // under the sea; it ramps itself back to silence within a second whenever the feed stops (another road, a pause, a crash screen)
  let RUM = null, rumT = 0;
  function rumble(v, now){ if(typeof M === 'undefined' || !M.ac || !M.noiseBuf || !M.out) return; const a = M.ac, t = a.currentTime; if(t - rumT < .1) return; rumT = t;
    if(!RUM){ if(v <= 0) return; try{ const src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain(); src.buffer = M.noiseBuf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 95; lp.Q.value = .8;
        g.gain.value = 0; src.connect(lp).connect(g).connect(M.out); src.start(); RUM = { g, lp }; }catch(e){ return; } }
    const sw = reduce ? .7 : .55 + .45 * Math.sin(now / 2700), tgt = v * .16 * sw, gg = RUM.g.gain;
    gg.cancelScheduledValues(t); gg.setValueAtTime(gg.value, t); gg.linearRampToValueAtTime(tgt, t + .2); gg.linearRampToValueAtTime(0, t + 1.2);
    RUM.lp.frequency.setTargetAtTime(80 + 40 * sw, t, .3); }

  // ================================================================ hooks
  ENV.aqua = {
    road:['#151820', '#171a23'],
    win:WINX,   /* the observation-window hooks (see WINX) */
    tunOver,   /* the core's boreAt(): a long bore's say on segment i (see LR) */
    lampCol:'#8a5a2c',
    warm(){ if(!SKY) buildBay(); poleSprite(); artSizes(umiSprite(), true); artSizes(umiRefl(), true); windSprite(); shipSprite(); shipRefl(); exitSign(); hydrant(); doorSpr(); exitSign3(); hydrant3(); doorSpr3(); windRefl(); buildUnder(); for(const [s, n] of [[poleSprite(), 'pole'], [shipSprite(), 'ship'], [umiSprite(), 'umi'], [windSprite(), 'wind']]) fogTintWarm(s, 'aq:' + n, 4, .84, LOW);
      for(const w of [UWC, UWFC, windRefl()]) cx.drawImage(w, 0, 0, 1, 1);   /* upload now, not at the first window */
      for(const L of [96, 48, 24, 12, 6]) for(let st = 0; st <= 6; st++)   /* every fog step at every size: a ring met at an unexpected distance was built mid-ride */ for(let blk = 0; blk < 2; blk++) for(let j = 0; j < 2; j++) ringImg(L, blk, j, st);
      for(const key of Object.keys(T)){ const v = T[key]; for(const c of Array.isArray(v) ? v : [v]) if(typeof c === 'string' && c[0] === '#') for(let st = 0; st < 7; st++) for(let cs = 0; cs <= 6; cs++) tc(c, st / 7 + .01, cs); }
      if(!TSC) TSC = mk(320, 24); const txt = () => { for(const v of [TUN_NAME, '海面', ...Object.values(DEPTH), ...Object.values(KMB)]) for(const px of TSZ) textMask(v, px); textSprite(TUN_NAME, '#c8f4ff', 16); for(const v of Object.values(DEPTH)) textSprite(v, '#8ff0ff', 16); for(const v of Object.values(KMB)) textSprite(v, '#0a1a24', 16); };
      try{ document.fonts.load('16px DotGothic16').then(txt, txt); }catch(e){ txt(); } },
    lit(i){ const d = lampD(i); return d === 0 ? .3 : d === 1 ? .12 : 0; },
    place(i, s, L){ const k = i % 320, sp = s.sprites, add = o => sp.push(Object.assign({ env:'aqua', k:i }, o));
      s.aqP = 1; if(s.aqD && (s.aqD1 || s.aqD2)) toTrench(s, i); else { add({ type:'wall', x:-RAIL }); add({ type:'wall', x:RAIL }); }
      if(i % LAMP === 4 && !s.aqTr){ add({ type:'pole', x:-RAIL }); add({ type:'pole', x:RAIL }); }
      if(k === UMI_K) add({ type:'umi', x:5.6 });
      if(k === SHIP_K) add({ type:'ship', x:-5.4 });
      dipScan(); },
    draw(sp, x, y, uw, fog, now, sk){ const fn = DRAW_FN[sp.type]; if(fn) fn(sp, x, y, uw, fog, now); },
    drawTunnel,
    roadFX(s, a, b, fog, f, now){ if(now !== scanNow){ scanNow = now; dipScan(); } mapCars(now); if(s.tunnel) return tunnelRoad(s, a, b, fog, now); seaRoad(s, a, b, fog, now); },
    backdrop(o){ if(!SKY) buildBay(); const { hz, now, sk } = o; setLow(sk.low); dipScan();
      const off = ((((skyPar('mid')) / PX) % P) + P) % P, sh = SH * PX;
      cx.globalCompositeOperation = 'lighter'; cx.drawImage(GLOW, off, 0, W / PX, SH, 0, hz - sh + PX, W, sh); cx.globalCompositeOperation = 'source-over';
      cx.drawImage(SKY, off, 0, W / PX, SH, 0, hz - sh + PX, W, sh);
      // aviation lights blink slowly together; the flares breathe
      const on = reduce || Math.sin(now / 600) > -.3;
      for(const [lx, ly, kind] of LIGHTS){ let sx = (lx - off) * PX; if(sx < -W) sx += P * PX; if(sx < -20 || sx > W + 20) continue; const sy = hz - sh + PX + ly * PX;
        if(kind === 'red'){ if(on){ cx.fillStyle = '#ff4a3a'; pxRect(q(sx), q(sy), PX, PX); } }
        else { const fl = reduce ? 1 : .8 + .2 * Math.sin(now / 140 + lx); cx.fillStyle = '#ffe2a0'; pxRect(q(sx), q(sy - PX), PX, PX * 2); cx.fillStyle = '#ff8a2a'; pxRect(q(sx), q(sy - PX * 3), PX, PX * 2); gl(sx, sy - PX * 2, PX * 7, '#ff7a2a', .35 * fl); } }
      // the open water to the horizon, and the far mirror (segments draw over it nearer in)
      // (below the mirror the fill is road-dark: the segment under the camera is skipped by the game and shows this through)
      cx.fillStyle = fc('#0a1d2c', 1); pxRect(0, hz, W, RH * PX); cx.fillStyle = '#131720'; pxRect(0, hz + RH * PX, W, H - hz - RH * PX);
      cx.drawImage(REF, off, 0, W / PX, RH, 0, hz, W, RH * PX);
      cx.fillStyle = 'rgba(120,150,200,.28)'; pxRect(0, hz, W, PX);
      return true; },
    overlay(al, now, sk){
      const z = (position + PZ) / SEG, i = Math.floor(z), s = segAt(position + PZ); if(!s) return; const k = kOf(i) + (z - i), hz = HZ;
      const g = s.tunnel ? clamp(Math.min(k, kLen(i) - k) / 4, 0, 1) * al : 0, under = (s.aqD1 || 0) > DP * .5;
      rumble(g > 0 && under ? g : 0, now);
      if(g > 0){
        // the tube's cold grade: a teal multiply (bluer-greener under the sea), then a faint cyan lift; a stepped vignette
        cx.globalCompositeOperation = 'multiply'; cx.globalAlpha = g * (under ? .34 : .3); cx.fillStyle = under ? '#8ad4d0' : '#9ad8e8'; pxRect(0, 0, W, H);
        cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = g * .035; cx.fillStyle = under ? '#4ae0d0' : '#5ad8ff'; pxRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over';
        cx.fillStyle = '#000810'; for(let n = 0; n < 3; n++){ const m = q(Math.min(W, H) * (.03 + n * .035)); cx.globalAlpha = g * .14; pxRect(0, 0, W, m); pxRect(0, H - m, W, m); pxRect(0, m, m, H - 2 * m); pxRect(W - m, m, m, H - 2 * m); }
        cx.globalAlpha = 1; }
      const o = (1 - g / Math.max(al, .001)) * al; if(o <= .02) return;
      // sea mist lying on the water at the horizon, in stepped bands, drifting slowly
      for(const [aa, y0, amp, sp2, thk] of [[.06, -12, 6, .004, 10], [.07, -5, 3, .007, 8], [.06, -1, 2, .011, 6]]){ cx.fillStyle = `rgba(110,140,180,${aa * o})`;
        for(let x = 0; x < W; x += PX * 4){ const n = Math.sin((x + now * sp2 * 20 + skyOff * 200) * .011) * .6 + Math.sin((x - now * sp2 * 33) * .027 + 2) * .4, top = q(hz + y0 * PX - (n + 1) * amp * PX * .5), bot = q(hz + (y0 + thk) * PX + n * PX); if(bot > top) pxRect(x, top, PX * 4, bot - top); } }
      // a dark band at the top of the frame, like the other night roads
      const bb = q(H * .05); cx.fillStyle = `rgba(4,8,20,${.24 * o})`; pxRect(0, 0, W, bb); cx.fillStyle = `rgba(4,8,20,${.12 * o})`; pxRect(0, bb, W, bb);
    }
  };
})();

// where this road's barrier is drawn, for the collider (half-road widths)
ENV.aqua.barrier = 1.18;
// inside the tube the lane lines are solid (no lane changes), drawn by the engine's lane path so they reach the far end
ENV.aqua.laneSolid = () => '#e6dcb0';
