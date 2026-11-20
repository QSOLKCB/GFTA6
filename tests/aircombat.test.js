// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  AIRCOMBAT_FORMAT, AIRCOMBAT_UPSTREAM, AIRCOMBAT_WAVES,
  AIRCOMBAT_FINAL_TEXT, createAirCombat, combatTargets, bossPhase,
  BOSS_PHASE_LINES, BOSS_ATTACK_PERIOD, BOSS_ATTACK_TELEGRAPH,
  combatCamera, combatPose, combatRackSummary, combatRig, stepAirCombat
} from '../src/aircombat.js';
import {createGame,stepGame,bodyAt,snapshot,currentMission} from '../src/core.js';
import {createEscape,launchFlight,RESTORATION} from '../src/escape.js';
import {drawScene} from '../src/render.js';
import {drawAirCombat} from '../src/aircombat-view.js';
import {missileLock} from '../vendor/vanillajs/missiles.js';
import {sampleCockpitCamera,projectCockpitPoint,testCockpitTarget,
  inspectCockpitSight} from '../vendor/vanillajs/cockpit-rig/index.js';

function canvas() {
  let frames=0;const labels=[],ctx={};
  for (const name of ['save','restore','clearRect','fillRect','strokeRect',
    'beginPath','closePath','moveTo','lineTo','ellipse','arc','fill','stroke',
    'translate','rotate','setLineDash','roundRect']) ctx[name]=()=>{frames++;};
  ctx.fillText=v=>labels.push(v);
  return {canvas:{width:960,height:600,getContext:()=>ctx},labels,
    frames:()=>frames};
}
function enableFlight(profile='coupe',combat=true) {
  const game=createGame(1988,profile,{airCombat:combat});
  const ready=createEscape(1988);
  const launch=launchFlight({...ready,upgrades:RESTORATION.map(x=>x.id)},'airfield');
  assert.equal(launch.ok,true);
  game.escape=launch.state;
  return game;
}
test('campaign source is exact pinned and scripted final text matches canonical brief',async()=>{
  assert.equal(AIRCOMBAT_FORMAT,'gfta6.aircombat.v1');
  assert.match(AIRCOMBAT_UPSTREAM,/ae0b594f006ec3c1add71574c830ddde9ff5fa66/);
  assert.deepEqual(AIRCOMBAT_WAVES.map(w=>w.members.length),[1,3,1,4,4,1]);
  assert.equal(new Set(AIRCOMBAT_WAVES.flatMap(w=>w.members.map(m=>m.id))).size,14);
  const design=await readFile(new URL('../docs/GFTA6_AIRCOMBAT_001.md',import.meta.url),'utf8');
  const match=/```text\n([\s\S]*?)\n```/.exec(design);
  assert.ok(match,'canonical ending fenced block is required');
  assert.equal(AIRCOMBAT_FINAL_TEXT,match[1],'owner-locked ending must remain verbatim');
  assert.ok(AIRCOMBAT_FINAL_TEXT.includes('DIFFICULTY: EMOTIONAL AIR SUPERIORITY'));
});
test('cockpit geometry and actual gun rays determine targets, independent of visual camera',()=>{
  const s=createAirCombat(1988),pose=combatPose(s),rig=combatRig();
  const target=combatTargets(s)[0];
  const camera=combatCamera(s);
  const p=projectCockpitPoint(camera,[...target.center],{width:960,height:600});
  assert.equal(p.visible,true);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  assert.equal(missileLock(pose,{center:[...target.center],radius:target.radius}).locked,true);
  const rays=testCockpitTarget(pose,rig,[...target.center],target.radius);
  assert.ok(rays.some(r=>r.hit),'initial Derek is aligned with real muzzle rays');
  const alternative=sampleCockpitCamera(pose,rig,'external',{yaw:.3,pitch:0});
  assert.notDeepEqual(alternative,camera);
  assert.deepEqual(testCockpitTarget(pose,rig,[...target.center],target.radius),rays,
    'camera/head look must not alter the physical gun rays');
  const sight=inspectCockpitSight(pose,rig,camera,
    {range:205,width:960,height:600});
  assert.ok(sight.reticle.visible);
  assert.equal(sight.impacts.length,2);
});
test('missile lock and ammo come from unchanged COCKPIT-002 rack, not sprite overlap',()=>{
  let s=createAirCombat(17);
  const previous=s;
  s=stepAirCombat(s,{missile:true});
  assert.equal(combatRackSummary(s).ammo,7);
  assert.equal(combatRackSummary(previous).ammo,8,'immutable previous rack unchanged');
  assert.equal(combatRackSummary(s).launched,1);
  const repeat=stepAirCombat(s,{missile:true});
  assert.equal(combatRackSummary(repeat).launched,1,'holding M never relaunches');
  s=repeat;
  for(let i=0;i<550&&!s.missileHits;i++) s=stepAirCombat(s,{missile:false});
  assert.equal(s.missileHits,1,'real missile sweeps to registered hit');
  assert.equal(s.opponents.length,3,'Derek disengages and group-chat wave unlocks');
  assert.equal(s.stage,1);
  assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.rack));
  assert.throws(()=>stepAirCombat(s,{steer:2}),RangeError);
  assert.throws(()=>stepAirCombat(s,{missile:1}),TypeError);
});
test('all fourteen rivals and the final boss can disengage with physical gun alignment in six waves',()=>{
  let a=createAirCombat(1988),b=createAirCombat(1988);
  let steps=0;
  while(a.status==='active'&&steps++<3500) {
    const enemy=combatTargets(a).find(e=>!e.disengaged);
    assert.ok(enemy,'active combat should have a target');
    const desired=Math.atan2(-enemy.center[0],40-enemy.center[2]);
    const steer=Math.abs(desired-a.yaw)<.008?0:Math.sign(desired-a.yaw);
    const input={steer,throttle:0,brake:true,missile:false};
    a=stepAirCombat(a,input);b=stepAirCombat(b,input);
  }
  assert.equal(a.status,'won','all six waves must be completable');
  assert.equal(a.stage,AIRCOMBAT_WAVES.length);
  assert.ok(a.gunHits>=14);
  assert.equal(a.missileHits,0);
  assert.deepEqual(a,b,'same seed and controls must reproduce complete receipts');
  assert.throws(()=>stepAirCombat(a,{brake:true}),RangeError);
  assert.ok(steps<3500);
});
test('rivals pursue from finite range and their relative approach resets per wave',()=>{
  let c=createAirCombat(1988);
  const initial=combatTargets(c)[0];
  for(let i=0;i<120;i++)c=stepAirCombat(c,{});
  const approached=combatTargets(c)[0];
  const initialRange=Math.abs(40-initial.center[2]);
  const nextRange=Math.abs(40-approached.center[2]);
  assert.ok(nextRange<initialRange,'rival craft must actually close range');
  assert.ok(nextRange>=initialRange-85,'pursuit has a bounded approach');
  assert.equal(c.waveTick,120);
  assert.equal(c.status,'active');
  // Complete this wave by properly aligned gunfire, then verify the
  // next wave has its own independent closing-distance clock.
  for(let i=0;i<200&&c.stage===0;i++) c=stepAirCombat(c,{brake:true});
  assert.equal(c.stage,1,'the first contact must disengage');
  assert.equal(c.waveTick,0,'each subsequent squadron wave starts at its authored range');
  assert.ok(combatTargets(c).every(t=>Math.abs(40-t.center[2])>=170));
});
test('air combat is opt-in after the original 2.5D escape flight',()=>{
  for(const active of [false,true]){
    const s=enableFlight('hatchback',active),oldBody=snapshot(s).body;
    for(let n=0;n<400&&!s.finished&&!s.airCombat;n++)
      stepGame(s,{throttle:1,brake:true,steer:0});
    assert.deepEqual(s.body,oldBody);
    if(active) {
      assert.ok(s.airCombat);
      assert.equal(s.finished,false);
      assert.equal(s.airCombat.status,'active');
      assert.equal(s.outcome,'');
      assert.equal(currentMission(s).id,'salon');
    } else {
      assert.equal(s.finished,true);
      assert.equal(s.outcome,'YOU FORGOT THE MILK');
      assert.equal(s.airCombat,null);
    }
  }
});
test('combat control, renderer and interim snapshots cannot mutate car, cargo or escape fund',()=>{
  const s=enableFlight('van',true);
  for(let n=0;n<400&&!s.airCombat;n++) stepGame(s,{throttle:1,brake:true});
  assert.ok(s.airCombat);
  const oldBody=s.body,oldCargo=s.cargo,oldMoney=s.moneyCents;
  const before=snapshot(s);
  for(const mode of ['classic','raised']){
    const frame=canvas();
    drawScene(frame.canvas,s,{mode,route:'escape'});
    assert.ok(frame.frames()>35,'combat scene draws real primitives');
    assert.ok(frame.labels.some(x=>x.includes('JUST A FRIEND')));
    assert.deepEqual(snapshot(s),before,'draw must not advance combat or flight');
  }
  for(let n=0;n<40;n++)stepGame(s,{steer:n%20<10?1:-1,brake:n%2===0});
  assert.deepEqual(s.body,oldBody);
  assert.deepEqual(s.cargo,oldCargo);
  assert.equal(s.moneyCents,oldMoney);
  assert.equal(s.escape.flight.status,'escaped');
});
test('gun-only full alternate campaign reaches the owner-locked mission ending once',()=>{
  const s=enableFlight('hatchback',true);
  for(let n=0;n<400&&!s.airCombat;n++)stepGame(s,{throttle:1,brake:true,steer:0});
  assert.ok(s.airCombat);
  let steps=0;
  while(!s.finished&&steps++<3500){
    const target=combatTargets(s.airCombat).find(t=>!t.disengaged);
    assert.ok(target);
    const desired=Math.atan2(-target.center[0],40-target.center[2]);
    const steer=Math.abs(desired-s.airCombat.yaw)<.008?0:
      Math.sign(desired-s.airCombat.yaw);
    stepGame(s,{steer,brake:true,throttle:0,missile:false});
  }
  assert.ok(s.finished,'ACT IV reaches a real ending');
  assert.equal(s.outcome,'JUST A FRIEND SQUADRON COMPLETE');
  assert.equal(s.airCombat.status,'won');
  assert.equal(s.airCombat.stage,AIRCOMBAT_WAVES.length);
  const final=snapshot(s);
  stepGame(s,{brake:true,missile:true});
  assert.deepEqual(snapshot(s),final,'ending is immutable after completion');
});
test('combat draw is read-only and rejects absent canvas or state',()=>{
  const c=createAirCombat(1988),before=structuredClone({
    yaw:c.yaw,opponents:c.opponents,stage:c.stage,tick:c.tick
  });
  const frame=canvas();drawAirCombat(frame.canvas,c);
  assert.ok(frame.labels.some(l=>l.includes('DEREK')));
  assert.deepEqual({yaw:c.yaw,opponents:c.opponents,stage:c.stage,tick:c.tick},before);
  assert.throws(()=>drawAirCombat(null,c),TypeError);
  assert.throws(()=>drawAirCombat({getContext:()=>null},c),/Canvas 2D/);
});

