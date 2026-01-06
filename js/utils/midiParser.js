/**
 * MIDI file parsing utilities
 * Parses MIDI files and converts them to exercise format
 */

import { PART_RANGES } from '../config/constants.js';

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const NAT_MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

/**
 * Parse MIDI file from ArrayBuffer
 * @param {ArrayBuffer} arrayBuffer - MIDI file data
 * @returns {Object} Parsed MIDI data with tracks, tempo, time signature
 */
export async function parseMidiFile(arrayBuffer) {
  // Dynamic import of @tonejs/midi from CDN
  const { Midi } = await import('https://cdn.jsdelivr.net/npm/@tonejs/midi@2.0.28/+esm');
  
  const midi = new Midi(arrayBuffer);
  
  // Extract key signature if available
  const keySignature = midi.header.keySignatures[0];
  let keyMidi = null;
  
  if (keySignature) {
    // @tonejs/midi keySignature.key is in range -7 to +7 (circle of fifths)
    // Negative = flats, positive = sharps
    // Convert to pitch class (0-11): C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11
    // Circle of fifths: 0=C(0), 1=G(7), 2=D(2), 3=A(9), 4=E(4), 5=B(11), 6=F#(6), 7=C#(1)
    //                   -1=F(5), -2=Bb(10), -3=Eb(3), -4=Ab(8), -5=Db(1), -6=Gb(6), -7=Cb(11)
    const keyValue = keySignature.key;

    // Some MIDI files/libraries may provide non-numeric key identifiers.
    // If we don't get a finite number, ignore and fall back to note-based detection.
    if (!Number.isFinite(keyValue)) {
      keyMidi = null;
    } else {
    
    // Map circle of fifths to pitch class
    const circleOfFifthsMap = [
      0,   // -7: Cb -> B (11) - but we'll handle this separately
      11,  // -6: Gb -> F# (6) - but Gb is enharmonic to F#, so 6
      1,   // -5: Db -> C# (1)
      8,   // -4: Ab (8)
      3,   // -3: Eb (3)
      10,  // -2: Bb (10)
      5,   // -1: F (5)
      0,   // 0: C (0)
      7,   // 1: G (7)
      2,   // 2: D (2)
      9,   // 3: A (9)
      4,   // 4: E (4)
      11,  // 5: B (11)
      6,   // 6: F# (6)
      1    // 7: C# (1)
    ];
    
    // Convert -7 to +7 range to array index (0-14)
    const index = keyValue + 7;
      if (index >= 0 && index < circleOfFifthsMap.length) {
        keyMidi = circleOfFifthsMap[index];
      } else {
        // Fallback: use modulo
        keyMidi = ((keyValue % 12) + 12) % 12;
      }
    }
  }
  
  return {
    tracks: midi.tracks,
    tempo: midi.header.tempos[0]?.bpm || 120,
    timeSignature: midi.header.timeSignatures[0] || { numerator: 4, denominator: 4 },
    ticksPerQuarter: midi.header.ticksPerQuarter,
    duration: midi.duration,
    keySignature: keySignature,
    keyMidi: keyMidi // MIDI note number for the key (0-11, where 0=C, 1=C#, etc.)
  };
}

/**
 * Extract note events from MIDI tracks
 * @param {Array} tracks - MIDI tracks array
 * @returns {Array} Array of note events { trackIndex, midi, startTime, endTime, duration, velocity }
 */
export function extractNoteEvents(tracks) {
  const noteEvents = [];
  
  tracks.forEach((track, trackIndex) => {
    track.notes.forEach(note => {
      noteEvents.push({
        trackIndex: trackIndex,
        midi: note.midi,
        startTime: note.time,
        endTime: note.time + note.duration,
        duration: note.duration,
        velocity: note.velocity
      });
    });
  });
  
  return noteEvents;
}

/**
 * Convert MIDI ticks to seconds
 * @param {number} ticks - MIDI tick value
 * @param {number} ticksPerQuarter - Ticks per quarter note
 * @param {number} tempoBPM - Tempo in BPM
 * @returns {number} Time in seconds
 */
export function convertTicksToSeconds(ticks, ticksPerQuarter, tempoBPM) {
  const quarters = ticks / ticksPerQuarter;
  const seconds = (quarters * 60) / tempoBPM;
  return seconds;
}

