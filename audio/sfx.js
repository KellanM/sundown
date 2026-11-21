/* Sundown sound effects: window.SFX (the kit, the bus, named sounds) and MECH.sfx (the hooks that watch the ride).
   Load after the mech/ and setpiece/ modules (it reads their state), before the game script:
     <script src="audio/sfx.js"></script>
   Everything is synthesised (no samples) from one kit: oscillators, two noise buffers, biquads, one tanh shaper, one convolver.

   Bus:   voice gain -> StereoPanner -> SFX bus -+-> dry ------------------------+-> compressor -> trim -> M.vol (the volume setting)
                                                 +-> convolver (tunnel) -> wet ---+
   The SFX bus does not pass through M.out (the music, which mech/director.js ducks for cinematics), so the music and the
   effects never fight over one gain stage, and a soundtrack module can own M.out freely.
   Pause-safe: everything runs on M.ac, which the pause menu suspends. UI sounds (SFX.ui) use their own tiny context, so the
   pause menu can still tick while the game context is suspended.

   API
     SFX.play(name, opts)         one-shot. opts: { pan -1..1, k 0..1 intensity, lead s (time to the peak), tier, flow, side, truck, clean, at }
     SFX.drive(P, dt)             per-frame loop parameters (engine, wind, squeal, grind, siren, rival engines, tunnel); no allocation
     SFX.attach(ac, dest)         build the graph on a context (the game does this itself on the first frame with M.ac; tests pass an OfflineAudioContext)
     SFX.ui('move' | 'ok' | 'back' | 'equip' | 'deny')   (the last two for the garage: an item put on; a locked one)
     SFX.stats                    voices playing now, the peak, plays / drops / steals per sound
   Rules per sound (RULE): max voices (the oldest is stolen, with a 12 ms fade), cooldown, random detune, level in dB.
   A repeat within 1.5 s comes back about 1 dB softer (x0.89 each, floor 0.55), so a run of close calls never stacks into noise.

   Takeover: on warm(), MECH.sfx replaces M.close / M.crash / M.scrape / M.slick with these sounds and disconnects the core's
   engine, wind, skid and siren loops from M.out (they keep running silently). The patch lines in research/sundown-sfx.md
   remove them from the core properly; once that lands, the takeover finds nothing to replace and does nothing. */
