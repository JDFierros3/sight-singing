/**
 * Tab navigation system
 */

import { getElementById } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { displaySATBExerciseOnStaff, getAllSATBExercises } from '../../exercises/satb.js';
import { initializeFlashcards } from '../../exercises/flashcards.js';

const TAB_NAMES = ['settings', 'chord-quality', 'warmup', 'cluster', 'intervals', 'flashcards', 'satb', 'theory'];

export function initializeTabSystem() {
  const tabButtons = document.querySelectorAll('.tab');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchToTab(tabName);
    });
  });
  
  // Initialize with the default tab from appState
  const defaultTab = appState.exercise.currentTab || 'settings';
  switchToTab(defaultTab);
}

export function switchToTab(tabName) {
  appState.exercise.currentTab = tabName;
  
  TAB_NAMES.forEach(tab => {
    updateTabButtonState(tab, tab === tabName);
    updateTabPanelVisibility(tab, tab === tabName);
  });
  
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

export function showTabPanel(tabName) {
  updateTabPanelVisibility(tabName, true);
}

export function hideTabPanel(tabName) {
  updateTabPanelVisibility(tabName, false);
}

