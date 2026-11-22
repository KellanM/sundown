/* Sundown environment: Akihabara (秋), Chūō-dōri through the Electric Town at night, early 1980s. See env/README.md for the hooks;
   study, rules and practice log in research/sundown-craft/akiba.md. Set piece in this file: 停電 TEIDEN, the blackout wave (MECH.sp_teiden).

   References inspected at pixel zoom (Wikimedia Commons; rules taken, nothing copied):
   - "Akihabara 1976" and the Fortepan street shots (100651, 100652): whole store faces wrapped in signs. A yellow cladding studded in
     a diamond relief carries huge katakana in white and pale blue with a red outline; orange and red vertical blades on steel frames
     with white characters, a floor number at the foot; columns of small plates on every narrow building; a wooden pole with a
     transformer drum and a tangle of wires in front. -> face bands (one sign per floor), corner blades, plate columns, the poles and wires.
   - "Akihabara Main Street south side at night" (2017, yagi-s): looking down Chūō-dōri, the Sōbu line's dark teal plate girder spans the
     whole street at about two storeys; a yellow-banded train runs on it, its windows the brightest band; a mesh railing on top; tall
     lit blades crowd both sides, rows of white street lamps lead to the bridge, and many dark wires cross the frame.
     -> the bridge as the street's destination; the train; the white lamps; the wires.
   - Manseibashi overpass (2010) and "Sobu line train near Akihabara" (2014): green riveted plate girders with stiffeners, a yellow and
     black clearance band and a clearance plate over the road, shops under the arches beside the street. -> the girder face, the band,
     the 3.8M plate, the under-track stalls beyond the kerbs.
   - "103 series inserting saha 103-750": the canary-yellow commuter cars of the era. -> the train's body ramp.
   - Taito Station and the 2011 arcade shot: crane cabinets in a row, white and pink frames, a lit marquee, the glass box bright with
     prizes. -> the arcade's street floor.
   - Radio Kaikan (2nd building): a big yellow box sign with red letters on the roof over a plain banded facade. -> the roof boards.
   Everything here is projected geometry on the pixel grid (building faces are slices between segments; the bridge, trucks and facades
   across the cross streets are world polygons clipped at the near plane). Text on the faces is projected glyph cells; text that faces
   the camera (blades, plates, boards) is DotGothic16 thresholded into one atlas and drawn 1:1. */
