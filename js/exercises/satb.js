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
  
  return {
    label: exercise.label,
    duration: exercise.duration,
    notes: allNotes,
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
  const exercise = exercises[exerciseIndex];
  
  if (!exercise) {
    appState.satb.isPlaying = false;
    updateSatbButton(false);
    setTextContent(badge, 'No exercise selected');
    return;
  }
  
  appState.satb.currentExercise = exercise;
  
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
 * Update SATB button state
 */
function updateSatbButton(isPlaying) {
  const playButton = getElementById('btnSatbPlay');
  const stopButton = getElementById('btnSatbStop');
  
  if (playButton) {
    if (isPlaying) {
      playButton.style.display = 'none';
    } else {
      playButton.style.display = '';
    }
  }
  
  if (stopButton) {
    if (isPlaying) {
      stopButton.style.display = '';
    } else {
      stopButton.style.display = 'none';
    }
  }
}

/**
 * Display an exercise on the staff (without playing)
 * Exported so handlers and tabs can use it
 */
export function displaySATBExerciseOnStaff(exercise) {
  if (!exercise) return;
  
  // Store the exercise so getDoMidiForDisplay() can access it
  appState.satb.currentExercise = exercise;
  
  // Convert SATB exercise to notes format for display
  const allNotes = [];
  Object.values(exercise.parts).forEach(partNotes => {
    allNotes.push(...partNotes);
  });
  allNotes.sort((a, b) => a.startTime - b.startTime);
  
  // Set notes for display (scrolling mode off, so they show statically)
  appState.staff.notes = allNotes;
  appState.staff.scrollingMode = false;
  appState.staff.isPlaying = false;
  appState.staff.currentTime = 0;
  appState.staff.playheadX = 0;
  appState.staff.satbPreviewMode = true; // Mark as SATB preview mode
  
  // Re-render staff to show the exercise
  renderStaff();
  
  // Update panning cursor (panning not available in preview mode)
  updatePanningCursor();
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
  
  // Display the default (first) exercise on the staff
  // Use setTimeout to ensure this happens after the tab system is initialized
  if (exercises.length > 0) {
    appState.satb.currentExercise = exercises[0];
    // Delay slightly to ensure DOM is ready and tab system is initialized
    setTimeout(() => {
      displaySATBExerciseOnStaff(exercises[0]);
    }, 10);
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
export async function loadMidiExercise(arrayBuffer, label) {
  const { parseMidiToExercise } = await import('../utils/midiParser.js');
  
  try {
    const midiExercise = await parseMidiToExercise(arrayBuffer, label);
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
    await loadMidiExercise(arrayBuffer, 'Amazing Grace');
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

