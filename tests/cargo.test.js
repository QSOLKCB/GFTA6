// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARGO_CAPACITY,CARGO_ITEMS,CARGO_JOBS,createCargoJob,loadCargo,deliverCargo,
  cargoCapacity,cargoUsed,cargoFinished,cargoJobById} from '../src/cargo.js';
import {createGame,interact,chooseMiniGame,bodyAt,currentMission,snapshot,stepGame,
  MINI_GAMES,PLACES,setPaused} from '../src/core.js';

const parkAt = (state, placeId) => {
  const p = PLACES.find(p => p.id === placeId);
  assert.ok(p, placeId);
  state.body = bodyAt(p.x,p.y);
  state.speed = 0;
};
const mission = (state,id) => {
  state.index = state.tasks.findIndex(t => t.id === id);
  assert.ok(state.index >= 0,id);
  return currentMission(state);
};
test('all cargo schemas are bounded, stable and source/destination linked', () => {
  assert.deepEqual(Object.keys(CARGO_CAPACITY).sort(),['coupe','hatchback','van']);
  assert.deepEqual([cargoCapacity('coupe'),cargoCapacity('hatchback'),cargoCapacity('van')],
    [5,9,15]);
  for (const [id,item] of Object.entries(CARGO_ITEMS)) {
    assert.equal(item.id,id);
    assert.ok(Number.isSafeInteger(item.slots) && item.slots > 0 && item.slots <= 5);
    assert.ok(Object.isFrozen(item));
  }
  for (const [id,job] of Object.entries(CARGO_JOBS)) {
    assert.equal(job.id,id);
    assert.ok(PLACES.some(p=>p.id===job.source));
    assert.ok(PLACES.some(p=>p.id===job.destination));
    assert.ok(job.itemIds.length >= 2 && Object.isFrozen(job.itemIds));
    assert.equal(new Set(job.itemIds).size,job.itemIds.length);
    assert.ok(job.itemIds.every(item=>Object.hasOwn(CARGO_ITEMS,item)));
  }
  assert.throws(()=>cargoCapacity('__proto__'),RangeError);
  assert.throws(()=>cargoJobById('nope'),RangeError);
  assert.throws(()=>createCargoJob('shopping','tractor'),RangeError);
});

test('hatchback transports all groceries once; coupe requires exactly two trips', () => {
  const h = createCargoJob('shopping','hatchback');
  assert.ok(Object.isFrozen(h));
  assert.equal(cargoUsed(h),0);
  const full = loadCargo(h,'hatchback');
  assert.deepEqual(full.loaded,['milk','groceries','icecream']);
  assert.deepEqual(h.loaded,[],'old immutable job unchanged');
  assert.equal(cargoUsed(full),8);
  assert.ok(cargoFinished(deliverCargo(full)));
  const compact = loadCargo(createCargoJob('shopping','coupe'),'coupe');
  assert.deepEqual(compact.loaded,['milk','icecream']);
  assert.deepEqual(compact.remaining,['groceries']);
  assert.equal(cargoUsed(compact),5);
  assert.throws(()=>loadCargo(compact,'coupe'),RangeError);
  const delivered = deliverCargo(compact);
  assert.equal(delivered.trips,1);
  assert.deepEqual(delivered.loaded,[]);
  assert.equal(cargoFinished(delivered),false);
  const second = loadCargo(delivered,'coupe');
  assert.deepEqual(second.loaded,['groceries']);
  const finished = deliverCargo(second);
  assert.ok(cargoFinished(finished));
  assert.equal(finished.trips,2);
  assert.equal(new Set(finished.delivered).size,3);
  assert.throws(()=>deliverCargo(finished),RangeError);
});

test('each vehicle can move all wardrobe boxes with no duplication', () => {
  for (const profile of Object.keys(CARGO_CAPACITY)) {
    let j = createCargoJob('wardrobe',profile);
    while (!cargoFinished(j)) {
      j = deliverCargo(loadCargo(j,profile));
      assert.ok(j.trips <= 3);
    }
    assert.equal(new Set(j.delivered).size,3);
    assert.equal(j.trips, profile==='coupe'?2:1);
  }
});

