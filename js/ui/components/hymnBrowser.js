/**
 * Hymn Browser Component
 * Searchable modal interface for browsing and selecting hymns from the MIDI library
 * Features: Fixed-size modal, paginated list, button-style entries, responsive layout
 */

import { getElementById, createElement, setTextContent } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { getAllSATBExercises } from '../../exercises/satb.js';
import { displaySATBExerciseOnStaff } from '../../exercises/satb.js';

let modal = null;
let searchInput = null;
let resultsContainer = null;
let azButtonContainer = null;
let paginationContainer = null;
let resultsCount = null;
let selectedIndex = -1;
let filteredExercises = [];
let keyboardNavigationEnabled = false;
let selectedLetter = null;
let searchQuery = '';

// Pagination state
const ITEMS_PER_PAGE_DESKTOP = 25;
const ITEMS_PER_PAGE_MOBILE = 20;
let currentPage = 1;
let itemsPerPage = ITEMS_PER_PAGE_DESKTOP;

/**
 * Format key for display
 */
function formatKey(keyMidi, mode) {
  if (!Number.isFinite(keyMidi)) return '—';
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const modeLabel = mode === 'minor' ? 'min' : 'maj';
  return `${names[keyMidi]} ${modeLabel}`;
}

/**
 * Create hymn button element (styled like key dialog, inline styles)
 */
function createHymnButton(exercise, index) {
  const button = document.createElement('button');
  button.setAttribute('data-index', index.toString());
  button.setAttribute('aria-label', `Select ${exercise.label}`);
  button.style.cssText = `
    appearance: none;
    background: transparent;
    border: none;
    border-bottom: 1px solid #262b44;
    color: #b7c0ce;
    padding: 14px 20px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    width: 100%;
    min-height: 52px;
    font-size: 14px;
    font-family: inherit;
    margin: 0;
  `;
  
  // Hover state
  button.addEventListener('mouseenter', () => {
    if (!button.classList.contains('selected')) {
      button.style.background = 'rgba(125, 211, 252, 0.08)';
    }
  });
  button.addEventListener('mouseleave', () => {
    if (!button.classList.contains('selected')) {
      button.style.background = 'transparent';
    }
  });
  
  const label = document.createElement('span');
  label.textContent = exercise.label;
  label.style.cssText = `
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 16px;
    font-weight: 400;
    line-height: 1.5;
  `;
  
  const key = document.createElement('span');
  const keyText = formatKey(exercise.midiKeyMidi, exercise.midiKeyMode || 'major');
  key.textContent = keyText;
  key.style.cssText = `
    color: #7a8499;
    font-size: 13px;
    font-weight: 400;
    flex-shrink: 0;
  `;
  
  button.appendChild(label);
  button.appendChild(key);
  
  // Click handler
  button.addEventListener('click', () => {
    selectExercise(exercise, index);
  });
  
  return button;
}

/**
 * Filter exercises based on search query and selected letter
 */
function filterExercises(query, letter) {
  const exercises = getAllSATBExercises();
  const lowerQuery = query.toLowerCase().trim();
  
  let filtered = exercises;
  
  // Apply letter filter first
  if (letter) {
    filtered = filtered.filter(exercise => {
      const hymnName = (exercise.hymnName || '').trim();
      const tuneName = (exercise.tuneName || '').trim();
      
      // Check if hymn name starts with the letter
      if (hymnName.length > 0) {
        const firstChar = hymnName.charAt(0).toUpperCase();
        if (firstChar === letter) {
          return true;
        }
      }
      
      // If hymn name doesn't match, check tune name
      if (tuneName.length > 0) {
        const firstChar = tuneName.charAt(0).toUpperCase();
        if (firstChar === letter) {
          return true;
        }
      }
      
      return false;
    });
  }
  
  // Apply search query filter
  if (lowerQuery) {
    filtered = filtered.filter(exercise => {
      const label = (exercise.label || '').toLowerCase();
      const hymnName = (exercise.hymnName || '').toLowerCase();
      const tuneName = (exercise.tuneName || '').toLowerCase();
      
      return label.includes(lowerQuery) || 
             hymnName.includes(lowerQuery) || 
             tuneName.includes(lowerQuery);
    });
  }
  
  return filtered;
}

/**
 * Update filters and re-render exercises
 */
function updateFilters() {
  filteredExercises = filterExercises(searchQuery, selectedLetter);
  currentPage = 1; // Reset to first page when filters change
  renderExercises();
  updatePagination();
}

