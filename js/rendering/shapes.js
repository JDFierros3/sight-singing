/**
 * Solfege shape rendering utilities
 */

import { SEMITONE_TO_SOLFEGE } from '../config/constants.js';

const SHAPE_COLORS = {
  Do: '#8bd3ff',
  Re: '#a7f3d0',
  Mi: '#fde68a',
  Fa: '#fca5a5',
  Sol: '#c4b5fd',
  La: '#f9a8d4',
  Ti: '#fdba74'
};

export function getShapeColor(solfege) {
  // For accidentals, use the base shape's color
  const baseShape = getBaseShapeForSolfege(solfege);
  return SHAPE_COLORS[baseShape] || '#9ab';
}

function getBaseShapeForSolfege(solfege) {
  // Find the base shape for this solfege (handles accidentals)
  const entry = SEMITONE_TO_SOLFEGE.find(e => e.solfege === solfege);
  return entry ? entry.base : solfege;
}

export function drawShapeBadge(ctx, x, y, solfege) {
  ctx.save();
  
  const solfegeInfo = getSolfegeInfo(solfege);
  const baseShape = solfegeInfo ? solfegeInfo.base : solfege;
  const accidental = solfegeInfo ? solfegeInfo.accidental : null;
  
  drawBadgeBackground(ctx, x, y);
  drawShapeForSolfege(ctx, x, y, baseShape);
  drawSolfegeLabel(ctx, x, y, solfege, accidental);
  
  ctx.restore();
}

function getSolfegeInfo(solfege) {
  return SEMITONE_TO_SOLFEGE.find(e => e.solfege === solfege) || null;
}

function drawBadgeBackground(ctx, x, y) {
  ctx.strokeStyle = '#2a3051';
  ctx.fillStyle = '#12182a';
  drawRoundedRect(ctx, x - 6, y - 6, 48, 16, 8, true, true);
}

function drawShapeForSolfege(ctx, x, y, solfege) {
  const color = getShapeColor(solfege);
  ctx.fillStyle = color;
  
  switch (solfege) {
    case 'Do':
      drawUpTriangle(ctx, x, y);
      break;
    case 'Re':
      drawDiamond(ctx, x, y);
      break;
    case 'Mi':
      drawRightTriangle(ctx, x, y);
      break;
    case 'Fa':
      drawDownTriangle(ctx, x, y);
      break;
    case 'Sol':
      drawCircle(ctx, x, y);
      break;
    case 'La':
      drawSquare(ctx, x, y);
      break;
    case 'Ti':
      drawLeftTriangle(ctx, x, y);
      break;
  }
}

function drawSolfegeLabel(ctx, x, y, solfege, accidental) {
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'left';
  
  // Solfege names like "Ri", "Fi", "Di" already indicate the accidental
  // No need to add another symbol
  ctx.fillText(solfege, x + 20, y + 6);
}

// Do: Upward-pointing triangle
function drawUpTriangle(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 2);
  ctx.lineTo(x + 2, y + 6);
  ctx.lineTo(x + 10, y + 6);
  ctx.closePath();
  ctx.fill();
}

// Re: Diamond (rotated square)
function drawDiamond(ctx, x, y) {
  ctx.save();
  ctx.translate(x + 6, y + 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

// Mi: Rightward-pointing triangle
function drawRightTriangle(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 2);
  ctx.lineTo(x + 2, y - 2);
  ctx.lineTo(x + 2, y + 6);
  ctx.closePath();
  ctx.fill();
}

// Fa: Downward-pointing triangle
function drawDownTriangle(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 6);
  ctx.lineTo(x + 2, y - 2);
  ctx.lineTo(x + 10, y - 2);
  ctx.closePath();
  ctx.fill();
}

// Sol: Circle/oval
function drawCircle(ctx, x, y) {
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 2, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

// La: Square
function drawSquare(ctx, x, y) {
  ctx.fillRect(x + 2, y - 2, 8, 8);
}

// Ti: Leftward-pointing triangle
function drawLeftTriangle(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 2);
  ctx.lineTo(x + 10, y - 2);
  ctx.lineTo(x + 10, y + 6);
  ctx.closePath();
  ctx.fill();
}

export function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

