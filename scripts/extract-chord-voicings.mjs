/**
 * Build openpsalm/chordVoicings.json — the Chord ID drill's chord bank.
 *
 * Walks every hymn in openpsalm/songs.json, samples each vertical 4-part (SATB)
 * sonority, and keeps the ones that spell a diatonic chord in that hymn's major key.
 * Each kept chord is stored key-independently as { label, bassDeg, rels, count } so the
 * app can reconstruct the real voicing in the singer's movable-Do key. See
 * js/exercises/chordIdVoicing.js for the runtime side.
 *
 * Run: npm run build-chord-voicings   (or: node scripts/extract-chord-voicings.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SONGS = path.join(ROOT, 'openpsalm', 'songs.json');
const OUT = path.join(ROOT, 'openpsalm', 'chordVoicings.json');

const DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // Do Re Mi Fa Sol La Ti
const TRIAD_LABEL = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const SEVENTH_LABEL = { 4: 'V7', 1: 'ii7', 6: 'vii°7' }; // diatonic sevenths that occur in the set
const MAX_SPAN = 31; // semitones bass→soprano; skip freak spreads (held bass under a high melody)
const degIndexOfPc = pc => DEGREE_SEMITONES.indexOf(pc);

function noteAt(notes, t) {
  let best = null;
  for (const n of notes) {
    if (n.startTime <= t + 1e-6 && t < n.startTime + n.duration - 1e-6) {
      if (!best || n.startTime > best.startTime) best = n;
    }
  }
  return best;
}

function classify(distinctDegs) {
  const set = new Set(distinctDegs);
  const eq = arr => arr.length === set.size && arr.every(d => set.has(d));
  for (let r = 0; r < 7; r++) if (eq([r, (r + 2) % 7, (r + 4) % 7])) return TRIAD_LABEL[r];
  for (let r = 0; r < 7; r++) if (eq([r, (r + 2) % 7, (r + 4) % 7, (r + 6) % 7]) && SEVENTH_LABEL[r]) return SEVENTH_LABEL[r];
  return null;
}

const songs = JSON.parse(fs.readFileSync(SONGS, 'utf8'));
const pool = new Map();
let sonorities = 0, classified = 0;

for (const song of songs) {
  const { S, A, T, B } = song.parts || {};
  if (!S || !A || !T || !B) continue;
  const tonicPc = (((song.midiKeyMidi % 12) + 12) % 12);
  const onsets = [...new Set([...S, ...A, ...T, ...B].map(n => n.startTime))].sort((a, b) => a - b);

  for (const t of onsets) {
    const voices = [B, T, A, S].map(part => noteAt(part, t));
    if (voices.some(v => !v)) continue;
    sonorities++;
    const midis = voices.map(v => v.midi);
    const degs = midis.map(m => degIndexOfPc((((m - tonicPc) % 12) + 12) % 12));
    if (degs.some(d => d === -1)) continue;
    const lo = Math.min(...midis);
    if (Math.max(...midis) - lo > MAX_SPAN) continue;
    const label = classify([...new Set(degs)]);
    if (!label) continue;
    classified++;

    const bassDeg = (((lo - tonicPc) % 12) + 12) % 12;
    const rels = midis.slice().sort((a, b) => a - b).map(m => m - lo);
    const key = `${label}|${bassDeg}|${rels.join(',')}`;
    const cur = pool.get(key) || { label, bassDeg, rels, count: 0 };
    cur.count++;
    pool.set(key, cur);
  }
}

const voicings = [...pool.values()].sort((a, b) => b.count - a.count);
fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: 'openpsalm/songs.json', voicings }, null, 0));
console.log(`Chord ID bank: ${classified} chords from ${songs.length} hymns → ${voicings.length} unique voicings`);
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
