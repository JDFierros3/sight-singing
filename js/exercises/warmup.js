/**
 * Warmup exercise sequences
 */

import { getElementById, setTextContent } from '../utils/dom.js';
import { ensureAudioContext, getAudioContext } from '../audio/context.js';
import { stopAllDroneOscillators } from '../audio/drone.js';
import { createOscillator, startOscillator, stopOscillator, connectOscillatorToDestination } from '../audio/oscillator.js';
import { appState } from '../state/appState.js';
import { midiToFrequency } from '../utils/audioMath.js';
import { buildArpeggioUp, buildArpeggioDown } from './chords.js';
import { stanzaSequencePlayer } from '../player/sequencePlayer.js';
import { scheduleNotes, waitWithValidation } from '../player/noteScheduler.js';
import { isValidSequence, getCurrentSequenceId, trackBadgeTimeout, removeBadgeTimeout } from '../player/sequenceManager.js';
import { isUsingSoundfont, playInstrumentNote, stopInstrumentNote } from '../audio/instruments.js';

// Track active warmup oscillators so we can stop them
let activeWarmupOscillators = [];

export async function runWarmupSequence(selectedStanzaIndices = null) {
  await ensureAudioContext();
  
  // Set warmupRunning flag
  appState.exercise.warmupRunning = true;
  updateWarmupButton(true);
  
  const badge = getElementById('warmupBadge');
  // Reset badge immediately when starting
  setTextContent(badge, '—');
  
  const allStanzas = buildWarmupPlan();
  
  // Create audio setup callback for warmup-specific note playing
  const audioSetup = async (scaledStanza, sequenceId) => {
    // Schedule all notes to play at their times
    // Don't wait here - the sequence player will handle timing
    scheduleNotes(scaledStanza.notes, sequenceId, async (note, seqId) => {
      if (!isValidSequence(seqId) || !appState.exercise.warmupRunning) {
        return;
      }
      
      const gain = appState.drone.gain;
      
      // Try to use instrument if available
      if (isUsingSoundfont()) {
        const instrumentNote = playInstrumentNote(note.midi, note.duration, gain);
        if (instrumentNote) {
          activeWarmupOscillators.push(instrumentNote);
          
          // Wait for the note duration
          await waitWithValidation(
            note.duration * 1000,
            seqId,
            () => appState.exercise.warmupRunning
          );
          
          // Remove from tracking
          const index = activeWarmupOscillators.indexOf(instrumentNote);
          if (index > -1) {
            activeWarmupOscillators.splice(index, 1);
          }
          return;
        }
      }
      
      // Fall back to oscillator
      const frequency = midiToFrequency(note.midi, appState.tuning.a4);
      const oscillator = createWarmupOscillator(frequency, gain);
      
      if (oscillator) {
        // Track this oscillator so we can stop it if warmup is stopped
        activeWarmupOscillators.push(oscillator);
        
        // Play for the note duration
        const stillValid = await waitWithValidation(
          note.duration * 1000,
          seqId,
          () => appState.exercise.warmupRunning
        );
        
        // Only stop if this is still the current sequence
        if (stillValid && isValidSequence(seqId)) {
          stopWarmupOscillator(oscillator);
          // Remove from tracking
          const index = activeWarmupOscillators.indexOf(oscillator);
          if (index > -1) {
            activeWarmupOscillators.splice(index, 1);
          }
        }
      }
    });
    
    // Don't wait here - return immediately and let the sequence player handle timing
    // The sequence player will wait for the stanza duration
  };
  
  // Start the sequence using the player
  await stanzaSequencePlayer.startSequence(allStanzas, {
    selectedStanzaIndices: selectedStanzaIndices,
    tempo: appState.staff.tempo,
    baseGain: appState.drone.gain,
    onStanzaStart: (stanza, index, sequenceId) => {
      // Update badge for current stanza
      if (stanza.label) {
        setTextContent(badge, stanza.label);
      }
    },
    onStanzaEnd: (stanza, index, sequenceId) => {
      // Stanza ended
    },
    audioSetup: audioSetup,
    onComplete: () => {
      appState.exercise.warmupRunning = false;
      updateWarmupButton(false);
      
      // Update badge to done
      const sequenceId = getCurrentSequenceId();
      setTextContent(badge, 'done');
      const timeoutId = setTimeout(() => {
        if (isValidSequence(sequenceId)) {
          setTextContent(badge, '—');
        }
        removeBadgeTimeout(timeoutId, sequenceId);
      }, 1500);
      trackBadgeTimeout(timeoutId, sequenceId);
    },
    onStop: () => {
      appState.exercise.warmupRunning = false;
      updateWarmupButton(false);
      stopAllWarmupOscillators();
      stopAllDroneOscillators();
      
      // Update badge to stopped
      const sequenceId = getCurrentSequenceId();
      setTextContent(badge, 'stopped');
      const timeoutId = setTimeout(() => {
        if (isValidSequence(sequenceId)) {
          setTextContent(badge, '—');
        }
        removeBadgeTimeout(timeoutId, sequenceId);
      }, 1000);
      trackBadgeTimeout(timeoutId, sequenceId);
    }
  });
  
  // Cleanup if sequence ended normally
  if (appState.exercise.warmupRunning) {
    appState.exercise.warmupRunning = false;
    updateWarmupButton(false);
  }
  stopAllWarmupOscillators();
  stopAllDroneOscillators();
}

