/**
 * Button building utilities broken into small, descriptive functions
 */

import { getElementById, clearElement } from '../../utils/dom.js';


export function updateButtonActiveState(button, isActive) {
  if (isActive) {
    button.classList.add('primary');
  } else {
    button.classList.remove('primary');
  }
}


