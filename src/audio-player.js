// SPDX-License-Identifier: Apache-2.0
// GFTA6-AUDIO-001 — Web Audio device adapter; the deterministic VANILLAJS
// chip-audio module owns composition/envelope/PCM, never the device or clock.
// Audio is a side effect from user-initiated gameplay and cannot change state.
import {createGameMusic,createGameSfx,MUSIC_MODES,SFX_KINDS}
  from './soundtrack.js';
import {synthFrustratedEngine} from './frustration-engine.js';
import {STREET_LINES,synthStreetLine} from './street-voice.js';

export function createAudioPlayer(AudioCtor){
  let context=null,musicBus=null,fxBus=null,current=null,scene=null;
  let activeScene=null,musicEnabled=true,sfxEnabled=true,paused=false;
  const buffers=new Map(),effects=new Set();
  let engineSource=null,engineGain=null,engineDesired=null;
  let streetEnabled=false;
  const streetBuffers=new Map(),streetVoices=new Set();
  function syncBusGains(){
    if(!context)return;
    musicBus.gain.value=paused?0:.23;
    fxBus.gain.value=paused||!sfxEnabled?0:.48;
  }
  function makeContext(){
    if(context)return context;
    if(typeof AudioCtor!=='function')throw Error('Web Audio API unavailable');
    context=new AudioCtor();
    musicBus=context.createGain();fxBus=context.createGain();
    syncBusGains();
    musicBus.connect(context.destination);fxBus.connect(context.destination);
    return context;
  }
  function bufferFor(kind,mode=false){
    const key=(mode?'song:':'fx:')+kind;
    if(buffers.has(key))return buffers.get(key);
    const score=mode?createGameMusic(kind):createGameSfx(kind);
    const pcm=score.renderAll();
    const buffer=context.createBuffer(2,score.frames,score.sampleRate);
    for(let channel=0;channel<2;channel++){
      const data=buffer.getChannelData(channel);
      for(let i=0;i<score.frames;i++)
        data[i]=pcm[2*i+channel]/32768;
    }
    buffers.set(key,buffer);
    return buffer;
  }
  function engineBuffer(){
    if(buffers.has('engine'))return buffers.get('engine');
    const pcm=synthFrustratedEngine();
    const buffer=context.createBuffer(2,pcm.frames,pcm.sampleRate);
    for(let channel=0;channel<2;channel++){
      const data=buffer.getChannelData(channel);
      for(let i=0;i<pcm.frames;i++)data[i]=pcm.pcm[2*i+channel]/32768;
    }
    buffers.set('engine',buffer);
    return buffer;
  }
  function stopEngine(){
    if(engineSource){
      try{engineSource.stop();}catch{}
      engineSource.disconnect();engineSource=null;
    }
    if(engineGain){engineGain.disconnect();engineGain=null;}
  }
  function syncEngine(){
    if(!context||context.state!=='running'||!engineDesired||paused||!sfxEnabled){
      stopEngine();return;
    }
    if(!engineSource){
      const source=context.createBufferSource();
      source.buffer=engineBuffer();source.loop=true;
      const gain=context.createGain();
      source.connect(gain);gain.connect(fxBus);
      source.start();
      engineSource=source;engineGain=gain;
    }
    engineSource.playbackRate.value=engineDesired.rate;
    engineGain.gain.value=engineDesired.volume;
  }
  function setEngine(next){
    if(next!==null&&(!next||!Number.isFinite(next.rate)||
        next.rate<.1||next.rate>4||!Number.isFinite(next.volume)||
        next.volume<0||next.volume>1))
      throw RangeError('invalid engine feedback');
    engineDesired=next;syncEngine();
  }
  function stopStreet(){
    for(const voice of streetVoices){
      try{voice.source.stop();}catch{}
      voice.source.disconnect();
      voice.gain.disconnect();
    }
    streetVoices.clear();
  }
  function setStreetEnabled(value){
    streetEnabled=Boolean(value);
    if(!streetEnabled)stopStreet();
  }
  function streetLine(event){
    if(!event||typeof event!=='object'||!Object.hasOwn(STREET_LINES,event.lineId)||
        STREET_LINES[event.lineId].kind!==event.kind ||
        typeof event.id!=='string'||!/^[a-z]{2,24}$/.test(event.id) ||
        !Number.isFinite(event.distance)||event.distance<0||event.distance>205)
      throw RangeError('invalid authored street speech event');
    if(!context||context.state!=='running'||!streetEnabled||!sfxEnabled||paused||
        streetVoices.size>=2)return false;
    const key=event.lineId+':'+event.id;
    let buffer=streetBuffers.get(key);
    if(!buffer){
      const pcm=synthStreetLine(event.lineId,event.id);
      buffer=context.createBuffer(2,pcm.frames,pcm.sampleRate);
      for(let channel=0;channel<2;channel++){
        const data=buffer.getChannelData(channel);
        for(let i=0;i<pcm.frames;i++)data[i]=pcm.pcm[2*i+channel]/32768;
      }
      if(streetBuffers.size>=24)streetBuffers.clear();
      streetBuffers.set(key,buffer);
    }
    const source=context.createBufferSource();
    const gain=context.createGain();
    source.buffer=buffer;source.connect(gain);gain.connect(fxBus);
    gain.gain.value=Math.max(.18,.75-event.distance/450);
    const voice={source,gain};streetVoices.add(voice);
    source.onended=()=>{
      streetVoices.delete(voice);source.disconnect();gain.disconnect();
    };
    source.start();return true;
  }
  function stopMusic(){
    if(current){
      try{current.stop();}catch{}
      current.disconnect();current=null;
    }
    activeScene=null;
  }
  function renderScene(){
    if(!context||context.state!=='running')return;
    if(!musicEnabled||!scene){stopMusic();return;}
    if(activeScene===scene&&current)return;
    stopMusic();
    const source=context.createBufferSource();
    source.buffer=bufferFor(scene,true);
    source.loop=true;
    source.connect(musicBus);
    source.start();
    current=source;activeScene=scene;
  }
  async function activate(){
    const ctx=makeContext();if(ctx.state==='suspended')await ctx.resume();
    renderScene();syncEngine();
    return ctx.state==='running';
  }
  function setScene(next){
    if(next!==null&&!MUSIC_MODES.includes(next))throw RangeError('unknown music scene');
    scene=next;renderScene();
  }
  function setMusicEnabled(value){
    musicEnabled=Boolean(value);
    renderScene();
    return musicEnabled;
  }
  function setSfxEnabled(value){
    sfxEnabled=Boolean(value);
    syncBusGains();syncEngine();
    if(!sfxEnabled)stopStreet();
    return sfxEnabled;
  }
  function setPaused(value){
    paused=Boolean(value);
    syncBusGains();syncEngine();
    if(paused)stopStreet();
  }
  function effect(kind){
    if(!SFX_KINDS.includes(kind))throw RangeError('unknown effect');
    if(!context||context.state!=='running'||!sfxEnabled||paused)return false;
    if(effects.size>=12)return false; // bounded simultaneous one-shot voices
    const source=context.createBufferSource();
    source.buffer=bufferFor(kind,false);
    source.connect(fxBus);
    effects.add(source);
    source.onended=()=>{effects.delete(source);source.disconnect();};
    source.start();
    return true;
  }
  function streetDesiredReset(){streetEnabled=false;streetBuffers.clear();}
  function stop(){
    stopMusic();stopEngine();stopStreet();streetDesiredReset();engineDesired=null;
    for(const e of effects){try{e.stop();}catch{}e.disconnect();}
    effects.clear();
    if(context){void context.close();context=null;}
    buffers.clear();scene=null;
  }
  function status(){
    return Object.freeze({available:typeof AudioCtor==='function',
      active:Boolean(context&&context.state==='running'),musicEnabled,sfxEnabled,
      scene,activeScene,paused,voices:effects.size,bufferCount:buffers.size,
      engineActive:Boolean(engineSource),engineRate:engineSource?.playbackRate.value??null,
      streetVoices:streetVoices.size,streetEnabled});
  }
  return Object.freeze({activate,setScene,setMusicEnabled,setSfxEnabled,
    setPaused,setEngine,setStreetEnabled,stopStreet,streetLine,effect,stop,status});
}
