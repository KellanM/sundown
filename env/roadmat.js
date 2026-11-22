/* env/roadmat.js: the shared road-material library (MECH.roadmat). Research: research/sundown-craft/roadmat.md. Lab: roadlab.html.

   The core draws every road's asphalt as flat bands (drawRoad). This plugin lays a material over that band, one pixel row at a time:
   aggregate grain, tyre-polished wheel tracks, tar seams, patches, slab joints, stones, snow ruts, ash, sand; a wet layer (puddles that
   mirror the sky, a sheen under the moon, streaked reflections of the lamps and tail lights); and painted markings (止まれ, speed numerals,
   the crossing-ahead diamond, deceleration bars, crossings).

   How it is drawn.
   - Where: in the sprite pass's per-segment hook (drawSegBack). It runs far to near, before that segment's props and cars, clipped to the
     road in front, so the material lies on the road surface (over the core's lane dashes and each env file's own surface, under every prop,
     car and the bike). The core needs no other hook.
   - Texture mapping (Lou's Pseudo 3d Page: "make the Z for each line correspond to a row number on a texture graphic ... stretch the
     texture to fit the width of that line"): each pixel row of the road samples one texel row of a pre-built strip, at the row's true
     depth (1/z is linear in screen y inside a segment, so the row's place in its segment is perspective-correct), stretched across the
     road with nearest-neighbour scaling. The texel rows belong to the world (segment index + fraction), so detail never crawls: it rides
     toward you with the road.
   - The strip: 512 texels across the road and 12 per segment, 64 segments long, in 8 sub-blocks of 8 segments. The world picks a hashed
     sub-block for every 8 segments, so the strip never repeats as a pattern; features (patches, puddles, joints, stones) are confined to
     their sub-block, so the shuffle has no visible seams.
   - Level of detail: a chain of pre-filtered levels, each half as wide and a quarter as long (512x768, 256x192, 128x48, 64x12, 32x3), since
     a row's depth compression grows with the square of distance while its width shrinks linearly. Each row takes the level at which one
     texel covers at least ~one pixel both ways, so nothing is ever minified by nearest sampling (no shimmer); the material fades out by
     the last level, leaving the flat fogged band far away. Near: grain; middle: wheel-track bands and sparse marks; far: flat.
   - Blending: the strip is source-over RGBA: dark detail is black at an alpha (it darkens the band in proportion, so lamp pools and the
     stripe banding show through, as albedo does), light detail is the material's pale colour at an alpha. Coefficient blends only, so the
     GPU batches the rows; nothing is allocated per frame.
   - Wet layer: puddles are dark in the strip and carry a mask; a per-road copy of the mask tinted with the sky colour is added ('lighter')
     with a Fresnel ramp (strong toward the horizon, faint underfoot). The moon lays a broken glitter column; each lamp (where the road's
     lit() peaks) and each car's tail lights lay a streak: centred on the light's mirror image (as far below its base as the light stands
     above it, so far lights compress), broken row by row by the world-anchored wet mask, so the reflection shimmers as puddles pass under it.
   - Warm-up: the strips are generated in warmSteps() (each step a few ms), so no canvas is made mid-ride.

   Presets: built-in defaults below, overridden by env/roadmat-presets.json (written by roadlab.html's "Save to game"). ?roadmat=0 turns the
   material off; ?roadlab=1 listens for the lab's postMessage commands (same origin only). */
