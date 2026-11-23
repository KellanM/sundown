/* Sundown set piece module: festival. See setpiece/README.md.

   Two summer-festival set pieces, both placed by world position and driven by the rider's distance to them:

   1. HANABI (Rice Paddies, Shonan Coast): a fireworks display on the horizon that builds over ~750 segments to a finale as you pass the
      launch site. Shells are launched so they BURST ON THE BEAT of the live music (the beat is read from M's scheduler: M.step, M.next and
      M.ac.currentTime; without audio an own clock at BPM stands in). The deep boom arrives after the flash (sound is slower than light),
      kamuro shells crackle. On the paddies the bursts are mirrored in the flooded fields by an own pass, clipped to the water.
   2. MATSURI (Neon Ward): a nebuta-style lantern float, a taiko drum cart, lantern bearers and haneto dancers cross an intersection ahead.
      Telegraphed by lantern strings, a crowd at the kerb, a zebra crossing, traffic queueing at the stop line, and taiko drums in time with
      the music that get louder as you close in. The procession moves with your distance, so it always arrives in the same shape: the
      float holds one outer lane, the drum cart the other kerb, and the centre is a clear gap. The hit test is smaller than the art.

   References looked at (Wikimedia, via the zoom page), rules taken (no art copied):
   - Aomori Nebuta float (2006 photo; Nebuta-taisho; "Haneto"): the figure is ~2:1 wide, every painted paper panel is bounded by a heavy
     black ink line; colours are flat and saturated (vermilion, chrome yellow, green, cobalt) on cream; it glows from inside, so panel
     centres are brightest and panels darken toward their ink lines; the silhouette is ragged (flames, hair, swords); a white lantern band
     with red lettering and yellow side placards sit under the figure; carriers are a dark mass of heads beneath.
     -> 1px ink between all regions, a 1px darker rim inside each panel, lantern band + placards, carriers as a bobbing row.
   - Haneto dancers: white yukata with bold pattern, pink and red sashes/tasuki, enormous multicolour flower hats (hanagasa); they hop.
   - Kishiwada Danjiri: dark wood cart with a carved roof, crowd in white happi with black lettering, kohaku (red/white) striped curtains.
     -> the drum cart: wood, canopy roof, red-white skirt, drummers in happi and hachimaki.
   - Hiroshige, "Fireworks at Ryogoku" (100 Famous Views of Edo no. 98): one burst as separate POINTS (not lines) on a deep night, a pale
     smoke cloud behind it, a thin wavering gold trail rising from below. -> stars as single pixels, dithered smoke, wiggly rising tails.
   - Sumida River 2012 (photo): bursts like dandelions on thin stems, river reflections as broken vertical streaks.
   - Nagaoka (Phoenix, starmine photos): gold kamuro shells hang as long drooping willow trails; the finale is a wide wall of shells across
     the horizon plus fans of small coloured peonies; smoke lit from below. -> a kamuro wall + starmine fans for the finale.
   - Kiku / botan photos (Takino, Sakura, Itabashi): kiku = streaks with colour-changing tips (henka), botan = dots without tails,
     multi-ring shells have a differently coloured core (pistil). Pixel-art convention (Stardew-style festival fireworks): a white-hot
     first frame, then the colour, then a dark ember step, trails as dotted pixels whose colour drops one step per sample.
   Rules: pixel-grid only (every star is one canvas pixel), stepped palettes of 5 per shell, stepped glows, no gradients; reduce = no
   flash, no twinkle, fewer and slower shells; spectacle never covers the road (it's above the horizon or in the water). */
