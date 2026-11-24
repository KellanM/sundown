/* ui/console.js: Sundown's developer console, after Quake's and Source's drop-down console. Loaded by default from the loader at the end of
   sundown.html (?con=off doesn't load it). It builds nothing until it is first opened and adds nothing per frame, open or closed: no
   requestAnimationFrame, no MECH hook (one `finish` hook appears only after a gameplay-changing command, see the dev flag below).

   Open / close:
   - desktop: the backquote key (`) toggles it; Esc closes it. (` used to cycle ui/prof.js's detail; that is `prof` here now.)
   - phone: a three-finger tap (three fingers down within 250 ms, all lifted within 450 ms of the first, none moving more than 24 px).
     Steering holds a thumb down far longer than that, so a ride never opens it by accident. A tap outside the panel, or its x, closes it.
   While it is open every key goes to it, never to the bike (a capture listener stops each key before the game's own handlers), and a ride
   holds: the game clock freezes exactly as the pause menu freezes it (PSE, without the menu), held keys and touches are let go, audio is
   suspended; closing it rides on. Up / Down: history; Tab: completes a command name; Enter: runs.

   Commands: `help` lists them. `god`, `seg`, `skip` and console-set `force` change the ride, so that ride is marked dev (rec.dev) and is not
   saved to best nights (the 'arcade.sundown' write drops dev records). Remembered (localStorage, try/catch): the overlay level
   ('sundown.prof': 0-3 or 'off') and the history ('sundown.console.hist'). window.CON.run('cmd') runs a line (tests). */
(function(){
'use strict';
if(window.CON) return;
const QS = new URLSearchParams(location.search), rnow = Performance.prototype.now.bind(performance);   // (the wall clock: the game's performance.now() holds while paused)
const LS = { get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : v; }catch(e){ return d; } }, set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} } };
const SS = { get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }, set(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} } };
const K_PROF = 'sundown.prof', K_HIST = 'sundown.console.hist', K_FORCE = 'sundown.console.force';
const G = f => { try{ return f(); }catch(e){ return undefined; } };   // a game global, or undefined (the console never throws into the game)
const C = window.CON = { open:false };

// ---------------------------------------------------------------- the panel (built on first open)
let root = null, logEl = null, inp = null, greeted = false;
const CSS = `#sdCon{position:fixed;left:0;right:0;top:0;z-index:10000;display:flex;flex-direction:column;max-height:min(46vh,440px);
 padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) 0 env(safe-area-inset-left,0px);background:rgba(7,6,12,.94);
 border-bottom:2px solid #ff3b5c;box-shadow:0 1px 0 rgba(255,59,92,.25);color:#f4ecdf;font:13px/1.4 'DotGothic16','Courier New',monospace;
 animation:sdConIn .12s steps(3) both;touch-action:manipulation;-webkit-text-size-adjust:100%}
@keyframes sdConIn{from{transform:translateY(-100%)}to{transform:none}}
@media (prefers-reduced-motion:reduce){#sdCon{animation:none}}
#sdCon .lg{flex:1 1 auto;min-height:4.2em;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:8px 14px 4px;white-space:pre-wrap;word-break:break-word;user-select:text;-webkit-user-select:text}
#sdCon .lg div{min-height:1.4em}
#sdCon .lg .in{color:#b9adc4} #sdCon .lg .in::before{content:'> ';color:#ff3b5c}
#sdCon .lg .er{color:#ff7a8a} #sdCon .lg .nt{color:#ffd04a} #sdCon .lg .hd{color:#4ff0ff} #sdCon .lg .dm{color:#b9adc4}
#sdCon .lg button{all:unset;color:#4ff0ff;cursor:pointer} #sdCon .lg button:hover,#sdCon .lg button:focus-visible{color:#f4ecdf;text-decoration:underline}
#sdCon form{display:flex;align-items:center;gap:8px;margin:0;padding:6px 8px 7px 14px;border-top:1px solid rgba(244,236,223,.16)}
#sdCon .pr{color:#ff3b5c}
#sdCon input{flex:1;min-width:0;margin:0;padding:2px 0;border:0;outline:0;background:transparent;color:#f4ecdf;caret-color:#ff3b5c;font:16px/1.3 'DotGothic16','Courier New',monospace;border-radius:0;-webkit-appearance:none;appearance:none}
#sdCon .x{all:unset;box-sizing:border-box;min-width:34px;height:30px;text-align:center;color:#b9adc4;font:16px/30px 'DotGothic16','Courier New',monospace;cursor:pointer;box-shadow:inset 0 0 0 1px #3a3350}
#sdCon .x:hover,#sdCon .x:focus-visible{color:#f4ecdf;box-shadow:inset 0 0 0 1px #ff3b5c}`;
function build(){ if(root) return;
  const st = document.createElement('style'); st.id = 'sdConCss'; st.textContent = CSS; document.head.appendChild(st);
  root = document.createElement('div'); root.id = 'sdCon'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Developer console');
  root.innerHTML = '<div class="lg" role="log" aria-live="polite"></div><form autocomplete="off"><span class="pr" aria-hidden="true">&gt;</span>'
    + '<input type="text" aria-label="Console command" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" inputmode="text">'
    + '<button type="button" class="x" aria-label="Close the console">×</button></form>';
  document.body.appendChild(root); logEl = root.querySelector('.lg'); inp = root.querySelector('input');
  root.querySelector('form').addEventListener('submit', e => { e.preventDefault(); submit(); });   // (a phone keyboard's Go when no keydown Enter came through)
  root.querySelector('.x').addEventListener('click', () => close());
  logEl.addEventListener('click', e => { const b = e.target.closest('button[data-cmd]'); if(!b) return; inp.value = b.dataset.cmd + ' '; inp.focus(); });   // (a tapped command name is typed in)
  // nothing reaches the game from inside the panel
  for(const t of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'wheel']) root.addEventListener(t, e => e.stopPropagation()); }
