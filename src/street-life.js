// SPDX-License-Identifier: Apache-2.0
// GFTA6-DRIVING-002 — deterministic street cast. Presentation-only actors.
// No NPC may alter vehicle physics, quest state, pedestrian safety or replay.
import {WORLD} from './world.js';
import {vehicleArt} from './vehicle-art.js';

const DRIVER_LINES=Object.freeze(['arsehole','asshole','indicator','roundabout','dashcam','horn','lane']);
const WALKER_LINES=Object.freeze(['outta','walkin','fuggedaboutit','crosswalk','footpath','divorce','scooter']);
const FROZEN_CARS=Object.freeze([
  {id:'cab',axis:'x',lane:150,start:165,velocity:3,divisor:8,dir:1,profile:'hatchback',paint:'#f4be5e',lines:['arsehole','asshole','indicator']},
  {id:'honk',axis:'x',lane:190,start:730,velocity:5,divisor:9,dir:-1,profile:'coupe',paint:'#ba85ec',lines:['horn','lane','dashcam']},
  {id:'ute',axis:'y',lane:536,start:425,velocity:4,divisor:9,dir:1,profile:'van',paint:'#9dd0a0',lines:['roundabout','asshole','indicator']},
  {id:'silver',axis:'x',lane:416,start:1000,velocity:3,divisor:7,dir:-1,profile:'coupe',paint:'#d2dbeb',lines:['lane','dashcam','arsehole']},
  {id:'van',axis:'y',lane:974,start:665,velocity:3,divisor:8,dir:-1,profile:'van',paint:'#ecb3aa',lines:['horn','roundabout','asshole']},
  {id:'late',axis:'x',lane:714,start:340,velocity:5,divisor:11,dir:1,profile:'hatchback',paint:'#89c6db',lines:['indicator','horn','lane']}
].map(item=>Object.freeze({...item,lines:Object.freeze(item.lines)})));
const FROZEN_PEOPLE=Object.freeze([
  {id:'newyork',axis:'x',lane:222,start:174,velocity:2,divisor:11,dir:1,paint:'#fbd185',lines:['outta','walkin','fuggedaboutit']},
  {id:'parcelguy',axis:'x',lane:492,start:922,velocity:2,divisor:13,dir:-1,paint:'#a6d7ee',lines:['crosswalk','footpath','scooter']},
  {id:'inspector',axis:'y',lane:1116,start:207,velocity:2,divisor:13,dir:1,paint:'#fa99b4',lines:['footpath','divorce','crosswalk']},
  {id:'slowpoke',axis:'x',lane:642,start:450,velocity:1,divisor:9,dir:-1,paint:'#9edac4',lines:['walkin','fuggedaboutit','outta']},
  {id:'headphones',axis:'y',lane:614,start:758,velocity:2,divisor:12,dir:1,paint:'#e7b6f5',lines:['scooter','footpath','divorce']},
  {id:'walker',axis:'x',lane:1026,start:1100,velocity:2,divisor:15,dir:-1,paint:'#e6cf8f',lines:['crosswalk','outta','walkin']}
].map(item=>Object.freeze({...item,lines:Object.freeze(item.lines)})));

export const STREET_CARS=FROZEN_CARS;
export const STREET_PEDESTRIANS=FROZEN_PEOPLE;
export const STREET_LINE_IDS=Object.freeze([...new Set([...DRIVER_LINES,...WALKER_LINES])]);
const wrap=(n,span)=>((n%span)+span)%span;
function place(item,seed,tick,kind){
  const span=item.axis==='x'?WORLD.width-48:WORLD.height-48;
  const phase=(seed%13)-6;
  const movement=Math.trunc(tick*item.velocity/item.divisor)*item.dir;
  const progress=24+wrap(item.start+phase+movement-24,span);
  const x=item.axis==='x'?progress:item.lane;
  const y=item.axis==='x'?item.lane:progress;
  const art=kind==='car'?vehicleArt(item.profile):null;
  return Object.freeze({id:item.id,kind,x,y,paint:item.paint,
    skin:art?Object.freeze({...art,paint:item.paint}):null,
    headingFine:item.axis==='x'?(item.dir===1?0:512):(item.dir===1?768:256),
    lines:item.lines,depth:y});
}
/** Original cast positions depend only on seed and fixed simulation tick. */
export function streetActors(seed,tick){
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||
      !Number.isSafeInteger(tick)||tick<0)
    throw RangeError('uint32 seed and nonnegative integer tick required');
  return Object.freeze([
    ...FROZEN_CARS.map(v=>place(v,seed,tick,'car')),
    ...FROZEN_PEOPLE.map(v=>place(v,seed,tick,'pedestrian'))
  ]);
}
/** Two times each 120 ticks, one bounded nearby voice event.
 * Car and pedestrian selections are separate. No wall clock or RNG state.
 */
export function streetMoment(seed,tick,player){
  if(!Number.isSafeInteger(tick)||tick<0)throw RangeError('tick required');
  if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.y))
    throw TypeError('finite player XY required');
  const slot=tick%120,kind=slot===30?'car':slot===90?'pedestrian':null;
  if(!kind)return null;
  const candidates=streetActors(seed,tick).filter(a=>a.kind===kind)
    .map(a=>({actor:a,distance:Math.hypot(a.x-player.x,a.y-player.y)}))
    .filter(entry=>entry.distance<=205);
  candidates.sort((a,b)=>a.distance-b.distance||a.actor.id.localeCompare(b.actor.id));
  if(!candidates.length)return null;
  const actor=candidates[0].actor;
  const index=Math.floor(tick/120)%actor.lines.length;
  return Object.freeze({id:actor.id,kind,actorX:actor.x,actorY:actor.y,
    lineId:actor.lines[index],tick,distance:Math.round(candidates[0].distance)});
}