/**
 * Separate notes into SATB parts based on pitch ranges
 * @param {Array} notes - Array of note events
 * @returns {Object} Object with S, A, T, B arrays of notes
 */
export function separatePartsByRange(notes) {
  const parts = {
    S: [],
    A: [],
    T: [],
    B: []
  };
  
  notes.forEach(note => {
    const midi = note.midi;
    
    // Assign to part based on pitch range
    if (midi >= PART_RANGES.Soprano[0] && midi <= PART_RANGES.Soprano[1]) {
      parts.S.push({ ...note, part: 'S' });
    } else if (midi >= PART_RANGES.Alto[0] && midi <= PART_RANGES.Alto[1]) {
      parts.A.push({ ...note, part: 'A' });
    } else if (midi >= PART_RANGES.Tenor[0] && midi <= PART_RANGES.Tenor[1]) {
      parts.T.push({ ...note, part: 'T' });
    } else if (midi >= PART_RANGES.Bass[0] && midi <= PART_RANGES.Bass[1]) {
      parts.B.push({ ...note, part: 'B' });
    } else {
      // Note outside all ranges - assign to closest part
      const distances = {
        S: Math.abs(midi - (PART_RANGES.Soprano[0] + PART_RANGES.Soprano[1]) / 2),
        A: Math.abs(midi - (PART_RANGES.Alto[0] + PART_RANGES.Alto[1]) / 2),
        T: Math.abs(midi - (PART_RANGES.Tenor[0] + PART_RANGES.Tenor[1]) / 2),
        B: Math.abs(midi - (PART_RANGES.Bass[0] + PART_RANGES.Bass[1]) / 2)
      };
      
      const closestPart = Object.keys(distances).reduce((a, b) => 
        distances[a] < distances[b] ? a : b
      );
      
      parts[closestPart].push({ ...note, part: closestPart });
    }
  });
  
  return parts;
}

/**
 * Detect parts from multiple tracks
 * If MIDI has separate tracks, try to detect which is which part
 * @param {Array} tracks - MIDI tracks array
 * @returns {Object} Mapping of track indices to parts { 0: 'S', 1: 'A', ... }
 */
export function detectPartsFromTracks(tracks) {
  const trackRanges = tracks.map(track => {
    if (track.notes.length === 0) return null;
    
    const midis = track.notes.map(n => n.midi);
    const minMidi = Math.min(...midis);
    const maxMidi = Math.max(...midis);
    const avgMidi = midis.reduce((a, b) => a + b, 0) / midis.length;
    
    return { minMidi, maxMidi, avgMidi };
  });
  
  // Sort tracks by average pitch (highest to lowest)
  const sortedTracks = trackRanges
    .map((range, index) => ({ range, index }))
    .filter(item => item.range !== null)
    .sort((a, b) => b.range.avgMidi - a.range.avgMidi);
  
  const partMapping = {};
  const partOrder = ['S', 'A', 'T', 'B'];
  
  sortedTracks.forEach((track, i) => {
    if (i < partOrder.length) {
      partMapping[track.index] = partOrder[i];
    }
  });
  
  return partMapping;
}

/**
 * Map MIDI notes to exercise format
 * @param {Array} notes - Array of note events
 * @param {Object} partMapping - Optional mapping of track indices to parts
 * @returns {Object} Exercise format { label, duration, parts: { S, A, T, B } }
 */
export function mapMidiToExerciseFormat(notes, partMapping = null) {
  let parts;
  
  if (partMapping) {
    // Use track-based part mapping
    parts = { S: [], A: [], T: [], B: [] };
    
    notes.forEach(note => {
      const part = partMapping[note.trackIndex];
      if (part) {
        parts[part].push({
          midi: note.midi,
          startTime: note.startTime,
          duration: note.duration,
          part: part
        });
      }
    });
  } else {
    // Separate by pitch ranges
    parts = separatePartsByRange(notes);
  }

  // Coalesce exact-duplicate pitches at the same start time within each part
  Object.keys(parts).forEach(part => {
    parts[part] = coalescePartNotes(parts[part]);
  });
  
  // Calculate total duration
  const allEndTimes = notes.map(n => n.endTime);
  const maxEndTime = Math.max(...allEndTimes, 0);
  
  return {
    duration: maxEndTime,
    parts: parts
  };
}

