/**
 * Note scheduling with timeout management and sequence validation
 */

import { trackTimeout, removeTimeout, isValidSequence } from './sequenceManager.js';

/**
 * Schedule a single note to play at a specific time
 * @param {Object} note - Note object with midi, startTime, duration
 * @param {number} sequenceId - The sequence ID this note belongs to
 * @param {Function} onPlay - Callback when note should play: (note, sequenceId) => Promise
 * @returns {Promise} Resolves when note scheduling is complete
 */
export function scheduleNote(note, sequenceId, onPlay) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(async () => {
      // Remove this timeout from tracking
      removeTimeout(timeoutId, sequenceId);
      
      // Check if this is still the current sequence
      if (!isValidSequence(sequenceId)) {
        resolve();
        return;
      }
      
      // Call the play callback
      if (onPlay) {
        await onPlay(note, sequenceId);
      }
      
      resolve();
    }, note.startTime * 1000);
    
    // Track this timeout so we can cancel it if needed
    trackTimeout(timeoutId, sequenceId);
  });
}

/**
 * Schedule multiple notes to play at their scheduled times
 * @param {Array<Object>} notes - Array of note objects
 * @param {number} sequenceId - The sequence ID these notes belong to
 * @param {Function} onPlay - Callback when each note should play: (note, sequenceId) => Promise
 * @returns {Promise} Resolves when all notes are scheduled
 */
export function scheduleNotes(notes, sequenceId, onPlay) {
  const promises = notes.map(note => scheduleNote(note, sequenceId, onPlay));
  return Promise.all(promises);
}

/**
 * Wait for a duration while checking sequence validity periodically
 * @param {number} durationMs - Duration to wait in milliseconds
 * @param {number} sequenceId - The sequence ID to validate
 * @param {Function} isValidCheck - Optional additional validity check: () => boolean
 * @param {number} checkInterval - How often to check validity (default 100ms)
 * @returns {Promise} Resolves if sequence is still valid, rejects if invalidated
 */
export async function waitWithValidation(durationMs, sequenceId, isValidCheck = null, checkInterval = 100) {
  let elapsed = 0;
  
  while (elapsed < durationMs) {
    // Check if sequence is still valid
    if (!isValidSequence(sequenceId)) {
      return false; // Sequence invalidated
    }
    
    // Check additional validity if provided
    if (isValidCheck && !isValidCheck()) {
      return false; // Additional check failed
    }
    
    const waitTime = Math.min(checkInterval, durationMs - elapsed);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    elapsed += waitTime;
  }
  
  // Final check
  if (!isValidSequence(sequenceId)) {
    return false;
  }
  
  if (isValidCheck && !isValidCheck()) {
    return false;
  }
  
  return true; // Still valid
}

