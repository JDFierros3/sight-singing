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
import { buildChordRootButtons, buildChordQualityButtons, buildChordInversionButtons } from '../builders/chordButtons.js';
import { buildIndividualVolumeControls } from '../builders/volumeControls.js';
import { runWarmupSequence, stopWarmupSequence } from '../../exercises/warmup.js';
import { setTempo } from '../../rendering/scrollingStaff.js';
import { playHiddenCluster, revealClusterNotes } from '../../exercises/cluster.js';
import { playIntervalExercise, revealIntervalSolution } from '../../exercises/intervals.js';
import { playSATBExercise, stopSATBExercise, pauseSATBExercise, resumeSATBExercise, handlePartSelection, getAllSATBExercises, displaySATBExerciseOnStaff, loadMidiExercise, setSatbTranspose } from '../../exercises/satb.js';
import * as transport from '../components/transport.js';
import { initializeFlashcards, nextFlashcard, flipFlashcard, setFlashcardMode } from '../../exercises/flashcards.js';
import { openHymnBrowser } from '../builders/satbControls.js';
import { getCurrentPitch } from '../../pitch/detection.js';
import {
  browseLiveSingHymns, setLiveSingPart, setLiveSingEar, setLiveSingSoftness,
  setLiveSingTempo, setLiveSingDo, armLiveSing, playLiveSing, stopLiveSing
} from '../../exercises/liveSing.js';

export function handleA4TuningChange(event) {
  const value = Number(event.target.value) || 440;
  updateTuningSetting('a4', value);
  transport.stopAllPlayback?.();
}

export async function handleInstrumentChange(event) {
  const value = event.target.value;
  updateTuningSetting('instrument', value);
  
  // Stop any currently playing sounds first
  transport.stopAllPlayback?.();
  
  const select = event.target;

  // Switch back to sine immediately by unloading the sampler.
  if (value === 'sine') {
    try {
      const { unloadInstrument } = await import('../../audio/instruments.js');
      unloadInstrument();
    } catch (error) {
      // ignore; oscillator mode will be used if sampler isn't available
    }
    return;
  }

  // Load the new instrument (sampled)
  select.disabled = true;
  try {
    const { loadInstrument } = await import('../../audio/instruments.js');
    await loadInstrument(value);
  } catch (error) {
    console.error('Failed to load instrument:', error);
    // Revert to sine
    updateTuningSetting('instrument', 'sine');
    select.value = 'sine';
    try {
      const { unloadInstrument } = await import('../../audio/instruments.js');
      unloadInstrument();
    } catch (e) {
      // ignore
    }
  } finally {
    select.disabled = false;
  }
}

export function handleDoNoteChange(event) {
  const value = Number(event.target.value);
  updateTuningSetting('doMidi', value);
  renderStaff();
  
  if (appState.drone.on) {
    restartDrone();
  }

  transport.stopAllPlayback?.();
}

export function handleShowAccidentalsAndKeyChange(event) {
  const value = event.target.checked;
  updateDisplaySetting('showAccidentalsAndKey', value);
  renderStaff();
}

export function handleToleranceChange(event) {
  const value = Number(event.target.value);
  updateDisplaySetting('tolerance', value);
  transport.stopAllPlayback?.();
}

export function handleZoomChange(event) {
  const value = Number(event.target.value);
  updateDisplaySetting('zoom', value);
  renderStaff();
  transport.stopAllPlayback?.();
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
  transport.stopAllPlayback?.();
}

export function handleHideAnswersIntervalsChange(event) {
  const value = event.target.checked;
  appState.exercise.hideAnswers.intervals = value;
  // If user disables hiding, immediately show current answers (if any)
  if (!value) {
    appState.exercise.showAnswers.intervals = true;
  } else {
    appState.exercise.showAnswers.intervals = false;
  }
  renderStaff();
}

export function handleHideAnswersClusterChange(event) {
  const value = event.target.checked;
  appState.exercise.hideAnswers.cluster = value;
  if (!value) {
    appState.exercise.showAnswers.cluster = true;
  } else {
    appState.exercise.showAnswers.cluster = false;
  }
  renderStaff();
}

export function handleClusterThinkTimeChange(event) {
  const value = Number(event.target.value);
  appState.exercise.clusterThinkTime = value;
  const label = getElementById('clusterThinkTimeValue');
  if (label) {
    label.textContent = value;
  }
}

