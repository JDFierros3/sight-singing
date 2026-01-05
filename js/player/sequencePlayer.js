/**
 * Main orchestrator for playing sequences of stanzas
 * Coordinates display, audio, and timing
 */

import { createSequence, getCurrentSequenceId, isValidSequence, invalidateSequence, clearTimeouts, clearBadgeTimeouts, trackBadgeTimeout, removeBadgeTimeout } from './sequenceManager.js';
import { scaleStanzasForTempo } from './tempoScaler.js';
import { scheduleNotes, waitWithValidation } from './noteScheduler.js';
import { playNote, stopAllNotes, stopAllNotesForAllSequences } from './audioPlayer.js';
import { setScrollingNotes, startScrollingAnimation, stopScrollingAnimation, resetScrollingAnimation, setTempo } from '../rendering/scrollingStaff.js';
import { renderStaff } from '../rendering/staff.js';
import { appState } from '../state/appState.js';

class StanzaSequencePlayer {
  constructor() {
    this.currentSequenceId = null;
    this.isRunning = false;
    this.isPaused = false;
    this.options = null;
  }

  /**
   * Start playing a sequence of stanzas
   * @param {Array<Object>} stanzas - Array of stanza objects
   * @param {Object} options - Configuration options
   * @returns {Promise} Resolves when sequence completes or is stopped
   */
  async startSequence(stanzas, options = {}) {
    // Check if already running
    if (this.isRunning) {
      // Wait a tiny bit and check again (handles case where finally block is executing)
      await new Promise(resolve => setTimeout(resolve, 10));
      if (this.isRunning) {
        return; // Still running, don't start another
      }
    }

    // Create new sequence
    this.currentSequenceId = createSequence();
    const thisSequenceId = this.currentSequenceId;
    this.options = options;
    this.isRunning = true;
    this.isPaused = false;

    // Clear any existing timeouts
    clearTimeouts(this.currentSequenceId);
    clearBadgeTimeouts(this.currentSequenceId);

    // Stop any running animation immediately and clear state
    stopScrollingAnimation();
    appState.staff.isPlaying = false;
    appState.staff.scrollingMode = false;

    // Clear any old notes and reset scrolling mode immediately
    // Only clear notes if not in SATB preview mode
    if (!appState.staff.satbPreviewMode) {
      appState.staff.notes = [];
    }
    appState.staff.currentTime = 0;
    appState.staff.playheadX = 0;
    appState.staff.startTime = null;

    // Store sequence ID in staff state to prevent old sequences from updating display
    appState.staff.sequenceId = thisSequenceId;

    // Force a render to clear the display before starting new sequence
    renderStaff();

    // Wait for next animation frame to ensure old frames are processed
    await new Promise(resolve => requestAnimationFrame(resolve));
    // Small additional delay to ensure any queued frames have been cancelled
    await new Promise(resolve => setTimeout(resolve, 20));

    // Filter to selected stanzas, or use all if none specified
    let plan = stanzas;
    if (options.selectedStanzaIndices && options.selectedStanzaIndices.length > 0) {
      plan = options.selectedStanzaIndices.map(index => stanzas[index]).filter(Boolean);
    }

    if (plan.length === 0) {
      this.isRunning = false;
      if (options.onComplete) {
        options.onComplete();
      }
      return;
    }

    try {
      // Set tempo from options or appState
      const tempo = options.tempo || appState.staff.tempo || 60;
      setTempo(tempo);

      // Create scaled version for audio (durations scale, startTimes stay fixed for positioning)
      const tempoScale = 60 / tempo; // At 60 BPM, scale = 1.0
      const scaledPlan = scaleStanzasForTempo(plan, tempo, 60);

      // Play each stanza sequentially with scrolling visualization
      for (let i = 0; i < plan.length; i++) {
        // Check if sequence was stopped or invalidated
        if (!this.isRunning || !isValidSequence(thisSequenceId)) {
          break;
        }

        const stanza = plan[i];
        const scaledStanza = scaledPlan[i];

        // Call onStanzaStart callback if provided
        if (options.onStanzaStart) {
          options.onStanzaStart(stanza, i, thisSequenceId);
        }

        // Set up scrolling notes for this stanza (display all notes)
        // Use original (unscaled) notes for fixed positioning on staff
        if (!isValidSequence(thisSequenceId)) {
          break;
        }

        // Clear any old state first
        appState.staff.currentTime = 0;
        appState.staff.playheadX = 0;

        // Update sequence ID before setting notes
        appState.staff.sequenceId = thisSequenceId;

        // Stop any old animation before setting new notes
        stopScrollingAnimation();
        appState.staff.isPlaying = false;

        // Keep SATB preview mode active during playback (don't clear key signature)
        // appState.staff.satbPreviewMode is preserved
        
        // Set notes with sequence ID to prevent old sequences from overwriting
        // Also pass the stanza duration so the playhead stops at the right place
        const stanzaDuration = stanza.duration !== undefined ? stanza.duration : null;
        setScrollingNotes(stanza.notes, thisSequenceId, stanzaDuration);
        
        // Update panning cursor after notes are set
        const { updatePanningCursor } = await import('../rendering/staffPanning.js');
        updatePanningCursor();

        // Reset animation state
        resetScrollingAnimation();

        // Render the staff with all notes visible
        renderStaff();

        // One more check after setting up the display
        if (!isValidSequence(thisSequenceId)) {
          break;
        }

        // Brief pause to let user see the notes
        const pauseValid = await waitWithValidation(1000, thisSequenceId, () => this.isRunning);
        if (!pauseValid) {
          break;
        }

        // Check again after wait
        if (!this.isRunning || !isValidSequence(thisSequenceId)) {
          break;
        }

        // Setup display for this stanza (callback hook)
        if (options.displaySetup) {
          options.displaySetup(stanza, i, thisSequenceId);
        }

        // Start scrolling animation
        startScrollingAnimation();

        // Play audio for this stanza
        if (options.audioSetup) {
          // Custom audio setup (for warmups, hymns, etc.)
          await options.audioSetup(scaledStanza, thisSequenceId);
        } else {
          // Default: schedule all notes
          await scheduleNotes(scaledStanza.notes, thisSequenceId, async (note, seqId) => {
            if (isValidSequence(seqId) && this.isRunning) {
              await playNote(note, seqId, options.baseGain || 0.15, options.partVolumes || {});
            }
          });
        }

        // Wait for stanza to complete
        // Use scaledStanza.duration if provided (already scaled), otherwise calculate from last note
        let totalDuration;
        if (scaledStanza.duration !== undefined) {
          // Stanza has explicit duration (already scaled by scaleStanzaForTempo)
          totalDuration = scaledStanza.duration * 1000;
        } else {
          // Calculate from last note
          const lastNote = scaledStanza.notes[scaledStanza.notes.length - 1];
          totalDuration = (lastNote.startTime + lastNote.duration) * 1000;
        }
        
        // Wait for the stanza duration to complete
        // This matches when the animation stops
        const waitValid = await waitWithValidation(totalDuration, thisSequenceId, () => this.isRunning);
        if (!waitValid) {
          break;
        }

        // Wait a bit for any final notes to finish (but not too long)
        await waitWithValidation(100, thisSequenceId, () => this.isRunning);

        // Stop animation for this stanza
        stopScrollingAnimation();
        appState.staff.isPlaying = false;

        // Call onStanzaEnd callback if provided
        if (options.onStanzaEnd) {
          options.onStanzaEnd(stanza, i, thisSequenceId);
        }

        // Brief pause between stanzas (except after last one)
        if (i < plan.length - 1) {
          const betweenValid = await waitWithValidation(500, thisSequenceId, () => this.isRunning);
          if (!betweenValid) {
            break;
          }
        }
      }

      // Call onComplete callback if provided
      if (options.onComplete && isValidSequence(thisSequenceId)) {
        options.onComplete();
      }
    } catch (error) {
      console.error('Error in sequence playback:', error);
    } finally {
      // Only clean up if this is still the current sequence
      if (thisSequenceId === this.currentSequenceId) {
        this.isRunning = false;
        this.isPaused = false;
        
        // Stop all audio
        stopAllNotes(thisSequenceId);
        stopScrollingAnimation();
        appState.staff.scrollingMode = false;
        
        // Clear notes and reset state
        // Only clear notes if not in SATB preview mode
    if (!appState.staff.satbPreviewMode) {
      appState.staff.notes = [];
    }
        appState.staff.currentTime = 0;
        appState.staff.playheadX = 0;
        appState.staff.isPlaying = false;
        appState.staff.sequenceId = null;
        
        renderStaff();
      }
    }
  }