(function(){
'use strict';
const QR = new URLSearchParams(location.search), LAB = QR.has('roadlab');
const TW = 512, SPS = 12, SUB = 8, NSUB = 8, BLK = SPS * SUB, TH = BLK * NSUB, NL = 5;
const LW = [], LH = []; for(let k = 0; k < NL; k++){ LW.push(TW >> k); LH.push(TH >> (2 * k)); }
const DW = 128, NDL = 3;   // decal strips: one lane wide (2/3 of a half-road) at 128 texels; 3 levels
const LANES = [-2 / 3, 0, 2 / 3], KEYS = ['harbour', 'bay', 'neon', 'tunnels', 'pass', 'refinery', 'coast', 'snow', 'paddies', 'aqua', 'shimanami', 'sakurajima', 'haneda', 'minato', 'shuto', 'kurobe', 'akiba', 'gion'];
const MATS = ['none', 'asphalt', 'wet', 'concrete', 'cobble', 'snow', 'ash', 'sand'];

// ---------------------------------------------------------------- parameters
// field parameters shape the strip (shared by every road on that material; changing one rebuilds the strip); 'lite' is the colour of the
// light detail (aggregate, seams, snow, ash, sand). Render parameters are per road.
const FIELD = {
  asphalt:{ lite:'#9a98aa', grain:.55, tracks:.5, seams:.5, patches:.35, cracks:.35, puddles:0, edge:.5 },
  wet:{ lite:'#a6aac4', grain:.35, tracks:.7, seams:.45, patches:.25, cracks:.2, puddles:.55, edge:.5 },
  concrete:{ lite:'#c8c4ba', grain:.4, tracks:.45, seams:.7, joint:8, plates:.5, patches:.2, cracks:.35, puddles:.15, edge:.4 },
  cobble:{ lite:'#b4aca2', grain:.5, joints:.6, stone:.5, tracks:.3, puddles:.15 },
  snow:{ lite:'#e8eef8', grain:.5, ruts:.75, slush:.5, ice:.3, edge:.6 },
  ash:{ lite:'#bcb2a6', grain:.45, dust:.6, tracks:.6, drift:.5 },
  sand:{ lite:'#dcc496', grain:.4, drift:.6, ripples:.5, tracks:.5, side:-1 } };
// lab slider schema: [min, max, step]
const SCHEMA = {
  field:{ grain:[0, 1, .01], tracks:[0, 1, .01], seams:[0, 1, .01], patches:[0, 1, .01], cracks:[0, 1, .01], puddles:[0, 1, .01], edge:[0, 1, .01],
    joint:[2, 8, 2], plates:[0, 1, .01], joints:[0, 1, .01], stone:[0, 1, .01], ruts:[0, 1, .01], slush:[0, 1, .01], ice:[0, 1, .01],
    dust:[0, 1, .01], drift:[0, 1, .01], ripples:[0, 1, .01], side:[-1, 1, 2] },
  render:{ str:[0, 1.6, .01], wet:[0, 1, .01], sheen:[0, 1, .01], refl:[0, 1, .01], lampX:[.3, 1.2, .01], lampH:[.2, 2, .01], wear:[0, 1, .01], paint:[0, 1, .01] } };
const R0 = { mat:'asphalt', str:1, wet:0, sheen:.5, refl:.6, lamps:false, tails:false, lampX:.8, lampH:.9, sheenCol:'', reflCol:'#ffb45c', road:null, lampCol:null,
  marks:'none', speed:50, wear:.45, paint:.62, tunnel:false, pools:0, hot:0, sheenN:0 };   // hot: pools painted as the references' columns (hotPool); sheenN: the sky sheen's floor near by (0: the Fresnel ramp alone)   // pools: how far out (half-road widths) an env's own light pools may lie (ENV[key].wetSrc; 0 = none)   // (paint at night is a step under the lane dashes: the road is the stage)
// per road. Roads that already draw their own reflections (Neon's signs and lamps, Bay's lamps and tails, Aqua, Haneda, Harbour, Shuto's
// wet visits) keep them: lamps / tails here are only for roads without.
const ROADS = {
  harbour:{ mat:'asphalt', str:.9, wet:.3, sheen:.35, marks:'expressway', speed:60 },
  bay:{ mat:'concrete', str:.9, wet:1, sheen:.55, road:['#1a1e30', '#1c2134'], marks:'expressway', speed:60 },
  neon:{ mat:'wet', str:1, wet:1, sheen:.6, refl:.7, tails:true, sheenCol:'#7a3a8a', marks:'city', speed:40 },
  tunnels:{ mat:'asphalt', str:.85, marks:'rural', speed:60 },
  pass:{ mat:'asphalt', str:1.05, marks:'rural', speed:40 },
  refinery:{ mat:'asphalt', str:1, wet:.35, sheen:.4, sheenCol:'#8a5a3a', marks:'none' },
  coast:{ mat:'sand', str:1, marks:'rural', speed:50 },
  snow:{ mat:'snow', str:1, wet:.25, sheen:.35, road:['#2e3444', '#303647'], marks:'none' },
  paddies:{ mat:'asphalt', str:.95, marks:'rural', speed:40 },
  aqua:{ mat:'concrete', str:.85, wet:.45, sheen:.45, road:['#191c26', '#1b1e29'], marks:'expressway', speed:80 },
  shimanami:{ mat:'asphalt', str:.9, marks:'rural', speed:70 },
  sakurajima:{ mat:'ash', str:1, marks:'rural', speed:40 },
  haneda:{ mat:'concrete', str:.85, wet:.2, sheen:.35, road:['#1e2132', '#202435'], marks:'expressway', speed:60 },
  minato:{ mat:'asphalt', str:.9, marks:'city', speed:50 },
  shuto:{ mat:'wet', str:.95, wet:1, sheen:.5, refl:.6, tails:true, sheenCol:'#6a4a5a', marks:'expressway', speed:50 },
  kurobe:{ mat:'asphalt', str:.95, marks:'none' },
  akiba:{ mat:'wet', str:.9, wet:1, sheen:.8, refl:1, lamps:false, tails:true, sheenCol:'#3a66c4', marks:'none', pools:2.4, hot:1, sheenN:.55 },   // (the downpour: its signs' own pools come from ENV.akiba.wetSrc)
  gion:{ mat:'cobble', str:.7, marks:'none' } };
const FIELD_D = JSON.parse(JSON.stringify(FIELD)), ROADS_D = JSON.parse(JSON.stringify(ROADS));
const RP = {};   // resolved render presets per road (R0 + ROADS + saved), with derived strings
function resolve(key){ const p = Object.assign({}, R0, ROADS[key] || {}); RP[key] = p; return p; }
KEYS.forEach(resolve);

const RM = MECH.roadmat = { on:QR.get('roadmat') !== '0', ready:false, FIELD, ROADS, FIELD_D, ROADS_D, SCHEMA, MATS, KEYS, RP,
  stats:{ ms:0, rows:0, frames:0, peak:0 }, warm, warmSteps, drawSegBack };
Object.defineProperty(RM, '_tex', { get:() => TEX }); Object.defineProperty(RM, '_rows', { get:() => ({ n:RN, x:ROWX, w:ROWW, l:ROWL, p:ROWP, f:ROWF, s:ROWN }) });   // (the lab and the test harness read the strips)

// ---------------------------------------------------------------- hashing and small helpers
function ih(x, y, s){ let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const SUBP = blk => ((blk * 3 + ((ih(blk, 7, 3) * 5) | 0)) % NSUB + NSUB) % NSUB;   // the sub-block the world uses for its 8-segment block
const vmap = P => { const i = Math.floor(P), blk = Math.floor(i / SUB); return (SUBP(blk) * SUB + (i - blk * SUB) + (P - i)) * SPS; };   // world segment position -> L0 texel row

// per-column masks: X runs -1 .. 1 across the road (texel centres)
const XC = new Float32Array(TW), TM = new Float32Array(TW), LCM = new Float32Array(TW), EM = new Float32Array(TW);
for(let x = 0; x < TW; x++){ const X = XC[x] = (x + .5) / (TW / 2) - 1; let t = 0, l = 0;
  for(const c of LANES){ for(const o of [-.19, .19]){ const d = Math.abs(X - c - o); if(d < .085) t = Math.max(t, .5 + .5 * Math.cos(d / .085 * Math.PI)); }
    const d = Math.abs(X - c); if(d < .05) l = Math.max(l, .5 + .5 * Math.cos(d / .05 * Math.PI)); }
  TM[x] = t; LCM[x] = l; EM[x] = ss(.86, .99, Math.abs(X)); }
const tx = X => Math.round((X + 1) * TW / 2 - .5);
// a soft low-frequency field (cells 32 x 24 texels), confined to its sub-block so the world's shuffle of sub-blocks leaves no seam in it
function lf(x, y, sb, sd){ const yl = y - sb * BLK, gx = x / 32, gy = yl / 24, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), k = sb * 131 + sd * 7;
  const a = ih(x0, y0, k), b = ih(x0 + 1, y0, k), c = ih(x0, y0 + 1, k), d = ih(x0 + 1, y0 + 1, k); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }

// ---------------------------------------------------------------- the strip generators (signed detail F: <0 dark, >0 light; wet mask Wm 0..1)
let F = null, Wm = null;
function* genField(type, P){ F.fill(0); Wm.fill(0); const g = P.grain || 0;
  const R = rng(0x5D0 + MATS.indexOf(type) * 977);
  const sub = []; for(let b = 0; b < NSUB; b++) sub.push(rng(b * 7919 + MATS.indexOf(type) * 104729 + 1));
  for(let y0 = 0; y0 < TH; y0 += 24){ for(let y = y0; y < y0 + 24; y++){ const S = (y + .5) / SPS, sb = (S / SUB) | 0, sl = S - sb * SUB, row = y * TW;
      for(let x = 0; x < TW; x++){ const i = row + x, tm = TM[x], r = ih(x, y, 11); let d = 0, w = 0;
        if(type === 'asphalt' || type === 'wet' || type === 'ash' || type === 'sand'){
          const lfv = lf(x, y, sb, 17), cl = lfv * lfv * 1.6 + .2;   // aggregate gathers in drifts (a low-frequency density), not salt
          // on a near-black band dark detail has nowhere to go: the surface reads by its light (worn aggregate catching the lamps), and
          // the polished wheel tracks read as smoother, slightly sheened bands with the grain worn out of them
          const wornT = 1 - .8 * tm, sp = wornT * g * cl * (type === 'asphalt' || type === 'wet' ? 1 : .45);
          d = ih(x >> 1, y >> 1, 12) < .3 + .3 * lfv ? .05 * g * wornT : 0;   // 2x2 mottling
          if(r < .09 * sp) d += .11 + .12 * ih(x, y, 13); else if(r > 1 - .012 * sp) d -= .12;   // pale stones, rarer dark pits
          if(ih(x >> 1, y >> 1, 18) < .014 * sp) d += .06;   // the odd 2x2 chip
          const trk = P.tracks || 0; d += tm * .022 * trk; if(type === 'asphalt' || type === 'wet') d -= LCM[x] * .07 * trk * (lf(x, y, sb, 14) > .45 ? 1 : .25);   // tyre polish; the oil-drip strip in each lane
          d -= EM[x] * .05 * (P.edge || 0);
          if(type === 'wet') w = .16 + .44 * tm;   // a film everywhere, deeper in the polished tracks
          if(type === 'ash'){ const X = XC[x], cloud = lf(x, y, sb, 41), dens = (P.dust || 0) * ((.3 + .7 * ss(.55, .98, Math.abs(X))) * (1 - .8 * tm) + .2 * (1 - tm)) * (.25 + 1.5 * cloud * cloud);   // ash lies in soft drifts, thicker at the kerbs, swept out of the tracks
            if(ih(x, y, 41) < dens * .3) d += .08 + .1 * ih(x, y, 42); if(ih(x >> 1, y >> 1, 43) < dens * .14) d += .06;
            d += Math.max(0, cloud - .55) * .22 * (P.drift || 0) * (1 - tm) * (.5 + .5 * ss(.3, .9, Math.abs(X))); d -= tm * .035 * (P.tracks || 0); }
          if(type === 'sand'){ const X = XC[x], sd = P.side < 0 ? -1 : 1, e = ss(.78, .99, X * sd); if(e > 0) d += e * .13 * (P.drift || 0) * (1 - .6 * tm); }
        } else if(type === 'concrete'){
          d = (ih(x >> 1, y >> 1, 21) - .5) * .035 * g; if(r < .03 * g) d += .07;
          if(y % 3 === 0) d -= .018 * g;   // transverse tining
          const X = XC[x], ln = X < -1 / 3 ? 0 : X < 1 / 3 ? 1 : 2, J = Math.max(2, P.joint || 8), slab = Math.floor(sl / J);
          d += ih(ln, sb * 16 + slab, 22) * .05 * g;   // each slab its own tone (edges fall on the joints)
          d -= tm * .06 * (P.tracks || 0); d -= EM[x] * .05 * (P.edge || 0); w = EM[x] * .2;
        } else if(type === 'snow'){
          const X = XC[x]; let rut = 0;
          for(const c of LANES) for(const o of [-.19, .19]){ const wr = .068 * (1 + .25 * (lf(((c + o) * 40 + 200) | 0, y, sb, 31) - .5)), q = Math.abs(X - c - o) / wr; if(q < 1.2) rut = Math.max(rut, q < .62 ? 1 : q < .9 ? .6 : .3); }
          if(rut === 1){ d = -.21 * (P.ruts || 0) * (.85 + .3 * ih(x, y >> 3, 32)); w = .6; }   // the tyre ruts: wet tarmac showing through, streaked lengthwise
          else if(rut){ d = -(rut > .5 ? .1 : .05) * (P.slush || 0) * (.8 + .4 * ih(x >> 1, y >> 2, 34)); w = rut > .5 ? .35 : .15; }   // slush shoulders, two steps
          else { const lu = lf(x, y, sb, 36); d = .1 + (lu - .5) * .08 * g + (ih(x >> 1, y >> 1, 33) < .3 ? .03 * g : 0); if(r < .04 * g) d += .07; const ll = Math.min(Math.abs(X - 1 / 3), Math.abs(X + 1 / 3)); if(ll < .06) d += .06; }   // packed snow between the ruts: pale, lumpy, a ridge where the lane lines were
          d += EM[x] * .12 * (P.edge || 0);
        } else if(type === 'cobble'){ d = 0; }   // painted per course below
        F[i] = d; Wm[i] = w; } }
    yield; }
  // ---- features, each inside its own sub-block
  const put = (x, y, v, mode) => { if(x < 0 || x >= TW || y < 0 || y >= TH) return; const i = y * TW + x; F[i] = mode ? v : F[i] + v; };
  const putW = (x, y, v) => { if(x < 0 || x >= TW || y < 0 || y >= TH) return; const i = y * TW + x; if(v > Wm[i]) Wm[i] = v; };
  if(type === 'asphalt' || type === 'wet' || type === 'ash' || type === 'sand'){
    const sm = P.seams || 0;
    if(sm > 0 && type !== 'sand') for(let y = 0; y < TH; y++){ const sl = (y + .5) / SPS % SUB; for(const sd of [-1, 1]){ const X0 = sd / 3 + .022 + .006 * Math.sin(Math.PI * sl / SUB), x0 = tx(X0); put(x0, y, -.12 * sm); put(x0 + 1, y, -.05 * sm); } }   // construction joints beside the lane lines
    for(let b = 0; b < NSUB; b++){ const r = sub[b], y0 = b * BLK;
      if(type !== 'sand' && r() < sm * .6){ let X = (r() - .5) * 1.7, v = 0; const ya = y0 + 6 + ((r() * 20) | 0), yb = ya + 40 + ((r() * 40) | 0);   // a tar snake: crack sealant, glossy
        for(let y = ya; y < yb; y++){ v = v * .9 + (r() - .5) * .006; X += v; const x = tx(X); put(x, y, -.15 * sm); put(x + 1, y, -.1 * sm); put(x + 2, y, .04 * sm); putW(x, y, .55); putW(x + 1, y, .55); } }
      if(r() < (P.patches || 0) * .7){ const l = (r() * 3) | 0, cX = LANES[l] + (r() - .5) * .08, hw = .2 + r() * .12, len = 1.5 + r() * 3.5, s0 = .5 + r() * (SUB - len - 1), tone = (r() < .5 ? .035 : -.045);   // a patch
        const xa = tx(cX - hw), xb = tx(cX + hw), ya = y0 + Math.round(s0 * SPS), yb = y0 + Math.round((s0 + len) * SPS);
        for(let y = ya; y <= yb; y++) for(let x = xa; x <= xb; x++){ const i = y * TW + x; if(y === ya || y === yb || x === xa || x === xb){ F[i] = tone > 0 ? .07 : -.14; continue; } F[i] = tone > 0 ? .03 + (ih(x, y, 15) < .05 ? .08 : 0) : -.05 + (ih(x, y, 15) < .02 ? .07 : 0); } }   // fresh black patch (no grain, a sealed edge) or an old grey one
      if(r() < (P.cracks || 0) * .8){ const ya = y0 + 8 + ((r() * (BLK - 16)) | 0); let X = -.9 + r() * 1.2, y = ya; const Xb = X + .2 + r() * .5;   // a transverse hairline crack
        while(X < Xb){ const x = tx(X); put(x, y, -.1); if(r() < .2) y += r() < .5 ? -1 : 1; X += 1 / (TW / 2); } }
      const np = Math.round((P.puddles || 0) * (1.2 + r() * 1.6));
      for(let k = 0; k < np; k++){ const l = (r() * 3) | 0, edge = r() < .3, cX = edge ? (r() < .5 ? -.9 : .9) : LANES[l] + (r() < .5 ? -.19 : .19) + (r() - .5) * .04;   // water lies in the ruts and at the kerbs
        const rx = .06 + r() * .12, ry = .5 + r() * 1.3, cS = ry + .3 + r() * (SUB - 2 * ry - .6), cx0 = (cX + 1) * TW / 2, cy0 = y0 + cS * SPS, RX = rx * TW / 2, RY = ry * SPS;
        for(let y = Math.floor(cy0 - RY - 2); y <= cy0 + RY + 2; y++) for(let x = Math.floor(cx0 - RX - 3); x <= cx0 + RX + 3; x++){ if(x < 0 || x >= TW || y < y0 || y >= y0 + BLK) continue;
          const q = ((x - cx0) / RX) ** 2 + ((y - cy0) / RY) ** 2 + .28 * (ih(x >> 2, y >> 1, 16 + k) - .5); if(q >= 1) continue; const i = y * TW + x;
          F[i] = q < .7 ? -.1 - .03 * (1 - q) : Math.min(F[i], -.06); Wm[i] = Math.max(Wm[i], q < .7 ? 1 : .6); }   // smooth and dark: the water hides the grain
        for(let x = Math.floor(cx0 - RX); x <= cx0 + RX; x++){ const yr = Math.round(cy0 + RY * Math.sqrt(Math.max(0, 1 - ((x - cx0) / RX) ** 2))); if(x >= 0 && x < TW && yr < y0 + BLK) F[yr * TW + x] = .05; } }   // the far rim catches the light
      if(type === 'sand'){ const nt = 1 + ((r() * 2.2) | 0), sd = P.side < 0 ? -1 : 1;   // drift tongues blown in from the seaward edge, ripple-striped
        for(let t = 0; t < nt; t++){ const L = 30 + ((r() * 50) | 0), ya = y0 + 4 + ((r() * (BLK - L - 8)) | 0), reach = .25 + r() * .6 * (P.drift || 0) / .6, skew = (r() - .3) * .3;
          for(let y = ya; y < ya + L; y++){ const p = (y - ya) / L, rch = reach * Math.pow(Math.sin(Math.PI * p), .7) + .03 * (ih(1, y >> 1, 51) - .5);
            for(let x = 0; x < TW; x++){ const X = XC[x] * sd, edgeD = 1 - X - skew * p; if(edgeD > rch) continue; const i = y * TW + x, tm = TM[x];
              const rip = Math.sin((x * .55 + y * .9) * .9) > .55 ? .045 * (P.ripples || 0) : -.012 * (P.ripples || 0); F[i] = F[i] * .4 + (.12 + .08 * (1 - edgeD / Math.max(.01, rch))) * (P.drift || 0) * (1 - .65 * tm) + rip; } } } } } }
  if(type === 'concrete'){ const sm = P.seams || 0, J = Math.max(2, P.joint || 8) * SPS, xl = [tx(-1 / 3), tx(1 / 3)];
    for(let y = 0; y < TH; y++){ const yl = y % BLK; if(yl % J === 0){ for(let x = 0; x < TW; x++){ F[y * TW + x] = -.3 * sm; F[((y + 1) % TH) * TW + x] += .07 * sm; Wm[y * TW + x] = Math.max(Wm[y * TW + x], .35); } } for(const x of xl){ put(x, y, -.2 * sm, 0); put(x + 1, y, .04 * sm); } }
    for(let b = 0; b < NSUB; b++){ const r = sub[b], y0 = b * BLK;
      if(r() < (P.plates || 0) * .6){ const ya = y0 + 1;   // a steel finger joint across the road: two edge bars, interleaved teeth, a metal sheen
        for(let y = ya; y <= ya + 10; y++) for(let x = 0; x < TW; x++){ const i = y * TW + x, k = y - ya; if(k === 0 || k === 10){ F[i] = -.32; continue; }
          const far = (x % 6) < 3, on = far ? k <= 7 : k >= 3; F[i] = on ? .2 + (ih(x, y, 23) - .5) * .06 : -.28; Wm[i] = on ? .5 : .2; } }
      for(let s = 0; s < SUB * SPS / J; s++) for(let l = 0; l < 3; l++){ if(r() > (P.cracks || 0) * .35) continue; const ya = y0 + s * J + 2, yb = ya + J - 4; let X = LANES[l] + (r() - .5) * .5, v = (r() - .5) * .02;   // a crack in this slab
        for(let y = ya; y < yb && Math.abs(X - LANES[l]) < .3; y++){ X += v + (r() - .5) * .006; const x = tx(X); put(x, y, -.13); put(x + 1, y, .04); } }
      if(r() < (P.patches || 0) * .6){ const l = (r() * 3) | 0, hw = .1 + r() * .18, cX = LANES[l] + (r() - .5) * .3, len = 1 + r() * 2.5, s0 = .5 + r() * (SUB - len - 1);   // an asphalt repair
        const xa = tx(cX - hw), xb = tx(cX + hw), ya = y0 + Math.round(s0 * SPS), yb = y0 + Math.round((s0 + len) * SPS);
        for(let y = ya; y <= yb; y++) for(let x = Math.max(0, xa); x <= Math.min(TW - 1, xb); x++){ const i = y * TW + x; F[i] = (y === ya || y === yb || x === xa || x === xb) ? -.14 : -.09 + (ih(x, y, 24) < .06 ? .12 : 0); } }
      const np = Math.round((P.puddles || 0) * (1 + r() * 1.5));
      for(let k = 0; k < np; k++){ const sd = r() < .5 ? -1 : 1, cX = sd * (.88 + r() * .06), rx = .04 + r() * .06, ry = .6 + r() * 1.4, cS = ry + .3 + r() * (SUB - 2 * ry - .6), cx0 = (cX + 1) * TW / 2, cy0 = y0 + cS * SPS, RX = rx * TW / 2, RY = ry * SPS;
        for(let y = Math.floor(cy0 - RY); y <= cy0 + RY; y++) for(let x = Math.floor(cx0 - RX); x <= cx0 + RX; x++){ if(x < 0 || x >= TW) continue; const q = ((x - cx0) / RX) ** 2 + ((y - cy0) / RY) ** 2 + .25 * (ih(x >> 2, y >> 1, 25 + k) - .5); if(q >= 1) continue;
          const i = y * TW + x; F[i] = -.15; Wm[i] = q < .7 ? 1 : .6; } } } }
  if(type === 'cobble'){ const jn = P.joints || 0, st = P.stone || 0;   // ishidatami: courses of granite setts, staggered; joints dark with a shadow row
    for(let b = 0; b < NSUB; b++){ const r = sub[b], y0 = b * BLK; let s = 0;
      while(s < SUB - .01){ let len = 1 + r() * .9; if(SUB - s - len < .9) len = SUB - s; const ya = y0 + Math.round(s * SPS), yb = y0 + Math.round((s + len) * SPS), cuts = [0]; let X = -1 - r() * .25;
        while(X < 1){ X += .14 + r() * .18; cuts.push(Math.min(TW, Math.max(0, tx(X)))); } cuts.push(TW);
        for(let y = ya; y < yb; y++){ const k = y - ya; let ci = 0;
          for(let x = 0; x < TW; x++){ while(ci < cuts.length - 1 && x >= cuts[ci + 1]) ci++; const i = y * TW + x, tm = TM[x];
            if(k === 0){ F[i] = -.26 * jn; Wm[i] = .3 * (P.puddles || 0); continue; } if(x === cuts[ci] && ci > 0){ F[i] = -.24 * jn; continue; }
            let d = (ih(ci, ya, 61) - .5) * .1 * st + (ih(x, y, 62) - .5) * .03 * (P.grain || 0); if(ih(x, y, 63) < .02 * (P.grain || 0)) d += .08;
            if(k === 1) d -= .08 * jn; if(x === cuts[ci] + 1) d -= .05 * jn; d += tm * .03 * (P.tracks || 0); F[i] = d; } }
        s += len; } } }
  if(type === 'snow'){ for(let b = 0; b < NSUB; b++){ const r = sub[b], y0 = b * BLK; if(r() > (P.ice || 0) * .9) continue;   // a glazed ice patch
      const cX = (r() - .5) * 1.4, rx = .1 + r() * .15, ry = 1 + r() * 2, cS = ry + .3 + r() * (SUB - 2 * ry - .6), cx0 = (cX + 1) * TW / 2, cy0 = y0 + cS * SPS, RX = rx * TW / 2, RY = ry * SPS;
      for(let y = Math.floor(cy0 - RY); y <= cy0 + RY; y++) for(let x = Math.floor(cx0 - RX); x <= cx0 + RX; x++){ if(x < 0 || x >= TW) continue; const q = ((x - cx0) / RX) ** 2 + ((y - cy0) / RY) ** 2 + .3 * (ih(x >> 2, y >> 1, 35) - .5); if(q >= 1) continue;
        const i = y * TW + x; F[i] = F[i] * .3 + .015; Wm[i] = Math.max(Wm[i], q < .7 ? .9 : .5); } } }
  void R; }

// ---------------------------------------------------------------- levels: L0 from F; each next level averages 2 across x 4 along (premultiplied)
const TEX = {};   // type -> { c:[canvas x NL], m:[Uint8Array mask x NL], key }
const TINT = {};  // road -> { c:[canvas x NL], col }
let S1 = null; const DK = 3, LK = 1.3;   // dark detail is black at 3x its value (a dark road needs a real step to read), light at 1.3x
function mkCanvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function* buildType(type){ const P = FIELD[type]; if(!P) return; if(!F){ F = new Float32Array(TW * TH); Wm = new Float32Array(TW * TH); }
  yield* genField(type, P);
  let T = TEX[type]; if(!T){ T = TEX[type] = { c:[], m:[], key:'' }; for(let k = 0; k < NL; k++){ T.c.push(mkCanvas(LW[k], LH[k])); T.m.push(new Uint8Array(LW[k] * LH[k])); } }
  const L = hexRGB(P.lite || '#a0a0b0');
  // L0
  { const id = T.c[0].getContext('2d').createImageData(TW, TH), D = id.data, M = T.m[0];
    for(let i = 0; i < TW * TH; i++){ if((i & 65535) === 0 && i) yield; const d = F[i], a = Math.min(1, d > 0 ? d * LK : -d * DK), j = i * 4; if(d > 0){ D[j] = L[0]; D[j + 1] = L[1]; D[j + 2] = L[2]; } D[j + 3] = Math.round(a * 255); M[i] = Math.round(Math.min(1, Wm[i]) * 255); }
    for(let q = 0; q < 4; q++){ T.c[0].getContext('2d').putImageData(id, 0, 0, 0, q * TH / 4, TW, TH / 4); yield; } }   // (in quarters: one upload per warm step)
  // premultiplied chain
  if(!S1) S1 = [null, new Float32Array(LW[1] * LH[1] * 2), new Float32Array(LW[2] * LH[2] * 2), new Float32Array(LW[3] * LH[3] * 2), new Float32Array(LW[4] * LH[4] * 2)];   // (light alpha, total alpha) per texel
  for(let k = 1; k < NL; k++){ const w = LW[k], h = LH[k], pw = LW[k - 1], A = S1[k], P0 = S1[k - 1], M = T.m[k], Mp = T.m[k - 1];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let la = 0, ta = 0, m = 0;
      for(let dy = 0; dy < 4; dy++) for(let dx = 0; dx < 2; dx++){ const sx = x * 2 + dx, sy = y * 4 + dy, si = sy * pw + sx;
        if(k === 1){ const d = F[si], a = Math.min(1, d > 0 ? d * LK : -d * DK); ta += a; if(d > 0) la += a; } else { la += P0[si * 2]; ta += P0[si * 2 + 1]; } m += Mp[si]; }
      const i = y * w + x; A[i * 2] = la / 8; A[i * 2 + 1] = ta / 8; M[i] = Math.round(m / 8); if(k === 1 && x === w - 1 && (y & 31) === 31) yield; }
    const id = T.c[k].getContext('2d').createImageData(w, h), D = id.data;
    for(let i = 0; i < w * h; i++){ const la = A[i * 2], ta = A[i * 2 + 1], j = i * 4, f = ta > 0 ? la / ta : 0; D[j] = L[0] * f; D[j + 1] = L[1] * f; D[j + 2] = L[2] * f; D[j + 3] = Math.round(ta * 255); }
    T.c[k].getContext('2d').putImageData(id, 0, 0); yield; }
  T.key = JSON.stringify(P); }
function* buildTint(key){ const p = RP[key], T = TEX[p.mat]; if(!T) return; const col = hexRGB(sheenCol(key)); let Q = TINT[key];
  if(!Q){ Q = TINT[key] = { c:[], col:'' }; for(let k = 0; k < NL; k++) Q.c.push(mkCanvas(LW[k], LH[k])); }
  for(let k = 0; k < NL; k++){ const w = LW[k], h = LH[k], g = Q.c[k].getContext('2d'), id = g.createImageData(w, h), D = id.data, M = T.m[k];
    for(let i = 0; i < w * h; i++){ const j = i * 4; D[j] = col[0]; D[j + 1] = col[1]; D[j + 2] = col[2]; D[j + 3] = M[i]; } g.putImageData(id, 0, 0); yield; }
  Q.col = sheenCol(key) + '|' + T.key; }
function sheenCol(key){ const p = RP[key]; if(p.sheenCol) return p.sheenCol; const L = LANDS.find(l => l.key === key); return L ? mixHex(L.sky, '#c8c0d8', .35) : '#6a6080'; }

// ---------------------------------------------------------------- decals (markings): strips one lane wide, 12 texels per segment, worn
const DEC = {};   // name -> { c:[canvas x NDL], w, len (segments), full }
const MSET = { city:['tomare', 'diamond', 'zebra', 'stop', 'n'], expressway:['n', 'bars'], rural:['n'] };
const wearQ = p => Math.round(Math.min(1, Math.max(0, p.wear)) * 3) / 3;
function* buildDecals(){ const need = new Set(); for(const k of KEYS){ const p = RP[k]; if(!MSET[p.marks]) continue; for(const m of MSET[p.marks]) need.add((m === 'n' ? 'n' + (p.speed | 0) : m) + '@' + wearQ(p).toFixed(2)); }
  for(const nk of need){ if(DEC[nk]) continue; const [nm, wq] = nk.split('@'); DEC[nk] = makeDecal(nm, +wq); yield; } }
function makeDecal(nm, wq){ const full = nm === 'zebra' || nm === 'stop', w = full ? TW : DW, len = nm === 'tomare' ? 33 : nm === 'diamond' ? 10 : nm === 'bars' ? 30 : nm === 'zebra' ? 8 : nm === 'stop' ? 1 : 10, h = len * SPS;
  const c = mkCanvas(w, h), g = c.getContext('2d'); g.clearRect(0, 0, w, h); g.fillStyle = '#fff';
  // texel row 0 is the near end; a glyph's top faces away from the rider, so glyphs are drawn flipped (row index = distance)
  const glyph = (ch, X, Y, gw, gh) => { const t = mkCanvas(96, 96), q = t.getContext('2d'); q.fillStyle = '#fff'; q.textAlign = 'center'; q.textBaseline = 'middle';
    q.font = '900 84px "Yu Gothic", "YuGothic", "Meiryo", "Hiragino Sans", "Noto Sans JP", "MS Gothic", sans-serif'; q.fillText(ch, 48, 52);
    g.save(); g.translate(X, Y + gh); g.scale(1, -1); g.imageSmoothingEnabled = true; g.drawImage(t, 0, 0, 96, 96, 0, 0, gw, gh); g.restore(); };
  if(nm === 'tomare'){ const cw = 84, chh = 9 * SPS; ['止', 'ま', 'れ'].forEach((ch, k) => glyph(ch, (w - cw) / 2, k * (chh + 3 * SPS / 2) , cw, chh)); }
  else if(nm[0] === 'n'){ const s = nm.slice(1), dw = 46, gap = 8, tot = s.length * dw + (s.length - 1) * gap; [...s].forEach((ch, k) => glyph(ch, (w - tot) / 2 + k * (dw + gap), 0, dw, h)); }
  else if(nm === 'diamond'){ g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.moveTo(w / 2, 4); g.lineTo(w / 2 + 27, h / 2); g.lineTo(w / 2, h - 4); g.lineTo(w / 2 - 27, h / 2); g.closePath(); g.stroke(); }
  else if(nm === 'bars'){ let y = 0, k = 0; while(y < h - 6){ g.fillRect(2, y, 26, 6); g.fillRect(w - 28, y, 26, 6); y += Math.max(12, Math.round(34 - k * 2.2)); k++; } }   // deceleration bars at both lane edges, closing up
  else if(nm === 'zebra'){ const bw = 22; for(let x = 6; x + bw < w - 4; x += bw * 2) g.fillRect(x, 0, bw, h); }
  else if(nm === 'stop'){ g.fillRect(0, 2, w, h - 4); }
  // wear: holes in clusters, more where the tyres run (lane-relative tracks), ragged at the edges; alpha is then hard (0 or 1) so the paint
  // stays a crisp pixel shape at every distance (the levels below average it)
  const id = g.getImageData(0, 0, w, h), D = id.data, PC = hexRGB(nm[0] === 'n' ? '#e2902c' : '#e4ded2');   // speed numerals are orange (橙色), the rest white
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const j = (y * w + x) * 4, a = D[j + 3] / 255; if(a <= 0) continue;
    const lx = full ? ((x / TW * 3) % 1) * 2 - 1 : x / w * 2 - 1, trk = Math.max(0, 1 - Math.abs(Math.abs(lx) - .57) / .14);
    const nz = ih(x >> 2, y >> 2, 71) * .6 + ih(x >> 1, y >> 1, 72) * .3 + ih(x, y, 73) * .1, keep = a > .45 && nz >= wq * .42 + trk * wq * .38 && !(a < .9 && ih(x, y, 74) < .5);
    D[j] = PC[0]; D[j + 1] = PC[1]; D[j + 2] = PC[2]; D[j + 3] = keep ? 255 : 0; }
  g.putImageData(id, 0, 0);
  const lv = [c]; let pc = c;
  for(let k = 1; k < NDL; k++){ const pw = pc.width, ph = pc.height, nw = pw >> 1, nh = Math.max(1, ph >> 2), q = mkCanvas(nw, nh), qg = q.getContext('2d'), sd = pc.getContext('2d').getImageData(0, 0, pw, ph).data, od = qg.createImageData(nw, nh), O = od.data;
    for(let y = 0; y < nh; y++) for(let x = 0; x < nw; x++){ let a = 0; for(let dy = 0; dy < 4; dy++) for(let dx = 0; dx < 2; dx++){ const sy = Math.min(ph - 1, y * 4 + dy); a += sd[(sy * pw + x * 2 + dx) * 4 + 3]; } const j = (y * nw + x) * 4; O[j] = PC[0]; O[j + 1] = PC[1]; O[j + 2] = PC[2]; O[j + 3] = a / 8; }
    qg.putImageData(od, 0, 0); lv.push(q); pc = q; }
  return { c:lv, w, len, full }; }

