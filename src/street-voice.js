// SPDX-License-Identifier: Apache-2.0
// GFTA6-DRIVING-002: original deliberately primitive robotic speech synthesis.
// Distinct cast voices; no recording, external TTS engine, randomness or network.
export const STREET_VOICE_RATE=48000;
const TAU=Math.PI*2;
const SCRIPT=Object.freeze({
  arsehole:{kind:'car',caption:'ARSEHOLE... ARSEHOLE?!',tokens:['ah','ss','ho','ll','ah','ss','ho','ll']},
  asshole:{kind:'car',caption:'ASSHOLE... ASSHOLE...',tokens:['ass','ho','ll','ass','ho','ll']},
  indicator:{kind:'car',caption:'MY INDICATOR IS A PERSONAL BOUNDARY!',tokens:['my','in','di','kay','tor','iz','a','per','son','al','bound','ree']},
  roundabout:{kind:'car',caption:'IT’S A ROUNDABOUT, NOT A PERSONALITY TEST!',tokens:['its','a','round','a','bout','not','a','per','son','al','i','tee','test']},
  dashcam:{kind:'car',caption:'MY DASHCAM HAS A PODCAST!',tokens:['my','dash','cam','haz','a','pod','cast']},
  horn:{kind:'car',caption:'I PAID FOR THIS HORN. BEEP, DICKHEAD!',tokens:['i','payd','for','this','horn','beep','dik','hed']},
  lane:{kind:'car',caption:'I OWN THIS LANE EMOTIONALLY!',tokens:['i','own','this','layn','ee','moh','shun','al','lee']},
  outta:{kind:'pedestrian',caption:'OUTTA MY WAY, DICKHEAD!',tokens:['out','ta','my','way','dik','hed']},
  walkin:{kind:'pedestrian',caption:"I’M WALKIN’ 'ERE!",tokens:['im','walk','in','air']},
  fuggedaboutit:{kind:'pedestrian',caption:'FUGGEDABOUTIT!',tokens:['fuh','ged','a','bout','it']},
  crosswalk:{kind:'pedestrian',caption:'THIS CROSSING IS MY PERSONAL EMPIRE!',tokens:['this','cross','ing','iz','my','per','son','al','em','pyre']},
  footpath:{kind:'pedestrian',caption:'THE FOOTPATH HAS RIGHT OF WAY, YA NUMPTY!',tokens:['tha','foot','path','haz','right','ov','way','ya','nump','tee']},
  divorce:{kind:'pedestrian',caption:"YOUR CAR SOUNDS LIKE A DIVORCE COURT!",tokens:['yor','car','sounds','like','a','di','vors','kort']},
  scooter:{kind:'pedestrian',caption:'MOVE YOUR SCOOTER, YOU ABSOLUTE GALAH!',tokens:['moov','yor','skoo','ter','yoo','ab','so','loot','ga','lah']}
});
export const STREET_LINES=Object.freeze(Object.fromEntries(
  Object.entries(SCRIPT).map(([id,v])=>[id,Object.freeze({kind:v.kind,
    caption:v.caption,tokens:Object.freeze([...v.tokens])})])));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function hash(text){
  let value=2166136261;
  for(const c of text){value=Math.imul(value^c.charCodeAt(0),16777619)>>>0;}
  return value||1;
}
function vowel(token){
  if(/[ou]/.test(token))return [440,900];
  if(/[ei]/.test(token))return [390,1880];
  return [660,1170];
}
/** Returns immutable metadata with independent signed 16-bit stereo samples.
 * Crude fricative onset, pitched resonances and glottal consonant closure.
 * Actor-id controls characteristic timbre without any device-specific voice.
 */
export function synthStreetLine(lineId,actorId='cab'){
  if(typeof lineId!=='string'||!Object.hasOwn(STREET_LINES,lineId))
    throw RangeError('unknown authored NPC dialogue');
  if(typeof actorId!=='string'||!(/^[a-z]{2,24}$/).test(actorId))
    throw RangeError('invalid authored actor id');
  const script=STREET_LINES[lineId];
  const seed=hash(actorId+':'+lineId);
  const pedestrian=script.kind==='pedestrian';
  const actorTone=hash(actorId)%43;
  const base=(pedestrian?170:94)+actorTone;
  const syllableFrames=7200;
  const frames=script.tokens.length*syllableFrames+4800;
  const pcm=new Int16Array(frames*2);
  let noise=seed;
  for(let n=0;n<script.tokens.length;n++){
    const token=script.tokens[n].toLowerCase();
    const [f1,f2]=vowel(token),start=n*syllableFrames;
    const pitch=base+(n%3)*6;
    const fricative=/^(f|s|sh|ss|th|h)/.test(token);
    const hard=/^(k|g|d|t|b|p)/.test(token);
    for(let j=0;j<syllableFrames;j++){
      const i=start+j,t=j/STREET_VOICE_RATE;
      noise^=noise<<13;noise^=noise>>>17;noise^=noise<<5;noise>>>=0;
      const white=(noise/0xffffffff)*2-1;
      const gate=clamp(j/920,0,1)*clamp((syllableFrames-j)/980,0,1);
      const onset=clamp((2200-j)/2200,0,1);
      const phase=TAU*pitch*t;
      const vowelWave=(Math.sin(phase)*.65+Math.sin(phase*2)*.28+
        Math.sin(phase*3)*.12)*(0.53+.19*Math.sin(TAU*f1*t)+
          .13*Math.sin(TAU*f2*t));
      const hiss=white*onset*(fricative?.31:.055);
      const pop=hard?white*Math.exp(-j/160)*.34:0;
      const raw=clamp(gate*(vowelWave*.54+hiss+pop),-.85,.85);
      // Intentionally small stereo separation; no random floating-point state.
      pcm[2*i]=Math.round(raw*32767*.74);
      pcm[2*i+1]=Math.round(raw*32767*.69);
    }
  }
  return Object.freeze({lineId,actorId,caption:script.caption,kind:script.kind,
    sampleRate:STREET_VOICE_RATE,frames,pcm});
}
export function streetCaption(lineId){
  if(typeof lineId!=='string'||!Object.hasOwn(STREET_LINES,lineId))
    throw RangeError('unknown NPC line');
  return STREET_LINES[lineId].caption;
}
