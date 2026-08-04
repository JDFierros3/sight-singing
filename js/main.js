/**
 * Application entry point with clear initialization steps
 */

import { buildNoteSelectionMenus } from './ui/builders/menus.js';
import { buildChordRootButtons, buildChordQualityButtons, buildChordInversionButtons } from './ui/builders/chordButtons.js';
import { initializeTabSystem, switchToTab } from './ui/components/tabs.js';
import { renderStaff } from './rendering/staff.js';
import { getCurrentPitch } from './pitch/detection.js';
import { appState, updateTuningSetting } from './state/appState.js';
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
import { buildHomepage } from './ui/builders/homepage.js';
import * as scrollingStaff from './rendering/scrollingStaff.js';
import { handleGlobalPlay, handleGlobalStop, refreshGlobalTransportUI } from './ui/components/transport.js';
import { beepDo } from './audio/doPitch.js';
import { changeSatbTranspose } from './exercises/satb.js';
import { hadOpenPsalmHandoff } from './exercises/openPsalmHandoff.js';
import { maybeStartOnboarding } from './session/onboarding.js';
import { initSessionBar } from './session/sessionBar.js';
import { initMobileShell } from './session/mobileShell.js';
// Tests are imported when needed
// import './tests/tests.js';

const {
  handleA4TuningChange = () => {},
  handleInstrumentChange = () => {},
  handleDoNoteChange = () => {},
  handleToleranceChange = () => {},
  handleZoomChange = () => {},
  handleShowAccidentalsAndKeyChange = () => {},
  handlePlayAimChange = () => {},
  handleScaleOnlyChange = () => {},
  handleHideAnswersIntervalsChange = () => {},
  handleHideAnswersClusterChange = () => {},
  handleClusterThinkTimeChange = () => {},
  handleChordRootButtonClick = () => {},
  handleChordQualityButtonClick = () => {},
  handleChordInversionButtonClick = () => {},
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
  handleSATBBrowseHymnsClick = () => {},
  handleSATBTransposeChange = () => {},
  handleMidiFileSelect = () => {},
  handleIntervalDifficultyPreset = () => {},
  handleClusterDifficultyPreset = () => {},
  handleFlashcardNextClick = () => {},
  handleFlashcardFlipClick = () => {},
  handleFlashcardModeChange = () => {},
  handleFlashcardAccidentalsChange = () => {},
} = inputs;

async function initializeApplication() {
  setupApplicationState();
  await buildUserInterface();
  wireUpEventHandlers();
  initializeDefaultInstrument();
  setupKeyboardShortcuts();
  setupCustomEvents();
  startRenderLoop();
  checkBrowserCompatibility();
}

function setupApplicationState() {
  // State is initialized in appState.js module
  // This function is a placeholder for any runtime state setup
}

async function initializeDefaultInstrument() {
  // Load the default instrument if it's not 'sine'
  const defaultInstrument = appState.tuning.instrument;
  if (defaultInstrument && defaultInstrument !== 'sine') {
    const instrumentSelect = getElementById('instrument');
    if (instrumentSelect && instrumentSelect.value === defaultInstrument) {
      try {
        const { loadInstrument } = await import('./audio/instruments.js');
        instrumentSelect.disabled = true;
        await loadInstrument(defaultInstrument);
        instrumentSelect.disabled = false;
      } catch (error) {
        console.error('Failed to load default instrument:', error);
        // Revert to sine if loading fails
        updateTuningSetting('instrument', 'sine');
        if (instrumentSelect) {
          instrumentSelect.value = 'sine';
          instrumentSelect.disabled = false;
        }
      }
    }
  }
}

async function buildUserInterface() {
  buildNoteSelectionMenus();
  buildChordRootButtons();
  buildChordQualityButtons();
  buildChordInversionButtons();
  
  // Initialize SATB controls first (loads Amazing Grace)
  // This must complete before tab system so exercises are available
  await initializeSATBControls();

  initializeTabSystem();
  initSessionBar();
  initMobileShell();
  buildHomepage();

  // Land the singer on their song (the engraved SATB staff) when they arrived via an
  // OpenPsalm.com handoff link, so it looks like the page it was linked from. Otherwise:
  // first-time singers get the onboarding wizard; returning singers have their saved voice
  // profile applied (movable-Do + aim part) with no interruption.
  if (hadOpenPsalmHandoff()) {
    switchToTab('satb');
  } else {
    maybeStartOnboarding();
  }

  // Initialize staff panning (for manual panning when not playing)
  initializeStaffPanning();
  
  renderStaff();
}


