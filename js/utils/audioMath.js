/**
 * Audio calculation utilities for frequency and MIDI conversions
 */

export function midiToFrequency(midi, a4 = 440) {
  const standardFreq = 440 * Math.pow(2, (midi - 69) / 12);
  return applyTuning(standardFreq, a4);
}

export function frequencyToMidi(freq, a4 = 440) {
  if (!freq || freq <= 0) return NaN;

  // Convert incoming frequency to the equivalent frequency under standard A4=440,
  // then convert to MIDI using the standard reference of 440Hz at MIDI 69.
  const adjustedFreq = freq / (a4 / 440);
  return 69 + 12 * Math.log2(adjustedFreq / 440);
}

export function centsBetween(freq1, freq2) {
  return 1200 * Math.log2(freq1 / freq2);
}

export function applyTuning(freq, a4) {
  return freq * (a4 / 440);
}

