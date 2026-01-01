/**
 * Input event handlers - one handler per function
 */

import { getElementById, setTextContent } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { updateTuningSetting, updateDisplaySetting } from '../../state/appState.js';
import { CHORDS, NATURAL_CHORD_QUALITIES, INTERVAL_DIFFICULTY_PRESETS, CLUSTER_DIFFICULTY_PRESETS } from '../../config/constants.js';
import { renderStaff } from '../../rendering/staff.js';
import { getDroneFrequencies } from '../../state/appState.js';
import { startDroneWithFrequencies, stopAllDroneOscillators, updateDroneGain, updateIndividualDroneGain } from '../../audio/drone.js';
import { ensureAudioContext } from '../../audio/context.js';
import { startMicrophone, stopMicrophone } from '../../audio/microphone.js';
import { buildDroneDegreeButtons, buildTargetButtons } from '../builders/buttons.js';
import { buildIndividualVolumeControls } from '../builders/volumeControls.js';
import { runWarmupSequence, stopWarmupSequence } from '../../exercises/warmup.js';
import { setTempo } from '../../rendering/scrollingStaff.js';
import { playHiddenCluster, revealClusterNotes } from '../../exercises/cluster.js';
import { playIntervalExercise, revealIntervalSolution } from '../../exercises/intervals.js';
import { playSATBExercise, stopSATBExercise, handlePartSelection, getAllSATBExercises, displaySATBExerciseOnStaff, loadMidiExercise } from '../../exercises/satb.js';
import { buildExerciseSelection } from '../builders/satbControls.js';
import { getCurrentPitch } from '../../pitch/detection.js';

export function handleA4TuningChange(event) {
  const value = Number(event.target.value) || 440;
  updateTuningSetting('a4', value);
}

export function handleDoNoteChange(event) {
  const value = Number(event.target.value);
  updateTuningSetting('doMidi', value);
  renderStaff();
  
  if (appState.drone.on) {
    restartDrone();
  }
}

export function handleMinNoteChange(event) {
  const value = Number(event.target.value);
  updateTuningSetting('minMidi', value);
  renderStaff();
}

export function handleMaxNoteChange(event) {
  const value = Number(event.target.value);
  updateTuningSetting('maxMidi', value);
  renderStaff();
}

export function handleToleranceChange(event) {
  const value = Number(event.target.value);
  updateDisplaySetting('tolerance', value);
}

export function handleZoomChange(event) {
  const value = Number(event.target.value);
  updateDisplaySetting('zoom', value);
  renderStaff();
}

export function handlePlayAimChange(event) {
  const value = event.target.checked;
  updateDisplaySetting('playAim', value);
}

export function handleScaleOnlyChange(event) {
  const value = event.target.checked;
  appState.exercise.onScaleOnly = value;
  // Sync all checkboxes to the same value
  syncScaleOnlyCheckboxes(value);
}

function syncScaleOnlyCheckboxes(value) {
  const checkboxIds = ['onScaleOnly-cluster', 'onScaleOnly-intervals', 'onScaleOnly-satb'];
  checkboxIds.forEach(id => {
    const checkbox = getElementById(id);
    if (checkbox) {
      checkbox.checked = value;
    }
  });
}

export function handleChordRootChange(event) {
  const value = Number(event.target.value);
  appState.drone.rootSemi = value;
  
  // Automatically set chord quality to natural quality for this scale degree
  const naturalChord = NATURAL_CHORD_QUALITIES[value];
  if (naturalChord) {
    appState.drone.chord = naturalChord;
    appState.drone.semis = CHORDS[naturalChord];
    
    // Update the chord type dropdown to reflect the change
    const chordSelect = getElementById('chordSelect');
    if (chordSelect) {
      chordSelect.value = naturalChord;
    }
  }
  
  buildDroneDegreeButtons(handleDroneSemisChange);
  buildTargetButtons();
  renderStaff();
  
  if (appState.drone.on) {
    restartDrone();
  }
}

export function handleChordTypeChange(event) {
  const chordName = event.target.value;
  appState.drone.chord = chordName;
  appState.drone.semis = CHORDS[chordName];
  
  buildDroneDegreeButtons(handleDroneSemisChange);
  buildTargetButtons();
  
  if (appState.drone.on) {
    restartDrone();
  }
}

function handleDroneSemisChange(newSemis) {
  appState.drone.semis = newSemis;
  
  if (appState.drone.on) {
    restartDrone();
  }
  
  buildTargetButtons();
}

export function handleDroneGainChange(event) {
  const value = Number(event.target.value);
  appState.drone.gain = value;
  
  if (appState.drone.on) {
    updateDroneGain(value);
  }
}

export async function handleStartDroneClick() {
  await ensureAudioContext();
  appState.drone.on = true;
  restartDrone();
  updateIndividualVolumeControls();
}

function updateIndividualVolumeControls() {
  const frequencies = getDroneFrequencies();
  buildIndividualVolumeControls(frequencies);
}

export function handleStopDroneClick() {
  stopAllDroneOscillators();
  appState.drone.on = false;
}

export function handleStartMicClick() {
  startMicrophone();
}

export function handleStopMicClick() {
  stopMicrophone();
}

export function handleWarmupClick() {
  if (appState.exercise.warmupRunning) {
    stopWarmupSequence();
  } else {
    // Get selected stanzas from checkboxes
    const selectedIndices = [];
    for (let i = 0; i < 6; i++) {
      const checkbox = getElementById(`warmupStanza-${i}`);
      if (checkbox && checkbox.checked) {
        selectedIndices.push(i);
      }
    }
    runWarmupSequence(selectedIndices.length > 0 ? selectedIndices : null);
  }
}

