import { NOTE_NAMES, DEGREE_SEMITONES, SOLFEGE } from './state.js';
export function midiToFreq(midi, a4=440){ return 440 * Math.pow(2, (midi-69) / 12) * (a4/440); }
export function freqToMidi(freq, a4=440){ return 69 + 12*Math.log2(freq/(440*(a4/440))); }
export function centsBetween(f1, f2){ return 1200 * Math.log2(f1/f2); }
export function midiName(m){ const octave=Math.floor(m/12)-1; return NOTE_NAMES[m%12]+octave; }
export function degreeForMidi(midi, doMidi){ const mod=((midi-doMidi)%12+12)%12; const idx=DEGREE_SEMITONES.indexOf(mod); return idx>=0? idx : null; }
export function buildScalePitches(doMidi, minMidi, maxMidi){ const out=[]; for(let m=minMidi;m<=maxMidi;m++){ const mod=((m-doMidi)%12+12)%12; const deg=DEGREE_SEMITONES.indexOf(mod); if(deg!==-1) out.push({midi:m, degree:deg, sol:SOLFEGE[deg]}); } return out; }
export function intervalName(semitones){ const names={0:"P1",1:"m2",2:"M2",3:"m3",4:"M3",5:"P4",6:"TT",7:"P5",8:"m6",9:"M6",10:"m7",11:"M7",12:"P8"}; return names[semitones]||(semitones+" st"); }
export function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
