/**
 * Do pitch beep functionality (for the global header)
 */

import { ensureAudioContext, getAudioContext } from './context.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from './oscillator.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { appState } from '../state/appState.js';
import { isUsingSoundfont, playInstrumentNote } from './instruments.js';

export async function beepDo() {
  await ensureAudioContext();
  const ctx = getAudioContext();

  const doMidi = appState.tuning.doMidi;
  
  // Try to use instrument if available
  if (isUsingSoundfont()) {
    const note = playInstrumentNote(doMidi, 0.5, 0.5);
    if (note) {
      return; // Successfully played with instrument
    }
  }
  
  // Fall back to oscillator
  const frequency = midiToFrequency(doMidi, appState.tuning.a4);

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


