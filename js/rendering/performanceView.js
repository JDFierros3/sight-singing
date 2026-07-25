/**
 * Reusable "performance surface": engraves VexFlow notation into a container and can go
 * full-screen with a GPU-scrolled staff, a pinned playhead, a live mic pitch line, and a
 * 3·2·1 count-in. Extracted from the Live Sing tab so SATB and Warmup can reuse it.
 *
 * A consumer configures the surface once (which container, how to read the clock and the
 * current target note, which staff-part the mic line follows), then drives it:
 *   configurePerformance(cfg) → showNotation(ex) for the inline view;
 *   enterPerformance(ex) → runCountIn() → startScroll() while playing → exitPerformance().
 *
 * Only one surface is active at a time (you can't perform two tabs at once), so this is a
 * module-level singleton.
 */

import { getElementById } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { pitchState } from '../pitch/detection.js';
import { frequencyToMidi } from '../utils/audioMath.js';
import { renderHymnNotation } from './notationView.js';

/**
 * @typedef {Object} PerfConfig
 * @property {HTMLElement} container         where the notation is engraved
 * @property {() => number} getTime          current exercise time in seconds @ 60bpm
 * @property {() => (number|null)} getTargetMidi  the note currently sounding (mic-line colour)
 * @property {() => (string|null)} fitPart   which staff part the mic line maps onto ('S'..'B')
 * @property {() => boolean} isPlaying       whether playback is currently running
 * @property {() => void} onExit             called by the full-screen Stop button
 * @property {() => *} [variant]             extra value folded into the render cache key (e.g. transpose)
 * @property {Object} [renderOptions]        extra options passed to renderHymnNotation
 */

let cfg = null;
let lastKey = null;
let layout = null;
let notatedExercise = null;
let wrapEl = null;
let playheadEl = null;
let micLineEl = null;
let rafId = null;
let timeToX = null;

export function configurePerformance(config) {
  cfg = config;
}

/* ------------------------------------------------------------- rendering -- */

/** Engrave `exercise` into the container at the current size (inline, or full-screen if performing). */
export function showNotation(exercise, force = false) {
  if (!cfg || !cfg.container || !exercise) return;
  const container = cfg.container;
  notatedExercise = exercise;
  const performing = isPerforming();
  const width = performing ? window.innerWidth : (container.clientWidth || 800);
  // Full-screen: scale to FIT the viewport height so the staff is never taller than the
  // screen. Keyed on both dimensions so a rotation / URL-bar resize re-engraves.
  const fitHeight = performing ? Math.max(200, window.innerHeight - 16) : null;
  // Inline: honour the global Zoom control (the header staff-size slider).
  const zoom = appState.display?.zoom || 1;
  const dims = performing ? `full${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}` : `${Math.round(width)}@${zoom}`;
  const variant = cfg.variant ? cfg.variant() : '';
  const key = `${exercise.id || exercise.label}|${variant}|${dims}`;
  if (!force && key === lastKey && container.querySelector('svg')) return;
  lastKey = key;
  container.hidden = false;
  try {
    layout = renderHymnNotation(exercise, container, {
      width,
      fitHeight,
      scale: performing ? undefined : zoom,
      ...(cfg.renderOptions || {})
    });
    timeToX = layout ? buildTimeToX(layout) : null;
    ensureOverlays(container);
  } catch (err) {
    console.warn('Notation render failed:', err);
  }
}

/** Re-engrave while performing (rotation / URL-bar resize). No-op inline. */
export function refitPerformance() {
  if (!isPerforming()) return;
  showNotation(notatedExercise, false);
}

/* -------------------------------------------------- full-screen lifecycle -- */

export function isPerforming() {
  return document.body.classList.contains('perf-performing');
}

export function enterPerformance(exercise) {
  document.body.classList.add('perf-performing');
  showNotation(exercise || notatedExercise, true);
  ensureExitButton(true);
  positionAtStart();
}

export function exitPerformance() {
  stopScroll();
  ensureExitButton(false);
  if (isPerforming()) {
    document.body.classList.remove('perf-performing');
    showNotation(notatedExercise, true);
  }
}

