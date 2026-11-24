/* ui/cycle.js: colour cycling for Canvas2D (Mark Ferrari's technique, GDC 2016 "8 Bit & '8 Bitish' Graphics"; the HTML5 port, 80.lv).
   Proposal color-cycle-lights (review/proposals.json; research/sundown-craft/proposals.md #22).

   The idea. A sprite is painted once as an index map: each pixel names a palette slot, not a colour. Some runs of slots are "cycling ranges":
   rotate the colours along a range and the light seems to move (bulbs chase round a sign, glints flow down water, heat crawls along a lava
   seam) while not one pixel of the drawing changes. Canvas2D has no indexed palettes, so at warm-up the module bakes every step of the
   rotation into one strip canvas (frame f at x = f * w), and a frame is a single drawImage of one cell: the per-frame cost of a whole
   chasing marquee, however many bulbs it has, is one blit.

   CYCLE.make(spec) -> cyc   (warm-up only: one canvas per call, built with one putImageData; never call it mid-ride)
     spec.w, spec.h   the sprite in art pixels
     spec.idx         Uint8Array(w * h): palette slot per pixel, 0 = transparent
     spec.pal         ['#rrggbb' | '#rrggbbaa' | 'rgb(r,g,b)' | 'rgba(r,g,b,a)' | [r, g, b, a(0-255)] ...]: slot -> colour (slot 0 is ignored)
     spec.ranges      [[lo, hi, dir = 1], ...]: inclusive slot runs that rotate one step a frame (dir -1 runs the other way)
     spec.frames      frames in the loop (default: the least common multiple of the range lengths, so every range comes round
                      exactly); a range whose length doesn't divide it would jump at the wrap, so make() throws
     spec.ms          milliseconds a frame is held (default 120)
     spec.still       the frame held under reduced motion and No flashing (default 0): pick one that reads as lit, not a gap
   cyc.cv             the strip canvas (frames * w x h); cyc.w, cyc.h, cyc.n, cyc.ms
   cyc.frame(now)     the frame index for this time (cyc.still when motion is reduced); pure arithmetic, no allocation
   cyc.sx(now)        the strip x of that frame (frame * w)
   cyc.draw(cx, now, dx, dy, dw = w, dh = h, sx0 = 0, sy0 = 0, sw = w, sh = h)
                      one drawImage of the frame (or of a sub-rectangle of it), imageSmoothingEnabled left as the caller set it
   cyc.recolor(pal, x0, cw, y0, ch)  new colours for some slots ({slot: colour}), re-baked in place for that rectangle of every frame (no
                      new canvas or ImageData): for strips that follow a slowly changing fog colour (a few hundred pixels per call)
   CYCLE.ramp(...cols) a palette slice helper: returns the colours as an array (for readability when building pal)
   CYCLE.stats        { made, px }: how many strips and pixels were baked (tests, the warm-up log)
   ?cyc=0             (debug) CYCLE.off: consumers draw their old per-pixel path, for side-by-side comparisons

   Rules for consumers (the warm-up contract, sundown.html): build every strip in warm()/warmSteps(), one make() per step (a strip is a
   few hundred to a few thousand pixels: well under a millisecond); keep the frame lookup arithmetic in the draw; hold a lit, steady
   frame under reduced motion and No flashing (cyc.frame does that for you). */
