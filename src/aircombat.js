// SPDX-License-Identifier: Apache-2.0
// GFTA6-AIRCOMBAT-001A: original, bounded arcade encounter authority.
// Unchanged upstream cockpit geometry and COCKPIT-002 missiles are vendored.
// Explicit 3D encounter coordinates are NOT a replacement for airframe physics.
import {quatMultiply} from '../vendor/vanillajs/math/index.js';
import {createCockpitRig, cockpitGunRays, testCockpitTarget, sampleCockpitCamera}
  from '../vendor/vanillajs/cockpit-rig/index.js';
import {createMissileRack, missileLock, launchMissile, stepMissiles,
  missileSummary, MISSILE_STEP} from '../vendor/vanillajs/missiles.js';

export const AIRCOMBAT_FORMAT='gfta6.aircombat.v1';
export const AIRCOMBAT_UPSTREAM='QSOLKCB/VANILLAJS@ae0b594f006ec3c1add71574c830ddde9ff5fa66';
export const AIRCOMBAT_MAX_TICKS=36000;
const freeze=Object.freeze;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const AIRCOMBAT_WAVES=freeze([
  freeze({name:'JUST A FRIEND™',radio:'DEREK: I am just a friend. THE MISSILE IS PLATONIC.',
    members:freeze([freeze({id:'derek-1',name:'DEREK',paint:'#373d48',x:0,y:0,range:185})])}),
  freeze({name:'THE GROUP CHAT SQUADRON™',radio:'GROUP CHAT: SHE SAID YOU WOULD OVERREACT.',
    members:freeze([
      freeze({id:'chad',name:'CHAD',paint:'#4d3935',x:-27,y:8,range:180}),
      freeze({id:'brad',name:'BRAD',paint:'#292d39',x:5,y:0,range:205}),
      freeze({id:'kyle',name:'KYLE',paint:'#665042',x:27,y:-8,range:225})
    ])}),
  freeze({name:'TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!™',
    radio:'COMPUTER: TOO CLOSE FOR MISSILES. PLAYER: THAT WAS NOT THE PLAN.',
    members:freeze([freeze({id:'derek-final',name:'DEREK AGAIN',paint:'#252c35',x:0,y:0,range:225})])})
]);
export const AIRCOMBAT_FINAL_TEXT=[
  'MISSION ACCOMPLISHED.',
  '',
  'Your radio crackles.',
  '"Hey babe, it\'s me. Derek said you were being really immature about the whole thing."',
  '',
  'PLAYER: "DEREK IS CURRENTLY PARACHUTING INTO THE ENGLISH CHANNEL."',
  '"Can you pick him up?"',
  '',
  'NEW MISSION UNLOCKED',
  '"HE\'S ACTUALLY A REALLY NICE GUY."™',
  'DIFFICULTY: EMOTIONAL AIR SUPERIORITY'
].join('\n');

