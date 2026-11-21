/* Sundown mechanic module: the dawn finale (see mech/README.md). When a night ends at dawn, before the results: the road straightens
   toward the sunrise, the HUD fades away, traffic thins to nothing and the bike rides slowly into the sun while a personal credits roll
   of YOUR night goes by: the roads you rode with their kanji, the rivals you beat, the jumps you landed, what you saw, how far you went.
   Then "夜明け", then the results (from the course map; the finale was the ending moment).
   References (nothing copied): OutRun's goal endings (the bike rolls on into a scene, a short tableau, then the score), OutRun 2's
   endings (the finish line opens onto a wide sunlit vista and the car slows), Journey's ending (the climb stops being a challenge;
   light, a slow ascent, then the credits with your own companions named). An ending, not an action beat: no slams, no shake, no
   focus lines; stepped fades and a slow pixel crawl. The sun is the game's own (env/sky.js's ramp, the results' cut-band sun), drawn
   in the sky layer so the skyline stands in front of it; on the Fuji roads it rises behind the summit (Diamond Fuji).
   Any key, tap or button skips straight to the results; a safety timer always ends it. Reduced motion: the sun does not climb, the
   credits fade card by card instead of crawling. About 15 s. */
"use strict";
(() => {
const F = MECH.finale = {};
const DUR = 15.5, INTRO = 1.4, OUTRO = 3.4;
let on = false, t0 = 0, cb = null, root = null, timers = [], raf = 0, padPrev = null, keyH = null, ptrH = null, wrapped = false, crawl = null;
const T = () => (performance.now() - t0) / 1000;
const stepq = (v, n) => Math.floor(clamp(v, 0, 1) * n) / n;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);
F.active = () => on;

/* ---------------------------------------------------------------- what to credit: read from the night's record */
const MOMENT = { kaiju:['怪獣', 'The kaiju'], typhoon:['台風', 'A typhoon'], hanabi:['花火', 'Hanabi'], matsuri:['祭', 'The matsuri'], shinkansen:['新幹線', 'The shinkansen'],
  fuji:['富士', 'Fuji at dawn'], jets:['旅客機', 'Low jets'], greatwave:['大波', 'The great wave'], 'jump:harbour':['跳開橋', 'The drawbridge'], 'jump:tunnels':['首都高越え', 'The interchange jump'],
  'jump:pass':['谷越え', 'The ravine jump'], 'jump:refinery':['配管越え', 'The pipeline jump'], 'jump:snow':['ジャンプ台', 'The ski jump'], 'jump:paddies':['線路越え', 'The railway jump'],
  'jump:sakurajima':['溶岩越え', 'The lava leap'], 'jump:haneda':['誘導路越え', 'The taxiway jump'], fireball:['爆発', 'The inferno'], avalanche:['雪崩', 'The avalanche'],
  jetwash:['噴射', 'The jetwash'], wheel:['観覧車', 'The runaway wheel'], screenfall:['大画面', 'The screenfall'], kanpo:['観光放水', 'The gates open'], teiden:['停電', 'The blackout'], yoiyama:['宵山', 'The festival float'] };   // named as the moment's own card names them (爆発 INFERNO, 噴射 JETWASH)
const GANG = { guren:['紅蓮', 'GUREN', '#ff5a6a'], shiden:['紫電', 'SHIDEN', '#b07aff'], hakuro:['白狼', 'HAKURO', '#6ac8ff'] };
const ROADCOL = { harbour:'#ff5a8a', bay:'#4ff0ff', neon:'#c77dff', tunnels:'#ffb347', pass:'#7aff9a', refinery:'#ffd04a', coast:'#5affd8', snow:'#dff0ff', paddies:'#d8ff5a',
  aqua:'#3ab0ff', shimanami:'#ff9a8a', sakurajima:'#ff6a3a', haneda:'#6a80ff', minato:'#ff8ad8', shuto:'#3ad67a', kurobe:'#9ae0ff', akiba:'#ffd23a', gion:'#ff9a4a' };   // the arrival cards' and results screen's road colours
function cards(rec){ const out = [], km = n => (+n || 0).toFixed(1);
  const nights = (store.get('arcade.sundown', []) || []).length, bike = (ENV.bikes && ENV.bikes.list || []).find(b => b.id === rec.bike);
  out.push(['今夜', 'TONIGHT', `<p class="fbig">${esc(new Date(rec.t).toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long' }))}</p><p>Night ${nights}${bike ? ' · on the ' + esc(bike.name) : ''}</p>`]);
  const route = Array.isArray(rec.route) && rec.route.length ? rec.route : [LANDS.findIndex(l => l.name === rec.land)].filter(i => i >= 0), seen = new Set();
  const roads = route.filter(i => LANDS[i] && !seen.has(i) && seen.add(i)).map(i => { const L = LANDS[i], k = rec.roadKm && rec.roadKm[L.key];
    return `<li><b style="color:${ROADCOL[L.key] || '#f4ecdf'}">${L.kanji}</b><span>${esc(L.name.toUpperCase())}</span><i>${k ? km(k) + ' km' : ''}</i></li>`; });
  out.push(['道', 'THE ROADS', `<ul>${roads.join('')}</ul>`]);
  const won = (Array.isArray(rec.rivals) ? rec.rivals : []).filter(e => e && e.won && GANG[e.g]);
  if(won.length){ const by = {}; won.forEach(e => { by[e.g] = (by[e.g] || 0) + 1; });
    out.push(['好敵手', 'RIVALS BEATEN', `<ul>${Object.keys(by).map(g => `<li><b style="color:${GANG[g][2]}">${[...GANG[g][0]][0]}</b><span>${GANG[g][1]}</span><i>${by[g] > 1 ? '×' + by[g] : ''}</i></li>`).join('')}</ul>`]); }
  else if(rec.duelsWon) out.push(['好敵手', 'RIVALS BEATEN', `<p class="fbig">${rec.duelsWon}</p><p>${rec.duelsWon === 1 ? 'duel' : 'duels'} won</p>`]);
  const lj = +rec.landmarkJumps || 0, cl = +rec.cleanLandings || 0, kj = +rec.jumps || 0;
  if(lj || kj) out.push(['跳', 'JUMPS LANDED', `<ul>${lj ? `<li><b>跳</b><span>LANDMARK JUMPS</span><i>${lj}${cl ? ' · ' + cl + ' clean' : ''}</i></li>` : ''}${kj ? `<li><b>台</b><span>RAMPS</span><i>${kj}</i></li>` : ''}</ul>`]);
  const ms = [...new Set(Array.isArray(rec.moments) ? rec.moments : [])].map(id => MOMENT[id] || MOMENT[String(id).split(':')[0]]).filter(Boolean);
  if(ms.length) out.push(['見物', 'WHAT YOU SAW', `<ul>${ms.map(([k, n]) => `<li><b>${k[0]}</b><span>${esc(n.toUpperCase())}</span><i></i></li>`).join('')}</ul>`]);
  out.push(['距離', 'THE DISTANCE', `<p class="fbig">${km(rec.km)}<small> km</small></p><p>${rec.gates || 0} ${rec.gates === 1 ? 'checkpoint' : 'checkpoints'}${rec.bestFlow ? ' · best flow ×' + rec.bestFlow : ''}${rec.closeCalls ? ' · ' + rec.closeCalls + ' close calls' : ''}</p>`]);
  return out; }

/* ---------------------------------------------------------------- the sun: in the sky layer (before the far land), so skylines and Fuji stand in front */
const SUNC = ['#fff6d0', '#ffe48a', '#ffd04a', '#ffb347', '#ff8a3a'];
function drawSun(o){ const u = T(), k = PX, hz = o.hz, R = Math.max(k * 8, Math.round(Math.min(W, H) * .11 / k) * k);
  const Lk = LANDS[o.bgB] && LANDS[o.bgB].key, RL = MECH.sp_rail && MECH.sp_rail.R, fuji = !!(RL && RL.fj && RL.fj.on && (Lk === 'coast' || Lk === 'tunnels'));
  let sx = W / 2, base = hz;
  if(fuji){ const coast = Lk === 'coast', sk0 = RL.fj.sk0 === undefined ? skyOff : RL.fj.sk0; sx = W * (coast ? .44 : .5) - clamp((skyOff - sk0) * .6, -1, 1) * W * .22; base = hz - (78 + (coast ? 7 : 4)) * k + 3 * k; }   // rail.js's summit
  const rise = reduce ? .6 : (q => q * q * (3 - 2 * q))(clamp(u / 10, 0, 1)), cy = Math.round((base + R * (1 - rise * (fuji ? 1.35 : 1.7))) / k) * k, a = reduce ? stepq(u / 1.2, 4) : stepq(u / 1.6, 6);
  if(a <= 0) return; cx.save(); cx.globalAlpha = a; sx = Math.round(sx / k) * k;
  // rays: stepped wedges, turning very slowly (still under reduced motion)
  const turn = reduce ? 0 : u * .03; cx.fillStyle = 'rgba(255,214,150,.07)';
  for(let i = 0; i < 16; i += 2){ const a0 = (i / 16) * Math.PI * 2 + turn, a1 = a0 + Math.PI / 16, L = Math.max(W, H); cx.beginPath(); cx.moveTo(sx, cy); cx.lineTo(sx + Math.cos(a0) * L, cy + Math.sin(a0) * L); cx.lineTo(sx + Math.cos(a1) * L, cy + Math.sin(a1) * L); cx.fill(); }
  // a stepped halo (no blur): three rings of falling strength
  for(const [f, al] of [[2.6, .07], [1.9, .1], [1.4, .14]]){ cx.fillStyle = `rgba(255,190,120,${al})`; const r = Math.round(R * f / k) * k; for(let y = -r; y < r; y += k){ const w = Math.round(Math.sqrt(r * r - y * y) / k) * k; if(cy + y < base) cx.fillRect(sx - w, cy + y, w * 2, k); } }
  // the disc: rows of hard pixels in five bands, the lower half cut by widening gaps (the sunrise of the results screen)
  for(let y = -R; y < R; y += k){ const yy = cy + y; if(yy >= base) break; const w = Math.round(Math.sqrt(R * R - (y + k / 2) * (y + k / 2)) / k) * k; if(w <= 0) continue;
    const v = (y + R) / (2 * R), cut = v > .55 && ((y + R) / k | 0) % 4 < 1 + Math.round((v - .55) / .45 * 2); if(cut) continue;
    cx.fillStyle = SUNC[Math.min(4, Math.floor(v * 5))]; cx.fillRect(sx - w, yy, w * 2, k); }
  // the horizon catches the light: a thin bright line and a short warm band under the sun
  if(!fuji){ cx.fillStyle = 'rgba(255,220,150,.55)'; cx.fillRect(sx - R * 2, hz - k, R * 4, k); cx.fillStyle = 'rgba(255,170,100,.18)'; cx.fillRect(sx - R * 4, hz - k * 3, R * 8, k * 2); }
  cx.restore(); }
function wrap(){ if(wrapped) return; wrapped = true;
  if(ENV.sky && ENV.sky.draw){ const orig = ENV.sky.draw; ENV.sky.draw = function(o){ if(!on) return orig.apply(this, arguments);
      const r = orig.call(this, Object.assign({}, o, { t:Math.min(o.t, .954) }));   // sky.js's own side sun steps aside for the one ahead
      try{ drawSun(o); }catch(e){ console.warn('finale sun', e); } return r; }; }
  if(ENV.hud && ENV.hud.draw){ const hd = ENV.hud.draw; ENV.hud.draw = function(){ if(!on) return hd.apply(this, arguments); const a = 1 - stepq(T() / 1.4, 5); if(a <= 0) return;
      const g = cx.globalAlpha; cx.globalAlpha = a; try{ return hd.apply(this, arguments); }finally{ cx.globalAlpha = g; } }; }
  // the other modules' screen layer (callouts, cards, meters, the roadblock plate) is HUD too: it fades with the HUD, then rests
  for(const k in MECH){ const m = MECH[k]; if(m === F || typeof m.drawScreen !== 'function' || m.drawScreen.__fin) continue; const ds = m.drawScreen, w = function(){ if(!on) return ds.apply(this, arguments);
      const a = 1 - stepq(T() / 1.4, 5); if(a <= 0) return; const g = cx.globalAlpha; cx.globalAlpha = a; try{ return ds.apply(this, arguments); }finally{ cx.globalAlpha = g; } }; w.__fin = true; m.drawScreen = w; } }
F.drawBackdrop = o => { if(on && !(ENV.sky && ENV.sky.draw)) drawSun(o); };   // without env/sky.js: in front of the skyline, at least

/* ---------------------------------------------------------------- the ride: straighten, slow, centre, thin the traffic */
F.update = dt => { if(!on) return;
  speed = lerp(speed + ACCEL * .8 * dt, MAXS * .42, 1 - Math.exp(-.7 * dt));   // instead of rolling to a stop (undoes the core's braking): a slow ride into the sun
  playerX = lerp(playerX, 0, 1 - Math.exp(-1.2 * dt));
  const pz = position + PZ, i0 = Math.floor(pz / SEG) + 30;
  for(let i = i0; i < i0 + DRAW + 60 && i < segs.length; i++){ const s = segs[i]; if(s.finF) continue; s.finF = 1; s.curve *= Math.max(0, 1 - (i - i0) / 80); }   // the road ahead opens out straight
  for(const c of cars) if(c.z > pz + 18000) c.z = 1e12;   // no new traffic: anything not yet in sight is gone for good, the rest is passed or pulls away
  { const G = MECH.gang, R = G && G._dbg && typeof G._dbg.R === 'function' ? G._dbg.R() : null;   // the gang rides on ahead into the sun: the ending is yours alone
    if(Array.isArray(R)) for(const r of R) if(typeof r.speed === 'number') r.speed = Math.max(r.speed, MAXS * .9); }
  if(T() > DUR + 4) end();   // never trapped
};

/* ---------------------------------------------------------------- the credits */
const CSS = `
body.finale .top,body.finale .home,body.finale .info,body.finale #journalBtn,body.finale #hudx,body.finale .next,body.finale .kickb,body.finale .pzb,body.finale .float,body.finale .banner{opacity:0!important;transition:opacity 1.2s steps(5)!important;pointer-events:none!important}
#fin{position:fixed;inset:0;z-index:20;pointer-events:auto;cursor:pointer;font-family:var(--font-display);color:#f4ecdf}
#fin .fwash{position:absolute;inset:0;background:#fff0d0;opacity:0;animation:finwash 1.4s steps(6) both;pointer-events:none}
@keyframes finwash{0%{opacity:0}30%{opacity:.34}100%{opacity:0}}
#fin .fcol{position:absolute;left:0;top:12vh;bottom:10vh;width:min(460px,48vw);padding-left:max(24px,6vw);overflow:hidden;background:linear-gradient(90deg,rgba(7,6,12,.62) 0 55%,rgba(7,6,12,.3) 55% 80%,transparent 80%);-webkit-mask:linear-gradient(transparent 0,#000 12%,#000 82%,transparent 100%);mask:linear-gradient(transparent 0,#000 12%,#000 82%,transparent 100%)}
#fin .froll{position:absolute;left:max(24px,6vw);right:24px;top:0;display:flex;flex-direction:column;gap:42px;will-change:transform}
#fin .fc{display:flex;flex-direction:column;gap:8px;text-shadow:2px 2px 0 #000,0 0 0 #000}
#fin .fc h3{margin:0;display:flex;align-items:center;gap:10px;font-weight:400;font-size:16px;letter-spacing:4px;color:#ffd04a}
#fin .fc h3::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,#ffd04a,transparent);box-shadow:0 2px 0 #000}
#fin .fc .tabk{font-size:13px;letter-spacing:0}
#fin .fc p{margin:0;font-size:16px;line-height:1.5}
#fin .fc .fbig{font-size:32px;line-height:1.1;letter-spacing:2px}
#fin .fc .fbig small{font-size:16px}
#fin .fc ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
#fin .fc li{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:baseline;gap:10px;font-size:16px}
#fin .fc li b{font-weight:400;font-size:32px;line-height:1;text-shadow:3px 3px 0 #000}
#fin .fc li i{font-style:normal;color:#ffd04a;white-space:nowrap}
#fin.cards .froll{position:relative;top:auto}#fin.cards .fc{position:absolute;left:0;right:0;top:30%;opacity:0;transition:opacity .5s steps(4)}#fin.cards .fc.on{opacity:1}
#fin .fend{position:absolute;left:0;right:0;bottom:16vh;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0;transition:opacity .9s steps(6)}
#fin .fend.on{opacity:1}
#fin .fend b{font-weight:400;font-size:96px;line-height:1;color:#fff6ea;letter-spacing:6px;text-shadow:-4px 0 #000,4px 0 #000,0 -4px #000,0 4px #000,6px 6px 0 #c0203a,10px 10px 0 #000}
#fin .fend span{font-size:16px;letter-spacing:6px;color:#ffd04a;text-shadow:2px 2px 0 #000}
#fin .fskip{position:absolute;right:16px;bottom:16px;font-size:13px;letter-spacing:2px;color:#b9adc4;text-shadow:2px 2px 0 #000;opacity:.8}
@media (max-width:640px){ #fin .fcol{left:0;right:0;width:auto;padding-left:16px;top:auto;bottom:22vh;height:40vh;background:linear-gradient(rgba(7,6,12,.5),rgba(7,6,12,.5))} #fin .froll{left:16px;right:16px} #fin .fend b{font-size:64px} #fin .fend{bottom:12vh} #fin .fc li b{font-size:24px} #fin .fc li{grid-template-columns:30px minmax(0,1fr) auto} }
.rm #fin *{animation:none!important}
`;
function injectCSS(){ if(document.getElementById('fin-css')) return; const st = document.createElement('style'); st.id = 'fin-css'; st.textContent = CSS; document.head.appendChild(st); }
const anyPad = () => { if(!navigator.getGamepads) return null; const gs = navigator.getGamepads(); for(let i = 0; i < gs.length; i++) if(gs[i]) return gs[i]; return null; };
// play the finale for this record; done() is called once (skipped or not). Returns false (and does nothing) if it can't run.
F.play = (rec, done) => { if(on || !rec || typeof done !== 'function') return false; try{
  injectCSS(); wrap(); on = true; cb = done; t0 = performance.now(); document.body.classList.add('finale');
  const CI = MECH.cutin; if(CI && CI.hide){ CI.hide(); if(CI.show && !CI.show.__fin){ const sh = CI.show, w = function(){ return on ? true : sh.apply(this, arguments); }; w.__fin = true; CI.show = w; } }   // no cut-ins over an ending
  const cs = cards(rec), when = new Date(rec.t).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }).toUpperCase();
  root = document.createElement('div'); root.id = 'fin'; root.className = reduce ? 'cards' : ''; root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'The end of the night');
  root.innerHTML = `<div class="fwash"></div><div class="fcol"><div class="froll">${cs.map(([kj, h, body]) => `<section class="fc"><h3><span class="tabk">${kj}</span>${h}</h3>${body}</section>`).join('')}</div></div>
    <div class="fend"><b>夜明け</b><span>DAWN · ${esc(when)}</span></div><span class="fskip">skip ▶</span>`;
  document.body.appendChild(root);
  const roll = root.querySelector('.froll'), col = root.querySelector('.fcol'), secs = [...roll.children], span = DUR - INTRO - OUTRO;
  if(reduce){ const per = span / secs.length; secs.forEach((s, i) => { timers.push(setTimeout(() => s.classList.add('on'), (INTRO + i * per) * 1000)); timers.push(setTimeout(() => s.classList.remove('on'), (INTRO + (i + 1) * per - .45) * 1000)); }); }
  else { crawl = { from:col.clientHeight, to:-roll.scrollHeight, roll };
    const tick = () => { if(!on) return; const u = clamp((T() - INTRO) / span, 0, 1), y = Math.round(lerp(crawl.from, crawl.to, u) / 2) * 2; roll.style.transform = `translateY(${y}px)`; timers.push(setTimeout(tick, 50)); }; tick(); }
  timers.push(setTimeout(() => { if(root) root.querySelector('.fend').classList.add('on'); }, (DUR - OUTRO) * 1000));
  timers.push(setTimeout(end, DUR * 1000));
  // any press skips: keys (swallowed, so the press doesn't also act on the results), a tap or click, any pad button
  keyH = e => { if(!on || e.repeat) return; if(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(e.code)) return; e.preventDefault(); e.stopImmediatePropagation(); end(); };
  ptrH = e => { if(!on) return; e.preventDefault(); e.stopPropagation(); end(); };
  addEventListener('keydown', keyH, true); root.addEventListener('pointerdown', ptrH);
  const gp0 = anyPad(); padPrev = gp0 ? gp0.buttons.map(b => !!(b && b.pressed)) : [];
  const pt = () => { if(!on) return; const gp = anyPad(); if(gp){ const nowB = gp.buttons.map(b => !!(b && b.pressed)); if(nowB.some((p, i) => p && !padPrev[i])){ end(); return; } padPrev = nowB; } raf = requestAnimationFrame(pt); }; raf = requestAnimationFrame(pt);
  return true; }catch(e){ console.warn('finale', e); end(); return false; } };
function end(){ if(!on && !root) return; on = false; timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); if(keyH) removeEventListener('keydown', keyH, true); keyH = null;
  document.body.classList.remove('finale'); const r = root; root = null; crawl = null; if(r) r.remove();
  const done = cb; cb = null; if(done) try{ done(); }catch(e){ console.warn('finale done', e); } }
F.skip = end;
F.reset = () => { if(on){ cb = null; end(); } };
})();