(function(){
'use strict';
const SFX = window.SFX = { stats:{ now:0, peak:0, live:0, plays:{}, drops:{}, steals:{} }, takeover:true };
let ac = null, bus, blp, blpF = 20000, dry, wet, conv, comp, trim, lim, ltrim, NB = null, NB2 = null, BR = null, SH = null, live = false;
const mf = m => 440 * Math.pow(2, (m - 69) / 12), db = d => Math.pow(10, d / 20), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }, rr = (a, b) => a + rnd() * (b - a);

/* ------------------------------------------------------------------ rules: voices, cooldown (s), detune (cents), level (dB) */
const RULE = {
  whoosh:  { max:3, cd:.04, cents:80,  db:-17 },
  stinger: { max:2, cd:.06, cents:0,   db:-19 },
  horn:    { max:1, cd:4,   cents:30,  db:-29 },
  airbrake:{ max:1, cd:8,   cents:60,  db:-28 },
  boost:   { max:2, cd:.12, cents:20,  db:-16 },
  pad:     { max:2, cd:.1,  cents:40,  db:-18 },
  slick:   { max:1, cd:.3,  cents:60,  db:-20 },
  clank:   { max:2, cd:.25, cents:100, db:-22 },
  crash:   { max:2, cd:.15, cents:40,  db:-15 },
  takedown:{ max:2, cd:.15, cents:60,  db:-17 },
  kick:    { max:2, cd:.08, cents:80,  db:-13 },
  kickHit: { max:2, cd:.06, cents:60,  db:-19 },
  takeoff: { max:1, cd:.5,  cents:40,  db:-17 },
  land:    { max:1, cd:.4,  cents:30,  db:-16 },
  gate:    { max:1, cd:.3,  cents:30,  db:-24 },
  fork:    { max:1, cd:.3,  cents:0,   db:-20 },
  pop:     { max:3, cd:.035,cents:250, db:-31 },
  spark:   { max:3, cd:.05, cents:300, db:-31 }
};
const LOOPDB = { eng:-40, wind:-41, squeal:-26, grind:-27, siren:-35, rival:-33, veh:-33 };
const SLOTS = {};
for(const k in RULE){ const r = RULE[k]; r.last = -9; r.rep = 0; r.repT = -9; SLOTS[k] = []; for(let i = 0; i < r.max; i++) SLOTS[k].push({ end:0, start:0, g:null }); SFX.stats.plays[k] = 0; SFX.stats.drops[k] = 0; SFX.stats.steals[k] = 0; }

/* ------------------------------------------------------------------ the kit */
function G(v){ const g = ac.createGain(); g.gain.value = v; return g; }
function F(type, f, q){ const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if(q != null) b.Q.value = q; return b; }
function O(type, f, at, end){ const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at); o.start(at); o.stop(end + .02); return o; }
function N(buf, at, end, rate){ const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; if(rate) s.playbackRate.value = rate; s.start(at, rnd() * 1.5); s.stop(end + .02); return s; }
function ch(){ for(let i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }
// amplitude envelope: 0 -> peak (linear attack), hold, exponential decay, then a 10 ms linear ramp to true zero (never ends on a step)
function env(p, at, a, hold, d, peak){ p.setValueAtTime(0, at); p.linearRampToValueAtTime(peak, at + a); if(hold) p.setValueAtTime(peak, at + a + hold);
  p.exponentialRampToValueAtTime(Math.max(1e-5, peak * .001), at + a + hold + d); p.linearRampToValueAtTime(0, at + a + hold + d + .01); return a + hold + d + .01; }
// a percussive partial: one oscillator through its own envelope
function ping(dest, type, f, at, d, lvl, f1){ const o = O(type, f, at, at + d + .02), g = G(0); if(f1) o.frequency.exponentialRampToValueAtTime(f1, at + d); env(g.gain, at, .002, 0, d, lvl); ch(o, g, dest); }
// a noise burst: buffer -> filter -> envelope
function burst(dest, buf, type, f, q, at, a, hold, d, lvl, f1, ft){ const end = at + a + hold + d + .01, s = N(buf, at, end), fl = F(type, f, q), g = G(0);
  if(f1){ fl.frequency.setValueAtTime(f, at); fl.frequency.exponentialRampToValueAtTime(f1, at + (ft || a + hold + d)); } env(g.gain, at, a, hold, d, lvl); ch(s, fl, g, dest); return end - at; }
function ladder(){ try{ if(typeof M !== 'undefined' && M.cur && M.ladder) return M.ladder(); }catch(e){}
  const o = []; for(let k = 0; k < 4; k++) [64, 69, 72].forEach(m => o.push(m + 12 * k)); return o; }   // fallback: A minor (tests, the title)

/* ------------------------------------------------------------------ one-shot recipes: (at, o, out) -> length in seconds. o.d = the random detune factor */
const REC = {
  /* a car going by. The noise band rises to the pass and falls after it; the car's hum drops by the Doppler ratio at the pass; the pan
     slides from ahead-of-you toward the side it passes on, then eases back as it falls behind. k (closeness) sets level and brightness. */
  whoosh(at, o, out, pn){ const k = o.k, lead = clamp(o.lead == null ? .1 : o.lead, .02, .3), pk = at + lead, end = pk + .42, side = o.pan || 0, dop = 1.1 + .06 * k;
    const s = N(NB, at, end), bp = F('bandpass', 800 * o.d, 1.1), g = G(0);
    bp.frequency.setValueAtTime(800 * o.d, at); bp.frequency.exponentialRampToValueAtTime((2200 + 1600 * k) * o.d, pk); bp.frequency.exponentialRampToValueAtTime(600, pk + .32);
    g.gain.setValueAtTime(.002, at); g.gain.exponentialRampToValueAtTime(.2, at + lead * .6); g.gain.exponentialRampToValueAtTime(1, pk); g.gain.exponentialRampToValueAtTime(.002, end - .01); g.gain.linearRampToValueAtTime(0, end);
    ch(s, bp, g, out);
    // the passing car's engine and tyres: a low hum dropping through the Doppler ratio, heard most on trucks
    const f0 = (o.truck ? 58 : 92) * o.d, h = O('sawtooth', f0 * dop, at, end), lp = F('lowpass', 420 + 380 * k, .7), hg = G(0);
    h.frequency.setValueAtTime(f0 * dop, Math.max(at, pk - .05)); h.frequency.exponentialRampToValueAtTime(f0 / dop, pk + .08);
    hg.gain.setValueAtTime(.001, at); hg.gain.exponentialRampToValueAtTime(o.truck ? .55 : .4, pk); hg.gain.exponentialRampToValueAtTime(.001, end - .01); hg.gain.linearRampToValueAtTime(0, end);
    ch(h, lp, hg, out);
    if(o.truck){ const t = N(BR, at, end), tl = F('bandpass', 260, .8), tg = G(0); tg.gain.setValueAtTime(.002, at); tg.gain.exponentialRampToValueAtTime(.8, pk); tg.gain.exponentialRampToValueAtTime(.002, end - .01); tg.gain.linearRampToValueAtTime(0, end); ch(t, tl, tg, out); }
    pn.pan.setValueAtTime(side * .3, at); pn.pan.linearRampToValueAtTime(side * .9, pk + .05); pn.pan.linearRampToValueAtTime(side * .55, end);
    return end - at; },
  /* the near-miss stinger: a bright struck note from the music's current chord, stepping up the chord ladder with the combo;
     the combo adds notes (arrangement), not level. A razor-close pass adds a high "shing". */
  stinger(at, o, out){ const L = ladder(), n = Math.max(1, o.flow || 1), i0 = clamp(2 + Math.min(n, 6), 0, L.length - 3), notes = n >= 6 ? 3 : n >= 3 ? 2 : 1;
    const bell = (m, t, lv) => { const f = mf(m); ping(out, 'triangle', f, t, .34, lv); ping(out, 'sine', f * 2.003, t, .2, lv * .32); ping(out, 'sine', f * 4.07, t, .07, lv * .1); };
    for(let i = 0; i < notes; i++) bell(L[i0 + i], at + i * .065, (i ? .55 : 1) / Math.sqrt(notes));   // more notes, not more level
    if(o.k > .6) burst(out, NB, 'highpass', 6500, .7, at, .002, 0, .05, .35);
    return .34 + (notes - 1) * .065 + .02; },
  /* a Japanese car horn is a two-tone electric pair (~400 and ~500 Hz); a truck's air horn is a lower, longer chord.
     It sounds after you've passed it, so it is already Doppler-shifted down and behind you. */
  horn(at, o, out, pn){ const fd = o.d / 1.08, side = o.pan || 1; pn.pan.value = side * .7;
    const sh = ac.createWaveShaper(); sh.curve = SH; const lp = F('lowpass', 2000, .7), g = G(0); ch(sh, lp, g, out);
    if(o.truck){ [233, 294, 349].forEach(f => ch(O('sawtooth', f * fd, at, at + .72), sh)); env(g.gain, at, .03, .45, .2, .5); return .7; }
    [410, 516].forEach(f => ch(O('square', f * fd, at, at + .3), sh)); env(g.gain, at, .008, .17, .07, .5);
    if(o.twice){ const g2 = G(0); ch(g2, out); [410, 516].forEach(f => { const s2 = O('square', f * fd * .99, at + .34, at + .52); const s3 = ac.createWaveShaper(); s3.curve = SH; ch(s2, s3, g2); }); env(g2.gain, at + .34, .008, .08, .06, .4); return .52; }
    return .3; },
  // a truck's air brake: a short brake squeal, then the "pssht" of air
  airbrake(at, o, out, pn){ pn.pan.value = (o.pan || 0) * .7; ping(out, 'sine', 1240 * o.d, at, .16, .12, 1170 * o.d);
    burst(out, NB, 'bandpass', 5200, .6, at + .12, .004, .06, .5, .7, 3200);
    burst(out, BR, 'lowpass', 400, .7, at + .12, .004, 0, .1, .4);
    return .8; },
  /* boost ignition per tier: tier 1 an intake whump and a rising exhaust rasp; tier 2 adds a rising whoosh; tier 3 ("Thunder")
     adds a double crack and a rolling rumble with crackle. The level barely changes between tiers: width and length do. */
  boost(at, o, out){ const t = o.tier || 1;
    burst(out, BR, 'bandpass', 450, 1.2, at, .012, 0, .34, 1, 1500, .25);
    const r = O('sawtooth', 110 * o.d, at, at + .5), sh = ac.createWaveShaper(), lp = F('lowpass', 1300, .8), g = G(0); sh.curve = SH;
    r.frequency.exponentialRampToValueAtTime((190 + 25 * t) * o.d, at + .3); env(g.gain, at, .02, .08, .32, .35); ch(r, sh, lp, g, out);
    let len = .5;
    if(t >= 2){ burst(out, NB, 'bandpass', 600, 1.4, at, .22, 0, .3, .5, 3600, .45); len = .6; }
    if(t >= 3){ const c = at + .05;
      burst(out, NB, 'highpass', 1400, .7, c, .001, 0, .06, 1); burst(out, NB, 'highpass', 900, .7, c + .045, .001, 0, .05, .55);
      const ru = N(BR, c, c + 1.7), hp = F('highpass', 70, .7), rl = F('lowpass', 200, .7), rg = G(0), am = G(.55), l1 = O('sine', 5.3, c, c + 1.7), l2 = O('sine', 8.9, c, c + 1.7), ld = G(.22);
      env(rg.gain, c, .02, .05, 1.3, .6); ch(l1, ld); ch(l2, ld); ld.connect(am.gain); ch(ru, hp, rl, am, rg, out);
      for(let i = 0; i < 7; i++) burst(out, NB, 'bandpass', rr(2200, 4200), 1.2, c + .08 + rr(0, .55), .001, 0, .012, rr(.15, .35));
      len = 1.8; }
    return len; },
  // the boost pad: an electric zap falling 2.4k -> 260 Hz, a mains buzz, a tick, then a rising "thwip" forward
  pad(at, o, out){ const z = O('square', 2400 * o.d, at, at + .2), bp = F('bandpass', 1500, .7), g = G(0); z.frequency.exponentialRampToValueAtTime(260 * o.d, at + .14); env(g.gain, at, .002, 0, .16, .55); ch(z, bp, g, out);
    const hp = F('highpass', 300, .7), bg = G(0); ch(O('sawtooth', 120, at, at + .2), hp); ch(O('sawtooth', 181, at, at + .2), hp); env(bg.gain, at, .002, .04, .11, .22); ch(hp, bg, out);
    burst(out, NB, 'highpass', 5000, .7, at, .001, 0, .02, .5);
    ping(out, 'sine', 500 * o.d, at + .06, .14, .25, 2000 * o.d);
    burst(out, NB, 'bandpass', 700, 1.2, at + .02, .12, 0, .3, .6, 3200, .35);   // the rush of air as the pad throws you forward
    return .45; },
  // the oil slick: a wet "shlick", then a wobbling tyre squeal that slides off to the side you slide
  slick(at, o, out, pn){ pn.pan.setValueAtTime(0, at); pn.pan.linearRampToValueAtTime((o.pan || 0) * .5, at + .8);
    burst(out, NB, 'bandpass', 1500, 2, at, .005, 0, .3, .8, 480);
    const sq = O('triangle', 1500 * o.d, at + .04, at + .95), lfo = O('sine', 11, at, at + .95), dep = G(90), g = G(0);
    sq.frequency.exponentialRampToValueAtTime(1080 * o.d, at + .9); ch(lfo, dep); dep.connect(sq.detune); env(g.gain, at + .04, .03, .3, .5, .3); ch(sq, g, out);
    return .96; },
  // the first hit on a guardrail: a struck steel rail (inharmonic partials) and a tick. The grind itself is a loop.
  clank(at, o, out, pn){ pn.pan.value = (o.pan || 0) * .8; [[520, .26, .5], [1340, .18, .35], [2210, .12, .25], [3470, .08, .18]].forEach(p => ping(out, 'sine', p[0] * o.d, at, p[1], p[2]));
    burst(out, NB, 'highpass', 3000, .7, at, .001, 0, .015, .6); return .28; },
  /* a crash into a car: a body thud, a crunch of inharmonic square partials, a few glass ticks, then the tumble scrape.
     takedown (a rival goes down) is the same family, panned to their side, with bike clanks bouncing away. */
  crash(at, o, out, pn){ pn.pan.value = (o.pan || 0) * .4;
    ping(out, 'sine', 150, at, .3, .8, 58); burst(out, BR, 'bandpass', 450, .6, at, .002, 0, .3, 1.1);
    const sh = ac.createWaveShaper(), bp = F('bandpass', 1800, .5), g = G(0); sh.curve = SH; [233, 377, 611, 989, 1597, 2584].forEach(f => ch(O('square', f * o.d * rr(.97, 1.03), at, at + .26), sh)); env(g.gain, at, .002, 0, .22, .16); ch(sh, bp, g, out);
    for(let i = 0; i < 6; i++) ping(out, 'sine', rr(3000, 7000), at + .02 + rr(0, .35), .06, .07);
    const s = N(NB, at + .08, at + .9), sb = F('bandpass', 2200, 1.5), sg = G(0), am = G(.6), l = O('square', 13, at, at + .9), ld = G(.35); env(sg.gain, at + .08, .05, .2, .5, .4); ch(l, ld); ld.connect(am.gain); ch(s, sb, am, sg, out);
    return .92; },
  takedown(at, o, out, pn){ const side = o.pan || 0; pn.pan.setValueAtTime(side * .5, at); pn.pan.linearRampToValueAtTime(side * .95, at + 1.1);
    ping(out, 'sine', 140, at, .28, .7, 58); burst(out, BR, 'bandpass', 500, .6, at, .002, 0, .28, 1);
    const sh = ac.createWaveShaper(), bp = F('bandpass', 1600, .5), g = G(0); sh.curve = SH; [211, 347, 563, 919, 1489].forEach(f => ch(O('square', f * o.d * rr(.97, 1.03), at, at + .24), sh)); env(g.gain, at, .002, 0, .2, .15); ch(sh, bp, g, out);
    [[.2, .7], [.45, .45], [.75, .28]].forEach(c => { [610, 1530, 2470].forEach((f, i) => ping(out, 'sine', f * rr(.95, 1.05), at + c[0], .14 - i * .03, c[1] * (.45 - i * .1))); });
    burst(out, NB, 'bandpass', 2600, 1.4, at + .1, .04, .4, .6, .35);
    return 1.15; },
  // your kick: the swing (a short rising whoosh); kickHit: boot on bike, a thud with a leather slap. o.heavy = you got kicked.
  kick(at, o, out, pn){ pn.pan.value = (o.pan || 0) * .5; return burst(out, NB, 'bandpass', 700 * o.d, 1.5, at, .04, 0, .1, .9, 2800 * o.d, .12); },
  kickHit(at, o, out, pn){ pn.pan.value = (o.pan || 0) * .6; const h = o.heavy ? .8 : 1;
    ping(out, 'sine', 170 * h * o.d, at, .14, .8, 75); burst(out, BR, 'bandpass', 520 * h, .7, at, .001, 0, .09, 1); burst(out, NB, 'bandpass', 1800 * h, 2, at, .001, 0, .025, .55);
    if(o.heavy) ping(out, 'triangle', 1700, at + .03, .12, .12, 1450);
    return .2; },
  // a jump: takeoff is a rising whoosh (the engine free-revs in the loop); land is a thump, a suspension clank and a tyre chirp.
  // A clean landing adds a second, deeper body hit, a crackle of sparks and a struck chord (arrangement, not level).
  takeoff(at, o, out){ return burst(out, NB, 'bandpass', 450, 1, at, .16, 0, .38, .8, 2300, .4); },
  land(at, o, out){ ping(out, 'sine', 150, at, .3, .8, 60); burst(out, BR, 'bandpass', 280, .7, at, .002, 0, .26, 1); ping(out, 'triangle', 240 * o.d, at, .1, .35, 170);
    ping(out, 'sine', 880 * o.d, at + .01, .12, .25); ping(out, 'sine', 1460 * o.d, at + .01, .09, .15); ping(out, 'triangle', 1900, at + .015, .07, .18, 1700);
    if(!o.clean) return .36;
    ping(out, 'sine', 95, at + .03, .45, .5, 50); burst(out, BR, 'bandpass', 420, .8, at + .03, .002, 0, .3, .7); burst(out, NB, 'highpass', 1200, .7, at, .001, 0, .05, .7);
    for(let i = 0; i < 6; i++) burst(out, NB, 'bandpass', rr(2500, 4500), 1.2, at + .04 + rr(0, .4), .001, 0, .012, .25);
    const L = ladder(); [0, 1, 2].forEach(i => ping(out, 'triangle', mf(L[4 + i]), at + .06 + i * .03, .9, .16));
    return 1; },
  // under the checkpoint gantry: a short air "vwoom" and a low thrum (the core's M.gate plays the chime)
  gate(at, o, out){ burst(out, NB, 'bandpass', 1300, .8, at, .03, 0, .25, .7, 700); ping(out, 'sine', 170, at, .2, .35); return .3; },
  // choosing a fork: two quick rising blips from the chord, on the side you chose
  fork(at, o, out, pn){ pn.pan.value = (o.side || 0) * .6; const L = ladder(), lp = F('lowpass', 2600, .7); ch(lp, out);
    ping(lp, 'square', mf(L[5]), at, .09, .3); ping(lp, 'square', mf(L[7]), at + .055, .12, .3); return .19; },
  // exhaust crackle on a gear change or a lifted throttle
  pop(at, o, out, pn){ pn.pan.value = rr(-.15, .15); burst(out, NB, 'bandpass', rr(800, 1700), 1.2, at, .001, 0, .025, .9); ping(out, 'sine', 160 * o.d, at, .035, .5); return .05; },
  // one spark off the guardrail
  spark(at, o, out, pn){ pn.pan.value = (o.pan || 0) * .8; burst(out, NB, 'highpass', 4500, .7, at, .001, 0, .012, .7); ping(out, 'sine', rr(3000, 5200), at, .02, .25); return .04; }
};

/* ------------------------------------------------------------------ play: cooldown, voice limit (steal the oldest), repeat softening */
SFX.play = function(name, o){ if(!live || SFX.noShots) return false; const r = RULE[name], rec = REC[name]; if(!r || !rec) return false;
  o = o || {}; const at = o.at != null ? o.at : ac.currentTime;
  if(at < r.last + r.cd){ SFX.stats.drops[name]++; return false; }
  const sl = SLOTS[name]; let s = null; for(let i = 0; i < sl.length; i++) if(sl[i].end <= at){ s = sl[i]; break; }
  if(!s){ s = sl[0]; for(let i = 1; i < sl.length; i++) if(sl[i].start < s.start) s = sl[i];   // steal the oldest, with a 12 ms fade
    try{ s.g.gain.cancelScheduledValues(at); s.g.gain.setTargetAtTime(0, at, .012); }catch(e){} SFX.stats.steals[name]++; }
  r.rep = at - r.repT < 1.5 ? r.rep + 1 : 0; r.repT = at; r.last = at;
  const k = o.k == null ? 1 : o.k, lvl = db(r.db) * Math.max(.55, Math.pow(.89, r.rep)) * (name === 'whoosh' ? .3 + .7 * Math.pow(k, 1.3) : 1);
  o.d = r.cents ? Math.pow(2, rr(-r.cents, r.cents) / 1200) : 1; o.k = k;
  const g = G(lvl), pn = ac.createStereoPanner(); pn.pan.value = clamp(o.pan || 0, -1, 1) * .5; ch(g, pn, bus);
  let len = .5; try{ len = rec(at, o, g, pn); }catch(e){ console.error('sfx', name, e); }
  /* free the voice when it is done: a silent marker source ends just after the sound's tail and disconnects the voice's gain and panner.
     Without this every one-shot stayed wired to the bus for the rest of the session (measured: render cost grew with each play). */
  if(ac.createConstantSource){ const z = ac.createConstantSource(); z.offset.value = 0; z.connect(g); z.start(at); z.stop(at + len + .15); z.onended = () => { SFX.stats.live--; try{ z.disconnect(); g.disconnect(); pn.disconnect(); }catch(e){} }; SFX.stats.live++; }
  s.start = at; s.end = at + len; s.g = g; SFX.stats.plays[name]++;
  const n = SFX.active(at); SFX.stats.now = n; if(n > SFX.stats.peak) SFX.stats.peak = n;
  return true; };

/* ------------------------------------------------------------------ loops: built once, driven every frame by SFX.drive */
let E = null, revOn = false, revT = 0;   // engine; whether the tunnel reverb is wired in
const LP = {};  // the other loops
function buildLoops(){
  /* the player's bike: an air-cooled inline-four 400 with a straight pipe (the Kawasaki Z400FX / Honda CBX400F the bosozoku
     rode). Firing rate = rpm / 30. Saw at the firing rate + a square at half (the crank's unevenness), plus exhaust rasp:
     noise amplitude-modulated by the firing saw. Through a tanh shaper and a lowpass that opens with rpm and throttle. */
  const t = ac.currentTime;
  E = { a:O('sawtooth', 150, t, 1e9), b:O('square', 75, t, 1e9), raspS:N(NB, t, 1e9), sum:G(1), bG:G(.32), raspF:F('bandpass', 600, .9), raspG:G(.0), am:G(.35), sh:ac.createWaveShaper(),
    lp:F('lowpass', 900, .9), hp:F('highpass', 115, .7), pk1:F('peaking', 460, 1), pk2:F('peaking', 1600, 1.2), out:G(0), pn:ac.createStereoPanner(),
    gear:1, rev:0, dip:0, slw:1, lt:0, acc:0, popT:0, prevThr:1, prevTier:0, rpm:1200, lope:0, lopeT:0, bOn:false, bT:0, bLen:0, bTier:0, bShift:false, bDrop:0 };
  /* presence against the music: the highpass keeps it out of the 808 / sub band, and two peaks put its identity where nothing in the
     soundtrack sits for long: the exhaust growl (~460 Hz) and the intake rasp (~1.6 kHz) */
  E.pk1.gain.value = 6; E.pk2.gain.value = 5;
  E.sh.curve = SH; ch(E.a, E.sum); ch(E.b, E.bG, E.sum); ch(E.raspS, E.raspF, E.raspG, E.sum); ch(E.a, E.am); E.am.connect(E.raspG.gain); ch(E.sum, E.sh, E.lp, E.hp, E.pk1, E.pk2, E.out, E.pn, bus);
  // wind: decorrelated stereo noise, band rising with speed, a slow random gust
  LP.wind = { s:N(NB2, t, 1e9), hp:F('highpass', 180, .7), bp:F('lowpass', 800, .6), g:G(0), gust:0, gT:0, gTo:0 }; ch(LP.wind.s, LP.wind.hp, LP.wind.bp, LP.wind.g, bus);
  // tyre squeal while leaning a drift: two narrow noise bands plus a faint tone, each wobbling a little
  LP.sq = { s:N(NB, t, 1e9), b1:F('bandpass', 1650, 14), b2:F('bandpass', 2450, 18), o:O('triangle', 1900, t, 1e9), og:G(.05), g:G(0), pn:ac.createStereoPanner(), ph:0 };
  ch(LP.sq.s, LP.sq.b1, LP.sq.g); ch(LP.sq.s, LP.sq.b2, LP.sq.g); ch(LP.sq.o, LP.sq.og, LP.sq.g); ch(LP.sq.g, LP.sq.pn);
  // guardrail grind: a noise band and three inharmonic saws (steel on steel), gated with jitter; sparks are one-shots
  LP.gr = { s:N(NB, t, 1e9), bp:F('bandpass', 3200, 3), mt:G(.05), mbp:F('bandpass', 2200, 1.2), g:G(0), pn:ac.createStereoPanner(), sparkT:0, was:false };
  ch(LP.gr.s, LP.gr.bp, LP.gr.g); [1180, 1730, 2650].forEach(f => ch(O('sawtooth', f, t, 1e9), LP.gr.mt)); ch(LP.gr.mt, LP.gr.mbp, LP.gr.g); ch(LP.gr.g, LP.gr.pn);
  /* the patrol car's siren: the Japanese police wail (a slow rise and fall, not the European hi-lo), Doppler-shifted as it closes
     or drops back, muffled by distance, panned to its side */
  LP.si = { o1:O('triangle', 600, t, 1e9), o2:O('square', 600, t, 1e9), o2g:G(.18), lp:F('lowpass', 1500, .7), g:G(0), pn:ac.createStereoPanner(), ph:0, prev:0, dop:1,
    o3:O('sawtooth', 85, t, 1e9), o3g:G(.5), lp3:F('lowpass', 500, .8) };   // o3: the patrol car's own engine (a Crown's V8 burble), Doppler-shifted with the siren
  ch(LP.si.o1, LP.si.lp); ch(LP.si.o2, LP.si.o2g, LP.si.lp); ch(LP.si.o3, LP.si.lp3, LP.si.o3g, LP.si.g); ch(LP.si.lp, LP.si.g, LP.si.pn);
  /* two gang rivals: two-strokes (RZ350 ring-ding), so they read apart from your four-stroke. Square + saw an octave up, a nasal band. */
  LP.rv = [0, 1].map(() => { const r = { a:O('square', 120, t, 1e9), b:O('sawtooth', 240, t, 1e9), bg:G(.5), bp:F('bandpass', 1300, .8), sh:ac.createWaveShaper(), lp:F('lowpass', 3000, .7), g:G(0), pn:ac.createStereoPanner() };
    r.sh.curve = SH; ch(r.a, r.bp); ch(r.b, r.bg, r.bp); ch(r.bp, r.sh, r.lp, r.g, r.pn); return r; });
  /* traffic pass-bys: a pool of four vehicle voices, given to the nearest cars and trucks. Each is an engine (a saw at the firing
     rate and a square an octave down), a tyre roar (noise through a band that rises with road speed) and, for trucks, air (hiss),
     through a soft shaper, a lowpass that opens as it closes, a gain by distance and a panner by bearing. Pitch is the true Doppler
     ratio from the closing speed (SFX.geom), so it rises as a vehicle approaches and drops as it goes away, in either direction. */
  LP.vh = [0, 1, 2, 3].map(() => { const v = { a:O('sawtooth', 90, t, 1e9), b:O('square', 45, t, 1e9), bG:G(.4), eg:G(.6), nz:N(NB, t, 1e9), nb:F('bandpass', 900, .8), ng:G(.5),
      af:F('highpass', 3500, .7), ag:G(0), sum:G(1), sh:ac.createWaveShaper(), lp:F('lowpass', 1500, .7), g:G(0), pn:ac.createStereoPanner(), fresh:true };
    v.sh.curve = SH; ch(v.a, v.eg); ch(v.b, v.bG, v.eg); ch(v.eg, v.sum); ch(v.nz, v.nb, v.ng, v.sum); ch(v.nz, v.af, v.ag, v.sum); ch(v.sum, v.sh, v.lp, v.g, v.pn); return v; });
}
// loops that are mostly silent (squeal, grind, siren, rivals) are wired to the bus only while sounding: Chrome pulls audio from the
// destination, so a disconnected subgraph costs nothing. Unwired 0.6 s after their gain target reaches zero.
function wire(L, want, dt){ if(want){ L.offT = .6; if(!L.wired){ L.wired = true; L.pn.connect(bus); } } else if(L.wired && (L.offT -= dt) <= 0){ L.wired = false; try{ L.pn.disconnect(bus); }catch(e){} } }
// the gearbox: six gears across the speed range; within a gear rpm runs 4,200 -> 11,000, so every upshift drops it and burbles
const GEARS = [0, .2, .36, .52, .68, .84, 1];
SFX.solo = null;   // tests: 'eng' | 'wind' | 'squeal' | 'grind' | 'siren' | 'rival' mutes the other loops
const lv = k => SFX.solo && SFX.solo.split(',').indexOf(k) < 0 ? 0 : db(LOOPDB[k]);   // SFX.solo may list several: 'veh,rival'
SFX.drive = function(P, dt){ if(!live || !E) return; const t = ac.currentTime, on = P.on, sp = Math.max(0, P.sp);
  const rdt = clamp(t - E.lt, 0, .1), slT = clamp(P.slow == null ? 1 : P.slow, 0, 1); E.lt = t; E.slw += (slT - E.slw) * (1 - Math.exp(-rdt / (slT < E.slw ? .05 : .25)));
  // engine
  let up = false; while(E.gear < 6 && sp > GEARS[E.gear]){ E.gear++; up = true; } while(E.gear > 1 && sp < GEARS[E.gear - 1] - .04) E.gear--;
  if(up && on && sp > .1){ E.dip = .07; E.acc = Math.max(E.acc, .8); SFX.play('pop', { at:t + .03 }); SFX.play('pop', { at:t + .09 }); }
  const lo = GEARS[E.gear - 1], pos = clamp((sp - lo) / (GEARS[E.gear] - lo), 0, 1);
  // drift: each tier the lean charges revs the engine (the old core engine did this through M.rev; players heard it as "the revving")
  const tierNow = P.drift ? P.tier : 0; if(on && tierNow > E.prevTier) SFX.blip(.45 + .15 * tierNow); E.prevTier = tierNow;
  // lifting off (crash, off-road, pulled over): a burst of crackle, then the decel crackle below; throttle back on: an accent
  if(on && P.thr < .5 && E.prevThr >= .5 && sp > .2){ for(let i = 0; i < 4; i++) SFX.play('pop', { at:t + .02 + i * .07 + rr(0, .03) }); }
  if(on && P.thr >= .5 && E.prevThr < .5) E.acc = Math.max(E.acc, 1); E.prevThr = P.thr;
  E.rev *= Math.exp(-3.5 * dt); E.dip = Math.max(0, E.dip - dt); E.acc *= Math.exp(-5 * dt);
  // idle lope (straight-piped fours idle lumpy) and the cruise: a little rpm wander so a held speed is not one frozen pitch
  if((E.lopeT -= dt) <= 0){ E.lopeT = sp < .04 ? rr(.18, .4) : rr(.5, 1.4); E.lope = sp < .04 ? rr(-.04, .09) : rr(-.012, .02); }
  /* the boost: wide-open throttle. The rpm climbs (~150 ms) to a band held for the boost's length: tier 1 a strong pull (10,800),
     tier 2 near the redline (12,100), Thunder on the redline with the limiter bouncing it (a 14 Hz stutter). A boost longer than ~1 s
     snaps one upshift at 0.55 s (rpm drops 2,600 and climbs back, with a pop). When it ends: lift-off crackle and the rpm settles. */
  const bNow = on && (P.boost || 0) > 0, bTier = P.btier || 1;
  if(bNow && (!E.bOn || bTier > E.bTier)){ if(!E.bOn){ E.bT = 0; E.bLen = P.boost; E.bShift = false; } E.bTier = bTier; E.acc = Math.max(E.acc, 1); }
  if(!bNow && E.bOn && on && sp > .2){ for(let i = 0; i < 5; i++) SFX.play('pop', { at:t + .03 + i * .065 + rr(0, .03) }); }
  E.bOn = bNow; if(bNow){ E.bT += dt; if(!E.bShift && E.bLen > 1 && E.bT > .55){ E.bShift = true; E.bDrop = 1; E.dip = .06; SFX.play('pop', { at:t + .02 }); } }
  E.bDrop *= Math.exp(-9 * dt);
  const bounce = bNow && E.bTier >= 3 && Math.floor(E.bT * 14) % 2 === 1, bRpm = bNow ? [0, 10800, 12100, 12800][Math.min(3, E.bTier)] - 2600 * E.bDrop - (bounce ? 700 : 0) : 0;
  let rpm = sp < .04 ? 1250 : 4200 + pos * 6800; if(bRpm > rpm) rpm = bRpm; rpm += E.rev * 5200 + (P.air ? 1800 : 0) + (P.drift && sp > .4 ? 700 + 250 * P.tier : 0); rpm *= (1 + (bNow ? E.lope * .3 : E.lope)) * (.7 + .3 * E.slw); rpm = Math.min(bNow ? 12900 : 12800, rpm);
  // revs rise fast and fall slower
  E.rpm += (rpm - E.rpm) * (1 - Math.exp(-(rpm > E.rpm ? 26 : 10) * (E.slw < .985 ? rdt : dt)));   // in slow motion the revs sink on real time
  const f = E.rpm / 30, thr = P.thr, rn = (E.rpm - 1250) / 11500;
  E.a.frequency.setTargetAtTime(f, t, .02); E.b.frequency.setTargetAtTime(f * .5, t, .02); E.raspF.frequency.setTargetAtTime(f * 4, t, .03);
  const wot = bNow ? 1 : 0;   // wide open: more intake rasp and exhaust bark, a brighter filter
  E.raspG.gain.setTargetAtTime(.1 + .25 * thr + .2 * wot, t, .05); E.pk2.gain.setTargetAtTime(5 + 4 * wot, t, .05); E.pk1.gain.setTargetAtTime(6 + 2 * wot, t, .05);
  E.lp.frequency.setTargetAtTime((650 + 1500 * thr * (1 - E.dip * 8) + 1300 * rn + E.rev * 1500 + 1600 * wot + (P.tunnel ? 350 : 0)), t, .04);
  // the quiet stretch (SFX.ambience, mech/director.js): the engine and the wind come up ~3 dB as the music steps back, eased over ~1.5 s
  E.amb = (E.amb || 0) + (SFX.ambK - (E.amb || 0)) * (1 - Math.exp(-rdt / .5)); const amb = 1 + .413 * E.amb;
  E.out.gain.setTargetAtTime(on ? amb * lv('eng') * (.45 + .3 * thr + .25 * rn) * (1 + .7 * Math.min(1, E.rev) + .5 * E.acc) * (bNow ? (1.45 + .12 * E.bTier) * (bounce ? .6 : 1) : 1) * (E.dip > 0 ? .35 : 1) * (P.tunnel ? 1.25 : 1) : 0, t, on ? .03 : .25);
  if(on && thr < .5 && sp > .3 && (E.popT -= dt) <= 0){ E.popT = rr(.07, .3); SFX.play('pop', { at:t }); }   // decel crackle
  // wind
  const w = LP.wind; if((w.gT -= dt) <= 0){ w.gT = rr(.7, 2); w.gTo = rr(-.25, .3); } w.gust += (w.gTo - w.gust) * (1 - Math.exp(-1.5 * dt));
  const wl = on ? amb * lv('wind') * (Math.min(1.4, sp * sp) * (1 + w.gust) + (P.air ? .6 : 0)) * (P.tunnel ? 1.3 : 1) * Math.sqrt(E.slw) : 0;
  w.g.gain.setTargetAtTime(wl, t, .2); w.bp.frequency.setTargetAtTime((P.tunnel ? 380 : 500) + sp * 2400 + (P.air ? 900 : 0), t, .2);
  // squeal
  const q = LP.sq, sqOn = on && P.drift && sp > .45; q.ph += dt * rr(5, 9);
  q.g.gain.setTargetAtTime(sqOn ? lv('squeal') * (.55 + .22 * P.tier) * Math.min(1, sp) * (1 + .15 * Math.sin(q.ph * 1.7)) : 0, t, .05);
  q.b1.frequency.setTargetAtTime(1650 * (1 + .05 * Math.sin(q.ph)), t, .03); q.b2.frequency.setTargetAtTime(2450 * (1 + .04 * Math.sin(q.ph * 1.31 + 1)), t, .03);
  wire(q, sqOn, dt); q.o.frequency.setTargetAtTime(1900 + 140 * Math.sin(q.ph * .77) + 120 * P.tier, t, .03); q.pn.pan.setTargetAtTime((P.drift || 0) * .3, t, .1);
  // grind
  const g = LP.gr, scr = on && P.scrape;
  if(scr && !g.was) SFX.play('clank', { pan:P.scrapeSide, at:t }); g.was = scr;
  g.g.gain.setTargetAtTime(scr ? lv('grind') * rr(.6, 1.1) * Math.min(1, .4 + sp) : 0, t, scr ? .02 : .06); g.pn.pan.setTargetAtTime((P.scrapeSide || 0) * .8, t, .05);
  wire(g, scr, dt); if(scr && (g.sparkT -= dt) <= 0){ g.sparkT = rr(.06, .16); SFX.play('spark', { pan:P.scrapeSide, at:t }); }
  // siren: Doppler from how fast the car is closing (P.cop rising = closing in)
  const s = LP.si, cop = P.cop || 0, dc = dt > 0 ? (cop - s.prev) / dt : 0; s.prev = cop; s.dop += (clamp(1 + dc * .12, .93, 1.07) - s.dop) * (1 - Math.exp(-4 * dt));
  s.ph += dt / 2.6; const sw = .5 - .5 * Math.cos(2 * Math.PI * s.ph), sf = (560 + 360 * sw * sw) * s.dop;
  s.o1.frequency.setTargetAtTime(sf, t, .02); s.o2.frequency.setTargetAtTime(sf, t, .02); s.lp.frequency.setTargetAtTime(900 + 2400 * cop, t, .1);
  s.o3.frequency.setTargetAtTime(85 * s.dop * (1 + .25 * cop), t, .05); s.lp3.frequency.setTargetAtTime(350 + 900 * cop, t, .1);
  s.g.gain.setTargetAtTime(cop > .02 ? lv('siren') * cop : 0, t, .1); s.pn.pan.setTargetAtTime((P.copSide || 0) * (.65 - .35 * cop), t, .1); wire(s, cop > .02, dt);
  // rival engines
  for(let i = 0; i < 2; i++){ const r = LP.rv[i], p = P.rv[i];
    r.g.gain.setTargetAtTime(on && p.on ? lv('rival') * p.g : 0, t, .08); wire(r, on && p.on, dt); r.pn.pan.setTargetAtTime(p.pan, t, .05);
    r.a.frequency.setTargetAtTime(p.f * p.dop, t, .04); r.b.frequency.setTargetAtTime(p.f * p.dop * 2.01, t, .04); r.lp.frequency.setTargetAtTime(p.cut || 3000, t, .05); }
  // traffic pass-by voices
  for(let i = 0; i < 4; i++){ const v = LP.vh[i], p = P.vh[i], want = on && p.on;
    wire(v, want, dt); v.g.gain.setTargetAtTime(want ? lv('veh') * p.g * (p.truck ? 1.35 : 1) : 0, t, want ? .05 : .08); if(!want){ v.fresh = true; continue; }
    const f = p.f * p.dop, rf = p.roar * p.dop;
    if(v.fresh){ v.fresh = false; v.a.frequency.setValueAtTime(f, t); v.b.frequency.setValueAtTime(f * .5, t); v.nb.frequency.setValueAtTime(rf, t);   // a new vehicle: jump, don't glide
      v.eg.gain.setValueAtTime(p.truck ? .75 : .5, t); v.bG.gain.setValueAtTime(p.truck ? .7 : .35, t); v.ng.gain.setValueAtTime(p.truck ? .6 : .55, t); v.ag.gain.setValueAtTime(p.truck ? .18 : 0, t); }
    else { v.a.frequency.setTargetAtTime(f, t, .03); v.b.frequency.setTargetAtTime(f * .5, t, .03); v.nb.frequency.setTargetAtTime(rf, t, .03); }
    v.lp.frequency.setTargetAtTime(p.cut, t, .04); v.pn.pan.setTargetAtTime(p.pan, t, .04); }
  // tunnel: the reverb send
  wet.gain.setTargetAtTime(P.tunnel ? .55 : 0, t, .25);
  // the convolver costs CPU even when its send is silent, so it is wired in only while in (or just out of) a tunnel
  if(P.tunnel){ revT = 2; if(!revOn){ revOn = true; blp.connect(conv); } } else if(revOn && (revT -= dt) <= 0){ revOn = false; try{ blp.disconnect(conv); }catch(e){} }
  /* slow motion (the crash cam at ~4 %, the director's cinematics): the world's sound sinks and dulls with time, the Burnout crash-cam and
     Akira slide trick. The whole SFX bus closes toward 1.1 kHz and the engine drops up to 30 % in pitch; real time returns it in ~0.3 s. */
  const sl = E.slw, bf = sl > .985 ? 20000 : Math.max(1100, 20000 * Math.pow(sl, 1.6)); if(Math.abs(bf - blpF) > blpF * .05){ blp.frequency.setTargetAtTime(bf, t, bf < blpF ? .05 : .12); blpF = bf; }
};
// one-shot voices sounding at time t (the seven loops are not counted)
SFX.active = function(t){ let n = 0; for(const k in SLOTS){ const a = SLOTS[k]; for(let i = 0; i < a.length; i++) if(a[i].end > t && a[i].start <= t) n++; } return n; };
/* pass-by geometry, shared by the game hooks and the tests. dz: the vehicle's z minus the player's (world units, + = ahead); dx: lateral
   offset in half-road widths; dvz: its speed minus the player's (units/s). Writes into p: d (distance), g (level by distance), pan
   (bearing), dop (Doppler ratio c / (c + radial speed)), cut (lowpass, opening as it closes, darker behind). 1 m is ~165 units here
   (MAXS = 240 km/h), so sound travels 56,600 units/s; the ear is ~1.6 m off the road line; half a road is 2,000 units. */
const C_SND = 56600, ROADU = 2000, EAR = 260;
SFX.geom = function(p, dz, dx, dvz){ const lat = dx * ROADU, d = Math.sqrt(dz * dz + lat * lat + EAR * EAR), vr = dz * dvz / d, k = d / 1100;
  p.d = d; p.g = clamp((13000 - d) / 4000, 0, 1) / Math.sqrt(1 + k * k); p.pan = clamp(lat / d * 1.3, -.95, .95); p.dop = clamp(C_SND / (C_SND + vr), .7, 1.4);
  p.cut = (500 + 5500 * Math.pow(Math.min(1, p.g * 1.4), 1.5)) * (dz < 0 ? .65 : 1); return p; };
/* a short dip of the music under a big rev (boost ignition): M.out's gain drops by x dB and comes back after `hold`. It remembers
   the level it found, so overlapping dips never ratchet it down, and it only acts mid-ride (never during the ending's fade). */
let duckBase = 0, duckEnd = 0;
SFX.duckMusic = function(dB, hold){ try{ if(typeof M === 'undefined' || !M.out || M.ac !== ac || state !== 'play') return false; const g = M.out.gain, t = ac.currentTime;
    if(t > duckEnd){ duckBase = g.value; if(duckBase < .5) return false; } g.setTargetAtTime(duckBase * db(-dB), t, .03); g.setTargetAtTime(duckBase, t + hold, .25); duckEnd = t + hold + 1; return true; }catch(e){ return false; } };
SFX.blip = function(amount){ if(E) E.rev = Math.min(1.3, E.rev + amount); };

/* ------------------------------------------------------------------ the graph */
function makeBuffers(){ const sr = ac.sampleRate, n = sr * 2;
  NB = ac.createBuffer(1, n, sr); const d = NB.getChannelData(0); for(let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
  NB2 = ac.createBuffer(2, n, sr); for(let c = 0; c < 2; c++){ const e = NB2.getChannelData(c); for(let i = 0; i < n; i++) e[i] = rnd() * 2 - 1; }
  BR = ac.createBuffer(1, n, sr); const b = BR.getChannelData(0); let l = 0; for(let i = 0; i < n; i++){ l = l * .985 + (rnd() * 2 - 1) * .015; b[i] = l * 9; }   // red-ish: body for thuds and rumble
  SH = new Float32Array(1024); for(let i = 0; i < 1024; i++){ const x = i / 511.5 - 1; SH[i] = Math.tanh(x * 2.5) / Math.tanh(2.5); }
  // the tunnel: a 1.4 s stereo tail with a concrete-tube flutter (taps every ~31 ms), decaying fast in the highs
  const ir = ac.createBuffer(2, Math.floor(sr * 1.4), sr);
  for(let c = 0; c < 2; c++){ const e = ir.getChannelData(c); let lp = 0; for(let i = 0; i < e.length; i++){ const tt = i / sr, k = .65 + .35 * tt / 1.4; lp = lp * k + (rnd() * 2 - 1) * (1 - k); e[i] = lp * 2.2 * Math.exp(-tt * 4.2); }
    for(let j = 1; j < 30; j++){ const at = Math.floor((j * .031 + (c ? .004 : 0)) * sr); if(at < e.length) e[at] += .5 * Math.exp(-j * .2) * (j % 2 ? 1 : -.8); } }
  return ir; }
SFX.attach = function(ctx, dest){ ac = ctx; seed = 7; const ir = makeBuffers();
  bus = G(1); blp = F('lowpass', 20000, .5); blpF = 20000; dry = G(1); wet = G(0); conv = ac.createConvolver(); conv.normalize = true; conv.buffer = ir;
  /* a gentle bus compressor. Chrome adds automatic makeup gain to DynamicsCompressorNode (about 0.6 x the full-range reduction,
     ~4.7 dB at these settings, measured), so `trim` takes it back out: below the threshold the bus is unity (measured in the offline check). */
  comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .15;
  trim = G(db(SFX.TRIM_DB + SFX.BUS_DB));
  // a guard limiter: with the bus raised to sit against the loud soundtrack, it keeps SFX peaks under about -6 dBFS (lim makeup taken out by ltrim)
  lim = ac.createDynamicsCompressor(); lim.threshold.value = -6; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08; ltrim = G(db(SFX.LIM_DB));
  ch(bus, blp, dry, comp); ch(conv, wet, comp); ch(comp, trim, lim, ltrim, dest); revOn = false; revT = 0;
  for(const k in RULE){ RULE[k].last = -9; RULE[k].rep = 0; for(const s of SLOTS[k]){ s.end = 0; s.start = 0; s.g = null; } }
  const S0 = SFX.stats; S0.peak = 0; S0.now = 0; S0.live = 0; for(const k in RULE){ S0.plays[k] = 0; S0.drops[k] = 0; S0.steals[k] = 0; } live = true; buildLoops(); return SFX; };
/* SFX.ambience(k), k 0..1: the quiet stretch's hook (research/sundown-craft/quiet.md). Called by mech/director.js at the stretch's start and
   end; the engine and wind loops rise toward +3 dB (x1.413) at k = 1. A chase ends the stretch, and the director calls it with 0. */
SFX.ambK = 0;
SFX.ambience = function(k){ SFX.ambK = Math.max(0, Math.min(1, +k || 0)); };
SFX.UI_DB = -16;   // SFX.ui over a playing song (5 dB less over the pause menu's silence)
SFX.TRIM_DB = -4.7;   // measured: a -40 dBFS sine through the bus comes out at -40.0
SFX.LIM_DB = -3.43;      // the guard limiter's automatic makeup, taken back out (measured)
SFX.BUS_DB = 14;     // the whole SFX bus against the music (set by measurement against audio/music.js)
SFX.ready = () => live;
SFX._dbg = () => ({ E, LP, bus, blp, comp, trim, lim, ltrim });   // tests: tap the engine and bus with analysers
SFX.ctx = () => ac;
SFX.bus = () => bus;

/* ------------------------------------------------------------------ UI: its own tiny context, so the pause menu can tick while the game is suspended */
let uac = null, uout = null, uLast = 0;
SFX.ui = function(kind){ try{ if(!uac){ uac = new (window.AudioContext || window.webkitAudioContext)(); uout = uac.createGain(); uout.connect(uac.destination); }
    if(uac.state === 'suspended') uac.resume(); const t = uac.currentTime; if(t - uLast < .035) return; uLast = t;
    /* level: measured, the old -24 dB put a menu move at -32 dBFS peak under the title song's -15 LUFS (masked). Over a playing song
       (title, results, the garage) it sits at -16 dB; over the silence of the pause menu (the game context suspended) at -21 dB. */
    const over = typeof M !== 'undefined' && M.ac && M.ac.state === 'running';
    uout.gain.value = (typeof volGain === 'function' ? volGain() : 1) * db(over ? SFX.UI_DB : SFX.UI_DB - 5);
    const n = (f, at, d, lv, type) => { const o = uac.createOscillator(), g = uac.createGain(), lp = uac.createBiquadFilter(); o.type = type || 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 3000;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(lv, at + .003); g.gain.exponentialRampToValueAtTime(lv * .001, at + d); g.gain.linearRampToValueAtTime(0, at + d + .01); o.connect(lp).connect(g).connect(uout); o.start(at); o.stop(at + d + .03); o.onended = () => { try{ g.disconnect(); }catch(e){} }; };
    if(kind === 'move') n(1320, t, .03, .35);
    else if(kind === 'ok'){ n(880, t, .06, .45); n(1320, t + .05, .1, .45); }
    else if(kind === 'back'){ n(1100, t, .06, .4); n(740, t + .05, .1, .4); }
    // equip: a latch (a low tick and a rising fifth); deny: a short low double buzz for a locked item (no nag, just a clear "not yet")
    else if(kind === 'equip'){ n(440, t, .025, .4, 'triangle'); n(988, t + .03, .06, .38); n(1480, t + .075, .11, .34); }
    else if(kind === 'deny'){ n(196, t, .07, .5); n(185, t + .09, .09, .45); }
  }catch(e){} };

/* ================================================================== MECH.sfx: watching the ride (reads core globals; no core edits needed) */
if(!window.MECH) return;
const S = MECH.sfx = {};
const P = { on:false, sp:0, thr:0, boost:0, btier:0, air:false, drift:0, tier:0, scrape:false, scrapeSide:0, tunnel:false, cop:0, copSide:0, rv:[{ on:false, g:0, pan:0, f:120, dop:1, cut:3000 }, { on:false, g:0, pan:0, f:120, dop:1, cut:3000 }],
  vh:[0, 1, 2, 3].map(() => ({ on:false, car:null, freeT:-9, truck:false, f:90, roar:900, d:0, g:0, pan:0, dop:1, cut:1500 })) };
// traffic: the four nearest cars within ~9,000 units keep a voice for as long as they stay within 13,000; a released voice rests 0.25 s
// before it takes another car (so it never glides from one car's pitch to the next). No allocation: fixed slots, a mark on each car.
function traffic(pz){ const VH = P.vh, on = state === 'play' || state === 'pulled', cap = 4 - (P.rv[0].on ? 1 : 0) - (P.rv[1].on ? 1 : 0);   // at most 4 pass-by voices in all
  for(let i = 0; i < 4; i++){ const p = VH[i], c = p.car; if(!c) continue; let alive = false;
    if(on) for(let j = 0; j < cars.length; j++) if(cars[j] === c){ alive = true; break; }
    if(alive){ SFX.geom(p, c.z - pz, c.x - playerX, c.speed - speed); if(p.d < 13000) continue; }
    p.car = null; p.on = false; p.freeT = clock; c._vh = -1; }
  let used = 0; for(let i = 0; i < 4; i++) if(VH[i].car) used++;
  while(used > cap){ let far = null; for(let i = 0; i < 4; i++){ const p = VH[i]; if(p.car && (!far || p.d > far.d)) far = p; } far.car._vh = -1; far.car = null; far.on = false; far.freeT = clock; used--; }
  if(!on) return;
  for(let i = 0; i < 4 && used < cap; i++){ const p = VH[i]; if(p.car || clock - p.freeT < .25) continue; let best = null, bd = 9000;
    for(let j = 0; j < cars.length; j++){ const c = cars[j]; if(c._vh >= 0) continue; const dz = c.z - pz, lat = (c.x - playerX) * ROADU, d = Math.sqrt(dz * dz + lat * lat); if(d < bd){ bd = d; best = c; } }
    if(!best) break; best._vh = i; p.car = best; p.truck = !!best.truck; p.on = true; used++;
    // a car: a four at ~2,400-3,200 rpm (firing 80-107 Hz); a truck: a diesel six at ~1,500 rpm, low and lumpy. Each car a little different.
    const v = clamp(best.speed / MAXS, 0, 1.3), h = .94 + .12 * (((best.ci || 0) * 7 + (best.model || '').length) % 9) / 8;
    p.f = (p.truck ? 52 + 22 * v : 72 + 45 * v) * h; p.roar = (p.truck ? 500 : 750) + 600 * v; SFX.geom(p, best.z - pz, best.x - playerX, best.speed - speed); } }
const PV = { boosts:0, pads:0, gates:0, air:false, airMax:0, kicks:0, landed:0, kickedBy:0, takedowns:0 }, RV = [null, null], RGAP = [0, 0];
let scrapeAt = -9, kickSide = 0, clock = 0, hornT = 0, brakeT = 0;

const gangST = () => { const g = MECH.gang; return g && !g.sfx && g._dbg && g._dbg.ST ? g._dbg.ST() : null; };
const gangR = () => { const g = MECH.gang; return g && g._dbg && g._dbg.R ? g._dbg.R() : null; };
function sync(){ PV.boosts = boosts; PV.pads = pads; PV.gates = gatesHit; PV.air = false; const st = gangST(); if(st){ PV.kicks = st.kicks; PV.landed = st.kicksLanded; PV.kickedBy = st.kickedBy; PV.takedowns = st.takedowns; } }
// a close call (the core's M.close, called the frame the car is passed): find that car, whoosh if it wasn't predicted, then the stinger
function closeCall(c0){ const pz = position + PZ; let c = c0 && c0.z != null ? c0 : null, bd = c ? 0 : 1e9; if(!c) for(let i = 0; i < cars.length; i++){ const x = cars[i]; if(!x.passed || x._sfxC) continue; const d = Math.abs(x.z - pz); if(d < bd){ bd = d; c = x; } }
  const gap = c ? Math.abs(c.x - playerX) : .4, pan = c ? Math.sign(c.x - playerX) || 1 : 0, k = clamp(1 - (gap - .3) / .2, 0, 1);
  if(c){ c._sfxC = 1; if(!c._sfxW){ c._sfxW = 1; SFX.play('whoosh', { pan, k:.6 + .4 * k, lead:.02, truck:c.truck }); } }
  SFX.play('stinger', { flow, k, pan });
  if(c && clock - hornT > 4 && rnd() < (c.truck ? .3 : .18)){ hornT = clock; SFX.play('horn', { pan, truck:c.truck, twice:rnd() < .4, at:SFX.ctx().currentTime + .12 }); } }
S.warm = () => { if(typeof M === 'undefined' || M._sfx || !SFX.takeover) return; M._sfx = true;
  M.close = function(c){ if(live) closeCall(c); };   // the core may pass the car: M.close(c)
  M.crash = function(){ if(live) SFX.play('crash', { pan:typeof playerX === 'number' ? -Math.sign(playerX) * .3 : 0 }); };
  M.scrape = function(){ scrapeAt = clock; };
  M.slick = function(){ if(live) SFX.play('slick', { pan:typeof slideDir === 'number' ? slideDir : 0 }); }; };
function takeLoops(){ if(!SFX.takeover) return; ['engG', 'skidG', 'windG', 'sirG'].forEach(k => { try{ if(M[k]) M[k].disconnect(); }catch(e){} }); }
S.reset = () => { for(const p of P.vh){ if(p.car) p.car._vh = -1; p.car = null; p.on = false; } P.rv[0].on = P.rv[1].on = false; if(typeof boosts === 'undefined') return; sync(); RV[0] = RV[1] = null; };
SFX._dbgP = () => P;   // tests: the loop parameters the hooks computed
S.key = (code, down) => { if(down){ if(code === 'KeyZ' || code === 'KeyJ') kickSide = -1; else if(code === 'KeyX' || code === 'KeyK') kickSide = 1; } return false; };
S.pad = (gp, prev) => { const b = gp.buttons; if(b[2] && b[2].pressed && !prev[2]) kickSide = -1; if(b[1] && b[1].pressed && !prev[1]) kickSide = 1; };
S.update = dt => { clock += dt; lastUpd = performance.now();
  if(!live){ if(typeof M === 'undefined' || !M.ac || !M.vol) return; SFX.attach(M.ac, M.vol); takeLoops(); sync(); }
  const playing = state === 'play', pz = position + PZ, sp = speed / MAXS;
  P.on = playing || state === 'pulled'; P.sp = sp; P.air = AIR.h >= 6; P.slow = window.TIME && TIME.scale < 1 ? TIME.scale : 1;
  P.thr = state === 'pulled' ? 0 : playing && cool <= 0 && !offT ? 1 : .2; P.boost = playing ? boostT : 0; P.btier = boostTier || 1;
  P.drift = playing && drift ? drift : 0; P.tier = tier;
  P.scrape = playing && clock - scrapeAt < .08; P.scrapeSide = Math.sign(playerX) || 1;
  const sg = segAt(pz); P.tunnel = !!(sg && sg.tunnel);
  P.cop = P.on && copShown > .02 ? copShown : 0; P.copSide = copSide || 0;
  if(playing){
    const ctx = SFX.ctx(), now = ctx.currentTime;
    // every car about to be passed within ~a lane gets a whoosh that peaks on the pass; trucks ahead sometimes hiss their air brakes
    for(let i = 0; i < cars.length; i++){ const c = cars[i], rel = speed - c.speed, d = c.z - pz; if(rel <= 0 || d <= 0) continue; const gx = Math.abs(c.x - playerX);
      if(!c._sfxW && AIR.h < 6 && d < rel * .25 && gx < .95){ c._sfxW = 1; SFX.play('whoosh', { pan:Math.sign(c.x - playerX) || 1, k:clamp(1 - (gx - .3) / .65, 0, 1), lead:d / rel, truck:c.truck }); }
      if(c.truck && !c._sfxB && d < rel * 1.6 && d > rel * .9){ c._sfxB = 1; if(clock - brakeT > 8 && gx < 1.3 && rnd() < .3){ brakeT = clock; SFX.play('airbrake', { pan:Math.sign(c.x - playerX) }); } } }
    if(boosts > PV.boosts){ SFX.play('boost', { tier:boostTier }); SFX.blip(.35 * boostTier); SFX.duckMusic(boostTier >= 3 ? 2 : boostTier >= 2 ? 1.5 : 1, .25 + .35 * boostTier); }
    if(pads > PV.pads){ SFX.play('pad'); SFX.blip(.3); SFX.duckMusic(1, .4); }
    if(gatesHit > PV.gates){ SFX.play('gate'); if(PV.gates % 2 === 0 && (!window.isForkZone || isForkZone(PV.gates / 2))) SFX.play('fork', { side:playerX > 0 ? 1 : -1, at:now + .08 }); }
    // jumps: takeoff when the bike leaves the road, landing when it comes back down (a clean landing gives Thunder tier, so we read that)
    const jw = MECH.sp_jump && MECH.sp_jump.sfx;   // once patched, jump.js plays the landing itself (it knows clean vs not)
    if(P.air && !PV.air){ SFX.play('takeoff'); SFX.blip(.4); }
    if(!P.air && PV.air && !jw){ SFX.play('land', { clean:boostTier === 3 && boostT > 2.1 }); }
    // the gang (until gang.js calls SFX itself and sets MECH.gang.sfx = true)
    const st = gangST(); if(st){ if(st.kicks > PV.kicks) SFX.play('kick', { pan:kickSide }); if(st.kicksLanded > PV.landed) SFX.play('kickHit', { pan:kickSide });
      if(st.takedowns > PV.takedowns){ const R = gangR(); let side = kickSide; if(R) for(const r of R) if(r.st === 'down' && r.down && r.down.t < .2) side = Math.sign(r.x - playerX) || side; SFX.play('takedown', { pan:side }); }
      if(st.kickedBy > PV.kickedBy){ let side = 0; const R = gangR(); if(R){ let bd = 1e9; for(const r of R){ const d = Math.abs(r.z - pz); if(r.st !== 'down' && d < bd){ bd = d; side = Math.sign(r.x - playerX); } } } SFX.play('kickHit', { pan:side, heavy:true }); }
      PV.kicks = st.kicks; PV.landed = st.kicksLanded; PV.takedowns = st.takedowns; PV.kickedBy = st.kickedBy; }
  }
  PV.boosts = boosts; PV.pads = pads; PV.gates = gatesHit; PV.air = P.air;
  // rival engines: the two nearest riders, by gap; level falls with distance, pan by lateral offset, Doppler from the closing speed
  const R = gangR(); for(let i = 0; i < 2; i++) P.rv[i].on = false;
  if(R && R.length){ let a = null, b = null, da = 1e9, dbb = 1e9;
    for(const r of R){ if(r.st === 'down') continue; const d = Math.abs(r.z - pz); if(d < da){ b = a; dbb = da; a = r; da = d; } else if(d < dbb){ b = r; dbb = d; } }
    for(let i = 0; i < 2; i++){ const r = i ? b : a, p = P.rv[i]; if(!r || Math.abs(r.z - pz) > 12000) continue;
      SFX.geom(p, r.z - pz, r.x - playerX, (r.speed || 0) - speed); p.on = p.g > .005; p.g *= 1.4;
      p.f = 95 + 75 * clamp((r.speed || 0) / MAXS, 0, 1.3) + (r.boostT > 0 ? 25 : 0); } }
  traffic(pz);
  SFX.drive(P, dt);
};
/* the countdown (三 二 一 走れ): the core holds 'ready' and does not call update, so a small timer drives the engine meanwhile:
   a lumpy idle, the bosozoku call on each count (ba-ba-baan: two short blips and a long one, on arrival.js's count timing) and a long
   howl on GO. It stands down whenever the game's update is running, and while paused. */
const CD_B = 60 / 126 * 1.5, CD_0 = .15, CALL = [[.02, .45], [.14, .45], [.26, 1.1]];
/* Timing (kodawari): the calls are timed on the audio clock from the moment the music's count-in starts (MUSIC.countAt()), not from
   whenever this timer first noticed the countdown, and the timer runs every 10 ms. Measured live before: the calls landed 41-63 ms late
   with +-20 ms of wobble against the count-in; see research/sundown-craft/audio.md. */
let lastUpd = 0, cdA = 0, cdList = null, cdPrev = 0;
setInterval(() => { try{ if(typeof state === 'undefined' || typeof M === 'undefined' || typeof SHEET === 'undefined') return;
  const now = performance.now(); if(state !== 'ready' || now - lastUpd < 120 || (typeof PSE !== 'undefined' && PSE.on)) return;
  if(!live){ if(!M.ac || !M.vol) return; SFX.attach(M.ac, M.vol); takeLoops(); }
  const A = MECH.arrival, cdOn = state === 'ready' && SHEET.hidden && !!(A && A.countdownOn && A.countdownOn()), at = ac.currentTime;
  if(cdOn && !cdList){ cdA = at; cdList = []; for(let k = 0; k < 3; k++) for(const c of CALL) cdList.push([CD_0 + k * CD_B + c[0], c[1]]); cdList.push([CD_0 + 3 * CD_B, 1.3]); }
  if(!cdOn) cdList = null;
  else { const mc = window.MUSIC && MUSIC.countAt ? MUSIC.countAt() : 0, z = mc && mc >= cdA - .15 && mc <= at ? mc : cdA, tt = at - z + .012;   // the count-in's zero once the music has it; .012: the rev's own rise
    while(cdList.length && cdList[0][0] <= tt){ const c = cdList.shift(); SFX.blip(c[1]); if(c[1] >= 1) for(let i = 0; i < 3; i++) SFX.play('pop', { at:at + .26 + i * .07 }); } }
  const dt = clamp((now - cdPrev) / 1000, .005, .1); cdPrev = now;
  P.on = cdOn; P.slow = 1; P.sp = 0; P.thr = .6; P.boost = 0; P.air = false; P.drift = 0; P.tier = 0; P.scrape = false; P.tunnel = false; P.cop = 0; P.rv[0].on = false; P.rv[1].on = false;
  SFX.drive(P, dt); }catch(e){} }, 10);
})();
