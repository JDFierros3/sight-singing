/**
 * Visual Chord ID exercise (Learn room)
 *
 * Shows a REAL 4-part hymn voicing on the grand staff (shape notes) and asks the singer
 * to identify its function in movable-Do terms: the Roman numeral / shape recipe
 * (I = Do-Mi-Sol, V = Sol-Ti-Re, …). Chords are sampled from the hymn library
 * (openpsalm/chordVoicings.json), so the voicings are ones that actually occur — mostly
 * root position, the odd inversion where hymns really use one. Difficulty grows the
 * function vocabulary; the answer is always the function, taught in Lesson 5.
 *
 * Selection + voicing math live in chordIdVoicing.js (DOM-free, unit-tested).
 */

import { getElementById } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { playTonesForDuration } from './core.js';
import { renderStaff } from '../rendering/staff.js';
import { getSolfegeForMidi } from '../utils/musicTheory.js';
import {
  pickVoicing, voicingKey, reconstructVoicing, fallbackVoicing,
  answerLabelsFor, FUNCTION_RECIPE,
} from './chordIdVoicing.js';

export { CHORD_ID_DIFFICULTY_DESC } from './chordIdVoicing.js';

let voicingData = null;      // { voicings: [...] } once loaded
let loadPromise = null;
let currentIdChord = null;
let lastKey = null;

// Load the sampled hymn voicings once (mirrors how satb.js fetches the hymn library).
function ensureVoicings() {
  if (voicingData) return Promise.resolve(voicingData);
  if (!loadPromise) {
    loadPromise = fetch('./openpsalm/chordVoicings.json')
      .then(r => (r.ok ? r.json() : null))
      .then(json => { voicingData = json && Array.isArray(json.voicings) ? json : { voicings: [] }; return voicingData; })
      .catch(() => { voicingData = { voicings: [] }; return voicingData; });
  }
  return loadPromise;
}

export function playChordId() {
  ensureVoicings().then(data => {
    const difficulty = appState.exercise.chordIdDifficulty;
    const voicing = pickVoicing(data.voicings, difficulty, lastKey) || fallbackVoicing(difficulty);
    lastKey = voicingKey(voicing);

    const midis = reconstructVoicing(voicing, appState.tuning.doMidi);
    currentIdChord = { label: voicing.label, midis };

    appState.exercise.display.midis = midis;
    renderStaff();
    playTonesForDuration(midis, 2.2, `Chord ${voicing.label}`);

    renderChordIdAnswers();
    const r = getElementById('chordIdResult');
    if (r) r.textContent = 'What chord is this?';
  });
}

export function renderChordIdAnswers() {
  const row = getElementById('chordIdAnswers');
  if (!row) return;
  row.innerHTML = '';
  answerLabelsFor(appState.exercise.chordIdDifficulty).forEach(label => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ans';
    btn.dataset.fn = label;
    btn.textContent = label;
    btn.addEventListener('click', () => handleChordIdAnswerClick(label));
    row.appendChild(btn);
  });
}

function handleChordIdAnswerClick(clicked) {
  if (!currentIdChord) return;
  const actual = currentIdChord.label;
  const correct = clicked === actual;

  const row = getElementById('chordIdAnswers');
  row.querySelectorAll('.ans').forEach(b => {
    b.disabled = true;
    if (b.dataset.fn === actual) b.classList.add('good');
    if (b.dataset.fn === clicked && !correct) b.classList.add('bad');
  });

  const r = getElementById('chordIdResult');
  if (r) r.textContent = `${correct ? '✓' : '✗'}  ${actual} · ${FUNCTION_RECIPE[actual] || ''}  ·  ${sungShapes()}`;
}

// The actual shapes sung, bottom voice to top — so the reveal shows the real voicing.
function sungShapes() {
  const doMidi = appState.tuning.doMidi;
  return currentIdChord.midis.map(m => getSolfegeForMidi(m, doMidi) || '?').join('-');
}
