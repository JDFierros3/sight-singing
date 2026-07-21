/**
 * Real music-notation rendering for the Live Sing tab, using VexFlow (MIT).
 *
 * Converts an exercise ({ parts:{S,A,T,B:[{midi,startTime,duration}]}, key, time
 * signature }) into an engraved SATB grand staff (S+A on treble, T+B on bass),
 * laid out as wrapped systems. Note screen positions are recorded per part so the
 * playback cursor and the crosshair pitch line can be overlaid later.
 */

import { spellMidiInKey } from '../utils/keySignature.js';

const LETTER_STEP = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

// Seconds-at-60bpm -> { dur, dots } (quarter = 1s).
const DUR_TABLE = [
  [4, 'w', 0], [3, 'h', 1], [2, 'h', 0], [1.5, 'q', 1], [1, 'q', 0],
  [0.75, '8', 1], [0.5, '8', 0], [0.375, '16', 1], [0.25, '16', 0], [0.125, '32', 0]
];

function durToVex(seconds) {
  let best = DUR_TABLE[4], err = Infinity;
  for (const row of DUR_TABLE) {
    const e = Math.abs(row[0] - seconds);
    if (e < err) { err = e; best = row; }
  }
  return { dur: best[1], dots: best[2] };
}

// MIDI -> VexFlow key string ("g/4") + accidental ('#','b','n', or null), key-aware.
function midiToVexKey(midi, tonicPc, mode) {
  const spelled = spellMidiInKey(midi, tonicPc, mode) || { letter: 'c', accidental: null };
  const letter = spelled.letter;
  // Octave from MIDI, corrected for the spelled letter at octave boundaries (B#/Cb).
  let octave = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  if (letter === 'b' && pc <= 1) octave -= 1;      // Cb spelled as b just below C
  if (letter === 'c' && pc >= 11) octave += 1;     // B# spelled as c just above B
  const accMap = { sharp: '#', flat: 'b', natural: 'n' };
  return { key: `${letter}/${octave}`, accidental: accMap[spelled.accidental] || null };
}

/**
 * Render the exercise as engraved notation into `container`.
 * Returns a layout map: { partPositions: {S:[{x,y,midi,startTime}], ...}, width, height }
 * so callers can align a cursor / crosshair. Returns null if VexFlow is unavailable.
 */