function line(text, cls){ if(!root) build(); const d = document.createElement('div'); if(cls) d.className = cls; d.textContent = text; logEl.appendChild(d);
  while(logEl.childNodes.length > 400) logEl.firstChild.remove(); logEl.scrollTop = logEl.scrollHeight; return d; }
const log = (t, c) => String(t).split('\n').forEach(s => line(s, c));
const err = t => log(t, 'er'), note = t => log(t, 'nt');

// ---------------------------------------------------------------- the ride holds while it is open (the pause menu's freeze, without the menu)
const H = { on:false, sticky:false };
function hold(){ if(H.on) return true; const ok = G(() => canPause()); if(!ok) return false;
  try{ PSE.on = true; PSE.at = realNow();
    keys.left = keys.right = keys.drift = false; touches.clear(); touchSteer = 0; padSteer = 0; padDrift = false;   // let go of everything held
    for(const k of PSE.held) mech('key', k, false, { code:k, repeat:false }); PSE.held.clear(); PSE.pad = pzPadState() || {};
    const b = document.getElementById('banner'); PSE.bannerLeft = 0; if(b && !b.hidden){ clearTimeout(bannerT); PSE.bannerLeft = Math.max(300, bannerEnd - PSE.at); }
    if(M.ac && M.ac.state === 'running'){ PSE.sus = true; M.ac.suspend(); }
    H.on = true; return true; }catch(e){ console.warn('[console] hold', e); return false; } }
function unhold(){ if(!H.on) return; H.on = false; G(() => { const pz = document.getElementById('pause'); if(PSE.on && (!pz || pz.hidden)) pauseClose(true); }); }   // (the pause menu's own close: the clock, audio, the banner, pad edges)
const riding = () => G(() => state === 'play' || state === 'pulled') || false;

// ---------------------------------------------------------------- open / close
let hist = []; try{ hist = JSON.parse(LS.get(K_HIST, '[]')); if(!Array.isArray(hist)) hist = []; }catch(e){ hist = []; }
let hi = -1, draft = '', clickGuard = 0;
function open(){ if(C.open) return; build(); C.open = true; root.hidden = false; root.style.animation = 'none'; void root.offsetWidth; root.style.animation = '';
  if(H.sticky && !G(() => PSE.on)) H.sticky = false;   // (that pause has been ridden out with Esc or P since)
  const held = hold();
  G(() => { keys.left = keys.right = keys.drift = false; });   // (on the title too: nothing stays pressed)
  if(!greeted){ greeted = true; line('Sundown console — type help', 'hd'); }
  if(held) line('ride held while the console is open', 'dm');
  hi = -1; try{ inp.focus({ preventScroll:true }); }catch(e){ inp.focus(); } }
