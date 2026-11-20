// SPDX-License-Identifier: Apache-2.0
// GFTA6-POLISH-001: pure screen-safe dialogue layout.
// All speech is presentation data. No simulation or random state.
import {streetCaption} from './street-voice.js';

const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
const WIDTH=246,CHARACTERS=29,MAX_LINES=3;
export const STREET_BUBBLE_LIFETIME=108;

/** Stable viewport-clamped bubble geometry for a single authored event.
 * Return null for stale or mismatched events; never mutate the actor/receipt.
 */
export function streetBubbleLayout(actor,event,tick,viewport){
  if(!event||!actor||actor.id!==event.id||
      !Number.isSafeInteger(tick)||tick<event.tick||
      tick-event.tick>STREET_BUBBLE_LIFETIME)return null;
  if(!viewport||!['x','y','width','height'].every(k=>Number.isFinite(viewport[k]))||
      viewport.width<WIDTH+16||viewport.height<120)
    throw RangeError('valid visible viewport required');
  const lines=[''];
  for(const word of streetCaption(event.lineId).split(' ')){
    const last=lines.length-1;
    if(lines[last]&&lines[last].length+word.length+1>CHARACTERS)
      lines.push(word);
    else lines[last]+=(lines[last]?' ':'')+word;
  }
  const visible=Object.freeze(lines.slice(0,MAX_LINES));
  const h=12+visible.length*17;
  const offset=actor.kind==='car'?65:46;
  const x=clamp(actor.x-WIDTH/2,viewport.x+8,viewport.x+viewport.width-WIDTH-8);
  const y=clamp(actor.y-offset-h,viewport.y+8,
    viewport.y+viewport.height-h-8);
  return Object.freeze({x,y,w:WIDTH,h,lines:visible,
    kind:actor.kind,id:actor.id});
}
