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

  // Staff rendering: draw our own shapes (NOT Unicode) so the center of each shape
  // is exactly the line/space center at (x,y) across all platforms.
  drawStaffShapeNotehead(ctx, baseShape, x, y, size);
  
  ctx.restore();
}

function drawStaffShapeNotehead(ctx, baseShape, x, y, size) {
  // All shapes are drawn centered at (x,y).
  const s = size; // visual "radius" unit

  switch (baseShape) {
    case 'Do': {
      // Up-pointing triangle
      const w = s * 1.5;
      const h = s * 1.35;
      ctx.beginPath();
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x - w / 2, y + h / 2);
      ctx.lineTo(x + w / 2, y + h / 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'Re': {
      // Re: half circle (filled semicircle), per user request.
      // Make it a half-oval (taller than wide) rather than a perfect half-circle.
      const rx = s * 0.95;
      const ry = s * 1.08;
      // Optical centering for the half-oval: nudge slightly so it sits well on line/space.
      const cy = y + s * 0.28;
      fillSemiEllipseUp(ctx, x, cy, rx, ry);
      break;
    }
    case 'Mi': {
      // Diamond
      // Slightly larger (user feedback)
      const w = s * 1.55;
      const h = s * 1.55;
      ctx.beginPath();
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x, y + h / 2);
      ctx.lineTo(x - w / 2, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'Fa': {
      // Fa: right-angled triangle "flag" (not isosceles).
      // Use a right triangle with a clear right angle and a single diagonal hypotenuse.
      const w = s * 1.65;
      const h = s * 1.45;
      // Place vertices so the triangle centroid is at (x,y).
      // Right angle at (-w/3, +h/3), other points at (-w/3, -2h/3) and (+2w/3, +h/3).
      const p0 = { x: x - w / 3, y: y + h / 3 };      // right angle corner
      const p1 = { x: x - w / 3, y: y - (2 * h) / 3 }; // vertical leg
      const p2 = { x: x + (2 * w) / 3, y: y + h / 3 }; // horizontal leg

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'Sol': {
      // Oval notehead (filled) with a slight tilt like traditional noteheads
      const rx = s * 0.98;
      const ry = s * 0.66;
      const tilt = -0.35; // radians (~ -20°)
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'La': {
      // Rectangle notehead (filled)
      const w = s * 2.0;
      const h = s * 0.88;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      break;
    }
    case 'Ti': {
      // Ti: "ice cream cone" — a small cap (top segment of a circle) on a down triangle.
      // User request: cap should split higher than a semicircle (more like the top ~30% of a circle).
      // We draw as a single filled silhouette and ensure the cap width matches the cone width at the join.

      const coneW = s * 1.95;
      const coneH = s * 0.86;

      // Cap arc span (radians). Smaller span => "higher split" (shallower cap).
      // Tuned to look like a small cap rather than a half circle.
      const capSpan = Math.PI * 0.62; // ~112°
      const halfSpan = capSpan / 2;
      const capRadius = coneW / (2 * Math.sin(halfSpan)); // chord length at split == coneW

      // Join line where the cap meets the cone.
      const joinY = y - s * 0.02;

      // Center the cap so its chord (between arc endpoints) sits exactly at joinY.
      const midAngle = -Math.PI / 2; // top
      const a0 = midAngle - halfSpan;
      const a1 = midAngle + halfSpan;
      const chordSin = Math.sin(a1); // (same magnitude as a0), negative value
      const capCenterY = joinY - capRadius * chordSin;

      const tipY = joinY + coneH;

      ctx.beginPath();
      // Cap arc (top segment)
      ctx.arc(x, capCenterY, capRadius, a0, a1, false);
      // Down the right edge to the cone (endpoint is already at x+coneW/2, joinY by construction)
      ctx.lineTo(x + coneW / 2, joinY);
      // Cone tip
      ctx.lineTo(x, tipY);
      // Back up left edge
      ctx.lineTo(x - coneW / 2, joinY);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      // Fallback: oval
      const rx = s * 1.0;
      const ry = s * 0.75;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function fillSemicircleUp(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false); // upper arc
  ctx.lineTo(cx + r, cy);               // diameter right endpoint
  ctx.lineTo(cx - r, cy);               // diameter left endpoint
  ctx.closePath();
  ctx.fill();
}

function fillSemiEllipseUp(ctx, cx, cy, rx, ry) {
  // Upper half of an ellipse with a flat bottom chord.
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, false); // upper arc (left -> right)
  ctx.lineTo(cx + rx, cy);                           // bottom chord
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.fill();
}

function roundedPolygonPath(ctx, points, r) {
  // Draw a rounded-corner polygon path using arcTo.
  // points: [{x,y}, ...] in order.
  if (!points || points.length < 3) return;

  const clampR = Math.max(0, r);
  const pts = points.slice();
  const n = pts.length;

  ctx.beginPath();

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];

    if (i === 0) {
      ctx.moveTo(curr.x, curr.y);
    }

    ctx.arcTo(curr.x, curr.y, next.x, next.y, clampR);
  }

  ctx.closePath();
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

