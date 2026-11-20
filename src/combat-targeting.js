// SPDX-License-Identifier: Apache-2.0
// GFTA6-TARGET-003 — game-owned acquisition rules and physical target selection.
// VANILLAJS still decides whether a missile lock/ray intersection is valid.
import {rotate,dot,subtract,length} from '../vendor/vanillajs/math/index.js';
import {missileLock} from '../vendor/vanillajs/missiles.js';
import {testCockpitTarget} from '../vendor/vanillajs/cockpit-rig/index.js';

// 48 consecutive 60 Hz simulation ticks = 0.8 seconds.
export const MISSILE_ACQUIRE_TICKS=48;
export const MISSILE_LOCK_HALF_ANGLE=9*Math.PI/180;
const freeze=Object.freeze;
export function selectLockCandidate(pose,targets) {
  const forward=rotate(pose.orientation,[0,0,-1]);
  let best=null,angle=Infinity;
  for(const target of targets) {
    if(target.disengaged)continue;
    const status=missileLock(pose,{center:[...target.center],radius:target.radius});
    if(!status.locked)continue;
    const to=subtract(target.center,pose.position),range=length(to);
    if(range<=0)continue;
    const offset=Math.acos(Math.max(-1,Math.min(1,dot(to,forward)/range)));
    if(offset>MISSILE_LOCK_HALF_ANGLE)continue;
    if(offset<angle) {
      angle=offset;
      best=freeze({id:target.id,name:target.name,angle:offset,
        distance:status.distance});
    }
  }
  return best;
}
/** Physical rays from every muzzle, against every surviving target.
 * Hits on different aircraft never depend on enumeration order; the nearest
 * intersection along an actual muzzle ray wins.
 */
export function selectGunTarget(pose,rig,targets) {
  let nearest=null;
  for(const target of targets) {
    if(target.disengaged)continue;
    const impacts=testCockpitTarget(pose,rig,[...target.center],target.radius);
    for(const hit of impacts) {
      if(!hit.hit)continue;
      if(nearest===null || hit.distance<nearest.distance)
        nearest=freeze({id:target.id,name:target.name,center:target.center,
          distance:hit.distance,gun:hit.gun});
    }
  }
  return nearest;
}
export function missileLockDisplay(combat,targets,pose,rack) {
  if(!combat||!rack)throw TypeError('combat and rack required');
  if(combat.status!=='active')return freeze({status:'COMPLETE',progress:0,targetId:null,ready:false});
  if(rack.active>0)return freeze({status:'MISSILE IN FLIGHT',progress:0,targetId:null,ready:false});
  if(rack.ammo===0)return freeze({status:'OUT OF MISSILES',progress:0,targetId:null,ready:false});
  if(rack.cooldownTicks>0)return freeze({status:'COOLDOWN',progress:0,targetId:null,ready:false});
  const candidate=selectLockCandidate(pose,targets);
  if(!candidate)return freeze({status:'ALIGN RETICLE',progress:0,targetId:null,ready:false});
  const progress=candidate.id===combat.lockTargetId?Math.min(MISSILE_ACQUIRE_TICKS,combat.lockTicks):0;
  const ready=progress===MISSILE_ACQUIRE_TICKS;
  return freeze({status:ready?'LOCK ACQUIRED':'ACQUIRING LOCK',
    progress,targetId:candidate.id,name:candidate.name,ready});
}
