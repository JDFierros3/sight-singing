/**
 * Tab navigation system
 */

import { getElementById } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { displaySATBExerciseOnStaff, getAllSATBExercises } from '../../exercises/satb.js';
import { initializeFlashcards } from '../../exercises/flashcards.js';
import { stopAllPlayback } from '../components/transport.js';
import { renderStaff } from '../../rendering/staff.js';

const TAB_NAMES = ['warmup', 'cluster', 'intervals', 'flashcards', 'satb', 'chord-quality', 'theory'];

export function initializeTabSystem() {
  const tabButtons = document.querySelectorAll('.tab');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchToTab(tabName);
    });
  });

  initializeTabSelectDropdown();
  
  // Initialize with the default tab from appState
  const defaultTab = appState.exercise.currentTab || 'warmup';
  switchToTab(defaultTab);
}

export function switchToTab(tabName) {
  stopAllPlayback();
  appState.exercise.currentTab = tabName;
  
  // Clear SATB-specific key signature info when switching away from SATB
  if (tabName !== 'satb') {
    appState.staff.keyTonic = undefined;
    appState.staff.keyMode = undefined;
    appState.staff.notes = [];
    appState.staff.satbPreviewMode = false;
    // Re-render staff to clear SATB-specific rendering
    renderStaff();
  }
  
  TAB_NAMES.forEach(tab => {
    updateTabButtonState(tab, tab === tabName);
    updateTabPanelVisibility(tab, tab === tabName);
  });

  syncTabSelectValue(tabName);
  
  // If switching to SATB tab, ensure the current exercise is displayed
  if (tabName === 'satb') {
    // Use setTimeout to ensure panel is visible before rendering
    setTimeout(() => {
      const exerciseSelect = getElementById('satbExercise');
      if (exerciseSelect) {
        const exercises = getAllSATBExercises();
        const exerciseIndex = parseInt(exerciseSelect.value) || 0;
        if (exercises[exerciseIndex]) {
          appState.satb.currentExercise = exercises[exerciseIndex];
          displaySATBExerciseOnStaff(exercises[exerciseIndex]);
        } else if (exercises.length > 0) {
          // Fallback to first exercise if selection is invalid
          appState.satb.currentExercise = exercises[0];
          displaySATBExerciseOnStaff(exercises[0]);
        }
      } else if (appState.satb.currentExercise) {
        // If dropdown not ready but we have a current exercise, display it
        displaySATBExerciseOnStaff(appState.satb.currentExercise);
      }
    }, 10);
  }

  if (tabName === 'flashcards') {
    setTimeout(() => {
      initializeFlashcards();
    }, 10);
  }
}

function updateTabButtonState(tabName, isActive) {
  const button = findTabButton(tabName);
  if (button) {
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }
}

function updateTabPanelVisibility(tabName, isVisible) {
  const panel = getElementById(`panel-${tabName}`);
  if (panel) {
    panel.style.display = isVisible ? 'block' : 'none';
  }
}

function findTabButton(tabName) {
  const buttons = document.querySelectorAll('.tab');
  return Array.from(buttons).find(btn => btn.dataset.tab === tabName);
}

function initializeTabSelectDropdown() {
  const select = getElementById('tabSelect');
  if (!select) {
    return;
  }

  // Build options from the existing tab buttons so labels stay in sync with the UI.
  select.innerHTML = '';
  const buttons = Array.from(document.querySelectorAll('.tab'));
  buttons.forEach(btn => {
    const tabName = btn.dataset.tab;
    if (!tabName) return;
    const opt = document.createElement('option');
    opt.value = tabName;
    opt.textContent = btn.textContent || tabName;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value) {
      switchToTab(value);
    }
  });
}

function syncTabSelectValue(tabName) {
  const select = getElementById('tabSelect');
  if (!select) return;
  if (select.value !== tabName) {
    select.value = tabName;
  }
}

export function showTabPanel(tabName) {
  updateTabPanelVisibility(tabName, true);
}

export function hideTabPanel(tabName) {
  updateTabPanelVisibility(tabName, false);
}

