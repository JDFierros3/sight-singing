/**
 * Do pitch beep functionality (for the global header)
 */

import { ensureAudioContext, getAudioContext } from './context.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from './oscillator.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { appState } from '../state/appState.js';
import { isUsingSoundfont, playInstrumentNote } from './instruments.js';

// Sound a Do reference tone and WAIT for it, so a singer always hears their tonic before any
// full-screen sing-along starts. `midi` defaults to the movable-Do tonic; `holdMs` is how long
// the tone rings before playback proceeds.
export async function soundDoReference(midi = appState.tuning.doMidi, holdMs = 1000) {
  await ensureAudioContext();
  const ctx = getAudioContext();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  if (isUsingSoundfont()) {
    const note = playInstrumentNote(midi, holdMs / 1000, 0.5);
    if (note) { await wait(holdMs); return; }
  }

  const frequency = midiToFrequency(midi, appState.tuning.a4);
  const oscillator = createOscillator(frequency, 'sine', 0.2);
  if (!oscillator) { await wait(holdMs); return; }

  connectOscillatorToDestination(oscillator, ctx.destination);
  startOscillator(oscillator);
  oscillator.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + holdMs / 1000);
  setTimeout(() => stopOscillator(oscillator), holdMs + 20);
  await wait(holdMs);
}

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