// where the markings go: one cell of the road at a time (cached), only on plain stretches (no bore, gore, side lane)
const DCELL = new Map(), NO_DEC = [];
function plain(i0, n){ for(let i = i0; i < i0 + n; i++){ const s = segs[i]; if(!s || s.tunnel || s.gore || s.lane || (s.forkZ !== undefined)) return false; } return true; }
function cellDecals(key, cell, P){ let M = DCELL.get(key); if(!M) DCELL.set(key, M = new Map()); let D = M.get(cell); if(D !== undefined) return D; if(segs.length < cell * P + P + 2) return NO_DEC;   // not laid yet: decide later (not cached)
  if(M.size > 300) M.clear(); D = [];   // (numeric keys per road: no string built per lookup)
  const p = RP[key], i0 = cell * P, wq = '@' + wearQ(p).toFixed(2), nmS = 'n' + (p.speed | 0) + wq, N = nm => nm + wq;
  if(p.marks === 'city'){ let Z = -1, own = false; for(let i = i0 + 140; i < i0 + P; i++){ const s = segs[i]; if(s && s.zeb){ Z = i; own = true; break; } }   // Neon's own crossings, else our own
    if(Z < 0){ Z = i0 + 200 + Math.floor(ih(cell, 3, 81) * (P - 260)); if(!plain(Z - 130, 140)) Z = -1; }
    if(Z >= 0){ if(!own) D.push({ nm:N('zebra'), i0:Z, lanes:null });
      if(plain(Z - 44, 44)){ D.push({ nm:N('stop'), i0:Z - 5, lanes:null }); D.push({ nm:N('tomare'), i0:Z - 41, lanes:LANES }); }
      for(const o of [80, 125]) if(plain(Z - o, 10)) D.push({ nm:N('diamond'), i0:Z - o, lanes:LANES }); } }
  else if(p.marks === 'expressway'){ const a = i0 + 40 + Math.floor(ih(cell, 5, 82) * (P - 120)); if(DEC[nmS] && plain(a, 10)) D.push({ nm:nmS, i0:a, lanes:LANES });
    for(let i = i0 + 80; i < i0 + P - 10; i++){ const s = segs[i]; if(s && Math.abs(s.curve) >= 4 && segs[i - 1] && Math.abs(segs[i - 1].curve) < 4){ if(plain(i - 34, 30) && (i - 34 > a + 12 || i - 4 < a)) D.push({ nm:N('bars'), i0:i - 34, lanes:LANES }); break; } } }
  else if(p.marks === 'rural'){ const a = i0 + 40 + Math.floor(ih(cell, 9, 83) * (P - 100)); if(DEC[nmS] && ih(cell, 11, 84) < .7 && plain(a, 10)) D.push({ nm:nmS, i0:a, lanes:[-2 / 3, 2 / 3] }); }
  M.set(cell, D); return D; }
