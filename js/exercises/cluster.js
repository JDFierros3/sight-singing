/**
 * Hidden cluster exercise
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { DEGREE_SEMITONES, CLUSTER_DIFFICULTY_PRESETS } from '../config/constants.js';
import { randomInRange, normalizeModulo } from '../utils/math.js';
import { getSolfegeForMidi, getIntervalName } from '../utils/musicTheory.js';
import { playTonesForDuration } from './core.js';
import { renderStaff } from '../rendering/staff.js';
import { intervalKey, renderAnswerButtons, paintAnswerResult } from './intervals.js';

export function playHiddenCluster(count) {
  // Reset reveal state when starting a new exercise
  appState.exercise.showAnswers.cluster = false;
  
  const selectedNotes = buildClusterNotes(count);
  
  storeClusterNotes(selectedNotes);
  updateClusterBadge(count);
  const duration = Number(appState.exercise.clusterThinkTime) || 3;
  playTonesForDuration(selectedNotes, duration, `Hidden cluster (${count})`);
  
  // Re-render staff to clear any previously revealed answers
  renderStaff();
}

function buildClusterNotes(count) {
  const difficulty = appState.exercise.clusterDifficulty || 'easy';
  const doMidi = appState.tuning.doMidi;

  // Rules requested:
  // - easy: always includes Do + other notes ascending (above Do), diatonic
  // - medium: always includes Do + other notes ascending OR descending, diatonic
  // - hard: no fixed Do, but diatonic in key
  // - extraHard: free-for-all chromatic within user range

  if (difficulty === 'easy') {
    return buildAnchoredCluster(count, { anchor: doMidi, direction: 'up', diatonic: true });
  }

  if (difficulty === 'medium') {
    return buildAnchoredCluster(count, { anchor: doMidi, direction: 'either', diatonic: true });
  }

  if (difficulty === 'hard') {
    return buildFreeCluster(count, { diatonic: true });
  }

  // extraHard
  return buildFreeCluster(count, { diatonic: false });
}

function buildAnchoredCluster(count, { anchor, direction, diatonic }) {
  const pool = buildPool({ anchor, direction, diatonic, excludeDoPitchClass: true });

  // Always include Do (anchor) directly - no range clamping
  const notes = [];
  notes.push(anchor);

  // Remove anchor from pool so we don't duplicate it.
  const available = pool.filter(m => m !== anchor);

  // Prefer unique pitch classes so Play 3 doesn't often give (Sol, Sol') etc.
  // If we run out of unique pitch classes in the allowed range, we fall back to any remaining.
  const usedPitchClasses = new Set([normalizeModulo(anchor, 12)]);
  while (notes.length < count && available.length > 0) {
    // Try a few times to find a new pitch class.
    let chosenIndex = -1;
    for (let tries = 0; tries < 12; tries++) {
      const idx = randomInRange(0, available.length - 1);
      const pc = normalizeModulo(available[idx], 12);
      if (!usedPitchClasses.has(pc)) {
        chosenIndex = idx;
        break;
      }
    }
    if (chosenIndex === -1) {
      chosenIndex = randomInRange(0, available.length - 1);
    }

    const chosen = available.splice(chosenIndex, 1)[0];
    usedPitchClasses.add(normalizeModulo(chosen, 12));
    notes.push(chosen);
  }

  return notes.sort((a, b) => a - b);
}

function buildFreeCluster(count, { diatonic }) {
  const pool = buildPool({ anchor: appState.tuning.doMidi, direction: 'either', diatonic, excludeDoPitchClass: false });
  const notes = [];
  const available = [...pool];

  while (notes.length < count && available.length > 0) {
    const idx = randomInRange(0, available.length - 1);
    notes.push(available.splice(idx, 1)[0]);
  }

  return notes.sort((a, b) => a - b);
}

function buildPool({ anchor, direction, diatonic, excludeDoPitchClass }) {
  const doMidi = appState.tuning.doMidi;

  const preset = CLUSTER_DIFFICULTY_PRESETS[appState.exercise.clusterDifficulty] || null;
  const octaveRange = preset ? preset.octaveRange : null;
  
  // Use wide default range (full MIDI range 0-127) if no octaveRange constraint
  // Otherwise calculate range based on Do and octaveRange, clamped to MIDI range
  const minAllowed = octaveRange ? Math.max(0, doMidi - 12 * octaveRange) : 0;
  const maxAllowed = octaveRange ? Math.min(127, doMidi + 12 * octaveRange) : 127;

  const pool = [];

  for (let midi = minAllowed; midi <= maxAllowed; midi++) {
    if (direction === 'up' && midi < anchor) continue;
    if (direction === 'down' && midi > anchor) continue;
    if (direction === 'up' && midi === anchor) continue; // "other note ascending"

    if (diatonic) {
      const rel = normalizeModulo(midi - doMidi, 12);
      // Check if note is a standard diatonic degree
      // DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] = Do, Re, Mi, Fa, Sol, La, Ti
      // Ti (rel === 11) is already included, so no special case needed
      const isDiatonic = DEGREE_SEMITONES.includes(rel);
      if (!isDiatonic) continue;
      if (excludeDoPitchClass && rel === 0) continue; // avoid octave-Do duplicates in easy/medium
    }

    pool.push(midi);
  }

  // If we filtered too hard (edge cases), fall back to at least the anchor-only pool.
  return pool.length ? pool : [anchor];
}

function storeClusterNotes(notes) {
  appState.exercise.hidden = { midi: notes };
}

function updateClusterBadge(count) {
  const badge = getElementById('hiddenBadge');
  setTextContent(badge, `${count} tones ready`);
}

export function revealClusterNotes() {
  if (!appState.exercise.hidden) {
    const badge = getElementById('hiddenBadge');
    setTextContent(badge, 'none');
    return;
  }
  
  const displayText = formatClusterDisplay(appState.exercise.hidden.midi);
  const badge = getElementById('hiddenBadge');
  setTextContent(badge, displayText);
}

function formatClusterDisplay(notes) {
  const solfegeNames = notes.map(midi => {
    const solfege = getSolfegeForMidi(midi, appState.tuning.doMidi);
    return solfege || '?';
  });
  
  const base = appState.tuning.doMidi;
  const intervals = notes.map(midi => {
    const semitones = normalizeModulo(Math.abs(midi - base), 12);
    return getIntervalName(semitones);
  }).join(' · ');
  
  return `${solfegeNames.join(', ')}  [${intervals}]`;
}


/* -------------------------------------------------- interactive answers --- */
/* Pitch Distinction = interval identification, but the two notes sound TOGETHER
   (harmonic) instead of in sequence. Same answer buttons as Interval Training. */

