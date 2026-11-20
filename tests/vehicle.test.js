// SPDX-License-Identifier: Apache-2.0
// Execution-only tests for vehicle feel and reproducible arcade motion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, stepGame, bodyAt, snapshot} from '../src/core.js';
import {stepCar, carDirectionQ12, CAR_TUNING} from '../src/vehicle.js';

const bounds = Object.freeze({minX: 0, maxX: 100000, minY: 0, maxY: 100000});
const atRest = () => ({body: bodyAt(170, 170), speed: 0, headingQ: 0});
const advance = (vehicle, controls, tick) => stepCar(vehicle, controls, {tick, bounds});

test('pinned VANILLAJS base vectors remain exact at 16 cardinal subdivisions', () => {
  assert.deepEqual(carDirectionQ12(0), [4096, 0]);
  assert.deepEqual(carDirectionQ12(16), [0, 4096]);
  assert.deepEqual(carDirectionQ12(32), [-4096, 0]);
  assert.deepEqual(carDirectionQ12(48), [0, -4096]);
  const q1 = carDirectionQ12(1);
  assert.ok(q1[0] > 0 && q1[1] > 0, 'interpolated sub-heading faces northeast');
  assert.throws(() => carDirectionQ12(64), RangeError);
  assert.throws(() => carDirectionQ12(0.5), RangeError);
});

test('stationary steering does not rotate the car', () => {
  let v = atRest();
  for (let tick = 1; tick <= 80; tick++) v = advance(v, {steer: 1}, tick);
  assert.equal(v.speed, 0);
  assert.equal(v.headingQ, 0);
  assert.deepEqual(v.body, atRest().body);
});

test('acceleration coasts to a stop and service brake slows faster', () => {
  let s = atRest();
  for (let tick = 1; tick <= 25; tick++) s = advance(s, {throttle: 1}, tick);
  assert.equal(s.speed, Math.min(25 * CAR_TUNING.acceleration, CAR_TUNING.maxForward));
  const fast = s.speed;
  const coast = advance(s, {}, 26);
  const brake = advance(s, {brake: true}, 26);
  assert.ok(coast.speed < fast && coast.speed > brake.speed);
  assert.equal(brake.headingQ, s.headingQ);
  for (let tick = 27; tick <= 45; tick++) s = advance(s, {brake: true}, tick);
  assert.equal(s.speed, 0, 'brake stops the car completely');
});

test('reverse input brakes to zero before selecting reverse', () => {
  let v = atRest();
  for (let tick = 1; tick <= 12; tick++) v = advance(v, {throttle: 1}, tick);
  assert.ok(v.speed > 0);
  let wasStopped = false, hasReversed = false;
  for (let tick = 13; tick <= 35; tick++) {
    v = advance(v, {throttle: -1}, tick);
    if (v.speed === 0) wasStopped = true;
    if (v.speed < 0) {hasReversed = true; assert.ok(wasStopped); break;}
  }
  assert.ok(wasStopped && hasReversed, 'must brake before changing direction');
});

test('right and left steering mirror around forward, with no velocity side-slip', () => {
  let left = atRest(), right = atRest();
  for (let tick = 1; tick <= 80; tick++) {
    left = advance(left, {throttle: 1, steer: 1}, tick);
    right = advance(right, {throttle: 1, steer: -1}, tick);
  }
  assert.notEqual(left.headingQ, 0, 'left steer rotates');
  assert.notEqual(right.headingQ, 0, 'right steer rotates');
  assert.equal((left.headingQ + right.headingQ) % 64, 0);
  for (const v of [left, right]) {
    const [dx, dy] = carDirectionQ12(v.headingQ);
    const lateral = Math.abs(v.body.vx * dy - v.body.vy * dx);
    assert.ok(lateral < 6000,
      'velocity remains aligned with heading: no old independent-axis skating');
  }
});

test('solid wall contact damps speed and prevents tunnelling', () => {
  let v = atRest();
  const wallX = v.body.x + 200;
  const blockedAt = (x, _y) => x >= wallX;
  for (let tick = 1; tick <= 120; tick++)
    v = stepCar(v, {throttle: 1}, {tick, bounds, blockedAt});
  assert.ok(v.body.x < wallX, 'vehicle may not enter a blocked wall');
  assert.ok(v.body.vx < CAR_TUNING.maxForward, 'speed is damped on contact');
});

test('game core preserves exact deterministic snapshot including speed and subheading', () => {
  const inputs = Array.from({length: 420}, (_, tick) => ({
    throttle: tick < 200 ? 1 : tick < 280 ? -1 : 0,
    steer: tick % 70 < 24 ? -1 : tick % 70 < 50 ? 1 : 0,
    brake: tick % 53 > 48
  }));
  const a = createGame(1988), b = createGame(1988);
  for (const input of inputs) {stepGame(a, input); stepGame(b, input);}
  assert.deepEqual(snapshot(a), snapshot(b));
  assert.equal(Number.isInteger(a.headingQ), true);
  assert.equal(Number.isInteger(a.speed), true);
  assert.ok(a.distance > 0);
});

test('stationary parking interaction still works after accelerating and braking', () => {
  const g = createGame();
  for (let t = 0; t < 28; t++) stepGame(g, {throttle: 1});
  assert.ok(g.speed > 0);
  for (let t = 0; t < 20; t++) stepGame(g, {brake: true});
  assert.equal(g.speed, 0);
});