// Park the staff so the first note sits under the pinned (30%) playhead — the resting
// position during the count-in, before the scroll animation takes over.
function positionAtStart() {
  if (!cfg || !wrapEl || !timeToX) return;
  const screenX = cfg.container.clientWidth * 0.3;
  wrapEl.style.transform = `translate3d(${Math.round(screenX - timeToX(0))}px,0,0)`;
  if (playheadEl) {
    playheadEl.style.left = `${Math.round(screenX)}px`;
    playheadEl.style.height = `${layout?.height || 210}px`;
  }
}

function ensureOverlays(container) {
  playheadEl = document.createElement('div');
  playheadEl.className = 'perf-playhead';
  container.appendChild(playheadEl);
  // The mic line lives inside the notation wrap so it aligns with the staff and moves with it.
  wrapEl = container.querySelector('.notation-wrap');
  if (wrapEl) {
    micLineEl = document.createElement('div');
    micLineEl.className = 'perf-micline';
    wrapEl.appendChild(micLineEl);
  }
}

/* ---------------------------------------------------------- scroll loop --- */

// Map exercise time (seconds @60bpm) -> x, LINEARLY within each measure so the playhead
// glides at a steady speed instead of snapping between note positions.
function buildTimeToX(l) {
  const mp = l.measurePositions || [];
  const mlen = l.measureLenSec || 1;
  return (t) => {
    if (!mp.length) return 0;
    if (t <= 0) return mp[0].x;
    const mi = Math.min(mp.length - 1, Math.floor(t / mlen));
    const m = mp[mi];
    const frac = Math.max(0, Math.min(1, (t - m.startTime) / mlen));
    return m.x + frac * m.width;
  };
}

// The playhead is pinned ~30% from the left; the STAFF slides under it via a GPU transform
// (translate3d) rather than scrollLeft — scrolling a several-thousand-px SVG every frame
// forces layout/re-raster and is the main source of mobile choppiness.
export function startScroll() {
  if (!cfg || !cfg.container || !layout) return;
  if (!timeToX) timeToX = buildTimeToX(layout);
  const frame = () => {
    if (!cfg.isPlaying()) { rafId = null; return; }
    const x = timeToX ? timeToX(cfg.getTime()) : 0;
    const screenX = cfg.container.clientWidth * 0.3;
    if (wrapEl) wrapEl.style.transform = `translate3d(${Math.round(screenX - x)}px,0,0)`;
    if (playheadEl) {
      playheadEl.style.left = `${Math.round(screenX)}px`;
      playheadEl.style.height = `${layout?.height || 210}px`;
    }
    updateMicLine();
    rafId = requestAnimationFrame(frame);
  };
  rafId = requestAnimationFrame(frame);
}

export function stopScroll() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

/* ------------------------------------------------------------ mic line --- */

// The singer's detected pitch as a horizontal line on the staff, coloured green/yellow/red
// by how close it is to the current target note. Denoised here (median-of-3 + fast EMA) so
// it's responsive without relying on the global hold-gated stableHz.
const MIC_EMA_ALPHA = 0.4;
let micMidiEma = null;
let micMidiHistory = [];
let partFitCache = { key: null, fit: null };

function updateMicLine() {
  if (!micLineEl || !layout) return;
  const hz = pitchState.hz || 0; // per-frame detection (RMS-gated) — no hold delay
  if (hz <= 0) { micLineEl.style.display = 'none'; resetMicLine(); return; }

  let sungMidi = frequencyToMidi(hz, appState.tuning.a4);
  if (!Number.isFinite(sungMidi)) { micLineEl.style.display = 'none'; return; }

  // Fold octave detection glitches toward the note being sung (pitch-class match).
  const target = cfg.getTargetMidi ? cfg.getTargetMidi() : null;
  if (Number.isFinite(target)) sungMidi = foldToOctave(sungMidi, target);

  const denoised = pushMedian(sungMidi);
  micMidiEma = micMidiEma == null ? denoised : micMidiEma * (1 - MIC_EMA_ALPHA) + denoised * MIC_EMA_ALPHA;

  const part = cfg.fitPart ? cfg.fitPart() : null;
  const y = pitchToYForPart(part, micMidiEma);
  if (y == null) { micLineEl.style.display = 'none'; return; }
  micLineEl.style.top = `${y}px`;
  micLineEl.style.display = 'block';

  if (Number.isFinite(target)) {
    const cents = Math.abs(micMidiEma - target) * 100;
    micLineEl.style.background = cents <= 20 ? '#22c55e' : (cents <= 50 ? '#eab308' : '#ef4444');
  } else {
    micLineEl.style.background = '#60a5fa';
  }
}

