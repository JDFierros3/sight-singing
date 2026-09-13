/**
 * First-run onboarding (mobile-first): Welcome → pick your part → full-screen sing-along
 * calibration (sets movable-Do by ear) → land on Home.
 *
 * Writes a local profile (see profile.js) with sensible defaults for what used to be extra
 * setup screens; the singer tunes anything else later from Home/Settings. The calibration
 * step lives in calibration.js and hands the chosen Do back here.
 */

import { VOICE_PROFILES, loadProfile, saveProfile, applyProfile, makeProfile } from './profile.js';
import { startCalibration } from './calibration.js';
import { switchToTab } from '../ui/components/tabs.js';

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
  draft = { voice: 'alto', doMidi: null, focus: { ear: true, theory: true, hymns: true, sight: false }, shapesKnown: false, length: 20 };
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

const STEPS = [renderWelcome, renderPart];

function setStep(n) {
  const ov = ensureOverlay();
  const step = STEPS[n];
  ov.innerHTML = `<div class="onb-card">${step()}</div>`;
  wireCommon(ov);
  if (step === renderPart) wirePart(ov);
}

// data-go="N" advances to step N; data-part-go hands off to calibration.
function wireCommon(ov) {
  ov.querySelectorAll('[data-go]').forEach(el =>
    el.addEventListener('click', () => setStep(Number(el.dataset.go))));
}

function renderWelcome() {
  return `
    <div class="onb-shapes">${shapeRow()}</div>
    <h2 class="onb-h">Learn to sing by<br>shape &amp; syllable</h2>
    <button class="onb-primary" data-go="1">Start singing</button>`;
}

function renderPart() {
  const opts = Object.values(VOICE_PROFILES).map(v =>
    `<button class="onb-voice${draft.voice === v.key ? ' sel' : ''}" data-voice="${v.key}">${v.label}</button>`).join('');
  return `
    <div class="onb-step">Pick your part</div>
    <h2 class="onb-h">Which part do you sing?</h2>
    <div class="onb-voices onb-voices-parts">${opts}</div>
    <p class="onb-hint">Next you'll do a quick hum-along to find a pitch that feels comfy.</p>
    <button class="onb-primary" data-part-go>Start singing →</button>`;
}

function wirePart(ov) {
  ov.querySelectorAll('[data-voice]').forEach(btn =>
    btn.addEventListener('click', () => {
      draft.voice = btn.dataset.voice;
      draft.doMidi = null; // reset any earlier tuning when switching part
      ov.querySelectorAll('[data-voice]').forEach(b => b.classList.toggle('sel', b === btn));
    }));
  ov.querySelector('[data-part-go]')?.addEventListener('click', goToCalibration);
}

/* ----------------------------------------------------------- calibration --- */

// Leave the wizard overlay and hand off to the full-screen sing-along; it returns the Do.
function goToCalibration() {
  const voice = VOICE_PROFILES[draft.voice] || VOICE_PROFILES.alto;
  const seedDo = draft.doMidi ?? voice.doMidi;
  closeOverlay();
  startCalibration({
    part: voice.part,
    doMidi: seedDo,
    onDone: (finalDo) => { draft.doMidi = finalDo; finish(); },
    onCancel: () => { document.body.classList.add('onb-open'); ensureOverlay().hidden = false; setStep(1); }
  });
}

/* -------------------------------------------------------------- finish ----- */

function finish() {
  const profile = makeProfile(draft);
  saveProfile(profile);
  applyProfile(profile);
  closeOverlay();
  // Friction-free: land on Home. The singer starts a guided session from there when ready.
  switchToTab('home');
}
