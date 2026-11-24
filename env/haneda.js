/* Sundown environment: Haneda. See env/README.md for the hooks.
   The bayside expressway skirting Tokyo's Haneda airport at night. On the right, behind a parapet and a security fence: a taxiway of blue edge
   lights and green centre dots, then either the apron (parked jumbo jets with lit tail logos and glowing jet bridges, high-mast floodlights,
   fuel trucks, a long glass terminal behind) or the runway (white edge rows turning amber, white centre line turning red, a green threshold
   bar, hangars with open lit doors). On the left: the monorail's twin beams on T-piers (projected geometry, with the inbound train you overtake
   and an outbound one coming at you), and the bay with the approach-light
   pier marching out over the water, its sequenced strobe running ahead of you. The control tower and the airport's horizon of lights sit on
   the skyline. The sky above the road is left clear for the landing jets of setpiece/jump.js.

   References (looked at, then drawn from scratch; airlines and logos are invented):
   - Haneda at night (Commons: "Haneda night view", "T1 Night View", "night view of Terminal 2", "Haneda in dark"): the airfield is a huge
     dark plane; light is in LINES of tiny points that converge to the horizon; the far horizon is one dense band of white/amber with red
     specks; the apron is lit warm by tall masts with pools on the concrete; parked jets are white bellies lit from above with lit window rows,
     tails floodlit so the logo glows; jet bridges are glazed tubes glowing from inside. -> light rows drawn per segment so they converge, a
     dense light band on the horizon, floodlit white jets, lit logos, glowing glazed bridges.
   - Haneda control tower (Commons "HND control tower"): stacked cylindrical drums with horizontal window bands, a slender shaft and a wider
     glazed cab with a dome on top. -> a slender shaft, a flared cab with dim teal glass, a radome, red obstruction lights, the green/white
     airport beacon.
   - Approach lighting (Commons "Approach Lighting System Bremen", Haneda "D-Runway seen from sea surface"): crossbars of five lamps on posts,
     a line of them out over the water on piles; the sequenced flasher ("rabbit") runs toward the runway twice a second. -> crossbars on posts
     along a jetty in the bay, a world-anchored rabbit that runs ahead (slow and soft under reduced motion), reflections as broken columns.
   - Airfield lighting rules (FAA/ICAO, Commons "Taxiway light", "Runway lights"): taxiway edges blue, taxiway centre green, runway edges white
     with the last stretch amber, runway centre white then alternating red/white then red, threshold green, runway end red. -> used literally.
   - Tokyo Monorail (Commons "Tokyo Monorail 10000", "Type10000 Haneda Airport Line", 1000/2000 series pages; en.wikipedia series articles).
     Rules taken: (1) it is a straddle-beam Alweg line: a narrow concrete box beam, the train's skirt wraps down over the beam's sides, so from
     below you see the beam's underside and face under the skirt, never wheels. (2) Two beams side by side on single T-piers whose haunched
     crosshead carries both, over open water for much of the route. (3) Six-car sets about 15-16.5 m a car, 3 m wide, 4.4 m tall: a long, low
     box, taller than it is wide. (4) Current livery (1000/2000 repaints): white body with navy, light blue and lime stripes low on the side;
     a continuous ribbon of windows above, two door pairs a side. (5) The cab ends are rounded, with a big windscreen and the lamps low on the
     front: white headlights leading, red tail lights trailing. (6) At night the cabins are lit cool white, the brightest thing on the train,
     and the white body reads a step down. -> projected box beams and T-piers, the skirt over the beam, 6 x 14-segment cars, stripes low, lit
     ribbon with pillars, a sloped cab roof and a chamfered end cap with low lamps, warm-lit cabins only here and there.
   - Pixel art: After Burner (Sega 1987) and Aero Fighters (Video System 1992): aircraft are 3-4 tone cylinders with a bright top line and a
     dark belly, outlined; airfields are flat grey with painted lines. Night Striker (Taito 1989): buildings as grids of lit window cells. ->
     outlined jets with a hard top highlight, terminal as a glass grid of lit panes, painted apron lines.
   Palette: cool navy night; warm sodium only on the expressway; airfield colours (white, amber, blue, green, red) as tiny saturated points. */
