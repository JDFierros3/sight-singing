/**
 * Global transport controls (Play/Stop in the header)
 * Routes actions based on the active tab.
 */

import { appState, getDroneFrequencies } from '../../state/appState.js';
import { ensureAudioContext } from '../../audio/context.js';
import { startDroneWithFrequencies, stopAllDroneOscillators } from '../../audio/drone.js';
import * as coreExercise from '../../exercises/core.js';
import { runWarmupSequence, stopWarmupSequence } from '../../exercises/warmup.js';
import { playHiddenCluster } from '../../exercises/cluster.js';
import { playIntervalExercise } from '../../exercises/intervals.js';
import { playSATBExercise, stopSATBExercise } from '../../exercises/satb.js';
import { nextFlashcard } from '../../exercises/flashcards.js';
import { beepDo } from '../../audio/doPitch.js';

function getTab() {
  return appState.exercise?.currentTab || 'settings';
}

function isWarmupRunning() {
  return !!appState.exercise?.warmupRunning;
}

function isSatbPlaying() {
  return !!appState.satb?.isPlaying;
}

async function startDrone() {
  await ensureAudioContext();
  const frequencies = getDroneFrequencies();
  startDroneWithFrequencies(frequencies, appState.drone.gain);
  appState.drone.on = true;
}

function stopDrone() {
  stopAllDroneOscillators();
  appState.drone.on = false;
}

function getSelectedWarmupStanzas() {
  const selectedIndices = [];
  for (let i = 0; i < 6; i++) {
    const checkbox = document.getElementById(`warmupStanza-${i}`);
    if (checkbox && checkbox.checked) {
      selectedIndices.push(i);
    }
  }
  return selectedIndices.length > 0 ? selectedIndices : null;
}

export function getPrimaryActionForCurrentTab() {
  const tab = getTab();

  if (tab === 'chord-quality') {
    return {
      playLabel: appState.drone.on ? 'Restart Drone' : 'Start Drone',
      stopLabel: 'Stop',
      canStop: appState.drone.on
    };
  }

  if (tab === 'warmup') {
    const running = isWarmupRunning();
    return {
      playLabel: running ? 'Stop Warmup' : 'Play Warmup',
      stopLabel: 'Stop',
      canStop: running
    };
  }

  if (tab === 'satb') {
    const playing = isSatbPlaying();
    return {
      playLabel: playing ? 'Stop SATB' : 'Play SATB',
      stopLabel: 'Stop',
      canStop: playing
    };
  }

  if (tab === 'cluster') {
    return {
      playLabel: 'Play 2 (Cluster)',
      stopLabel: 'Stop',
      canStop: true
    };
  }

  if (tab === 'intervals') {
    return {
      playLabel: 'Play Interval',
      stopLabel: 'Stop',
      canStop: true
    };
  }

  if (tab === 'flashcards') {
    return {
      playLabel: 'Next Card',
      stopLabel: 'Stop',
      canStop: false
    };
  }

  return {
    playLabel: 'Play Do',
    stopLabel: 'Stop',
    canStop: appState.drone.on || isWarmupRunning() || isSatbPlaying()
  };
}

export async function handleGlobalPlay() {
  const tab = getTab();

  if (tab === 'chord-quality') {
    if (appState.drone.on) {
      stopDrone();
    }
    await startDrone();
    return;
  }

  if (tab === 'warmup') {
    if (isWarmupRunning()) {
      stopWarmupSequence();
    } else {
      const selected = getSelectedWarmupStanzas();
      await runWarmupSequence(selected);
    }
    return;
  }

  if (tab === 'satb') {
    if (isSatbPlaying()) {
      stopSATBExercise();
    } else {
      await playSATBExercise();
    }
    return;
  }

  if (tab === 'cluster') {
    playHiddenCluster(2);
    return;
  }

  if (tab === 'intervals') {
    playIntervalExercise();
    return;
  }

  if (tab === 'flashcards') {
    nextFlashcard();
    return;
  }

  await beepDo();
}

export function handleGlobalStop() {
  // Panic-stop: stop any active audio regardless of tab.
  try { stopWarmupSequence(); } catch {}
  try { stopSATBExercise(); } catch {}
  try {
    if (typeof coreExercise.stopOneShotPlayback === 'function') {
      coreExercise.stopOneShotPlayback();
    }
  } catch {}
  try { stopDrone(); } catch {}
}

export function refreshGlobalTransportUI() {
  const playBtn = document.getElementById('btnGlobalPlay');
  const stopBtn = document.getElementById('btnGlobalStop');
  if (!playBtn || !stopBtn) return;

  const { playLabel, canStop } = getPrimaryActionForCurrentTab();
  if (playBtn.textContent !== playLabel) {
    playBtn.textContent = playLabel;
  }

  stopBtn.disabled = !canStop;
}

// Convenience alias for other modules that want a single “stop everything” call.
export function stopAllPlayback() {
  handleGlobalStop();
  refreshGlobalTransportUI();
}


