/* Sundown environment: Kyoto Gion (祇), a night ride through Gion and Higashiyama. See env/README.md for the hooks; study, rules and
   practice log in research/sundown-craft/gion.md. Set piece in this file: 宵山 YOIYAMA, the festival float (MECH.sp_yoiyama).

   References inspected at pixel zoom (Wikimedia Commons; rules taken, nothing copied):
   - Yasaka-jinja's Nishirōmon at night and by day: a two-storey gate at the end of Shijō-dōri, vermilion members against white plaster,
     verdigris lattice windows, dense bracket bands under both eaves, dark tile roofs traced by pale edge tiles, on broad stone steps, with
     lower wings and the black forest behind. -> the gate, dead ahead on the axis of Shijō, the road bending right in front of it.
   - Minami-za (2010, 2020): plaster storeys with red-framed windows, a karahafu gable over the middle, a chidori gable and crest at the
     top, a red railing, a striped banner with a painted board at street level, huge red chōchin at the corners. -> the theatre on Shijō.
   - Hanami-kōji at night (2026), a Gion house at night: two-storey machiya, fine lattices (bengara red on the ochaya) glowing from
     inside, inuyarai bamboo at the foot, a shallow tiled eave between storeys, lit sudare blinds above, noren at the door, square andon
     on red posts and red chōchin with white roundels, granite slabs underfoot, no overhead wires. -> the machiya kit, the lanes.
   - Shirakawa at night (panoramio) and by day; Tatsumi-bashi: a stone-walled canal, teahouses across it whose lights break into long
     dashes in the water, a small flat bridge with a pale railing, willows. -> the canal stretch.
   - Yasaka-no-tō at dusk and at night: five flared roofs with gold-lit undersides and lifted corners, the spire, framed between the
     eaves up Yasaka-dōri. -> the pagoda as the hero silhouette, drawn from the start of the visit.
   Everything is projected geometry on the pixel grid: building faces are slices between segments; the pagoda, bridge and rickshaws are
   world polygons clipped at the near plane; the gate, lanterns and float are camera-facing planes. */