function groupNotesByStartTime(notes, epsilon = 1e-6) {
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime || a.midi - b.midi);
  const groups = [];
  let current = null;
  sorted.forEach(n => {
    if (!current || Math.abs(n.startTime - current.time) > epsilon) {
      current = { time: n.startTime, notes: [n] };
      groups.push(current);
    } else {
      current.notes.push(n);
    }
  });
  return groups;
}

function rangePenalty(midi, range) {
  if (!Number.isFinite(midi)) return 0;
  const [min, max] = range;
  if (midi < min) return (min - midi) * 3;
  if (midi > max) return (midi - max) * 3;
  return 0;
}

/**
 * Voice-leading split for a 2-voice staff (e.g., SA combined on one staff).
 * Returns { upper: NoteEvent[], lower: NoteEvent[] } with part fields assigned later.
 */
function splitTwoVoiceStaff(noteEvents, upperRange, lowerRange) {
  const groups = groupNotesByStartTime(noteEvents);
  const upper = [];
  const lower = [];

  // Track currently-held notes for each voice
  let upperHeld = null; // { midi, endTime }
  let lowerHeld = null; // { midi, endTime }

  const center = (r) => (r[0] + r[1]) / 2;
  const upperCenter = center(upperRange);
  const lowerCenter = center(lowerRange);

  const assignToUpper = (n) => upper.push(n);
  const assignToLower = (n) => lower.push(n);

  groups.forEach(g => {
    const t = g.time;

    // expire holds
    if (upperHeld && !(upperHeld.endTime > t + 1e-6)) upperHeld = null;
    if (lowerHeld && !(lowerHeld.endTime > t + 1e-6)) lowerHeld = null;

    // sort by pitch
    const notes = [...g.notes].sort((a, b) => a.midi - b.midi);
    if (notes.length === 0) return;

    if (notes.length >= 2) {
      const low = notes[0];
      const high = notes[notes.length - 1];
      assignToLower(low);
      assignToUpper(high);
      lowerHeld = { midi: low.midi, endTime: low.endTime };
      upperHeld = { midi: high.midi, endTime: high.endTime };

      // Any extra notes (rare): assign by proximity to held/center
      for (let i = 1; i < notes.length - 1; i++) {
        const n = notes[i];
        const du = upperHeld ? Math.abs(n.midi - upperHeld.midi) : Math.abs(n.midi - upperCenter);
        const dl = lowerHeld ? Math.abs(n.midi - lowerHeld.midi) : Math.abs(n.midi - lowerCenter);
        if (du <= dl) {
          assignToUpper(n);
        } else {
          assignToLower(n);
        }
      }
      return;
    }

    // Single note onset:
    const n = notes[0];

    // If one voice is holding, new note likely belongs to the other voice.
    if (upperHeld && !lowerHeld) {
      assignToLower(n);
      lowerHeld = { midi: n.midi, endTime: n.endTime };
      return;
    }
    if (lowerHeld && !upperHeld) {
      assignToUpper(n);
      upperHeld = { midi: n.midi, endTime: n.endTime };
      return;
    }

    // Otherwise choose by range center + continuity if available.
    const du = upperHeld ? Math.abs(n.midi - upperHeld.midi) : Math.abs(n.midi - upperCenter);
    const dl = lowerHeld ? Math.abs(n.midi - lowerHeld.midi) : Math.abs(n.midi - lowerCenter);

    if (du <= dl) {
      assignToUpper(n);
      upperHeld = { midi: n.midi, endTime: n.endTime };
    } else {
      assignToLower(n);
      lowerHeld = { midi: n.midi, endTime: n.endTime };
    }
  });

  return { upper, lower };
}

function toNoteEventsFromTrack(track, trackIndex) {
  return track.notes.map(n => ({
    trackIndex,
    midi: n.midi,
    startTime: n.time,
    endTime: n.time + n.duration,
    duration: n.duration,
    velocity: n.velocity
  }));
}

