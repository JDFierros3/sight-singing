/**
 * Audio module exports for backward compatibility
 */

export { ensureAudioContext, getAudioContext, isAudioContextReady } from './context.js';
export { createOscillator, startOscillator, stopOscillator } from './oscillator.js';
export { startMicrophone, stopMicrophone, isMicrophoneActive } from './microphone.js';
export { startDroneWithFrequencies, stopAllDroneOscillators, isDroneActive } from './drone.js';
export { beepTarget } from './target.js';

