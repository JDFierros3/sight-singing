/**
 * Radio button building utilities for Chord Quality tab
 */

import { getElementById, clearElement } from '../../utils/dom.js';
import { getRomanNumeral } from '../../utils/musicTheory.js';
import { appState } from '../../state/appState.js';
import { SOLFEGE, DEGREE_SEMITONES, CHORDS } from '../../config/constants.js';

/**
 * Build horizontal radio button group for chord roots (Do, Re, Mi, Fa, Sol, La, Ti)
 */
export function buildChordRootRadioButtons() {
  const container = getElementById('chordRootRadioGroup');
  if (!container) return;
  
  clearElement(container);
  
  DEGREE_SEMITONES.forEach((semi, index) => {
    const roman = getRomanNumeral(semi);
    const solfege = SOLFEGE[index];
    const label = `${solfege} (${roman})`;
    
    const radioWrapper = document.createElement('label');
    radioWrapper.className = 'radio-option';
    radioWrapper.style.display = 'inline-flex';
    radioWrapper.style.alignItems = 'center';
    radioWrapper.style.marginRight = '12px';
    radioWrapper.style.cursor = 'pointer';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'chordRoot';
    radio.value = semi.toString();
    radio.checked = semi === appState.drone.rootSemi;
    radio.setAttribute('aria-label', `Select ${label} as chord root`);
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelText.style.marginLeft = '6px';
    
    radioWrapper.appendChild(radio);
    radioWrapper.appendChild(labelText);
    container.appendChild(radioWrapper);
  });
}

/**
 * Build horizontal radio button group for chord qualities (Major, Minor, etc.)
 */
export function buildChordQualityRadioButtons() {
  const container = getElementById('chordQualityRadioGroup');
  if (!container) return;
  
  clearElement(container);
  
  Object.keys(CHORDS).forEach(chordName => {
    const radioWrapper = document.createElement('label');
    radioWrapper.className = 'radio-option';
    radioWrapper.style.display = 'inline-flex';
    radioWrapper.style.alignItems = 'center';
    radioWrapper.style.marginRight = '12px';
    radioWrapper.style.cursor = 'pointer';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'chordQuality';
    radio.value = chordName;
    radio.checked = chordName === appState.drone.chord;
    radio.setAttribute('aria-label', `Select ${chordName} chord quality`);
    
    const labelText = document.createElement('span');
    labelText.textContent = chordName;
    labelText.style.marginLeft = '6px';
    
    radioWrapper.appendChild(radio);
    radioWrapper.appendChild(labelText);
    container.appendChild(radioWrapper);
  });
}

