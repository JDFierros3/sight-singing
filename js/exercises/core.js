/**
 * Core exercise utilities
 */

import { appState, getDroneFrequencies } from '../state/appState.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { getDegreeForMidi } from '../utils/musicTheory.js';
import { randomInRange } from '../utils/math.js';
import { startDroneWithFrequencies, stopAllDroneOscillators } from '../audio/drone.js';
import { updateNowPlayingBadge } from '../ui/components/status.js';
import { isUsingSoundfont, playInstrumentNote } from '../audio/instruments.js';

let activePlaybackTimeoutId = null;
let activePlaybackToken = 0;

export function setActiveDisplay(midis, label) {
  appState.exercise.display.midis = midis.slice();
  appState.exercise.display.label = label || '';
  updateNowPlayingBadge(label);
}


export function pickRandomNoteInRange() {
  const min = appState.tuning.minMidi;
  const max = appState.tuning.maxMidi;
  return randomInRange(min, max);
}

export function playTonesForDuration(midis, duration, label) {
  // Cancel any previous scheduled stop, otherwise older timeouts can
  // stop a newer playback early (this was causing "timing is totally wrong").
  if (activePlaybackTimeoutId) {
    clearTimeout(activePlaybackTimeoutId);
    activePlaybackTimeoutId = null;
  }
  activePlaybackToken += 1;
  const token = activePlaybackToken;

  setActiveDisplay(midis, label);
  
  const gain = appState.drone.gain;
  
  // Use instruments if available, otherwise use sine wave drones
  if (isUsingSoundfont()) {
    // Play each note with the instrument
    midis.forEach(midi => {
      playInstrumentNote(midi, duration, gain);
    });
  } else {
    // Use traditional sine wave drones
    const frequencies = convertMidisToFrequencies(midis);
    startDroneWithFrequencies(frequencies, gain);
    appState.drone.on = true;
  }
  
  activePlaybackTimeoutId = setTimeout(() => {
    // Only stop if this timeout belongs to the latest playback.
    if (token !== activePlaybackToken) return;
    
    // Stop drones only if using sine waves
    if (!isUsingSoundfont()) {
      stopAllDroneOscillators();
      appState.drone.on = false;
    }

    activePlaybackTimeoutId = null;
  }, duration * 1000);
}

export function stopOneShotPlayback() {
  // Invalidate any pending stop timeout and stop immediately.
  if (activePlaybackTimeoutId) {
    clearTimeout(activePlaybackTimeoutId);
    activePlaybackTimeoutId = null;
  }
  activePlaybackToken += 1;

  stopAllDroneOscillators();
  appState.drone.on = false;

  updateNowPlayingBadge('');
}

export function filterNoteByScale(midi) {
  if (!appState.exercise.onScaleOnly) {
    return true;
  }
  
  return getDegreeForMidi(midi, appState.tuning.doMidi) !== null;
}

export function convertMidisToFrequencies(midis) {
  return midis.map(midi => midiToFrequency(midi, appState.tuning.a4));
}