function wireUpEventHandlers() {
  setupHeaderControls();
  setupTuningControls();
  setupDisplayControls();
  setupDroneControls();
  setupTargetControls();
  setupExerciseControls();
  setupGlobalDelegation();
}

function setupGlobalDelegation() {
  document.addEventListener('click', (e) => {
    // "Learn more" links open the Theory tab/sidebar and expand the target lesson
    const theoryLink = e.target.closest('[data-open-theory]');
    if (theoryLink) {
      const lessonNumber = theoryLink.dataset.openTheory;
      openTheoryToLesson(lessonNumber);
      return;
    }
    // "Try it" links in Theory switch to the relevant exercise tab
    const tabBtn = e.target.closest('[data-tab-switch]');
    if (tabBtn && tabBtn.dataset.tabSwitch) {
      switchToTab(tabBtn.dataset.tabSwitch);
    }
  });
}

async function openTheoryToLesson(lessonNumber) {
  const { expandAndScrollToLesson } = await import('./ui/components/theoryContent.js');
  const isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;
  const isSidebarActive = document.body.classList.contains('theory-sidebar-active');

  if (isLargeScreen && !isSidebarActive) {
    // On desktop, open the sidebar (without toggling away current tab)
    switchToTab('theory');
    // Wait for sidebar to render, then expand + scroll
    setTimeout(() => expandAndScrollToLesson(lessonNumber), 120);
  } else if (isLargeScreen && isSidebarActive) {
    // Sidebar already open — just expand + scroll
    expandAndScrollToLesson(lessonNumber);
  } else {
    // Small screen — switch to theory tab normally
    switchToTab('theory');
    setTimeout(() => expandAndScrollToLesson(lessonNumber), 120);
  }
}

