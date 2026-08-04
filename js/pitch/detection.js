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

// Pitch detection only needs to cover sung/played fundamentals. Decimating the buffer
// before the O(n^2) autocorrelation, and bounding the lag search to this range, cuts the
// cost ~25x (the whole point — the full 2048-sample version cost ~18ms/call and ran every
// frame, which froze weaker phones). Parabolic peak refinement keeps sub-sample precision.
const DECIMATE = 4;      // 44.1kHz -> ~11kHz working rate; Nyquist still far above the voice
const MIN_HZ = 65;       // below a bass low C
const MAX_HZ = 1200;     // above a soprano high

export function detectPitchWithAutocorrelation(buffer, sampleRate) {
  if (!buffer || buffer.length === 0) {
    return -1;
  }

  const rms = calculateRMS(buffer);
  if (rms < 0.003) { // low silence gate so quieter/decaying sustained notes don't drop the line
    return -1;
  }

  const work = decimateBuffer(buffer, DECIMATE);
  const rate = sampleRate / DECIMATE;
  if (work.length < 64) {
    return -1;
  }

  const minLag = Math.max(2, Math.floor(rate / MAX_HZ));
  const maxLag = Math.min(work.length - 1, Math.ceil(rate / MIN_HZ));

  const autocorrelation = computeAutocorrelation(work, maxLag);
  const peakIndex = findAutocorrelationPeak(autocorrelation, minLag);

  if (peakIndex <= 0) {
    return -1;
  }

  const period = refinePeakPosition(autocorrelation, peakIndex);
  if (period <= 0) {
    return -1;
  }

  return rate / period;
}

// Average-and-downsample by `factor` (the averaging is a cheap anti-alias pre-filter).
function decimateBuffer(buffer, factor) {
  if (factor <= 1) return buffer;
  const outLen = Math.floor(buffer.length / factor);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    let sum = 0;
    const base = i * factor;
    for (let k = 0; k < factor; k++) sum += buffer[base + k];
    out[i] = sum / factor;
  }
  return out;
}

export function findAutocorrelationPeak(acArray, minLag = 0) {
  // Skip the descending slope from the minimum lag so we lock onto the first true peak.
  let skipIndex = Math.max(0, minLag);
  while (skipIndex < acArray.length - 1 && acArray[skipIndex] > acArray[skipIndex + 1]) {
    skipIndex++;
  }

  // Reference height = the tallest peak over the valid range.
  let globalMax = -Infinity;
  for (let i = skipIndex; i < acArray.length; i++) {
    if (acArray[i] > globalMax) globalMax = acArray[i];
  }
  if (globalMax <= 0) return -1;

  // Octave-error guard: the human voice is harmonic-rich, so the sub-harmonic peak (an octave
  // DOWN, at ~2× the true period) is often marginally taller than the fundamental. Picking the
  // GLOBAL max there reports an octave low. Instead take the FIRST local-maximum peak that
  // clears most of the reference height — i.e. the shortest period / true fundamental.
  const threshold = 0.9 * globalMax;
  for (let i = skipIndex + 1; i < acArray.length - 1; i++) {
    if (acArray[i] >= threshold && acArray[i] >= acArray[i - 1] && acArray[i] > acArray[i + 1]) {
      return i;
    }
  }

  // Fallback: no peak cleared the threshold — return the global-max position.
  let maxPosition = skipIndex;
  let maxValue = -Infinity;
  for (let i = skipIndex; i < acArray.length; i++) {
    if (acArray[i] > maxValue) { maxValue = acArray[i]; maxPosition = i; }
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

// Detection runs at ~30 Hz, not once per animation frame. Pitch doesn't change meaningfully
// between 16ms frames, and the autocorrelation is the loop's single most expensive step —
// halving how often it runs (vs 60fps) is a free win, especially on mobile.
let _lastDetectAt = 0;
const DETECT_INTERVAL_MS = 22; // ~45 Hz — snappier pitch pickup for fast passages

export function getCurrentPitch() {
  const now = performance.now();
  if (now - _lastDetectAt < DETECT_INTERVAL_MS) {
    return pitchState.hz; // keep the last reading; smoothing/decay are time-based, so this is safe
  }
  _lastDetectAt = now;

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

  // How long pitch must remain within tolerance to be considered stable. Capped low so a high
  // tolerance (forgiving) doesn't also make the readout sluggish to confirm a note.
  const holdMs = Math.max(50, Math.min(150, toleranceCents * 2));
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

function computeAutocorrelation(buffer, maxLag) {
  const length = buffer.length;
  // Only compute lags up to maxLag (the longest period we care about) — the dominant cost.
  const limit = Math.min((maxLag ?? length - 1) + 1, length);
  const autocorrelation = new Float32Array(limit);

  for (let i = 0; i < limit; i++) {
    let sum = 0;
    const end = length - i;
    for (let j = 0; j < end; j++) {
      sum += buffer[j] * buffer[j + i];
    }
    autocorrelation[i] = sum;
  }

  return autocorrelation;
}

