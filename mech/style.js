/* Sundown mechanic module: the style chain (MECH.style). See mech/README.md and research/sundown-craft/style.md.
   Load with the other mech modules:   <script src="mech/style.js"></script>

   The dream it serves: "being seen being cool". Close calls, slipstreams, boosts, Akira slides, landings, takedowns, escapes and
   gates now chain into one building combo, and the banked style goes into the night's record.

   References studied (rules taken, nothing copied):
   - Project Gotham Racing (Bizarre Creations 2001-07), Kudos: style acts chain while each follows the last within a short window;
     the chain is only worth something once it is banked, and any contact throws the whole unbanked chain away.
   - Tony Hawk's Pro Skater (Neversoft 1999): points x multiplier, where the multiplier is the number of tricks in the combo; the
     bail loses the combo with one clear beat, and you are back in control at once.
   - Burnout 3: Takedown (Criterion 2004): near misses, oncoming and takedowns all feed one meter; the chain lives on boost.
   - Hi-Fi Rush (Tango 2023) and Sayonara Wild Hearts (Simogo 2019): each act is a note; the payoff lands as a chord in the song's key.
   - OutRun 2 (Sega AM2 2003): style is celebrated without stopping the drive; nothing ever freezes the road for a score.
   Rules:
   - Every act adds its points to the chain and refreshes a short timer (WIN s, a little shorter as the multiplier climbs).
   - The multiplier climbs with chain length (MULT_AT). When the timer runs out the chain banks: points x multiplier into the
     night's style total, with a bank chord in the music's key.
   - A crash, a spike hit, a botched landing, a rival's kick, scraping a patrol car, or riding the barrier / off the road
     (the same limits that already reset flow) breaks it: the unbanked chain is lost with one short beat. Control is never taken.
   - A checkpoint gate carries a live chain (it counts and refreshes) but never starts one: style has to be earned.
   How acts are seen (no edits to other modules): the core and the modules already announce their acts through floatText /
   MECH.arrival.callout, so arrival.js hands each string to S.hear() first; the gang's takedowns, gates and crashes are read from
   counters; the police escape comes through the escaped() hook. Small frequent callouts (Close, Boost, Boost pad, Slipstream,
   Slid past, Dodged, Clean landing) are folded into the chain display instead of a floating card.
   Read API (mech/heat.js and others): MECH.style.chain, .mult, .pending, .total, .frac (timer left 0..1), .best;
     MECH.style.onAction(fn): fn(ev) on every act, bank and break. ev is one reused object { type:'act'|'bank'|'break', kind, pts,
     chain, mult, pending, total } (copy what you keep). MECH.style.act(kind, pts) lets a module add an act of its own.
   No canvases. No per-frame allocation (the queue and the event are fixed objects). */
