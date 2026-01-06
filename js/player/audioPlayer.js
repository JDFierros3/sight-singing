/**
 * Audio playback with multi-part support, volume control, and fade in/out
 */

import { getAudioContext, ensureAudioContext } from '../audio/context.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from '../audio/oscillator.js';
import { isValidSequence } from './sequenceManager.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { appState } from '../state/appState.js';
import { isUsingSoundfont, playInstrumentNote, stopInstrumentNote } from '../audio/instruments.js';

// Track active oscillators by sequence ID
const activeOscillators = new Map(); // Map<sequenceId, Set<oscillator>>

/**
 * Play a single note with fade in/out
 * @param {Object} note - Note object with midi, duration, part (optional), volume (optional)
 * @param {number} sequenceId - The sequence ID this note belongs to
 * @param {number} baseGain - Base gain level (0-1)
 * @param {Object} partVolumes - Optional part-specific volumes { S: 0.8, A: 0.7, ... }
 * @returns {Object|null} Oscillator object or null if creation failed
 */
export async function playNote(note, sequenceId, baseGain = 0.15, partVolumes = {}) {
  await ensureAudioContext();
  
  // Check sequence is still valid
  if (!isValidSequence(sequenceId)) {
    return null;
  }
  
  const ctx = getAudioContext();
  if (!ctx) {
    return null;
  }
  
  // Calculate gain with part volume if applicable
  let gain = baseGain;
  if (note.part && partVolumes[note.part] !== undefined) {
    gain = baseGain * partVolumes[note.part];
  } else if (note.volume !== undefined) {
    gain = note.volume;
  }
  
  // Try to use soundfont instrument if available
  if (isUsingSoundfont()) {
    const instrumentNote = playInstrumentNote(note.midi, note.duration, gain, note.part || null);
    if (instrumentNote) {
      // Track this note
      if (!activeOscillators.has(sequenceId)) {
        activeOscillators.set(sequenceId, new Set());
      }
      activeOscillators.get(sequenceId).add(instrumentNote);
      
      // Auto-cleanup after duration
      setTimeout(() => {
        if (isValidSequence(sequenceId)) {
          const oscillators = activeOscillators.get(sequenceId);
          if (oscillators) {
            oscillators.delete(instrumentNote);
            if (oscillators.size === 0) {
              activeOscillators.delete(sequenceId);
            }
          }
        }
      }, note.duration * 1000);
      
      return instrumentNote;
    }
  }
  
  // Fall back to oscillator (sine wave)
  const frequency = midiToFrequency(note.midi, appState.tuning.a4);
  const oscillator = createOscillator(frequency, 'sine', gain);
  
  if (oscillator) {
    // Track this oscillator
    if (!activeOscillators.has(sequenceId)) {
      activeOscillators.set(sequenceId, new Set());
    }
    activeOscillators.get(sequenceId).add(oscillator);
    
    connectOscillatorToDestination(oscillator, ctx.destination);
    startOscillator(oscillator);
    
    // Schedule stop after duration
    setTimeout(() => {
      if (isValidSequence(sequenceId)) {
        stopNote(oscillator, sequenceId);
      }
    }, note.duration * 1000);
  }
  
  return oscillator;
}

/**
 * Play multiple notes simultaneously (for multi-part like SATB)
 * @param {Array<Object>} notes - Array of note objects
 * @param {number} sequenceId - The sequence ID these notes belong to
 * @param {number} baseGain - Base gain level (0-1)
 * @param {Object} partVolumes - Part-specific volumes { S: 0.8, A: 0.7, T: 0.6, B: 0.5 }
 * @returns {Array<Object>} Array of oscillator objects
 */
export async function playMultiPart(notes, sequenceId, baseGain = 0.15, partVolumes = {}) {
  const oscillators = [];
  
  for (const note of notes) {
    const osc = await playNote(note, sequenceId, baseGain, partVolumes);
    if (osc) {
      oscillators.push(osc);
    }
  }
  
  return oscillators;
}

/**
 * Stop a single note/oscillator
 * @param {Object} oscillator - Oscillator or instrument note object to stop
 * @param {number} sequenceId - The sequence ID this oscillator belongs to
 */
export function stopNote(oscillator, sequenceId) {
  if (!oscillator) {
    return;
  }
  
  // Check if it's an instrument note or oscillator
  if (oscillator.stop) {
    stopInstrumentNote(oscillator);
  } else {
    stopOscillator(oscillator);
  }
  
  // Remove from tracking
  const oscillators = activeOscillators.get(sequenceId);
  if (oscillators) {
    oscillators.delete(oscillator);
    if (oscillators.size === 0) {
      activeOscillators.delete(sequenceId);
    }
  }
}

/**
 * Stop all notes for a specific sequence
 * @param {number} sequenceId - The sequence ID to stop notes for
 */
export function stopAllNotes(sequenceId) {
  const oscillators = activeOscillators.get(sequenceId);
  if (oscillators) {
    oscillators.forEach(oscillator => {
      if (oscillator.stop) {
        stopInstrumentNote(oscillator);
      } else {
        stopOscillator(oscillator);
      }
    });
    activeOscillators.delete(sequenceId);
  }
}

/**
 * Stop all notes for all sequences
 */
export function stopAllNotesForAllSequences() {
  activeOscillators.forEach((oscillators, sequenceId) => {
    oscillators.forEach(oscillator => {
      if (oscillator.stop) {
        stopInstrumentNote(oscillator);
      } else {
        stopOscillator(oscillator);
      }
    });
  });
  activeOscillators.clear();
}