const RIG=createCockpitRig({
  seat:[0,.55,.4],nose:[0,.1,-2],chase:[0,2,10],external:[9,3,12],
  guns:[[-2,0,-1.2],[2,0,-1.2]],convergence:205,fov:1.05
});
export const combatRig=()=>RIG;
const freshOpponents=wave=>freeze(AIRCOMBAT_WAVES[wave].members.map(
  m=>freeze({...m,hp:2,disengaged:false})
));
function int(v,a,b,label) {
  if(!Number.isSafeInteger(v)||v<a||v>b)throw RangeError(label+' out of bounds');
  return v;
}
export function createAirCombat(seed) {
  int(seed,0,0xffffffff,'seed');
  return freeze({format:AIRCOMBAT_FORMAT,seed,stage:0,tick:0,waveTick:0,
    opponents:freshOpponents(0),yaw:0,pitch:0,gunCooldown:0,
    shots:0,gunHits:0,missileHits:0,lastMissile:false,effects:freeze([]),
    rack:createMissileRack({ammo:8}),missileTargetId:null,status:'active',
    radio:AIRCOMBAT_WAVES[0].radio});
}
export function combatPose(combat) {
  if(!combat||combat.format!==AIRCOMBAT_FORMAT)throw TypeError('combat required');
  // Arcade steering and altitude translated into a documented world +Y,
  // body -Z, normalized quaternion pose for physical line-of-sight tests.
  const y=combat.yaw/2,p=combat.pitch/2;
  const q=quatMultiply([0,Math.sin(y),0,Math.cos(y)],
    [Math.sin(p),0,0,Math.cos(p)]);
  return freeze({position:[0,180,40],velocity:[0,0,-90],orientation:q});
}
export function combatTargets(combat) {
  const t=combat.waveTick, phase=(t+combat.seed%53)%200;
  const triangle=phase<=100?phase:200-phase;
  const drift=Math.trunc((triangle-50)/12);
  return freeze(combat.opponents.map((enemy,i)=>freeze({
    id:enemy.id,name:enemy.name,paint:enemy.paint,hp:enemy.hp,
    disengaged:enemy.disengaged,center:freeze([
      enemy.x+(i%2===0?drift:-drift),180+enemy.y,
      40-(enemy.range-Math.min(85,Math.trunc(t/7)))
    ]),radius:14
  })));
}
export function combatCamera(combat,mode='cockpit') {
  return sampleCockpitCamera(combatPose(combat),RIG,mode,{yaw:0,pitch:0});
}
export function combatSight(combat,width,height) {
  const pose=combatPose(combat),camera=combatCamera(combat);
  // Derived from the upstream cockpit rig; cannot change gun origins.
  return {camera,raySet:cockpitGunRays(pose,RIG)};
}
export const combatRackSummary=combat=>missileSummary(combat.rack);
function damage(opponents,id,amount) {
  return freeze(opponents.map(e=>e.id===id&&e.hp>0?
    freeze({...e,hp:Math.max(0,e.hp-amount),
      disengaged:e.hp<=amount}):e));
}
export function stepAirCombat(combat,control={}) {
  if(!combat||combat.format!==AIRCOMBAT_FORMAT||combat.status!=='active')
    throw RangeError('active aircombat required');
  const steer=int(control.steer??0,-1,1,'steer');
  const throttle=int(control.throttle??0,-1,1,'pitch');
  if(typeof (control.brake??false)!=='boolean'||
     typeof (control.missile??false)!=='boolean')
    throw TypeError('fire input must be boolean');
  const gun=control.brake===true,missile=control.missile===true;
  const tick=combat.tick+1;
  if(tick>AIRCOMBAT_MAX_TICKS)
    return freeze({...combat,status:'timed-out',radio:'THE GROUP CHAT IS STILL TYPING.'});
  const yaw=clamp(combat.yaw+steer*.012,-.58,.58);
  const pitch=clamp(combat.pitch+throttle*.009,-.32,.32);
  const view={...combat,tick,waveTick:combat.waveTick+1,yaw,pitch};
  const targets=combatTargets(view);
  const focused=targets.find(e=>!e.disengaged);
  const pose=combatPose(view);
  let opponents=combat.opponents,rack=combat.rack,gunCooldown=Math.max(0,combat.gunCooldown-1);
  let shots=combat.shots,gunHits=combat.gunHits,missileHits=combat.missileHits;
  let radio=combat.radio,missileTargetId=combat.missileTargetId;
  // Retain only bounded presentation receipts; never change damage, score,
  // physical sight checks, missile-target ownership or campaign progression.
  const effects=combat.effects.filter(e=>tick-e.tick<70);
  const impact=(target,source,lethal)=>{
    effects.push(freeze({tick,id:target.id,source,
      kind:lethal?'explosion':'hit',center:freeze([...target.center])}));
  };
  // Each one-at-a-time missile is bound to the *launch-time* opponent ID.
  // Gunfire can disengage that rival before the missile resolves; the rack
  // must still advance towards the original target, never retarget to the
  // next live rival or crash because no live rival remains.
  if(focused && missile && !combat.lastMissile && rack.active.length===0) {
    const launched=launchMissile(rack,pose,{center:[...focused.center],radius:focused.radius});
    rack=launched.rack;
    if(launched.status==='launched') missileTargetId=focused.id;
    radio=launched.status==='launched'?
      'MISSILE AWAY — '+focused.name+' IS JUST A FRIEND.' :
      'MISSILE: '+launched.status.toUpperCase().replaceAll('-',' ');
  }
  if(rack.active.length>0) {
    const tracked=targets.find(t=>t.id===missileTargetId);
    if(!tracked) throw Error('airborne missile target receipt invalid');
    for(let n=0;n<2;n++) {
      const stepped=stepMissiles(rack,
        {center:[...tracked.center],radius:tracked.radius},MISSILE_STEP);
      rack=stepped.rack;
      for(const event of stepped.events) if(event.type==='hit') {
        missileHits++;
        const old=opponents.find(e=>e.id===tracked.id);
        if(old.hp>0)impact(tracked,'missile',old.hp<=2);
        opponents=damage(opponents,tracked.id,2);
        radio=tracked.name+' DISENGAGING. PARACHUTE DEPLOYED.';
      }
    }
    if(rack.active.length===0) missileTargetId=null;
  } else {
    // Maintain the rack's fixed 120Hz cooldown clock even with no
    // projectile. The dummy goal is never used for damage or lock.
    const old=focused??targets[0];
    for(let n=0;n<2;n++)
      rack=stepMissiles(rack,{center:[...old.center],radius:old.radius},MISSILE_STEP).rack;
    missileTargetId=null;
  }
  if(focused && gun && gunCooldown===0 && !opponents.find(e=>e.id===focused.id).disengaged) {
    shots++;
    gunCooldown=10;
    const results=testCockpitTarget(pose,RIG,[...focused.center],focused.radius);
    if(results.some(hit=>hit.hit)) {
      gunHits++;
      const old=opponents.find(e=>e.id===focused.id);
      if(old.hp>0)impact(focused,'gun',old.hp<=1);
      opponents=damage(opponents,focused.id,1);
      radio=focused.name+': THAT WAS AN UNFRIENDLY FRIENDLY WARNING.';
    } else radio='GUNS: SIGHT ALIGNMENT REQUIRED.';
  }
  let stage=combat.stage,status='active',waveTick=view.waveTick;
  if(opponents.every(e=>e.disengaged)&&rack.active.length===0) {
    stage++;
    if(stage===AIRCOMBAT_WAVES.length) {
      status='won';
      radio='MISSION ACCOMPLISHED. ALL CONTACTS DISENGAGED.';
    } else {
      opponents=freshOpponents(stage);
      waveTick=0;
      radio=AIRCOMBAT_WAVES[stage].radio;
    }
  }
  return freeze({...combat,tick,waveTick,yaw,pitch,gunCooldown,shots,gunHits,
    missileHits,lastMissile:missile,missileTargetId,opponents,rack,stage,status,radio,
    effects:freeze(effects.slice(-16))});
}
