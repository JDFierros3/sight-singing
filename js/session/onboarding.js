/**
 * First-run onboarding wizard (mobile-first): Start → voice → range → focus/shapes/length.
 * Writes a local profile (see profile.js) and applies it, then hands off to the app.
 * A later step wires "Build my session" into the session engine; for now it lands the
 * singer on the Warm Up staff already tuned to their voice.
 */

import { appState } from '../state/appState.js';
import { VOICE_PROFILES, loadProfile, saveProfile, applyProfile, makeProfile } from './profile.js';
import { switchToTab } from '../ui/components/tabs.js';
import { displayWarmupStaff } from '../exercises/warmup.js';
import { beepDo } from '../audio/doPitch.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

// Inline shape-note heads (match js/rendering/shapes.js). Kept here so the overlay needs no
// canvas: Do triangle, Re half-circle, Mi diamond, Fa right-triangle, Sol oval, La rect, Ti cone.
const SHAPE_PATHS = {
  Do: '<path d="M10 2 L2 16 L18 16 Z"/>',
  Re: '<path d="M2 13.5 A8 9.5 0 0 1 18 13.5 Z"/>',
  Mi: '<path d="M10 2 L17.5 10 L10 18 L2.5 10 Z"/>',
  Fa: '<path d="M5 16.5 L5 3 L17 16.5 Z"/>',
  Sol: '<ellipse cx="10" cy="10" rx="8" ry="5.2" transform="rotate(-20 10 10)"/>',
  La: '<rect x="2.5" y="6" width="15" height="8" rx="0.6"/>',
  Ti: '<path d="M3.6 8 Q10 0.6 16.4 8 L10 17.6 Z"/>'
};
const SHAPE_COLORS = { Do: '#8bd3ff', Re: '#a7f3d0', Mi: '#fde68a', Fa: '#fca5a5', Sol: '#c4b5fd', La: '#f9a8d4', Ti: '#fdba74' };
const shape = (syl, size = 18) =>
  `<svg viewBox="0 0 20 18" width="${size}" height="${Math.round(size * 0.9)}" fill="${SHAPE_COLORS[syl]}" aria-hidden="true">${SHAPE_PATHS[syl]}</svg>`;
const shapeRow = () => ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'].map(s => shape(s, 22)).join('');

let draft = null;

/** On boot: apply a saved profile, or launch onboarding for a first-time singer. */
export function maybeStartOnboarding() {
  const existing = loadProfile();
  if (existing) { applyProfile(existing); return; }
  startOnboarding();
}

export function startOnboarding() {
  draft = { voice: 'alto', doMidi: null, focus: { ear: true, theory: true, hymns: false, sight: false }, shapesKnown: false, length: 20 };
  document.body.classList.add('onb-open');
  ensureOverlay().hidden = false;
  setStep(0);
}

function ensureOverlay() {
  let ov = document.getElementById('onboarding');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'onboarding';
    ov.className = 'onb';
    document.body.appendChild(ov);
  }
  return ov;
}

function closeOverlay() {
  const ov = document.getElementById('onboarding');
  if (ov) ov.hidden = true;
  document.body.classList.remove('onb-open');
}

/* -------------------------------------------------------------- steps ------ */

const STEPS = [renderWelcome, renderVoice, renderRange, renderFocus];

function setStep(n) {
  const ov = ensureOverlay();
  const step = STEPS[n];
  ov.innerHTML = `<div class="onb-card">${step()}</div>`;
  wireCommon(ov);
  if (step === renderVoice) wireVoice(ov);
  if (step === renderRange) wireRange(ov);
  if (step === renderFocus) wireFocus(ov);
}

// Any element with data-go="N" advances to step N; data-finish triggers completion.
function wireCommon(ov) {
  ov.querySelectorAll('[data-go]').forEach(el =>
    el.addEventListener('click', () => setStep(Number(el.dataset.go))));
  ov.querySelectorAll('[data-finish]').forEach(el =>
    el.addEventListener('click', finish));
}

function renderWelcome() {
  return `
    <div class="onb-shapes">${shapeRow()}</div>
    <h2 class="onb-h">Learn to sing by<br>shape &amp; syllable</h2>
    <p class="onb-sub">movable-Do · sing against a drone · no scoring</p>
    <button class="onb-primary" data-go="1">Start singing</button>`;
}

function renderVoice() {
  const opts = Object.values(VOICE_PROFILES).map(v =>
    `<button class="onb-voice${draft.voice === v.key ? ' sel' : ''}" data-voice="${v.key}">${v.label}</button>`).join('');
  return `
    <div class="onb-step">Step 1 of 3</div>
    <h2 class="onb-h">What do you mostly sing?</h2>
    <div class="onb-voices">${opts}</div>
    <p class="onb-hint">Pick the part that fits your voice — you can change it later.</p>
    <button class="onb-primary" data-go="2">Continue →</button>`;
}

