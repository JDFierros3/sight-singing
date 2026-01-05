/**
 * Instrument manager using Tone.js Sampler
 * Loads realistic instrument samples for playback
 */

import { getAudioContext, ensureAudioContext } from './context.js';

let currentSampler = null;
let currentInstrumentName = 'sine';
let isLoading = false;

// Map of instrument names to their sample URLs
const INSTRUMENT_SAMPLES = {
  'acoustic_grand_piano': {
    name: 'Piano',
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    notes: {
      'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', 'A1': 'A1.mp3',
      'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2': 'A2.mp3',
      'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3',
      'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3',
      'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5': 'A5.mp3',
      'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', 'A6': 'A6.mp3',
      'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', 'A7': 'A7.mp3', 'C8': 'C8.mp3'
    }
  }
};

/**
 * Load an instrument sampler
 * @param {string} instrumentName - Name of the instrument
 * @returns {Promise<void>}
 */
export async function loadInstrument(instrumentName) {
  if (instrumentName === 'sine') {
    console.log('✅ Switching to sine wave (oscillator mode)');
    if (currentSampler) {
      currentSampler.dispose();
      currentSampler = null;
    }
    currentInstrumentName = 'sine';
    return;
  }
  
  if (currentInstrumentName === instrumentName && currentSampler) {
    console.log(`✅ Instrument ${instrumentName} already loaded`);
    return;
  }
  
  if (isLoading) {
    console.log('⏳ Instrument already loading...');
    return;
  }
  
  isLoading = true;
  await ensureAudioContext();
  
  try {
    // Check if Tone.js is available
    if (typeof Tone === 'undefined') {
      throw new Error('Tone.js library not loaded');
    }
    
    // Get instrument configuration
    const instrumentConfig = INSTRUMENT_SAMPLES[instrumentName];
    if (!instrumentConfig) {
      // For instruments we don't have samples for, fall back to piano
      console.warn(`⚠️ No samples for ${instrumentName}, using piano`);
      return await loadInstrument('acoustic_grand_piano');
    }
    
    console.log(`🎵 Loading ${instrumentConfig.name}...`);
    
    // Dispose of old sampler
    if (currentSampler) {
      currentSampler.dispose();
    }
    
    // Create new sampler with instrument samples
    const urls = {};
    for (const [note, filename] of Object.entries(instrumentConfig.notes)) {
      urls[note] = filename;
    }
    
    currentSampler = new Tone.Sampler({
      urls: urls,
      baseUrl: instrumentConfig.baseUrl,
      onload: () => {
        console.log(`✅ ${instrumentConfig.name} loaded successfully!`);
      },
      onerror: (error) => {
        console.error(`❌ Error loading ${instrumentConfig.name}:`, error);
      }
    }).toDestination();
    
    currentInstrumentName = instrumentName;
    
    // Wait for samples to load
    await Tone.loaded();
    console.log(`✅ All samples loaded for ${instrumentConfig.name}`);
    
  } catch (error) {
    console.error(`❌ Failed to load instrument ${instrumentName}:`, error);
    if (currentSampler) {
      currentSampler.dispose();
    }
    currentSampler = null;
    currentInstrumentName = 'sine';
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Play a note with the current instrument
 * @param {number} midiNote - MIDI note number (0-127)
 * @param {number} duration - Duration in seconds
 * @param {number} gain - Volume (0-1)
 * @returns {Object|null} - Note object with stop method, or null
 */
export function playInstrumentNote(midiNote, duration, gain = 0.5) {
  if (!currentSampler) {
    return null; // Fall back to oscillator
  }
  
  try {
    // Convert MIDI number to note name (e.g., 60 -> "C4")
    const noteName = Tone.Frequency(midiNote, 'midi').toNote();
    
    // Set volume
    currentSampler.volume.value = Tone.gainToDb(gain);
    
    // Trigger attack and release
    currentSampler.triggerAttackRelease(noteName, duration);
    
    // Return a simple object with a stop method for compatibility
    return {
      stop: () => {
        currentSampler.triggerRelease(noteName);
      }
    };
  } catch (error) {
    console.error('Error playing instrument note:', error);
    return null;
  }
}

/**
 * Stop a note (Tone.js handles this automatically)
 * @param {Object} note - Note object
 */
export function stopInstrumentNote(note) {
  if (note && note.stop) {
    try {
      note.stop();
    } catch (error) {
      // Ignore errors, Tone.js may have already released the note
    }
  }
}

/**
 * Get the current instrument name
 * @returns {string}
 */
export function getCurrentInstrument() {
  return currentInstrumentName;
}

/**
 * Check if using a sampled instrument (not sine wave)
 * @returns {boolean}
 */
export function isUsingSoundfont() {
  return currentInstrumentName !== 'sine' && currentSampler !== null;
}

/**
 * Stop all currently playing instrument notes
 */
export function stopAllInstrumentNotes() {
  if (currentSampler) {
    try {
      currentSampler.releaseAll();
    } catch (error) {
      console.error('Error stopping all notes:', error);
    }
  }
}