const DPER = { city:520, expressway:520, rural:700 };

// ---------------------------------------------------------------- warm-up
let PRESETS_IN = false, presetWait = 0;
function usedTypes(){ const s = new Set(); for(const k of KEYS){ const m = RP[k].mat; if(m && m !== 'none' && FIELD[m]) s.add(m); } return [...s]; }
function* warmSteps(){ while(!PRESETS_IN && presetWait++ < 120) yield;   // the saved presets usually arrive within a few ms of load
  for(const t of usedTypes()) yield* buildType(t);
  for(const k of KEYS) if(RP[k].wet > 0 && TEX[RP[k].mat]) yield* buildTint(k);
  yield* buildDecals();
  applyRoadCols(); RM.ready = true; }
function warm(){ for(const _ of warmSteps()); }   // eslint-disable-line no-unused-vars
// rebuild what a changed preset needs (lab, or presets arriving after the warm-up): synchronous in the lab, sliced otherwise
function refresh(sync){ const job = (function*(){ for(const t of usedTypes()){ if(!TEX[t] || TEX[t].key !== JSON.stringify(FIELD[t])) yield* buildType(t); }
    for(const k of KEYS){ const p = RP[k]; if(p.wet > 0 && TEX[p.mat] && (!TINT[k] || TINT[k].col !== sheenCol(k) + '|' + TEX[p.mat].key)) yield* buildTint(k); }
    yield* buildDecals(); applyRoadCols(); RM.ready = true; })();
  if(sync){ for(const _ of job); return; }
  const step = () => { const t0 = performance.now(); while(performance.now() - t0 < 6){ if(job.next().done) return; } setTimeout(step, 0); }; step(); }
