/**
 * The session companion bar — a slim sticky strip that rides above whatever tab the current
 * step lives on. Shows progress + Back / Skip / Next (Next primary) and a "Free play" exit.
 * It never hides the tab beneath it; the singer can also just wander via the normal tabs.
 */

import { getProgress, getCurrentStep, nextStep, prevStep, skipStep, exitSession, isSessionActive } from './session.js';

const STATS_KEY = 'solfege.v1.stats';

export function initSessionBar() {
  ensureBar();
  document.addEventListener('session:changed', render);
  document.addEventListener('session:complete', onComplete);
  render();
}

function ensureBar() {
  let bar = document.getElementById('sessionBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'sessionBar';
    bar.className = 'session-bar';
    bar.hidden = true;
    document.body.insertBefore(bar, document.body.firstChild);
  }
  return bar;
}

function render() {
  const bar = ensureBar();
  const prog = getProgress();
  const step = getCurrentStep();
  if (!isSessionActive() || !prog || !step) {
    bar.hidden = true;
    document.body.classList.remove('session-active');
    return;
  }
  bar.hidden = false;
  document.body.classList.add('session-active');

  const dots = Array.from({ length: prog.total }, (_, i) =>
    `<i class="${i <= prog.index ? 'on' : ''}"></i>`).join('');
  const atEnd = prog.index >= prog.total - 1;

  bar.innerHTML = `
    <div class="sb-dots">${dots}</div>
    <div class="sb-label">Step ${prog.index + 1} of ${prog.total}<small>${escapeHtml(step.label)}</small></div>
    <div class="sb-actions">
      <button class="sb-btn" data-act="exit" title="Leave the session and explore freely">Free play</button>
      <button class="sb-btn ghost" data-act="back" ${prog.index === 0 ? 'disabled' : ''}>‹ Back</button>
      <button class="sb-btn ghost" data-act="skip">Skip</button>
      <button class="sb-btn brass" data-act="next">${atEnd ? 'Finish ✓' : 'Next ›'}</button>
    </div>`;

  bar.querySelector('[data-act="back"]').onclick = prevStep;
  bar.querySelector('[data-act="skip"]').onclick = skipStep;
  bar.querySelector('[data-act="next"]').onclick = nextStep;
  bar.querySelector('[data-act="exit"]').onclick = exitSession;
}

function onComplete() {
  bumpStreak();
  const bar = ensureBar();
  const streak = readStats().streak;
  bar.hidden = false;
  document.body.classList.add('session-active');
  bar.innerHTML = `
    <div class="sb-done">🔥 ${streak}-day streak · session complete</div>
    <div class="sb-actions"><button class="sb-btn brass" data-act="close">Done</button></div>`;
  bar.querySelector('[data-act="close"]').onclick = () => {
    bar.hidden = true;
    document.body.classList.remove('session-active');
  };
}

/* --------------------------------------------------------------- streak ---- */

function readStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { streak: 0, lastDate: null, completed: 0 };
  } catch (e) { return { streak: 0, lastDate: null, completed: 0 }; }
}

function bumpStreak() {
  const stats = readStats();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (stats.lastDate === today) {
    // already counted today — leave streak, still count the completion
  } else if (stats.lastDate === yesterday) {
    stats.streak += 1;
  } else {
    stats.streak = 1;
  }
  stats.lastDate = today;
  stats.completed = (stats.completed || 0) + 1;
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
