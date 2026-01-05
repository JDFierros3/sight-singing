/**
 * Application state management with logical grouping
 */

import { CHORDS } from '../config/constants.js';
import { midiToFrequency } from '../utils/audioMath.js';

export const appState = {
  tuning: initializeTuning(),
  display: initializeDisplay(),
  drone: initializeDrone(),
  target: initializeTarget(),
  exercise: initializeExercise(),
  staff: initializeStaff(),
  satb: initializeSATB()
};

function initializeTuning() {
  return {
    a4: 440,
    doMidi: 60,
    minMidi: 48,
    maxMidi: 72,
    instrument: 'sine' // Current instrument (sine for oscillator, or soundfont name)
  };
}

function initializeDisplay() {
  return {
    tolerance: 60,
    zoom: 1.5,
    playAim: true,
    showKeySignature: false,
    showAccidentals: false
  };
}

function initializeDrone() {
  const defaultChord = Object.keys(CHORDS)[0];
  return {
    on: false,
    chord: defaultChord,
    rootSemi: 0,
    semis: CHORDS[defaultChord],
    gain: 0.25,
    individualGains: {}
  };
}

function initializeTarget() {
  return {
    semi: 0,
    showAimLine: false
  };
}

function initializeExercise() {
  return {
    onScaleOnly: true,
    currentTab: 'warmup',
    hidden: null,
    interval: null,
    intervalDifficulty: null,
    clusterDifficulty: null,
    warmupRunning: false,
    hideAnswers: {
      intervals: true,
      cluster: true
    },
    showAnswers: {
      intervals: false,
      cluster: false
    },
    _answerHideTimeouts: {
      intervals: null,
      cluster: null
    },
    clusterThinkTime: 3, // seconds before auto-hiding cluster answers
    display: {
      midis: [],
      label: ''
    },
    flashcards: {
      mode: 'shapeToSolfege',
      includeAccidentals: false,
      revealed: false,
      current: null
    }
  };
}

function initializeStaff() {
  return {
    scrollingMode: false,
    tempo: 60,
    currentTime: 0,
    isPlaying: false,
    notes: [],
    playheadX: 0,
    startTime: null,
    animationFrameId: null,
    sequenceId: null, // Track which warmup sequence owns the display
    stanzaDuration: null, // Duration of current stanza to limit playhead movement
    satbPreviewMode: false, // Flag to indicate SATB preview (don't clear notes on tab switch)
    viewportOffset: 0, // Horizontal offset for panning the viewport (keeps playhead centered)
    maxPanReached: false // Flag to indicate we've reached max pan and playhead should continue moving right
  };
}

function initializeSATB() {
  return {
    aimPart: 'S', // Which part to aim for
    partVolumes: {
      S: 0.8, // Soprano volume (0-1)
      A: 0.7, // Alto volume
      T: 0.6, // Tenor volume
      B: 0.5  // Bass volume
    },
    currentExercise: null,
    isPlaying: false,
    midiExercises: [], // Array of exercises loaded from MIDI files
    transposeSemis: 0
  };
}

/**
 * Get the Do MIDI note to use for solfege display
 * For MIDI exercises, use the MIDI file's key
 * For manual exercises, use the settings key
 */
export function getDoMidiForDisplay() {
  const currentExercise = appState.satb?.currentExercise;
  
  // Only use the MIDI exercise key when we're actually on the SATB tab,
  // otherwise a bad/unknown MIDI key could break solfege everywhere.
  const onSatbTab = appState.exercise?.currentTab === 'satb';

  // If current exercise is a MIDI exercise, use its key (pitch class 0-11)
  if (
    onSatbTab &&
    currentExercise &&
    currentExercise.isMidiExercise &&
    Number.isFinite(currentExercise.midiKeyMidi)
  ) {
    // midiKeyMidi is 0-11 (pitch class), we need to find a reasonable octave
    // Use middle C (60) as reference, then adjust to the key
    const transpose = appState.satb?.transposeSemis || 0;
    const keyPitchClass = ((currentExercise.midiKeyMidi + transpose) % 12 + 12) % 12;
    // Find the octave that puts the key note closest to middle C
    const baseOctave = 4; // C4 = 60
    const keyMidi = baseOctave * 12 + keyPitchClass;
    return keyMidi;
  }
  
  // Otherwise, use the settings key
  return appState.tuning.doMidi;
}

export function updateTuningSetting(key, value) {
  if (appState.tuning.hasOwnProperty(key)) {
    appState.tuning[key] = value;
  }
}

export function updateDisplaySetting(key, value) {
  if (appState.display.hasOwnProperty(key)) {
    appState.display[key] = value;
  }
}

export function getDroneFrequencies() {
  return appState.drone.semis.map(semi => {
    const midi = appState.tuning.doMidi + appState.drone.rootSemi + semi;
    return midiToFrequency(midi, appState.tuning.a4);
  });
}

export function getTargetMidi() {
  return appState.tuning.doMidi + appState.drone.rootSemi + appState.target.semi;
}

