/* Sundown set piece module: kaiju. See setpiece/README.md.
   Two set pieces, both scheduled by world position (segments after the road begins), never by time:

   1. 怪獣決戦 Kaiju battle over the bay (Bay Bridge, 460 segments in). Two original giants fight astride the bridge, and you ride between the titan's feet (world-space stacked sprites: the 立体 section; research/sundown-craft/kaiju_pass.md):
      Sairyū (帆竜), a sail-backed reptile titan, slate-violet with a bony crested snout and a Dimetrodon-style sail whose ribs charge
      amber from tail to head before it breathes a beam; and Kanigaru (蟹蛾), an oxblood armoured crab with moth wings whose
      teal eye-spots blaze. As you ride toward the trigger they rise, brawl (swipes, claw jabs, a wing flare), the titan roars,
      charges, and fires as you pass; the beam glances off the crab's shell into a skyscraper, which collapses; the crab topples
      into the bay and its shockwave rolls toward the bridge; the titan roars and the pair slide out to the sides as you pass between.
   2. 台風 Typhoon stretch (Shonan Coast, segments 200..720 of the road): storm cloud, lightning over the sea, wind-driven rain,
      spray sheets bursting over the sea wall (the coast bends its own palms from MECH.sp_kaiju.wind()), windsocks, amber beacons and a 強風注意 gantry; gusts from the sea
      push the bike gently toward the land side. Every gust is telegraphed about a second ahead (windsocks fill, a screen windsock
      blinks amber, a rising whoosh), and its push is under a fifth of your steering, so it is always answerable.

   References looked at (rules taken, nothing copied):
   - King of the Monsters (SNK 1991) gameplay still: giants are bulky readable silhouettes 1.5-2x the tallest building; each material
     has 3-4 tones plus a darker same-hue outline; spines in one contrasting warm colour; explosions are lumpy blobs (white core,
     yellow, orange, red rim, then violet smoke); helicopters are tiny dark specks with one light.
     -> 5-tone ramps per material, outline ring in the material's darkest hue, warm sail ribs on a cool body, blob explosions.
   - Gamera vs. Gyaos (Daiei 1967) and The War of the Gargantuas (Toho 1966) posters: two monsters on a diagonal, facing; the beam is
     a hard bright core with a coloured rim crossing the frame; the city below burns; rain and lightning frame the fight.
     -> titan left, foe right across the road's vanishing point, beam crossing above it, a burning tower, rain lit by the beam.
   - Hokusai, The Great Wave off Kanagawa: spray as clawed fingers at the crest, foam as scattered white dots in the air behind it,
     three blues + white, the sheet lightest at its top edge. -> the sea-wall spray sheets and the bay splash columns.
   - Storm-surge photographs (Wikipedia "Storm surge", "Seawall"): grey low contrast sky, spray rising vertically from the wall then
     blown downwind as a thinning sheet. -> spray rises at the wall, leans with the wind, thins to dither as it crosses the road.
   Art rules: everything is a cached pixel sprite baked from a material grid (moon rim upper-left, warm city rim on the right edges,
   the side facing the beam re-lit amber in a second baked copy), glows are stepped (glow()), dithers are 4x4 Bayer, no gradients.
   Fairness: all spectacle is in the backdrop or off the road; spray over the road is dithered to half coverage; no flashes or shake
   under reduced motion. */
