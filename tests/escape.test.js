// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESCAPE_VERSION, AIRFIELD, GIG_DEPOT, GIG_DESTINATIONS, RESTORATION,
  ESCAPE_TARGET_CENTS, createEscape, gigNext, gigAction, nextUpgrade,
  purchaseUpgrade, aircraftReady, launchFlight, stepFlight, stepEscape
} from '../src/escape.js';
import {createGame, interactEscape, interact, stepGame, bodyAt,
  snapshot, currentMission, setPaused, PLACES} from '../src/core.js';
import {BLOCKS,validateWorld} from '../src/world.js';
import {drawFlightScene} from '../src/flight-view.js';

function parkAt(s,id) {
  const p=PLACES.find(p=>p.id===id);
  assert.ok(p,id);
  s.body=bodyAt(p.x,p.y);
  s.speed=0;
}
function earn(s) {
  parkAt(s,GIG_DEPOT);
  assert.equal(interactEscape(s,'gig'),true);
  const to=s.escape.activeGig.to;
  parkAt(s,to);
  assert.equal(interactEscape(s,'gig'),true);
  return to;
}
function restore(s) {
  let safety=0;
  while(!aircraftReady(s.escape)&&safety++<16) {
    const u=nextUpgrade(s.escape);
    while(s.escape.fundCents<u.costCents)earn(s);
    parkAt(s,AIRFIELD);
    assert.equal(interactEscape(s,'upgrade'),true);
  }
  assert.ok(aircraftReady(s.escape));
}
test('escape economy has bounded immutable versioned parts and seeded work',()=>{
  const a=createEscape(1988),b=createEscape(1988);
  assert.deepEqual(a,b);
  assert.equal(a.version,ESCAPE_VERSION);
  assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.upgrades));
  assert.equal(RESTORATION.reduce((s,p)=>s+p.costCents,0),ESCAPE_TARGET_CENTS);
  assert.equal(ESCAPE_TARGET_CENTS,115000);
  assert.equal(GIG_DESTINATIONS.length,4);
  assert.equal(gigNext(a).from,GIG_DEPOT);
  assert.equal(gigNext(a).to,'chemist');
  assert.throws(()=>createEscape(-1),RangeError);
  assert.equal(nextUpgrade(a).id,'airframe');
  assert.equal(validateWorld().length,0);
  assert.ok(BLOCKS.some(b=>b.id==='hangar'));
  assert.ok(PLACES.some(p=>p.id===AIRFIELD));
});
test('paid courier work requires a pickup, actual journey and no duplicate payout',()=>{
  const e=createEscape(1988),dest=gigNext(e).to;
  assert.equal(gigAction(e,dest).ok,false);
  const pickup=gigAction(e,GIG_DEPOT);
  assert.ok(pickup.ok);
  assert.equal(e.activeGig,null,'immutable previous state');
  assert.equal(gigAction(pickup.state,GIG_DEPOT).ok,false,'no rapid replay at depot');
  assert.equal(gigAction(pickup.state,'bakery').ok,false,'wrong dropoff');
  const payout=gigAction(pickup.state,dest);
  assert.ok(payout.ok);
  assert.equal(payout.state.fundCents,gigNext(e).payoutCents);
  assert.equal(payout.state.completedGigs,1);
  assert.equal(payout.state.activeGig,null);
  assert.equal(gigAction(payout.state,dest).ok,false,'no duplicate credit');
  assert.deepEqual(gigAction(pickup.state,dest),gigAction(pickup.state,dest));
});
test('mainline input, movement and cargo stay independent of optional funding',()=>{
  const s=createGame(1988,'coupe');
  assert.equal(interactEscape(s,'gig'),false,'must travel to depot');
  parkAt(s,GIG_DEPOT);s.speed=30;
  assert.equal(interactEscape(s,'gig'),false,'must park');
  s.speed=0;
  setPaused(s,true);
  assert.equal(interactEscape(s,'gig'),false,'paused mission cannot pay');
  setPaused(s,false);
  const old=snapshot(s);
  assert.equal(interactEscape(s,'gig'),true);
  assert.deepEqual(s.body,old.body);
  assert.equal(s.index,old.index);
  assert.equal(s.cargo,old.cargo);
  const dest=s.escape.activeGig.to;
  parkAt(s,dest);
  assert.equal(interactEscape(s,'gig'),true);
  assert.ok(s.escape.fundCents>0);
  assert.equal(s.moneyCents,old.moneyCents,
    'side earnings must not silently alter household balance');
  assert.equal(s.index,old.index);
  assert.deepEqual(s.tasks.map(m=>m.id),old.tasks.map(m=>m.id));
});
test('restoration costs charged once, purchases require the real airfield',()=>{
  const s=createGame(1988,'hatchback');
  assert.equal(interactEscape(s,'upgrade'),false);
  for(let i=0;i<8;i++)earn(s);
  parkAt(s,AIRFIELD);
  const before=s.escape.fundCents;
  assert.equal(interactEscape(s,'upgrade'),true);
  assert.equal(s.escape.fundCents,before-RESTORATION[0].costCents);
  assert.equal(s.escape.spentCents,RESTORATION[0].costCents);
  assert.equal(s.escape.upgrades[0],'airframe');
  assert.equal(interactEscape(s,'upgrade'),true);
  assert.equal(s.escape.upgrades.length,2);
  assert.equal(s.escape.spentCents,RESTORATION[0].costCents+RESTORATION[1].costCents);
  assert.equal(interactEscape(s,'upgrade'),true);
  assert.equal(interactEscape(s,'upgrade'),true);
  assert.ok(aircraftReady(s.escape));
  assert.equal(interactEscape(s,'upgrade'),false,'cannot purchase beyond the final stage');
  assert.equal(s.escape.spentCents,ESCAPE_TARGET_CENTS);
});
test('original reversible flight skeleton is fixed tick, deterministic and bounded',()=>{
  const f=launchFlight(
    {...createEscape(17),upgrades:RESTORATION.map(p=>p.id)},AIRFIELD);
  assert.equal(f.ok,true);
  let a=f.state.flight,b=f.state.flight;
  for(let i=0;i<350&&a.status==='flying';i++) {
    const input={throttle:1,brake:true,steer:0};
    a=stepFlight(a,input);b=stepFlight(b,input);
  }
  assert.deepEqual(a,b);
  assert.equal(a.status,'escaped');
  assert.ok(a.altitude>=160&&a.distance>=2600);
  assert.ok(a.speed>=85);
  assert.throws(()=>stepFlight(a,{throttle:1}),RangeError);
  assert.equal(f.state.flight.speed,0,'original immutable flight unchanged');
});
test('failure can be retried at airfield without a second purchase',()=>{
  const s=createGame();restore(s);parkAt(s,AIRFIELD);
  assert.equal(interactEscape(s,'fly'),true);
  const before=snapshot(s).body;
  for(let i=0;i<75;i++)stepGame(s,{throttle:1,brake:i<40});
  assert.equal(s.escape.flight.status,'grounded');
  assert.deepEqual(s.body,before,'aircraft sim must never move player car');
  const ticks=s.tick;stepGame(s,{throttle:1});
  assert.equal(s.tick,ticks,'failed takeoff stays frozen until retry');
  assert.equal(interactEscape(s,'fly'),true);
  assert.equal(s.escape.flight.tick,0);
  assert.equal(s.escape.upgrades.length,RESTORATION.length);
});
test('full alternate escape ending is obtainable while Saturday missions stay untouched',()=>{
  for(const profile of ['hatchback','coupe','van']) {
    const s=createGame(1988,profile);
    const initial=snapshot(s);
    restore(s);
    parkAt(s,AIRFIELD);
    assert.equal(interactEscape(s,'fly'),true);
    const parked=s.body;
    assert.equal(interactEscape(s,'fly'),false,'cannot restart while airborne');
    assert.equal(interact(s),false,'mainline E cannot complete an errand midflight');
    for(let i=0;i<350&&!s.finished;i++)
      stepGame(s,{throttle:1,brake:true,steer:0});
    assert.ok(s.finished,profile+' should escape');
    assert.equal(s.outcome,'YOU FORGOT THE MILK');
    assert.equal(s.escape.flight.status,'escaped');
    assert.deepEqual(s.body,parked);
    assert.equal(currentMission(s).id,'salon','no original mission was skipped');
    assert.equal(s.moneyCents,initial.moneyCents);
    assert.deepEqual(s.cargo,initial.cargo);
    assert.equal(s.escape.spentCents,ESCAPE_TARGET_CENTS);
    assert.ok(s.escape.completedGigs>0);
    const frozen=snapshot(s);
    stepGame(s,{throttle:1,brake:true});
    assert.deepEqual(snapshot(s),frozen,'completed alternate ending stays frozen');
  }
});
test('flight rendering does not mutate simulation and is Canvas2D-only',()=>{
  const flight={status:'flying',phase:'airborne',tick:40,speed:145,
    altitude:270,distance:1234,bank:12,lateral:-22,fuel:96};
  let fills=0;
  const ctx={};
  for(const name of ['fillRect','beginPath','moveTo','lineTo','closePath',
    'fill','ellipse','save','restore','translate','rotate','fillText'])
    ctx[name]=()=>{fills++;};
  const canvas={width:960,height:600,getContext:()=>ctx};
  const initial=structuredClone(flight);
  drawFlightScene(canvas,flight);
  assert.ok(fills>50,'airfield illustration must produce actual drawing calls');
  assert.deepEqual(flight,initial);
});
