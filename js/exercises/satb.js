/**
 * SATB practice exercises
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { ensureAudioContext } from '../audio/context.js';
import { stopAllDroneOscillators } from '../audio/drone.js';
import { appState } from '../state/appState.js';
import { stanzaSequencePlayer } from '../player/sequencePlayer.js';
import { scheduleNotes, waitWithValidation } from '../player/noteScheduler.js';
import { isValidSequence, getCurrentSequenceId } from '../player/sequenceManager.js';
import { playNote, stopAllNotes } from '../player/audioPlayer.js';
import { getAllSATBExercises as getAllSATBExercisesFromData, createExerciseFromMidi } from './satbData.js';
import { buildPartSelectionButtons, buildPartVolumeControls, buildExerciseSelection, updatePartSelection } from '../ui/builders/satbControls.js';
import { renderStaff } from '../rendering/staff.js';
import { updatePanningCursor } from '../rendering/staffPanning.js';
import { getAccidentalForNote } from '../utils/keySignature.js';

// Track active SATB oscillators
let activeSATBOscillators = [];

/**
 * Convert SATB exercise to stanza format for the player
 */
function convertSATBToStanza(exercise) {
  // Combine all notes from all parts, sorted by startTime
  const allNotes = [];
  
  Object.values(exercise.parts).forEach(partNotes => {
    allNotes.push(...partNotes);
  });
  
  // Sort by startTime
  allNotes.sort((a, b) => a.startTime - b.startTime);

  // Annotate with accidentals so playback rendering matches preview rendering.
  const tonic = exercise.midiKeyMidi;
  const mode = exercise.midiKeyMode || 'major';
  const annotated = allNotes.map(n => ({
    ...n,
    accidental: getAccidentalForNote(n.midi, tonic, mode)
  }));
  
  return {
    label: exercise.label,
    duration: exercise.duration,
    notes: annotated,
    parts: exercise.parts // Keep parts structure for rendering
  };
}

/**
 * Play SATB exercise
 */
export async function playSATBExercise() {
  await ensureAudioContext();
  
  if (appState.satb.isPlaying) {
    return; // Already playing
  }
  
  appState.satb.isPlaying = true;
  updateSatbButton(true);
  
  const badge = getElementById('satbBadge');
  setTextContent(badge, '—');
  
  // Get selected exercise
  const exerciseSelect = getElementById('satbExercise');
  const exerciseIndex = parseInt(exerciseSelect.value) || 0;
  const exercises = getAllSATBExercises(); // Include MIDI exercises
  const baseExercise = exercises[exerciseIndex];
  const exercise = getTransposedExercise(baseExercise, appState.satb.transposeSemis);
  
  if (!exercise) {
    appState.satb.isPlaying = false;
    updateSatbButton(false);
    setTextContent(badge, 'No exercise selected');
    return;
  }
  
  appState.satb.currentExercise = baseExercise;

  // Ensure staff key context exists during playback (used for solfege mapping + key signature spacing)
  if (Number.isFinite(exercise.midiKeyMidi)) {
    appState.staff.keyTonic = exercise.midiKeyMidi;
    appState.staff.keyMode = exercise.midiKeyMode || 'major';
    appState.staff.satbPreviewMode = true;
  }
  
  // Convert to stanza format
  const stanza = convertSATBToStanza(exercise);
  
  // Create audio setup callback for SATB multi-part playback
  const audioSetup = async (scaledStanza, sequenceId) => {
    // Schedule all notes to play at their times with part volumes
    scheduleNotes(scaledStanza.notes, sequenceId, async (note, seqId) => {
      if (!isValidSequence(seqId) || !appState.satb.isPlaying) {
        return;
      }
      
      // Play note with part-specific volume
      const partVolume = appState.satb.partVolumes[note.part] || 0.7;
      const oscillator = await playNote(note, seqId, partVolume, appState.satb.partVolumes);
      
      if (oscillator) {
        // Track this oscillator
        activeSATBOscillators.push(oscillator);
        
        // Play for the note duration
        const stillValid = await waitWithValidation(
          note.duration * 1000,
          seqId,
          () => appState.satb.isPlaying
        );
        
        // Only stop if this is still the current sequence
        if (stillValid && isValidSequence(seqId)) {
          // Note will stop automatically after duration
          const index = activeSATBOscillators.indexOf(oscillator);
          if (index > -1) {
            activeSATBOscillators.splice(index, 1);
          }
        }
      }
    });
    
    // Don't wait here - return immediately and let the sequence player handle timing
  };
  
  // Start the sequence using the player
  await stanzaSequencePlayer.startSequence([stanza], {
    tempo: appState.staff.tempo,
    baseGain: 0.15, // Base gain, but part volumes will override
    onStanzaStart: (stanza, index, sequenceId) => {
      // Update badge
      if (stanza.label) {
        setTextContent(badge, stanza.label);
      }
    },
    onStanzaEnd: (stanza, index, sequenceId) => {
      // Stanza ended
    },
    audioSetup: audioSetup,
    partVolumes: appState.satb.partVolumes,
    onComplete: () => {
      appState.satb.isPlaying = false;
      updateSatbButton(false);
      
      const sequenceId = getCurrentSequenceId();
      setTextContent(badge, 'done');
      setTimeout(() => {
        if (isValidSequence(sequenceId)) {
          setTextContent(badge, '—');
        }
      }, 1500);
    },
    onStop: () => {
      appState.satb.isPlaying = false;
      updateSatbButton(false);
      stopAllSATBOscillators();
      stopAllDroneOscillators();
      
      const sequenceId = getCurrentSequenceId();
      setTextContent(badge, 'stopped');
      setTimeout(() => {
        if (isValidSequence(sequenceId)) {
          setTextContent(badge, '—');
        }
      }, 1000);
    }
  });
  
  // Cleanup if sequence ended normally
  if (appState.satb.isPlaying) {
    appState.satb.isPlaying = false;
    updateSatbButton(false);
  }
  stopAllSATBOscillators();
  stopAllDroneOscillators();
}

