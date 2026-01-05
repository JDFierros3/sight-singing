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
  // Handle invalid inputs
  if (!Number.isFinite(noteMidi) || !Number.isFinite(tonic)) {
    return null;
  }
  
  const pitchClass = noteMidi % 12;
  const diatonicPCs = getDiatonicPitchClasses(tonic, mode);
  
  // If note is in the diatonic scale, no accidental needed
  if (diatonicPCs.includes(pitchClass)) {
    return null;
  }
  
  // Note is chromatic - determine if it's sharp, flat, or natural
  const keyInfo = getKeySignature(tonic, mode);
  const preference = keyInfo.preference;
  
  // Find the nearest diatonic notes
  const belowPC = findNearestDiatonicBelow(pitchClass, diatonicPCs);
  const abovePC = findNearestDiatonicAbove(pitchClass, diatonicPCs);
  
  const distBelow = (pitchClass - belowPC + 12) % 12;
  const distAbove = (abovePC - pitchClass + 12) % 12;
  
  // If exactly one semitone above a diatonic note, it's a sharp
  if (distBelow === 1) {
    return 'sharp';
  }
  
  // If exactly one semitone below a diatonic note, it's a flat
  if (distAbove === 1) {
    return 'flat';
  }
  
  // For chromatic notes that aren't adjacent to diatonic notes,
  // check if this is a natural version of a note in the key signature
  // For now, we'll use key preference for other chromatic notes
  // Natural signs are complex and require note letter analysis beyond pitch class
  return preference === 'sharp' ? 'sharp' : 'flat';
}

