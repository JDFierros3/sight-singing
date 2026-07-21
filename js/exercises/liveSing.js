/**
 * Live Sing — congregational sing-along.
 *
 * Reuses the SATB playback pipeline, but plays a single chosen voice softly in
 * ONE ear, anchored to a hummed "Set Do" pitch, and auto-starts when the phone
 * hears the singer begin. No networking: each phone follows the same hymn, so
 * everyone's playhead converges on its own.
 */

import { getElementById, setTextContent, createElement } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { ensureAudioContext } from '../audio/context.js';
import { startMicrophone } from '../audio/microphone.js';
import { pitchState } from '../pitch/detection.js';
import { frequencyToMidi } from '../utils/audioMath.js';
import { NOTE_NAMES } from '../config/constants.js';
import { getAccidentalForNote } from '../utils/keySignature.js';
import { stanzaSequencePlayer } from '../player/sequencePlayer.js';
import { scheduleNotes, waitWithValidation } from '../player/noteScheduler.js';
import { isValidSequence } from '../player/sequenceManager.js';
import { playNote } from '../player/audioPlayer.js';
import { setPartPan } from '../audio/instruments.js';
import { renderStaff } from '../rendering/staff.js';
import { openHymnBrowser } from '../ui/components/hymnBrowser.js';

const PARTS = [
  { id: 'S', label: 'Soprano' },
  { id: 'A', label: 'Alto' },
  { id: 'T', label: 'Tenor' },
  { id: 'B', label: 'Bass' }
];

// Full left / right for the reference tone.
const EAR_PAN = { L: -0.85, R: 0.85 };

// Onset auto-start: sustained singing must be held this long before playback fires.
const ONSET_HOLD_MS = 350;

let progressRafId = null;
let progressStartMs = 0;
let progressDurationMs = 0;
let onsetHoldStart = 0;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ------------------------------------------------------------------ setup -- */

export function initializeLiveSing() {
  buildLiveSingPartButtons();
  // Highlight the Live Sing part on the shared staff (renderer reads satb.aimPart).
  appState.satb.aimPart = appState.livesing.part;
  syncLiveSingControls();
}

function buildLiveSingPartButtons() {
  const container = getElementById('liveSingPartSelection');
  if (!container) return;
  container.innerHTML = '';
  PARTS.forEach(part => {
    const button = createElement('button', {
      id: `liveSingPart-${part.id}`,
      class: 'part-btn',
      'aria-label': `Sing ${part.label}`,
      'data-part': part.id
    });
    setTextContent(button, part.id);
    if (appState.livesing.part === part.id) {
      button.classList.add('active');
    }
    container.appendChild(button);
  });
}

function syncLiveSingControls() {
  const vol = getElementById('liveSingVolume');
  const volVal = getElementById('liveSingVolumeValue');
  const tempo = getElementById('liveSingTempo');
  const tempoVal = getElementById('liveSingTempoValue');
  const pct = Math.round(appState.livesing.softness * 100);
  if (vol) vol.value = String(pct);
  if (volVal) setTextContent(volVal, String(pct));
  if (tempo) tempo.value = String(appState.livesing.tempo);
  if (tempoVal) setTextContent(tempoVal, String(appState.livesing.tempo));
  updateEarButtons();
  updateHymnLabel();
}

/* --------------------------------------------------------------- controls -- */

export function setLiveSingPart(part) {
  if (!part) return;
  appState.livesing.part = part;
  appState.satb.aimPart = part; // keep the staff highlight in sync
  updateLiveSingPartButtons(part);
  displayLiveSingHymn();
}

export function setLiveSingEar(ear) {
  appState.livesing.ear = ear === 'R' ? 'R' : 'L';
  updateEarButtons();
  // Applies to subsequently-scheduled notes automatically; nudge the current one too.
  if (appState.livesing.isPlaying) {
    setPartPan(appState.livesing.part, EAR_PAN[appState.livesing.ear] || 0);
  }
}