/**
 * Get current page items
 */
function getCurrentPageItems() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return filteredExercises.slice(startIndex, endIndex);
}

/**
 * Get total pages
 */
function getTotalPages() {
  if (filteredExercises.length === 0) return 1;
  return Math.ceil(filteredExercises.length / itemsPerPage);
}

/**
 * Update pagination UI
 */
function updatePagination() {
  if (!paginationContainer) return;
  
  const totalPages = getTotalPages();
  const totalItems = filteredExercises.length;
  
  // Update results count
  if (resultsCount) {
    if (totalItems === 0) {
      setTextContent(resultsCount, 'No hymns found');
    } else {
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = Math.min(currentPage * itemsPerPage, totalItems);
      setTextContent(resultsCount, `Showing ${start}-${end} of ${totalItems}`);
    }
  }
  
  // Clear pagination buttons
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) {
    // No pagination needed
    return;
  }
  
  // Previous button (dark theme)
  const prevButton = document.createElement('button');
  prevButton.setAttribute('aria-label', 'Previous page');
  prevButton.textContent = '← Prev';
  prevButton.disabled = currentPage === 1;
  prevButton.style.cssText = `
    padding: 6px 12px;
    border: 1px solid #2a3051;
    background: ${currentPage === 1 ? '#1a1f35' : '#22283a'};
    color: ${currentPage === 1 ? '#4a5568' : '#b7c0ce'};
    border-radius: 6px;
    cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'};
    font-size: 14px;
  `;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderExercises();
      updatePagination();
    }
  });
  paginationContainer.appendChild(prevButton);
  
  // Page numbers (desktop only, or show limited on mobile)
  const isMobile = window.innerWidth <= 640;
  if (!isMobile || totalPages <= 7) {
    // Show all page numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');
      pageButton.setAttribute('aria-label', `Go to page ${i}`);
      pageButton.textContent = i.toString();
      const isActive = i === currentPage;
      pageButton.style.cssText = `
        padding: 6px 10px;
        border: 1px solid ${isActive ? '#7db3fc' : '#2a3051'};
        background: ${isActive ? '#7db3fc' : '#22283a'};
        color: ${isActive ? '#0f1426' : '#b7c0ce'};
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        min-width: 32px;
        text-align: center;
      `;
      pageButton.addEventListener('click', () => {
        currentPage = i;
        renderExercises();
        updatePagination();
      });
      paginationContainer.appendChild(pageButton);
    }
  } else {
    // Mobile: show current page and ellipsis
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    pageInfo.style.cssText = 'color: #7a8499; font-size: 14px; padding: 6px 12px;';
    paginationContainer.appendChild(pageInfo);
  }
  
  // Next button (dark theme)
  const nextButton = document.createElement('button');
  nextButton.setAttribute('aria-label', 'Next page');
  nextButton.textContent = 'Next →';
  nextButton.disabled = currentPage === totalPages;
  nextButton.style.cssText = `
    padding: 6px 12px;
    border: 1px solid #2a3051;
    background: ${currentPage === totalPages ? '#1a1f35' : '#22283a'};
    color: ${currentPage === totalPages ? '#4a5568' : '#b7c0ce'};
    border-radius: 6px;
    cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'};
    font-size: 14px;
  `;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderExercises();
      updatePagination();
    }
  });
  paginationContainer.appendChild(nextButton);
}

/**
 * Render filtered exercises (paginated)
 */
function renderExercises() {
  if (!resultsContainer) return;
  
  // Clear existing
  resultsContainer.innerHTML = '';
  selectedIndex = -1;
  
  const pageItems = getCurrentPageItems();
  
  if (pageItems.length === 0) {
    const noResults = document.createElement('div');
    noResults.textContent = 'No hymns found';
    noResults.style.cssText = 'text-align: center; padding: 40px 20px; color: #7a8499; font-size: 14px;';
    resultsContainer.appendChild(noResults);
    return;
  }
  
  // Create buttons for current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  pageItems.forEach((exercise, pageIndex) => {
    const globalIndex = startIndex + pageIndex;
    const button = createHymnButton(exercise, globalIndex);
    resultsContainer.appendChild(button);
  });
  
  // Focus first button for keyboard navigation
  const firstButton = resultsContainer.querySelector('button[data-index]');
  if (firstButton) {
    selectedIndex = 0;
    updateSelection();
  }
  
  // Scroll to top of results
  resultsContainer.scrollTop = 0;
}