function splitSATBFromTwoTracks(tracks) {
  const nonEmpty = tracks
    .map((t, idx) => ({ t, idx }))
    .filter(x => (x.t?.notes?.length || 0) > 0);
  if (nonEmpty.length !== 2) return null;

  const [a, b] = nonEmpty;
  const avgA = a.t.notes.reduce((s, n) => s + n.midi, 0) / a.t.notes.length;
  const avgB = b.t.notes.reduce((s, n) => s + n.midi, 0) / b.t.notes.length;
  const treble = avgA >= avgB ? a : b;
  const bass = avgA >= avgB ? b : a;

  const trebleEvents = toNoteEventsFromTrack(treble.t, treble.idx);
  const bassEvents = toNoteEventsFromTrack(bass.t, bass.idx);

  const sa = splitTwoVoiceStaff(trebleEvents, PART_RANGES.Soprano, PART_RANGES.Alto);
  const tb = splitTwoVoiceStaff(bassEvents, PART_RANGES.Tenor, PART_RANGES.Bass);

  const parts = {
    S: sa.upper.map(n => ({ midi: n.midi, startTime: n.startTime, duration: n.duration, part: 'S' })),
    A: sa.lower.map(n => ({ midi: n.midi, startTime: n.startTime, duration: n.duration, part: 'A' })),
    T: tb.upper.map(n => ({ midi: n.midi, startTime: n.startTime, duration: n.duration, part: 'T' })),
    B: tb.lower.map(n => ({ midi: n.midi, startTime: n.startTime, duration: n.duration, part: 'B' }))
  };

  // Coalesce exact duplicates at same start time
  Object.keys(parts).forEach(p => {
    parts[p] = coalescePartNotes(parts[p]);
  });

  const all = [...trebleEvents, ...bassEvents];
  const maxEnd = Math.max(...all.map(n => n.endTime), 0);
  return { parts, duration: maxEnd };
}

