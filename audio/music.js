/* Sundown soundtrack: the music system (window.MUSIC). Original tracks written as text data, compiled to timed events and
   synthesised live with Web Audio. Second direction (after the user's first listen): night-racing intensity, not city pop.
   Palette: detuned supersaws, formant-filtered chant voices, 808 and distorted sub, reese bass, power-chord "guitar" through a
   cabinet filter, FM gamelan metallophones, taiko (shime and o-daiko), gated snares, risers, reverse cymbals, impacts, engine revs,
   sidechain pumping and Haas-wide stereo. No pulse or chip voices. No melody is taken from any reference (research/sundown-music.md).

   Load it LAST (after mech/arrival.js):  <script src="audio/music.js"></script>
   It runs on its own 50 ms timer, schedules ~0.35 s ahead on the audio clock and reads the game's globals (state, speed, MAXS, flow,
   boostT, boostTier, gatesHit, SHEET); it never runs per frame. It plays through the existing graph: songs -> M.out (so the director's
   duck, which sits between M.out and M.vol, and the master volume M.vol both apply); cinematic stings and the results music -> the
   director's bus() (straight into M.vol: loud over a ducked song, and alive after M.resolve fades M.out). Pause suspends the context,
   which freezes this clock too. The core's own M.tick must stand aside while MUSIC.owns() (see the patch in research/sundown-music.md).

   API: MUSIC.owns()  MUSIC.attach(M)  MUSIC.road(i)  MUSIC.boost(tier)  MUSIC.cue(name)  MUSIC.end(caught)  MUSIC.clock()
        MUSIC.render(name, opts) -> Promise<[Float32Array, Float32Array]> (offline, for measurement)  MUSIC.THEMES  MUSIC.STINGS
        MUSIC.compile(theme) -> { bars, warnings, ... } (runs in node too, no audio needed)                                   */
