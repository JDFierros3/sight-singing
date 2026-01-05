/**
 * Application entry point with clear initialization steps
 */

import { buildNoteSelectionMenus, buildChordRootMenu, buildChordTypeMenu } from './ui/builders/menus.js';
import { buildChordQuickButtons, buildDroneDegreeButtons, buildTargetButtons } from './ui/builders/buttons.js';
import { buildSolfegeGuide } from './ui/builders/solfegeGuide.js';
import { initializeTabSystem } from './ui/components/tabs.js';
import { renderStaff } from './rendering/staff.js';
import { getCurrentPitch } from './pitch/detection.js';
import { appState } from './state/appState.js';
import { CHORDS, DEGREE_SEMITONES } from './config/constants.js';
import { getElementById } from './utils/dom.js';
import { getRomanNumeral } from './utils/musicTheory.js';
import * as inputs from './ui/handlers/inputs.js';
import { initializeSATBControls } from './exercises/satb.js';
import { handleGlobalKeyPress } from './ui/handlers/keyboard.js';
import { startMicrophone, stopMicrophone } from './audio/microphone.js';
import { startDroneWithFrequencies } from './audio/drone.js';
import { ensureAudioContext } from './audio/context.js';
import { getDroneFrequencies } from './state/appState.js';
import { initializeStaffPanning } from './rendering/staffPanning.js';
import * as scrollingStaff from './rendering/scrollingStaff.js';
import { handleGlobalPlay, handleGlobalStop, refreshGlobalTransportUI } from './ui/components/transport.js';
import { beepDo } from './audio/doPitch.js';
import { changeSatbTranspose } from './exercises/satb.js';
// Tests are imported when needed
// import './tests/tests.js';

const {
  handleA4TuningChange = () => {},
  handleInstrumentChange = () => {},
  handleDoNoteChange = () => {},
  handleMinNoteChange = () => {},
  handleMaxNoteChange = () => {},
  handleToleranceChange = () => {},
  handleZoomChange = () => {},
  handlePlayAimChange = () => {},
  handleShowKeySignatureChange = () => {},
  handleShowAccidentalsChange = () => {},
  handleScaleOnlyChange = () => {},
  handleHideAnswersIntervalsChange = () => {},
  handleHideAnswersClusterChange = () => {},
  handleClusterThinkTimeChange = () => {},
  handleChordRootChange = () => {},
  handleChordTypeChange = () => {},
  handleDroneGainChange = () => {},
  handleStartDroneClick = () => {},
  handleStopDroneClick = () => {},
  handleStartMicClick = () => {},
  handleStopMicClick = () => {},
  handleWarmupClick = () => {},
  handleWarmupTempoChange = () => {},
  handlePlayHidden2Click = () => {},
  handlePlayHidden3Click = () => {},
  handleRevealHiddenClick = () => {},
  handlePlayIntervalClick = () => {},
  handleShowIntervalClick = () => {},
  handleSATBPlayClick = () => {},
  handleSATBPauseClick = () => {},
  handleSATBResumeClick = () => {},
  handleSATBStopClick = () => {},
  handleSATBPartClick = () => {},
  handleSATBTempoChange = () => {},
  handleSATBExerciseChange = () => {},
  handleSATBTransposeChange = () => {},
  handleMidiFileSelect = () => {},
  handleIntervalDifficultyPreset = () => {},
  handleClusterDifficultyPreset = () => {},
  handleFlashcardNextClick = () => {},
  handleFlashcardFlipClick = () => {},
  handleFlashcardModeChange = () => {},
  handleFlashcardAccidentalsChange = () => {}
} = inputs;

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
  buildSolfegeGuide();
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
  setupHeaderControls();
  setupTuningControls();
  setupDisplayControls();
  setupDroneControls();
  setupTargetControls();
  setupExerciseControls();
}

function setupHeaderControls() {
  const btnPlay = getElementById('btnGlobalPlay');
  const btnStop = getElementById('btnGlobalStop');
  const btnPlayDo = getElementById('btnPlayDo');
  const btnMicToggle = getElementById('btnMicToggle');
  const toggleRibbon = getElementById('toggleRibbon');

  if (btnPlay) {
    btnPlay.onclick = async () => {
      await handleGlobalPlay();
      refreshGlobalTransportUI();
    };
  }

  if (btnStop) {
    btnStop.onclick = () => {
      handleGlobalStop();
      refreshGlobalTransportUI();
    };
  }

  if (btnPlayDo) {
    btnPlayDo.onclick = async () => {
      await beepDo();
    };
  }

  if (btnMicToggle) {
    btnMicToggle.onclick = () => {
      const evt = new CustomEvent('app:toggleMic');
      window.dispatchEvent(evt);
    };
  }

  if (toggleRibbon) {
    toggleRibbon.onclick = () => {
      document.body.classList.toggle('controls-collapsed');
      toggleRibbon.textContent = document.body.classList.contains('controls-collapsed')
        ? 'Show controls'
        : 'Hide controls';
    };
  }

  // Keep staff panning math coherent under responsive layouts / orientation changes.
  window.addEventListener('resize', () => {
    if (typeof scrollingStaff.handleStaffViewportResize === 'function') {
      scrollingStaff.handleStaffViewportResize();
    }
  });

  refreshGlobalTransportUI();
}