/**
 * Update visual selection (with inline styles)
 */
function updateSelection() {
  const buttons = resultsContainer.querySelectorAll('button[data-index]');
  buttons.forEach((button, index) => {
    if (index === selectedIndex) {
      button.classList.add('selected');
      button.style.background = 'rgba(125, 211, 252, 0.15)';
      button.focus();
    } else {
      button.classList.remove('selected');
      button.style.background = 'transparent';
    }
  });
  
  // Scroll selected button into view
  if (selectedIndex >= 0 && buttons[selectedIndex]) {
    buttons[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(e) {
  if (!keyboardNavigationEnabled || !modal) {
    return;
  }
  
  // Check if modal is actually visible
  const computedStyle = window.getComputedStyle(modal);
  if (computedStyle.display === 'none') {
    return;
  }
  
  const buttons = resultsContainer.querySelectorAll('button[data-index]');
  if (buttons.length === 0) return;
  
  // Don't intercept if user is typing in search input
  if (document.activeElement === searchInput) {
    // Only handle Escape when typing
    if (e.key === 'Escape') {
      e.preventDefault();
      closeHymnBrowser();
    }
    return;
  }
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, buttons.length - 1);
      updateSelection();
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
      break;
      
    case 'Enter':
      if (selectedIndex >= 0) {
        const pageItems = getCurrentPageItems();
        if (selectedIndex < pageItems.length) {
          e.preventDefault();
          const globalIndex = (currentPage - 1) * itemsPerPage + selectedIndex;
          selectExercise(filteredExercises[globalIndex], globalIndex);
        }
      }
      break;
      
    case 'Escape':
      e.preventDefault();
      closeHymnBrowser();
      break;
  }
}

/**
 * Select an exercise and close browser
 */
function selectExercise(exercise, index) {
  if (!exercise) return;
  
  // Store selected exercise
  appState.satb.selectedExerciseIndex = index;
  appState.satb.currentExercise = exercise;
  
  // Display on staff
  displaySATBExerciseOnStaff(exercise);
  
  // Update current hymn display
  updateCurrentHymnDisplay();
  
  // Close browser
  closeHymnBrowser();
}

/**
 * Handle letter button click
 */
function handleLetterClick(letter) {
  // Toggle: if same letter clicked, deselect
  if (selectedLetter === letter) {
    selectedLetter = null;
  } else {
    selectedLetter = letter;
  }
  
  // Update button states
  updateAzButtonStates();
  
  // Update filters and re-render
  updateFilters();
}

/**
 * Create A-Z buttons in container (with inline styles, responsive)
 */
function createAzButtons(container, isMobile = false) {
  // Create "All" button
  const allButton = document.createElement('button');
  allButton.setAttribute('data-letter', '');
  allButton.setAttribute('aria-label', 'Show all hymns');
  allButton.textContent = 'All';
  allButton.style.cssText = `
    padding: ${isMobile ? '5px 8px' : '4px 8px'};
    border: 1px solid #2a3051;
    background: #22283a;
    color: #b7c0ce;
    border-radius: 4px;
    cursor: pointer;
    font-size: ${isMobile ? '11px' : '12px'};
    min-width: ${isMobile ? '24px' : '28px'};
    flex-shrink: 0;
    transition: all 0.2s;
  `;
  allButton.addEventListener('mouseenter', () => {
    if (!allButton.classList.contains('active')) {
      allButton.style.background = '#2a3051';
    }
  });
  allButton.addEventListener('mouseleave', () => {
    if (!allButton.classList.contains('active')) {
      allButton.style.background = '#22283a';
    }
  });
  allButton.addEventListener('click', () => {
    selectedLetter = null;
    updateAzButtonStates();
    updateFilters();
  });
  container.appendChild(allButton);
  
  // Create A-Z buttons
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i); // A-Z
    const button = document.createElement('button');
    button.setAttribute('data-letter', letter);
    button.setAttribute('aria-label', `Filter by ${letter}`);
    button.textContent = letter;
    button.style.cssText = `
      padding: ${isMobile ? '5px 8px' : '4px 8px'};
      border: 1px solid #2a3051;
      background: #22283a;
      color: #b7c0ce;
      border-radius: 4px;
      cursor: pointer;
      font-size: ${isMobile ? '11px' : '12px'};
      min-width: ${isMobile ? '24px' : '28px'};
      flex-shrink: 0;
      transition: all 0.2s;
    `;
    
    // Hover state
    button.addEventListener('mouseenter', () => {
      if (!button.classList.contains('active')) {
        button.style.background = '#2a3051';
      }
    });
    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('active')) {
        button.style.background = '#22283a';
      }
    });
    
    button.addEventListener('click', () => handleLetterClick(letter));
    container.appendChild(button);
  }
}

