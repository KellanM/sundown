/* Sundown set piece module: the Refinery chain-reaction fireball escape (MECH.sp_fire). See setpiece/README.md.
   Load after mech/director.js:   <script src="setpiece/fireball.js"></script>

   爆発 INFERNO. On Refinery Docks a flare stack blows behind you and the tank farm goes up in a chain: a fire front rolls up the road
   behind you, tanks burst left and right just ahead of it, pipe racks fold, fireballs roll overhead. Hold your speed (or boost) and you
   pull away; drop under about 75% and it gains. If it reaches you it's a "scorched" crash (the normal crash, never an instant end) and
   the fire then hangs back for a few seconds. It ends at the checkpoint gate: the last tank goes up behind you and the sky turns orange.

   Scheduling: by world position on the refinery road. The escape runs from S (about 420 segments before the next checkpoint gate) to that
   gate E. MECH.director.request('fireball', { tier:'hero', seg:S }) decides whether it happens on this visit (the catalogue id is
   'fireball'); DIR.cine() runs the letterbox, music duck and the 爆発 INFERNO card.
   The tanks, spheres, flare stacks and pipe racks that env/refinery.js places on the segments are read straight from s.sprites, and the
   explosions happen on them (refinery.js itself is not touched).

   References looked at (rules taken, nothing copied):
   - Split/Second (Black Rock 2010) detonations: the blast is staged beside and just ahead of the player, never on them; the first frame
     is a white flash shape, then a rolling orange body with black smoke boiling out of its top.
     -> bursts trigger slightly ahead of the fire front so they happen beside you; frame 0 is a white-hot disc.
   - Burnout 3 (Criterion 2004) crashes: a fireball reads by its hard bright core and a dark smoke crown; sparks and debris carry the speed.
     -> 5 tones per fireball (white, yellow, orange, red, smoke), embers and chunks thrown outward.
   - MotorStorm: Apocalypse (Evolution 2011): the chasing collapse is mostly felt, not seen: light washing forward, debris passing you,
     the camera shaking from behind. -> the front itself stays behind the camera; you see its light on the road, flames licking in at
     the screen corners, fireballs rolling overhead.
   - Akira (1988, reference only): explosions as hard-edged domes with a bright rim and flat colour bands, a shockwave ring on the ground,
     the whole sky taking the explosion's colour. -> flat stepped bands, no gradients, a ground ring per burst, the orange sky finale.
   - Metal Slug (SNK/Nazca) explosion sprites: lumpy outlines built from overlapping circles, 4-5 colours, the core shrinks and the smoke
     grows across 6-8 frames; holes open as it dissipates. -> procedural lumpy fireballs, 6 frames, holes in the late frames.
   - Refinery fire photographs (Wikimedia Commons, e.g. the 2005 Buncefield depot fire): fire boils at the tank tops into a thick black
     plume; the plume underside is lit orange; everything at ground level is silhouetted against the glow.
     -> a burning tank keeps a flame crown and a rising black plume lit orange from beneath; the light washes the road from behind.
   Fairness: the front gains only below ~75% speed; it starts 45 segments back and never falls more than 70 behind (tension, not a cheap
   catch); after a catch it holds back for 4 s; the zone is cleared of traffic and oil, and boost pads are placed along it.
   Reduced motion: no flashes, gentler shake, steady flames, no heat haze.

   Burning debris (the dodge): flaming tank plates, burning drums and fire blobs are thrown out of tanks bursting ahead and slam onto
   the road at a segment and a lateral spot. Each one is telegraphed: a red ring grows and pulses on the asphalt where it will land
   (from ~84 segments / ~1.5 s out at full speed), a shadow tightens under it as it falls, and you see it arc in from the roadside.
   It lands in a fireball with a shockwave ring and bouncing chunks, then leaves a burning patch (flames in 4 tones over a dark
   outline, heat shimmer) on a crater scorch that outlasts it. Riding into a burning patch is the "scorched" crash, as for the front.
   Fairness: landings come in rows on three lateral spots and a row never covers more than two, so a corridor is always open; between
   rows the open corridor moves by at most one spot; and when a row launches, if the open corridor is out of steering reach from
   where you are (lateral speed 2 x speed share, at 60% of the time left), the landing nearest you is thrown wide onto the shoulder
   instead. Sparse singles first (aimed at the last open corridor, so you have to move), then mixed rows, then a closely spaced final
   barrage that ends ~40 segments before the gate. ASSIST.generous (or ASSIST.jumps, "generous landings") launches earlier, flies
   longer and spaces rows wider; ASSIST.contrast rings the rings and patches in yellow/black; ASSIST.noFlash (reduce) stops pulses,
   flicker, shimmer and flashes.
   Debris references (rules taken, nothing copied): Burnout 3's crash debris (chunks tumble and bounce, the burning part reads by its
   hot edge); Metal Slug's bomb drops (the target mark on the ground first, the shadow tightening, then the hit); Ikaruga/Treasure
   telegraphs (a growing pulsing marker you can read in peripheral vision). */
