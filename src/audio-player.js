// SPDX-License-Identifier: Apache-2.0
// GFTA6-AUDIO-001 — Web Audio device adapter; the deterministic VANILLAJS
// chip-audio module owns composition/envelope/PCM, never the device or clock.
// Audio is a side effect from user-initiated gameplay and cannot change state.
import {createGameMusic,createGameSfx,MUSIC_MODES,SFX_KINDS}
  from './soundtrack.js';

export function createAudioPlayer(AudioCtor){
  let context=null,musicBus=null,fxBus=null,current=null,scene=null;
  let activeScene=null,musicEnabled=true,sfxEnabled=true,paused=false;
  const buffers=new Map(),effects=new Set();
  function makeContext(){
    if(context)return context;
    if(typeof AudioCtor!=='function')throw Error('Web Audio API unavailable');
    context=new AudioCtor();
    musicBus=context.createGain();fxBus=context.createGain();
    musicBus.gain.value=.23;fxBus.gain.value=.48;
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
    renderScene();
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
  function setSfxEnabled(value){sfxEnabled=Boolean(value);return sfxEnabled;}
  function setPaused(value){
    paused=Boolean(value);
    if(musicBus)musicBus.gain.value=paused?0:.23;
    if(fxBus)fxBus.gain.value=paused?0:.48;
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
  function stop(){
    stopMusic();
    for(const e of effects){try{e.stop();}catch{}e.disconnect();}
    effects.clear();
    if(context){void context.close();context=null;}
    buffers.clear();scene=null;
  }
  function status(){
    return Object.freeze({available:typeof AudioCtor==='function',
      active:Boolean(context&&context.state==='running'),musicEnabled,sfxEnabled,
      scene,activeScene,paused,voices:effects.size,bufferCount:buffers.size});
  }
  return Object.freeze({activate,setScene,setMusicEnabled,setSfxEnabled,
    setPaused,effect,stop,status});
}
