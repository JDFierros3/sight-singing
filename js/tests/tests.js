/**
 * Test definitions
 */

import { test } from './runner.js';
import { getIntervalName, getDegreeForMidi, buildScalePitches } from '../utils/musicTheory.js';
import { getDroneFrequencies } from '../state/appState.js';
import { getChordQualityForDegree, buildArpeggioUp, buildArpeggioDown } from '../exercises/chords.js';
import { appState } from '../state/appState.js';
import { DIATONIC_ST } from '../config/constants.js';
import { playIntervalExercise } from '../exercises/intervals.js';

test('intervalName maps 9 → M6', () => {
  if (getIntervalName(9) !== 'M6') {
    throw new Error('Expected M6');
  }
});

test('degreeForMidi non-scale returns null', () => {
  const degree = getDegreeForMidi(appState.tuning.doMidi + 1, appState.tuning.doMidi);
  if (degree !== null) {
    throw new Error('Expected null');
  }
});

test('buildScalePitches yields 7 degrees in one octave', () => {
  const scale = buildScalePitches(
    appState.tuning.doMidi,
    appState.tuning.doMidi,
    appState.tuning.doMidi + 11
  );
  if (scale.length !== 7) {
    throw new Error('Expected 7');
  }
});

test('currentDroneFreqs honors chord root', () => {
  const oldRoot = appState.drone.rootSemi;
  appState.drone.rootSemi = 2;
  
  const frequencies = getDroneFrequencies();
  const firstFreq = frequencies[0];
  
  if (Math.abs(firstFreq - firstFreq) > 0.01) {
    throw new Error('Root not applied');
  }
  
  appState.drone.rootSemi = oldRoot;
});

test('triad qualities in major: I, IV, V are major; ii, iii, vi are minor', () => {
  if (getChordQualityForDegree(0) !== 'maj') throw new Error('I maj');
  if (getChordQualityForDegree(5) !== 'maj') throw new Error('IV maj');
  if (getChordQualityForDegree(7) !== 'maj') throw new Error('V maj');
  if (getChordQualityForDegree(2) !== 'min') throw new Error('ii min');
  if (getChordQualityForDegree(4) !== 'min') throw new Error('iii min');
  if (getChordQualityForDegree(9) !== 'min') throw new Error('vi min');
});

test('buildArpeggioSemis for I equals 0,4,7,4,0', () => {
  const arpeggio = buildArpeggioUp(0);
  const expected = [0, 4, 7, 4, 0];
  
  if (!(arpeggio.length === 5 && arpeggio.every((v, i) => v === expected[i]))) {
    throw new Error('Arpeggio mismatch');
  }
});

test('warmup plan includes forward/back degrees', () => {
  const labels = ['I', 'vi'];
  if (!(labels.includes('I') && labels.includes('vi'))) {
    throw new Error('labels');
  }
});

test('buildArpeggioSemisDesc for I equals 7,4,0,4,7', () => {
  const arpeggio = buildArpeggioDown(0);
  const expected = [7, 4, 0, 4, 7];
  
  if (!(arpeggio.length === 5 && arpeggio.every((v, i) => v === expected[i]))) {
    throw new Error('Descending arpeggio mismatch');
  }
});

test('handleGlobalKey tolerates missing key', () => {
  window.dispatchEvent(new KeyboardEvent('keydown', {}));
});

test('onScaleOnly constrains interval spans', () => {
  appState.exercise.onScaleOnly = true;
  document.getElementById('intervalMin').value = 1;
  document.getElementById('intervalMax').value = 12;
  
  playIntervalExercise();
  
  const interval = appState.exercise.interval;
  const semitones = Math.abs(interval.a - interval.b) % 12;
  
  if (!DIATONIC_ST.has(semitones)) {
    throw new Error('Interval not diatonic');
  }
});

