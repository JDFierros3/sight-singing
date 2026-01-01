/**
 * Target tone beep functionality
 */

import { ensureAudioContext, getAudioContext } from './context.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from './oscillator.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { appState } from '../state/appState.js';

export async function beepTarget() {
  if (!appState.display.playAim) {
    return;
  }
  
  await ensureAudioContext();
  const ctx = getAudioContext();
  
  const targetMidi = appState.tuning.doMidi + appState.drone.rootSemi + appState.target.semi;
  const frequency = midiToFrequency(targetMidi, appState.tuning.a4);
  
  const oscillator = createOscillator(frequency, 'sine', 0.18);
  if (!oscillator) {
    return;
  }
  
  connectOscillatorToDestination(oscillator, ctx.destination);
  startOscillator(oscillator);
  
  const fadeOutTime = ctx.currentTime + 0.45;
  oscillator.g.gain.exponentialRampToValueAtTime(0.0001, fadeOutTime);
  
  setTimeout(() => {
    stopOscillator(oscillator);
  }, 480);
}

