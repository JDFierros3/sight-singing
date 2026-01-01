/**
 * Menu building utilities broken into small, descriptive functions
 */

import { getElementById, clearElement } from '../../utils/dom.js';
import { midiToNoteName } from '../../utils/musicTheory.js';
import { getRomanNumeral } from '../../utils/musicTheory.js';
import { appState } from '../../state/appState.js';
import { SOLFEGE, DEGREE_SEMITONES, CHORDS } from '../../config/constants.js';

export function buildNoteSelectionMenus() {
  buildDoNoteMenu();
  buildMinNoteMenu();
  buildMaxNoteMenu();
}

function buildDoNoteMenu() {
  const menu = getElementById('doNote');
  clearMenu(menu);
  populateMenuWithMidiRange(menu, 36, 84);
  selectMenuOption(menu, appState.tuning.doMidi);
}

function buildMinNoteMenu() {
  const menu = getElementById('minNote');
  clearMenu(menu);
  populateMenuWithMidiRange(menu, 36, 84);
  selectMenuOption(menu, appState.tuning.minMidi);
}

function buildMaxNoteMenu() {
  const menu = getElementById('maxNote');
  clearMenu(menu);
  populateMenuWithMidiRange(menu, 36, 84);
  selectMenuOption(menu, appState.tuning.maxMidi);
}

function populateMenuWithMidiRange(menu, minMidi, maxMidi) {
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const noteLabel = midiToNoteName(midi);
    const option = createMenuOption(noteLabel, midi);
    menu.add(option);
  }
}

function clearMenu(menu) {
  clearElement(menu);
}

function createMenuOption(label, value) {
  return new Option(label, value);
}

function selectMenuOption(menu, value) {
  for (let option of menu.options) {
    option.selected = Number(option.value) === value;
  }
}

export function buildChordRootMenu() {
  const rootMenu = getElementById('chordRoot');
  clearMenu(rootMenu);
  
  DEGREE_SEMITONES.forEach((semi, index) => {
    const roman = getRomanNumeral(semi);
    const solfege = SOLFEGE[index];
    addSolfegeOptionToMenu(rootMenu, semi, solfege, roman);
  });
  
  selectMenuOption(rootMenu, appState.drone.rootSemi);
}

function addSolfegeOptionToMenu(menu, semi, solfege, roman) {
  const label = `${solfege} (${roman})`;
  const option = createMenuOption(label, semi);
  
  if (semi === appState.drone.rootSemi) {
    option.selected = true;
  }
  
  menu.add(option);
}

export function buildChordTypeMenu() {
  const chordMenu = getElementById('chordSelect');
  clearMenu(chordMenu);
  
  Object.keys(CHORDS).forEach(chordName => {
    const option = createMenuOption(chordName, chordName);
    
    if (chordName === appState.drone.chord) {
      option.selected = true;
    }
    
    chordMenu.add(option);
  });
}

