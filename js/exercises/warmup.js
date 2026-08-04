/**
 * Warmup exercise sequences
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { ensureAudioContext, getAudioContext } from '../audio/context.js';
import { stopAllDroneOscillators } from '../audio/drone.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from '../audio/oscillator.js';
import { appState } from '../state/appState.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { buildArpeggioUp, buildArpeggioDown } from './chords.js';
import { stanzaSequencePlayer } from '../player/sequencePlayer.js';
import { scheduleNotes, waitWithValidation } from '../player/noteScheduler.js';
import { isValidSequence, getCurrentSequenceId, trackBadgeTimeout, removeBadgeTimeout } from '../player/sequenceManager.js';
import { isUsingSoundfont, playInstrumentNote, stopInstrumentNote } from '../audio/instruments.js';
import { configurePerformance, showNotation, enterPerformance, exitPerformance, startScroll, withLeadIn } from '../rendering/performanceView.js';
import { spellMidiInKey } from '../utils/keySignature.js';
import { getVoiceTuning } from '../session/profile.js';
import { midiToNoteName } from '../utils/musicTheory.js';

// Which of the 6 stanza indices each pattern pill selects, split by direction.
const PATTERN_STANZAS = {
  scale:     { up: 0, down: 1 },
  intervals: { up: 2, down: 3 },
  arpeggios: { up: 4, down: 5 }
};

// The staff clef: an explicit Advanced override wins, otherwise it follows the singer's voice.
function getWarmupClef() {
  const sel = getElementById('warmupClef');
  const v = sel ? sel.value : 'auto';
  if (v === 'treble' || v === 'bass') return v;
  return getVoiceTuning().clef; // 'treble' for S/A, 'bass' for T/B
}

// Point the shared performance surface at the Warmup tab (container + clock + state).
function configureWarmupPerformance() {
  const part = getVoiceTuning().part;
  configureWarmupPerformance._clef = getWarmupClef();
  configurePerformance({
    container: getElementById('warmupVisual'),
    getTime: () => (appState.staff.currentTime || 0) * ((appState.staff.tempo || 60) / 60),
    getTargetMidi: () => null,
    fitPart: () => part,
    isPlaying: () => appState.exercise.warmupRunning,
    onExit: () => stopWarmupSequence(),
    // Clef is in the variant so toggling it in Advanced busts the render cache.
    variant: () => `${appState.tuning.doMidi}|${getSelectedStanzaIndices().join('')}|${configureWarmupPerformance._clef}`,
    renderOptions: { staffMode: 'single', clef: configureWarmupPerformance._clef }
  });
}

// Track active warmup oscillators so we can stop them
let activeWarmupOscillators = [];

/* ------------------------------------------- engraved solfege reference --- */

// Render the selected warmup patterns on a single VexFlow staff with each note's movable-Do
// solfege syllable beneath it — a static "Do Re Mi Fa Sol…" reference for the tab.
let warmupControlsBound = false;
let warmupTempoTouched = false;
function bindWarmupControls() {
  if (warmupControlsBound) return;
  const rerender = () => { if (appState.exercise.currentTab === 'warmup') displayWarmupStaff(); };

  // Pattern pills toggle on/off; keep at least one selected so the staff is never empty.
  getElementById('warmupPatterns')?.querySelectorAll('.pill-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') === 'true';
      const others = [...btn.parentElement.querySelectorAll('.pill-toggle')].filter(b => b !== btn);
      if (on && others.every(b => b.getAttribute('aria-pressed') !== 'true')) return; // don't turn off the last one
      btn.setAttribute('aria-pressed', String(!on));
      btn.classList.toggle('on', !on);
      rerender();
    });
  });

  ['warmupDirUp', 'warmupDirDown', 'warmupClef'].forEach(id =>
    getElementById(id)?.addEventListener('change', rerender));

  // Live tempo readout; once the singer nudges it we stop auto-applying the voice default.
  getElementById('warmupTempo')?.addEventListener('input', () => {
    warmupTempoTouched = true;
    updateWarmupStatus();
  });

  getElementById('btnWarmupRestart')?.addEventListener('click', restartWarmup);
  getElementById('btnWarmupFull')?.addEventListener('click', toggleWarmupFullscreen);

  warmupControlsBound = true;
}

const DEFAULT_WARMUP_TEMPO = 60; // a comfortable default for warm-ups regardless of voice type
// Apply the default tempo the first time in, before the singer has touched the slider.
function applyVoiceDefaults() {
  const slider = getElementById('warmupTempo');
  if (slider && !warmupTempoTouched && !appState.exercise.warmupRunning) {
    slider.value = String(DEFAULT_WARMUP_TEMPO);
    appState.staff.tempo = DEFAULT_WARMUP_TEMPO;
  }
}

