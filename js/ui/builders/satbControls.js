/**
 * Build SATB practice controls
 */

import { getElementById, createElement, setTextContent } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';

/**
 * Build part selection buttons (S, A, T, B)
 */
export function buildPartSelectionButtons() {
  const container = getElementById('satbPartSelection');
  if (!container) {
    return;
  }
  
  // Clear existing buttons
  container.innerHTML = '';
  
  const parts = [
    { id: 'S', label: 'Soprano', symbol: 'S' },
    { id: 'A', label: 'Alto', symbol: 'A' },
    { id: 'T', label: 'Tenor', symbol: 'T' },
    { id: 'B', label: 'Bass', symbol: 'B' }
  ];
  
  parts.forEach(part => {
    const button = createElement('button', {
      id: `satbPart-${part.id}`,
      class: 'part-btn',
      'aria-label': `Aim for ${part.label}`,
      'data-part': part.id
    });
    setTextContent(button, part.symbol);
    
    // Set initial state
    if (appState.satb.aimPart === part.id) {
      button.classList.add('active');
    }
    
    container.appendChild(button);
  });
}

/**
 * Build volume controls for each part
 */
export function buildPartVolumeControls() {
  const container = getElementById('satbVolumeControls');
  if (!container) {
    return;
  }
  
  // Clear existing controls
  container.innerHTML = '';
  
  const parts = [
    { id: 'S', label: 'Soprano' },
    { id: 'A', label: 'Alto' },
    { id: 'T', label: 'Tenor' },
    { id: 'B', label: 'Bass' }
  ];
  
  parts.forEach(part => {
    const volume = appState.satb.partVolumes[part.id] || 0.7;
    const volumePercent = Math.round(volume * 100);
    
    const controlDiv = createElement('div', {
      class: 'flex',
      style: 'align-items:center; gap:8px; margin-bottom:4px'
    });
    
    const label = createElement('label', {
      'for': `satbVolume-${part.id}`,
      style: 'min-width:60px'
    });
    setTextContent(label, `${part.label}:`);
    
    const slider = createElement('input', {
      type: 'range',
      id: `satbVolume-${part.id}`,
      min: '0',
      max: '100',
      value: volumePercent.toString(),
      'aria-label': `${part.label} volume`,
      'data-part': part.id
    });
    
    const valueSpan = createElement('span', {
      style: 'min-width:40px; text-align:right'
    });
    setTextContent(valueSpan, `${volumePercent}%`);
    
    // Update value display when slider changes
    slider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      setTextContent(valueSpan, `${value}%`);
      // Update appState
      appState.satb.partVolumes[part.id] = value / 100;
    });
    
    controlDiv.appendChild(label);
    controlDiv.appendChild(slider);
    controlDiv.appendChild(valueSpan);
    container.appendChild(controlDiv);
  });
}

/**
 * Build exercise selection dropdown
 */
export function buildExerciseSelection(exercises) {
  const select = getElementById('satbExercise');
  if (!select) {
    return;
  }
  
  // Clear existing options
  select.innerHTML = '';
  
  exercises.forEach((exercise, index) => {
    const option = createElement('option', {
      value: index.toString()
    });
    setTextContent(option, exercise.label);
    select.appendChild(option);
  });
  
  // Set default selection
  if (exercises.length > 0) {
    select.value = '0';
  }
}

/**
 * Update part selection button states
 */
export function updatePartSelection(selectedPart) {
  const parts = ['S', 'A', 'T', 'B'];
  parts.forEach(part => {
    const button = getElementById(`satbPart-${part}`);
    if (button) {
      if (part === selectedPart) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  });
}

