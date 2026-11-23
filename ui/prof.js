/* ui/prof.js: the built-in profiler overlay (?prof), after Unreal's `stat unit` and Unity's Frame Debugger. Loaded only with ?prof (the loader
   line at the end of sundown.html), so it costs nothing when off.

   What it shows, live, in the top-left corner (` (Backquote) cycles the detail level: 1 unit line, 2 subsystems, 3 ops and per-road / per-mech
   detail, 0 hidden; ?prof=N starts at level N):
   - fps, the frame interval, and the draw and update times (median of the last second, and its worst frame);
   - milliseconds per subsystem (self time: a bracket's children are subtracted from it): sky, road and ground, roadmat, sprites and buildings,
     the env's own draw hooks (per road at level 3), set pieces, cars, bike, HUD, post/cutin, other mechs, and the core's own remainder;
   - canvas ops per frame on the game canvas: fillRect, drawImage, other draws, state changes (save / restore / transforms / clips / style and
     alpha sets) and composite switches (a globalCompositeOperation set that changes the mode).

   How it measures, without changing what the game does: every bracket is a wrapper installed from outside around a function the core already
   calls through a global name or a hook table (draw, update, drawRoad, drawSprites, drawProp, drawCar, ENV[key].roadFX / backdrop / overlay /
   draw / drawTunnel / wetSrc / wetFX, MECH[key].drawSeg / drawSegBack / drawBackdrop / drawScreen / overlay / post ...). A wrapper calls the
   original with the same this and arguments and returns its value. Op counts come from own-property wrappers on the game's context only
   (cx), removed again when counting is switched off. Known blind spots: roadmat's per-row alpha (it calls the prototype setter directly) is not
   counted as a state change; a function cached by reference before this file loads is not bracketed; performance.now() is coarse (0.1 ms,
   jittered) in a page that is not cross-origin isolated, so single small brackets are noisy but their sums over a frame are sound.

   window.PROF (tools/perfgate.mjs reads it): PROF.ops / PROF.sub switch the op counting and the subsystem brackets (both on by default; off,
   only draw / update / frame interval are taken); PROF.window(n) summarises the last n frames; PROF.reset() clears the record. */