function setupHeaderControls() {
  const btnPlay = getElementById('btnGlobalPlay');
  const btnStop = getElementById('btnGlobalStop');
  const btnPlayDo = getElementById('btnPlayDo');
  const btnMicToggle = getElementById('btnMicToggle');
  const toggleRibbon = getElementById('toggleRibbon');
  const showHeaderFab = getElementById('showHeaderFab');

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

  const mobileMql = window.matchMedia('(max-width: 480px)');
  const MOBILE_HEADER_STORAGE_KEY = 'mobileHeaderHidden';
  const updateShowHeaderFabText = () => {
    if (!showHeaderFab) return;
    const isHidden = document.body.classList.contains('mobile-header-hidden');
    if (isHidden) {
      showHeaderFab.textContent = 'Show\ncontrols';
      showHeaderFab.setAttribute('aria-label', 'Show controls');
      showHeaderFab.setAttribute('title', 'Show controls');
    } else {
      showHeaderFab.textContent = 'Hide\ncontrols';
      showHeaderFab.setAttribute('aria-label', 'Hide controls');
      showHeaderFab.setAttribute('title', 'Hide controls');
    }
  };
  const applyMobileHeaderState = () => {
    const isMobile = !!mobileMql.matches;
    if (!isMobile) {
      document.body.classList.remove('mobile-header-hidden');
      if (showHeaderFab) showHeaderFab.style.display = 'none';
      return;
    }
    // On mobile, always show the floating button
    if (showHeaderFab) showHeaderFab.style.display = 'inline-flex';
    const hidden = localStorage.getItem(MOBILE_HEADER_STORAGE_KEY) === '1';
    document.body.classList.toggle('mobile-header-hidden', hidden);
    updateShowHeaderFabText();
  };

  // Apply on load and when crossing breakpoint/orientation change
  applyMobileHeaderState();
  if (mobileMql && typeof mobileMql.addEventListener === 'function') {
    mobileMql.addEventListener('change', applyMobileHeaderState);
  } else {
    window.addEventListener('resize', applyMobileHeaderState);
  }

  if (toggleRibbon) {
    // Hide toggleRibbon button on mobile - we use the floating showHeaderFab instead
    if (mobileMql.matches) {
      toggleRibbon.style.display = 'none';
    }
    
    toggleRibbon.onclick = () => {
      // On desktop, only collapse the ribbon (not the entire header)
      document.body.classList.toggle('controls-collapsed');
      toggleRibbon.textContent = document.body.classList.contains('controls-collapsed')
        ? 'Show controls'
        : 'Hide controls';
    };
  }

  if (showHeaderFab) {
    showHeaderFab.onclick = () => {
      const isHidden = document.body.classList.contains('mobile-header-hidden');
      if (isHidden) {
        // Show header
        document.body.classList.remove('mobile-header-hidden');
        localStorage.setItem(MOBILE_HEADER_STORAGE_KEY, '0');
      } else {
        // Hide header
        document.body.classList.add('mobile-header-hidden');
        localStorage.setItem(MOBILE_HEADER_STORAGE_KEY, '1');
      }
      updateShowHeaderFabText();
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
}

function setupDisplayControls() {
  getElementById('tolerance').addEventListener('input', handleToleranceChange);
  getElementById('zoom').addEventListener('input', handleZoomChange);
  const showAccidentalsAndKeyCheckbox = getElementById('showAccidentalsAndKey');
  if (showAccidentalsAndKeyCheckbox) {
    // Migrate old localStorage keys if they exist
    const oldShowAccidentals = localStorage.getItem('showAccidentals');
    const oldShowKeySignature = localStorage.getItem('showKeySignature');
    if (oldShowAccidentals !== null || oldShowKeySignature !== null) {
      // If either old setting was true, migrate to unified setting as true
      const shouldEnable = oldShowAccidentals === 'true' || oldShowKeySignature === 'true';
      appState.display.showAccidentalsAndKey = shouldEnable;
      // Clean up old keys
      localStorage.removeItem('showAccidentals');
      localStorage.removeItem('showKeySignature');
    }
    
    showAccidentalsAndKeyCheckbox.addEventListener('change', handleShowAccidentalsAndKeyChange);
    // Initialize checkbox state from appState (default is false/disabled)
    showAccidentalsAndKeyCheckbox.checked = appState.display.showAccidentalsAndKey || false;
  }
  
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
  // Wire up radio button handlers using event delegation
  // Use event delegation for chord buttons (they're dynamically created)
  const rootButtonGroup = getElementById('chordRootButtonGroup');
  if (rootButtonGroup) {
    rootButtonGroup.addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-chord-root')) {
        handleChordRootButtonClick(event);
      }
    });
  }
  
  const qualityButtonGroup = getElementById('chordQualityButtonGroup');
  if (qualityButtonGroup) {
    qualityButtonGroup.addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-chord-quality')) {
        handleChordQualityButtonClick(event);
      }
    });
  }
  
  const inversionButtonGroup = getElementById('chordInversionButtonGroup');
  if (inversionButtonGroup) {
    inversionButtonGroup.addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-chord-inversion')) {
        handleChordInversionButtonClick(event);
      }
    });
  }
  
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
  
  // Wire up header reveal buttons (for mobile collapsed header)
  const revealHiddenHeader = getElementById('revealHiddenHeader');
  const showIntervalHeader = getElementById('showIntervalHeader');
  if (revealHiddenHeader) {
    revealHiddenHeader.onclick = handleRevealHiddenClick;
  }
  if (showIntervalHeader) {
    showIntervalHeader.onclick = handleShowIntervalClick;
  }

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
  const btnBrowseHymns = getElementById('btnBrowseHymns');
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
  if (btnBrowseHymns) {
    btnBrowseHymns.onclick = handleSATBBrowseHymnsClick;
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
  // Initialize difficulty to 'easy' for both exercises
  if (appState.exercise.intervalDifficulty === 'easy') {
    handleIntervalDifficultyPreset('easy');
  }
  if (appState.exercise.clusterDifficulty === 'easy') {
    handleClusterDifficultyPreset('easy');
  }
  getElementById('btnWarmup').onclick = handleWarmupClick;
  getElementById('warmupTempo').addEventListener('input', handleWarmupTempoChange);

  // Flashcards
  const flashNext = getElementById('flashcardNext');
  const flashFlip = getElementById('flashcardFlip');
  const flashMode = getElementById('flashcardMode');

  if (flashNext) flashNext.onclick = handleFlashcardNextClick;
  if (flashFlip) flashFlip.onclick = handleFlashcardFlipClick;
  if (flashMode) flashMode.addEventListener('change', handleFlashcardModeChange);
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
    // On the SATB + Warmup tabs the shared canvas is hidden (the VexFlow SVG is the staff),
    // so a full canvas redraw every frame is pure waste — those tabs drive their own notation.
    const tab = appState.exercise.currentTab;
    if (tab !== 'satb' && tab !== 'warmup') {
      renderStaff();
    }
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
