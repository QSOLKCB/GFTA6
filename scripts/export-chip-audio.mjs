// SPDX-License-Identifier: Apache-2.0
// GFTA6-AUDIO-001: offline inspection/export of ORIGINAL generated chip audio.
// Run: node scripts/export-chip-audio.mjs [output-directory]
// Outputs are not bundled at runtime or published automatically.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createGameMusic,createGameSfx,MUSIC_MODES,SFX_KINDS} from '../src/soundtrack.js';

const directory=resolve(process.argv[2]??'audio-previews');
if(process.argv.length>3){
  console.error('Usage: node scripts/export-chip-audio.mjs [output-directory]');
  process.exitCode=2;
}else{
  await mkdir(directory,{recursive:true});
  const files=[
    ...MUSIC_MODES.map(name=>({name:'music-'+name+'.wav',score:createGameMusic(name)})),
    ...SFX_KINDS.map(name=>({name:'sfx-'+name+'.wav',score:createGameSfx(name)}))
  ];
  for(const {name,score} of files){
    // Never overwrite an existing audio file; previews are deliberate.
    const path=resolve(directory,name),bytes=score.wav();
    await writeFile(path,bytes,{flag:'wx'});
    console.log(name+'  '+bytes.length+' bytes  PCM16 stereo 48 kHz');
  }
  console.log('Generated '+files.length+' original offline tracks and effects in '+directory);
}
