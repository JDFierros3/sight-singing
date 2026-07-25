/**
 * OpenPsalm.com song handoff.
 *
 * OpenPsalm.com links a singer straight into this app with the song embedded in
 * the URL fragment (which never leaves the browser):
 *
 *   https://<this-app>/#op=<base64url(JSON.stringify(songOrSongs))>
 *
 * `songOrSongs` is one exercise object, or an array of them, in the same shape
 * as the entries in openpsalm/songs.json (parts + key + tempo + lyrics). The
 * fragment is decoded on load, validated as untrusted input, and appended to the
 * SATB hymn library so it sits alongside the bundled hymns.
 *
 * Producer side (on OpenPsalm.com):
 *   const op = btoa(unescape(encodeURIComponent(JSON.stringify(song))))
 *                .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 *   location.href = `https://<this-app>/#op=${op}`;
 */

import { appState } from '../state/appState.js';

const PARTS = ['S', 'A', 'T', 'B'];
const MAX_SONGS = 200;
const MAX_NOTES_PER_SONG = 8000;
const MAX_STRING = 500;
const MAX_TIE_SEGMENTS = 16;

let handoffReceived = false;

/**
 * Decode the #op= payload, validate it, and append the songs to the library.
 * Returns the exercises that were loaded (empty array if none / on any error).
 */
export function loadOpenPsalmHandoff() {
  const raw = readHandoffParam();
  if (!raw) return [];

  const songs = parseHandoffSongs(raw);
  clearHandoffFromUrl(); // don't re-import on refresh or leave the blob in the bar

  const exercises = songs.map(sanitizeSong).filter(Boolean);
  for (const exercise of exercises) {
    appState.satb.midiExercises.push(exercise);
  }

  handoffReceived = exercises.length > 0;
  if (handoffReceived) {
    console.log(`Loaded ${exercises.length} OpenPsalm handoff song(s) from URL`);
  }
  return exercises;
}

/** Did a valid song arrive via the OpenPsalm.com handoff this load? */
export function hadOpenPsalmHandoff() {
  return handoffReceived;
}

// --- decoding -------------------------------------------------------------

function readHandoffParam() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  return new URLSearchParams(hash).get('op');
}

function parseHandoffSongs(raw) {
  try {
    const json = JSON.parse(decodeBase64Url(raw));
    const list = Array.isArray(json) ? json : [json];
    return list.slice(0, MAX_SONGS);
  } catch (error) {
    console.warn('Could not decode OpenPsalm handoff payload:', error);
    return [];
  }
}

function decodeBase64Url(input) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  const binary = atob(b64 + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function clearHandoffFromUrl() {
  const clean = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', clean);
}

// --- validation of untrusted input ---------------------------------------

function sanitizeSong(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const parts = sanitizeParts(raw.parts);
  if (!parts) return null; // a song with no playable notes is useless

  return {
    id: toStr(raw.id) || `op-handoff-${Math.random().toString(36).slice(2, 8)}`,
    source: 'openpsalm',
    sourceUrl: sanitizeUrl(raw.sourceUrl),
    label: toStr(raw.label) || toStr(raw.hymnName) || 'OpenPsalm Song',
    hymnName: toStr(raw.hymnName) || toStr(raw.label) || 'OpenPsalm Song',
    parts,
    duration: clampNum(raw.duration, 0, 1e6, 0),
    midiKeyMidi: clampInt(raw.midiKeyMidi, 0, 127, 0),
    midiKeyMode: raw.midiKeyMode === 'minor' ? 'minor' : 'major',
    keySignature: toStr(raw.keySignature) || 'C',
    isMidiExercise: true,
    tempoBpm: clampNum(raw.tempoBpm, 20, 400, 100),
    timeSigNum: clampInt(raw.timeSigNum, 1, 32, 4),
    timeSigDen: clampInt(raw.timeSigDen, 1, 32, 4),
    phraseBreaks: sanitizeStringArray(raw.phraseBreaks),
    lyrics: raw.lyrics && typeof raw.lyrics === 'object' ? raw.lyrics : {},
    lyricsByNote: sanitizeStringArray(raw.lyricsByNote),
    copyrights: sanitizeStringArray(raw.copyrights)
  };
}

function sanitizeParts(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const parts = {};
  let total = 0;
  for (const part of PARTS) {
    if (!Array.isArray(raw[part])) continue;
    const notes = sanitizeNotes(raw[part], part, MAX_NOTES_PER_SONG - total);
    if (notes.length) {
      parts[part] = notes;
      total += notes.length;
    }
  }
  return total > 0 ? parts : null;
}

function sanitizeNotes(raw, part, budget) {
  const notes = [];
  for (const note of raw) {
    if (notes.length >= budget) break;
    if (!note || typeof note !== 'object') continue;
    const midi = clampInt(note.midi, 0, 127, null);
    const startTime = clampNum(note.startTime, 0, 1e6, null);
    const duration = clampNum(note.duration, 0, 1e6, null);
    if (midi === null || startTime === null || duration === null || duration <= 0) continue;
    const clean = { midi, startTime, duration, part };
    // Notation extras (optional): they only affect how the note is engraved, never
    // playback, so anything malformed is dropped and the note still sounds.
    const tieDurs = sanitizeTieDurs(note.tieDurs, duration);
    if (tieDurs) clean.tieDurs = tieDurs;
    const slurId = clampInt(note.slurId, 0, 1e6, null);
    if (slurId !== null) clean.slurId = slurId;
    if (note.fermata === true) clean.fermata = true;
    notes.push(clean);
  }
  return notes;
}

/**
 * Written tie segments for one note. Kept only when there are 2+ positive segments
 * that add up to the note's total duration (within rounding) — otherwise the
 * renderer would engrave a length that disagrees with what the note plays.
 */
function sanitizeTieDurs(value, duration) {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_TIE_SEGMENTS) return null;
  const segs = [];
  for (const seg of value) {
    const d = clampNum(seg, 0, 1e6, null);
    if (d === null || d <= 0) return null;
    segs.push(d);
  }
  const total = segs.reduce((s, d) => s + d, 0);
  return Math.abs(total - duration) <= 0.01 ? segs : null;
}

// --- coercion helpers -----------------------------------------------------

function sanitizeUrl(value) {
  const str = toStr(value);
  return /^https?:\/\//i.test(str) ? str : '';
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_NOTES_PER_SONG).map(toStr);
}

function toStr(value) {
  return typeof value === 'string' ? value.slice(0, MAX_STRING) : '';
}

function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(value, min, max, fallback) {
  const n = clampNum(value, min, max, fallback);
  return n === null ? null : Math.round(n);
}