test('grocery quiz starts transport; compact car gets a deterministic extra errand', () => {
  const state=createGame(1988,'coupe');
  mission(state,'groceries');
  parkAt(state,'market');
  assert.equal(interact(state),true);
  for (const question of MINI_GAMES.groceries)
    assert.equal(chooseMiniGame(state,question.answer),true);
  assert.equal(currentMission(state).id,'groceries-delivery');
  assert.equal(cargoUsed(state.cargo),5);
  assert.deepEqual(state.cargo.remaining,['groceries']);
  const first = snapshot(state);
  parkAt(state,'market');
  assert.equal(interact(state),false,'cannot deliver at pickup');
  parkAt(state,'home');
  assert.equal(interact(state),true);
  assert.equal(currentMission(state).id,'shopping-reload-1');
  assert.equal(state.completedCargo.length,0);
  assert.equal(state.cargo.trips,1);
  parkAt(state,'market');
  assert.equal(interact(state),true);
  assert.equal(currentMission(state).id,'shopping-redeliver-1');
  assert.equal(cargoUsed(state.cargo),3);
  parkAt(state,'home');
  assert.equal(interact(state),true);
  assert.equal(state.cargo,null);
  assert.deepEqual(state.completedCargo,[{id:'shopping',trips:2,count:3}]);
  assert.equal(currentMission(state).id,'hardware');
  assert.equal(state.tasks.filter(t=>t.id==='shopping-reload-1').length,1);
  assert.equal(first.cargo.trips,0,'earlier snapshot is not mutated');
});

test('parcel and furniture jobs deliver at their authored destinations', () => {
  for (const [profile,pickup,delivery,source,destination,job] of [
    ['hatchback','parcel-pickup','parcel-delivery','parcel','neighbour','neighbour'],
    ['hatchback','furniture-run','furniture-delivery','furniture','home','wardrobe']
  ]) {
    const s=createGame(1988,profile);
    mission(s,pickup);parkAt(s,source);
    assert.equal(interact(s),true);
    assert.equal(currentMission(s).id,delivery);
    assert.equal(s.cargo.id,job);
    parkAt(s,destination);s.speed=30;
    assert.equal(interact(s),false,'parking still requires low speed');
    s.speed=0;setPaused(s,true);
    assert.equal(interact(s),false,'paused deliveries are inert');
    setPaused(s,false);
    assert.equal(interact(s),true);
    assert.equal(s.cargo,null);
    assert.equal(s.completedCargo[0].id,job);
    assert.equal(s.completedCargo[0].trips,1);
  }
});

test('delivery cannot complete if a player somehow skips the pickup', () => {
  const s=createGame();
  mission(s,'parcel-delivery');parkAt(s,'neighbour');
  assert.equal(interact(s),false);
  assert.equal(s.index,s.tasks.findIndex(t=>t.id==='parcel-delivery'));
  assert.equal(s.completedCargo.length,0);
  assert.equal(s.cargo,null);
});

test('deterministic complete cargo route for all three profiles', () => {
  for (const profile of Object.keys(CARGO_CAPACITY)) {
    const a=createGame(1988,profile),b=createGame(1988,profile);
    for(const s of [a,b]){
      mission(s,'furniture-run');
      let safety=0;
      while (currentMission(s)?.job === 'wardrobe' && safety++<8) {
        parkAt(s,currentMission(s).place);
        assert.equal(interact(s),true);
      }
      assert.ok(safety>=2);
      assert.equal(s.cargo,null);
    }
    assert.deepEqual(snapshot(a),snapshot(b));
  }
});

test('the entire expanded Saturday remains completable by all three vehicle profiles', () => {
  for (const profile of Object.keys(CARGO_CAPACITY)) {
    const s=createGame(1988,profile);
    let steps=0;
    while (!s.finished && steps++ < 70) {
      const m=currentMission(s);
      assert.ok(m,'missing active mission for '+profile);
      if (m.id==='return' && !s.ambushed) {
        s.body=bodyAt(170,330);
        s.speed=0;
        // Trigger the existing near-home message at the correct game tick.
        stepGame(s);
        continue;
      }
      parkAt(s,m.place);
      assert.equal(interact(s),true,profile+'/'+m.id);
      if (s.miniGame) {
        for (const q of MINI_GAMES[s.miniGame.type]) {
          assert.equal(chooseMiniGame(s,q.answer<0?0:q.answer),true,
            profile+'/'+m.id+'/'+q.prompt);
        }
      }
    }
    assert.ok(s.finished,profile+' did not reach the final boss');
    assert.equal(s.cargo,null,profile+' arrived home with undelivered cargo');
    const receipts=Object.fromEntries(s.completedCargo.map(r=>[r.id,r.trips]));
    assert.deepEqual(Object.keys(receipts).sort(),['neighbour','shopping','wardrobe']);
    assert.equal(receipts.neighbour,1);
    assert.equal(receipts.shopping,profile==='coupe'?2:1);
    assert.equal(receipts.wardrobe,profile==='coupe'?2:1);
    assert.equal(s.tasks.filter(t=>t.id==='ambush').length,1);
  }
});