"use strict";
(() => {
  // rarity: mech/director.js decides whether the kaiju (with its bridge break) and the typhoon happen on this visit (setpiece/README.md, "Director and rarity")
  const DIR = MECH.director; if(DIR){ DIR.register('kaiju'); DIR.register('typhoon'); }
  let tyGo = { at:-1, ok:true };   // the typhoon decision for the stretch being placed (decided at its first segment)
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
  const H1 = n => { const s = Math.sin(n * 78.233 + 12.9898) * 43758.5453; return s - Math.floor(s); };
  const snap = v => Math.round(v / PX) * PX;
  const sm = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const RGBC = {}; const rgb = c => RGBC[c] || (RGBC[c] = hx(c));
  const S = {};   // every sprite this module owns, built in warm()

  // ---------------------------------------------------------------- a material grid: parts are painted in order, then baked with light
  function Grid(w, h){ this.w = w; this.h = h; this.m = new Uint8Array(w * h); this.a = new Uint8Array(w * h); }
  Grid.prototype.set = function(x, y, m, a){ x |= 0; y |= 0; if(x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.m[y * this.w + x] = m; if(a !== undefined) this.a[y * this.w + x] = a; };
  Grid.prototype.get = function(x, y){ return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.m[y * this.w + x]; };
  Grid.prototype.ell = function(cx0, cy0, rx, ry, m, a){ for(let y = Math.floor(cy0 - ry); y <= cy0 + ry; y++) for(let x = Math.floor(cx0 - rx); x <= cx0 + rx; x++){ const u = (x + .5 - cx0) / rx, v = (y + .5 - cy0) / ry; if(u * u + v * v <= 1) this.set(x, y, m, a); } };
  // a tapered capsule: limbs, necks, tails, ribs
  Grid.prototype.cap = function(x0, y0, x1, y1, r0, r1, m, a){ const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, R = Math.max(r0, r1);
    for(let y = Math.floor(Math.min(y0, y1) - R); y <= Math.max(y0, y1) + R; y++) for(let x = Math.floor(Math.min(x0, x1) - R); x <= Math.max(x0, x1) + R; x++){
      const px = x + .5, py = y + .5, t = clamp(((px - x0) * dx + (py - y0) * dy) / L2, 0, 1), qx = x0 + dx * t - px, qy = y0 + dy * t - py, r = r0 + (r1 - r0) * t;
      if(qx * qx + qy * qy <= r * r) this.set(x, y, m, a); } };
  Grid.prototype.poly = function(P, m, a){ let y0 = 1e9, y1 = -1e9; for(const p of P){ y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for(let y = Math.floor(y0); y <= y1; y++){ const py = y + .5, xs = [];
      for(let i = 0; i < P.length; i++){ const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length]; if((ay <= py) !== (by <= py)) xs.push(ax + (py - ay) / (by - ay) * (bx - ax)); }
      xs.sort((p, q) => p - q); for(let k = 0; k + 1 < xs.length; k += 2) for(let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, m, a); } };
  Grid.prototype.line = function(x0, y0, x1, y1, m, a){ x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for(;;){ this.set(x0, y0, m, a); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } };

  // bake: moon rim on top/left edges, a warm city rim on right edges, light and dark bands two px in, a dark seam where parts overlap,
  // an outline ring in each material's darkest hue. hot = { side:+1|-1, col:[rim, band, wash] } re-lights the side facing the beam.
  // materials: { r:[outline, dark, mid, light, moonRim, cityRim], tex } or { flat:'#rrggbb' }; alpha(x,y) may punch dither holes
  function bake(key, g, MAT, hot, alpha){ key = 'kj_' + key; if(SPR[key]) return SPR[key];
    const w = g.w + 2, h = g.h + 2, c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), img = k.createImageData(w, h), D = img.data;
    const at = (x, y) => g.get(x, y), put = (x, y, col) => { const o = ((y + 1) * w + x + 1) * 4, v = rgb(col); D[o] = v[0]; D[o + 1] = v[1]; D[o + 2] = v[2]; D[o + 3] = 255; };
    for(let y = -1; y <= g.h; y++) for(let x = -1; x <= g.w; x++){ const m = at(x, y);
      if(!m){ const n = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1); if(n && !MAT[n].noLine && (!alpha || alpha(x, y) > .5)) put(x, y, MAT[n].flat ? MAT[n].line || MAT[n].flat : MAT[n].r[0]); continue; }
      if(alpha && B4[(y & 3) * 4 + (x & 3)] > alpha(x, y)) continue;
      const mt = MAT[m]; if(mt.flat){ put(x, y, mt.flat); continue; }
      const r = mt.r, E = (dx, dy) => at(x + dx, y + dy) === 0, O = (dx, dy) => { const v = at(x + dx, y + dy); return v !== 0 && v !== m && !MAT[v].flat; };
      let col = null;
      if(hot && !mt.noHot){ const s = hot.side; if(E(s, 0) || E(s, -1)) col = hot.col[0]; else if(E(2 * s, 0) || E(s, -2)) col = hot.col[1]; else if(E(3 * s, 0)) col = hot.col[2]; }
      if(!col){
        if(E(0, -1) || E(-1, 0)) col = r[4];
        else if(E(1, 0)) col = r[5];
        else if(E(0, 1)) col = r[1];
        else if(O(1, 0) || O(0, 1)) col = r[0];
        else if(E(0, -2) || E(-2, 0) || E(-1, -1)) col = r[3];
        else if(E(2, 0)) col = r[3];
        else if(E(0, 2) || E(0, 3) || E(3, 0)) col = r[1];
        else { const hv = mt.tex ? H1((x >> 1) * 7.31 + (y >> 1) * 3.17 + m) : 0; col = hv > .84 ? r[1] : r[2]; } }
      put(x, y, col); }
    k.putImageData(img, 0, 0); return SPR[key] = c; }

  // ---------------------------------------------------------------- palettes
  const HOT_R = { side:1, col:['#fff0b0', '#ffb04a', '#a0503a'] }, HOT_L = { side:-1, col:['#fff0b0', '#ffb04a', '#a0503a'] };
  const TM = {   // Sairyū, the sail-backed titan
    1:{ r:['#0a0604', '#1a100c', '#2a1c16', '#4a3226', '#e8cca8', '#ff9a5c'], tex:1 },          // hide: warm umber
    2:{ r:['#060302', '#100a08', '#18100c', '#22160f', '#3a2a20', '#7a3a2a'] },                 // far limbs
    3:{ r:['#0a0604', '#3a2a14', '#56401e', '#76582a', '#c8a870', '#f0a060'] },                 // belly plates: ochre
    4:{ r:['#0a0604', '#20160a', '#2a1c0c', '#2a1c0c', '#4a3418', '#6a3a20'] },                 // belly seams
    5:{ r:['#06020a', '#1a0a1e', '#2a1030', '#44184a', '#9a5a8a', '#c0607a'] },                // sail membrane: plum
    6:{ r:['#0c0a0a', '#4a4038', '#786a58', '#a49680', '#d8ccb0', '#b08a7a'] },                 // bone: ribs, horn, crest, claws, teeth
    7:{ flat:'#3a0c14', line:'#14040a' },                                                        // mouth
    8:{ flat:'#ffd060', line:'#3a1c08' }                                                         // eye
  };
  const FM = {   // Kanigaru, the armoured crab-moth
    1:{ r:['#020608', '#0a1a20', '#10262e', '#204650', '#b8eef0', '#ffa060'], tex:1 },          // shell: sea-steel
    2:{ r:['#020406', '#06101a', '#0a1620', '#0e1c28', '#1a2e3a', '#5a3a30'] },                 // far legs and claw
    3:{ r:['#050307', '#120c18', '#1c1424', '#342840', '#b8a8d8', '#e07a6a'], tex:1 },          // wing: dusk violet
    4:{ r:['#06040a', '#120c16', '#18101e', '#1e1424', '#2a2032', '#3a2232'] },                 // wing veins / far wing
    5:{ flat:'#0a1414', line:'#05080a' }, 6:{ flat:'#1aa894', line:'#0a1414' }, 7:{ flat:'#b0ffe8', line:'#0a1414' },   // eye-spot rings
    8:{ flat:'#7affe0', line:'#0a1414' },                                                        // eyes
    9:{ r:['#0c0a08', '#3a2a24', '#5a4034', '#7a5a46', '#b08a6a', '#a0603a'] }                  // claw tips, antennae, ridge spikes
  };
  const WM = { 1:{ r:['#081430', '#1a3462', '#3a5c94', '#8aaee0', '#f4fbff', '#6a8ac0'] }, 2:{ flat:'#a8bcd6', noLine:1 }, 3:{ flat:'#7890b4', noLine:1 } };

  // ---------------------------------------------------------------- Sairyū
  const TW = 112, TH = 124, TWL = 113;   // grid size; waterline row in the baked canvas
  const TPOSE = {
    idle0:{ bob:0, tilt:0, jaw:.1, arm:[[68, 82], [80, 90], .9], far:[[74, 78], [86, 84], .8], tail:0 },
    idle1:{ bob:1, tilt:-.04, jaw:.2, arm:[[67, 83], [79, 92], 1], far:[[73, 79], [85, 86], .9], tail:2 },
    wind:{ bob:0, tilt:-.12, jaw:.35, arm:[[52, 46], [44, 26], -1.9], far:[[76, 74], [88, 78], .5], tail:3 },
    strike:{ bob:1, tilt:.1, jaw:.6, arm:[[80, 62], [98, 58], 0], far:[[60, 80], [52, 90], 2.2], tail:-2 },
    roar:{ bob:-1, tilt:-.5, jaw:1, arm:[[76, 58], [86, 42], -1.2], far:[[80, 60], [94, 50], -.8], tail:4 },
    beam:{ bob:1, tilt:.06, jaw:1, arm:[[64, 82], [74, 90], 1.2], far:[[72, 80], [84, 88], 1], tail:-1 }
  };
  function titanGrid(p){ const g = new Grid(TW, TH), b = p.bob, hx0 = 66, hy0 = 40 + b, ca = Math.cos(p.tilt), sa = Math.sin(p.tilt);
    const R = (x, y) => [hx0 + (x - hx0) * ca - (y - hy0) * sa, hy0 + (x - hx0) * sa + (y - hy0) * ca + b];   // head points turn around the neck
    const meta = {};
    const arm = (A, m, sx, sy) => { const [[ex, ey], [hx2, hy2], ang] = A; g.cap(sx, sy, ex, ey + b, 6.5, 5.5, m); g.cap(ex, ey + b, hx2, hy2 + b, 5.5, 4.5, m); g.ell(hx2, hy2 + b, 5, 4.5, m);
      for(const da of [-.45, 0, .45]){ const a2 = ang + da; g.cap(hx2 + Math.cos(a2) * 3, hy2 + b + Math.sin(a2) * 3, hx2 + Math.cos(a2) * 10, hy2 + b + Math.sin(a2) * 10, 2, .6, m === 2 ? 2 : 6); } };
    // far arm and far leg, behind everything
    arm(p.far, 2, 63, 62 + b); g.ell(54, 110, 11, 10, 2);
    // tail: a thick sweep out to the left, down into the water
    const tl = p.tail; g.cap(38, 100 + b, 18, 104 + tl, 14, 10, 1); g.cap(18, 104 + tl, 6, 111 + tl, 10, 6, 1); g.cap(6, 111 + tl, -2, 118, 6, 3, 1);
    // the sail: ribs fanned along the spine from the shoulders to the tail root, scalloped membrane between the tips
    const N = 7, P0 = [49, 50 + b], P1 = [27, 92 + b], bd = [P1[0] - P0[0], P1[1] - P0[1]], bl = Math.hypot(bd[0], bd[1]), bn = [bd[0] / bl, bd[1] / bl], nrm = [bn[1] * -1, bn[0]];
    const dir = [-.42, -.91];
    const bases = [], tips = [];
    for(let i = 0; i < N; i++){ const t = i / (N - 1), hh = 12 + 30 * Math.sin(Math.PI * (.1 + .85 * t)) * (1 - t * .3); bases.push([P0[0] + bd[0] * t + nrm[0], P0[1] + bd[1] * t + nrm[1]]); tips.push([bases[i][0] + dir[0] * hh, bases[i][1] + dir[1] * hh]); }
    const mem = bases.slice(); for(let i = N - 1; i >= 0; i--){ mem.push(tips[i]); if(i > 0){ const a = tips[i], c = tips[i - 1], m2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], bm = [(bases[i][0] + bases[i - 1][0]) / 2, (bases[i][1] + bases[i - 1][1]) / 2]; mem.push([m2[0] + (bm[0] - m2[0]) * .2, m2[1] + (bm[1] - m2[1]) * .2]); } }
    g.poly(mem, 5);
    for(let i = 0; i < N; i++){ const [bx, by] = bases[i], [tx, ty] = tips[i]; g.cap(bx, by, tx, ty, 1, .6, 6, i + 1); g.cap(tx, ty, tx + dir[0] * 4, ty + dir[1] * 4, .7, .4, 6, i + 1); }
    meta.ribs = tips.map(t => [t[0] + 1, t[1] + 1]);
    // body: hips to chest, leaning toward the foe; belly plates on the front
    g.cap(42, 100 + b, 56, 58 + b, 19, 14, 1); g.ell(40, 110, 14, 12, 1);
    g.cap(52, 104 + b, 64, 62 + b, 9, 7, 3); for(let y = 60; y < 112; y += 5) for(let x = 40; x < 80; x++){ const yy = y + b + Math.round((x - 52) * -.2); if(g.get(x, yy) === 3) g.set(x, yy, 4); }
    // neck and head: a long crested snout with one nose horn, three swept-back bone frills
    g.cap(56, 60 + b, 66, 42 + b, 12, 9, 1);
    for(const [a, c, d] of [[[64, 32], [46, 18], [62, 37]], [[63, 38], [44, 32], [61, 42]], [[64, 43], [48, 44], [62, 47]]]) g.poly([R(...a), R(...c), R(...d)], 6);
    g.cap(...R(64, 36), ...R(90, 34), 8.5, 5, 1);
    const jw = p.jaw * 9; g.cap(...R(67, 43), ...R(88, 42 + jw), 5, 3, 1);
    if(p.jaw > .15){ g.poly([R(70, 40), R(91, 36.5), R(89, 41 + jw * .85), R(70, 45)], 7); for(let x = 74; x < 90; x += 3){ g.set(...R(x, 39.5), 6); g.set(...R(x + 1, 41 + jw * (x - 70) / 20 - 1), 6); } }
    g.poly([R(80, 29), R(85, 18), R(87, 29)], 6);
    g.cap(...R(70, 29), ...R(80, 28.5), 1.6, 1.2, 6);
    for(const [ex, ey] of [[77, 31], [78, 31], [77, 30]]) g.set(...R(ex, ey), 8);
    meta.eye = (q => [q[0] + 1.5, q[1] + 1])(R(77.5, 31));
    meta.mouth = (q => [q[0] + 1, q[1] + 1])(R(90, 38 + jw * .5));
    // near arm and the near thigh, on top
    g.ell(44, 112, 13, 11, 1); arm(p.arm, 1, 60, 66 + b);
    meta.chest = [60, 70 + b]; meta.head = [74, 34 + b]; return { g, meta }; }
  // charge glow: the sail ribs lit from the tail toward the head in four hard steps
  function sailGlow(lv, g){ const c = document.createElement('canvas'); c.width = g.w + 2; c.height = g.h + 2; const k = c.getContext('2d');
    for(let y = 0; y < g.h; y++) for(let x = 0; x < g.w; x++){ const a = g.a[y * g.w + x]; if(!a || g.m[y * g.w + x] !== 6) continue; const i = 7 - a; if(i >= lv * 7 / 4) continue;
      const tip = g.get(x - 1, y) === 0 || g.get(x, y - 1) === 0; k.fillStyle = tip ? '#fff4c8' : i < lv * 7 / 4 - 1.5 ? '#ffc04a' : '#ff7a2a'; k.fillRect(x + 1, y + 1, 1, 1); }
    return c; }

  // ---------------------------------------------------------------- Kanigaru
  const FW = 132, FH = 120, FWL = 111;
  const FPOSE = {
    idle:{ big:[[32, 86], [20, 72], -1.9, .35], small:[[40, 98], [30, 92], -2.5, .2], lift:0, flare:0 },
    raise:{ big:[[34, 70], [28, 46], -1.6, .8], small:[[40, 96], [30, 88], -2.3, .3], lift:.2, flare:0 },
    strike:{ big:[[24, 80], [8, 74], -3.05, .1], small:[[38, 98], [28, 94], -2.7, .2], lift:.1, flare:0 },
    flare:{ big:[[30, 76], [18, 58], -2.1, .6], small:[[38, 92], [26, 80], -2.4, .5], lift:1, flare:1 },
    hit:{ big:[[38, 66], [36, 46], -1.1, .95], small:[[44, 90], [40, 78], -1.4, .8], lift:.55, flare:0 }
  };
  function foeGrid(p){ const g = new Grid(FW, FH), L = p.lift, meta = { spots:[] };
    const claw = (sh, A, m, sz) => { const [[ex, ey], [wx, wy], ang, op] = A; g.cap(sh[0], sh[1], ex, ey, 5, 4.5, m); g.cap(ex, ey, wx, wy, 4.5, 4, m); g.ell(wx, wy, sz * .42, sz * .36, m);
      // the chela: a swollen palm, then a fixed finger and a hinged dactyl that curve toward each other, pale tips
      const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, P = (u, v) => [wx + ux * u * sz + vx * v * sz, wy + uy * u * sz + vy * v * sz];
      g.cap(...P(-.1, 0), ...P(.42, 0), sz * .3, sz * .34, m); const o2 = op * .5;
      const F1 = [P(.4, .14), P(.78, .2 + o2 * .3), P(1.02, .08 + o2 * .2)], F2 = [P(.4, -.16), P(.74, -.3 - o2), P(.98, -.16 - o2 * 1.1)];
      for(const F of [F1, F2]){ g.cap(...F[0], ...F[1], sz * .16, sz * .11, m); g.cap(...F[1], ...F[2], sz * .11, sz * .04, 9); }
      return P(.5, 0); };
    // far wing, up and back to the left, in the dark
    const fw = [[74, 54], [60, 14 - L * 8], [70, 4 - L * 10], [84, 10 - L * 8], [90, 40]]; g.poly(fw, 4); g.ell(72 - L, 18 - L * 8, 4, 3, 5); g.ell(72 - L, 18 - L * 8, 2, 1.5, 6); meta.spots.push([73 - L, 19 - L * 8, .5]);
    // legs behind the shell, wading
    for(const [a, b2, c] of [[[80, 86], [96, 98], [102, 114]], [[72, 90], [84, 104], [86, 118]], [[56, 90], [48, 104], [44, 118]]]){ g.cap(...a, ...b2, 3.5, 2.8, 2); g.cap(...b2, ...c, 2.8, 1.5, 2); }
    // the small claw on the far side
    claw([54, 88], p.small, 2, 13);
    // near wing: up and out to the right, tattered, two eye-spots
    const nw = [[76, 58], [92, 10 - L * 10], [108, 2 - L * 12], [126, 14 - L * 10], [128, 40 - L * 6], [118, 58 - L * 2], [100, 68]]; g.poly(nw, 3);
    for(let v = 2; v < nw.length - 1; v++) for(const t of [.35, .7]){ const a = nw[v], c = nw[v + 1]; g.ell(lerp(a[0], c[0], t), lerp(a[1], c[1], t), 2.2 + (v % 2), 1.8 + (v % 2), 0); }
    for(const e of [[100, 6 - L * 11], [118, 6 - L * 11], [127, 28 - L * 8], [122, 50 - L * 4], [110, 64 - L]]) g.line(78, 58, e[0] - (e[0] - 78) * .08, e[1] - (e[1] - 58) * .08, 4);
    const s1 = [110, 26 - L * 9], s2 = [106, 50 - L * 4];
    g.ell(...s1, 8, 7, 5); g.ell(...s1, 6, 5, 6); g.ell(s1[0] - 1, s1[1] - 1, 2.5, 2.2, 7); g.ell(...s2, 4.5, 4, 5); g.ell(...s2, 3, 2.5, 6); g.set(s2[0] - 1, s2[1] - 1, 7);
    meta.spots.push([s1[0] + 1, s1[1] + 1, 1], [s2[0] + 1, s2[1] + 1, .6]);
    // the shell: a broad carapace, ridge spikes along the top, a plated front and seams
    g.ell(66, 76, 27, 21, 1); for(let x = 46; x <= 86; x += 8){ const top = 76 - 21 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 66) / 27, 2))); g.poly([[x - 3.5, top + 3], [x - 1, top - 6], [x + 3, top + 3]], 9); }
    for(const yy of [74, 84]) for(let x = 42; x < 92; x++){ const y = yy + Math.round(Math.pow((x - 66) / 26, 2) * 6); if(g.get(x, y) === 1) g.set(x, y, 2); }
    // head and face toward the titan: eye stalks with teal eyes, mandibles, two feathery antennae
    g.ell(44, 68, 11, 9, 1);
    for(const [a, c] of [[[36, 64], [30, 76]], [[42, 74], [38, 80]]]) g.cap(...a, ...c, 2.2, 1, 9);
    for(const [bx, by, tx, ty] of [[40, 62, 36, 52], [47, 60, 47, 50]]){ g.cap(bx, by, tx, ty, 1.8, 1.4, 1); g.ell(tx, ty - 1, 2.2, 2.2, 8); }
    meta.eyes = [[37, 52], [48, 50]];
    for(const [ax, ay, dx, dy] of [[42, 56, -14, -18], [48, 55, -4, -22]]){ let x = ax, y = ay; for(let i = 0; i < 9; i++){ const nx = x + dx / 9 - (i > 5 ? 1 : 0), ny = y + dy / 9; g.line(x, y, nx, ny, 9); if(i % 2) { g.set(nx - 2, ny + 1, 9); g.set(nx + 1, ny + 2, 9); } x = nx; y = ny; } }
    // the big claw, near side, on top
    meta.claw = claw([48, 80], p.big, 1, 24).map(v => v + 1);
    meta.chest = [52, 72]; meta.head = [44, 60]; return { g, meta }; }

  // ---------------------------------------------------------------- small sprites: splash, explosion, helicopter, tower, puffs, clouds
  function splashGrid(f){ const g = new Grid(28, 44), hs = [10, 30, 40, 34, 18][f], wd = [8, 7, 8, 9, 11][f];
    if(f < 4){ g.cap(14, 44, 14, 44 - hs, wd, wd * .7, 1); for(let i = 0; i < 5; i++){ const a = -Math.PI / 2 + (i - 2) * .45, x0 = 14 + (i - 2) * 2.5, y0 = 44 - hs + 2; g.cap(x0, y0, x0 + Math.cos(a) * (5 + f * 2), y0 + Math.sin(a) * (5 + f * 2), 2.2, .6, 1); } }
    else g.ell(14, 42, 13, 4, 1);
    for(let i = 0; i < 14 + f * 6; i++){ const x = H1(i * 3.7 + f) * 28, y = 44 - hs - 4 + H1(i * 9.1 + f * 2) * (hs + 6) * (f > 2 ? 1 : .4); g.set(x, y, 2); }
    return g; }
  function explosion(f){ return procSprite('kj_ex' + f, 40, 40, (x, y) => { const dx = x - 19.5, dy = y - 19.5, a = Math.atan2(dy, dx), lump = 1 + .16 * Math.sin(a * 5 + f * 1.3) + .1 * Math.sin(a * 9 + 2 + f), r = Math.hypot(dx, dy) / lump;
    const R = [7, 12, 17, 19, 19][f], th = B4[(y & 3) * 4 + (x & 3)];
    if(r > R) return null;
    if(f >= 3){ const holes = H1(Math.floor(x / 3) * 7.1 + Math.floor(y / 3) * 3.3 + f) > (f === 3 ? .75 : .45); if(holes) return null; return r > R * .7 ? '#2a1e34' : r > R * .4 ? '#4a3448' : f === 3 ? '#a0503a' : '#5a3c48'; }
    const q = r / R; if(q < .35 - f * .05) return '#fffbe8'; if(q < .55) return '#ffe070'; if(q < .78 + th * .06) return '#ff9a2a'; return '#c8301e'; }); }
  const HELI = f => makeSprite([f ? '....KKKKKKK....' : 'KKKKKKKKKKKKKKK', '.......K.......', '.....KKKKK.....', '....KNNNNgK....', 'KKKKKNNNNggK...', 'R...KNNNNNNK...', '.....K...K.....', '....KKKKKKK....'],
    { K:'#0a0810', N:'#2a2836', g:'#8aa0d0', R:'#ff2a3a' }, false);
  const tower = dead => procSprite('kj_tower' + (dead ? 'd' : ''), 22, 92, (x, y) => {
    if(y < 12){ if(x === 11 && y > 1) return y < 4 ? '#ff3a3a' : '#2a2c3a'; return null; }
    if(y < 18 && (x < 6 || x > 16)) return null; if(y < 18 && (x === 6 || x === 16)) return '#06070e';
    if(x === 0 || x === 21 || y === 12 && (x < 6 || x > 16) || y === 18) return '#06070e';
    if(x === 1) return '#4a5478'; if(x === 20) return '#0a0c16';
    if(x % 3 === 2 && y % 4 === 1 && x < 19 && y > 20){ const h = H1(x * 13.1 + y * 7.7); if(dead) return h > .9 ? '#ff7a2a' : '#121420'; return h > .55 ? (h > .85 ? '#cfe4ff' : '#ffd890') : '#1a1e30'; }
    return y % 16 === 0 ? '#202638' : '#141826'; });
  const puff = (n, lit) => procSprite('kj_puff' + n + (lit ? 'l' : ''), 8 + n * 6, 8 + n * 6, (x, y) => { const R = 4 + n * 3, dx = x + .5 - R, dy = y + .5 - R, d = Math.hypot(dx, dy) / R, th = B4[(y & 3) * 4 + (x & 3)];
    if(d > 1 || d > .82 && th > .5) return null; return dy < -R * .35 && dx < R * .2 ? (lit ? '#7a5a5a' : '#4a4258') : d > .7 || dy > R * .3 ? '#1c1828' : (lit ? '#4a3440' : '#2e2a3c'); });
  // the underside of the rain cloud, lit by the beam: a dithered band, densest at its lumpy lower edge
  const cloudLit = () => procSprite('kj_cloudlit', 200, 40, (x, y) => { const edge = 26 + Math.sin(x * .07) * 5 + Math.sin(x * .19 + 1) * 3 + Math.sin(x * .031 + 2) * 4; if(y > edge) return null;
    const v = 1 - (edge - y) / 30, fx = Math.min(x, 199 - x) / 50; const q = v * Math.min(1, fx); if(q < B4[(y & 3) * 4 + (x & 3)]) return null; return y > edge - 2 ? '#ffd890' : y > edge - 6 ? '#e07a3a' : '#7a3424'; });
  // typhoon cloud deck: a tiling band of low scud, two tones and a pale rim (and a lightning-lit copy)
  const stormBand = lit => procSprite('kj_storm' + (lit ? 'l' : ''), 256, 56, (x, y) => { const t = x / 256 * Math.PI * 2, edge = 34 + Math.sin(t * 3) * 7 + Math.sin(t * 7 + 1) * 4 + Math.sin(t * 13 + 2) * 2, th = B4[(y & 3) * 4 + (x & 3)];
    if(y > edge) return null;   /* a solid edge: dither holes sliding over the moon would blink single pixels */ const inner = 30 + Math.sin(t * 5 + 3) * 6 + Math.sin(t * 11) * 3;
    if(y > edge - 2) return lit ? '#9aaad8' : '#2c3854'; if(y > inner && y < inner + 3 && (x + y) % 3 === 0) return lit ? '#6a7aa8' : '#1e2840'; return lit ? (y > inner ? '#4a5880' : '#36426a') : (y > inner ? '#161e30' : '#0e1424'); });
  // a fukinagashi windsock (red and white) on a pole: lv 0 droops .. 3 straight out downwind
  const sock = (lv, fl) => procSprite('kj_sock' + lv + fl, 26, 30, (x, y) => {
    if(x === 2 && y >= 3) return y === 3 ? '#e8e4d8' : '#5a5e70'; if(x === 1 && y >= 3) return '#1a1c26';
    const ang = [1.35, .95, .45, .12][lv] + (fl ? .07 : -.04) * (lv + 1), len = [10, 14, 18, 21][lv];
    for(let i = 0; i < len; i++){ const px = 3 + Math.sin(ang) * i + (fl && lv ? Math.sin(i * .9) * .6 : 0), py = 4 + Math.cos(ang) * i, r = 2.6 - i / len * 1.2;
      if(Math.abs(x + .5 - px) <= r * Math.cos(ang) + .5 && Math.abs(y + .5 - py) <= r + .2) return (Math.floor(i / 4) % 2 ? '#f0ece0' : '#ff5a2a'); }
    return null; });

  // ---------------------------------------------------------------- warm: build everything once
  let built = false;
  function build(){ if(built) return; built = true;
    for(const k in TPOSE){ const { g, meta } = titanGrid(TPOSE[k]); S['t_' + k] = bake('t_' + k, g, TM); S['t_' + k].meta = meta; meta.wl = TWL; S['tH_' + k] = bake('tH_' + k, g, TM, HOT_R); S['tH_' + k].meta = meta;
      if(k === 'idle0' || k === 'beam' || k === 'roar') for(let lv = 1; lv <= 4; lv++) S['tG_' + k + lv] = sailGlow(lv, g); }
    for(const k in FPOSE){ const { g, meta } = foeGrid(FPOSE[k]); S['f_' + k] = bake('f_' + k, g, FM); S['f_' + k].meta = meta; meta.wl = FWL; S['fH_' + k] = bake('fH_' + k, g, FM, HOT_L); S['fH_' + k].meta = meta; }
    for(let f = 0; f < 5; f++){ S['sp' + f] = bake('sp' + f, sprayGrid(Math.min(5, f + (f > 2 ? 1 : 0)), [24, 63], 0, 99), WM); S['ex' + f] = explosion(f); }
    for(const lv of [0, 1]){ S['heliN' + lv] = makeSprite(HELI_NEAR, HELI_PAL[lv], false); S['heliM' + lv] = makeSprite(HELI_MID, HELI_PAL[lv], false); }
    S.pieces = [mkPiece(3, 820, 240, 600, 1), mkPiece(7, 640, 220, 520, 1), mkPiece(11, 420, 300, 360, 1)]; DRC = document.createElement('canvas'); DRC.width = DRW; DRC.height = DRW; DRG = DRC.getContext('2d', { willReadFrequently:true }); DRI = DRG.createImageData(DRW, DRW); pats(); S.tower = tower(0); S.towerD = tower(1); for(let n = 0; n < 3; n++){ S['pf' + n] = puff(n, 0); S['pfl' + n] = puff(n, 1); } S.cloudLit = cloudLit();
    S.storm = stormBand(0); S.stormL = stormBand(1);
    for(let lv = 0; lv < 4; lv++) for(let f = 0; f < 2; f++) S['sock' + lv + f] = sock(lv, f);
    for(let f = 0; f < 6; f++) S['wv' + f] = waveSheet(f);
    S.arrow = makeSprite(['....K...', '....KK..', 'KKKKKAK.', 'KAAAAAAK', 'KKKKKAK.', '....KK..', '....K...'], { K:'#2a1404', A:'#ffb02a' }, false); 
    for(let v = 0; v < 3; v++){ S['ch' + v] = chunkSpr(v); S['fl' + v] = flame(v); } bakeLabels();
    S.mist = mistSprite(); dbuf = document.createElement('canvas'); dbuf.width = cv.width; dbuf.height = cv.height; dbuf.getContext('2d').drawImage(cv, 0, 0); for(let q = 0; q <= 4; q++) for(const [len, wdt, col] of [[3, 1, '#4a5c84'], [7, 1, '#7e90bc'], [14, 2, '#b4c4e6']]) S['rs' + len + q] = streak(len, wdt, col, q, .35 + q * .9 / 4);
    cx.save(); for(const k in S){ const v = S[k]; for(const c of Array.isArray(v) ? v : [v]) if(c && c.width) cx.drawImage(c, 0, 0, 1, 1); } cx.restore(); }   // upload textures now, not mid-ride

  // ---------------------------------------------------------------- the spray sheet thrown over the sea wall (anchored at its lower left)
  // Hokusai rules: a fan of clawed fingers bursting up from the wall and leaning downwind, foam dots flung ahead of them;
  // the parts over the road are broken into clustered holes (spray, not a curtain), so traffic always reads through it
  const WS = { 1:{ r:['#0b1a36', '#2c4878', '#7c9cc8', '#dfeef6', '#f6f4ea', '#a8c0e0'] }, 2:{ flat:'#a8bcd6', noLine:1 }, 3:{ flat:'#7890b4', noLine:1 } };
  // a droplet cluster: a few shaped dots (single, pair, plus) around (x, y); the brighter ones on the moon side, the rest a cool mid tone
  function drops(g, x, y, n, seed, spread){ n = Math.ceil(n * .5); for(let i = 0; i < n; i++){ const a = H1(seed + i * 3.7) * 6.283, r = spread * .7 * Math.sqrt(H1(seed * 1.3 + i * 5.1)), px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r * .8), m = H1(seed + i) > .5 ? 2 : 3;
    g.set(px, py, m); if(i % 2) g.set(px + 1, py + 1, m); } }
  // Hokusai rules: fingers rise from the wall and curl over downwind, each ending in three clawed hooks that break into droplet
  // clusters; the sheet thins by breaking into clusters (never by punching square holes), so traffic shows through the gaps
  function sprayGrid(f, B, wind, over){ const g = new Grid(48, 64), dir = wind ? 1 : 0;
    const finger = (a0, L, w0, bend, claw, seed) => { let x = B[0], y = B[1], a = a0; const n = 7;
      for(let k = 1; k <= n; k++){ const t = k / n; a = a0 + bend * t * t; const nx = x + Math.cos(a) * L / n, ny = y + Math.sin(a) * L / n; g.cap(x, y, nx, ny, w0 * (1 - (t - 1 / n) * .75), w0 * (1 - t * .75), 1); x = nx; y = ny; }
      if(claw){ for(let c = 0; c < 3; c++){ const ca = a + .5 + c * .55; let hx = x, hy = y, ha = ca; for(let s2 = 0; s2 < 3; s2++){ const nx = hx + Math.cos(ha) * claw / 3, ny = hy + Math.sin(ha) * claw / 3; g.cap(hx, hy, nx, ny, 1.2 - s2 * .3, 1 - s2 * .3, 1); hx = nx; hy = ny; ha += .55; } }
        drops(g, x + Math.cos(a + .9) * claw * 1.4, y + Math.sin(a + .9) * claw * 1.4, 4 + (seed % 3), seed, claw); } return [x, y]; };
    const fan = (n, len, lean, w, bend, claw) => { for(let i = 0; i < n; i++){ const a = -Math.PI / 2 - .5 * (1 + dir * .3) + i * ((1 + dir * .3) / (n - 1)) + lean * dir, L = len * (.72 + .28 * H1(i * 2.1 + f)); finger(a, L, w, bend * (dir || (i < n / 2 ? -1 : 1)), claw, i * 11 + f * 7); } };
    if(f === 0){ g.ell(B[0] + dir, 61, 8, 4, 1); fan(4, 10, .15, 2.4, .4, 2); }
    if(f === 1){ g.ell(B[0] + dir, 61, 8, 4, 1); fan(dir ? 4 : 5, 30, .2, dir ? 2.6 : 3.6, .7, 4); }
    if(f === 2){ g.ell(B[0] + dir, 61, 8, 4, 1); fan(dir ? 4 : 6, 46, .3, dir ? 2.8 : 4.2, dir ? 1.05 : 1.2, 5); }
    if(f === 3){ g.ell(B[0] + dir, 61, 9, 4, 1); fan(dir ? 4 : 5, 34, .5, dir ? 2.2 : 3, 1.4, 4); for(let i = 0; i < 6; i++) drops(g, B[0] + 10 * dir + H1(i * 7) * 30, 14 + H1(i * 3.3) * 34, 6, 50 + i * 9, 4); }
    if(f === 4){ g.ell(B[0] + 2 * dir, 61, 10, 3, 1); fan(3, 14, .5, 2, 1, 2); for(let i = 0; i < 7; i++) drops(g, B[0] + 8 * dir + H1(i * 5) * 32, 24 + H1(i * 2.7) * 34, 5, 90 + i * 9, 4); }
    if(f === 5){ g.ell(B[0] + 2 * dir, 62, 9, 2, 1); for(let i = 0; i < 6; i++) drops(g, B[0] + 6 * dir + H1(i * 4.1) * 30, 36 + H1(i * 1.9) * 26, 4, 140 + i * 9, 3); }
    if(!dir) for(let x = 0; x < 48; x++) for(let y = 0; y < 64; y++) if(x < 2 || x > 45) g.set(x, y, 0);
    return g; }
  const waveSheet = f => bake('wv' + f, sprayGrid(f, [8, 63], 1, 11), WS);
  // ---------------------------------------------------------------- scheduling: trigger segments, found from where each road begins
  const KJ_AT = 440, KJ_FROM = 600, KJ_TO = -420;   // d = segments still to ride to the peak (the titans rise out of the bay at d 600, 760 segments away)
  const TY_FROM = 200, TY_LEN = 520, TY_RAMP = 70;
  const kjTrig = [], tyTrig = [];
  const K = { trig:-1, lastD:null, ref:0, hold:{}, tsP:[] }, T = { trig:-1, lastP:null, told:false, thunderId:-1 };
  const pSeg = () => (position + PZ) / SEG;
  const FR = { now:-1, p:0, kj:-1, ty:-1 };   // per-frame: which set piece is live (drawBackdrop runs first each frame)
  const frame = now => { if(FR.now !== now){ FR.now = now; FR.wd = null; FR.p = pSeg(); FR.kj = activeKj(FR.p); FR.ty = activeTy(FR.p); FR.bz = activeZone(FR.p); FR.g = FR.bz ? FR.p - (FR.bz.pk - BLAST_D) : -1;
    FR.st = FR.kj >= 0 ? kjState(FR.kj - FR.p, now) : null; FR.tsFar = true; if(FR.st){ if(!TS.built) tsBuild(); tsFrame(FR, FR.st, FR.kj - FR.p); CHG = FR.st.charge; } if(FR.kj >= 0) heliPassSeg(FR.kj); heliFrame(now, FR.st ? FR.kj - FR.p : 1e9); } return FR; };
  function activeKj(p){ const dbg = MECH.sp_kaiju.dbg; if(dbg && dbg.kaiju !== undefined) return dbg.kaiju; for(const t of kjTrig){ const d = t - p; if(d <= KJ_FROM && d >= KJ_TO && segs[t] && segs[t].kjPeak) return t; }
    for(const q of K.tsP){ const d = q.pk - p; if(q.r === segs && d <= KJ_FROM && d >= KJ_TO && !(segs[q.pk] && !segs[q.pk].kjPeak && q.pk < segs.length - 1)) return q.pk; } return -1; }   // (a booked fight is seen before its peak segment is built)
  function activeTy(p){ const dbg = MECH.sp_kaiju.dbg; if(dbg && dbg.typhoon !== undefined) return dbg.typhoon; for(const t of tyTrig){ if(p >= t - 90 && p <= t + TY_LEN + 60 && segs[t] && segs[t].tyStart) return t; } return -1; }

  // ---------------------------------------------------------------- the kaiju timeline, a pure function of d (so it is always timed to the rider)
  const T_STRIKES = [520, 450, 380, 300, 245], F_STRIKES = [490, 410, 330, 215], PASS = -200;   // PASS: the titans stand 160 segments past the peak (beyond the bridge break); you ride between their feet at d = PASS
  function kjState(d, now){ const st = { tp:'idle0', fp:'idle', charge:0, beam:0, impact:-1, deflect:0, collapse:0, fall:0 };
    const slow = reduce ? 1400 : 700; st.tp = Math.floor(now / slow) % 2 ? 'idle1' : 'idle0';
    st.tRise = sm((KJ_FROM - d) / 50); st.fRise = sm((KJ_FROM - 20 - d) / 40);
    for(const s of T_STRIKES){ if(d >= s && d < s + 12) st.tp = 'wind'; else if(d < s && d >= s - 10) st.tp = 'strike'; }
    for(const s of F_STRIKES){ if(d >= s && d < s + 12) st.fp = 'raise'; else if(d < s && d >= s - 10) st.fp = 'strike'; }
    if(d <= 286 && d > 255) st.fp = 'flare';
    if(d <= 232 && d > 192) st.tp = 'roar';
    if(d <= 192 && d > 70) st.charge = clamp(1 + Math.floor((192 - d) / 30), 1, 4);
    if(d <= 190 && d > 70) st.fp = 'flare';
    if(d <= 100 && d > -22) st.tp = 'beam';
    if(d <= 70 && d > -22){ st.charge = 4; st.beam = Math.min(1, (70 - d) / 8) * (d < -12 ? (d + 22) / 10 : 1); }
    if(d <= -22 && d > -70) st.charge = d > -46 ? 2 : 1;
    if(d <= 56 && d > -30) st.impact = (56 - d) / 86;
    if(d <= 56) st.fp = 'hit';
    if(d <= PASS - 12) st.fall = sm((PASS - 12 - d) / 170);   // the crab staggers under the beam and only goes down into the bay once you are past it
    if(d <= 42 && d > 8) st.deflect = (42 - d) / 34;
    if(d <= 14) st.collapse = clamp((14 - d) / 170, 0, 1);
    if(d <= -70) st.tp = (d > -150 || Math.floor(now / (reduce ? 2400 : 1400)) % 3) ? 'roar' : 'idle1';
    st.steam = d < -20 ? clamp((-20 - d) / 40, 0, 1) : 0;
    // the giants grow and part as you close in, then slide out to the sides as you pass between them
    const u = clamp((KJ_FROM - d) / KJ_FROM, 0, 1), v = clamp(-d / 220, 0, 1);
    const hf = .4 + .16 * u + .05 * sm(v), kk = H * hf / 112; st.k = Math.max(PX, Math.round(kk / (PX * .25)) * PX * .25);
    st.sep = W * (.13 + .15 * u + .06 * sm(v)); st.sc = st.k / PX;
    st.alpha = d < KJ_TO + 40 ? clamp((d - KJ_TO) / 40, 0, 1) : 1;   /* (a checkpoint hold delays the fight's beats and card, not the sight of the titans) */
    // the stacked titans' part poses: the titan's head roars and breathes, its near arm winds and strikes, its tail lashes, its near
    // foot lifts and stomps; the crab's great claw rises, jabs across the road and recoils, its wings flare
    const tp = st.tp, fp = st.fp;
    st.pose = { sbody:'idle', ships:'idle', sleg:d <= STOMP_UP && d > STOMP_D ? 'raised' : 'planted', shead:tp === 'roar' ? 'roar' : tp === 'beam' ? 'beam' : 'idle',
      sarm:tp === 'wind' || tp === 'roar' ? 'wind' : tp === 'strike' ? 'strike' : 'idle', stail:tp === 'wind' || tp === 'roar' || d <= 196 && d > 178 || Math.floor(now / (reduce ? 4200 : 2100)) % 3 === 0 ? 'high' : 'low',
      fshell:'idle', farch:'idle', fclaw:fp === 'raise' || fp === 'flare' ? 'raise' : fp === 'strike' ? 'strike' : fp === 'hit' ? 'hit' : 'idle', fwings:fp === 'flare' || fp === 'hit' && d > -60 ? 'flare' : 'fold' };
    return st; }
  const STOMP_UP = 210, STOMP_D = 128;   // the titan's near foot lifts at d 190 and comes down at d 118, on the far side of the left barrier
  // splashes at the giants' feet: [d at which it starts, who, size]
  const SPLASH = [[432, 0, 1], [400, 1, 1.4], [360, 0, .8], [330, 1, .8], [300, 0, 1.2], [245, 0, .8], [-40, 1, 1.6], [-70, 1, 1]];
  // shockwave crests rolling across the bay toward the bridge: launched at these d
  const WAVES = [400, 300, -40];
  const crestAhead = (d0, d) => 170 - (d0 - d) * 1.45;

  // ---------------------------------------------------------------- drawing helpers
  function drawGiant(spr, x, wl, k, sink, rot, pivotY){ const w = spr.width * k, h = spr.height * k, wlr = spr.meta && spr.meta.wl || 0;
    cx.save(); cx.beginPath(); cx.rect(-W, -H, W * 3, wl + PX - -H); cx.clip();
    const x0 = snap(x - w / 2), y0 = snap(wl - wlr * k + sink);
    if(rot){ const px = x0 + w / 2, py = y0 + pivotY * k; cx.translate(px, py); cx.rotate(rot); cx.translate(-px, -py); }
    cx.imageSmoothingEnabled = false; cx.drawImage(spr, x0, y0, w, h); cx.restore(); return [x0, y0]; }
  function foam(x, wl, w, now, a){ cx.fillStyle = '#c8dcf0'; for(let i = 0; i < 18; i++){ const ph = (now / 520 + H1(i)) % 1, xx = x + (H1(i * 3.3) - .5) * w, yy = wl - ph * PX * 3; cx.globalAlpha = a * (1 - ph) * .9; cx.fillRect(snap(xx), snap(yy), PX * (i % 3 ? 1 : 2), PX); }
    cx.globalAlpha = a * .8; cx.fillStyle = '#7a94c4'; for(let i = 0; i < 9; i++){ const xx = x - w * .55 + (((H1(i * 7.1) * w * 1.1 + now * .012 * (i % 2 ? 1 : -1)) % (w * 1.1)) + w * 1.1) % (w * 1.1); cx.fillRect(snap(xx), wl, PX * 3, PX); } cx.globalAlpha = 1; }
  function beamLine(x0, y0, x1, y1, len, w, now, al){ const n = Math.max(1, Math.round(Math.abs(x1 - x0) * len / (PX * 2))), dir = Math.sign(x1 - x0) || 1;
    cx.globalCompositeOperation = 'lighter';
    for(const [ww, col, a] of [[w * 2.2, '#ff3a10', .45], [w * 1.3, '#ff9a2a', .75], [w * .55, '#fff2c0', 1]]){ cx.fillStyle = col; cx.globalAlpha = a * al;
      for(let i = 0; i < n; i++){ const t = i / n * len, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, j = reduce ? 1 : .85 + .3 * H1(Math.floor(i / 3) * 3.1 + Math.floor(now / 140)), th = Math.max(PX, snap(ww * j));
        cx.fillRect(snap(x), snap(y - th / 2), PX * 2 * dir, th); } }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
  const pt = (o, spr, k, m) => [o[0] + m[0] * k, o[1] + m[1] * k];

  // ================================================================ 立体 the titans as stacked sprites, standing in the world beside the road
  /* Sprite stacking (Nium, Teo Chhim's demos, dev_dwarf's Stack3D notes): a 3D form is cut into a pile of 2D pixel-art slices and drawn
     slice by slice. Here the camera looks down the road (+z) and never yaws, so the slices are cut across the road (planes of constant z):
     a plane parallel to the image plane projects as a pure scale, so every slice is exact, and the pile, drawn far to near with each slice
     at its own depth, gives true parallax: the titans are seen in profile as you approach, their road-facing chests and faces swing into
     view as you pass between their feet, and their far flanks show in the bike's mirror once they are behind you.
     The model is voxels: primitives (tapered capsules, ellipsoids, extruded fins, hand-placed face pixels) rasterised into a material grid,
     V world units a voxel. Light is baked per voxel from a smoothed-occupancy normal: a cool moon from the upper left and beyond (a rim on
     every top-left edge), the burning city and the bridge lights warm on the flank that faces you (stronger low down), creases darkened
     (ambient occlusion from the same field), shadow-side slice edges carved one tone darker (a selective outline, never a ring).
     Slices are packed per part and pose into atlases at depth-LOD levels (1, 2, 4, 8, 16 slices merged front-to-back, and the whole part),
     built in warm/warmSteps; per frame each part takes the coarsest level whose slices stay under a pixel apart, or at full resolution
     draws 1-4 copies across each slice's thickness so no gap opens. Near the road the slices are drawn in their own segment's depth order
     (drawSegBack), so the bridge's lamps, cables and traffic sort with them; far away the whole pile is drawn in the backdrop. */
  const V = 125, NEAR = 260;
  function VP(){ this.P = []; }
  VP.prototype.cap = function(a, b, r0, r1, m, zs, aux){ this.P.push([0, a, b, r0, r1, m, zs || 1, aux || 0]); return this; };
  VP.prototype.ell = function(c, rx, ry, rz, m){ this.P.push([1, c, rx, ry, rz, m]); return this; };
  VP.prototype.fin = function(pts, z0, z1, m, aux){ this.P.push([2, pts, z0, z1, m, aux || 0]); return this; };   // a polygon in x-y, extruded over z0..z1
  VP.prototype.dot = function(x, y, z, m){ this.P.push([3, x, y, z, m]); return this; };
  VP.prototype.band = function(from, to, f){ this.P.push([4, from, to, f]); return this; };   // recolour one material where f(x, y, z)
  VP.prototype.face = function(x, y, side, m){ this.P.push([5, x, y, side, m]); return this; };   // paint the outermost voxel at (x, y) seen from -z (side -1) or +z (+1)
  const v3n = (a, b) => { const x = b[0] - a[0], y = b[1] - a[1], z = (b[2] || 0) - (a[2] || 0), l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  const vadd = (a, d, k) => [a[0] + d[0] * k, a[1] + d[1] * k, (a[2] || 0) + (d[2] || 0) * k];
  function vRes(P, k, kz = 1){ if(k === 1 && kz === 1) return P; const sc = v => [v[0] * k, v[1] * k, (v[2] || 0) * kz], out = [];
    for(const p of P){ const t = p[0];
      if(t === 0) out.push([0, sc(p[1]), sc(p[2]), p[3] * k, p[4] * k, p[5], p[6] * kz / k, p[7]]); else if(t === 1) out.push([1, sc(p[1]), p[2] * k, p[3] * k, p[4] * kz, p[5]]);
      else if(t === 2) out.push([2, p[1].map(q => [q[0] * k, q[1] * k]), p[2] * kz, p[3] * kz + kz - 1, p[4], p[5]]); else if(t === 3){ for(let a = 0; a < k; a++) for(let b = 0; b < k; b++) for(let c = 0; c < kz; c++) out.push([3, Math.floor(p[1]) * k + a, Math.floor(p[2]) * k + b, Math.floor(p[3]) * kz + c, p[4]]); }
      else if(t === 4){ const f = p[3]; out.push([4, p[1], p[2], (x, y, z) => f(x / k, y / k, z / kz)]); }   // (bands see model units, unfloored: a seam stays one fine pixel)
      else if(t === 5) for(let a = 0; a < k; a++) for(let b = 0; b < k; b++) out.push([5, Math.floor(p[1]) * k + a, Math.floor(p[2]) * k + b, p[3], p[4]]); }
    return out; }
  // scale a part about a pivot (x-y) and the body's mid-plane (z): the head is built at its usual proportions, then made larger
  function vScale(P, S, px, py){ const sc = v => [px + (v[0] - px) * S, py + (v[1] - py) * S, (v[2] || 0) * S], out = [];
    for(const p of P){ const t = p[0];
      if(t === 0) out.push([0, sc(p[1]), sc(p[2]), p[3] * S, p[4] * S, p[5], p[6], p[7]]); else if(t === 1) out.push([1, sc(p[1]), p[2] * S, p[3] * S, p[4] * S, p[5]]);
      else if(t === 2) out.push([2, p[1].map(q => [px + (q[0] - px) * S, py + (q[1] - py) * S]), Math.floor(p[2] * S), Math.ceil(p[3] * S), p[4], p[5]]);
      else if(t === 3){ const q = sc([p[1], p[2], p[3]]); out.push([3, q[0], q[1], q[2], p[4]]); }
      else if(t === 4) out.push(p);
      else if(t === 5){ const q = sc([p[1], p[2]]), n = Math.ceil(S); for(let a = 0; a < n; a++) for(let b = 0; b < n; b++) out.push([5, Math.floor(q[0]) + a, Math.floor(q[1]) + b, p[3], p[4]]); } }
    return out; }
  let YT = 0, TSTEP = ''; const late = () => performance.now() - YT > 5;
  let POOL = { u8:[], u32:null, sb:null };
  const pu8 = (i, n) => { let a = POOL.u8[i]; if(!a || a.length < n) a = POOL.u8[i] = new Uint8Array(Math.ceil(n * 1.1)); else a.fill(0, 0, n); return a.subarray(0, n); };
  const pu32 = n => { let a = POOL.u32; if(!a || a.length < n) a = POOL.u32 = new Uint32Array(Math.ceil(n * 1.1)); else a.fill(0, 0, n); return a.subarray(0, n); };
  function* vGrid(P){ YT = performance.now(); TSTEP = 'grid'; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    const add = (x, y, z, rx, ry, rz) => { x0 = Math.min(x0, x - rx); x1 = Math.max(x1, x + rx); y0 = Math.min(y0, y - ry); y1 = Math.max(y1, y + ry); z0 = Math.min(z0, z - rz); z1 = Math.max(z1, z + rz); };
    for(const p of P){ const t = p[0];
      if(t === 0 && p[5]){ const r = Math.max(p[3], p[4]); add(p[1][0], p[1][1], p[1][2] || 0, r, r, r * p[6]); add(p[2][0], p[2][1], p[2][2] || 0, r, r, r * p[6]); }
      else if(t === 1 && p[5]) add(p[1][0], p[1][1], p[1][2] || 0, p[2], p[3], p[4]);
      else if(t === 2 && p[4]) for(const q of p[1]) add(q[0], q[1], (p[2] + p[3]) / 2, 0, 0, (p[3] - p[2]) / 2 + .5);
      else if(t === 3) add(p[1], p[2], p[3], 0, 0, 0); }
    x0 = Math.floor(x0) - 2; y0 = Math.floor(y0) - 2; z0 = Math.floor(z0) - 2; const w = Math.ceil(x1) - x0 + 3, h = Math.ceil(y1) - y0 + 3, d = Math.ceil(z1) - z0 + 3;
    const G = { x0, y0, z0, w, h, d, m:pu8(0, w * h * d), a:pu8(1, w * h * d) };
    const set = (x, y, z, m, aux) => { x -= x0; y -= y0; z -= z0; if(x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d) return; const i = (z * h + y) * w + x; G.m[i] = m; if(aux) G.a[i] = aux; };
    for(const p of P){ const t = p[0];
      if(t === 0){ const [, a, b, r0, r1, m, zs, aux] = p, R = Math.max(r0, r1), ax = a[0], ay = a[1], az = (a[2] || 0) / zs, dx = b[0] - ax, dy = b[1] - ay, dz = (b[2] || 0) / zs - az, L2 = dx * dx + dy * dy + dz * dz || 1e-9;
        for(let z = Math.floor(Math.min(a[2] || 0, b[2] || 0) - R * zs); z <= Math.max(a[2] || 0, b[2] || 0) + R * zs; z++){ for(let y = Math.floor(Math.min(ay, b[1]) - R); y <= Math.max(ay, b[1]) + R; y++) for(let x = Math.floor(Math.min(ax, b[0]) - R); x <= Math.max(ax, b[0]) + R; x++){
          const px = x + .5, py = y + .5, pz = (z + .5) / zs, q = clamp(((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / L2, 0, 1), qx = ax + dx * q - px, qy = ay + dy * q - py, qz = az + dz * q - pz, r = r0 + (r1 - r0) * q;
          if(qx * qx + qy * qy + qz * qz <= r * r) set(x, y, z, m, aux); } if(late()){ yield; YT = performance.now(); } } }
      else if(t === 1){ const [, c, rx, ry, rz, m] = p, cz = c[2] || 0;
        for(let z = Math.floor(cz - rz); z <= cz + rz; z++){ for(let y = Math.floor(c[1] - ry); y <= c[1] + ry; y++) for(let x = Math.floor(c[0] - rx); x <= c[0] + rx; x++){ const u = (x + .5 - c[0]) / rx, v = (y + .5 - c[1]) / ry, s = (z + .5 - cz) / rz; if(u * u + v * v + s * s <= 1) set(x, y, z, m); } if(late()){ yield; YT = performance.now(); } } }
      else if(t === 2){ const [, pts, za, zb, m, aux] = p; let ya = 1e9, yb = -1e9; for(const q of pts){ ya = Math.min(ya, q[1]); yb = Math.max(yb, q[1]); }
        for(let y = Math.floor(ya); y <= yb; y++){ const py = y + .5, xs = []; for(let i = 0; i < pts.length; i++){ const A = pts[i], B = pts[(i + 1) % pts.length]; if((A[1] <= py) !== (B[1] <= py)) xs.push(A[0] + (py - A[1]) / (B[1] - A[1]) * (B[0] - A[0])); }
          xs.sort((u, v) => u - v); for(let k = 0; k + 1 < xs.length; k += 2) for(let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) for(let z = za; z <= zb; z++) set(x, y, z, m, aux); if(late()){ yield; YT = performance.now(); } } }
      else if(t === 3) set(Math.floor(p[1]), Math.floor(p[2]), Math.floor(p[3]), p[4]);
      else if(t === 4){ const [, from, to, f] = p; for(let z = 0; z < d; z++){ for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = (z * h + y) * w + x; if(G.m[i] === from && f(x + x0, y + y0, z + z0)) G.m[i] = to; } if(late()){ yield; YT = performance.now(); } } } }
    for(const p of P) if(p[0] === 5){ const x = Math.floor(p[1]) - x0, y = Math.floor(p[2]) - y0; if(x < 0 || y < 0 || x >= w || y >= h) continue;
      for(let k = 0; k < d; k++){ const z = p[3] < 0 ? k : d - 1 - k, i = (z * h + y) * w + x; if(G.m[i]){ G.m[i] = p[4]; break; } } }
    return G; }
  // occupancy summed over a 5-wide window along one axis (three passes make the 5x5x5 box)
  function* boxAxis(S, O, w, h, d, ax){ const st = ax === 0 ? 1 : ax === 1 ? w : w * h, len = ax === 0 ? w : ax === 1 ? h : d, n = ax === 0 ? h * d : ax === 1 ? w * d : w * h;
    for(let l = 0; l < n; l++){ const b = ax === 0 ? l * w : ax === 1 ? ((l / w) | 0) * w * h + l % w : l; let s = 0; for(let k = 0; k < 2 && k < len; k++) s += S[b + k * st];
      for(let i = 0; i < len; i++){ if(i + 2 < len) s += S[b + (i + 2) * st]; O[b + i * st] = s; if(i >= 2) s -= S[b + (i - 2) * st]; } if((l & 255) === 255 && late()){ yield; YT = performance.now(); } } }
  const pk32 = c => { const v = rgb(c); return ((255 << 24) | (v[2] << 16) | (v[1] << 8) | v[0]) >>> 0; };
  // a material: [darkest, dark, mid, light, moon rim, ember, hot ember]; or one flat colour (eyes, mouth: hand-placed pixels)
  const VM = (k, d, m, l, moon, e1, e2, tex) => ({ r:[k, d, m, l, moon, e1, e2, mixc(moon, '#ffffff', .5), mixc(d, e1, .5)].map(pk32), tex:!!tex });   // [7]: a wet glint on the moon rim; [8]: the dark ember
  const VF = c => ({ flat:pk32(c) });
  const LFILL = (v => { const l = Math.hypot(...v); return v.map(a => a / l); })([-.3, .62, -.72]), LMOON = (v => { const l = Math.hypot(...v); return v.map(a => a / l); })([-.42, .78, .46]), LFIRE = (v => { const l = Math.hypot(...v); return v.map(a => a / l); })([.22, -.18, -.96]);
  // bake one part: the voxel colours (Uint32, 0 = empty) from its grid, then the slices and their merged levels into atlases
  function* vShade(G, MAT, HT, res, kz){ const { w, h, d, m } = G, N = w * h * d, D = pu8(2, N), T1 = pu8(3, N), T2 = pu8(4, N), C = pu32(N);
    TSTEP = 'alloc'; for(let i = 0; i < N; i++) D[i] = m[i] ? 1 : 0; TSTEP = 'box'; yield* boxAxis(D, T1, w, h, d, 0); yield* boxAxis(T1, T2, w, h, d, 1); yield* boxAxis(T2, D, w, h, d, 2);
    TSTEP = 'shade'; const wh = w * h, at = (x, y, z) => x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d ? 0 : m[(z * h + y) * w + x];
    for(let z = 0; z < d; z++) for(let y = 0; y < h; y++){ if(late()){ yield; YT = performance.now(); } for(let x = 0; x < w; x++){ const i = (z * h + y) * w + x, mt = m[i]; if(!mt) continue; const M = MAT[mt];
      if(M.flat){ C[i] = M.flat; continue; }
      const eL = !at(x - 1, y, z), eR = !at(x + 1, y, z), eD = !at(x, y - 1, z), eU = !at(x, y + 1, z), eN = !at(x, y, z - 1), eF = !at(x, y, z + 1);
      if(!(eL || eR || eD || eU || eN || eF)){ C[i] = M.r[2]; continue; }
      const g = (a, b) => (a < 0 || a >= N ? 0 : D[a]) - (b < 0 || b >= N ? 0 : D[b]);
      let nx = x > 0 && x < w - 1 ? D[i - 1] - D[i + 1] : 0, ny = y > 0 && y < h - 1 ? D[i - w] - D[i + w] : 0, nz = g(i - wh, i + wh) * kz / res; const nl = Math.hypot(nx, ny, nz);
      if(nl < 1e-6){ nx = eL ? -1 : eR ? 1 : 0; ny = eU ? 1 : eD ? -1 : 0; nz = eN ? -1 : eF ? 1 : 0; } else { nx /= nl; ny /= nl; nz /= nl; }
      const lm = nx * LMOON[0] + ny * LMOON[1] + nz * LMOON[2], fh = Math.pow(clamp(1 - (y + G.y0) / (HT * .5), 0, 1), 1.4), fire = (nx * LFIRE[0] + ny * LFIRE[1] + nz * LFIRE[2]) * fh, ao = D[i] / 125;
      const lf = nx * LFILL[0] + ny * LFILL[1] + nz * LFILL[2]; let t = lm > .62 || lf > .9 ? 3 : lm > .2 || lf > .5 ? 2 : 1, c;   // a dark mass that turns: the sky fill gives the facing flank a cool mid tone high up
      const side = Math.abs(nz) < .45, edge = side && (eL || eR || eU || eD); c = t;
      if(ao > .76 && c < 3) c = 0;   // creases and joints: the darkest tone sits inside the form, not only at its edge
      else if(M.tex && TEX_ON && c > 0 && H1(Math.floor((x + G.x0) / (2 * res)) * 7.31 + Math.floor((y + G.y0) / (2 * res)) * 3.17 + Math.floor((z + G.z0) / (2 * res)) * 1.91 + mt) > .93) c = c === 6 ? 5 : c === 5 ? 1 : c - 1;   // hide plates: 2x2 clusters a tone down
      // the fire: the burning bay below and the city in front, as one smooth heat term, laid in a clean ramp (hide, dark ember, ember, hot)
      // with an ordered 4x4 dither only across each step: the lit underside reads as a curved, graded form, not a speckle
      { const ub = ny < -.2 ? -ny * clamp(1.25 - (y + G.y0) / (HT * .75), 0, 1) : 0, heat = Math.max(fire * .82, ub * 1.05);
        if(heat > .34 && !(ao > .76)){ const q = (heat - .34) / .15 + (B4[(((h - 1 - y) & 3) << 2) + (x & 3)] - .5) * .28, sp = Math.floor(q); if(sp >= 1) c = sp === 1 ? 8 : sp === 2 ? 5 : 6; } }
      // organic hide (fine builds): scale clusters on a 3D cellular lattice, so they wrap round the leg instead of running in rows, only inside
      // a few broad patches (a low-frequency mask) so large calm areas stay; a dark seam round each scale, a pale bead at its upper left on lit skin
      if(M.tex && res > 1 && (c === 2 || c === 3) && !edge){ const X = (x + G.x0) / res, Y = (y + G.y0) / res, Z = (z + G.z0) / kz;
        if(vnz(X * .09 + 11, Y * .09, Z * .09) > .47){ const cl = cell(X / 2.3, Y / 2.3, Z / 2.3); if(cl.e < .16) c = c - 1; else if(c === 2 && cl.d1 < .36 && cl.vy > .04 && cl.vx < .06) c = 3; } }
      if(lm > .45 && side && (eU || eL) && c !== 6) c = M.r[7] && lm > .66 && H1((x + G.x0) * 1.7 + (y + G.y0) * 3.9 + z * 2.3) > .84 ? 7 : 4;   // the moon rim on the top-left edges, a wet glint here and there
      else if(res === 1 && lm < .12 && c < 5 && side && (eD || eR)) c = 0;   // the shadow side's carved edge
      /* (only where the surface turns side-on to the view, |nz| small: on a slope toward the camera every slice's edge would show as a
         contour ring, a terraced barcode) */
      C[i] = M.r[c]; } }
    return C; }
  const vnz = (x, y, z) => { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), h = (a, b, c) => H1(a * 127.1 + b * 311.7 + c * 74.7);
    const l = (a, b, t) => a + (b - a) * t; return l(l(l(h(ix, iy, iz), h(ix + 1, iy, iz), u), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), u), v), l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), u), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), u), v), w); };
  const CELL = { d1:0, e:0, vx:0, vy:0 };
  function cell(x, y, z){ const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let d1 = 9, d2 = 9, vx = 0, vy = 0;
    for(let k = -1; k <= 1; k++) for(let j = -1; j <= 1; j++) for(let i = -1; i <= 1; i++){ const a = ix + i, b = iy + j, c = iz + k, px = a + H1(a * 127.1 + b * 311.7 + c * 74.7), py = b + H1(a * 269.5 + b * 183.3 + c * 246.1), pz = c + H1(a * 113.5 + b * 271.9 + c * 124.6);
      const dx = x - px, dy = y - py, dz = z - pz, d = Math.sqrt(dx * dx + dy * dy + dz * dz); if(d < d1){ d2 = d1; d1 = d; vx = dx; vy = dy; } else if(d < d2) d2 = d; }
    CELL.d1 = d1; CELL.e = d2 - d1; CELL.vx = vx; CELL.vy = vy; return CELL; }
  const TEX_ON = false;   // hide-plate clusters: off (scattered 2x2 darks read as holes at speed; value before texture)
  const LVLS = [1, 2, 4, 8, 16];
  // the outline loops of a mask (w x h, 1 = filled), in texel units, simplified (Douglas-Peucker, tolerance tol)
  const MS = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[3, 1]], [[0, 1]], [[3, 0]], []];
  function contours(B, w, h, tol){ const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : B[y * w + x], ex = [], adj = new Map(), key = (x, y) => Math.round(x * 2) * 100003 + Math.round(y * 2);
    for(let y = -1; y < h; y++) for(let x = -1; x < w; x++){ const id = at(x, y) | at(x + 1, y) << 1 | at(x + 1, y + 1) << 2 | at(x, y + 1) << 3; if(!id || id === 15) continue;
      const E = [[x + 1, y + .5], [x + 1.5, y + 1], [x + 1, y + 1.5], [x + .5, y + 1]]; for(const [a, b] of MS[id]){ const i = ex.length; ex.push([E[a], E[b], false]); for(const q of [E[a], E[b]]){ const k = key(q[0], q[1]); if(!adj.has(k)) adj.set(k, []); adj.get(k).push(i); } } }
    const loops = [];
    for(let i = 0; i < ex.length; i++){ if(ex[i][2]) continue; const lp = []; let cur = i, from = ex[i][0]; for(let n = 0; n < 20000; n++){ const sg = ex[cur]; sg[2] = true; const to = sg[0] === from || (sg[0][0] === from[0] && sg[0][1] === from[1]) ? sg[1] : sg[0]; lp.push(to[0], to[1]);
        const nx = (adj.get(key(to[0], to[1])) || []).find(j => !ex[j][2]); if(nx === undefined) break; from = to; cur = nx; }
      if(lp.length >= 6){ const q = dp(lp, tol); let A = 0; for(let i = 0; i < q.length; i += 2){ const j = (i + 2) % q.length; A += q[i] * q[j + 1] - q[j] * q[i + 1]; } if(A < 0){ for(let i = 0, j = q.length - 2; i < j; i += 2, j -= 2){ const tx = q[i], ty = q[i + 1]; q[i] = q[j]; q[i + 1] = q[j + 1]; q[j] = tx; q[j + 1] = ty; } } loops.push(q); } }
    return loops; }
  function dp(P, tol){ const n = P.length / 2; if(n < 4) return Float32Array.from(P); const keep = new Uint8Array(n); keep[0] = 1; keep[n - 1] = 1;
    const st = [[0, n - 1]]; while(st.length){ const [a, b] = st.pop(); let md = 0, mi = -1; const ax = P[a * 2], ay = P[a * 2 + 1], bx = P[b * 2], by = P[b * 2 + 1], L = Math.hypot(bx - ax, by - ay) || 1;
      for(let i = a + 1; i < b; i++){ const d = Math.abs((bx - ax) * (ay - P[i * 2 + 1]) - (ax - P[i * 2]) * (by - ay)) / L; if(d > md){ md = d; mi = i; } } if(md > tol){ keep[mi] = 1; st.push([a, mi], [mi, b]); } }
    const out = []; for(let i = 0; i < n; i++) if(keep[i]) out.push(P[i * 2], P[i * 2 + 1]); return Float32Array.from(out); }
  /* Every atlas becomes an ImageBitmap as soon as the browser hands it back (asynchronously, during the warm-up): immutable and uploaded
     to the GPU once. Drawn straight from the 2D canvas, the large near-detail atlases cost a re-upload (frames of 60-400 ms, measured)
     when they first came into use; the canvas stays the fallback until the bitmap arrives. */
  function toBitmap(L){ if(!window.createImageBitmap) return; try{ createImageBitmap(L.cv).then(b => { L.cv = b; try{ cx.drawImage(b, 0, 0, 1, 1); }catch(e){} }).catch(() => {}); }catch(e){} }
  function* vBake(key, G, MAT, HT, res, fine, kz = 1){ const C = yield* vShade(G, MAT, HT * res, res, kz), { w, h, d } = G, wh = w * h;
    // trim: the slices that hold anything
    let k0 = 0, k1 = d - 1; const any = k => { for(let i = k * wh, e = i + wh; i < e; i++) if(C[i]) return true; return false; }; while(k0 < k1 && !any(k0)) k0++; while(k1 > k0 && !any(k1)) k1--;
    const n = k1 - k0 + 1, st = { key, w, h, n, x0:G.x0, y0:G.y0, z0:G.z0 + k0, L:[], vs:V / res, vz:V / kz, fine:!!fine };   // vs across, vz the slice thickness
    const sheet = function*(g, ng, pick, pack = true, cont = false){ TSTEP = 'sheet' + g; const ox = new Int16Array(ng), oy = new Int16Array(ng), rw = new Int16Array(ng), rh = new Int16Array(ng), rx = new Int16Array(ng), ry = new Int16Array(ng), bufs = [];
      const SB = POOL.sb && POOL.sb.length >= w * h ? POOL.sb : (POOL.sb = new Uint32Array(w * h)); for(let j = 0; j < ng; j++){ const B = SB; B.fill(0, 0, w * h); let x0 = w, x1 = -1, y0 = h, y1 = -1;
        for(let y = 0; y < h; y++){ for(let x = 0; x < w; x++){ const c = pick(j, x, y); if(!c) continue; const r = h - 1 - y; B[r * w + x] = c; if(x < x0) x0 = x; if(x > x1) x1 = x; if(r < y0) y0 = r; if(r > y1) y1 = r; } if((y & 7) === 7 && late()){ yield; YT = performance.now(); } }
        if(x1 < 0){ bufs.push(null); continue; } if(!pack){ x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; } ox[j] = x0; oy[j] = y0; rw[j] = x1 - x0 + 1; rh[j] = y1 - y0 + 1;
        { const cb = new Uint32Array(rw[j] * rh[j]); for(let y = 0; y < rh[j]; y++) cb.set(B.subarray((y0 + y) * w + x0, (y0 + y) * w + x0 + rw[j]), y * rw[j]); bufs.push(cb); }   /* keep only the slice's own pixels */
        if(late()){ yield; YT = performance.now(); } }
      let px = 0, py = 0, sh = 0, cw = 1; for(let j = 0; j < ng; j++){ if(!rw[j]) continue; if(px && px + rw[j] > 4096){ px = 0; py += sh + 1; sh = 0; } rx[j] = px; ry[j] = py; px += rw[j] + 1; sh = Math.max(sh, rh[j]); cw = Math.max(cw, px); }
      TSTEP = 'pack' + g; const cv = document.createElement('canvas'); cv.width = cw; cv.height = Math.max(1, py + sh); const k = cv.getContext('2d'), img = k.createImageData(cv.width, cv.height), U = new Uint32Array(img.data.buffer);
      for(let j = 0; j < ng; j++){ if(!rw[j]) continue; const B = bufs[j]; for(let y = 0; y < rh[j]; y++) for(let x = 0; x < rw[j]; x++){ const c = B[y * rw[j] + x]; if(c) U[(ry[j] + y) * cv.width + rx[j] + x] = c; } if(late()){ yield; YT = performance.now(); } }
      TSTEP = 'put' + g + ':' + cw + 'x' + cv.height; for(let y0 = 0; y0 < cv.height; y0 += 64){ k.putImageData(img, 0, 0, 0, y0, cv.width, Math.min(64, cv.height - y0)); if(late()){ yield; YT = performance.now(); } } const L = { g, ng, cv, rx, ry, rw, rh, ox, oy }; toBitmap(L);
      if(cont){ L.ct = []; for(let j = 0; j < ng; j++){ if(!rw[j]){ L.ct.push(null); continue; } const M = new Uint8Array(rw[j] * rh[j]), B = bufs[j]; for(let i = 0; i < M.length; i++) M[i] = B[i] ? 1 : 0; L.ct.push(contours(M, rw[j], rh[j], 1)); } }
      return L; };
    // a merged level: each group of g slices composited front to back (the nearest voxel wins, as the camera sees it)
    const front = (a, b) => (x, y) => { for(let z = a; z <= b; z++){ const c = C[(z * h + y) * w + x]; if(c) return c; } return 0; };
    for(const g of LVLS){ if(g > 1 && (g >= n || fine)) break; const ng = Math.ceil(n / g); st.L.push(yield* sheet(g, ng, (j, x, y) => { const a = k0 + j * g, b = Math.min(k1, a + g - 1); for(let z = a; z <= b; z++){ const c = C[(z * h + y) * w + x]; if(c) return c; } return 0; }, true, !!fine && INTS.clip)); }
    if(!fine){ st.L.push(yield* sheet(n, 1, (j, x, y) => front(k0, k1)(x, y), false));   // (fine builds are only ever drawn near, slice by slice: no whole or back view)
      /* (the back views were for the rear-view mirror, removed in round 7: not built) */ }
    st.G = G; return st; }
  // ---------------------------------------------------------------- Sairyū in voxels (faces +x, toward the road and the crab)
  const SMAT_ = () => ({ 1:VM('#120a1e', '#251d3a', '#3c3256', '#5e5480', '#b8c6ee', '#3e2238', '#e0703e', 1),   // hide: slate violet; cool moon rim, warm firelit flank
    2:VM('#1a100c', '#3a2416', '#5c3e22', '#86683c', '#d8c49a', '#8a4022', '#e08a44'),   // belly plates: ochre
    3:VM('#140e10', '#3e342e', '#6c5e4e', '#a6967a', '#e6dcc4', '#9a5a36', '#f0b070'),   // bone: ribs, horn, frills, claws, teeth
    4:VM('#10061a', '#260e32', '#40164a', '#622664', '#a874a8', '#6e2038', '#c44a66'),   // sail membrane: plum
    5:VF('#3a0c14'), 6:VF('#ffd860'), 7:VF('#0c0610'),   // mouth, eye, eye socket
    8:VM('#120a08', '#2a1a10', '#3e2a18', '#5c4426', '#a08a62', '#6a3018', '#a8622e'),
    9:VM('#160e1c', '#342a40', '#544a62', '#827890', '#dcd4ea', '#3e2434', '#8a4c3a'),   // scutes: bony plates on knees, shins, along the tail
    10:VF('#ffa848'),
    11:VM('#0a0612', '#120c1e', '#1c1530', '#2a2244', '#6a6a96', '#2a1626', '#5a2a2a') });   // fold: the deep crease at a joint   // belly seams (built in warm: the core's colour helpers load after this file)
  const S_HT = 150;
  function sBody(){ const p = new VP(), HD = 1, BE = 2, BO = 3, SA = 4;
    // the far arm, behind
    p.cap([6, 92, 13], [14, 80, 17], 6.5, 5.5, HD).cap([14, 80, 17], [24, 84, 15], 5.5, 4.5, HD).ell([24, 84, 15], 4.5, 4, 4, HD);
    { const dr = v3n([14, 80], [24, 84]); for(const [da, dz] of [[-.5, -1.5], [0, 0], [.5, 1.5]]){ const a = Math.atan2(dr[1], dr[0]) + da, u = [Math.cos(a), Math.sin(a), 0]; p.cap(vadd([24, 84, 15 + dz], u, 3), vadd([24, 84, 15 + dz], u, 9), 1.8, .5, BO); } }
    // the sail: seven ribs fanned up and back along the spine, shoulders to tail root, a scalloped membrane between the tips
    const N = 7, P0 = [1, 110], P1 = [-25, 64], dir = v3n([0, 0], [-.42, .91]), bases = [], tips = [];
    for(let i = 0; i < N; i++){ const t = i / (N - 1), hh = 13 + 33 * Math.sin(Math.PI * (.1 + .85 * t)) * (1 - t * .3); bases.push([lerp(P0[0], P1[0], t) + 2, lerp(P0[1], P1[1], t) - 2]); tips.push([bases[i][0] + dir[0] * hh, bases[i][1] + dir[1] * hh]); }
    const mem = bases.slice(); for(let i = N - 1; i >= 0; i--){ mem.push(tips[i]); if(i > 0){ const a = tips[i], c = tips[i - 1], bm = [(bases[i][0] + bases[i - 1][0]) / 2, (bases[i][1] + bases[i - 1][1]) / 2]; mem.push([(a[0] + c[0]) / 2 + (bm[0] - (a[0] + c[0]) / 2) * .22, (a[1] + c[1]) / 2 + (bm[1] - (a[1] + c[1]) / 2) * .22]); } }
    p.fin(mem, -1, 0, SA);
    for(let i = 0; i < N; i++){ p.cap([bases[i][0], bases[i][1], 0], [tips[i][0], tips[i][1], 0], 1.4, .8, BO, 1, i + 1); p.cap([tips[i][0], tips[i][1], 0], [tips[i][0] + dir[0] * 4, tips[i][1] + dir[1] * 4, 0], .9, .5, 10, 1, i + 1); }   // the rib tips smoulder amber (the sail's signature light)
    // hips and torso, leaning toward the foe; ochre belly plates down the front, seamed
    p.cap([-4, 62, 0], [10, 100, 0], 22, 16, HD, .78);
    p.cap([6, 60, 0], [16, 97, 0], 18, 12, BE, .5).band(BE, 8, (x, y) => { const q = ((y + x * .3) % 6 + 6) % 6; return q < .5; });
    p.cap([8, 98, 0], [15, 111, 0], 15, 12, HD, .8);
    return p; }
  // a leg's anatomy below the knee: a scute on the knee, a column of scutes down the shin's front, three thick toes on a padded foot,
  // each ending in a pale nail that catches the moon, a dewclaw and a heel spur (the read up close: a clawed foot, not a volume)
  function limb(p, knee, ank, toe, z, rk, ra, noToes){ const HD = 1, BO = 3, SC = 9, toes = [], dx = ank[0] - knee[0], dy = ank[1] - knee[1], dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl;
    for(const [o, a] of [[2.6, 0], [dl - 2.5, 3.1]]) p.band(HD, 11, (x, y, zz) => Math.abs((x - knee[0]) * -uy + (y - knee[1]) * ux) < rk * .45 && Math.abs((x - knee[0]) * ux + (y - knee[1]) * uy - o - Math.sin(zz * .55 + a) * .5) < .32);   /* short creases across the middle of the limb, not rings (a ring read as a strap) */
    p.ell([knee[0] + rk * .55, knee[1] + 1, z - rk * .35], 4.2, 3.6, 3.2, SC);
    for(const t of [.2, .4, .6, .8]){ const q = [lerp(knee[0], ank[0], t), lerp(knee[1], ank[1], t), z], r = lerp(rk, ra, t); p.ell([q[0] + r * .8, q[1], z - r * .25], 2.6 - t, 2, 3, SC); }
    const B = [ank[0] + 2, Math.max(toe[1] + 2, ank[1] - 4.5), z]; p.ell(B, 7, 4.6, 7.5, HD);
    for(const [dz, ln, dy] of [[-5.6, .78, 1.2], [0, 1.15, 0], [5.6, .9, .8]]){ const tip = [B[0] + (toe[0] + 6 - B[0]) * ln, toe[1] + dy, z + dz * 1.2], mid = [lerp(B[0], tip[0], .45), lerp(B[1], tip[1], .45) + 1.2, z + dz * .8];
      toes.push({ x0:B[0] - 3, x1:tip[0] + 7, z:z + dz * 1.2, near:dz < 0 }); if(noToes) continue;
      p.cap([B[0], B[1], z + dz * .45], mid, 4.2, 3.6, HD).ell(mid, 3.6, 3.3, 3.4, HD).cap(mid, tip, 3.4, 2.5, HD).ell(tip, 2.7, 2.6, 2.7, HD);   // toe, knuckle, toe tip
      const u = v3n(mid, tip); p.cap([tip[0] + u[0] * 1.5, tip[1] + u[1] * 1.5 + .4, tip[2]], [tip[0] + u[0] * 7.5, tip[1] - 2.8, tip[2]], 2.6, .35, BO); }   // a long hooked nail
    p.cap([ank[0] - 3, ank[1] - 1, z + 4.5], [ank[0] - 6.5, ank[1] - 4.5, z + 5.5], 1.7, .35, BO).cap([ank[0] - 3, ank[1] - 3, z], [ank[0] - 7, ank[1] - 5, z], 2, .5, BO); return toes; }
  function sLeg(up, noToes){ const p = new VP(), HD = 1, z = -7;
    const hip = [8, 50, z + 1], knee = up ? [26, 46, z - 1] : [22, 31, z - 1], ank = up ? [31, 29, z - 2] : [26, 10, z - 2], toe = up ? [37, 22, z - 2] : [31, 4, z - 2];
    p.cap([hip[0] - 3, hip[1] + 6, hip[2]], knee, 14, 9.5, HD, .85).ell(knee, 9.5, 9, 8.5, HD).cap(knee, ank, 9.5, 6.5, HD).ell(ank, 7, 6.5, 7, HD);
    const toes = limb(p, knee, ank, toe, z - 2, 9.5, 6.5, noToes); return { p, toes }; }
  // the hips, the rear leg (planted beyond the left barrier: the titan straddles the bridge in a lunge, and you ride between its feet,
  // under its belly) and the plated underside, lit from below by the burning bay as you pass beneath
  function sHips(noToes){ const p = new VP(), HD = 1, BE = 2, z = 6, hip = [-10, 49, 5], knee = [-26, 29, z], ank = [-33, 10, z], toe = [-30, 4, z];
    p.cap([hip[0] + 2, hip[1] + 6, hip[2]], knee, 13, 9, HD, .85).ell(knee, 8.5, 8.5, 8, HD).cap(knee, ank, 9, 6.5, HD).ell(ank, 7, 6.5, 7, HD);
    const toes = limb(p, knee, ank, toe, z, 9, 6.5, noToes);
    p.ell([-6, 55, 0], 21, 14, 17, HD).ell([-3, 42, 0], 17, 8, 13, BE).band(BE, 8, (x, y) => { const q = y + Math.pow((x + 3) / 17, 2) * 3.5; return ((q % 3) + 3) % 3 < .3; });
    return { p, toes }; }
  // the head on its neck: a pose turns it about the neck root (a > 0 lifts the snout) and drops the jaw
  function sHead(a, open){ const p = new VP(), HD = 1, BO = 3, MO = 5, EY = 6, SO = 7, px = 15, py = 111, ca = Math.cos(a), sa = Math.sin(a);
    const R = (x, y, z) => [px + (x - px) * ca - (y - py) * sa, py + (x - px) * sa + (y - py) * ca, z || 0];
    const J = R(23, 119), ja = -open * .52, cj = Math.cos(ja), sj = Math.sin(ja), Rj = (x, y, z) => { const q = R(x, y); return [J[0] + (q[0] - J[0]) * cj - (q[1] - J[1]) * sj, J[1] + (q[0] - J[0]) * sj + (q[1] - J[1]) * cj, z || 0]; };
    if(open > .1) p.fin([R(23, 121), R(41, 119.5), Rj(40, 116), Rj(23, 117)], -3, 3, MO);   // the mouth's black-red inside, first, so the jaws overwrite their own volume
    p.cap(R(13, 106), R(23, 121), 13, 9.5, HD, .8).ell(R(24, 125), 8.5, 7.5, 7, HD).cap(R(24, 124), R(42, 122), 8.5, 5, HD, .78);
    p.cap(Rj(22, 117), Rj(40, 114.5), 5.5, 3.2, HD, .7);
    p.cap(R(25, 131, -3), R(33, 129.5, -4), 2.2, 1.5, BO).cap(R(25, 131, 3), R(33, 129.5, 4), 2.2, 1.5, BO);   // brow ridges
    p.cap(R(37, 126.5), R(40, 136.5), 2.6, .6, BO);   // the nose horn
    for(const [b, t, e] of [[[24, 131], [6, 142], [21, 133.5]], [[22, 127], [4, 130], [20, 129.5]], [[22, 122], [7, 119], [21, 124]]]) p.fin([R(...b), R(...t), R(...e)], -2, 1, BO);   // three swept-back frills
    // hand-placed face pixels on both flanks: the amber eye in a dark socket, the teeth along the lips when the jaw is open
    for(const sd of [-1, 1]){ p.face(...R(30, 127).slice(0, 2), sd, SO).face(...R(31, 127).slice(0, 2), sd, EY).face(...R(32, 127).slice(0, 2), sd, EY).face(...R(33, 127).slice(0, 2), sd, SO).face(...R(31, 128).slice(0, 2), sd, SO).face(...R(32, 128).slice(0, 2), sd, SO);
      if(open > .1) for(let x = 26; x <= 39; x += 3){ p.face(...R(x, 119.5).slice(0, 2), sd, BO); p.face(...Rj(x + 1, 116.5).slice(0, 2), sd, BO); } }
    const S = 1.45, sc = q => [px + (q[0] - px) * S, py + (q[1] - py) * S]; p.P = vScale(p.P, S, px, py); const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; return { p, mouth:sc(mid(R(40, 119.6), Rj(39, 116.2))), throat:sc(mid(R(28, 120.6), Rj(28, 116.9))), eye:sc(R(31.5, 127.5)) }; }
  function sArm(pose){ const p = new VP(), HD = 1, BO = 3, z = -15, S0 = [8, 94, z];
    const [E, Hd] = { idle:[[16, 80], [26, 84]], wind:[[2, 106], [-3, 121]], strike:[[27, 96], [43, 99]] }[pose], e = [E[0], E[1], z - 4], hd = [Hd[0], Hd[1], z - 2];
    p.ell(S0, 8, 8, 7, HD).cap(S0, e, 7.5, 6, HD).ell(e, 6, 6, 6, HD).cap(e, hd, 6, 4.6, HD).ell(hd, 5.2, 4.6, 4.2, HD);
    const an = Math.atan2(hd[1] - e[1], hd[0] - e[0]); for(const [da, dz] of [[-.55, -2], [0, 0], [.55, 2]]){ const u = [Math.cos(an + da), Math.sin(an + da), 0], b = vadd([hd[0], hd[1], hd[2] + dz], u, 3.5); p.cap(b, vadd(b, [Math.cos(an + da * 1.4), Math.sin(an + da * 1.4), 0], 6.5), 2, .55, BO); }
    return p; }
  function sTail(hi){ const p = new VP(), HD = 1, BO = 3, pts = hi ? [[-14, 54, 4], [-35, 44, 8], [-55, 42, 12], [-70, 49, 10], [-81, 59, 6]] : [[-14, 54, 4], [-34, 34, 8], [-52, 18, 12], [-66, 9, 10], [-78, 6, 6]], rr = [18, 13, 9, 6, 3];
    for(let i = 0; i < 4; i++) p.cap(pts[i], pts[i + 1], rr[i], rr[i + 1], HD, .85);
    for(let i = 1; i < 4; i++){ const a = pts[i], b = pts[i + 1], m = [lerp(a[0], b[0], .3), lerp(a[1], b[1], .3)], t = v3n(a, b), nrm = [-t[1], t[0]], up = nrm[1] > 0 ? nrm : [-nrm[0], -nrm[1]], r = rr[i] * .85 + .5;   // dorsal plates down the tail, shrinking
      p.fin([[m[0] - t[0] * 3, m[1] - t[1] * 3], [m[0] + up[0] * (r + 5 - i) - t[0], m[1] + up[1] * (r + 5 - i) - t[1]], [m[0] + t[0] * 3, m[1] + t[1] * 3]].map(q => [q[0] + up[0] * (r - 2), q[1] + up[1] * (r - 2)]), a[2] - 1, a[2], 9); }   // (scute, not bone: pale plates on a dark tail floated like scraps)
    return p; }
  // ---------------------------------------------------------------- Kanigaru in voxels (faces -x, toward the road and the titan)
  const FMAT_ = () => ({ 1:VM('#06121a', '#102836', '#1c3e52', '#2e5e74', '#b8eef2', '#4e3634', '#cc7448', 1),   // shell: sea-steel
    2:VM('#0a0812', '#181226', '#2a2040', '#44385e', '#b0a2d4', '#542838', '#bc5e78'),   // wings: dusk violet
    3:VM('#160e0a', '#36261e', '#56402f', '#7a5c44', '#d0b28c', '#844628', '#de8c56'),   // spikes, claw tips, antennae
    4:VF('#071016'), 5:VF('#1aa894'), 6:VF('#b8fff0'), 7:VF('#7affe0'),   // eye-spot ring, spot, spot core, eyes
    8:VM('#040c12', '#081820', '#0e2632', '#183c4c', '#6aa8b8', '#3a2a2c', '#9a5a3a'),   // the plated underside
    9:VM('#06040c', '#100a1a', '#1a1228', '#2a2040', '#6a5a8a', '#3a1a28', '#7a3a4a') });   // wing veins
  const F_HT = 140;
  function chela(p, sh, el, hd, sz, dir, op, m, tip, r0){ p.cap(sh, el, r0, r0 * .85, m).ell(el, r0 * .9, r0 * .9, r0 * .9, m).cap(el, hd, r0 * .85, r0 * .75, m);
    const u = dir, v = [-u[1], u[0]], z = hd[2], P = (a, b) => [hd[0] + u[0] * a * sz + v[0] * b * sz, hd[1] + u[1] * a * sz + v[1] * b * sz, z];
    p.cap(P(-.1, 0), P(.42, 0), sz * .3, sz * .34, m, .8);
    for(const F of [[P(.4, .14), P(.78, .2 + op * .3), P(1.02, .08 + op * .2)], [P(.4, -.16), P(.74, -.3 - op), P(.98, -.16 - op * 1.1)]]){ p.cap(F[0], F[1], sz * .16, sz * .11, m, .8); p.cap(F[1], F[2], sz * .11, sz * .04, tip, .8); }
    return P(.6, 0); }
  function fShell(){ const p = new VP(), S1 = 1, SP = 3, EY = 7, UN = 8;
    // six walking legs arch out from under the shell and down into the bay, three each side
    for(const sd of [-1, 1]) for(const [x0, dx] of [[-14, -8], [2, 1], [16, 9]]){ const a = [x0, 44, sd * 18], k = [x0 + dx, 63, sd * 30], m = [x0 + dx * 1.8, 11, sd * 35], t = [x0 + dx * 2, 0, sd * 36];
      p.cap(a, k, 4.6, 4, S1).ell(k, 4.6, 4.6, 4.6, S1).cap(k, m, 4, 2.6, S1).cap(m, t, 2.6, .9, SP); }
    chela(p, [-22, 44, 16], [-34, 54, 20], [-42, 52, 18], 10, v3n([0, 0], [-.85, -.5]), .3, S1, SP, 4);   // the small claw, far side
    // the carapace: broad and flat, plated underneath, a short ridge of spikes
    p.ell([0, 48, 0], 30, 15, 26, S1).ell([-2, 40, 0], 27, 9, 23, UN);
    for(let x = -16; x <= 16; x += 8) p.cap([x, 60, 0], [x - 2, 68 - Math.abs(x) * .15, 0], 3, .5, SP);
    // the head toward the titan: eye stalks with teal eyes, mandibles, two feathered antennae
    p.ell([-28, 50, 0], 10, 8, 10, S1);
    for(const sd of [-1, 1]){ p.cap([-34, 46, sd * 4], [-40, 40, sd * 3], 2, .8, SP).cap([-30, 56, sd * 5], [-34, 64, sd * 6], 1.6, 1.2, S1).ell([-34, 66, sd * 6], 2.2, 2.2, 2.2, EY);
      let a = [-30, 58, sd * 3]; for(let i = 1; i <= 8; i++){ const b = [-30 - i * 2.2, 58 + i * 3.2, sd * (3 + i * .4)]; p.cap(a, b, .9, .8, SP); if(i % 2 === 0 && i < 8){ p.cap(b, [b[0] - 2.5, b[1] - 1, b[2]], .6, .5, SP).cap(b, [b[0] + 1.5, b[1] + 1.8, b[2]], .6, .5, SP); } a = b; } }
    return p; }
  const FCLAW = { idle:[[-38, 60], [-48, 70], [-.4, .92], .35], raise:[[-34, 76], [-40, 95], [-.1, 1], .8], strike:[[-48, 66], [-66, 72], [-1, .06], .1], hit:[[-30, 58], [-33, 77], [.35, .94], .95] };
  function fClaw(pose){ const p = new VP(), [E, Hd, dr, op] = FCLAW[pose], z = -18; const c = chela(p, [-22, 44, z], [E[0], E[1], z - 6], [Hd[0], Hd[1], z - 4], 22, v3n([0, 0], dr), op, 1, 3, 6); return { p, tip:c }; }
  function fWings(fl){ const p = new VP(), WG = 2, VE = 9, RD = 4, SP2 = 5, SC = 6;
    const nw = fl ? [[4, 58], [-3, 112], [15, 139], [42, 135], [53, 104], [34, 64]] : [[6, 58], [8, 101], [22, 121], [38, 115], [41, 88], [30, 62]], root = nw[0];
    p.fin(nw.map(q => [q[0] + 8, q[1] + 4]), 8, 10, WG);   // the far wing
    for(const q of nw.slice(1, 5)) p.cap([root[0] + 8, root[1] + 4, 9], [q[0] + 8 - (q[0] - root[0]) * .08, q[1] + 4 - (q[1] - root[1]) * .08, 9], .7, .5, VE, .4);
    p.fin(nw, -11, -9, WG);   // the near wing, veined, two eye-spots, a ragged trailing edge
    for(const q of nw.slice(1, 5)) p.cap([root[0], root[1], -10], [q[0] - (q[0] - root[0]) * .08, q[1] - (q[1] - root[1]) * .08, -10], .7, .5, VE, .4);
    const sp = fl ? [[27, 119, 6.5], [40, 94, 4.5]] : [[25, 104, 5.5], [33, 83, 4]];
    for(const [x, y, r] of sp){ p.ell([x, y, -10], r + 1.6, r * .86 + 1.4, 2.2, RD).ell([x, y, -10], r, r * .86, 2.4, SP2).ell([x - 1, y + 1, -10], Math.max(1.2, r * .3), Math.max(1.1, r * .26), 2.6, SC); }
    for(const [i, rr] of [[3, 3.5], [4, 2.6]]){ const q = nw[i]; p.ell([q[0] - 1, q[1] - 2, -10], rr, rr, 3, 0).ell([q[0] + 9, q[1] + 1, 9], rr, rr, 3, 0); }   // bites out of the edges
    return { p, spots:sp }; }
  function fArch(){ const p = new VP(), S1 = 1, SP = 3, z = -10, a = [-24, 44, z + 2], k = [-54, 72, z], m = [-72, 16, z - 1], t = [-77, 0, z - 1];
    p.cap(a, k, 5, 4.5, S1).ell(k, 5.6, 5.6, 5.6, S1).cap(k, m, 4.5, 3.2, S1).cap(m, t, 3.2, 1, SP); return p; }
  // the build list (each job one part and pose, for the staged warm-up)
  const TS = { built:false, list:null, it:null };
  const TJOBS = [
    ['s', 'body', 'idle', () => ({ p:sBody() })], ['s', 'hips', 'idle', () => sHips()], ['s', 'leg', 'planted', () => sLeg(0)], ['s', 'leg', 'raised', () => sLeg(1)],
    ['s', 'body', 'idle', () => ({ p:sBody() }), 4, 1], ['s', 'hips', 'idle', () => sHips(1), 6, 1], ['s', 'leg', 'planted', () => sLeg(0, 1), 6, 1],   /* (half-thick slices: no terraces on the underside seen from below) */   // fine: the ride beneath
    ['s', 'head', 'idle', () => sHead(0, .12)], ['s', 'head', 'roar', () => sHead(.42, 1)], ['s', 'head', 'beam', () => sHead(-.1, 1.15)],
    ['s', 'arm', 'idle', () => ({ p:sArm('idle') })], ['s', 'arm', 'wind', () => ({ p:sArm('wind') })], ['s', 'arm', 'strike', () => ({ p:sArm('strike') })],
    ['s', 'tail', 'low', () => ({ p:sTail(0) })], ['s', 'tail', 'high', () => ({ p:sTail(1) })], ['s', 'tail', 'low', () => ({ p:sTail(0) }), 2, 1], ['s', 'tail', 'high', () => ({ p:sTail(1) }), 2, 1],
    ['f', 'shell', 'idle', () => ({ p:fShell() })], ['f', 'arch', 'idle', () => ({ p:fArch() }), 2],
    ['f', 'claw', 'idle', () => fClaw('idle'), 2], ['f', 'claw', 'raise', () => fClaw('raise'), 2], ['f', 'claw', 'strike', () => fClaw('strike'), 2], ['f', 'claw', 'hit', () => fClaw('hit'), 2],
    ['f', 'wings', 'fold', () => fWings(0)], ['f', 'wings', 'flare', () => fWings(1)] ];
  // the two titans: X0 world units across the road (the near foot's claws stop 150 units short of the left road edge; the crab's arched
  // leg plants just beyond it), Zo world units beyond the pass segment
  const TT = { s:{ id:'s', X0:0, Zo:2400, parts:{}, order:['tail', 'body', 'hips', 'leg', 'head', 'arm'], sink:0, mat:null, mk:SMAT_, ht:S_HT },
    f:{ id:'f', X0:0, Zo:3000, parts:{}, order:['wings', 'shell', 'arch', 'claw'], sink:0, mat:null, mk:FMAT_, ht:F_HT } };
  function* tsJob(j){ const [who, part, pose, fn, res = 1, fine = 0, kz = 1] = TJOBS[j], T = TT[who]; TSTEP = 'model'; const r = fn(); if(!T.mat) T.mat = T.mk(); const G = yield* vGrid(vRes(r.p.P, res, kz)), st = yield* vBake(who + part + pose + (fine ? 'f' : ''), G, T.mat, T.ht, res, fine, kz);
    st.anc = r; st.G = null; delete r.p; const PP = T.parts[part] = T.parts[part] || { name:part, poses:{}, fine:null, pose:pose, lv:null, c:1 }; if(fine){ (PP.fine = PP.fine || {})[pose] = st; return; } PP.poses[pose] = st;
    if(who === 's' && part === 'body'){   // the sail's charge glow: the ribs lit from the tail toward the head in four hard steps, front view
      st.glow = []; for(let lv = 1; lv <= 4; lv++){ const c = document.createElement('canvas'); c.width = G.w; c.height = G.h; const k = c.getContext('2d'), img = k.createImageData(G.w, G.h), U = new Uint32Array(img.data.buffer), on = 8 - Math.ceil(lv * 7 / 4), hot = pk32('#fff4c8'), mid = pk32('#ffc04a'), low = pk32('#ff7a2a');
        for(let y = 0; y < G.h; y++) for(let x = 0; x < G.w; x++) for(let z = 0; z < G.d; z++){ const i = (z * G.h + y) * G.w + x; if(!G.m[i]) continue; const a = G.a[i]; if(a && a >= on && G.m[i] === 3){ const tip = !G.m[i + G.w] || !G.m[i - 1]; U[(G.h - 1 - y) * G.w + x] = tip ? hot : a > on + 1 ? mid : low; } break; }
        k.putImageData(img, 0, 0); st.glow.push(c); } st.gx0 = G.x0; st.gy0 = G.y0; }
    // where a foot meets the deck: the nearest voxel to the road below ankle height (side -1: its lowest x, +1: its highest)
    const footX = (side, below) => { let best = side < 0 ? 1e9 : -1e9; for(let z = 0; z < G.d; z++) for(let y = 0; y < Math.min(G.h, below * res - G.y0); y++) for(let x = 0; x < G.w; x++) if(G.m[(z * G.h + y) * G.w + x]) best = side < 0 ? Math.min(best, x) : Math.max(best, x + 1); return (G.x0 + best) * st.vs; };
    if(who === 's' && part === 'leg' && pose === 'planted') T.X0 = 2250 - footX(-1, 12);   // the front foot's heel stops 250 units beyond the right road edge (the rear foot's toes are as far beyond the left: checked in the placement scan)
    if(who === 'f' && part === 'arch') T.X0 = 3300 - footX(-1, 8);
    if(who === 's' && part === 'hips') T.rearToe = footX(1, 12); }   // (the rear foot's toes, for the placement check)
  const TOE_ROWS = [
    '...RRR......RRR......RRR................',
    '..RLLLR....RLLLR....RLLLR...............',
    '.RLSssLR..RLSssLR..RLSssLR..............',
    'RLMSSSMLRRLMSSSMLRRLMSSSMLR.............',
    'LMMMMMMMCMMMMMMMMCMMMMMMMMLRnnWW........',
    'MDDDDDDDCDDDDDDDDCDDDDDDDDMLNnnWWW......',
    'DDDDDDDDCDDDDDDDDCDDDDDDDDDLNNnnWWW.....',
    'DDDDDDDDDDDDDDDDDDDDDDDDDDKK.NNnnnWW....',
    'EDDDDDDDDDDDDDDDDDDDDDDDDKK...NNnnnW....',
    'EEEEEEEEEEEEEEEEEEEEEEEEKK.....NNnnW....',
    'FFFFFFFFFFFFFFFFFFFFFFFF........NNnW....',
    '.FFFFFFFFFFFFFFFFFFFFF...........NNn....',
    '..................................Nn....',
    '...................................N....'];   // a slender digit of three phalanges (a scute hump and a crease at each knuckle), the claw thick at its root, narrowing, hooked down
  const TOE_NEAR = { K:'#0c0814', D:'#251d3a', M:'#3c3256', L:'#5e5480', R:'#b8c6ee', S:'#544a62', s:'#827890', C:'#160e22', E:'#3e2238', F:'#e0703e', N:'#3e342e', n:'#a6967a', W:'#e6dcc4' };
  const TOE_FAR = { K:'#08050e', D:'#1a1430', M:'#251d3a', L:'#3c3256', R:'#5e5480', S:'#342a40', s:'#544a62', C:'#0c0814', E:'#2a1828', F:'#a04a2e', N:'#2a221e', n:'#6c5e4e', W:'#a6967a' };
  function* tsSteps(){ if(TS.built) return; S.toeN = makeSprite(TOE_ROWS, TOE_NEAR, false); S.toeF = makeSprite(TOE_ROWS, TOE_FAR, false); yield; for(let j = 0; j < TJOBS.length; j++){ yield* tsJob(j); yield; YT = performance.now(); }
    POOL = { u8:[], u32:null, sb:null };   /* the scratch arrays go with the warm-up */
    /* memory: where a fine build takes over near, the coarse build's full-resolution level is never the one drawn; drop it */
    for(const id in TT) for(const k in TT[id].parts){ const P = TT[id].parts[k]; if(!P.fine) continue; for(const ps in P.poses){ const st = P.poses[ps]; if(P.fine[ps] && st.L.length > 2 && st.L[0].g === 1) st.L.shift(); } }
    cx.save(); for(const id in TT) for(const k in TT[id].parts){ const P = TT[id].parts[k]; for(const st of [...Object.values(P.poses), ...Object.values(P.fine || {})]){ for(const L of st.L) cx.drawImage(L.cv, 0, 0, 1, 1); if(st.backL) cx.drawImage(st.back, 0, 0, 1, 1); if(st.glow) for(const g of st.glow) cx.drawImage(g, 0, 0, 1, 1); } } cx.drawImage(S.toeN, 0, 0, 1, 1); cx.drawImage(S.toeF, 0, 0, 1, 1); cx.restore();   // upload now, not mid-ride
    TS.built = true; }
  function tsBuild(){ if(TS.built) return; if(!TS.it) TS.it = tsSteps(); for(const _ of TS.it); }

  // ---------------------------------------------------------------- projecting the titans
  // proj(z): the road's centre-line screen point and the scale at world depth z (this frame's segment projection inside the drawn range,
  // extrapolated from the farthest drawn segment beyond it)
  const PR = { x:0, y:0, sc:0 };
  function proj(z){ const cz = z - position; if(cz < NEAR) return null; const i = Math.floor(z / SEG), b = Math.floor(position / SEG), lim = Math.min(b + DRAW - 2, segs.length - 1), R = segs[Math.min(i, lim)];
    if(!R || !R.p1.screen.scale) return null; const sc = DEPTH / cz;
    if(i <= lim && R.p1.camera.z > DEPTH){ const f = (z - i * SEG) / SEG, a = R.p1.screen, c = R.p2.screen; PR.x = a.x + (c.x - a.x) * f; PR.y = a.y + (c.y - a.y) * f; }
    else { const camY = R.p1.world.y - R.p1.camera.y, s2 = segs[i], wy = s2 ? s2.p1.world.y : R.p1.world.y; PR.x = R.p1.screen.x + (W / 2 - R.p1.screen.x) * clamp((i - lim) / 160, 0, .85);   /* beyond the drawn road, eased toward the view's centre (a bend past the horizon would hide them behind the bridge) */ PR.y = H / 2 - PITCH - sc * (wy - camY) * H / 2; }
    PR.sc = sc; return PR; }
  // a titan-space point (voxel units) to the screen: [x, y] in OUT, or null when it is behind the camera
  const OUT = [0, 0];
  function tsPt(T, vx, vy, vz){ const pr = proj(T.Z0 + vz * V); if(!pr) return null; const k = pr.sc * W / 2; OUT[0] = pr.x + (T.X0 + vx * V) * k; OUT[1] = pr.y - (vy * V - T.sink) * k; return OUT; }
  let TDRAWS = 0;
  const INTS = { on:false, clip:false };   /* round 4: both tested in motion and left off: integer texels misalign the layers; the contour clip costs too much at the scale where it shows */
  // (INTS.on / INTS.clip turn them on for tests)   /* integer texel snapping for near slices (A/B in tests: MECH.sp_kaiju.INTS.on) */
  const CQ = { x0:new Float64Array(8), x1:new Float64Array(8), y0:new Float64Array(8), y1:new Float64Array(8), fx:new Float64Array(8), fy:new Float64Array(8), tk:new Float64Array(8) };
  function tsSlice(T, P, j, zc){ const st = P.st, vs = st.vs, L = P.lv, c = L.g === 1 ? P.c : 1, rw = L.rw[j]; if(!rw) return; const rh = L.rh[j], sx = L.rx[j], sy = L.ry[j], ax = st.x0 + L.ox[j], at = st.y0 + st.h - L.oy[j];
    let n = 0, big = false;
    for(let q = c - 1; q >= 0; q--){ const pr = proj(c > 1 ? zc + ((q + .5) / c - .5) * st.vz : zc); if(!pr) continue; const k = pr.sc * W / 2;
      const x0 = snap(pr.x + (T.X0 + ax * vs) * k), x1 = snap(pr.x + (T.X0 + (ax + rw) * vs) * k), y0 = snap(pr.y - (at * vs - T.sink) * k), y1 = snap(pr.y - ((at - rh) * vs - T.sink) * k);
      if(x1 <= 0 || x0 >= W || y1 <= 0 || y0 >= H || x1 <= x0 || y1 <= y0) continue;
      if(st.fine && INTS.on){ const r = cv.width / W, fx0 = pr.x + (T.X0 + ax * vs) * k, tc = vs * k * r; if(tc >= 1.5){ const nt = Math.round(tc) / r, mx = fx0 + rw * vs * k / 2, by = pr.y - ((at - rh) * vs - T.sink) * k;   /* integer texels: whole canvas-pixel stairs */
          const X0 = Math.round((mx - rw * nt / 2) * r) / r, Y1 = Math.round(by * r) / r; CQ.x0[n] = X0; CQ.x1[n] = X0 + rw * nt; CQ.y1[n] = Y1; CQ.y0[n] = Y1 - rh * nt; CQ.fx[n] = X0; CQ.fy[n] = Y1 - rh * nt; CQ.tk[n] = nt; n++; continue; } }
      CQ.x0[n] = x0; CQ.x1[n] = x1; CQ.y0[n] = y0; CQ.y1[n] = y1; CQ.fx[n] = pr.x + (T.X0 + ax * vs) * k; CQ.fy[n] = pr.y - (at * vs - T.sink) * k; CQ.tk[n] = vs * k; if((x1 - x0) * cv.width / W > rw * 1.9) big = true; n++; }
    if(!n) return; const ct = big && L.ct && (P.name === 'leg' || P.name === 'hips') && INTS.clip ? L.ct[j] : null;   /* (only the legs, the silhouettes nearest the camera: a clip costs) */
    if(ct){ cx.save(); cx.beginPath();   /* near: one clip for all the copies, the union of their smoothed outlines */
      for(let i = 0; i < n; i++){ const fx = CQ.fx[i], fy = CQ.fy[i], tk = CQ.tk[i]; for(const lp of ct){ cx.moveTo(fx + lp[0] * tk, fy + lp[1] * tk); for(let e = 2; e < lp.length; e += 2) cx.lineTo(fx + lp[e] * tk, fy + lp[e + 1] * tk); cx.closePath(); } }
      cx.clip('nonzero'); }
    for(let i = 0; i < n; i++){ cx.drawImage(L.cv, sx, sy, rw, rh, CQ.x0[i], CQ.y0[i], CQ.x1[i] - CQ.x0[i], CQ.y1[i] - CQ.y0[i]); TDRAWS++; }
    if(ct) cx.restore(); }
  // per frame: each part's pose and depth LOD (the coarsest merged level whose slices stay under a pixel apart; else gap-filling copies)
  function tsFrame(F, st, d){ const A = F.kj - PASS, camX = playerX * ROADW;
    for(const id in TT){ const T = TT[id]; T.Z0 = A * SEG + T.Zo; T.sink = id === 's' ? (1 - st.tRise) * S_HT * V * .9 : (1 - st.fRise) * F_HT * V * .9 + st.fall * F_HT * V * .62;
      for(const nm of T.order){ const P = T.parts[nm]; if(!P) continue; const ps = st.pose[id + nm] || P.pose, cs = P.poses[ps] || P.poses[P.pose]; P.cst = cs; P.st = cs;
        if(P.fine && P.fine[ps] && !MECH.sp_kaiju.DBGnofine){ const f = P.fine[ps], czc = Math.max(300, T.Z0 + cs.z0 * V - position); if(cs.vs * DEPTH / czc * W / 2 * cv.width / W > .5 * (cs.vs / f.vs)) P.st = f; }   /* (in canvas pixels: the 400 px layout's canvas is finer than its CSS px) */   // LOD: coarse far, fine near
        const s = P.st;
        const vs = s.vs, cz = Math.max(700, T.Z0 + s.z0 * s.vz - position), ex = Math.max(Math.abs(T.X0 + s.x0 * vs - camX), Math.abs(T.X0 + (s.x0 + s.w) * vs - camX)), ey = Math.max(Math.abs(s.y0 * vs - T.sink - CAMH), Math.abs((s.y0 + s.h) * vs - T.sink - CAMH));
        const sp = Math.max(ex, ey) * DEPTH * s.vz / (cz * cz) * W / 2; let L = s.L[0]; for(const l of s.L){ if(l.g * sp <= PX * 1.1) L = l; else break; } P.lv = L; P.c = L.g === 1 ? clamp(Math.ceil(sp / (PX * 1.3)), 1, s.fine ? 6 : 3) : 1;   /* near builds: more copies, slices about a pixel apart */ } }
    const near = Math.min(TT.s.Z0 + (TT.s.parts.leg ? TT.s.parts.leg.st.z0 * TT.s.parts.leg.st.vz : -20 * V), TT.f.Z0 - 40 * V);
    F.tsFar = (near - position) / SEG > 230; }
  // draw the slices whose depth falls in [za, zb) (both titans, interleaved far to near); zb < 0: everything
  const ITZ = new Float64Array(768), ITI = new Int32Array(768), ITO = new Int32Array(768); const ITP = [], ITT = [];
  // one toe: the sprite spans the toe in model x (from behind its knuckle to past the nail's hook), standing on the deck, at the toe's depth
  // the toes of every foot on its near build whose depth falls in [za, zb), far toe first (called from drawSeg, after the segment's props)
  function tsToes(za, zb, alpha){ const T = TT.s; for(const nm of ['hips', 'leg']){ const P = T.parts[nm]; if(!P || !P.st || !P.st.fine || !P.st.anc || !P.st.anc.toes) continue; const t = P.st.anc.toes, ga = cx.globalAlpha; cx.globalAlpha = ga * alpha;
      for(let i = t.length - 1; i >= 0; i--){ const z = T.Z0 + t[i].z * V; if(z >= za && z < zb) tsToe(T, P.st, i); } cx.globalAlpha = ga; } }
  function tsToe(T, st, i){ const q = st.anc.toes[i], pr = proj(T.Z0 + q.z * V); if(!pr) return; const spr = q.near ? S.toeN : S.toeF, k = pr.sc * W / 2, x0 = snap(pr.x + (T.X0 + q.x0 * V) * k), x1 = snap(pr.x + (T.X0 + q.x1 * V) * k);
    if(x1 <= x0 || x1 < 0 || x0 > W) return; const h = snap((x1 - x0) * spr.height / spr.width), yb = snap(pr.y - (.2 * V - T.sink) * k); cx.drawImage(spr, x0, yb - h, x1 - x0, h); TDRAWS++; }
  function tsDraw(za, zb, alpha){ let n = 0; if(MECH.sp_kaiju.DBGoff) return;   /* (DBGoff: perf A/B in tests) */
    for(const id in TT){ const T = TT[id]; for(const nm of T.order){ const P = T.parts[nm]; if(!P || !P.lv) continue; const s = P.st, g = P.lv.g, ng = P.lv.ng;
      let j0 = 0, j1 = ng - 1; if(zb >= 0){ j0 = Math.max(0, Math.ceil(((za - T.Z0) / s.vz - s.z0 - g / 2) / g)); j1 = Math.min(ng - 1, Math.ceil(((zb - T.Z0) / s.vz - s.z0 - g / 2) / g) - 1); }
      for(let j = j0; j <= j1 && n < 768; j++){ ITZ[n] = T.Z0 + (s.z0 + j * g + Math.min(g, s.n - j * g) / 2) * s.vz; ITI[n] = j; ITP[n] = P; ITT[n] = T; n++; }
      } }
    if(!n) return; for(let i = 0; i < n; i++) ITO[i] = i;
    for(let i = 1; i < n; i++){ const v = ITO[i]; let k = i - 1; while(k >= 0 && ITZ[ITO[k]] < ITZ[v]){ ITO[k + 1] = ITO[k]; k--; } ITO[k + 1] = v; }   // far first
    const ga = cx.globalAlpha; cx.globalAlpha = ga * alpha; cx.imageSmoothingEnabled = false;
    let rooted = false;
    for(let i = 0; i < n; i++){ const o = ITO[i]; if(!rooted && ITP[o].name === 'head' && ITT[o].id === 's' && ITZ[o] <= ITT[o].Z0){ rooted = true; beamRoot(FR.now); } tsSlice(ITT[o], ITP[o], ITI[o], ITZ[o]); if(ITP[o].name === 'body' && ITT[o].id === 's') sailGlowAt(ITT[o], ITP[o], ITZ[o]); }
    cx.globalAlpha = ga; }
  // the beam's root, inside the open mouth: the throat glows in hard steps as it charges, then the beam runs from the throat out
  // between the jaws (the nearer jaw and teeth are drawn over it, as the slices nearer than the head's mid-plane follow)
  function beamRoot(now){ const st = FR.st; if(!st || FR.kj < 0) return; const d = FR.kj - FR.p, charging = st.tp === 'beam' && d > 70, on = st.beam > 0; if(!charging && !on) return;
    const hd = TT.s.parts.head && TT.s.parts.head.st; if(!hd || !hd.anc.throat) return; let q = tsPt(TT.s, hd.anc.throat[0], hd.anc.throat[1], 0); if(!q) return; const tx = q[0], ty = q[1], k = V * PR.sc * W / 2;
    q = tsPt(TT.s, hd.anc.mouth[0], hd.anc.mouth[1], 0); if(!q) return; const mx = q[0], my = q[1], al = st.alpha;
    const lv = on ? 1 : clamp((100 - d) / 30, 0, 1), r = k * (2.5 + lv * 3.5);
    glow(tx, ty, r * 1.6, '#ff6a1a', .45 * lv * al); glow(tx, ty, r, '#ffb040', .55 * lv * al); glow(tx, ty, r * .45, '#fff2c0', .7 * lv * al);
    if(on) beamLine(tx, ty, mx, my, 1, clamp(k * 4, PX * 2, PX * 7), now, al); }
  // the charge glow on the sail (front view, at the sail's depth), drawn right after the slice that holds it
  let CHG = 0;
  function sailGlowAt(T, P, zc){ const s = P.cst; if(!CHG || !s.glow || Math.abs(zc - T.Z0) > P.st.vz * P.lv.g * .6 + 1) return; const pr = proj(T.Z0); if(!pr) return; const k = pr.sc * W / 2, g = s.glow[CHG - 1];
    const x0 = snap(pr.x + (T.X0 + s.gx0 * V) * k), y1 = snap(pr.y - (s.gy0 * V - T.sink) * k), w = snap(g.width * V * k), h = snap(g.height * V * k);
    const ga = cx.globalAlpha; cx.globalCompositeOperation = 'lighter'; cx.drawImage(g, x0, y1 - h, w, h); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = ga; }

  // ---------------------------------------------------------------- the kaiju backdrop
  function drawKaiju(o, t){ const { hz, now } = o, p = pSeg(), d = t - p, st = FR.st || kjState(d, now);
    if(K.trig !== t){ K.trig = t; K.ref = skyPar('far'); K.lastD = d; }
    const pan = -W * .04 * Math.tanh((skyPar('far') - K.ref) / (W * .04)),   /* a bounded swing on the far tier (env/README.md, Backdrop parallax) */ k = st.k, wl = hz + PX;
    cx.globalAlpha = st.alpha;
    const beamOn = st.beam > 0;
    // a stepped warm glow of the burning city along the horizon, stronger while the beam burns
    glow(W / 2 + pan, hz, W * .55, '#ff7a4a', (.1 + (beamOn ? .18 : 0)) * st.alpha);
    // the beam lights the underside of the rain cloud
    if(beamOn || st.impact >= 0){ const ca = Math.max(st.beam, st.impact >= 0 ? 1 - st.impact : 0) * st.alpha, cl = S.cloudLit, ck = PX * 2;
      cx.globalCompositeOperation = 'lighter'; for(const [al, sh] of [[.28, 0], [.16, cl.width * ck * .7]]){ cx.globalAlpha = al * ca; cx.drawImage(cl, snap(W / 2 + pan - cl.width * ck / 2 + sh * (H1(sh) - .5)), snap(hz * .02), cl.width * ck, cl.height * ck); }
      cx.globalAlpha = st.alpha; cx.globalCompositeOperation = 'source-over'; }
    // the skyscraper across the bay: hit by the glancing beam, it bursts, tilts and sinks into its own dust
    const tw = S.tower, tk = Math.max(PX, Math.round(k * .5 / PX) * PX), tx = W / 2 + pan + W * .16, c = st.collapse;
    if(c < 1){ const sinkT = c > .15 ? Math.pow((c - .15) / .85, 1.6) * tw.height * tk : 0, rot = c > .15 ? (c - .15) * .3 : 0;
      cx.save(); cx.beginPath(); cx.rect(0, 0, W, wl - PX * 2); cx.clip(); const x0 = snap(tx - tw.width * tk / 2), y0 = snap(wl - tw.height * tk + sinkT);
      cx.translate(x0 + tw.width * tk / 2, wl); cx.rotate(rot); cx.translate(-(x0 + tw.width * tk / 2), -wl); cx.drawImage(c > .05 ? S.towerD : tw, x0, y0, tw.width * tk, tw.height * tk); cx.restore();
      if(c > 0 && c < .4){ const ef = Math.min(4, Math.floor(c / .4 * 5)); blit(S['ex' + ef], tx, wl - tw.height * tk + sinkT + 26 * tk, tk); } }
    if(c > .1){ const g = Math.min(1, (c - .1) * 1.8); glow(tx, wl - 10 * tk, 46 * tk * g, '#ff6a2a', .35 * (1 - c * .4));
      for(let i = 0; i < 12; i++){ const n = i % 3, pf = S[(i % 3 === 1 ? 'pfl' : 'pf') + n], dk = PX * (1.4 + g * 2.6) * (.7 + H1(i * 9.1) * .5), dx = (H1(i * 3.1) - .5) * 44 * tk * g, dy = -(H1(i * 5.7) * 46 + 4) * tk * g * (.35 + c * .65);
        blit(pf, tx + dx + (reduce ? 0 : Math.sin(now / 900 + i) * PX), wl + dy + pf.height * dk * .4, dk); }
      cx.fillStyle = '#ffb04a'; for(let i = 0; i < 10; i++){ const ph = (now / 1400 + H1(i * 4.4)) % 1; cx.globalAlpha = st.alpha * (1 - ph) * (1 - c * .5); cx.fillRect(snap(tx + (H1(i * 2.2) - .5) * 30 * tk), snap(wl - 6 * tk - ph * 50 * tk), PX, PX); } cx.globalAlpha = st.alpha; }
    if(!TS.built) return void (cx.globalAlpha = 1);
    // the burning bay behind each titan: a stepped backlight halo low on its body, so the silhouette separates from the sky and the cables
    // (the Pacific Rim / Shin Godzilla night read: a dark giant against smoke lit from below by the burning city, a cool rim from the moon)
    for(const T of [TT.s, TT.f]){ const s0 = T.id === 's', q = tsPt(T, s0 ? -14 : 4, s0 ? 80 : 70, 14); if(!q) continue; const x = q[0], y = q[1], r0 = Math.max(105 * V * PR.sc * W / 2, H * .2), r = Math.min(r0, H * .55), fa = r0 > H * .55 ? clamp(H * 1.1 / r0 - 1, 0, 1) : 1;   // capped and faded up close: a backlight, not a wash over the frame
      if(fa > 0){ glow(x, y, r, '#7a2a3a', .5 * st.alpha * fa); glow(x, y + r * .35, r * .72, '#d0502e', .34 * st.alpha * fa); glow(x, y + r * .62, r * .42, '#ffa860', .24 * st.alpha * fa); } }
    // far away the whole pile is drawn here, behind the road (near, each slice is drawn in its own segment's depth order: drawSegBack)
    if(FR.tsFar) tsDraw(0, -1, st.alpha);
    { const lim = Math.floor(position / SEG) + DRAW - 2; for(const h of HE) if(h.on && h.seg >= lim) drawHeli(h, now, st.alpha);   /* (within the drawn road they are drawn in their own segment) */ }
    cx.globalAlpha = 1; }
  // the lights on the titans, the beam, its impact and the helicopters: drawn over the world (overlay), from the titans' projected anchors
  const AN = { mouth:[0, 0], chest:[0, 0], ok:0 };
  function tsFx(now, st, d){ if(!TS.built) return; const s = TT.s, f = TT.f, al = st.alpha;
    const hd = s.parts.head.st, mo = hd.anc.mouth, ey = hd.anc.eye;
    // Sairyū's amber eyes, Kanigaru's teal eyes and wing eye-spots
    for(const z of [-7, 7]){ const q = tsPt(s, ey[0], ey[1], z); if(q) glow(q[0], q[1], 9 * V * PR.sc * W / 2, '#ffd060', (st.tp === 'roar' || st.tp === 'beam' ? .8 : .55) * al); }
    for(const z of [-6, 6]){ const q = tsPt(f, -34, 66, z); if(q) glow(q[0], q[1], 5 * V * PR.sc * W / 2, '#7affe0', .55 * al); }
    { const fl = st.fp === 'flare' ? 1 : st.fp === 'raise' ? .7 : .45, sp = f.parts.wings.st.anc.spots; for(const [x, y, r] of sp){ const q = tsPt(f, x, y, -10); if(q) glow(q[0], q[1], r * 2.2 * V * PR.sc * W / 2 * fl, '#3affd8', .5 * al * (reduce ? 1 : .85 + .15 * Math.sin(now / 400))); } }
    // the sail's rib tips glowing as the beam charges
    if(st.charge){ const n = Math.ceil(st.charge * 7 / 4); for(let i = 0; i < n; i++){ const q = tsPt(s, -22 + i * 3.4, 98 + Math.sin(i * .9) * 10, 0); if(q) glow(q[0], q[1], 5 * V * PR.sc * W / 2, '#ffa040', .2 * al); } }
    // the beam: mouth to shell (for d 72..56 it is first on the bridge ahead: it cuts the deck at d 64, then swings up onto the crab)
    const m = tsPt(s, mo[0], mo[1], 0); AN.ok = 0; if(!m) return; AN.mouth[0] = m[0]; AN.mouth[1] = m[1]; const kk = V * PR.sc * W / 2;
    const ch = tsPt(f, -26, 50, -8); if(!ch) return; AN.chest[0] = ch[0]; AN.chest[1] = ch[1]; AN.ok = 1; const ck = V * PR.sc * W / 2; let tgt = AN.chest;
    { const z = FR.bz, sb = z && segs[z.B]; if(sb && d > 56 && d <= 72 && sb.p1.camera.z > 0){ const bp = [sb.p1.screen.x, sb.p1.screen.y - sb.p1.screen.scale * 300 * H / 2], q = clamp((64 - d) / 8, 0, 1); tgt = [lerp(bp[0], AN.chest[0], q), lerp(bp[1], AN.chest[1], q)]; } }
    cx.globalAlpha = al;
    if(st.tp === 'beam' && d > 70) glow(AN.mouth[0], AN.mouth[1], kk * (2 + (100 - d) * .12), '#ff8a30', .3 * al);   /* (the throat glows inside the mouth: beamRoot) */
    if(st.beam > 0){ beamLine(AN.mouth[0], AN.mouth[1], tgt[0], tgt[1], st.beam, clamp(kk * 5, PX * 2, PX * 9), now, al); glow(AN.mouth[0], AN.mouth[1], Math.min(kk * 9, H * .16), '#ffc060', .5 * al); glow(AN.mouth[0], AN.mouth[1], Math.min(kk * 3.5, H * .06), '#fff4d0', .6 * al); }   /* the flare at the lips */   // (capped: close overhead it would fill the screen)
    if(st.deflect > 0){ const tt = S.tower, tk = Math.max(PX, Math.round(st.k * .5 / PX) * PX); beamLine(AN.chest[0], AN.chest[1], W / 2 + W * .16, HZ - tt.height * tk * .78, Math.min(1, st.deflect * 3), clamp(ck * 2.4, PX * 2, PX * 6), now, al * (1 - st.deflect * .5)); }
    if(st.impact >= 0){ const fr = Math.min(4, Math.floor(st.impact * 5)), ek = ck * .55 * (1.4 + st.impact); blit(S['ex' + (st.beam > 0 ? (Math.floor(now / 120) % 3) + (st.impact > .3 ? 1 : 0) : fr)], AN.chest[0], AN.chest[1] + 20 * ek, ek); glow(AN.chest[0], AN.chest[1], ck * 16 * (1 - st.impact * .6), '#ffd070', .5 * al); }
    cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- typhoon
  const tyI = (t, p) => { const r = p - t; return sm(r / TY_RAMP) * sm((TY_LEN - r) / TY_RAMP); };
  const GUST0 = 90, GUST_EVERY = 105, TELE = 50, PUSH = 45;
  // wind: { w 0..1 strength, tele 0..1 telegraph, push 0..1 } at rider segment p
  function wind(t, p){ const I = tyI(t, p), r = p - t; let tele = 0, push = 0, after = 0;
    for(let g = GUST0; g < TY_LEN - 40; g += GUST_EVERY){ const q = r - g; if(q >= -TELE && q < 0) tele = (q + TELE) / TELE; else if(q >= 0 && q < PUSH) push = Math.sin(q / PUSH * Math.PI); else if(q >= PUSH && q < PUSH + 30) after = 1 - (q - PUSH) / 30; }
    const w = I * Math.max(.35, .35 + tele * .4, push > 0 ? .8 + push * .2 : 0, after * .8); return { I, w, tele: I > .3 ? tele : 0, push: push * I, r }; }
  const sockLv = w => w < .3 ? 0 : w < .55 ? 1 : w < .8 ? 2 : 3;
  function drawTyphoonSky(o, t){ const { hz, now } = o, wd = wind(t, pSeg()), I = wd.I; if(I < .02) return;
    const fl = flashLv(now, t), band = S.storm, k = PX * 2, bw = band.width * k, off = ((now * (reduce ? .01 : .04) * (1 + wd.w) + skyPar('sky')) % bw + bw) % bw;
    // the cloud deck slides in from the top as the storm arrives
    const y0 = snap(-band.height * k * (1 - I) * .9);
    cx.globalAlpha = Math.min(1, I * 1.3); for(let x = -off; x < W; x += bw) cx.drawImage(band, snap(x), y0, bw, band.height * k);
    if(fl){ cx.globalAlpha = Math.min(1, I * 1.3) * fl; for(let x = -off; x < W; x += bw) cx.drawImage(S.stormL, snap(x), y0, bw, band.height * k); }
    const off2 = ((now * (reduce ? .02 : .09) * (1 + wd.w) + skyPar('moon') + 300) % bw + bw) % bw; cx.globalAlpha = Math.min(1, I * 1.3) * .85;
    for(let x = -off2; x < W; x += bw) cx.drawImage(band, snap(x), y0 + snap(band.height * k * .45), bw, band.height * k * .7); cx.globalAlpha = 1;
    if(fl > .5){ const id = Math.floor(now / LT), bx = W * (.08 + H1(id) * .3); let x = bx, y = snap(hz * .25); cx.fillStyle = '#e8f0ff';
      for(let i = 0; i < 14 && y < hz; i++){ const nx = x + (H1(id * 7 + i) - .55) * PX * 8, ny = y + PX * (4 + H1(id + i * 3) * 6); for(let j = 0; j < 4; j++) cx.fillRect(snap(lerp(x, nx, j / 4)), snap(lerp(y, ny, j / 4)), PX, snap((ny - y) / 4) + PX); x = nx; y = ny; }
      glow(x, hz, W * .1, '#b8c8ff', .4); }
    cx.fillStyle = `rgba(14,20,36,${.25 * I})`; cx.fillRect(0, 0, W, hz); }
  const LT = 5200, flashLv = (now, t) => { if(reduce || t < 0 || H1(Math.floor(now / LT)) < .35 || tyI(t, pSeg()) < .5) return 0; const q = now % LT; return q < 140 ? 1 : q < 300 ? .55 : q < 480 ? .25 : 0; }, flashOn = (now, t) => flashLv(now, t) > 0;

  function tyPlace(i, s, rel){ const o = {};
    // roadside vegetation belongs to env/coast.js; it bends its palms from MECH.sp_kaiju.wind()
    if(rel % 45 === 20) o.sock = 1.32;
    if(rel % 16 === 8) o.beacon = 1;
    for(let j = 0; j < 14; j++){ const w0 = 26 + j * 37 + Math.floor(H1(j * 7.7) * 9); if(rel === w0 && rel < TY_LEN - 20) o.wave = j + 1; }
    if(rel === 0 || rel === 250) o.gantry = rel ? 2 : 1;
    s.ty = Object.keys(o).length ? o : null; }

  function drawTySeg(s, sx0, sy0, uw, fog, now, t){ const o = s.ty, F = frame(now), p = F.p, wd = F.wd || (F.wd = wind(t, p));
    const a = 1 - fog * .8; cx.globalAlpha = a;
    if(o.sock){ const lv = sockLv(wd.w), spr = S['sock' + lv + (reduce ? 0 : Math.floor(now / (160 - lv * 30)) % 2)], kk = uw * .9 / spr.height; blit(spr, sx0 + o.sock * uw + spr.width * kk * .4, sy0, kk); }
    if(o.beacon){ const bx = sx0 + 1.24 * uw, h = uw * .32, sz = Math.max(PX, snap(uw * .05)), on = reduce ? true : Math.floor(now / 600 + (s.index % 32 ? 1 : 0)) % 2;
      cx.fillStyle = '#1a1c26'; cx.fillRect(snap(bx - sz / 4), snap(sy0 - h), Math.max(PX, snap(sz / 2)), snap(h)); cx.fillStyle = on ? '#ffb02a' : '#5a3a10'; cx.fillRect(snap(bx - sz / 2), snap(sy0 - h - sz), sz, sz);
      if(on){ cx.fillStyle = '#fff0b0'; cx.fillRect(snap(bx - sz / 4), snap(sy0 - h - sz * .75), Math.max(PX, snap(sz / 2)), Math.max(PX, snap(sz / 2))); glow(bx, sy0 - h - sz / 2, uw * .35 + PX * 2, '#ffa02a', .45 * a); } }
    if(o.gantry){ const gw = uw * 1.3, gh = uw * 1.55, pw = uw * 1.5, ph = uw * .34, px0 = sx0 - pw / 2, py0 = sy0 - gh - ph;
      cx.fillStyle = '#16121c'; cx.fillRect(snap(sx0 - gw), snap(sy0 - gh), Math.max(PX, snap(uw * .06)), snap(gh)); cx.fillRect(snap(sx0 + gw - uw * .06), snap(sy0 - gh), Math.max(PX, snap(uw * .06)), snap(gh)); cx.fillRect(snap(sx0 - gw), snap(sy0 - gh - uw * .05), snap(gw * 2), Math.max(PX, snap(uw * .06)));
      cx.fillStyle = '#3a3e4a'; cx.fillRect(snap(px0 - uw * .03), snap(py0 - uw * .03), snap(pw + uw * .06), snap(ph + uw * .06)); cx.fillStyle = '#05050a'; cx.fillRect(snap(px0), snap(py0), snap(pw), snap(ph));
      const on = reduce || Math.floor(now / 600) % 2; if(uw > 10){ const tc = label(o.gantry === 1 ? '強風注意' : '横風注意', '#ffb02a'), th = ph * .72, tw = tc.width * th / tc.height; cx.imageSmoothingEnabled = false; cx.drawImage(tc, snap(sx0 - tw / 2), snap(py0 + (ph - th) / 2), snap(tw), snap(th)); }
      for(const sd of [-1, 1]){ const lx = sx0 + sd * (pw / 2 + uw * .08), ly = py0 + ph / 2, sz = Math.max(PX, snap(uw * .07)); cx.fillStyle = on === (sd > 0) || reduce ? '#ffb02a' : '#4a3010'; cx.fillRect(snap(lx - sz / 2), snap(ly - sz / 2), sz, sz); if(on === (sd > 0) || reduce) glow(lx, ly, uw * .3, '#ffa02a', .4 * a); } }
    if(o.wave){ const dist = s.index - p, e = (60 - dist) / 60; if(e >= 0 && e < 1){ const f = Math.min(5, Math.floor(e * 6)), spr = S['wv' + f], kk = uw * 1.7 / spr.height, wx = sx0 - 1.12 * uw - 6 * kk, wy = sy0 - uw * .14;
      cx.globalAlpha = a * (wd.I > .2 ? 1 : wd.I * 5); cx.drawImage(spr, snap(wx), snap(wy - spr.height * kk), spr.width * kk, spr.height * kk);
      if(f === 2) glow(wx + 14 * kk, wy - 30 * kk, uw * .6, '#a8c4f0', .15 * a); } }
    cx.globalAlpha = 1; }

  // text baked once into a small pixel canvas (DotGothic16 at 16 px is its native grid), rebuilt once the font has loaded
  // text baked once into a small pixel canvas (DotGothic16 at 16 px is its native grid). Built in warm(), and rebuilt once (outside the
  // ride's draw path) when the webfont finishes loading; label() during a ride is a cache lookup only.
  const LBL = {}, LBL_LIST = [['強風注意', '#ffb02a'], ['横風注意', '#ffb02a'], ['KAIJU JUMP', '#ffe070'], ['怪獣ジャンプ', '#ffffff']];
  function bakeLabel(t, col){ const c = document.createElement('canvas'), k = c.getContext('2d'); k.font = '16px DotGothic16, monospace'; c.width = Math.ceil(k.measureText(t).width) + 2; c.height = 18;
    k.font = '16px DotGothic16, monospace'; k.textBaseline = 'middle'; k.fillStyle = col; k.fillText(t, 1, 9); const d = k.getImageData(0, 0, c.width, c.height); for(let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0; k.putImageData(d, 0, 0);
    cx.drawImage(c, 0, 0, 1, 1); return LBL[t + col] = c; }
  function label(t, col){ return LBL[t + col] || bakeLabel(t, col); }
  let fontHooked = false;
  function bakeLabels(){ for(const [t, col] of LBL_LIST) bakeLabel(t, col);
    if(!fontHooked && document.fonts && document.fonts.load){ fontHooked = true; document.fonts.load('16px DotGothic16', '強風注意怪獣ジャンプKAIJU').then(() => { for(const [t, col] of LBL_LIST) bakeLabel(t, col); }).catch(() => {}); } }


  // ================================================================ 橋崩落 the bridge break and the kaiju jump
  // The titan's beam misses the crab and slices across the Bay Bridge 150 segments ahead of the rider (d = 64): a white-hot blast, a
  // shockwave ring, debris arcing, hangers snapping and whipping, a deck section dropping into the bay. The near deck tilts up into a
  // jagged ramp (rebar, sparking cut cables, fires, a toppled lamp); the far deck is lower and broken. The ramp always launches you
  // (the blast pushes you to speed) and MECH.sp_jump.launch flies a distance-driven arc that always lands on the far deck, so no speed or
  // line can fail it. Traffic in the zone is thrown clear by the blast; new cars never spawn into it. The zone reserves its segments
  // (skRes / police / no hazards, curves straightened) the same way the drawbridge does.
  const BRK = 86, GAP = 48, RAMP = 22, HR = 3000, LOW = 2200, LANDX = 6, FAR = 44, BLAST_D = 64, WATER = 0, DEEP = 2600, PEAK = 3400;
  const zones = [];
  const zoneOf = i => { for(const z of zones) if(i >= z.B - 200 && i <= z.B + GAP + FAR + 30) return z; return null; };
  function reserve(q, z){ if(!q || q.kjZ === z) return; q.kjZ = z; q.skRes = 1; q.police = 1; q.hz = null; const o = q.index - z.B;
    const f = o < -100 ? clamp((-70 - o) / 30, 0, 1) : o > GAP + FAR ? clamp((o - GAP - FAR) / 20, 0, 1) : 0; q.curve *= f; }
  function addZone(pk){ const z = { pk, B:pk + BRK, blown:false, launched:false, landed:false }; zones.push(z); if(zones.length > 8) zones.shift();
    for(let j = Math.max(0, z.B - 200); j < segs.length && j <= z.B + GAP + FAR + 30; j++) reserve(segs[j], z); return z; }
  const zoneLive = z => z && segs[z.B] && segs[z.B].kjZ === z;
  function activeZone(ps){ if(state === 'ready') return null;   /* behind the title the bridge holds: no blast, no gap, no jump */ for(const z of zones) if(zoneLive(z) && ps > z.B - 300 && ps < z.B + GAP + FAR + 60) return z; return null; }
  // geometry: offsets added to the world y of the ramp and far-deck segments (additive, so the jump helper's camera lift stays exact)
  function deform(z, g){ const tilt = sm(g / 40), low = sm(g / 30);
    for(let j = z.B - RAMP; j < z.B + GAP + FAR; j++){ const q = segs[j]; if(!q) continue; const o = j - z.B; let o1 = 0, o2 = 0;
      if(o < 0){ const t1 = (o + RAMP) / RAMP, t2 = t1 + 1 / RAMP; o1 = HR * tilt * t1 * t1; o2 = HR * tilt * t2 * t2; }
      else if(o < GAP){ o1 = o2 = -DEEP * sm(g / 20); }
      else if(o >= GAP){ const t1 = (o - GAP) / FAR, t2 = t1 + 1 / FAR, e = v => v < .35 ? 1 : 1 - sm((v - .35) / .65); o1 = -LOW * low * e(t1); o2 = -LOW * low * e(t2); }
      const a1 = q.kjA1 || 0, a2 = q.kjA2 || 0; if(o1 !== a1 || o2 !== a2){ q.p1.world.y += o1 - a1; q.p2.world.y += o2 - a2; q.kjA1 = o1; q.kjA2 = o2; } } }
  // projection helper like the drawbridge's: segment s, fraction f along it, X half-road widths, h world units above the road
  function P(s, f, X, h){ const a = s.p1.screen, b = s.p2.screen, sc = a.scale + (b.scale - a.scale) * f;
    return [a.x + (b.x - a.x) * f + X * (a.w + (b.w - a.w) * f), a.y + (b.y - a.y) * f - sc * h * H / 2]; }
  function quad(p1, p2, p3, p4, col){ cx.fillStyle = col; cx.beginPath(); cx.moveTo(p1[0], p1[1]); cx.lineTo(p2[0], p2[1]); cx.lineTo(p3[0], p3[1]); cx.lineTo(p4[0], p4[1]); cx.closePath(); cx.fill(); }
  function pline(a, b, col, w){ const n = Math.min(200, Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / PX))); cx.fillStyle = col; for(let i = 0; i <= n; i++){ const t = i / n; cx.fillRect(snap(a[0] + (b[0] - a[0]) * t - w / 2), snap(a[1] + (b[1] - a[1]) * t - w / 2), w, w); } }
  const CONC = ['#121420', '#262a3a', '#3e4458', '#6a7290', '#a8b0c8'];
  // debris chunks: fixed launch vectors per chunk (world units per second), flown by the distance since the blast
  const CHUNKS = Array.from({ length:34 }, (_, i) => ({ x0:(H1(i * 3.1) - .5) * 2.2, vz:(H1(i * 5.7) - .4) * 5200, vx:(H1(i * 7.3) - .5) * 2.4, vy:2600 + H1(i * 9.1) * 4200, v:i % 3, sz:.5 + H1(i * 2.2) * .9 }));
  const chunkSpr = v => { const g = new Grid(14, 12), pts = [], n = 6 + v; for(let k = 0; k < n; k++){ const an = k / n * 6.283 + H1(v * 9 + k) * .6, r = 3.2 + H1(v * 5 + k * 3) * 2.4; pts.push([7 + Math.cos(an) * r * 1.15, 6 + Math.sin(an) * r * .85]); }
    g.poly(pts, 1); const tip = [[13, 1], [0, 2], [12, 10]][v]; g.line(7, 6, tip[0], tip[1], 2); if(v !== 1) g.line(6, 7, 1 + v * 5, 11, 2);
    return bake('chunk' + v, g, { 1:{ r:['#0c0e16', '#262a3a', '#4a5068', '#7a8298', '#c0c8dc', '#d08a5a'] }, 2:{ flat:'#9a5a3a', line:'#3a1c10' } }); };
  const flame = f => procSprite('kj_flame' + f, 9, 14, (x, y) => { const cxp = 4 + Math.sin(y * .7 + f * 2.1) * (1 - y / 14) * 1.5, w = (y / 14) * 4.2 * (1 - Math.pow(Math.max(0, y - 10) / 4, 2) * .4) + (f === 1 ? .4 : 0), dx = Math.abs(x + .5 - cxp);
    if(y < 2 + f || dx > w) return null; const q = dx / Math.max(.5, w); return q < .35 && y > 6 ? '#fff4c0' : q < .65 ? '#ffb02a' : y < 7 ? '#ff6a1a' : '#c8301e'; });
  let cardT = 0; const cardGo = () => { const QT = MECH.quiet; cardT = QT && QT.claim && !QT.claim(2, 2.8) ? 0 : 2.8; };   // the landing card asks the message arbiter (mech/arrival.js) first
  // (a flame near the camera fades out between 8x and 14x like any prop (scaleFade), instead of growing into screen-sized blocks)
  const flameAt = (pt, fk, seed, now) => { const sf = scaleFade(fk); if(sf <= 0) return; const ga = cx.globalAlpha; cx.globalAlpha = ga * sf; blit(S['fl' + (((Math.floor(now / 120 + seed * 7) % 3) + 3) % 3)], pt[0], pt[1] + PX, fk); cx.globalAlpha = ga; };
  function drawBreakSeg(s, uw, fog, now, z, g){ if(uw > W * 1.1 || s.p1.camera.z <= DEPTH * 2) return;   // under or behind the camera: never draw
    const o = s.index - z.B, a = (1 - fog * .85) * clamp((W * 1.1 - uw) / (W * .45), 0, 1), fc2 = c => mixc(c, '#0a0c1c', fog * .8);
    cx.globalAlpha = a;
    // the hole: the deck is gone; through it, the bay far below (stepped water, firelight streaks), the fallen section half sunk in churning
    // foam, and the main cables hanging down into the gap. While it falls (the first 60 segments after the blast) the slab tumbles away.
    if(o >= 0 && o < GAP && g >= 0){ const hole = [P(s, 0, -2.2, 0), P(s, 0, 2.2, 0), P(s, 1, 2.2, 0), P(s, 1, -2.2, 0)];
      quad(...hole, fc2(o % 2 ? '#181a3a' : '#1c1c40'));
      cx.save(); cx.beginPath(); cx.moveTo(hole[0][0], hole[0][1]); for(const q of hole) cx.lineTo(q[0], q[1]); cx.closePath(); cx.clip();
      // the water surface far below: a darker band where it sits, broken reflections of the fires and the beam
      quad(P(s, 0, -3, WATER), P(s, 0, 3, WATER), P(s, 1, 3, WATER), P(s, 1, -3, WATER), fc2(o % 3 ? '#1e2048' : '#26224a'));
      if(o % 3 === 1){ cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a * .3; quad(P(s, 0, -3, WATER), P(s, 0, 3, WATER), P(s, 1, 3, WATER), P(s, 1, -3, WATER), '#ff5a1a'); cx.globalAlpha = a; cx.globalCompositeOperation = 'source-over'; }
      cx.globalCompositeOperation = 'lighter'; for(let k = 0; k < 6; k++){ const X = (H1(s.index * 3 + k) - .5) * 3.6, pt = P(s, H1(k * 1.7 + s.index), X, WATER), w = Math.max(PX * 2, snap(uw * .35)); cx.fillStyle = ['#ff7a2a', '#ffb04a', '#ff5a8a', '#ffd890'][k]; cx.globalAlpha = a * .6 * (.55 + .45 * Math.sin(now / 600 + s.index * 1.3 + k)); cx.fillRect(snap(pt[0] - w / 2), snap(pt[1]), w, PX); cx.fillRect(snap(pt[0] - w / 4), snap(pt[1] + PX * 2), snap(w / 2), PX); }
      { const heat = Math.max(1 - o / 8, 1 - (GAP - 1 - o) / 8, o >= 14 && o < 36 ? 1 - Math.abs(o - 24) / 12 : 0);   // near the torn edges and the slab
        if(heat > 0){ cx.globalAlpha = a * .5 * heat; quad(P(s, 0, -2.2, 0), P(s, 0, 2.2, 0), P(s, 1, 2.2, 0), P(s, 1, -2.2, 0), '#5a2008');
          for(let k = 0; k < 5; k++){ const X = (H1(s.index * 5 + k) - .5) * 3.4, pt = P(s, H1(k * 2.3 + s.index * .7), X, WATER), w = Math.max(PX * 3, snap(uw * .5 * heat)); cx.fillStyle = k % 2 ? '#ffc04a' : '#ff8a2a'; cx.globalAlpha = a * heat * (.5 + .4 * Math.sin(now / 450 + k * 2 + s.index)); cx.fillRect(snap(pt[0] - w / 2), snap(pt[1]), w, PX * 2); }
          if(o % 3 === 0){ const c0 = P(s, .5, 0, WATER); glow(c0[0], c0[1], uw * 1.4 * heat, '#ff7a2a', .35 * heat); } } }
      cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = a;
      // the fallen section: one end sunk, the other reared out of the water, lane paint still on it, foam churning where it meets the bay
      if(g >= 50 && o >= 16 && o < 34){ const rise = q => (q - 13) / 10 * 1500, h1 = WATER + rise(o - 16), h2 = WATER + rise(o - 15), sk = Math.min(1, (g - 50) / 30);
        if(h2 > WATER - 200){ const top0 = Math.max(WATER, h1), top1 = Math.max(WATER, h2);
          quad(P(s, 0, -1.2, top0), P(s, 0, 1, top0), P(s, 1, 1, top1), P(s, 1, -1.2, top1), fc2(o % 2 ? CONC[2] : '#34384a'));
          quad(P(s, 0, 1, top0), P(s, 1, 1, top1), P(s, 1, 1, WATER), P(s, 0, 1, WATER), fc2(CONC[1]));
          for(const X of [-.5, .3]) quad(P(s, .1, X - .03, top0 + 4), P(s, .1, X + .03, top0 + 4), P(s, .6, X + .03, top1 + 4), P(s, .6, X - .03, top1 + 4), fc2('#c8c0a8'));
          quad(P(s, 0, -1.2, top0), P(s, 0, 1, top0), P(s, 0, 1, top0 - 40), P(s, 0, -1.2, top0 - 40), fc2(CONC[4])); }
        if(h1 <= WATER + 150 && h2 >= WATER - 150 || o === 16 || o === 33 || o % 3 === 0){ cx.fillStyle = '#ffffff'; for(let k = 0; k < 24; k++){ const X = -1.4 + 2.6 * H1(k * 3.7 + s.index), ph = (now / 900 + H1(k * 1.9)) % 1, pt = P(s, H1(k * 5.3), X, WATER + ph * 220);
            cx.globalAlpha = a * sk * Math.min(1, ph * 5) * (1 - ph); cx.fillRect(snap(pt[0]), snap(pt[1]), PX * (k % 3 ? 1 : 2), PX); } cx.globalAlpha = a; } }
      // the main cables, cut, hanging down into the gap from both sides
      for(const X of [-1.42, 1.42]){ const hang = q => DEEP + (q < GAP / 2 ? 3600 - Math.pow(q / 7, 1.4) * 6000 : 3600 - Math.pow((GAP - q) / 7, 1.4) * 6000);
        const h1 = Math.max(WATER, hang(o)), h2 = Math.max(WATER, hang(o + 1)); if(h1 > WATER || h2 > WATER){ pline(P(s, 0, X + (o % 3) * .01, h1), P(s, 1, X, h2), fc2('#a8b0c8'), Math.max(PX, snap(uw * .02))); pline(P(s, 0, X - .02, h1), P(s, 1, X - .02, h2), fc2('#3a4058'), Math.max(PX, snap(uw * .01))); } }
      cx.restore();
      if(g < 60){ const dr = Math.pow(g / 60, 2) * 5200, rot = (o % 2 ? 1 : -1) * g / 60 * .5, sh = (h, X) => -dr + h + rot * X * 900;
        if(dr < 4800){ quad(P(s, 0, -1.5, sh(0, -1.5)), P(s, 0, 1.5, sh(0, 1.5)), P(s, 1, 1.5, sh(0, 1.5)), P(s, 1, -1.5, sh(0, -1.5)), fc2(o % 2 ? '#22202c' : '#1c1a26'));
          quad(P(s, 0, -1.5, sh(0, -1.5)), P(s, 0, 1.5, sh(0, 1.5)), P(s, 0, 1.5, sh(-260, 1.5)), P(s, 0, -1.5, sh(-260, -1.5)), fc2(CONC[1]));
          for(const X of [-1 / 3, 1 / 3]) quad(P(s, .2, X - .03, sh(2, X)), P(s, .2, X + .03, sh(2, X)), P(s, .7, X + .03, sh(2, X)), P(s, .7, X - .03, sh(2, X)), fc2('#b8b0a0')); } } }
    // the ramp: the near deck tilted up, cracked across
    if(o < 0 && o >= -RAMP && g >= 0){
      // the tilted slab's side faces down to the old deck line, and a hazard band painted by the blast scorch on the last stretch
      { const t1 = (o + RAMP) / RAMP, t2 = t1 + 1 / RAMP, h1 = HR * sm(g / 40) * t1 * t1, h2 = HR * sm(g / 40) * t2 * t2; for(const X of [-1.1, 1.1]){ quad(P(s, 0, X, 0), P(s, 1, X, 0), P(s, 1, X, -h2), P(s, 0, X, -h1), fc2(o % 2 ? CONC[1] : CONC[2])); quad(P(s, 0, X, -h1 * .55), P(s, 1, X, -h2 * .55), P(s, 1, X, -h2), P(s, 0, X, -h1), fc2(CONC[0])); quad(P(s, 0, X, 0), P(s, 1, X, 0), P(s, 1, X, -60), P(s, 0, X, -60), fc2(CONC[4])); } }
      if(o >= -6) for(let k = 0; k < 8; k++){ const X0 = -1 + k * .25; if((k + o) % 2) quad(P(s, .1, X0, 2), P(s, .1, X0 + .25, 2), P(s, .9, X0 + .25, 2), P(s, .9, X0, 2), fc2(o >= -3 ? '#2a1a10' : '#e8a020')); }
      if(o % 3 === 0) for(let k = 0; k < 3; k++){ const X0 = -1 + k * .7 + H1(s.index + k) * .3; pline(P(s, .3, X0, 2), P(s, .55, X0 + .35, 2), fc2('#06070c'), Math.max(PX, snap(uw * .012))); }
      if(o >= -4){ // a crack network in the asphalt running back from the tear
        for(let k = 0; k < 5; k++){ let X = -1 + 2 * H1(s.index * 3 + k), f = .1; const w = Math.max(PX, snap(uw * .01)); for(let q = 0; q < 4; q++){ const nX = X + (H1(k * 7 + q + s.index) - .5) * .4, nf = f + .22; pline(P(s, f, X, 3), P(s, nf, nX, 3), fc2('#05060a'), w); if(q === 1) pline(P(s, nf, nX, 3), P(s, nf + .15, nX + .25, 3), fc2('#05060a'), w); X = nX; f = nf; } } }
      if(o === -1){ // the tear: concrete teeth of different heights against the sky, lit from the fires below, rebar bent up, a guardrail curled back
        const n = 18; for(let k = 0; k < n; k++){ const X0 = -1.25 + 2.5 * k / n, X1 = X0 + 2.5 / n, tip = 120 + H1(k * 7.7) * 520 * (k % 3 === 1 ? 1.4 : 1), mid = (X0 + X1) / 2 + (H1(k) - .5) * .06;
          quad(P(s, 1, X0, 0), P(s, 1, X1, 0), P(s, 1, mid + .02, tip), P(s, 1, X0 + .01, tip * .45), fc2(k % 2 ? CONC[3] : CONC[2]));
          quad(P(s, 1, X0, tip * .45), P(s, 1, mid + .02, tip), P(s, 1, mid, tip * .9), P(s, 1, X0 + .01, tip * .4), fc2(CONC[4]));
          quad(P(s, 1, X0, -40), P(s, 1, X1, -40), P(s, 1, X1, -160), P(s, 1, X0, -160), fc2(k % 2 ? '#7a4028' : '#a05a30')); }   // the slab's underside lit by the fires below
        for(let k = 0; k < 12; k++){ const X = -1.15 + 2.3 * H1(k * 4.1), up = 300 + H1(k * 6.1) * 600, bx = (H1(k * 2.3) - .5) * .25, b = P(s, 1, X, 60), m = P(s, 1, X + bx * .3, up), e = P(s, .85, X + bx, up + 200 + H1(k) * 200), w = Math.max(PX, snap(uw * .012));
          pline(b, m, fc2('#b06a3a'), w); pline(m, e, fc2(k % 2 ? '#c8803a' : '#8a5030'), w); }
        for(const sd of [-1, 1]){ let pts = []; for(let q = 0; q <= 6; q++){ const t = q / 6; pts.push(P(s, 1 - t * t * .4, sd * (1.06 - t * .15), 220 + Math.sin(t * 2.6) * 900 * t)); } for(let q = 0; q < 6; q++) pline(pts[q], pts[q + 1], fc2(q % 2 ? '#e8ecf4' : '#a8b0c8'), Math.max(PX, snap(uw * .025))); }
        for(const X of [-1.15, -.45, .25, .9]){ const pt = P(s, 1, X, 80), fk = uw * .6 / 14; flameAt(pt, fk, X, now); glow(pt[0], pt[1] - fk * 7, uw * .5, '#ff7a2a', .4 * a); }
        { const on = reduce ? 1 : Math.floor(now / 600) % 2; for(let k = 0; k < 9; k++){ const X = -1 + k * .25, pt = P(s, .7, X, 30), sz = Math.max(PX, snap(uw * .05)), lit = (k + on) % 2; cx.fillStyle = lit ? '#ffb02a' : '#5a3a10'; cx.fillRect(snap(pt[0] - sz / 2), snap(pt[1] - sz), sz, sz); if(lit) glow(pt[0], pt[1] - sz / 2, uw * .18, '#ffa02a', .4 * a); } }
        for(const X of [-1.22, 1.22]){ const pt = P(s, 1, X, 200); cx.fillStyle = '#ffe070'; for(let k = 0; k < 12; k++){ const ph = (now / 600 + H1(k * 3.3 + X)) % 1; cx.globalAlpha = a * (1 - ph) * Math.min(1, ph * 6); cx.fillRect(snap(pt[0] + (H1(k * 5.1) - .5) * uw * .4 * ph), snap(pt[1] - uw * .1 + ph * ph * uw * .7), PX, PX); } cx.globalAlpha = a; glow(pt[0], pt[1], uw * .25, '#ffe070', .35 * a); } }
      if(o === -3){ const b = P(s, .5, 1.12, 0), e = P(s, .5, .55, 420); pline(b, e, fc2('#3a3e50'), Math.max(PX, snap(uw * .02))); cx.fillStyle = fc2('#d8d0b0'); cx.fillRect(snap(e[0] - PX), snap(e[1] - PX), PX * 2, PX * 2); } }
    // the far broken edge facing you: a jagged concrete face dropping to the water, rebar hanging, fires along the top
    if(o === GAP && g >= 0){ { const c0 = P(s, 0, 0, -1600); glow(c0[0], c0[1], uw * 3, '#ff6a2a', .35 * a); }
      const n = 20; for(let k = 0; k < n; k++){ const X0 = -1.8 + 3.6 * k / n, X1 = X0 + 3.6 / n, dep = 2400 + H1(k * 3.9) * 1600, top = H1(k * 5.3) * 160;
        quad(P(s, 0, X0, top), P(s, 0, X1, top * .4), P(s, 0, X1, -dep), P(s, 0, X0, -dep * .85), fc2(k % 3 === 0 ? '#5a3a34' : k % 3 === 1 ? '#6a4636' : '#4a3236'));   // firelit concrete
        quad(P(s, 0, X0, -dep * .55), P(s, 0, X1, -dep * .55), P(s, 0, X1, -dep), P(s, 0, X0, -dep * .85), fc2('#8a4a2a'));
        quad(P(s, 0, X0, top), P(s, 0, X1, top * .4), P(s, 0, X1, top * .4 - 80), P(s, 0, X0, top - 80), fc2(CONC[4])); }
      { const l0 = P(s, 0, -1.8, 20), l1 = P(s, 0, 1.8, 20); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = '#ffb04a'; cx.globalAlpha = a * .8; cx.fillRect(snap(Math.min(l0[0], l1[0])), snap(l0[1]), snap(Math.abs(l1[0] - l0[0])), Math.max(PX, snap(uw * .02))); cx.globalAlpha = a; cx.globalCompositeOperation = 'source-over';
        for(let k = 0; k < 6; k++){ const pt = P(s, 0, -1.6 + k * .64, 0); glow(pt[0], pt[1], uw * .45, '#ffa040', .3 * a); } }
      for(let k = 0; k < 16; k++){ const X = -1.6 + 3.2 * H1(k * 8.3), b = P(s, 0, X, -150), e = P(s, 0, X + (H1(k) - .5) * .2, -700 - H1(k * 1.7) * 1100); pline(b, e, fc2(k % 2 ? '#a0603a' : '#7a4a30'), Math.max(PX, snap(uw * .01))); }
      for(const X of [-1.5, -.8, -.1, .6, 1.3]){ const pt = P(s, 0, X, 0), fk = uw * .55 / 14; flameAt(pt, fk, X, now); glow(pt[0], pt[1] - fk * 6, uw * .45, '#ff6a1a', .35 * a); }
      // a lamp post dangling over the edge by its cable, its head still lit
      { const b = P(s, 0, -1.06, 0), m = P(s, 0, -1.0, -500), e = P(s, 0, -.82, -900); pline(b, m, fc2('#5a6078'), Math.max(PX, snap(uw * .006))); pline(m, e, fc2('#4a5068'), Math.max(PX, snap(uw * .02))); cx.fillStyle = '#fff0c0'; cx.fillRect(snap(e[0] - PX), snap(e[1]), PX * 2, PX * 2); glow(e[0], e[1], uw * .25, '#ffe0a0', .4 * a); }
      // the broken sign gantry: one leg standing, the beam snapped and hanging, the green sign tilted into the gap
      { const l = P(s, .1, 1.2, 0), lt = P(s, .1, 1.2, 1500), br = P(s, .1, .2, 900); pline(l, lt, fc2('#3a3e50'), Math.max(PX, snap(uw * .03))); pline(lt, br, fc2('#3a3e50'), Math.max(PX, snap(uw * .025)));
        quad(P(s, .1, .2, 1000), P(s, .1, .75, 1300), P(s, .1, .8, 900), P(s, .1, .25, 600), fc2('#17784a')); pline(P(s, .1, .2, 1000), P(s, .1, .75, 1300), fc2('#e8e4d8'), PX); }
      // a car stopped short of the edge, hazard lights blinking
      { const c0 = P(s, 1, -.6, 0), cw = Math.max(PX * 3, uw * .32), ch = cw * .45, on = reduce || Math.floor(now / 500) % 2;
        cx.fillStyle = fc2('#1c1a24'); cx.fillRect(snap(c0[0] - cw / 2), snap(c0[1] - ch), snap(cw), snap(ch)); cx.fillStyle = fc2('#2c3044'); cx.fillRect(snap(c0[0] - cw * .35), snap(c0[1] - ch * 1.45), snap(cw * .7), snap(ch * .5));
        cx.fillStyle = on ? '#ffb02a' : '#5a3a10'; const ls = Math.max(PX, snap(cw * .12)); cx.fillRect(snap(c0[0] - cw / 2), snap(c0[1] - ch * .7), ls, ls); cx.fillRect(snap(c0[0] + cw / 2 - ls), snap(c0[1] - ch * .7), ls, ls);
        if(on){ glow(c0[0] - cw / 2, c0[1] - ch * .6, uw * .2, '#ffa02a', .5 * a); glow(c0[0] + cw / 2, c0[1] - ch * .6, uw * .2, '#ffa02a', .5 * a); } } }
    // snapped hangers whipping back from both edges, sparks at their cut ends
    if((o === -1 || o === GAP) && g >= 0){ const f = o < 0 ? 1 : 0;
      for(const X of [-1.22, 1.22]){ const top = P(s, f, X, 3300), ph = Math.exp(-g / 45) * Math.cos(g * .35 + X) * 1.1 + X * .25, L = 2600, endX = X + Math.sin(ph) * L / 2000, endH = 3300 - Math.cos(ph) * L;
        pline(top, P(s, f, endX, endH), fc2('#c8d0e0'), Math.max(PX, snap(uw * .012))); const ep = P(s, f, endX, endH);
        if(g < 200){ cx.fillStyle = '#ffd070'; for(let k = 0; k < 5; k++){ const q = (now / 500 + H1(k * 2.9 + X)) % 1; cx.globalAlpha = a * (1 - q) * Math.min(1, q * 5); cx.fillRect(snap(ep[0] + (H1(k * 4.3) - .5) * uw * .2), snap(ep[1] + q * uw * .5), PX, PX); } cx.globalAlpha = a; } } }
    // the blast at the break: fireball, shockwave ring over the deck and water, debris arcing out
    if(g >= 0 && g < 90){ const tau = g / 45;
      if(o === 0){ const ef = Math.min(4, Math.floor(g / 9)), ek = uw * 3.2 / 40, c0 = P(s, 0, 0, 0); blit(S['ex' + ef], c0[0], c0[1] + ek * 8, ek); const c1 = P(s, 0, 0, 600); glow(c1[0], c1[1], uw * 2.5 * (1 - g / 90), '#ffe0a0', .45); }
      const r = g * 1.4; if(Math.abs(o) < r && Math.abs(o) > r - 6){ const xw = Math.sqrt(Math.max(0, r * r - o * o)) * SEG / ROADW; cx.fillStyle = '#e8f0ff'; cx.globalAlpha = a * (1 - g / 90) * .8;
        for(const sd of [-1, 1]){ const pt = P(s, .5, sd * xw, 0); cx.fillRect(snap(pt[0] - PX * 2), snap(pt[1] - PX), PX * 4, PX); } cx.globalAlpha = a; }
      for(let i = 0; i < CHUNKS.length; i++){ const c = CHUNKS[i], zc = z.B * SEG + c.vz * tau, hc = c.vy * tau - 4200 * tau * tau; if(Math.floor(zc / SEG) !== s.index || hc < -2000) continue;
        const f = (zc % SEG) / SEG, pt = P(s, f, c.x0 + c.vx * tau, hc), spr = S['ch' + ((c.v + Math.floor(tau * 6)) % 3)]; blit(spr, pt[0], pt[1], Math.max(PX, uw * .06 * c.sz)); } }
    cx.globalAlpha = 1; }
  // the blast, the clear-out and the launch (from update)
  function updateBreak(dt, ps){ const z = activeZone(ps); if(!z) return; const g = ps - (z.pk - BLAST_D);
    if(g >= 0 && !z.blown){ z.blown = true;
      for(let j = z.B; j < z.B + GAP + 1; j++) if(segs[j]) segs[j].sprites = [];   // the deck, lamps and hangers over the gap are gone
      for(let j = z.B - 3; j < z.B; j++) if(segs[j]) segs[j].sprites = segs[j].sprites.filter(sp => sp.type !== 'hanger' && sp.type !== 'lamp');
      if(state === 'play' && M.ac){ const t0 = M.ac.currentTime; M.noise(2.8, 90, .26); M.noise(1.2, 700, .14, t0 + .05); M.tone(41, 1.6, { type:'sawtooth', v:.12, fuzz:true }); [1900, 2400, 1700, 2900].forEach((f, k) => M.tone(f, .25, { type:'square', v:.012, at:t0 + .35 + k * .18 })); M.noise(1.4, 500, .1, t0 + 1.4); }
      bump(12); }
    if(z.blown) deform(z, Math.max(0, g));
    // traffic: the bridge empties ahead of the fight (cars far ahead are gone, cars near you floor it and flee); after the blast a car
    // rolling up to the lip goes over and is gone; nothing new spawns into the zone
    cars = cars.filter(c => { const cs = c.z / SEG; if(cs < z.B - 200 || cs > z.B + GAP + FAR + 30) return true; if(cs - ps > 30) return false; if(z.blown && cs >= z.B - 3) return false; c.speed = Math.max(c.speed, MAXS * 1.45); return true; });
    if(!z.blown) return;
    if(state !== 'play') return;
    // the ramp: the blast pushes you up to speed; the lip launches you whatever your line or speed
    if(ps >= z.B - RAMP && ps < z.B && !z.launched){ speed = Math.max(speed, MAXS * .85); }
    if(!z.launched && ps >= z.B){ z.launched = true; const J = MECH.sp_jump, onLand = () => { z.landed = true; if(MECH.arrival && MECH.arrival.callout) MECH.arrival.callout('KAIJU JUMP', { prio:3, col:'#ffe070', size:'s' }); boostTier = 2; boostT = Math.max(boostT, 1.6); speed = Math.max(speed, MAXS * 1.15); flow++; bestFlow = Math.max(bestFlow, flow); if(typeof hud === 'function') hud(); };
      if(J && J.launch && J.launch({ fromSeg:z.B, landSeg:z.B + GAP, peakH:PEAK, startH:HR + DEEP, landH:DEEP - LOW, slowmo:false, onLand })){ z.helper = true; M.tone(220, .5, { type:'triangle', v:.04 }); }
      else { z.own = { lip:z.B, len:GAP }; } }
    // fallback flight if the jump helper is missing: an AIR.h arc (traffic can't touch you while AIR.h >= 6) and the same landing
    if(z.own){ const u = clamp((ps - z.own.lip) / z.own.len, 0, 1); AIR.h = (lerp(HR, 0, u) + 4 * PEAK * u * (1 - u)) * H / 12000; speed = Math.max(speed, MAXS * .8);
      if(u >= 1){ z.own = null; AIR.h = 0; z.landed = true; if(MECH.arrival && MECH.arrival.callout) MECH.arrival.callout('KAIJU JUMP', { prio:3, col:'#ffe070', size:'s' }); bump(10); if(M.ac){ M.noise(.5, 160, .22); M.tone(55, .45, { v:.12 }); } boostTier = 2; boostT = Math.max(boostT, 1.6); speed = Math.max(speed, MAXS * 1.15); } } }

  // At the top of the kaiju jump: the jump artist's look-down. The engine can't pitch the camera, so the frame is lifted and the band it
  // uncovers at the bottom is the view straight down: the bay, the fallen section in its foam ring, fires reflected, debris dropping past.
  let dbuf = null;   // made in warm()
  function lookDown(now, u){ const SB = Math.round(H * (reduce ? .16 : .3) * Math.pow(Math.sin(Math.PI * u), .8) / PX) * PX; if(SB < PX * 2) return;
    if(dbuf.width !== cv.width || dbuf.height !== cv.height){ dbuf.width = cv.width; dbuf.height = cv.height; }   // only on a window resize
    const b = dbuf.getContext('2d'); b.clearRect(0, 0, dbuf.width, dbuf.height); b.drawImage(cv, 0, 0);
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.imageSmoothingEnabled = false; cx.drawImage(dbuf, 0, -SB / PX); cx.restore();
    const y0 = H - SB, t = now / 1000, sp = reduce ? .25 : 1;
    cx.save(); cx.beginPath(); cx.rect(0, y0, W, SB); cx.clip();
    ['#0e1838', '#14204a', '#1a2a58', '#203464'].forEach((c, k) => { cx.fillStyle = c; cx.fillRect(0, snap(y0 + SB * k / 4), W, snap(SB / 4) + PX); });
    // the water lit by the fires: wide orange swells, then firelight and beam glow streaking past
    cx.globalCompositeOperation = 'lighter';
    for(let k = 0; k < 7; k++){ const yy = snap(y0 + ((k / 7 + t * .35 * sp) % 1) * SB), w = W * (.3 + H1(k) * .5), x = H1(k * 3.7) * W - w / 2; cx.fillStyle = k % 2 ? '#5a2408' : '#6a3010'; cx.globalAlpha = .55; cx.fillRect(snap(x), yy, snap(w), PX * 2); }
    for(let k = 0; k < 30; k++){ const x = snap(H1(k * 7.3) * W), ph = (t * 1.2 * sp + H1(k * 3.1)) % 1, len = SB * .16, y = snap(y0 - len + ph * (SB + len)); cx.fillStyle = ['#ff7a2a', '#ffb04a', '#ff4a6a', '#ffd890'][k % 4]; cx.globalAlpha = .7; cx.fillRect(x, y, PX * 2, snap(len * (.4 + H1(k) * .6))); }
    glow(W * .3, y0 + SB * .6, SB * .9, '#ff6a1a', .35); glow(W * .72, y0 + SB * .45, SB * .7, '#ff8a3a', .3);
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
    // the fallen deck right under you: a big tilted slab with its lane paint, rails and a crushed lamp, rebar at the torn ends, in a churning foam ring
    const sx = W / 2 + (u - .5) * W * .12, sy = y0 + SB * (.3 + u * .45), sw = W * .62, sh = SB * .62;
    for(let ring = 0; ring < 3; ring++){ cx.fillStyle = ['#e8f2fa', '#b8c8dc', '#8aa0c0'][ring]; for(let k = 0; k < 44; k++){ const an = k / 44 * 6.283, r = 1.04 + ring * .1 + .06 * Math.sin(k * 2.3 + t * 2 * sp + ring), ph = (t * .8 * sp + H1(k + ring * 9)) % 1; cx.globalAlpha = (.6 - ring * .15) * (.5 + .5 * (1 - ph)); cx.fillRect(snap(sx + Math.cos(an) * sw * .5 * r), snap(sy + Math.sin(an) * sh * .5 * r), PX * (k % 3 ? 1 : 2), PX); } }
    cx.globalAlpha = 1;
    const A = [sx - sw * .5, sy - sh * .28], Bq = [sx + sw * .46, sy - sh * .5], C = [sx + sw * .5, sy + sh * .3], D = [sx - sw * .45, sy + sh * .5], L = (p, q, t2) => [lerp(p[0], q[0], t2), lerp(p[1], q[1], t2)];
    quad([A[0] + PX * 3, A[1] + PX * 4], [Bq[0] + PX * 3, Bq[1] + PX * 4], [C[0] + PX * 3, C[1] + PX * 4], [D[0] + PX * 3, D[1] + PX * 4], '#0a0e1c');
    quad(A, Bq, C, D, '#2a2e3c'); quad(A, Bq, L(Bq, C, .5), L(A, D, .5), '#34384a');
    quad(A, Bq, L(Bq, C, .06), L(A, D, .06), CONC[4]); quad(D, C, L(C, Bq, .06), L(D, A, .06), CONC[1]);
    for(const f of [.3, .7]){ for(let k = 0; k < 6; k++){ const t0 = k / 6 + .03, t1 = t0 + .09; quad(L(L(A, Bq, f), L(D, C, f), t0), L([L(A, Bq, f)[0] + PX * 2, L(A, Bq, f)[1]], [L(D, C, f)[0] + PX * 2, L(D, C, f)[1]], t0), L([L(A, Bq, f)[0] + PX * 2, L(A, Bq, f)[1]], [L(D, C, f)[0] + PX * 2, L(D, C, f)[1]], t1), L(L(A, Bq, f), L(D, C, f), t1), '#d8d0b8'); } }
    pline(L(A, D, .02), L(Bq, C, .02), '#8a92a8', PX); pline(L(A, D, .98), L(Bq, C, .98), '#8a92a8', PX);
    for(let k = 0; k < 7; k++){ const e = L(A, D, (k + .5) / 7); pline(e, [e[0] - PX * (3 + k % 3) * 2, e[1] + PX * (k % 2 ? 2 : -2)], '#a0603a', PX); const e2 = L(Bq, C, (k + .5) / 7); pline(e2, [e2[0] + PX * (3 + k % 2) * 2, e2[1] - PX], '#a0603a', PX); }
    { const lb = L(L(A, Bq, .85), L(D, C, .85), .5); pline(lb, [lb[0] - sw * .12, lb[1] + sh * .2], '#4a5068', PX * 2); cx.fillStyle = '#e8e0c0'; cx.fillRect(snap(lb[0] - sw * .12 - PX), snap(lb[1] + sh * .2 - PX), PX * 3, PX * 2); }
    for(const fx of [-.4, .1, .36]){ const fk = Math.max(PX, snap(SB / 50)), fp = [sx + sw * fx, sy - sh * (.12 + fx * .2)]; flameAt(fp, fk, fx, now); glow(fp[0], fp[1] - fk * 6, SB * .3, '#ff6a1a', .4); }
    // concrete and rebar falling past you, motion-streaked
    for(let k = 0; k < 12; k++){ const ph = (t * .9 * sp + H1(k * 4.4)) % 1, x = H1(k * 2.7) * W, y = y0 + ph * SB, spr = S['ch' + k % 3], kk = PX * (2 + k % 3); cx.globalAlpha = Math.min(1, ph * 4) * .35; cx.fillStyle = '#8a92a8'; cx.fillRect(snap(x - PX / 2), snap(y - spr.height * kk - SB * .12), PX, snap(SB * .12)); cx.globalAlpha = Math.min(1, ph * 4); blit(spr, x, y, kk);
      if(k % 3 === 0){ cx.globalAlpha = Math.min(1, ph * 4); pline([x + PX * 6, y - SB * .2], [x + PX * 9, y - SB * .2 + PX * 10], '#a0603a', PX); } }
    cx.globalAlpha = 1;
    // a dithered fog seam softening the top edge of the band
    cx.fillStyle = '#0a1024'; for(let r = 0; r < 4; r++){ const yy = y0 + r * PX; for(let x = (r % 2) * PX; x < W; x += PX * (r + 2)) cx.fillRect(x, yy, PX, PX); }
    cx.globalAlpha = 1; cx.restore(); }
  // the landing card in the arrival-card manner: a dark plate, a hot rule, the name in DotGothic, sliding in and out in hard steps
  function drawCard(){ if(cardT <= 0) return; const t = 2.8 - cardT, a = reduce ? Math.min(1, Math.floor(Math.min(t, cardT) * 8) / 4) : 1, slide = reduce ? 0 : snap(Math.pow(1 - Math.min(1, t * 4), 2) * W * .4) - (cardT < .3 ? snap((.3 - cardT) / .3 * W * .5) : 0);
    const l1 = label('KAIJU JUMP', '#ffe070'), l2 = label('怪獣ジャンプ', '#ffffff'), k = PX * 2, w = Math.max(l1.width, l2.width) * k + PX * 16, h = (l1.height + l2.height) * k + PX * 10, x = clamp(snap(W / 2 - w / 2 + slide), PX * 4, W - w - PX * 6), y = snap(H * .2);
    cx.globalAlpha = a; cx.fillStyle = '#05040a'; cx.fillRect(x + PX * 2, y + PX * 2, w, h); cx.fillStyle = '#16101e'; cx.fillRect(x, y, w, h); cx.fillStyle = '#ff6a2a'; cx.fillRect(x, y, w, PX * 2); cx.fillStyle = '#ffd04a'; cx.fillRect(x, y + h - PX * 2, w, PX * 2); cx.fillRect(x, y, PX * 2, h);
    cx.imageSmoothingEnabled = false; cx.drawImage(l2, snap(x + (w - l2.width * k) / 2), y + PX * 4, l2.width * k, l2.height * k); cx.drawImage(l1, snap(x + (w - l1.width * k) / 2), y + PX * 5 + l2.height * k, l1.width * k, l1.height * k); cx.globalAlpha = 1; }

  // ---------------------------------------------------------------- sounds
  const ac = () => M.ac && state === 'play';
  function roar(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(1.5, 420, .16 * v, t0); M.tone(98, 1.2, { type:'sawtooth', v:.08 * v, fuzz:true, at:t0 });
    M.tone(87, 1.1, { type:'sawtooth', v:.07 * v, fuzz:true, at:t0 + .28 }); M.tone(69, 1.3, { type:'sawtooth', v:.07 * v, fuzz:true, at:t0 + .55 }); M.tone(740, .5, { type:'square', v:.01 * v, at:t0 + .05 }); M.tone(622, .7, { type:'square', v:.01 * v, at:t0 + .3 }); }
  function shriek(v){ if(!ac()) return; const t0 = M.ac.currentTime; [1320, 1180, 990, 1240].forEach((f, i) => M.tone(f, .16, { type:'square', v:.014 * v, at:t0 + i * .07 })); M.noise(.5, 3200, .05 * v, t0); }
  function thud(v){ if(!ac()) return; M.noise(.6, 220, .14 * v); M.tone(52, .5, { v:.12 * v }); M.noise(.7, 900, .05 * v, M.ac.currentTime + .15); }
  function bump(v){ if(!reduce && state !== 'ready') shake = Math.max(shake, v); }

  // ---------------------------------------------------------------- 報道ヘリ the helicopters (round 7: drawn at their own depth, redrawn)
  /* News and police helicopters at night, after AS350 / Bell 412 photographs (silhouettes only; original liveries): a bubble cabin with
     its lit windows forward, the engine cowling and mast above, a tapering boom to a swept fin, skids on struts. The main rotor is a disc
     blur (a dithered line with two blade glints), tilted into the turn; the tail rotor a small dithered disc. Nav lights: the side light
     facing you (green starboard, red port), a red beacon on top and a white tail strobe (steady under reduced motion). Each carries a
     searchlight: a stepped, dithered cone (two densities), dust drifting in it, a pool where it lands on the titan's hide. Drawn in the
     road segment they hover over (drawSeg), so the bridge's nearer towers, cables and gantries pass in front of them. Near and mid sprites
     drawn as pixel grids; far away a dark dot and its beacon. */
  const HELI_NEAR = [
    '.RRRR..................................h..h.....................',
    '.MMMM................................hhhhhhhh...................',
    '.MMMMR..................................mm......................',
    '.MMMML..................................mm......................',
    '.DMMMM..................................mm......................',
    '.BMMMM............................RRRRRRRRRRRRRR................',
    '..MMMMR..........................RLLLLLLLLLLLLLLR...............',
    '..MMMMLK.......................EEEMMDMDMDMDMDMMMLRRRRK..........',
    '..MMMMMK.......................EEEMMMMMMMMMMMMMMMLRRGGGGGGK.....',
    '..MMMMMRK......................MMMMMMMMMMDGGGMGGGMGKGGGGGGGGK...',
    '..DDMMMLK.....................RMMMMMMMMMMDgGGMgGGMGKGGGGGKGgggK.',
    '..BBMMDDRRRRRRRRRRRRRRRRRRRRRRLMMMMMMMMMMDgYGMgyGMGKGGGGGKggGGK.',
    '..KKMMBBLLLLLLLLLDLLLLLLLLLLLLMMMMMMMMMMMDgGGMgGGMGKGGGGGKgGGGGK',
    '...RMMKKKDMDDDDDDDBBBBBBDDDDDMMMMMMMMMMMMDMMMMMMMMGKGGYYgKGGGGGK',
    '...LMDK..DMDDDDDDDKKKKKKBBBBBMWWWWWWWWWWWDWWWWWWWWGKGGgYgKGGGGGK',
    '...DDBK..KDKKKKKKDK.....KKKKKDwwwwwwwwwwwDwwwwwwwwGKGggGGKGGGGGK',
    '...BBK....BK.....DK..........BSSSSSSSSSSSDSSSSSSKSGKggGGGKGGGGGK',
    '...KK.....K......K...........KDDMMMMMMMMMDMMMMMMMMgggGGGGGGGGGBK',
    '..............................BBDDMMMMMMMDMMMMMMMMMMMMMMMMMMDDK.',
    '..............................KKBBDDDMMMMDDDDDDDDDMMMMMMMMDDBBK.',
    '................................KKBBBDDDDDDDDDDDDDDDDDDDDDBBKK..',
    '..................................KKKkBBBBBBBBBBBBBBBkBBBBKK....',
    '..................................k..kKKKKKKKKKKKKkKKkKKKK...k..',
    '..................................k.k.............k.k.......k...',
    '...............................kkkkkkkkkkkkkkkkkkkkkkkkkkkkk....',
    '....................................s...............s..........s',
    '...................................s...............s..........s.',
    '.................................sssssssssssssssssssssssssssss..',
    '.................................kkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '................................................................'];   /* AS350-type, drawn from the Commons photos (D-HTAA side view, VH-UAZ from below): bubble windscreen with its frames and reflection, cowling hump and mast, tapering boom, swept fin and ventral fin, stabiliser, door, two skids on curved cross tubes, the belly warm from the city */
  const HELI_MID = [
    'RRR................hhh..........',
    'MMR.................m...........',
    'DMM..............RRRRRRR........',
    '.MMR............RLDDDDDLRRR.....',
    '.MMR...........EEMMMDGGGGRGGGG..',
    '.DMDRRRRRRRRRRRRMMMMDYGgGGGGGggK',
    '.RMKKDDDDLLLDDDMMMMMDgGgGGGYggGG',
    '.DDKKKKKKKKKKKKWWWWWWWWWWGgYgGGG',
    '.KK..K..K.....KSSSSSSSSSSggGGGGG',
    '...............KDDDMDDDDDMMMMDDK',
    '................KKkDDDDDDDkDDKK.',
    '.................kkKKKKKKkkKK.k.',
    '................kkskkkkkkkskkk..',
    '.................ssssssssssssss.',
    '.................kkkkkkkkkkkkkk.'];   /* (a 2x reduction that keeps glass, lights, livery and outline) */
  const HELI_PAL = [
    { K:'#06070d', D:'#141c34', M:'#22325a', L:'#365088', R:'#8aa8e0', W:'#e2e6f0', w:'#8e96b0', S:'#c8303a', G:'#060a16', g:'#6a8ac4', Y:'#ffd890', y:'#b07838', B:'#4a2a44', E:'#1a1a22', k:'#20222e', s:'#8a92a8', m:'#3a3e4e', h:'#7a8098' },   /* police: navy, white band, red stripe */
    { K:'#0a0604', D:'#2c1a10', M:'#4a2c16', L:'#704622', R:'#dcae6c', W:'#f0c838', w:'#9a7a1c', S:'#22222a', G:'#0a0806', g:'#8a7a5a', Y:'#ffe0a0', y:'#a07040', B:'#5a2a22', E:'#1e1a16', k:'#221c16', s:'#8a8270', m:'#3e3428', h:'#8a7a60' } ];   /* news: brown, yellow band */
  const HE = Array.from({ length:3 }, () => ({ on:false, T:null, x:0, y:0, z:0, tx:0, ty:0, tz:0, seg:-1, face:1, bank:0, liv:0 }));
  function heliFrame(now, d){ const on = TS.built && d < KJ_FROM - 20;
    for(let i = 0; i < 3; i++){ const h = HE[i]; h.on = on; if(!on) continue; const T = i < 2 ? TT.s : TT.f, an = now / (reduce ? 5200 : 2600) + i * 2.1, hx = i < 2 ? 18 : -30, hy = i < 2 ? 128 : 72;
      h.T = T; h.x = hx + Math.cos(an) * 34; h.y = hy + 18 + i * 4 + Math.sin(an * 1.3) * 4; h.z = -30 + Math.sin(an) * 20; h.tx = hx + Math.sin(an * .7) * 10; h.ty = hy - 12 + Math.cos(an * .9) * 8; h.tz = -12;
      h.face = -Math.sin(an) >= 0 ? 1 : -1; h.bank = h.face * .14; h.liv = i === 1 ? 1 : 0; h.w = false; h.seg = Math.floor((T.Z0 + h.z * V) / SEG); h.bseg = Math.floor((T.Z0 + h.tz * V) / SEG);
      if(i === 2 && HP.seg > 0 && d <= HP.d0 && d > HP.d0 - HP_LEN){ const u = (HP.d0 - d) / HP_LEN, e = u * u * (3 - 2 * u);   /* the pass: low across the bridge from the right, just beyond a tower */
        h.w = true; h.x = lerp(6500, -6500, e); h.y = 2200 - Math.sin(u * Math.PI) * 500; h.z = HP.seg * SEG + SEG * 2.5; h.tx = h.x * .7 + Math.sin(u * 5) * 900; h.ty = 0; h.tz = h.z - 350;   /* the beam sweeps the deck just short of the tower */ h.face = -1; h.bank = -.2; h.liv = 1; h.seg = Math.floor(h.z / SEG); h.bseg = Math.floor(h.tz / SEG); } } }
  const HP = { t:-1, seg:-1, d0:0 }, HP_LEN = 160;   /* the pass crosses while the rider closes from ~95 to ~25 segments short of the tower */
  function heliPassSeg(t){ if(HP.t === t) return; HP.t = t; HP.seg = -1; for(let j = t - 420; j < t - 260; j++){ const q = segs[j]; if(q && q.sprites && q.sprites.some(sp => sp.type === 'tower')){ HP.seg = j; HP.d0 = t - j + 130; break; } } }
  let PAT = null, PATpx = 0;
  function pats(){ if(PAT && PATpx === PX) return PAT; PATpx = PX; const mk = th => { const c = document.createElement('canvas'), n = PX * 4; c.width = n; c.height = n; const k = c.getContext('2d'); k.fillStyle = '#fff'; for(let y = 0; y < 4; y++) for(let x = 0; x < 4; x++) if(B4[y * 4 + x] < th) k.fillRect(x * PX, y * PX, PX, PX); return cx.createPattern(c, 'repeat'); };
    return PAT = [mk(.25), mk(.5)]; }
  function wPt(x, y, z){ const pr = proj(z); if(!pr) return null; const k = pr.sc * W / 2; OUT[0] = pr.x + x * k; OUT[1] = pr.y - y * k; return OUT; }
  function drawHeli(h, now, al, part = 3){ const T = h.T; let q = h.w ? wPt(h.x, h.y, h.z) : tsPt(T, h.x, h.y, h.z); if(!q) return; const hx0 = q[0], hy0 = q[1], kq = V * PR.sc * W / 2, cr = cv.width / W;
    q = h.w ? wPt(h.tx, h.ty, h.tz) : tsPt(T, h.tx, h.ty, h.tz); if(!q) return; const tx = q[0], ty = q[1];
    // the searchlight: a stepped, dithered cone in two densities, dust drifting in it, a pool on the hide
    const pr = Math.max(PX * 2, 9 * kq), P2 = pats(); if(part & 1){ cx.save(); cx.globalCompositeOperation = 'lighter';
    for(const [wf, pi, col, a] of [[1, 0, '#6a84b8', .5], [.5, 1, '#b8d0f4', .45]]){ cx.globalAlpha = a * al; cx.fillStyle = col; cx.beginPath(); cx.moveTo(hx0, hy0 + PX); cx.lineTo(tx - pr * wf, ty); cx.lineTo(tx + pr * wf, ty); cx.closePath(); cx.globalAlpha = a * al * .35; cx.fill(); cx.globalAlpha = a * al; cx.fillStyle = P2[pi]; cx.beginPath(); cx.moveTo(hx0, hy0 + PX); cx.lineTo(tx - pr * wf, ty); cx.lineTo(tx + pr * wf, ty); cx.closePath(); cx.fill(); }
    cx.restore(); cx.globalAlpha = al; cx.fillStyle = '#e8f2ff';
    for(let k = 0; k < 7; k++){ const t = (now / 1900 + H1(k * 3.7)) % 1, w = (H1(k * 5.3) - .5) * pr * 1.4 * t; cx.globalAlpha = al * .7 * Math.sin(t * Math.PI); cx.fillRect(snap(lerp(hx0, tx, t) + w), snap(lerp(hy0, ty, t)), PX, PX); }
    cx.globalAlpha = al; glow(tx, ty, pr * 1.3, '#cfe2ff', .32 * al); glow(tx, ty, pr * .55, '#ffffff', .22 * al); }
    if(!(part & 2)) return;
    // the body: near and mid pixel grids at whole canvas-pixel scales; far, a dot and its beacon
    const spN = S['heliN' + h.liv], spM = S['heliM' + h.liv], kN = kq * 30 / 64 * cr, kM = kq * 30 / 32 * cr, on = reduce || Math.floor(now / 500) % 2, strobe = !reduce && (now % 1500 < 60 || (now % 1500 > 160 && now % 1500 < 220));
    let spr = null, kc = 0; if(kN >= .9){ spr = spN; kc = Math.round(kN); } else if(kM >= .9){ spr = spM; kc = Math.round(kM); }
    if(!spr){ cx.fillStyle = '#0a0b12'; cx.fillRect(snap(hx0 - PX), snap(hy0 - PX), PX * 2, PX); if(on){ cx.fillStyle = '#ff2a3a'; cx.fillRect(snap(hx0), snap(hy0 - PX * 2), PX, PX); } return; }
    const ks = kc / cr, sw = spr.width * ks, sh = spr.height * ks, x0 = Math.round((hx0 - sw / 2) * cr) / cr, y0 = Math.round((hy0 - sh) * cr) / cr, F = h.face;
    cx.save(); cx.imageSmoothingEnabled = false; if(F < 0){ cx.translate(x0 * 2 + sw, 0); cx.scale(-1, 1); } cx.drawImage(spr, x0, y0, sw, sh); cx.restore();
    const X = u => F > 0 ? x0 + u * ks : x0 + sw - (u + 1) * ks;   // sprite column u to screen x (flipped when it faces left)
    // the main rotor: a dithered disc seen edge-on, tilted into the turn, two blade glints sweeping it
    const mast = spr === spN ? 40.5 : 20.5, mx = X(mast) + ks / 2, my = y0 + ks * .5, Lr = sw * .62, n = Math.max(4, Math.round(Lr * 2 / (ks || 1)));
    cx.fillStyle = '#6a7290'; for(let k = 0; k <= n; k++){ if(k % 2) continue; const u = k / n * 2 - 1; cx.fillRect(Math.round((mx + u * Lr) * cr) / cr, Math.round((my + u * Lr * h.bank * F) * cr) / cr, ks, ks); }
    if(!reduce) for(let j = 0; j < 2; j++){ const u = Math.sin(now / 37 + j * Math.PI); cx.fillStyle = '#e8ecf6'; cx.fillRect(Math.round((mx + u * Lr) * cr) / cr, Math.round((my + u * Lr * h.bank * F) * cr) / cr, ks * 2, ks); }
    // the tail rotor: a small dithered disc at the fin
    { const tx0 = X(3) + ks / 2, ty0 = y0 + ks * (spr === spN ? 4 : 2); cx.fillStyle = '#3a3e4e'; for(let k = 0; k < 8; k++){ if(k % 2) continue; const a = k / 8 * 6.283; cx.fillRect(Math.round((tx0 + Math.cos(a) * ks * 2) * cr) / cr, Math.round((ty0 + Math.sin(a) * ks * 2) * cr) / cr, ks, ks); }
      if(!reduce){ const a = now / 25; cx.fillStyle = '#c8ccd8'; cx.fillRect(Math.round((tx0 + Math.cos(a) * ks * 2) * cr) / cr, Math.round((ty0 + Math.sin(a) * ks * 2) * cr) / cr, ks, ks); } }
    // nav lights: the side light facing you, the red beacon on the cowling, the white tail strobe
    const side = F > 0 ? '#5aff8a' : '#ff3a3a', cab = spr === spN ? 33 : 16, cy0 = y0 + ks * (spr === spN ? 7 : 3); cx.fillStyle = side; cx.fillRect(X(cab), cy0, ks, ks); glow(X(cab) + ks / 2, cy0, ks * 3, side, .35 * al);
    if(on){ cx.fillStyle = '#ff2a3a'; cx.fillRect(X(spr === spN ? 37 : 18), y0 + ks * (spr === spN ? 5 : 2), ks, ks); glow(mx, y0 + ks * 1.5, ks * 4, '#ff2a3a', .45 * al); }
    if(strobe){ cx.fillStyle = '#ffffff'; cx.fillRect(X(2), y0, ks, ks); glow(X(2) + ks / 2, y0, ks * 6, '#ffffff', .5 * al); } }

  // ---------------------------------------------------------------- the bridge debris as 3D pixel art (round 7)
  /* Broken deck pieces as projected solids, rasterised per pixel into a scratch buffer made in warm (the rockslide's method): concrete
     slabs with the asphalt layer on top and a stripe of worn lane paint, a fresh pale break face with grit, a dark crack along every edge
     between faces broken by lit chips, a moonlit rim on the top silhouette and a 1 px dark outline. Rebar stubs, a twisted railing, a
     sheared lamp post and a cable end are projected 3D strokes. The hazard (its lane, telegraph, timing and hit test) is unchanged. */
  const DPALH = ['#0e0e14', '#18181f', '#24242e', '#363644', '#5e6074',   // 0-4 asphalt (cool)
    '#1c1820', '#36302f', '#56504a', '#7e786c', '#b4ae9e',   // 5-9 deck concrete (warm grey, purple shadow)
    '#3a3430', '#5e5650', '#8a8274', '#b8b0a0', '#dcd6c8',   // 10-14 fresh break
    '#4a4632', '#8a8462', '#d0c89c', '#07060a'];   // 15-17 lane paint, 18 outline
  function mkPiece(seed, w, h, d, cut){ let sd = seed * 7919 + 13; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647, j = s2 => (R() - .5) * s2;
    const V = new Float64Array(24), P = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    P.forEach((p, i) => { V[i * 3] = p[0] * w / 2 + j(w * .12) * (cut && p[0] > 0 ? 2.4 : 1); V[i * 3 + 1] = p[1] * h / 2 + j(h * .18); V[i * 3 + 2] = p[2] * d / 2 + j(d * .12); });
    const Q = [[3, 2, 6, 7, 0], [0, 4, 5, 1, 1], [0, 3, 7, 4, 1], [1, 5, 6, 2, cut ? 2 : 1], [0, 1, 2, 3, 1], [4, 7, 6, 5, 1]], F = [];   // top (asphalt), bottom, -x, +x (the break), -z, +z
    Q.forEach((q, pid) => { for(const t of [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]){ const a = t[0] * 3, b = t[1] * 3, c = t[2] * 3, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; F.push([t[0], t[1], t[2], q[4], nx / L, ny / L, nz / L, pid + 1]); } });
    return { V, F, w, h, d }; }
  const dh3 = (x, y, z) => { let h = Math.imul(Math.floor(x), 374761393) ^ Math.imul(Math.floor(y), 668265263) ^ Math.imul(Math.floor(z), 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let DRC = null, DRG = null, DRI = null; const DRW = 384, DFID = new Uint8Array(DRW * DRW), DOX = new Float32Array(DRW * DRW), DOY = new Float32Array(DRW * DRW), DOZ = new Float32Array(DRW * DRW);
  const DVX = new Float64Array(8), DVY = new Float64Array(8), DVZ = new Float64Array(8), DTZ = new Float64Array(12), DTO = new Int8Array(12), DFM = new Uint8Array(16), DFT = new Uint8Array(16), DFP = new Uint8Array(16), DPT = new Map(); let dKey = '';
  function dPal(fog){ if(FOG_COL !== dKey){ dKey = FOG_COL; DPT.clear(); } const q = Math.round(clamp(fog, 0, 1) * 16); let t = DPT.get(q); if(!t){ t = new Uint8Array(DPALH.length * 3); DPALH.forEach((c, i) => { const v = hx(mixc(c, FOG_COL || '#101020', q / 16 * .8)); t[i * 3] = v[0]; t[i * 3 + 1] = v[1]; t[i * 3 + 2] = v[2]; }); DPT.set(q, t); } return t; }
  // one piece at (ox, oy, oz) world units from the pile's anchor (X0, Y0 on screen, pw px per half-road width, cz its depth), turned by ax/ay/az
  function piece(m, X0, Y0, pw, cz, ox, oy, oz, ax, ay, az, fog, al){ if(!DRI) return;
    const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), s3 = Math.sin(az);
    const r00 = cc * cb - s3 * sa * sb, r01 = -s3 * ca, r02 = cc * sb + s3 * sa * cb, r10 = s3 * cb + cc * sa * sb, r11 = cc * ca, r12 = s3 * sb - cc * sa * cb, r20 = -ca * sb, r21 = sa, r22 = ca * cb;
    const V = m.V, PY0 = H / 2 - PITCH, cr = cv.width / W, kw = pw / ROADW; let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    for(let v = 0; v < 8; v++){ const x = V[v * 3], y = V[v * 3 + 1], z = V[v * 3 + 2], wx = ox + r00 * x + r01 * y + r02 * z, wy = oy + r10 * x + r11 * y + r12 * z, wz = oz + r20 * x + r21 * y + r22 * z;
      const f = cz / Math.max(60, cz + wz), X = (W / 2 + (X0 + wx * kw - W / 2) * f) * cr, Y = (PY0 + (Y0 - wy * kw - PY0) * f) * cr; DVX[v] = X; DVY[v] = Y; DVZ[v] = wz; if(X < mnx) mnx = X; if(X > mxx) mxx = X; if(Y < mny) mny = Y; if(Y > mxy) mxy = Y; }
    const cw = cv.width, chh = cv.height, x0 = Math.max(0, Math.floor(mnx) - 1), y0 = Math.max(0, Math.floor(mny) - 2), x1 = Math.min(cw, Math.ceil(mxx) + 2), y1 = Math.min(chh, Math.ceil(mxy) + 2), w = x1 - x0, h = y1 - y0;
    if(w <= 0 || h <= 0 || w > DRW || h > DRW) return; for(let y = 0; y < h; y++) DFID.fill(255, y * DRW, y * DRW + w);
    const F = m.F, sdm = MOON.x > X0 ? 1 : -1; let nv = 0;
    for(let k = 0; k < F.length; k++){ DTZ[k] = DVZ[F[k][0]] + DVZ[F[k][1]] + DVZ[F[k][2]]; DTO[k] = k; }
    for(let k = 1; k < F.length; k++){ const v = DTO[k]; let j = k - 1; while(j >= 0 && DTZ[DTO[j]] < DTZ[v]){ DTO[j + 1] = DTO[j]; j--; } DTO[j + 1] = v; }   /* far first: a convex piece needs no culling */
    for(let kk = 0; kk < F.length; kk++){ const k = DTO[kk], f = F[k], a = f[0], b = f[1], c = f[2], ax2 = DVX[a] - x0, ay2 = DVY[a] - y0, bx = DVX[b] - x0, by = DVY[b] - y0, cx2 = DVX[c] - x0, cy2 = DVY[c] - y0;
      const det = (bx - ax2) * (cy2 - ay2) - (by - ay2) * (cx2 - ax2); if(Math.abs(det) < 1e-6) continue;
      const nx = -(r00 * f[4] + r01 * f[5] + r02 * f[6]), ny = -(r10 * f[4] + r11 * f[5] + r12 * f[6]), nz = -(r20 * f[4] + r21 * f[5] + r22 * f[6]), key = .58 * ny + .42 * nx * sdm - .15 * nz, id = nv++;
      DFM[id] = f[3]; DFT[id] = key > .7 ? 4 : key > .4 ? 3 : key > .12 ? 2 : key > -.15 ? 1 : 0; DFP[id] = f[7];
      const px0 = Math.max(0, Math.floor(Math.min(ax2, bx, cx2))), px1 = Math.min(w - 1, Math.ceil(Math.max(ax2, bx, cx2))), py0 = Math.max(0, Math.floor(Math.min(ay2, by, cy2))), py1 = Math.min(h - 1, Math.ceil(Math.max(ay2, by, cy2))), id2 = 1 / det, Va = a * 3, Vb = b * 3, Vc = c * 3;
      for(let py = py0; py <= py1; py++){ const yc = py + .5; for(let px = px0; px <= px1; px++){ const xc = px + .5, l2 = ((xc - ax2) * (cy2 - ay2) - (yc - ay2) * (cx2 - ax2)) * id2, l3 = ((bx - ax2) * (yc - ay2) - (by - ay2) * (xc - ax2)) * id2, l1 = 1 - l2 - l3;
        if(l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue; const i = py * DRW + px; DFID[i] = id; DOX[i] = l1 * V[Va] + l2 * V[Vb] + l3 * V[Vc]; DOY[i] = l1 * V[Va + 1] + l2 * V[Vb + 1] + l3 * V[Vc + 1]; DOZ[i] = l1 * V[Va + 2] + l2 * V[Vb + 2] + l3 * V[Vc + 2]; } } }
    const T = dPal(fog), dd = DRI.data, big = w > 18;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * DRW + x, o = i * 4, k = DFID[i]; let ci = -1;
      if(k === 255){ if((x > 0 && DFID[i - 1] !== 255) || (x + 1 < w && DFID[i + 1] !== 255) || (y > 0 && DFID[i - DRW] !== 255) || (y + 1 < h && DFID[i + DRW] !== 255)) ci = 18; }   // the 1 px outline
      else { const mt = DFM[k], t = DFT[k], oxp = DOX[i], oyp = DOY[i], ozp = DOZ[i], ku = y > 0 ? DFID[i - DRW] : 255, kr = x + 1 < w ? DFID[i + 1] : 255, kd = y + 1 < h ? DFID[i + DRW] : 255;
        let base = mt === 0 ? 0 : mt === 2 ? 10 : 5;
        if(mt === 1 && oyp > m.h * .32) base = 0;   // the asphalt layer showing on the sides, over the concrete
        ci = base + t;
        if(mt === 0 && big && Math.abs(oxp - m.w * .12) < m.w * .045 && dh3(oxp * .02, ozp * .02, 1) < .8) ci = 15 + Math.min(2, Math.max(0, t - 1));   // worn lane paint
        if(ku === 255 && t >= 1) ci = base + 4;   // the moonlit rim on the top silhouette
        else if((kr !== 255 && DFP[kr] !== DFP[k]) || (kd !== 255 && DFP[kd] !== DFP[k])){ const ot = kd !== 255 && DFP[kd] !== DFP[k] ? kd : kr; ci = DFT[k] > DFT[ot] && dh3(oxp * .03, oyp * .03, ozp * .03) < .4 ? base + Math.min(4, t + 1) : base + Math.max(0, t - 2); }   // crack and lit chips
        else if(mt === 2 && big){ const g = dh3(Math.floor(oxp * .025), Math.floor(oyp * .025), Math.floor(ozp * .025)); if(g > .9) ci = base + Math.max(0, t - 1); }   // grit clusters on the break
        else if(big && dh3(Math.floor(oxp * .012), Math.floor(oyp * .012), Math.floor(ozp * .012)) > .93) ci = base + Math.max(0, t - 1); }   // a few spalls
      if(ci < 0){ dd[o + 3] = 0; continue; } dd[o] = T[ci * 3]; dd[o + 1] = T[ci * 3 + 1]; dd[o + 2] = T[ci * 3 + 2]; dd[o + 3] = 255; }
    DRG.putImageData(DRI, 0, 0, 0, 0, w, h); cx.globalAlpha = al; cx.imageSmoothingEnabled = false; cx.drawImage(DRC, 0, 0, w, h, x0 / cr, y0 / cr, w / cr, h / cr); }
  // a projected 3D stroke (rebar, railing, lamp post, cable): points in world units from the anchor
  const SP = [0, 0];
  function spt(X0, Y0, pw, cz, x, y, z){ const f = cz / Math.max(60, cz + z), kw = pw / ROADW, PY0 = H / 2 - PITCH; SP[0] = W / 2 + (X0 + x * kw - W / 2) * f; SP[1] = PY0 + (Y0 - y * kw - PY0) * f; return SP; }
  function stroke(X0, Y0, pw, cz, pts, col, lit, wd){ let px = 0, py = 0; for(let k = 0; k < pts.length; k += 3){ const q = spt(X0, Y0, pw, cz, pts[k], pts[k + 1], pts[k + 2]), x = q[0], y = q[1]; if(k){ pline([px, py], [x, y], col, wd); if(lit) pline([px, py - PX], [x, y - PX], lit, PX); } px = x; py = y; } }
  const PILE = { rebar:[[400, 60, -160, 620, 140, -170, 700, 300, -120], [380, 120, 40, 640, 210, 70, 680, 360, 30], [360, -20, 180, 600, 40, 230], [-380, 90, -200, -560, 230, -260]],
    rail:[-760, 70, 160, -520, 250, 110, -270, 110, 210, -40, 300, 170, 160, 160, 230], posts:[[-520, 250, 110, -540, 40, 120], [-40, 300, 170, -60, 60, 190]],
    lamp:[560, 40, -260, 120, 150, -420, -180, 210, -470], cable:[-640, 330, -90, -560, 210, -170, -430, 130, -260, -260, 70, -320] };
  function drawPile(X0, Y0, pw, cz, fog, al, now, i){ const sl = S.pieces; if(!sl) return; const a = i ? -1 : 1;
    piece(sl[0], X0, Y0, pw, cz, -260 * a, 140, -80, .22, .55 * a, -.16 * a, fog, al);
    stroke(X0, Y0, pw, cz, PILE.lamp.map((v, k) => k % 3 === 0 ? v * a : v), '#3a4058', '#8a92a8', Math.max(PX, snap(pw * .022)));
    { const q = spt(X0, Y0, pw, cz, -180 * a, 210, -470); cx.fillStyle = '#d8d0b0'; cx.fillRect(snap(q[0] - PX), snap(q[1] - PX), PX * 3, PX * 2); cx.fillStyle = '#fff4d8'; cx.fillRect(snap(q[0]), snap(q[1]), PX, PX); }   // the lamp head, its glass cracked
    stroke(X0, Y0, pw, cz, PILE.rail.map((v, k) => k % 3 === 0 ? v * a : v), '#4a5068', '#a8b0c8', Math.max(PX, snap(pw * .018)));
    for(const p of PILE.posts) stroke(X0, Y0, pw, cz, p.map((v, k) => k % 3 === 0 ? v * a : v), '#3a4058', null, Math.max(PX, snap(pw * .014)));
    piece(sl[1], X0, Y0, pw, cz, 300 * a, 110, 90, -.05, -.42 * a, .14 * a, fog, al);
    piece(sl[2], X0, Y0, pw, cz, 40 * a, 330, -60, .55, 1.15 * a, .38, fog, al);
    for(const r of PILE.rebar) stroke(X0, Y0, pw, cz, r.map((v, k) => k % 3 === 0 ? v * a : v), '#5a2a1a', '#c8743c', Math.max(PX, snap(pw * .01)));
    stroke(X0, Y0, pw, cz, PILE.cable.map((v, k) => k % 3 === 0 ? v * a : v), '#1a1c26', '#6a7088', Math.max(PX, snap(pw * .014)));
    { const q = spt(X0, Y0, pw, cz, -260 * a, 70, -320), x = q[0], y = q[1]; cx.fillStyle = '#c8b090'; for(let k = 0; k < 3; k++) cx.fillRect(snap(x + (k - 1) * PX * 2), snap(y + (k % 2) * PX), PX, PX); } }   // the cable's frayed end

  // ---------------------------------------------------------------- 落石 debris, the stomp and the look up
  /* Shell fragments torn off in the clash fall onto the bridge ahead of you, each into one lane, and lie there as rubble. Fair by
     construction: each is telegraphed from the moment it starts to fall (its shadow widening on its lane, an amber ring blinking round
     it; a yellow-and-black band under ASSIST.contrast) at least ~1.9 s before you reach it at top speed; it lands long before you get
     there (never a timing gamble); the left lane is always open; the two are 25 segments apart in different lanes. Riding into one is a
     shove and a little speed ('Debris'), never a crash. ASSIST.jumps (generous) drops the second one. */
  const DEB = [{ d0:PASS - 60 + 110, rel:60 - PASS, x:2 / 3 }, { d0:PASS - 90 + 110, rel:90 - PASS, x:0 }], DEB_FALL = 30, DEB_H = 9000, DEB_R = .27, DEBS = DEB.map(() => ({ landed:false, hit:false }));
  function crunch(v){ if(!ac()) return; const t0 = M.ac.currentTime; M.noise(.9, 260, .16 * v, t0); M.tone(62, .45, { v:.1 * v, at:t0 }); M.noise(.5, 2400, .05 * v, t0 + .04); }
  function debrisHit(D0){ MECH.sp_kaiju.debrisHits++; speed *= .84; K.shove = .3; K.shoveDir = playerX >= D0.x ? 1 : -1; if(typeof drift !== 'undefined'){ drift = 0; charge = 0; tier = 0; } bump(4); crunch(.8);
    if(MECH.arrival && MECH.arrival.callout) MECH.arrival.callout('Debris', { prio:3, col:'#ffb02a', size:'s' }); else floatText('Debris', W / 2, H * .5, 22, '#ffb02a');
    for(let n = 0; n < 12; n++) sparks.push({ x:W / 2 + (Math.random() - .5) * W * .1, y:H * .82, vx:(Math.random() - .5) * 360, vy:-Math.random() * 300, life:.45, c:n % 2 ? '#ffd070' : '#8a92a8' }); }
  function tsUpdate(dt, t, p, d){
    // the look up: as the legs close in, the view tips up to follow them into the sky, then settles once they are behind (none mid-jump)
    const J = MECH.sp_jump, fly = J && J.flying && J.flying(), u = t >= 0 ? t - PASS - p : 1e9;
    const e = t < 0 || fly || state !== 'play' ? 0 : u > 48 ? 0 : u > 6 ? sm((48 - u) / 42) : u > -26 ? sm((u + 26) / 32) : 0, pitch = -H * (reduce ? .07 : .2) * e;
    K.pv = (K.pv || 0) + (pitch - (K.pv || 0)) * Math.min(1, dt * 3.5); if(Math.abs(K.pv) < .5 && pitch === 0) K.pv = 0;
    if(window.CAM && (K.pv < -.5 || K.pitchOwn)){ CAM.pitch = K.pv < -.5 ? K.pv : 0; K.pitchOwn = K.pv < -.5; }
    if(K.shove > 0 && state === 'play'){ const k = Math.min(K.shove, dt); K.shove -= dt; const nx = playerX + K.shoveDir * 1.1 * k; if(Math.abs(nx) < .92) playerX = nx; }
    if(t < 0){ K.lp = p; return; }
    if(K.dt !== t){ K.dt = t; for(const q of DEBS){ q.landed = false; q.hit = false; } }
    const gen = !!(window.ASSIST && ASSIST.jumps) || state === 'ready';
    for(let i = 0; i < DEB.length; i++){ if(gen && i > 0) continue; const D0 = DEB[i], q = DEBS[i], cs = t + D0.rel;
      if(!q.landed && d <= D0.d0 - DEB_FALL){ q.landed = true; if(state === 'play'){ crunch(.6); bump(3); } cars = cars.filter(c => !(Math.abs(c.z / SEG - cs) < 5 && Math.abs(c.x - D0.x) < .55)); }
      if(q.landed && !q.hit && state === 'play' && K.lp !== undefined && K.lp <= cs + .5 && p >= cs + .5 && Math.abs(playerX - D0.x) < DEB_R && AIR.h < 6 && !(typeof recov !== 'undefined' && recov > 0)){ q.hit = true; debrisHit(D0); } }
    K.lp = p; }
  // per segment: the debris (telegraph, fall, rubble), the raised foot's shadow, the stomp's dust and the cracks it sends into the left lane
  function footSeg(){ const L = TT.s.parts.leg; return L && L.st ? Math.floor((TT.s.Z0 + (L.st.z0 + L.st.n / 2) * L.st.vz) / SEG) : -1; }
  function ring(c, rx, ry, col){ cx.fillStyle = col; const n = Math.max(12, Math.min(40, Math.round(rx / PX * 1.4))); for(let k = 0; k < n; k++){ if(k % 4 === 3) continue; const a = k / n * 6.283; cx.fillRect(snap(c[0] + Math.cos(a) * rx), snap(c[1] + Math.sin(a) * ry), PX, PX); } }
  function tsSeg(s, uw, fog, now, t, d){ const a = 1 - fog * .7, gen = !!(window.ASSIST && ASSIST.jumps) || state === 'ready';
    for(let i = 0; i < DEB.length; i++){ if(gen && i > 0) continue; const D0 = DEB[i], cs = t + D0.rel; if(s.index !== cs) continue; const fq = (D0.d0 - d) / DEB_FALL; if(fq < 0) continue;
      const g = P(s, .5, D0.x, 0), r = uw * .3, gx = g[0], gy = g[1]; cx.globalAlpha = a;
      if(fq < 1){ cx.fillStyle = 'rgba(4,2,10,.55)'; cx.beginPath(); cx.ellipse(gx, gy, Math.max(PX, r * (.3 + .6 * fq)), Math.max(PX, r * (.3 + .6 * fq) * .26), 0, 0, 6.283); cx.fill();
        if(window.ASSIST && ASSIST.contrast){ const hy = Math.max(PX, snap(uw * .03)); for(let k = -3; k < 3; k++){ cx.fillStyle = (k & 1) ? '#101010' : '#ffd23a'; cx.fillRect(snap(gx + k * r / 3), snap(gy + r * .3), snap(r / 3), hy); } }
        ring(g, r, r * .27, reduce || Math.floor(now / 250) % 2 ? '#ffb02a' : '#7a4a10');
        const hgt = DEB_H * (1 - fq * fq), cz = (s.p1.camera.z + s.p2.camera.z) / 2, q = P(s, .5, D0.x, hgt);
        cx.globalAlpha = a * .35; cx.fillStyle = '#8a92a8'; cx.fillRect(snap(q[0] - PX / 2), snap(q[1] - uw * .6), PX, snap(uw * .3)); cx.globalAlpha = a;
        if(S.pieces) piece(S.pieces[1], gx, gy, uw, cz, 0, hgt + 220, 0, fq * 2.6 + i, fq * 1.9, fq * 1.3, fog, a); }   /* the falling slab, tumbling */
      else { const kk = uw * .3 / 14, sf = scaleFade(kk, 4.5, 7); if(sf <= 0) continue; cx.globalAlpha = a * sf;   /* the rubble: broken deck slabs, rebar, railing, a lamp post, a cable; a fire; its smoke */
        cx.fillStyle = 'rgba(4,2,10,.5)'; cx.beginPath(); cx.ellipse(gx, gy, r * .95, r * .25, 0, 0, 6.283); cx.fill();
        drawPile(gx, gy, uw, (s.p1.camera.z + s.p2.camera.z) / 2, fog, a * sf, now, i); cx.globalAlpha = a * sf;
        flameAt([gx + r * .2, gy - r * .15], kk * .9, i + 3, now); glow(gx, gy - r * .3, r * 1.2, '#ff7a2a', .3 * a);
        if(fq < 1.8){ const q = (fq - 1) / .8; cx.fillStyle = '#c8b8a8'; for(let k = 0; k < 14; k++){ const an = k / 14 * 6.283; cx.globalAlpha = a * (1 - q) * .8; cx.fillRect(snap(gx + Math.cos(an) * r * (.5 + q)), snap(gy + Math.sin(an) * r * .25 * (.5 + q) - q * r * .2), PX * (k % 3 ? 1 : 2), PX); } } }
      cx.globalAlpha = 1; }
    const fs = footSeg(); if(fs < 0 || Math.abs(s.index - fs) > 7) return; const lp = TT.s.parts.leg.poses.planted, fx = (TT.s.X0 + (lp.x0 + lp.w / 2) * lp.vs) / ROADW;
    if(s.index === fs && d <= STOMP_UP && d > STOMP_D){ const g = P(s, .5, fx, 0), q = sm((STOMP_UP - d) / 20); cx.globalAlpha = a * .5 * q; cx.fillStyle = '#05030c'; cx.beginPath(); cx.ellipse(g[0], g[1], uw * .9, uw * .2, 0, 0, 6.283); cx.fill(); cx.globalAlpha = 1; }
    if(d <= STOMP_D){ const gr = clamp((STOMP_D - d) / 14, 0, 1), w = Math.max(PX, snap(uw * .012)), o = s.index - fs;
      const sd = fx < 0 ? -1 : 1; cx.globalAlpha = a; for(let k = 0; k < 2; k++){ let X = sd * 1.02, f = H1(s.index * 3 + k) * .6; const len = gr * (.75 - Math.abs(o) * .08) * (.6 + H1(k * 7 + s.index) * .5); if(len <= 0) continue;
        for(let q = 0; q < 4; q++){ const nX = X - sd * len / 4, nf = clamp(f + (H1(k * 5 + q + s.index) - .5) * .5, 0, 1); pline(P(s, f, X, 3), P(s, nf, nX, 3), mixc('#05060a', '#0a0c1c', fog * .8), w); if(q === 1) pline(P(s, nf, nX, 3), P(s, clamp(nf + .3, 0, 1), nX - sd * .12, 3), mixc('#05060a', '#0a0c1c', fog * .8), w); X = nX; f = nf; } }
      if(s.index === fs && d > STOMP_D - 40){ const q = (STOMP_D - d) / 40, g = P(s, .5, fx, 0); for(let i = 0; i < 9; i++){ const pf = S[(i % 3 === 1 ? 'pfl' : 'pf') + (i % 3)], dk = uw * (.05 + q * .09) * (.7 + H1(i * 9.1) * .5); cx.globalAlpha = a * (1 - q); blit(pf, g[0] + (H1(i * 3.1) - .5) * uw * 2.2 * (.4 + q), g[1] - H1(i * 5.7) * uw * .8 * q + pf.height * dk * .4, dk); } }
      cx.globalAlpha = 1; } }

  const tsRes = q => { if(q){ q.skRes = 1; q.police = 1; q.hz = null; } };   // the debris lanes: no kickers, checkpoints or hazards under the falling shell
  // ---------------------------------------------------------------- the module
  MECH.sp_kaiju = {
    debrisHits:0, debris(){ const t = K.dt, d = t >= 0 ? t - pSeg() : 0, gen = !!(window.ASSIST && ASSIST.jumps); return t < 0 || K.trig !== t ? [] : DEB.filter((D0, i) => !(gen && i > 0)).map(D0 => ({ seg:t + D0.rel, x:D0.x, falling:d <= D0.d0 })); },   // tests: the debris of the live fight
    INTS, dbg:null, S, TT,   // TT: the stacked titans (tests and contact sheets read it)
    // storm wind 0..1 at the rider: 0 outside the typhoon stretch, ramps in and out, peaks with each gust (smooth, deterministic)
    wind(){ const t = activeTy(pSeg()); return t < 0 ? 0 : clamp(wind(t, pSeg()).w, 0, 1); },
    probe(){ return { tsP:K.tsP.filter(q => q.r === segs).map(q => q.pk), pass:PASS, kj:kjTrig.slice(), ty:tyTrig.slice(), p:Math.round(pSeg()), zones:zones.map(z => ({ pk:z.pk, B:z.B, blown:z.blown, launched:z.launched, landed:z.landed, helper:!!z.helper, live:!!zoneLive(z) })) }; },
    _rewarm(){ TS.built = false; TS.it = null; for(const id in TT) TT[id].parts = {}; const it = tsSteps(), ts = []; let a = performance.now(); for(;;){ const r = it.next(), b = performance.now(); ts.push([b - a, TSTEP]); a = b; if(r.done) break; } ts.sort((x, y) => y[0] - x[0]); return { total:Math.round(ts.reduce((x, y) => x + y[0], 0)), steps:ts.length, max:+ts[0][0].toFixed(1), top:ts.slice(0, 8).map(v => v[1] + ' ' + v[0].toFixed(0)) }; },   // tests: rebuild the stacks step by step, timing each step
    _full(){ const F = FR; if(F.kj < 0 || !F.st || !TS.built) return 0; const a = F.st.alpha; let q = tsPt(TT.s, 18, 150, 0); if(!q) return 0; const top = q[1], cxp = q[0]; q = tsPt(TT.s, 0, 0, 0); if(!q) return 0; const bot = q[1]; return a > .9 && top >= 0 && bot <= H && bot - top >= H * .12 && cxp > 0 && cxp < W ? 1 : 0; },   // tests: Sairyu whole on screen
    _mem(){ let px = 0; const add = c => { if(c) px += c.width * c.height; }; for(const id in TT) for(const k in TT[id].parts){ const P = TT[id].parts[k]; for(const st of [...Object.values(P.poses), ...Object.values(P.fine || {})]){ for(const L of st.L) add(L.cv); if(st.backL) add(st.backL.cv); if(st.glow) st.glow.forEach(add); } } return { px, mb:+(px * 4 / 1048576).toFixed(1), parts:Object.values(TT).flatMap(T => Object.values(T.parts).flatMap(P => [...Object.entries(P.poses).map(([k, st]) => [T.id + P.name + ':' + k, st]), ...Object.entries(P.fine || {}).map(([k, st]) => [T.id + P.name + ':' + k + 'F', st])])).map(([n, st]) => n + ' ' + st.L.map(L => L.g + ':' + Math.round(L.cv.width * L.cv.height / 1000)).join(',') + (st.backL ? ' b' + Math.round(st.backL.cv.width * st.backL.cv.height / 1000) : '')) }; },
    _ts(){ const q = TT.s.Z0 ? proj(TT.s.Z0) : null; return { far:FR.tsFar, built:TS.built, kj:FR.kj, sZ0:TT.s.Z0, sX0:TT.s.X0, fX0:TT.f.X0, rearToe:Math.round(TT.s.X0 + (TT.s.rearToe || 0)), hp:[HP.seg, HP.d0], pos:position, draws:TDRAWS, pr:q ? [Math.round(q.x), Math.round(q.y), +q.sc.toExponential(2)] : null, lv:Object.values(TT.s.parts).map(P => P.name + ':' + (P.lv ? P.lv.g : '-') + 'x' + P.c) }; },   // testing
    dbgBreak(t){ return addZone(t); },   // testing: a bridge break for a kaiju trigger at segment t
    dbgTy(t0){ for(let i = Math.max(0, t0); i <= t0 + TY_LEN && i < segs.length; i++) tyPlace(i, segs[i], i - t0); if(segs[t0]) segs[t0].tyStart = true; },   // testing: a typhoon stretch from segment t0
    warm(){ build(); tsBuild(); },
    *warmSteps(){ build(); yield; if(!TS.it) TS.it = tsSteps(); for(const _ of TS.it) yield; },   // the stacked titans one part and pose per step, for the staged warm-up
    drawSegBack(s, sx0, sy0, uw, fog, now){ const F = frame(now); if(F.kj < 0 || F.tsFar || !TS.built) return; tsDraw(s.index * SEG, (s.index + 1) * SEG, F.st.alpha); },
    hitCar(){ const z = FR.bz; return !!(z && z.own); },
    drawUnderBike(now){ },   // (sp_jump) the screen-space look-down band is removed: the chasm below is real geometry the camera sees
    reset(){ K.pending = -1; K.cutT = -1;   // trigger lists are validated against segs (s.kjPeak / s.tyStart), so stale entries are harmless
      K.trig = -1; K.lastD = null; T.trig = -1; T.lastP = null; T.told = false;
      if(K.pitchOwn && window.CAM) CAM.pitch = 0; K.pitchOwn = false; K.shove = 0; K.lp = undefined; K.dt = -1; K.tsP = K.tsP.filter(q => q.r === segs); },
    place(i, s, L){ const rel = i - (typeof landStart === 'number' ? landStart : 0);
      // the peak sits 440 segments in, but never within a fork gate's approach: then it comes 130 segments before the gate
      if(L.key === 'bay' && rel === 300){ let pk = i + KJ_AT - 300; for(const g of gates) if(g > i - 40 && g > pk - 200 && g < pk + 140 - PASS){ pk = g + 210; K.hold[pk] = g + 6; break; } if(window.forkClear){ const d = forkClear(pk - 200, pk + 140 - PASS); if(d){ delete K.hold[pk]; pk += d; } }   /* (?split=1: clear of a fork's split window) */ /* the break zone (its approach to the far deck's end) must sit inside the bay: pushed past a fork's window it ran over the border into
           the next road (the chasm and the KAIJU JUMP landing on a city street). Pull it back before the border; if it then overlaps the
           fork's window there is no room for the break this visit: the fight still plays in the sky, the bridge holds. */
        { const zEnd = gates[2 * zoneOfSeg(i) + 1], SPAN = Math.max(BRK + GAP + FAR + 30, 110 - PASS);
          if(zEnd !== undefined && pk + SPAN > zEnd - 10){ const hd = K.hold[pk]; delete K.hold[pk]; pk = zEnd - 10 - SPAN; if(hd !== undefined && hd < pk - 60) K.hold[pk] = hd; }
          const fits = pk > i + 20 && !(window.inForkWindow && inForkWindow(pk - 14, pk + SPAN));
          /* the titans stand astride the bridge at pk - PASS: their feet, the debris lanes and the look up (pk - PASS - 130 .. + 40) must be
             clear of a fork's split window and on the bay, or there is no fight this visit */
          const tfit = !(window.inForkWindow && inForkWindow(pk - 200, pk - PASS + 110)) && (zEnd === undefined || pk - PASS + 110 < zEnd);
          if(pk > i && tfit && (!DIR || DIR.request('kaiju', { seg:pk }))){ K.pending = pk; if(fits) addZone(pk); K.tsP.push({ pk, r:segs }); if(K.tsP.length > 8) K.tsP.shift(); for(let j = pk - PASS + 30; j < i; j++) tsRes(segs[j]); } } }
      for(const q of K.tsP) if(q.r === segs && i >= q.pk - PASS + 30 && i <= q.pk - PASS + 110) tsRes(s);   // (plans are tagged with their road: a reset builds a new one)
      { const z = zoneOf(i); if(z){ reserve(s, z); const pv = segs[i - 1]; if(pv && pv.kjZ && pv.hz) pv.hz = null; } }
      if(L.key === 'bay' && K.pending === i){ s.kjPeak = true; if(!kjTrig.includes(i)) kjTrig.push(i); if(kjTrig.length > 16) kjTrig.shift(); K.pending = -1; }
      if(L.key === 'coast' && rel === TY_FROM) tyGo = { at:i, ok:!(window.inForkWindow && inForkWindow(i, i + TY_LEN)) && (!DIR || DIR.request('typhoon', { seg:i })) };   // (?split=1: no typhoon through a fork's split window)
      if(L.key === 'coast' && rel >= TY_FROM && rel <= TY_FROM + TY_LEN && tyGo.ok && tyGo.at === i - (rel - TY_FROM)){ tyPlace(i, s, rel - TY_FROM); if(rel === TY_FROM){ s.tyStart = true; if(!tyTrig.includes(i)) tyTrig.push(i); if(tyTrig.length > 16) tyTrig.shift(); } } },
    update(dt){ const p = pSeg();
      // kaiju beats: sounds and shakes as the rider crosses each d
      const t = activeKj(p);
      if(t >= 0){ const d = t - p, a = K.trig === t && K.lastD !== null ? K.lastD : d, hd = K.hold[t], X = v => (hd === undefined || p > hd) && a > v && d <= v; if(K.trig !== t){ K.trig = t; K.ref = skyPar('far'); }
        if(X(580)) roar(.35); if(X(540)){ shriek(.5); } if(X(425)) roar(.55); if(X(400)){ shriek(.8); thud(.6); } for(const s2 of T_STRIKES) if(X(s2)){ thud(.7); bump(2); } if(X(330)) shriek(.6); if(X(286)) shriek(.5);
        if(X(228)){ roar(1); bump(3); } for(const c of [192, 162, 132, 102]) if(X(c) && ac()) M.tone(196 * Math.pow(2, (192 - c) / 60), .4, { type:'square', v:.02 });
        if(X(70) && !reduce && DIR && DIR.cine && state === 'play') DIR.cine({ slowmo:{ scale:.6, hold:.6 }, dur:1.4 });   /* the fire reads: 0.6x for 0.6 s */
        if(X(70) && ac()){ M.noise(1.6, 1300, .12); M.tone(55, 1.4, { type:'sawtooth', v:.09, fuzz:true }); M.tone(110, 1.2, { type:'square', v:.02 }); bump(4); }
        if(X(56)){ thud(1.2); bump(7); } if(X(14)){ thud(.7); } if(X(0) && ac()) M.noise(2.4, 140, .14); if(X(PASS + 40)) roar(.9);
        // the 怪獣決戦 title card (ui/cutin.js): once per fight, at the titan's roar, or as soon as a checkpoint hold releases the fight
        if(K.cutT !== t && (hd === undefined || p > hd) && d <= 400 && d > 110){ K.cutT = t; if(MECH.cutin && state === 'play') MECH.cutin.show('kaiju'); }   /* (when they stand in full view) */
        if(X(STOMP_UP) && ac()) M.tone(46, 1.1, { type:'sawtooth', v:.05, fuzz:true });   // the foot lifts: a low strain
        if(X(STOMP_D)){ thud(1.4); bump(7); crunch(.7); }   // and comes down beyond the barrier, cracking the left lane
        if(X(PASS - 12)) shriek(.8); if(X(PASS - 66)){ thud(1.1); bump(2); }   // the crab goes down into the bay behind you
        K.lastD = d; }
      tsUpdate(dt, t, p, t >= 0 ? t - p : 0);
      cardT = Math.max(0, cardT - dt); updateBreak(dt, p);
      // typhoon: gusts push gently toward the land side; telegraphed by the whoosh a second ahead
      const ty = activeTy(p);
      if(ty >= 0){ const wd = wind(ty, p), a = T.trig === ty && T.lastP !== null ? T.lastP : p; T.trig = ty;
        if(state === 'play'){ if(wd.push > 0) playerX += wd.push * .42 * (speed / MAXS) * dt;
          if(!T.told && wd.I > .3){ T.told = true; if(!(MECH.cutin && MECH.cutin.show('typhoon') && !MECH.cutin.skipped)) floatText('強風 · gusts from the sea →', W / 2, H * .34, 22, '#ffb02a'); }
          for(let g = GUST0; g < TY_LEN - 40; g += GUST_EVERY){ if(a - ty < g - TELE && p - ty >= g - TELE && M.ac){ const t0 = M.ac.currentTime; for(let j = 0; j < 4; j++) M.noise(.7, 380 + j * 160, .025 + j * .02, t0 + j * .22); } }
          const id = Math.floor(performance.now() / LT); if(id !== T.thunderId && flashOn(performance.now(), ty)){ T.thunderId = id; if(M.ac){ M.noise(2.2, 110, .12, M.ac.currentTime + .5); M.noise(.4, 600, .06, M.ac.currentTime + .45); } } }
        T.lastP = p; } },
    drawBackdrop(o){ if(!built) build(); const F = frame(o.now); if(F.kj >= 0) drawKaiju(o, F.kj); if(F.ty >= 0) drawTyphoonSky(o, F.ty); },
    drawSeg(s, sx0, sy0, uw, fog, now){
      const F = frame(now); if(s.ty && F.ty >= 0) drawTySeg(s, sx0, sy0, uw, fog, now, F.ty);
      if(F.bz && s.kjZ === F.bz && F.g >= 0){ const o = s.index - F.bz.B; if(o >= -RAMP && o <= GAP + 2 || F.g < 90 && o > -60 && o < 80) drawBreakSeg(s, uw, fog, now, F.bz, F.g); }
      if(F.kj < 0) return; const p = F.p, t = F.kj, d = t - p, rel = s.index - p; if(TS.built){ if(!F.tsFar) tsToes(s.index * SEG, (s.index + 1) * SEG, F.st.alpha); { for(const h of HE) if(h.on){ const a2 = F.st.alpha * (1 - fog * .4); if(h.bseg === s.index && h.seg !== s.index) drawHeli(h, now, a2, 1); if(h.seg === s.index) drawHeli(h, now, a2, h.bseg === s.index || h.bseg > h.seg ? 3 : 2); } } tsSeg(s, uw, fog, now, t, d); }
      // shockwave crests rolling over the bay toward the bridge; spray where they hit the deck
      for(const d0 of WAVES){ if(d > d0) continue; const A = crestAhead(d0, d); if(A < 1 || A > 175 || Math.abs(rel - A) > .5) continue;
        const e = clamp(A / 175, 0, 1), th = Math.max(PX, snap(PX * 2 * (1 - e) + PX)), xl = sx0 - 1.75 * uw, xr = sx0 + 1.75 * uw;
        for(const [x0, x1, al] of [[0, xl, .8], [xr, W, .45]]){ if(x1 <= x0) continue; for(let x = snap(x0); x < x1; x += PX * 4){ const h = H1(Math.floor(x / (PX * 4)) * 3.7 + d0); if(h < .25) continue;
          cx.globalAlpha = al * (1 - fog * .7); cx.fillStyle = h > .7 ? '#e8f4ff' : '#9ab4dc'; cx.fillRect(x, snap(sy0 - th), PX * (h > .5 ? 4 : 2), th); cx.fillStyle = '#0a1430'; cx.fillRect(x, snap(sy0), PX * 4, PX); } }
        cx.globalAlpha = 1;
        if(A < 60){ const q = 1 - A / 60, f = Math.min(4, Math.floor(q * 5)), sp = S['sp' + f], kk = uw * 1.1 / sp.height; cx.globalAlpha = 1 - fog * .6; blit(sp, sx0 - 1.95 * uw, sy0, kk); cx.globalAlpha = 1; } } },
    overlay(now, sk){ const F = frame(now), p = F.p, t = F.kj;
      // the white-hot flash of the blast: three held steps, never under reduced motion
      if(F.bz && !reduce && F.g >= 0 && F.g < 9){ cx.fillStyle = '#fff6e0'; cx.globalAlpha = [.55, .3, .12][Math.min(2, Math.floor(F.g / 3))]; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }
      if(t >= 0){ const d = t - p, st = F.st || kjState(d, now), hz = H / 2 + 2; tsFx(now, st, d);
        // the beam lights the rain: short amber streaks around its line, added on top
        if(st.beam > 0 || st.impact >= 0 && st.impact < .4){ const k = st.k, i0 = Math.max(st.beam, st.impact >= 0 ? .6 - st.impact : 0), y0 = hz - 70 * k, y1 = hz - 30 * k; cx.globalCompositeOperation = 'lighter';
          for(let i = 0; i < 70; i++){ const vel = 1.1 + H1(i * 5) * .6, y = ((H1(i * 2.1) * (y1 - y0 + H * .3) + now * vel) % (y1 - y0 + H * .3)) + y0 - H * .15, x = (H1(i * 1.3) * 1.1 - .05) * W + (y - hz) * .12, near = 1 - Math.abs(y - (y0 + y1) / 2) / (H * .3);
            if(near <= 0) continue; cx.fillStyle = i % 4 ? '#ff9a3a' : '#ffe0a0'; cx.globalAlpha = .55 * i0 * near; for(let j = 0; j < 3; j++) cx.fillRect(snap(x - j * PX * .5), snap(y + j * PX * 2), PX, PX * 2); }
          cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
        // the impact flash: three hard steps, never under reduced motion
        if(!reduce){ const f = d <= 56 && d > 42 ? (56 - d) / 14 : -1; if(f >= 0){ cx.fillStyle = '#ffc070'; cx.globalAlpha = [.2, .12, .05][Math.min(2, Math.floor(f * 3))]; cx.globalCompositeOperation = 'lighter'; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; } }
        // spray thrown up when a crest hits the bridge, drifting across the left of the screen
        for(const d0 of WAVES){ const A = crestAhead(d0, d); if(A > 6 || A < -40) continue; const q = clamp((6 - A) / 46, 0, 1); cx.fillStyle = '#a8bcd6'; for(let i = 0; i < 24; i++){ const ph = (q + H1(i) * .5) % 1, x = H1(i * 3.3) * W * .3 + ph * W * .05, y = H * (.5 + H1(i * 7.1) * .35) + ph * ph * H * .2; cx.globalAlpha = .45 * (1 - q) * Math.min(1, ph * 6) * (1 - ph); cx.fillRect(snap(x), snap(y), PX, PX * 2); } cx.globalAlpha = 1; } }
      const ty = F.ty; if(ty >= 0){ const wd = wind(ty, p); if(wd.I > .02) tyOverlay(now, wd, ty); } },
    drawScreen(now){ drawCard(); const F = frame(now), p = F.p, ty = F.ty; if(ty < 0) return; const wd = wind(ty, p); if(wd.I < .15) return;
      // a windsock in the corner: it fills before a gust and blinks amber during the warning
      const lv = sockLv(wd.w), spr = S['sock' + lv + (reduce ? 0 : Math.floor(now / (160 - lv * 30)) % 2)], kk = PX, x = W * .03 + spr.width * kk / 2, y = H * .42;
      cx.globalAlpha = Math.min(1, wd.I * 1.5); blit(spr, x, y, kk);
      if(wd.tele > 0 || wd.push > .05){ const on = reduce || Math.floor(now / 500) % 2; if(on){ glow(x + 6 * kk, y - 24 * kk, 14 * kk, '#ffa02a', .5); const ar = S.arrow; blit(ar, x + 2 * kk, y + 6 * kk + ar.height * PX * 2, PX * 2); cx.textBaseline = 'alphabetic'; } }
      cx.globalAlpha = 1; }
  };

  // wind-driven rain: three depths of slanted streaks, slant and density rising with each gust; spray mist sheets sweep across in gusts
  // a rain streak at one of five wind slants, cached; a mist band in Bayer dither
  const streak = (len, wdt, col, q, sl) => procSprite('kj_rs' + len + col + q, Math.ceil(sl * len) + wdt + 1, len, (x, y) => { const cxp = Math.round(sl * y); return x >= cxp && x < cxp + wdt ? col : null; });
  const mistSprite = () => procSprite('kj_mist', 200, 10, (x, y) => B4[(y & 3) * 4 + (x & 3)] > .45 - Math.abs(y / 10 - .5) || Math.min(x, 199 - x) < B4[(y & 3) * 4 + (x & 3)] * 30 ? null : '#9ab0d0');
  function tyOverlay(now, wd, t){ const I = wd.I, sl = .35 + wd.w * .9, hz = H / 2 + 2;
    if(!reduce && !MECH.sp_kaiju.dbgNoRain){ const q = clamp(Math.round((sl - .35) / .9 * 4), 0, 4), slq = .35 + q * .9 / 4;
      for(const [n, len, wdt, col, alp, vel, seed] of [[80, 3, 1, '#4a5c84', .5, .4, 300], [70, 7, 1, '#7e90bc', .45, .85, 400], [22, 14, 2, '#b4c4e6', .35, 1.5, 500]]){
        const spr = streak(len, wdt, col, q, slq), L = len * PX, cnt = Math.round(n * (.5 + wd.w * .6)); cx.globalAlpha = alp * I;
        for(let i = 0; i < cnt; i++){ const r = seed + i, y = ((H1(r * 2.1) * (H + L) + now * vel) % (H + L)) - L, x = ((H1(r * 1.3) * W * 1.4 + now * vel * slq) % (W * 1.4)) - W * .2;
          cx.drawImage(spr, snap(x), snap(y), spr.width * PX, spr.height * PX); } }
      // mist sheets: dithered bands blown from the sea side during gusts (one cached sprite each)
      if(wd.w > .6){ const a = (wd.w - .6) * 2.5 * I, ms = mistSprite(); cx.globalAlpha = .1 * a;
        for(let b = 0; b < 3; b++){ const y = snap(H * (.45 + b * .16)), x0 = ((now * (.6 + b * .2) + b * 400) % (W * 1.6)) - W * .4; cx.drawImage(ms, snap(x0), y, ms.width * PX, ms.height * PX); } }
      cx.globalAlpha = 1; }
    else { cx.fillStyle = '#7e90bc'; cx.globalAlpha = .3 * I; for(let i = 0; i < 60; i++) cx.fillRect(snap(H1(i) * W), snap(H1(i * 3.1) * H), PX, PX * 3); cx.globalAlpha = 1; }
    const fv = flashLv(now, t); if(fv){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = '#8a9ad0'; cx.globalAlpha = .12 * fv; cx.fillRect(0, 0, W, hz); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; } }


  // the game warms ENV modules only; build ours once everything has loaded (warm() is idempotent if the game calls it later)
  addEventListener('load', () => { try{ build(); }catch(e){ console.warn('sp_kaiju warm', e); } });
})();
