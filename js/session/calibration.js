/**
 * First-run pitch calibration — the WOW moment.
 *
 * After the singer picks a part we drop them straight into the full-screen hum-along (the same
 * surface the hymn room uses), mic live, humming our own simple setting of "Mary Had a Little
 * Lamb" (public domain) with a coloured pitch line tracking their voice. They find a comfortable
 * pitch by ear ("too high / too low" nudges everything a half step). Verse 1 is the tune alone;
 * verse 2 adds the other voices and invites them to hum THEIR part.
 *
 * Reuses the shared performance surface (performanceView.js) and the warmup-style movable-Do
 * melody builder (notes are just appState.tuning.doMidi + offset).
 */

import { getElementById } from '../utils/dom.js';
import { ensureAudioContext, getAudioContext } from '../audio/context.js';
import { appState } from '../state/appState.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { stanzaSequencePlayer } from '../player/sequencePlayer.js';
import { scheduleNotes, waitWithValidation } from '../player/noteScheduler.js';
import { isValidSequence } from '../player/sequenceManager.js';
import { isUsingSoundfont, playInstrumentNote, stopInstrumentNote } from '../audio/instruments.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from '../audio/oscillator.js';
import { configurePerformance, enterPerformance, exitPerformance, startScroll, stopScroll, withLeadIn } from '../rendering/performanceView.js';
import { startMicrophone } from '../audio/microphone.js';
import { soundDoReference } from '../audio/doPitch.js';
import { spellMidiInKey } from '../utils/keySignature.js';
import { VOICE_PROFILES } from './profile.js';

// "Mary Had a Little Lamb" — our own simple movable-Do setting (the tune is public domain).
// Each note is { o: semitone offset from Do, b: beats, w: lyric syllable }; 'r' is a breath.
// Range Do–Sol — tight and easy to hum. The Re (2) notes pull toward V, the rest sit on I,
// so the auto-harmony in verse 2 comes out as a clean I / V setting.
const MARY = [
  // Mary had a little lamb
  { o: 4, b: 1, w: 'Ma' }, { o: 2, b: 1, w: 'ry' }, { o: 0, b: 1, w: 'had' }, { o: 2, b: 1, w: 'a' }, { o: 4, b: 1, w: 'lit' }, { o: 4, b: 1, w: 'tle' }, { o: 4, b: 2, w: 'lamb' }, 'r',
  // little lamb, little lamb
  { o: 2, b: 1, w: 'lit' }, { o: 2, b: 1, w: 'tle' }, { o: 2, b: 2, w: 'lamb' }, { o: 4, b: 1, w: 'lit' }, { o: 7, b: 1, w: 'tle' }, { o: 7, b: 2, w: 'lamb' }, 'r',
  // Mary had a little lamb (no breath here — flows straight into the last line as a pickup)
  { o: 4, b: 1, w: 'Ma' }, { o: 2, b: 1, w: 'ry' }, { o: 0, b: 1, w: 'had' }, { o: 2, b: 1, w: 'a' }, { o: 4, b: 1, w: 'lit' }, { o: 4, b: 1, w: 'tle' }, { o: 4, b: 2, w: 'lamb' },
  // (pickup) its fleece was white as snow — Do "its" leads to the downbeat, resolving Re→Do on "snow"
  { o: 0, b: 1, w: 'its' }, { o: 2, b: 1, w: 'fleece' }, { o: 2, b: 1, w: 'was' }, { o: 4, b: 1, w: 'white' }, { o: 2, b: 1, w: 'as' }, { o: 0, b: 2, w: 'snow' },
];
const CAL_TEMPO = 100;  // gentle hum-along pace

const clampDo = (m) => Math.max(36, Math.min(84, m));
const PART_LABEL = { S: 'Soprano', A: 'Alto', T: 'Tenor', B: 'Bass' };
// The comfortable range for a part (mirrors PART_RANGES via the voice profiles).
function rangeForPart(part) {
  const v = Object.values(VOICE_PROFILES).find(p => p.part === part);
  return v ? v.range : [55, 74];
}

