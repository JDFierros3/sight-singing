/**
 * Accidental symbol drawing utilities
 * Handles drawing of sharp, flat, natural symbols and key signatures
 */

import { getKeySignature, getDiatonicPitchClasses } from '../utils/keySignature.js';

let bravuraLoaded = false;
let bravuraLoadPromise = null;

export function ensureBravuraLoaded() {
  if (bravuraLoaded) return Promise.resolve(true);
  if (bravuraLoadPromise) return bravuraLoadPromise;
  if (!('fonts' in document) || !document.fonts) {
    // Best effort; canvas will fall back
    bravuraLoaded = true;
    return Promise.resolve(true);
  }
  bravuraLoadPromise = document.fonts
    .load('16px "Bravura"')
    .then(() => {
      bravuraLoaded = true;
      return true;
    })
    .catch(() => false);
  return bravuraLoadPromise;
}

function setAccidentalFont(ctx, size) {
  ctx.fillStyle = '#9aa4b2';
  ctx.font = `${Math.round(size)}px "Bravura", "Arial Unicode MS", "Segoe UI Symbol", serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

/**
 * Draw a sharp symbol (♯)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (left edge of symbol)
 * @param {number} y - Y position (vertical center of symbol)
 * @param {number} size - Height of the symbol
 */
export function drawSharp(ctx, x, y, size = 10) {
  ctx.save();
  setAccidentalFont(ctx, size * 1.1);
  ctx.fillText('♯', x, y);
  
  ctx.restore();
}

/**
 * Draw a flat symbol (♭)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (left edge of symbol)
 * @param {number} y - Y position (vertical center of symbol)
 * @param {number} size - Height of the symbol
 */
export function drawFlat(ctx, x, y, size = 10) {
  ctx.save();
  setAccidentalFont(ctx, size * 1.1);
  ctx.fillText('♭', x, y);
  
  ctx.restore();
}

/**
 * Draw a natural symbol (♮)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (left edge of symbol)
 * @param {number} y - Y position (vertical center of symbol)
 * @param {number} size - Height of the symbol
 */
export function drawNatural(ctx, x, y, size = 10) {
  ctx.save();
  setAccidentalFont(ctx, size * 1.1);
  ctx.fillText('♮', x, y);
  
  ctx.restore();
}

/**
 * Draw key signature at the start of the staff
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} tonic - Key tonic pitch class (0-11)
 * @param {string} mode - 'major' or 'minor'
 * @param {Object} dimensions - Staff dimensions { trebleStaffTop, bassStaffTop, lineSpacing }
 */
export function drawKeySignature(ctx, tonic, mode, dimensions) {
  if (!Number.isFinite(tonic)) return;
  
  const keyInfo = getKeySignature(tonic, mode);
  const marginX = Number.isFinite(dimensions.marginX) ? dimensions.marginX : 16;
  const startX = marginX + 44; // after clef glyph
  const spacing = 12; // horizontal spacing between accidentals
  const lineSpacing = dimensions.lineSpacing;
  const trebleStaffTop = dimensions.trebleStaffTop;
  const bassStaffTop = dimensions.bassStaffTop;

  // Standard engraving positions: use the ORDER index (1st sharp, 2nd sharp, ...)
  // Offsets are measured in staff "steps" where 0 = top line, 0.5 = top space, 1 = 2nd line, ... 4 = bottom line.
  // Treble sharps: F#, C#, G#, D#, A#, E#, B#
  const TREBLE_SHARP_OFFSETS = [0, 1.5, 0.5, 2, 1, 2.5, 1.5];
  // Treble flats: Bb, Eb, Ab, Db, Gb, Cb, Fb
  const TREBLE_FLAT_OFFSETS = [2, 0.5, 2.5, 1, 3, 1.5, 3.5];

  // Bass sharps: F#, C#, G#, D#, A#, E#, B#
  const BASS_SHARP_OFFSETS = [1, 2.5, 1.5, 3, 2, 3.5, 2.5];
  // Bass flats: Bb, Eb, Ab, Db, Gb, Cb, Fb
  const BASS_FLAT_OFFSETS = [3, 1.5, 3.5, 2, 4, 2.5, 1];
  
  ctx.save();
  
  // Draw sharps on both staves
  if (keyInfo.sharps.length > 0) {
    keyInfo.sharps.forEach((pitchClass, index) => {
      const x = startX + index * spacing;
      
      // Draw on treble staff
      const trebleOffset = TREBLE_SHARP_OFFSETS[index] ?? 2;
      const trebleY = trebleStaffTop + lineSpacing * trebleOffset;
      drawSharp(ctx, x, trebleY, 18);
      
      // Draw on bass staff
      const bassOffset = BASS_SHARP_OFFSETS[index] ?? 2;
      const bassY = bassStaffTop + lineSpacing * bassOffset;
      drawSharp(ctx, x, bassY, 18);
    });
  }
  
  // Draw flats on both staves
  if (keyInfo.flats.length > 0) {
    keyInfo.flats.forEach((pitchClass, index) => {
      const x = startX + index * spacing;
      
      // Draw on treble staff
      const trebleOffset = TREBLE_FLAT_OFFSETS[index] ?? 2;
      const trebleY = trebleStaffTop + lineSpacing * trebleOffset;
      drawFlat(ctx, x, trebleY, 18);
      
      // Draw on bass staff
      const bassOffset = BASS_FLAT_OFFSETS[index] ?? 2;
      const bassY = bassStaffTop + lineSpacing * bassOffset;
      drawFlat(ctx, x, bassY, 18);
    });
  }
  
  ctx.restore();
}

