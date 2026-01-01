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
  return audioContext.ctx;
}

export function getAudioContext() {
  return audioContext.ctx;
}

export function isAudioContextReady() {
  return audioContext.ctx !== null;
}