// Read-only "Do A3 · treble · 76 bpm" — a singer sees their setup without any control to fiddle.
function updateWarmupStatus() {
  const el = getElementById('warmupStatus');
  if (!el) return;
  const doName = midiToNoteName(appState.tuning.doMidi);
  const clef = getWarmupClef();
  const tempo = getWarmupTempo();
  el.textContent = `Do ${doName} · ${clef} · ${tempo} bpm`;
  const val = getElementById('warmupTempoVal');
  if (val) val.textContent = String(tempo);
}

export function displayWarmupStaff() {
  bindWarmupControls();
  applyVoiceDefaults();
  updateWarmupStatus();
  const container = getElementById('warmupVisual');
  if (!container) return;
  const exercise = buildWarmupExercise();
  if (!exercise) { container.innerHTML = ''; container.hidden = true; return; }
  configureWarmupPerformance();
  showNotation(exercise, true);
}

// ↺ restart from the top; ⤢ toggle full-screen play-along.
function restartWarmup() {
  if (appState.exercise.warmupRunning) stopWarmupSequence();
  setTimeout(() => runWarmupSequence(), 60);
}
function toggleWarmupFullscreen() {
  if (appState.exercise.warmupRunning) { stopWarmupSequence(); return; }
  runWarmupSequence();
}

// Concatenate the selected warmup stanzas into a single hymn-format exercise whose per-note
// "lyrics" are the movable-Do solfege syllables — so it renders through the standard path.
function buildWarmupExercise() {
  const plan = buildWarmupPlan();
  const selected = getSelectedStanzaIndices();
  const stanzas = selected.length ? selected.map(i => plan[i]).filter(Boolean) : plan;
  const tonicPc = ((appState.tuning.doMidi % 12) + 12) % 12;
  const notes = [];
  const lyricsByNote = [];
  const REST_SEC = 2; // a short breath between exercises (patterns now also breathe internally)
  let t = 0;
  stanzas.forEach((st, si) => {
    for (const n of st.notes) {
      notes.push({ midi: n.midi, startTime: t + n.startTime, duration: n.duration, part: 'S' });
      const spelled = spellMidiInKey(n.midi, tonicPc, 'major');
      lyricsByNote.push(spelled ? spelled.solfege : '');
    }
    t += st.duration;
    if (si < stanzas.length - 1) t += REST_SEC; // breathing room between exercises
  });
  if (!notes.length) return null;
  return {
    id: 'warmup',
    label: 'Warmup',
    duration: t,
    midiKeyMidi: tonicPc,
    midiKeyMode: 'major',
    timeSigNum: 4,
    timeSigDen: 4,
    parts: { S: notes, A: [], T: [], B: [] },
    lyricsByNote
  };
}

// The Warmup tab's own tempo (its slider), independent of the shared staff.tempo.
// Falls back to the voice's default when the slider hasn't been rendered/touched.
function getWarmupTempo() {
  const slider = getElementById('warmupTempo');
  const v = slider ? Number(slider.value) : NaN;
  if (Number.isFinite(v) && v > 0) return v;
  return DEFAULT_WARMUP_TEMPO;
}

// The active stanza indices, read from the three pattern pills × the Advanced direction toggles.
function getSelectedStanzaIndices() {
  const upEl = getElementById('warmupDirUp');
  const downEl = getElementById('warmupDirDown');
  const useUp = upEl ? upEl.checked : true;
  const useDown = downEl ? downEl.checked : true;

  const pills = getElementById('warmupPatterns');
  const active = pills
    ? [...pills.querySelectorAll('.pill-toggle')]
        .filter(b => b.getAttribute('aria-pressed') === 'true')
        .map(b => b.dataset.pattern)
    : ['scale', 'intervals'];

  const idx = [];
  for (const pat of ['scale', 'intervals', 'arpeggios']) {   // musical order: pattern, then up before down
    if (!active.includes(pat)) continue;
    const map = PATTERN_STANZAS[pat];
    if (useUp) idx.push(map.up);
    if (useDown) idx.push(map.down);
  }
  // Never silent: if both directions were unchecked, ascend the active patterns.
  if (!idx.length && active.length) {
    for (const pat of ['scale', 'intervals', 'arpeggios']) {
      if (active.includes(pat)) idx.push(PATTERN_STANZAS[pat].up);
    }
  }
  return idx;
}