function close(keepHeld){ if(!C.open) return; C.open = false; root.hidden = true; try{ inp.blur(); }catch(e){}
  if(!H.sticky && !keepHeld) unhold(); else H.on = false; }
C.toggle = () => C.open ? close() : open(); C.openConsole = open; C.close = close;

const editable = el => el && el !== inp && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const isTick = e => e.code === 'Backquote' || (!e.code && e.key === '`');
// keys: one capture listener, first among the game's own (its earlier capture listeners only note the input kind or are off while paused)
addEventListener('keydown', e => {
  if(isTick(e) && !e.ctrlKey && !e.metaKey && !e.altKey && !editable(e.target)){ e.preventDefault(); e.stopImmediatePropagation(); if(!e.repeat) C.toggle(); return; }
  if(!C.open) return;
  e.stopImmediatePropagation();   // never to the bike, the menus or the title
  if(e.target !== inp){ try{ inp.focus({ preventScroll:true }); }catch(x){} }   // (a printable key still lands in the input)
  if(e.isComposing) return;
  const k = e.key;
  if(k === 'Escape'){ e.preventDefault(); close(); }
  else if(k === 'Enter'){ e.preventDefault(); submit(); }
  else if(k === 'Tab'){ e.preventDefault(); complete(); }
  else if(k === 'ArrowUp' || k === 'ArrowDown'){ e.preventDefault(); browse(k === 'ArrowUp' ? 1 : -1); }
  else if(k === 'l' && e.ctrlKey){ e.preventDefault(); logEl.textContent = ''; }
}, true);
for(const t of ['keyup', 'keypress']) addEventListener(t, e => { if(C.open || isTick(e)) e.stopImmediatePropagation(); }, true);
// outside the panel while it is open: the tap closes it and goes no further (no steering, no title button)
addEventListener('pointerdown', e => { if(!C.open || (root && root.contains(e.target))) return; e.stopImmediatePropagation(); e.preventDefault(); clickGuard = rnow() + 700;
  if(e.pointerType === 'touch') T3.outside = true; else close(); }, true);   // (a touch closes it when the fingers lift, unless it was the three-finger tap, which toggles)
addEventListener('click', e => { if(rnow() < clickGuard && !(root && root.contains(e.target))){ e.stopImmediatePropagation(); e.preventDefault(); } }, true);
// phones: a three-finger tap toggles it (all three down within 250 ms, all up within 450 ms of the first, no finger moving over 24 px)
const T3 = { pts:new Map(), t0:0, last:0, max:0, bad:false, outside:false };
addEventListener('touchstart', e => { const T = T3; if(!T.pts.size){ T.t0 = e.timeStamp; T.max = 0; T.bad = false; }
  for(const t of e.changedTouches){ T.pts.set(t.identifier, [t.clientX, t.clientY]); T.last = e.timeStamp; }
  T.max = Math.max(T.max, e.touches.length); if(e.touches.length > 3 || T.last - T.t0 > 250) T.bad = true; }, { capture:true, passive:true });
addEventListener('touchmove', e => { const T = T3; if(T.bad) return; for(const t of e.changedTouches){ const p = T.pts.get(t.identifier); if(p && Math.hypot(t.clientX - p[0], t.clientY - p[1]) > 24) T.bad = true; } }, { capture:true, passive:true });
const t3end = e => { const T = T3; if(e.type === 'touchcancel') T.bad = true; for(const t of e.changedTouches) T.pts.delete(t.identifier);
  if(e.touches.length) return; const ok = !T.bad && T.max === 3 && e.timeStamp - T.t0 < 450, out = T.outside; T.pts.clear(); T.outside = false;
  if(ok){ clickGuard = rnow() + 700; C.toggle(); } else if(out && C.open){ clickGuard = rnow() + 700; close(); } };   // (inside touchend: iOS lets the input's focus bring up the keyboard)
