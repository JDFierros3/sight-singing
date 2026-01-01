/**
 * Scrolling staff animation and timing
 */

import { appState } from '../state/appState.js';
import { renderStaff } from './staff.js';
import { updatePanningCursor } from './staffPanning.js';

let animationFrameId = null;

export function startScrollingAnimation() {
  if (animationFrameId !== null) {
    return; // Already running
  }
  
  if (!appState.staff.isPlaying) {
    appState.staff.isPlaying = true;
    // Reset start time when starting fresh
    if (appState.staff.currentTime === 0) {
      appState.staff.startTime = performance.now();
    } else {
      appState.staff.startTime = performance.now() - (appState.staff.currentTime * 1000);
    }
  }
  
  // Store the sequence ID when starting animation to prevent old frames from rendering
  const animationSequenceId = appState.staff.sequenceId;
  
  function animate() {
    // Check if animation should continue - both isPlaying and scrolling mode must be true
    if (!appState.staff.isPlaying) {
      animationFrameId = null;
      return;
    }
    
    // Also check if we're still in scrolling mode (prevents rendering after stop)
    if (!appState.staff.scrollingMode) {
      animationFrameId = null;
      appState.staff.isPlaying = false;
      return;
    }
    
    // Check if sequence ID has changed (new sequence started)
    if (appState.staff.sequenceId !== animationSequenceId) {
      animationFrameId = null;
      appState.staff.isPlaying = false;
      return;
    }
    
    updateCurrentTime();
    updatePlayheadPosition();
    renderStaff();
    
    animationFrameId = requestAnimationFrame(animate);
  }
  
  animationFrameId = requestAnimationFrame(animate);
}

