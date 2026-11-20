// SPDX-License-Identifier: Apache-2.0
// GFTA6-AIRCOMBAT-001A: original, bounded arcade encounter authority.
// Unchanged upstream cockpit geometry and COCKPIT-002 missiles are vendored.
// Explicit 3D encounter coordinates are NOT a replacement for airframe physics.
import {quatMultiply} from '../vendor/vanillajs/math/index.js';
import {createCockpitRig, cockpitGunRays, sampleCockpitCamera}
  from '../vendor/vanillajs/cockpit-rig/index.js';
import {createMissileRack, launchMissile, stepMissiles,
  missileSummary, MISSILE_STEP} from '../vendor/vanillajs/missiles.js';
import {selectLockCandidate,selectGunTarget,missileLockDisplay,MISSILE_ACQUIRE_TICKS}
  from './combat-targeting.js';

export const AIRCOMBAT_FORMAT='gfta6.aircombat.v3';
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
    members:freeze([freeze({id:'derek-final',name:'DEREK AGAIN',paint:'#252c35',x:0,y:0,range:225})])}),
  freeze({name:'THE MUTUAL FRIENDS™',
    radio:'FRANK: I ONLY CAME BECAUSE SHE SAID THERE WOULD BE SNACKS.',
    members:freeze([
      freeze({id:'frank',name:'FRANK',paint:'#3e4750',x:-34,y:5,range:184}),
      freeze({id:'plus-one',name:'THE PLUS ONE',paint:'#76584e',x:-12,y:-4,range:202}),
      freeze({id:'steve',name:'STEVE',paint:'#30333d',x:18,y:6,range:212,hp:3,role:'interceptor'}),
      freeze({id:'ryan',name:'RYAN',paint:'#66564d',x:37,y:-6,range:232})
    ])}),
  freeze({name:'THE READ RECEIPTS™',
    radio:'BLUE TICKS: SHE SAW THAT YOU SAW THAT SHE SAW.',
    members:freeze([
      freeze({id:'seen-01',name:'SEEN 09:41',paint:'#48454c',x:-34,y:-4,range:176}),
      freeze({id:'typing',name:'STILL TYPING',paint:'#6b5147',x:-11,y:5,range:195,hp:3,role:'interceptor'}),
      freeze({id:'left-on-read',name:'LEFT ON READ',paint:'#343f49',x:14,y:-5,range:216}),
      freeze({id:'last-seen',name:'LAST SEEN',paint:'#75605a',x:35,y:4,range:230,hp:3,role:'interceptor'})
    ])}),
  freeze({name:'FINAL BOSS — THE FINAL WORD™',
    radio:'GIRLFRIEND: I JUST WANTED TO TALK. WHY ARE YOU FLYING?',
    boss:true,
    members:freeze([freeze({id:'final-word',name:'THE FINAL WORD™',
      paint:'#b15d86',x:0,y:0,range:220,hp:12,role:'boss'})])})
]);
export const BOSS_PHASE_LINES=freeze([
  'THE FINAL WORD™ — PHASE 1: I\'M FINE.',
  'THE FINAL WORD™ — PHASE 2: YOU SHOULD HAVE KNOWN.',
  'THE FINAL WORD™ — PHASE 3: WE NEED TO TALK.'
]);
export const BOSS_ATTACK_PERIOD=140;
export const BOSS_ATTACK_TELEGRAPH=30;
export const BOSS_ATTACK_IMPACT=75;
export function bossPhase(combat) {
  if(!combat || combat.format!==AIRCOMBAT_FORMAT)return null;
  const rival=combat.opponents.find(x=>x.role==='boss');
  if(!rival)return null;
  return rival.hp>8?1:rival.hp>4?2:3;
}
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
  m=>freeze({...m,role:m.role??'fighter',maxHp:m.hp??2,
    hp:m.hp??2,disengaged:false})
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
    lockTargetId:null,lockTicks:0,gunFeedback:null,
    hull:3,bossAttack:null,
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
  return freeze(combat.opponents.map((enemy,i)=>{
    const phase=enemy.role==='boss'?bossPhase(combat):null;
    const strafe=enemy.role==='boss'?drift*(phase===3?4:phase===2?3:2):
      (i%2===0?drift:-drift);
    return freeze({
      id:enemy.id,name:enemy.name,paint:enemy.paint,hp:enemy.hp,
      maxHp:enemy.maxHp,role:enemy.role,disengaged:enemy.disengaged,
      center:freeze([
        enemy.x+strafe,180+enemy.y,
        40-(enemy.range-Math.min(85,Math.trunc(t/7)))
      ]),radius:enemy.role==='boss'?26:enemy.role==='interceptor'?16:14
    });
  }));
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
export const combatLockStatus=combat=>missileLockDisplay(combat,
  combatTargets(combat),combatPose(combat),combatRackSummary(combat));
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
  let hull=combat.hull,bossAttack=combat.bossAttack;
  let gunFeedback=combat.gunFeedback;
  // Acquisition is an *uninterrupted* physical sight test. The upstream
  // 30-degree lock remains a necessary gate, but GFTA6 adds a stricter
  // 9-degree cone and a 48-tick stable-target requirement.
  const candidate=selectLockCandidate(pose,targets);
  let lockTargetId=null,lockTicks=0;
  if(rack.active.length===0 && rack.ammo>0 && rack.cooldown===0 && candidate){
    lockTargetId=candidate.id;
    lockTicks=candidate.id===combat.lockTargetId?
      Math.min(MISSILE_ACQUIRE_TICKS,combat.lockTicks+1):1;
  }
  const phaseBefore=bossPhase(combat);
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
  if(missile && !combat.lastMissile && rack.active.length===0) {
    if(rack.ammo===0) radio='MISSILE: OUT OF AMMUNITION';
    else if(rack.cooldown>0)radio='MISSILE: COOLING DOWN';
    else if(!candidate)radio='MISSILE: ALIGN THE TARGET WITH THE SIGHTS';
    else if(combat.lockTargetId!==candidate.id ||
      combat.lockTicks<MISSILE_ACQUIRE_TICKS)
      radio='MISSILE: HOLD SIGHT ON '+candidate.name+' TO ACQUIRE LOCK';
    else {
      const locked=targets.find(t=>t.id===lockTargetId);
      const launched=launchMissile(rack,pose,{center:[...locked.center],radius:locked.radius});
      rack=launched.rack;
      if(launched.status==='launched'){
        missileTargetId=locked.id;lockTargetId=null;lockTicks=0;
      }
      radio=launched.status==='launched'?
        'MISSILE AWAY — LOCKED ON '+locked.name+'.' :
        'MISSILE: '+launched.status.toUpperCase().replaceAll('-',' ');
    }
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
  if(gun && gunCooldown===0 && opponents.some(e=>!e.disengaged)) {
    shots++;
    gunCooldown=10;
    // The previously hard-coded first-surviving rival was NOT necessarily
    // under the real gun sights. Intersect every live target with the real
    // muzzle rays, then damage the nearest accepted intersection.
    const struck=selectGunTarget(pose,RIG,targets.filter(t=>
      opponents.some(e=>e.id===t.id&&!e.disengaged)));
    const victim=struck&&opponents.find(e=>e.id===struck.id);
    if(struck && victim && victim.hp>0) {
      gunHits++;
      const target=targets.find(t=>t.id===struck.id);
      impact(target,'gun',victim.hp<=1);
      opponents=damage(opponents,struck.id,1);
      gunFeedback=freeze({tick,kind:victim.hp<=1?'destroyed':'hit',
        id:struck.id,name:struck.name,remainingHp:Math.max(0,victim.hp-1)});
      radio='GUNS: HIT CONFIRMED — '+struck.name+' −1 HP';
    } else {
      gunFeedback=freeze({tick,kind:'miss',id:null,name:null,remainingHp:null});
      radio='GUNS: MISS — ALIGN WITH A VISIBLE ENEMY';
    }
  }
  // The boss alone has a telegraphed interception. The target lane
  // is latched 45 ticks before impact, so A/D can evade it. This never
  // changes any projectile, muzzle ray, missile lock or prior wave.
  const boss=opponents.find(x=>x.role==='boss');
  if(boss&&!boss.disengaged){
    const phase=boss.hp>8?1:boss.hp>4?2:3;
    if(phaseBefore!==null&&phaseBefore!==phase)radio=BOSS_PHASE_LINES[phase-1];
    if(view.waveTick%BOSS_ATTACK_PERIOD===BOSS_ATTACK_TELEGRAPH){
      bossAttack=freeze({aim:yaw,until:view.waveTick+
        BOSS_ATTACK_IMPACT-BOSS_ATTACK_TELEGRAPH});
      radio='WARNING: THE FINAL WORD HAS LOCKED YOUR PERSONAL SPACE. DODGE A/D!';
    }
    if(bossAttack&&view.waveTick>=bossAttack.until){
      if(Math.abs(yaw-bossAttack.aim)<.18){
        hull=Math.max(0,hull-1);
        radio=hull===0?'HULL BREACHED — REPLAY TO ARGUE ANOTHER DAY.':
          'THE FINAL WORD HIT YOUR HULL. PERSONAL SPACE VIOLATED.';
      }else radio='DODGED: THE FINAL WORD HAS NOTHING FURTHER TO ADD.';
      bossAttack=null;
    }
  }else bossAttack=null;
  let stage=combat.stage,status=hull===0?'shot-down':'active',waveTick=view.waveTick;
  if(status==='active'&&opponents.every(e=>e.disengaged)&&rack.active.length===0) {
    stage++;
    if(stage===AIRCOMBAT_WAVES.length) {
      status='won';
      radio='MISSION ACCOMPLISHED. ALL CONTACTS DISENGAGED.';
    } else {
      opponents=freshOpponents(stage);
      waveTick=0;bossAttack=null;
      radio=AIRCOMBAT_WAVES[stage].radio;
    }
  }
  return freeze({...combat,tick,waveTick,yaw,pitch,gunCooldown,shots,gunHits,
    missileHits,lastMissile:missile,missileTargetId,opponents,rack,stage,status,radio,
    lockTargetId,lockTicks,gunFeedback,
    effects:freeze(effects.slice(-16)),hull,bossAttack});
}
