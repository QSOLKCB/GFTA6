// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createChipAudio,isChipAudio,CHIP_AUDIO_FORMAT,CHIP_AUDIO_RATE,
  CHIP_AUDIO_CHANNELS} from '../vendor/vanillajs/chip-audio/index.js';
import {createGameMusic,createGameSfx,MUSIC_MODES,SFX_KINDS,MUSIC_FRAMES}
  from '../src/soundtrack.js';
import {createAudioPlayer} from '../src/audio-player.js';
import {combatAudioCues} from '../src/audio-cues.js';
import {createAirCombat,stepAirCombat} from '../src/aircombat.js';

test('original Saturday, flight and dogfight themes render genuine stereo chip PCM',()=>{
  assert.equal(CHIP_AUDIO_FORMAT,'qsol.vanillajs.chip-audio.v1');
  assert.equal(CHIP_AUDIO_CHANNELS,4);
  assert.equal(CHIP_AUDIO_RATE,48000);
  assert.deepEqual(MUSIC_MODES,['saturday','flight','dogfight']);
  for(const mode of MUSIC_MODES){
    const a=createGameMusic(mode),b=createGameMusic(mode);
    assert.ok(isChipAudio(a));
    assert.equal(a.frames,MUSIC_FRAMES);
    assert.equal(a.sampleRate,48000);
    assert.equal(a.eventCount,44);
    assert.equal(a.filter,'led-approx');
    const first=a.renderRange(0,24000),again=b.renderRange(0,24000);
    assert.deepEqual(first,again,mode+' score must be deterministic');
    const left=first.filter((_,i)=>i%2===0),right=first.filter((_,i)=>i%2===1);
    assert.ok(left.some(v=>v!==0),mode+' left channel is silent');
    assert.ok(right.some(v=>v!==0),mode+' right channel is silent');
    assert.notDeepEqual(left,right,mode+' Paula stereo voices must be distinct');
    const adjacent=new Int16Array(3200*2); // interleaved stereo frames
    adjacent.set(a.renderRange(900,1400));
    adjacent.set(a.renderRange(2300,1800),1400*2);
    assert.deepEqual(adjacent,a.renderRange(900,3200),
      'arbitrary filtered ranges reproduce the exact whole score');
  }
});
test('chip scores provide bounded signed 16-bit WAV and deterministic mix',()=>{
  const score=createGameMusic('saturday');
  const bytes=score.wav();
  assert.equal(new TextDecoder().decode(bytes.subarray(0,4)),'RIFF');
  assert.equal(new TextDecoder().decode(bytes.subarray(8,12)),'WAVE');
  const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(data.getUint16(22,true),2);
  assert.equal(data.getUint32(24,true),48000);
  assert.equal(data.getUint16(34,true),16);
  assert.equal(data.getUint32(40,true),MUSIC_FRAMES*4);
  assert.equal(bytes.length,44+MUSIC_FRAMES*4);
  assert.ok(score.eventSummary().every(e=>e.channel>=0&&e.channel<4));
  assert.throws(()=>createGameMusic('copied song'),RangeError);
});
test('all original ADSR/Paula effects are non-silent, bounded and distinct',()=>{
  assert.equal(new Set(SFX_KINDS).size,SFX_KINDS.length);
  const spectra=[];
  for(const kind of SFX_KINDS){
    const score=createGameSfx(kind);
    assert.ok(isChipAudio(score),kind);
    assert.ok(score.frames>=1&&score.frames<384000);
    assert.ok(score.eventCount>=1&&score.eventCount<=128);
    const pcm=score.renderAll();
    assert.equal(pcm.length,score.frames*2);
    assert.ok(pcm.some(x=>x!==0),'silent effect '+kind);
    spectra.push(Array.from(pcm.subarray(0,80)).join(','));
  }
  assert.ok(new Set(spectra).size>=6,'effect set should be sonically differentiated');
  assert.throws(()=>createGameSfx('__proto__'),RangeError);
  assert.throws(()=>createGameSfx('gunshot-from-a-movie'),RangeError);
});
test('combat audio cues follow accepted weapon events, not raw key presses',()=>{
  const before=createAirCombat(1988),fired=stepAirCombat(before,{brake:true,missile:true});
  const cues=combatAudioCues(before,fired);
  assert.ok(cues.includes('gun'));
  assert.ok(cues.includes('missile'));
  assert.ok(cues.includes('hit'));
  assert.ok(Object.isFrozen(cues));
  assert.deepEqual(combatAudioCues(before,before),[]);
  assert.deepEqual(combatAudioCues(null,before),['wave']);
  assert.deepEqual(combatAudioCues(null,null),[]);
  let now=fired,foundExplosion=false;
  for(let i=0;i<45&&now.status==='active';i++){
    const next=stepAirCombat(now,{brake:true,missile:false});
    if(combatAudioCues(now,next).includes('explosion'))foundExplosion=true;
    now=next;
  }
  assert.equal(foundExplosion,true,'aircraft disengagement must emit an explosion');
  assert.ok(now.effects.length<=16);
});
class FakeAudio {
  static last=null;
  constructor(){this.state='suspended';this.destination={};this.sources=[];
    FakeAudio.last=this;}
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
  createBuffer(channels,frames,sampleRate){
    assert.equal(channels,2);assert.equal(sampleRate,48000);
    const arrays=Array.from({length:channels},()=>new Float32Array(frames));
    return {channels,frames,sampleRate,getChannelData:n=>arrays[n]};
  }
  createBufferSource(){
    const src={buffer:null,loop:false,started:false,stopped:false,
      connect(){},disconnect(){},start(){this.started=true;},
      stop(){this.stopped=true;this.onended?.();}};
    this.sources.push(src);return src;
  }
  async resume(){this.state='running';}
  async close(){this.state='closed';}
}
test('user-gesture audio adapter loops by mode and mutes SFX independently',async()=>{
  const audio=createAudioPlayer(FakeAudio);
  assert.equal(audio.status().active,false,'no audio before start click');
  audio.setScene('saturday');
  assert.equal(audio.status().activeScene,null);
  assert.equal(await audio.activate(),true);
  assert.equal(audio.status().activeScene,'saturday');
  assert.equal(FakeAudio.last.sources[0].loop,true);
  const old=FakeAudio.last.sources[0];
  audio.setScene('dogfight');
  assert.equal(audio.status().activeScene,'dogfight');
  assert.equal(old.stopped,true,'previous music must stop on scene change');
  assert.equal(audio.effect('gun'),true);
  assert.equal(audio.status().voices,1);
  audio.setSfxEnabled(false);
  assert.equal(audio.effect('missile'),false,'SFX control must mute');
  audio.setSfxEnabled(true);
  audio.setPaused(true);
  assert.equal(audio.effect('explosion'),false,'pause mutes SFX');
  audio.setPaused(false);
  assert.equal(audio.effect('explosion'),true);
  audio.setMusicEnabled(false);
  assert.equal(audio.status().activeScene,null);
  assert.equal(audio.status().musicEnabled,false);
  assert.equal(audio.effect('wave'),true,'independent SFX remains usable');
  assert.throws(()=>audio.setScene('invalid'),RangeError);
  assert.throws(()=>audio.effect('no such effect'),RangeError);
  audio.stop();
  assert.equal(audio.status().active,false);
});
