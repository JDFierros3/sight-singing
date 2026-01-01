/**
 * Microphone input handling
 */

import { ensureAudioContext, getAudioContext } from './context.js';
import { getElementById, setTextContent } from '../utils/dom.js';

export const microphone = {
  stream: null,
  analyser: null
};

export async function requestMicrophoneAccess() {
  return await navigator.mediaDevices.getUserMedia({ audio: true });
}

export function createMicrophoneStream() {
  return requestMicrophoneAccess();
}

export function connectMicrophoneToAnalyser(stream) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  
  const source = ctx.createMediaStreamSource(stream);
  microphone.analyser = ctx.createAnalyser();
  microphone.analyser.fftSize = 2048;
  source.connect(microphone.analyser);
}

export function stopMicrophoneStream() {
  if (microphone.stream) {
    microphone.stream.getTracks().forEach(track => track.stop());
    microphone.stream = null;
    microphone.analyser = null;
  }
}

export function isMicrophoneActive() {
  return microphone.stream !== null && microphone.analyser !== null;
}

export async function startMicrophone() {
  await ensureAudioContext();
  const stream = await createMicrophoneStream();
  microphone.stream = stream;
  connectMicrophoneToAnalyser(stream);
  updateMicrophoneStatus('Mic live');
}

export function stopMicrophone() {
  stopMicrophoneStream();
  updateMicrophoneStatus('Mic stopped');
}

function updateMicrophoneStatus(message) {
  const statusElement = getElementById('status');
  setTextContent(statusElement, message);
}

