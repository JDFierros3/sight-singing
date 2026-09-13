/**
 * Audio context initialization and management
 */

export const audioContext = {
  ctx: null,
  gain: null
};

export async function ensureAudioContext() {
  if (!audioContext.ctx) {
    audioContext.ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.gain = audioContext.ctx.createGain();
    audioContext.gain.gain.value = 0.9;
    audioContext.gain.connect(audioContext.ctx.destination);
  }
  // Browsers create the context SUSPENDED (autoplay policy). A suspended context feeds the mic
  // analyser no samples — so pitch detection reads silence and Hz never shows — until it's
  // resumed by a user gesture. Callers here are inside a click (mic button / play), so resume now.
  if (audioContext.ctx.state === 'suspended') {
    try { await audioContext.ctx.resume(); } catch (e) { /* only fails outside a gesture */ }
  }
  return audioContext.ctx;
}

export function getAudioContext() {
  return audioContext.ctx;
}

export function isAudioContextReady() {
  return audioContext.ctx !== null;
}