function splitSATBFromOneTrack(tracks) {
  const nonEmpty = tracks
    .map((t, idx) => ({ t, idx }))
    .filter(x => (x.t?.notes?.length || 0) > 0);
  if (nonEmpty.length !== 1) return null;

  const { t: track, idx } = nonEmpty[0];
  const events = toNoteEventsFromTrack(track, idx);

  // Many hymn/piano MIDIs "roll" chords, so chord tones don't share an exact startTime.
  // Cluster near-simultaneous onsets so we can assign SATB by pitch order more reliably.
  // Make this adaptive: allow larger windows for human-played rolls, but avoid merging fast melodies.
  const estimateChordClusterEpsilonSec = (noteEvents) => {
    const starts = [...new Set(noteEvents.map(n => n.startTime).filter(Number.isFinite))].sort((a, b) => a - b);
    if (starts.length < 3) return 0.08;
    const diffs = [];
    for (let i = 1; i < starts.length; i++) {
      const d = starts[i] - starts[i - 1];
      if (d > 1e-6) diffs.push(d);
    }
    if (diffs.length === 0) return 0.08;
    diffs.sort((a, b) => a - b);
    const median = diffs[Math.floor(diffs.length / 2)];
    // Use ~85% of median IOI, clamped: 80ms–500ms.
    // (This is intentionally generous for human-played "rolled" chords.)
    return Math.max(0.08, Math.min(0.50, median * 0.85));
  };

  const chordClusterEpsSec = estimateChordClusterEpsilonSec(events);
  const groups = groupNotesByStartTime(events, chordClusterEpsSec);

  const parts = { S: [], A: [], T: [], B: [] };
  const voiceOrderHighToLow = ['S', 'A', 'T', 'B'];
  const rangeByVoice = {
    S: PART_RANGES.Soprano,
    A: PART_RANGES.Alto,
    T: PART_RANGES.Tenor,
    B: PART_RANGES.Bass
  };
  const center = (r) => (r[0] + r[1]) / 2;
  const centers = {
    S: center(rangeByVoice.S),
    A: center(rangeByVoice.A),
    T: center(rangeByVoice.T),
    B: center(rangeByVoice.B)
  };

  // currently-held notes per voice (a voice can only sing one pitch at a time)
  const held = { S: null, A: null, T: null, B: null }; // { midi, endTime }

  const epsilon = 1e-6;
  const expireHolds = (time) => {
    voiceOrderHighToLow.forEach(v => {
      const h = held[v];
      if (h && !(h.endTime > time + epsilon)) {
        held[v] = null;
      }
    });
  };

  const assign = (voice, note) => {
    parts[voice].push({ midi: note.midi, startTime: note.startTime, duration: note.duration, part: voice });
    held[voice] = { midi: note.midi, endTime: note.endTime };
  };

  const nearestPitchAbove = (voice, currentPitchByVoice) => {
    const idx = voiceOrderHighToLow.indexOf(voice);
    for (let i = idx - 1; i >= 0; i--) {
      const v = voiceOrderHighToLow[i];
      const p = currentPitchByVoice[v];
      if (Number.isFinite(p)) return p;
    }
    return null;
  };

  const nearestPitchBelow = (voice, currentPitchByVoice) => {
    const idx = voiceOrderHighToLow.indexOf(voice);
    for (let i = idx + 1; i < voiceOrderHighToLow.length; i++) {
      const v = voiceOrderHighToLow[i];
      const p = currentPitchByVoice[v];
      if (Number.isFinite(p)) return p;
    }
    return null;
  };

  const assignmentCost = (voice, noteMidi, currentPitchByVoice) => {
    const anchor = held[voice]?.midi ?? centers[voice];
    let cost = Math.abs(noteMidi - anchor) + rangePenalty(noteMidi, rangeByVoice[voice]);

    // Prevent obvious voice-crossing against currently-sounding (held) pitches.
    const above = nearestPitchAbove(voice, currentPitchByVoice);
    const below = nearestPitchBelow(voice, currentPitchByVoice);
    const eps = 0.25;
    if (Number.isFinite(above) && noteMidi > above + eps) {
      cost += 1000 + (noteMidi - above) * 20;
    }
    if (Number.isFinite(below) && noteMidi < below - eps) {
      cost += 1000 + (below - noteMidi) * 20;
    }

    return cost;
  };

  groups.forEach(g => {
    const t = g.time;
    expireHolds(t);

    // Sort pitches descending (highest first). Keep duplicates (unisons) as separate notes.
    const notes = [...g.notes].sort((a, b) => b.midi - a.midi);
    if (notes.length === 0) return;

    const holding = new Set(voiceOrderHighToLow.filter(v => !!held[v]));

    // If there is only 1 note and no holds, pick the closest voice center (prevents dumping into S always).
    if (notes.length === 1 && holding.size === 0) {
      const n = notes[0];
      let bestV = 'A';
      let bestD = Infinity;
      voiceOrderHighToLow.forEach(v => {
        const d = Math.abs(n.midi - centers[v]) + rangePenalty(n.midi, rangeByVoice[v]);
        if (d < bestD) {
          bestD = d;
          bestV = v;
        }
      });
      assign(bestV, n);
      return;
    }

    // Deterministic SATB for chord-ish groups. This guarantees we never label the lowest pitch as S.
    // We still respect holds by letting voices "move" even if the previous note hasn't ended (legato overlaps).
    const used = new Set();
    const currentPitchByVoice = {
      S: held.S?.midi ?? null,
      A: held.A?.midi ?? null,
      T: held.T?.midi ?? null,
      B: held.B?.midi ?? null
    };

    const assignVoice = (voice, note) => {
      used.add(voice);
      currentPitchByVoice[voice] = note.midi;
      assign(voice, note);
    };

    // If we have 4+ notes, map by rank to S/A/T/B (take the top 4).
    if (notes.length >= 4) {
      assignVoice('S', notes[0]);
      assignVoice('A', notes[1]);
      assignVoice('T', notes[2]);
      assignVoice('B', notes[notes.length - 1]);

      // Any remaining middle notes: assign to nearest of A/T by cost (rare in hymns).
      for (let i = 3; i < notes.length - 1; i++) {
        const n = notes[i];
        const cA = assignmentCost('A', n.midi, currentPitchByVoice);
        const cT = assignmentCost('T', n.midi, currentPitchByVoice);
        assignVoice(cA <= cT ? 'A' : 'T', n);
      }
      return;
    }

    // 3 notes: force outer voices, choose middle between A/T.
    if (notes.length === 3) {
      assignVoice('S', notes[0]);
      assignVoice('B', notes[2]);
      const mid = notes[1];
      const cA = assignmentCost('A', mid.midi, currentPitchByVoice);
      const cT = assignmentCost('T', mid.midi, currentPitchByVoice);
      const midVoice = cA <= cT ? 'A' : 'T';
      assignVoice(midVoice, mid);

      // If we're missing the other inner voice at this onset (common 4-part hymn doubling),
      // allow a unison by doubling the best-fitting existing pitch, *unless* that voice is
      // already holding a note across this onset.
      const otherInner = midVoice === 'A' ? 'T' : 'A';
      if (!held[otherInner]) {
        const candidates = [notes[0], notes[1], notes[2]];
        let best = candidates[1]; // default: double the middle pitch
        let bestC = Infinity;
        candidates.forEach(n => {
          const c = assignmentCost(otherInner, n.midi, currentPitchByVoice);
          if (c < bestC) {
            bestC = c;
            best = n;
          }
        });
        // Assign a clone so each voice gets its own note event (same pitch/time/duration).
        assignVoice(otherInner, { ...best });
      }
      return;
    }

    // 2 notes: choose the best pair among (S/A/T/B) while discouraging crossing.
    // This is more robust than always forcing S+B for two-part textures.
    if (notes.length === 2) {
      const high = notes[0];
      const low = notes[1];
      const voices = ['S', 'A', 'T', 'B'];
      let best = null;
      let bestC = Infinity;
      for (let i = 0; i < voices.length; i++) {
        for (let j = 0; j < voices.length; j++) {
          if (i === j) continue;
          const vh = voices[i];
          const vl = voices[j];
          // enforce ordering: higher voice should not be below lower voice
          const ch = assignmentCost(vh, high.midi, currentPitchByVoice);
          const cl = assignmentCost(vl, low.midi, currentPitchByVoice);
          const orderingPenalty = (voiceOrderHighToLow.indexOf(vh) > voiceOrderHighToLow.indexOf(vl)) ? 5000 : 0;
          const c = ch + cl + orderingPenalty;
          if (c < bestC) {
            bestC = c;
            best = { vh, vl };
          }
        }
      }
      if (best) {
        assignVoice(best.vh, high);
        assignVoice(best.vl, low);
      } else {
        // fallback
        assignVoice('S', high);
        assignVoice('B', low);
      }
      return;
    }

    // Shouldn't happen (notes.length === 1 handled above), but keep a safe fallback:
    assignVoice('A', notes[0]);
  });

  // Coalesce duplicates at same start time within each part
  Object.keys(parts).forEach(p => {
    parts[p] = coalescePartNotes(parts[p]);
  });

  const maxEnd = Math.max(...events.map(n => n.endTime), 0);
  return { parts, duration: maxEnd };
}

