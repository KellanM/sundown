/* Sundown mechanic module: speed you can see in the world's own light (MECH.speedfx). See mech/README.md and research/sundown-craft/speedfx.md.
   Load after the other mech modules:   <script src="mech/speedfx.js"></script>

   Kellan, 2026-11-19: "the rainbow moon effect that appears is incredibly distracting. we should keep that more grounded and potentially
   add light streaks or something else to the environment instead". The poster rings round the moon are gone; speed, flow and boost now
   show the way a long exposure on the Shuto expressway does: the lights you pass smear along their own path.

   What it draws:
   - Light trails. Every light the scene itself draws for a roadside prop (street lamps, tunnel luminaires, lanterns), and the tail lights
     of the traffic you are overtaking, leaves a trail toward where it was a moment ago. The trail is that light projected at its own
     earlier positions, along the real road, so it follows bends and crests and lies exactly where the lamp row is. Near lamps sweep long
     lines, far ones stay points (perspective does that, nothing is faked). Traffic trails are as long as the speed you close on them at
     (Akira's red tail-light lines, on the cars you overtake). A turn signal leaves none (it blinks).
   - Tried and cut: a red ribbon from the bike's own tail lamp (it read as a hose), and screen-edge streaks (the near lamps' trails
     already sweep the edges, and edge streaks would be a graphic overlay). See research/sundown-craft/speedfx.md.

   How it scales: one eased level E (0..1) from speed, flow and the boost tier. Nothing below top speed; a hint at top speed that grows
   with flow; long lines at boost tier 1, 2, 3. It rises over ~0.2 s and settles over ~0.7 s, so lengths ease and never jump.
   The exposure is E^1.3 x 0.3 s of travel.

   How the lights are found: the module wraps the core's glow() and, around it, drawProp() / drawCar() / the tunnel files' drawTunnel(),
   in warm(). While a light-giving prop or a car is drawn, its glow() calls are recorded (position, radius, colour, alpha) with the
   prop's ground point; drawSeg() of the same segment (called right after that segment's props and traffic) draws the trails, so nearer
   scenery still covers them. Nothing else changes: the wrappers call straight through.

   Pixel grid and budget: trails are quads through pxPoly (whole canvas pixels, spans of at most ~28 rows), three stepped alpha bands,
   additive. No canvases, no per-frame allocation (typed arrays, colour strings passed by reference).
   Never flickers: the level settles exactly; a trail fades out (continuously) before its light can stop being drawn, near the camera
   or at the screen edge; records are matched to their own segment and flushed after the sprite pass.
   Reduced motion / No flashing: no trail grows with the boost. While boosting, the nearest lamps get one short trail of fixed length,
   faint, fading in and out over 1.5 s. */
