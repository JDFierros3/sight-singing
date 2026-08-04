/**
 * Interval training exercises
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { DIATONIC_ST, DEGREE_SEMITONES, SOLFEGE } from '../config/constants.js';
import { getDegreeForMidi, getIntervalName } from '../utils/musicTheory.js';
import { randomInRange, normalizeModulo } from '../utils/math.js';
import { pickRandomNoteInRange, filterNoteByScale, playTonesForDuration } from './core.js';
import { renderStaff } from '../rendering/staff.js';

// Lightweight history to avoid annoying repeats.
const intervalHistory = {
  lastSpan: null,
  lastStartMidi: null,
  lastEndMidi: null
};

export function playIntervalExercise() {
  // Reset reveal state when starting a new exercise
  appState.exercise.showAnswers.intervals = false;
  
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
  
  // Re-render staff to clear any previously revealed answers
  renderStaff();

  // Fresh, enabled answer buttons for this round.
  renderIntervalAnswers();
  const resultEl = getElementById('intervalResult');
  if (resultEl) resultEl.textContent = 'Listen…';

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
  const direction = getIntervalDirection();
  
  // 1 semitone (minor 2nd) handling:
  // - Ascending 1 semitone from Do = Di (chromatic) - NOT allowed when onScaleOnly
  // - Descending 1 semitone from Do = Ti (diatonic) - allowed
  // So we only include 1 semitone when direction allows descending
  if (min <= 1 && 1 <= max) {
    // Only allow 1 semitone for descending or either (when it can be descending)
    // When onScaleOnly is true, only allow if direction is 'down' or 'either'
    if (!appState.exercise.onScaleOnly || direction === 'down' || direction === 'either') {
      spans.push(1);
    }
  }
  
  for (let span = min; span <= max; span++) {
    // Skip 1 since we already handled it above
    if (span === 1) continue;
    
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
  let effectiveDirection = direction;
  
  // Force descending for 1-semitone intervals when onScaleOnly is true
  // This ensures we get Do->Ti (diatonic) and not Do->Di (chromatic)
  if (span === 1 && appState.exercise.onScaleOnly && direction === 'either') {
    effectiveDirection = 'down';
  }
  
  const directionMultiplier = getDirectionMultiplier(effectiveDirection);
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
  // No range clamping - use full MIDI range (0-127)
  if (note < 0) return 0;
  if (note > 127) return 127;
  return note;
}

function constrainToScaleIfNeeded(note) {
  if (!appState.exercise.onScaleOnly) {
    return note;
  }
  
  // Don't modify Do note in easy/medium mode - it's explicitly set to Do and must stay Do
  const isEasyOrMedium = appState.exercise.intervalDifficulty === 'easy' || 
                         appState.exercise.intervalDifficulty === 'medium';
  if (isEasyOrMedium && note === appState.tuning.doMidi) {
    return note; // Always keep Do as Do in easy/medium mode
  }
  
  // Check if note is already diatonic
  if (getDegreeForMidi(note, appState.tuning.doMidi) !== null) {
    return note; // Already diatonic, no change needed
  }
  
  // Note is not diatonic - snap to nearest diatonic note
  // Find the closest diatonic note by checking nearby notes (within 24 semitones)
  const doMidi = appState.tuning.doMidi;
  
  let closestNote = note;
  let minDistance = Infinity;
  
  // Check diatonic notes within 2 octaves of the target note (24 semitones in each direction)
  const searchRange = 24;
  for (let testMidi = Math.max(0, note - searchRange); testMidi <= Math.min(127, note + searchRange); testMidi++) {
    if (getDegreeForMidi(testMidi, doMidi) !== null) {
      const distance = Math.abs(testMidi - note);
      if (distance < minDistance) {
        minDistance = distance;
        closestNote = testMidi;
      }
    }
  }
  
  return closestNote;
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

/* -------------------------------------------------- interactive answers --- */

