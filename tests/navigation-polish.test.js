// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,interactEscape,bodyAt,stepGame,snapshot} from '../src/core.js';
import {waypoint,ROUTE_MODES} from '../src/navigation.js';
import {createCargoJob,loadCargo,deliverCargo} from '../src/cargo.js';
import {PLACES} from '../src/world.js';
import {drawScene} from '../src/render.js';
import {createEscape,RESTORATION} from '../src/escape.js';
import {drawFlightScene} from '../src/flight-view.js';
const parkAt=(state,id)=>{
  const p=PLACES.find(p=>p.id===id);assert.ok(p,id);
  state.body=bodyAt(p.x,p.y);state.speed=0;
};
function canvasRecorder() {
  const strings=[],ctx={};
  for(const name of ['save','restore','clearRect','fillRect','strokeRect',
    'beginPath','closePath','moveTo','lineTo','ellipse','arc','fill','stroke',
    'translate','rotate','setLineDash','roundRect'])ctx[name]=()=>{};
  ctx.fillText=text=>strings.push(text);
  return {strings,canvas:{width:960,height:600,getContext:()=>ctx}};
}
test('navigation modes are bounded, view-only, and retain old destination identity',()=>{
  assert.deepEqual(ROUTE_MODES,['errands','escape']);
  const s=createGame(1988,'hatchback'),before=snapshot(s);
  const regular=waypoint(s);
  assert.equal(regular.id,'salon');
  assert.equal(regular.label,'NAIL SALON');
  assert.equal(regular.distance,390);
  assert.match(regular.instruction,/interact/);
  const escape=waypoint(s,'escape');
  assert.equal(escape.id,'parcel');
  assert.match(escape.instruction,/paid courier job/);
  assert.ok(Object.isFrozen(regular));
  assert.ok(Object.isFrozen(escape));
  assert.deepEqual(snapshot(s),before);
  assert.throws(()=>waypoint(s,'none'),RangeError);
  assert.throws(()=>waypoint(null),TypeError);
});
test('escape route tracks paid gig, affordable upgrade, and finished aircraft',()=>{
  const s=createGame(1988);
  parkAt(s,'parcel');
  assert.equal(interactEscape(s,'gig'),true);
  assert.equal(waypoint(s,'escape').id,s.escape.activeGig.to);
  assert.match(waypoint(s,'escape').instruction,/Deliver paid/);
  parkAt(s,s.escape.activeGig.to);
  assert.equal(interactEscape(s,'gig'),true);
  // Artificially funded state in a test fixture: no game currency is changed.
  s.escape=Object.freeze({...s.escape,fundCents:RESTORATION[0].costCents});
  assert.equal(waypoint(s,'escape').id,'airfield');
  assert.match(waypoint(s,'escape').instruction,/Purchase/);
  s.escape=Object.freeze({...createEscape(s.seed),upgrades:Object.freeze(RESTORATION.map(u=>u.id))});
  assert.equal(waypoint(s,'escape').id,'airfield');
  assert.match(waypoint(s,'escape').instruction,/Launch/);
  s.finished=true;
  assert.equal(waypoint(s,'escape'),null);
});
test('escape route prioritises regular cargo instead of sending a full boot to another gig',()=>{
  const s=createGame(1988,'coupe');
  s.cargo=loadCargo(createCargoJob('shopping','coupe'),'coupe');
  let w=waypoint(s,'escape');
  assert.equal(w.id,'home');
  assert.match(w.instruction,/ordinary cargo delivery/);
  s.cargo=deliverCargo(s.cargo);
  w=waypoint(s,'escape');
  assert.equal(w.id,'market');
  assert.match(w.instruction,/remaining cargo/);
  s.cargo=null;
  assert.equal(waypoint(s,'escape').id,'parcel');
});
test('both visual modes display the same route while preserving simulation state',()=>{
  const s=createGame(1988);
  const before=snapshot(s);
  for(const mode of ['classic','raised'])
    for(const route of ['errands','escape']) {
      const {canvas,strings}=canvasRecorder();
      drawScene(canvas,s,{mode,route});
      const target=route==='errands'?'NAIL SALON':'PARCEL DEPOT';
      assert.ok(strings.includes(target),target+' missing from '+mode);
      assert.deepEqual(snapshot(s),before);
    }
  assert.throws(()=>drawScene(canvasRecorder().canvas,s,{route:'invalid'}),RangeError);
});
test('near-destination prompts match route actions and require a stopped car',()=>{
  const s=createGame(1988);parkAt(s,'parcel');
  const a=canvasRecorder();
  drawScene(a.canvas,s,{route:'escape'});
  assert.ok(a.strings.includes('G / ACCEPT PAID JOB'));
  s.speed=30;
  const b=canvasRecorder();drawScene(b.canvas,s,{route:'escape'});
  assert.ok(b.strings.includes('STOP THE CAR FIRST'));
  s.speed=0;parkAt(s,'salon');
  const c=canvasRecorder();drawScene(c.canvas,s,{route:'errands'});
  assert.ok(c.strings.includes('E / COMPLETE ERRAND'));
});
test('polished flight view only draws progress and never modifies flight',()=>{
  const flight=Object.freeze({status:'flying',phase:'airborne',tick:90,speed:105,
    altitude:75,distance:1100,bank:0,lateral:0,fuel:98});
  const initial=structuredClone(flight);
  const a=canvasRecorder();
  drawFlightScene(a.canvas,flight);
  assert.ok(a.strings.includes('TAKEOFF SPEED'));
  assert.ok(a.strings.includes('CLIMB'));
  assert.ok(a.strings.includes('DEPARTURE'));
  assert.ok(a.strings.some(s=>s.includes('ARCADE')));
  assert.deepEqual(flight,initial);
});
