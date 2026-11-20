// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,createDogfightGame,stepGame,snapshot} from '../src/core.js';
import {createAirCombat,stepAirCombat,combatTargets,bossPhase,
  AIRCOMBAT_WAVES,BOSS_PHASE_LINES,BOSS_ATTACK_PERIOD,
  BOSS_ATTACK_TELEGRAPH,BOSS_ATTACK_IMPACT,
  AIRCOMBAT_FINAL_TEXT} from '../src/aircombat.js';
import {drawAirCombat} from '../src/aircombat-view.js';
import {combatAudioCues} from '../src/audio-cues.js';

function bossFixture(seed=1988) {
  const first=createAirCombat(seed);
  const spec=AIRCOMBAT_WAVES.at(-1).members[0];
  return Object.freeze({...first,stage:AIRCOMBAT_WAVES.length-1,waveTick:0,
    opponents:Object.freeze([Object.freeze({...spec,role:'boss',
      hp:spec.hp,maxHp:spec.hp,disengaged:false})])});
}
function draw(state){
  const labels=[];let strokes=0;
  const ctx={};
  for(const fn of ['save','restore','clearRect','fillRect','strokeRect',
    'beginPath','closePath','moveTo','lineTo','ellipse','arc','fill','stroke',
    'translate','rotate','setLineDash','roundRect'])
    ctx[fn]=()=>{if(fn==='stroke'||fn==='fill')strokes++;};
  ctx.fillText=msg=>labels.push(msg);
  drawAirCombat({width:960,height:600,getContext:()=>ctx},state);
  return {labels,strokes};
}
test('six immutable waves have fourteen unique rivals and one final boss',()=>{
  assert.deepEqual(AIRCOMBAT_WAVES.map(w=>w.members.length),[1,3,1,4,4,1]);
  const all=AIRCOMBAT_WAVES.flatMap(w=>w.members);
  assert.equal(all.length,14);
  assert.equal(new Set(all.map(e=>e.id)).size,14);
  assert.ok(Object.isFrozen(AIRCOMBAT_WAVES));
  assert.ok(AIRCOMBAT_WAVES.every(w=>Object.isFrozen(w)&&Object.isFrozen(w.members)));
  assert.equal(AIRCOMBAT_WAVES[0].members[0].name,'DEREK');
  assert.equal(AIRCOMBAT_WAVES[2].members[0].name,'DEREK AGAIN');
  assert.equal(AIRCOMBAT_WAVES.at(-1).boss,true);
  assert.equal(AIRCOMBAT_WAVES.at(-1).members[0].hp,12);
  assert.deepEqual(BOSS_PHASE_LINES.length,3);
  assert.equal(BOSS_ATTACK_PERIOD,140);
  assert.equal(BOSS_ATTACK_TELEGRAPH,30);
  assert.equal(BOSS_ATTACK_IMPACT,75);
  assert.ok(AIRCOMBAT_FINAL_TEXT.includes('HE\'S ACTUALLY A REALLY NICE GUY.'));
});
test('final boss is a real three-phase authoritative target with separate HP',()=>{
  let s=bossFixture(1988);
  assert.equal(s.hull,3);
  assert.equal(bossPhase(s),1);
  assert.equal(combatTargets(s)[0].radius,26);
  const phases=new Set([bossPhase(s)]);
  let ticks=0;
  while(s.status==='active'&&ticks++<1000){
    const target=combatTargets(s).find(t=>!t.disengaged);
    const wanted=Math.atan2(-target.center[0],40-target.center[2]);
    const steer=Math.abs(wanted-s.yaw)<.008?0:Math.sign(wanted-s.yaw);
    s=stepAirCombat(s,{steer,brake:true});
    const phase=bossPhase(s);if(phase)phases.add(phase);
  }
  assert.equal(s.status,'won','boss is beatable with ordinary gun alignment');
  assert.deepEqual([...phases].sort(),[1,2,3]);
  assert.equal(s.opponents[0].hp,0);
  assert.equal(s.stage,AIRCOMBAT_WAVES.length);
  assert.equal(s.hull>0,true);
  assert.throws(()=>stepAirCombat(s,{}),RangeError);
});
test('boss telegraph locks one yaw lane and permits actual A/D evasion',()=>{
  let hit=bossFixture(33),dodge=bossFixture(33);
  const original=hit;
  for(let i=0;i<BOSS_ATTACK_TELEGRAPH;i++){
    hit=stepAirCombat(hit,{});
    dodge=stepAirCombat(dodge,{});
  }
  assert.ok(hit.bossAttack);
  assert.equal(hit.bossAttack.aim,0);
  assert.ok(Object.isFrozen(hit.bossAttack));
  assert.equal(original.bossAttack,null);
  assert.ok(combatAudioCues(original,hit).length===0,
    'no early warning before actual telegraph transition');
  let moved=false;
  for(let i=BOSS_ATTACK_TELEGRAPH;i<BOSS_ATTACK_IMPACT;i++){
    const nextHit=stepAirCombat(hit,{});
    const nextDodge=stepAirCombat(dodge,{steer:i<60?1:0});
    if(dodge.yaw!==nextDodge.yaw)moved=true;
    hit=nextHit;dodge=nextDodge;
  }
  assert.equal(moved,true);
  assert.equal(hit.hull,2,'stationary pilot must receive real hull damage');
  assert.equal(dodge.hull,3,'moving out of the locked lane avoids the hit');
  assert.equal(hit.bossAttack,null);
  assert.equal(dodge.bossAttack,null);
  assert.equal(hit.opponents[0].hp,12,'incoming hit must not damage the boss');
  assert.equal(dodge.opponents[0].hp,12);
});
test('three telegraphed strikes can end the arcade without altering the Saturday game',()=>{
  const game=createDogfightGame(17,'van');
  const original=snapshot(game);
  game.airCombat=bossFixture(17);
  let ticks=0;
  while(!game.finished&&ticks++<700)stepGame(game,{});
  assert.equal(game.finished,true);
  assert.equal(game.airCombat.status,'shot-down');
  assert.equal(game.outcome,'THE FINAL WORD WON');
  assert.equal(game.airCombat.hull,0);
  assert.equal(game.escape.fundCents,original.escape.fundCents);
  assert.equal(game.index,original.index);
  assert.deepEqual(game.body,original.body);
  const finished=snapshot(game);
  stepGame(game,{brake:true,missile:true});
  assert.deepEqual(snapshot(game),finished,'shot-down ending must be sealed');
  const normal=createGame(17,'van');
  assert.equal(normal.airCombat,null);
  assert.equal(normal.finished,false);
});
test('boss drawing is read-only and displays HP, phases and lock warning',()=>{
  let s=bossFixture(1988);
  const before=JSON.stringify(s);
  const a=draw(s);
  assert.ok(a.strokes>20);
  assert.ok(a.labels.some(x=>x.includes('FINAL BOSS')));
  assert.ok(a.labels.some(x=>x.includes('12 / 12 HP')));
  assert.ok(a.labels.some(x=>x.includes('HULL 3/3')));
  assert.equal(JSON.stringify(s),before);
  for(let i=0;i<BOSS_ATTACK_TELEGRAPH;i++)
    s=stepAirCombat(s,{});
  const b=draw(s);
  assert.ok(b.labels.some(x=>x.includes('EVADE WITH A / D')));
  const prev=s;
  const next=stepAirCombat(s,{steer:1});
  assert.ok(combatAudioCues(prev,next).every(x=>typeof x==='string'));
});
test('accepted boss warning and hull impact become game SFX cues',()=>{
  let s=bossFixture(17),warning=false,hit=false;
  for(let i=0;i<BOSS_ATTACK_IMPACT;i++){
    const next=stepAirCombat(s,{});
    const cues=combatAudioCues(s,next);
    if(cues.includes('warning'))warning=true;
    if(cues.includes('hit'))hit=true;
    s=next;
  }
  assert.equal(warning,true);
  assert.equal(hit,true);
});
