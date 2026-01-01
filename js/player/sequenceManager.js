/**
 * Sequence ID tracking and timeout management
 * Prevents old sequences from interfering with new ones
 */

let currentSequenceId = 0;
const activeTimeouts = new Map(); // Map<sequenceId, Set<timeoutId>>
const badgeUpdateTimeouts = new Map(); // Map<sequenceId, Set<timeoutId>>

/**
 * Create a new sequence and return its ID
 * @returns {number} The new sequence ID
 */
export function createSequence() {
  currentSequenceId++;
  return currentSequenceId;
}

/**
 * Get the current sequence ID
 * @returns {number} The current sequence ID
 */
export function getCurrentSequenceId() {
  return currentSequenceId;
}

/**
 * Check if a sequence ID is still valid (matches current)
 * @param {number} sequenceId - The sequence ID to check
 * @returns {boolean} True if the sequence is still current
 */
export function isValidSequence(sequenceId) {
  return sequenceId === currentSequenceId;
}

/**
 * Invalidate the current sequence (increment ID)
 * This causes all old sequences to become invalid
 */
export function invalidateSequence() {
  currentSequenceId++;
}

/**
 * Track a timeout for a sequence so it can be cancelled
 * @param {number} timeoutId - The timeout ID from setTimeout
 * @param {number} sequenceId - The sequence ID this timeout belongs to
 */
export function trackTimeout(timeoutId, sequenceId) {
  if (!activeTimeouts.has(sequenceId)) {
    activeTimeouts.set(sequenceId, new Set());
  }
  activeTimeouts.get(sequenceId).add(timeoutId);
}

/**
 * Track a badge update timeout
 * @param {number} timeoutId - The timeout ID from setTimeout
 * @param {number} sequenceId - The sequence ID this timeout belongs to
 */
export function trackBadgeTimeout(timeoutId, sequenceId) {
  if (!badgeUpdateTimeouts.has(sequenceId)) {
    badgeUpdateTimeouts.set(sequenceId, new Set());
  }
  badgeUpdateTimeouts.get(sequenceId).add(timeoutId);
}

/**
 * Clear all timeouts for a specific sequence
 * @param {number} sequenceId - The sequence ID to clear timeouts for
 */
export function clearTimeouts(sequenceId) {
  const timeouts = activeTimeouts.get(sequenceId);
  if (timeouts) {
    timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    activeTimeouts.delete(sequenceId);
  }
}

/**
 * Clear all badge update timeouts for a specific sequence
 * @param {number} sequenceId - The sequence ID to clear timeouts for
 */
export function clearBadgeTimeouts(sequenceId) {
  const timeouts = badgeUpdateTimeouts.get(sequenceId);
  if (timeouts) {
    timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    badgeUpdateTimeouts.delete(sequenceId);
  }
}

/**
 * Clear all timeouts for all sequences
 * Used when stopping everything
 */
export function clearAllTimeouts() {
  activeTimeouts.forEach((timeouts, sequenceId) => {
    timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
  });
  activeTimeouts.clear();
}

/**
 * Clear all badge update timeouts for all sequences
 */
export function clearAllBadgeTimeouts() {
  badgeUpdateTimeouts.forEach((timeouts, sequenceId) => {
    timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
  });
  badgeUpdateTimeouts.clear();
}

/**
 * Remove a timeout from tracking (called when timeout fires)
 * @param {number} timeoutId - The timeout ID that fired
 * @param {number} sequenceId - The sequence ID this timeout belonged to
 */
export function removeTimeout(timeoutId, sequenceId) {
  const timeouts = activeTimeouts.get(sequenceId);
  if (timeouts) {
    timeouts.delete(timeoutId);
    if (timeouts.size === 0) {
      activeTimeouts.delete(sequenceId);
    }
  }
}

/**
 * Remove a badge timeout from tracking
 * @param {number} timeoutId - The timeout ID that fired
 * @param {number} sequenceId - The sequence ID this timeout belonged to
 */
export function removeBadgeTimeout(timeoutId, sequenceId) {
  const timeouts = badgeUpdateTimeouts.get(sequenceId);
  if (timeouts) {
    timeouts.delete(timeoutId);
    if (timeouts.size === 0) {
      badgeUpdateTimeouts.delete(sequenceId);
    }
  }
}

