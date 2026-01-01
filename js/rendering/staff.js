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

let canvas = null;
let ctx = null;

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
  
  resizeCanvasForDisplay();
  clearCanvas();
  
  const dimensions = getCanvasDimensions();
  drawStaffLines(dimensions);
  
  const noteMapper = createNotePositionMapper(dimensions);
  
  // Check if we're in scrolling mode
  if (appState.staff.scrollingMode && appState.staff.notes.length > 0) {
    drawScrollingNotes(noteMapper, dimensions);
    drawPlayhead(dimensions);
  } else {
    // Static mode: exercises (interval/cluster), target+mic, and any static note lists (SATB preview)
    drawTargetLine(noteMapper, dimensions);
    drawMicrophoneDot(noteMapper, dimensions);
    drawActiveNotes(noteMapper);
    
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
  const spacing = 16 * appState.display.zoom;
  const marginX = 16;
  
  // Calculate positions for grand staff (SATB layout)
  // Middle C will be on a ledger line between the two staves
  const trebleStaffTop = height * 0.15;
  const middleCY = trebleStaffTop + (spacing * 5); // One ledger line below treble staff
  const bassStaffTop = middleCY + spacing; // One ledger line above bass staff
  
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
  
  ctx.strokeStyle = '#233056';
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
  ctx.font = '32px "Times New Roman", serif';
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
  ctx.font = '28px "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // bassStaffTop is the TOP line (A3). F3 is line index 1 from the top.
  ctx.fillText('𝄢', x, bassStaffTop + staffSpacing * 1);
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

  // Pitch class → diatonic step index relative to C within an octave.
  // C=0, D=1, E=2, F=3, G=4, A=5, B=6.
  // Accidentals map to their natural letter slot.
  const pitchClassToDiatonic = [
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
  const micHz = pitchState.hz;
  updatePitchDisplay(micHz);
  
  if (!micHz) {
    return;
  }
  
  const micMidi = frequencyToMidi(micHz, appState.tuning.a4);
  const targetMidi = calculateTargetMidi();
  const targetFreq = midiToFrequency(targetMidi, appState.tuning.a4);
  
  const y = noteMapper(micMidi);
  const delta = centsBetween(micHz, targetFreq);
  
  updateCentsDisplay(delta);
  drawMicIndicator(y, delta, dimensions);
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

function drawMicIndicator(y, delta, dimensions) {
  if (!ctx) return;
  
  const micMidi = frequencyToMidi(pitchState.hz, appState.tuning.a4);
  const solfege = getSolfegeForMidi(micMidi, appState.tuning.doMidi);
  const x = dimensions.width - 60;
  
  const absoluteDelta = Math.abs(delta);
  const tolerance = appState.display.tolerance;
  
  // Determine color based on accuracy
  let color = '#f87171';
  if (absoluteDelta < tolerance) {
    color = '#34d399';
  } else if (absoluteDelta < tolerance * 2) {
    color = '#fbbf24';
  }
  
  // Draw ledger lines if needed
  drawLedgerLines(ctx, y, dimensions);
  
  if (solfege) {
    // Draw shape-note head with color indicating accuracy
    ctx.save();
    drawNoteHeadWithShape(ctx, x, y, solfege, 8);
    
    // Draw accuracy indicator ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    // Fallback for non-diatonic notes
    ctx.fillStyle = color;
    ctx.strokeStyle = '#0b0f19';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawScrollingNotes(noteMapper, dimensions) {
  if (!ctx) return;
  
  const notes = appState.staff.notes;
  const currentTime = appState.staff.currentTime;
  const startX = 80;
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
        const doMidi = getDoMidiForDisplay();
        const solfege = getSolfegeForMidi(note.midi, doMidi);
        
        // Draw ledger lines if needed (at the note's X position)
        drawLedgerLinesForNote(ctx, x, y, dimensions);
        
        if (solfege) {
          // Check if this note is part of the aim part (for highlighting)
          const isAimPart = note.part && note.part === aimPart;
          drawNoteAtPosition(x, y, note.midi, false, solfege, isAimPart);
        } else {
          // Fallback: still draw a visible notehead even if solfege mapping fails
          drawFallbackNoteHead(ctx, x, y);
        }
      }
  });
  
  ctx.restore();
}

function drawStaticNotes(noteMapper, dimensions) {
  if (!ctx) return;
  
  const notes = appState.staff.notes;
  if (notes.length === 0) return;
  
  const startX = 80;
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
      const doMidi = getDoMidiForDisplay();
      const solfege = getSolfegeForMidi(note.midi, doMidi);
      
      // Draw ledger lines if needed (at the note's X position)
      drawLedgerLinesForNote(ctx, x, y, dimensions);
      
      if (solfege) {
        // Check if this note is part of the aim part (for highlighting)
        const isAimPart = note.part && note.part === aimPart;
        drawNoteAtPosition(x, y, note.midi, false, solfege, isAimPart);
      } else {
        // Fallback: still draw a visible notehead even if solfege mapping fails
        drawFallbackNoteHead(ctx, x, y);
      }
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

function drawNoteAtPosition(x, y, midi, isActive, solfege, isAimPart = false) {
  if (!ctx) return;
  
  ctx.save();
  
  // If this is the aim part, use different styling
  if (isAimPart) {
    ctx.globalAlpha = 1.0; // Full opacity
  } else {
    ctx.globalAlpha = 0.7; // Slightly transparent for other parts
  }
  
  // Draw note head with shape (size varies for aim part)
  drawNoteHeadWithShape(ctx, x, y, solfege, isAimPart ? 10 : 8);
  
  ctx.restore();
}

function drawFallbackNoteHead(ctx, x, y) {
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = '#cfe6ff';
  ctx.strokeStyle = '#0b0f19';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, 7.5, 5.5, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