"use strict";
(function(){
const HAS_WIN = typeof window !== 'undefined';

/* ================================================================== notation: notes, chords */
const PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const pcOf = s => (PC[s[0]] + (s[1] === '#' ? 1 : s[1] === 'b' ? -1 : 0) + 12) % 12;
function nm(s){ const m = /^([A-G])([#b]?)(-?\d)$/.exec(s); if(!m) throw new Error('bad note ' + s); return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); }
const QUAL = { '':[0,4,7], m:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10], m9:[0,3,7,10,14], maj9:[0,4,7,11,14], '9':[0,4,7,10,14],
  add9:[0,4,7,14], madd9:[0,3,7,14], '6':[0,4,7,9], m6:[0,3,7,9], sus4:[0,5,7], sus2:[0,2,7], '7sus4':[0,5,7,10], dim:[0,3,6], dim7:[0,3,6,9],
  m7b5:[0,3,6,10], '7#9':[0,4,7,10,15], 'maj7#11':[0,4,7,11,18], '69':[0,4,7,9,14], '5':[0,7] };
function chordOf(s){ const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(s); if(!m || !QUAL[m[2]]) throw new Error('bad chord ' + s);
  const r = pcOf(m[1]); return { name:s, r, iv:QUAL[m[2]], b:m[3] ? pcOf(m[3]) : r }; }
const above = (pc, lo) => lo + (((pc - lo) % 12) + 12) % 12;   // the first midi note >= lo with this pitch class

/* ================================================================== instruments (relative gains; balanced by measurement)
   sub: subtractive (oscillators -> filter with an envelope -> amp envelope). fm: two-operator FM. vox: oscillators -> parallel vowel
   formant bandpasses (the chant voice). vib: [delay s, depth cents, rate Hz]. pdrop: the note starts this many semitones up and falls
   (808). Channel options in a theme's parts: drive (waveshaper), cab (a cabinet lowpass after the drive), wide (Haas width),
   pump (sidechain duck against the kick, 0..1). */
const INST = {
  super: { t:'sub', osc:['sawtooth', 'sawtooth', 'sawtooth'], det:[-13, 0, 13], cut:1700, fenv:3200, fa:.008, fd:.35, q:1, a:.006, d:.45, s:.75, r:.16, vib:[.3, 10, 5.5], vol:.07, gl:.05 },
  scream:{ t:'sub', osc:['sawtooth', 'sawtooth'], det:[-7, 7], cut:2400, fenv:2600, fa:.01, fd:.3, q:1.6, a:.008, d:.4, s:.8, r:.14, vib:[.25, 16, 5.8], vol:.06, gl:.06 },
  horn:  { t:'sub', osc:['sawtooth', 'sawtooth'], det:[0, 40], cut:1300, fenv:1500, fa:.008, fd:.12, q:3, a:.008, d:.25, s:.9, r:.07, vol:.08, gl:.03 },
  spad:  { t:'sub', osc:['sawtooth', 'sawtooth', 'sawtooth'], det:[-16, 0, 16], cut:1400, fenv:1200, fa:.35, fd:1, q:.6, a:.25, d:1, s:.85, r:.7, vol:.04 },
  stab:  { t:'sub', osc:['sawtooth', 'sawtooth', 'sawtooth'], det:[-14, 0, 14], cut:700, fenv:5200, fa:.003, fd:.14, q:1.2, a:.003, d:.25, s:.15, r:.15, vol:.06 },
  pluck: { t:'sub', osc:['sawtooth', 'sawtooth'], det:[-9, 9], cut:420, fenv:4200, fa:.002, fd:.11, q:2, a:.002, d:.2, s:0, r:.1, vol:.06 },
  gtr:   { t:'sub', osc:['sawtooth', 'sawtooth', 'square'], det:[-8, 8, -1200], mix:[1, 1, .5], cut:5000, fenv:0, a:.003, d:.3, s:.85, r:.07, vol:.05 },
  b808:  { t:'sub', osc:['sine', 'triangle'], mix:[1, .35], det:[0, 0], cut:900, fenv:0, a:.003, d:1.4, s:.55, r:.18, pdrop:7, pdropT:.05, vol:.32, gl:.07 },
  reese: { t:'sub', osc:['sawtooth', 'sawtooth'], det:[-18, 18], cut:650, fenv:700, fa:.01, fd:.3, q:1.4, a:.008, d:.4, s:.9, r:.08, vol:.1 },
  subB:  { t:'sub', osc:['sine', 'triangle'], mix:[1, .3], det:[0, 0], cut:600, fenv:0, a:.01, d:.4, s:.9, r:.1, vol:.3 },
  gamelan:{ t:'fm', ratio:2, idx:1.4, idxEnd:.2, idxT:.4, dbl:11, a:.001, d:2, s:0, r:1, vol:.07 },   // saron: a detuned pair beats (ombak)
  bonang:{ t:'fm', ratio:4.2, idx:1.2, idxEnd:.1, idxT:.3, dbl:8, a:.001, d:1.2, s:0, r:.6, vol:.05 },
  glock: { t:'fm', ratio:3.5, idx:2, idxEnd:.1, idxT:.8, a:.002, d:1.6, s:0, r:.8, vol:.04 },
  koto:  { t:'fm', ratio:2, idx:3, idxEnd:.2, idxT:.1, a:.002, d:1, s:0, r:.3, bend:40, vol:.09 },
  // the synthesised voices (chantA 'ah', chantO 'oh', chantU 'oo', the choir 'ah' pad) were removed (user, 2026-11-19: "the
  // synthesized 'ah' and 'oh' voices are really bad. please remove those from all over the tracks"); the vox code path stays, unused.
  cowbell:{ t:'sub', osc:['square', 'square'], det:[0, 680], cut:1100, bp:true, q:1.8, fenv:0, a:.001, d:.25, s:0, r:.08, vol:.12 },
  // the build's overlay voices (see "the build" below): the chase's driving pulse and its siren wail
  pulse: { t:'sub', osc:['sawtooth', 'sawtooth'], det:[-6, 6], cut:420, fenv:1600, fa:.002, fd:.07, q:3, a:.002, d:.09, s:.25, r:.05, vol:.15 },
  siren: { t:'sub', osc:['sawtooth', 'square'], det:[0, 5], cut:1900, fenv:0, q:1, a:.08, d:.3, s:.85, r:.2, vib:[.05, 25, 5.5], vol:.045, gl:.3 },
  // the five new roads and the results (2026-11-21):
  // drone: a dark held fifth (Kurobe's cold air, Akihabara's dead mains hum); slow in, slow out, filtered low so it never hisses
  drone: { t:'sub', osc:['sawtooth', 'sawtooth', 'sawtooth'], det:[-7, 0, 7], cut:380, fenv:250, fa:.8, fd:1.5, q:1.8, a:1.1, d:1.5, s:.9, r:1.4, vol:.05 },
  // chip: Akihabara's arcade square, a short blip with a quiet octave on top, lowpassed under 3 kHz (squares get harsh fast)
  chip:  { t:'sub', osc:['square', 'square'], det:[0, 1200], mix:[1, .22], cut:2600, fenv:900, fa:.001, fd:.05, q:.8, a:.001, d:.07, s:.22, r:.03, vol:.032 },
  // sham: a shamisen-like pluck for Gion: FM with a 3:1 ratio for the buzz (sawari), a bachi snap of pitch from above, a short body
  sham:  { t:'fm', ratio:3, idx:4.2, idxEnd:.35, idxT:.07, a:.001, d:.75, s:0, r:.18, bend:35, vol:.075 },
  // dawn: the results melody, a warm triangle-and-saw with a delayed vibrato (no voice, no bell)
  dawn:  { t:'sub', osc:['triangle', 'sawtooth'], det:[0, 6], mix:[1, .3], cut:1500, fenv:500, fa:.03, fd:.4, q:.7, a:.03, d:.6, s:.75, r:.35, vib:[.35, 9, 5], vol:.08 } };
const VOWEL = { a:[[730, 1, 7], [1090, .55, 9], [2440, .3, 11]], o:[[570, 1, 7], [840, .5, 9], [2410, .18, 11]], u:[[320, 1, 7], [870, .3, 9], [2240, .12, 11]], e:[[530, 1, 7], [1840, .55, 11], [2480, .35, 12]] };

/* ================================================================== the score: themes as data
   lead strings: tokens 'E5:3' (note, length in 16ths; default 2), '.:4' rest, '~E5' glide in from the last note, '!E5' accent, '|' bar.
   figures (one char per 16th over the bar's chord; a 32-char figure alternates two bars, call and response). bass: 1 root (the slash
   bass), 8 root up, 5 fifth, 3 third, 7 seventh, 9 ninth, x ghost, n chromatic approach, '-' hold, '.' rest. pads: 'hold' sustains the
   chord, any other figure is a rhythm ('x' strikes, '-' holds); pow:true voices it as a power chord (root, fifth, octave). arp/chant
   parts (arp:true): a digit indexes the chord's tones stacked upward from the part's low note.
   kit lines (16 chars): x hit, X accent, g ghost. k kick, K 808 kick, s gated snare, c clap, h hat, h2 second hat, y hat roll (triplet),
   o open hat, r ride, C crash, j shime-daiko, J o-daiko, g gong, t/m toms, e anvil, b cowbell, v engine rev (the bosozoku call).
   A section may say rise:true (a noise riser and a reverse cymbal into the next section) or drop:true (an impact on its downbeat).
   lay: the intensity (0-4) a part needs: 0 cruising, 1 riding, 2 fast, 3 in flow, 4 boosting (the drop). */
const KIT_LAY = { k:1, K:1, s:1, c:1, h:0, h2:3, y:3, o:2, a:0, C:0, t:1, m:1, j:1, J:0, g:0, e:1, b:2, i:2, q:2, r:3, v:2, R:0, V:0, I:0, w:0, P:0, z:0, E:0 };
// new kit hits (2026-11-21): w the dam's water roar (a bar-long swell of low noise and spray), P a power-down (a saw falling three
// octaves), z the atarigane (the ohayashi's hand gong: kon-chiki-chin), E an eruption (a deep dive, a rumbling crack and a crash)
const MOTIF = 'the sundown figure: scale steps 1 5 4 3 2 in 3+3+2+4+4 sixteenths, falling like the sun; dawn turns it upward (1 2 3 4 5)';
const R16 = '................';
const CALL = '4.4.5-..4.4.2---' + R16, RESP = R16 + '2.2.0-..2.2.0---', CALL2 = '0.2.4.5-4-2.0---' + R16;   // chant call and response, two bars
const FILL_T = { J:'............x.x.', t:'.............x.x', s:'............x.xX' }, FILL_S = { s:'............XXXX', k:'............x...' };

const T = {};
// ---------------------------------------------------------------- 日没 title (E minor, 150): dark hybrid, a night-drive pulse under chants
// user, 2026-11-19: "remove the high notes on the theme so it is just the drums and bass synths". keep: the only parts this theme plays
// (the rest of its data stays, silent). Phones heard nothing of a drums-and-808 bed (-22.6 LUFS on the phone model against -18.2 before),
// so the 808 gets grit (a parallel hard-driven copy band-passed 350-1800 Hz), the kit is up 1.7 dB and presence is 9; bedGain re-measured.
T.title = { name:'Sundown', kanji:'日没', bpm:150, key:'E', mode:'minor', gain:1.047, bedGain:1.072, keep:['bass', 'kit'], dly:{ b:.75, fb:.35 }, bassLow:'E1', padLow:'G3', arpLow:'E4', lp:false,
  parts:{ lead:{ inst:'scream', pan:.05, dly:.25, rev:.3, drive:3, cab:3400, vol:1.14 }, pad:{ inst:'spad', fig:'hold', rev:.45, wide:.7, pump:.6, vol:1.11 },
    bass:{ inst:'b808', fig:'1-----1---8-1-5-', glide:true, drive:2.2, grit:{ k:10, g:3 }, vol:0.232 }, arp:{ inst:'pluck', arp:true, fig:'0213021302130213', wide:.5, dly:.35, rev:.25, lay:2, vol:1.15 },
    
    stab:{ inst:'stab', fig:'x..x..x...x..x..', wide:.6, rev:.3, lay:4, vol:1.5 }, kit:{ kit:true, rev:.22, vol:1.05 } },
  kit:{ I:{ K:'x...............', h:'..x...x...x...x.', J:'x.......x.......' }, A:{ k:'x...x...x...x...', s:'....X.......X...', h2:'.x.x.x.x.x.x.x.x', J:'x...............', o:'..............x.' },
    B:{ k:'x.x.......x.x...', s:'....X..g.g..X..g', h:'x.x.x.x.x.x.x.x.', J:'x.......x.......' }, C:{ k:'x.........x.....', s:'........X.......', h:'x.x.x.x.x.x.x.x.' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Em9 Cmaj7 Am9 B7sus4', play:'pad bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Em9 Cmaj7 D6 Bm7 Em9 Cmaj7 Am7 B7', play:'lead pad bass kit stab', drop:true,
      lead:'B4:2 .:2 E5:2 .:2 G5:4 F#5:2 E5:2 | G5:6 E5:2 B4:8 | A4:2 .:2 D5:2 .:2 F#5:4 E5:2 D5:2 | F#5:6 D5:2 A4:8 | B4:2 .:2 E5:2 .:2 G5:4 B5:2 A5:2 | B5:6 G5:2 E5:4 G5:4 | C6:4 B5:2 A5:2 E6:6 .:2 | D#6:4 B5:4 F#5:8' },
    B:{ bars:8, ch:'Cmaj7 D6 Bm7 Em9 Am9 D9 Gmaj7 B7sus4', play:'lead pad bass kit arp stab', kit:'B', rise:true,
      lead:'E5:2 G5:2 .:2 B5:2 .:2 A5:2 G5:4 | F#5:2 A5:2 .:2 B5:2 .:2 A5:2 F#5:4 | F#5:2 B5:2 .:2 D6:2 .:2 C#6:2 B5:4 | G5:2 B5:2 .:2 E6:2 .:2 D6:2 B5:4 | E6:4 .:2 C6:2 B5:4 A5:4 | F#6:4 .:2 E6:2 D6:4 C6:4 | D6:4 B5:4 F#5:4 G5:4 | E5:4 F#5:4 A5:4 B5:4' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bass kit arp stab', drop:true },
    D:{ bars:8, ch:'Cmaj7 Dsus2 Em9 Em9 Cmaj7 Dsus2 B7sus4 B7', play:'lead pad bass kit arp', kit:'C', rise:true,
      lead:'E5:3 B5:3 A5:2 G5:4 F#5:4 | E5:16 | B4:3 F#5:3 E5:2 D5:4 B4:4 | B4:16 | E5:3 B5:3 A5:2 G5:4 B5:4 | D6:8 E6:8 | F#6:8 E6:8 | D#6:8 B5:8' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Cmaj7 Bm7 Am9 B7sus4', play:'pad kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bass kit arp stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 港 Harbour Line (E minor, 148): gritty 70s bosozoku rock, a call horn
T.harbour = { name:'Harbour Line', kanji:'港', bpm:148, key:'E', mode:'minor', gain:1.060, bedGain:1.122, dly:{ b:.75, fb:.25 }, bassLow:'E1', padLow:'G3', arpLow:'E4',
  parts:{ lead:{ inst:'horn', pan:.05, dly:.2, rev:.25, drive:2, cab:2600, vol:1.07 }, lead2:{ inst:'horn', pan:-.1, dly:.15, rev:.2, vol:0.446, src:'lead', tr:-12, lay:3, drive:2, cab:2200 },
    gtr:{ inst:'gtr', pow:true, low:'E2', fig:'x-.xx-.xx-.xx-x.', drive:9, cab:2800, wide:.8, rev:.15, lay:1, vol:0.2 }, bass:{ inst:'reese', fig:'1.1.1.1.1.1.1.8.', drive:2, vol:0.923 },
    solo:{ inst:'scream', pan:.08, dly:.25, rev:.3, drive:3, cab:3000, vol:1.1 }, 
    stab:{ inst:'stab', fig:'x.......x.......', wide:.6, rev:.3, lay:4, vol:1.5 }, kit:{ kit:true, rev:.2, vol:0.977 } },
  kit:{ I:{ v:'x.x.x...x.x.x...', k:'x...............', J:'x.......x.......' }, A:{ k:'x.....x.x.x.....', s:'....X.......X...', h:'x.x.x.x.x.x.x.x.', o:'..............x.', v:'x.x.............' },
    B:{ k:'x.....x.x.x.....', s:'....X.......X...', r:'x.x.x.x.x.x.x.x.', J:'x.......x.......', v:'x.x.......x.x...' }, C:{ k:'x.........x.....', s:'........X.......', h:'x.x.x.x.x.x.x.x.', v:'x.x.x...........' }, fill:FILL_S },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'E5 C5 D5 B5', play:'bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'E5 C5 D5 B5 E5 C5 D5 B5', play:'lead gtr bass kit stab', drop:true,
      lead:'E5:1 .:1 E5:1 .:1 G5:2 .:2 A5:2 G5:2 E5:4 | G5:1 .:1 G5:1 .:1 E5:2 .:2 C5:4 .:4 | D5:1 .:1 D5:1 .:1 F#5:2 .:2 A5:2 F#5:2 D5:4 | F#5:6 E5:2 D#5:8 | E5:1 .:1 E5:1 .:1 G5:2 .:2 B5:2 A5:2 G5:4 | C6:2 .:2 B5:2 .:2 G5:2 E5:2 G5:4 | A5:2 .:2 D6:4 .:2 C6:2 A5:4 | B5:12 .:4' },
    B:{ bars:8, ch:'A5 C5 D5 E5 A5 C5 B5 B5', play:'solo gtr bass kit stab', kit:'B', rise:true,
      solo:'E5:4 A5:4 .:2 G5:2 E5:4 | G5:4 C6:4 .:2 B5:2 G5:4 | A5:4 D6:4 .:2 C6:2 A5:4 | B5:8 E6:8 | E6:4 C6:2 A5:2 E5:4 A5:4 | E6:4 C6:2 G5:2 E5:4 G5:4 | F#6:4 D#6:4 B5:4 F#5:4 | B5:16' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead gtr bass kit stab', drop:true },
    D:{ bars:8, ch:'E5 E5 G5 A5 E5 E5 C5 B5', play:'lead gtr bass kit', kit:'C', rise:true, figs:{ gtr:'x-------x-------' },
      lead:'E5:8 .:8 | G5:4 E5:4 .:8 | G5:8 B5:8 | A5:16 | E6:8 .:8 | D6:4 B5:4 .:8 | C6:8 G5:8 | F#5:8 D#5:8' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'E5 C5 D5 B5', play:'gtr bass kit', kit:'C', rise:true, figs:{ gtr:'x-------x-------' } },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead lead2 gtr bass kit stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 橋 Bay Bridge (D minor, 156): hybrid electronic rock under rain
// Darker, harder. Already D minor, but the maj7s and B's relative-major circle (Gm9 C9 Fmaj7 Bbmaj7) read bright: triads, B turns back to Dm,
// A7 (the raised 7th) at the loop's end, the reese galloping in 8ths and 16ths.
T.bay = { name:'Bay Bridge', kanji:'橋', bpm:156, key:'D', mode:'minor', gain:1.071, bedGain:1.148, dly:{ b:.75, fb:.32 }, bassLow:'D1', padLow:'F3', arpLow:'D4',
  parts:{ lead:{ inst:'super', pan:.05, dly:.25, rev:.3, vol:2.43 }, ost:{ inst:'pluck', arp:true, fig:'0120312001203120', wide:.6, dly:.2, rev:.2, vol:1.43 },
    gtr:{ inst:'gtr', pow:true, low:'D2', fig:'x-------x---x-x-', drive:7, cab:2600, wide:.8, rev:.15, lay:1, vol:0.219 }, bass:{ inst:'reese', fig:'1.181.181.181.18', drive:2.5, vol:0.596 },
    pad:{ inst:'spad', fig:'hold', rev:.45, wide:.7, pump:.5, vol:1.12 }, 
    stab:{ inst:'stab', fig:'x..x..x.........', wide:.6, rev:.3, lay:4, vol:1.5 }, kit:{ kit:true, rev:.22, vol:0.785 } },
  kit:{ I:{ J:'x.......x.x.....', h:'..x...x...x...x.' }, A:{ k:'x.....x...x.....', s:'....X.......X...', h:'x.x.x.x.x.x.x.x.', J:'x.......x.......', h2:'.g.g.g.g.g.g.g.g' },
    B:{ k:'x.x.......x.x...', s:'....X..g.g..X..g', h:'x.x.x.x.x.x.x.x.', J:'x...x...........', o:'..............x.' }, C:{ k:'x.........x.....', s:'........X.......', J:'x.......x.......' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Dm Bb C Am', play:'ost pad kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Dm Bb C Am Dm Bb Gm A7', play:'lead ost gtr bass kit stab', drop:true,
      lead:'D5:2 .:1 F5:1 A5:4 G5:3 F5:3 E5:2 | F5:6 D5:2 A5:8 | E5:2 .:1 G5:1 C6:4 B5:3 A5:3 G5:2 | E5:6 C5:2 A4:8 | D5:2 .:1 F5:1 A5:4 C6:3 A5:3 F5:2 | Bb5:6 A5:2 F5:8 | G5:2 .:1 Bb5:1 D6:4 F6:4 E6:4 | D6:8 E6:8' },
    B:{ bars:8, ch:'Gm9 C Dm Bb Em7b5 A7 Dm A7sus4', play:'lead ost gtr bass pad kit stab', kit:'B', rise:true,
      lead:'Bb5:4 A5:2 G5:2 D6:8 | E6:4 D6:2 C6:2 G5:8 | A5:4 C6:2 E6:2 F6:8 | D6:12 .:4 | G5:4 Bb5:2 D6:2 E6:8 | C#6:4 E6:4 G6:8 | F6:4 E6:2 D6:2 A5:8 | G5:4 A5:4 D6:8' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead ost gtr bass pad kit stab', drop:true },
    D:{ bars:8, ch:'Bb C Dm Dm Bb C A A7', play:'lead ost pad bass kit', kit:'C', rise:true,
      lead:'F5:8 A5:8 | G5:8 E5:8 | D5:3 A5:3 G5:2 F5:4 E5:4 | D5:16 | F5:8 A5:8 | C6:8 E6:8 | C#6:8 A5:8 | E6:8 G5:8' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Bb C Am A7', play:'ost pad kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead ost gtr bass pad kit stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 街 Neon Ward (A minor, 140): phonk and drift, a cowbell hook over 808
T.neon = { name:'Neon Ward', kanji:'街', bpm:140, key:'A', mode:'minor', gain:1.258, dly:{ b:.75, fb:.3 }, bassLow:'A0', padLow:'G3', arpLow:'A3',
  parts:{ lead:{ inst:'cowbell', pan:.08, dly:.22, rev:.15, vol:3.35 }, bass:{ inst:'b808', fig:'1-----1-..1-8-5-', glide:true, drive:3, vol:0.2 },
    pad:{ inst:'spad', fig:'hold', rev:.4, wide:.8, pump:.7, lay:1, vol:1.12 }, 
    solo:{ inst:'scream', pan:.06, dly:.3, rev:.3, drive:3, cab:3200, vol:1.06 }, stab:{ inst:'stab', fig:'x..x..x...x.....', wide:.6, rev:.3, lay:4, vol:1.5 }, kit:{ kit:true, rev:.16, vol:0.861 } },
  kit:{ I:{ K:'x...............', h:'x.x.x.x.x.x.x.x.' }, A:{ K:'x.....x...x.....', c:'....X.......X...', h:'x.x.x.x.x.x.x.x.', y:'.......x.......x' },
    B:{ K:'x.....x...x.....', c:'....X.......X...', h:'x.x.x.x.x.x.x.x.', o:'..x...x...x...x.', y:'...x.......x....' }, C:{ K:'x...............', c:'........X.......', y:'.......x.......x' },
    fill:{ c:'............xxXX', K:'............x...' } },
  form:['I', 'A', 'B', 'A2', 'C', 'A3'], loop:'A', style:{ k8:1.1 },
  sec:{ I:{ bars:4, ch:'Am F G Em', play:'bass kit pad', kit:'I', rise:true },
    A:{ bars:8, ch:'Am F G Em Am F Dm E7', play:'lead bass kit pad stab', drop:true,
      lead:'A5:3 E6:3 D6:2 C6:3 B5:3 A5:2 | A5:2 .:1 A5:2 .:1 C6:2 A5:2 .:2 F5:4 | G5:3 D6:3 C6:2 B5:3 A5:3 G5:2 | E5:2 .:1 E5:2 .:1 G5:2 B5:2 .:2 E6:4 |' +
           'A5:3 E6:3 D6:2 C6:3 B5:3 A5:2 | A5:2 .:1 A5:2 .:1 C6:2 A5:2 .:2 F5:4 | D6:3 A5:3 F5:2 E5:3 D5:3 C5:2 | E5:2 .:1 G#5:2 .:1 B5:2 D6:2 .:2 E6:4' },
    B:{ bars:8, ch:'Fmaj7 G Em Am Dm G C E7', play:'solo bass kit pad stab', kit:'B', rise:true,
      solo:'C6:8 A5:8 | B5:8 D6:8 | G5:6 E5:2 B5:8 | A5:16 | F5:8 A5:8 | B5:8 D6:8 | E6:8 C6:8 | G#5:8 B5:8' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead bass kit pad stab', drop:true },
    C:{ bars:4, ch:'F G Em E7', play:'pad kit bass', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead solo bass kit pad stab', kit:'B', drop:true, solo:'.:16 | .:16 | .:16 | .:16 | C6:8 A5:8 | .:16 | F5:8 E5:8 | .:16' } } };

// ---------------------------------------------------------------- 隧 Night Tunnels (E phrygian, 174): dark drum'n'bass, the walls rushing past
T.tunnels = { name:'Night Tunnels', kanji:'隧', bpm:174, key:'E', mode:'phrygian', gain:1.135, bedGain:1.189, dly:{ b:.75, fb:.42 }, bassLow:'E1', padLow:'E3', arpLow:'E4',
  parts:{ lead:{ inst:'scream', pan:.05, dly:.35, rev:.35, drive:2.5, cab:3000, vol:1.15 }, pad:{ inst:'spad', fig:'hold', rev:.55, wide:.8, vol:1.11 },
    bass:{ inst:'reese', fig:'1-------1---8---', drive:3, vol:0.55 }, arp:{ inst:'pluck', arp:true, fig:'0.2.1.3.0.2.1.3.', wide:.6, dly:.4, rev:.3, lay:2, vol:1.41 },
    stab:{ inst:'stab', fig:'x.......x.......', wide:.6, rev:.4, lay:4, vol:1.5 }, kit:{ kit:true, rev:.18, vol:1.41 } },
  kit:{ I:{ h:'x.x.x.x.x.x.x.x.', J:'x...............' }, A:{ k:'x.........x.....', s:'....X..g.g..X...', h:'x.x.x.x.x.x.x.x.', h2:'.x.x.x.x.x.x.x.x' },
    B:{ k:'x.......x.x.....', s:'....X.......X..g', h:'xxxxxxxxxxxxxxxx', o:'..x.............' }, C:{ k:'x...............', s:'........X.......', h:'x.x.x.x.x.x.x.x.' }, fill:FILL_S },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Em Emadd9 F Dm', play:'pad bass kit arp', kit:'I', rise:true },
    A:{ bars:8, ch:'Em Emadd9 F Dm Em Emadd9 Fmaj7 Dm', play:'lead pad bass kit stab', drop:true,
      lead:'E5:6 G5:2 B5:6 .:2 | A5:2 G5:2 F#5:4 E5:6 .:2 | F5:6 A5:2 C6:6 .:2 | D6:2 C6:2 A5:4 F5:6 .:2 | E5:6 G5:2 B5:6 .:2 | F#6:6 E6:2 B5:6 .:2 | E6:4 C6:2 A5:2 F6:8 | D6:8 A5:6 .:2' },
    B:{ bars:8, ch:'C Dm Em Em C Dm F G', play:'lead pad bass kit arp stab', kit:'B', rise:true,
      lead:'G5:2 .:2 G5:2 C6:2 .:2 E6:2 D6:4 | A5:2 .:2 A5:2 D6:2 .:2 F6:2 E6:4 | B5:2 .:2 B5:2 E6:2 .:2 G6:2 E6:4 | E6:16 | G6:4 E6:4 C6:4 G5:4 | F6:4 D6:4 A5:4 F5:4 | A5:4 C6:4 F6:8 | D6:8 B5:8' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bass kit arp stab', drop:true },
    D:{ bars:8, ch:'Em Em C C Em Em F F', play:'lead pad bass kit arp', kit:'C', rise:true,
      lead:'B5:16 | .:16 | C6:8 G5:8 | E5:16 | B5:8 E6:8 | .:16 | F6:8 C6:8 | A5:16' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Em F Em Dm', play:'pad bass kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bass kit arp stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 峠 Mountain Pass (E minor / bII, 160): touge, Eurobeat drive with taiko
// Darker, harder, a light touch: B's Cmaj7 sheen out (C), B7 (the raised 7th) at its cadence.
T.pass = { name:'Mountain Pass', kanji:'峠', bpm:160, key:'E', mode:'minor', gain:1.110, bedGain:1.230, dly:{ b:.75, fb:.3 }, bassLow:'E1', padLow:'G3', arpLow:'E4',
  parts:{ lead:{ inst:'super', pan:.05, dly:.2, rev:.25, wide:.3, vol:1.7 }, lead2:{ inst:'super', pan:-.12, dly:.15, rev:.2, vol:0.94, src:'lead', tr:-12, lay:3 },
    stab:{ inst:'stab', fig:'x..x..x.x..x..x.', wide:.7, rev:.25, lay:1, vol:1.51 }, pad:{ inst:'spad', fig:'hold', rev:.35, wide:.7, pump:.5, vol:1.11 },
    bass:{ inst:'reese', fig:'1.8.1.8.1.8.1.8.', drive:1.5, vol:1.15 }, arp:{ inst:'pluck', arp:true, fig:'0124201242012420', wide:.6, dly:.25, rev:.2, lay:2, vol:1.17 }, kit:{ kit:true, rev:.2, vol:0.733 } },
  kit:{ I:{ k:'x...x...x...x...', J:'x.....x.........' }, A:{ k:'x...x...x...x...', c:'....X.......X...', o:'..x...x...x...x.', h2:'.x.x.x.x.x.x.x.x', J:'x.....x.........' },
    B:{ k:'x...x...x...x...', s:'....X.......X...', o:'..x...x...x...x.', r:'x.x.x.x.x.x.x.x.', J:'x.....x...x.....', j:'...x.......x....' }, C:{ k:'x.........x.....', s:'........X.......', J:'x..x..x.........' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Em F Em D', play:'stab pad bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Em F Em D Em F Am B', play:'lead pad bass kit stab', drop:true,
      lead:'E5:2 G5:2 B5:3 A5:1 G5:2 E5:2 B5:4 | A5:2 F5:2 A5:3 G5:1 F5:2 E5:2 C5:4 | E5:2 G5:2 B5:3 A5:1 G5:2 B5:2 E6:4 | D6:6 C6:2 A5:4 F#5:4 | G5:2 B5:2 E6:3 D6:1 B5:2 G5:2 E6:4 | F6:6 E6:2 C6:4 A5:4 | E6:2 C6:2 E6:3 F6:1 E6:2 C6:2 A5:4 | D#6:8 B5:8' },
    B:{ bars:8, ch:'C D Bm7 Em C D B7sus4 B7', play:'lead pad bass kit stab arp', kit:'B', rise:true,
      lead:'G5:2 G6:2 .:2 E6:2 D6:4 C6:4 | F#5:2 F#6:2 .:2 E6:2 D6:4 A5:4 | D6:2 .:2 D6:2 B5:2 A5:4 F#5:4 | G5:6 B5:2 E6:8 | G5:2 G6:2 .:2 E6:2 D6:4 C6:4 | F#5:2 F#6:2 .:2 A6:2 G6:4 F#6:4 | E6:8 F#6:8 | Eb6:8 B5:8' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bass kit stab arp', drop:true },
    D:{ bars:8, ch:'Am Am Em Em F F B B', play:'lead pad bass kit', kit:'C', rise:true,
      lead:'C6:8 A5:8 | E6:8 .:8 | B5:8 G5:8 | E5:16 | A5:8 C6:8 | F6:8 E6:8 | D#6:8 F#6:8 | B5:16' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Em F Em B', play:'pad bass kit arp', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead lead2 pad bass kit stab arp', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 油 Refinery Docks (A minor, Andalusian, 145): industrial, metal on metal
T.refinery = { name:'Refinery Docks', kanji:'油', bpm:145, key:'A', mode:'minor', gain:1.097, bedGain:1.174, dly:{ b:.75, fb:.35 }, bassLow:'A0', padLow:'E3', arpLow:'A3',
  parts:{ lead:{ inst:'scream', pan:.05, dly:.3, rev:.3, drive:3.5, cab:2800, vol:0.861 }, pad:{ inst:'spad', fig:'hold', rev:.5, wide:.8, vol:1.11 },
    gtr:{ inst:'gtr', pow:true, low:'E2', fig:'x-x.x-x.x-x.xx-.', drive:9, cab:2600, wide:.8, rev:.12, lay:1, vol:0.2 }, bass:{ inst:'reese', fig:'1--.1.1.1--.8.1.', drive:3, vol:0.582 },
    stab:{ inst:'stab', fig:'x.....x.......x.', wide:.6, rev:.3, lay:4, vol:1.5 }, kit:{ kit:true, rev:.2, vol:0.7 } },
  kit:{ I:{ J:'x.......x.......', e:'....x.......x...', g:'x...............' }, A:{ k:'x.....x...x.....', s:'....X.......X...', e:'..x.......x...x.', J:'x.......x.......', h:'x.x.x.x.x.x.x.x.' },
    B:{ k:'x.....x...x.....', s:'....X.......X...', e:'..x...x...x...x.', J:'x...x...x...x...', h:'x.x.x.x.x.x.x.x.', v:'x.x.............' }, C:{ g:'x...............', J:'x.......x.......', e:'....x.......x...' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Am G F E', play:'pad bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Am G F E Am G F E7', play:'lead pad gtr bass kit', drop:true,
      lead:'A4:2 .:2 C5:2 E5:2 .:2 D5:2 C5:4 | B4:2 .:2 D5:2 G5:2 .:2 F5:2 D5:4 | A4:2 .:2 C5:2 F5:2 .:2 E5:2 C5:4 | G#4:4 B4:4 E5:4 F5:2 E5:2 | A5:2 .:2 C6:2 E6:2 .:2 D6:2 C6:4 | B5:2 .:2 D6:2 G6:2 .:2 F6:2 D6:4 | C6:4 A5:4 F5:4 A5:4 | G#5:4 F5:2 E5:2 D5:4 B4:4' },
    B:{ bars:8, ch:'Dm Am E Am F G E E7', play:'lead pad gtr bass kit stab', kit:'B', rise:true,
      lead:'F5:4 A5:4 D6:8 | C6:4 A5:4 E5:8 | G#5:4 B5:4 E6:8 | A5:12 .:4 | A5:4 C6:4 F6:8 | G6:8 F6:4 D6:4 | E6:4 D6:4 B5:4 G#5:4 | E5:16' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead pad gtr bass kit stab', drop:true },
    D:{ bars:8, ch:'F F E E Dm Dm E E', play:'lead pad gtr bass kit', kit:'C', rise:true, figs:{ gtr:'x-------x-------' },
      lead:'A5:16 | C6:8 A5:8 | G#5:16 | .:16 | F5:8 A5:8 | D6:16 | B5:8 G#5:8 | E5:16' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Am G F E', play:'pad bass kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead pad gtr bass kit stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 湘 Shonan Coast (D minor, 160): the sea road at full tilt, breakbeat and supersaws
// Darker, harder (user: "too happy instead of slick, cool, gritty, adrenaline pounding"). Was D major at 152 (I V vi IV, maj9 sheen): the same
// root motion moved to the parallel minor (i v bVI iv), the maj7s stripped, A7 (the raised 7th) at the cadences, a 16th-note octave reese gallop with a breath each beat
// and a harder break. The melody data follows the new mode (muted: MUSIC.LEADS).
T.coast = { name:'Shonan Coast', kanji:'湘', bpm:160, key:'D', mode:'minor', gain:1.036, bedGain:1.189, dly:{ b:.75, fb:.3 }, bassLow:'D1', padLow:'F3', arpLow:'D4',
  parts:{ lead:{ inst:'super', pan:.05, dly:.22, rev:.28, wide:.3, vol:2 }, pad:{ inst:'spad', fig:'hold', rev:.4, wide:.8, pump:.5, vol:1.12 },
    ost:{ inst:'pluck', arp:true, fig:'0213021302130213', wide:.6, dly:.2, rev:.2, lay:1, vol:1.45 }, bass:{ inst:'reese', fig:'11.811.811.811.8', drive:1.5, vol:1.14 },
    gtr:{ inst:'gtr', pow:true, low:'D2', fig:'x-.x-.x-x-.x-.x-', drive:7, cab:2800, wide:.8, rev:.12, lay:2, vol:0.226 }, 
    stab:{ inst:'stab', fig:'x..x..x...x..x..', wide:.6, rev:.3, lay:4, vol:1.5 }, kit:{ kit:true, rev:.2, vol:0.923 } },
  kit:{ I:{ k:'x.x.......x.x...', h:'x.x.x.x.x.x.x.x.' }, A:{ k:'x.x.......x.x..x', s:'....X..g.g..X..g', h:'x.x.x.x.x.x.x.x.', h2:'.g.g.g.g.g.g.g.g', o:'..............x.', J:'x.......x.......' },
    B:{ k:'x...x...x...x...', s:'....X.......X...', c:'....X.......X...', o:'..x...x...x...x.', h2:'.x.x.x.x.x.x.x.x', J:'x.......x.......' }, C:{ k:'x.........x.....', s:'........X.......', h:'x.x.x.x.x.x.x.x.' }, fill:FILL_S },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Dm9 Am Bb Gm7', play:'pad ost bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Dm9 Am Bb Gm7 Dm9 Am Em7b5 A7sus4', play:'lead pad ost bass kit gtr stab', drop:true,
      lead:'F5:2 A5:2 .:2 D6:4 C6:2 A5:4 | E5:2 A5:2 .:2 C6:4 Bb5:2 A5:4 | F5:2 Bb5:2 .:2 D6:4 C6:2 Bb5:4 | D6:6 Bb5:2 G5:8 | F5:2 A5:2 .:2 D6:4 E6:2 F6:4 | E6:6 C6:2 A5:8 | G5:2 Bb5:2 .:2 E6:4 F6:2 G6:4 | E6:8 D6:8' },
    B:{ bars:8, ch:'Gm7 Am Bb Dm/F Gm7 Am Dm Gm7', play:'lead pad ost bass kit gtr stab', kit:'B', rise:true,
      lead:'Bb5:4 A5:2 G5:2 D6:8 | C6:4 Bb5:2 A5:2 E6:8 | D6:4 C6:2 Bb5:2 F6:8 | F6:4 E6:4 D6:8 | Bb5:4 D6:4 G6:8 | C6:4 E6:4 A5:8 | C6:6 A5:2 E6:8 | D6:8 Bb5:8' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead pad ost bass kit gtr stab', drop:true },
    D:{ bars:8, ch:'Em7b5 A7 Dm9 Bb Em7b5 A7 Gm7 A7sus4', play:'lead pad ost bass kit', kit:'C', rise:true,
      lead:'Bb5:8 G5:8 | C#6:8 E5:8 | F5:3 A5:3 C6:2 E6:8 | D6:16 | G5:8 Bb5:8 | E6:8 C#6:8 | F6:8 D6:8 | E6:16' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Gm7 Am Bb A7', play:'pad ost kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead pad ost bass kit gtr stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 雪 Snow Onsen (G# minor, 124 in half time): the hush, ice over a warm sub
// Re-composed 2026-11-21 (the old theme went silent with the voices). A hush: no lead, no impact in the body; the identity is a glock
// figure stepping in threes (crystal drops) high over a warm sine sub in 3+3+2 and a low muted pluck heartbeat, Emaj7 (bVI) for the
// steam, D#7 (the raised 7th) at the cadences for the cold. D is the hush itself: the kit leaves for 8 bars, only ice, pad and sub.
T.snow = { name:'Snow Onsen', kanji:'雪', bpm:124, key:'G#', mode:'minor', gain:1.29, bedOnly:true, dly:{ b:1.5, fb:.45 }, bassLow:'F#1', padLow:'D#3', arpLow:'G#5',
  parts:{ ice:{ inst:'glock', arp:true, fig:'0..3..1..4..2...', wide:.6, dly:.5, rev:.6, vol:1 },
    ice2:{ inst:'glock', arp:true, fig:'................5.......3.......', o:{ d:2.4 }, low:'D#5', wide:.4, dly:.6, rev:.7, lay:2, vol:1.4 },
    mot:{ inst:'pluck', arp:true, fig:'0.0.1.0.2.0.1.0.', low:'G#2', o:{ cut:280, fenv:900 }, rev:.2, lay:1, vol:2.2 },
    bass:{ inst:'subB', fig:'1..1....1..8.5..', vol:.4 }, pad:{ inst:'spad', fig:'hold', o:{ cut:850 }, rev:.7, wide:.8, vol:1 }, kit:{ kit:true, rev:.35, vol:1 } },
  kit:{ I:{ g:'x...............' }, A:{ k:'x.........x.....', s:'........X.......', h:'x.x.x.x.x.x.x.x.', J:'x...............' },
    B:{ k:'x.....x...x.....', s:'........X.....g.', h:'x.x.x.x.x.x.x.x.', h2:'.x.x.x.x.x.x.x.x', J:'x...............' }, C:{ h:'..x...x...x...x.', J:'x...............' }, fill:{ s:'..............gx' } },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{ soft:true },
  sec:{ I:{ bars:4, ch:'G#m9 Emaj7 C#m9 D#7sus4', play:'ice pad bass kit', kit:'I' },
    A:{ bars:8, ch:'G#m9 Emaj7 C#m9 D#7sus4 G#m9 Emaj7 C#m9 D#7', play:'ice mot pad bass kit' },
    B:{ bars:8, ch:'Emaj7 F#6 D#m7 G#m9 Emaj7 F#6 C#m9 D#7sus4', play:'ice ice2 mot pad bass kit', kit:'B', rise:true },
    A2:{ bars:8, ch:'@A', play:'ice ice2 mot pad bass kit', drop:true },
    D:{ bars:8, ch:'Emaj7 Emaj7 C#m9 C#m9 Emaj7 Emaj7 D#7sus4 D#7', play:'ice ice2 pad bass' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Emaj7 F#6 C#m9 D#7', play:'ice pad bass kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', play:'ice ice2 mot pad bass kit', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 田 Rice Paddies (G minor, 156): a taiko ensemble and gamelan in the moonlit fields
// Darker, harder. Was G mixolydian at 150 (Gadd9 Em7 Dsus2 F6: folk-bright): G minor (Gm(add9) Eb Dsus2 F), D major at the cadences and
// a phrygian bII (Ab -> Gm) to close the breakdown; the taiko drive gets a kick under it.
T.paddies = { name:'Rice Paddies', kanji:'田', bpm:156, key:'G', mode:'minor', gain:1.047, bedGain:1.096, dly:{ b:.75, fb:.35 }, bassLow:'G0', padLow:'G3', arpLow:'G4',
  parts:{ lead:{ inst:'super', o:{ cut:1300, fenv:1800 }, pan:.05, dly:.3, rev:.4, wide:.3, vol:1.91 }, koto:{ inst:'koto', arp:true, fig:'0.21.0.21.0.2.4.', wide:.5, dly:.25, rev:.35, vol:0.933 },
    gam:{ inst:'gamelan', arp:true, fig:'4.2.0.2.4.5.4.2.', wide:.5, dly:.2, rev:.4, lay:2, vol:0.902 }, 
    pad:{ inst:'spad', fig:'hold', rev:.55, wide:.8, lay:2, vol:0.989 }, bass:{ inst:'subB', fig:'1..5..8.1..5..8.', vol:0.733 }, kit:{ kit:true, rev:.25, vol:0.692 } },
  kit:{ I:{ J:'x.......x.......', j:'..x...x...x...x.' }, A:{ k:'x.....x.x.x.....', s:'....X.......X...', j:'..x..x..x..x.x.x', J:'x.......x.......', h:'x.x.x.x.x.x.x.x.' },
    B:{ k:'x.......x.x.....', s:'....X.......X...', j:'xxxxxxxxxxxxxxxx', J:'x..x..x...x.....', h:'x.x.x.x.x.x.x.x.' }, C:{ J:'x..x..x...x.x...', j:'..x...x...x...x.' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Gmadd9 Eb Dsus2 F', play:'koto bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Gmadd9 Eb Dsus2 F Gmadd9 Eb Cmadd9 D', play:'lead koto bass kit', drop:true,
      lead:'D5:2 G5:2 A5:2 .:2 Bb5:2 A5:2 G5:4 | Eb5:2 G5:2 A5:2 .:2 Bb5:4 D5:4 | A5:2 D6:2 E6:2 .:2 D6:2 A5:2 E5:4 | F5:6 A5:2 C6:4 D6:4 | D5:2 G5:2 A5:2 .:2 D6:2 Eb6:2 D6:4 | Eb6:6 D6:2 Bb5:8 | C6:2 D6:2 Eb6:2 .:2 G6:4 Eb6:4 | D6:8 A5:8' },
    B:{ bars:8, ch:'Cmadd9 D Bb Eb Cmadd9 D F Gm', play:'lead koto gam pad bass kit', kit:'B', rise:true,
      lead:'Eb6:4 D6:4 C6:4 G5:4 | D6:4 Eb6:4 F#6:4 A5:4 | D6:8 Bb5:4 A5:4 | G5:8 Eb5:8 | G5:4 C6:4 Eb6:4 G6:4 | F#6:8 D6:8 | F6:4 C6:4 A5:4 F5:4 | G5:16' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead koto gam pad bass kit', drop:true },
    D:{ bars:8, ch:'Eb Eb Cmadd9 Cmadd9 Eb Eb F D', play:'lead koto pad bass kit', kit:'C', rise:true,
      lead:'Bb5:16 | .:16 | G5:8 Eb6:8 | D6:16 | Bb5:8 D6:8 | .:16 | C6:8 A5:8 | D6:16' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Cmadd9 D Ab Gm', play:'pad kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead koto gam pad bass kit', kit:'B', drop:true } } };

// Aqua-Line lead, round 4 (user: "the bass is awesome with the bells, we just need a better melody"): the bass, bells, drums and
// arrangement are untouched; only the lead strings below are new. The hook lands in the bells' gaps (steps 2, 4, 7, 10), bar 5-6 = bar 1-2.
// ---------------------------------------------------------------- 海 Aqua-Line (D minor, 170): rolling drum'n'bass under the bay
// Darker, harder, a light touch: the A section, the bass and the bells' figure are untouched (approved). B no longer opens and closes on Fmaj7
// (Dm9 ... Dm), the cadences land on A7 (the raised 7th), ghost snares drive the A kit.
T.aqua = { name:'Aqua-Line', kanji:'海', bpm:170, key:'D', mode:'minor', gain:1.023, bedGain:1.109, dly:{ b:.75, fb:.42 }, bassLow:'D1', padLow:'F3', arpLow:'D5',
  parts:{ lead:{ inst:'super', o:{ cut:1500 }, pan:.05, dly:.3, rev:.4, wide:.3, vol:1.78 }, pad:{ inst:'spad', fig:'hold', rev:.5, wide:.8, pump:.5, vol:1.11 },
    bell:{ inst:'glock', arp:true, fig:'0..2..4..3..1...', wide:.5, dly:.4, rev:.5, lay:1, vol:1.55 }, bass:{ inst:'reese', fig:'1-------1-----8-', drive:1.5, vol:1.04 },
    stab:{ inst:'stab', fig:'x.......x..x....', wide:.6, rev:.3, lay:4, vol:1.5 }, kit:{ kit:true, rev:.2, vol:1.5 } },
  kit:{ I:{ h:'x.x.x.x.x.x.x.x.' }, A:{ k:'x.........x.....', s:'....X..g.g..X.g.', h:'x.x.x.x.x.x.x.x.', h2:'.x.x.x.x.x.x.x.x' },
    B:{ k:'x.......x.x.....', s:'....X.......X..g', h:'xxxxxxxxxxxxxxxx', r:'x...x...x...x...' }, C:{ k:'x...............', s:'........X.......', h:'x.x.x.x.x.x.x.x.' }, fill:FILL_S },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Dm9 Cadd9 Bbmaj7 Am7', play:'pad bell bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Dm9 Cadd9 Bbmaj7 Am7 Dm9 Cadd9 Bbmaj7 A7sus4', play:'lead pad bell bass kit stab', drop:true,
      lead:'.:2 A5:2 C6:3 D6:3 E6:4 .:2 | .:2 E6:2 D6:3 C6:3 G5:6 | .:2 F5:2 A5:3 Bb5:3 D6:4 .:2 | .:2 C6:2 A5:3 G5:3 E5:6 | .:2 A5:2 C6:3 D6:3 E6:4 .:2 | .:2 E6:2 D6:3 C6:3 G5:6 | .:2 D6:2 C6:3 Bb5:3 A5:4 .:2 | .:2 G5:2 E5:3 D5:3 A5:6' },
    B:{ bars:8, ch:'Dm9 C Dm9 Bbmaj7 Gm9 C9 Dm A7', play:'lead pad bell bass kit stab', kit:'B', rise:true,
      lead:'.:2 C6:2 A5:3 C6:3 E6:6 | .:2 E6:2 D6:3 C6:3 G5:6 | .:2 A5:2 C6:3 D6:3 E6:6 | .:2 D6:5 C6:3 A5:6 | .:2 G5:2 Bb5:3 C6:3 D6:6 | .:2 E6:5 D6:3 Bb5:6 | .:2 A5:2 C6:3 A5:3 F5:6 | .:2 E5:2 G5:3 A5:9' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bell bass kit stab', drop:true },
    D:{ bars:8, ch:'Bbmaj7 Bbmaj7 Gm9 Gm9 Bbmaj7 C Dm9 A7', play:'lead pad bell bass kit', kit:'C', rise:true,
      lead:'.:2 D6:14 | .:2 F5:6 A5:8 | .:2 Bb5:14 | .:2 A5:6 G5:8 | .:2 D6:14 | .:2 E6:6 C6:8 | .:2 A5:14 | .:2 G5:6 E5:8' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Bbmaj7 Cadd9 Dm9 A7sus4', play:'pad bell kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bell bass kit stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 島 Shimanami Kaido (G minor, 158): island to island, a wide hybrid anthem
// Darker, harder. Was G major at 150 (Gadd9 Am7 Em7 Fmaj7): the parallel minor (Gm(add9) Am7b5 Eb F), D major kept as the harmonic V,
// the bright arp down a fourth, the bass in 16ths with gaps (root, octave, fifth), a backbeat snare under the clap.
T.shimanami = { name:'Shimanami Kaido', kanji:'島', bpm:158, key:'G', mode:'minor', gain:1.110, bedGain:1.189, dly:{ b:.75, fb:.3 }, bassLow:'G0', padLow:'G3', arpLow:'G4',
  parts:{ lead:{ inst:'super', pan:.05, dly:.22, rev:.3, wide:.3, vol:1.82 }, lead2:{ inst:'super', pan:-.12, dly:.15, rev:.25, vol:0.984, src:'lead', tr:-12, lay:3 },
    pad:{ inst:'spad', fig:'hold', rev:.45, wide:.8, pump:.6, vol:1.11 }, stab:{ inst:'stab', fig:'x..x..x...x..x..', wide:.7, rev:.3, lay:1, vol:1.7 },
    bass:{ inst:'reese', fig:'1.851.851.851.85', drive:1.5, vol:1.11 }, arp:{ inst:'pluck', arp:true, fig:'0123423101234231', low:'D4', wide:.6, dly:.3, rev:.25, lay:2, vol:1.2 },
    kit:{ kit:true, rev:.2, vol:0.861 } },
  kit:{ I:{ k:'x...x...x...x...', h:'..x...x...x...x.' }, A:{ k:'x...x...x...x...', s:'....X.......X...', c:'....X.......X...', o:'..x...x...x...x.', h2:'.x.x.x.x.x.x.x.x', J:'x.......x.......' },
    B:{ k:'x.x.......x.x...', s:'....X..g.g..X..g', h:'x.x.x.x.x.x.x.x.', J:'x...............' }, C:{ k:'x.........x.....', s:'........X.......', h:'..x...x...x...x.' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Gmadd9 Am7b5 Eb F', play:'pad bass arp kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Gmadd9 Am7b5 Eb F Gmadd9 Am7b5 Cm7 D', play:'lead pad bass kit stab', drop:true,
      lead:'D5:2 G5:2 .:2 Bb5:4 A5:2 G5:4 | Eb5:2 A5:2 .:2 C6:4 Bb5:2 A5:4 | Bb4:2 Eb5:2 .:2 G5:4 A5:2 Bb5:4 | C6:6 A5:2 F5:8 | D5:2 G5:2 .:2 Bb5:4 D6:2 Eb6:4 | Eb6:6 C6:2 A5:8 | G5:2 C6:2 .:2 Eb6:4 G6:2 Eb6:4 | F#6:8 D6:8' },
    B:{ bars:8, ch:'Cm7 D Gm Eb Cm7 D F D', play:'lead pad bass kit stab arp', kit:'B', rise:true,
      lead:'Eb5:2 Eb6:2 .:2 D6:2 C6:4 G5:4 | F#5:2 F#6:2 .:2 Eb6:2 D6:4 A5:4 | D6:4 Bb5:4 F6:8 | Eb6:8 Bb5:8 | G5:2 G6:2 .:2 Eb6:2 C6:4 Eb6:4 | F#6:4 A6:4 F#6:8 | F6:4 C6:4 A5:8 | D6:16' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead pad bass kit stab arp', drop:true },
    D:{ bars:8, ch:'Eb Cm7 D D Eb Cm7 F D', play:'lead pad bass kit arp', kit:'C', rise:true,
      lead:'Bb5:8 G5:8 | Eb6:8 C6:8 | D6:3 A5:3 G5:2 F#5:4 Eb5:4 | D5:16 | Eb6:8 G6:8 | Eb6:8 C6:8 | F6:8 C6:8 | A5:8 F#5:8' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Cm7 D Eb D', play:'pad bass arp kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead lead2 pad bass kit stab arp', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 灰 Sakurajima (Bb phrygian, 140 in half time): the volcano, magma under ash
// Re-composed 2026-11-21 (the old chant theme went silent with the voices). Heavy: a down-tuned power-chord chug (its square an octave
// under) through a dark cabinet, a driven 808 that slides, a low muted pluck galloping like magma, a dark held fifth for the ash, o-daiko.
// Phrygian: the bII (B over Bb) is the menace, F7 the raised dominant. Eruptions (the E hit: a sub dive, rock cracking upward, a crash)
// land on given bars, never on a grid, so they surprise.
T.sakurajima = { name:'Sakurajima', kanji:'灰', bpm:140, key:'Bb', mode:'phrygian', gain:1.3, bedOnly:true, dly:{ b:.75, fb:.3 }, bassLow:'C1', padLow:'F3', arpLow:'Bb3',
  parts:{ gtr:{ inst:'gtr', pow:true, low:'Bb1', fig:'x-------x--x-x--', o:{ mix:[1, 1, .15] }, drive:10, cab:2400, wide:.8, rev:.15, vol:.28 },
    bass:{ inst:'b808', fig:'1------.1--.1-n-', glide:true, drive:4, vol:.09 },
    magma:{ inst:'pluck', arp:true, fig:'0.00.0.00.0.00.3', low:'Bb2', o:{ cut:450, fenv:1800 }, drive:2, rev:.15, lay:1, vol:1.7 },
    ash:{ inst:'drone', pow:true, low:'F2', fig:'hold', rev:.5, wide:.6, vol:1 },
    stab:{ inst:'stab', fig:'x-------........', o:{ cut:300, fenv:2500 }, wide:.6, rev:.4, lay:2, vol:2 }, kit:{ kit:true, rev:.25, vol:.55 } },
  kit:{ I:{ g:'x...............', J:'x.......x.......' }, A:{ k:'x.........x.....', s:'........X.......', J:'x..x..x...x..x..', h:'x.x.x.x.x.x.x.x.' },
    B:{ k:'x.....x...x.....', s:'........X.......', J:'x.x...x.x.x...x.', j:'..x...x...x...x.', h:'x.x.x.x.x.x.x.x.', o:'..............x.' }, C:{ J:'x.......x.......', g:'x...............' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Bbm B Bbm F', play:'ash bass magma kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Bbm B Bbm Ab Bbm B Gb F', play:'gtr bass magma ash kit', drop:true, hits:[[4, 0, 'E']] },
    B:{ bars:8, ch:'Gb Ab Bbm Bbm Gb Ab B F7', play:'gtr bass magma ash stab kit', kit:'B', rise:true, hits:[[2, 0, 'E'], [6, 8, 'E']] },
    A2:{ bars:8, ch:'@A', play:'gtr bass magma ash stab kit', drop:true, hits:[[4, 0, 'E']] },
    D:{ bars:8, ch:'Bbm Bbm B B Bbm Bbm F F', play:'ash bass magma kit', kit:'C', rise:true },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Gb Ab B F', play:'ash gtr kit', kit:'C', rise:true, figs:{ gtr:'x---------------' } },
    A3:{ bars:8, ch:'@A', play:'gtr bass magma ash stab kit', kit:'B', drop:true, hits:[[0, 0, 'E'], [4, 0, 'E']] } } };

// ---------------------------------------------------------------- 黒部 Kurobe Dam (B minor, 136 in half time): the wall of water in the cold
// Written 2026-11-21. Vast and cold: a dark held fifth (the drone) under a pad, a reese in 3+3+2, a muted pluck motor thrown far by a
// dotted-quarter echo (spray in the gorge), a high glock glint, and the water itself in the kit (w: a bar-long roar). Gmaj7#11 (bVI
// lydian) is the cold air; F#7 the raised dominant. The form builds: D gathers the o-daiko, B2 drops, A3 adds the guitar wall.
// Set piece 観光放水 (the gates open): G holds a taiko gathering from the card until the first gate opens; then the kanpo sting
// and O (the wall, the roar, an impact) for four bars, back into A3.
T.kurobe = { name:'Kurobe Dam', kanji:'黒部', bpm:136, key:'B', mode:'minor', gain:1.165, bedOnly:true, dly:{ b:1.5, fb:.42 }, bassLow:'D1', padLow:'D3', arpLow:'B3',
  parts:{ drone:{ inst:'drone', pow:true, low:'F#1', fig:'hold', rev:.5, wide:.6, vol:1 }, bass:{ inst:'reese', fig:'1..1..1...1.8..5', drive:2.5, vol:.9 },
    arp:{ inst:'pluck', arp:true, fig:'0212021202120213', o:{ cut:500, fenv:2200 }, wide:.6, dly:.45, rev:.35, lay:1, vol:1.2 },
    glint:{ inst:'glock', arp:true, fig:'3.......1.....2.', low:'F#5', wide:.5, dly:.5, rev:.6, lay:2, vol:.9 },
    pad:{ inst:'spad', fig:'hold', o:{ cut:900 }, rev:.6, wide:.8, pump:.4, vol:1 },
    gtr:{ inst:'gtr', pow:true, low:'B1', fig:'x---------------', drive:8, cab:2200, wide:.8, rev:.2, lay:1, vol:.18 },
    stab:{ inst:'stab', fig:'x.......x..x....', o:{ cut:500, fenv:2600 }, wide:.6, rev:.35, lay:4, vol:1.3 }, kit:{ kit:true, rev:.3, vol:1 } },
  kit:{ I:{ w:'x...............', J:'x.......x.......' }, A:{ k:'x.........x.....', s:'........X.......', h:'x.x.x.x.x.x.x.x.', J:'x...............', o:'..............x.' },
    B:{ k:'x.....x...x.....', s:'........X.....g.', h:'x.x.x.x.x.x.x.x.', h2:'.x.x.x.x.x.x.x.x', J:'x.......x.......', w:'x...............' },
    C:{ w:'x...............', J:'x.......x..x.x..', h:'..x...x...x...x.' }, D:{ J:'x.......x..x.x..', h:'..x...x...x...x.' }, G:{ J:'x...x...x.x.xxxx', w:'x...............' },
    O:{ k:'x.....x...x.....', s:'........X.......', h:'xxxxxxxxxxxxxxxx', J:'x.......x.......', w:'x...............', o:'..............x.' }, fill:FILL_T },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', extra:['G', 'O'], style:{},
  sec:{ I:{ bars:4, ch:'Bm Bm/A Gmaj7#11 F#7sus4', play:'drone pad bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Bm Bm/A Gmaj7#11 Em9 Bm Bm/A Gmaj7#11 F#7sus4', play:'drone pad bass arp kit stab', drop:true },
    B:{ bars:8, ch:'Em9 F#m7 Gmaj7#11 Asus2 Em9 F#m7 Gmaj7#11 F#7', play:'drone pad bass arp glint kit stab', kit:'B', rise:true },
    A2:{ bars:8, ch:'@A', play:'drone pad bass arp glint gtr kit stab', drop:true },
    D:{ bars:8, ch:'Gmaj7#11 Gmaj7#11 Bm Bm Gmaj7#11 Gmaj7#11 Asus2 F#7sus4', play:'drone pad bass glint kit', kit:'D', rise:true, figs:{ bass:'1-------........' } },
    B2:{ like:'B', rise:false, drop:true, play:'drone pad bass arp glint gtr kit stab' },
    C:{ bars:4, ch:'Gmaj7#11 Asus2 Bm F#7', play:'drone pad arp kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', play:'drone pad bass arp glint gtr kit stab', kit:'B', drop:true },
    G:{ bars:1, ch:'F#7sus4', play:'drone pad kit', kit:'G', hold:true, bare:true },
    O:{ bars:4, ch:'Bm Gmaj7#11 Em9 F#7', play:'drone pad bass arp glint gtr kit stab', kit:'O', drop:true, rise:true, ret:'A3' } } };

// ---------------------------------------------------------------- 秋 Akihabara (F# minor, 152): electro under the signs, arcade chips, the blackout
// Written 2026-11-21. Dense and electric: four on the floor, a 16th reese with ghosts, off-beat stabs, and the motor is an arcade
// square arpeggio (chip) in call and response, its 3/16 echo smearing it into a 16th stream. i bVI bVII v / V7 (C#7, raised).
// Set piece 停電 (the blackout): when the dark reaches you, the teiden sting (the power sags) and X: the chips and the beat die, only
// the mains hum and an 808 heartbeat, held. Every sign at once: the relight sting (an impact, chips racing up) and Y, everything back
// at once for four bars, then A2.
T.akiba = { name:'Akihabara', kanji:'秋', bpm:152, key:'F#', mode:'minor', gain:1.322, bedOnly:true, dly:{ b:.75, fb:.3 }, bassLow:'F#1', padLow:'A3', arpLow:'F#4',
  parts:{ chip:{ inst:'chip', arp:true, fig:'02420242024202421353135313531353', wide:.45, dly:.22, rev:.15, vol:4 },
    bass:{ inst:'reese', fig:'18x818x818x8188n', drive:2.5, vol:.6 },
    stab:{ inst:'stab', fig:'..x...x...x...x.', o:{ cut:600, fenv:2600 }, wide:.6, rev:.25, lay:1, vol:1.1 },
    pad:{ inst:'spad', fig:'hold', o:{ cut:1100 }, rev:.4, wide:.8, pump:.7, lay:1, vol:1 },
    hum:{ inst:'drone', pow:true, low:'F#1', fig:'hold', rev:.45, wide:.5, vol:.45 }, kit:{ kit:true, rev:.15, vol:1 } },
  kit:{ I:{ k:'x...x...x...x...', q:'..x...x...x...x.' }, A:{ k:'x...x...x...x...', c:'....X.......X...', h2:'.x.x.x.x.x.x.x.x', o:'..x...x...x...x.', q:'...x.....x....x.' },
    B:{ K:'x.....x...x.....', c:'....X.......X...', h:'x.x.x.x.x.x.x.x.', y:'.......x.......x', q:'..x..x..x..x..x.' }, C:{ k:'x...............', q:'..x...x...x...x.', h:'..x...x...x...x.' },
    X:{ K:'x..g............' }, Y:{ k:'x...x...x...x...', c:'....X.......X...', h:'x.x.x.x.x.x.x.x.', h2:'.x.x.x.x.x.x.x.x', o:'..x...x...x...x.', q:'...x.....x....x.' },
    fill:{ c:'............xxXX', k:'............x...' } },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', extra:['X', 'Y'], style:{},
  sec:{ I:{ bars:4, ch:'F#m D E C#7sus4', play:'chip bass kit', kit:'I', rise:true },
    A:{ bars:8, ch:'F#m D E C#m F#m D Bm C#7', play:'chip bass pad kit', drop:true },
    B:{ bars:8, ch:'Bm7 C#m7 Dsus2 E Bm7 G#m7b5 C#7sus4 C#7', play:'chip bass pad stab kit', kit:'B', rise:true },
    A2:{ bars:8, ch:'@A', play:'chip bass pad stab kit', drop:true },
    D:{ bars:8, ch:'D D E E Bm Bm C#7sus4 C#7', play:'chip pad bass kit', kit:'C', rise:true, figs:{ chip:'0...2...4...2...' } },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'D E Bm C#7', play:'chip pad stab kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', play:'chip bass pad stab kit', kit:'Y', drop:true },
    X:{ bars:1, ch:'F#m', play:'hum kit', kit:'X', hold:true, bare:true },
    Y:{ bars:4, ch:'F#m D E C#7', play:'chip bass pad stab kit', kit:'Y', drop:true, rise:true, ret:'A2' } } };

// ---------------------------------------------------------------- 祇 Kyoto Gion (F, the in scale, 90): the lonely lane, a shamisen and space
// Written 2026-11-21. Restrained: ma is the point. A shamisen-like pluck (sham) says a phrase and then says nothing for a bar; a koto
// answers sparsely in call and response; a deep, slow groove (an 808 kick, a gated snare on 3, a sine sub with long gaps). F in-scale
// (F Gb Bb C Db): Fm, Gbmaj7 (the phrygian bII), Dbmaj7, Bbm7, and Csus4 / C7 at the seams. No bells in the song itself.
// Set piece 宵山 (yoiyama): Y holds while the festival is out: the ohayashi's atarigane (kon-chiki-chin) and shime-daiko under the
// koto, then back where the song was.
T.gion = { name:'Kyoto Gion', kanji:'祇', bpm:90, key:'F', mode:'in', gain:2.15, bedOnly:true, dly:{ b:1.5, fb:.38 }, bassLow:'F1', padLow:'Ab3', arpLow:'F4',
  parts:{ sham:{ inst:'sham', pan:.08, dly:.3, rev:.45, vol:1.6 }, sham2:{ inst:'sham', src:'sham', tr:-12, pan:-.15, dly:.2, rev:.35, lay:2, vol:.9 },
    koto:{ inst:'koto', arp:true, fig:'0.....3.....2...4.......1...2...', wide:.5, dly:.4, rev:.45, vol:.9 },
    bass:{ inst:'subB', fig:'1.......5..1....', vol:.4 }, pad:{ inst:'spad', fig:'hold', o:{ cut:700 }, rev:.6, wide:.8, lay:1, vol:.9 }, kit:{ kit:true, rev:.3, vol:.6 } },
  kit:{ I:{ j:'x...............' }, A:{ K:'x.........x.....', s:'........X.......', h:'..x...x...x.x.x.', j:'.............x..' },
    B:{ K:'x......x..x.....', s:'........X.....g.', h:'x.x.x.x.x.x.x.x.', j:'...x.......x....' }, C:{ K:'x...............', j:'........x.......' },
    Y:{ K:'x.........x.....', s:'........X.......', z:'X.x.x...X.x.x...', j:'x.xx..x.x.xx..x.' }, fill:{ j:'............x.xx' } },
  form:['I', 'A', 'B', 'A2', 'D', 'C', 'A3'], loop:'A', extra:['Y'], style:{},
  sec:{ I:{ bars:4, ch:'Fm Gbmaj7 Fm Csus4', play:'koto bass pad', kit:'I' },
    A:{ bars:8, ch:'Fm Gbmaj7 Fm Dbmaj7 Bbm7 Gbmaj7 Fm Csus4', play:'sham koto bass pad kit',
      sham:'C5:2 .:1 Db5:1 C5:4 .:2 Ab4:2 F4:4 | .:16 | F5:3 Eb5:1 Db5:2 C5:2 .:4 Bb4:2 C5:2 | Ab4:8 .:8 | Bb4:2 .:1 Db5:1 F5:4 .:2 Eb5:2 Db5:4 | Bb4:4 .:12 | C5:2 Db5:2 C5:2 Ab4:2 F4:8 | .:16' },
    B:{ bars:8, ch:'Dbmaj7 Gbmaj7 Bbm7 Fm Dbmaj7 Gbmaj7 Bbm7 C7', play:'sham koto bass pad kit', kit:'B',
      sham:'F5:4 .:2 Gb5:2 F5:2 Db5:2 .:4 | Bb4:8 .:8 | Db5:2 F5:2 Ab5:4 .:2 Gb5:2 F5:4 | C5:12 .:4 | F5:4 .:2 Gb5:2 Bb5:4 Ab5:2 Gb5:2 | F5:8 .:8 | Db5:2 C5:2 Bb4:2 Ab4:2 Bb4:8 | C5:4 .:12' },
    A2:{ bars:8, ch:'@A', sham:'@A', play:'sham sham2 koto bass pad kit' },
    D:{ bars:4, ch:'Gbmaj7 Gbmaj7 Fm Fm', play:'koto bass pad kit', kit:'C' },
    C:{ bars:4, ch:'Dbmaj7 Gbmaj7 Bbm7 C7', play:'koto bass pad kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', sham:'@A', play:'sham sham2 koto bass pad kit', kit:'B', drop:true },
    Y:{ bars:2, ch:'Fm Gbmaj7', play:'koto bass pad kit', kit:'Y', hold:true, bare:true } } };

// ---------------------------------------------------------------- 空 Haneda (E minor, 150): jets overhead, a hybrid ostinato machine to the dawn
// Darker, harder. Was E major at 140 (Emaj7 F#m7 C#m7 D#m7: city-pop maj7 sheen, whole-note bass): the parallel minor (Em9 F#m7b5 C ...),
// a tritone Bb (bV) in bar 4 and B7 (the raised 7th) at the cadence, the reese pumping in 3+3+2 octaves under the ostinato.
T.haneda = { name:'Haneda', kanji:'空', bpm:150, key:'E', mode:'minor', gain:1.096, bedGain:1.230, dly:{ b:.75, fb:.3 }, bassLow:'E1', padLow:'G3', arpLow:'E4',
  parts:{ lead:{ inst:'scream', pan:.05, dly:.25, rev:.3, drive:2.5, cab:3600, vol:1.17 }, ost:{ inst:'pluck', arp:true, fig:'0000200300002003', low:'E2', o:{ cut:600, fenv:2400 }, drive:1.5, vol:1.15 },
    bass:{ inst:'reese', fig:'1..81..81..81.8.', drive:2, vol:0.813 }, stab:{ inst:'stab', fig:'x.......x..x....', wide:.7, rev:.3, lay:1, vol:1.88 },
    pad:{ inst:'spad', fig:'hold', rev:.45, wide:.8, pump:.6, vol:1.1 }, kit:{ kit:true, rev:.22, vol:0.832 } },
  kit:{ I:{ k:'x...x...x...x...', J:'x...............' }, A:{ k:'x...x...x...x...', s:'....X.......X...', o:'..x...x...x...x.', h2:'.x.x.x.x.x.x.x.x', J:'x.......x.......' },
    B:{ k:'x...x...x...x...', s:'....X.......X...', c:'....X.......X...', r:'x.x.x.x.x.x.x.x.', J:'x..x..x.........' }, C:{ k:'x...............', s:'........X.......', h:'xxxxxxxxxxxxxxxx' }, fill:FILL_S },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Em9 F#m7b5 C D', play:'ost pad kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Em9 F#m7b5 C Bb Em9 F#m7b5 Am7 B7', play:'lead ost bass kit stab pad', drop:true,
      lead:'E6:2 E6:1 .:1 B5:2 E6:2 .:2 F#6:2 G6:4 | F#6:2 F#6:1 .:1 C6:2 F#6:2 .:2 E6:2 C6:4 | E6:2 E6:1 .:1 G5:2 C6:2 .:2 B5:2 G5:4 | Bb5:6 F#5:2 C6:8 | E6:2 E6:1 .:1 B5:2 E6:2 .:2 F#6:2 G6:4 | F#6:2 F#6:1 .:1 C6:2 F#6:2 .:2 A6:2 G6:4 | G6:4 E6:4 C6:4 A5:4 | F#6:8 Eb6:8' },
    B:{ bars:8, ch:'C Am7 B7sus4 Em9 C Am7 F#m7b5 B7sus4', play:'lead ost bass kit stab pad', kit:'B', rise:true,
      lead:'E6:4 D6:2 C6:2 G5:8 | C6:4 B5:2 A5:2 E6:8 | D6:4 C6:2 B5:2 F#6:8 | D6:12 .:4 | G5:4 B5:4 E6:8 | E6:4 G6:4 C6:8 | A5:4 C6:4 G6:8 | F#6:8 E6:8' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead ost bass kit stab pad', drop:true },
    D:{ bars:8, ch:'Am7 B7 Em9 C Am7 B7 Em9 B7sus4', play:'lead ost bass kit pad', kit:'C', rise:true,
      lead:'C6:16 | Eb6:8 B5:8 | G5:16 | .:16 | E6:8 C6:8 | F#6:8 Eb6:8 | B5:16 | E6:8 F#6:8' },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Am7 B7 G B7sus4', play:'ost pad kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', play:'lead ost bass kit stab pad', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 環 Shuto C1 (C# phrygian over a C# pedal, 138): the loop that never ends
// Spec: research/sundown-craft/shuto.md (環状). House style, no lead heard (MUSIC.LEADS), no voices: the identity is a C# pedal under the
// phrygian bII (D/C#), a gritty reese in 16ths with ghosts, off-beat stabs (the 80s office), a wide 16th pluck strobing like the lamps, and
// "the ramp": the five-note fall G#-F#-E-D-C# as a low pluck riff in octave 4, answered by silence. B is the A-major bridge, ending on C#7
// (phrygian dominant). D is the river: the kit thins to hats and a kick for 8 bars. The lead line (the motif an octave up) is data only.
T.shuto = { name:'Shuto C1', kanji:'環', bpm:138, key:'C#', mode:'phrygian', gain:1.1, bedGain:1.15, dly:{ b:.75, fb:.32 }, bassLow:'C#1', padLow:'E3', arpLow:'C#4',
  parts:{ lead:{ inst:'super', pan:.05, dly:.25, rev:.3, vol:1.6 }, ramp:{ inst:'pluck', o:{ cut:600, fenv:2600 }, pan:-.1, dly:.35, rev:.3, lay:1, vol:1.4 },
    arp:{ inst:'pluck', arp:true, fig:'0123012301230123', low:'C#3', wide:.8, dly:.15, rev:.15, lay:2, vol:1.1 },
    stab:{ inst:'stab', fig:'..x...x...x...x.', o:{ cut:500, fenv:2600 }, wide:.6, rev:.25, lay:1, vol:1.2 },
    pad:{ inst:'spad', fig:'hold', o:{ cut:900 }, rev:.4, wide:.8, pump:.5, vol:1 }, bass:{ inst:'reese', fig:'18x.18x.18x.18xn', drive:2, vol:1 }, kit:{ kit:true, rev:.18, vol:1 } },
  kit:{ I:{ h:'x.x.x.x.x.x.x.x.', q:'....x.......x...' }, A:{ k:'x.....x...x.....', s:'....X.......X...', q:'..x.......x..x..', h:'x.x.x.x.x.x.x.x.', h2:'.g.g.g.g.g.g.g.g', o:'..............x.' },
    B:{ k:'x...x...x...x...', s:'....X.......X...', h:'xxxxxxxxxxxxxxxx', q:'..x..x....x..x..', J:'x.......x.......' }, C:{ k:'x...............', h:'..x...x...x...x.' }, fill:FILL_S },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'C#m D/C# C#m B', play:'pad arp kit', kit:'I', rise:true },
    A:{ bars:8, ch:'C#m D/C# C#m B C#m D/C# C#m B', play:'lead ramp pad bass kit stab', drop:true,
      lead:'G#5:3 F#5:3 E5:2 D5:4 C#5:4 | .:8 E5:4 G#5:4 | G#5:3 F#5:3 E5:2 D5:4 C#5:4 | .:8 D#5:4 F#5:4 | G#5:3 F#5:3 E5:2 D5:4 C#5:4 | .:8 E5:4 G#5:4 | B5:3 A5:3 G#5:2 F#5:4 E5:4 | F#5:4 D#5:4 B4:8',
      ramp:'G#4:3 F#4:3 E4:2 D4:4 C#4:4 | .:16 | G#4:3 F#4:3 E4:2 D4:4 C#4:4 | .:16 | G#4:3 F#4:3 E4:2 D4:4 C#4:4 | .:16 | G#4:3 F#4:3 E4:2 D4:4 C#4:4 | .:8 E4:4 G#4:4' },
    B:{ bars:8, ch:'A B C#m C#m A B D C#7', play:'lead ramp pad bass kit stab arp', kit:'B', rise:true,
      lead:'E5:3 D5:3 C#5:2 B4:4 A4:4 | .:8 D#5:4 F#5:4 | G#5:3 F#5:3 E5:2 D#5:4 C#5:4 | C#5:16 | E5:3 D5:3 C#5:2 B4:4 A4:4 | .:8 D#5:4 F#5:4 | F#5:3 E5:3 D5:2 A4:4 F#4:4 | E#5:4 G#5:4 C#5:8',
      ramp:'E4:3 D4:3 C#4:2 B3:4 A3:4 | .:16 | G#4:3 F#4:3 E4:2 D#4:4 C#4:4 | .:16 | E4:3 D4:3 C#4:2 B3:4 A3:4 | .:16 | F#4:3 E4:3 D4:2 C#4:4 A3:4 | .:8 E#4:4 G#4:4' },
    A2:{ bars:8, ch:'@A', lead:'@A', ramp:'@A', play:'lead ramp pad bass kit stab arp', drop:true },
    D:{ bars:8, ch:'C#m C#m D/C# D/C# C#m C#m B B', play:'pad arp bass kit', kit:'C', rise:true },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'A B D C#7', play:'pad arp kit stab', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', ramp:'@A', play:'lead ramp pad bass kit stab arp', kit:'B', drop:true } } };

// ---------------------------------------------------------------- 浜 Minato Mirai (D minor, 132, half time in the verses): the wheel over the harbour
// Spec: research/sundown-craft/minato.md. House style, no lead heard, no voices: the wheel (D-F-A-C-A-F, a six-step cycle) is the motor, a
// muted 16th pluck through the dotted-8th ping-pong delay whose figure runs in 6s across a two-bar loop so it turns against the bar; a reese
// in 8ths pumped lightly by the kick; a half-time kit (gated snare on 3) in A, four-on-the-floor in B (the heart: Gm Csus2 Dm/F Bb ... A7sus4 A7; the spec's C and F as sus2 and Dm/F, fewer major thirds);
// a low two-tone foghorn on A's first bar. The lead line (the wheel as a melody) is data only.
T.minato = { name:'Minato Mirai', kanji:'浜', bpm:132, key:'D', mode:'minor', gain:1.1, bedGain:1.15, dly:{ b:.75, fb:.38 }, bassLow:'D1', padLow:'F3', arpLow:'D4',
  parts:{ lead:{ inst:'super', pan:.05, dly:.25, rev:.3, vol:1.6 },
    wheel:{ inst:'pluck', arp:true, fig:'01232101232101232101232101232101', o:{ cut:500, fenv:2600 }, wide:.6, dly:.4, rev:.25, vol:1.3 },
    fog:{ inst:'horn', o:{ cut:420, fenv:300, a:.15, r:.4 }, pan:-.05, rev:.45, vol:1.6 },
    pad:{ inst:'spad', fig:'hold', o:{ cut:800 }, rev:.45, wide:.8, pump:.5, vol:1 }, stab:{ inst:'stab', fig:'x.......x..x....', o:{ cut:500, fenv:2400 }, wide:.6, rev:.3, lay:2, vol:1.2 },
    bass:{ inst:'reese', fig:'1.1.1.8.1.1.8.n.', drive:2, pump:.25, vol:1 }, kit:{ kit:true, rev:.2, vol:1 } },
  kit:{ I:{ h:'x.x.x.x.x.x.x.x.', J:'x...............' }, A:{ k:'x.........x.....', s:'........X.......', h:'x.x.x.x.x.x.x.x.', h2:'.g.g.g.g.g.g.g.g', o:'..............x.' },
    B:{ k:'x...x...x...x...', s:'....X.......X...', h:'xxxxxxxxxxxxxxxx', J:'x.......x.......', o:'..x...x...x...x.' }, C:{ k:'x...............', s:'........X.......', h:'..x...x...x...x.' },
    fill:{ t:'..........x.x.x.', m:'...........x.x..', s:'..............xX' } },
  form:['I', 'A', 'B', 'A2', 'D', 'B2', 'C', 'A3'], loop:'A', style:{},
  sec:{ I:{ bars:4, ch:'Dm7 Bb Csus2 Am7', play:'wheel pad kit', kit:'I', rise:true },
    A:{ bars:8, ch:'Dm7 Bb Csus2 Am7 Dm7 Bb Csus2 Am7', play:'lead wheel fog pad bass kit', drop:true,
      lead:'D5:2 F5:2 A5:2 C6:2 A5:2 F5:4 .:2 | D5:4 F5:2 Bb5:4 .:6 | C5:2 E5:2 G5:2 C6:2 G5:2 E5:4 .:2 | A4:4 C5:2 E5:4 .:6 | D5:2 F5:2 A5:2 C6:2 A5:2 F5:4 .:2 | D5:4 F5:2 Bb5:4 .:6 | C5:2 E5:2 G5:2 C6:2 G5:2 E5:4 .:2 | A4:4 C5:2 E5:4 .:6',
      fog:'D3:8 A2:8 | .:16 | .:16 | .:16 | .:16 | .:16 | .:16 | .:16' },
    B:{ bars:8, ch:'Gm Csus2 Dm/F Bb Gm Csus2 A7sus4 A7', play:'lead wheel pad bass kit stab', kit:'B', rise:true,
      lead:'G5:2 Bb5:2 D6:2 Bb5:2 G5:4 .:4 | G5:4 E5:4 C5:8 | F5:2 A5:2 C6:2 A5:2 F5:4 .:4 | F5:4 D5:4 Bb4:8 | G5:2 Bb5:2 D6:2 Bb5:2 G5:4 .:4 | G5:4 E5:4 C5:8 | A5:2 D6:2 E6:2 D6:2 A5:4 .:4 | C#6:4 A5:4 E5:8' },
    A2:{ bars:8, ch:'@A', lead:'@A', play:'lead wheel pad bass kit stab', drop:true },
    D:{ bars:8, ch:'Bb Bb Csus2 Csus2 Dm7 Dm7 A7sus4 A7', play:'wheel pad bass kit', kit:'C', rise:true },
    B2:{ like:'B', rise:false, drop:true },
    C:{ bars:4, ch:'Bb Csus2 Am7 A7', play:'wheel pad kit', kit:'C', rise:true },
    A3:{ bars:8, ch:'@A', lead:'@A', fog:'@A', play:'lead wheel fog pad bass kit stab', kit:'B', drop:true } } };

// ---------------------------------------------------------------- results: 朝 Morning (E major, 120 in half time): the dawn figure, cooling down
// The bed (gamelan figure, pad, sub, soft kit) is the one approved by ear and is untouched. 2026-11-21: the melody lost with the voices
// comes back on a warm triangle-and-saw voice (dawn: no voice, no bell): the sundown figure turned upward (1 2 3 4 5, in 3+3+2+4+4) at the
// top of A, breathing a bar after every phrase; B answers higher and climbs back into the figure at the seam; A2 doubles it an octave down.
T.results = { name:'Morning', kanji:'朝', bpm:120, key:'E', mode:'major', gain:1.121, dly:{ b:.75, fb:.35 }, bassLow:'E1', padLow:'G#3', arpLow:'E5', lp:false,
  parts:{ gam:{ inst:'gamelan', arp:true, fig:'0.1.2.4.2.1.0.4.', wide:.5, dly:.25, rev:.45, vol:1.14 },
    pad:{ inst:'spad', fig:'hold', rev:.6, wide:.8, vol:0.891 }, bass:{ inst:'subB', fig:'1-------5---8---', vol:0.427 }, kit:{ kit:true, rev:.3, vol:1.8 },
    mel:{ inst:'dawn', pan:.05, dly:.3, rev:.45, vol:1.8 }, mel2:{ inst:'dawn', src:'mel', tr:-12, pan:-.12, dly:.2, rev:.35, vol:.95 } },
  kit:{ A:{ k:'x.........x.....', s:'........X.......', h:'..x...x...x...x.' }, I:{ g:'x...............' }, fill:{ s:'..............gx' } },
  form:['I', 'A', 'B', 'A2'], loop:'A', style:{ soft:true }, energy:3,
  sec:{ I:{ bars:2, ch:'Emaj9 B7sus4', play:'gam pad bass kit', kit:'I' },
    A:{ bars:8, ch:'Emaj9 C#m9 Amaj7 B7sus4 Emaj9 G#m7 Amaj7 B7sus4', play:'mel gam pad bass kit',
      mel:'E5:3 F#5:3 G#5:2 A5:4 B5:4 | G#5:6 .:2 E5:4 D#5:4 | C#5:4 E5:2 G#5:6 .:4 | F#5:8 .:8 | B4:2 .:1 E5:1 F#5:2 G#5:2 B5:6 .:2 | B5:3 A5:3 G#5:2 F#5:4 D#5:4 | E5:4 C#5:2 E5:2 G#5:8 | F#5:4 E5:4 .:8' },
    B:{ bars:8, ch:'Amaj7 B G#m7 C#m9 F#m9 B7sus4 Emaj9 B7sus4', play:'mel gam pad bass kit',
      mel:'C#6:6 B5:2 G#5:4 .:4 | D#6:6 C#6:2 B5:4 .:4 | B5:4 G#5:4 F#5:4 D#5:4 | E5:8 .:8 | A5:4 G#5:2 F#5:2 C#5:4 .:4 | E5:6 F#5:2 A5:4 .:4 | G#5:4 F#5:2 E5:2 D#5:4 B4:4 | E5:3 F#5:3 A5:2 B5:8' },
    A2:{ bars:8, ch:'@A', mel:'@A', play:'mel mel2 gam pad bass kit' } } };

/* ================================================================== stingers: one-shots, written relative to the song's tonic (octave 3).
   ev: [beat, inst, semitones (a number or a chord array), length in beats, velocity]; kit: [beat, hit, vel]. Taiko, chant shouts and
   impacts; power and sus chords so they sit in any road's key over a ducked song. */
const ST = {};
/* the count's pre-roll (first 60 s, research/sundown-craft/first60.md): it sits UNDER the count, the arrival's beeps and the bike's call carry
   三 二 一. A soft sub pulse and a shime tick on each count (every 1.5 beats at 126, mech/arrival.js CD_B), a hat on the off-count, a pad that
   swells from nothing, and a reverse cymbal that ends exactly on 走れ (beat 4.5), where the song's full kit lands. No o-daiko, no 808 hit:
   the first big hit of the night is GO. */
ST.count = { bpm:126, gain:0.8, note:'三二一 pre-roll: quiet sub pulse and shime tick on each count, hats between, a pad swelling from nothing, a reverse cymbal into GO; GO is the song\'s first downbeat',
  ev:[[0, 'spad', [0, 7, 12], 4.5, .5], [0, 'subB', -12, .5, .55], [1.5, 'subB', -12, .5, .6], [3, 'subB', -12, .5, .65]],
  kit:[[0, 'j', .55], [1.5, 'j', .6], [3, 'j', .7], [.75, 'h', .35], [2.25, 'h', .4], [3.75, 'h', .45], [4.125, 'h', .3], [3.5, 'V', .75]] };
ST.wave = { bpm:120, gain:0.668, note:'大波: an o-daiko roll swells under the curl, chants rise, then the whole wall breaks: impact, supersaw and gamelan',
  ev:[[0, 'spad', [0, 7, 12], 4, .8], [4, 'stab', [0, 7, 12, 19], 3, 1], [4, 'b808', -12, 3, 1], [4, 'gamelan', [24, 31, 36], 2, .8]],
  kit:[[0, 'J', .45], [.5, 'J', .5], [1, 'J', .55], [1.5, 'J', .6], [2, 'J', .65], [2.5, 'J', .7], [3, 'J', .8], [3.25, 'J', .85], [3.5, 'J', .9], [3.75, 'J', .95], [3, 'V', .9], [4, 'I', 1]] };
ST.inferno = { bpm:132, gain:0.975, note:'爆発: impacts, a tritone in the supersaws, a chant shout, an anvil',
  ev:[[0, 'b808', -12, 1.5, 1], [0, 'stab', [0, 6, 12], 1.5, 1], [1.5, 'stab', [1, 7, 13], 1, .9], [2.5, 'stab', [0, 6, 12, 18], 2, 1], ],
  kit:[[0, 'I', 1], [.75, 'J', .9], [1.5, 'J', 1], [2.5, 'I', 1], [2.5, 'e', .8]] };
ST.kaiju = { bpm:96, gain:0.568, note:'怪獣: a slow half-step menace in low supersaws, a chant, a gong and an impact',
  ev:[[0, 'stab', [-12, -5, 0], 1.5, .9], [1.5, 'stab', [-11, -4, 1], 1.5, .95], [3, 'stab', [-12, -5, 0, 6], 2.5, 1], [3, 'b808', -24, 2.5, 1], [0, 'spad', [0, 7], 5.5, .7], ],
  kit:[[0, 'J', 1], [1.5, 'J', 1], [2, 'V', .9], [3, 'I', 1], [3, 'g', 1]] };
ST.avalanche = { bpm:120, gain:0.689, note:'雪崩: gamelan tumbling two octaves, a reverse cymbal and an impact',
  ev:[[0, 'gamelan', 31, .25, .8], [.25, 'gamelan', 29, .25, .8], [.5, 'gamelan', 26, .25, .8], [.75, 'gamelan', 24, .25, .8], [1, 'gamelan', 19, .25, .85], [1.25, 'gamelan', 17, .25, .85],
      [1.5, 'gamelan', 14, .25, .9], [1.75, 'gamelan', 12, .25, .9], [2, 'gamelan', 7, .5, 1], [0, 'spad', [-12, -5, 0], 4, .7], [2, 'stab', [-12, -5, 2, 7], 2.5, .9]],
  kit:[[1, 'V', .8], [2, 'I', .9], [2, 'J', 1]] };
ST.typhoon = { bpm:120, gain:0.859, note:'台風: plucks rising in fourths into an impact and a chant',
  ev:[[0, 'pluck', 0, .25, .8], [.25, 'pluck', 5, .25, .8], [.5, 'pluck', 10, .25, .8], [.75, 'pluck', 15, .25, .8], [1, 'pluck', 20, .25, .8], [1.25, 'pluck', 25, .25, .85],
      [1.5, 'stab', [0, 7, 15], 2.5, .9], [0, 'spad', [0, 7, 12], 4, .6]],
  kit:[[.5, 'V', .7], [1.5, 'I', .8], [1.5, 'J', 1]] };
ST.hanabi = { bpm:126, gain:0.812, note:'花火: a supersaw call (1 5 8), a chant, gamelan sparks, an impact',
  ev:[[0, 'stab', [12, 19], .5, .85], [.5, 'stab', [19, 24], .5, .85], [1, 'stab', [12, 19, 24, 26], 2, 1], [1, 'gamelan', [31, 36, 38, 43], 1.5, .8], ],
  kit:[[0, 'J', .7], [.5, 'J', .7], [1, 'I', 1]] };
ST.pulled = { bpm:84, gain:1.056, note:'止: the sundown figure as a slow low chant, a gong, ending a step short of home',
  ev:[[0, 'spad', [0, 7, 15], 6, .7], [0, 'b808', -12, 3, .8]],
  kit:[[0, 'J', .9], [0, 'g', .8], [3, 'J', .6]] };
ST.dawn = { bpm:92, gain:1.300, note:'明: the figure turned upward on gamelan, in the key of the sunrise (E), a choir swell and a wide chord',
  ev:[[0, 'spad', [-8, 4, 7, 11, 14], 6, .8], [0, 'gamelan', 16, .75, .9], [.75, 'gamelan', 18, .75, .9], [1.5, 'gamelan', 20, .5, .9], [2, 'gamelan', 21, 1, .9], [3, 'gamelan', 23, 3, 1],
      [3, 'spad', [4, 11, 16, 18], 3, .8], [0, 'subB', -8, 6, .7]],
  kit:[[2, 'V', .6], [3, 'C', .6], [3, 'J', .7]], key:'E' };

// the new roads' set pieces (2026-11-21), cued by the owner (see spTick) on the song's next beat, over the director's duck
ST.kanpo = { bpm:136, gain:0.8, note:'観光放水: the gates open: two o-daiko, the roar of the water, a low open-fifth wall and an impact',
  ev:[[0, 'spad', [-12, -5, 0, 7], 5, .7], [1, 'stab', [-12, -5, 0, 7], 3, 1], [1, 'b808', -12, 3, 1]],
  kit:[[0, 'J', 1], [.5, 'J', .9], [0, 'w', 1], [1, 'I', 1]] };
ST.teiden = { bpm:152, gain:0.8, note:'停電: the power dies: the mains note sags three octaves, a low thump, the dark',
  ev:[[0, 'b808', -12, 2, .7]], kit:[[0, 'P', 1], [0, 'J', .6]] };
ST.relight = { bpm:152, gain:0.8, note:'復電: every sign at once: an impact and a wide stab, arcade chips racing up two octaves',
  ev:[[0, 'stab', [0, 7, 12, 15], 2, 1], [0, 'b808', -12, 2, 1], [.25, 'chip', 12, .25, .9], [.5, 'chip', 15, .25, .9], [.75, 'chip', 19, .25, .9], [1, 'chip', 24, .25, .9],
      [1.25, 'chip', 27, .25, .9], [1.5, 'chip', 31, .25, .9], [1.75, 'chip', 36, .5, 1]],
  kit:[[0, 'I', 1], [0, 'c', .9]] };

/* ================================================================== the compiler (pure; node can run it) */
function parseNotes(str, warn, where){ const bars = []; let cur = [], len = 0, lastN = null;
  const close = () => { if(len !== 16) warn(where + ' bar ' + (bars.length + 1) + ' has ' + len + ' sixteenths'); bars.push(cur); cur = []; len = 0; };
  for(const tok of str.replace(/\|/g, ' | ').trim().split(/\s+/)){ if(tok === '|'){ close(); continue; } if(!tok) continue;
    const m = /^([!~]*)([A-G][#b]?-?\d|\.|-)(?::(\d+))?$/.exec(tok); if(!m){ warn(where + ' bad token ' + tok); continue; }
    const d = m[3] ? +m[3] : 2;
    if(m[2] === '.'){ len += d; continue; }
    if(m[2] === '-'){ if(cur.length) cur[cur.length - 1].d += d; len += d; continue; }
    const n = nm(m[2]); cur.push({ s:len, n, d, v:m[1].includes('!') ? 1 : .82, gl:m[1].includes('~') && lastN != null ? lastN : 0 }); lastN = n; len += d; }
  if(len || cur.length) close(); return bars; }
function chordsOf(spec, bars, warn, where){ const toks = spec.trim().split(/\s+/).filter(t => t !== '|'); if(toks.length !== bars) warn(where + ' has ' + toks.length + ' chords for ' + bars + ' bars');
  return toks.map(t => { const h = t.split('+').map(chordOf); return [h[0], h[1] || h[0]]; }); }
function padVoice(c, lo){ const v = c.iv.map(i => above((c.r + i) % 12, lo)); v.sort((a, b) => a - b); return v; }
function powVoice(c, lo){ const b = above(c.r, lo); return [b, b + 7, b + 12]; }
function ladder(c, lo){ const base = c.iv.filter(i => i < 12 || c.iv.length < 4).map(i => above((c.r + i) % 12, lo)).sort((a, b) => a - b), o = [];
  for(let k = 0; o.length < 10; k++) for(const m of base){ if(o.length < 10) o.push(m + 12 * k); } return o; }
function bassTone(ch, chNext, lo, sym){ const b0 = above(ch.b, lo), rel = i => b0 + ((((ch.r + ch.iv[i]) - ch.b) % 12) + 12) % 12;
  switch(sym){ case '1': case 'x': return b0; case '8': return b0 + 12; case '5': return rel(Math.min(2, ch.iv.length - 1)); case '3': return rel(Math.min(1, ch.iv.length - 1));
    case '7': return ch.iv.length > 3 && ch.iv[3] < 12 ? rel(3) : b0 + 12; case '9': return b0 + 14;
    case 'n': return above(chNext.b, lo) - 1 + (above(chNext.b, lo) - 1 < b0 - 2 ? 12 : 0); } return null; }
const DIGIT = c => c >= '0' && c <= '9';
// a section may say like:'B' to reprise section B with overrides (B2)
function compile(th){ const W = [], warn = w => W.push(th.name + ': ' + w), parts = Object.keys(th.parts), PI = {}; parts.forEach((p, i) => PI[p] = i);
  const lo = { bass:nm(th.bassLow || 'E1'), pad:nm(th.padLow || 'G3'), arp:nm(th.arpLow || 'E4') }, keyPc = pcOf(th.key);
  const kitOf = name => th.kit[name] || th.kit.A || {}, bars = [], secStart = {}, lastN = {};
  const resolveStr = (sec, part) => { let s = sec[part]; for(let g = 0; typeof s === 'string' && s[0] === '@' && g < 4; g++){ const [sn, pn] = s.slice(1).split('.'); s = (th.sec[sn] || {})[pn || part]; } return s; };
  // a section's bars go into the main form (bars) or, for a set-piece section (th.extra), into its own list (xs[name])
  const emit = (sn, bars) => { const sec = th.sec[sn] && th.sec[sn].like ? Object.assign({}, th.sec[th.sec[sn].like], th.sec[sn]) : th.sec[sn]; if(!sec){ warn('no section ' + sn); return; }
    let chSpec = sec.ch; if(chSpec && chSpec[0] === '@') chSpec = th.sec[chSpec.slice(1)].ch;
    const chs = chordsOf(chSpec, sec.bars, warn, sn), play = new Set((sec.play || parts.join(' ')).split(/\s+/)), mel = {};
    for(const p of parts){ const P = th.parts[p]; if(!play.has(p)) continue; const src = P.src ? resolveStr(sec, P.src) : resolveStr(sec, p);
      if(typeof src === 'string' && !P.fig && !P.kit) mel[p] = parseNotes(src, warn, sn + '.' + p); }
    for(const p in mel) if(mel[p].length !== sec.bars) warn(sn + '.' + p + ' has ' + mel[p].length + ' bars, expected ' + sec.bars);
    for(let b = 0; b < sec.bars; b++){ const ev = Array.from({ length:16 }, () => []), ch = chs[b] || chs[0], next = (chs[b + 1] || chs[0])[0];
      const bar = { sec:sn, i:b, last:b === sec.bars - 1, ch, ev, cm:ch.map(c => c.iv.slice(0, 3).map(i => above((c.r + i) % 12, 45))), fill:null };
      for(const p of parts){ if(!play.has(p)) continue; const P = th.parts[p], pi = PI[p], lay = P.lay != null ? P.lay : 0;
        if(P.kit){ const K = kitOf(sec.kit || 'A'), put = (KK, s0, s1, into) => { for(const line in KK){ const str = KK[line]; if(str.length !== 16 && str.length !== 0) warn(sn + ' kit ' + line + ' is ' + str.length + ' long');
              for(let s = s0; s < s1 && s < str.length; s++){ const c = str[s]; if(c === '.') continue; into[s].push({ p:pi, kit:line, v:c === 'X' ? 1 : c === 'g' ? .35 : .78, lay:KIT_LAY[line] != null ? KIT_LAY[line] : 1 }); } } };
          put(K, 0, 16, ev); if(bar.last && !sec.nofill && th.kit.fill){ bar.fill = Array.from({ length:16 }, () => []); put(th.kit.fill, 12, 16, bar.fill); }
          if(sec.rise && bar.last){ ev[0].push({ p:pi, kit:'R', v:.8, lay:0 }); ev[12].push({ p:pi, kit:'V', v:.8, lay:0 }); }   // into the next section
          if(sec.drop && b === 0){ ev[0].push({ p:pi, kit:'I', v:.85, lay:1 }); }                                                // the drop lands
          if(sec.hits) for(const [hb, hs, hk] of sec.hits) if(hb === b){ ev[hs].push({ p:pi, kit:hk, v:.9, lay:KIT_LAY[hk] != null ? KIT_LAY[hk] : 1 }); }   // one-off hits on given bars ([bar, step, hit])
          continue; }
        if(mel[p]){ const tr = P.tr || 0; for(const n of mel[p][b] || []) if(n.s < 16) ev[n.s].push({ p:pi, n:n.n + tr, d:n.d, v:n.v, gl:n.gl ? n.gl + tr : 0, lay }); continue; }
        let fig = (sec.figs && sec.figs[p]) || P.fig; if(!fig) continue;
        if(fig.length !== 16 && fig.length !== 32 && fig !== 'hold') warn(sn + '.' + p + ' figure is ' + fig.length + ' long');
        if(fig.length === 32) fig = fig.slice((b % 2) * 16, (b % 2) * 16 + 16);   // call on odd bars, response on even
        const chAt = s => s < 8 ? ch[0] : ch[1], plo = P.low ? nm(P.low) : null;
        const voice = c => P.pow ? powVoice(c, plo || nm('E2')) : padVoice(c, plo || lo.pad);
        if(fig === 'hold'){ for(let h = 0; h < 2; h++){ if(h === 1 && ch[1] === ch[0]) continue; const d = h === 0 && ch[1] === ch[0] ? 16 : 8; ev[h * 8].push({ p:pi, n:voice(ch[h]), d, v:.8, lay }); } continue; }
        for(let s = 0; s < 16; s++){ const c = fig[s]; if(c === '.' || c === '-') continue; let d = 1; while(s + d < 16 && fig[s + d] === '-') d++;
          if(p === 'bass' || P.bassFig){ const n = bassTone(chAt(s), next, lo.bass, c); if(n == null){ warn(sn + '.' + p + ' bad figure char ' + c); continue; }
            const gl = P.glide && lastN[p] && lastN[p] !== n && c !== 'x' ? lastN[p] : 0; lastN[p] = n;
            ev[s].push({ p:pi, n, d:c === 'x' ? .5 : d, v:c === 'x' ? .4 : s % 4 === 0 ? 1 : .8, gl, lay }); }
          else if(P.arp || p === 'arp'){ if(!DIGIT(c)){ warn(sn + '.' + p + ' bad arp char ' + c); continue; } const L = ladder(chAt(s), plo || lo.arp); ev[s].push({ p:pi, n:L[+c], d:Math.max(d, 1), v:s % 4 === 0 ? .9 : .72, lay }); }
          else ev[s].push({ p:pi, n:voice(chAt(s)), d, v:c === 'X' ? 1 : .85, lay }); } }
      bars.push(bar); } };
  for(const sn of th.form){ secStart[sn] = bars.length; emit(sn, bars); }
  // set-piece sections: played only when the owner jumps there (hold: loop from bar holdFrom until released; else go on to next, or
  // back into the form at ret); bare: no build overlays (the swell's hats and pad) while it plays
  const xs = {}, xm = {}; for(const sn of th.extra || []){ const a = []; emit(sn, a); xs[sn] = a; const q = th.sec[sn] || {}; xm[sn] = { hold:!!q.hold, holdFrom:q.holdFrom || 0, next:q.next || null, ret:q.ret || null, bare:!!q.bare }; }
  const loopAt = secStart[th.loop || th.form[1]] || 0, s16 = 60 / th.bpm / 4;
  return { th, parts, PI, bars, loopAt, secStart, xs, xm, warnings:W, s16, keyPc, loopSec:(bars.length - loopAt) * 16 * s16, introSec:loopAt * 16 * s16 }; }

/* ================================================================== the synth (Web Audio) */
function makeEngine(ac, dest){ const E = { ac, dest, decks:[], waves:{}, live:true };
  const len = ac.sampleRate * 2, nb = ac.createBuffer(1, len, ac.sampleRate), nd = nb.getChannelData(0); let seed = 12345;
  for(let i = 0; i < len; i++){ seed = (seed * 1103515245 + 12345) >>> 0; nd[i] = (seed / 4294967296) * 2 - 1; } E.noise = nb;
  // the shared reverb: a 2.6 s stereo room-to-hall tail from decaying, smoothed noise (decorrelated left and right); a highpass keeps the kick out
  const rl = Math.floor(ac.sampleRate * 2.6), ir = ac.createBuffer(2, rl, ac.sampleRate);
  for(let c = 0; c < 2; c++){ const d = ir.getChannelData(c); let l = 0; for(let i = 0; i < rl; i++){ seed = (seed * 1103515245 + 12345) >>> 0; const w = (seed / 4294967296) * 2 - 1; l = l * .45 + w * .55; d[i] = l * Math.pow(1 - i / rl, 2.4) * (i < 200 ? i / 200 : 1); } }
  E.rev = ac.createConvolver(); E.rev.buffer = ir; E.revIn = ac.createBiquadFilter(); E.revIn.type = 'highpass'; E.revIn.frequency.value = 300;
  // the guard: a static soft clip, linear up to -3 dBFS and soft above, with no makeup gain (Chrome's DynamicsCompressor adds makeup gain
  // automatically, which measured +2.9 LU in the first pass: a mixer, not a guard). Loudness comes from per-song gains, never from this.
  const guardCurve = () => { const n = 2048, c = new Float32Array(n), k = .7, h = .97 - k; for(let i = 0; i < n; i++){ const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a <= k ? a : k + h * Math.tanh((a - k) / h)); } return c; };
  E.bus = ac.createGain(); E.guard = ac.createWaveShaper(); E.guard.curve = guardCurve(); E.guard.oversample = '2x';
  E.out = ac.createGain(); E.out.gain.value = 1; E.revOut = ac.createGain(); E.revOut.gain.value = .55;
  // a little room in the low-mids for the engine (the SFX bus), and a 1 dB duck when SFX.blip signals a big rev
  E.lm = ac.createBiquadFilter(); E.lm.type = 'peaking'; E.lm.frequency.value = 230; E.lm.Q.value = .9; E.lm.gain.value = -1.5; E.rduck = ac.createGain(); E.rduck.gain.value = 1;
  E.revIn.connect(E.rev).connect(E.revOut).connect(E.bus); E.bus.connect(E.lm).connect(E.guard).connect(E.rduck).connect(E.out).connect(dest);
  E.sting = ac.createGain(); E.sting.gain.value = 1; E.stingGuard = ac.createWaveShaper(); E.stingGuard.curve = guardCurve(); E.stingGuard.oversample = '2x';
  E.stingRev = ac.createGain(); E.stingRev.gain.value = .35; E.sting.connect(E.stingRev).connect(E.revIn);   // stings get the hall too
  E.sting.connect(E.stingGuard); E.stingDest = null; E.routeSting = d => { if(E.stingDest === d) return; try{ E.stingGuard.disconnect(); }catch(e){} E.stingGuard.connect(d); E.stingDest = d; };
  E.routeSting(dest);
  E.route = d => { if(E.dest === d) return; try{ E.out.disconnect(); }catch(e){} E.out.connect(d); E.dest = d; };
  return E; }

const DRIVE = {}; function driveCurve(k){ if(DRIVE[k]) return DRIVE[k]; const c = new Float32Array(1024); for(let i = 0; i < 1024; i++){ const x = i / 511.5 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return DRIVE[k] = c; }
function makeDeck(E, C, at, opts){ const ac = E.ac, th = C.th, D = { E, C, th, bi:0, st:0, t:at, gs:0, e:opts && opts.energy != null ? opts.energy : 2, alive:true, dieT:0, crash:!!(opts && opts.crash), fillReq:false, solo:opts && opts.solo, pumps:[] };
  if(opts && opts.from && C.secStart[opts.from] != null) D.bi = C.secStart[opts.from];   // a border may enter at the intro or straight at A
  D.out = ac.createGain(); D.out.gain.value = 0; D.out.gain.setValueAtTime(0, Math.max(0, at - .02)); const off = !(opts && opts.leads) && !leadsOn(C.key);
  // lead switch: muted parts; a chant melody (chantLead) stays, an octave down in the mid register
  D.mute = C.parts.map(p => (th.keep && !th.keep.includes(p)) || (off && LEAD_PARTS.includes(p) && !(p === 'lead' && th.chantLead))); D.tr = C.parts.map(p => off && p === 'lead' && th.chantLead ? -12 : 0); D.pDb = PRES[C.key] != null ? PRES[C.key] : 5; D.bed = D.mute.some(Boolean) || !!th.bedOnly; D.g0 = th.gain * (D.bed ? (th.bedGain || 1) * Math.pow(10, -.2 * (D.pDb - 5) / 20) : 1);
  D.out.gain.linearRampToValueAtTime(D.g0, at + .01);
  D.lp = ac.createBiquadFilter(); D.lp.type = 'lowpass'; D.lp.frequency.value = 20000; D.lp.Q.value = .5; D.lpF = 20000;
  // the build's air: a high shelf, 0 dB in the approved mix, opened by the swell and closed by a quiet stretch (always on a bar line)
  D.air = ac.createBiquadFilter(); D.air.type = 'highshelf'; D.air.frequency.value = 6500; D.air.gain.value = 0;
  D.lp.connect(D.air).connect(D.out).connect(E.bus);   // (a presence lift is spliced in below when the lead is off)
  if(D.bed){ D.pres = ac.createBiquadFilter(); D.pres.type = 'peaking'; D.pres.frequency.value = 2200; D.pres.Q.value = .7; D.pres.gain.value = D.pDb; D.air.disconnect(); D.air.connect(D.pres).connect(D.out); }   // without a lead the bed needs presence for laptop speakers (measured 2-9 % in 1-4 kHz without it)
  D.dly = ac.createDelay(2); D.dly.delayTime.value = (th.dly ? th.dly.b : .75) * 60 / th.bpm; D.fb = ac.createGain(); D.fb.gain.value = th.dly ? th.dly.fb : .3;
  D.fbLp = ac.createBiquadFilter(); D.fbLp.type = 'lowpass'; D.fbLp.frequency.value = 3200; D.dIn = ac.createGain(); D.dIn.gain.value = 1;
  // a ping-pong feel: the repeats sit wide
  D.dPan = ac.createStereoPanner(); D.dPan.pan.value = -.45; D.dIn.connect(D.dly); D.dly.connect(D.fbLp).connect(D.fb).connect(D.dly); D.fbLp.connect(D.dPan).connect(D.lp);
  const dirt = GRIT[C.key] != null && !(opts && opts.clean); if(dirt) D.g0 *= Math.pow(10, GRIT[C.key] / 20);
  D.out.gain.cancelScheduledValues(0); D.out.gain.setValueAtTime(0, Math.max(0, at - .02)); D.out.gain.linearRampToValueAtTime(D.g0, at + .01);
  D.ch = C.parts.map(p => { const P = th.parts[p], c = {}; const ins = P.kit ? null : Object.assign({}, INST[P.inst], P.o || {}); if(!P.kit && !INST[P.inst]) throw new Error(th.name + ': no instrument ' + P.inst);
    // the gritty roads (see GRIT): the kit drier, louder and driven, the bass with the title's grit path, the bed saturated, darker and drier
    const role = P.kit ? 'kit' : p === 'bass' ? 'bass' : LEAD_PARTS.includes(p) ? 'lead' : 'bed', dk = dirt ? DIRT[role] : null;
    c.inst = ins; c.P = P; c.kit = !!P.kit; c.in = ac.createGain(); c.g = ac.createGain(); c.g.gain.value = (P.vol != null ? P.vol : 1) * (dk ? dk.vol : 1) * (D.solo && !soloHas(D.solo, p) ? 0 : 1);
    let node = c.in; const drv = P.drive || (dk ? dk.drive : 0);
    if(drv){ const ws = ac.createWaveShaper(); ws.curve = driveCurve(drv); ws.oversample = '2x'; node.connect(ws); node = ws;
      if(!P.drive){ const mk = ac.createGain(); mk.gain.value = Math.tanh(drv) / drv; node.connect(mk); node = mk; } }   // an added drive's small-signal gain taken back out (saturation, not level; for the kit only its body bus goes through it)
    if(P.cab){ const lp = ac.createBiquadFilter(), hp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.cab; lp.Q.value = .9; hp.type = 'highpass'; hp.frequency.value = 85; node.connect(hp).connect(lp); node = lp; }   // a speaker cabinet after the distortion
    else if(dk && dk.lp){ const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = dk.lp; lp.Q.value = .5; node.connect(lp); node = lp; }   // tape-dark: less sheen on top
    // grit (title's 808): a parallel copy of the part, hard-driven and band-passed to the upper harmonics (phone speakers have no sub)
    const GRP = P.grit || (dk && role === 'bass' ? GRIT_BASS[P.inst] || GRIT_BASS.reese : null);
    if(GRP){ const G = GRP, ws = ac.createWaveShaper(), h1 = ac.createBiquadFilter(), h2 = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), gg = ac.createGain(); ws.curve = driveCurve(G.k || 10); ws.oversample = '2x';
      h1.type = h2.type = 'highpass'; h1.frequency.value = h2.frequency.value = G.hp || 350; lp.type = 'lowpass'; lp.frequency.value = G.lp || 1800; gg.gain.value = G.g || .4; c.in.connect(ws).connect(h1).connect(h2).connect(lp).connect(gg).connect(c.g); }
    if(P.kit){ // three kit busses: body (centre), hats (right), hand percussion (left)
      c.body = c.in; c.hat = ac.createGain(); c.perc = ac.createGain(); const ph = ac.createStereoPanner(), pp = ac.createStereoPanner(); ph.pan.value = .2; pp.pan.value = -.25;
      c.hat.connect(ph).connect(c.g); c.perc.connect(pp).connect(c.g); }
    if(P.wide){ const l = ac.createStereoPanner(), r = ac.createStereoPanner(), dl = ac.createDelay(.05); l.pan.value = -P.wide; r.pan.value = P.wide; dl.delayTime.value = .013;   // Haas width
      node.connect(l).connect(c.g); node.connect(dl).connect(r).connect(c.g); }
    else { const pan = ac.createStereoPanner(); pan.pan.value = P.pan || 0; node.connect(pan).connect(c.g); }
    if(P.pump){ c.pg = ac.createGain(); c.g.connect(c.pg).connect(D.lp); D.pumps.push({ p:c.pg.gain, d:P.pump }); } else c.g.connect(D.lp);   // sidechain-style pump against the kick
    if(P.dly){ c.ds = ac.createGain(); c.ds.gain.value = P.dly * (dk ? dk.dly : 1); c.g.connect(c.ds).connect(D.dIn); }
    const rv = (P.rev != null ? P.rev : P.kit ? .14 : .2) * (dk ? dk.rev : 1); if(rv > 0){ c.rs = ac.createGain(); c.rs.gain.value = rv; c.g.connect(c.rs).connect(E.revIn); }
    return c; });
  // the build (see below): two overlay channels the arrangement never uses, the latched layer state and the targets the owner steers
  const xch = (rv, pmp) => { const c = { in:ac.createGain(), g:ac.createGain() }; c.g.gain.value = 0; c.in.connect(c.g); if(pmp){ c.pg = ac.createGain(); c.g.connect(c.pg).connect(D.lp); D.pumps.push({ p:c.pg.gain, d:pmp }); } else c.g.connect(D.lp); c.rs = ac.createGain(); c.rs.gain.value = rv; c.g.connect(c.rs).connect(E.revIn); return c; };
  D.xp = xch(.45, .5); D.xc = xch(.12, .45); D.xp.g.gain.value = .9;
  D.x = { sw:0, swDn:0, cs:0, tk:0, esc:0, lift:0, air:0, sn:0 }; D.tg = { sw:0, cs:0, tk:0, esc:false, lastCs:0 };
  D.isLead = C.parts.map(p => LEAD_PARTS.includes(p)); D.isBass = C.parts.map(p => p === 'bass'); D.padLo = nm(th.padLow || 'G3') + 12; D.bassLo = nm(th.bassLow || 'E1') + 12; D.kc = C.PI.kit != null ? D.ch[C.PI.kit] : null;
  return D; }
const soloHas = (solo, p) => Array.isArray(solo) ? solo.includes(p) : solo === p;   // a solo may name one part or several (melody-only renders)
function killDeck(D, at, tau){ if(!D.alive) return; D.alive = false; D.dieT = at + tau * 8 + 2.5; D.out.gain.cancelScheduledValues(at); D.out.gain.setTargetAtTime(0, at, tau); }
function freeDeck(D){ try{ D.out.disconnect(); D.lp.disconnect(); D.air.disconnect(); for(const c of [D.xp, D.xc]){ c.in.disconnect(); c.g.disconnect(); c.rs.disconnect(); if(c.pg) c.pg.disconnect(); } D.dly.disconnect(); D.fb.disconnect(); D.fbLp.disconnect(); for(const c of D.ch){ c.g.disconnect(); c.in.disconnect(); if(c.pg) c.pg.disconnect(); } }catch(e){} }
function pump(D, t){ for(let i = 0; i < D.pumps.length; i++){ const q = D.pumps[i]; q.p.setTargetAtTime(1 - q.d, t, .005); q.p.setTargetAtTime(1, t + .03, .085); } }

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
// one note of a subtractive, FM or formant ("vox") instrument into a channel input; every node is created per note and stopped after its tail
function playVoice(E, I, dest, n, t, dur, v, gl){ const ac = E.ac, poly = Array.isArray(n);
  if(poly){ const k = 1 / Math.sqrt(n.length); for(const m of n) playVoice(E, I, dest, m, t, dur, v * k, 0); return; }
  if(typeof n !== 'number' || !isFinite(n) || !isFinite(t) || !isFinite(dur)) return;   // guard: never hand Web Audio a non-finite value
  const f = mtof(n), off = t + Math.max(dur, I.a + .01), end = off + I.r * 5 + .05, g = ac.createGain(), pk = I.vol * v;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + I.a); g.gain.setTargetAtTime(pk * I.s, t + I.a, Math.max(.01, I.d / 3)); g.gain.setTargetAtTime(0, off, Math.max(.008, I.r / 3));
  g.connect(dest);
  if(I.t === 'fm'){ const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), fm = f * I.ratio;
    car.frequency.setValueAtTime(f, t); if(I.bend){ car.detune.setValueAtTime(I.bend, t); car.detune.setTargetAtTime(0, t, .025); }
    mod.frequency.value = fm; mg.gain.setValueAtTime(I.idx * fm, t); mg.gain.setTargetAtTime(I.idxEnd * fm, t, I.idxT / 3);
    mod.connect(mg).connect(car.frequency); car.connect(g); car.start(t); mod.start(t); car.stop(end); mod.stop(end); car.onended = () => g.disconnect();
    if(I.dbl){ const c2 = ac.createOscillator(), g2 = ac.createGain(); c2.frequency.value = f; c2.detune.value = I.dbl; g2.gain.value = .5; mg.connect(c2.frequency); c2.connect(g2).connect(g); c2.start(t); c2.stop(end); }
    return; }
  let tgt = g;
  if(I.t === 'vox'){ const mix = ac.createGain(); mix.gain.value = 1; for(const [ff, fg, fq] of VOWEL[I.vowel || 'a']){ const bp = ac.createBiquadFilter(), bg = ac.createGain(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = fq; bg.gain.value = fg * 3.2; mix.connect(bp).connect(bg).connect(g); }
    tgt = mix;
    if(I.cons){ const src = ac.createBufferSource(), hp = ac.createBiquadFilter(), cg = ac.createGain(); src.buffer = E.noise; hp.type = 'highpass'; hp.frequency.value = 2600;   // the consonant of a shout
      cg.gain.setValueAtTime(0, t); cg.gain.linearRampToValueAtTime(I.cons * v, t + .003); cg.gain.setTargetAtTime(0, t + .012, .015); src.connect(hp).connect(cg).connect(dest); src.start(t, (n * .173) % 1.5); src.stop(t + .08); src.onended = () => cg.disconnect(); } }
  else if(I.cut){ const fl = ac.createBiquadFilter(); fl.type = I.bp ? 'bandpass' : 'lowpass'; fl.Q.value = I.q || .7; const c0 = Math.min(18000, I.cut);
    if(I.fenv){ fl.frequency.setValueAtTime(c0, t); fl.frequency.linearRampToValueAtTime(Math.min(18000, c0 + I.fenv), t + (I.fa || .005)); fl.frequency.setTargetAtTime(c0, t + (I.fa || .005), Math.max(.01, (I.fd || .2) / 3)); fl.frequency.setValueAtTime(c0, t + (I.fa || .005) + (I.fd || .2) * 1.7); }   // end the automation: a settled filter costs far less per sample
    else fl.frequency.value = c0; fl.connect(g); tgt = fl; }
  let lg = null, lfo = null; if(I.vib && dur > I.vib[0] + .05){ lfo = ac.createOscillator(); lg = ac.createGain(); lfo.frequency.value = I.vib[2]; lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + I.vib[0]); lg.gain.linearRampToValueAtTime(I.vib[1], t + I.vib[0] + .25); lfo.connect(lg); lfo.start(t); lfo.stop(end); }
  for(let i = 0; i < I.osc.length; i++){ const o = ac.createOscillator(); o.type = I.osc[i]; const f0 = gl ? mtof(gl) : f;
    if(gl){ o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f, t + (I.gl || .05)); }
    else if(I.pdrop){ o.frequency.setValueAtTime(f * Math.pow(2, I.pdrop / 12), t); o.frequency.exponentialRampToValueAtTime(f, t + (I.pdropT || .05)); }
    else o.frequency.setValueAtTime(f, t);
    o.detune.value = (I.det && I.det[i]) || 0;
    if(I.bend){ o.detune.setValueAtTime(((I.det && I.det[i]) || 0) + I.bend, t); o.detune.setTargetAtTime((I.det && I.det[i]) || 0, t + .02, .05); }
    if(lg) lg.connect(o.detune);
    if(I.mix && I.mix[i] !== 1){ const mg = ac.createGain(); mg.gain.value = I.mix[i]; o.connect(mg).connect(tgt); } else o.connect(tgt);
    o.start(t); o.stop(end); if(i === 0) o.onended = () => g.disconnect(); } }   // a finished note leaves the graph

// drums: every hit synthesised (sine sweeps, filtered noise, FM metal)
function noiseHit(E, dest, t, type, f, q, v, a, d, hold){ const ac = E.ac, src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = E.noise; src.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a);   // looped: a long tail never runs off the buffer's end (a click)
  if(hold){ g.gain.setValueAtTime(v * .8, t + a + hold); g.gain.linearRampToValueAtTime(0, t + a + hold + .03); } else g.gain.setTargetAtTime(0, t + a, d / 3);
  src.connect(fl).connect(g).connect(dest); src.start(t, ((t * 7.31) % 1.5 + 1.5) % 1.5); src.stop(t + a + (hold ? hold + .05 : d * 2.5)); src.onended = () => g.disconnect(); }
function toneHit(E, dest, t, type, f0, f1, ft, v, d){ const ac = E.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + ft);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .002); g.gain.setTargetAtTime(0, t + .002, d / 3); o.connect(g).connect(dest); o.start(t); o.stop(t + d * 2.2 + .02); o.onended = () => g.disconnect(); }
function fmHit(E, dest, t, f, ratio, idx, v, d){ const ac = E.ac, car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
  car.frequency.value = f; mod.frequency.value = f * ratio; mg.gain.setValueAtTime(f * idx, t); mg.gain.setTargetAtTime(f * idx * .1, t, d / 4); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .002); g.gain.setTargetAtTime(0, t + .002, d / 3);
  mod.connect(mg).connect(car.frequency); car.connect(g).connect(dest); car.start(t); mod.start(t); car.stop(t + d * 2.4); mod.stop(t + d * 2.4); car.onended = () => g.disconnect(); }
const KIT_BODY = .34, KIT_TOP = .55;   // kit trims from the solo balance pass
function drum(E, c, hit, t, v, style, s16){ const st = style || {}, soft = st.soft ? .7 : 1, q = s16 || .1; v *= 'kKsctmjJgIv'.includes(hit) && hit.length === 1 ? KIT_BODY : KIT_TOP;
  switch(hit){
    case 'k': toneHit(E, c.body, t, 'sine', 170, 50, .07, 1 * v, st.kd || .32); noiseHit(E, c.body, t, 'highpass', 2800, .7, .14 * v, .001, .012); break;
    case 'K': toneHit(E, c.body, t, 'sine', 120, 42, .1, 1.05 * v, st.k8 || .9); noiseHit(E, c.body, t, 'highpass', 3000, .7, .08 * v, .001, .01); break;   // 808
    case 's': noiseHit(E, c.body, t, 'bandpass', 1800, .5, .55 * v * soft, .001, 0, .19); noiseHit(E, c.body, t, 'highpass', 5000, .7, .22 * v * soft, .001, .04);   // a big gated snare
      toneHit(E, c.body, t, 'triangle', 210, 180, .05, .4 * v * soft, .09); break;
    case 'c': for(let i = 0; i < 3; i++) noiseHit(E, c.body, t + i * .011, 'bandpass', 1150, 1.3, (i === 2 ? .55 : .38) * v, .001, i === 2 ? .2 : .012); break;
    case 'h': noiseHit(E, c.hat, t, 'highpass', 7600, .7, .16 * v * soft, .001, st.tight ? .024 : .035); break;
    case 'h2': noiseHit(E, c.hat, t, 'highpass', 8200, .7, .13 * v, .001, st.tight ? .018 : .025); break;
    case 'y': for(let i = 0; i < 3; i++) noiseHit(E, c.hat, t + i * q * 2 / 3, 'highpass', 8000, .7, .12 * v * (.7 + i * .15), .001, .02); break;   // a triplet hat roll
    case 'o': noiseHit(E, c.hat, t, 'highpass', 6800, .7, .13 * v, .002, st.tight ? .15 : .26); break;
    case 'r': noiseHit(E, c.hat, t, 'bandpass', 5200, 1.6, .1 * v, .001, .32); fmHit(E, c.hat, t, 3100, 1.41, 1.5, .012 * v, .3); break;
    case 'a': noiseHit(E, c.hat, t, 'bandpass', 5200, 1.4, .11 * v, .008, .05); break;
    case 'C': noiseHit(E, c.hat, t, 'highpass', 3600, .5, .22 * v, .002, 2.2); noiseHit(E, c.hat, t, 'bandpass', 6200, 1, .1 * v, .002, 1.2); break;
    case 't': toneHit(E, c.body, t, 'sine', 165, 92, .14, .6 * v, .28); break;
    case 'm': toneHit(E, c.body, t, 'sine', 235, 135, .12, .5 * v, .22); break;
    case 'j': toneHit(E, c.body, t, 'sine', 210, 150, .03, .5 * v, .12); noiseHit(E, c.body, t, 'bandpass', 900, 1.2, .35 * v, .001, .05); break;   // shime-daiko
    case 'J': toneHit(E, c.body, t, 'sine', 68, 44, .25, 1.1 * v, 1.1); noiseHit(E, c.body, t, 'lowpass', 220, .7, .5 * v, .002, .6); noiseHit(E, c.body, t, 'bandpass', 1200, 1, .25 * v, .001, .03); break;   // o-daiko: thump, skin and a long body
    case 'g': toneHit(E, c.body, t, 'sine', 66, 62, 2, .8 * v, 4); fmHit(E, c.body, t, 66, 1.48, .8, .45 * v, 3); noiseHit(E, c.body, t, 'lowpass', 400, .7, .3 * v, .002, .5); break;   // gong
    case 'b': toneHit(E, c.perc, t, 'square', 562, 560, .1, .05 * v, .1); toneHit(E, c.perc, t, 'square', 845, 843, .1, .05 * v, .1); break;
    case 'i': toneHit(E, c.perc, t, 'triangle', 520, 470, .05, .28 * v, .13); noiseHit(E, c.perc, t, 'highpass', 3000, .7, .08 * v, .001, .04); break;
    case 'e': fmHit(E, c.perc, t, 330, 1.414, 7, .16 * v, .25); break;   // anvil
    case 'q': toneHit(E, c.perc, t, 'square', 1700, 1650, .02, .05 * v, .025); noiseHit(E, c.perc, t, 'bandpass', 2400, 2, .12 * v, .001, .02); break;
    case 'v': { const ac = E.ac, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth';   // an engine rev, the bosozoku call
      o.frequency.setValueAtTime(58, t); o.frequency.linearRampToValueAtTime(128, t + .09); o.frequency.exponentialRampToValueAtTime(72, t + .3); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35 * v, t + .01); g.gain.setTargetAtTime(0, t + .12, .07); o.connect(lp).connect(g).connect(c.perc); o.start(t); o.stop(t + .5); o.onended = () => g.disconnect(); break; }
    case 'R': { const ac = E.ac, L = q * 16, src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = E.noise; src.loop = true;   // a riser over one bar
      bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + L);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3 * v, t + L); g.gain.linearRampToValueAtTime(0, t + L + .02); src.connect(bp).connect(g).connect(c.hat); src.start(t); src.stop(t + L + .05); src.onended = () => g.disconnect(); break; }
    case 'V': { const ac = E.ac, L = q * 4, src = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = E.noise; src.loop = true;   // a reverse cymbal into the next downbeat
      hp.type = 'highpass'; hp.frequency.value = 4200; g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.4 * v, t + L); g.gain.linearRampToValueAtTime(0, t + L + .03);
      src.connect(hp).connect(g).connect(c.hat); src.start(t); src.stop(t + L + .05); src.onended = () => g.disconnect(); break; }
    case 'w': { const L = q * 16;
      // the water: a low roar swelling over half a bar and falling away, spray a little higher on the other side
      noiseHit(E, c.perc, t, 'lowpass', 420, .6, .5 * v, L * .45, L * .9); noiseHit(E, c.hat, t + .011, 'bandpass', 1300, .7, .16 * v, L * .5, L * .6); break; }
    case 'P': { const ac = E.ac, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth';
      // the power dies: the mains note sags three octaves as the filter closes
      o.frequency.setValueAtTime(370, t); o.frequency.exponentialRampToValueAtTime(46, t + .9); lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(2200, t); lp.frequency.exponentialRampToValueAtTime(140, t + .9);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3 * v, t + .01); g.gain.setTargetAtTime(0, t + .5, .15); o.connect(lp).connect(g).connect(c.perc); o.start(t); o.stop(t + 1.3); o.onended = () => g.disconnect(); break; }
    case 'z':
      // the atarigane: a small hand gong, struck (kon) or damped (chiki); an accent rings longer (chin)
      fmHit(E, c.hat, t, 1480, 1.47, 2.2, .07 * v, v > .9 ? .5 : .16); fmHit(E, c.hat, t, 2210, 1.41, 1.4, .03 * v, v > .9 ? .35 : .1); break;
    case 'E': { const ac = E.ac, src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = E.noise; src.loop = true;
      // the eruption: a sub dive, then a crack of rock opening upward (band-passed noise rising), and the crash
      toneHit(E, c.body, t, 'sine', 64, 22, .9, .9 * v, 2.2); bp.type = 'bandpass'; bp.Q.value = 1.1; bp.frequency.setValueAtTime(160, t); bp.frequency.exponentialRampToValueAtTime(2600, t + .7);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32 * v, t + .03); g.gain.setTargetAtTime(0, t + .35, .25); src.connect(bp).connect(g).connect(c.body); src.start(t); src.stop(t + 1.8); src.onended = () => g.disconnect();
      drum(E, c, 'C', t, v / KIT_TOP * .8, st, s16); break; }
    case 'I': toneHit(E, c.body, t, 'sine', 80, 28, .5, 1.1 * v, 1.6); noiseHit(E, c.body, t, 'lowpass', 900, .7, .5 * v, .002, .7); drum(E, c, 'C', t, v / KIT_BODY, st, s16); break; } }   // impact: sub boom, a wash and a crash

/* ================================================================== the deck scheduler: one compiled song on the audio clock */
function stepDeck(D, until, onBar){ const C = D.C, th = D.th, s16 = C.s16, sw = (th.swing || 0) * s16, E = D.E;
  while(D.alive && D.t < until){ if(D.st === 0 && D.xq) jumpNow(D);
    const bar = curBar(D), s = D.st, t = D.t + (s % 2 ? sw : 0);
    if(s === 0 && onBar && onBar(D, bar) === false) return;   // the owner may switch songs on this bar line
    const X = D.x; if(s === 0) latch(D); if(s % 4 === 0) latchBeat(D, t);
    const tk = X.tk, drop = X.esc === 1, eCap = tk >= 1 ? Math.min(D.e, 1) : tk > 0 ? Math.min(D.e, 2) : D.e;
    if(D.crash){ const h = D.crash === true ? 'C' : D.crash; D.crash = false; drum(E, D.ch[C.PI.kit] || D.ch[0], h, t, .9, th.style, s16); }
    const evs = D.fillReq && s >= 12 && bar.fill ? null : bar.ev[s];
    let hatHere = false;
    if(evs) for(let i = 0; i < evs.length; i++){ const ev = evs[i]; if(ev.lay > eCap || D.mute[ev.p]) continue; const c = D.ch[ev.p]; if(D.solo && !soloHas(D.solo, C.parts[ev.p])) continue;
      if(tk >= 1 && D.isLead[ev.p]) continue;
      if(ev.kit){ if(ev.kit !== 'R' && ev.kit !== 'V' && (drop || tk >= 1 || (tk > 0 && !thinKit(ev.kit, s)))) continue;
        if(ev.kit === 'h' || ev.kit === 'h2' || ev.kit === 'y') hatHere = true; }
      else if(drop && D.isBass[ev.p]) continue;
      if(ev.kit){ drum(E, c, ev.kit, t, ev.v, th.style, s16); if((ev.kit === 'k' || ev.kit === 'K') && D.pumps.length) pump(D, t); }
      else { const tr = D.tr[ev.p]; playVoice(E, c.inst, c.in, tr ? (Array.isArray(ev.n) ? ev.n.map(x => x + tr) : ev.n + tr) : ev.n, t, ev.d * s16, ev.v, ev.gl && tr ? ev.gl + tr : ev.gl); } }
    if(!D.solo && !(D.xs && D.xs.bare)) layers(D, bar, s, t, hatHere);
    const fill = (D.fillReq || bar.last) && s >= 12 && bar.fill && tk <= 0 && !drop ? bar.fill[s] : null;
    if(fill && D.e >= 1) for(let i = 0; i < fill.length; i++){ const ev = fill[i]; const c = D.ch[ev.p]; if(D.solo && !soloHas(D.solo, 'kit')) continue; drum(E, c, ev.kit, t, ev.v, th.style, s16); }
    D.st++; D.t += s16; D.gs++;
    if(D.st >= 16){ D.st = 0; D.fillReq = false;
      if(D.xs){ const X = D.xs; if(++X.i >= X.bars.length){ if(X.hold) X.i = Math.min(X.holdFrom, X.bars.length - 1); else if(X.next && C.xs[X.next]) setXs(D, X.next); else { D.xs = null; D.bi = C.secStart[X.ret] != null ? C.secStart[X.ret] : D.bi; } } }
      else { D.bi++; if(D.bi >= C.bars.length){ D.bi = C.loopAt; D.loops = (D.loops || 0) + 1; } } } } }
/* set-piece sections (C.xs): the owner asks with D.xq = a section name, or 'main' to leave a held one; the jump lands on the next bar
   line. The form's place is kept: leaving goes to the section's ret if it names one, else back where the form was. */
const curBar = D => D.xs ? D.xs.bars[D.xs.i] : D.C.bars[D.bi];
function setXs(D, name){ const m = D.C.xm[name]; D.xs = Object.assign({ name, bars:D.C.xs[name], i:0 }, m); }
function jumpNow(D){ const q = D.xq, C = D.C; D.xq = null;
  if(q === 'main'){ if(D.xs){ const r = D.xs.ret; D.xs = null; if(C.secStart[r] != null) D.bi = C.secStart[r]; } return; }
  if(!C.xs || !C.xs[q] || (D.xs && D.xs.name === q)) return; setXs(D, q); }

const STING_TRIM = { b808:.5, subB:.55, J:.65, I:.7, chantA:1.6, chantO:1.6 };   // measured: stings were 80-94 % under 120 Hz; the chant shouts must reach laptop speakers
function playSting(E, S, at, rootMidi, dest){ const spb = 60 / S.bpm, d0 = dest || E.sting, C = { body:d0, hat:d0, perc:d0, in:d0 };
  const gs = S.gain != null ? S.gain : .5;   // per-sting trim, calibrated by measurement
  for(const [b, inst, rel, len, v] of S.ev){ const I = INST[inst], n = Array.isArray(rel) ? rel.map(r => rootMidi + r) : rootMidi + rel; playVoice(E, I, d0, n, at + b * spb, len * spb, v * gs * (STING_TRIM[inst] || 1), 0); }
  for(const [b, hit, v] of S.kit || []) drum(E, C, hit, at + b * spb, v * gs * (STING_TRIM[hit] || 1), {}, spb / 4);
  return at + (Math.max(...S.ev.map(e => e[0] + e[3]), ...(S.kit || []).map(k => k[0])) * spb); }

/* ================================================================== the build: the arrangement swells with you (nothing re-composed)
   Dream 9, "music as fuel" (research/sundown-feeling.md; notes in research/sundown-craft/fork_music.md). Overlays on any road's song,
   each latched on the song's own grid so nothing changes mid-phrase:
   - the swell (speed x the style chain's multiplier, D.tg.sw 0..1, in steps of .5 on bar lines, rising a step a bar, falling a step per
     two bars): .5 doubles the hats (16ths in the gaps) and opens the air shelf +1.5 dB; 1 adds the bar's chord an octave over the pad
     (a harmony pad on its own channel, pumped against the kick) and +3 dB of air.
   - the chase (MECH.heat's stage, else copT, latched on the beat): a driving pulse on the bar's bass note in the bass's upper octave,
     8ths at stage 1, 16ths from 2, octave jumps from 3, and at 4 a siren wail (fifth to octave, gliding, a half bar each). It rises with the
     stage (channel gain .6 .72 .85 1) and always wins over a quiet stretch.
   - the escape (a chase ending in play): the pulse stops on the beat; the next bar drops (no kit, no bass: the song's own riser and
     reverse cymbal still run), and the bar after lands an impact at energy 4, held two bars: the release.
   - thin (MUSIC.thin(k), the director's quiet stretch): over two bars, first a half-time kit (kick on 1 and 3, hats) at energy <= 2, then
     no kit and no lead at energy <= 1, the air shelf -3 dB; the bass and the bed stay. A chase cancels it at once.
   With no swell, chase or thin the song plays exactly as approved. */
const CS_G = [0, .6, .72, .85, 1];
function thinKit(k, s){ return k === 'h' || k === 'h2' || k === 'o' || ((k === 'k' || k === 'K' || k === 'J') && s % 8 === 0); }
function latch(D){ const X = D.x, g = D.tg; if(!X) return;
  if(X.esc === 1){ X.esc = 0; D.crash = 'I'; D.e = 4; X.lift = 2; }
  else if(g.esc){ g.esc = false; X.esc = 1; X.cs = 0; }
  const tk = g.cs > 0 || X.lift > 0 ? 0 : g.tk; X.tk = tk > X.tk ? Math.min(tk, X.tk + .5) : Math.max(tk, X.tk - .5);
  const q = g.sw >= .9 ? 1 : g.sw >= .45 ? .5 : 0;
  if(q > X.sw){ X.sw = Math.min(q, X.sw + .5); X.swDn = 0; } else if(q < X.sw){ if(++X.swDn >= 2){ X.sw = Math.max(q, X.sw - .5); X.swDn = 0; } } else X.swDn = 0;
  const air = X.tk > 0 ? -3 * X.tk : 3 * X.sw; if(air !== X.air){ X.air = air; D.air.gain.setTargetAtTime(air, D.t, .3); } }
function latchBeat(D, t){ const X = D.x, g = D.tg; if(!X || X.esc === 1) return; const cs = g.cs;
  if(cs !== X.cs){ X.cs = cs; if(cs > 0) X.tk = 0; D.xc.g.gain.setTargetAtTime(CS_G[cs] || 0, t, .04); } }
function layers(D, bar, s, t, hatHere){ const X = D.x, E = D.E, s16 = D.C.s16, ch = s < 8 ? bar.ch[0] : bar.ch[1];
  if(X.sw >= .5 && X.tk <= 0 && X.esc !== 1 && D.kc && s % 2 === 1 && !hatHere) drum(E, D.kc, 'h2', t, .75, D.th.style, s16);
  if(X.sw >= 1 && X.tk <= 0 && (s === 0 || (s === 8 && bar.ch[1] !== bar.ch[0]))) playVoice(E, INST.spad, D.xp.in, padVoice(ch, D.padLo), t, (s === 0 && bar.ch[1] === bar.ch[0] ? 16 : 8) * s16, .8, 0);
  if(X.esc === 1 && D.kc){ if(s === 0) drum(E, D.kc, 'R', t, .8, D.th.style, s16); else if(s === 12) drum(E, D.kc, 'V', t, .8, D.th.style, s16); }   // the drop bar breathes in
  const cs = X.cs; if(cs <= 0 || X.esc === 1) return;
  if(cs >= 2 || s % 2 === 0){ const b = above(ch.b, D.bassLo), up = cs >= 3 && s % 4 === 2 ? 12 : 0; playVoice(E, INST.pulse, D.xc.in, b + up, t, s16 * .8, s % 4 === 0 ? 1 : .72, 0); }
  if(cs >= 4 && (s === 0 || s === 8)){ const b = above(ch.b, D.bassLo) + 12, n = s === 0 ? b + 7 : b + 12; playVoice(E, INST.siren, D.xc.in, n, t, 8 * s16, .9, X.sn || 0); X.sn = n; } }
// the targets, from the game (live) or a script (render): sp 0..1 of top speed, mult the style chain's multiplier, cs the chase stage,
// thin the quiet stretch, play whether the ride is on (a chase ending in play is an escape)
function steer(D, I){ const g = D && D.tg; if(!g) return;
  g.sw = Math.max(0, Math.min(1, (I.sp - .8) / .15)) * Math.max(0, Math.min(1, (I.mult - 1) / 4));
  if(g.lastCs > 0 && I.cs === 0 && I.play) g.esc = true; g.lastCs = I.cs; g.cs = I.cs; g.tk = I.cs > 0 ? 0 : I.thin; }

/* ================================================================== the owner: one song at a time, chosen from the game's state */
const COMPILED = {}; const comp = k => COMPILED[k] || (COMPILED[k] = Object.assign(compile(T[k]), { key:k }));
// Lead switch (user, round 5: "remove the leads from all music except for the neon city"). The melody data stays; a theme plays its
// lead, lead2 (the bell/glock/gamelan doubling) and solo parts only when MUSIC.LEADS[key] is true. With the lead off, the bed is
// (themes marked chantLead keep their chant melody an octave down, in the mid register, and lose only its bell doubling) is
// lifted by the theme's measured bedGain so it still sits at the loudness target. Turn a road's lead back on: MUSIC.LEADS.harbour = true.
const LEAD_PARTS = ['lead', 'lead2', 'solo'], LEADS = { neon:true };
/* per-theme presence lift (dB at 2.2 kHz) while the lead is off; 5 if not listed. Craft pass (research/sundown-craft/audio.md): on a
   phone-speaker model these beds lost 5.4-7.1 LU against their full-range loudness while the others lost 2-4, so a phone heard Pass ~5 dB
   quieter than Aqua-Line at the same setting. Each +2 dB here won back ~1 LU on the phone; the bed gain is trimmed 0.2 dB per dB so the
   full-range loudness holds. */
const PRES = { title:9, bay:7, pass:9, refinery:7, coast:7, shimanami:7, haneda:7, sakurajima:11, snow:7, shuto:7, minato:7, kurobe:9, akiba:7, gion:9 };   // the five beds written 2026-11-21 (bedOnly) take it too; sakurajima 11: its bed is all guitar chug and sub
const leadsOn = k => !!LEADS[k];
/* The gritty roads (user, 2026-11-19, after the drums-and-808 title: "i also really like the gritty soundtrack on the title screen can we
   have the in game music match that vibe better"). A sound and mix change, nothing re-composed; harmonies, leads, PRES and the build stay:
   - bass: the title's parallel grit path (hard-driven, band-passed 350-1800 Hz), its level by the bass voice (an 808 or a sine sub has
     no mids of its own; a reese has some);
   - kit: +1.7 dB like the title, a little drive on the body bus (kick, snare, toms; the hats bypass it), half the reverb, tighter hats;
   - bed (pads, harmonies, arps, chants, guitars): gentle saturation (tape) and a 5.2 kHz roll-off where it has no cabinet, 60 % of the
     reverb and 70 % of the delay;
   - GRIT[key]: the road's level trim in dB, measured so its loudness holds (research/sundown-craft/fork_music.md).
   Title and Results are not listed (the title has its own treatment; Results was approved by ear). */
// Darker, harder (2026-11-19): coast, shimanami, snow and haneda re-trimmed after the re-composition so each holds its loudness.
// snow, sakurajima, kurobe, akiba, gion (written 2026-11-21): 0 here; their loudness is set by the theme's gain, measured.
const GRIT = { harbour:-0.5, bay:-0.1, neon:-0.6, tunnels:-1.1, pass:-1.6, refinery:-0.2, coast:-1.9, snow:0, paddies:-0.5, aqua:-1, shimanami:-1.4, sakurajima:0, haneda:-0.4, shuto:-0.6, minato:0.3, kurobe:0, akiba:0, gion:0 };
const GRIT_BASS = { b808:{ k:10, g:3 }, subB:{ k:10, g:2 }, reese:{ k:10, g:.25 } };
const DIRT = { kit:{ vol:1.22, drive:1.6, rev:.5, dly:1 }, bass:{ vol:1, drive:0, rev:1, dly:1 }, lead:{ vol:1, drive:0, rev:.8, dly:.8 }, bed:{ vol:1, drive:1.5, lp:5200, rev:.6, dly:.7 } };
for(const k in GRIT) if(T[k]) T[k].style = Object.assign({}, T[k].style, { tight:true });
const ROAD_THEME = { harbour:'harbour', bay:'bay', neon:'neon', tunnels:'tunnels', pass:'pass', refinery:'refinery', coast:'coast', snow:'snow', paddies:'paddies', aqua:'aqua', shimanami:'shimanami', sakurajima:'sakurajima', haneda:'haneda', minato:'minato', shuto:'shuto', kurobe:'kurobe', akiba:'akiba', gion:'gion' };
const CD_B = 60 / 126 * 1.5, CD_0 = .15, CD_GO = CD_0 + 3 * CD_B;   // mech/arrival.js's countdown timing (a count every 1.5 beats at 126)
const LOOK = .35, TICK_MS = 50;
const S = { M:null, E:null, deck:null, want:null, mode:'off', road:-1, eHold:0, eTgt:0, lastState:'', overT:0, caught:false, countT:0, countDeck:null,
  boostT:0, cues:{}, tickMs:0, ticks:0, lastBoost:0, stung:{}, iv:0, resultsAt:0, lpT:0, thinK:0 };
const g = name => { try{ return (0, eval)('typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined'); }catch(e){ return undefined; } };   // used once, at attach (not per tick)
let GA = null;   // accessors to the game's globals, built once
const IN = { sp:0, mult:1, cs:0, thin:0, play:false };   // the build's inputs, reused every tick (no allocation)
function bindGame(){ if(GA) return GA; const has = n => g(n) !== undefined;
  if(!has('state')) return null;
  GA = new Function('return { st:() => state, sp:() => (typeof speed === "number" && typeof MAXS === "number" ? speed / MAXS : 0), flow:() => (typeof flow === "number" ? flow : 0),' +
    'boost:() => (typeof boostT === "number" ? boostT : 0), btier:() => (typeof boostTier === "number" ? boostTier : 0), sheet:() => (typeof SHEET !== "undefined" && SHEET ? !SHEET.hidden : false),' +
    'land:() => (typeof landIdx === "function" && typeof zone === "function" && typeof LANDS !== "undefined" ? LANDS[landIdx(zone())] : null),' +
    'cop:() => (typeof copT === "number" ? copT : 0), land0:() => (typeof landIdx === "function" && typeof LANDS !== "undefined" ? LANDS[landIdx(0)] : null), pseg:() => (typeof position === "number" && typeof PZ === "number" && typeof SEG === "number" ? (position + PZ) / SEG : 0),' +
    'cs:() => (typeof position === "number" && typeof SEG === "number" ? position / SEG : 0) }')();
  return GA; }
/* the night bed (first 60 s): on the title and through START's wait only the city and the wind (Shadow of the Colossus, Akira's opening:
   silence is scored, and the music arrives with the event). Distant traffic hum (brown noise under 160 Hz, a slow swell), wind (two
   decorrelated noise bands around 500-900 Hz with slow, uneven gusts). It stays under the count and goes as the song lands on 走れ; in the
   ride the bike's own wind (audio/sfx.js) takes over. Through M.out, so the master volume and the director's duck apply. */
const AMB_LV = .5;
function ambBed(E, dest){ if(E.amb) return E.amb; const ac = E.ac, A = E.amb = { g:ac.createGain() }; A.g.gain.value = 0; A.g.connect(dest); A.dest = dest;
  const n = ac.sampleRate * 4, brown = ac.createBuffer(2, n, ac.sampleRate); let seed = 777;
  for(let c = 0; c < 2; c++){ const d = brown.getChannelData(c); let l = 0; for(let i = 0; i < n; i++){ seed = (seed * 1103515245 + 12345) >>> 0; l = (l + .02 * ((seed / 4294967296) * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
  const src = (buf, off) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(ac.currentTime + .01, off); return s; };
  // the city: low hum with a slow swell (two LFOs a prime ratio apart, so it never repeats audibly)
  const hum = src(brown, 0), hlp = ac.createBiquadFilter(), hg = ac.createGain(); hlp.type = 'lowpass'; hlp.frequency.value = 160; hlp.Q.value = .5; hg.gain.value = .55;
  hum.connect(hlp).connect(hg).connect(A.g);
  // the wind: two noise bands, left and right decorrelated, each gusting on its own slow LFO pair
  for(const [f, q, pan, r1, r2, off] of [[520, .7, -.5, .071, .19, .3], [880, .9, .5, .053, .23, 1.1]]){ const w = src(E.noise, off), bp = ac.createBiquadFilter(), wg = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; wg.gain.value = .07;
    for(const [rate, depth] of [[r1, .042], [r2, .021]]){ const o = ac.createOscillator(), od = ac.createGain(); o.frequency.value = rate; od.gain.value = depth; o.connect(od).connect(wg.gain); o.start(); }
    if(p){ p.pan.value = pan; w.connect(bp).connect(wg).connect(p).connect(A.g); } else w.connect(bp).connect(wg).connect(A.g); }
  return A; }
function amb(on, now, tau){ const E = S.E; if(!E || !S.M) return; const A = ambBed(E, S.M.out); const v = on ? AMB_LV * (typeof on === 'number' ? on : 1) : 0; if(A.v === v) return; A.v = v;
  A.g.gain.cancelScheduledValues(now); A.g.gain.setValueAtTime(A.g.gain.value, now); A.g.gain.setTargetAtTime(v, now, tau || (on ? .6 : .35)); }
function themeForLand(L){ return L && ROAD_THEME[L.key] ? ROAD_THEME[L.key] : 'harbour'; }
function energyNow(A){ const sp = A.sp(), fl = A.flow(); let e = sp < .4 ? 0 : sp < .75 ? 1 : 2; if(fl >= 3) e++; if(fl >= 6) e++; if(A.boost() > 0) e = Math.max(e, A.btier() >= 2 ? 4 : 3); return Math.min(4, e); }
function setCur(D){ const bar = curBar(D); if(!bar || !S.M) return; S.M.cur = D.st < 8 ? bar.cm[0] : bar.cm[1]; }
function startSong(key, at, opts){ const E = S.E, C = comp(key); if(S.deck && S.deck.alive) killDeck(S.deck, at, opts && opts.tau || .12);
  const D = makeDeck(E, C, at, Object.assign({ crash:true }, opts || {})); D.key = key; E.decks.push(D); S.deck = D; S.want = null; return D; }
function onBar(D, bar){ if(D !== S.deck) return true;
  if(S.want && S.want !== D.key){ const nk = S.want; startSong(nk, D.t, { energy:D.e, tau:.1, from:MUSIC.BORDER_FROM }); return false; }   // the switch lands on this bar line; the old song stops here
  if(D.x && D.x.lift > 0) D.x.lift--; else if(S.eTgt < D.e && S.eHold <= 0) D.e = S.eTgt;   // intensity falls only on a bar line, after holding (never in the escape's lift)
  return true; }
function tick(){ const M = S.M; if(!M || !M.ac) return; const ac = M.ac; if(!S.E){ attach(M); if(!S.E) return; } if(ac.state !== 'running') return;
  const t0 = HAS_WIN && performance ? performance.now() : 0, now = ac.currentTime, A = bindGame(); if(!A) return;
  const st = A.st(), E = S.E;
  // which song: title on the attract screen, the count-in, the road, the stings, the results
  const attract = st === 'ready' && A.sheet() && HAS_WIN && document.getElementById('attract');
  const cdOn = !!(HAS_WIN && window.MECH && MECH.arrival && MECH.arrival.countdownOn && MECH.arrival.countdownOn());
  let mode = attract ? 'title' : cdOn ? 'count' : st === 'play' ? 'ride' : st === 'pulled' ? 'pulled' : st === 'over' ? 'over' : st === 'ready' ? 'wait' : 'wait';
  if(mode !== S.mode){ enterMode(mode, S.mode, A, now); S.mode = mode; }
  if(mode === 'ride' || mode === 'count'){ const L = A.land(), key = themeForLand(L);
    if(mode === 'ride' && S.deck && S.deck.alive && S.deck.key !== key && S.want !== key){ S.want = key; S.deck.fillReq = S.deck.st <= 12; }
    if(mode === 'ride' && S.deck){ const e = energyNow(A); S.eTgt = e;
      if(e > S.deck.e){ S.deck.e = e; S.eHold = 2; if(e >= 3 && A.boost() > 0 && now - S.lastBoost > 1.5){ S.lastBoost = now; S.deck.crash = e >= 4 ? 'I' : true; } } else if(e === S.deck.e) S.eHold = 2; else S.eHold -= TICK_MS / 1000;
      // speed opens the filter: dull and close when crawling or just after a crash, wide open at speed
      const sp = Math.max(0, Math.min(1.2, A.sp())), f = Math.min(20000, 1700 + 18300 * sp * sp); if(Math.abs(f - S.deck.lpF) > S.deck.lpF * .04){ S.deck.lpF = f; S.deck.lp.frequency.cancelScheduledValues(now); S.deck.lp.frequency.setValueAtTime(S.deck.lp.frequency.value, now); S.deck.lp.frequency.linearRampToValueAtTime(f, now + .3); }
      const lift = S.deck.g0 * (S.deck.e >= 4 ? 1.19 : 1); if(S.deck.outG !== lift && S.deck.alive){ S.deck.outG = lift; S.deck.out.gain.setTargetAtTime(lift, now + .02, .08); }   // boost: +1.5 dB on top of its layers
      const sty = HAS_WIN && window.MECH && MECH.style, ht = HAS_WIN && window.MECH && MECH.heat;
      IN.sp = A.sp(); IN.mult = sty && typeof sty.mult === 'number' ? sty.mult : 1; IN.cs = ht && ht.owns && ht.owns() ? Math.max(1, Math.min(4, ht.stage() | 0)) : A.cop() > 0 ? 1 : 0;
      IN.thin = S.thinK; IN.play = st === 'play'; steer(S.deck, IN);
      setPieces(A, now); spTick(A); } }
  if(mode === 'over' && !S.deck && S.resultsAt && now >= S.resultsAt){ S.resultsAt = 0; startSong('results', now + .1, { energy:3, crash:false }); if(S.deck){ S.deck.lp.frequency.value = 20000; } }
  // schedule ahead on the audio clock; free decks that have faded out
  if(S.deck && S.deck.alive){ stepDeck(S.deck, now + LOOK, onBar); setCur(S.deck); publishClock(now); }
  for(let i = E.decks.length - 1; i >= 0; i--){ const D = E.decks[i]; if(!D.alive && now > D.dieT){ freeDeck(D); E.decks.splice(i, 1); } }
  if(HAS_WIN && performance){ S.tickMs += performance.now() - t0; S.ticks++; } }
function publishClock(now){ const D = S.deck, M = S.M; if(!D || !M) return; const s16_126 = 60 / 126 / 4, ahead = D.t - now;   // festival.js reads M.step and M.next on a 126 grid
  if(ahead < 0 || D.gs === 0) return; const fs = D.gs - ahead / D.C.s16; M.step = Math.ceil(fs); M.next = now + (M.step - fs) * s16_126; }
function enterMode(mode, prev, A, now){ const E = S.E;
  if(mode === 'count' || mode === 'wait' || mode === 'title') S.sp = null;   // a new ride: the set pieces' memory starts clean
  if(mode === 'title'){ E.route(S.M.out); const og = S.M.out.gain; if(og.value < .5){ og.cancelScheduledValues(now); og.setTargetAtTime(.85, now, .3); }   // home from the results: M.resolve faded M.out (as the Again button does)
    amb(false, now, .6); startSong('title', now + .15, { energy:3, crash:false }); S.deck.lp.frequency.value = 20000; return; }   // Kellan 2026-11-23: the 日没 title song is back on the title (the city-and-wind bed is gone from here)
  if(mode === 'count'){ E.route(S.M.out); if(S.deck && S.deck.alive) killDeck(S.deck, now, .15); S.deck = null;
    const L = A.land0() || A.land(), key = themeForLand(L), root = 48 + comp(key).keyPc - (comp(key).keyPc > 6 ? 12 : 0);
    S.countT = now; S.countBus = E.ac.createGain(); S.countBus.connect(E.bus); playSting(E, ST.count, now + CD_0, root, S.countBus); amb(.8, now, .4);
    S.goKey = key; S.goAt = 0; return; }   // the song itself starts on go() (onGo), not on a guess of when the count will end
  if(mode === 'ride'){ E.route(S.M.out);
    if(prev === 'count' && S.deck){ onGo(now); return; }   // (go() normally got here first, on the frame of 走れ)
    amb(false, now, .6);
    if(!S.deck || !S.deck.alive){ const key = themeForLand(A.land()); startSong(key, now + .1, { energy:1 }); }
    return; }
  if(mode === 'pulled'){ amb(false, now, .3); if(S.deck) killDeck(S.deck, now, .35); S.deck = null; S.caught = true; cue('pulled', now + .9); return; }
  if(mode === 'over'){ const caught = S.caught || prev === 'pulled'; S.caught = false; if(S.deck) killDeck(S.deck, now, .5); S.deck = null; amb(false, now, .4);
    const bus = HAS_WIN && window.MECH && MECH.director && MECH.director.bus ? MECH.director.bus() : null; if(bus) E.route(bus);   // past M.out, which M.resolve fades away
    if(!caught) cue('dawn', now + .4); S.resultsAt = now + (caught ? 3.5 : 6.5); return; }
  if(mode === 'wait'){ if(S.deck) killDeck(S.deck, now, .25); S.deck = null; S.resultsAt = 0; amb(true, now, .8); } }   // START's warm-up: the bed carries on
/* 走れ: the song's full kit lands on go() itself (mech/arrival.js calls it on the frame the GO card strikes, state becomes 'play'). The song
   starts 30 ms after go() and its first bars are scheduled at once (not on the next 50 ms tick), so a slow device's late GO frame never
   leaves the kit early or late against the picture. The pre-roll and the night bed go under it. Runs once per count. */
function onGo(now){ const E = S.E; if(!E || !S.goKey || S.goDone === S.countT) return; S.goDone = S.countT; now = now != null ? now : E.ac.currentTime;
  if(S.deck && S.deck.alive) killDeck(S.deck, now, .02); const at = now + .03; startSong(S.goKey, at, { energy:1 }); S.deck.lpF = 1700; S.deck.lp.frequency.value = 1700;
  stepDeck(S.deck, now + LOOK, onBar); S.goAt = at; S.goLag = Math.round((at - (S.countT + CD_GO)) * 1000);   // goLag: ms after the audio clock's own count end (the frame clock's drift)
  if(S.countBus){ const cb = S.countBus; cb.gain.setTargetAtTime(0, at, .06); setTimeout(() => { try{ cb.disconnect(); }catch(e){} }, 2000); S.countBus = null; }
  amb(false, now, .5); }
// cinematic moments the music can see without touching the set pieces: kaiju zones and firework shows by distance; cine() calls (wrapped)
function setPieces(A, now){ if(!HAS_WIN || !window.MECH) return; if((S.spT = (S.spT || 0) + 1) % 10) return;   // every half second
  const p = A.pseg(), L = A.land(); if(!L) return;
  if(L.key === 'bay' && MECH.sp_kaiju && MECH.sp_kaiju.probe){ const z = MECH.sp_kaiju.probe().zones; for(const q of z){ const d = q.pk - p; if(d > 0 && d < 240 && !S.stung['k' + q.pk]){ S.stung['k' + q.pk] = 1; cue('kaiju'); } } }
  if((L.key === 'paddies' || L.key === 'coast') && MECH.sp_festival && MECH.sp_festival.anchors){ for(const sh of MECH.sp_festival.anchors().shows){ const d = sh.peak - p; if(d > 0 && d < 130 && !S.stung['h' + sh.peak]){ S.stung['h' + sh.peak] = 1; cue('hanabi'); } } } }
/* the new roads' set pieces (2026-11-21): read each tick from the env modules' own state (never the clock), the song jumps to a set-piece
   section on its next bar line and the sting lands on its next beat. Kurobe: G (a taiko gathering) from the card until the first gate,
   then the kanpo sting and O. Akihabara: when the dark reaches the rider, the teiden sting and X (held); every sign at once, the relight
   sting and Y. Gion: Y (the ohayashi) while the festival is out. A held section is let go when its moment ends (or the rider leaves). */
function spTick(A){ const D = S.deck; if(!D || !D.alive || !D.C.xs || !HAS_WIN || !window.ENV) return; const k = D.key, EN = window.ENV; let want = null, L = null;
  try{ const cs = A.cs();
    if(k === 'akiba'){ const Z = EN.akiba && EN.akiba._spa; if(Z && Z.on){ L = Z.L; want = Z.rel ? 'Y' : Z.fr <= cs ? 'X' : null; } }
    else if(k === 'gion'){ const Z = EN.gion && EN.gion._spa; if(Z && Z.on && Z.lit && Z.wave < 791){ L = Z.L; want = 'Y'; } }
    else if(k === 'kurobe'){ const V = EN.kurobe && EN.kurobe._visit, Q = V && V(Math.floor(cs)); if(Q && Q.sp && Q.card && !Q.fin){ L = Q; want = Q.g1 ? 'O' : 'G'; } }
  }catch(e){ return; }
  const P = S.sp || (S.sp = { want:null, L:null, done:{} }); if(L && L !== P.L){ P.L = L; P.done = {}; }
  if(want === P.want) return; const was = P.want; P.want = want;
  if(want && !P.done[want]){ P.done[want] = 1; D.xq = want; const st = k === 'kurobe' && want === 'O' ? 'kanpo' : k === 'akiba' ? (want === 'X' ? 'teiden' : 'relight') : null; if(st) cue(st); return; }
  if(!want && was && D.xs && D.xs.hold) D.xq = 'main'; }
function wrapDirector(){ const D = HAS_WIN && window.MECH && MECH.director; if(!D || D.__music) return; const orig = D.cine; D.__music = true;
  D.cine = function(o){ const h = orig.apply(this, arguments); try{ const k = o && o.card && o.card.kanji, A = bindGame(), L = A && A.land(), key = L && L.key;
      const name = k === '大波' ? 'wave' : k === '爆発' ? 'inferno' : k === '雪崩' ? 'avalanche' : key === 'coast' ? 'wave' : key === 'refinery' ? 'inferno' : key === 'snow' ? 'avalanche' : null;
      if(name) cue(name); }catch(e){} return h; }; }
function wrapCountdown(){ const A = HAS_WIN && window.MECH && MECH.arrival; if(!A || !A.countdown || A.__music) return; A.__music = true; const orig = A.countdown;
  A.countdown = function(go){ const fresh = !(A.countdownOn && A.countdownOn());
    if(fresh && typeof go === 'function'){ const g0 = go; go = function(){ const r = g0.apply(this, arguments); try{ if(S.E && S.E.ac.state === 'running') onGo(S.E.ac.currentTime); }catch(e){} return r; }; }
    const r = orig.call(this, go);
    if(fresh && r){ try{ if(!S.M && typeof M !== 'undefined') S.M = M; if(S.M && S.M.ac && !S.E) attach(S.M); tick(); }catch(e){} } return r; }; }   // in step with the count's first frame
function cue(name, at){ const E = S.E; if(!E || !ST[name]) return false; const now = E.ac.currentTime; if(S.cues[name] && now - S.cues[name] < 4) return false; S.cues[name] = now;
  const sting = ST[name], key = sting.key || (S.deck ? S.deck.th.key : 'E'), pc = pcOf(key), root = 48 + pc - (pc > 6 ? 12 : 0);
  const bus = HAS_WIN && window.MECH && MECH.director && MECH.director.bus ? MECH.director.bus() : null; E.routeSting(bus || (S.M && S.M.out) || E.ac.destination);
  let t = at || now + .05; if(!at && S.deck && S.deck.alive){ const beat = S.deck.C.s16 * 4, ph = (S.deck.gs % 4) * S.deck.C.s16; t = S.deck.t - ph; while(t < now + .03) t += beat; }   // on the song's next beat
  playSting(E, sting, t, root, E.sting); return true; }
function attach(M){ S.M = M; if(!M || !M.ac || S.E) return; try{ S.E = makeEngine(M.ac, M.out); }catch(e){ console.warn('music', e); S.E = null; return; } wrapSfx(); }
// the SFX agent's engine blips (window.SFX.blip(amount)): a big rev dips the music 1 dB for about a third of a second
function wrapSfx(){ const X = HAS_WIN && window.SFX; if(!X || typeof X.blip !== 'function' || X.__music) return; X.__music = true; const orig = X.blip;
  X.blip = function(amount){ try{ if(S.E && amount >= .5){ const g = S.E.rduck.gain, t = S.E.ac.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(.891, t, .02); g.setTargetAtTime(1, t + .3, .12); } }catch(e){} return orig.apply(this, arguments); }; }
function boost(tier){ if(!S.deck || !S.deck.alive || !S.E) return; const now = S.E.ac.currentTime; S.deck.e = Math.max(S.deck.e, tier >= 2 ? 4 : 3); S.eHold = 2; if(now - S.lastBoost > 1.5){ S.lastBoost = now; S.deck.crash = tier >= 2 ? 'I' : true; } }   // a big boost drops an impact on the next 16th

/* ================================================================== offline render (measurement) */
function render(name, o){ o = o || {}; const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, sr = o.sr || 48000;
  const isSting = !T[name] && ST[name], C = isSting || name === 'ambience' ? null : comp(name), secs = o.seconds || (isSting || name === 'ambience' ? 8 : C.introSec + C.loopSec + 6);
  const ac = new OAC(2, Math.ceil(secs * sr), sr), out = ac.createGain(); out.gain.value = o.outGain != null ? o.outGain : .85; out.connect(ac.destination);
  const E = makeEngine(ac, out); if(o.noGuard){ E.bus.disconnect(); E.bus.connect(E.out); }
  if(name === 'ambience'){ const A = ambBed(E, out); A.g.gain.value = AMB_LV * (o.level != null ? o.level : 1); return ac.startRendering().then(buf => [buf.getChannelData(0), buf.getChannelData(1)]); }
  if(isSting){ const pc = pcOf(ST[name].key || o.key || 'E'); playSting(E, ST[name], .1, 48 + pc - (pc > 6 ? 12 : 0), E.sting); E.routeSting(out); }
  else { const D = makeDeck(E, C, .05, { energy:o.energy != null ? o.energy : 3, solo:o.solo, crash:false, leads:o.leads }); if(o.lp) D.lp.frequency.value = o.lp;
    // schedule the way the live owner does, a little ahead of the clock (suspend/resume), so only sounding notes are in the graph
    // o.switchTo: at bar o.switchBar the owner's border switch happens (fill, old song out on the bar line, the next road's song in)
    let cur = D; const sw = o.switchTo ? (Dk, bar) => { if(Dk === cur && cur.bi === o.switchBar){ killDeck(cur, cur.t, .1); cur = makeDeck(E, comp(o.switchTo), cur.t, { energy:cur.e, crash:true, from:o.from || 'I' }); return false; } if(Dk === cur && cur.bi === o.switchBar - 1) cur.fillReq = true; return true; } : null;
    const SI = { sp:0, mult:1, cs:0, thin:0, play:true }; let eT = cur.e, dk = 1;
    const sb = o.script ? (Dk, bar) => { if(Dk.x.lift > 0) Dk.x.lift--; else if(eT < Dk.e) Dk.e = eT; return sw ? sw(Dk, bar) : true; } : sw;
    const bt = C.s16 * 16, CHUNK = .5, step = t => { if(o.ramp) cur.e = Math.min(4, Math.floor((t - .05) / bt / o.ramp));
      if(o.jumps) for(const [jt, jn] of o.jumps) if(jt >= t && jt < t + CHUNK) cur.xq = jn;
      if(o.cues) for(const [ct, cn] of o.cues) if(ct >= t && ct < t + CHUNK){ const pc = pcOf(cur.th.key); playSting(E, ST[cn], ct, 48 + pc - (pc > 6 ? 12 : 0), E.sting); E.routeSting(out); }
      if(o.script){ const k = o.script(t); eT = k.e; if(eT > cur.e) cur.e = eT; SI.sp = k.sp; SI.mult = k.mult; SI.cs = k.cs; SI.thin = k.thin; steer(cur, SI);
        const d = k.duck != null ? k.duck : 1; if(d !== dk){ out.gain.setTargetAtTime((o.outGain != null ? o.outGain : .85) * d, t, d < dk ? 2.2 : .25); dk = d; } } stepDeck(cur, Math.min(secs, t + CHUNK + LOOK), sb); if(cur.alive) stepDeck(cur, Math.min(secs, t + CHUNK + LOOK), sb); };
    step(0); for(let t = CHUNK; t < secs; t += CHUNK){ const tt = t; ac.suspend(tt).then(() => { step(tt); ac.resume(); }); } }
  return ac.startRendering().then(buf => [buf.getChannelData(0), buf.getChannelData(1)]); }

/* ================================================================== export */
const MUSIC = { THEMES:T, STINGS:ST, INST, MOTIF, compile, render, ROAD_THEME,
  LEADS, LEAD_PARTS, PRES, GRIT, GRIT_BASS, DIRT,
  BORDER_FROM:'A',   // A/B: 'A' = a new road comes in on its tune (level within ~2 dB across the border); 'I' = through its 4-bar intro (an arrival breath, measured 3-4 dB dip)
  owns(){ return !!S.E; }, attach, boost,
  // the audio-clock time the count-in started (audio/sfx.js times the engine's calls from it)
  countAt(){ return S.countT; },
  cue(name){ return cue(name); },
  // the quiet stretch (mech/director.js, research/sundown-craft/quiet.md): k 0..1, eased over two bars; a chase overrides it
  thin(k){ S.thinK = Math.max(0, Math.min(1, +k || 0)); },
  road(i){ /* optional: the game may call this at a road border; the owner also polls the road itself */ if(typeof LANDS !== 'undefined' && LANDS[i] && S.deck && S.mode === 'ride'){ const k = themeForLand(LANDS[i]); if(k !== S.deck.key){ S.want = k; S.deck.fillReq = S.deck.st <= 12; } } },
  end(caught){ S.caught = !!caught; },
  clock(){ const D = S.deck; if(!D) return null; const bar = curBar(D); return { key:D.key, bpm:D.th.bpm, bar:D.bi, step:D.st, beat:D.gs / 4, chord:bar ? (D.st < 8 ? bar.ch[0] : bar.ch[1]).name : null, energy:D.e, xs:D.xs ? D.xs.name : null }; },
  get debug(){ return { amb:S.E && S.E.amb ? S.E.amb.v : 0, goAt:S.goAt, goLag:S.goLag, mode:S.mode, song:S.deck && S.deck.key, energy:S.deck && S.deck.e, build:S.deck && S.deck.x ? Object.assign({}, S.deck.x) : null, thinK:S.thinK, want:S.want, decks:S.E ? S.E.decks.length : 0, avgTickMs:S.ticks ? S.tickMs / S.ticks : 0, ticks:S.ticks, cues:Object.assign({}, S.cues), countT:S.countT }; } };
if(HAS_WIN){ window.MUSIC = MUSIC; if(window.MECH) MECH.music = MUSIC; try{ wrapDirector(); wrapCountdown(); }catch(e){ console.warn('music wrap', e); }
  S.iv = setInterval(() => { try{ if(!S.M && typeof M !== 'undefined') S.M = M; tick(); }catch(e){ if(!S.err){ S.err = e; console.warn('music tick', e); } } }, TICK_MS);
  /* the title's night bed needs a running AudioContext, which needs a gesture: the first press on the loader or the attract screen opens it.
     Listens until M.ac exists (it used to be once:true, so a tap during the long loader, before #attract, spent it and the title stayed
     silent until START). A touch opens it on touchend / pointerup / click, not pointerdown: those carry the user activation (iOS Safari
     needs it there); after that M.init's own wake resumes a context the browser stopped. */
  const WK = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'], wkOff = () => WK.forEach(t => removeEventListener(t, wake, true));
  function wake(e){ try{ if(typeof M === 'undefined') return; if(M.ac){ wkOff(); return; } if(e.type === 'pointerdown' && e.pointerType !== 'mouse') return;
    const L = document.getElementById('loader'); if(document.getElementById('attract') || (L && !L.hidden)){ M.init(); if(M.ac) wkOff(); } }catch(x){} }
  WK.forEach(t => addEventListener(t, wake, { capture:true, passive:true })); }
if(typeof module !== 'undefined') module.exports = MUSIC;
})();