export async function runWarmupSequence(selectedStanzaIndices = null) {
  await ensureAudioContext();

  // One concatenated exercise (the selected patterns, solfege-labelled) drives both the
  // engraved scroll and the audio, so the staff you see is exactly the staff you hear.
  // A one-bar lead-in gives the playhead room to establish its pace before the first note.
  const base = buildWarmupExercise();
  if (!base) return;
  const exercise = withLeadIn(base, 1);

  // Warmup always sings at its OWN tempo slider — never the shared staff.tempo that the
  // SATB tab overwrites with a hymn's (faster) tempo. Otherwise a warm-up inherits it.
  appState.staff.tempo = getWarmupTempo();

  appState.exercise.warmupRunning = true;
  updateWarmupButton(true);

  const badge = getElementById('warmupBadge');
  setTextContent(badge, exercise.label || '—');

  // Full-screen play-along: scroll the solfege staff under the pinned playhead.
  configureWarmupPerformance();
  enterPerformance(exercise);
  startScroll();

  const stanza = { label: exercise.label, duration: exercise.duration, notes: exercise.parts.S };

  // Create audio setup callback for warmup-specific note playing
  const audioSetup = async (scaledStanza, sequenceId) => {
    // Schedule all notes to play at their times
    // Don't wait here - the sequence player will handle timing
    scheduleNotes(scaledStanza.notes, sequenceId, async (note, seqId) => {
      if (!isValidSequence(seqId) || !appState.exercise.warmupRunning) {
        return;
      }
      
      const gain = appState.drone.gain;
      
      // Try to use instrument if available
      if (isUsingSoundfont()) {
        const instrumentNote = playInstrumentNote(note.midi, note.duration, gain);
        if (instrumentNote) {
          activeWarmupOscillators.push(instrumentNote);
          
          // Wait for the note duration
          await waitWithValidation(
            note.duration * 1000,
            seqId,
            () => appState.exercise.warmupRunning
          );
          
          // Remove from tracking
          const index = activeWarmupOscillators.indexOf(instrumentNote);
          if (index > -1) {
            activeWarmupOscillators.splice(index, 1);
          }
          return;
        }
      }
      
      // Fall back to oscillator
      const frequency = midiToFrequency(note.midi, appState.tuning.a4);
      const oscillator = createWarmupOscillator(frequency, gain);
      
      if (oscillator) {
        // Track this oscillator so we can stop it if warmup is stopped
        activeWarmupOscillators.push(oscillator);
        
        // Play for the note duration
        const stillValid = await waitWithValidation(
          note.duration * 1000,
          seqId,
          () => appState.exercise.warmupRunning
        );
        
        // Only stop if this is still the current sequence
        if (stillValid && isValidSequence(seqId)) {
          stopWarmupOscillator(oscillator);
          // Remove from tracking
          const index = activeWarmupOscillators.indexOf(oscillator);
          if (index > -1) {
            activeWarmupOscillators.splice(index, 1);
          }
        }
      }
    });
    
    // Don't wait here - return immediately and let the sequence player handle timing
    // The sequence player will wait for the stanza duration
  };
  
  // Start the sequence using the player
  await stanzaSequencePlayer.startSequence([stanza], {
    tempo: appState.staff.tempo,
    baseGain: appState.drone.gain,
    audioSetup: audioSetup,
    onComplete: () => finishWarmup('done'),
    onStop: () => finishWarmup('stopped')
  });

  // Cleanup if sequence ended without firing a callback (e.g. empty).
  if (appState.exercise.warmupRunning) finishWarmup('done');
}

// Tear down a warmup run: stop audio, leave the full-screen surface, restore the static staff.
function finishWarmup(status) {
  if (!appState.exercise.warmupRunning && status === 'done') return;
  appState.exercise.warmupRunning = false;
  updateWarmupButton(false);
  stopAllWarmupOscillators();
  stopAllDroneOscillators();
  exitPerformance();
  displayWarmupStaff();

  const badge = getElementById('warmupBadge');
  setTextContent(badge, status === 'stopped' ? 'stopped' : 'done');
  const sequenceId = getCurrentSequenceId();
  const timeoutId = setTimeout(() => {
    if (isValidSequence(sequenceId)) setTextContent(badge, '—');
    removeBadgeTimeout(timeoutId, sequenceId);
  }, status === 'stopped' ? 1000 : 1500);
  trackBadgeTimeout(timeoutId, sequenceId);
}

export function stopWarmupSequence() {
  if (!appState.exercise.warmupRunning) {
    return; // Not running, nothing to stop
  }
  
  // Stop the sequence using the player
  stanzaSequencePlayer.stopSequence();
}

