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
}

function buildDoNoteMenu() {
  const menu = getElementById('doNote');
  if (!menu) return;
  clearMenu(menu);
  populateMenuWithMidiRange(menu, 36, 84);
  selectMenuOption(menu, appState.tuning.doMidi);
}

function populateMenuWithMidiRange(menu, minMidi, maxMidi) {
  if (!menu) return;
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
  if (!menu) return;
  for (let option of menu.options) {
    option.selected = Number(option.value) === value;
  }
}


