// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, stepGame, interact, chooseMiniGame, currentMission,
  MINI_GAMES, PLACES, WORLD, bodyAt, snapshot, distanceToPlace, setPaused} from '../src/core.js';

test('seed validation and stable starting state', () => {
  assert.throws(() => createGame(-1), RangeError);
  assert.throws(() => createGame(4294967296), RangeError);
  assert.throws(() => createGame(1.5), RangeError);
  assert.deepEqual(snapshot(createGame(1988)), snapshot(createGame(1988)));
  assert.equal(currentMission(createGame(1988)).id, 'salon');
  assert.equal(PLACES.length, 14);
  assert.deepEqual(WORLD.roadsX, [170, 560, 950, 1340]);
  assert.deepEqual(WORLD.roadsY, [170, 435, 695, 970]);
});

test('no random ambient clock or hidden input changes deterministic simulation', () => {
  const controls = [...Array(120)].map((_, tick) => ({
    throttle: tick % 40 >= 30 ? 0 : 1,
    steer: tick < 30 ? 0 : tick < 75 ? 1 : -1
  }));
  const a = createGame(17), b = createGame(17);
  for (const input of controls) { stepGame(a, input); stepGame(b, input); }
  assert.deepEqual(snapshot(a), snapshot(b));
  assert.ok(a.distance > 0, 'car actually moves');
  assert.notEqual(a.body.x, b.body.y);
  assert.throws(() => stepGame(a, {steer: 2}), RangeError);
});

test('travel bounds reject escape attempts and buildings have collision', () => {
  const s = createGame();
  for (let tick = 0; tick < 1700; tick++) stepGame(s, {throttle: 1, steer: 0});
  const x = s.body.x / 64;
  assert.ok(x <= WORLD.width - 22, 'cannot drive outside eastern border');
  const other = createGame();
  other.body = bodyAt(260, 320);
  for (let tick = 0; tick < 120; tick++) stepGame(other, {throttle: 1});
  assert.ok(other.body.x / 64 < 297 - 16, 'building collision prevents crossing facade');
});

test('remote interaction cannot complete quests', () => {
  const s = createGame();
  assert.equal(interact(s), false);
  assert.equal(s.index, 0);
  s.body = bodyAt(560, 170);
  assert.equal(interact(s), true);
  assert.equal(s.index, 1);
  assert.equal(s.moneyCents, 7560);
});

test('grocery mini-game rejects wrong choices, preserves question and penalises patience', () => {
  const s = createGame();
  s.index = 2; s.body = bodyAt(950, 435);
  assert.equal(interact(s), true);
  assert.equal(s.miniGame.type, 'groceries');
  assert.equal(chooseMiniGame(s, 2), false);
  assert.equal(s.miniGame.round, 0);
  assert.equal(s.patience, 91);
  for (const index of [0, 1, 0]) assert.equal(chooseMiniGame(s, index), true);
  assert.equal(s.index, 3);
  assert.equal(s.miniGame, null);
  assert.equal(s.moneyCents, 7140);
});

test('unassigned ambush is exactly once, seeded, and returns to original mission', () => {
  for (const [seed, expected] of [[1988, 'spa'], [1989, 'parcel'],
    [1990, 'chemist'], [1991, 'neighbour']]) {
    const s = createGame(seed);
    s.index = 8;
    s.body = bodyAt(170, 330);
    stepGame(s);
    assert.equal(s.ambushed, true);
    assert.equal(s.tasks[8].id, 'ambush');
    assert.equal(s.tasks[8].place, expected);
    assert.equal(s.tasks[9].id, 'return');
    s.body = bodyAt(PLACES.find(p => p.id === expected).x, PLACES.find(p => p.id === expected).y);
    assert.equal(interact(s), true);
    assert.equal(currentMission(s).id, 'return');
    s.body = bodyAt(170, 330);
    stepGame(s);
    assert.equal(s.tasks.filter(t => t.id === 'ambush').length, 1);
  }
});

test('fuel station refills fuel, charges money, and never completes active quest', () => {
  const s = createGame();
  s.fuel = 15; s.body = bodyAt(170, 435);
  assert.equal(interact(s), true);
  assert.equal(s.fuel, 50);
  assert.equal(s.moneyCents, 8310);
  assert.equal(s.index, 0);
  s.moneyCents = 0;
  assert.equal(interact(s), false);
  assert.equal(s.fuel, 50);
});

test('paused game cannot advance simulation or accept mini-game answers', () => {
  const s = createGame();
  setPaused(s, true);
  const pre = snapshot(s);
  stepGame(s, {throttle: 1});
  assert.deepEqual(snapshot(s), pre);
  // Locate the laundry mini-game by mission identity, not a brittle index.
  s.index = s.tasks.findIndex(t => t.id === 'laundry');
  s.body = bodyAt(170, 170);
  assert.equal(interact(s), false);
  setPaused(s, false);
  assert.equal(interact(s), true);
  setPaused(s, true);
  assert.equal(chooseMiniGame(s, 0), false);
  assert.equal(s.miniGame.round, 0);
});

test('full Saturday campaign can be completed with all mini-games and final boss', () => {
  const s = createGame(1988);
  let safety = 0;
  while (!s.finished && safety++ < 30) {
    const mission = currentMission(s);
    assert.ok(mission);
    if (mission.id === 'return' && !s.ambushed) {
      s.body = bodyAt(170, 330);
      stepGame(s);
      continue;
    }
    const place = PLACES.find(p => p.id === mission.place);
    s.body = bodyAt(place.x, place.y);
    assert.equal(interact(s), true, mission.id);
    if (s.miniGame) {
      const kind = s.miniGame.type;
      if (kind === 'boss') {
        assert.equal(chooseMiniGame(s, 3), true, 'fourth dialogue response should work');
      } else {
        for (const question of MINI_GAMES[kind]) {
          assert.equal(chooseMiniGame(s, question.answer), true);
        }
      }
    }
  }
  assert.ok(s.finished, 'the full campaign must reach end credits');
  assert.equal(s.outcome, 'MISSION FAILED SUCCESSFULLY');
  assert.equal(s.tasks.filter(t => t.id === 'ambush').length, 1);
  for (const id of ['dogspa-run', 'furniture-run', 'bread-run', 'takeaway-run'])
    assert.ok(s.tasks.some(t => t.id === id), 'expanded Saturday includes '+id);
  assert.ok(s.moneyCents > 0);
  const frozen = snapshot(s);
  stepGame(s, {throttle: 1});
  assert.deepEqual(snapshot(s), frozen);
});
