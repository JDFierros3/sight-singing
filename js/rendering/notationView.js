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

// Intrinsic height of one engraved system before scaling: a grand staff (treble + lyric
// band + bass) vs a single treble staff with labels beneath it.
const SYSTEM_HEIGHT = 320;
const SINGLE_HEIGHT = 150;

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

// Expand a note into per-measure "pieces". A note's written tie segments (tieDurs) — and
// any single note that spills over a barline — are split so each piece sits inside one
// measure; consecutive pieces of the same note are tied. This is what lets a note held
// across a barline render as two tied noteheads instead of vanishing from the next bar.
function notePieces(n, measureLenSec) {
  const segs = (Array.isArray(n.tieDurs) && n.tieDurs.length > 1)
    ? cumulativeSegments(n.startTime, n.tieDurs)
    : [{ start: n.startTime, dur: n.duration }];
  const pieces = [];
  for (const seg of segs) {
    let { start, dur } = seg;
    while (dur > 1e-6) {
      const mi = Math.floor((start + 1e-4) / measureLenSec);
      const measureEnd = (mi + 1) * measureLenSec;
      const pieceDur = Math.min(dur, measureEnd - start);
      pieces.push({ start, dur: pieceDur, mi });
      start += pieceDur;
      dur -= pieceDur;
    }
  }
  return pieces;
}

// Beat time as a set key, so two voices attacking "the same beat" match despite float drift.
function timeKey(t) {
  return Math.round(t * 1000);
}

