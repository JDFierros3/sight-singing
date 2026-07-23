/**
 * Live Sing — congregational sing-along.
 *
 * Plays a single chosen SATB voice softly in ONE ear while the group follows the same hymn on
 * their own phones. The engraved notation, full-screen scroll, playhead, mic pitch line and
 * count-in all live in the reusable `performanceView` module; this file owns the Live Sing
 * controls, one-ear playback, and key/tempo state.
 */

import { getElementById, setTextContent, createElement } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { ensureAudioContext } from '../audio/context.js';
import { startMicrophone } from '../audio/microphone.js';
import { getAccidentalForNote } from '../utils/keySignature.js';
import { stanzaSequencePlayer } from '../player/sequencePlayer.js';
import { scheduleNotes, waitWithValidation } from '../player/noteScheduler.js';
import { isValidSequence } from '../player/sequenceManager.js';
import { playNote } from '../player/audioPlayer.js';
import { setPartPan, ensureInstrumentReady } from '../audio/instruments.js';
import { renderStaff } from '../rendering/staff.js';
import {
  configurePerformance, showNotation, enterPerformance, exitPerformance,
  startScroll, refitPerformance, runCountIn, cancelCountIn, nextPaint
} from '../rendering/performanceView.js';
import { openHymnBrowser } from '../ui/components/hymnBrowser.js';

const PARTS = [
  { id: 'S', label: 'Soprano' },
  { id: 'A', label: 'Alto' },
  { id: 'T', label: 'Tenor' },
  { id: 'B', label: 'Bass' }
];

// Full left / right for the reference tone.
const EAR_PAN = { L: -0.85, R: 0.85 };

let progressRafId = null;
let progressStartMs = 0;
let progressDurationMs = 0;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ------------------------------------------------------------------ setup -- */

export function initializeLiveSing() {
  buildLiveSingPartButtons();
  // Highlight the Live Sing part on the shared staff (renderer reads satb.aimPart).
  appState.satb.aimPart = appState.livesing.part;

  // Wire the reusable performance surface to Live Sing's container + state.
  configurePerformance({
    container: getElementById('liveSingVisual'),
    getTime: () => (appState.staff.currentTime || 0) * (appState.livesing.tempo / 60),
    getTargetMidi: () => appState.livesing.currentTargetMidi,
    fitPart: () => appState.livesing.part,
    isPlaying: () => appState.livesing.isPlaying,
    onExit: () => stopLiveSing(),
    variant: () => appState.livesing.doSemis
  });

  syncLiveSingControls();
  applyHymnTempo();   // start from the auto-selected hymn's own tempo
  syncKeyDropdown();  // and its own key

  // When a hymn is picked from the shared browser while on this tab, adopt its
  // key + tempo and redraw.
  window.addEventListener('hymn:selected', () => {
    if (appState.exercise.currentTab === 'livesing') {
      applyHymnTempo();
      syncKeyDropdown();
      displayLiveSingHymn();
    }
  });

  // Re-fit the full-screen notation when the phone rotates or the browser chrome resizes.
  let resizeDebounce = null;
  const onViewport = () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(refitPerformance, 150);
  };
  window.addEventListener('resize', onViewport);
  window.addEventListener('orientationchange', onViewport);
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

export function browseLiveSingHymns() {
  openHymnBrowser();
}

/* --------------------------------------------------------------- key ------ */

// Transpose the hymn to the chosen key (pitch class 0-11). doSemis is the nearest
// shift from the hymn's tonic to that key (-5..+6).
export function setLiveSingKey(pc) {
  const ex = appState.satb.currentExercise;
  const target = Number(pc);
  if (!ex || !Number.isFinite(ex.midiKeyMidi) || !Number.isFinite(target)) {
    appState.livesing.doSemis = 0;
  } else {
    const tonicPc = pitchClass(ex.midiKeyMidi);
    let shift = ((target - tonicPc) % 12 + 12) % 12;
    if (shift > 6) shift -= 12;
    appState.livesing.doSemis = shift;
  }
  displayLiveSingHymn();
}

