/**
 * Tempo scaling utilities
 * Scales note timings for audio playback while keeping display positions fixed
 */

/**
 * Scale a single note's timing for tempo
 * @param {Object} note - Note object with startTime and duration
 * @param {number} tempo - Target tempo in BPM
 * @param {number} baseTempo - Base tempo (default 60 BPM)
 * @returns {Object} Scaled note with new startTime and duration
 */
export function scaleNoteForTempo(note, tempo, baseTempo = 60) {
  const tempoScale = baseTempo / tempo; // At 60 BPM, scale = 1.0, at 120 BPM scale = 0.5
  return {
    ...note,
    startTime: note.startTime * tempoScale,
    duration: note.duration * tempoScale
  };
}

/**
 * Scale an array of notes for tempo
 * @param {Array<Object>} notes - Array of note objects
 * @param {number} tempo - Target tempo in BPM
 * @param {number} baseTempo - Base tempo (default 60 BPM)
 * @returns {Array<Object>} Array of scaled notes
 */
export function scaleNotesForTempo(notes, tempo, baseTempo = 60) {
  const tempoScale = baseTempo / tempo;
  return notes.map(note => ({
    ...note,
    startTime: note.startTime * tempoScale,
    duration: note.duration * tempoScale
  }));
}

/**
 * Scale a stanza's notes for tempo
 * @param {Object} stanza - Stanza object with notes array
 * @param {number} tempo - Target tempo in BPM
 * @param {number} baseTempo - Base tempo (default 60 BPM)
 * @returns {Object} Scaled stanza with new note timings
 */
export function scaleStanzaForTempo(stanza, tempo, baseTempo = 60) {
  const tempoScale = baseTempo / tempo;
  return {
    ...stanza,
    notes: scaleNotesForTempo(stanza.notes, tempo, baseTempo),
    // Scale duration if provided
    duration: stanza.duration !== undefined ? stanza.duration * tempoScale : undefined,
    // If stanza has parts (SATB), scale those too
    parts: stanza.parts ? {
      S: scaleNotesForTempo(stanza.parts.S || [], tempo, baseTempo),
      A: scaleNotesForTempo(stanza.parts.A || [], tempo, baseTempo),
      T: scaleNotesForTempo(stanza.parts.T || [], tempo, baseTempo),
      B: scaleNotesForTempo(stanza.parts.B || [], tempo, baseTempo)
    } : undefined
  };
}

/**
 * Scale multiple stanzas for tempo
 * @param {Array<Object>} stanzas - Array of stanza objects
 * @param {number} tempo - Target tempo in BPM
 * @param {number} baseTempo - Base tempo (default 60 BPM)
 * @returns {Array<Object>} Array of scaled stanzas
 */
export function scaleStanzasForTempo(stanzas, tempo, baseTempo = 60) {
  return stanzas.map(stanza => scaleStanzaForTempo(stanza, tempo, baseTempo));
}

