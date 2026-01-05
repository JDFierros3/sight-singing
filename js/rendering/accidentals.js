/**
 * Accidental symbol drawing utilities
 * Handles drawing of sharp, flat, natural symbols and key signatures
 */

import { getKeySignature, getDiatonicPitchClasses } from '../utils/keySignature.js';

/**
 * Draw a sharp symbol (♯)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (left edge of symbol)
 * @param {number} y - Y position (vertical center of symbol)
 * @param {number} size - Height of the symbol
 */
export function drawSharp(ctx, x, y, size = 10) {
  ctx.save();
  ctx.fillStyle = '#9aa4b2';
  ctx.font = `bold ${size}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // Use Unicode musical sharp symbol - y coordinate is the staff line
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
  ctx.fillStyle = '#9aa4b2';
  ctx.font = `bold ${size}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // Use Unicode musical flat symbol - y coordinate is the staff line
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
  ctx.fillStyle = '#9aa4b2';
  ctx.font = `bold ${size}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // Use Unicode musical natural symbol - y coordinate is the staff line
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
  const startX = 50; // Position after where clef would be
  const spacing = 12; // Horizontal spacing between accidentals (increased for larger symbols)
  const lineSpacing = dimensions.lineSpacing;
  const trebleStaffTop = dimensions.trebleStaffTop;
  const bassStaffTop = dimensions.bassStaffTop;
  
  // Helper to get Y position for a pitch class on the treble staff for SHARPS
  const getTrebleSharpY = (pitchClass) => {
    // Treble staff: line 0=top(F5), 1=D5, 2=B4, 3=G4, 4=E4
    // Sharps: F# C# G# D# A# E# B#
    const sharpOffsets = {
      6: 0,      // F# - top line (F5)
      1: 2.5,    // C# - space 3 (A4-B4)
      8: -0.5,   // G# - space above staff
      3: 1,      // D# - line 4 (D5)
      10: 3.5,   // A# - bottom space (F4-G4)
      5: 1.5,    // E# - space 4 (C5-D5)
      0: 2,      // B# - middle line (B4)
    };
    const offset = sharpOffsets[pitchClass] ?? 2;
    return trebleStaffTop + lineSpacing * offset;
  };
  
  // Helper to get Y position for a pitch class on the treble staff for FLATS
  const getTrebleFlatY = (pitchClass) => {
    // Flats: Bb Eb Ab Db Gb Cb Fb
    const flatOffsets = {
      10: 2,     // Bb - middle line (B4)
      3: 1.5,    // Eb - space 4 (E4-F4)
      8: 3.5,    // Ab - space 1 (F4-G4)
      1: 1,      // Db - line 4 (D5)
      6: 4,      // Gb - bottom line (E4)
      11: 2.5,   // Cb - space 3 (A4-B4)
      4: 0,      // Fb - top line (F5)
    };
    const offset = flatOffsets[pitchClass] ?? 2;
    return trebleStaffTop + lineSpacing * offset;
  };
  
  // Helper to get Y position for a pitch class on the bass staff for SHARPS
  const getBassSharpY = (pitchClass) => {
    // Bass staff: line 0=top(A3), 1=F3, 2=D3, 3=B2, 4=G2
    // Sharps: F# C# G# D# A# E# B#
    const sharpOffsets = {
      6: 1,      // F# - line 4 / 2nd from top (F3)
      1: -0.5,   // C# - space above staff
      8: 0,      // G# - top line (A3)
      3: 2.5,    // D# - space 3 (C3-D3)
      10: 3.5,   // A# - bottom space (A2-B2)
      5: 2,      // E# - middle line (D3)
      0: 1.5,    // B# - space 4 (E3-F3)
    };
    const offset = sharpOffsets[pitchClass] ?? 2;
    return bassStaffTop + lineSpacing * offset;
  };
  
  // Helper to get Y position for a pitch class on the bass staff for FLATS
  const getBassFlatY = (pitchClass) => {
    // Flats: Bb Eb Ab Db Gb Cb Fb
    const flatOffsets = {
      10: 3,     // Bb - line 2 / 2nd from bottom (B2)
      3: 2.5,    // Eb - space 3 (C3-D3)
      8: 3.5,    // Ab - bottom space (A2-B2)
      1: 2,      // Db - middle line (D3)
      6: 4,      // Gb - bottom line (G2)
      11: 1.5,   // Cb - space 4 (E3-F3)
      4: 1,      // Fb - line 4 / 2nd from top (F3)
    };
    const offset = flatOffsets[pitchClass] ?? 2;
    return bassStaffTop + lineSpacing * offset;
  };
  
  ctx.save();
  
  // Draw sharps on both staves
  if (keyInfo.sharps.length > 0) {
    keyInfo.sharps.forEach((pitchClass, index) => {
      const x = startX + index * spacing;
      
      // Draw on treble staff
      const trebleY = getTrebleSharpY(pitchClass);
      drawSharp(ctx, x, trebleY, 18);
      
      // Draw on bass staff
      const bassY = getBassSharpY(pitchClass);
      drawSharp(ctx, x, bassY, 18);
    });
  }
  
  // Draw flats on both staves
  if (keyInfo.flats.length > 0) {
    keyInfo.flats.forEach((pitchClass, index) => {
      const x = startX + index * spacing;
      
      // Draw on treble staff
      const trebleY = getTrebleFlatY(pitchClass);
      drawFlat(ctx, x, trebleY, 18);
      
      // Draw on bass staff
      const bassY = getBassFlatY(pitchClass);
      drawFlat(ctx, x, bassY, 18);
    });
  }
  
  ctx.restore();
}

