/**
 * Drone management for sustained tones
 */

import { ensureAudioContext, getAudioContext } from './context.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from './oscillator.js';
import { getElementById, setTextContent } from '../utils/dom.js';
import { buildIndividualVolumeControls, hideIndividualVolumeControls } from '../ui/builders/volumeControls.js';

export const drone = {
  oscillators: [],
  gainNode: null,
  frequencies: []
};

export function startDroneWithFrequencies(frequencies, gain) {
  stopAllDroneOscillators();
  
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  
  const destination = ctx.destination;
  const gainValue = Number(gain) || 0.25;
  
  drone.frequencies = frequencies.slice();
  drone.oscillators = frequencies
    .map(freq => {
      const osc = createOscillator(freq, 'sine', gainValue);
      if (osc) {
        connectOscillatorToDestination(osc, destination);
        startOscillator(osc);
      }
      return osc;
    })
    .filter(Boolean);
  
  if (!drone.gainNode) {
    drone.gainNode = destination;
  }
  
  buildIndividualVolumeControls(frequencies);
  updateDroneStatus(frequencies);
}

export function stopAllDroneOscillators() {
  drone.oscillators.forEach(stopOscillator);
  drone.oscillators = [];
  drone.frequencies = [];
  hideIndividualVolumeControls();
  updateDroneStatus([]);
}

export function updateDroneGain(gain) {
  const gainValue = Number(gain) || 0.25;
  
  drone.oscillators.forEach(osc => {
    if (osc && osc.g) {
      osc.g.gain.value = gainValue;
    }
  });
}

export function updateIndividualDroneGain(frequency, gain) {
  const gainValue = Number(gain) || 0.25;
  const targetFreq = Number(frequency);
  const tolerance = 0.1;
  
  drone.oscillators.forEach((osc, index) => {
    if (osc && osc.g && drone.frequencies[index] !== undefined) {
      const freqDiff = Math.abs(drone.frequencies[index] - targetFreq);
      if (freqDiff < tolerance) {
        osc.g.gain.value = gainValue;
      }
    }
  });
}

export function isDroneActive() {
  return drone.oscillators.length > 0;
}

function updateDroneStatus(frequencies) {
  const statusElement = getElementById('status');
  if (frequencies.length === 0) {
    setTextContent(statusElement, 'Drone stopped');
  } else {
    const freqList = frequencies.map(f => f.toFixed(1)).join(', ');
    setTextContent(statusElement, `Drone: ${freqList}`);
  }
}