function setupTuningControls() {
  getElementById('a4').addEventListener('change', handleA4TuningChange);
  getElementById('instrument')?.addEventListener('change', handleInstrumentChange);
  getElementById('doNote').addEventListener('change', handleDoNoteChange);
  getElementById('minNote').addEventListener('change', handleMinNoteChange);
  getElementById('maxNote').addEventListener('change', handleMaxNoteChange);
}

function setupDisplayControls() {
  getElementById('tolerance').addEventListener('input', handleToleranceChange);
  getElementById('zoom').addEventListener('input', handleZoomChange);
  getElementById('playAim').addEventListener('change', handlePlayAimChange);
  getElementById('showKeySignature')?.addEventListener('change', handleShowKeySignatureChange);
  getElementById('showAccidentals')?.addEventListener('change', handleShowAccidentalsChange);
  
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

  const hideIntervals = getElementById('hideAnswers-intervals');
  if (hideIntervals) {
    hideIntervals.addEventListener('change', handleHideAnswersIntervalsChange);
    // Ensure UI reflects default state (hide answers ON by default)
    hideIntervals.checked = !!appState.exercise.hideAnswers.intervals;
  }
  const hideCluster = getElementById('hideAnswers-cluster');
  if (hideCluster) {
    hideCluster.addEventListener('change', handleHideAnswersClusterChange);
    hideCluster.checked = !!appState.exercise.hideAnswers.cluster;
  }
  
  const clusterThinkTime = getElementById('clusterThinkTime');
  if (clusterThinkTime) {
    clusterThinkTime.addEventListener('input', handleClusterThinkTimeChange);
    clusterThinkTime.value = appState.exercise.clusterThinkTime;
  }
  
  // SATB controls
  const btnSatbPlay = getElementById('btnSatbPlay');
  const btnSatbPause = getElementById('btnSatbPause');
  const btnSatbResume = getElementById('btnSatbResume');
  const btnSatbStop = getElementById('btnSatbStop');
  const satbTempo = getElementById('satbTempo');
  const satbExercise = getElementById('satbExercise');
  const satbTransposeUp = getElementById('btnSatbTransposeUp');
  const satbTransposeDown = getElementById('btnSatbTransposeDown');
  const satbPartSelection = getElementById('satbPartSelection');
  
  if (btnSatbPlay) {
    btnSatbPlay.onclick = handleSATBPlayClick;
  }
  if (btnSatbPause) {
    btnSatbPause.onclick = handleSATBPauseClick;
  }
  if (btnSatbResume) {
    btnSatbResume.onclick = handleSATBResumeClick;
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
  if (satbTransposeUp) {
    satbTransposeUp.onclick = () => changeSatbTranspose(1);
  }
  if (satbTransposeDown) {
    satbTransposeDown.onclick = () => changeSatbTranspose(-1);
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

  // Flashcards
  const flashNext = getElementById('flashcardNext');
  const flashFlip = getElementById('flashcardFlip');
  const flashMode = getElementById('flashcardMode');
  const flashAcc = getElementById('flashcardAccidentals');

  if (flashNext) flashNext.onclick = handleFlashcardNextClick;
  if (flashFlip) flashFlip.onclick = handleFlashcardFlipClick;
  if (flashMode) flashMode.addEventListener('change', handleFlashcardModeChange);
  if (flashAcc) flashAcc.addEventListener('change', handleFlashcardAccidentalsChange);
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
    refreshGlobalTransportUI();
    requestAnimationFrame(tick);
  }
  
  tick();
}

function checkBrowserCompatibility() {
  const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  
  if (!hasGetUserMedia) {
    alert('Your browser needs microphone support (getUserMedia).');
  }
  
  // Check if Tone.js library loaded (for instruments)
  setTimeout(() => {
    if (typeof Tone !== 'undefined') {
      console.log('✅ Tone.js library loaded - instruments available');
      console.log('Tone.js version:', Tone.version);
    } else {
      console.warn('⚠️ Tone.js library not loaded. Only sine waves available. Check internet connection.');
    }
  }, 1000);
}

function restartDrone() {
  const frequencies = getDroneFrequencies();
  const gain = appState.drone.gain;
  startDroneWithFrequencies(frequencies, gain);
}

initializeApplication();