let calPart = 'S';
let calClef = 'treble';
let calPlaying = false;
let calPass = 1;            // pass 1 = melody solo; pass 2 = full SATB, their part amplified
let calExercise = null;     // the currently-engraved exercise (surface set up before audio plays)
let currentCalNote = null;
let micOk = false;
let onDoneCb = null;
let onCancelCb = null;
let activeOsc = [];

/* --------------------------------------------------------------- entry ----- */

export async function startCalibration({ part, doMidi, onDone, onCancel }) {
  calPart = part || 'S';
  calClef = clefForPart(calPart);
  onDoneCb = onDone;
  onCancelCb = onCancel;
  appState.tuning.doMidi = clampDo(doMidi ?? 57);
  appState.satb.aimPart = 'S';    // the singer sings the melody (top line) throughout calibration
  calPlaying = true;              // stays true for the whole calibration; per-pass cancel is by sequence id
  calPass = 1;
  document.body.classList.add('cal-active');   // hides the red perf Stop (our controls own the exit)

  await ensureAudioContext();
  micOk = await enableMic();

  // Bring up the full-screen staff with the mic line LIVE (before any tune plays) so we can prove
  // the pitch line works — the mic-check gate asks them to hum and confirm they see it move.
  enterSurface();
  showMicCheck();
}

function clefForPart(part) {
  const v = Object.values(VOICE_PROFILES).find(p => p.part === part);
  return v ? v.clef : 'treble';
}

// Best-effort mic enable; if denied we still show the melody and tune by ear.
async function enableMic() {
  try {
    await startMicrophone();
    window.__micOn = true;
    const btn = getElementById('btnMicToggle');
    if (btn) { btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); }
    return true;
  } catch (e) {
    window.__micOn = false;
    return false;
  }
}

/* ------------------------------------------------------------- playback ---- */

// A body-level perf surface, always renderable (a surface nested in a hidden tab panel would
// be display:none during onboarding). Created once and reused.
function ensureCalContainer() {
  let el = getElementById('calibrationVisual');
  if (!el) {
    el = document.createElement('div');
    el.id = 'calibrationVisual';
    el.className = 'perf-surface';
    el.hidden = true;
    document.body.appendChild(el);
  }
  return el;
}

// Point the shared surface at the calibration container. Pass 2 shows the grand staff (SATB);
// pass 1 is a single melody line. The mic line always fits the melody (Soprano) and is coloured
// green/yellow/red against the note currently sounding.
function configureCalPerformance() {
  const harmony = calPass === 2;
  const aim = harmony ? calPart : 'S';   // verse 1: sing the tune; verse 2: sing YOUR part
  configurePerformance({
    container: ensureCalContainer(),
    getTime: () => (appState.staff.currentTime || 0) * ((appState.staff.tempo || 60) / 60),
    getTargetMidi: () => currentCalNote,
    fitPart: () => aim,
    isPlaying: () => calPlaying,
    onExit: () => finishCalibration(),
    variant: () => `${appState.tuning.doMidi}|${calPass}|${calClef}`,
    renderOptions: harmony ? {} : { staffMode: 'single', clef: calClef }
  });
}

// Engrave the current pass full-screen and start the scroll loop — this makes the mic line go
// LIVE even before any audio plays (so the mic-check can prove it works). No sequence yet.
function enterSurface() {
  const harmony = calPass === 2;
  // Verse 2: build the SATB setting, then octave-shift it so the singer's part sits comfortably.
  const base = buildCalExercise(harmony);
  calExercise = withLeadIn(harmony ? transposeToPartRange(base, calPart) : base, 1);
  appState.staff.tempo = CAL_TEMPO;
  appState.staff.currentTime = 0;
  appState.staff.keyTonic = calExercise.midiKeyMidi;
  appState.staff.keyMode = 'major';

  configureCalPerformance();
  ensureCalContainer().hidden = false;
  enterPerformance(calExercise);                  // full-screen (adds body.perf-performing)
  stopScroll();                                   // avoid stacking loops on replay
  startScroll();                                  // mic line updates each frame, tune static at start
  updateControlsHint();
}

