/**
 * Oscillator creation and management
 */

import { getAudioContext } from './context.js';

export function createOscillator(freq, type = 'sine', gain = 0.15) {
  const ctx = getAudioContext();
  if (!ctx) {
    return null;
  }
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  // Store target gain for fade in
  gainNode.gain.value = 0; // Start at 0 for fade in
  gainNode._targetGain = gain; // Store target gain
  oscillator.type = type;
  oscillator.frequency.value = freq;
  
  return { osc: oscillator, g: gainNode };
}

export function startOscillator(oscillator) {
  if (oscillator && oscillator.osc && oscillator.g) {
    const ctx = oscillator.osc.context;
    const currentTime = ctx.currentTime;
    const targetGain = oscillator.g._targetGain || 0.15;
    const fadeInTime = 0.05; // 50ms fade in for smoother transition (increased to reduce clicks)
    
    // Ensure gain starts at 0
    oscillator.g.gain.cancelScheduledValues(currentTime);
    oscillator.g.gain.setValueAtTime(0, currentTime);
    
    // Start oscillator (must be connected first)
    oscillator.osc.start();
    
    // Fade in using exponential ramp for smoother audio transition
    oscillator.g.gain.exponentialRampToValueAtTime(targetGain, currentTime + fadeInTime);
  }
}

export function stopOscillator(oscillator) {
  if (!oscillator) {
    return;
  }
  
  try {
    if (oscillator.osc && oscillator.g) {
      const ctx = oscillator.osc.context;
      const currentTime = ctx.currentTime;
      const fadeOutTime = 0.05; // 50ms fade out for smoother transition (increased to reduce clicks)
      const minGain = 0.0001; // Minimum gain for exponential ramp (can't go to exactly 0)
      
      // Get current gain value
      let currentGain;
      try {
        currentGain = oscillator.g.gain.value;
        // Ensure we have a valid gain value
        if (currentGain <= 0 || !isFinite(currentGain)) {
          currentGain = oscillator.g._targetGain || 0.15;
        }
      } catch (e) {
        currentGain = oscillator.g._targetGain || 0.15;
      }
      
      // Cancel any scheduled changes
      oscillator.g.gain.cancelScheduledValues(currentTime);
      
      // Set current gain and fade out smoothly using exponential ramp
      oscillator.g.gain.setValueAtTime(currentGain, currentTime);
      oscillator.g.gain.exponentialRampToValueAtTime(minGain, currentTime + fadeOutTime);
      
      // Set to 0 after exponential ramp (exponential can't go to exactly 0)
      oscillator.g.gain.setValueAtTime(0, currentTime + fadeOutTime + 0.001);
      
      // Stop and disconnect after fade out completes
      const stopTimeMs = (fadeOutTime * 1000) + 5; // Slightly longer than fade out
      setTimeout(() => {
        try {
          if (oscillator.osc) {
            oscillator.osc.stop();
            oscillator.osc.disconnect();
          }
          if (oscillator.g) {
            oscillator.g.disconnect();
          }
          if (oscillator.p) {
            oscillator.p.disconnect();
          }
        } catch (error) {
          // May already be stopped/disconnected
        }
      }, stopTimeMs);
    }
  } catch (error) {
    // Oscillator may already be stopped
    try {
      if (oscillator.osc) {
        oscillator.osc.stop();
        oscillator.osc.disconnect();
      }
      if (oscillator.g) {
        oscillator.g.disconnect();
      }
      if (oscillator.p) {
        oscillator.p.disconnect();
      }
    } catch (e) {
      // Ignore
    }
  }
}

export function connectOscillatorToDestination(oscillator, destination, pan = 0) {
  if (oscillator && oscillator.osc && oscillator.g) {
    oscillator.osc.connect(oscillator.g);
    // pan === 0 (every existing caller) keeps the original osc -> gain -> destination graph.
    // A non-zero pan (Live Sing) inserts a StereoPanner to place the tone in one ear.
    if (pan !== 0) {
      const panner = oscillator.osc.context.createStereoPanner();
      panner.pan.value = pan;
      oscillator.g.connect(panner);
      panner.connect(destination);
      oscillator.p = panner; // stash for cleanup in stopOscillator
    } else {
      oscillator.g.connect(destination);
    }
  }
}