/**
 * Update A-Z button active states (with inline styles)
 */
function updateAzButtonStates() {
  if (!azButtonContainer) return;
  
  const buttons = azButtonContainer.querySelectorAll('button[data-letter]');
  buttons.forEach(button => {
    const letter = button.getAttribute('data-letter');
    const isActive = (letter === '' && selectedLetter === null) || (letter === selectedLetter);
    
    if (isActive) {
      button.classList.add('active');
      button.style.background = '#7db3fc';
      button.style.color = '#0f1426';
      button.style.borderColor = '#7db3fc';
    } else {
      button.classList.remove('active');
      button.style.background = '#22283a';
      button.style.color = '#b7c0ce';
      button.style.borderColor = '#2a3051';
    }
  });
}

/**
 * Update items per page based on screen size
 */
function updateItemsPerPage() {
  const isMobile = window.innerWidth <= 640;
  itemsPerPage = isMobile ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;
  // Recalculate current page to stay on same items if possible
  const firstItemIndex = (currentPage - 1) * itemsPerPage;
  currentPage = Math.floor(firstItemIndex / itemsPerPage) + 1;
  if (currentPage < 1) currentPage = 1;
  const totalPages = getTotalPages();
  if (currentPage > totalPages) currentPage = totalPages;
}

/**
 * Update current hymn display on SATB tab
 */
function updateCurrentHymnDisplay() {
  const displayElement = getElementById('satbCurrentHymn');
  if (!displayElement) return;
  
  const exercise = appState.satb.currentExercise;
  if (exercise && exercise.label) {
    setTextContent(displayElement, exercise.label);
    displayElement.classList.remove('no-hymn');
  } else {
    setTextContent(displayElement, 'No hymn selected');
    displayElement.classList.add('no-hymn');
  }
}

/**
 * Open hymn browser modal
 */
export function openHymnBrowser() {
  if (!modal) {
    buildHymnBrowserModal();
  }
  
  if (!modal) {
    console.error('Failed to create hymn browser modal');
    return;
  }
  
  // Update items per page based on screen size
  updateItemsPerPage();
  
  // Reset filters
  selectedLetter = null;
  searchQuery = '';
  currentPage = 1;
  if (searchInput) {
    searchInput.value = '';
  }
  updateAzButtonStates();
  
  // Get all exercises
  filteredExercises = getAllSATBExercises();
  
  // Show modal
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  keyboardNavigationEnabled = true;
  
  // Render exercises
  renderExercises();
  updatePagination();
  
  // Focus search input
  if (searchInput) {
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  }
  
  // Add keyboard listener
  document.addEventListener('keydown', handleKeyboardNavigation);
  
  // Add window resize listener for responsive pagination
  window.addEventListener('resize', handleWindowResize);
}

/**
 * Handle window resize for responsive behavior
 */
function handleWindowResize() {
  if (!modal || modal.style.display === 'none') return;
  
  const oldItemsPerPage = itemsPerPage;
  updateItemsPerPage();
  
  if (oldItemsPerPage !== itemsPerPage) {
    renderExercises();
    updatePagination();
  }
}

/**
 * Close hymn browser modal
 */
export function closeHymnBrowser() {
  if (!modal) {
    return;
  }
  
  modal.style.display = 'none';
  keyboardNavigationEnabled = false;
  selectedIndex = -1;
  selectedLetter = null;
  searchQuery = '';
  currentPage = 1;
  
  // Remove keyboard listener
  document.removeEventListener('keydown', handleKeyboardNavigation);
  window.removeEventListener('resize', handleWindowResize);
}

/**
 * Build hymn browser modal structure (styled like key dialog)
 */
