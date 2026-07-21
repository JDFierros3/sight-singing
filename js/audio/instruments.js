/**
 * Instrument manager using Tone.js Sampler
 * Loads realistic instrument samples for playback
 */

import { getAudioContext, ensureAudioContext } from './context.js';
import { midiToNoteName } from '../utils/musicTheory.js';

let currentSampler = null; // legacy single sampler (kept for non-part playback)
let partSamplers = null; // Map<string, Tone.Sampler>
let partPanners = null; // Map<string, Tone.Panner> — routes each part to one ear (Live Sing). pan 0 = centered/transparent.
let currentInstrumentName = 'sine';
let isLoading = false;
let currentSoundfont = null;
let currentBackend = 'none'; // 'none' | 'toneSampler' | 'soundfont'
let activeSoundfontNotes = new Set();

export function unloadInstrument() {
  try {
    if (partSamplers) {
      for (const sampler of partSamplers.values()) {
        try {
          sampler.releaseAll?.();
        } catch (e) {}
        try {
          sampler.dispose();
        } catch (e) {}
      }
    }
    if (partPanners) {
      for (const panner of partPanners.values()) {
        try {
          panner.dispose();
        } catch (e) {}
      }
    }
    if (currentSampler) {
      try {
        currentSampler.releaseAll?.();
      } catch (e) {}
      try {
        currentSampler.dispose();
      } catch (e) {}
    }
    if (currentSoundfont) {
      try {
        activeSoundfontNotes.forEach(n => {
          try { n.stop?.(); } catch (e) {}
        });
      } finally {
        activeSoundfontNotes = new Set();
      }
      currentSoundfont = null;
    }
  } finally {
    currentSampler = null;
    partSamplers = null;
    partPanners = null;
    currentInstrumentName = 'sine';
    isLoading = false;
    currentBackend = 'none';
  }
}

/**
 * Live-update the stereo pan for a single SATB part (piano/sampler backend).
 * pan: -1 = full left, 0 = center, +1 = full right. No-op for the choir/soundfont
 * backend, which stays centered in v1.
 */
