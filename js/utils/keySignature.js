/**
 * Key signature utilities for determining accidentals
 * Supports both major and minor keys
 */

// Major scale intervals (W-W-H-W-W-W-H) from tonic
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];

// Natural minor scale intervals (W-H-W-W-H-W-W) from tonic
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

/**
 * Get the diatonic pitch classes for a given key
 * @param {number} tonic - Pitch class (0-11) where 0=C
 * @param {string} mode - 'major' or 'minor'
 * @returns {number[]} Array of 7 pitch classes in the scale
 */
export function getDiatonicPitchClasses(tonic, mode) {
  const steps = mode === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
  return steps.map(step => (tonic + step) % 12);
}

/**
 * Determine if a key uses sharps or flats based on circle of fifths
 * @param {number} tonic - Pitch class (0-11) where 0=C
 * @param {string} mode - 'major' or 'minor'
 * @returns {boolean} true if key uses sharps, false if flats
 */
export function isSharpKey(tonic, mode) {
  if (mode === 'minor') {
    // Minor sharp keys: E, B, F#, C#, G#, D#, A#
    const sharpMinorKeys = [4, 11, 6, 1, 8, 3, 10];
    return sharpMinorKeys.includes(tonic);
  } else {
    // Major sharp keys: G, D, A, E, B, F#, C#
    const sharpMajorKeys = [7, 2, 9, 4, 11, 6, 1];
    return sharpMajorKeys.includes(tonic);
  }
}

/**
 * Get the key signature (which notes are sharp/flat)
 * @param {number} tonic - Pitch class (0-11) where 0=C
 * @param {string} mode - 'major' or 'minor'
 * @returns {Object} { sharps: number[], flats: number[], preference: 'sharp'|'flat' }
 */
export function getKeySignature(tonic, mode) {
  const preference = isSharpKey(tonic, mode) ? 'sharp' : 'flat';
  
  // Circle of fifths order for sharps: F#, C#, G#, D#, A#, E#, B#
  const sharpOrder = [6, 1, 8, 3, 10, 5, 0];
  
  // Circle of fifths order for flats: Bb, Eb, Ab, Db, Gb, Cb, Fb
  const flatOrder = [10, 3, 8, 1, 6, 11, 4];
  
  // Calculate number of sharps or flats based on key
  let numAccidentals = 0;
  
  if (mode === 'minor') {
    // For minor keys, calculate relative major and adjust
    const relativeMajor = (tonic + 3) % 12;
    numAccidentals = getNumAccidentalsForMajor(relativeMajor);
  } else {
    numAccidentals = getNumAccidentalsForMajor(tonic);
  }
  
  if (preference === 'sharp') {
    const sharps = sharpOrder.slice(0, numAccidentals);
    return { sharps, flats: [], preference: 'sharp' };
  } else {
    const flats = flatOrder.slice(0, Math.abs(numAccidentals));
    return { sharps: [], flats, preference: 'flat' };
  }
}

// --- Key-aware spelling helpers (shared by rendering + accidental detection) ---
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SOLFEGE_DEGREES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];

function buildLetterAccidentals(keyInfo) {
  const SHARP_LETTERS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const FLAT_LETTERS = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  const letterAcc = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if ((keyInfo.sharps?.length || 0) > 0) {
    for (let i = 0; i < keyInfo.sharps.length; i++) letterAcc[SHARP_LETTERS[i]] = 1;
  } else if ((keyInfo.flats?.length || 0) > 0) {
    for (let i = 0; i < keyInfo.flats.length; i++) letterAcc[FLAT_LETTERS[i]] = -1;
  }
  return letterAcc;
}

function diatonicPcByLetter(letterAcc) {
  const out = {};
  LETTERS.forEach(L => {
    out[L] = (NATURAL_PC[L] + letterAcc[L] + 12) % 12;
  });
  return out;
}

function findTonicLetter(tonicPc, diatonicMap) {
  const pc = ((tonicPc % 12) + 12) % 12;
  for (const L of LETTERS) {
    if (diatonicMap[L] === pc) return L;
  }
  // fallback; shouldn't happen for normal keys
  return 'C';
}

function inferLetterForPitchClass(pc, ctx) {
  const { diatonicMap, letterAcc, preference } = ctx;

  // 1) Exact diatonic match
  for (const L of LETTERS) {
    if (diatonicMap[L] === pc) return L;
  }

  // 2) If this pitch is the NATURAL version of a key-signature-altered letter,
  // keep that letter (e.g., G major: F♮ stays on F with ♮, not E#).
  for (const L of LETTERS) {
    if (letterAcc[L] !== 0 && NATURAL_PC[L] === pc) return L;
  }

  // 3) Otherwise choose sharp/flat spelling by key preference
  const sharpCandidates = [];
  const flatCandidates = [];
  for (const L of LETTERS) {
    const base = diatonicMap[L];
    if (((base + 1) % 12) === pc) sharpCandidates.push(L);
    if (((base + 11) % 12) === pc) flatCandidates.push(L);
  }

  if (preference === 'sharp' && sharpCandidates.length) return sharpCandidates[0];
  if (preference === 'flat' && flatCandidates.length) return flatCandidates[0];
  return sharpCandidates[0] || flatCandidates[0] || 'C';
}