(function(){
'use strict';
if(window.CYCLE) return;
const gcd = (a, b) => { while(b){ const t = b; b = a % b; a = t; } return a; }, lcm = (a, b) => a / gcd(a, b) * b;
const rgba = c => { if(Array.isArray(c)) return [c[0] | 0, c[1] | 0, c[2] | 0, c[3] === undefined ? 255 : c[3] | 0];
  if(/^rgba?\(/.test(c)){ const m = String(c).match(/[\d.]+/g).map(Number); return [m[0] | 0, m[1] | 0, m[2] | 0, m[3] === undefined ? 255 : Math.round(m[3] * 255)]; }   // (the game's mixc gives rgb() strings)
  const h = String(c).replace('#', ''), s = h.length <= 4 ? h.split('').map(x => x + x).join('') : h;
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255]; };
const still = () => { try{ return !!(typeof reduce !== 'undefined' && reduce) || !!(window.ASSIST && ASSIST.noFlash); }catch(e){ return false; } };
const CY = { stats:{ made:0, px:0 }, off:/[?&]cyc=0\b/.test(location.search), ramp:(...c) => c };
CY.make = spec => { const w = spec.w | 0, h = spec.h | 0, idx = spec.idx, ranges = (spec.ranges || []).map(r => [r[0] | 0, r[1] | 0, r[2] === -1 ? -1 : 1]);
  if(!(w > 0 && h > 0) || !idx || idx.length < w * h) throw new Error('CYCLE.make: bad size or index map');
  let n = spec.frames | 0; if(!n){ n = 1; for(const r of ranges) n = lcm(n, r[1] - r[0] + 1); }
  for(const r of ranges) if(n % (r[1] - r[0] + 1)) throw new Error(`CYCLE.make: range ${r[0]}-${r[1]} doesn't divide ${n} frames`);
  const np = spec.pal.length, P = new Uint8Array(np * 4), MAP = new Uint8Array(np * n);   // the palette (RGBA per slot) and, per frame, which slot's colour each slot shows
  const setPal = pal => { for(let s = 0; s < np; s++){ const c = rgba(pal[s] === undefined ? '#0000' : pal[s]); P[s * 4] = c[0]; P[s * 4 + 1] = c[1]; P[s * 4 + 2] = c[2]; P[s * 4 + 3] = c[3]; } };
  setPal(spec.pal);
  for(let f = 0; f < n; f++){ const M = f * np; for(let s = 0; s < np; s++) MAP[M + s] = s;
    for(const [lo, hi, dir] of ranges){ const L = hi - lo + 1; for(let s = lo; s <= hi; s++) MAP[M + s] = lo + ((((s - lo - f * dir) % L) + L) % L); } }   // slot s shows the colour f steps behind it: the light runs toward +dir
  const c = document.createElement('canvas'); c.width = w * n; c.height = h; const k = c.getContext('2d'), img = k.createImageData(w * n, h), d = img.data;
  // bake columns x0 .. x0 + cw - 1 of every frame (the whole strip at make(); a recolour can redo just the columns it needs)
  const bake = (x0, cw, y0, ch) => { for(let f = 0; f < n; f++){ const M = f * np; for(let y = y0; y < y0 + ch; y++){ const row = y * w, orow = (y * w * n + f * w) * 4;
      for(let x = x0; x < x0 + cw; x++){ const s = idx[row + x], o = orow + x * 4; if(!s){ d[o + 3] = 0; continue; } const q = MAP[M + s] * 4; d[o] = P[q]; d[o + 1] = P[q + 1]; d[o + 2] = P[q + 2]; d[o + 3] = P[q + 3]; } } }
    if(cw === w && ch === h) k.putImageData(img, 0, 0); else for(let f = 0; f < n; f++) k.putImageData(img, 0, 0, f * w + x0, y0, cw, ch); };
  bake(0, w, 0, h); CY.stats.made++; CY.stats.px += w * h * n;
  const ms = spec.ms || 120, st = Math.min(n - 1, Math.max(0, spec.still | 0));
  const cyc = { cv:c, w, h, n, ms, still:st,
    frame(now){ return still() ? st : ((Math.floor(now / ms) % n) + n) % n; },
    sx(now){ return cyc.frame(now) * w; },
    draw(cx, now, dx, dy, dw, dh, sx0, sy0, sw, sh){ const f = cyc.frame(now); if(sw === undefined){ sx0 = 0; sy0 = 0; sw = w; sh = h; }
      cx.drawImage(c, f * w + sx0, sy0, sw, sh, dx, dy, dw === undefined ? w : dw, dh === undefined ? h : dh); },
    // new colours for some slots (slot -> colour, sparse array or object), then re-bake the rectangle x0, y0, cw x ch (default: all) in place:
    // no new canvas and no new ImageData, so a strip can follow a slowly changing fog or sky colour mid-ride (one small putImageData)
    recolor(pal, x0, cw, y0, ch){ if(pal) for(const s in pal){ const i = s | 0; if(i <= 0 || i >= np) continue; const cc = rgba(pal[s]); P[i * 4] = cc[0]; P[i * 4 + 1] = cc[1]; P[i * 4 + 2] = cc[2]; P[i * 4 + 3] = cc[3]; }
      x0 = Math.max(0, x0 | 0); cw = cw === undefined ? w - x0 : Math.min(w - x0, cw | 0); y0 = Math.max(0, y0 | 0); ch = ch === undefined ? h - y0 : Math.min(h - y0, ch | 0);
      if(cw > 0 && ch > 0) bake(x0, cw, y0, ch); } };
  return cyc; };
/* CYCLE.chain(spec): a string of lanterns (or bulbs) hung on a sagging cable, as one cycled layer and one glow layer instead of a drawImage
   per lantern and per halo. The caller keeps drawing its own cable (a few exact rects per frame, crisp at every size); the lanterns are
   rasterised at warm-up at a ladder of sizes (LODs, each `ratio` bigger than the last, packed into one atlas), nearest-sampled from the
   lantern art exactly as a scaled drawImage would, and drawn at the nearest LOD at or below the wanted size, stretched by less than `ratio`.
   Colour cycling: each colour named in spec.ramps becomes a run of palette slots holding its ramp, and lantern j's pixels of that colour
   take slot j mod L, so as the run rotates the warmth travels from lantern to lantern along the string (a slow wave, not a blink).
     spec.sprites   [canvas per kind]: the lantern art (read once with getImageData; small CPU canvases)
     spec.kind(j)   which sprite lantern j uses;  spec.n lanterns;  spec.span, spec.sag (in uw: the string runs -span/2 .. +span/2 about x)
     spec.kU        art pixels' size per uw (the module's k = uw * kU);  spec.drop: the lantern's bottom below the cable, in art pixels
     spec.ramps     [{ '#rrggbb': [L colours] } per kind]: the colours that cycle (all ramps the same length L)
     spec.glow      { r (per uw), dy (art px above the bottom), cols:[per kind], a, first (drawn under the lanterns), and either sprite:col => canvas
                    (stretched to the halo) or paint(g, x, y, r, col, a) (the module's own halo, painted additively in canvas px) } or null
     spec.ms, spec.still   as CYCLE.make;  spec.u0, spec.u1, spec.ratio: the LOD ladder in canvas px per uw (default 1.5 .. 48, 1.12)
   chain.draw(cx, now, x, ya, uw, aBody, aGlow, dx) -> false when uw is outside the ladder (draw the old way); x, ya: the string's centre and
     its cable's anchor height (CSS px, as the caller's own math); dx: a sideways sway for the lanterns. aGlow <= 0 skips the glow. The alphas
     are absolute (not multiplied by the context's) and globalAlpha is left at 1, as the per-lantern loops it replaces left it. */
CY.chain = spec => { const PXc = () => (typeof PX !== 'undefined' ? PX : 3), u0 = spec.u0 || 1.5, u1 = spec.u1 || 48, ratio = spec.ratio || 1.12, n = spec.n;
  // the lantern art as slot maps: static colours share slots across kinds; a ramped colour is a run of L slots
  const pal = ['#0000'], key = new Map(), ranges = [], arts = [];
  const slotOf = hex => { let s = key.get(hex); if(s === undefined){ s = pal.length; pal.push(hex); key.set(hex, s); } return s; };
  let L = 0; for(const r of spec.ramps || []) for(const c in r) L = Math.max(L, r[c].length);
  spec.sprites.forEach((c, ki) => { const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, base = new Int16Array(w * h), ramp = new Int16Array(w * h), R = (spec.ramps || [])[ki] || {}, runs = {};
    for(let i = 0; i < w * h; i++){ const o = i * 4; if(d[o + 3] < 128) continue; const hex = '#' + [d[o], d[o + 1], d[o + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
      const rk = Object.keys(R).find(c2 => c2.toLowerCase() === hex); if(rk){ if(runs[rk] === undefined){ runs[rk] = pal.length; for(const cc of R[rk]) pal.push(cc); ranges.push([runs[rk], runs[rk] + R[rk].length - 1, 1]); } ramp[i] = runs[rk]; }
      else base[i] = slotOf(hex); }
    arts.push({ w, h, base, ramp }); });
  if(pal.length > 255) throw new Error('CYCLE.chain: too many colours');
  // the ladder: each LOD's box (lanterns and glows, relative to the string's centre and cable anchor), shelf-packed into one atlas
  const G = spec.glow, lods = []; for(let u = u0; u <= u1 * 1.0001; u *= ratio) lods.push({ u });
  const geo = (u, j) => { const t = (j + .5) / n, k = spec.kU * u, lx = (-spec.span / 2 + spec.span * t) * u, ly = spec.sag * u * 4 * t * (1 - t) + spec.drop * k; return [lx, ly, k]; };
  let AW = 0; for(const D of lods){ let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for(let j = 0; j < n; j++){ const [lx, ly, k] = geo(D.u, j), A = arts[spec.kind(j)];
      x0 = Math.min(x0, lx - A.w * k / 2 - 1); x1 = Math.max(x1, lx + A.w * k / 2 + 1); y0 = Math.min(y0, ly - A.h * k - 1); y1 = Math.max(y1, ly + 1);
      if(G){ const r = G.r * D.u, gy = ly - G.dy * k; x0 = Math.min(x0, lx - r - 1); x1 = Math.max(x1, lx + r + 1); y0 = Math.min(y0, gy - r - 1); y1 = Math.max(y1, gy + r + 1); } }
    D.ox = -Math.floor(x0); D.oy = -Math.floor(y0); D.w = Math.ceil(x1) + D.ox; D.h = Math.ceil(y1) + D.oy; AW = Math.max(AW, D.w); }
  let sx = 0, sy = 0, rowH = 0; for(let i = lods.length - 1; i >= 0; i--){ const D = lods[i]; if(sx + D.w > AW){ sx = 0; sy += rowH; rowH = 0; } D.x = sx; D.y = sy; sx += D.w; rowH = Math.max(rowH, D.h); }
  const AH = sy + rowH, idx = new Uint8Array(AW * AH);
  for(const D of lods) for(let j = 0; j < n; j++){ const [lx, ly, k] = geo(D.u, j), A = arts[spec.kind(j)], left = Math.round(D.ox + lx - A.w * k / 2), top = Math.round(D.oy + ly - A.h * k), ph = L ? j % L : 0;
    for(let py = top; py < top + Math.ceil(A.h * k) + 1; py++){ const ty = Math.floor((py + .5 - top) / k); if(ty < 0 || ty >= A.h) continue;
      for(let px = left; px < left + Math.ceil(A.w * k) + 1; px++){ const tx = Math.floor((px + .5 - left) / k); if(tx < 0 || tx >= A.w) continue; const i = ty * A.w + tx, s = A.ramp[i] ? A.ramp[i] + ph : A.base[i]; if(s) idx[(D.y + py) * AW + D.x + px] = s; } } }
  const body = CY.make({ w:AW, h:AH, idx, pal, ranges, frames:L || 1, ms:spec.ms || 180, still:spec.still || 0 });
  let glow = null; if(G){ glow = document.createElement('canvas'); glow.width = AW; glow.height = AH; const g = glow.getContext('2d'); g.imageSmoothingEnabled = false; g.globalCompositeOperation = 'lighter'; g.globalAlpha = G.a;
    for(const D of lods) for(let j = 0; j < n; j++){ const [lx, ly, k] = geo(D.u, j), r = G.r * D.u, gx = D.x + D.ox + lx, gy = D.y + D.oy + ly - G.dy * k; if(r < 1) continue;
      g.save(); g.beginPath(); g.rect(D.x, D.y, D.w, D.h); g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
      if(G.paint) G.paint(g, gx, gy, r, G.cols[spec.kind(j)], G.a); else { g.globalAlpha = G.a; g.drawImage(G.sprite(G.cols[spec.kind(j)]), Math.round(gx - r), Math.round(gy - r), Math.max(1, Math.round(r * 2)), Math.max(1, Math.round(r * 2))); } g.restore(); } }
  const lnR = Math.log(ratio);
  const ch = { body, glow, lods, L,
    draw(cx, now, x, ya, uw, aBody, aGlow, dx){ const P = PXc(), uc = uw / P; if(!(uc >= u0) || uc >= lods[lods.length - 1].u * ratio) return false;
      const D = lods[Math.min(lods.length - 1, Math.floor(Math.log(uc / u0) / lnR + 1e-9))], s = uc / D.u, X = Math.round((x + (dx || 0)) / P - D.ox * s) * P, Y = Math.round(ya / P - D.oy * s) * P, w = Math.round(D.w * s) * P, h = Math.round(D.h * s) * P;
      cx.imageSmoothingEnabled = false;
      const gl = () => { if(!glow || !(aGlow > 0)) return; cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.min(1, aGlow); cx.drawImage(glow, D.x, D.y, D.w, D.h, X, Y, w, h); cx.globalCompositeOperation = 'source-over'; };
      if(G && G.first) gl(); cx.globalAlpha = aBody; cx.drawImage(body.cv, body.frame(now) * AW + D.x, D.y, D.w, D.h, X, Y, w, h); if(!(G && G.first)) gl(); cx.globalAlpha = 1; return true; } };
  return ch; };
window.CYCLE = CY;
})();