// Point the Key dropdown at the current hymn's own key and reset the transpose.
function syncKeyDropdown() {
  appState.livesing.doSemis = 0;
  const sel = getElementById('liveSingKey');
  const ex = appState.satb.currentExercise;
  if (sel && ex && Number.isFinite(ex.midiKeyMidi)) {
    sel.value = String(pitchClass(ex.midiKeyMidi));
  }
}

/* ---------------------------------------------------------- playback ------ */

export async function playLiveSing() {
  if (appState.livesing.isPlaying || appState.livesing.preparing) return;

  const base = appState.satb.currentExercise;
  if (!base) { updateStatus('Pick a hymn first'); return; }

  // --- Buffer everything BEFORE the first note, so the start doesn't skip. ---
  // The full-screen engrave and audio warm-up are the expensive bits; do them now (with a
  // 3-2-1 countdown), so the main thread is idle when notes actually start firing.
  appState.livesing.preparing = true;
  updateTransportButtons(true);            // Stop is reachable throughout prep
  updateStatus('Get ready…');
  startMicrophone().catch(() => {});        // so the pitch (crosshair) line has input
  await ensureAudioContext();
  enterPerformance();                       // engrave the full-screen notation up front
  await ensureInstrumentReady();            // wait for samples (no-op for the sine path)
  await nextPaint();                        // let the engraved staff paint before we count in

  if (!appState.livesing.preparing) return; // Stop pressed during buffering
  const counted = await runCountIn();       // 3 · 2 · 1 · Sing!
  if (!counted || !appState.livesing.preparing) return; // Stop pressed during countdown

  appState.livesing.preparing = false;
  appState.livesing.isPlaying = true;
  updateStatus('Singing');
  startScroll();                            // begin the scroll now that we're actually playing

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
      // Only the chosen voice sounds — skip the other three entirely instead of spawning
      // silent (gain-0) audio nodes for every note (4x the audio work at high tempo).
      if (note.part !== chosen) return;
      // Pan the chosen voice into the selected ear (read live so an ear change mid-song applies).
      const pan = EAR_PAN[appState.livesing.ear] || 0;
      appState.livesing.currentTargetMidi = note.midi; // drives the crosshair target
      // baseGain 1 so gain === partVolume (the chosen part's softness).
      await playNote({ ...note, pan }, seqId, 1, partVolumes);
      await waitWithValidation(note.duration * 1000, seqId, () => appState.livesing.isPlaying);
      if (appState.livesing.currentTargetMidi === note.midi) {
        appState.livesing.currentTargetMidi = null;
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
  // Cancel a pending count-in/buffer before playback has started.
  if (appState.livesing.preparing) {
    appState.livesing.preparing = false;
    cancelCountIn();
    finishLiveSing('stopped');
    return;
  }
  if (!appState.livesing.isPlaying) return;
  stanzaSequencePlayer.stopSequence(); // triggers onStop -> finishLiveSing('stopped')
}

function finishLiveSing(status) {
  appState.livesing.isPlaying = false;
  appState.livesing.preparing = false;
  appState.livesing.currentTargetMidi = null;
  cancelCountIn();
  stopProgress();
  exitPerformance();
  updateTransportButtons(false);
  updateStatus(status === 'stopped' ? 'Stopped' : 'Done');
  // Restore the static hymn display so the notation stays visible after stopping.
  displayLiveSingHymn();
}

/* -------------------------------------------------------- staff display --- */

// Show the current hymn (transposed to the chosen key) as engraved notation, and mirror it
// onto the shared (hidden) canvas staff state for solfege/key bookkeeping.
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
  showNotation(ex);
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
  const play = getElementById('btnLiveSingPlay');
  const stop = getElementById('btnLiveSingStop');
  const tempo = getElementById('liveSingTempo');
  if (play) play.style.display = isPlaying ? 'none' : '';
  if (stop) stop.style.display = isPlaying ? '' : 'none';
  if (tempo) tempo.disabled = isPlaying;
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