export function stopWarmupSequence() {
  if (!appState.exercise.warmupRunning) {
    return; // Not running, nothing to stop
  }
  
  // Stop the sequence using the player
  stanzaSequencePlayer.stopSequence();
}

function stopAllWarmupOscillators() {
  // Stop all active warmup oscillators
  activeWarmupOscillators.forEach(oscillator => {
    stopWarmupOscillator(oscillator);
  });
  activeWarmupOscillators = [];
}


function updateWarmupButton(isRunning) {
  const button = getElementById('btnWarmup');
  const tempoSlider = getElementById('warmupTempo');
  
  if (button) {
    if (isRunning) {
      button.textContent = 'Stop Warm Up';
      button.classList.add('bad');
      button.classList.remove('primary');
    } else {
      button.textContent = 'Play Warm Up';
      button.classList.remove('bad');
      button.classList.add('primary');
    }
  }
  
  // Disable/enable tempo slider during playback to prevent timing issues
  if (tempoSlider) {
    tempoSlider.disabled = isRunning;
  }
}

function buildWarmupPlan() {
  // Return all warmup stanzas for scrolling display
  const stanzas = [];
  
  // Basic scales
  stanzas.push(createStanza1()); // Major scale up
  stanzas.push(createStanza2()); // Major scale down
  
  // Intervals
  stanzas.push(createStanza3()); // Intervals from Do (up)
  stanzas.push(createStanza4()); // Intervals from Do (down)
  
  // Arpeggios - all ascending in one stanza
  stanzas.push(createAllArpeggiosStanza('up'));
  
  // Arpeggios - all descending in one stanza
  stanzas.push(createAllArpeggiosStanza('down'));
  
  return stanzas;
}


function createStanza1() {
  // Major scale up - 8 notes, quarter notes
  const scaleDegrees = [0, 2, 4, 5, 7, 9, 11, 12];
  const noteDuration = 0.5; // Quarter note at 60 BPM = 0.5 seconds
  const notes = scaleDegrees.map((degree, index) => ({
    midi: appState.tuning.doMidi + degree,
    startTime: index * noteDuration,
    duration: noteDuration
  }));
  
  // Duration is when the last note ends
  const duration = (notes.length - 1) * noteDuration + noteDuration;
  
  return {
    label: 'Major scale ↑',
    notes: notes,
    duration: duration // Total duration of the stanza
  };
}

