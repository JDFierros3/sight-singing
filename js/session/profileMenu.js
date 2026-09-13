/**
 * Minimal profile button — sits just before the settings gear in the header.
 *
 * A tiny popover to change the two things onboarding set: your PART (SATB) and your Do.
 * Deliberately NOT the full settings sheet. "Set my Do by singing" reuses the full-screen
 * calibration. Every change writes the profile and applies it live.
 */

import { getElementById } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { VOICE_PROFILES, loadProfile, saveProfile, applyProfile } from './profile.js';
import { startCalibration } from './calibration.js';
import { soundDoReference } from '../audio/doPitch.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const clampDo = (m) => Math.max(36, Math.min(84, m));

export function initProfileMenu() {
  const host = document.querySelector('.rowCompact') || document.querySelector('.appHeaderControls');
  if (!host || getElementById('btnProfile')) return;

  const btn = document.createElement('button');
  btn.id = 'btnProfile';
  btn.className = 'ghost';
  btn.setAttribute('aria-label', 'Your voice & Do');
  btn.setAttribute('title', 'Your voice & Do');

  const pop = document.createElement('div');
  pop.id = 'profilePop';
  pop.className = 'pm-pop';
  pop.hidden = true;

  const gear = getElementById('btnSettings');
  if (gear) { host.insertBefore(btn, gear); } else { host.appendChild(btn); }
  host.appendChild(pop);

  btn.addEventListener('click', (e) => { e.stopPropagation(); pop.hidden ? openPop(pop) : (pop.hidden = true); });
  document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) pop.hidden = true; });

  refreshButton();
}

function currentProfile() {
  return loadProfile() || { voice: 'alto', doMidi: VOICE_PROFILES.alto.doMidi, focus: { ear: true, theory: true, hymns: true, sight: false }, shapesKnown: false, length: 20 };
}

// Re-sync the header button label with the saved profile (call after onboarding saves it).
export function refreshProfileMenu() {
  refreshButton();
}

function refreshButton() {
  const btn = getElementById('btnProfile');
  if (!btn) return;
  const p = currentProfile();
  const v = VOICE_PROFILES[p.voice] || VOICE_PROFILES.alto;
  const icon = `<svg class="pm-ico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor"><circle cx="8" cy="4.3" r="2.7"/><path d="M2.6 14a5.4 5.4 0 0 1 10.8 0Z"/></svg>`;
  btn.innerHTML = `${icon}${v.label}`;
}

// Persist voice + Do, keeping the rest of the profile; apply live.
function saveVoice(voiceKey, doMidi) {
  const prev = currentProfile();
  const voice = VOICE_PROFILES[voiceKey] || VOICE_PROFILES.alto;
  const profile = {
    v: 1, voice: voice.key, part: voice.part, doMidi: clampDo(doMidi),
    focus: prev.focus || { ear: true, theory: true, hymns: true, sight: false },
    shapesKnown: !!prev.shapesKnown, length: prev.length || 20
  };
  saveProfile(profile);
  applyProfile(profile);
  refreshButton();
}

function openPop(pop) {
  const p = currentProfile();
  const doMidi = Number.isFinite(p.doMidi) ? p.doMidi : VOICE_PROFILES[p.voice].doMidi;
  const parts = Object.values(VOICE_PROFILES).map(v =>
    `<button class="pm-part${p.voice === v.key ? ' on' : ''}" data-voice="${v.key}">${v.label}</button>`).join('');
  pop.innerHTML = `
    <div class="pm-title">Your voice</div>
    <div class="pm-parts">${parts}</div>
    <div class="pm-do">
      <span>Do</span>
      <button class="pm-nudge" data-do="-1" aria-label="Down a half step">–</button>
      <b id="pmDoName">${noteName(doMidi)}</b>
      <button class="pm-nudge" data-do="1" aria-label="Up a half step">+</button>
      <button class="pm-hear" data-hear aria-label="Hear Do">▶</button>
    </div>
    <button class="pm-retune" data-retune>🎤 Set my Do by singing</button>`;
  pop.hidden = false;

  pop.querySelectorAll('[data-voice]').forEach(b =>
    b.addEventListener('click', () => {
      const v = VOICE_PROFILES[b.dataset.voice];
      saveVoice(v.key, v.doMidi);   // move Do to the new part's comfortable default
      openPop(pop);                 // re-render selection + new Do
    }));
  pop.querySelectorAll('[data-do]').forEach(b =>
    b.addEventListener('click', () => {
      const next = clampDo(appState.tuning.doMidi + Number(b.dataset.do));
      saveVoice(currentProfile().voice, next);
      const el = getElementById('pmDoName');
      if (el) el.textContent = noteName(next);
    }));
  pop.querySelector('[data-hear]')?.addEventListener('click', () => soundDoReference(appState.tuning.doMidi, 700));
  pop.querySelector('[data-retune]')?.addEventListener('click', () => {
    pop.hidden = true;
    const prof = currentProfile();
    const voice = VOICE_PROFILES[prof.voice] || VOICE_PROFILES.alto;
    startCalibration({
      part: voice.part,
      doMidi: appState.tuning.doMidi,
      onDone: (finalDo) => saveVoice(voice.key, finalDo),
      onCancel: () => {}
    });
  });
}
