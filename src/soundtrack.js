// SPDX-License-Identifier: Apache-2.0
// GFTA6-AUDIO-001 — original, deterministic four-channel chip scores.
// Upstream ADSR/Paula module owns all PCM generation; this file owns ONLY
// original melody/rhythm composition. No DOM, audio device or wall clock.
import {createChipAudio,makeChipWave,PAULA_CLOCK,CHIP_AUDIO_RATE}
  from '../vendor/vanillajs/chip-audio/index.js';

export const MUSIC_MODES=Object.freeze(['saturday','flight','dogfight']);
export const SFX_KINDS=Object.freeze([
  'ui','warning','pickup','gun','missile','hit','explosion','disengage','wave','victory'
]);
export const MUSIC_FRAMES=8*CHIP_AUDIO_RATE;
const W=Object.freeze({
  lead:makeChipWave({wave:'square',frames:32,duty:105}),
  bass:makeChipWave({wave:'triangle',frames:32}),
  pad:makeChipWave({wave:'saw',frames:32}),
  noise:makeChipWave({wave:'noise',frames:128,seed:1988})
});
const hzPeriod=(hz,sample)=>Math.min(65535,Math.max(124,
  Math.round(PAULA_CLOCK.pal/(hz*sample.length))));
function tone(id,channel,start,duration,gate,hz,sample,volume,adsr){
  return {id,channel,start,duration,gate,period:hzPeriod(hz,sample),
    volume,attack:adsr[0],decay:adsr[1],sustain:adsr[2],
    release:adsr[3],sample,loop:true};
}
const THEMES=Object.freeze({
  saturday:Object.freeze({
    lead:Object.freeze([294,330,392,330,262,294,349,330,294,392,440,392,330,294,262,220]),
    bass:Object.freeze([147,147,131,131,146.8,146.8,110,110]),
    pad:Object.freeze([220,196,175,165]),drums:130}),
  flight:Object.freeze({
    lead:Object.freeze([196,247,294,330,392,330,294,247,220,262,330,392,440,392,330,262]),
    bass:Object.freeze([98,110,123,110,98,110,147,123]),
    pad:Object.freeze([196,220,247,196]),drums:147}),
  dogfight:Object.freeze({
    lead:Object.freeze([220,262,294,349,392,349,330,262,196,233,294,349,440,392,294,220]),
    bass:Object.freeze([110,110,130.8,130.8,98,98,123.5,110]),
    pad:Object.freeze([174.6,196,164.8,146.8]),drums:185})
});
/** Exactly eight seconds, aligned to sixteen 24,000-frame steps. */
export function createGameMusic(mode){
  if(!Object.hasOwn(THEMES,mode))throw RangeError('unknown GFTA6 music mode');
  const theme=THEMES[mode],events=[];let id=1;
  const punch=mode==='dogfight';
  for(let i=0;i<16;i++){
    const step=i*24000;
    events.push(tone(id++,0,step,22000,15500,theme.lead[i],W.lead,
      punch?43:35,[1,3,punch?11:9,2]));
    events.push(tone(id++,3,step,6500,1000,theme.drums,W.noise,
      i%4===0?24:11,[0,1,0,1]));
    if(i%2===0)events.push(tone(id++,1,step,45800,36800,
      theme.bass[i/2],W.bass,punch?43:36,[2,4,11,3]));
    if(i%4===0)events.push(tone(id++,2,step+3000,90000,75000,
      theme.pad[i/4],W.pad,punch?17:13,[4,6,7,4]));
  }
  return createChipAudio({frames:MUSIC_FRAMES,clock:'pal',
    filter:'led-approx',events});
}
function makeEffect(frames,notes,filter='off'){
  return createChipAudio({frames,clock:'pal',filter,
    events:notes.map((n,i)=>tone(i+1,n[0],n[1],n[2],n[3],n[4],
      W[n[5]],n[6],n[7]))});
}
/** One-shot original effects; upstream score enforces nonoverlapping lanes. */
export function createGameSfx(kind){
  if(!SFX_KINDS.includes(kind))throw RangeError('unknown GFTA6 effect');
  switch(kind){
    case 'ui':return makeEffect(10500,[
      [0,0,9000,5600,620,'lead',22,[0,1,8,1]]]);
    case 'warning':return makeEffect(19000,[
      [0,0,8500,5700,380,'lead',35,[0,1,7,1]],
      [0,9300,8700,5800,295,'lead',30,[0,1,7,1]]]);
    case 'pickup':return makeEffect(22000,[
      [0,0,7000,5200,440,'lead',27,[0,1,8,1]],
      [0,7500,7000,5400,554,'lead',29,[0,1,8,1]],
      [0,15000,6500,4600,659,'lead',32,[0,1,8,1]]]);
    case 'gun':return makeEffect(15000,[
      [0,0,11000,2600,190,'lead',42,[0,1,4,2]],
      [3,0,13500,700,330,'noise',45,[0,1,0,2]]]);
    case 'missile':return makeEffect(24000,[
      [0,0,22500,18000,220,'pad',40,[0,2,10,2]],
      [3,0,17000,5000,190,'noise',25,[0,2,2,3]]]);
    case 'hit':return makeEffect(17000,[
      [2,0,15500,8500,640,'pad',33,[0,1,6,2]],
      [3,0,13000,1600,390,'noise',28,[0,1,0,2]]]);
    case 'explosion':return makeEffect(46000,[
      [0,0,43500,8000,92,'bass',51,[0,5,8,4]],
      [1,0,38000,9000,160,'pad',29,[0,3,4,4]],
      [3,0,45000,3000,130,'noise',49,[0,3,2,5]]],'led-approx');
    case 'disengage':return makeEffect(41000,[
      [0,0,36000,21500,156,'pad',33,[0,3,8,3]],
      [3,0,40000,3500,140,'noise',34,[0,3,2,5]]],'led-approx');
    case 'wave':return makeEffect(48000,[
      [0,0,13500,10000,330,'lead',35,[0,1,10,1]],
      [0,16000,13000,9000,440,'lead',37,[0,1,10,1]],
      [0,31500,14000,11000,554,'lead',39,[0,1,10,1]],
      [1,0,46000,29000,110,'bass',24,[2,4,8,4]]]);
    case 'victory':return makeEffect(108000,[
      [0,0,25000,19000,392,'lead',42,[0,3,11,2]],
      [0,28000,25000,18000,494,'lead',43,[0,3,11,2]],
      [0,56000,48000,39000,587,'lead',46,[1,4,10,4]],
      [1,0,99000,80000,196,'bass',41,[3,6,10,5]]],'led-approx');
  }
}