addEventListener('touchend', t3end, { capture:true, passive:true }); addEventListener('touchcancel', t3end, { capture:true, passive:true });

// ---------------------------------------------------------------- input: run, history, completion
function submit(){ const s = inp.value.trim(); inp.value = ''; hi = -1; draft = ''; if(!s) return;
  if(hist[hist.length - 1] !== s){ hist.push(s); if(hist.length > 60) hist = hist.slice(-60); LS.set(K_HIST, JSON.stringify(hist)); }
  run(s); }
function browse(d){ if(!hist.length) return; if(hi < 0){ draft = inp.value; } hi = Math.max(-1, Math.min(hist.length - 1, hi + d));
  inp.value = hi < 0 ? draft : hist[hist.length - 1 - hi]; const n = inp.value.length; try{ inp.setSelectionRange(n, n); }catch(e){} }
function complete(){ const v = inp.value, m = /^(\s*)(\S*)$/.exec(v); if(!m) return; const pre = m[2].toLowerCase(), hits = NAMES().filter(n => n.startsWith(pre));
  if(!hits.length) return; if(hits.length === 1){ inp.value = hits[0] + ' '; return; }
  let cp = hits[0]; for(const h of hits) while(!h.startsWith(cp)) cp = cp.slice(0, -1); inp.value = cp; line(hits.join('  '), 'dm'); }
function run(s){ line(s, 'in'); const [name, ...args] = s.trim().split(/\s+/), c = CMD[name.toLowerCase()];
  if(!c){ err(`unknown command: ${name} (help lists them)`); return; }
  try{ const r = c.fn(args, s); if(r && r.catch) r.catch(e => err(String(e && e.message || e))); }catch(e){ err(String(e && e.message || e)); } }
C.run = s => { build(); run(String(s)); return logEl.textContent; };
C.log = log;

// ---------------------------------------------------------------- the dev flag: rides changed from here are not saved to best nights
const FLAG = { god:false, tpSegs:null, tpWhy:'', force:null, hooked:false };
{ const f = SS.get(K_FORCE); if(f && QS.get('force') === f) FLAG.force = f; }   // (a `force` reload from this console, still in the URL)
function hook(){ if(FLAG.hooked) return; FLAG.hooked = true;
  try{ const os = store.set; store.set = function(k, v){ if(k === 'arcade.sundown' && Array.isArray(v)) v = v.filter(r => !(r && r.dev)); return os.call(this, k, v); }; }catch(e){ console.warn('[console] store hook', e); }
  MECH.console = { finish(rec){ const why = devWhy(); if(why) rec.dev = why; } }; }
function devWhy(){ const w = []; if(FLAG.god && G(() => window.DEMO && DEMO.invincible)) w.push('god'); if(FLAG.tpSegs && FLAG.tpSegs === G(() => segs)) w.push(FLAG.tpWhy); if(FLAG.force) w.push('force=' + FLAG.force); return w.join(' '); }
function devNote(){ hook(); note('this ride is marked dev: it will not be saved to best nights'); }
if(FLAG.force) G(hook);

// ---------------------------------------------------------------- helpers
const f1 = v => v == null || !isFinite(v) ? '-' : v.toFixed(1), pad = (s, n) => String(s).padStart(n), padE = (s, n) => String(s).padEnd(n);
function reloadWith(k, v){ const u = new URL(location.href); if(v == null) u.searchParams.delete(k); else u.searchParams.set(k, v); note(`reloading: ${u.search || '(no params)'}`); setTimeout(() => location.assign(u.href), 120); }
const curSeg = () => G(() => Math.floor((position + PZ) / SEG));
function profLoad(then){ if(window.PROF){ then(window.PROF); return; } const s = document.createElement('script'); s.src = 'ui/prof.js';
  s.onload = () => window.PROF ? then(window.PROF) : err('ui/prof.js loaded but PROF is missing'); s.onerror = () => err('could not load ui/prof.js'); document.body.appendChild(s); }
