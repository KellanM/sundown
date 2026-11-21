/* Sundown mechanic module: the chase director (MECH.heat). See mech/README.md and research/sundown-craft/heat.md.
   Load right after mech/police.js:   <script src="mech/heat.js"></script>

   Kellan, 2026-11-19, after playing the "earn the heat" version: the police should only appear when you hit a car / crash for the
   first time, never because of the style chain. So nothing here starts a chase: the core does, on the first crash (copT = COP_T,
   after 20 s, with ASSIST.police on), exactly as before. There is no heat meter and no link to mech/style.js. What this module keeps
   is the chase itself: it builds over time, and getting away is a celebrated win.

   References studied (rules taken, nothing copied):
   - Need for Speed: Most Wanted (Black Box 2005): a pursuit escalates (more units, roadblocks, the helicopter) and losing them is a
     cooldown you ride out, not an instant. Its known flaw (reviews): new units and roadblocks spawn just as you near the end, so escape
     feels random. Rule taken: nothing new is called in once the pursuit clock is under 3 s, one threat at a time, and a hard end.
   - Hot Pursuit (Criterion 2010): the pursuit grows heavier the longer it runs.
   The chase is kept close to the classic 7-16 s so it never becomes a richer stretch of riding than not crashing.
   - Chase H.Q. / police.md: every threat is announced (police.js's radio crackle and plate, the lunge telegraphs, the helicopter PA).
   Design rules:
   - Stages by time into the chase: 1 one car; 2 (3 s) the backup car; 3 (6 s) a roadblock ahead, never while a lunge is in the
     air; 4 (9 s) the helicopter, never under a tunnel roof. Each only while the clock has more than 3 s on it. police.js's lunges
     follow the stage (level()); its own random roadblock / spike roll at chase start and heli.js's ambient roll stand down.
   - The pursuit clock runs down 1 s a second; while they can see you they give some back (K.hold: 50% at stage 1 .. 65% at stage 4).
     It drains 1.6 s a second in a tunnel; passing a fork drops it 2.5 s; close calls / boosts / pads / slipstreams / dodges cut it
     (the core, skill.js and police.js already do; 65% of each cut counts here, so a single boost never ends a chase before it has
     built); the helicopter's light holds it; after 16 s they give up. Threading the roadblock ends it outright (police.js).
     This module keeps the real clock (F.pc, MECH.heat.clock()) and holds the core's copT at a 6.2 s buffer until the clock is under
     0.6 s: the core cuts copT to .01 and its own dt then ends the chase inside the same update, before any module could answer.
     police.js and heli.js time their lunges and roadblocks on clock().
   - The escape (the chase ends and you are still riding): the big ESCAPED card (police.js, via mech('escaped')),
     a three-note rising chime, the patrol cars peeling off and the helicopter leaving, a modest style act (mech/style.js, 100), a
     bounty in the record. No boost or flow (K.kick off). Control is never taken away. The crash that started the chase already cost
     the chain, flow and speed, and risks the arrest; over whole rides a crash comes out behind (bots: research/sundown-craft/heat.md).
   - Approved rules, all the core's or police.js's, unchanged: the first crash brings the police; a crash during a chase is the
     arrest; the 3 s recov blocks attacks; ASSIST.police off disables police; no police in the first 20 s.
   API: MECH.heat.owns() (a chase is on), .stage() 0..4, .clock() the pursuit clock (s), .escSub() the escape card's sub line,
        .relieve() (a chase that ends right after ends as relieved: no escape bonus), .stats(), ._hold(s) / .debug() (tests).
   Hooks: reset, update, finish (rec.chases, rec.escapes, rec.bounty, rec.heatMax), decoy (mech/crew.js: a crewmate leads the patrol
   car off and sets copT = 0, calling mech('decoy', info)).
   No canvases; no per-frame allocation (the floats live on one fixed-shape object). */