  /**
   * Stop the current sequence
   */
  stopSequence() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    invalidateSequence();
    
    if (this.currentSequenceId !== null) {
      // Clear all pending timeouts
      clearTimeouts(this.currentSequenceId);
      clearBadgeTimeouts(this.currentSequenceId);
      
      // Stop all audio
      stopAllNotes(this.currentSequenceId);
    }
    
    // Stop animation
    stopScrollingAnimation();
    appState.staff.scrollingMode = false;
    
    // Clear notes and reset state
    // Only clear notes if not in SATB preview mode
    if (!appState.staff.satbPreviewMode) {
      appState.staff.notes = [];
    }
    appState.staff.currentTime = 0;
    appState.staff.playheadX = 0;
    appState.staff.isPlaying = false;
    appState.staff.sequenceId = null;
    
    renderStaff();
    
    // Call onStop callback if provided
    if (this.options && this.options.onStop) {
      this.options.onStop();
    }
  }

  /**
   * Pause the current sequence
   */
  pauseSequence() {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    // Note: Animation pausing is handled by scrollingStaff.js
    // Audio will continue but can be stopped if needed
  }

  /**
   * Resume a paused sequence
   */
  resumeSequence() {
    if (!this.isRunning || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    // Note: Animation resuming is handled by scrollingStaff.js
  }

  /**
   * Check if a sequence is currently running
   * @returns {boolean}
   */
  isSequenceRunning() {
    return this.isRunning;
  }

  /**
   * Get the current sequence ID
   * @returns {number|null}
   */
  getCurrentSequenceId() {
    return this.currentSequenceId;
  }
}

// Export a singleton instance
export const stanzaSequencePlayer = new StanzaSequencePlayer();