"use strict";
(() => {
  const F = MECH.sp_fire = {};   // F.S: the sprite cache (for contact sheets)
  const H1 = n => { const s = Math.sin(n * 91.345 + 47.853) * 43758.5453; return s - Math.floor(s); };
  const snap = v => Math.round(v / PX) * PX;
  const sm = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
  const LEN = 420, LEAD = 46, START_GAP = 45, MAX_GAP = 52, FIRE_V = .76, GRACE = 4;   // segments; fire speed as a share of MAXS
  const S = {};
  const zones = [];
  let Tg = 0, cut = null, cardT = 0, rumbleT = 0, catches = 0, escapes = 0;

  // ---------------------------------------------------------------- sprites (built in warm)
  // A fireball built the way the photographs show it (Commons fireball / fuel-fire stills): a cluster of round billows, each shaded as a
  // ball lit from the hot core, so the bands (white, yellow, orange, red, dark red) follow the billows and the crevices between them go
  // dark; a bright rim where it meets the night; a smoke crown that rolls up and over from frame 3; holes opening in the last frames.
  // 8 frames, two art sizes (48 and 96 px) so a near burst never upscales past ~1.5x. Painted through ImageData (fast, no fillStyle churn).
  const vn = (x, y, f) => { const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy), h = (a, b) => H1(a * 7.1 + b * 13.3 + f * 3.7);
    return (h(ix, iy) * (1 - fx) + h(ix + 1, iy) * fx) * (1 - fy) + (h(ix, iy + 1) * (1 - fx) + h(ix + 1, iy + 1) * fx) * fy; };
  const BALL_RAMP = [[255, 255, 248], [255, 236, 140], [255, 196, 64], [255, 130, 32], [224, 64, 28], [150, 34, 22], [84, 22, 20]];
  // smoke: black-violet, lit orange only on the undersides that face the fire (index 0-1); everything facing up or out is near-black
  const SMOKE_RAMP = [[196, 88, 36], [104, 40, 36], [40, 24, 46], [26, 17, 34], [16, 11, 23], [8, 6, 13]];
  function ballCanvas(N, f){ const c = document.createElement('canvas'); c.width = N; c.height = N; const k = c.getContext('2d'), img = k.createImageData(N, N), d = img.data;
    const R = N * .46 * [.36, .6, .78, .9, .97, 1, 1, 1][f], cx0 = N / 2, cy0 = N * .56 - f * N * .012, heat = [1, .95, .86, .72, .58, .44, .3, .18][f], B = [];
    // billows: a core ball, a middle ring and an outer ring of smaller lumps (the cauliflower silhouette); the top ones turn to smoke
    const rings = [[1, 0, .46], [7, .34, .3], [13, .66, .24]];
    for(const [cnt, dist, rad] of rings) for(let i = 0; i < cnt; i++){ const an = i / cnt * 6.283 + H1(i * 3.1 + cnt) * .45 + cnt, dd = dist * R * (.9 + H1(i * 5.7 + cnt) * .2), rr = rad * R * (.85 + H1(i * 7.9 + cnt) * .35);
      const by = cy0 + Math.sin(an) * dd * .88 - (f >= 2 ? (f - 1) * .028 * N * (Math.sin(an) < 0 ? 1.3 : .35) : 0);
      B.push({ x:cx0 + Math.cos(an) * dd, y:by, r:rr, smoke:f >= 3 && (by < cy0 - R * (.6 - f * .055) || f >= 6 && H1(i * 1.3 + cnt) < (f - 5) * .3) }); }
    // the crown: smoke billows rolling up and over the top
    if(f >= 3) for(let i = 0; i < 3 + (f - 3); i++){ const an = -Math.PI / 2 + (i - (f - 1) / 2) * .55; B.push({ x:cx0 + Math.cos(an) * R * .62, y:cy0 + Math.sin(an) * R * (.72 + f * .05), r:R * (.22 + H1(i * 4.1) * .08 + f * .012), smoke:true }); }
    const idx = new Int8Array(N * N).fill(-1), sm2 = new Uint8Array(N * N);
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const px = x + .5, py = y + .5; let best = -1, bv = 0, bb = null;
      for(const b of B){ const dx = px - b.x, dy = py - b.y, v = 1 - (dx * dx + dy * dy) / (b.r * b.r); if(v > bv){ bv = v; bb = b; } }
      if(!bb) continue;
      if(f >= 6 && vn(x / (N / 9), y / (N / 9), f) > (f === 6 ? .7 : .56)) continue;   // holes as it breaks up: soft-edged blobs (value noise), not square cells
      // the billow as a ball: its normal against the direction to the hot core
      const nx = (px - bb.x) / bb.r, ny = (py - bb.y) / bb.r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lx = cx0 - bb.x, ly = cy0 - bb.y, ll = Math.hypot(lx, ly) || 1;
      const lam = .55 + .45 * (nx * lx / ll + ny * ly / ll) * .8 + .25 * nz, dc = Math.hypot(px - cx0, py - cy0) / R;
      const crev = bv < .2;   // the crevice where one billow tucks under the next
      if(bb.smoke){ const under = clamp(ny * .9 + (py > cy0 - R * .5 ? .35 : 0), 0, 1); let q = Math.round(2.4 + (1 - nz) * 1.8 - under * 2.7 - nz * .4 + (crev ? 1.2 : 0)); idx[y * N + x] = Math.min(5, Math.max(0, q)); sm2[y * N + x] = 1; }
      else { const lamB = clamp(.25 + .55 * (nx * lx / ll + ny * ly / ll) + .45 * nz, 0, 1), I = heat * (1.02 - dc * .42) * (.3 + .7 * lamB) - (crev ? .22 : 0); idx[y * N + x] = I > .86 ? 0 : I > .7 ? 1 : I > .55 ? 2 : I > .41 ? 3 : I > .28 ? 4 : I > .16 ? 5 : 6; } }
    for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){ const p = y * N + x; let q = idx[p]; if(q < 0) continue;
      const edge = (x === 0 || idx[p - 1] < 0) || (x === N - 1 || idx[p + 1] < 0) || (y === 0 || idx[p - N] < 0) || (y === N - 1 || idx[p + N] < 0);
      let col; if(sm2[p]){ col = SMOKE_RAMP[edge ? 5 : q]; } else { if(edge) q = Math.max(0, q - 1); col = BALL_RAMP[q]; }   // the bright rim against the night
      d[p * 4] = col[0]; d[p * 4 + 1] = col[1]; d[p * 4 + 2] = col[2]; d[p * 4 + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // rolling smoke billows: black-violet, lit orange only from beneath (p: near the fire), or not at all (q: high in the plume); three sizes
  // Every effect sprite comes in two art sizes: the base one, and an 'L' one painted at 2-3x resolution (not an upscale: the shape
  // functions take continuous coordinates), used once the base would be stretched past 1.5 canvas px per art px; both are capped there.
  const puffSpr = (n, lit, s = 1) => procSprite('fb_puff' + (lit ? '' : 'u') + n + '_' + s, (10 + n * 8) * s, (10 + n * 8) * s, (x0, y0) => { const x = (x0 + .5) / s - .5, y = (y0 + .5) / s - .5, R = 5 + n * 4, dx = x + .5 - R, dy = y + .5 - R, an = Math.atan2(dy, dx), lump = 1 + .1 * Math.sin(an * 6 + n) + .06 * Math.sin(an * 11 + n * 2), d = Math.hypot(dx, dy) / R;
    if(d > lump) return null; const ny = dy / R, edge = d > lump - .14 / s;
    if(lit){ if(ny > .5) return edge ? '#6a2414' : '#b8501e'; if(ny > .22) return edge ? '#1e1018' : '#4a1e22'; }
    else if(ny > .4) return edge ? '#0a070e' : '#221828';
    return edge ? '#07050b' : d < .4 && ny < -.2 ? '#261d30' : (x0 * 3 + y0 * 5) % 9 ? '#140f1c' : '#1c1626'; });
  // tall flames for burning tanks and the screen corners: 3 frames
  const flameSpr = (f, s = 1) => procSprite('fb_flame' + f + '_' + s, 16 * s, 30 * s, (x0, y0) => { const x = (x0 + .5) / s - .5, y = (y0 + .5) / s - .5, cxp = 8 + Math.sin(y * .45 + f * 2.1) * (1 - y / 30) * 3, w = Math.pow(Math.max(0, y) / 30, .7) * 7 * (1 - Math.pow(Math.max(0, y - 24) / 6, 2) * .3), dx = Math.abs(x + .5 - cxp);
    if(y < 2 + f * 2 || dx > w) return null; const q = dx / Math.max(.5, w), o = dx > w - .8 / s; return o ? '#6a1a10' : q < .3 && y > 12 ? '#fff4c0' : q < .6 ? '#ffc040' : y < 14 ? '#ff6a1a' : q < .85 ? '#ff7a20' : '#c8301e'; });
  // the shockwave ring laid on the ground: an ellipse two pixels thick with a bright inner edge
  const ringSpr = (s = 1) => procSprite('fb_ring_' + s, 80 * s, 20 * s, (x, y) => { const dx = (x + .5 - 40 * s) / (39 * s), dy = (y + .5 - 10 * s) / (9.5 * s), d = Math.hypot(dx, dy); if(d > 1 || d < 1 - .18 / Math.sqrt(s)) return null; return d < 1 - .12 / Math.sqrt(s) ? '#fff0c0' : '#ff9a3a'; });
  // a bent pipe-rack section falling: two tubes and a cross-brace, three tones
  const rackSpr = (s = 1) => procSprite('fb_rack_' + s, 40 * s, 12 * s, (x0, y0) => { const x = x0 / s, y = (y0 + .5) / s; if(y >= 2 && y < 5 || y >= 7 && y < 10){ const t = (y - (y < 6 ? 2 : 7)) / 3; return t < .34 ? '#d07a3a' : t < .67 ? '#8a92a8' : '#3c3a48'; } if(Math.floor(x) % 10 === 3 && y < 12) return '#262634'; return null; });
  const LS = { p:2, q:2, f:3, ring:3, rack:3 };
  // blit a base sprite at k (css px per base art px), switching to its L version past 1.5 and never stretching either past 1.5
  function bl(key, x, y, k){ let spr = S[key]; const L = S[key + 'L']; if(L && k / PX > 1.5){ k = k * spr.width / L.width; spr = L; } blit(spr, x, y, Math.min(k, PX * 1.5)); }
  const emberCol = ['#ffe070', '#ff9a2a', '#ff5a1a'];
  // ---- the debris art: painted through ImageData with a dark-hue outline pass (no pure black), each in two art sizes (small / big)
  const hx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  function pix(w, h, fn, ol){ const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), img = k.createImageData(w, h), d = img.data, C = new Array(w * h).fill(null);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) C[y * w + x] = fn(x, y);
    if(ol) for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const p = y * w + x; if(C[p]) continue; const on = q => C[q] && C[q] !== ol;
      if((x > 0 && on(p - 1)) || (x < w - 1 && on(p + 1)) || (y > 0 && on(p - w)) || (y < h - 1 && on(p + w))) C[p] = ol; }
    for(let p = 0; p < w * h; p++){ if(!C[p]) continue; const v = hx(C[p]); d[p * 4] = v[0]; d[p * 4 + 1] = v[1]; d[p * 4 + 2] = v[2]; d[p * 4 + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // a torn, bent tank-wall plate (cream tank paint, grey, a charred hot torn edge); 4 tumble frames, rotated in the generator so it stays on the grid
  const chunkSpr = (N, r, charred) => pix(N, N, (x, y) => { const a = r * Math.PI / 4 + .35, c = Math.cos(a), s = Math.sin(a), px = (x + .5 - N / 2) / (N / 2 - 1.2), py = (y + .5 - N / 2) / (N / 2 - 1.2);
    const u = px * c + py * s, v = -px * s + py * c - .18 * (px * c + py * s) ** 2 + .07, jag = .74 + .2 * H1(Math.floor((v + 1) * 4) * 3.7 + r);
    if(Math.abs(u) > jag || Math.abs(v) > .33) return null;
    if(Math.abs(u) > jag - .24) return H1(x * 7.3 + y * 3.1 + r) > .62 ? '#ffc04a' : v < 0 ? '#ff6a1a' : '#5a2418';   // the hot torn edge
    return charred ? (v < -.11 ? '#6a5c64' : v < .09 ? '#3a3040' : '#221a28') : v < -.11 ? '#e8dfcc' : v < .09 ? '#a29a8c' : '#5c5466'; }, '#1a0c12');
  // a burning oil drum: red with two dark hoops and grey rims, tumbling end over end; 4 frames
  const drumSpr = (N, r) => pix(N, N, (x, y) => { const a = r * Math.PI / 4 + .2, c = Math.cos(a), s = Math.sin(a), px = (x + .5 - N / 2) / (N / 2 - 1.2), py = (y + .5 - N / 2) / (N / 2 - 1.2), u = px * c + py * s, v = -px * s + py * c, au = Math.abs(u);
    if(au > .8 || Math.abs(v) > .54) return null; if(au > .68) return v < -.2 ? '#b8b0c0' : '#6a6478'; if(Math.abs(au - .3) < .08) return '#3a1418';
    return v < -.26 ? '#ff8a4a' : v < .18 ? '#c8381e' : '#701a16'; }, '#1a080e');
  // a blazing fire blob: lumpy, hot core low in it, 2 flicker frames
  const blobSpr = (N, f) => pix(N, N, (x, y) => { const px = x + .5 - N / 2, py = y + .5 - N / 2, an = Math.atan2(py, px), R = (N / 2 - 1.2) * (.86 + .09 * Math.sin(an * 5 + f * 2.3) + .05 * Math.sin(an * 9 - f)), d = Math.hypot(px, py) / R;
    if(d > 1) return null; const q = d - py / R * .16; return q < .28 ? '#fff6d8' : q < .5 ? '#ffe070' : q < .72 ? '#ffa030' : q < .9 ? '#e8501e' : '#9a2414'; }, '#3a0a0c');
  // a patch flame: a tongue in 4 tones (white-yellow core, yellow, orange, red) over a dark red outline; 4 frames, odd frames forked at the tip
  const pflSpr = (Wd, Hh, f) => pix(Wd, Hh, (x, y) => { const t = y / (Hh - 1), cxp = Wd / 2 + Math.sin(t * 5 + f * 1.7) * (1 - t) * Wd * .17, w = (Wd / 2 - 1.2) * Math.pow(t, .62) * (1 - Math.max(0, t - .86) * 1.8), dx = Math.abs(x + .5 - cxp);
    if(t < .07 + (f % 2) * .06 || dx > w) return null; if(f % 2 && t < .32 && dx < w * .28) return null;
    const q = dx / Math.max(.5, w), hot = t * (1 - q * .9); return hot > .6 ? '#fff4c8' : hot > .4 ? '#ffd24a' : hot > .2 ? '#ff9a2a' : '#e8461c'; }, '#5a1410');
  // the hovering warning chevron over a landing spot (a down-pointing wedge, never a plus); hot and cool frames for the pulse
  const mkSpr = (N, hot) => pix(N, Math.ceil(N * .72), (x, y) => { const Hh = Math.ceil(N * .72), t = (y - 1) / (Hh - 3), half = (N / 2 - 1.2) * (1 - t), dx = Math.abs(x + .5 - N / 2);
    if(y < 1 || y > Hh - 2 || dx > half) return null; return y <= 1 + N / 10 ? (hot ? '#fff0b0' : '#ffb04a') : dx > half - 1.2 ? (hot ? '#ff8a2a' : '#c81e12') : hot ? '#ffd060' : '#ff3a1a'; }, '#2a0604');
  function warm(){ for(let f = 0; f < 8; f++){ S['b' + f] = ballCanvas(48, f); S['B' + f] = ballCanvas(96, f); } for(let n = 0; n < 3; n++){ S['p' + n] = puffSpr(n, true); S['q' + n] = puffSpr(n, false); S['p' + n + 'L'] = puffSpr(n, true, 2); S['q' + n + 'L'] = puffSpr(n, false, 2); }
    for(let f = 0; f < 3; f++){ S['f' + f] = flameSpr(f); S['f' + f + 'L'] = flameSpr(f, 3); } S.ring = ringSpr(); S.ringL = ringSpr(3); S.rack = rackSpr(); S.rackL = rackSpr(3);
    for(let r = 0; r < 4; r++){ S['dc0' + r] = chunkSpr(12, r); S['dc1' + r] = chunkSpr(28, r); S['dk0' + r] = chunkSpr(12, r, true); S['dk1' + r] = chunkSpr(28, r, true); S['dd0' + r] = drumSpr(12, r); S['dd1' + r] = drumSpr(26, r); S['pf0' + r] = pflSpr(8, 14, r); S['pf1' + r] = pflSpr(18, 32, r); }
    for(let f = 0; f < 2; f++){ S['db0' + f] = blobSpr(12, f); S['db1' + f] = blobSpr(28, f); S['mk0' + f] = mkSpr(9, f); S['mk1' + f] = mkSpr(17, f); }
    S.label = lbl('炎', '#ffb04a');
    try{ cx.save(); for(const k in S) cx.drawImage(S[k], 0, 0, 1, 1); cx.restore(); }catch(e){}   // upload the textures now, not mid-ride
    if(document.fonts && document.fonts.load) document.fonts.load('16px DotGothic16', '炎').then(() => { S.label = lbl('炎', '#ffb04a'); }).catch(() => {}); }
  function lbl(t, col){ const c = document.createElement('canvas'), k = c.getContext('2d'); k.font = '16px DotGothic16, monospace'; c.width = Math.ceil(k.measureText(t).width) + 2; c.height = 18;
    k.font = '16px DotGothic16, monospace'; k.textBaseline = 'middle'; k.fillStyle = col; k.fillText(t, 1, 9); const d = k.getImageData(0, 0, c.width, c.height); for(let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; k.putImageData(d, 0, 0); return c; }
  F.warm = () => { warm(); try{ const A = MECH.arrival; if(A && A.prebuild) A.prebuild('ESCAPED', { kanji:'脱', sub:'脱出', col:'#ffb04a', size:'m', idle:true }); }catch(e){} }; F.S = S;   // the finale callout is built ahead, so it never shows half-built
  addEventListener('load', () => { try{ if(!S.b0) warm(); }catch(e){ console.warn('sp_fire warm', e); } });

  // ---------------------------------------------------------------- placement
  // the zone: S..E, E being the next checkpoint gate at least LEN segments into the road (the escape ends as you clear it)
  const zoneOf = i => { for(let n = zones.length - 1; n >= 0; n--){ const z = zones[n]; if(i >= z.S - 80 && i <= z.E + 40) return z; } return null; };
  F.place = (i, s, L) => {
    if(i === 0) zones.length = 0;   // a new ride: the road is being built from scratch
    if(L.key === 'refinery'){ const rel = i - (typeof landStart === 'number' ? landStart : 0);
      // after setpiece/jump.js's refinery landmark jump (its pipeline jump sits ~230-330 segments into the road), ending at a gate
      if(rel === 60){ const after = i - rel + 370; let E = -1, S0 = -1; for(const g of gates){ if(g <= i + 180) continue; const gw = window.inForkWindow && inForkWindow(g) ? g - SPLIT_PRE - 40 : g;   // (?split=1: end before the fork's split window, not just its gate)
          let s0 = Math.max(i + 60, gw - 160 - LEN, after); for(const g2 of gates) if(g2 > s0 - 70 && g2 < s0 + 10) s0 = g2 + 70;   // not under a checkpoint's own callouts
          if(window.forkClear) s0 += forkClear(Math.min(s0 - 80, s0 - START_GAP), s0 + 10);
          if(gw - 160 - s0 >= 300 && !(window.inForkWindow && inForkWindow(Math.min(s0 - 80, s0 - START_GAP), gw - 45))){ E = gw - 85; S0 = s0; break; } }   // the end sits 85 before the gate (ESCAPED clears before the checkpoint callout): the time the 爆発 card holds everything back is added here, not cut from the run
        if(E > 0){ const DIR = MECH.director;
          if(!DIR || DIR.request('fireball', { tier:'hero', seg:S0 })){ zones.push({ S:S0, E, tanks:[], racks:[], flares:[], F:S0 - START_GAP, started:false, done:false, grace:0, pads:[S0 + 70, S0 + 170, S0 + 270, S0 + 350] }); if(zones.length > 6) zones.shift(); } } } }
    const z = zoneOf(i); if(!z) return;
    s.fbZ = z; s.skRes = 1; s.police = 1;
    const pv = segs[i - 1]; if(pv && pv.fbZ === z){ pv.hz = pv.fbPad ? { type:'pad', x:pv.fbPad } : null; }   // hazards are rolled after place(): fix up the previous segment
    if(z.pads.includes(i)) s.fbPad = [-.66, .66, 0, -.66][z.pads.indexOf(i)];
    if(i >= z.S - 60 && i <= z.E) for(const sp of s.sprites){ if(sp.env !== 'refinery') continue;
      if(sp.type === 'tank' || sp.type === 'sphere'){ if(!z.tanks.some(t => t.j === i && t.x === sp.x)) z.tanks.push({ j:i, x:sp.x, sph:sp.type === 'sphere', t:-1 }); }
      else if(sp.type === 'rack' && i % 15 === 0) z.racks.push({ j:i, x:sp.x, t:-1 });
      else if(sp.type === 'flare') z.flares.push({ j:i, x:sp.x, t:-1 }); } };
  F.dbg = S0 => { const E = S0 + LEN, z = { S:S0, E, tanks:[], racks:[], flares:[], F:S0 - START_GAP, started:false, done:false, grace:0, pads:[] }; zones.push(z);
    for(let i = Math.max(0, S0 - 80); i <= E + 40 && i < segs.length; i++){ const s = segs[i]; s.fbZ = z; s.skRes = 1; s.police = 1; if(s.hz && s.hz.type === 'oil') s.hz = null;
      if(i >= S0 - 60) for(const sp of s.sprites){ if(sp.env !== 'refinery') continue; if(sp.type === 'tank' || sp.type === 'sphere') z.tanks.push({ j:i, x:sp.x, sph:sp.type === 'sphere', t:-1 }); else if(sp.type === 'rack' && i % 15 === 0) z.racks.push({ j:i, x:sp.x, t:-1 }); else if(sp.type === 'flare') z.flares.push({ j:i, x:sp.x, t:-1 }); } }
    return z; };
  const live = z => z && segs[z.S] && segs[z.S].fbZ === z;
  function active(ps){ for(const z of zones) if(live(z) && ps > z.S - 120 && ps < z.E + 140) return z; return null; }

  // ---------------------------------------------------------------- sound
  const ac = () => typeof M !== 'undefined' && M.ac && state === 'play';
  function boom(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.6, 90, .22 * v, t0); M.noise(.6, 900, .08 * v, t0); M.tone(44, 1.2, { type:'sawtooth', v:.08 * v, fuzz:true, at:t0 }); }
  function bump(v){ shake = Math.max(shake || 0, reduce ? Math.min(2, v * .25) : v); }
  // the whistle of something falling in: a stepped triangle glide down (an 8-bit bomb drop), then the SFX whoosh peaking at the landing
  function whistle(pan, fly){ if(!ac()) return; const t0 = M.ac.currentTime, n = 7; for(let i = 0; i < n; i++) M.tone(1500 - i * 125, fly / n + .03, { type:'triangle', v:.016, at:t0 + i * fly / n, atk:.004 });
    try{ if(window.SFX && SFX.play) SFX.play('whoosh', { pan, k:.5, lead:.2, at:t0 + Math.max(0, fly - .2) }); }catch(e){} }
  function thud(pan, metal){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.9, 110, .13, t0); M.noise(.3, 1100, .05, t0); M.tone(52, .6, { type:'sawtooth', v:.05, fuzz:true, at:t0 });
    if(metal) try{ if(window.SFX && SFX.play) SFX.play('clank', { pan, k:.45, at:t0 + .05 }); }catch(e){} }

  // ---------------------------------------------------------------- burning debris: telegraphed landings on the road ahead
  // world units: x in half-road widths (the road is -1..1, the bike's collider ~.09 wide); along the road in segments
  const SPOTS = [-.62, 0, .62], HIT_R = .33, HIT_L = 2.2, PR = .3, PL = 2.8, KEEP = .38, ARC = 1800;
  const gen = () => !!(window.ASSIST && (ASSIST.generous || ASSIST.jumps));
  const contrast = () => !!(window.ASSIST && ASSIST.contrast);
  const DST = F.dstats = { hits:0, landed:0, rows:0, dropped:0, unfair:0, log:[] };
  function planDebris(z, a0){ const rows = [], L = z.E - a0, g2 = gen() ? 1.3 : 1, sd = z.S * .173 + Math.floor(Math.random() * 997) * 1.37; let j = a0 + 104, g = 1, n = 0;
    while(j < z.E - 36){ const r = (j - a0) / L, R = H1(sd + n * 7.7), ph = r < .32 ? 0 : r < .64 ? 1 : 2; let xs;
      if(ph === 0 || (ph === 1 && R < .4)){ // a single, usually aimed at the last open spot (so you have to move); the open spot moves next to it
        const k = H1(sd + n * 3.1) < .65 ? g : Math.floor(H1(sd + n * 5.3) * 3); xs = [SPOTS[k]]; g = k === 1 ? (H1(sd + n * 2.9) < .5 ? 0 : 2) : 1; }
      else { // two of three: the open spot moves by at most one (and usually does in the barrage)
        const mv = H1(sd + n * 4.3) < (ph === 2 ? .7 : .5); if(mv) g = g === 1 ? (H1(sd + n * 6.1) < .5 ? 0 : 2) : 1; xs = SPOTS.filter((x, k) => k !== g); }
      const ds = xs.map((x, i) => ({ x, x1:x, kind:H1(sd + n * 9.1 + i) < .4 ? 0 : H1(sd + n * 9.1 + i) < .72 ? 1 : 2, side:x < 0 ? -1 : x > 0 ? 1 : (H1(sd + n + i * 3) < .5 ? -1 : 1), st:0, t0:0, fly:.8, landT:0, hit:false, ghost:false, burn:false, seed:H1(sd + n * 1.7 + i * 5.1), j:0 }));
      // the barrage also throws a drum or blob onto the shoulder beside the road (never in reach: spectacle, not a hazard)
      if(ph === 2){ const sx = H1(sd + n * 8.3) < .5 ? -1 : 1; ds.push({ x:sx * 1.7, x1:sx * 1.7, kind:1 + (n % 2), side:sx, st:0, t0:0, fly:.8, landT:0, hit:false, ghost:true, burn:false, seed:H1(sd + n * 2.2), j:0 }); }
      rows.push({ j, ds, st:0, tl:0, gapC:0, need:0, reach:0, ph });
      j += (ph === 0 ? 50 : ph === 1 ? 40 : 27) * g2; n++; }
    for(const row of rows) for(const d of row.ds) d.j = row.j;
    return rows; }
  // the open point nearest x0 (inside the road, at least KEEP from every landing): where a rider dodging this row should be
  const FREE = [];
  function nearestFree(ds, x0){ FREE.length = 0; let lo = -1;
    const xs = ds.filter(d => !d.ghost).map(d => d.x).sort((a, b) => a - b);
    for(const x of xs){ if(x - KEEP > lo) FREE.push([lo, x - KEEP]); lo = Math.max(lo, x + KEEP); } if(lo < 1) FREE.push([lo, 1]);
    let best = null, bd = 1e9; for(const [a, b] of FREE){ const m = Math.min(.06, (b - a) / 2), c = clamp(x0, a + m, b - m), dd = Math.abs(c - x0); if(dd < bd){ bd = dd; best = c; } }
    return best === null ? x0 : best; }
  // Steering reach, simulated segment by segment over the real road: the bike moves 2/55 of a half-road per segment at full lock whatever
  // its speed (lateral rate and forward rate both scale with speed), x1.1 when that steer is into a bend (it leans), minus the bend's
  // outward pull (CENTRI .3 x curve x speed share, halved while leaning). A reaction gap comes first (no steering), and only 85% lock counts.
  // Returns how far toward xt the rider gets from x0 between segments s0 and s1.
  const REACT = 10;
  function reachTo(x0, xt, s0, s1){ const dir = Math.sign(xt - x0); if(!dir) return 0; const spp = clamp(speed / MAXS, 1, 1.25); let x = x0;
    for(let i = Math.floor(s0); i < s1; i++){ const sg = segs[i]; if(!sg) break; const c = sg.curve || 0, lean = Math.sign(c) === dir && Math.abs(c) >= 1.8;
      const st = i - s0 < REACT ? 0 : dir * .85 * (lean ? 1.1 : 1), pull = spp * c * .3 * (lean ? .45 : 1); x += (st - pull) * 2 / 55;
      if((x - xt) * dir >= 0) return Math.abs(xt - x0); }
    return Math.max(0, (x - x0) * dir); }
  function launchRow(z, row, ps){ const g2 = gen(), FLY = g2 ? 1 : .8, ri = z.rows.indexOf(row), prev = ri > 0 ? z.rows[ri - 1] : null;
    row.st = 1; row.tl = Tg; DST.rows++;
    // fairness: can the rider get to the open corridor before the row? If the previous row is still ahead, they are pinned in its open
    // corridor until they pass it: they start from its open point nearest this row's corridor, at its far edge. If not, the landing
    // nearest them goes wide onto the shoulder instead, and that repeats until the corridor is in reach.
    const pin = prev && prev.j + HIT_L > ps && prev.ds.some(d => !d.ghost);
    const from = () => { if(!pin) return [playerX, ps]; const c0 = nearestFree(row.ds, prev.gapC); return [nearestFree(prev.ds, c0), Math.max(ps, prev.j + HIT_L)]; };
    let [x0, s0] = from(), c = nearestFree(row.ds, x0), need = Math.abs(c - x0), reach = reachTo(x0, c, s0, row.j - HIT_L);
    while(need > reach + 1e-6){ const live = row.ds.filter(d => !d.ghost); if(!live.length) break; live.sort((a, b) => Math.abs(a.x - x0) - Math.abs(b.x - x0));
      const d = live[0]; d.ghost = true; d.x1 = (d.x < 0 || (d.x === 0 && x0 > 0) ? -1 : 1) * 1.7; DST.dropped++; [x0, s0] = from(); c = nearestFree(row.ds, x0); need = Math.abs(c - x0); reach = reachTo(x0, c, s0, row.j - HIT_L); }
    row.gapC = c; row.need = need; row.reach = reach; if(need > reach) DST.unfair++;
    DST.log.push([row.j, +(row.j - ps).toFixed(1), row.ds.map(d => d.ghost ? 'w' : d.x).join('/'), +need.toFixed(2), +reach.toFixed(2)]); if(DST.log.length > 60) DST.log.shift();
    row.ds.forEach((d, i) => { d.st = 1; d.fly = FLY + i * .05; d.t0 = Tg + i * .12; if(d.ghost) d.x = d.x1;
      // thrown out of a tank on that side that bursts now (the chain jumping ahead of the front), or falling in over the roadside
      let src = null; for(const tk of z.tanks){ if(Math.sign(tk.x) !== d.side || Math.abs(tk.j - (d.j + 6)) > 26) continue; if(tk.t < 0 || Tg - tk.t < .4){ if(!src || Math.abs(tk.j - d.j - 6) < Math.abs(src.j - d.j - 6)) src = tk; } }
      if(src){ if(src.t < 0) src.t = Tg; d.j0 = src.j + .5; d.x0 = d.side * Math.min(3.2, Math.max(1.6, Math.abs(src.x))); d.h0 = 900; if(d.kind === 2) d.kind = 0; }
      else { d.j0 = d.j + 8; d.x0 = d.side * 2.9; d.h0 = 2600; } });
    whistle(clamp(row.ds[0].x, -1, 1) * .6, FLY); }
  function debrisUpdate(z, ps){ const DL = gen() ? 104 : 84;
    for(const row of z.rows){ if(!row.st){ if(row.j - ps <= DL) launchRow(z, row, ps); else continue; }
      for(const d of row.ds){
        if(d.st === 1 && Tg >= d.t0 + d.fly){ d.st = 2; d.landT = Tg; DST.landed++; if(d.j - ps < 140){ thud(clamp(d.x - playerX, -1, 1) * .6, d.kind !== 2); bump(d.ghost ? 2 : 3.5); } }
        if(d.st !== 2) continue; const age = Tg - d.landT;
        // the patch burns 1.8 s, or until you are past it (at most 3.4 s), so it is always still there when a slower rider arrives
        d.burn = !d.ghost && (age < 1.8 || (ps < d.j + HIT_L + 1 && age < 3.4));
        if(d.burn && !d.hit && state === 'play' && cool <= 0 && AIR.h < 6 && Math.abs(ps - d.j) < HIT_L && Math.abs(playerX - d.x) < HIT_R){ d.hit = true; DST.hits++;
          crash({ x:d.x, z:d.j * SEG }); if(typeof floatText === 'function') floatText('SCORCHED', W / 2, H * .45, 30, '#ff7a2a'); }
        if(age > 8) d.st = 3; } } }
  F.debris = () => cur && cur.rows || [];

  // ---------------------------------------------------------------- the run
  let cur = null;
  F.reset = () => { cur = null; Tg = 0; cut = null; cardT = 0; for(const z of zones){ z.started = z.done = z.armed = false; z.rows = null; } DST.hits = DST.landed = DST.rows = DST.dropped = DST.unfair = 0; DST.log.length = 0; };
  F.update = dt => { Tg += dt; cardT = Math.max(0, cardT - dt); const ps = (position + PZ) / SEG, z = active(ps); cur = z; if(!z) return;
    // the zone is kept clear: no traffic ahead inside it (cars near you floor it and leave), no oil
    cars = cars.filter(c => { const cs = c.z / SEG; if(cs < z.S - 20 || cs > z.E + 30) return true; if(cs - ps > 30) return false; c.speed = Math.max(c.speed, MAXS * 1.4); return true; });
    if(state !== 'play') return;
    if(!z.started && ps >= z.S){ z.started = true; z.armed = false; z.F = ps - START_GAP; z.t0 = Tg; boom(1.2); bump(9);
      const DIR = MECH.director; if(DIR && DIR.cine) cut = DIR.cine({ letterbox:{ top:.08, bottom:.05 }, duck:.4, shake:reduce ? 0 : 6, dur:0, id:'fireball',
        card:{ kanji:'爆発', name:'INFERNO', sub:'outrun the fire', col:'#ff8a2a' } });
      for(const fl of z.flares) if(fl.j < ps + 5 && fl.t < 0) fl.t = Tg; }
    if(z.rows) debrisUpdate(z, ps);   // (after the gate too: patches already on the road keep burning out)
    if(!z.started || z.done) return;
    // the flare stack blows behind you as the cue, then nothing dangerous happens while the 爆発 card is up: the front holds its distance,
    // no tank goes up, no debris is planned. It all starts (from scratch, the full timeline) once the card has gone, or 0.3 s in if no card shows.
    if(!z.armed){ const C = MECH.cutin, up = !!(C && C.on && C.on()), w = Tg - z.t0;
      z.F = ps - START_GAP; z.gap = START_GAP;
      if((w >= .3 && !up) || w > 3.2){ z.armed = true; z.tA = Tg; z.rows = planDebris(z, ps); } else return; }
    // the fire front: a steady pace at ~76% of top speed; it never falls more than MAX_GAP behind, and holds back after a catch
    if(z.grace > 0){ z.grace -= dt; z.F = Math.min(z.F, ps - 50); }
    else { z.F += FIRE_V * MAXS / SEG * dt; z.F = Math.max(z.F, ps - MAX_GAP); }
    z.F = Math.min(z.F, z.E - 2);
    const gap = ps - z.F; z.gap = gap;
    // the chain: tanks, racks and flares go up as the front comes within LEAD segments of them
    for(const t of z.tanks) if(t.t < 0 && z.F >= t.j - LEAD){ t.t = Tg; if(Math.abs(t.j - ps) < 25){ boom(.8); bump(4); if(cut) cut.hit(reduce ? 0 : 4); } }
    for(const r of z.racks) if(r.t < 0 && z.F >= r.j - LEAD + 10) r.t = Tg;
    for(const fl of z.flares) if(fl.t < 0 && z.F >= fl.j - LEAD) fl.t = Tg;
    // the rumble of the front, louder as it closes
    rumbleT -= dt; if(rumbleT <= 0 && ac()){ const c = clamp(1 - gap / 60, 0, 1); rumbleT = .3; M.noise(.45, 70 + c * 60, .04 + .12 * c); if(c > .6) M.noise(.2, 1400, .03 * c); }
    // caught: a scorched crash (the game's normal crash), then the fire holds back for GRACE seconds
    if(gap <= 1.5 && cool <= 0 && AIR.h < 6){ catches++; z.grace = GRACE; z.F = ps - 50; crash({ x:playerX + .01, z:position + PZ }); if(typeof floatText === 'function') floatText('SCORCHED', W / 2, H * .45, 30, '#ff7a2a'); }
    // the gate: the last tank goes up behind you, the sky turns orange
    if(ps >= z.E){ z.done = true; z.tEnd = Tg; escapes++; boom(1.6); bump(12); { const A = MECH.arrival; let ok = false; try{ if(A && A.callout) ok = A.callout('ESCAPED', { kanji:'脱', sub:'脱出', col:'#ffb04a', size:'m', hold:.4 }) !== false; else if(A && A.moment) ok = A.moment({ kanji:'脱出', name:'ESCAPED', col:'#ffb04a', hold:.2 }) !== false; }catch(e){} if(!ok) cardT = 2.4; } if(cut){ const c = cut; setTimeout(() => c.end(), 1600); }
      boostTier = Math.max(boostTier || 0, 2); boostT = Math.max(boostT, 1.4); speed = Math.max(speed, MAXS * 1.12); flow++; bestFlow = Math.max(bestFlow, flow); if(typeof hud === 'function') hud(); } };

  // ---------------------------------------------------------------- drawing in the world
  function P(s, f, X, h){ const a = s.p1.screen, b = s.p2.screen, sc = a.scale + (b.scale - a.scale) * f; return [a.x + (b.x - a.x) * f + X * (a.w + (b.w - a.w) * f), a.y + (b.y - a.y) * f - sc * h * H / 2]; }
  // a fireball of on-screen diameter D (css px) at (x, ground y): the 48 or 96 px art, whichever stays under ~1.5 canvas px per art px
  function ball(f, x, y, D){ const big = D / PX / 48 > 1.5, spr = S[(big ? 'B' : 'b') + f], k = Math.min(D / spr.width, PX * 1.5); blit(spr, x, y, k); return k; }
  function burst(x, y, D, age, a){ // age in seconds: 8 fireball frames, then the smoke rolls up; sparks and debris thrown out
    const f = Math.min(7, Math.floor(age / .09));
    if(age < .72){ if(age < .1 && !reduce) glow(x, y - D * .5, D * 1.1, '#fff0c0', .45 * a); ball(f, x, y + D * .06, D); glow(x, y - D * .45, D * .8, '#ff7a2a', .35 * a * (1 - age / .72)); }
    if(age > .4){ for(let i = 0; i < 6; i++){ const ph = ((age - .4) * .3 + i / 6) % 1, pk = D / 26 * (.5 + ph * .9); cx.globalAlpha = a * (1 - ph) * Math.min(1, (age - .4) * 3); bl((ph < .35 ? 'p' : 'q') + i % 3, x + (H1(i * 3.1) - .5) * D * .4 + ph * D * .25, y - D * .55 - ph * D * 1.4, pk); } cx.globalAlpha = a; }
    if(age < 1.3){ for(let i = 0; i < 18; i++){ const an = H1(i * 2.7) * Math.PI * 1.2 - Math.PI * 1.1, sp2 = .8 + H1(i * 5.3) * 1.2, tt = age, ex = x + Math.cos(an) * sp2 * tt * D, ey = y - D * .45 + Math.sin(an) * sp2 * tt * D + 1.4 * tt * tt * D;
        cx.globalAlpha = a * (1 - age / 1.3); cx.fillStyle = i % 4 === 0 ? '#1a1214' : emberCol[i % 3]; const sz = i % 4 === 0 ? PX * 2 : PX; cx.fillRect(snap(ex), snap(ey), sz, i % 4 === 0 ? sz : PX * 2); } cx.globalAlpha = a; } }
  // a tank after its burst: a flame crown and a towering black plume, lit orange from beneath, billowing and drifting downwind, embers rising
  function burning(x, y, D, seed, a, now){ const t = reduce ? 1.5 : now / 1000, fr = reduce ? 0 : (Math.floor(now / 110 + seed * 3) % 3 + 3) % 3, fk = D / 18;
    bl('f' + fr, x - fk * 5, y - D * .5, fk * .8); bl('f' + ((fr + 1) % 3), x + fk * 4, y - D * .5, fk); bl('f' + ((fr + 2) % 3), x, y - D * .55, fk * 1.2); glow(x, y - D * .7, D * .9, '#ff7a2a', .35 * a);
    for(let i = 0; i < 11; i++){ const ph = (t / 3.2 + seed * .37 + i / 11) % 1, h = ph * D * 3.4, drift = ph * ph * D * 1.6, pk = D / 26 * (.6 + ph * 1.9);
      cx.globalAlpha = a * Math.min(1, ph * 6) * (1 - Math.pow(ph, 2.2)); bl((ph < .28 ? 'p' : 'q') + (i % 3), x + drift + Math.sin(ph * 6 + i) * D * .08, y - D * .7 - h, pk); }
    cx.globalAlpha = a; for(let i = 0; i < 8; i++){ const ph = (t / 1.8 + H1(i * 2.1 + seed)) % 1; cx.fillStyle = emberCol[i % 3]; cx.globalAlpha = a * (1 - ph) * Math.min(1, ph * 5); cx.fillRect(snap(x + (H1(i * 4.3) - .5) * D * .6 + ph * D * .5), snap(y - D * .6 - ph * D * 1.8), PX, PX); }
    cx.globalAlpha = a; }
  // ---- debris drawing. Ground marks are drawn row by row on the projected road (each row checked against its own segment's hill clip),
  // so the rings, shadows and scorches lie flat on the asphalt through bends and over crests with no sprite scaling at all.
  const GQ = { x:0, y:0, w:0 };
  function GP(jf, X, h){ const i = Math.floor(jf), s = segs[i], b0 = Math.floor(position / SEG); if(!s || i <= b0 || i >= b0 + DRAW - 1 || s.p1.camera.z <= DEPTH) return false;
    const f = jf - i, a = s.p1.screen, b = s.p2.screen, sc = a.scale + (b.scale - a.scale) * f; GQ.w = a.w + (b.w - a.w) * f; GQ.x = a.x + (b.x - a.x) * f + X * GQ.w; GQ.y = a.y + (b.y - a.y) * f - sc * (h || 0) * H / 2; return true; }
  // calls fn(y, xl, xr, u, q, w) for every pixel row of a ground ellipse centred at segment jc, lateral X; u -1..1 along the road, q = sqrt(1-u^2)
  function ell(jc, X, rx, rl, fn){ const b0 = Math.floor(position / SEG), i0 = Math.max(b0 + 1, Math.floor(jc - rl)), i1 = Math.min(b0 + DRAW - 2, Math.floor(jc + rl));
    for(let i = i0; i <= i1; i++){ const s = segs[i]; if(!s || s.p1.camera.z <= DEPTH) continue; const a = s.p1.screen, b = s.p2.screen; if(!(a.y > b.y)) continue;
      const yb = Math.min(a.y, s.clip, H); for(let y = Math.max(0, Math.floor(b.y / PX) * PX); y < yb; y += PX){ const f = (a.y - (y + PX / 2)) / (a.y - b.y); if(f < 0 || f > 1) continue;
        const u = (i + f - jc) / rl; if(u <= -1 || u >= 1) continue; const q = Math.sqrt(1 - u * u), w = a.w + (b.w - a.w) * f, c = a.x + (b.x - a.x) * f + X * w, hw = rx * w * q; fn(y, c - hw, c + hw, u, q, w); } } }
  const span = (x0, x1, y, col) => { const a = snap(x0), b = snap(x1); if(b > a){ cx.fillStyle = col; cx.fillRect(a, y, b - a, PX); } };
  // a ring on the ground: c0 the dark outline, c1 the body, c2 its bright inner edge; th = thickness as a share of the radius
  function gRing(jc, X, rx, rl, th, c0, c1, c2, fillCol, fillA){ const k = 1 - th, ga = cx.globalAlpha;
    ell(jc, X, rx, rl, (y, xl, xr, u, q, w) => { const ui = u / k, ri = Math.abs(ui) < 1 ? rx * k * w * Math.sqrt(1 - ui * ui) : -1, c = (xl + xr) / 2, cc = contrast() && ((y / PX | 0) >> 1) % 2;
      span(xl - PX, xl, y, cc ? '#000000' : c0); span(xr, xr + PX, y, cc ? '#000000' : c0);
      if(ri < 0){ span(xl, xr, y, cc ? '#ffe600' : c1); return; }
      const e = Math.max(PX, (xr - xl) / 2 - ri); span(xl, xl + e, y, cc ? '#ffe600' : c1); span(xr - e, xr, y, cc ? '#ffe600' : c1);
      if(e >= PX * 2){ span(xl + e - PX, xl + e, y, c2); span(xr - e, xr - e + PX, y, c2); }
      if(fillCol && (y / PX | 0) % 2){ cx.globalAlpha = ga * fillA; span(xl + e, xr - e, y, fillCol); cx.globalAlpha = ga; } }); }
  function gFill(jc, X, rx, rl, col, al){ const ga = cx.globalAlpha; cx.globalAlpha = ga * al; ell(jc, X, rx, rl, (y, xl, xr) => span(xl, xr, y, col)); cx.globalAlpha = ga; }
  // the crater scorch: a ragged black-violet stain, a darker charred ring, a hot core and ember specks while it is hot (keyed to the ground so they don't swim)
  function scorch(d, heat, al){ const ga = cx.globalAlpha; cx.globalAlpha = ga * al;
    ell(d.j, d.x, PR * 1.08, PL * 1.05, (y, xl, xr, u, q, w) => { const key = Math.round(u * 20), rg = .88 + .12 * H1(key * 3.7 + d.seed * 50), c = (xl + xr) / 2, hw = (xr - xl) / 2 * rg;
      span(c - hw, c + hw, y, '#120c14'); if(q > .3){ const h2 = hw * .7 * (.9 + .1 * H1(key * 5.3)); span(c - h2, c + h2, y, '#1e141c'); }
      if(heat > 0 && q > .55){ const h3 = hw * .36; span(c - h3, c + h3, y, heat > .5 ? '#5a1c12' : '#341414'); }
      if(heat > 0 && H1(key * 2.3 + d.seed * 31) > .5){ const ex = c + (H1(key * 7.1 + d.seed) - .5) * 1.5 * hw, on = reduce || (Math.floor(Tg * 6 + key) % 3) > 0; if(on){ cx.fillStyle = heat > .5 && H1(key * 1.9) > .5 ? '#ffd070' : '#ff7a2a'; cx.fillRect(snap(ex), y, PX, PX); } } });
    cx.globalAlpha = ga; }
  // art in two sizes: the small one up to 1.5 canvas px per art px, then the big one, which is capped at 1.5 (never stretched further)
  const ART = { spr:null, k:1 };
  function art(pre, small, D, fr){ const big = D / PX / small > 1.5, spr = S[pre + (big ? 1 : 0) + fr]; ART.spr = spr; ART.k = Math.min(D / spr.width, PX * 1.5); return ART; }
  const FLX = [], FLN = 9; for(let i = 0; i < FLN; i++){ const an = i / FLN * 6.283 + H1(i * 4.1) * .7, rr = i === 0 ? 0 : .35 + H1(i * 2.3) * .55; FLX.push([Math.sin(an) * rr, Math.cos(an) * rr * .85, .7 + H1(i * 6.7) * .55]); }
  FLX.sort((a, b) => b[0] - a[0]);   // far (larger u) first
  function drawProj(d, a){ const u = clamp((Tg - d.t0) / d.fly, 0, 1), arc = uu => (1 - uu) * d.h0 + 4 * uu * (1 - uu) * ARC;
    if(!GP(d.j0 + (d.j - d.j0) * u, d.x0 + (d.x - d.x0) * u, arc(u))) return; const x = GQ.x, y = GQ.y, D = Math.max(PX * 7, Math.min(GQ.w * .4, W * .11));
    // the trail: fire close behind, black smoke further back, at earlier points of the arc
    for(let k = 5; k >= 1; k--){ const uk = u - k * .03; if(uk < 0) continue; if(!GP(d.j0 + (d.j - d.j0) * uk, d.x0 + (d.x - d.x0) * uk, arc(uk))) continue;
      cx.globalAlpha = a * (1 - k / 6); if(k > 2){ const pk = D / 22 * (.6 + k * .12); bl('q' + (k % 3), GQ.x, GQ.y + pk * 6, pk); } else { const A = art('db', 12, D * (.8 - k * .15), 0); blit(A.spr, GQ.x, GQ.y + A.spr.height * A.k / 2, A.k); } }
    cx.globalAlpha = a; glow(x, y, D * 2, '#ff7a2a', .4 * a);
    const fr = reduce ? 0 : Math.floor(Tg * 14 + d.seed * 4) % 4;
    if(d.kind === 2){ const A = art('db', 12, D, reduce ? 0 : fr % 2); blit(A.spr, x, y + A.spr.height * A.k / 2, A.k); }
    else { const A = art(d.kind ? 'dd' : 'dc', 12, D, fr), hh = A.spr.height * A.k; blit(A.spr, x, y + hh / 2, A.k); const F2 = art('pf', 8, D * .55, (fr + 1) % 4); blit(F2.spr, x, y - hh * .2, F2.k); } }
  function drawDebris(d, row, a, now){ const st = d.st;
    if(st === 1){ const lt = Tg - row.tl, p = clamp((Tg - d.t0) / d.fly, 0, 1), grow = sm(lt / .3), pulse = reduce ? 0 : (Math.sin(Tg * (9 + p * 12)) > 0 ? 1 : 0);
      // the shadow tightens and darkens as it falls; the target ring grows in, then pulses faster as it comes
      gFill(d.j, d.x, PR * (1.7 - .75 * p), PL * (1.7 - .75 * p), '#05030a', a * (.18 + .32 * p));
      if(!d.ghost || Math.abs(d.x) < 1.25){ const far = clamp((d.j - (position + PZ) / SEG - 12) / 55, 0, 1), rx = PR * (.55 + .45 * grow) * (1 + .05 * pulse) * (1 + .25 * far);
        // far away a flat ring is only a row or two tall, so it is drawn longer down the road while it is far (true size by ~12 segments out),
        // with a warm pool of light round it and a chevron hovering over it, which keeps a readable minimum size on screen
        gRing(d.j, d.x, rx, PL * (.55 + .45 * grow) * (1 + 1.6 * far), .24, '#2a0604', pulse && p > .45 ? '#ff6a2a' : '#e82a1a', pulse ? '#ffe0a0' : '#ffa040', '#ff3a1a', .14 + .22 * p);
        if(GP(d.j, d.x, 0)){ const gx = GQ.x, gy = GQ.y, gw = GQ.w; glow(gx, gy, Math.max(rx * gw * 1.8, PX * 18), '#ff3a1a', (.3 + .2 * p) * a);
          const M2 = S['mk1' + (pulse ? 1 : 0)], mk = Math.max(PX, Math.min(PX * 1.5, gw * .06 / 17)), bob = reduce ? 0 : Math.round(Math.sin(Tg * 6 + d.seed * 9) * 1.5) * PX;
          blit(M2, gx, snap(gy - Math.max(PX * 7, gw * .2 * (1 - p * .5))) + bob, mk); } }
      if(Tg >= d.t0) drawProj(d, a); return; }
    const age = Tg - d.landT, heat = clamp(1 - age / 5, 0, 1);
    scorch(d, heat, a * clamp((8 - age) / 2.5, 0, 1));
    if(age < .45){ const k = age / .45; gRing(d.j, d.x, PR * (1 + 2.6 * k), PL * (1 + 2.6 * k), .16, '#3a1008', '#ff9a3a', '#fff0c0', null, 0); }
    if(!GP(d.j, d.x, 0)) return; const x = GQ.x, y = GQ.y, w = GQ.w;
    // the burning patch: flames grow in, flicker, and sink when it burns out (they never outlast the danger by more than a moment)
    const rest = d.burn ? 1 : clamp(1 - (age - (d.endT || age)) / .3, 0, 1); if(!d.burn && !d.endT) d.endT = age;
    const fl = d.ghost ? 0 : sm(age / .15) * rest;
    if(fl > 0){ glow(x, y - w * .05, w * PR * 1.9, '#ff6a1a', .32 * a * fl);
      const wreck = d.kind !== 2 && age > .2, wk = d.kind ? 'dd' : 'dk';
      for(let i = 0; i < FLN; i++){ const f = FLX[i]; if(wreck && f[0] < 0 && FLX[i - 1] && FLX[i - 1][0] >= 0){ const A = art(wk, 12, Math.min(w * .24, W * .14), d.kind ? 0 : 1); GP(d.j, d.x, 0); blit(A.spr, GQ.x, GQ.y, A.k); }
        if(!GP(d.j + f[0] * PL * .8, d.x + f[1] * PR * .9, 0)) continue; const fr = reduce ? i % 4 : Math.floor(Tg * 9 + i * 1.3 + d.seed * 7) % 4, hh = GQ.w * .2 * f[2] * fl;
        const A = art('pf', 8, hh * .57, fr); cx.globalAlpha = a; blit(A.spr, GQ.x, GQ.y + A.k, A.k); }
      // heat shimmer: thin wavering bright lines over the patch (none under reduced motion)
      if(!reduce){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = '#ff9a3a'; for(let k = 0; k < 4; k++){ const yy = snap(y - w * (.16 + k * .07)), xo = Math.sin(Tg * 7 + k * 2.1 + d.seed * 9) * w * .05, hw = w * PR * (.9 - k * .15);
          cx.globalAlpha = .1 * a * fl; cx.fillRect(snap(x + xo - hw), yy, snap(hw * 2), PX); } cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = a; } }
    // the impact: a fireball, then bouncing chunks
    if(age < 1){ burst(x, y, Math.min(w * .6, W * .2), age, a); }
    if(age < .9){ const n = reduce ? 1 : 3; for(let i = 0; i < n; i++){ const vx = (i - 1 + (H1(d.seed * 9 + i) - .5) * .6) * .9, vj = (H1(d.seed * 5 + i * 2) - .7) * 9, tt = age, hb = Math.abs(Math.sin(tt * Math.PI * 2.3)) * 700 * (1 - tt / .9);
        if(!GP(d.j + vj * tt, d.x + vx * tt, hb)) continue; const A = art('dk', 12, Math.min(GQ.w * .1, W * .04), (Math.floor(tt * 16) + i) % 4); cx.globalAlpha = a * clamp((.9 - tt) * 4, 0, 1); blit(A.spr, GQ.x, GQ.y, A.k); } cx.globalAlpha = a; } }
  function debrisDraw(z, s, now){ const b0 = Math.floor(position / SEG);
    for(const row of z.rows){ if(!row.st) continue; for(const d of row.ds){ if(d.st === 0 || d.st === 3) continue; const anc = Math.max(Math.floor(d.j - PL), b0 + 1); if(s.index !== anc || d.j - b0 > DRAW - 4) continue;
      const a = 1 - clamp(Math.pow((d.j - b0) / DRAW, 1.6), 0, 1) * .8; cx.globalAlpha = a; drawDebris(d, row, a, now); cx.globalAlpha = 1; } } }
  const LATE = [];
  F.drawSeg = (s, sx0, sy0, uw, fog, now) => { const z = cur; if(!z || !z.started || s.fbZ !== z) return; if(z.rows) debrisDraw(z, s, now); if(uw > W * 1.2) return; const a = 1 - fog * .8;
    cx.globalAlpha = a;
    for(const t of z.tanks){ if(t.j !== s.index || t.t < 0) continue; const age = Tg - t.t, x = sx0 + t.x * uw, k = uw * 1.35 / 48 * (t.sph ? 1.2 : 1);
      if(age < 1.4){ const rk = uw * (1 + age * 3) / 80; cx.globalAlpha = a * (1 - age / 1.4) * (reduce ? .5 : 1); bl('ring', x, sy0 + 10 * Math.min(rk, PX * 4.5), rk); cx.globalAlpha = a; }
      // near ones are drawn after the road pass (unclipped), so the plume is never cut by a segment's clip into steps
      const near = uw > W * .1; if(age > .5 && uw < W * .6){ if(near) LATE.push([0, x, sy0, Math.min(48 * k, W * .22), t.j * .13, a]); else burning(x, sy0, Math.min(48 * k, W * .22), t.j * .13, a, now); }
      if(age < 1.6){ if(near) LATE.push([1, x, sy0, Math.min(48 * k * 1.5, W * .3), age, a]); else burst(x, sy0, Math.min(48 * k * 1.5, W * .3), age, a); } }
    for(const fl of z.flares){ if(fl.j !== s.index || fl.t < 0) continue; const age = Tg - fl.t, x = sx0 + fl.x * uw, k = uw * 3.4 / 98; if(age < 1.6) burst(x, sy0 - 60 * k, Math.min(56 * k * 2, W * .3), age, a); }
    for(const r of z.racks){ if(r.j !== s.index || r.t < 0) continue; const age = Tg - r.t; if(age > 3) continue; const x = sx0 + r.x * uw, k = uw * .9 / 46, fall = Math.min(1, age / .9);
      cx.save(); cx.translate(x, sy0 - 30 * k * (1 - fall * fall)); cx.rotate(Math.sign(r.x) * fall * 1.1); bl('rack', 0, 6 * k, k * 1.2); cx.restore(); if(fall >= 1 && age < 2) burst(x, sy0, Math.min(46 * k, W * .2), age - .9, a); }
    cx.globalAlpha = 1; };

  // ---------------------------------------------------------------- screen: the front behind you, overhead fireballs, meter, finale
  F.drawUnderBike = now => { for(const q of LATE){ cx.globalAlpha = q[5]; if(q[0]) burst(q[1], q[2], q[3], q[4], q[5]); else burning(q[1], q[2], q[3], q[4], q[5], now); } cx.globalAlpha = 1; LATE.length = 0;
    const z = cur; if(!z || !z.started || z.done) return; const c = clamp(1 - (z.gap || 99) / 60, 0, 1); if(c <= 0) return;
    const bs = Math.min(W * .2, H * .27); glow(W / 2, H - 8, bs * (.6 + c * .5), '#ff6a1a', .3 + .3 * c); };   // the bike lit from behind
  F.overlay = (now, sk) => { const z = cur; if(!z || !z.started) return; overlayFire(z, now); meterDraw(z, now); };
  function meterDraw(z, now){
    if(!z.done){ const c = clamp(1 - (z.gap || 99) / 60, 0, 1), x = snap(W * .03), y0 = snap(H * .4), bh = snap(H * .26), bw = PX * 4;   // the fire meter: how close the front is
      blit(S.label, x + bw / 2, y0 - PX, PX); cx.fillStyle = '#07060c'; cx.fillRect(x - PX, y0, bw + PX * 2, bh); const n = 10, lit = Math.round(c * n);
      for(let i = 0; i < n; i++){ const on = i < lit, hot = i >= 7; cx.fillStyle = on ? (hot ? (reduce || Math.floor(now / 250) % 2 ? '#ff3a2a' : '#ff9a2a') : i >= 4 ? '#ff9a2a' : '#ffd070') : '#2a1814'; cx.fillRect(x, y0 + bh - (i + 1) * bh / n + PX, bw, snap(bh / n) - PX); } }
  }
  function overlayFire(z, now){
    if(!z.done){ const gap = z.gap || 99, c = clamp(1 - gap / 60, 0, 1), base = .35 + c * .65, fl = reduce ? 1 : .9 + .1 * Math.sin(now / 90);
      // the light of the front washing forward over the road: hard bands from the bottom of the screen
      cx.globalCompositeOperation = 'lighter';
      for(const [hh, al, col] of [[.62, .05, '#ff5a1a'], [.42, .07, '#ff7a2a'], [.24, .09, '#ffa040'], [.1, .12, '#ffd070']]){ cx.fillStyle = col; cx.globalAlpha = al * base * fl; cx.fillRect(0, snap(H * (1 - hh * (.5 + base * .6))), W, H); }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      // heat shimmer over the lower screen: thin wavering bright lines in the fire's light (no frame copies; none under reduced motion)
      if(!reduce && c > .2){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = '#ff9a3a'; for(let k = 0; k < 9; k++){ const y = snap(H * (.66 + k * .036)), x0 = snap(((Math.sin(now / 260 + k * 1.7) + 1) / 2) * W * .4); cx.globalAlpha = .08 * c; cx.fillRect(x0, y, snap(W * (.25 + .1 * Math.sin(k + now / 400))), PX); } cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
      // flames licking in at the bottom corners
      const fk = PX * (2 + Math.round(c * 2)); for(let i = 0; i < 6; i++){ const sd = i % 2 ? 1 : -1, fr = reduce ? 0 : (Math.floor(now / 100) + i) % 3, x = sd > 0 ? W - (i >> 1) * fk * 9 - fk * 4 : (i >> 1) * fk * 9 + fk * 4;
        bl('f' + fr, x, H + fk * 2, fk * (1 - (i >> 1) * .22) * (.6 + c * .6)); }
      // fireballs rolling overhead from behind, toward the vanishing point
      for(let i = 0; i < 2; i++){ const per = 2.6, ph = ((Tg - (z.tA || 0)) / per + i * .5) % 1, sd = i ? 1 : -1; if(!z.armed || Tg - z.tA < .4) continue; const q = ph, D = Math.min(W * .1, H * .17) * (1.1 - q * .75), x = W / 2 + sd * W * (.5 - q * .42), y = H * (.1 + q * .2) + D * .55;   // (was up to ~440 px across: now ~1/10 of the screen, shrinking away)
        for(let tr = 1; tr <= 3; tr++){ cx.globalAlpha = Math.min(1, (1 - q) * 2) * (1 - tr * .25); bl((tr === 1 ? 'p' : 'q') + (tr % 3), x + sd * tr * D * .26, y - D * .12 + tr * D * .07, D / 40 * (1 + tr * .2)); }
        cx.globalAlpha = Math.min(1, (1 - q) * 3); ball(Math.min(7, 2 + Math.floor(q * 6)), x, y, D); cx.globalAlpha = 1; } }
    // the start: a white-hot flash from behind in three held steps, never under reduced motion
    if(!reduce && z.t0 !== undefined){ const t = Tg - z.t0; if(t < .3){ cx.fillStyle = '#fff2d8'; cx.globalAlpha = [.45, .25, .1][Math.min(2, Math.floor(t / .1))]; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; } }
    // the finale: the last tank goes up behind you and the sky takes its colour, then lets go in steps
    if(z.done){ const t = Tg - z.tEnd; if(t < 1.9){ const k = 1 - t / 1.9, hz = H / 2 + 2; cx.globalCompositeOperation = 'lighter';
        for(const [hh, al] of [[1, .12], [.7, .14], [.45, .16]]){ cx.fillStyle = '#ff7a2a'; cx.globalAlpha = al * Math.ceil(k * 4) / 4; cx.fillRect(0, 0, W, hz * hh); }
        cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
        if(!reduce && t < .25){ cx.fillStyle = '#fff0c0'; cx.globalAlpha = t < .12 ? .35 : .15; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; } } } };
  F.drawScreen = now => { const z = cur;
    if(cardT > 0 && S.esc){ const k = PX * 2, e = S.esc, a = Math.min(1, cardT * 3, (2.4 - cardT) * 6); cx.globalAlpha = clamp(a, 0, 1); blit(e, W / 2, H * .34, k); cx.globalAlpha = 1; } };
  F.finish = rec => { if(escapes) rec.infernoEscapes = escapes; if(catches || DST.hits) rec.scorched = catches + DST.hits; };
  F.probe = () => ({ debris:{ hits:DST.hits, landed:DST.landed, rows:DST.rows, dropped:DST.dropped, unfair:DST.unfair }, cine:cut ? { alive:cut.alive, t:+cut.t.toFixed(2) } : null, dcines:MECH.director ? MECH.director.debug.cines : null, zones:zones.filter(live).map(z => ({ S:z.S, E:z.E, started:z.started, done:z.done, gap:z.gap, tanks:z.tanks.length, racks:z.racks.length, flares:z.flares.length })), catches, escapes });
})();