// Draw a note head with shape-note symbol on the staff using Unicode symbols
export function drawNoteHeadWithShape(ctx, x, y, solfege, size = 7) {
  if (!ctx || !solfege) return;
  
  const solfegeInfo = getSolfegeInfo(solfege);
  const baseShape = solfegeInfo ? solfegeInfo.base : solfege;
  const color = getShapeColor(baseShape);
  
  ctx.save();
  ctx.fillStyle = color;

  // Staff noteheads must be consistent in size and aspect ratio.
  // Some Unicode glyphs (notably La "▬") stretch unpredictably on some platforms,
  // so we draw Mi and La as true geometric shapes on the staff.
  if (baseShape === 'Mi' || baseShape === 'La') {
    drawGeometricShape(ctx, baseShape, x, y, size);
    ctx.restore();
    return;
  }

  // Primary: Unicode symbol (matches requested shapes where supported).
  // Fallback: geometric shape drawing (works on any platform/font).
  const symbol = getShapeUnicodeSymbol(baseShape);
  const fontSize = size * 3.5;
  ctx.font = `${fontSize}px "Times New Roman", serif`;
  ctx.textAlign = 'center';

  // Try drawing the symbol; if it looks missing, fall back to geometric shapes.
  // (Canvas can’t reliably detect missing glyphs, so we use a heuristic: very tiny measured width)
  const measured = ctx.measureText(symbol);
  if (!measured || measured.width < 1) {
    drawGeometricShape(ctx, baseShape, x, y, size);
  } else {
    // Center using the actual glyph bounding box when available (more accurate than textBaseline='middle').
    if (
      Number.isFinite(measured.actualBoundingBoxAscent) &&
      Number.isFinite(measured.actualBoundingBoxDescent)
    ) {
      ctx.textBaseline = 'alphabetic';
      const yBaseline = y + (measured.actualBoundingBoxAscent - measured.actualBoundingBoxDescent) / 2;
      ctx.fillText(symbol, x, yBaseline);
    } else {
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, x, y);
    }
  }
  
  ctx.restore();
}

function drawGeometricShape(ctx, baseShape, x, y, size) {
  // Re-use the badge shape primitives but centered on (x,y) with a size scale.
  // These are simple and always render, even if Unicode musical glyphs don’t.
  const s = size * 1.2;
  ctx.save();
  ctx.translate(x - s, y - s);

  switch (baseShape) {
    case 'Do':
      // Up triangle
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(0, s * 2);
      ctx.lineTo(s * 2, s * 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'Re':
      // Diamond (rotated square)
      ctx.save();
      ctx.translate(s, s);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s * 0.9, -s * 0.9, s * 1.8, s * 1.8);
      ctx.restore();
      break;
    case 'Mi':
      // Diamond (shape-note Mi) - keep small and consistent (user feedback)
      ctx.save();
      ctx.translate(s, s);
      ctx.rotate(Math.PI / 4);
      // Much smaller than before (about 1/4 area vs previous)
      ctx.fillRect(-s * 0.45, -s * 0.45, s * 0.9, s * 0.9);
      ctx.restore();
      break;
    case 'Fa':
      // Right triangle
      ctx.beginPath();
      ctx.moveTo(s * 2, s);
      ctx.lineTo(0, 0);
      ctx.lineTo(0, s * 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'Sol':
      // Circle
      ctx.beginPath();
      ctx.ellipse(s, s, s, s * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'La':
      // Rectangle (shape-note La)
      // Keep it truly notehead-sized and strictly centered on (x,y)
      // so it reads clearly as a line/space notehead (not a long bar).
      {
        const w = s * 1.3;
        const h = s * 0.65;
        ctx.fillRect(s - w / 2, s - h / 2, w, h);
      }
      break;
    case 'Ti':
      // Down triangle
      ctx.beginPath();
      ctx.moveTo(s, s * 2);
      ctx.lineTo(0, 0);
      ctx.lineTo(s * 2, 0);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(s, s, s, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.restore();
}

export function getShapeUnicodeSymbol(baseShape) {
  // Unicode symbols for shape notes
  // Using black versions for better visibility
  switch (baseShape) {
    case 'Do':
      return '▴'; // BLACK UP-POINTING SMALL TRIANGLE
    case 'Re':
      return '𝅓'; // MUSICAL SYMBOL MOON NOTEHEAD BLACK
    case 'Mi':
      return '◆'; // BLACK DIAMOND
    case 'Fa':
      return '𝅍'; // MUSICAL SYMBOL TRIANGLE NOTEHEAD RIGHT BLACK
    case 'Sol':
      return '𝅘'; // MUSICAL SYMBOL NOTEHEAD BLACK
    case 'La':
      return '▬'; // BLACK RECTANGLE
    case 'Ti':
      return '𝅕'; // MUSICAL SYMBOL TRIANGLE-ROUND NOTEHEAD DOWN BLACK
    default:
      return '●'; // Fallback circle
  }
}

// Note: Old path-based drawing functions removed - now using Unicode symbols

