/**
 * Individual drone volume control builders
 */

import { getElementById, clearElement, setTextContent } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { updateIndividualDroneGain } from '../../audio/drone.js';
import { getSolfegeInfoForMidi } from '../../utils/musicTheory.js';
import { SOLFEGE, DEGREE_SEMITONES } from '../../config/constants.js';
import { getShapeColor } from '../../rendering/shapes.js';
import { renderShapeIconInto } from '../components/shapeIcon.js';

export function buildIndividualVolumeControls(frequencies) {
  const container = getElementById('droneVolumeControls');
  const parent = getElementById('individualDroneVolumes');
  
  clearElement(container);
  
  if (!frequencies || frequencies.length === 0) {
    parent.style.display = 'none';
    return;
  }
  
  parent.style.display = 'block';
  
  // Calculate MIDI values directly from chord structure for accurate solfege
  const midiValues = appState.drone.semis.map(semi => {
    return appState.tuning.doMidi + appState.drone.rootSemi + semi;
  });
  
  frequencies.forEach((freq, index) => {
    const midi = midiValues[index];
    const control = createVolumeControlForFrequency(freq, midi, index);
    container.appendChild(control);
  });
}

function createVolumeControlForFrequency(frequency, midi, index) {
  const solfegeInfo = getSolfegeInfoForMidi(midi, appState.tuning.doMidi);
  const frequencyKey = frequency.toFixed(1);
  
  const defaultGain = appState.drone.individualGains[frequencyKey] || appState.drone.gain;
  
  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = '8px';
  
  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.justifyContent = 'space-between';
  label.style.alignItems = 'center';
  label.style.marginBottom = '4px';
  
  const labelContainer = document.createElement('span');
  labelContainer.style.display = 'flex';
  labelContainer.style.alignItems = 'center';
  labelContainer.style.gap = '6px';
  labelContainer.style.fontSize = '12px';
  
  if (solfegeInfo) {
    const shape = document.createElement('span');
    renderShapeIconInto(shape, solfegeInfo.base, { color: getShapeColor(solfegeInfo.base), sizePx: 16 });
    
    const solfegeText = document.createElement('span');
    // Solfege names like "Ri", "Fi", "Di" already indicate the accidental
    // No need to add another symbol
    solfegeText.textContent = solfegeInfo.solfege;
    
    labelContainer.appendChild(shape);
    labelContainer.appendChild(solfegeText);
  } else {
    labelContainer.textContent = `${frequency.toFixed(1)} Hz`;
  }
  
  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = (defaultGain * 100).toFixed(0) + '%';
  valueDisplay.style.fontSize = '11px';
  valueDisplay.style.color = 'var(--muted)';
  valueDisplay.id = `droneVolValue-${index}`;
  
  label.appendChild(labelContainer);
  label.appendChild(valueDisplay);
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.01';
  slider.value = defaultGain;
  slider.style.width = '100%';
  slider.setAttribute('data-frequency', frequencyKey);
  slider.setAttribute('data-index', index.toString());
  
  slider.addEventListener('input', (event) => {
    const gain = Number(event.target.value);
    const freqKey = event.target.getAttribute('data-frequency');
    const valueDisplay = getElementById(`droneVolValue-${index}`);
    
    appState.drone.individualGains[freqKey] = gain;
    updateIndividualDroneGain(Number(freqKey), gain);
    setTextContent(valueDisplay, (gain * 100).toFixed(0) + '%');
  });
  
  wrapper.appendChild(label);
  wrapper.appendChild(slider);
  
  return wrapper;
}

export function hideIndividualVolumeControls() {
  const parent = getElementById('individualDroneVolumes');
  parent.style.display = 'none';
}

