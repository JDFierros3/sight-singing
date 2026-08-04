/**
 * Guided-session engine. Turns a saved profile into an ordered setlist of steps, where each
 * step is one of the app's real tabs — the session is a companion that rides ON the tabs, not
 * a replacement for them. Back / Skip / Next (Next primary) walk the list; "Free play" exits.
 *
 * State persists to localStorage (solfege.v1.session) so a singer can resume on the same
 * device (ZERO backend).
 */

import { switchToTab } from '../ui/components/tabs.js';
import { displayWarmupStaff } from '../exercises/warmup.js';
import { loadProfile } from './profile.js';

const SESSION_KEY = 'solfege.v1.session';

// How many steps a session should run for, by chosen length (minutes).
const TARGET_STEPS = { 10: 4, 20: 7, 35: 10 };

let current = null; // { steps:[...], index:int, profile }

/* ------------------------------------------------------- setlist builder --- */

/**
 * Build an ordered setlist from the profile. Warm-up is always early; a hymn closes it.
 * "Shapes not memorized" seeds a flashcard primer + lesson 1 up front.
 */
export function generateSetlist(profile) {
  const steps = [];
  const push = (type, label, tab, extra) => steps.push({ type, label, tab, kind: 'ear', ...extra });

  if (!profile.shapesKnown) {
    push('flashcards', 'Shape-note primer', 'flashcards', { kind: 'shapes' });
    push('lesson', 'Lesson 1 · Shapes & syllables', 'theory', { kind: 'theory', lessonId: '1' });
  }

  push('warmup', 'Warm-up', 'warmup', { kind: 'warm' });

  const f = profile.focus || {};
  if (f.ear) {
    push('intervals', 'Intervals from Do', 'intervals', { kind: 'ear' });
    push('cluster', 'Chord listening', 'cluster', { kind: 'ear' });
    push('chord-quality', 'Chord quality', 'chord-quality', { kind: 'ear' });
  }
  if (f.theory) {
    push('lesson', 'Lesson 3 · Intervals', 'theory', { kind: 'theory', lessonId: '3' });
  }
  if (f.sight) {
    push('flashcards', 'Sight-reading drill', 'flashcards', { kind: 'sight' });
  }

  // Always close by singing a hymn in parts — the point of the whole thing.
  push('satb', 'Sing a hymn', 'satb', { kind: 'hymn' });

  return scaleToLength(steps, profile.length);
}

// Trim the middle to hit the target length, always keeping the opener(s) and the closing hymn.
function scaleToLength(steps, length) {
  const target = TARGET_STEPS[length] || 7;
  if (steps.length <= target) return steps;
  const head = steps.slice(0, Math.max(2, target - 1)); // keep the opening run
  const tail = steps[steps.length - 1];                 // keep the hymn
  return head.concat(tail);
}

/* ---------------------------------------------------------- persistence ---- */

function persist() {
  if (!current) { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} return; }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ steps: current.steps, index: current.index }));
  } catch (e) { /* ignore */ }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function hasActiveSession() {
  const s = loadSession();
  return !!(s && Array.isArray(s.steps) && s.steps.length && s.index < s.steps.length);
}

export function isSessionActive() {
  return !!current;
}

export function getCurrentStep() {
  return current ? current.steps[current.index] : null;
}
export function getProgress() {
  return current ? { index: current.index, total: current.steps.length } : null;
}

/* ------------------------------------------------------------- controls ---- */

export function startSession(profile) {
  const p = profile || loadProfile();
  if (!p) return;
  current = { steps: generateSetlist(p), index: 0, profile: p };
  persist();
  applyStep();
}

/** Resume a session saved in localStorage (e.g. from the Home "Resume" button). */
export function resumeSession() {
  const saved = loadSession();
  if (!saved || !saved.steps || !saved.steps.length) return false;
  current = { steps: saved.steps, index: Math.min(saved.index || 0, saved.steps.length - 1), profile: loadProfile() };
  persist();
  applyStep();
  return true;
}

export function nextStep() {
  if (!current) return;
  if (current.index >= current.steps.length - 1) { completeSession(); return; }
  current.index += 1;
  persist();
  applyStep();
}

export function prevStep() {
  if (!current || current.index === 0) return;
  current.index -= 1;
  persist();
  applyStep();
}

export const skipStep = nextStep; // Skip == advance (kept distinct in UI wording).

export function exitSession() {
  current = null;
  persist();
  document.dispatchEvent(new CustomEvent('session:changed'));
}

function completeSession() {
  current = null;
  persist();
  document.dispatchEvent(new CustomEvent('session:complete'));
}

/** Route to the current step's tab and do any per-tab setup. */
function applyStep() {
  const step = getCurrentStep();
  if (!step) return;
  switchToTab(step.tab);
  if (step.tab === 'warmup') { try { displayWarmupStaff(); } catch (e) {} }
  document.dispatchEvent(new CustomEvent('session:changed'));
}
