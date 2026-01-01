/**
 * Button building utilities broken into small, descriptive functions
 */

import { getElementById, clearElement } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { SOLFEGE, DEGREE_SEMITONES, CHORDS } from '../../config/constants.js';
import { beepTarget } from '../../audio/target.js';
import { updateTargetLabel } from '../components/status.js';
import { getDegreeForMidi } from '../../utils/musicTheory.js';
import { normalizeModulo } from '../../utils/math.js';
import { renderStaff } from '../../rendering/staff.js';
import { getShapeUnicodeSymbol } from '../../rendering/shapes.js';

export function buildChordQuickButtons(onChange) {
  const row = getElementById('chordQuick');
  clearElement(row);
  
  Object.keys(CHORDS).forEach(chordName => {
    const button = createChordButton(chordName, onChange);
    row.appendChild(button);
  });
}

function createChordButton(chordName, onClick) {
  const button = document.createElement('button');
  button.textContent = chordName;
  button.onclick = () => onClick(chordName);
  return button;
}

export function buildDroneDegreeButtons(onToggle) {
  const host = getElementById('droneNotes');
  clearElement(host);
  
  const activeSemis = new Set(appState.drone.semis);
  const rootSemi = appState.drone.rootSemi;
  const rootDegreeIndex = DEGREE_SEMITONES.indexOf(rootSemi);
  
  if (rootDegreeIndex === -1) {
    return;
  }
  
  appState.drone.semis.forEach((chordSemi, chordIndex) => {
    const scaleDegreeIndex = getScaleDegreeIndexForChordPosition(chordSemi, rootDegreeIndex);
    
    if (scaleDegreeIndex !== null) {
      const button = createDegreeToggleButtonForChordTone(chordSemi, scaleDegreeIndex, activeSemis.has(chordSemi), onToggle, activeSemis);
      host.appendChild(button);
    }
  });
}

function getScaleDegreeIndexForChordPosition(chordSemi, rootDegreeIndex) {
  const rootSemi = DEGREE_SEMITONES[rootDegreeIndex];
  const actualSemi = normalizeModulo(chordSemi + rootSemi, 12);
  const actualDegreeIndex = DEGREE_SEMITONES.indexOf(actualSemi);
  
  if (actualDegreeIndex >= 0) {
    return actualDegreeIndex;
  }
  
  const chordIntervalToScalePosition = getChordIntervalToScalePosition(chordSemi);
  if (chordIntervalToScalePosition !== null) {
    const scaleLength = DEGREE_SEMITONES.length;
    return (rootDegreeIndex + chordIntervalToScalePosition) % scaleLength;
  }
  
  return null;
}

function getChordIntervalToScalePosition(chordSemi) {
  const intervalMap = {
    0: 0,   // root = 1st
    2: 1,   // minor 2nd (rare)
    3: 1,   // minor 3rd = 3rd
    4: 2,   // major 3rd = 3rd
    5: 3,   // perfect 4th (rare)
    6: 3,   // tritone (rare)
    7: 4,   // perfect 5th = 5th
    8: 4,   // minor 6th (rare)
    9: 5,   // major 6th (rare)
    10: 5,  // minor 7th = 7th
    11: 6   // major 7th = 7th
  };
  
  return intervalMap[chordSemi] !== undefined ? intervalMap[chordSemi] : null;
}

function createDegreeToggleButtonForChordTone(chordSemi, scaleDegreeIndex, isActive, onToggle, activeSet) {
  const solfegeLabel = SOLFEGE[scaleDegreeIndex];
  const shapeSymbol = getShapeUnicodeSymbol(solfegeLabel);
  
  const button = document.createElement('button');
  button.innerHTML = `<span style="font-size: 1.5em; margin-right: 6px; vertical-align: middle;">${shapeSymbol}</span> ${solfegeLabel}`;
  
  button.onclick = () => {
    toggleDegreeInSet(chordSemi, activeSet);
    const sortedSemis = Array.from(activeSet).sort((a, b) => a - b);
    onToggle(sortedSemis);
  };
  
  updateButtonActiveState(button, isActive);
  
  return button;
}

function toggleDegreeInSet(degreeSemi, activeSet) {
  if (activeSet.has(degreeSemi)) {
    activeSet.delete(degreeSemi);
  } else {
    activeSet.add(degreeSemi);
  }
}

export function updateButtonActiveState(button, isActive) {
  if (isActive) {
    button.classList.add('primary');
  } else {
    button.classList.remove('primary');
  }
}

export function buildTargetButtons() {
  const row = getElementById('targetRow');
  clearElement(row);
  
  const rootSemi = appState.drone.rootSemi;
  const rootDegreeIndex = DEGREE_SEMITONES.indexOf(rootSemi);
  
  if (rootDegreeIndex === -1) {
    updateTargetLabel();
    return;
  }
  
  appState.drone.semis.forEach(chordSemi => {
    const scaleDegreeIndex = getScaleDegreeIndexForChordPosition(chordSemi, rootDegreeIndex);
    
    if (scaleDegreeIndex !== null) {
      const button = createTargetButtonForChordTone(chordSemi, scaleDegreeIndex);
      row.appendChild(button);
    }
  });
  
  updateTargetLabel();
  renderStaff(); // Re-render to update aim line visibility
}

function createTargetButtonForChordTone(chordSemi, scaleDegreeIndex) {
  const solfegeLabel = SOLFEGE[scaleDegreeIndex];
  const isSelected = chordSemi === appState.target.semi;
  const shapeSymbol = getShapeUnicodeSymbol(solfegeLabel);
  
  const button = document.createElement('button');
  button.innerHTML = `<span style="font-size: 1.5em; margin-right: 6px; vertical-align: middle;">${shapeSymbol}</span> Aim: ${solfegeLabel}`;
  
  button.onclick = () => {
    // Check if this is the currently selected target
    const currentlySelected = chordSemi === appState.target.semi;
    
    // Toggle aim line if clicking the same target, otherwise select new target and show aim line
    if (currentlySelected) {
      appState.target.showAimLine = !appState.target.showAimLine;
      updateTargetLabel();
      updateButtonAimState(button, appState.target.showAimLine);
      renderStaff(); // Re-render to show/hide aim line
    } else {
      selectTarget(chordSemi);
      appState.target.showAimLine = true;
      // Update all buttons to reflect new selection
      buildTargetButtons();
      return; // buildTargetButtons will handle rendering
    }
    
    if (appState.display.playAim) {
      beepTarget();
    }
  };
  
  if (isSelected) {
    button.classList.add('good');
    updateButtonAimState(button, appState.target.showAimLine);
  }
  
  return button;
}

function updateButtonAimState(button, isAimVisible) {
  if (isAimVisible) {
    button.classList.add('primary');
  } else {
    button.classList.remove('primary');
  }
}

function selectTarget(degreeSemi) {
  appState.target.semi = degreeSemi;
}