// road and lamp colour overrides (a material can need a lighter base: concrete, slush); the originals are kept for the before / after
const ORIG = {};
function applyRoadCols(){ for(const k of KEYS){ const E = ENV[k]; if(!E) continue; if(!ORIG[k]) ORIG[k] = { road:E.road, lampCol:E.lampCol }; const p = RP[k], on = RM.on && p.mat !== 'none';
    E.road = on && p.road ? p.road.slice() : ORIG[k].road; E.lampCol = on && p.lampCol ? p.lampCol : ORIG[k].lampCol; } }
function loadPresets(J){ if(!J || typeof J !== 'object') return; if(J.fields) for(const t in J.fields) if(FIELD[t]) Object.assign(FIELD[t], J.fields[t]);
  if(J.roads) for(const k in J.roads) if(KEYS.includes(k)) ROADS[k] = Object.assign({}, ROADS_D[k] || {}, J.roads[k]); KEYS.forEach(resolve); }
try{ fetch('env/roadmat-presets.json', { cache:'no-store' }).then(r => r.ok ? r.json() : null).then(J => { const late = RM.ready; loadPresets(J); PRESETS_IN = true; if(late) refresh(false); }).catch(() => { PRESETS_IN = true; }); }
catch(e){ PRESETS_IN = true; }

// ---------------------------------------------------------------- the per-frame row table (built at the first hook call of a frame)
let RN = 0, ROWX = null, ROWW = null, ROWP = null, ROWV = null, ROWL = null, ROWF = null, ROWN = null;
const RS0 = new Int32Array(1024), RS1 = new Int32Array(1024), CARH = new Int16Array(1024); let CARN = new Int16Array(256);
const FR = { f:-1, base:0, t0:0, ms:0 };
function prep(){ FR.f = DRAWN; const base = segAt(position).index; FR.base = base; const rows = Math.ceil(H / PX) + 1;
  if(rows > RN){ RN = rows + 16; ROWX = new Float32Array(RN); ROWW = new Float32Array(RN); ROWP = new Float64Array(RN); ROWV = new Float32Array(RN); ROWL = new Float32Array(RN); ROWF = new Float32Array(RN); ROWN = new Int16Array(RN); RV.x = ROWX; RV.w = ROWW; RV.p = ROWP; RV.v = ROWV; RV.f = ROWF; RV.n = ROWN; }
  ROWN.fill(-1, 0, RN); const nd = Math.min(DRAW, 1024);
  for(let n = 0; n < nd; n++){ RS0[n] = 1; RS1[n] = 0; CARH[n] = -1; const s = segs[base + n]; if(!s) continue;
    const a = s.p1.screen, b = s.p2.screen; if(s.p1.camera.z <= DEPTH || b.y >= a.y || b.y >= s.clip) continue;
    const yb = Math.min(a.y, s.clip), r0 = Math.max(0, Math.ceil(b.y / PX - .5)), r1 = Math.min(rows - 1, Math.ceil(yb / PX - .5) - 1); if(r1 < r0) continue;
    const blk = Math.floor(s.index / SUB), vb = (SUBP(blk) * SUB + (s.index - blk * SUB)) * SPS;   // the segment's first L0 texel row
    RS0[n] = r0; RS1[n] = r1; const sa = s.p1.screen.scale, sb = s.p2.screen.scale, dy = a.y - b.y, fog = Math.pow(n / DRAW, 1.6);
    for(let r = r0; r <= r1; r++){ const yc = (r + .5) * PX, f = (a.y - yc) / dy, sc = sa + (sb - sa) * f, t = Math.min(1, Math.max(0, (sa / sc - 1) / (sa / sb - 1))), w = a.w + (b.w - a.w) * f;
      ROWX[r] = a.x + (b.x - a.x) * f; ROWW[r] = w; ROWP[r] = s.index + t; ROWV[r] = vb + t * SPS; ROWF[r] = fog; ROWN[r] = n;
      const dv = SPS * PX * sa * sb / (sc * sc * dy), du = TW * PX / (2 * Math.max(1, w)); ROWL[r] = Math.max(Math.log2(Math.max(du, 1e-3)), Math.log2(Math.max(dv, 1e-3)) / 2); } }
  // cars by segment (a linked list in typed arrays: nothing allocated)
  if(cars.length > CARN.length) CARN = new Int16Array(cars.length + 64);
  for(let k = 0; k < cars.length; k++){ const c = cars[k]; if(c.oth) continue; const n = Math.floor(c.z / SEG) - base; if(n < 0 || n >= nd) continue; CARN[k] = CARH[n]; CARH[n] = k; }
  // this frame's state per road (Shuto's drizzle comes and goes by visit)
  WETK.shuto = ENV.shuto && ENV.shuto.wetVisit && segs[base] && segs[base].shB !== undefined ? (ENV.shuto.wetVisit(segs[base].shB) ? 1 : .12) : 1;
  PLN = 0; DKN = 0; PLHOT = 0; PLLG = 0; PLL0 = PLL1 = -1;   // this frame's deferred pools (and dark breaks)
  PK.ph = reduce ? 0 : Math.floor(performance.now() / 85);   // the ripples' time step (pools shiver on it; none under reduced motion)
  const st = RM.stats; st.frames++; st.ms = st.ms * .95 + FR.ms * .05; if(FR.ms > st.peak) st.peak = FR.ms; st.last = FR.ms; FR.ms = 0; }
const WETK = { shuto:1 };

// ---------------------------------------------------------------- drawing
const MOONC = '#f0e4c8', TAILC = '#ff2a3c';
// the core wraps cx.globalAlpha to multiply by its draw-distance fade (EDGE); this sets the same thing without the accessor's cost per row
const GA_SET = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha').set, SA = a => GA_SET.call(cx, a * EDGE);
function maskAt(T, u, v){ const x = Math.max(0, Math.min(LW[1] - 1, ((u + 1) * LW[1] / 2) | 0)), y = ((v / 4) | 0) % LH[1]; return T.m[1][y * LW[1] + x] / 255; }
function drawSegBack(s, sx, sy, uw, fog){ if(!RM.on || !RM.ready || state === 'ready') return; const t0 = performance.now();
  try{ if(FR.f !== DRAWN) prep(); const n = s.index - FR.base; if(n < 0 || n >= 1024) return;
    if(FKG >= 0 && s.index >= FKG - SPLIT_PRE - 40) { const fk = (FKG - SPLIT_PRE - s.index) / 40; if(fk <= 0) return; layer(s, n, fk); }
    else layer(s, n, 1);
  } finally { FR.ms += performance.now() - t0; } }