function profSet(n){ LS.set(K_PROF, String(n)); profLoad(P => { if(!P.installed && !P.install()) err('prof could not install (no draw/update yet)'); P.level = n; P.show && P.show();
  log(`prof ${n}: ${['hidden (still recording)', 'fps / frame / draw / update', '+ ms per subsystem', '+ canvas ops and top hooks'][n]}`); }); }
function summary(w){ const L = [];
  L.push(`${w.n} frames  ${f1(w.fps)} fps`);
  L.push(`${padE('', 8)}${pad('med', 7)}${pad('p95', 7)}${pad('max', 7)}`);
  L.push(`${padE('frame', 8)}${pad(f1(w.dt.med), 7)}${pad(f1(w.dt.p95), 7)}${pad(f1(w.dt.max), 7)}  ms`);
  L.push(`${padE('draw', 8)}${pad(f1(w.draw.med), 7)}${pad(f1(w.draw.p95), 7)}${pad(f1(w.draw.max), 7)}  (mean ${f1(w.draw.mean)})`);
  L.push(`${padE('update', 8)}${pad(f1(w.upd.med), 7)}${pad(f1(w.upd.p95), 7)}`);
  const cats = Object.entries(w.cat).filter(x => x[1] >= .05).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if(cats.length) L.push('top: ' + cats.map(([c, v]) => `${c} ${f1(v)}`).join('  '));
  if(w.ops && w.ops.total != null) L.push(`ops ${w.ops.total.toFixed(0)}/f (fillRect ${w.ops.fillRect.toFixed(0)}, drawImage ${w.ops.drawImage.toFixed(0)})`);
  if(w.cv) L.push(`cv→cv live ${f1(w.cv.live)}/f (max ${w.cv.liveMax})`);
  return L.join('\n'); }
const needProf = () => { if(window.PROF && PROF.installed) return PROF; err('prof is off: `prof 0` loads it hidden, `prof 1` shows it'); return null; };

// ---------------------------------------------------------------- the commands
const CMD = {};
const def = (name, args, help, fn) => { CMD[name] = { args, help, fn }; };
const NAMES = () => Object.keys(CMD).sort();
def('help', '[cmd]', 'list the commands, or one command\'s help', a => {
  if(a[0] && CMD[a[0]]){ const c = CMD[a[0]]; log(`${a[0]} ${c.args}  ${c.help}`); return; }
  line('commands (tap or Tab to complete; Up/Down history; Esc or ` closes):', 'hd');
  for(const n of NAMES()){ const c = CMD[n], d = document.createElement('div'), b = document.createElement('button'); b.type = 'button'; b.dataset.cmd = n; b.textContent = n;
    d.appendChild(b); d.appendChild(document.createTextNode(`${c.args ? ' ' + c.args : ''}  ${c.help}`)); logEl.appendChild(d); }
  logEl.scrollTop = logEl.scrollHeight; });
def('ls', '', 'list the command names', () => log(NAMES().join('  ')));
def('clear', '', 'clear the log (Ctrl+L)', () => { logEl.textContent = ''; });
def('prof', '[0-3|off]', 'the perf overlay: 0 hidden, 1 fps, 2 subsystems, 3 ops; off removes it; alone, cycles', a => {
  const v = (a[0] || '').toLowerCase();
  if(v === 'off'){ LS.set(K_PROF, 'off'); const P = window.PROF; if(!P){ log('prof is not loaded'); return; } const n = P.uninstall ? P.uninstall() : 0; log(`prof off: overlay removed, ${n} wrapped functions restored (remembered: it won't load next time; \`prof 1\` brings it back)`); return; }
  if(v === ''){ const P = window.PROF; profSet(P && P.installed ? (P.level + 1) % 4 : 1); return; }
  const n = parseInt(v, 10); if(!(n >= 0 && n <= 3) || String(n) !== v){ err('prof takes 0-3 or off'); return; } profSet(n); });