/**
 * Stop SATB exercise
 */
export function stopSATBExercise() {
  if (!appState.satb.isPlaying) {
    return;
  }
  
  stanzaSequencePlayer.stopSequence();

  // Restore the current exercise on the staff so it stays visible after stopping
  if (appState.satb.currentExercise) {
    displaySATBExerciseOnStaff(appState.satb.currentExercise);
  }
}

/**
 * Stop all SATB oscillators
 */
function stopAllSATBOscillators() {
  activeSATBOscillators.forEach(oscillator => {
    // Oscillators are managed by audioPlayer, but we can clear the array
  });
  activeSATBOscillators = [];
}

/**
 * Pause SATB exercise
 */
export function pauseSATBExercise() {
  if (!appState.satb.isPlaying || stanzaSequencePlayer.isPaused) {
    return;
  }
  
  stanzaSequencePlayer.pauseSequence();
  updateSatbButton(true, true);
}

/**
 * Resume SATB exercise
 */
export function resumeSATBExercise() {
  if (!appState.satb.isPlaying || !stanzaSequencePlayer.isPaused) {
    return;
  }
  
  stanzaSequencePlayer.resumeSequence();
  updateSatbButton(true, false);
}

/**
 * Update SATB button state
 */
function updateSatbButton(isPlaying, isPaused = false) {
  const playButton = getElementById('btnSatbPlay');
  const pauseButton = getElementById('btnSatbPause');
  const resumeButton = getElementById('btnSatbResume');
  const stopButton = getElementById('btnSatbStop');
  const tempoSlider = getElementById('satbTempo');
  
  if (playButton) {
    if (isPlaying) {
      playButton.style.display = 'none';
    } else {
      playButton.style.display = '';
    }
  }
  
  if (pauseButton) {
    if (isPlaying && !isPaused) {
      pauseButton.style.display = '';
    } else {
      pauseButton.style.display = 'none';
    }
  }
  
  if (resumeButton) {
    if (isPlaying && isPaused) {
      resumeButton.style.display = '';
    } else {
      resumeButton.style.display = 'none';
    }
  }
  
  if (stopButton) {
    if (isPlaying) {
      stopButton.style.display = '';
    } else {
      stopButton.style.display = 'none';
    }
  }
  
  // Enable/disable tempo slider based on playback state
  // Disable during playback to prevent timing issues
  if (tempoSlider) {
    tempoSlider.disabled = isPlaying;
  }
}

/**
 * Display an exercise on the staff (without playing)
 * Exported so handlers and tabs can use it
 */
export async function displaySATBExerciseOnStaff(exercise) {
  if (!exercise) return;
  
  // Store the base exercise so getDoMidiForDisplay() can access it
  appState.satb.currentExercise = exercise;

  const transposed = getTransposedExercise(exercise, appState.satb.transposeSemis);
  
  // Convert SATB exercise to notes format for display
  const allNotes = [];
  Object.values(transposed.parts).forEach(partNotes => {
    allNotes.push(...partNotes);
  });
  allNotes.sort((a, b) => a.startTime - b.startTime);
  
  // Annotate notes with accidental information
  const { getAccidentalForNote } = await import('../utils/keySignature.js');
  const tonic = transposed.midiKeyMidi;
  const mode = transposed.midiKeyMode || 'major';
  
  const annotatedNotes = allNotes.map(note => ({
    ...note,
    accidental: getAccidentalForNote(note.midi, tonic, mode)
  }));
  
  // Set notes for display (scrolling mode off, so they show statically)
  appState.staff.notes = annotatedNotes;
  appState.staff.scrollingMode = false;
  appState.staff.isPlaying = false;
  appState.staff.currentTime = 0;
  appState.staff.playheadX = 0;
  appState.staff.satbPreviewMode = true; // Mark as SATB preview mode
  
  // Store key info for staff rendering
  appState.staff.keyTonic = tonic;
  appState.staff.keyMode = mode;
  
  // Re-render staff to show the exercise
  renderStaff();
  
  // Update panning cursor (panning not available in preview mode)
  updatePanningCursor();

  // Update key label
  updateSatbKeyLabel(exercise, appState.satb.transposeSemis);
}