function layer(s, n, w0){ const BL = s.bm < 1 && s.bA !== s.bB && !s.tunnel;
  if(BL){ paint(s, n, LANDS[s.bA].key, w0 * (1 - s.bm)); paint(s, n, LANDS[s.bB].key, w0 * s.bm); } else paint(s, n, LANDS[s.land].key, w0); }
function paint(s, n, key, wt){ if(wt < .03) return; const p = RP[key]; if(!p || p.mat === 'none') return; const T = TEX[p.mat]; if(!T || (s.tunnel && !p.tunnel)) return;
  const r0 = RS0[n], r1 = RS1[n], g = cx;
  // markings first (the material then wears them like the road)
  if(p.marks !== 'none' && r1 >= r0){ let D = s.rmDk === key ? s.rmD : null; if(!D){ const P = DPER[p.marks]; D = cellDecals(key, Math.floor(s.index / P), P); if(D !== NO_DEC){ s.rmD = D; s.rmDk = key; } }
    for(let k = 0; k < D.length; k++){ const d = D[k], dc = DEC[d.nm]; if(!dc || s.index < d.i0 || s.index >= d.i0 + dc.len) continue;
      for(let r = r0; r <= r1; r++){ const P2 = ROWP[r] - d.i0; if(P2 < 0 || P2 >= dc.len) continue; const lod = ROWL[r] + (dc.full ? 0 : -1.415), a = wt * p.paint * (1 - ROWF[r]) * Math.min(1, Math.max(0, 2.8 - lod)); if(a < .02) continue;
        const lv = Math.min(NDL - 1, Math.max(0, Math.ceil(lod - .3))), C = dc.c[lv], vr = Math.min(C.height - 1, Math.floor(P2 * SPS / (1 << (2 * lv)))), x = ROWX[r], w = ROWW[r];
        SA(a); const lanes = d.lanes;
        if(!lanes) blitRow(C, x - w, x + w, r, vr); else for(let l = 0; l < lanes.length; l++){ const c = x + lanes[l] * w; blitRow(C, c - w / 3, c + w / 3, r, vr); } }
      SA(1); } }
  // the material
  if(r1 >= r0){ const str = p.str * wt * (.6 + 1.4 * Math.min(.5, s.lit || 0)); for(let r = r0; r <= r1; r++){ const lod = ROWL[r], a = str * (1 - ROWF[r] * .7) * Math.min(1, Math.max(0, (4.6 - lod) / 1.2)); if(a < .02) continue;
      const lv = Math.min(NL - 1, Math.max(0, Math.ceil(lod - .3))), vr = Math.floor(ROWV[r] / (1 << (2 * lv))) % LH[lv]; SA(Math.min(1, a)); blitRow(T.c[lv], ROWX[r] - ROWW[r], ROWX[r] + ROWW[r], r, vr); }
    SA(1); }
  // wet: the sky in the puddles (Fresnel: strong toward the horizon), the moon's broken glitter, the lamps' and tail lights' streaks
  const wet = p.wet * (WETK[key] !== undefined ? WETK[key] : 1) * wt; if(wet <= .02) return; const Q = TINT[key];
  g.globalCompositeOperation = 'lighter';
  if(r1 >= r0 && Q){ const sh = wet * p.sheen, h2 = p.pools > 0;   // (perf pass: roads with pools (Akihabara) lay the sky sheen on even rows, each two rows deep)
    for(let r = r0; r <= r1; r++){ const h4 = p.hot && ROWF[r] < .03; if(h2 && (r & (h4 ? 3 : 1)) && r > r0) continue; const f = ROWF[r], fr = Math.max(ss(.004, .4, f), p.sheenN) * (1 - ss(.72, .98, f)), lod = ROWL[r], a = sh * fr * Math.min(1, Math.max(0, (4.8 - lod) / 1.2)); if(a < .02) continue;
      const lv = Math.min(NL - 1, Math.max(0, Math.ceil(lod - .3))), vr = Math.floor(ROWV[r] / (1 << (2 * lv))) % LH[lv]; SA(Math.min(1, a)); blitRow(Q.c[lv], ROWX[r] - ROWW[r], ROWX[r] + ROWW[r], r, vr, h2 ? Math.min(h4 ? (r | 3) + 1 - r : 2, r1 - r + 1) : 1); }
    const mx = MOON.x, ma = sh * .5 * (1 - ss(.85, 1, MOON.t || 0)); if(ma > .02){ g.fillStyle = MOONC;
      for(let r = r0; r <= r1; r++){ const x = ROWX[r], w = ROWW[r]; if(mx < x - w || mx > x + w) continue; const f = ROWF[r], fr = (.25 + .75 * ss(0, .5, f)) * (1 - ss(.7, .95, f)), m = maskAt(T, (mx - x) / w, ROWV[r]);
        const I = m > .7 ? 1 : m > .4 ? .55 : m > .15 ? .25 : 0; if(!I) continue; SA(Math.min(1, ma * fr * I)); const hw = Math.max(PX, w * (.03 + .05 * m)); pxRect(mx - hw, r * PX, hw * 2, PX); } } }
  if(p.refl > 0 && Math.pow(n / DRAW, 1.6) < .62){ const a = s.p1.screen, uw = a.w, rf = wet * p.refl * (1 - Math.pow(n / DRAW, 1.6) / .62);
    if(p.lamps && s.lit > .15){ const pv = segs[s.index - 1], nx = segs[s.index + 1]; if((!pv || pv.lit < s.lit) && (!nx || nx.lit <= s.lit)){ g.fillStyle = p.reflCol; for(let sd = -1; sd <= 1; sd += 2) streak(T, a.x + sd * p.lampX * uw, a.y, p.lampH * uw, uw * .06, rf); } }
    if(p.tails){ g.fillStyle = TAILC; for(let k = CARH[n]; k >= 0; k = CARN[k]){ const c = cars[k], pct = (c.z % SEG) / SEG, w = a.w + (s.p2.screen.w - a.w) * pct, cxp = a.x + (s.p2.screen.x - a.x) * pct + c.x * w, cyp = a.y + (s.p2.screen.y - a.y) * pct, cw = w * .36;
        if(p.hot && p.pools > 0){ PK.T = T; PK.rf = rf; PK.hot = 1; PK.n = n; DARK(cxp, cyp, w, .34, cw * .62, .5); PK.late = 1; }   // (hot: the car's own dark image breaks the columns behind it; its tail lights' come after)
        for(let sd = -1; sd <= 1; sd += 2){ if(p.pools > 0){ PK.T = T; PK.rf = rf; PK.lim = p.pools; PK.hot = p.hot; POOL(cxp + sd * cw * .36, cyp, w, .06, .16, cw * .11, TAILC, .8); } else streak(T, cxp + sd * cw * .36, cyp, cw * .3, cw * .1, rf * .8); } } }
    const E = ENV[key]; if(E && E.wetSrc && p.pools > 0){ PK.T = T; PK.rf = rf; PK.lim = p.pools; PK.hot = p.hot; PK.late = 0; PK.n = n; E.wetSrc(s, n, a, POOL); } }
  if(PLN && r1 >= r0) drawPools(r0, r1);
  SA(1); g.globalCompositeOperation = 'source-over';
  const E2 = ENV[key]; if(E2 && E2.wetFX && r1 >= r0) E2.wetFX(s, n, r0, r1, RV, wet, T); }
// one row of a strip across [x0, x1] (CSS px), on the grid, cropped to the screen
function blitRow(C, X0, X1, r, vr, hh){ const cw = C.width, dx0 = Math.round(X0 / PX) * PX, dx1 = Math.round(X1 / PX) * PX, ax = Math.max(0, dx0), bx = Math.min(W, dx1); if(bx <= ax || X1 <= X0) return;
  const su0 = (ax - X0) / (X1 - X0) * cw, su1 = (bx - X0) / (X1 - X0) * cw, u0 = Math.max(0, su0), u1 = Math.min(cw, su1); if(u1 - u0 <= 0) return;
  cx.drawImage(C, u0, vr, u1 - u0, 1, ax, r * PX, bx - ax, hh > 1 ? PX * hh : PX); }
// a light's reflection on the wet road: centred on its mirror image (base + height), broken row by row by the world-anchored wet mask
// (module-level run state, so a streak allocates nothing)
let SK_rs = -1, SK_I = 0, SK_W = 0, SK_X = 0, SK_A = 0;
function skFlush(re){ if(SK_rs >= 0 && SK_I > 0){ SA(Math.min(1, SK_A * SK_I)); cx.fillRect(Math.round((SK_X - SK_W / 2) / PX) * PX, SK_rs * PX, Math.max(PX, Math.round(SK_W / PX) * PX), (re - SK_rs) * PX); } }
function streak(T, lx, by, hL, w0, al){ if(hL < PX * 1.5 || al < .02) return; const ya = Math.ceil(by / PX), yb = Math.min(RN - 1, Math.floor((by + hL * 2.4) / PX)); SK_rs = -1; SK_I = 0; SK_W = 0; SK_X = lx; SK_A = al;
  for(let r = ya; r <= yb; r++){ if(r < 0) continue; let I = 0, ww = 0; if(ROWN[r] >= 0){ const u = (lx - ROWX[r]) / ROWW[r]; if(u > -1 && u < 1){ const j = ((r + .5) * PX - by) / hL, pr = j < 1 ? .35 + .65 * j : Math.max(0, 1 - (j - 1) / 1.4), m = maskAt(T, u, ROWV[r]);
        I = Math.round(pr * (.25 + .75 * m) * 4) / 4; ww = Math.round(Math.max(PX, w0 * (.7 + .6 * m)) / PX) * PX; } }
    if(I !== SK_I || ww !== SK_W){ skFlush(r); SK_rs = r; SK_I = I; SK_W = ww; } }
  skFlush(yb + 1); }

