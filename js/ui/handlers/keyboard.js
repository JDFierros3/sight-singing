/**
 * Keyboard shortcut handlers
 */

import { appState } from '../../state/appState.js';
import { flipFlashcard, nextFlashcard, prevFlashcard } from '../../exercises/flashcards.js';

export function handleGlobalKeyPress(event) {
  if (shouldIgnoreKeyPress(event)) {
    return;
  }
  
  const key = getKeyFromEvent(event);
  
  if (key === 'm') {
    toggleMicrophoneWithKey();
  }

  // Flashcards shortcuts (only when on the Flashcards tab)
  if (appState.exercise?.currentTab === 'flashcards') {
    if (key === ' ' || key === 'space') {
      event.preventDefault();
      flipFlashcard();
    }
    if (key === 'n' || key === 'arrowright') {
      event.preventDefault();
      nextFlashcard();
    }
    if (key === 'arrowleft') {
      event.preventDefault();
      prevFlashcard();
    }
  }
}

function isEditableElementFocused() {
  const activeElement = document.activeElement;
  
  if (!activeElement) {
    return false;
  }
  
  const tagName = activeElement.tagName;
  const isInput = tagName === 'INPUT';
  const isTextarea = tagName === 'TEXTAREA';
  const isSelect = tagName === 'SELECT';
  const isContentEditable = activeElement.isContentEditable;
  
  return isInput || isTextarea || isSelect || isContentEditable;
}

function shouldIgnoreKeyPress(event) {
  return isEditableElementFocused();
}

function getKeyFromEvent(event) {
  if (event && typeof event.key === 'string') {
    return event.key.toLowerCase();
  }
  return '';
}

function toggleMicrophoneWithKey() {
  const event = new CustomEvent('app:toggleMic');
  window.dispatchEvent(event);
}

