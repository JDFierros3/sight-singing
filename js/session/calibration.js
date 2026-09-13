/**
 * First-run pitch calibration — the WOW moment.
 *
 * After the singer picks a part we drop them straight into the full-screen sing-along (the
 * same surface the hymn room uses), mic live, singing "You Are My Sunshine" with a colored
 * pitch line tracking their voice. They set their movable-Do by ear: "too high / too low"
 * shifts Do a half step and replays. "This is my key ✓" saves that Do.
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
import { configurePerformance, enterPerformance, exitPerformance, startScroll, withLeadIn } from '../rendering/performanceView.js';
import { startMicrophone } from '../audio/microphone.js';
import { soundDoReference } from '../audio/doPitch.js';
import { spellMidiInKey } from '../utils/keySignature.js';
import { VOICE_PROFILES } from './profile.js';

// "You Are My Sunshine" — the full A-section verse (sheet measures 1–15), movable Do.
// Each note is { o: semitone offset from Do, b: beats, w: lyric syllable }; 'r' is a breath.
// NOTE: melody transcribed by eye from the user's sheet — verify by ear and tweak offsets.
const SUNSHINE = [
  // You are my sun-shine, my on-ly sun-shine
  { o: 0, b: 1, w: 'You' }, { o: 0, b: 1, w: 'are' }, { o: 0, b: 1, w: 'my' }, { o: 4, b: 1, w: 'sun' }, { o: 4, b: 2, w: 'shine' }, 'r',
  { o: 4, b: 1, w: 'my' }, { o: 2, b: 1, w: 'on' }, { o: 0, b: 1, w: 'ly' }, { o: 2, b: 1, w: 'sun' }, { o: 4, b: 2, w: 'shine' }, 'r',
  // You make me hap-py when skies are gray
  { o: 0, b: 1, w: 'You' }, { o: 4, b: 1, w: 'make' }, { o: 7, b: 1, w: 'me' }, { o: 7, b: 1, w: 'hap' }, { o: 9, b: 2, w: 'py' }, 'r',
  { o: 7, b: 1, w: 'when' }, { o: 4, b: 1, w: 'skies' }, { o: 2, b: 1, w: 'are' }, { o: 0, b: 2, w: 'gray' }, 'r',
  // You'll ne-ver know, dear, how much I love you
  { o: 0, b: 1, w: "You'll" }, { o: 4, b: 1, w: 'ne' }, { o: 7, b: 1, w: 'ver' }, { o: 7, b: 2, w: 'know' }, { o: 4, b: 2, w: 'dear' }, 'r',
  { o: 0, b: 1, w: 'how' }, { o: 2, b: 1, w: 'much' }, { o: 4, b: 1, w: 'I' }, { o: 2, b: 1, w: 'love' }, { o: 0, b: 2, w: 'you' }, 'r',
  // Please don't take my sun-shine a-way
  { o: 0, b: 1, w: 'Please' }, { o: 4, b: 1, w: "don't" }, { o: 7, b: 1, w: 'take' }, { o: 7, b: 1, w: 'my' }, { o: 4, b: 1, w: 'sun' }, { o: 2, b: 1, w: 'shine' }, { o: 2, b: 1, w: 'a' }, { o: 0, b: 2, w: 'way' },
];
const CAL_TEMPO = 108;  // gentle sing-along pace

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const clampDo = (m) => Math.max(36, Math.min(84, m));

let calPart = 'S';
let calClef = 'treble';
let calPlaying = false;
let calPass = 1;            // pass 1 = melody solo; pass 2 = full SATB, their part amplified
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

  showControls();
  await playPass();
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
  configurePerformance({
    container: ensureCalContainer(),
    getTime: () => (appState.staff.currentTime || 0) * ((appState.staff.tempo || 60) / 60),
    getTargetMidi: () => currentCalNote,
    fitPart: () => 'S',
    isPlaying: () => calPlaying,
    onExit: () => finishCalibration(),
    variant: () => `${appState.tuning.doMidi}|${calPass}|${calClef}`,
    renderOptions: harmony ? {} : { staffMode: 'single', clef: calClef }
  });
}

async function playPass() {
  stanzaSequencePlayer.stopSequence();            // cancel any in-flight pass
  await ensureAudioContext();
  const harmony = calPass === 2;
  const exercise = withLeadIn(buildCalExercise(harmony), 1);
  appState.staff.tempo = CAL_TEMPO;
  appState.staff.keyTonic = exercise.midiKeyMidi;
  appState.staff.keyMode = 'major';

  configureCalPerformance();
  ensureCalContainer().hidden = false;
  enterPerformance(exercise);                     // full-screen (adds body.perf-performing)

  // Sound the singer's Do at the very start of pass 1; pass 2 flows straight on.
  if (calPass === 1) { await soundDoReference(appState.tuning.doMidi); if (!calPlaying) return; }

  startScroll();
  updateControlsHint();

  const notes = harmony
    ? ['S', 'A', 'T', 'B'].flatMap(p => exercise.parts[p]).sort((a, b) => a.startTime - b.startTime)
    : exercise.parts.S;
  const stanza = { label: exercise.label, duration: exercise.duration, notes };
  const thisPass = calPass;
  await stanzaSequencePlayer.startSequence([stanza], {
    tempo: appState.staff.tempo,
    baseGain: appState.drone.gain,
    audioSetup: makeAudioSetup(harmony),
    // Verse 1 → automatically flow into the harmonized verse 2 (unless they quit / retune).
    onComplete: () => { if (calPlaying && thisPass === 1) { calPass = 2; playPass(); } }
  });
}

// Restart the sing-along from verse 1 (after a Do change or Replay).
function playFromTop() { calPass = 1; playPass(); }

// Build the exercise. Pass 1: melody only (part S). Pass 2: add a consonant SATB harmony
// (each melody note gets a I/IV/V triad voiced below it). Lyrics ride the melody.
function buildCalExercise(harmony) {
  const doMidi = appState.tuning.doMidi;
  const tonicPc = ((doMidi % 12) + 12) % 12;
  const S = [], A = [], T = [], B = [], lyricsByNote = [];
  let t = 0;
  for (const e of SUNSHINE) {
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
    id: harmony ? 'cal-v2' : 'cal-v1', label: 'You Are My Sunshine', duration: t,
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
function makeAudioSetup(harmony) {
  return async (scaledStanza, sequenceId) => {
    scheduleNotes(scaledStanza.notes, sequenceId, async (note, seqId) => {
      if (!isValidSequence(seqId) || !calPlaying) return;
      const base = appState.drone.gain || 0.25;
      const isMelody = note.part === 'S';
      if (isMelody) currentCalNote = note.midi;    // colour line follows the tune
      const gain = isMelody ? Math.min(0.6, base * (harmony ? 1.35 : 1)) : base * 0.4;

      if (isUsingSoundfont()) {
        const n = playInstrumentNote(note.midi, note.duration, gain);
        if (n) {
          activeOsc.push(n);
          await waitWithValidation(note.duration * 1000, seqId, () => calPlaying);
          const i = activeOsc.indexOf(n); if (i > -1) activeOsc.splice(i, 1);
          return;
        }
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
    <div class="cal-title">Sing along — is this comfortable?</div>
    <div class="cal-sub">Do = <b id="calDoName">${noteName(appState.tuning.doMidi)}</b> · <span id="calPassHint">Verse 1 — just your part</span></div>
    <div class="cal-row">
      <button class="cal-btn" data-cal="low">Too low ↓</button>
      <button class="cal-btn" data-cal="replay">↺ Replay</button>
      <button class="cal-btn" data-cal="high">Too high ↑</button>
    </div>
    <button class="cal-btn cal-go" data-cal="ok">This is my key ✓</button>
    ${micOk ? '' : '<div class="cal-mic-off">Mic is off — you can still tune by ear.</div>'}`;
  el.hidden = false;
  el.querySelectorAll('[data-cal]').forEach(b => { b.onclick = () => onCal(b.dataset.cal); });
}

function updateControlsHint() {
  const el = getElementById('calPassHint');
  if (el) el.textContent = calPass === 2 ? 'Verse 2 — full harmony, your part loudest' : 'Verse 1 — just your part';
}

function onCal(action) {
  if (action === 'ok') { finishCalibration(); return; }
  if (action === 'replay') { playFromTop(); return; }
  // "Too high" → the song sits too high → lower Do; "Too low" → raise Do. Restart from verse 1.
  const delta = action === 'high' ? -1 : 1;
  appState.tuning.doMidi = clampDo(appState.tuning.doMidi + delta);
  const nameEl = getElementById('calDoName');
  if (nameEl) nameEl.textContent = noteName(appState.tuning.doMidi);
  playFromTop();
}

function hideControls() {
  const el = getElementById('calControls');
  if (el) el.hidden = true;
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
