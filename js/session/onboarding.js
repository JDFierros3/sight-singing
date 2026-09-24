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
import { refreshProfileMenu } from './profileMenu.js';
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
  showOverlay();
  setStep(0);
}

function ensureOverlay() {
  let ov = document.getElementById('onboarding');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'onboarding';
    ov.className = 'onb';
    // Persistent b-roll background (fading hymn-scroll clips) + a stage the steps render into.
    ov.innerHTML =
      '<div class="onb-broll" aria-hidden="true">' +
        '<video class="onb-vid" muted autoplay playsinline preload="auto"></video>' +
        '<video class="onb-vid" muted autoplay playsinline preload="auto"></video>' +
        '<div class="onb-scrim"></div>' +
      '</div>' +
      '<div class="onb-stage"></div>';
    document.body.appendChild(ov);
  }
  return ov;
}

// Reveal the wizard (used on first open and when returning from a cancelled calibration).
function showOverlay() {
  const ov = ensureOverlay();
  ov.hidden = false;
  document.body.classList.add('onb-open');
  startBroll(ov);
}

function closeOverlay() {
  const ov = document.getElementById('onboarding');
  if (ov) { ov.hidden = true; stopBroll(ov); }
  document.body.classList.remove('onb-open');
}

/* -------------------------------------------------------------- steps ------ */

const STEPS = [renderWelcome, renderPart];

function setStep(n) {
  const ov = ensureOverlay();
  const step = STEPS[n];
  ov.querySelector('.onb-stage').innerHTML = `<div class="onb-card">${step()}</div>`;
  wireCommon(ov);
  if (step === renderPart) wirePart(ov);
}

/* ------------------------------------------------------ b-roll background --- */
// Fading full-screen hymn-scroll clips behind the wizard. Mostly shape-note takes with a few
// round-note ("circles") ones; drop more files in /broll and add them here to grow the rotation.
const BROLL_CLIPS = [
  'broll/broll_faithfulness_tenor_shapes.mp4',
  'broll/broll_faithfulness_tenor_circles.mp4'
];
const BROLL_FADE_S = 1.5; // keep in sync with the .onb-vid opacity transition
let brollLayers = null, brollActive = 0, brollIdx = -1, brollBusy = false;

function startBroll(ov) {
  const layers = [...ov.querySelectorAll('.onb-vid')];
  if (layers.length < 2 || brollLayers === layers) return; // already running on these elements
  brollLayers = layers; brollActive = 0; brollIdx = -1; brollBusy = false;
  brollAdvance();
}

function brollAdvance() {
  if (!brollLayers || brollBusy) return;
  brollBusy = true;
  brollIdx = (brollIdx + 1) % BROLL_CLIPS.length;
  const incoming = brollLayers[1 - brollActive];
  incoming.src = BROLL_CLIPS[brollIdx];
  try { incoming.currentTime = 0; } catch (e) {}
  const reveal = () => {
    incoming.style.opacity = '1';
    brollLayers[brollActive].style.opacity = '0';
    brollActive = 1 - brollActive;
    brollBusy = false;
    brollSchedule(incoming);
  };
  const p = incoming.play();
  if (p && p.then) p.then(reveal).catch(reveal); else reveal();
}

// Crossfade to the next clip a moment before this one ends (or on 'ended' as a fallback).
function brollSchedule(video) {
  const onTime = () => {
    if (video.duration && video.currentTime >= video.duration - BROLL_FADE_S - 0.15) {
      video.removeEventListener('timeupdate', onTime);
      brollAdvance();
    }
  };
  video.addEventListener('timeupdate', onTime);
  video.addEventListener('ended', brollAdvance, { once: true });
}

function stopBroll(ov) {
  (ov ? [...ov.querySelectorAll('.onb-vid')] : (brollLayers || []))
    .forEach(v => { try { v.pause(); } catch (e) {} });
  brollLayers = null; brollBusy = false; brollIdx = -1;
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
    onCancel: () => { showOverlay(); setStep(1); }
  });
}

/* -------------------------------------------------------------- finish ----- */

function finish() {
  const profile = makeProfile(draft);
  saveProfile(profile);
  applyProfile(profile);
  refreshProfileMenu();   // reflect the chosen part on the header profile button
  closeOverlay();
  // Friction-free: land on Home. The singer starts a guided session from there when ready.
  switchToTab('home');
}
