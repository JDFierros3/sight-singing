/**
 * Home / launcher tab. The redesigned front door: a greeting + streak, a Resume card when a
 * session is paused, the four rooms as big cards, start/setup actions, and the 7-shapes guide.
 * Replaces the old wall-of-text homepage (control docs now live in the settings sheet).
 */

import { buildSolfegeGuide } from './solfegeGuide.js';
import { switchToTab } from '../components/tabs.js';
import { loadProfile, VOICE_PROFILES } from '../../session/profile.js';
import { hasActiveSession, loadSession, resumeSession, startSession } from '../../session/session.js';
import { startOnboarding } from '../../session/onboarding.js';

// Rooms as launcher cards → their primary tab. Colours are the shape-note palette.
const ROOMS = [
  { tab: 'warmup', label: 'Warm Up', desc: 'scales & intervals', icon: '♪', color: '#8bd3ff' },
  { tab: 'intervals', label: 'Train Your Ear', desc: 'intervals · pitch · chords', icon: '◎', color: '#c4b5fd' },
  { tab: 'satb', label: 'Sing in Parts', desc: 'hymns · SATB play-along', icon: '✦', color: '#fca5a5' },
  { tab: 'theory', label: 'Learn', desc: 'lessons & flashcards', icon: '◈', color: '#fde68a' }
];

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const profile = loadProfile();
  const who = profile && VOICE_PROFILES[profile.voice] ? `, ${VOICE_PROFILES[profile.voice].label}` : '';
  return `${part}${who}`;
}

function streakCount() {
  try {
    const s = JSON.parse(localStorage.getItem('solfege.v1.stats') || 'null');
    return s && s.streak ? s.streak : 0;
  } catch (e) { return 0; }
}

export function buildHomepage() {
  const host = document.getElementById('panel-home');
  if (!host) return;

  const streak = streakCount();
  const saved = hasActiveSession() ? loadSession() : null;
  const resumeStep = saved ? saved.steps[Math.min(saved.index, saved.steps.length - 1)] : null;
  const hasProfile = !!loadProfile();

  host.innerHTML = `
    <div class="home-launch">
      <div class="hl-top">
        <div class="hl-greet">${greeting()}</div>
        ${streak ? `<span class="hl-streak">🔥 ${streak}-day streak</span>` : ''}
      </div>

      ${saved ? `
      <button class="hl-resume" id="hlResume">
        <div class="hl-resume-tx"><b>Resume your session</b><small>Step ${saved.index + 1} of ${saved.steps.length} · ${resumeStep ? resumeStep.label : ''}</small></div>
        <span class="hl-resume-go">▶</span>
      </button>` : ''}

      <div class="hl-cards">
        ${ROOMS.map(r => `
          <button class="hl-card" data-tab="${r.tab}">
            <span class="hl-ic" style="background:${r.color}">${r.icon}</span>
            <span class="hl-nm">${r.label}</span>
            <span class="hl-ds">${r.desc}</span>
          </button>`).join('')}
      </div>

      <div class="hl-actions">
        <button class="hl-primary" id="hlStart">${saved ? 'Start a new session' : "Start today's session"}</button>
        <button class="hl-ghost" id="hlSetup">${hasProfile ? 'Change voice / setup' : 'Set up my voice'}</button>
      </div>

      <div class="home-solfege-section">
        <h3>The 7 Shapes</h3>
        <div id="solfegeGuide"></div>
      </div>
    </div>
  `;

  buildSolfegeGuide();

  host.querySelector('#hlResume')?.addEventListener('click', () => resumeSession());
  host.querySelector('.hl-cards')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-tab]');
    if (card) switchToTab(card.dataset.tab);
  });
  host.querySelector('#hlStart')?.addEventListener('click', () => {
    const profile = loadProfile();
    if (profile) startSession(profile);
    else startOnboarding();
  });
  host.querySelector('#hlSetup')?.addEventListener('click', () => startOnboarding());

  watchHome();
}

// Rebuild the launcher whenever the singer returns to Home, so the Resume card + streak
// reflect the latest session/stats. Registered once.
let homeWatched = false;
function watchHome() {
  if (homeWatched) return;
  homeWatched = true;
  new MutationObserver(() => {
    if (document.body.getAttribute('data-active-tab') === 'home') buildHomepage();
  }).observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
}