function cumulativeSegments(start, durs) {
  const out = [];
  let t = start;
  for (const d of durs) { out.push({ start: t, dur: d }); t += d; }
  return out;
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

  // Staff mode: 'grand' (SATB, two staves) or 'single' (one treble line, e.g. warmup melody).
  const grand = options.staffMode !== 'single';
  const labelSource = options.labelSource || 'hymn'; // 'hymn' | 'solfege' | 'none'
  const PARTS_ACTIVE = grand ? ['S', 'A', 'T', 'B'] : ['S'];
  const systemHeight = grand ? SYSTEM_HEIGHT : SINGLE_HEIGHT;

  // Native zoom. In full-screen we scale to FIT the system into the available height
  // (options.fitHeight) so the staff is never taller than the screen — critical in
  // landscape, where the viewport is short. Otherwise honour an explicit scale.
  const scale = options.fitHeight
    ? Math.max(1.0, Math.min(2.8, options.fitHeight / systemHeight))
    : Math.max(0.5, options.scale || 1);

  container.innerHTML = '';

  const tonicPc = Number.isFinite(exercise.midiKeyMidi) ? exercise.midiKeyMidi : 0;
  const mode = exercise.midiKeyMode || 'major';
  const num = exercise.timeSigNum || 4;
  const den = exercise.timeSigDen || 4;
  const measureLenSec = num * (4 / den);          // seconds per measure at 60bpm
  const keySpec = vexKeySpec(exercise.keySignature, tonicPc, mode);

  // Single-staff mode picks the clef from the melody's tessitura so a low Do (baritone/bass
  // warm-ups) sits ON a bass staff instead of dangling under the treble as ledger-line ladders.
  // An explicit options.clef ('treble'|'bass') wins if provided.
  let singleClef = 'treble';
  if (!grand) {
    if (options.clef === 'treble' || options.clef === 'bass') {
      singleClef = options.clef;
    } else {
      const ms = (exercise.parts?.S || []).map(n => n.midi).filter(Number.isFinite);
      if (ms.length) {
        const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
        singleClef = avg < 58 ? 'bass' : 'treble'; // ~below A3 → bass staff
      }
    }
  }

  // Bucket note PIECES by measure (see notePieces). Each piece carries its render duration
  // and the tie/slur/fermata info needed to draw those marks.
  const byPart = { S: [], A: [], T: [], B: [] };
  let measureCount = 0;
  for (const part of PARTS_ACTIVE) {
    for (const n of (exercise.parts?.[part] || [])) {
      const pieces = notePieces(n, measureLenSec);
      pieces.forEach((pc, idx) => {
        pc.midi = n.midi;
        pc.tieToNext = idx < pieces.length - 1;                    // held into the next piece
        pc.isOnset = idx === 0;                                    // first head = the note's attack
        pc.fermata = idx === pieces.length - 1 && !!n.fermata;     // hold sits on the final head
        pc.slurId = idx === 0 ? (n.slurId ?? null) : null;         // slur anchors on the attack
        (byPart[part][pc.mi] = byPart[part][pc.mi] || []).push(pc);
        measureCount = Math.max(measureCount, pc.mi + 1);
      });
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
  let lyricsY = bassY;                   // set precisely from the rendered staves (below)

  let maxNotes = 1;
  for (let mi = 0; mi < measureCount; mi++) {
    for (const p of PARTS_ACTIVE) maxNotes = Math.max(maxNotes, (byPart[p][mi] || []).length);
  }
  const measureWidth = Math.min(520, Math.max(isMobile ? 150 : 210, maxNotes * perNote));
  const totalWidth = leftPad * 2 + clefExtra + measureCount * measureWidth;

  // Wrapper holds the VexFlow SVG + our notehead-overlay canvas together, so they
  // stay pixel-aligned and centre/scroll as one unit.
  const wrap = document.createElement('div');
  wrap.className = 'notation-wrap';
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
  // Collected during the measure loop, drawn after everything is formatted (positions set).
  const tieChain = { S: [], A: [], T: [], B: [] };   // ordered { sn, tieToNext } per real head
  const slurGroups = { S: {}, A: {}, T: {}, B: {} };  // slurId -> [staveNote, ...]

  let x = leftPad;
  for (let mi = 0; mi < measureCount; mi++) {
    const first = mi === 0;
    const w = measureWidth + (first ? clefExtra : 0);

    const treble = new VF.Stave(x, trebleY, w);
    const bass = grand ? new VF.Stave(x, bassY, w) : null;
    if (first) {
      treble.addClef(grand ? 'treble' : singleClef).addKeySignature(keySpec).addTimeSignature(`${num}/${den}`);
      if (bass) bass.addClef('bass').addKeySignature(keySpec).addTimeSignature(`${num}/${den}`);
      // Grand staff: centre the labels between the staves. Single staff: sit them just below it.
      lyricsY = bass
        ? (treble.getYForLine(4) + bass.getYForLine(0)) / 2 + 5
        : treble.getYForLine(4) + 30;
    }
    treble.setContext(ctx).draw();
    if (bass) {
      bass.setContext(ctx).draw();
      if (first) new VF.StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
      new VF.StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
    }
    // Map playhead time across the NOTE area (after the clef/key/time on measure 1),
    // not the full measure, so the playhead tracks the notes from the very first beat.
    const noteStartX = treble.getNoteStartX();
    measurePositions.push({ x: noteStartX, width: Math.max(20, (x + w) - noteStartX), startTime: mi * measureLenSec });

    // One voice per part for THIS measure only (proper per-measure formatting).
    const built = {};
    // A hold belongs to the STAFF, not to each voice on it: S and A holding the same beat
    // is one fermata, not two stacked ones. Times already marked on each staff this bar.
    const fermataTimes = { treble: new Set(), bass: new Set() };
    for (const part of PARTS_ACTIVE) {
      const clef = grand ? ((part === 'S' || part === 'A') ? 'treble' : 'bass') : singleClef;
      const stemDir = (part === 'S' || part === 'T') ? VF.Stem.UP : VF.Stem.DOWN;
      const measure = byPart[part][mi] || [];
      const tickables = [];
      const meta = [];
      if (measure.length === 0) {
        // Part rests this bar (e.g. a note tied over from earlier) — keep alignment.
        tickables.push(new VF.StaveNote({ keys: [clef === 'treble' ? 'b/4' : 'd/3'], duration: 'wr' }));
        meta.push(null);
      } else {
        const restKey = clef === 'treble' ? 'b/4' : 'd/3';
        let cursor = mi * measureLenSec; // beat position reached so far within this measure
        for (const n of measure) {
          // Fill the empty beats before this note (e.g. a pickup measure's leading rests, or an
          // internal rest) so the note sits on the beat it's actually sounded — not left-justified.
          if (n.start - cursor > 1e-4) {
            const { dur: rdur, dots: rdots } = durToVex(n.start - cursor);
            const rest = new VF.StaveNote({ keys: [restKey], duration: `${rdur}r` });
            if (rdots) VF.Dot.buildAndAttach([rest], { all: true });
            tickables.push(rest);
            meta.push(null);
          }
          cursor = n.start + n.dur;
          const { key, accidental, color } = midiToVexKey(n.midi, tonicPc, mode);
          const { dur, dots } = durToVex(n.dur);
          const sn = new VF.StaveNote({ keys: [key], duration: dur, clef, stem_direction: stemDir });
          if (accidental) sn.addModifier(new VF.Accidental(accidental));
          if (dots) VF.Dot.buildAndAttach([sn], { all: true });
          try { sn.setKeyStyle(0, { fillStyle: color, strokeStyle: color }); } catch (e) {} // solfege-coloured shape head
          if (n.fermata && !fermataTimes[clef].has(timeKey(n.start))) {
            fermataTimes[clef].add(timeKey(n.start));
            // Point the hold away from the middle of the grand staff: upright above the
            // treble staff, inverted below the bass staff. A bass fermata drawn above
            // would sit in the tenor's space, on top of the lyric band.
            const above = clef === 'treble';
            const glyph = above ? 'a@a' : 'a@u';
            const pos = above ? VF.Modifier.Position.ABOVE : VF.Modifier.Position.BELOW;
            try { sn.addModifier(new VF.Articulation(glyph).setPosition(pos)); } catch (e) {}
          }
          tickables.push(sn);
          meta.push(n);
          tieChain[part].push({ sn, tieToNext: !!n.tieToNext });
          // Slur ids are namespaced PER PART here, so producers only need ids that are
          // unique within a voice — two voices may reuse id 3 without their curves merging.
          if (n.slurId != null) (slurGroups[part][n.slurId] = slurGroups[part][n.slurId] || []).push(sn);
        }
      }
      const voice = new VF.Voice({ num_beats: num, beat_value: den }).setStrict(false).addTickables(tickables);
      // Beam consecutive eighths/sixteenths by beat so florid passages read as groups, not a
      // row of separate flags. maintain_stem_directions keeps each voice's fixed stem side.
      let beams = [];
      try {
        beams = VF.Beam.generateBeams(tickables, { maintain_stem_directions: true, beam_rests: false });
      } catch (e) { beams = []; }
      built[part] = { voice, tickables, meta, beams };
    }

    const trebleVoices = PARTS_ACTIVE.filter(p => p === 'S' || p === 'A').map(p => built[p].voice);
    const bassVoices = PARTS_ACTIVE.filter(p => p === 'T' || p === 'B').map(p => built[p].voice);
    const formatter = new VF.Formatter();
    if (trebleVoices.length) formatter.joinVoices(trebleVoices);
    if (bassVoices.length) formatter.joinVoices(bassVoices);
    const formatWidth = Math.max(60, w - (first ? clefExtra + 22 : 22));
    formatter.format([...trebleVoices, ...bassVoices], formatWidth);

    for (const part of PARTS_ACTIVE) {
      const b = built[part];
      const stave = (part === 'S' || part === 'A') ? treble : bass;
      b.voice.draw(ctx, stave);
      (b.beams || []).forEach(beam => { try { beam.setContext(ctx).draw(); } catch (e) {} });
      b.tickables.forEach((t, i) => {
        const m = b.meta[i];
        // Record one position per note ONSET (not per tied continuation), so lyric alignment
        // and the pitch-line fit stay one-entry-per-note.
        if (!m || !m.isOnset || !t.getAbsoluteX) return;
        let y = trebleY + 40;
        try { y = t.getYs ? t.getYs()[0] : y; } catch (e) {}
        partPositions[part].push({ x: t.getAbsoluteX(), y, midi: m.midi, startTime: m.start });
      });
    }
    x += w;
  }

  // Ties: connect each held head to the next head of the same note (incl. across barlines).
  for (const part of PARTS_ACTIVE) {
    const chain = tieChain[part];
    for (let i = 0; i < chain.length - 1; i++) {
      if (!chain[i].tieToNext) continue;
      try {
        new VF.StaveTie({ first_note: chain[i].sn, last_note: chain[i + 1].sn, first_indices: [0], last_indices: [0] })
          .setContext(ctx).draw();
      } catch (e) {}
    }
  }
  // Slurs: one curve per slur group, from its first head to its last. The curve arcs on the
  // STEM side of its voice (over S/T, under A/B) — that keeps it clear of the other voice
  // sharing the staff, and off the noteheads it spans. A group crossing a barline is still
  // one curve: every measure sits on the same row here, so the two ends line up.
  for (const part of PARTS_ACTIVE) {
    const stemUp = part === 'S' || part === 'T';
    for (const id of Object.keys(slurGroups[part])) {
      const g = slurGroups[part][id];
      if (g.length < 2) continue;
      try {
        new VF.Curve(g[0], g[g.length - 1], { invert: stemUp }).setContext(ctx).draw();
      } catch (e) {}
    }
  }

  // Per-note labels under the melody (labelSource 'hymn', or 'none' to suppress). The library
  // aligns one syllable to each soprano note — blank where a note is held under the previous
  // one. Warmup patterns reuse this by setting each note's "lyric" to its solfege syllable.
  if (labelSource !== 'none') {
    const syllables = lyricsForNotes(exercise);
    if (syllables.length) {
      ctx.save();
      ctx.setFont('Georgia, serif', 11, '');
      ctx.setFillStyle('#dbe4ff');
      ctx.setStrokeStyle('#dbe4ff');
      partPositions.S.forEach((p, i) => {
        const syl = (syllables[i] || '').replace(/--/g, '');
        if (!syl) return;
        try { ctx.fillText(syl, p.x - 3, lyricsY); } catch (e) {}
      });
      ctx.restore();
    }
  }

  // Linear fit y = a*midi + b (logical) so any sung pitch maps to a staff y (for the mic line).
  const fitPts = [];
  for (const part of PARTS_ACTIVE) for (const p of partPositions[part]) fitPts.push([p.midi, p.y]);
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

// Verse-1 syllables aligned to soprano notes. Prefer the library's per-note alignment
// (handles melismas + chorus/stanza sections); fall back to a naive whitespace split of
// the raw verse text for any older data lacking `lyricsByNote`.
function lyricsForNotes(exercise) {
  if (Array.isArray(exercise.lyricsByNote)) return exercise.lyricsByNote;
  const lyrics = exercise.lyrics;
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
