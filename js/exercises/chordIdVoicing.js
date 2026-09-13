/**
 * Chord-ID data + selection (no DOM / audio imports, so it unit-tests in Node).
 *
 * The chords are REAL 4-part voicings sampled from the hymn library
 * (openpsalm/chordVoicings.json, built by scripts/extract-voicings). Each voicing is
 * stored key-independently as { label, bassDeg, rels, count } and reconstructed in the
 * singer's movable-Do key at render time — so what you read is a voicing that actually
 * occurs in the hymns, not a textbook stack. Difficulty tiers grow the function
 * vocabulary (primary triads → all triads → + the dominant seventh → + other sevenths).
 */

import { DEGREE_SEMITONES } from '../config/constants.js';

// Functional label for each diatonic triad, indexed by scale degree (0 = Do … 6 = Ti).
export const TRIAD_LABEL = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

// Diatonic sevenths that actually occur in the hymn set, keyed by scale degree.
export const SEVENTH_LABEL = { 4: 'V7', 1: 'ii7', 6: 'vii°7' };

// The shape recipe for each function — shown on reveal so the answer ties back to shapes.
export const FUNCTION_RECIPE = {
  'I': 'Do-Mi-Sol', 'ii': 'Re-Fa-La', 'iii': 'Mi-Sol-Ti', 'IV': 'Fa-La-Do',
  'V': 'Sol-Ti-Re', 'vi': 'La-Do-Mi', 'vii°': 'Ti-Re-Fa',
  'V7': 'Sol-Ti-Re-Fa', 'ii7': 'Re-Fa-La-Do', 'vii°7': 'Ti-Re-Fa-La',
};

// Cumulative tiers, ordered by how often the function shows up in real hymns.
const ALL_TRIADS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
export const TIER_LABELS = {
  easy:   ['I', 'IV', 'V'],
  medium: ALL_TRIADS,
  hard:   [...ALL_TRIADS, 'V7'],
  expert: [...ALL_TRIADS, 'V7', 'ii7', 'vii°7'],
};

export const CHORD_ID_DIFFICULTY_DESC = {
  easy:   'Primary triads — I, IV, V',
  medium: 'All seven diatonic triads',
  hard:   'Triads + the dominant seventh (V7)',
  expert: 'Triads + sevenths (V7, ii7, vii°7)',
};

// Which answer buttons a tier shows. Choices never include a label that can't appear.
export function answerLabelsFor(difficulty) {
  return TIER_LABELS[difficulty] || TIER_LABELS.easy;
}

/* --------------------------------------------------------------- picking --- */

// Pick a real voicing for the tier: choose a function uniformly (so every function in the
// tier gets drilled), then a voicing for it weighted by how common that voicing is.
export function pickVoicing(voicings, difficulty, avoidKey, rng = Math.random) {
  const allowed = new Set(answerLabelsFor(difficulty));
  const present = [...new Set(voicings.filter(v => allowed.has(v.label)).map(v => v.label))];
  if (present.length === 0) return null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const label = present[Math.floor(rng() * present.length)];
    const choices = voicings.filter(v => v.label === label);
    const v = weightedPick(choices, rng);
    if (voicingKey(v) !== avoidKey) return v;
  }
  const label = present[Math.floor(rng() * present.length)];
  return weightedPick(voicings.filter(v => v.label === label), rng);
}

export function voicingKey(v) {
  return `${v.label}|${v.bassDeg}|${v.rels.join(',')}`;
}

function weightedPick(list, rng) {
  const total = list.reduce((s, v) => s + (v.count || 1), 0);
  let r = rng() * total;
  for (const v of list) { r -= (v.count || 1); if (r <= 0) return v; }
  return list[list.length - 1];
}

/* ------------------------------------------------------------ reconstruct --- */

// Rebuild the stored voicing in the singer's key, normalized so the bass sits low and the
// upper voices have staff room. Returns ascending MIDI [B, T, A, S]. Octave shifts never
// change a note's solfège, so the shapes read the same in every key.
export function reconstructVoicing(voicing, doMidi) {
  let midis = voicing.rels.map(r => doMidi + voicing.bassDeg + r);
  while (midis[0] > 50) midis = midis.map(m => m - 12);
  while (midis[0] < 40) midis = midis.map(m => m + 12);
  return midis;
}

/* -------------------------------------------------------------- fallback --- */

// If the voicing data can't load, synthesize one plain root-position triad so the drill
// still works. Diatonic scale steps → semitone offsets from Do.
export function fallbackVoicing(difficulty, rng = Math.random) {
  const labels = answerLabelsFor(difficulty).filter(l => TRIAD_LABEL.includes(l));
  const label = labels[Math.floor(rng() * labels.length)];
  const deg = TRIAD_LABEL.indexOf(label);
  const steps = [0, 2, 4];
  const offs = steps.map(st => DEGREE_SEMITONES[(deg + st) % 7] + (deg + st >= 7 ? 12 : 0));
  const bass = offs[0];
  const rels = [0, offs[1] - offs[0], offs[2] - offs[0], 12]; // + doubled root on top
  return { label, bassDeg: ((bass % 12) + 12) % 12, rels, count: 1 };
}