export function renderHymnNotation(exercise, container, options = {}) {
  const Vex = window.Vex;
  if (!Vex || !Vex.Flow || !exercise || !container) return null;
  const VF = Vex.Flow;

  container.innerHTML = '';

  const tonicPc = Number.isFinite(exercise.midiKeyMidi) ? exercise.midiKeyMidi : 0;
  const mode = exercise.midiKeyMode || 'major';
  const num = exercise.timeSigNum || 4;
  const den = exercise.timeSigDen || 4;
  const measureLen = num * (4 / den);          // seconds at 60bpm
  const keySpec = vexKeySpec(exercise.keySignature, tonicPc, mode);

  // Bucket each part's notes by measure index.
  const byPart = {};
  let measureCount = 0;
  for (const part of ['S', 'A', 'T', 'B']) {
    const notes = exercise.parts?.[part] || [];
    const measures = [];
    for (const n of notes) {
      const mi = Math.floor((n.startTime + 1e-4) / measureLen);
      (measures[mi] = measures[mi] || []).push(n);
      measureCount = Math.max(measureCount, mi + 1);
    }
    byPart[part] = measures;
  }
  if (measureCount === 0) return null;

  // Layout constants.
  const totalWidth = Math.max(320, Math.min(options.width || container.clientWidth || 800, 1400));
  const isMobile = totalWidth < 560;
  const measuresPerSystem = isMobile ? 2 : 4;
  const leftPad = 10;
  const firstMeasureExtra = 56; // room for clef + key + time signature
  const systemWidth = totalWidth - leftPad * 2;
  const trebleY = 10;
  const bassY = trebleY + 90;
  const systemHeight = 190;
  const systemCount = Math.ceil(measureCount / measuresPerSystem);

  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  renderer.resize(totalWidth, systemHeight * systemCount + 20);
  const ctx = renderer.getContext();

  const partPositions = { S: [], A: [], T: [], B: [] };

  for (let sys = 0; sys < systemCount; sys++) {
    const startM = sys * measuresPerSystem;
    const endM = Math.min(startM + measuresPerSystem, measureCount);
    const measuresInSystem = endM - startM;
    const yOff = sys * systemHeight;

    const treble = new VF.Stave(leftPad, trebleY + yOff, systemWidth);
    const bass = new VF.Stave(leftPad, bassY + yOff, systemWidth);
    if (sys === 0) {
      treble.addClef('treble').addKeySignature(keySpec).addTimeSignature(`${num}/${den}`);
      bass.addClef('bass').addKeySignature(keySpec).addTimeSignature(`${num}/${den}`);
    } else {
      treble.addClef('treble');
      bass.addClef('bass');
    }
    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();
    new VF.StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
    new VF.StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();

    // Build one non-strict voice per part across this system's measures.
    const built = {};
    for (const part of ['S', 'A', 'T', 'B']) {
      const clef = (part === 'S' || part === 'A') ? 'treble' : 'bass';
      const stemDir = (part === 'S' || part === 'T') ? VF.Stem.UP : VF.Stem.DOWN;
      const tickables = [];
      const meta = []; // parallel note metadata for position capture
      for (let mi = startM; mi < endM; mi++) {
        if (mi > startM) { tickables.push(new VF.BarNote()); meta.push(null); }
        const measure = byPart[part][mi] || [];
        for (const n of measure) {
          const { key, accidental } = midiToVexKey(n.midi, tonicPc, mode);
          const { dur, dots } = durToVex(n.duration);
          const sn = new VF.StaveNote({ keys: [key], duration: dur, clef, stem_direction: stemDir });
          if (accidental) sn.addModifier(new VF.Accidental(accidental));
          if (dots) VF.Dot.buildAndAttach([sn], { all: true });
          tickables.push(sn);
          meta.push(n);
        }
      }
      if (tickables.length === 0) continue;
      const voice = new VF.Voice({ num_beats: num, beat_value: den }).setStrict(false).addTickables(tickables);
      built[part] = { voice, tickables, meta, clef };
    }

    // Format treble voices (S,A) and bass voices (T,B) together so they align.
    const trebleVoices = ['S', 'A'].filter(p => built[p]).map(p => built[p].voice);
    const bassVoices = ['T', 'B'].filter(p => built[p]).map(p => built[p].voice);
    const formatter = new VF.Formatter();
    if (trebleVoices.length) formatter.joinVoices(trebleVoices);
    if (bassVoices.length) formatter.joinVoices(bassVoices);
    const allVoices = [...trebleVoices, ...bassVoices];
    const formatWidth = systemWidth - (sys === 0 ? firstMeasureExtra : 20) - 20;
    if (allVoices.length) formatter.format(allVoices, formatWidth);

    for (const part of ['S', 'A', 'T', 'B']) {
      const b = built[part];
      if (!b) continue;
      const stave = (part === 'S' || part === 'A') ? treble : bass;
      b.voice.draw(ctx, stave);
      // Capture on-screen position of each real note for cursor/crosshair overlays.
      b.tickables.forEach((t, i) => {
        const n = b.meta[i];
        if (!n || !t.getAbsoluteX) return;
        let y = trebleY + yOff + 40;
        try { y = t.getYs ? t.getYs()[0] : y; } catch (e) {}
        partPositions[part].push({ x: t.getAbsoluteX(), y, midi: n.midi, startTime: n.startTime, system: sys });
      });
    }
  }

  return { partPositions, width: totalWidth, height: systemHeight * systemCount + 20 };
}

// Map the song's key to a VexFlow key-signature spec ("G", "Eb", "F#", "Am"->"Am").
function vexKeySpec(keySignature, tonicPc, mode) {
  if (keySignature && /^[A-G](#|b)?m?$/.test(keySignature)) {
    // VexFlow uses e.g. "Eb", "F#", "Am" (minor keeps the 'm').
    return keySignature;
  }
  // Fallback from pitch class.
  const majors = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const name = majors[((tonicPc % 12) + 12) % 12] || 'C';
  return mode === 'minor' ? `${name}m` : name;
}