function createStanza2() {
  // Major scale down - 8 notes
  const scaleDegrees = [12, 11, 9, 7, 5, 4, 2, 0];
  const baseNoteDuration = 0.5;
  const notes = scaleDegrees.map((degree, index) => ({
    midi: appState.tuning.doMidi + degree,
    startTime: index * baseNoteDuration,
    duration: baseNoteDuration
  }));
  
  // Duration is when the last note ends
  const duration = (notes.length - 1) * baseNoteDuration + baseNoteDuration;
  
  return {
    label: 'Major scale ↓',
    notes: notes,
    duration: duration
  };
}

function createStanza3() {
  // Intervals from Do (up)
  const intervals = [0, 2, 0, 4, 0, 5, 0, 7, 0, 9, 0, 11, 0, 12];
  const baseNoteDuration = 0.5;
  const notes = intervals.map((degree, index) => ({
    midi: appState.tuning.doMidi + degree,
    startTime: index * baseNoteDuration,
    duration: baseNoteDuration
  }));
  
  // Duration is when the last note ends
  const duration = (notes.length - 1) * baseNoteDuration + baseNoteDuration;
  
  return {
    label: 'Intervals from Do ↑',
    notes: notes,
    duration: duration
  };
}

function createStanza4() {
  // Intervals from Do (down)
  // Pattern: high Do, then step down (Ti, La, Sol, Fa, Mi, Re, Do),
  // always returning to high Do between each target interval.
  //
  // This matches the “Intervals from Do” drill style used in shape-note contexts.
  const intervals = [12, 11, 12, 9, 12, 7, 12, 5, 12, 4, 12, 2, 12, 0];
  const baseNoteDuration = 0.5;
  const notes = intervals.map((degree, index) => ({
    midi: appState.tuning.doMidi + degree,
    startTime: index * baseNoteDuration,
    duration: baseNoteDuration
  }));
  
  // Duration is when the last note ends
  const duration = (notes.length - 1) * baseNoteDuration + baseNoteDuration;
  
  return {
    label: 'Intervals from Do ↓',
    notes: notes,
    duration: duration
  };
}

function createAllArpeggiosStanza(direction) {
  const degrees = [0, 2, 4, 5, 7, 9];
  const allNotes = [];
  let currentTime = 0;
  const baseNoteDuration = 0.5;
  
  degrees.forEach(degree => {
    const arpeggioSemis = direction === 'up' 
      ? buildArpeggioUp(degree)
      : buildArpeggioDown(degree);
    
    arpeggioSemis.forEach(semi => {
      allNotes.push({
        midi: appState.tuning.doMidi + degree + semi,
        startTime: currentTime,
        duration: baseNoteDuration
      });
      currentTime += baseNoteDuration;
    });
  });
  
  // Duration is when the last note ends
  const duration = allNotes.length > 0 
    ? (allNotes[allNotes.length - 1].startTime + allNotes[allNotes.length - 1].duration)
    : 0;
  
  const label = `Arpeggios (${direction === 'up' ? '↑' : '↓'})`;
  
  return {
    label: label,
    notes: allNotes,
    duration: duration
  };
}



function createWarmupOscillator(freq, gain) {
  const ctx = getAudioContext();
  if (!ctx) {
    return null;
  }
  
  const oscillator = createOscillator(freq, 'sine', gain);
  if (oscillator) {
    // Connect first, then start (this ensures proper audio graph setup)
    connectOscillatorToDestination(oscillator, ctx.destination);
    // startOscillator will handle the fade in
    startOscillator(oscillator);
  }
  
  return oscillator;
}

function stopWarmupOscillator(oscillator) {
  if (oscillator && oscillator.stop) {
    // Instrument note
    stopInstrumentNote(oscillator);
  } else {
    // Regular oscillator
    stopOscillator(oscillator);
  }
}


