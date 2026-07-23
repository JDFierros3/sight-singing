/**
 * Builds the Homepage tab content — welcome page with solfege guide and learning roadmap.
 */

import { buildSolfegeGuide } from './solfegeGuide.js';
import { switchToTab } from '../components/tabs.js';

const ROADMAP_STEPS = [
  { tab: 'flashcards', label: 'Flashcards', desc: 'Memorize shape-to-solfege in under 2 minutes' },
  { tab: 'warmup', label: 'Warmup', desc: 'Sing scales and intervals from Do' },
  { tab: 'intervals', label: 'Intervals', desc: 'Identify the gap between two pitches' },
  { tab: 'cluster', label: 'Cluster', desc: 'Detect 2-3 simultaneous hidden tones' },
  { tab: 'chord-quality', label: 'Chords', desc: 'Hear major, minor, and other qualities' },
  { tab: 'satb', label: 'SATB', desc: 'Sing your part in 4-voice harmony' },
];

export function buildHomepage() {
  const host = document.getElementById('panel-home');
  if (!host) return;

  host.innerHTML = `
    <div class="home-hero">
      <h2>Shape-Note Ear Trainer</h2>
      <p class="home-tagline">Learn to sing in tune using movable-Do solfege and sacred harp shape notes.</p>
      <p class="home-subtitle">Practice pitch recognition by ear — no scoring, just listening and singing.</p>
      <button id="btnStartLearning" class="btn-start-learning">Start Learning</button>
    </div>

    <div class="home-concepts">
      <div class="home-concept-card">
        <h3>What is Movable Do?</h3>
        <p>In movable-Do solfege, "Do" is always the root of whatever key you're in — not a fixed pitch like C.
           The same patterns (Do Re Mi Fa Sol La Ti) repeat in every key, so once you learn the intervals, you can sing in any key.</p>
      </div>
      <div class="home-concept-card">
        <h3>What are Shape Notes?</h3>
        <p>Shape notes assign a distinct geometric shape to each scale degree.
           Reading the shapes lets you identify solfege syllables at a glance — no need to memorize letter-name key signatures.</p>
      </div>
    </div>

    <div class="home-solfege-section">
      <h3>The 7 Shapes</h3>
      <div id="solfegeGuide"></div>
    </div>

    <div class="home-roadmap-section">
      <h3>Learning Path</h3>
      <p class="home-roadmap-intro">Work through these exercises in order. Each one builds on the last.</p>
      <div class="home-roadmap">
        ${ROADMAP_STEPS.map((step, i) => `
          <button class="home-roadmap-step" data-tab="${step.tab}">
            <span class="home-roadmap-number">${i + 1}</span>
            <span class="home-roadmap-label">${step.label}</span>
            <span class="home-roadmap-desc">${step.desc}</span>
          </button>
        `).join(`<span class="home-roadmap-arrow" aria-hidden="true">&rarr;</span>`)}
      </div>
    </div>

    <div class="home-controls-section">
      <h3>Global Controls</h3>
      <p class="home-controls-intro">These controls live in the header bar and apply across all exercises.</p>
      <div class="home-controls-grid">
        <div class="home-control-item">
          <span class="home-control-name">Play / Stop</span>
          <span class="home-control-desc">Context-sensitive — plays the current exercise, starts the drone, or advances a flashcard depending on which tab you're on.</span>
        </div>
        <div class="home-control-item">
          <span class="home-control-name">Do</span>
          <span class="home-control-desc">Sets the "home" pitch for movable-Do solfege. All exercises are built relative to this note. Pick a Do that's comfortable for your voice range.</span>
        </div>
        <div class="home-control-item">
          <span class="home-control-name">Voice</span>
          <span class="home-control-desc">Choose the instrument sound: Sine Wave (pure tone), Piano, or Choir. Affects drones, warmups, intervals, and SATB playback.</span>
        </div>
        <div class="home-control-item">
          <span class="home-control-name">Mic</span>
          <span class="home-control-desc">Turns on your microphone for live pitch detection. Your voice appears on the staff in real time so you can see how close you are to the target note.</span>
        </div>
        <div class="home-control-item">
          <span class="home-control-name">Tolerance</span>
          <span class="home-control-desc">How close your pitch needs to be (in cents) for the app to consider it "on target." Lower = stricter. Start around 50-60 and tighten as you improve.</span>
        </div>
        <div class="home-control-item">
          <span class="home-control-name">A4</span>
          <span class="home-control-desc">Concert pitch reference (default 440 Hz). Only change this if you're matching a differently-tuned instrument.</span>
        </div>
        <div class="home-control-item">
          <span class="home-control-name">Zoom</span>
          <span class="home-control-desc">Adjusts the size of the musical staff. Increase if notes are hard to read, decrease to see more notes at once.</span>
        </div>
        <div class="home-control-item">
          <span class="home-control-name">Show Accidentals & Key</span>
          <span class="home-control-desc">Displays sharps, flats, and key signature on the staff. Auto-enabled on SATB and Chord Quality tabs.</span>
        </div>
      </div>
    </div>

    <div class="home-shortcuts">
      <h3>Keyboard Shortcuts</h3>
      <div class="home-shortcut-list">
        <span class="kbd">Space</span> Flip flashcard
        <span class="home-shortcut-sep">&middot;</span>
        <span class="kbd">N</span> Next flashcard
        <span class="home-shortcut-sep">&middot;</span>
        <span class="kbd">M</span> Toggle microphone
      </div>
    </div>
  `;

  // Mount the solfege shape guide into #solfegeGuide
  buildSolfegeGuide();

  // Wire up navigation
  const btnStart = document.getElementById('btnStartLearning');
  if (btnStart) {
    btnStart.addEventListener('click', () => switchToTab('flashcards'));
  }

  // Roadmap step clicks
  const roadmap = host.querySelector('.home-roadmap');
  if (roadmap) {
    roadmap.addEventListener('click', (e) => {
      const step = e.target.closest('[data-tab]');
      if (step && step.dataset.tab) {
        switchToTab(step.dataset.tab);
      }
    });
  }
}