def('fps', '', 'the fps line (prof 1)', () => profSet(1));
def('stats', '', 'the last 60 frames, from the profiler', () => { const P = needProf(); if(!P) return; if(!P.R.n){ log('no frames recorded yet'); return; } log(summary(P.window(60))); if(H.on) log('(recorded before the console held the ride)', 'dm'); });
def('perf', '', 'measure 5 s of real frames (the ride runs meanwhile) and print a table', () => { const P = needProf(); if(!P) return;
  const wasHeld = H.on, t0 = rnow() + 200; if(wasHeld) unhold();   /* (from 200 ms on: the first frame after a hold spans the held time) */ note('measuring 5 s…' + (wasHeld ? ' (the ride runs meanwhile; keys still go here)' : ''));
  setTimeout(() => { const R = P.R, N = R.t.length; let k = 0; while(k < R.n && R.t[(R.i - k - 1 + N) % N] >= t0) k++;
    if(k < 2){ err('perf: no frames drawn in 5 s (tab hidden?)'); } else { const w = P.window(k); log(`perf, 5 s:\n` + summary(w)); }
    if(wasHeld && C.open) hold(); }, 5200); });
def('gl', '[on|off]', 'GPU pools: live when they were made; otherwise reloads with ?gl=', a => { const v = (a[0] || '').toLowerCase(), B = window.GLR;
  if(!v){ log(B ? `gl ${B.on ? 'on' : 'off'} (${B.kind || 'webgl'}${B.ok ? '' : ', ' + B.reason})` : window.GLR_OFF ? `gl unavailable: ${window.GLR_OFF}` : `gl off (made off at load${QS.get('gl') === '0' ? ': ?gl=0' : ''})`); return; }
  if(v !== 'on' && v !== 'off'){ err('gl takes on or off'); return; }
  if(B){ B.on = v === 'on'; log(`gl ${v} (live; a reload brings back the default, on${QS.get('gl') === '0' ? ' unless ?gl=0' : ''})`); return; }
  if(window.GLR_OFF && v === 'on'){ err(`gl can't turn on here: ${window.GLR_OFF}`); return; }
  if(v === 'on'){ log('gl was not made at load: reloading without ?gl=0'); reloadWith('gl', null); } else log('gl is already off'); });
def('land', '<n|key>', 'reload on road n (or its key), keeping the other params', a => { const L = G(() => LANDS) || [];
  if(!a[0]){ log(L.map((l, i) => `${pad(i, 2)} ${padE(l.key, 11)}${l.name}`).join('\n')); return; }
  const v = a[0].toLowerCase(); let i = /^\d+$/.test(v) ? +v : L.findIndex(l => l.key === v || String(l.name).toLowerCase() === v);
  if(!(i >= 0 && i < L.length)){ err(`no road ${a[0]} (land alone lists them)`); return; } reloadWith('land', i); });
def('demo', '[off|name]', 'reload with ?demo=off or a levels/<name>.json level; alone, says what is running', a => {
  if(!a[0]){ const D = window.DEMO; log(D ? `demo ${D.name}${D.invincible ? ' (invincible)' : ''}, ${D.ready ? D.N + ' roads' : 'not laid yet'}` : 'normal play (no demo level)'); return; }
  const v = a[0]; if(v !== 'off' && !/^[\w-]{1,48}$/.test(v)){ err('demo takes off or a level name'); return; } reloadWith('demo', v); });
def('force', '<ids|all|paced|none>', 'reload with ?force= (ids or all mark the ride dev)', a => {
  if(!a[0]){ log(`force ${QS.get('force') || '(not set)'}`); return; } const v = a.join('').toLowerCase();
  if(!/^[a-z0-9_,:-]{1,200}$/.test(v)){ err('force takes ids (comma separated), all, paced or none'); return; }
  if(v !== 'none' && v !== 'paced'){ SS.set(K_FORCE, v); note('forced moments change the ride: it will be marked dev and not saved to best nights'); }
  reloadWith('force', v); });
def('reload', '', 'reload the page', () => { note('reloading'); setTimeout(() => location.reload(), 120); });
def('pause', '', 'hold the ride and keep it held after the console closes (Esc, P or resume rides on)', () => {
  if(!riding()){ err('not riding: nothing to pause'); return; } if(!H.on && !hold()){ err('can\'t pause now (a menu is open?)'); return; }
  H.sticky = true; log('paused: the frame holds after the console closes; Esc, P or `resume` rides on'); });
