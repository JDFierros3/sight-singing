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
  clarity: 0,        // YIN confidence 0..1 (1 = perfectly periodic); gate the line on this
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

// Pitch detection only needs to cover sung/played fundamentals. Decimating the buffer before the
// O(n·maxLag) difference function, and bounding the lag search, keeps the cost ~0.7ms/call.
const DECIMATE = 2;      // 44.1kHz -> ~22kHz working rate; keeps precision up high, still cheap
const MIN_HZ = 65;       // below a bass low C
const MAX_HZ = 1200;     // above a soprano high

// YIN (de Cheveigné & Kawahara 2002). Chosen over raw autocorrelation because a formant sitting
// near the 2nd harmonic — extremely common on low voices — makes autocorrelation report an octave
// HIGH almost every time, whereas YIN's cumulative-mean-normalized difference + absolute-threshold
// "first dip" locks onto the true fundamental. Returns { hz, clarity }; clarity (1 − d′) gates the
// line so ambiguous frames (note transitions, noise bursts) hold instead of drawing garbage.
const YIN_THRESHOLD = 0.12;

export function detectPitch(buffer, sampleRate) {
  if (!buffer || buffer.length === 0) return { hz: -1, clarity: 0 };

  const rms = calculateRMS(buffer);
  if (rms < 0.003) return { hz: -1, clarity: 0 }; // silence gate (keeps quiet/decaying notes)

  const work = decimateBuffer(buffer, DECIMATE);
  const rate = sampleRate / DECIMATE;
  const n = work.length;
  const maxLag = Math.min(n - 1, Math.ceil(rate / MIN_HZ));
  const minLag = Math.max(2, Math.floor(rate / MAX_HZ));
  if (n < 64 || maxLag <= minLag + 2) return { hz: -1, clarity: 0 };

  // 1) Squared-difference function d(τ).
  const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    const end = n - tau;
    for (let j = 0; j < end; j++) {
      const diff = work[j] - work[j + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // 2) Cumulative mean normalized difference d′(τ).
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau / running) : 1;
  }

  // 3) Absolute threshold: the FIRST τ that dips below the threshold (then descend to its local
  //    min). Taking the first dip — not the global min — is what prevents octave-down slips.
  let tau = -1;
  for (let t = minLag; t <= maxLag; t++) {
    if (cmnd[t] < YIN_THRESHOLD) {
      while (t + 1 <= maxLag && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) {
    // Nothing cleared the threshold — fall back to the global minimum, but reject if it's shallow
    // (unvoiced / noise), so we hold rather than draw a wrong line.
    let best = minLag, bestVal = cmnd[minLag];
    for (let t = minLag + 1; t <= maxLag; t++) if (cmnd[t] < bestVal) { bestVal = cmnd[t]; best = t; }
    if (bestVal > 0.55) return { hz: -1, clarity: 0 };
    tau = best;
  }

  // 4) Parabolic interpolation around τ for sub-sample precision.
  const x0 = tau > minLag ? cmnd[tau - 1] : cmnd[tau];
  const x2 = tau < maxLag ? cmnd[tau + 1] : cmnd[tau];
  const denom = x0 - 2 * cmnd[tau] + x2;
  const betterTau = denom !== 0 ? tau + 0.5 * (x0 - x2) / denom : tau;

  const hz = rate / betterTau;
  if (hz < MIN_HZ || hz > MAX_HZ) return { hz: -1, clarity: 0 };
  return { hz, clarity: Math.max(0, Math.min(1, 1 - cmnd[tau])) };
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
  
  const { hz, clarity } = detectPitch(buffer, ctx.sampleRate);
  pitchState.hz = hz > 0 ? hz : 0;
  pitchState.clarity = pitchState.hz ? clarity : 0;

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

