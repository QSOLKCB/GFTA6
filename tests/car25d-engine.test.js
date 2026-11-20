// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {car25DGeometry,drawCar25D} from '../src/car-25d.js';
import {vehicleArt} from '../src/vehicle-art.js';
import {createGame,snapshot} from '../src/core.js';
import {ENGINE_LOOP_FRAMES,ENGINE_SAMPLE_RATE,synthFrustratedEngine,
  engineFeedback} from '../src/frustration-engine.js';
import {createAudioPlayer} from '../src/audio-player.js';

test('original raised car has side walls, roof, wheels, lights and skin geometry',()=>{
  for(const profile of ['hatchback','coupe','van']){
    const skin=vehicleArt(profile);
    const a=car25DGeometry(0,skin),b=car25DGeometry(0,skin);
    assert.deepEqual(a,b);
    assert.ok(Object.isFrozen(a));
    assert.equal(a.bodyFaces.length,4);
    assert.equal(a.roofFaces.length,4);
    assert.equal(a.wheels.length,4);
    assert.equal(a.frontLights.length,2);
    assert.equal(a.rearLights.length,2);
    assert.ok(a.roofTop[0][1]<a.bodyTop[0][1],
      'raised roof must visibly lift away from original XY footprint');
    assert.notDeepEqual(a.bodyTop,car25DGeometry(256,skin).bodyTop,
      'turning must rotate drawn geometry with the physical car heading');
  }
  assert.notDeepEqual(
    car25DGeometry(0,vehicleArt('coupe')).roofTop,
    car25DGeometry(0,vehicleArt('van')).roofTop,
    'silhouette presets must produce distinct roofs');
  assert.throws(()=>car25DGeometry(1024,vehicleArt('hatchback')),RangeError);
  assert.throws(()=>car25DGeometry(0,{}),TypeError);
});

test('raised car is purely visual and fits a bounded Canvas2D draw path',()=>{
  const state=createGame(1988),before=snapshot(state);
  let fills=0,paths=0;
  const ctx={};
  for(const name of ['beginPath','moveTo','lineTo','closePath','save','restore',
    'translate','stroke'])ctx[name]=()=>{paths++;};
  ctx.fill=()=>{fills++;};
  drawCar25D(ctx,170,170,state.headingFine,vehicleArt(state.profile));
  assert.ok(fills>=15&&fills<=30,'explicit small original polygon budget');
  assert.ok(paths<160,'no expensive per-frame mesh construction');
  assert.deepEqual(snapshot(state),before);
});

test('F-UH-K phonemes render exactly sized offline repeatable original PCM',()=>{
  const a=synthFrustratedEngine(1988),b=synthFrustratedEngine(1988);
  assert.equal(a.sampleRate,ENGINE_SAMPLE_RATE);
  assert.equal(a.frames,ENGINE_LOOP_FRAMES);
  assert.equal(a.pcm.length,ENGINE_LOOP_FRAMES*2);
  assert.deepEqual(a.pcm,b.pcm);
  assert.ok(a.pcm.some(v=>v!==0),'robotic engine must not be silent');
  assert.equal(a.pcm[0],0,'loop must start without a click');
  assert.equal(a.pcm.at(-1),0,'loop must end without a click');
  assert.notDeepEqual(a.pcm.slice(0,60000),synthFrustratedEngine(1990).pcm.slice(0,60000));
  assert.throws(()=>synthFrustratedEngine(-1),RangeError);
});

test('authoritative integer speed and throttle control engine feedback only',()=>{
  const state=createGame(1988),before=snapshot(state);
  const idle=engineFeedback(state,{throttle:0});
  state.speed=80;
  const cruise=engineFeedback(state,{throttle:0});
  const hard=engineFeedback(state,{throttle:1});
  assert.ok(cruise.rpm>idle.rpm);
  assert.ok(hard.rpm>cruise.rpm);
  assert.ok(hard.rate>idle.rate);
  assert.ok(hard.volume>idle.volume);
  assert.ok(Object.isFrozen(hard));
  state.paused=true;
  assert.equal(engineFeedback(state,{throttle:1}),null);
  state.paused=false;state.miniGame={type:'boss',round:0};
  assert.equal(engineFeedback(state),null);
  state.miniGame=null;
  assert.equal(engineFeedback({...state,airCombat:{}}),null);
  assert.equal(engineFeedback({...state,escape:{...state.escape,flight:{}}}),null);
  state.speed=0;
  assert.deepEqual(snapshot(state),before,
    'presentation and mock mode toggles must not alter original game receipts');
  assert.throws(()=>engineFeedback(state,{throttle:5}),RangeError);
});

class FakeAudio {
  constructor(){this.state='suspended';this.destination={};this.sources=[];}
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
  createBuffer(channels,frames,sampleRate){
    assert.equal(channels,2);assert.equal(sampleRate,48000);
    const data=[new Float32Array(frames),new Float32Array(frames)];
    return {getChannelData:n=>data[n]};
  }
  createBufferSource(){
    const source={buffer:null,loop:false,playbackRate:{value:1},stopped:false,
      connect(){},disconnect(){},start(){this.started=true;},
      stop(){this.stopped=true;this.onended?.();}};
    this.sources.push(source);return source;
  }
  async resume(){this.state='running';}
  async close(){this.state='closed';}
}
test('engine device follows user activation, pause and global SFX mute',async()=>{
  const audio=createAudioPlayer(FakeAudio);
  const state=createGame(1988);
  const gear1=engineFeedback(state,{throttle:1});
  audio.setEngine(gear1);
  assert.equal(audio.status().engineActive,false,'no sound before a gesture');
  await audio.activate();
  assert.equal(audio.status().engineActive,true);
  assert.equal(audio.status().engineRate,gear1.rate);
  const gear2=engineFeedback({...state,speed:100},{throttle:1});
  audio.setEngine(gear2);
  assert.equal(audio.status().engineRate,gear2.rate);
  audio.setPaused(true);
  assert.equal(audio.status().engineActive,false);
  audio.setPaused(false);
  assert.equal(audio.status().engineActive,true);
  audio.setSfxEnabled(false);
  assert.equal(audio.status().engineActive,false);
  audio.setSfxEnabled(true);
  assert.equal(audio.status().engineActive,true);
  audio.setEngine(null);
  assert.equal(audio.status().engineActive,false);
  assert.throws(()=>audio.setEngine({rate:Infinity,volume:1}),RangeError);
  audio.stop();
  assert.equal(audio.status().engineActive,false);
});
