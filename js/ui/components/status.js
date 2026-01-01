/**
 * Status display components
 */

import { getElementById, setTextContent } from '../../utils/dom.js';
import { appState } from '../../state/appState.js';
import { DEGREE_SEMITONES } from '../../config/constants.js';
import { normalizeModulo } from '../../utils/math.js';
import { getSolfegeForMidi } from '../../utils/musicTheory.js';
import { frequencyToMidi } from '../../utils/audioMath.js';

export function updateStatusMessage(message) {
  const statusElement = getElementById('status');
  setTextContent(statusElement, message);
}

export function updateMicDisplay(pitch, targetFreq) {
  const micHzElement = getElementById('micHz');
  const displayText = pitch ? pitch.toFixed(1) : '—';
  setTextContent(micHzElement, displayText);
}

export function updateTargetLabel() {
  const chordSemi = appState.target.semi;
  const rootSemi = appState.drone.rootSemi;
  const rootDegreeIndex = DEGREE_SEMITONES.indexOf(rootSemi);
  
  if (rootDegreeIndex === -1) {
    setTextContent(getElementById('targetLabel'), '(none)');
    return;
  }
  
  const actualSemi = normalizeModulo(chordSemi + rootSemi, 12);
  const targetMidi = appState.tuning.doMidi + actualSemi;
  
  // Use getSolfegeForMidi to handle accidentals correctly
  const solfege = getSolfegeForMidi(targetMidi, appState.tuning.doMidi);
  const label = solfege || '(none)';
  
  const targetLabelElement = getElementById('targetLabel');
  setTextContent(targetLabelElement, label);
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

export function updateNowPlayingBadge(label) {
  const badge = getElementById('nowBadge');
  const displayText = label || (appState.exercise.display.midis.length > 0 
    ? `${appState.exercise.display.midis.length} tone(s)` 
    : '—');
  setTextContent(badge, displayText);
}

