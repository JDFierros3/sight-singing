/**
 * Hidden cluster exercise
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { DEGREE_SEMITONES, CLUSTER_DIFFICULTY_PRESETS } from '../config/constants.js';
import { randomInRange, normalizeModulo } from '../utils/math.js';
import { getSolfegeForMidi, getIntervalName } from '../utils/musicTheory.js';
import { filterNoteByScale, playTonesForDuration } from './core.js';

export function playHiddenCluster(count) {
  const notePool = buildNotePoolForCluster();
  const filteredPool = filterPoolByScale(notePool);
  const selectedNotes = selectRandomNotesFromPool(filteredPool, count);
  
  storeClusterNotes(selectedNotes);
  updateClusterBadge(count);
  playTonesForDuration(selectedNotes, 2.5, `Hidden cluster (${count})`);
}

function buildNotePoolForCluster() {
  const root = appState.tuning.doMidi;
  const scaleDegrees = DEGREE_SEMITONES;
  const pool = [];
  
  scaleDegrees.forEach(degree => {
    const baseNote = root + degree;
    const octaves = expandNoteAcrossOctaves(baseNote);
    pool.push(...octaves);
  });
  
  return pool;
}

function expandNoteAcrossOctaves(baseNote) {
  const notes = [];
  const minMidi = appState.tuning.minMidi;
  const maxMidi = appState.tuning.maxMidi;
  const doMidi = appState.tuning.doMidi;
  const difficulty = appState.exercise.clusterDifficulty;
  
  // Get octave range from preset, or use full range if no difficulty set
  let maxOctaves = null; // Full range by default
  if (difficulty) {
    const preset = CLUSTER_DIFFICULTY_PRESETS[difficulty];
    if (preset && preset.octaveRange !== null) {
      maxOctaves = preset.octaveRange;
    }
  }
  
  // If maxOctaves is null, use full range (all octaves within min/max)
  if (maxOctaves === null) {
    // Full range - expand across all octaves within the user's range
    for (let note = baseNote; note >= minMidi; note -= 12) {
      if (isNoteInRange(note, minMidi, maxMidi)) {
        notes.push(note);
      }
    }
    for (let note = baseNote + 12; note <= maxMidi; note += 12) {
      if (isNoteInRange(note, minMidi, maxMidi)) {
        notes.push(note);
      }
    }
  } else {
    // Limited octave range based on difficulty
    for (let octave = -maxOctaves; octave <= maxOctaves; octave++) {
      const note = baseNote + (12 * octave);
      if (isNoteInRange(note, minMidi, maxMidi)) {
        // For Easy mode, also constrain to one octave from Do
        if (difficulty === 'easy' && Math.abs(note - doMidi) > 12) {
          continue;
        }
        notes.push(note);
      }
    }
  }
  
  return notes;
}

function isNoteInRange(note, min, max) {
  return note >= min && note <= max;
}

function filterPoolByScale(pool) {
  if (!appState.exercise.onScaleOnly) {
    return buildFullRangePool();
  }
  return pool;
}

function buildFullRangePool() {
  const pool = [];
  const minMidi = appState.tuning.minMidi;
  const maxMidi = appState.tuning.maxMidi;
  
  for (let note = minMidi; note <= maxMidi; note++) {
    pool.push(note);
  }
  
  return pool;
}

function selectRandomNotesFromPool(pool, count) {
  const selected = [];
  const available = [...pool];
  
  while (selected.length < count && available.length > 0) {
    const randomIndex = randomInRange(0, available.length - 1);
    const note = available.splice(randomIndex, 1)[0];
    
    if (filterNoteByScale(note)) {
      selected.push(note);
    }
  }
  
  return selected.sort((a, b) => a - b);
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

