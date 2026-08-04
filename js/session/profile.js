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
  soprano: { key: 'soprano', label: 'Soprano', part: 'S', doMidi: 65 }, // F4
  alto:    { key: 'alto',    label: 'Alto',    part: 'A', doMidi: 57 }, // A3
  tenor:   { key: 'tenor',   label: 'Tenor',   part: 'T', doMidi: 53 }, // F3
  bass:    { key: 'bass',    label: 'Bass',    part: 'B', doMidi: 48 }  // C3
};

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

  const select = document.getElementById('doNote');
  if (select) {
    select.value = String(doMidi);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    appState.tuning.doMidi = doMidi;
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