test('accepted gun hits produce bounded immutable impact and explosion visuals',()=>{
  const first=createAirCombat(1988),plain=canvas();
  drawAirCombat(plain.canvas,first);
  let next=stepAirCombat(first,{brake:true});
  const hit=next.effects.find(e=>e.kind==='hit');
  assert.ok(hit,'physically accepted gun hit must create a visual receipt');
  assert.ok(Object.isFrozen(hit)&&Object.isFrozen(hit.center));
  assert.equal(hit.id,'derek-1');
  assert.equal(hit.source,'gun');
  const hitScene=canvas();
  drawAirCombat(hitScene.canvas,next);
  assert.ok(hitScene.frames()>plain.frames()+30,
    'hit visuals need additional shock rings and sparks');
  assert.equal(first.effects.length,0,'rendering and stepping never mutate previous state');
  for(let i=0;i<13&&next.stage===0;i++)
    next=stepAirCombat(next,{brake:true});
  const burst=next.effects.find(e=>e.kind==='explosion');
  assert.ok(burst,'accepted final hit must produce an explosion receipt');
  const burstScene=canvas();
  const before=JSON.stringify(next);
  drawAirCombat(burstScene.canvas,next);
  assert.ok(burstScene.frames()>plain.frames()+45,
    'explosion must produce more visual particles than the baseline scene');
  assert.equal(JSON.stringify(next),before,'VFX rendering may not change authoritative combat');
  for(let i=0;i<75;i++)next=stepAirCombat(next,{});
  assert.ok(next.effects.every(e=>next.tick-e.tick<70),
    'visual receipts must expire within the bounded visual lifetime');
  assert.ok(next.effects.length<=16);
});

test('combat HUD displays real physical missile-lock and in-flight status',()=>{
  const initial=createAirCombat(1988),before=structuredClone({
    tick:initial.tick,stage:initial.stage,opponents:initial.opponents
  });
  const ready=canvas();
  drawAirCombat(ready.canvas,initial);
  assert.ok(ready.labels.some(x=>x.includes('LOCKED')),
    'initial aligned boresight must show a real valid lock');
  const misaligned=Object.freeze({...initial,yaw:.58});
  const blocked=canvas();
  drawAirCombat(blocked.canvas,misaligned);
  assert.ok(blocked.labels.some(x=>x.includes('OFF BORESIGHT')),
    'misaligned physical sight must not claim a lock');
  const launched=stepAirCombat(initial,{missile:true});
  const flying=canvas();
  drawAirCombat(flying.canvas,launched);
  assert.ok(flying.labels.some(x=>x.includes('MISSILE IN FLIGHT')),
    'missile status must come from the rack, not projected pixels');
  assert.deepEqual({tick:initial.tick,stage:initial.stage,
    opponents:initial.opponents},before,'HUD may not change combat state');
});
