/**
 * Core exercise utilities
 */

import { appState, getDroneFrequencies } from '../state/appState.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { getDegreeForMidi } from '../utils/musicTheory.js';
import { randomInRange } from '../utils/math.js';
import { startDroneWithFrequencies, stopAllDroneOscillators } from '../audio/drone.js';
import { updateNowPlayingBadge } from '../ui/components/status.js';

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
  setActiveDisplay(midis, label);
  
  const frequencies = convertMidisToFrequencies(midis);
  const gain = appState.drone.gain;
  
  startDroneWithFrequencies(frequencies, gain);
  appState.drone.on = true;
  
  setTimeout(() => {
    stopAllDroneOscillators();
    appState.drone.on = false;
  }, duration * 1000);
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

