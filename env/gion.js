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
  function PJ(zs, X, h){ let n = zs - BI; const cz = Math.max(ZNEAR * SEG, zs * SEG - CAMZ); if(n < 0) n = 0; if(n > NX - 1) n = NX - 1;
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
        if(fpx >= 10){ const st = .35; for(let z = Math.ceil(Math.max(z0, j) / st) * st; z < Math.min(z0 + P, j + n); z += st){ const t = (z - j) / n; SQ(.075, .01, .015, .145, F('#18120c'), t, Math.min(1, t + .08 / n)); } } } }
    // the shallow eave between storeys: its soffit seen from below, the tile front with a pale lip, the tile rolls near
    let fy = G; SQ(0, fy - .01, .16, fy + .01, F(W0[0])); SQ(.16, fy + .01, .17, fy + .07, F(TILE)); if(fpx >= 4) SQ(.17, fy + .065, .17, fy + .075, F(TEDGE));
    // the lantern by the door (camera-facing, hung from the eave's lip)
    if(B.lan){ const zl = B.b0 + B.door - .4; if(zl >= j && zl < j + n) lantern(zl, B.side * (B.x0 - .15) + laneDX(Math.floor(zl)), .38, .055, B.k === 'ochaya' || B.k === 'kawa' ? 1 : 0, B.sd); }
    fy += .07;
    for(let f = 1; f < B.nF; f++){ if(fy > hv) break; upper(B, fy, j, n, fpx, wpx, now); fy += UH; // the main eave over the top storey, or the next shallow eave
      const top = f === B.nF - 1, d = top ? .24 : .14; SQ(0, fy, d, fy + .03, F(top ? W0[1] : W0[0])); if(fpx >= 6 && top){ const st = 1.2; for(let z = Math.ceil(Math.max(B.b0, j) / st) * st; z < j + n; z += st){ const t = (z - j) / n; SQ(0, fy + .005, d, fy + .03, F(W0[0]), t, Math.min(1, t + .14 / n)); } }   // the rafter ends under the eave
      SQ(d, fy + .03, d + .01, fy + .1, F(TILE)); if(fpx >= 3) SQ(d + .01, fy + .09, d + .01, fy + .105, F(TEDGE)); if(fpx >= 10 && top) SQ(d + .01, fy + .03, d + .01, fy + .045, F(TLIP));
      fy += .1; } }   // (the roof itself rises away from the street: from the eye's height it hides behind its own eave)
  // an upper storey: sudare blinds lit from behind (horizontal slats), mushiko-mado (dark slats in plaster), or a wooden lattice; a railing
  function upper(B, fy, j, n, fpx, wpx, now){ const lit = B.lit, P = B.P, W0 = B.bg;
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
    FQ(0, .58, F(lit ? '#e8c890' : '#2a2026')); FQ(0, .06, F(STONE[0]));
    if(fpx >= 4){ for(let q = Math.floor((j - B.b0) / B.P); ; q++){ const z = B.b0 + q * B.P; if(z >= j + n) break; const t = (z - j) / n; if(t >= 0) FQ(0, .58, F('#1a1418'), t, Math.min(1, t + .1 / n)); if(lit && fpx >= 6){ const a = Math.max(0, t + .25 * B.P / n), b = Math.min(1, t + .6 * B.P / n); if(b > a) FQ(.08, .3, F(['#8a5a3a', '#4a5a7a', '#9a7a4a'][q % 3]), a, b); } } }
    FQ(.58, .74, F(S[0]));
    // the arcade: a roof over the pavement at .62, from the face out to the kerb; tubes underneath; a lit fascia
    SQ(0, .64, 1.08, .64, F('#1e1c24')); SQ(1.08, .64, 1.1, .74, F('#4a4650')); if(fpx >= 2) SQ(1.1, .72, 1.1, .74, F('#8a8690'));
    if(fpx >= 5){ for(let z = Math.ceil(j / 3) * 3; z < j + n; z += 3){ const t = (z - j) / n; SQ(.4, .64, .7, .64, L1('#fff0d0'), t, Math.min(1, t + .5 / n)); } }
    if(B.b0 % 8 < 8){ for(let z = Math.ceil(j / 8) * 8; z < j + n; z += 8){ const t = (z - j) / n; SQ(1.07, 0, 1.09, .64, F('#3a3842'), t, Math.min(1, t + .12 / n)); } }   // the arcade's posts at the kerb
    if(hv <= .74) return; FQ(.74, B.h, F(S[1]));
    for(let f = 0; f < B.nF; f++){ const fy = .74 + f * FH; if(fy > hv) break; const xtra = f >= B.nF0, st = H1(B.sd * 7.1 + f * 3.3 + Math.floor((j - B.b0) / 6)), on = lit && st < (xtra ? .4 : .55);
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
      const xr = x + dx * .5, yt = y - uw * (h + .34); poly4(x, y - uw * h, x + dx, y - uw * h, xr, yt, xr, yt, F(PLAS[1]));   // the gable
      pline(x - side * uw * .06, y - uw * (h - .02), xr, yt - PX, F(TEDGE), wd > PX * 30 ? 2 : 1); pline(xr, yt - PX, x + dx + side * uw * .06, y - uw * (h - .02), F(TEDGE), wd > PX * 30 ? 2 : 1); }
    if(B.k === 'shop' && wd > PX * 3) for(let f = 0; f < B.nF; f++){ const fy = .74 + f * FH; if(fy + .46 > h) break; if(H1(B.sd * 3.1 + f) < .4) R(xl + wd * .2, y - uw * (fy + .46), wd * .6, uw * .28, F(B.lit ? '#d8b880' : '#1c1a26')); } }

  // ---------------------------------------------------------------- lanterns
  /* A chōchin (camera-facing, at segment-float z, lateral X, height of its centre h, radius r in half-road widths). kind 0: white paper with
     a red band (a generic inn lantern); 1: Gion's red lantern with the white roundels (the dango ring motif, a district emblem, no name).
     Small: a lit dot. Near: the stepped body, the ribs, black caps top and bottom, a glow. */
  function lantern(z, X, h, r, kind, sd){ if(!CF(z)) return; const u = CFU, xc = CFX + X * u, yc = CFY - h * u, rx = r * u, ry = r * 1.25 * u; if(xc + rx < -PX || xc - rx > W + PX) return;
    const body = kind ? '#e02a24' : '#fff0d4', band = kind ? '#fff4e8' : '#d42a20';
    if(ry < PX * 1.6){ R(xc - PX / 2, yc - PX / 2, PX, PX, L1(body)); return; }
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
  function gate(z, X0, fog){ if(!plane(z, X0)) return; FF = fog; OU *= GS; const u = OU; if(OX + 3.4 * u < -PX || OX - 3.4 * u > W + PX) return;
    /* Nothing of it may stand over the road where you pass it: everything right of the road's left edge (X -1.25 at its depth) is clipped
       away (one pixel-aligned rect clip), so the wing on that side ends at the kerb. */
    const RL = (-1.25 - X0) / GS; let clip = false; if(RL < 3.4){ const xr = snp(OX + RL * u); if(xr < -PX) return; cx.save(); cx.beginPath(); cx.rect(-W, -H, xr + W, H * 3); cx.clip(); clip = true; }
    try{ gateBody(u, fog, RL); } finally { if(clip) cx.restore(); } }
  function gateBody(u, fog, RL){
    const V = q => L1(VERM[q]), Wt = q => L1(WHITE[q]), Gn = q => F(GREEN[q]), lod = u * .06 > PX;
    /* The forest behind (Maruyama): a wooded hill, never a card (audit #14: it was a straight-edged dark box against the sky). Stepped
       columns on the pixel grid; tree crowns (rounded steps, each its own height) make the skyline ragged; the hill is highest behind the
       roof and falls to the ground at both sides; a moonlit rim on every crown top (the tunnels headwall hill's recipe). The near canopy
       is lit from below by the gate's floodlights. Where the clip cuts it at the road as you pass, it falls away to the cut first. */
    { const cw = Math.max(PX, Math.min(2 * PX, snp(u * .09))), x0 = snp(OX - 3.4 * u), xe = Math.min(3.4, RL), CWu = .34;
      for(let xs = x0; xs < OX + 3.4 * u; xs += cw){ if(xs > W + PX) break; if(xs + cw < -PX) continue; const X = (xs + cw / 2 - OX) / u; if(X > xe + .05) break;
        const f = Math.min(1, Math.abs(X) / 3.4), cc = (X + 3.4) / CWu, cr = Math.floor(cc), t = (cc - cr) * 2 - 1, fall = sm((RL - X) / 1.1), dome = Math.sqrt(Math.max(0, 1 - t * t));
        const hb = .4 + (2.7 * (1 - f * f) + H1(cr * .37 + 5) * .34 * (1 - f * .5) + dome * (.12 + H1(cr * 1.13 + 2) * .1)) * fall, top = snp(OY - hb * u), bot = snp(OY - .4 * u);
        if(bot - top < PX) continue; R(xs, top, cw, bot - top, F(H1(cr * 2.9 + 1) > .7 ? '#0a1210' : '#070c0c')); R(xs, top, cw, PX, F(dome > .45 ? '#1c2a26' : '#142220'));
        if(Math.abs(X) < 2.9){ const g = Math.abs(X) / 2.9, hl = .4 + (1.35 * (1 - g * g) + H1(cr * 3.7 + 9) * .22 + dome * .08) * fall, tl = snp(OY - hl * u); if(bot - tl >= PX) R(xs, tl, cw, bot - tl, F('#0e1814')); } } }
    // the wings: lower halls each side (vermilion posts, white panels, green windows), dark roofs with pale edges
    for(const s of [-1, 1]){ PR(s * 1.12, s * 2.75, .42, 1.02, Wt(0)); PR(s * 1.12, s * 2.75, .42, .62, V(1)); if(lod){ for(let q = 0; q < 4; q++){ const a = s * (1.2 + q * .4); PR(a, a + s * .05, .42, 1.02, V(2)); } PR(s * 1.45, s * 1.8, .7, .92, Gn(1)); PR(s * 2.1, s * 2.45, .7, .92, Gn(1)); }
      PP(s * 1.05, 1.02, s * 2.95, 1.02, s * 2.7, 1.24, s * 1.15, 1.26, F(TILE)); PR(s * 1.05, s * 2.95, 1.0, 1.04, Wt(2)); }
    // the steps: seven treads, risers lit by the floodlights from below
    for(let q = 0; q < 7; q++){ const h0 = q * .06, w = 2.1 - q * .05; PR(-w, w, h0, h0 + .06, F(q & 1 ? '#6a6460' : '#7a746c')); PR(-w, w, h0 + .052, h0 + .06, F('#b0a898')); }
    // stone lanterns flanking the steps
    for(const s of [-1, 1]){ const lx = s * 2.35; PR(lx - .05, lx + .05, 0, .45, F(STONE[2])); PR(lx - .1, lx + .1, .45, .6, F(STONE[1])); PR(lx - .06, lx + .06, .48, .57, L1('#ffc870')); PP(lx - .16, .6, lx + .16, .6, lx + .05, .7, lx - .05, .7, F(STONE[1])); }
    // the lower storey
    PR(-1.08, 1.08, .42, 1.02, Wt(1)); PR(-.36, .36, .42, .98, F('#180806'));   // the plaster; the passage
    if(lod){ PR(-.36, .36, .42, .5, F('#3a2418')); PR(-.08, .08, .74, .9, L1('#e8b850')); PR(-.03, .03, .9, .98, F('#5a3a1a'));   // the passage floor; the hanging gilt lantern
      for(const s of [-1, 1]){ PR(s * .4, s * 1.0, .42, .62, Gn(0)); for(let q = 0; q < 8; q++){ const a = s * (.43 + q * .072); PR(a, a + s * .03, .44, .62, Gn(2)); } PR(s * .48, s * .9, .62, .8, F('#2a1410')); PR(s * .6, s * .76, .64, .82, F(s < 0 ? '#5a2a1a' : '#1e3a2a'));   // the fences; the guardians in the dim bays
        PR(s * .3, s * .34, .55, .95, F('#0a0a0e')); }   // the black banners beside the passage
      for(let q = -3; q <= 3; q++){ const lx = q * .3 + (q > 0 ? .02 : q < 0 ? -.02 : 0); if(Math.abs(lx) < .2) continue; const ly = .96; if(u * .05 > PX * 1.2){ disc(OX + lx * u, OY - ly * u, u * .05, u * .065, L1('#fff4e0')); PR(lx - .05, lx + .05, ly - .015, ly, V(2)); PR(lx - .03, lx + .03, ly + .06, ly + .075, F('#1a1010')); } else R(OX + lx * u - PX / 2, OY - ly * u - PX, PX, PX * 2, L1('#fff0d0')); }   // the paper lanterns under the eave
      for(const s of [-1, 1]) for(let q = 0; q < 6; q++){ const lx = s * (1.28 + q * .26), ly = .93; if(u * .04 > PX * 1.2){ disc(OX + lx * u, OY - ly * u, u * .04, u * .052, L1('#fff0d4')); PR(lx - .04, lx + .04, ly - .03, ly - .018, V(2)); } else R(OX + lx * u - PX / 2, OY - ly * u - PX / 2, PX, PX, L1('#ffe8c0')); } }   // and a row along each wing
    for(const p of [-1.06, -.38, .38, 1.06]){ PR(p - .045, p + .045, .42, 1.04, V(2)); if(lod) PR(p - .045, p - .015, .42, 1.04, V(1)); }
    PR(-1.1, 1.1, .78, .82, V(2)); PR(-1.1, 1.1, .97, 1.03, V(2));
    // the lower brackets and roof
    PR(-1.18, 1.18, 1.03, 1.12, V(1)); if(lod) for(let q = -14; q <= 14; q++){ const a = q * .08; PR(a - .025, a + .025, 1.04, 1.1, V(3)); PR(a - .02, a + .02, 1.04, 1.055, Wt(2)); }
    PP(-1.42, 1.12, 1.42, 1.12, 1.36, 1.2, -1.36, 1.2, F('#3a1408')); PP(-1.48, 1.18, 1.48, 1.18, 1.14, 1.36, -1.14, 1.36, F(TILE)); PR(-1.46, 1.46, 1.17, 1.2, Wt(2));
    PP(-1.48, 1.18, -1.42, 1.18, -1.4, 1.23, -1.52, 1.25, Wt(2)); PP(1.42, 1.18, 1.48, 1.18, 1.52, 1.25, 1.4, 1.23, Wt(2));   // the lifted corners
    // the balcony and the upper storey
    PR(-1.02, 1.02, 1.36, 1.44, V(2)); if(lod) for(let q = -10; q <= 10; q++) PR(q * .1 - .015, q * .1 + .015, 1.38, 1.44, V(1));
    PR(-.92, .92, 1.44, 1.8, Wt(1)); for(const s of [-1, 1]){ PR(s * .32, s * .78, 1.5, 1.72, Gn(1)); if(lod) for(let q = 0; q < 6; q++){ const a = s * (.34 + q * .08); PR(a, a + s * .025, 1.5, 1.72, Gn(2)); } }
    for(const p of [-.9, -.3, .3, .9]) PR(p - .04, p + .04, 1.44, 1.82, V(2)); PR(-.94, .94, 1.6, 1.63, V(2));
    PR(-1.04, 1.04, 1.8, 1.9, V(1)); if(lod) for(let q = -12; q <= 12; q++){ const a = q * .085; PR(a - .025, a + .025, 1.81, 1.88, V(3)); PR(a - .02, a + .02, 1.81, 1.825, Wt(2)); }
    // the upper roof: the soffit, the eave with its pale edge, the hip, the gable, the ridge
    PP(-1.62, 1.9, 1.62, 1.9, 1.5, 1.98, -1.5, 1.98, F('#3a1408')); PP(-1.68, 1.96, 1.68, 1.96, .78, 2.34, -.78, 2.34, F(TILE)); PR(-1.66, 1.66, 1.95, 1.99, Wt(2));
    PP(-1.68, 1.96, -1.6, 1.96, -1.58, 2.02, -1.74, 2.06, Wt(2)); PP(1.6, 1.96, 1.68, 1.96, 1.74, 2.06, 1.58, 2.02, Wt(2));
    PP(-.55, 2.28, .55, 2.28, .55, 2.36, -.55, 2.36, F('#2a2a36')); PP(-.5, 2.34, .5, 2.34, 0, 2.52, 0, 2.52, V(1)); PR(-.86, .86, 2.5, 2.56, F(TILE)); PR(-.86, .86, 2.55, 2.57, Wt(2)); PR(-.92, -.82, 2.5, 2.64, F(TILE)); PR(.82, .92, 2.5, 2.64, F(TILE));
    if(lod){ pline(OX - 1.68 * u, OY - 1.98 * u, OX - .78 * u, OY - 2.34 * u, Wt(2), 1); pline(OX + 1.68 * u, OY - 1.98 * u, OX + .78 * u, OY - 2.34 * u, Wt(2), 1); }
    if(fog < .85) glow(OX, OY - 1.1 * u, Math.min(H * .25, u * 1.6), '#ff7a2a', .18 * (1 - fog)); }
  /* The Yasaka pagoda (round 2, rebuilt to the night photographs): five tiers on a stone base. Half-road widths of about 5.8 m: the base
     1.1 wide, the top of the finial near 7 high. What makes it read at every distance:
     - the roofs dark (grey-blue tile) against the sky, thick at the edge, their eaves curving up into lifted corners (the curve sampled in
       six steps a side), the hips pale where the moon catches them; the roof's top slope is drawn only when the eye is above its plane
       (from far, nearly level: the dark mass of each roof; from below up close: hidden, as it is);
     - the eave undersides lit warm by the floodlights: rafter strips, a hot bracket band against the wall;
     - the bodies: white plaster panels glowing warm between dark timber posts and beams, the middle bay a dark door with a lit frame;
     - the bronze sōrin: the base box, the bowl, nine rings, the openwork flame, the jewel.
     Drawn from the top tier down, so each roof covers the foot of the body above it as you look up. */
  const ZU = 10;   // depth offsets are in half-road widths; z is in segments (ROADW / SEG = 10)
  const PT = (() => { const T = []; let hb = .3; for(let k = 0; k < 5; k++){ const a = .53 - .03 * k, bh = .5 - .02 * k, he = hb + bh + .1, r = 1.18 - .06 * k; T.push({ hb, a, bh, he, r }); hb = he + .3; } return T; })();
  const RT = 6;   // steps of the eave's curve per half side
  const RF = new Float64Array(RT * 2 + 1);   // the eave's lift along a side, u in -1..1
  function pagoda(z, X0, fog, hy){ cam(); FF = fog; PJ(z, X0, 0); if(!fin(PJX) || PJX < -PJU * 2.5 || PJX > W + PJU * 2.5) return; const cs = camSeg(); if(z - (1.3) * ZU < cs + ZNEAR) return;
    const T = PT, top = T[4].he + .55, fine = PJU >= PX * 10, small = PJU < PX * 2.5, front = cs < z - (.6) * ZU, side = X0 < -.6 ? 1 : X0 > .6 ? -1 : 0;
    // the eye's height above the pagoda's ground, and its lateral (both in half-road widths): to decide which roof slopes face it
    let n = z - BI; if(n < 0) n = 0; if(n > NX - 1) n = NX - 1; const gi = n | 0, gy = YA[gi] + (YA[gi + 1] - YA[gi]) * (n - gi), eyeH = (CAMY - gy) / ROADW, dz = (z - cs) / ZU, eyeX = playerX;
    for(let q = 0; q <= RT * 2; q++){ const u = q / RT - 1; RF[q] = u * u * u * u; }
    const ZF = d => z + d * ZU;
    // the finial
    { PJ(z, X0, top); const bx = PJX, by = PJY, u = PJU;
      if(small){ R(bx - PX / 2, by - u * 1.7, PX, u * 1.7, F('#5a3e20')); }
      else { R(bx - u * .1, by - u * .12, u * .2, u * .12, F('#3a2a1c')); R(bx - u * .1, by - u * .12, u * .2, Math.max(PX, u * .025), L1('#a8783a'));   // the base box
        disc(bx, by - u * .17, u * .09, u * .05, F('#4a3420')); R(bx - u * .022, by - u * 1.72, u * .044, u * 1.58, F('#4a3420')); R(bx - u * .022, by - u * 1.72, Math.max(PX, u * .014), u * 1.58, L1('#c89048'));   // the bowl; the mast, lit on one side
        for(let q = 0; q < 9; q++){ const yy = by - u * (.3 + q * .105), rw = u * (.12 - q * .004); R(bx - rw, yy, rw * 2, Math.max(PX, u * .028), F('#3a2a1a')); R(bx - rw, yy, rw * 2, Math.max(PX, u * .01), L1(q & 1 ? '#d8a050' : '#b8843c')); }   // the nine rings, each with a lit top edge
        if(fine){ const fy = by - u * 1.36; for(const d of [-1, 1]) poly4(bx + d * u * .02, fy, bx + d * u * .13, fy - u * .08, bx + d * u * .1, fy - u * .2, bx + d * u * .02, fy - u * .16, L1('#a87a40')); }   // the openwork flame
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
        if(!small){ Q4(P(-1, a + .07, hw + .03), P(1, a + .07, hw + .03), P(1, a, hw + .02), P(-1, a, hw + .02), L1('#ffb860')); Q4(P(-1, a + .16, hw + .055), P(1, a + .16, hw + .055), P(1, a + .09, hw + .035), P(-1, a + .09, hw + .035), L1('#e0903a')); } }
      // the eave's edge: a thick dark tile band following the curve, its lower lip catching the floodlight, the corners lifting
      for(let q = 0; q < RT * 2; q++){ const u0 = q / RT - 1, u1 = (q + 1) / RT - 1, h0 = he + LIFT * RF[q], h1 = he + LIFT * RF[q + 1];
        Q4(P(u0, r, h0), P(u1, r, h1), P(u1, r, h1 + TH), P(u0, r, h0 + TH), F('#262836')); if(!small) Q4(P(u0, r, h0), P(u1, r, h1), P(u1, r, h1 + .025), P(u0, r, h0 + .025), L1('#d88a3c')); if(fine) Q4(P(u0, r, h0 + TH - .015), P(u1, r, h1 + TH - .015), P(u1, r, h1 + TH), P(u0, r, h0 + TH), F('#5a5e70')); }
      // the hips: a pale moonlit line from each lifted corner up to the next body (drawn only where the slope shows)
      if(up && !small) for(const u of [-1, 1]){ const c0 = P(u, r, he + TH + LIFT), c1 = P(u, a1, hi); PJ(c0[0], c0[1], c0[2]); const x0 = PJX, y0 = PJY; PJ(c1[0], c1[1], c1[2]); if(c0[0] > cs + ZNEAR && c1[0] > cs + ZNEAR) pline(x0, y0, PJX, PJY, F('#6a7088'), 1); } }
    // one body: dark timber frame, white plaster panels glowing warm, the middle bay's door
    function bodySide(t, sd){ const a = t.a, hb = t.hb, h1 = t.hb + t.bh, P = (u, h) => sd ? [ZF(u * a), X0 + side * a, h] : [ZF(-a), X0 + u * a, h];
      const Q4 = (p1, p2, p3, p4, col) => wq(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2], p4[0], p4[1], p4[2], col), B = (u0, u1, h0, hh, col) => Q4(P(u0, h0), P(u1, h0), P(u1, hh), P(u0, hh), col);
      if(small){ B(-1, 1, hb, h1, L1(sd ? '#9a7a5a' : '#c8a070')); return; }
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
    if(fog < .8 && !small){ PJ(ZF(-.6), X0, 1.4); glow(PJX, PJY, Math.min(H * .2, PJU * 1.6), '#ff9a3a', .08 * (1 - fog)); } }
  function heroes(L, far, fogAt){ cam(); const cs = camSeg();
    for(const hz of [[L.ZG, 'g'], [L.ZP, 'p']]){ const d = hz[0] - cs; if(d < -2) continue; const isFar = d > DRAW - 40; if(isFar !== far) continue; if(d > NX - 2) continue;
      const fog = HFOG(d); if(hz[1] === 'g') gate(hz[0], L.XG, fog); else pagoda(hz[0], L.XP, fog, 0); } }

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
    if(i === Math.floor(L.ZG)) sp.push({ env:KEY, type:'hero', x:0, k:i, L, h:'g' }); if(i === Math.floor(L.ZP)) sp.push({ env:KEY, type:'hero', x:0, k:i, L, h:'p' });
    for(const side of [-1, 1]){ const Bk = bAt(L.back[side < 0 ? 0 : 1], i); if(Bk) sp.push({ env:KEY, type:'b', x:side * Bk.x0, k:i, b:Bk }); }
    if(L.kawa){ const Bw = bAt(L.kawa, i); if(Bw) sp.push({ env:KEY, type:'b', x:-Bw.x0, k:i, b:Bw }); }
    for(const side of [-1, 1]){ const B = bAt(L.rows[side < 0 ? 0 : 1], i); if(B) sp.push({ env:KEY, type:'b', x:side * B.x0, k:i, b:B }); }
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
    if(fog < .6){ // the far wall: rough stones in staggered courses, a lit top course
      const V = (h0, h1, col) => poly4(a.x - a.w * 2.86, a.y - h0 * a.w, b.x - b.w * 2.86, b.y - h0 * b.w, b.x - b.w * 2.86, b.y - h1 * b.w, a.x - a.w * 2.86, a.y - h1 * a.w, col);
      V(-WL, .04, f((i & 1) ? '#3a3a42' : '#46444c')); if(a.w > 14){ V(-WL + .035, -WL + .045, f('#22222a')); if((i % 3) === 0) V(-WL, .04, f('#2a2a32')); } V(.03, .04, f('#6a6670')); }
    Q(-2.86, -3.3, f('#2a2830'), .04, .04);
    // the reflections: under every lit teahouse window, long broken dashes (they shimmer slowly; steady under reduced motion)
    if(fog < .55 && L.kawa){ const Bw = bAt(L.kawa, i); if(Bw){ const ph = reduce ? 0 : Math.floor(now / 260), col = Bw.lit ? f((i + ph) % 3 ? '#e8a050' : '#ffd890') : f((i + ph) % 3 ? '#4a3020' : '#6a4428'), ok = ((i * 7 + ph) % 5) < 4;   // (an unlit teahouse still throws its porch lamp: dim dashes)
        if(ok) for(const X of [-2.15, -2.45, -2.7]) if(H1(Bw.sd + X + i * .01) < .75) Q(X - .07, X + .07, col, -WL, -WL); else if(((i + ph) & 3) === 0) Q(X - .03, X + .03, f('#6a4a30'), -WL, -WL); }
      if((i % 22) > 8 && (i % 22) < 14 && ((i + (reduce ? 0 : Math.floor(now / 300))) & 1)) Q(-1.3, -1.36, f('#ffd89a'), -WL, -WL); } }

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
    if(t === 'str') return drawString(sp, x, y, uw, fog, now);
    if(t === 'float'){ if(sp.L.sp && SPA.L === sp.L && !GX.includes('float')) floatDraw(sp.L, fog, now); return; }
    if(t === 'hero'){ if(GX.includes('hero')) return; cam(); const d = (sp.h === 'g' ? sp.L.ZG : sp.L.ZP) - camSeg(); if(d > DRAW - 40) return; const L = sp.L, fg = HFOG(d); if(sp.h === 'g') gate(L.ZG, L.XG, fg); else pagoda(L.ZP, L.XP, fg, 0); } }

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
    buildStrips(); buildPeople(); if(!LEAF.length) for(let q = 0; q < 18; q++) LEAF.push([H1(q * 3.1), H1(q * 7.3), .4 + H1(q * 1.9) * .6, q % 3]); yield;
    try{ if(typeof MUSIC !== 'undefined' && MUSIC.ROAD_THEME && !MUSIC.ROAD_THEME[KEY]) MUSIC.ROAD_THEME[KEY] = 'snow'; }catch(e){}
    try{ cx.save(); cx.globalAlpha = .004; for(const c of [INK, RIDGE, CITY].concat(PEOPLE)) if(c) cx.drawImage(c, 0, 0, 1, 1); cx.restore(); }catch(e){ try{ cx.restore(); }catch(e2){} }
    cx.clearRect(0, 0, W, H); }

  ENV.gion = { _lay:lay, _visit:visitOf, _spa:SPA, _PJ:(z, x, h) => { cam(); PJ(z, x, h); return [PJX, PJY, PJU]; },
    kerbs:true, moonDX:.12, road:['#24222c', '#22202a'], lampCol:'#6a5038',
    warm(){ for(const _ of warmSteps()); }, warmSteps, place, lit, draw, roadFX, backdrop, overlay, hingeIn:() => 'sign' };
})();