def('resume', '', 'close the console and ride on (ends a pause, or closes the pause menu)', () => { H.sticky = false; close(true); G(() => { if(PSE.on) pauseClose(); }); });
def('god', '', 'toggle invincibility (the demo level\'s flag; demo rides only); marks the ride dev', () => { const D = window.DEMO;
  if(!D){ err('god uses the demo\'s invincible flag, and this is normal play: `demo default`, then god'); return; }
  if(D.invincible && !FLAG.god){ log('this demo level is already invincible'); return; }
  FLAG.god = !FLAG.god; D.invincible = FLAG.god; log(`god ${FLAG.god ? 'on' : 'off'}`); if(FLAG.god) devNote(); });
def('skip', '', 'jump to just before the next demo event (the demo\'s N); marks the ride dev', () => { const D = window.DEMO;
  if(!D || !D.skip){ err('skip needs a demo ride'); return; } if(!riding()){ err('not riding'); return; }
  const from = curSeg(); if(!D.skip()){ log('nothing to skip to (already in the next event\'s lead-in, or none left)'); return; }
  const nx = D.next && D.next(); log(`skipped ${from} → ${curSeg()}${nx ? ', next: ' + nx.id : ''}`); FLAG.tpSegs = G(() => segs); FLAG.tpWhy = 'skip'; devNote(); });
def('seg', '[n|+n]', 'teleport forward to camera segment n (or +n ahead), the way the test harnesses park; marks the ride dev', a => {
  const p = curSeg(); if(!a[0]){ log(`segment ${p == null ? '-' : p}`); return; } if(!riding()){ err('not riding'); return; }
  const m = /^(\+?)(\d+)$/.exec(a[0]); if(!m){ err('seg takes a segment number, or +n'); return; }
  let to = m[1] ? p + +m[2] : +m[2]; const D = window.DEMO; if(D && D.end) to = Math.min(to, D.end - 200);
  if(to <= p + 40){ err(`only forward (now ${p}; a jump back would land on dropped road)`); return; }
  if(to - p > 30000){ err('at most 30000 segments at a time'); return; }
  try{ extend(to + DRAW + 400); const dz = (to - p) * SEG; position += dz; for(const c of cars) c.z += dz; try{ const DR = MECH.director; if(DR && DR.reset) DR.reset(); }catch(e){} }
  catch(e){ err('seg failed: ' + (e && e.message || e)); return; }
  log(`segment ${p} → ${curSeg()}`); FLAG.tpSegs = G(() => segs); FLAG.tpWhy = 'seg'; devNote(); });
def('bmp', '', 'the kaiju ImageBitmap switch (NO_BMP in setpiece/kaiju.js, as served)', () =>
  fetch('setpiece/kaiju.js', { cache:'no-store' }).then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))).then(t => {
    const m = /const\s+NO_BMP\s*=\s*([^;]+);/.exec(t); log(m ? `NO_BMP = ${m[1].trim()}: ${/^true$/.test(m[1].trim()) ? 'titan atlases stay plain canvases on every browser' : 'titan atlases may become ImageBitmaps'}` : 'NO_BMP not found in setpiece/kaiju.js');
    log(`createImageBitmap in this browser: ${typeof createImageBitmap === 'function' ? 'yes' : 'no'}`, 'dm'); }));
def('ver', '', 'the build version (the deploy stamp, else the service worker, else the local source)', async () => {
  const U = window.SDUPDATE; if(U && U.version){ log(`version ${U.version}${U.waiting ? ' (update ready)' : ''}`); return; }
  let sw = null; if(navigator.serviceWorker && navigator.serviceWorker.controller) try{ const r = await fetch('sw.js', { cache:'no-store' }); if(r.ok) sw = (/const VERSION = '([^']+)'/.exec(await r.text()) || [])[1] || null; }catch(e){}
  if(sw){ log(`version ${sw} (service worker)`); return; }
  let lm = ''; try{ const r = await fetch(location.pathname, { method:'HEAD', cache:'no-store' }); lm = r.headers.get('last-modified') || ''; }catch(e){}
  log(`local source build: no deploy stamp (.sdver / sw.js come from tools/deploy-sundown.mjs)${lm ? '\nsundown.html modified ' + new Date(lm).toLocaleString() : ''}`); });
C.cmds = CMD;
})();
