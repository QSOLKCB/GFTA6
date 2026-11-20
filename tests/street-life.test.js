// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,createDogfightGame,createAirWarGame,stepGame,
  snapshot,screenPosition} from '../src/core.js';
import {STREET_CARS,STREET_PEDESTRIANS,STREET_LINE_IDS,
  streetActors,streetMoment} from '../src/street-life.js';
import {STREET_LINES,synthStreetLine,streetCaption} from '../src/street-voice.js';
import {drawScene} from '../src/render.js';
import {createAudioPlayer} from '../src/audio-player.js';

test('fixed-tick street cast has six cars and six pedestrians with reproducible bounded paths',()=>{
  assert.equal(STREET_CARS.length,6);
  assert.equal(STREET_PEDESTRIANS.length,6);
  assert.deepEqual(new Set(STREET_LINE_IDS),new Set(Object.keys(STREET_LINES)));
  for(const tick of [0,30,90,240,1200,3600]){
    const original=streetActors(1988,tick),repeat=streetActors(1988,tick);
    assert.deepEqual(original,repeat);
    assert.ok(Object.isFrozen(original));
    assert.equal(new Set(original.map(a=>a.id)).size,12);
    assert.ok(original.every(a=>a.x>=24&&a.x<=1526&&a.y>=24&&a.y<=1106));
    assert.ok(original.filter(a=>a.kind==='car').every(a=>a.skin&&a.headingFine>=0));
    assert.ok(original.filter(a=>a.kind==='pedestrian').every(a=>a.skin===null));
  }
  assert.notDeepEqual(streetActors(1988,0),streetActors(1988,120));
  assert.throws(()=>streetActors(-1,0),RangeError);
  assert.throws(()=>streetActors(1988,-1),RangeError);
});

test('nearby driver and pedestrian complaints occur on different fixed ticks',()=>{
  const near={x:170,y:170};
  const driver=streetMoment(1988,30,near);
  const walker=streetMoment(1988,90,near);
  assert.equal(driver?.kind,'car');
  assert.equal(driver?.id,'cab');
  assert.equal(driver?.lineId,'arsehole');
  assert.equal(walker?.kind,'pedestrian');
  assert.equal(walker?.id,'newyork');
  assert.equal(walker?.lineId,'outta');
  assert.equal(streetMoment(1988,31,near),null);
  assert.equal(streetMoment(1988,30,{x:1550,y:1130}),null);
  assert.ok(Object.isFrozen(driver));
  assert.throws(()=>streetMoment(1988,30,{x:NaN,y:0}),TypeError);
});

test('each street line has bounded deterministic original PCM and distinct actors',()=>{
  for(const id of STREET_LINE_IDS){
    const a=synthStreetLine(id,'cab');
    const b=synthStreetLine(id,'cab');
    assert.equal(a.sampleRate,48000);
    assert.equal(a.pcm.length,a.frames*2);
    assert.ok(a.frames>=12000&&a.frames<=150000);
    assert.deepEqual(a.pcm,b.pcm);
    assert.ok(a.pcm.some(sample=>sample!==0),id+' PCM must be audible');
    assert.equal(streetCaption(id),a.caption);
  }
  assert.notDeepEqual(synthStreetLine('arsehole','cab').pcm,
    synthStreetLine('arsehole','honk').pcm);
  assert.throws(()=>synthStreetLine('__proto__','cab'),RangeError);
  assert.throws(()=>synthStreetLine('outta','CAB!'),RangeError);
});

function fakeCanvas(){
  const ctx={};
  for(const method of ['save','restore','beginPath','closePath','moveTo',
    'lineTo','ellipse','arc','fill','stroke','clearRect','fillRect','strokeRect',
    'translate','rotate','setLineDash','roundRect','fillText']){
    ctx[method]=()=>{};
  }
  return {width:960,height:600,getContext:()=>ctx};
}
test('street rendering and speech selection cannot modify Saturday replay receipts',()=>{
  const state=createGame(1988);
  for(let i=0;i<120;i++)stepGame(state,{throttle:i<60?1:0,steer:i%15?0:1});
  const before=snapshot(state),point=screenPosition(state.body);
  const maybe=streetMoment(state.seed,90,point);
  for(const mode of ['classic','raised'])
    drawScene(fakeCanvas(),state,{mode,streetBubble:maybe});
  assert.deepEqual(snapshot(state),before);
  for(const mode of [createDogfightGame,createAirWarGame]){
    const combat=mode(1988),start=snapshot(combat);
    streetActors(combat.seed,combat.tick);
    assert.deepEqual(snapshot(combat),start,'NPC code cannot change air combat');
  }
});

class FakeAudio{
  constructor(){this.state='suspended';this.destination={};this.sources=[];}
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
  createBuffer(channels,frames,rate){
    assert.equal(channels,2);assert.equal(rate,48000);
    const data=[new Float32Array(frames),new Float32Array(frames)];
    return {getChannelData:c=>data[c]};
  }
  createBufferSource(){
    const source={buffer:null,loop:false,playbackRate:{value:1},
      connect(){},disconnect(){},start(){this.started=true;},
      stop(){this.onended?.();}};
    this.sources.push(source);
    return source;
  }
  async resume(){this.state='running';}
  async close(){this.state='closed';}
}
test('street voices need player activation and respect SFX, pause, scene isolation',async()=>{
  const audio=createAudioPlayer(FakeAudio);
  const event=streetMoment(1988,30,{x:170,y:170});
  audio.setStreetEnabled(true);
  assert.equal(audio.streetLine(event),false,'no AudioContext before a start click');
  await audio.activate();
  assert.equal(audio.streetLine(event),true);
  assert.equal(audio.status().streetVoices,1);
  audio.setSfxEnabled(false);
  assert.equal(audio.status().streetVoices,0);
  assert.equal(audio.streetLine(event),false);
  audio.setSfxEnabled(true);
  assert.equal(audio.streetLine(event),true);
  audio.setPaused(true);
  assert.equal(audio.status().streetVoices,0);
  assert.equal(audio.streetLine(event),false);
  audio.setPaused(false);
  audio.setStreetEnabled(false);
  assert.equal(audio.streetLine(event),false);
  audio.setStreetEnabled(true);
  assert.equal(audio.streetLine(event),true);
  audio.stopStreet();
  assert.equal(audio.status().streetVoices,0);
  assert.throws(()=>audio.streetLine({...event,lineId:'__proto__'}),RangeError);
  audio.stop();
  assert.equal(audio.status().streetEnabled,false);
});
