/**
 * Tab navigation system
 */

import { getElementById } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { displaySATBExerciseOnStaff, getAllSATBExercises } from '../../exercises/satb.js';
import { initializeFlashcards } from '../../exercises/flashcards.js';
import { stopAllPlayback } from '../components/transport.js';
import { renderStaff } from '../../rendering/staff.js';
import { renderTheoryContent, saveExpandedLessons } from './theoryContent.js';

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
  
  // Initialize sidebar resizer
  initializeSidebarResizer();
  
  // Initialize sidebar scroll position saving
  initializeSidebarScrollPosition();
  
  // Initialize with the default tab from appState
  const defaultTab = appState.exercise.currentTab || 'warmup';
  switchToTab(defaultTab);
  
  // Also update reveal buttons on initial load
  updateHeaderRevealButtons(defaultTab);
  
  // Handle window resize to move theory panel between main content and sidebar
  window.addEventListener('resize', () => {
    if (appState.exercise.currentTab === 'theory') {
      moveTheoryToSidebar();
    }
    // Update sidebar width CSS variable on resize
    updateSidebarWidth();
  });
}

function initializeSidebarResizer() {
  const resizer = document.getElementById('theory-sidebar-resizer');
  if (!resizer) return;
  
  // Load saved width from localStorage
  const savedWidth = localStorage.getItem('theory-sidebar-width');
  const defaultWidth = 400; // pixels
  const sidebarWidth = savedWidth ? parseInt(savedWidth, 10) : defaultWidth;
  
  // Set initial width
  setSidebarWidth(sidebarWidth);
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    const sidebar = document.getElementById('theory-sidebar');
    if (sidebar) {
      startWidth = sidebar.offsetWidth;
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const deltaX = startX - e.clientX; // Inverted because sidebar is on the right
    const newWidth = Math.max(250, Math.min(800, startWidth + deltaX));
    setSidebarWidth(newWidth);
    // Trigger resize event so canvas and other elements update
    window.dispatchEvent(new Event('resize'));
    e.preventDefault();
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

function setSidebarWidth(width) {
  document.documentElement.style.setProperty('--theory-sidebar-width', `${width}px`);
  localStorage.setItem('theory-sidebar-width', width.toString());
}

function updateSidebarWidth() {
  // Ensure CSS variable is set on resize
  const sidebar = document.getElementById('theory-sidebar');
  if (sidebar && document.body.classList.contains('theory-sidebar-active')) {
    const currentWidth = sidebar.offsetWidth;
    if (currentWidth > 0) {
      document.documentElement.style.setProperty('--theory-sidebar-width', `${currentWidth}px`);
    }
  }
}

function initializeSidebarScrollPosition() {
  const sidebar = document.getElementById('theory-sidebar');
  if (!sidebar) return;
  
  // Save scroll position when sidebar is scrolled
  sidebar.addEventListener('scroll', () => {
    if (document.body.classList.contains('theory-sidebar-active')) {
      saveSidebarScrollPosition();
    }
  });
}

function saveSidebarScrollPosition() {
  const sidebar = document.getElementById('theory-sidebar');
  if (sidebar && document.body.classList.contains('theory-sidebar-active')) {
    const scrollTop = sidebar.scrollTop;
    localStorage.setItem('theory-sidebar-scroll', scrollTop.toString());
    
    // Also save expanded lessons state when saving scroll position
    // This ensures state is saved even if user doesn't toggle anything
    saveExpandedLessons();
  }
}

function restoreSidebarScrollPosition() {
  const sidebar = document.getElementById('theory-sidebar');
  if (!sidebar) return;
  
  // Wait for content to be rendered before restoring scroll position
  setTimeout(() => {
    const savedScroll = localStorage.getItem('theory-sidebar-scroll');
    if (savedScroll !== null) {
      const scrollTop = parseInt(savedScroll, 10);
      sidebar.scrollTop = scrollTop;
    }
  }, 50); // Small delay to ensure content is rendered
}

function updateTabButtonStates() {
  const isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;
  const isSidebarActive = document.body.classList.contains('theory-sidebar-active');
  
  TAB_NAMES.forEach(tab => {
    if (tab === 'theory') {
      // Theory tab is active if sidebar is open (on large screens) or if it's the current tab (on small screens)
      const isActive = isLargeScreen 
        ? isSidebarActive
        : appState.exercise.currentTab === 'theory';
      updateTabButtonState(tab, isActive);
      
      // Theory panel visibility: on large screens handled by sidebar CSS, on small screens show as normal tab
      if (!isLargeScreen) {
        updateTabPanelVisibility(tab, appState.exercise.currentTab === 'theory');
      }
    } else {
      updateTabButtonState(tab, tab === appState.exercise.currentTab);
      updateTabPanelVisibility(tab, tab === appState.exercise.currentTab);
    }
  });
}

export function switchToTab(tabName) {
  stopAllPlayback();
  
  // Handle sidebar layout for theory tab on large screens
  const isLargeScreen = window.matchMedia('(min-width: 1024px)').matches;
  const isSidebarActive = document.body.classList.contains('theory-sidebar-active');
  
  // Theory tab works as a toggle for the sidebar on large screens
  if (tabName === 'theory' && isLargeScreen) {
    if (isSidebarActive) {
      // Close sidebar - save scroll position first, then switch back to previous tab or default
      saveSidebarScrollPosition();
      document.body.classList.remove('theory-sidebar-active');
      const previousTab = appState.exercise.previousTab || 'warmup';
      appState.exercise.currentTab = previousTab;
      moveTheoryToMainContent();
      // Continue with normal tab switching for the previous tab
      tabName = previousTab;
    } else {
      // Open sidebar - keep current tab active in main area
      document.body.classList.add('theory-sidebar-active');
      appState.exercise.previousTab = appState.exercise.currentTab;
      // Don't change currentTab - keep the active tab in main area
      setTimeout(() => {
        renderTheoryContent();
        moveTheoryToSidebar();
        updateSidebarWidth(); // Ensure width is set
        window.dispatchEvent(new Event('resize'));
      }, 10);
      // Set data attribute and update UI, then return early
      document.body.setAttribute('data-active-tab', appState.exercise.currentTab);
      updateTabButtonStates();
      updateHeaderRevealButtons(appState.exercise.currentTab);
      return;
    }
  } else {
    // Normal tab switching - update current tab
    if (tabName !== 'theory' || !isLargeScreen) {
      // Store previous tab before switching (only if sidebar is not open)
      // If sidebar is open, we want to keep the previousTab as it was when sidebar opened
      if (!isSidebarActive || !isLargeScreen) {
        appState.exercise.previousTab = appState.exercise.currentTab;
      }
      appState.exercise.currentTab = tabName;
    }
    // On small screens, theory tab works normally
    if (tabName === 'theory' && !isLargeScreen) {
      setTimeout(() => {
        renderTheoryContent();
        moveTheoryToMainContent();
      }, 10);
    }
  }
  
  // Set data attribute on body for CSS targeting
  document.body.setAttribute('data-active-tab', appState.exercise.currentTab);

  // Always clear one-shot exercise display when changing tabs
  appState.exercise.display.midis = [];
  appState.exercise.display.label = '';
  appState.exercise.showAnswers.intervals = false;
  appState.exercise.showAnswers.cluster = false;
  
  // Clear SATB-specific key signature info when switching away from SATB
  if (tabName !== 'satb') {
    appState.staff.keyTonic = undefined;
    appState.staff.keyMode = undefined;
    appState.staff.notes = [];
    appState.staff.satbPreviewMode = false;
  }

  // Re-render staff to clear previous tab context immediately
  renderStaff();
  
  updateTabButtonStates();
  
  syncTabSelectValue(appState.exercise.currentTab);
  
  // Show/hide reveal buttons in header based on active tab
  updateHeaderRevealButtons(appState.exercise.currentTab);
  
  // If switching to SATB tab, ensure the current exercise is displayed
  if (appState.exercise.currentTab === 'satb') {
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

  // Handle theory content rendering (reuse isLargeScreen from above)
  if (isLargeScreen && document.body.classList.contains('theory-sidebar-active')) {
    // Sidebar is open - render theory content in sidebar
    setTimeout(() => {
      renderTheoryContent();
      moveTheoryToSidebar();
      // Trigger resize to ensure canvas adjusts to new layout
      window.dispatchEvent(new Event('resize'));
    }, 10);
  } else if (appState.exercise.currentTab === 'theory') {
    // Theory tab is active on small screens - render in main content
    setTimeout(() => {
      renderTheoryContent();
      moveTheoryToMainContent();
    }, 10);
  }
}

function moveTheoryToSidebar() {
  const isLargeScreenCheck = window.matchMedia('(min-width: 1024px)').matches;
  const theoryPanel = getElementById('panel-theory');
  const sidebar = document.getElementById('theory-sidebar');
  
  if (isLargeScreenCheck && theoryPanel && sidebar && document.body.classList.contains('theory-sidebar-active')) {
    // Move theory panel to sidebar
    if (theoryPanel.parentElement !== sidebar) {
      sidebar.innerHTML = '';
      sidebar.appendChild(theoryPanel);
    }
    
    // Restore scroll position after content is moved
    restoreSidebarScrollPosition();
  }
}

function moveTheoryToMainContent() {
  const theoryPanel = getElementById('panel-theory');
  const mainContent = document.querySelector('.main-content-left main');
  
  if (theoryPanel && mainContent && theoryPanel.parentElement !== mainContent) {
    // Move theory panel back to main content
    // Find where it should go (after other panels)
    const lastPanel = mainContent.querySelector('.panel:last-of-type:not(#panel-theory)');
    if (lastPanel && lastPanel.nextSibling) {
      mainContent.insertBefore(theoryPanel, lastPanel.nextSibling);
    } else {
      mainContent.appendChild(theoryPanel);
    }
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

function updateHeaderRevealButtons(tabName) {
  const revealButtonsBlock = getElementById('revealButtonsBlock');
  const revealHiddenHeader = getElementById('revealHiddenHeader');
  const showIntervalHeader = getElementById('showIntervalHeader');
  
  if (!revealButtonsBlock || !revealHiddenHeader || !showIntervalHeader) return;
  
  // Check if we're in mobile mode with header collapsed
  const isMobileCollapsed = window.matchMedia('(max-width: 480px)').matches && 
                            document.body.classList.contains('mobile-header-hidden');
  
  if (tabName === 'cluster') {
    revealButtonsBlock.style.display = 'flex';
    revealHiddenHeader.style.display = 'inline-flex';
    revealHiddenHeader.style.visibility = 'visible';
    showIntervalHeader.style.display = 'none';
  } else if (tabName === 'intervals') {
    revealButtonsBlock.style.display = 'flex';
    revealHiddenHeader.style.display = 'none';
    showIntervalHeader.style.display = 'inline-flex';
    showIntervalHeader.style.visibility = 'visible';
  } else {
    revealButtonsBlock.style.display = 'none';
    revealHiddenHeader.style.display = 'none';
    showIntervalHeader.style.display = 'none';
  }
}

export function showTabPanel(tabName) {
  updateTabPanelVisibility(tabName, true);
}

export function hideTabPanel(tabName) {
  updateTabPanelVisibility(tabName, false);
}