function coalescePartNotes(partNotes) {
  if (!Array.isArray(partNotes)) return partNotes;
  const out = [];
  partNotes.forEach(note => {
    const existing = out.find(n =>
      n.midi === note.midi &&
      Math.abs(n.startTime - note.startTime) < 1e-6
    );
    if (!existing) {
      out.push(note);
    }
  });
  return out;
}

/**
 * Detect key from MIDI notes (fallback if key signature not in file)
 * Uses the most common note as the likely key
 */
function detectKeyFromNotes(notes) {
  if (notes.length === 0) return 0; // Default to C
  
  // Count occurrences of each pitch class (0-11)
  const pitchClassCounts = new Array(12).fill(0);
  
  notes.forEach(note => {
    const pitchClass = note.midi % 12;
    pitchClassCounts[pitchClass]++;
  });
  
  // Find the most common pitch class
  const maxCount = Math.max(...pitchClassCounts);
  const keyMidi = pitchClassCounts.indexOf(maxCount);
  
  return keyMidi;
}

function scoreScaleFit(notes, tonicPc, steps) {
  const diatonic = new Set(steps.map(s => (s + tonicPc) % 12));
  let score = 0;
  notes.forEach(n => {
    const pc = n.midi % 12;
    if (diatonic.has(pc)) {
      score += 2; // in-scale
    } else {
      // penalize distance to nearest diatonic tone
      const distances = Array.from(diatonic).map(d => {
        const diff = ((pc - d + 12) % 12);
        return Math.min(diff, 12 - diff);
      });
      const minDist = Math.min(...distances);
      score -= (1 + minDist);
    }
  });
  return score;
}

