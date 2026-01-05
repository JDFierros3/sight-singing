/**
 * Manual staff panning when not playing
 * Allows user to drag/pan the staff to view the entire piece
 */

import { appState } from '../state/appState.js';
import { renderStaff } from './staff.js';

let isDragging = false;
let dragStartX = 0;
let dragStartOffset = 0;

/**
 * Initialize panning controls for the staff canvas
 */
export function initializeStaffPanning() {
  const canvas = document.getElementById('staff');
  if (!canvas) return;
  
  // Mouse events
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  
  // Touch events for mobile
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', handleTouchEnd);
  
  // Prevent default scrolling on canvas
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  
  // Update cursor based on whether panning is possible
  updateCursor();
  
  // Update cursor when window resizes or notes change
  window.addEventListener('resize', handleResize);
}

/**
 * Check if panning is needed (music extends beyond viewport)
 */
function isPanningNeeded() {
  // Only allow panning when not playing
  if (appState.staff.isPlaying) {
    return false;
  }
  
  // Need notes to pan
  const notes = appState.staff.notes;
  if (notes.length === 0) {
    return false;
  }
  
  // Allow panning in scrolling mode OR SATB preview mode
  const isScrollingMode = appState.staff.scrollingMode;
  const isPreviewMode = appState.staff.satbPreviewMode && appState.exercise.currentTab === 'satb';
  
  if (!isScrollingMode && !isPreviewMode) {
    return false;
  }
  
  const canvas = document.getElementById('staff');
  if (!canvas) return false;
  
  const viewportWidth = canvas.clientWidth || canvas.width;
  const startX = 80;
  const basePixelsPerSecond = 80;
  
  // Calculate rightmost note position
  const lastNote = notes[notes.length - 1];
  const firstNoteTime = notes[0].startTime;
  const lastNoteTime = lastNote.startTime + (lastNote.duration || 0);
  const timeDiff = lastNoteTime - firstNoteTime;
  const rightmostX = startX + timeDiff * basePixelsPerSecond;
  
  // Panning is needed if music extends beyond viewport
  return rightmostX > viewportWidth;
}

/**
 * Update cursor based on whether panning is possible
 */
function updateCursor() {
  const canvas = document.getElementById('staff');
  if (!canvas) return;
  
  if (isPanningNeeded()) {
    canvas.style.cursor = 'grab';
  } else {
    canvas.style.cursor = 'default';
  }
}

function handleResize() {
  updateCursor();

  // Clamp current offset to the new viewport bounds to avoid getting stuck off-screen.
  const current = appState.staff.viewportOffset || 0;
  const clamped = clampViewportOffset(current);
  if (clamped !== current) {
    appState.staff.viewportOffset = clamped;
    renderStaff();
  }
}

/**
 * Update cursor when notes change or playback state changes
 */
export function updatePanningCursor() {
  updateCursor();
}

function handleMouseDown(event) {
  // Only allow panning if it's needed and not playing
  if (!isPanningNeeded()) {
    return;
  }
  
  isDragging = true;
  dragStartX = event.clientX;
  dragStartOffset = appState.staff.viewportOffset || 0;
  
  const canvas = event.target;
  canvas.style.cursor = 'grabbing';
}

function handleMouseMove(event) {
  if (!isDragging) return;
  
  const deltaX = dragStartX - event.clientX; // Invert so dragging right pans right
  const newOffset = dragStartOffset + deltaX;
  
  // Clamp to valid range
  const clampedOffset = clampViewportOffset(newOffset);
  appState.staff.viewportOffset = clampedOffset;
  
  renderStaff();
}

function handleMouseUp(event) {
  if (!isDragging) return;
  
  isDragging = false;
  updateCursor(); // Restore appropriate cursor
}

function handleTouchStart(event) {
  // Only allow panning if it's needed and not playing
  if (!isPanningNeeded()) {
    return;
  }
  
  if (event.touches.length === 1) {
    isDragging = true;
    dragStartX = event.touches[0].clientX;
    dragStartOffset = appState.staff.viewportOffset || 0;
    event.preventDefault(); // Prevent scrolling
  }
}

function handleTouchMove(event) {
  if (!isDragging || event.touches.length !== 1) return;
  
  event.preventDefault(); // Prevent scrolling
  
  const deltaX = dragStartX - event.touches[0].clientX; // Invert so dragging right pans right
  const newOffset = dragStartOffset + deltaX;
  
  // Clamp to valid range
  const clampedOffset = clampViewportOffset(newOffset);
  appState.staff.viewportOffset = clampedOffset;
  
  renderStaff();
}

function handleTouchEnd(event) {
  isDragging = false;
}

function handleWheel(event) {
  // Only allow scrolling if panning is needed
  if (!isPanningNeeded()) {
    return;
  }
  
  event.preventDefault();
  
  // Pan with mouse wheel (horizontal scroll)
  const scrollAmount = event.deltaY * 0.5; // Scale scroll speed
  const newOffset = (appState.staff.viewportOffset || 0) + scrollAmount;
  
  // Clamp to valid range
  const clampedOffset = clampViewportOffset(newOffset);
  appState.staff.viewportOffset = clampedOffset;
  
  renderStaff();
}

/**
 * Clamp viewport offset to valid range
 */
function clampViewportOffset(offset) {
  const notes = appState.staff.notes;
  if (notes.length === 0) {
    return Math.max(0, offset); // Can't pan left of start
  }
  
  const canvas = document.getElementById('staff');
  if (!canvas) return offset;
  
  const viewportWidth = canvas.clientWidth || canvas.width;
  const startX = 80;
  const basePixelsPerSecond = 80;
  
  // Calculate rightmost note position
  const lastNote = notes[notes.length - 1];
  const firstNoteTime = notes[0].startTime;
  const lastNoteTime = lastNote.startTime + (lastNote.duration || 0);
  const timeDiff = lastNoteTime - firstNoteTime;
  const rightmostX = startX + timeDiff * basePixelsPerSecond;
  
  // Clamp between 0 and max offset
  const maxOffset = Math.max(0, rightmostX - viewportWidth + 100);
  return Math.max(0, Math.min(maxOffset, offset));
}

