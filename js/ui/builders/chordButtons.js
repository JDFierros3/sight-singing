/**
 * Chord button building utilities for Chord Quality tab
 * Selectable buttons that act like radio buttons
 */

import { getElementById, clearElement } from '../../utils/dom.js';
import { getRomanNumeral } from '../../utils/musicTheory.js';
import { appState } from '../../state/appState.js';
import { SOLFEGE, DEGREE_SEMITONES, CHORDS } from '../../config/constants.js';

/**
 * Build horizontal button group for chord roots (Do, Re, Mi, Fa, Sol, La, Ti)
 * Buttons act like radio buttons - only one selected at a time
 */
export function buildChordRootButtons() {
  const container = getElementById('chordRootButtonGroup');
  if (!container) return;
  
  clearElement(container);
  
  DEGREE_SEMITONES.forEach((semi, index) => {
    const roman = getRomanNumeral(semi);
    const solfege = SOLFEGE[index];
    const label = `${solfege} (${roman})`;
    
    const button = document.createElement('button');
    button.className = 'difficulty-btn';
    button.textContent = label;
    button.setAttribute('data-chord-root', semi.toString());
    button.setAttribute('aria-label', `Select ${label} as chord root`);
    
    // Add primary class if this is the selected root
    if (semi === appState.drone.rootSemi) {
      button.classList.add('primary');
    }
    
    container.appendChild(button);
  });
}

/**
 * Build horizontal button group for chord qualities (Major, Minor, etc.)
 * Buttons act like radio buttons - only one selected at a time
 */
export function buildChordQualityButtons() {
  const container = getElementById('chordQualityButtonGroup');
  if (!container) return;
  
  clearElement(container);
  
  Object.keys(CHORDS).forEach(chordName => {
    const button = document.createElement('button');
    button.className = 'difficulty-btn';
    button.textContent = chordName;
    button.setAttribute('data-chord-quality', chordName);
    button.setAttribute('aria-label', `Select ${chordName} chord quality`);
    
    // Add primary class if this is the selected quality
    if (chordName === appState.drone.chord) {
      button.classList.add('primary');
    }
    
    container.appendChild(button);
  });
}

/**
 * Build horizontal button group for chord inversions (Root, 1st, 2nd)
 * Only show if chord has 3+ tones (triads and 7th chords can have inversions)
 */
export function buildChordInversionButtons() {
  const container = getElementById('chordInversionButtonGroup');
  if (!container) return;
  
  clearElement(container);
  
  const chordSemis = appState.drone.semis || [];
  
  // Only show inversion buttons if chord has 3+ tones
  if (chordSemis.length < 3) {
    return;
  }
  
  const inversions = [
    { value: 0, label: 'Root' },
    { value: 1, label: '1st' },
    { value: 2, label: '2nd' }
  ];
  
  // For 7th chords, we could add 3rd inversion, but for now stick with 3 options
  inversions.forEach(inv => {
    const button = document.createElement('button');
    button.className = 'difficulty-btn';
    button.textContent = inv.label;
    button.setAttribute('data-chord-inversion', inv.value.toString());
    button.setAttribute('aria-label', `Select ${inv.label} inversion`);
    
    // Add primary class if this is the selected inversion
    if (inv.value === appState.drone.inversion) {
      button.classList.add('primary');
    }
    
    container.appendChild(button);
  });
}

