// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAirCombat,combatPose,combatRig,combatTargets,
  combatLockStatus,combatRackSummary,stepAirCombat,AIRCOMBAT_WAVES}
  from '../src/aircombat.js';
import {MISSILE_ACQUIRE_TICKS,MISSILE_LOCK_HALF_ANGLE,
  selectLockCandidate,selectGunTarget} from '../src/combat-targeting.js';
import {combatAudioCues} from '../src/audio-cues.js';
import {drawAirCombat} from '../src/aircombat-view.js';
import {createGame} from '../src/core.js';

const freeze=Object.freeze;
function waveTwo(seed=1988) {
  const first=createAirCombat(seed);
  return freeze({...first,stage:1,opponents:freeze(AIRCOMBAT_WAVES[1].members.map(
    e=>freeze({...e,role:e.role??'fighter',maxHp:e.hp??2,
      hp:e.hp??2,disengaged:false})))});
}
function frame(combat) {
  const labels=[],ctx={};
  for (const fn of ['save','restore','clearRect','fillRect','strokeRect',
    'beginPath','closePath','moveTo','lineTo','ellipse','arc','fill','stroke',
    'translate','rotate','setLineDash','roundRect'])ctx[fn]=()=>{};
  ctx.fillText=label=>labels.push(label);
  drawAirCombat({width:960,height:600,getContext:()=>ctx},combat);
  return labels;
}
test('missiles require 48 uninterrupted 60 Hz ticks in the narrowed physical cone',()=>{
  const start=createAirCombat(1988),orig=start.rack;
  assert.equal(MISSILE_ACQUIRE_TICKS,48);
  assert.ok(MISSILE_LOCK_HALF_ANGLE<Math.PI/6,
    'game acquisition must be stricter than original upstream 30-degree cone');
  let state=stepAirCombat(start,{missile:true});
  assert.equal(state.rack,orig,'premature trigger must not spend ammunition');
  assert.equal(state.rack.launched,0);
  assert.match(state.radio,/HOLD SIGHT/);
  assert.equal(state.lockTicks,1);
  for(let i=0;i<MISSILE_ACQUIRE_TICKS-2;i++)
    state=stepAirCombat(state,{missile:false});
  assert.equal(state.lockTicks,47);
  assert.equal(combatLockStatus(state).ready,false);
  const premature=stepAirCombat(state,{missile:true});
  assert.equal(premature.rack.launched,0,'the last acquisition tick itself is not a launch');
  assert.equal(premature.lockTicks,48);
  assert.equal(combatLockStatus(premature).ready,true);
  assert.deepEqual(combatAudioCues(state,premature),['pickup'],
    'lock acquisition should play one confirmation cue');
  state=stepAirCombat(premature,{missile:false});
  state=stepAirCombat(state,{missile:true});
  assert.equal(state.rack.ammo,7);
  assert.equal(state.rack.launched,1);
  assert.equal(state.missileTargetId,'derek-1');
  assert.equal(state.lockTicks,0,'launch consumes the completed acquisition');
  assert.equal(state.lockTargetId,null);
  assert.equal(state.rack.active.length,1);
  assert.equal(start.rack.ammo,8,'immutable original rack remains unchanged');
});
test('breaking a lock resets progress and an early attempt never launches',()=>{
  let state=createAirCombat(1988);
  for(let i=0;i<28;i++)state=stepAirCombat(state,{});
  assert.equal(state.lockTicks,28);
  for(let i=0;i<28;i++)state=stepAirCombat(state,{steer:1});
  assert.equal(state.lockTicks,0,'broad yaw outside nine degrees must drop the lock');
  assert.equal(combatLockStatus(state).ready,false);
  assert.equal(combatLockStatus(state).status,'ALIGN RETICLE');
  const before=state.rack;
  state=stepAirCombat(state,{missile:true});
  assert.equal(state.rack,before);
  assert.equal(state.rack.ammo,8);
  assert.equal(state.rack.launched,0);
  assert.ok(frame(state).some(t=>t.includes('ALIGN RETICLE')));
});
test('physical gun rays can hit second target when first live target is elsewhere',()=>{
  const s=waveTwo(),targets=combatTargets(s),pose=combatPose(s);
  assert.equal(targets[0].id,'chad');
  const actual=selectGunTarget(pose,combatRig(),targets);
  assert.ok(actual,'physical gun ray should intersect one of the group');
  assert.equal(actual.id,'brad','do not forcibly test first surviving rival');
  const updated=stepAirCombat(s,{brake:true});
  const chad=updated.opponents.find(e=>e.id==='chad');
  const brad=updated.opponents.find(e=>e.id==='brad');
  assert.equal(chad.hp,2,'off-sight Chad must not take invisible damage');
  assert.equal(brad.hp,1,'on-sight Brad must take real physical gun damage');
  assert.equal(updated.gunHits,1);
  assert.equal(updated.gunFeedback.id,'brad');
  assert.equal(updated.gunFeedback.kind,'hit');
  assert.ok(Object.isFrozen(updated.gunFeedback));
  assert.ok(frame(updated).some(x=>x.includes('HIT CONFIRMED')));
  assert.ok(updated.effects.some(e=>e.id==='brad'&&e.kind==='hit'));
});
test('nearest actual ray intersection wins, independent of enemy enumeration',()=>{
  const pose=combatPose(createAirCombat(1988)),rig=combatRig();
  const farther=freeze({id:'far',name:'FAR',center:freeze([0,180,-220]),
    radius:15,disengaged:false});
  const nearer=freeze({id:'near',name:'NEAR',center:freeze([0,180,-60]),
    radius:15,disengaged:false});
  const hit=selectGunTarget(pose,rig,[farther,nearer]);
  assert.equal(hit.id,'near');
  assert.equal(selectGunTarget(pose,rig,[nearer,farther]).id,'near');
  assert.equal(selectGunTarget(pose,rig,[freeze({...nearer,disengaged:true})]),null);
});
test('missed gun shots render a visible miss without changing hit count',()=>{
  const original=createAirCombat(1988);
  const missed=stepAirCombat(freeze({...original,yaw:.56}),{brake:true});
  assert.equal(missed.shots,1);
  assert.equal(missed.gunHits,0);
  assert.equal(missed.gunFeedback.kind,'miss');
  assert.equal(missed.effects.length,0);
  assert.ok(frame(missed).some(x=>x.includes('MISSED')));
  assert.equal(original.gunFeedback,null);
});
test('selected missile candidate is a real source-verified forward target',()=>{
  const c=waveTwo(),pose=combatPose(c),targets=combatTargets(c);
  const candidate=selectLockCandidate(pose,targets);
  assert.ok(candidate);
  assert.equal(candidate.id,'brad');
  assert.equal(candidate.name,'BRAD');
  assert.equal(combatLockStatus(c).targetId,'brad');
  const noContact=selectLockCandidate(pose,targets.map(e=>freeze({...e,disengaged:true})));
  assert.equal(noContact,null);
  assert.equal(createGame(1988).airCombat,null,'Saturday campaign remains unchanged');
});
