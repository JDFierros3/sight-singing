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
import { frequencyToMidi, midiToFrequency, centsBetween } from '../utils/audioMath.js';
import { NOTE_NAMES } from '../config/constants.js';
import { getAccidentalForNote } from '../utils/keySignature.js';
import { stanzaSequencePlayer } from '../player/sequencePlayer.js';
import { scheduleNotes, waitWithValidation } from '../player/noteScheduler.js';
import { isValidSequence } from '../player/sequenceManager.js';
import { playNote } from '../player/audioPlayer.js';
import { setPartPan, setPlaybackDetune } from '../audio/instruments.js';
import { renderStaff } from '../rendering/staff.js';
import { renderHymnNotation } from '../rendering/notationView.js';
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
let livesingOrigA4 = null; // restore tuning after exact-Do detune

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ------------------------------------------------------------------ setup -- */

export function initializeLiveSing() {
  buildLiveSingPartButtons();
  // Highlight the Live Sing part on the shared staff (renderer reads satb.aimPart).
  appState.satb.aimPart = appState.livesing.part;
  syncLiveSingControls();
  applyHymnTempo(); // start from the auto-selected hymn's own tempo

  // When a hymn is picked from the shared browser while on this tab, refresh our
  // label + re-anchor the Set-Do transpose, adopt the hymn's tempo, and redraw.
  window.addEventListener('hymn:selected', () => {
    if (appState.exercise.currentTab === 'livesing') {
      recomputeDoSemis();
      applyHymnTempo();
      displayLiveSingHymn();
    }
  });
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
  const look = getElementById('liveSingLookahead');
  const lookVal = getElementById('liveSingLookaheadValue');
  if (look) look.value = String(appState.livesing.lookaheadMs);
  if (lookVal) setTextContent(lookVal, String(appState.livesing.lookaheadMs));
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
  const rounded = Math.round(appState.livesing.tempo);
  setTextContent(getElementById('liveSingTempoValue'), String(rounded));
  const slider = getElementById('liveSingTempo');
  if (slider && Number(slider.value) !== rounded) slider.value = String(rounded);
}

// Default the tempo to the current hymn's own tempo (OpenPsalm tempo_bpm) instead of 60.
function applyHymnTempo() {
  const t = appState.satb.currentExercise?.tempoBpm;
  if (t) setLiveSingTempo(t);
}