function resetMicLine() {
  micMidiEma = null;
  micMidiHistory = [];
}

function pushMedian(midi) {
  micMidiHistory.push(midi);
  if (micMidiHistory.length > 3) micMidiHistory.shift();
  return [...micMidiHistory].sort((a, b) => a - b)[Math.floor(micMidiHistory.length / 2)];
}

function foldToOctave(midi, ref) {
  while (midi - ref > 6) midi -= 12;
  while (ref - midi > 6) midi += 12;
  return midi;
}

// Linear midi->y fit from just the chosen part's noteheads (one staff, no lyric-gap
// discontinuity). Falls back to the layout's global fit if the part has too few notes.
function pitchToYForPart(part, midi) {
  const pts = (part && layout?.partPositions?.[part]) || [];
  const cacheKey = `${part}|${pts.length}|${lastKey}`;
  if (partFitCache.key !== cacheKey) {
    partFitCache = { key: cacheKey, fit: linearFitMidiToY(pts) };
  }
  const fit = partFitCache.fit;
  if (fit) return fit.a * midi + fit.b;
  return layout?.pitchToY ? layout.pitchToY(midi) : null;
}

function linearFitMidiToY(points) {
  const distinct = new Set(points.map(p => p.midi));
  if (points.length < 2 || distinct.size < 2) return null;
  const n = points.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of points) { sx += p.midi; sy += p.y; sxx += p.midi * p.midi; sxy += p.midi * p.y; }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const a = (n * sxy - sx * sy) / denom;
  const b = (sy - a * sx) / n;
  return { a, b };
}

/* --------------------------------------------------------- exit button --- */

function ensureExitButton(show) {
  let btn = getElementById('perfExitBtn');
  if (!btn && show) {
    btn = document.createElement('button');
    btn.id = 'perfExitBtn';
    btn.className = 'perf-exit-btn';
    btn.textContent = 'Stop';
    btn.onclick = () => cfg && cfg.onExit && cfg.onExit();
    document.body.appendChild(btn);
  }
  if (btn) btn.style.display = show ? 'block' : 'none';
}

/* ----------------------------------------------------------- count-in ---- */

let counting = false;
let countdownTimer = null;

// Resolve after a "3 · 2 · 1 · Sing!" count-in — true if it completed, false if cancelled.
export function runCountIn() {
  return new Promise(resolve => {
    counting = true;
    const el = ensureCountdownEl();
    const steps = ['3', '2', '1', 'Sing!'];
    let i = 0;
    const step = () => {
      if (!counting) { hideCountdown(); resolve(false); return; }
      el.textContent = steps[i];
      el.style.display = 'flex';
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); // restart the pop
      i += 1;
      if (i < steps.length) countdownTimer = setTimeout(step, 800);
      else countdownTimer = setTimeout(() => { counting = false; hideCountdown(); resolve(true); }, 450);
    };
    step();
  });
}

export function cancelCountIn() {
  counting = false;
  if (countdownTimer) { clearTimeout(countdownTimer); countdownTimer = null; }
  hideCountdown();
}

function ensureCountdownEl() {
  let el = getElementById('perfCountdown');
  if (!el) {
    el = document.createElement('div');
    el.id = 'perfCountdown';
    el.className = 'perf-countdown';
    document.body.appendChild(el);
  }
  return el;
}

function hideCountdown() {
  const el = getElementById('perfCountdown');
  if (el) el.style.display = 'none';
}

// Resolve on the next paint, so a just-engraved staff is actually on screen before we continue.
// Falls back to a timer so a throttled/stalled rAF can never hang the caller.
export function nextPaint() {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 250);
  });
}