export function setPartPan(part, pan) {
  if (partPanners && partPanners.get(part)) {
    try {
      partPanners.get(part).pan.rampTo(pan, 0.02);
    } catch (e) {
      partPanners.get(part).pan.value = pan;
    }
  }
}

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
    unloadInstrument();
    return;
  }
  
  if (currentInstrumentName === instrumentName && (currentSampler || partSamplers || currentSoundfont)) {
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
    // Choir uses soundfont-player (more reliable than trying to find Tone sampler assets)
    if (instrumentName === 'choir_aahs' || instrumentName === 'voice_oohs') {
      unloadInstrument();
      const ctx = getAudioContext();
      if (!ctx) throw new Error('AudioContext not available');

      console.log(`🎵 Loading ${instrumentName} via soundfont-player...`);
      
      try {
        // Try to load soundfont-player from global (if loaded via script tag) or dynamic import
        let Soundfont = window.Soundfont;
        if (!Soundfont) {
          // Try unpkg as alternative CDN
          try {
            const module = await import('https://unpkg.com/soundfont-player@0.12.0/dist/soundfont-player.min.js');
            Soundfont = window.Soundfont;
          } catch (e) {
            console.warn('Dynamic import failed, checking for global Soundfont...');
          }
        }
        
        if (!Soundfont) {
          throw new Error('Soundfont-player library not available. Add <script src="https://unpkg.com/soundfont-player@0.12.0/dist/soundfont-player.min.js"></script> to your HTML.');
        }
        
        // Use FluidR3_GM hosted at gleitz
        currentSoundfont = await Soundfont.instrument(ctx, instrumentName, {
          soundfont: 'FluidR3_GM',
          format: 'mp3'
        });
        currentInstrumentName = instrumentName;
        currentBackend = 'soundfont';
        console.log(`✅ ${instrumentName} loaded successfully via soundfont-player!`);
        return;
      } catch (soundfontError) {
        console.error(`❌ Failed to load ${instrumentName} via soundfont-player:`, soundfontError);
        console.log('⚠️ Falling back to piano...');
        // Fall back to piano if choir fails
        isLoading = false;
        return await loadInstrument('acoustic_grand_piano');
      }
    }

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
    
    // Dispose of old samplers
    unloadInstrument();
    
    // Create new sampler with instrument samples
    const urls = {};
    for (const [note, filename] of Object.entries(instrumentConfig.notes)) {
      urls[note] = filename;
    }
    
    const makeSampler = (connectToDestination = true) => {
      const sampler = new Tone.Sampler({
        urls: urls,
        baseUrl: instrumentConfig.baseUrl,
        onload: () => {
          console.log(`✅ ${instrumentConfig.name} loaded successfully!`);
        },
        onerror: (error) => {
          console.error(`❌ Error loading ${instrumentConfig.name}:`, error);
        }
      });
      // Non-part samplers connect straight to the destination (unchanged behavior).
      return connectToDestination ? sampler.toDestination() : sampler;
    };

    // For SATB (and any part-based playback), use one sampler per part so volumes can differ.
    // Each part routes through its own Panner so a single voice can be placed in one ear (Live Sing).
    // A Panner at 0 is centered/transparent, so SATB (which never sets pan) sounds identical.
    partSamplers = new Map();
    partPanners = new Map();
    ['S', 'A', 'T', 'B'].forEach(p => {
      const sampler = makeSampler(false);
      const panner = new Tone.Panner(0).toDestination();
      sampler.connect(panner);
      partSamplers.set(p, sampler);
      partPanners.set(p, panner);
    });
    // Also keep a default sampler for non-part playback (warmups/intervals/etc).
    currentSampler = makeSampler();
    
    currentInstrumentName = instrumentName;
    currentBackend = 'toneSampler';
    
    // Wait for samples to load
    await Tone.loaded();
    console.log(`✅ All samples loaded for ${instrumentConfig.name}`);
    
  } catch (error) {
    console.error(`❌ Failed to load instrument ${instrumentName}:`, error);
    unloadInstrument();
    currentSoundfont = null;
    activeSoundfontNotes = new Set();
    currentInstrumentName = 'sine';
    currentBackend = 'none';
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
export function playInstrumentNote(midiNote, duration, gain = 0.5, part = null, pan = 0) {
  try {
    if (currentBackend === 'toneSampler') {
      const sampler = (partSamplers && part && partSamplers.get(part)) ? partSamplers.get(part) : currentSampler;
      if (!sampler) return null;
      // Place this part in one ear (Live Sing). Center (0) for every other caller.
      if (pan !== 0 && partPanners && partPanners.get(part)) {
        partPanners.get(part).pan.value = pan;
      }
      const noteName = Tone.Frequency(midiNote, 'midi').toNote();
      sampler.volume.value = Tone.gainToDb(gain);
      sampler.triggerAttackRelease(noteName, duration);
      return {
        stop: () => {
          sampler?.triggerRelease(noteName);
        }
      };
    }

    if (currentBackend === 'soundfont') {
      if (!currentSoundfont) return null;
      const noteName = midiToNoteName(midiNote);
      const node = currentSoundfont.play(noteName, 0, { gain, duration });
      if (node) activeSoundfontNotes.add(node);
      return {
        stop: () => {
          try { node?.stop?.(); } catch (e) {}
          activeSoundfontNotes.delete(node);
        }
      };
    }

    return null; // fall back to oscillator
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
  return currentInstrumentName !== 'sine' && (currentSampler !== null || partSamplers !== null || currentSoundfont !== null);
}

/**
 * Stop all currently playing instrument notes
 */
export function stopAllInstrumentNotes() {
  if (partSamplers) {
    for (const sampler of partSamplers.values()) {
      try {
        sampler.releaseAll();
      } catch (error) {}
    }
  }
  if (currentSampler) {
    try {
      currentSampler.releaseAll();
    } catch (error) {
      console.error('Error stopping all notes:', error);
    }
  }
  if (currentSoundfont) {
    try {
      activeSoundfontNotes.forEach(n => {
        try { n.stop?.(); } catch (e) {}
      });
    } finally {
      activeSoundfontNotes = new Set();
    }
  }
}