function revealAnswersBriefly(kind, ms = null) {
  // Always show answers on staff when revealing. Do not auto-hide; answers persist
  // until the next play or a tab switch clears the staff.
  appState.exercise.showAnswers[kind] = true;
  renderStaff();
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

// Track preview timeout to prevent interference
let dronePreviewTimeout = null;

/**
 * Preview drone briefly (~0.5 seconds) when buttons are clicked
 */
async function previewDroneBriefly() {
  // Clear any existing preview
  if (dronePreviewTimeout) {
    clearTimeout(dronePreviewTimeout);
    dronePreviewTimeout = null;
  }
  
  // If drone is already on, don't preview (user manually started it)
  if (appState.drone.on) {
    return;
  }
  
  await ensureAudioContext();
  const frequencies = getDroneFrequencies();
  startDroneWithFrequencies(frequencies, appState.drone.gain);
  
  // Stop after ~500ms
  dronePreviewTimeout = setTimeout(() => {
    stopAllDroneOscillators();
    dronePreviewTimeout = null;
  }, 500);
}

function restartDrone() {
  if (appState.drone.on) {
    const frequencies = getDroneFrequencies();
    startDroneWithFrequencies(frequencies, appState.drone.gain);
    updateIndividualVolumeControls();
  }
}

export function handleChordRootButtonClick(event) {
  const button = event.target.closest('[data-chord-root]');
  if (!button) return;
  
  const value = Number(button.getAttribute('data-chord-root'));
  appState.drone.rootSemi = value;
  
  // Automatically set chord quality to natural quality for this scale degree
  const naturalChord = NATURAL_CHORD_QUALITIES[value];
  if (naturalChord) {
    appState.drone.chord = naturalChord;
    appState.drone.semis = CHORDS[naturalChord];
    
    // Rebuild all button groups to update selected states
    buildChordRootButtons();
    buildChordQualityButtons();
    buildChordInversionButtons();
  } else {
    buildChordRootButtons();
  }
  
  renderStaff();
  
  if (appState.drone.on) {
    restartDrone();
  } else {
    previewDroneBriefly();
  }

  transport.stopAllPlayback?.();
}

export function handleChordQualityButtonClick(event) {
  const button = event.target.closest('[data-chord-quality]');
  if (!button) return;
  
  const chordName = button.getAttribute('data-chord-quality');
  appState.drone.chord = chordName;
  appState.drone.semis = CHORDS[chordName];
  
  // Rebuild button groups to update selected states
  buildChordQualityButtons();
  buildChordInversionButtons(); // Inversion buttons may need to update
  
  renderStaff();
  
  if (appState.drone.on) {
    restartDrone();
  } else {
    previewDroneBriefly();
  }

  transport.stopAllPlayback?.();
}

export function handleChordInversionButtonClick(event) {
  const button = event.target.closest('[data-chord-inversion]');
  if (!button) return;
  
  const value = Number(button.getAttribute('data-chord-inversion'));
  appState.drone.inversion = value;
  
  // Rebuild inversion buttons to update selected state
  buildChordInversionButtons();
  
  renderStaff();
  
  if (appState.drone.on) {
    restartDrone();
  } else {
    previewDroneBriefly();
  }

  transport.stopAllPlayback?.();
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

export function handleFlashcardNextClick() {
  nextFlashcard();
}

export function handleFlashcardFlipClick() {
  flipFlashcard();
}

export function handleFlashcardModeChange(event) {
  setFlashcardMode(event.target.value);
}


// (Tab system calls initializeFlashcards() on tab switch)

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
  transport.stopAllPlayback?.();
}

export function handlePlayHidden2Click() {
  // Reset staff answer visibility on new exercise
  appState.exercise.showAnswers.cluster = false;
  playHiddenCluster(2);
}

export function handlePlayHidden3Click() {
  appState.exercise.showAnswers.cluster = false;
  playHiddenCluster(3);
}

export function handleRevealHiddenClick() {
  revealClusterNotes();
  if (appState.exercise.hideAnswers.cluster) {
    revealAnswersBriefly('cluster');
  } else {
    appState.exercise.showAnswers.cluster = true;
    renderStaff();
  }
}

export function handlePlayIntervalClick() {
  appState.exercise.showAnswers.intervals = false;
  playIntervalExercise();
}

export function handleShowIntervalClick() {
  revealIntervalSolution();
  if (appState.exercise.hideAnswers.intervals) {
    revealAnswersBriefly('intervals');
  } else {
    appState.exercise.showAnswers.intervals = true;
    renderStaff();
  }
}

export function handleSATBPlayClick() {
  playSATBExercise();
}

export function handleSATBPauseClick() {
  pauseSATBExercise();
}

export function handleSATBResumeClick() {
  resumeSATBExercise();
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
  
  // Note: Tempo slider enable/disable is now handled in satb.js updateSatbButton()
  // which is called when playback starts/stops
}

export function handleSATBBrowseHymnsClick() {
  // Open hymn browser modal (replaces dropdown)
  openHymnBrowser();
}

export function handleSATBTransposeChange(event) {
  const semis = parseInt(event.target.value) || 0;
  setSatbTranspose(semis);
  transport.stopAllPlayback?.();
}

/* ------------------------------------------------------------ Live Sing --- */

export function handleLiveSingBrowseClick() {
  browseLiveSingHymns();
}

export function handleLiveSingPartClick(event) {
  const part = event.target.dataset.part;
  if (part) setLiveSingPart(part);
}

export function handleLiveSingEarClick(event) {
  const ear = event.target.dataset.ear;
  if (ear) setLiveSingEar(ear);
}

export function handleLiveSingVolumeChange(event) {
  setLiveSingSoftness(event.target.value);
}

export function handleLiveSingTempoChange(event) {
  setLiveSingTempo(event.target.value);
}

export function handleLiveSingSetDoClick() {
  setLiveSingDo();
}

export function handleLiveSingArmClick() {
  armLiveSing();
}

export function handleLiveSingPlayClick() {
  playLiveSing();
}

export function handleLiveSingStopClick() {
  stopLiveSing();
}

/**
 * Load MIDI exercise with key prompt if key signature is not explicit
 */
async function loadMidiExerciseWithKeyPrompt(arrayBuffer, label) {
  const { parseMidiFile, analyzeKeyFromMidiData } = await import('../../utils/midiParser.js');

  // First, check if the MIDI file has an explicit key signature
  const midiData = await parseMidiFile(arrayBuffer);

  let keyOptions = {};
  if (Number.isFinite(midiData.keyMidi)) {
    // Explicit key signature found - use it
    keyOptions.forceKey = { tonic: midiData.keyMidi, mode: 'major' };
  } else {
    // No explicit key signature - prompt user
    const guess = analyzeKeyFromMidiData ? analyzeKeyFromMidiData(midiData) : null;
    const userKey = await promptForKey(label, guess);
    if (!userKey) {
      throw new Error('Key selection cancelled');
    }
    keyOptions.forceKey = userKey;
  }

  // Load the exercise with the chosen key
  return await loadMidiExercise(arrayBuffer, label, keyOptions);
}

/**
 * Prompt user to select a key for MIDI file without explicit key signature
 */
function promptForKey(label, guess = null) {
  const keyNames = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];
  const keyValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const guessKey = guess && Number.isFinite(guess.tonic) ? guess.tonic : 7;
  const guessMode = guess && (guess.mode === 'minor' || guess.mode === 'major') ? guess.mode : 'major';
  const guessPctRaw = guess && typeof guess.confidence === 'number' ? Math.round(guess.confidence * 100) : null;
  const guessPct = guessPctRaw === null ? null : Math.max(1, Math.min(99, guessPctRaw));
  const guessLabel = guessPct === null ? '' : (guessPct < 15 ? ' (low confidence)' : '');

  return new Promise((resolve) => {
    // Create modal dialog
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #1a1f35;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #262b44;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 450px;
      width: 90%;
    `;

    dialog.innerHTML = `
      <h3 style="margin-top: 0; color: #b7c0ce;">Select Key for "${label}"</h3>
      <p style="margin: 10px 0; color: #7a8499;">This MIDI file doesn't specify a key signature. Please select the correct key:</p>
      ${guessPct === null ? '' : `<p style="margin: 6px 0 0; color: #7a8499;"><strong>Best guess:</strong> ${keyNames[guessKey]} ${guessMode} (${guessPct}%)${guessLabel}</p>`}
      <div style="display: flex; gap: 10px; margin: 15px 0;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 5px; color: #b7c0ce; font-weight: 500;">Key:</label>
          <select id="keySelect" style="width: 100%; padding: 8px; border: 1px solid #2a3051; border-radius: 6px; background: #0f1426; color: #b7c0ce;">
            ${keyNames.map((name, i) => 
              `<option value="${keyValues[i]}"${i === guessKey ? ' selected' : ''}>${name}</option>`
            ).join('')}
          </select>
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 5px; color: #b7c0ce; font-weight: 500;">Mode:</label>
          <select id="modeSelect" style="width: 100%; padding: 8px; border: 1px solid #2a3051; border-radius: 6px; background: #0f1426; color: #b7c0ce;">
            <option value="major"${guessMode === 'major' ? ' selected' : ''}>Major</option>
            <option value="minor"${guessMode === 'minor' ? ' selected' : ''}>Minor</option>
          </select>
        </div>
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="cancelBtn" style="margin-right: 10px; padding: 8px 16px; background: #2a3051; border: 1px solid #39406a; border-radius: 6px; cursor: pointer; color: #b7c0ce;">Cancel</button>
        <button id="okBtn" style="padding: 8px 16px; background: #7db3fc; color: #0f1426; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">OK</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);

    const keySelect = dialog.querySelector('#keySelect');
    const modeSelect = dialog.querySelector('#modeSelect');
    const cancelBtn = dialog.querySelector('#cancelBtn');
    const okBtn = dialog.querySelector('#okBtn');

    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(null);
    };

    okBtn.onclick = () => {
      const selectedKey = parseInt(keySelect.value);
      const selectedMode = modeSelect.value;
      document.body.removeChild(modal);
      resolve({ tonic: selectedKey, mode: selectedMode });
    };

    // Handle Enter key
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        okBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });

    // Focus the key select element
    keySelect.focus();
  });
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

    // Load MIDI file and prompt for key if not explicitly stated
    const exercise = await loadMidiExerciseWithKeyPrompt(arrayBuffer, label);
    
    // Set as current exercise and display on staff
    if (exercise) {
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
  // Update live description
  const descEl = getElementById('intervalDifficultyDesc');
  if (descEl) descEl.textContent = preset.description;
  transport.stopAllPlayback?.();
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
  // Update live description
  const descEl = getElementById('clusterDifficultyDesc');
  if (descEl) descEl.textContent = preset.description;
  transport.stopAllPlayback?.();
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