"use strict";
(() => {
const HT = MECH.heat = {};

/* ---------------- tuning ---------------- */
const K = {
  hold:[0, .5, .55, .6, .65],  // per stage: how much of each second they give back while they can see you
  tunnel:.6, fork:2.5,         // extra drain a second in a tunnel; the drop for passing a fork
  buf:6.2, bufAt:.6,           // copT is held at 6.2 while the real clock (pc) is over .6 s
  refund:.35,                  // this share of every instant cut to the clock (close call -1, boost -1.5 a tier, pad, sling, dodge) is given back
  maxT:16,                     // they give up
  st:[0, 0, 3, 6, 9],          // stage n from this many seconds into the chase
  kick:false,                  // a boost kick and flow +1 on escape (off: measured, crashing came out ahead with it on; heat.md)
  callMin:3,                   // nothing new is called in below this much pursuit clock
  // the clean chase (research/sundown-craft/chase_clean.md): ONE escalation per chase, picked at its start, or none; and one thing
  // at a time: a lunge and the escalation never start within K.gap s of each other. one:false brings back all three by stage.
  one:true, esc:[['none', .2], ['backup', .3], ['block', .3], ['heli', .2]], at:{ backup:3, block:4, heli:4.5 }, gap:1.6, force:'',
};

/* ---------------- state ---------------- */
// the floats that change every frame live on one fixed-shape object: V8 updates its double fields in place, where a closure's `let`
// doubles are boxed into a new HeapNumber on every store (72 B a frame before; scratchpad dream_heat/perf.js)
const F = { lastCop:0, pc:0, chaseT:0, retryT:0, beat:9 };
let esc = 'none', didE = false, chase = false, stage = 0, wasCop = false, relieved = false, didB = false, didR = false, didH = false, escStage = 0, pgate = 0, pthr = 0;
let ST = { chases:0, escapes:0, caught:0, relieved:0, bounty:0, maxStage:0, byBlock:0, esc:{ none:0, backup:0, block:0, heli:0 } };
const SUBS = ['', 'HEAT 1', 'HEAT 2', 'HEAT 3', 'HEAT 4'];

const policeOn = () => !(window.ASSIST && ASSIST.police === false);
const P = () => MECH.police;
HT.owns = () => chase;
HT.stage = () => stage;
HT.clock = () => chase ? F.pc : copT;   // police.js and heli.js time their lunges and roadblocks on it
HT.escSub = () => SUBS[chase ? stage : escStage] || '';   // called by police.js from mech('escaped'), before this module sees the chase end
HT.stats = () => ST;
HT.debug = () => ({ pc:F.pc, chase, stage, chaseT:F.chaseT });   // tests (builds an object)
HT._hold = v => { if(chase) F.pc = Math.max(F.pc, v); };          // tests: keep a chase going (strips)
HT.esc = () => chase ? esc : '';   // this chase's one escalation: 'none' | 'backup' | 'block' | 'heli'
HT.calm = () => !K.one || F.beat >= K.gap;   // mech/police.js starts a lunge only when nothing else has just begun
HT.beat = () => { F.beat = 0; };   // mech/police.js: a lunge's warning has begun
HT.relieve = () => { if(chase) relieved = true; };
HT.decoy = () => { HT.relieve(); };   // mech/crew.js: a crewmate led the patrol car off (it sets copT = 0 and calls mech('decoy', info))
HT.K = K;

HT.reset = () => { F.lastCop = 0; F.pc = 0; F.chaseT = 0; F.retryT = 0; chase = false; stage = 0; wasCop = false; relieved = false;
  didB = didR = didH = false; escStage = 0; pgate = typeof gatesHit === 'number' ? gatesHit : 0; const s = P() && P().stats ? P().stats() : null; pthr = s ? s.threaded : 0;
  F.beat = 9; esc = 'none'; didE = false; ST = { chases:0, escapes:0, caught:0, relieved:0, bounty:0, maxStage:0, byBlock:0, esc:{ none:0, backup:0, block:0, heli:0 } }; };

/* ---------------- the update ---------------- */
HT.update = dt => {
  if(state === 'pulled'){ if(chase){ ST.caught++; chase = false; } wasCop = copT > 0; return; }
  if(state !== 'play'){ pgate = gatesHit; return; }
  if(!policeOn()){ chase = false; wasCop = copT > 0; pgate = gatesHit; return; }
  const chased = copT > 0;
  if(chased && !wasCop) begin();   // the core started it: the first crash
  // the core and other modules cut the clock: 65% of each cut counts; gains (police.js holds it while a lunge is in the air, a scrape) count in full
  if(chase && chased && wasCop){ const d = copT - (F.lastCop - dt); F.pc = clamp(F.pc + (d > 0 ? d : d * (1 - K.refund)), .001, COP_T); }
  // a fork passed while they chase you: they lose sight for a moment
  if(gatesHit > pgate){ if(chase && chased && (pgate % 2) === 0 && (!window.isForkZone || isForkZone(pgate / 2))) F.pc = Math.max(.001, F.pc - K.fork); pgate = gatesHit; }
  if(chase && chased) pursue(dt);
  if(wasCop && !chased) ended();
  wasCop = copT > 0; F.lastCop = copT;
};
function lunging(Q){ const c = Q.lead ? Q.lead() : null; return !!(c && (c.ph === 'tele' || c.ph === 'strike' || c.ph === 'over' || c.ph === 'ahead' || c.ph === 'side')); }
function begin(){ chase = true; relieved = false; ST.chases++; stage = 1; F.chaseT = 0; F.retryT = 0; F.beat = 9; F.pc = Math.min(copT, COP_T); didB = didR = didH = false; ST.maxStage = Math.max(ST.maxStage, 1);
  didE = false; esc = K.force || pick(); ST.esc[esc] = (ST.esc[esc] || 0) + 1; }
// with mech/police.js's Subway Surfers pursuer (CL.subway) there is one car behind you, ever: the backup's share goes to 'none'
function pick(){ const sub = !!(MECH.police && MECH.police.CL && MECH.police.CL.subway); let r = Math.random(), i = 0;
  for(; i < K.esc.length - 1; i++){ r -= K.esc[i][1]; if(r < 0) break; } const e = K.esc[i][0]; return sub && e === 'backup' ? 'none' : e; }
function called(){ didE = true; F.beat = 0; }
function pursue(dt){ F.chaseT += dt;
  while(stage < 4 && F.chaseT >= K.st[stage + 1]) stage++;
  if(stage > ST.maxStage) ST.maxStage = stage;
  // call in the next unit, only while the clock has time on it (never as you are about to get away), one threat at a time
  F.retryT -= dt; F.beat += dt;
  if(K.one){ const Q = P();
    if(!didE && esc !== 'none' && F.pc > K.callMin && F.retryT <= 0 && F.chaseT >= K.at[esc] && F.beat >= K.gap && Q && !lunging(Q)){ F.retryT = .5;
      if(esc === 'backup'){ if(Q.backup && Q.backup()) called(); }
      else if(esc === 'block'){ if(Q.placeBlock && !(Q.ahead && Q.ahead()) && Q.placeBlock('chase')) called(); }
      else { const H = MECH.heli; if(H && H.join && H.join()) called(); } } }
  else if(F.pc > K.callMin && F.retryT <= 0){ F.retryT = .5; const Q = P();
    if(stage >= 2 && !didB && Q && Q.backup){ if(Q.backup()) didB = true; }
    else if(stage >= 3 && !didR && Q && Q.placeBlock){ if(!(Q.ahead && Q.ahead()) && !lunging(Q) && Q.placeBlock('chase')) didR = true; }
    else if(stage >= 4 && !didH){ const H = MECH.heli; if(H && H.join && H.join()) didH = true; } }
  // what they can see: some of each second given back while they can, a faster drain in a tunnel, and in the end they give up
  const sg = segAt(position + PZ), tun = !!(sg && sg.tunnel), H = MECH.heli;
  let hold = K.hold[stage] || .7;
  if(H && H.pinned && H.pinned()) hold = 1;
  if(tun) hold = -K.tunnel;
  if(F.chaseT > K.maxT) hold = -2;
  F.pc = clamp(F.pc + (hold - 1) * dt, .001, COP_T);
  copT = F.pc > K.bufAt ? Math.max(F.pc, K.buf) : F.pc; }
function ended(){ // the chase is over and you are still riding: you got away (or a crewmate drew them off)
  if(!chase) return;
  chase = false; escStage = stage;
  const Q = P(), s = Q && Q.stats ? Q.stats() : null; if(s && s.threaded > pthr) ST.byBlock++; if(s) pthr = s.threaded;
  if(relieved || state !== 'play' || !policeOn()){ if(relieved) ST.relieved++; relieved = false; return; }
  ST.escapes++; ST.bounty += 50 * stage;
  // no profit on purpose: the crash that brought the chase cost the chain, flow and 70% of your speed, and the chase itself already pays
  // its dodges and roadblock runs in mech/style.js; with a boost kick here a crash came out ahead in matched-window bots (heat.md)
  if(K.kick){ flow += 1; bestFlow = Math.max(bestFlow, flow); if(boostT <= 0) boostTier = 1; boostT = Math.max(boostT, .9); if(typeof hud === 'function') hud(); }
  chime(); }
function chime(){ if(typeof M === 'undefined' || !M.ac) return; try{ const t = M.ac.currentTime; if(K.kick) M.boost(1, flow);
    M.tone(659, .16, { type:'triangle', v:.03, at:t + .05 }); M.tone(880, .16, { type:'triangle', v:.03, at:t + .15 }); M.tone(1319, .34, { type:'triangle', v:.028, at:t + .25 }); }catch(e){} }

HT.finish = rec => { rec.chases = ST.chases; rec.escapes = ST.escapes; rec.bounty = ST.bounty; rec.heatMax = ST.maxStage; };
})();
