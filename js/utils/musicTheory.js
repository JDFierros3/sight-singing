/**
 * Music theory utilities for scales, intervals, and note names
 */

import { NOTE_NAMES, DEGREE_SEMITONES, SOLFEGE, SEMITONE_TO_SOLFEGE } from '../config/constants.js';

export function midiToNoteName(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return NOTE_NAMES[noteIndex] + octave;
}

export function getDegreeForMidi(midi, doMidi) {
  const normalized = normalizeModulo(midi - doMidi, 12);
  const degreeIndex = DEGREE_SEMITONES.indexOf(normalized);
  return degreeIndex >= 0 ? degreeIndex : null;
}

export function getSolfegeForMidi(midi, doMidi) {
  const normalized = normalizeModulo(midi - doMidi, 12);
  const solfegeInfo = SEMITONE_TO_SOLFEGE[normalized];
  return solfegeInfo ? solfegeInfo.solfege : null;
}

export function getSolfegeInfoForMidi(midi, doMidi) {
  const normalized = normalizeModulo(midi - doMidi, 12);
  const solfegeInfo = SEMITONE_TO_SOLFEGE[normalized];
  return solfegeInfo || null;
}

export function getIntervalName(semitones) {
  const intervalNames = {
    0: 'P1',
    1: 'm2',
    2: 'M2',
    3: 'm3',
    4: 'M3',
    5: 'P4',
    6: 'TT',
    7: 'P5',
    8: 'm6',
    9: 'M6',
    10: 'm7',
    11: 'M7',
    12: 'P8'
  };
  
  return intervalNames[semitones] || `${semitones} st`;
}

export function isDiatonicNote(midi, doMidi) {
  return getDegreeForMidi(midi, doMidi) !== null;
}

export function buildScalePitches(doMidi, minMidi, maxMidi) {
  const pitches = [];
  
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const normalized = normalizeModulo(midi - doMidi, 12);
    const degreeIndex = DEGREE_SEMITONES.indexOf(normalized);
    
    if (degreeIndex !== -1) {
      pitches.push({
        midi: midi,
        degree: degreeIndex,
        sol: SOLFEGE[degreeIndex]
      });
    }
  }
  
  return pitches;
}

export function getRomanNumeral(degreeSemi) {
  const normalized = normalizeModulo(degreeSemi, 12);
  const degreeIndex = DEGREE_SEMITONES.indexOf(normalized);
  
  if (degreeIndex === -1) {
    return '?';
  }
  
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  return romanNumerals[degreeIndex];
}

function normalizeModulo(value, mod) {
  return ((value % mod) + mod) % mod;
}