function stopAllWarmupOscillators() {
  // Stop all active warmup oscillators
  activeWarmupOscillators.forEach(oscillator => {
    stopWarmupOscillator(oscillator);
  });
  activeWarmupOscillators = [];
}


function updateWarmupButton(isRunning) {
  const button = getElementById('btnWarmup');
  const tempoSlider = getElementById('warmupTempo');

  if (button) {
    button.textContent = isRunning ? '⏸' : '▶';
    button.classList.toggle('is-playing', isRunning);
    button.setAttribute('aria-label', isRunning ? 'Stop warm up' : 'Play warm up');
  }

  // Disable the tempo slider during playback to prevent timing issues.
  if (tempoSlider) {
    tempoSlider.disabled = isRunning;
  }
}

function buildWarmupPlan() {
  // Return all warmup stanzas for scrolling display
  const stanzas = [];
  
  // Basic scales
  stanzas.push(createStanza1()); // Major scale up
  stanzas.push(createStanza2()); // Major scale down
  
  // Intervals
  stanzas.push(createStanza3()); // Intervals from Do (up)
  stanzas.push(createStanza4()); // Intervals from Do (down)
  
  // Arpeggios - all ascending in one stanza
  stanzas.push(createAllArpeggiosStanza('up'));
  
  // Arpeggios - all descending in one stanza
  stanzas.push(createAllArpeggiosStanza('down'));
  
  return stanzas;
}


// Warm-up phrases as QUARTER notes (1 beat each) with breaths (rests) between phrases, so they
// sing slower and more sustained than the old eighth-note timing. A rest is just a gap in the
// timeline — the notation renders it and the playhead glides through in sync.
const Q = 1;            // quarter note = 1 beat (@60bpm baseline; tempo-scaled at play time)
const PHRASE_REST = 2;  // a two-beat breath between phrases within a pattern

// Build a stanza from an event list. Each event is a semitone offset from Do (a note) or 'r'
// (a rest). Returns the standard { label, notes, duration } stanza shape.
function buildStanza(label, events) {
  const notes = [];
  let t = 0;
  for (const e of events) {
    if (e === 'r') { t += PHRASE_REST; continue; }
    notes.push({ midi: appState.tuning.doMidi + e, startTime: t, duration: Q });
    t += Q;
  }
  return { label, notes, duration: t };
}

function createStanza1() { // Major scale up
  return buildStanza('Major scale ↑', [0, 2, 4, 5, 7, 9, 11, 12]);
}

function createStanza2() { // Major scale down
  return buildStanza('Major scale ↓', [12, 11, 9, 7, 5, 4, 2, 0]);
}

function createStanza3() { // Intervals from Do (up): Do–Re, breathe, Do–Mi, breathe, …
  const ev = [];
  [2, 4, 5, 7, 9, 11, 12].forEach((deg, i, a) => { ev.push(0, deg); if (i < a.length - 1) ev.push('r'); });
  return buildStanza('Intervals from Do ↑', ev);
}

function createStanza4() { // Intervals from Do (down): Do'–Ti, breathe, Do'–La, breathe, …
  const ev = [];
  [11, 9, 7, 5, 4, 2, 0].forEach((deg, i, a) => { ev.push(12, deg); if (i < a.length - 1) ev.push('r'); });
  return buildStanza('Intervals from Do ↓', ev);
}

function createAllArpeggiosStanza(direction) {
  // Each triad as an up-and-back arpeggio (Do Mi Sol Mi Do), then a breath before the next.
  const degrees = [0, 2, 4, 5, 7, 9];
  const ev = [];
  degrees.forEach((degree, i) => {
    const arp = direction === 'up' ? buildArpeggioUp(degree) : buildArpeggioDown(degree);
    arp.forEach(semi => ev.push(degree + semi));
    if (i < degrees.length - 1) ev.push('r');
  });
  return buildStanza(`Arpeggios (${direction === 'up' ? '↑' : '↓'})`, ev);
}



function createWarmupOscillator(freq, gain) {
  const ctx = getAudioContext();
  if (!ctx) {
    return null;
  }
  
  const oscillator = createOscillator(freq, 'sine', gain);
  if (oscillator) {
    // Connect first, then start (this ensures proper audio graph setup)
    connectOscillatorToDestination(oscillator, ctx.destination);
    // startOscillator will handle the fade in
    startOscillator(oscillator);
  }
  
  return oscillator;
}

function stopWarmupOscillator(oscillator) {
  if (oscillator && oscillator.stop) {
    // Instrument note
    stopInstrumentNote(oscillator);
  } else {
    // Regular oscillator
    stopOscillator(oscillator);
  }
}