function wireVoice(ov) {
  ov.querySelectorAll('[data-voice]').forEach(btn =>
    btn.addEventListener('click', () => {
      draft.voice = btn.dataset.voice;
      draft.doMidi = null; // reset any nudge when switching voice
      ov.querySelectorAll('[data-voice]').forEach(b => b.classList.toggle('sel', b === btn));
    }));
}

function renderRange() {
  const doMidi = draft.doMidi ?? VOICE_PROFILES[draft.voice].doMidi;
  const label = VOICE_PROFILES[draft.voice].label;
  return `
    <div class="onb-step">Step 2 of 3</div>
    <h2 class="onb-h">Your comfortable Do</h2>
    <p class="onb-sub">From ${label} we set your starting note. Nudge it if it sits too high or low.</p>
    <div class="onb-do">
      <button class="onb-step-btn" data-oct="-12" aria-label="Octave down">–</button>
      <div class="onb-do-note"><span class="onb-do-name">${noteName(doMidi)}</span><small>Do</small></div>
      <button class="onb-step-btn" data-oct="12" aria-label="Octave up">+</button>
    </div>
    <button class="onb-secondary" data-hear>▶ Hear Do</button>
    <button class="onb-primary" data-go="3">Continue →</button>`;
}

function wireRange(ov) {
  const applyTentativeDo = () => { appState.tuning.doMidi = draft.doMidi ?? VOICE_PROFILES[draft.voice].doMidi; };
  applyTentativeDo();
  ov.querySelectorAll('[data-oct]').forEach(btn =>
    btn.addEventListener('click', () => {
      const base = draft.doMidi ?? VOICE_PROFILES[draft.voice].doMidi;
      const next = Math.max(36, Math.min(84, base + Number(btn.dataset.oct)));
      draft.doMidi = next;
      const nameEl = ov.querySelector('.onb-do-name');
      if (nameEl) nameEl.textContent = noteName(next);
      applyTentativeDo();
    }));
  const hear = ov.querySelector('[data-hear]');
  if (hear) hear.addEventListener('click', async () => { applyTentativeDo(); await beepDo(); });
}

function renderFocus() {
  const f = draft.focus;
  const chip = (k, label) => `<button class="onb-chip${f[k] ? ' sel' : ''}" data-focus="${k}">${f[k] ? '✓ ' : ''}${label}</button>`;
  const seg = (attr, val, label, on) => `<button class="onb-seg${on ? ' sel' : ''}" data-${attr}="${val}">${label}</button>`;
  return `
    <div class="onb-step">Step 3 of 3</div>
    <h2 class="onb-h">What do you want to work on?</h2>
    <div class="onb-chips">${chip('ear', 'Ear training')}${chip('theory', 'Music theory')}${chip('hymns', 'SATB hymns')}${chip('sight', 'Sight-reading')}</div>
    <p class="onb-hint">Warm-ups are always included.</p>
    <div class="onb-q">Do you have the 7 shape-notes memorized?</div>
    <div class="onb-seg-row" data-group="shapes">
      ${seg('shapes', 'yes', 'Yes', draft.shapesKnown)}
      ${seg('shapes', 'no', 'Not yet', !draft.shapesKnown)}
    </div>
    <div class="onb-q">How long today?</div>
    <div class="onb-seg-row" data-group="length">
      ${seg('len', '10', '10 min', draft.length === 10)}
      ${seg('len', '20', '20 min', draft.length === 20)}
      ${seg('len', '35', '35 min', draft.length === 35)}
    </div>
    <button class="onb-primary" data-finish>Build my session →</button>`;
}

function wireFocus(ov) {
  ov.querySelectorAll('[data-focus]').forEach(btn =>
    btn.addEventListener('click', () => {
      const k = btn.dataset.focus;
      draft.focus[k] = !draft.focus[k];
      btn.classList.toggle('sel', draft.focus[k]);
      btn.textContent = (draft.focus[k] ? '✓ ' : '') + btn.textContent.replace(/^✓ /, '');
    }));
  ov.querySelectorAll('[data-shapes]').forEach(btn =>
    btn.addEventListener('click', () => {
      draft.shapesKnown = btn.dataset.shapes === 'yes';
      selectSeg(ov, 'shapes', btn);
    }));
  ov.querySelectorAll('[data-len]').forEach(btn =>
    btn.addEventListener('click', () => {
      draft.length = Number(btn.dataset.len);
      selectSeg(ov, 'length', btn);
    }));
}

function selectSeg(ov, group, active) {
  ov.querySelector(`[data-group="${group}"]`)?.querySelectorAll('.onb-seg')
    .forEach(b => b.classList.toggle('sel', b === active));
}

/* -------------------------------------------------------------- finish ----- */

function finish() {
  const profile = makeProfile(draft);
  saveProfile(profile);
  applyProfile(profile);
  closeOverlay();
  // Interim landing until the session engine is wired: the Warm Up staff, tuned to their Do.
  switchToTab('warmup');
  displayWarmupStaff();
}
