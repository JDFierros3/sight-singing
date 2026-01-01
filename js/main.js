/**
 * Application entry point with clear initialization steps
 */

import { buildNoteSelectionMenus, buildChordRootMenu, buildChordTypeMenu } from './ui/builders/menus.js';
import { buildChordQuickButtons, buildDroneDegreeButtons, buildTargetButtons } from './ui/builders/buttons.js';
import { initializeTabSystem } from './ui/components/tabs.js';
import { renderStaff } from './rendering/staff.js';
import { getCurrentPitch } from './pitch/detection.js';
import { appState } from './state/appState.js';
import { CHORDS, DEGREE_SEMITONES } from './config/constants.js';
import { getElementById } from './utils/dom.js';
import { getRomanNumeral } from './utils/musicTheory.js';
import {
  handleA4TuningChange,
  handleDoNoteChange,
  handleMinNoteChange,
  handleMaxNoteChange,
  handleToleranceChange,
  handleZoomChange,
  handlePlayAimChange,
  handleScaleOnlyChange,
  handleChordRootChange,
  handleChordTypeChange,
  handleDroneGainChange,
  handleStartDroneClick,
  handleStopDroneClick,
  handleStartMicClick,
  handleStopMicClick,
  handleWarmupClick,
  handleWarmupTempoChange,
  handlePlayHidden2Click,
  handlePlayHidden3Click,
  handleRevealHiddenClick,
  handlePlayIntervalClick,
  handleShowIntervalClick,
  handleSATBPlayClick,
  handleSATBStopClick,
  handleSATBPartClick,
  handleSATBTempoChange,
  handleSATBExerciseChange,
  handleMidiFileSelect,
  handleIntervalDifficultyPreset,
  handleClusterDifficultyPreset
} from './ui/handlers/inputs.js';
import { initializeSATBControls } from './exercises/satb.js';
import { handleGlobalKeyPress } from './ui/handlers/keyboard.js';
import { startMicrophone, stopMicrophone } from './audio/microphone.js';
import { startDroneWithFrequencies } from './audio/drone.js';
import { ensureAudioContext } from './audio/context.js';
import { getDroneFrequencies } from './state/appState.js';
import { initializeStaffPanning } from './rendering/staffPanning.js';
// Tests are imported when needed
// import './tests/tests.js';

function initializeApplication() {
  setupApplicationState();
  buildUserInterface();
  wireUpEventHandlers();
  setupKeyboardShortcuts();
  setupCustomEvents();
  startRenderLoop();
  checkBrowserCompatibility();
}

function setupApplicationState() {
  // State is initialized in appState.js module
  // This function is a placeholder for any runtime state setup
}

function buildUserInterface() {
  buildNoteSelectionMenus();
  buildChordRootMenu();
  buildChordTypeMenu();
  
  buildChordQuickButtons(handleChordQuickButtonClick);
  buildDroneDegreeButtons(handleDroneDegreeToggle);
  buildTargetButtons();
  
  initializeTabSystem();
  
  // Initialize SATB controls
  initializeSATBControls();
  
  // Initialize staff panning (for manual panning when not playing)
  initializeStaffPanning();
  
  renderStaff();
}

function handleChordQuickButtonClick(chordName) {
  appState.drone.chord = chordName;
  appState.drone.semis = CHORDS[chordName];
  
  buildDroneDegreeButtons(handleDroneDegreeToggle);
  buildTargetButtons();
  
  if (appState.drone.on) {
    restartDrone();
  }
}

function handleDroneDegreeToggle(newSemis) {
  appState.drone.semis = newSemis;
  
  if (appState.drone.on) {
    restartDrone();
  }
  
  buildTargetButtons();
}


function wireUpEventHandlers() {
  setupTuningControls();
  setupDisplayControls();
  setupDroneControls();
  setupTargetControls();
  setupExerciseControls();
}

function setupTuningControls() {
  getElementById('a4').addEventListener('change', handleA4TuningChange);
  getElementById('doNote').addEventListener('change', handleDoNoteChange);
  getElementById('minNote').addEventListener('change', handleMinNoteChange);
  getElementById('maxNote').addEventListener('change', handleMaxNoteChange);
}