/* An env's own light pools: ENV[key].wetSrc(s, n, a, POOL) is called per segment in view (roads with pools > 0); POOL(lx, by, uw, h0, h1, w0, col,
   al) records the image of a light that stands h0..h1 (half-road widths x uw) above its base at screen (lx, by), w0 px wide, in its own colour.
   Such roads route their tail-light streaks through it too. Roads without pools keep streak() as before. */
const RV = { x:null, w:null, p:null, v:null, f:null, n:null, mask:(T, u, v) => maskAt(T, u, v) }, PK = { T:null, rf:0, lim:1, ph:0 };
/* Deferred: the sprite pass clips each segment's hook to the rows above the road in front of it (cx.rect(0, 0, W, s.clip)), so a light's image,
   which lies on nearer rows, cannot be drawn from its own segment. POOL records it; every nearer segment then draws the rows of it that fall in
   its own rows (drawPools), after its material, so the water's image sits on the surface and every nearer prop and car still covers it. */
const PLM = 1024, PLX = new Float32Array(PLM), PLB = new Float32Array(PLM), PLU = new Float32Array(PLM), PLH0 = new Float32Array(PLM), PLH1 = new Float32Array(PLM), PLW = new Float32Array(PLM), PLA = new Float32Array(PLM), PLL = new Float32Array(PLM), PLYA = new Int16Array(PLM), PLYB = new Int16Array(PLM), PLC = new Array(PLM).fill(''), PLT = new Array(PLM).fill(null);
let PLN = 0;
const PLF = new Uint8Array(PLM), PLG = new Float32Array(PLM), PLP = new Array(PLM).fill(null); let PLHOT = 0, PLLG = 0, PLL0 = -1, PLL1 = -1;   // (PLL0..PLL1: the late pools' index range this frame)   // hot roads: flags (1 hot, 2 late, 4 long), the ground band's strength, a facade's profile
function POOL(lx, by, uw, h0, h1, w0, col, al, prof, gi){ al *= PK.rf; if(PLN >= PLM || al < .02 || !(w0 >= PX * .6) || !(uw > 0) || !(lx === lx) || !(by === by)) return;
  if(PK.hot){ if(!(by < H)) return; w0 = Math.min(w0, W * .16); const top = prof ? prof.top : h1, lg = !prof && PK.n < 60 && PLLG < 40 && al >= HOT_LONG && w0 <= uw * .95 && w0 < W * .1 ? 4 : 0, ya = Math.max(0, Math.ceil((by + h0 * HOT_S * uw) / PX)), yb = lg ? RN - 1 : Math.min(RN - 1, Math.floor((by + (top * HOT_S + .25) * uw) / PX)); if(yb < ya) return; const k = PLN++;
    PLX[k] = lx; PLB[k] = by; PLU[k] = uw; PLH0[k] = h0; PLH1[k] = h1; PLW[k] = w0; PLA[k] = al; PLL[k] = PK.lim; PLYA[k] = ya; PLYB[k] = yb; PLC[k] = col; PLT[k] = PK.T; PLF[k] = 1 | (PK.late ? 2 : 0) | lg; if(lg) PLLG++; if(PK.late){ if(PLL0 < 0) PLL0 = k; PLL1 = k; } PLP[k] = prof || null; PLG[k] = gi === undefined ? 1 : gi; PLHOT = 1; return; }
  w0 = Math.min(w0, W * .12); const ya = Math.max(0, Math.ceil((by + h0 * uw * .9) / PX)), yb = Math.min(RN - 1, Math.floor((by + (h1 * 1.9 + .25) * uw) / PX)); if(yb < ya) return; const k = PLN++;
  PLX[k] = lx; PLB[k] = by; PLU[k] = uw; PLH0[k] = h0; PLH1[k] = h1; PLW[k] = w0; PLA[k] = al; PLL[k] = PK.lim; PLYA[k] = ya; PLYB[k] = yb; PLC[k] = col; PLT[k] = PK.T; PLF[k] = 0; }
/* Dark breaks (hot roads): what stands between a light and the water (a car, a pole, a pedestrian) mirrors as a dark upright that cuts the
   columns behind it. DARK records one (base at screen (lx, by), h half-road widths tall, w px wide); drawPools lays it after the columns. */
const DKM = 256, DKX = new Float32Array(DKM), DKB = new Float32Array(DKM), DKW = new Float32Array(DKM), DKA = new Float32Array(DKM), DKYA = new Int16Array(DKM), DKYB = new Int16Array(DKM); let DKN = 0;
function DARK(lx, by, uw, h, w, al){ if(!PK.hot || DKN >= DKM || !(uw > 0) || !(lx === lx) || !(by === by) || by >= H) return; const ya = Math.max(0, Math.ceil(by / PX)), yb = Math.min(RN - 1, Math.floor((by + h * HOT_S * uw) / PX)); if(yb < ya) return;
  const k = DKN++; DKX[k] = lx; DKB[k] = by; DKW[k] = Math.max(PX, Math.round(Math.min(w, W * .1) / PX) * PX); DKA[k] = al; DKYA[k] = ya; DKYB[k] = yb; PLHOT = 1; }
POOL.dark = DARK;
let PL_rs = -1, PL_I = 0, PL_W = 0, PL_X = 0, PL_lx = 0, PL_a = 0;
/* (fill pass) The fringe used to be laid under the whole core too, so a wide column paid for its core twice. Where the summed alpha doesn't clip,
   the fringe is now its two sides and the core one rect at the core's alpha plus the fringe's: 'lighter' adds linearly, so the pixels are the
   same (to a level of 8-bit rounding) for 1.8 widths of fill instead of 2.8. */
function poolFlush(re){ if(PL_rs >= 0 && PL_I > 0){ const x = PL_lx + PL_X, a = PL_a * PL_I, y = PL_rs * PX, h = (re - PL_rs) * PX, x1 = Math.round((x - PL_W / 2) / PX) * PX;
    if(PL_W >= PX * 10){ const w2 = Math.round(PL_W * 1.8 / PX) * PX, x2 = Math.round((x - w2 / 2) / PX) * PX, xr = x1 + PL_W, er = x2 + w2;
      if(a * 1.28 <= 1 && x2 <= x1 && er >= xr){ SA(a * .28); if(x1 > x2) cx.fillRect(x2, y, x1 - x2, h); if(er > xr) cx.fillRect(xr, y, er - xr, h); SA(a * 1.28); cx.fillRect(x1, y, PL_W, h); return; }
      SA(Math.min(1, a)); cx.fillRect(x1, y, PL_W, h); SA(Math.min(1, a * .28)); cx.fillRect(x2, y, w2, h); return; }
    SA(Math.min(1, a)); cx.fillRect(x1, y, PL_W, h); } }
/* One pool's rows inside [r0, r1]: the mirror image of a light standing h0..h1 above its base, stretched toward the viewer (to ~1.9x its height),
   full in the puddles and thinner on the film, shivering sideways in the ripples except where the water is deep; out to its limit across (the
   pavements' puddles are the road's mask, mirrored). Runs of equal rows are one rect, with a dimmer wider fringe near by (a rough mirror's spread). */
/* (perf pass) A far pool (its road under 48 px a side) is sampled on even screen rows only, each sample held for two rows: half the rects where
   a row is already finer than the mask, and the same whole-pixel grid. The colour is set only when it changes (pools come in runs of one light). */
const PL_HALF = 48;
function drawPools(r0, r1){ const c0 = cx.fillStyle; let cc = '';
  if(PLHOT){ hotPools(r0, r1); cx.fillStyle = c0; return; }
  for(let k = 0; k < PLN; k++){ if(PLYB[k] < r0 || PLYA[k] > r1) continue; cc = plainPool(k, r0, r1, cc); }
  cx.fillStyle = c0; }
function plainPool(k, r0, r1, cc){ {
    const lx = PLX[k], by = PLB[k], uw = PLU[k], h0 = PLH0[k], h1 = PLH1[k], w0 = PLW[k], lim = PLL[k], T = PLT[k];
    const yt = by + h0 * uw * .9, ym = by + (h0 + h1) * .5 * uw, ye = by + (h1 * 1.9 + .25) * uw, dm = Math.max(1, ym - yt), de = Math.max(1, ye - ym), ra = Math.max(r0, PLYA[k]), rb = Math.min(r1, PLYB[k]), half = uw < PL_HALF;
    if(PLC[k] !== cc){ cc = PLC[k]; cx.fillStyle = cc; } PL_rs = -1; PL_I = 0; PL_W = 0; PL_X = 0; PL_lx = lx; PL_a = PLA[k];
    for(let r = ra; r <= rb; r++){ if(half && (r & 1) && r > ra) continue; let I = 0, ww = 0, ox = 0;
      if(ROWN[r] >= 0){ const u = (lx - ROWX[r]) / ROWW[r], au = u < 0 ? -u : u;
        if(au < lim){ const yc = (r + .5) * PX, pr = yc < ym ? .45 + .55 * (yc - yt) / dm : Math.max(0, 1 - (yc - ym) / de), m = maskAt(T, au <= 1 ? u : (u > 0 ? 2 - au : au - 2), ROWV[r]);
          I = pr * (.3 + .7 * m) > .62 ? 1 : pr * (.3 + .7 * m) > .28 ? .5 : 0; if(I > 0){ ww = Math.round(Math.max(PX, w0 * (.7 + .5 * m)) / PX) * PX; if(m < .8) ox = Math.round((ih((ROWV[r] / 4) | 0, PK.ph, 5) - .5) * w0 * .3 / PX) * PX; } } }
      if(I !== PL_I || ww !== PL_W || ox !== PL_X){ poolFlush(r); PL_rs = r; PL_I = I; PL_W = ww; PL_X = ox; } }
    poolFlush(rb + 1); }
  return cc; }
/* Hot roads (Akihabara; Kellan's palette-knife reference): a light's image is as bright as the light, white-hot where the water stands deep
   and its own colour at the edges; it runs from the light's base to the foot of the frame, widening as it nears, broken into chunky dashes
   where the film thins (world-anchored, so the dashes ride with the road); a facade's profile (prof) paints its bands in order down the
   column (the shop floor nearest the base, then the fascia, then the signs), so a konbini reads as its white glass and its livery stripes.
   Each pool's runs are buffered, then drawn as two passes (a wide fringe in the colour, a narrow core, whitened where deep): two colour
   changes per band, not per run. Dark breaks go between the lights' columns and the tail lights'. */
