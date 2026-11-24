/* Sundown set piece: 渦潮 WHIRLPOOLS and lightning on the Shimanami Kaidō (MECH.sp_naruto, director id 'naruto', hero tier). See setpiece/README.md.
   Load after setpiece/lavabreach.js:   <script src="setpiece/naruto.js"></script>

   A storm comes over the strait as you reach the first suspension bridge. The clouds close over the moon, rain bands sweep across,
   windsocks on the parapet fill and the gusts push the bike (gently, telegraphed, always counterable). The sea below churns: whitecaps,
   swell lines bending round, then the whirlpools open beside and under the bridge. Waves burst over the rails and flood one side of the
   deck, then the other. Then THE strike: lightning into the eye of the giant whirlpool, slow motion, and the film cuts in (an anime
   insert over the sky) to a high view of the strait turning, the funnel lit teal, the bridge and its lamps across the back of the shot.
   Crests burst over both rails (the centre is open), a strike drops the wind-warning gantry's board across the left lanes, and the
   bridge ends and the storm lets you go.

   Why an insert. From the rider's camera (2.75 m over the deck) the sea is a sliver above the parapet: a giant whirlpool is a thin band
   on the horizon whatever its size (the deck and parapet cut every steeper view). The live sea is still rastered (the churn, the arms
   passing under the bridge), but the hero beat is the insert, framed and lit like an anime cut-in, while the ride goes on below it.

   The stage. B = the first Kurushima anchorage of a road cycle (env/shimanami.js: u = 165; the suspension spans run to u = 605, B+440).
   The event runs B-120 .. B+540, about 12 s at top speed. Everything is driven by the rider's segment (s = segments from B), never the clock.
     s -120  clouds roll in, the storm veil hides the moon and stars; rain; the sea's dissolve over the road's calm sea starts
     s -105  letterbox, duck, the director's guard (traffic and oil cleared to B+END); the card 渦潮 WHIRLPOOLS at -104
     s  -70  a far strike;  -40 gust 1 (pushes right), telegraphed from -110 by the windsocks, wind streaks and a whoosh
     s  -10  S1: a wave bursts over the left rail 130 ahead and floods the left lanes (the right is open)
     s  +22  a strike reveals V1 opening on the left; +40 gust 2 (pushes left); +70 S2 floods the right lanes 130 ahead (the left is open)
     s +140  the giant V3 opens beside and under the bridge (eye just off the left deck edge); +150 gust 3 (pushes right)
     s +232  THE strike into V3's eye: slow motion 0.5 held 1.2 s, the insert panel for 1.6 real seconds (wipe in, a locked-off shot, wipe out)
     s +262  S3: waves over both rails flood both outer lanes 130 ahead (the centre is open)
     s +300  a strike on the wind-warning gantry 132 ahead: the left leg buckles, the board drops onto the left lanes (down at +306,
             126 ahead); the beam rests on it, rising over the right lanes (open)
     s +326  gust 4 (pushes right); +350 a far strike; +404 a last strike on the sea; +440 off the bridge; +540 the end
   Fairness (kikubari): every lane hazard is on the road and readable 126+ segments ahead (>= 1.7 s at the boosted cap); each row leaves
   a lane and the spaces between; gusts push at most 0.32 half-road widths a second (a sixth of full steering, never more when boosted)
   and are telegraphed 70 segments ahead; the insert never covers the road; the recovery blink protects as always.
   Art. One water shader serves both views. The live sea is rastered per pixel at the canvas's own resolution into a scratch buffer
   made in warm(), perspective-correct per row and drawn per segment (the bridge, islets and props stand over it in depth order); the
   insert is rastered by a real camera ray. Indigo night water in a hue-shifted ramp; swell lines that bend round the whirlpools
   (Hiroshige's Awa Naruto no fūkei); log-spiral foam arms that fray into lace along the flow (the Naruto photos), with mild
   differential rotation; whitecaps that rise and break; in each eye a real funnel (rays that fall into the opening are marched to the
   far wall in stepped, dithered bands: teal-white at the far lip, darkening to a black throat, the arms wrapping down it as streaks),
   a rolled foam lip on the near side that hides the throat. The insert's frames are pre-rendered in warm() (a locked-off shot, ~24
   frames, ~3 MB at 1280x760) and cycled at runtime. Lightning lights the water by distance in hard
   steps, with glints, plus the clouds (a lit strip through a dithered falloff mask), the wet deck (a cool wash and the bolt's broken
   reflection) and the bike (a cool rim on the edges facing the strike). Spray is jets, not clouds; no outlines on water or spray.
   Reduced motion / ASSIST.noFlash: no shake, no flicker or re-strike (one soft, dimmer swell), the insert fades in four steps instead
   of wiping, slower water and rain.
   Tests: ?force=naruto; MECH.sp_naruto.hazards(), .hits(), .gust(), .report(), ._preview() (spray sheet), ._buf() (the live sea buffer). */
