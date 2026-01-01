/**
 * Chord quality and arpeggio utilities
 */

import { normalizeModulo } from '../utils/math.js';
import { DEGREE_SEMITONES } from '../config/constants.js';

export function getChordQualityForDegree(degreeSemi) {
  const normalized = normalizeModulo(degreeSemi, 12);
  
  if (normalized === 0 || normalized === 5 || normalized === 7) {
    return 'maj';
  }
  
  if (normalized === 2 || normalized === 4 || normalized === 9) {
    return 'min';
  }
  
  return 'maj';
}

export function buildTriadSemitones(quality) {
  if (quality === 'maj') {
    return [0, 4, 7];
  }
  return [0, 3, 7];
}

export function buildArpeggioUp(degreeSemi) {
  const triad = getTriadForDegree(degreeSemi);
  return [...triad, triad[1], triad[0]];
}

export function buildArpeggioDown(degreeSemi) {
  const triad = getTriadForDegree(degreeSemi);
  return [triad[2], triad[1], triad[0], triad[1], triad[2]];
}

export function convertDegreeToRoman(degreeSemi) {
  const normalized = normalizeModulo(degreeSemi, 12);
  const degreeIndex = DEGREE_SEMITONES.indexOf(normalized);
  
  if (degreeIndex === -1) {
    return '?';
  }
  
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  return romanNumerals[degreeIndex];
}

function getTriadForDegree(degreeSemi) {
  const quality = getChordQualityForDegree(degreeSemi);
  return buildTriadSemitones(quality);
}