function setupDisplayControls() {
  getElementById('tolerance').addEventListener('input', handleToleranceChange);
  getElementById('zoom').addEventListener('input', handleZoomChange);
  getElementById('playAim').addEventListener('change', handlePlayAimChange);
  
  // Setup diatonic toggles for each exercise panel
  const scaleOnlyCheckboxes = ['onScaleOnly-cluster', 'onScaleOnly-intervals', 'onScaleOnly-satb'];
  scaleOnlyCheckboxes.forEach(id => {
    const checkbox = getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', handleScaleOnlyChange);
      // Sync initial state
      checkbox.checked = appState.exercise.onScaleOnly;
    }
  });
}

function setupDroneControls() {
  getElementById('chordRoot').addEventListener('change', handleChordRootChange);
  getElementById('chordSelect').addEventListener('change', handleChordTypeChange);
  getElementById('droneGain').addEventListener('input', handleDroneGainChange);
  getElementById('startDrone').onclick = handleStartDroneClick;
  getElementById('stopDrone').onclick = handleStopDroneClick;
}

function setupTargetControls() {
  getElementById('startMic').onclick = handleStartMicClick;
  getElementById('stopMic').onclick = handleStopMicClick;
}

function setupExerciseControls() {
  getElementById('playHidden2').onclick = handlePlayHidden2Click;
  getElementById('playHidden3').onclick = handlePlayHidden3Click;
  getElementById('revealHidden').onclick = handleRevealHiddenClick;
  getElementById('playInterval').onclick = handlePlayIntervalClick;
  getElementById('showInterval').onclick = handleShowIntervalClick;
  
  // SATB controls
  const btnSatbPlay = getElementById('btnSatbPlay');
  const btnSatbStop = getElementById('btnSatbStop');
  const satbTempo = getElementById('satbTempo');
  const satbExercise = getElementById('satbExercise');
  const satbPartSelection = getElementById('satbPartSelection');
  
  if (btnSatbPlay) {
    btnSatbPlay.onclick = handleSATBPlayClick;
  }
  if (btnSatbStop) {
    btnSatbStop.onclick = handleSATBStopClick;
  }
  if (satbTempo) {
    satbTempo.addEventListener('input', handleSATBTempoChange);
    // Update display
    const tempoValue = getElementById('satbTempoValue');
    if (tempoValue) {
      tempoValue.textContent = satbTempo.value;
    }
  }
  if (satbExercise) {
    satbExercise.addEventListener('change', handleSATBExerciseChange);
  }
  if (satbPartSelection) {
    satbPartSelection.addEventListener('click', handleSATBPartClick);
  }
  
  const satbMidiFile = getElementById('satbMidiFile');
  if (satbMidiFile) {
    satbMidiFile.addEventListener('change', handleMidiFileSelect);
  }
  
  setupDifficultyButtons();
  getElementById('btnWarmup').onclick = handleWarmupClick;
  getElementById('warmupTempo').addEventListener('input', handleWarmupTempoChange);
}

function setupDifficultyButtons() {
  const buttons = document.querySelectorAll('.difficulty-btn');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const difficulty = button.getAttribute('data-difficulty');
      const exerciseType = button.getAttribute('data-exercise');
      
      if (exerciseType === 'interval') {
        handleIntervalDifficultyPreset(difficulty);
      } else if (exerciseType === 'cluster') {
        handleClusterDifficultyPreset(difficulty);
      }
    });
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', handleGlobalKeyPress);
}

function setupCustomEvents() {
  window.addEventListener('app:toggleMic', handleToggleMicEvent);
}

function handleToggleMicEvent() {
  if (window.__micOn) {
    stopMicrophone();
    window.__micOn = false;
  } else {
    startMicrophone();
    window.__micOn = true;
  }
}

function startRenderLoop() {
  function tick() {
    getCurrentPitch();
    renderStaff();
    requestAnimationFrame(tick);
  }
  
  tick();
}

function checkBrowserCompatibility() {
  const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  
  if (!hasGetUserMedia) {
    alert('Your browser needs microphone support (getUserMedia).');
  }
}

function restartDrone() {
  const frequencies = getDroneFrequencies();
  const gain = appState.drone.gain;
  startDroneWithFrequencies(frequencies, gain);
}

initializeApplication();
