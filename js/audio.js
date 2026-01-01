import { $, state } from './state.js';
import { midiToFreq } from './util.js';
export const audio = { ctx:null, micStream:null, analyser:null, gain:null, drones:[], droneGainNode:null };
export async function ensureAudio(){ if(!audio.ctx){ audio.ctx=new (window.AudioContext||window.webkitAudioContext)(); audio.gain=audio.ctx.createGain(); audio.gain.gain.value=0.9; audio.gain.connect(audio.ctx.destination);} return audio.ctx; }
export function playOsc(freq,type='sine',gain=0.15){ const ctx=audio.ctx; const osc=ctx.createOscillator(); const g=ctx.createGain(); g.gain.value=gain; osc.type=type; osc.frequency.value=freq; osc.connect(g).connect(audio.gain); osc.start(); return {osc,g}; }
export function stopNode(node){ try{ node.osc.stop(); node.osc.disconnect(); node.g.disconnect(); }catch(e){} }
export async function startMic(){ await ensureAudio(); const stream=await navigator.mediaDevices.getUserMedia({audio:true}); audio.micStream=stream; const src=audio.ctx.createMediaStreamSource(stream); audio.analyser=audio.ctx.createAnalyser(); audio.analyser.fftSize=2048; src.connect(audio.analyser); setStatus('Mic live'); }
export function stopMic(){ if(audio.micStream){ audio.micStream.getTracks().forEach(t=>t.stop()); audio.micStream=null; audio.analyser=null; setStatus('Mic stopped'); } }
export function startDrone(freqs){ stopDrone(); audio.drones=freqs.map(f=>playOsc(f,'sine', Number($('#droneGain').value||0.25))).filter(Boolean); setStatus('Drone: '+freqs.map(f=>f.toFixed(1)).join(', ')); if(!audio.droneGainNode){ audio.droneGainNode=audio.gain; } }
export function stopDrone(){ audio.drones.forEach(stopNode); audio.drones=[]; setStatus('Drone stopped'); }
export function setStatus(t){ $('#status').textContent=t; }
export async function beepTarget(){ if(!state.playAim) return; await ensureAudio(); const f=midiToFreq(state.doMidi+state.chordRootSemi+state.targetSemi, state.a4); const {osc,g}=playOsc(f,'sine',0.18); g.gain.exponentialRampToValueAtTime(0.0001, audio.ctx.currentTime+0.45); setTimeout(()=>{ try{osc.stop();}catch{} },480); }