"use strict";
(() => {
  // rarity: mech/director.js decides whether a road visit gets its hanabi show or its matsuri parade (setpiece/README.md, "Director and rarity")
  const DIR = MECH.director; if(DIR){ DIR.register('hanabi'); DIR.register('matsuri'); }
  const sn = v => Math.round(v / PX) * PX;
  const H1 = n => { const s = Math.sin(n * 78.233 + 12.9898) * 43758.5453; return s - Math.floor(s); };
  let SPB = .476;   // seconds per beat; set from BPM once the game script has run (it loads after this file)
  const C = {};
  const cache = (k, fn) => C[k] || (C[k] = fn());
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

  /* ================================================================ pixel raster: paint palette indices, then ink and bake */
  function raster(w, h){ const a = new Uint8Array(w * h);
    const r = { w, h, a,
      set(x, y, c){ x = Math.floor(x); y = Math.floor(y); if(x >= 0 && y >= 0 && x < w && y < h) a[y * w + x] = c; },
      get(x, y){ return x < 0 || y < 0 || x >= w || y >= h ? 0 : a[y * w + x]; },
      rect(x, y, ww, hh, c){ for(let j = 0; j < hh; j++) for(let i = 0; i < ww; i++) r.set(x + i, y + j, c); },
      ell(cx0, cy0, rx, ry, c, keep){ for(let y = Math.floor(cy0 - ry - 1); y <= cy0 + ry + 1; y++) for(let x = Math.floor(cx0 - rx - 1); x <= cx0 + rx + 1; x++){
        const dx = (x + .5 - cx0) / rx, dy = (y + .5 - cy0) / ry; if(dx * dx + dy * dy <= 1 && (keep === undefined || r.get(x, y) === keep)) r.set(x, y, c); } },
      poly(p, c){ let y0 = 1e9, y1 = -1e9; for(const q of p){ y0 = Math.min(y0, q[0 + 1]); y1 = Math.max(y1, q[1]); }
        for(let y = Math.floor(y0); y <= y1; y++){ const yc = y + .5, xs = [];
          for(let i = 0; i < p.length; i++){ const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length]; if((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
          xs.sort((u, v) => u - v); for(let k = 0; k + 1 < xs.length; k += 2) for(let x = Math.ceil(xs[k] - .5); x <= xs[k + 1] - .5; x++) r.set(x, y, c); } },
      line(x0, y0, x1, y1, c, t = 1){ const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2; for(let i = 0; i <= n; i++){ const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; r.rect(Math.floor(x - (t - 1) / 2), Math.floor(y - (t - 1) / 2), t, t, c); } } };
    return r; }
  // bake: o.ink = palette index for ink; o.outline = ink the outer edge; o.inner = 1px ink between different colour groups; o.rim = darken
  // pixels that touch ink (paper lit from inside: brightest in the middle of each panel); o.grp maps an index to its colour group
  function bake(r, pal, o = {}){ const { w, h } = r; let a = r.a; const g = o.grp || (i => i), ink = o.ink || 0;
    if(ink){ const b = a.slice();
      for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const v = a[y * w + x]; if(!v || v === ink || (o.noInk && o.noInk(v))) continue;
        for(const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]){ const u = r.get(x + dx, y + dy);
          if((!u && o.outline) || (u && o.inner && u !== ink && g(u) !== g(v) && (dx > 0 || dy > 0))){ b[y * w + x] = ink; break; } } }
      a = b; }
    const [c, k] = canvas(w, h), img = k.createImageData(w, h), d = img.data, P = pal.map(p => p ? hx(p) : null), PD = pal.map(p => p ? hx(mixc(p, '#1a0812', .3)) : null), PH = pal.map(p => p ? hx(mixc(p, '#fffbe8', .35)) : null);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const v = a[y * w + x]; if(!v) continue; let col = P[v];
      if(o.rim && v !== ink && !(o.noRim && o.noRim(v))){ for(const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]){ const xx = x + dx, yy = y + dy; if(xx >= 0 && yy >= 0 && xx < w && yy < h && a[yy * w + xx] === ink){ col = PD[v]; break; } } }
      if(o.hot && col === P[v] && v !== ink && !(o.noRim && o.noRim(v))){ let far = true; for(let dy = -2; dy <= 2 && far; dy++) for(let dx = -2; dx <= 2; dx++){ const xx = x + dx, yy = y + dy; if(xx < 0 || yy < 0 || xx >= w || yy >= h || a[yy * w + xx] === ink || !a[yy * w + xx]){ far = false; break; } } if(far) col = PH[v]; }
      const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    k.putImageData(img, 0, 0); return c; }
  // a reflection: flipped, darkened toward the road, every third row dropped (the wet road breaks it up)
  function reflOf(src){ const [c, k] = canvas(src.width, src.height); k.save(); k.translate(0, src.height); k.scale(1, -1); k.drawImage(src, 0, 0); k.restore();
    k.globalCompositeOperation = 'source-atop'; k.fillStyle = 'rgba(20,8,30,.45)'; k.fillRect(0, 0, c.width, c.height); k.globalCompositeOperation = 'destination-out';
    for(let y = 0; y < c.height; y++) if(y % 3 === 2 || y > c.height * .6 && y % 2) k.fillRect(0, y, c.width, 1); return c; }
  function blitF(c, x, yb, k, flip){ const w = c.width * k, h = c.height * k; cx.imageSmoothingEnabled = false;
    if(flip){ cx.save(); cx.translate(Math.round(x), 0); cx.scale(-1, 1); cx.drawImage(c, Math.round(-w / 2), Math.round(yb - h), w, h); cx.restore(); }
    else cx.drawImage(c, Math.round(x - w / 2), Math.round(yb - h), w, h); }

  /* ================================================================ festival sprites */
  // nebuta palette
  const NP = [null, '#140a10', '#fff0d0', '#ee3a2a', '#a8202a', '#ffd03a', '#ff8a26', '#46c06a', '#22804a', '#4a86f0', '#2a4cb0', '#2a2238', '#ff90b4', '#ffc45a', '#ffffff',
    '#3a2a1a', '#fff6e4', '#d8202a', '#2a1a22', '#6a3c26', '#1a1214', '#2a3a70', '#ece4d4', '#e8a880', '#ffe070', '#9a5ae8', '#ffb070',
    '#ff5a2a', '#ff9a2a', '#ffd84a', '#fff4c0'];   // 27-30: flame tongues (one ink group)
  const GLYPHS = [['11111', '00100', '11111', '10101', '11111', '10001'], ['10111', '11010', '10111', '11101', '10101', '11011'], ['01110', '11111', '00100', '11111', '01010', '10001'],
    ['11101', '01011', '11101', '01111', '10101', '11101'], ['00100', '11111', '01010', '11111', '00100', '01110']];
  const glyph = (r, gi, x, y, c) => GLYPHS[gi % GLYPHS.length].forEach((row, j) => [...row].forEach((ch, i) => { if(ch === '1') r.set(x + i, y + j, c); }));
  // the nebuta float: a warrior with a raised sword facing a horned oni in a mane of flame, waves below; lantern band, placards,
  // a red-white skirt and a row of carriers (two frames: alternate carriers bob)
  const NW = 112, NH = 84;
  function nebuta(f){ return cache('neb' + f, () => {
    const r = raster(NW, 64);
    // flames behind: a tall ragged crown of vermilion, orange and chrome yellow, wider than the figures
    for(let i = 0; i < 15; i++){ const x = 1 + i * 7.6, ty = H1(i * 3.1) * 9, lean = (H1(i * 7.7) - .5) * 8, c = i % 3 === 0 ? 27 : 28;
      r.poly([[x - 6, 48], [x + lean, ty], [x + 6, 48]], c); r.poly([[x - 3, 48], [x + lean * .6, ty + 7], [x + 3, 48]], 29); r.poly([[x - 1, 48], [x + lean * .3, ty + 15], [x + 1.5, 48]], 30); }
    // waves below: cobalt rollers with paper crests
    for(let i = 0; i < 9; i++){ const x = 4 + i * 13; r.ell(x, 55, 9, 7, i % 2 ? 9 : 10); r.ell(x + 3, 51, 4.5, 2.6, 2); r.ell(x + 4, 52, 2, 1.2, i % 2 ? 9 : 10); }
    // the warrior: topknot hair, armour, helmet, a big paper face with kumadori, arm and sword
    r.poly([[12, 8], [24, 3], [38, 6], [42, 16], [36, 24], [16, 26], [9, 16]], 11); r.poly([[14, 10], [4, 2], [8, 14]], 11);
    r.line(12, 11, 16, 24, 9, 1); r.line(37, 7, 41, 16, 9, 1); r.line(6, 4, 10, 12, 9, 1);
    r.poly([[14, 33], [46, 31], [52, 58], [9, 58]], 3);
    for(let y = 37; y < 56; y += 4) for(let x = 12 + (y % 8 ? 2 : 0); x < 50; x += 4) if(r.get(x, y) === 3) r.rect(x, y, 2, 1, 13);
    r.ell(12, 35, 7.5, 5.5, 13); r.ell(48, 33, 7.5, 5.5, 13); r.ell(12, 35, 4, 2.6, 5); r.ell(48, 33, 4, 2.6, 5);
    r.rect(18, 7, 24, 3, 13); r.line(21, 8, 12, -1, 13, 2); r.line(39, 8, 48, -1, 13, 2); r.ell(30, 6, 3, 2.5, 3);
    r.ell(30, 20, 11.5, 12, 2);
    r.line(22, 15, 16, 7, 3, 2); r.line(38, 15, 44, 7, 3, 2); r.line(23, 24, 19, 30, 3, 1); r.line(37, 24, 41, 30, 3, 1); r.line(30, 9, 30, 13, 3, 1);
    r.line(21, 14, 28, 17, 1, 2); r.line(32, 17, 39, 13, 1, 2);
    r.ell(25.5, 19, 3.4, 2, 14); r.ell(34.5, 19, 3.4, 2, 14); r.rect(26, 18, 2, 2, 1); r.rect(34, 18, 2, 2, 1);
    r.set(30, 21, 4); r.set(29, 23, 4); r.set(31, 23, 4);
    r.ell(30, 27, 4.6, 2.6, 4); r.rect(27, 26, 7, 1, 14);
    r.line(45, 36, 59, 24, 7, 5); r.line(46, 39, 58, 27, 8, 1);
    r.ell(60, 22, 3.4, 3.2, 2); r.rect(57, 24, 7, 2, 13); r.line(61, 20, 84, -1, 14, 2); r.line(63, 20, 84, 1, 9, 1);
    // the oni: flame mane, horns, green face, an orange robe with paper roundels, a clawed hand
    const ox = 87, oy = 24;
    for(let k = 0; k < 15; k++){ const an = k / 15 * 6.283 - 1.2, l = 15 + H1(k * 5.3) * 5; r.poly([[ox + Math.cos(an - .24) * 8, oy + Math.sin(an - .24) * 8], [ox + Math.cos(an) * l, oy + Math.sin(an) * l], [ox + Math.cos(an + .24) * 8, oy + Math.sin(an + .24) * 8]], k % 2 ? 3 : 5); }
    r.poly([[72, 36], [102, 35], [110, 58], [66, 58]], 6);
    for(let y = 40; y < 58; y += 6) for(let x = 70 + (y / 6 % 2) * 3; x < 108; x += 7) r.ell(x, y, 1.6, 1.6, 2, 6);
    r.line(78, 40, 67, 34, 10, 5); r.ell(64, 32, 4.2, 3.8, 8); r.line(61, 29, 58, 26, 14, 1); r.line(60, 32, 56, 31, 14, 1); r.line(61, 35, 57, 36, 14, 1);
    r.poly([[79, 17], [73, 2], [84, 14]], 2); r.poly([[95, 17], [101, 2], [90, 14]], 2);
    r.ell(ox, oy, 10.5, 11, 7);
    r.ell(82.5, 21, 3.4, 2.4, 5); r.ell(91.5, 21, 3.4, 2.4, 5); r.rect(83, 20, 2, 2, 1); r.rect(91, 20, 2, 2, 1);
    r.line(78, 17, 85, 19, 1, 2); r.line(89, 19, 96, 16, 1, 2);
    r.ell(ox, 30.5, 6.5, 3.2, 4); r.poly([[82, 28], [83.5, 33], [85, 28]], 14); r.poly([[89, 28], [90.5, 33], [92, 28]], 14);
    r.line(86, 22, 86, 25, 8, 1);
    // a pink sash streaming between them
    r.line(48, 44, 62, 50, 12, 3); r.line(62, 50, 70, 46, 12, 2);
    // the lantern band and placards
    r.rect(8, 56, 96, 8, 16); for(let j = 0; j < 5; j++) glyph(r, j, 18 + j * 16, 57, 17);
    r.rect(1, 44, 8, 20, 24); r.rect(103, 44, 8, 20, 24); for(let j = 0; j < 3; j++){ glyph(r, j + 1, 2, 46 + j * 6, 1); glyph(r, j + 3, 104, 46 + j * 6, 1); }
    const fig = bake(r, NP, { ink:1, outline:true, inner:true, rim:true, hot:true, grp:v => v >= 27 && v <= 30 ? 27 : v, noRim:v => v === 14 || v === 16 || v === 17 || v === 24 || v === 11 });
    // under the band: platform, kohaku skirt and carriers (no inner ink: they read as a dark lit crowd)
    const b = raster(NW, NH - 64);
    b.rect(6, 0, 100, 3, 18); for(let x = 8; x < 104; x += 3) b.rect(x, 3, 3, 5, (x / 3 | 0) % 2 ? 3 : 16);
    for(let j = 0; j < 12; j++){ const x = 10 + j * 8.4, up = (j + f) % 2 ? 1 : 0, cl = j % 3 === 1 ? 22 : 21;
      b.rect(x - 3, 11 - up, 6, 9, cl); b.line(x - 2, 11 - up, x + 1, 15 - up, cl === 22 ? 21 : 22, 1); b.ell(x, 9 - up, 2.2, 2.4, 11); b.rect(x - 2, 8 - up, 5, 1, 22); b.set(x + 1, 10 - up, 23); }
    const base = bake(b, NP, { ink:1, outline:true });
    const [c, k] = canvas(NW, NH); k.drawImage(base, 0, 64); k.drawImage(fig, 0, 0); return c; }); }
  // taiko cart: canopy, a big odaiko with a mitsudomoe, two drummers (frames 0 raised, 1 mid, 2 strike)
  function taiko(f){ return cache('tai' + f, () => { const w = 50, h = 46, r = raster(w, h), dc = 25, dy = 22;
    r.rect(5, 6, 2, 28, 19); r.rect(43, 6, 2, 28, 19);
    r.poly([[1, 7], [25, 0], [49, 7]], 18); r.rect(1, 7, 48, 2, 3); for(let x = 2; x < 48; x += 4) r.set(x, 9, 13);
    r.ell(9, 13, 2.5, 3, 3); r.ell(41, 13, 2.5, 3, 3); r.rect(8, 10, 3, 1, 1); r.rect(40, 10, 3, 1, 1);
    r.rect(3, 34, 44, 4, 19); for(let x = 4; x < 46; x += 3) r.rect(x, 38, 3, 3, (x / 3 | 0) % 2 ? 3 : 16);
    r.ell(11, 42, 4, 4, 20); r.ell(39, 42, 4, 4, 20); r.ell(11, 42, 1.5, 1.5, 19); r.ell(39, 42, 1.5, 1.5, 19);
    r.rect(15, 31, 20, 3, 19);
    r.ell(dc, dy, 11.5, 11.5, 4); r.ell(dc, dy, 9.5, 9.5, 2);
    for(let q = 0; q < 3; q++){ const an = q * 2.094 + .4; r.ell(dc + Math.cos(an) * 3.6, dy + Math.sin(an) * 3.6, 2.6, 2.6, 3); for(let t = 0; t < 6; t++){ const a2 = an + .3 + t * .2, rr2 = 3.6 + t * .5; r.set(dc + Math.cos(a2) * rr2, dy + Math.sin(a2) * rr2, 3); } }
    for(let q = 0; q < 18; q++){ const an = q / 18 * 6.283; r.set(dc + Math.cos(an) * 10.6, dy + Math.sin(an) * 10.6, 13); }
    for(const sd of [-1, 1]){ const x = dc + sd * 17;   // drummer
      r.rect(x - 2, 25, 5, 9, 21); r.line(x - 1, 25, x + 1, 29, 22, 1); r.ell(x + .5, 22, 2.3, 2.4, 11); r.rect(x - 2, 21, 5, 1, 22); r.set(x + .5 - sd, 23, 23);
      const sx = x + .5 - sd * 1, sy = 26, arm = f === 0 ? [sx - sd * 1, 17, sx - sd * 3, 12] : f === 1 ? [sx - sd * 3, 21, sx - sd * 7, 18] : [sx - sd * 4, 25, sx - sd * 8, 24];
      r.line(sx, sy, arm[0], arm[1], 23, 1); r.line(arm[0], arm[1], arm[2], arm[3], 19, 1); }
    return bake(r, NP, { ink:1, outline:true, inner:true }); }); }
  // two lantern bearers with tall poles (takahari chochin), frames bob
  function bearers(f){ return cache('bea' + f, () => { const r = raster(26, 50);
    for(let j = 0; j < 2; j++){ const x = 7 + j * 12, up = (j + f) % 2;
      r.rect(x - 2, 38 - up, 5, 8, 21); r.line(x - 1, 38 - up, x + 1, 42 - up, 22, 1); r.ell(x + .5, 36 - up, 2.2, 2.3, 11); r.rect(x - 1, 46 - up, 1, 4 + up, 11); r.rect(x + 1, 46 - up, 1, 4 + up, 11);
      r.line(x + 2, 40 - up, x + 2, 9 - up, 19, 1); r.ell(x + 2, 6 - up, 4.5, 6, 16); for(let y = 1; y < 12; y += 3) for(let xx = x - 3; xx < x + 8; xx++) if(r.get(xx, y - up) === 16) r.set(xx, y - up, y < 3 || y > 9 ? 3 : 24);
      r.ell(x + 2, 6 - up, 1.8, 1.8, 17); r.rect(x, -up, 5, 1, 1); r.rect(x, 12 - up, 5, 1, 1); }
    return bake(r, NP, { ink:1, outline:true }); }); }
  // haneto dancers: flower hats, white yukata, pink sashes; frames hop
  function haneto(f){ return cache('han' + f, () => { const r = raster(56, 28), FL = [5, 3, 7, 9, 14, 12, 6];
    for(let i = 0; i < 5; i++){ const x = 6 + i * 11, up = (i + f) % 2 ? 2 : 0, y0 = 4 - up;
      r.rect(x - 3, y0 + 9, 7, 11, 22); r.rect(x - 3, y0 + 13, 7, 2, 12); r.line(x - 3, y0 + 9, x + 3, y0 + 17, 3, 1);
      for(let q = 0; q < 6; q++) r.set(x - 2 + (q * 3) % 6, y0 + 10 + (q * 5) % 9, q % 2 ? 21 : 3);
      r.rect(x - 2, y0 + 20, 2, 4 - (up ? 1 : 0), 23); r.rect(x + 1, y0 + 20, 2, 4 - (up ? 0 : 1), 23);
      if(up){ r.line(x - 3, y0 + 10, x - 6, y0 + 5, 22, 1); r.line(x + 3, y0 + 10, x + 6, y0 + 5, 22, 1); } else { r.line(x - 3, y0 + 11, x - 6, y0 + 14, 22, 1); r.line(x + 3, y0 + 11, x + 6, y0 + 14, 22, 1); }
      r.ell(x + .5, y0 + 7.5, 2, 2, 23);
      r.ell(x + .5, y0 + 3, 5.5, 3.6, 12); for(let q = 0; q < 9; q++) r.set(x - 4 + (q * 7) % 10, y0 + 1 + (q * 3) % 5, FL[(q + i) % FL.length]); }
    return bake(r, NP, { ink:1, outline:true }); }); }
  // spectators at the kerb: yukata colours, heads, raised uchiwa fans, a child on shoulders; a warm rim from the lanterns on the road side
  const YK = ['#2a3a70', '#ece4d4', '#b8486a', '#3a5a8a', '#5a3a6a', '#24304a', '#d8c09a'];
  /* W11 #23 (2026-11-21): the bodies were flat rectangles overlapping by a pixel, so a row of spectators merged into one block of colour
     patches, and at the right kerb (2.5-4x) that block was all you saw. Same layout and the same H1 draws; added per figure: a shaded
     column on the side away from the lanterns (which also parts each figure from the one behind), a yukata collar V with the neck,
     and a dark hem row. YKD holds the shaded yukata colours (made in the builder: mixc is not defined yet when this file loads). */
  function crowd(v, f){ return cache('cr' + v + f, () => { const w = 66, h = 25, r = raster(w, h), YKD = YK.map(c => mixc(c, '#140a1c', .42)), pal = NP.concat(YK, ['#ff6a4a', '#ffd04a', '#ff90b4', '#ffb070'], YKD), base = NP.length, OBI = base + YK.length, RIM = OBI + 3, SHD = RIM + 1 - base;
    let x = 1, j = 0;
    while(x < w - 6){ const kid = H1(v * 17 + j * 5.9) > .8, hh = kid ? 10 + Math.floor(H1(j * 2.3 + v) * 2) : 15 + Math.floor(H1(v * 31 + j * 3.3) * 5), top = h - hh, cl = base + Math.floor(H1(v * 7 + j * 1.7) * YK.length), bw = kid ? 5 : 7;
      r.rect(x, top + 5, bw, hh - 5, cl); r.rect(x + 1, top + 4, bw - 2, 1, cl);
      { const sh = cl + SHD, cc = x + (bw >> 1), wc = cl === base + 1 ? base : base + 1; r.rect(x, top + 5, 1, hh - 5, sh); r.rect(x, h - 1, bw, 1, sh);   // shade column and hem (W11 #23)
        if(!kid){ r.set(cc - 1, top + 5, wc); r.set(cc + 1, top + 5, wc); r.set(cc, top + 6, wc); r.set(cc, top + 5, RIM); } }
      r.rect(x, top + 8 + (kid ? -1 : 0), bw, 2, OBI + (j + v) % 3);
      if(H1(j * 9.3 + v) > .5) { r.set(x + 1, top + 11, OBI + 1); r.set(x + 3, top + 14, OBI + 1); }
      r.rect(x + 1, top - 1, bw - 2, 5, 11); r.rect(x + 2, top - 2, bw - 4, 1, 11); r.set(x + bw - 2, top + 1, 23); r.set(x + bw - 2, top + 2, 23); r.set(x + bw - 3, top + 2, 23); r.set(x + bw - 2, top - 1, RIM); r.set(x + bw - 3, top - 2, RIM);
      if(!kid && H1(v * 5 + j * 9.1) > .6){ const up = (j + f) % 2, fy = top - 2 - up * 2, fx = x + bw; r.line(x + bw - 1, top + 6, fx, fy + 2, 23, 1); r.ell(fx + .5, fy - 1, 2.4, 2.4, (j % 2) ? 3 : 16); r.set(fx, fy - 1, j % 2 ? 16 : 3); }
      x += bw - 1 + (H1(j * 4.1 + v) > .75 ? 1 : 0); j++; }
    return bake(r, pal, { ink:1, outline:true, noInk:q => q === RIM }); }); }
  // the far side of the cross street: a row of two-storey machiya, lit lattices, noren, red lanterns along the eave, a few figures
  function farWall(v){ return cache('fw' + v, () => { const w = 104, h = 50, r = raster(w, h), pal = NP.concat(['#3a2430', '#ffcf7a', '#ffe8b0', '#4a3040', '#24161e', '#c88a4a']), DK = NP.length, LT = DK + 1, LT2 = DK + 2, WD = DK + 3, RF = DK + 4, LTD = DK + 5;
    r.rect(0, 3, w, 47, DK); r.poly([[0, 9], [6, 0], [w, 0], [w, 9]], RF); for(let x = 0; x < w; x += 3) r.set(x, 8, 26);
    for(let b = 0; b < 4; b++){ const x0 = 2 + b * 26;
      r.rect(x0, 11, 22, 10, LT); for(let x = x0 + 2; x < x0 + 22; x += 3) r.rect(x, 11, 1, 10, LTD); r.rect(x0, 15, 22, 1, LTD); r.rect(x0 - 1, 10, 24, 1, WD); r.rect(x0 - 1, 21, 24, 1, WD);
      r.rect(x0 - 2, 22, 26, 3, RF); r.rect(x0 - 2, 25, 26, 1, 1);
      r.rect(x0, 27, 22, 19, LT2); for(let q = 0; q < 3; q++){ r.rect(x0 + q * 7 + 1, 27, 6, 7, (b + v + q) % 2 ? 21 : 3); } glyph(r, b + v, x0 + 8, 28, 22);
      r.rect(x0 - 1, 26, 1, 20, WD); r.rect(x0 + 22, 26, 1, 20, WD); }
    for(let x = 4; x < w; x += 9){ r.ell(x, 28, 2.4, 3, 3); r.rect(x - 1, 24, 3, 1, 1); r.rect(x - 1, 31, 3, 1, 1); r.set(x, 28, 16); }
    for(let j = 0; j < 7; j++){ const x = 6 + j * 14 + H1(j + v * 9) * 6, hh = 8 + H1(j * 3 + v) * 3; r.rect(x, 50 - hh, 4, hh, 11); r.ell(x + 2, 50 - hh - 1, 1.8, 2, 11); }
    return bake(r, pal, {}); }); }
  // paper lanterns for the strings over the road: red with a white mark, white with a red mark
  function chochin(v){ return cache('ch' + v, () => { const r = raster(7, 10), body = v ? 16 : 3, rib = v ? 4 : 4;
    r.ell(3.5, 5, 3.5, 4.5, body); for(let y = 2; y < 9; y += 2) for(let x = 0; x < 7; x++) if(r.get(x, y) === body) r.set(x, y, rib);
    r.ell(3.5, 5, 3.5, 4.5, body, 0); r.rect(2, 4, 3, 2, v ? 17 : 16); r.rect(2, 0, 3, 1, 1); r.rect(2, 9, 3, 1, 1);
    return bake(r, NP, { ink:1, outline:false }); }); }
  // smoke: a dithered disc in three density steps (Hiroshige's grey cloud behind the burst)
  function smoke(n){ return cache('sm' + n, () => { const s = [18, 30, 46][n], [c, k] = canvas(s, s), R0 = s / 2; k.fillStyle = '#4c4660';
    for(let y = 0; y < s; y++) for(let x = 0; x < s; x++){ const d = Math.hypot(x + .5 - R0, y + .5 - R0) / R0 + (H1(x * 3.1 + y * 7.7 + n) - .5) * .25; if(d >= 1) continue;
      const lv = d < .45 ? .55 : d < .75 ? .32 : .14; if(BAYER[(y & 3) * 4 + (x & 3)] < lv) k.fillRect(x, y, 1, 1); } return c; }); }

  /* ================================================================ fireworks */
  const FP = { gold:['#fffbe8', '#ffe28a', '#e0a440', '#9a6228', '#5a3418'], red:['#fff0f0', '#ff6a6a', '#e02a4a', '#9a1838', '#4a0c20'],
    pink:['#fff0fa', '#ff9ad8', '#e0509a', '#9a2a6a', '#4a1438'], green:['#f0fff0', '#8aff9a', '#3ad06a', '#1e8a4a', '#0e4028'],
    blue:['#f0f6ff', '#8ab8ff', '#4a6aff', '#2a3aa8', '#141c50'], violet:['#f8f0ff', '#c89aff', '#9a5aff', '#5a2aa8', '#2a1450'],
    silver:['#ffffff', '#e8ecff', '#aab4d0', '#6a7290', '#363a50'], orange:['#fff4e0', '#ffb860', '#ff7a2a', '#b04a1a', '#58240e'] };
  const PK = Object.keys(FP);
  // unit directions on a circle, cached per star count (two phase variants), so no trig or allocation per frame
  const dirs = (n, v) => cache('dir' + n + ':' + v, () => { const o = new Float32Array(n * 2); for(let i = 0; i < n; i++){ const t = (i + v * .5) / n * 6.283; o[i * 2] = Math.cos(t); o[i * 2 + 1] = Math.sin(t); } return o; });
  const SHAPES = {
    heart:(() => { const o = []; for(let i = 0; i < 30; i++){ const t = i / 30 * 6.283; o.push(16 * Math.pow(Math.sin(t), 3) / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17); } return new Float32Array(o); })(),
    smile:(() => { const o = []; for(let i = 0; i < 30; i++){ const t = i / 30 * 6.283; o.push(Math.cos(t), Math.sin(t)); } o.push(-.35, -.32, -.35, -.2, .35, -.32, .35, -.2); for(let i = 0; i < 9; i++){ const t = .5 + i / 8 * 2.14; o.push(Math.cos(t) * .55, Math.sin(t) * .55); } return new Float32Array(o); })() };
  // a shell: dz 0 = near (big, high, wide apart) .. 1 = far (small, low, bunched at the venue); bearing bx is a screen fraction that slides
  // with the road's curves like the far hills; h and R in canvas px
  const shows = [], parades = [], bursts = [];
  let beat = 0, lastHB = -1, T = 0, lastPos = 0, drumStep = -1, fstFrame = -1;
  // the venue's swing with the bends (CSS px). It was -skyOff * 200, but skyOff is the heading swung through since the ride began (unbounded),
  // so a night of bends put the show off-screen or slid it out mid-show (Kellan, 2026-11-23: the 花火 card, then no fireworks). Now, the way
  // env/coast.js anchors its backdrop: the turn since the show came into view (S.sk0 eases after the heading over ~5 s), tanh-bound to 15% of W
  let SKX = 0;
  const skyX = (S, dt) => { if(S.sk0 === undefined) S.sk0 = skyOff; else S.sk0 += (skyOff - S.sk0) * Math.min(1, dt / 5); const A = W * .15 * NARW(); SKX = -A * Math.tanh((skyOff - S.sk0) * 200 / A); };
  function unitC(){ return H / PX / 253; }
  const NARW = () => clamp(W / H * 1.1, .5, 1);   // portrait phones: shells are sized by H, so the venue and its spread pull in toward the middle
  const band = S => (S.key === 'coast' ? -.2 : .2) * NARW();   // the venue: between the vanishing point and one side (paddies: right, coast: the sea, left)
  function addShell(type, S, D, tb, opt = {}){
    if(bursts.length >= (reduce ? 8 : 20)) return;
    const u = unitC(), seed = H1(tb * 13.7 + bursts.length * 3.1 + S.start), dz = opt.dz !== undefined ? opt.dz : H1(seed * 4.9), sc = .62 + .48 * clamp(1 - D / 660, 0, 1);
    const base = { kiku:lerp(54, 18, dz), botan:lerp(44, 16, dz), ring:lerp(40, 16, dz), heart:26, smile:26, kamuro:lerp(50, 32, dz), shaku:58 }[type];
    const R = base * u * sc * (opt.big || 1), spread = lerp(.34, .14, dz), bx = clamp(opt.bx !== undefined ? opt.bx : band(S) + (seed - .5) * spread * NARW(), -.3 * NARW(), .3 * NARW());
    const h = Math.max(R * 1.15 + 10 * u, Math.min(118 * u - R * .95, R * 1.1 + lerp(22, 4, dz) * u + H1(seed * 9) * 12 * u * (1 - dz)));
    const b = { type, tb, rise:opt.rise || (type === 'shaku' ? 3 : 2), seed, bx, h, R, dz, life:{ kamuro:4.6, shaku:5.4, heart:2.6, smile:2.6 }[type] || 3.2, fired:false, D };
    b.pal = type === 'kamuro' || type === 'shaku' || type === 'smile' ? FP.gold : type === 'heart' ? FP.pink : FP[PK[Math.floor(H1(seed * 5.3) * PK.length)]];
    b.pal2 = FP[PK[Math.floor(H1(seed * 8.1) * PK.length)]]; if(b.pal2 === b.pal) b.pal2 = FP.silver;
    b.pistil = (type === 'kiku' && H1(seed * 2.2) < .55) || type === 'shaku';
    if(reduce) b.life *= 1.25;
    bursts.push(b); }
  // what launches on each half beat, by distance to the launch site. The finale is scripted from the first beat at D <= 120:
  // twelve chrysanthemums half a beat apart, each nearer and bigger, then a gold kamuro curtain, then one big shell.
  function plan(h, S, D){ const onBeat = h % 2 === 0, bib = (h >> 1) % 4, bar = h >> 3, tb = h / 2, r = H1(h * 1.37 + S.start);
    if(D > 640) return;
    const pick = a => a[Math.floor(H1(h * 2.71 + S.start) * a.length)];
    if(D <= 120 && S.f0 === undefined) S.f0 = h + (h % 2);
    // the opening salvo: the 花火 card (update) sets S.op, and five shells launch on its beats so they bloom while the card holds and
    // hang after it goes (before, the card came at D 420, where the build had one small low shell every bar: hidden by the viaduct). Mid
    // height (dz .4-.5), below the card's poster band at the top of the screen; either side of the venue, then a ring over it
    if(S.op !== undefined && S.f0 === undefined){ const k = h - S.op;
      if(reduce){ if(k === 0 || k === 4) addShell('kiku', S, D, tb + 2, { dz:.45, bx:band(S) + (k ? .1 : -.1) }); }
      else if(k === 0 || k === 1 || k === 3) addShell('kiku', S, D, tb + 2, { dz:.4 + k * .03, bx:band(S) + [-.17, .05, 0, -.08][k] });
      else if(k === 4) addShell('ring', S, D, tb + 2, { dz:.5, bx:band(S) - .03 });
      else if(k === 6) addShell('kamuro', S, D, tb + 2, { dz:.45, bx:band(S) - .02 }); }
    if(S.f0 !== undefined){ const k = h - S.f0; if(k < 0) return;
      if(reduce){ if(k <= 12 && k % 4 === 0) addShell('kiku', S, D, tb + 2, { dz:.55 - k * .03 }); else if(k === 16) for(const o of [-.12, 0, .12]) addShell('kamuro', S, D, tb + 2, { bx:band(S) + o, dz:.25 }); else if(k === 28) addShell('shaku', S, D, tb + 3, { bx:band(S), dz:0 }); return; }
      if(k < 12) addShell('kiku', S, D, tb + 2, { dz:clamp(.78 - k * .07 + (r - .5) * .16, 0, 1) });
      else if(k === 14) for(let q = 0; q < 5; q++) addShell('kamuro', S, D, tb + 2, { bx:band(S) + (q - 2) * .1, dz:.2 + Math.abs(q - 2) * .12 });
      else if(k === 24) addShell('shaku', S, D, tb + 3, { bx:band(S), dz:0 });
      return; }
    if(reduce){ if(onBeat && bib === 0 && bar % 2 === 0) addShell(pick(['kiku', 'botan', 'ring', 'heart', 'smile']), S, D, tb + 2); return; }
    if(D > 420){ if(onBeat && bib === 0 && bar % 2 === 0) addShell(pick(['kiku', 'kiku', 'botan']), S, D, tb + 2, { dz:.55 + r * .45 }); }
    else if(D > 240){ if(onBeat && bib === 0) addShell(pick(['kiku', 'kiku', 'botan', 'ring']), S, D, tb + 2); if(onBeat && bib === 2 && r < .45) addShell(pick(['heart', 'smile', 'botan']), S, D, tb + 2, { dz:.4 }); }
    else { if(onBeat && (bib === 0 || bib === 2)) addShell(bib === 0 ? 'kiku' : pick(['kiku', 'botan', 'ring']), S, D, tb + 2); else if(onBeat && r < .35) addShell('botan', S, D, tb + 2, { dz:.7 + r * .3 }); } }

  // drawing in canvas-pixel units. MIRR draws into the flooded fields: mirrored about the horizon and squashed toward it, the way the
  // paddies artist puts the moon in every field rather than one physical reflection, so the reflections land on the water beside the road
  let MIRR = false, HZC = 0, S_KEY = '';
  const MSQ = .5, my = Y => MIRR ? HZC + (HZC - Y) * MSQ : Y;
  // stars are batched on the context's own path, one fill per colour (no Path2D, no per-frame allocation)
  let CUR_COL = '';
  function col(c){ if(c === CUR_COL) return; cx.fill(); cx.beginPath(); cx.fillStyle = c; CUR_COL = c; }
  function px(X, Y, w, h){ const yy = Math.round(my(Y)); if(MIRR && (yy <= HZC || (yy & 3) === 3)) return; cx.rect(Math.round(X) * PX, yy * PX, w * PX, h * PX); }
  const stage = q => q < .05 ? 0 : q < .5 ? 1 : q < .74 ? 2 : q < .9 ? 3 : 4;
  const easeR = (a, k) => (1 - Math.exp(-a * k)) / (1 - Math.exp(-k * 1.2));
  let BY = 0;
  function bxy(b, hz){ BY = hz / PX - b.h; return MIRR && b.mxOK ? b.mx : (W * (.5 + b.bx) + SKX) / PX; }   // X; sets BY (no array per call)
  // halos: stepped discs (four flat alpha steps) cached per colour and size, drawn 1:1 on the pixel grid with 'lighter'
  const HALO_R = [8, 13, 20, 28, 38, 50, 64];
  function halo(col, n){ return cache('ha' + col + n, () => { const r0 = HALO_R[n], s = r0 * 2 + 2, [c, k] = canvas(s, s), [R, G, B] = hx(col);
    for(const [f, a] of [[1, .06], [.72, .09], [.46, .15], [.22, .3]]){ k.fillStyle = `rgba(${R},${G},${B},${a})`; const rr = r0 * f;
      for(let y = 0; y < s; y++){ const dy = y + .5 - s / 2; if(Math.abs(dy) > rr) continue; const hw = Math.round(Math.sqrt(rr * rr - dy * dy)); k.fillRect(s / 2 - hw, y, hw * 2, 1); } } return c; }); }
  function drawHalo(hc, X, Y, r, al){ if(al <= .01) return; cx.fill(); cx.beginPath(); let n = 0; while(n < HALO_R.length - 1 && HALO_R[n] < r) n++; const c = halo(hc, n), s = c.width, hh = MIRR ? Math.round(s * MSQ) : s;
    cx.globalAlpha = al; cx.drawImage(c, (Math.round(X) - s / 2) * PX, (Math.round(my(Y)) - hh / 2) * PX, s * PX, hh * PX); cx.globalAlpha = 1; }
  function drawBurst(b, X, Y, a, tw){ const q = a / b.life, R = b.R, st = stage(q), slow = reduce ? .72 : 1, u = unitC(), A = a * slow;
    const heavy = b.type === 'kamuro' || b.type === 'shaku', g = (heavy ? 10 : 4) * u, k = heavy ? 2.6 : 4.4;
    const fall = aa => { const t = Math.max(0, aa - .3); return g * t * t; };
    const big = R > 24 * u, show = i => st < 4 || i % 2 === 0;   // embers thin out by a fixed half: nothing blinks frame to frame
    if(b.type === 'heart' || b.type === 'smile'){ const s = SHAPES[b.type], rr = R * easeR(A, k), fy = fall(A) * .5; col(b.pal[st]);
      for(let i = 0; i < s.length / 2; i++) if(show(i)) px(X + s[i * 2] * rr, Y + s[i * 2 + 1] * rr + fy, 2, MIRR ? 1 : 2);
      if(st <= 1 && !MIRR){ col(b.pal[0]); for(let i = 0; i < s.length / 2; i += 2) px(X + s[i * 2] * rr, Y + s[i * 2 + 1] * rr + fy, 1, 1); } return; }
    if(b.type === 'ring'){ const n = 48, d = dirs(n, 0), tilt = .3 + b.seed * .5, cr = Math.cos(b.seed * 3), sr = Math.sin(b.seed * 3), rr = R * easeR(A, k), fy = fall(A); col(b.pal[st]);
      for(let i = 0; i < n; i++){ if(!show(i)) continue; const x = d[i * 2], y = d[i * 2 + 1] * tilt; px(X + (x * cr - y * sr) * rr, Y + (x * sr + y * cr) * rr + fy, big ? 2 : 1, MIRR ? 1 : big ? 2 : 1); }
      const d2 = dirs(16, 1); col(b.pal2[Math.min(4, st + 1)]); for(let i = 0; i < 16; i++) px(X + d2[i * 2] * rr * .3, Y + d2[i * 2 + 1] * rr * .3 + fy, 1, 1); return; }
    // chrysanthemum, peony, willow, the big shell: stars on a crisp circle; streaks inward (darkest first), then heads with a hot core
    const n = b.type === 'shaku' ? 72 : b.type === 'kamuro' ? 40 : big ? 56 : 40, d = dirs(n, b.seed < .5 ? 0 : 1);
    const trail = MIRR || b.type !== 'kamuro' ? 0 : 9, dt = .1;
    if(b.type === 'kiku' || b.type === 'shaku'){ // radial streaks from the centre out to each star, dotted every 3px, one colour step darker for the inner half
      const L = clamp(.62 - q * .75, .14, .62), r0 = R * easeR(A, k), f0y = fall(A);
      for(let s3 = MIRR ? 1 : 2; s3 >= 1; s3--){ const lv = Math.min(4, st + s3); if(lv >= 4) continue; col(b.pal[lv]);
        const fa = 1 - L * s3 / 2, fb = 1 - L * (s3 - 1) / 2, np = Math.max(1, Math.round((fb - fa) * r0 / 3));
        for(let i = 0; i < n; i++){ const dx = d[i * 2] * r0, dy = d[i * 2 + 1] * r0; for(let m = 0; m < np; m++){ const f = fa + (fb - fa) * (m + .5) / np; px(X + dx * f, Y + dy * f + f0y * f, 1, MIRR ? 2 : 1); } } } }
    for(let j = trail; j >= 1; j--){ const aa = A - j * dt; if(aa <= 0) continue;
      const lv = b.type === 'kiku' ? Math.min(4, st + 1 + (j >> 1)) : Math.min(4, (j < 3 ? 1 : j < 6 ? 2 : 3) + (q > .6 ? 1 : 0)); if(lv >= 4 && b.type === 'kiku') continue;
      col(b.pal[lv]); const rr = R * easeR(aa, k), fy = fall(aa); for(let i = 0; i < n; i++) px(X + d[i * 2] * rr, Y + d[i * 2 + 1] * rr + fy, 1, 1); }
    const rr = R * easeR(A, k), fy = fall(A), pal = b.type === 'kiku' && q > .55 ? b.pal2 : b.pal, sz = big && st <= 2 ? 2 : 1;
    col(pal[st]); for(let i = 0; i < n; i++) if(show(i)){ const jr = 1 + (H1(i * 3.3 + b.seed) - .5) * .05; px(X + d[i * 2] * rr * jr - (sz - 1) * .5, Y + d[i * 2 + 1] * rr * jr + fy - (sz - 1) * .5, sz, MIRR ? 2 : sz); }
    if(b.type === 'botan'){ col(pal[Math.min(4, st + 1)]); for(let i = 0; i < n; i += 2) if(show(i)) px(X + d[i * 2] * rr * .68, Y + d[i * 2 + 1] * rr * .68 + fy, 1, MIRR ? 2 : 1); }
    if(sz === 2 && !MIRR){ col(pal[0]); for(let i = 0; i < n; i++) if(show(i)){ const jr = 1 + (H1(i * 3.3 + b.seed) - .5) * .05; px(X + d[i * 2] * rr * jr, Y + d[i * 2 + 1] * rr * jr + fy, 1, 1); } }
    if(b.pistil){ const d2 = dirs(24, 1), r2 = rr * .45; col(b.pal2[Math.min(4, st + (q > .4 ? 1 : 0))]); for(let i = 0; i < 24; i++) if(show(i + 99)) px(X + d2[i * 2] * r2, Y + d2[i * 2 + 1] * r2 + fy * .8, 1, MIRR ? 2 : 1); } }
  // all shells: halos behind, stars, then the white-hot flash of each new burst
  function drawShells(hz, mirAl){ const tw = Math.floor(T * 11), u = unitC(); cx.beginPath(); CUR_COL = '';
    for(const b of bursts){ const a = (beat - b.tb) * SPB, X = bxy(b, hz), Y = BY; if(a < 0 || a > b.life || X < -b.R * 2.5 || X > W / PX + b.R * 2.5) continue;
      const al = reduce ? (a < b.life * .6 ? .32 : .16) : a < .35 ? .6 : a < 1.1 ? .4 : a < b.life * .6 ? .22 : .1; drawHalo(b.pal[1], X, Y + b.R * .1, b.R * 1.3, al * mirAl); }
    for(const b of bursts){ const a = (beat - b.tb) * SPB, X = bxy(b, hz), Y = BY; if(X < -b.R * 2.5 || X > W / PX + b.R * 2.5) continue;
      if(a < 0){ if(MIRR) continue; const rs = b.rise * SPB, p = 1 + a / rs; if(p < 0) continue;   // rising tail: a gold head and a wavering dotted trail
        const y0 = hz / PX - (S_KEY === 'coast' ? 1 : 8 * u), yy = y0 + (Y - y0) * (1 - (1 - p) * (1 - p));
        for(let j = 0; j < 7; j++){ const yj = yy + j * 2.2 * u, wig = Math.sin((yj + b.seed * 40) * .45) * .8; if(yj > y0) break; if(j > 1 && j % 2) continue; col(j === 0 ? '#fff6dc' : j < 3 ? '#ffd07a' : '#9a6228'); px(X + wig, yj, 1, 1); }
        continue; }
      if(a > b.life) continue; drawBurst(b, X, Y, a, tw);
      if(a < .3 && !reduce && !MIRR){ drawHalo('#ffffff', X, Y, b.R * .32, (a < .15 ? .6 : .3)); const gl = a < .15 ? 3 : 2; col(b.pal[0]); px(X - gl, Y, gl * 2 + 1, 1); px(X, Y - gl, 1, gl * 2 + 1); } }  cx.fill(); cx.beginPath(); }
  function drawSmoke(hz){ for(const b of bursts){ const a = (beat - b.tb) * SPB; if(a < .25 || a > 7) continue; const X = bxy(b, hz), Y = BY, n = b.R > 34 * unitC() ? 2 : b.R > 18 * unitC() ? 1 : 0, s = smoke(n);
      cx.globalAlpha = .22 * (a < .7 ? (a - .25) / .45 : 1) * (1 - a / 7); const dw = s.width * PX; cx.drawImage(s, sn(X * PX - dw / 2 + a * PX * 1.5), sn(Y * PX - dw / 2 + (b.type === 'kamuro' ? a * PX : -a * PX * .6)), dw, dw); } cx.globalAlpha = 1; }

  function activeShow(ps){ for(const S of shows) if(ps >= S.start + 5 && ps <= S.peak + 260) return S; return null; }
  function activePar(ps){ for(const P of parades) if(ps >= P.z - 340 && ps <= P.z + 30) return P; return null; }

  /* ================================================================ sound: built on M's context and output */
  const AC = () => M.ac && M.ac.state === 'running' && M.out ? M.ac : null;
  function thump(at, f0, f1, dur, v){ const a = AC(); if(!a || v < .002) return; const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur * .7);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(v, at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + dur); o.connect(g).connect(M.out); o.start(at); o.stop(at + dur + .05); }
  function whistle(at, dur, v){ const a = AC(); if(!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(900, at); o.frequency.exponentialRampToValueAtTime(1900, at + dur);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(v, at + .1); g.gain.linearRampToValueAtTime(0, at + dur); o.connect(g).connect(M.out); o.start(at); o.stop(at + dur + .05); }
  function boomFor(b, D){ const a = AC(); if(!a) return; const near = clamp(1 - D / 700, .2, 1), v = near * (b.type === 'star' ? .4 : b.type === 'shaku' ? 1.3 : 1), delay = .25 + clamp(D / 640, 0, 1) * .9, at = a.currentTime + delay;
    thump(at, 120, 34, 1.4, .2 * v); M.noise(1.1, 110, .28 * v, at); M.noise(.3, 700, .05 * v, at);
    if(b.type === 'kamuro' || b.type === 'shaku') for(let j = 0; j < 16; j++) M.noise(.025, 3000 + H1(j + b.seed * 9) * 4000, .028 * v, at + .7 + j * .09 + H1(j * 3 + b.seed) * .06); }
  // the taiko pattern in sixteenths: big don on the beats, doko pickups, the shime's ka, chappa cymbals on the off beats
  function drums(D){ const a = AC(); if(!a || D > 300 || D < -40){ drumStep = -1; return; } const s16 = SPB / 4, stepF = M.step - (M.next - a.currentTime) / s16, v = Math.pow(clamp(1 - Math.abs(D) / 300, 0, 1), 1.6) * .9;
    if(drumStep < 0) drumStep = Math.floor(stepF);
    while(drumStep < stepF + .2 / s16){ drumStep++; const pos = ((drumStep % 16) + 16) % 16, at = a.currentTime + (drumStep - stepF) * s16; if(at < a.currentTime) continue;
      if(pos % 4 === 0) { thump(at, 98, 50, .5, .32 * v); M.noise(.08, 240, .14 * v, at); }
      if(pos === 6 || pos === 14) thump(at, 120, 70, .22, .16 * v); if(pos === 7 || pos === 15) thump(at, 110, 64, .22, .14 * v);
      if(pos === 2 || pos === 10) M.noise(.04, 2600, .06 * v, at); if(pos === 4 || pos === 12) M.noise(.14, 7200, .035 * v, at); } }
  function beatAudio(){ const a = AC(); if(!a || !M.step) return null; return (M.step - (M.next - a.currentTime) / (SPB / 4)) / 4; }

  /* ================================================================ parade geometry */
  // u: the procession's progress along the cross street (half-road widths, in its direction of travel), from the rider's distance
  function parU(D){ const t = clamp((262 - D) / 250, 0, 1), e = t * t * (3 - 2 * t); return D >= 12 ? lerp(-4, -.64, e) : -.64 + (12 - D) * .006; }
  const PEL = [ // offset along the street, sprite, width in half-roads, hit half-width
    { o:2.45, k:'bea', w:.5, hit:.17 }, { o:1.7, k:'tai', w:.5, hit:.27 }, { o:0, k:'neb', w:1.08, hit:.47 }, { o:-1.4, k:'han', w:.58, hit:0 }, { o:-2.1, k:'han', w:.58, hit:0, f:1 } ];

  const KILL_SIDE = new Set(['fac', 'blade', 'vend', 'yatai', 'neko', 'crowd', 'signal', 'lamp', 'cat', 'pachinko', 'sign']);
  const KILL_OVER = new Set(['gate', 'bridge', 'train', 'jumbo', 'lstr', 'arch', 'rail']);

  function drawParade(s, P, sx0, sy0, uw, fog, now){ const ps = (position + PZ) / SEG, D = P.z + .5 - ps, u = parU(D), a0 = 1 - fog * .7;
    const stepF = (() => { const ac = AC(); return ac && M.step ? M.step - (M.next - ac.currentTime) / (SPB / 4) : T * BPM / 15; })(), bp = ((stepF % 4) + 4) % 4;
    const dfr = reduce ? 1 : bp < 1 ? 2 : bp < 2.6 ? 0 : 1, bob = reduce ? 0 : Math.floor(now / 300) % 2, hop = reduce ? 0 : Math.floor(stepF / 2) % 2;
    // warm light first: pools on the asphalt, the wet-road reflection, the halo
    // W11 #23: passing the crossing, an element beside the camera reached ~20x (the float as a wall of flat blocks round the rider's
    // cut-out); each one now fades from 7x to 12x, its light with it (pf: its scale fade, from the same width its blit uses)
    const pf = e => scaleFade(uw * e.w / (e.k === 'neb' ? NW : e.k === 'tai' ? 50 : e.k === 'bea' ? 26 : haneto(0).width), 7, 12);
    for(const e of PEL){ const X = P.dir * (u + e.o), x = sx0 + X * uw; if(x < -uw * 2 || x > W + uw * 2) continue; const a = a0 * pf(e); if(a <= 0) continue;
      if(e.k === 'neb'){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = '#ff9a40';
        for(const [rf, al] of [[1, .05], [.72, .07], [.45, .09]]){ cx.globalAlpha = al * a; cx.beginPath(); cx.ellipse(x, sy0, uw * .95 * rf, uw * .16 * rf, 0, 0, 6.283); cx.fill(); }
        const spr = nebuta(0), k = uw * e.w / NW; cx.globalAlpha = .32 * a; blitF(cache('nebR', () => reflOf(nebuta(0))), x, sy0 + spr.height * k * .62, k * 1, P.dir < 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
        glow(x, sy0 - spr.height * k * .62, uw * .95, '#ffb050', .26 * a); glow(x, sy0 - spr.height * k * .6, uw * .45, '#fff0c0', .12 * a); }
      else if(e.k === 'tai'){ const k = uw * e.w / 50; glow(x - 16 * k, sy0 - 33 * k, uw * .12, '#ff6a3a', .45 * a); glow(x + 16 * k, sy0 - 33 * k, uw * .12, '#ff6a3a', .45 * a); }
      else if(e.k === 'bea'){ const k = uw * e.w / 26; for(let j = 0; j < 2; j++) glow(x + (-4 + j * 12) * k, sy0 - 44 * k, uw * .17, '#fff0c8', .5 * a); } }
    for(const e of PEL){ const X = P.dir * (u + e.o), x = sx0 + X * uw; if(x < -uw * 2 || x > W + uw * 2) continue;
      const spr = e.k === 'neb' ? nebuta(bob) : e.k === 'tai' ? taiko(dfr) : e.k === 'bea' ? bearers(bob) : haneto((hop + (e.f || 0)) % 2), k = uw * e.w / spr.width, sf = scaleFade(k, 7, 12);
      if(sf <= 0) continue; cx.globalAlpha = a0 * sf; blitF(spr, x, sy0, k, P.dir < 0); }
    cx.globalAlpha = 1; }

  function drawCrossStreet(s, fog){ const a = s.p1.screen, b = s.p2.screen; if(b.y >= a.y) return; const col = mixc('#161424', '#3a1a40', fog * .6);
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(-PX, a.y); cx.lineTo(a.x - a.w, a.y); cx.lineTo(b.x - b.w, b.y); cx.lineTo(-PX, b.y); cx.closePath(); cx.moveTo(W + PX, a.y); cx.lineTo(a.x + a.w, a.y); cx.lineTo(b.x + b.w, b.y); cx.lineTo(W + PX, b.y); cx.closePath(); cx.fill();
    if(s.fx_xs === 2 && a.y - b.y >= 1){ cx.fillStyle = mixc('#d8d0c0', '#3a1a40', fog * .7); const yy = sn((a.y + b.y) / 2), hh = Math.max(PX, sn((a.y - b.y) * .25));
      for(const sd of [-1, 1]) for(let q = 0; q < 8; q++){ const x0 = a.x + sd * a.w * (1.25 + q * .6), x1 = a.x + sd * a.w * (1.55 + q * .6); if(Math.min(x0, x1) > W || Math.max(x0, x1) < 0) continue; cx.fillRect(sn(Math.min(x0, x1)), yy, sn(Math.abs(x1 - x0)), hh); } } }

  function drawString(s, sx0, sy0, uw, fog, now){ if(uw < 3) return; const x0 = sx0 - uw * 1.75, x1 = sx0 + uw * 1.75, ya = sy0 - uw * 1.7, sag = uw * .3, n = 11, a = 1 - fog * .7;
    cx.fillStyle = '#0c0812'; const nq = uw > 60 ? 22 : 8; for(let q = 0; q <= nq; q++){ const t = q / nq; cx.fillRect(sn(x0 + (x1 - x0) * t), sn(ya + sag * 4 * t * (1 - t)), Math.ceil((x1 - x0) / nq / PX + 1) * PX, PX); }
    const k = uw * .16 / 7, sw = reduce ? 0 : Math.sin(now / 700 + s.index) * uw * .008;
    for(let j = 0; j < n; j++){ const t = (j + .5) / n, lx = x0 + (x1 - x0) * t + sw, ly = ya + sag * 4 * t * (1 - t) + 11 * k, v = (j + s.index) % 3 === 1 ? 1 : 0;
      if(fog < .5) glow(lx, ly - 5 * k, uw * .13, v ? '#fff0d0' : '#ff6a3a', .42 * a); cx.globalAlpha = a; blitF(chochin(v), lx, ly, k, false); cx.globalAlpha = 1; } }

  /* ================================================================ the paddies mirror: fireworks in the flooded fields */
  // the water beside the road as a clip on the context itself (no Path2D per frame); same edge as the paddies artist's water (1.42 roads)
  function clipWater(){ const base = segAt(position).index; let any = false; cx.beginPath();
    for(let n = 1; n < DRAW; n++){ const s = segs[base + n]; if(!s) break; if(LANDS[s.land].key !== 'paddies' || s.p1.camera.z <= DEPTH) continue; const a = s.p1.screen, b = s.p2.screen, clip = s.clip || H;
      if(b.y >= a.y || b.y >= clip) continue; const y1 = Math.min(a.y, clip) + 1, xw = 1.42 + (s.mix < 1 ? (1 - s.mix) * (1 - s.mix) * 26 : 0), ea = a.x - a.w * xw, eb = b.x - b.w * xw, fa = a.x + a.w * xw, fb = b.x + b.w * xw;
      if(ea > 0 || eb > 0){ cx.moveTo(-PX, y1); cx.lineTo(ea, y1); cx.lineTo(eb, b.y); cx.lineTo(-PX, b.y); cx.closePath(); any = true; }
      if(fa < W || fb < W){ cx.moveTo(W + PX, y1); cx.lineTo(fa, y1); cx.lineTo(fb, b.y); cx.lineTo(W + PX, b.y); cx.closePath(); any = true; } }
    return any; }
  // where each burst's reflection lies: under the burst, mirrored and squashed toward the horizon; if that is on the road, slide it out
  // into the field on the venue's side (the paddies rule: the moon is drawn again in each field, slid toward its column)
  function placeRefl(hz){ const base = segAt(position).index, sideV = CUR_SHOW && CUR_SHOW.key === 'coast' ? -1 : 1;
    for(const b of bursts){ b.mxOK = false; const X = (W * (.5 + b.bx) + SKX) / PX, Y = hz / PX - b.h, yr = (HZC + (HZC - Y) * MSQ) * PX;
      for(let n = 1; n < DRAW; n++){ const s = segs[base + n]; if(!s || s.p1.camera.z <= DEPTH) continue; const a = s.p1.screen, q = s.p2.screen; if(!(q.y <= yr && a.y >= yr)) continue;
        const cxr = lerp(a.x, q.x, (a.y - yr) / Math.max(1, a.y - q.y)), wr = lerp(a.w, q.w, (a.y - yr) / Math.max(1, a.y - q.y)) * 1.42, need = wr + b.R * PX * .75;
        if(Math.abs(X * PX - cxr) < need){ const sd = X * PX === cxr ? sideV : Math.sign(X * PX - cxr) || sideV; b.mx = (cxr + sd * need) / PX; b.mxOK = true; } break; } } }
  function mirrorPass(s){ if(!CUR_SHOW || CUR_SHOW.key !== 'paddies' || !bursts.some(b => { const a2 = (beat - b.tb) * SPB; return a2 >= 0 && a2 < b.life; })) return; const hz = HZ;
    cx.restore(); cx.save(); STAT.mc++; if(clipWater()){ STAT.mw++; cx.clip(); cx.beginPath(); HZC = Math.floor(hz / PX); placeRefl(hz); MIRR = true; S_KEY = 'paddies'; cx.globalCompositeOperation = 'lighter'; drawShells(hz, 1); cx.globalCompositeOperation = 'source-over'; MIRR = false; }
    cx.restore(); cx.save(); cx.beginPath(); cx.rect(0, 0, W, s.clip); cx.clip(); }
  let CUR_SHOW = null; const STAT = { mc:0, mw:0 };

  /* ================================================================ hooks */
  MECH.sp_festival = {
    sprites:() => C,
    anchors:() => ({ stat:STAT, shows:shows.map(S => ({ key:S.key, start:S.start, peak:S.peak })), parades:parades.map(P => ({ z:P.z, dir:P.dir })), beat, cur:CUR_SHOW ? CUR_SHOW.peak : null,
      bursts:bursts.map(b => ({ type:b.type, a:+((beat - b.tb) * SPB).toFixed(2), life:b.life, x:Math.round(W * (.5 + b.bx) + SKX), y:Math.round(HZ - b.h * PX), R:Math.round(b.R * PX) })) }),   // (tests: every shell's age in seconds and its screen spot)
    reset(){ SPB = 60 / BPM; bursts.length = 0; beat = 0; lastHB = -1; T = 0; lastPos = 0; drumStep = -1; CUR_SHOW = null; SKX = 0; for(const S of shows){ S.big = false; S.f0 = undefined; S.cut = false; S.op = undefined; S.sk0 = undefined; } for(const P of parades) P.cut = false; },
    place(i, s, L){
      if(i === 0 || !segs[i - 1] || segs[i - 1].land !== s.land){
        for(let k = shows.length - 1; k >= 0; k--) if(shows[k].start >= i) shows.splice(k, 1);
        for(let k = parades.length - 1; k >= 0; k--) if(parades[k].start >= i) parades.splice(k, 1);
        const hT = DIR && DIR.target ? DIR.target('hanabi', i) : null, hP = hT != null ? Math.max(i + 660, hT) : i + 660, mT = DIR && DIR.target ? DIR.target('matsuri', i) : null, mZ = mT != null ? Math.max(i + 300, mT) : i + 300;   /* demo mode: the authored spots (never earlier than the usual ones) */
        if((L.key === 'paddies' || L.key === 'coast') && (!DIR || DIR.request('hanabi', { seg:hP }))) shows.push({ key:L.key, start:i, peak:hP, big:false });
        if(L.key === 'neon' && (!DIR || DIR.request('matsuri', { seg:mZ }))) parades.push({ start:i, z:mZ, dir:H1(i * .37) < .5 ? 1 : -1 }); }
      for(const P of parades){ const k = i - P.z; if(k < -64 || k > 10) continue;
        if(k >= -60 && k <= 6) s.sprites = s.sprites.filter(sp => !KILL_OVER.has(sp.type));
        if(k >= -5 && k <= 5){ s.sprites = s.sprites.filter(sp => !KILL_SIDE.has(sp.type)); if(s.nr) s.nr = s.nr.filter(r => Math.abs(r.x) < 1.05); s.fx_xs = k === 0 ? 2 : 1; }
        if(k >= -12 && k <= 5) s.hz = null;
        if(k >= -9 && k <= -6) s.zeb = true;
        if(k === 6) s.fx_fw = 1;
        if(k === 0) s.fx_par = P;
        if(k >= -56 && k <= -8 && (k + 56) % 8 === 0) s.fx_ls = 1;
        if(k === -4 || k === 4) s.fx_xc = k;
        if((k >= -42 && k <= -7 && (k + 42) % 3 === 0) || (k >= 7 && k <= 10 && k % 3 === 0)) s.fx_sp = 1; } },
    update(dt){
      if(state !== 'play'){ lastPos = position; return; }
      T += dt; const ba = beatAudio(); if(ba !== null) beat = Math.abs(ba - beat) > 4 ? ba : Math.max(beat, ba); else beat += dt / SPB;
      const ps = Math.floor((position + PZ) / SEG), S = activeShow(ps); CUR_SHOW = S;
      if(S){ skyX(S, dt); const D = S.peak - ps, hb = Math.floor(beat * 2); if(lastHB < 0 || hb - lastHB > 8) lastHB = hb; while(lastHB < hb){ lastHB++; plan(lastHB, S, D); } S_KEY = S.key;
        // the 花火 title card (ui/cutin.js) as the show builds; never over a landmark jump's approach or flight (the paddies RAILWAY JUMP
        // sits right here): it waits until the bike has landed, and is dropped if that leaves the show too close to its peak
        if(D <= 420 && !S.cut && !(segs[ps] && segs[ps].spjP) && !(MECH.sp_jump && MECH.sp_jump.flying && MECH.sp_jump.flying())){ S.cut = true; if(D > 200){ S.op = lastHB + 1; if(MECH.cutin) MECH.cutin.show('hanabi'); } }
        for(const b of bursts){ if(!b.fired && beat >= b.tb){ b.fired = true; boomFor(b, D); }
          if(!b.launched && beat >= b.tb - b.rise){ b.launched = true; const a = AC(); if(a){ const v = clamp(1 - D / 700, .2, 1); M.noise(.1, 380, .05 * v, a.currentTime); thump(a.currentTime, 170, 80, .16, .05 * v); if(H1(b.seed * 3) < .3 && b.type !== 'star') whistle(a.currentTime + .05, b.rise * SPB * .9, .012 * v); } } } }
      for(let k = bursts.length - 1; k >= 0; k--) if((beat - bursts[k].tb) * SPB > Math.max(bursts[k].life, 7)) bursts.splice(k, 1);
      // the parade: drums, queued traffic, and the crossing itself
      const P = activePar(ps);
      if(P){ const D = P.z + .5 - (position + PZ) / SEG, u = parU(D); drums(D);
        if(D < 240 && D > 20 && !P.cut){ P.cut = true; if(MECH.cutin) MECH.cutin.show('matsuri'); }   // the 祭 title card (ui/cutin.js) as the parade comes into view
        if(D > -3 && D < 330){ const stopZ = (P.z - 6) * SEG, laneX = P.dir * -.66; let qn = 0;
          const wait = cars.filter(c => c.z > (P.z - 44) * SEG && c.z < (P.z - 6) * SEG + 60).sort((p, q) => q.z - p.z);
          for(const c of wait){ if(c._fsp === undefined) c._fsp = c.speed; const lim = stopZ - qn * 5 * SEG; c.x += clamp(laneX - c.x, -.8 * dt, .8 * dt);
            if(c.z >= lim){ c.z = lim; c.speed = 0; } else c.speed = Math.min(c._fsp, Math.max(MAXS * .12, (lim - c.z) / SEG * MAXS * .02)); qn++; }
          if(D > 60) for(const c of cars) if(c.z > (P.z - 5) * SEG && c.z < (P.z + 4) * SEG){ c.z += 16 * SEG; } }
        else for(const c of cars) if(c._fsp !== undefined){ c.speed = c._fsp; delete c._fsp; }
        const zc = (P.z + .5) * SEG;
        if(lastPos + PZ < zc && position + PZ >= zc && cool <= 0 && AIR.h < 6) for(const e of PEL){ if(!e.hit) continue; const X = P.dir * (u + e.o); if(Math.abs(playerX - X) < e.hit){ crash({ x:X }); floatText('Matsuri!', W / 2, H * .5, 24, '#ffb060'); break; } } }
      else { drumStep = -1; for(const c of cars) if(c._fsp !== undefined){ c.speed = c._fsp; delete c._fsp; } }
      lastPos = position; },
    drawBackdrop(o){ const S = CUR_SHOW; if(!S || !bursts.length) return; const L = LANDS[o.bgB]; if(L.key !== S.key && LANDS[o.bgA].key !== S.key) return;
      S_KEY = S.key; drawSmoke(o.hz); cx.globalCompositeOperation = 'lighter'; drawShells(o.hz, 1); cx.globalCompositeOperation = 'source-over'; },
    drawSeg(s, sx0, sy0, uw, fog, now){
      if(s.fx_xs) drawCrossStreet(s, fog);
      if(s.fx_fw && uw > 1) for(const sd of [-1, 1]){ const spr = farWall((s.index + (sd > 0 ? 1 : 0)) % 2), k = uw * 3.6 / spr.width; cx.globalAlpha = 1 - fog * .7; blitF(spr, sx0 + sd * uw * 3.25, sy0, k, sd > 0); cx.globalAlpha = 1;
        if(fog < .7) for(let j = 0; j < 4; j++) glow(sx0 + sd * uw * (1.6 + j * .9), sy0 - uw * .5, uw * .35, '#ffb060', .14 * (1 - fog)); }
      if(s.fx_xc && uw > 1) for(const sd of [-1, 1]){ const spr = crowd(2 + (s.fx_xc > 0 ? 1 : 0), Math.floor(now / 520) % 2), k = uw * 1.5 / spr.width, sf = scaleFade(k, 5, 8); if(sf <= 0) continue; cx.globalAlpha = (1 - fog * .7) * sf; blitF(spr, sx0 + sd * uw * 2.0, sy0, k, sd > 0); cx.globalAlpha = 1; }   // (fades 5-8x beside the camera, W11 #23)
      if(s.fx_par){ const P = s.fx_par, near = P.z + .5 - (position + PZ) / SEG < 8;
        // the float never paints over the rider: near the crossing, the bike's box is cut out of the float's layer, so whatever draws
        // the bike (the core, a slide, the crash cam's frozen frame) the float reads as passing behind it
        if(near){ const bs = Math.min(W * .2, H * .27), y0 = H - 8 - (typeof AIR !== 'undefined' ? AIR.h : 0) - bs * 1.1; cx.save(); cx.beginPath(); cx.rect(0, 0, W, H); cx.rect(Math.round(W / 2 - bs * .55), Math.round(y0), Math.round(bs * 1.1), H); cx.clip('evenodd'); }
        drawParade(s, P, sx0, sy0, uw, fog, now); if(near) cx.restore(); }
      if(s.fx_sp && uw > 1) for(const sd of [-1, 1]){ const spr = crowd((s.index + (sd > 0 ? 1 : 0)) % 2, reduce ? 0 : Math.floor(now / 520 + s.index) % 2), k = uw * .64 / spr.width, sf = scaleFade(k, 5, 8); if(sf <= 0) continue; cx.globalAlpha = (1 - fog * .7) * sf; blitF(spr, sx0 + sd * uw * 1.4, sy0, k, sd > 0); cx.globalAlpha = 1; }
      if(s.fx_ls) drawString(s, sx0, sy0, uw, fog, now);
      if(now !== fstFrame && CUR_SHOW && CUR_SHOW.key === 'paddies' && s.sprites.some(sp => sp.env === 'paddies')){ fstFrame = now; mirrorPass(s); } },
    overlay(now, sk){ // a new burst tints sky and land in its colour for a moment, in two flat steps (never with reduce)
      if(reduce || !CUR_SHOW) return; let best = null, br = 0; for(const b of bursts){ const a = (beat - b.tb) * SPB; if(a >= 0 && a < .3 && b.R > br){ br = b.R; best = b; } }
      if(!best) return; const a = (beat - best.tb) * SPB; cx.globalCompositeOperation = 'lighter'; cx.fillStyle = best.pal[1]; cx.globalAlpha = (a < .1 ? .08 : .04) * clamp(best.R / (40 * unitC()), .3, 1); cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; },
    warm(){ SPB = 60 / BPM; for(let f = 0; f < 2; f++){ nebuta(f); bearers(f); haneto(f); for(let v = 0; v < 4; v++) crowd(v, f); farWall(f); chochin(f); }
      for(let f = 0; f < 3; f++){ taiko(f); smoke(f); } cache('nebR', () => reflOf(nebuta(0)));
      for(const n of [16, 24, 40, 56, 72]) for(let v = 0; v < 2; v++) dirs(n, v); for(const k in FP) for(let n = 0; n < HALO_R.length; n++) halo(FP[k][1], n); for(let n = 0; n < HALO_R.length; n++) halo('#ffffff', n);
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); for(const k in C){ const c = C[k]; if(c && c.getContext) cx.drawImage(c, 0, 0, 1, 1); } cx.restore(); }
  };
  // sundown.html warms ENV modules, not MECH ones: register a warm-up hook there too
  if(typeof ENV !== 'undefined') ENV.sp_festival = { warm:() => MECH.sp_festival.warm() };
})();