export function stopScrollingAnimation() {
  appState.staff.isPlaying = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

export function pauseScrollingAnimation() {
  appState.staff.isPlaying = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

export function resumeScrollingAnimation() {
  if (!appState.staff.isPlaying && appState.staff.scrollingMode) {
    // Adjust start time to account for paused duration
    const pausedDuration = performance.now() - (appState.staff.startTime + appState.staff.currentTime * 1000);
    appState.staff.startTime = performance.now() - (appState.staff.currentTime * 1000) - pausedDuration;
    startScrollingAnimation();
  }
}

export function resetScrollingAnimation() {
  stopScrollingAnimation();
  appState.staff.currentTime = 0;
  appState.staff.playheadX = 0;
  appState.staff.viewportOffset = 0;
  appState.staff.maxPanReached = false;
  appState.staff.startTime = null;
  renderStaff();
}

function updateCurrentTime() {
  if (appState.staff.startTime === null) {
    appState.staff.startTime = performance.now();
  }
  
  appState.staff.currentTime = (performance.now() - appState.staff.startTime) / 1000;
}

function updatePlayheadPosition() {
  const tempo = appState.staff.tempo;
  const startX = 80;
  // Base spacing: 80 pixels per second (for note positioning)
  // Notes are positioned using base (unscaled) startTimes, so they stay fixed
  // Audio plays using scaled startTimes (faster/slower based on tempo)
  // Playhead must move at a speed that matches the scaled audio timing
  const basePixelsPerSecond = 80;
  // Playhead speed scales with tempo to match audio: faster tempo = faster playhead
  // At 60 BPM: 80 px/s, at 120 BPM: 160 px/s (2x faster to match 2x faster audio)
  const pixelsPerSecond = basePixelsPerSecond * (tempo / 60);
  
  // Playhead moves from startX based on currentTime (real elapsed time)
  // Notes are positioned using base (unscaled) startTimes
  // Audio plays at scaled times, so playhead must move faster to match
  const firstNoteTime = appState.staff.notes[0]?.startTime || 0;
  // Convert real time to scaled time for playhead position
  // At 120 BPM, 0.5s real time = 1.0s scaled time (2x faster)
  const tempoScale = tempo / 60;
  const scaledTime = appState.staff.currentTime * tempoScale;
  const relativeTime = scaledTime - firstNoteTime;
  
  // Calculate absolute playhead position (in note coordinate space)
  // Notes are positioned in base time, playhead moves in scaled time to match audio
  let playheadX = startX + relativeTime * basePixelsPerSecond;
  
  // If stanza has a duration, limit playhead to not go beyond the last note's end
  if (appState.staff.stanzaDuration !== null && appState.staff.stanzaDuration !== undefined) {
    // Duration is in base (unscaled) time, same as note startTimes
    // currentTime is real elapsed time, which equals base time
    // We compare currentTime directly against stanzaDuration (both in base time)
    const currentBaseTime = appState.staff.currentTime;
    const maxBaseTime = appState.staff.stanzaDuration;
    
    // If we've exceeded the duration in base time, stop the playhead
    if (currentBaseTime >= maxBaseTime) {
      // Calculate the max playhead position based on base duration
      // Use base time for positioning since notes are positioned in base time
      const maxRelativeTime = maxBaseTime - firstNoteTime;
      const maxPlayheadX = startX + maxRelativeTime * basePixelsPerSecond;
      playheadX = maxPlayheadX;
      
      // Stop animation when we reach the end
      if (appState.staff.isPlaying) {
        appState.staff.isPlaying = false;
      }
    }
  }
  
  appState.staff.playheadX = playheadX;
  
  // Calculate viewport offset to keep playhead centered once it reaches a certain point
  // Get canvas dimensions to know viewport width
  const canvas = document.getElementById('staff');
  if (!canvas) return;
  
  // Use clientWidth for viewport width (not canvas.width which is scaled by DPR)
  const viewportWidth = canvas.clientWidth || canvas.width;
  const playheadFixedPosition = viewportWidth * 0.4; // Keep playhead at 40% from left once panning starts
  
  // Only start panning when playhead moves past the fixed position
  // Before that, viewportOffset stays at 0 (playhead at its actual position)
  let viewportOffset = 0;
  let maxPanReached = false;
  
  if (playheadX > playheadFixedPosition) {
    // Start panning: calculate offset to keep playhead at fixed position
    viewportOffset = playheadX - playheadFixedPosition;
    
    // Calculate the rightmost note position to know when to stop panning
    const notes = appState.staff.notes;
    if (notes.length > 0) {
      const lastNote = notes[notes.length - 1];
      const firstNoteTime = notes[0].startTime;
      const lastNoteTime = lastNote.startTime + (lastNote.duration || 0);
      const timeDiff = lastNoteTime - firstNoteTime;
      const rightmostX = startX + timeDiff * basePixelsPerSecond;
      
      // Don't pan beyond the end (when rightmost note would be visible)
      const maxOffset = rightmostX - viewportWidth + 100; // Add some padding
      if (viewportOffset >= maxOffset) {
        viewportOffset = maxOffset;
        maxPanReached = true; // We've reached max pan, playhead should continue moving right
      }
    }
  }
  
  appState.staff.viewportOffset = viewportOffset;
  appState.staff.maxPanReached = maxPanReached;
}

export function setScrollingNotes(notes, sequenceId = null, duration = null) {
  // Only update if no sequence ID provided (backward compatibility) or if it matches current
  // This prevents old sequences from overwriting new notes
  if (sequenceId === null || sequenceId === appState.staff.sequenceId) {
    appState.staff.notes = notes;
    appState.staff.scrollingMode = notes.length > 0;
    appState.staff.stanzaDuration = duration; // Store stanza duration to limit playhead movement
    appState.staff.viewportOffset = 0; // Reset viewport offset when new notes are set
    appState.staff.maxPanReached = false; // Reset max pan flag
    
    // Update panning cursor after notes are set
    updatePanningCursor();
  }
}

export function setTempo(tempo) {
  appState.staff.tempo = tempo;
  // Recalculate playhead position if playing
  if (appState.staff.isPlaying) {
    updatePlayheadPosition();
  }
}