export function setLiveSingLookahead(ms) {
  appState.livesing.lookaheadMs = Math.max(0, Number(ms) || 0);
  setTextContent(getElementById('liveSingLookaheadValue'), String(Math.round(appState.livesing.lookaheadMs)));
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
    appState.livesing.doCents = 0;
    return;
  }
  // Compare the hummed pitch to STANDARD tuning (A440): integer semitones set the key,
  // the leftover cents fine-tune playback to the exact pitch the leader gave.
  const midiFloat = frequencyToMidi(appState.livesing.doHz, 440);
  const nearest = Math.round(midiFloat);
  appState.livesing.doCents = (midiFloat - nearest) * 100;
  const capturedPc = pitchClass(nearest);
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

  // Tune the reference to the EXACT hummed Do: cents-detune both audio paths.
  const cents = appState.livesing.doHz != null ? (appState.livesing.doCents || 0) : 0;
  livesingOrigA4 = appState.tuning.a4;
  appState.tuning.a4 = 440 * Math.pow(2, cents / 1200); // sine-oscillator path
  setPlaybackDetune(cents);                               // piano/sampler path

  startMicrophone().catch(() => {}); // so the pitch (crosshair) line has input

  enterPerformanceMode(); // full-screen scrolling notation

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

  // Look-ahead: fire the reference audio this many wall-clock seconds before the
  // visual playhead reaches the note, so singers hear upcoming pitches early.
  const lookaheadSec = (appState.livesing.lookaheadMs || 0) / 1000;

  const audioSetup = async (scaledStanza, sequenceId) => {
    const audioNotes = lookaheadSec > 0
      ? scaledStanza.notes.map(n => ({ ...n, startTime: Math.max(0, n.startTime - lookaheadSec) }))
      : scaledStanza.notes;
    scheduleNotes(audioNotes, sequenceId, async (note, seqId) => {
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
  // Restore standard tuning after the exact-Do detune.
  if (livesingOrigA4 != null) { appState.tuning.a4 = livesingOrigA4; livesingOrigA4 = null; }
  setPlaybackDetune(0);
  stopProgress();
  exitPerformanceMode();
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
  renderNotation(ex);
}

// Render real engraved notation (VexFlow) into the Live Sing visual panel.
// Guarded so we don't re-engrave the whole score on ear/part/volume changes.
let lastNotatedKey = null;
let notationLayout = null;
let notatedExercise = null;
let playheadEl = null;
let micLineEl = null;
let performRafId = null;

function renderNotation(exercise, force = false) {
  const visual = getElementById('liveSingVisual');
  if (!visual || !exercise) return;
  notatedExercise = exercise;
  const performing = document.body.classList.contains('livesing-performing');
  const width = performing ? window.innerWidth : (visual.clientWidth || 800);
  // Full-screen enlarges the whole staff so it fills the screen (native scale, not CSS zoom).
  const scale = performing ? Math.max(1.4, Math.min(3, (window.innerHeight * 0.5) / 210)) : 1;
  const key = `${exercise.id || exercise.label}|${appState.livesing.doSemis}|${performing ? 'full' + scale.toFixed(2) : Math.round(width)}`;
  if (!force && key === lastNotatedKey && visual.querySelector('svg')) return;
  lastNotatedKey = key;
  visual.hidden = false;
  try {
    notationLayout = renderHymnNotation(exercise, visual, { width, scale });
    ensurePlayhead(visual);
  } catch (err) {
    console.warn('Notation render failed:', err);
  }
}

/* ---------------------------------------------- full-screen performance --- */

// While the exercise is active, expand the notation over everything and scroll
// it so the playhead stays in view — the controls simply scroll off behind it.
function enterPerformanceMode() {
  document.body.classList.add('livesing-performing');
  renderNotation(notatedExercise || appState.satb.currentExercise, true); // re-engrave at full width
  ensureExitButton(true);
  startPlayheadAnimation();
}

function exitPerformanceMode() {
  stopPlayheadAnimation();
  ensureExitButton(false);
  if (document.body.classList.contains('livesing-performing')) {
    document.body.classList.remove('livesing-performing');
    renderNotation(notatedExercise || appState.satb.currentExercise, true); // back to inline width
  }
}

function ensurePlayhead(visual) {
  playheadEl = document.createElement('div');
  playheadEl.className = 'livesing-playhead';
  visual.appendChild(playheadEl);
  // Mic pitch line lives in the notation wrapper so it aligns with the staff and scrolls with it.
  const wrap = visual.querySelector('.livesing-notation-wrap');
  if (wrap) {
    micLineEl = document.createElement('div');
    micLineEl.className = 'livesing-micline';
    wrap.appendChild(micLineEl);
  }
}

// The singer's detected pitch as a horizontal line on the staff, coloured by how close
// it is to the chosen part's current note (green/yellow/red) — the "crosshair" feedback.
function updateMicLine() {
  if (!micLineEl || !notationLayout || !notationLayout.pitchToY) return;
  const hz = pitchState.smoothedHz || pitchState.hz || 0;
  if (hz <= 0) { micLineEl.style.display = 'none'; return; }
  const sungMidi = frequencyToMidi(hz, appState.tuning.a4);
  micLineEl.style.top = `${notationLayout.pitchToY(sungMidi)}px`;
  micLineEl.style.display = 'block';
  const target = appState.livesing.currentTargetMidi;
  if (Number.isFinite(target)) {
    const cents = Math.abs(centsBetween(hz, midiToFrequency(target, appState.tuning.a4)));
    micLineEl.style.background = cents <= 20 ? '#22c55e' : (cents <= 50 ? '#eab308' : '#ef4444');
  } else {
    micLineEl.style.background = '#60a5fa';
  }
}

function ensureExitButton(show) {
  let btn = getElementById('liveSingExitPerform');
  if (!btn && show) {
    btn = document.createElement('button');
    btn.id = 'liveSingExitPerform';
    btn.className = 'livesing-exit-btn';
    btn.textContent = 'Stop';
    btn.onclick = () => stopLiveSing();
    document.body.appendChild(btn);
  }
  if (btn) btn.style.display = show ? 'block' : 'none';
}

// Map exercise time (seconds at 60bpm) -> x, LINEARLY within each measure so the
// playhead glides at a steady speed instead of snapping between note positions.
function buildTimeToX(layout) {
  const mp = layout.measurePositions || [];
  const mlen = layout.measureLenSec || 1;
  return (t) => {
    if (!mp.length) return 0;
    if (t <= 0) return mp[0].x;
    const mi = Math.min(mp.length - 1, Math.floor(t / mlen));
    const m = mp[mi];
    const frac = Math.max(0, Math.min(1, (t - m.startTime) / mlen));
    return m.x + frac * m.width;
  };
}

function startPlayheadAnimation() {
  const visual = getElementById('liveSingVisual');
  if (!visual || !notationLayout) return;
  const timeToX = buildTimeToX(notationLayout);
  const frame = () => {
    if (!appState.livesing.isPlaying) { performRafId = null; return; }
    // exercise time = wall elapsed * tempo/60 (matches the player's playhead math)
    const exerciseTime = (appState.staff.currentTime || 0) * (appState.livesing.tempo / 60);
    const x = timeToX(exerciseTime);
    if (playheadEl) {
      playheadEl.style.left = `${x}px`;
      playheadEl.style.height = `${notationLayout.height || 210}px`;
    }
    // Keep the playhead ~30% from the left; the notation scrolls under it.
    visual.scrollLeft = Math.max(0, x - visual.clientWidth * 0.3);
    updateMicLine();
    performRafId = requestAnimationFrame(frame);
  };
  performRafId = requestAnimationFrame(frame);
}

function stopPlayheadAnimation() {
  if (performRafId) cancelAnimationFrame(performRafId);
  performRafId = null;
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
  clone.keySignature = null; // transposed: let notation derive the key from the new tonic
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
