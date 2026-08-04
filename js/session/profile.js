/**
 * Singer profile — the one meaningful choice (voice type) that tunes the whole app.
 *
 * ZERO BACKEND: this is the app's only persistence. Everything lives in localStorage
 * under the `solfege.v1.*` namespace (per-device, no accounts, no sync). A cookie is
 * written as a best-effort fallback flag so we can tell a returning singer even if
 * localStorage is unavailable (private mode); the authoritative record is localStorage.
 */

import { appState } from '../state/appState.js';

const PROFILE_KEY = 'solfege.v1.profile';

/**
 * Voice types (SATB — hymns are four-part, so no Baritone). Each carries a default
 * movable-Do tonic chosen so a one-octave warm-up sits comfortably in that range, plus
 * the SATB part the singer aims for.
 */
export const VOICE_PROFILES = {
  // range = comfortable [minMidi, maxMidi] (mirrors PART_RANGES in constants.js); clef the
  // warm-up/staff defaults to; warmTempo a gentle per-voice default. See the "voice-tuning
  // contract" in design/solfege-design-system.html. Do + part are the load-bearing values;
  // tempo is a starting point to tune by ear.
  soprano: { key: 'soprano', label: 'Soprano', part: 'S', doMidi: 65, range: [60, 81], clef: 'treble', warmTempo: 80 }, // F4
  alto:    { key: 'alto',    label: 'Alto',    part: 'A', doMidi: 57, range: [55, 74], clef: 'treble', warmTempo: 76 }, // A3
  tenor:   { key: 'tenor',   label: 'Tenor',   part: 'T', doMidi: 53, range: [48, 69], clef: 'bass',   warmTempo: 72 }, // F3
  bass:    { key: 'bass',    label: 'Bass',    part: 'B', doMidi: 48, range: [40, 64], clef: 'bass',   warmTempo: 69 }  // C3
};

/**
 * The active voice's tuning — the single source every exercise reads to auto-configure itself
 * (Do, range, clef, tempo, part) without asking the singer. Falls back to Alto if unset.
 */
export function getVoiceTuning() {
  const p = loadProfile();
  const v = (p && VOICE_PROFILES[p.voice]) || VOICE_PROFILES.alto;
  return {
    voice: v.key,
    part: v.part,
    doMidi: Number.isFinite(p?.doMidi) ? p.doMidi : v.doMidi,
    range: v.range,
    clef: v.clef,
    warmTempo: v.warmTempo
  };
}

/* --------------------------------------------------------------- storage --- */

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function hasProfile() {
  return !!loadProfile();
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) { /* private mode — cookie fallback below still marks "seen" */ }
  try {
    document.cookie = `solfege_v1_seen=1; path=/; max-age=${60 * 60 * 24 * 365}`;
  } catch (e) { /* ignore */ }
}

export function clearProfile() {
  try { localStorage.removeItem(PROFILE_KEY); } catch (e) { /* ignore */ }
}

/* --------------------------------------------------------------- apply ----- */

/**
 * Push a profile into live app state: set the movable-Do tonic (via the existing #doNote
 * control so its change-handler re-renders everything) and the SATB aim part.
 */
export function applyProfile(profile) {
  if (!profile) return;
  const voice = VOICE_PROFILES[profile.voice];
  const doMidi = Number.isFinite(profile.doMidi) ? profile.doMidi : (voice ? voice.doMidi : appState.tuning.doMidi);

  // Set state authoritatively FIRST. On boot, applyProfile runs before the #doNote change
  // handler is wired, so a dispatched change event alone is lost and Do silently reverts to
  // its default — this line is what actually tunes the movable-Do to the singer's voice.
  appState.tuning.doMidi = doMidi;

  const select = document.getElementById('doNote');
  if (select) {
    select.value = String(doMidi);
    // Still notify any listeners that ARE wired (staff re-render, etc.).
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (voice) appState.satb.aimPart = voice.part;
}

/** Build a stored-profile object from the onboarding draft. */
export function makeProfile(draft) {
  const voice = VOICE_PROFILES[draft.voice] || VOICE_PROFILES.alto;
  return {
    v: 1,
    voice: voice.key,
    part: voice.part,
    doMidi: Number.isFinite(draft.doMidi) ? draft.doMidi : voice.doMidi,
    focus: draft.focus || { ear: true, theory: true, hymns: false, sight: false },
    shapesKnown: !!draft.shapesKnown,
    length: draft.length || 20
  };
}
