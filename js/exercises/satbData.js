/**
 * Basic SATB exercise data
 * Simple exercises created manually for practice
 * Uses proper voice ranges and chord inversions with good voice leading
 */

import { appState } from '../state/appState.js';
import { PART_RANGES } from '../config/constants.js';

/**
 * Clamp a MIDI note to a voice range
 * @param {number} midi - MIDI note number
 * @param {string} part - Part name ('Soprano', 'Alto', 'Tenor', 'Bass')
 * @returns {number} Clamped MIDI note
 */
function clampToVoiceRange(midi, part) {
  const range = PART_RANGES[part];
  if (!range) return midi;
  return Math.max(range[0], Math.min(range[1], midi));
}

/**
 * Get chord tones with inversions to keep voices in range
 * Forces voices into their proper ranges regardless of key setting
 * @param {number} root - Root scale degree (0-11) relative to Do
 * @param {number} inversion - Inversion (0=root, 1=first, 2=second)
 * @returns {Object} Object with S, A, T, B MIDI notes
 */
function getChordVoices(root, inversion = 0) {
  const doMidi = appState.tuning.doMidi;
  
  // Calculate semitone offsets from Do for each chord tone
  const rootSemi = root;
  const thirdSemi = root + 4;
  const fifthSemi = root + 7;
  
  // Determine which chord tone goes to which voice based on inversion
  let sopranoSemi, altoSemi, tenorSemi, bassSemi;
  
  if (inversion === 0) {
    // Root position: S=5th, A=3rd, T=root, B=root (lower octave)
    sopranoSemi = fifthSemi;
    altoSemi = thirdSemi;
    tenorSemi = rootSemi;
    bassSemi = rootSemi;
  } else if (inversion === 1) {
    // First inversion: S=root, A=5th, T=3rd, B=3rd (lower octave)
    sopranoSemi = rootSemi;
    altoSemi = fifthSemi;
    tenorSemi = thirdSemi;
    bassSemi = thirdSemi;
  } else {
    // Second inversion: S=3rd, A=root, T=5th, B=5th (lower octave)
    sopranoSemi = thirdSemi;
    altoSemi = rootSemi;
    tenorSemi = fifthSemi;
    bassSemi = fifthSemi;
  }
  
  // Voice ranges: Soprano [60, 81], Alto [55, 74], Tenor [48, 69], Bass [40, 64]
  const sopranoRange = PART_RANGES['Soprano'];
  const altoRange = PART_RANGES['Alto'];
  const tenorRange = PART_RANGES['Tenor'];
  const bassRange = PART_RANGES['Bass'];
  
  // Calculate base MIDI for each semitone (in the same octave as Do)
  // Then find the octave that puts it in the proper range
  const sopranoBase = doMidi + sopranoSemi;
  const altoBase = doMidi + altoSemi;
  const tenorBase = doMidi + tenorSemi;
  const bassBase = doMidi + bassSemi;
  
  // Find the octave offset needed to get each voice into its range
  // We want to get as close to the middle of the range as possible
  function findOctaveForRange(baseMidi, range) {
    const target = (range[0] + range[1]) / 2;
    const offset = target - baseMidi;
    const octaveOffset = Math.round(offset / 12) * 12;
    const candidate = baseMidi + octaveOffset;
    
    // If candidate is out of range, adjust by one octave
    if (candidate < range[0]) {
      return candidate + 12;
    } else if (candidate > range[1]) {
      return candidate - 12;
    }
    return candidate;
  }
  
  let s = findOctaveForRange(sopranoBase, sopranoRange);
  let a = findOctaveForRange(altoBase, altoRange);
  let t = findOctaveForRange(tenorBase, tenorRange);
  let b = findOctaveForRange(bassBase, bassRange);
  
  // Clamp to voice ranges to ensure we're always in range (safety check)
  return {
    S: clampToVoiceRange(s, 'Soprano'),
    A: clampToVoiceRange(a, 'Alto'),
    T: clampToVoiceRange(t, 'Tenor'),
    B: clampToVoiceRange(b, 'Bass')
  };
}

/**
 * Manual exercises removed - only MIDI exercises are used now
 * All exercises come from MIDI files loaded via loadMidiExercise()
 */

/**
 * Create exercise from parsed MIDI data
 * @param {Object} midiExercise - Exercise object from parseMidiToExercise
 * @returns {Object} Exercise in standard format
 */
export function createExerciseFromMidi(midiExercise) {
  // The midiExercise is already in the correct format
  // Just ensure all parts are arrays and preserve MIDI-specific properties
  const exercise = {
    label: midiExercise.label,
    duration: midiExercise.duration,
    parts: {
      S: midiExercise.parts.S || [],
      A: midiExercise.parts.A || [],
      T: midiExercise.parts.T || [],
      B: midiExercise.parts.B || []
    }
  };
  
  // Preserve MIDI-specific properties for key detection
  if (midiExercise.midiKeyMidi !== undefined) {
    exercise.midiKeyMidi = midiExercise.midiKeyMidi;
  }
  if (midiExercise.isMidiExercise !== undefined) {
    exercise.isMidiExercise = midiExercise.isMidiExercise;
  } else {
    exercise.isMidiExercise = true; // Default to true if not set
  }
  
  return exercise;
}

/**
 * Get all available SATB exercises
 * Manual exercises removed - only MIDI exercises are used now
 */
export function getAllSATBExercises() {
  return []; // Manual exercises removed - only MIDI exercises are used
}
