/* Sundown environment: Minato Mirai (浜). See env/README.md for the hooks; notes in research/sundown-craft/minato.md.
   Yokohama's new waterfront, the future city rising over the black harbour: a bayside boulevard with the harbour on the right (a granite
   promenade with harbour lamps, anchor-chain bollards and strolling couples; moored ships dressed overall in bulb strings; cruise boats
   going by) and the new city on the left (glass towers with LED crowns, the red-brick warehouses glowing warm, a tower still rising with
   its crane lit red). At the heart of each visit: the Landmark Tower dominating the left, the Cosmo Clock wheel turning over the water on
   the right with its clock and coloured spokes doubled in the harbour, Queen's Square's three wave-crowned towers, the sail hotel, and
   across the water the Bay Bridge, the Marine Tower and the far shore's lights.

   References inspected at pixel zoom (Wikimedia Commons; drawn from scratch, nothing copied):
   - "Cosmo Clock 21 at night 20211225" / "...20211212-2": at night the wheel's structure is invisible; the 60 spokes ARE the light:
     thin lines, warm orange-red over most of their length with white-cyan tips at the rim, the rim a ring of short pale dashes, the hub a
     violet rosette; the clock's warm white digits sit just under the hub. -> the wheel is drawn as light lines on a native-scale pixel
     buffer, never as a scaled sprite; its colour lives on the spokes, its dark truss only shows where it crosses lit things.
   - "Yokohama Landmark Tower at night 20221211": a pale granite shaft tapering upward, horizontal ribbon windows (dark glass between pale
     spandrels, a scatter lit cool white, a few warm), two rows of sawtooth triangles at the setbacks, a crown of two pale corner piers
     with white LED bars on their outer edges round a recessed glass column, red aviation lamps on the corners. -> the hero tower:
     projected frustum faces, ribbon bands, triangle rows, the LED bars as the brightest pixels on the left side of the screen.
   - "Queen's Square Yokohama at night": three dark towers stepping down toward the sea, tops cut as a wave, each wave outlined by one
     thin white-cyan LED line, dense white ribbon windows. -> one line of light per crown, never a filled glow.
   - "Minato-mirai from Yamashita Park at night": the InterContinental is a crescent sail with a warm window grid; the red-brick
     warehouses are long, low, dark-roofed, every bay lit orange; the water doubles every light as a broken vertical column.
   - "Yokohama Red Brick Warehouse at night 20211212-2": three storeys of brick, arched bays with iron balconies all lit warm, a dark slate
     roof, stair towers at the gables; the Bay Bridge's pale H towers and its lamp row on the horizon behind.
   - "Hikawa Maru from Yokohama Marine Tower at night": a ship 'dressed overall' wears strings of warm bulbs from the bow over each mast to
     the stern, sagging between; black hull, white superstructure, red-and-black funnel bands. -> the dressed-lights rule for every
     moored ship and cruise boat (Nippon Maru gets yellow yards, as in the Landmark photo).
   - "Yokohama Bay Bridge at night 20211212": two slim floodlit H towers, a double-deck truss as one pale line with a lamp every few px.
   - "Yokohama Marine Tower at night 20221225-2": a slim lattice shaft lit violet-white with a glowing white drum near the top.
   Rules taken: cool white is the city (tower LEDs, office ribbons), warm amber is the people's waterfront (brick, harbour lamps, dressed
   bulbs), and the wheel is the only rainbow; structures stay in 2-3 dark values, lights are 1-px lines and points with the top value;
   every light on the water side is doubled in the harbour as a steady broken column; nothing flashes faster than an aviation lamp.
   Era: Minato Mirai 21 rose in the late 80s to early 90s, so one stretch is a future still being built: towers in steel with work lamps
   and tower cranes lit red. */
