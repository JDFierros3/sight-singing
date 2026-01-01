export const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]; // internal only
export const SOLFEGE = ["Do","Re","Mi","Fa","Sol","La","Ti"]; // 7‑shape (movable‑Do)
export const DEGREE_SEMITONES = [0,2,4,5,7,9,11];
export const CHORDS = {
  "Major (1-3-5)": [0,4,7],
  "Minor (1-♭3-5)": [0,3,7],
  "Diminished (1-♭3-♭5)": [0,3,6],
  "Augmented (1-3-♯5)": [0,4,8],
  "Maj7 (1-3-5-7)": [0,4,7,11],
  "Dom7 (1-3-5-♭7)": [0,4,7,10],
  "Min7 (1-♭3-5-♭7)": [0,3,7,10]
};
export const DIATONIC_ST = new Set([0,2,4,5,7,9,11,12]);
export const PART_RANGES = { 'Soprano':[60,81], 'Alto':[55,74], 'Tenor':[48,69], 'Bass':[40,64] };
export const $ = id => document.getElementById(id);
export const state = {
  a4:440, doMidi:60, minMidi:48, maxMidi:72, tolerance:25, zoom:1,
  chord:Object.keys(CHORDS)[0], chordRootSemi:0, droneSemis:CHORDS[Object.keys(CHORDS)[0]],
  droneOn:false, targetSemi:0, playAim:true, onScaleOnly:true,
  hidden:null, interval:null, currentTab:'free', display:{midis:[],label:''}
};
