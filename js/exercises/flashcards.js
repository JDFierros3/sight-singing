/**
 * Flashcards: shape ↔ solfege recognition
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { appState } from '../state/appState.js';
import { SOLFEGE, SEMITONE_TO_SOLFEGE } from '../config/constants.js';
import { getShapeColor } from '../rendering/shapes.js';
import { renderShapeIconInto } from '../ui/components/shapeIcon.js';

export function initializeFlashcards() {
  // Generate an initial card so the tab isn't empty when first opened.
  if (!appState.exercise.flashcards) {
    appState.exercise.flashcards = createDefaultFlashcardState();
  }
  if (!appState.exercise.flashcards.current) {
    nextFlashcard();
  } else {
    renderFlashcard();
  }
}

export function setFlashcardMode(mode) {
  ensureState();
  appState.exercise.flashcards.mode = mode;
  // Keep current card but reset reveal state for clarity.
  appState.exercise.flashcards.revealed = false;
  renderFlashcard();
}

export function setFlashcardAccidentalsEnabled(enabled) {
  ensureState();
  appState.exercise.flashcards.includeAccidentals = !!enabled;
  // Generate a new card so user immediately sees the new pool.
  nextFlashcard();
}

export function nextFlashcard() {
  ensureState();
  const pool = buildFlashcardPool(appState.exercise.flashcards.includeAccidentals);
  const prev = appState.exercise.flashcards.current?.solfege || null;
  const solfege = pickDifferent(pool, prev);

  appState.exercise.flashcards.current = {
    solfege,
    base: getBaseShape(solfege)
  };
  appState.exercise.flashcards.revealed = false;
  renderFlashcard();
}

export function flipFlashcard() {
  ensureState();
  appState.exercise.flashcards.revealed = !appState.exercise.flashcards.revealed;
  renderFlashcard();
}

export function renderFlashcard() {
  ensureState();
  const state = appState.exercise.flashcards;
  const card = state.current;

  const promptEl = getElementById('flashcardPrompt');
  const glyphEl = getElementById('flashcardGlyph');
  const answerEl = getElementById('flashcardAnswer');
  const badgeEl = getElementById('flashcardBadge');

  if (!promptEl || !glyphEl || !answerEl || !badgeEl) return;

  if (!card) {
    setTextContent(promptEl, '—');
    setTextContent(answerEl, '—');
    answerEl.style.display = 'none';
    setTextContent(badgeEl, 'Ready');
    return;
  }

  const { solfege, base } = card;
  const showingAnswer = !!state.revealed;

  // Prompt/answer text depends on mode.
  if (state.mode === 'shapeToSolfege') {
    setTextContent(promptEl, 'What solfege is this shape?');
    setTextContent(answerEl, solfege);
  } else {
    setTextContent(promptEl, 'What shape matches this solfege?');
    setTextContent(answerEl, solfege);
  }

  // Glyph depends on mode and reveal state.
  const shouldShowGlyph = state.mode === 'shapeToSolfege' ? true : showingAnswer;
  setGlyph(glyphEl, solfege, base, shouldShowGlyph);

  // Answer visibility depends on mode:
  // - shape→solfege: answer text hidden until flip
  // - solfege→shape: prompt already contains solfege, so answer is the shape (glyph)
  if (state.mode === 'shapeToSolfege') {
    answerEl.style.display = showingAnswer ? 'block' : 'none';
  } else {
    answerEl.style.display = 'none';
  }

  setTextContent(badgeEl, showingAnswer ? 'Revealed' : 'Hidden');
}

function createDefaultFlashcardState() {
  return {
    mode: 'shapeToSolfege',
    includeAccidentals: false,
    revealed: false,
    current: null
  };
}

function ensureState() {
  if (!appState.exercise.flashcards) {
    appState.exercise.flashcards = createDefaultFlashcardState();
  }
}

function buildFlashcardPool(includeAccidentals) {
  if (!includeAccidentals) return SOLFEGE.slice();
  return SEMITONE_TO_SOLFEGE.map(e => e.solfege);
}

function pickDifferent(pool, prev) {
  if (pool.length <= 1) return pool[0] || 'Do';
  let next = prev;
  let safety = 20;
  while (next === prev && safety-- > 0) {
    next = pool[Math.floor(Math.random() * pool.length)];
  }
  return next || pool[0];
}

function getBaseShape(solfege) {
  const entry = SEMITONE_TO_SOLFEGE.find(e => e.solfege === solfege);
  return entry ? entry.base : solfege;
}

function setGlyph(el, solfege, base, shouldShow) {
  if (!shouldShow) {
    el.innerHTML = '';
    el.style.color = 'transparent';
    return;
  }

  const color = getShapeColor(base);
  renderShapeIconInto(el, base, { color, sizePx: 64 });
}


