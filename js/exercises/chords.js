/**
 * Chord quality and arpeggio utilities
 */

import { normalizeModulo, randomInRange } from '../utils/math.js';
import { DEGREE_SEMITONES } from '../config/constants.js';
import { getElementById } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { playTonesForDuration } from './core.js';
import { renderStaff } from '../rendering/staff.js';
import { getSolfegeForMidi } from '../utils/musicTheory.js';

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


/* -------------------------------------------------- Test-me guess drill --- */
/* "Test me" plays a triad and you tap its quality; "Explore" (the drone builder)
   stays available via the mode toggle. */

const QUALITY_INTERVALS = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const QUALITY_LABEL = { maj: 'Major', min: 'Minor', dim: 'Diminished', aug: 'Augmented' };
const QUALITY_SET = ['maj', 'min', 'dim', 'aug'];
const ROOT_DEGREES = [0, 2, 4, 5, 7, 9];   // Do Re Mi Fa Sol La — keep the root in-key

let currentTestChord = null;

// Play a random triad (in-key root + random quality) all at once; identify the quality.
export function playChordExercise() {
  const rootDeg = ROOT_DEGREES[randomInRange(0, ROOT_DEGREES.length - 1)];
  const quality = QUALITY_SET[randomInRange(0, QUALITY_SET.length - 1)];
  const rootMidi = appState.tuning.doMidi + rootDeg;
  const midis = QUALITY_INTERVALS[quality].map(s => rootMidi + s);
  currentTestChord = { quality, midis };

  // Reuse the cluster reveal path to stack the shape-notes on the shared staff.
  appState.exercise.showAnswers.cluster = false;
  appState.exercise.hidden = { midi: midis };
  renderStaff();
  playTonesForDuration(midis, 2.2, `Chord ${quality}`);

  renderChordAnswers();
  const r = getElementById('chordResult');
  if (r) r.textContent = 'What quality is this chord?';
}

export function renderChordAnswers() {
  const row = getElementById('chordAnswers');
  if (!row) return;
  row.innerHTML = '';
  QUALITY_SET.forEach(q => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ans';
    btn.dataset.quality = q;
    btn.textContent = QUALITY_LABEL[q];
    btn.addEventListener('click', () => handleChordAnswerClick(q));
    row.appendChild(btn);
  });
}

function handleChordAnswerClick(clicked) {
  if (!currentTestChord) return;
  const actual = currentTestChord.quality;
  const correct = clicked === actual;

  const row = getElementById('chordAnswers');
  row.querySelectorAll('.ans').forEach(b => {
    b.disabled = true;
    if (b.dataset.quality === actual) b.classList.add('good');
    if (b.dataset.quality === clicked && !correct) b.classList.add('bad');
  });

  appState.exercise.showAnswers.cluster = true;
  renderStaff();
  const syls = currentTestChord.midis
    .map(m => getSolfegeForMidi(m, appState.tuning.doMidi) || '?').join('–');
  const r = getElementById('chordResult');
  if (r) r.textContent = `${correct ? '✓' : '✗'}  ${QUALITY_LABEL[actual]} · ${syls}`;
}

// Test me ⇄ Explore toggle (bound once).
let chordModeBound = false;
export function initChordMode() {
  if (chordModeBound) return;
  const seg = getElementById('chordMode');
  if (!seg) return;
  seg.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => setChordMode(btn.dataset.chordmode));
  });
  chordModeBound = true;
}

function setChordMode(mode) {
  const seg = getElementById('chordMode');
  seg?.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('on', b.dataset.chordmode === mode));
  const test = getElementById('chordTest');
  const explore = getElementById('chordExplore');
  if (test) test.hidden = mode !== 'test';
  if (explore) explore.hidden = mode !== 'explore';
}