export function handleWarmupTempoChange(event) {
  const tempo = Number(event.target.value);
  
  // Don't allow tempo changes during warmup playback
  // This prevents timing issues and multiple warmups from starting
  if (appState.exercise.warmupRunning) {
    // Revert slider to current tempo
    event.target.value = appState.staff.tempo;
    return;
  }
  
  appState.staff.tempo = tempo;
  setTempo(tempo);
}

export function handlePlayHidden2Click() {
  playHiddenCluster(2);
}

export function handlePlayHidden3Click() {
  playHiddenCluster(3);
}

export function handleRevealHiddenClick() {
  revealClusterNotes();
}

export function handlePlayIntervalClick() {
  playIntervalExercise();
}

export function handleShowIntervalClick() {
  revealIntervalSolution();
}

export function handleSATBPlayClick() {
  playSATBExercise();
}

export function handleSATBStopClick() {
  stopSATBExercise();
}

export function handleSATBPartClick(event) {
  const part = event.target.dataset.part;
  if (part) {
    handlePartSelection(part);
    renderStaff(); // Re-render to update highlighting
  }
}

export function handleSATBTempoChange(event) {
  const tempo = parseInt(event.target.value) || 60;
  appState.staff.tempo = tempo;
  
  // Update tempo display
  const tempoValue = getElementById('satbTempoValue');
  if (tempoValue) {
    setTextContent(tempoValue, tempo.toString());
  }
  
  // Disable tempo slider during playback
  if (appState.satb.isPlaying) {
    event.target.disabled = true;
  } else {
    event.target.disabled = false;
  }
}

export function handleSATBExerciseChange(event) {
  // Exercise selection changed - store the selection and display on staff
  const exerciseIndex = parseInt(event.target.value) || 0;
  const exercises = getAllSATBExercises();
  if (exercises[exerciseIndex]) {
    appState.satb.currentExercise = exercises[exerciseIndex];
    
    // Display the exercise on the staff immediately (but don't play it)
    displaySATBExerciseOnStaff(exercises[exerciseIndex]);
  }
}

export async function handleMidiFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  
  // Show loading state
  const badge = getElementById('satbBadge');
  setTextContent(badge, 'Loading MIDI...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const label = file.name.replace(/\.(mid|midi)$/i, '');
    const exercise = await loadMidiExercise(arrayBuffer, label);
    
    // Update exercise selection to show new exercise
    const exercises = getAllSATBExercises();
    buildExerciseSelection(exercises);
    
    // Select the newly loaded exercise
    const exerciseSelect = getElementById('satbExercise');
    const exerciseIndex = exercises.findIndex(ex => ex.label === exercise.label);
    if (exerciseIndex !== -1) {
      exerciseSelect.value = exerciseIndex;
      appState.satb.currentExercise = exercise;
      displaySATBExerciseOnStaff(exercise);
    }
    
    setTextContent(badge, 'MIDI loaded');
    setTimeout(() => {
      setTextContent(badge, '—');
    }, 2000);
  } catch (error) {
    console.error('Error loading MIDI file:', error);
    setTextContent(badge, 'Error loading MIDI');
    setTimeout(() => {
      setTextContent(badge, '—');
    }, 3000);
  }
  
  // Reset file input so same file can be selected again
  event.target.value = '';
}


function restartDrone() {
  const frequencies = getDroneFrequencies();
  const gain = appState.drone.gain;
  startDroneWithFrequencies(frequencies, gain);
}

export function handleIntervalDifficultyPreset(difficulty) {
  const preset = INTERVAL_DIFFICULTY_PRESETS[difficulty];
  if (!preset) {
    return;
  }
  
  appState.exercise.intervalDifficulty = difficulty;
  
  const directionSelect = getElementById('intervalDir');
  const minInput = getElementById('intervalMin');
  const maxInput = getElementById('intervalMax');
  const scaleOnlyCheckbox = getElementById('onScaleOnly-intervals');
  
  if (directionSelect) {
    directionSelect.value = preset.direction;
  }
  if (minInput) {
    minInput.value = preset.minInterval;
  }
  if (maxInput) {
    maxInput.value = preset.maxInterval;
  }
  if (scaleOnlyCheckbox) {
    scaleOnlyCheckbox.checked = preset.onScaleOnly;
    appState.exercise.onScaleOnly = preset.onScaleOnly;
    // Sync to other checkboxes
    syncScaleOnlyCheckboxes(preset.onScaleOnly);
  }
  
  updateDifficultyButtonStates('interval', difficulty);
}

export function handleClusterDifficultyPreset(difficulty) {
  const preset = CLUSTER_DIFFICULTY_PRESETS[difficulty];
  if (!preset) {
    return;
  }
  
  appState.exercise.clusterDifficulty = difficulty;
  
  const scaleOnlyCheckbox = getElementById('onScaleOnly-cluster');
  if (scaleOnlyCheckbox) {
    scaleOnlyCheckbox.checked = preset.onScaleOnly;
    appState.exercise.onScaleOnly = preset.onScaleOnly;
    // Sync to other checkboxes
    syncScaleOnlyCheckboxes(preset.onScaleOnly);
  }
  
  updateDifficultyButtonStates('cluster', difficulty);
}

function updateDifficultyButtonStates(exerciseType, activeDifficulty) {
  const buttons = document.querySelectorAll(`.difficulty-btn[data-exercise="${exerciseType}"]`);
  buttons.forEach(button => {
    const difficulty = button.getAttribute('data-difficulty');
    if (difficulty === activeDifficulty) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

