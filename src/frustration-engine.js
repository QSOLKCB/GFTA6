// SPDX-License-Identifier: Apache-2.0
// GFTA6-ENGINE-001 — original offline phoneme-motor experiment.
// Deliberately robotic F + UH + K syllables, not a recording or TTS service.
// Audio and captions are presentation only: no game clock or random inputs.
import {vehicleSpec} from './vehicle.js';

export const ENGINE_SAMPLE_RATE=48000;
export const ENGINE_LOOP_FRAMES=115200;
const TAU=2*Math.PI;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
/** Deterministic speech-ish engine PCM with four repeated "fuh-k" bursts.
 * Fixed sample count, seeded xorshift hiss, voiced formants and piston drone.
 * Typed arrays are writable by Web Audio consumers; each invocation creates
 * an independent buffer and the generator never shares mutable state.
 */
export function synthFrustratedEngine(seed=1988){
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)
    throw RangeError('engine voice seed must be uint32');
  const samples=new Int16Array(ENGINE_LOOP_FRAMES*2);
  let noise=(seed^0x9e3779b9)>>>0;
  if(noise===0)noise=1;
  let prev=0;
  const period=ENGINE_LOOP_FRAMES/4;
  for(let i=0;i<ENGINE_LOOP_FRAMES;i++){
    const syllable=Math.floor(i/period),t=(i%period)/ENGINE_SAMPLE_RATE;
    noise^=noise<<13;noise^=noise>>>17;noise^=noise<<5;noise>>>=0;
    const white=2*(noise/0xffffffff)-1;
    const hiss=white-prev*.65;prev=white;
    const f=clamp((t-.015)/.035,0,1)*clamp((.145-t)/.045,0,1);
    const v=clamp((t-.12)/.07,0,1)*clamp((.435-t)/.055,0,1);
    const k=clamp((t-.45)/.012,0,1)*clamp((.495-t)/.028,0,1);
    // A nasally synthetic "uh": pitch harmonics plus two crude formants.
    const pitch=98+syllable*5,phase=TAU*pitch*t;
    const throat=Math.sin(phase)*.45+Math.sin(phase*2)*.22+
      Math.sin(phase*5)*.14+Math.sin(phase*9)*.08;
    const vowel=throat*(.54+.15*Math.sin(TAU*550*t)+
      .10*Math.sin(TAU*1220*t));
    const piston=(Math.sin(TAU*43*t)+.3*Math.sin(TAU*86*t))*.09;
    const signal=clamp(piston+f*hiss*.19+v*vowel*.85+
      k*(white*.19+Math.sin(TAU*110*t)*.12),-.92,.92);
    const seam=clamp(i/(ENGINE_SAMPLE_RATE*.025),0,1)*
      clamp((ENGINE_LOOP_FRAMES-i-1)/(ENGINE_SAMPLE_RATE*.025),0,1);
    const sample=Math.round(signal*seam*32767);
    samples[2*i]=sample;
    samples[2*i+1]=sample; // mono centre; original authored stereo PCM
  }
  return Object.freeze({sampleRate:ENGINE_SAMPLE_RATE,
    frames:ENGINE_LOOP_FRAMES,pcm:samples});
}
/** Pure fixed-state adapter: never writes into a game state object. */
export function engineFeedback(state,controls={}){
  if(!state||state.airCombat||state.escape?.flight||
      state.paused||state.finished||state.miniGame)return null;
  if(!Number.isSafeInteger(state.speed))throw RangeError('integer vehicle speed required');
  const spec=vehicleSpec(state.profile);
  const throttle=controls.throttle??0;
  if(![-1,0,1].includes(throttle))throw RangeError('invalid throttle');
  const motion=clamp(Math.abs(state.speed)/spec.maxForward,0,1);
  const pedal=throttle===1?1:throttle===-1?.5:0;
  const gear=clamp(1+Math.floor(motion*4),1,4);
  const rpm=Math.round(850+motion*3800+pedal*1050);
  // Rate changes every driving tick, but the synthesized source is continuous.
  const rate=Math.round((.56+rpm/5100*1.5)*1000)/1000;
  const volume=Math.round((.13+motion*.14+pedal*.065)*1000)/1000;
  const caption=pedal===1&&motion>.6?'FUCK! FUCK! FUCK!':
    pedal===1?'fuck... fuck... fuck...':
    motion>.6?'fuuuck... fuuuck...':'fuck... (under breath)';
  return Object.freeze({rate,volume,rpm,gear,caption});
}