// Play the audio for the current pass over the already-engraved surface.
async function runSequence() {
  stanzaSequencePlayer.stopSequence();
  const harmony = calPass === 2;
  const aim = harmony ? calPart : 'S';
  const notes = harmony
    ? ['S', 'A', 'T', 'B'].flatMap(p => calExercise.parts[p]).sort((a, b) => a.startTime - b.startTime)
    : calExercise.parts.S;
  const stanza = { label: calExercise.label, duration: calExercise.duration, notes };
  const thisPass = calPass;
  await stanzaSequencePlayer.startSequence([stanza], {
    tempo: appState.staff.tempo,
    baseGain: appState.drone.gain,
    audioSetup: makeAudioSetup(aim, harmony),
    // After the tune (verse 1), invite them to break into their own part (verse 2) via a modal.
    onComplete: () => { if (calPlaying && thisPass === 1) showTransition(); }
  });
}

// First run after the mic-check: reveal the controls, sound the tonic, then play verse 1.
async function beginFirstPass() {
  showControls();
  await soundDoReference(appState.tuning.doMidi);
  if (!calPlaying) return;
  await runSequence();
}

// Replay / retune / verse 2: re-engrave and (verse 1 only) re-sound the tonic, then play.
async function playPass() {
  await ensureAudioContext();
  enterSurface();
  if (calPass === 1) { await soundDoReference(appState.tuning.doMidi); if (!calPlaying) return; }
  await runSequence();
}

// Restart the hum-along from verse 1 (after a pitch change or Replay).
function playFromTop() { calPass = 1; playPass(); }
function startVerse2() { calPass = 2; playPass(); }

// Octave-shift the whole SATB setting so the singer's part is centred in its comfortable range.
function transposeToPartRange(exercise, part) {
  const notes = exercise.parts[part] || [];
  if (!notes.length) return exercise;
  const mids = notes.map(n => n.midi).sort((a, b) => a - b);
  const median = mids[Math.floor(mids.length / 2)];
  const [lo, hi] = rangeForPart(part);
  const center = (lo + hi) / 2;
  let shift = 0;
  while (median + shift < center - 6) shift += 12;
  while (median + shift > center + 6) shift -= 12;
  if (!shift) return exercise;
  const bump = arr => arr.map(n => ({ ...n, midi: n.midi + shift }));
  return { ...exercise, parts: { S: bump(exercise.parts.S), A: bump(exercise.parts.A), T: bump(exercise.parts.T), B: bump(exercise.parts.B) } };
}

// Build the exercise. Pass 1: melody only (part S). Pass 2: add a consonant SATB harmony
// (each melody note gets a I/IV/V triad voiced below it). Lyrics ride the melody.
function buildCalExercise(harmony) {
  const doMidi = appState.tuning.doMidi;
  const tonicPc = ((doMidi % 12) + 12) % 12;
  const S = [], A = [], T = [], B = [], lyricsByNote = [];
  let t = 0;
  for (const e of MARY) {
    if (e === 'r') { t += 1; continue; }
    const midi = doMidi + e.o;
    S.push({ midi, startTime: t, duration: e.b, part: 'S' });
    lyricsByNote.push(e.w);
    if (harmony) {
      const v = chordTonesBelow(chordRootFor(e.o), midi, doMidi);
      A.push({ midi: v.a, startTime: t, duration: e.b, part: 'A' });
      T.push({ midi: v.t, startTime: t, duration: e.b, part: 'T' });
      B.push({ midi: v.b, startTime: t, duration: e.b, part: 'B' });
    }
    t += e.b;
  }
  return {
    id: harmony ? 'cal-v2' : 'cal-v1', label: 'Mary Had a Little Lamb', duration: t,
    midiKeyMidi: tonicPc, midiKeyMode: 'major', timeSigNum: 4, timeSigDen: 4,
    parts: { S, A, T, B }, lyricsByNote
  };
}

