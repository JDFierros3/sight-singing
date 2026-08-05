/**
 * Staff canvas rendering broken into small functions
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { appState, getDoMidiForDisplay } from '../state/appState.js';
import { buildScalePitches } from '../utils/musicTheory.js';
import { frequencyToMidi, midiToFrequency, centsBetween } from '../utils/audioMath.js';
import { pitchState } from '../pitch/detection.js';
import { drawRoundedRect, drawNoteHeadWithShape } from './shapes.js';
import { getSolfegeForMidi } from '../utils/musicTheory.js';
import { getDroneFrequencies } from '../state/appState.js';
import { drawSharp, drawFlat, drawNatural, drawKeySignature, ensureBravuraLoaded } from './accidentals.js';
import { spellMidiInKey, spellChordTone, getKeySignature, getAccidentalForNote } from '../utils/keySignature.js';

let canvas = null;
let ctx = null;
let lastMicMidiForLine = null;

export function getKeySignatureWidthPx() {
  if (!appState.display.showAccidentalsAndKey) {
    return 0;
  }
  
  // Determine the key based on current tab
  let tonicPc, mode;
  if (appState.exercise.currentTab === 'satb' && Number.isFinite(appState.staff.keyTonic)) {
    // SATB tab: use MIDI file's key
    tonicPc = appState.staff.keyTonic;
    mode = appState.staff.keyMode || 'major';
  } else {
    // Other tabs: use movable Do
    tonicPc = appState.tuning.doMidi % 12;
    mode = 'major';
  }
  
  const info = getKeySignature(tonicPc, mode);
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
    
    // Draw chord quality notes when Chord Quality tab is active
    if (appState.exercise.currentTab === 'chord-quality') {
      drawChordQualityNotes(noteMapper, dimensions);
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
  
  // Draw key signature if enabled
  if (appState.display.showAccidentalsAndKey) {
    // Determine the key based on current tab
    let tonicPc, mode;
    if (appState.exercise.currentTab === 'satb' && Number.isFinite(appState.staff.keyTonic)) {
      // SATB tab: use MIDI file's key
      tonicPc = appState.staff.keyTonic;
      mode = appState.staff.keyMode || 'major';
    } else {
      // Other tabs: use movable Do
      tonicPc = appState.tuning.doMidi % 12;
      mode = 'major';
    }
    
    const keySignatureDimensions = {
      width: dimensions.width,
      height: dimensions.height,
      marginX: dimensions.marginX,
      trebleStaffTop: dimensions.trebleStaffTop,
      bassStaffTop: dimensions.bassStaffTop,
      lineSpacing: dimensions.spacing
    };
    drawKeySignature(ctx, tonicPc, mode, keySignatureDimensions);
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
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  // Natural positions for pitch classes (C=0, C#/Db=0, D=1, D#/Eb=1, E=2, F=3, F#/Gb=3, G=4, G#/Ab=4, A=5, A#/Bb=5, B=6)
  const naturalPositions = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

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

  // Always use key-aware spelling for ALL tabs (SATB and movable Do exercises)
  // This ensures key signatures match the note spellings and positions
  let keyTonic = null;
  let keyMode = 'major';
  
  // Priority: SATB exercise key > movable Do key
  if (appState.staff?.satbPreviewMode && Number.isFinite(appState.staff?.keyTonic)) {
    // Use the MIDI file's key if in SATB mode
    keyTonic = appState.staff.keyTonic;
    keyMode = appState.staff.keyMode || 'major';
  } else if (Number.isFinite(appState.tuning?.doMidi)) {
    // Use movable Do as the key tonic for all movable Do exercises
    keyTonic = appState.tuning.doMidi % 12;
    keyMode = 'major'; // Assume major for movable Do exercises
  }
  
  // If we have a key, compute key-aware mapping
  if (keyTonic !== null) {
    const pcMap = new Array(12).fill(0);

    for (let pc = 0; pc < 12; pc++) {
      // spellMidiInKey expects a midi note; passing `pc` is fine for pitch-class spelling decisions.
      const spelled = spellMidiInKey(pc, keyTonic, keyMode);
      const letter = spelled?.letter || 'C';
      pcMap[pc] = letters.indexOf(letter);
    }

    pitchClassToDiatonic = pcMap;
  }

  function staffStepFromMiddleC(midi) {
    const midiInt = Math.round(midi);
    const octave = Math.floor(midiInt / 12) - 1; // C4 => 4
    const pc = ((midiInt % 12) + 12) % 12;
    
    // Calculate natural position baseline (what position this note would have with natural spelling)
    const naturalIndex = naturalPositions[pc];
    const naturalStep = (octave - 4) * 7 + naturalIndex;
    
    // Get key-aware letter index (how this pitch class is spelled in the current key)
    const keyAwareIndex = pitchClassToDiatonic[pc];
    
    // Always use key-aware positioning when we have a key
    if (keyTonic !== null) {
      // Calculate what octave would give the correct position with key-aware letter
      // Formula: naturalStep = (octave - 4) * 7 + naturalIndex
      // We want: adjustedStep ≈ naturalStep, where adjustedStep = (adjustedOctave - 4) * 7 + keyAwareIndex
      // Solving: (adjustedOctave - 4) * 7 + keyAwareIndex = naturalStep
      // Therefore: adjustedOctave = 4 + (naturalStep - keyAwareIndex) / 7
      const adjustedOctave = 4 + (naturalStep - keyAwareIndex) / 7;
      const roundedOctave = Math.round(adjustedOctave);
      const adjustedStep = (roundedOctave - 4) * 7 + keyAwareIndex;
      
      // Validate: if the error is acceptable (≤1 step), use adjusted position
      // This handles fractional octaves by rounding and checking accuracy
      if (Math.abs(adjustedStep - naturalStep) <= 1) {
        return adjustedStep;
      }
      // Fallback: if rounding caused too much error (rare edge case), use natural position
      // This preserves pitch relationships even in extreme enharmonic situations
    }
    
    // Fallback: no key or validation failed, use natural position
    return naturalStep;
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
    // Use getStaffStartX() to account for key signature width when enabled
    const x = getStaffStartX() + index * 20;
    
    // Draw ledger lines if needed
    const dimensions = getCanvasDimensions();
    drawLedgerLines(ctx, y, dimensions);
    
    // Check for accidental (if enabled)
    if (appState.display.showAccidentalsAndKey) {
      // Determine the key based on current tab
      let tonicPc, keyMode;
      if (appState.exercise.currentTab === 'satb' && Number.isFinite(appState.staff.keyTonic)) {
        // SATB tab: use MIDI file's key
        tonicPc = appState.staff.keyTonic;
        keyMode = appState.staff.keyMode || 'major';
      } else {
        // Other tabs: use movable Do
        tonicPc = appState.tuning.doMidi % 12;
        keyMode = 'major';
      }
      
      // Get key signature info for accidental suppression
      const keyInfo = getKeySignature(tonicPc, keyMode);
      const accidental = getAccidentalForNote(midi, tonicPc, keyMode, keyInfo);
      
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
  drawMicPitchLine(y, delta, dimensions, false, false);
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

function drawMicPitchLine(y, delta, dimensions, _isStable, colorByAccuracy = false) {
  if (!ctx) return;
  if (!Number.isFinite(y)) return;

  // Clamp so low/high voices always show feedback even if out of view.
  const clampedY = Math.max(-5, Math.min(dimensions.height + 5, y));

  // Neutral blue by default; on Live Sing, shift green→yellow→red by how in-tune you are.
  let color = '#60a5fa';
  if (colorByAccuracy) {
    const cents = Math.abs(delta);
    color = cents <= 15 ? '#22c55e' : (cents <= 40 ? '#eab308' : '#ef4444');
  }
  
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
    // (Silently skip — this runs per note per frame, so logging here floods the console and
    // tanks the frame rate.)
    if (!Number.isFinite(y) || y < -80 || y > dimensions.height + 80) {
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
    // (Silently skip — logging per note per redraw floods the console and costs frames.)
    if (!Number.isFinite(y) || y < -80 || y > dimensions.height + 80) {
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

function drawChordQualityNotes(noteMapper, dimensions) {
  if (!ctx) return;
  
  const rootSemi = appState.drone.rootSemi;
  const chordSemis = appState.drone.semis || [];
  const inversion = appState.drone.inversion || 0;
  const doMidi = appState.tuning.doMidi;
  
  if (chordSemis.length === 0) return;
  
  const startX = getStaffStartX();
  const spacing = 30; // Horizontal spacing between notes
  
  ctx.save();
  
  // Calculate MIDI values for each chord tone based on inversion,
  // keeping track of the original chord interval for spelling purposes
  const base = doMidi + rootSemi;
  let chordTones; // array of { midi, interval }
  if (inversion === 0) {
    chordTones = chordSemis.map(semi => ({ midi: base + semi, interval: semi }));
  } else if (inversion === 1) {
    if (chordSemis.length >= 2) {
      chordTones = [
        { midi: base + chordSemis[1], interval: chordSemis[1] },
        ...chordSemis.slice(2).map(semi => ({ midi: base + semi, interval: semi })),
        { midi: base + chordSemis[0] + 12, interval: chordSemis[0] }
      ];
    } else {
      chordTones = chordSemis.map(semi => ({ midi: base + semi, interval: semi }));
    }
  } else if (inversion === 2) {
    if (chordSemis.length >= 3) {
      chordTones = [
        { midi: base + chordSemis[2], interval: chordSemis[2] },
        ...chordSemis.slice(3).map(semi => ({ midi: base + semi, interval: semi })),
        { midi: base + chordSemis[0] + 12, interval: chordSemis[0] },
        { midi: base + chordSemis[1] + 12, interval: chordSemis[1] }
      ];
    } else {
      chordTones = chordSemis.map(semi => ({ midi: base + semi, interval: semi }));
    }
  } else {
    chordTones = chordSemis.map(semi => ({ midi: base + semi, interval: semi }));
  }

  // Sort by MIDI value (low to high) for better visual arrangement
  chordTones.sort((a, b) => a.midi - b.midi);
  
  // Get active drone frequencies to highlight which tones are playing
  const activeFrequencies = getDroneFrequencies();
  const activeMidis = activeFrequencies.map(freq => {
    return Math.round(frequencyToMidi(freq, appState.tuning.a4));
  });
  
  // Key context for chord-interval-aware spelling
  const tonicPc = doMidi % 12;
  const keyMode = 'major';
  const useKeyAware = appState.display.showAccidentalsAndKey;
  const rootMidi = base; // absolute MIDI of chord root (doMidi + rootSemi)

  // Letter-to-step index for computing Y from chord-spelled letter
  const LETTER_STEP = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const halfStepPx = dimensions.spacing / 2;

  // Natural pitch class for each letter (used for octave adjustment)
  const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // Draw each chord tone
  chordTones.forEach((tone, index) => {
    // Compute chord-interval-aware spelling once per tone
    const spelled = useKeyAware
      ? spellChordTone(tone.midi, rootMidi, tone.interval, tonicPc, keyMode)
      : null;

    // Compute Y position
    let y;
    if (spelled?.letter) {
      // Use chord-spelled letter for Y so augmented 5th lands on G line, not A line
      const midiInt = Math.round(tone.midi);
      const octave = Math.floor(midiInt / 12) - 1;
      const letterStep = LETTER_STEP[spelled.letter];
      const naturalPc = NATURAL_PC[spelled.letter];
      const notePc = ((midiInt % 12) + 12) % 12;
      // Adjust octave when chord-spelling letter wraps across octave boundary
      let adjustedOctave = octave;
      if (notePc < naturalPc && (naturalPc - notePc) > 6) {
        adjustedOctave = octave + 1;
      } else if (notePc > naturalPc && (notePc - naturalPc) > 6) {
        adjustedOctave = octave - 1;
      }
      const staffStep = (adjustedOctave - 4) * 7 + letterStep;
      y = dimensions.middleCY - staffStep * halfStepPx;
    } else {
      y = noteMapper(tone.midi);
    }

    if (!Number.isFinite(y) || y < -80 || y > dimensions.height + 80) {
      return;
    }

    const x = startX + index * spacing;

    // Check if this tone is active in the drone
    const isActive = activeMidis.some(activeMidi => Math.abs(activeMidi - tone.midi) < 1);

    // Get solfege and accidental from chord spelling
    let solfege;
    let noteAccidental = null;
    if (spelled) {
      solfege = spelled.solfege || getSolfegeForMidi(tone.midi, doMidi);
      noteAccidental = spelled.accidental || null;
    } else {
      solfege = getSolfegeForMidi(tone.midi, doMidi);
    }

    // Draw ledger lines if needed
    drawLedgerLinesForNote(ctx, x, y, dimensions);

    // Draw accidental if needed
    if (noteAccidental) {
      ctx.save();
      const accidentalX = x - 14;
      const accidentalY = y - 2;
      if (noteAccidental === 'sharp') {
        drawSharp(ctx, accidentalX, accidentalY, 14);
      } else if (noteAccidental === 'flat') {
        drawFlat(ctx, accidentalX, accidentalY, 14);
      } else if (noteAccidental === 'natural') {
        drawNatural(ctx, accidentalX, accidentalY, 14);
      }
      ctx.restore();
    }

    // Draw note with different styling for active vs. inactive
    ctx.save();

    if (isActive && appState.drone.on) {
      // Active tone: brighter, with glow
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = '#8bd3ff';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      drawNoteHeadWithShape(ctx, x, y, solfege, 9);
      ctx.restore();
      ctx.save();
      // Draw again for stronger glow
      ctx.globalAlpha = 0.8;
      drawNoteHeadWithShape(ctx, x, y, solfege, 9);
    } else {
      // Inactive tone: dimmer
      ctx.globalAlpha = 0.6;
      drawNoteHeadWithShape(ctx, x, y, solfege, 8);
    }

    ctx.restore();
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
  
  // Draw accidental before the shape (if enabled)
  if (appState.display.showAccidentalsAndKey) {
    // Recalculate accidental with key-aware suppression
    let tonicPc, keyMode;
    if (appState.exercise.currentTab === 'satb' && Number.isFinite(appState.staff.keyTonic)) {
      // SATB tab: use MIDI file's key
      tonicPc = appState.staff.keyTonic;
      keyMode = appState.staff.keyMode || 'major';
    } else {
      // Other tabs: use movable Do
      tonicPc = appState.tuning.doMidi % 12;
      keyMode = 'major';
    }
    
    // Get key signature info for accidental suppression
    const keyInfo = getKeySignature(tonicPc, keyMode);
    const calculatedAccidental = getAccidentalForNote(midi, tonicPc, keyMode, keyInfo);
    
    if (calculatedAccidental) {
      const accidentalX = x - 14; // Position to the left of note
      const accidentalY = y - 2; // Slightly above center
      
      if (calculatedAccidental === 'sharp') {
        drawSharp(ctx, accidentalX, accidentalY, 14);
      } else if (calculatedAccidental === 'flat') {
        drawFlat(ctx, accidentalX, accidentalY, 14);
      } else if (calculatedAccidental === 'natural') {
        drawNatural(ctx, accidentalX, accidentalY, 14);
      }
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