"use strict";
(() => {
  const KEY = 'akiba';
  const QA = new URLSearchParams(location.search), AKSP = QA.get('aksp'), AKX = (QA.get('akx') || '').split(','), AKU = AKX.includes('used');
  const snp = v => Math.round(v / PX) * PX, sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t), H1 = n => hash(n);
  const fin = v => v === v && v !== Infinity && v !== -Infinity;
  let KI = -1; const landK = () => KI >= 0 ? KI : (KI = LANDS.findIndex(l => l.key === KEY));
  const FH = .62, G = .74;   // a storey and the street floor (shops are tall), in half-road widths

  // ---------------------------------------------------------------- palette (night; ramps hue-shifted: shadows to violet, lights to warm)
  // (night values: the cladding between the signs sits dark, so the plates and the shops carry the light; the greyscale check of round 1
  // showed the day colours of the references as one pale wall)
  const CLAD = { yellow:['#24160e', '#4e3416', '#86601e'], white:['#1a1824', '#363442', '#62606e'], red:['#260a14', '#4e121e', '#842432'], grey:['#121020', '#222030', '#3c3a4a'],
    tile:['#180e16', '#2e1e26', '#4e3640'], violet:['#100a1a', '#1e1430', '#382852'], blue:['#0a1024', '#162244', '#2c4474'], cream:['#201a1c', '#443a34', '#746652'] };
  // sign plates [plate, ink, glyph style]: W white with a dark outline, R red ink, B blue ink, Y yellow with an outline
  const PAN = [['#f6f0e2', '#d0182a', 'R'], ['#ffd23a', '#c8141e', 'R'], ['#e2283a', '#ffffff', 'W'], ['#2a5ed0', '#ffffff', 'W'], ['#1e9658', '#ffffff', 'W'], ['#ff7a1a', '#ffffff', 'W'], ['#f6f0e2', '#1a3a9a', 'B'], ['#18121e', '#ffd23a', 'Y']];
  const PANL = [], PANS = [];   // (PANS: each plate's slug colour, its ink a third of the way back to the plate)   // each plate's lit top edge (filled in warm: no engine helper runs at load)
  const STY = { W:['#ffffff', '#2a0612'], R:['#d0182a', null], B:['#1a3a9a', null], Y:['#ffd23a', '#2a1200'] };
  const BW = ['電気', '無線', 'ラジオ', 'カメラ', 'ゲーム', '免税', '家電', 'マイコン', 'オーディオ', 'ビデオ', 'パーツ', 'ステレオ', '真空管', '電卓', '時計', '激安', '特価', 'テレビ'];
  const PW = ['無線', '部品', '電子', '特価', '修理', '中古', '電線', '工具', '喫茶', '買取', '計測', '電池', '音響', '照明'];
  const GW = '電気街', TKMSG = ' 秋葉原 電気街 大特価 免税 ラジオ カメラ テレビ ステレオ マイコン ';
  const SOD = '#e8f0ff', LAMPC = '#dce8ff';   // the street lamps are mercury white, not sodium (the reference's rows of white lamps)
  const DK = '#0a0810';
  let CAT = 'o'; const AKC = {};   // ?akx=cnt: fillRects per part of the street (a profiling aid)

  // ---------------------------------------------------------------- fog and the blackout, colour caches (no strings per call)
  let fogLow = '#1c1630', LOWIN = ''; const FC = new Map(), DKC = new Map();
  const fc = (c, f) => { const q = Math.round(clamp(f, 0, 1) * 24); let a = FC.get(c); if(a === undefined){ if(FC.size > 900) FC.clear(); a = new Array(25); FC.set(c, a); } return a[q] || (a[q] = mixc(c, fogLow, q / 24 * .86)); };
  const dk = c => { let d = DKC.get(c); if(d === undefined){ d = mixc(mixc(c, '#3a3a44', .5), DK, .8); DKC.set(c, d); } return d; };   // a dead sign: greyed and nearly black
  const setLow = c => { if(c === LOWIN) return; LOWIN = c; const [r, g, b] = hx(c), q = '#' + (QA.get('akrain') !== '0' ? [r * .6 + 30, g * .6 + 27, b * .6 + 42] : [r, g, b]).map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); if(q !== fogLow){ fogLow = q; FC.clear(); } };
  let FF = 0, ON = 1; const F = c => fc(c, FF), L1 = c => fc(ON ? c : dk(c), FF * .6);   // F: a surface; L1: a light (lit or dead), hazed less
  const CLX = v => v < -W ? -W : v > 2 * W ? 2 * W : v, CLY = v => v < -H ? -H : v > 2 * H ? 2 * H : v;
  function poly4(x1, y1, x2, y2, x3, y3, x4, y4, col){ if(!fin(x1 + y1 + x2 + y2 + x3 + y3 + x4 + y4)) return; window.poly(CLX(x1), CLY(y1), CLX(x2), CLY(y2), CLX(x3), CLY(y3), CLX(x4), CLY(y4), col); }
  function R(x, y, w, h, col){ if(!fin(x + y + w + h)) return; if(x > W + PX || y > H + PX || x + w < -PX || y + h < -PX) return; const x0 = Math.max(-PX, x), y0 = Math.max(-PX, y), x1 = Math.min(W + PX, x + w), y1 = Math.min(H + PX, y + h); if(x1 <= x0 || y1 <= y0) return; cx.fillStyle = col; pxRect(x0, y0, x1 - x0, y1 - y0); }   // (clipped to the screen: both edges, never shifted)

  // ---------------------------------------------------------------- the world camera (as env/kurobe.js) for objects across segments
  const NX = 1500, XA = new Float64Array(NX + 1), YA = new Float64Array(NX + 1); let CFR = -1, BI = 0, CAMX = 0, CAMY = 0, CAMZ = 0, PJX = 0, PJY = 0, PJU = 0;
  function cam(){ if(CFR === DRAWN) return; CFR = DRAWN; const base = segAt(position); BI = base.index; const bp = (position % SEG) / SEG, ps = segAt(position + PZ), pp = ((position + PZ) % SEG) / SEG;
    CAMY = lerp(ps.p1.world.y, ps.p2.world.y, pp) + CAMH; CAMX = playerX * ROADW; CAMZ = position;
    let x = 0, dx = -(base.curve * bp), y = base.p1.world.y;
    for(let n = 0; n < NX; n++){ const s = segs[BI + n]; XA[n] = x; YA[n] = s ? s.p1.world.y : y; if(s){ y = s.p2.world.y; x += dx; dx += s.curve; } else x += dx; }
    XA[NX] = x; YA[NX] = y; }
  const ZNEAR = .4, camSeg = () => CAMZ / SEG;
  function PJ(zs, X, h){ let n = zs - BI; const cz = Math.max(ZNEAR * SEG, zs * SEG - CAMZ); if(n < 0) n = 0; if(n > NX - 1) n = NX - 1;
    const i = n | 0, f = n - i, xo = XA[i] + (XA[i + 1] - XA[i]) * f, wy = YA[i] + (YA[i + 1] - YA[i]) * f, sc = DEPTH / cz;
    PJU = sc * ROADW * W / 2; PJX = W / 2 + sc * (xo - CAMX + X * ROADW) * W / 2; PJY = H / 2 - PITCH - sc * (wy - CAMY) * H / 2 - h * PJU; }   // heights in the sprites' unit (uw per half-road width), as every prop's y - h * uw
  /* A world polygon (up to 4 corners in WZ/WX/WH): clipped against the near plane in the world (corners nearer than ZNEAR are cut off along
     the edges, never clamped), projected, clipped to [-W, 2W] x [-H, 2H] on screen (Sutherland-Hodgman), refused if any value is not
     finite, and filled as a fan of quads on the pixel grid. */
  const WZ = new Float64Array(4), WX = new Float64Array(4), WH = new Float64Array(4), CZ = new Float64Array(8), CXa = new Float64Array(8), CHa = new Float64Array(8);
  const SX = new Float64Array(16), SY = new Float64Array(16), TX = new Float64Array(16), TY = new Float64Array(16);
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
      if(ii){ TX[k] = SX[i]; TY[k] = SY[i]; k++; } if(ii !== jj && k < 15){ const t = (v - pi) / (pj - pi); TX[k] = SX[i] + (SX[j] - SX[i]) * t; TY[k] = SY[i] + (SY[j] - SY[i]) * t; k++; } }
    for(let i = 0; i < k; i++){ SX[i] = TX[i]; SY[i] = TY[i]; } return k; }
  function clipBox(m){ m = clipEdge(m, 0, -W, true); if(m < 3) return 0; m = clipEdge(m, 0, 2 * W, false); if(m < 3) return 0; m = clipEdge(m, 1, -H, true); if(m < 3) return 0; return clipEdge(m, 1, 2 * H, false); }
  function fan(m, col){ for(let i = 1; i + 1 < m; i += 2){ const k = i + 2 < m ? i + 2 : i + 1; window.poly(SX[0], SY[0], SX[i], SY[i], SX[i + 1], SY[i + 1], SX[k], SY[k], col); } }
  // a camera-facing plane at world z: its screen origin and scale (x = OX + X * OU, y = OY - h * OU); false if behind the near plane
  let OX = 0, OY = 0, OU = 0;
  function plane(z){ if(z < camSeg() + ZNEAR) return false; PJ(z, 0, 0); OX = PJX; OY = PJY; OU = PJU; return fin(OX + OY + OU) && OU > 0; }
  function PR(X0, X1, h0, h1, col){ const xa = OX + X0 * OU, xb = OX + X1 * OU; R(Math.min(xa, xb), OY - h1 * OU, Math.abs(xb - xa), (h1 - h0) * OU, col); }

  // ---------------------------------------------------------------- text: glyph masks for the faces, one atlas for the camera-facing signs
  const CHARS = (() => { const s = new Set(); for(const w of BW.concat(PW, [GW, TKMSG, '停電点灯'])) for(const c of w) if(c !== ' ') s.add(c); return [...s]; })();
  const GM = { 3:{}, 6:{}, 12:{}, o12:{} };   // per char: Uint8Array(N * N) coverage masks for the projected face text
  const SZ = [8, 12, 16, 24, 32, 48, 64];        // atlas sizes (canvas px); 16, 32, 48 are DotGothic16's own pixel grid
  const GA = {};                              // GA[style][char][si] = { ax, ay, w, h }
  let ATLY = 0, ATL = null, AG = null, SC = null, SG = null, TK = null, TKW = 0, FONT = false;
  const fontOK = () => !document.fonts || !document.fonts.check || document.fonts.check('16px DotGothic16');
  function mask(ch, size){ const n = size + 4; SG.clearRect(0, 0, 80, 80); SG.font = size + 'px DotGothic16'; SG.textBaseline = 'top'; SG.fillStyle = '#fff'; SG.fillText(ch, 2, 2);
    const d = SG.getImageData(0, 0, n, n).data, m = new Uint8Array(n * n); for(let p = 0; p < n * n; p++) m[p] = d[p * 4 + 3] > 110 ? 1 : 0; return { m, n }; }
  function box(m, n){ let x0 = n, y0 = n, x1 = -1, y1 = -1; for(let y = 0; y < n; y++) for(let x = 0; x < n; x++) if(m[y * n + x]){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; } return x1 < 0 ? null : [x0, y0, x1, y1]; }
  let BTK = 0;   // the stepped build's ticket: a newer build (the font arriving) abandons an older one paused mid-way
  function* buildTextG(){ if(!ATL) return; const bt = ++BTK;   /* (stepped: first 60 s, research/sundown-craft/first60.md) */ yield; if(bt !== BTK) return; FONT = fontOK(); yield; if(bt !== BTK) return; const need = {}; yield; if(bt !== BTK) return; for(const s of 'WRBY') need[s] = new Set(); yield; if(bt !== BTK) return;
    for(const w of BW) for(const c of w) for(const s of 'WRBY') need[s].add(c); yield; if(bt !== BTK) return; for(const w of PW) for(const c of w) for(const s of 'WRB') need[s].add(c); yield; if(bt !== BTK) return; for(const c of GW) need.R.add(c), need.W.add(c); yield; if(bt !== BTK) return;
    // face masks: the 16 px glyph (its own grid), squared to its ink box, sampled to 12, 6 and 3 cells by coverage
    for(const ch of CHARS){ const { m, n } = mask(ch, 16), b = box(m, n) || [0, 0, n - 1, n - 1], bw = b[2] - b[0] + 1, bh = b[3] - b[1] + 1, S = Math.max(bw, bh), ox = b[0] - (S - bw) / 2, oy = b[1] - (S - bh) / 2;
      for(const N of [3, 6, 12]){ const o = new Uint8Array(N * N); for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){ let k = 0, t = 0; const ya = oy + r * S / N, yb = oy + (r + 1) * S / N, xa = ox + c * S / N, xb = ox + (c + 1) * S / N;
          for(let y = Math.floor(ya); y < Math.ceil(yb); y++) for(let x = Math.floor(xa); x < Math.ceil(xb); x++){ t++; if(x >= 0 && y >= 0 && x < n && y < n && m[y * n + x]) k++; } o[r * N + c] = t && k / t >= (N === 3 ? .34 : .4) ? 1 : 0; }
        GM[N][ch] = o; }
      const g = GM[12][ch], ol = new Uint8Array(144); for(let r = 0; r < 12; r++) for(let c = 0; c < 12; c++){ let v = 0; for(let dy = -1; dy <= 1 && !v; dy++) for(let dx = -1; dx <= 1 && !v; dx++){ const rr = r + dy, cc = c + dx; if(rr >= 0 && cc >= 0 && rr < 12 && cc < 12 && g[rr * 12 + cc]) v = 1; } ol[r * 12 + c] = v; } GM.o12[ch] = ol;  yield; if(bt !== BTK) return; } yield; if(bt !== BTK) return;
    /* The atlas (round 3: about half the memory, the same pixels on screen). The 48 and 64 px cells are built only for characters that can
       be drawn that big: the words on the faces, blades, boards and the bridge (BW, GW). A plate's word (PW) can't: a plate is .36 wide, and
       while any of it is on screen its cell is under about 38 canvas px, so a plate never picks past 32. The cells are packed in shelves by
       height (tallest first) into a 1024-wide atlas sized to fit. (DotGothic16 is not a pure dot grid above 16 px, e.g. 電 is 16x16 at 16
       but 30x30 at 32, so the big sizes can't be scaled from the small ones.) FULL (?akx=fullatl) builds every cell, for the diff. */
    const FULL = AKX.includes('fullatl'), E = [], RAST = new Map(), BIG = new Set(); yield; if(bt !== BTK) return; for(const w of BW.concat([GW])) for(const c of w) BIG.add(c); yield; if(bt !== BTK) return;
    const rast = (ch, z) => { const k = ch + '|' + z; let r = RAST.get(k); if(!r){ const q = mask(ch, z); r = { m:q.m, n:q.n, b:box(q.m, q.n) }; RAST.set(k, r); } return r; }; yield; if(bt !== BTK) return;
    for(const st of 'WRBY'){ const out = STY[st][1], O = GA[st] || (GA[st] = {});
      for(const ch of need[st]){ const T = O[ch] = [];
        for(let si = 0; si < SZ.length; si++){ const z = SZ[si];
          if(!FULL && z >= 48 && !BIG.has(ch)){ T[si] = null; continue; }
          const r = rast(ch, z); if(!r.b){ T[si] = null; continue; } const ow = out ? Math.max(1, Math.round(z / 16)) : 0, w = r.b[2] - r.b[0] + 1 + ow * 2, h = r.b[3] - r.b[1] + 1 + ow * 2;
          const g = { ax:0, ay:0, w, h, sw:w, sh:h, k:st + z, r, ow, st }; T[si] = g; E.push(g); } yield; if(bt !== BTK) return; }  yield; if(bt !== BTK) return; } yield; if(bt !== BTK) return;
    E.sort((a, b) => b.h - a.h || b.w - a.w); yield; if(bt !== BTK) return; { let x = 0, y = 0, rh = 0; yield; if(bt !== BTK) return; const AW = ATL.width; yield; if(bt !== BTK) return; for(const g of E){ if(x + g.w > AW){ x = 0; y += rh + 1; rh = 0; } g.ax = x; g.ay = y; x += g.w + 1; if(g.h > rh) rh = g.h;  yield; if(bt !== BTK) return; } yield; if(bt !== BTK) return; ATLY = y + rh; yield; if(bt !== BTK) return; } yield; if(bt !== BTK) return;
    if(ATL.height !== ATLY + 1) ATL.height = ATLY + 1; yield; if(bt !== BTK) return; AG.clearRect(0, 0, ATL.width, ATL.height); yield; if(bt !== BTK) return;   // (a resize, never a new canvas)
    for(const g of E){ const { m, n, b } = g.r, ow = g.ow, [fill, out] = STY[g.st], x = g.ax, y = g.ay;
      if(out){ AG.fillStyle = out; let t0 = performance.now(); for(let yy = b[1]; yy <= b[3]; yy++){ for(let xx = b[0]; xx <= b[2]; xx++) if(m[yy * n + xx]) AG.fillRect(x + xx - b[0], y + yy - b[1], ow * 2 + 1, ow * 2 + 1); if(performance.now() - t0 > 3){ yield; if(bt !== BTK) return; AG.fillStyle = out; t0 = performance.now(); } } }
      AG.fillStyle = fill; for(let yy = b[1]; yy <= b[3]; yy++){ let xs = -1; for(let xx = b[0]; xx <= b[2] + 1; xx++){ const on = xx <= b[2] && m[yy * n + xx]; if(on && xs < 0) xs = xx; if(!on && xs >= 0){ AG.fillRect(x + ow + xs - b[0], y + ow + yy - b[1], xx - xs, 1); xs = -1; } } }
      delete g.r;  yield; if(bt !== BTK) return; } yield; if(bt !== BTK) return;
    RAST.clear(); yield; if(bt !== BTK) return;
    // the LED ticker: the message as amber dots at a pitch of 2 (a lit dot and a gap), the dead dots dim, 8 rows
    if(TK){ const k = TK.getContext('2d'); yield; if(bt !== BTK) return; k.fillStyle = '#1a0c06'; yield; if(bt !== BTK) return; k.fillRect(0, 0, TK.width, TK.height); yield; if(bt !== BTK) return; let tx = 0; yield; if(bt !== BTK) return;
      for(const ch of TKMSG){ if(ch === ' '){ tx += 6; continue; } const { m, n } = mask(ch, 8), b = box(m, n); if(!b) continue;
        for(let yy = 0; yy < 8; yy++) for(let xx = b[0]; xx <= b[2]; xx++){ const on = yy + 1 < n && m[(yy + 1) * n + xx]; k.fillStyle = on ? '#ffb02a' : '#3a1a0a'; k.fillRect((tx + xx - b[0]) * 2, yy * 2, 1, 1); }
        tx += b[2] - b[0] + 2;  yield; if(bt !== BTK) return; } yield; if(bt !== BTK) return;
      TKW = Math.min(TK.width, tx * 2); yield; if(bt !== BTK) return; } yield; if(bt !== BTK) return; }
  function buildText(){ for(const _ of buildTextG()); }   // (the same build at once; buildTextG is it stepped)
  // a glyph from the atlas, centred on (x, y), 1:1 (one atlas px per canvas px)
  const USED = {};   // ?akx=used: which (style, size) the frame actually puts on screen (to size the atlas)
  function gblit(g, x, y){ if(!g || !ATL) return; const w = g.w * PX, h = g.h * PX; if(AKU && x + w / 2 > 0 && x - w / 2 < W && y + h / 2 > 0 && y - h / 2 < H) USED[g.k] = (USED[g.k] || 0) + 1; cx.drawImage(ATL, g.ax, g.ay, g.sw, g.sh, snp(x - w / 2), snp(y - h / 2), w, h); }
  const gpick = (st, ch, px) => { const T = GA[st] && GA[st][ch]; if(!T) return null; for(let si = SZ.length - 1; si >= 0; si--){ const g = T[si]; if(g && Math.max(g.w, g.h) * PX <= px) return g; } return null; };

  // ---------------------------------------------------------------- graphic signage (round 4): pixel art built once, painted at screen resolution
  /* Kellan, round 4: "it all looks like text instead of graphics or advertisements, and they look flat". The street's signs are now pictures:
     big banners on the blades (round 6: no characters), key art on the roof billboards and end walls, brand blocks (a colour field, an emblem, a logotype; kana
     an accent), icon plates, two animated hero screens at the crossings and small attract screens on the arcades. Every piece is composed
     once at warm-up into a pixel buffer, compiled into a rect list (runs merged down the rows) plus a canvas and two averaged mips, and painted
     as Neon Ward's screen building is: the list straight onto the canvas with each edge on the pixel whose centre it covers once an art pixel
     passes 2 screen pixels, the atlas cell (or a mip) below that. Nothing here is built during a ride. All characters, names and marks are
     invented for this road. */
  const AI = (w, h) => ({ w, h, c:new Array(w * h).fill(null) });
  const ap = (I, x, y, col) => { if(x >= 0 && y >= 0 && x < I.w && y < I.h) I.c[y * I.w + x] = col; };
  const ag = (I, x, y) => x >= 0 && y >= 0 && x < I.w && y < I.h ? I.c[y * I.w + x] : null;
  function af(I, x, y, w, h, col){ for(let yy = y; yy < y + h; yy++) for(let xx = x; xx < x + w; xx++) ap(I, xx, yy, col); }
  // a grid sprite: rows of characters and a map char -> colour; '.' is clear
  const SP = (rows, map) => ({ rows, map, w:rows.reduce((m, r) => Math.max(m, r.length), 0), h:rows.length });
  function as(I, S, x, y, flip, over){ for(let r = 0; r < S.h; r++){ const row = S.rows[r]; for(let c = 0; c < row.length; c++){ const ch = row[c]; if(ch === '.') continue; const col = over && over[ch] !== undefined ? over[ch] : S.map[ch]; if(col) ap(I, flip ? x + S.w - 1 - c : x + c, y + r, col); } } }
  // a 1-px outline around everything drawn in L (4-neighbours), then L laid over I at (x, y)
  function aol(L, col){ const O = AI(L.w, L.h); for(let y = 0; y < L.h; y++) for(let x = 0; x < L.w; x++){ const v = L.c[y * L.w + x]; if(v){ O.c[y * L.w + x] = v; continue; } if(ag(L, x - 1, y) || ag(L, x + 1, y) || ag(L, x, y - 1) || ag(L, x, y + 1)) O.c[y * L.w + x] = col; } return O; }
  function alay(I, L, x, y){ for(let yy = 0; yy < L.h; yy++) for(let xx = 0; xx < L.w; xx++){ const v = L.c[yy * L.w + xx]; if(v) ap(I, x + xx, y + yy, v); } }
  // vertical gradient bands (stepped, never smooth): n colours top to bottom with a 2x2 dither at each seam
  function agrad(I, x, y, w, h, cols){ const n = cols.length; for(let yy = 0; yy < h; yy++){ const t = yy / h * n, k = Math.floor(t), f = t - k; for(let xx = 0; xx < w; xx++){ const c = k + 1 < n && f > .7 && ((xx + yy) & 1) ? cols[k + 1] : cols[Math.min(n - 1, k)]; ap(I, x + xx, y + yy, c); } } }
  // a kana / kanji accent from DotGothic16 (the warm-up's scratch canvas), optionally outlined; returns its width
  function akana(I, s, size, x, y, col, out){ let cx0 = x; for(const ch of s){ const { m, n } = mask(ch, size), b = box(m, n); if(!b){ cx0 += size >> 1; continue; }
      const gw = b[2] - b[0] + 1; if(out) for(let yy = b[1]; yy <= b[3]; yy++) for(let xx = b[0]; xx <= b[2]; xx++) if(m[yy * n + xx]) af(I, cx0 + xx - b[0] - 1, y + yy - b[1] - 1, 3, 3, out);
      for(let yy = b[1]; yy <= b[3]; yy++) for(let xx = b[0]; xx <= b[2]; xx++) if(m[yy * n + xx]) ap(I, cx0 + xx - b[0], y + yy - b[1], col); cx0 += gw + 1; } return cx0 - x; }
  // a 3x5 logotype face (invented marks only), scaled by s, with an optional outline and a drop shadow
  const F5 = { A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111', K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', R:'110101110101101', S:'011100010001110', T:'111010010010010', U:'101101101101111', V:'101101101101010', X:'101101010101101', Y:'101101010010010', Z:'111001010100111', '-':'000000111000000', '!':'010010010000010', '1':'010110010010111', '2':'111001111100111', '0':'111101101101111', '8':'111101111101111' };
  function alogo(I, s, x, y, k, col, out, sh){ const L = AI(s.length * 4 * k + 2, 5 * k + 2); for(let c = 0; c < s.length; c++){ const g = F5[s[c]]; if(!g) continue; for(let p = 0; p < 15; p++) if(g[p] === '1') af(L, 1 + (c * 4 + p % 3) * k, 1 + ((p / 3) | 0) * k, k, k, col); }
    const O = out ? aol(L, out) : L; if(sh){ const Sh = AI(O.w, O.h); for(let i = 0; i < O.c.length; i++) if(O.c[i]) Sh.c[i] = sh; alay(I, Sh, x, y); }
    alay(I, O, x - 1, y - 1); return s.length * 4 * k - k; }
  // compile: runs per row, a run identical to one directly above extends it downward; a canvas; mips averaged 2x2 and 4x4 (alpha kept)
  function acomp(I){ const R = [], C = []; let prev = [];
    for(let y = 0; y < I.h; y++){ const cur = []; let x = 0; while(x < I.w){ const col = I.c[y * I.w + x]; if(!col){ x++; continue; } let e = x + 1; while(e < I.w && I.c[y * I.w + e] === col) e++;
        let p = null; for(const q of prev) if(q.x === x && q.w === e - x && q.col === col){ p = q; break; } if(p){ R[p.i * 4 + 3]++; cur.push(p); } else { const i = C.length; C.push(col); R.push(x, y, e - x, 1); cur.push({ x, w:e - x, col, i }); } x = e; } prev = cur; }
    const cv = mk(I.w, I.h), k = cv.getContext('2d'); for(let i = 0; i < C.length; i++){ k.fillStyle = C[i]; k.fillRect(R[i * 4], R[i * 4 + 1], R[i * 4 + 2], R[i * 4 + 3]); }
    const A = { w:I.w, h:I.h, R:Int16Array.from(R), C, n:C.length, cv, m2:null, m4:null, avg:'#000' };
    // (the mips and the average come from the buffer itself, never a read back from the canvas: no GPU stall at warm-up)
    const D = new Uint8ClampedArray(I.w * I.h * 4); for(let p = 0; p < I.c.length; p++){ const col = I.c[p]; if(!col) continue; const v = hx(col); D[p * 4] = v[0]; D[p * 4 + 1] = v[1]; D[p * 4 + 2] = v[2]; D[p * 4 + 3] = 255; }
    const mip = f => { const w = Math.max(1, Math.ceil(I.w / f)), h = Math.max(1, Math.ceil(I.h / f)), c = mk(w, h), q = c.getContext('2d'), o = q.createImageData(w, h);
        for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let r = 0, g = 0, b = 0, a = 0, t = 0; for(let yy = y * f; yy < Math.min(I.h, y * f + f); yy++) for(let xx = x * f; xx < Math.min(I.w, x * f + f); xx++){ const p = (yy * I.w + xx) * 4, al = D[p + 3] / 255; r += D[p] * al; g += D[p + 1] * al; b += D[p + 2] * al; a += al; t++; }
          const p = (y * w + x) * 4; if(a > 0){ o.data[p] = r / a; o.data[p + 1] = g / a; o.data[p + 2] = b / a; } o.data[p + 3] = a / t > .5 ? 255 : 0; } q.putImageData(o, 0, 0); return c; };
    A.m2 = mip(2); A.m4 = mip(4); A.L = [{ c:cv, x:0, y:0, w:I.w, h:I.h }, { c:A.m2, x:0, y:0, w:A.m2.width, h:A.m2.height }, { c:A.m4, x:0, y:0, w:A.m4.width, h:A.m4.height }]; { let r = 0, g = 0, b = 0, a = 0; for(let p = 0; p < D.length; p += 4) if(D[p + 3]){ r += D[p]; g += D[p + 1]; b += D[p + 2]; a++; } if(a) A.avg = '#' + [r, g, b].map(v => Math.round(v / a).toString(16).padStart(2, '0')).join(''); }
    return A; }
  // a screen edge for an art edge: the first canvas pixel whose centre lies past it (nearest-neighbour sampling, as env/neon.js jbE)
  const jbE = (o, u, s) => Math.ceil((o + (u + 1e-5) * s) / PX - .5) * PX;
  /* Paint art A with its top-left at (left, top), k screen px per art px. Above 2 px per art px (1.3 cost too much at mid range): the rect list, each edge snapped as the
     nearest-neighbour blit would put it (so the switch shows no change). Below: the canvas, or a mip once an art pixel is under 3/4 of a
     screen pixel (no sparkle far away). A dead sign (the blackout) is the art under a near-black veil; fog is a veil of the low sky. */
  function art(A, left, top, k){ if(!A || !AT || !(k > 0) || !fin(left + top)) return; const w = A.w * k, h = A.h * k; if(left > W + PX || top > H + PX || left + w < -PX || top + h < -PX) return;
    if(k > PX * 2 && !AKNR){ const R = A.R, C = A.C; for(let i = 0, n = A.n; i < n; i++){ const o = i * 4, x0 = jbE(left, R[o], k), x1 = jbE(left, R[o] + R[o + 2], k); if(x1 <= x0 || x1 <= 0 || x0 >= W) continue; const y0 = jbE(top, R[o + 1], k), y1 = jbE(top, R[o + 1] + R[o + 3], k); if(y1 <= y0 || y1 <= 0 || y0 >= H) continue; cx.fillStyle = C[i]; cx.fillRect(x0, y0, x1 - x0, y1 - y0); } }
    else { const x0 = jbE(left, 0, k), x1 = jbE(left, A.w, k), y0 = jbE(top, 0, k), y1 = jbE(top, A.h, k); if(x1 <= x0 || y1 <= y0) return; cx.imageSmoothingEnabled = false;
      const Lv = A.L[k < PX * .375 ? 2 : k < PX * .75 ? 1 : 0]; cx.drawImage(AT, Lv.x, Lv.y, Lv.w, Lv.h, x0, y0, x1 - x0, y1 - y0); }
    veil(left, top, w, h); }
  function veil(x, y, w, h){ const a0 = cx.globalAlpha; if(!ON){ cx.globalAlpha = a0 * .88; cx.fillStyle = DK; pxRect(x, y, w, h); } if(FF > .02){ cx.globalAlpha = a0 * Math.min(.8, FF * .6); cx.fillStyle = fogLow; pxRect(x, y, w, h); } cx.globalAlpha = a0; }
  // a lightbox's glow: two rings of its light, fading (pixel falloff, no blur); none when dead or far in the fog
  const AKNR = AKX.includes('norect'), AKNH = AKX.includes('nohalo');
  // (opaque rings, each its own stepped mix toward the night: no alpha state per sign, which cost frames on the GPU canvas)
  function halo(x, y, w, h, col, a){ if(!ON || FF > .7 || w < PX * 6 || AKNH) return;
    for(let r = 1, rn = w < PX * 16 ? 1 : 2; r <= rn; r++){ cx.fillStyle = fc(mixc(col, '#0a0816', r === 1 ? 1 - .42 * a : 1 - .2 * a), FF); const d = PX * r; pxRect(x - d, y - d, w + d * 2, PX); pxRect(x - d, y + h + d - PX, w + d * 2, PX); pxRect(x - d, y - d + PX, PX, h + d * 2 - PX * 2); pxRect(x + w + d - PX, y - d + PX, PX, h + d * 2 - PX * 2); }
    // the downpour: the light scatters in the rain, two dithered rings further out (pixels of its colour, 1/4 then 1/8 of them; no blur)
    if(RAINON && FF < .5 && w >= PX * 10){ const P2 = hazeP(col), d0 = PX * 3, t = Math.max(PX * 2, snp(Math.min(w, h) * .09)); cx.fillStyle = P2[0]; ring(x, y, w, h, d0, t); cx.fillStyle = P2[1]; ring(x, y, w, h, d0 + t, t + PX); } }
  function ring(x, y, w, h, d, t){ pxRect(x - d - t, y - d - t, w + 2 * (d + t), t); pxRect(x - d - t, y + h + d, w + 2 * (d + t), t); pxRect(x - d - t, y - d, t, h + 2 * d); pxRect(x + w + d, y - d, t, h + 2 * d); }
  // the dithered haze patterns per light colour (all made in warm-up by hazeWarm; a colour first seen later is made once and kept)
  const HZM = new Map(); let HZPX = 0;
  function hazeP(col){ if(HZPX !== PX){ HZPX = PX; HZM.clear(); } let p = HZM.get(col); if(!p){ p = [ditherPat(col, .25), ditherPat(col, .125)]; HZM.set(col, p); } return p; }
  function hazeWarm(){ for(const k of ['ban', 'bb', 'po', 'band', 'wrap', 'plate']) for(const A of (ART[k] || [])) if(A && A.avg) hazeP(A.avg); for(const Bd of BRANDS) hazeP(Bd.f); for(const c of ['#ff8a2a', '#e8d8a0']) hazeP(c); }
  // ------------------------------------------------ round 6: the title cards' language (ui/cutin.js), no characters
  /* Kellan, round 6: "remove the anime girls. what happened to the koi and beautiful animations inspired by anime? think of the title
     cards". Every girl, idol and the old mecha is gone. The signs are now drawn as the cards are: hard 1-bit edges, three or four colours
     and an ink, a keyline and an offset shadow, screentone on slanted slabs, one big silhouette, a big kanji (DotGothic16's own 16 px dot
     grid, thickened to a woodblock weight). Motifs from the prints and the electric town: a bolt, an oni mask, a maneki-neko, a daruma, a
     game pad, a vacuum tube, a carp climbing the falls; the two hero screens are Hiroshige's cranes and his Ōji foxfires. All invented. */
  const INK = '#0c0812', CREAM = '#f4ecdf';
  const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // screentone: c1 wherever the ordered-dither threshold falls under lev(x, y), 0..1 (the cards' tone())
  function atone(I, x, y, w, h, c1, lev){ for(let yy = y; yy < y + h; yy++) for(let xx = x; xx < x + w; xx++){ const l = lev(xx - x, yy - y); if(l > 0 && (BAY4[(yy & 3) * 4 + (xx & 3)] + .5) / 16 < l) ap(I, xx, yy, c1); } }
  // a slanted slab (a parallelogram leaning right by sl px per row up), the cards' panels
  function slab(I, x, y, w, h, sl, col){ for(let yy = 0; yy < h; yy++){ const o = Math.round((h - 1 - yy) * sl); af(I, x + o, y + yy, w, 1, col); } }
  // a filled polygon (even-odd, pixel centres)
  function apoly(I, P, col){ let y0 = 1e9, y1 = -1e9; for(const p of P){ y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for(let y = Math.floor(y0); y <= Math.ceil(y1); y++){ const yc = y + .5, xs = []; for(let i = 0; i < P.length; i++){ const a = P[i], b = P[(i + 1) % P.length]; if((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((p, q) => p - q); for(let k = 0; k + 1 < xs.length; k += 2) for(let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) ap(I, x, y, col); } }
  function adisc(I, cx0, cy0, r, col){ for(let y = -r; y <= r; y++) for(let x = -r; x <= r; x++) if(x * x + y * y <= r * r + r * .6) ap(I, cx0 + x, cy0 + y, col); }
  // a layer inked as the cards are: its shadow offset (d, d), a keyline round it, then the layer
  function inkL(I, L, x, y, line, sh, d){ const O = line ? aol(L, line) : L; if(sh) for(let yy = 0; yy < O.h; yy++) for(let xx = 0; xx < O.w; xx++) if(O.c[yy * O.w + xx]) ap(I, x + xx + d, y + yy + d, sh); alay(I, O, x, y); }
  // a sprite as its own layer (fills only; the keyline comes from inkL), optionally zoomed and recoloured
  function spL(S, z, over, flip){ z = z || 1; const L = AI(S.w * z, S.h * z); asz(L, S, 0, 0, z, over, flip); return L; }
  // a big kanji layer: DotGothic16's mask at 16 px (its own dot grid), each dot z x z, thickened one pixel at 2x (a woodblock weight)
  function kanL(ch, z, col){ const { m, n } = mask(ch, 16), b = box(m, n); if(!b) return AI(1, 1); const e = z > 1 ? 1 : 0, w = (b[2] - b[0] + 1) * z + e, h = (b[3] - b[1] + 1) * z + e, L = AI(w, h);   // (at 1x the font's own dots, unthickened: 電 and 鶴 stay legible)
    for(let y = b[1]; y <= b[3]; y++) for(let x = b[0]; x <= b[2]; x++) if(m[y * n + x]) af(L, (x - b[0]) * z, (y - b[1]) * z, z + e, z + e, col); return L; }
  // a red seal (hanko): a square, a cream kanji cut into it
  function seal(I, ch, x, y, col){ const K = kanL(ch, 1, CREAM); af(I, x, y, K.w + 4, K.h + 4, col); af(I, x + 1, y + 1, K.w + 2, 1, mixc(col, '#ffffff', .25)); alay(I, K, x + 2, y + 2); return K.w + 4; }

  // ------------------------------------------------ the motifs, drawn as fills on the pixel grid (inkL adds the keyline)
  // an oni mask (from the setsubun masks and Kuniyoshi's demons): horns, heavy brows, gold eyes, fangs; light from the left
  const ONI = SP([
    'c..............c',
    'cc............cc',
    '.cc..rrrrrr..cc.',
    '.ccrrrrrrrrrrcc.',
    '..rrrrrrrrrrRR..',
    '.rrkkkrrrrkkkRR.',
    '.rrrrkkrrkkrrRR.',
    'rrryyykrrkyyyrRR',
    'rrryykkrrkkyyrRR',
    'rrrrrrrrrrrrrrRR',
    'rrrrrrRRRRrrrrRR',
    '.rrrrRrrrrRrrRR.',
    '.rrkkkkkkkkkkRR.',
    '.rrkwkkkkkkwkRR.',
    '..rkkkkkkkkkkR..',
    '..rrrrrrrrrrRR..',
    '...rrrrrrrrRR...',
    '.....rrrrRR.....'], { c:'#f4ecdf', r:'#e0202e', R:'#8a1020', k:'#0c0812', y:'#ffc830', w:'#ffffff' });
  // a maneki-neko, its left paw raised (cream, a red collar, the gold bell, pink ears)
  const NEKO = SP([
    '..cc.....cc...cc..',
    '.cppc...cppc.cccc.',
    '.cpcccccccpc.cppc.',
    'ccccccccccccc.cccc',
    'ccckcccckcccc.cCc.',
    'cckckcckckccc.cCc.',
    'ccccccpcccccc.cCc.',
    'kkccckckccckk.cCc.',
    '.ccccccccccc..cCc.',
    'rrrrrryrrrrrr.cCc.',
    'cccccyyycccccccCc.',
    'ccccccyccccccccC..',
    'cccccccccccccccC..',
    'cccwwwwwwwwccccC..',
    'cccwwwwwwwwccccC..',
    'cccwwwwwwwwccccC..',
    'cccccccccccccccC..',
    'ccccccccccccccCC..',
    'ccrcccccccccrcC...',
    '.cccccccccccccC...'], { c:'#f8f0e0', C:'#c8b090', p:'#ff8aa0', k:'#0c0812', r:'#e0202e', y:'#ffc830', w:'#ffffff' });
  // a daruma: the red body, the white face, brows like waves, one eye painted, the gold band
  const DARUMA = SP([
    '....rrrrrrrR....',
    '..rrrrrrrrrrRR..',
    '.rrrrrrrrrrrrRR.',
    '.rrwwwwwwwwwrRR.',
    'rrwkkkwwwwkkkwRR',
    'rrwwwwwwwwwwwwRR',
    'rrwkkkwwwwkwkwRR',
    'rrwkkkwwwwwkwwRR',
    'rrwwwwwkkwwwwwRR',
    'rrwwkkkwwkkkwwRR',
    '.rrwwwwwwwwwwRR.',
    '.rrrrrrrrrrrrRR.',
    'rryyyyyyyyyyyyRR',
    'rrrrryrrrryrrrRR',
    'rrrrrryyyyrrrrRR',
    '.rrrrrrrrrrrrRR.',
    '..rrrrrrrrrrRR..',
    '....rrrrrrRR....'], { r:'#e0202e', R:'#8a1020', w:'#f8f0e0', k:'#0c0812', y:'#ffc830' });
  // a game pad (the grips, the cross key, two buttons)
  function padL(z){ const L = AI(22 * z, 12 * z), F = (x, y, w, h, c) => af(L, x * z, y * z, w * z, h * z, c), c = '#f4ecdf', C = '#b8b0c8';
    F(2, 1, 18, 7, c); F(1, 2, 20, 6, c); F(0, 4, 7, 6, c); F(15, 4, 7, 6, c); F(1, 10, 5, 1, c); F(16, 10, 5, 1, c); F(15, 8, 7, 2, C); F(19, 4, 3, 4, C);
    F(4, 3, 1, 5, INK); F(2, 5, 5, 1, INK); F(15, 4, 2, 2, '#e0202e'); F(17, 2, 2, 2, '#ffc830'); F(9, 5, 2, 1, '#6a6480'); F(12, 5, 2, 1, '#6a6480'); return L; }
  // a vacuum tube: the glass envelope, the plate, the filament glowing, the base and its pins
  function tubeL(glow){ const L = AI(12, 26), g = '#bfe6f0', G = '#7ab0c8';
    for(let y = 0; y < 20; y++){ const hw = y < 2 ? 3 : y < 4 ? 4 : 5; af(L, 6 - hw, y, hw * 2, 1, y < 2 ? G : '#1c2a3a'); ap(L, 6 - hw, y, g); ap(L, 5 + hw, y, G); }
    af(L, 3, 5, 6, 11, '#5a6070'); af(L, 4, 6, 4, 9, '#2a2e3a'); af(L, 5, 7, 2, 7, glow ? '#ff8a2a' : '#7a3a1a'); if(glow){ af(L, 5, 9, 2, 3, '#ffe2a0'); ap(L, 4, 10, '#ff8a2a'); ap(L, 7, 10, '#ff8a2a'); }
    ap(L, 2, 2, '#ffffff'); ap(L, 2, 3, '#ffffff'); af(L, 1, 20, 10, 4, '#1a1620'); af(L, 1, 20, 10, 1, '#4a4656'); for(const x of [2, 5, 8]) af(L, x, 24, 1, 2, '#c8c0a0'); return L; }
  // a lightning bolt (the electric town's mark)
  function boltL(h, col){ const s = h / 34, L = AI(Math.ceil(17 * s), Math.ceil(35 * s)); apoly(L, [[10, 0], [1, 19], [8, 19], [3, 34], [16, 12], [9, 12], [14, 0]].map(p => [p[0] * s, p[1] * s]), col); return L; }
  // a carp, head up, climbing (koinobori's scales and eye; the carp that becomes a dragon at the top of the falls)
  function carpL(){ const L = AI(14, 34), r = '#e8402a', R = '#a01e1a', o = '#ffb050';
    for(let y = 0; y < 30; y++){ const t = y / 29, hw = Math.round(1 + 5.2 * Math.sin(Math.min(1, t * 1.25) * 3.1416) ** .7 * (t < .85 ? 1 : 1 - (t - .85) * 4)); if(hw <= 0) continue; af(L, 7 - hw, y, hw * 2, 1, r); ap(L, 7 + hw - 1, y, R); }
    for(let y = 9; y < 26; y += 3) for(let x = 3 + ((y / 3) & 1); x < 11; x += 3){ ap(L, x, y, R); ap(L, x + 1, y + 1, R); ap(L, x - 1, y + 1, R); }   // scales: a row of little arcs
    af(L, 5, 1, 4, 1, R); ap(L, 4, 4, '#ffffff'); ap(L, 9, 4, '#ffffff'); ap(L, 4, 5, INK); ap(L, 9, 5, INK);   // the mouth, the eyes
    apoly(L, [[7, 27], [1, 34], [6, 31], [7, 33], [8, 31], [13, 34]], o); apoly(L, [[2, 13], [0, 17], [3, 16]], o); apoly(L, [[12, 13], [14, 17], [11, 16]], o); return L; }
  // icons for the tenant plates and the brand emblems (10 x 10): a coffee cup, a game pad, a chip, a cassette, a camera, a heart, a star, a bolt
  const ICON = [
    SP(['..........', '...a.a....', '....a.a...', '.kkkkkkk..', '.kwwwwwkkk', '.kwwwwwk.k', '.kwwwwwkkk', '..kwwwk...', 'kkkkkkkkk.', '..........'], { k:'#2a1424', w:'#ffffff', a:'#c8c0d8' }),
    SP(['..........', '..........', '.kkkkkkkk.', 'kwwwwwwwwk', 'kwkwwwwrwk', 'kkkkwwrwrk', 'kwkwwwwrwk', 'kwwwkkwwwk', '.kkk..kkk.', '..........'], { k:'#1a1424', w:'#e8e8f0', r:'#ff3a4a' }),
    SP(['.w.w.w.w..', 'kkkkkkkkk.', 'kgggggggk.', 'kgyyyyygk.', 'kgy...ygk.', 'kgy...ygk.', 'kgyyyyygk.', 'kgggggggk.', 'kkkkkkkkk.', '.w.w.w.w..'], { k:'#0a0a14', g:'#2a2e3a', y:'#ffd23a', w:'#d8d8e0' }),
    SP(['..........', 'kkkkkkkkkk', 'kwwwwwwwwk', 'kwkkwwkkwk', 'kwkokkokwk', 'kwkkwwkkwk', 'kwwwwwwwwk', 'kwwkkkkwwk', 'kkkkkkkkkk', '..........'], { k:'#1a1424', w:'#f0ece0', o:'#ff7a1a' }),
    SP(['..........', '...kkk....', 'kkkkkkkkkk', 'kwwkkkkwwk', 'kwkbbbbkwk', 'kwkbBBbkwk', 'kwkbbbbkwk', 'kwwkkkkwwk', 'kkkkkkkkkk', '..........'], { k:'#14121c', w:'#e8e8f0', b:'#3a5ad8', B:'#a8d0ff' }),
    SP(['..........', '.kkk..kkk.', 'krrrkkrrrk', 'krWrrrrrrk', 'krrrrrrrrk', '.krrrrrrk.', '..krrrrk..', '...krrk...', '....kk....', '..........'], { k:'#3a0820', r:'#ff3a7a', W:'#ffffff' }),
    SP(['....kk....', '....yk....', '...kyyk...', 'kkkkyykkkk', 'kyyyyyyyyk', '.kyyyyyyk.', '..kyyyyk..', '.kyykkyyk.', '.kyk..kyk.', '.kk....kk.'], { k:'#3a1a00', y:'#ffe23a' }),
    SP(['.....kkk..', '....kyyk..', '...kyyk...', '..kyyk....', '.kyyyyyk..', '..kkkyyk..', '....kyk...', '...kyk....', '...kk.....', '..........'], { k:'#3a1a00', y:'#ffe23a' })];
  const IC_CUP = 0, IC_PAD = 1, IC_CHIP = 2, IC_TAPE = 3, IC_CAM = 4, IC_HEART = 5, IC_STAR = 6, IC_BOLT = 7;
  /* The brands (invented): a field colour, its lit and shadow steps, the ink, an outline for the logotype, an emblem, a logotype, a kana
     accent. A building carries one brand on all its signs, so a store reads as one colour block before any word (the references' red
     and yellow towers). */
  const BRANDS = [
    { f:'#d8202e', fl:'#ff5a5a', fd:'#8a1020', ink:'#ffffff', out:'#5a0814', ac:'#ffd23a', ic:IC_BOLT, logo:'DEN', kana:'デンキ' },
    { f:'#ffd23a', fl:'#fff2a0', fd:'#c8901a', ink:'#d8141e', out:'#3a1400', ac:'#ffe23a', ic:IC_STAR, logo:'KIRA', kana:'ゲーム' },
    { f:'#2a5ed0', fl:'#6a9aff', fd:'#16307a', ink:'#ffffff', out:'#0a1440', ac:'#4af0ff', ic:IC_CHIP, logo:'MYCO', kana:'ソフト' },
    { f:'#1e9658', fl:'#5ad08a', fd:'#0e5a32', ink:'#ffffff', out:'#04301a', ac:'#ffe23a', ic:IC_TAPE, logo:'TONE', kana:'ラジオ' },
    { f:'#ff7a1a', fl:'#ffb06a', fd:'#a8400a', ink:'#ffffff', out:'#4a1800', ac:'#ffd8a0', ic:IC_CAM, logo:'FOTO', kana:'カメラ' },
    { f:'#ff5aa8', fl:'#ffa8d0', fd:'#a82a6a', ink:'#ffffff', out:'#4a0a2a', ac:'#fff2a0', ic:IC_CUP, logo:'MOE', kana:'メイド' },
    { f:'#18121e', fl:'#3a3048', fd:'#08060c', ink:'#ffd23a', out:'#000000', ac:'#ff3a4a', ic:IC_BOLT, logo:'MAX', kana:'セール' }];
  const KBRAND = { denki:[0, 6, 2, 3], camera:[4, 0], radio:[3, 2], arcade:[1, 5], pencil:[5, 2, 3, 4], plain:[2, 6, 0] };
  // ------------------------------------------------ compositions
  const lite = (c, t) => mixc(c, '#ffffff', t), dark = (c, t) => mixc(c, '#06040c', t);
  function sparkle(I, x, y, col){ ap(I, x, y, col); ap(I, x - 1, y, col); ap(I, x + 1, y, col); ap(I, x, y - 1, col); ap(I, x, y + 1, col); }
  // halftone dots on a diagonal grid (the banners' print texture), in a step lighter than the field
  function dots(I, x, y, w, h, col, p){ for(let yy = 0; yy < h; yy += p) for(let xx = ((yy / p) & 1) * (p >> 1); xx < w; xx += p) ap(I, x + xx, y + yy, col); }
  /* The big vertical banners (22 x 62, the old character banners' boxes): a field, a slanted screentone slab, the motif inked with its
     keyline and a shadow in the slab's colour, the kanji at the foot (cream, keyline, shadow), a seal or a rule. */
  const BAN = [
    { f:'#141018', s:'#d0102a', t:'#ffc830', k:'電', m:'bolt' },
    { f:'#1a1034', s:'#ffb030', t:'#3a2a6a', k:'鬼', m:'oni' },
    { f:'#c8142a', s:'#ff6a5a', t:'#8a0a1a', k:'招', m:'neko' },
    { f:'#ffc830', s:'#fff2b0', t:'#d0102a', k:'福', m:'daruma' },
    { f:'#221a5a', s:'#3ad8ff', t:'#ff4aa0', k:'遊', m:'pad' },
    { f:'#0c1828', s:'#1e6a7a', t:'#ff8a2a', k:'光', m:'tube' }];
  function banner(v){ const D = BAN[v], I = AI(22, 62); af(I, 0, 0, 22, 62, D.f);
    slab(I, -6, 6, 22, 30, .4, D.s); atone(I, 0, 0, 22, 62, D.s, (x, y) => y < 6 ? .55 - y * .05 : y > 36 && y < 44 ? .35 - (y - 36) * .04 : 0);   // the slab, the tone fading off its edges
    atone(I, 0, 6, 22, 30, D.f, (x, y) => (x + y) % 9 < 1 ? 1 : 0);   // speed hatching across it
    const sh = dark(D.s, .55);
    if(D.m === 'bolt') inkL(I, boltL(34, D.t), 3, 4, INK, sh, 2);
    else if(D.m === 'oni'){ inkL(I, spL(ONI, 1), 3, 10, INK, sh, 2); for(const [x, y] of [[2, 4], [19, 30]]) sparkle(I, x, y, CREAM); }
    else if(D.m === 'neko') inkL(I, spL(NEKO, 1), 1, 8, INK, sh, 2);
    else if(D.m === 'daruma'){ inkL(I, spL(DARUMA, 1), 3, 12, INK, sh, 2); af(I, 0, 2, 22, 1, D.t); }
    else if(D.m === 'pad'){ inkL(I, padL(1), 0, 16, INK, sh, 2); for(const [x, y] of [[4, 6], [17, 9], [12, 32]]) sparkle(I, x, y, D.t); }
    else { inkL(I, tubeL(true), 5, 6, INK, sh, 2); for(let r = 7; r < 12; r += 2) for(let a = 0; a < 16; a++){ const q = a / 16 * 6.283; if(a & 1) ap(I, 11 + Math.round(Math.cos(q) * r), 16 + Math.round(Math.sin(q) * r * 1.2), '#ffb060'); } }
    af(I, 0, 41, 22, 21, INK); af(I, 0, 41, 22, 1, D.t);   // the foot: ink, a rule in the accent
    inkL(I, kanL(D.k, 1, CREAM), 3, 43, null, D.t, 1); af(I, 2, 60, 18, 1, D.t);
    return acomp(I); }

  /* Roof billboards (48 x 28), front-lit by their spotlights: 0 the electric town (the bolt, 電気); 1 a valve-amp shop (tubes glowing);
     2 a space game; 3 a cat cafe (the maneki-neko); 4.. the brands' blocks (emblem, logotype, kana). */
  const NBB = 4;
  function billboard(v){ const I = AI(48, 28);
    if(v === 0){ af(I, 0, 0, 48, 28, '#141018'); slab(I, 4, 0, 30, 28, .45, '#d0102a'); atone(I, 0, 0, 48, 28, '#ff5a3a', (x, y) => x > 8 && x < 40 ? .18 + .25 * (1 - y / 28) : 0);
      inkL(I, boltL(26, '#ffc830'), 2, 0, INK, '#5a0410', 2); inkL(I, kanL('電', 1, CREAM), 16, 3, INK, '#5a0410', 1); inkL(I, kanL('気', 1, CREAM), 31, 9, INK, '#5a0410', 1); alogo(I, 'DENKI', 17, 22, 1, '#ffc830', null, null); }
    else if(v === 1){ agrad(I, 0, 0, 48, 28, ['#0c1828', '#10222e', '#1a2a2a']); atone(I, 0, 18, 48, 10, '#2a4a4a', (x, y) => y / 10);
      for(let q = 0; q < 3; q++){ const L = tubeL(true); inkL(I, L, 3 + q * 9, 1 + (q & 1) * 2, INK, null, 0); }
      for(let r = 6; r < 16; r += 3) for(let a = 0; a < 24; a++){ const q = a / 24 * 6.283; if(a % 3 === 0) ap(I, 16 + Math.round(Math.cos(q) * r * 1.4), 12 + Math.round(Math.sin(q) * r), '#ff8a2a'); }
      af(I, 30, 3, 17, 15, CREAM); af(I, 31, 4, 15, 13, '#d0102a'); inkL(I, kanL('音', 1, CREAM), 31, 4, null, '#5a0410', 1); alogo(I, 'TUBE', 30, 21, 1, '#ff8a2a', null, null); }
    else if(v === 2){ agrad(I, 0, 0, 48, 28, ['#0a0a28', '#14104a', '#2a1060']); for(let q = 0; q < 18; q++) ap(I, (q * 23 + 7) % 48, (q * 13 + 3) % 28, q % 3 ? '#8a8ac8' : '#ffffff');
      for(let y = 0; y < 12; y++){ const w = Math.round(Math.sqrt(Math.max(0, 144 - (12 - y) * (12 - y))) * 1.6); af(I, 48 - w, 16 + y, w, 1, y < 2 ? '#ffb06a' : y & 2 ? '#d8603a' : '#a83a3a'); }   // the planet's limb
      as(I, SHIP, 6, 11, false); for(let q = 0; q < 3; q++) as(I, FOE, 22 + q * 8, 4 + (q & 1) * 3, false); ap(I, 14, 8, '#ffffff'); ap(I, 14, 6, '#ffffff');
      alogo(I, 'STAR-8', 2, 2, 1, '#ffe23a', '#a83a1a', null); akana(I, 'ゲーム', 10, 2, 17, '#ffffff', null); }
    else if(v === 3){ af(I, 0, 0, 48, 28, '#c8142a'); atone(I, 0, 0, 48, 28, '#ff5a5a', (x, y) => .5 - Math.abs(x - 12) / 30); slab(I, 22, 4, 30, 16, .5, CREAM);
      inkL(I, spL(NEKO, 1), 2, 4, INK, '#5a0410', 2); inkL(I, kanL('猫', 1, '#d0102a'), 27, 4, null, null, 0); alogo(I, 'CAFE', 25, 22, 1, CREAM, null, null); }
    else { const Bd = BRANDS[(v - NBB) % BRANDS.length]; agrad(I, 0, 0, 48, 28, [Bd.fl, Bd.f, Bd.f, Bd.fd]); af(I, 0, 0, 48, 1, lite(Bd.f, .6));
      af(I, 1, 3, 13, 13, Bd.out); af(I, 2, 4, 11, 11, '#ffffff'); as(I, ICON[Bd.ic], 2, 4, false); const lw = Bd.logo.length * 8 - 2; alogo(I, Bd.logo, 16 + Math.round((31 - lw) / 2), 5, 2, Bd.ink, Bd.out, null);
      af(I, 0, 17, 48, 11, Bd.out); const kw = akana(I, Bd.kana, 10, 2, 18, Bd.ac, null); for(let x = kw + 6; x < 46; x += 4) af(I, x, 22, 2, 2, Bd.ac); }
    return acomp(I); }
  const SHIP = SP(['....k.....', '...kwk....', '...kwk....', '..kwbwk...', '.kwwbwwk..', 'kwrwwwwrk.', 'kwkkwkkwk.', '.k.koOk...', '....kk....'], { k:'#0a0814', w:'#e8ecff', b:'#3ae8ff', r:'#ff3a4a', o:'#ffe23a', O:'#ff7a1a' });
  const FOE = SP(['.k...k.', 'kgk.kgk', 'kgggggk', 'kgyggyk', '.kgggk.', 'k.k.k.k'], { k:'#0a0814', g:'#3ad86a', y:'#ffffff' });
  /* End-wall posters (32 x 48), lightboxes on the wall above a shorter neighbour: 0 an oni (a game's key art: the mask at 2x on a red
     burst, 鬼 in a cream slab); 1 the carp climbing the falls (鯉); 2.. a brand tower (the emblem, the logotype stacked, the kana down a column). */
  const NPO = 2;
  function poster(v){ const I = AI(32, 48);
    if(v === 0){ af(I, 0, 0, 32, 48, '#141018'); for(let q = 0; q < 16; q++){ const a = q / 16 * 6.283; if(q & 1) apoly(I, [[16, 18], [16 + Math.cos(a) * 40, 18 + Math.sin(a) * 40], [16 + Math.cos(a + .2) * 40, 18 + Math.sin(a + .2) * 40]], '#8a1020'); }
      inkL(I, spL(ONI, 2), -1, 1, INK, '#ffb030', 2); slab(I, 2, 37, 26, 11, .3, CREAM); inkL(I, kanL('鬼', 1, '#d0102a'), 9, 38, null, null, 0); alogo(I, 'ONI', 22, 42, 1, INK, null, null); }
    else if(v === 1){ agrad(I, 0, 0, 32, 48, ['#0b2350', '#1f4f8a', '#1f4f8a', '#0b2350']);
      for(let x = 0; x < 32; x += 2){ const ph = (x * 7) % 13; for(let y = ph; y < 48; y += 13) af(I, x, y, 1, 5 + (x % 3), x % 6 ? '#3a6aa8' : '#7fb0d4'); }   // the falls: streaks of foam
      atone(I, 0, 40, 32, 8, '#fbf8ee', (x, y) => .3 + y / 12); inkL(I, carpL(), 9, 5, INK, '#0b2350', 2); af(I, 0, 0, 19, 19, '#efe4c8'); af(I, 0, 19, 19, 1, '#14244a'); inkL(I, kanL('鯉', 1, '#14244a'), 1, 1, null, null, 0); seal(I, '登', 23, 27, '#c0392a'); }
    else { const Bd = BRANDS[(v - NPO) % BRANDS.length]; agrad(I, 0, 0, 32, 48, [Bd.fl, Bd.f, Bd.f, Bd.f, Bd.fd]); dots(I, 0, 0, 32, 48, lite(Bd.f, .15), 4);
      af(I, 7, 2, 18, 18, Bd.out); af(I, 8, 3, 16, 16, '#ffffff'); asz(I, ICON[Bd.ic], 9, 4, 1); af(I, 0, 22, 32, 1, Bd.fl); const lw = Bd.logo.length * 8 - 2; alogo(I, Bd.logo, Math.round((32 - lw) / 2), 25, 2, Bd.ink, Bd.out, null);
      af(I, 0, 37, 32, 11, Bd.out); akana(I, Bd.kana, 10, 2, 38, Bd.ac, null); }
    return acomp(I); }
  /* A face band (80 x 12): the brand's field, its lit top and shadow foot, the emblem in a roundel, the logotype, the kana accent, chevrons. */
  function band(v){ const Bd = BRANDS[v], I = AI(88, 12); af(I, 0, 0, 88, 12, Bd.f); af(I, 0, 0, 88, 1, Bd.fl); af(I, 0, 11, 88, 1, Bd.fd);
    af(I, 2, 1, 10, 10, '#ffffff'); ap(I, 2, 1, Bd.f); ap(I, 11, 1, Bd.f); ap(I, 2, 10, Bd.f); ap(I, 11, 10, Bd.f); as(I, ICON[Bd.ic], 2, 1, false);
    const lw = alogo(I, Bd.logo, 15, 1, 2, Bd.ink, Bd.out, null); const kx = 15 + lw + 4; const kw = akana(I, Bd.kana, 10, kx, 1, Bd.ink, null);
    for(let x = kx + kw + 3; x < 85; x += 5) for(let q = 0; q < 3; q++){ ap(I, x + q, 4 + q, Bd.fl); ap(I, x + q, 8 - q, Bd.fl); }
    return acomp(I); }
  /* Two-floor wraps (96 x 24): 0 the game pad on a cyan slab, 遊 and GAME; 1 three daruma in a row, 福 and SALE. Brand wraps follow. */
  function wrap(v){ const I = AI(96, 24);
    if(v === 0){ af(I, 0, 0, 96, 24, '#221a5a'); slab(I, 6, 0, 46, 24, .6, '#3ad8ff'); atone(I, 0, 0, 96, 24, '#3a2a8a', (x, y) => x > 56 ? .5 - y / 60 : 0); atone(I, 6, 0, 60, 24, '#221a5a', (x, y) => (x + y) % 7 < 1 ? 1 : 0);
      inkL(I, padL(1), 10, 6, INK, '#16104a', 2); inkL(I, kanL('遊', 1, CREAM), 40, 3, INK, '#ff4aa0', 2); alogo(I, 'GAME', 60, 4, 2, '#ffc830', INK, null); akana(I, 'ゲーム', 10, 62, 14, CREAM, null); }
    else { af(I, 0, 0, 96, 24, '#ffc830'); atone(I, 0, 0, 96, 24, '#fff2b0', (x, y) => .55 - y / 40); slab(I, 54, 2, 40, 20, .5, '#d0102a');
      for(let q = 0; q < 3; q++) inkL(I, spL(DARUMA, 1), 2 + q * 17, 4 + (q & 1), INK, '#c8901a', 2); inkL(I, kanL('福', 1, CREAM), 62, 4, INK, '#5a0410', 1); alogo(I, 'SALE', 79, 10, 1, CREAM, null, null); }
    return acomp(I); }

  // ------------------------------------------------ the hero screens (64 x 40 LEDs, frames at 120 ms)
  // a red-crowned crane flying left, three wing positions (from the Wellcome "Six cranes flying upward above a breaking wave": the long
  // black neck held straight out, the red crown, the white body, the black tuft of the folded secondaries, the legs trailing straight)
  const CRMAP = { k:'#0c0812', w:'#f8f6ee', W:'#a8b0cc', g:'#c8a860', r:'#e0202e' };
  const CRANE = [SP([
    '..........................k.k.k.........',
    '.........................kwkwkwk........',
    '........................kkwwwwk.........',
    '......................kkwwwwk...........',
    '.....................kwwwWwwk...........',
    '....................kwwwWwwk............',
    '...................kwwwWwwwk............',
    '..................kwwWwwwwk.............',
    '.................kwwWwwwwwk.............',
    '..rk.............kwwwwwwwk..............',
    'ggkkk...........kwwwwwwwwkkkk...........',
    '....kkkk.......kwwwwwwwwwkkkkk..........',
    '.......kkkkk..kwwwwwwwwwwwkkkkkkkkkkkkk.',
    '...........kkkwwwwwwwwwwwkk..........kk.',
    '..............kkkkkkkkkkk...............'], CRMAP), SP([
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '.................kkkkkkkkkkkkkk.k.k.....',
    '..rk...........kkwwwwwwwwwwwwwwkwkwk....',
    'ggkkk.........kwwwWwwwWwwwWwwwwwwk......',
    '....kkkk.....kwwwwwwwwwwwwkkkkkkk.......',
    '.......kkkkk.kwwwwwwwwwwwwkkkkkkkkkkkkk.',
    '...........kkkwwwwwwwwwwwkk..........kk.',
    '..............kkkkkkkkkkk...............'], CRMAP), SP([
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '..rk....................................',
    'ggkkk...................................',
    '....kkkk.........kkkkkkkkkkk............',
    '.......kkkkk..kkwwwwwwwwwwwkkkk.........',
    '...........kkkwwwwwwwwwwwwwkkkkkkkkkkkk.',
    '..............kwwwwwwwwwwwkk.........kk.',
    '...............kwwWwwwwwwk..............',
    '................kwwWwwwwk...............',
    '.................kwwWwwk................',
    '..................kwwWwk................',
    '...................kwwwk................',
    '....................kwk.................',
    '.....................k..................'], CRMAP)];
  // the small cranes of the flock (12 x 7)
  const CRS = [SP(['......k.....', '.....kwk....', 'rk..kwk.....', 'gkkkwwwkkkk.', '....kkkk....'], CRMAP), SP(['............', '.....kkkk...', 'rk..kwwwwk..', 'gkkkwwwkkkk.', '....kkkk....'], CRMAP), SP(['............', '............', 'rk..........', 'gkkkwwwkkkk.', '....kwwk....', '.....kwk....', '......k.....'], CRMAP)];
  const WING = [0, 0, 1, 2, 2, 1];   // the beat: a hold at the top (anticipation), the snap down, a hold, the recovery
  function moonSky(I){ agrad(I, 0, 0, 64, 40, ['#10163a', '#18234e', '#22326a', '#2a3c78']);
    for(let q = 0; q < 9; q++) ap(I, (q * 29 + 5) % 64, (q * 17 + 2) % 22, q % 3 ? '#6a78b0' : '#e8e4d0');
    atone(I, 24, 0, 40, 34, '#34488a', (x, y) => { const d = Math.hypot(x - 18, y - 15); return d < 18 ? .5 - (d - 13) * .09 : 0; });   // the moon's halo in tone
    adisc(I, 42, 15, 12, '#f4e2a8'); for(let y = -12; y <= 12; y++) for(let x = -12; x <= 12; x++){ const d = x * x + y * y; if(d <= 150 && (x - 5) * (x - 5) + (y - 3) * (y - 3) > 140 && ((x + y) & 1)) ap(I, 42 + x, 15 + y, '#d8c080'); }
    for(const [x, y] of [[38, 11], [46, 18], [44, 9]]) ap(I, x, y, '#e8d090');
    // woodblock cloud bars: flat, round-ended, a lit top edge (Hiroshige's banded mist)
    for(const [x, y, w] of [[-4, 26, 34], [30, 29, 40], [8, 33, 22]]){ af(I, x + 1, y, w - 2, 3, '#3a4c8a'); af(I, x, y + 1, w, 1, '#3a4c8a'); af(I, x + 1, y, w - 2, 1, '#7a8ac8'); }
    // a pine bough from the right edge in ink (the print's frame)
    for(const [x, y, r] of [[60, 34, 6], [52, 37, 5], [63, 28, 4]]) for(let a = 0; a < 13; a++){ const q = Math.PI + a / 12 * Math.PI; for(let t = 1; t <= r; t++) ap(I, x + Math.round(Math.cos(q) * t), y + Math.round(Math.sin(q) * t * .7), a & 1 ? '#0e1a24' : '#1a3038'); }
    for(let x = 48; x < 64; x++) ap(I, x, 38 - Math.round((x - 48) * .5), '#0c0812'); }
  // a crane laid into the frame: white with its keyline, but a black silhouette wherever it crosses the moon (the print's trick)
  function craneIn(I, S, x, y){ const L = spL(S, 1); for(let yy = 0; yy < L.h; yy++) for(let xx = 0; xx < L.w; xx++){ const v = L.c[yy * L.w + xx]; if(!v) continue; const X = x + xx, Y = y + yy, inMoon = (X - 42) * (X - 42) + (Y - 15) * (Y - 15) <= 150;
      ap(I, X, Y, inMoon ? (v === CRMAP.r ? '#a01020' : INK) : v); } }
  /* Hero 1, 鶴 (40 frames): 0-5 the moon and its mist, still; 6-29 a crane crosses in front of it, beating (hold, snap, hold), its
     silhouette black against the moon; two small cranes follow, high; 30 a white flash; 31-39 the seal 鶴 stamped, held. */
  function craneFrame(f){ const I = AI(64, 40); moonSky(I);
    for(let q = 0; q < 2; q++){ const t = f - 14 - q * 5; if(t >= 0 && t < 26){ const b = (t + q * 3) % 6; craneIn(I, CRS[WING[b]], 66 - t * 3, 1 + q * 4 - (WING[b] === 2 ? 1 : 0)); } }
    if(f >= 6 && f < 30){ const t = f - 6, b = t % 6, x = 64 - Math.round(t * 4.4), y = 6 + (WING[b] === 2 ? -1 : WING[b] === 0 ? 1 : 0); craneIn(I, CRANE[WING[b]], x, y); }
    if(f === 30) for(let y = 18; y < 40; y++) af(I, 0, y, 26, 1, '#ffffff');
    if(f >= 31){ const s = f === 31 ? 1 : 0; seal(I, '鶴', 3 - s, 18 - s, '#d0102a'); }
    for(let y = 1; y < 40; y += 2) for(let x = 0; x < 64; x++){ const c = I.c[y * 64 + x]; if(c) I.c[y * 64 + x] = dark(c, .1); }   // the scan rows
    return acv(I); }
  // a fox running right (the foxes of Hiroshige's "New Year's Eve foxfires at the changing tree, Oji": pale cream, thin legs, the
  // brush tail streaming, a warm shade under it); the top half shared, the legs in four gallop positions
  const FXMAP = { c:'#f6e6c8', C:'#d4a878', w:'#ffffff', k:'#0c0812', o:'#e8803a' };
  const FOXTOP = [
    '.....................c...c....',
    '.....................cc..cc...',
    '.....................ccccccc..',
    'ww...................ccckccccc',
    'wwww................cccccccccck',
    'wwwccc..............cccccC....',
    '.wwcccc............ccccccccc..',
    '..occccccc.......ccccccccccc..',
    '...occcccccccccccccccccccccc..',
    '....ooccccccccccccccccccccccc.',
    '.....oCcccccccccccccccccccccC.',
    '.......CCccccccccccccccccccC..',
    '..........CCCCCCCCCCCCCCCC....'];
  const FOXLEG = [
    ['........CC............CC......', '......CC................CC....', '....CC....................CC..', '...C........................C.'],
    ['..........CC........CC........', '...........CC......CC.........', '............CC....CC..........', '............C......C..........'],
    ['.........C...........C........', '.........C...........C........', '........C...........C.........', '.......CC..........CC.........'],
    ['.........CC.........CC........', '..........C........C..........', '...........CC......CC.........', '............C.......C.........']];
  const FOX = FOXLEG.map(lg => SP(FOXTOP.concat(lg), FXMAP)), FOXC = SP(FOXTOP.concat(['........CCC.........CCC.......']), FXMAP);
  // foxfire: a small flame, two flickers (orange, a pale core, a red tip)
  const FLAME = [SP(['..r..', '..o..', '.ooo.', '.oyo.', 'ooyoo', 'oyyyo', '.ooo.'], { r:'#c8401a', o:'#ff8a2a', y:'#ffe0a0' }), SP(['.r...', '..o..', '.ooo.', '.oyo.', 'ooyyo', 'oyyyo', '.ooo.'], { r:'#c8401a', o:'#ff8a2a', y:'#ffe0a0' })];
  // one big vermilion torii, centred (the Inari shrine's gate: the kasagi beam overhanging, the nuki, two posts), with its keyline
  function torii(I){ const v = '#d0402a', V = '#8a2018'; af(I, 12, 4, 40, 3, INK); af(I, 13, 5, 38, 1, v); af(I, 10, 3, 44, 1, INK); af(I, 9, 2, 3, 1, INK); af(I, 52, 2, 3, 1, INK);
    af(I, 17, 7, 30, 2, INK); af(I, 18, 7, 28, 1, V); af(I, 15, 11, 34, 3, INK); af(I, 16, 12, 32, 1, v); af(I, 30, 8, 4, 3, INK); af(I, 31, 8, 2, 3, v);
    for(const px of [19, 42]){ af(I, px - 1, 7, 5, 27, INK); af(I, px, 7, 2, 27, v); af(I, px + 2, 7, 1, 27, V); af(I, px - 2, 32, 7, 2, INK); } }
  /* Hero 2, 狐火 (40 frames), at the Oji print's bar: a still night under one big torii, three foxfires bobbing. 4-15 the fox runs in;
     16-18 it gathers (the crouch, the anticipation); 19-25 the leap, stretched, across the gate, the flames flaring; 26 it lands; 27-33 it
     runs out; 30 the seal 狐 slams in and holds. */
  function foxFrame(f){ const I = AI(64, 40); agrad(I, 0, 0, 64, 40, ['#1a2238', '#222c48', '#2e3a5a', '#34405e']);
    for(let q = 0; q < 8; q++) ap(I, (q * 23 + 3) % 64, (q * 11 + 1) % 14, q & 1 ? '#8a90a8' : '#efe4c8');
    for(let x = 0; x < 64; x++) af(I, x, 25 + Math.round(2 * Math.sin(x * .17) + Math.sin(x * .5)), 1, 9, '#161c30');   // the far wood
    torii(I); af(I, 0, 34, 64, 6, '#10141e'); af(I, 4, 36, 14, 1, '#2e3850'); af(I, 30, 37, 12, 1, '#2e3850'); af(I, 50, 35, 10, 1, '#262e44');   // the ground, Hiroshige's pale patches
    const leap = f >= 19 && f <= 25, flare = leap ? Math.round(2 * Math.sin((f - 19) / 6 * 3.14)) : 0;
    for(let q = 0; q < 3; q++){ const fx0 = [6, 30, 55][q], fy0 = [17, 9, 19][q] + Math.round(Math.sin((f / 40 + q / 3) * 6.283 * 2) * 1.5) - flare; as(I, FLAME[(f + q) & 1], fx0, fy0, false); if(flare > 1) as(I, FLAME[(f + q + 1) & 1], fx0 + (q - 1) * 3, fy0 - 5, false); }
    let S = null, x = 0, y = 18;
    if(f >= 4 && f <= 15){ S = FOX[f & 3]; x = -30 + (f - 4) * 3; y = 19 - (f & 1); }
    else if(f >= 16 && f <= 18){ S = FOXC; x = 4; y = 21 + (f === 17 ? 1 : 0); }
    else if(leap){ const t = (f - 19) / 6; S = FOX[0]; x = 4 + Math.round(t * 30); y = Math.round(19 - 14 * Math.sin(t * 3.1416)); }
    else if(f >= 26 && f <= 33){ S = f === 26 ? FOXC : FOX[f & 3]; x = 34 + (f - 26) * 4; y = f === 26 ? 21 : 19 - (f & 1); }
    if(S) inkL(I, spL(S, 1), x, y, INK, null, 0);
    if(f >= 30){ const s = f === 30 ? 1 : 0; seal(I, '狐', 2 - s, 2 - s, '#d0102a'); }
    for(let y2 = 1; y2 < 40; y2 += 2) for(let x2 = 0; x2 < 64; x2++){ const c = I.c[y2 * 64 + x2]; if(c) I.c[y2 * 64 + x2] = dark(c, .1); }
    return acv(I); }
  /* A brand wrap across two floors (96 x 24, round 5: the FOTO band read best, so the big stores carry it at twice the size): the field
     in three steps, the emblem at 2x in a roundel, the logotype, the kana accent at 12 px, diagonal bars. */
  function wrapBrand(Bd){ const I = AI(96, 24); agrad(I, 0, 0, 96, 24, [Bd.fl, Bd.f, Bd.f, Bd.fd]); af(I, 0, 0, 96, 1, lite(Bd.f, .6));
    af(I, 2, 1, 22, 22, Bd.out); af(I, 3, 2, 20, 20, '#ffffff'); asz(I, ICON[Bd.ic], 3, 2, 2);
    alogo(I, Bd.logo, 28, 2, 2, Bd.ink, Bd.out, null); akana(I, Bd.kana, 12, 28, 13, Bd.ink, null);
    for(let x = 70; x < 96; x += 6) for(let y = 0; y < 24; y++) for(let q = 0; q < 3; q++) ap(I, x + q + Math.floor(y / 2), y, Bd.fl);
    return acomp(I); }
  /* A tenant plate (12 x 16): a colour field, its lit edge, an icon in a white roundel, an ink rule. */
  function plateArt(ic, p){ const P = PAN[p], I = AI(12, 16); af(I, 0, 0, 12, 16, P[0]); af(I, 0, 0, 12, 1, lite(P[0], .5)); af(I, 0, 15, 12, 1, dark(P[0], .35));
    const rd = dark(P[0], .5); af(I, 1, 2, 10, 10, rd); ap(I, 1, 2, P[0]); ap(I, 10, 2, P[0]); ap(I, 1, 11, P[0]); ap(I, 10, 11, P[0]); as(I, ICON[ic], 1, 2, false, { w:lite(P[0], .55), a:lite(P[0], .3), k:dark(P[0], .8) }); af(I, 2, 13, 8, 1, P[1]); return acomp(I); }
  // ------------------------------------------------ the screens: frames as small canvases, drawn scaled with an LED grid (as Neon Ward's)
  const acv = I => { const c = mk(I.w, I.h), k = c.getContext('2d'); for(let y = 0; y < I.h; y++){ let x = 0; while(x < I.w){ const col = I.c[y * I.w + x]; if(!col){ x++; continue; } let e = x + 1; while(e < I.w && I.c[y * I.w + e] === col) e++; k.fillStyle = col; k.fillRect(x, y, e - x, 1); x = e; } } return c; };
  // a sprite at a whole-number zoom (a camera close-up on the video wall: the wall's own LEDs show the zoom, so these are screen pixels)
  function asz(I, S, x, y, z, over, flip){ for(let r = 0; r < S.h; r++){ const row = S.rows[r]; for(let c = 0; c < row.length; c++){ const ch = row[c]; if(ch === '.') continue; const col = over && over[ch] !== undefined ? over[ch] : S.map[ch]; if(col) af(I, x + (flip ? S.w - 1 - c : c) * z, y + r * z, z, z, col); } } }
  /* ------------------------------------------------ the street floor (round 6: Kellan, "the detail of the shops on ground level is not
     where it should be"; the bar is Snow Onsen's inn fronts). Each kind of shop is a picture of its front (128 x 32, two bays, the shop's
     height under the awning), drawn from the street photographs: Radio Center's stalls (walls of drawers, cables and packs on hooks,
     yellow price cards, bare bulbs), the main street's glass fronts (shelves, a wall of televisions, boxes spilling onto the pavement,
     A-frame boards, nobori), the camera stores' counters, the arcades' crane cabinets and capsule machines, vending machines, a closed
     shop's shutter. Laid on the face as the sign bands are (faceArt), so up close it is pixel art, far off its own average colour. */
  const SPI = ['#e0202e', '#2a5ed0', '#f4ecdf', '#1e9658', '#ffc830', '#ff7a1a', '#8a9ab8', '#c8a46a'];
  function sbox(I, x, y, w, h, c){ af(I, x, y, w, h, c); af(I, x, y, w, 1, lite(c, .35)); af(I, x + w - 1, y + 1, 1, h - 1, dark(c, .3)); if(w > 5 && h > 3) af(I, x + 1, y + (h >> 1), w - 2, 1, dark(c, .15)); }
  function pcard(I, x, y, red){ af(I, x, y, 4, 3, red ? '#e0202e' : '#ffd23a'); af(I, x + 1, y + 1, 2, 1, red ? '#ffffff' : '#c8141e'); }
  function tvset(I, x, y, w, h, c){ af(I, x, y, w, h, INK); af(I, x + 1, y + 1, w - 2, h - 2, c); af(I, x + 1, y + 1, w - 2, 1, lite(c, .45)); af(I, x + 2, y + h - 3, 3, 1, lite(c, .3)); ap(I, x + w - 2, y + h - 1, '#4a4656'); }
  function mull(I, x, y0, y1){ af(I, x, y0, 1, y1 - y0, INK); af(I, x + 1, y0, 1, y1 - y0, '#9a9ab0'); }
  function bulb(I, x, y){ ap(I, x, y - 1, '#5a4a3a'); ap(I, x, y, '#fff6c8'); ap(I, x - 1, y + 1, '#ffc060'); ap(I, x + 1, y + 1, '#ffc060'); ap(I, x, y + 1, '#ffe8a0'); }
  // a vending machine (12 x 27): the lit sample window, rows of cans, the buttons, the white lower panel, the slot
  function vend(I, x, y, c){ af(I, x, y, 12, 27, c); af(I, x, y, 12, 1, lite(c, .45)); af(I, x + 11, y + 1, 1, 26, dark(c, .35)); af(I, x + 1, y + 2, 10, 10, '#f2f8ff');
    for(let r = 0; r < 3; r++){ af(I, x + 1, y + 5 + r * 3, 10, 1, '#c8d0e0'); for(let q = 0; q < 4; q++) af(I, x + 2 + q * 2 + (q > 1 ? 1 : 0), y + 3 + r * 3, 1, 2, SPI[(r * 3 + q * 5 + (c.length)) % 8]); }
    for(let q = 0; q < 4; q++) ap(I, x + 2 + q * 2 + (q > 1 ? 1 : 0), y + 12, '#ff5a3a'); af(I, x + 1, y + 14, 10, 7, '#e8e8f0'); af(I, x + 8, y + 15, 2, 3, '#3a3644'); af(I, x + 2, y + 22, 7, 3, INK); af(I, x + 2, y + 22, 7, 1, '#4a4656'); }
  // a capsule machine (8 x 14, two tiers): the white frame, the picture window, the coin dial, the chute
  function gacha(I, x, y, c){ for(let t = 0; t < 2; t++){ const ty = y + t * 7; af(I, x, ty, 8, 7, '#ecebf4'); af(I, x + 7, ty, 1, 7, '#a8a6b8'); af(I, x + 1, ty + 1, 6, 3, c); ap(I, x + 2, ty + 2, '#ffffff'); ap(I, x + 5, ty + 2, lite(c, .5)); af(I, x + 3, ty + 5, 2, 1, '#7a7a90'); ap(I, x + 1, ty + 5, INK); } }
  // a crane-game cabinet (20 x 29): a marquee with bulbs, the lit glass box (the prize heap, the claw), the body and its coin lamp
  function crane(I, x, y, c, k){ const g = k & 1 ? '#fff4fa' : '#eaf8ff'; af(I, x, y, 20, 29, c); af(I, x, y, 20, 1, lite(c, .5)); af(I, x + 19, y, 1, 29, dark(c, .35)); for(let q = 1; q < 19; q += 3) ap(I, x + q, y + 2, '#fff2b0');
    af(I, x + 1, y + 5, 18, 14, g); af(I, x + 1, y + 5, 1, 14, '#ffffff'); af(I, x + 1, y + 5, 18, 1, '#c8c0d8');
    for(let q = 0; q < 6; q++){ const pc = ['#ffd23a', '#ff8ab8', '#8ad0ff', '#a8f07a', '#ffffff', '#ff7a3a'][(q + k) % 6]; af(I, x + 2 + q * 3, y + 15 - (q % 3 === 1 ? 1 : 0), 3, 4, pc); ap(I, x + 3 + q * 3, y + 16, INK); }
    const cm = x + 6 + (k * 5) % 8; af(I, x + 1, y + 6, 18, 1, '#8a8aa0'); af(I, cm, y + 7, 1, 3, '#5a5a70'); af(I, cm - 1, y + 10, 3, 1, '#3a3a50'); ap(I, cm - 1, y + 11, '#3a3a50'); ap(I, cm + 1, y + 11, '#3a3a50');
    af(I, x + 1, y + 19, 18, 1, INK); af(I, x + 8, y + 22, 4, 2, '#ffe23a'); af(I, x + 3, y + 25, 6, 2, '#141018'); }
  function shutter(I, x, y, w, h){ af(I, x, y, w, h, '#5a5e72'); for(let yy = y + 1; yy < y + h; yy += 2) af(I, x, yy, w, 1, '#474a5e'); af(I, x, y, w, 1, '#8a8ea2'); af(I, x, y + h - 2, w, 2, '#33354a'); af(I, x + (w >> 1) - 3, y + h - 4, 6, 1, '#a8acc0'); }
  function aframe(I, x, y, k){ af(I, x, y, 9, 10, '#2a2230'); af(I, x + 1, y + 1, 7, 7, '#141018'); af(I, x + 2, y + 2, 5, 1, ['#ffd23a', '#ff8aa0', '#7ae0ff'][k % 3]); af(I, x + 2, y + 4, 3, 1, CREAM); af(I, x + 2, y + 6, 4, 1, '#ffd23a'); ap(I, x + 1, y + 10, '#2a2230'); ap(I, x + 7, y + 10, '#2a2230'); }
  function nobori(I, x, y, c, ink){ af(I, x, y, 1, 32 - y, '#7a7a90'); af(I, x, y, 6, 1, '#7a7a90'); af(I, x + 1, y + 1, 5, 19, c); af(I, x + 5, y + 1, 1, 19, dark(c, .25)); for(let q = 0; q < 4; q++) af(I, x + 2, y + 3 + q * 4, 2, 3, ink); }
  function shelfRow(I, x0, x1, y, seed, cols){ af(I, x0, y, x1 - x0, 1, '#6a6e84'); for(let x = x0 + 1, q = 0; x < x1 - 2; q++){ const r = H1(seed + q * 1.37), w = 2 + Math.floor(r * 4), h = 2 + Math.floor(H1(seed + q * 2.1) * 4); if(x + w > x1 - 1) break; sbox(I, x, y - h, w, h, cols[Math.floor(r * 97) % cols.length]); x += w + (r < .2 ? 2 : 1); } }
  const SHOPN = 7, SH_GLASS = 0, SH_CAM = 1, SH_STALL = 2, SH_ARC = 3, SH_SHUT = 4, SH_GACHA = 5, SH_KONB = 6;
  /* Round 7 (Kellan: "a pass on the convenience stores and shops on the retail floor"; "different layers with products on shelves visible
     through the windows"): every street-floor front is four layers, 160 x 32 (the 128-texel front with 16 spare each side for the slide):
       0 the back wall (fridges, a TV wall, a drawer wall), darkest: the light falls off away from the glass; 1 the rear shelves; 2 the front:
       counters, racks, a clerk, a customer; 3 the glass: mullions, sill, sparse glints, rain running down it (no parallax).
     Near by, interior() draws them back to front, each slid by its depth x how obliquely the window is seen, in whole texels (Kellan's
     "layered parallax interiors", the 2.5D cousin of interior mapping): riding past, the room slides behind its frame. Mid range: the
     layers pre-composited (faceArt); far: the average colour. Two variants per kind: a second product palette and the layout mirrored
     (the keeper, the door and the counter on the other hand), so neighbours differ. The konbini (an invented chain, three liveries) is new:
     a white-lit interior, aisles receding, a magazine rack at the window, the ATM, the till and its clerk, an umbrella stand at the door. */
  const PALS = [['#f4f4f8', '#e0202e', '#2a5ed0', '#ffc830', '#3a3a4a', '#1e9658'], ['#ff7a1a', '#c8c8d8', '#ff5aa8', '#3ad8ff', '#f4f4f8', '#8a9ab8']];
  const LW0 = 160;
  function flipI(I){ for(let y = 0; y < I.h; y++){ const r = I.c.slice(y * I.w, y * I.w + I.w).reverse(); for(let x = 0; x < I.w; x++) I.c[y * I.w + x] = r[x]; } return I; }
  function rainGlass(I, x0, x1, sd){ for(let q = 0; q < (x1 - x0) / 9; q++){ const x = x0 + 1 + Math.floor(H1(sd + q * 1.7) * (x1 - x0 - 2)), y = 3 + Math.floor(H1(sd + q * 2.9) * 18), l = 3 + Math.floor(H1(sd + q * 4.1) * 5);
      af(I, x, y, 1, l, '#9aa8cc'); ap(I, x, y + l, '#eef2ff'); } }   // rain running down the glass, each streak a drop at its foot
  function glint(I, x0, x1){ for(let x = x0 + 3, y = 4; x < x1 - 2 && y < 26; x += 1, y += 2) if((x + y) % 3) ap(I, x, y, '#f4f8ff'); }
  function glassL(I, mulls, door, sd){ for(const x of mulls) mull(I, x, 2, 29); af(I, 0, 29, LW0, 3, '#3a3446'); af(I, 0, 29, LW0, 1, '#6a6478'); af(I, 0, 1, LW0, 1, '#4a4458');
    for(let k = 0; k + 1 < mulls.length; k++){ const a = mulls[k], b = mulls[k + 1]; if(door && a === door[0]) continue; if((k & 1) === 0) glint(I, a, b); rainGlass(I, a + 1, b, sd + k * 9.1); } }
  function person(I, x, y, coat, skin){ af(I, x + 1, y, 3, 1, '#1a1018'); af(I, x + 1, y + 1, 3, 2, skin || '#d8a888'); af(I, x, y + 3, 5, 8, coat); af(I, x, y + 3, 1, 8, lite(coat, .25)); }
  function shopLayers(v, vr){ const L0 = AI(LW0, 32), L1 = AI(LW0, 32), L2 = AI(LW0, 32), L3 = AI(LW0, 32), P = PALS[vr], sd = v * 13.7 + vr * 5.1;
    if(v === SH_KONB){ af(L0, 0, 0, LW0, 32, '#c8d0e2'); af(L0, 0, 0, LW0, 1, '#ffffff'); for(let x = 0; x < LW0; x += 10){ af(L0, x, 3, 10, 18, '#8a94ae'); af(L0, x + 1, 4, 8, 16, '#dce6f6'); for(const y of [6, 11, 16]) for(let xx = 1; xx < 9; xx += 2) af(L0, x + xx, y, 1, 3, P[(x / 10 + xx + y) % 6]); }   // the drinks fridges along the back
      af(L0, 0, 21, LW0, 11, '#b8c0d4');
      for(const [x0, x1] of [[2, 40], [54, 92], [106, 152]]){ af(L1, x0, 9, x1 - x0, 2, P[(x0 >> 3) % 6]); af(L1, x0, 11, x1 - x0, 15, '#e8ecf6'); for(const y of [15, 20, 25]) shelfRow(L1, x0, x1, y, sd + x0 + y, P); af(L1, x0, 11, 1, 15, '#7a8098'); af(L1, x1 - 1, 11, 1, 15, '#7a8098'); }   // the gondolas, aisles between them
      af(L2, 18, 22, 52, 8, '#5a6078'); for(let x = 19; x < 69; x += 2) af(L2, x, 23, 1, 6, P[(x * 7) % 6]); af(L2, 18, 22, 52, 1, '#8a90a8');   // the magazine rack at the window
      af(L2, 86, 20, 26, 10, '#e8e8f0'); af(L2, 86, 20, 26, 1, '#ffffff'); af(L2, 90, 17, 6, 3, '#2a2a3a'); af(L2, 91, 18, 4, 1, '#3ad8ff'); person(L2, 99, 9, '#1e9658');   // the till and its clerk (the chain's smock)
      af(L2, 120, 10, 12, 20, '#8a90a8'); af(L2, 121, 11, 10, 1, '#c8ccd8'); af(L2, 122, 13, 8, 5, '#2a6aa0'); af(L2, 123, 14, 6, 1, '#7ad8ff'); af(L2, 123, 20, 6, 4, '#4a5068');   // the ATM
      person(L2, 74, 12, '#26222e', '#c8987a');   // a customer at the rack
      glassL(L3, [16, 48, 72, 88, 112, 144], [72, 88], sd); af(L3, 72, 2, 1, 27, '#5a5e72'); af(L3, 88, 2, 1, 27, '#5a5e72');
      af(L3, 90, 23, 6, 7, '#4a4e62'); for(const x of [91, 93, 95]){ af(L3, x, 16, 1, 7, '#c8d4f0'); ap(L3, x, 15, '#eef2ff'); } }   // the umbrella stand by the door
    else if(v === SH_GLASS){ af(L0, 0, 0, LW0, 32, '#aab6d0'); af(L0, 0, 0, LW0, 1, '#e8eeff'); for(let r = 0; r < 2; r++) for(let q = 0; q < 11; q++) tvset(L0, q * 15, 3 + r * 9, 14, 8, ['#7aa8ff', '#9a8aff', '#6ad0e8', '#c8d8ff', '#ff9ab8', '#8ae0a8'][(r * 4 + q * 3 + vr) % 6]);
      af(L0, 0, 21, LW0, 11, '#8a94ae');
      for(const [x0, x1] of [[0, 34], [52, 84], [112, 150]]) for(const y of [11, 17, 23]) shelfRow(L1, x0, x1, y, sd + x0 * 3 + y, P);
      af(L2, 64, 21, 62, 1, '#6a6e84'); sbox(L2, 66, 21, 14, 8, '#c8a46a'); sbox(L2, 81, 23, 12, 6, '#d8d0c0'); sbox(L2, 94, 19, 10, 10, P[2]); sbox(L2, 105, 24, 9, 5, '#c8a46a'); pcard(L2, 70, 23, true); pcard(L2, 84, 25, false); pcard(L2, 97, 22, true);
      person(L2, 42, 13, '#2a2436'); person(L2, 52, 15, '#3a2a40', '#c8987a');
      glassL(L3, [16, 38, 58, 80, 142], [38, 58], sd); }
    else if(v === SH_CAM){ af(L0, 0, 0, LW0, 32, '#d8c094'); for(const y of [9, 13]) for(let x = 2; x < LW0; x += 4){ af(L0, x, y - 3, 2, 3, x % 12 < 4 ? '#c8c0a8' : INK); ap(L0, x, y - 3, '#8a8a9a'); } af(L0, 0, 9, LW0, 1, '#8a6a4a'); af(L0, 0, 13, LW0, 1, '#8a6a4a');
      for(let x = 0; x < LW0; x += 20){ af(L1, x + 2, 14, 14, 2, '#6a5040'); for(let q = 0; q < 3; q++) af(L1, x + 3 + q * 4, 12, 3, 2, q & 1 ? INK : '#5a5a6a'); }
      for(const x0 of [19, 49, 86, 116]){ af(L2, x0, 17, 26, 11, INK); af(L2, x0 + 1, 18, 24, 9, '#cfe6ea'); af(L2, x0 + 1, 18, 24, 1, '#ffffff'); for(let q = 0; q < 4; q++){ const cx0 = x0 + 2 + q * 6; af(L2, cx0, 22, 5, 3, INK); af(L2, cx0 + 1, 21, 2, 1, INK); ap(L2, cx0 + 2, 23, '#8aa8c8'); } pcard(L2, x0 + 20, 25, true); }
      person(L2, 78, 8, '#e8e8f0');
      af(L3, 0, 2, LW0, 3, '#e0202e'); for(let x = 2; x < LW0; x += 6) af(L3, x, 3, 3, 1, CREAM); glassL(L3, [16, 47, 80, 114, 142], null, sd); af(L3, 0, 28, LW0, 4, '#4a3426'); af(L3, 0, 28, LW0, 1, '#8a6a4a'); }
    else if(v === SH_STALL){ af(L0, 0, 0, LW0, 32, '#2a1c18'); const RC = ['#c84a3a', '#3a6ab8', '#e8dcc0', '#3a8a5a', '#d8b040'];
      for(let r = 0; r < 7; r++){ const c = RC[(r + vr * 2) % 5]; for(let q = 0; q < 40; q++){ af(L0, 1 + q * 4, 4 + r * 3, 3, 2, c); ap(L0, 2 + q * 4, 5 + r * 3, dark(c, .45)); } }   // the drawer wall, one colour per row (it reads as bands at mid range, not confetti)
      for(let q = 0; q < 12; q++){ const x = 4 + q * 13, c = ['#3ab86a', '#ffd23a', '#e8e8f0', '#ff8a3a'][(q + vr) % 4]; af(L1, x + 3, 2, 1, 3, '#8a8aa0'); af(L1, x, 5, 7, 11 + (q % 3) * 2, c); af(L1, x + 1, 6, 5, 3, '#ffffff'); af(L1, x + 2, 7, 3, 1, '#e0202e'); af(L1, x + 6, 6, 1, 9, dark(c, .3)); }   // packs on hooks
      af(L2, 0, 25, LW0, 3, '#7a5434'); af(L2, 0, 25, LW0, 1, '#b8885a'); for(let q = 0; q < 18; q++) af(L2, 3 + q * 9, 23, 6, 2, ['#8a8aa0', '#c8a040', '#5a5a6a'][q % 3]);
      for(let q = 0; q < 4; q++){ const x = 40 + q * 24; for(let k = 0; k < 10; k++){ const t = k / 10 * 6.283; ap(L2, x + Math.round(Math.cos(t) * 3), 21 + Math.round(Math.sin(t) * 2), INK); } }   // coils of cable
      person(L2, 126, 11, '#3a2a44', '#c8987a'); for(const [x, y, rd] of [[50, 17, false], [88, 13, true], [110, 19, false], [30, 20, true]]) pcard(L2, x, y, rd);
      for(const x of [22, 54, 86, 118, 150]) bulb(L3, x, 2); af(L3, 0, 1, LW0, 1, '#5a4a3a'); af(L3, 0, 28, LW0, 4, '#5a4a40'); af(L3, 0, 28, LW0, 1, '#8a7a68'); }
    else if(v === SH_ARC){ af(L0, 0, 0, LW0, 32, '#24103a'); af(L0, 0, 4, LW0, 1, '#ff4aa0'); af(L0, 0, 26, LW0, 1, '#3ad8ff');
      for(let q = 0; q < 7; q++) crane(L1, 2 + q * 22, 1, ['#ff6aa8', '#f4e8f0', '#6ad8f0', '#ffd23a'][(q + vr) % 4], q);
      for(let q = 0; q < 5; q++) gacha(L2, 104 + q * 9, 16, ['#ff5a8a', '#5ad0ff', '#ffd23a', '#8ae070', '#c08aff'][(q + vr) % 5]); person(L2, 60, 16, '#1a1426', '#c8987a');
      af(L3, 0, 30, LW0, 2, '#1a0e24'); af(L3, 0, 30, LW0, 1, '#ff4aa0'); for(const x of [16, 144]) af(L3, x, 0, 2, 30, '#3a2450'); }
    else if(v === SH_GACHA){ af(L0, 0, 0, LW0, 32, '#d0c8e0'); af(L0, 0, 0, LW0, 1, '#ffffff'); for(let x = 6; x < LW0; x += 26){ af(L0, x, 3, 10, 12, P[(x >> 2) % 6]); af(L0, x + 1, 4, 8, 10, lite(P[(x >> 2) % 6], .4)); }
      for(let q = 0; q < 17; q++) gacha(L1, 1 + q * 9, 3, ['#ff5a8a', '#5ad0ff', '#ffd23a', '#8ae070', '#c08aff', '#ff8a3a'][(q * 2 + vr) % 6]);
      for(let q = 0; q < 11; q++) gacha(L2, 18 + q * 9, 16, ['#ff5a8a', '#5ad0ff', '#ffd23a', '#8ae070', '#c08aff', '#ff8a3a'][(q * 2 + 3 + vr) % 6]); vend(L2, 120, 2, P[1]); vend(L2, 133, 2, '#1e9658');
      glassL(L3, [16, 60, 104, 144], null, sd); }
    else { af(L0, 0, 0, LW0, 32, '#2a2832'); shutter(L0, 17, 1, 60, 29); af(L0, 22, 3, 18, 4, '#e8e4d8'); af(L0, 23, 4, 16, 2, '#a8a4a0');
      vend(L0, 82, 3, P[1]); vend(L0, 95, 3, P[2]); vend(L0, 108, 3, '#ececf0'); gacha(L0, 123, 16, '#ff5a8a'); gacha(L0, 132, 16, '#5ad0ff'); af(L0, 0, 30, LW0, 2, '#3a3846'); af(L0, 79, 2, 2, 28, '#3a3644'); }
    const Ls = [L0, L1, L2, L3]; if(vr) Ls.forEach(flipI);
    const C = AI(128, 32); for(let y = 0; y < 32; y++) for(let x = 0; x < 128; x++){ for(let k = 3; k >= 0; k--){ const c = Ls[k].c[y * LW0 + x + 16]; if(c){ C.c[y * 128 + x] = c; break; } } }
    return { C, Ls, flat:v === SH_SHUT }; }
  function shopArt(v){ return acomp(shopLayers(v, 0).C); }
  // the konbini's three invented liveries (fascia stripes): green over orange over red; blue on white; yellow and red
  const KONB = [['#1e9658', '#ff7a1a', '#e0202e'], ['#2a5ed0', '#f4f6ff', '#2a5ed0'], ['#ffd23a', '#e0202e', '#ffd23a']];
  const SHOPK = { denki:[SH_GLASS], camera:[SH_CAM], radio:[SH_STALL], arcade:[SH_ARC], pencil:[SH_GACHA, SH_SHUT, SH_GLASS, SH_STALL, SH_KONB, SH_KONB], plain:[SH_SHUT, SH_GACHA, SH_STALL, SH_KONB, SH_KONB] };
  // each shop's light on the pavement in front of it (added light, near only)
  const SHOPL = ['#a8c0ff', '#ffc070', '#ffa040', '#ff60c0', '#7090ff', '#d0c8ff', '#e4f0ff'];
  /* The arcades' attract screen (32 x 20, 16 frames): a star field scrolling, the fighter weaving, a row of invaders marching, a shot, a hit. */
  function attractFrame(f){ const I = AI(32, 20); af(I, 0, 0, 32, 20, '#06061a'); for(let q = 0; q < 12; q++) ap(I, (q * 11 + 2) % 32, (q * 7 + f * (1 + (q & 1))) % 20, q & 1 ? '#5a5a9a' : '#ffffff');
    const fx = 13 + Math.round(Math.sin(f / 16 * 6.283) * 8); for(let q = 0; q < 4; q++){ if(f >= 12 && q === 2) continue; as(I, FOE, 2 + q * 8 + (f & 4 ? 1 : 0), 2, false); }
    if(f >= 12 && f < 16){ const r = f - 11; for(let a = 0; a < 8; a++) ap(I, 21 + Math.round(Math.cos(a * .785) * r), 4 + Math.round(Math.sin(a * .785) * r), a & 1 ? '#ffe23a' : '#ff7a1a'); }
    if(f >= 6 && f < 12) af(I, fx + 4, 18 - (f - 6) * 2.4, 1, 2, '#ffffff');
    as(I, SHIP, fx, 11, false); for(let x = 0; x < 32; x += 2) ap(I, x, 19, '#2a2a5a'); return acv(I); }
  const ART = { ban:[], bb:[], po:[], band:[], wrap:[], plate:[], shop:[], crane:[], fox:[], att:[] };
  // the stepped build (one piece a step, research/sundown-craft/first60.md); after the text atlas, which builds the glyph scratch canvas
  /* One atlas for everything (round 4 perf): ~300 small canvases drawn from per frame thrashed the GPU canvas's image cache (frames of
     80-110 ms on desktop); every level of every piece and every screen frame now lives in one 1024-wide texture, packed in shelves. */
  let AT = null;
  const fobj = c => ({ c, x:0, y:0, w:c.width, h:c.height });
  function* artSteps(){ const T = { ban:[], bb:[], po:[], band:[], wrap:[], plate:[], shop:[], crane:[], fox:[], att:[] };
    for(let v = 0; v < BAN.length; v++){ T.ban[v] = banner(v); yield; }
    for(let v = 0; v < NBB + BRANDS.length; v++){ T.bb[v] = billboard(v); yield; }
    for(let v = 0; v < NPO + BRANDS.length; v++){ T.po[v] = poster(v); yield; }
    for(let v = 0; v < BRANDS.length; v++){ T.band[v] = band(v); yield; }
    for(let v = 0; v < 2; v++){ T.wrap[v] = wrap(v); yield; } for(let v = 0; v < BRANDS.length; v++){ T.wrap[2 + v] = wrapBrand(BRANDS[v]); yield; }
    for(let ic = 0; ic < ICON.length; ic++) for(let p = 0; p < PAN.length; p++){ T.plate[ic * PAN.length + p] = plateArt(ic, p); yield; }
    T.shopv = []; T.int = []; for(let v = 0; v < SHOPN; v++){ T.shopv[v] = []; T.int[v] = []; for(let r = 0; r < 2; r++){ const S = shopLayers(v, r); T.shopv[v][r] = acomp(S.C); yield; T.int[v][r] = S.flat ? null : []; if(!S.flat) for(const Lq of S.Ls){ T.int[v][r].push(acomp(Lq)); yield; } } T.shop[v] = T.shopv[v][0]; }
    for(let f = 0; f < 40; f++){ T.crane[f] = fobj(craneFrame(f)); yield; } for(let f = 0; f < 40; f++){ T.fox[f] = fobj(foxFrame(f)); yield; } for(let f = 0; f < 16; f++){ T.att[f] = fobj(attractFrame(f)); yield; }
    const all = []; for(const k of ['ban', 'bb', 'po', 'band', 'wrap', 'plate', 'shop']) for(const A of T[k]) all.push(...A.L); for(let v = 0; v < SHOPN; v++){ all.push(...T.shopv[v][1].L); for(const Q of T.int[v]) if(Q) for(const A of Q) all.push(...A.L); } for(const k of ['crane', 'fox', 'att']) all.push(...T[k]);
    all.sort((a, b) => b.h - a.h || b.w - a.w); let x = 0, y = 0, rh = 0; for(const o of all){ if(x + o.w > 1024){ x = 0; y += rh + 1; rh = 0; } o.x = x; o.y = y; x += o.w + 1; if(o.h > rh) rh = o.h; } yield;
    const at = mk(1024, y + rh + 1), g = at.getContext('2d'); yield;
    for(let i = 0; i < all.length; i += 24){ for(let q = i; q < Math.min(all.length, i + 24); q++){ const o = all[q]; g.drawImage(o.c, o.x, o.y); } yield; }
    try{ cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = .004; cx.drawImage(at, 0, 0, 1, 1); cx.restore(); }catch(e){ try{ cx.restore(); }catch(e2){} }   // its texture uploaded now, never on a ride's first frame
    AT = at; Object.assign(ART, T); }
  /* A video screen at (sx, sy, sw x sh): the frame drawn with its edges on the pixel grid, then the LED grid fading in as its pixels grow
     past two screen pixels (following the screen's placement, so every line falls between two LEDs), and a slow bright roll (the refresh). */
  function screenAt(fr, sx, sy, sw, sh, now){ if(!fr || !AT || sw < PX * 2) return; const fw = fr.w, fh = fr.h, k = sw / fw, x0 = jbE(sx, 0, k), x1 = jbE(sx, fw, k), y0 = jbE(sy, 0, sh / fh), y1 = jbE(sy, fh, sh / fh); if(x1 <= x0 || y1 <= y0) return;
    if(!ON){ cx.fillStyle = '#06060a'; cx.fillRect(x0, y0, x1 - x0, y1 - y0); return; }
    cx.imageSmoothingEnabled = false; cx.drawImage(AT, fr.x, fr.y, fw, fh, x0, y0, x1 - x0, y1 - y0);
    const ex = clamp((k / PX - 2) / 1, 0, 1), a0 = cx.globalAlpha; if(ex > 0){ cx.globalAlpha = a0 * ex * .55; cx.fillStyle = '#04030a'; const uy = sh / fh;
      for(let i = 1; i < fw; i++){ const xx = jbE(sx, i, k); if(xx > 0 && xx < W) cx.fillRect(xx, y0, PX, y1 - y0); } for(let j2 = 1; j2 < fh; j2++){ const yy = jbE(sy, j2, uy); if(yy > 0 && yy < H) cx.fillRect(x0, yy, x1 - x0, PX); } }
    if(!reduce && k > PX){ const ry = y0 + snp(((now / 2600) % 1) * (y1 - y0)); cx.globalAlpha = a0 * .07; cx.fillStyle = '#ffffff'; cx.fillRect(x0, ry, x1 - x0, Math.min(y1 - ry, snp((y1 - y0) * .12) + PX)); }
    cx.globalAlpha = a0; if(FF > .02) veil(x0, y0, x1 - x0, y1 - y0); }
  // a bezel with thickness: a dark frame, its lit top and left edges, its shadowed foot, and the shadow it casts on the wall below and right
  function bezel(x, y, w, h, t, wall){ if(w < PX * 3) return; const sh = Math.max(PX, snp(t * .8));
    if(wall) R(x - t + sh, y - t + sh, w + t * 2, h + t * 2, F(typeof wall === 'string' ? wall : '#08060e'));
    R(x - t, y - t, w + t * 2, h + t * 2, F('#141220')); R(x - t, y - t, w + t * 2, PX, F('#6a6480')); R(x - t, y - t, PX, h + t * 2, F('#4a4660')); R(x - t, y + h + t - PX, w + t * 2, PX, F('#08060c')); }

  // ---------------------------------------------------------------- the visit and its layout
  /* Each visit (zone z, border B0 to B1) is laid out from the gates alone, so place(), the set piece and the far land agree: the Sōbu line
     bridge (BR, its deck BD segments deep) about 60% of the way along, clear of fork windows and the mid checkpoint; cross streets with
     scramble crossings every 230-300 segments; and on each side a continuous row of buildings, wall to wall, broken only by the cross
     streets and the railway corridor. The blackout's stretch is the 430 segments before the bridge. */
  const BD = 6, CW = 16, SPL = 430, LAYS = new Map(); let LREF = null;
  const clear = (a, b) => !(window.inForkWindow && inForkWindow(a, b));
  const KW = [['denki', 5], ['camera', 2], ['radio', 2], ['arcade', 2], ['pencil', 4], ['plain', 2]];
  const KL = { denki:[16, 14], camera:[12, 8], radio:[16, 10], arcade:[12, 8], pencil:[5, 3], plain:[10, 8] }, KF = { denki:[6, 3], camera:[5, 2], radio:[4, 2], arcade:[4, 2], pencil:[6, 3], plain:[5, 3] };
  function pickK(r){ let t = 0; for(const q of KW) t += q[1]; let a = r * t; for(const q of KW){ a -= q[1]; if(a < 0) return q[0]; } return 'plain'; }
  function lay(z){ if(z < 0 || typeof gates === 'undefined' || !gates.length) return null; if(segs !== LREF){ LREF = segs; LAYS.clear(); } const B0 = z > 0 ? gates[2 * z - 1] : 0, B1 = gates[2 * z + 1]; if(B0 === undefined || B1 === undefined) return null;
    const key = B0 + ':' + B1; let L = LAYS.get(key); if(L) return L;
    L = { z, B0, B1, BR:-1, S0:-1, X:[], rows:[[], []], req:false, sp:false, card:false, fin:false, off:false, rel:false };
    const st = z === 0 ? 40 : 170, G0 = gates[2 * z], want = B0 + Math.max(st + SPL + 60, Math.round((B1 - B0) * .6));
    outer: for(let d = 0; d < 600; d += 4) for(const sg of [1, -1]){ const br = want + sg * d; if(br - SPL < B0 + st || br + BD + 90 > B1 - 160) continue; if(G0 !== undefined && Math.abs(G0 - br) < 40) continue; if(clear(br - SPL - 20, br + BD + 70)){ L.BR = br; L.S0 = br - SPL; break outer; } }
    for(let c = B0 + (z ? 200 : 110); c < B1 - 140; c += 230 + Math.round(H1(c * .37 + 1.1) * 70)){ if(L.BR >= 0 && c + CW > L.BR - 70 && c < L.BR + BD + 60) continue; if(G0 !== undefined && G0 > c - 6 && G0 < c + CW + 6) continue; if(clear(c - 12, c + CW + 12)) L.X.push(c); }
    for(let q = 0; q < 2; q++) fillRow(L, q ? 1 : -1, L.rows[q]);
    // the hero screens: hung off the corner of the first building past each crossing, facing you across it (the references' crossing
    // screens); on the left (the HUD's distance board sits top right), round 6: the foxfire screen; a building too low passes it right
    L.X.forEach((c, q) => { if(!(q & 1)) return; for(const side of [-1, 1]){ const B = bAt(L, side, c + CW); if(B && B.b0 === c + CW && B.nF0 >= 4){ B.hero = q & 1; B.depth = 1.9; break; } } });
    deck(L); if(LAYS.size > 40) LAYS.clear(); LAYS.set(key, L); return L; }
  /* Round 7 (Kellan: "the signs repeat too frequently"): a shuffled deck per visit for each kind of sign, dealt down the street in order of
     position on both sides at once. A card is skipped while it was dealt to one of the last few buildings or hangs on a building across the
     street within 8 segments, so no banner faces itself and the whole set comes round before any repeats. Shop fronts alternate their two
     variants per kind; the konbini livery rotates. Text blades: every third steps its characters on in turn (a neon sign lighting stroke by
     stroke, then a blink); others get chasing bulbs. */
  function deck(L){ const all = L.rows[0].concat(L.rows[1]).sort((a, b) => a.b0 - b.b0); let sd = L.B0 * .0173 + 3.3;
    const mkD = n => { const d = []; for(let i = 0; i < n; i++) d.push(i); for(let i = n - 1; i > 0; i--){ const j = Math.floor(H1(sd += 1.37) * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; } return d; };
    const D = n => ({ n, d:[], p:0, rec:[], k:Math.max(0, Math.min(n - 2, 6)) });
    const pick = (Dk, ban) => { for(let t = 0; t < Dk.n * 3; t++){ if(Dk.p >= Dk.d.length){ Dk.d = mkD(Dk.n); Dk.p = 0; } const c = Dk.d[Dk.p++]; if(Dk.rec.indexOf(c) < 0 && ban.indexOf(c) < 0){ Dk.rec.push(c); if(Dk.rec.length > Dk.k) Dk.rec.shift(); return c; } } return Dk.d[Math.max(0, Dk.p - 1)]; };
    const dBan = D(BAN.length), dBB = D(NBB), dPO = D(NPO), cnt = {}; let kb = Math.floor(H1(sd) * 3), tb = 0;
    const across = (B, f) => { const o = []; for(const C of L.rows[B.side < 0 ? 1 : 0]) if(C.b0 < B.b0 + B.len + 8 && C.b0 + C.len > B.b0 - 8) f(C, o); return o; };
    for(const B of all){
      for(const b of B.bl){ if(b.ban !== undefined && !b.plate) b.ban = pick(dBan, across(B, (C, o) => { for(const c of C.bl) if(c.ban !== undefined) o.push(c.ban); }));
        else if(!b.plate && b.word && B.k !== 'arcade'){ b.seq = (tb % 3) === 0; if(!b.seq && (tb % 3) === 1) b.chase = true; tb++; } }
      if(B.rb && B.rb.bb < NBB) B.rb.bb = pick(dBB, across(B, (C, o) => { if(C.rb) o.push(C.rb.bb); }));
      if(B.ew && B.ew.po < NPO) B.ew.po = pick(dPO, across(B, (C, o) => { if(C.ew) o.push(C.ew.po); }));
      B.svv = (cnt[B.sv] = (cnt[B.sv] || 0) + 1) & 1; if(B.sv === SH_KONB) B.kb = kb++ % 3; } }
  // the end of the gap that segment i is in (cross street or railway corridor), or -1
  function gapEnd(L, i){ for(const c of L.X) if(i >= c && i < c + CW) return c + CW; if(L.BR >= 0 && i >= L.BR - 3 && i < L.BR + BD + 3) return L.BR + BD + 3; return -1; }
  function nextGap(L, i){ let g = Infinity; for(const c of L.X) if(c > i && c < g) g = c; if(L.BR >= 0 && L.BR - 3 > i && L.BR - 3 < g) g = L.BR - 3; return g; }
  function fillRow(L, side, out){ let i = Math.max(0, L.B0 - 150), prev = '', ph = 0, n = 0; const end = L.B1 + 10;
    while(i < end && n < 400){ const ge = gapEnd(L, i); if(ge >= 0){ i = ge; prev = ''; ph = 0; continue; }
      const r = H1(i * 1.37 + side * 7.7 + L.B0 * .013); let k = pickK(r); if(k === prev) k = pickK((r + .41) % 1);
      let len = KL[k][0] + Math.round(H1(i * 2.1 + side * 3.3) * KL[k][1]); const ng = nextGap(L, i);
      if(i + len > ng){ len = ng - i; if(len < 4){ i = ng; continue; } if(len < KL[k][0]) k = len < 9 ? 'pencil' : 'plain'; }
      const B = mkB(k, i, len, side, n++, ph); out.push(B); prev = k; ph = B.nF0; i += len; if(H1(i * 3.3 + side) < .1 && i + 2 < ng){ i += 2; ph = 0; } } }
  function bAt(L, side, i){ const A = L.rows[side < 0 ? 0 : 1]; let lo = 0, hi = A.length - 1; while(lo <= hi){ const m = (lo + hi) >> 1, B = A[m]; if(i < B.b0) hi = m - 1; else if(i >= B.b0 + B.len) lo = m + 1; else return B; } return null; }
  /* A building: kind, run, height, cladding, a programme per floor ('S' a sign band, 'W' windows, 'N' an arcade's neon floor, 'T' an LED
     ticker band), its blades and plate columns (camera-facing, projecting from the face), a roof board, an end-wall board. */
  function mkB(k, b0, len, side, n, ph){ const sd = H1(b0 * .71 + side * 3.1 + 5.3), hs = q => H1(sd * 97.1 + q * 13.37);
    const nF = KF[k][0] + Math.floor(hs(1) * (KF[k][1] + 1)), CL = k === 'denki' ? ['yellow', 'white', 'red', 'cream', 'yellow'][Math.floor(hs(2) * 5)] : k === 'camera' ? (hs(2) < .6 ? 'red' : 'white') : k === 'radio' ? (hs(2) < .5 ? 'grey' : 'cream') : k === 'arcade' ? (hs(2) < .6 ? 'violet' : 'blue') : k === 'pencil' ? ['tile', 'grey', 'cream', 'blue'][Math.floor(hs(2) * 4)] : ['grey', 'tile', 'blue'][Math.floor(hs(2) * 3)];
    const B = { br:KBRAND[k][Math.floor(hs(16) * KBRAND[k].length)], wv:Math.floor(hs(17) * 2), hero:-1, k, b0, len, side, sd, nF, nF0:nF, ak:1, pnF0:ph, h:G + nF * FH, x0:2.3 + (hs(3) - .5) * .08, depth:1.4 + hs(4) * .5, S:CLAD[CL], cl:CL, fl:[], wd:[], pn:[], bl:[], rb:null, ew:null, ph:ph ? G + ph * FH : 0, P:3 + Math.floor(hs(5) * 2),
      gr:k === 'arcade' ? 'crane' : k === 'radio' ? 'stall' : 'shop', tv:k === 'denki' || (k === 'camera' && hs(6) < .5), ic:k === 'radio' ? '#f0c878' : hs(7) < .7 ? '#d4dcf0' : '#f0dcb4', aw:PAN[Math.floor(hs(8) * PAN.length)] };
    const okP = p => !((CL === 'yellow' && (p === 1)) || ((CL === 'white' || CL === 'cream') && (p === 0 || p === 6)) || (CL === 'red' && p === 2));   // a plate that would vanish on its cladding
    let w0 = Math.floor(hs(9) * BW.length), p0 = Math.floor(hs(10) * PAN.length);
    for(let f = 0; f < nF; f++){ let t = 'W';
      if(k === 'denki') t = f === nF - 1 && hs(11) < .6 ? 'W' : (f & 1) && f > 2 ? 'W' : 'S'; else if(k === 'camera') t = f === 0 ? 'T' : f < 3 ? 'S' : 'W'; else if(k === 'arcade') t = 'N'; else if(k === 'plain') t = f === 1 && hs(12) < .7 ? 'S' : 'W';
      B.fl.push(t); let p = (p0 + f * 3) % PAN.length; for(let q = 0; q < 8 && !okP(p); q++) p = (p + 1) % PAN.length; B.pn.push(p); B.wd.push(BW[(w0 + f * 5) % BW.length]); }
    if(k === 'camera') B.wd[1] = 'カメラ';
    B.sv = SHOPK[k][Math.floor(hs(30) * SHOPK[k].length)];   // round 6: the street floor's picture
    // a key-art wrap across floors 1-2 on most big stores (the references' two-storey anime prints)
    if(((k === 'denki' && hs(19) < .85) || k === 'camera') && nF >= 4){ B.fl[1] = 'K'; B.fl[2] = 'k'; if(k === 'camera' || hs(25) < .55) B.wv = 2 + B.br; }
    // blades: the big corner blade (several floors) on the stores; plate columns on the narrow and old buildings
    /* round 5, three tiers: the big banners are the verticals (.7 wide, about three storeys; round 6: a motif in the cards' language); big type
       blocks (two huge characters, the old 計測 / 部品 kind) on some corners; the icon plates only on the old radio building, sparse */
    const blade = (z, f0, f1, word, p, chase, txt) => B.bl.push({ z, f0, f1, word, p, chase:!!chase, pr:txt ? .46 : .7, ban:txt ? undefined : Math.floor(hs(18 + B.bl.length) * BAN.length), off:.04 + hs(21 + B.bl.length) * .14 });
    const BIGW = ['計測', '部品', '電気', '無線', '激安', '特価', '電子', '秋葉'];
    if(k === 'denki' || k === 'camera') { let p = Math.floor(hs(13) * 6) + 2; if(!okP(p)) p = 3; blade(1, 1, Math.min(nF, 5), 'カメラ', p); if(len > 20) blade(len - 3, 2, Math.min(nF, 4), BIGW[Math.floor(hs(26) * BIGW.length)], (p + 3) % PAN.length, false, true); }
    if(k === 'arcade') blade(2, 1, Math.min(nF, 5), 'ゲーム', 2, true);
    if((k === 'pencil' || k === 'plain') && nF >= 3){ const r = hs(27); if(r < .35) blade(Math.floor(len / 2), 1, Math.min(nF, 3), BIGW[Math.floor(hs(28) * BIGW.length)], Math.floor(hs(29) * PAN.length), false, true); else if(r < .55) blade(Math.floor(len / 2), 1, Math.min(nF, 5), '', 0); }
    if(k === 'radio'){ const cols = [3]; for(const zc of cols){ if(zc < 1 || zc >= len) continue; const top = Math.min(nF, 4);
        for(let f = 0; f < top; f++){ if((f + zc) & 1) continue; B.bl.push({ z:zc, f0:f, f1:f + 1, word:PW[(w0 + f * 5 + zc) % PW.length], p:(p0 + f * 2 + zc) % PAN.length, chase:false, pr:.27, plate:true, ic:Math.floor(H1(sd * 31.7 + f * 5.3 + zc) * ICON.length), off:.02 + H1(sd * 11.3 + f * 2.9 + zc) * .08 }); } } }
    if(k === 'radio' || (k === 'denki' && hs(14) < .5) || (k === 'arcade' && hs(14) < .4)) B.rb = { word:k === 'radio' ? 'ラジオ' : k === 'arcade' ? 'ゲーム' : BW[(w0 + 11) % BW.length], p:k === 'radio' ? 1 : (p0 + 1) % PAN.length,
      bb:k === 'arcade' ? (hs(20) < .5 ? 2 : NBB + 1) : k === 'radio' ? NBB + B.br : hs(20) < .6 ? Math.floor(hs(22) * NBB) : NBB + B.br };
    if(k === 'denki' || k === 'camera' || k === 'arcade') B.ew = { word:BW[(w0 + 7) % BW.length], p:(p0 + 4) % PAN.length, tk:k === 'camera' || hs(15) < .35,
      att:k === 'arcade', po:k === 'denki' && hs(23) < .55 ? Math.floor(hs(24) * NPO) : NPO + B.br };
    return B; }
  // the visit of this road that segment i belongs to (or borders), or null
  function visitOf(i){ if(i < 0 || typeof gates === 'undefined' || !gates.length) return null; const K = landK(), z = zoneOfSeg(i);
    for(const zz of [z, z + 1, z - 1]) if(zz >= 0 && typeof ROUTE !== 'undefined' && ROUTE[zz] !== undefined && ROUTE[zz] === K) return lay(zz);
    return null; }
  function crossAt(L, i){ for(const c of L.X) if(i >= c - 8 && i < c + CW + 8) return c; return -1; }

  // ---------------------------------------------------------------- the blackout's state (set each frame by MECH.sp_teiden.update)
  const SPA = { on:false, L:null, fr:1e9, lo:0, hi:0, rel:false, flash:0 };
  function onAt(z){ if(!SPA.on || SPA.rel || z < SPA.lo || z > SPA.hi) return 1; if(z < SPA.fr) return 1;
    if(z < SPA.fr + 7 && !reduce && !(window.ASSIST && ASSIST.noFlash)) return ((DRAWN >> 1) + (z | 0)) & 1;   // the tubes die: a stutter at the wave's edge (none under reduced motion)
    return 0; }

  // ---------------------------------------------------------------- building slices (as env/shuto.js: a face per slice, bands by FQ)
  let FX1 = 0, FY1 = 0, FU1 = 0, FX2 = 0, FY2 = 0, FU2 = 0, BASE = '#000';
  function FQ(h0, h1, col, ta, tb){ if(ta === undefined){ ta = 0; tb = 1; } const xa = FX1 + (FX2 - FX1) * ta, xb = FX1 + (FX2 - FX1) * tb, ya = FY1 + (FY2 - FY1) * ta, yb = FY1 + (FY2 - FY1) * tb, ua = FU1 + (FU2 - FU1) * ta, ub = FU1 + (FU2 - FU1) * tb;
    const t0 = ya - ua * h1, t1 = yb - ub * h1, b0 = ya - ua * h0, b1 = yb - ub * h0;
    if((xa < -PX * 2 && xb < -PX * 2) || (xa > W + PX * 2 && xb > W + PX * 2) || (t0 > H + PX * 2 && t1 > H + PX * 2) || (b0 < -PX * 2 && b1 < -PX * 2)) return;
    if(Math.abs(xb - xa) < PX * 2.5 || (Math.abs(t1 - t0) < PX * .75 && Math.abs(b1 - b0) < PX * .75)){ const tm = CLY((t0 + t1) / 2), bm = CLY((b0 + b1) / 2), xl = CLX(Math.min(xa, xb)); if(!fin(tm + bm + xl)) return; cx.fillStyle = col; pxRect(xl, Math.min(tm, bm), CLX(Math.max(xa, xb)) - xl, Math.abs(bm - tm)); return; }
    poly4(xa, b0, xb, b1, xb, t1, xa, t0, col); }
  const SPANF = f => { f = fogPx(f); return f < .02 ? 1 : f < .055 ? 2 : f < .13 ? 4 : f < .28 ? 8 : 16; };
  // the span at each distance from the camera's segment (fog depends on that distance alone): a table, made once, read per slice
  const SPT = new Uint8Array(1024); let SPTOK = false, SPF = -1, SPB = 0;
  const at = k => { const d = k - SPB; return d < 0 ? 1 : d > 1023 ? 16 : SPT[d]; };
  function spanOf(j, b0, end, fog){ if(!SPTOK){ SPTOK = true; for(let d = 0; d < 1024; d++) SPT[d] = SPANF(clamp(Math.pow(d / DRAW, 1.6), 0, 1)); } if(SPF !== DRAWN){ SPF = DRAWN; SPB = segAt(position).index; }
    const lx = laneDX(j), lcut = j > b0 && laneDX(j - 1) !== lx;
    if(j > b0 && !lcut && (j - b0) % at(j)) return 0; let n = 1; while(j + n < end && n < 16 && (j + n - b0) % at(j + n) && laneDX(j + n) === lx) n++; return n; }
  function farEnd(j, n, X){ const t = segs[j + n - 1]; if(!t || !t.p2.screen.scale) return false; const q = t.p2.screen; FX2 = q.x + X * q.w; FY2 = q.y; FU2 = q.w; return fin(FX2 + FY2 + FU2); }
  // a face point at sub-span t, height h
  let FPX = 0, FPY = 0, FPU = 0; function fpt(t, h){ FPU = FU1 + (FU2 - FU1) * t; FPX = FX1 + (FX2 - FX1) * t; FPY = FY1 + (FY2 - FY1) * t - FPU * h; }
  function floorState(B, f, sec){ const v = H1(B.sd * 7.13 + f * 13.37 + sec * 3.1), pl = .55 * (1 - .3 * MOON.t); return v < pl * .55 ? 1 : v < pl ? 2 : v < pl + .12 ? 3 : 0; }
  // the street stays enclosed on a narrow screen: in portrait every building gains storeys (fitB), up to 1.9x at 400 x 720
  let ASPK = 1, ASPF = -1;
  function aspect(){ if(ASPF === DRAWN) return ASPK; ASPF = DRAWN; ASPK = Math.round(clamp(1 + (H / W - .75) * .85, 1, 1.9) * 20) / 20; return ASPK; }
  function fitB(B){ const k = aspect(); if(B.ak === k) return; B.ak = k; const ex = q => Math.round(q * (k - 1)); B.nF = B.nF0 + ex(B.nF0); B.h = G + B.nF * FH; B.ph = B.pnF0 ? G + (B.pnF0 + ex(B.pnF0)) * FH : 0;
    for(let f = B.fl.length; f < B.nF; f++){ B.fl.push('X'); B.pn.push(B.pn[f % B.nF0]); B.wd.push(B.wd[f % B.nF0]); } }   // (the added storeys are plain: see xFloor)
  // an added storey (portrait only): its lit band and nothing else (no mullions, signs or interiors), one band per pair of storeys that
  // share a light state, so the taller canyon costs a few quads, not a building's worth of detail
  function xFloor(B, f, fy){ if(!ON) return; const st = floorState(B, f & ~1, 5); if(st !== 1 && st !== 2) return; if((f & 1) && f - 1 >= B.nF0) return;
    const top = f + 1 < B.nF && !(f & 1) ? fy + FH + .48 : fy + .48; FQ(fy + .16, top, F(st === 1 ? '#b4c2e0' : '#dcb478')); }
  function drawB(sp, x, y, uw, fog, now){ const B = sp.b; fitB(B); const j = sp.k, end = B.b0 + B.len, n = spanOf(j, B.b0, end, fog); if(!n) return;
    FX1 = x; FY1 = y; FU1 = uw; if(!fin(x + y + uw) || !farEnd(j, n, sp.x)) return; FF = fog; ON = onAt(B.b0);
    const side = B.side, S = B.S, off = side < 0 ? Math.max(FX1, FX2) < -PX * 2 : Math.min(FX1, FX2) > W + PX * 2;
    if(off){ blades(B, j, n, now); if(j === B.b0) endWall(B, x, y, uw, now); return; }   // beside the camera, off the screen's edge: only what projects from it may show
    const hv = Math.min(B.h, Math.max(FY1 / Math.max(FU1, .01), FY2 / Math.max(FU2, .01)) + .1); if(hv <= 0) return;
    const fpx = Math.max(FU1, FU2) * FH, wpx = Math.abs(FX2 - FX1), far = fpx < 2.6;
    CAT = 'gnd'; ground(B, j, n, fpx, wpx, now); CAT = far ? 'far' : 'face';
    if(hv > G){ const base = F(S[1]); BASE = base;
      FQ(G, hv, base);   // (one quad: over 32 rows the engine fills it as one snapped path, far fewer ops than a band per spandrel)
      if(far){ // far: each floor one band of its main light (sign plates, lit windows), merged where they agree
        for(let f = 0; f < B.nF; f++){ const fy = G + f * FH; if(fy > hv) break; const t = B.fl[f];
          if(t === 'S') FQ(fy + .06, fy + FH - .04, L1(BRANDS[B.br].f)); else if(t === 'K') FQ(fy + .06, fy + FH * 2 - .04, L1(ART.wrap[B.wv] ? ART.wrap[B.wv].avg : '#3a2a8a')); else if(t === 'k') continue; else if(t === 'N') FQ(fy + .2, fy + .42, L1(f & 1 ? '#c050ff' : '#ff4aa0')); else if(t === 'T') FQ(fy + .2, fy + .4, L1('#ffa020')); else { const st = floorState(B, f, 0); if(st && ON) FQ(fy + .18, fy + .46, F(st === 1 ? '#b4c2e0' : st === 2 ? '#dcb478' : '#4a4a60')); } } }
      else for(let f = 0; f < B.nF; f++){ const fy = G + f * FH; if(fy > hv) break; if(FY1 - FU1 * (fy + FH) > H + PX * 2 && FY2 - FU2 * (fy + FH) > H + PX * 2) continue;
        const t = B.fl[f]; CAT = t; if(t === 'X'){ xFloor(B, f, fy); continue; } if(t === 'S') signBand(B, f, fy, j, n, fpx, wpx); else if(t === 'K') wrapBand(B, fy, j, n, fpx); else if(t === 'k') continue; else if(t === 'N') neonFloor(B, f, fy, j, n, fpx, now); else if(t === 'T') tickFloor(B, fy, j, n, fpx, now); else winFloor(B, f, fy, j, n, fpx, wpx); }

      if(hv >= B.h){ FQ(B.h - .05, B.h, F(S[2])); if(fpx >= 6) FQ(B.h, B.h + .1, F(S[0])); }   // the coping and a parapet
      if(B.rb && hv >= B.h) roofBoard(B, j, n, now); }
    CAT = 'blade'; blades(B, j, n, now); CAT = 'end';
    if(j === B.b0) endWall(B, x, y, uw, now); CAT = 'o'; }
  // the street floor (round 6): the shop's front as a picture (shopArt: stalls, glass and shelves, crane cabinets, capsule machines,
  // vending machines, a shutter) laid on the face, its average colour far away; the awning and its sign strip above; its light on the pavement
  function ground(B, j, n, fpx, wpx, now){ if(AKX.includes('gnd')) return; const gp = fpx * G / FH, S = B.S, A = ART.shopv ? ART.shopv[B.sv][B.svv | 0] : ART.shop[B.sv];
    if(gp < 3){ FQ(0, .56, L1(A ? A.avg : B.ic)); FQ(.56, G, F(S[0])); return; }
    if(B.sv === SH_KONB){ const K = KONB[B.kb | 0]; FQ(.56, G, L1(K[1])); FQ(G - .06, G, L1(K[0])); FQ(.56, .62, L1(K[2])); if(gp >= 12) awningInk(B, j, n, .63, G - .07); }   // the konbini's fascia: its livery in three stripes
    else { FQ(.56, G, L1(B.gr === 'crane' ? '#ff3a7a' : B.aw[0])); if(gp >= 12) awningInk(B, j, n, .59, G - .02); }
    FQ(0, .56, ON ? L1(A ? A.avg : B.ic) : F('#0c0a12'));
    const Q = ART.int && ART.int[B.sv] ? ART.int[B.sv][B.svv | 0] : null;
    if(A && ON && gp >= 5){ if(Q && gp >= 16 && !AKX.includes('noint')) interior(B, Q, 0, .56, j, n, 7.4); else faceArt(B, A, 0, .56, j, n, 7.4); }
    if(gp >= 10) FQ(.54, .56, F(ON ? '#fffaf0' : '#201c28'));   // the tube line under the awning
    if(RAINON && gp >= 10 && FF < .5) drips(B, j, n, now);
    if(ON && gp >= 14 && FF < .6) spill(B); }
  // the rain running off the awning's edge: world-anchored drips, each falling on its own cycle (a pale streak catching the shop light)
  function drips(B, j, n, now){ const c = F(ON ? '#aab8e8' : '#4a5070'), ln = Math.max(PX * 2, snp(Math.max(FU1, FU2) * .05));
    for(let q = Math.max(0, Math.floor((j - B.b0) / 1.1)); ; q++){ const z = B.b0 + q * 1.1 + H1(B.sd * 7.1 + q) * .7; if(z >= j + n) break; if(z < j) continue;
      const ph = (reduce ? .4 : (now / 560 + H1(q * 3.7 + B.sd)) % 1), hh = .54 * (1 - ph * ph), t = (z - j) / n, x = FX1 + (FX2 - FX1) * t, y = FY1 + (FY2 - FY1) * t - (FU1 + (FU2 - FU1) * t) * hh; R(x, y - ln, PX, ln, c); } }
  // the shop's light thrown on the pavement in front of it: two added-light bands, fading toward the kerb (Snow Onsen's warm pools)
  function spill(B){ const a0 = cx.globalAlpha, s = B.side, c = SHOPL[B.sv] || '#ffc070'; cx.globalCompositeOperation = 'lighter';
    for(const [w, a] of [[.46, .07], [.22, .08]]){ cx.globalAlpha = a0 * a * (1 - FF); poly4(FX1, FY1, FX2, FY2, FX2 - s * w * FU2, FY2, FX1 - s * w * FU1, FY1, c); }
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = a0; }
  // the awning's words as one bar per character (face text proper at the floors above; here it would be a 2-pixel smear)
  function awningInk(B, j, n, h0, h1){ const ink = L1(B.aw[1]), m = 3, gl = (h1 - h0) * 8;
    for(let q = Math.floor((j - B.b0) / 9); ; q++){ const z = B.b0 + q * 9 + 1.5; if(z >= j + n) break; for(let c = 0; c < m; c++){ const za = z + c * gl * 1.4, ta = (za - j) / n, tb = (za + gl - j) / n; if(tb <= 0 || ta >= 1) continue; FQ(h0 + (h1 - h0) * .3, h0 + (h1 - h0) * .7, ink, Math.max(0, ta), Math.min(1, tb)); } } }
  // a floor of windows: a lit or dark band, world-anchored mullions, near: the stockroom behind the glass (boxes, shelving)
  function winFloor(B, f, fy, j, n, fpx, wpx){ const sec = Math.floor((j - B.b0) / 7), st = ON ? floorState(B, f, sec) : 0, col = st === 1 ? '#b4c2e0' : st === 2 ? '#dcb478' : st === 3 ? '#4a4a60' : '#141826';
    FQ(fy + .16, fy + .48, F(col)); if(fpx < 8) return;
    if(fpx < 11) return; const P = B.P, b0 = B.b0; for(let q = Math.ceil((j - b0) / P); ; q++){ const z = b0 + q * P; if(z >= j + n) break; const t = (z - j) / n; FQ(fy + .16, fy + .48, F(B.S[0]), t, Math.min(1, t + Math.max(.18 / n, PX * 1.1 / Math.max(wpx, 1)))); }
    if(fpx >= 14) FQ(fy + .48, fy + .51, F(B.S[2])); if(fpx >= 14 && st === 1 || fpx >= 14 && st === 2) FQ(fy + .17, fy + .25, F(st === 1 ? '#8a98b4' : '#a07a4a')); }   // the sill's lit lip; boxes stacked against the glass
  // an arcade floor: dark glass full of game screens (blues and magentas) under a neon tube
  function neonFloor(B, f, fy, j, n, fpx, now){ FQ(fy + .1, fy + .5, F(ON ? '#2a1a3e' : '#0e0a16')); FQ(fy + .52, fy + .56, L1(f & 1 ? '#c050ff' : '#ff4aa0'));
    if(fpx < 6) return; const P = 2, b0 = B.b0; for(let q = Math.floor((j - b0) / P); ; q++){ const z = b0 + q * P + .4; if(z >= j + n) break; const ta = (z - j) / n, tb = (z + 1.1 - j) / n; if(tb <= 0) continue; const hv = H1(B.sd + q * 1.3 + f * 7.1);
      FQ(fy + .2, fy + .38, ON ? fc(hv < .33 ? '#5a8aff' : hv < .66 ? '#e85aff' : '#5ae8d0', FF * .5) : F('#120e1a'), Math.max(0, ta), Math.min(1, tb)); } }
  // an LED ticker band along the face: dark, its amber characters marching (world-anchored blocks that move with time)
  function tickFloor(B, fy, j, n, fpx, now){ FQ(fy + .12, fy + .44, F('#140a08')); if(!ON || fpx < 5) return; const sp = reduce ? 0 : now / 1000 * 7;
    for(let q = Math.floor((j - B.b0 - (sp % 1.6)) / 1.6) - 1; ; q++){ const z = B.b0 + q * 1.6 + (sp % 1.6); if(z >= j + n) break; if(z < B.b0 + .5 || z > B.b0 + B.len - 1) continue; const ta = (z - j) / n, tb = (z + .9 - j) / n; if(tb <= 0 || ta >= 1) continue;
      const k = H1(Math.floor(q - sp / 1.6) * 1.7); if(k < .25) continue; FQ(fy + .18 + (k < .5 ? .06 : 0), fy + .38 - (k > .8 ? .06 : 0), fc('#ffb02a', FF * .4), Math.max(0, ta), Math.min(1, tb)); } }
  /* A sign band across a floor: the plate, its lit top edge and shadowed foot, and its word in glyph cells projected on the face. Each cell
     is a square on the wall; its ink is the glyph's coverage mask at 3, 6 or 12 cells a side by the cell's size on screen (one bar when
     smaller), runs of a column merged into one band. The text reads along the street toward you on the left (+z) and away on the right,
     with each glyph's columns mirrored there, as you would read it facing the wall. */
  /* A sign band (round 4): the building's brand as a lightbox along the floor: its field, then the band art laid on the wall in strips,
     each strip projected at its own depth, cut per slice so a nearer slice always covers a farther one. The box stands proud of the wall:
     a lit lip above, a shadow line under it on the cladding. */
  function signBand(B, f, fy, j, n, fpx, wpx){ const Bd = BRANDS[B.br], h0 = fy + .05, h1 = fy + FH - .03; FQ(h0, h1, L1(Bd.f));
    if(fpx >= 3) faceArt(B, ART.band[B.br], h0, h1, j, n, 13);
    if(fpx >= 8){ FQ(h1, h1 + .025, L1(Bd.fl)); FQ(h0 - .04, h0, F('#06040a')); }
    if(RAINON && ON && fpx >= 4 && FF < .5){ const P2 = hazeP(Bd.f); FQ(h1 + .025, h1 + .09, P2[0]); FQ(h1 + .09, h1 + .16, P2[1]); } }
  function wrapBand(B, fy, j, n, fpx){ const A = ART.wrap[B.wv], h0 = fy + .06, h1 = fy + FH * 2 - .04; if(!A) return; FQ(h0, h1, L1(A.avg));
    if(fpx >= 2) faceArt(B, A, h0, h1, j, n, 17);
    if(fpx >= 8){ FQ(h1, h1 + .03, F('#d8d8e8')); FQ(h0 - .05, h0, F('#06040a')); } }
  // (round 5: a band under 6 px tall is left to its own colour)
  // art on the face from B.b0 + .6 to the run's end - .6, tiled every ~rep segments; this slice's part only, in strips about 4 px wide
  const FXS = new Float64Array(26);
  function faceArt(B, A, h0, h1, j, n, rep){ if(!A || !ON || AKX.includes('text')) return; const z0b = B.b0 + .6, Lz = B.len - 1.2; if(Lz < 1) return;
    const copies = Math.max(1, Math.round(Lz / rep)), tl = Lz / copies, zv = Math.floor(position / SEG) + 1.02, flip = B.side > 0, X0 = B.side * B.x0;
    const sa = Math.max(j, zv, z0b), sb = Math.min(j + n - .001, z0b + Lz); if(sb <= sa) return;
    if(!CF(sa)) return; const xa = CFX + (X0 + laneDX(Math.floor(sa))) * CFU, ua = CFU; if(!CF(sb)) return; const xb = CFX + (X0 + laneDX(Math.floor(sb))) * CFU;
    const hv = (h1 - h0) * Math.max(ua, CFU); if(hv < PX * 6 || !fin(xa + xb)) return; const kv = hv / A.h, Lv = A.L[kv < PX * .375 ? 2 : kv < PX * .75 ? 1 : 0], sc = A.w / Lv.w;
    const ns = Math.max(1, Math.min(12, Math.round(Math.abs(xb - xa) / (PX * 4)))), a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .55);
    for(let s = 0; s <= ns; s++){ const z = sa + (sb - sa) * s / ns; FXS[s] = CF(z) ? snp(CFX + (X0 + laneDX(Math.floor(z))) * CFU) : NaN; }
    for(let s = 0; s < ns; s++){ const za = sa + (sb - sa) * s / ns, zb = sa + (sb - sa) * (s + 1) / ns, xl = Math.min(FXS[s], FXS[s + 1]), xr = Math.max(FXS[s], FXS[s + 1]); if(!(xr > xl) || xr < -PX || xl > W + PX) continue;
      const ta = (za - z0b) / tl, ti = Math.floor(ta), tb = Math.min(ti + 1, (zb - z0b) / tl); let u0 = ta - ti, u1 = tb - ti; if(flip){ const q = 1 - u1; u1 = 1 - u0; u0 = q; }
      if(!CF((za + zb) / 2)) continue; const yt = snp(CFY - h1 * CFU), yb = snp(CFY - h0 * CFU); if(yb <= yt) continue;
      cx.drawImage(AT, Lv.x + u0 * Lv.w, Lv.y, Math.max(.01, (u1 - u0) * Lv.w), Lv.h, xl, yt, xr - xl, yb - yt); }
    cx.globalAlpha = a0; }
  /* The layered interior (round 7): faceArt's strips, but four layers back to front, each sampled 16 + u x 128 + its slide, the slide being its
     depth x how obliquely this strip of the front is seen (1 straight on at the screen's edge, 0 toward the vanishing point), in whole
     texels, toward the far end of the street on either side. At most 8 strips, so a near front is a few dozen drawImages. */
  const IDEP = [1, .62, .32, 0];
  function interior(B, Q, h0, h1, j, n, rep){ const z0b = B.b0 + .6, Lz = B.len - 1.2; if(Lz < 1) return;
    const copies = Math.max(1, Math.round(Lz / rep)), tl = Lz / copies, zv = Math.floor(position / SEG) + 1.02, flip = B.side > 0, X0 = B.side * B.x0, dir = flip ? -1 : 1;
    const sa = Math.max(j, zv, z0b), sb = Math.min(j + n - .001, z0b + Lz); if(sb <= sa) return;
    if(!CF(sa)) return; const xa = CFX + (X0 + laneDX(Math.floor(sa))) * CFU, ua = CFU; if(!CF(sb)) return; const xb = CFX + (X0 + laneDX(Math.floor(sb))) * CFU;
    const hv = (h1 - h0) * Math.max(ua, CFU); if(hv < PX * 6 || !fin(xa + xb)) return; const kv = hv / 32, li = kv < PX * .375 ? 2 : kv < PX * .75 ? 1 : 0;
    const ns = Math.max(1, Math.min(8, Math.round(Math.abs(xb - xa) / (PX * 6)))), a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .55);
    for(let s = 0; s <= ns; s++){ const z = sa + (sb - sa) * s / ns; FXS[s] = CF(z) ? snp(CFX + (X0 + laneDX(Math.floor(z))) * CFU) : NaN; }
    for(let s = 0; s < ns; s++){ const za = sa + (sb - sa) * s / ns, zb = sa + (sb - sa) * (s + 1) / ns, xl = Math.min(FXS[s], FXS[s + 1]), xr = Math.max(FXS[s], FXS[s + 1]); if(!(xr > xl) || xr < -PX || xl > W + PX) continue;
      const ta = (za - z0b) / tl, ti = Math.floor(ta), tb = Math.min(ti + 1, (zb - z0b) / tl); let u0 = ta - ti, u1 = tb - ti; if(flip){ const q = 1 - u1; u1 = 1 - u0; u0 = q; }
      if(!CF((za + zb) / 2)) continue; const yt = snp(CFY - h1 * CFU), yb = snp(CFY - h0 * CFU); if(yb <= yt) continue;
      const ob = clamp(1 - Math.abs((xl + xr) / 2 - W / 2) / (W / 2), 0, 1);
      for(let k = 0; k < 4; k++){ const Lv = Q[k].L[li], sc = Lv.w / LW0, sh = Math.round(IDEP[k] * 14 * ob) * dir, sx = Lv.x + (16 + u0 * 128 + sh) * sc, sw = Math.max(.01, (u1 - u0) * 128 * sc);
        cx.drawImage(AT, sx, Lv.y, sw, Lv.h, xl, yt, xr - xl, yb - yt); } }
    cx.globalAlpha = a0; }
  /* The words on a sign band (round 2: whole glyphs, never fragments). Each character is placed once per sign, in world space (a square
     cell on the wall), and drawn once a frame, from the slice that holds its nearest visible column, so a slice edge never cuts it.
     - Legible (its cell at least 9 canvas px tall, and foreshortened to no less than 0.42 of its height): the glyph from the atlas at the
       nearest size, drawn in vertical strips, each strip projected at its own depth, so it lies on the wall in perspective. It sits inside
       the plate's band, so it is bounded by the sign, not by a slice.
     - Smaller, or seen too obliquely to read: one ink slug per character, the same size and place every time (a rhythm, not noise).
     - Far: the plate's colour band alone.
     The text reads along the street toward the vanishing point on the left and toward you on the right, as you would read it facing the
     wall; the glyph's pixels are never mirrored. Nothing is drawn on a dead sign (the blackout). */
  function faceText(B, f, fy, j, n){ if(!ON || AKX.includes('text')) return; const Pn = PAN[B.pn[f]], word = B.wd[f], m = word.length, h0 = fy + .05, h1 = fy + FH - .03, gh = (h1 - h0) * .74, hc = (h0 + h1) / 2;
    let gl = gh * 10, pitch = gl * 1.12; const room = B.len - 1.2; if(m * pitch > room){ pitch = room / m; gl = pitch / 1.12; } if(gl < 1.4) return;
    const wordW = m * pitch, copies = Math.max(1, Math.floor((B.len + 4) / (wordW + 6))), span = copies * wordW + (copies - 1) * 6, st0 = B.b0 + (B.len - span) / 2, flip = B.side > 0, zv = Math.floor(position / SEG) + 1.02;   // (the first segment wholly in front of the camera)
    for(let q = 0; q < copies; q++){ const zs = st0 + q * (wordW + 6);
      for(let c = 0; c < m; c++){ const z0 = zs + (flip ? m - 1 - c : c) * pitch + (pitch - gl) / 2, z1 = z0 + gl, za = Math.max(z0, zv); if(za >= z1 || za < j || za >= j + n) continue;
        const zm = Math.max(za, (z0 + z1) / 2); if(!CF(zm)) continue; const X = B.side * B.x0 + laneDX(Math.floor(zm)), hp = gh * CFU; if(hp < PX * 3) continue;
        const xm = CFX + X * CFU, ym = CFY, um = CFU, wp = Math.abs(xAtF(B, Math.min(z1 - .001, Math.max(zm + .001, z1 - .001))) - xAtF(B, za));
        if(hp >= PX * 9 && wp >= hp * .42 && glyphFace(B, word[c], Pn[2], z0, z1, hc, gh, zv)) continue;
        // the slug: the middle of the cell, the ink mixed toward the plate (a soft, regular read, not a hard mark)
        const hw = Math.max(PX * .5, wp * .22); R(xm - hw, ym - (hc + gh * .2) * um, hw * 2, Math.max(PX, gh * .4 * um), L1(PANS[B.pn[f]])); } } }
  // the screen x of the face of B at segment-float z (NaN if that segment isn't projected)
  function xAtF(B, z){ return CF(z) ? CFX + (B.side * B.x0 + laneDX(Math.floor(z))) * CFU : NaN; }
  const GX = new Float64Array(16);
  function glyphFace(B, ch, st, z0, z1, hc, gh, zv){ const zm = (z0 + z1) / 2; if(!CF(zm)) return false; const hcv = gh * CFU / PX, g = gpickH(st, ch, hcv); if(!g) return false;
    const half = (z1 - z0) * Math.min(1, g.w / g.h) / 2, flip = B.side > 0, ns = Math.max(1, Math.min(g.w, 12)), X0 = B.side * B.x0;
    const zAt = t => flip ? zm + half - 2 * half * t : zm - half + 2 * half * t;
    for(let k = 0; k <= ns; k++){ const z = Math.max(zv, zAt(k / ns)); if(!CF(z)) return false; GX[k] = snp(CFX + (X0 + laneDX(Math.floor(z))) * CFU); }   // (strips behind the near plane collapse to nothing)
    const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .5);
    for(let k = 0; k < ns; k++){ const sx0 = Math.floor(k * g.w / ns), sx1 = Math.floor((k + 1) * g.w / ns); if(sx1 <= sx0) continue; const xl = Math.min(GX[k], GX[k + 1]), xr = Math.max(GX[k], GX[k + 1]); if(xr <= xl || xr < -PX || xl > W + PX) continue;
      if(!CF(Math.max(zv, zAt((k + .5) / ns)))) continue; const yt = snp(CFY - (hc + gh / 2) * CFU), yb = snp(CFY - (hc - gh / 2) * CFU); if(yb <= yt || !fin(yt + yb)) continue;
      if(AKU && xr > 0 && xl < W && yb > 0 && yt < H) USED[g.k] = (USED[g.k] || 0) + 1;
      cx.drawImage(ATL, g.ax + sx0, g.ay, sx1 - sx0, g.sh, xl, yt, xr - xl, yb - yt); }
    cx.globalAlpha = a0; return true; }
  // the atlas glyph whose height is nearest the wanted height (canvas px)
  function gpickH(st, ch, hc){ const T = GA[st] && GA[st][ch]; if(!T) return null; let best = null, bd = 1e9; for(let si = 0; si < SZ.length; si++){ const g = T[si]; if(!g) continue; const d = Math.abs(g.h - hc); if(d < bd){ bd = d; best = g; } } return best; }
  // blades and plate columns: plates projecting from the face toward the road, facing the camera (as you see them down the street)
  let CFX = 0, CFY = 0, CFU = 0;
  function CF(z){ const i = Math.floor(z), sg = segs[i]; if(!sg) return false; const a = sg.p1.screen, b = sg.p2.screen; if(!a.w || !b.w) return false; const f = z - i; CFX = a.x + (b.x - a.x) * f; CFY = a.y + (b.y - a.y) * f; CFU = a.w + (b.w - a.w) * f; return fin(CFX + CFY + CFU); }
  function CR(X0, X1, h0, h1, col){ const xa = CFX + X0 * CFU, xb = CFX + X1 * CFU; R(Math.min(xa, xb), CFY - h1 * CFU, Math.abs(xb - xa), (h1 - h0) * CFU, col); }
  function blades(B, j, n, now){ const Lb = B.bl; if(!Lb.length || AKX.includes('blade')) return; for(let q = 0; q < Lb.length; q++){ const b = Lb[q], z = B.b0 + b.z; if(z >= j && z < j + n) blade(B, b, z, now); } }
  function blade(B, b, z, now){ if(!CF(z + .5)) return; const A = b.ban !== undefined ? ART.ban[b.ban] : b.plate ? ART.plate[b.ic * PAN.length + b.p] : null; if(A) return bladeArt(B, b, z, now, A);
    const side = B.side, lx = laneDX(Math.floor(z)), Xo = side * (B.x0 - .03) + lx, Xi = Xo - side * b.pr, u = CFU;
    { const xa = CFX + Xo * u, xb = CFX + Xi * u; if((xa < -PX * 2 && xb < -PX * 2) || (xa > W + PX * 2 && xb > W + PX * 2)) return; }
    const hb = (b.f0 ? G + (b.f0 - 1) * FH : .02) + (b.plate ? (b.f0 ? FH : G) * .18 : .08) + (b.plate && b.f0 ? FH * .12 : 0), ht = Math.min(B.h - .08, (b.f0 ? G + (b.f1 - 1) * FH : G) + (b.plate ? 0 : FH - .1)) - (b.plate ? .04 : 0);
    if(ht - hb < .15) return; const Pn = PAN[b.p], pw = Math.abs(Xo - Xi) * u, ph = (ht - hb) * u;
    if(pw < PX * 1.5){ CR(Xi, Xo, hb, ht, L1(Pn[0])); return; }   // far: a lit strip
    CR(Xi - side * .03, Xo, hb - .04, ht + .04, F('#16121c')); CR(Xi, Xo - side * .05, hb, ht, L1(Pn[0]));   // the steel frame; the plate
    if(pw >= PX * 5) CR(Xi, Xo - side * .05, ht - .025, ht, L1(mixc(Pn[0], '#ffffff', .5)));   // its lit top edge
    const word = b.word, m = word.length, cell = Math.min(ph / m, pw * .95), sty = STY[Pn[2]], xm = CFX + (Xi + Xo - side * .05) / 2 * u;
    const sq = b.seq && !reduce && !(window.ASSIST && ASSIST.noFlash) ? Math.floor((now + b.z * 977 + B.b0 * 131) / 240) % (m + 7) : -1;   // the stepping neon: char by char, held, a blink
    if(ON) for(let c = 0; c < m; c++){ const yc = CFY - (ht - (c + .5) * (ht - hb) / m) * u, g = gpick(Pn[2], word[c], cell - PX);
      if(sq >= 0 && (sq < m ? c > sq : sq === m + 4 || sq === m + 6)){ if(cell > PX * 2.5){ cx.fillStyle = F('#2a2430'); pxRect(xm - cell * .25, yc - cell * .12, cell * .5, Math.max(PX, cell * .24)); } continue; }
      if(g){ const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .5); gblit(g, xm, yc); cx.globalAlpha = a0; }
      else if(cell > PX * 2.5){ cx.fillStyle = L1(Pn[1]); pxRect(xm - Math.min(pw * .3, cell * .3), yc - cell * .14, Math.min(pw * .6, cell * .6), Math.max(PX, cell * .28)); } }
    else if(cell > PX * 2.5) for(let c = 0; c < m; c++){ const yc = CFY - (ht - (c + .5) * (ht - hb) / m) * u; cx.fillStyle = F('#141018'); pxRect(xm - cell * .25, yc - cell * .12, cell * .5, Math.max(PX, cell * .24)); }
    if(b.chase && ON && pw >= PX * 6){ // chasing bulbs down both edges of the arcade's blade (steady, every other bulb, under reduced motion)
      const step = Math.max(PX * 3, snp(ph / 22)), ph0 = reduce ? 0 : Math.floor(now / 110); cx.fillStyle = fc('#fff2b0', FF * .4);
      for(let yy = 0, k = 0; yy < ph; yy += step, k++) if((k + ph0) % 3 !== 0) for(const X of [Xi, Xo - side * .05]){ const xx = CFX + X * u; if(xx > -PX && xx < W + PX) pxRect(xx - PX / 2, CFY - ht * u + yy, PX, PX); } } }
  /* A blade as a picture (round 4): a character banner or a tenant plate, a lightbox standing off the wall on two steel brackets (each
     blade its own offset, so the stack has depth), its edge seen as a strip of the box's side, a bezel with a lit top, the shadow it throws
     on the wall in the gap, and a two-ring glow of its own light. */
  function bladeArt(B, b, z, now, A){ const side = B.side, lx = laneDX(Math.floor(z)), Xw = side * (B.x0 - .03) + lx, Xo = Xw - side * (b.off || 0), Xi = Xo - side * b.pr, u = CFU;
    const xw = CFX + Xw * u, xo = CFX + Xo * u, xi = CFX + Xi * u; if((Math.max(xw, xi) < -PX * 2) || (Math.min(xw, xi) > W + PX * 2)) return;
    const hb = (b.f0 ? G + (b.f0 - 1) * FH : .02) + (b.plate ? (b.f0 ? FH : G) * .18 : .08) + (b.plate && b.f0 ? FH * .12 : 0), ht = Math.min(B.h - .08, (b.f0 ? G + (b.f1 - 1) * FH : G) + (b.plate ? 0 : FH - .1)) - (b.plate ? .04 : 0);
    if(ht - hb < .15) return; const pw = Math.abs(xo - xi), ph = (ht - hb) * u;
    if(b.plate && pw < PX * 4) return;   // round 5: far plates are confetti; gone
    if(pw < PX * 5){ const hh = Math.min(ht - hb, Math.abs(Xo - Xi) * A.h / A.w); CR(Xi, Xo, ht - hh, ht, L1(A.avg)); return; }   // far: one soft block of its colour
    const k = Math.min(pw / A.w, ph / A.h), aw = A.w * k, ah = A.h * k, left = (xo + xi) / 2 - aw / 2, top = CFY - ht * u, t = Math.max(PX, snp(k * .8));
    if(pw >= PX * (b.plate ? 8 : 4)){ const bw = Math.max(PX, snp(u * .018)), bx = Math.min(xw, side < 0 ? left - t : left + aw + t), bxw = Math.abs(xw - (side < 0 ? left - t : left + aw + t));
      if(bxw >= PX){ R(bx, top + ah * .1, bxw, ah * .95, F(mixc(B.S[0], '#000000', .5)));   // its shadow on the wall
        R(bx, top + ah * .06, bxw, bw, F('#4a4656')); R(bx, top + ah * .9, bxw, bw, F('#4a4656')); } }   // the brackets
    if(!b.plate) halo(left - t, top - t, aw + t * 2, ah + t * 2, A.avg, 1);
    if(pw >= PX * 5){ const ew = Math.max(PX, snp(pw * .06)); R(side < 0 ? left + aw + t : left - t - ew, top - t + PX, ew, ah + t * 2 - PX, F('#24202e')); }   // the box's edge, toward the road
    R(left - t, top - t, aw + t * 2, ah + t * 2, F('#16121c')); art(A, left, top, k);
    if(pw >= PX * 5) R(left - t, top - t, aw + t * 2, PX, ON ? fc(mixc(A.avg, '#ffffff', .6), FF * .5) : F('#1c1a24'));   // the bezel's lit top
    if(b.chase && ON && pw >= PX * 6){ const step = Math.max(PX * 3, snp(ah / 22)), ph0 = reduce ? 0 : Math.floor(now / 110); cx.fillStyle = fc('#fff2b0', FF * .4);
      for(let yy = 0, q = 0; yy < ah; yy += step, q++) if((q + ph0) % 3 !== 0) for(const xx of [left - t, left + aw + t - PX]) if(xx > -PX && xx < W + PX) pxRect(xx, top + yy, PX, PX); } }
  /* The roof billboard (round 4): key art or a brand block on a steel lattice, its bezel, three spotlights on arms throwing a warm wash down
     its top (the references' boards are front-lit, not backlit). */
  function roofBoard(B, j, n, now){ const zc = B.b0 + Math.floor(B.len / 2); if(!(zc >= j && zc < j + n) || !CF(zc + .5)) return; const rb = B.rb, A = rb.bb !== undefined ? ART.bb[rb.bb] : null; if(A) return billboardAt(B, zc, A, now);
    const side = B.side, lx = laneDX(zc), Xa = side * (B.x0 + .15) + lx, Xb = side * (B.x0 + B.depth - .1) + lx, u = CFU, h0 = B.h + .18, h1 = B.h + .95, Pn = PAN[rb.p];
    if((h1 - h0) * u < PX * 2) { CR(Xa, Xb, h0, h1, L1(Pn[0])); return; }
    for(const X of [Xa + side * .2, Xb - side * .2]) CR(X - .03, X + .03, B.h, h0, F('#24202c'));
    CR(Xa, Xb, h0, h1, L1(mixc(Pn[0], '#ffffff', .4))); CR(Xa + side * .05, Xb - side * .05, h0 + .05, h1 - .05, L1(Pn[0]));
    const m = rb.word.length, w = Math.abs(Xb - Xa) * u * .9, cell = Math.min(w / m, (h1 - h0) * u * .8), xm = CFX + (Xa + Xb) / 2 * u, yc = CFY - (h0 + h1) / 2 * u, dir = side > 0 ? 1 : 1;
    if(ON) for(let c = 0; c < m; c++){ const g = gpick(Pn[2], rb.word[c], cell); const xc = xm + (c - (m - 1) / 2) * cell * dir; if(g) gblit(g, xc, yc); else if(cell > PX * 2){ cx.fillStyle = L1(Pn[1]); pxRect(xc - cell * .3, yc - cell * .15, cell * .6, Math.max(PX, cell * .3)); } }
    if(ON && (h1 - h0) * u > PX * 10){ cx.fillStyle = fc('#fff6c8', FF * .4); const st = Math.max(PX * 3, snp(w / 16)); for(let xx = CFX + Math.min(Xa, Xb) * u + st / 2; xx < CFX + Math.max(Xa, Xb) * u; xx += st) pxRect(xx, CFY - h1 * u - PX * 2, PX, PX); } }
  function billboardAt(B, zc, A, now){ const side = B.side, lx = laneDX(zc), Xa = side * (B.x0 + .1) + lx, Xb = side * (B.x0 + B.depth - .05) + lx, u = CFU, wU = Math.abs(Xb - Xa), h0 = B.h + .26, h1 = h0 + wU * A.h / A.w;
    if((h1 - h0) * u < PX * 2){ CR(Xa, Xb, h0, h1, L1(A.avg)); return; }
    const left = CFX + Math.min(Xa, Xb) * u, top = CFY - h1 * u, k = wU * u / A.w, aw = A.w * k, ah = A.h * k, t = Math.max(PX, snp(k * .7)), bot = CFY - h0 * u, roof = CFY - B.h * u, sc = F('#2a2632');
    if(u > 5){ const lw = Math.max(PX, snp(u * .02)); for(const X of [.12, .5, .88]) R(left + aw * X - lw / 2, bot, lw, roof - bot, sc);   // the lattice: legs, a catwalk, cross braces
      R(left, bot, aw, Math.max(PX, snp(u * .015)), sc); if(roof - bot > PX * 3 && u > 10){ pline(left + aw * .12, bot, left + aw * .5, roof, sc, 1); pline(left + aw * .5, bot, left + aw * .12, roof, sc, 1); pline(left + aw * .5, bot, left + aw * .88, roof, sc, 1); pline(left + aw * .88, bot, left + aw * .5, roof, sc, 1); } }
    bezel(left, top, aw, ah, t, false); art(A, left, top, k);
    if(k > PX * .4){ const al = Math.max(PX, snp(ah * .16)); for(let q = 0; q < 3; q++){ const lx2 = snp(left + aw * (.18 + q * .32)); R(lx2, top - t - al, PX, al, sc); R(lx2 - PX, top - t - al - PX, PX * 3, PX, F('#3a3644'));
        R(lx2 - PX, top - t - al, PX * 3, PX, ON ? fc('#fffaf0', FF * .3) : F('#1c1a24')); }
      if(ON && FF < .8){ const a0 = cx.globalAlpha; cx.globalCompositeOperation = 'lighter'; cx.fillStyle = '#ffe8c0';
        for(let q = 0; q < 3; q++){ const lx2 = left + aw * (.18 + q * .32); cx.globalAlpha = a0 * .12 * (1 - FF); pxRect(lx2 - aw * .11, top, aw * .22, ah * .2); cx.globalAlpha = a0 * .06 * (1 - FF); pxRect(lx2 - aw * .15, top + ah * .2, aw * .3, ah * .22); }
        cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = a0; } } }
  // the end wall facing the camera at the run's start: windows; on the stores, a big board above the shorter neighbour, or the LED ticker
  function endWall(B, x, y, uw, now){ endWall0(B, x, y, uw, now); if(B.hero >= 0 && !AKX.includes('hero')) heroScreen(B, x, y, uw, now); }
  /* The hero screen (round 4, at Neon Ward's screen's bar): 64 x 40 LEDs hung off the corner of the first building past a crossing, facing
     you across it and over the pavement (the references' crossing screens), on a steel truss from the wall: posts, a top beam, a brace. A
     bezel with thickness, its cast shadow, its glow, the LED grid fading in near by, an LED ticker under it. */
  function heroScreen(B, x, y, uw, now){ const side = B.side, xi = x - side * .82 * uw, xo = x + side * 1.02 * uw, sw = Math.abs(xo - xi); if(!fin(xi + xo + y) || sw < PX * 3) return;
    const sx = Math.min(xi, xo), sh = sw * 40 / 64, bot = y - uw * (G + .14), sy = bot - sh, t = Math.max(PX, snp(sw * .025)); if(sx > W + PX || sx + sw < -PX || bot < -PX || sy > H) return;
    const sc = F('#2a2632'), bw = Math.max(PX, snp(uw * .03)), xw = x, top = sy - t * 2 - Math.max(PX * 2, snp(sh * .12));
    if(uw > 2){ R(Math.min(xw, sx + sw * (side < 0 ? 1 : 0)) , top, Math.abs(xw - (sx + sw * (side < 0 ? 1 : 0))) + PX, bw, sc);   // the truss's top beam back to the wall
      for(const q of [.18, .82]) R(sx + sw * q - bw / 2, top, bw, sy - top, sc);   // the hangers
      R(sx, top, sw, bw, sc); pline(xw, bot + sh * .2, sx + sw * (side < 0 ? 1 : 0), top + bw, sc, Math.max(1, Math.round(bw / PX))); }   // the brace
    const fr = ART.fox, f = reduce ? 20 : Math.floor(now / 120) % fr.length;   // round 6: the foxfire screen (the crane hangs on the gantry)
    bezel(sx, sy, sw, sh, t, false); halo(sx - t, sy - t, sw + t * 2, sh + t * 2, '#ff8a2a', 1.3); screenAt(fr[f], sx, sy, sw, sh, now);
    // under it, a marquee strip of amber bulbs chasing (steady under reduced motion)
    const th = Math.max(PX * 2, snp(sh * .07)), my = sy + sh + t; R(sx - t, my, sw + t * 2, th + PX * 2, F('#141220'));
    if(ON && th >= PX * 2){ const st = Math.max(PX * 2, snp(th * .8)), ph0 = reduce ? 0 : Math.floor(now / 90), by = my + PX + snp((th - PX) / 2); cx.fillStyle = fc('#ffb02a', FF * .4);
      for(let xx = sx, q = 0; xx < sx + sw; xx += st, q++) if((q + ph0) % 4) pxRect(xx, by, PX, PX); } }
  function endWall0(B, x, y, uw, now){ if(AKX.includes('end')) return; const side = B.side, dx = side * B.depth * uw, xl = Math.min(x, x + dx), wd = Math.abs(dx), h1 = Math.min(B.h, y / Math.max(uw, .01) + .1); if(h1 <= 0 || wd < 1 || !fin(xl + wd)) return;
    if(xl > W + PX || xl + wd < -PX) return; const S = B.S;
    R(xl, y - uw * h1, wd, uw * h1, F(S[0])); R(side > 0 ? xl : xl + wd - Math.max(PX, wd * .05), y - uw * h1, Math.max(PX, wd * .05), uw * h1, F(S[2]));   // the wall; its corner catching the street light
    { const gh = uw * .56, gy = y - gh; R(xl, gy, wd, gh, F(ON ? mixc(B.ic, '#5a5a78', .45) : '#0c0a12')); R(xl, y - uw * G, wd, uw * (G - .56), L1(B.aw[0]));   // the shop seen from its side: a dimmer interior, the awning's end
      if(wd > PX * 6){ for(let q = 0; q < 3; q++){ const bx = xl + wd * (.12 + q * .28), bh = gh * (.25 + H1(B.sd * 3 + q) * .25); R(bx, y - bh, wd * .2, bh, F(ON ? ['#8a7a5a', '#5a6a8a', '#a08a6a'][q] : '#141018')); R(bx, y - bh, wd * .2, PX, F(ON ? '#e8e0d0' : '#1c1820')); }
        R(xl, gy, wd, PX, F(ON ? '#ffffff' : '#1c1a24')); } }   // boxes stacked inside, a tube along the top
    const fpx = FH * uw, ew = B.ew, exp = Math.max(G, B.ph + .2);
    let bd0 = 99, bd1 = 0; if(ew && B.h - exp > FH * 1.6){ bd0 = exp + .15; bd1 = Math.min(B.h - .2, bd0 + Math.min(4 * FH, B.h - exp - .35)); }
    // the hero screen: 64 x 40 LEDs across most of the wall's width, above the shop, a ticker under it, on a steel frame
    if(B.hero >= 0){ bd0 = 99; bd1 = 0; }   // (the hero screen hangs off this corner instead of a board)
    if(fpx >= 3) for(let f = 0; f < B.nF; f++){ const fy = G + f * FH; if(fy > h1 || B.fl[f] === 'X') break; if(fy + FH > bd0 && fy < bd1) continue; const st = ON ? floorState(B, f, 99) : 0; if(!st && fpx < 7) continue;
      R(xl + wd * .2, y - uw * (fy + .48), wd * .6, uw * .3, F(st === 1 ? '#b4c2e0' : st === 2 ? '#dcb478' : st === 3 ? '#4a4a60' : '#141826')); if(wd > PX * 14) R(xl + wd * .5 - PX / 2, y - uw * (fy + .48), PX, uw * .3, F(S[0])); }
    if(bd1 > bd0 && bd1 <= h1 + 2 && (ew.att || ART.po[ew.po])){ const yt = y - uw * bd1, hh = uw * (bd1 - bd0), x0 = xl + wd * .06, ww = wd * .88, hz = ew.tk ? hh * .8 : hh;   // round 4: a poster lightbox, or the arcade's attract screen
      if(ew.att){ const sh = Math.min(hz, ww * 20 / 32), sw = sh * 32 / 20, sx = x0 + (ww - sw) / 2, t = Math.max(PX, snp(sw * .04)); bezel(sx, yt, sw, sh, t, mixc(B.S[0], '#000000', .55)); halo(sx - t, yt - t, sw + t * 2, sh + t * 2, '#5a8aff', .8); screenAt(ART.att[reduce ? 3 : Math.floor(now / 140) % 16], sx, yt, sw, sh, now); }
      else { const A = ART.po[ew.po], k = Math.min(ww / A.w, hz / A.h), aw = A.w * k, ah = A.h * k, left = x0 + (ww - aw) / 2, t = Math.max(PX, snp(k * .8)); bezel(left, yt, aw, ah, t, mixc(B.S[0], '#000000', .55)); halo(left - t, yt - t, aw + t * 2, ah + t * 2, A.avg, 1); art(A, left, yt, k); }
      if(ew.tk && hh > PX * 14){ const th = Math.min(hh * .14, ww * .2); tickerAt(x0 + ww * .06, yt + hh - th, ww * .88, th, now); } }
    else if(bd1 > bd0 && bd1 <= h1 + 2){ const Pn = PAN[ew.p], yt = y - uw * bd1, hh = uw * (bd1 - bd0), x0 = xl + wd * .06, ww = wd * .88;   // the board: frame, lit panel, its word set top to bottom
      R(x0 - PX, yt - PX, ww + PX * 2, hh + PX * 2, F('#16121c')); R(x0, yt, ww, hh, L1(Pn[0]));
      if(ew.tk && hh > PX * 14){ tickerAt(x0 + ww * .06, yt + hh - Math.min(hh * .2, ww * .3), ww * .88, Math.min(hh * .2, ww * .3), now); }
      const m = ew.word.length, hz = ew.tk ? hh * .78 : hh, cell = Math.min(hz / m, ww * .8);
      if(ON) for(let c = 0; c < m; c++){ const g = gpick(Pn[2], ew.word[c], cell - PX), yc = yt + (c + .5) * hz / m; if(g) gblit(g, x0 + ww / 2, yc); else if(cell > PX * 2.5){ cx.fillStyle = L1(Pn[1]); pxRect(x0 + ww * .3, yc - cell * .14, ww * .4, Math.max(PX, cell * .28)); } } } }
  // the LED ticker: a window onto the dot strip, scaled by a whole number of canvas px per dot pixel, scrolling
  function tickerAt(x, y, w, h, now){ R(x, y, w, h, F('#0c0604')); if(!ON || !TK || !TKW) return; const k = Math.max(1, Math.floor(h / PX / 16)), dh = 16 * k * PX, sw = Math.floor(w / PX / k); if(sw < 8 || dh > h + PX) return;
    const off = reduce ? 0 : Math.floor(now / 1000 * 24) % TKW, a0 = cx.globalAlpha, yy = snp(y + (h - dh) / 2), xx = snp(x + (w - sw * k * PX) / 2); cx.globalAlpha = a0 * (1 - FF * .5);
    const s1 = Math.min(sw, TKW - off); cx.drawImage(TK, off, 0, s1, 16, xx, yy, s1 * k * PX, dh); if(s1 < sw) cx.drawImage(TK, 0, 0, sw - s1, 16, xx + s1 * k * PX, yy, (sw - s1) * k * PX, dh); cx.globalAlpha = a0; }

  // ---------------------------------------------------------------- the cross streets: the facades across them, the signals
  // across a cross street, the buildings on its far side face you from the next corner out to the edge of the view (no gap to the sky)
  function drawXF(sp, x, y, uw, fog, now){ const side = sp.side, z = sp.k + .02; if(!CF(z)) return; FF = fog; ON = onAt(sp.k); const X0 = Math.abs(sp.x), lx = laneDX(sp.k);
    let X = X0; for(let q = 0; q < 7 && X < 16; q++){ const w = 1.3 + H1(sp.k * .3 + q * 2.7 + side) * 1.6, h = 1.8 + H1(sp.k * .7 + q * 3.1 + side) * 2.6, X1 = X + w, c = ['#2a2436', '#3a2e34', '#262c3a', '#342a2a'][q & 3];
      const xa = CFX + (side * X + lx) * CFU, xb = CFX + (side * X1 + lx) * CFU; if(Math.min(xa, xb) > W + PX || Math.max(xa, xb) < -PX){ X = X1; continue; }
      CR(side * X + lx, side * X1 + lx, 0, h, F(c)); CR(side * X + lx, side * X1 + lx, 0, .5, F(ON ? '#d8d0b8' : '#0e0c14')); CR(side * X + lx, side * X1 + lx, .5, .58, L1(PAN[(q * 3 + (sp.k & 7)) % PAN.length][0]));
      if(CFU * FH >= 3) for(let f = 0; G + f * FH + .5 < h; f++){ const v = H1(sp.k * .71 + q * 7.13 + f * 13.37), st = ON ? (v < .3 ? 1 : v < .5 ? 2 : v < .6 ? 3 : 0) : 0; if(st) CR(side * (X + .12) + lx, side * (X1 - .12) + lx, G + f * FH + .18, G + f * FH + .44, F(st === 1 ? '#c0cce4' : st === 2 ? '#e8c084' : '#3e3e52')); }
      if(H1(q * 1.9 + sp.k) < .5){ const Pn = PAN[(q + sp.k) % PAN.length], bx = side * (X + w * .5) + lx; CR(bx - .14, bx + .14, .9, Math.min(h - .1, 2.6), L1(Pn[0])); }   // a blade down the corner
      X = X1; } }
  // the signals at a crossing: a pole on the kerb, an arm over the road, the horizontal three-lamp head (green: the street is yours), the
  // pedestrians' box (red: they wait), on backup power through the blackout
  function drawSig(sp, x, y, uw, fog, now){ if(!CF(sp.k + .5)) return; FF = fog; const side = Math.sign(sp.x), X = sp.x, u = CFU; if(u < .3) return;
    const pw = Math.max(PX, snp(u * .03)), px0 = CFX + X * u; R(px0 - pw / 2, CFY - u * 1.12, pw, u * 1.12, F('#3a3a46')); R(px0 - pw / 2 + (side > 0 ? 0 : pw - PX), CFY - u * 1.12, PX, u * 1.12, F('#6a6a7a'));
    const ax = CFX + (X - side * .62) * u; R(Math.min(px0, ax), CFY - u * 1.08, Math.abs(px0 - ax), Math.max(PX, u * .02), F('#3a3a46'));
    const hx0 = ax - u * .16, hy = CFY - u * 1.14, hw = u * .32, hh = u * .1; R(hx0, hy, hw, hh, F('#1a1c22')); if(hh >= PX * 3) R(hx0, hy - PX, hw, PX, F('#2c2e38'));
    const lc = ['#3affb0', '#3a3420', '#3a1414'], rr = Math.max(PX, snp(hh * .36)); for(let q = 0; q < 3; q++){ const lx = hx0 + hw * (.18 + q * .32), ly = hy + hh / 2; R(lx - rr, ly - rr, rr * 2, rr * 2, F(lc[q])); if(q === 0 && fog < .6 && u > 3) glow(lx, ly, Math.min(H * .05, Math.max(PX * 2, u * .14)), '#3affb0', .4 * (1 - fog)); }
    if(u > 6){ const bx = px0 + side * pw, by = CFY - u * .78, bw = u * .07, bh = u * .16; R(Math.min(bx, bx + side * bw), by, bw, bh, F('#1a1c22')); R(Math.min(bx, bx + side * bw) + bw * .2, by + bh * .1, bw * .6, bh * .38, F('#ff3a2a')); R(Math.min(bx, bx + side * bw) + bw * .2, by + bh * .55, bw * .6, bh * .36, F('#10241e')); } }

  // ---------------------------------------------------------------- street furniture: lamps, poles and the wires, people, trucks
  function drawLamp(sp, x, y, uw, fog, now){ if(uw < .4) return; FF = fog; ON = onAt(sp.k); const side = Math.sign(sp.x), pw = Math.max(PX, snp(uw * .025)), top = y - uw * 1.62, ax = x - side * uw * .3;
    R(x - pw / 2, top, pw, y - top, F('#4a4c58')); if(pw > PX) R(side > 0 ? x - pw / 2 : x + pw / 2 - PX, top, PX, y - top, F('#7a7c8a'));
    R(Math.min(x, ax), top - PX, Math.abs(x - ax), Math.max(PX, snp(uw * .02)), F('#4a4c58'));
    const lw = Math.max(PX * 2, snp(uw * .1)), lh = Math.max(PX, snp(uw * .03)); R(ax - lw / 2, top - lh / 2, lw, lh, F('#2a2c36')); R(ax - lw / 2 + PX, top + lh / 2, lw - PX * 2, Math.max(PX, lh / 2), ON ? fc(LAMPC, fog * .3) : F('#1c1e28'));
    if(ON && fog < .85) glow(ax, top + lh, Math.min(H * .08, Math.max(PX * 2, uw * .3)), LAMPC, .32 * (1 - fog)); }
  // a concrete utility pole: banded as a cylinder, two crossarms with insulators, sometimes a transformer drum
  function drawPole(sp, x, y, uw, fog, now){ if(uw < .3) return; FF = fog; const side = Math.sign(sp.x), w = Math.max(PX, snp(uw * .05)), top = y - uw * 2.05; if(x + w < -PX * 4 || x - w > W + PX * 4) return;
    R(x - w / 2, top, w, y - top, F('#5a5660')); if(w >= PX * 3){ R(side > 0 ? x - w / 2 : x + w / 2 - snp(w * .35), top, snp(w * .35), y - top, F('#2e2c36')); R(side > 0 ? x + w / 2 - PX : x - w / 2, top, PX, y - top, F('#8a8690')); }
    for(const [h, l] of [[1.74, .34], [1.58, .26]]){ R(x - uw * l, y - uw * h, uw * l * 2, Math.max(PX, snp(uw * .022)), F('#3a3640')); if(uw > 8) for(const q of [-1, -.5, .5, 1]) R(x + q * uw * l * .9 - PX, y - uw * h - PX * 2, PX * 2, PX * 2, F('#b8b4c0')); }
    if(sp.tr){ const tw = uw * .16, th = uw * .26, tx = x - side * uw * .13; R(tx - tw / 2, y - uw * 1.42, tw, th, F('#4e4c58')); if(tw > PX * 4){ R(tx - tw / 2, y - uw * 1.42, Math.max(PX, tw * .25), th, F('#2a2832')); R(tx - tw / 2, y - uw * 1.42 + th * .3, tw, PX, F('#2a2832')); } } }
  /* The wires: each pole span carries four lines on each side (and one fat cable), each sagging between the poles; each segment draws its
     own short piece, so they never pop, and nearer buildings or signs cover them exactly where they should. A cross cable spans the road
     at every other pole. Lines are stepped runs on the pixel grid, clipped to the screen first. */
  const WIRE = [[1.28, 1.48, .22, '#0e0c12', 2], [1.25, 1.7, .14, '#14121a', 1], [1.34, 1.57, .12, '#141218', 1], [1.3, 1.63, .18, '#18161e', 1]];   // (the fat cable first: it stays when the far LOD drops the rest)
  function pline(x1, y1, x2, y2, col, th){ if(!fin(x1 + y1 + x2 + y2)) return; // Liang-Barsky to the screen, then runs of the same row or column
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1, p = [-dx, dx, -dy, dy], q = [x1 + PX, W + PX - x1, y1 + PX, H + PX - y1];
    for(let i = 0; i < 4; i++){ if(p[i] === 0){ if(q[i] < 0) return; continue; } const r = q[i] / p[i]; if(p[i] < 0){ if(r > t1) return; if(r > t0) t0 = r; } else { if(r < t0) return; if(r < t1) t1 = r; } }
    const ax = x1 + dx * t0, ay = y1 + dy * t0, bx = x1 + dx * t1, by = y1 + dy * t1; cx.fillStyle = col; const T = th * PX;
    if(Math.abs(bx - ax) >= Math.abs(by - ay)){ const n = Math.max(1, Math.round(Math.abs(bx - ax) / PX)), sx = (bx - ax) / n, sy = (by - ay) / n; let rx = snp(ax), ry = snp(ay), rl = 0;
      for(let k = 0; k <= n; k++){ const yy = snp(ay + sy * k), xx = snp(ax + sx * k); if(yy !== ry || k === n){ const a = Math.min(rx, xx), b = Math.max(rx, xx); cx.fillRect(a, ry, Math.max(PX, b - a + (k === n ? PX : 0)), T); rx = xx; ry = yy; } } }
    else { const n = Math.max(1, Math.round(Math.abs(by - ay) / PX)), sx = (bx - ax) / n, sy = (by - ay) / n; let rx = snp(ax), ry = snp(ay);
      for(let k = 0; k <= n; k++){ const xx = snp(ax + sx * k), yy = snp(ay + sy * k); if(xx !== rx || k === n){ const a = Math.min(ry, yy), b = Math.max(ry, yy); cx.fillRect(rx, a, T, Math.max(PX, b - a + (k === n ? PX : 0))); rx = xx; ry = yy; } } } }
  const PSPAN = 28;
  function drawWire(sp, x, y, uw, fog, now){ if(fog > .5 || AKX.includes('wire')) return; const s = segs[sp.k]; if(!s) return; const a = s.p1.screen; if(!a.w) return; const side = sp.side, lx = sp.x - side * 1.3;
    const ph = ((sp.k - 14) % PSPAN + PSPAN) % PSPAN, st = a.w > 60 ? 1 : a.w > 18 ? 2 : a.w > 7 ? 4 : 7; if(ph % st) return; const e = segs[sp.k + st - 1]; if(!e || !e.p2.screen.w) return; const b = e.p2.screen;   // far away one piece spans 2 or 4 segments (a pole span of 28 is a multiple of each)
    if(Math.abs(a.y - b.y) < .5 && Math.abs(a.x - b.x) < PX) return; const t0 = ph / PSPAN, t1 = (ph + st) / PSPAN, a0 = cx.globalAlpha, nw = a.w > 50 ? 4 : a.w > 20 ? 3 : 2; cx.globalAlpha = a0 * (1 - fog * .8);
    CAT = a.w > 50 ? 'wn' : a.w > 20 ? 'wm' : 'wf'; for(let q = 0; q < nw; q++){ const w = WIRE[q], X = side * w[0] + lx, h0 = w[1] - w[2] * 4 * t0 * (1 - t0), h1 = w[1] - w[2] * 4 * t1 * (1 - t1);
      pline(a.x + X * a.w, a.y - h0 * a.w, b.x + X * b.w, b.y - h1 * b.w, w[3], w[4] > 1 && a.w > 40 ? 2 : 1); }
    CAT = 'wx'; if(sp.x0 && ph === 0 && ((sp.k - 14) / PSPAN) % 4 === 0){ // the cross cable at this pole, sagging over the road; and the service drops into the buildings beside it
      cx.fillStyle = '#121018'; let px0 = 0, py0 = 0; for(let k = 0; k <= 12; k++){ const t = k / 12, X = -1.3 + 2.6 * t, h = 1.66 - .2 * 4 * t * (1 - t), xx = a.x + X * a.w, yy = a.y - h * a.w; if(k) pline(px0, py0, xx, yy, '#121018', 1); px0 = xx; py0 = yy; } }
    // service drops into the buildings (not from a pole beside the camera: there a drop is a line across the whole screen)
    CAT = 'wd'; if(ph === 0 && a.w > 10 && a.w < 48) for(const d of (a.w > 24 ? [2, 5] : [3])){ const t = segs[sp.k + d]; if(!t || !t.p2.screen.w) continue; const q2 = t.p2.screen; pline(a.x + (side * 1.3 + lx) * a.w, a.y - 1.52 * a.w, q2.x + (side * 2.3 + lx) * q2.w, q2.y - (1.1 + d * .04) * q2.w, '#141218', 1); }
    cx.globalAlpha = a0; }
  // people: camera-facing, a few variants and a two-frame step; at the kerbs of the crossings they stand and wait
  const PEOPLE = []; const PCOL = [['#1c2236', '#2a3450'], ['#1a1a1e', '#2a2a30'], ['#4a3a2a', '#6a5236'], ['#6a2a3a', '#8a3a4a'], ['#2a4a3a', '#3a6a4a'], ['#5a5a66', '#7a7a88']];
  /* the downpour: everyone under an umbrella (Liam Wong's Kabukicho shot, IQRemix's crossing): mostly clear vinyl, a pale dome lit from
     above with darker ribs and a bright rim, some navy, one pink; the shaft beside the head to the hand. The sprite grows to 15 x 30, the
     person drawn 3 right and 6 down, so they stand where they stood. */
  const UMB = [['#c4cce4', '#e8eeff', '#8e98bc'], ['#c4cce4', '#e8eeff', '#8e98bc'], ['#2a3462', '#4a5a96', '#161c3a'], ['#c4cce4', '#e8eeff', '#8e98bc'], ['#d86a96', '#f4a0c0', '#8a3a5a'], ['#c4cce4', '#e8eeff', '#8e98bc']];
  function buildPeople(){ PEOPLE.length = 0; for(let v = 0; v < PCOL.length; v++) for(let fr = 0; fr < 2; fr++){ const c = document.createElement('canvas'); c.width = RAINON ? 15 : 9; c.height = RAINON ? 30 : 24; const k = c.getContext('2d'), [d, m] = PCOL[v], set = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); };
      if(RAINON){ const [u0, u1, u2] = UMB[v]; set(10, 3, 1, 15, '#3a3440'); set(5, 0, 5, 1, u1); set(3, 1, 9, 1, u0); set(4, 1, 3, 1, u1); set(2, 2, 11, 1, u0); set(1, 3, 13, 1, u0); set(0, 4, 15, 1, u1);   // the canopy: lit crown, body, the rim catching light
        for(const x of [0, 4, 7, 10, 14]) set(x, 5, 1, 1, u2); set(7, 1, 1, 3, u2); set(3, 3, 1, 1, u2); set(11, 3, 1, 1, u2); k.translate(3, 6); }   // its ribs and scalloped edge; then the person below it
      set(3, 0, 3, 2, v === 3 ? '#3a1a10' : '#141018'); set(3, 2, 3, 3, '#d8a888'); set(5, 2, 1, 3, '#b0806a'); set(3, 4, 3, 1, '#b0806a');   // hair, face (lit on one side)
      set(2, 5, 5, 9, d); set(2, 5, 1, 9, m); if(v === 0) set(4, 5, 1, 5, '#e8e8f0'); if(v === 0 || v === 5) set(4, 6, 1, 3, '#8a1a2a');   // the coat, its lit edge; a shirt and tie
      set(1, 6, 1, 7, d); set(7, 6, 1, 7, d); set(1, 12, 1, 1, '#d8a888'); set(7, 12, 1, 1, '#d8a888');
      if(v === 2 || v === 4){ set(7, 11, 2, 4, '#e8e0d0'); set(7, 11, 2, 1, '#ff3a3a'); }   // a shop bag
      const lg = fr ? [[3, 14, 1, 9], [5, 14, 1, 8]] : [[3, 14, 1, 8], [5, 14, 1, 9]]; for(const g of lg) set(g[0], g[1], g[2], g[3], '#16141c'); set(2, 23, 2, 1, '#0a0a0e'); set(5, 23, 2, 1, '#0a0a0e');
      PEOPLE.push(c); } }
  /* Round 7: what stood painted flat on the shop fronts now stands on the pavement: an A-frame board (two liveries), nobori flags on poles,
     a stack of boxes with a price card, the konbini's umbrella stand. Camera-facing sprites at the people's scale. */
  const PROPS = [];
  function buildProps(){ PROPS.length = 0; const mkp = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'); f((x, y, ww, hh, col) => { k.fillStyle = col; k.fillRect(x, y, ww, hh); }); PROPS.push(c); };
    mkp(8, 11, S => { S(0, 0, 8, 10, '#2a2230'); S(1, 1, 6, 6, '#e0202e'); S(2, 2, 4, 1, CREAM); S(2, 4, 3, 1, CREAM); S(1, 8, 6, 1, '#ffd23a'); S(0, 10, 1, 1, '#141018'); S(7, 10, 1, 1, '#141018'); });
    mkp(8, 11, S => { S(0, 0, 8, 10, '#3a3446'); S(1, 1, 6, 8, '#141a18'); for(let y = 2; y < 8; y += 2) S(2, y, 2 + (y & 3), 1, '#e8e4d8'); S(5, 7, 2, 1, '#ff8a3a'); S(0, 10, 1, 1, '#141018'); S(7, 10, 1, 1, '#141018'); });
    mkp(6, 24, S => { S(0, 0, 1, 24, '#7a7a90'); S(0, 0, 6, 1, '#7a7a90'); S(1, 1, 5, 15, '#e0202e'); S(2, 3, 3, 2, CREAM); S(2, 7, 3, 2, CREAM); S(2, 11, 3, 2, CREAM); S(1, 15, 5, 1, '#8a1020'); });
    mkp(6, 24, S => { S(0, 0, 1, 24, '#7a7a90'); S(0, 0, 6, 1, '#7a7a90'); S(1, 1, 5, 15, '#ffd23a'); S(2, 3, 3, 2, '#d0182a'); S(2, 7, 3, 2, '#d0182a'); S(2, 11, 3, 2, '#d0182a'); S(1, 15, 5, 1, '#a07010'); });
    mkp(10, 9, S => { S(0, 3, 10, 6, '#b08a5a'); S(0, 3, 10, 1, '#d8b888'); S(2, 0, 6, 3, '#c8a46a'); S(2, 0, 6, 1, '#e8d0a0'); S(6, 5, 3, 2, '#e0202e'); S(4, 3, 1, 6, '#8a6a40'); });
    mkp(7, 12, S => { S(0, 6, 7, 6, '#4a4e62'); S(0, 6, 7, 1, '#7a7e96'); for(const x of [1, 3, 5]){ S(x, 0, 1, 6, '#c8d4f0'); S(x, 0, 1, 1, '#eef2ff'); } }); }
  function drawProp(sp, x, y, uw, fog, now){ const c = PROPS[sp.v]; if(!c || fog > .5) return; const k = uw * .3 / 24; if(k * c.height < PX * 2) return; const al = scaleFade(k, 9, 16); if(al <= 0) return;
    const a0 = cx.globalAlpha; cx.globalAlpha = a0 * al * (1 - fog * .8); blit(c, x, y, k); cx.globalAlpha = a0; }
  function drawPed(sp, x, y, uw, fog, now){ const c = PEOPLE[(sp.v * 2 + (sp.w && !reduce ? Math.floor(now / 380 + sp.k) & 1 : 0)) % PEOPLE.length]; if(!c) return; const k = uw * .3 / 24; if(k * 24 < PX * 2) return; const al = scaleFade(k, 6, 10); if(al <= 0) return;
    const a0 = cx.globalAlpha; cx.globalAlpha = a0 * al * (1 - fog * .7); blit(c, x, y, k); cx.globalAlpha = a0; }
  /* A delivery truck parked at the kerb (a light truck with an aluminium box, its hazards blinking): projected boxes, drawn from the
     nearest segment of its length still in front of the camera, clipped at the near plane, so it never pops or blocks. */
  function drawTruck(sp, x, y, uw, fog, now){ const k = sp.k; if(k > sp.a){ const p = segs[k - 1]; if(p && p.p1.camera.z > DEPTH) return; } cam(); FF = fog; const side = sp.side, z0 = sp.a, z1 = sp.a + 9, xi = side * 1.16, xo = side * 1.5, lx = laneDX(sp.a); if(lx) return;
    const hb = .1, ht = .56, zc = z1 - 2.4;
    // the box: the inner side (toward the road), the roof, the rear doors with their ribs, tail lamps and the blinking hazards
    const on = onAt(sp.a), S0 = on ? '#7a7c8a' : '#2e2e38', S1 = on ? '#a8aab6' : '#3a3a46';   // (in the blackout the box loses the street's light)
    wq(z0, xi, hb, zc, xi, hb, zc, xi, ht, z0, xi, ht, F(S0)); wq(z0, xi, ht, zc, xi, ht, zc, xo, ht, z0, xo, ht, F(S1));
    wq(z0, xi, .3, zc, xi, .3, zc, xi, .36, z0, xi, .36, F(on ? '#2a4a9a' : '#161a2a')); wq(z0, xi, hb, zc, xi, hb, zc, xi, hb + .04, z0, xi, hb + .04, F('#3a3a46'));   // a painted stripe; the box's lower rail
    if(uw > 30) for(let r = z0 + 1.1; r < zc - .3; r += 1.1) wq(r, xi, hb + .04, r + .08, xi, hb + .04, r + .08, xi, ht - .02, r, xi, ht - .02, F(on ? '#666876' : '#26262e'));   // the panel ribs
    if(z0 > camSeg() + ZNEAR && plane(z0)){ PR(xi, xo, hb, ht, F(on ? '#9496a6' : '#34343e')); if(OU * .05 > PX * 1.5) for(let q = 1; q < 6; q++) PR(xi, xo, hb + q * .08, hb + q * .08 + .008, F(on ? '#6a6c7c' : '#26262e'));
      if(OU * .34 > PX * 10){ const xm = (xi + xo) / 2; PR(xm - .006, xm + .006, hb, ht, F('#3a3a46')); for(const X of [xm - side * .07, xm + side * .07]) PR(X - .007, X + .007, hb + .02, ht - .02, F(on ? '#c8cad4' : '#3a3a44')); PR(xi, xo, ht - .015, ht, F(on ? '#d0d2dc' : '#3e3e48')); } PR(xi, xo, hb - .05, hb, F('#1a1a22'));   // the door seam, the locking bars, the lit top edge; the bumper
      const blink = reduce || Math.floor(now / 420) & 1; for(const X of [xi + side * .04, xo - side * .1]){ PR(X, X + side * .06, .14, .2, F('#c8141e')); PR(X, X + side * .06, .21, .25, blink ? fc('#ffb02a', fog * .4) : F('#4a2a10')); if(blink && fog < .6 && OU > 4) glow(OX + (X + side * .03) * OU, OY - .23 * OU, Math.max(PX * 2, OU * .06), '#ffb02a', .35); }
      PR((xi + xo) / 2 - .06, (xi + xo) / 2 + .06, .13, .17, F('#e8e8d8')); }
    // the cab: lower, set in, its glass dark with a lit edge; the wheels under the side
    const xc = side * 1.2; wq(zc, xc, hb, z1, xc, hb, z1, xc, .42, zc, xc, .42, F('#d8dae2')); wq(zc + .3, xc, .3, z1 - .4, xc, .3, z1 - .4, xc, .4, zc + .3, xc, .4, F('#2a3448'));
    for(const zz of [z0 + 1.2, zc + .6]) wq(zz, xi - side * .01, 0, zz + .9, xi - side * .01, 0, zz + .9, xi - side * .01, .12, zz, xi - side * .01, .12, F('#101014')); }

  // ---------------------------------------------------------------- the Sōbu line bridge and its train
  /* The bridge stands across the street at BR: a riveted plate girder in the line's dark teal-green, the yellow and black clearance band and
     the 3.8M plate over the road, lamps under it; piers at the kerbs and the building line; beyond the kerbs the viaduct comes down to the
     ground with shops in its arches. On the deck a mesh railing, catenary masts and, now and then, the yellow commuter train crossing. It
     is drawn whole from the nearest segment of its depth still in front of the camera; the soffit is clipped at the near plane, so riding
     under it never pops. The near face is a camera-facing plane, so it is filled as rects. */
  const HB = .74, HT = 1.26, GIR = ['#0a1c1e', '#143436', '#235250', '#3a7470'], TRAIN = ['#7a4a10', '#c88a14', '#f0c030', '#fff0a0'];
  function trainX(L, now){ if(SPA.on && SPA.L === L && !SPA.rel2) return -14 + (position / SEG - L.S0 - 300) * .05;   // the blackout's train: across the street while it is dark
    const per = 26, t = ((now / 1000 + L.BR * .37) % per + per) % per; if(t > 15) return null; const dir = (Math.floor((now / 1000 + L.BR * .37) / per) & 1) ? 1 : -1; return dir * (-36 + t * 4.8); }
  function drawBridge(sp, x, y, uw, fog, now){ const L = sp.L, k = sp.k; if(k > L.BR){ const p = segs[k - 1]; if(p && p.p1.camera.z > DEPTH) return; } cam(); FF = fog; const BR = L.BR, zt = BR + BD * .5, bon = onAt(BR); ON = bon;
    // the soffit, seen from below as you come under it: dark, cross beams, two rows of tubes
    if(!AKX.includes('sof')) wq(BR, -16, HB, BR + BD, -16, HB, BR + BD, 16, HB, BR, 16, HB, F('#0c1418'));
    for(const zz of [BR + 1.5, BR + 3, BR + 4.5]) wq(zz, -16, HB, zz + .35, -16, HB, zz + .35, 16, HB, zz, 16, HB, F('#16282a'));
    if(bon) for(const X of [-.55, .55]) for(const zz of [BR + .8, BR + 2.4, BR + 3.9]) wq(zz, X - .2, HB - .005, zz + .25, X - .2, HB - .005, zz + .25, X + .2, HB - .005, zz, X + .2, HB - .005, fc('#e8f4ff', fog * .3));
    // the train on the deck (behind the girder's face), then the catenary
    if(plane(BR + 5.2)){ for(let X = -15; X <= 15; X += 5){ PR(X - .025, X + .025, HT, HT + 1.18, F('#2a3a3c')); PR(X - .3, X + .3, HT + 1.06, HT + 1.09, F('#2a3a3c')); } }   // the catenary masts beyond the track
    if(plane(BR + 1.3)){ PR(-16, 16, HT, HT + .08, F('#16141a')); PR(-16, 16, HT + .065, HT + .08, F('#4a4038')); }   // the ballast deck, its rail catching the light
    const tx = trainX(L, now); if(tx !== null) train(tx, now, fog, L);
    if(plane(zt)) PR(-16, 16, HT + 1.0, HT + 1.005, F('#0e1416'));   // the contact wire
    if(!plane(BR)) return; const u = OU;
    // beyond the kerbs: the viaduct down to the ground, shops in its arches (warm stalls under the tracks)
    if(!AKX.includes('via')) for(const s of [-1, 1]) for(let q = 0; q < 6; q++){ const Xa = s * (2.45 + q * 2.3), Xb = s * (2.45 + q * 2.3 + 2.3); PR(Math.min(Xa, Xb), Math.max(Xa, Xb), 0, HB, F(GIR[1])); const ia = Math.min(Xa, Xb) + .25, ib = Math.max(Xa, Xb) - .25;
      PR(ia, ib, 0, HB - .16, F(bon ? '#c89a5a' : '#120e12')); if(u * .1 > PX * 2){ PR(ia, ib, HB - .16, HB - .12, F(GIR[0])); PR(ia + .1, ib - .1, .05, .4, F(bon ? '#6a4a30' : '#0e0c10')); PR(ia + .2, ia + .7, .42, .55, L1(PAN[(q + 2) % PAN.length][0])); } }
    // piers at the kerbs and the building line
    for(const X of [-2.28, -1.22, 1.22, 2.28]){ PR(X - .07, X + .07, 0, HB, F(GIR[1])); PR(X + (X > 0 ? -.07 : .05), X + (X > 0 ? -.05 : .07), 0, HB, F(GIR[3])); }
    // the girder: web, flanges, stiffeners with a lit edge, rivet rows near by
    PR(-16, 16, HB, HT, F(GIR[1])); PR(-16, 16, HT - .05, HT, F(GIR[2])); PR(-16, 16, HB, HB + .04, F(GIR[2])); PR(-16, 16, HB + .04, HB + .06, F(GIR[0]));
    const x0 = OX, sx = Math.max(-16, Math.floor((-x0 / u) / .45) * .45 - .45), ex = Math.min(16, (W - x0) / u + .45);
    if(u * .45 > PX * 3) for(let X = sx; X <= ex; X += .45){ PR(X - .02, X + .02, HB + .06, HT - .05, F(GIR[0])); PR(X + .02, X + .035, HB + .06, HT - .05, F(GIR[2]));
      if(u * .45 > PX * 16){ cx.fillStyle = F(GIR[3]); for(const h of [HB + .08, HT - .08]) for(let r = 1; r < 5; r++){ const xx = OX + (X + r * .09) * u; if(xx > -PX && xx < W + PX) pxRect(xx, OY - h * u, PX, PX); } } }
    // the clearance band over the road: yellow and black blocks, the 3.8M plate, the centre board, lamps under the girder's lip
    for(let q = 0; q < 16; q++){ const X = -1.2 + q * .15; PR(X, X + .15, HB, HB + .07, F((q & 1) ? '#141210' : '#f0c020')); }
    { const px0 = -1.05, px1 = -.68; PR(px0, px1, HB + .12, HB + .25, F('#f4f4ec')); PR(px0, px1, HB + .12, HB + .13, F('#1a3a9a')); if(u * .13 > PX * 8){ const kk = Math.max(1, Math.floor(u * .08 / 5 / PX)) * PX, s3 = '3.8M', w3 = (s3.length * 4 - 1) * kk; cx.fillStyle = F('#1a3a9a'); f3(s3, OX + (px0 + px1) / 2 * u - w3 / 2, OY - (HB + .24) * u + (u * .11 - kk * 5) / 2, kk); } }   // the clearance plate
    { const bw = .52, Pn = PAN[0], b0 = HB + .1, b1 = HT - .08; PR(-bw - .03, bw + .03, b0 - .03, b1 + .03, F('#0a1012')); PR(-bw, bw, b0, b1, L1(Pn[0])); if(u * .05 > PX * 2) PR(-bw, bw, b1 - .02, b1, L1('#ffffff'));   // the lit board: 電気街 in red
      const cell = Math.min((b1 - b0) * u * .86, bw * 2 * u / 3), hc = OY - (b0 + b1) / 2 * u;
      if(bon) for(let c = 0; c < 3; c++){ const g = gpick('R', GW[c], cell); if(g) gblit(g, OX + (c - 1) * bw * 2 / 3 * u, hc); else if(cell > PX * 2){ cx.fillStyle = F('#d0182a'); pxRect(OX + ((c - 1) * bw * 2 / 3 - .1) * u, hc - cell * .14, .2 * u, Math.max(PX, cell * .28)); } } }
    if(bon && fog < .7) for(const X of [-.8, .8]){ PR(X - .1, X + .1, HB - .03, HB, fc('#f4f8ff', fog * .3)); if(u > 4) glow(OX + X * u, OY - HB * u, Math.max(PX * 2, u * .25), '#dce8ff', .28 * (1 - fog)); }
    // the railing on the deck: a top rail, posts, the mesh as a dither
    PR(-16, 16, HT + .17, HT + .19, F(GIR[2])); PR(-16, 16, HT, HT + .045, F(GIR[0])); PR(-16, 16, HT + .04, HT + .045, F(GIR[2]));   // the top rail, and a low kick plate: the bogies show between them (round 2: the mesh hid them)
    if(u * .2 > PX * 4) for(let X = Math.ceil(sx / .9) * .9; X <= ex; X += .9) PR(X - .015, X + .015, HT, HT + .18, F(GIR[2])); }
  const F3G = { '0':'111101101101111', '1':'010110010010111', '2':'111001111100111', '3':'111001111001111', '4':'101101111001001', '5':'111100111001111', '6':'111100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001111', '.':'000000000000010', 'M':'101111111101101' };
  function f3(s, x, y, k){ for(let c = 0; c < s.length; c++){ const g = F3G[s[c]]; if(!g) continue; for(let p = 0; p < 15; p++) if(g[p] === '1') cx.fillRect(snp(x + (c * 4 + p % 3) * k), snp(y + ((p / 3) | 0) * k), k, k); } }
  // the train: eight canary-yellow cars (the era's commuter colour), a lit window band with pillars, doors, the roof and pantographs
  /* The train (round 2: a body, not a plane). Each car is a box on the deck, its near side at zn and far side at zf: the end faces that turn
     toward the camera are world quads (drawn first, so the next car's side covers them where it should), then the near sides as
     camera-facing planes. Under each body the two bogies (frame, wheels with a lit rim, the axle boxes) and the underfloor boxes stand on
     the girder's top, seen through the deck's mesh railing; above the body the roof shoulder, the cooling units and the pantographs. */
  function train(tx, now, fog, L){ const CL = 3.45, zn = L.BR + 1.3, zf = L.BR + 4.7, h0 = HT + .22, h1 = HT + .81, hd = HT + .08, a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - fog * .5); cam();
    const xv = playerX;   // which ends face the camera
    for(let c = 0; c < 8; c++){ const xa = tx + c * (CL + .08), xb = xa + CL, xe = xa > xv ? xa : xb < xv ? xb : null; if(xe === null) continue;
      wq(zn, xe, h0, zf, xe, h0, zf, xe, h1, zn, xe, h1, F(TRAIN[0])); wq(zn, xe, h0 + .3, zn + 1.4, xe, h0 + .3, zn + 1.4, xe, h0 + .48, zn, xe, h0 + .48, fc('#e8d8b0', fog * .3));   // the end and its window
      wq(zn + 1.4, xe, h0 + .02, zf - 1.4, xe, h0 + .02, zf - 1.4, xe, h1 - .04, zn + 1.4, xe, h1 - .04, F('#1a1612')); }   // the gangway
    if(!plane(zn)){ cx.globalAlpha = a0; return; } const u = OU;
    for(let c = 0; c < 8; c++){ const xa = tx + c * (CL + .08), xb = xa + CL; if(OX + xb * u < -PX || OX + xa * u > W + PX) continue;
      // under the body: the bogies on the deck and the underfloor boxes
      for(const bx of [xa + .55, xb - .55]){ PR(bx - .32, bx + .32, hd + .05, hd + .12, F('#1c1a18')); if(u * .1 > PX * 2) for(const wx of [bx - .2, bx + .2]){ PR(wx - .07, wx + .07, hd, hd + .1, F('#0e0c0c')); PR(wx - .07, wx + .07, hd + .085, hd + .1, F('#6a6058')); PR(wx - .015, wx + .015, hd + .04, hd + .06, F('#8a8278')); } }
      PR(xa + 1, xb - 1, hd + .07, h0, F('#24221e')); if(u * .5 > PX * 6) for(let q = 0; q < 3; q++){ const ex = xa + 1.15 + q * .42; PR(ex, ex + .3, hd + .08, h0 - .01, F(q & 1 ? '#34302a' : '#2a2620')); }
      // the body: canary sides, the dark skirt, the lit window band with pillars, doors, the lit roof edge and the roof shoulder above it
      PR(xa, xb, h0, h1, F(TRAIN[1])); PR(xa, xb, h0, h0 + .07, F(TRAIN[0])); PR(xa, xb, h1 - .05, h1, F(TRAIN[2])); PR(xa + .02, xb - .02, h1, h1 + .04, F('#6a6a72')); PR(xa + .08, xb - .08, h1 + .04, h1 + .06, F('#4a4a52'));
      PR(xa + .05, xb - .05, h0 + .26, h0 + .44, fc('#fff4d8', fog * .3));
      if(u * CL > PX * 14) for(let q = 0; q < 4; q++){ const dx = xa + .3 + q * (CL - .6) / 3; PR(dx - .14, dx + .14, h0 + .08, h1 - .07, F(TRAIN[0])); PR(dx - .11, dx + .11, h0 + .1, h1 - .09, F(TRAIN[1])); PR(dx - .1, dx - .005, h0 + .26, h0 + .44, fc('#f4e4c0', fog * .3)); PR(dx + .005, dx + .1, h0 + .26, h0 + .44, fc('#f4e4c0', fog * .3)); }
      if(u * CL > PX * 24) for(let q = 0; q < 7; q++){ const px = xa + .2 + q * .48; PR(px, px + .04, h0 + .26, h0 + .44, F(TRAIN[0])); if(H1(c * 9 + q) < .4) PR(px + .12, px + .24, h0 + .3, h0 + .44, F('#3a2e28')); }   // pillars; a standing passenger
      if(!(c & 1)) PR(xa + 1.2, xa + 2.1, h1 + .06, h1 + .14, F('#5a5a64'));   // a cooling unit on the roof
      if(c & 1){ const pm = xa + CL / 2; PR(pm - .3, pm + .3, h1 + .06, h1 + .09, F('#2a2a30')); if(u > 2){ pline(OX + (pm - .3) * u, OY - (h1 + .09) * u, OX + pm * u, OY - (HT + 1.0) * u, F('#2a2a30'), 1); pline(OX + pm * u, OY - (HT + 1.0) * u, OX + (pm + .3) * u, OY - (h1 + .09) * u, F('#2a2a30'), 1); } } }
    cx.globalAlpha = a0; }

  // ---------------------------------------------------------------- placement
  let DIRREG = false; const DIR = () => (window.MECH && MECH.director) || null;
  const CARD = { kanji:'停電', name:'BLACKOUT', sub:'then every sign at once', col:'#ffd23a' };
  function regDir(){ if(DIRREG) return; const D = DIR(); if(!D) return; DIRREG = true; try{ D.register('teiden', { tier:'hero', roads:[KEY], card:CARD }); }catch(e){} }
  function place(i, s){ regDir(); const L = visitOf(i); s.akLit = 0; if(!L) return; const sp = s.sprites, c = crossAt(L, i), inBr = L.BR >= 0 && i >= L.BR - 3 && i < L.BR + BD + 3;
    if(inBr || (c >= 0 && i >= c - 4 && i < c + CW + 4)) s.zeb = true;
    if(c >= 0 || (L.BR >= 0 && i >= L.BR - 8 && i < L.BR + BD + 8)) s.akNoHz = true;   // (no side lane at a crossing or under the bridge: the core calls a lane off where a segment carries zeb)
    if(c >= 0 && i === c + CW + 3 && !(L.X.indexOf(c) & 1)){ sp.push({ env:KEY, type:'gnt', x:0, k:i }); s.akG = 1; }   // round 5: the hero screen (round 6: the cranes) on a gantry over the road, straight ahead
    if(c >= 0){ s.akX = i - c; if(i === c + CW) for(const side of [-1, 1]){ const B = bAt(L, side, i) || bAt(L, side, i + 1); sp.push({ env:KEY, type:'xf', x:side * ((B ? B.x0 + B.depth : 3.8)), side, k:i }); } }
    if(L.BR >= 0 && i >= L.BR && i <= L.BR + BD) sp.push({ env:KEY, type:'br', x:0, k:i, L });
    for(const side of [-1, 1]){ const B = bAt(L, side, i); if(B) sp.push({ env:KEY, type:'b', x:side * B.x0, k:i, b:B }); }
    if(!inBr){ for(const side of [-1, 1]){ if(i % PSPAN === 14) sp.push({ env:KEY, type:'pole', x:side * 1.3, k:i, tr:H1(i * .7 + side) < .4 }); sp.push({ env:KEY, type:'w', x:side * 1.3, side, k:i, x0:side < 0 && ((i - 14) / PSPAN) % 2 === 0 }); } }
    if(i % 14 === 0 && !inBr) for(const side of [-1, 1]) sp.push({ env:KEY, type:'lamp', x:side * 1.16, k:i });
    if(c < 0 && !inBr) for(const side of [-1, 1]){ const B = bAt(L, side, i); if(!B || B.sv === SH_SHUT || B.gr === 'crane' || (i - B.b0) % 7 !== 3 || i + 2 >= B.b0 + B.len || H1(i * .91 + side * 2.3) > .6) continue;   // the shops' pavement things (never at a crossing)
      const v = B.sv === SH_KONB ? 5 : B.sv === SH_STALL ? 4 : Math.floor(H1(i * 1.9 + side) * 5); sp.push({ env:KEY, type:'pv', x:side * (B.x0 - .16), k:i, v }); }
    if(c >= 0 && (i === c - 3 || i === c + CW + 1)) for(const side of [-1, 1]){ if(i === c - 3) sp.push({ env:KEY, type:'sig', x:side * 1.14, k:i });
      for(let q = 0; q < 4; q++) sp.push({ env:KEY, type:'ped', x:side * (1.24 + q * .12 + H1(i + q) * .05), k:i, v:Math.floor(H1(i * 3 + q + side) * PCOL.length), w:false }); }
    else if(!inBr && H1(i * 1.71 + .3) < .085){ const side = H1(i * 2.3) < .5 ? -1 : 1; sp.push({ env:KEY, type:'ped', x:side * (1.34 + H1(i * 5.1) * .7), k:i, v:Math.floor(H1(i * 7.7) * PCOL.length), w:true }); }
    // delivery trucks at the kerb, now and then, never at a crossing or the bridge
    { const tq = Math.floor(i / 70), ts = tq * 70 + 20; if(i >= ts && i < ts + 10 && H1(tq * 3.7 + L.B0) < .5){ const side = H1(tq * 5.3) < .5 ? -1 : 1; let ok = crossAt(L, ts) < 0 && crossAt(L, ts + 9) < 0 && !(L.BR >= 0 && ts + 12 > L.BR - 6 && ts < L.BR + BD + 6);
        if(ok) sp.push({ env:KEY, type:'trk', x:side * 1.33, k:i, a:ts, side }); } }
    const d = Math.min(i % 14, 14 - i % 14); s.akLit = s.lit0 = .1 + .5 * Math.max(0, 1 - d / 3) + (c >= 0 ? .15 : 0);
    // the set piece is decided once per visit, as its stretch begins to be laid (the street must not have been lit-and-booked late)
    if(L.BR >= 0 && !L.req && i >= L.S0 - 200){ L.req = true; const D = DIR(); if(AKSP !== null){ L.sp = AKSP === '1'; return; } try{ L.sp = !!(D && D.request && D.request('teiden', { tier:'hero', seg:L.BR, road:KEY })); }catch(e){ L.sp = false; } } }
  function lit(i, s){ return s.akLit || 0; }

  // ---------------------------------------------------------------- the road: pavements with the shops' light, crossings
  function roadFX(s, a, b, fog, f, now){ if(s.akNoHz && s.hz && (s.hz.type === 'oil' || s.hz.type === 'pad')) s.hz = null;   // no slick or pad on a crossing or under the bridge (they would read as a stray shape at the scramble)
    if(a.y - b.y < .5 || fog > .75) return; const L = s.akV; if(L === undefined){ s.akV = visitOf(s.index) || null; }
    const V = s.akV; if(!V) return; const i = s.index, a0 = cx.globalAlpha;
    for(const side of [-1, 1]){ const B = bAt(V, side, i), x0 = B ? B.x0 : 2.3, on = B ? onAt(B.b0) : 1, X1 = side * 1.0, X2 = side * 1.1, X3 = side * x0;
      poly4(a.x + a.w * X1, a.y, a.x + a.w * X2, a.y, b.x + b.w * X2, b.y, b.x + b.w * X1, b.y, f((i & 3) ? '#5a5866' : '#6e6c78'));   // the kerb stones
      const pc = B && on ? (B.gr === 'crane' ? '#3a2838' : B.gr === 'stall' ? '#34302e' : '#2e2e3a') : '#201e26';
      poly4(a.x + a.w * X2, a.y, a.x + a.w * X3, a.y, b.x + b.w * X3, b.y, b.x + b.w * X2, b.y, f((i % 4) === 0 ? '#1a1820' : pc));   // the pavement tiles (a joint every 4), lit by the shop it fronts
      if(B && on && fog < .45){ const wc = B.wc || (B.wc = wetCols(B, pc));
        // the soaked tiles mirror the shop: three stepped bands of its light, brightest at the sill, the joint rows left dark (the tile grid shows through)
        for(let q = 0; q < 3; q++){ if(q === 2 && (i & 3) === 0) continue; const Xa = side * (x0 - WB[q]), Xb = side * (x0 - WB[q + 1]); poly4(a.x + a.w * Xb, a.y, a.x + a.w * Xa, a.y, b.x + b.w * Xa, b.y, b.x + b.w * Xb, b.y, f(wc[q])); } }
      // a puddle on the pavement: a dark mirror, the shop's light in it, a lit far rim
      if(RAINON && fog < .4 && H1(i * 1.37 + side * .53) < .2){ const h = H1(i * 2.9 + side), Xa = side * (1.24 + h * .5), Xb = Xa + side * (.22 + .2 * H1(i * 4.3 + side)), t0 = .15 + .3 * h, t1 = t0 + .35;
        const ya = a.y + (b.y - a.y) * t0, yb = a.y + (b.y - a.y) * t1, xa = a.x + (b.x - a.x) * t0, xb = a.x + (b.x - a.x) * t1, wa = a.w + (b.w - a.w) * t0, wb = a.w + (b.w - a.w) * t1;
        poly4(xa + wa * Xa, ya, xa + wa * Xb, ya, xb + wb * Xb, yb, xb + wb * Xa, yb, f('#0c0a14'));
        if(B && on){ cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a0 * .42 * (1 - fog); poly4(xa + wa * Xa, ya, xa + wa * Xb, ya, xb + wb * Xb, yb, xb + wb * Xa, yb, SHOPL[B.sv] || '#ffc070'); cx.globalAlpha = a0; cx.globalCompositeOperation = 'source-over'; }
        poly4(xb + wb * Xa, yb, xb + wb * Xb, yb, xb + wb * Xb, yb + PX, xb + wb * Xa, yb + PX, f(B && on ? '#7a7ea0' : '#3a3c50')); } }   // the light spilling out over the sill
    // the crossings: a stop line, the zebra (its bars run with the traffic), the diagonal of the scramble, the zebra across the side street
    const m = s.akX; if(m === undefined) return; const zc = f('#d8d4dc');
    if(m === -6) poly4(a.x - a.w, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x - b.w, b.y, zc);
    if((m >= -4 && m < -1) || (m >= CW + 1 && m < CW + 4)) for(let q = 0; q < 10; q++){ const x0 = -.95 + q * .2, x1 = x0 + .11; poly4(a.x + a.w * x0, a.y, a.x + a.w * x1, a.y, b.x + b.w * x1, b.y, b.x + b.w * x0, b.y, zc); }
    if(m >= 0 && m < CW && (m & 1) === 0) for(const dir of [-1, 1]){ const t = (m + .5) / CW, xc = dir * (-1 + 2 * t); poly4(a.x + a.w * (xc - .12), a.y, a.x + a.w * (xc + .12), a.y, b.x + b.w * (xc + .12), b.y, b.x + b.w * (xc - .12), b.y, zc); }
    if(m >= 1 && m < CW - 1 && (m & 1)) for(const side of [-1, 1]){ const x0 = side * 1.15, x1 = side * 2.25; poly4(a.x + a.w * x0, a.y, a.x + a.w * x1, a.y, b.x + b.w * x1, b.y, b.x + b.w * x0, b.y, f('#b8b4c0')); } }

  // ---------------------------------------------------------------- the far land: the city beyond the canyon, its roof signs
  const SW = 640, SH = 110; let FAR = null, MID = null, MIDD = null;
  function buildStrips(){ const paint = (c, seed, hMin, hMax, dens, signs, dead) => { const k = c.getContext('2d'); k.clearRect(0, 0, c.width, c.height); let x = 0, n = 0;
      while(x < SW){ const r = H1(seed + n * 1.31), w = 14 + Math.floor(r * 30), h = hMin + Math.floor(H1(seed + n * 2.7) * (hMax - hMin)), top = SH - h, col = ['#141226', '#181630', '#1c1a2e', '#121022'][n & 3];
        k.fillStyle = col; k.fillRect(x, top, w, h); k.fillStyle = '#26244a'; k.fillRect(x, top, w, 1);
        for(let fy = top + 4; fy < SH - 3; fy += 4){ const fl = H1(seed + n * 7.1 + fy * .37); if(fl < dens && !dead){ k.fillStyle = fl < dens * .5 ? '#8a94b8' : '#a08a6a'; k.fillRect(x + 2, fy, w - 4, 1); } }   // lit floors as bands (no single-pixel speckle)
        if(signs && h > 20 && H1(seed + n * 3.3) < .7){ const Pn = PAN[Math.floor(H1(seed + n * 5.9) * PAN.length)], sw = Math.min(w - 2, 10 + Math.floor(H1(n * 1.7 + seed) * 12)), sh = 5 + Math.floor(H1(n * 2.3) * 4);
          k.fillStyle = '#0a0810'; k.fillRect(x + 1 + 2, top - sh - 3, 1, 3); k.fillRect(x + 1 + sw - 3, top - sh - 3, 1, 3); k.fillStyle = dead ? '#1a1620' : Pn[0]; k.fillRect(x + 1, top - sh - 2, sw, sh);
          if(!dead){ k.fillStyle = Pn[1]; for(let q = 0; q < Math.floor(sw / 5); q++) k.fillRect(x + 3 + q * 5, top - sh + 1, 3, Math.max(1, sh - 4)); } }
        if(signs && H1(seed + n * 4.1) < .4 && h > 30){ const Pn = PAN[Math.floor(H1(seed + n * 6.7) * PAN.length)]; k.fillStyle = dead ? '#16121c' : Pn[0]; k.fillRect(x + w - 4, top + 3, 3, Math.min(h - 6, 24)); }
        if(!signs && h > 60){ k.fillStyle = '#ff2a2a'; k.fillRect(x + (w >> 1), top - 2, 1, 2); }
        x += w + (H1(seed + n * 9.1) < .2 ? 2 : 0); n++; } };
    FAR = FAR || mk(SW, SH); MID = MID || mk(SW, SH); MIDD = MIDD || mk(SW, SH);
    paint(FAR, 11, 30, 100, .45, false, false); paint(MID, 23, 18, 62, .5, true, false); paint(MIDD, 23, 18, 62, .5, true, true); }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  function strip(c, par, y){ const P = SW * PX, o = ((skyPar(par) % P) + P) % P; cx.drawImage(c, 0, 0, SW, SH, snp(-o), y, P, SH * PX); cx.drawImage(c, 0, 0, SW, SH, snp(-o + P), y, P, SH * PX); if(-o + 2 * P < W) cx.drawImage(c, 0, 0, SW, SH, snp(-o + 2 * P), y, P, SH * PX); }
  function backdrop(o){ setLow(o.sk.low); if(!FAR) return false; cx.imageSmoothingEnabled = false; const hz = o.hz, y = snp(hz - SH * PX + PX * 2), dead = SPA.on && !SPA.rel && SPA.fr < (SPA.L ? SPA.L.BR + 200 : 0);
    strip(FAR, 'far', y - snp(H * .03)); strip(dead ? MIDD : MID, 'mid', y); return false; }

  /* ---------------------------------------------------------------- the downpour (Kellan: "can we make it very wet and raining akihabara")
     References, seen at pixel zoom (research/sundown-craft/akiba.md section 11): IQRemix's Akihabara crossing in the rain (2015), Liam Wong's
     TO:KY:OO (the Kabukicho umbrellas, the neon puddle), two Shinjuku downpours. What they show: every sign throws a column of its own colour
     straight down at the viewer, broken into horizontal dashes by the wet; the asphalt between stays dark; deep puddles are clean mirrors with
     rain rings; the rain itself is only seen where it crosses a light; clear vinyl umbrellas glow as pale domes; far away the canyon sinks
     into a lit haze. Built here:
     - the pools (wetSrc, drawn by env/roadmat.js POOL on the wet asphalt): each shop front, awning, the two lowest sign bands, every banner,
       the crane gantry and the fox screen lay their colour down the road and pavement; dead lights lay none (the blackout kills them too);
     - on the road (wetFX, per segment under the cars): splash crowns, rain rings where the water is deep, a specular glint on the lane paint;
     - the pavements (roadFX): stepped bands of each shop's light on the tiles, puddles with the shop in them;
     - the rain (rainOverlay): three pre-rendered tileable streak sheets (far fine, mid, near long), four slants by speed, 'overlay' blended so
       a streak brightens what it crosses (a sign, a screen, a lamp) and all but vanishes on the dark; in the blackout it is moonlit instead;
     - a dithered haze over the far canyon; dithered rain-haze blooms around the signs (halo, signBand); umbrellas; drips off the awnings;
     - the hiss (MECH.ak_rain): a looped noise bed on the SFX bus, under the music, only on this road. ?akrain=0 turns all of it off. */
  const RAINON = QA.get('akrain') !== '0', WB = [.02, .22, .55, .95];
  function wetCols(B, pc){ const c = SHOPL[B.sv] || '#ffc070'; return [mixc(pc, c, .24), mixc(pc, c, .14), mixc(pc, c, .07)]; }
  // the pools: per segment in view (roadmat calls this with 'lighter' set); far segments merge 2 or 4 at a time, anchored to the world
  function signSrc(B){ if(B.rs) return B.rs; const o = []; for(let f = 0; f < B.nF0 && o.length < 1; f++){ const t = B.fl[f], fy = G + f * FH;
      if(t === 'S') o.push([fy + .05, fy + FH - .03, BRANDS[B.br].f]); else if(t === 'K') o.push([fy + .06, fy + FH * 2 - .04, ART.wrap[B.wv] ? ART.wrap[B.wv].avg : '#3a2a8a']);
      else if(t === 'N') o.push([fy + .2, fy + .42, f & 1 ? '#c050ff' : '#ff4aa0']); else if(t === 'T') o.push([fy + .2, fy + .4, '#ffa020']); }
    return (B.rs = o); }
  function wetSrc(s, n, a, P){ if(!RAINON || AKX.includes('nrpool')) return; const V = s.akV !== undefined ? s.akV : (s.akV = visitOf(s.index) || null); if(!V) return; const i = s.index, uw = a.w; if(!(uw > .5)) return;
    if(n > 170) return; const st = n < 8 ? 1 : n < 20 ? 2 : n < 48 ? 4 : 8, fa = 1 - Math.pow(n / DRAW, 1.6) * .9, lx = laneDX(i);
    if(s.akG && onAt(i)){ const x = a.x + lx * uw; P(x, a.y, uw, 1.66, 2.91, 2 * uw, '#4a5cc8', .55 * fa); P(x + .25 * uw, a.y, uw, 2.1, 2.7, .55 * uw, '#f0e4c8', .5 * fa); P(x, a.y, uw, 1.58, 1.66, 1.9 * uw, '#ffb02a', .45 * fa); }
    // the blackout's lights: the train standing lit across the bridge, the signals on backup power (their pools are all the street has)
    if(i === V.BR && SPA.on && SPA.L === V && !SPA.rel2) P(a.x + lx * uw, a.y, uw, HT + .3, HT + .6, 3.2 * uw, '#ffd23a', .55 * fa);
    if(s.akX === -3) for(let side = -1; side <= 1; side += 2) P(a.x + (side * 1.14 + lx) * uw, a.y, uw, 1.28, 1.42, .14 * uw, '#3aff9a', .7 * fa);
    if(s.akLit > .55 && onAt(i)) for(let side = -1; side <= 1; side += 2) P(a.x + (side * .86 + lx) * uw, a.y, uw, 1.5, 1.62, Math.min(.12 * uw, W * .02), '#c8d8ff', .55 * fa);   // the mercury lamps
    for(let side = -1; side <= 1; side += 2){ const B = bAt(V, side, i); if(!B || !onAt(B.b0)) continue;
      if(B.hero >= 0 && i === B.b0){ const x = a.x + (side * (B.x0 + .1) + lx) * uw; P(x, a.y, uw, .88, 2.03, 1.84 * uw, '#3a3c8a', .5 * fa); P(x, a.y, uw, 1.1, 1.8, .6 * uw, '#ff8a2a', .55 * fa); }
      for(const b of B.bl){ if(b.plate) continue; const z = B.b0 + b.z; if(Math.floor(z / st) * st !== i) continue; const X = side * (B.x0 - b.off - b.pr / 2) + lx;
        P(a.x + X * uw, a.y, uw, G + b.f0 * FH, G + b.f1 * FH, b.pr * uw, b.ban !== undefined ? BAN[b.ban].s : PAN[b.p][0], .85 * fa); }
      if(i % st) continue; const t = segs[i + st]; if(!t || !t.p1.screen.scale) continue; const q = t.p1.screen, X = side * B.x0, xa = a.x + (X + lx) * uw, xb = q.x + (X + laneDX(i + st)) * q.w, w0 = Math.abs(xb - xa) * .55, xc = (xa + xb) / 2;   // (a column, not the whole span: the stripes of the references, not a slab)
      P(xc, a.y, uw, .04, .56, w0, SHOPL[B.sv] || '#ffc070', .34 * fa); P(xc, a.y, uw, .56, G, w0, B.gr === 'crane' ? '#ff3a7a' : B.aw[0], .24 * fa);
      const rs = signSrc(B); for(let k = 0; k < rs.length; k++) P(xc, a.y, uw, rs[k][0], rs[k][1], w0, rs[k][2], .78 * fa); } }
  // on the road, under the cars: splash crowns, rain rings where the water stands, the glint on the lane paint (per segment, near only)
  let AKDK = 0;
  function wetFX(s, n, r0, r1, RV, wet, T){ if(!RAINON || n > 40 || AKX.includes('nrfx')) return; const i = s.index, a = s.p1.screen, uw = a.w; if(!(uw > 4)) return; const g = cx, a0 = g.globalAlpha, now = performance.now(), dk = AKDK;
    g.globalCompositeOperation = 'lighter';
    // lane paint: a wet specular glint on the dashes (the lamp and sign light caught on the paint), brightest at each dash's far edge
    if(s.stripe && s.akX === undefined){ const lt = .25 + Math.min(.6, s.lit || 0), b = s.p2.screen; g.fillStyle = dk > .5 ? '#9aaad8' : '#eef0ff';
      for(let q = -1; q <= 1; q += 2){ const xa = a.x + a.w * q * 2 / 3, xb = b.x + b.w * q * 2 / 3, wd = Math.max(PX, Math.round(b.w / 20 / PX) * PX * 2);
        g.globalAlpha = a0 * .5 * lt; g.fillRect(Math.round((xb - wd / 2) / PX) * PX, r0 * PX, wd, PX);
        const m = n < 6 ? 2 : 1; for(let k = 0; k < m; k++){ const f0 = k / m, f1 = (k + 1) / m, ra = r0 + Math.floor((r1 - r0 + 1) * f0), rb = r0 + Math.floor((r1 - r0 + 1) * f1); if(rb <= ra) continue;
          const xm = xb + (xa - xb) * (f0 + f1) / 2; g.globalAlpha = a0 * .2 * lt; g.fillRect(Math.round(xm / PX) * PX, ra * PX, PX, (rb - ra) * PX); } } }
    // the rain landing: world-anchored drops, each on its own cycle (a crown for its first fifth, then a ring spreading where the water is deep)
    const N = n < 4 ? 5 : n < 12 ? 3 : n < 24 ? 2 : 1, rc = r1 - r0 + 1, rcol = dk > .5 ? '#a8b8e8' : '#cdd4f4';
    for(let q = 0; q < N; q++){ const h0 = H1(i * 7.13 + q * 3.7), per = 520 + 380 * H1(i * 3.1 + q), ph = now / per + h0 * 9, cyc = Math.floor(ph), f = ph - cyc;
      const X = (H1(i * 1.7 + q * 9.1 + cyc * .37) * 2 - 1) * 2.15, r = r0 + Math.floor(H1(i * 5.3 + q * 2.3 + cyc * .71) * rc), x = RV.x[r] + X * RV.w[r], w = RV.w[r], y = r * PX; if(!(x === x)) continue;
      const m = Math.abs(X) < 1 ? RV.mask(T, X, RV.v[r]) : .55, sz = Math.max(PX, Math.round(w * .012 / PX) * PX), xx = Math.round(x / PX) * PX; g.fillStyle = rcol;
      if(f < .22){ g.globalAlpha = a0 * .55; const e = f < .1 ? 0 : sz; g.fillRect(xx, y - PX - e, PX, PX); if(e){ g.fillRect(xx - sz - PX, y - PX * 2, PX, PX); g.fillRect(xx + sz + PX, y - PX * 2, PX, PX); } }
      else if(m > .3){ const t = (f - .22) / .78, rx = Math.round((PX + w * .045 * t) / PX) * PX, ry = Math.max(PX, Math.round(rx * .28 / PX) * PX); g.globalAlpha = a0 * .42 * (1 - t) * (.5 + .5 * m);
        g.fillRect(xx - rx, y - ry, rx * 2, PX); g.fillRect(xx - rx, y + ry, rx * 2, PX); if(ry > PX){ g.fillRect(xx - rx - PX, y - ry + PX, PX, ry * 2 - PX); g.fillRect(xx + rx, y - ry + PX, PX, ry * 2 - PX); } } }
    g.globalAlpha = a0; g.globalCompositeOperation = 'source-over'; }
  // the rain sheets: three depths x four slants, tileable, white with the alpha baked (built in warm-up)
  const RTS = 96, RLAY = [{ n:320, len:[2, 3, 4, 5], a:.34 }, { n:110, len:[5, 8, 11, 14], a:.55 }, { n:26, len:[11, 17, 24, 32], a:.8 }], RSL = [.05, .13, .24, .36], RVEL = [.5, .95, 1.6];
  let RSH = null;
  function buildRain(){ RSH = []; for(let L = 0; L < 3; L++){ const row = []; for(let v = 0; v < 4; v++){ const c = mk(RTS, RTS), g = c.getContext('2d'), id = g.createImageData(RTS, RTS), D = id.data, Ld = RLAY[L];
        for(let q = 0; q < Ld.n; q++){ const x0 = H1(q * 1.37 + L * 11.1) * RTS, y0 = H1(q * 2.71 + L * 5.3) * RTS, len = Math.max(2, Math.round(Ld.len[v] * (.7 + .6 * H1(q * 4.1 + L)))), sl = RSL[v];
          for(let k = 0; k < len; k++){ const xx = ((Math.round(x0 - sl * k) % RTS) + RTS) % RTS, yy = Math.round(y0 + k) % RTS, j = (yy * RTS + xx) * 4, t = k / len, al = Ld.a * (t < .3 ? .45 : 1);
            D[j] = D[j + 1] = D[j + 2] = 255; D[j + 3] = Math.max(D[j + 3], Math.round(al * 255)); } }
        g.putImageData(id, 0, 0); row.push(c); } RSH.push(row); } }
  function sheet(c, ox, oy){ const P = RTS * PX, x0 = snp(-(((ox % P) + P) % P)), y0 = snp((((oy % P) + P) % P) - P); for(let y = y0; y < H; y += P) for(let x = x0; x < W; x += P) cx.drawImage(c, x, y, P, P); }
  function rainOverlay(al, now){ if(!RSH || !RAINON || al < .02 || AKX.includes('nrov')) return; const g = cx, a0 = g.globalAlpha, t = now / 1000, sp = clamp(speed / MAXS, 0, 1), v = Math.min(3, Math.round(sp * 3.4)), cs = Math.floor(position / SEG);
    AKDK += ((onAt(cs + 12) ? 0 : 1) - AKDK) * .08; const dk = AKDK; try{ const rp = MECH.roadmat && MECH.roadmat.RP[KEY]; if(rp) rp.sheen = .8 + 1.1 * dk; }catch(e){}   // (in the dark the puddles hold only the sky: colder and stronger, the moon's glitter with them) g.imageSmoothingEnabled = false;
    const rs = reduce ? .3 : 1, par = skyPar('mid');
    for(let L = 0; L < 3; L++){ if(reduce && L === 2) break; const vel = RVEL[L] * H * rs * (1 + sp * .35), oy = t * vel, ox = oy * RSL[v] - par * (.4 + L * .3), c = RSH[L][v];
      if(L === 0){ g.globalCompositeOperation = 'source-over'; g.globalAlpha = a0 * al * (.18 + .3 * dk); sheet(c, ox, oy); continue; }
      g.globalCompositeOperation = 'overlay'; g.globalAlpha = a0 * al * (L === 1 ? .85 : 1) * (1 - .7 * dk); sheet(c, ox, oy);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = a0 * al * ((L === 1 ? .04 : .055) + (L === 1 ? .2 : .32) * dk); sheet(c, ox, oy); }
    // the blackout: the streaks catch the moon (a band of them brighter under it)
    if(dk > .05 && !reduce){ const mx = MOON.x || W / 2, vy = t * RVEL[2] * H * (1 + sp * .35); g.save(); g.beginPath(); g.rect(snp(mx - W * .2), 0, snp(W * .4), H); g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a0 * al * .28 * dk;
      sheet(RSH[2][v], vy * RSL[v] - par, vy); g.restore(); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = a0; }
  // the hiss: a looped noise bed (a high hiss and a low body) on the SFX bus, only while riding this road; unwired elsewhere (it then costs nothing)
  const AR = { src:null, g:null, wired:false, t:0, off:0 };
  MECH.ak_rain = { update(dt){ try{ if(!RAINON || typeof SFX === 'undefined' || !SFX.ready || !SFX.ready() || !SFX.bus || typeof M === 'undefined' || !M.ac || !M.noiseBuf) return;
      const sg = typeof segs !== 'undefined' && segs.length ? segAt(position + PZ) : null, here = state === 'play' && !!sg && !!LANDS[sg.land] && LANDS[sg.land].key === KEY;
      if(!AR.src && here){ const ac = M.ac, s = ac.createBufferSource(); s.buffer = M.noiseBuf; s.loop = true; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
        const hg = ac.createGain(); hg.gain.value = .018; const bp = ac.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 420; const bg = ac.createGain(); bg.gain.value = .05; AR.g = ac.createGain(); AR.g.gain.value = 0;
        s.connect(hp); hp.connect(lp); lp.connect(hg); hg.connect(AR.g); s.connect(bp); bp.connect(bg); bg.connect(AR.g); s.start(); AR.src = s; }
      if(!AR.src) return;
      if(here && !AR.wired){ AR.g.connect(SFX.bus()); AR.wired = true; }
      if((AR.t -= dt || 0) <= 0){ AR.t = .25; AR.g.gain.setTargetAtTime(here ? 1 + .4 * AKDK : 0, M.ac.currentTime, .6); if(here) AR.off = 0; else if(++AR.off > 16 && AR.wired){ AR.g.disconnect(); AR.wired = false; } } }catch(e){} } };
  // ---------------------------------------------------------------- overlay: the rain; the relight's flash (none under reduced motion)
  function overlay(al, now, sk){ rainOverlay(al, now); if(!SPA.flash || reduce || (window.ASSIST && ASSIST.noFlash)) return; const a0 = cx.globalAlpha; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = al * SPA.flash * .3; cx.fillStyle = '#fff2c8'; cx.fillRect(0, 0, W, H);
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = a0; }

  // ---------------------------------------------------------------- draw dispatch
  function draw(sp, x, y, uw, fog, now, sk){ draw0(sp, x, y, uw, fog, now, sk); CAT = 'o'; }
  function draw0(sp, x, y, uw, fog, now, sk){ if(sk && sk.low) setLow(sk.low); const t = sp.type; CAT = t; if(RAINON) fog = Math.min(1, fog + (1 - fog) * fog * .7);   // the downpour: the far canyon sinks sooner into a lit haze (fogLow is lifted toward it in setLow)
    if(t === 'b') return drawB(sp, x, y, uw, fog, now); if(t === 'w') return drawWire(sp, x, y, uw, fog, now); if(t === 'lamp') return drawLamp(sp, x, y, uw, fog, now); if(t === 'pole') return drawPole(sp, x, y, uw, fog, now);
    if(t === 'ped') return drawPed(sp, x, y, uw, fog, now); if(t === 'xf') return drawXF(sp, x, y, uw, fog, now); if(t === 'sig') return drawSig(sp, x, y, uw, fog, now); if(t === 'trk') return drawTruck(sp, x, y, uw, fog, now);
    if(t === 'pv') return drawProp(sp, x, y, uw, fog, now); if(t === 'br') return drawBridge(sp, x, y, uw, fog, now); if(t === 'gnt') return drawGantry(sp, x, y, uw, fog, now); }
  /* The gantry screen (round 5): the crane hero (round 6) over the road just past a crossing, facing straight down it, as Neon Ward's jumbo does: two
     steel posts at the kerbs, a lattice beam, the screen (64 x 40 LEDs, the grid fading in near by) in a bezel, its glow, a marquee. */
  function drawGantry(sp, x, y, uw, fog, now){ if(!CF(sp.k + .5)) return; FF = fog; ON = onAt(sp.k); const u = CFU; if(u < .4) return;
    const sw = 2.0 * u, sh = sw * 40 / 64, sx = CFX - sw / 2, bot = CFY - 1.66 * u, sy = bot - sh, t = Math.max(PX, snp(sw * .02)), sc = F('#2a2632'), pw = Math.max(PX, snp(u * .05));
    if(sx > W + PX || sx + sw < -PX || bot < -PX || sy > H + PX) return;
    for(const X of [-1.22, 1.22]){ const px0 = CFX + X * u; R(px0 - pw / 2, sy - t * 3, pw, CFY - sy + t * 3, sc); if(pw > PX) R(px0 - pw / 2, sy - t * 3, PX, CFY - sy + t * 3, F('#5a5668')); }
    const bh = Math.max(PX, snp(u * .04)), by = sy - t - bh * 3; R(CFX - 1.26 * u, by, 2.52 * u, bh, sc); R(CFX - 1.26 * u, by + bh * 2, 2.52 * u, bh, sc);
    if(u > 8) for(let X = -1.2; X < 1.2; X += .2) pline(CFX + X * u, by + bh, CFX + (X + .2) * u, by + bh * 2, sc, 1);
    bezel(sx, sy, sw, sh, t, false); halo(sx - t, sy - t, sw + t * 2, sh + t * 2, '#e8d8a0', 1.3); screenAt(ART.crane[reduce ? 20 : Math.floor(now / 120) % 40], sx, sy, sw, sh, now);
    const th = Math.max(PX * 2, snp(sh * .06)), my = sy + sh + t; R(sx - t, my, sw + t * 2, th + PX * 2, F('#141220'));
    if(ON){ const st = Math.max(PX * 2, snp(th * .8)), ph0 = reduce ? 0 : Math.floor(now / 90), byy = my + PX + snp((th - PX) / 2); cx.fillStyle = fc('#ffb02a', FF * .4); for(let xx = sx, q = 0; xx < sx + sw; xx += st, q++) if((q + ph0) % 4) pxRect(xx, byy, PX, PX); } }

  /* ---------------------------------------------------------------- the set piece: 停電 TEIDEN, the blackout wave
     On the stretch before the bridge (S0 .. BR), driven by the rider's distance s past S0, never the clock:
       s 4     the card (停電 BLACKOUT, then every sign at once), a slim letterbox, the music ducked, the guard clearing traffic and oil to the
               bridge; a low power-down note.
       s 30    the wave: from beyond the bridge every sign, window, shop and street lamp dies in turn, the dark rolling toward you faster than
               you ride (3.2 segments per segment); the tubes stutter at its edge (steady under reduced motion). It passes you at s ~195.
       dark    the street lit only by the traffic signals (backup power), the moon, and the yellow train standing across the bridge ahead.
       BR-70   everything at once: every sign, shop and lamp, a warm flash (none under reduced motion), a thump of the breakers.
       BR+40   the letterbox and guard end; the director is told it was seen. */
  const RL = SPL - 70;
  MECH.sp_teiden = { update(dt){ if(typeof segs === 'undefined' || !segs.length || state !== 'play') { SPA.on = false; return; } const cs = position / SEG, L = visitOf(Math.floor(cs));   // (not cam(): its cache is per drawn frame, and update may run several times between draws)
      if(SPA.flash) SPA.flash = Math.max(0, SPA.flash - (dt || 0) * 2.6);
      if(!L || !L.sp || L.BR < 0 || cs < L.S0 - 10 || cs > L.BR + 60){ if(SPA.on){ SPA.on = false; relamp(L, true); } return; }
      const s = cs - L.S0, D = DIR(); SPA.on = true; SPA.L = L; SPA.lo = L.S0 - 40; SPA.hi = L.BR + 340; SPA.fr = s < 30 ? 1e9 : L.BR + 320 - (s - 30) * 3.2; SPA.rel = s >= RL; SPA.rel2 = s >= RL + 120;
      if(!L.card && s >= 4){ L.card = true; if(D && D.cine){ let card = CARD; if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has('teiden')){ try{ if(MECH.cutin.show('teiden') !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
          try{ if(card) D.cine({ letterbox:false, dur:2.4, card }); L.cut = D.cine({ letterbox:{ top:.05, bottom:.06 }, duck:.55, guard:{ from:L.S0, to:L.BR + 40 }, dur:0 }); }catch(e){} }
        for(let i = Math.max(0, L.S0); i < L.BR + 20 && i < segs.length; i++) if(segs[i].hz && segs[i].hz.type === 'pad') segs[i].hz = null;   // no stray speed lines over the dark
        snd([[196, 1.1], [147, 1.4], [98, 1.8]], 'sawtooth', .012); }
      if(!L.off && s >= 30){ L.off = true; try{ if(typeof M !== 'undefined' && M.ac && M.noise) M.noise(1.4, 70, .08); }catch(e){} }
      if(!L.rel && s >= RL){ L.rel = true; SPA.flash = 1; snd([[110, .3], [220, .5], [440, .9]], 'square', .016); try{ if(typeof M !== 'undefined' && M.ac && M.noise){ M.noise(.25, 140, .14); M.noise(.6, 2400, .02); } }catch(e){}
        if(D && D.cine && !reduce) try{ D.cine({ letterbox:false, shake:1.5, dur:.5 }); }catch(e){} }
      if(!L.fin && s >= SPL + 40){ L.fin = true; try{ if(L.cut) L.cut.end(); }catch(e){} try{ D && D.done && D.done('teiden'); }catch(e){} }
      relamp(L, false); } };
  // the street lamps' pools on the road follow the wave (the core reads s.lit; its value at placement is kept in s.lit0)
  function relamp(L, all){ if(!L) return; const a = Math.max(0, Math.floor(position / SEG)), b = Math.min(segs.length, a + DRAW + 2); for(let i = a; i < b; i++){ const s = segs[i]; if(s.lit0 === undefined) continue; s.lit = all || onAt(i) ? s.lit0 : (s.akX !== undefined ? .08 : 0); } }
  function snd(notes, type, v){ try{ if(typeof M === 'undefined' || !M.ac || !M.tone) return; const t0 = M.ac.currentTime; notes.forEach(([f, d], k) => M.tone(f, d, { type, v, at:t0 + k * .12 })); }catch(e){} }

  // ---------------------------------------------------------------- warm-up
  function* warmSteps(){ regDir(); if(!PANL.length) for(const p of PAN){ PANL.push(mixc(p[0], '#ffffff', .45)); PANS.push(mixc(p[1], p[0], .3)); }
    if(AKX.includes('cnt') && !warmSteps.cnt){ warmSteps.cnt = true; const f0 = cx.fillRect; cx.fillRect = function(){ AKC[CAT] = (AKC[CAT] || 0) + 1; return f0.apply(this, arguments); }; }
    if(!ATL){ ATL = mk(1024, 1); AG = ATL.getContext('2d'); SC = mk(80, 80); SG = SC.getContext('2d', { willReadFrequently:true }); TK = mk(2048, 16); } yield;
    yield* buildTextG(); yield* artSteps(); if(!FONT){ try{ if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16').then(() => { if(!FONT) buildText(); }, () => {}); }catch(e){} } yield;
    buildStrips(); yield; buildPeople(); buildProps(); yield; buildRain(); yield; hazeWarm(); yield;
    try{ if(typeof MUSIC !== 'undefined' && MUSIC.ROAD_THEME && !MUSIC.ROAD_THEME[KEY]) MUSIC.ROAD_THEME[KEY] = 'neon'; }catch(e){}
    try{ cx.save(); cx.globalAlpha = .004; for(const c of [ATL, TK, FAR, MID, MIDD].concat(PEOPLE, PROPS)) if(c) cx.drawImage(c, 0, 0, 1, 1); cx.fillStyle = ditherPat('#235250', .25); cx.fillRect(0, 0, PX, PX); cx.restore(); }catch(e){ try{ cx.restore(); }catch(e2){} }
    cx.clearRect(0, 0, W, H); }

  ENV.akiba = { _mk:(ch, z) => { const q = mask(ch, z), b = box(q.m, q.n); let c = 0; for(const v of q.m) c += v; return [b, c, q.n]; }, _GA:GA, _used:USED, _atl:() => ATLY, _ga:() => { const o = {}; let A = 0; for(const st in GA) for(const ch in GA[st]) GA[st][ch].forEach((g, si) => { if(!g) return; const k = st + SZ[si]; o[k] = (o[k] || 0) + g.w * g.h; A += g.w * g.h; }); o.total = A; return o; }, _akc:AKC, _PJ:(z, x, h) => { cam(); PJ(z, x, h); return [PJX, PJY, PJU]; }, _lay:lay, _visit:visitOf, _ART:ART, _AT:() => AT, _artSteps:artSteps, _spa:SPA, _onAt:onAt,
    kerbs:true, moonDX:.18, road:['#1e1c26', '#1c1a23'], lampCol:'#5a5a78',
    warm(){ for(const _ of warmSteps()); }, warmSteps, place, lit, draw, roadFX, backdrop, overlay, wetSrc, wetFX, hingeIn:() => 'over' };
})();