"use strict";
(() => {
  const KEY = 'gion';
  const QA = new URLSearchParams(location.search), GSP = QA.get('gnsp'), GX = (QA.get('gnx') || '').split(',');
  const snp = v => Math.round(v / PX) * PX, sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t), H1 = n => hash(n);
  const fin = v => v === v && v !== Infinity && v !== -Infinity;
  let KI = -1; const landK = () => KI >= 0 ? KI : (KI = LANDS.findIndex(l => l.key === KEY));
  let DIRREG = false; const DIR = () => (window.MECH && MECH.director) || null;

  // ---------------------------------------------------------------- palette (night: shadows to indigo, lights to warm amber)
  const WOOD = ['#120a0e', '#24140f', '#3e2418'], BENG = ['#220a0c', '#4e1812', '#7e2c1c'], PLAS = ['#262636', '#3a3a4c', '#5a5664'];
  const TILE = '#1a1c28', TEDGE = '#8a8e9e', TLIP = '#b4b8c4', GLOW = ['#ffc070', '#e89040', '#7a4a2a'], DARKIN = '#160e10';
  const VERM = ['#5a140a', '#b83a16', '#ec6a26', '#ffa050'], GREEN = ['#0c3626', '#1c684a', '#3a9a6c'], WHITE = ['#9a8a7c', '#d8c4ac', '#f4e4c8'];
  const STONE = ['#24222c', '#3a3842', '#56525c'], LAMPW = '#ffd89a';

  // ---------------------------------------------------------------- fog and colour caches (no strings per call)
  let fogLow = '#1c1a30', LOWIN = ''; const FC = new Map();
  const fc = (c, f) => { const q = Math.round(clamp(f, 0, 1) * 24); let a = FC.get(c); if(a === undefined){ if(FC.size > 900) FC.clear(); a = new Array(25); FC.set(c, a); } return a[q] || (a[q] = mixc(c, fogLow, q / 24 * .86)); };
  const setLow = c => { if(c === LOWIN) return; LOWIN = c; const [r, g, b] = hx(c), q = '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); if(q !== fogLow){ fogLow = q; FC.clear(); } };
  let FF = 0; const F = c => fc(c, FF), L1 = c => fc(c, FF * .6);   // F: a surface; L1: a light, hazed less
  const MX = new Map(); const mix = (a, b, t) => { const k = a + b + t; let v = MX.get(k); if(v === undefined){ if(MX.size > 600) MX.clear(); v = mixc(a, b, t); MX.set(k, v); } return v; };
  const CLX = v => v < -W ? -W : v > 2 * W ? 2 * W : v, CLY = v => v < -H ? -H : v > 2 * H ? 2 * H : v;
  function poly4(x1, y1, x2, y2, x3, y3, x4, y4, col){ if(!fin(x1 + y1 + x2 + y2 + x3 + y3 + x4 + y4)) return;
    if((x1 < -PX && x2 < -PX && x3 < -PX && x4 < -PX) || (x1 > W + PX && x2 > W + PX && x3 > W + PX && x4 > W + PX) || (y1 < -PX && y2 < -PX && y3 < -PX && y4 < -PX) || (y1 > H + PX && y2 > H + PX && y3 > H + PX && y4 > H + PX)) return;
    window.poly(CLX(x1), CLY(y1), CLX(x2), CLY(y2), CLX(x3), CLY(y3), CLX(x4), CLY(y4), col); }
  function R(x, y, w, h, col){ if(!fin(x + y + w + h)) return; if(w < 0){ x += w; w = -w; } if(h < 0){ y += h; h = -h; } if(x > W + PX || y > H + PX || x + w < -PX || y + h < -PX) return; const x0 = Math.max(-PX, x), y0 = Math.max(-PX, y), x1 = Math.min(W + PX, x + w), y1 = Math.min(H + PX, y + h); if(x1 <= x0 || y1 <= y0) return; cx.fillStyle = col; pxRect(x0, y0, x1 - x0, y1 - y0); }   // (clipped to the screen: both edges, never shifted)

  // ---------------------------------------------------------------- the world camera (as env/akiba.js) for objects across segments
  const NX = 1500, XA = new Float64Array(NX + 1), YA = new Float64Array(NX + 1); let CFR = -1, BI = 0, CAMX = 0, CAMY = 0, CAMZ = 0, PJX = 0, PJY = 0, PJU = 0;
  function cam(){ if(CFR === DRAWN) return; CFR = DRAWN; const base = segAt(position); BI = base.index; const bp = (position % SEG) / SEG, ps = segAt(position + PZ), pp = ((position + PZ) % SEG) / SEG;
    CAMY = lerp(ps.p1.world.y, ps.p2.world.y, pp) + CAMH; CAMX = playerX * ROADW; CAMZ = position;
    let x = 0, dx = -(base.curve * bp), y = base.p1.world.y;
    for(let n = 0; n < NX; n++){ const s = segs[BI + n]; XA[n] = x; YA[n] = s ? s.p1.world.y : y; if(s){ y = s.p2.world.y; x += dx; dx += s.curve; } else x += dx; }
    XA[NX] = x; YA[NX] = y; }
  const ZNEAR = .4, camSeg = () => CAMZ / SEG;
  /* World-fixed landmarks on a bend (round 3). PJ's X is lateral to the road at that depth, and the gate and the pagoda stand where the road
     bends: a landmark's deeper parts were laid off a road that had already turned, so the forest slid to the right of the gate and the
     pagoda's far side bent with the street. While one is drawn, DRF(z) adds back the road's drift between its centre and z (from crvAt, the
     curve this file lays there), so every corner is fixed in the world. A table per landmark, rebuilt only when the visit changes. */
  let DRF = null, HL = null; const DRS = { g:{ k:'', z0:0, t:new Float64Array(81) }, p:{ k:'', z0:0, t:new Float64Array(81) } }; let DRC = DRS.g;
  const drfAt = z => { let t = z - DRC.z0; if(t < 0) t = 0; if(t > 80) t = 80; const i = Math.min(79, t | 0), f = t - i, T = DRC.t; return T[i] + (T[i + 1] - T[i]) * f; };
  function drfOn(L, kind, zRef){ const D = DRS[kind], a = kind === 'g' ? L.GT - 40 : L.PG - 34, key = L.B0 + ':' + L.B1; if(D.k !== key){ D.k = key; D.z0 = Math.floor(zRef) - 40; const r = axisOff(L, a, zRef); for(let q = 0; q <= 80; q++) D.t[q] = (r - axisOff(L, a, D.z0 + q)) / ROADW; }
    DRC = D; DRF = drfAt; }
  function PJ(zs, X, h){ if(DRF) X += DRF(zs); let n = zs - BI; const cz = Math.max(ZNEAR * SEG, zs * SEG - CAMZ); if(n < 0) n = 0; if(n > NX - 1) n = NX - 1;
    const i = n | 0, f = n - i, xo = XA[i] + (XA[i + 1] - XA[i]) * f, wy = YA[i] + (YA[i + 1] - YA[i]) * f, sc = DEPTH / cz;
    PJU = sc * ROADW * W / 2; PJX = W / 2 + sc * (xo - CAMX + X * ROADW) * W / 2; PJY = H / 2 - PITCH - sc * (wy - CAMY) * H / 2 - h * PJU; }   // heights in the sprites' unit (uw per half-road width)
  /* A world polygon (up to 12 corners in WZ/WX/WH): clipped against the near plane in the world (corners nearer than ZNEAR are cut off along
     the edges, never clamped), projected, clipped to [-W, 2W] x [-H, 2H] on screen (Sutherland-Hodgman), refused if any value is not
     finite, and filled as a fan of quads on the pixel grid. */
  const WZ = new Float64Array(12), WX = new Float64Array(12), WH = new Float64Array(12), CZ = new Float64Array(24), CXa = new Float64Array(24), CHa = new Float64Array(24);
  const SX = new Float64Array(40), SY = new Float64Array(40), TX = new Float64Array(40), TY = new Float64Array(40);
  function wq(z1, x1, h1, z2, x2, h2, z3, x3, h3, z4, x4, h4, col){ WZ[0] = z1; WX[0] = x1; WH[0] = h1; WZ[1] = z2; WX[1] = x2; WH[1] = h2; WZ[2] = z3; WX[2] = x3; WH[2] = h3; WZ[3] = z4; WX[3] = x4; WH[3] = h4; wpoly(4, col); }
  function wpoly(n, col){ const zm = camSeg() + ZNEAR; let m = 0;
    for(let i = 0; i < n; i++){ const j = (i + 1) % n, ai = WZ[i] >= zm, aj = WZ[j] >= zm; if(ai){ CZ[m] = WZ[i]; CXa[m] = WX[i]; CHa[m] = WH[i]; m++; }
      if(ai !== aj){ const t = (zm - WZ[i]) / (WZ[j] - WZ[i]); CZ[m] = zm; CXa[m] = WX[i] + (WX[j] - WX[i]) * t; CHa[m] = WH[i] + (WH[j] - WH[i]) * t; m++; } }
    if(m < 3) return; let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    for(let i = 0; i < m; i++){ PJ(CZ[i], CXa[i], CHa[i]); if(!fin(PJX) || !fin(PJY)) return; SX[i] = PJX; SY[i] = PJY; if(PJX < mnx) mnx = PJX; if(PJX > mxx) mxx = PJX; if(PJY < mny) mny = PJY; if(PJY > mxy) mxy = PJY; }
    if(mxx < -PX || mnx > W + PX || mxy < -PX || mny > H + PX) return;
    if(mnx < -W || mxx > 2 * W || mny < -H || mxy > 2 * H){ m = clipBox(m); if(m < 3) return; }
    fan(m, col); }
  function clipEdge(m, ax, v, keepGE){ let k = 0; for(let i = 0; i < m; i++){ const j = (i + 1) % m, pi = ax ? SY[i] : SX[i], pj = ax ? SY[j] : SX[j], ii = keepGE ? pi >= v : pi <= v, jj = keepGE ? pj >= v : pj <= v;
      if(ii && k < 39){ TX[k] = SX[i]; TY[k] = SY[i]; k++; } if(ii !== jj && k < 39){ const t = (v - pi) / (pj - pi); TX[k] = SX[i] + (SX[j] - SX[i]) * t; TY[k] = SY[i] + (SY[j] - SY[i]) * t; k++; } }
    for(let i = 0; i < k; i++){ SX[i] = TX[i]; SY[i] = TY[i]; } return k; }
  function clipBox(m){ m = clipEdge(m, 0, -W, true); if(m < 3) return 0; m = clipEdge(m, 0, 2 * W, false); if(m < 3) return 0; m = clipEdge(m, 1, -H, true); if(m < 3) return 0; return clipEdge(m, 1, 2 * H, false); }
  function fan(m, col){ for(let i = 1; i + 1 < m; i += 2){ const k = i + 2 < m ? i + 2 : i + 1; window.poly(SX[0], SY[0], SX[i], SY[i], SX[i + 1], SY[i + 1], SX[k], SY[k], col); } }
  // a camera-facing plane at world z, lateral X0: its screen origin and scale (x = OX + X * OU, y = OY - h * OU); false if behind the near plane
  let OX = 0, OY = 0, OU = 0;
  function plane(z, X0){ if(z < camSeg() + ZNEAR) return false; PJ(z, X0 || 0, 0); OX = PJX; OY = PJY; OU = PJU; return fin(OX + OY + OU) && OU > 0; }
  function PR(X0, X1, h0, h1, col){ const xa = OX + X0 * OU, xb = OX + X1 * OU; R(Math.min(xa, xb), OY - h1 * OU, Math.abs(xb - xa), (h1 - h0) * OU, col); }
  function PP(Xa, ha, Xb, hb, Xc, hc, Xd, hd, col){ poly4(OX + Xa * OU, OY - ha * OU, OX + Xb * OU, OY - hb * OU, OX + Xc * OU, OY - hc * OU, OX + Xd * OU, OY - hd * OU, col); }
  // a segment-float position on the road's own projection (as env/akiba.js CF)
  let CFX = 0, CFY = 0, CFU = 0;
  function CF(z){ const i = Math.floor(z), sg = segs[i]; if(!sg) return false; const a = sg.p1.screen, b = sg.p2.screen; if(!a.w || !b.w) return false; const f = z - i; CFX = a.x + (b.x - a.x) * f; CFY = a.y + (b.y - a.y) * f; CFU = a.w + (b.w - a.w) * f; return fin(CFX + CFY + CFU); }
  function CR(X0, X1, h0, h1, col){ const xa = CFX + X0 * CFU, xb = CFX + X1 * CFU; R(Math.min(xa, xb), CFY - h1 * CFU, Math.abs(xb - xa), (h1 - h0) * CFU, col); }
  // a stepped run on the pixel grid, clipped to the screen first (Liang-Barsky)
  function pline(x1, y1, x2, y2, col, th){ if(!fin(x1 + y1 + x2 + y2)) return;
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1, p = [-dx, dx, -dy, dy], q = [x1 + PX, W + PX - x1, y1 + PX, H + PX - y1];
    for(let i = 0; i < 4; i++){ if(p[i] === 0){ if(q[i] < 0) return; continue; } const r = q[i] / p[i]; if(p[i] < 0){ if(r > t1) return; if(r > t0) t0 = r; } else { if(r < t0) return; if(r < t1) t1 = r; } }
    const ax = x1 + dx * t0, ay = y1 + dy * t0, bx = x1 + dx * t1, by = y1 + dy * t1; cx.fillStyle = col; const T = (th || 1) * PX;
    if(Math.abs(bx - ax) >= Math.abs(by - ay)){ const n = Math.max(1, Math.round(Math.abs(bx - ax) / PX)), sx = (bx - ax) / n, sy = (by - ay) / n; let rx = snp(ax), ry = snp(ay);
      for(let k = 0; k <= n; k++){ const yy = snp(ay + sy * k), xx = snp(ax + sx * k); if(yy !== ry || k === n){ const a = Math.min(rx, xx), b = Math.max(rx, xx); cx.fillRect(a, ry, Math.max(PX, b - a + (k === n ? PX : 0)), T); rx = xx; ry = yy; } } }
    else { const n = Math.max(1, Math.round(Math.abs(by - ay) / PX)), sx = (bx - ax) / n, sy = (by - ay) / n; let rx = snp(ax), ry = snp(ay);
      for(let k = 0; k <= n; k++){ const xx = snp(ax + sx * k), yy = snp(ay + sy * k); if(xx !== rx || k === n){ const a = Math.min(ry, yy), b = Math.max(ry, yy); cx.fillRect(rx, a, T, Math.max(PX, b - a + (k === n ? PX : 0))); rx = xx; ry = yy; } } } }
  // a stepped disc (a lantern's body, a lamp): rows on the grid, clipped
  function disc(x, y, rx, ry, col){ if(!fin(x + y + rx + ry) || rx < PX * .5) return; if(x + rx < -PX || x - rx > W + PX || y + ry < -PX || y - ry > H + PX) return; cx.fillStyle = col; const n = Math.max(1, Math.round(ry * 2 / PX));
    if(n === 1){ pxRect(x - rx, y - ry, rx * 2, ry * 2); return; } for(let k = 0; k < n; k++){ const v = (k + .5) / n * 2 - 1, w = rx * Math.sqrt(Math.max(0, 1 - v * v)); const yy = y - ry + k * ry * 2 / n; if(yy < -PX || yy > H + PX) continue; pxRect(x - w, yy, w * 2, Math.max(PX, ry * 2 / n)); } }

  // ---------------------------------------------------------------- text (DotGothic16 thresholded into one small atlas, drawn 1:1)
  const WORDS = ['御茶屋', '祇園', '京料理', '芝居', '歌舞伎', '顔見世', '宵山', '甘味', '宿', '茶', '酒', '舞'];
  const SZ = [8, 12, 16, 24, 32], GA = {}; let ATL = null, AG = null, SC = null, SG = null, FONT = false;
  const fontOK = () => !document.fonts || !document.fonts.check || document.fonts.check('16px DotGothic16');
  function buildText(){ if(!ATL) return; FONT = fontOK(); const chars = new Set(); for(const w of WORDS) for(const c of w) chars.add(c);
    const E = []; for(const ch of chars){ GA[ch] = []; for(let si = 0; si < SZ.length; si++){ const z = SZ[si], n = z + 4; SG.clearRect(0, 0, 40, 40); SG.font = z + 'px DotGothic16'; SG.textBaseline = 'top'; SG.fillStyle = '#fff'; SG.fillText(ch, 2, 2);
        const d = SG.getImageData(0, 0, n, n).data; let x0 = n, y0 = n, x1 = -1, y1 = -1; const m = new Uint8Array(n * n); for(let p = 0; p < n * n; p++) if(d[p * 4 + 3] > 110){ m[p] = 1; const x = p % n, y = (p / n) | 0; if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
        if(x1 < 0){ GA[ch][si] = null; continue; } const g = { ax:0, ay:0, w:x1 - x0 + 1, h:y1 - y0 + 1, m, n, x0, y0 }; GA[ch][si] = g; E.push(g); } }
    E.sort((a, b) => b.h - a.h); let x = 0, y = 0, rh = 0; for(const g of E){ if(x + g.w > ATL.width){ x = 0; y += rh + 1; rh = 0; } g.ax = x; g.ay = y; x += g.w + 1; if(g.h > rh) rh = g.h; }
    if(ATL.height !== y + rh + 1) ATL.height = y + rh + 1; AG.clearRect(0, 0, ATL.width, ATL.height); AG.fillStyle = '#ffffff';
    for(const g of E){ for(let yy = 0; yy < g.h; yy++) for(let xx = 0; xx < g.w; xx++) if(g.m[(yy + g.y0) * g.n + xx + g.x0]) AG.fillRect(g.ax + xx, g.ay + yy, 1, 1); delete g.m; } }
  // ink a glyph: the atlas cell is white; tinted by drawing it through the fill of 'source-atop' on a scratch is costly, so the ink is
  // drawn as the white glyph over a dark under-print offset by nothing: lanterns and boards are pale, their ink is a dark glyph made by
  // 'difference'-free means: we draw the glyph's cell as the ink colour using the atlas as a mask in a tint canvas built in warm (INK).
  let INK = null;
  function gpick(ch, px){ const T = GA[ch]; if(!T) return null; for(let si = SZ.length - 1; si >= 0; si--){ const g = T[si]; if(g && Math.max(g.w, g.h) * PX <= px) return g; } return null; }
  function glyph(ch, x, y, px){ const g = gpick(ch, px); if(!g || !INK) return false; const w = g.w * PX, h = g.h * PX; if(x + w < 0 || x - w > W || y + h < 0 || y - h > H) return true; cx.drawImage(INK, g.ax, g.ay, g.w, g.h, snp(x - w / 2), snp(y - h / 2), w, h); return true; }

  // ART-BEGIN
  /* ---------------------------------------------------------------- round 3: the street floor as pixel art (Kellan: "akihabara is the gold
     standard now for the level of detail"). The bar is Akihabara's retail floor (env/akiba.js shopLayers/interior) and Snow Onsen's inn fronts.
     References at pixel zoom (research/sundown-craft/gion.md section 8): Hanami-kōji at night (lattices glowing, red chōchin with the linked
     white roundels), a Kyoto machiya by day (senbon-gōshi in panels with a kiriko top, a heavy lintel, the koshi-ita board under the lattice,
     ochre plaster), Ninenzaka at night (open shop fronts flooding amber, hanging boards, square lanterns on brackets), Pontochō after rain,
     noren (a slit cloth with a crest, taken in when the house closes), a sugidama, a battari-shōgi.
     Every street-floor front is four layers, 160 x 36 (the 128-texel front plus 16 spare each side for the slide), as Akihabara's:
       0 the room's far side: the ceiling boards, the back wall (shōji, fusuma, the tokonoma, shelves), the floor (tatami, stone);
       1 the middle of the room: the people, an andon, the low table, the keeper;
       2 just inside the front: the display case, the counter, the customers' backs;
       3 the front itself: the lattice (each slat 2 texels, a 1-texel gap: the room shows through), the posts, the lintel, the noren, the
         koshi-ita and the plinth. It does not slide.
     The room is drawn in true perspective for a rider's eye (about row 20 of 36): the ceiling recedes down to row ~9, the floor up to ~27.
     Riding past, the room slides behind the lattice (interior(), the layered parallax of env/akiba.js). Unlit houses: the room is dark and
     cool, the noren taken in and the door shut. All crests are generic geometry; there is no lettering and no real house's mark. */
  const aI = (w, h) => ({ w, h, c:new Array(w * h).fill(null) });
  const aP = (I, x, y, col) => { x = Math.round(x); y = Math.round(y); if(x >= 0 && y >= 0 && x < I.w && y < I.h) I.c[y * I.w + x] = col; };
  const aG = (I, x, y) => x >= 0 && y >= 0 && x < I.w && y < I.h ? I.c[y * I.w + x] : null;
  function aF(I, x, y, w, h, col){ for(let yy = y; yy < y + h; yy++) for(let xx = x; xx < x + w; xx++) aP(I, xx, yy, col); }
  const aHx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const aHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const aMix = (a, b, t) => { const p = aHx(a), q = aHx(b); return aHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t); };
  const aDk = (c, t) => aMix(c, '#0a0812', t), aLt = (c, t) => aMix(c, '#fff4dc', t);
  // an ellipse filled (centre, radii), for bowls, jars, lamps
  function aE(I, cx0, cy0, rx, ry, col){ for(let y = Math.ceil(cy0 - ry); y <= cy0 + ry; y++) for(let x = Math.ceil(cx0 - rx); x <= cx0 + rx; x++){ const u = (x - cx0) / (rx + .01), v = (y - cy0) / (ry + .01); if(u * u + v * v <= 1.0) aP(I, x, y, col); } }
  // a person seen from the front (5 wide): hair, face, robe; kneel shortens; back: seen from behind (no face)
  function aPer(I, x, y, robe, o){ o = o || {}; const hair = o.hair || '#120c10', skin = o.skin || '#e8c0a0', h = o.kneel ? 7 : 11;
    aF(I, x + 1, y, 3, 2, hair); aP(I, x, y + 1, aDk(hair, .2)); if(o.bun) aF(I, x + 1, y - 1, 3, 1, hair); if(o.pin) aP(I, x + 4, y - 1, o.pin);
    if(o.back){ aF(I, x + 1, y + 2, 3, 2, hair); } else { aF(I, x + 1, y + 2, 3, 2, skin); aP(I, x + 3, y + 3, aDk(skin, .25)); }
    aF(I, x, y + 4, 5, h, robe); aF(I, x, y + 4, 1, h, aLt(robe, .18)); aF(I, x + 4, y + 4, 1, h, aDk(robe, .3)); if(o.obi) aF(I, x, y + 7, 5, 2, o.obi);
    if(o.apron) aF(I, x + 1, y + 6, 3, h - 2, o.apron); if(o.band) aF(I, x, y + 1, 5, 1, o.band); }
  // the room box: ceiling boards (receding), the back wall's band, the floor; light: the room's own glow (warm), brightest at the back wall
  function room(L, ceil, floor, fl2){ aF(L, 0, 0, 160, 10, ceil); for(let x = 0; x < 160; x += 7) aF(L, x, 0, 1, 9, aDk(ceil, .3)); aF(L, 0, 9, 160, 1, aDk(ceil, .45));
    aF(L, 0, 27, 160, 9, floor); if(fl2) for(let y = 28; y < 36; y += 3) aF(L, 0, y, 160, 1, fl2); }
  // shōji: a lit paper panel, kumiko every 4 x 4 texels, a dark frame
  function shoji(L, x, y, w, h, lit){ const p = lit ? '#ffe8b4' : '#4a4038', k = lit ? '#d0a060' : '#2e2622'; aF(L, x, y, w, h, p);
    for(let xx = x + 3; xx < x + w - 1; xx += 4) aF(L, xx, y + 1, 1, h - 2, k); for(let yy = y + 3; yy < y + h - 1; yy += 4) aF(L, x + 1, yy, w - 2, 1, k);
    aF(L, x, y, w, 1, '#3a2014'); aF(L, x, y + h - 1, w, 1, '#3a2014'); aF(L, x, y, 1, h, '#3a2014'); aF(L, x + w - 1, y, 1, h, '#3a2014'); }
  // the tatami floor: mats with dark borders (heri) in a running layout, the light pooled toward the middle
  function tatami(L, lit){ const a = lit ? '#c8b064' : '#3a3628', b = lit ? '#b49a50' : '#322e22', e = lit ? '#2a1e12' : '#141210';
    for(let y = 27; y < 36; y++) for(let x = 0; x < 160; x++) aP(L, x, y, ((x >> 2) + y) & 1 ? a : b);
    aF(L, 0, 27, 160, 1, e); aF(L, 0, 31, 160, 1, e); for(let x = 8; x < 160; x += 36){ aF(L, x, 27, 1, 4, e); aF(L, x + 18, 31, 1, 5, e); } }

  // ---- the interiors (layers 0..2); each returns [L0, L1, L2]; lit false: the same room after hours (dimmed and cooled at the end)
  const ROOMS = ['zashiki', 'genkan', 'wagashi', 'sensu', 'toki', 'cha', 'kappo'];
  function roomLayers(kind, sd){ const L0 = aI(160, 36), L1 = aI(160, 36), L2 = aI(160, 36), r = q => H1(sd * 7.31 + q * 1.97);
    if(kind === 'zashiki'){ // an ochaya's front room: shōji and fusuma at the back, the tokonoma with its scroll, tatami; a geiko kneeling, a guest, an andon
      room(L0, '#3a2216', '#c8b064'); tatami(L0, true);
      for(let x = 0; x < 160; x += 40){ shoji(L0, x, 10, 18, 17, true); aF(L0, x + 18, 10, 22, 17, '#b48a50'); for(let q = 0; q < 4; q++) aF(L0, x + 20 + q * 5, 14 + (q & 1) * 5, 4, 1, '#9a7240'); aF(L0, x + 18, 10, 1, 17, '#3a2014'); aF(L0, x + 29, 10, 1, 17, '#5a3a22'); }   // fusuma: a gold-brown field, clouds as bars
      aF(L0, 62, 10, 20, 17, '#6a4428'); aF(L0, 62, 10, 20, 1, '#2a160e'); aF(L0, 70, 11, 4, 12, '#ece0c4'); aF(L0, 71, 13, 1, 6, '#2a1a14'); aF(L0, 72, 16, 1, 4, '#2a1a14'); aP(L0, 72, 23, '#3a2a1a'); aF(L0, 64, 23, 3, 3, '#4a5a7a'); aP(L0, 65, 21, '#c84a3a'); aP(L0, 66, 20, '#4a6a3a'); aF(L0, 62, 26, 20, 1, '#2a160e');   // the tokonoma: the scroll, a vase with a camellia
      aF(L1, 34, 26, 26, 3, '#2a1210'); aF(L1, 34, 26, 26, 1, '#7a3a28'); aF(L1, 36, 29, 2, 2, '#1a0c0a'); aF(L1, 56, 29, 2, 2, '#1a0c0a');   // the low lacquer table
      aP(L1, 42, 25, '#f0ece0'); aP(L1, 43, 25, '#f0ece0'); aP(L1, 50, 25, '#e8d8b0');   // sake cups
      aF(L1, 108, 18, 6, 8, '#fff2cc'); aF(L1, 108, 18, 6, 1, '#3a2014'); aF(L1, 108, 25, 6, 1, '#3a2014'); aF(L1, 110, 18, 1, 8, '#e8c888'); aF(L1, 108, 26, 1, 4, '#2a160e'); aF(L1, 113, 26, 1, 4, '#2a160e');   // the andon
      aPer(L1, 24, 15, '#5a1a3a', { kneel:true, bun:true, pin:'#e8c040', skin:'#f4ece4', obi:'#d8a838' });   // a geiko kneeling: the white face, the hair up with a pin
      aPer(L1, 64, 17, '#2a2a3a', { kneel:true, back:true }); aPer(L1, 126, 16, '#3a4a6a', { kneel:true, bun:true, pin:'#c83a2a', skin:'#f0e4dc', obi:'#e8d8c0' });
      aF(L2, 92, 30, 10, 2, '#1a0c0a'); aF(L2, 92, 29, 10, 1, '#8a2a1a'); aP(L2, 95, 28, '#e8e0d0'); aP(L2, 98, 28, '#e8e0d0'); }   // a tray by the window
    else if(kind === 'genkan'){ // a house's tōri-niwa: the earthen passage running back to a lit doorway, the step-chest, a lamp; dim
      room(L0, '#24160e', '#3a2c22', '#30241c'); aF(L0, 0, 10, 160, 17, '#4a3020');
      for(let x = 0; x < 160; x += 54){ aF(L0, x + 20, 13, 12, 14, '#2a1a10'); aF(L0, x + 22, 14, 8, 12, '#ffd890'); aF(L0, x + 22, 14, 8, 4, '#2a3a5a'); aF(L0, x + 24, 14, 1, 4, '#1a2440'); aF(L0, x + 27, 14, 1, 4, '#1a2440'); aF(L0, x + 22, 26, 8, 1, '#c8a060'); }   // the far doorway, an indigo noren over it
      for(let x = 0; x < 160; x += 54) shoji(L0, x + 38, 12, 12, 14, true);
      for(let s = 0; s < 4; s++) aF(L1, 70 + s * 4, 14 + s * 3, 16 - s * 4, 3, s & 1 ? '#2e1a10' : '#3a2214');   // the kaidan-dansu (step chest), its pulls
      for(let s = 0; s < 4; s++) aP(L1, 72 + s * 4, 15 + s * 3, '#a88a50');
      aF(L1, 30, 0, 1, 5, '#1a1010'); aE(L1, 30, 7, 3, 2.4, '#ffe8b0'); aF(L1, 28, 7, 5, 1, '#e0b070');   // a hanging paper lamp
      aF(L2, 0, 31, 160, 5, '#5a5248'); aF(L2, 0, 31, 160, 1, '#8a8070'); aF(L2, 118, 29, 3, 2, '#2a1a10'); aF(L2, 122, 29, 3, 2, '#2a1a10'); aP(L2, 119, 29, '#c83a2a'); aP(L2, 123, 29, '#c83a2a');   // the stone step, a pair of geta
      aF(L2, 136, 20, 5, 11, '#3a3a44'); aF(L2, 137, 15, 1, 5, '#c84a3a'); aF(L2, 139, 14, 1, 6, '#2a3a6a'); }   // an umbrella stand
    else if(kind === 'wagashi'){ // a sweets shop: shelves of wrapped boxes, the keeper, the glass case of sweets on lacquer trays
      room(L0, '#7a5232', '#6a625a', '#5a524a'); aF(L0, 0, 10, 160, 17, '#c8a070');
      const BX = ['#f0c8cc', '#d8e4c4', '#f4ecd4', '#c8a878', '#e8d0e8', '#ffe0a0'];
      for(const y of [15, 21, 26]){ aF(L0, 0, y, 160, 1, '#4a2e1c'); for(let x = 1, q = 0; x < 158; q++){ const w = 5 + Math.floor(r(q + y) * 4), h = 3 + Math.floor(r(q * 3 + y) * 2), c = BX[Math.floor(r(q * 5 + y) * BX.length)]; aF(L0, x, y - h, w, h, c); aF(L0, x, y - h, w, 1, aLt(c, .4)); aF(L0, x + w - 1, y - h, 1, h, aDk(c, .25)); aP(L0, x + (w >> 1), y - h, '#c82a2a'); aF(L0, x + (w >> 1), y - h + 1, 1, h - 1, '#e85a4a'); x += w + 1 + (r(q * 7 + y) < .2 ? 3 : 0); } }
      for(let x = 6; x < 160; x += 31){ aF(L0, x, 10, 4, 3, '#f4ecd8'); aP(L0, x + 1, 11, '#3a2a20'); aP(L0, x + 2, 11, '#3a2a20'); }   // small menu cards along the top
      aPer(L1, 52, 12, '#f0ece4', { band:'#2a3a6a', apron:'#e8e4dc', skin:'#e8c0a0' }); aF(L1, 52, 16, 5, 1, '#2a3a6a'); aPer(L1, 112, 13, '#4a3a5a', { bun:true, back:true });   // the keeper (apron, headscarf), a customer
      aF(L2, 14, 19, 132, 13, '#3a2416'); aF(L2, 15, 20, 130, 9, '#2a1810'); for(let x = 14; x < 146; x++) if(H1(x * .61) < .35 || (x % 29) < 5) aP(L2, x, 19, '#e8f4f0'); aF(L2, 14, 31, 132, 5, '#5a3a22'); aF(L2, 14, 31, 132, 1, '#8a6040');   // the case: wood, the glass top glinting
      const SW = ['#f4a8b8', '#8ac070', '#f4f0e8', '#8a4a20', '#f0c850', '#8a5a9a', '#e86a5a'];
      for(let t = 0; t < 2; t++){ const ty = 23 + t * 4; aF(L2, 16, ty + 2, 128, 1, '#1a0a0a'); for(let x = 17; x < 143; x += 3){ const c = SW[Math.floor(r(x * .37 + t) * SW.length)]; aF(L2, x, ty, 2, 2, c); aP(L2, x, ty, aLt(c, .45)); } }
      for(let x = 30; x < 140; x += 34) aP(L2, x, 20, '#ffffff'); for(let x = 22; x < 140; x += 26){ aF(L2, x, 29, 3, 1, '#f4ecd8'); } }
    else if(kind === 'sensu'){ // a fan shop: open fans hung on a cream wall, a rack, the counter with folded fans in trays
      room(L0, '#6a4428', '#6a5a4a', '#5e5040'); aF(L0, 0, 10, 160, 17, '#e4d0a8');
      const FN = [['#c82a2a', '#e8b040'], ['#2a3a7a', '#f0ece0'], ['#f0e4c8', '#2a2a2a'], ['#3a6a4a', '#e8d8a0'], ['#d86a8a', '#f4e8f0'], ['#e8b040', '#c82a2a']];
      for(let q = 0; q < 10; q++){ const cx0 = 8 + q * 16, cy0 = q & 1 ? 25 : 18, F = FN[(q + Math.floor(sd * 5)) % FN.length], R0 = q & 1 ? 6 : 7;
        for(let y = cy0 - R0; y <= cy0; y++) for(let x = cx0 - R0; x <= cx0 + R0; x++){ const dx = x - cx0, dy = cy0 - y, d = Math.sqrt(dx * dx + dy * dy); if(d > R0 + .3 || d < 2.2) continue; const ang = Math.atan2(dy, dx), rib = Math.floor(ang / Math.PI * 9) & 1;
          let c = rib ? F[0] : aDk(F[0], .14); if(d > R0 - 1.2) c = aDk(F[0], .35); else if(q % 3 === 0 && Math.abs(d - (R0 - 2.5)) < .7) c = F[1]; else if(q % 3 === 1 && Math.abs(dx) < 1.5 && dy > 2 && dy < 5) c = F[1]; else if(q % 3 === 2 && ((x + y) & 3) === 0) c = F[1]; aP(L0, x, y, c); }
        aF(L0, cx0, cy0 - 1, 1, 2, '#3a2014'); }
      for(let x = 40; x < 160; x += 60){ aF(L1, x, 14, 1, 16, '#3a2014'); aF(L1, x + 10, 14, 1, 16, '#3a2014'); for(let y = 16; y < 29; y += 4) aF(L1, x, y, 11, 1, '#5a3420'); for(let y = 15; y < 28; y += 4) for(let q = 0; q < 3; q++) aF(L1, x + 2 + q * 3, y, 2, 1, FN[(q + y) % 6][0]); }
      aPer(L1, 22, 13, '#3a4a5a', { skin:'#e8c0a0' }); aPer(L1, 120, 14, '#7a3a4a', { bun:true, back:true });
      aF(L2, 6, 24, 148, 8, '#6a4428'); aF(L2, 6, 24, 148, 1, '#b08050'); aF(L2, 6, 31, 148, 5, '#3a2416');
      for(let x = 8; x < 152; x += 2) if(r(x * .7) < .8) aF(L2, x, 21, 1, 3, FN[Math.floor(r(x * 1.3) * 6)][0]); }
    else if(kind === 'toki'){ // a pottery shop: shelves of bowls, cups, vases and plates in their glazes; a table; a big jar by the door
      room(L0, '#4a3020', '#5a5048', '#4e463e'); aF(L0, 0, 10, 160, 17, '#9a7a52');
      const GZ = ['#8ab8a0', '#ece6d8', '#3a4a8a', '#c08040', '#2a2422', '#5a8a5a', '#c8b8a0'];
      for(const y of [15, 20, 26]){ aF(L0, 0, y, 160, 1, '#3a2414'); aF(L0, 0, y + 1, 160, 1, '#6a4a2e'); for(let x = 1, q = 0; x < 156; q++){ const k = r(q * 2.3 + y), c = GZ[Math.floor(r(q * 4.1 + y) * GZ.length)];
          if(k < .4){ aF(L0, x, y - 2, 5, 1, c); aF(L0, x + 1, y - 1, 3, 1, aDk(c, .2)); aP(L0, x, y - 2, aLt(c, .4)); x += 6; }   // a bowl
          else if(k < .7){ aF(L0, x, y - 3, 2, 3, c); aP(L0, x, y - 3, aLt(c, .4)); x += 3; }   // a cup
          else if(k < .88 && y > 15){ aF(L0, x, y - 4, 3, 4, c); aP(L0, x + 1, y - 5, c); aF(L0, x, y - 4, 1, 4, aLt(c, .3)); x += 4; }   // a vase
          else { aE(L0, x + 2, y - 3, 2, 2.4, c); aP(L0, x + 2, y - 3, aDk(c, .3)); x += 5; } } }   // a plate on its stand
      aF(L1, 24, 25, 60, 2, '#4a2e1c'); aF(L1, 26, 27, 2, 4, '#2a1a10'); aF(L1, 80, 27, 2, 4, '#2a1a10'); for(let x = 27; x < 82; x += 6){ const c = GZ[Math.floor(r(x) * GZ.length)]; aF(L1, x, 23, 4, 2, c); aP(L1, x, 23, aLt(c, .4)); }
      aPer(L1, 104, 13, '#2a2a30', { skin:'#d8b090' });
      aE(L2, 130, 27, 6, 6, '#6a3a1e'); aF(L2, 127, 20, 7, 2, '#5a3018'); aE(L2, 128, 25, 2, 3, '#8a5a30'); aP(L2, 127, 24, '#c89060'); for(let x = 125; x < 136; x += 2) aF(L2, x, 29, 1, 3, '#3a1e10');   // the big jar, its glaze drip and highlight
      aF(L2, 30, 30, 6, 4, '#f4ecd8'); aF(L2, 31, 31, 4, 1, '#c82a2a'); }   // a price card
    else if(kind === 'cha'){ // a tea merchant: a wall of lacquer canisters with paper labels, the big tea jars in their cord nets, the counter
      room(L0, '#2e1e14', '#4a4038', '#403830'); aF(L0, 0, 10, 160, 17, '#5a3a22');
      for(const y of [16, 22]){ aF(L0, 0, y, 160, 1, '#2a1a0e'); for(let x = 2; x < 158; x += 6){ const tin = r(x * .9 + y) < .25, c = tin ? '#9a9aa4' : '#1a1416'; aF(L0, x, y - 5, 4, 5, c); aF(L0, x, y - 5, 4, 1, tin ? '#d8d8e0' : '#4a3a3a'); aF(L0, x + 1, y - 3, 2, 2, '#e8dcc0'); aP(L0, x + 1, y - 3, '#3a2a20'); } }
      for(let x = 10; x < 160; x += 48){ aE(L0, x + 4, 23, 4.5, 3.6, '#7a4220'); aF(L0, x + 1, 18, 7, 2, '#8a2a2a'); aP(L0, x + 4, 17, '#c8a050'); for(let q = 0; q < 3; q++) aF(L0, x + q * 3, 21, 1, 5, '#c8a868'); aF(L0, x, 23, 9, 1, '#c8a868'); aP(L0, x + 2, 21, '#b06a3a'); }
      aF(L1, 0, 24, 160, 3, '#4a2e1c'); aF(L1, 0, 24, 160, 1, '#a07848'); aF(L1, 60, 21, 6, 3, '#9a9aa4'); aF(L1, 61, 20, 4, 1, '#d8d8e0'); aF(L1, 90, 22, 8, 2, '#c8a040'); aF(L1, 93, 19, 1, 3, '#2a2a2a');   // the counter: tins, the scale
      aPer(L1, 72, 10, '#3a4a3a', { apron:'#2a3a5a', skin:'#e0b898' });
      aF(L2, 120, 26, 18, 6, '#3a2416'); aF(L2, 120, 26, 18, 1, '#8a6040'); for(let x = 122; x < 136; x += 4){ aF(L2, x, 23, 3, 3, '#5a8a3a'); aP(L2, x, 23, '#8ac060'); } }   // tea in open boxes
    else { // kappo: a counter restaurant: cedar wall, sake bottles, menu strips, the cook in white, the counter, the customers' backs
      room(L0, '#5a3a22', '#4a3a2e', '#40322a'); aF(L0, 0, 10, 160, 17, '#9a6a40');
      for(let x = 2; x < 158; x += 5){ aF(L0, x, 9, 3, 6, r(x * 3.1) < .2 ? '#f0d090' : '#f4ecd8'); aF(L0, x + 1, 10, 1, 3, '#5a4a40'); if(r(x) < .3) aP(L0, x + 1, 13, '#c82a2a'); }   // the menu strips
      aF(L0, 0, 18, 160, 1, '#3a2414'); for(let x = 3; x < 158; x += 4){ const c = r(x * 1.7) < .5 ? '#1a3a2a' : '#3a2010'; aF(L0, x, 12 + 1, 2, 5, c); aP(L0, x, 13, aLt(c, .3)); aP(L0, x + 1, 15, '#e8dcc0'); aP(L0, x, 11 + 1, '#1a1a1a'); }
      aF(L0, 66, 19, 18, 8, '#ffd890'); aF(L0, 66, 19, 18, 4, '#2a3a5a'); aF(L0, 72, 19, 1, 4, '#1a2440'); aF(L0, 78, 19, 1, 4, '#1a2440');   // the kitchen door: its noren, the light beyond
      aPer(L1, 40, 11, '#f4f4f0', { band:'#f4f4f0', skin:'#e8c0a0' }); aPer(L1, 108, 12, '#f4f4f0', { band:'#2a3a6a', skin:'#d8b090' }); aF(L1, 0, 20, 160, 2, '#6a4a2e'); aE(L1, 58, 18, 3, 1.4, '#9a9aa4'); aE(L1, 120, 18, 2.4, 1.2, '#2a2a2a');
      aF(L2, 0, 22, 160, 2, '#ecd098'); aF(L2, 0, 22, 160, 1, '#fff0c0'); aF(L2, 0, 24, 160, 12, '#7a5030'); for(let x = 6; x < 160; x += 20) aF(L2, x, 24, 1, 12, '#5a3820');
      for(const x of [22, 58, 94, 132]){ aPer(L2, x, 15, ['#2a2a3a', '#3a2a2a', '#2a3a3a', '#4a3a2a'][(x >> 3) % 4], { back:true }); aF(L2, x - 1, 19, 7, 3, '#1a1418'); aF(L2, x + 1, 24, 3, 6, '#1a1418'); } }
    return [L0, L1, L2]; }
  // after hours: the room dimmed and cooled (the fronts are the same; the noren come in: see the fronts)
  function dimL(L){ for(let i = 0; i < L.c.length; i++){ const c = L.c[i]; if(c) L.c[i] = aMix(c, '#0e0c1a', .72); } return L; }

  // ---- the fronts (layer 3). face: 'kb' bengara lattice (ochaya), 'kd' dark-stained lattice (a house), 'mise' an open shop under a half
  // noren, 'glass' a Shijō shop's glazed front. nc: the noren's colour; lit: open (noren out, door open) or shut (noren in, the door's lattice).
  const NOREN = ['#1c2a5a', '#ece4d4', '#5a1a1a', '#2a3a2e', '#3a2a4a'];
  function crest(I, x, y, c, k){ // a generic crest, 5 x 5: a ring with a dot, a four-petal flower, three dots, a wave
    if(k === 0){ for(const [a, b] of [[1, 0], [2, 0], [3, 0], [0, 1], [4, 1], [0, 2], [4, 2], [0, 3], [4, 3], [1, 4], [2, 4], [3, 4], [2, 2]]) aP(I, x + a, y + b, c); }
    else if(k === 1){ for(const [a, b] of [[2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [4, 2], [1, 3], [3, 3], [2, 4]]) aP(I, x + a, y + b, c); }
    else if(k === 2){ aP(I, x + 2, y + 0, c); aP(I, x + 1, y + 1, c); aP(I, x + 3, y + 1, c); aF(I, x, y + 3, 2, 2, c); aF(I, x + 3, y + 3, 2, 2, c); aP(I, x + 2, y + 1, c); }
    else { for(let a = 0; a < 5; a++) aP(I, x + a, y + 2 + (a & 1), c); for(let a = 0; a < 5; a++) aP(I, x + a, y + (a & 1), c); } }
  function norenAt(I, x0, x1, y0, y1, nc, ck){ const pw = Math.max(5, Math.floor((x1 - x0 + 1) / 3)), ink = nc === NOREN[1] ? '#2a2030' : '#ece4d4';
    aF(I, x0 - 1, y0 - 1, x1 - x0 + 3, 1, '#2a1a10');   // the rod
    for(let x = x0; x < x1; x++){ const k = (x - x0) % pw; if(k === pw - 1 && x < x1 - 2) continue; const c = k === 0 ? aLt(nc, .16) : k === pw - 2 ? aDk(nc, .22) : nc; aF(I, x, y0, 1, y1 - y0, c); aP(I, x, y1 - 1, aDk(nc, .3)); }
    const mx = Math.floor((x0 + x1) / 2) - 2; crest(I, mx, y0 + 3, ink, ck); }
  function face(kind, nc, lit, sd){ const I = aI(160, 36), r = q => H1(sd * 5.7 + q * 2.3);
    const C = kind === 'kb' ? ['#2a0a0a', '#4a1410', '#7a2a1a'] : ['#100a0a', '#22140e', '#3e2618'], post = (x, w) => { aF(I, x, 0, w, 36, C[0]); aF(I, x + 1, 0, 1, 36, C[2]); };
    const head = () => { aF(I, 0, 0, 160, 3, C[0]); aF(I, 0, 2, 160, 1, C[1]); aF(I, 0, 0, 160, 1, aLt(C[1], .15)); };
    if(kind === 'kb' || kind === 'kd'){ // posts, two lattice panels and the door bay (open under a noren, or shut), the koshi-ita, the plinth
      const kiri = kind === 'kb' || r(1) < .5, PZ = r(2) < .35;   // a kiriko top (every other slat cut short); PZ: the second panel is a plastered sodekabe
      const lat = (xa, xb) => { for(let x = xa; x < xb; x++){ const k = (x - xa) % 3; if(k === 2) continue; const short = kiri && (Math.floor((x - xa) / 3) & 1);
          const y0 = short ? 10 : 3, sl = Math.floor((x - xa) / 3), wash = H1(sl * 2.7 + sd * 31) * .18; for(let y = y0; y < 29; y++){ const c = k === 0 ? C[2] : C[1]; aP(I, x, y, aDk(c, wash + (y > 22 ? (y - 22) * .03 : 0))); } } aF(I, xa, 3, xb - xa, 1, C[1]); if(kiri) aF(I, xa, 9, xb - xa, 1, C[1]); aF(I, xa, 28, xb - xa, 2, C[1]); aF(I, xa, 28, xb - xa, 1, C[2]); };
      head(); lat(0, 20); post(16, 4); lat(20, 72); post(72, 4);
      if(lit){ aF(I, 76, 30, 32, 6, '#5a5450'); aF(I, 76, 30, 32, 1, '#9a9088'); norenAt(I, 77, 107, 3, 19, nc, Math.floor(sd * 4) % 4); }   // open: the noren out, the step
      else { for(let x = 76; x < 108; x++) aF(I, x, 3, 1, 27, (x & 1) ? C[1] : C[0]); for(let y = 5; y < 30; y += 3) aF(I, 76, y, 32, 1, C[1]); aF(I, 91, 3, 2, 27, C[0]); }   // shut: the lattice door
      post(108, 4);
      if(PZ){ aF(I, 112, 3, 28, 26, '#5a5262'); aF(I, 112, 3, 28, 1, '#7a7484'); for(let x = 118; x < 134; x += 3){ aF(I, x, 9, 2, 10, '#8a8494'); aP(I, x, 9, '#a8a2b0'); } aF(I, 117, 8, 18, 1, '#3a3442'); aF(I, 117, 19, 18, 1, '#3a3442'); for(let x = 120; x < 134; x += 3) aF(I, x, 10, 1, 9, lit ? '#d89850' : '#1a141e'); }   // a barred window in plaster
      else lat(112, 140);
      post(140, 4); lat(144, 160);
      boards(I, 0, 30, 76, 4, [C[0], C[1]], sd * 7, kind === 'kd'); boards(I, 108, 30, 52, 4, [C[0], C[1]], sd * 9, kind === 'kd'); aF(I, 0, 30, 76, 1, C[2]); aF(I, 108, 30, 52, 1, C[2]); for(let x = 0; x < 160; x++){ const st = Math.floor(x / 11); aP(I, x, 34, x % 11 ? '#56525c' : '#24222a'); aP(I, x, 35, H1(st * 3.3) < .5 ? '#3a3842' : '#44424c'); } }
    else if(kind === 'mise'){ // an open shop: posts, a half noren across the whole front (a crest on every panel), open below; shut: wooden doors
      head(); post(14, 4); post(78, 3); post(142, 4);
      if(lit){ for(let x = 18; x < 142; x++){ if(x >= 78 && x < 81) continue; const k = (x - 18) % 16; if(k === 15) continue; aF(I, x, 3, 1, 9, k === 0 ? aLt(nc, .16) : k === 14 ? aDk(nc, .22) : nc); aP(I, x, 11, aDk(nc, .3)); }
        for(let x = 22; x < 140; x += 16) if(x < 74 || x > 82) crest(I, x + 1, 5, nc === NOREN[1] ? '#2a2030' : '#ece4d4', Math.floor(sd * 4) % 4);
        aF(I, 0, 32, 160, 4, '#5a5450'); aF(I, 0, 32, 160, 1, '#8a8278'); }
      else { for(let x = 18; x < 142; x++) if(x < 78 || x >= 81) aF(I, x, 3, 1, 31, ((x - 18) % 4) ? C[1] : C[0]); for(let x = 18; x < 142; x += 31) aF(I, x, 3, 1, 31, C[2]); aF(I, 0, 34, 160, 2, '#3a3842'); }
      aF(I, 0, 3, 14, 33, '#3a3442'); aF(I, 146, 3, 14, 33, '#3a3442'); }   // (the pads: the neighbour's wall)
    else { // glass: a Shijō shop. Wooden frame, sliding glazed doors (mullions every 31), glints, the kick board; a short noren over the door
      aF(I, 0, 0, 160, 4, '#2a1a12'); aF(I, 0, 3, 160, 1, '#5a3a22');
      for(let x = 16; x <= 144; x += 32){ aF(I, x - 1, 4, 3, 28, '#2a1a12'); aF(I, x, 4, 1, 28, '#6a4a30'); }
      for(let x = 18; x < 142; x += 32) for(let q = 0; q < 5; q++){ const gx = x + 4 + q + Math.floor(r(x) * 10), gy = 6 + q * 2; if((q & 1) === 0) aP(I, gx, gy, '#f4f8ff'); }
      aF(I, 0, 30, 160, 6, '#3a2416'); aF(I, 0, 30, 160, 1, '#7a5030'); aF(I, 0, 35, 160, 1, '#1a1010');
      if(lit) norenAt(I, 65, 95, 5, 13, nc, Math.floor(sd * 4) % 4); }
    return I; }

  // ---- the upper storey (128 x 24, one layer; frames for the figures seen through the paper). kinds: shoji, sudare, mushi, koshi
  const UPF = 4;
  function upperArt(kind, lit, fr, sd, wallC){ const I = aI(128, 24), wall = wallC || '#4a4858'; if(kind === 'koshi') boards(I, 0, 0, 128, 24, ['#100a0a', '#24160f'], sd, true); else plaster(I, 0, 0, 128, 24, wall, sd * 13.1);   // the plaster: grime, streaks, the splash band; or sugi-yaki boards
    aF(I, 0, 0, 128, 1, aDk(wall, .4));
    // a figure seen through paper or bamboo: a geiko dancing with a fan (4 poses), as a shadow
    const fig = (x0, y0, col, step) => { const p = fr % UPF, arm = [[-3, 2], [-4, 0], [3, -1], [4, 1]][p]; aF(I, x0 + 1, y0, 3, 2, col); aF(I, x0 + 1, y0 - 1, 3, 1, col); aF(I, x0 + 2, y0 + 2, 2, 1, col);
      aF(I, x0, y0 + 3, 5, 12, col); aF(I, x0 - 1, y0 + 10, 7, 5, col); const ax = x0 + 2 + arm[0], ay = y0 + 4 + arm[1]; for(let t = 0; t <= 4; t++) aP(I, x0 + 2 + Math.round(arm[0] * t / 4), y0 + 4 + Math.round(arm[1] * t / 4), col);
      for(let q = -2; q <= 2; q++) aP(I, ax + q, ay - 1 - (q * q > 1 ? 0 : 1), col); aF(I, ax - 1, ay - 2, 3, 1, col); if(step) aP(I, x0 + (p & 1 ? 0 : 4), y0 + 15, col); };
    if(kind === 'shoji' || kind === 'sudare'){ for(const [xa, xb] of [[6, 60], [68, 122]]){ aF(I, xa - 1, 2, xb - xa + 2, 19, '#24140f');
        if(kind === 'shoji'){ for(let x = xa; x < xb; x++) for(let y = 3; y < 20; y++){ const t = 1 - Math.abs((x - (xa + xb) / 2) / ((xb - xa) / 2)) * .35; aP(I, x, y, lit ? aMix('#9a6436', '#e8c48a', t) : '#3a302c'); }
          for(let x = xa + 3; x < xb; x += 4) aF(I, x, 3, 1, 17, lit ? '#b07a40' : '#2a221e'); for(let y = 6; y < 20; y += 4) aF(I, xa, y, xb - xa, 1, lit ? '#b07a40' : '#2a221e'); aF(I, (xa + xb) >> 1, 3, 1, 17, '#3a2014'); }
        else { for(let y = 3; y < 20; y++) aF(I, xa, y, xb - xa, 1, lit ? (y & 1 ? '#c8884a' : '#a86a34') : (y & 1 ? '#3e3024' : '#342820')); for(let x = xa + 6; x < xb; x += 12) aF(I, x, 4, 1, 16, lit ? '#6a3a1a' : '#201810'); aF(I, xa, 3, xb - xa, 2, '#2a1a2a'); for(let x = xa + 2; x < xb; x += 8) aP(I, x, 5, '#c82a2a'); } }
      if(lit){ const fx = 20 + Math.floor(H1(sd * 3.3) * 22) + (fr % UPF === 2 ? 1 : 0), sc = kind === 'shoji' ? '#9a6234' : '#6a3a1c'; fig(fx, 4, sc, true);
        if(kind === 'sudare') for(let y = 4; y < 20; y += 2) for(let x = fx - 6; x < fx + 10; x++) if(aG(I, x, y) === sc) aP(I, x, y, '#a86a34');   // (through bamboo: every other row of the shadow is the blind's own slat)
        if(H1(sd * 9.1) < .5){ for(let y = 13; y < 20; y++) aF(I, 96, y, 6, 1, kind === 'shoji' ? '#a06a3a' : '#7a4a24'); aF(I, 97, 10, 4, 3, kind === 'shoji' ? '#a06a3a' : '#7a4a24'); } }   // a guest seated, still
      aF(I, 0, 15, 128, 2, '#3e2418'); aF(I, 0, 15, 128, 1, '#7a4a2a'); for(let x = 2; x < 128; x += 4) aF(I, x, 17, 1, 4, '#2a160e'); aF(I, 0, 21, 128, 1, '#3e2418'); }   // the railing in front
    else if(kind === 'mushi'){ for(const xa of [14, 74]){ aF(I, xa - 2, 5, 40, 14, aLt(wall, .12)); aF(I, xa - 2, 18, 40, 1, aDk(wall, .35)); for(let x = xa; x < xa + 36; x += 4){ aF(I, x + 2, 7, 2, 10, lit ? '#d89a54' : '#141018'); aF(I, x, 7, 2, 10, aLt(wall, .3)); aP(I, x, 7, aLt(wall, .5)); } } }
    else { for(let x = 6; x < 122; x++) aF(I, x, 3, 1, 17, (x % 3) === 2 ? (lit ? '#b07a40' : '#1a1218') : (x % 3) ? '#22140e' : '#3e2618'); aF(I, 6, 3, 116, 1, '#3e2618'); aF(I, 6, 19, 116, 1, '#22140e'); }
    return I; }

  // ---- hanging signboards (kanban, 12 x 22) and the sugidama (14 x 16): graphic marks only, no lettering
  const KAN = ['fan', 'tea', 'dango', 'bowl', 'wave', 'gourd'];
  function kanArt(k){ const I = aI(12, 22), wood = '#5a3a20', face = k & 1 ? '#1a1410' : '#e8dcc0', ink = k & 1 ? '#e8c870' : '#2a1a14', red = '#c82a24';
    aF(I, 0, 0, 12, 22, '#2a1a10'); aF(I, 1, 1, 10, 20, wood); aF(I, 2, 2, 8, 18, face); aF(I, 1, 1, 10, 1, '#8a6040'); aF(I, 4, 0, 1, 1, '#1a1010'); aF(I, 7, 0, 1, 1, '#1a1010');
    const m = KAN[k % KAN.length];
    if(m === 'fan'){ for(let y = 5; y < 11; y++) for(let x = 2; x < 10; x++){ const dx = x - 5.5, dy = 11 - y, d = Math.sqrt(dx * dx + dy * dy); if(d < 5.2 && d > 1.4) aP(I, x, y, (Math.floor(Math.atan2(dy, dx) * 3) & 1) ? red : ink); } aF(I, 5, 11, 2, 2, ink); aF(I, 4, 15, 4, 1, ink); aF(I, 5, 17, 2, 1, ink); }
    else if(m === 'tea'){ aF(I, 3, 9, 6, 5, ink); aF(I, 4, 14, 4, 1, ink); aF(I, 9, 10, 1, 2, ink); aP(I, 5, 7, ink); aP(I, 6, 6, ink); aP(I, 5, 5, ink); aF(I, 4, 11, 4, 1, red); aF(I, 4, 17, 4, 1, ink); }
    else if(m === 'dango'){ aF(I, 6, 3, 1, 16, '#8a6a3a'); aE(I, 6, 6, 1.6, 1.6, '#f4a8b8'); aE(I, 6, 10, 1.6, 1.6, '#f4f0e8'); aE(I, 6, 14, 1.6, 1.6, '#8ac070'); if(k & 1) aE(I, 6, 10, 1.6, 1.6, '#e8dcc0'); }
    else if(m === 'bowl'){ aF(I, 3, 8, 6, 1, ink); aF(I, 3, 9, 6, 2, red); aF(I, 4, 11, 4, 1, ink); aF(I, 5, 12, 2, 1, ink); aF(I, 4, 15, 4, 1, ink); aF(I, 4, 17, 4, 1, ink); }
    else if(m === 'wave'){ for(let y = 5; y < 17; y += 4) for(let x = 2; x < 10; x++){ const t = (x - 2) / 8 * Math.PI * 2; aP(I, x, y + Math.round(Math.sin(t)), ink); } aE(I, 6, 4, 1.2, 1.2, red); }
    else { aE(I, 6, 7, 2, 2, ink); aE(I, 6, 12, 3, 3, ink); aF(I, 6, 4, 1, 1, '#8a6a3a'); aF(I, 4, 9, 4, 1, red); aF(I, 4, 17, 4, 1, ink); }
    return I; }
  function sugiArt(fresh){ const I = aI(14, 16); aF(I, 6, 0, 2, 2, '#8a7a5a'); for(let y = 2; y < 16; y++) for(let x = 0; x < 14; x++){ const dx = x - 6.5, dy = y - 8.8, d = Math.sqrt(dx * dx + dy * dy * 1.05); if(d > 6.6) continue;
      const h = H1(x * 3.7 + y * 11.3 + (fresh ? 0 : 5)), lt = dx < 0 && dy < 0 ? .2 : dx > 2 || dy > 3 ? -.3 : 0, base = fresh ? (h < .5 ? '#3a5a2a' : h < .8 ? '#4e7034' : '#2a4020') : (h < .5 ? '#6a4a26' : h < .8 ? '#8a6232' : '#4a3018');
      aP(I, x, y, lt > 0 ? aLt(base, .25) : lt < 0 ? aDk(base, .35) : base); if(d > 5.8 && h < .4) aP(I, x, y, null); }
    for(let x = 2; x < 12; x++) aP(I, x, 4, '#e8e0c8'); aP(I, 5, 5, '#e8e0c8'); aP(I, 8, 5, '#e8e0c8'); aF(I, 5, 6, 1, 2, '#f0ead8'); aF(I, 8, 6, 1, 2, '#f0ead8'); return I; }

  // ---- materials (Kellan: "the textures / lack of textures on the buildings"). Pre-baked strips, laid on the faces as the signs are:
  // plaster with grime gradient, stains, rain streaks under every sill and the dark splash band at its foot; weathered sugi boards with
  // grain; the bengara wash, uneven; the eave's tile front (the round ends of the cover tiles, the pale lip); a stone base.
  function plaster(I, x0, y0, w, h, base, sd){ for(let y = y0; y < y0 + h; y++){ const g = (y - y0) / h; for(let x = x0; x < x0 + w; x++){ const n = H1(x * 1.3 + y * 7.1 + sd), m = H1(Math.floor(x / 5) * 3.1 + Math.floor(y / 4) * 5.3 + sd);
        let c = aMix(base, '#0a0812', .1 + g * .22 + (m < .25 ? .1 : 0)); if(n < .12) c = aLt(c, .07); else if(n > .9) c = aDk(c, .12); aP(I, x, y, c); } }
    for(let q = 0; q < w / 9; q++){ const x = x0 + Math.floor(H1(sd + q * 3.7) * w), y = y0 + Math.floor(H1(sd + q * 5.1) * h * .6), l = 3 + Math.floor(H1(sd + q * 7.9) * h * .5);   // rain streaks
      for(let t = 0; t < l && y + t < y0 + h; t++){ const c = aG(I, x, y + t); if(c) aP(I, x, y + t, aDk(c, .2 * (1 - t / l))); } }
    for(let x = x0; x < x0 + w; x++) for(let t = 0; t < 3; t++){ const y = y0 + h - 1 - t, c = aG(I, x, y); if(c && H1(x * 2.9 + t) < .9 - t * .25) aP(I, x, y, aDk(c, .28 - t * .07)); } }   // the splash band
  function boards(I, x0, y0, w, h, C, sd, yaki){ for(let x = x0; x < x0 + w; x++){ const b = Math.floor((x - x0) / 4), k = (x - x0) % 4, bc = H1(b * 3.3 + sd) < .3 ? aDk(C[1], .15) : C[1];
      for(let y = y0; y < y0 + h; y++){ const gr = H1(x * 1.9 + Math.floor(y / 3) * 4.1 + sd); let c = k === 0 ? C[0] : k === 1 ? aLt(bc, .08) : bc; if(gr < .18) c = aDk(c, .25); else if(yaki && gr > .85) c = aLt(c, .14); aP(I, x, y, c); } } }
  function texArt(kind, sd){
    if(kind === 'eave'){ const I = aI(64, 6); aF(I, 0, 0, 64, 6, '#1a1c28'); for(let x = 0; x < 64; x += 4){ aF(I, x, 1, 3, 4, '#262a38'); aP(I, x + 1, 1, '#4a5062'); aF(I, x, 4, 3, 1, '#12131c'); aP(I, x + 1, 2, '#8a8e9e'); } aF(I, 0, 5, 64, 1, '#b4b8c4'); aF(I, 0, 0, 64, 1, '#0e0e16'); return I; }   // the cover tiles' round ends, each with a moonlit boss
    if(kind === 'ridge'){ const I = aI(64, 4); aF(I, 0, 0, 64, 4, '#22242e'); for(let x = 0; x < 64; x += 2) aP(I, x, 1, '#3a3e4c'); aF(I, 0, 0, 64, 1, '#8a8e9e'); aF(I, 0, 3, 64, 1, '#121218'); return I; }
    if(kind === 'stone'){ const I = aI(64, 8); for(let y = 0; y < 8; y++) for(let x = 0; x < 64; x++){ const b = Math.floor((x + (y >= 4 ? 7 : 0)) / 14), c = H1(b * 3.1 + (y >= 4 ? 9 : 0)) < .5 ? '#3a3842' : '#46444e'; aP(I, x, y, H1(x * 3.1 + y * 1.7) < .15 ? aDk(c, .2) : c); }
      for(let x = 0; x < 64; x++){ aP(I, x, 0, '#6a6670'); aP(I, x, 4, '#24222a'); } for(let x = 0; x < 64; x += 14){ aF(I, x, 0, 1, 4, '#24222a'); aF(I, x + 7, 4, 1, 4, '#24222a'); } return I; }
    if(kind === 'gable'){ const I = aI(32, 32); plaster(I, 0, 0, 32, 32, '#4a4858', sd); for(let x = 0; x < 32; x += 10) aF(I, x, 0, 1, 32, '#2a1a14'); aF(I, 0, 20, 32, 1, '#2a1a14'); return I; }
    if(kind === 'shopwall'){ const I = aI(64, 32); for(let y = 0; y < 32; y++) for(let x = 0; x < 64; x++){ const t = (x % 8 === 0) || (y % 4 === 0), c = t ? '#1e1c26' : (H1(Math.floor(x / 8) * 2.1 + Math.floor(y / 4) * 3.7 + sd) < .5 ? '#2e2a36' : '#34303c'); aP(I, x, y, H1(x * 5.1 + y * 3.3) < .1 ? aDk(c, .15) : c); }
      for(let q = 0; q < 8; q++){ const x = Math.floor(H1(sd + q * 2.7) * 64); for(let y = 0; y < 32; y++) if(H1(x + y * .37 + q) < .7){ const c = aG(I, x, y); aP(I, x, y, aDk(c, .18)); } } return I; }   // tiled concrete, rain-streaked
    return null; }
  // ART-END

  // ---------------------------------------------------------------- the art atlas: every piece above, built at warm-up (one piece a step),
  // each at 1x and averaged 1/2 and 1/4 (alpha kept), packed in shelves into one 1024-wide texture (one putImageData at the end)
  const GA2 = { room:{}, face:{}, up:{}, kan:[], sugi:[], tex:{}, gate:{}, ready:false }; let GAT = null; const GPK = [];
  const aCC = new Map(); const aRGB = c => { let v = aCC.get(c); if(!v){ v = aHx(c); aCC.set(c, v); } return v; };
  function aPiece(I){ const lv = [], P = { w:I.w, h:I.h, L:lv, avg:'#202020' }; const px = new Float32Array(I.w * I.h * 4); let r = 0, g = 0, b = 0, n = 0;
    for(let i = 0; i < I.c.length; i++){ const c = I.c[i]; if(!c) continue; const v = aRGB(c); px[i * 4] = v[0]; px[i * 4 + 1] = v[1]; px[i * 4 + 2] = v[2]; px[i * 4 + 3] = 255; r += v[0]; g += v[1]; b += v[2]; n++; }
    if(n) P.avg = aHex(r / n, g / n, b / n); let w = I.w, h = I.h; lv.push({ w, h, px });
    for(let k = 1; k < 3; k++){ const w2 = Math.max(1, w >> 1), h2 = Math.max(1, h >> 1), q = new Float32Array(w2 * h2 * 4), p = lv[k - 1].px;
      for(let y = 0; y < h2; y++) for(let x = 0; x < w2; x++){ let R0 = 0, G0 = 0, B0 = 0, A0 = 0; for(let dy = 0; dy < 2; dy++) for(let dx = 0; dx < 2; dx++){ const o = (Math.min(h - 1, y * 2 + dy) * w + Math.min(w - 1, x * 2 + dx)) * 4, a = p[o + 3]; R0 += p[o] * a; G0 += p[o + 1] * a; B0 += p[o + 2] * a; A0 += a; }
        const o = (y * w2 + x) * 4; if(A0 > 0){ q[o] = R0 / A0; q[o + 1] = G0 / A0; q[o + 2] = B0 / A0; q[o + 3] = A0 / 4; } }
      lv.push({ w:w2, h:h2, px:q }); w = w2; h = h2; }
    GPK.push(P); return P; }
  function aPack(){ const AW = 1024; let x = 0, y = 0, rh = 0; const all = []; for(const P of GPK) for(const l of P.L) all.push(l); all.sort((a, b) => b.h - a.h);
    for(const l of all){ if(x + l.w > AW){ x = 0; y += rh + 1; rh = 0; } l.x = x; l.y = y; x += l.w + 1; if(l.h > rh) rh = l.h; }
    const AH = y + rh + 1; GAT = GAT || mk(AW, AH); if(GAT.height !== AH){ GAT.width = AW; GAT.height = AH; } const k = GAT.getContext('2d'), img = k.createImageData(AW, AH), d = img.data;
    for(const l of all){ for(let yy = 0; yy < l.h; yy++) for(let xx = 0; xx < l.w; xx++){ const s = (yy * l.w + xx) * 4, o = ((l.y + yy) * AW + l.x + xx) * 4; d[o] = l.px[s]; d[o + 1] = l.px[s + 1]; d[o + 2] = l.px[s + 2]; d[o + 3] = l.px[s + 3]; } l.px = null; }
    k.putImageData(img, 0, 0); GA2.ready = true; }
  const FACEK = ['kb', 'kd', 'mise', 'glass'];
  function* artSteps(){ if(GA2.ready) return; GPK.length = 0;
    for(const rk of ROOMS) for(const lit of [1, 0]){ const Ls = roomLayers(rk, .3 + ROOMS.indexOf(rk) * .11); if(!lit) Ls.forEach(dimL); const C = aI(160, 36);
      for(let i = 0; i < C.c.length; i++) for(let k = 2; k >= 0; k--){ const c = Ls[k].c[i]; if(c){ C.c[i] = c; break; } }
      GA2.room[rk + lit] = { L:Ls.map(aPiece), C:aPiece(C) }; yield; }
    for(const fk of FACEK){ for(let nc = 0; nc < NOREN.length; nc++){ GA2.face[fk + nc + '1'] = aPiece(face(fk, NOREN[nc], true, .17 + nc * .23)); if(nc < 2) GA2.face[fk + nc + '0'] = aPiece(face(fk, NOREN[nc], false, .17 + nc * .23)); yield; } }
    for(const uk of ['shoji', 'sudare']){ for(let f = 0; f < UPF; f++) GA2.up[uk + '1' + f] = aPiece(upperArt(uk, true, f, .37)); GA2.up[uk + '0'] = aPiece(upperArt(uk, false, 0, .37)); yield; }
    GA2.up.mushi1 = aPiece(upperArt('mushi', true, 0, .51)); GA2.up.mushi0 = aPiece(upperArt('mushi', false, 0, .51)); GA2.up.koshi0 = aPiece(upperArt('koshi', false, 0, .61)); GA2.up.koshi1 = aPiece(upperArt('koshi', true, 0, .61)); yield;
    for(let k = 0; k < KAN.length * 2; k++) GA2.kan.push(aPiece(kanArt(k))); GA2.sugi.push(aPiece(sugiArt(true)), aPiece(sugiArt(false)));
    for(const t of ['eave', 'ridge', 'stone', 'gable']) GA2.tex[t] = aPiece(texArt(t, .4)); yield;
    for(let q = 0; q < 3; q++) GA2.tex['shop' + q] = aPiece(texArt('shopwall', .3 + q * .27)); yield;
    for(const gk of GATEP) { GA2.gate[gk] = aPiece(gateArt(gk)); yield; }
    aPack(); }

  /* A picture on a face parallel to the street (the upper storey, the eave's tile front, a Shijō shop's wall): this slice's part, in strips
     about 4 px wide, each a drawImage of its column range (env/akiba.js faceArt). dOff: how far the face stands out from the wall, toward
     the road. Below 2 screen px per texel the 1/2 or 1/4 mip is sampled; the caller paints the average where it is too small. */
  const FXS = new Float64Array(26);
  function faceArtG(B, A, h0, h1, j, n, rep, dOff){ const z0b = B.b0, Lz = B.len; if(Lz < 1 || !A) return;
    const copies = Math.max(1, Math.round(Lz / rep)), tl = Lz / copies, zv = Math.floor(position / SEG) + 1.02, flip = B.side > 0, X0 = B.side * (B.x0 - (dOff || 0));
    const sa = Math.max(j, zv, z0b), sb = Math.min(j + n - .001, z0b + Lz); if(sb <= sa) return;
    if(!CF(sa)) return; const xa = CFX + (X0 + laneDX(Math.floor(sa))) * CFU, ua = CFU; if(!CF(sb)) return; const xb = CFX + (X0 + laneDX(Math.floor(sb))) * CFU;
    const hv = (h1 - h0) * Math.max(ua, CFU); if(!fin(xa + xb)) return; const kv = hv / A.h, Lv = A.L[kv < PX * .375 ? 2 : kv < PX * .75 ? 1 : 0];
    const ns = Math.max(1, Math.min(8, Math.round(Math.abs(xb - xa) / (PX * 8)))), a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .55);
    for(let s = 0; s <= ns; s++){ const z = sa + (sb - sa) * s / ns; FXS[s] = CF(z) ? snp(CFX + (X0 + laneDX(Math.floor(z))) * CFU) : NaN; }
    for(let s = 0; s < ns; s++){ const za = sa + (sb - sa) * s / ns, zb = sa + (sb - sa) * (s + 1) / ns, xl = Math.min(FXS[s], FXS[s + 1]), xr = Math.max(FXS[s], FXS[s + 1]); if(!(xr > xl) || xr < -PX || xl > W + PX) continue;
      const ta = (za - z0b) / tl, ti = Math.floor(ta), tb = Math.min(ti + 1, (zb - z0b) / tl); let u0 = ta - ti, u1 = tb - ti; if(flip){ const q = 1 - u1; u1 = 1 - u0; u0 = q; }
      if(!CF((za + zb) / 2)) continue; const yt = snp(CFY - h1 * CFU), yb = snp(CFY - h0 * CFU); if(yb <= yt) continue;
      cx.drawImage(GAT, Lv.x + u0 * Lv.w, Lv.y, Math.max(.01, (u1 - u0) * Lv.w), Lv.h, xl, yt, xr - xl, yb - yt); }
    cx.globalAlpha = a0; }
  /* The layered street floor (env/akiba.js interior): the room's three layers back to front, each slid by its depth x how obliquely this
     strip is seen (in whole texels, toward the street's far end), then the front (lattice, posts, noren) unslid. Mid range: the room's
     composite and the front, two images a strip. */
  const IDEP = [1, .55, .25];
  function interiorG(B, Q, Fc, h0, h1, j, n, rep, near){ const z0b = B.b0, Lz = B.len; if(Lz < 1) return;
    const copies = Math.max(1, Math.round(Lz / rep)), tl = Lz / copies, zv = Math.floor(position / SEG) + 1.02, flip = B.side > 0, X0 = B.side * B.x0, dir = flip ? -1 : 1;
    const sa = Math.max(j, zv, z0b), sb = Math.min(j + n - .001, z0b + Lz); if(sb <= sa) return;
    if(!CF(sa)) return; const xa = CFX + (X0 + laneDX(Math.floor(sa))) * CFU, ua = CFU; if(!CF(sb)) return; const xb = CFX + (X0 + laneDX(Math.floor(sb))) * CFU;
    const hv = (h1 - h0) * Math.max(ua, CFU); if(!fin(xa + xb)) return; const kv = hv / 36, li = kv < PX * .375 ? 2 : kv < PX * .75 ? 1 : 0;
    const ns = Math.max(1, Math.min(6, Math.round(Math.abs(xb - xa) / (PX * 12)))), a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .55);
    for(let s = 0; s <= ns; s++){ const z = sa + (sb - sa) * s / ns; FXS[s] = CF(z) ? snp(CFX + (X0 + laneDX(Math.floor(z))) * CFU) : NaN; }
    for(let s = 0; s < ns; s++){ const za = sa + (sb - sa) * s / ns, zb = sa + (sb - sa) * (s + 1) / ns, xl = Math.min(FXS[s], FXS[s + 1]), xr = Math.max(FXS[s], FXS[s + 1]); if(!(xr > xl) || xr < -PX || xl > W + PX) continue;
      const ta = (za - z0b) / tl, ti = Math.floor(ta), tb = Math.min(ti + 1, (zb - z0b) / tl); let u0 = ta - ti, u1 = tb - ti; if(flip){ const q = 1 - u1; u1 = 1 - u0; u0 = q; }
      if(!CF((za + zb) / 2)) continue; const yt = snp(CFY - h1 * CFU), yb = snp(CFY - h0 * CFU); if(yb <= yt) continue;
      const ob = clamp(1 - Math.abs((xl + xr) / 2 - W / 2) / (W / 2), 0, 1);
      if(near) for(let k = 0; k < 3; k++){ const Lv = Q.L[k].L[li], sc = Lv.w / 160, sh = Math.round(IDEP[k] * 14 * ob) * dir; cx.drawImage(GAT, Lv.x + (16 + u0 * 128 + sh) * sc, Lv.y, Math.max(.01, (u1 - u0) * 128 * sc), Lv.h, xl, yt, xr - xl, yb - yt); }
      else { const Lv = Q.C.L[li], sc = Lv.w / 160; cx.drawImage(GAT, Lv.x + (16 + u0 * 128) * sc, Lv.y, Math.max(.01, (u1 - u0) * 128 * sc), Lv.h, xl, yt, xr - xl, yb - yt); }
      const Fv = Fc.L[li], sf = Fv.w / 160; cx.drawImage(GAT, Fv.x + (16 + u0 * 128) * sf, Fv.y, Math.max(.01, (u1 - u0) * 128 * sf), Fv.h, xl, yt, xr - xl, yb - yt); }
    cx.globalAlpha = a0; }
  // where a point of its front (u 0..1 of a copy, as the pictures are laid; mirrored on the right) stands along the street
  function frontZ(B, u, rep, c){ const z0b = B.b0, Lz = B.len, cp = Math.max(1, Math.round(Lz / rep)), tl = Lz / cp; return z0b + tl * (Math.min(c, cp - 1) + (B.side > 0 ? 1 - u : u)); }
  const frontN = (B, rep) => Math.max(1, Math.round(B.len / rep));   /* (pictures run the building's whole length: gapviz showed the old .3 insets as slivers) */

  /* ---------------------------------------------------------------- the Nishirōmon in three dimensions (round 3; Kellan: "the temple at
     the first turn looks like it is just a 2d sprite but the second temple is 3d"). It was a camera-facing card; it is now built as the
     pagoda is: boxes and hipped roofs in world space (wq, clipped at the near plane), so its side faces, the depth of its eaves and its roof
     planes show in perspective and slide as you pass. Its faces are pixel-art pictures (pieces in the atlas) laid on the true quads: the
     front faces stand square to the street's axis, so each is one rectangle; the side faces are laid in strips. The lighting follows the
     pagoda's: the eave undersides floodlit warm, the plaster brightest at its foot, the tile dark with pale edges, the hips moonlit.
     Sizes are the gate's own at GS (drawn larger than life, round 2's staging), in half-road widths: the lower storey 2.16 x 1.1 deep. */
  const GATEP = ['gLowF', 'gUpF', 'gLowS', 'gUpS', 'gBrk', 'gRail', 'gWing', 'gWingS', 'pBody', 'pBrk', 'pSuien', 'pBell'];
  function gateArt(k){ const V = ['#5a140a', '#b83a16', '#ec6a26', '#ffa050'], Wt = ['#9a8a7c', '#d8c4ac', '#f4e4c8'], Gn = ['#0c3626', '#1c684a', '#3a9a6c'];
    const post = (I, x, w, y0, y1) => { aF(I, x, y0, w, y1 - y0, V[2]); aF(I, x, y0, 1, y1 - y0, V[3]); aF(I, x + w - 1, y0, 1, y1 - y0, V[1]); for(let y = y0; y < y1; y += 5) aP(I, x + 1 + (y & 1), y, V[1]); };
    const plast = (I, x, y, w, h) => { for(let yy = y; yy < y + h; yy++) for(let xx = x; xx < x + w; xx++){ const t = (yy - y) / h, n = H1(xx * 1.7 + yy * 3.1); aP(I, xx, yy, n < .08 ? Wt[0] : t > .55 ? (n > .85 ? Wt[1] : Wt[2]) : Wt[1]); } };   // floodlit from below: brightest at the foot
    const lat = (I, x, y, w, h) => { aF(I, x, y, w, h, Gn[0]); for(let xx = x + 1; xx < x + w - 1; xx += 2) aF(I, xx, y + 1, 1, h - 2, Gn[2]); aF(I, x, y, w, 1, Gn[1]); aF(I, x, y + h - 1, w, 1, Gn[1]); };
    const lan = (I, x, y) => { aP(I, x + 1, y, '#2a1010'); aF(I, x, y + 1, 3, 3, '#fff0d0'); aP(I, x + 1, y + 2, '#ffd890'); aF(I, x, y + 3, 3, 1, V[2]); aP(I, x + 1, y + 4, '#2a1010'); };
    const beams = (I, w) => { aF(I, 0, 0, w, 2, V[1]); aF(I, 0, 0, w, 1, V[2]); aF(I, 0, 6, w, 2, V[2]); aF(I, 0, 7, w, 1, V[1]); };
    if(k === 'gLowF'){ const I = aI(96, 20); plast(I, 0, 0, 96, 20); beams(I, 96);
      aF(I, 35, 2, 26, 18, '#180806'); aF(I, 35, 17, 26, 3, '#3a2418'); aF(I, 35, 17, 26, 1, '#6a4a2c'); for(const [x, y] of [[39, 12], [43, 13], [52, 12], [57, 13], [48, 14]]) aP(I, x, y, '#ffc070');   // the passage, the precinct's lights beyond
      aF(I, 47, 2, 2, 2, '#5a3a1a'); aF(I, 45, 4, 6, 6, '#e8b850'); aF(I, 45, 4, 6, 1, '#5a3a1a'); aF(I, 45, 9, 6, 1, '#5a3a1a'); aF(I, 46, 5, 1, 4, '#fff0a0'); aF(I, 49, 5, 1, 4, '#b07a28');   // the gilt lantern
      for(const [x0, rc] of [[5, '#8a2a1a'], [66, '#1e5a3a']]){ aF(I, x0, 8, 26, 6, '#2a1410'); const fx = x0 + 10; aF(I, fx + 1, 7, 4, 2, '#0a0a0a'); aF(I, fx + 1, 9, 4, 2, x0 < 40 ? '#c86a50' : '#d8a888'); aF(I, fx, 11, 6, 3, rc); aF(I, fx - 1, 12, 8, 2, rc); aP(I, fx, 11, aLt(rc, .3)); aF(I, fx + 7, 8, 1, 6, '#c8a050'); lat(I, x0, 13, 26, 7); }   // the guardians behind their green fences
      for(const x of [32, 62]){ aF(I, x, 2, 2, 12, '#0a0a0e'); aF(I, x, 4, 2, 1, '#e8e0d0'); }   // the black banners
      for(const x of [0, 30, 61, 91]) post(I, x, 5, 0, 20);
      for(let x = 5; x < 92; x += 9) if(x < 32 || x > 60) lan(I, x, 1);
      return I; }
    if(k === 'gUpF'){ const I = aI(80, 14); plast(I, 0, 0, 80, 14); aF(I, 0, 0, 80, 1, V[1]); aF(I, 0, 11, 80, 1, V[2]); lat(I, 6, 2, 20, 9); lat(I, 54, 2, 20, 9);
      aF(I, 33, 2, 14, 8, '#c89a3a'); aF(I, 34, 3, 12, 6, '#1a1410'); aF(I, 34, 3, 12, 1, '#3a2a20');   // the plaque (no lettering)
      for(const x of [0, 26, 50, 76]) post(I, x, 4, 0, 14); return I; }
    if(k === 'gLowS'){ const I = aI(40, 20); plast(I, 0, 0, 40, 13); beams(I, 40); aF(I, 0, 13, 40, 7, V[1]); for(let x = 1; x < 40; x += 4) aF(I, x, 13, 1, 7, V[0]); lat(I, 8, 8, 9, 5); lat(I, 23, 8, 9, 5); for(const x of [0, 18, 36]) post(I, x, 4, 0, 20); return I; }
    if(k === 'gUpS'){ const I = aI(32, 14); plast(I, 0, 0, 32, 14); aF(I, 0, 0, 32, 1, V[1]); lat(I, 8, 2, 16, 9); for(const x of [0, 28]) post(I, x, 4, 0, 14); return I; }
    if(k === 'gBrk'){ const I = aI(96, 5); aF(I, 0, 0, 96, 5, V[0]); for(let x = 0; x < 96; x += 3){ aF(I, x, 1, 2, 3, V[2]); aP(I, x, 1, Wt[2]); aF(I, x, 3, 2, 1, V[3]); } aF(I, 0, 0, 96, 1, V[1]); return I; }   // bracket clusters, their ends pale, lit from below
    if(k === 'gRail'){ const I = aI(96, 5); aF(I, 0, 0, 96, 1, V[3]); aF(I, 0, 1, 96, 1, V[1]); for(let x = 0; x < 96; x += 3) aF(I, x, 2, 1, 3, V[2]); aF(I, 0, 4, 96, 1, V[1]); for(let x = 0; x < 96; x += 16) aF(I, x, 0, 2, 5, '#e8c060'); return I; }
    /* The pagoda's materials (Hōkan-ji at night, the dusk and night photographs at pixel zoom): weathered dark timber with its grain, white
       plaster panels floodlit from below (brightest at the foot) with rain streaks and moss at the sill, the door's studs, the bracket sets
       (tokyō) as a band of blocks, bengara-red, their ends painted white, the shadows between them black; the bronze water-flame; a wind bell. */
    if(k === 'pBody'){ const I = aI(48, 24); boards(I, 0, 0, 48, 24, ['#140a06', '#2a170e'], 3.3, false);
      for(const xa of [3, 31]){ plaster(I, xa, 4, 14, 15, '#c89868', 7.7 + xa); for(let y = 11; y < 19; y++) for(let x = xa; x < xa + 14; x++){ const c = aG(I, x, y); aP(I, x, y, aLt(c, (y - 11) * .05)); } for(let x = xa; x < xa + 14; x += 3) if(H1(x * 2.3) < .5) aP(I, x, 18, '#3a4a2a'); }   // floodlit plaster, moss at the sill
      aF(I, 19, 3, 10, 19, '#2a140a'); for(let y = 6; y < 21; y += 3) for(let x = 20; x < 28; x += 3) aP(I, x, y, '#c08a40'); aF(I, 23, 3, 1, 19, '#120804'); aF(I, 19, 3, 10, 1, '#d89048');   // the door, its studs, its lit head
      aF(I, 0, 2, 48, 2, '#1a0e08'); aF(I, 0, 2, 48, 1, '#4a2a18'); aF(I, 0, 20, 48, 2, '#1a0e08'); aF(I, 0, 21, 48, 1, '#7a4a28'); return I; }
    if(k === 'pBrk'){ const I = aI(64, 6); aF(I, 0, 0, 64, 6, '#140806'); for(let x = 0; x < 64; x += 8){ aF(I, x + 1, 1, 6, 2, '#8a3a1a'); aF(I, x + 2, 3, 4, 2, '#a8481e'); aF(I, x + 3, 5, 2, 1, '#e0904a'); aP(I, x + 1, 1, '#f0dcb0'); aP(I, x + 6, 1, '#f0dcb0'); aP(I, x + 2, 3, '#f0dcb0'); aP(I, x + 5, 3, '#f0dcb0'); aF(I, x + 1, 2, 6, 1, '#5a2410'); } aF(I, 0, 0, 64, 1, '#2a1208'); return I; }
    if(k === 'pSuien'){ const I = aI(12, 12); const F0 = ['....b..b....', '...bb..bb...', '..b.bb.b.b..', '.b..b.bb..b.', '.bb.b..b.bb.', 'b.b.bb.b.b.b', 'b..b.bb..b.b', '.b.bb..bb.b.', '..bb.bb.bb..', '...bbbbbb...', '....bbbb....', '.....bb.....'];
      for(let y = 0; y < 12; y++) for(let x = 0; x < 12; x++) if(F0[y][x] === 'b') aP(I, x, y, x < 5 ? '#d8b068' : H1(x * 3 + y) < .3 ? '#4a7a6a' : '#8a6a3a'); return I; }
    if(k === 'pBell'){ const I = aI(5, 9); aF(I, 2, 0, 1, 2, '#2a2418'); aF(I, 1, 2, 3, 4, '#3a3a2a'); aF(I, 0, 5, 5, 1, '#3a3a2a'); aF(I, 1, 2, 1, 4, '#a89a6a'); aP(I, 2, 6, '#2a2418'); aF(I, 1, 7, 3, 2, '#c8b080'); return I; }
    if(k === 'gWing' || k === 'gWingS'){ const w = k === 'gWing' ? 64 : 24, I = aI(w, 20); plast(I, 0, 0, w, 13); beams(I, w); aF(I, 0, 13, w, 7, V[1]); for(let x = 1; x < w; x += 4) aF(I, x, 13, 1, 7, V[0]); aF(I, 0, 13, w, 1, V[2]);
      for(let x = 0; x < w; x += 16){ post(I, x, 3, 0, 20); if(x + 12 < w) lat(I, x + 5, 3, 8, 5); } post(I, w - 3, 3, 0, 20); for(let x = 7; x < w; x += 16) lan(I, x, 1); return I; }
    return aI(1, 1); }

  function gate(z, X0, fog){ cam(); FF = fog; const s = GS * .86, cs = camSeg();   /* (.86: the front now stands ~9 segments nearer than the card's plane did, so the gate keeps its staged size in frame) */ PJ(z, X0, 0); if(!fin(PJX + PJU)) return; const U0 = PJU * s; if(PJX + 4 * U0 < -PX || PJX - 4 * U0 > W + PX) return;
    const ad = .55 * s, ZF = d => z + d * ZU; if(ZF(.9 * s) < cs + ZNEAR) return;
    /* Nothing of it may stand over the road where you pass it (round 2): everything right of the road's left edge, at the depth of the
       front steps, is clipped (one pixel-aligned rect clip), so the near wing ends at the kerb. */
    const zc = Math.max(z, cs + ZNEAR + .05); PJ(zc, -1.25, 0); const xr = snp(PJX); if(!fin(xr)) return;   /* (at the gate's own depth, as the card's clip was) */
    if(xr < -PX) return; const clip = xr < W + PX; if(clip){ cx.save(); cx.beginPath(); cx.rect(-W, -H, xr + W, H * 3); cx.clip(); }
    if(HL) drfOn(HL, 'g', z); try{ gate3(z, X0, fog, s, cs, ad, ZF, U0); } finally { DRF = null; if(clip) cx.restore(); } }
  // a picture on a face square to the axis (constant z): one rectangle; on a face along it (constant X): strips
  function gPicF(A, za, Xa, Xb, h0, h1, cs){ if(za < cs + ZNEAR || !A) return; PJ(za, Xa, h1); const x0 = snp(PJX), y0 = snp(PJY); PJ(za, Xb, h0); const x1 = snp(PJX), y1 = snp(PJY); if(!fin(x0 + y0 + x1 + y1) || x1 - x0 < 1 || y1 - y0 < 1) return;
    if(x1 < -PX || x0 > W + PX || y1 < -PX || y0 > H + PX) return; const kv = (y1 - y0) / A.h, Lv = A.L[kv < PX * .375 ? 2 : kv < PX * .75 ? 1 : 0];
    if(y1 - y0 < PX * 3){ cx.fillStyle = F(A.avg); pxRect(x0, y0, x1 - x0, y1 - y0); return; } const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .55); cx.drawImage(GAT, Lv.x, Lv.y, Lv.w, Lv.h, x0, y0, x1 - x0, y1 - y0); cx.globalAlpha = a0; }
  function gPicS(A, X, za, zb, h0, h1, cs, flip){ if(!A) return; const N = 8; const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .55);
    for(let q = 0; q < N; q++){ const z0 = za + (zb - za) * q / N, z1 = za + (zb - za) * (q + 1) / N; if(Math.min(z0, z1) < cs + ZNEAR) continue;
      PJ(z0, X, h1); const xa = PJX, ya0 = PJY; PJ(z0, X, h0); const yb0 = PJY; PJ(z1, X, h1); const xb = PJX, ya1 = PJY; PJ(z1, X, h0); const yb1 = PJY;
      const xl = snp(Math.min(xa, xb)), xx = snp(Math.max(xa, xb)), yt = snp((ya0 + ya1) / 2), yb = snp((yb0 + yb1) / 2); if(!fin(xl + xx + yt + yb) || xx <= xl || yb <= yt || xx < -PX || xl > W + PX) continue;
      const kv = (yb - yt) / A.h, Lv = A.L[kv < PX * .375 ? 2 : kv < PX * .75 ? 1 : 0]; let u0 = q / N, u1 = (q + 1) / N; if(flip){ const t = 1 - u1; u1 = 1 - u0; u0 = t; }
      cx.drawImage(GAT, Lv.x + u0 * Lv.w, Lv.y, Math.max(.01, (u1 - u0) * Lv.w), Lv.h, xl, yt, xx - xl, yb - yt); }
    cx.globalAlpha = a0; }
  /* A hipped roof over a box: its eave (half sizes rx, rz at height he, the corners lifting), the floodlit underside back to the wall (half
     wx, wz at wh), the tile band of the eave with its pale rafter-end lip and its tile edge, and, where the eye stands above its plane, the
     slopes up to the inner line (half ix, iz at ih: a ridge when iz is 0, the balcony's edge for the skirt roof), their tile courses, the
     moonlit hips. eyeH, eyeX: the eye, in the gate's frame. */
  const GRF = new Float64Array(13);
  // (allocation-free: the corners go to scratch arrays, one quad at a time; RQ draws the four set by RP)
  const RQZ = new Float64Array(4), RQX = new Float64Array(4), RQH = new Float64Array(4); let gZ = 0, gX0 = 0, gSd = 0, gSR = 0, gR = 0, gWd = 0, gIi = 0, gOut = 0, gWo = 0, gIo = 0;
  function RP(i, u, k, h){ const along = k === 0 ? gR : k === 1 ? gWd : gIi, o2 = k === 0 ? gOut : k === 1 ? gWo : gIo; if(gSd){ RQZ[i] = gZ + u * along * ZU; RQX[i] = gX0 + gSR * o2; } else { RQZ[i] = gZ - o2 * ZU; RQX[i] = gX0 + u * along; } RQH[i] = h; }
  const RQ = col => wq(RQZ[0], RQX[0], RQH[0], RQZ[1], RQX[1], RQH[1], RQZ[2], RQX[2], RQH[2], RQZ[3], RQX[3], RQH[3], col);
  function RL(i, j, t){ RQZ[i] += (RQZ[j] - RQZ[i]) * t; RQX[i] += (RQX[j] - RQX[i]) * t; RQH[i] += (RQH[j] - RQH[i]) * t; }
  function gRoof(z, X0, cs, rx, rz, he, th, wx, wz, wh, ix, iz, ih, eyeH, dz, sideR, front, fine){ const LIFT = .075 * GS, N = 6;   /* (the Nishiromon's corners lift gently: half the pagoda's flare) */ gZ = z; gX0 = X0; gSR = sideR;
    for(let q = 0; q <= N * 2; q++){ const u = q / N - 1; GRF[q] = u * u * u * u; }
    for(let sd = 1; sd >= 0; sd--){ if(sd ? !sideR : !front) continue; gSd = sd; gR = sd ? rz : rx; gWd = sd ? wz : wx; gIi = sd ? iz : ix; gOut = sd ? rx : rz; gWo = sd ? wx : wz; gIo = sd ? ix : iz;
      for(let q = 0; q < N * 2; q++){ const u0 = q / N - 1, u1 = (q + 1) / N - 1, l0 = he + LIFT * GRF[q], l1 = he + LIFT * GRF[q + 1];
        RP(0, u0, 0, l0); RP(1, u1, 0, l1); RP(2, u1, 1, wh); RP(3, u0, 1, wh); RQ(L1(fine ? (q & 1 ? '#8a2e12' : '#a43a16') : '#963414')); }   // the underside: vermilion rafters, floodlit
      const dEye = sd ? (eyeX0 - X0) * sideR : dz, hAt = he + th + (ih - he - th) * (dEye - gOut) / Math.max(.01, gIo - gOut), up = eyeH > hAt;
      if(up) for(let q = 0; q < N * 2; q++){ const u0 = q / N - 1, u1 = (q + 1) / N - 1, l0 = he + th + LIFT * GRF[q], l1 = he + th + LIFT * GRF[q + 1];
        RP(0, u0, 0, l0); RP(1, u1, 0, l1); RP(2, u1, 2, ih); RP(3, u0, 2, ih); RQ(F(q & 1 ? '#1c1e2a' : '#22242f'));
        if(fine) for(let k = 0; k < 2; k++){ const t = .3 + k * .3; RP(0, u0, 0, l0); RP(3, u0, 2, ih); RP(1, u1, 0, l1); RP(2, u1, 2, ih); RL(0, 3, t); RL(1, 2, t); RL(3, 0, (1 - t - .04) / (1 - t)); RL(2, 1, (1 - t - .04) / (1 - t)); RQ(F('#363a4a')); } }   // tile courses
      for(let q = 0; q < N * 2; q++){ const u0 = q / N - 1, u1 = (q + 1) / N - 1, h0 = he + LIFT * GRF[q], h1 = he + LIFT * GRF[q + 1];
        RP(0, u0, 0, h0); RP(1, u1, 0, h1); RP(2, u1, 0, h1 + th); RP(3, u0, 0, h0 + th); RQ(F('#262836'));
        if(fine){ RP(2, u1, 0, h1 + th * .28); RP(3, u0, 0, h0 + th * .28); RQ(L1('#f0dcc0')); RP(0, u0, 0, h0 + th * .82); RP(1, u1, 0, h1 + th * .82); RP(2, u1, 0, h1 + th); RP(3, u0, 0, h0 + th); RQ(F('#7a7e90')); } }
      if(up && fine) for(let u = -1; u <= 1; u += 2){ RP(0, u, 0, he + th + LIFT); RP(1, u, 2, ih); if(RQZ[0] > cs + ZNEAR && RQZ[1] > cs + ZNEAR){ PJ(RQZ[0], RQX[0], RQH[0]); const x0 = PJX, y0 = PJY; PJ(RQZ[1], RQX[1], RQH[1]); pline(x0, y0, PJX, PJY, F('#7a8098'), 1); } } } }
  let eyeX0 = 0;
  function gate3(z, X0, fog, s, cs, ad, ZF, U0){ const fine = U0 >= PX * 10, small = U0 < PX * 3;
    let n = z - BI; if(n < 0) n = 0; if(n > NX - 1) n = NX - 1; const gi = n | 0, gy = YA[gi] + (YA[gi + 1] - YA[gi]) * (n - gi), eyeH = (CAMY - gy) / ROADW, dz = (z - cs) / ZU; eyeX0 = playerX;
    const aw = 1.08 * s, front = cs < ZF(-ad), sideR = playerX > X0 + aw ? 1 : playerX < X0 - aw ? -1 : 0, Gp = GA2.ready ? GA2.gate : {};
    // the forest behind (Maruyama): a wooded hill, never a card (audit #14), camera-facing well behind the gate
    if(plane(ZF(1.2 * s), X0)){ OU *= s; const u = OU, cw = Math.max(PX, Math.min(2 * PX, snp(u * .09))), x0 = snp(OX - 3.4 * u), CWu = .34;
      for(let xs = x0; xs < OX + 3.4 * u; xs += cw){ if(xs > W + PX) break; if(xs + cw < -PX) continue; const X = (xs + cw / 2 - OX) / u;
        const f = Math.min(1, Math.abs(X) / 3.4), cc = (X + 3.4) / CWu, cr = Math.floor(cc), t = (cc - cr) * 2 - 1, dome = Math.sqrt(Math.max(0, 1 - t * t));
        const hb = .4 + (2.9 * (1 - f * f) + H1(cr * .37 + 5) * .34 * (1 - f * .5) + dome * (.12 + H1(cr * 1.13 + 2) * .1)), top = snp(OY - hb * u), bot = snp(OY - .2 * u);
        if(bot - top < PX) continue; R(xs, top, cw, bot - top, F(H1(cr * 2.9 + 1) > .7 ? '#0a1210' : '#070c0c')); R(xs, top, cw, PX, F(dome > .45 ? '#1c2a26' : '#142220'));
        if(Math.abs(X) < 2.9){ const g = Math.abs(X) / 2.9, hl = .4 + (1.45 * (1 - g * g) + H1(cr * 3.7 + 9) * .22 + dome * .08), tl = snp(OY - hl * u); if(bot - tl >= PX) R(xs, tl, cw, bot - tl, F('#0e1814')); } } }
    // the stone platform under the gate and wings
    { const pz = ZF(-.62 * s); if(pz > cs + ZNEAR){ wq(pz, X0 - 2.95 * s, 0, pz, X0 + 2.95 * s, 0, pz, X0 + 2.95 * s, .42 * s, pz, X0 - 2.95 * s, .42 * s, F('#4a4650'));
        if(!small && GA2.ready) for(let q = 0; q < 8; q++){ const xa = X0 + (-2.95 + q * .7375) * s; gPicF(GA2.tex.stone, pz, xa, xa + .7375 * s, 0, .42 * s, cs); }   // dressed stone in courses
        wq(pz, X0 - 2.95 * s, .4 * s, pz, X0 + 2.95 * s, .4 * s, pz, X0 + 2.95 * s, .42 * s, pz, X0 - 2.95 * s, .42 * s, F('#8a8690')); } }
    // the wings: lower halls each side, their hipped roofs (outer end first where it shows)
    for(let sw = -1; sw <= 1; sw += 2){ const xa = X0 + sw * 1.14 * s, xb = X0 + sw * 2.75 * s, wz = .4 * s;
      if(!small && sideR === sw) gPicS(Gp.gWingS, xb, ZF(-wz), ZF(wz), .42 * s, 1.02 * s, cs, false);
      if(front) gPicF(Gp.gWing, ZF(-wz), Math.min(xa, xb), Math.max(xa, xb), .42 * s, 1.02 * s, cs);
      const cxw = (xa + xb) / 2, hw = Math.abs(xb - xa) / 2; gRoof(z, cxw, cs, hw + .16 * s, wz + .14 * s, 1.04 * s, .06 * s, hw, wz, 1.02 * s, hw * .6, 0, 1.3 * s, eyeH, dz, sideR === sw ? sw : 0, front, fine); }
    // the upper storey and its roof (top down, so each roof covers the foot of the body above it, as you look up)
    const a2 = .92 * s, d2 = .42 * s;
    gRoof(z, X0, cs, 1.68 * s, .98 * s, 1.96 * s, .09 * s, a2 + .06 * s, d2 + .06 * s, 1.9 * s, .7 * s, 0, 2.5 * s, eyeH, dz, sideR, front, fine);
    if(!small){ for(let sg = -1; sg <= 1; sg += 2){ if(sideR !== sg) continue; const gx = X0 + sg * .7 * s; wq(ZF(-.24 * s), gx, 2.34 * s, ZF(.24 * s), gx, 2.34 * s, ZF(0), gx, 2.5 * s, ZF(0), gx, 2.5 * s, L1('#e8d8bc')); wq(ZF(-.24 * s), gx, 2.32 * s, ZF(.24 * s), gx, 2.32 * s, ZF(.24 * s), gx, 2.35 * s, ZF(-.24 * s), gx, 2.35 * s, L1('#c84a1e')); }   // the gable (irimoya), white boards and a vermilion rail
      const rz0 = ZF(-.03 * s); if(rz0 > cs + ZNEAR){ wq(rz0, X0 - .74 * s, 2.47 * s, rz0, X0 + .74 * s, 2.47 * s, rz0, X0 + .74 * s, 2.56 * s, rz0, X0 - .74 * s, 2.56 * s, F('#1a1c28')); wq(rz0, X0 - .74 * s, 2.55 * s, rz0, X0 + .74 * s, 2.55 * s, rz0, X0 + .74 * s, 2.57 * s, rz0, X0 - .74 * s, 2.57 * s, F('#9a9eae'));
        for(let e = -1; e <= 1; e += 2) wq(rz0, X0 + e * .7 * s, 2.47 * s, rz0, X0 + e * .8 * s, 2.47 * s, rz0, X0 + e * .82 * s, 2.64 * s, rz0, X0 + e * .72 * s, 2.62 * s, F('#262836')); } }   // the ridge and its onigawara
    if(!small && sideR) gPicS(Gp.gBrk, X0 + sideR * (a2 + .04 * s), ZF(-d2 - .04 * s), ZF(d2 + .04 * s), 1.8 * s, 1.9 * s, cs, sideR > 0);
    if(front) gPicF(Gp.gBrk, ZF(-d2 - .04 * s), X0 - a2 - .04 * s, X0 + a2 + .04 * s, 1.8 * s, 1.9 * s, cs);
    if(!small && sideR) gPicS(Gp.gUpS, X0 + sideR * a2, ZF(-d2), ZF(d2), 1.44 * s, 1.8 * s, cs, sideR > 0);
    if(front) gPicF(Gp.gUpF, ZF(-d2), X0 - a2, X0 + a2, 1.44 * s, 1.8 * s, cs);
    // the balcony: its floor's edge, the railing round the upper storey
    if(!small && sideR) gPicS(Gp.gRail, X0 + sideR * 1.02 * s, ZF(-.55 * s), ZF(.55 * s), 1.36 * s, 1.46 * s, cs, false);
    if(front) gPicF(Gp.gRail, ZF(-.55 * s), X0 - 1.02 * s, X0 + 1.02 * s, 1.36 * s, 1.46 * s, cs);
    // the skirt roof over the lower storey, up to the balcony's edge
    gRoof(z, X0, cs, 1.42 * s, .84 * s, 1.13 * s, .07 * s, aw + .05 * s, ad + .05 * s, 1.12 * s, 1.02 * s, .55 * s, 1.36 * s, eyeH, dz, sideR, front, fine);
    if(!small && sideR) gPicS(Gp.gBrk, X0 + sideR * (aw + .04 * s), ZF(-ad - .04 * s), ZF(ad + .04 * s), 1.02 * s, 1.12 * s, cs, false);
    if(front) gPicF(Gp.gBrk, ZF(-ad - .04 * s), X0 - aw - .04 * s, X0 + aw + .04 * s, 1.02 * s, 1.12 * s, cs);
    if(!small && sideR) gPicS(Gp.gLowS, X0 + sideR * aw, ZF(-ad), ZF(ad), .42 * s, 1.02 * s, cs, sideR > 0);
    if(front) gPicF(Gp.gLowF, ZF(-ad), X0 - aw, X0 + aw, .42 * s, 1.02 * s, cs);
    // the steps: seven treads down to the street (the side ends where they show, then each riser and tread, the highest first)
    const st = 7, sd0 = ad + .6 * s; for(let q = st - 1; q >= 0; q--){ const zq = ZF(-sd0 + q * .6 * s / st), h0 = q * .06 * s, h1 = h0 + .06 * s, w = 2.1 * s - q * .05 * s; if(zq < cs + ZNEAR) continue;
      if(sideR && !small) wq(zq, X0 + sideR * w, 0, ZF(-ad), X0 + sideR * w, 0, ZF(-ad), X0 + sideR * w, h1, zq, X0 + sideR * w, h1, F('#4e4a52'));
      const zn = q === st - 1 ? ZF(-ad) : zq + .6 * s / st * ZU; wq(zq, X0 - w, h1, zq, X0 + w, h1, zn, X0 + w, h1, zn, X0 - w, h1, F(q & 1 ? '#8a847c' : '#948e84'));   /* (each tread only to the next riser: a tread laid back to the gate painted over the risers above it) */ wq(zq, X0 - w, h0, zq, X0 + w, h0, zq, X0 + w, h1, zq, X0 - w, h1, F(q & 1 ? '#6a6460' : '#76706a'));
      if(fine) wq(zq, X0 - w, h1 - .012 * s, zq, X0 + w, h1 - .012 * s, zq, X0 + w, h1, zq, X0 - w, h1, L1('#c8bca8')); }
    // the stone lanterns flanking the steps, camera-facing
    if(!small && plane(ZF(-sd0 - .1 * s), X0)){ OU *= s; for(let sg = -1; sg <= 1; sg += 2){ const lx = sg * 2.35; PR(lx - .05, lx + .05, 0, .45, F(STONE[2])); PR(lx - .1, lx + .1, .45, .6, F(STONE[1])); PR(lx - .06, lx + .06, .48, .57, L1('#ffc870')); PP(lx - .16, .6, lx + .16, .6, lx + .05, .7, lx - .05, .7, F(STONE[1])); PR(lx - .14, lx + .14, .0, .05, F(STONE[0])); } }
    if(fog < .85){ PJ(ZF(-ad), X0, 1.1 * s); glow(PJX, PJY, Math.min(H * .25, U0 * 1.6), '#ff7a2a', .18 * (1 - fog)); } }


  // ---------------------------------------------------------------- the visit and its layout
  /* Each visit (zone z, border B0 to B1) is laid out from the gates alone, so place(), the set piece and the far land agree. In order:
       Shijō-dōri    B0 .. GT: shops with arcades, the Minami-za near the start, the Hanami-kōji junction JX, then a straight of 300
                     segments on the axis of the Nishirōmon (the gate stands on that axis at ZG, the road bending right in front of it);
       Hanami-kōji   H0 .. H1: lantern-lined machiya and ochaya, stone paving, no wires;
       Shirakawa     C0 .. C1: the canal on the left with willows, teahouses across it, Tatsumi-bashi at TB;
       Yasaka-dōri   K0 .. PG: a straight climb on the axis of the pagoda (at ZP), the road bending right at its foot, then down again.
     Section lengths scale with the visit (k), Shijō never shorter than the set piece needs. */
  const CW = 14, LAYS = new Map(); let LREF = null;
  const clear = (a, b) => !(window.inForkWindow && inForkWindow(a, b));
  const TURN_G = 5.4, TURN_P = 3.6;
  function lay(z){ if(z < 0 || typeof gates === 'undefined' || !gates.length) return null; if(segs !== LREF){ LREF = segs; LAYS.clear(); } const B0 = z > 0 ? gates[2 * z - 1] : 0, B1 = gates[2 * z + 1]; if(B0 === undefined || B1 === undefined) return null;
    const key = B0 + ':' + B1; let L = LAYS.get(key); if(L) return L;
    /* E: where the climb's descent must end. Visit 0 is built in the core's first batch (all 1200 segments at once), so its descent may run
       nearly to the border; later visits end it 180 before (a batch is at most about 150 segments: see place()). The fixed lengths (Shijō
       for the set piece, the bends, the crest) come first; the lanes, canal, climb and descent share what is left (k). */
    /* Round 2: the pagoda must be reached before the core's far-land blend (BG_PRE = 330 before the border) begins, or the next road's
       skyline rises behind it. k is chosen so the pagoda's segment stands 390 before the border (516 fixed + 780 k from the start); the
       descent takes what is left. On the first visit GATE_EXTRA (warmSteps) lengthens the visit by 360 so this fits. */
    const st = z === 0 ? 40 : 150, a0 = B0 + st, E = B1 - (z === 0 ? 30 : 180), k = clamp((B1 - 390 - a0 - 516) / 780, .3, 1.6);
    L = { z, B0, B1, a0, k, rows:[[], []], back:[[], []], req:false, sp:false, card:false, fin:false, cut:null, hy:{} };
    L.GT = a0 + Math.max(420, Math.round(440 * k)); L.JX = L.GT - 170; L.MZ = Math.max(a0 + 8, L.GT - 410); L.S0 = L.JX - 220;
    L.ZG = L.GT + 34; L.H0 = L.GT + 56; L.H1 = L.H0 + Math.round(250 * k); L.C0 = L.H1 + 16; L.C1 = L.C0 + Math.round(240 * k); L.TB = L.C0 + Math.round((L.C1 - L.C0) * .55);
    L.K0 = L.C1 + 24; L.PG = L.K0 + Math.round(290 * k); L.ZP = L.PG + 12; L.D0 = L.PG + 40; L.D1 = Math.min(E, L.D0 + Math.round(200 * Math.max(.6, k))); L.hc = L.D1 - L.D0 >= 60 ? HCL : 0;   // (the descent ends well before the border: see place())
    L.hasSP = L.S0 >= a0 && clear(L.S0, L.GT + 20);
    // the gate and the pagoda stand on the straight axes: their lateral is the road's own drift through the bend, measured from the curve
    // this file sets (crvAt), so they are fixed in the world and the road passes beside them
    L.XG = -axisOff(L, L.GT - 40, L.ZG) / ROADW; L.XP = -2.3 - axisOff(L, L.PG - 34, L.ZP) / ROADW;   // (the pagoda stands 2.3 left of the climb's axis: up the street, just left of centre, as the photographs frame it)
    for(let q = 0; q < 2; q++){ fillRow(L, q ? 1 : -1, L.rows[q]); fillBack(L, q ? 1 : -1, L.back[q]); }
    if(LAYS.size > 40) LAYS.clear(); LAYS.set(key, L); return L; }
  // the curve this road lays on the stretches it shapes (null: leave the core's own curve, damped)
  function crvAt(L, i){ if(i >= L.GT - 310 && i < L.GT - 40) return 0;
    if(i >= L.GT - 40 && i < L.GT + 50){ const t = (i - (L.GT - 40)) / 90; return TURN_G * sm(t / .3) * sm((1 - t) / .3); }
    if(i >= L.K0 - 10 && i < L.PG - 34) return 0;
    if(i >= L.PG - 34 && i < L.PG + 40){ const t = (i - (L.PG - 34)) / 74; return TURN_P * sm(t / .35) * sm((1 - t) / .35); }
    return null; }
  // how far the road's centre has drifted (world units, + right) at segment-float z from the straight it was on at a: the sum over
  // segments of the accumulated curve (the camera's own x += dx; dx += curve)
  function axisOff(L, a, z){ let x = 0, dx = 0; for(let i = a; i < z; i++){ const c = crvAt(L, i) || 0; const f = Math.min(1, z - i); x += dx * f; dx += c * f; } return x; }
  function sectAt(L, i){ return i < L.GT + 40 ? 'shijo' : i < L.H1 + 8 ? 'hanami' : i < L.C1 + 12 ? 'canal' : 'climb'; }
  // the extra height of the climb (world units): up Yasaka-dōri to the pagoda, down beyond it
  const HCL = 2400;
  function hAdd(L, i){ const h = L.hc; if(!h || i <= L.K0 || i >= L.D1) return 0; if(i < L.PG - 20) return h * sm((i - L.K0) / (L.PG - 20 - L.K0)); if(i < L.D0) return h; return h * (1 - sm((i - L.D0) / (L.D1 - L.D0))); }
  // the building rows: a kind per section, wall to wall, broken by the junction, the gate's turn and the canal's far side
  const KIND = { shijo:[['shop', 5], ['mach', 2]], hanami:[['ochaya', 5], ['mach', 2]], canal:[['ochaya', 3], ['mach', 2]], climb:[['mach', 5], ['ochaya', 1]] };
  const KL = { shop:[10, 8], mach:[9, 5], ochaya:[10, 6], minamiza:[60, 0] };
  function pickK(sec, r){ const A = KIND[sec]; let t = 0; for(const q of A) t += q[1]; let a = r * t; for(const q of A){ a -= q[1]; if(a < 0) return q[0]; } return A[0][0]; }
  function gapAt(L, side, i){ if(i >= L.JX && i < L.JX + CW) return L.JX + CW;
    if(side < 0 && i >= L.GT - 40 && i < L.H0) return L.H0; if(side > 0 && i >= L.GT - 6 && i < L.H0) return L.H0;
    if(side < 0 && i >= L.C0 && i < L.C1) return L.C1; if(i >= L.TB - 4 && i < L.TB + 8 && side > 0) return L.TB + 8;
    if(side < 0 && i >= L.PG - 26 && i < L.PG + 34) return L.PG + 34; if(i >= L.H1 && i < L.C0 && side > 0) return L.C0;
    return -1; }
  function fillRow(L, side, out){ let i = Math.max(0, L.B0 - 150), prev = '', n = 0; const end = L.B1 + 10;
    if(side > 0 && L.MZ >= i){ /* the Minami-za on the right near the start of Shijō */ }
    while(i < end && n < 500){ const ge = gapAt(L, side, i); if(ge >= 0){ i = ge; prev = ''; continue; }
      if(side > 0 && i >= L.MZ - 2 && i < L.MZ + 58){ if(i < L.MZ){ i = L.MZ; } out.push(mkB('minamiza', L.MZ, 58, side, 'shijo', n++)); i = L.MZ + 58; prev = 'minamiza'; continue; }
      const sec = sectAt(L, i), r = H1(i * 1.37 + side * 7.7 + L.B0 * .013); let k = pickK(sec, r); if(k === prev && k !== 'ochaya') k = pickK(sec, (r + .41) % 1);
      let len = KL[k][0] + Math.round(H1(i * 2.1 + side * 3.3) * KL[k][1]); let ng = Infinity; for(let q = i + 1; q < i + len + 1; q++) if(gapAt(L, side, q) >= 0 || (side > 0 && q === L.MZ)){ ng = q; break; }
      if(i + len > ng){ len = ng - i; if(len < 4){ i = ng; continue; } }
      out.push(mkB(k, i, len, side, sec, n++)); prev = k; i += len; if(sec === 'shijo' && H1(i * 3.3 + side) < .12){ i += 2; } }
    if(side < 0){ // across the canal: the teahouses facing the water (their own row, further out)
      let j = L.C0 + 2; while(j < L.C1 - 4){ const len = 9 + Math.round(H1(j * 1.9) * 5), e = Math.min(len, L.C1 - 2 - j); if(e >= 4) L.kawa = (L.kawa || []).concat([mkB('kawa', j, e, -1, 'canal', n++)]); j += len; } } }
  function fillBack(L, side, out){ // the back row: rooftops and the taller buildings behind the street (raised on a narrow screen: the portrait boost)
    let i = Math.max(0, L.B0 - 150), n = 0; while(i < L.B1 + 10 && n < 300){ const len = 12 + Math.round(H1(i * .91 + side * 5.1) * 14), sec = sectAt(L, i);
      if(!(side < 0 && i >= L.C0 - 4 && i < L.C1 + 2) && !(side < 0 && i >= L.GT - 60 && i < L.H0 + 4) && !(side < 0 && i >= L.PG - 40 && i < L.PG + 40)){
        const sd = H1(i * 3.71 + side * 1.3), x0 = (sec === 'shijo' ? 2.3 : 1.42) + 1.15 + sd * .6;
        out.push({ k:'back', b0:i, len, side, x0, sd, nF0:sec === 'shijo' ? 4 + Math.floor(sd * 3) : 1 + Math.floor(sd * 2.4), sec, nF:0, ak:0, h:0, depth:1 }); }
      i += len + (H1(i * 7.7) < .3 ? 3 : 0); n++; } }
  function mkB(k, b0, len, side, sec, n){ const sd = H1(b0 * .71 + side * 3.1 + 5.3), hs = q => H1(sd * 97.1 + q * 13.37);
    const x0 = k === 'kawa' ? 2.95 : sec === 'shijo' ? 2.25 + (hs(3) - .5) * .06 : sec === 'canal' ? 1.42 : sec === 'climb' ? 1.36 : 1.4;
    const B = { k, b0, len, side, sec, sd, x0, depth:k === 'shop' ? 1.6 : 1.1, n, nF0:1, nF:1, ak:0,
      lit:hs(1) < (sec === 'climb' ? .55 : sec === 'shijo' ? .8 : .78), up:hs(2) < (k === 'ochaya' ? .62 : .25) ? 'sudare' : hs(2) < .8 ? 'mushi' : 'lattice',
      door:Math.max(1, Math.min(len - 4, Math.floor(hs(4) * (len - 3)))), nor:['#1c2a52', '#e8e0d0', '#5a1a1a', '#2a3a2a', '#3a2a4a'][Math.floor(hs(5) * 5)], lan:hs(6) < .8,
      bg:k === 'ochaya' || k === 'kawa' ? BENG : WOOD, P:4 + Math.floor(hs(7) * 3), sign:hs(8) < .5 };
    if(k === 'shop'){ B.nF0 = 3 + Math.floor(hs(9) * 3); B.face = [['#2a2630', '#46404a', '#6a6268'], ['#242834', '#3c4250', '#5e6474'], ['#2e2622', '#4a3e36', '#6e5e50']][Math.floor(hs(10) * 3)]; }
    else if(k === 'minamiza'){ B.nF0 = 4; B.x0 = 2.3; B.depth = 2.4; B.lit = true; }
    else if(k === 'ochaya' || k === 'kawa'){ B.nF0 = hs(11) < .25 ? 3 : 2; }
    else B.nF0 = hs(11) < .15 ? 3 : 2;
    // round 3: which pictures it wears (the street floor's room and front, the upper storey), its hanging board, the inuyarai
    B.nc = Math.floor(hs(5) * 5); const SHOPR = ['wagashi', 'sensu', 'toki', 'cha'];
    if(k === 'ochaya' || k === 'kawa'){ B.fk = 'kb'; B.rk = hs(12) < .72 ? 'zashiki' : 'kappo'; }
    else if(k === 'mach'){ const shop = hs(12) < (sec === 'climb' ? .7 : sec === 'hanami' ? .3 : .55); B.fk = shop ? 'mise' : 'kd'; B.rk = shop ? SHOPR[Math.floor(hs(13) * 4)] : 'genkan'; }
    else if(k === 'shop'){ B.fk = 'glass'; B.rk = SHOPR.concat(['kappo'])[Math.floor(hs(13) * 5)]; }
    if(B.fk){ B.fkey = B.fk + (B.lit ? B.nc : B.nc % 2) + (B.lit ? '1' : '0'); B.inu = B.fk !== 'mise' && B.fk !== 'glass' && sec !== 'shijo' && hs(14) < .7; B.uk = B.up === 'lattice' ? (B.fk === 'kb' ? 'shoji' : 'koshi') : B.up;
      if(B.fk !== 'glass'){ const zl = frontZ(B, B.fk === 'mise' ? .47 : .45, 9, 0); B.door = zl + .4 - B.b0; }
      if(k !== 'shop' && B.sign && B.len >= 8){ B.kz = frontZ(B, B.fk === 'mise' ? .06 : .12, 9, frontN(B, 9) - 1); B.kan = B.rk === 'kappo' ? -1 : (['fan', 'tea', 'dango', 'bowl', 'wave', 'gourd'].indexOf(B.rk === 'sensu' ? 'fan' : B.rk === 'cha' ? 'tea' : B.rk === 'wagashi' ? 'dango' : B.rk === 'toki' ? 'bowl' : hs(15) < .5 ? 'wave' : 'gourd') + (hs(16) < .5 ? 6 : 0)); } }
    B.nF = B.nF0; B.h = bH(B); return B; }
  // storeys: a shop storey .62; the machiya street floor G .56, each upper storey UH .42 (low, under the deep eaves)
  const FH = .62, G = .56, UH = .42;
  const bH = B => B.k === 'shop' || B.k === 'minamiza' || B.k === 'back' ? (B.k === 'back' && B.sec !== 'shijo' ? .66 + B.nF * .44 : .74 + B.nF * FH) : G + .06 + (B.nF - 1) * (UH + .06);
  // the street stays enclosed on a narrow screen: in portrait the shops and the back row gain storeys (machiya keep their two: their
  // proportion is the point); the added storeys are plain bands (one quad each), so the portrait boost costs a few quads per building
  let ASPK = 1, ASPF = -1;
  function aspect(){ if(ASPF === DRAWN) return ASPK; ASPF = DRAWN; ASPK = Math.round(clamp(1 + (H / W - .75) * .85, 1, 1.9) * 20) / 20; return ASPK; }
  function fitB(B){ const k = aspect(); if(B.ak === k) return; B.ak = k; if(B.k === 'shop' || B.k === 'back') B.nF = B.nF0 + Math.round(B.nF0 * (k - 1) * (B.k === 'back' ? 1.4 : 1)); else B.nF = B.nF0; B.h = bH(B); }
  function bAt(A, i){ let lo = 0, hi = A.length - 1; while(lo <= hi){ const m = (lo + hi) >> 1, B = A[m]; if(i < B.b0) hi = m - 1; else if(i >= B.b0 + B.len) lo = m + 1; else return B; } return null; }
  function visitOf(i){ if(i < 0 || typeof gates === 'undefined' || !gates.length) return null; const K = landK(), z = zoneOfSeg(i);
    for(const zz of [z, z + 1, z - 1]) if(zz >= 0 && typeof ROUTE !== 'undefined' && ROUTE[zz] !== undefined && ROUTE[zz] === K) return lay(zz);
    return null; }

  // ---------------------------------------------------------------- building slices (as env/akiba.js: a face per slice)
  let FX1 = 0, FY1 = 0, FU1 = 0, FX2 = 0, FY2 = 0, FU2 = 0, SPX = 0, SIDE = 1;
  // a band on the face between heights h0 and h1 over the sub-span ta..tb
  function FQ(h0, h1, col, ta, tb){ if(ta === undefined){ ta = 0; tb = 1; } const xa = FX1 + (FX2 - FX1) * ta, xb = FX1 + (FX2 - FX1) * tb, ya = FY1 + (FY2 - FY1) * ta, yb = FY1 + (FY2 - FY1) * tb, ua = FU1 + (FU2 - FU1) * ta, ub = FU1 + (FU2 - FU1) * tb;
    const t0 = ya - ua * h1, t1 = yb - ub * h1, b0 = ya - ua * h0, b1 = yb - ub * h0;
    if((xa < -PX * 2 && xb < -PX * 2) || (xa > W + PX * 2 && xb > W + PX * 2) || (t0 > H + PX * 2 && t1 > H + PX * 2) || (b0 < -PX * 2 && b1 < -PX * 2)) return;
    if(Math.abs(xb - xa) < PX * 2.5 || (Math.abs(t1 - t0) < PX * .75 && Math.abs(b1 - b0) < PX * .75)){ const tm = CLY((t0 + t1) / 2), bm = CLY((b0 + b1) / 2), xl = CLX(Math.min(xa, xb)); if(!fin(tm + bm + xl)) return; cx.fillStyle = col; pxRect(xl, Math.min(tm, bm), CLX(Math.max(xa, xb)) - xl, Math.abs(bm - tm)); return; }
    poly4(xa, b0, xb, b1, xb, t1, xa, t0, col); }
  // a strip off the face: its section is the line from (lateral offset da toward the road, height ha) to (db, hb), run along ta..tb
  function SQ(da, ha, db, hb, col, ta, tb){ if(ta === undefined){ ta = 0; tb = 1; } const xa = FX1 + (FX2 - FX1) * ta, xb = FX1 + (FX2 - FX1) * tb, ya = FY1 + (FY2 - FY1) * ta, yb = FY1 + (FY2 - FY1) * tb, ua = FU1 + (FU2 - FU1) * ta, ub = FU1 + (FU2 - FU1) * tb, s = -SIDE;
    poly4(xa + s * da * ua, ya - ha * ua, xb + s * da * ub, yb - ha * ub, xb + s * db * ub, yb - hb * ub, xa + s * db * ua, ya - hb * ua, col); }
  const SPANF = f => { f = fogPx(f); return f < .02 ? 1 : f < .055 ? 2 : f < .13 ? 4 : f < .28 ? 8 : 16; };
  const SPT = new Uint8Array(1024); let SPTOK = false, SPF = -1, SPB = 0;
  const at = k => { const d = k - SPB; return d < 0 ? 1 : d > 1023 ? 16 : SPT[d]; };
  function spanOf(j, b0, end){ if(!SPTOK){ SPTOK = true; for(let d = 0; d < 1024; d++) SPT[d] = SPANF(clamp(Math.pow(d / DRAW, 1.6), 0, 1)); } if(SPF !== DRAWN){ SPF = DRAWN; SPB = segAt(position).index; }
    const lx = laneDX(j), lcut = j > b0 && laneDX(j - 1) !== lx;
    if(j > b0 && !lcut && (j - b0) % at(j)) return 0; let n = 1; while(j + n < end && n < 16 && (j + n - b0) % at(j + n) && laneDX(j + n) === lx) n++; return n; }
  function farEnd(j, n, X){ const t = segs[j + n - 1]; if(!t || !t.p2.screen.scale) return false; const q = t.p2.screen; FX2 = q.x + X * q.w; FY2 = q.y; FU2 = q.w; return fin(FX2 + FY2 + FU2); }

  function drawB(sp, x, y, uw, fog, now){ const B = sp.b; fitB(B); const j = sp.k, end = B.b0 + B.len, n = spanOf(j, B.b0, end); if(!n) return;
    FX1 = x; FY1 = y; FU1 = uw; SPX = sp.x; SIDE = B.side; if(!fin(x + y + uw) || !farEnd(j, n, sp.x)) return; FF = fog;
    const off = SIDE < 0 ? Math.max(FX1, FX2) < -PX * 2 && Math.max(FX1, FX2) + FU1 * .4 < 0 : Math.min(FX1, FX2) > W + PX * 2 && Math.min(FX1, FX2) - FU1 * .4 > W;
    if(off){ if(j === B.b0) endWall(B, x, y, uw, now); return; }
    const hv = Math.min(B.h + .5, Math.max(FY1 / Math.max(FU1, .01), FY2 / Math.max(FU2, .01)) + .3); if(hv <= 0) return;
    const fpx = Math.max(FU1, FU2) * .42, wpx = Math.abs(FX2 - FX1);
    if(B.k === 'back') backB(B, j, n, fpx, hv); else if(B.k === 'shop') shopB(B, j, n, fpx, wpx, hv, now); else if(B.k === 'minamiza') theatre(B, j, n, fpx, wpx, hv, now); else machiya(B, j, n, fpx, wpx, hv, now);
    if(j === B.b0) endWall(B, x, y, uw, now); }

  /* A machiya slice (Hanami-kōji, Shirakawa, Yasaka-dōri). From the ground: the stone plinth; the street floor (G .56) with its lattice
     (senbon-gōshi) and the warm light through it, the door bay with a noren, a lantern by the door, the inuyarai at the foot; the shallow
     tiled eave (ichimonji) between storeys; the low upper storey (sudare lit from behind, or mushiko-mado slats in plaster, or a wooden
     lattice) with, on the ochaya, a railing; the main eave (soffit and the tile edge) at the top. Bays are world-anchored (B.P segments). */
  function machiya(B, j, n, fpx, wpx, hv, now){ const W0 = B.bg, lit = B.lit, rel = j - B.b0, P = B.P, near = fpx >= 9 && n === 1, mid = fpx >= 3.2;
    const glow = lit ? GLOW[0] : '#3a2420', glowE = lit ? GLOW[1] : '#2a1a18';
    FQ(0, .04, F(STONE[1]));
    if(!mid){ FQ(.04, G, F(lit ? mix(W0[1], GLOW[1], .55) : W0[1])); FQ(G, G + .06, F(TILE)); for(let f = 1; f < B.nF; f++){ const fy = G + .06 + (f - 1) * (UH + .06); FQ(fy, fy + UH, F(B.up === 'sudare' && lit ? '#7a5030' : PLAS[1])); FQ(fy + UH, fy + UH + .06, F(TILE)); }
      return; }
    // round 3: the street floor as the layered picture (the room behind, the front over it), once it stands 6 px tall
    const art = GA2.ready && B.fkey && G * Math.max(FU1, FU2) >= PX * 6 && !GX.includes('art');
    if(art){ interiorG(B, GA2.room[B.rk + (lit ? 1 : 0)], GA2.face[B.fkey], 0, G, j, n, 9, fpx >= 14);
      if(fpx >= 4) for(let c = 0, N = frontN(B, 9); c < N; c++){
        if(B.inu) for(let pn = 0; pn < 2; pn++){ const ua = pn ? .75 : .02, ub = pn ? .98 : .44, z0 = frontZ(B, B.side > 0 ? ub : ua, 9, c), z1 = frontZ(B, B.side > 0 ? ua : ub, 9, c), ta = Math.max(0, (z0 - j) / n), tb = Math.min(1, (z1 - j) / n); if(tb <= ta) continue;   // the inuyarai under the lattice panels (never across the door)
          SQ(.08, 0, .06, .07, F('#2a2016'), ta, tb); SQ(.06, .07, .01, .15, F('#3e3220'), ta, tb); if(fpx >= 6) SQ(.012, .145, .0, .16, F(lit ? '#a8844a' : '#5a4c36'), ta, tb);
          if(fpx >= 10){ const st = .35; for(let z = Math.ceil(Math.max(z0, j) / st) * st; z < Math.min(z1, j + n); z += st){ const t = (z - j) / n; SQ(.075, .01, .015, .145, F('#18120c'), t, Math.min(1, t + .08 / n)); } } }
        if(B.fk === 'mise' && lit){ const z0 = frontZ(B, B.side > 0 ? .4 : .1, 9, c), z1 = frontZ(B, B.side > 0 ? .1 : .4, 9, c), ta = Math.max(0, (z0 - j) / n), tb = Math.min(1, (z1 - j) / n); if(tb > ta){   // a battari-shōgi folded down: the plank, its lit front edge
            SQ(0, .09, .075, .09, F('#5a3a22'), ta, tb); SQ(.075, .075, .075, .09, L1('#a8784a'), ta, tb); if(fpx >= 8) for(let lq = 0; lq < 2; lq++){ const t = ta + (tb - ta) * (lq ? .85 : .15); SQ(.06, 0, .06, .075, F('#2a1a10'), t, Math.min(1, t + .1 / n)); } } } } }
    else {
    // the street floor: the face, then each bay (lattice, door, or a plain wall panel)
    FQ(.04, G, F(W0[0]));
    const ba = Math.floor(rel / P), bz = Math.floor((rel + n - 1) / P);
    for(let bb = ba; bb <= bz; bb++){ const z0 = B.b0 + bb * P, ta = Math.max(0, (z0 - j) / n), tb = Math.min(1, (z0 + P - j) / n); if(tb <= ta) continue;
      const isDoor = B.door >= bb * P && B.door < bb * P + P, hb = H1(B.sd * 3.3 + bb * 2.9);
      // the post at the bay's start
      if(fpx >= 5){ const tp = (z0 - j) / n; if(tp >= 0 && tp < 1) FQ(.04, G, F(W0[2]), tp, Math.min(1, tp + Math.max(.06 / n, PX * 1.2 / Math.max(wpx, 1)))); }
      const pa = ta + (tb - ta) * .08, pb = tb - (tb - ta) * .06;
      if(isDoor){ // the door: a dim interior, the noren hanging from the lintel (a slit in the middle, a white roundel), the step
        FQ(.04, .46, F(lit ? '#5a3424' : DARKIN), pa, pb); FQ(.46, .5, F(W0[2]), pa, pb);
        const nc = B.nor; FQ(.3, .46, F(nc), pa + (pb - pa) * .1, pb - (pb - pa) * .1); if(fpx >= 7){ const pm = (pa + pb) / 2; FQ(.3, .44, F('#120c10'), pm - .012 / n * 4, pm + .012 / n * 4); FQ(.36, .4, F(nc === '#e8e0d0' ? '#2a2030' : '#e8e0d0'), pa + (pb - pa) * .62, pa + (pb - pa) * .74); }
        continue; }
      if(hb < .18 && B.sec !== 'canal'){ FQ(.1, .46, F(PLAS[1]), pa, pb); FQ(.18, .34, F(lit ? '#c8884a' : '#2a2026'), pa + (pb - pa) * .3, pb - (pb - pa) * .3); continue; }   // a plastered panel with a small barred window
      // the lattice: the light behind it, then the slats (each its own quad near; a mixed tone where a slat is under 2.5 px)
      FQ(.08, .5, F(glow), pa, pb); FQ(.08, .12, F(glowE), pa, pb);
      const slat = .26, pitch = wpx / n * slat;   // (a slat every .26 segment, about 15 cm)
      if(pitch < PX * 2.5){ FQ(.08, .5, F(mix(glow, W0[2], lit ? .58 : .4)), pa, pb); }
      else { const za = B.b0 + bb * P + P * .08, zb = B.b0 + bb * P + P * .94, ks = Math.ceil(Math.max(za, j) / slat), ke = Math.floor(Math.min(zb, j + n) / slat);
        for(let q = ks; q <= ke && q - ks < 80; q++){ const t = (q * slat - j) / n; if(t < 0 || t > 1) continue; FQ(.08, .5, F(W0[2]), t, Math.min(1, t + .55 * slat / n)); if(near) FQ(.08, .5, F(W0[1]), t, Math.min(1, t + .2 * slat / n)); } }
      FQ(.5, .53, F(W0[2]), pa, pb); FQ(.06, .08, F(W0[2]), pa, pb);   // the lattice's head and sill rails
      // the inuyarai: a curved bamboo fence leaning out from the foot of the wall
      if(B.sec !== 'shijo' && hb > .3){ SQ(.08, 0, .06, .07, F('#2a2016'), pa, pb); SQ(.06, .07, .01, .15, F('#3e3220'), pa, pb); if(fpx >= 6) SQ(.012, .145, .0, .16, F(lit ? '#a8844a' : '#5a4c36'), pa, pb);
        if(fpx >= 10){ const st = .35; for(let z = Math.ceil(Math.max(z0, j) / st) * st; z < Math.min(z0 + P, j + n); z += st){ const t = (z - j) / n; SQ(.075, .01, .015, .145, F('#18120c'), t, Math.min(1, t + .08 / n)); } } } } }
    // the shallow eave between storeys: its soffit seen from below, the tile front with a pale lip, the tile rolls near
    let fy = G; SQ(0, fy - .01, .16, fy + .01, F(W0[0])); SQ(.16, fy + .01, .17, fy + .07, F(TILE)); if(GA2.ready && .06 * Math.max(FU1, FU2) >= PX * 7) faceArtG(B, GA2.tex.eave, fy + .01, fy + .07, j, n, 7, .17); else if(fpx >= 4) SQ(.17, fy + .065, .17, fy + .075, F(TEDGE));   // (the tile front: the cover tiles' round ends, the pale lip)
    // the lantern by the door (camera-facing, hung from the eave's lip)
    if(B.lan){ const zl = B.b0 + B.door - .4; if(zl >= j && zl < j + n) lantern(zl, B.side * (B.x0 - .15) + laneDX(Math.floor(zl)), .38, .055, B.k === 'ochaya' || B.k === 'kawa' ? 1 : 0, B.sd); }
    fy += .07;
    for(let f = 1; f < B.nF; f++){ if(fy > hv) break; upper(B, fy, j, n, fpx, wpx, now); fy += UH; // the main eave over the top storey, or the next shallow eave
      const top = f === B.nF - 1, d = top ? .24 : .14; SQ(0, fy, d, fy + .03, F(top ? W0[1] : W0[0])); if(fpx >= 6 && top){ const st = 1.2; for(let z = Math.ceil(Math.max(B.b0, j) / st) * st; z < j + n; z += st){ const t = (z - j) / n; SQ(0, fy + .005, d, fy + .03, F(W0[0]), t, Math.min(1, t + .14 / n)); } }   // the rafter ends under the eave
      SQ(d, fy + .03, d + .01, fy + .1, F(TILE)); if(GA2.ready && .07 * Math.max(FU1, FU2) >= PX * 7) faceArtG(B, GA2.tex.eave, fy + .03, fy + .1, j, n, 7, d + .01); else if(fpx >= 3) SQ(d + .01, fy + .09, d + .01, fy + .105, F(TEDGE)); if(fpx >= 10 && top) SQ(d + .01, fy + .03, d + .01, fy + .045, F(TLIP));
      fy += .1; } }   // (the roof itself rises away from the street: from the eye's height it hides behind its own eave)
  // an upper storey: sudare blinds lit from behind (horizontal slats), mushiko-mado (dark slats in plaster), or a wooden lattice; a railing
  function upper(B, fy, j, n, fpx, wpx, now){ const lit = B.lit, P = B.P, W0 = B.bg;
    if(GA2.ready && B.uk && UH * Math.max(FU1, FU2) >= PX * 7 && !GX.includes('art')){ const an = B.uk === 'shoji' || B.uk === 'sudare', on = lit && H1(B.sd * 5.1) < (B.uk === 'koshi' ? .35 : .5);   /* (value: the upper rooms a step under the street floor, and half of them dark: Ishin's cool dark above the eaves) */
      const A = GA2.up[B.uk + (on ? 1 : 0) + (an && on ? (reduce ? 0 : Math.floor((now + B.sd * 9000) / 560) % UPF) : '')] || GA2.up[B.uk + '0'];   // the figures behind the paper move (a dance with a fan); still under reduced motion
      faceArtG(B, A, fy, fy + UH, j, n, 9.5, 0); return; }   // (the picture is opaque: no fill under it)
    FQ(fy, fy + UH, F(PLAS[B.k === 'mach' ? 0 : 1]));
    const sec = Math.floor((j - B.b0) / (P * 2)), on = lit && H1(B.sd * 5.1 + fy * 3 + sec) < .75;
    if(B.up === 'sudare'){ FQ(fy + .06, fy + UH - .05, F(on ? '#c88a48' : '#4a3426')); if(fpx >= 5) for(let r = 0; r < (fpx >= 12 ? 6 : 3); r++){ const hh = fy + .08 + r * (UH - .13) / (fpx >= 12 ? 6 : 3); FQ(hh, hh + .008, F(on ? '#8a5228' : '#2e2018')); }
      if(on && fpx >= 3) FQ(fy + .06, fy + .09, F('#ffd08a'));
      FQ(fy, fy + .12, F(W0[1])); if(fpx >= 7){ const st = .6; for(let z = Math.ceil(Math.max(B.b0, j) / st) * st; z < j + n; z += st){ const t = (z - j) / n; FQ(fy, fy + .12, F(W0[0]), t, Math.min(1, t + .12 / n)); } } FQ(fy + .115, fy + .13, F(W0[2])); return; }   // the railing in front
    if(B.up === 'mushi'){ for(let q = Math.floor((j - B.b0) / P); ; q++){ const z0 = B.b0 + q * P + P * .2, z1 = B.b0 + q * P + P * .8; if(z0 >= j + n) break; const ta = Math.max(0, (z0 - j) / n), tb = Math.min(1, (z1 - j) / n); if(tb <= ta) continue;
        FQ(fy + .1, fy + .3, F(on ? '#8a6040' : '#1c1620'), ta, tb); if(fpx >= 4){ const k = fpx >= 10 ? 7 : 4; for(let s = 0; s < k; s++){ const a = ta + (tb - ta) * (s + .3) / k, b = ta + (tb - ta) * (s + .7) / k; FQ(fy + .1, fy + .3, F(PLAS[2]), a, b); } } }
      return; }
    FQ(fy + .08, fy + .32, F(on ? '#b07a44' : '#20161a')); if(fpx >= 4){ const st = .35; for(let z = Math.ceil(Math.max(B.b0, j) / st) * st; z < j + n; z += st){ const t = (z - j) / n; FQ(fy + .08, fy + .32, F(W0[1]), t, Math.min(1, t + .12 / n)); } } }

  /* A Shijō shop: three to five storeys of night-dark tile or concrete, lit floors, its shop at street level, the arcade over the pavement
     (a roof between the kerb and the face, lit from below, posts at the kerb), a small restrained signboard (Kyoto keeps signs small). */
  function shopB(B, j, n, fpx, wpx, hv, now){ const S = B.face, lit = B.lit;
    if(GA2.ready && B.fkey && .58 * Math.max(FU1, FU2) >= PX * 6 && !GX.includes('art')) interiorG(B, GA2.room[B.rk + (lit ? 1 : 0)], GA2.face[B.fkey], 0, .58, j, n, 9, fpx >= 14);
    else { FQ(0, .58, F(lit ? '#e8c890' : '#2a2026')); FQ(0, .06, F(STONE[0])); }
    if(fpx >= 4 && !GA2.ready){ for(let q = Math.floor((j - B.b0) / B.P); ; q++){ const z = B.b0 + q * B.P; if(z >= j + n) break; const t = (z - j) / n; if(t >= 0) FQ(0, .58, F('#1a1418'), t, Math.min(1, t + .1 / n)); if(lit && fpx >= 6){ const a = Math.max(0, t + .25 * B.P / n), b = Math.min(1, t + .6 * B.P / n); if(b > a) FQ(.08, .3, F(['#8a5a3a', '#4a5a7a', '#9a7a4a'][q % 3]), a, b); } } }
    FQ(.58, .74, F(S[0]));
    // the arcade: a roof over the pavement at .62, from the face out to the kerb; tubes underneath; a lit fascia
    SQ(0, .64, 1.08, .64, F('#1e1c24')); SQ(1.08, .64, 1.1, .74, F('#4a4650')); if(fpx >= 2) SQ(1.1, .72, 1.1, .74, F('#8a8690'));
    if(fpx >= 5){ for(let z = Math.ceil(j / 3) * 3; z < j + n; z += 3){ const t = (z - j) / n; SQ(.4, .64, .7, .64, L1('#fff0d0'), t, Math.min(1, t + .5 / n)); } }
    if(B.b0 % 8 < 8){ for(let z = Math.ceil(j / 8) * 8; z < j + n; z += 8){ const t = (z - j) / n; SQ(1.07, 0, 1.09, .64, F('#3a3842'), t, Math.min(1, t + .12 / n)); } }   // the arcade's posts at the kerb
    if(hv <= .74) return; FQ(.74, B.h, F(S[1])); const wt = GA2.ready && fpx >= 6 ? GA2.tex['shop' + (Math.floor(B.sd * 3) % 3)] : null;   // (near: the wall's tiles, rain-streaked, a floor at a time)
    for(let f = 0; f < B.nF; f++){ const fy = .74 + f * FH; if(fy > hv) break; const xtra = f >= B.nF0, st = H1(B.sd * 7.1 + f * 3.3 + Math.floor((j - B.b0) / 6)), on = lit && st < (xtra ? .4 : .55);
      if(wt && !xtra) faceArtG(B, wt, fy, Math.min(fy + FH, B.h), j, n, 6, 0);
      FQ(fy + .16, fy + .46, F(on ? (st < .25 ? '#e8c890' : '#b8c0d8') : '#161420')); if(xtra || fpx < 6) continue;
      for(let z = Math.ceil(Math.max(B.b0, j) / 3) * 3; z < j + n; z += 3){ const t = (z - j) / n; FQ(fy + .16, fy + .46, F(S[0]), t, Math.min(1, t + .2 / n)); }
      FQ(fy + .46, fy + .49, F(S[2])); }
    FQ(B.h - .05, B.h, F(S[2]));
    // a small vertical signboard by the corner: cream with a dark frame (Kyoto's restraint: no neon)
    if(B.sign){ const zc = B.b0 + 1.5; if(zc >= j && zc < j + n && CF(zc)){ const X = B.side * (B.x0 - .05) + laneDX(Math.floor(zc)), Xi = X - B.side * .16, u = CFU; CR(Math.min(X, Xi), Math.max(X, Xi), .82, 1.5, F('#2a1c14')); CR(Math.min(X, Xi) + .015, Math.max(X, Xi) - .015, .84, 1.48, L1('#f0e4c4'));
        if(u * .16 > PX * 6){ const w = WORDS[(B.n + 1) % WORDS.length], xm = CFX + (X + Xi) / 2 * u; for(let c = 0; c < Math.min(3, w.length); c++) glyph(w[c], xm, CFY - (1.4 - c * .2) * u, Math.min(u * .14, u * .19)); } } } }
  // the back row: one face of plain storeys with a few lit bands (on the lanes, a rooftop: a dark face and an eave)
  /* (Its value has to part from the ridge strip behind it: a warmer face than the hills, a pale tile edge along the top, and lit floors.) */
  function backB(B, j, n, fpx, hv){ fitB(B); const lane = B.sec !== 'shijo';
    if(lane && aspect() <= 1.05){ FQ(0, B.h, F('#1c1620')); FQ(B.h - .1, B.h, F(TILE)); FQ(B.h - .02, B.h, F(TEDGE)); return; }
    FQ(0, B.h, F(lane ? '#231c22' : '#1e1a26')); FQ(B.h - .08, B.h, F(lane ? TILE : '#2e2c3a')); FQ(B.h - .02, B.h, F(lane ? TEDGE : '#4a4858'));
    if(fpx < 1.2) return; const st = lane ? .44 : FH, sec = Math.floor((j - B.b0) / 5);
    for(let f = 1; f < B.nF + 1; f++){ const fy = .2 + f * st; if(fy > Math.min(hv, B.h - .2)) break; const v = H1(B.sd * 11.3 + f * 2.1 + sec * .7); if(v < .5) FQ(fy, fy + st * .36, F(v < .3 ? '#c89a60' : '#7a809c')); if(lane && fpx >= 3) FQ(fy - .04, fy, F(TEDGE)); } }

  /* The Minami-za (as the references: Jan 2020 and 2010): four storeys of grey-beige plaster with red-framed windows lit warm; a red railing
     with gold posts along the second-floor balcony; the karahafu (a curved, wave-shaped gable) over the middle of the third storey; the
     heavy eaves; the chidori gable with its red crest panel on top; at street level the long red-and-white striped banner with a painted
     board in its middle, and the two huge red chōchin at the corners. Generic text only (芝居, "a play"). */
  const MZP = ['#4a4848', '#7a766e', '#a8a294'];
  function theatre(B, j, n, fpx, wpx, hv, now){ const rel0 = j - B.b0, L = B.len;
    FQ(0, .06, F(STONE[0])); FQ(.06, .5, F('#2a1a14'));
    // the banner: red and white stripes, the painted board in the middle (gold frame, a green-and-red scene, dark lettering)
    for(let q = Math.floor(rel0 / 2); q * 2 < rel0 + n; q++){ const ta = Math.max(0, (B.b0 + q * 2 - j) / n), tb = Math.min(1, (B.b0 + q * 2 + 2 - j) / n); if(tb <= ta) continue; const mid = q * 2 >= L * .32 && q * 2 < L * .68;
      FQ(.5, .72, L1(mid ? '#e8b030' : (q & 1) ? '#f0e8dc' : '#d42a2a'), ta, tb); if(mid && fpx >= 3){ FQ(.53, .69, L1((q & 3) === 0 ? '#3a8a4a' : '#f4ecd8'), ta + (tb - ta) * .05, tb - (tb - ta) * .05); if(fpx >= 6 && (q & 1)) FQ(.57, .65, F('#1a1010'), ta + (tb - ta) * .3, tb - (tb - ta) * .3); } }
    FQ(.72, .76, F('#1a1418'));
    // the storeys
    const fs = [[.76, 1.3], [1.42, 1.94], [2.24, 2.72]];
    for(let f = 0; f < 3; f++){ const [h0, h1] = fs[f]; if(h0 > hv) break; FQ(h0, h1, F(MZP[1])); if(fpx < 2.5){ FQ(h0 + .15, h1 - .12, F('#a87850')); continue; }
      for(let q = Math.floor(rel0 / 6); q * 6 < rel0 + n; q++){ const z0 = B.b0 + q * 6 + 1.4, ta = Math.max(0, (z0 - j) / n), tb = Math.min(1, (z0 + 3.2 - j) / n); if(tb <= ta) continue;
        FQ(h0 + .12, h1 - .1, F('#7a1a14'), ta, tb); FQ(h0 + .15, h1 - .13, L1(H1(q * 3.1 + f) < .7 ? '#f0c880' : '#5a3a2a'), ta + (tb - ta) * .08, tb - (tb - ta) * .08); if(fpx >= 6){ const tm = (ta + tb) / 2; FQ(h0 + .15, h1 - .13, F('#7a1a14'), tm - .03 / n * 3, tm + .03 / n * 3); } }
      // the eave over the storey: a dark soffit, the tile front with a pale edge, gold ornament dots at the bracket heads
      SQ(0, h1, .2, h1 + .05, F('#241c1c')); SQ(.2, h1 + .05, .21, h1 + .12, F(TILE)); SQ(.21, h1 + .11, .21, h1 + .125, F(TEDGE));
      if(f === 0){ SQ(.1, h1 + .12, .12, h1 + .22, F('#9a1a16')); if(fpx >= 4) for(let z = Math.ceil(j / 3) * 3; z < j + n; z += 3){ const t = (z - j) / n; SQ(.11, h1 + .12, .12, h1 + .24, L1('#e8b84a'), t, Math.min(1, t + .14 / n)); } SQ(.1, h1 + .21, .12, h1 + .23, F('#c82a20')); } }   // the balcony railing, red with gold posts
    // the karahafu: a wave-shaped gable over the middle of the third storey (its curve sampled per slice: one quad per segment)
    const k0 = B.b0 + L * .3, k1 = B.b0 + L * .7, kh = q => { const u = (q - k0) / (k1 - k0); if(u <= 0 || u >= 1) return 0; return .34 * Math.sin(u * Math.PI) * (1 - .35 * Math.cos(u * Math.PI * 2)); };
    if(j + n > k0 && j < k1 && hv > 1.9){ const ta = Math.max(0, (k0 - j) / n), tb = Math.min(1, (k1 - j) / n), steps = Math.max(1, Math.round((tb - ta) * n));
      for(let s = 0; s < steps; s++){ const a = ta + (tb - ta) * s / steps, b = ta + (tb - ta) * (s + 1) / steps, ha = kh(j + a * n), hb = kh(j + b * n);
        FX1a(a, b, 1.98, ha, hb); } }
    // the top: the main eave, the roof, the chidori gable with the crest
    if(hv > 2.72){ SQ(0, 2.84, .3, 2.9, F('#241c1c')); SQ(.3, 2.9, .31, 2.98, F(TILE)); SQ(.31, 2.97, .31, 2.99, F(TEDGE)); FQ(2.99, 3.26, F('#151724'));
      const g0 = B.b0 + L * .38, g1 = B.b0 + L * .62; if(j + n > g0 && j < g1){ const ta = Math.max(0, (g0 - j) / n), tb = Math.min(1, (g1 - j) / n), gm = (g0 + g1) / 2;
        for(let s = 0; s < 6; s++){ const a = ta + (tb - ta) * s / 6, b = ta + (tb - ta) * (s + 1) / 6, za = j + a * n, zb = j + b * n, ha = 3.26 + .5 * (1 - Math.abs(za - gm) / (gm - g0)), hb = 3.26 + .5 * (1 - Math.abs(zb - gm) / (gm - g0));
          FQ2(a, b, 3.0, ha - .04, hb - .04, F(MZP[2])); FQ2(a, b, ha - .04, ha, hb, F(TEDGE)); }
        const cm = (gm - j) / n, cw = 1.4 / n; if(cm > 0 && cm < 1){ FQ(3.24, 3.5, F('#c8b070'), Math.max(0, cm - cw), Math.min(1, cm + cw)); FQ(3.27, 3.47, L1('#d42a2a'), Math.max(0, cm - cw * .8), Math.min(1, cm + cw * .8)); if(fpx >= 4) FQ(3.33, 3.41, L1('#f8f0e8'), Math.max(0, cm - cw * .35), Math.min(1, cm + cw * .35)); } } }
    // the two big lanterns at the corners (camera-facing), black lettering on red
    for(const zl of [B.b0 + 3, B.b0 + L - 3]) if(zl >= j && zl < j + n && CF(zl)){ const X = B.side * (B.x0 - .34) + laneDX(Math.floor(zl)), u = CFU, xc = CFX + X * u, yc = CFY - .44 * u, rx = .17 * u, ry = .24 * u;
      R(xc - rx * .55, yc - ry - .05 * u, rx * 1.1, .06 * u, F('#1a1212')); R(xc - rx * .55, yc + ry - .01 * u, rx * 1.1, .06 * u, F('#1a1212'));
      disc(xc, yc, rx, ry, L1('#c81e1e')); disc(xc - rx * .25, yc - ry * .1, rx * .55, ry * .8, L1('#e83a2a')); if(ry > PX * 8) for(let r = -3; r <= 3; r++) R(xc - rx * Math.sqrt(1 - (r / 4) ** 2), yc + r * ry / 4, rx * 2 * Math.sqrt(1 - (r / 4) ** 2), PX, F('#8a1212'));
      if(ry > PX * 10){ glyph('芝', xc, yc - ry * .38, ry * .7); glyph('居', xc, yc + ry * .38, ry * .7); } if(FF < .6) glow(xc, yc, Math.min(H * .1, rx * 2.2), '#ff5a2a', .22 * (1 - FF)); } }
  // the karahafu's slice: an arch of dark gable boarding with a gold rim, rising from the eave line h0 by ha..hb
  function FX1a(a, b, h0, ha, hb){ FQ2(a, b, h0, h0 + ha * .8, h0 + hb * .8, F('#3a2420')); FQ2(a, b, h0 + ha * .8, h0 + ha + .04, h0 + hb + .04, F(TILE)); FQ2(a, b, h0 + ha + .02, h0 + ha + .05, h0 + hb + .05, L1('#d8a840')); }
  // a face band whose top runs from ha (at a) to hb (at b), its bottom at h0 (or its own: FQ2(a, b, lo, ha, hb))
  function FQ2(a, b, h0, ha, hb, col){ const xa = FX1 + (FX2 - FX1) * a, xb = FX1 + (FX2 - FX1) * b, ya = FY1 + (FY2 - FY1) * a, yb = FY1 + (FY2 - FY1) * b, ua = FU1 + (FU2 - FU1) * a, ub = FU1 + (FU2 - FU1) * b;
    poly4(xa, ya - h0 * ua, xb, yb - h0 * ub, xb, yb - hb * ub, xa, ya - ha * ua, col); }

  // the end wall facing the camera at a run's start: the wall, and on the machiya the gable (tsuma) with its barge boards and pale tile edge
  function endWall(B, x, y, uw, now){ if(B.k === 'back' && aspect() <= 1.05 && B.sec !== 'shijo') return; const side = B.side, dx = side * B.depth * uw, xl = Math.min(x, x + dx), wd = Math.abs(dx); if(wd < 1 || !fin(xl + wd)) return; if(xl > W + PX || xl + wd < -PX) return;
    const h = B.h, mach = B.k === 'mach' || B.k === 'ochaya' || B.k === 'kawa';
    R(xl, y - uw * h, wd, uw * h, F(mach ? PLAS[0] : B.k === 'shop' ? B.face[0] : B.k === 'minamiza' ? MZP[0] : '#14121c'));
    if(mach){ R(xl, y - uw * G, wd, uw * G, F(B.bg[0])); if(B.lit && wd > PX * 4) R(xl + wd * .2, y - uw * .46, wd * .6, uw * .3, F(mix(GLOW[1], B.bg[1], .5)));
      if(GA2.ready && wd > PX * 6 && uw * (h - G) > PX * 6){ const A = GA2.tex.gable, Lv = A.L[wd / 32 < PX * .75 ? 1 : 0], a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .55); cx.drawImage(GAT, Lv.x, Lv.y, Lv.w, Lv.h, snp(xl), snp(y - uw * h), snp(wd), snp(uw * (h - G))); cx.globalAlpha = a0; }   // the plaster: grime, streaks, the half-timber
      const xr = x + dx * .5, yt = y - uw * (h + .34); poly4(x, y - uw * h, x + dx, y - uw * h, xr, yt, xr, yt, F(PLAS[1]));   // the gable
      pline(x - side * uw * .06, y - uw * (h - .02), xr, yt - PX, F(TEDGE), wd > PX * 30 ? 2 : 1); pline(xr, yt - PX, x + dx + side * uw * .06, y - uw * (h - .02), F(TEDGE), wd > PX * 30 ? 2 : 1); }
    if(B.k === 'shop' && wd > PX * 3) for(let f = 0; f < B.nF; f++){ const fy = .74 + f * FH; if(fy + .46 > h) break; if(H1(B.sd * 3.1 + f) < .4) R(xl + wd * .2, y - uw * (fy + .46), wd * .6, uw * .28, F(B.lit ? '#d8b880' : '#1c1a26')); } }

  // ---------------------------------------------------------------- lanterns
  /* A chōchin (camera-facing, at segment-float z, lateral X, height of its centre h, radius r in half-road widths). kind 0: white paper with
     a red band (a generic inn lantern); 1: Gion's red lantern with the white roundels (the dango ring motif, a district emblem, no name).
     Small: a lit dot. Near: the stepped body, the ribs, black caps top and bottom, a glow. */
  /* A hanging board (kanban) on its bracket beside the door, square to the street, so it faces you as you ride: a graphic mark of the
     trade (a fan, a cup, dango, a bowl, a wave, a gourd), never lettering; at a sake-serving house, a sugidama (a cedar ball). */
  function drawKan(sp, x, y, uw, fog, now){ const B = sp.b; if(!GA2.ready || !CF(B.kz)) return; FF = fog; const u = CFU; if(u < .4) return;
    const lx = laneDX(Math.floor(B.kz)), xw = CFX + (B.side * B.x0 + lx) * u, xo = CFX + (B.side * (B.x0 - .1) + lx) * u, yb = CFY - .5 * u;
    if(Math.max(xw, xo) < -PX * 8 || Math.min(xw, xo) > W + PX * 8 || !fin(xw + xo + yb)) return;
    const sugi = B.kan < 0, A = sugi ? GA2.sugi[B.sd < .5 ? 0 : 1] : GA2.kan[B.kan]; if(!A) return; pline(xw, yb, xo, yb, F('#1a1010'), u > 160 ? 2 : 1);   // the bracket
    const bw = (sugi ? .1 : .085) * u, bh = bw * A.h / A.w, top = yb + (sugi ? .006 : .012) * u; if(bh < PX * 3){ R(xo - PX / 2, yb, PX, PX * 2, F(A.avg)); return; }
    pline(xo, yb, xo, top, F('#2a1a10'), 1); const kv = bh / A.h, Lv = A.L[kv < PX * .375 ? 2 : kv < PX * .75 ? 1 : 0], a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .55);
    cx.drawImage(GAT, Lv.x, Lv.y, Lv.w, Lv.h, snp(xo - bw / 2), snp(top), snp(bw), snp(bh)); cx.globalAlpha = a0; }
  /* The chōchin near (ui/cycle.js, Mark Ferrari's colour cycling): each lantern is one 16 x 20 index map baked at warm-up; three rings of
     the paper's glow rotate through a ramp, so the candle inside seems to breathe, for one drawImage a lantern. Gion's red lantern carries the
     linked white roundels (the reference's dango mark); the inn lantern a generic ring crest over its red band. Steady under reduced motion. */
  const LCY = [null, null];
  function lanCycBuild(){ if(LCY[0] || !window.CYCLE) return; for(let kind = 0; kind < 2; kind++){ const w = 16, h = 20, idx = new Uint8Array(w * h);
      for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * w + x; if(y < 2 || y >= 18){ if(x >= 4 && x < 12) idx[i] = 1; continue; }
        const v = (y + .5 - 10) / 8, ww = 7.9 * Math.sqrt(Math.max(0, 1 - v * v)) + .4, dx = x + .5 - 8; if(Math.abs(dx) > ww) continue;
        const ring = Math.min(2, Math.floor(Math.hypot(dx / 8, v) * 3)); let sl = 3 + ring; if(y % 3 === 0) sl = 2; if(dx > ww - 1.3 || dx < -ww + .6) sl = 7; idx[i] = sl; }
      if(kind){ for(let y = 8; y <= 12; y++) for(let x = 1; x < 15; x++){ let dm = 9; for(const c of [3.5, 8, 12.5]) dm = Math.min(dm, Math.hypot(x + .5 - c, y + .5 - 10.5)); if(!idx[y * w + x]) continue; if(dm < 1.9 || (y >= 10 && y <= 10 && x > 3 && x < 12)) idx[y * w + x] = 6; else if(dm < 2.6) idx[y * w + x] = 8; } }
      else { for(let y = 13; y < 16; y++) for(let x = 0; x < w; x++) if(idx[y * w + x] > 1) idx[y * w + x] = 6; for(let y = 4; y < 11; y++) for(let x = 4; x < 12; x++){ const d = Math.hypot(x + .5 - 8, y + .5 - 7.5); if(Math.abs(d - 2.6) < .6 || d < .8) idx[y * w + x] = 8; } }
      const pal = kind ? ['#0000', '#141014', '#a01414', '#ff5a36', '#ee3a28', '#d8281e', '#fff4e8', '#8a1010', '#6a0c0c'] : ['#0000', '#141014', '#d8c098', '#fffae8', '#fff0d4', '#f4dcb0', '#d42a20', '#c8a878', '#2a1a14'];
      LCY[kind] = CYCLE.make({ w, h, idx, pal, ranges:[[3, 5]], ms:260, still:0 }); } }
  function lantern(z, X, h, r, kind, sd){ if(!CF(z)) return; const u = CFU, xc = CFX + X * u, yc = CFY - h * u, rx = r * u, ry = r * 1.25 * u; if(xc + rx < -PX || xc - rx > W + PX) return;
    const body = kind ? '#e02a24' : '#fff0d4', band = kind ? '#fff4e8' : '#d42a20';
    if(ry < PX * 1.6){ R(xc - PX / 2, yc - PX / 2, PX, PX, L1(body)); return; }
    { const C = LCY[kind ? 1 : 0]; if(ry > PX * 4 && C && !CYCLE.off){ const hh = ry * 2.5, a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .4); C.draw(cx, performance.now() + sd * 997, snp(xc - rx), snp(yc - hh / 2), snp(rx * 2), snp(hh)); cx.globalAlpha = a0;
        if(FF < .7) glow(xc, yc, Math.min(H * .06, Math.max(PX * 2, rx * 2.6)), kind ? '#ff6a3a' : LAMPW, .2 * (1 - FF)); return; } }
    R(xc - rx * .5, yc - ry - Math.max(PX, ry * .12), rx, Math.max(PX, ry * .14), F('#141014')); R(xc - rx * .5, yc + ry - PX * .5, rx, Math.max(PX, ry * .14), F('#141014'));
    disc(xc, yc, rx, ry, L1(body)); if(ry > PX * 3) disc(xc + rx * .2, yc + ry * .1, rx * .7, ry * .82, L1(kind ? '#b81a18' : '#f0d8b0'));
    if(ry > PX * 5) for(let q = -2; q <= 2; q++){ const v = q / 3, w = rx * Math.sqrt(1 - v * v); R(xc - w, yc + v * ry, w * 2, PX, L1(kind ? '#a01414' : '#e0c8a0')); }
    if(kind){ if(ry > PX * 4){ const n = 5; for(let q = 0; q < n; q++){ const a = q / n * Math.PI * 2, rr2 = Math.max(PX * .6, rx * .14); disc(xc + Math.cos(a) * rx * .38, yc + Math.sin(a) * ry * .34, rr2, rr2, L1(band)); } } else R(xc - rx * .4, yc - PX / 2, rx * .8, PX, L1(band)); }
    else { R(xc - rx, yc + ry * .45, rx * 2, Math.max(PX, ry * .18), L1(band)); if(ry > PX * 9) glyph(WORDS[Math.floor(sd * 4) % 3 + 7][0], xc, yc - ry * .15, ry * .7); }
    if(FF < .7) glow(xc, yc, Math.min(H * .06, Math.max(PX * 2, rx * 2.6)), kind ? '#ff6a3a' : LAMPW, .2 * (1 - FF)); }
  /* An andon on a red post (Hanami-kōji's kerbs): the post, the square paper lantern with a red frame, two characters top to bottom. */
  function drawAndon(sp, x, y, uw, fog, now){ if(uw < .3) return; FF = fog; const side = Math.sign(sp.x), pw = Math.max(PX, snp(uw * .035)), ht = .62, lw = uw * .16, lh = uw * .22, ly = y - uw * ht - lh;
    if(x + lw < -PX || x - lw > W + PX) return; R(x - pw / 2, y - uw * ht, pw, uw * ht, F('#9a1818')); if(pw > PX) R(side > 0 ? x - pw / 2 : x + pw / 2 - PX, y - uw * ht, PX, uw * ht, F('#d8402a'));
    R(x - lw / 2 - PX, ly - PX, lw + PX * 2, lh + PX * 2, F('#a01a16')); R(x - lw / 2, ly, lw, lh, L1('#fff0c8')); if(lw > PX * 6){ R(x - lw / 2, ly + lh * .48, lw, PX, F('#d8b890')); R(x - PX / 2, ly, PX, lh, F('#e8d0a0')); }
    R(x - lw / 2 - PX * 2, ly - PX * 2, lw + PX * 4, PX * 2, F('#2a1010'));
    if(lh > PX * 14){ const w = WORDS[sp.w % 3]; glyph(w[0], x - lw * .22, ly + lh * .28, lw * .42); glyph(w[1], x - lw * .22, ly + lh * .72, lw * .42); glyph(WORDS[1][sp.w & 1], x + lw * .22, ly + lh * .5, lw * .42); }
    if(fog < .8) glow(x, ly + lh / 2, Math.min(H * .08, Math.max(PX * 2, uw * .3)), LAMPW, .3 * (1 - fog)); }
  // a street lamp of the lanes: a square lantern on a dark wooden post with a small roof (Yasaka-dōri, Shirakawa)
  function drawLamp(sp, x, y, uw, fog, now){ if(uw < .3) return; FF = fog; const pw = Math.max(PX, snp(uw * .03)), top = y - uw * 1.02; if(x + uw * .2 < -PX || x - uw * .2 > W + PX) return;
    R(x - pw / 2, top, pw, y - top, F('#2a1e1a')); const lw = uw * .12, lh = uw * .16; R(x - lw / 2, top - lh, lw, lh, L1('#ffe0a0')); if(lw > PX * 5){ R(x - PX / 2, top - lh, PX, lh, F('#3a2a1a')); R(x - lw / 2, top - lh * .5, lw, PX, F('#3a2a1a')); }
    PP2(x, top - lh, uw); if(fog < .85) glow(x, top - lh / 2, Math.min(H * .08, Math.max(PX * 2, uw * .3)), LAMPW, .3 * (1 - fog)); }
  function PP2(x, y, uw){ const w = uw * .1; poly4(x - w, y, x + w, y, x + w * .3, y - uw * .05, x - w * .3, y - uw * .05, F('#1a1820')); }
  // Shijō's street lamp: a tall pole, a pair of globes (the suzuran style), warm white
  function drawSLamp(sp, x, y, uw, fog, now){ if(uw < .3) return; FF = fog; const side = Math.sign(sp.x), pw = Math.max(PX, snp(uw * .025)), top = y - uw * 1.5; if(x + uw * .3 < -PX || x - uw * .3 > W + PX) return;
    R(x - pw / 2, top, pw, y - top, F('#3a3a44')); for(const d of [-.12, .12]){ const gx = x + d * uw; R(Math.min(x, gx), top, Math.abs(gx - x), Math.max(PX, uw * .015), F('#3a3a44')); disc(gx, top + uw * .05, uw * .035, uw * .045, L1('#fff4dc')); }
    if(fog < .85) glow(x, top + uw * .05, Math.min(H * .08, Math.max(PX * 2, uw * .32)), LAMPW, .3 * (1 - fog)); }

  // ---------------------------------------------------------------- poles and wires (fewer than Akihabara: Gion buried some)
  function drawPole(sp, x, y, uw, fog, now){ if(uw < .3) return; FF = fog; const side = Math.sign(sp.x), w = Math.max(PX, snp(uw * .045)), top = y - uw * 1.9; if(x + w < -PX * 4 || x - w > W + PX * 4) return;
    R(x - w / 2, top, w, y - top, F('#4a4650')); if(w >= PX * 3){ R(side > 0 ? x - w / 2 : x + w / 2 - snp(w * .35), top, snp(w * .35), y - top, F('#24222c')); R(side > 0 ? x + w / 2 - PX : x - w / 2, top, PX, y - top, F('#7a7680')); }
    R(x - uw * .26, y - uw * 1.7, uw * .52, Math.max(PX, snp(uw * .02)), F('#2e2a34')); }
  const PSPAN = 40, WIRE = [[1.22, 1.62, .16, '#0e0c14'], [1.3, 1.52, .12, '#121018']];
  function drawWire(sp, x, y, uw, fog, now){ if(fog > .5) return; const s = segs[sp.k]; if(!s) return; const a = s.p1.screen; if(!a.w) return; const side = sp.side, lx = sp.x - side * 1.3;
    const ph = ((sp.k - 10) % PSPAN + PSPAN) % PSPAN, st = a.w > 60 ? 1 : a.w > 18 ? 2 : a.w > 7 ? 4 : 8; if(ph % st) return; const e = segs[sp.k + st - 1]; if(!e || !e.p2.screen.w) return; const b = e.p2.screen;
    const t0 = ph / PSPAN, t1 = (ph + st) / PSPAN, a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .8);
    for(let q = 0; q < (a.w > 20 ? 2 : 1); q++){ const w = WIRE[q], X = side * w[0] + lx, h0 = w[1] - w[2] * 4 * t0 * (1 - t0), h1 = w[1] - w[2] * 4 * t1 * (1 - t1); pline(a.x + X * a.w, a.y - h0 * a.w, b.x + X * b.w, b.y - h1 * b.w, w[3], 1); }
    cx.globalAlpha = a0; }

  // ---------------------------------------------------------------- people in yukata and kimono (camera-facing, two-frame step, fading near)
  const PEOPLE = [], PV = [['#1c2a52', '#e8e4dc', '#c8a040'], ['#e8dcd0', '#3a4a8a', '#a02a2a'], ['#2a2028', '#4a3a48', '#c8b080'], ['#c84a5a', '#f0c0c8', '#2a1a3a'], ['#3a5a4a', '#d8e0d0', '#e8c060'], ['#2a2a36', '#3a3a48', '#5a4a3a']];
  function buildPeople(){ PEOPLE.length = 0; for(let v = 0; v < PV.length; v++) for(let fr = 0; fr < 2; fr++){ const c = mk(9, 26), k = c.getContext('2d'), [d, m, o] = PV[v], set = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); };
      const man = v === 2 || v === 5; set(3, 0, 3, 2, '#141018'); if(!man){ set(2, 0, 5, 2, '#141018'); set(6, 1, 1, 1, '#c8a040'); } set(3, 2, 3, 3, '#e0b498'); set(5, 2, 1, 3, '#b88a70');   // hair (put up, a comb), the face lit on one side
      set(2, 5, 5, 15, d); set(2, 5, 1, 15, mix(d, '#ffffff', .25)); if(v === 0 || v === 1 || v === 4) for(let q = 0; q < 4; q++) set(3 + (q & 1) * 2, 8 + q * 3, 1, 1, m);   // the robe, its lit edge, a print
      set(2, 10, 5, 2, o); if(!man) set(4, 12, 2, 1, mix(o, '#000000', .3));   // the obi
      set(1, 6, 1, 6, d); set(7, 6, 1, 6, d); set(1, 12, 1, 1, '#e0b498'); set(7, 12, 1, 1, '#e0b498');
      if(v === 3){ set(7, 3, 1, 9, '#2a1a10'); set(5, 1, 4, 2, '#d84a3a'); }   // a paper umbrella, closed over the shoulder
      const lg = fr ? [[3, 20, 1, 4], [5, 20, 1, 3]] : [[3, 20, 1, 3], [5, 20, 1, 4]]; for(const g of lg) set(g[0], g[1], g[2], g[3], '#e8e0d8'); set(2, 24, 2, 2, '#3a2a1a'); set(5, 24, 2, 2, '#3a2a1a');   // tabi and geta
      PEOPLE.push(c); } }
  function drawPed(sp, x, y, uw, fog, now){ const c = PEOPLE[(sp.v * 2 + (sp.w && !reduce ? Math.floor(now / 420 + sp.k) & 1 : 0)) % PEOPLE.length]; if(!c) return; const k = uw * .29 / 26; if(k * 26 < PX * 2) return; const al = scaleFade(k, 6, 10); if(al <= 0) return;
    const a0 = cx.globalAlpha; cx.globalAlpha = a0 * al * (1 - fog * .7); blit(c, x, y, k); cx.globalAlpha = a0; }

  /* ---------------------------------------------------------------- a jinrikisha parked at the kerb
     Projected geometry, drawn from the nearest segment of its length still in front of the camera: two big wheels (rims as rings of
     quads, spokes), the black hood folded up, the red seat and blanket, the shafts resting on the ground ahead. */
  function drawRick(sp, x, y, uw, fog, now){ const k = sp.k; if(k > sp.a){ const p = segs[k - 1]; if(p && p.p1.camera.z > DEPTH) return; } cam(); FF = fog; const side = sp.side, z0 = sp.a + 1, X = side * 1.24, zc = z0 + 2.2, rr = .16;
    if(zc + 6 < camSeg()) return; const xi = X - side * .1, xo = X + side * .1;
    // the shafts: two long thin quads from the body forward to the ground
    for(const dx of [-.08, .08]) wq(zc + .4, X + dx, .2, zc + 6.5, X + dx, .02, zc + 6.5, X + dx, .035, zc + .4, X + dx, .23, F('#2a1a12'));
    // the far wheel, the body, the near wheel (the near one toward the road)
    for(const wx of [xo, null, xi]){ if(wx === null){ wq(zc - 1.2, xi, .2, zc + 1.2, xi, .2, zc + 1.2, xi, .34, zc - 1.2, xi, .34, F('#120e10')); wq(zc - 1.2, xi, .34, zc + .6, xi, .34, zc + .6, xo, .34, zc - 1.2, xo, .34, F('#b81c1c'));
        wq(zc - 1.4, xi, .34, zc - .2, xi, .34, zc - .9, xi, .62, zc - 1.6, xi, .58, F('#0e0c10')); wq(zc - 1.4, xi, .34, zc - 1.6, xi, .58, zc - 1.6, xo, .58, zc - 1.4, xo, .34, F('#1a161c')); wq(zc - .9, xi, .61, zc - 1.6, xi, .585, zc - 1.6, xo, .585, zc - .9, xo, .61, F('#3a3440'));   // the hood: side, back, its lit top
        wq(zc - .4, xi - side * .005, .22, zc + .5, xi - side * .005, .22, zc + .5, xi - side * .005, .32, zc - .4, xi - side * .005, .32, F('#e02a2a')); continue; }   // the blanket over the side
      const N = 12; for(let q = 0; q < N; q++){ const a = q / N * Math.PI * 2, b = (q + 1) / N * Math.PI * 2; wq(zc + Math.cos(a) * rr * ZU, wx, rr + Math.sin(a) * rr, zc + Math.cos(b) * rr * ZU, wx, rr + Math.sin(b) * rr, zc + Math.cos(b) * rr * .82 * ZU, wx, rr + Math.sin(b) * rr * .82, zc + Math.cos(a) * rr * .82 * ZU, wx, rr + Math.sin(a) * rr * .82, F(q < 6 ? '#2a1c14' : '#4a3424')); }
      PJ(zc, wx, rr); const hx = PJX, hy = PJY, hu = PJU; if(hu * rr > PX * 6) for(let q = 0; q < 6; q++){ const a = q / 6 * Math.PI; PJ(zc + Math.cos(a) * rr * .8 * ZU, wx, rr + Math.sin(a) * rr * .8); const ax = PJX, ay = PJY; PJ(zc - Math.cos(a) * rr * .8 * ZU, wx, rr - Math.sin(a) * rr * .8); pline(ax, ay, PJX, PJY, F('#3a2a1e'), 1); } } }

  // ---------------------------------------------------------------- the Shirakawa: willows, the canal, the bridge, the little shrine
  /* A willow on the canal's near bank (camera-facing): a dark trunk leaning out over the water, a crown of hanging strands in three greens
     (each strand a stepped line from the crown's arc down toward the water, swaying a little; steady under reduced motion), lit warm on
     the side toward the street lamps. Far: one soft mass. */
  function drawWillow(sp, x, y, uw, fog, now){ if(uw < .25) return; FF = fog; const sd = sp.k * .37, cxw = x - .42 * uw, top = 1.3;
    if(cxw + uw * 1.1 < -PX || cxw - uw * 1.1 > W + PX) return; const a0 = cx.globalAlpha, al = scaleFade(uw * .03, 12, 22); if(al <= .01) return; cx.globalAlpha = a0 * al;
    // the trunk: from the bank, leaning out over the water, forking under the crown
    const tw = Math.max(1, Math.round(uw * .035 / PX)); pline(x, y, x - .18 * uw, y - .55 * uw, F('#1a1410'), tw); pline(x - .18 * uw, y - .55 * uw, cxw + .1 * uw, y - 1.05 * uw, F('#1a1410'), Math.max(1, tw - 1)); pline(x - .18 * uw, y - .55 * uw, cxw - .25 * uw, y - .98 * uw, F('#1a1410'), Math.max(1, tw - 1));
    if(tw > 1) pline(x + PX, y, x - .18 * uw + PX, y - .55 * uw, F('#3a2e24'), 1);
    // the crown's mass: a dark dome, then the hanging curtain as strands of irregular length (the hem ragged, never a ruler), three greens;
    // the strands on the street side catch the lamps. Far: the dome and a few long strands only.
    disc(cxw, y - uw * (top - .02), uw * .58, uw * .2, F('#0c1812')); disc(cxw - uw * .1, y - uw * (top - .14), uw * .5, uw * .16, F('#0e1c14'));
    const N = uw > 50 ? 46 : uw > 16 ? 24 : 10, sw = reduce ? 0 : Math.sin(now / 1600 + sd) * .025, lw = uw > 90 ? 2 : 1;
    for(let q = 0; q < N; q++){ const r = H1(sd + q * 1.37), u = (q + r * .8) / N * 2 - 1, X0 = u * .6, h0 = top - .02 + .1 * (1 - u * u) - r * .06, len = .35 + H1(sd + q * 2.9) * .6 + .45 * (1 - Math.abs(u)), sway = sw * (1 + r), X1 = X0 + sway * len * 2 + u * .06;
      const lit = u > .35 && H1(sd + q * 5.3) < .3, col = lit ? (r < .5 ? '#5a6a3a' : '#40502e') : r < .33 ? '#0e1e18' : r < .66 ? '#14261e' : '#1a3024';
      const xm = cxw + (X0 + (X1 - X0) * .5 + sway * .2) * uw, ym = y - uw * (h0 - len * .5);
      pline(cxw + X0 * uw, y - uw * h0, xm, ym, F(col), lw); pline(xm, ym, cxw + X1 * uw, y - uw * (h0 - len), F(col), lw); }
    cx.globalAlpha = a0; }
  /* The canal is painted in roadFX (the water below the road, its far wall and bank) since it runs along the road. The bridge: Tatsumi-bashi,
     a short flat span from the near bank to the far one at road level, with a pale railing (posts and two rails) on both edges. */
  function drawBridge(sp, x, y, uw, fog, now){ const L = sp.L, k = sp.k; if(k > L.TB){ const p = segs[k - 1]; if(p && p.p1.camera.z > DEPTH) return; } cam(); FF = fog; const z0 = L.TB, z1 = L.TB + 3.2, Xa = -1.08, Xb = -3.0;
    wq(z0, Xa, .02, z0, Xb, .02, z0, Xb, -.06, z0, Xa, -.06, F('#5a5048')); wq(z0, Xa, .02, z1, Xa, .02, z1, Xb, .02, z0, Xb, .02, F('#6a6058'));   // the deck's front edge; its top
    for(const zz of [z1 - .05, z0 + .05]){ wq(zz, Xa, .2, zz, Xb, .2, zz, Xb, .17, zz, Xa, .17, L1('#d8c8a8')); wq(zz, Xa, .1, zz, Xb, .1, zz, Xb, .085, zz, Xa, .085, F('#a89878'));
      for(let q = 0; q <= 5; q++){ const X = Xa + (Xb - Xa) * q / 5; wq(zz - .04, X + .02, .02, zz + .04, X + .02, .02, zz + .04, X + .02, .23, zz - .04, X + .02, .23, F(q === 0 ? '#e8dcc0' : '#b8a888')); } } }
  // the Tatsumi Daimyōjin: a tiny shrine at the bridge's end, a vermilion fence, two paper lanterns, its little roof (camera-facing)
  function drawShrine(sp, x, y, uw, fog, now){ if(uw < .4) return; FF = fog; const s = uw; if(x - s * .7 > W + PX || x + s * .7 < -PX) return;
    R(x - s * .42, y - s * .5, s * .84, s * .38, F('#2a1c18')); R(x - s * .3, y - s * .46, s * .6, s * .3, L1('#c8784a'));   // the hall, its lit doors
    poly4(x - s * .56, y - s * .5, x + s * .56, y - s * .5, x + s * .38, y - s * .66, x - s * .38, y - s * .66, F('#2a3a3a')); R(x - s * .56, y - s * .51, s * 1.12, PX, F('#8a9a9a'));
    R(x - s * .6, y - s * .22, s * 1.2, s * .03, F(VERM[1])); R(x - s * .6, y - s * .12, s * 1.2, s * .02, F(VERM[1])); for(let q = 0; q <= 8; q++) R(x - s * .6 + q * s * .15 - PX / 2, y - s * .25, Math.max(PX, s * .02), s * .25, F(VERM[2]));
    for(const d of [-.5, .5]){ const lx = x + d * s; R(lx - PX / 2, y - s * .62, PX, s * .08, F('#1a1212')); disc(lx, y - s * .5, s * .05, s * .07, L1('#fff0d4')); R(lx - s * .05, y - s * .47, s * .1, Math.max(PX, s * .015), L1('#d42a20')); if(fog < .7) glow(lx, y - s * .5, Math.max(PX * 2, s * .2), LAMPW, .25); } }

  // ---------------------------------------------------------------- the heroes: the Nishirōmon and the Yasaka pagoda
  /* Each is drawn by the same function at any distance: in the far land (backdrop) while it is beyond the props' reach, and as a prop of its
     own segment once it is inside it (DRAW - 40), so it is fixed in the world, visible from the start of the visit, and never pops. */
  const HFOG = d => Math.min(.72, Math.pow(clamp(d / DRAW, 0, 3), 1.6) * .6);
  /* The Nishirōmon (camera-facing): the forest behind; broad stone steps across its width; the lower storey of three bays (the open
     passage with a hanging lantern, the side bays with green slatted fences where the guardians sit, white plaster above), vermilion
     pillars and beams; the dense bracket band; the lower roof with its pale edge tiles; the balcony; the upper storey with green lattice
     windows; the brackets; the hip-and-gable roof, its corners lifted; the wings; stone lanterns; a row of paper lanterns under the eave. */
  const GS = 1.7;   // (round 2: the gate drawn 1.7x: at the end of Shijō it must loom as the street's focal point; the real gate on its steps fills more of the eye than its metres say)
  // (the Nishirōmon: gate() and gate3(), with the art module above: world geometry since round 3)
  /* The Yasaka pagoda (round 2, rebuilt to the night photographs): five tiers on a stone base. Half-road widths of about 5.8 m: the base
     1.1 wide, the top of the finial near 7 high. What makes it read at every distance:
     - the roofs dark (grey-blue tile) against the sky, thick at the edge, their eaves curving up into lifted corners (the curve sampled in
       six steps a side), the hips pale where the moon catches them; the roof's top slope is drawn only when the eye is above its plane
       (from far, nearly level: the dark mass of each roof; from below up close: hidden, as it is);
     - the eave undersides lit warm by the floodlights: rafter strips, a hot bracket band against the wall;
     - the bodies: white plaster panels glowing warm between dark timber posts and beams, the middle bay a dark door with a lit frame;
     - the bronze sōrin: the base box, the bowl, nine rings, the openwork flame, the jewel.
     Drawn from the top tier down, so each roof covers the foot of the body above it as you look up. */
  // a stretch of eave tile ends between two projected points (a strip of the eave texture, h half-road widths tall)
  function eaveTiles(p0, p1, h, cs, q){ if(Math.min(p0[0], p1[0]) < cs + ZNEAR) return; PJ(p0[0], p0[1], p0[2]); const xa = PJX, ya = PJY, ua = PJU; PJ(p1[0], p1[1], p1[2]); const xb = PJX, yb = PJY, ub = PJU;
    const xl = snp(Math.min(xa, xb)), xr = snp(Math.max(xa, xb)), yt = snp((ya + yb) / 2 - h * (ua + ub) / 2), yB = snp((ya + yb) / 2); if(!fin(xl + xr + yt + yB) || xr - xl < 1 || yB - yt < PX * 2 || xr < 0 || xl > W) return;
    const A = GA2.tex.eave, Lv = A.L[0], u0 = (q % 3) / 3; cx.drawImage(GAT, Lv.x + u0 * Lv.w, Lv.y, Lv.w / 3, Lv.h, xl, yt, xr - xl, yB - yt); }
  // a wind bell (fūtaku) hanging from a lifted corner, swaying a little (still under reduced motion)
  function bell(c, cs){ PJ(c[0], c[1], c[2]); const u = PJU, bw = u * .045, bh = bw * 9 / 5; if(bh < PX * 3 || !fin(PJX + PJY)) return; const A = GA2.ready && GA2.gate.pBell; if(!A) return;
    const sw = reduce ? 0 : Math.round(Math.sin(performance.now() / 700 + c[1] * 3) * bw * .25 / PX) * PX, Lv = A.L[bh / 9 < PX * .75 ? 1 : 0]; cx.drawImage(GAT, Lv.x, Lv.y, Lv.w, Lv.h, snp(PJX - bw / 2) + sw, snp(PJY), snp(bw), snp(bh)); }
  const ZU = 10;   // depth offsets are in half-road widths; z is in segments (ROADW / SEG = 10)
  const PT = (() => { const T = []; let hb = .3; for(let k = 0; k < 5; k++){ const a = .53 - .03 * k, bh = .5 - .02 * k, he = hb + bh + .1, r = 1.18 - .06 * k; T.push({ hb, a, bh, he, r }); hb = he + .3; } return T; })();
  const RT = 6;   // steps of the eave's curve per half side
  const RF = new Float64Array(RT * 2 + 1);   // the eave's lift along a side, u in -1..1
  function pagoda(z, X0, fog, hy){ if(HL) drfOn(HL, 'p', z); try{ pagodaB(z, X0, fog, hy); } finally { DRF = null; } }
  function pagodaB(z, X0, fog, hy){ cam(); FF = fog; PJ(z, X0, 0); if(!fin(PJX) || PJX < -PJU * 2.5 || PJX > W + PJU * 2.5) return; const cs = camSeg(); if(z + 1.3 * ZU < cs + ZNEAR) return;   // (round 3: only once wholly behind; wq clips the rest at the near plane)
    const T = PT, top = T[4].he + .55, fine = PJU >= PX * 10, small = PJU < PX * 2.5, front = cs < z - (.6) * ZU, side = X0 < -.6 ? 1 : X0 > .6 ? -1 : 0;
    // the eye's height above the pagoda's ground, and its lateral (both in half-road widths): to decide which roof slopes face it
    let n = z - BI; if(n < 0) n = 0; if(n > NX - 1) n = NX - 1; const gi = n | 0, gy = YA[gi] + (YA[gi + 1] - YA[gi]) * (n - gi), eyeH = (CAMY - gy) / ROADW, dz = (z - cs) / ZU, eyeX = playerX;
    for(let q = 0; q <= RT * 2; q++){ const u = q / RT - 1; RF[q] = u * u * u * u; }
    const ZF = d => z + d * ZU;
    // the finial
    if(z > cs + ZNEAR + .3){ PJ(z, X0, top); const bx = PJX, by = PJY, u = PJU;
      if(small){ R(bx - PX / 2, by - u * 1.7, PX, u * 1.7, F('#5a3e20')); }
      else { R(bx - u * .1, by - u * .12, u * .2, u * .12, F('#3a2a1c')); R(bx - u * .1, by - u * .12, u * .2, Math.max(PX, u * .025), L1('#a8783a'));   // the base box
        disc(bx, by - u * .17, u * .09, u * .05, F('#4a3420')); R(bx - u * .022, by - u * 1.72, u * .044, u * 1.58, F('#4a3420')); R(bx - u * .022, by - u * 1.72, Math.max(PX, u * .014), u * 1.58, L1('#c89048'));   // the bowl; the mast, lit on one side
        for(let q = 0; q < 9; q++){ const yy = by - u * (.3 + q * .105), rw = u * (.12 - q * .004); R(bx - rw, yy, rw * 2, Math.max(PX, u * .028), F(q % 3 === 1 ? '#2e3a30' : '#3a2a1a')); R(bx - rw, yy, rw * 2, Math.max(PX, u * .01), L1(q & 1 ? '#d8a050' : '#b8843c')); if(fine) R(bx + rw * .5, yy + u * .012, rw * .4, Math.max(PX, u * .014), F('#4a7a6a')); }   // the nine rings, each with a lit top edge, verdigris in the shade
        if(fine && GA2.ready){ const A = GA2.gate.pSuien, sw = u * .34, Lv = A.L[sw / 12 < PX * .75 ? 1 : 0]; cx.drawImage(GAT, Lv.x, Lv.y, Lv.w, Lv.h, snp(bx - sw / 2), snp(by - u * 1.62), snp(sw), snp(sw)); }   // the water-flame (suien), openwork bronze
        disc(bx, by - u * 1.76, u * .04, u * .05, L1('#e8c070')); } }
    // one roof: the eave over a body (half a, top hb + bh) at he, eave half-size r, rising to the next body (half a1 at h hi). sd: 0 front, 1 side
    const TH = .14, LIFT = .2;
    function roofSide(t, a1, hi, sd){ const r = t.r, he = t.he, hw = t.hb + t.bh, a = t.a;
      const P = (u, d, h) => sd ? [ZF(u * d), X0 + side * d, h] : [ZF(-d), X0 + u * d, h];   // a point at fraction u along the side, distance d out from the centre
      const Q4 = (p1, p2, p3, p4, col) => wq(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], p4[0], p4[1], p4[2], col);
      // the top slope: only when the eye is above its plane (its height at the eye: the plane through the eave's top edge and the next body's foot)
      const dEye = sd ? (eyeX - X0) * side : dz, hAt = he + TH + (hi - he - TH) * (dEye - r) / (a1 - r), up = eyeH > hAt;
      if(up) for(let q = 0; q < RT * 2; q++){ const u0 = q / RT - 1, u1 = (q + 1) / RT - 1; Q4(P(u0, r, he + TH + LIFT * RF[q]), P(u1, r, he + TH + LIFT * RF[q + 1]), P(u1, a1, hi), P(u0, a1, hi), F(q & 1 ? '#1c1e2a' : '#20222e')); }
      // the underside: rafter strips lit warm, the hot bracket band against the wall (it rises outward to the eave, so from the street it always faces you)
      { for(let q = 0; q < RT * 2; q++){ const u0 = q / RT - 1, u1 = (q + 1) / RT - 1; Q4(P(u0, r, he + LIFT * RF[q]), P(u1, r, he + LIFT * RF[q + 1]), P(u1, a, hw + .02), P(u0, a, hw + .02), L1(fine ? (q & 1 ? '#6a3416' : '#82401c') : '#74391a')); }
        if(!small){ Q4(P(-1, a + .07, hw + .03), P(1, a + .07, hw + .03), P(1, a, hw + .02), P(-1, a, hw + .02), L1('#ffb860')); Q4(P(-1, a + .16, hw + .055), P(1, a + .16, hw + .055), P(1, a + .09, hw + .035), P(-1, a + .09, hw + .035), L1('#e0903a'));
          if(fine && GA2.ready){ const A = GA2.gate.pBrk, ab = a + .015; if(sd) gPicS(A, X0 + side * ab, ZF(-ab), ZF(ab), hw - .07, hw + .03, cs, false); else gPicF(A, ZF(-ab), X0 - ab, X0 + ab, hw - .07, hw + .03, cs); } } }   // the bracket sets (tokyō), floodlit from below
      // the eave's edge: a thick dark tile band following the curve, its lower lip catching the floodlight, the corners lifting
      for(let q = 0; q < RT * 2; q++){ const u0 = q / RT - 1, u1 = (q + 1) / RT - 1, h0 = he + LIFT * RF[q], h1 = he + LIFT * RF[q + 1];
        Q4(P(u0, r, h0), P(u1, r, h1), P(u1, r, h1 + TH), P(u0, r, h0 + TH), F('#262836')); if(!small) Q4(P(u0, r, h0), P(u1, r, h1), P(u1, r, h1 + .025), P(u0, r, h0 + .025), L1('#d88a3c')); if(fine) Q4(P(u0, r, h0 + TH - .015), P(u1, r, h1 + TH - .015), P(u1, r, h1 + TH), P(u0, r, h0 + TH), F('#5a5e70'));
        if(fine && GA2.ready) eaveTiles(P(u0, r, h0 + .03), P(u1, r, h1 + .03), TH - .045, cs, q); }   // (the round ends of the cover tiles along the eave)
      if(!small) for(const u of [-1, 1]){ const c = P(u, r, he + LIFT); if(c[0] > cs + ZNEAR) bell(c, cs); }   // the wind bells at the corners
      // the hips: a pale moonlit line from each lifted corner up to the next body (drawn only where the slope shows)
      if(up && !small) for(const u of [-1, 1]){ const c0 = P(u, r, he + TH + LIFT), c1 = P(u, a1, hi); PJ(c0[0], c0[1], c0[2]); const x0 = PJX, y0 = PJY; PJ(c1[0], c1[1], c1[2]); if(c0[0] > cs + ZNEAR && c1[0] > cs + ZNEAR){ pline(x0, y0, PJX, PJY, F('#3a3e4e'), PJU > 30 ? 3 : 2); pline(x0, y0 - PX, PJX, PJY - PX, F('#7a8098'), 1); } } }   // the hips: a ridge of caps, moonlit on top
    // one body: dark timber frame, white plaster panels glowing warm, the middle bay's door
    function bodySide(t, sd){ const a = t.a, hb = t.hb, h1 = t.hb + t.bh, P = (u, h) => sd ? [ZF(u * a), X0 + side * a, h] : [ZF(-a), X0 + u * a, h];
      const Q4 = (p1, p2, p3, p4, col) => wq(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], p4[0], p4[1], p4[2], col), B = (u0, u1, h0, hh, col) => Q4(P(u0, h0), P(u1, h0), P(u1, hh), P(u0, hh), col);
      if(small){ B(-1, 1, hb, h1, L1(sd ? '#9a7a5a' : '#c8a070')); return; }
      if(GA2.ready && !GX.includes('art')){ const A = GA2.gate.pBody; if(sd) gPicS(A, X0 + side * a, ZF(-a), ZF(a), hb, h1, cs, side < 0); else gPicF(A, ZF(-a), X0 - a, X0 + a, hb, h1, cs); return; }   // (round 3: timber grain, floodlit plaster, the studded door)
      B(-1, 1, hb, h1, F('#2a1810'));   // the timber frame
      for(const [u0, u1] of [[-.92, -.4], [.4, .92]]) B(u0, u1, hb + .08, h1 - .08, L1(sd ? '#b89870' : '#ecd0a0'));   // the plaster panels
      B(-.3, .3, hb + .04, h1 - .06, F('#3a1a10')); if(fine){ B(-.3, .3, h1 - .09, h1 - .06, L1('#d89048')); B(-.02, .02, hb + .04, h1 - .09, F('#1a0c08')); for(const u of [-.22, .22]) B(u - .01, u + .01, hb + .1, h1 - .14, L1('#c07a3a')); }   // the door: a lit head, the leaves' seam, the studs' lit line
      if(fine) for(const h of [hb + .08, h1 - .08]) B(-1, 1, h - .012, h + .012, F('#1a0e08')); }   // the beams
    for(let k = 4; k >= 0; k--){ const t = T[k], nx = T[k + 1], a1 = nx ? nx.a + .03 : .04, hi = nx ? nx.hb : top + .02;
      if(side) roofSide(t, a1, hi, 1); if(front) roofSide(t, a1, hi, 0);
      if(side) bodySide(t, 1); if(front) bodySide(t, 0); }
    // the stone base and the compound wall between it and the road (night plaster, a tile cap)
    if(front) wq(ZF(-.8), X0 - .8, 0, ZF(-.8), X0 + .8, 0, ZF(-.8), X0 + .8, .3, ZF(-.8), X0 - .8, .3, F('#6a6058'));
    if(side) wq(ZF(-.8), X0 + side * .8, 0, ZF(.8), X0 + side * .8, 0, ZF(.8), X0 + side * .8, .3, ZF(-.8), X0 + side * .8, .3, F('#4e4640'));
    wq(ZF(-2.4), X0 + 1.3, 0, ZF(1.6), X0 + 1.3, 0, ZF(1.6), X0 + 1.3, .3, ZF(-2.4), X0 + 1.3, .3, F('#4a4650')); wq(ZF(-2.4), X0 + 1.3, .3, ZF(1.6), X0 + 1.3, .3, ZF(1.6), X0 + 1.24, .36, ZF(-2.4), X0 + 1.24, .36, F(TILE));
    if(fog < .8 && !small && ZF(-.6) > cs + ZNEAR){ PJ(ZF(-.6), X0, 1.4); glow(PJX, PJY, Math.min(H * .2, PJU * 1.6), '#ff9a3a', .08 * (1 - fog)); } }
  function heroes(L, far, fogAt){ cam(); const cs = camSeg();
    for(const hz of [[L.ZG, 'g'], [L.ZP, 'p']]){ const d = hz[0] - cs; if(d < -2) continue; const isFar = d > DRAW - 40; if(isFar !== far) continue; if(d > NX - 2) continue;
      const fog = HFOG(d); HL = L; if(hz[1] === 'g') gate(hz[0], L.XG, fog); else pagoda(hz[0], L.XP, fog, 0); } }

  /* ---------------------------------------------------------------- the set piece's float and its lanterns
     A naginata-boko style float (side view, camera-facing): four great wooden wheels (two seen), the platform, the body hung with red and gold
     tapestries, the musicians' deck with its black-and-gold balustrade and the players, the gabled roof, the shingi pole wrapped in red with
     a pine sprig, and at Yoiyama its lanterns: rows of komagata chōchin on bars down both sides of the pole, a lit triangle. The pullers
     lead it with ropes. It moves along X across the junction (driven by the rider's distance). */
  function floatDraw(L, fog, now){ const z = L.JX + CW * .5, X = SPA.fx; if(!plane(z, X)) return; FF = fog; OU *= 1.35; const u = OU, dir = -1;   // (drawn at 1.35: a naginata-boko's body stands about 8 m, its pole 25 m)
    if(OX + 2.5 * u < -PX || OX - 2.5 * u > W + PX) return; const lod = u * .05 > PX;
    // the ropes and pullers ahead of it
    if(lod){ const ra = dir * .55, rb = dir * 2.4; PP(ra, .3, rb, .18, rb, .2, ra, .32, F('#e8dcc0')); for(let q = 0; q < 8; q++){ const px = ra + (rb - ra) * (q + .5) / 8, ph = (reduce ? 0 : Math.floor(now / 300 + q) & 1) * .01; PR(px - .03, px + .03, 0, .26 + ph, F(q & 1 ? '#e8e4dc' : '#1c2a52')); PR(px - .02, px + .02, .26 + ph, .31 + ph, F('#d8b090')); } }
    // the wheels
    for(const wx of [-.34, .34]){ disc(OX + wx * u, OY - .17 * u, .17 * u, .17 * u, F('#2a1a10')); disc(OX + wx * u, OY - .17 * u, .13 * u, .13 * u, F('#4a3020')); disc(OX + wx * u, OY - .17 * u, .03 * u, .03 * u, F('#8a6a3a')); if(lod) for(let q = 0; q < 4; q++){ const a = q / 4 * Math.PI + (reduce ? 0 : SPA.fx * 1.8); pline(OX + (wx + Math.cos(a) * .13) * u, OY - (.17 + Math.sin(a) * .13) * u, OX + (wx - Math.cos(a) * .13) * u, OY - (.17 - Math.sin(a) * .13) * u, F('#2a1a10'), 1); } }
    PR(-.6, .6, .32, .42, F('#2a1810')); PR(-.55, .55, .42, .98, F('#5a1414'));
    if(lod){ for(let q = 0; q < 6; q++){ const a = -.55 + q * .1833; PR(a + .01, a + .17, .46, .9, L1(q & 1 ? '#c8302a' : '#a8241e')); PR(a + .05, a + .13, .58, .78, L1(q & 1 ? '#e8b84a' : '#3a6a5a')); } PR(-.55, .55, .9, .98, L1('#e8b84a')); }   // the tapestries
    PR(-.62, .62, .98, 1.02, F('#1a1010')); PR(-.6, .6, 1.02, 1.24, F('#24140e')); if(lod){ for(let q = 0; q < 7; q++){ const a = -.5 + q * .166; PR(a - .03, a + .03, 1.04, 1.2, F('#e8d0b0')); PR(a - .035, a + .035, 1.18, 1.24, F(q & 1 ? '#1c2a52' : '#e8e4dc')); } }   // the players on the deck
    PR(-.64, .64, 1.08, 1.1, L1('#e8b84a')); PP(-.72, 1.24, .72, 1.24, .4, 1.44, -.4, 1.44, F('#14121a')); PR(-.72, .72, 1.23, 1.26, L1('#d8a840'));   // the balustrade's gold rail; the roof
    PR(-.03, .03, 1.44, 4.3, F('#a01a14')); if(lod) for(let q = 0; q < 26; q++) PR(-.03, .03, 1.5 + q * .11, 1.53 + q * .11, F('#f0e8dc'));
    disc(OX, OY - 3.2 * u, .22 * u, .1 * u, F('#1a3a24')); disc(OX, OY - 3.25 * u, .14 * u, .06 * u, F('#2a5a34')); PP(-.02, 4.3, .02, 4.3, .06, 4.55, -.02, 4.6, L1('#e8e0d0'));   // the pine sprig; the halberd at the top
    // the lanterns: seven rows on bars, narrowing upward, lit from the bottom row up as the wave reaches the float
    const rows = 7; for(let r = 0; r < rows; r++){ const h = 1.55 + r * .22, hw = .95 - r * .11, n = Math.max(2, Math.round(hw * 2 / .13)); PR(-hw, hw, h + .08, h + .095, F('#2a1a10'));
      for(let q = 0; q <= n; q++){ const lx = -hw + q * hw * 2 / n, lt = SPA.lit; const x0 = OX + lx * u, y0 = OY - h * u;
        if(u * .05 < PX * 1.2){ R(x0 - PX / 2, y0 - PX, PX, PX * 2, lt ? L1('#ffe8b0') : F('#6a5a48')); continue; }
        disc(x0, y0, u * .04, u * .055, lt ? L1('#fff0c8') : F('#7a6a56')); R(x0 - u * .04, y0 + u * .015, u * .08, Math.max(PX, u * .012), lt ? L1('#d42a20') : F('#4a2a20')); } }
    if(SPA.lit && fog < .8) glow(OX, OY - 2.2 * u, Math.min(H * .25, u * 1.3), '#ffb050', .2 * (1 - fog)); }
  // a string of komagata chōchin across Shijō (the set piece's night only): a sagging wire, lanterns along it, lit by the wave
  function drawString(sp, x, y, uw, fog, now){ const L = sp.L; if(!L.sp || !CF(sp.k + .5)) return; FF = fog; const u = CFU; if(u < .4) return; const lit = SPA.on && SPA.L === L && Math.abs(sp.k - L.JX) < SPA.wave;
    const n = 15; let px0 = 0, py0 = 0; for(let q = 0; q <= n; q++){ const t = q / n, X = -2.1 + 4.2 * t, h = 1.32 - .16 * 4 * t * (1 - t), xx = CFX + X * u, yy = CFY - h * u; if(q) pline(px0, py0, xx, yy, F('#1a1418'), 1); px0 = xx; py0 = yy;
      if(q && q < n){ if(u * .04 < PX){ R(xx - PX / 2, yy, PX, PX * 2, lit ? L1('#ffe0a0') : F('#5a4a3a')); continue; } disc(xx, yy + u * .07, u * .035, u * .05, lit ? L1('#fff0c8') : F('#6a5a48')); R(xx - u * .035, yy + u * .08, u * .07, Math.max(PX, u * .012), lit ? L1('#d42a20') : F('#3a2018')); } }
    if(lit && fog < .7) glow(x, y - 1.2 * u, Math.min(H * .1, u * .8), '#ffb050', .08 * (1 - fog)); }

  // ---------------------------------------------------------------- placement
  const CARD = { kanji:'宵山', name:'YOIYAMA', sub:'the festival comes out', col:'#ff9a4a' };
  function regDir(){ if(DIRREG) return; const D = DIR(); if(!D) return; DIRREG = true; try{ D.register('yoiyama', { tier:'hero', roads:[KEY], card:CARD }); }catch(e){} }
  function place(i, s){ regDir(); const L = visitOf(i); s.gnLit = 0; if(!L) return; const sp = s.sprites, sec = sectAt(L, i);
    // the road's shape on the stretches this file composes (straights on the axes, the bends at the gate and the pagoda), the climb's height
    if(!s.gnDone){ s.gnDone = true; const c = crvAt(L, i);
      if(c !== null){ const e = i < L.GT - 290 ? sm((i - (L.GT - 310)) / 20) : 1; s.curve = c * e + s.curve * (1 - e); } else if(i >= L.a0 && i < L.D1) s.curve *= sec === 'climb' ? .5 : .45;
      /* The climb's height. The core builds segments in batches and places a batch after building it, each new segment starting from the
         last one's (already raised) height, so a batch that starts on the climb carries the height at its first segment in every segment
         it built. Each segment therefore takes only the climb's change since its batch's first segment (lastSegIdx, the core's batch
         start): continuous, and nothing outside the visit moves (the descent ends 180 before the border, longer than any batch). */
      const s0 = typeof lastSegIdx === 'number' && lastSegIdx <= i ? lastSegIdx : i, h0 = hAdd(L, s0), ya = hAdd(L, i) - h0, yb = hAdd(L, i + 1) - h0; if(ya || yb){ s.p1.world.y += ya; s.p2.world.y += yb; } }
    if(sec !== 'shijo' || (i >= L.JX - 4 && i < L.JX + CW + 4)) s.zeb = true;   // (no side lane on the lanes or at the junction: the core calls a lane off where a segment carries zeb)
    if((i >= L.JX - 8 && i < L.JX + CW + 8) || i >= L.GT - 50) s.gnNoHz = true;   // (round 2: none from the gate's bend on: a rainbow slick on the stone lanes, the canal or the climb read as a stray shape)
    // the far land's heroes as props of their own segments (each draws itself only once inside the props' reach)
    /* (round 3: Kellan, "when you get half passed the 3d [pagoda] and it is still in sight, it disappears". Root cause: each landmark was one
       prop on its centre's segment, and the core draws a segment's props only while that segment is ahead of the camera; and pagoda() gave
       up as soon as its front crossed the near plane. Now each is a prop on every segment of its depth, drawn once, from the nearest of
       them still ahead (heroAnc), with its geometry clipped at the near plane by wq, so it stays until it has wholly left the view.) */
    if(i >= Math.floor(L.ZG) - HLO.g && i <= Math.floor(L.ZG) + 16) sp.push({ env:KEY, type:'hero', x:0, k:i, L, h:'g' }); if(i >= Math.floor(L.ZP) - HLO.p && i <= Math.floor(L.ZP) + 16) sp.push({ env:KEY, type:'hero', x:0, k:i, L, h:'p' });
    for(const side of [-1, 1]){ const Bk = bAt(L.back[side < 0 ? 0 : 1], i); if(Bk) sp.push({ env:KEY, type:'b', x:side * Bk.x0, k:i, b:Bk }); }
    if(L.kawa){ const Bw = bAt(L.kawa, i); if(Bw) sp.push({ env:KEY, type:'b', x:-Bw.x0, k:i, b:Bw }); }
    for(const side of [-1, 1]){ const B = bAt(L.rows[side < 0 ? 0 : 1], i); if(B){ sp.push({ env:KEY, type:'b', x:side * B.x0, k:i, b:B }); if(B.kan !== undefined && i === Math.floor(B.kz)) sp.push({ env:KEY, type:'kan', x:side * B.x0, k:i, b:B }); } }
    // the street's furniture, by stretch
    if(sec === 'shijo'){ if(i % 18 === 0 && !(i >= L.JX - 2 && i < L.JX + CW + 2)) for(const side of [-1, 1]) sp.push({ env:KEY, type:'slamp', x:side * 1.1, k:i });
      if(i % PSPAN === 10 && i < L.GT - 50) for(const side of [-1, 1]) sp.push({ env:KEY, type:'pole', x:side * 1.18, k:i }); if(i < L.GT - 40) for(const side of [-1, 1]) sp.push({ env:KEY, type:'w', x:side * 1.3, side, k:i });
      if(i >= L.S0 && i < L.GT - 40 && (i - L.S0) % 12 === 6 && !(i >= L.JX - 2 && i < L.JX + CW + 2)) sp.push({ env:KEY, type:'str', x:0, k:i, L });
      if(i === L.JX + 7) sp.push({ env:KEY, type:'float', x:0, k:i, L }); }
    if(sec === 'hanami' && i % 16 === 8) for(const side of [-1, 1]) sp.push({ env:KEY, type:'andon', x:side * 1.12, k:i, w:Math.floor(H1(i * .3 + side) * 6) });
    if((sec === 'canal' || sec === 'climb') && i % 22 === 11) sp.push({ env:KEY, type:'lamp', x:sec === 'canal' ? 1.12 : (i / 22 & 1 ? 1.1 : -1.1), k:i });
    if(sec === 'climb' && i % PSPAN === 10 && i < L.PG - 30) sp.push({ env:KEY, type:'pole', x:1.16, k:i }); if(sec === 'climb' && i < L.PG - 30) sp.push({ env:KEY, type:'w', x:1.3, side:1, k:i });
    if(sec === 'canal'){ if(i % 17 === 4 && !(i >= L.TB - 6 && i < L.TB + 8)) sp.push({ env:KEY, type:'willow', x:-1.22, k:i }); if(i === L.TB) sp.push({ env:KEY, type:'tb', x:-1.5, k:i, L }); if(i === L.TB - 2) sp.push({ env:KEY, type:'shrine', x:1.6, k:i }); }
    // people (a few: a calm night), the rickshaws
    if(sec !== 'shijo' || H1(i * .9) < .5){ if(H1(i * 1.71 + .3) < (sec === 'shijo' ? .06 : .05)){ const side = H1(i * 2.3) < .5 ? -1 : 1; sp.push({ env:KEY, type:'ped', x:side * (1.14 + H1(i * 5.1) * .12), k:i, v:Math.floor(H1(i * 7.7) * PV.length), w:true }); } }
    { const tq = Math.floor(i / 110), ts = tq * 110 + 40; if(i >= ts && i < ts + 8 && (sec === 'hanami' || sec === 'climb') && H1(tq * 3.7 + L.B0) < .6){ const side = H1(tq * 5.3) < .5 ? -1 : 1; sp.push({ env:KEY, type:'rick', x:side * 1.24, k:i, a:ts, side }); } }
    // the light pooled on the road (lanterns, lamps)
    const d = sec === 'hanami' ? Math.min(Math.abs(i % 16 - 8), 16) : sec === 'shijo' ? Math.min(i % 18, 18 - i % 18) : Math.min(Math.abs(i % 22 - 11), 22);
    s.gnLit = s.lit0 = (sec === 'shijo' ? .12 : .06) + .42 * Math.max(0, 1 - d / 4);
    // the set piece is decided once per visit, as its stretch begins to be laid
    if(L.hasSP && !L.req && i >= L.S0 - 200){ L.req = true; const D = DIR(); if(GSP !== null){ L.sp = GSP === '1'; return; } try{ L.sp = !!(D && D.request && D.request('yoiyama', { tier:'hero', seg:L.JX, road:KEY })); }catch(e){ L.sp = false; } } }
  function lit(i, s){ return s.gnLit || 0; }

  // ---------------------------------------------------------------- the road: pavements, stone paving on the lanes, the canal
  const WL = .07;
  function roadFX(s, a, b, fog, f, now){ if(s.gnNoHz && s.hz && (s.hz.type === 'oil' || s.hz.type === 'pad')) s.hz = null;   // no slick or pad at the junction or anywhere from the gate's bend on
    if(a.y - b.y < .5 || fog > .8) return; if(s.gnV === undefined) s.gnV = visitOf(s.index) || null; const L = s.gnV; if(!L) return; const i = s.index, sec = sectAt(L, i);
    const Q = (X1, X2, col, h1, h2) => poly4(a.x + a.w * X1, a.y - (h1 || 0) * a.w, a.x + a.w * X2, a.y - (h1 || 0) * a.w, b.x + b.w * X2, b.y - (h2 === undefined ? (h1 || 0) : h2) * b.w, b.x + b.w * X1, b.y - (h2 === undefined ? (h1 || 0) : h2) * b.w, col);
    if(sec === 'shijo'){ for(const side of [-1, 1]){ Q(side * 1.0, side * 1.08, f((i & 3) ? '#5a5662' : '#6a6672')); Q(side * 1.08, side * 2.3, f((i % 4) === 0 ? '#2a2630' : '#3a3440')); if(fog < .5) Q(side * 1.5, side * 2.25, f('#5a4a40')); } return; }   // kerb; the pavement under the arcade, lit by the shops
    // the lanes: granite slabs across the whole street (a joint every 3 segments, staggered courses), warm where the lanterns fall
    const lw = clamp(s.gnLit || 0, 0, 1), jt = (i & 1) === 0, base = lw > .3 ? '#4e4440' : '#3a3640', alt = lw > .3 ? '#56483f' : '#3e3a44';
    if(fog < .45){ if(jt && a.y - b.y > PX * .8) Q(-1, 1, f('#2a2630')); else { const o = (Math.floor(i / 2) & 1) ? .17 : 0; for(let q = -1; q < 6; q++){ const x0 = -1.0 + o + q * .34, x1 = x0 + .32; if(x1 <= -1 || x0 >= 1) continue; Q(Math.max(-1, x0), Math.min(1, x1), f(H1(i * .37 + q) < .5 ? alt : base)); } } }
    const right = sec === 'canal' ? [1] : [-1, 1]; for(const side of right){ Q(side * 1.0, side * 1.06, f('#5a5662')); Q(side * 1.06, side * 1.45, f((i % 3) === 0 ? '#2a2630' : '#3a3640')); }
    if(sec !== 'canal') return;
    // the canal: the near kerb stones, then the water below the road with the far stone wall and the bank where the teahouses stand
    Q(-1.0, -1.08, f('#6a6470')); Q(-1.08, -1.14, f('#3a3840'), 0, 0);
    Q(-1.14, -2.86, f((i % 5) ? '#06222a' : '#082830'), -WL, -WL);   // the water (shallow, a little below the road: deeper would hide it behind the near bank): a dark teal, its own hue and value
    if(fog < .6){ // the willows in the water: their crowns mirrored toward you as dark green-black streaks, a lamp-lit strand now and then
      const kw = i + 8 - ((i + 8 - 4) % 17 + 17) % 17; if(kw >= L.C0 && kw < L.C1 && !(kw >= L.TB - 6 && kw < L.TB + 8) && i <= kw && i > kw - 9){ const t = (kw - i) / 9;
        Q(-2.2 + t * .15, -1.2 - t * .1, f('#04140e'), -WL, -WL); if(((i * 3 + (reduce ? 0 : Math.floor(now / 500))) % 4) === 0) Q(-1.5, -1.46, f('#2a4a2a'), -WL, -WL); }
      if(((i * 7) % 11) === 3){ const x0 = -1.4 - H1(i * .3) * 1.2; Q(x0, x0 - .12, f('#1a4a52'), -WL, -WL); } }   // the moonlit ripples: short pale-teal dashes
    { // the far wall: rough stones in staggered courses, a lit top course (round 3: its face at every distance; gapviz showed the ground through it beyond fog .6)
      const V = (h0, h1, col) => poly4(a.x - a.w * 2.86, a.y - h0 * a.w, b.x - b.w * 2.86, b.y - h0 * b.w, b.x - b.w * 2.86, b.y - h1 * b.w, a.x - a.w * 2.86, a.y - h1 * a.w, col);
      V(-WL, .04, f((i & 1) ? '#3a3a42' : '#46444c')); if(fog < .6){ if(a.w > 14){ V(-WL + .035, -WL + .045, f('#22222a')); if((i % 3) === 0) V(-WL, .04, f('#2a2a32')); } V(.03, .04, f('#6a6670')); } }
    Q(-2.86, -3.3, f('#2a2830'), .04, .04);
    // the reflections: under every lit teahouse window, long broken dashes (they shimmer slowly; steady under reduced motion)
    if(fog < .55 && L.kawa){ const Bw = bAt(L.kawa, i); if(Bw){ const ph = reduce ? 0 : Math.floor(now / 260), col = Bw.lit ? f((i + ph) % 3 ? '#e8a050' : '#ffd890') : f((i + ph) % 3 ? '#4a3020' : '#6a4428'), ok = ((i * 7 + ph) % 5) < 4;   // (an unlit teahouse still throws its porch lamp: dim dashes)
        if(ok) for(const X of [-2.15, -2.45, -2.7]) if(H1(Bw.sd + X + i * .01) < .75) Q(X - .07, X + .07, col, -WL, -WL); else if(((i + ph) & 3) === 0) Q(X - .03, X + .03, f('#6a4a30'), -WL, -WL); }
      if((i % 22) > 8 && (i % 22) < 14 && ((i + (reduce ? 0 : Math.floor(now / 300))) & 1)) Q(-1.3, -1.36, f('#ffd89a'), -WL, -WL); } }

  /* ---------------------------------------------------------------- after the rain (round 3): the stone holds every light (env/roadmat.js
     pools, as Akihabara's). References: Pontochō after rain, the Ninenzaka slope at night, a wet Gion lane: each lit lattice lays a warm
     amber column down the paving toward you, every chōchin a red one, every andon a cream one; the floodlit gate the brightest image on
     Shijō, the pagoda's gold on the climb. The road between stays dark and blue (the sky's sheen, roadmat). */
  function wetSrc(s, n, a, P){ if(n > 44 || GX.includes('wet')) return; const L = s.gnV !== undefined ? s.gnV : (s.gnV = visitOf(s.index) || null); if(!L) return; const i = s.index, uw = a.w; if(!(uw > .5)) return;
    const st = n < 16 ? 4 : 8, fa = 1 - Math.pow(n / DRAW, 1.6) * .9, lx = laneDX(i);
    if(i === Math.floor(L.ZG - .55 * GS * ZU) && !GX.includes('hero')){ const x = a.x + (L.XG + lx) * uw; P(x, a.y, uw, .42 * GS, 1.9 * GS, 1.1 * uw, '#ec6a26', .75 * fa); P(x, a.y, uw, .5 * GS, 1.0 * GS, .45 * uw, '#ffe0b0', .6 * fa); }
    if(i === Math.floor(L.ZP - 6) && !GX.includes('hero')) P(a.x + (L.XP + lx) * uw, a.y, uw, .4, 3.2, .9 * uw, '#ff9a3a', .6 * fa);
    for(let side = -1; side <= 1; side += 2){ const B = bAt(L.rows[side < 0 ? 0 : 1], i); if(!B) continue; const X = side * B.x0 + lx;
      if(B.lan && B.door !== undefined){ const zl = B.b0 + B.door - .4; if(zl >= i && zl < i + 1){ const xl = a.x + (side * (B.x0 - .15) + lx) * uw; P(xl, a.y, uw, .33, .44, .12 * uw, B.k === 'ochaya' || B.k === 'kawa' ? '#ff4a2a' : '#fff0c8', .95 * fa); } }
      if(!B.lit || i % st || n > 40) continue; const t = segs[i + st]; if(!t || !t.p1.screen.scale) continue; const q = t.p1.screen, xa = a.x + X * uw, xb = q.x + (side * B.x0 + laneDX(i + st)) * q.w, xc = (xa + xb) / 2, w0 = Math.abs(xb - xa) * .4;
      if(B.k === 'shop') P(xc, a.y, uw, .04, .58, w0, '#f8d8a0', .6 * fa); else if(B.k !== 'back' && B.k !== 'minamiza') P(xc, a.y, uw, .06, .5, w0, B.fk === 'mise' ? '#ffc070' : '#f09a48', (B.fk === 'mise' ? .7 : .5) * fa); }
    const sps = s.sprites; for(let k = 0; k < sps.length; k++){ const o = sps[k]; if(o.env !== KEY) continue; const ty = o.type, x = a.x + (o.x + lx) * uw;
      if(ty === 'andon') P(x, a.y, uw, .62, .84, .16 * uw, '#fff0c8', .9 * fa); else if(ty === 'lamp') P(x, a.y, uw, .86, 1.02, .12 * uw, '#ffe0a0', .85 * fa); else if(ty === 'slamp') P(x, a.y, uw, 1.4, 1.5, .2 * uw, '#fff4dc', .7 * fa);
      else if(P.dark && n < 16 && (ty === 'ped' || ty === 'pole')) P.dark(x, a.y, uw, ty === 'ped' ? .5 : 1.9, ty === 'ped' ? .09 * uw : Math.max(PX, uw * .045), .5); } }

  // ---------------------------------------------------------------- the far land: Higashiyama's ridges, the low city, the heroes
  const SW = 640, SH = 120; let RIDGE = null, CITY = null;
  function buildStrips(){ RIDGE = RIDGE || mk(SW, SH); CITY = CITY || mk(SW, SH); const k = RIDGE.getContext('2d'); k.clearRect(0, 0, SW, SH);
    // two ridges of Higashiyama, the far one paler (aerial perspective), their crowns broken by tree clumps; a few temple lights
    for(const [base, amp, col, seed, rim] of [[52, 26, '#141a2c', 3.1, '#1e2638'], [78, 18, '#0c1018', 7.7, '#141a24']]){ k.fillStyle = col; for(let x = 0; x < SW; x++){ const t = x / SW * Math.PI * 2, h = Math.sin(t * 2 + seed) * .5 + Math.sin(t * 5 + seed * 2) * .25 + Math.sin(t * 11 + seed) * .1, y = Math.round(base - amp * h - (H1(seed + Math.floor(x / 3)) * 3 | 0)); k.fillRect(x, y, 1, SH - y); k.fillStyle = rim; k.fillRect(x, y, 1, 1); k.fillStyle = col; } }
    for(const [x, y] of [[96, 64], [210, 72], [404, 58], [512, 80]]){ k.fillStyle = '#ffb860'; k.fillRect(x, y, 2, 1); k.fillStyle = '#8a5a30'; k.fillRect(x - 1, y + 1, 4, 1); }
    const c = CITY.getContext('2d'); c.clearRect(0, 0, SW, SH); let x = 0, n = 0;
    while(x < SW){ const w = 10 + Math.floor(H1(n * 1.31) * 22), h = 6 + Math.floor(H1(n * 2.7) * 14), top = SH - h; c.fillStyle = ['#100e1a', '#141220', '#0e0c16'][n % 3]; c.fillRect(x, top, w, h);
      if(H1(n * 4.1) < .55){ c.fillStyle = H1(n * 5.3) < .6 ? '#a07a4a' : '#6a7090'; c.fillRect(x + 2, top + 3, w - 4, 1); } if(H1(n * 6.1) < .3){ c.fillStyle = '#1a1826'; c.fillRect(x + 3, top - 3, w - 6, 3); c.fillStyle = '#5a6070'; c.fillRect(x + 3, top - 3, w - 6, 1); }   // a tile roof's pale ridge
      x += w; n++; } }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  function strip(c, par, y){ const P = SW * PX, o = ((skyPar(par) % P) + P) % P; cx.drawImage(c, 0, 0, SW, SH, snp(-o), y, P, SH * PX); cx.drawImage(c, 0, 0, SW, SH, snp(-o + P), y, P, SH * PX); if(-o + 2 * P < W) cx.drawImage(c, 0, 0, SW, SH, snp(-o + 2 * P), y, P, SH * PX); }
  function backdrop(o){ setLow(o.sk.low); if(!RIDGE) return false; cx.imageSmoothingEnabled = false; const hz = o.hz, y = snp(hz - SH * PX + PX * 2);
    strip(RIDGE, 'far', y - snp(H * .02)); strip(CITY, 'mid', y);
    const L = visitOf(Math.floor(position / SEG)); if(L && !GX.includes('hero')) heroes(L, true); return false; }

  // ---------------------------------------------------------------- overlay: a few maple leaves falling on the lanes (sparse, no flashing)
  const LEAF = [];   // (filled in warm: no engine helper runs at load)
  function overlay(al, now, sk){ const L = visitOf(Math.floor(position / SEG)); if(!L) return; const sec = sectAt(L, Math.floor(position / SEG)); if(sec === 'shijo') return;
    const a0 = cx.globalAlpha, t = now / 1000, n = reduce ? 6 : LEAF.length; for(let q = 0; q < n; q++){ const [u, v, s, c] = LEAF[q], sp = reduce ? .15 : 1, yy = ((v + t * .06 * s * sp) % 1) * H * 1.1 - H * .05, xx = ((u + Math.sin(t * .7 * sp + q) * .03 + (reduce ? 0 : skyPar('near') / W * .2)) % 1 + 1) % 1 * W;
      cx.globalAlpha = a0 * al * .85; cx.fillStyle = ['#c83a1a', '#e86a2a', '#a82a18'][c]; const k = PX * (s > .8 ? 2 : 1); pxRect(xx, yy, k * 2, k); pxRect(xx + k * (((t * 2 + q) | 0) & 1 ? 0 : 1), yy - k, k, k); }
    cx.globalAlpha = a0; }

  // ---------------------------------------------------------------- draw dispatch
  function draw(sp, x, y, uw, fog, now, sk){ if(sk && sk.low) setLow(sk.low); const t = sp.type;
    if(t === 'b') return drawB(sp, x, y, uw, fog, now); if(t === 'w') return drawWire(sp, x, y, uw, fog, now); if(t === 'lamp') return drawLamp(sp, x, y, uw, fog, now); if(t === 'slamp') return drawSLamp(sp, x, y, uw, fog, now);
    if(t === 'andon') return drawAndon(sp, x, y, uw, fog, now); if(t === 'pole') return drawPole(sp, x, y, uw, fog, now); if(t === 'ped') return drawPed(sp, x, y, uw, fog, now); if(t === 'rick') return drawRick(sp, x, y, uw, fog, now);
    if(t === 'willow') return drawWillow(sp, x, y, uw, fog, now); if(t === 'tb') return drawBridge(sp, x, y, uw, fog, now); if(t === 'shrine') return drawShrine(sp, x, y, uw, fog, now);
    if(t === 'str') return drawString(sp, x, y, uw, fog, now); if(t === 'kan') return drawKan(sp, x, y, uw, fog, now);
    if(t === 'float'){ if(sp.L.sp && SPA.L === sp.L && !GX.includes('float')) floatDraw(sp.L, fog, now); return; }
    if(t === 'hero'){ if(GX.includes('hero')) return; cam(); const zH = sp.h === 'g' ? sp.L.ZG : sp.L.ZP, d = zH - camSeg(); if(d > DRAW - 40) return; if(sp.k !== heroAnc(zH, HLO[sp.h])) return; const L = sp.L, fg = HFOG(Math.max(0, d)); HL = L; if(sp.h === 'g') gate(L.ZG, L.XG, fg); else pagoda(L.ZP, L.XP, fg, 0); } }
  /* The segment a landmark is drawn from: its nearest (the core clips each segment's props to the rows above the road in front of it, so a
     landmark drawn from its centre's segment loses whatever stands nearer and lower: the gate's steps, the pagoda's base and wall), or,
     once that has passed, the first segment ahead of the camera. HLO: how far toward you each reaches, in segments. */
  const HLO = { g:18, p:25 };
  function heroAnc(zH, lo){ return Math.max(Math.floor(zH) - lo, BI + 2); }

  /* ---------------------------------------------------------------- the set piece: 宵山 YOIYAMA, the festival float
     On Shijō before the gate (S0 .. GT), driven by the rider's distance s past S0, never the clock:
       s 4     the card (宵山 YOIYAMA, the festival comes out), a slim letterbox, the music ducked, the guard clearing traffic and oil from S0
               to past the gate; the strings of chōchin over the street (there all along on this visit) begin to light from the junction
               outward, 3.5 segments per segment; the ohayashi's bells (kon-chiki-chin) start.
       s 80    the float rolls out of the side street at the Hanami-kōji junction (JX), its lantern triangle lit, the pullers ahead of it, and
               crosses Shijō from right to left (X +6.5 to -6.5 by s 180). Something of it (body or pullers) is over the road only
               between s 97 and s 144, when the rider is still 76+ segments away (about 1.7 s at top speed), and it never comes back:
               the junction is clear well before you reach it, and the guard keeps every car off the stretch.
       s 230   you ride through the junction under the lit strings; the float stands in the side street to your left.
       GT+20   the letterbox and guard end; the director is told it was seen. */
  const SPA = { on:false, L:null, fx:9, wave:0, lit:false, bell:0 };
  MECH.sp_yoiyama = { update(dt){ if(typeof segs === 'undefined' || !segs.length || state !== 'play'){ SPA.on = false; return; } const cs = position / SEG, L = visitOf(Math.floor(cs));
      if(!L || !L.sp || !L.hasSP || cs < L.S0 - 10 || cs > L.GT + 40){ SPA.on = false; return; }
      const s = cs - L.S0, D = DIR(); SPA.on = true; SPA.L = L; SPA.fx = 6.5 - 13 * clamp((s - 80) / 100, 0, 1); SPA.wave = s < 4 ? 0 : (s - 4) * 3.5; SPA.lit = s >= 4;
      if(!L.card && s >= 4){ L.card = true; if(D && D.cine){ let card = CARD; if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has('yoiyama')){ try{ if(MECH.cutin.show('yoiyama') !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
          try{ if(card) D.cine({ letterbox:false, dur:2.6, card }); L.cut = D.cine({ letterbox:{ top:.05, bottom:.06 }, duck:.6, guard:{ from:L.S0, to:L.GT + 30 }, dur:0 }); }catch(e){} }
        for(let i = Math.max(0, L.S0); i < L.GT + 30 && i < segs.length; i++) if(segs[i].hz) segs[i].hz = null;   // no slick or pad anywhere in the moment
        snd([[784, .5], [1047, .6], [1175, .9]], 'triangle', .012); }
      if(s >= 4 && s < 230 && !reduce){ SPA.bell -= dt || 0; if(SPA.bell <= 0){ SPA.bell = .9; snd([[2093, .12], [2349, .12], [1568, .25]], 'triangle', .006); } }
      if(!L.fin && cs >= L.GT + 20){ L.fin = true; try{ if(L.cut) L.cut.end(); }catch(e){} try{ D && D.done && D.done('yoiyama'); }catch(e){} } } };
  function snd(notes, type, v){ try{ if(typeof M === 'undefined' || !M.ac || !M.tone) return; const t0 = M.ac.currentTime; notes.forEach(([f, d], k) => M.tone(f, d, { type, v, at:t0 + k * .14 })); }catch(e){} }
  /* A calm night: Gion's lanes carry about half the traffic. Cars beyond the first half that reach the edge of the view are moved back out of
     it (beyond the draw distance), so they are never seen to vanish; nothing in view is touched. */
  MECH.gion_calm = { update(dt){ if(typeof cars === 'undefined' || typeof segs === 'undefined' || !segs.length || state !== 'play') return; const i = Math.floor(position / SEG), L = visitOf(i); if(!L || i < L.a0 || i > L.D1) return;
      const keep = Math.max(1, Math.ceil(cars.length * .5)), edge = position + (DRAW - 6) * SEG;
      for(let q = keep; q < cars.length; q++){ const c = cars[q]; if(c.z > edge - 8 * SEG && c.z < edge + 2 * SEG) c.z = edge + 20 * SEG + q * 3 * SEG; } } };

  // ---------------------------------------------------------------- warm-up
  function* warmSteps(){ regDir();
    if(!warmSteps.chained){ warmSteps.chained = true; const prev = window.GATE_EXTRA; window.GATE_EXTRA = n => (prev ? prev(n) || 0 : 0) + (n === 1 && typeof ROUTE !== 'undefined' && ROUTE[0] === landK() ? 360 : 0); }   // (as env/kurobe.js: the first visit, when Gion is it, is 360 longer)
    if(!ATL){ ATL = mk(512, 1); AG = ATL.getContext('2d'); SC = mk(40, 40); SG = SC.getContext('2d', { willReadFrequently:true }); } yield;
    buildText(); INK = INK || mk(512, 1); if(INK.height !== ATL.height) INK.height = ATL.height; { const k = INK.getContext('2d'); k.clearRect(0, 0, INK.width, INK.height); k.drawImage(ATL, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#1a0c0c'; k.fillRect(0, 0, INK.width, INK.height); k.globalCompositeOperation = 'source-over'; }
    if(!FONT){ try{ if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16').then(() => { if(!FONT){ buildText(); const k = INK.getContext('2d'); if(INK.height !== ATL.height) INK.height = ATL.height; k.clearRect(0, 0, INK.width, INK.height); k.drawImage(ATL, 0, 0); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#1a0c0c'; k.fillRect(0, 0, INK.width, INK.height); k.globalCompositeOperation = 'source-over'; } }, () => {}); }catch(e){} } yield;
    yield* artSteps(); lanCycBuild(); yield;
    buildStrips(); buildPeople(); if(!LEAF.length) for(let q = 0; q < 18; q++) LEAF.push([H1(q * 3.1), H1(q * 7.3), .4 + H1(q * 1.9) * .6, q % 3]); yield;
    try{ if(typeof MUSIC !== 'undefined' && MUSIC.ROAD_THEME && !MUSIC.ROAD_THEME[KEY]) MUSIC.ROAD_THEME[KEY] = 'snow'; }catch(e){}
    try{ cx.save(); cx.globalAlpha = .004; for(const c of [INK, RIDGE, CITY, GAT, LCY[0] && LCY[0].cv, LCY[1] && LCY[1].cv].concat(PEOPLE)) if(c) cx.drawImage(c, 0, 0, 1, 1); cx.restore(); }catch(e){ try{ cx.restore(); }catch(e2){} }
    cx.clearRect(0, 0, W, H); }

  ENV.gion = { _lay:lay, _visit:visitOf, _spa:SPA, _PJ:(z, x, h) => { cam(); PJ(z, x, h); return [PJX, PJY, PJU]; },
    kerbs:true, moonDX:.12, road:['#24222c', '#22202a'], lampCol:'#6a5038',
    warm(){ for(const _ of warmSteps()); }, warmSteps, place, lit, draw, roadFX, backdrop, overlay, wetSrc, _art:GA2, hingeIn:() => 'sign' };
})();