// Choose the chord (root offset from Do) that contains this melody tone — prefer I, then V, then
// IV — so the harmony is always consonant with the note above it.
function chordRootFor(off) {
  const pc = ((off % 12) + 12) % 12;
  if ([0, 4, 7].includes(pc)) return 0;   // I  (Do Mi Sol)
  if ([7, 11, 2].includes(pc)) return 7;  // V  (Sol Ti Re)
  if ([5, 9, 0].includes(pc)) return 5;   // IV (Fa La Do)
  return 0;
}

// The three chord tones (major triad on `rootOff`) stacked DOWNWARD from just under the melody —
// gives a clean, non-crossing A/T/B under the Soprano.
function chordTonesBelow(rootOff, ceilMidi, doMidi) {
  const pcs = [rootOff, rootOff + 4, rootOff + 7].map(o => (((doMidi + o) % 12) + 12) % 12);
  const below = (ceil) => {
    for (let m = ceil - 1; m > ceil - 14; m--) if (pcs.includes(((m % 12) + 12) % 12)) return m;
    return ceil - 12;
  };
  const a = below(ceilMidi), t = below(a), b = below(t);
  return { a, t, b };
}

// Schedule a pass. Melody (Soprano) drives the colour line and is AMPLIFIED in verse 2; the
// harmony voices sing softer underneath.
function makeAudioSetup(aim, harmony) {
  return async (scaledStanza, sequenceId) => {
    scheduleNotes(scaledStanza.notes, sequenceId, async (note, seqId) => {
      if (!isValidSequence(seqId) || !calPlaying) return;
      const base = appState.drone.gain || 0.25;
      const isAim = note.part === aim;             // the part the singer is singing this verse
      if (isAim) currentCalNote = note.midi;       // colour line follows the singer's part
      const gain = isAim ? Math.min(0.6, base * (harmony ? 1.4 : 1)) : base * 0.4;

      if (isUsingSoundfont()) {
        try {
          const n = playInstrumentNote(note.midi, note.duration, gain);
          if (n) {
            activeOsc.push(n);
            await waitWithValidation(note.duration * 1000, seqId, () => calPlaying);
            const i = activeOsc.indexOf(n); if (i > -1) activeOsc.splice(i, 1);
            return;
          }
        } catch (e) { /* sample not loaded — fall back to the oscillator below */ }
      }
      const osc = makeOsc(midiToFrequency(note.midi, appState.tuning.a4), gain);
      if (osc) {
        activeOsc.push(osc);
        const ok = await waitWithValidation(note.duration * 1000, seqId, () => calPlaying);
        if (ok && isValidSequence(seqId)) {
          stopOsc(osc);
          const i = activeOsc.indexOf(osc); if (i > -1) activeOsc.splice(i, 1);
        }
      }
    });
  };
}

/* -------------------------------------------------------------- controls --- */

