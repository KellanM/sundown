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
  const setLow = c => { if(c === LOWIN) return; LOWIN = c; const [r, g, b] = hx(c), q = '#' + [r, g, b].map(v => (Math.min(255, Math.round(v / 8) * 8) | 0).toString(16).padStart(2, '0')).join(''); if(q !== fogLow){ fogLow = q; FC.clear(); } };
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
    if(LAYS.size > 40) LAYS.clear(); LAYS.set(key, L); return L; }
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
    const B = { k, b0, len, side, sd, nF, nF0:nF, ak:1, pnF0:ph, h:G + nF * FH, x0:2.3 + (hs(3) - .5) * .08, depth:1.4 + hs(4) * .5, S:CLAD[CL], cl:CL, fl:[], wd:[], pn:[], bl:[], rb:null, ew:null, ph:ph ? G + ph * FH : 0, P:3 + Math.floor(hs(5) * 2),
      gr:k === 'arcade' ? 'crane' : k === 'radio' ? 'stall' : 'shop', tv:k === 'denki' || (k === 'camera' && hs(6) < .5), ic:k === 'radio' ? '#f0c878' : hs(7) < .7 ? '#d4dcf0' : '#f0dcb4', aw:PAN[Math.floor(hs(8) * PAN.length)] };
    const okP = p => !((CL === 'yellow' && (p === 1)) || ((CL === 'white' || CL === 'cream') && (p === 0 || p === 6)) || (CL === 'red' && p === 2));   // a plate that would vanish on its cladding
    let w0 = Math.floor(hs(9) * BW.length), p0 = Math.floor(hs(10) * PAN.length);
    for(let f = 0; f < nF; f++){ let t = 'W';
      if(k === 'denki') t = f === nF - 1 && hs(11) < .6 ? 'W' : 'S'; else if(k === 'camera') t = f === 0 ? 'T' : f < 3 ? 'S' : 'W'; else if(k === 'arcade') t = 'N'; else if(k === 'plain') t = f === 1 && hs(12) < .7 ? 'S' : 'W';
      B.fl.push(t); let p = (p0 + f * 3) % PAN.length; for(let q = 0; q < 8 && !okP(p); q++) p = (p + 1) % PAN.length; B.pn.push(p); B.wd.push(BW[(w0 + f * 5) % BW.length]); }
    if(k === 'camera') B.wd[1] = 'カメラ';
    // blades: the big corner blade (several floors) on the stores; plate columns on the narrow and old buildings
    const blade = (z, f0, f1, word, p, chase) => B.bl.push({ z, f0, f1, word, p, chase:!!chase, pr:.44 });
    if(k === 'denki' || k === 'camera') { let p = Math.floor(hs(13) * 6) + 2; if(!okP(p)) p = 3; blade(1, 1, Math.min(nF, 1 + Math.max(2, BW[(w0 + 3) % BW.length].length)), k === 'camera' ? 'カメラ' : BW[(w0 + 3) % BW.length], p); if(len > 20) blade(len - 3, 2, Math.min(nF, 6), BW[(w0 + 8) % BW.length], (p + 3) % PAN.length); }
    if(k === 'arcade') blade(2, 1, Math.min(nF, 4), 'ゲーム', 2, true);
    if(k === 'pencil' || k === 'radio' || k === 'plain'){ const cols = k === 'radio' ? [3, len - 4] : [Math.floor(len / 2)]; for(const zc of cols){ if(zc < 1 || zc >= len) continue; const top = Math.min(nF, k === 'radio' ? 4 : nF);
        for(let f = 0; f < top; f++){ B.bl.push({ z:zc, f0:f, f1:f + 1, word:PW[(w0 + f * 5 + zc) % PW.length], p:(p0 + f * 2 + zc) % PAN.length, chase:false, pr:.36, plate:true }); } } }
    if(k === 'radio' || (k === 'denki' && hs(14) < .5) || (k === 'arcade' && hs(14) < .4)) B.rb = { word:k === 'radio' ? 'ラジオ' : k === 'arcade' ? 'ゲーム' : BW[(w0 + 11) % BW.length], p:k === 'radio' ? 1 : (p0 + 1) % PAN.length };
    if(k === 'denki' || k === 'camera' || k === 'arcade') B.ew = { word:BW[(w0 + 7) % BW.length], p:(p0 + 4) % PAN.length, tk:k === 'camera' || hs(15) < .35 };
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
    if(off){ blades(B, j, n, now); for(let f = 0; f < B.nF; f++) if(B.fl[f] === 'S') faceText(B, f, G + f * FH, j, n); if(j === B.b0) endWall(B, x, y, uw, now); return; }   // beside the camera, off the screen's edge: only what projects from it may show
    const hv = Math.min(B.h, Math.max(FY1 / Math.max(FU1, .01), FY2 / Math.max(FU2, .01)) + .1); if(hv <= 0) return;
    const fpx = Math.max(FU1, FU2) * FH, wpx = Math.abs(FX2 - FX1), far = fpx < 2.6;
    CAT = 'gnd'; ground(B, j, n, fpx, wpx, now); CAT = far ? 'far' : 'face';
    if(hv > G){ const base = F(S[1]); BASE = base;
      FQ(G, hv, base);   // (one quad: over 32 rows the engine fills it as one snapped path, far fewer ops than a band per spandrel)
      if(far){ // far: each floor one band of its main light (sign plates, lit windows), merged where they agree
        for(let f = 0; f < B.nF; f++){ const fy = G + f * FH; if(fy > hv) break; const t = B.fl[f];
          if(t === 'S') FQ(fy + .06, fy + FH - .04, L1(PAN[B.pn[f]][0])); else if(t === 'N') FQ(fy + .2, fy + .42, L1(f & 1 ? '#c050ff' : '#ff4aa0')); else if(t === 'T') FQ(fy + .2, fy + .4, L1('#ffa020')); else { const st = floorState(B, f, 0); if(st && ON) FQ(fy + .18, fy + .46, F(st === 1 ? '#b4c2e0' : st === 2 ? '#dcb478' : '#4a4a60')); } } }
      else for(let f = 0; f < B.nF; f++){ const fy = G + f * FH; if(fy > hv) break; if(FY1 - FU1 * (fy + FH) > H + PX * 2 && FY2 - FU2 * (fy + FH) > H + PX * 2) continue;
        const t = B.fl[f]; CAT = t; if(t === 'X'){ xFloor(B, f, fy); continue; } if(t === 'S') signBand(B, f, fy, j, n, fpx, wpx); else if(t === 'N') neonFloor(B, f, fy, j, n, fpx, now); else if(t === 'T') tickFloor(B, fy, j, n, fpx, now); else winFloor(B, f, fy, j, n, fpx, wpx); }

      if(hv >= B.h){ FQ(B.h - .05, B.h, F(S[2])); if(fpx >= 6) FQ(B.h, B.h + .1, F(S[0])); }   // the coping and a parapet
      if(B.rb && hv >= B.h) roofBoard(B, j, n, now); }
    CAT = 'blade'; blades(B, j, n, now); CAT = 'end';
    if(j === B.b0) endWall(B, x, y, uw, now); CAT = 'o'; }
  // the street floor: a shop open to the pavement (goods, a wall of televisions, price cards), the arcade's crane cabinets, or the old
  // radio building's parts stalls; the awning sign above. World-anchored bays (B.P segments) so nothing repeats per segment near by.
  function ground(B, j, n, fpx, wpx, now){ if(AKX.includes('gnd')) return; const gp = fpx * G / FH, S = B.S, P = B.P, rel = j - B.b0, ba = Math.floor(rel / P), bz = Math.floor((rel + n - 1) / P), mid = gp >= 12, near = gp >= 22 && n === 1;
    const I = ON ? B.ic : '#0c0a12';
    if(gp < 3){ FQ(0, .56, L1(B.gr === 'crane' ? '#ff9ad8' : B.ic)); FQ(.56, G, F(S[0])); return; }
    if(B.gr === 'crane'){ // crane-game cabinets, one per bay: a pale or pink frame, the lit glass box of prizes, the claw, a marquee
      FQ(0, G, F(S[0]));
      for(let bb = ba; bb <= bz; bb++){ const ta = (B.b0 + bb * P + .25 - j) / n, tb = (B.b0 + bb * P + P - .25 - j) / n; if(tb <= 0 || ta >= 1) continue; const a = Math.max(0, ta), e = Math.min(1, tb), hb = H1(B.sd + bb * 1.7), fr = hb < .4 ? '#f4e8f0' : hb < .75 ? '#ff6aa8' : '#6ad8f0';
        FQ(0, .2, L1(fr), a, e); FQ(.2, .5, ON ? fc(hb < .5 ? '#fff4fa' : '#e8f8ff', FF * .5) : F('#141220'), a, e); FQ(.5, .58, L1(hb < .5 ? '#ff3a8a' : '#2a9ad8'), a, e);
        if(mid){ const pc = ['#ffd23a', '#ff8ab8', '#8ad0ff', '#a8f07a'];   // the prize heap: three soft lumps on the floor of the box
          for(let q = 0; q < 3; q++){ const u0 = ta + (tb - ta) * (.12 + q * .27), u1 = u0 + (tb - ta) * .22; if(u1 <= 0 || u0 >= 1) continue; FQ(.2, .27 + H1(bb * 3.1 + q) * .05, ON ? fc(pc[(bb + q) & 3], FF * .5) : F('#1c1a26'), Math.max(0, u0), Math.min(1, u1)); }
          const cm = ta + (tb - ta) * (.45 + .1 * Math.sin(now / 900 + bb)), cw = (tb - ta) * .08; if(cm > 0 && cm < 1) FQ(.4, .5, F('#3a3644'), Math.max(0, cm - cw), Math.min(1, cm + cw)); }   // the claw on its gantry
        if(near){ FQ(.2, .5, F('#d8d0e0'), a, Math.min(1, a + .06)); FQ(.07, .12, L1('#ffe23a'), ta + (tb - ta) * .4, ta + (tb - ta) * .6); } }   // the glass's lit edge; the coin slot's lamp
      FQ(.58, G, L1('#ff3a7a')); if(mid) awningInk(B, j, n, .6, G - .02); return; }
    FQ(0, .56, F(I)); FQ(.56, G, L1(B.aw[0]));
    if(mid) awningInk(B, j, n, .59, G - .02);
    if(!mid){ FQ(0, .16, F(ON ? '#5a4a58' : '#141018')); return; }
    for(let bb = ba; bb <= bz; bb++){ const z0 = B.b0 + bb * P, ta = (z0 - j) / n, tb = (z0 + P - j) / n; if(tb <= 0 || ta >= 1) continue; const hb = H1(B.sd * 3.3 + bb * 2.9), sub = (u0, u1) => [Math.max(0, ta + (tb - ta) * u0), Math.min(1, ta + (tb - ta) * u1)];
      if(B.gr === 'stall'){ // a parts stall: a dark partition, warm bulb light, drawers of parts in rows, coils of wire
        let [a, e] = sub(0, .1); if(e > a) FQ(0, .56, F(B.S[0]), a, e); [a, e] = sub(.15, .9); if(e > a){ FQ(.28, .48, F(ON ? '#b8884a' : '#1a1418'), a, e); if(near || gp >= 12) for(let r = 0; r < 3; r++) FQ(.3 + r * .06, .32 + r * .06, F('#5a3a22'), a, e); FQ(.1, .22, F(ON ? ['#3a5a8a', '#8a3a3a', '#3a7a4a'][Math.floor(hb * 3)] : '#141018'), a, e); } continue; }
      if(B.tv && (bb & 1) === 0 && gp >= 18){ // a wall of televisions: two rows of screens, each its own blue (no flicker)
        for(let r = 0; r < 2; r++) for(let q = 0; q < 3; q++){ const [a, e] = sub(.08 + q * .3, .3 + q * .3); if(e <= a) continue; const sc = ['#7aa8ff', '#9a8aff', '#6ad0e8', '#c8d8ff'][Math.floor(H1(bb * 7.3 + r * 3 + q) * 4)];
          FQ(.2 + r * .16, .33 + r * .16, F('#16141e'), a, e); const [a2, e2] = sub(.1 + q * .3, .28 + q * .3); if(e2 > a2) FQ(.215 + r * .16, .315 + r * .16, ON ? fc(sc, FF * .4) : F('#101018'), a2, e2); } continue; }
      // stacked boxes (a pale lit top edge), price cards on them, red and yellow
      for(let q = 0; q < (gp >= 20 ? 2 : 1); q++){ const [a, e] = sub(.08 + q * .46, .46 + q * .46); if(e <= a) continue; const h1 = .14 + H1(bb * 5.1 + q) * .16, bc = ['#c8b48a', '#8a9ab8', '#d8d0c0', '#b86a4a'][Math.floor(H1(bb * 1.9 + q) * 4)];
        FQ(0, h1, F(ON ? bc : '#1a161e'), a, e); FQ(h1 - .02, h1, F(ON ? '#fffaf0' : '#24202a'), a, e);
        const [c0, c1] = sub(.18 + q * .46, .32 + q * .46); if(c1 > c0) FQ(h1 + .02, h1 + .09, L1(q ? '#ffe23a' : '#ff2a3a'), c0, c1);
        if(near && c1 > c0) FQ(h1 + .045, h1 + .06, F(q ? '#c8141e' : '#ffffff'), c0 + (c1 - c0) * .2, c1 - (c1 - c0) * .2); }
      if(near && hb < .3){ const [a, e] = sub(.6, .72); if(e > a){ FQ(0, .3, F('#1a1626'), a, e); FQ(.3, .36, F('#d8a888'), a + (e - a) * .2, e - (e - a) * .2); FQ(.36, .38, F('#141018'), a, e); } }   // a customer
      if(near){ const [a, e] = sub(.2, .4); if(e > a) FQ(.44, .52, L1((bb & 1) ? '#ff2a3a' : '#ffd23a'), a, e); } }   // a hanging card
    if(near) FQ(.54, .56, F(ON ? '#ffffff' : '#201c28')); }   // the tube line under the awning
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
  function signBand(B, f, fy, j, n, fpx, wpx){ const Pn = PAN[B.pn[f]], h0 = fy + .05, h1 = fy + FH - .03; FQ(h0, h1, L1(Pn[0]));
    if(fpx >= 14) FQ(h1 - .03, h1, L1(PANL[B.pn[f]]));
    if(fpx >= 4) faceText(B, f, fy, j, n); }
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
  function blade(B, b, z, now){ if(!CF(z + .5)) return; const side = B.side, lx = laneDX(Math.floor(z)), Xo = side * (B.x0 - .03) + lx, Xi = Xo - side * b.pr, u = CFU;
    { const xa = CFX + Xo * u, xb = CFX + Xi * u; if((xa < -PX * 2 && xb < -PX * 2) || (xa > W + PX * 2 && xb > W + PX * 2)) return; }
    const hb = (b.f0 ? G + (b.f0 - 1) * FH : .02) + (b.plate ? (b.f0 ? FH : G) * .18 : .08) + (b.plate && b.f0 ? FH * .12 : 0), ht = Math.min(B.h - .08, (b.f0 ? G + (b.f1 - 1) * FH : G) + (b.plate ? 0 : FH - .1)) - (b.plate ? .04 : 0);
    if(ht - hb < .15) return; const Pn = PAN[b.p], pw = Math.abs(Xo - Xi) * u, ph = (ht - hb) * u;
    if(pw < PX * 1.5){ CR(Xi, Xo, hb, ht, L1(Pn[0])); return; }   // far: a lit strip
    CR(Xi - side * .03, Xo, hb - .04, ht + .04, F('#16121c')); CR(Xi, Xo - side * .05, hb, ht, L1(Pn[0]));   // the steel frame; the plate
    if(pw >= PX * 5) CR(Xi, Xo - side * .05, ht - .025, ht, L1(mixc(Pn[0], '#ffffff', .5)));   // its lit top edge
    const word = b.word, m = word.length, cell = Math.min(ph / m, pw * .95), sty = STY[Pn[2]], xm = CFX + (Xi + Xo - side * .05) / 2 * u;
    if(ON) for(let c = 0; c < m; c++){ const yc = CFY - (ht - (c + .5) * (ht - hb) / m) * u, g = gpick(Pn[2], word[c], cell - PX);
      if(g){ const a0 = cx.globalAlpha; cx.globalAlpha = a0 * (1 - FF * .5); gblit(g, xm, yc); cx.globalAlpha = a0; }
      else if(cell > PX * 2.5){ cx.fillStyle = L1(Pn[1]); pxRect(xm - Math.min(pw * .3, cell * .3), yc - cell * .14, Math.min(pw * .6, cell * .6), Math.max(PX, cell * .28)); } }
    else if(cell > PX * 2.5) for(let c = 0; c < m; c++){ const yc = CFY - (ht - (c + .5) * (ht - hb) / m) * u; cx.fillStyle = F('#141018'); pxRect(xm - cell * .25, yc - cell * .12, cell * .5, Math.max(PX, cell * .24)); }
    if(b.chase && ON && pw >= PX * 6){ // chasing bulbs down both edges of the arcade's blade (steady, every other bulb, under reduced motion)
      const step = Math.max(PX * 3, snp(ph / 22)), ph0 = reduce ? 0 : Math.floor(now / 110); cx.fillStyle = fc('#fff2b0', FF * .4);
      for(let yy = 0, k = 0; yy < ph; yy += step, k++) if((k + ph0) % 3 !== 0) for(const X of [Xi, Xo - side * .05]){ const xx = CFX + X * u; if(xx > -PX && xx < W + PX) pxRect(xx - PX / 2, CFY - ht * u + yy, PX, PX); } } }
  // the roof board, camera-facing over the building's middle: legs, a lit panel with a pale border, its word, a row of bulbs along the top
  function roofBoard(B, j, n, now){ const zc = B.b0 + Math.floor(B.len / 2); if(!(zc >= j && zc < j + n) || !CF(zc + .5)) return; const side = B.side, lx = laneDX(zc), Xa = side * (B.x0 + .15) + lx, Xb = side * (B.x0 + B.depth - .1) + lx, u = CFU, h0 = B.h + .18, h1 = B.h + .95, rb = B.rb, Pn = PAN[rb.p];
    if((h1 - h0) * u < PX * 2) { CR(Xa, Xb, h0, h1, L1(Pn[0])); return; }
    for(const X of [Xa + side * .2, Xb - side * .2]) CR(X - .03, X + .03, B.h, h0, F('#24202c'));
    CR(Xa, Xb, h0, h1, L1(mixc(Pn[0], '#ffffff', .4))); CR(Xa + side * .05, Xb - side * .05, h0 + .05, h1 - .05, L1(Pn[0]));
    const m = rb.word.length, w = Math.abs(Xb - Xa) * u * .9, cell = Math.min(w / m, (h1 - h0) * u * .8), xm = CFX + (Xa + Xb) / 2 * u, yc = CFY - (h0 + h1) / 2 * u, dir = side > 0 ? 1 : 1;
    if(ON) for(let c = 0; c < m; c++){ const g = gpick(Pn[2], rb.word[c], cell); const xc = xm + (c - (m - 1) / 2) * cell * dir; if(g) gblit(g, xc, yc); else if(cell > PX * 2){ cx.fillStyle = L1(Pn[1]); pxRect(xc - cell * .3, yc - cell * .15, cell * .6, Math.max(PX, cell * .3)); } }
    if(ON && (h1 - h0) * u > PX * 10){ cx.fillStyle = fc('#fff6c8', FF * .4); const st = Math.max(PX * 3, snp(w / 16)); for(let xx = CFX + Math.min(Xa, Xb) * u + st / 2; xx < CFX + Math.max(Xa, Xb) * u; xx += st) pxRect(xx, CFY - h1 * u - PX * 2, PX, PX); } }
  // the end wall facing the camera at the run's start: windows; on the stores, a big board above the shorter neighbour, or the LED ticker
  function endWall(B, x, y, uw, now){ if(AKX.includes('end')) return; const side = B.side, dx = side * B.depth * uw, xl = Math.min(x, x + dx), wd = Math.abs(dx), h1 = Math.min(B.h, y / Math.max(uw, .01) + .1); if(h1 <= 0 || wd < 1 || !fin(xl + wd)) return;
    if(xl > W + PX || xl + wd < -PX) return; const S = B.S;
    R(xl, y - uw * h1, wd, uw * h1, F(S[0])); R(side > 0 ? xl : xl + wd - Math.max(PX, wd * .05), y - uw * h1, Math.max(PX, wd * .05), uw * h1, F(S[2]));   // the wall; its corner catching the street light
    { const gh = uw * .56, gy = y - gh; R(xl, gy, wd, gh, F(ON ? mixc(B.ic, '#5a5a78', .45) : '#0c0a12')); R(xl, y - uw * G, wd, uw * (G - .56), L1(B.aw[0]));   // the shop seen from its side: a dimmer interior, the awning's end
      if(wd > PX * 6){ for(let q = 0; q < 3; q++){ const bx = xl + wd * (.12 + q * .28), bh = gh * (.25 + H1(B.sd * 3 + q) * .25); R(bx, y - bh, wd * .2, bh, F(ON ? ['#8a7a5a', '#5a6a8a', '#a08a6a'][q] : '#141018')); R(bx, y - bh, wd * .2, PX, F(ON ? '#e8e0d0' : '#1c1820')); }
        R(xl, gy, wd, PX, F(ON ? '#ffffff' : '#1c1a24')); } }   // boxes stacked inside, a tube along the top
    const fpx = FH * uw, ew = B.ew, exp = Math.max(G, B.ph + .2);
    let bd0 = 99, bd1 = 0; if(ew && B.h - exp > FH * 1.6){ bd0 = exp + .15; bd1 = Math.min(B.h - .2, bd0 + Math.min(4 * FH, B.h - exp - .35)); }
    if(fpx >= 3) for(let f = 0; f < B.nF; f++){ const fy = G + f * FH; if(fy > h1 || B.fl[f] === 'X') break; if(fy + FH > bd0 && fy < bd1) continue; const st = ON ? floorState(B, f, 99) : 0; if(!st && fpx < 7) continue;
      R(xl + wd * .2, y - uw * (fy + .48), wd * .6, uw * .3, F(st === 1 ? '#b4c2e0' : st === 2 ? '#dcb478' : st === 3 ? '#4a4a60' : '#141826')); if(wd > PX * 14) R(xl + wd * .5 - PX / 2, y - uw * (fy + .48), PX, uw * .3, F(S[0])); }
    if(bd1 > bd0 && bd1 <= h1 + 2){ const Pn = PAN[ew.p], yt = y - uw * bd1, hh = uw * (bd1 - bd0), x0 = xl + wd * .06, ww = wd * .88;   // the board: frame, lit panel, its word set top to bottom
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
  function buildPeople(){ PEOPLE.length = 0; for(let v = 0; v < PCOL.length; v++) for(let fr = 0; fr < 2; fr++){ const c = document.createElement('canvas'); c.width = 9; c.height = 24; const k = c.getContext('2d'), [d, m] = PCOL[v], set = (x, y, w, h, col) => { k.fillStyle = col; k.fillRect(x, y, w, h); };
      set(3, 0, 3, 2, v === 3 ? '#3a1a10' : '#141018'); set(3, 2, 3, 3, '#d8a888'); set(5, 2, 1, 3, '#b0806a'); set(3, 4, 3, 1, '#b0806a');   // hair, face (lit on one side)
      set(2, 5, 5, 9, d); set(2, 5, 1, 9, m); if(v === 0) set(4, 5, 1, 5, '#e8e8f0'); if(v === 0 || v === 5) set(4, 6, 1, 3, '#8a1a2a');   // the coat, its lit edge; a shirt and tie
      set(1, 6, 1, 7, d); set(7, 6, 1, 7, d); set(1, 12, 1, 1, '#d8a888'); set(7, 12, 1, 1, '#d8a888');
      if(v === 2 || v === 4){ set(7, 11, 2, 4, '#e8e0d0'); set(7, 11, 2, 1, '#ff3a3a'); }   // a shop bag
      const lg = fr ? [[3, 14, 1, 9], [5, 14, 1, 8]] : [[3, 14, 1, 8], [5, 14, 1, 9]]; for(const g of lg) set(g[0], g[1], g[2], g[3], '#16141c'); set(2, 23, 2, 1, '#0a0a0e'); set(5, 23, 2, 1, '#0a0a0e');
      PEOPLE.push(c); } }
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
    if(c >= 0){ s.akX = i - c; if(i === c + CW) for(const side of [-1, 1]){ const B = bAt(L, side, i) || bAt(L, side, i + 1); sp.push({ env:KEY, type:'xf', x:side * ((B ? B.x0 + B.depth : 3.8)), side, k:i }); } }
    if(L.BR >= 0 && i >= L.BR && i <= L.BR + BD) sp.push({ env:KEY, type:'br', x:0, k:i, L });
    for(const side of [-1, 1]){ const B = bAt(L, side, i); if(B) sp.push({ env:KEY, type:'b', x:side * B.x0, k:i, b:B }); }
    if(!inBr){ for(const side of [-1, 1]){ if(i % PSPAN === 14) sp.push({ env:KEY, type:'pole', x:side * 1.3, k:i, tr:H1(i * .7 + side) < .4 }); sp.push({ env:KEY, type:'w', x:side * 1.3, side, k:i, x0:side < 0 && ((i - 14) / PSPAN) % 2 === 0 }); } }
    if(i % 14 === 0 && !inBr) for(const side of [-1, 1]) sp.push({ env:KEY, type:'lamp', x:side * 1.16, k:i });
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
      if(B && on && fog < .45){ const X4 = side * (x0 - .32); poly4(a.x + a.w * X4, a.y, a.x + a.w * X3, a.y, b.x + b.w * X3, b.y, b.x + b.w * X4, b.y, f(B.gr === 'crane' ? '#6a3a5e' : B.gr === 'stall' ? '#5a4a36' : '#4a4e62')); } }   // the light spilling out over the sill
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

  // ---------------------------------------------------------------- overlay: the relight's flash (none under reduced motion)
  function overlay(al, now, sk){ if(!SPA.flash || reduce || (window.ASSIST && ASSIST.noFlash)) return; const a0 = cx.globalAlpha; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = al * SPA.flash * .3; cx.fillStyle = '#fff2c8'; cx.fillRect(0, 0, W, H);
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = a0; }

  // ---------------------------------------------------------------- draw dispatch
  function draw(sp, x, y, uw, fog, now, sk){ draw0(sp, x, y, uw, fog, now, sk); CAT = 'o'; }
  function draw0(sp, x, y, uw, fog, now, sk){ if(sk && sk.low) setLow(sk.low); const t = sp.type; CAT = t;
    if(t === 'b') return drawB(sp, x, y, uw, fog, now); if(t === 'w') return drawWire(sp, x, y, uw, fog, now); if(t === 'lamp') return drawLamp(sp, x, y, uw, fog, now); if(t === 'pole') return drawPole(sp, x, y, uw, fog, now);
    if(t === 'ped') return drawPed(sp, x, y, uw, fog, now); if(t === 'xf') return drawXF(sp, x, y, uw, fog, now); if(t === 'sig') return drawSig(sp, x, y, uw, fog, now); if(t === 'trk') return drawTruck(sp, x, y, uw, fog, now);
    if(t === 'br') return drawBridge(sp, x, y, uw, fog, now); }

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
    yield* buildTextG(); if(!FONT){ try{ if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16').then(() => { if(!FONT) buildText(); }, () => {}); }catch(e){} } yield;
    buildStrips(); yield; buildPeople(); yield;
    try{ if(typeof MUSIC !== 'undefined' && MUSIC.ROAD_THEME && !MUSIC.ROAD_THEME[KEY]) MUSIC.ROAD_THEME[KEY] = 'neon'; }catch(e){}
    try{ cx.save(); cx.globalAlpha = .004; for(const c of [ATL, TK, FAR, MID, MIDD].concat(PEOPLE)) if(c) cx.drawImage(c, 0, 0, 1, 1); cx.fillStyle = ditherPat('#235250', .25); cx.fillRect(0, 0, PX, PX); cx.restore(); }catch(e){ try{ cx.restore(); }catch(e2){} }
    cx.clearRect(0, 0, W, H); }

  ENV.akiba = { _mk:(ch, z) => { const q = mask(ch, z), b = box(q.m, q.n); let c = 0; for(const v of q.m) c += v; return [b, c, q.n]; }, _GA:GA, _used:USED, _atl:() => ATLY, _ga:() => { const o = {}; let A = 0; for(const st in GA) for(const ch in GA[st]) GA[st][ch].forEach((g, si) => { if(!g) return; const k = st + SZ[si]; o[k] = (o[k] || 0) + g.w * g.h; A += g.w * g.h; }); o.total = A; return o; }, _akc:AKC, _PJ:(z, x, h) => { cam(); PJ(z, x, h); return [PJX, PJY, PJU]; }, _lay:lay, _visit:visitOf, _spa:SPA, _onAt:onAt,
    kerbs:true, moonDX:.18, road:['#1e1c26', '#1c1a23'], lampCol:'#5a5a78',
    warm(){ for(const _ of warmSteps()); }, warmSteps, place, lit, draw, roadFX, backdrop, overlay, hingeIn:() => 'over' };
})();
