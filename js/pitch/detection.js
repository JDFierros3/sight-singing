/**
 * Pitch detection using autocorrelation
 */

import { microphone } from '../audio/microphone.js';
import { getAudioContext } from '../audio/context.js';
import { centsBetween } from '../utils/audioMath.js';
import { appState } from '../state/appState.js';

export const pitchState = {
  buffer: new Float32Array(2048),
  hz: 0,
  stableHz: 0,
  smoothedHz: 0,
  _candidateHz: 0,
  _candidateSince: 0,
  _lastStableAt: 0
};

export function readMicrophoneBuffer() {
  if (!isMicrophoneReady()) {
    return null;
  }
  
  const buffer = new Float32Array(pitchState.buffer.length);
  microphone.analyser.getFloatTimeDomainData(buffer);
  return buffer;
}

export function calculateRMS(buffer) {
  if (!buffer || buffer.length === 0) {
    return 0;
  }
  
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const value = buffer[i];
    sum += value * value;
  }
  
  return Math.sqrt(sum / buffer.length);
}

export function detectPitchWithAutocorrelation(buffer, sampleRate) {
  if (!buffer || buffer.length === 0) {
    return -1;
  }
  
  const rms = calculateRMS(buffer);
  if (rms < 0.005) {
    return -1;
  }
  
  const trimmedBuffer = trimBufferEdges(buffer);
  if (trimmedBuffer.length < 32) {
    return -1;
  }
  
  const autocorrelation = computeAutocorrelation(trimmedBuffer);
  const peakIndex = findAutocorrelationPeak(autocorrelation);
  
  if (peakIndex <= 0) {
    return -1;
  }
  
  const refinedPeak = refinePeakPosition(autocorrelation, peakIndex);
  const period = refinedPeak;
  
  return sampleRate / period;
}

export function findAutocorrelationPeak(acArray) {
  let skipIndex = 0;
  while (skipIndex < acArray.length - 1 && acArray[skipIndex] > acArray[skipIndex + 1]) {
    skipIndex++;
  }
  
  let maxValue = -1;
  let maxPosition = -1;
  
  for (let i = skipIndex; i < acArray.length; i++) {
    if (acArray[i] > maxValue) {
      maxValue = acArray[i];
      maxPosition = i;
    }
  }
  
  return maxPosition;
}

export function refinePeakPosition(acArray, peakIndex) {
  const x1 = acArray[peakIndex - 1] || 0;
  const x2 = acArray[peakIndex];
  const x3 = acArray[peakIndex + 1] || 0;
  
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const shift = a ? -b / (2 * a) : 0;
  
  return peakIndex + shift;
}

export function getCurrentPitch() {
  const buffer = readMicrophoneBuffer();
  if (!buffer) {
    pitchState.hz = 0;
    updateStablePitch(0);
    return 0;
  }
  
  const ctx = getAudioContext();
  if (!ctx) {
    pitchState.hz = 0;
    return 0;
  }
  
  const detectedHz = detectPitchWithAutocorrelation(buffer, ctx.sampleRate);
  pitchState.hz = detectedHz > 0 ? detectedHz : 0;

  // Tolerance-driven smoothing: higher tolerance = heavier averaging (more stable UI line).
  updateSmoothedPitch(pitchState.hz);
  updateStablePitch(pitchState.hz);
  
  return pitchState.hz;
}

function updateSmoothedPitch(rawHz) {
  const toleranceCents = Number(appState.display?.tolerance) || 25;

  if (!rawHz || rawHz <= 0) {
    pitchState.smoothedHz = 0;
    return;
  }

  // Higher tolerance => smaller alpha => heavier smoothing
  const alpha = Math.max(0.04, Math.min(0.35, 12 / (toleranceCents + 12)));

  if (!pitchState.smoothedHz) {
    pitchState.smoothedHz = rawHz;
    return;
  }

  pitchState.smoothedHz = pitchState.smoothedHz * (1 - alpha) + rawHz * alpha;
}

function updateStablePitch(rawHz) {
  const now = performance.now();
  const toleranceCents = Number(appState.display?.tolerance) || 25;

  // How long pitch must remain within tolerance to be considered stable
  const holdMs = Math.max(50, Math.min(400, toleranceCents * 4));
  // How long we keep last stable pitch before clearing when input disappears/jitters
  const decayMs = Math.max(150, Math.min(800, toleranceCents * 8));

  if (!rawHz || rawHz <= 0) {
    pitchState._candidateHz = 0;
    pitchState._candidateSince = 0;

    if (pitchState._lastStableAt && now - pitchState._lastStableAt > decayMs) {
      pitchState.stableHz = 0;
    }
    return;
  }

  // Initialize candidate
  if (!pitchState._candidateHz) {
    pitchState._candidateHz = rawHz;
    pitchState._candidateSince = now;
    return;
  }

  const deltaCents = Math.abs(centsBetween(pitchState._candidateHz, rawHz));

  if (deltaCents <= toleranceCents) {
    // Candidate remains within tolerance band
    if (now - pitchState._candidateSince >= holdMs) {
      // Promote to stable pitch and gently track the incoming signal
      const alpha = 0.25;
      const next = pitchState.stableHz ? (pitchState.stableHz * (1 - alpha) + rawHz * alpha) : rawHz;
      pitchState.stableHz = next;
      pitchState._lastStableAt = now;
    }
  } else {
    // Too jumpy — restart candidate window
    pitchState._candidateHz = rawHz;
    pitchState._candidateSince = now;
  }
}

function isMicrophoneReady() {
  return microphone.analyser !== null;
}

function trimBufferEdges(buffer) {
  // Lower threshold so quieter voices (especially higher pitches) still retain enough data.
  // The old value (0.2) could trim nearly everything and break detection.
  const threshold = 0.05;
  let startIndex = 0;
  let endIndex = buffer.length - 1;
  
  while (startIndex < buffer.length && Math.abs(buffer[startIndex]) < threshold) {
    startIndex++;
  }
  
  while (endIndex > 0 && Math.abs(buffer[endIndex]) < threshold) {
    endIndex--;
  }

  // If we trimmed too aggressively, fall back to the full buffer.
  if (endIndex - startIndex < 64) {
    return buffer;
  }

  return buffer.slice(startIndex, endIndex + 1);
}

function computeAutocorrelation(buffer) {
  const length = buffer.length;
  const autocorrelation = new Float32Array(length);
  
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let j = 0; j < length - i; j++) {
      sum += buffer[j] * buffer[j + i];
    }
    autocorrelation[i] = sum;
  }
  
  return autocorrelation;
}