function buildHymnBrowserModal() {
  // Check if modal already exists
  let existingModal = getElementById('hymnBrowserModal');
  if (existingModal) {
    modal = existingModal;
    searchInput = getElementById('hymnBrowserSearch');
    resultsContainer = getElementById('hymnBrowserResults');
    azButtonContainer = existingModal.querySelector('[class="hymn-browser-az-container"]') || existingModal.querySelector('div[style*="gap: 6px"]');
    const footer = existingModal.querySelector('div[style*="border-top"]');
    if (footer) {
      paginationContainer = footer.querySelector('div[style*="gap: 8px"]');
      resultsCount = footer.querySelector('div:first-child');
    }
    return;
  }
  
  // Create modal overlay (matching key dialog style)
  modal = document.createElement('div');
  modal.id = 'hymnBrowserModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  // Create dialog (dark theme, fixed size, responsive)
  const isMobile = window.innerWidth <= 640;
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1a1f35;
    padding: ${isMobile ? '16px' : '20px'};
    border-radius: 8px;
    border: 1px solid #262b44;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 900px;
    width: ${isMobile ? '100%' : '90%'};
    height: ${isMobile ? '90vh' : '85vh'};
    max-height: ${isMobile ? '90vh' : '85vh'};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin: ${isMobile ? '0' : 'auto'};
  `;
  
  // Create title
  const title = document.createElement('h3');
  title.style.cssText = 'margin-top: 0; color: #b7c0ce; font-size: 1.2rem;';
  setTextContent(title, 'Browse Hymns');
  
  // Create search input
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = 'margin: 10px 0;';
  
  searchInput = document.createElement('input');
  searchInput.id = 'hymnBrowserSearch';
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by hymn name or tune name...';
  searchInput.setAttribute('aria-label', 'Search hymns');
  searchInput.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #2a3051;
    border-radius: 6px;
    background: #0f1426;
    color: #b7c0ce;
    font-size: 14px;
    box-sizing: border-box;
  `;
  
  // Search handler
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    updateFilters();
  });
  
  searchContainer.appendChild(searchInput);
  
  // Create A-Z button container (single row on desktop, wraps on mobile, centered)
  azButtonContainer = document.createElement('div');
  azButtonContainer.className = 'hymn-browser-az-container';
  azButtonContainer.style.cssText = `
    display: flex;
    flex-wrap: ${isMobile ? 'wrap' : 'nowrap'};
    gap: ${isMobile ? '3px' : '4px'};
    margin: 10px 0;
    overflow-x: ${isMobile ? 'visible' : 'auto'};
    justify-content: center;
  `;
  createAzButtons(azButtonContainer, isMobile);
  
  // Create results container (scrollable, fixed height)
  resultsContainer = document.createElement('div');
  resultsContainer.id = 'hymnBrowserResults';
  resultsContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    margin: 10px 0;
    border: 1px solid #2a3051;
    border-radius: 6px;
    background: #0f1426;
  `;
  
  // Create footer with pagination
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #262b44;
    flex-shrink: 0;
  `;
  
  resultsCount = document.createElement('div');
  resultsCount.style.cssText = 'color: #7a8499; font-size: 14px;';
  setTextContent(resultsCount, '');
  
  paginationContainer = document.createElement('div');
  paginationContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  footer.appendChild(resultsCount);
  footer.appendChild(paginationContainer);
  
  // Close button
  const closeButton = document.createElement('button');
  closeButton.setAttribute('aria-label', 'Close hymn browser');
  closeButton.textContent = 'Cancel';
  closeButton.style.cssText = `
    margin-top: 20px;
    padding: 8px 16px;
    background: #2a3051;
    border: 1px solid #39406a;
    border-radius: 6px;
    cursor: pointer;
    color: #b7c0ce;
    align-self: flex-end;
    flex-shrink: 0;
  `;
  closeButton.addEventListener('click', closeHymnBrowser);
  
  // Assemble dialog
  dialog.appendChild(title);
  dialog.appendChild(searchContainer);
  dialog.appendChild(azButtonContainer);
  dialog.appendChild(resultsContainer);
  dialog.appendChild(footer);
  dialog.appendChild(closeButton);
  modal.appendChild(dialog);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeHymnBrowser();
    }
  });
  
  // Append to body
  document.body.appendChild(modal);
}

/**
 * Initialize hymn browser (called on app startup)
 */
export function initializeHymnBrowser() {
  // Modal will be built on first open
  // Just ensure it doesn't exist yet
  const existing = getElementById('hymnBrowserModal');
  if (existing) {
    existing.remove();
  }
  
  // Initialize current hymn display
  updateCurrentHymnDisplay();
}

// Export update function for use in satb.js
export { updateCurrentHymnDisplay };