export function spellMidiInKey(noteMidi, tonicPc, mode = 'major') {
  if (!Number.isFinite(noteMidi) || !Number.isFinite(tonicPc)) return null;

  const pc = ((Math.round(noteMidi) % 12) + 12) % 12;
  const keyInfo = getKeySignature(tonicPc, mode);
  const letterAcc = buildLetterAccidentals(keyInfo);
  const diatonicMap = diatonicPcByLetter(letterAcc);
  const tonicLetter = findTonicLetter(tonicPc, diatonicMap);
  const ctx = { diatonicMap, letterAcc, preference: keyInfo.preference };

  const letter = inferLetterForPitchClass(pc, ctx);
  const basePc = diatonicMap[letter];
  const natPc = NATURAL_PC[letter];

  let accidental = null;
  // Natural note in a key-signature-altered letter needs a natural sign (e.g., F natural in G major).
  if (pc === natPc && letterAcc[letter] !== 0) {
    accidental = 'natural';
  } else if (pc === basePc) {
    accidental = null;
  } else if (((basePc + 1) % 12) === pc) {
    accidental = 'sharp';
  } else if (((basePc + 11) % 12) === pc) {
    accidental = 'flat';
  } else {
    accidental = keyInfo.preference === 'sharp' ? 'sharp' : 'flat';
  }

  const tonicIdx = LETTERS.indexOf(tonicLetter);
  const noteIdx = LETTERS.indexOf(letter);
  const degreeIndex = ((noteIdx - tonicIdx) + 7) % 7;
  const solfege = SOLFEGE_DEGREES[degreeIndex] || null;

  return { letter, pitchClass: pc, degreeIndex, solfege, accidental };
}

/**
 * Get number of sharps (positive) or flats (negative) for a major key
 * @param {number} tonic - Pitch class (0-11)
 * @returns {number} Number of sharps (positive) or flats (negative)
 */
function getNumAccidentalsForMajor(tonic) {
  const circleOfFifths = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
  const index = circleOfFifths.indexOf(tonic);
  
  if (index === -1) return 0;
  
  // 0=C (0), 1=G (1#), 2=D (2#), ... 7=C# (7#)
  // 11=F (1b), 10=Bb (2b), ... 8=Cb (7b)
  if (index <= 7) {
    return index; // 0 to 7 sharps
  } else {
    return -(12 - index); // 1 to 4 flats (negative)
  }
}

/**
 * Find the nearest diatonic pitch class below the given pitch class
 * @param {number} pitchClass - The chromatic pitch class
 * @param {number[]} diatonicPCs - Array of diatonic pitch classes
 * @returns {number} Nearest diatonic pitch class below
 */
function findNearestDiatonicBelow(pitchClass, diatonicPCs) {
  // Sort diatonic PCs
  const sorted = [...diatonicPCs].sort((a, b) => a - b);
  
  // Find the largest diatonic PC that is less than pitchClass
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i] < pitchClass) {
      return sorted[i];
    }
  }
  
  // Wrap around: return the highest diatonic PC (shifted down by 12)
  return sorted[sorted.length - 1];
}

/**
 * Find the nearest diatonic pitch class above the given pitch class
 * @param {number} pitchClass - The chromatic pitch class
 * @param {number[]} diatonicPCs - Array of diatonic pitch classes
 * @returns {number} Nearest diatonic pitch class above
 */
function findNearestDiatonicAbove(pitchClass, diatonicPCs) {
  // Sort diatonic PCs
  const sorted = [...diatonicPCs].sort((a, b) => a - b);
  
  // Find the smallest diatonic PC that is greater than pitchClass
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] > pitchClass) {
      return sorted[i];
    }
  }
  
  // Wrap around: return the lowest diatonic PC (shifted up by 12)
  return sorted[0];
}

/**
 * Determine what accidental (if any) a note needs
 * @param {number} noteMidi - MIDI note number
 * @param {number} tonic - Key tonic pitch class (0-11)
 * @param {string} mode - 'major' or 'minor'
 * @returns {string|null} 'sharp', 'flat', 'natural', or null
 */
export function getAccidentalForNote(noteMidi, tonic, mode = 'major') {
  const spelled = spellMidiInKey(noteMidi, tonic, mode);
  return spelled ? spelled.accidental : null;
}

