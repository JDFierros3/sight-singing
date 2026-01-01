/**
 * Keyboard shortcut handlers
 */

export function handleGlobalKeyPress(event) {
  if (shouldIgnoreKeyPress(event)) {
    return;
  }
  
  const key = getKeyFromEvent(event);
  
  if (key === 'm') {
    toggleMicrophoneWithKey();
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