// Which interval keys the level offers (all measured up from Do).
const CLUSTER_KEYS = {
  easy:      [2, 4, 5, 7],                              // 2nd 3rd 4th 5th
  medium:    [2, 4, 5, 7, 9, 11, 12],                  // up to the octave
  hard:      [2, 3, 4, 5, 7, 8, 9, 11, 12],            // + minor 3rd/6th
  extraHard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]   // chromatic
};
function clusterKeys() { return CLUSTER_KEYS[appState.exercise.clusterDifficulty] || CLUSTER_KEYS.easy; }

// Play a two-note dyad (Do + a random interval) simultaneously; identify the interval.
export function playClusterExercise() {
  appState.exercise.showAnswers.cluster = false;
  const keys = clusterKeys();
  const span = keys[randomInRange(0, keys.length - 1)];
  const doMidi = appState.tuning.doMidi;
  const notes = [doMidi, doMidi + span];
  storeClusterNotes(notes);
  updateClusterBadge(2);
  const duration = Number(appState.exercise.clusterThinkTime) || 3;
  playTonesForDuration(notes, duration, 'Pitch distinction dyad');   // both at once
  renderStaff();
  renderClusterAnswers();
  const result = getElementById('clusterResult');
  if (result) result.textContent = 'Both notes sound together — name the interval.';
}

// Same interval buttons as Interval Training, always from Do.
export function renderClusterAnswers() {
  renderAnswerButtons(getElementById('clusterAnswers'), clusterKeys(), true, handleClusterAnswerClick);
}

// Grade the interval guess, then stack both shape-notes on the staff.
function handleClusterAnswerClick(clickedKey) {
  const notes = appState.exercise.hidden?.midi;
  if (!notes || notes.length < 2) return;
  const actualKey = intervalKey(notes[1] - notes[0]);
  const correct = clickedKey === actualKey;

  paintAnswerResult(getElementById('clusterAnswers'), actualKey, clickedKey);

  appState.exercise.showAnswers.cluster = true;
  renderStaff();
  const result = getElementById('clusterResult');
  if (result) result.textContent = `${correct ? '✓' : '✗'}  ${formatClusterDisplay(notes)}`;
}