"use strict";
(() => {
  /* Larger art sizes for the big roadside buildings (research/sundown-buildings.md): the pixel sprite scaled 2x (and 4x) with Scale2x (EPX),
     built in warm(), which keeps the pixel look but rounds the staircases. artK(spr, k) hands back whichever size keeps one sprite pixel
     within ~1.5 canvas pixels as it passes the camera (a fog-tinted copy has no larger size, but those are only drawn far away). */
  function artX2(c){ const w = c.width, h = c.height, src = new Uint32Array(c.getContext('2d').getImageData(0, 0, w, h).data.buffer.slice(0)), o = document.createElement('canvas'); o.width = w * 2; o.height = h * 2;
    const k = o.getContext('2d'), img = k.createImageData(w * 2, h * 2), dst = new Uint32Array(img.data.buffer), at = (x, y, P) => x < 0 || y < 0 || x >= w || y >= h ? P : src[y * w + x];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const P = src[y * w + x], A = at(x, y - 1, P), B = at(x + 1, y, P), C = at(x - 1, y, P), D = at(x, y + 1, P), o0 = y * 4 * w + x * 2, o1 = o0 + w * 2;
      dst[o0] = C === A && C !== D && A !== B ? A : P; dst[o0 + 1] = A === B && A !== C && B !== D ? B : P; dst[o1] = D === C && D !== B && C !== A ? C : P; dst[o1 + 1] = B === D && B !== A && D !== C ? D : P; }
    k.putImageData(img, 0, 0); return o; }
  function artSizes(c, four){ if(!c._x2) c._x2 = artX2(c); if(four && !c._x4) c._x4 = artX2(c._x2); cx.drawImage(c._x2, 0, 0, 1, 1); if(c._x4) cx.drawImage(c._x4, 0, 0, 1, 1); return c; }
  const artK = (c, k) => { const s = k / PX; return s > 3 && c._x4 ? [c._x4, k / 4] : s > 1.5 && c._x2 ? [c._x2, k / 2] : [c, k]; };
  const P = 'hn_';
  const K = '#070812';
  const C0 = '#0b0e1c', C1 = '#151a2e', C2 = '#222944', C3 = '#363f62', C4 = '#5a6690', C5 = '#8a96c0';   // cool steel / concrete ramp
  const SOD = '#ffb35a', SODH = '#fff0c4';
  const AW = '#f4f7ff', AA = '#ffc23a', AB = '#4f7dff', AG = '#46ffa0', AR = '#ff3a2a';                 // airfield light colours
  const GL = ['#d8f0ff', '#9ccaf0', '#5a86b8', '#2c4670'], WM = ['#fff2cc', '#ffd890', '#d8a060', '#7a4a2a'];
  const H0 = n => { const s = Math.sin(n * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };

  // ---------------------------------------------------------------- sprite builders
  // grid: a per-pixel function painted through ImageData, with an optional automatic outline
  const RGB = {}; const rgb = c => RGB[c] || (RGB[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  function grid(key, w, h, fn, ol){ key = P + key; if(SPR[key]) return SPR[key]; const a = new Array(w * h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) a[y * w + x] = fn(x, y) || null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d'), img = k.createImageData(w, h), d = img.data;
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ const i = y * w + x; let col = a[i];
      if(!col && ol && ((x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w]))) col = ol;
      if(col){ const [r, g, b] = rgb(col); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; } }
    k.putImageData(img, 0, 0); return SPR[key] = c; }
  // pix: rectangle painting
  function pix(key, w, h, fn){ key = P + key; if(SPR[key]) return SPR[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
    const Q = { k, w, h, px(x, y, col){ k.fillStyle = col; k.fillRect(x | 0, y | 0, 1, 1); }, rect(x, y, ww, hh, col){ k.fillStyle = col; k.fillRect(x, y, ww, hh); },
      line(x0, y0, x1, y1, col){ k.fillStyle = col; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for(;;){ k.fillRect(x0, y0, 1, 1); if(x0 === x1 && y0 === y1) break; const e2 = 2 * e; if(e2 >= dy){ e += dy; x0 += sx; } if(e2 <= dx){ e += dx; y0 += sy; } } } };
    fn(Q); return SPR[key] = c; }
  const dz = (x, y) => (x + y) & 1;
  function put(c, x, y, k, flip){ if(!flip) return blit(c, x, y, k); cx.save(); cx.translate(Math.round(x), 0); cx.scale(-1, 1); blit(c, 0, y, k); cx.restore(); }

  // fog: colours and opaque fogged sprite copies (distance tints toward the haze instead of turning see-through)
  let fogKey = '', fogC = {};
  const fc = (col, fog, low) => { if(low !== fogKey){ fogKey = low; fogC = {}; } const q = Math.round(fog * 12), key = col + q; return fogC[key] || (fogC[key] = mixc(col, low, q / 12 * .85)); };
  let lastLow = '#141a36';
  // fogged copies come from the engine's bounded fog-tint cache (built in warm(), re-tinted in place as the night moves on)
  function fogged(spr, name, fog, low){ return fogTint(spr, 'hn:' + name, Math.min(4, Math.round(fog * 5)), 4, low, .82); }
  // the gantry lettering is built as soon as the pixel font is in (at load), so no canvas is made mid-ride
  if(document.fonts) document.fonts.load('16px DotGothic16').then(() => { signAsk = 0; signTextSpr(); }).catch(() => {});

  // ---------------------------------------------------------------- the jets: side view, nose left, an airbridge at the forward door
  // four invented airlines: tail ramp [dark, mid, light], logo colour, logo mask, jumbo (hump + four engines) or twin
  const LOGOS = {
    sun:   ['#...#...#', '.#.....#.', '...###...', '..#####..', '.#######.', '#########', '.........', '#########', '.........'],
    star:  ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '.#.....#.'],
    bird:  ['#.......#', '##.....##', '.##...##.', '..##.##..', '...###...', '....#....', '...###...', '..#...#..', '.........'],
    wave:  ['.........', '.##...##.', '#..#.#..#', '....#....', '.........', '.##...##.', '#..#.#..#', '....#....', '.........'] };
  const LIVERY = [
    { tail:['#0c1636', '#1c2e6a', '#3050a8'], logo:'#ffd060', mark:'sun', jumbo:true },     // Sora Pacific
    { tail:['#06302c', '#0c5852', '#1a8a80'], logo:'#ffffff', mark:'star', jumbo:false },   // Hoshi Air
    { tail:['#3a0a10', '#8e1a20', '#d0342c'], logo:'#ffffff', mark:'bird', jumbo:true },    // Tsubame International
    { tail:['#1e0e3a', '#48227e', '#7440b0'], logo:'#ffd8f4', mark:'wave', jumbo:false } ]; // Nami Airways
  const JW = 186, JH = 52, JB = 32;   // sprite size; the jet starts at x = JB (the airbridge fills the left)
  const jetSpr = v => { const L = LIVERY[v % 4], jumbo = L.jumbo, cy = 29, R = 7, logo = LOGOS[L.mark];
    return grid('jet' + v, JW, JH, (x, y) => { const jx = x - JB;
      // near engines (in front of the wing and fuselage)
      const eng = (ecx, ecy, rx, ry) => { const ex = (jx - ecx) / rx, ey = (y + .5 - ecy) / ry; if(ex * ex * .6 + ey * ey > 1 || Math.abs(ex) > 1) return null;
        if(ex < -.82) return Math.abs(ey) > .55 ? '#c8cede' : '#0c0e18'; if(ex > .86) return '#4a4e5e'; return ey < -.45 ? '#eef1f8' : ey < .15 ? '#b2b9cc' : ey < .6 ? '#6c748c' : '#30364c'; };
      let c = eng(66, cy + 11.5, 10, 4.2); if(c) return c;
      if(jumbo){ c = eng(92, cy + 10.5, 8, 3.4); if(c) return c; }
      // pylons
      if(y >= cy + 6 && y <= cy + 8 && ((jx >= 64 && jx <= 72) || (jumbo && jx >= 90 && jx <= 96))) return '#5a6278';
      // the near wing, nearly edge-on: a thin swept blade under the fuselage
      if(jx >= 50 && jx <= 106){ const yl = cy + 5 + (jx - 50) / 56 * 3.4, th = 2.4 - (jx - 50) / 56 * 1.2; if(y + .5 >= yl && y + .5 < yl + th) return y + .5 < yl + 1 ? '#c4cbdc' : '#4a5270'; }
      // landing gear
      if(jx === 12 && y > cy + 4 && y < 47) return '#3a3e50';
      if((jx === 74 || jx === 80) && y > cy + 13 && y < 47) return '#3a3e50';
      if(jumbo && jx === 88 && y > cy + 6 && y < 47) return '#3a3e50';
      const wheel = (wx) => { const dx = jx - wx, dy = y - 48.5; return dx * dx + dy * dy * 1.1 < 6.5 ? (dx * dx + dy * dy < 1.2 ? '#5a5e6e' : '#12131c') : null; };
      for(const wx of jumbo ? [12, 72, 78, 85, 91] : [12, 74, 80]){ c = wheel(wx); if(c) return c; }
      // horizontal stabiliser (tail)
      if(jx >= 128 && jx <= 151){ const th = 2.2 - (jx - 128) / 23; if(y + .5 >= cy - 1 && y + .5 < cy - 1 + th) return y + .5 < cy ? '#d4dae8' : '#5a627a'; }
      // fuselage profile
      if(jx >= 0 && jx <= 150){ let top, bot;
        if(jx < 16){ const t = (16 - jx) / 16; top = cy - R * Math.sqrt(1 - t * t); bot = cy + R * Math.sqrt(Math.max(0, 1 - t * t * t)); } else { top = cy - R; bot = cy + R; }
        if(jumbo && jx >= 6 && jx <= 64){ const h2 = jx < 22 ? 12 * Math.sqrt(Math.max(0, 1 - ((22 - jx) / 16) ** 2)) : jx < 44 ? 12 : 12 - (jx - 44) / 20 * 5; top = Math.min(top, cy - h2); }
        if(jx > 118) bot = cy + R - (jx - 118) / 32 * 10;
        if(jx > 134) top = cy - R + (jx - 134) / 16 * 3;
        if(y + .5 >= top && y + .5 <= bot + .5){ const ny = (y + .5 - top) / Math.max(1, bot - top), T = L.tail;
          // cockpit glass
          if(jumbo ? (y === cy - 9 || y === cy - 8) && jx >= 9 && jx <= 14 : (y === cy - 4 || y === cy - 3) && jx >= 4 && jx <= 10) return (jx === (jumbo ? 10 : 5) && y === (jumbo ? cy - 9 : cy - 4)) ? '#a8c4e8' : '#141a2c';
          // windows: the cabin lit warm, a few blinds down
          if(y === cy - 2 && jx >= 20 && jx <= 128 && jx % 2 === 0 && ![50, 86, 114].includes(jx)) return H0(jx * 1.7 + v * 13) > .14 ? (H0(jx * 3.1 + v) > .8 ? '#fff6dc' : '#ffd890') : '#2a3048';
          if(jumbo && y === cy - 9 && jx >= 22 && jx <= 46 && jx % 2 === 0) return H0(jx * 2.3 + v) > .12 ? '#ffe2a8' : '#2a3048';
          // doors: a thin darker outline
          if([18, 51, 87, 115].includes(jx) && y >= cy - 4 && y <= cy + 3) return '#8a92aa';
          // titles: blocky fake lettering in the airline colour
          const t0 = jumbo ? 52 : 26; if((y === cy - 5 || y === cy - 4) && jx >= t0 && jx < t0 + 22 && jx % 4 !== 3 && H0(jx * 5.3 + y + v * 7) > .3) return T[1];
          if(ny < .1) return '#f6f8fd';
          if(ny < .46) return ny > .38 && dz(x, y) ? '#b4bccf' : '#d0d6e4';
          if(ny < .55) return T[2];
          if(ny < .62) return T[1];
          if(ny < .8) return ny < .7 && dz(x, y) ? '#9aa2b8' : '#7c849e';
          return '#3a4058'; } }
      // the fin, with the logo floodlit
      if(y >= 2 && y <= cy - R){ const f = (cy - R - y) / (cy - R - 2), xL = 112 + f * 22, xT = 150 - f * 4;
        if(jx >= xL && jx <= xT){ const T = L.tail, u = (jx - xL) / (xT - xL);
          const lx = jx - 133, ly = y - 7; if(lx >= 0 && lx < 9 && ly >= 0 && ly < 9 && logo[ly][lx] === '#') return L.logo;
          if(u < .1) return mixc(T[2], '#ffffff', .25); if(u > .8 && u < .86) return T[0];
          return y > 18 ? T[2] : y > 15 ? (dz(x, y) ? T[2] : T[1]) : y < 5 && dz(x, y) ? T[0] : T[1]; } }
      // the airbridge: rotunda, glazed tube with the lit corridor, cab and bellows, support leg on a wheel bogie (behind the jet)
      if(x <= 5 && y >= 10){ if(y < 12) return C3; if(y >= 15 && y <= 21) return x % 3 === 1 ? C1 : (y < 18 ? GL[0] : WM[1]); return x < 2 ? C3 : C2; }
      if(x > 5 && x <= 40 && y >= 15 && y <= 24){ if(y === 15) return C4; if(y === 16) return C3; if(y >= 23) return C1; if(y === 22) return C3;
        if(x > 33) return (x % 2) ? C0 : C2;                      // bellows
        return x % 5 === 0 ? C1 : (y < 19 ? (H0(x * 1.3) > .2 ? GL[0] : GL[1]) : WM[1]); }
      if(x >= 18 && x <= 19 && y > 24 && y < 47) return x === 18 ? C3 : C1;
      if(x >= 14 && x <= 23 && y >= 46 && y <= 50) return y === 46 ? C3 : (y >= 48 && (x === 15 || x === 22)) ? '#12131c' : C1;
      return null; }, K); };
  // anchor points (sprite px) for live lights: tail logo, top beacon, belly beacon
  const JET_LOGO = [JB + 137, 11], JET_BEACON = [JB + 70, 21], JET_BELLY = [JB + 60, 37];

  // ---------------------------------------------------------------- terminal: a long glass hall under a floating roof (tiles into a continuous facade)
  const termSpr = v => pix('term' + v, 96, 40, Q => {
    // the floating roof: a thick lip with a moonlit top, a lit soffit underneath and slim struts
    Q.rect(0, 0, 96, 1, C5); Q.rect(0, 1, 96, 3, C2); Q.rect(0, 4, 96, 1, C1); Q.rect(0, 5, 96, 1, '#d8e6ff'); Q.rect(0, 6, 96, 1, '#8aa8d8');
    // the glass hall: fine panes (3 px + mullion); the departures level is tall and cool-white, arrivals below warm
    for(let px0 = 0; px0 < 96; px0 += 4){ const r = H0(px0 * 3.1 + v * 41), r2 = H0(px0 * 5.7 + v * 13 + 3);
      const up = r > .22 ? (r > .86 ? GL[0] : r > .5 ? GL[1] : GL[2]) : GL[3];
      Q.rect(px0 + 1, 7, 3, 14, up); Q.rect(px0 + 1, 7, 3, 1, mixc(up, '#ffffff', .3)); if(r > .5) Q.rect(px0 + 1, 15, 3, 1, mixc(up, '#000820', .25));
      Q.rect(px0 + 1, 23, 3, 8, r2 > .25 ? (r2 > .8 ? WM[0] : WM[1]) : '#3a3040'); if(r2 > .25) Q.rect(px0 + 1, 29, 3, 2, WM[2]); }
    for(let px0 = 0; px0 < 96; px0 += 4) Q.rect(px0, 7, 1, 24, C2);
    Q.rect(0, 21, 96, 2, C1); Q.rect(0, 21, 96, 1, C3);
    // tree-like roof columns and people in the warm level
    for(let px0 = 10; px0 < 96; px0 += 24){ Q.rect(px0, 6, 2, 25, C0); Q.rect(px0, 6, 1, 25, C3); Q.px(px0 - 1, 7, C0); Q.px(px0 + 2, 7, C0); }
    for(let i = 0; i < 10; i++){ const xx = (H0(i * 7.7 + v * 3) * 94) | 0; Q.rect(xx, 27, 1, 4, '#2a2030'); Q.px(xx, 26, '#4a3a40'); }
    // a departures board / sign on variant 1
    if(v === 1){ Q.rect(34, 9, 28, 5, '#14308a'); Q.rect(34, 9, 28, 1, '#3a6ae0'); for(let xx = 36; xx < 60; xx++) if(xx % 4 !== 3 && H0(xx * 2.7) > .25) Q.rect(xx, 11, 1, 2, '#f0f4ff'); Q.rect(37, 11, 1, 2, '#ffd060'); }
    // the kerbside canopy and the plinth
    Q.rect(0, 31, 96, 2, C3); Q.rect(0, 31, 96, 1, '#ffd890'); Q.rect(0, 33, 96, 7, C0); for(let xx = 2; xx < 96; xx += 8) Q.rect(xx, 34, 4, 2, WM[2]); });

  // ---------------------------------------------------------------- hangar: an arched shed, giant door open on a floodlit bay with a jet nose-on inside
  const HANGAR_FL = [16, 34, 52, 68, 86, 104], HANGAR_BCN = [2, 117];
  const hangarSpr = v => grid('hangar' + v, 120, 66, (x, y) => { const dx = x - 59.5, roofY = 4 + (dx / 60) ** 2 * 9;
    if(y < roofY) return null;
    const L = LIVERY[(v + 1) % 4];
    if(y < roofY + 2) return y < roofY + 1 ? C5 : C3;                                   // roof edge, moonlit
    if(y >= 63) return y === 63 ? C3 : C1;
    const inDoor = x >= 14 && x <= 105 && y >= 22;
    if(!inDoor){ if(y >= 14 && y <= 21){ if(y === 21) return HANGAR_FL.some(f => Math.abs(x - f) < 2) ? '#fff4d8' : C1;   // lintel with floodlights
        if(y >= 16 && y <= 18 && x >= 40 && x <= 80) return y === 16 ? L.tail[2] : (x % 4 !== 3 && H0(x * 3.3) > .3 ? '#e8ecf8' : L.tail[1]);
        return C2; }
      if((x >= 4 && x < 14) || (x > 105 && x <= 115)) return y > 21 ? (x % 3 === 0 ? C1 : C3) : C2;   // retracted door leaves
      return (x % 6 === 0) ? C1 : (dx < 0 ? C3 : C2); }
    // inside: the floodlit bay; back wall warm-white stepped to the floor, roof trusses
    const yy = y - 22;
    // a jet, nose-on: fuselage disc, cockpit windows, wings across, two engines
    const fx = x - 59.5, fy = y - 44; const fd = fx * fx + fy * fy * 1.05;
    if(fd < 64){ if(fy < -2 && fy > -5 && Math.abs(fx) < 5 && Math.abs(fx) > .8) return '#141a2c'; return fy < -4 ? '#f8faff' : fy < 3 ? '#d4dae6' : '#8a92a8'; }
    if(Math.abs(fy - 4) < 1.3 && Math.abs(fx) < 44){ return fy < 4 ? '#e8ecf4' : '#7a8296'; }
    for(const ex of [-24, 24]){ const ex2 = x - 59.5 - ex, ey = y - 49; const ed = ex2 * ex2 + ey * ey; if(ed < 20) return ed < 7 ? '#141620' : ey < -1 ? '#eef1f8' : '#9aa2b4'; }
    if(Math.abs(fx) < 1 && y > 52 && y < 62) return '#3a3e50';
    // the tail fin rising behind the fuselage, edge-on, in the airline colour
    if(Math.abs(fx) < 1.5 && y >= 25 && y < 37) return y < 27 ? L.tail[2] : L.tail[1];
    if(yy < 3) return x % 8 === 0 ? '#3a2c30' : '#5a4038';                               // truss under the door head
    if(y > 56) return (x + y) % 9 === 0 ? '#f0c888' : (y > 59 ? '#6a4a34' : '#94704c');  // floor with reflections
    const edge = Math.min(x - 14, 105 - x); if(edge < 4) return edge < 2 ? '#3a2a2a' : '#6a4c3a';
    if(yy < 6) return dz(x, y) && yy > 3 ? '#8a6448' : '#6e5040';
    if(yy < 12) return dz(x, y) && yy < 8 ? '#8a6448' : '#a8805a';
    return yy < 18 ? (dz(x, y) && yy < 14 ? '#a8805a' : '#c49a6a') : '#b48c60'; }, K);

  // ---------------------------------------------------------------- the control tower (for the skyline): slender shaft, flared cab, radome
  const towerSpr = () => grid('tower', 26, 74, (x, y) => { const c = 12.5, d = x - c, a = Math.abs(d);
    if(y <= 2) return a < .6 ? C4 : null;                                       // antenna
    if(y <= 7){ const r = Math.sqrt(Math.max(0, 9 - (y - 7) ** 2)) + .5; if(a < r) return d < 0 ? '#e8ecf4' : '#a8b0c4'; return null; }   // radome
    if(y <= 10) return a < 5 ? (y === 8 ? C4 : C2) : null;                      // equipment room
    if(y <= 12) return a < 12 ? (y === 11 ? C5 : C2) : null;                    // cab roof
    if(y <= 19){ if(a >= 11) return null; if(y === 19) return C1; return (Math.round(x) % 3 === 0) ? C1 : (y < 15 ? '#8af0d8' : '#4ab8a8'); }   // cab glass, dim teal
    if(y <= 25){ const hw = 10 - (y - 19) * 1.2; if(a >= hw) return null; return d < 0 ? C3 : C2; }   // flare under the cab
    if(y <= 64){ if(a >= 3) return null; if(x === 12 && y % 3 === 0) return '#ffd890'; if((y - 26) % 9 === 0) return C4; return d < 0 ? C3 : C1; }   // shaft
    if(a >= 9) return null; if(y === 65) return C4; if((y === 68 || y === 71) && x % 2 === 0) return '#ffe0a0'; return d < 0 ? C2 : C1; }, K);

  // ---------------------------------------------------------------- small props
  const truckSpr = () => pix('truck', 36, 17, Q => {
    Q.rect(1, 4, 9, 10, K); Q.rect(2, 5, 7, 8, '#e8d24a'); Q.rect(2, 5, 7, 1, '#fff07a'); Q.rect(3, 6, 4, 3, '#1a2a44'); Q.px(3, 6, '#7aa0d0'); Q.rect(2, 11, 7, 2, '#a08a2a');
    Q.rect(10, 4, 25, 10, K); Q.rect(11, 5, 23, 8, '#c8ccd8'); Q.rect(11, 5, 23, 1, '#f4f6fc'); Q.rect(11, 6, 23, 1, '#e0e4ee'); Q.rect(11, 9, 23, 2, '#c82a2a'); Q.rect(11, 12, 23, 1, '#6a7088');
    for(let xx = 13; xx < 33; xx += 4) Q.px(xx, 9, '#f4f6fc');
    Q.rect(0, 13, 36, 1, K); for(const wx of [3, 22, 29]){ Q.rect(wx, 13, 5, 4, K); Q.rect(wx + 1, 14, 3, 2, '#3a3e50'); Q.px(wx + 2, 14, '#7a7e90'); }
    Q.rect(4, 2, 3, 2, K); Q.px(5, 3, '#ffb020'); });
  const mastSpr = () => pix('mast', 18, 100, Q => { Q.rect(0, 0, 18, 9, K); Q.rect(1, 1, 16, 7, C2); Q.rect(1, 1, 16, 1, C4);
    for(let r = 0; r < 2; r++) for(let i = 0; i < 4; i++){ Q.rect(2 + i * 4, 3 + r * 3, 3, 2, '#fff4d8'); Q.px(2 + i * 4, 4 + r * 3, '#ffd090'); }
    Q.rect(7, 9, 4, 91, K); Q.rect(8, 9, 1, 91, C4); Q.rect(9, 9, 1, 91, C2); for(let y = 14; y < 96; y += 9) Q.rect(8, y, 2, 1, C1); Q.rect(5, 94, 8, 6, K); Q.rect(6, 94, 6, 1, C3); });
  const lampSpr = () => pix('lamp', 24, 60, Q => { Q.rect(1, 6, 4, 54, K); Q.rect(2, 6, 1, 54, C4); Q.rect(3, 6, 1, 54, C2); Q.rect(0, 54, 6, 6, K); Q.rect(1, 54, 4, 1, C3);
    Q.rect(2, 3, 16, 3, K); Q.rect(3, 4, 15, 1, C3); Q.rect(14, 2, 10, 5, K); Q.rect(15, 3, 8, 1, C4); Q.rect(15, 4, 8, 1, C2); Q.rect(15, 6, 8, 1, '#d08a3a'); Q.rect(16, 6, 6, 1, '#ffe2a0'); Q.rect(18, 6, 2, 1, SODH); });
  // expressway sign gantry: green signs for the airport
  const SIGNS = [[10, 48, '羽田空港', 'HANEDA AIRPORT'], [64, 38, '国際線', "INT'L TERM."]];
  const gantrySpr = () => pix('gantry', 112, 60, Q => { for(const x of [3, 104]){ Q.rect(x, 10, 5, 50, K); Q.rect(x + 1, 10, 1, 50, C4); Q.rect(x + 2, 10, 2, 50, C2); Q.rect(x - 1, 56, 7, 4, K); }
    Q.rect(0, 6, 112, 3, K); Q.rect(0, 6, 112, 1, C5); Q.rect(0, 7, 112, 1, C3); Q.rect(0, 16, 112, 3, K); Q.rect(0, 16, 112, 1, C4);
    for(let x = 2; x < 110; x += 8){ Q.line(x, 9, x + 4, 15, C1); Q.line(x + 4, 9, x + 8, 15, C1); }
    for(const [x0, w] of SIGNS){ Q.rect(x0 - 1, 19, w + 2, 22, '#d8dccc'); Q.rect(x0, 20, w, 20, '#136a40'); Q.rect(x0, 20, w, 1, '#2a8c5a'); Q.rect(x0, 39, w, 1, '#0a4428'); Q.rect(x0 + 4, 17, 1, 3, K); Q.rect(x0 + w - 5, 17, 1, 3, K); Q.rect(x0 + 6, 18, 3, 1, C5); Q.rect(x0 + w - 9, 18, 3, 1, C5); }
    // an airplane pictogram on the first sign (white, pointing up-right)
    const PLANE = ['.........##', '........###', '...#...###.', '...##.###..', '....####...', '.....###...', '....####...', '..####.##..', '.##.##..#..', '...##......', '..##.......'];
    PLANE.forEach((row, dy) => { for(let dx = 0; dx < row.length; dx++) if(row[dx] === '#') Q.px(45 + dx, 23 + dy, '#f0f0e4'); }); });

  /* Airfield guidance sign arrays (artpolish 2026-11-20; ICAO Annex 14 / FAA AC 150/5340-18 conventions, as Japan's airports use them):
     internally lit boxes on low frangible legs at the taxiway edge, a blue edge light on a stalk at each end. Direction signs are black on
     yellow with the arrow on the side it points; the location sign is yellow on black with a yellow border; a mandatory (runway holding)
     sign is white on red, with the location sign beside it. Designators are generic (no real Haneda runway or taxiway names).
     v0: [<-B][P][R/^]   v1: [L][J.K->]   v2: [09-27][C]. Glyphs are a hand-made 3 x 5 face (arrows 5 x 5), one sprite pixel per stroke. */
  const TSIGN = [['#ffd23a', '#14100a'], ['#14100a', '#ffd23a'], ['#d8202a', '#fff4f0']];   // (face, ink) per variant: the glow colour
  const TG = { B:['##.', '#.#', '##.', '#.#', '##.'], C:['.##', '#..', '#..', '#..', '.##'], J:['..#', '..#', '..#', '#.#', '.#.'], K:['#.#', '#.#', '##.', '#.#', '#.#'],
    L:['#..', '#..', '#..', '#..', '###'], P:['##.', '#.#', '##.', '#..', '#..'], R:['##.', '#.#', '##.', '#.#', '#.#'], 0:['###', '#.#', '#.#', '#.#', '###'], 2:['##.', '..#', '.#.', '#..', '###'],
    7:['###', '..#', '.#.', '.#.', '.#.'], 9:['###', '#.#', '###', '..#', '##.'], '-':['...', '...', '###', '...', '...'], '.':['.', '.', '#', '.', '.'],
    '<':['..#..', '.#...', '#####', '.#...', '..#..'], '>':['..#..', '...#.', '#####', '...#.', '..#..'], '^':['..###', '...##', '..#.#', '.#...', '#....'] };
  const TPAN = { dir:['#ffd23a', '#d8a020', '#14100a', 0], loc:['#14100a', '#14100a', '#ffd23a', 1], man:['#d8202a', '#a8141e', '#fff4f0', 0] };   // face, foot row, ink, border
  const TARR = [[['dir', '<B'], ['loc', 'P'], ['dir', 'R^']], [['loc', 'L'], ['dir', 'J.K>']], [['man', '09-27'], ['loc', 'C']]];
  const tglyW = t => [...t].reduce((n, ch, i) => n + TG[ch][0].length + (i ? 1 : 0), 0);
  const tsignW = v => TARR[v].reduce((n, [, t]) => n + tglyW(t) + 4 + 1, 1) + 6;
  // (the drawing is shared by the sprite and the near art's recorder; Q.role tags what each pixel is: the sprite's Q ignores it)
  const tsignDraw = (v, Q) => { const w = Q.w, bx = 3, bw = w - 6;
    // the edge lights: a stalk and a blue lens with a pale hot pixel, one at each end of the array
    for(const lx of [0, w - 2]){ Q.role = 'lens'; Q.rect(lx, 10, 2, 2, '#2a50d8'); Q.px(lx, 10, '#9ab8ff'); Q.role = 'stalk'; Q.rect(lx + (lx ? 0 : 1), 12, 1, 3, C2); Q.px(lx + (lx ? 0 : 1), 12, C3); }
    // the box: a moonlit cap, a dark frame, the panels, a dark foot
    Q.role = 'cap'; Q.rect(bx, 0, bw, 1, C3); Q.role = 'frame'; Q.rect(bx, 1, bw, 11, K);
    let x = bx + 1; for(const [kind, t] of TARR[v]){ const [face, foot, ink, bord] = TPAN[kind], pw = tglyW(t) + 4;
      Q.role = 'face'; Q.rect(x, 2, pw, 9, face); Q.role = 'foot'; Q.rect(x, 10, pw, 1, foot); Q.role = 'bord';
      if(bord){ Q.rect(x, 2, pw, 1, ink); Q.rect(x, 10, pw, 1, ink); Q.rect(x, 2, 1, 9, ink); Q.rect(x + pw - 1, 2, 1, 9, ink); }
      Q.role = 'ink'; let gx = x + 2; for(const ch of t){ const G = TG[ch]; G.forEach((row, dy) => { for(let dx = 0; dx < row.length; dx++) if(row[dx] === '#') Q.px(gx + dx, 4 + dy, ink); }); gx += G[0].length + 1; }
      x += pw + 1; }
    // low frangible legs with feet
    for(const lx of bw > 32 ? [bx + 3, bx + (bw >> 1), bx + bw - 4] : [bx + 3, bx + bw - 4]){ Q.role = 'leg'; Q.rect(lx, 12, 1, 2, C2); Q.role = 'feet'; Q.rect(lx - 1, 14, 3, 1, C1); } };
  const tsignSpr = v => pix('tsign' + v, tsignW(v), 15, Q => tsignDraw(v, Q));
  /* The guidance signs near by (buildings3d r5): past 4x the 3 x 5 lettering stepped into blocks, so the sign faded out from 4x to 7x and
     ghosted as it passed. Now the same drawing is recorded once per variant (colour and role per sprite pixel) and drawn again at 2x / 4x /
     8x from a material in sprite coordinates, so the footprint is identical (studied: the Buchanan Field sign arrays and a wall of retired
     guidance signs, Commons: bold rounded strokes, a dark housing with rounded ends, internally lit faces, blue edge lenses on stalks).
     Strokes get their outer corners chamfered and their diagonal steps bridged, so B, C, J, 0, 9 and the arrows read as letters, not
     blocks; faces glow brighter in their middle with a shadow under the housing; the housing gets rounded corners and a moonlit cap line;
     the lenses become domes with a hot point; stalks and legs get a lit edge. Built in the warm steps; used only where fog leaves it clean. */
  const tsignRec = v => { const w = tsignW(v), h = 15, col = new Array(w * h).fill(null), role = new Array(w * h).fill(''), face = new Array(w * h).fill(null);
    const Q = { w, h, role:'', rect(x, y, ww, hh, c){ for(let j = y; j < y + hh; j++) for(let i = x; i < x + ww; i++) if(i >= 0 && j >= 0 && i < w && j < h){ col[j * w + i] = c; role[j * w + i] = Q.role; if(Q.role === 'face') face[j * w + i] = c; } }, px(x, y, c){ Q.rect(x, y, 1, 1, c); } };
    tsignDraw(v, Q); return { w, h, col, role, face }; };
  const tsignHi = (v, R) => { const key = P + 'tsignHi' + v + '_' + R; if(SPR[key]) return SPR[key]; const M = tsignRec(v), w = M.w, h = M.h, e = 1 / R;
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? -1 : y * w + x, ink = (x, y) => { const i = at(x, y); return i >= 0 && M.role[i] === 'ink'; };
    const c = document.createElement('canvas'); c.width = w * R; c.height = h * R; const k = c.getContext('2d'), im = k.createImageData(w * R, h * R), d = im.data;
    for(let yy = 0; yy < h * R; yy++) for(let xx = 0; xx < w * R; xx++){ const X = (xx + .5) / R, Y = (yy + .5) / R, sx = Math.floor(X), sy = Math.floor(Y), fx = X - sx, fy = Y - sy, i = sy * w + sx;
      let out = M.col[i]; const ro = M.role[i];
      if(ro === 'ink' || ro === 'face'){ const fc = M.face[i] || M.col[i];
        if(ro === 'ink'){ for(const [cxn, cyn] of [[0, 0], [1, 0], [0, 1], [1, 1]]){ const ox = cxn ? 1 : -1, oy = cyn ? 1 : -1, u = cxn ? 1 - fx : fx, vv = cyn ? 1 - fy : fy;   // an outer corner: chamfered
            if(!ink(sx + ox, sy) && !ink(sx, sy + oy) && !ink(sx + ox, sy + oy) && u + vv < .42) out = fc; } }
        else { out = Y > 3 && Y < 9.5 ? mixc(fc, '#ffffff', .1) : fc;   // the face: lit from within, a shadow under the housing
          if(Y < 2 + e && M.role[at(sx, 1)] === 'frame') out = mixc(fc, K, .3);
          for(const [cxn, cyn] of [[0, 0], [1, 0], [0, 1], [1, 1]]){ const ox = cxn ? 1 : -1, oy = cyn ? 1 : -1, u = cxn ? 1 - fx : fx, vv = cyn ? 1 - fy : fy;   // an inner elbow of a stroke: filled
            if(ink(sx + ox, sy) && ink(sx, sy + oy) && u + vv < .36) out = M.col[at(sx + ox, sy)]; }
        } }
      else if(ro === 'frame'){ const lx = M.role[at(sx - 1, sy)] !== 'frame' && M.role[at(sx - 1, sy)] !== 'cap', rx = M.role[at(sx + 1, sy)] !== 'frame' && M.role[at(sx + 1, sy)] !== 'cap', by = sy === 11;   // the housing's rounded ends
        if((lx && by && fx + (1 - fy) < .5) || (rx && by && (1 - fx) + (1 - fy) < .5)) out = null; else if(sy === 1 && fy < e) out = C2; else if((lx && fx < e) || (rx && fx > 1 - e)) out = C1; }
      else if(ro === 'cap'){ const lx = M.role[at(sx - 1, sy)] !== 'cap', rx = M.role[at(sx + 1, sy)] !== 'cap'; if((lx && fx + fy < .5) || (rx && (1 - fx) + fy < .5)) out = null; else if(fy < e) out = C5; }
      else if(ro === 'lens'){ const lx0 = M.role[at(sx - 1, sy)] === 'lens' ? sx - 1 : sx, ly0 = M.role[at(sx, sy - 1)] === 'lens' ? sy - 1 : sy, ux = X - lx0 - 1, uy = Y - ly0 - 1, r2 = ux * ux + uy * uy;   // the lens: a dome
        if(r2 > 1.05) out = null; else if(r2 < .1 && ux < .1 && uy < .1) out = '#e8f0ff'; else if(ux + uy < -.55) out = '#9ab8ff'; else if(ux + uy > .7) out = '#16247a'; else out = '#2a50d8'; }
      else if(ro === 'stalk' || ro === 'leg'){ out = fx < e ? C4 : fx > 1 - e ? K : M.col[i]; }
      else if(ro === 'feet'){ out = fy < e ? C2 : M.col[i]; }
      if(out){ const m = hx(out), o = (yy * w * R + xx) * 4; d[o] = m[0]; d[o + 1] = m[1]; d[o + 2] = m[2]; d[o + 3] = 255; } }
    k.putImageData(im, 0, 0); return SPR[key] = c; };
  // a stepped halo for a near field light: hot core, coloured ring, dithered outer ring (drawn additively)
  const haloSpr = col => grid('halo' + col, 9, 9, (x, y) => { const d = Math.max(Math.abs(x - 4), Math.abs(y - 4)), r = Math.hypot(x - 4, y - 4);
    if(r < .5) return mixc(col, '#ffffff', .7); if(r < 1.5) return col; if(r < 2.6) return dz(x, y) ? mixc(col, '#000000', .45) : null; if(r < 3.6 && d < 4) return (x + y) % 4 === 0 ? mixc(col, '#000000', .7) : null; return null; });

  // ---------------------------------------------------------------- far scenery strips (canvas pixels, tiled with parallax)
  const CITY_W = 460, CITY_H = 58, AIR_W = 560, AIR_H = 30;
  const CAV = [], AAV = [];
  const citySpr = () => pix('city', CITY_W, CITY_H, Q => { CAV.length = 0; const body = ['#121736', '#141a3c', '#171c40'], top = '#28305e';
    let x = 0, i = 0; while(x < CITY_W){ const w = 6 + ((H0(i * 1.3) * 14) | 0), tall = H0(i * 3.7) > .84, h = tall ? 26 + H0(i * 7) * 20 : 6 + H0(i * 5.1) * 18, y0 = CITY_H - (h | 0);
      Q.rect(x, y0, w, CITY_H - y0, body[i % 3]); Q.rect(x, y0, w, 1, top);
      for(let yy = y0 + 2; yy < CITY_H - 1; yy += 3) for(let xx = x + 1; xx < x + w - 1; xx += 2){ const r = H0(xx * 13.1 + yy * 7.7); if(r > .9) Q.px(xx, yy, r > .975 ? '#bfe0ff' : '#c89a60'); }
      if(tall) CAV.push([x + (w >> 1), y0 - 1]); x += w + (H0(i * 2.2) > .75 ? 3 : 0); i++; }
    // a slender broadcast spire with two lit decks
    const sx = 300; for(let y = 4; y < CITY_H; y++){ const hw = y > 40 ? 2 + ((y - 40) / 6 | 0) : y > 14 ? 1 : 0; Q.rect(sx - hw, y, hw * 2 + 1, 1, y % 4 === 0 ? '#2a3466' : '#1c2450'); }
    Q.rect(sx - 3, 22, 7, 2, '#cfe6ff'); Q.rect(sx - 2, 15, 5, 1, '#cfe6ff'); Q.rect(sx, 0, 1, 4, '#3a4478'); CAV.push([sx, 0]); });
  // the airport on the horizon: terminals with glowing glass, tails with lit logos, hangars, masts, and a dense band of field lights
  const airSpr = () => pix('air', AIR_W, AIR_H, Q => { AAV.length = 0; const b = AIR_H - 3;
    Q.rect(0, b, AIR_W, 3, '#0c1024');
    let x = 4, i = 0;
    while(x < AIR_W - 20){ const r = H0(i * 4.1 + 2);
      if(r < .45){ // terminal
        const w = 50 + ((H0(i * 3) * 70) | 0), h = 6 + ((H0(i * 5) * 3) | 0); Q.rect(x, b - h, w, h, '#141a34'); Q.rect(x - 1, b - h - 1, w + 2, 1, '#3a4478'); Q.rect(x, b - h, w, 1, '#d8e8ff');
        for(let xx = x + 1; xx < x + w - 1; xx++){ const q = H0(xx * 1.7 + i); Q.px(xx, b - h + 2, q > .3 ? (q > .8 ? '#ffe2a8' : '#9cc4f0') : '#2a3a68'); if(q > .55) Q.px(xx, b - h + 4, '#ffd890'); }
        for(let xx = x + 6; xx < x + w - 6; xx += 9 + ((H0(xx) * 4) | 0)){ const L = LIVERY[(H0(xx * .7) * 4) | 0]; Q.rect(xx, b - 4, 1, 4, L.tail[1]); Q.rect(xx - 1, b - 2, 1, 2, L.tail[1]); Q.px(xx, b - 3, L.logo); Q.rect(xx - 4, b - 1, 4, 1, '#c8d0e0'); }
        x += w + 6; }
      else if(r < .6){ // hangar with an open lit door
        const w = 22 + ((H0(i) * 10) | 0); Q.rect(x, b - 9, w, 9, '#121732'); Q.rect(x + 1, b - 10, w - 2, 1, '#2e3868'); Q.rect(x + 4, b - 6, w - 8, 6, '#ffe2b0'); Q.rect(x + 4, b - 6, w - 8, 1, '#fff4d8'); x += w + 5; }
      else if(r < .72){ // floodlight masts
        for(let m = 0; m < 3; m++){ Q.rect(x + m * 7, b - 12, 1, 12, '#1a2040'); Q.rect(x + m * 7 - 1, b - 13, 3, 1, '#fff0c8'); } x += 22; }
      else { x += 10 + ((H0(i * 9) * 20) | 0); }
      i++; }
    // field lights: rows of dots along the ground line
    for(let xx = 0; xx < AIR_W; xx++){ const q = H0(xx * 7.3); if(q > .5) Q.px(xx, b + 1, q > .9 ? '#ffc23a' : q > .82 ? '#ff5a3a' : '#f4f2e8'); if(H0(xx * 3.9 + 5) > .7) Q.px(xx, b + 2, H0(xx) > .5 ? '#5a7cff' : '#46e090'); }
    for(let xx = 0; xx < AIR_W; xx += 37) AAV.push([xx + 3, b - 13]); });

  // ---------------------------------------------------------------- layout
  const ZONE = 480, RW0 = 260;         // apron for segments 0..259 of each zone, runway for 260..479
  const LAMP = 12, PIER = 6, MAST = 16, JET = 32, TERM = 12, HANG = 44, GANTRY = 300;
  const lampD = i => Math.min(i % LAMP, LAMP - i % LAMP);
  const WALL_L = .17, WALL_R = .07, FENCE = .5, RAIL = .19;     // half-road widths: parapet heights, fence height
  const MONO_X = -1.82;                               // the monorail's road-side face (the inbound train's flank), half-road widths
  const PIER_X = -3.5, PIER_CYC = 16;
  const gateAt = i => typeof gates !== 'undefined' && gates.includes(i);

  function place(i, s){ const sp = s.sprites, add = o => sp.push(Object.assign({ env:'haneda', k:i }, o)), z = i % ZONE, rw = z >= RW0;
    // right: far to near
    if(!rw){ if(z >= 4 && z < RW0 - 4) add({ type:'term3', side:1, x:TM_X, xo:TM_X, b0:i - z + 4, len:RW0 - 8 });
      if(z % JET === 8 && z < RW0 - 12) add({ type:'jet', x:6.6, v:(H0(i * 1.31) * 4) | 0, flip:H0(i * 2.7) > .62 });
      if(z % MAST === 4) add({ type:'mast', x:3.25 });
      if(z % JET === 22 && H0(i * 5.1) > .25 && z < RW0 - 8) add({ type:'truck', x:3.4 + H0(i) * .6, flip:H0(i * 3.3) > .5 }); }
    else { const r = hgRun(z); if(r >= 0) add({ type:'hang3', side:1, x:HG_X, xo:HG_X, b0:i - r, len:HG_LEN, v:((z - RW0) / HG_CYC) | 0 }); }   // (the old card was type 'hangar')
    if(z % 24 === 14) add({ type:'tsign', x:1.85 + H0(i * .9) * .3, v:z >= RW0 && z % 48 === 14 ? 2 : (H0(i * 4.4) > .5 ? 1 : 0) });
    // left: the approach-light pier out in the bay, then the monorail
    if(i % PIER === 0) add({ type:'pier', x:PIER_X });
    add({ type:'mono', x:MONO_X });
    // parapets, lamps, an occasional sign gantry
    add({ type:'wall', x:-1.12 }); add({ type:'wall', x:1.12 });
    if(i % LAMP === 0){ add({ type:'lamp', x:-1.12 }); add({ type:'lamp', x:1.12 }); }
    if(i % GANTRY === 150 && !gateAt(i)) add({ type:'gantry', x:0 }); }

  // ---------------------------------------------------------------- drawing
  // far away (fog over .55) run-like props (walls) are drawn two segments at a time; the pair is decided by its even segment's distance, so the
  // two halves always agree (a per-segment depth test let one half skip while the other didn't extend, and the gap blinked as you rode)
  function farQ(sp, y, fog){ const s = segs[sp.k]; if(!s || !s.p2.screen.scale) return null; let q = s.p2.screen;
    if(Math.pow((Math.round(DRAW_N * Math.pow(fog, 1 / 1.6)) - (sp.k & 1)) / DRAW_N, 1.6) > .55){ const s1 = segs[(sp.k | 1)]; if(s1 && s1.p2.screen.scale && s1.p2.camera.z > 0){ if(sp.k & 1) return 0; q = s1.p2.screen; } }
    return q; }
  // one fence rail at height hh (half-road widths) from this slice's near end (x, y, uw) to its far end (fx, fy, qw); t, ft: its thickness at each end
  function fenceRail(x, y, uw, fx, fy, qw, t, ft, hh, col){ const o = 0; poly(x + uw * o, y - uw * hh, x + uw * o, y - uw * hh - t, fx + qw * o, fy - qw * hh - ft, fx + qw * o, fy - qw * hh, col); }
  function drawWall(sp, x, y, uw, fog, now, sk){ const q = farQ(sp, y, fog); if(!q) return; const s = segs[sp.k], fx = q.x + sp.x * q.w, fy = q.y; if(fy > y + 1 || (x < -PX && fx < -PX) || (x > W + PX && fx > W + PX)) return;
    const left = sp.x < 0, low = sk.low, warm = (s.lit || 0) * .5;
    const H_ = left ? WALL_L : WALL_R, h = uw * H_, fh = q.w * H_;
    poly(x, y + 1, x, y - h, fx, fy - fh, fx, fy + 1, fc(mixc(left ? C3 : '#3a4060', '#8a5a3a', warm), fog, low));
    if(y - fy < PX * 1.5 && fog > .5){ if(!left) poly(x, y - uw * RAIL, x, y - uw * RAIL - PX, fx, fy - q.w * RAIL - PX, fx, fy - q.w * RAIL, fc(C4, fog, low)); return; }
    const bh = Math.max(PX * .8, h * .14), fbh = Math.max(PX * .5, fh * .14);
    if(fog < .35) poly(x, y - h * .35, x, y - h * .35 - bh, fx, fy - fh * .35 - fbh, fx, fy - fh * .35, fc(C1, fog, low));
    poly(x, y - h, x, y - h - Math.max(PX, h * .1), fx, fy - fh - Math.max(PX * .6, fh * .1), fx, fy - fh, fc(mixc(C5, '#ffcf90', warm), fog, low));
    if(sp.k % 6 === 0 && fog < .7){ cx.fillStyle = fc(C0, fog, low); pxRect(Math.round(x), y - h, Math.max(1, PX * .7), h); }
    if(left || fog > .88) return;
    // the airfield security fence: posts every 6 segments, two rails and a barbed outrigger leaning away from the road
    const t = Math.max(PX * .7, uw * .012), ft = Math.max(PX * .5, q.w * .012);
    // (rails stay under eye height, about .3 half-road widths on screen, so they run down toward the camera instead of sweeping across the scenery)
    fenceRail(x, y, uw, fx, fy, q.w, t, ft, RAIL, fc(mixc(C5, '#ffcf90', warm), fog, low)); if(fog < .3) fenceRail(x, y, uw, fx, fy, q.w, t, ft, RAIL * .55, fc(C3, fog, low));
    if(sp.k % 6 === 0 && fog < .8){ cx.fillStyle = fc(C1, fog, low); const pw = Math.max(PX * .7, uw * .018); pxRect(Math.round(x), y - uw * FENCE, pw, uw * (FENCE - WALL_R));
      cx.beginPath(); cx.moveTo(x, y - uw * FENCE); cx.lineTo(x + uw * .07, y - uw * (FENCE + .08)); cx.lineTo(x + uw * .07 + pw, y - uw * (FENCE + .08)); cx.lineTo(x + pw, y - uw * FENCE); cx.fill();
      cx.fillStyle = fc(C3, fog, low); pxRect(Math.round(x), y - uw * FENCE, Math.max(1, pw * .4), uw * (FENCE - WALL_R)); } }

  const lampSprR = () => { const key = P + 'lampR'; if(SPR[key]) return SPR[key]; const a = lampSpr(), c = document.createElement('canvas'); c.width = a.width; c.height = a.height; const k = c.getContext('2d'); k.translate(a.width, 0); k.scale(-1, 1); k.drawImage(a, 0, 0); return SPR[key] = c; };
  const LAMP_CONE = [3, .44, .04, 1.5, .2, .055];   // the lamp's two light cones: top width (sprite px), foot width, alpha
  function drawLamp(sp, x, y, uw, fog, now, sk){ const left = sp.x < 0, spr = left ? fogged(lampSpr(), 'lamp', fog, sk.low) : fogged(lampSprR(), 'lampR', fog, sk.low), k = uw * 1.7 / spr.height, base = y - uw * (left ? WALL_L : WALL_R);
    const nf = scaleFade(k); if(nf <= 0) return;   // beside the camera a lamp reached 100x (one sprite pixel a fifth of the screen): it fades out as it passes
    cx.globalAlpha = nf; blit(spr, x, base, k); cx.globalAlpha = 1;
    const hx0 = x + (left ? 1 : -1) * 7 * k, hy = base - spr.height * k + 6 * k, a = (1 - fog * .7) * nf;
    if(fog < .8 && fog > .03){ cx.globalCompositeOperation = 'lighter';
      for(let c = 0; c < 6; c += 3){ const wt = LAMP_CONE[c], wb = LAMP_CONE[c + 1], al = LAMP_CONE[c + 2]; cx.fillStyle = `rgba(255,150,60,${(al * (1 - fog) * nf).toFixed(3)})`; const tw = wt * k, bw = uw * wb;
        cx.beginPath(); cx.moveTo(hx0 - tw, hy); cx.lineTo(hx0 + tw, hy); cx.lineTo(hx0 + bw, y); cx.lineTo(hx0 - bw, y); cx.closePath(); cx.fill(); }
      cx.globalCompositeOperation = 'source-over'; }
    glow(hx0, hy + k, Math.min(uw * .24 + 2, H * .12), SOD, .5 * a); }

  /* the monorail, as projected geometry (the technique of setpiece/rail.js's viaduct): two straddle beams on T-piers, built per segment
     from the segment's projected end points, at their own lateral offsets. Every face is a world-space quad run through the projection, and
     a face is drawn only when it faces the camera: the beam's road-side face, or its far face when a bend swings the beam across the line of
     sight; its underside (it stands above the eye); its top only on a crest that lifts the camera above it. Trains are boxes in the same
     space: an underside skirt with the beam slot, a flank with the livery stripes and a lit window ribbon, and the cab end cap with its
     lamps where it faces you. The inbound train runs with you on the near beam (you overtake it); the outbound one comes at you on the far
     beam. Unlike the viaduct it needs no screen-space near field: it is honest geometry all the way and slides off the left edge beside you;
     everything stands outboard of the barrier, so it can never cover the road at any playerX. */
  const MN = -2.0, MF = -2.62, MPX = (MN + MF) / 2;            // track centres (near: inbound, with you; far: outbound, at you); the pier column
  const BW = .065, MB = .62, MT = .76;                          // beam half-width, bottom, top (half-road widths, as sprite heights)
  const TWD = .18, TB = .68, TT = 1.08, TNS = .97;              // train half-width, skirt bottom, roof, roof at the cab tip
  const CARS = 14, NCAR = 6, NOSE_S = 2.4, LOOPN_S = 420, LOOPF_S = 690, TVN_S = 30, TVF_S = 36, MPIER = 9;   // in segments (and segments a second)
  let trOffN = 0, trOffF = 0; const GLW = [];
  // the rear cab of the inbound train and the nose of the outbound one: both at the train's near end (the low z), mod their loop
  const trainZ = (now, sg) => { const L = (sg > 0 ? LOOPN_S : LOOPF_S) * SEG, z = sg > 0 ? now / 1000 * TVN_S * SEG + trOffN : trOffF - now / 1000 * TVF_S * SEG; return (z % L + L) % L; };
  // projector for one span of road (one segment, or two / four merged far away): lateral x (half-road widths), height h, world z
  const PR = { ax:0, ay:0, aw:0, bx:0, by:0, bw:0, z0:0, zl:1, off:0 };
  const pX = (x, z) => { const t = (z - PR.z0) / PR.zl; return PR.ax + (PR.bx - PR.ax) * t + (x + PR.off) * (PR.aw + (PR.bw - PR.aw) * t); };
  const pY = (h, z) => { const t = (z - PR.z0) / PR.zl; return PR.ay + (PR.by - PR.ay) * t - h * (PR.aw + (PR.bw - PR.aw) * t); };
  const pW = z => PR.aw + (PR.bw - PR.aw) * (z - PR.z0) / PR.zl;
  const wallQ = (x, h0, h1, za, zb, col) => { const xa = pX(x, za), xb = pX(x, zb); poly(xa, pY(h0, za), xa, pY(h1, za), xb, pY(h1, zb), xb, pY(h0, zb), col); };
  const flatQ = (x0, x1, h, za, zb, col) => { const ya = pY(h, za), yb = pY(h, zb); poly(pX(x0, za), ya, pX(x1, za), ya, pX(x1, zb), yb, pX(x0, zb), yb, col); };
  const capQ = (x0, x1, h0, h1, z, col) => { const a = pX(x0, z), b = pX(x1, z), y0 = pY(h0, z), y1 = pY(h1, z); poly(a, y0, a, y1, b, y1, b, y0, col); };
  // a line along a face at least one canvas pixel thick (k = thickness in half-road widths, growing downward from h)
  const lineQ = (x, h, za, zb, k, col) => { const xa = pX(x, za), xb = pX(x, zb), ya = pY(h, za), yb = pY(h, zb); poly(xa, ya, xa, ya + Math.max(PX, k * pW(za)), xb, yb + Math.max(PX, k * pW(zb)), xb, yb, col); };
  // which flank faces the camera: +1 the road side (x + hw), -1 the far side (x - hw), 0 neither (end-on)
  const flank = (c, hw, z) => pX(c + hw, z) < W / 2 ? 1 : pX(c - hw, z) > W / 2 ? -1 : 0;
  const MC = { face:'#323a5c', faceF:'#20263e', under:'#11152a', top:'#5a6690', rim:'#7a88b8', joint:'#0b0e1c',
    pierF:'#2c3352', pierL:'#46507a', pierS:'#1a2038', head:'#262d4a',
    body:'#a2aac0', bodyL:'#d4dae8', bodyD:'#727a94', ol:'#262a44', skirt:'#6e768e', under2:'#161a2c',
    navy:'#1c2c74', sky:'#3a86d4', lime:'#78c840', glass:'#1a2440', win:'#f4f8ff', winW:'#ffe2a8', winD:'#3a4466', pil:'#4a5476', door:'#7e869e' };
  const MCW = ['face', 'pierF']; let mcKey = '', MCF = null;
  // fogged palette: 13 fog steps x 2 sodium-warm steps, built once per sky colour (never per quad)
  function mcol(fog, warm, low){ if(mcKey !== low){ mcKey = low; MCF = {}; } const q = Math.round(fog * 12), wq = warm > .12 ? 1 : 0, key = q * 2 + wq;
    let t = MCF[key]; if(!t){ t = MCF[key] = {}; for(const k in MC) t[k] = mixc(wq && MCW.includes(k) ? mixc(MC[k], '#a87848', .22) : MC[k], low, q / 12 * .85); } return t; }

  // the beam between za..zb on track c (its face stops at the train's skirt where a train straddles it)
  function beam(c, za, zb, top, F, thin){
    if(!thin && pY(MB, za) < pY(MB, zb)) flatQ(c - BW, c + BW, MB, za, zb, F.under);
    if(top === MT && pY(MT, za) > pY(MT, zb)) flatQ(c - BW, c + BW, MT, za, zb, F.top);
    const sd = flank(c, BW, (za + zb) / 2); if(!sd) return; const x = c + sd * BW;
    wallQ(x, MB, top, za, zb, sd > 0 ? F.face : F.faceF);
    if(thin || (MT - MB) * pW(za) < PX * 4) return;                    // (far away the face is a few rows: no lines on it)
    if(top === MT) lineQ(x, MT, za, zb, .012, F.rim);                 // the moonlit top edge
    lineQ(x, MB + .024, za, zb, .012, F.under);                         // the shadow line under the lip
    const jz = (Math.ceil((za / SEG - .5) / MPIER) * MPIER + .5) * SEG; if(jz < zb && jz - 8 >= za) wallQ(x, MB, top, jz - 8, jz + 8, F.joint); }   // the beam joint over each pier
  // a piece of a train's flank za..zb (one car, no joints inside); tz = the train's near end, which carries the cab facing you
  const roofAt = (z, tz) => { const q = Math.min(z - tz, tz + CARS * NCAR * SEG - z) / (NOSE_S * SEG); return q >= 1 ? TT : TNS + (TT - TNS) * (1 - (1 - q) * (1 - q)); };
  // a band h0..h1 of the flank piece being drawn (FPX at za..zb), cut by its roof line (FPRA, FPRB) where the cab's roof slopes
  let FPX = 0, FPZA = 0, FPZB = 0, FPRA = 0, FPRB = 0;
  function fpQuad(h0, h1, col){ const xa = pX(FPX, FPZA), xb = pX(FPX, FPZB); poly(xa, pY(h0, FPZA), xa, pY(Math.min(h1, FPRA), FPZA), xb, pY(Math.min(h1, FPRB), FPZB), xb, pY(h0, FPZB), col); }
  function flankPiece(c, sd, za, zb, tz, F, lod, car, sg, part){
    const x = c + sd * TWD, nose = za < tz + NOSE_S * SEG || zb > tz + (CARS * NCAR - NOSE_S) * SEG, ra = roofAt(za, tz), rb = roofAt(zb, tz);
    FPX = x; FPZA = za; FPZB = zb; FPRA = ra; FPRB = rb;   // the piece, for fpQuad
    if(part & 1){ fpQuad(TB, TT, F.body);
    fpQuad(TB, TB + .05, F.skirt);
    if(lod > 0){ fpQuad(TB + .05, TB + .07, F.lime); fpQuad(TB + .07, TB + .1, F.sky); fpQuad(TB + .1, TB + .14, F.navy); }
    else fpQuad(TB + .07, TB + .13, F.navy);
    // the window ribbon: lit cabins (cool LED, a few warm), a dark windscreen band on the cab
    if(nose) fpQuad(.88, .98, F.glass);
    else { fpQuad(.88, .98, F.win); if(lod > 0){ fpQuad(.87, .885, F.winD); fpQuad(.975, .99, F.winD); } }
    }
    if(part & 2 && lod > 1 && !nose){ const C = CARS * SEG, P = C / 8, c0 = tz + car * C, k0 = Math.floor((za - c0) / P), k1 = Math.floor((zb - c0) / P);   // 8 windows a car, fixed to it
      if(Math.abs(pX(x, za + P) - pX(x, za)) > PX * 3) for(let k = Math.max(0, k0); k <= Math.min(7, k1); k++){ const w0 = c0 + k * P, h = H0(k * 3.7 + car * 11 + (sg > 0 ? 0 : 50));
        if(h > .8){ const q0 = Math.max(za, w0 + 40), q1 = Math.min(zb, w0 + P); if(q1 > q0) wallQ(x, .885, .975, q0, q1, h > .94 ? F.winD : F.winW); }      // a few cabins lit warm, one or two dark
        const p0 = Math.max(za, w0), p1 = Math.min(zb, w0 + 40); if(p1 > p0) wallQ(x, .88, .98, p0, p1, F.pil);
        // the two door pairs a side (Tokyo Monorail cars have two): a plain leaf over windows 2 and 5
        if(k === 2 || k === 5){ const d0 = Math.max(za, w0 + 40), d1 = Math.min(zb, w0 + P); if(d1 > d0) wallQ(x, TB + .05, .98, d0, d1, F.door); } } }
    if(part & 1 && lod > 0 && ra === TT && rb === TT){ const xa = pX(x, za), xb = pX(x, zb), ya = pY(ra, za), yb = pY(rb, zb); poly(xa, ya, xa, ya + Math.max(PX, .012 * pW(za)), xb, yb + Math.max(PX, .012 * pW(zb)), xb, yb, F.bodyL);   // the moonlit roof line
      lineQ(x, TB + .012, za, zb, .012, F.ol); } }                                                                                                                  // dark outline under the skirt
  // the cab end that faces you: body, stripes, windscreen with a glint, and the lamps (red tail lights inbound, headlights outbound)
  function cab(c, z, F, sg, fog, lod){ const hw = TWD, xL = c - hw, xR = c + hw, ch = .035;
    const a = pX(xL, z), b = pX(xR, z), w = pW(z), y0 = pY(TB, z), y1 = pY(TNS, z);
    poly(a, y0, a, y1 + ch * w, b, y1 + ch * w, b, y0, F.body); poly(a + ch * w, y1 + ch * w, a + ch * w, y1, b - ch * w, y1, b - ch * w, y1 + ch * w, F.body);   // chamfered top corners
    capQ(xL, xR, TB, TB + .05, z, F.skirt);
    if(lod > 0){ capQ(xL, xR, TB + .05, TB + .07, z, F.lime); capQ(xL, xR, TB + .07, TB + .1, z, F.sky); capQ(xL, xR, TB + .1, TB + .14, z, F.navy); }
    capQ(xL + .035, xR - .035, .845, .925, z, F.glass); capQ(c - .01, c + .01, .845, .925, z, F.pil);
    capQ(xL, xR, TB, TB + .012, z, F.ol);
    if(fog > .9) return;
    const r = Math.max(PX, Math.round(w * .02 / PX) * PX), ly = pY(TB + .115, z), lc = sg > 0 ? '#ff3a2a' : '#fff6dc';
    cx.fillStyle = lc; for(let q = -1; q <= 1; q += 2){ const lx = c + q * hw * .62; pxRect(pX(lx, z) - r / 2, ly - r / 2, r, r); }
    // the lamps' glow goes on after the near track is drawn, so the outbound train's headlights bloom past the near beam that hides its nose
    if(fog < .8) for(let q = -1; q <= 1; q += 2){ const lx = c + q * hw * .62; GLW.push(pX(lx, z), ly, w * (sg > 0 ? .06 : .12) + 2, sg > 0 ? 1 : 0, (sg > 0 ? .45 : .6) * (1 - fog)); }
    if(lod > 1){ const gx = pX(c - hw * .3, z), gy = pY(.9, z), g = Math.max(PX, Math.round(w * .012 / PX) * PX); cx.fillStyle = '#c8dcff'; pxRect(gx, gy, g * 2, g); pxRect(gx + g * 2, gy + g, g, g); }   // the glint on the screen
    if(lod > 1){ capQ(c - .015, c + .015, .94, TNS - .005, z, F.bodyD); } }
  // one track over za..zb: its beam, and whatever part of its train covers this span
  // a run za..zb of a train's flank in n equal pieces (one piece at the lowest detail)
  function flankRun(za, zb, n, c, sd, tz, F, lod, sg){ if(zb <= za) return; if(lod < 1) n = 1; const st = (zb - za) / n; for(let k = 0; k < n; k++) flankPiece(c, sd, za + k * st, za + (k + 1) * st, tz, F, lod, 0, sg, 1); }
  function track(c, sg, z0, z1, F, fog, lod, thin, now){
    const L = (sg > 0 ? LOOPN_S : LOOPF_S) * SEG, TLEN = CARS * NCAR * SEG, ph = trainZ(now, sg);
    let tz = z0 - ((z0 - ph) % L + L) % L;                      // the train whose near end is at or before z0
    if(tz + TLEN <= z0) tz += L;
    const ta = Math.max(z0, tz), tb = Math.min(z1, tz + TLEN);
    if(tb <= ta){ beam(c, z0, z1, MT, F, thin); return; }
    if(ta > z0) beam(c, z0, ta, MT, F, thin);
    if(tb < z1) beam(c, tb, z1, MT, F, thin);
    // under the train: the skirt's underside (above the eye), then the beam in its slot, then the flank and the cab
    if(pY(TB, ta) < pY(TB, tb)) flatQ(c - TWD, c + TWD, TB, ta, tb, F.under2);
    beam(c, ta, tb, TB, F, thin);
    const sd = flank(c, TWD, (ta + tb) / 2);
    if(sd){ const C = CARS * SEG, ne = tz + NOSE_S * SEG, fe = tz + TLEN - NOSE_S * SEG;
      // the long runs (body, stripes, ribbon, roof line) in as few pieces as possible, so their edges never step as the train moves;
      // the cabs' sloping roofs in three slices each, so the profile curves
      flankRun(ta, Math.min(tb, ne), 3, c, sd, tz, F, lod, sg); flankRun(Math.max(ta, ne), Math.min(tb, fe), 1, c, sd, tz, F, lod, sg); flankRun(Math.max(ta, fe), tb, 3, c, sd, tz, F, lod, sg);
      // the windows and doors, car by car (fixed to the train)
      // (car from z + 1, not z: when z lands exactly on a car joint, floating point can floor (z - tz) / C to the car behind, whose end is z
      // itself, and the loop never advanced: the game froze on Haneda, 3 runs in 4 under the perf harness. Craft pass 2026-11-19.)
      if(lod > 1) for(let z = Math.max(ta, ne); z < Math.min(tb, fe);){ const car = Math.floor((z + 1 - tz) / C), ce = Math.min(tb, fe, tz + (car + 1) * C); if(!(ce > z)) break; flankPiece(c, sd, z, ce, tz, F, lod, car, sg, 2); z = ce; }
      // the gangway gaps between cars, over the pieces either side
      for(let k = 1; k < NCAR; k++){ const j = tz + k * C, j0 = Math.max(ta, j - 30), j1 = Math.min(tb, j + 30); if(j1 > j0) wallQ(c + sd * TWD, TB + .02, TT - .02, j0, j1, F.joint); } }
    if(tz >= z0 && tz < z1 && tz > position + 80) cab(c, tz, F, sg, fog, lod); }
  // a T-pier: a column with a haunched crosshead carrying both beams (front face, the side that shows, the crosshead's underside)
  function tpier(z, F, fog){ const d = 42, zf = z - d, zb = z + d, cw = .055, armL = MF - .12, armR = MN + .12, ht = MB - .06, hh = ht - .07;
    const sd = flank(MPX, cw, z); if(sd) wallQ(MPX + sd * cw, 0, hh, zf, zb, F.pierS);
    if(pY(MB, zf) < pY(MB, zb)) flatQ(armL, armR, ht, zf, zb, F.under);
    const sa = flank(MPX, armR - MPX, z); if(sa) wallQ(MPX + sa * (armR - MPX), ht, MB, zf, zb, F.pierS);
    capQ(MPX - cw, MPX + cw, 0, hh, zf, F.pierF);
    { const a = pX(MPX - cw, zf), b = pX(MPX + cw, zf), l = pX(armL, zf), r = pX(armR, zf), y0 = pY(hh, zf), y1 = pY(ht, zf); poly(a, y0, l, y1, r, y1, b, y0, F.pierF); }   // the haunch
    capQ(armL, armR, ht, MB, zf, F.head);
    if(fog < .6){ capQ(MPX - cw, MPX - cw * .3, 0, hh, zf, F.pierL); const a = pX(armL, zf), b = pX(armR, zf), y = pY(MB, zf); cx.fillStyle = F.rim; pxRect(a, y, b - a, PX); }
    // its reflection in the bay: a dim broken column under the foot
    if(fog < .7){ const x = pX(MPX - cw, zf), w2 = pX(MPX + cw, zf) - x, y = pY(0, zf), len = pW(zf) * .35; cx.fillStyle = F.pierF; cx.globalAlpha = .35 * (1 - fog);
      for(let k = 0; k < 4; k++) pxRect(x + (k & 1 ? w2 * .2 : 0), y + PX + k * len / 4, w2 * (k & 1 ? .6 : 1), Math.max(PX, len / 8)); cx.globalAlpha = 1; } }
  function monoHas(t){ const L = t.sprites; for(let n = 0; n < L.length; n++) if(L[n].type === 'mono') return true; return false; }
  function monoFull(g, m){ for(let j = g; j < g + m; j++){ const t = segs[j]; if(!t || !monoHas(t)) return false; } const e = segs[g + m - 1]; return e.p2.screen.scale > 0 && e.p2.camera.z > 0; }
  // would segment g (a run's first) merge m segments this frame? the same test drawMono makes there
  function monoMerges(g, m){ const t = segs[g], n = g - segAt(position).index; if(!t || !(t.p1.screen.scale > 0) || t.p1.camera.z <= DEPTH || n < 1 || n > DRAW - 3) return false;
    const f = clamp(Math.pow(n / DRAW, 1.6), 0, 1); if(!(t.p1.screen.y - t.p2.screen.y < PX * 1.5) || !(f > .5) || (f > .8 ? 4 : 2) !== m) return false; return monoFull(g, m); }
  function drawMono(sp, x, y, uw, fog, now, sk){ const s = segs[sp.k]; if(!s || !s.p2.screen.scale) return;
    // far away, thin segments are merged two (or four) at a time, anchored to the world so the merge never shifts
    const a = s.p1.screen, thinY = y - s.p2.screen.y < PX * 1.5; let span = 1;
    // (2026-11-24) a segment skips only when its run's first segment will merge the whole run; that one is nearer, so it may not be thin
    // or fogged enough to merge, or its run's end may be behind the camera, and the skipped segments then drew nothing (a hole)
    if(thinY && fog > .5){ const m = fog > .8 ? 4 : 2, g = sp.k - sp.k % m; if(g !== sp.k){ if(monoMerges(g, m)) return; } else if(monoFull(g, m)) span = m; }
    const b = segs[sp.k + span - 1].p2.screen;
    PR.ax = a.x; PR.ay = a.y; PR.aw = a.w; PR.bx = b.x; PR.by = b.y; PR.bw = b.w; PR.z0 = sp.k * SEG; PR.zl = span * SEG; PR.off = a.w ? (x - a.x) / a.w - sp.x : 0;   // (off: a fork branch shifts the props)
    if(pX(MN + TWD + .05, PR.z0) < -PX * 2 && pX(MN + TWD + .05, PR.z0 + PR.zl) < -PX * 2) return;   // all of it off the left edge (beside / behind you)
    const z0 = PR.z0, z1 = z0 + PR.zl, F = mcol(fog, (s.lit || 0), sk.low), thin = y - b.y < PX * 1.5, lod = fog > .6 || thin ? 0 : fog > .3 ? 1 : 2;
    for(let i = sp.k; i < sp.k + span; i++) if(i % MPIER === 0 && fog < .93) tpier((i + .5) * SEG, F, fog);
    track(MF, -1, z0, z1, F, fog, lod, thin, now);
    track(MN, 1, z0, z1, F, fog, lod, thin, now);
    for(let k = 0; k < GLW.length; k += 5) glow(GLW[k], GLW[k + 1], GLW[k + 2], GLW[k + 3] ? '#ff3a2a' : '#fff0c8', GLW[k + 4]); GLW.length = 0; }

  // the approach-light pier: posts on a jetty, a crossbar of five lamps; the sequenced strobe runs out ahead (toward the runway)
  function drawPier(sp, x, y, uw, fog, now, sk){ if(uw < .8) return; const low = sk.low, a = 1 - fog * .6, h = uw * 1.12, cw = uw * .7, j = sp.k / PIER;
    // a steel pier: two legs splayed on the jetty, a cross brace, the lamp bar on top
    const pw = Math.max(1, uw * .035), ft = uw * .14;
    if(fog > .6){ cx.fillStyle = fc(C1, fog, low); pxRect(Math.round(x - pw / 2), y - h, Math.max(1, pw), h); }
    else { cx.fillStyle = fc(C1, fog, low); cx.beginPath(); cx.moveTo(x - ft - pw, y); cx.lineTo(x - pw, y - h); cx.lineTo(x + pw, y - h); cx.lineTo(x + ft + pw, y); cx.lineTo(x + ft - pw, y); cx.lineTo(x, y - h * .8); cx.lineTo(x - ft + pw, y); cx.closePath(); cx.fill(); }
    if(fog < .7){ cx.fillStyle = fc(C2, fog, low); pxRect(Math.round(x - ft * .7), Math.round(y - h * .3), Math.round(ft * 1.4), Math.max(1, Math.round(uw * .02))); pxRect(Math.round(x - pw / 2), y - h, Math.max(1, pw * .4), h * .8); }
    cx.fillStyle = fc(C2, fog, low); pxRect(Math.round(x - cw / 2), Math.round(y - h), Math.round(cw), Math.max(1, Math.round(uw * .03)));
    if(fog < .6){ cx.fillStyle = fc(C1, fog, low); for(let sd = -1; sd <= 1; sd += 2){ cx.beginPath(); cx.moveTo(x, y - h * .82); cx.lineTo(x + sd * cw * .42, y - h); cx.lineTo(x + sd * cw * .42, y - h + Math.max(1, uw * .02)); cx.lineTo(x, y - h * .78); cx.fill(); } }
    const ls = Math.max(PX, Math.round(uw * .045)), ly = Math.round(y - h - ls * .8);
    cx.fillStyle = fog > .5 ? fc('#dfe8ff', (fog - .5) * .95, low) : '#dfe8ff';
    if(cw < PX * 6) pxRect(Math.round(x - cw * .45), ly, Math.max(PX, Math.round(cw * .9)), ls);   // far: the bar reads as one line of light
    else for(let n = -2; n <= 2; n++) pxRect(Math.round(x + n * cw / 4.4 - ls / 2), ly, ls, ls);
    if(fog < .45){ const hs = Math.max(PX, Math.round(cw * .06 / PX) * PX); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = .55 * a; blit(haloSpr('#9ab4ff'), x, ly + ls / 2 + 4.5 * hs, hs); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
    // the rabbit: one post at a time, running away from the camera; slow and soft under reduced motion
    const step = reduce ? 520 : 42, ph = Math.floor(now / step) % PIER_CYC, jj = ((j % PIER_CYC) + PIER_CYC) % PIER_CYC;
    if(jj === ph){ const r = ls * 1.8; cx.fillStyle = '#ffffff'; pxRect(Math.round(x - r / 2), Math.round(ly - r * .3), r, r); glow(x, ly, (reduce ? uw * .35 : uw * .9) + 4, '#e8f0ff', (reduce ? .35 : .75) * a); } }

  let JAX = 0, JAF = 1, JAK = 1; const jetAx = px => JAX + JAF * (px - JW / 2) * JAK;   // a jet sprite column to screen x (drawJet)
  function drawJet(sp, x, y, uw, fog, now, sk){ const spr = fogged(jetSpr(sp.v), 'jet' + sp.v, fog, sk.low), k = uw * 8.6 / JW, a = 1 - fog * .75, f = sp.flip ? -1 : 1, x0 = x - JW * k / 2, y0 = y - JH * k;
    JAX = x; JAF = f; JAK = k;   // for jetAx
    // floodlight wash on the apron under the jet (drawn first)
    put(spr, x, y, k, sp.flip);
    if(fog < .85){ glow(jetAx(JET_LOGO[0]), y0 + JET_LOGO[1] * k, uw * .45, '#fff0d0', .22 * a); glow(jetAx(14), y0 + 18 * k, uw * .4, '#cfe6ff', .18 * a); }
    if(H0(sp.k * 1.9) > .55){ const on = reduce || Math.sin(now / 480 + sp.k) > .6, sz = Math.max(PX, Math.round(k * 1.4));
      if(on) for(let q = 0; q < 2; q++){ const bx = (q ? JET_BELLY : JET_BEACON)[0], by = (q ? JET_BELLY : JET_BEACON)[1]; cx.fillStyle = '#ff4a3a'; pxRect(Math.round(jetAx(bx) - sz / 2), Math.round(y0 + by * k - sz / 2), sz, sz); glow(jetAx(bx), y0 + by * k, uw * .2 + 2, '#ff3a2a', .4 * a); } } }

  function drawTerm(sp, x, y, uw, fog, now, sk){ const spr = fogged(termSpr(sp.v), 'term' + sp.v, fog, sk.low), k = uw * 7.2 / 96; { const [s2, k2] = artK(spr, k); blit(s2, x, y, k2); }
    if(fog < .8) glow(x, y - 20 * k, uw * 1.4, '#9cc4f0', .08 * (1 - fog)); }

  function drawHangar(sp, x, y, uw, fog, now, sk){ const v = sp.v % 3, spr = fogged(hangarSpr(v), 'hangar' + v, fog, sk.low), k = uw * 7 / 120, a = 1 - fog * .75, x0 = x - 60 * k, y0 = y - 66 * k; { const [s2, k2] = artK(spr, k); blit(s2, x, y, k2); }
    if(fog < .85){ cx.globalCompositeOperation = 'lighter'; cx.fillStyle = `rgba(255,220,160,${(.05 * (1 - fog)).toFixed(3)})`;
      for(const fx of HANGAR_FL){ const lx = x0 + fx * k, ly = y0 + 21 * k; cx.beginPath(); cx.moveTo(lx - k, ly); cx.lineTo(lx + k, ly); cx.lineTo(lx + uw * .6, y + uw * .25); cx.lineTo(lx - uw * .6, y + uw * .25); cx.closePath(); cx.fill(); }
      cx.globalCompositeOperation = 'source-over';
      for(const fx of HANGAR_FL) glow(x0 + fx * k, y0 + 21.5 * k, uw * .14 + 2, '#fff0d0', .4 * a);
      glow(x, y - 20 * k, uw * 1.8, '#ffc880', .08 * a); }
    const on = reduce || Math.sin(now / 560 + sp.k) > -.2; if(on){ const sz = Math.max(PX, Math.round(k * 1.5)); cx.fillStyle = '#ff4a3a'; for(const bx of HANGAR_BCN) pxRect(Math.round(x0 + bx * k), Math.round(y0 + 13 * k), sz, sz); } }

  const MAST_CONE = [1.1, .035, .55, .05];   // the floodlight mast's two light cones: foot width, alpha
  function drawMast(sp, x, y, uw, fog, now, sk){ const spr = fogged(mastSpr(), 'mast', fog, sk.low), k = uw * 3.8 / 100, a = 1 - fog * .7, hy = y - 100 * k + 6 * k; blit(spr, x, y, k);
    if(fog < .85 && fog > .02){ cx.globalCompositeOperation = 'lighter'; for(let c = 0; c < 4; c += 2){ const wb = MAST_CONE[c], al = MAST_CONE[c + 1]; cx.fillStyle = `rgba(255,214,150,${(al * (1 - fog)).toFixed(3)})`;
        cx.beginPath(); cx.moveTo(x - 7 * k, hy); cx.lineTo(x + 7 * k, hy); cx.lineTo(x + uw * wb, y); cx.lineTo(x - uw * wb, y); cx.closePath(); cx.fill(); } cx.globalCompositeOperation = 'source-over'; }
    glow(x, hy, uw * .45 + 2, '#ffe6b8', .5 * a); }

  function drawTruck(sp, x, y, uw, fog, now, sk){ if(uw < 1.5) return; const spr = fogged(truckSpr(), 'truck', fog, sk.low), k = uw * 1.15 / 36; put(spr, x, y, k, sp.flip);
    const on = reduce ? true : Math.floor(now / 330 + sp.k) % 2 === 0, bx = x + (sp.flip ? -1 : 1) * (5.5 - 18) * k, by = y - 15 * k;
    if(on){ cx.fillStyle = '#ffc040'; const sz = Math.max(PX, Math.round(k * 2)); pxRect(Math.round(bx - sz / 2), Math.round(by - sz / 2), sz, sz); if(fog < .8) glow(bx, by, uw * .3 + 2, '#ffa020', (reduce ? .25 : .45) * (1 - fog)); }
    if(fog < .8) glow(x + (sp.flip ? 1 : -1) * 17 * k, y - 6 * k, uw * .25, '#fff4d8', .2 * (1 - fog)); }

  // the sign lettering, rendered once in the pixel font at twice the sprite's resolution and thresholded to hard pixels (built as soon as the font is ready)
  let signText = null, signAsk = 0, signCv = null;   // signCv: made in warm(), so a font that arrives late paints into it instead of allocating mid-ride
  function signTextSpr(){ if(signText) return signText; const t = performance.now(); if(t - signAsk < 700) return null; signAsk = t;
    try{ if(!document.fonts || !document.fonts.check('16px "DotGothic16"')) return null; }catch(e){ return null; }
    // four times the sprite's resolution: the kanji at 32 px (the font's grid doubled), the romaji at its native 16 px
    const c = signCv || (signCv = document.createElement('canvas')); c.width = 448; c.height = 240; const k = c.getContext('2d'); k.fillStyle = '#f0f0e4'; k.textBaseline = 'top';
    for(const [x0, w, main] of SIGNS){ k.font = '32px "DotGothic16"'; k.fillText(main, (x0 + 2) * 4, 86); }   // (the romaji: ROMA below, a 3x5 face drawn on the grid)
    const img = k.getImageData(0, 0, 448, 240), d = img.data; for(let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0; k.putImageData(img, 0, 0); return signText = c; }
  /* The English line (audit #15: 16 px DotGothic at a quarter of a sprite pixel came out as garbage glyphs, "AH 3 x IIPDT"): the HUD's 3x5
     face, one 1:1 canvas per sign made at load, drawn at a whole number of canvas pixels a font pixel (1 at the common distance, growing
     in steps as the sign nears). Where even 1 canvas pixel would not fit, each word is a dashed line: it reads as a line of text, not mush. */
  const R3 = { A:'010101111101101', D:'110101101101110', E:'111100110100111', H:'101101111101101', I:'111010010010111', L:'100100100100111', M:'101111111101101',
    N:'110101101101101', O:'010101101101010', P:'110101110100100', R:'110101110101101', T:'111010010010010', "'":'010010000000000', '.':'000000000000010', ' ':'000000000000000' };
  const ROMA = SIGNS.map(([, , , sub]) => { const c = document.createElement('canvas'); c.width = sub.length * 4 - 1; c.height = 5; const g = c.getContext('2d'); g.fillStyle = '#f0f0e4';
    [...sub].forEach((ch, n) => { const b = R3[ch] || R3[' ']; for(let i = 0; i < 15; i++) if(b[i] === '1') g.fillRect(n * 4 + i % 3, (i / 3) | 0, 1, 1); }); return c; });
  const ROOM = [31, 34];   // sprite px free for the line on each sign (the first ends before the plane pictogram at column 45)
  function roma(x, top, k){
    SIGNS.forEach(([x0, , , sub], i) => { const fu = Math.floor(k * Math.min(.75, ROOM[i] / ROMA[i].width) / PX) * PX, lx = Math.round((x + (x0 + 2 - 56) * k) / PX) * PX, ty = Math.round((top + 31.5 * k) / PX) * PX, c = ROMA[i];
      if(fu >= PX){ cx.imageSmoothingEnabled = false; cx.drawImage(c, lx, ty, c.width * fu, c.height * fu); return; }
      cx.fillStyle = '#f0f0e4'; let xx = lx; for(const wd of sub.split(' ')){ const ww = (wd.length * 4 - 1) * k * .75; for(let d = 0; d < ww - PX; d += 3 * PX) pxRect(xx + d, ty + PX, Math.min(2 * PX, ww - d), PX); xx += (wd.length + 1) * 4 * k * .75; } }); }
  const GANTRY_LT = [18, 50, 72, 94];   // the gantry's floodlights (sprite columns)
  function drawGantry(sp, x, y, uw, fog, now, sk){ const spr = fogged(gantrySpr(), 'gantry', fog, sk.low), k = uw * 2.8 / spr.width, a = 1 - fog * .7; blit(spr, x, y, k);
    const top = y - spr.height * k, tx = k * 8 >= 7 ? signTextSpr() : null;
    if(tx){ if(fog > .3) cx.globalAlpha = 1 - fog * .5; blit(tx, x, y, k / 4); roma(x, top, k); cx.globalAlpha = 1; }
    else { cx.fillStyle = fog > .3 ? mixc('#f0f0e4', '#136a40', fog * .6) : '#f0f0e4'; for(const [x0, w] of SIGNS){ const lx = x + (x0 + 3 - 56) * k, ty = top + 21 * k; pxRect(lx, ty + k, w * .5 * k, Math.max(PX * .7, 3 * k)); pxRect(lx, ty + k * 10.5, w * .6 * k, Math.max(PX * .5, 1.5 * k)); } }
    if(fog < .8){ for(const sx of GANTRY_LT) glow(x + (sx - 56) * k, top + 18 * k, uw * .1 + 1, '#e8f8e0', .3 * a); } }

  function drawTsign(sp, x, y, uw, fog, now, sk){ if(uw < 2) return; const k = uw * .5 / 22, R = Math.round(fog * 5) > 0 ? 1 : k >= PX * 8 ? 8 : k >= PX * 4 ? 4 : k >= PX * 2 ? 2 : 1, sf = 1;   // (near by: the 2x / 4x / 8x art; it no longer fades)
    const spr = R > 1 ? tsignHi(sp.v, R) : fogged(tsignSpr(sp.v), 'tsign' + sp.v, fog, sk.low); blit(spr, x, y, k / R);
    if(fog < .7){ const f = (1 - fog) * sf, hw = (spr.width / 2 - 1) * k; glow(x, y - 9 * k, uw * .3 + 2, TSIGN[sp.v][sp.v === 1 ? 1 : 0], .28 * f); glow(x - hw, y - 4 * k, uw * .07 + 1.5, '#4a7aff', .6 * f); glow(x + hw, y - 4 * k, uw * .07 + 1.5, '#4a7aff', .6 * f); } }
  // the terminal as one projected hall along the apron (2026-11-20, buildings3d; the shared kit ENV.bkit in env/buildings.js), instead of a
  // camera-facing card every 12 segments: the face runs parallel to the road, so it recedes in true perspective. Same reads as the card:
  // the floating roof with its moonlit lip and bright soffit, the tall cool-white departures glass, the warm arrivals level, the base
  const TM_X = 11.5;
  let TFOG = 0, TLOW = ''; const termF = c => fc(c, TFOG, TLOW);   // the terminal's fogged colours (no closure per slice)
  function drawTerm3(sp, x, y, uw, fog, now, sk){ const K = ENV.bkit; if(!K) return; if(fog > .75) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; TFOG = fog; TLOW = sk.low; const F = termF, X = TM_X, rel = K.rel, a = 1 - fog;
    K.Q(X, 0, X, .3, 0, 1, F(C1)); K.Q(X, .3, X, .9, 0, 1, F(WM[1])); K.Q(X, .9, X, .98, 0, 1, F(C2)); K.Q(X, .98, X, 2.05, 0, 1, F(GL[1])); K.Q(X, 2.05, X, 2.12, 0, 1, F('#8aa8d8'));
    if(fog < .25){ const n = m * 3; for(let c = 0; c < n; c++){ const hv = H0(sp.b0 * .3 + rel * 3 + c), t0 = c / n, t1 = (c + 1) / n; if(hv > .55) K.Q(X, 1.0, X, 2.03, t0, t1, F(hv > .86 ? GL[0] : GL[2])); if(hv < .2) K.Q(X, .32, X, .88, t0, t1, F('#3a3040')); else if(hv > .7) K.Q(X, .32, X, .88, t0, t1, F(WM[0])); }
      if(fog < .3) for(let c = 0; c <= n; c++){ K.V(X, .98, 2.05, c / n, .02, F(C2)); K.V(X, .3, .9, c / n, .02, F(C1)); } K.Q(X, 1.5, X, 1.53, 0, 1, F(C2)); }
    // the floating roof: overhanging toward the apron, a moonlit top edge, a lit soffit under the overhang
    K.Q(X - .5, 2.12, X, 2.12, 0, 1, F('#d8e6ff')); K.Q(X - .5, 2.12, X - .5, 2.32, 0, 1, F(C2)); K.Q(X - .5, 2.32, X - .5, 2.36, 0, 1, F(C5)); K.Q(X - .5, 2.36, X + 1.2, 2.5, 0, 1, F(C1));
    if(fog < .6){ cx.globalCompositeOperation = 'lighter'; K.Q(X - 1.2, 0, X, 0, 0, 1, 'rgba(156,196,240,' + (.06 * a).toFixed(3) + ')'); cx.globalCompositeOperation = 'source-over'; }
    if(K.end){ K.E(X, 0, X + 2.5, 2.12, F(C2)); K.E(X + .1, .98, X + 2.4, 2.05, F(GL[2])); K.E(X + .1, .3, X + 2.4, .9, F(WM[2])); K.E(X - .5, 2.12, X + 3, 2.36, F(C3)); K.E(X - .5, 2.32, X + 3, 2.36, F(C5)); } }
  /* The hangars as projected buildings (buildings3d r5), instead of a 7-half-road-wide card every 44 segments: the card stood across the
     road with its door facing down it, so it never showed a side and its door looked the wrong way. Now each hangar is a run of 30 segments
     along the runway (face at HG_X, parallel to the road), its door open toward the road, built from the card's own design in art rows
     (66 rows = HG_H half-road widths): the barrel roof's arch along the run with a moonlit edge, ribbed cladding, the retracted door leaves,
     the lintel with the airline's stripe and its floodlights; through the door, real depth: the warm back wall, the lit floor and the far
     inner wall, the dark ceiling under the door head, and a jet parked nose to the road, seen side-on (fuselage, cockpit glass, windows,
     wing, engine, the tail in the airline's colours). The end facing the camera is the shed's gable wall with a side door. */
  const HG_X = 8.8, HG_D = 4.6, HG_LEN = 68, HG_S0 = 6, HG_CYC = 80, HG_H = 3.85, HG_DOOR = [8, 60], HG_JM = 34;   // (1 half-road width = 10 segments: the card's 7-wide shed is 68 segments long)
  const hgRun = z => { const zr = z - RW0, zh = zr % HG_CYC; return zr >= 0 && zh >= HG_S0 && zh < HG_S0 + HG_LEN && zr - zh + HG_S0 + HG_LEN < ZONE - RW0 - 6 ? zh - HG_S0 : -1; };   // rel in its run, or -1
  const hgH = y => (66 - y) * HG_H / 66;                                                 // art row -> height
  const hgTop = rel => { const dx = rel / HG_LEN * 120 - 59.5; return hgH(4 + (dx / 60) ** 2 * 9); };   // the barrel roof's arch along the run
  let HFOG = 0, HLOW = ''; const hgF = c => fc(c, HFOG, HLOW);
  function drawHang3(sp, x, y, uw, fog, now, sk){ const K = ENV.bkit; if(!K || fog > .86) return; const m = K.begin(sp, x, y, uw, fog, 0); if(!m) return; HFOG = fog; HLOW = sk.low;
    const F = hgF, X = HG_X, D = HG_D, rel = K.rel, r1 = rel + m, a0 = cx.globalAlpha, L = LIVERY[(sp.v + 1) % 4], near = fog < .3, px = K.px, py = K.py;
    if(fog > .76) cx.globalAlpha = a0 * (.86 - fog) / .1;
    const band = (h0, h1, ta, tb, col) => K.Q(X, h0, X, h1, ta, tb, col);
    const Pq = (La, ha, Lb, hb, Lc, hc, Ld, hd, col, tt) => poly(px(La, ha, tt), py(La, ha, tt), px(Lb, hb, tt), py(Lb, hb, tt), px(Lc, hc, tt), py(Lc, hc, tt), px(Ld, hd, tt), py(Ld, hd, tt), col);
    const tAt = r => clamp((r - rel) / m, 0, 1), dA = tAt(HG_DOOR[0]), dB = tAt(HG_DOOR[1]), inDoor = r1 > HG_DOOR[0] && rel < HG_DOOR[1], hDoor = hgH(22), hLint = hgH(14);
    // through the door: the back wall, the floor, the far inner wall, then the parked jet
    if(inDoor){ const BK = X + D * .85;
      K.Q(BK, 0, BK, hDoor, dA, dB, F('#a8805a')); K.Q(BK, hDoor * .55, BK, hDoor, dA, dB, F('#8a6448')); K.Q(BK, hDoor * .82, BK, hDoor, dA, dB, F('#6e5040'));
      K.Q(X, 0, BK, 0, dA, dB, F('#94704c')); if(near) for(let c = 0; c < 3; c++) K.Q(X + .3 + c * 1.1, 0, X + .5 + c * 1.1, 0, dA, dB, F('#f0c888'));   // floor and its light reflections
      if(fog < .5) for(let c = Math.ceil(Math.max(rel, HG_DOOR[0]) / 3) * 3; c <= Math.min(r1, HG_DOOR[1]); c += 3) K.V(BK, 0, hDoor, tAt(c), .04, F('#5a4038'));   // the back wall's columns
      K.Q(X, hDoor - .12, BK, hDoor - .12, dA, dB, F('#3a2c30'));                                                   // the ceiling's underside
      if(rel < HG_DOOR[1] && r1 >= HG_DOOR[1]){ const t = dB; Pq(X, 0, BK, 0, BK, hDoor, X, hDoor, F('#6a4c3a'), t); Pq(X, 0, X + .25, 0, X + .25, hDoor, X, hDoor, F('#3a2a2a'), t); }   // the far inner wall, facing us, and its jamb
      const JM = HG_JM, n0 = X + .35, n1 = BK - .25, fh = .62, fr = .3;
      if(r1 > JM - 18 && rel < JM + 18){ const ta = tAt(JM - 18), tb = tAt(JM + 18); K.Q(n0 + 1.2, .5, n0 + 2.1, .5, ta, tb, F('#7a8296')); K.Q(n0 + 1.2, .53, n0 + 1.5, .53, ta, tb, F('#e8ecf4')); }   // the wing, along the road (a 36-segment span)
      for(const eo of [-8, 8]){ const r = JM + eo; if(r >= rel && r < r1){ const t = tAt(r); Pq(n0 + 1.1, .26, n0 + 1.9, .26, n0 + 1.9, .46, n0 + 1.1, .46, F('#9aa2b4'), t); Pq(n0 + 1.1, .26, n0 + 1.25, .26, n0 + 1.25, .46, n0 + 1.1, .46, F('#141620'), t); Pq(n0 + 1.1, .44, n0 + 1.9, .44, n0 + 1.9, .46, n0 + 1.1, .46, F('#eef1f8'), t); } }   // the engines, intakes to the road
      if(rel <= JM && r1 > JM){ const t = tAt(JM);   // the jet's body, nose to the road, seen side-on
        Pq(n1 - .6, fh + fr, n1 - .15, hDoor - .25, n1 + .05, hDoor - .25, n1, fh + fr, F(L.tail[1]), t); Pq(n1 - .4, fh + fr + .2, n1 - .1, hDoor - .55, n1, hDoor - .55, n1 - .05, fh + fr + .2, F(L.tail[2]), t);   // the fin
        Pq(n0 + .12, fh - fr * .7, n1, fh - fr, n1, fh + fr, n0 + .12, fh + fr * .7, F('#d4dae6'), t); Pq(n0, fh - fr * .35, n0 + .12, fh - fr * .7, n0 + .12, fh + fr * .7, n0, fh + fr * .3, F('#c4cad8'), t);   // fuselage and the nose cone
        Pq(n0 + .12, fh + fr * .7, n1, fh + fr, n1, fh + fr * .55, n0 + .12, fh + fr * .4, F('#f8faff'), t); Pq(n0 + .12, fh - fr * .7, n1, fh - fr, n1, fh - fr * .6, n0 + .12, fh - fr * .45, F('#8a92a8'), t);   // lit crown, belly
        Pq(n0 + .1, fh + fr * .2, n0 + .4, fh + fr * .3, n0 + .4, fh + fr * .5, n0 + .14, fh + fr * .45, F('#141a2c'), t);   // the cockpit glass
        if(near){ const nw = Math.floor((n1 - n0 - .9) / .16); for(let c = 0; c < nw; c++){ const Lw = n0 + .75 + c * .16; Pq(Lw, fh + fr * .15, Lw + .07, fh + fr * .15, Lw + .07, fh + fr * .32, Lw, fh + fr * .32, F('#5a6a8a'), t); } }
        Pq(n0 + .3, 0, n0 + .34, 0, n0 + .34, fh - fr * .7, n0 + .3, fh - fr * .7, F('#3a3e50'), t); } }   // the nose gear
    // the face: plinth, the retracted door leaves either side of the opening, cladding up to the arched roof, the lintel over the door
    const tp0 = hgTop(rel), tp1 = hgTop(r1), lo = inDoor ? hLint : hgH(62.2);
    for(const [ta, tb] of inDoor ? [[0, dA], [dB, 1]] : [[0, 1]]){ if(tb <= ta) continue; band(0, hgH(63), ta, tb, F(C1)); band(hgH(63), hgH(62.2), ta, tb, F(C3));
      band(hgH(62.2), inDoor ? hLint : hgH(62.2), ta, tb, F(C3));
      if(near){ const n = Math.max(1, Math.round(m * (tb - ta) * 1.2)); for(let c = 0; c <= n; c++) K.V(X, hgH(62.2), hDoor, ta + (tb - ta) * c / n, .02, F(C1)); } }   // the leaves' ribs
    poly(px(X, lo, 0), py(X, lo, 0), px(X, lo, 1), py(X, lo, 1), px(X, tp1, 1), py(X, tp1, 1), px(X, tp0, 0), py(X, tp0, 0), F(C2));   // cladding up to the roof
    if(inDoor){ band(hDoor, hLint, dA, dB, F(C2)); band(hDoor, hgH(21), dA, dB, F(C1));
      const sa = tAt(HG_LEN * 40 / 120), sb = tAt(HG_LEN * 80 / 120); if(sb > sa){ band(hgH(18.5), hgH(16), sa, sb, F(L.tail[1])); band(hgH(16.6), hgH(16), sa, sb, F(L.tail[2])); }   // the airline's stripe
      if(fog < .7) for(const fx of HANGAR_FL){ const r = fx / 120 * HG_LEN; if(r < rel || r >= r1) continue; const t = tAt(r); K.bulb(X - .05, hgH(21.5), t, '#fff4d8', '#fff0d0', .05, .35 * (1 - fog)); if(fog < .45) K.cone(X - .05, hgH(21.5), t, .5, '255,220,160', .045 * (1 - fog)); } }
    if(near){ const n = Math.max(1, Math.round(m * 2)); for(let c = 0; c < n; c++){ const t = (c + .5) / n, rr = rel + m * t; if(rr > HG_DOOR[0] - .5 && rr < HG_DOOR[1] + .5) continue; K.V(X, hgH(62.2), hgTop(rr) - .05, t, .015, F(C1)); } }   // cladding ribs
    poly(px(X, tp0 - .06, 0), py(X, tp0 - .06, 0), px(X, tp1 - .06, 1), py(X, tp1 - .06, 1), px(X, tp1, 1), py(X, tp1, 1), px(X, tp0, 0), py(X, tp0, 0), F(C5));   // the roof's moonlit edge
    // the gable end facing the camera
    if(K.end){ const he = hgTop(0); K.E(X, 0, X + D, hgH(63), F(C1)); K.E(X, hgH(63), X + D, he, F(C2)); K.E(X, he - .06, X + D, he, F(C4));
      if(near) for(let c = 1; c < 8; c++) K.E(X + D * c / 8, hgH(62.5), X + D * c / 8 + .025, he - .08, F(C1));
      K.E(X + D * .62, 0, X + D * .72, .55, F('#2a2e40')); K.E(X + D * .63, .38, X + D * .71, .52, F(WM[1])); }   // a side door with a lit window
    cx.globalAlpha = a0; }
  // half-widths (half-road widths) for culling props that are entirely off-screen
  const EXT = { pier:.5, jet:4.4, term:3.8, hangar:3.6, mast:.6, truck:.8, tsign:.6, lamp:.7, gantry:1.6 };
  const DRAW_FN = { hang3:drawHang3, term3:drawTerm3, tsign:drawTsign,  wall:drawWall, lamp:drawLamp, mono:drawMono, pier:drawPier, jet:drawJet, term:drawTerm, hangar:drawHangar, mast:drawMast, truck:drawTruck, gantry:drawGantry };

  // ---------------------------------------------------------------- reflections: a column of broken dashes hanging below a light, world-anchored
  function column(x, y0, len, w, seed, now, al0, colHi, colLo){ if(len < PX * 3 || al0 <= .01) return; const n = 12, ph = reduce ? 0 : now / 1200, p0 = Math.floor(ph), f = ph - p0;
    cx.globalCompositeOperation = 'lighter';
    for(let i = 0; i < n; i++){ const v = i / n, yy = Math.round((y0 + v * len) / PX) * PX; if(yy >= H) break;
      const h = lerp(H0(seed * 7.1 + i * 3.3 + p0 * .61), H0(seed * 7.1 + i * 3.3 + (p0 + 1) * .61), f), ww = Math.max(PX, w * (1 - v * .55) * (.6 + h * .6)), ox = (H0(seed * 3.7 + i * 1.9) - .5) * w * .35;
      cx.fillStyle = v < .2 ? colHi : colLo; cx.globalAlpha = al0 * (1 - v * .85); pxRect(Math.round((x + ox - ww / 2) / PX) * PX, yy, Math.max(PX, Math.round(ww / PX) * PX), v < .45 && len > PX * 40 ? PX * 2 : PX); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }

  // ---------------------------------------------------------------- the ground: bay and jetty on the left; taxiway, apron or runway on the right, with the field lights
  function halo(x, y, col){ if(x < -20 || x > W + 20) return; cx.globalCompositeOperation = 'lighter'; blit(haloSpr(col), x, y + 4.5 * PX, PX); cx.globalCompositeOperation = 'source-over'; }
  function dot(x, y, sz, col){ if(x < -sz || x > W + sz) return; cx.fillStyle = col; pxRect(Math.round((x - sz / 2) / PX) * PX, Math.round((y - sz) / PX) * PX, sz, sz); }
  let RWCL = null;   // the runway centre line's far tone: half line, half runway (made on first use: mixc comes with the game script)
  function band(a, b, u0, u1, ay, by, col){ const l0 = a.x + a.w * u0, l1 = b.x + b.w * u0, r0 = a.x + a.w * u1, r1 = b.x + b.w * u1; if((l0 > W && l1 > W) || (r0 < 0 && r1 < 0)) return; poly(a.x + a.w * u0, ay, a.x + a.w * u1, ay, b.x + b.w * u1, by, b.x + b.w * u0, by, col); }
  function roadFX(s, a, b, fog, f, now){ const ay = a.y, by = b.y - 1; if(ay - by < .5) return;
    const i = s.index, z = i % ZONE, rw = z >= RW0, low = lastLow, fa = 1 - fog, thin = ay - by < PX * 1.5;
    // ---- left: the bay
    const wa = a.x - a.w * 1.32, wb = b.x - b.w * 1.32;
    if(wb > 0){ poly(-4, ay, wa, ay, wb, by, -4, by, fc(s.stripe ? '#0a1230' : '#0b1433', fog, low));
      band(a, b, -1.38, -1.32, ay, by, fc('#2a3252', fog, low));   // (to the draw distance: a solid edge reads as a steady line far away)
      // the jetty under the approach lights
      if(!thin || i % PIER === 0) band(a, b, PIER_X - .16, PIER_X + .16, ay, by, fc(i % PIER === 0 ? '#262c48' : '#1a2038', fog, low));
      // ripples and the moon's path, in the middle distance only (near the camera a per-segment pattern sparkles)
      if(fog > .2 && fog < .9){ const h = H0(i), dw = 2 + a.w * .1 * h, rx = a.x - a.w * (1.6 + h * 5); cx.fillStyle = `rgba(120,150,230,${(.4 * fa).toFixed(3)})`; pxRect(Math.round(rx - dw / 2), by, Math.max(PX, dw), PX); }
      const mx = MOON.x; if(fog > .15 && MOON.t < .95 && mx < wb && i % 2 === 0){ const ww = (4 + H0(i * 7) * 14) * (1.2 - fog);
        cx.fillStyle = `rgba(240,228,200,${(.3 * (1.1 - fog)).toFixed(3)})`; pxRect(Math.round(mx - ww / 2 + (H0(i * 11) - .5) * 10), by, Math.max(PX, ww), PX); }
      // the approach lights reflected
      if(i % PIER === 0 && fog < .9) column(a.x + a.w * PIER_X, ay, a.w * .7, a.w * .18, i, now, .3 * fa, '#e8f0ff', '#8aa8ff');
      // the monorail trains in the water: the cab lamps as a column, the window ribbon as faint broken dashes
      if(fog < .85) for(let sg = 1; sg >= -1; sg -= 2){ const L = (sg > 0 ? LOOPN_S : LOOPF_S) * SEG, rel = ((i * SEG - trainZ(now, sg)) % L + L) % L, tx = a.x + a.w * (sg > 0 ? MN : MF);
        if(rel > L - SEG) column(tx, ay, a.w * .55, a.w * .1, i * 3 + sg, now, .4 * fa, sg > 0 ? '#ff7a6a' : '#fff4d8', sg > 0 ? '#a02a2a' : '#8aa8ff');
        else if(rel < CARS * NCAR * SEG && i % 3 === 0 && fog > .04) column(tx, ay, a.w * .3, a.w * .16, i * 5 + sg, now, .14 * fa, '#e8f0ff', '#6a88c8'); } }
    // ---- right: the airfield
    const ra = a.x + a.w * 1.32; if(ra < W){
      poly(ra, ay, W + 4, ay, W + 4, by, b.x + b.w * 1.32, by, fc(rw ? (s.stripe ? '#0b1219' : '#0c131b') : (s.stripe ? '#1a1d2b' : '#1b1e2d'), fog, low));
      band(a, b, 1.5, 3.6, ay, by, fc(s.stripe && !thin ? '#121420' : '#131522', fog, low));        // the taxiway (to the draw distance; one tone far away, so rows don't alternate)
      if(rw){ band(a, b, 4.2, 7.6, ay, by, fc(s.stripe ? '#14161f' : '#151720', fog, low));             // the runway
        if(!thin){ if(i % 4 < 2) band(a, b, 5.87, 5.93, ay, by, fc('#5a5e6a', fog, low)); }                // painted centre line: dashes near,
        else band(a, b, 5.87, 5.93, ay, by, fc(RWCL || (RWCL = mixc('#5a5e6a', '#151720', .5)), fog, low));                                            // a steady half-tone line far away (a dash period under ~6 rows would blink)
        if(z >= RW0 + 3 && z < RW0 + 8 && fog < .85){ for(let p = 0; p < 8; p++){ const u = 4.45 + p * .4 + (p > 3 ? .3 : 0); band(a, b, u, u + .22, ay, by, fc('#b8bcc8', fog, low)); } }
        if((z === RW0 + 30 || z === RW0 + 31 || z === RW0 + 60 || z === RW0 + 61) && fog < .85) for(const u of RW_MARK) band(a, b, u, u + .25, ay, by, fc('#9aa0ae', fog, low)); }
      else { band(a, b, 3.9, 3.95, ay, by, fc('#b8962a', fog, low));                                     // apron lead-in line (solid: to the draw distance)
        if(!thin){
        if(z % JET === 8 || z % JET === 9) band(a, b, 3.95, 7.4, ay, by, fc('#a88a28', fog, low));       // stand bar
        if(z % 6 === 0 && fog < .6) band(a, b, 3.95, 9, ay, by, fc('#202434', fog, low)); } }            // slab joints
      // floodlight pools on the apron and before the hangars
      if(fog < .9){ cx.globalCompositeOperation = 'lighter';
        if(!rw){ const dm = Math.abs(z % MAST - 4); if(dm <= 3){ cx.fillStyle = `rgba(255,214,160,${(MAST_POOL[dm] * fa).toFixed(3)})`; band(a, b, 2.1, 4.6 + (3 - dm) * .3, ay, by, cx.fillStyle); } }
        else { const hr = hgRun(z); if(hr >= HG_DOOR[0] && hr < HG_DOOR[1]){ cx.fillStyle = `rgba(255,220,170,${(HANG_POOL[1] * fa).toFixed(3)})`; band(a, b, 7.7, HG_X, ay, by, cx.fillStyle); } }   // (the floodlit apron before each open door)
        cx.globalCompositeOperation = 'source-over'; }
      // field lights: small steady points that converge to the horizon
      if(fog < .97){ const sz = Math.max(PX, Math.round(a.w * .016 / PX) * PX), near = fog < .14, dim = fog > .6 ? .55 : 1; cx.globalAlpha = dim;
        if(i % 2 === 0){ dot(a.x + a.w * 1.6, ay, sz, AB); dot(a.x + a.w * 3.5, ay, sz, AB); if(near){ halo(a.x + a.w * 1.6, ay - sz / 2, AB); halo(a.x + a.w * 3.5, ay - sz / 2, AB); } }
        // the parallel runway and its taxiway, far out: white edge rows and blue
        if(i % 3 === 0 && fog > .04){ dot(a.x + a.w * 12, ay, sz, AW); dot(a.x + a.w * 15.5, ay, sz, i % 9 === 0 ? AA : AW); dot(a.x + a.w * 9.6, ay, sz, AB); }
        dot(a.x + a.w * 2.55, ay, sz, i % 2 ? AG : '#2a9a68');
        if(rw){ const p = (z - RW0) / (ZONE - RW0);
          if(i % 2 === 0){ const ec = p > .72 ? AA : AW; dot(a.x + a.w * 4.2, ay, sz, ec); dot(a.x + a.w * 7.6, ay, sz, ec); if(near) for(const u of RW_EDGE) halo(a.x + a.w * u, ay - sz / 2, ec); }
          if(i % 2 === 0){ const cc = p > .88 ? AR : p > .62 ? ((i >> 1) % 2 ? AR : AW) : AW; dot(a.x + a.w * 5.9, ay, sz, cc); }
          if(z === RW0 + 1 || z === ZONE - 2){ for(let u = 4.2; u <= 7.61; u += .34) dot(a.x + a.w * u, ay, sz, z === RW0 + 1 ? AG : AR); } }
        cx.globalAlpha = 1; } }
    // ---- the expressway: lamp pools and damp-asphalt reflections
    const d = lampD(i); if(d <= 2 && fog < .9){ cx.globalCompositeOperation = 'lighter';
      cx.fillStyle = `rgba(255,150,70,${(LAMP_POOL[d] * fa).toFixed(3)})`; for(let sd = -1; sd <= 1; sd += 2) poly(a.x + sd * a.w * .25, ay, a.x + sd * a.w * 1.05, ay, b.x + sd * b.w * 1.05, by, b.x + sd * b.w * .25, by, cx.fillStyle);
      cx.globalCompositeOperation = 'source-over'; }
    if(i % LAMP === 0 && fog < .92){ const al0 = .3 * fa; for(let sd = -1; sd <= 1; sd += 2) column(a.x + sd * a.w * .96, ay, a.w * .8, a.w * .09, i * 2 + (sd > 0 ? 1 : 0), now, al0, '#ffd696', '#ffa050'); } }

  // ---------------------------------------------------------------- far scenery
  const DOME = ['#5a6ac8', .05, 40, '#ffb870', .045, 18, '#ffd8a0', .06, 8];   // the airport's light dome: colour, alpha, height in rows
  const RW_MARK = [4.8, 5.2, 6.6, 7.0], RW_EDGE = [4.2, 7.6], MAST_POOL = [.12, .08, .05, .025], HANG_POOL = [.1, .08, .06, .04, .02], LAMP_POOL = [.11, .065, .03];   // roadFX's marks and pools
  function backdrop(o){ const { hz, now, sk } = o; lastLow = sk.low; const k = PX;
    // the airport's light dome over the horizon: stepped bands
    for(let q = 0; q < 9; q += 3){ const c = DOME[q], al = DOME[q + 1], hh = DOME[q + 2], [R, G, B] = hx(c); cx.fillStyle = `rgba(${R},${G},${B},${al})`; pxRect(0, hz - hh * PX, W, hh * PX); }
    // the city beyond, then the control tower with its beacon, then the airport line
    const city = citySpr(), cw = CITY_W * k, co = ((skyPar('far')) % cw + cw) % cw;
    for(let x = -co; x < W; x += cw) blit(city, x + cw / 2, hz - PX, k);
    const tw = towerSpr(), per = W * 1.9, tx = ((W * 1.02 - skyPar('mid')) % per + per) % per - W * .25;   // on a straight it stands right of the moon (the clock stays clear)
    if(tx > -80 && tx < W + 80){ glow(tx, hz - 52 * k, 30 * k, '#4ab8a8', .12); blit(tw, tx, hz + PX, k); }
    const air = airSpr(), aw = AIR_W * k, ao = ((skyPar('mid')) % aw + aw) % aw;
    for(let x = -ao; x < W; x += aw) blit(air, x + aw / 2, hz + PX, k);
    // obstruction lights: a slow shared blink (steady under reduced motion)
    const on = reduce || Math.sin(now / 640) > -.3; if(on){ cx.fillStyle = '#ff4a3a';
      for(const [ax, ay] of CAV) for(let x = -co + ax * k; x < W; x += cw) if(x > -4) pxRect(x, hz - PX - (CITY_H - ay) * k, PX, PX);
      for(const [ax, ay] of AAV) for(let x = -ao + ax * k; x < W; x += aw) if(x > -4) pxRect(x, hz + PX - (AIR_H - ay) * k, PX, PX); }
    if(tx > -80 && tx < W + 80){ const ty = hz + PX - 74 * k;
      if(on){ cx.fillStyle = '#ff4a3a'; pxRect(tx - PX / 2, ty, PX, PX); }
      // the airport beacon on the tower: alternating green and white sweeps (steady green under reduced motion)
      const bp = reduce ? 0 : Math.floor(now / 900) % 2, bc = bp ? '#f4f8ff' : '#46ffa0', bx = tx + 6 * k, by = ty + 9 * k;
      cx.fillStyle = bc; pxRect(Math.round(bx), Math.round(by), PX, PX); glow(bx, by, 8 * k, bc, reduce ? .25 : .45); }
    return false; }

  function overlay(al, now, sk){ const b = Math.round(H * .05 / PX) * PX; cx.fillStyle = `rgba(6,8,24,${.26 * al})`; pxRect(0, 0, W, b); cx.fillStyle = `rgba(6,8,24,${.13 * al})`; pxRect(0, b, W, b); }

  // warm() builds everything now; warmSteps() is the same build with stopping points, for the staged warm-up (sundown.html WARM.q)
  function warm(){ for(const _ of warmSteps()); }
  function* warmSteps(){ if(!signCv) signCv = document.createElement('canvas'); signAsk = 0; signTextSpr(); yield; for(let v = 0; v < 4; v++){ jetSpr(v); fogTintWarm(jetSpr(v), 'hn:jet' + v, 4, .82); yield; } for(let v = 0; v < 2; v++){ fogTintWarm(termSpr(v), 'hn:term' + v, 4, .82); artSizes(termSpr(v)); yield; } for(let v = 0; v < 3; v++){ fogTintWarm(hangarSpr(v), 'hn:hangar' + v, 4, .82); artSizes(hangarSpr(v)); fogTintWarm(tsignSpr(v), 'hn:tsign' + v, 4, .82); yield; for(const R of [2, 4, 8]){ const c = tsignHi(v, R); cx.drawImage(c, 0, 0, 1, 1); } yield; }
    for(const [s, n] of [[lampSpr(), 'lamp'], [lampSprR(), 'lampR'], [mastSpr(), 'mast'], [truckSpr(), 'truck'], [gantrySpr(), 'gantry']]) fogTintWarm(s, 'hn:' + n, 4, .82); termSpr(0); termSpr(1); for(let v = 0; v < 3; v++) hangarSpr(v); towerSpr(); truckSpr(); haloSpr('#9ab4ff'); lampSprR(); for(let v = 0; v < 3; v++) tsignSpr(v); for(const c of [AW, AA, AB, AG, AR]) haloSpr(c); mastSpr(); lampSpr(); gantrySpr(); citySpr(); airSpr();
    try{ cx.save(); cx.globalAlpha = .004; for(const key in SPR) if(key.startsWith(P) && SPR[key] instanceof HTMLCanvasElement) cx.drawImage(SPR[key], 0, 0, 1, 1); cx.restore(); }catch(e){} }

  ENV.haneda = { warm, warmSteps, place, lit(i){ const d = lampD(i); return d === 0 ? .3 : d === 1 ? .1 : 0; },
    draw(sp, x, y, uw, fog, now, sk){ const fn = DRAW_FN[sp.type]; if(!fn) return; const e = EXT[sp.type]; if(e && (x + uw * e < 0 || x - uw * e > W)) return; fn(sp, x, y, uw, fog, now, sk); },
    _test:{ train(seg, now, segF){ trOffN = 0; trOffN = seg * SEG - trainZ(now, 1); trOffF = 0; trOffF = (segF === undefined ? seg + 30 : segF) * SEG - trainZ(now, -1); } },
    roadFX, backdrop, overlay, road:['#181b2a', '#1a1d2c'], lampCol:'#c87a34',
    /* the taxiway jump (setpiece/jump.js, research/sundown-craft/jumpsides.md): the taxiway crosses from the airfield on the right and ends
       at the sea wall on the left, in line with the road's own left parapet (the jump draws its edge there); the monorail and the bay carry
       on beyond it. The parapets and the security fence run on beside the ramp and the far leaf and stop at the taxiway's edges; the light
       masts and taxiway signs keep off the taxiway itself. */
    jumpFloor:[1.12, 7],
    jumpKeep(sp, o, p){ const J = MECH.sp_jump, gap = J && J.inGap ? J.inGap(p, o) : false;
      if(sp.type === 'wall') return !gap; if(gap && (sp.type === 'mast' || sp.type === 'tsign')) return false; return undefined; } };
})();

// where this road's barrier is drawn, for the collider (half-road widths)
ENV.haneda.barrier = 1.12;