// Friendly labels per simple-interval semitone (0–12). The button the singer taps;
// the Do–x sublabel is shown only when the interval is always measured from Do.
export const INTERVAL_OPTIONS = {
  1:  { label: '♭2nd',    sub: 'Do–Ra' },
  2:  { label: '2nd',     sub: 'Do–Re' },
  3:  { label: '♭3rd',    sub: 'Do–Me' },
  4:  { label: '3rd',     sub: 'Do–Mi' },
  5:  { label: '4th',     sub: 'Do–Fa' },
  6:  { label: 'Tritone', sub: 'Do–Fi' },
  7:  { label: '5th',     sub: 'Do–Sol' },
  8:  { label: '♭6th',    sub: 'Do–Le' },
  9:  { label: '6th',     sub: 'Do–La' },
  10: { label: '♭7th',    sub: 'Do–Te' },
  11: { label: '7th',     sub: 'Do–Ti' },
  12: { label: 'Octave',  sub: 'Do–Do' }
};

// Collapse any distance to a simple-interval key 0–12, preserving the octave as 12.
export function intervalKey(dist) {
  const d = Math.abs(dist);
  const m = d % 12;
  return (m === 0 && d > 0) ? 12 : m;
}

// Shared answer-button renderer (used by Intervals AND Pitch Distinction). Builds one
// `.ans` button per interval key, calling onKey(key) on tap.
export function renderAnswerButtons(row, keys, fromDo, onKey) {
  if (!row) return;
  row.innerHTML = '';
  keys.forEach(key => {
    const opt = INTERVAL_OPTIONS[key] || { label: `${key} st`, sub: '' };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ans';
    btn.dataset.key = String(key);
    btn.innerHTML = `${opt.label}${fromDo && opt.sub ? `<small>${opt.sub}</small>` : ''}`;
    btn.addEventListener('click', () => onKey(key));
    row.appendChild(btn);
  });
}

// Shared grading paint: green on the actual key, red on a wrong pick, all disabled.
export function paintAnswerResult(row, actualKey, clickedKey) {
  if (!row) return;
  row.querySelectorAll('.ans').forEach(b => {
    b.disabled = true;
    const k = Number(b.dataset.key);
    if (k === actualKey) b.classList.add('good');
    if (k === clickedKey && clickedKey !== actualKey) b.classList.add('bad');
  });
}

// The answer options for the CURRENT difficulty/range — exactly the intervals the
// generator can pose, so the buttons never offer an impossible answer.
function currentIntervalOptionKeys() {
  const range = getIntervalRange();
  const spans = buildValidIntervalSpans(range.min, range.max);
  const keys = new Set();
  spans.forEach(s => { const k = intervalKey(s); if (k >= 1) keys.add(k); });
  return [...keys].sort((a, b) => a - b);
}

// (Re)build the answer button row for the current difficulty; buttons start enabled/clean.
export function renderIntervalAnswers() {
  const fromDo = appState.exercise.intervalDifficulty === 'easy' ||
                 appState.exercise.intervalDifficulty === 'medium';
  renderAnswerButtons(getElementById('intervalAnswers'), currentIntervalOptionKeys(), fromDo, handleIntervalAnswerClick);
}

// Grade the tapped interval, then auto-reveal on the staff and spell it out.
function handleIntervalAnswerClick(clickedKey) {
  const iv = appState.exercise.interval;
  if (!iv) return; // nothing has played yet
  const actualKey = intervalKey(iv.b - iv.a);
  const correct = clickedKey === actualKey;

  paintAnswerResult(getElementById('intervalAnswers'), actualKey, clickedKey);

  appState.exercise.showAnswers.intervals = true;
  renderStaff();
  const result = getElementById('intervalResult');
  if (result) result.textContent = `${correct ? '✓' : '✗'}  ${formatIntervalDisplay(iv.a, iv.b)}`;
}

