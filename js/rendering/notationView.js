/**
 * Real music-notation rendering for the Live Sing tab, using VexFlow (MIT).
 *
 * Converts an exercise ({ parts:{S,A,T,B:[{midi,startTime,duration}]}, key, time
 * signature }) into an engraved SATB grand staff (S+A on treble, T+B on bass),
 * laid out as wrapped systems. Note screen positions are recorded per part so the
 * playback cursor and the crosshair pitch line can be overlaid later.
 */

import { spellMidiInKey } from '../utils/keySignature.js';
import { getShapeColor } from './shapes.js';

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

// Solfege -> VexFlow shape-note notehead code (Aikin 7-shape). VexFlow draws these on
// the note's own stem, so they align perfectly. They render filled at any duration.
const SHAPE_CODE = { Do: 'DO', Re: 'RE', Mi: 'MI', Fa: 'FAUP', Sol: 'SO', La: 'LA', Ti: 'TI' };

// MIDI -> { key (with shape notehead), accidental, color }, key-aware.
function midiToVexKey(midi, tonicPc, mode) {
  const spelled = spellMidiInKey(midi, tonicPc, mode) || { letter: 'c', accidental: null, solfege: 'Do' };
  const letter = spelled.letter;
  // Octave from MIDI, corrected for the spelled letter at octave boundaries (B#/Cb).
  let octave = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  if (letter === 'b' && pc <= 1) octave -= 1;      // Cb spelled as b just below C
  if (letter === 'c' && pc >= 11) octave += 1;     // B# spelled as c just above B
  const shape = SHAPE_CODE[spelled.solfege] || 'SO';
  const accMap = { sharp: '#', flat: 'b', natural: 'n' };
  return {
    key: `${letter}/${octave}/${shape}`,
    accidental: accMap[spelled.accidental] || null,
    color: getShapeColor(spelled.solfege)
  };
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

  const scale = Math.max(0.5, options.scale || 1); // native zoom (full-screen enlarges everything)

  container.innerHTML = '';

  const tonicPc = Number.isFinite(exercise.midiKeyMidi) ? exercise.midiKeyMidi : 0;
  const mode = exercise.midiKeyMode || 'major';
  const num = exercise.timeSigNum || 4;
  const den = exercise.timeSigDen || 4;
  const measureLenSec = num * (4 / den);          // seconds per measure at 60bpm
  const keySpec = vexKeySpec(exercise.keySignature, tonicPc, mode);

  // Bucket notes by measure. Clamp each note's DISPLAY duration to the measure so a
  // long/tied note can't overflow into the next bar (which broke the layout).
  const byPart = { S: [], A: [], T: [], B: [] };
  let measureCount = 0;
  for (const part of ['S', 'A', 'T', 'B']) {
    for (const n of (exercise.parts?.[part] || [])) {
      const mi = Math.floor((n.startTime + 1e-4) / measureLenSec);
      const measureEnd = (mi + 1) * measureLenSec;
      const displayDur = Math.min(n.duration, measureEnd - n.startTime) || n.duration;
      (byPart[part][mi] = byPart[part][mi] || []).push({ ...n, displayDur });
      measureCount = Math.max(measureCount, mi + 1);
    }
  }
  if (measureCount === 0) return null;

  // Layout: each measure is its own pair of staves, laid out in ONE horizontal row
  // and scrolled. Uniform measure width => constant playhead speed.
  const viewWidth = Math.max(320, options.width || container.clientWidth || 800);
  const isMobile = viewWidth < 560;
  const perNote = isMobile ? 34 : 46;
  const leftPad = 10;
  const clefExtra = 74;                 // clef + key + time signature on measure 1
  const trebleY = 20;
  // Wide inter-staff gap so the inner-voice stems (alto down, tenor up) leave a clear
  // band in the middle for the lyrics — no overlap.
  const bassY = trebleY + 170;
  const systemHeight = 320;
  let lyricsY = bassY;                   // set precisely from the rendered staves (below)

  let maxNotes = 1;
  for (let mi = 0; mi < measureCount; mi++) {
    for (const p of ['S', 'A', 'T', 'B']) maxNotes = Math.max(maxNotes, (byPart[p][mi] || []).length);
  }
  const measureWidth = Math.min(520, Math.max(isMobile ? 150 : 210, maxNotes * perNote));
  const totalWidth = leftPad * 2 + clefExtra + measureCount * measureWidth;

  // Wrapper holds the VexFlow SVG + our notehead-overlay canvas together, so they
  // stay pixel-aligned and centre/scroll as one unit.
  const wrap = document.createElement('div');
  wrap.className = 'livesing-notation-wrap';
  wrap.style.cssText = `position:relative;width:${totalWidth * scale}px;height:${systemHeight * scale}px;flex:0 0 auto;`;
  container.appendChild(wrap);

  const renderer = new VF.Renderer(wrap, VF.Renderer.Backends.SVG);
  renderer.resize(totalWidth * scale, systemHeight * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale); // draw in logical coords; VexFlow output is scale× larger
  // Match the app's staff scheme: muted staff/stems/clefs; noteheads carry their solfege colour.
  ctx.setFillStyle('#9aa4b2');
  ctx.setStrokeStyle('#9aa4b2');

  const partPositions = { S: [], A: [], T: [], B: [] };
  const measurePositions = [];

  let x = leftPad;
  for (let mi = 0; mi < measureCount; mi++) {
    const first = mi === 0;
    const w = measureWidth + (first ? clefExtra : 0);

    const treble = new VF.Stave(x, trebleY, w);
    const bass = new VF.Stave(x, bassY, w);
    if (first) {
      treble.addClef('treble').addKeySignature(keySpec).addTimeSignature(`${num}/${den}`);
      bass.addClef('bass').addKeySignature(keySpec).addTimeSignature(`${num}/${den}`);
      // Centre the lyric baseline exactly between the treble bottom line and bass top line.
      lyricsY = (treble.getYForLine(4) + bass.getYForLine(0)) / 2 + 5;
    }
    treble.setContext(ctx).draw();
    bass.setContext(ctx).draw();
    if (first) new VF.StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
    new VF.StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
    // Map playhead time across the NOTE area (after the clef/key/time on measure 1),
    // not the full measure, so the playhead tracks the notes from the very first beat.
    const noteStartX = treble.getNoteStartX();
    measurePositions.push({ x: noteStartX, width: Math.max(20, (x + w) - noteStartX), startTime: mi * measureLenSec });

    // One voice per part for THIS measure only (proper per-measure formatting).
    const built = {};
    for (const part of ['S', 'A', 'T', 'B']) {
      const clef = (part === 'S' || part === 'A') ? 'treble' : 'bass';
      const stemDir = (part === 'S' || part === 'T') ? VF.Stem.UP : VF.Stem.DOWN;
      const measure = byPart[part][mi] || [];
      const tickables = [];
      const meta = [];
      if (measure.length === 0) {
        // Part rests this bar (e.g. a note tied over from earlier) — keep alignment.
        tickables.push(new VF.StaveNote({ keys: [clef === 'treble' ? 'b/4' : 'd/3'], duration: 'wr' }));
        meta.push(null);
      } else {
        for (const n of measure) {
          const { key, accidental, color } = midiToVexKey(n.midi, tonicPc, mode);
          const { dur, dots } = durToVex(n.displayDur);
          const sn = new VF.StaveNote({ keys: [key], duration: dur, clef, stem_direction: stemDir });
          if (accidental) sn.addModifier(new VF.Accidental(accidental));
          if (dots) VF.Dot.buildAndAttach([sn], { all: true });
          try { sn.setKeyStyle(0, { fillStyle: color, strokeStyle: color }); } catch (e) {} // solfege-coloured shape head
          tickables.push(sn);
          meta.push(n);
        }
      }
      const voice = new VF.Voice({ num_beats: num, beat_value: den }).setStrict(false).addTickables(tickables);
      built[part] = { voice, tickables, meta };
    }

    const trebleVoices = ['S', 'A'].map(p => built[p].voice);
    const bassVoices = ['T', 'B'].map(p => built[p].voice);
    const formatter = new VF.Formatter();
    formatter.joinVoices(trebleVoices);
    formatter.joinVoices(bassVoices);
    const formatWidth = Math.max(60, w - (first ? clefExtra + 22 : 22));
    formatter.format([...trebleVoices, ...bassVoices], formatWidth);

    for (const part of ['S', 'A', 'T', 'B']) {
      const b = built[part];
      const stave = (part === 'S' || part === 'A') ? treble : bass;
      b.voice.draw(ctx, stave);
      b.tickables.forEach((t, i) => {
        const m = b.meta[i];
        if (!m || !t.getAbsoluteX) return;
        let y = trebleY + 40;
        try { y = t.getYs ? t.getYs()[0] : y; } catch (e) {}
        partPositions[part].push({ x: t.getAbsoluteX(), y, midi: m.midi, startTime: m.startTime });
      });
    }
    x += w;
  }

  // Verse-1 lyrics under the melody: one syllable per soprano note (OpenPsalm guarantees
  // syllable count == soprano note count).
  const syllables = verse1Syllables(exercise.lyrics);
  if (syllables.length) {
    ctx.save();
    ctx.setFont('Georgia, serif', 11, '');
    ctx.setFillStyle('#dbe4ff');
    ctx.setStrokeStyle('#dbe4ff');
    partPositions.S.forEach((p, i) => {
      if (i >= syllables.length) return;
      const syl = syllables[i].replace(/--/g, '');
      try { ctx.fillText(syl, p.x - 3, lyricsY); } catch (e) {}
    });
    ctx.restore();
  }

  // Linear fit y = a*midi + b (logical) so any sung pitch maps to a staff y (for the mic line).
  const fitPts = [];
  for (const part of ['S', 'A', 'T', 'B']) for (const p of partPositions[part]) fitPts.push([p.midi, p.y]);
  let a = 0, b = systemHeight / 2;
  if (fitPts.length >= 2) {
    const n = fitPts.length;
    const sx = fitPts.reduce((s, p) => s + p[0], 0);
    const sy = fitPts.reduce((s, p) => s + p[1], 0);
    const sxx = fitPts.reduce((s, p) => s + p[0] * p[0], 0);
    const sxy = fitPts.reduce((s, p) => s + p[0] * p[1], 0);
    const denom = n * sxx - sx * sx;
    if (denom !== 0) { a = (n * sxy - sx * sy) / denom; b = (sy - a * sx) / n; }
  }
  const pitchToY = (midi) => (a * midi + b) * scale;

  // Return positions in FINAL (scaled) pixel space so the playhead/scroll use them directly.
  const scalePos = (arr) => arr.map(p => ({ ...p, x: p.x * scale, y: p.y * scale }));
  const scaledParts = {};
  for (const part of ['S', 'A', 'T', 'B']) scaledParts[part] = scalePos(partPositions[part]);
  const scaledMeasures = measurePositions.map(m => ({ x: m.x * scale, width: m.width * scale, startTime: m.startTime }));

  return {
    partPositions: scaledParts,
    measurePositions: scaledMeasures,
    measureLenSec,
    pitchToY,
    width: totalWidth * scale,
    height: systemHeight * scale
  };
}

// Split an OpenPsalm verse into syllables (one per melody note); drops "--" joiners
// and any @shared-section markers.
function verse1Syllables(lyrics) {
  if (!lyrics) return [];
  const v = lyrics['1'] || lyrics[1] || Object.values(lyrics)[0];
  const text = v && typeof v === 'object' ? (v.text || '') : (typeof v === 'string' ? v : '');
  return text.split(/\s+/).filter(t => t && t !== '--' && !t.startsWith('@'));
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
