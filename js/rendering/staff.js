/**
 * Staff canvas rendering broken into small functions
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { appState, getDoMidiForDisplay } from '../state/appState.js';
import { buildScalePitches } from '../utils/musicTheory.js';
import { frequencyToMidi, midiToFrequency, centsBetween } from '../utils/audioMath.js';
import { pitchState } from '../pitch/detection.js';
import { drawShapeBadge, drawRoundedRect, drawNoteHeadWithShape } from './shapes.js';
import { getSolfegeForMidi } from '../utils/musicTheory.js';
import { getDroneFrequencies } from '../state/appState.js';
import { drawSharp, drawFlat, drawNatural, drawKeySignature, ensureBravuraLoaded } from './accidentals.js';
import { spellMidiInKey, getKeySignature, getAccidentalForNote } from '../utils/keySignature.js';

let canvas = null;
let ctx = null;
let lastMicMidiForLine = null;

export function getKeySignatureWidthPx() {
  if (!(appState.display.showKeySignature && appState.staff.satbPreviewMode && Number.isFinite(appState.staff.keyTonic))) {
    return 0;
  }
  const info = getKeySignature(appState.staff.keyTonic, appState.staff.keyMode || 'major');
  const count = (info.sharps?.length || 0) + (info.flats?.length || 0);
  // Must match drawKeySignature spacing in accidentals.js (12px) plus a little padding
  return Math.max(0, count * 12 + 18);
}

export function getStaffStartX() {
  return 80 + getKeySignatureWidthPx();
}

function getDegreeSolfegeForMidiInKey(midi, tonicPc, mode) {
  const spelled = spellMidiInKey(midi, tonicPc, mode);
  return spelled ? spelled.solfege : null;
}

function getCanvas() {
  if (!canvas) {
    canvas = getElementById('staff');
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
  }
  return canvas;
}

export function renderStaff() {
  const canvasElement = getCanvas();
  if (!canvasElement || !ctx) {
    return;
  }

  // Ensure SMuFL font is available for ♯ ♭ ♮. If it loads async, rerender once ready.
  // This avoids the “H/box” fallback glyphs on first render.
  if (!renderStaff._bravuraRequested) {
    renderStaff._bravuraRequested = true;
    ensureBravuraLoaded().then(() => {
      // One extra render after font loads (idempotent)
      renderStaff();
    });
  }
  
  resizeCanvasForDisplay();
  clearCanvas();
  
  const dimensions = getCanvasDimensions();
  drawStaffLines(dimensions);
  
  const noteMapper = createNotePositionMapper(dimensions);
  
  // Check if we're in scrolling mode
  if (appState.staff.scrollingMode && appState.staff.notes.length > 0) {
    drawScrollingNotes(noteMapper, dimensions);
    drawPlayhead(dimensions);
    // Mic should work on all tabs/modes
    drawMicrophoneDot(noteMapper, dimensions);
  } else {
    // Static mode: exercises (interval/cluster), target+mic, and any static note lists (SATB preview)
    drawTargetLine(noteMapper, dimensions);
    drawMicrophoneDot(noteMapper, dimensions);

    if (shouldRenderExerciseAnswerNotes()) {
      drawActiveNotes(noteMapper);
    }
    
    // Draw notes if we have them (for SATB preview or warmup display)
    // Only render SATB preview notes when the SATB tab is active.
    if (
      appState.staff.notes.length > 0 &&
      appState.staff.satbPreviewMode &&
      appState.exercise.currentTab === 'satb'
    ) {
      drawStaticNotes(noteMapper, dimensions);
    }
  }
}

function shouldRenderExerciseAnswerNotes() {
  const tab = appState.exercise?.currentTab;
  const hideAnswers = appState.exercise?.hideAnswers || {};
  const showAnswers = appState.exercise?.showAnswers || {};
  const hasNotes = Array.isArray(appState.exercise?.display?.midis) && appState.exercise.display.midis.length > 0;

  if (!hasNotes) return false;

  if (tab === 'intervals') {
    return hideAnswers.intervals ? !!showAnswers.intervals : true;
  }

  if (tab === 'cluster') {
    return hideAnswers.cluster ? !!showAnswers.cluster : true;
  }

  return false;
}

function resizeCanvasForDisplay() {
  const canvasElement = getCanvas();
  if (!canvasElement || !ctx) return;
  
  const dpr = window.devicePixelRatio || 1;
  const width = canvasElement.clientWidth;
  const height = canvasElement.clientHeight;
  
  canvasElement.width = Math.floor(width * dpr);
  canvasElement.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clearCanvas() {
  const canvasElement = getCanvas();
  if (!canvasElement || !ctx) return;
  
  const width = canvasElement.clientWidth;
  const height = canvasElement.clientHeight;
  ctx.clearRect(0, 0, width, height);
}

function getCanvasDimensions() {
  const canvasElement = getCanvas();
  if (!canvasElement) {
    return { 
      width: 0, 
      height: 0, 
      spacing: 16, 
      marginX: 16, 
      trebleStaffTop: 0,
      bassStaffTop: 0,
      middleCY: 0
    };
  }
  
  const width = canvasElement.clientWidth;
  const height = canvasElement.clientHeight;
  // Keep spacing on a stable grid so lines/spaces and note centers don't drift
  // onto fractional pixels (which causes "inconsistent" looking alignment).
  const spacing = Math.max(10, Math.round(16 * appState.display.zoom));
  const marginX = 16;
  
  // Calculate positions for grand staff (SATB layout)
  // Middle C will be on a ledger line between the two staves
  const half = spacing / 2;
  const snapToHalfSpace = (y) => Math.round(y / half) * half;

  const trebleStaffTop = snapToHalfSpace(height * 0.15);
  const middleCY = snapToHalfSpace(trebleStaffTop + (spacing * 5)); // Middle C ledger line
  const bassStaffTop = snapToHalfSpace(middleCY + spacing); // Bass top line (A3) is 1 space below middle C
  
  return { 
    width, 
    height, 
    spacing, 
    marginX, 
    trebleStaffTop,
    bassStaffTop,
    middleCY
  };
}

function drawStaffLines(dimensions) {
  if (!ctx) return;
  
  ctx.strokeStyle = '#9aa4b2';
  ctx.lineWidth = 1.4;
  
  // Draw treble staff (5 lines)
  for (let i = 0; i < 5; i++) {
    const y = dimensions.trebleStaffTop + i * dimensions.spacing;
    ctx.beginPath();
    ctx.moveTo(dimensions.marginX, y);
    ctx.lineTo(dimensions.width - dimensions.marginX, y);
    ctx.stroke();
  }
  
  // Draw bass staff (5 lines)
  for (let i = 0; i < 5; i++) {
    const y = dimensions.bassStaffTop + i * dimensions.spacing;
    ctx.beginPath();
    ctx.moveTo(dimensions.marginX, y);
    ctx.lineTo(dimensions.width - dimensions.marginX, y);
    ctx.stroke();
  }
  
  // Draw middle C ledger line (between the two staves) - short line like other ledger lines
  ctx.beginPath();
  ctx.moveTo(dimensions.marginX + 40, dimensions.middleCY);
  ctx.lineTo(dimensions.marginX + 80, dimensions.middleCY);
  ctx.stroke();
  
  // Draw clefs
  drawTrebleClef(ctx, dimensions);
  drawBassClef(ctx, dimensions);
  
  // Draw key signature if we have key info (for SATB exercises only) and it's enabled
  if (Number.isFinite(appState.staff.keyTonic) && appState.staff.satbPreviewMode && appState.display.showKeySignature) {
    const keySignatureDimensions = {
      width: dimensions.width,
      height: dimensions.height,
      marginX: dimensions.marginX,
      trebleStaffTop: dimensions.trebleStaffTop,
      bassStaffTop: dimensions.bassStaffTop,
      lineSpacing: dimensions.spacing
    };
    drawKeySignature(ctx, appState.staff.keyTonic, appState.staff.keyMode || 'major', keySignatureDimensions);
  }
}

function drawTrebleClef(ctx, dimensions) {
  if (!ctx) return;
  
  ctx.strokeStyle = '#8ba3c6';
  ctx.fillStyle = '#8ba3c6';
  ctx.lineWidth = 1.5;
  
  const x = dimensions.marginX + 8;
  const trebleStaffTop = dimensions.trebleStaffTop;
  const staffSpacing = dimensions.spacing;
  
  // Draw treble clef symbol (G clef)
  // Positioned on the G line (G4) of the treble staff
  // Using Unicode musical symbol
  ctx.font = '48px "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // trebleStaffTop is the TOP line (F5). G4 is line index 3 from the top.
  ctx.fillText('𝄞', x, trebleStaffTop + staffSpacing * 3);
}

function drawBassClef(ctx, dimensions) {
  if (!ctx) return;
  
  ctx.strokeStyle = '#8ba3c6';
  ctx.fillStyle = '#8ba3c6';
  ctx.lineWidth = 1.5;
  
  const x = dimensions.marginX + 8;
  const bassStaffTop = dimensions.bassStaffTop;
  const staffSpacing = dimensions.spacing;
  
  // Draw bass clef symbol (F clef)
  // Positioned on the 4th line (F line) of the bass staff
  // Using Unicode musical symbol
  ctx.font = '44px "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // bassStaffTop is the TOP line (A3). F3 is line index 1 from the top.
  // Adjust down slightly for better visual alignment
  ctx.fillText('𝄢', x, bassStaffTop + staffSpacing * 1 + 4);
}

function drawLedgerLines(ctx, y, dimensions) {
  if (!ctx) return;
  
  const trebleStaffTop = dimensions.trebleStaffTop;
  const trebleStaffBottom = trebleStaffTop + (dimensions.spacing * 4);
  const bassStaffTop = dimensions.bassStaffTop;
  const bassStaffBottom = bassStaffTop + (dimensions.spacing * 4);
  const staffSpacing = dimensions.spacing;
  
  // Draw ledger lines above treble staff
  if (y < trebleStaffTop) {
    let ledgerY = trebleStaffTop - staffSpacing;
    while (ledgerY >= y - 3) {
      ctx.beginPath();
      ctx.moveTo(dimensions.marginX + 40, ledgerY);
      ctx.lineTo(dimensions.marginX + 80, ledgerY);
      ctx.stroke();
      ledgerY -= staffSpacing;
    }
  }
  
  // Draw ledger lines below treble staff (but above middle C)
  if (y > trebleStaffBottom && y < dimensions.middleCY) {
    let ledgerY = trebleStaffBottom + staffSpacing;
    while (ledgerY < dimensions.middleCY && ledgerY <= y + 3) {
      ctx.beginPath();
      ctx.moveTo(dimensions.marginX + 40, ledgerY);
      ctx.lineTo(dimensions.marginX + 80, ledgerY);
      ctx.stroke();
      ledgerY += staffSpacing;
    }
  }
  
  // Draw ledger lines above bass staff (but below middle C)
  if (y < bassStaffTop && y > dimensions.middleCY) {
    let ledgerY = bassStaffTop - staffSpacing;
    while (ledgerY > dimensions.middleCY && ledgerY >= y - 3) {
      ctx.beginPath();
      ctx.moveTo(dimensions.marginX + 40, ledgerY);
      ctx.lineTo(dimensions.marginX + 80, ledgerY);
      ctx.stroke();
      ledgerY -= staffSpacing;
    }
  }
  
  // Draw ledger lines below bass staff
  if (y > bassStaffBottom) {
    let ledgerY = bassStaffBottom + staffSpacing;
    while (ledgerY <= y + 3) {
      ctx.beginPath();
      ctx.moveTo(dimensions.marginX + 40, ledgerY);
      ctx.lineTo(dimensions.marginX + 80, ledgerY);
      ctx.stroke();
      ledgerY += staffSpacing;
    }
  }
}

function drawLedgerLinesForNote(ctx, noteX, y, dimensions) {
  if (!ctx) return;
  
  const trebleStaffTop = dimensions.trebleStaffTop;
  const trebleStaffBottom = trebleStaffTop + (dimensions.spacing * 4);
  const bassStaffTop = dimensions.bassStaffTop;
  const bassStaffBottom = bassStaffTop + (dimensions.spacing * 4);
  const staffSpacing = dimensions.spacing;
  const ledgerLineLength = 30; // Length of ledger line on each side of note
  
  ctx.save();
  ctx.strokeStyle = '#9aa4b2'; // Muted color for ledger lines
  ctx.lineWidth = 1;

  // Middle C (between staves): draw a short ledger line only when a note lands here.
  if (Math.abs(y - dimensions.middleCY) <= 3) {
    ctx.beginPath();
    ctx.moveTo(noteX - ledgerLineLength, dimensions.middleCY);
    ctx.lineTo(noteX + ledgerLineLength, dimensions.middleCY);
    ctx.stroke();
  }
  
  // Draw ledger lines above treble staff
  if (y < trebleStaffTop) {
    let ledgerY = trebleStaffTop - staffSpacing;
    while (ledgerY >= y - 3) {
      ctx.beginPath();
      ctx.moveTo(noteX - ledgerLineLength, ledgerY);
      ctx.lineTo(noteX + ledgerLineLength, ledgerY);
      ctx.stroke();
      ledgerY -= staffSpacing;
    }
  }
  
  // Draw ledger lines below treble staff (but above middle C)
  if (y > trebleStaffBottom && y < dimensions.middleCY) {
    let ledgerY = trebleStaffBottom + staffSpacing;
    while (ledgerY < dimensions.middleCY && ledgerY <= y + 3) {
      ctx.beginPath();
      ctx.moveTo(noteX - ledgerLineLength, ledgerY);
      ctx.lineTo(noteX + ledgerLineLength, ledgerY);
      ctx.stroke();
      ledgerY += staffSpacing;
    }
  }
  
  // Draw ledger lines above bass staff (but below middle C)
  if (y < bassStaffTop && y > dimensions.middleCY) {
    let ledgerY = bassStaffTop - staffSpacing;
    while (ledgerY > dimensions.middleCY && ledgerY >= y - 3) {
      ctx.beginPath();
      ctx.moveTo(noteX - ledgerLineLength, ledgerY);
      ctx.lineTo(noteX + ledgerLineLength, ledgerY);
      ctx.stroke();
      ledgerY -= staffSpacing;
    }
  }
  
  // Draw ledger lines below bass staff
  if (y > bassStaffBottom) {
    let ledgerY = bassStaffBottom + staffSpacing;
    while (ledgerY <= y + 3) {
      ctx.beginPath();
      ctx.moveTo(noteX - ledgerLineLength, ledgerY);
      ctx.lineTo(noteX + ledgerLineLength, ledgerY);
      ctx.stroke();
      ledgerY += staffSpacing;
    }
  }
  
  ctx.restore();
}

function createNotePositionMapper(dimensions) {
  // Grand staff positioning (traditional notation):
  // - Vertical placement is DIATONIC (letter-name steps), not chromatic semitones.
  // - Accidentals do NOT change vertical position (same line/space).
  // - Anchor: Middle C (C4, MIDI 60) sits on the ledger line BETWEEN staves.
  // - Each diatonic step (C→D→E...) moves by half a staff space (spacing/2).

  const staffSpacing = dimensions.spacing;
  const halfStepPx = staffSpacing / 2;
  const middleCY = dimensions.middleCY;

  // Pitch class → diatonic step index relative to C within an octave (C=0..B=6).
  // We need key-aware spelling so flat keys (Db/Eb/...) don't render on sharp spellings (C#/D#/...).
  const naturalPc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  let pitchClassToDiatonic = [
    0, // C
    0, // C#
    1, // D
    1, // D#
    2, // E
    3, // F
    3, // F#
    4, // G
    4, // G#
    5, // A
    5, // A#
    6  // B
  ];

  // If we're in SATB preview mode and have a key, compute a key-aware mapping.
  if (appState.staff?.satbPreviewMode && Number.isFinite(appState.staff?.keyTonic)) {
    const pcMap = new Array(12).fill(0);

    for (let pc = 0; pc < 12; pc++) {
      // spellMidiInKey expects a midi note; passing `pc` is fine for pitch-class spelling decisions.
      const spelled = spellMidiInKey(pc, appState.staff.keyTonic, appState.staff.keyMode || 'major');
      const letter = spelled?.letter || 'C';
      pcMap[pc] = letters.indexOf(letter);
    }

    pitchClassToDiatonic = pcMap;
  }

  function staffStepFromMiddleC(midi) {
    const midiInt = Math.round(midi);
    const octave = Math.floor(midiInt / 12) - 1; // C4 => 4
    const pc = ((midiInt % 12) + 12) % 12;
    const diatonicInOctave = pitchClassToDiatonic[pc];

    // Middle C = C4 => step 0. Each octave adds 7 diatonic steps.
    return (octave - 4) * 7 + diatonicInOctave;
  }

  return function yForMidi(midi) {
    const step = staffStepFromMiddleC(midi);
    return middleCY - step * halfStepPx;
  };
}

// Removed snapToExactStaffPosition - positioning is now explicit in createNotePositionMapper

function drawScaleDegrees(noteMapper, dimensions) {
  if (!ctx) return;
  
  // Only show one octave of scale degrees for reference
  const scale = buildScalePitches(
    appState.tuning.doMidi,
    appState.tuning.doMidi,
    appState.tuning.doMidi + 11
  );
  
  ctx.save();
  ctx.strokeStyle = '#233056';
  ctx.lineWidth = 1;
  
  // Track used Y positions to prevent overlap
  const usedPositions = new Set();
  
  scale.forEach(pitch => {
    const y = noteMapper(pitch.midi);
    const roundedY = Math.round(y);
    
    // Skip if this position is already used (avoid overlap)
    if (usedPositions.has(roundedY)) {
      return;
    }
    
    usedPositions.add(roundedY);
    
    // Draw ledger lines if needed
    drawLedgerLines(ctx, y, dimensions);
    
    // Draw note head with shape on the staff
    drawNoteHeadWithShape(ctx, 60, y, pitch.sol, 8);
  });
  
  ctx.restore();
}

function drawDroneMarkers(noteMapper, dimensions) {
  const frequencies = getDroneFrequencies();
  
  frequencies.forEach(freq => {
    const midi = Math.round(frequencyToMidi(freq, appState.tuning.a4));
    const y = noteMapper(midi);
    
    drawDroneMarker(freq, y, dimensions);
  });
}

function drawDroneMarker(freq, y, dimensions) {
  if (!ctx) return;
  
  ctx.fillStyle = '#1a2740';
  ctx.strokeStyle = '#8bd3ff';
  ctx.lineWidth = 2;
  
  drawRoundedRect(ctx, 160, y - 8, 22, 16, 6, true, true);
  
  ctx.fillStyle = '#9bdcff';
  ctx.fillText(freq.toFixed(1) + ' Hz', 188, y + 4);
}

function drawTargetLine(noteMapper, dimensions) {
  if (!ctx) return;
  
  // Only draw if aim line is enabled
  if (!appState.target.showAimLine) {
    return;
  }
  
  const targetMidi = calculateTargetMidi();
  const targetY = noteMapper(targetMidi);
  
  ctx.strokeStyle = '#34d399';
  ctx.setLineDash([10, 6]);
  ctx.lineWidth = 2.4;
  
  ctx.beginPath();
  ctx.moveTo(dimensions.marginX, targetY);
  ctx.lineTo(dimensions.width - dimensions.marginX, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.fillStyle = '#34d399';
  ctx.fillText('AIM', dimensions.width - 52, targetY - 6);
}

function drawActiveNotes(noteMapper) {
  if (!ctx) return;
  
  const activeMidis = appState.exercise.display.midis;
  
  if (!activeMidis || activeMidis.length === 0) {
    return;
  }
  
  const tonic = appState.tuning.doMidi;
  const mode = 'major'; // Assume major mode for exercises
  
  ctx.save();
  ctx.strokeStyle = '#233056';
  ctx.lineWidth = 1;
  
  activeMidis.forEach((midi, index) => {
    const y = noteMapper(midi);
    const solfege = getSolfegeForMidi(midi, appState.tuning.doMidi);
    const x = 100 + index * 20;
    
    // Draw ledger lines if needed
    const dimensions = getCanvasDimensions();
    drawLedgerLines(ctx, y, dimensions);
    
    // Check for accidental (if enabled)
    if (appState.display.showAccidentals) {
      const accidental = getAccidentalForNote(midi, tonic, mode);
      if (accidental) {
        const accidentalX = x - 14;
        const accidentalY = y - 2;
        
        if (accidental === 'sharp') {
          drawSharp(ctx, accidentalX, accidentalY, 14);
        } else if (accidental === 'flat') {
          drawFlat(ctx, accidentalX, accidentalY, 14);
        } else if (accidental === 'natural') {
          drawNatural(ctx, accidentalX, accidentalY, 14);
        }
      }
    }
    
    if (solfege) {
      drawNoteHeadWithShape(ctx, x, y, solfege, 8);
    } else {
      // Fallback for non-diatonic notes
      drawActiveNoteDot(ctx, x, y);
    }
  });
  
  ctx.restore();
}

function drawActiveNoteDot(ctx, x, y) {
  if (!ctx) return;
  
  ctx.fillStyle = '#7dd3fc';
  ctx.strokeStyle = '#0b0f19';
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawMicrophoneDot(noteMapper, dimensions) {
  // Always draw mic feedback from the raw pitch (so the singer sees sharp/flat movement),
  // and keep it as a single line (no separate “stable/established” overlay).
  const rawHz = pitchState.hz || 0;

  updatePitchDisplay(rawHz);

  if (!rawHz) {
    updateCentsDisplay(0);
    lastMicMidiForLine = null;
    return;
  }

  // Use RAW pitch for placement so it reacts fast enough for quick singing (hymns),
  // and doesn't "fly in" due to smoothing/averaging.
  // NOTE: We compute micMidi with a local conversion to avoid any module caching weirdness.
  const rawMicMidi = frequencyToMidiCorrect(rawHz, appState.tuning.a4);
  if (!Number.isFinite(rawMicMidi)) {
    return;
  }

  // Tolerance now acts as a "deadband" to reduce jitter:
  // if the detected pitch wiggles by less than tolerance cents, keep the line steady.
  const toleranceCents = appState.display.tolerance;
  let micMidi = rawMicMidi;
  if (Number.isFinite(lastMicMidiForLine)) {
    const deltaCents = (rawMicMidi - lastMicMidiForLine) * 100;
    if (Math.abs(deltaCents) < toleranceCents) {
      micMidi = lastMicMidiForLine;
    } else {
      lastMicMidiForLine = rawMicMidi;
    }
  } else {
    lastMicMidiForLine = rawMicMidi;
  }
  if (!Number.isFinite(micMidi)) {
    return;
  }
  const targetMidi = calculateTargetMidi();
  const targetFreq = midiToFrequency(targetMidi, appState.tuning.a4);
  
  // For mic feedback, anchor to the correct staff line/space (diatonic),
  // then nudge by cents so sharp/flat is visible without breaking staff placement.
  const y = micYForMidi(micMidi, noteMapper, dimensions);
  const delta = centsBetween(rawHz, targetFreq);
  
  updateCentsDisplay(delta);
  drawMicPitchLine(y, delta, dimensions, false);
}

function frequencyToMidiCorrect(freq, a4 = 440) {
  if (!freq || freq <= 0) return NaN;
  const adjustedFreq = freq / (a4 / 440);
  return 69 + 12 * Math.log2(adjustedFreq / 440);
}

function micYForMidi(midiFloat, noteMapper, dimensions) {
  if (!Number.isFinite(midiFloat)) {
    return NaN;
  }
  // 1) Snap to the nearest semitone (for a stable staff anchor)
  const nearestMidi = Math.round(midiFloat);
  const baseY = noteMapper(nearestMidi);
  if (!Number.isFinite(baseY)) {
    return NaN;
  }

  // 2) Nudge within that staff position by cents so sharp/flat is visible.
  // This avoids the incorrect “1 semitone = 1 line/space” assumption.
  const centsFromNearest = (midiFloat - nearestMidi) * 100;
  const maxNudgePx = dimensions.spacing * 0.35; // subtle but visible
  const nudge = Math.max(-50, Math.min(50, centsFromNearest)) / 50 * maxNudgePx;

  // Higher pitch -> smaller y
  return baseY - nudge;
}

function calculateTargetMidi() {
  return appState.tuning.doMidi + appState.drone.rootSemi + appState.target.semi;
}

function updatePitchDisplay(micHz) {
  const micHzElement = getElementById('micHz');
  const displayText = micHz ? micHz.toFixed(1) : '—';
  setTextContent(micHzElement, displayText);
}

function updateCentsDisplay(delta) {
  const micCentsElement = getElementById('micCents');
  const sign = delta > 0 ? '+' : '';
  setTextContent(micCentsElement, sign + delta.toFixed(1));
}

function drawMicPitchLine(y, delta, dimensions, _isStable) {
  if (!ctx) return;
  if (!Number.isFinite(y)) return;

  // Clamp so low/high voices always show feedback even if out of view.
  const clampedY = Math.max(-5, Math.min(dimensions.height + 5, y));
  
  // Single neutral color (no red→green shifting).
  const color = '#60a5fa';
  
  // Draw ledger lines if needed
  drawLedgerLines(ctx, clampedY, dimensions);

  // Draw horizontal mic pitch line across the staff
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 2.6;
  // Single solid line
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(dimensions.marginX, clampedY);
  ctx.lineTo(dimensions.width - dimensions.marginX, clampedY);
  ctx.stroke();
  ctx.restore();
}

function drawScrollingNotes(noteMapper, dimensions) {
  if (!ctx) return;
  
  const notes = appState.staff.notes;
  const currentTime = appState.staff.currentTime;
  // Add extra space when key signature is shown
  const startX = getStaffStartX();
  // Fixed spacing: 80 pixels per second
  // Note startTimes are already scaled by tempo, so we use fixed pixelsPerSecond
  // This ensures notes stay in fixed positions regardless of tempo
  const pixelsPerSecond = 80;
  
  // Get viewport offset for panning
  const viewportOffset = appState.staff.viewportOffset || 0;
  
  // Get aim part for highlighting (if in SATB mode)
  const aimPart = appState.satb?.aimPart || null;
  
  ctx.save();
  
  // Draw all notes at fixed positions (they don't move)
  notes.forEach((note, index) => {
    if (!note || note.midi === undefined || note.startTime === undefined) {
      console.warn('Invalid note in scrolling:', note);
      return;
    }
    
    // Notes are positioned based on their startTime relative to the first note
    // The startTime values are already scaled by tempo in scaleStanzasForTempo
    const firstNoteTime = notes[0]?.startTime || 0;
    const timeDiff = note.startTime - firstNoteTime;
    const absoluteX = startX + timeDiff * pixelsPerSecond;
    // Apply viewport offset for panning
    const x = absoluteX - viewportOffset;
    const y = noteMapper(note.midi);
    
    // Only skip if y is not finite or wildly off-canvas; ledger notes may be above 0.
    if (!Number.isFinite(y) || y < -80 || y > dimensions.height + 80) {
      console.warn(`Out-of-bounds Y for scrolling note MIDI ${note.midi}: ${y}`);
      return;
    }
    
    // Only draw notes that are visible on screen (with wider padding to prevent wrapping)
    if (x >= -100 && x <= dimensions.width + 100) {
        // Use MIDI file's key for solfege if it's a MIDI exercise, otherwise use settings key
        const solfege = (appState.staff.satbPreviewMode && Number.isFinite(appState.staff.keyTonic))
          ? getDegreeSolfegeForMidiInKey(note.midi, appState.staff.keyTonic, appState.staff.keyMode || 'major')
          : getSolfegeForMidi(note.midi, getDoMidiForDisplay());
        
        // Draw ledger lines if needed (at the note's X position)
        drawLedgerLinesForNote(ctx, x, y, dimensions);
        
        // SEMITONE_TO_SOLFEGE covers all 12 semitones; solfege should always resolve as long as Do is valid.
        // Check if this note is part of the aim part (for highlighting)
        const isAimPart = note.part && note.part === aimPart;
        const accidental = note.accidental || null;
        drawNoteAtPosition(x, y, note.midi, false, solfege, isAimPart, accidental);
      }
  });
  
  ctx.restore();
}

function drawStaticNotes(noteMapper, dimensions) {
  if (!ctx) return;
  
  const notes = appState.staff.notes;
  if (notes.length === 0) return;
  
  // Add extra space when key signature is shown
  const startX = getStaffStartX();
  const pixelsPerSecond = 80; // Same spacing as scrolling notes
  
  // Get viewport offset for panning (when not playing)
  const viewportOffset = appState.staff.viewportOffset || 0;
  
  // Get aim part for highlighting (if in SATB mode)
  const aimPart = appState.satb?.aimPart || null;
  
  ctx.save();
  
  // Draw all notes at fixed positions based on their startTime
  notes.forEach((note) => {
    if (!note || note.midi === undefined || note.startTime === undefined) {
      console.warn('Invalid note in static:', note);
      return;
    }
    
    const firstNoteTime = notes[0]?.startTime || 0;
    const timeDiff = note.startTime - firstNoteTime;
    const absoluteX = startX + timeDiff * pixelsPerSecond;
    // Apply viewport offset for panning
    const x = absoluteX - viewportOffset;
    const y = noteMapper(note.midi);
    
    // Only skip if y is not finite or wildly off-canvas; ledger notes may be above 0.
    if (!Number.isFinite(y) || y < -80 || y > dimensions.height + 80) {
      console.warn(`Out-of-bounds Y for static note MIDI ${note.midi}: ${y}`);
      return;
    }
    
    // Only draw notes that are visible on screen (with wider padding to prevent wrapping)
    if (x >= -100 && x <= dimensions.width + 100) {
      // Use MIDI file's key for solfege if it's a MIDI exercise, otherwise use settings key
      const solfege = (appState.staff.satbPreviewMode && Number.isFinite(appState.staff.keyTonic))
        ? getDegreeSolfegeForMidiInKey(note.midi, appState.staff.keyTonic, appState.staff.keyMode || 'major')
        : getSolfegeForMidi(note.midi, getDoMidiForDisplay());
      
      // Draw ledger lines if needed (at the note's X position)
      drawLedgerLinesForNote(ctx, x, y, dimensions);
      
      // SEMITONE_TO_SOLFEGE covers all 12 semitones; solfege should always resolve as long as Do is valid.
      // Check if this note is part of the aim part (for highlighting)
      const isAimPart = note.part && note.part === aimPart;
      const accidental = note.accidental || null;
      drawNoteAtPosition(x, y, note.midi, false, solfege, isAimPart, accidental);
    }
  });
  
  ctx.restore();
}

function drawPlayhead(dimensions) {
  if (!ctx) return;
  
  const playheadX = appState.staff.playheadX;
  const viewportOffset = appState.staff.viewportOffset || 0;
  const maxPanReached = appState.staff.maxPanReached || false;
  
  // Calculate where to draw the playhead
  const playheadFixedPosition = dimensions.width * 0.4;
  let drawX;
  
  if (maxPanReached) {
    // We've reached max pan - playhead continues moving right at its actual position (offset by viewport)
    drawX = playheadX - viewportOffset;
  } else if (viewportOffset > 0) {
    // We're panning - draw at fixed position
    drawX = playheadFixedPosition;
  } else {
    // Not panning yet - draw at actual position
    drawX = playheadX;
  }
  
  // Only draw if playhead is visible
  if (drawX < -10 || drawX > dimensions.width + 10) {
    return;
  }
  
  ctx.save();
  ctx.strokeStyle = '#f87171'; // Red line
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  
  ctx.beginPath();
  ctx.moveTo(drawX, 0);
  ctx.lineTo(drawX, dimensions.height);
  ctx.stroke();
  
  ctx.restore();
}

function calculateNoteXPosition(note, currentTime, startX, pixelsPerSecond) {
  // Notes are fixed in position based on their startTime
  // This function is no longer used but kept for compatibility
  const firstNoteTime = appState.staff.notes[0]?.startTime || 0;
  const relativeTime = note.startTime - firstNoteTime;
  return startX + relativeTime * pixelsPerSecond;
}

function getPlayheadX(currentTime, startX, pixelsPerSecond) {
  return startX + currentTime * pixelsPerSecond;
}

function isNoteActive(note, currentTime) {
  return currentTime >= note.startTime && currentTime < (note.startTime + note.duration);
}

function drawNoteAtPosition(x, y, midi, isActive, solfege, isAimPart = false, accidental = null) {
  if (!ctx) return;
  
  ctx.save();
  
  // Draw accidental before the shape (if present and enabled)
  if (accidental && appState.display.showAccidentals) {
    const accidentalX = x - 14; // Position to the left of note
    const accidentalY = y - 2; // Slightly above center
    
    if (accidental === 'sharp') {
      drawSharp(ctx, accidentalX, accidentalY, 14);
    } else if (accidental === 'flat') {
      drawFlat(ctx, accidentalX, accidentalY, 14);
    } else if (accidental === 'natural') {
      drawNatural(ctx, accidentalX, accidentalY, 14);
    }
  }
  
  // If this is the aim part, use different styling
  if (isAimPart) {
    ctx.globalAlpha = 1.0; // Full opacity
  } else {
    ctx.globalAlpha = 0.7; // Slightly transparent for other parts
  }
  
  // Draw note head with shape (keep size consistent; highlight aim part without rings)
  const noteSize = 8;

  if (isAimPart) {
    // Subtle glow highlight around the shape itself (no circles/rings)
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    // Draw twice to strengthen the glow without changing geometry
    drawNoteHeadWithShape(ctx, x, y, solfege, noteSize);
    drawNoteHeadWithShape(ctx, x, y, solfege, noteSize);
    ctx.restore();
  } else {
    drawNoteHeadWithShape(ctx, x, y, solfege, noteSize);
  }
  
  ctx.restore();
}

