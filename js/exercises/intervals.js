/**
 * Interval training exercises
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { DIATONIC_ST, DEGREE_SEMITONES, SOLFEGE } from '../config/constants.js';
import { getDegreeForMidi, getIntervalName } from '../utils/musicTheory.js';
import { randomInRange, normalizeModulo } from '../utils/math.js';
import { pickRandomNoteInRange, filterNoteByScale, playTonesForDuration } from './core.js';

// Lightweight history to avoid annoying repeats.
const intervalHistory = {
  lastSpan: null,
  lastStartMidi: null,
  lastEndMidi: null
};

export function playIntervalExercise() {
  const direction = getIntervalDirection();
  const range = getIntervalRange();
  const validSpans = buildValidIntervalSpans(range.min, range.max);

  let span = pickRandomIntervalSpan(validSpans);
  let noteA = pickRandomStartingNote();
  let noteB = calculateIntervalNote(noteA, span, direction);

  // Retry a few times to avoid obvious repeats like:
  // - same interval span repeatedly
  // - same exact A→B pair repeatedly
  // This keeps distribution feeling more even without getting overly complex.
  for (let i = 0; i < 8; i++) {
    const sameSpan = intervalHistory.lastSpan !== null && span === intervalHistory.lastSpan;
    const samePair =
      intervalHistory.lastStartMidi !== null &&
      intervalHistory.lastEndMidi !== null &&
      noteA === intervalHistory.lastStartMidi &&
      noteB === intervalHistory.lastEndMidi;

    if (!sameSpan && !samePair) break;

    span = pickRandomIntervalSpan(validSpans, intervalHistory.lastSpan);
    noteA = pickRandomStartingNote(intervalHistory.lastStartMidi);
    noteB = calculateIntervalNote(noteA, span, direction);
  }
  
  noteB = constrainNoteToRange(noteB);
  noteA = constrainToScaleIfNeeded(noteA);
  noteB = constrainToScaleIfNeeded(noteB);
  
  storeInterval(noteA, noteB);
  intervalHistory.lastSpan = span;
  intervalHistory.lastStartMidi = noteA;
  intervalHistory.lastEndMidi = noteB;
  updateIntervalBadge('?');
  
  playTonesForDuration([noteA], 1.2, 'Interval A');
  setTimeout(() => {
    playTonesForDuration([noteB], 1.2, 'Interval B');
  }, 1300);
}

function getIntervalDirection() {
  const directionSelect = getElementById('intervalDir');
  return directionSelect.value;
}

function getIntervalRange() {
  const minInput = getElementById('intervalMin');
  const maxInput = getElementById('intervalMax');
  
  return {
    min: Number(minInput.value),
    max: Number(maxInput.value)
  };
}

function buildValidIntervalSpans(min, max) {
  const spans = [];
  
  for (let span = min; span <= max; span++) {
    if (!appState.exercise.onScaleOnly || DIATONIC_ST.has(span)) {
      spans.push(span);
    }
  }
  
  if (spans.length === 0) {
    spans.push(min);
  }
  
  return spans;
}

function pickRandomIntervalSpan(spans, avoidSpan = null) {
  if (!spans.length) return 0;
  if (spans.length === 1) return spans[0];

  let chosen = avoidSpan;
  let safety = 20;
  while (chosen === avoidSpan && safety-- > 0) {
    const randomIndex = randomInRange(0, spans.length - 1);
    chosen = spans[randomIndex];
  }
  return chosen;
}

function pickRandomStartingNote(avoidMidi = null) {
  if (appState.exercise.intervalDifficulty === 'easy' || 
      appState.exercise.intervalDifficulty === 'medium') {
    return appState.tuning.doMidi; // Always start on Do
  }
  if (avoidMidi === null) return pickRandomNoteInRange();
  let chosen = avoidMidi;
  let safety = 20;
  while (chosen === avoidMidi && safety-- > 0) {
    chosen = pickRandomNoteInRange();
  }
  return chosen;
}

function calculateIntervalNote(startNote, span, direction) {
  const directionMultiplier = getDirectionMultiplier(direction);
  return startNote + directionMultiplier * span;
}

function getDirectionMultiplier(direction) {
  if (direction === 'down') {
    return -1;
  }
  if (direction === 'either') {
    return Math.random() < 0.5 ? -1 : 1;
  }
  return 1;
}

function constrainNoteToRange(note) {
  const min = appState.tuning.minMidi;
  const max = appState.tuning.maxMidi;
  
  if (note < min || note > max) {
    const direction = note < min ? 1 : -1;
    const span = Math.abs(note - (note < min ? min : max));
    return note + direction * span;
  }
  
  return note;
}

function constrainToScaleIfNeeded(note) {
  if (!appState.exercise.onScaleOnly) {
    return note;
  }
  
  if (getDegreeForMidi(note, appState.tuning.doMidi) === null) {
    const randomDegreeIndex = randomInRange(0, DEGREE_SEMITONES.length - 1);
    const degree = DEGREE_SEMITONES[randomDegreeIndex];
    return appState.tuning.doMidi + degree;
  }
  
  return note;
}

function storeInterval(noteA, noteB) {
  appState.exercise.interval = { a: noteA, b: noteB };
}

function updateIntervalBadge(text) {
  const badge = getElementById('intervalBadge');
  setTextContent(badge, text);
}

export function revealIntervalSolution() {
  if (!appState.exercise.interval) {
    updateIntervalBadge('—');
    return;
  }
  
  const { a, b } = appState.exercise.interval;
  const displayText = formatIntervalDisplay(a, b);
  updateIntervalBadge(displayText);
}

function formatIntervalDisplay(noteA, noteB) {
  const isUp = noteB >= noteA;
  const semitones = normalizeModulo(Math.abs(noteB - noteA), 12);
  
  const degreeA = getDegreeForMidi(noteA, appState.tuning.doMidi);
  const degreeB = getDegreeForMidi(noteB, appState.tuning.doMidi);
  
  const solfegeA = degreeA !== null ? SOLFEGE[degreeA] : '?';
  const solfegeB = degreeB !== null ? SOLFEGE[degreeB] : '?';
  
  const intervalName = getIntervalName(semitones);
  const directionText = isUp ? ' up' : ' down';
  
  return `${solfegeA} → ${solfegeB}  (${intervalName}${directionText})`;
}