function showControls() {
  let el = getElementById('calControls');
  if (!el) {
    el = document.createElement('div');
    el.id = 'calControls';
    el.className = 'cal-controls';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div class="cal-title">Hum along — does this feel comfortable?</div>
    <div class="cal-sub" id="calPassHint">Just hum the tune.</div>
    <div class="cal-row">
      <button class="cal-btn" data-cal="low">Too low ↓</button>
      <button class="cal-btn" data-cal="replay">↺ Replay</button>
      <button class="cal-btn" data-cal="high">Too high ↑</button>
    </div>
    <button class="cal-btn cal-go" data-cal="ok">This feels comfortable ✓</button>
    ${micOk ? '' : '<div class="cal-mic-off">Turn on your mic to see your pitch as you hum.</div>'}`;
  el.hidden = false;
  el.querySelectorAll('[data-cal]').forEach(b => { b.onclick = () => onCal(b.dataset.cal); });
}

function updateControlsHint() {
  const el = getElementById('calPassHint');
  if (!el) return;
  el.textContent = calPass === 2
    ? `Hum the bright ${PART_LABEL[calPart] || 'your'} line`
    : 'Just hum the tune.';
}

// Mic-check gate: before anything plays, prove the pitch line works — they hum, see it move,
// then start. Handles the mic-denied case with a retry / continue path.
function showMicCheck() {
  let el = getElementById('calMicCheck');
  if (!el) { el = document.createElement('div'); el.id = 'calMicCheck'; el.className = 'cal-modal'; document.body.appendChild(el); }
  el.innerHTML = micOk ? `
    <div class="cal-modal-card">
      <h3>Let's hear you</h3>
      <p>Hum any note out loud. You should see a <b>coloured line</b> appear on the staff and move
         up and down with your voice. Once you see it, you're ready.</p>
      <div class="cal-modal-btns">
        <button class="cal-btn cal-go" data-mc="go">I can see my line →</button>
      </div>
    </div>` : `
    <div class="cal-modal-card">
      <h3>Turn on your microphone</h3>
      <p>We couldn't hear your mic. Allow microphone access so you can see your pitch as you hum —
         or continue and tune by ear.</p>
      <div class="cal-modal-btns">
        <button class="cal-btn cal-go" data-mc="retry">Try the mic again</button>
        <button class="cal-btn" data-mc="skip">Continue without it</button>
      </div>
    </div>`;
  el.hidden = false;
  el.querySelector('[data-mc="go"]')?.addEventListener('click', () => { el.hidden = true; beginFirstPass(); });
  el.querySelector('[data-mc="skip"]')?.addEventListener('click', () => { el.hidden = true; beginFirstPass(); });
  el.querySelector('[data-mc="retry"]')?.addEventListener('click', async () => { micOk = await enableMic(); showMicCheck(); });
}

// The verse-1 → verse-2 hand-off. Explains, in plain language, that the other voices join and
// that we moved their part into a comfortable range.
function showTransition() {
  let el = getElementById('calTransition');
  if (!el) { el = document.createElement('div'); el.id = 'calTransition'; el.className = 'cal-modal'; document.body.appendChild(el); }
  const part = PART_LABEL[calPart] || 'your part';
  el.innerHTML = `
    <div class="cal-modal-card">
      <h3>Lovely — now hum with the group</h3>
      <p>That was the tune. This time the other voices come in around you. Follow the
         <b>bright ${part}</b> line and hum along — we've moved it to sit nicely for your voice, so
         it may sound a little higher or lower than before. The greener your line, the more in tune you are.</p>
      <div class="cal-modal-btns">
        <button class="cal-btn cal-go" data-t="go">Hum the ${part} line →</button>
        <button class="cal-btn" data-t="done">I'm all set</button>
      </div>
    </div>`;
  el.hidden = false;
  el.querySelector('[data-t="go"]').onclick = () => { el.hidden = true; startVerse2(); };
  el.querySelector('[data-t="done"]').onclick = () => { el.hidden = true; finishCalibration(); };
}

function onCal(action) {
  if (action === 'ok') { finishCalibration(); return; }
  if (action === 'replay') { playFromTop(); return; }
  // "Too high" → nudge everything a half step lower; "Too low" → higher. Restart from verse 1.
  const delta = action === 'high' ? -1 : 1;
  appState.tuning.doMidi = clampDo(appState.tuning.doMidi + delta);
  playFromTop();
}

function hideControls() {
  ['calControls', 'calTransition', 'calMicCheck'].forEach(id => { const el = getElementById(id); if (el) el.hidden = true; });
}

function finishCalibration() {
  calPlaying = false;
  stanzaSequencePlayer.stopSequence();
  stopAllOsc();
  exitPerformance();
  const el = getElementById('calibrationVisual');
  if (el) el.hidden = true;
  hideControls();
  document.body.classList.remove('cal-active');
  const finalDo = appState.tuning.doMidi;
  if (typeof onDoneCb === 'function') onDoneCb(finalDo);
}

/* ------------------------------------------------------------ oscillators -- */

function makeOsc(freq, gain) {
  const ctx = getAudioContext();
  if (!ctx) return null;
  const osc = createOscillator(freq, 'sine', gain);
  if (osc) { connectOscillatorToDestination(osc, ctx.destination); startOscillator(osc); }
  return osc;
}

function stopOsc(osc) {
  if (osc && osc.stop) stopInstrumentNote(osc);
  else stopOscillator(osc);
}

function stopAllOsc() {
  activeOsc.forEach(stopOsc);
  activeOsc = [];
}