const HOT_S = 1.7, HOT_LONG = .6, HOT_G = 1.3, HRM = 1024, HRS = new Int16Array(HRM), HRE = new Int16Array(HRM), HRX = new Float32Array(HRM), HRW = new Float32Array(HRM), HRA = new Float32Array(HRM), HRI = new Float32Array(HRM), HRB = new Int8Array(HRM), HRM2 = new Uint8Array(HRM);
const HOTC = new Map(); let PLCC = '';
const hotCol = c => { let h = HOTC.get(c); if(h === undefined){ if(HOTC.size > 400) HOTC.clear(); h = mixHex(c, '#ffffff', .45); HOTC.set(c, h); } return h; };
const fillC = c => { if(c !== PLCC){ PLCC = c; cx.fillStyle = c; } };
function hotPools(r0, r1){ PLCC = ''; let cc = '';
  for(let k = 0; k < PLN; k++){ if(PLYB[k] < r0 || PLYA[k] > r1 || (PLF[k] & 2)) continue; if(PLF[k] & 1) hotPool(k, r0, r1); else { cc = plainPool(k, r0, r1, PLCC); PLCC = cc; } }
  if(DKN){ cx.globalCompositeOperation = 'source-over'; fillC('#05060c');
    for(let k = 0; k < DKN; k++){ const ra = Math.max(r0, DKYA[k]), rb = Math.min(r1, DKYB[k]); if(rb < ra) continue; SA(DKA[k]); cx.fillRect(Math.round((DKX[k] - DKW[k] / 2) / PX) * PX, ra * PX, DKW[k], (rb - ra + 1) * PX); }
    cx.globalCompositeOperation = 'lighter'; }
  if(PLL0 >= 0) for(let k = PLL0; k <= PLL1; k++){ if(PLYB[k] < r0 || PLYA[k] > r1 || !(PLF[k] & 2)) continue; hotPool(k, r0, r1); } }
function hotPool(k, r0, r1){ const lx = PLX[k], by = PLB[k], uw = PLU[k], h0 = PLH0[k], h1 = PLH1[k], w0 = PLW[k], lim = PLL[k], T = PLT[k], pf = PLP[k], al = PLA[k], lg = PLF[k] & 4;
  const ra = Math.max(r0, PLYA[k]), rb = Math.min(r1, PLYB[k]), half = uw < PL_HALF, su = HOT_S * uw, top = pf ? pf.top : h1, yTop = by + top * su, yEnd = RN * PX, span = Math.max(PX, yEnd - by), dTail = Math.max(PX, yEnd - yTop);
  let n = 0, rs = -1, cI = 0, cW = 0, cX = 0, cB = -1;
  for(let r = ra; r <= rb + 1; r++){ if(r <= rb && (r & 1) && r > ra && (half || (r + .5) * PX > yTop)) continue;   // (far pools and every tail: sampled on even rows, each held two: chunky dashes, half the runs)
    let I = 0, ww = 0, ox = 0, bd = -1;
    if(r <= rb && ROWN[r] >= 0){ const u = (lx - ROWX[r]) / ROWW[r], au = u < 0 ? -u : u;
      if(au < lim){ const yc = (r + .5) * PX, hm = (yc - by) / su; let bI = 0;
        if(hm >= h0 && hm <= top){ if(pf){ for(let q = 0; q < pf.n; q++) if(hm >= pf.h0[q] && hm < pf.h1[q]){ bd = q; break; } bI = bd < 0 ? 0 : pf.i[bd] < 0 ? PLG[k] : pf.i[bd]; } else bI = 1; }
        else if(hm > top && lg){ bd = pf ? pf.tb : -1; bI = (pf ? (pf.i[bd] < 0 ? PLG[k] : pf.i[bd]) : 1) * 1.15 * (1 - .65 * (yc - yTop) / dTail); }
        if(bI > 0){ const m = maskAt(T, au <= 1 ? u : (u > 0 ? 2 - au : au - 2), ROWV[r]), vr = (ROWV[r] / 4) | 0; let wf = m >= .7 ? 1 : m >= .38 ? .85 : .7;
          if(m < .7 && ih(vr >> 1, ((u + 3) * 6) | 0, 7) < (m < .38 ? (hm > top ? .4 : .25) : .12)) wf = 0;   // the dashes: the film breaks where no water stands
          const v = bI * wf; I = v > .8 ? 1 : v > .56 ? .72 : v > .34 ? .48 : v > .15 ? .26 : 0;
          if(I > 0){ const t = (yc - by) / span; ww = Math.round(Math.max(PX, w0 * (.75 + .4 * m) * (1 + 1.1 * t)) / PX) * PX; if(m < .8) ox = Math.round((ih(vr, PK.ph, 5) - .5) * ww * .3 / PX) * PX; } } } }
    if(I !== cI || ww !== cW || ox !== cX || bd !== cB || r > rb){ if(rs >= 0 && cI > 0 && n < HRM){ HRS[n] = rs; HRE[n] = r; HRX[n] = lx + cX; HRW[n] = cW; HRA[n] = al * cI; HRI[n] = cI; HRB[n] = cB; n++; } rs = r; cI = I; cW = ww; cX = ox; cB = bd; } }
  if(!n) return;
  for(let q = 0; q < n; q++){ const w = HRW[q]; HRM2[q] = 0; if(w < PX * 3 || HRI[q] < .72) continue; const w2 = Math.round(w * 1.6 / PX) * PX, x2 = Math.round((HRX[q] - w2 / 2) / PX) * PX, x1 = Math.round((HRX[q] - w / 2) / PX) * PX, y = HRS[q] * PX, h = (HRE[q] - HRS[q]) * PX;
    fillC(HRB[q] < 0 || !pf.c[HRB[q]] ? PLC[k] : pf.c[HRB[q]]); SA(Math.min(1, HRA[q] * .38));
    if(!(HRI[q] === 1 && w >= PX * 2 && HRA[q] >= .7) && HRA[q] * (HOT_G + .38) <= 1 && x2 <= x1 && x2 + w2 >= x1 + w){ HRM2[q] = 1; if(x1 > x2) cx.fillRect(x2, y, x1 - x2, h); if(x2 + w2 > x1 + w) cx.fillRect(x1 + w, y, x2 + w2 - x1 - w, h); }   // (same colour core: the fringe's sides only, the core takes its alpha: the fill pass above)
    else cx.fillRect(x2, y, w2, h); }
  for(let q = 0; q < n; q++){ const c = HRB[q] < 0 || !pf.c[HRB[q]] ? PLC[k] : pf.c[HRB[q]], w = HRW[q]; fillC(HRI[q] === 1 && w >= PX * 2 && HRA[q] >= .7 ? hotCol(c) : c); SA(Math.min(1, HRA[q] * (HRM2[q] ? HOT_G + .38 : HOT_G))); cx.fillRect(Math.round((HRX[q] - w / 2) / PX) * PX, HRS[q] * PX, w, (HRE[q] - HRS[q]) * PX); } }

// ---------------------------------------------------------------- the lab (roadlab.html): postMessage, same origin only
if(LAB){ const C = RM.lab = { freeze:false, pos:-1, x:null, speed:-1, pitch:null, night:null, traffic:true };
  const reply = (src, o) => { try{ src.postMessage(Object.assign({ ns:'roadmat' }, o), location.origin); }catch(e){} };
  const state0 = () => ({ cmd:'state', on:RM.on, ready:RM.ready, roads:JSON.parse(JSON.stringify(ROADS)), fields:JSON.parse(JSON.stringify(FIELD)), roadsD:ROADS_D, fieldsD:FIELD_D, schema:SCHEMA, mats:MATS, keys:KEYS,
    land:typeof LAND0 !== 'undefined' ? LANDS[LAND0].key : null, segs:typeof segs !== 'undefined' ? segs.length : 0, stats:RM.stats, pos:typeof position !== 'undefined' ? position / SEG : 0 });
  addEventListener('message', e => { if(e.origin !== location.origin) return; const d = e.data; if(!d || d.ns !== 'roadmat') return;
    if(d.cmd === 'get'){ reply(e.source, state0()); return; }
    if(d.cmd === 'on'){ RM.on = !!d.on; applyRoadCols(); }
    if(d.cmd === 'road' && KEYS.includes(d.key) && d.preset){ ROADS[d.key] = d.preset; resolve(d.key); DCELL.delete(d.key); for(const sg of segs) if(sg && sg.rmDk === d.key) sg.rmDk = null; refresh(true); }
    if(d.cmd === 'field' && FIELD[d.type] && d.params){ Object.assign(FIELD[d.type], d.params); refresh(true); }
    if(d.cmd === 'cam' && d.cam) Object.assign(C, d.cam);
    if(d.cmd === 'stats'){ reply(e.source, { cmd:'stats', stats:RM.stats, pos:position / SEG, segs:segs.length, speed }); return; }
    reply(e.source, { cmd:'ok', of:d.cmd }); });
  const tick = () => { requestAnimationFrame(tick); if(typeof state === 'undefined' || state !== 'play') return;
    TIME.scale = C.freeze ? 0 : 1;
    if(C.pos >= 0){ position = Math.max(0, Math.min((segs.length - DRAW - 20) * SEG, C.pos * SEG)); C.pos = -1; }
    if(C.x !== null) playerX = C.x; if(C.speed >= 0 && !C.freeze) speed = C.speed * 45; if(C.pitch !== null) CAM.pitch = C.pitch;
    if(C.night !== null){ sunLeft = sunShown = (1 - C.night) * SUN_MAX; } if(!C.traffic) cars.length = 0; };
  const hook = () => { window.pauseOpen = function(){}; requestAnimationFrame(tick); };   // the lab's controls take focus: never pause on blur
  if(document.readyState === 'complete') hook(); else addEventListener('load', hook); }
// injected after load (the lab before the core loads this file): warm now
if(document.readyState === 'complete' && typeof warmEngine === 'function') setTimeout(() => { PRESETS_IN = PRESETS_IN || presetWait > 0; refresh(true); }, 60);
})();
