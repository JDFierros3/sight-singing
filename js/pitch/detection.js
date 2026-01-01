/**
 * Pitch detection using autocorrelation
 */

import { microphone } from '../audio/microphone.js';
import { getAudioContext } from '../audio/context.js';

export const pitchState = {
  buffer: new Float32Array(2048),
  hz: 0
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
    return 0;
  }
  
  const ctx = getAudioContext();
  if (!ctx) {
    pitchState.hz = 0;
    return 0;
  }
  
  const detectedHz = detectPitchWithAutocorrelation(buffer, ctx.sampleRate);
  pitchState.hz = detectedHz > 0 ? detectedHz : 0;
  
  return pitchState.hz;
}

function isMicrophoneReady() {
  return microphone.analyser !== null;
}

function trimBufferEdges(buffer) {
  const threshold = 0.2;
  let startIndex = 0;
  let endIndex = buffer.length - 1;
  
  while (startIndex < buffer.length && Math.abs(buffer[startIndex]) < threshold) {
    startIndex++;
  }
  
  while (endIndex > 0 && Math.abs(buffer[endIndex]) < threshold) {
    endIndex--;
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