(() => {
  const M = MECH.speedfx = {};
  // ---------------------------------------------------------------- tuning
  const TMAX = .3;                  // seconds of travel at E = 1 (tier 3)
  const RM_E = .16;                 // reduced motion: the fixed, faint level while boosting
  const NMAX = 160;                 // lights recorded per segment pass (far more than any road draws near the camera)
  const LIGHT = { lamp:1, yardlamp:1, blight:1, lantern:1, flare:1, deli:.8, pole:1, vend:.6 };   // prop types whose glow is a light
  // ---------------------------------------------------------------- state
  let E = 0, on = false, wrapped = false;
  const GX = new Float32Array(NMAX), GY = new Float32Array(NMAX), GR = new Float32Array(NMAX), GA = new Float32Array(NMAX);
  const OX = new Float32Array(NMAX), OY = new Float32Array(NMAX), F0 = new Float32Array(NMAX), RL = new Float32Array(NMAX), YC = new Float32Array(NMAX);
  const GC = new Array(NMAX).fill('#000000');
  let n = 0, capK = 0, capX = 0, capY = 0, capU = 1, capSX = 0, capF = -1, capR = 1, capW = 1;
  // the road at a fractional segment index (written into RX / RY / RW, no allocation)
  let RX = 0, RY = 0, RW = 0, B0 = 0, B1 = 0;
  const PT = new Float32Array(2 * 24);

  const DBG = M.dbg = { cap:0, trail:0, skipY:0 };   // counters for tests (lights recorded, trails considered, stale records dropped)
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rmOn = () => reduce || (window.ASSIST && ASSIST.noFlash);

  // ---------------------------------------------------------------- the level
  function target(){
    if(state !== 'play' || !MAXS) return 0;
    const sp = speed / MAXS, fl = clamp(flow / 10, 0, 1);
    let t = smooth(.9, 1.0, sp) * (.24 + .16 * fl);                       // top speed: a hint, more with flow
    if(boostT > 0) t = Math.max(t, [0, .5, .75, 1][boostTier] || .5);  // a boost: by tier
    t = Math.max(t, smooth(1.0, 1.4, sp) * .6);                         // the overspeed a boost leaves behind settles with the speed
    return t; }

  // ---------------------------------------------------------------- recording lights
  function rec(x, y, r, col, a){
    if(n >= NMAX || !(a > .02) || !(r > 0) || (capK === 2 && col === '#ffa020')) return;
    const u = capU > 1 ? capU : 1;
    GX[n] = x; GY[n] = y; GR[n] = r; GA[n] = a * capW; GC[n] = col;
    OX[n] = capSX + (x - capX) / u; OY[n] = (capY - y) / u;   // where the light is, in half-road widths from the road centre and above the road
    F0[n] = capF; RL[n] = capR; YC[n] = capY; n++; DBG.cap++; }
  // lamps whose road draws their glow with its own helper (not the core glow): the head, read off that road's lamp sprite
  const HEAD = {
    neon(sp, x, y, uw, fog){ if(sp.type !== 'lamp') return; const k = uw / 50; const sf = scaleFade(k, 6, 10); if(sf <= 0) return; rec(x + (sp.x > 0 ? -1 : 1) * 3.5 * k, y - 41.5 * k, uw * .3, '#ffd8a0', .55 * (1 - fog * .7) * sf); } };
  function wrap(){
    if(wrapped || typeof window.glow !== 'function') return; wrapped = true;
    const g0 = window.glow;
    window.glow = function(x, y, r, col, a){ if(capK) rec(x, y, r, col, a); return g0(x, y, r, col, a); };
    if(typeof window.drawProp === 'function'){ const p0 = window.drawProp;
      window.drawProp = function(sp, x, y, uw, fog, sk, now){
        const w = on && sp && fog < .62 ? LIGHT[sp.type] : 0;
        if(!w) return p0(sp, x, y, uw, fog, sk, now);
        capK = 1; capX = x; capY = y; capU = uw; capSX = sp.x || 0; capF = -1; capR = 1; capW = w * (1 - fog / .62); const n0 = n;
        try{ return p0(sp, x, y, uw, fog, sk, now); } finally { if(n === n0 && sp.env && HEAD[sp.env]) HEAD[sp.env](sp, x, y, uw, fog); capK = 0; } }; }
    if(typeof window.drawCar === 'function'){ const c0 = window.drawCar;
      window.drawCar = function(x, y, w, c, fog, now){
        if(!on || !c || fog > .5 || c.oth) return c0(x, y, w, c, fog, now);
        const rel = speed > 1 ? clamp((speed - (c.speed || 0)) / speed, 0, 1) : 0; if(rel < .05) return c0(x, y, w, c, fog, now);
        const uw = w / .36; capK = 2; capX = x - (c.x || 0) * uw; capY = y; capU = uw; capSX = 0; capF = c.z / SEG; capR = rel; capW = .8 * (1 - fog / .5);
        try{ return c0(x, y, w, c, fog, now); } finally { capK = 0; } }; }
    // the tunnel luminaires: drawTunnel(s, x, y, uw, ...) is called per ring with its own segment
    for(const key of ['tunnels', 'aqua']){ const T = ENV[key]; if(!T || typeof T.drawTunnel !== 'function') continue; const t0 = T.drawTunnel;
      T.drawTunnel = function(s, x, y, uw, fog, now, fogc){
        if(!on || fog > .62 || !s) return t0.call(this, s, x, y, uw, fog, now, fogc);
        capK = 3; capX = x; capY = y; capU = uw; capSX = 0; capF = -1; capR = 1; capW = 1 - fog / .62;
        try{ return t0.call(this, s, x, y, uw, fog, now, fogc); } finally { capK = 0; } }; } }

  // the projected road (centre x, y and half-width) at fractional segment index f; false past what was projected this frame
  function roadAt(f){ const i = Math.floor(f); if(i < B0 || i >= B1) return false; const s = segs[i]; if(!s || !s.p1.screen.scale || s.p1.camera.z <= 0) return false;
    const t = f - i, a = s.p1.screen, b = s.p2.screen; RX = a.x + (b.x - a.x) * t; RY = a.y + (b.y - a.y) * t; RW = a.w + (b.w - a.w) * t; return true; }

  // ---------------------------------------------------------------- drawing one trail
  const BAND = [1, .55, .28];
  function trail(i, f0, d, aMul){
    if(!roadAt(f0)) return; const x0 = RX, y0 = RY, w0 = RW, ox = OX[i], oy = OY[i];
    if(!roadAt(f0 + d)) { let lo = 0, hi = d; for(let k = 0; k < 6; k++){ const m = (lo + hi) / 2; if(roadAt(f0 + m)) lo = m; else hi = m; } d = lo; if(d < .2 || !roadAt(f0 + d)) return; }
    const ex = GX[i] + (RX + ox * RW) - (x0 + ox * w0), ey = GY[i] + (RY - oy * RW) - (y0 - oy * w0), len = Math.hypot(ex - GX[i], ey - GY[i]);
    if(len < PX * 2) return;
    const m = clamp(Math.ceil(Math.max(len / (PX * 20), Math.abs(ey - GY[i]) / (PX * 26))), 2, 23);
    PT[0] = GX[i]; PT[1] = GY[i];
    // steps even on the screen, not in depth (uniform in 1/z), so no step is taller than ~26 rows: pxPoly keeps it as hard spans
    const sg = segs[Math.floor(f0)], z0 = Math.max(1, sg.p1.camera.z + (f0 - Math.floor(f0)) * SEG), i0 = 1 / z0, i1 = 1 / (z0 + d * SEG);
    for(let k = 1; k <= m; k++){ if(!roadAt(f0 + (1 / (i0 + (i1 - i0) * k / m) - z0) / SEG)) return; PT[k * 2] = GX[i] + (RX + ox * RW) - (x0 + ox * w0); PT[k * 2 + 1] = GY[i] + (RY - oy * RW) - (y0 - oy * w0); }
    const wb = clamp(GR[i] * .16, PX, PX * 5), a0 = GA[i] * aMul, col = GC[i], hot = hotOf(col);
    for(let k = 0; k < m; k++){ const u = (k + .5) / m, band = u < .34 ? 0 : u < .67 ? 1 : 2, al = a0 * BAND[band]; if(al < .02) continue;
      const x1 = PT[k * 2], y1 = PT[k * 2 + 1], x2 = PT[k * 2 + 2], y2 = PT[k * 2 + 3], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy); if(L < .01) continue;
      const ux = -dy / L, uy = dx / L, wo = Math.round(wb * (1 - .55 * u) / PX) * PX;
      // a coloured sleeve (the light's own colour) round a one-pixel hot core, like the lamp head itself
      if(band === 0 && wo >= PX * 2){ const w = wo / 2; cx.globalAlpha = Math.min(1, al * .55); pxPoly(x1 + ux * w, y1 + uy * w, x2 + ux * w, y2 + uy * w, x2 - ux * w, y2 - uy * w, x1 - ux * w, y1 - uy * w, col); }
      const w = PX / 2; cx.globalAlpha = Math.min(1, al); pxPoly(x1 + ux * w, y1 + uy * w, x2 + ux * w, y2 + uy * w, x2 - ux * w, y2 - uy * w, x1 - ux * w, y1 - uy * w, band < 2 ? hot : col); } }
  // the hot core of a light: its colour pulled toward white (cached per colour; a road uses a handful)
  const HOT = new Map();
  function hotOf(col){ let h = HOT.get(col); if(h) return h; if(HOT.size > 64) HOT.clear(); try{ h = mixc(col, '#fff6e6', .55); }catch(e){ h = col; } HOT.set(col, h); return h; }

  // ---------------------------------------------------------------- hooks
  M.warm = () => { wrap(); };
  M.reset = () => { E = 0; n = 0; };
  M.update = dt => {
    wrap();
    const rm = rmOn(); let t = target();
    if(rm) t = t >= .5 ? RM_E : 0;
    const tau = rm ? 1.5 : t > E ? .2 : .7; E += (t - E) * (1 - Math.exp(-dt / tau)); if(Math.abs(t - E) < .002) E = t;   // (settles exactly, so a held state draws identical frames)
    on = E > .01;   // the wrappers record only while trails can show (at cruise they call straight through)
  };
  M.drawSeg = (s, sx0, sy0, uw, fog, now) => {
    if(!n) return;
    const cnt = n; n = 0;
    if(E <= .01 || !on) return;
    const D = rmOn() ? 1.6 : speed * TMAX * Math.pow(E, 1.3) / SEG;   // segments of travel in the exposure
    if(D < .15) return;
    const aMul = rmOn() ? .35 * E / RM_E : clamp(E * 2.2, 0, 1);   // (reduced motion: a fixed short length that only fades in and out)
    B0 = s.index; B1 = Math.floor(position / SEG) + DRAW - 1;
    const zf = clamp((s.p1.camera.z - SEG * 1.5) / (SEG * 3), 0, 1); if(zf <= 0) return;
    cx.globalCompositeOperation = 'lighter';
    for(let i = 0; i < cnt; i++){
      let f0;
      if(F0[i] >= 0){ f0 = F0[i]; if(Math.floor(f0) !== s.index) continue; }
      else { if(Math.abs(YC[i] - sy0) > 1.5){ DBG.skipY++; continue; } f0 = s.index; }
      DBG.trail++;
      if(rmOn() && GR[i] < W * .02) continue;
      // no pops: a trail fades out before its light can stop being drawn, as its head nears the camera or the screen edge
      // (some roads cull a glow once it is off the screen, and every light goes when its segment passes the camera)
      const gx = GX[i], gy = GY[i], ef = clamp((Math.min(gx, W - gx, gy) + GR[i]) / (GR[i] + W * .04), 0, 1); if(ef <= 0) continue;
      trail(i, f0, D * RL[i], aMul * ef * zf); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; };

  // the sprite pass is over: anything recorded and not drawn (a segment skipped at the draw distance) is stale
  M.drawUnderBike = () => { n = 0; };

  // read-only, for tests and other modules
  M.level = () => E;
})();
