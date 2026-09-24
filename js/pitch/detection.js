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

// Spectral sub-octave check. YIN's "first dip" can still lock onto the 2nd harmonic when the
// fundamental is weak (breathy/low voices), reporting an octave HIGH — the flip that makes the line
// jump. This confirms the octave against the SIGNAL (not the score, not the singer's history): if
// the odd half-harmonics (f/2, 3f/2, 5f/2) carry real energy, a true fundamental sits an octave
// below, so drop to it. A genuine note an octave up has no such energy, so a real octave leap is
// left completely alone — nothing here folds pitch toward the part or the previous frame.
const SUB_OCTAVE_FACTOR = 0.5; // odd half-harmonics must be ≥ half the main harmonics' strength to drop

// Voicing gate. Sung tone concentrates its energy LOW (harmonics of ~100–600 Hz); breath, tongue
// clicks and sibilants (/s/ /f/) are noise-like with energy spread HIGH. This rejects those frames
// so the line HOLDS its last real note through a consonant instead of chasing the noise to a random
// pitch. Signal-only, per-frame — no pitch is nudged, nothing is inferred from history or the score.
// Tunable: raise VOICING_LOWBAND_MIN to reject more mouth noise, lower it if it ever clips real singing.
const VOICING_LP_HZ = 2600;       // "low band" upper edge — above bright vowel formants, below sibilant hiss
const VOICING_LOWBAND_MIN = 0.55; // min fraction of energy in the low band to count a frame as voiced

export function detectPitch(buffer, sampleRate) {
  if (!buffer || buffer.length === 0) return { hz: -1, clarity: 0 };

  const rms = calculateRMS(buffer);
  if (rms < 0.003) return { hz: -1, clarity: 0 }; // silence gate (keeps quiet/decaying notes)

  // Reject high-frequency noise (breath/consonants) before the costly pitch search.
  if (lowBandFraction(buffer, sampleRate) < VOICING_LOWBAND_MIN) return { hz: -1, clarity: 0 };

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

  // 3b) Octave-down correction. A strong 2nd harmonic — common on low voices — makes the CMNDF dip
  //     at HALF the true period first, so YIN reports an octave too high (the "low mi jumps octaves"
  //     bug). If DOUBLE the period is a clearly deeper dip, that's the real fundamental. The strict
  //     0.85 factor means a true fundamental (whose 2·P dip is ~equal, not deeper) is left untouched.
  let octGuard = 0;
  while (tau * 2 <= maxLag && cmnd[tau * 2] < cmnd[tau] * 0.85 && octGuard++ < 3) tau *= 2;

  // 4) Parabolic interpolation around τ for sub-sample precision.
  const x0 = tau > minLag ? cmnd[tau - 1] : cmnd[tau];
  const x2 = tau < maxLag ? cmnd[tau + 1] : cmnd[tau];
  const denom = x0 - 2 * cmnd[tau] + x2;
  const betterTau = denom !== 0 ? tau + 0.5 * (x0 - x2) / denom : tau;

  let hz = rate / betterTau;

  // 5) Spectral octave confirmation on the FULL-rate buffer (better low-frequency resolution than
  //    the decimated ACF). Drops an octave only when real sub-octave energy proves YIN grabbed a
  //    harmonic — never touches a genuine high note or a real octave leap.
  hz = resolveSubOctave(buffer, sampleRate, hz);

  if (hz < MIN_HZ || hz > MAX_HZ) return { hz: -1, clarity: 0 };
  return { hz, clarity: Math.max(0, Math.min(1, 1 - cmnd[tau])) };
}

// Fraction of energy in the low band (one-pole low-pass at VOICING_LP_HZ). ~1 for sung vowels
// (energy low), small for breath/sibilants (energy high). Cheap: one pass, no FFT.
function lowBandFraction(buffer, sampleRate) {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * VOICING_LP_HZ);
  const a = dt / (rc + dt);
  let y = 0, low = 0, total = 0;
  for (let i = 0; i < buffer.length; i++) {
    y += a * (buffer[i] - y);
    low += y * y;
    total += buffer[i] * buffer[i];
  }
  return total > 0 ? Math.sqrt(low / total) : 0;
}

// Goertzel magnitude at a single frequency over an already-windowed buffer — far cheaper than a
// full FFT when we only need a handful of harmonic bins.
function goertzelMag(win, f, sampleRate) {
  const w = 2 * Math.PI * f / sampleRate;
  const coeff = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < win.length; i++) {
    const s0 = win[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.hypot(s1 - s2 * Math.cos(w), s2 * Math.sin(w));
}

// Compare energy in the odd half-harmonics (f/2, 3f/2, 5f/2 — present only if the true fundamental
// is an octave down) against the main harmonics (f, 2f, 3f). Drop while the sub-octave clearly wins.
function resolveSubOctave(buffer, sampleRate, hz) {
  if (!(hz > 0)) return hz;
  const n = buffer.length;
  const win = new Float32Array(n);
  for (let i = 0; i < n; i++) win[i] = buffer[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));

  let f = hz, guard = 0;
  while (guard++ < 2 && f / 2 >= MIN_HZ) {
    const main = goertzelMag(win, f, sampleRate) + goertzelMag(win, 2 * f, sampleRate) + goertzelMag(win, 3 * f, sampleRate);
    const sub = goertzelMag(win, f / 2, sampleRate) + goertzelMag(win, 1.5 * f, sampleRate) + goertzelMag(win, 2.5 * f, sampleRate);
    if (main > 0 && sub > main * SUB_OCTAVE_FACTOR) f /= 2;
    else break;
  }
  return f;
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