/**
 * Initialize SATB controls
 */
export async function initializeSATBControls() {
  // Build part selection buttons
  buildPartSelectionButtons();
  
  // Build volume controls
  buildPartVolumeControls();
  
  // Pre-load Amazing Grace MIDI file (must complete before building exercise selection)
  await preloadAmazingGrace();
  
  // Build exercise selection (includes MIDI exercises now)
  const exercises = getAllSATBExercises();
  buildExerciseSelection(exercises);
  
  // Store the default exercise but don't display it yet
  // It will be displayed when the user switches to the SATB tab
  if (exercises.length > 0) {
    appState.satb.currentExercise = exercises[0];
    // Don't call displaySATBExerciseOnStaff here - let the tab system handle it
    // when the user switches to the SATB tab
  }
}

/**
 * Handle part selection
 */
export function handlePartSelection(part) {
  appState.satb.aimPart = part;
  updatePartSelection(part);
  // Re-render staff to highlight selected part
  // This will be handled by staff rendering
}

/**
 * Get current SATB exercise
 */
export function getCurrentSATBExercise() {
  return appState.satb.currentExercise;
}

/**
 * Load MIDI file and add to exercises
 * @param {ArrayBuffer} arrayBuffer - MIDI file data
 * @param {string} label - Exercise label
 */
export async function loadMidiExercise(arrayBuffer, label, options = {}) {
  const { parseMidiToExercise } = await import('../utils/midiParser.js');
  
  try {
    const { exercise: midiExercise } = await parseMidiToExercise(arrayBuffer, label, options);
    const exercise = createExerciseFromMidi(midiExercise);
    
    // Add to MIDI exercises array
    appState.satb.midiExercises.push(exercise);
    
    // Update exercise selection dropdown
    const allExercises = getAllSATBExercises();
    buildExerciseSelection(allExercises);
    
    return exercise;
  } catch (error) {
    console.error('Error loading MIDI exercise:', error);
    throw error;
  }
}

/**
 * Pre-load Amazing Grace MIDI file
 */
export async function preloadAmazingGrace() {
  try {
    const response = await fetch('./midi/330-Amazing_Grace.mid');
    if (!response.ok) {
      console.warn('Could not load Amazing Grace MIDI file');
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    await loadMidiExercise(arrayBuffer, 'Amazing Grace', {
      forceKey: { tonic: 7, mode: 'major' } // G major
    });
  } catch (error) {
    console.warn('Error preloading Amazing Grace:', error);
    // Don't throw - this is optional
  }
}

/**
 * Get all available SATB exercises (manual + MIDI)
 */
export function getAllSATBExercises() {
  const manualExercises = getAllSATBExercisesFromData();
  const midiExercises = appState.satb.midiExercises || [];
  return [...manualExercises, ...midiExercises];
}

export function setSatbTranspose(semis) {
  appState.satb.transposeSemis = Math.max(-12, Math.min(12, semis));
  if (appState.satb.currentExercise) {
    displaySATBExerciseOnStaff(appState.satb.currentExercise);
  }
}

function getTransposedExercise(exercise, semis) {
  if (!exercise) return exercise;
  if (!semis) return exercise;

  const cloneParts = {};
  Object.entries(exercise.parts || {}).forEach(([part, notes]) => {
    cloneParts[part] = (notes || []).map(n => ({
      ...n,
      midi: n.midi + semis
    }));
  });

  const clone = {
    ...exercise,
    parts: cloneParts
  };

  if (Number.isFinite(exercise.midiKeyMidi)) {
    clone.midiKeyMidi = (exercise.midiKeyMidi + semis + 12) % 12;
  }
  if (exercise.midiKeyMode) {
    clone.midiKeyMode = exercise.midiKeyMode;
  }

  return clone;
}

export function changeSatbTranspose(delta) {
  const next = (appState.satb.transposeSemis || 0) + delta;
  setSatbTranspose(next);
}

function updateSatbKeyLabel(baseExercise, semis) {
  const labelEl = document.getElementById('satbKeyLabel');
  if (!labelEl) return;
  const pc = baseExercise?.midiKeyMidi;
  const mode = baseExercise?.midiKeyMode || 'major';
  if (!Number.isFinite(pc)) {
    labelEl.textContent = '—';
    return;
  }
  const transposedPc = ((pc + semis) % 12 + 12) % 12;
  const names = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const modeLabel = mode === 'minor' ? 'min' : 'maj';
  labelEl.textContent = `${names[transposedPc]} ${modeLabel}`;
}