function pickKey(notes, headerKeyMidi) {
  const candidates = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    candidates.push({
      tonic,
      mode: 'major',
      score: scoreScaleFit(notes, tonic, MAJOR_STEPS)
    });
    candidates.push({
      tonic,
      mode: 'minor',
      score: scoreScaleFit(notes, tonic, NAT_MINOR_STEPS)
    });
  }

  // If header key exists, give it a slight bias
  if (Number.isFinite(headerKeyMidi)) {
    candidates.forEach(c => {
      if (c.tonic === headerKeyMidi) {
        c.score += 1.5;
      }
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || { tonic: headerKeyMidi || 0, mode: 'major' };
}

export function analyzeKeyFromMidiData(midiData) {
  const notes = extractNoteEvents(midiData?.tracks || []);
  const headerKeyMidi = Number.isFinite(midiData?.keyMidi) ? midiData.keyMidi : null;

  const maxEnd = Math.max(...notes.map(n => (n.endTime ?? (n.startTime + (n.duration || 0)))), 0);
  const startWindow = Math.min(2.0, Math.max(0.75, maxEnd * 0.08));
  const endWindow = Math.min(2.5, Math.max(0.9, maxEnd * 0.10));

  const pcOf = (m) => ((m % 12) + 12) % 12;
  const collectPcSet = (t0, t1) => {
    const set = new Set();
    notes.forEach(n => {
      const st = n.startTime || 0;
      const et = n.endTime ?? (st + (n.duration || 0));
      if (et >= t0 && st <= t1) {
        set.add(pcOf(n.midi));
      }
    });
    return set;
  };
  const lowestMidiInWindow = (t0, t1) => {
    let low = null;
    notes.forEach(n => {
      const st = n.startTime || 0;
      const et = n.endTime ?? (st + (n.duration || 0));
      if (et >= t0 && st <= t1) {
        if (low === null || n.midi < low) low = n.midi;
      }
    });
    return low;
  };

  const startSet = collectPcSet(0, startWindow);
  const endSet = collectPcSet(Math.max(0, maxEnd - endWindow), maxEnd);
  const preEndSet = collectPcSet(Math.max(0, maxEnd - endWindow * 2), Math.max(0, maxEnd - endWindow));
  const endBassMidi = lowestMidiInWindow(Math.max(0, maxEnd - endWindow), maxEnd);
  const endBassPc = Number.isFinite(endBassMidi) ? pcOf(endBassMidi) : null;

  const weightedScaleFit = (tonicPc, steps) => {
    const diatonic = new Set(steps.map(s => (s + tonicPc) % 12));
    let score = 0;
    notes.forEach(n => {
      const pc = pcOf(n.midi);
      const w = Math.max(0.05, Math.min(2.5, n.duration || 0.25));
      if (diatonic.has(pc)) {
        score += 2 * w;
      } else {
        const distances = Array.from(diatonic).map(d => {
          const diff = ((pc - d + 12) % 12);
          return Math.min(diff, 12 - diff);
        });
        const minDist = Math.min(...distances);
        score -= (1 + minDist) * w;
      }
    });
    return score;
  };

  const cadenceBonus = (tonicPc, mode) => {
    const third = (tonicPc + (mode === 'minor' ? 3 : 4)) % 12;
    const fifth = (tonicPc + 7) % 12;
    const dominant = (tonicPc + 7) % 12;
    const leadingMajor = (tonicPc + 11) % 12;
    const leadingMinorNat = (tonicPc + 10) % 12;

    let bonus = 0;
    // Strong end resolution cues
    if (endSet.has(tonicPc)) bonus += 10;
    if (endBassPc === tonicPc) bonus += 8;
    if (endSet.has(third)) bonus += 3;
    if (endSet.has(fifth)) bonus += 2;
    if (endSet.has(tonicPc) && endSet.has(third) && endSet.has(fifth)) bonus += 5;

    // Dominant/leading tone before the end
    if (preEndSet.has(dominant)) bonus += 4;
    if (preEndSet.has(leadingMajor)) bonus += 2;
    if (mode === 'minor' && preEndSet.has(leadingMinorNat)) bonus += 1;

    // Beginning often starts on I or V
    if (startSet.has(tonicPc)) bonus += 2;
    if (startSet.has(dominant)) bonus += 1;

    return bonus;
  };

  // Build candidates the same way pickKey does so we can estimate confidence.
  const candidates = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    candidates.push({
      tonic,
      mode: 'major',
      score: weightedScaleFit(tonic, MAJOR_STEPS) + cadenceBonus(tonic, 'major')
    });
    candidates.push({
      tonic,
      mode: 'minor',
      score: weightedScaleFit(tonic, NAT_MINOR_STEPS) + cadenceBonus(tonic, 'minor')
    });
  }
  if (Number.isFinite(headerKeyMidi)) {
    candidates.forEach(c => {
      if (c.tonic === headerKeyMidi) c.score += 1.5;
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0] || { tonic: 0, mode: 'major', score: 0 };
  const runnerUp = candidates[1] || { tonic: top.tonic, mode: top.mode, score: top.score };

  // Confidence: separation between best and second-best, normalized against both magnitudes.
  // This stays meaningful even if scores are negative.
  const diff = (top.score || 0) - (runnerUp.score || 0);
  const denom = Math.max(1e-6, Math.abs(top.score || 0) + Math.abs(runnerUp.score || 0));
  const confidence = Math.max(0, Math.min(1, diff / denom));

  return {
    tonic: top.tonic,
    mode: top.mode,
    score: top.score,
    runnerUp: { tonic: runnerUp.tonic, mode: runnerUp.mode, score: runnerUp.score },
    confidence
  };
}

/**
 * Parse MIDI file and convert to exercise format
 * @param {ArrayBuffer} arrayBuffer - MIDI file data
 * @param {string} label - Exercise label
 * @returns {Object} Exercise in format { label, duration, parts: { S, A, T, B }, midiKeyMidi, isMidiExercise }
 */
export async function parseMidiToExercise(arrayBuffer, label, options = {}) {
  const midiData = await parseMidiFile(arrayBuffer);
  let noteEvents = extractNoteEvents(midiData.tracks);
  
  // Try to detect parts from tracks first
  let partMapping = null;
  if (midiData.tracks.length >= 2) {
    partMapping = detectPartsFromTracks(midiData.tracks);
    // Only use if we got at least 2 parts
    const mappedParts = Object.values(partMapping);
    if (mappedParts.length < 2) {
      partMapping = null; // Fall back to range-based separation
    }
  }
  
  // Key detection: only trust explicit MIDI key signatures
  // If caller provides a forced key (e.g., user confirmed), use it.
  let keyGuess;
  if (options.forceKey && Number.isFinite(options.forceKey.tonic)) {
    keyGuess = { tonic: options.forceKey.tonic, mode: options.forceKey.mode || 'major' };
  } else {
    // Only use explicit key signature from MIDI header
    if (Number.isFinite(midiData.keyMidi)) {
      keyGuess = { tonic: midiData.keyMidi, mode: 'major' };
    } else {
      // No explicit key - will need user prompt
      keyGuess = null;
    }
  }

  // Always compute an analysis guess (for UI), even if we don't trust it as authoritative.
  const analysisGuess = analyzeKeyFromMidiData(midiData);

  let exercise;
  // Special case: many hymn MIDIs are 2 tracks (SA combined, TB combined). Split with voice-leading.
  const twoTrackSplit = splitSATBFromTwoTracks(midiData.tracks);
  if (twoTrackSplit) {
    exercise = { duration: twoTrackSplit.duration, parts: twoTrackSplit.parts };
  } else {
    // If there's only a single track with notes, do a chord-tone SATB split with hold/rest awareness.
    const oneTrackSplit = splitSATBFromOneTrack(midiData.tracks);
    if (oneTrackSplit) {
      exercise = { duration: oneTrackSplit.duration, parts: oneTrackSplit.parts };
    } else {
      exercise = mapMidiToExerciseFormat(noteEvents, partMapping);
    }
  }
  exercise.label = label;
  
  // Store key info for solfege display and transpose.
  // If no explicit/forced key exists, fall back to analysis guess to avoid null crashes;
  // callers that require confirmation should still prompt and pass forceKey.
  const safeKey = keyGuess || { tonic: analysisGuess.tonic, mode: analysisGuess.mode };
  exercise.midiKeyMidi = safeKey.tonic;
  exercise.midiKeyMode = safeKey.mode;
  exercise.isMidiExercise = true; // Flag to indicate this is a MIDI exercise
  
  return {
    exercise,
    keyGuess,
    analysisGuess
  };
}

