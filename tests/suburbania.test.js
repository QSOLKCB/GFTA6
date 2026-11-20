// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD, CITY_VERSION, PLACES, BLOCKS, PARKING_BAYS, validateWorld}
  from '../src/world.js';
import {createGame, stepGame, interact, chooseMiniGame, currentMission,
  bodyAt, snapshot, MINI_GAMES} from '../src/core.js';
import {vehicleArt, VEHICLE_ART} from '../src/vehicle-art.js';
import {VEHICLES} from '../src/vehicle.js';

test('Suburbania content is bounded, connected, unique and immutable', () => {
  assert.equal(CITY_VERSION, 'suburbania.v2');
  assert.deepEqual(validateWorld(), []);
  assert.equal(PLACES.length, 14);
  assert.equal(BLOCKS.length, 9);
  assert.equal(PARKING_BAYS.length, PLACES.length);
  assert.ok(Object.isFrozen(WORLD));
  assert.ok(Object.isFrozen(PLACES));
  assert.ok(PLACES.every(Object.isFrozen));
  assert.ok(BLOCKS.every(Object.isFrozen));
  assert.ok(PARKING_BAYS.every(Object.isFrozen));
  assert.equal(new Set(PLACES.map(p => p.id)).size, PLACES.length);
  assert.equal(new Set(BLOCKS.map(b => b.id)).size, BLOCKS.length);
});

test('old destinations and the opening mission stay at their original coordinates', () => {
  const originals = {
    home:[170,170],salon:[560,170],spa:[950,170],fuel:[170,435],
    market:[950,435],dry:[560,695],hardware:[170,695],parcel:[950,695]
  };
  for (const [id,[x,y]] of Object.entries(originals)) {
    const p = PLACES.find(p => p.id === id);
    assert.ok(p,id);
    assert.deepEqual([p.x,p.y],[x,y],id);
  }
  assert.equal(currentMission(createGame()).id,'salon');
});

test('four new story missions are real interactions, not unreachable display markers', () => {
  const missions = ['dogspa-run','furniture-run','bread-run','takeaway-run'];
  const s = createGame(1988);
  assert.ok(missions.every(id => s.tasks.some(t => t.id === id)));
  for (const id of missions) {
    s.index = s.tasks.findIndex(m => m.id === id);
    const target = PLACES.find(p => p.id === currentMission(s).place);
    assert.ok(target);
    // The current interactions still require proximity, not merely map presence.
    s.body = bodyAt(170,170);
    assert.equal(interact(s), false, 'distant '+id+' cannot complete');
    s.body = bodyAt(target.x,target.y);
    s.speed = 0;
    assert.equal(interact(s), true);
    if (s.miniGame) {
      assert.equal(id,'takeaway-run');
      const bad = MINI_GAMES.takeaway[0].choices.findIndex((_,i) =>
        i !== MINI_GAMES.takeaway[0].answer);
      assert.equal(chooseMiniGame(s,bad),false);
      for (const q of MINI_GAMES.takeaway)
        assert.equal(chooseMiniGame(s,q.answer),true);
    }
    assert.notEqual(currentMission(s)?.id,id);
    if (id === 'furniture-run') {
      assert.equal(currentMission(s).id,'furniture-delivery');
      s.body=bodyAt(170,170);
      assert.equal(interact(s),true);
      assert.equal(s.cargo,null);
    }
  }
  assert.equal(currentMission(s).id,'return');
});

test('vehicles have original fallback visuals and unpopulated future mesh slots', () => {
  assert.deepEqual(Object.keys(VEHICLE_ART).sort(),Object.keys(VEHICLES).sort());
  for (const profile of Object.keys(VEHICLES)) {
    const binding = vehicleArt(profile);
    assert.equal(binding.id,profile);
    assert.equal(binding.modelPath,null);
    assert.match(binding.meshSlot,/^gfta6\/car\//);
    assert.ok(Object.isFrozen(binding));
    assert.match(binding.paint,/^#[0-9a-f]{6}$/i);
  }
  assert.throws(() => vehicleArt('__proto__'), RangeError);
  assert.throws(() => vehicleArt('other'), RangeError);
});

test('new district blocking uses the same original 2D car/footprint rules', () => {
  const s = createGame(1988,'van');
  s.body = bodyAt(1040,320);
  for (let tick=0;tick<150;tick++) stepGame(s,{throttle:1});
  const x = s.body.x / 64;
  assert.ok(x < 1087,'car cannot enter the new storage/apartment footprint');
  const a = createGame(1988,'hatchback'),b = createGame(1988,'hatchback');
  for (let tick=0;tick<240;tick++) {
    const input = {throttle:tick<150?1:0,steer:tick%60<30?1:0};
    stepGame(a,input);stepGame(b,input);
  }
  assert.deepEqual(snapshot(a),snapshot(b));
});
