/**
 * Application constants for music theory and configuration
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];

export const DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

// Solfege accidentals: sharps (Di, Ri, Fi, Si, Li) and flats (Ra, Me, Se, Le, Te)
export const SOLFEGE_ACCIDENTALS = {
  // Sharp accidentals
  'Di': { base: 'Do', semitone: 1, accidental: 'sharp' },
  'Ri': { base: 'Re', semitone: 3, accidental: 'sharp' },
  'Fi': { base: 'Fa', semitone: 6, accidental: 'sharp' },
  'Si': { base: 'Sol', semitone: 8, accidental: 'sharp' },
  'Li': { base: 'La', semitone: 10, accidental: 'sharp' },
  // Flat accidentals
  'Ra': { base: 'Re', semitone: 1, accidental: 'flat' },
  'Me': { base: 'Mi', semitone: 3, accidental: 'flat' },
  'Se': { base: 'Sol', semitone: 6, accidental: 'flat' },
  'Le': { base: 'La', semitone: 8, accidental: 'flat' },
  'Te': { base: 'Ti', semitone: 10, accidental: 'flat' }
};

// Map semitone (0-11) to solfege name and base shape
// For chromatic notes, use the closest diatonic note's shape with accidental
export const SEMITONE_TO_SOLFEGE = [
  { solfege: 'Do', base: 'Do', semitone: 0, accidental: null },
  { solfege: 'Di', base: 'Do', semitone: 1, accidental: 'sharp' }, // Do#
  { solfege: 'Re', base: 'Re', semitone: 2, accidental: null },
  { solfege: 'Ri', base: 'Re', semitone: 3, accidental: 'sharp' }, // Re# (or Me/Mi♭)
  { solfege: 'Mi', base: 'Mi', semitone: 4, accidental: null },
  { solfege: 'Fa', base: 'Fa', semitone: 5, accidental: null },
  { solfege: 'Fi', base: 'Fa', semitone: 6, accidental: 'sharp' }, // Fa# (or Se/Sol♭)
  { solfege: 'Sol', base: 'Sol', semitone: 7, accidental: null },
  { solfege: 'Si', base: 'Sol', semitone: 8, accidental: 'sharp' }, // Sol# (or Le/La♭)
  { solfege: 'La', base: 'La', semitone: 9, accidental: null },
  { solfege: 'Li', base: 'La', semitone: 10, accidental: 'sharp' }, // La# (or Te/Ti♭)
  { solfege: 'Ti', base: 'Ti', semitone: 11, accidental: null }
];

export const CHORDS = {
  'Major (1-3-5)': [0, 4, 7],
  'Minor (1-♭3-5)': [0, 3, 7],
  'Diminished (1-♭3-♭5)': [0, 3, 6],
  'Augmented (1-3-♯5)': [0, 4, 8],
  'Sus2 (1-2-5)': [0, 2, 7],
  'Sus4 (1-4-5)': [0, 5, 7],
  'Maj7 (1-3-5-7)': [0, 4, 7, 11],
  'Dom7 (1-3-5-♭7)': [0, 4, 7, 10],
  'Min7 (1-♭3-5-♭7)': [0, 3, 7, 10]
};

// Natural chord qualities for each scale degree in a major key
// Maps semitone offset from Do to the natural chord quality name
export const NATURAL_CHORD_QUALITIES = {
  0: 'Major (1-3-5)',      // I (Do) - Major
  2: 'Minor (1-♭3-5)',      // ii (Re) - Minor
  4: 'Minor (1-♭3-5)',      // iii (Mi) - Minor
  5: 'Major (1-3-5)',       // IV (Fa) - Major
  7: 'Major (1-3-5)',       // V (Sol) - Major
  9: 'Minor (1-♭3-5)',     // vi (La) - Minor
  11: 'Diminished (1-♭3-♭5)' // vii° (Ti) - Diminished
};

export const DIATONIC_ST = new Set([0, 2, 4, 5, 7, 9, 11, 12]);

export const PART_RANGES = {
  'Soprano': [60, 81],
  'Alto': [55, 74],
  'Tenor': [48, 69],
  'Bass': [40, 64]
};

// Interval training difficulty presets
export const INTERVAL_DIFFICULTY_PRESETS = {
  easy: {
    startingNote: 'do', // Always Do
    direction: 'up',
    minInterval: 2,
    maxInterval: 12,
    onScaleOnly: true,
    description: 'Ascending intervals from Do, diatonic only'
  },
  medium: {
    startingNote: 'do', // Always Do
    direction: 'either',
    minInterval: 1,
    maxInterval: 12,
    onScaleOnly: true,
    description: 'Intervals from Do (up or down), diatonic only (includes minor 2nd)'
  },
  hard: {
    startingNote: 'any',
    direction: 'either',
    minInterval: 2,
    maxInterval: 12,
    onScaleOnly: true,
    description: 'Intervals from any note, diatonic only'
  },
  extraHard: {
    startingNote: 'any',
    direction: 'either',
    minInterval: 1,
    maxInterval: 24,
    onScaleOnly: false,
    description: 'Any intervals, chromatic allowed'
  }
};

// Hidden cluster difficulty presets
export const CLUSTER_DIFFICULTY_PRESETS = {
  easy: {
    onScaleOnly: true,
    octaveRange: 1, // One octave from Do
    description: 'Diatonic notes within one octave'
  },
  medium: {
    onScaleOnly: true,
    octaveRange: 2, // Two octaves
    description: 'Diatonic notes across two octaves'
  },
  hard: {
    onScaleOnly: true,
    octaveRange: null, // Full range
    description: 'Diatonic notes across full range'
  },
  extraHard: {
    onScaleOnly: false,
    octaveRange: null, // Full range
    description: 'Chromatic notes across full range'
  }
};

