/**
 * MIDI file parsing utilities
 * Parses MIDI files and converts them to exercise format
 */

import { PART_RANGES } from '../config/constants.js';

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
  
  // Calculate total duration
  const allEndTimes = notes.map(n => n.endTime);
  const maxEndTime = Math.max(...allEndTimes, 0);
  
  return {
    duration: maxEndTime,
    parts: parts
  };
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

/**
 * Parse MIDI file and convert to exercise format
 * @param {ArrayBuffer} arrayBuffer - MIDI file data
 * @param {string} label - Exercise label
 * @returns {Object} Exercise in format { label, duration, parts: { S, A, T, B }, midiKeyMidi, isMidiExercise }
 */
export async function parseMidiToExercise(arrayBuffer, label) {
  const midiData = await parseMidiFile(arrayBuffer);
  const noteEvents = extractNoteEvents(midiData.tracks);
  
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
  
  const exercise = mapMidiToExerciseFormat(noteEvents, partMapping);
  exercise.label = label;
  
  // Determine the key for this MIDI file
  // Use key signature if available, otherwise detect from notes
  let keyMidi = midiData.keyMidi;
  if (!Number.isFinite(keyMidi)) {
    // Fallback: detect key from notes
    keyMidi = detectKeyFromNotes(noteEvents);
  }
  
  // Store the MIDI file's key (as pitch class 0-11, where 0=C, 7=G)
  // This will be used for solfege display
  exercise.midiKeyMidi = keyMidi;
  exercise.isMidiExercise = true; // Flag to indicate this is a MIDI exercise
  
  // Debug logging
  console.log(`MIDI file "${label}" key detected:`, {
    keySignature: midiData.keyMidi,
    keyPitchClass: keyMidi,
    keyName: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][keyMidi],
    noteCount: noteEvents.length
  });
  
  return exercise;
}