"use strict";
(() => {
  const DIR = MECH.director, ID = 'naruto', CARD = { kanji:'渦潮', name:'WHIRLPOOLS', sub:'the strait wakes · read the sea, take the gap', col:'#8ad8ff' };
  if(DIR) DIR.register(ID, { tier:'hero', roads:['shimanami'], card:CARD });
  const GZ = 432, CY = 1080, U0 = 165, PRE = 120, END = 540, BRL = 440, T_CARD = -104, PUSH = .32, DECKX = 1.62, RAILX = 1.12;
  const sm = v => { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };
  const snp = v => Math.round(v / PX) * PX;
  const pSeg = () => (position + PZ) / SEG;
  const H1 = n => hash(n);
  const calm = () => reduce || !!(window.ASSIST && ASSIST.noFlash);
  const can = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const HS = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const TAU = 6.283185307179586;
  let Tg = 0;
  const plans = [], S = {};

  // ---------------------------------------------------------------- palettes (hue-shifted: violet-indigo darks, steel-blue mids, cyan-white foam)
  const SEAP = ['#030309', '#070a18', '#0b1226', '#111c34', '#182845', '#213656', '#2d4a6a', '#3f6382', '#5f86a0', '#8fb2c6', '#c6dce6', '#f2f8fa'];
  const TEAL = ['#020709', '#04141a', '#082630', '#0f3c44', '#1a565a', '#2e7a76', '#56a69a'];   // 12..18: the funnel's glassy wall
  const BRG = ['#141a28', '#1b1e2a', '#262a36', '#6a7690', '#ffc070', '#2a3044', '#a8dcd0'];   // (25: the funnel's lit lip, teal-white)   // 19..24: the bridge in the insert panel (girder joint, road, outer deck, rail and dashes, sodium lamp, girder face)
  const PAL = SEAP.concat(TEAL, BRG), NP = PAL.length;
  const PF = new Uint32Array(17 * NP); let pfKey = '';
  function palette(){ if(FOG_COL === pfKey) return; pfKey = FOG_COL;
    for(let q = 0; q <= 16; q++) for(let i = 0; i < NP; i++){ const c = hx(q ? mixc(PAL[i], FOG_COL, q / 16 * .85) : PAL[i]); PF[q * NP + i] = (255 << 24 | c[2] << 16 | c[1] << 8 | c[0]) >>> 0; } }
  const SIN = new Float32Array(1024); for(let i = 0; i < 1024; i++) SIN[i] = Math.sin(i / 1024 * TAU);
  const SN = v => SIN[(v * 162.97466) & 1023];

  // ---------------------------------------------------------------- the plan
  function build(B){
    const p = { t0:undefined, B, off:false, done:false, on:false, cut:null, lastPs:null, hits:0, rumT:0, rainT:0, roarT:0, gmax:0, estT:-1,
      // whirlpools: X (half-road widths), Z (segment), R (radius, half-road widths), n arms, sp spin, open over the rider's o0..o1
      vs:[ { X:-7.5, Z:B + 205, R:4.6, n:3, sp:1, o0:B - 10, o1:B + 60 }, { X:7.6, Z:B + 252, R:5.2, n:3, sp:-1, o0:B + 70, o1:B + 150 },
        { X:4.9, Z:B + 340, R:3.2, n:2, sp:1, o0:B + 180, o1:B + 250 }, { X:-4.3, Z:B + 395, R:10.5, n:5, sp:-1, o0:B + 140, o1:B + 228 } ],
      // lane hazards: spray floods (sd: the rail they come over) and the fallen gantry; at = the rider's segment when it lands
      hz:[ { id:'S1', k:'spray', Z:B + 120, x0:-1.1, x1:-.15, sd:-1, at:B - 10 }, { id:'S2', k:'spray', Z:B + 200, x0:.15, x1:1.1, sd:1, at:B + 70 },
        { id:'S3a', k:'spray', Z:B + 392, x0:-1.1, x1:-.36, sd:-1, at:B + 262 }, { id:'S3b', k:'spray', Z:B + 392, x0:.36, x1:1.1, sd:1, at:B + 262 },
        { id:'G', k:'gantry', Z:B + GZ, x0:-1.1, x1:-.02, at:B + GZ - 126 } ],
      gusts:[ { a:B - 40, b:B - 4, d:1 }, { a:B + 40, b:B + 76, d:-1 }, { a:B + 150, b:B + 186, d:1 }, { a:B + 326, b:B + 362, d:1 } ],
      // st[3] is the hero strike (the insert panel's), st[2] the gantry's
      st:[ { at:B - 70, X:-16, Z:B + 270, k:'far' }, { at:B + 22, X:-7.3, Z:B + 205, k:'sea' }, { at:B + GZ - 132, X:-1.24, Z:B + GZ, k:'gantry' },
        { at:B + 232, X:-4.3, Z:B + 395, k:'sea', hero:true }, { at:B + 350, X:14, Z:B + 580, k:'far' }, { at:B + 404, X:5.6, Z:B + 490, k:'sea' } ] };
    p.hz.forEach(h => { h.hit = false; h.t = -1; }); p.st.forEach((q, i) => { q.t = -9; q.v = i % NBOLT; q.dir = H1(B + i * 3.1) < .5 ? -1 : 1; });
    p.gt = { st:0, t:-1, f:0, down:false };
    return p; }
  const zh = j => j * SEG / ROADW;   // a segment index as z in half-road widths

  // ---------------------------------------------------------------- placement
  function decide(i, s, L){ if(!L || L.key !== 'shimanami' || LANDS[s.land].key !== 'shimanami') return; const ls = typeof landStart === 'number' ? landStart : 0; if(i !== ls) return;
    const z = zoneOfSeg(i), a = z > 0 ? gates[2 * z - 1] : 0, border = gates[2 * z + 1] !== undefined ? gates[2 * z + 1] : 1e9;
    const forced = /(^|[?&,=])force=([^&]*)(naruto|all)/.test(location.search);
    const fits = B => { if(B - PRE < ls + (forced ? 10 : 30) || B + END > border - 20) return false; if(window.inForkWindow && inForkWindow(B - PRE, B + END)) return false;
      if(!forced) for(const g of gates) if(g > B + 80 && g < B + 470) return false; return true; };   // (checkpoint arches stay out of the hazard stretch; a forced test takes any)
    const Tn = DIR && DIR.target ? DIR.target(ID, i) : null;   /* demo mode: the fitting cycle whose moment (B + 232) is nearest the authored one */
    let pick = -1; for(let k = 0; k < (Tn != null ? 8 : 3); k++){ const B = a + k * CY + U0; if(fits(B)){ if(Tn == null){ pick = B; break; } if(pick < 0 || Math.abs(B + 232 - Tn) < Math.abs(pick + 232 - Tn)) pick = B; } }
    if(pick < 0) return;
    if(plans.some(p => Math.abs(p.B - pick) < 700)) return;
    if(DIR && !DIR.request(ID, { tier:'hero', seg:pick + 232 })) return;
    plans.push(build(pick)); if(plans.length > 4) plans.shift(); }
  function lay(p, i, s){ if(i < p.B - PRE - 10 || i > p.B + END) return; s.nrP = p; }

  // ---------------------------------------------------------------- the module state
  const active = ps => { for(const p of plans) if(!p.off && !p.done && ps > p.B - PRE - 40 && ps < p.B + END + 10 && segs[p.B] && segs[p.B].nrP === p) return p; return null; };
  let cur = null;
  // the storm's strength at the rider (0..1) and the sea's (the dissolve over the calm sea)
  const stormI = (p, ps) => { const s = ps - p.B; return sm((s + PRE) / 60) * (1 - sm((s - BRL - 30) / 70)); };
  const seaI = (p, ps) => { const s = ps - p.B; return sm((s + PRE + 10) / 80) * (1 - sm((s - END + 70) / 60)); };
  const openG = (p, v, ps) => sm((ps - v.o0) / (v.o1 - v.o0)) * (1 - sm((ps - p.B - END + 90) / 70));
  // the wind: the push now, and what the windsocks show (they fill 70 segments before each gust)
  function gustAt(p, ps){ let push = 0; for(const g of p.gusts){ if(ps < g.a || ps > g.b) continue; push = g.d * sm((ps - g.a) / 10) * (1 - sm((ps - g.b + 10) / 10)); } return push; }
  function sockAt(p, ps){ let best = 0, d = 1; for(const g of p.gusts){ const k = sm((ps - g.a + 70) / 40) * (1 - sm((ps - g.b) / 20)); if(k > best){ best = k; d = g.d; } } SOCK[0] = Math.min(1, Math.max(.25 * stormI(p, ps), best)); SOCK[1] = d; return SOCK; }
  const SOCK = [0, 1];
  // flash level of a strike (game seconds since it struck): two hard strokes and a decay; calm: one soft, dimmer swell
  function flashLv(q){ if(q.t < -1) return 0; return flashT(Tg - q.t, calm()); }
  function flashT(t, cal){ if(t < 0) return 0;
    if(cal) return t < .7 ? .45 * (t < .15 ? .7 : 1 - (t - .15) / .55) : 0;
    return t < .05 ? 1 : t < .1 ? .45 : t < .17 ? .9 : t < .28 ? .5 : t < .42 ? .25 : t < .55 ? .1 : 0; }

  // ---------------------------------------------------------------- the sea raster (rows from the projected road, pixels at canvas resolution)
  const RMAX = 1400, NS = 420;
  const RN = new Int16Array(RMAX), RXc = new Float32Array(RMAX), RWc = new Float32Array(RMAX), RZc = new Float32Array(RMAX), RLc = new Float32Array(RMAX), RRc = new Float32Array(RMAX), RCz = new Float32Array(RMAX);
  const RFq = new Uint8Array(RMAX), SG0 = new Int16Array(NS), SGN = new Int16Array(NS);
  let LC = null, LG = null, LI = null, LU = null, LWc = 0, LHc = 0, PCl = null, PEy = null, PRg = null;
  let rowF = -1, R0 = 0, R1 = -1, BASEI = 0, rasterOK = false, LIF = 0, LR0 = -1, LR1 = -1;
  function ensureBuf(cw, nr){ if(LC && LWc >= cw && LHc >= nr) return; LWc = Math.max(cw, LWc); LHc = Math.max(nr, LHc, 8); LC = can(LWc, LHc); LG = LC.getContext('2d', { willReadFrequently:true }); LI = LG.createImageData(LWc, LHc); LU = new Uint32Array(LI.data.buffer);
    PCl = new Int32Array(LWc); PEy = new Uint8Array(LWc); PRg = new Int32Array(LWc); }
  function rows(){ const base = segAt(position), ch = cx.canvas.height; BASEI = base.index; R0 = 1e9; R1 = -1; SGN.fill(0);
    const nR = Math.min(ch, RMAX); for(let r = 0; r < nR; r++) RN[r] = -1; let maxy = H;
    for(let n = 0; n < DRAW && n < NS; n++){ const s = segs[base.index + n]; if(!s) break; const a = s.p1.screen, b = s.p2.screen;
      if(s.p1.camera.z <= DEPTH || b.y >= a.y || b.y >= maxy) continue;
      const yb = Math.min(a.y, maxy); let r0 = Math.ceil(b.y / PX - .5), r1 = Math.ceil(yb / PX - .5) - 1; if(r0 < 0) r0 = 0; if(r1 >= nR) r1 = nR - 1;
      if(r1 >= r0){ const t1 = segs[s.index + 1], lw0 = s.smLw !== undefined ? s.smLw : DECKX, rw0 = s.smRw !== undefined ? s.smRw : DECKX, lw1 = t1 && t1.smLw !== undefined ? t1.smLw : lw0, rw1 = t1 && t1.smRw !== undefined ? t1.smRw : rw0;
        const fog = clamp(Math.pow(n / DRAW, 1.6), 0, 1), q = Math.round(fog * 16), dy = a.y - b.y;
        SG0[n] = r0; SGN[n] = r1 - r0 + 1;
        for(let r = r0; r <= r1; r++){ const t = (a.y - (r + .5) * PX) / dy, w = a.w + (b.w - a.w) * t, xc = a.x + (b.x - a.x) * t;
          RN[r] = n; RXc[r] = xc; RWc[r] = w; RZc[r] = zh(s.index + t); RLc[r] = xc - w * (lw0 + (lw1 - lw0) * t); RRc[r] = xc + w * (rw0 + (rw1 - rw0) * t); RFq[r] = q; RCz[r] = s.p1.camera.z + (s.p2.camera.z - s.p1.camera.z) * t; }
        if(r0 < R0) R0 = r0; if(r1 > R1) R1 = r1; }
      maxy = b.y; } }
  // per-frame vortex and light tables (no allocation)
  const VA = { X:new Float32Array(4), Z:new Float32Array(4), Re:new Float32Array(4), g:new Float32Array(4), n:new Float32Array(4), sp:new Float32Array(4), k:0 };
  const LA = { X:new Float32Array(8), Z:new Float32Array(8), f:new Float32Array(8), k:0 };
  const VL = new Int8Array(4);
  const E_EYE = .19, K_SP = .78, OM = .5;
  function frameTables(p, ps){ VA.k = 0; for(const v of p.vs){ const g = openG(p, v, ps); if(g < .01) continue; const k = VA.k++; VA.X[k] = v.X; VA.Z[k] = zh(v.Z); VA.Re[k] = v.R * (.3 + .7 * g); VA.g[k] = g; VA.n[k] = v.n; VA.sp[k] = v.sp; }
    LA.k = 0; for(const q of p.st){ const f = flashLv(q); if(f <= .01 || LA.k >= 8) continue; const k = LA.k++; LA.X[k] = q.X; LA.Z[k] = zh(q.Z); LA.f[k] = f * (q.k === 'far' ? .35 : 1); } }
  // ---- the shader shared by the live sea and the insert panel. (X, Z): the point where the ray meets the sea (half-road widths);
  // (hxd, hzd): the ray's horizontal direction (unit); kh: its descent per unit of horizontal travel (the funnel march).
  // aE/aC/aR: the pixel above's eye flag (0 none, 1 sea, 2 eye), swell cell and ring cell (for 1 px lines and lips).
  // Returns a palette index; writes SH.e, SH.c, SH.r for the pixel below.
  const SH = { e:1, c:-99999, r:-99999 };
  let SHT = 0, SHIt = 0, SHd = 0;
  function shade(X, Z, hxd, hzd, kh, bay, lines, aE, aC, aR){ const T = SHT;
    let ci = 3, foam = false, eye = false, vk = -1, rn = 9, dxv = 0, dzv = 0, cell = -99999, ring = -99999;
    for(let k = 0; k < VA.k; k++){ const dx = X - VA.X[k], Re = VA.Re[k]; if(dx > Re * 1.25 || dx < -Re * 1.25) continue; const dz = Z - VA.Z[k]; if(dz > Re * 1.25 || dz < -Re * 1.25) continue; const d2 = (dx * dx + dz * dz) / (Re * Re); if(d2 < rn){ rn = d2; vk = k; dxv = dx; dzv = dz; } }
    if(vk >= 0) rn = Math.sqrt(rn);
    if(vk >= 0 && rn < 1.25 && (rn < .8 || (1.25 - rn) / .45 > bay)){ const Re = VA.Re[vk], g = VA.g[vk], sp = VA.sp[vk], nA = VA.n[vk];
      if(rn < E_EYE){
        // the eye: march the ray down into the funnel to the far wall (or out to the far lip)
        // The wall drops steeply from the lip (a 0.55 power profile), so rays just inside the near lip fall into the throat and the far wall
        // faces you: light at the far lip, darkening in stepped bands to a black throat under the near lip. f is how far the ray travelled
        // across the opening before it met the wall (0 at the far lip .. 1 deep in the throat).
        const st = E_EYE * Re / 9, De = Re * E_EYE * 3.2 * (.5 + .5 * g); let hx2 = dxv, hz2 = dzv, f = 1;
        for(let it = 1; it <= 22; it++){ const D = it * st; hx2 = dxv + hxd * D; hz2 = dzv + hzd * D; const hr = Math.sqrt(hx2 * hx2 + hz2 * hz2) / Re, Df = hr < E_EYE ? De * Math.pow(1 - hr / E_EYE, .55) : 0; if(kh * D >= Df){ f = Math.min(1, kh * D / Math.min(De * .8, kh * 1.7 * E_EYE * Re)); break; } }   // (depth as a share of the deepest the view can see)
        eye = true; const th = Math.atan2(hz2, hx2), rot = th - sp * 2.4 * OM * T;
        // stepped bands, their edges ordered-dithered
        const bf = f * 7.5, bi = Math.floor(bf), fr = bf - bi, band = bi + (fr > .7 && bay < (fr - .7) / .3 ? 1 : 0);
        ci = [18, 17, 16, 15, 14, 13, 13, 12][Math.min(7, band)] || 12; if(f < .05) ci = 25;
        // the foam arms wrap over the lip and run down the wall as spiral streaks, thinning with depth; finer streaks between them
        const qa = nA * rot / TAU + sp * f * 1.6, ar = qa - Math.floor(qa), sw = HS(Math.floor(f * 10), Math.floor((((rot + f * 2 * sp) / TAU) % 1 + 1) % 1 * 22));
        if(f < .5 && ar < .22 * (1 - f / .5)) ci = f < .1 ? 9 : Math.min(18, ci + 2);
        else if(sw > .76 && ci >= 13 && ci <= 16) ci++; else if(sw < .12 && ci > 12 && ci <= 17) ci--;
        // the lips: where the ray meets the sea just inside the rim. On the near side the lip is a rolled band of foam that hides the throat
        // below it; on the far side a teal-white edge where the wall turns toward the light (a small eye keeps both dim: no white ring)
        { const side = dxv * hxd + dzv * hzd, big = Re * E_EYE > .9; if(rn > E_EYE * .84){ if(side < 0) ci = big ? (rn > E_EYE * .93 || bay < .5 ? 10 : 9) : 8; else if(rn > E_EYE * .9) ci = big ? 25 : 17; } }
        if(aE === 1) ci = Re * E_EYE > .9 ? 25 : 17;   // the far lip: teal-white where it faces the light (a small eye keeps it dim, no white ring)
      } else {
        const th = Math.atan2(dzv, dxv), om = OM * (.7 + .12 / (rn + .22)), ang = th - sp * om * T, qq = nA * ang / TAU + sp * K_SP * Math.log(rn), arm = qq - Math.floor(qq);
        const au = ((ang / TAU) % 1 + 1) % 1, sc = HS(Math.floor(rn * 22), Math.floor(au * 40)), sc2 = HS(Math.floor(rn * 64) + 7, Math.floor(au * 110));
        let aw = (.1 + .12 * sc + .14 * (1 - rn)) * g; if(rn > .85) aw *= (1.25 - rn) / .4;
        // each arm frays into streaks along the flow (the lace of the Naruto photos), and thin lace lines run between the arms
        const brk = aw * (.45 + .8 * sc2), lace = qq * 3 - Math.floor(qq * 3);
        if(arm < brk){ const e = arm / brk; ci = e < .35 ? 10 : e < .65 ? 9 : (bay > .5 ? 8 : 6); foam = true; }
        else if(lace < .06 * g && sc2 > .5 && rn > .25){ ci = sc > .5 ? 8 : 7; foam = true; }
        else { ci = arm < aw + .12 ? 6 : arm > .84 ? 2 : rn < .45 ? 3 : 4; ring = Math.floor(qq * 3); if(lines && ring !== aR && aR !== -99999 && ci < 6 && (ring & 1)) ci += 1; } } }
    else {
      // the storm sea: swell lines across the strait, whitecaps that rise and break
      const psi = Z * 1.6 + .45 * SN(X * .55 + T * .5) + .25 * SN(X * 1.7 - Z * .8 + T * 1.1), fl = psi - Math.floor(psi); cell = Math.floor(psi);
      ci = fl < .28 ? 4 : fl > .82 ? 2 : 3;
      if(lines && cell !== aC && aC !== -99999 && HS(cell, Math.floor(X * 2)) > .3) ci = 5;
      const zw = Math.floor(Z * 4), zf = Z * 4 - zw;
      if(zf > .3 && zf < .7){ const cxw = Math.floor(X * 1.3 + Z * .2), h = HS(cxw, zw);
        if(h < SHd){ const ph = ((T * .55 + h * 17) % 1), e = ph < .25 ? ph / .25 : 1 - (ph - .25) / .75, u = X * 1.3 + Z * .2 - cxw, L = (.08 + .34 * e * (h / SHd)) * SHIt, du = Math.abs(u - .5);
          if(du < L){ ci = du < L * .5 ? 10 : bay > .5 ? 8 : 7; foam = true; } } } }
    // lightning: light by distance in hard steps, glints on the smooth water
    if(LA.k){ let L = 0; for(let k = 0; k < LA.k; k++){ const ddx = X - LA.X[k], ddz = Z - LA.Z[k]; L += LA.f[k] / (1 + (ddx * ddx + ddz * ddz) * .035); }
      const lv = L > .62 ? 3 : L > .34 ? 2 : L > .14 ? 1 : 0;
      if(lv){ if(ci === 25) ci = 11; else if(ci >= 12) ci = Math.min(18, ci + lv + 1); else if(foam) ci = Math.min(11, ci + 1 + (lv > 1 ? 1 : 0)); else { ci = Math.min(8, ci + lv); if(HS(Math.floor(X * 7), Math.floor(Z * 15)) > .985 - lv * .006) ci = 11; } } }
    if(!eye && aE === 2) ci = 9;   // the near lip: water pouring over the edge, hiding the throat below it
    SH.e = eye ? 2 : 1; SH.c = cell; SH.r = ring; return ci; }
  function shaderFrame(p, ps){ palette(); frameTables(p, ps); const It = stormI(p, ps); SHT = (p.t0 === undefined ? 0 : Tg - p.t0) * (reduce ? .45 : 1); SHIt = It; SHd = .05 + .11 * It; }
  // the live sea, row by row under the projected road
  function raster(p, ps){ rasterOK = false; if(R1 < R0) return; const cw = cx.canvas.width, nr = R1 - R0 + 1; ensureBuf(cw, nr); shaderFrame(p, ps);
    const Is = seaI(p, ps), ip = 1 / PX, W2 = W / 2, fx = 1 / (DEPTH * W / 2);
    PEy.fill(0); PCl.fill(-99999); PRg.fill(-99999);
    const half = PNL.on && PNL.t > .1 && R0 === LR0 && R1 === LR1; LIF = (LIF + 1) & 1; LR0 = R0; LR1 = R1;   // (while the insert holds the eye, the live sliver refreshes alternate rows)
    for(let r = R0; r <= R1; r++){ const o = (r - R0) * LWc; if(half && ((r + LIF) & 1)) continue; if(RN[r] < 0){ LU.fill(0, o, o + LWc); PCl.fill(-99999); PEy.fill(0); PRg.fill(-99999); continue; }
      const Z = RZc[r], xc = RXc[r], iw = 1 / RWc[r], q = RFq[r] * NP, l0 = Math.min(cw, Math.max(0, Math.ceil(RLc[r] * ip - .5))), r0x = Math.max(l0, Math.min(cw, Math.ceil(RRc[r] * ip - .5)));
      const dz = r < R1 && RN[r + 1] >= 0 ? Math.abs(Z - RZc[r + 1]) : .05, lines = dz * 1.6 < .45, kray = CAMH / Math.max(1, RCz[r]);
      for(let px = 0; px < cw; px++){
        if(px >= l0 && px < r0x){ LU[o + px] = 0; PCl[px] = -99999; PEy[px] = 0; PRg[px] = -99999; continue; }
        const bay = (BAY4[(r & 3) * 4 + (px & 3)] + .5) / 16;
        if(Is < bay){ LU[o + px] = 0; PCl[px] = -99999; PEy[px] = 0; PRg[px] = -99999; continue; }
        const sx = ((px + .5) * PX - W2) * fx, il = 1 / Math.sqrt(1 + sx * sx);
        const ci = shade(((px + .5) * PX - xc) * iw, Z, sx * il, il, kray * il, bay, lines, PEy[px], PCl[px], PRg[px]);
        LU[o + px] = PF[q + ci]; PCl[px] = SH.c; PEy[px] = SH.e; PRg[px] = SH.r; }
      if(cw < LWc) LU.fill(0, o + cw, o + LWc); }
    LG.putImageData(LI, 0, 0, 0, 0, cw, nr); rasterOK = true; }

  // ---------------------------------------------------------------- the insert panel: the hero shot
  // The deck's camera is 2.75 m over the road: from there even a giant whirlpool is a sliver behind the parapet. So at the hero strike
  // the film cuts in (an anime insert, sliding in over the sky while the ride goes on below): a high drone view of the giant whirlpool
  // turning beside the bridge, the strike landing in its eye. Rastered with the same shader by a real camera ray (water, the funnel,
  // the deck, its girder face, lamps); the towers, cables and your lights are projected over it. The panel never covers the road.
  const PNL = { t:-1, on:false, fr:0, full:false, cam:new Float64Array(12) };
  let PCv = null, PG = null, PI = null, PU = null, PWc = 0, PHc = 0, PE2 = null, PC2 = null, PR2 = null;
  const PN_HOLD = 1.6, PN_IN = .22, PN_OUT = .25;   // (the hold was 2.3 s; shortened in W11 #28, the strike's dense frames all fall inside it)
  function panelRect(){ const x0 = Math.round(W * .06 / PX), x1 = Math.round(W * .94 / PX), y0 = Math.round(H * .115 / PX), y1 = Math.round(H * .445 / PX); return [x0, y0, x1, y1]; }
  function ensurePanel(){ const R = panelRect(), w = R[2] - R[0], h = R[3] - R[1]; if(PCv && PWc >= w && PHc >= h) return; PWc = Math.max(w, PWc); PHc = Math.max(h, PHc); PCv = can(PWc, PHc); PG = PCv.getContext('2d', { willReadFrequently:true }); PI = PG.createImageData(PWc, PHc); PU = new Uint32Array(PI.data.buffer); PE2 = new Uint8Array(PWc * PHc); PC2 = new Int32Array(PWc * PHc).fill(-99999); PR2 = new Int32Array(PWc * PHc).fill(-99999); }
  // the panel's camera: a drone up and back over the right of the bridge, looking at the giant's eye, pushing in over the hold
  // (from beyond the whirlpool, looking back across it at the bridge: the eye low in the frame, the deck and its lamps across the top)
  function panelCam(p, u){ const v = p.vs[3], ex = v.X, ez = zh(v.Z), k = 1, C = PNL.cam, az = -.42, pt = .46;   // (a locked-off shot: the panel is interlaced, so the camera holds still and only the water moves)
    const cxw = ex - Math.cos(az) * 29 * k, cyw = 17 * k, czw = ez + Math.sin(az) * 29 * k; let hx = ex - cxw, hz = ez - czw; const hl = Math.hypot(hx, hz); hx /= hl; hz /= hl;
    const fx = hx * Math.cos(pt), fy = -Math.sin(pt), fz = hz * Math.cos(pt);
    let rx = fz, rz = -fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;
    // right = up x forward (horizontal); up = forward x right
    const ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx;
    C[0] = cxw; C[1] = cyw; C[2] = czw; C[3] = fx; C[4] = fy; C[5] = fz; C[6] = rx; C[7] = 0; C[8] = rz; C[9] = ux; C[10] = uy; C[11] = uz; }
  const PTX = .7, DH = 7, GIR = .5;
  // a world point (half-road widths; y up from the sea) to panel canvas pixels; null behind the camera
  const PP = new Float64Array(3);
  function panelProj(X, Y, Z, w, h){ const C = PNL.cam, dx = X - C[0], dy = Y - C[1], dz = Z - C[2], f = dx * C[3] + dy * C[4] + dz * C[5]; if(f <= .1) return null; const r = dx * C[6] + dz * C[8], u = dx * C[9] + dy * C[10] + dz * C[11], ty = PTX * h / w;
    PP[0] = (r / f / PTX * .5 + .5) * w; PP[1] = (.5 - u / f / ty * .5) * h; PP[2] = f; return PP; }
  // pre: { T, f } for a pre-rendered frame (shader seconds, the hero strike's flash level): the tables are set here, not from the ride
  function panelRaster(p, ps, u, pre){ ensurePanel(); const R = panelRect(), w = R[2] - R[0], h = R[3] - R[1], C = PNL.cam, ty = PTX * h / w, B = p.B; panelCam(p, u);
    if(pre){ palette(); VA.k = 0; for(const v of p.vs){ const g = openG(p, v, ps); if(g < .01) continue; const k = VA.k++; VA.X[k] = v.X; VA.Z[k] = zh(v.Z); VA.Re[k] = v.R * (.3 + .7 * g); VA.g[k] = g; VA.n[k] = v.n; VA.sp[k] = v.sp; }
      const q = p.st[3]; LA.k = 0; if(pre.f > .01){ LA.X[0] = q.X; LA.Z[0] = zh(q.Z); LA.f[0] = pre.f; LA.k = 1; } SHT = pre.T; SHIt = 1; }
    else shaderFrame(p, ps);
    SHd = .012; const zA = zh(B - 30), zB = zh(B + BRL + 20);
    PNL.fr = (PNL.fr + 1) % 6; const full = !!pre || PNL.t < .05 || PNL.full;
    // (the fallback when the frames could not be pre-rendered at this screen size: a sixth of the rows each frame)
    for(let y = full ? 0 : PNL.fr; y < h; y += full ? 1 : 6){ const ny = (.5 - (y + .5) / h) * 2 * ty, o = y * PWc;
      for(let x = 0; x < w; x++){ const nx = ((x + .5) / w - .5) * 2 * PTX, dx = C[3] + C[6] * nx + C[9] * ny, dy = C[4] + C[10] * ny, dz = C[5] + C[8] * nx + C[11] * ny, bay = (BAY4[(y & 3) * 4 + (x & 3)] + .5) / 16;
        let ci = -1;
        if(dy < 0){
          // the bridge first: the deck plane, then the girder face toward us
          const td = (DH - C[1]) / dy, Xd = C[0] + dx * td, Zd = C[2] + dz * td;
          if(Xd > -DECKX && Xd < DECKX && Zd > zA && Zd < zB){ const ax = Math.abs(Xd), lamp = ax > 1.04 && ax < 1.16 && ((Zd * 2.5) % 1 + 1) % 1 < .18;
            ci = lamp ? 23 : ax > 1.06 && ax < 1.14 ? 22 : ax > 1.14 ? 21 : (Math.abs(ax - .36) < .035 && ((Zd * 1.2) % 1) < .5) ? 22 : 20; }
          else if(dx < 0){ const tf = (DECKX - C[0]) / dx, yf = C[1] + dy * tf, Zf = C[2] + dz * tf; if(tf > 0 && yf < DH && yf > DH - GIR && Zf > zA && Zf < zB) ci = yf > DH - .08 ? 22 : ((Zf * 1.25) % 1) < .08 ? 19 : 24; }
          if(ci < 0){ const tw = -C[1] / dy, Xw = C[0] + dx * tw, Zw = C[2] + dz * tw, hl = Math.hypot(dx, dz);
            // (the pixel above comes from the per-pixel flags, whichever frame last drew it: the panel is interlaced)
            const ia = y > 0 ? o - PWc + x : -1;
            ci = shade(Xw, Zw, dx / hl, dz / hl, -dy / hl, bay, true, ia >= 0 ? PE2[ia] : 0, ia >= 0 ? PC2[ia] : -99999, ia >= 0 ? PR2[ia] : -99999); PE2[o + x] = SH.e; PC2[o + x] = SH.c; PR2[o + x] = SH.r; }
          else { PE2[o + x] = 0; PC2[o + x] = -99999; PR2[o + x] = -99999; } }
        else ci = 1;
        PU[o + x] = PF[ci]; } }
    PG.putImageData(PI, 0, 0, 0, 0, w, h); }
  // Pre-rendered in warm(): the shot is locked off and the hold is 1.6 s, so its frames are made once. A dummy plan at B = 0 (the camera and
  // the bridge are relative to the giant's eye), the whirlpools as they stand at the strike, the water turning at the slow-motion pace;
  // dense frames through the strike's two strokes, then one every 0.14 s (7 a second, a hand-animation rate). Calm gets its own soft swell
  // frames for the first 0.7 s. ~24 frames of the panel's size: about 3 MB at 1280x760.
  const PNF = { w:0, h:0, norm:[], calm:[] };
  function prerenderPanel(){ ensurePanel(); const R = panelRect(), w = R[2] - R[0], h = R[3] - R[1], p0 = build(0), ps = 232;
    PNF.norm.length = 0; PNF.calm.length = 0; PNF.w = w; PNF.h = h;
    const TN = [0, .05, .1, .17, .28, .42]; for(let k = 0; k < 13; k++) TN.push(.56 + k * .14);
    const mk = (t, cal) => { panelRaster(p0, ps, 0, { T:t * .65, f:flashT(t, cal) }); const c = can(w, h); c.getContext('2d').drawImage(PCv, 0, 0, w, h, 0, 0, w, h); return { t, c }; };
    for(const t of TN) PNF.norm.push(mk(t, false));
    for(const t of [0, .15, .3, .45, .6]) PNF.calm.push(mk(t, true)); for(const f of PNF.norm) if(f.t >= .7) PNF.calm.push(f); }
  // the panel on screen: a slash wipe in from the right, a hold, a wipe out to the left; frame, towers, cables, your lights, the bolt
  function panelDraw(p, now){ if(!PNL.on) return; const ps = pSeg(), t = PNL.t, cal = calm(), R = panelRect(), w = R[2] - R[0], h = R[3] - R[1];
    if(t > PN_HOLD + PN_OUT){ PNL.on = false; return; }
    const u = clamp(t / PN_HOLD, 0, 1), FR = cal ? PNF.calm : PNF.norm; let img = null;
    if(PNF.w === w && PNF.h === h && FR.length){ let k = 0; while(k + 1 < FR.length && FR[k + 1].t <= t) k++; img = FR[k].c; panelCam(p, u); }
    else { panelRaster(p, ps, u); img = PCv; }
    const X0 = R[0] * PX, Y0 = R[1] * PX, WW = w * PX, HH = h * PX, sl = Math.round(HH * .22 / PX) * PX;
    // reveal: columns xa..xb of the panel (in panel px); calm: the whole panel, faded in four steps
    let xa = 0, xb = w, al = 1; if(cal){ al = t < .4 ? Math.ceil(t / .1) / 4 : t > PN_HOLD ? Math.max(0, 1 - Math.ceil((t - PN_HOLD) / .07) / 4) : 1; }
    else { if(t < PN_IN) xa = Math.round(w * (1 - sm(t / PN_IN))); if(t > PN_HOLD) xb = Math.round(w * (1 - sm((t - PN_HOLD) / PN_OUT))); }
    if(xb <= xa || al <= 0) return;
    cx.save(); cx.globalAlpha = al;
    // the panel's shape: a parallelogram (slanted sides), clipped
    const L = X0 + xa * PX, Rr = X0 + xb * PX, shape = (d) => { cx.beginPath(); cx.moveTo(L + sl + d, Y0 + d); cx.lineTo(Rr - d, Y0 + d); cx.lineTo(Rr - sl - d, Y0 + HH - d); cx.lineTo(L + d, Y0 + HH - d); cx.closePath(); };
    /* the frame (W11 #28, 2026-11-21): a 1-px rule round the picture read as a flat card laid on the world. Now a cut-in bezel, inside the
       same rect so the panel still never reaches the road: a black rule, a 2-px cream band, a black rule, then the picture; vermilion slash
       tabs on the band at the top-left and bottom-right corners; a 3-px drop shadow down-right lifts it off the scene. */
    shape(0); cx.fillStyle = '#05060a'; cx.save(); cx.translate(PX * 3, PX * 3); cx.globalAlpha = al * .8; cx.fill(); cx.restore();
    cx.fill(); shape(PX); cx.fillStyle = '#e8e2d0'; cx.fill();
    { const tl = Math.round((Rr - L) * .16 / PX) * PX, tb = PX * 2, k = sl / HH; cx.fillStyle = '#e8402a';   // the slash tabs, on the cream band
      cx.beginPath(); cx.moveTo(L + sl - k * PX, Y0 + PX); cx.lineTo(L + sl - k * PX + tl, Y0 + PX); cx.lineTo(L + sl - k * (PX + tb) + tl - PX * 3, Y0 + PX + tb); cx.lineTo(L + sl - k * (PX + tb), Y0 + PX + tb); cx.closePath(); cx.fill();
      cx.beginPath(); cx.moveTo(Rr - sl + k * PX, Y0 + HH - PX); cx.lineTo(Rr - sl + k * PX - tl, Y0 + HH - PX); cx.lineTo(Rr - sl + k * (PX + tb) - tl + PX * 3, Y0 + HH - PX - tb); cx.lineTo(Rr - sl + k * (PX + tb), Y0 + HH - PX - tb); cx.closePath(); cx.fill(); }
    shape(PX * 3); cx.fillStyle = '#05060a'; cx.fill();
    shape(PX * 4); cx.save(); cx.clip(); cx.imageSmoothingEnabled = false; cx.drawImage(img, 0, 0, w, h, X0, Y0, WW, HH);
    panelOver(p, ps, now, X0, Y0, w, h); cx.restore(); cx.restore(); }
  // over the panel's raster: the towers and main cables (projected), your bike's lights on the deck, the strike
  const PQ3 = [0, 0, 0], PQ4 = [0, 0, 0];
  function panelOver(p, ps, now, X0, Y0, w, h){ const pt = (X, Y, Z, o) => { const q = panelProj(X, Y, Z, w, h); if(!q) return null; o[0] = X0 + q[0] * PX; o[1] = Y0 + q[1] * PX; o[2] = q[2]; return o; };
    const B = p.B, TOW = [B + 20, B + 120, B + 170, B + 270, B + 320, B + 420], TH = DH + 11;
    // main cables: a catenary between each tower pair, both sides
    cx.fillStyle = '#8a9cc0';
    for(let k = 0; k + 1 < TOW.length; k += 2) for(const sd of [-1, 1]){ let ok = false;
      for(let j = 0; j <= 16; j++){ const z = TOW[k] + (TOW[k + 1] - TOW[k]) * j / 16, e = 2 * j / 16 - 1, y = DH + .4 + (TH - DH - .4) * e * e, a = pt(sd * 1.36, y, zh(z), PQ3); if(a && ok) pline(PQ4[0], PQ4[1], a[0], a[1]); ok = !!a; if(a){ PQ4[0] = a[0]; PQ4[1] = a[1]; } } }
    // towers: two legs and a top beam, white steel floodlit from below
    for(const tz of TOW){ const z = zh(tz); for(const sd of [-1, 1]){ const a = pt(sd * 1.36, DH - GIR, z, PQ3), b = a && pt(sd * 1.36, TH, z, PQ4); if(!a || !b) continue; const lw = Math.max(PX, Math.round(PX * 14 / a[2]) * PX), bx = Math.round(b[0] / PX) * PX;
        cx.fillStyle = '#0a1024'; cx.fillRect(bx - PX, b[1], lw + PX * 2, a[1] - b[1]); cx.fillStyle = '#9eb0d0'; cx.fillRect(bx, b[1], lw, a[1] - b[1]); cx.fillStyle = '#e2ecf8'; cx.fillRect(bx, b[1], PX, a[1] - b[1]); }
      const l = pt(-1.36, TH, z, PQ3), lx = l && l[0], ly = l && l[1], r = l && pt(1.36, TH, z, PQ4); if(l && r){ cx.fillStyle = '#5a6c94'; pline(lx, ly, r[0], r[1]); pline(lx, ly + PX, r[0], r[1] + PX); } }
    // your lights on the deck: the tail light, the headlight and its beam ahead
    { const zb = zh(ps), a = pt(playerX, DH + .05, zb, PQ3); if(a){ const ax = Math.round(a[0] / PX) * PX, ay = Math.round(a[1] / PX) * PX, f = pt(playerX, DH, zb + 1.6, PQ4);
        if(f){ cx.fillStyle = '#fff2c8'; cx.globalAlpha *= .6; pline(ax, ay, f[0], f[1]); cx.globalAlpha /= .6; } cx.fillStyle = '#ff3a3a'; cx.fillRect(ax, ay, PX, PX); } }
    // the strike: the bolt from the panel's top into the eye
    const q = p.st[3], f = flashLv(q); if(f > .01){ const v = p.vs[3], e = pt(v.X, 0, zh(v.Z), PQ3); if(e){ const ex = e[0], ey = e[1]; bolt(q, ex + q.dir * w * PX * .06, Y0 - PX * 4, ex, ey, f); } } }
  function seaBand(s){ if(!rasterOK) return; const n = s.index - BASEI; if(n < 0 || n >= NS || !SGN[n]) return; const r0 = SG0[n], k = SGN[n], cw = cx.canvas.width;
    cx.imageSmoothingEnabled = false; cx.globalAlpha = 1; cx.drawImage(LC, 0, r0 - R0, cw, k, 0, r0 * PX, cw * PX, k * PX); }

  // ---------------------------------------------------------------- sprites (warm): spray, ordered dither, no outline
  const DS = [8, 12, 16, 24, 32, 48, 64, 96, 128];
  const FOAMC = ['#24405c', '#4a6e8c', '#86a8c2', '#c4dae6', '#f0f8fa'];
  // a burst of green water over the rail, as jets, not a cloud: a band of whitewater at the foot; above it many thin jets of different
  // heights, densest low and breaking into droplets as they rise, their tips bending outward and falling; a shadowed side. f 0..3 (rise -> fall)
  function spraySpr(N, f){ const c = can(N, N), k = c.getContext('2d'), img = k.createImageData(N, N), d = img.data, FW = FOAMC.map(hx);
    let sd = 31 + N * 7 + f * 53; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const put = (x, y, ci) => { x = Math.round(x); y = Math.round(y); if(x < 0 || y < 0 || x >= N || y >= N) return; const o = (y * N + x) * 4; d[o] = FW[ci][0]; d[o + 1] = FW[ci][1]; d[o + 2] = FW[ci][2]; d[o + 3] = 255; };
    const rise = [.5, .85, 1, .9][f], fall = [0, .1, .35, .7][f], spread = [.16, .24, .32, .4][f];
    // the foot: whitewater, ragged on top
    for(let x = Math.floor(N * (.5 - spread - .08)); x < N * (.5 + spread + .08); x++){ const hgt = N * (.1 + .05 * R()); for(let y = 0; y < hgt; y++){ const bay = (BAY4[(y & 3) * 4 + (x & 3)] + .5) / 16; if(y > hgt - 3 && bay < .5) continue; put(x, N - 1 - y, y < 2 ? 2 : x > N * .55 ? 3 : 4); } }
    // the jets
    const nj = Math.max(5, Math.round(N * .35));
    for(let j = 0; j < nj; j++){ const u = (j + R() * .8) / nj, x0 = N * (.5 + (u - .5) * spread * 2), lean = (u - .5) * 1.4, top = N * rise * (.45 + .55 * R()) * (1 - Math.abs(u - .5) * .9), w = N >= 48 && R() < .4 ? 2 : 1;
      for(let y = 0; y < top; y++){ const v = y / top, bend = lean * v * v * N * .25, x = x0 + bend, keep = v < .55 ? 1 : 1 - (v - .55) / .45 * (1 - fall * .3);
        if(R() > keep + .15) continue; const ci = v > .8 ? 3 : u > .62 ? 3 : 4; for(let ww = 0; ww < w; ww++) put(x + ww, N - 1 - N * .08 - y, ci); }
      // the tip breaks into falling droplets
      const tx = x0 + lean * N * .25, ty = N - 1 - N * .08 - top; for(let q = 0; q < 3 + f * 2; q++) put(tx + (R() - .5) * N * .08 + lean * q * 2, ty + q * N * .04 * (fall + .2) + R() * 3, R() < .5 ? 4 : 2); }
    k.putImageData(img, 0, 0); return c; }
  // nearest built size drawn 1:1 (no stretched pixels); past the largest it fades
  function spr1(fam, x, yb, D, f, al){ if(D < PX * 3 || x < -D || x > W + D || yb < 0 || yb - D > H) return; const q = D / PX; let N = DS[0]; for(const n of DS) if(Math.abs(n - q) < Math.abs(N - q)) N = n;
    if(q > 170) al *= clamp(1 - (q - 170) / 80, 0, 1); if(al <= .02) return; const sp = S[fam + N + '_' + f]; if(!sp) return; cx.globalAlpha = al; blit(sp, x, yb, PX); cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- lightning bolts: paths built in warm, mapped to the strike each frame
  const NBOLT = 6, BPN = 48, BOLT = [];
  function boltPath(v){ let sd = 17 + v * 389; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, P = new Float32Array(BPN * 2), out = { main:P, br:[] };
    // midpoint displacement on the main stem (u along, o across, in units of the bolt's length)
    P[0] = 0; P[1] = 0; P[(BPN - 1) * 2] = 1; P[(BPN - 1) * 2 + 1] = 0;
    const md = (a, b, amp) => { if(b - a < 2) return; const m = (a + b) >> 1; P[m * 2] = (P[a * 2] + P[b * 2]) / 2; P[m * 2 + 1] = (P[a * 2 + 1] + P[b * 2 + 1]) / 2 + (R() - .5) * amp; md(a, m, amp * .55); md(m, b, amp * .55); };
    md(0, BPN - 1, .22); for(let i = 1; i < BPN - 1; i++) if(!P[i * 2]) P[i * 2] = i / (BPN - 1);
    for(let b = 0; b < 3; b++){ const i0 = 6 + Math.floor(R() * (BPN * .55)), n = 6 + Math.floor(R() * 8), Q = new Float32Array(n * 2), dir = R() < .5 ? -1 : 1; let u = P[i0 * 2], o = P[i0 * 2 + 1];
      for(let k = 0; k < n; k++){ Q[k * 2] = u; Q[k * 2 + 1] = o; u += .018 + R() * .02; o += dir * (.012 + R() * .03); } out.br.push(Q); }
    return out; }
  function pline(x0, y0, x1, y1){ x0 = Math.round(x0 / PX); y0 = Math.round(y0 / PX); x1 = Math.round(x1 / PX); y1 = Math.round(y1 / PX); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
    for(;;){ cx.fillRect(x0 * PX, y0 * PX, PX, PX); if((x0 === x1 && y0 === y1) || ++n > 600) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } }
  // a bolt from the cloud base (xt, yt) to the strike (xb, yb): a white core, a blue halo while it is brightest, thinner branches
  function bolt(q, xt, yt, xb, yb, f){ const B0 = BOLT[q.v]; if(!B0 || f <= .02) return; const dx = xb - xt, dy = yb - yt, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, P = B0.main;
    const at = (u, o, k) => { PT[0] = xt + dx * u + nx * o * L * k; PT[1] = yt + dy * u + ny * o * L * k; return PT; };
    const k = q.dir * .9, cal = calm();
    if(f > .4 && !cal){ cx.globalAlpha = .55 * f; cx.fillStyle = '#7f94ff'; for(let i = 0; i + 1 < BPN; i++){ at(P[i * 2], P[i * 2 + 1], k); const ax = PT[0], ay = PT[1]; at(P[i * 2 + 2], P[i * 2 + 3], k); pline(ax - PX, ay, PT[0] - PX, PT[1]); pline(ax + PX, ay, PT[0] + PX, PT[1]); } }
    cx.globalAlpha = Math.min(1, f * 1.4); cx.fillStyle = '#f6f9ff';
    for(let i = 0; i + 1 < BPN; i++){ at(P[i * 2], P[i * 2 + 1], k); const ax = PT[0], ay = PT[1]; at(P[i * 2 + 2], P[i * 2 + 3], k); pline(ax, ay, PT[0], PT[1]); }
    cx.fillStyle = '#b8c8ff'; cx.globalAlpha = Math.min(1, f * 1.1);
    for(const Q of B0.br){ for(let i = 0; i + 1 < Q.length / 2; i++){ at(Q[i * 2], Q[i * 2 + 1], k); const ax = PT[0], ay = PT[1]; at(Q[i * 2 + 2], Q[i * 2 + 3], k); pline(ax, ay, PT[0], PT[1]); } }
    cx.globalAlpha = 1; }
  const PT = new Float32Array(2);
  // the cloud base the bolts come from (screen y)
  const cloudBase = () => HZ - Math.max(PX * 30, HZ * .34);

  // ---------------------------------------------------------------- storm clouds (warm): a wrapping strip, dark and lightning-lit versions
  const CLW = 512; let CLH = 0;
  function clouds(lit){ const w = CLW, h = CLH, c = can(w, h), k = c.getContext('2d'), img = k.createImageData(w, h), d = img.data;
    const VN = (x, y, p, s) => { const X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), Xp = ((X % p) + p) % p, X1 = (((X + 1) % p) + p) % p;
      const a = HS(Xp + s, Y), b = HS(X1 + s, Y), c2 = HS(Xp + s, Y + 1), d2 = HS(X1 + s, Y + 1); return a + (b - a) * ux + (c2 - a) * uy + (a - b - c2 + d2) * ux * uy; };
    const D = new Float32Array(w * h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let v = 0, amp = .5, fr = 1 / 48, tot = 0; for(let o = 0; o < 5; o++){ v += VN(x * fr, y * fr * 1.7, Math.round(w * fr), o * 97) * amp; tot += amp; amp *= .5; fr *= 2; } v /= tot;
      const yy = y / h; D[y * w + x] = v + .55 - yy * .75 + .14 * Math.sin(x / w * TAU * 3 + y * .03); }
    const DK = ['#06070d', '#0b0e19', '#121827', '#1b2337', '#2a3550'].map(hx), LT = ['#1c2240', '#34406a', '#5c6c9c', '#98a8d4', '#e2e8ff'].map(hx);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const a = D[y * w + x], th = (BAY4[(y & 3) * 4 + (x & 3)] + .5) / 16, o = (y * w + x) * 4;
      if(a < .3 || (a < .38 && th > .5)){ // rain shafts hanging under the base
        if(!lit && y > h * .55 && HS(x >> 1, 5) > .82 && (x + (y >> 2)) % 3 === 0 && th < .4 * (1 - y / h)){ d[o] = 34; d[o + 1] = 42; d[o + 2] = 62; d[o + 3] = 255; } continue; }
      const below = y + 1 < h ? D[(y + 1) * w + x] : 0, rim = below < .3;
      let ci; if(lit) ci = rim ? 4 : a > .75 ? 1 : a > .58 ? 2 : 3; else ci = rim ? 4 : a > .72 ? 0 : a > .55 ? 1 : a > .42 ? 2 : 3;
      if(lit && a > .75 && th > .5) ci = 0;
      const C = lit ? LT[ci] : DK[ci]; d[o] = C[0]; d[o + 1] = C[1]; d[o + 2] = C[2]; d[o + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  function wrapDraw(img, off, x0, x1, y, al){ if(x1 <= x0 || al <= .01) return; const w = img.width * PX; cx.globalAlpha = al; let sx = (((x0 + off) % w) + w) % w, x = x0;
    while(x < x1){ const span = Math.min(x1 - x, w - sx); cx.drawImage(img, Math.round(sx / PX), 0, Math.max(1, Math.round(span / PX)), img.height, Math.round(x / PX) * PX, Math.round(y / PX) * PX, Math.max(PX, Math.round(span / PX) * PX), img.height * PX); x += span; sx = 0; }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- particles: droplets and sparks (world: z segments, x and h half-road widths), pooled
  const DP = []; for(let k = 0; k < 160; k++) DP.push({ on:false, z:0, x:0, h:0, vx:0, vh:0, vz:0, t:0, life:0, c:0 });
  let rs = 13; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  function drops(z, x, h, n, vx, vh, c){ for(let k = 0; k < n; k++){ let q = null; for(const d of DP) if(!d.on){ q = d; break; } if(!q) return;
      q.on = true; q.z = z + (rnd() - .5) * 3; q.x = x + (rnd() - .5) * .15; q.h = h; q.vx = vx * (.5 + rnd()); q.vh = vh * (.5 + rnd()); q.vz = (rnd() - .5) * 4; q.t = 0; q.life = .5 + rnd() * .6; q.c = c; } }
  function stepP(dt){ for(const q of DP){ if(!q.on) continue; q.t += dt; if(q.t > q.life){ q.on = false; continue; } q.z += q.vz * dt; q.x += q.vx * dt; q.h += q.vh * dt; q.vh -= (q.c ? 3.2 : 4.5) * dt; if(q.h < 0){ q.h = 0; q.vh *= -.25; q.vx *= .4; } } }

  // ---------------------------------------------------------------- sound (the core's synth helpers)
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function thunder(near, delay){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.09, 3600, .1 * near, t0); M.noise(.25, 1300, .08 * near, t0 + .02); M.noise(2.6, 70, .2 * (.4 + .6 * near), t0 + delay); M.noise(1.8, 160, .08, t0 + delay + .15); M.tone(38, 1.4, { type:'sine', v:.1 * near, at:t0 + delay }); }
  function whoosh(v){ if(!ac()) return; const t0 = M.ac.currentTime; for(let j = 0; j < 4; j++) M.noise(.7, 380 + j * 170, (.02 + j * .015) * v, t0 + j * .2); }
  function crash2(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.2, 300, .16 * v, t0); M.noise(.8, 1800, .07 * v, t0 + .05); M.noise(.5, 4200, .04 * v, t0 + .1); }
  function rain(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.3, 5200, .018 * v, t0); M.noise(1.3, 2600, .012 * v, t0 + .2); }
  function roar(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.6, 90, .1 * v, t0); M.noise(1.2, 220, .04 * v, t0 + .3); }
  function clang(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.4, 2400, .1 * v, t0); M.tone(240, .7, { type:'square', v:.03 * v, at:t0 }); M.tone(173, .9, { type:'square', v:.025 * v, at:t0 + .04 }); M.noise(1, 90, .14 * v, t0 + .02); }
  function zap(){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.12, 6000, .05, t0); M.tone(60, .25, { type:'sawtooth', v:.02, at:t0 }); }

  // ---------------------------------------------------------------- the module
  function showCard(){ if(!DIR || !DIR.cine) return; let card = CARD;
    if(MECH.cutin && MECH.cutin.show && MECH.cutin.has && MECH.cutin.has(ID)){ try{ if(MECH.cutin.show(ID) !== false && !MECH.cutin.skipped) card = null; }catch(e){} }
    if(card) DIR.cine({ letterbox:false, dur:2.2, card }); }
  const hzX = h => (h.x0 + h.x1) / 2, hzR = h => (h.x1 - h.x0) / 2;
  MECH.sp_naruto = {
    plans, CARD, _S:S, _preview:() => preview(),
    _buf(){ return LC ? LC.toDataURL('image/png') : ''; },
    _foam(){ return FTX[0] ? FTX[0].toDataURL('image/png') : ''; },   // (tests: the flood's foam atlas, level 0)
    _dbg(){ const o = []; for(let r = R0; r <= R1; r += 4) o.push([r, RN[r], Math.round(RLc[r]), Math.round(RRc[r]), +RZc[r].toFixed(1)]); return { R0, R1, ok:rasterOK, vk:VA.k, HZ, rows:o }; },
    // tests: lane hazards ahead { id, z, x (centre), r (so that r * .85 is the half-width), landed }
    hazards(ahead){ const ps = pSeg(), out = []; for(const p of plans){ if(p.off || p.done) continue; for(const h of p.hz){ if(h.Z < ps - 3 || h.Z > ps + (ahead || 140)) continue; out.push({ id:h.id, z:h.Z, x:hzX(h), r:hzR(h) / .85, landed:ps >= h.at }); } } return out; },
    hits(){ let n = 0; for(const p of plans) n += p.hits; return n; },
    gust(){ const p = cur; return p ? gustAt(p, pSeg()) : 0; },
    // how wet the deck is at the rider (0..1): it wets as the rain comes and stays wet to the end of the event (env/shimanami.js wetK -> roadmat)
    wet(){ const p = cur; if(!p) return 0; const s = pSeg() - p.B; return sm((s + PRE - 15) / 70) * (1 - sm((s - END + 50) / 60)); },
    wetFX(s, n, r0, r1, RV, wet, T){ const p = cur; if(!p) return; wetDeck(p, s, n, r0, r1, RV, wet, T); },
    report(){ return plans.map(p => ({ B:p.B, off:p.off, hits:p.hits, hit:p.hz.filter(h => h.hit).map(h => h.id), gmax:+p.gmax.toFixed(3) })); },
    dbg(B){ const p = build(B); for(let j = B - PRE - 10; j <= B + END && j < segs.length; j++) if(segs[j]) segs[j].nrP = p; plans.push(p); return p; },
    warm(){ for(const N of DS) for(let f = 0; f < 4; f++) S['sp' + N + '_' + f] = spraySpr(N, f);
      for(let v = 0; v < NBOLT; v++) BOLT[v] = boltPath(v);
      // rain streaks: three depths, seven slants (one drawImage per drop)
      for(let lay = 0; lay < 3; lay++) for(let b = 0; b < 7; b++){ const sl = b / 10 - .1, n = [3, 5, 9][lay], wd = Math.max(1, Math.ceil(n * Math.abs(sl)) + 1), c = can(wd, n), k = c.getContext('2d'); k.fillStyle = lay === 2 ? '#b4c4dc' : '#8496b4';
        for(let q = 0; q < n; q++) k.fillRect(sl >= 0 ? Math.round(q * sl) : wd - 1 + Math.round(q * sl), q, 1, 1); S['rn' + lay + '_' + b] = c; }
      const ch = cx.canvas.height, cw = cx.canvas.width; CLH = Math.max(40, Math.ceil(ch * .42)); S.cloudD = clouds(false); S.cloudL = clouds(true); for(let l = 0; l < 3; l++) S['cm' + l] = cloudMask(l); if(!CW2){ CW2 = can(MW, CLH); CG2 = CW2.getContext('2d'); }
      ensureBuf(cw, Math.ceil(ch * .75)); ensurePanel(); prerenderPanel(); buildFoam();
      if(!UB){ UB = can(UBW, UBW); UG = UB.getContext('2d'); UB2 = can(UBW, UBW); UG2 = UB2.getContext('2d'); UB3 = can(UBW, UBW); UG3 = UB3.getContext('2d'); }
      try{ cx.save(); for(const k in S) if(S[k] && S[k].width) cx.drawImage(S[k], 0, 0, 1, 1); cx.drawImage(LC, 0, 0, 1, 1); cx.drawImage(UB, 0, 0, 1, 1); for(const c of FTX) cx.drawImage(c, 0, 0, 1, 1); cx.restore(); cx.clearRect(0, 0, PX * 2, PX * 2); }catch(e){} },
    reset(){ for(const p of plans){ if(p.cut){ p.cut.end(); p.cut = null; } p.on = false; p.lastPs = null; p.hits = 0; p.estT = -1; for(const h of p.hz){ h.hit = false; h.t = -1; } for(const q of p.st) q.t = -9; p.gt = { st:0, t:-1, f:0, down:false }; } for(const q of DP) q.on = false; cur = null; PNL.on = false; },
    place(i, s, L){ if(i === 0){ for(const p of plans) if(p.cut) p.cut.end(); plans.length = 0; }
      for(const p of plans) if(!p.off) lay(p, i, s);
      decide(i, s, L); },
    hitCar(){ const p = cur; if(!p) return false; const d = pSeg() - p.B; return d > -PRE + 10 && d < END; },
    update(dt){ Tg += dt; stepP(dt); const ps = pSeg(), p = active(ps); cur = p; if(!p) return;
      const a = p.lastPs === null ? ps : p.lastPs, B = p.B, X = v => a < v && ps >= v, s = ps - B; p.lastPs = ps; const play = state === 'play'; if(p.t0 === undefined) p.t0 = Tg;
      if(!p.hzSwept && ps > B - PRE - 200){ p.hzSwept = true; for(let j = B - PRE; j <= B + END; j++) if(segs[j]) segs[j].hz = null; }
      if(play && !p.on && s >= -PRE + 15 && s < BRL){ p.on = true; if(DIR && DIR.cine) p.cut = DIR.cine({ letterbox:{ top:.1, bottom:.06 }, duck:.5, shake:0, guard:{ from:B - PRE + 10, to:B + END }, dur:0 }); }
      if(play && X(B + T_CARD)) showCard();
      const I = stormI(p, ps);
      // the wet deck's puddles flare with the lightning: roadmat's sky sheen (the lit cloud deck in the water) for its strokes, in hard steps
      { const R = MECH.roadmat && MECH.roadmat.RP && MECH.roadmat.RP.shimanami; if(R){ let fl = 0; for(const q of p.st){ const f = flashLv(q) * (q.k === 'far' ? .5 : 1); if(f > fl) fl = f; } R.sheen = .75 + (fl > .66 ? 1.1 : fl > .33 ? .6 : fl > .1 ? .25 : 0); } }
      // strikes
      for(const q of p.st){ if(!X(q.at)) continue; q.t = Tg; const dist = Math.max(0, q.Z - ps), near = clamp(1.2 - dist / 300, .25, 1); thunder(near, q.k === 'far' ? 1.2 : clamp(dist / 220, .05, .9));
        if(q.k === 'gantry'){ p.gt.st = 1; p.gt.t = Tg; zap(); drops(q.Z, q.X, 1.5, reduce ? 6 : 22, .6, 1.2, 1); }
        if(q.k === 'sea') drops(q.Z, q.X, .1, reduce ? 4 : 14, 0, 2.4, 0);
        if(q.hero){ if(DIR && DIR.cine) DIR.cine({ slowmo:{ scale:reduce ? .78 : .5, hold:1.2 }, shake:reduce ? 0 : 4, dur:2.4 }); PNL.on = true; PNL.t = 0; if(DIR && DIR.done) DIR.done(ID); roar(1.4); }
        else if(play && !reduce && q.k !== 'far') shake = Math.max(shake, 2.5 * near); }
      // the gantry: the struck leg buckles, the beam swings down onto the left lanes
      const G = p.gt; if(G.st >= 1){ G.f = clamp((ps - (B + GZ - 132)) / 6, 0, 1); if(G.f >= 1 && !G.down){ G.down = true; clang(1); const gz = B + GZ; drops(gz, -.8, .05, reduce ? 8 : 30, .9, 1.4, 1); if(play && !reduce) shake = Math.max(shake, 5); if(p.cut && !reduce) p.cut.hit(3); } }
      // spray floods
      for(const h of p.hz){ if(h.k !== 'spray') continue; if(X(h.at)){ h.t = Tg; crash2(.9); drops(h.Z, h.sd * RAILX, .4, reduce ? 8 : 26, -h.sd * 1.1, 2, 0); }
        if(h.t >= 0 && ps < h.Z + 4){ h.dt = (h.dt || 0) - dt; if(h.dt <= 0){ h.dt = reduce ? .5 : .22; drops(h.Z, h.sd * RAILX, .5, reduce ? 2 : 5, -h.sd * .9, 1.6, 0); } } }
      // the wind
      const gp = gustAt(p, ps); if(play && gp){ const v = PUSH * gp * Math.min(1, speed / MAXS); playerX += v * dt; p.gmax = Math.max(p.gmax, Math.abs(v)); }
      for(const g of p.gusts) if(X(g.a - 70)) whoosh(.8);
      // sound beds: rain and the roar of the strait
      p.rainT -= dt; if(I > .05 && p.rainT <= 0){ p.rainT = 1.1; rain(I); }
      p.roarT -= dt; if(p.roarT <= 0){ p.roarT = 1.4; let r = 0; for(const v of p.vs){ const g = openG(p, v, ps); if(g > 0) r = Math.max(r, g * clamp(1.3 - Math.abs(v.Z - ps) / 220, 0, 1)); } if(r > .05) roar(r * .8); }
      // the insert panel runs on real seconds (it holds through the slow motion)
      if(PNL.on) PNL.t += dt / ((window.TIME && TIME.scale) || 1);
      // the hit: a hazard where you are, as you pass it
      if(play && cool <= 0 && AIR.h < 6){ const bw = bikeHalf() - HIT_GRACE;
        for(const h of p.hz){ if(h.hit || ps < h.at) continue; const zr = h.k === 'spray' ? [h.Z - 2.5, h.Z + 3] : [h.Z - 1, h.Z + 1.5]; if(ps < zr[0] || ps > zr[1]) continue;
          if(Math.abs(playerX - hzX(h)) > hzR(h) + bw) continue; h.hit = true; p.hits++; crash({ x:hzX(h), z:h.Z * SEG }); } }
      if(s > END - 20 && p.cut){ p.cut.end(); p.cut = null; }
      if(s > END) p.done = true; },
    drawBackdrop(o){ const p = cur; if(!p) return; sky(p, o); },
    drawSegBack(s, sx0, sy0, uw, fog, now){ const p = cur; if(!p) return; const i = s.index; if(i < p.B - PRE - 40 || i > p.B + END + 40) return;
      if(DRAWN !== rowF){ rowF = DRAWN; rows(); raster(p, pSeg()); }
      if(s.nrP === p && !s.nrClean){ s.nrClean = 1; s.sprites = s.sprites.filter(sp => !(sp.env === 'shimanami' && sp.type === 'boat')); }
      seaBand(s); deckLight(p, s, fog); },
    drawSeg(s, sx0, sy0, uw, fog, now){ const p = cur; if(!p) return; const i = s.index, B = p.B, ps = pSeg(); if(i < B - PRE - 40 || i > B + END + 40) return;
      if(i >= B - PRE && i <= B + BRL && (i - B + 1000) % 40 === 20) socks(p, s, sx0, sy0, uw, fog, ps);
      for(const h of p.hz) if(h.k === 'spray' && h.t >= 0 && i >= h.Z - 4 && i <= h.Z + 4) flood(p, h, s, sx0, sy0, uw, fog, i);
      if(i === B + GZ) gantry(p, s, fog, now);
      for(const q of DP) if(q.on && Math.floor(q.z) === i) drop(s, q, fog);
      for(const q of p.st){ if(q.k === 'far' || Math.floor(q.Z) !== i) continue; const f = flashLv(q); if(f <= .01) continue; strikeAt(p, q, s, f); } },
    overlay(now){ const p = cur; if(!p) return; weather(p, now); panelDraw(p, now); },
    drawScreen(now){ const p = cur; if(!p) return; rimLight(p, now); } };

  // ---------------------------------------------------------------- the sky: clouds over the moon, lit from inside by the strikes; far bolts
  function sky(p, o){ const ps = pSeg(), I = stormI(p, ps); if(I <= .01 || !S.cloudD) return; const hz = o.hz, yb = cloudBase(), off = skyPar('far') * .6, y0 = yb - CLH * PX;
    const al = Math.round(I * 4) / 4; if(al <= 0) return;
    // the storm veil: the stars and the moon go; under the cloud base the rain haze thins toward the far islands in dither steps
    cx.globalAlpha = al * .88; cx.fillStyle = '#05060c'; cx.fillRect(0, 0, W, snp(yb)); cx.globalAlpha = al;
    const bh = snp((hz - yb) / 3); for(let k = 0; k < 3; k++){ cx.fillStyle = ditherPat('#090c16', [.75, .5, .25][k]); cx.fillRect(0, snp(yb) + k * bh, W, bh); } cx.globalAlpha = 1;
    wrapDraw(S.cloudD, off, 0, W, y0, al);
    // lit clouds round each strike: the lit strip through a dithered falloff mask (three hard levels), and far bolts to the horizon
    for(const q of p.st){ const f = flashLv(q); if(f <= .01) continue; const sx = strikeX(q); if(sx === null) continue; litClouds(sx, off, y0, f > .66 ? 0 : f > .33 ? 1 : 2, al);
      if(q.k === 'far') bolt(q, sx + q.dir * W * .03, yb - PX * 4, sx, hz + PX, f); }
    // sheet lightning: small patches flickering inside the deck between strikes (none when calm)
    if(!calm() && I > .5){ const id = Math.floor(Tg * 2.3), h = H1(id * 7.7 + p.B); if(h < .28){ const ph = Tg * 2.3 - id; if(ph < .12 || (ph > .2 && ph < .26)){ const x = W * (.1 + H1(id * 3.1) * .8); litClouds(x, off, y0, 2, .6); } } } }
  // the lit cloud strip around screen x, cut by a dithered falloff (lv 0 brightest .. 2 dimmest): no hard window edges
  const MW = 200; let CW2 = null, CG2 = null;
  function litClouds(x, off, y0, lv, al){ const m = S['cm' + lv]; if(!CW2 || !m) return; const wpx = CLW * PX, xs = snp(x - MW * PX / 2), src = Math.round(((((xs + off) % wpx) + wpx) % wpx) / PX);
    CG2.globalCompositeOperation = 'source-over'; CG2.clearRect(0, 0, MW, CLH); CG2.drawImage(S.cloudL, -src, 0); CG2.drawImage(S.cloudL, CLW - src, 0);
    CG2.globalCompositeOperation = 'destination-in'; CG2.drawImage(m, 0, 0); CG2.globalCompositeOperation = 'source-over';
    cx.globalAlpha = al; cx.imageSmoothingEnabled = false; cx.drawImage(CW2, 0, 0, MW, CLH, xs, snp(y0), MW * PX, CLH * PX); cx.globalAlpha = 1; }
  function cloudMask(lv){ const c = can(MW, CLH), k = c.getContext('2d'), img = k.createImageData(MW, CLH), d = img.data, L = [1, .62, .34][lv];
    for(let y = 0; y < CLH; y++) for(let x = 0; x < MW; x++){ const e = Math.pow(Math.max(0, 1 - Math.abs(x + .5 - MW / 2) / (MW / 2)), 1.4) * (.35 + .65 * y / CLH), th = (BAY4[(y & 3) * 4 + (x & 3)] + .5) / 16; if(th < e * L * 1.25) d[(y * MW + x) * 4 + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // a strike's screen x (its point on the sea or the gantry), or null when its segment is not projected
  function strikeX(q){ const s = segs[Math.floor(q.Z)]; if(!s || !s.p1.screen.scale || s.p1.camera.z <= DEPTH){ const base = segAt(position); return W / 2 + q.X / Math.max(4, q.Z - base.index) * W * 2; } const P = proj(s, q.Z - Math.floor(q.Z)); return P.x + q.X * P.w; }
  // a strike on the sea or the gantry: the bolt from the cloud base, a burst of white water (or sparks) where it lands
  function strikeAt(p, q, s, f){ const P = proj(s, q.Z - s.index); if(!(P.w > 0)) return; const x = P.x + q.X * P.w, y = P.y - (q.k === 'gantry' ? 1.55 : 0) * P.w; bolt(q, x + q.dir * W * .05, cloudBase() - PX * 3, x, y, f);
    if(q.k === 'sea'){ const t = Tg - q.t; spr1('sp', x, y + PX, P.w * 1.6 * (.6 + Math.min(1, t * 3)), Math.min(3, Math.floor(t * 6)), Math.min(1, f * 2)); }
    glow(x, y, Math.max(PX * 6, P.w * 1.2), '#9fb8ff', .5 * f); }

  // ---------------------------------------------------------------- per segment: the sea's light on the deck, the bolt's reflection on the wet road
  function deckLight(p, s, fog){ if(fog > .7) return; let L = 0, bx = -1, bf = 0; for(const q of p.st){ const f = flashLv(q); if(f <= .01) continue; L += f * (q.k === 'far' ? .3 : 1) / (1 + Math.pow((q.Z - s.index) / 90, 2)); if(f > bf && q.k !== 'far'){ bf = f; bx = q; } }
    const a = s.p1.screen, b = s.p2.screen; if(a.y - b.y < .2) return;
    const lv = L > .6 ? .1 : L > .3 ? .065 : L > .1 ? .035 : 0;
    if(lv){ cx.globalCompositeOperation = 'lighter'; const e = DECKX; poly(a.x - a.w * e, a.y, a.x + a.w * e, a.y, b.x + b.w * e, b.y, b.x - b.w * e, b.y, `rgba(150,172,255,${lv * (1 - fog)})`); cx.globalCompositeOperation = 'source-over'; }
    // the bolt's reflection: a broken cool column down the wet deck under it
    if(bx && bf > .3 && s.index < bx.Z && a.y - b.y >= PX * .5){ const xs = strikeX(bx); if(xs === null) return; const xl = a.x - a.w * DECKX, xr = a.x + a.w * DECKX; if(xs < xl || xs > xr) return;
      if(H1(s.index * 3.7 + Math.floor(Tg * 8)) < .35) return; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = bf * .6 * (1 - fog); cx.fillStyle = '#b8c8ff'; const ww = Math.max(PX, snp(a.w * .03));
      cx.fillRect(snp(xs - ww / 2), snp(b.y), ww, Math.max(PX, snp(a.y - b.y))); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; } }

  // ---------------------------------------------------------------- windsocks on the parapet: they fill and turn before each gust
  function socks(p, s, sx0, sy0, uw, fog, ps){ if(fog > .8 || uw < 6) return; const sk = sockAt(p, ps), w = sk[0], d = sk[1];
    for(const sd of [-1, 1]){ const x = sx0 + sd * 1.2 * uw, hp = .62 * uw, t = Math.max(PX, snp(uw * .018)), top = sy0 - hp;
      cx.globalAlpha = 1 - fog * .7; cx.fillStyle = fc2('#1a1e2a', fog); cx.fillRect(snp(x) - PX, snp(top), t + PX, snp(hp)); cx.fillStyle = fc2('#7a8498', fog); cx.fillRect(snp(x), snp(top), Math.max(PX, t - PX), snp(hp));
      // the sock: five bands, red and white, pointing downwind; it droops when the air is slack
      const L = .3 * uw, dr = (1 - w) * 1.1, ca = Math.cos(dr), sa = Math.sin(dr), th0 = Math.max(PX, uw * .05);
      for(let k = 0; k < 5; k++){ const u = (k + .5) / 5, wav = reduce ? 0 : Math.sin(Tg * 14 + k * 1.3 + sd) * uw * .006 * w, bx = x + d * ca * L * u, by = top + PX + sa * L * u + wav, th = th0 * (1 - u * .45) * (.6 + .4 * w);
        cx.fillStyle = fc2(k % 2 ? '#e8e4dc' : '#d8402c', fog); cx.fillRect(snp(bx - L / 10), snp(by - th / 2), Math.max(PX, snp(L / 5 + PX)), Math.max(PX, snp(th))); cx.fillStyle = fc2(k % 2 ? '#8a8a90' : '#7a1c18', fog); cx.fillRect(snp(bx - L / 10), snp(by + th / 2) - PX, Math.max(PX, snp(L / 5 + PX)), PX); }
      cx.globalAlpha = 1; } }
  let fcK = '', FCM = new Map();
  const fc2 = (c, f) => { if(FOG_COL !== fcK){ fcK = FOG_COL; FCM.clear(); } const q = Math.round(clamp(f, 0, 1) * 16), k = c + q; let v = FCM.get(k); if(!v){ v = mixc(c, FOG_COL, q / 16 * .8); FCM.set(k, v); } return v; };

  // ---------------------------------------------------------------- a flood over the rail: green water and foam lace across the lanes it covers
  /* (water pass, Kellan 2026-11-23: "the textures of the water on the road in the whirlpool level aren't the best") The sheet used to be a flat
     blue-grey polygon under a 50 % checker of foam (it read as a screen door) with foam rafts as rectangles. Now it is painted like the
     close Naruto photos and Hiroshige's foam: green-black water seen through a lace of foam (a cell network, stretched along the flow), each
     strand lit on its far edge and shadowed on its near one, submerged foam glowing under the surface beside it, a few glints; dense white
     water at the rail where the wave broke, lace in the middle, a rolled foam lip at the front with a thin sheet of water running ahead of it
     that holds the sky and the parapet lamps. Texture-mapped per pixel row at the row's true depth (one texel row per row, stretched across,
     as roadmat does), world-anchored along the road, flowing inward from the rail, with four boil frames so the lace churns instead of
     sliding like a belt; three pre-filtered levels so it never shimmers far away. All of it is built in warm(). */
  const FT_U = 56, FT_W = 192, FT_H = 96, FT_NF = 4, FT_ND = 3, FT_NL = 3;   // texels per half-road width across, per segment along
  let FT_V = 5.6;   // (FT_U * SEG / ROADW, set in buildFoam: the core's constants are declared after this script loads)
  const FTX = [];   // per level: one atlas canvas, [density 0 dense / 1 lace / 2 film][frame] tiles stacked down
  function buildFoam(){ if(FTX.length) return; FT_V = FT_U * SEG / ROADW; const W0 = FT_W, H0 = FT_H, NPX = 8, NPY = 8, cw = W0 / NPX, ch = H0 / NPY, TH = [9.5, 4.2, 2];
    const col = c => hx(c), WAT = [col('#12283a'), col('#163246'), col('#1b3b50'), col('#21455a')], SUBM = col('#305a70'), SUB2 = col('#284a62'), F_HI = col('#f2f8fa'), F_MD = col('#c6dce6'), F_LO = col('#8fb2c6'), F_SH = col('#56809c'), GLT = col('#bcd4ec');
    const L0 = can(W0, H0 * FT_ND * FT_NF), g0 = L0.getContext('2d'), id = g0.createImageData(W0, H0 * FT_ND * FT_NF), D = id.data, E = new Float32Array(W0 * H0);
    for(let f = 0; f < FT_NF; f++){ const ph = f / FT_NF * TAU, PXs = new Float32Array(NPX * NPY), PYs = new Float32Array(NPX * NPY);
      for(let gy = 0; gy < NPY; gy++) for(let gx = 0; gx < NPX; gx++){ const k = gy * NPX + gx, r = 3 + 3 * HS(gx, gy + 40), a0 = HS(gx + 9, gy) * TAU; PXs[k] = (gx + .2 + .6 * HS(gx, gy)) * cw + Math.cos(a0 + ph) * r; PYs[k] = (gy + .2 + .6 * HS(gy + 7, gx)) * ch + Math.sin(a0 + ph) * r * .6; }
      for(let y = 0; y < H0; y++) for(let x = 0; x < W0; x++){
        // a periodic domain warp (periods divide the tile), then Worley F1/F2 with the cells stretched along the flow (across the road)
        const wx = x + 5 * Math.sin(TAU * (y / H0 * 2 + x / W0)) + 2 * Math.sin(TAU * (x / W0 * 4 - y / H0 * 3) + ph), wy = y + 3 * Math.sin(TAU * (x / W0 * 3 + y / H0)) + 1.5 * Math.cos(TAU * (y / H0 * 4) - ph);
        const gx = Math.floor(wx / cw), gy = Math.floor(wy / ch); let f1 = 1e9, f2 = 1e9;
        for(let oy = -1; oy <= 1; oy++) for(let ox = -1; ox <= 1; ox++){ const cxg = ((gx + ox) % NPX + NPX) % NPX, cyg = ((gy + oy) % NPY + NPY) % NPY, k = cyg * NPX + cxg;
          const px = PXs[k] + (gx + ox - cxg) * cw, py = PYs[k] + (gy + oy - cyg) * ch, dx = wx - px, dy = (wy - py) * 2.6, d = Math.sqrt(dx * dx + dy * dy); if(d < f1){ f2 = f1; f1 = d; } else if(d < f2) f2 = d; }
        E[y * W0 + x] = f2 - f1; }
      for(let dn = 0; dn < FT_ND; dn++){ const th = TH[dn], oy = (dn * FT_NF + f) * H0;
        for(let y = 0; y < H0; y++) for(let x = 0; x < W0; x++){ const e = E[y * W0 + x], up = E[((y + H0 - 1) % H0) * W0 + x], dnn = E[((y + 1) % H0) * W0 + x], j = ((oy + y) * W0 + x) * 4;
          let c; const n = .5 + .3 * Math.sin(TAU * (x / W0 * 2 + y / H0)) + .2 * Math.sin(TAU * (y / H0 * 3 - x / W0 * 2));
          if(e < th){ const m = 1 - e / th; c = up >= th ? F_HI : dnn >= th ? F_SH : m > .5 ? F_MD : F_LO; if(dn === 2 && c === F_MD) c = F_LO; }
          else if(e < th + (dn === 0 ? 3 : 2.2)) c = (x + y) & 1 && dn < 2 ? SUBM : SUB2;   // submerged foam: a halo under the surface beside each strand
          else { c = WAT[Math.min(3, Math.floor(n * 4))]; if(HS(x * 7 + f, y * 13 + dn) < .006) c = GLT; }
          D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2]; D[j + 3] = 255; } } }
    g0.putImageData(id, 0, 0); FTX.push(L0);
    // pre-filtered levels: a 2 x 2 box each (opaque water, so plain averages)
    let src = id, sw = W0, sh = H0 * FT_ND * FT_NF;
    for(let l = 1; l < FT_NL; l++){ const nw = sw >> 1, nh = sh >> 1, c = can(nw, nh), g = c.getContext('2d'), o = g.createImageData(nw, nh), O = o.data, Sd = src.data;
      for(let y = 0; y < nh; y++) for(let x = 0; x < nw; x++) for(let q = 0; q < 3; q++){ const a = ((y * 2) * sw + x * 2) * 4 + q, b2 = a + sw * 4; O[(y * nw + x) * 4 + q] = (Sd[a] + Sd[a + 4] + Sd[b2] + Sd[b2 + 4]) >> 2; O[(y * nw + x) * 4 + 3] = 255; }
      g.putImageData(o, 0, 0); FTX.push(c); src = o; sw = nw; sh = nh; } }
  // one pixel row of the sheet: texels [u0, u0 + du) of tile (dn, fr) at level lv, row v, over screen [x0, x1) (wraps the tile across)
  function foamRow(lv, dn, fr, u0, du, v, x0, x1, y){ const C = FTX[lv]; if(!C || x1 - x0 < .5) return; const tw = FT_W >> lv, th = FT_H >> lv, sy = (dn * FT_NF + fr) * th + (((v >> lv) % th) + th) % th;
    let u = ((u0 / (1 << lv)) % tw + tw) % tw, left = du / (1 << lv), x = x0; const k = (x1 - x0) / left;
    for(let g = 0; g < 4 && left > .01; g++){ const n = Math.min(left, tw - u), xe = g === 3 ? x1 : x + n * k; cx.drawImage(C, u, sy, Math.max(.01, n), 1, Math.round(x / PX) * PX, y, Math.max(PX, Math.round(xe / PX) * PX - Math.round(x / PX) * PX), PX); x = xe; left -= n; u = 0; } }
  function flood(p, h, s, sx0, sy0, uw, fog, i){ const t = Tg - h.t, grow = sm(t / .35), a = s.p1.screen, b = s.p2.screen, sd = h.sd, T = Tg * (reduce ? .5 : 1);
    const xr = sd * 1.1, xi = sd > 0 ? h.x0 : h.x1, e0 = (i - (h.Z - 4)) / 8, taper = sm(Math.min(e0, 1 - e0) * 4);   // the sheet's ends taper along the road
    const wob = (k) => .05 * Math.sin(k * 1.7 + T * 5) + .03 * Math.sin(k * 4.1 - T * 7), xin0 = xr + (xi + wob(i) * -sd - xr) * grow * taper, xin1 = xr + (xi + wob(i + 1) * -sd - xr) * grow * taper;
    if(a.y - b.y >= .2 && Math.abs(xin0 - xr) > .02){
      const ax0 = a.x + a.w * xr, ax1 = a.x + a.w * xin0, bx0 = b.x + b.w * xr, bx1 = b.x + b.w * xin1;
      if(!FTX.length || !(a.scale > 0) || !(b.scale > 0)){ poly(ax0, a.y, ax1, a.y, bx1, b.y, bx0, b.y, fc2('#1d3c50', fog)); }
      else { const sa = a.scale, sb = b.scale, dy = a.y - b.y, r0 = Math.max(0, Math.ceil(b.y / PX - .5)), r1 = Math.ceil(Math.min(a.y, H) / PX - .5) - 1;
        const fr = (reduce ? Math.floor(T * 2) : Math.floor(T * 7.5)) % FT_NF, flow = T * (reduce ? 20 : 52), fresh = t < 1.4 ? 0 : 1;   // fresh: white water for its first 1.4 s (as it is first read, far ahead), then lace
        const cut = sd > 0 ? 1.1 - .3 : -1.1 + .3;   // the broken-wave band at the rail (dense), lace inside it
        for(let r = r0; r <= r1; r++){ const yc = (r + .5) * PX, f = (a.y - yc) / dy, sc = sa + (sb - sa) * f, tq = Math.min(1, Math.max(0, (sa / sc - 1) / (sa / sb - 1))), x = a.x + (b.x - a.x) * f, w = a.w + (b.w - a.w) * f; if(!(w > .5)) continue;
          const xin = xin0 + (xin1 - xin0) * tq, lo = Math.min(xr, xin), hi = Math.max(xr, xin); if(hi - lo < .01) continue;
          const du = FT_U / w, dv = FT_V * PX * sa * sb / (sc * sc * dy), lv = Math.min(FT_NL - 1, Math.max(0, Math.ceil(Math.log2(Math.max(du, dv, 1e-3)) - .3))), v = Math.floor((i + tq) * FT_V);
          const U = X => X * FT_U + sd * flow, sx = X => x + X * w;
          // the band at the rail (dense white water), then the lace to the front
          const cA = sd > 0 ? Math.max(lo, cut) : lo, cB = sd > 0 ? hi : Math.min(hi, cut);
          if(cB > cA) foamRow(lv, 0, fr, U(cA), (cB - cA) * FT_U, v, sx(cA), sx(cB), r * PX);
          const lA = sd > 0 ? lo : Math.max(lo, cut), lB = sd > 0 ? Math.min(hi, cut) : hi;
          if(lB > lA) foamRow(lv, fresh, fr, U(lA), (lB - lA) * FT_U, v, sx(lA), sx(lB), r * PX); }
        if(fog > .04){ cx.globalAlpha = Math.min(1, fog * .85); poly(ax0, a.y, ax1, a.y, bx1, b.y, bx0, b.y, FOG_COL); cx.globalAlpha = 1; } }
      // the front: a thin sheet of water running ahead of the foam (it holds the sky), the rolled foam lip, its shadow line
      const fa = Math.min(PX * 3, Math.max(PX, snp(a.w * .03))), fb = Math.min(PX * 3, Math.max(PX, snp(b.w * .03))), ra = a.w * .09 * grow, rb = b.w * .09 * grow;
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .22 * (1 - fog); poly(ax1, a.y, ax1 - sd * ra, a.y, bx1 - sd * rb, b.y, bx1, b.y, '#3a5a86'); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      poly(ax1 - sd * PX, a.y, ax1 - sd * (ra > PX * 2 ? PX * 2 : PX), a.y, bx1 - sd * (rb > PX * 2 ? PX * 2 : PX), b.y, bx1 - sd * PX, b.y, fc2('#0c1622', fog));
      poly(ax1, a.y, ax1 + sd * fa, a.y, bx1 + sd * fb, b.y, bx1, b.y, fc2('#c6dce6', fog));
      poly(ax1, a.y, ax1 + sd * Math.max(PX, fa - PX), a.y, bx1 + sd * Math.max(PX, fb - PX), b.y, bx1, b.y, fc2('#f2f8fa', fog));
      poly(ax1, a.y, ax1 - sd * PX, a.y, bx1 - sd * PX, b.y, bx1, b.y, fc2('#f2f8fa', fog)); }
    // spray columns at the rail, pulsing; the first burst is the tallest
    if((i - h.Z + 8) % 2 === 0){ const P = proj(s, .5); if(P.w > 0 && P.cz > 700){ const ph = ((T - h.t) * 1.15 + H1(i * 1.3)) % 1, first = clamp(1 - t / .9, 0, 1), hh = (.75 + .5 * H1(i * 2.1)) * (1 + first * 1.1) * (.55 + .45 * Math.sin(ph * Math.PI)) * taper;
        spr1('sp', P.x + sd * (RAILX + .08) * P.w, P.y - .1 * P.w, hh * P.w, Math.min(3, Math.floor(ph * 4)), (1 - fog * .7) * clamp(t * 4, 0, 1)); } } }

  // ---------------------------------------------------------------- the wet deck under the storm (roadmat's wetFX, per segment near by)
  /* Under the roadmat's wet layer (puddle sheets holding the lit sky, the lamps' and tail lights' columns, env/shimanami.js wetSrc), this
     adds what the rain does to standing water (the puddle photos at pixel zoom): rings that spread on the deep water as thin arcs, bright
     on the far side where they catch the sky and dim on the near side, flattened by the row's true depth (a ring R across is R x 10
     segments along, so its height comes from the segment's own rows); tiny crowns where a drop lands on the film; and in the gusts, spray
     torn off the deck running sideways downwind in 1-px streaks just over the surface (spindrift). World-anchored: each drop's place
     belongs to its segment and its cycle, so nothing crawls. Lightning whitens the rings for its strokes. Reduced motion: still rings, no
     spindrift. */
  function wetDeck(p, s, n, r0, r1, RV, wet, Tm){ if(n > 34 || r1 < r0) return; const a = s.p1.screen, b = s.p2.screen, uw = a.w; if(!(uw > 4)) return;
    const ps = pSeg(), I = stormI(p, ps) * Math.min(1, wet * 1.4); if(I < .05) return; const i = s.index, rows = r1 - r0 + 1, segH = (a.y - b.y) / PX, now = Tg;
    let fl = 0; for(const q of p.st){ const f = flashLv(q) * (q.k === 'far' ? .4 : 1); if(f > fl) fl = f; }
    const g = cx, a0 = g.globalAlpha; g.globalCompositeOperation = 'lighter';
    const rc = fl > .5 ? '#e8eeff' : '#9fb4dc', rn = n < 4 ? 6 : n < 10 ? 4 : n < 20 ? 2 : 1, N = Math.max(1, Math.round(rn * I));
    for(let q = 0; q < N; q++){ const per = .55 + .4 * H1(i * 3.1 + q * 1.7), ph = (reduce ? .5 : now / per) + H1(i * 7.13 + q * 3.7) * 9, cyc = Math.floor(ph), f = reduce ? .45 : ph - cyc;
      const X = (H1(i * 1.7 + q * 9.1 + cyc * .37) * 2 - 1) * 1.05, r = r0 + Math.floor(H1(i * 5.3 + q * 2.3 + cyc * .71) * rows), w = RV.w[r], x = RV.x[r] + X * w, y = r * PX; if(!(x === x) || !(w > 0)) continue;
      const m = RV.mask(Tm, X, RV.v[r]);
      if(f < .16){ if(n > 14) continue; g.globalAlpha = a0 * .5 * I; g.fillStyle = rc; const e = f < .07 ? 0 : PX, xx = snp(x); g.fillRect(xx, y - PX - e, PX, PX); if(e){ g.fillRect(xx - PX * 2, y - PX, PX, PX); g.fillRect(xx + PX * 2, y - PX, PX, PX); } continue; }
      if(m < .25) continue;
      // the ring: R half-road widths across at age t; on screen R * w wide and R * 10 segments of this segment's rows deep (true perspective)
      const t = (f - .16) / .84, R = .012 + .05 * t, rx = Math.max(PX * 1.5, R * w), ry = Math.max(PX * .5, R * 10 * segH * PX), al = a0 * (.6 * (1 - t) + .1) * I * (.5 + .5 * m);
      ring(x, y, rx, ry, al, rc); if(n < 8 && t < .55) ring(x, y, rx * .55, ry * .55, al * .7, rc); }
    // spindrift: in a gust (and as the socks fill before it), spray torn off the deck runs downwind in 1-px streaks just over the surface
    const sk = sockAt(p, ps), gp = Math.abs(gustAt(p, ps)), sp = Math.max(gp, sk[0] > .5 ? (sk[0] - .5) * 1.2 : 0);
    if(!reduce && sp > .05 && n < 26){ const d = sk[1], M = n < 6 ? 3 : n < 14 ? 2 : 1; g.fillStyle = '#b4c8e4';
      for(let k = 0; k < M; k++){ const h = H1(i * 4.7 + k * 2.9), spd = 1.6 + 1.4 * h, X = (((h * 2.6 + d * now * spd) % 2.6) + 2.6) % 2.6 - 1.3, r = r0 + Math.floor(H1(i * 9.7 + k) * rows), w = RV.w[r]; if(!(w > 0)) continue;
        const L = w * (.12 + .3 * H1(i + k * 7.7)) * (.5 + sp), x = RV.x[r] + X * w, lift = Math.max(0, snp(w * .012 * H1(i * 1.3 + k)));
        g.globalAlpha = a0 * .32 * sp * I; g.fillRect(snp(x - (d > 0 ? L : 0)), r * PX - lift, Math.max(PX, snp(L)), PX); g.globalAlpha = a0 * .55 * sp * I; g.fillRect(snp(x - (d > 0 ? PX * 2 : -PX)), r * PX - lift, PX * 2, PX); } }
    g.globalAlpha = a0; g.globalCompositeOperation = 'source-over'; }
  // a ring on the water: the far arc bright, the near arc dim, the ends a pixel each (pixel-stepped half-ellipses, no allocation)
  function ring(x, y, rx, ry, al, col){ const g = cx; g.fillStyle = col; const nseg = Math.min(14, Math.max(4, Math.round(rx / PX)));
    for(let h = 0; h < 2; h++){ g.globalAlpha = al * (h ? .45 : 1); const sg = h ? 1 : -1; let px0 = 1e9, py0 = 1e9;
      for(let k = 0; k <= nseg; k++){ const th = k / nseg * Math.PI, xx = snp(x - Math.cos(th) * rx), yy = snp(y + sg * Math.sin(th) * ry); if(xx === px0 && yy === py0) continue; px0 = xx; py0 = yy; g.fillRect(xx, yy, PX, PX); } } }

  // ---------------------------------------------------------------- the wind-warning gantry: standing, struck, fallen across the left lanes
  // Galvanised steel (light, so it reads on the dark deck), a truss beam, an LED board over the left lanes reading 強風 50 (amber).
  const GSTEEL = ['#0a0c12', '#3a4256', '#7a849a', '#b8c0d0', '#e4e8f0'];
  const LED = ['.##.#..####...###.', '#..##.##.....#...#', '#...#..###...#...#', '#..##.....#..#...#', '.##.#.####....###.'];
  function gq(x0, y0, x1, y1, x2, y2, x3, y3, c){ poly(x0, y0, x1, y1, x2, y2, x3, y3, c); }
  function gantry(p, s, fog, now){ const P = proj(s, .5); if(!(P.w > 0) || P.cz < 300) return; const pw = P.w, X0 = P.x, Y0 = P.y, G = p.gt, F = fog * .8, c = k => fc2(GSTEEL[k], F);
    const pt = (x, h) => { PT[0] = X0 + x * pw; PT[1] = Y0 - h * pw; return PT; }, lw = .045;
    const leg = (x, h0, h1, lean) => { const a = pt(x - lw, h0), ax = a[0], ay = a[1], b = pt(x + lw, h0), bx = b[0], by = b[1], c2 = pt(x + lw + lean, h1), cx2 = c2[0], cy2 = c2[1], d = pt(x - lw + lean, h1);
      gq(ax - PX, ay, bx + PX, by, cx2 + PX, cy2, d[0] - PX, d[1], c(0)); gq(ax, ay, bx, by, cx2, cy2, d[0], d[1], c(2)); gq(ax, ay, ax + Math.max(PX, (bx - ax) * .3), ay, d[0] + Math.max(PX, (bx - ax) * .3), d[1], d[0], d[1], c(3)); };
    const f = G.st ? G.f * G.f : 0;
    // the right leg always stands; the left one stands, or buckles at a knee and lies bent outward
    leg(1.24, 0, 1.5, 0);
    if(f <= 0) leg(-1.24, 0, 1.5, 0); else { leg(-1.24, 0, .52, -.04); const k1 = pt(-1.28, .52), kx = k1[0], ky = k1[1], k2 = pt(-1.28 - .5 * f, .52 + .55 * (1 - f) + .12), k2x = k2[0], k2y = k2[1]; gq(kx - PX, ky, kx + pw * .09, ky, k2x + pw * .09, k2y, k2x - PX, k2y, c(1)); gq(kx, ky, kx + pw * .05, ky, k2x + pw * .05, k2y, k2x, k2y, c(3)); }
    // the board: hung under the beam over the left lanes; struck, it drops onto the deck and stands there face to you, still lit in places
    const bx0 = lerp(-1.15, -1.05, f), bx1 = lerp(-.3, -.12, f), bh0 = lerp(.98, 0, f), bh1 = bh0 + .34;
    const A = pt(bx0, bh1), Ax = A[0], Ay = A[1], Bq = pt(bx1, bh1), Bx = Bq[0], By = Bq[1], Cq = pt(bx1, bh0), Cx = Cq[0], Cy = Cq[1], Dq = pt(bx0, bh0), Dx = Dq[0], Dy = Dq[1];
    gq(Ax - PX * 2, Ay - PX * 2, Bx + PX * 2, By - PX * 2, Cx + PX * 2, Cy + PX, Dx - PX * 2, Dy + PX, c(0)); gq(Ax - PX, Ay - PX, Bx + PX, By - PX, Cx + PX, Cy, Dx - PX, Dy, c(3)); gq(Ax - PX, Ay - PX, Bx + PX, By - PX, Bx + PX, By, Ax - PX, Ay, c(4));
    gq(Ax, Ay, Bx, By, Cx, Cy, Dx, Dy, fc2('#5a6478', F)); gq(Ax, Ay, Bx, By, Bx, By + PX, Ax, Ay + PX, fc2('#8a94a8', F));   // (a light grey face: it reads in greyscale)
    const dead = G.st >= 1, cal = calm();
    if(Bx - Ax > PX * 20){ const nc = LED[0].length, nrw = LED.length, sx = (Bx - Ax) / (nc + 2), sy = (Dy - Ay) / (nrw + 2), dw = Math.max(PX, snp(Math.min(sx, sy) * .6));
      for(let r = 0; r < nrw; r++) for(let k = 0; k < nc; k++){ if(LED[r][k] !== '#') continue; if(dead){ const hh = H1(r * 31 + k * 7 + (cal ? 0 : Math.floor(Tg * 6) * 3)); if(hh < .35) continue; } cx.fillStyle = fc2(dead && H1(r + k * 3) < .3 ? '#7a4a18' : '#ffb030', F * .6); cx.fillRect(snp(Ax + (k + 1) * sx), snp(Ay + (r + 1) * sy), dw, dw); } }
    else { cx.fillStyle = fc2('#ffb030', F); cx.fillRect(snp((Ax + Cx) / 2), snp((Ay + Cy) / 2), PX, PX); }
    // the beam: from the pivot on the right leg's top to its left end (on the leg, or resting on the fallen board)
    const L0 = [lerp(-1.3, -.9, f), lerp(1.47, bh1, f)], R0 = [1.24, 1.47], th = .08, nb = 10;
    for(let k = 0; k < nb; k++){ const u0 = k / nb, u1 = (k + 1) / nb, x0 = lerp(R0[0], L0[0], u0), h0 = lerp(R0[1], L0[1], u0), x1 = lerp(R0[0], L0[0], u1), h1 = lerp(R0[1], L0[1], u1);
      const a = pt(x0, h0 + th), ax = a[0], ay = a[1], b = pt(x1, h1 + th), bx = b[0], by = b[1], c2 = pt(x1, h1), cx2 = c2[0], cy2 = c2[1], d = pt(x0, h0), dx = d[0], dy = d[1];
      gq(ax, ay - PX, bx, by - PX, cx2, cy2 + PX, dx, dy + PX, c(0)); gq(ax, ay, bx, by, cx2, cy2, dx, dy, c(2)); gq(ax, ay, bx, by, bx, by + PX, ax, ay + PX, c(4));
      if(pw > 160){ cx.fillStyle = c(1); pline(k % 2 ? ax : dx, k % 2 ? ay + PX : dy, k % 2 ? cx2 : bx, k % 2 ? cy2 : by + PX); } }
    // sparks: at the broken knee while it falls and for a while after; an arc and a glow where the board hit the deck
    if(dead && fog < .6){ const t = Tg - G.t; if(t < 2.5 && !reduce){ const k1 = pt(-1.28, .52), kx = k1[0], ky = k1[1]; for(let j = 0; j < 4; j++){ const ph = (Tg * 3 + j * .27) % 1; cx.fillStyle = j % 2 ? '#ffe2a0' : '#ffffff'; cx.fillRect(snp(kx + (H1(j + Math.floor(Tg * 3)) - .5) * pw * .2), snp(ky + ph * pw * .5), PX, PX); } }
      if(G.down){ const e = pt(bx1, .02); glow(e[0], e[1], Math.max(PX * 5, pw * .3), '#ff9a3a', .4 * (1 - fog)); const e2 = pt(bx0, .02); glow(e2[0], e2[1], Math.max(PX * 4, pw * .2), '#ff9a3a', .3 * (1 - fog)); } } }

  // ---------------------------------------------------------------- droplets and sparks
  function drop(s, q, fog){ const P = proj(s, q.z - s.index); if(!(P.w > 0) || P.cz < 300) return; const sz = Math.max(PX, snp(P.w * .012)); cx.globalAlpha = 1 - fog * .7;
    cx.fillStyle = q.c ? (q.t < .25 ? '#fff6d8' : '#ffb050') : (q.t < .3 ? '#f0f8fa' : '#9ab8d0'); cx.fillRect(snp(P.x + q.x * P.w), snp(P.y - q.h * P.w), sz, q.c ? sz : sz * 2); cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- screen space: rain bands, the gust streaks
  function weather(p, now){ const ps = pSeg(), I = stormI(p, ps); if(I <= .02) return; const T = Tg * (reduce ? .5 : 1), sk = sockAt(p, ps), gp = gustAt(p, ps), slant = .22 + .3 * sk[0] * sk[1], slB = clamp(Math.round((slant + .1) * 10), 0, 6), n = Math.round((reduce ? 80 : 160) * I); cx.imageSmoothingEnabled = false;
    for(let j = 0; j < n; j++){ const lay = j % 3, sp = [.9, 1.4, 2.1][lay], len = [3, 5, 9][lay] * PX, h = H1(j * 1.37), x0 = h * (W + H * .6) - H * .3, y = ((H1(j * 2.91) + T * sp) % 1) * (H + len) - len;
      const x = x0 + y * slant, band = .5 + .5 * Math.sin(x * .006 - T * 1.3 + lay); if(band < .35 * (1.2 - I)) continue; if(PNL.on && y > H * .11 && y < H * .44 && x > W * .07 && x < W * .93) continue;
      cx.globalAlpha = [.35, .5, .7][lay] * I; const sp2 = S['rn' + lay + '_' + slB]; if(sp2) cx.drawImage(sp2, snp(x) - (slB < 1 ? sp2.width - 1 : 0) * PX, snp(y), sp2.width * PX, sp2.height * PX); }
    // wind streaks across the screen ahead of and during a gust, from the side it blows from
    const tele = sk[0] > .45 ? (sk[0] - .45) / .55 : 0; if(tele > 0){ const d = sk[1], m = Math.round((reduce ? 6 : 16) * tele);
      for(let j = 0; j < m; j++){ const ph = (T * (1.1 + H1(j) * .6) + H1(j * 3.3)) % 1, y = H * (.12 + H1(j * 7.1) * .55), L = W * (.06 + H1(j * 2.2) * .1), x = d > 0 ? -L + ph * (W + L * 2) : W + L - ph * (W + L * 2);
        cx.globalAlpha = .35 * tele * Math.sin(ph * Math.PI); cx.fillStyle = '#c8d4e8'; cx.fillRect(snp(x - L / 2), snp(y), snp(L), PX); } }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- the bike lit by the lightning: a cool rim on the edges facing the strike and on top
  const UBW = 192; let UB = null, UG = null, UB2 = null, UG2 = null, UB3 = null, UG3 = null;
  function rimLight(p, now){ if(!UB || BIKE.hidden || !ENV.bikes || !ENV.bikes.render || !ENV.bikes._cur) return; let f = 0, sx = W / 2; for(const q of p.st){ const v = flashLv(q) * (q.k === 'far' ? .4 : 1); if(v > f){ f = v; const x = strikeX(q); if(x !== null) sx = x; } } if(f <= .05) return;
    const bs = Math.min(W * .2, H * .27), kk = Math.max(PX, Math.round(bs / 30 / PX) * PX), bx = W / 2, by = H - 8 - AIR.h, id = BIKE.id || 'sport', half = UBW * PX / 2, ox = snp(bx - half), oy = snp(by - UBW * PX + 4 * PX);
    UG.setTransform(1, 0, 0, 1, 0, 0); UG.clearRect(0, 0, UBW, UBW); UG.setTransform(1 / PX, 0, 0, 1 / PX, -ox / PX, -oy / PX); UG.imageSmoothingEnabled = false;
    UG.save(); UG.beginPath(); UG.rect(ox, oy, UBW * PX, by - oy - PX * 2); UG.clip();   // (the renderer's soft ground shadow lies below the wheels: clipped off, no read-back)
    try{ ENV.bikes.render(UG, id, bx, by, kk, leanV, now, null, ENV.bikes._cur()); }catch(e){ UG.restore(); return; }
    UG.restore(); UG.setTransform(1, 0, 0, 1, 0, 0);
    const sg = sx < W / 2 ? -1 : 1;
    // top edge (nothing above), and the edge toward the strike (nothing on that side)
    for(const [C, G2, dx, dy] of [[UB2, UG2, 0, 1], [UB3, UG3, -sg, 0]]){ G2.globalCompositeOperation = 'source-over'; G2.clearRect(0, 0, UBW, UBW); G2.drawImage(UB, 0, 0); G2.globalCompositeOperation = 'destination-out'; G2.drawImage(UB, dx, dy); G2.globalCompositeOperation = 'source-in'; G2.fillStyle = '#d8e6ff'; G2.fillRect(0, 0, UBW, UBW); G2.globalCompositeOperation = 'source-over'; }
    UG.globalCompositeOperation = 'source-in'; UG.fillStyle = '#3a4a80'; UG.fillRect(0, 0, UBW, UBW); UG.globalCompositeOperation = 'source-over';
    const st = f > .66 ? 1 : f > .33 ? .66 : .33; cx.save(); cx.imageSmoothingEnabled = false; cx.globalCompositeOperation = 'lighter';
    cx.globalAlpha = .4 * st; cx.drawImage(UB, 0, 0, UBW, UBW, ox, oy, UBW * PX, UBW * PX);
    cx.globalAlpha = .9 * st; cx.drawImage(UB2, 0, 0, UBW, UBW, ox, oy, UBW * PX, UBW * PX); cx.drawImage(UB3, 0, 0, UBW, UBW, ox, oy, UBW * PX, UBW * PX); cx.restore(); }

  // ---------------------------------------------------------------- projection of a point inside a segment
  const PJ = { x:0, y:0, w:0, cz:0 };
  function proj(s, f){ const a = s.p1, b = s.p2; PJ.x = a.screen.x + (b.screen.x - a.screen.x) * f; PJ.y = a.screen.y + (b.screen.y - a.screen.y) * f; PJ.w = a.screen.w + (b.screen.w - a.screen.w) * f; PJ.cz = a.camera.z + (b.camera.z - a.camera.z) * f; return PJ; }

  // ---------------------------------------------------------------- tests: a contact sheet of the crest and spray sprites
  function preview(){ cx.fillStyle = '#0b1226'; cx.fillRect(0, 0, W, H); let x = 20, y = 20;
    for(const fam of ['sp']) for(let f = 0; f < 4; f++){ x = 20; for(const N of [24, 48, 96, 128]){ const sp = S[fam + N + '_' + f]; if(!sp) continue; blit(sp, x + N * PX * .5, y + N * PX * .5 + 60, PX * .5); x += N * PX * .5 + 12; } y += 70; }
    return cx.canvas.toDataURL('image/png'); }
})();