"use strict";
(() => {
  const P = 'mm_', KEY = 'minato', DBQ = new URLSearchParams(location.search), NO_R2 = DBQ.has('mmnor2'), NO_RB = DBQ.has('mmnorb');   // (perf switches for testing)
  const snp = v => Math.round(v / PX) * PX;
  const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const H1 = n => hash(n);
  let KI = -1; const landK = () => KI >= 0 ? KI : (KI = LANDS.findIndex(l => l.key === KEY));

  // ---------------------------------------------------------------- palette
  const C = {
    ink:'#05070e', night:'#0a1022',
    water:['#0b1a33', '#081428', '#060f20', '#040a17'],       // near the horizon (sky-lit) .. underfoot
    pave:['#3a3c4a', '#34363f', '#2c2d36', '#4a4c5a'],         // promenade granite: light slab, dark slab, joint, kerb top
    paveL:['#2e3140', '#2a2d3a', '#4e5262'],                   // the city sidewalk (cooler)
    cope:['#7a7e8e', '#565a68', '#22242e'],                    // quay coping: lit top, face, shadow
    warm:'#ffd890', warmH:'#fff2cc', amber:'#ffb050', sodium:'#ffc070',
    cool:'#e8f0ff', coolB:'#a8d0ff', led:'#f4f8ff', ledC:'#9af0ff', red:'#ff3030', redD:'#a01818',
    brick:['#3a1a16', '#5a2a20', '#7a3a26', '#9a5034'], slate:['#14141c', '#1c1e28', '#2a2c38', '#3c4050'],
    steel:['#0c0e16', '#181c28', '#283040', '#3e4a60']
  };
  // the wheel's light show: colour sets for the spokes (inner, outer tip), from the photographs: warm fans with white-cyan tips
  const WHL = { warm:['#ff5a2a', '#ff8a3a', '#ffb44a', '#ff6a8a'], tip:['#c8f4ff', '#f0fcff', '#8ae8ff'], rainbow:['#ff4a4a', '#ff9a2a', '#ffe04a', '#5aff8a', '#4ad8ff', '#8a6aff', '#ff5ad8'], hub:['#7a4aff', '#b07aff', '#4a8aff'] };

  // ---------------------------------------------------------------- fog: toward the sky's low colour, cached per step
  let fogLow = '#141a30', FCM = new Map();
  const fc = (c, f) => { let a = FCM.get(c); if(!a){ a = new Array(17); FCM.set(c, a); } const q = Math.round(clamp(f, 0, 1) * 16); return a[q] || (a[q] = mixc(c, fogLow, q / 16 * .85)); };
  /* The shared polygon guard (round 4 fix). Every quad minato.js fills goes through polyN. A polygon wholly inside the box
     [-W, 2W] x [-H, 2H] goes straight to the engine; one reaching outside it is clipped to the box exactly (Sutherland-Hodgman), never
     clamped vertex by vertex: clamping each corner on its own moved the edges, so a face passing beside the camera turned into a wedge
     across the whole screen. The clipped polygon (at most eight corners) goes out as a fan of quads. */
  const PB = new Float64Array(24), PB2 = new Float64Array(24);
  function clipBox(src, n, dst, ax, lim, sgn){ let m = 0; for(let i = 0; i < n; i++){ const j = (i + 1) % n, va = src[i * 2 + ax], vb = src[j * 2 + ax], ia = sgn * (va - lim) >= 0, ib = sgn * (vb - lim) >= 0;
      if(ia){ dst[m * 2] = src[i * 2]; dst[m * 2 + 1] = src[i * 2 + 1]; m++; } if(ia !== ib){ const t = (lim - va) / (vb - va); dst[m * 2] = src[i * 2] + (src[j * 2] - src[i * 2]) * t; dst[m * 2 + 1] = src[i * 2 + 1] + (src[j * 2 + 1] - src[i * 2 + 1]) * t; m++; } } return m; }
  function polyN(n, col){ const a = -W, b = 2 * W, c = -H, d = 2 * H; let out = false; for(let i = 0; i < n; i++){ const x = PB[i * 2], y = PB[i * 2 + 1]; if(!(x - x === 0 && y - y === 0)) return; if(!(x >= a && x <= b && y >= c && y <= d)) out = true; }
    let P = PB; if(out){ n = clipBox(PB, n, PB2, 0, a, 1); if(n < 3) return; n = clipBox(PB2, n, PB, 0, b, -1); if(n < 3) return; n = clipBox(PB, n, PB2, 1, c, 1); if(n < 3) return; n = clipBox(PB2, n, PB, 1, d, -1); if(n < 3) return; P = PB; }
    if(n === 3){ window.poly(P[0], P[1], P[2], P[3], P[4], P[5], col); return; }
    for(let k = 1; k + 2 < n; k += 2) window.poly(P[0], P[1], P[k * 2], P[k * 2 + 1], P[k * 2 + 2], P[k * 2 + 3], P[k * 2 + 4], P[k * 2 + 5], col);
    if(n % 2 === 1) window.poly(P[0], P[1], P[(n - 2) * 2], P[(n - 2) * 2 + 1], P[(n - 1) * 2], P[(n - 1) * 2 + 1], col); }
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col){ PB[0] = x1; PB[1] = y1; PB[2] = x2; PB[3] = y2; PB[4] = x3; PB[5] = y3; PB[6] = x4; PB[7] = y4; polyN(4, col); }
  // a rect; while a big object draws, one placed at a point behind the camera (PJ clamped it to the near plane) is skipped
  let OBJ_ON = false;
  function R(x, y, w, h, col){ if(OBJ_ON && PJB) return; if(!(x - x + y - y + w - w + h - h === 0)) return; cx.fillStyle = col; pxRect(x, y, w, h); }
  function pool(x, y, rx, ry, col, a){ if(rx < PX * 2 || a <= .01) return; const rgb = rgb3(col); cx.globalCompositeOperation = 'lighter';
    for(const [f, m] of [[1, .1], [.62, .16], [.32, .22]]){ const w = snp(rx * f * 2), h = Math.max(PX, snp(ry * f * 2)); cx.fillStyle = rgbaA(rgb, a * m); cx.fillRect(snp(x) - w / 2, snp(y) - h / 2, w, h); }
    cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- the visit layout: where the heart and its landmarks stand
  /* Each visit to the road (zone z, from its border B0 to the next B1) gets one heart H: the wheel's hub. Everything big is placed
     relative to it, each only if its span is clear of a fork's split window (the engine draws a branch's scenery twice there) and inside
     the visit, away from the border blends. The heart is chosen to fit the most, nearest 45% of the way along. Deterministic: it reads
     only the gates, so place(), the backdrop and the set piece agree. */
  const ITEMS = [
    // id, from, to (segments from H), x
    ['wheel', -50, 60, 10], ['landmark', -95, -55, -7.4], ['qs', 0, 130, -9], ['sail', 150, 250, 14], ['coaster', 35, 110, 21],
    ['crane1', 290, 320, -8], ['crane2', 350, 380, -11.5], ['nippon', -340, -238, 3.75], ['aka1', -560, -470, -2.3], ['aka2', -445, -355, -2.3],
    ['hikawa', 430, 600, 3.95], ['marine', 640, 660, -7] ];
  const SET_SPAN = [-280, 500];   // the set piece's needs around H (setpiece/wheel.js)
  const LAYS = new Map();
  const clearSpan = (L, a, b) => a >= L.B0 + 160 && b <= L.B1 - 140 && !inForkWindow(a, b);
  function lay(z){ const B0 = z > 0 ? gates[2 * z - 1] : 0, B1 = gates[2 * z + 1]; if(B1 === undefined) return null; const key = B0 + ':' + B1; let L = LAYS.get(key); if(L) return L;
    L = { z, B0, B1, H:-1, has:{}, set:false, ok:false };
    let best = -1e9, bh = -1;
    for(let h = B0 + 260; h <= B1 - 240; h += 10){ if(!clearSpan(L, h - 100, h + 65)) continue;
      let sc = 0; for(const it of ITEMS) if(clearSpan(L, h + it[1], h + it[2])) sc += it[0] === 'nippon' || it[0].startsWith('aka') ? 1.5 : 1;
      if(clearSpan(L, h + SET_SPAN[0], h + SET_SPAN[1])) sc += 4; sc -= Math.abs(h - (B0 + (B1 - B0) * .45)) / 300; if(sc > best){ best = sc; bh = h; } }
    if(bh >= 0){ L.H = bh; L.ok = true; for(const it of ITEMS) if(clearSpan(L, bh + it[1], bh + it[2])) L.has[it[0]] = { z0:bh + it[1], z1:bh + it[2], x:it[3] }; L.set = clearSpan(L, bh + SET_SPAN[0], bh + SET_SPAN[1]);
      if(!L.has.aka1 && !L.has.aka2 && clearSpan(L, bh + 400, bh + 490)) L.has.aka3 = { z0:bh + 400, z1:bh + 490, x:-2.3 };   // (a visit whose heart comes early has no room for the warehouses before it: they stand after it, past the cranes; never moves the heart)
      layExtras(L); }
    if(LAYS.size > 40) LAYS.clear(); LAYS.set(key, L); return L; }
  // the visit of this road that segment i belongs to (or borders, in a blend), or null
  function visitOf(i){ if(i < 0 || !gates.length) return null; const K = landK(), z = zoneOfSeg(i), top = segs.length ? zoneOfSeg(segs.length - 1) : 0;
    for(const zz of [z, z + 1, z - 1]) if(zz >= 0 && zz <= top && ROUTE[zz] !== undefined && ROUTE[zz] === K) return lay(zz);
    return null; }
  const inItem = (L, id, i, m) => { const r = L && L.has[id]; return !!r && i >= r.z0 - (m || 0) && i <= r.z1 + (m || 0); };

  // ---------------------------------------------------------------- the camera, for things too big or too far for one segment
  /* PJ(zs, X, h): a world point (segment-float zs, X half-road widths across, h half-road widths up) to the screen, exactly as the
     engine's project() would put it, but for any distance: the road's bends are accumulated the same way (x += dx; dx += curve) past the
     draw distance over the segments already built, then run straight on. Writes PJX, PJY (CSS px) and PJU (half-road width, px). */
  const NX = 1500, XA = new Float64Array(NX + 1), YA = new Float64Array(NX + 1); let CF = -1, BI = 0, CAMX = 0, CAMY = 0, CAMZ = 0, PJX = 0, PJY = 0, PJU = 0, PJZ = 0;
  function cam(){ if(CF === DRAWN) return; CF = DRAWN; NEARN = DRAW_N - EDGE_N - 3; const base = segAt(position); BI = base.index; const bp = (position % SEG) / SEG, ps = segAt(position + PZ), pp = ((position + PZ) % SEG) / SEG;
    CAMY = lerp(ps.p1.world.y, ps.p2.world.y, pp) + CAMH; CAMX = playerX * ROADW; CAMZ = position;
    let x = 0, dx = -(base.curve * bp), y = base.p1.world.y;
    for(let n = 0; n < NX; n++){ const s = segs[BI + n]; XA[n] = x; YA[n] = s ? s.p1.world.y : y; if(s){ y = s.p2.world.y; x += dx; dx += s.curve; } else x += dx; }
    XA[NX] = x; YA[NX] = y; }
  const ZNEAR = .35;   // segments in front of the camera: nearer points are clamped (faces along the road just get shorter)
  let PJB = false;   // the last PJ point lay behind the near plane (and was clamped onto it)
  function PJ(zs, X, h){ let n = zs - BI, cz = zs * SEG - CAMZ; PJB = cz < ZNEAR * SEG; if(PJB){ cz = ZNEAR * SEG; n = (CAMZ / SEG) - BI + ZNEAR; } if(n < 0) n = 0; if(n > NX - 1) n = NX - 1;
    const i = n | 0, f = n - i, xo = XA[i] + (XA[i + 1] - XA[i]) * f, wy = YA[i] + (YA[i + 1] - YA[i]) * f, sc = DEPTH / cz;
    PJX = W / 2 + sc * (xo - CAMX + X * ROADW) * W / 2; PJY = H / 2 - PITCH - sc * (wy + h * ROADW - CAMY) * H / 2; PJU = sc * ROADW * W / 2; PJZ = cz; }
  const camSeg = () => CAMZ / SEG;
  // a quad of four world points
  const QP = new Float64Array(8);
  /* wq: a world quad, clipped against the near plane before it is projected. Corners nearer than ZNEAR are cut off along the quad's own
     edges (so an end face wholly behind the camera vanishes and a face beside it ends exactly at the plane), never clamped. */
  const WQ = new Float64Array(12), WQC = new Float64Array(30);
  function wq(z1, x1, h1, z2, x2, h2, z3, x3, h3, z4, x4, h4, col){ const zn = CAMZ / SEG + ZNEAR + .001;
    if(z1 < zn || z2 < zn || z3 < zn || z4 < zn){ if(z1 < zn && z2 < zn && z3 < zn && z4 < zn) return;
      WQ[0] = z1; WQ[1] = x1; WQ[2] = h1; WQ[3] = z2; WQ[4] = x2; WQ[5] = h2; WQ[6] = z3; WQ[7] = x3; WQ[8] = h3; WQ[9] = z4; WQ[10] = x4; WQ[11] = h4; let m = 0;
      for(let i = 0; i < 4; i++){ const j = (i + 1) & 3, za = WQ[i * 3], zb = WQ[j * 3], ia = za >= zn, ib = zb >= zn;
        if(ia){ WQC[m * 3] = za; WQC[m * 3 + 1] = WQ[i * 3 + 1]; WQC[m * 3 + 2] = WQ[i * 3 + 2]; m++; }
        if(ia !== ib){ const t = (zn - za) / (zb - za); WQC[m * 3] = zn; WQC[m * 3 + 1] = WQ[i * 3 + 1] + (WQ[j * 3 + 1] - WQ[i * 3 + 1]) * t; WQC[m * 3 + 2] = WQ[i * 3 + 2] + (WQ[j * 3 + 2] - WQ[i * 3 + 2]) * t; m++; } }
      let xmn = 1e9, xmx = -1e9, ymn = 1e9, ymx = -1e9; for(let k = 0; k < m; k++){ PJ(WQC[k * 3], WQC[k * 3 + 1], WQC[k * 3 + 2]); PB[k * 2] = PJX; PB[k * 2 + 1] = PJY; if(PJX < xmn) xmn = PJX; if(PJX > xmx) xmx = PJX; if(PJY < ymn) ymn = PJY; if(PJY > ymx) ymx = PJY; }
      if(m < 3 || xmx < -PX || xmn > W + PX || ymx < -PX || ymn > H + PX) return; polyN(m, col); return; }
    PJ(z1, x1, h1); QP[0] = PJX; QP[1] = PJY; PJ(z2, x2, h2); QP[2] = PJX; QP[3] = PJY; PJ(z3, x3, h3); QP[4] = PJX; QP[5] = PJY; PJ(z4, x4, h4); QP[6] = PJX; QP[7] = PJY;
    if(Math.max(QP[0], QP[2], QP[4], QP[6]) < -PX || Math.min(QP[0], QP[2], QP[4], QP[6]) > W + PX || Math.max(QP[1], QP[3], QP[5], QP[7]) < -PX || Math.min(QP[1], QP[3], QP[5], QP[7]) > H + PX) return;
    poly(QP[0], QP[1], QP[2], QP[3], QP[4], QP[5], QP[6], QP[7], col); }

  // ---------------------------------------------------------------- a native-scale pixel buffer for lines of light (the wheel, cranes, rigging)
  /* Thin bright lines (LED spokes, crane lattice, bulb strings) are drawn pixel by pixel into one buffer the size of the canvas, then put on
     screen with one drawImage at the object's place in the depth order. They are always one canvas pixel wide whatever the distance,
     like real lights, and never a scaled sprite. The buffer's canvas is made in warm(); a resize only resizes it. */
  let RB = null, RG = null, RI = null, RU = null, RW = 0, RHh = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
  function rbOK(){ if(!RB) return false; const w = cv.width, h = cv.height; if(RW !== w || RHh !== h){ RB.width = w; RB.height = h; RW = w; RHh = h; RI = RG.createImageData(w, h); RU = new Uint32Array(RI.data.buffer); } return true; }
  const C32 = new Map();
  function c32(col, a){ a = a === undefined ? 255 : a | 0; const k = col + '|' + a; let v = C32.get(k); if(v === undefined){ const [r, g, b] = hx(col); v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; if(C32.size > 6000) C32.clear(); C32.set(k, v); } return v; }
  /* Direct mode (rbBegin(true)): for objects with few lines (crowns, cranes, rigging) the same calls draw straight to the canvas, each line
     as runs of whole pixels (one fillRect per run), which costs far less than a buffer upload. The wheel and the coaster use the buffer. */
  let DIRECT = false; const C32S = new Map();
  function rbBegin(d){ bx0 = by0 = 1e9; bx1 = by1 = -1; DIRECT = !!d; }
  const cssOf = c => { let v = C32S.get(c); if(v === undefined){ v = 'rgba(' + (c & 255) + ',' + ((c >>> 8) & 255) + ',' + ((c >>> 16) & 255) + ',' + (((c >>> 24) & 255) / 255).toFixed(3) + ')'; C32S.set(c, v); } return v; };
  function dline(x0, y0, x1, y1, c){ const adx = Math.abs(x1 - x0), ady = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, xm = adx >= -ady; let e = adx + ady, g = 4000, rx = x0, ry = y0, n = 0; cx.fillStyle = cssOf(c);
    for(;;){ n++; const done = (x0 === x1 && y0 === y1) || --g < 0, e2 = 2 * e; let nx = x0, ny = y0; if(!done){ if(e2 >= ady){ e += ady; nx += sx; } if(e2 <= adx){ e += adx; ny += sy; } }
      const brk = done || (xm ? ny !== y0 : nx !== x0); if(brk){ if(xm) cx.fillRect(Math.min(rx, x0) * PX, y0 * PX, (Math.abs(x0 - rx) + 1) * PX, PX); else cx.fillRect(x0 * PX, Math.min(ry, y0) * PX, PX, (Math.abs(y0 - ry) + 1) * PX); rx = nx; ry = ny; }
      if(done) break; x0 = nx; y0 = ny; } }
  function put(x, y, c){ if(x < 0 || y < 0 || x >= RW || y >= RHh) return; if(DIRECT){ cx.fillStyle = cssOf(c); cx.fillRect(x * PX, y * PX, PX, PX); return; } RU[y * RW + x] = c; if(x < bx0) bx0 = x; if(x > bx1) bx1 = x; if(y < by0) by0 = y; if(y > by1) by1 = y; }
  function putH(x, y, c){ if(x < 0 || y < 0 || x >= RW || y >= RHh) return; const i = y * RW + x; if(RU[i]) return; RU[i] = c; if(x < bx0) bx0 = x; if(x > bx1) bx1 = x; if(y < by0) by0 = y; if(y > by1) by1 = y; }
  // a line between two CSS-px points, clipped to the buffer; halo: also a dim pixel either side where nothing brighter is
  function line(xa, ya, xb, yb, c, halo){ let x0 = Math.floor(xa / PX), y0 = Math.floor(ya / PX), x1 = Math.floor(xb / PX), y1 = Math.floor(yb / PX);
    // Liang-Barsky against the buffer (with a margin), so a line reaching far off screen costs only its visible part
    const dx = x1 - x0, dy = y1 - y0; let t0 = 0, t1 = 1; const pp = [-dx, dx, -dy, dy], qq = [x0 + 1, RW - x0, y0 + 1, RHh - y0];
    for(let k = 0; k < 4; k++){ if(pp[k] === 0){ if(qq[k] < 0) return; continue; } const r = qq[k] / pp[k]; if(pp[k] < 0){ if(r > t1) return; if(r > t0) t0 = r; } else { if(r < t0) return; if(r < t1) t1 = r; } }
    if(t0 > 0 || t1 < 1){ const ax = x0 + t0 * dx, ay = y0 + t0 * dy; x1 = Math.round(x0 + t1 * dx); y1 = Math.round(y0 + t1 * dy); x0 = Math.round(ax); y0 = Math.round(ay); }
    if(DIRECT){ dline(x0, y0, x1, y1, c); return; }
    const adx = Math.abs(x1 - x0), ady = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = adx + ady, guard = 4000;
    const hz = adx > -ady;   // mostly horizontal: the halo goes above and below
    for(;;){ put(x0, y0, c); if(halo){ if(hz){ putH(x0, y0 - 1, halo); putH(x0, y0 + 1, halo); } else { putH(x0 - 1, y0, halo); putH(x0 + 1, y0, halo); } }
      if((x0 === x1 && y0 === y1) || --guard < 0) break; const e2 = 2 * e; if(e2 >= ady){ e += ady; x0 += sx; } if(e2 <= adx){ e += adx; y0 += sy; } } }
  function dot(x, y, c, sz){ const X = Math.floor(x / PX), Y = Math.floor(y / PX); if(DIRECT){ const z = sz || 1, o = z >> 1; cx.fillStyle = cssOf(c); cx.fillRect((X - o) * PX, (Y - o) * PX, z * PX, z * PX); return; } if(!sz || sz <= 1){ put(X, Y, c); return; } const o = sz >> 1; for(let j = 0; j < sz; j++) for(let i = 0; i < sz; i++) put(X - o + i, Y - o + j, c); }
  function rbFlush(){ if(DIRECT){ DIRECT = false; return; } if(bx1 < bx0) return; if(NO_RB){ for(let y = by0; y <= by1; y++) RU.fill(0, y * RW + bx0, y * RW + bx1 + 1); rbBegin(); return; } const w = bx1 - bx0 + 1, h = by1 - by0 + 1; RG.putImageData(RI, 0, 0, bx0, by0, w, h); cx.imageSmoothingEnabled = false; cx.drawImage(RB, bx0, by0, w, h, bx0 * PX, by0 * PX, w * PX, h * PX);
    for(let y = by0; y <= by1; y++) RU.fill(0, y * RW + bx0, y * RW + bx1 + 1); rbBegin(); }

  // ---------------------------------------------------------------- the far shore: a panorama across the harbour, and its reflection
  /* Built once at native scale (2 periods wide so a screen-wide slice never runs off its end): the Bay Bridge's two pale H towers and its
     lamp row, the Yamashita and Kannai waterfront (low city, Hotel New Grand's lit roof), the Marine Tower, Osanbashi pier's long low deck
     of lights, the Honmoku cranes with red lamps, and far-off city glow. The reflection is the panorama mirrored and sunk into the water:
     its silhouettes dark, its lights stretched into short steady vertical dashes broken by a fixed ripple. */
  const PW = 1100, SH = 52, SHR = 30; let PAN = null, REF = null;
  function buildPan(){ if(PAN) return; const w = PW * 2, c = document.createElement('canvas'); c.width = w; c.height = SH; const g = c.getContext('2d');
    const r = (x, y, ww, hh, col) => { g.fillStyle = col; for(const o of [0, PW]) g.fillRect(x + o, y, ww, hh); };
    const p = (x, y, col) => r(x, y, 1, 1, col);
    const B = SH - 1;   // the waterline row
    // far city glow and low hills of the far shore
    for(let x = 0; x < PW; x++){ const hh = 3 + Math.round(2 * Math.sin(x * .013) + 1.5 * Math.sin(x * .041 + 1) + H1(x * .7) * 1.2); r(x, B - hh, 1, hh, '#0d1426'); if(H1(x * 3.1) < .05) p(x, B - hh, '#2a3046'); }
    // low city along the shore: blocks with sparse warm and white windows
    let x = 0; while(x < PW){ const bw = 6 + (H1(x * 1.7) * 18 | 0), bh = 4 + (H1(x * 2.3) * (x > 560 && x < 760 ? 16 : 9) | 0), col = H1(x * .9) < .5 ? '#0f1628' : '#121a2e';
      if(!(x > 150 && x < 330)){ r(x, B - bh, bw, bh, col); for(let yy = B - bh + 2; yy < B - 1; yy += 2) for(let xx = x + 1; xx < x + bw - 1; xx += 2){ const hv = H1(xx * 13.1 + yy * 7.7); if(hv < .16) p(xx, yy, hv < .05 ? '#ffd890' : hv < .1 ? '#e8f0ff' : '#ffb860'); } }
      x += bw + (H1(x * 5.3) * 4 | 0); }
    // the Bay Bridge (x 150..330): two pale H towers, the double deck as a pale truss line with lamps, fans of cable in a dim line
    { const t1 = 182, t2 = 298, dy = B - 9, th = 27;
      r(140, dy, 200, 1, '#8a96b4'); r(140, dy + 2, 200, 1, '#5a6684'); for(let k = 140; k < 340; k += 3) r(k, dy + 1, 1, 1, '#3a4664');
      for(let k = 142; k < 340; k += 5) p(k, dy - 1, H1(k) < .5 ? '#fff0c8' : '#ffd890');
      for(const tx of [t1, t2]){ r(tx - 3, dy - th + 9, 1, th + 2, '#c8d4ea'); r(tx + 3, dy - th + 9, 1, th + 2, '#c8d4ea'); r(tx - 3, dy - th + 9, 7, 1, '#e8f0ff'); r(tx - 3, dy - 3, 7, 1, '#aab6d0'); r(tx - 2, dy - th + 10, 1, th, '#8894b2');
        r(tx - 3, B - 9, 1, 9, '#6a7694'); r(tx + 3, B - 9, 1, 9, '#6a7694'); p(tx - 3, dy - th + 8, '#ff3030'); p(tx + 3, dy - th + 8, '#ff3030');
        for(let k = 1; k <= 7; k++){ const L = k * 6; for(let s = 0; s < L; s += 2){ const yy = dy - th + 10 + Math.round(s * (th - 10) / L); p(tx - 4 - s, yy, '#2e3a58'); p(tx + 4 + s, yy, '#2e3a58'); } } }
      for(let k = 150; k < 330; k += 30) r(k, dy + 3, 1, B - dy - 3, '#26304a'); }
    // Osanbashi pier (x 380..520): a long low deck at the waterline with a row of white lamps and a whale-back terminal
    { r(380, B - 2, 140, 2, '#1c2438'); r(392, B - 4, 110, 2, '#222c42'); for(let k = 382; k < 518; k += 4) p(k, B - 3, '#e8f0ff'); for(let k = 396; k < 500; k += 6) p(k, B - 5, '#a8c0e8'); }
    // Hotel New Grand and the Kannai towers (x 560..760): taller blocks with lit crowns
    { r(600, B - 14, 22, 14, '#141c30'); r(600, B - 15, 22, 1, '#3a2a20'); for(let k = 602; k < 620; k += 3) p(k, B - 15, '#ffb860'); r(640, B - 21, 9, 21, '#101828'); r(640, B - 21, 9, 1, '#9af0ff'); r(700, B - 18, 12, 18, '#121a2c'); }
    // the Marine Tower (x 668): a slim lattice shaft lit violet-white, a glowing drum near the top, a red beacon
    { const mx = 668; for(let yy = B - 30; yy < B; yy++){ const hw = yy > B - 8 ? 2 : 1; r(mx - hw, yy, 1, 1, '#9a8ad8'); r(mx + hw, yy, 1, 1, '#9a8ad8'); if(yy % 3 === 0) r(mx - hw, yy, hw * 2 + 1, 1, '#6a5ab0'); }
      r(mx - 3, B - 34, 7, 4, '#e8eaff'); r(mx - 2, B - 35, 5, 1, '#b8c0f0'); r(mx, B - 37, 1, 2, '#7a7ab0'); p(mx, B - 38, '#ff3030'); }
    // Honmoku cranes (x 840..1000): gantry cranes in dim silhouette with red lamps on the booms
    for(let k = 0; k < 5; k++){ const cxp = 850 + k * 34, hh = 13 + (k % 2) * 3; r(cxp, B - hh, 1, hh, '#1c2234'); r(cxp + 6, B - hh, 1, hh, '#1c2234'); r(cxp - 6, B - hh - 2, 19, 1, '#232a40'); r(cxp + 2, B - hh - 6, 1, 4, '#1c2234'); p(cxp - 6, B - hh - 3, '#ff3030'); p(cxp + 12, B - hh - 3, '#c02020'); }
    // a few far towers with aviation lamps on the right of the period, wrapping back to the bridge
    for(const [tx, th] of [[1020, 16], [1046, 22], [1072, 12]]){ r(tx, B - th, 7, th, '#0e1628'); p(tx + 3, B - th - 1, '#ff3030'); for(let yy = B - th + 2; yy < B - 1; yy += 2) if(H1(tx + yy) < .4) p(tx + 1 + (yy % 5), yy, '#cfe0ff'); }
    // the waterline: one faint pale row where the far shore meets the water
    r(0, B, PW, 1, '#1a2640');
    PAN = c;
    // the reflection: silhouettes mirrored and sunk, lights as short steady dashes (2..5 rows), every other row shifted by a fixed ripple
    const rc = document.createElement('canvas'); rc.width = w; rc.height = SHR; const rg = rc.getContext('2d'), src = g.getImageData(0, 0, w, SH).data, img = rg.createImageData(w, SHR), d = img.data;
    for(let y = 0; y < SHR; y++){ const sy = B - y, sh = ((y >> 1) % 3 === 1 ? 1 : (y >> 1) % 3 === 2 ? -1 : 0) * (y > 3 ? 1 : 0);
      for(let xx = 0; xx < w; xx++){ const sx = Math.min(w - 1, Math.max(0, xx + sh)), i = (sy * w + sx) * 4; if(sy < 0 || !src[i + 3]) continue; const R0 = src[i], G0 = src[i + 1], B0 = src[i + 2], lum = (R0 + G0 + B0) / 3, o = (y * w + xx) * 4;
        if(lum > 110){ if(y > 2 + (H1(sx * 7.3) * 6 | 0)) continue; d[o] = R0 * .62; d[o + 1] = G0 * .62; d[o + 2] = B0 * .68; d[o + 3] = 255; }
        else if(y < 12){ d[o] = R0 * .55; d[o + 1] = G0 * .6; d[o + 2] = B0 * .7 + 6; d[o + 3] = 255; } } }
    rg.putImageData(img, 0, 0); REF = rc; }

  // ---------------------------------------------------------------- the road surface: promenade, quay and harbour on the right, the city's sidewalk on the left
  const KB = 1.14, QX = 2.5, SWL = 1.95;   // promenade starts (right), quay edge (right), sidewalk ends (left)
  const QXR = new Float32Array(1024); let QXF = -1;   // per canvas row this frame: the quay edge's screen x (water lies to its right), W if none
  function qxReset(){ if(QXF === DRAWN) return; QXF = DRAWN; QXR.fill(-1e4); }   // rows above the drawn road are the far water band (all water)
  const ripple = (i, now) => reduce ? 0 : Math.sin(now / 900 + i * .7);
  function roadFX(s, a, b, fog, f, now){ const ay = a.y, by = b.y - 1, i = s.index; if(ay - by < .5) return; qxReset();
    const F = c => fc(c, fog), lit = s.lit || 0, slab = Math.floor(i / 4) % 2;
    // the harbour: from the quay edge to the screen's edge, then the far shore doubled in it near the horizon
    const Q1 = s.mmQ || QX, sn = segs[i + 1], Q2 = sn && sn.mmQ || Q1, qa = a.x + a.w * Q1, qb = b.x + b.w * Q2;
    if(qb < W + PX || qa < W + PX){ const wc = fog > .66 ? C.water[0] : fog > .33 ? C.water[1] : fog > .12 ? C.water[2] : C.water[3]; poly(qa, ay, W + 2, ay, W + 2, by, qb, by, F(wc));
      { const r0 = Math.max(0, Math.round(by / PX)), r1 = Math.min(QXR.length - 1, Math.round(ay / PX)); for(let r = r0; r <= r1; r++){ const t = (ay - r * PX) / Math.max(1, ay - by); QXR[r] = qa + (qb - qa) * clamp(t, 0, 1); } }
      if(REF){ const ry0 = b.y - HZ; if(ry0 >= 0 && ry0 < SHR * PX){ const off = (((skyPar('mid') / PX) % PW) + PW) % PW, sy = Math.floor(ry0 / PX), shh = Math.min(SHR - sy, Math.max(1, Math.round((ay - by) / PX))), L = Math.max(0, Math.max(qa, qb));
          if(L < W && shh > 0) cx.drawImage(REF, off + L / PX, sy, (W - L) / PX, shh, snp(L), snp(b.y), W - snp(L), shh * PX); } }
      // near water: sparse ripple dashes catching the sky, easing between two hashed states (never re-rolled per frame)
      if(fog < .5 && i % 2 === 0){ const ph = reduce ? 0 : now / 1700 + H1(i * 1.3), p0 = Math.floor(ph), fe = sm(ph - p0); cx.fillStyle = F('#1c2c4e');
        for(let k = 0; k < 3; k++){ const hv = lerp(H1(i * 3.7 + k + p0 * .37), H1(i * 3.7 + k + (p0 + 1) * .37), fe); if(hv < .35) continue; const xx = a.x + a.w * (Q1 + .4 + H1(i * 7.1 + k) * 7), ww = snp(a.w * (.12 + hv * .3)); if(xx > W) continue; cx.fillRect(snp(xx), snp(by), Math.max(PX, ww), PX); } }
      // the moon's path on the water: steady glints under the moon, world-anchored
      if(fog > .04 && fog < .9 && MOON.t < .97 && i % 2 === 1){ const mx = MOON.x + (H1(i * 2.9) - .5) * a.w * .5; if(mx > Math.max(qa, qb)){ const ww = snp(a.w * (.05 + H1(i * 5.3) * .1) + PX); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = rgbaA('230,224,200', .2 * (1 - fog * .6) * (1 - MOON.t * .7)); cx.fillRect(snp(mx - ww / 2), snp(by), ww, PX); cx.globalCompositeOperation = 'source-over'; } } }
    // the quay coping: a pale granite lip, its face, a dark shadow line on the water
    { const cw1 = a.w * .07, cw2 = b.w * .07; poly(qa - cw1, ay, qa, ay, qb, by, qb - cw2, by, F(s.mmTg ? (i % 2 ? '#c8a020' : '#18181e') : lit > .3 ? '#8a8e9c' : C.cope[0])); if(a.w > 30) poly(qa, ay, qa + a.w * .025, ay, qb + b.w * .025, by, qb, by, F(C.cope[2])); }
    shoreFX(s, a, b, fog, now, qa, qb, Q1, Q2, ay, by, F);
    // the promenade: granite slabs in two tones every 4 segments, a darker band of setts along the road, lamp pools warming it
    { const lc = mixc(slab ? C.pave[0] : C.pave[1], '#6a5030', lit * .45), x1a = a.x + a.w * KB, x1b = b.x + b.w * KB;
      poly(a.x + a.w * 1.02, ay, x1a, ay, x1b, by, b.x + b.w * 1.02, by, F(C.pave[3]));
      poly(x1a, ay, qa - a.w * .07, ay, qb - b.w * .07, by, x1b, by, F(lc));
      if(fog < .5){ const sa = a.x + a.w * 1.36, sb = b.x + b.w * 1.36; poly(x1a, ay, sa, ay, sb, by, x1b, by, F(mixc('#2a2b34', '#5a4428', lit * .4)));
        if(a.w > 18 && i % 2 === 0){ const ja = a.w * .012; poly(sa, ay, qa - a.w * .07, ay, qa - a.w * .07, ay - Math.max(PX * .5, ja), sa, ay - Math.max(PX * .5, ja), F(C.pave[2])); } } }
    // the city side: kerb, a pale sidewalk of granite slabs, a dark planting strip at the building line
    { const lc = mixc(slab ? C.paveL[0] : C.paveL[1], '#5a5a6a', lit * .25), xa = a.x - a.w * KB, xb = b.x - b.w * KB, ea = a.x - a.w * SWL, eb = b.x - b.w * SWL;
      poly(a.x - a.w * 1.02, ay, xa, ay, xb, by, b.x - b.w * 1.02, by, F(C.pave[3]));
      poly(ea, ay, xa, ay, xb, by, eb, by, F(lc));
      if(fog < .6) poly(a.x - a.w * (SWL + .14), ay, ea, ay, eb, by, b.x - b.w * (SWL + .14), by, F('#0c1414')); }
    // the headlight: a soft warm pool ahead of the bike, in hard steps
    if(ay > H * .62){ const lv = ay > H * .8 ? .07 : ay > H * .7 ? .05 : .03, wa = a.w * .42, wb = b.w * .42; cx.globalCompositeOperation = 'lighter'; poly(W / 2 - wa, ay, W / 2 + wa, ay, W / 2 + wb, b.y, W / 2 - wb, b.y, rgbaA('255,236,206', lv)); cx.globalCompositeOperation = 'source-over'; } }

  // ---------------------------------------------------------------- the shoreline in the road surface: the seawall face, the lapping water
  function shoreFX(s, a, b, fog, now, qa, qb, Q1, Q2, ay, by, F){ const i = s.index; if(qa > W + PX && qb > W + PX) return;
    // the seawall's face, where the edge steps outward with distance and so faces the camera: concrete, the dark wet band, the pale tide line, weed at the water
    if(Q2 > Q1 + .004 && a.w > 6){ const d = .26, ya2 = ay + a.w * d, yb2 = by + b.w * d, wa = ay + a.w * d * .42, wb = by + b.w * d * .42, ga = ay + a.w * d * .8, gb = by + b.w * d * .8;
      poly(qa, ay, qb, by, qb, yb2, qa, ya2, F('#3a3e48')); poly(qa, wa, qb, wb, qb, yb2, qa, ya2, F('#1c2028')); poly(qa, wa - PX, qb, wb - PX, qb, wb, qa, wa, F('#6e7466')); poly(qa, ga, qb, gb, qb, yb2, qa, ya2, F('#1e2a24')); }
    // the water lapping at the foot of the wall: a faint line just off the coping's shadow, its dashes easing between hashed states (steady under reduced motion)
    if(fog < .55 && a.w > 10){ const ph = reduce ? 0 : now / 2100 + H1(i * .91), p0 = Math.floor(ph), fe = sm(ph - p0), hv = lerp(H1(i * 5.1 + p0 * .3), H1(i * 5.1 + (p0 + 1) * .3), fe);
      if(hv > .3){ const o1 = a.w * .045, o2 = b.w * .045, w1 = Math.max(PX, a.w * .018), w2 = Math.max(PX, b.w * .018); poly(qa + o1, ay, qb + o2, by, qb + o2 + w2, by, qa + o1 + w1, ay, F(hv > .7 ? '#3a4e70' : '#26385a')); } }
  }

  // ---------------------------------------------------------------- the big objects of a visit
  /* Each is a run of segments [z0, z1] across at x. It is drawn whole, once a frame, through PJ: from the backdrop while its far end is
     beyond NEARN (so it rises out of the distance with the skyline, long before the draw distance), then from a marker sprite on its run:
     the farthest marker in range, so everything nearer the camera (the street, trees, lamps, ships) draws over it. Its reflection in the
     harbour is drawn into a second buffer in the backdrop phase and laid on the water row by row as the road is drawn (roadFX), so it
     only ever shows on water, under everything standing in front. */
  let NEARN = 321; const FAR_N = 1260;   // NEARN: set from the engine in cam() (DRAW_N is defined after the env files load)
  function objsOf(L){ if(L.objs) return L.objs; const O = []; if(L.ok){ const h = L.has, Hh = L.H;
      const add = (id, kind, z0, z1, x, ex) => O.push(Object.assign({ id, kind, z0, z1, x, L, f:-1 }, ex || {}));
      if(h.aka1) add('aka1', 'aka', Hh - 560, Hh - 470, -2.35, { sd:1 });
      if(h.aka2) add('aka2', 'aka', Hh - 445, Hh - 355, -2.35, { sd:1 });
      if(h.aka3) add('aka3', 'aka', h.aka3.z0, h.aka3.z1, -2.35, { sd:1 });
      if(h.nippon) add('nippon', 'ship', Hh - 338, Hh - 240, 3.75, { ship:'nippon' });
      if(h.landmark) add('landmark', 'landmark', Hh - 95, Hh - 55, -7.4);
      if(h.wheel) add('wheel', 'wheel', Hh - 50, Hh + 50, 10, { hz:Hh });
      if(h.qs){ add('qs1', 'qs', Hh + 2, Hh + 28, -7.6, { ht:17.4, ph:0 }); add('qs2', 'qs', Hh + 46, Hh + 70, -9.8, { ht:14, ph:1.3, px:-7.6, pz:Hh + 28 }); add('qs3', 'qs', Hh + 88, Hh + 108, -12, { ht:11, ph:2.4, px:-9.8, pz:Hh + 70 }); }
      if(h.coaster) add('coaster', 'coaster', Hh + 38, Hh + 108, 21.5);
      if(h.sail) add('sail', 'sail', Hh + 150, Hh + 235, 14.2);
      if(h.crane1) add('crane1', 'rising', Hh + 290, Hh + 318, -8.2, { ht:12.5, top:.62, cr:0 });
      if(h.crane2) add('crane2', 'rising', Hh + 350, Hh + 376, -11.6, { ht:16, top:.46, cr:1 });
      if(h.hikawa) add('hikawa', 'ship', Hh + 432, Hh + 598, 4.0, { ship:'hikawa' });
      if(h.marine) add('marine', 'marine', Hh + 644, Hh + 656, -7.2);
      if(L.pier) add('pier', 'pier', L.pier.z0, L.pier.z1, L.pier.x, { gz:L.pier.gz });
      if(L.moor) L.moor.forEach((b, k) => add('moor' + k, 'moor', b.z0, b.z1, b.kind === 'yakata' ? YK.x : WK.x, { sub:b.kind })); }
    return L.objs = O; }
  // the objects of every visit of this road within reach of the camera this frame, far to near
  const OBJ = []; let OBJF = -1;
  function objsNow(){ if(OBJF === DRAWN) return OBJ; OBJF = DRAWN; OBJ.length = 0; if(!gates.length) return OBJ; const K = landK(), z0 = zoneOfSeg(BI), top = segs.length ? zoneOfSeg(segs.length - 1) : 0;
    for(let z = Math.max(0, z0 - 1); z <= z0 + 2 && z <= top; z++){ if(ROUTE[z] !== K) continue; if(z > 0 && isForkZone(z - 1) && gatesHit < 2 * (z - 1) + 1) continue;   // (a road not yet chosen at its fork shows nothing)
      const L = lay(z); if(!L) continue; for(const o of objsOf(L)) if(o.z1 > BI - 2 && o.z0 < BI + FAR_N) OBJ.push(o); }
    OBJ.sort((a, b) => b.z1 - a.z1); return OBJ; }
  const objFog = o => { const n = Math.max(0, o.z1 - camSeg()); return n < DRAW_N ? Math.pow(n / DRAW_N, 1.6) * .55 : clamp(.55 + (n - DRAW_N) / (FAR_N - DRAW_N) * .3, 0, .85); };
  const objFade = o => { const n = o.z0 - camSeg(); return clamp((FAR_N - n) / 220, 0, 1); };

  // ---- the reflection layer (a second pixel buffer)
  let RB2 = null, RG2 = null, RI2 = null, RU2 = null, rx0 = 1e9, ry0 = 1e9, rx1 = -1, ry1 = -1, R2F = -1, R2PUT = -1;
  function rb2OK(){ if(!RB2) return false; const w = cv.width, h = cv.height; if(RB2.width !== w || RB2.height !== h){ RB2.width = w; RB2.height = h; RI2 = RG2.createImageData(w, h); RU2 = new Uint32Array(RI2.data.buffer); rx0 = ry0 = 1e9; rx1 = ry1 = -1; } return !!RU2; }
  function r2Clear(){ if(R2F === DRAWN) return; R2F = DRAWN; if(!rb2OK()) return; if(rx1 >= rx0) for(let y = ry0; y <= ry1; y++) RU2.fill(0, y * RW + rx0, y * RW + rx1 + 1); rx0 = ry0 = 1e9; rx1 = ry1 = -1; }
  let RIPT = 0;
  function rput(x, y, c){ if(y < 0 || y >= RHh) return; const hz = HZ / PX, d = y - hz; if(d < 1) return; if(!reduce && d > 2) x += Math.round(Math.sin(y * .9 + RIPT) * Math.min(2.4, d / 26)); if(x < 0 || x >= RW) return; if(y % 3 === 2 && d > 4) return;
    RU2[y * RW + x] = c; if(y + 1 < RHh && (y + 1) % 3 !== 2) RU2[(y + 1) * RW + x] = c; if(x < rx0) rx0 = x; if(x > rx1) rx1 = x; if(y < ry0) ry0 = y; if(y + 1 > ry1) ry1 = Math.min(RHh - 1, y + 1); }   // (each reflected pixel is stretched a row down: light on water smears vertically)
  function rline(xa, ya, xb, yb, c){ let x0 = Math.floor(xa / PX), y0 = Math.floor(ya / PX), x1 = Math.floor(xb / PX), y1 = Math.floor(yb / PX);
    const dx = x1 - x0, dy = y1 - y0; let t0 = 0, t1 = 1; const pp = [-dx, dx, -dy, dy], qq = [x0 + 1, RW - x0, y0 + 1, RHh - y0];
    for(let k = 0; k < 4; k++){ if(pp[k] === 0){ if(qq[k] < 0) return; continue; } const r = qq[k] / pp[k]; if(pp[k] < 0){ if(r > t1) return; if(r > t0) t0 = r; } else { if(r < t0) return; if(r < t1) t1 = r; } }
    if(t0 > 0 || t1 < 1){ const ax = x0 + t0 * dx, ay = y0 + t0 * dy; x1 = Math.round(x0 + t1 * dx); y1 = Math.round(y0 + t1 * dy); x0 = Math.round(ax); y0 = Math.round(ay); }
    const adx = Math.abs(x1 - x0), ady = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = adx + ady, g = 3000;
    for(;;){ rput(x0, y0, c); if((x0 === x1 && y0 === y1) || --g < 0) break; const e2 = 2 * e; if(e2 >= ady){ e += ady; x0 += sx; } if(e2 <= adx){ e += adx; y0 += sy; } } }
  // a shimmering column of light down the water from a reflected point: broken dashes, brighter near their head, rippled with the rest
  // (both refuse a point behind the camera or off the buffer's sides, and walk only the rows that fall inside the buffer)
  function rcol(x, y, len, c, c2){ if(PJB || !(x > -PX * 3 && x < RW * PX + PX * 3) || !(y === y) || !(len === len)) return; const X = Math.floor(x / PX), Y = Math.floor(y / PX), n = Math.round(len / PX); for(let k = Math.max(0, (Math.ceil(-Y / 2)) * 2), ke = Math.min(n, RHh - Y); k < ke; k += 2){ if(((k >> 1) + (X & 1)) % 3 === 2) continue; rput(X, Y + k, k < n * .4 ? c : c2); } }
  function rdot(x, y, c, len){ if(PJB || !(x > -PX * 3 && x < RW * PX + PX * 3) || !(y === y)) return; const X = Math.floor(x / PX), Y = Math.floor(y / PX); for(let k = Math.max(0, -Y), ke = Math.min(len || 1, RHh - Y); k < ke; k++) rput(X, Y + k, c); }
  // put the reflection buffer on the canvas once, lazily (the set piece may add to it after the backdrop); then blit rows of it
  function r2Put(){ if(R2PUT === DRAWN) return; R2PUT = DRAWN; if(rx1 >= rx0) RG2.putImageData(RI2, 0, 0, rx0, ry0, rx1 - rx0 + 1, ry1 - ry0 + 1); }
  function r2Rows(yTop, yBot, xL){ if(!RB2 || rx1 < rx0 || NO_R2) return; r2Put(); const r0 = Math.max(ry0, Math.floor(yTop / PX)), r1 = Math.min(ry1, Math.ceil(yBot / PX) - 1); if(r1 < r0) return;
    const cL = Math.max(rx0, Math.ceil(xL / PX)); if(cL > rx1) return; cx.imageSmoothingEnabled = false; cx.drawImage(RB2, cL, r0, rx1 - cL + 1, r1 - r0 + 1, cL * PX, r0 * PX, (rx1 - cL + 1) * PX, (r1 - r0 + 1) * PX); }
  let FARY = 1e9, FARF = -1, FYF = -1;

  // ---------------------------------------------------------------- the Landmark Tower
  const LM = { Ht:30, Hs:24.6, b0:2.1, b1:1.36, floor:.66 };
  function drawLandmark(o, now){ const gf = objFog(o), F = c => fc(c, gf), xc = o.x, sd = xc < 0 ? 1 : -1, z0 = o.z0, z1 = o.z1, Ht = LM.Ht, Hs = LM.Hs;
    const bh = h => LM.b0 + (LM.b1 - LM.b0) * h / Ht, zf = h => z0 + (LM.b0 - bh(h)) * 10, zb = h => z1 - (LM.b0 - bh(h)) * 10, xs = h => xc + sd * bh(h);
    if(zf(0) < camSeg() + .5) return;   // the front face is behind: it has passed
    PJ((z0 + z1) / 2, xc, Ht * .5); const u = PJU, near = u > PX * 1.2;
    // the podium: a long low glass hall round the foot, lit warm
    const px = xc + sd * 3.1;
    wq(z0 - 14, px, 0, z1 + 10, px, 0, z1 + 10, px, 1.7, z0 - 14, px, 1.7, F('#1a1e2c'));
    wq(z0 - 14, xc - sd * 3.1, 0, z0 - 14, px, 0, z0 - 14, px, 1.7, z0 - 14, xc - sd * 3.1, 1.7, F('#20263a'));
    if(near){ wq(z0 - 12, px, .25, z1 + 8, px, .25, z1 + 8, px, 1.05, z0 - 12, px, 1.05, F('#6a5438')); wq(z0 - 14, xc - sd * 2.8, .25, z0 - 14, px - sd * .3, .25, z0 - 14, px - sd * .3, 1.05, z0 - 14, xc - sd * 2.8, 1.05, F('#7a6040'));
      wq(z0 - 12, px, 1.5, z1 + 8, px, 1.5, z1 + 8, px, 1.7, z0 - 12, px, 1.7, F('#3a4258')); }
    // the shaft: front and road-side faces, pale granite
    const fFront = F('#7a8296'), fSide = F('#636b80'), fBand = F('#1a2232'), fPale = F('#a6aec2');
    wq(zf(0), xc - LM.b0, 0, zf(0), xc + LM.b0, 0, zf(Hs), xc + bh(Hs), Hs, zf(Hs), xc - bh(Hs), Hs, fFront);
    wq(zf(0), xs(0), 0, zb(0), xs(0), 0, zb(Hs), xs(Hs), Hs, zf(Hs), xs(Hs), Hs, fSide);
    // ribbon windows: dark bands between pale spandrels (fewer and darker where they would be under two pixels apart)
    const pitch = LM.floor * u, stride = pitch >= PX * 2.2 ? 1 : pitch >= PX * 1.1 ? 2 : 0;
    if(stride){ for(let k = 0, h0 = 1.5; h0 < Hs - .4; k++, h0 += LM.floor){ if(k % stride) continue; if((h0 > 8.4 && h0 < 9.9) || (h0 > 17.6 && h0 < 19.1)) continue; const h1 = h0 + .3 * stride, e = .1;
        wq(zf(h0), xc - bh(h0) + e, h0, zf(h0), xc + bh(h0) - e, h0, zf(h1), xc + bh(h1) - e, h1, zf(h1), xc - bh(h1) + e, h1, fBand);
        wq(zf(h0) + e * 10, xs(h0), h0, zb(h0) - e * 10, xs(h0), h0, zb(h1) - e * 10, xs(h1), h1, zf(h1) + e * 10, xs(h1), h1, fBand);
        // lit windows on the band: cool white office light, a few warm
        if(stride === 1 && pitch > PX * 3){ const NC = 16; for(let c = 0; c < NC; c++){ const hv = H1(z0 * .13 + k * 31.7 + c * 7.3); if(hv > .23) continue; const col = F(hv < .05 ? C.warm : hv < .16 ? '#d8e6ff' : '#9ab4dc'), fr = (c + .5) / NC;
            PJ(zf(h0), xc - bh(h0) + 2 * bh(h0) * fr, h0 + .15); const wx = PJX, wy = PJY; R(wx - u * .09, wy - u * .12, Math.max(PX, u * .17), Math.max(PX, u * .2), col);
            const za = lerp(zf(h0) + 1, zb(h0) - 1, fr), zb2 = lerp(zf(h0) + 1, zb(h0) - 1, fr + .6 / NC); PJ(za, xs(h0), h0 + .15); const x1 = PJX, y1 = PJY; PJ(zb2, xs(h0), h0 + .15); if(Math.abs(PJX - x1) >= PX * .5) R(Math.min(x1, PJX), y1 - u * .12, Math.max(PX, Math.abs(PJX - x1)), Math.max(PX, u * .2), col); } } } }
    else { const avg = F('#4a5266'); wq(zf(1.5), xc - LM.b0 + .1, 1.5, zf(1.5), xc + LM.b0 - .1, 1.5, zf(Hs), xc + bh(Hs) - .1, Hs, zf(Hs), xc - bh(Hs) + .1, Hs, avg); wq(zf(1.5) + 1, xs(1.5), 1.5, zb(1.5) - 1, xs(1.5), 1.5, zb(Hs) - 1, xs(Hs), Hs, zf(Hs) + 1, xs(Hs), Hs, F('#3e465a')); }
    // the setback rows of sawtooth triangles: a dark band with pale triangles standing in it
    for(const hb of [8.5, 17.7]){ const ht = hb + 1.3; wq(zf(hb), xc - bh(hb), hb, zf(hb), xc + bh(hb), hb, zf(ht), xc + bh(ht), ht, zf(ht), xc - bh(ht), ht, fBand); wq(zf(hb), xs(hb), hb, zb(hb), xs(hb), hb, zb(ht), xs(ht), ht, zf(ht), xs(ht), ht, fBand);
      if(u > PX * .8) for(let k = 0; k < 4; k++){ const f0 = .08 + k * .23, f1 = f0 + .19, fm = (f0 + f1) / 2;
        PJ(zf(hb), xc - bh(hb) + 2 * bh(hb) * f0, hb + .05); const ax = PJX, ay = PJY; PJ(zf(hb), xc - bh(hb) + 2 * bh(hb) * f1, hb + .05); const bx = PJX, by = PJY; PJ(zf(ht), xc - bh(ht) + 2 * bh(ht) * fm, ht - .1); pxPoly(ax, ay, bx, by, PJX, PJY, fPale);
        PJ(lerp(zf(hb), zb(hb), f0), xs(hb), hb + .05); const cx1 = PJX, cy1 = PJY; PJ(lerp(zf(hb), zb(hb), f1), xs(hb), hb + .05); const dx1 = PJX, dy1 = PJY; PJ(lerp(zf(ht), zb(ht), fm), xs(ht), ht - .1); pxPoly(cx1, cy1, dx1, dy1, PJX, PJY, F('#8a92a6')); } }
    // the corner pilaster catches the light
    if(u > PX * .5){ const e = .07; wq(zf(0), xs(0) - sd * e, 0, zf(0) + .5, xs(0), 0, zf(Hs) + .5, xs(Hs), Hs, zf(Hs), xs(Hs) - sd * e, Hs, fPale); }
    // the crown: two pale corner piers each side of a recessed glass column, the sky garden's warm band, LED bars on the outer edges
    const hc = Hs, ht = Ht, rcs = .42;
    wq(zf(hc), xc - bh(hc), hc, zf(hc), xc - bh(hc) * rcs, hc, zf(ht), xc - bh(ht) * rcs, ht, zf(ht), xc - bh(ht), ht, fFront);
    wq(zf(hc), xc + bh(hc) * rcs, hc, zf(hc), xc + bh(hc), hc, zf(ht), xc + bh(ht), ht, zf(ht), xc + bh(ht) * rcs, ht, fFront);
    wq(zf(hc) + 3, xc - bh(hc) * rcs, hc, zf(hc) + 3, xc + bh(hc) * rcs, hc, zf(ht) + 3, xc + bh(ht) * rcs, ht - .6, zf(ht) + 3, xc - bh(ht) * rcs, ht - .6, F('#0e1626'));
    { const za = zf(hc), zz = zb(hc), zm1 = lerp(za, zz, 1 - rcs) * .5 + za * .5, zm2 = zz - (zm1 - za); wq(za, xs(hc), hc, zm1, xs(hc), hc, zm1, xs(ht), ht, za, xs(ht), ht, fSide); wq(zm2, xs(hc), hc, zz, xs(hc), hc, zz, xs(ht), ht, zm2, xs(ht), ht, fSide);
      wq(zm1, xs(hc) - sd * .3, hc, zm2, xs(hc) - sd * .3, hc, zm2, xs(ht) - sd * .3, ht - .6, zm1, xs(ht) - sd * .3, ht - .6, F('#0c1424'));
      if(u > PX * .45){ for(let k = 0; k < 7; k++){ const hh = hc + .5 + k * .62; if(hh > ht - 1) break; for(let c = 0; c < 6; c++){ const hv = H1(k * 9.1 + c * 3.7 + z0); if(hv > .45) continue; const col = F(hv < .2 ? C.warm : '#c8d8f4'); PJ(zf(hh) + 3, xc - bh(hh) * rcs + bh(hh) * rcs * 2 * (c + .5) / 6, hh); R(PJX - u * .06, PJY - u * .1, Math.max(PX, u * .12), Math.max(PX, u * .14), col); } }
        // the sky garden (the 69th-floor deck) as a warm band
        wq(zf(27.2) + 3, xc - bh(27.2) * rcs, 27.2, zf(27.2) + 3, xc + bh(27.2) * rcs, 27.2, zf(27.6) + 3, xc + bh(27.6) * rcs, 27.6, zf(27.6) + 3, xc - bh(27.6) * rcs, 27.6, fc(C.warm, gf * .5));
        wq(zm1, xs(27.2) - sd * .3, 27.2, zm2, xs(27.2) - sd * .3, 27.2, zm2, xs(27.6) - sd * .3, 27.6, zm1, xs(27.6) - sd * .3, 27.6, fc('#e8b878', gf * .5)); } }
    // the LED bars: the brightest thing on the city side, a vertical white line on each outer pier edge (and their soft spill)
    { const la = clamp(1.4 - gf * 1.2, .5, 1);
      for(const q of [-1, 1]){ PJ(zf(hc + .3), xc + q * bh(hc + .3) * .94, hc + .3); const xa = PJX, ya = PJY; PJ(zf(ht - .2), xc + q * bh(ht - .2) * .94, ht - .2); const wb = Math.max(PX, snp(u * .07));
        cx.globalAlpha = la * cx.globalAlpha; poly(xa - wb / 2, ya, xa + wb / 2, ya, PJX + wb / 2, PJY, PJX - wb / 2, PJY, C.led); cx.globalAlpha = cx.globalAlpha / la;
        if(u > PX * .6){ cx.globalCompositeOperation = 'lighter'; poly(xa - wb * 2.5, ya, xa + wb * 2.5, ya, PJX + wb * 2.5, PJY, PJX - wb * 2.5, PJY, rgbaA('190,210,255', .1 * la)); cx.globalCompositeOperation = 'source-over'; } }
      { PJ(zb(hc + .3) - .3, xs(hc + .3), hc + .3); const xa = PJX, ya = PJY; PJ(zb(ht - .2) - .3, xs(ht - .2), ht - .2); const wb = Math.max(PX, snp(u * .05)); poly(xa - wb / 2, ya, xa + wb / 2, ya, PJX + wb / 2, PJY, PJX - wb / 2, PJY, mixc(C.led, '#8a9ab8', .3)); } }
    // aviation lamps: red, a slow breathing blink (never under reduced motion: steady)
    { const on = reduce ? 1 : .55 + .45 * Math.sin(now / 700 + o.z0); for(const [zz, xx, hh] of [[zf(ht), xc - bh(ht), ht + .15], [zf(ht), xc + bh(ht), ht + .15], [zb(ht), xs(ht), ht + .15], [zf(hc), xc - bh(hc), hc], [zf(hc), xc + bh(hc), hc]]){ PJ(zz, xx, hh); const rs = Math.max(PX, snp(u * .1));
        cx.fillStyle = mixc(C.redD, C.red, on); cx.fillRect(snp(PJX - rs / 2), snp(PJY - rs / 2), rs, rs); if(u > PX * .3) glow(PJX, PJY, Math.max(PX * 2, u * .5), C.red, .35 * on); } }
    // floodlights wash the foot of the shaft
    if(near){ PJ(zf(0), xc, 0); const fx = PJX, fy = PJY; pool(fx, fy - u * 1.2, u * 2.4, u * 1.4, '#c8d8ff', .25); } }

  // ---------------------------------------------------------------- the Cosmo Clock wheel (also drawn by the set piece, rolling)
  /* st: { z (hub, segment-float), x, h (hub height), yaw (0: the wheel faces down the road; pi/2: edge-on, rolling along it), roll (tilt
     of the plane, toppling), rot (the wheel's turn, radians), mode/lights 0..1, broken (lights failing), lost (gondolas gone: a Set),
     swing (gondola swing, radians), sink (0..1 under the water), alpha }. All sizes in half-road widths. */
  const WR = 6.4, NSP = 60;
  const WP = { x:0, y:0, ok:false };
  let WCY = 1, WSY = 0, WCR = 1, WSR = 0, WST = null;
  function wpt(u, v, refl){ const st = WST, X = st.x + u * WCY - v * WSR * WSY, Z = st.z + (u * WSY + v * WSR * WCY) * 10; let Hh = st.h + v * WCR; if(refl) Hh = -.5 - Hh;
    if((Z - camSeg()) < ZNEAR + .05){ WP.ok = false; return WP; } PJ(Z, X, Hh); WP.x = PJX; WP.y = PJY; WP.ok = true; return WP; }
  function wseg(u1, v1, u2, v2, c, halo, refl){ // a 3D line on the wheel, clipped at the near plane
    if(!refl && WST.zlo !== undefined){ const um = (u1 + u2) / 2, vm = (v1 + v2) / 2, Z = WST.z + (um * WSY + vm * WSR * WCY) * 10; if(Z < WST.zlo || Z >= WST.zhi) return; }   // (a depth band: the set piece draws the rolling wheel slice by slice, in the depth order)
    let a = wpt(u1, v1, refl); const ok1 = a.ok, ax = a.x, ay = a.y; let b = wpt(u2, v2, refl); if(!ok1 && !b.ok) return;
    if(!ok1 || !b.ok){ let lo = 0, hi = 1; for(let k = 0; k < 10; k++){ const m = (lo + hi) / 2, p = wpt(u1 + (u2 - u1) * m, v1 + (v2 - v1) * m, refl); if(p.ok === ok1) lo = m; else hi = m; } const m = ok1 ? lo : hi, p = wpt(u1 + (u2 - u1) * m, v1 + (v2 - v1) * m, refl), px = p.x, py = p.y;
      if(ok1){ if(refl) rline(ax, ay, px, py, c); else line(ax, ay, px, py, c, halo); } else { const q = wpt(u2, v2, refl); if(refl) rline(px, py, q.x, q.y, c); else line(px, py, q.x, q.y, c, halo); } return; }
    if(refl) rline(ax, ay, b.x, b.y, c); else line(ax, ay, b.x, b.y, c, halo); }
  const DIG = { '0':[7, 5, 5, 5, 7], '1':[2, 6, 2, 2, 7], '2':[7, 1, 7, 4, 7], '3':[7, 1, 7, 1, 7], '4':[5, 5, 7, 1, 1], '5':[7, 4, 7, 1, 7], '6':[7, 4, 7, 5, 7], '7':[7, 1, 2, 2, 2], '8':[7, 5, 7, 5, 7], '9':[7, 5, 7, 1, 7], ':':[0, 2, 0, 2, 0], '-':[0, 0, 7, 0, 0] };
  function clockStr(st){ if(st.clock) return st.clock; const m = Math.floor(22 * 60 + 15 + MOON.t * 7 * 60) % 1440, hh = Math.floor(m / 60), mm = m % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  function spokeCols(k, th, now, st){ const SEQ = [0, 0, 1, 0, 2], cyc = Math.floor(now / 8000), mode = reduce ? 0 : st.mode !== undefined ? st.mode : SEQ[cyc % 5], nxt = SEQ[(cyc + 1) % 5], w = reduce || st.mode !== undefined || nxt === mode ? -1 : ((now % 8000) / 8000 - .82) / .18;
    const m = w > 0 && ((th % 6.283) + 6.283) % 6.283 < w * 6.283 ? nxt : mode;
    if(m === 0) return [WHL.warm[(k * 7) % 4], WHL.tip[k % 3]];
    if(m === 1){ const sct = Math.floor(((th + now / 5200) / 6.283 * 7 % 7 + 7) % 7); return [WHL.rainbow[sct], WHL.tip[1]]; }
    const c = WHL.rainbow[Math.floor(now / 3000) % 7]; return [c, k % 2 ? WHL.tip[0] : c]; }
  // draw a wheel; refl: into the reflection buffer instead (lights only)
  function wheelGeo(st, now, refl, fogA){ WST = st; WCY = Math.cos(st.yaw); WSY = Math.sin(st.yaw); WCR = Math.cos(st.roll || 0); WSR = Math.sin(st.roll || 0);
    const hub = wpt(0, 0, false); if(!hub.ok && !refl) return; PJ(st.z, st.x, st.h); const upx = WR * PJU / PX, F = c => fc(c, fogA), dark = refl ? 0 : 1, br = st.broken || 0;
    const nsp = upx < 22 ? 20 : upx < 50 ? 30 : NSP, step = NSP / nsp, lightA = st.lights === undefined ? 1 : st.lights;
    const dim = (c, k) => refl ? c32(mixc(c, '#06101e', .22), 235) : c32(F(c));
    // the A-frame legs and the base (structure, dark; not reflected)
    if(dark && !st.free){ const lc = c32(F('#1e2434')), lc2 = c32(F('#2c3448')); for(const nq of [-.5, .5]) for(const uq of [-1, 1]){ const A = wpt(0, 0, false); if(!A.ok) continue; const ax = A.x, ay = A.y; const gx = st.x + uq * WR * .66 * WCY + nq * -WSY, gz = st.z + (uq * WR * .66 * WSY + nq * WCY) * 10; PJ(gz, gx, 0); line(ax, ay, PJX, PJY, lc); if(upx > 60) line(ax + PX, ay, PJX + PX, PJY, lc2); } }
    if(st.legsOnly) return;
    // the rim's dark truss, then the gondolas hanging from it
    if(dark){ const rc = c32(F('#262c3e')), N = upx < 30 ? 40 : 120; for(let k = 0; k < N; k++){ const a1 = st.rot + k / N * 6.283, a2 = st.rot + (k + 1) / N * 6.283; wseg(Math.cos(a1) * WR, Math.sin(a1) * WR, Math.cos(a2) * WR, Math.sin(a2) * WR, rc); if(upx > 70) wseg(Math.cos(a1) * WR * .94, Math.sin(a1) * WR * .94, Math.cos(a2) * WR * .94, Math.sin(a2) * WR * .94, rc); }
      if(upx > 14){ const cs = Math.max(1, Math.round(.36 * PJU / PX)), gb = c32(F('#2a3046')), gw = c32(F(C.warm)), gw2 = c32(F('#ffeec8')), gd = c32(F('#141a28'));
        for(let k = 0; k < NSP; k++){ if(st.lost && st.lost.has(k)) continue; const a = st.rot + (k + .5) / NSP * 6.283, pu = Math.cos(a) * WR * 1.02, pv = Math.sin(a) * WR * 1.02, P0 = wpt(pu, pv, false); if(!P0.ok) continue; const sw = st.swing ? Math.sin(now / 420 + k * 1.7) * st.swing : 0;
          if(st.zlo !== undefined){ const Z = st.z + (pu * WSY + pv * WSR * WCY) * 10; if(Z < st.zlo || Z >= st.zhi) continue; } const X = Math.floor(P0.x / PX) + Math.round(sw * cs), Y = Math.floor(P0.y / PX); if(X < -cs || X > RW + cs || Y < -cs || Y > RHh + cs * 3) continue;
          if(cs <= 1){ put(X, Y + 1, H1(k * 3.1) < .5 ? gw : gb); continue; }
          const w2 = Math.max(1, Math.round(cs * .8)), h2 = Math.max(2, Math.round(cs * 1.1)); for(let j = 0; j < h2; j++) for(let i = 0; i < w2; i++){ const ec = i === 0 || i === w2 - 1 || j === 0 || j === h2 - 1; put(X - (w2 >> 1) + i, Y + 1 + j, ec ? gd : j > 0 && j < h2 * .6 && H1(k * 3.1) < .62 * lightA ? (j === 1 ? gw2 : gw) : gb); }
          if(cs >= 3) put(X, Y, gd); } } }
    // the spokes: warm along their length, white-cyan at the tip (the light show), with a dim halo; failing sectors go dark when broken
    /* W11 #25 (2026-11-21): all the spokes ran in to the hub, so near it they packed closer than a pixel and beat into moire (at mid
       distance, 60 spokes on a 55-px wheel). Now a spoke starts where its own tier is at least SPW canvas px apart: every 4th drawn spoke
       runs from the hub, every 2nd from where half the count fits, the rest from where all of them fit (the radial thins inward). */
    const SPW = 3.4, sTier = [nsp / 4, nsp, nsp / 2, nsp];
    for(let k = 0; k < NSP; k += step){ const a = st.rot + k / NSP * 6.283; if(br > 0 && H1(k * 5.3 + Math.floor(now / (reduce ? 4000 : 360))) < br * .7) continue; if(lightA < 1 && H1(k * 2.9) > lightA) continue;
      const [ci, ct] = spokeCols(k, a, now, st), ca = Math.cos(a), sa = Math.sin(a), r0 = Math.max(.62, SPW * sTier[Math.round(k / step) % 4] / 6.283 / Math.max(1, upx) * WR);
      if(r0 < WR * .72) wseg(ca * r0, sa * r0, ca * WR * .72, sa * WR * .72, dim(ci, 0), refl || upx < 90 ? 0 : c32(F(ci), 60), refl); wseg(ca * WR * .72, sa * WR * .72, ca * WR * .985, sa * WR * .985, dim(ct, 0), refl || upx < 90 ? 0 : c32(F(ct), 60), refl);
      if(refl && k % (step * 2) === 0){ const tp = wpt(ca * WR * .985, sa * WR * .985, true); if(tp.ok) rcol(tp.x, tp.y, WR * PJU * .55, c32(mixc(ct, '#06101e', .15), 230), c32(mixc(ci, '#06101e', .35), 200)); } }
    // the rim's lights: short pale dashes all round
    { const N = upx < 30 ? 40 : 90, c = dim('#dff6ff', 0); for(let k = 0; k < N; k += 2){ if(br > 0 && H1(k * 1.7 + Math.floor(now / (reduce ? 4000 : 300))) < br * .5) continue; if(lightA < 1 && H1(k * 4.3) > lightA) continue; const a1 = st.rot + k / N * 6.283, a2 = st.rot + (k + 1) / N * 6.283; wseg(Math.cos(a1) * WR, Math.sin(a1) * WR, Math.cos(a2) * WR, Math.sin(a2) * WR, c, 0, refl); } }
    // the hub: a violet rosette, and under it the clock
    { const N = 16; for(let k = 0; k < N; k++){ const a1 = st.rot + k / N * 6.283, a2 = st.rot + (k + 1) / N * 6.283, c = dim(WHL.hub[k % 3], 0); wseg(Math.cos(a1) * .6, Math.sin(a1) * .6, Math.cos(a2) * .6, Math.sin(a2) * .6, c, 0, refl); if(upx > 40) wseg(Math.cos(a1) * .36, Math.sin(a1) * .36, Math.cos(a2) * .36, Math.sin(a2) * .36, c, 0, refl); } }
    if(refl){ const hb = wpt(0, -.95, true); if(hb.ok){ PJ(st.z, st.x, st.h); rcol(hb.x, hb.y, WR * PJU * .8, c32('#d8c890', 235), c32('#8a6a3a', 200)); rcol(hb.x + PX, hb.y, WR * PJU * .6, c32('#c8b880', 220), c32('#6a5030', 190)); } }
    if(!refl && hub.ok && (st.zlo === undefined || (st.z >= st.zlo && st.z < st.zhi))){ const fs = Math.max(1, Math.round(.11 * PJU / PX)), str = clockStr(st), cw = 4 * fs, tw = str.length * cw - fs, hx2 = Math.floor(hub.x / PX) - (tw >> 1), hy = Math.floor(hub.y / PX) + Math.round(.95 * PJU / PX);
      const on = br > 0 ? (H1(Math.floor(now / 500)) > br * .6) : true, dc = c32(on ? '#fff0b8' : '#5a4a30'), bk = c32('#0c0a10');
      if(fs >= 1 && upx > 26){ for(let j = -fs; j < 6 * fs; j++) for(let i = -fs; i < tw + fs; i++) put(hx2 + i, hy + j, bk);
        for(let n = 0; n < str.length; n++){ const g = DIG[str[n]]; if(!g) continue; for(let r = 0; r < 5; r++) for(let b = 0; b < 3; b++) if(g[r] >> (2 - b) & 1) for(let j = 0; j < fs; j++) for(let i = 0; i < fs; i++) put(hx2 + n * cw + b * fs + i, hy + r * fs + j, dc); } }
      else if(upx > 8) put(Math.floor(hub.x / PX), Math.floor(hub.y / PX) + Math.max(1, Math.round(.9 * PJU / PX)), dc); } }
  // the base: Cosmo World's pier deck and a low lit pavilion under the wheel
  function wheelBase(o, F){ const z0 = o.hz - 34, z1 = o.hz + 34, x0 = o.x - 4.2, x1 = o.x + 4.2;
    wq(z0, x0, 0, z1, x0, 0, z1, x0, .35, z0, x0, .35, F('#262a38')); wq(z0, x0, 0, z0, x1, 0, z0, x1, .35, z0, x0, .35, F('#2e3242'));
    wq(z0 + 10, x0 + .6, .35, z1 - 10, x0 + .6, .35, z1 - 10, x0 + .6, 1.25, z0 + 10, x0 + .6, 1.25, F('#1c2030')); wq(z0 + 10, x0 + .6, .35, z0 + 10, x1 - .6, .35, z0 + 10, x1 - .6, 1.25, z0 + 10, x0 + .6, 1.25, F('#22263a'));
    wq(z0 + 10, x0 + .6, .55, z1 - 10, x0 + .6, .55, z1 - 10, x0 + .6, .9, z0 + 10, x0 + .6, .9, F('#c87ab8')); wq(z0 + 10, x0 + .6, .55, z0 + 10, x1 - .6, .55, z0 + 10, x1 - .6, .9, z0 + 10, x0 + .6, .9, F('#d88ac8'));
    PJ(z0 + 10, o.x, 1.25); const u = PJU; if(u > PX * .8){ for(let k = 0; k < 9; k++){ PJ(z0 + 10, x0 + .9 + k * .85, 1.25); R(PJX - u * .04, PJY - u * .08, Math.max(PX, u * .08), Math.max(PX, u * .08), F(k % 2 ? '#7af0ff' : '#ffe08a')); } } }
  function drawWheel(o, now){ const gf = objFog(o), F = c => fc(c, gf); if(o.hz + 40 < camSeg()) return;
    wheelBase(o, F); const st = o.st || (o.st = { z:o.hz, x:o.x, h:WR + 1.35, yaw:.5, roll:0, rot:0 }); st.rot = reduce ? .3 : now * .00002;
    if(!rbOK()) return; rbBegin(); if(o.gone){ st.legsOnly = true; wheelGeo(st, now, false, gf); st.legsOnly = false; } else wheelGeo(st, now, false, gf); rbFlush(); }   // (gone: the set piece has the wheel; its stand is left, empty)

  // ---------------------------------------------------------------- Queen's Square: three towers stepping toward the sea, wave crowns outlined in LED
  function drawQS(o, now){ const gf = objFog(o), F = c => fc(c, gf), xc = o.x, sd = xc < 0 ? 1 : -1, bw = 1.5, z0 = o.z0, z1 = o.z1, ht = o.ht, xs = xc + sd * bw; if(z0 < camSeg() + .5) return;
    const top = (f, side) => ht + .9 * Math.sin(f * 3.6 + o.ph + side) * (.5 + f * .5) - .4 * f, NS = 8;
    PJ((z0 + z1) / 2, xc, ht * .5); const u = PJU, pitch = .5 * u;
    for(let k = 0; k < NS; k++){ const f0 = k / NS, f1 = (k + 1) / NS;
      wq(z0, xc - bw + 2 * bw * f0, 0, z0, xc - bw + 2 * bw * f1, 0, z0, xc - bw + 2 * bw * f1, top(f1, 0), z0, xc - bw + 2 * bw * f0, top(f0, 0), F('#161c2c'));
      wq(lerp(z0, z1, f0), xs, 0, lerp(z0, z1, f1), xs, 0, lerp(z0, z1, f1), xs, top(f1, 2), lerp(z0, z1, f0), xs, top(f0, 2), F('#10162a')); }
    // ribbon windows, densely lit white
    if(pitch >= PX * 1.4){ const st = pitch >= PX * 2.4 ? 1 : 2; for(let k = 0, h0 = 1.1; h0 < ht - 1.2; k++, h0 += .5){ if(k % st) continue; const h1 = h0 + .22 * st, lit = F(k % 5 === 2 ? '#c8d4ea' : '#9aaccc');
        wq(z0, xc - bw + .1, h0, z0, xc + bw - .1, h0, z0, xc + bw - .1, h1, z0, xc - bw + .1, h1, lit); wq(z0 + 1, xs, h0, z1 - 1, xs, h0, z1 - 1, xs, h1, z0 + 1, xs, h1, lit);
        if(pitch > PX * 4) for(let c = 0; c < 5; c++){ if(H1(o.z0 + k * 13.3 + c * 5.1) > .32) continue; const f0 = c / 5, f1 = f0 + .14; wq(z0, xc - bw + 2 * bw * f0, h0, z0, xc - bw + 2 * bw * f1, h0, z0, xc - bw + 2 * bw * f1, h1, z0, xc - bw + 2 * bw * f0, h1, F('#141a2a')); wq(lerp(z0, z1, f0), xs, h0, lerp(z0, z1, f1), xs, h0, lerp(z0, z1, f1), xs, h1, lerp(z0, z1, f0), xs, h1, F('#121828')); } } }
    else wq(z0, xc - bw + .1, 1.1, z0, xc + bw - .1, 1.1, z0, xc + bw - .1, ht - 1.2, z0, xc - bw + .1, ht - 1.2, F('#3a4660'));
    // the crown's LED line: one thin line of light along the wave, front and side
    if(!rbOK()) return; rbBegin(true); const lc = c32(fc('#c8f8ff', gf * .5)), lh = c32(fc('#7ad8ff', gf * .5), 60);
    for(let k = 0; k < 16; k++){ const f0 = k / 16, f1 = (k + 1) / 16; PJ(z0, xc - bw + 2 * bw * f0, top(f0, 0)); const ax = PJX, ay = PJY; PJ(z0, xc - bw + 2 * bw * f1, top(f1, 0)); line(ax, ay, PJX, PJY, lc, lh);
      PJ(lerp(z0, z1, f0), xs, top(f0, 2)); const bx = PJX, by = PJY; PJ(lerp(z0, z1, f1), xs, top(f1, 2)); line(bx, by, PJX, PJY, lc, lh); }
    PJ(z0, xc + sd * bw, top(sd > 0 ? 1 : 0, 0)); const ex = PJX, ey = PJY; PJ(z0, xc + sd * bw, 1.2); line(ex, ey, PJX, PJY, c32(fc('#5ab8e8', gf * .6)));
    rbFlush();
    { const on = reduce ? 1 : .55 + .45 * Math.sin(now / 700 + o.z0 * .7); PJ(z0, xc + sd * bw * .8, top(.9, 0) + .2); R(PJX - PX / 2, PJY, Math.max(PX, snp(u * .08)), Math.max(PX, snp(u * .08)), mixc(C.redD, C.red, on)); }
    // round 4 ("Queen's Square Yokohama at night"): the skybridge back to the previous tower, a lit glass tube; the galleria podium at the foot,
    // its glazed shopfronts lit warm under the glowing white canopy band that runs along the top (the brightest box at the foot of the trio)
    if(o.px !== undefined){ const xa = o.px - sd * .2, xb = xc - sd * .2, za = o.pz, zb = z0, hb = 5.6; wq(za, xa, hb - .12, zb, xb, hb - .12, zb, xb, hb + .5, za, xa, hb + .5, F('#141a28'));
      wq(za + 1, xa, hb, zb - 1, xb, hb, zb - 1, xb, hb + .36, za + 1, xa, hb + .36, F('#9ab8dc')); if(u > PX * .8) wq(za + 1, xa, hb + .3, zb - 1, xb, hb + .3, zb - 1, xb, hb + .36, za + 1, xa, hb + .36, F('#e8f4ff')); }
    { const xp = xs + sd * .7, za = z0 - 5, zb = z1 + (o.px === undefined ? 9 : 8), hp = 1.5; wq(za, xp, 0, zb, xp, 0, zb, xp, hp, za, xp, hp, F('#161a26'));
      wq(za, xp, .04, zb, xp, .04, zb, xp, 1.02, za, xp, 1.02, F('#c8a070')); if(u > PX * 1.2){ for(let z = za + 2; z < zb; z += 2.5){ PJ(z, xp, .04); const x1 = PJX, y1 = PJY; PJ(z, xp, 1.02); R(x1, PJY, PX, Math.max(PX, y1 - PJY), F('#3a2c24')); } wq(za, xp, .04, zb, xp, .04, zb, xp, .2, za, xp, .2, F('#7a5a3a')); }
      wq(za, xp, 1.08, zb, xp, 1.08, zb, xp, 1.42, za, xp, 1.42, fc('#eaf4ff', gf * .45)); wq(za, xp, 1.42, zb, xp, 1.42, zb, xp, hp, za, xp, hp, F('#20263a'));
      wq(za, xp, 0, za, xs, 0, za, xs, hp, za, xp, hp, F('#1c2030')); wq(za, xp, 1.08, za, xs, 1.08, za, xs, 1.42, za, xp, 1.42, fc('#d8e8f8', gf * .45)); } }

  // ---------------------------------------------------------------- the sail hotel: a crescent of warm windows across the water
  /* Round 4, from "InterContinental Hotel Yokohama" and "Views of Minato Mirai 21 from Osanbashi Pier at night" (Commons): the sail is a
     pale face washed with light, brightest along its curved edge and at its foot; a dark spine runs up its tall end with a few lit windows
     and a green lamp at the top; a terraced podium of lit floors steps down to the water at its foot; a searchlight stands up from the top.
     An original take: a crescent, a spine, three terraces. */
  function drawSail(o, now){ const gf = objFog(o), F = c => fc(c, gf), sd = o.x < 0 ? 1 : -1, xs = o.x + sd * .8, z0 = o.z0, z1 = o.z1, Hm = 14; if(z0 < camSeg() + .5) return;
    const hAt = f => Hm * (.12 + .88 * Math.sqrt(Math.max(0, 1 - (1 - f) * (1 - f)))), NS = 16; PJ((z0 + z1) / 2, xs, Hm / 2); const u = PJU, Z = f => lerp(z0, z1, f);
    // the searchlight: a faint pale shaft from the top into the sky (steady)
    if(u > PX * .25){ PJ(z1 - 2, xs, Hm); const bx = PJX, by = PJY, bw = Math.max(PX, snp(u * .1)); cx.globalCompositeOperation = 'lighter'; poly(bx - bw / 2, by, bx + bw / 2, by, bx + bw * 1.5, by - H, bx - bw * 1.5, by - H, rgbaA('150,180,255', .07 * (1 - gf))); cx.globalCompositeOperation = 'source-over'; }
    // the face: pale, uplit at its foot, its curved edge washed brightest
    for(let k = 0; k < NS; k++){ const f0 = k / NS, f1 = (k + 1) / NS, a0 = hAt(f0), a1 = hAt(f1);
      wq(Z(f0), xs, 0, Z(f1), xs, 0, Z(f1), xs, a1, Z(f0), xs, a0, F('#5a6486'));
      wq(Z(f0), xs, 0, Z(f1), xs, 0, Z(f1), xs, Math.min(a1, 3.2), Z(f0), xs, Math.min(a0, 3.2), F('#6c7698'));
      wq(Z(f0), xs, a0 - 1.1, Z(f1), xs, a1 - 1.1, Z(f1), xs, a1, Z(f0), xs, a0, F('#7a86ae'));
      if(u > PX * .5) wq(Z(f0), xs, a0 - .45, Z(f1), xs, a1 - .45, Z(f1), xs, a1, Z(f0), xs, a0, F('#9eaad0')); }
    wq(z1, o.x - .8, 0, z1, o.x + .8, 0, z1, o.x + .8, Hm, z1, o.x - .8, Hm, F('#3a4058'));
    if(u * .48 >= PX * 1.2){ for(let r = 0, h = 3.6; h < Hm - .5; r++, h += .48){ for(let k = 0; k < NS * 2; k++){ const f = (k + .5) / (NS * 2); if(f > .84 || h > hAt(f) - .6) continue; const hv = H1(r * 17.1 + k * 3.3 + z0); if(hv > .42) continue;
          PJ(Z(f), xs, h); R(PJX - u * .05, PJY - u * .2, Math.max(PX, u * .1), Math.max(PX, u * .2), F(hv < .3 ? '#ffcf88' : '#ffe8c0')); } } }
    // the spine up the tall end: a dark slot with a few lit windows, the green lamp at its top
    { const fa = .86, fb = .91, ht = hAt(.885) - .2; wq(Z(fa), xs + sd * .01, 2.2, Z(fb), xs + sd * .01, 2.2, Z(fb), xs + sd * .01, ht, Z(fa), xs + sd * .01, ht, F('#141826'));
      if(u * .5 >= PX){ for(let h = 2.6; h < ht - .5; h += .5){ if(H1(h * 7.3 + z0) > .55) continue; PJ(Z(.885), xs + sd * .02, h); R(PJX - u * .06, PJY - u * .2, Math.max(PX, u * .12), Math.max(PX, u * .18), F('#ffd890')); } }
      PJ(Z(.885), xs + sd * .02, ht - .1); const gs = Math.max(PX, snp(u * .22)); cx.fillStyle = fc('#a8ffc8', gf * .5); cx.fillRect(snp(PJX - gs / 2), snp(PJY - gs), gs, gs); if(u > PX * .3) glow(PJX, PJY - gs / 2, Math.max(PX * 2, u * .7), '#6affa8', .3 * (1 - gf)); }
    if(!rbOK()) return; rbBegin(true); const ec = c32(fc('#c8d4f0', gf)); for(let k = 0; k < 20; k++){ const f0 = k / 20, f1 = (k + 1) / 20; PJ(Z(f0), xs, hAt(f0)); const ax = PJX, ay = PJY; PJ(Z(f1), xs, hAt(f1)); line(ax, ay, PJX, PJY, ec); } rbFlush();
    // the terraced podium at its foot: three stepped floors of restaurants and halls, each a band of warm light under a pale slab edge
    for(let q = 0; q < 3; q++){ const xq = xs + sd * (1.1 - q * .35), za = z0 - 14 + q * 9, zb = z1 + 4 - q * 6, h1 = .75 + q * .62, h0 = q ? h1 - .62 : 0;
      wq(za, xq, h0, zb, xq, h0, zb, xq, h1, za, xq, h1, F('#3a3e56')); wq(za, xq, h0, za, xs, h0, za, xs, h1, za, xq, h1, F('#2e3248'));
      wq(za + 1, xq, h1 - .5, zb - 1, xq, h1 - .5, zb - 1, xq, h1 - .14, za + 1, xq, h1 - .14, F(q === 1 ? '#ffe2a8' : '#ffcf88'));
      wq(za, xq, h1 - .06, zb, xq, h1 - .06, zb, xq, h1, za, xq, h1, F('#b4bcd4'));
      if(u > PX * 1.6) for(let z = za + 3; z < zb - 1; z += 3){ PJ(z, xq, h1 - .5); const x1 = PJX, y1 = PJY; PJ(z, xq, h1 - .14); R(x1, PJY, PX, Math.max(PX, y1 - PJY), F('#5a4a3a')); } }
    { const on = reduce ? 1 : .55 + .45 * Math.sin(now / 760 + 1); PJ(z1, xs, Hm + .1); const rs = Math.max(PX, snp(u * .1)); cx.fillStyle = mixc(C.redD, C.red, on); cx.fillRect(snp(PJX - rs / 2), snp(PJY - rs), rs, rs); if(u > PX * .3) glow(PJX, PJY, Math.max(PX * 2, u * .4), C.red, .3 * on); } }
  function reflSail(o){ const xs = o.x - .8, z0 = o.z0, z1 = o.z1, Hm = 14, hAt = f => Hm * (.12 + .88 * Math.sqrt(Math.max(0, 1 - (1 - f) * (1 - f))));
    for(let r = 0, h = .9; h < Hm - .5; r++, h += .96){ for(let k = 0; k < 12; k++){ const f = (k + .5) / 12; if(h > hAt(f) - .45 || H1(r * 7.1 + k * 3.9 + z0) > .5) continue; PJ(lerp(z0, z1, f), xs, -.5 - h); rcol(PJX, PJY, PJU * 1.6, c32('#a8804a', 220), c32('#6a4a2a', 190)); } } }

  // ---------------------------------------------------------------- Cosmo World's coaster: a pink-lit track with a loop, a train on its circuit
  const CST = []; { const N = 90; for(let k = 0; k <= N; k++){ const s = k / N; let z, x, h;
      if(s < .2){ const t = s / .2; z = t * 20; h = .6 + t * 4.4; x = 0; } else if(s < .32){ const t = (s - .2) / .12; z = 20 + t * 12; h = 5 - 4.3 * sm(t); x = t * .6; }
      else if(s < .5){ const t = (s - .32) / .18, a = t * 6.283; z = 32 + t * 8 + Math.sin(a) * 6; h = 2.1 - 1.4 * Math.cos(a); x = .6 + t * .4; }
      else { const t = (s - .5) / .5; z = 40 + t * 30; h = .7 + 1.3 * Math.abs(Math.sin(t * 6.283 * 1.5)) * (1 - t * .5); x = 1 - t * 2.2 + Math.sin(t * 9) * .6; } CST.push([z, x, h]); } }
  function drawCoaster(o, now){ const gf = objFog(o); if(o.z0 < camSeg() + 1 || !rbOK()) return; rbBegin(); const tc = c32(fc('#ff7ad8', gf * .6)), th = c32(fc('#ff7ad8', gf * .6), 60), sc = c32(fc('#3a2a4a', gf));
    const pt = (k, dx) => { const p = CST[k]; PJ(o.z0 + p[0], o.x + p[1] + dx, p[2]); return [PJX, PJY]; };
    for(let k = 0; k < CST.length; k += 6){ const p = CST[k]; const [ax, ay] = pt(k, 0); PJ(o.z0 + p[0], o.x + p[1], 0); line(ax, ay, PJX, PJY, sc); }
    for(let k = 0; k < CST.length - 1; k++) for(const dx of [-.12, .12]){ const [ax, ay] = pt(k, dx), [bx, by] = pt(k + 1, dx); line(ax, ay, bx, by, tc, th); }
    { const t = reduce ? .6 : (now / 16000) % 1, k0 = Math.floor(t * (CST.length - 6)); for(let j = 0; j < 4; j++){ const [ax, ay] = pt(Math.max(0, k0 - j), 0); dot(ax, ay - PX, c32(fc('#fff0c8', gf * .5)), PJU > PX * 6 ? 2 : 1); } }
    rbFlush(); }

  // ---------------------------------------------------------------- a tower still rising: steel frame, work lamps, a tower crane lit red
  function drawRising(o, now){ const gf = objFog(o), F = c => fc(c, gf), xc = o.x, bw = 1.6, z0 = o.z0, z1 = o.z1, ht = o.ht, hf = ht * o.top, sd = xc < 0 ? 1 : -1, xs = xc + sd * bw; if(z0 < camSeg() + .5) return;
    PJ((z0 + z1) / 2, xc, ht * .5); const u = PJU;
    // the clad lower floors: dark glass, a few lit
    wq(z0, xc - bw, 0, z0, xc + bw, 0, z0, xc + bw, hf, z0, xc - bw, hf, F('#141a28')); wq(z0, xs, 0, z1, xs, 0, z1, xs, hf, z0, xs, hf, F('#10141f'));
    if(u * .45 > PX * 1.2) for(let k = 0, h = .8; h < hf - .3; k++, h += .45) for(let c = 0; c < 6; c++){ const hv = H1(o.z0 + k * 7.7 + c * 2.3); if(hv > .18) continue; PJ(z0, xc - bw + 2 * bw * (c + .5) / 6, h); R(PJX - u * .1, PJY - u * .1, Math.max(PX, u * .2), Math.max(PX, u * .12), F(hv < .06 ? C.warm : '#b8c8e8')); }
    if(!rbOK()) return; rbBegin(true); const stc = c32(F('#4a5670')), stl = c32(F('#6a7a98')), wl = c32(fc(C.sodium, gf * .4)), wlh = c32(fc(C.amber, gf * .4), 80);
    const L3 = (z1_, x1_, h1_, z2_, x2_, h2_, c, hl) => { PJ(z1_, x1_, h1_); const ax = PJX, ay = PJY; PJ(z2_, x2_, h2_); line(ax, ay, PJX, PJY, c, hl); };
    // the frame above: corner columns and floor edges, every floor
    for(const [zz, xx] of [[z0, xc - bw], [z0, xc + bw], [z1, xs]]) L3(zz, xx, hf, zz, xx, ht, stl);
    for(let h = hf; h <= ht + .01; h += .42){ L3(z0, xc - bw, h, z0, xc + bw, h, stc); L3(z0, xs, h, z1, xs, h, stc); }
    for(let k = 0; k < 5; k++){ const h = hf + .2 + k * .42 * 2; if(h > ht) break; if(H1(k * 3.1 + o.z0) < .6){ PJ(z0, xc - bw + 2 * bw * H1(k + o.z0 * .3), h); dot(PJX, PJY, wl, u > PX * 5 ? 2 : 1); if(u > PX * 2) glow(PJX, PJY, u * .5, C.amber, .25); } }
    // the crane: a lattice mast from the roof, a cab, the jib slewing slowly, the counter-jib with its weight, pendants, a trolley and hook
    const mh = ht + 4.6, mz = (z0 + z1) / 2, mx = xc, sl = (o.cr ? .7 : -.4) + (reduce ? 0 : .12 * Math.sin(now / 11000 + o.z0)), jx = Math.cos(sl), jz = Math.sin(sl) * 10;
    const mc = c32(F('#5a6888')), mh2 = c32(F('#3a4660'));
    for(const q of [-.18, .18]) L3(mz, mx + q, ht, mz, mx + q, mh, mc);
    for(let h = ht, k = 0; h < mh - .2; h += .36, k++) L3(mz, mx + (k % 2 ? -.18 : .18), h, mz, mx + (k % 2 ? .18 : -.18), h + .36, mh2);
    const jl = 6.2, cl = 2.4, jh = mh - .5; L3(mz, mx, jh, mz + jz * jl, mx + jx * jl, jh, mc); L3(mz, mx, jh - .3, mz + jz * jl, mx + jx * jl, jh - .1, mh2);
    for(let k = 1; k < 12; k++){ const f = k / 12; L3(mz + jz * jl * f, mx + jx * jl * f, jh, mz + jz * jl * (f + 1 / 24), mx + jx * jl * (f + 1 / 24), jh - .25, mh2); }
    L3(mz, mx, jh, mz - jz * cl, mx - jx * cl, jh, mc); L3(mz, mx, mh + .9, mz + jz * jl * .7, mx + jx * jl * .7, jh, mh2); L3(mz, mx, mh + .9, mz - jz * cl, mx - jx * cl, jh, mh2); L3(mz, mx, mh, mz, mx, mh + .9, mc);
    { const tf = .35 + .45 * (reduce ? .5 : .5 + .5 * Math.sin(now / 9000 + o.z0)), tz = mz + jz * jl * tf, tx = mx + jx * jl * tf; L3(tz, tx, jh - .1, tz, tx, jh - 2.6, c32(F('#2a3248'))); PJ(tz, tx, jh - 2.6); dot(PJX, PJY, c32(F('#c8a040')), u > PX * 4 ? 2 : 1); }
    { PJ(mz, mx, jh - .3); const cs = Math.max(1, Math.round(u * .3 / PX)); for(let j = 0; j < cs; j++) for(let i = 0; i < cs; i++) put(Math.floor(PJX / PX) + i, Math.floor(PJY / PX) + j, c32(F(j === 0 ? C.warm : '#2a3248'))); }
    { PJ(mz - jz * cl, mx - jx * cl, jh - .25); const cs = Math.max(1, Math.round(u * .45 / PX)); for(let j = 0; j < cs; j++) for(let i = 0; i < cs; i++) put(Math.floor(PJX / PX) - (cs >> 1) + i, Math.floor(PJY / PX) + j, c32(F('#3a404e'))); }
    for(let k = 1; k <= 3; k++){ PJ(mz + jz * jl * k / 3.4, mx + jx * jl * k / 3.4, jh + .05); dot(PJX, PJY, c32(fc('#f0f4ff', gf * .4))); }
    rbFlush();
    // red aviation lamps at the mast top and the jib's tip, breathing out of step
    for(const [zz, xx, hh, ph] of [[mz, mx, mh + .95, 0], [mz + jz * jl, mx + jx * jl, jh + .1, 2.1], [mz - jz * cl, mx - jx * cl, jh + .1, 4.2]]){ const on = reduce ? 1 : .5 + .5 * Math.sin(now / 650 + ph + o.z0); PJ(zz, xx, hh); const rs = Math.max(PX, snp(u * .12));
      cx.fillStyle = mixc(C.redD, C.red, on); cx.fillRect(snp(PJX - rs / 2), snp(PJY - rs / 2), rs, rs); if(u > PX * .3) glow(PJX, PJY, Math.max(PX * 2, u * .45), C.red, .4 * on); } }

  // ---------------------------------------------------------------- the Marine Tower: a slim lattice lit violet-white, its glowing drum
  function drawMarine(o, now){ const gf = objFog(o), Ht = 10.6, zc = (o.z0 + o.z1) / 2, xc = o.x; if(o.z0 < camSeg() + .5 || !rbOK()) return; rbBegin(true);
    const lc = c32(fc('#b8aaf0', gf * .5)), lc2 = c32(fc('#7a6ad0', gf * .5)), r = h => .9 - .62 * Math.pow(h / 9, .7);
    const L3 = (h1, q1, h2, q2, c) => { PJ(zc, xc + q1 * r(h1), h1); const ax = PJX, ay = PJY; PJ(zc, xc + q2 * r(h2), h2); line(ax, ay, PJX, PJY, c); };
    for(const q of [-1, 1, -.35, .35]) L3(0, q, 9, q, q === 1 || q === -1 ? lc : lc2);
    for(let h = 0, k = 0; h < 9; h += .55, k++){ L3(h, -1, h + .55, 1, lc2); L3(h, 1, h + .55, -1, lc2); if(k % 2 === 0) L3(h, -1, h, 1, lc); }
    rbFlush(); const F = c => fc(c, gf * .4); PJ(zc, xc, 9.6); const u = PJU;
    wq(zc, xc - .55, 9, zc, xc + .55, 9, zc, xc + .55, 9.75, zc, xc - .55, 9.75, F('#f0f2ff')); wq(zc, xc - .6, 9.75, zc, xc + .6, 9.75, zc, xc + .6, 10.2, zc, xc - .6, 10.2, F('#8a90c0'));
    if(u > PX * .5) glow(PJX, PJY, u * 1.4, '#c8d0ff', .3); PJ(zc, xc, Ht + .3); R(PJX - PX / 2, PJY, PX, Math.max(PX, u * .3), F('#5a5a80')); { const on = reduce ? 1 : .5 + .5 * Math.sin(now / 800); R(PJX - PX / 2, PJY - PX, PX, PX, mixc(C.redD, C.red, on)); } }

  // ---------------------------------------------------------------- ships at the quay, dressed overall in bulbs
  /* Nippon Maru: a white four-masted barque, her yards lit yellow. Hikawa Maru: the old liner, black hull, white decks, the red-and-black
     funnel. Both wear strings of warm bulbs from the bow over every masthead to the stern (Hikawa Maru photograph). The bulbs reflect. */
  const SHIP = {
    nippon:{ fb:.55, beam:1.2, hull:'#8a90a6', hullD:'#5a6078', boot:'#1a2236', deck:'#3a3428', masts:[[.17, 5.1], [.38, 5.5], [.6, 5.2], [.82, 4.3]], yards:5, sup:[[.44, .54, .28], [.74, .84, .24]], funnel:null },
    hikawa:{ fb:.95, beam:1.5, hull:'#14161e', hullD:'#0c0e14', boot:'#5a1a1a', deck:'#2a2a30', masts:[[.12, 4], [.7, 3.6]], yards:0, sup:[[.28, .78, .62], [.34, .72, 1.18], [.42, .64, 1.62]], funnel:[.53, 2.9] } };
  function shipLines(o, now, S, F, refl){ const z0 = o.z0, z1 = o.z1, len = z1 - z0, xc = o.x, xb = xc - S.beam / 2, mz = f => z0 + len * f, bowH = S.fb + .55, mastTop = S.masts.map(m => [mz(m[0]), m[1] + S.fb]);
    const bulb = c32(F(C.warm)), bulb2 = c32(F('#fff2cc')), rb = c32('#8a6a3a', 210);
    // the dressing: bow (bowsprit tip) -> each masthead -> stern, sagging
    const pts = [[z0 - (o.ship === 'nippon' ? 9 : 2), bowH + (o.ship === 'nippon' ? .4 : 0)], ...mastTop, [z1, S.fb + .4]];
    for(let k = 0; k < pts.length - 1; k++){ const [za, ha] = pts[k], [zb, hb] = pts[k + 1], n = Math.max(4, Math.round((zb - za) / 2.2)); for(let j = 0; j <= n; j++){ const t = j / n, z = lerp(za, zb, t), h = lerp(ha, hb, t) - Math.sin(t * Math.PI) * Math.min(1.6, (zb - za) * .03);
        if(refl){ if(j % 2) continue; PJ(z, xc, -.5 - h); rdot(PJX, PJY, rb, 3); } else { PJ(z, xc, h); dot(PJX, PJY, j % 3 ? bulb : bulb2, PJU > PX * 9 ? 2 : 1); } } }
    if(refl) return;
    const mc = c32(F(o.ship === 'nippon' ? '#c8b070' : '#8a8070')), yc = c32(F('#ffd04a')), rg = c32(F('#3a3e4e'));
    for(const [f, mh] of S.masts){ const z = mz(f); PJ(z, xc, S.fb); const ax = PJX, ay = PJY; PJ(z, xc, S.fb + mh); line(ax, ay, PJX, PJY, mc);
      for(let y = 0; y < S.yards; y++){ const hh = S.fb + mh * (.36 + y * .13), w = .95 - y * .13; PJ(z, xc - w, hh); const bx = PJX, by = PJY; PJ(z, xc + w, hh); line(bx, by, PJX, PJY, yc); }
      if(PJU > PX * 3){ PJ(z, xc, S.fb + mh); const tx = PJX, ty = PJY; PJ(z - 6, xb, S.fb); line(tx, ty, PJX, PJY, rg); PJ(z + 6, xb, S.fb); line(tx, ty, PJX, PJY, rg); } }
    if(o.ship === 'nippon'){ PJ(z0 + 2, xc, bowH); const ax = PJX, ay = PJY; PJ(z0 - 9, xc, bowH + .4); line(ax, ay, PJX, PJY, mc); } }
  function drawShip(o, now){ const S = SHIP[o.ship], gf = objFog(o), F = c => fc(c, gf), z0 = o.z0, z1 = o.z1, len = z1 - z0, xc = o.x, xb = xc - S.beam / 2, fb = S.fb; if(z1 < camSeg() + 1) return;
    // the hull: the side facing the road with a sheer (the bow and stern rise), the boot-top at the waterline, a row of portholes, the bow's taper
    const NS = 10, sheer = f => fb + .35 * Math.pow(Math.abs(f - .45) * 2, 2), zt = 12;
    const zb0 = Math.max(z0 + zt, camSeg() + .6);
    for(let k = 0; k < NS; k++){ const f0 = k / NS, f1 = (k + 1) / NS, za = Math.max(lerp(z0 + zt, z1, f0), zb0), zb = lerp(z0 + zt, z1, f1); if(zb <= za) continue; const fa = (za - z0) / len, fbb = (zb - z0) / len;
      wq(za, xb, -.3, zb, xb, -.3, zb, xb, sheer(fbb), za, xb, sheer(fa), F(S.hull)); wq(za, xb, -.3, zb, xb, -.3, zb, xb, .02, za, xb, .02, F(S.boot)); }
    { const za = Math.max(z0 + zt, camSeg() + .6); if(z1 > za){ wq(za, xb - .005, sheer((za - z0) / len) - .07, z1, xb - .005, sheer(1) - .07, z1, xb - .005, sheer(1), za, xb - .005, sheer((za - z0) / len), F(o.ship === 'hikawa' ? '#d8dce4' : '#c8ccd8')); } }   // the sheer line, catching the quay lamps
    // the bow: the hull narrows to the stem over its last segments
    if(z0 + zt > camSeg() + .6){ wq(z0, xc, -.3, z0 + zt, xb, -.3, z0 + zt, xb, sheer(zt / len), z0, xc, sheer(0) + .1, F(S.hullD)); wq(z0, xc, -.3, z0 + zt, xb, -.3, z0 + zt, xb, .02, z0, xc, .02, F(S.boot)); }
    // decks and superstructure
    // decks: white tiers set back one behind another, each with a dark deck line under it and a row of warm windows; their ends darker
    let prevH = fb, ti = 0;
    for(const [a, b, hh] of S.sup){ const za = Math.max(z0 + len * a, camSeg() + .6), zb = z0 + len * b, xx = xb + .18 + ti * .14, h0 = prevH, h1 = fb + hh; prevH = h1; ti++; if(zb <= za) continue;
      wq(za, xx, h0, zb, xx, h0, zb, xx, h1, za, xx, h1, F(o.ship === 'hikawa' ? '#6a6e7c' : '#6a6e7c'));
      wq(za, xx - .01, h1 - .06, zb, xx - .01, h1 - .06, zb, xx - .01, h1, za, xx - .01, h1, F('#9a9eac'));
      wq(za, xx - .01, h0, zb, xx - .01, h0, zb, xx - .01, h0 + .05, za, xx - .01, h0 + .05, F('#2a2c36'));
      if(za > camSeg() + 1) wq(za, xx, h0, za, xc + S.beam / 2 - .2, h0, za, xc + S.beam / 2 - .2, h1, za, xx, h1, F(o.ship === 'hikawa' ? '#565a68' : '#4a4e5c'));
      PJ((za + zb) / 2, xx, (h0 + h1) / 2); const u = PJU; if(u * .25 > PX * .7){ const n = Math.max(2, Math.round((zb - za) / 2.2)); for(let k = 0; k < n; k++){ const hv = H1(z0 + k * 3.7 + hh); if(hv > .72) continue; PJ(lerp(za, zb, (k + .5) / n), xx - .01, h0 + (h1 - h0) * .55); R(PJX - u * .045, PJY - u * .06, Math.max(PX, u * .09), Math.max(PX, u * .09), F(hv < .45 ? C.warm : '#fff0d0')); } } }
    if(S.funnel){ const zf = z0 + len * S.funnel[0], hf = fb + S.funnel[1], xx = xc - .45; if(zf > camSeg() + 1){ const bands = [[1.9, 2.25, '#14141a'], [1.25, 1.9, '#c82a2a'], [1.05, 1.25, '#e8e8ee'], [.5, 1.05, '#c82a2a']];
        for(const [h0, h1, c] of bands) wq(zf, xx, fb + h0, zf + 9, xx, fb + h0, zf + 9, xx, fb + h1, zf, xx, fb + h1, F(c)); } }
    // the portholes, warm
    // the hull's detail: plate seams catching the quay light, a gunwale stripe (Nippon Maru's varnished rail) or the liner's white sheer,
    // a row (two on the liner) of portholes lit warm, the hawse pipe and anchor at the bow, the stern's name board
    { const cz = camSeg(), hik = o.ship === 'hikawa'; PJ(z0 + len / 2, xb, fb * .5); const u = PJU;
      if(u > PX * 1.2){ const za = Math.max(z0 + zt, cz + .6); if(z1 > za) wq(za, xb - .006, fb * .78, z1, xb - .006, fb * .78, z1, xb - .006, fb * .86, za, xb - .006, fb * .86, F(hik ? '#e8e8ee' : '#7a5a3a')); }
      if(u > PX * 2.5){ const nr = hik ? 2 : 1, NP = Math.round(len / 3.2); for(let r = 0; r < nr; r++) for(let k = 1; k < NP; k++){ const z = z0 + zt + (len - zt) * k / NP; if(z < cz + 1) continue; const hv = H1(k * 3.3 + z0 + r * 17); if(hv > .62) continue; PJ(z, xb - .006, fb * (hik ? .62 - r * .26 : .55)); const ps = Math.max(PX, snp(PJU * .045)); R(PJX - ps / 2, PJY - ps / 2, ps, ps, F(hv < .4 ? C.warm : '#3a3a44')); } }
      if(u > PX * 4){ const NS2 = Math.round(len / 7); for(let k = 1; k < NS2; k++){ const z = z0 + zt + (len - zt) * k / NS2; if(z < cz + 1) continue; PJ(z, xb - .004, .04); const ax = PJX, ay = PJY; PJ(z, xb - .004, fb * .74); R(ax, PJY, PX, ay - PJY, F(hik ? '#22242e' : '#a8aec0')); } }
      if(z0 + zt > cz + 1 && u > PX * 2){ PJ(z0 + zt * .6, xb + .18, fb * .7); const as = Math.max(PX, snp(PJU * .1)); R(PJX - as / 2, PJY - as / 2, as, as, F('#0c0c12')); R(PJX - as * .3, PJY + as * .5, as * .6, as * 1.2, F('#3a3a44')); }
      if(u > PX * 3){ PJ(z1 - 4, xb - .006, fb * .45); R(PJX - PJU * .25, PJY - PJU * .06, PJU * .5, Math.max(PX, PJU * .12), F(hik ? '#c8b070' : '#e8d8a0')); } }
    if(!rbOK()) return; rbBegin(true); shipLines(o, now, S, F, false); rbFlush(); }

  // ---------------------------------------------------------------- the red-brick warehouses (Akarenga)
  /* Three storeys of brick, every bay an arched window lit orange, iron balconies, a dark slate roof with its ridge, stair towers at the
     ends. The facade is floodlit warm from the plaza. Drawn as world faces: the long face toward the road, the gable end toward the camera. */
  function drawAka(o, now){ const gf = objFog(o), F = c => fc(c, gf), z0 = o.z0, z1 = o.z1, xf = o.x, sd = xf < 0 ? -1 : 1, D = 2.1, xb = xf + sd * D, Hw = 1.75, Hr = 2.45, cz = camSeg();
    if(z1 < cz + 1) return; const za = Math.max(z0, cz + .6), front = z0 > cz + .6;
    PJ((za + z1) / 2, xf, 1); const u = PJU;
    // the long face, the roof's slope leaning back to the ridge, the ridge
    wq(za, xf, 0, z1, xf, 0, z1, xf, Hw, za, xf, Hw, F(C.brick[1]));
    wq(za, xf, Hw, z1, xf, Hw, z1, xf + sd * D * .5, Hr, za, xf + sd * D * .5, Hr, F(C.slate[2]));
    if(u > PX * .8) wq(za, xf - sd * .06, Hw - .02, z1, xf - sd * .06, Hw - .02, z1, xf, Hw + .07, za, xf, Hw + .07, F(C.slate[3]));
    if(front){ wq(z0, xf, 0, z0, xb, 0, z0, xb, Hw, z0, xf, Hw, F(C.brick[0])); PJ(z0, xf, Hw); const ax = PJX, ay = PJY; PJ(z0, xb, Hw); const bx = PJX, by = PJY; PJ(z0, xf + sd * D * .5, Hr + .15); pxPoly(ax, ay, bx, by, PJX, PJY, F(C.brick[0]));
      PJ(z0, xf + sd * D * .5, Hr + .15); const tx = PJX, ty = PJY; PJ(z0, xf - sd * .05, Hw); poly(PJX, PJY, tx, ty, tx, ty + Math.max(PX, u * .06), PJX, PJY + Math.max(PX, u * .06), F(C.slate[3])); }
    // the floodlit lower wall, a stone band between storeys
    if(u > PX * .6){ wq(za, xf - sd * .01, .02, z1, xf - sd * .01, .02, z1, xf - sd * .01, .5, za, xf - sd * .01, .5, F(C.brick[2]));
      for(const hb of [.58, 1.15]) wq(za, xf - sd * .015, hb, z1, xf - sd * .015, hb, z1, xf - sd * .015, hb + .05, za, xf - sd * .015, hb + .05, F('#8a6a58')); }
    // the bays: an arched window on each storey, lit orange; balconies on the upper two
    if(u * .2 > PX * .7){ const bay = 4.5, n = Math.floor((z1 - z0) / bay); for(let k = 0; k < n; k++){ const zm = z0 + (k + .5) * bay; if(zm < cz + 1.2) continue; const tower = k === 0 || k === n - 1 || k === (n >> 1);
        for(let f = 0; f < 3; f++){ const h0 = .14 + f * .57, h1 = h0 + .36, hv = H1(z0 + k * 7.1 + f * 3.3), lit = hv < .82, col = F(lit ? (hv < .3 ? '#ffb050' : hv < .6 ? '#ffc870' : '#ff9a40') : '#2a1810');
          wq(zm - bay * .22, xf - sd * .02, h0, zm + bay * .22, xf - sd * .02, h0, zm + bay * .22, xf - sd * .02, h1, zm - bay * .22, xf - sd * .02, h1, col);
          if(u > PX * 4 && zm - bay * .22 > cz + .7){ PJ(zm, xf - sd * .02, h1); const ax = PJX, ay = PJY; PJ(zm - bay * .22, xf - sd * .02, h1); const w2 = Math.min(Math.abs(PJX - ax), W * .2); poly(ax - w2, ay, ax + w2, ay, ax + w2 * .5, ay - w2 * .45, ax - w2 * .5, ay - w2 * .45, col);
            if(lit){ PJ(zm, xf - sd * .02, h0); R(PJX - PX / 2, PJY - (h1 - h0) * u, PX, (h1 - h0) * u, F('#3a2016')); } }
          if(f > 0 && u > PX * 2) wq(zm - bay * .3, xf - sd * .12, h0 - .02, zm + bay * .3, xf - sd * .12, h0 - .02, zm + bay * .3, xf - sd * .12, h0 + .03, zm - bay * .3, xf - sd * .12, h0 + .03, F('#2a2a30')); }
        if(tower && u > PX * 1.5 && zm - bay * .3 > cz + .7){ wq(zm - bay * .3, xf - sd * .03, Hw, zm + bay * .3, xf - sd * .03, Hw, zm + bay * .3, xf - sd * .03, Hw + .45, zm - bay * .3, xf - sd * .03, Hw + .45, F(C.brick[1]));
          PJ(zm - bay * .3, xf - sd * .03, Hw + .45); const ax = PJX, ay = PJY; PJ(zm + bay * .3, xf - sd * .03, Hw + .45); const bx = PJX, by = PJY; PJ(zm, xf - sd * .03, Hw + 1); pxPoly(ax, ay, bx, by, PJX, PJY, F(C.slate[1])); } } }
    // the floodlights' warm wash on the facade and the plaza
    if(u > PX * 1.5){ PJ(Math.max(z0, cz + 4), xf, 0); const ax = PJX; PJ(z1, xf, 0); cx.globalCompositeOperation = 'lighter'; const steps = 3;
      for(let s = 0; s < steps; s++){ const h = .25 + s * .3; PJ(za, xf - sd * .03, 0); const y0a = PJY, x0a = PJX; PJ(za, xf - sd * .03, h); const y1a = PJY; PJ(z1, xf - sd * .03, 0); const y0b = PJY, x0b = PJX; PJ(z1, xf - sd * .03, h);
        poly(x0a, y0a, x0b, y0b, x0b, PJY, x0a, y1a, rgbaA('255,150,70', .06 * (1 - gf))); } cx.globalCompositeOperation = 'source-over'; void ax; } }

  const ODRAW = { landmark:drawLandmark, wheel:drawWheel, qs:drawQS, sail:drawSail, coaster:drawCoaster, rising:drawRising, marine:drawMarine, ship:drawShip, aka:drawAka, moor:drawMoor, pier:drawPier };
  function drawObj(o, now){ if(o.f === DRAWN) return; o.f = DRAWN; const fn = ODRAW[o.kind]; if(!fn || ABL.includes(o.kind)) return; const a = objFade(o); if(a <= .01) return; const ga = cx.globalAlpha; if(a < 1) cx.globalAlpha = ga * a; OBJ_ON = true; try{ fn(o, now); } finally { cx.globalAlpha = ga; OBJ_ON = false; } }
  // reflections, into the reflection buffer (things on the water side only)
  const ABL = (DBQ.get('mmabl') || '').split(',');   // (test switch: ?mmabl=<kind>,refl skips those objects, or every reflection)
  function reflObj(o, now){ if(o.x < 2) return; if(o.z1 < camSeg() + 1) return; if(ABL.includes('refl')) return;
    if(o.kind === 'wheel' && !o.gone){ const st = o.st || (o.st = { z:o.hz, x:o.x, h:WR + 1.35, yaw:.5, roll:0, rot:0 }); wheelGeo(st, now, true, objFog(o)); }
    else if(o.kind === 'sail') reflSail(o);
    else if(o.kind === 'ship'){ const S = SHIP[o.ship]; shipLines(o, now, S, c => c, true); }
    else if(o.kind === 'moor') reflMoor(o); else if(o.kind === 'pier') reflPier(o);
    else if(o.kind === 'coaster'){ for(let k = 0; k < CST.length; k += 3){ const p = CST[k]; PJ(o.z0 + p[0], o.x + p[1], -.5 - p[2]); rdot(PJX, PJY, c32('#8a3a7a', 190)); } } }

  // ---------------------------------------------------------------- the backdrop: the far shore, the water, the big objects far away
  function backdrop(o){ cam(); const { hz, sk, now } = o; if(sk.low !== fogLow){ fogLow = sk.low; FCM.clear(); } buildPan(); RIPT = reduce ? 0 : now / 650;
    const off = (((skyPar('mid') / PX) % PW) + PW) % PW, sw = Math.min(PW, Math.ceil(W / PX) + 1);
    // the water: bands darkening toward you, the sky's low light caught near the horizon
    const bands = [[0, '#16243e'], [.025, C.water[0]], [.07, C.water[1]], [.16, C.water[2]], [.32, C.water[3]]];
    for(let k = 0; k < bands.length; k++){ const y0 = snp(hz + (H - hz) * bands[k][0]), y1 = k + 1 < bands.length ? snp(hz + (H - hz) * bands[k + 1][0]) : H; cx.fillStyle = mixc(bands[k][1], sk.low, .15); cx.fillRect(0, y0, W, y1 - y0); }
    cx.imageSmoothingEnabled = false; cx.drawImage(PAN, off, 0, sw, SH, 0, hz - (SH - 1) * PX, sw * PX, SH * PX); cx.drawImage(REF, off, 0, sw, SHR, 0, hz + PX, sw * PX, SHR * PX);
    // the big objects: reflections first (all of them, into the reflection buffer), then the far ones drawn here
    const L = objsNow(); r2Clear(); if(rb2OK()) for(const ob of L) reflObj(ob, now);
    for(const ob of L) if(ob.z1 - camSeg() >= NEARN) drawObj(ob, now);
    return true; }

  // ---------------------------------------------------------------- props along the road
  // the harbour lamp (promenade): an iron post, a cross-arm, two lantern globes
  function drawHLamp(sp, x, y, uw, fog, now){ const a = 1 - fog * .8; if(a < .05 || x < -uw || x > W + uw) return; const F = c => fc(c, fog), h = uw * .98, pw = Math.max(PX, snp(uw * .026));
    R(x - pw * 1.6, y - uw * .07, pw * 3.2, uw * .07, F('#20222c')); R(x - pw / 2, y - h, pw, h, F('#14161e')); if(uw > 20) R(x - pw, y - h * .62, pw * 2, Math.max(PX, uw * .02), F('#2a2c36'));
    R(x - uw * .17, y - h * .9, uw * .34, Math.max(PX, uw * .012), F('#1a1c24')); R(x - pw * .8, y - h * 1.04, pw * 1.6, h * .14, F('#1a1c24'));
    for(const q of [-1, 1]){ const gx = x + q * uw * .15, gy = y - h * .9 - uw * .045, gs = Math.max(PX, snp(uw * .06)); R(gx - gs / 2, gy - gs * .55, gs, gs * 1.1, '#fff2cc'); if(uw > 14) R(gx - gs * .6, gy - gs * .75, gs * 1.2, Math.max(PX, gs * .2), F('#22242c')); glow(gx, gy, Math.max(PX * 2, uw * .2), '#ffcf80', .5 * a); }
    if(fog < .55 && uw > 8){ pool(x, y + uw * .02, uw * .55, uw * .1, '#ffcf80', .3 * a); } }
  // the city lamp (left): a slim pole with a white LED blade reaching over the sidewalk
  function drawCLamp(sp, x, y, uw, fog, now){ const a = 1 - fog * .8; if(a < .05) return; const F = c => fc(c, fog), h = uw * 1.12, pw = Math.max(PX, snp(uw * .02)), ax = x + uw * .3;
    R(x - pw / 2, y - h, pw, h, F('#2a2e3a')); R(Math.min(x, ax), y - h, Math.abs(ax - x), Math.max(PX, uw * .014), F('#2a2e3a')); R(ax - uw * .09, y - h, uw * .14, Math.max(PX, uw * .025), F('#3a3e4a')); R(ax - uw * .08, y - h + Math.max(PX, uw * .022), uw * .12, Math.max(PX, uw * .008), '#f0f6ff');
    glow(ax - uw * .02, y - h + uw * .03, Math.max(PX * 2, uw * .2), '#d8e8ff', .4 * a); }
  // anchor-chain bollards along the quay (Yamashita Park): a black post with a pale cap, a chain sagging to the next
  function drawBol(sp, x, y, uw, fog, now){ if(fog > .3 || uw < 4 || x > W + uw || x < -uw) return; const F = c => fc(c, fog), h = uw * .13, w = Math.max(PX, snp(uw * .028)); R(x - w / 2, y - h, w, h, F('#14161c')); R(x - w / 2, y - h, w, Math.max(PX, uw * .015), F('#4a4e5c'));
    const t = segs[sp.k + 3]; if(!t || !t.p1.screen.w || t.p1.camera.z <= 0) return; const q = t.p1.screen, x2 = q.x + sp.x * q.w, y2 = q.y - q.w * .11, x1 = x, y1 = y - h * .85; if(Math.abs(x2 - x1) > W) return;
    cx.fillStyle = F('#2a2c34'); const n = Math.max(3, Math.min(14, Math.round(Math.hypot(x2 - x1, y2 - y1) / (PX * 2)))); for(let j = 0; j <= n; j++){ const f = j / n, xx = lerp(x1, x2, f), yy = lerp(y1, y2, f) + Math.sin(f * Math.PI) * uw * .05; cx.fillRect(snp(xx), snp(yy), PX, PX); } }
  function drawBench(sp, x, y, uw, fog){ if(fog > .45) return; const F = c => fc(c, fog); R(x - uw * .14, y - uw * .07, uw * .28, Math.max(PX, uw * .018), F('#4a3a2a')); R(x - uw * .14, y - uw * .12, uw * .28, Math.max(PX, uw * .016), F('#3a2c20')); for(const q of [-1, 1]) R(x + q * uw * .11, y - uw * .07, Math.max(PX, uw * .015), uw * .07, F('#16161c')); }

  // street trees wrapped in white fairy lights (Minato Mirai's winter illumination): sprites at six native sizes
  const TREE_H = [10, 14, 20, 28, 40, 56, 78], TREE = [];
  function treeSpr(si, v){ const k = P + 'tree' + si + '_' + v; if(SPR[k]) return SPR[k]; const h = TREE_H[si], w = Math.round(h * .7) | 1, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const cxm = (w - 1) / 2, th = Math.round(h * .3), cy0 = h * .06, cy1 = h - th + 1, rw = w * .48; let sd = 7 + si * 13 + v * 101; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const inC = (x, y) => { const ty = (y - cy0) / (cy1 - cy0); if(ty < 0 || ty > 1) return false; const half = rw * (.55 + .45 * Math.sin(Math.min(1, ty * 1.15) * Math.PI * .85)); return Math.abs(x - cxm) < half * (ty > .85 ? (1 - ty) / .15 : 1); };
    g.fillStyle = '#0c0f12'; const tw = Math.max(1, Math.round(h / 16)); g.fillRect(Math.round(cxm - tw / 2), h - th, tw, th);
    // branches: limbs fanning up from the trunk, each forking once; the strings of lights are wound along them (the photographs: the
    // light follows the limbs, so a lit tree still shows its branching), with a thin dusting between and a few brighter bulbs
    const pts = [], lim = [];
    for(let b = 0; b < 5; b++){ const ang = -Math.PI / 2 + (b - 2) * .34 + (rnd() - .5) * .18, len = (cy1 - cy0) * (.6 + rnd() * .3), x0 = cxm, y0 = h - th; lim.push([x0, y0, ang, len]);
      const fa = ang + (rnd() < .5 ? -.45 : .45), fl = len * (.45 + rnd() * .2), ft = .45 + rnd() * .2; lim.push([x0 + Math.cos(ang) * len * ft, y0 + Math.sin(ang) * len * ft, fa, fl]); }
    g.fillStyle = '#16191e'; for(const [x0, y0, ang, len] of lim) for(let t = 0; t < len; t += .5){ const xx = Math.round(x0 + Math.cos(ang) * t), yy = Math.round(y0 + Math.sin(ang) * t); if(yy < 0) break; g.fillRect(xx, yy, 1, 1); if(t > len * .3 && rnd() < (si < 2 ? .55 : .42)) pts.push([xx + (rnd() < .5 ? 0 : (rnd() < .5 ? -1 : 1)), yy]); }
    const dens = si < 2 ? .05 : si < 4 ? .026 : .016;   // (round 4: thinner dusting, so the lit limbs read and the crown is not speckle)
    for(let y = 0; y < h - th + 2; y++) for(let x = 0; x < w; x++){ if(inC(x + .5, y + .5) && rnd() < dens) pts.push([x, y]); }
    for(const [x, y] of pts){ const r = rnd(); g.fillStyle = r < .12 ? '#ffffff' : r < .6 ? '#fff0c8' : '#c8b490'; g.fillRect(x, y, 1, 1); }
    return SPR[k] = c; }
  function drawTree(sp, x, y, uw, fog){ const hh = uw * 1.05, a = 1 - fog * .85; if(a < .05 || hh < PX * 3) return; const hp = hh / PX; let si = 0; while(si < TREE_H.length - 1 && TREE_H[si + 1] <= hp * 1.06) si++;
    const spr = treeSpr(si, sp.v), k = hh / spr.height; const sf = scaleFade(k, 5, 9); if(sf <= 0) return; cx.globalAlpha = a * sf; blit(spr, x, y, k); cx.globalAlpha = 1;
    if(fog < .5){ glow(x, y - hh * .6, hh * .45, '#fff0c8', .08 * a * sf); pool(x, y, hh * .22, hh * .045, '#ffe0a0', .3 * a * sf); } }   // (the uplight at its foot)

  // strolling couples on the promenade: small people at native sizes, legs scissoring; they walk the promenade at a stroll
  const PPL_H = [5, 7, 10, 14, 20, 28], COATS = [['#2a2a44', '#6a3a3a'], ['#3a2a22', '#20283a'], ['#5a4a3a', '#2a3a4a'], ['#1c1c24', '#7a5a4a']];
  function pplSpr(si, v, fr){ const k = P + 'ppl' + si + '_' + v + '_' + fr; if(SPR[k]) return SPR[k]; const h = PPL_H[si], w = Math.max(3, Math.round(h * .62)), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const person = (x0, hh, coat, skin, hair, ph) => { const hw = Math.max(1, Math.round(hh * .2)), head = Math.max(1, Math.round(hh * .15)), body = Math.max(1, Math.round(hh * .45)), legs = hh - head - body, y0 = h - hh;
      g.fillStyle = hair; g.fillRect(x0, y0, hw, head); if(head > 1){ g.fillStyle = skin; g.fillRect(x0 + (hw > 1 ? 1 : 0), y0 + 1, Math.max(1, hw - 1), head - 1); }
      g.fillStyle = coat; g.fillRect(x0 - (hh > 9 ? 1 : 0), y0 + head, hw + (hh > 9 ? 2 : 0), body); g.fillStyle = mixc(coat, '#ffd890', .25); g.fillRect(x0 - (hh > 9 ? 1 : 0), y0 + head, 1, Math.max(1, body - 1));
      g.fillStyle = '#0e0e14'; const lw = Math.max(1, hw >> 1); const sp2 = ph === 1 ? 1 : ph === 3 ? -1 : 0; g.fillRect(x0 + Math.max(0, sp2), y0 + head + body, lw, legs); g.fillRect(x0 + hw - lw - Math.max(0, -sp2), y0 + head + body, lw, legs - (ph % 2 ? 1 : 0)); };
    const [c1, c2] = COATS[v % COATS.length], h2 = Math.max(4, Math.round(h * .9)); person(0, h, c1, '#d8a888', '#1a1410', fr); person(Math.max(2, Math.round(w * .5)), h2, c2, '#e0b090', '#2a1a14', (fr + 2) % 4);
    if(h >= 10){ g.fillStyle = '#c89a80'; g.fillRect(Math.round(w * .38), h - Math.round(h * .45), Math.max(1, Math.round(w * .2)), 1); }
    return SPR[k] = c; }
  function drawCpl(sp, x, y, uw, fog, now){ if(fog > .5) return; const hh = uw * .3, hp = hh / PX; if(hp < 3) return; let si = 0; while(si < PPL_H.length - 1 && PPL_H[si + 1] <= hp * 1.08) si++;
    const t = now / 1000, walk = reduce ? 0 : t * .9 * sp.v, s = segs[sp.k], ds = ((walk + sp.ph * 12) % 12 + 12) % 12 - 6; let xx = x, yy = y, uu = uw;
    { const j = sp.k + Math.floor(ds), t2 = segs[j], t3 = segs[j + 1]; if(t2 && t3 && t2.p1.screen.w && t3.p1.screen.w && t2.p1.camera.z > 0){ const f = ds - Math.floor(ds), A = t2.p1.screen, B = t3.p1.screen; uu = lerp(A.w, B.w, f); xx = lerp(A.x, B.x, f) + sp.x * uu; yy = lerp(A.y, B.y, f); } }
    const edge = Math.min(1, (6 - Math.abs(ds)) / 1.2), spr = pplSpr(si, sp.vr, reduce ? 0 : Math.floor(t * 4 + sp.ph * 4) % 4), k = uu * .3 / spr.height, a = (1 - fog * 1.2) * edge * scaleFade(k, 6, 10); if(a <= .02) return; void s;
    cx.globalAlpha = a; blit(spr, xx, yy, k); cx.globalAlpha = 1; }

  // illuminated fountains on the promenade by the heart: jets of water lit blue-white, rising and falling slowly
  function drawFount(sp, x, y, uw, fog, now){ if(fog > .6) return; const F = c => fc(c, fog), a = 1 - fog; R(x - uw * .24, y - uw * .035, uw * .48, uw * .035, F('#3a4050')); R(x - uw * .22, y - uw * .03, uw * .44, Math.max(PX, uw * .012), F('#5a8ab8'));
    const t = reduce ? 1.5 : now / 1000; for(let j = 0; j < 5; j++){ const jx = x + (j - 2) * uw * .09, ph = t * .8 + j * .9 + sp.k, hgt = uw * (.25 + .2 * (.5 + .5 * Math.sin(ph))) * (j === 2 ? 1.6 : 1); const n = Math.max(3, Math.round(hgt / PX / 2));
      for(let k = 0; k < n; k++){ const f = k / n, yy = y - uw * .03 - hgt * f; cx.fillStyle = f > .8 ? '#e8f8ff' : f > .4 ? F('#a8d8ff') : F('#5a9ad8'); cx.globalAlpha = a * (.5 + .5 * f); cx.fillRect(snp(jx + Math.sin(ph * 2 + f * 5) * PX * .5), snp(yy), PX, PX * 2); }
      cx.globalAlpha = 1; }
    glow(x, y - uw * .2, uw * .4, '#8ad0ff', .2 * a); }

  // cruise boats out on the harbour, dressed in bulbs, crossing slowly (each drawn from the lane marker under its stern)
  const BOATS = [{ x:6.6, v:1.9, ph:0 }, { x:9.4, v:-1.4, ph:.5 }, { x:12.5, v:1.1, ph:.25 }];
  // each boat crosses its own stretch of the visit (before the heart's basin, or after it), fading in and out at the ends of its run
  const boatSpan = (b, L) => { const k = BOATS.indexOf(b); return !L.ok ? [L.B0 + 150, L.B1 - 150] : k < 2 ? [L.B0 + 150, L.H - 440] : [L.H + 160, L.B1 - 150]; };
  const boatZ = (b, L, now) => { const [a, e] = boatSpan(b, L), span = e - a; if(span < 120) return -1e9; const t = reduce ? 0 : now / 1000; return a + (((b.ph * span + t * b.v) % span) + span) % span; };
  const boatA = (b, L, z) => { const [a, e] = boatSpan(b, L); return clamp(Math.min(z - a, e - z - 32) / 30, 0, 1); };
  function drawBoat(b, z, now, fog){ const F = c => fc(c, fog), zb = z, zs = z + 32, xb = b.x - .55; if(zb < camSeg() + 1) return;
    wq(zb + 4, xb, -.2, zs, xb, -.2, zs, xb, .4, zb + 4, xb, .5, F('#c8ccd8')); wq(zb, b.x, -.2, zb + 4, xb, -.2, zb + 4, xb, .5, zb, b.x, .55, F('#9aa0b4')); wq(zb + 4, xb, -.2, zs, xb, -.2, zs, xb, -.05, zb + 4, xb, -.05, F('#2a5ab0'));
    wq(zb + 8, xb + .15, .4, zs - 3, xb + .15, .4, zs - 3, xb + .15, .85, zb + 8, xb + .15, .85, F('#d8dce4')); wq(zb + 12, xb + .25, .85, zs - 6, xb + .25, .85, zs - 6, xb + .25, 1.2, zb + 12, xb + .25, 1.2, F('#e4e8ee'));
    PJ(zb + 18, xb, .6); const u = PJU; if(u > PX * 2) for(const [h, n] of [[.55, 8], [.98, 6]]) for(let k = 0; k < n; k++){ PJ(zb + 9 + k * (zs - zb - 12) / n, xb + .15, h); R(PJX - u * .05, PJY - u * .06, Math.max(PX, u * .1), Math.max(PX, u * .1), F(C.warm)); }
    if(!rbOK()) return; rbBegin(true); const bl = c32(F(C.warm)); for(const [za, ha, zz, hb] of [[zb, .6, zb + 16, 2.2], [zb + 16, 2.2, zs, .8]]) for(let j = 0; j <= 10; j++){ const t = j / 10; PJ(lerp(za, zz, t), b.x, lerp(ha, hb, t) - Math.sin(t * Math.PI) * .25); dot(PJX, PJY, bl); }
    PJ(zb + 16, b.x, 1.2); const mx = PJX, my = PJY; PJ(zb + 16, b.x, 2.2); line(mx, my, PJX, PJY, c32(F('#8a8a96'))); rbFlush(); }
  function reflBoat(b, z){ if(z < camSeg() + 1) return; for(let k = 0; k < 8; k++){ PJ(z + 9 + k * 2.5, b.x - .4, -.5 - .55); rdot(PJX, PJY, c32('#9a7a40', 200), 2); } PJ(z + 16, b.x, -.5 - 2.2); rdot(PJX, PJY, c32('#7a6a40', 190), 2); }

  // ---------------------------------------------------------------- the city side: a kit of real waterfront building types (minato.md, rounds 2 and 4)
  /* Kellan: "a little more variation in the kinds of buildings and their detail", then "we should ensure the detail is up to the standard
     that we expect". Each kind is drawn from night photographs of Minato Mirai 21 and the Tokyo Bay waterfront (minato.md sections 9 and 11),
     at real size: an office storey is FHO (about 3.3 m), a flat or a hotel room FHR (about 2.9 m), as Shuto's kit (.62 = 3.6 m). Bays are
     world-anchored runs of P segments, so a near wall never repeats its interior every segment. Every kind has its own silhouette and its own
     light signature, made to read at mid distance, not only up close:
       slab     the glass office: a curtain wall that mirrors the sky (paler toward its top) and, near the heart, the wheel; offices light
                whole floor plates, cool or warm by section; a lit glass crown with an LED line
       hq       the precast corporate HQ: stone piers and spandrels round punched windows, pale fins; a set-back crown, uplit, carrying a
                lit corporate plate (a generic mark, never a real logo); a helipad's ring of perimeter lights on the roof and a red beacon
       hotel    warm tile, rooms in pairs with curtains and bedside lamps; a lit restaurant floor; three blue LED arcs round its crown; a
                vertical name blade on the end; the warm double-height lobby and its canopy
       atrium   the mall podium (Bay Quarter, Queen's Square's galleria): a three-storey glass atrium lit warm white, escalators crossing it
                as bright diagonals, hanging banners, people; a glowing white canopy band along its top
       mansion  the tower mansion: a pale balcony parapet on every floor, warm and TV-blue windows, AC units, a crown light
       ware     the 1970s concrete warehouse: pilasters, roll-up doors (some open on a sodium-lit inside), a painted number
       cafe     the warehouse turned cafe and gallery: a glazed ground floor with people, a festoon, one big painted wave across its wall
       shop     the low tiled block: a lit shopfront under a striped awning, a sign blade
     Placement is world-anchored in cells of CP segments: even cells draw from {slab, hq, hotel, atrium} (cool to warm towers) and odd cells
     from {mansion, ware, cafe, shop} (low and warm), so two neighbours are never the same kind; a cell also never repeats the kind two
     cells back. Near the heart every kind stands low (the Landmark and Queen's Square rise over the street). Some tower frontages carry
     the MM21 pedestrian deck at the second floor. */
  const FHO = .56, FHR = .5;
  const CK = {
    slab:{ g:0, w:3, h:[3.4, 6.2], len:[11, 17], fh:FHO, D:[1.2, 1.6], P:[4, 5] }, hq:{ g:0, w:2.2, h:[3.8, 6.4], len:[12, 17], fh:FHO, D:[1.3, 1.7], P:[3, 4] },
    hotel:{ g:0, w:1.8, h:[3.6, 5.6], len:[12, 16], fh:FHR, D:[1.0, 1.3], P:[4, 4] }, atrium:{ g:0, w:1.6, h:[1.9, 2.5], len:[14, 18], fh:FHO, D:[1.4, 1.8], P:[5, 6] },
    mansion:{ g:1, w:2.6, h:[4.0, 6.8], len:[10, 15], fh:FHR, D:[1.0, 1.3], P:[4, 4] }, ware:{ g:1, w:1.7, h:[1.0, 1.4], len:[14, 18], fh:.5, D:[1.4, 1.8], P:[3, 3] },
    cafe:{ g:1, w:1.7, h:[1.0, 1.3], len:[13, 18], fh:.5, D:[1.3, 1.7], P:[2, 2] }, shop:{ g:1, w:2, h:[1.3, 1.9], len:[8, 13], fh:FHR, D:[.9, 1.2], P:[3, 3] } };
  const CKG = [[], []]; for(const k in CK) CKG[CK[k].g].push(k);
  const CP = 20, CRUN = new Map();
  // palettes per kind, a few variants each (hue-shifted ramps: shadows lean blue-violet, lit things lean warm or cyan); light temperature
  // is set per kind and per building (wr: the share of lit sections that are tungsten), so the street alternates cool glass and warm stone
  const CPAL = {
    slab:[{ face:'#0a1426', mul:'#1c2c4a', lit:'#bcd4f4', litW:'#ffe2b0', dim:'#34507a', lob:'#d8e6ff', crown:'#4ab8e0', crownD:'#163a58', led:'#e8fcff', wr:.15 },
      { face:'#08181e', mul:'#163038', lit:'#a8e4e8', litW:'#f4e0b0', dim:'#2a6068', lob:'#c8f4f0', crown:'#5ae0c8', crownD:'#124038', led:'#e8fff8', wr:.2 },
      { face:'#100f22', mul:'#24223e', lit:'#b4b8dc', litW:'#ffd8b8', dim:'#424470', lob:'#d8d4f0', crown:'#8a7ad0', crownD:'#24204a', led:'#f4f0ff', wr:.3 }],
    hq:[{ face:'#3a3c48', faceD:'#2a2c36', fin:'#5a5e70', finL:'#8a90a6', win:'#d0dcf2', winW:'#ffe0b0', dark:'#10121a', crown:'#6a7290', plate:'#f4f8ff', mark:'#3a8aff', ink:'#1a2a4a', led:'#eef4ff', wr:.25 },
      { face:'#463c38', faceD:'#342c2a', fin:'#6a5e58', finL:'#a08e80', win:'#ffe4bc', winW:'#ffd09a', dark:'#140f10', crown:'#8a7464', plate:'#fff6e4', mark:'#e84a3a', ink:'#3a1a14', led:'#fff4dc', wr:.6 },
      { face:'#454b56', faceD:'#343a44', fin:'#6a727e', finL:'#a0a8b4', win:'#e0ecf8', winW:'#fff0c8', dark:'#12161e', crown:'#76829a', plate:'#f0fff8', mark:'#2ab88a', ink:'#123a2a', led:'#e8fff4', wr:.35 }],
    hotel:[{ face:'#4a3a36', pil:'#5e4a44', win:'#ffd29a', cur:'#f0a868', cur2:'#e8c890', dark:'#1c1416', lob:'#ffcf88', top:'#ffe0b0', arc:'#3aa8ff', arcH:'#bfe8ff', blade:'#fff4e0', ink:'#b01a1a', wr:1 },
      { face:'#343840', pil:'#464a54', win:'#ffe2b8', cur:'#e8b880', cur2:'#d8d0b8', dark:'#121418', lob:'#ffd8a0', top:'#fff0d0', arc:'#5ae0ff', arcH:'#e0fbff', blade:'#f0f8ff', ink:'#1a3a9a', wr:1 }],
    atrium:[{ frame:'#1c1e2a', glass:'#b8986a', glassD:'#b8966a', slab:'#3a3440', esc:'#fff8e8', escS:'#7a6a5a', canopy:'#eef6ff', ban:['#e8503a', '#3a8ad8', '#f0c040'], wr:1 },
      { frame:'#161c26', glass:'#86a2b4', glassD:'#88a8b8', slab:'#2a3440', esc:'#ffffff', escS:'#5a7080', canopy:'#e0fff8', ban:['#ff6a9a', '#4ad0b0', '#ffd84a'], wr:0 }],
    mansion:[{ face:'#18181f', par:'#767a8c', parT:'#a2a8bc', part:'#4e5262', end:'#3a3c48', ac:'#8a8e98' }, { face:'#1a1816', par:'#8a8278', parT:'#b4ac9e', part:'#5a544c', end:'#46403a', ac:'#9a948a' },
      { face:'#141a20', par:'#6a7884', parT:'#98a8b4', part:'#46525c', end:'#34404a', ac:'#86929c' }],
    ware:[{ face:'#464a56', pil:'#383c48', rim:'#62687a', sh:'#5a5e6a', rib:'#3c404c', num:'#c8ccd4' }, { face:'#4e4a44', pil:'#3e3a36', rim:'#6e6860', sh:'#5e5a54', rib:'#403c38', num:'#d8d0c0' }, { face:'#3e4a50', pil:'#323c42', rim:'#5a6a72', sh:'#4e5a62', rib:'#36424a', num:'#c0d0d8' }],
    cafe:[{ face:'#2e2a30', glass:'#ffc77a', in:'#7a4a2a', mul:'#1a1414', wave:'#2a4a7a', waveD:'#1a2e52', foam:'#e8eef4' }, { face:'#2a2e2c', glass:'#ffd28a', in:'#6a4a30', mul:'#141614', wave:'#7a3a3a', waveD:'#4e2228', foam:'#f4e8d8' }],
    shop:[{ face:'#3a2c30', win:'#ffd8a0', aw:['#c83a3a', '#e8e0d8'], sh:'#ffe0b0', blade:'#ff8a5a' }, { face:'#2c3034', win:'#fff0c8', aw:['#2a7a5a', '#e8e0d8'], sh:'#e8f0ff', blade:'#7af0ff' }, { face:'#342e26', win:'#ffcf88', aw:['#3a5aa8', '#e8e0d8'], sh:'#ffd8a0', blade:'#ffd04a' }] };
  const rawKind = c => { const list = CKG[c & 1]; let tot = 0; for(const k of list) tot += CK[k].w; let r = H1(c * 7.31 + 2.9) * tot; for(const k of list){ r -= CK[k].w; if(r < 0) return k; } return list[0]; };
  const FKIND = DBQ.get('mmck');   // (test switch: ?mmck=<kind> makes every street-row building that kind, for galleries)
  function cityAt(i, L){ const c = Math.floor(i / CP), list = CKG[c & 1]; let kind = rawKind(c); if(kind === rawKind(c - 2)) kind = list[(list.indexOf(kind) + 1) % list.length];   // (never the kind two cells back either)
    if(FKIND && CK[FKIND]) kind = FKIND;
    let kd = CK[kind]; const len = Math.min(CP - 2, kd.len[0] + Math.floor(H1(c * 3.7 + 1.1) * (kd.len[1] - kd.len[0] + 1))), b0 = c * CP + 1 + Math.floor(H1(c * 5.3 + .7) * (CP - 1 - len));
    if(i < b0 || i >= b0 + len) return null;
    const low = !!(L && L.ok && b0 + len >= L.H - 480 && b0 <= L.H + 140), key = b0 + (low ? 'L' : ''); let B = CRUN.get(key); if(B) return B;
    const s = c * 1.913 + .37, pal = CPAL[kind], h = kd.h[0] + H1(s * 3.3) * (kd.h[1] - kd.h[0]), P = kd.P[0] + Math.floor(H1(s * 7.7) * (kd.P[1] - kd.P[0] + 1)), cp = pal[Math.floor(H1(s * 4.1) * pal.length)];
    B = { kind, b0, len, seed:s, X:2.4 + [0, .08, .18][Math.floor(H1(s * 2.3) * 3)], D:kd.D[0] + H1(s * 6.1) * (kd.D[1] - kd.D[0]), h:low ? Math.min(h, (kind === 'slab' ? 2.4 : 1.6) + H1(s * 9.7) * .6) : h, fh:kd.fh,
      c:cp, v:Math.floor(H1(s * 8.3) * 4), pl:.45 + H1(s * 5.7) * .3, P, ph:Math.floor(H1(s * 1.3) * P), sl:Math.max(4, Math.ceil(len / (2 + Math.floor(H1(s * 6.6) * 2)))),
      wr:clamp((cp.wr === undefined ? .5 : cp.wr) + (H1(s * 2.2) - .5) * .3, 0, 1), deck:(kind === 'slab' || kind === 'hq' || kind === 'atrium') && H1(c * 2.71 + .4) < .55 };
    if(CRUN.size > 500) CRUN.clear(); CRUN.set(key, B); return B; }
  // a window-sized band on a face along the slice: its bounding box when only a few pixels big (no row scan), else the true quad
  function WB(K, L, h0, h1, ta, tb, col){ const xa = K.px(L, 0, ta), xb = K.px(L, 0, tb); if(Math.max(xa, xb) < -PX || Math.min(xa, xb) > W + PX) return;
    const ya1 = K.py(L, h1, ta), yb1 = K.py(L, h1, tb), ya0 = K.py(L, h0, ta), yb0 = K.py(L, h0, tb), top = Math.min(ya1, yb1), bot = Math.max(ya0, yb0); if(bot < -PX || top > H + PX) return;
    if(Math.abs(xb - xa) < PX * 4 && bot - top < PX * 4){ cx.fillStyle = col; pxRect(Math.min(xa, xb), top, Math.abs(xb - xa), bot - top); return; }
    poly(xa, ya0, xb, yb0, xb, yb1, xa, ya1, col); }
  // the slice's t for a run-relative position r (clamped)
  const tR = (K, r) => clamp((r - K.rel) / K.m, 0, 1);
  let CBS = 1, CFS = 1;
  const above = (K, L, h) => K.py(L, h, 0) < -PX && K.py(L, h, 1) < -PX;   // a height wholly above the screen on this slice
  const below = (K, L, h) => K.py(L, h, 0) > H + PX && K.py(L, h, 1) > H + PX;   // ... wholly below it
  // a floor's light in one section of the run (offices light whole plates, never single windows): 0 dark, 1 cool, 2 warm, 3 dim (corridor)
  function fState(B, f, sec){ const hv = H1(B.seed * 7.13 + f * 13.37 + sec * 5.31); if(hv < B.pl) return H1(B.seed * 2.9 + f * 3.1 + sec * 1.7) < B.wr ? 2 : 1; return hv < B.pl + .1 ? 3 : 0; }
  // one segment of a lit office floor seen through the glass (the near tier; t ta..tb of the slice): the ceiling grid and its panel, the
  // desk run, a terminal, a late worker at his desk, a pot plant; a dim floor shows only its corridor light and, rarely, the exit sign
  function officeSeg(K, F, X, y, fh, st, u, P, hb, ta, tb){ const warm = st === 2, g = y + fh * .1, tp = y + fh * .86, L = X + .003, w = tb - ta;
    if(st === 3){ if(u === 1) WB(K, L, tp - .03, tp - .016, ta + w * .1, ta + w * .9, F('#8a9ab8')); if(hb > .88 && u === 2) WB(K, L, g + .2, g + .24, ta + w * .25, ta + w * .75, F('#3aff8a')); return; }
    if(u === (P >> 1)) WB(K, L, tp - .045, tp - .02, ta + w * .04, ta + w * .96, F(warm ? '#fff2d0' : '#f4f8ff'));   // a square ceiling panel, one per bay
    else WB(K, L, tp - .028, tp - .018, ta, tb, F(warm ? '#e0c494' : '#b8c6e2'));   // the ceiling grid's lit edge
    WB(K, L, g, g + .07, ta, tb, F(warm ? '#6a4a30' : '#4a5470')); WB(K, L, g + .07, g + .085, ta, tb, F(warm ? '#9a7a50' : '#8a96b0'));   // the desk run
    if(u === 1 && hb < .7){ WB(K, L, g + .085, g + .16, ta + w * .14, ta + w * .86, F('#262a36')); WB(K, L, g + .095, g + .15, ta + w * .22, ta + w * .78, F(hb < .35 ? '#6ae8b0' : '#9ab8ff')); }   // a terminal, green or blue
    else if(u === 2 && hb > .5){ const sit = hb < .78, bh = sit ? .13 : .23, y0 = sit ? g + .03 : g; WB(K, L, y0, y0 + bh, ta + w * .12, ta + w * .88, F('#181624')); WB(K, L, y0 + bh + .01, y0 + bh + .065, ta + w * .28, ta + w * .72, F('#181624')); }   // a late worker
    else if(u === 3 && hb < .32){ WB(K, L, g, g + .15, ta + w * .3, ta + w * .7, F('#1e3a26')); WB(K, L, g + .11, g + .2, ta + w * .14, ta + w * .86, F('#2e5a36')); } }   // a pot plant
  /* The wheel in the glass. A curtain wall facing the road at lateral X mirrors the Cosmo Clock across the boulevard: the mirrored wheel
     stands at x' = -2X - x, and where the camera's ray to it crosses the wall (zi, hi) the glass shows it, at PJ(zi, -X, hi).
     Built once a frame per wall line (rim lights and spokes, about 120 points), drawn by each slice for the points it covers. */
  const WRC = new Map(); let WRF = -1, WOB = null, WRC1 = 0, WRC2 = 0, WRC3 = 0, WRC4 = 0; const WRN = 96 + 12 * 6;
  function wrBuild(X){ const st = WOB.st, cz = camSeg(), cxw = CAMX / ROADW, chh = .5, cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), Rr = { zi:new Float32Array(WRN), hi:new Float32Array(WRN), sx:new Float32Array(WRN), sy:new Float32Array(WRN), n:0 };
    const add = (u, v) => { const wx = st.x + u * cy, wz = st.z + u * sy * 10, wh = st.h + v, xm = -2 * X - wx, t = (-X - cxw) / (xm - cxw); if(!(t > 0 && t < 1) || wz - cz < 2) return;
      const k = Rr.n; Rr.zi[k] = cz + (wz - cz) * t; Rr.hi[k] = chh + (wh - chh) * t; PJ(Rr.zi[k], -X, Rr.hi[k]); Rr.sx[k] = PJX; Rr.sy[k] = PJY; Rr.n++; };   // (the hit point itself, so the road's bends between it and the wheel never push it off the wall)
    const rot = st.rot || 0; for(let k = 0; k < 96; k++){ const a = rot + k / 96 * 6.283; add(Math.cos(a) * WR, Math.sin(a) * WR); } Rr.nr = Rr.n;
    for(let k = 0; k < 12; k++){ const a = rot + k / 12 * 6.283; for(let j = 1; j <= 6; j++){ const f = j / 7; add(Math.cos(a) * WR * f, Math.sin(a) * WR * f); } }
    return Rr; }
  const NO_WR = DBQ.has('mmnowr');   // (ablation switch for testing)
  function wheelRefl(K, B, X, top){ if(NO_WR) return; if(WRF !== DRAWN){ WRF = DRAWN; WRC.clear(); WOB = null; if(!WRC1){ WRC1 = c32('#bfe4f4', 170); WRC2 = c32('#8ab8d8', 150); WRC3 = c32('#e0864a', 140); WRC4 = c32('#d0f0ff', 150); } for(const o of objsNow()) if(o.kind === 'wheel' && !o.gone && o.st){ WOB = o; break; } } if(!WOB) return;
    let Rr = WRC.get(X); if(!Rr){ Rr = wrBuild(X); WRC.set(X, Rr); } if(!Rr.n) return; const z0 = B.b0 + K.rel, z1 = z0 + K.m;
    // the rim as a ring of light and the spokes as lines (each piece drawn by the slice its first point falls in), never loose dots
    const zb0 = B.b0, zb1 = B.b0 + B.len, ok = k => Rr.zi[k] >= zb0 && Rr.zi[k] < zb1 && Rr.hi[k] >= .78 && Rr.hi[k] <= top; let on = false;
    for(let k = 0; k < Rr.n; k++){ const zi = Rr.zi[k]; if(zi < z0 || zi >= z1 || !ok(k)) continue; const rim = k < Rr.nr, nx = rim ? (k + 1) % Rr.nr : ((k - Rr.nr) % 6 < 5 ? k + 1 : -1);
      if(nx < 0 || !ok(nx)) continue; if(!on){ on = true; rbBegin(true); }
      line(Rr.sx[k], Rr.sy[k], Rr.sx[nx], Rr.sy[nx], rim ? (k & 2 ? WRC1 : WRC2) : ((k - Rr.nr) % 6 < 4 ? WRC3 : WRC4)); }
    if(on) rbFlush(); }
  function drawCity(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .92) return; const B = sp.cb, m = K.begin(sp, x, y, uw, fog, 0); if(!m) return;
    const F = c => fc(c, fog), fp = fogPx(fog), near = fp < .05, mid = fp < .16, X = B.X; CBS = near ? 1 : 2; CFS = fp < .2 ? 1 : 2;   // (detail tiers: interiors near, bays at mid range, floor plates far)
    if(!K.vis(B.deck ? X - .55 : X, X + (K.end ? B.D : 0))) return;
    const fn = CDRAW[B.kind]; if(fn) fn(K, B, F, X, near, mid, fog, now, uw);
    // the entrance plaza: a pair of low bollard lights on the paving in front of the lobby, each with its pool (towers only)
    if(mid && CK[B.kind].g === 0 && K.rel < 5){ for(const r of [1.5, 4.5]){ const t = tR(K, r); if(t <= 0 || t >= 1 || r >= B.len) continue; const Lb = X - .3;
        K.RT(Lb, 0, t, .035, .11, F('#262a36')); K.RT(Lb, .085, t, .04, .03, fc('#fff2d0', fog * .4)); if(near) K.spill(Lb - .12, Lb + .12, Math.max(0, t - .3 / K.m), Math.min(1, t + .3 / K.m), '255,230,180', .12 * (1 - fog)); } }
    if(B.deck) deck(K, B, F, X, near, mid, fog); }
  /* The MM21 pedestrian deck: a walkway at the second floor along the frontage, half a road-width out over the sidewalk. From the road it
     is seen from below: a dark soffit with a row of downlights pooling on the pavement, a pale fascia, a glass balustrade with an LED
     handrail as one cool line of light, round columns, people walking. */
  function deck(K, B, F, X, near, mid, fog){ const Xd = X - .52, hd = .78, a = 1 - fog, rel = K.rel, m = K.m;
    K.Q(Xd, hd, X, hd, 0, 1, F('#151722')); if(mid) K.Q(Xd, hd - .002, Xd + .14, hd - .002, 0, 1, F('#20222e'));
    if(mid){ for(let r = Math.ceil(rel / 2) * 2 + 1; r < rel + m; r += 2){ const t = tR(K, r); K.RT(Xd + .3, hd - .004, t, .06, .016, '#fff4dc'); } K.spill(Xd + .05, X - .05, 0, 1, '255,226,170', .05 * a); }
    for(let r = Math.ceil(rel / 6) * 6; r < rel + m; r += 6){ if(r >= B.len) break; const t = tR(K, r); K.V(Xd + .1, 0, hd, t, .07, F('#262a36')); if(near) K.V(Xd + .1, 0, hd, t, .02, F('#4a5062')); }
    K.Q(Xd, hd, Xd, hd + .09, 0, 1, F('#4a4e5e')); if(mid) K.Q(Xd, hd + .075, Xd, hd + .09, 0, 1, F('#7a8092'));
    { const ga = cx.globalAlpha; cx.globalAlpha = ga * .3; K.Q(Xd, hd + .09, Xd, hd + .3, 0, 1, F('#8aa6c4')); cx.globalAlpha = ga; }
    K.Q(Xd, hd + .29, Xd, hd + .31, 0, 1, fc('#e4f4ff', fog * .5));
    if(near){ for(let r = rel; r < rel + m; r++){ const hv = H1(B.seed * 5.9 + r * 2.3); if(hv > .22) continue; const t = (r - rel + .5) / m; K.RT(Xd + .18, hd + .09, t, .07, .2, F(hv < .1 ? '#1a1826' : '#2a2030')); K.RT(Xd + .18, hd + .29, t, .045, .045, F('#1a1826')); } }
    if(K.end){ K.E(Xd, hd, X, hd + .09, F('#3a3e4c')); K.E(Xd, hd + .29, Xd + .06, hd + .31, fc('#e4f4ff', fog * .5)); } }
  // the end wall facing the camera (the run's first segment): a face with a real-size window grid, and a lit top edge
  function cEnd(K, B, F, X, col, winCol, darkCol, fh, h0, top){ if(!K.end) return; const D = B.D, tp = top === undefined ? B.h : top; K.E(X, 0, X + D, B.h, F(col));
    if(winCol && K.pu(0) * fh > PX * 2.2){ const nc = Math.max(2, Math.round(D / .3)), full = K.pu(0) * fh > PX * 5;
      for(let f = 0, hh = h0; hh < tp - fh * .8; f++, hh += fh){ if(K.py(X, hh, 0) < -PX) break; if(K.py(X, hh + fh, 0) > H + PX) continue; const st = fState(B, f, 0);
        for(let c = 0; c < nc; c++){ const lt = st === 1 || st === 2 ? H1(B.seed * 3.3 + f * 5.1 + c * 7.7) < .8 : st === 3 && c === 1; if(!lt && !full) continue;
          K.E(X + D * (c + .18) / nc, hh + fh * .2, X + D * (c + .82) / nc, hh + fh * .82, F(lt ? (st === 2 ? '#ffe0a8' : winCol) : darkCol)); } } } }
  const HGL = { H:[5, 5, 7, 5, 5], O:[7, 5, 5, 5, 7], T:[7, 2, 2, 2, 2], E:[7, 4, 6, 4, 7], L:[4, 4, 4, 4, 7] };
  const CDRAW = {
    // the glass slab: a curtain wall mirroring the sky (paler toward the top) and the wheel; offices light whole floor plates by section
    slab(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, fh = B.fh, g0 = .74, top = h - Math.min(fh * .9, h * .14), rel = K.rel, m = K.m, a = rel, b = rel + m, sl = B.sl;
      K.Q(X, 0, X, h, 0, 1, F(P.face)); K.Q(X, top * .45, X, top, 0, 1, F(fc(P.face, .3))); K.Q(X, top * .75, X, top, 0, 1, F(fc(P.face, .55)));   // the sky in the glass
      K.Q(X, .02, X, g0 - .06, 0, 1, F(mixc(P.lob, P.face, .56))); K.Q(X, g0 - .14, X, g0 - .08, 0, 1, F(P.lob)); if(mid) K.Q(X + .002, .02, X + .002, .12, 0, 1, F(mixc(P.lob, P.face, .62)));   // the lobby: double height, lit from its ceiling
      if(near){ const u = (rel + B.ph) % B.P, hb = H1(B.seed * 1.7 + Math.floor((rel + B.ph) / B.P) * 7.3); if(u === 1 && hb < .6){ K.RT(X + .003, .02, .5, .06, .26, F('#1a1826')); K.RT(X + .003, .28, .5, .04, .05, F('#1a1826')); } if(u === 2) K.Q(X + .003, .18, X + .003, .26, .1, .9, F('#5a4a3a')); }
      for(let f = 0, y = g0; y + fh <= top + .01; f++, y += fh){ if(above(K, X, y)) break; if(below(K, X, y + fh)) continue; if(f % CFS) continue;
        for(let s = Math.floor(a / sl); s * sl < b && s * sl < B.len; s++){ const st = fState(B, f, s); if(!st) continue; const r0 = Math.max(a, s * sl), r1 = Math.min(b, (s + 1) * sl, B.len), ta = (r0 - a) / m, tb = (r1 - a) / m; if(tb <= ta) continue;
          const lc = st === 3 ? P.dim : st === 2 ? P.litW : P.lit; WB(K, X, y + .06, y + fh - .04, ta, tb, F(st === 3 ? lc : mixc(lc, P.face, .22))); if(st < 3 && !near) WB(K, X, y + .06, y + fh * .42, ta, tb, F(mixc(lc, P.face, .5)));   // (the desk zone darker under the lit ceiling)
          if(near && st) officeSeg(K, F, X, y + .06, fh - .1, st, (rel + B.ph) % B.P, B.P, H1(B.seed * 1.7 + f * 3.9 + Math.floor((rel + B.ph) / B.P) * 7.3), ta, tb);
          else if(mid && st < 3) WB(K, X, y + fh - .1, y + fh - .07, ta, tb, F(st === 2 ? '#fff6e0' : '#f4faff')); } }   // (mid: the ceiling lights as one hot line)
      if(mid){ for(let r = Math.ceil((a + B.ph) / B.P) * B.P - B.ph; r <= b; r += B.P){ const t = tR(K, r); if(r > 0 && r < B.len) K.V(X, .02, top, t, .014, F(P.mul)); } }   // mullions at the bay rhythm
      if(mid) wheelRefl(K, B, X, h - .03);
      // the crown: a lit glass screen with fins, an LED line along the top
      K.Q(X, top, X, h, 0, 1, F(P.crownD)); K.Q(X, top + .04, X, h - .06, 0, 1, F(mixc(P.crown, P.crownD, .45)));
      if(mid) for(let r = Math.ceil(a); r < b; r++){ const t = tR(K, r + .5); K.V(X, top + .04, h - .06, t, .02, F(P.crownD)); }
      K.Q(X, h - .025, X, h, 0, 1, fc(P.led, fog * .4));
      if(K.end){ const D = B.D; K.E(X, 0, X + D, h, F(mixc(P.face, '#000000', .2))); K.E(X, top * .55, X + D, top, F(fc(mixc(P.face, '#000000', .2), .35))); K.E(X + .06, .02, X + D - .06, g0 - .06, F(mixc(P.lob, '#5a6a8a', .3)));
        for(let f = 0, y = g0; y + fh <= top + .01; f++, y += fh){ if(K.py(X, y, 0) < -PX) break; const st = fState(B, f, 0); if(st) K.E(X + .03, y + .06, X + D - .03, y + fh - .04, F(st === 3 ? P.dim : st === 2 ? P.litW : P.lit)); }
        if(mid){ const nm = Math.max(2, Math.round(B.D / .4)); for(let c = 1; c < nm; c++) K.E(X + D * c / nm - .008, g0, X + D * c / nm + .008, top, F(P.mul)); }
        K.E(X, top, X + D, h, F(P.crownD)); K.E(X + .05, top + .04, X + D - .05, h - .06, F(mixc(P.crown, P.crownD, .3))); K.E(X, h - .025, X + D, h, fc(P.led, fog * .4));
        if(mid){ const on = reduce ? 1 : .55 + .45 * Math.sin(now / 760 + B.seed); K.R(X + B.D * .5, h + .02, .04, .04, mixc(C.redD, C.red, on)); } } },
    // the tower mansion: a pale balcony parapet on every floor over a dark recess, warm and TV-blue windows, AC units, unit partitions
    mansion(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, fh = B.fh, rel = K.rel, m = K.m, g0 = .6;
      K.Q(X, 0, X, h, 0, 1, F(P.face)); K.Q(X, .02, X, g0 - .08, 0, 1, F('#c8a070')); if(near) K.Q(X, .02, X, .07, 0, 1, F('#2a2a22'));   // the entrance hall, lit warm, a planter in front
      const pfh = fh * K.pu(0), hp = B.P / 2;
      for(let f = 0, h0 = g0; h0 < h - fh * .6; f++, h0 += fh){ if(above(K, X, h0)) break; if(below(K, X, h0 + fh)) continue; if(f % CFS && pfh < PX * 3) continue;
        if(pfh > PX * 2.4) for(let r = Math.floor((rel + B.ph) / hp) * hp - B.ph; r < rel + m; r += hp){ if(r + hp <= 0 || r >= B.len) continue; const gb = Math.round((r + B.ph) / hp), hv = H1(B.seed * 7.13 + f * 13.37 + gb * 3.71); if(hv > .46) continue;
          const col = hv < .05 ? '#8aa8f0' : hv < .2 ? '#ffc878' : hv < .34 ? '#ffe0a8' : '#e09a5a', ta = tR(K, r + .25), tb = tR(K, r + hp - .25); if(tb <= ta) continue;
          WB(K, X, h0 + fh * .36, h0 + fh * .9, ta, tb, F(col)); if(near && hv < .34 && (gb & 1)) WB(K, X, h0 + fh * .36, h0 + fh * .9, ta, ta + (tb - ta) * .4, F(mixc(col, '#7a4a3a', .35))); }   // (near: a drawn curtain on half)
        WB(K, X, h0, h0 + fh * .34, 0, 1, F(P.par)); if(mid) WB(K, X, h0 + fh * .29, h0 + fh * .34, 0, 1, F(P.parT));
        if(near){ for(let r = rel; r < rel + m; r++){ if(H1(B.seed * 4.4 + f * 3.1 + r * 1.9) > .3) continue; const t = (r - rel + .5) / m; K.RT(X - .02, h0 + fh * .34, t, .1, .1, F(P.ac)); K.RT(X - .021, h0 + fh * .36, t, .05, .05, F('#3a3e48')); } } }   // AC units on the balconies
      if(mid) for(let r = Math.ceil((rel + B.ph) / B.P) * B.P - B.ph; r <= rel + m; r += B.P){ const t = tR(K, r); if(r > 0 && r < B.len) K.V(X, g0, h - .1, t, .018, F(P.part)); }
      // the crown: a stepped parapet traced by one line of LED (blue on most, as the Minato Mirai mansions; warm on a few; none on some)
      if(B.v < 3){ const lc = B.v === 2 ? '#ffd8a0' : B.v ? '#5a8aff' : '#7ab0ff', st = Math.min(4, B.len >> 2), t1 = tR(K, st); K.Q(X, h - .03, X, h, 0, 1, fc(lc, fog * .4)); if(t1 > 0){ K.Q(X, h, X, h + .2, 0, t1, F(P.face)); K.Q(X, h + .17, X, h + .2, 0, t1, fc(lc, fog * .4)); } }
      if(K.end){ cEnd(K, B, F, X, P.end, '#ffe0a8', '#14141c', fh, g0); if(mid){ for(let hh = g0; hh < h - fh * .6; hh += fh){ if(K.py(X, hh, 0) < -PX) break; K.E(X, hh, X + B.D, hh + fh * .3, F(P.par)); } const on = reduce ? 1 : .55 + .45 * Math.sin(now / 800 + B.seed); K.R(X + B.D * .5, h + .02, .04, .04, mixc(C.redD, C.red, on)); } } },
    // the corporate HQ: stone piers and spandrels round punched windows, pale fins; a set-back uplit crown with a lit corporate plate; a helipad ring
    hq(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, fh = B.fh, rel = K.rel, m = K.m, a = rel, b = rel + m, hc = h - Math.min(.72, h * .28), g0 = .8, sl = B.sl;
      K.Q(X, 0, X, hc, 0, 1, F(P.face)); K.Q(X, .02, X, g0 - .1, 0, 1, F('#1e2638')); K.Q(X, g0 - .14, X, g0 - .1, 0, 1, F('#c8d6ee'));   // dark lobby glass under a lit soffit
      if(mid){ const ta = tR(K, 2), tb = tR(K, 6); if(tb > ta) WB(K, X + .002, .04, .2, ta, tb, F('#d8a868')); for(let r = Math.ceil(a / 2) * 2; r <= b; r += 2){ const t = tR(K, r); if(r > 0 && r < B.len) K.V(X, .02, g0 - .1, t, .016, F(P.dark)); } }
      for(let f = 0, y = g0; y + fh <= hc + .01; f++, y += fh){ if(above(K, X, y)) break; if(below(K, X, y + fh)) continue; if(f % CFS) continue;
        if(!mid){ for(let s = Math.floor(a / sl); s * sl < b && s * sl < B.len; s++){ const st = fState(B, f, s); if(st !== 1 && st !== 2) continue; const r0 = Math.max(a, s * sl), r1 = Math.min(b, (s + 1) * sl, B.len); if(r1 > r0) WB(K, X, y + .16, y + fh - .1, (r0 - a) / m, (r1 - a) / m, F(mixc(st === 2 ? P.winW : P.win, P.face, .35))); } continue; }
        for(let r = Math.floor((a + B.ph) / B.P) * B.P - B.ph; r < b; r += B.P){ const st = fState(B, f, Math.floor(Math.max(0, r) / sl)), bi = Math.floor((r + B.ph) / B.P), hb = H1(B.seed * 5.3 + f * 11.1 + bi * 2.9);
          const lit = (st === 1 || st === 2) && hb > .14, ta = tR(K, r + .55), tb = tR(K, r + B.P - .2); if(tb <= ta || r + B.P - .2 <= 0 || r + .55 >= B.len) continue;
          WB(K, X, y + .16, y + fh - .1, ta, tb, F(lit ? (st === 2 ? P.winW : P.win) : P.dark)); WB(K, X - .003, y + .16, y + fh - .1, ta, ta + (tb - ta) * .12, F(P.faceD));   // the window, its reveal in shadow
          if(near && lit){ for(let rr = Math.max(a, Math.ceil(r + .55)); rr < Math.min(b, r + B.P - .2); rr++){ const u = ((rr + B.ph) % B.P + B.P) % B.P; officeSeg(K, F, X, y + .16, fh - .26, st, u, B.P, hb, tR(K, rr), tR(K, rr + 1)); } } } }
      if(mid) for(let r = Math.ceil((a + B.ph) / B.P) * B.P - B.ph; r <= b; r += B.P){ const t = tR(K, r + .35); if(r >= 0 && r < B.len){ K.V(X - .03, g0, hc, t, .045, F(P.fin)); if(near) K.V(X - .031, g0, hc, t, .012, F(P.finL)); } }   // the fins
      // the crown: set back, uplit (a brighter band at its foot), louvres; the corporate plate on the front of the crown; the helipad ring
      const Xc = X + .12; K.Q(X, hc - .05, X, hc, 0, 1, F(P.fin)); K.Q(Xc, hc, Xc, h, 0, 1, F(P.crown)); K.Q(Xc, hc, Xc, hc + .16, 0, 1, F(mixc(P.crown, '#ffffff', .28)));
      if(mid) for(let r = Math.ceil(a); r < b; r++){ const t = tR(K, r + .5); K.V(Xc, hc + .18, h - .05, t, .018, F(mixc(P.crown, '#101420', .4))); }
      { const pa = tR(K, 1.5), pb = tR(K, Math.min(B.len - 1, 8.5)); if(pb > pa){ WB(K, Xc - .004, hc + .22, hc + .52, pa, pb, fc(P.plate, fog * .45));
          if(mid){ const w = pb - pa; WB(K, Xc - .005, hc + .27, hc + .47, pa + w * .06, pa + w * .2, fc(P.mark, fog * .45)); for(let q = 0; q < 3; q++) WB(K, Xc - .005, hc + .33, hc + .41, pa + w * (.28 + q * .22), pa + w * (.44 + q * .22), F(P.ink)); } } }   // (a generic mark: a coloured block and three dark word bars)
      K.Q(Xc, h - .03, Xc, h, 0, 1, fc(P.led, fog * .4));
      if(mid && fog < .7){ for(let r = Math.ceil(a / 2) * 2; r < b; r += 2){ const t = tR(K, r); K.RT(Xc + .02, h + .005, t, .035, .035, (r >> 1) & 1 ? '#ffd27a' : '#f4f8ff'); } }   // the helipad's perimeter lights
      if(K.end){ const D = B.D; cEnd(K, B, F, X, P.faceD, P.win, P.dark, fh, g0, hc); K.E(X + .06, .02, X + D - .06, g0 - .1, F('#1e2638'));
        if(mid){ for(let c = 0; c <= 3; c++){ const L = X + D * c / 3; K.E(L - .02, g0, L + .02, hc, F(P.fin)); } }
        K.E(Xc, hc, X + D - .12, h, F(mixc(P.crown, '#000000', .2))); K.E(Xc, hc, X + D - .12, hc + .16, F(P.crown)); K.E(Xc, h - .03, X + D - .12, h, fc(P.led, fog * .4));
        if(mid){ K.E(X + D * .3, hc + .22, X + D * .7, hc + .5, fc(P.plate, fog * .45)); K.E(X + D * .34, hc + .28, X + D * .42, hc + .44, fc(P.mark, fog * .45));
          const on = reduce ? 1 : .55 + .45 * Math.sin(now / 700 + B.seed); K.E(X + D * .5 - .006, h, X + D * .5 + .006, h + .3, F('#2a2e3a')); K.R(X + D * .5, h + .3, .045, .045, mixc(C.redD, C.red, on)); K.R(Xc + .03, h + .03, .035, .035, mixc(C.redD, C.red, on)); } } },
    // the hotel: warm tile, rooms in pairs with curtains, a lit restaurant floor, three blue LED arcs round the crown, a name blade, the lobby
    hotel(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, fh = B.fh, rel = K.rel, m = K.m, a = rel, b = rel + m, g0 = .92, ht = h - Math.min(.62, h * .3);
      K.Q(X, 0, X, h, 0, 1, F(P.face)); K.Q(X, .02, X, g0 - .06, 0, 1, F(P.lob)); if(mid) K.Q(X + .002, g0 * .62, X + .002, g0 - .06, 0, 1, F(mixc(P.lob, '#7a4a2a', .45)));
      if(near){ for(let k = 0; k <= m; k++) K.V(X, .02, g0 - .06, k / m, .018, F('#3a2a20')); for(let k = 0; k < m * 2; k++){ const t = (k + .5) / (m * 2); K.RT(X + .01, g0 * .7, t, .06, .06, F('#fff4d0')); K.RT(X + .01, g0 * .7 + .06, t, .012, .06, F('#8a6a40')); } }   // chandeliers
      for(let f = 0, y = g0; y + fh <= ht + .01; f++, y += fh){ if(above(K, X, y)) break; if(below(K, X, y + fh)) continue; if(f % CFS && fh * K.pu(0) < PX * 3) continue;
        for(let r = Math.floor((a + B.ph) / B.P) * B.P - B.ph; r < b; r += B.P){ if(r + B.P <= 0 || r >= B.len) continue; const bi = Math.floor((r + B.ph) / B.P), hv = H1(B.seed * 4.7 + f * 9.3 + bi * 3.1), lt = hv < .52; if(!lt && !mid) continue;
          const ta = tR(K, r + .4), tb = tR(K, r + B.P - .4); if(tb <= ta) continue; const col = lt ? (hv < .16 ? P.cur : hv < .3 ? P.cur2 : hv < .5 ? P.win : '#7aa0e0') : P.dark;
          WB(K, X, y + .1, y + fh - .14, ta, tb, F(col)); if(near && lt){ WB(K, X + .002, y + .1, y + fh - .14, ta, ta + (tb - ta) * .3, F(mixc(col, '#6a3a2a', .4))); WB(K, X + .002, y + .1, y + .16, ta + (tb - ta) * .55, ta + (tb - ta) * .7, F('#fff4c0')); }   // a curtain half drawn; the bedside lamp
          if(mid) WB(K, X - .004, y + .08, y + .1, ta - (tb - ta) * .1, tb + (tb - ta) * .1, F(P.pil)); } }   // the sill
      if(mid) for(let r = Math.ceil((a + B.ph) / (B.P * 2)) * B.P * 2 - B.ph; r <= b; r += B.P * 2){ const t = tR(K, r); if(r > 0 && r < B.len) K.V(X, g0, ht, t, .03, F(P.pil)); }
      // the top: the restaurant floor lit warm with its ceiling points, then the crown wrapped in three blue LED arcs
      K.Q(X, ht, X, ht + .34, 0, 1, F(P.top)); if(mid){ K.Q(X, ht + .26, X, ht + .34, 0, 1, F(mixc(P.top, '#fffaf0', .5))); if(near) for(let k = 0; k < m * 3; k++) K.RT(X - .002, ht + .28, (k + .5) / (m * 3), .03, .02, '#fffaf0'); }
      K.Q(X, ht + .34, X, h, 0, 1, F(mixc(P.face, '#000000', .3)));
      for(const ah of [ht + .42, ht + .51, ht + .6]){ K.Q(X - .01, ah - .012, X - .01, ah + .012, 0, 1, fc(P.arcH, fog * .4)); if(mid) K.Q(X - .01, ah - .03, X - .01, ah - .012, 0, 1, F(P.arc)); }
      // the canopy over the drop-off: a fascia on two posts, downlights under it (on its own few segments of the run)
      { const ca = tR(K, 2), cb = tR(K, Math.min(B.len - 1, 7)); if(cb > ca){ const Lc = X - .4; K.Q(Lc, .5, Lc, .56, ca, cb, F('#1c1618')); K.Q(Lc, .5, Lc, .515, ca, cb, F(mixc(P.lob, '#ffffff', .2))); K.Q(Lc, .5, X, .5, ca, cb, F('#2a2022'));
          if(mid){ for(const r of [2, 7]){ const t = tR(K, r); if(t > 0 && t < 1) K.V(Lc + .02, 0, .5, t, .025, F('#2a2226')); } if(near){ for(let r = 2.5; r < 7; r += 1.2){ const t = tR(K, r); if(t > 0 && t < 1) K.bulb(Lc + .2, .49, t, '#fff0c8', '#ffcf80', .025, .35 * (1 - fog)); } } } } }
      if(K.end){ const D = B.D; cEnd(K, B, F, X, mixc(P.face, '#000000', .2), P.win, P.dark, fh, g0, ht); K.E(X, .02, X + D * .55, g0 - .06, F(mixc(P.lob, '#5a3a20', .3))); K.E(X, ht, X + D, ht + .34, F(P.top)); K.E(X, ht + .34, X + D, h, F(mixc(P.face, '#000000', .35)));
        for(const ah of [ht + .42, ht + .51, ht + .6]){ const bw = .07; K.E(X + bw, ah - .012, X + D - bw, ah + .012, fc(P.arcH, fog * .4)); K.E(X + bw * .4, ah - .03, X + bw, ah, fc(P.arcH, fog * .4)); K.E(X + D - bw, ah - .03, X + D - bw * .4, ah, fc(P.arcH, fog * .4)); }   // (the arcs bend round the corners)
        // the name blade: a lit vertical plate standing off the end wall, its word set top to bottom
        if(mid){ const bx0 = X + D * .78, bx1 = bx0 + .16, by1 = ht - .2, by0 = Math.max(g0 + .3, by1 - 1.5); K.E(bx0 - .02, by0 - .02, bx1 + .02, by1 + .02, F('#1a1418')); K.E(bx0, by0, bx1, by1, fc(P.blade, fog * .4));
          const cell = (by1 - by0) / 5.6, s = Math.min(cell / 6, (bx1 - bx0) / 4.2); if(s * K.pu(0) >= PX * .9){ const word = 'HOTEL', xL = (bx0 + bx1) / 2 - s * 1.5; for(let n = 0; n < 5; n++){ const g = HGL[word[n]], yT = by1 - cell * (n + .3); for(let r = 0; r < 5; r++) for(let c = 0; c < 3; c++) if(g[r] >> (2 - c) & 1) K.E(xL + (2 - c) * s, yT - (r + 1) * s, xL + (3 - c) * s, yT - r * s, F(P.ink)); } }   // (columns mirrored: on the left side L grows leftward on screen)
          else for(let n = 0; n < 5; n++){ const yT = by1 - cell * (n + .35); K.E(bx0 + .04, yT - cell * .6, bx1 - .04, yT, F(mixc(P.ink, P.blade, .35))); } } } },
    // the mall podium: a three-storey glass atrium lit warm white, escalators crossing it as bright diagonals, banners, people; a glowing canopy band on top
    atrium(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, fh = B.fh, rel = K.rel, m = K.m, a = rel, b = rel + m, gt = h - .3;
      K.Q(X, 0, X, h, 0, 1, F(P.frame)); K.Q(X, .03, X, gt - .03, 0, 1, F(P.glass)); K.Q(X, gt * .72, X, gt - .03, 0, 1, F(mixc(P.glass, '#ffffff', .25)));   // the atrium, brightest under its roof
      const nf = Math.max(2, Math.floor((gt - .03) / fh));
      for(let f = 1; f < nf; f++){ const y = f * fh; K.Q(X, y - .035, X, y + .03, 0, 1, F(P.slab)); if(mid) K.Q(X, y + .03, X, y + .045, 0, 1, F(P.glassD)); }   // the floor slabs crossing the glass
      // escalators: each climbs one storey over five segments, a bright band of steps over its dark side truss (pairs crossing as an X)
      for(let e = 0; e < 3; e++){ const r0 = 2 + e * 5, f = e % (nf - 1 || 1), y0 = f * fh + .03, dir = e & 1 ? -1 : 1; if(r0 + 5 > B.len) break; if(r0 + 5 < a || r0 > b) continue;
        const za = Math.max(a, r0), zb = Math.min(b, r0 + 5); if(zb <= za) continue; const ta = tR(K, za), tb = tR(K, zb), ya = y0 + fh * (dir > 0 ? (za - r0) / 5 : 1 - (za - r0) / 5), yb = y0 + fh * (dir > 0 ? (zb - r0) / 5 : 1 - (zb - r0) / 5);
        poly(K.px(X, 0, ta), K.py(X, ya - .06, ta), K.px(X, 0, tb), K.py(X, yb - .06, tb), K.px(X, 0, tb), K.py(X, yb, tb), K.px(X, 0, ta), K.py(X, ya, ta), F(P.escS));
        poly(K.px(X, 0, ta), K.py(X, ya, ta), K.px(X, 0, tb), K.py(X, yb, tb), K.px(X, 0, tb), K.py(X, yb + .035, tb), K.px(X, 0, ta), K.py(X, ya + .035, ta), F(P.esc));
        if(near){ const tm = (ta + tb) / 2, ym = (ya + yb) / 2; if(H1(B.seed + e * 3.1 + Math.floor(rel)) < .5){ K.RT(X + .004, ym + .03, tm, .05, .17, F('#2a2230')); K.RT(X + .004, ym + .2, tm, .035, .035, F('#2a2230')); } } }
      if(mid){ for(let r = Math.ceil(a / 2) * 2; r <= b; r += 2){ const t = tR(K, r); if(r > 0 && r < B.len) K.V(X, .03, gt - .03, t, .012, F(P.frame)); } }   // mullions
      if(mid){ for(let r = 3; r < B.len - 1; r += 6){ if(r + 1 < a || r > b) continue; const ta = tR(K, r), tb = tR(K, r + .7), col = P.ban[Math.floor(r / 6) % 3]; if(tb > ta) WB(K, X + .004, gt - .9, gt - .1, ta, tb, F(col)); } }   // hanging banners
      if(near){ for(let r = rel; r < rel + m; r++){ const hv = H1(B.seed * 3.7 + r * 1.9); if(hv > .4) continue; const t = (r - rel + .5) / m, f = Math.floor(hv * 10) % nf, y = f * fh + .03; K.RT(X + .004, y, t, .05, .2, F(hv < .2 ? '#2a2230' : '#3a2a28')); K.RT(X + .004, y + .2, t, .035, .035, F('#2a2230')); } }   // shoppers
      // the canopy band: the glowing white fascia round the top (Queen's Square's galleria roof), a dark coping over it
      K.Q(X - .03, gt, X - .03, h - .04, 0, 1, fc(P.canopy, fog * .45)); K.Q(X - .03, h - .04, X - .03, h, 0, 1, F(P.frame)); if(mid) K.Q(X - .03, gt, X - .03, gt + .03, 0, 1, F(mixc(P.canopy, P.frame, .5)));
      if(K.end){ const D = B.D; K.E(X, 0, X + D, h, F(P.frame)); K.E(X + .05, .03, X + D - .05, gt - .03, F(mixc(P.glass, '#000000', .12)));
        for(let f = 1; f < nf; f++) K.E(X + .05, f * fh - .035, X + D - .05, f * fh + .03, F(P.slab));
        if(mid){ for(let c = 1; c < 4; c++) K.E(X + D * c / 4 - .008, .03, X + D * c / 4 + .008, gt - .03, F(P.frame)); const y0 = .03, y1 = Math.min(fh, gt - .1);
          poly(K.px(X + D * .2, 0, 0), K.py(0, y0, 0), K.px(X + D * .75, 0, 0), K.py(0, y1, 0), K.px(X + D * .75, 0, 0), K.py(0, y1 + .04, 0), K.px(X + D * .2, 0, 0), K.py(0, y0 + .04, 0), F(P.esc)); }
        K.E(X - .03, gt, X + D + .03, h - .04, fc(P.canopy, fog * .45)); K.E(X - .03, h - .04, X + D + .03, h, F(P.frame)); } },
    // the 1970s concrete warehouse: pilasters, roll-up doors (a few open on a sodium-lit inside), a band of high windows, a painted number on the end
    ware(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, rel = K.rel, m = K.m, a = 1 - fog;
      K.Q(X, 0, X, h, 0, 1, F(P.face)); K.Q(X, h - .05, X, h, 0, 1, F(P.rim));
      for(let r = Math.floor(rel / 3) * 3; r <= rel + m; r += 3){ const t = tR(K, r); if(r < 0 || r > B.len) continue; if(t >= 0 && t <= 1 && r > rel - 1) K.V(X - .01, 0, h - .05, t, .06, F(P.pil)); }
      for(let r = Math.floor(rel / 3) * 3; r < rel + m; r += 3){ if(r < 0 || r + 2 >= B.len) continue; const ta = tR(K, r + .55), tb = tR(K, r + 2.45); if(tb <= ta) continue; const dn = Math.floor(r / 3), open = H1(B.seed * 2.1 + dn * 1.7) < .3;
        if(open){ WB(K, X, .02, .4, ta, tb, F('#ffb860')); if(mid) WB(K, X + .003, .02, .1, ta, tb, F('#7a4a24')); if(near){ WB(K, X + .003, .1, .22, ta, ta + (tb - ta) * .3, F('#5a3a1e')); WB(K, X + .003, .1, .17, ta + (tb - ta) * .5, ta + (tb - ta) * .8, F('#6a4422')); WB(K, X + .003, .34, .38, ta, tb, F('#fff0c8')); } }
        else { WB(K, X, .02, .4, ta, tb, F(P.sh)); if(near){ for(let k = 1; k < 10; k++){ const hh = .02 + k * .038; WB(K, X - .002, hh, hh + .008, ta, tb, F(P.rib)); } } }
        if(mid){ const tm = (ta + tb) / 2; K.Q(X - .06, .43, X, .44, ta + (tb - ta) * .1, tb - (tb - ta) * .1, F(P.rib)); if(fog < .6){ K.bulb(X - .05, .45, tm, '#ffd890', '#ffb050', .02, .4 * a); if(near) K.cone(X - .05, .44, tm, .1, '255,180,90', .06 * a); } } }
      if(mid){ for(let r = rel; r < rel + m; r++){ const hv = H1(B.seed * 1.9 + r * 2.7); if(hv > .5) continue; const t = (r - rel + .3) / m; WB(K, X, h - .34, h - .22, t, t + .4 / m, F(hv < .14 ? '#bfe8d0' : '#12141c')); } }
      if(K.end){ const D = B.D; K.E(X, 0, X + D, h, F(mixc(P.face, '#000000', .25))); K.E(X, h - .05, X + D, h, F(P.rim));
        if(mid){ const dg = DIG[String(1 + Math.floor(B.seed * 7) % 9)], s = .07, x0 = X + D * .5 - s * 1.5, y0 = h - .15; if(dg) for(let r = 0; r < 5; r++) for(let b = 0; b < 3; b++) if(dg[r] >> (2 - b) & 1) K.E(x0 + (2 - b) * s, y0 - (r + 1) * s, x0 + (3 - b) * s, y0 - r * s, F(P.num));   // (mirrored, as the name blade: the number read backwards before)
          K.E(X + D * .2, 0, X + D * .45, .32, F(P.sh)); K.bulb(X + D * .33, .36, 0, '#ffd890', '#ffb050', .02, .3 * a); } } },
    // the warehouse turned cafe and gallery: a glazed warm ground floor with people inside, a festoon of bulbs, one big painted wave, a gallery band
    cafe(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, rel = K.rel, m = K.m, a = 1 - fog;
      K.Q(X, 0, X, h, 0, 1, F(P.face)); K.Q(X, .03, X, .4, 0, 1, F(P.glass)); if(mid) K.Q(X + .002, .03, X + .002, .14, 0, 1, F(mixc(P.glass, P.in, .5)));
      if(near){ for(let k = 0; k <= m; k++) K.V(X, .03, .4, k / m, .015, F(P.mul)); for(let r = rel; r < rel + m; r++){ const hv = H1(B.seed + r * 3.3), t = (r - rel + .5) / m; K.RT(X + .004, .37, t, .015, .03, F('#fff0c8'));
          if(hv < .45) K.RT(X + .004, .03, t + (hv - .2) / m, .05, .2, F('#2a1a14')); } }
      // the mural: one big wave breaking along the wall (its body in two blues, a pale foam crest curling over), uplit warm at its foot
      if(mid){ const w0 = 1 + Math.floor(B.seed * 3) % 3, wl = Math.min(B.len - 2 - w0, 11), hb = .46, ht2 = h - .26;
        for(let r = Math.max(rel, w0); r < Math.min(rel + m, w0 + wl); r++){ const f = (r - w0 + .5) / wl, crest = Math.pow(Math.sin(f * Math.PI * .92), 1.6), y1 = hb + (ht2 - hb) * (.28 + .72 * crest), ta = tR(K, r), tb = tR(K, r + 1);
          WB(K, X - .001, hb, y1, ta, tb, F(P.wave)); WB(K, X - .001, hb, hb + (y1 - hb) * .45, ta, tb, F(P.waveD)); WB(K, X - .0015, y1 - .05, y1, ta, tb, F(P.foam)); if(f > .55 && f < .8) WB(K, X - .0015, y1 - .12, y1 - .05, ta, tb, F(mixc(P.foam, P.wave, .4))); }
        K.Q(X - .001, .42, X - .001, .46, 0, 1, F(mixc(P.face, '#ffb060', .2))); }
      K.Q(X, h - .24, X, h - .1, 0, 1, F('#c8d4e8')); if(mid) for(let r = Math.ceil(rel / 4) * 4 + 2; r < rel + m; r += 4){ if(r >= B.len - 1) break; const t = tR(K, r); WB(K, X - .001, h - .215, h - .125, t, tR(K, r + 1.2), F(['#3a3440', '#8a4a3a', '#2a4a5a'][Math.floor(r / 4) % 3])); }   // the gallery's pictures, one every four segments, framed by the lit wall
      K.Q(X, h - .04, X, h, 0, 1, F('#4a4650'));
      // the festoon: bulbs on a sagging line between hooks every two segments
      if(mid && fog < .6){ for(let r = Math.max(0, Math.floor(rel / 2) * 2); r < rel + m && r < B.len - 1; r += 2){ for(let k = 0; k < 4; k++){ const f = (k + .5) / 4, t = tR(K, r + f * 2); if(t <= 0 || t >= 1) continue; const sg = .48 - Math.sin(f * Math.PI) * .04; K.bulb(X - .03, sg, t, '#fff0c0', '#ffd080', .012, near ? .18 * a : 0); } } }
      if(K.end){ K.E(X, 0, X + B.D, h, F(mixc(P.face, '#000000', .25))); K.E(X + .1, .03, X + B.D * .5, .4, F(P.glass)); K.E(X, h - .04, X + B.D, h, F('#4a4650')); } },
    // the low tiled block: windows on a tiled face, a lit shopfront under a striped awning, a vertical sign blade
    shop(K, B, F, X, near, mid, fog, now){ const P = B.c, h = B.h, fh = B.fh, rel = K.rel, m = K.m, g0 = .5;
      K.Q(X, 0, X, h, 0, 1, F(P.face)); K.Q(X, .03, X, g0 - .14, 0, 1, F(P.sh));
      for(let f = 0, y = g0; y + fh * .8 < h - .05; f++, y += fh){ if(above(K, X, y)) break; for(let r = Math.floor((rel + B.ph) / B.P) * B.P - B.ph; r < rel + m; r += B.P){ if(r + B.P <= 0 || r >= B.len) continue; const bi = Math.floor((r + B.ph) / B.P), hv = H1(B.seed * 3.9 + f * 7.7 + bi * 1.3), lt = hv < .45; if(!lt && !mid) continue;
          const ta = tR(K, r + .5), tb = tR(K, r + B.P - .5); if(tb > ta) WB(K, X, y + .1, y + fh - .12, ta, tb, F(lt ? P.win : '#140e12')); } }
      // the awning: a band leaning out over the pavement, striped near
      K.Q(X - .14, g0 - .17, X, g0 - .1, 0, 1, F(P.aw[0])); if(near){ const ns = Math.max(2, m * 4); for(let k = 0; k < ns; k += 2) K.Q(X - .14, g0 - .17, X, g0 - .1, k / ns, (k + 1) / ns, F(P.aw[1])); K.Q(X - .14, g0 - .175, X - .14, g0 - .165, 0, 1, F('#1a1014')); }
      { const t = tR(K, 1.5); if(t > 0 && t < 1 && mid){ K.Q(X - .12, g0 + .1, X - .12, Math.min(h - .1, 1.4), t, Math.min(1, t + .35 / m), F(P.blade)); if(near) K.Q(X - .121, g0 + .15, X - .121, Math.min(h - .15, 1.3), t + .08 / m, Math.min(1, t + .27 / m), F('#1a1418')); } }
      K.Q(X, h - .04, X, h, 0, 1, F('#5a4a4e'));
      if(K.end) cEnd(K, B, F, X, mixc(P.face, '#000000', .25), P.win, '#140e12', fh, g0); } };
  // the back row behind: still projBox's cheap lit-windows-only tier, but each run now takes one of four night characters
  const BACKP = [
    { style:'glass', win:{ floor:.46, h:.5, lit:.18 } },
    { style:'concrete', face:['#1a1c26', '#2a2c38', '#4a4c5c'], win:{ floor:.44, w:.5, h:.5, lit:.24, cols:['#ffd890', '#ffe8c0', '#ffc070'] } },
    { style:'glass', face:['#0c1220', '#16203a', '#2e3a5a'], win:{ floor:.5, w:.95, h:.55, lit:.22, cols:['#c8d8f4', '#e8f0ff'] } },
    { style:'tile', face:['#201c22', '#302a32', '#4e464e'], win:{ floor:.42, w:.45, h:.55, lit:.28, cols:['#ffcf80', '#fff0c8', '#a8c8ff'] } } ];   // (round 4: real-size storeys, as the street row; the old .1-.16 read as speckle)
  // ---------------------------------------------------------------- the promenade's furniture: vignettes with breathing room (minato.md, "Round 2")
  /* Kellan: "add more detail to what is on the walkway on the right ... small bathrooms, market stalls, artwork". From night photographs of
     the Tennozu boardwalk, the Shibaura canal walk, Takeshiba and Harumi piers, Yamashita Park, the Kishamichi promenade and Pukari Sanbashi
     (minato.md has the list and the rule taken from each). The promenade is cut into cells of PP segments; each cell holds at most one
     vignette, set back from both ends so lamps, couples and empty granite separate them. Cells take in turn from three groups (amenities, food,
     art and rest), so the same vignette never comes within three cells. Everything is geometry at canvas resolution (ENV.bkit runs for things
     along the walk, camera-facing cards for things that stand across it), so nothing turns into blocks beside the camera. */
  const PP = 34, PK = {
    toilet:{ g:0, w:2, len:7 }, vend:{ g:0, w:2, len:8 }, info:{ g:0, w:1.6, len:10 },
    kcar:{ g:1, w:2, len:9 }, market:{ g:1, w:1.6, len:21 }, kiosk:{ g:1, w:1.6, len:5 },
    ring:{ g:2, w:1.2, len:3 }, cones:{ g:2, w:1.3, len:12 }, anchor:{ g:2, w:1, len:4 }, rest:{ g:2, w:1.4, len:0 } };
  const PKG = [[], [], []]; for(const k in PK) PKG[PK[k].g].push(k);
  const PCELL = new Map(), FPK = DBQ.get('mmpk');
  function promCell(c){ let r = PCELL.get(c); if(r) return r; const g = c % 3, list = PKG[g]; let tot = 0; for(const k of list) tot += PK[k].w; let q = H1(c * 4.73 + 8.1) * tot, kind = list[0]; for(const k of list){ q -= PK[k].w; if(q < 0){ kind = k; break; } }
    if(PK[FPK]) kind = FPK;   // (?mmpk=kind: every cell that vignette, for testing)
    const len = PK[kind].len, a = c * PP + 6 + Math.floor(H1(c * 2.17 + .3) * (PP - 12 - len + 1)); r = { kind, a, b:a + len, c, v:Math.floor(H1(c * 6.9) * 4) };
    if(PCELL.size > 400) PCELL.clear(); PCELL.set(c, r); return r; }
  // the vignette at segment i (with its margin m), or null where the promenade is narrow (the basin), at the fountains or the pier
  function promAt(i, L, m){ const r = promCell(Math.floor(i / PP)); if(r.kind === 'rest' || i < r.a - (m || 0) || i >= r.b + (m || 0)) return null; if(!promOK(r, L)) return null; return r; }
  function promOK(r, L){ if(!L) return true; if(r.ok !== undefined && r.okL === L) return r.ok; let ok = r.a >= L.B0 + 30 && r.b <= L.B1 - 20;
    if(ok && L.ok && r.b >= L.H - 380 && r.a <= L.H + 100) ok = false;
    if(ok && L.pier && r.b >= L.pier.z0 - 14 && r.a <= L.pier.z1 + 14) ok = false;
    r.ok = ok; r.okL = L; return ok; }
  // the railing kind of a stretch of quay: anchor chains between bollards (Yamashita Park) or a pipe railing with lifebuoys (Tennozu, Shibaura)
  const railAt = i => H1(Math.floor(i / 168) * 3.3 + .4) < .5 ? 'rail' : 'chain';

  // ---- small shared helpers for the furniture
  // a person standing or sitting, camera-facing, foot at (x, y), hp px tall: legs, coat with a lit edge, head and hair (2 rects when tiny)
  function fig(x, y, hp, coat, v, sit){ if(hp < PX * 2) return; const w = Math.max(PX, snp(hp * .3)), X = snp(x - w / 2), Y = snp(y);
    if(hp < PX * 6){ R(X, Y - hp, w, hp * .25, '#2a1e1a'); R(X, Y - hp * .75, w, hp * .75, coat); return; }
    const head = snp(hp * .16), body = snp(hp * (sit ? .5 : .42)), legs = Math.max(0, snp(hp) - head - body);
    R(X + snp(w * .15), Y - legs, Math.max(PX, snp(w * .3)), legs, '#14141c'); if(!sit) R(X + w - snp(w * .45), Y - legs, Math.max(PX, snp(w * .3)), legs, '#14141c'); else R(X - snp(w * .2), Y - legs, w, PX, '#14141c');
    R(X - (hp > PX * 14 ? PX : 0), Y - legs - body, w + (hp > PX * 14 ? PX * 2 : 0), body, coat); R(X - (hp > PX * 14 ? PX : 0), Y - legs - body, PX, body - PX, mixc(coat, '#ffd890', .3));
    R(X + snp(w * .2), Y - legs - body - head, Math.max(PX, w - snp(w * .4)), head, '#d8a888'); R(X + snp(w * .15), Y - legs - body - head - PX, Math.max(PX, w - snp(w * .3)), PX + snp(head * .4), v % 2 ? '#1a1410' : '#3a2418'); }
  const COAT2 = ['#2a2a44', '#5a3a3a', '#2a3a4a', '#4a4232', '#3a2a4a', '#20303a'];
  // a ring of light-catching metal, as runs of whole pixels (direct mode), from angle a0 to a1 (radians), radius r and thickness th in px
  function arcPx(cxp, cyp, r, a0, a1, th, colFn){ const n = Math.max(8, Math.min(220, Math.ceil(Math.abs(a1 - a0) * r / PX * 1.3))); cx.fillStyle = colFn(0); let pc = '';
    for(let k = 0; k < n; k++){ const a = a0 + (a1 - a0) * (k + .5) / n, c = colFn(a); if(c !== pc){ cx.fillStyle = c; pc = c; } const xx = cxp + Math.cos(a) * r, yy = cyp - Math.sin(a) * r, s = Math.max(PX, snp(th)); cx.fillRect(snp(xx - s / 2), snp(yy - s / 2), s, s); } }

  // ---- the public toilet (kōshū toilet): two original designs, a dark tiled box under a floating slab roof, or a glass box glowing in pastels
  const PT_X = 1.44, PT_D = .48, PT_H = .5;
  function drawToilet(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .75) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; const F = c => fc(c, fog), X = PT_X, h = PT_H, rel = K.rel, near = fogPx(fog) < .05, a = 1 - fog, glass = sp.v % 4 !== 0;
    if(!K.vis(X - .1, X + PT_D)) return;
    if(!glass){ K.Q(X, 0, X, h, 0, 1, F('#3a2e2a')); K.Q(X - .001, .37, X - .001, .45, 0, 1, F('#f2e6c8')); if(near){ for(let k = 1; k < 8; k++){ const hh = k * .055; K.Q(X - .001, hh, X - .001, hh + .006, 0, 1, F('#4a3c34')); } for(let r = rel; r <= rel + m; r++){ for(const f of [0, .5]){ const t = (r - rel + f) / m; if(t >= 0 && t <= 1) K.V(X - .001, 0, h, t, .006, F('#4a3c34')); } } }
      // two entrances: a dark recess, the stainless door lit by its own downlight, the light falling onto the granite
      for(const [r0, pc] of [[1.1, '#3a7ad8'], [4.2, '#d84a4a']]){ const ta = tR(K, r0), tb = tR(K, r0 + 1.5); if(tb <= ta) continue; WB(K, X, 0, .36, ta, tb, F('#100c0e')); WB(K, X + .03, .02, .32, ta + (tb - ta) * .15, tb - (tb - ta) * .15, F('#a8acb4'));
        if(near){ WB(K, X + .03, .3, .32, ta + (tb - ta) * .15, tb - (tb - ta) * .15, F('#fff4e0')); WB(K, X + .031, .14, .18, ta + (tb - ta) * .2, ta + (tb - ta) * .26, F('#5a5e68')); }
        K.spill(X - .2, X, ta, tb, '255,236,200', .07 * a);
        // the pictogram plate beside the door: white, with the figure in blue or red
        const pa = tR(K, r0 + 1.75), pb = tR(K, r0 + 2.2); if(pb > pa){ WB(K, X - .002, .2, .3, pa, pb, F('#e8ecf0')); if(near){ const pm = (pa + pb) / 2, pw = (pb - pa) * .22; WB(K, X - .003, .27, .285, pm - pw, pm + pw, F(pc)); WB(K, X - .003, .215, .262, pm - pw * 1.3, pm + pw * 1.3, F(pc)); } } } }
    else { const PC = ['#d8b4c4', '#b0d4c0', '#dccc96', '#b4c4e0']; for(let r = rel; r < rel + m; r++){ if(r < 0 || r >= sp.len) continue; const t0 = tR(K, r), t1 = tR(K, r + 1), c = PC[(r + sp.v) % 4]; WB(K, X, .02, h, t0, t1, F(c)); if(near) WB(K, X - .001, .02, .1, t0, t1, F(mixc(c, '#ffffff', .35))); }
      K.Q(X, 0, X, .02, 0, 1, F('#2a2a32')); for(let r = rel; r <= rel + m; r++){ const t = (r - rel) / m; K.V(X - .002, 0, h, t, near ? .012 : .008, F('#22222c')); }
      K.spill(X - .25, X, 0, 1, '240,220,230', .06 * a); }
    // the floating slab roof: a pale edge, its warm-lit soffit
    K.Q(X - .07, h, X - .07, h + .045, 0, 1, F(glass ? '#e8e8e4' : '#b8b4ac')); K.Q(X - .07, h - .006, X, h - .006, 0, 1, F(glass ? '#fff8f0' : '#ffe8c0'));
    K.Q(X - .07, h + .045, X + PT_D + .07, h + .045, 0, 1, F('#5a5a62'));
    if(K.end){ K.E(X, 0, X + PT_D, h, F(glass ? '#b8aec8' : '#2e2420')); if(glass){ const PC = ['#d8b4c4', '#b0d4c0', '#dccc96', '#b4c4e0']; for(let k = 0; k < 3; k++) K.E(X + PT_D * k / 3, .02, X + PT_D * (k + 1) / 3, h, F(PC[(k + sp.v + 1) % 4])); } else K.E(X, .37, X + PT_D, .45, F('#f2e6c8'));
      if(fog < .7) glow(K.px(X + PT_D / 2, 0, 0), K.py(X, h * .55, 0), Math.max(PX * 2, K.pu(0) * .45), glass ? '#f0d8e8' : '#ffe8c0', .22 * a);
      if(glass){ for(let k = 1; k < 3; k++) K.E(X + PT_D * k / 3 - .006, 0, X + PT_D * k / 3 + .006, h, F('#22222c')); K.E(X, 0, X + PT_D, .02, F('#2a2a32')); } K.E(X - .07, h, X + PT_D + .07, h + .045, F(glass ? '#d8d8d4' : '#a8a49c'));
      if(!glass && near){ for(let k = 0; k < 5; k++) K.E(X + .12, .3 + k * .016, X + .36, .3 + k * .016 + .006, F('#5a4a40')); }
      if(glass){ K.E(X + .17, .2, X + .31, .33, F('#1c2230')); K.E(X + .19, .22, X + .29, .31, F('#3a6ab0')); if(near) K.E(X + .225, .27, X + .255, .3, F('#ffffff')); } }
    if(K.rel === 2 && fog < .6) pool(K.px(X - .25, 0, 0), K.py(X - .25, 0, 0), uw * .35, uw * .06, glass ? '#f0d0e8' : '#ffe0b0', .35 * a); }

  // ---- the vending machine cluster: three machines facing the walk, lit fronts, cans on shelves, the recycling bins beside them
  const VM_X = 1.5, VM_D = .14, VM_H = .32, VMC = [['#c8202a', '#e8e8ec'], ['#e8e8ec', '#2a6ad8'], ['#1a4aa8', '#e8e8ec']];
  function drawVend(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .7) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; const F = c => fc(c, fog), X = VM_X, rel = K.rel, near = fogPx(fog) < .05, a = 1 - fog;
    if(!K.vis(X, X + VM_D)) return;
    for(let n = 0; n < 3; n++){ const r0 = n * 2, ta = tR(K, r0 + .05), tb = tR(K, r0 + 1.95); if(tb <= ta) continue; const [body, trim] = VMC[(n + sp.v) % 3];
      WB(K, X, 0, VM_H, ta, tb, F(body)); WB(K, X, VM_H - .04, VM_H - .012, ta, tb, F('#f4f8ff'));
      WB(K, X - .001, .15, .27, ta + (tb - ta) * .06, tb - (tb - ta) * .06, F('#e8f0fa'));
      const rows = near ? 4 : 2; for(let k = 0; k < rows; k++){ const hh = .155 + k * (.11 / rows); if(near){ const nc = 8; for(let c = 0; c < nc; c++){ const t0 = ta + (tb - ta) * (.1 + c * .8 / nc), t1 = t0 + (tb - ta) * .8 / nc * .7; WB(K, X - .002, hh, hh + .11 / rows * .7, t0, t1, F(['#e83a3a', '#3a8ae8', '#f0c83a', '#3ab86a', '#f0f0f0', '#8a3ad8'][(c * 3 + k + n) % 6])); } }
        else WB(K, X - .002, hh, hh + .11 / rows * .6, ta + (tb - ta) * .1, tb - (tb - ta) * .1, F(mixc(trim, '#c86a4a', .5))); }
      WB(K, X - .001, .03, .14, ta + (tb - ta) * .06, tb - (tb - ta) * .06, F(mixc(body, '#101014', .55)));
      if(near){ WB(K, X - .002, .14, .148, ta + (tb - ta) * .1, tb - (tb - ta) * .1, F('#3ae86a')); WB(K, X - .002, .04, .07, ta + (tb - ta) * .2, tb - (tb - ta) * .4, F('#060608')); WB(K, X - .002, .09, .12, tb - (tb - ta) * .3, tb - (tb - ta) * .18, F('#c8ccd4')); }
      K.Q(X, VM_H, X + VM_D, VM_H, ta, tb, F(mixc(body, '#ffffff', .15))); K.V(X - .001, 0, VM_H, tb, .01, F('#0c0c10')); }
    // the recycling bins: two low boxes with round mouths
    { const ta = tR(K, 6.3), tb = tR(K, 7.5); if(tb > ta){ for(const [f0, f1, c] of [[0, .48, '#2a6ab0'], [.52, 1, '#3a8a4a']]){ const t0 = ta + (tb - ta) * f0, t1 = ta + (tb - ta) * f1; WB(K, X + .02, 0, .16, t0, t1, F(c)); K.Q(X + .02, .16, X + .12, .16, t0, t1, F(mixc(c, '#ffffff', .25))); if(near) WB(K, X + .019, .11, .14, t0 + (t1 - t0) * .3, t1 - (t1 - t0) * .3, F('#0a0a0e')); } } }
    if(K.end){ const [body] = VMC[sp.v % 3]; K.E(X, 0, X + VM_D, VM_H, F(mixc(body, '#000000', .35))); if(fog < .7) glow(K.px(X, 0, .5), K.py(X, VM_H * .6, .5), Math.max(PX * 2, K.pu(0) * .35), '#e8f4ff', .2 * a); }
    if(K.rel === 0 && fog < .6){ pool(K.px(X - .2, 0, .5), K.py(X - .2, 0, .5), uw * .4, uw * .07, '#e8f0ff', .4 * a); } }

  // ---- the night market: a row of yatai, tent roofs over lit counters, noren, red chōchin, people on stools, bulbs strung between
  const YT_X = 1.48, YT_D = .34;
  function drawYatai(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .72) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; const F = c => fc(c, fog), X = YT_X, rel = K.rel, near = fogPx(fog) < .05, mid = fogPx(fog) < .14, a = 1 - fog, v = sp.v;
    if(!K.vis(X - .12, X + YT_D)) return; const roofC = ['#c8303a', '#2a4a8a', '#c8303a', '#3a6a3a'][v % 4], norC = ['#1c2a5a', '#e8e0d0', '#2a2a2a', '#7a1a1a'][(v + 1) % 4];
    // the cart, its lit counter, the warm inside, the noren hanging from the eave, the tent roof rising away
    K.Q(X, 0, X, .17, 0, 1, F('#4a301e')); if(near) K.Q(X - .001, .03, X - .001, .04, 0, 1, F('#2a1a10'));
    K.Q(X - .04, .17, X, .185, 0, 1, F('#ffd08a')); K.Q(X + .02, .185, X + .02, .34, 0, 1, F('#ffb050'));
    if(mid){ const t = tR(K, 2.5); if(t > 0 && t < 1){ K.RT(X + .1, .185, t, .05, .1, F('#2a1a18')); K.RT(X + .1, .285, t, .035, .035, F('#e0b090')); } }
    const nf = near ? 3 : 1; for(let r = rel; r < rel + m; r++){ if(r < 0 || r >= sp.len) continue; for(let k = 0; k < nf; k++){ const t0 = tR(K, r + (k + .06) / nf), t1 = tR(K, r + (k + .94) / nf); WB(K, X - .05, .27, .345, t0, t1, F(norC)); if(near && k === 1) WB(K, X - .051, .3, .32, t0 + (t1 - t0) * .3, t1 - (t1 - t0) * .3, F(norC === '#e8e0d0' ? '#c8303a' : '#e8e0d0')); } }
    K.Q(X - .08, .345, X - .08, .37, 0, 1, F(mixc(roofC, '#000000', .2)));
    { const nb = near ? m * 4 : 2; for(let k = 0; k < nb; k++) K.Q(X - .08, .37, X + YT_D + .02, .44, k / nb, (k + 1) / nb, F(k % 2 && near ? '#e8e0d4' : roofC)); }
    if(near) for(let r = rel; r < rel + m; r++){ for(let k = 0; k < 4; k++){ const t = tR(K, r + (k + .5) / 4); K.RT(X - .08, .345, t, .03, .012, F(mixc(roofC, '#000000', .35))); } }
    // stools and the people on them, their backs to the walk
    if(mid){ for(let k = 0; k < 3; k++){ const r = 1 + k * 1.4; if(r < rel - .5 || r > rel + m) continue; const t = tR(K, r); if(t <= 0 || t >= 1) continue; K.RT(X - .12, .08, t, .05, .012, F('#8a8a90')); K.RT(X - .12, 0, t, .01, .08, F('#5a5a60'));
        if(H1(sp.b0 * .7 + k * 3.1) < .7){ const u = K.pu(t); fig(K.px(X - .12, .08, t), K.py(X - .12, .08, t), u * .2, F(COAT2[(k + v) % 6]), k, true); } } }
    if(K.end){ K.E(X, 0, X + YT_D, .17, F('#3a2416')); K.T(X - .08, .37, X + YT_D + .02, .37, X + YT_D * .6, .47, F(mixc(roofC, '#000000', .3))); K.E(X + .02, .185, X + YT_D - .02, .34, F('#ffb860')); { const nn = 4; for(let k = 0; k < nn; k++) K.E(X + .02 + (YT_D - .04) * (k + .08) / nn, .265, X + .02 + (YT_D - .04) * (k + .92) / nn, .345, F(norC)); }
      if(mid){ K.E(X + .06, 0, X + .13, .07, F('#141010')); K.E(X + .085, .025, X + .105, .045, F('#6a5a4a')); } }
    // the chōchin at the front corner: a red lantern with dark ribs and caps, glowing
    if(K.end && fog < .7) for(const LX of [X - .09, X + YT_D + .03]){ const u = K.pu(0), lx = K.px(LX, 0, 0), ly = K.py(LX, .3, 0), lw = Math.max(PX * 2, snp(u * .085)), lh = Math.max(PX * 2, snp(u * .12));
      R(lx - lw / 2, ly - lh / 2, lw, lh, F('#e83a2a')); if(lw >= PX * 4){ R(lx - lw / 2, ly - lh / 2, lw, PX, '#1a0a0a'); R(lx - lw / 2, ly + lh / 2 - PX, lw, PX, '#1a0a0a'); R(lx - lw / 2 + PX, ly - lh / 2 + PX, PX, lh - PX * 2, '#ff8a5a'); for(let k = 1; k < 3; k++) R(lx - lw / 2, ly - lh / 2 + snp(lh * k / 3), lw, PX, '#a01a1a'); }
      glow(lx, ly, Math.max(PX * 2, u * .22), '#ff5a3a', .45 * a); }
    // bulbs strung from this stall's eave to the next one's
    if(mid && fog < .6){ for(let k = 0; k < 6; k++){ const r = sp.len - 1 + (k + .5) / 6 * 3; if(r < rel || r >= rel + m) continue; const t = tR(K, r), sg = .36 - Math.sin((k + .5) / 6 * Math.PI) * .03; K.bulb(X - .07, sg, t, '#fff0c0', '#ffd080', .012, near ? .2 * a : 0); } }
    if(K.rel === 1 && fog < .6) pool(K.px(X - .15, 0, 0), K.py(X - .15, 0, 0), uw * .4, uw * .06, '#ffb060', .4 * a); }

  // ---- the kitchen car: a kei van, two-tone, its side hatch propped open as an awning, a lit counter and the cook, menu cards, a board, a nobori
  const KC_X = 1.46, KC_D = .3, KCC = ['#d86a2a', '#2a8a8a', '#d8a82a', '#c83a5a'];
  function drawKcar(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .72) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; const F = c => fc(c, fog), X = KC_X, rel = K.rel, near = fogPx(fog) < .05, mid = fogPx(fog) < .14, a = 1 - fog, body = KCC[sp.v % 4];
    if(!K.vis(X - .15, X + KC_D)) return;
    K.Q(X, .03, X, .14, 0, 1, F(body)); K.Q(X, .14, X, .3, 0, 1, F('#e4e0d8')); K.Q(X, .3, X + KC_D, .32, 0, 1, F('#c8c4bc')); if(near) K.Q(X - .001, .135, X - .001, .145, 0, 1, F(mixc(body, '#ffffff', .3)));
    // the hatch: the lit opening, the cook, the counter shelf, the flap lifted over it
    { const ta = tR(K, 1.1), tb = tR(K, 3.6); if(tb > ta){ WB(K, X, .145, .275, ta, tb, F('#ffd090')); if(mid){ WB(K, X + .02, .145, .2, ta, tb, F('#c88a50')); const tc = ta + (tb - ta) * .55; K.RT(X + .1, .16, tc, .05, .09, F('#e8e8e8')); K.RT(X + .1, .25, tc, .035, .035, F('#e0b090')); }
        K.Q(X - .06, .145, X, .155, ta, tb, F('#e8e4dc')); { const ns = near ? 8 : 4; for(let k = 0; k < ns; k++) K.Q(X, .28, X - .15, .31, ta + (tb - ta) * k / ns, ta + (tb - ta) * (k + 1) / ns, F(k % 2 ? '#f4f0e8' : body)); } K.Q(X - .15, .295, X - .15, .31, ta, tb, F(mixc(body, '#000000', .3)));
        if(near){ for(let k = 0; k < 3; k++){ const t = ta + (tb - ta) * (.2 + k * .3); K.bulb(X - .1, .29, t, '#fff6e0', '#ffe0a0', .012, .15 * a); } } } }
    // menu cards stuck on the window behind the cab, lit from inside
    if(near){ for(let k = 0; k < 3; k++){ const t0 = tR(K, 3.75 + k * .3), t1 = tR(K, 3.97 + k * .3); if(t1 > t0){ WB(K, X - .001, .17, .24, t0, t1, F('#f4f0e8')); WB(K, X - .002, .19, .225, t0 + (t1 - t0) * .2, t1 - (t1 - t0) * .2, F(['#c86a3a', '#e8b83a', '#8a5a3a'][k])); } } }
    // wheels
    for(const r of [.7, 3.9]){ const ta = tR(K, r), tb = tR(K, r + .5); if(tb > ta){ WB(K, X - .002, 0, .075, ta, tb, F('#101014')); if(near) WB(K, X - .003, .025, .05, ta + (tb - ta) * .35, tb - (tb - ta) * .35, F('#8a8a90')); } }
    if(K.end){ K.E(X, .03, X + KC_D, .14, F(mixc(body, '#000000', .2))); K.E(X, .14, X + KC_D, .3, F('#cac6be')); K.E(X + .02, .15, X + KC_D - .02, .29, F('#fff2d8')); if(fogPx(fog) < .12){ for(let k = 0; k < 4; k++) K.E(X + .05, .255 - k * .03, X + KC_D - .07 - (k % 2) * .05, .267 - k * .03, F(k ? '#5a4030' : '#c83a2a')); }
      if(fog < .7) glow(K.px(X + KC_D / 2, 0, 0), K.py(X, .22, 0), Math.max(PX * 2, K.pu(0) * .3), '#fff0d0', .25 * a);
      K.E(X - .005, .07, X + .03, .1, F('#ff3a2a')); K.E(X + KC_D - .03, .07, X + KC_D + .005, .1, F('#ff3a2a')); if(near) K.E(X + .11, .05, X + .19, .085, F('#e8e8d0')); }
    if(K.rel === 2 && fog < .6) pool(K.px(X - .2, 0, 0), K.py(X - .2, 0, 0), uw * .45, uw * .07, '#ffd090', .45 * a); }
  // the kitchen car's A-frame menu board and its nobori banner, and the people waiting (camera-facing, at their own segments)
  function drawKcarExtras(sp, x, y, uw, fog, now){ if(fog > .6) return; const F = c => fc(c, fog), a = 1 - fog;
    if(sp.part === 'board'){ const w = uw * .09, h = uw * .14; R(x - w / 2, y - h, w, h, F('#2a2420')); R(x - w / 2 + Math.max(PX, uw * .008), y - h + Math.max(PX, uw * .008), w - Math.max(PX * 2, uw * .016), h * .62, F('#f0e8d0'));
      if(uw > 30){ for(let k = 0; k < 4; k++) R(x - w * .32, y - h * .86 + k * h * .13, w * (k % 2 ? .5 : .64), Math.max(PX, h * .04), F(k ? '#5a4030' : '#c83a2a')); } glow(x, y - h * .6, uw * .15, '#fff0d0', .2 * a); }
    else if(sp.part === 'flag'){ const ph = uw * .5, pw = Math.max(PX, snp(uw * .008)), bw = Math.max(PX, snp(uw * .06)), sw = reduce ? 0 : Math.sin(now / 900 + sp.k) * uw * .004;
      R(x - pw / 2, y - ph, pw, ph, F('#8a8a90')); R(x - pw / 2, y - ph, bw + pw, Math.max(PX, uw * .006), F('#8a8a90')); R(x + pw / 2 + sw, y - ph + uw * .01, bw, ph * .7, F('#e8c83a'));
      if(uw > 24){ for(let k = 0; k < 4; k++) R(x + pw / 2 + sw + bw * .25, y - ph + uw * .04 + k * ph * .14, bw * .5, ph * .09, F('#c8202a')); R(x + pw / 2 + sw, y - ph + uw * .01, Math.max(PX, bw * .12), ph * .7, F('#c8202a')); } }
    else if(sp.part === 'ppl'){ for(let k = 0; k < sp.n; k++) fig(x + (k - (sp.n - 1) / 2) * uw * .09, y + k * PX, uw * (.28 + .02 * ((k + sp.k) % 2)), F(COAT2[(k + sp.k) % 6]), k + sp.k, false); } }

  // ---- the kiosk (coffee, taiyaki): a small booth, its lit service window under a striped awning, a lit sign box on the roof facing you
  const KO_X = 1.46, KO_D = .34, KO_H = .36;
  function drawKiosk(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .75) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; const F = c => fc(c, fog), X = KO_X, near = fogPx(fog) < .05, a = 1 - fog, gr = ['#2a6a4a', '#8a3a2a', '#2a4a7a', '#6a4a8a'][sp.v % 4];
    if(!K.vis(X - .12, X + KO_D)) return;
    K.Q(X, 0, X, KO_H, 0, 1, F('#d8d4cc')); K.Q(X, 0, X, .06, 0, 1, F(gr));
    { const ta = tR(K, .8), tb = tR(K, 4.2); if(tb > ta){ WB(K, X - .001, .12, .27, ta, tb, F('#ffd890')); if(near){ WB(K, X + .02, .12, .19, ta, tb, F('#c88a4a')); const tc = (ta + tb) / 2; K.RT(X + .1, .14, tc, .05, .1, F('#f0f0f0')); K.RT(X + .1, .24, tc, .035, .035, F('#e0b090')); }
        K.Q(X - .05, .12, X, .13, ta, tb, F('#e8e4dc')); const ns = near ? 8 : 4; for(let k = 0; k < ns; k++) K.Q(X, .28, X - .11, .315, ta + (tb - ta) * k / ns, ta + (tb - ta) * (k + 1) / ns, F(k % 2 ? '#f0ece4' : gr)); } }
    K.Q(X - .02, KO_H, X + KO_D + .02, KO_H, 0, 1, F('#3a3a42')); K.Q(X - .02, KO_H - .02, X - .02, KO_H + .01, 0, 1, F(gr));
    if(K.end){ K.E(X, 0, X + KO_D, KO_H, F('#c4c0b8')); K.E(X, 0, X + KO_D, .06, F(gr)); K.E(X + .07, .1, X + KO_D - .07, .25, F('#ffd890'));
      K.E(X + .03, KO_H, X + KO_D - .03, KO_H + .02, F('#2a2a32')); K.E(X + .02, KO_H + .02, X + KO_D - .02, KO_H + .17, F('#f4f8ff')); K.E(X + .02, KO_H + .02, X + KO_D - .02, KO_H + .035, F(gr));
      if(fogPx(fog) < .14){ const c0 = X + KO_D * .36, c1 = X + KO_D * .58; K.E(c0, KO_H + .06, c1, KO_H + .13, F(gr)); K.E(c1, KO_H + .08, c1 + .035, KO_H + .11, F(gr)); K.E(c0 - .02, KO_H + .05, c1 + .02, KO_H + .06, F(gr)); }
      if(fog < .7) glow(K.px(X + KO_D / 2, 0, 0), K.py(X, KO_H + .1, 0), Math.max(PX * 2, K.pu(0) * .3), '#e8f0ff', .25 * a); }
    if(K.rel === 1 && fog < .6) pool(K.px(X - .2, 0, 0), K.py(X - .2, 0, 0), uw * .35, uw * .06, '#ffd890', .4 * a); }
  // ---- the information board: a lit map of the bay on two posts, then a row of shared bicycles in their dock
  const IB_X = 1.52;
  function drawInfo(sp, x, y, uw, fog, now){ const K = ENV.bkit; if(!K || fog > .7) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; const F = c => fc(c, fog), X = IB_X, near = fogPx(fog) < .05, a = 1 - fog;
    for(const r of [.15, 1.85]){ const t = tR(K, r); if(t > 0 && t < 1) K.V(X + .01, 0, .16, t, .02, F('#2a2e38')); }
    const ta = tR(K, 0), tb = tR(K, 2); if(tb <= ta) return; WB(K, X, .14, .36, ta, tb, F('#1c2430')); WB(K, X - .001, .155, .345, ta + (tb - ta) * .04, tb - (tb - ta) * .04, F('#e8e2d0'));
    WB(K, X - .002, .31, .345, ta + (tb - ta) * .04, tb - (tb - ta) * .04, F('#1a6a8a'));
    if(near){ const tt = f => ta + (tb - ta) * f; WB(K, X - .003, .32, .335, tt(.1), tt(.5), F('#e8f0f4')); WB(K, X - .003, .32, .335, tt(.56), tt(.72), F('#e8f0f4'));
      WB(K, X - .003, .16, .23, tt(.04), tt(.96), F('#4a7ab0')); WB(K, X - .003, .23, .305, tt(.04), tt(.62), F('#d8ccb0')); WB(K, X - .003, .23, .3, tt(.62), tt(.96), F('#4a7ab0')); WB(K, X - .004, .25, .29, tt(.12), tt(.34), F('#7aa86a'));
      WB(K, X - .004, .262, .27, tt(.04), tt(.62), F('#ffffff')); WB(K, X - .004, .23, .305, tt(.44), tt(.46), F('#ffffff')); WB(K, X - .005, .238, .256, tt(.38), tt(.42), F('#e82a2a')); }
    K.Q(X, .36, X + .04, .36, ta, tb, F('#3a4250')); if(K.rel === 0) K.bulb(X - .02, .37, (ta + tb) / 2, '#f0f4ff', '#c8d8ff', .015, .2 * a); }
  // a shared bicycle parked across the walk, seen side-on: two wheels, the frame, a red mudguard and the basket; the dock rail under it
  function drawBike(sp, x, y, uw, fog, now){ if(fog > .55 || !rbOK()) return; const F = c => fc(c, fog), r = uw * .055, wb = uw * .2; if(r < PX * 1.5){ R(x - wb / 2 - r, y - r * 2, wb + r * 2, r * 2, F('#2a2028')); return; }
    const xa = x - wb / 2, xb = x + wb / 2, yc = y - r, th = Math.max(PX, snp(uw * .008)), tc = F('#16161c'), fc2 = F(sp.v % 3 ? '#b8282e' : '#d8d8de');
    arcPx(xa, yc, r, 0, 6.283, th, () => tc); arcPx(xb, yc, r, 0, 6.283, th, () => tc); if(r > PX * 4){ R(xa - PX / 2, yc - PX / 2, PX, PX, F('#8a8a90')); R(xb - PX / 2, yc - PX / 2, PX, PX, F('#8a8a90')); arcPx(xb, yc, r + th, .3, 2.2, th, () => fc2); }
    rbBegin(true); const fl = c32(fc2), sx = xa + wb * .4, sy = y - r * 2.3, hx = xb - wb * .1, hy = y - r * 2.6;
    line(xa, yc, sx, sy, fl); line(xa, yc, x, yc, fl); line(x, yc, sx, sy, fl); line(x, yc, hx, hy + r * .4, fl); line(sx, sy, hx, hy + r * .4, fl); line(hx, hy + r * .4, xb, yc, fl); rbFlush();
    R(sx - r * .35, sy - th, r * .7, th * 1.5, tc); R(hx - r * .2, hy, r * .5, th, tc); R(hx + r * .1, hy + th, r * .55, r * .45, F('#3a3a42'));
    R(x - wb * .7, y - th, wb * 1.4, th, F('#4a4e5a')); }

  // ---- public artwork (original designs)
  // a stainless ring standing on edge, broken at one side with its two ends slid past each other, on a granite plinth, uplit warm, the moon on its rim
  function drawRing(sp, x, y, uw, fog, now){ if(fog > .6) return; const F = c => fc(c, fog), a = 1 - fog, pw = uw * .34, ph = uw * .14;
    R(x - pw / 2, y - ph, pw, ph, F('#3a3c48')); R(x - pw / 2, y - ph, pw, Math.max(PX, uw * .012), F('#6a6e7e')); R(x - pw / 2, y - ph - uw * .02, pw, uw * .02, F('#4e505e'));
    const rr = uw * .23, cxp = x, cyp = y - ph - uw * .02 - rr - uw * .02, th = Math.max(PX, uw * .045);
    const col = ang => { const c = Math.cos(ang - 2.2); return F(c > .6 ? '#f4f8ff' : c > .1 ? '#9aa4bc' : c > -.6 ? '#2e3442' : '#e8b070'); };
    arcPx(cxp, cyp, rr, -1.25, 4.6, th, col); arcPx(cxp + uw * .03, cyp - uw * .02, rr, 4.75, 5.15, th, col);
    if(fog < .5){ glow(cxp, y - ph, uw * .25, '#ffb060', .22 * a); glow(cxp - rr * .6, cyp - rr * .6, uw * .06, '#e8f0ff', .2 * a); } }
  // the wire cones of light (Kishamichi): a slim pole holding a cone of wire that opens upward, wound with a helix of warm bulbs
  function drawCone(sp, x, y, uw, fog, now){ if(fog > .7) return; const F = c => fc(c, fog), a = 1 - fog, ph = uw * .58, pw = Math.max(PX, snp(uw * .012)); if(ph < PX * 4) return;
    R(x - pw / 2, y - ph, pw, ph, F('#3a3a44')); R(x - pw * 1.5, y - uw * .015, pw * 3, uw * .015, F('#2a2a32'));
    const N = uw > 60 ? 54 : uw > 20 ? 36 : 18, bs = uw > 90 ? PX * 2 : PX, tw = sp.v ? -1 : 1; let pc = '';
    for(let k = 0; k < N; k++){ const f = k / N, th = tw * (f * 6.283 * 3.2 + sp.k), rr = uw * (.02 + f * .13 + .02 * Math.sin(f * 9 + sp.k)), bx = x + Math.cos(th) * rr, by = y - ph - f * uw * .42, back = Math.sin(th) < 0;
      const c = back ? F('#b89058') : (k % 5 ? '#fff0c0' : '#ffffff'); if(c !== pc){ cx.fillStyle = c; pc = c; } cx.fillRect(snp(bx), snp(by), bs, bs); }
    if(fog < .6){ glow(x, y - ph - uw * .25, uw * .3, '#ffd890', .22 * a); pool(x, y, uw * .3, uw * .05, '#ffd890', .25 * a); } }
  // an old ship's anchor on a granite base: shank, stock, ring and curved arms with flukes, black iron with moonlit edges, a spotlight from the front
  function drawAnchor(sp, x, y, uw, fog, now){ if(fog > .6) return; const F = c => fc(c, fog), a = 1 - fog, bw = uw * .34, bh = uw * .13; R(x - bw / 2, y - bh, bw, bh, F('#3e404c')); R(x - bw / 2, y - bh, bw, Math.max(PX, uw * .012), F('#7a7e8e')); R(x - bw / 2, y - bh * .45, bw, Math.max(PX, uw * .006), F('#2e303a'));
    const yb = y - bh, sw = Math.max(PX, snp(uw * .03)), sh = uw * .42, iron = F('#4a362a'), rim = F('#9aa0b0'), warm = F('#b07a4a');   // (spotlit from the front: warm iron, a cool moonlit rim)
    R(x - sw / 2, yb - sh, sw, sh, iron); R(x - sw / 2, yb - sh, Math.max(PX, sw * .3), sh, rim); R(x + sw / 2 - PX, yb - sh * .6, PX, sh * .6, warm);
    R(x - uw * .11, yb - sh * .86, uw * .22, Math.max(PX, uw * .022), iron); R(x - uw * .11, yb - sh * .86, uw * .22, PX, rim); R(x - uw * .125, yb - sh * .875, Math.max(PX, uw * .022), uw * .034, iron); R(x + uw * .103, yb - sh * .875, Math.max(PX, uw * .022), uw * .034, iron);
    arcPx(x, yb - sh - uw * .035, uw * .03, 0, 6.283, Math.max(PX, uw * .012), () => iron);
    arcPx(x, yb - uw * .2, uw * .19, 3.45, 5.97, Math.max(PX, uw * .034), ang => Math.sin(ang) < -.97 ? warm : iron); arcPx(x, yb - uw * .2, uw * .19 - Math.max(PX, uw * .017), 3.55, 4.4, PX, () => rim);
    for(const q of [-1, 1]){ const fx = x + q * uw * .18, fy = yb - uw * .135; poly(fx - q * uw * .015, fy + uw * .01, fx + q * uw * .08, fy - uw * .1, fx + q * uw * .04, fy - uw * .12, fx - q * uw * .04, fy - uw * .03, iron); poly(fx + q * uw * .08, fy - uw * .1, fx + q * uw * .04, fy - uw * .12, fx + q * uw * .045, fy - uw * .115, fx + q * uw * .075, fy - uw * .1, rim); }
    if(fog < .5){ glow(x, yb - sh * .4, uw * .3, '#ffd0a0', .14 * a); pool(x, y - bh, uw * .3, uw * .05, '#ffe0b0', .25 * a); } }
  // the lifebuoy in its white holder on a post by the edge: an orange and white ring, the box's lit edge
  function drawBuoy(sp, x, y, uw, fog, now){ if(fog > .55) return; const F = c => fc(c, fog), ph = uw * .2, pw = Math.max(PX, snp(uw * .014)); R(x - pw / 2, y - ph, pw, ph, F('#c8ccd4'));
    const bw = uw * .1, bh = uw * .12, by = y - ph - bh * .2; R(x - bw / 2, by - bh, bw, bh, F('#e4e6ea')); R(x - bw / 2, by - bh, bw, Math.max(PX, uw * .006), F('#ffffff')); R(x + bw / 2 - Math.max(PX, uw * .008), by - bh, Math.max(PX, uw * .008), bh, F('#9a9eaa'));
    const rr = uw * .036, th = Math.max(PX, uw * .016); if(rr < PX * 1.5){ R(x - PX, by - bh * .5 - PX, PX * 2, PX * 2, F('#ff6a2a')); return; }
    arcPx(x, by - bh * .5, rr, 0, 6.283, th, ang => F(Math.floor((ang + .4) / 1.5708) % 2 ? '#f4f0ea' : '#ff5a1a')); }
  // a mooring bitt on the coping: base plate, squat body, the wider cap worn pale by the ropes (yellow on the working pier)
  function drawBitt(sp, x, y, uw, fog, now){ if(fog > .45 || uw < 6) return; const F = c => fc(c, fog), yl = sp.v === 1, body = F(yl ? '#c8a020' : '#16181e'), rim = F(yl ? '#f0d060' : '#4e5262');
    const bw = uw * .075, bh = Math.max(PX, uw * .012), w = uw * .042, h = uw * .05, cw = uw * .064, ch = Math.max(PX, uw * .018);
    R(x - bw / 2, y - bh, bw, bh, F('#22242c')); R(x - w / 2, y - bh - h, w, h, body); R(x - cw / 2, y - bh - h - ch, cw, ch, body); R(x - cw / 2, y - bh - h - ch, cw, Math.max(PX, ch * .4), rim);
    if(uw > 60){ R(x - w / 2, y - bh - h, Math.max(PX, w * .2), h, rim); R(x + w / 2 - PX, y - bh - h, PX, h, F(yl ? '#7a5a10' : '#0a0a0e')); } }
  // the pipe railing along the edge: a post at this segment, two rails to the next post (two segments on), lit from above
  function drawRail(sp, x, y, uw, fog, now){ if(fog > .5 || uw < 5) return; const F = c => fc(c, fog), ph = uw * .16, pw = Math.max(PX, snp(uw * .012)); R(x - pw / 2, y - ph, pw, ph, F('#4a5060')); if(uw > 40) R(x - pw / 2, y - ph, Math.max(PX, pw / 2), ph, F('#7a8090'));
    if(uw < 12) return; const t = segs[sp.k + 2]; if(!t || !t.p1.screen.w || t.p1.camera.z <= 0 || !rbOK()) return; const q = t.p1.screen, x2 = q.x + sp.x * q.w; if(Math.abs(x2 - x) > W) return;
    rbBegin(true); const c1 = c32(F('#6e7484')), c2 = c32(F('#3e4452')); line(x, y - ph, x2, q.y - q.w * .16, c1); if(uw > 24) line(x, y - ph * .5, x2, q.y - q.w * .08, c2); if(uw > 90){ line(x, y - ph + PX, x2, q.y - q.w * .16 + PX, c2); } rbFlush(); }
  // ---------------------------------------------------------------- the shoreline: boats moored at the quay, the waterbus pier (minato.md, "Round 2")
  /* Per visit, after the heart is chosen (it never moves the heart): one waterbus pier pavilion out on its pontoon (Pukari Sanbashi's type,
     an original design), and up to four boats moored along the quay: yakatabune dressed in red chōchin with warm shoji windows, and small
     work boats with tyre fenders and a lit wheelhouse. They keep clear of the heart's basin, the moored ships and each other. */
  function layExtras(L){ L.moor = []; L.pier = null; if(!L.ok) return; const H = L.H, busy = [[H - 390, H + 110]];
    for(const id in L.has){ const r = L.has[id]; if(r.x > 0 && r.x < 5) busy.push([r.z0 - 25, r.z1 + 25]); }
    const free = (a, b) => clearSpan(L, a, b) && !busy.some(q => b >= q[0] && a <= q[1]);
    for(const d of [210, -480, 760, -640]){ const a = H + d, b = a + 18; if(free(a - 12, b + 12)){ L.pier = { z0:a, z1:b, x:3.72, gz:a + 6 }; busy.push([a - 34, b + 34]); break; } }
    let n = 0; for(const d of [-700, -580, -450, 150, 290, 370, 640, 730, 830, 920]){ const kind = H1(L.B0 * .37 + d * 1.3) < .55 ? 'yakata' : 'work', len = kind === 'yakata' ? 34 : 16, a = H + d, b = a + len;
      if(!free(a - 6, b + 6)) continue; L.moor.push({ kind, z0:a, z1:b }); busy.push([a - 16, b + 16]); if(++n >= 4) break; } }
  // a mooring line from a cleat on the boat to a bitt on the coping, sagging
  function mline(za, xa, ha, zb, xb, hb, c){ PJ(za, xa, ha); const ax = PJX, ay = PJY; PJ(zb, xb, hb); const bx = PJX, by = PJY, n = 6; let px0 = ax, py0 = ay;
    for(let k = 1; k <= n; k++){ const f = k / n, xx = lerp(ax, bx, f), yy = lerp(ay, by, f) + Math.sin(f * Math.PI) * Math.abs(bx - ax) * .06; line(px0, py0, xx, yy, c); px0 = xx; py0 = yy; } }
  const YK = { beam:.7, x:2.97 }, WK = { beam:.5, x:2.86 };
  function drawMoor(o, now){ const gf = objFog(o), F = c => fc(c, gf), z0 = o.z0, z1 = o.z1, cz = camSeg(); if(z1 < cz + 1) return; const za = Math.max(z0 + 3, cz + .6), yk = o.sub === 'yakata', S = yk ? YK : WK, xb = o.x - S.beam / 2, a = 1 - gf;
    PJ((za + z1) / 2, xb, .2); const u = PJU, near = u > PX * 14;
    if(yk){ // the hull: a dark boot, the warm white side, the red strake; the bow rising
      wq(za, xb, -.1, z1, xb, -.1, z1, xb, .12, za, xb, .12, F('#d8d0c4')); wq(za, xb - .002, -.1, z1, xb - .002, -.1, z1, xb - .002, -.05, za, xb - .002, -.05, F('#2a1e1e')); wq(za, xb - .003, .075, z1, xb - .003, .075, z1, xb - .003, .105, za, xb - .003, .105, F('#b82a2a'));
      if(z0 + 3 > cz + .6){ wq(z0 - 2, o.x, -.05, z0 + 3, xb, -.1, z0 + 3, xb, .12, z0 - 2, o.x, .2, F('#c8c0b4')); wq(z0 - 2, o.x, .2, z0 + 3, xb, .12, z0 + 3, xb + S.beam, .12, z0 - 2, o.x, .2, F('#a89e90')); }
      // the cabin: dark posts, warm shoji between them, the eave and the roof deck with its rail
      const cz0 = Math.max(z0 + 5, cz + .6), cz1 = z1 - 3, xc = xb + .06; if(cz1 > cz0){ wq(cz0, xc, .12, cz1, xc, .12, cz1, xc, .34, cz0, xc, .34, F('#2a1c16')); wq(cz0, xc - .001, .13, cz1, xc - .001, .13, cz1, xc - .001, .28, cz0, xc - .001, .28, F('#ffcf80'));
        if(u > PX * 2){ for(let z = z0 + 5; z < cz1; z += 2.4){ if(z + .3 < cz0) continue; wq(z, xc - .001, .12, z + .35, xc - .001, .12, z + .35, xc - .001, .34, z, xc - .001, .34, F('#3a2418')); } }
        if(near){ for(const hh of [.18, .23]) wq(cz0, xc - .001, hh, cz1, xc - .001, hh, cz1, xc - .001, hh + .008, cz0, xc - .001, hh + .008, F('#a8783a')); }
        wq(cz0, xc - .03, .34, cz1, xc - .03, .34, cz1, xc - .03, .38, cz0, xc - .03, .38, F('#2a1e18')); wq(cz0, xc - .03, .38, cz1, xc - .03, .38, cz1, xc + S.beam - .1, .38, cz0, xc + S.beam - .1, .38, F('#16121a')); if(u > PX * 2) wq(cz0, xc - .03, .38, cz1, xc - .03, .38, cz1, xc - .03, .41, cz0, xc - .03, .41, F('#a89a88'));
        if(cz0 > cz + 1) wq(cz0, xc, .12, cz0, xc + S.beam - .12, .12, cz0, xc + S.beam - .12, .38, cz0, xc, .38, F('#c89a5a')); }
      // the chōchin along the eave: red paper with a warm core, glowing; and their twins below them in the water (reflObj)
      if(gf < .7){ for(let z = z0 + 6.2; z < cz1; z += 2.4){ if(z < cz + 1) continue; PJ(z, xc - .05, .305); const ls = Math.max(PX, snp(PJU * .045)), lh = Math.max(PX, snp(PJU * .06)); R(PJX - ls / 2, PJY - lh / 2, ls, lh, F('#e8402a')); if(ls >= PX * 3) R(PJX - ls / 2 + PX, PJY - lh / 2 + PX, PX, lh - PX * 2, '#ffb07a');
          if(PJU > PX * 3) glow(PJX, PJY, Math.max(PX * 2, PJU * .12), '#ff6a3a', .3 * a); } } }
    else { // the work boat: a dark hull with tyre fenders, the white wheelhouse aft with lit windows, a mast with its masthead light
      wq(za, xb, -.1, z1, xb, -.1, z1, xb, .1, za, xb, .1, F('#1a2a4a')); wq(za, xb - .002, .07, z1, xb - .002, .07, z1, xb - .002, .1, za, xb - .002, .1, F('#c8ccd4'));
      if(z0 + 3 > cz + .6){ wq(z0, o.x, -.05, z0 + 3, xb, -.1, z0 + 3, xb, .1, z0, o.x, .16, F('#14203a')); }
      if(u > PX * 1.5){ for(let z = z0 + 3; z < z1 - 1; z += 2.6){ if(z < cz + 1) continue; PJ(z, xb - .01, .02); const ts = Math.max(PX, snp(PJU * .05)); R(PJX - ts / 2, PJY - ts / 2, ts, ts, F('#0c0c10')); if(ts >= PX * 3) R(PJX - ts / 2, PJY - ts / 2, ts, PX, F('#3a3a42')); } }
      const wz0 = Math.max(z0 + len3(o) * .55, cz + .6), wz1 = z1 - 1; if(wz1 > wz0){ wq(wz0, xb + .08, .1, wz1, xb + .08, .1, wz1, xb + .08, .3, wz0, xb + .08, .3, F('#d8dce4')); wq(wz0, xb + .079, .2, wz1, xb + .079, .2, wz1, xb + .079, .27, wz0, xb + .079, .27, F(H1(z0) < .6 ? '#ffd890' : '#c8e0f0'));
        if(wz0 > cz + 1) wq(wz0, xb + .08, .1, wz0, xb + S.beam - .08, .1, wz0, xb + S.beam - .08, .3, wz0, xb + .08, .3, F('#b8bcc4')); wq(wz0, xb + .08, .3, wz1, xb + .08, .3, wz1, xb + S.beam - .08, .3, wz0, xb + S.beam - .08, .3, F('#e8ecf0')); }
      { const mz = z0 + len3(o) * .52; if(mz > cz + 1){ PJ(mz, o.x, .3); const ax = PJX, ay = PJY; PJ(mz, o.x, .62); cx.fillStyle = F('#8a8e98'); pxRect(ax - PX / 2, PJY, PX, ay - PJY); const bs = Math.max(PX, snp(PJU * .03)); R(PJX - bs / 2, PJY - bs, bs, bs, '#fffaf0'); if(PJU > PX * 2) glow(PJX, PJY, PJU * .15, '#fff4e0', .35 * a); } } }
    // mooring lines to the bitts
    if(u > PX * 1.2 && rbOK()){ rbBegin(true); const lc = c32(F('#8a8070')); if(z0 + 2 > cz + 1) mline(z0 + 2, xb, .1, z0 - 4, QX - .04, .07, lc); if(z1 - 2 > cz + 1) mline(z1 - 2, xb, .1, z1 + 4, QX - .04, .07, lc); rbFlush(); } }
  const len3 = o => o.z1 - o.z0;
  function reflMoor(o){ if(o.z1 < camSeg() + 1) return; if(o.sub === 'yakata'){ const xc = o.x - YK.beam / 2 + .01; for(let z = o.z0 + 6.2; z < o.z1 - 3; z += 2.4){ PJ(z, xc, -.5 - .31); rcol(PJX, PJY, PJU * .5, c32('#c8502a', 225), c32('#7a2a1a', 190)); }
      for(let z = o.z0 + 7.4; z < o.z1 - 3; z += 4.8){ PJ(z, xc, -.5 - .22); rdot(PJX, PJY, c32('#a8803a', 200), 3); } }
    else { PJ(o.z0 + len3(o) * .52, o.x, -.5 - .62); rcol(PJX, PJY, PJU * .6, c32('#c8c0a8', 210), c32('#6a6658', 180)); } }
  // the waterbus pier: a pontoon held by piles, a white two-storey pavilion with arched lit openings, a green hip roof and a cupola, a lit sign, the gangway
  function drawPier(o, now){ const gf = objFog(o), F = c => fc(c, gf), z0 = o.z0, z1 = o.z1, cz = camSeg(); if(z1 < cz + 1) return; const a = 1 - gf, P0 = 3.06, P1 = 4.5, X0 = 3.24, X1 = 4.22, za = Math.max(z0, cz + .6);
    PJ((za + z1) / 2, X0, .3); const u = PJU, near = u > PX * 10, mid = u > PX * 2.5;
    // the gangway from the quay, a pale deck with two rails
    { const g0 = Math.max(o.gz, cz + .6), g1 = o.gz + 3; if(g1 > g0){ wq(g0, QX - .02, .03, g1, QX - .02, .03, g1, P0, .06, g0, P0, .06, F('#9aa0ac')); wq(g0, QX - .02, .03, g0, P0, .06, g0, P0, .16, g0, QX - .02, .14, F('#3a3e48'));
        if(mid && rbOK()){ rbBegin(true); const rc = c32(F('#e8ecf0')); for(const gz of [g0, g1]){ PJ(gz, QX, .16); const ax = PJX, ay = PJY; PJ(gz, P0, .18); line(ax, ay, PJX, PJY, rc); } rbFlush(); } } }
    // the pontoon: its pale edge and dark freeboard, the deck seen from above
    wq(za, P0, -.06, z1, P0, -.06, z1, P0, .06, za, P0, .06, F('#2a2e38')); wq(za, P0 - .001, .04, z1, P0 - .001, .04, z1, P0 - .001, .065, za, P0 - .001, .065, F('#d8dce4'));
    wq(za, P0, .065, z1, P0, .065, z1, P1, .065, za, P1, .065, F('#5a5e6a')); if(z0 > cz + .6) wq(z0, P0, -.06, z0, P1, -.06, z0, P1, .065, z0, P0, .065, F('#3a3e48'));
    // the pavilion: ground floor of white columns and arched openings lit warm, a floor band, the upper floor with its balcony rail and windows
    const pz0 = Math.max(z0 + 3, cz + .6), pz1 = z1 - 3; if(pz1 > pz0){ wq(pz0, X0, .065, pz1, X0, .065, pz1, X0, .62, pz0, X0, .62, F('#e4e0d8'));
      const nb = 4, bl = (z1 - 3 - (z0 + 3)) / nb; for(let k = 0; k < nb; k++){ const b0 = z0 + 3 + k * bl + bl * .18, b1 = b0 + bl * .64; if(b1 < cz + .6) continue; const c0 = Math.max(b0, cz + .6);
        wq(c0, X0 - .001, .08, b1, X0 - .001, .08, b1, X0 - .001, .3, c0, X0 - .001, .3, F('#ffd8a0')); if(mid) wq(c0, X0 - .001, .3, b1, X0 - .001, .3, (c0 + b1) / 2, X0 - .001, .35, (c0 + b1) / 2, X0 - .001, .35, F('#ffd8a0'));
        wq(c0, X0 - .001, .42, b1, X0 - .001, .42, b1, X0 - .001, .56, c0, X0 - .001, .56, F(H1(z0 + k) < .7 ? '#ffe4b8' : '#3a3a48')); }
      wq(pz0, X0 - .02, .36, pz1, X0 - .02, .36, pz1, X0 - .02, .39, pz0, X0 - .02, .39, F('#f4f2ee')); if(mid) wq(pz0, X0 - .03, .45, pz1, X0 - .03, .45, pz1, X0 - .03, .46, pz0, X0 - .03, .46, F('#ffffff'));
      // the lit sign on the road side: a blue panel with white characters as bars
      { const s0 = Math.max(z0 + 5, cz + .6), s1 = z0 + 13; if(s1 > s0){ wq(s0, X0 - .03, .565, s1, X0 - .03, .565, s1, X0 - .03, .615, s0, X0 - .03, .615, F('#2a5ac8')); if(near) for(let k = 0; k < 4; k++){ const c0 = z0 + 5.6 + k * 1.9; if(c0 < cz + 1) continue; wq(c0, X0 - .031, .575, c0 + 1.1, X0 - .031, .575, c0 + 1.1, X0 - .031, .605, c0, X0 - .031, .605, '#f0f6ff'); } } }
      if(pz0 > cz + 1){ wq(pz0, X0, .065, pz0, X1, .065, pz0, X1, .62, pz0, X0, .62, F('#c8c4bc')); wq(pz0, X0 + .2, .08, pz0, X1 - .2, .08, pz0, X1 - .2, .32, pz0, X0 + .2, .32, F('#ffcf90')); }
      // the green hip roof and the cupola
      const rz0 = Math.max(z0 + 2, cz + .6), rz1 = z1 - 2, xm = (X0 + X1) / 2; if(rz1 > rz0){ wq(rz0, X0 - .06, .62, rz1, X0 - .06, .62, Math.max(rz0, z1 - 7), xm, .86, Math.max(rz0, z0 + 7), xm, .86, F('#2e6a4e')); if(mid) wq(rz0, X0 - .06, .615, rz1, X0 - .06, .615, rz1, X0 - .06, .64, rz0, X0 - .06, .64, F('#e8ece8'));
        if(z0 + 2 > cz + .6){ PJ(z0 + 2, X0 - .06, .62); const ax = PJX, ay = PJY; PJ(z0 + 2, X1 + .06, .62); const bx = PJX, by = PJY; PJ(z0 + 7, xm, .86); pxPoly(ax, ay, bx, by, PJX, PJY, F('#24543e')); } }
      { const zc = (z0 + z1) / 2; if(zc > cz + 1){ wq(zc - 1, xm - .13, .82, zc - 1, xm + .13, .82, zc - 1, xm + .13, 1.06, zc - 1, xm - .13, 1.06, F('#e8e6e0')); wq(zc - 1, xm - .06, .86, zc - 1, xm + .06, .86, zc - 1, xm + .06, 1.0, zc - 1, xm - .06, 1.0, F('#ffe2b0'));
          PJ(zc - 1, xm - .16, 1.06); const ax = PJX, ay = PJY; PJ(zc - 1, xm + .16, 1.06); const bx = PJX; PJ(zc - 1, xm, 1.22); pxPoly(ax, ay, bx, ay, PJX, PJY, F('#2e6a4e')); const tx = PJX, ty = PJY; PJ(zc - 1, xm, 1.34); cx.fillStyle = F('#8a8e98'); pxRect(tx - PX / 2, PJY, PX, ty - PJY);
          if(gf < .7){ R(PJX - PX, PJY - PX, PX * 2, PX * 2, '#fff4d8'); if(PJU > PX * 2) glow(PJX, PJY, PJU * .2, '#ffe0a0', .3 * a); } } } }
    // the piles: dark posts with pale caps, standing out of the water round the pontoon
    for(let z = z0 - 1; z <= z1 + 1; z += 9){ if(z < cz + 1) continue; for(const px of [P0 - .05, P1 + .05]){ PJ(z, px, -.08); const ax = PJX, ay = PJY; PJ(z, px, .42); const pw = Math.max(PX, snp(PJU * .03)); R(ax - pw / 2, PJY, pw, ay - PJY, F('#3a2e28')); R(ax - pw / 2, PJY, pw, Math.max(PX, PJU * .015), F('#c8c0b0')); } }
    if(gf < .6){ PJ((za + z1) / 2, X0 - .3, 0); pool(PJX, PJY, PJU * .8, PJU * .1, '#ffd8a0', .3 * a); } }
  function reflPier(o){ if(o.z1 < camSeg() + 1) return; const nb = 4, bl = (o.z1 - 3 - (o.z0 + 3)) / nb;
    for(let k = 0; k < nb; k++){ const zm = o.z0 + 3 + (k + .5) * bl; PJ(zm, 3.23, -.5 - .2); rcol(PJX, PJY, PJU * .7, c32('#c8a060', 225), c32('#6a5030', 190)); PJ(zm, 3.23, -.5 - .5); rdot(PJX, PJY, c32('#a8885a', 200), 2); }
    PJ((o.z0 + o.z1) / 2 - 1, 3.73, -.5 - 1.3); rcol(PJX, PJY, PJU * .9, c32('#d8c8a0', 220), c32('#7a6a50', 190)); }

  const DRAWP = { hlamp:drawHLamp, clamp:drawCLamp, bol:drawBol, bench:drawBench, tree:drawTree, cpl:drawCpl, fount:drawFount,
    city:drawCity, toilet:drawToilet, vend:drawVend, yatai:drawYatai, kcar:drawKcar, kcx:drawKcarExtras, kiosk:drawKiosk, info:drawInfo, bike:drawBike, ring:drawRing, cone:drawCone, anchor:drawAnchor, buoy:drawBuoy, bitt:drawBitt, rail:drawRail };
  function draw(sp, x, y, uw, fog, now, sk){ if(sk && sk.low !== fogLow){ fogLow = sk.low; FCM.clear(); } cam();
    // the first of this road's sprites this frame: lay the reflection rows of the far water band (above the farthest drawn road)
    if(FARF !== DRAWN){ FARF = DRAWN; if(FARY < 1e8 && RB2 && !ENV.minato._nofar) r2Rows(HZ, FARY, 0); }
    if(sp.type === 'obj'){ const o = sp.o, lim = Math.min(o.z1, BI + NEARN); if(sp.k > lim || (sp.k !== o.z1 && sp.k + 4 <= lim)) return; if(o.z1 - camSeg() >= NEARN) return; drawObj(o, now); return; }
    if(sp.type === 'boatm'){ const L = sp.L; if(!L) return; for(const b of BOATS){ const z = boatZ(b, L, now); if(z >= sp.k && z < sp.k + 6){ const ba = boatA(b, L, z); if(ba <= 0) continue; const ga = cx.globalAlpha; cx.globalAlpha = ga * ba; drawBoat(b, z, now, fog); cx.globalAlpha = ga; } } return; }
    const fn = DRAWP[sp.type]; if(fn) fn(sp, x, y, uw, fog, now); }

  // ---------------------------------------------------------------- placement
  const PB_BLOCK = (L, a, b) => { if(!L) return false; for(const id of ['aka1', 'aka2', 'aka3']) if(L.has[id] && b >= L.has[id].z0 - 10 && a <= L.has[id].z1 + 10) return true; if(L.has.landmark && b >= L.has.landmark.z0 - 16 && a <= L.has.landmark.z1 + 12) return true; return false; };
  const LO_BLOCK = (L, a, b) => { if(!L) return false; if(L.ok && b >= L.H - 480 && a <= L.H + 140) return true; for(const id of ['crane1', 'crane2', 'marine']) if(L.has[id] && b >= L.has[id].z0 - 60 && a <= L.has[id].z1 + 6) return true; return PB_BLOCK(L, a, b); };   // (the heart's sightlines stay open: the Landmark and Queen's Square rise over the street, not behind a wall)
  // the quay edge: the promenade narrows to a parapet along the basin in front of the wheel, so the harbour (and the wheel in it) opens up beside the road
  function qxAt(i, L){ if(!L || !L.ok) return QX; const d = i - L.H, w = d < -360 ? 0 : d < -300 ? sm((d + 360) / 60) : d < 30 ? 1 : d < 90 ? 1 - sm((d - 30) / 60) : 0; return QX - 1.02 * w; }
  function place(i, s){ const L = visitOf(i), sp = s.sprites, E = KEY;
    // the boulevard straightens toward the heart, so the Landmark and the wheel stand ahead together (the wide view); bends ease out and back in
    if(L && L.ok && s.land === landK() && s.mmC === undefined){ const d = i - L.H, w = d < -520 ? 0 : d < -400 ? sm((d + 520) / 120) : d < 180 ? 1 : d < 300 ? 1 - sm((d - 180) / 120) : 0; s.mmC = s.curve; s.curve *= 1 - .8 * w; }
    // the promenade (right): outermost first (the quay edge, then the vignettes, the lamps, the people), so nearer things draw over
    const q = qxAt(i, L); if(s.land === landK() || !s.mmQ) s.mmQ = q;
    const pv = promAt(i, L, 0), pm = pv || promAt(i, L, 8), pier = !!(L && L.pier && i >= L.pier.z0 - 30 && i <= L.pier.z1 + 30);
    if(s.land === landK()) s.mmTg = pier ? 1 : 0;
    if(railAt(i) === 'chain' || pier){ if(i % 3 === 0) sp.push({ env:E, type:'bol', x:q - .1, k:i }); }
    else if(i % 2 === 0 && q > 1.9) sp.push({ env:E, type:'rail', x:q - .07, k:i });
    if(i % 21 === 10) sp.push({ env:E, type:'bitt', x:q - .035, k:i, v:pier ? 1 : 0 });
    if(q > 2.2 && !pm && railAt(i) === 'rail' && !pier && i % 56 === 30) sp.push({ env:E, type:'buoy', x:q - .16, k:i });
    if(pv){ const a0 = pv.a, rel = i - a0, run = (type, b0, len, X, v) => { if(i >= b0 && i < b0 + len) sp.push({ env:E, type, k:i, b0, len, side:1, x:X, xo:X, v }); };
      if(pv.kind === 'toilet') run('toilet', a0, 7, PT_X, pv.v);
      else if(pv.kind === 'vend') run('vend', a0, 8, VM_X, pv.v);
      else if(pv.kind === 'market'){ for(let k = 0; k < 3; k++) run('yatai', a0 + k * 8, 5, YT_X, pv.v + k); }
      else if(pv.kind === 'kiosk') run('kiosk', a0, 5, KO_X, pv.v);
      else if(pv.kind === 'info'){ run('info', a0, 3, IB_X, pv.v); if(rel >= 4 && rel < 9) sp.push({ env:E, type:'bike', x:1.68, k:i, v:rel + pv.v }); if(rel === 3) sp.push({ env:E, type:'bench', x:1.62, k:i }); }
      else if(pv.kind === 'kcar'){ run('kcar', a0, 5, KC_X, pv.v); if(rel === 6) sp.push({ env:E, type:'kcx', part:'board', x:1.36, k:i }); if(rel === 7) sp.push({ env:E, type:'kcx', part:'flag', x:1.6, k:i }); if(rel === 2) sp.push({ env:E, type:'kcx', part:'ppl', n:2, x:1.27, k:i }); }
      else if(pv.kind === 'ring' && rel === 1) sp.push({ env:E, type:'ring', x:1.6, k:i });
      else if(pv.kind === 'cones' && rel % 5 === 0) sp.push({ env:E, type:'cone', x:[1.42, 1.74, 1.56][rel / 5], k:i, v:rel / 5 % 2 });
      else if(pv.kind === 'anchor' && rel === 2) sp.push({ env:E, type:'anchor', x:1.6, k:i }); }
    if(i % 14 === 0 && !promAt(i, L, 1)) sp.push({ env:E, type:'hlamp', x:1.32, k:i });   // (a lamp never stands inside a vignette)
    if(i % 36 === 18 && q > 2.2 && !pm) sp.push({ env:E, type:'bench', x:2.06, k:i });
    if(i % 3 === 1 && H1(i * 1.73) < .16 && q > 1.9 && !pm) sp.push({ env:E, type:'cpl', x:1.6 + H1(i * 2.31) * (q - 1.88), k:i, v:H1(i * 3.1) < .5 ? -1 : 1, vr:(H1(i * 4.1) * 4) | 0, ph:H1(i * 5.9) });
    if(L && L.ok && (i === L.H - 118 || i === L.H - 130 || i === L.H - 142)) sp.push({ env:E, type:'fount', x:3.1 + (i % 2) * .9, k:i });
    // the city side (left): fairy-lit street trees, LED lamps, then the blocks
    { const r = pbAt(i, -1, 10, 6, 9, 9); if(r && !LO_BLOCK(L, r.b0, r.b0 + r.len)){ const bp = BACKP[Math.floor(H1(r.n * 4.7 + .2) * BACKP.length)]; projBox(s, -1, Object.assign({ b0:r.b0, len:r.len, x0:5.2, h:2.4 + H1(r.n * 3.3) * 3.2 + (H1(r.n * 1.7) < .2 ? 2.4 : 0), lo:true, depth:1.2, seed:r.n * 2.7 }, bp)); } }
    { const B = cityAt(i, L); if(B && !PB_BLOCK(L, B.b0, B.b0 + B.len)) sp.push({ env:E, type:'city', cb:B, k:i, b0:B.b0, len:B.len, side:-1, x:-B.X, xo:-B.X }); }
    if(i % 12 === 4) sp.push({ env:E, type:'tree', x:-1.62, k:i, v:(H1(i * 5.1) * 3) | 0 });   // (the trees and lamps after the blocks: nearer laterals draw over farther)
    if(i % 14 === 7) sp.push({ env:E, type:'clamp', x:-1.26, k:i });
    // the big objects' markers, and the cruise boats' lane markers
    if(L){ for(const o of objsOf(L)) if(i >= o.z0 && i <= o.z1 && ((i - o.z0) % 4 === 0 || i === o.z1)) sp.push({ env:E, type:'obj', o, x:o.x, k:i });
      if(i % 6 === 0 && i > L.B0 + 100 && i < L.B1 - 60) sp.push({ env:E, type:'boatm', x:6.6, k:i, L }); } }   // (boats keep out of the basin before the wheel: its reflection has the water; boatSpan)
  function lit(i, s){ const d = Math.min(i % 14, 14 - i % 14), d2 = Math.min((i + 7) % 14, 14 - (i + 7) % 14); return Math.max(Math.max(0, 1 - d / 3) * .75, Math.max(0, 1 - d2 / 3) * .45); }

  // ---------------------------------------------------------------- overlay: sea fog lying on the harbour, a little haze over the far shore
  function overlay(al, now, sk){ const hz = HZ, t = reduce ? 0 : now;
    for(const [aa, y0, amp, sp2, thk] of [[.06, -6, 5, .004, 10], [.07, 2, 4, .007, 8], [.05, 10, 3, .011, 6]]){ cx.fillStyle = rgbaA('120,134,180', aa * al);
      for(let x = 0; x < W; x += PX * 4){ const n = Math.sin((x + t * sp2 * 20 + skyPar('near')) * .009) * .6 + Math.sin((x - t * sp2 * 31) * .023 + 2) * .4, top = snp(hz + y0 * PX - (n + 1) * amp * PX * .5), bot = snp(hz + (y0 + thk) * PX + n * PX); if(bot > top) cx.fillRect(x, top, PX * 4, bot - top); } }
    // a few long wisps drifting across the water on the harbour side
    for(let k = 0; k < 3; k++){ const ph = ((t / 1000 * (.012 + k * .004) + k * .37) % 1), xx = W * (.4 + ph * .9) - skyPar('mid') % W, yy = hz + (H - hz) * (.05 + k * .05), ww = W * (.22 + k * .06);
      cx.fillStyle = pat('#7a86b0', .25); cx.globalAlpha = al * (.35 - k * .08) * Math.sin(ph * Math.PI); cx.fillRect(snp(xx - ww / 2), snp(yy), snp(ww), PX * (2 + k)); cx.globalAlpha = 1; } }
  const pat = (col, dens) => ditherPat(col, dens);

  // ---------------------------------------------------------------- warm-up: every canvas and pattern now, none mid-ride
  function* warmSteps(){
    if(!RB){ RB = document.createElement('canvas'); RG = RB.getContext('2d', { willReadFrequently:true }); } if(!RB2){ RB2 = document.createElement('canvas'); RG2 = RB2.getContext('2d', { willReadFrequently:true }); } rbOK(); rb2OK(); yield;
    buildPan(); yield;
    for(let si = 0; si < TREE_H.length; si++){ for(let v = 0; v < 3; v++) treeSpr(si, v); yield; }
    for(let si = 0; si < PPL_H.length; si++){ for(let v = 0; v < 4; v++) for(let f = 0; f < 4; f++) pplSpr(si, v, f); yield; }
    for(const c of ['#7a86b0']) for(const d of [.25]) try{ cx.fillStyle = pat(c, d); cx.fillRect(0, 0, PX, PX); }catch(e){}
    // run the far land and the overlay once over the night (JIT, colour and pattern caches), as Sakurajima does
    if(typeof skyAt === 'function' && W > 0 && segs.length) for(let t = 0; t <= 1.001; t += .25){ const sk = skyAt(t * .97); try{ cx.save(); backdrop({ hz:H / 2 + 2, sk, now:t * 9000, moonX:W / 2, moonY:H * .2, t, far:sk.mid, near:sk.mid, L:LANDS[landK()] }); overlay(1, t * 9000, sk); cx.restore(); }catch(e){ try{ cx.restore(); }catch(e2){} } yield; }
    try{ cx.save(); cx.globalAlpha = .004; for(const key in SPR) if(key.startsWith(P) && SPR[key] instanceof HTMLCanvasElement) cx.drawImage(SPR[key], 0, 0, 1, 1); cx.drawImage(PAN, 0, 0, 1, 1); cx.drawImage(REF, 0, 0, 1, 1); cx.drawImage(RB, 0, 0, 1, 1); cx.drawImage(RB2, 0, 0, 1, 1); cx.restore(); }catch(e){}
    cx.clearRect(0, 0, W, H); }

  // the reflection rows inside roadFX (each segment lays its own rows of the reflection on its water)
  const roadFX0 = roadFX;
  function roadFXR(s, a, b, fog, f, now){ roadFX0(s, a, b, fog, f, now); if(FYF !== DRAWN){ FYF = DRAWN; FARY = 1e9; } if(b.y < FARY) FARY = b.y;
    if(!RB2 || rx1 < rx0) return; const ay = Math.min(a.y, H), by = b.y; if(ay - by < .5) return; const Q1 = s.mmQ || QX, sn = segs[s.index + 1], qa = a.x + a.w * Q1, qb = b.x + b.w * (sn && sn.mmQ || Q1);
    if(ay - by <= PX * 2) r2Rows(by, ay, Math.max(qa, qb));
    else { const st = PX * 6; for(let y = Math.floor(by / PX) * PX; y < ay; y += st){ const t = clamp((ay - y - st) / (ay - by), 0, 1); r2Rows(y, Math.min(ay, y + st), qa + (qb - qa) * t); } } }   // (in bands of six rows, each from the quay's farthest point in it)

  ENV.minato = { _wr:() => { const o = [WOB ? WOB.id + ':' + (WOB.st && WOB.st.z) : 'none', camSeg().toFixed(1)]; for(const [k, R] of WRC) o.push([k, R.n, Array.from(R.zi.slice(0, R.n)).filter((v, j) => j % 12 === 0).map(v => v.toFixed(0)).join(','), Array.from(R.hi.slice(0, R.n)).filter((v, j) => j % 12 === 0).map(v => v.toFixed(1)).join(',')]); return JSON.stringify(o); }, _lay:lay, _visit:visitOf, _objs:objsNow, _r2:() => [rx0, ry0, rx1, ry1, FARY, R2F, DRAWN], _PJ:(z, x, h) => { cam(); PJ(z, x, h); return { x:PJX, y:PJY, u:PJU }; },
    barrier:1.1, kerbs:true, moonDX:-.3,   // (the moon stands off to the left, over the city, so the Landmark and the wheel own the middle of the frame)
    road:['#1c1d26', '#1a1b23'], lampCol:'#7a6a50',
    warm(){ for(const _ of warmSteps()); }, warmSteps,
    place, lit, draw, roadFX:roadFXR, backdrop, overlay,
    // for setpiece/wheel.js: the wheel of a visit, its renderer, and the camera
    wheelOf:L => { if(!L) return null; for(const o of objsOf(L)) if(o.kind === 'wheel') return o; return null; },
    wheel:{ R:WR, draw(st, now, fog){ cam(); if(!rbOK()) return; rbBegin(); wheelGeo(st, now, false, fog || 0); rbFlush(); }, refl(st, now){ cam(); if(!rb2OK()) return; r2Clear(); wheelGeo(st, now, true, 0); } },
    PJ:(z, x, h) => { cam(); PJ(z, x, h); return [PJX, PJY, PJU]; }, P:{ x:0, y:0, u:0, z:0 }, pj(z, x, h){ cam(); PJ(z, x, h); const o = this.P; o.x = PJX; o.y = PJY; o.u = PJU; o.z = PJZ; return o; }, qx:i => { const L = visitOf(i); return qxAt(i, L); }, nearN:() => NEARN, camSeg:() => { cam(); return camSeg(); }, BI:() => { cam(); return BI; }, rb:{ ok:rbOK, begin:rbBegin, line, dot, put, flush:rbFlush, c32 }, fc:(c, f) => fc(c, f), wq:(...a) => { cam(); wq(...a); }
  };
})();
