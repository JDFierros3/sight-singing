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


export function nextFlashcard() {
  ensureState();
  const state = appState.exercise.flashcards;
  // If we stepped back with Prev, go forward through history; otherwise draw a new card.
  if (state.pos < state.history.length - 1) {
    state.pos += 1;
    state.current = state.history[state.pos];
  } else {
    const pool = buildFlashcardPool();
    const solfege = pickDifferent(pool, state.current?.solfege || null);
    const card = { solfege, base: getBaseShape(solfege) };
    state.history.push(card);
    state.pos = state.history.length - 1;
    state.current = card;
  }
  state.revealed = false;
  renderFlashcard();
}

export function prevFlashcard() {
  ensureState();
  const state = appState.exercise.flashcards;
  if (state.pos > 0) {
    state.pos -= 1;
    state.current = state.history[state.pos];
    state.revealed = false;
    renderFlashcard();
  }
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
  const badgeEl = getElementById('flashcardBadge');

  if (!promptEl || !glyphEl || !badgeEl) return;

  if (!card) {
    setTextContent(promptEl, '—');
    glyphEl.innerHTML = '';
    setTextContent(badgeEl, 'Ready');
    return;
  }

  const { solfege, base } = card;
  const showingAnswer = !!state.revealed;

  if (state.mode === 'shapeToSolfege') {
    // Show shape, flip to reveal solfege text
    setTextContent(promptEl, 'What solfege is this shape?');
    if (showingAnswer) {
      setContentAsText(glyphEl, solfege);
    } else {
      setGlyph(glyphEl, solfege, base, true);
    }
  } else {
    // Show solfege text, flip to reveal shape
    setTextContent(promptEl, 'What shape matches this solfege?');
    if (showingAnswer) {
      setGlyph(glyphEl, solfege, base, true);
    } else {
      setContentAsText(glyphEl, solfege);
    }
  }

  setTextContent(badgeEl, showingAnswer ? 'Revealed' : 'Hidden');

  // Prev is disabled at the start of history; a small counter shows how far you've gone.
  const prevBtn = getElementById('flashcardPrev');
  if (prevBtn) prevBtn.disabled = state.pos <= 0;
  const countEl = getElementById('flashcardCount');
  if (countEl) setTextContent(countEl, `card ${state.pos + 1}`);
}

function createDefaultFlashcardState() {
  return {
    mode: 'shapeToSolfege',
    revealed: false,
    current: null,
    history: [],
    pos: -1
  };
}

function ensureState() {
  if (!appState.exercise.flashcards) {
    appState.exercise.flashcards = createDefaultFlashcardState();
  }
  const s = appState.exercise.flashcards;
  if (!Array.isArray(s.history)) s.history = [];
  if (typeof s.pos !== 'number') s.pos = -1;
}

function buildFlashcardPool() {
  return SOLFEGE.slice();
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

function setContentAsText(el, text) {
  el.innerHTML = '';
  el.style.color = '#ffffff';
  el.style.fontSize = '32px';
  el.style.fontWeight = '700';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.minHeight = '110px';
  setTextContent(el, text);
}