(function(){
'use strict';
if(window.PROF) return;
const QP = new URLSearchParams(location.search), pnow = Performance.prototype.now.bind(performance);
const CATS = ['sky', 'road', 'roadmat', 'sprites', 'env', 'setpiece', 'cars', 'bike', 'hud', 'post', 'mech', 'core'];
const CI = {}; CATS.forEach((c, i) => CI[c] = i);
const LABEL = { sky:'sky+backdrop', road:'road+ground', roadmat:'roadmat', sprites:'sprites+bldg', env:'env hooks', setpiece:'set pieces', cars:'cars', bike:'bike', hud:'HUD', post:'post/cutin', mech:'other mechs', core:'core rest' };
const OPS = ['fillRect', 'drawImage', 'draw', 'state', 'comp'];
const N = 600;   // ring of frames
const R = { i:0, n:0, t:new Float64Array(N), dt:new Float32Array(N), draw:new Float32Array(N), upd:new Float32Array(N), cat:CATS.map(() => new Float32Array(N)), op:OPS.map(() => new Float32Array(N)) };
const P = window.PROF = { level:(v => v >= 0 && v <= 3 ? v : 2)(parseInt(QP.get('prof'), 10)), ops:true, sub:true, R, CATS, OPS, keys:new Map(), installed:false };

// ---------------------------------------------------------------- the per-frame accumulators and the bracket stack
const CUR = new Float64Array(CATS.length), OPC = new Float64Array(OPS.length);
const ST_C = new Int16Array(256), ST_T = new Float64Array(256), ST_K = new Float64Array(256), ST_N = new Array(256); let SP = 0;
let KEYS = new Map();   // this frame's per-key self time (level 3): 'env:akiba', 'mech:sp_kaiju' ...
let lastFrameT = 0, updMs = 0;
function enter(c, key){ if(SP < 255){ ST_C[SP] = c; ST_T[SP] = pnow(); ST_K[SP] = 0; ST_N[SP] = key; } SP++; }
function leave(){ SP--; if(SP >= 255) return; const el = pnow() - ST_T[SP], self = el - ST_K[SP]; CUR[ST_C[SP]] += self; const k = ST_N[SP]; if(k) KEYS.set(k, (KEYS.get(k) || 0) + self); if(SP > 0) ST_K[SP - 1] += el; }
function wrap(obj, name, cat, key){ const f = obj && obj[name]; if(typeof f !== 'function' || f.__prof) return false; const c = CI[cat];
  const w = function(){ if(!P.sub) return f.apply(this, arguments); enter(c, key); try{ return f.apply(this, arguments); } finally { leave(); } };
  try{ Object.assign(w, f); w.__prof = f; obj[name] = w; return true; }catch(e){ return false; } }
function wrapG(name, cat){ if(typeof window[name] === 'function') wrap(window, name, cat, null); }

// ---------------------------------------------------------------- frame boundaries: draw (and the frame interval), update
function install(){
  if(typeof window.draw !== 'function' || typeof window.update !== 'function') return false;
  const od = window.draw, ou = window.update;
  window.draw = function(now){ const t0 = pnow(); R.dt[R.i] = lastFrameT ? t0 - lastFrameT : 0; lastFrameT = t0; SP = 0;
    if(P.sub){ ST_C[0] = CI.core; ST_T[0] = t0; ST_K[0] = 0; ST_N[0] = null; SP = 1; }
    try{ return od.apply(this, arguments); }
    finally { const t1 = pnow(); if(P.sub && SP > 0){ SP = 1; leave(); } SP = 0; endFrame(t0, t1 - t0); } };
  window.update = function(){ const t0 = pnow(); try{ return ou.apply(this, arguments); } finally { updMs += pnow() - t0; } };
  // the core's own passes (global function declarations: the core calls them by name, so the wrapper is what runs)
  ['pixelSky', 'backdrop'].forEach(n => wrapG(n, 'sky'));
  ['drawRoad', 'laneFlush', 'drawReflections'].forEach(n => wrapG(n, 'road'));
  ['drawSprites', 'drawProp', 'drawGate', 'drawHazard', 'drawOil', 'drawTunnel', 'drawHinge', 'drawPBox'].forEach(n => wrapG(n, 'sprites'));
  ['drawSetPiece'].forEach(n => wrapG(n, 'setpiece'));
  ['drawCar', 'fkCars'].forEach(n => wrapG(n, 'cars'));
  ['drawBike', 'oilBike'].forEach(n => wrapG(n, 'bike'));
  ['hud'].forEach(n => wrapG(n, 'hud'));
  rescan(); P.installed = true; return true; }
// env and mech hooks (re-scanned now and then: a module may add a hook after warm-up)
const ENV_HK = /^(draw.*|backdrop|overlay|roadFX|wetSrc|wetFX|frontFX|drawTunnel)$/, MECH_HK = /^(draw.*|overlay|post)$/;
const ENV_CAT = { sky:'sky', hud:'hud', cars:'cars', bikes:'bike', buildings:'sprites', bkit:'sprites' };
const MECH_POST = /^(director|cutin|cutinLate|finale|arrival|arrivalLate|quiet)$/, MECH_SP = /^(sp_|ak_|gion_)/;
function rescan(){
  if(window.ENV) for(const k in ENV){ const E = ENV[k]; if(!E || typeof E !== 'object') continue; const cat = ENV_CAT[k] || (/^sp_/.test(k) ? 'setpiece' : 'env'), key = cat === 'env' ? 'env:' + (k === 'akibaAds' ? 'akiba' : k) : null;
    for(const nm of Object.keys(E)) if(ENV_HK.test(nm)) wrap(E, nm, cat, key); }
  if(window.MECH) for(const k in MECH){ const M = MECH[k]; if(!M || typeof M !== 'object') continue; const cat = k === 'roadmat' ? 'roadmat' : MECH_POST.test(k) ? 'post' : MECH_SP.test(k) ? 'setpiece' : 'mech';
    for(const nm of Object.keys(M)) if(MECH_HK.test(nm)) wrap(M, nm, cat, 'mech:' + k); } }

// ---------------------------------------------------------------- op counting on the game canvas only (own-property wrappers on cx)
const DRAWS = ['fill', 'stroke', 'fillText', 'strokeText', 'putImageData', 'clearRect', 'strokeRect', 'arc', 'ellipse', 'rect', 'lineTo', 'moveTo', 'beginPath', 'closePath', 'quadraticCurveTo', 'bezierCurveTo'];
const STATE_M = ['save', 'restore', 'setTransform', 'resetTransform', 'transform', 'translate', 'scale', 'rotate', 'clip', 'setLineDash'];
const STATE_P = ['fillStyle', 'strokeStyle', 'font', 'filter', 'lineWidth', 'imageSmoothingEnabled', 'textAlign', 'textBaseline', 'shadowBlur', 'shadowColor', 'lineCap', 'lineJoin'];
let opsOn = false, opsCtx = null; const SAVED = {};
function opsInstall(g){ if(opsOn || !g) return; opsCtx = g; const proto = CanvasRenderingContext2D.prototype;
  const m = (nm, slot) => { const f = proto[nm]; if(typeof f !== 'function') return; SAVED[nm] = Object.getOwnPropertyDescriptor(g, nm) || null; g[nm] = function(){ OPC[slot]++; return f.apply(this, arguments); }; };
  m('fillRect', 0); m('drawImage', 1); DRAWS.forEach(nm => m(nm, 2)); STATE_M.forEach(nm => m(nm, 3));
  const p = (nm, slot, onlyChange) => { const own = Object.getOwnPropertyDescriptor(g, nm), d = own || Object.getOwnPropertyDescriptor(proto, nm); if(!d || !d.set) return; SAVED['p:' + nm] = own || null;
    Object.defineProperty(g, nm, { configurable:true, enumerable:d.enumerable, get(){ return d.get.call(this); }, set(v){ if(!onlyChange || v !== d.get.call(this)) OPC[slot]++; d.set.call(this, v); } }); };
  STATE_P.forEach(nm => p(nm, 3, false)); p('globalAlpha', 3, false); p('globalCompositeOperation', 4, true);
  opsOn = true; }
function opsRemove(){ if(!opsOn) return; const g = opsCtx;
  for(const k in SAVED){ const d = SAVED[k], nm = k.startsWith('p:') ? k.slice(2) : k; delete g[nm]; if(d) Object.defineProperty(g, nm, d); delete SAVED[k]; }
  opsOn = false; }

// ---------------------------------------------------------------- end of frame: into the ring, then the overlay now and then
let lastShow = 0, scanN = 0;
function endFrame(t0, drawMs){ const i = R.i; R.t[i] = t0; R.draw[i] = drawMs; R.upd[i] = updMs; updMs = 0;
  for(let c = 0; c < CATS.length; c++){ R.cat[c][i] = P.sub ? CUR[c] : 0; CUR[c] = 0; }
  for(let o = 0; o < OPS.length; o++){ R.op[o][i] = opsOn ? OPC[o] : -1; OPC[o] = 0; }
  if(P.sub){ for(const [k, e] of P.keys) P.keys.set(k, e * .97 + (KEYS.get(k) || 0) * .03); for(const [k, v] of KEYS) if(!P.keys.has(k)) P.keys.set(k, v); KEYS.clear(); }   // (smoothed per hook; a hook that stops running decays away)
  R.i = (i + 1) % N; if(R.n < N) R.n++;
  const want = P.ops && P.level > 0 || P.forceOps; if(want && !opsOn) opsInstall(typeof cx !== 'undefined' ? cx : null); else if(!want && opsOn) opsRemove();
  if(++scanN % 120 === 0 && P.sub) rescan();
  if(t0 - lastShow > 250){ lastShow = t0; show(); } }
const q = (a, f) => { if(!a.length) return 0; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
// the last n frames: medians, p95s, worst, means per category, ops per frame
P.window = n => { n = Math.min(n || 60, R.n); const idx = []; for(let k = 1; k <= n; k++) idx.push((R.i - k + N) % N);
  const col = A => idx.map(j => A[j]), dt = idx.map(j => R.dt[j]).filter(v => v > 0), dr = col(R.draw), up = col(R.upd), mean = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const out = { n, dt:{ med:q(dt, .5), p95:q(dt, .95), max:q(dt, 1) }, draw:{ med:q(dr, .5), p95:q(dr, .95), max:q(dr, 1), mean:mean(dr) }, upd:{ med:q(up, .5), p95:q(up, .95) }, fps:dt.length ? 1000 / mean(dt) : 0, cat:{}, ops:{} };
  CATS.forEach((c, k) => out.cat[c] = mean(col(R.cat[k])));
  OPS.forEach((o, k) => { const v = col(R.op[k]).filter(x => x >= 0); out.ops[o] = v.length ? mean(v) : null; });
  out.ops.total = out.ops.fillRect === null ? null : OPS.slice(0, 4).reduce((a, o) => a + out.ops[o], 0); return out; };
P.reset = () => { R.i = 0; R.n = 0; R.dt.fill(0); P.keys.clear(); };

// ---------------------------------------------------------------- the overlay (a DOM block: it never touches the game canvas)
let el = null;
function show(){ if(!el){ el = document.createElement('pre'); el.id = 'profOverlay';
    el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:9999;margin:0;padding:5px 7px;font:11px/1.25 Consolas,"Cascadia Mono",monospace;color:#e8e4d8;background:rgba(8,6,14,.78);border:1px solid #3a3450;pointer-events:none;white-space:pre;max-width:46vw;overflow:hidden';
    document.body.appendChild(el); }
  if(P.level === 0){ el.style.display = 'none'; return; } el.style.display = '';
  const w = P.window(60), f1 = v => v.toFixed(1), pad = (s, n) => (s + '').padStart(n), bar = (v, max) => '█'.repeat(Math.max(0, Math.min(16, Math.round(v / max * 16))));
  const L = [`${pad(w.fps.toFixed(0), 3)} fps  frame ${f1(w.dt.med)} (p95 ${f1(w.dt.p95)})  draw ${f1(w.draw.med)} (max ${f1(w.draw.max)})  upd ${f1(w.upd.med)} ms`];
  if(P.level >= 2){ const tot = CATS.reduce((a, c) => a + w.cat[c], 0), mx = Math.max(2, ...CATS.map(c => w.cat[c]));
    for(const c of CATS){ const v = w.cat[c]; if(v < .005 && P.level < 3) continue; L.push(`${LABEL[c].padEnd(13)}${pad(f1(v), 5)} ${bar(v, mx)}`); }
    L.push(`${'sum'.padEnd(13)}${pad(f1(tot), 5)}  (ms/frame, self)`); }
  if(P.level >= 3){ const o = w.ops; if(o.total !== null) L.push(`ops ${o.total.toFixed(0)}/f: fillRect ${o.fillRect.toFixed(0)} drawImage ${o.drawImage.toFixed(0)} draw ${o.draw.toFixed(0)}`, `    state ${o.state.toFixed(0)}  comp switches ${o.comp.toFixed(0)}`);
    const top = [...P.keys].filter(x => x[1] > .03).sort((a, b) => b[1] - a[1]).slice(0, 9); if(top.length) L.push('top hooks (ms, smoothed):'); for(const [k, v] of top) L.push(`  ${k.padEnd(18)}${pad(f1(v), 5)}`); }
  L.push(`[\`] detail ${P.level}/3`); el.textContent = L.join('\n'); }
addEventListener('keydown', e => { if(e.code !== 'Backquote' || e.repeat) return; P.level = (P.level + 1) % 4; e.preventDefault(); show(); }, true);

if(!install()){ addEventListener('load', () => { if(!P.installed) install(); }); }
})();