export function setLiveSingSoftness(percent) {
  const p = Number(percent) || 0;
  appState.livesing.softness = clamp01(p / 100);
  setTextContent(getElementById('liveSingVolumeValue'), String(Math.round(p)));
}

export function setLiveSingTempo(bpm) {
  appState.livesing.tempo = Number(bpm) || 60;
  setTextContent(getElementById('liveSingTempoValue'), String(Math.round(appState.livesing.tempo)));
}

export function browseLiveSingHymns() {
  openHymnBrowser();
}

/* ------------------------------------------------------------ "Set Do" ---- */

export async function setLiveSingDo() {
  await ensureAudioContext();
  await startMicrophone();
  updateStatus('Listening… hum the pitch');
  const hz = await captureStablePitch(2600);
  if (!hz) {
    updateStatus('Didn’t catch it — try Set Do again');
    return;
  }
  appState.livesing.doHz = hz;
  const midi = Math.round(frequencyToMidi(hz, appState.tuning.a4));
  setTextContent(getElementById('liveSingDoReadout'), `Do: ${noteName(midi)}`);
  recomputeDoSemis();
  displayLiveSingHymn();
  updateStatus('Do set — Arm & Listen when ready');
}

// Resolve once the mic has held a steady pitch, or on timeout (returns 0 if none).
function captureStablePitch(timeoutMs) {
  return new Promise(resolve => {
    const start = performance.now();
    let steadyHz = 0;
    let steadySince = 0;
    const tick = () => {
      const hz = pitchState.stableHz;
      const now = performance.now();
      if (hz > 0) {
        if (steadyHz && Math.abs(1200 * Math.log2(hz / steadyHz)) < 45) {
          if (now - steadySince >= 450) { resolve(hz); return; }
        } else {
          steadyHz = hz;
          steadySince = now;
        }
      }
      if (now - start >= timeoutMs) { resolve(steadyHz || 0); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

// Semitone shift mapping the hymn tonic onto the hummed Do (nearest octave: -5..+6).
function recomputeDoSemis() {
  const ex = appState.satb.currentExercise;
  if (!ex || !Number.isFinite(ex.midiKeyMidi) || appState.livesing.doHz == null) {
    appState.livesing.doSemis = 0;
    return;
  }
  const capturedPc = pitchClass(Math.round(frequencyToMidi(appState.livesing.doHz, appState.tuning.a4)));
  const tonicPc = pitchClass(ex.midiKeyMidi);
  let shift = ((capturedPc - tonicPc) % 12 + 12) % 12;
  if (shift > 6) shift -= 12;
  appState.livesing.doSemis = shift;
}

/* ---------------------------------------------------- onset auto-start ---- */

export async function armLiveSing() {
  if (!appState.satb.currentExercise) { updateStatus('Pick a hymn first'); return; }
  await ensureAudioContext();
  await startMicrophone();
  appState.livesing.armed = true;
  onsetHoldStart = 0;
  updateArmButton(true);
  updateStatus('Listening… start singing');
}

export function disarmLiveSing() {
  appState.livesing.armed = false;
  onsetHoldStart = 0;
  updateArmButton(false);
}

// Called every animation frame from the main render loop.
export function checkLiveSingAutoStart() {
  if (!appState.livesing.armed || appState.livesing.isPlaying) return;
  const now = performance.now();
  if (pitchState.stableHz > 0) {
    if (!onsetHoldStart) onsetHoldStart = now;
    if (now - onsetHoldStart >= ONSET_HOLD_MS) {
      appState.livesing.armed = false;
      onsetHoldStart = 0;
      updateArmButton(false);
      playLiveSing();
    }
  } else {
    onsetHoldStart = 0;
  }
}

/* ---------------------------------------------------------- playback ------ */

export async function playLiveSing() {
  await ensureAudioContext();
  if (appState.livesing.isPlaying) return;

  const base = appState.satb.currentExercise;
  if (!base) { updateStatus('Pick a hymn first'); return; }

  appState.livesing.isPlaying = true;
  updateTransportButtons(true);
  updateStatus('Singing');

  const exercise = transposeExercise(base, appState.livesing.doSemis);

  if (Number.isFinite(exercise.midiKeyMidi)) {
    appState.staff.keyTonic = exercise.midiKeyMidi;
    appState.staff.keyMode = exercise.midiKeyMode || 'major';
    appState.staff.satbPreviewMode = true;
  }
  appState.satb.aimPart = appState.livesing.part;

  const stanza = convertToStanza(exercise);

  // Only the chosen part sounds; the other three are muted (volume 0).
  const chosen = appState.livesing.part;
  const partVolumes = { S: 0, A: 0, T: 0, B: 0 };
  partVolumes[chosen] = appState.livesing.softness;

  const audioSetup = async (scaledStanza, sequenceId) => {
    scheduleNotes(scaledStanza.notes, sequenceId, async (note, seqId) => {
      if (!isValidSequence(seqId) || !appState.livesing.isPlaying) return;
      const isChosen = note.part === chosen;
      // Pan the chosen voice into the selected ear (read live so an ear change mid-song applies).
      const pan = isChosen ? (EAR_PAN[appState.livesing.ear] || 0) : 0;
      if (isChosen) {
        appState.livesing.currentTargetMidi = note.midi; // drives the crosshair target
      }
      // baseGain 1 so gain === partVolume (softness for the chosen part, 0 for the rest).
      await playNote({ ...note, pan }, seqId, 1, partVolumes);
      if (isChosen) {
        await waitWithValidation(note.duration * 1000, seqId, () => appState.livesing.isPlaying);
        if (appState.livesing.currentTargetMidi === note.midi) {
          appState.livesing.currentTargetMidi = null;
        }
      }
    });
  };

  await stanzaSequencePlayer.startSequence([stanza], {
    tempo: appState.livesing.tempo,
    baseGain: 1,
    partVolumes,
    audioSetup,
    onStanzaStart: () => startProgress(exercise.duration),
    onComplete: () => finishLiveSing('done'),
    onStop: () => finishLiveSing('stopped')
  });

  // If the sequence ended without firing onComplete (already stopped), make sure UI settles.
  if (appState.livesing.isPlaying) {
    finishLiveSing('done');
  }
}

export function stopLiveSing() {
  if (!appState.livesing.isPlaying) {
    disarmLiveSing();
    return;
  }
  stanzaSequencePlayer.stopSequence(); // triggers onStop -> finishLiveSing('stopped')
}

function finishLiveSing(status) {
  appState.livesing.isPlaying = false;
  appState.livesing.currentTargetMidi = null;
  stopProgress();
  updateTransportButtons(false);
  updateStatus(status === 'stopped' ? 'Stopped' : 'Done');
  // Restore the static hymn display so the notation stays visible after stopping.
  displayLiveSingHymn();
}

/* -------------------------------------------------------- staff display --- */

// Show the current hymn (Do-shifted) statically on the shared staff — the v1
// placeholder visual. Phase 2 swaps this for engraved MusicXML notation.
export function displayLiveSingHymn() {
  const base = appState.satb.currentExercise;
  if (!base) return;
  const ex = transposeExercise(base, appState.livesing.doSemis);

  const allNotes = [];
  Object.values(ex.parts).forEach(partNotes => allNotes.push(...partNotes));
  allNotes.sort((a, b) => a.startTime - b.startTime);

  const tonic = ex.midiKeyMidi;
  const mode = ex.midiKeyMode || 'major';
  const annotated = allNotes.map(n => ({
    ...n,
    accidental: getAccidentalForNote(n.midi, tonic, mode)
  }));

  appState.staff.notes = annotated;
  appState.staff.scrollingMode = false;
  appState.staff.isPlaying = false;
  appState.staff.currentTime = 0;
  appState.staff.playheadX = 0;
  appState.staff.satbPreviewMode = true;
  appState.staff.keyTonic = tonic;
  appState.staff.keyMode = mode;
  appState.satb.aimPart = appState.livesing.part;

  renderStaff();
  updateHymnLabel();
}

/* ------------------------------------------------------------- helpers ---- */

function convertToStanza(exercise) {
  const allNotes = [];
  Object.values(exercise.parts).forEach(partNotes => allNotes.push(...partNotes));
  allNotes.sort((a, b) => a.startTime - b.startTime);
  const tonic = exercise.midiKeyMidi;
  const mode = exercise.midiKeyMode || 'major';
  const annotated = allNotes.map(n => ({
    ...n,
    accidental: getAccidentalForNote(n.midi, tonic, mode)
  }));
  return { label: exercise.label, duration: exercise.duration, notes: annotated, parts: exercise.parts };
}

function transposeExercise(exercise, semis) {
  if (!exercise || !semis) return exercise;
  const parts = {};
  Object.entries(exercise.parts || {}).forEach(([part, notes]) => {
    parts[part] = (notes || []).map(n => ({ ...n, midi: n.midi + semis }));
  });
  const clone = { ...exercise, parts };
  if (Number.isFinite(exercise.midiKeyMidi)) {
    clone.midiKeyMidi = pitchClass(exercise.midiKeyMidi + semis);
  }
  return clone;
}

function pitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

function noteName(midi) {
  const pc = pitchClass(midi);
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}${octave}`;
}

/* --------------------------------------------------------------- ui state - */

function updateLiveSingPartButtons(selected) {
  PARTS.forEach(part => {
    const button = getElementById(`liveSingPart-${part.id}`);
    if (button) button.classList.toggle('active', part.id === selected);
  });
}

function updateEarButtons() {
  const left = getElementById('liveSingEarL');
  const right = getElementById('liveSingEarR');
  if (left) left.classList.toggle('active', appState.livesing.ear === 'L');
  if (right) right.classList.toggle('active', appState.livesing.ear === 'R');
}

function updateTransportButtons(isPlaying) {
  const arm = getElementById('btnLiveSingArm');
  const play = getElementById('btnLiveSingPlay');
  const stop = getElementById('btnLiveSingStop');
  const tempo = getElementById('liveSingTempo');
  if (arm) arm.style.display = isPlaying ? 'none' : '';
  if (play) play.style.display = isPlaying ? 'none' : '';
  if (stop) stop.style.display = isPlaying ? '' : 'none';
  if (tempo) tempo.disabled = isPlaying;
}

function updateArmButton(armed) {
  const arm = getElementById('btnLiveSingArm');
  if (arm) {
    arm.textContent = armed ? 'Listening…' : 'Arm & Listen';
    arm.classList.toggle('active', armed);
  }
}

function updateHymnLabel() {
  const el = getElementById('liveSingCurrentHymn');
  if (!el) return;
  const ex = appState.satb.currentExercise;
  if (ex && ex.label) {
    el.textContent = ex.label;
    el.classList.remove('no-hymn');
  } else {
    el.textContent = 'Browse the hymn library to get started';
    el.classList.add('no-hymn');
  }
}

function updateStatus(text) {
  setTextContent(getElementById('liveSingStatus'), text);
}

/* ------------------------------------------------------------- progress --- */

function startProgress(durationSec) {
  stopProgress();
  const wrap = getElementById('liveSingProgress');
  const bar = getElementById('liveSingProgressBar');
  if (wrap) wrap.setAttribute('aria-hidden', 'false');
  progressDurationMs = (durationSec || 0) * (60 / appState.livesing.tempo) * 1000;
  progressStartMs = performance.now();
  const tick = () => {
    if (!appState.livesing.isPlaying) return;
    const elapsed = performance.now() - progressStartMs;
    const pct = progressDurationMs > 0 ? Math.min(100, (elapsed / progressDurationMs) * 100) : 0;
    if (bar) bar.style.width = `${pct}%`;
    progressRafId = requestAnimationFrame(tick);
  };
  progressRafId = requestAnimationFrame(tick);
}

function stopProgress() {
  if (progressRafId) {
    cancelAnimationFrame(progressRafId);
    progressRafId = null;
  }
  const bar = getElementById('liveSingProgressBar');
  if (bar) bar.style.width = '0%';
}