"use strict";
(() => {
const S = MECH.style = {};

/* ---------------- tuning ---------------- */
const WIN = 5, WIN_MIN = 3.2, WIN_STEP = .25;           // the chain's timer: 5 s at x1, .25 s less per multiplier step, never under 3.2
const MULT_AT = [0, 1, 2, 4, 7, 11, 16, 22, 29, 37];      // multiplier m needs a chain of MULT_AT[m] acts (x9 at most)
const BANK_T = 1.1, LOST_T = .8;                          // how long the bank / chain-lost beat holds on the display
// points per act, its display label (the HUD's 3x5 face: no J, Q or Z), and whether its floating callout folds into the chain
const ACT = {
  near:     { p:100, l:'CLOSE',     fold:true },
  boost:    { p:50,  l:'BOOST',     fold:true },
  bigboost: { p:150, l:'BIG BOOST', fold:true },   // folded too (quiet.md): the busiest card left, ~3 a minute
  thunderboost:{ p:300, l:'THUNDER' },
  pad:      { p:50,  l:'PAD',       fold:true },
  slip:     { p:150, l:'DRAFT',     fold:true },
  slipsling:{ p:250, l:'SLINGSHOT', fold:true },
  land:     { p:200, l:'LANDED',    fold:true },
  bigair:   { p:300, l:'BIG AIR',   fold:true },
  shortcut: { p:250, l:'SHORTCUT',  fold:true },
  jump:     { p:400, l:'AIRTIME' },
  slide:    { p:100, l:'SLIDE',     fold:true },
  slidpast: { p:250, l:'SLID PAST', fold:true },
  takedown: { p:500, l:'TAKEDOWN' },
  duel:     { p:600, l:'DUEL WON' },
  counter:  { p:150, l:'COUNTER',   fold:true },
  escape:   { p:100, l:'ESCAPED' },   // modest: the crash that brought the chase already cost the chain (see S.escaped)
  thread:   { p:500, l:'BLOCK RUN' },
  through:  { p:300, l:'SLIPPED',   fold:true },
  dodge:    { p:150, l:'DODGE',     fold:true },
  fire:     { p:500, l:'ESCAPED' },
  gate:     { p:200, l:'GATE' },
  weave:    { p:300, l:'THREADED' },   // a designed formation threaded clean (mech/formations.js passes the formation's name as the label)
  style:    { p:150, l:'STYLE' } };
S.LABELS = ['BANK', 'CHAIN LOST']; for(const k in ACT) if(!S.LABELS.includes(ACT[k].l)) S.LABELS.push(ACT[k].l);   // hud.js prebuilds these
// the strings the game already shows, mapped to an act (or a break). Exact strings first, then prefixes.
const HEAR = { 'Close':'near', 'Boost':'boost', 'Big boost':'bigboost', 'Thunder':'thunderboost', 'Boost pad':'pad', 'Slipstream':'slip', 'Slipstream!':'slipsling',
  'Clean landing':'land', 'Big air':'bigair', 'Shortcut':'shortcut', 'Big air · shortcut':'bigair', 'スライド SLIDE':'slide', 'Slid past':'slidpast',
  '勝 Duel won':'duel', 'Counter!':'counter', 'Lost them!':'thread', 'Slipped through':'through', 'Dodged':'dodge', 'DODGED':'dodge' };
const BREAK = { 'Spikes!':1, 'Wobble':1, 'Kicked':1, 'SCRAPE':1 };

/* ---------------- state ---------------- */
let chain = 0, mult = 1, pend = 0, left = 0, win = WIN, total = 0;
let st = null;                 // the night's numbers for the record
const Q = new Array(16), QN = { n:0 };   // acts heard since the last update (strings from a fixed table: no allocation)
let lastFlow = 0, lastCrash = 0, lastGates = 0, lastTd = 0, airT = 9, escT = 9, breakQ = false, offWas = false;
const subs = [];
const EV = { type:'', kind:'', pts:0, chain:0, mult:1, pending:0, total:0 };
// what env/hud.js draws: one reused object
// rep: how many acts in a row carried this label (the tab shows "CLOSE x3" instead of a chip per act; display only, never scored)
const V = S.view = { on:false, chain:0, mult:1, pend:0, frac:0, label:'', rep:0, actT:9, multT:9, beat:0, beatT:9, beatPts:0, total:0, warnT:0 };

function multFor(n){ let m = 1; for(let i = 1; i < MULT_AT.length; i++) if(n >= MULT_AT[i]) m = i; return Math.max(1, m); }
function emit(type, kind, pts){ if(!subs.length) return; EV.type = type; EV.kind = kind; EV.pts = pts; EV.chain = chain; EV.mult = mult; EV.pending = pend; EV.total = total;
  for(let i = 0; i < subs.length; i++){ try{ subs[i](EV); }catch(e){ console.warn('style listener', e); } } }

/* ---------------- sound: a rising tick per act, a bank chord, a falling pair for a lost chain (all in the music's key) ---------------- */
const FALLBACK = [57, 60, 64, 69, 72, 76, 81, 84, 88, 93, 96, 100];
function lad(){ try{ if(typeof M !== 'undefined' && M.cur && M.ladder) return M.ladder(); }catch(e){} return FALLBACK; }
const audioOn = () => typeof M !== 'undefined' && M.ac && M.ac.state === 'running';
function sTick(n){ if(!audioOn()) return; const L = lad(), i = Math.min(L.length - 1, 3 + Math.min(n, 9)), t = M.ac.currentTime;
  M.tone(midi(L[i]) * 2, .05, { type:'square', v:.012, atk:.002, at:t }); M.tone(midi(L[i]), .09, { type:'triangle', v:.02, atk:.002, at:t }); }
function sBank(m){ if(!audioOn()) return; const L = lad(), t = M.ac.currentTime, s32 = 60 / 126 / 8, n = m >= 4 ? 4 : 3, b = Math.min(L.length - 5, 2 + Math.min(m, 3));
  for(let k = 0; k < n; k++) M.tone(midi(L[b + k]), .55 - k * .06, { type:'triangle', v:.03, atk:.004, at:t + k * s32 });
  M.tone(midi(L[b + n - 1]) * 2, .7, { type:'square', v:.011, atk:.01, at:t + n * s32 }); }
function sLost(){ if(!audioOn()) return; const L = lad(), t = M.ac.currentTime, a = midi(L[Math.min(L.length - 1, 5)]);
  M.tone(a, .1, { type:'square', v:.016, at:t }); M.tone(a * .749, .22, { type:'square', v:.016, at:t + .09 }); }   // down a fourth: "aw"

/* ---------------- the chain ---------------- */
function act(kind, pts, lbl){ if(state !== 'play') return false; const A = ACT[kind] || ACT.style;
  if(kind === 'gate' && chain === 0) return false;   // a gate carries a chain, never starts one
  const p = pts != null ? +pts || 0 : A.p, m0 = mult;
  chain++; pend += p; mult = multFor(chain); win = Math.max(WIN_MIN, WIN - (mult - 1) * WIN_STEP); left = win;
  if(V.beat) V.beat = 0;   // a new chain takes the display back from a bank or loss beat
  const lab = lbl && S.LABELS.includes(lbl) ? lbl : A.l; V.rep = chain > 1 && lab === V.label ? V.rep + 1 : 1;   // repeats merge into a count
  V.label = lab; V.actT = 0; if(mult > m0) V.multT = 0;
  st.acts++; st.kinds[kind] = (st.kinds[kind] || 0) + 1; if(chain > st.bestChain) st.bestChain = chain; if(mult > st.maxMult) st.maxMult = mult;
  sTick(chain); emit('act', kind, p); return true; }
function bank(quiet){ if(!chain) return; const pts = pend * mult, m = mult; total += pts; st.banks++; if(pts > st.bestBank){ st.bestBank = pts; st.bestBankChain = chain; }
  V.beat = 1; V.beatT = 0; V.beatPts = pts; V.mult = m; V.label = 'BANK'; emit('bank', 'bank', pts); chain = 0; pend = 0; mult = 1; left = 0;
  if(!quiet) sBank(m); }
function lose(){ if(!chain) return; const pts = pend * mult; st.breaks++; st.lost += pts;
  V.beat = 2; V.beatT = 0; V.beatPts = pts; V.label = 'CHAIN LOST'; emit('break', 'break', pts); chain = 0; pend = 0; mult = 1; left = 0; sLost(); }

/* ---------------- hearing the game's own announcements (called by mech/arrival.js before it shows a callout) ---------------- */
S.hear = (text, o) => { if(state !== 'play' || typeof text !== 'string') return false;
  if(BREAK[text] || text.indexOf('Kicked') === 0){ breakQ = true; return false; }
  let k = HEAR[text];
  if(!k && text === 'ESCAPED' && o && o.kanji === '脱') k = 'fire';   // the fireball set piece's escape (the police one comes through escaped())
  if(!k) return false;
  if(QN.n < Q.length) Q[QN.n++] = k;
  return !!ACT[k].fold; };   // true: arrival.js shows it in the chain instead of a floating callout
// riding out a chase pays a modest act. Every chase starts with a crash (Kellan, 2026-11-19: the police come only on the first
// crash), and that crash has already thrown the unbanked chain away (lose()) and zeroed flow, so a crash never comes out ahead
// (bots: research/sundown-craft/heat.md). Never consumes the hook (police.js shows the card).
S.escaped = () => { if(state === 'play' && QN.n < Q.length) Q[QN.n++] = 'escape'; };
S.act = (kind, pts, lbl) => act(String(kind), pts, lbl);   // lbl: an optional display label from S.LABELS (pushed there before hud.js warms)
S.onAction = fn => { if(typeof fn === 'function' && !subs.includes(fn)) subs.push(fn); return () => { const i = subs.indexOf(fn); if(i >= 0) subs.splice(i, 1); }; };
Object.defineProperties(S, {
  chain:{ get:() => chain }, mult:{ get:() => mult }, pending:{ get:() => pend }, total:{ get:() => total },
  frac:{ get:() => chain ? Math.max(0, left / win) : 0 }, best:{ get:() => st ? st.bestChain : 0 }, live:{ get:() => chain > 0 } });
S.stats = () => st;

function gangTd(){ try{ const G = MECH.gang, s = G && G._dbg && G._dbg.ST && G._dbg.ST(); return s ? s.takedowns | 0 : 0; }catch(e){ return 0; } }
S.reset = () => { chain = 0; mult = 1; pend = 0; left = 0; win = WIN; total = 0; QN.n = 0; breakQ = false; offWas = false; airT = 9; escT = 9;
  lastFlow = typeof flow === 'number' ? flow : 0; lastCrash = typeof crashes === 'number' ? crashes : 0; lastGates = typeof gatesHit === 'number' ? gatesHit : 0; lastTd = gangTd();
  st = { acts:0, banks:0, breaks:0, lost:0, bestChain:0, bestBank:0, bestBankChain:0, maxMult:1, kinds:{} };
  V.on = false; V.chain = 0; V.mult = 1; V.pend = 0; V.frac = 0; V.label = ''; V.rep = 0; V.actT = 9; V.multT = 9; V.beat = 0; V.beatT = 9; V.beatPts = 0; V.total = 0; };
S.update = dt => {
  if(!st) S.reset();
  V.actT += dt; V.multT += dt; V.beatT += dt; if(V.beat && V.beatT > (V.beat === 1 ? BANK_T : LOST_T)) V.beat = 0;
  // breaks first: a crash (also the one that turns into the arrest, so this runs in any state), a spike hit, a botched landing, a
  // kick, or riding the barrier / off the road past the core's own flow limits
  const off = state === 'play' && ((typeof offT === 'number' && offT > .8) || (typeof scrapeT === 'number' && scrapeT > .6));
  if(crashes !== lastCrash || (breakQ && state === 'play') || (off && !offWas)){ lose(); QN.n = 0; }
  lastCrash = crashes; breakQ = false; offWas = off;
  if(state !== 'play'){ QN.n = 0; lastFlow = flow; lastGates = gatesHit; lastTd = gangTd(); syncView(); return; }
  airT = (typeof AIR !== 'undefined' && AIR.h >= 6) ? 0 : airT + dt; escT += dt;
  // acts heard this frame, then the counters
  let n = 0;
  for(let i = 0; i < QN.n; i++){ if(Q[i] === 'escape') escT = 0; if(act(Q[i])) n++; } QN.n = 0;
  const td = gangTd(); if(td > lastTd){ for(let i = lastTd; i < td; i++) if(act('takedown')) n++; } lastTd = td;
  if(gatesHit > lastGates){ for(let i = lastGates; i < gatesHit; i++) if(act('gate')) n++; } lastGates = gatesHit;
  // flow that rose with nothing heard: an act we have no string for (a set-piece jump's landing, a module's own bonus)
  if(flow > lastFlow && !n && escT > .5) act(airT < 1 ? 'jump' : 'style');   // (heat.js's escape bonus flow lands a beat after the escape itself)
  lastFlow = flow;
  // the timer: when it runs out, the chain banks
  if(chain){ left -= dt; if(left <= 0) bank(false); }
  syncView(); };
function syncView(){ V.on = chain > 0 || V.beat > 0; V.chain = chain; if(chain){ V.mult = mult; V.pend = pend; } V.frac = chain ? Math.max(0, left / win) : 0; V.total = total; V.warnT = chain && left < 1 ? 1 - left : 0; }
// the night ends: a live chain at dawn is banked (generous); a chain broken by the arrest was already lost
S.finish = rec => { if(!st) return; if(chain && rec.end !== 'caught') bank(true);
  rec.style = total; rec.bestChain = st.bestChain; rec.bestBank = st.bestBank; rec.maxMult = st.maxMult; rec.styleBanks = st.banks; rec.chainsLost = st.breaks; };
})();
