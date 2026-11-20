// SPDX-License-Identifier: Apache-2.0
// Execution-only tests for vehicle feel and reproducible arcade motion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, stepGame, bodyAt, snapshot} from '../src/core.js';
import {stepCar, carDirectionQ12, fineDirectionQ12, vehicleSpec, VEHICLES, CAR_TUNING} from '../src/vehicle.js';

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
    const [dx, dy] = fineDirectionQ12(v.headingFine);
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

test('continuous steering changes heading on consecutive moving ticks, not old cadence', () => {
  let v = atRest();
  for (let t = 1; t <= 12; t++) v = advance(v, {throttle: 1}, t);
  assert.ok(v.speed >= CAR_TUNING.minimumSteerSpeed);
  const headings = [];
  for (let t = 13; t <= 23; t++) {
    v = advance(v, {throttle: 1, steer: 1}, t);
    headings.push(v.headingFine);
  }
  for (let n = 1; n < headings.length; n++)
    assert.notEqual(headings[n], headings[n - 1], 'each moving steering tick must respond');
  assert.ok(headings.at(-1) - headings[0] >= 90,
    'suburban handling must provide meaningful corner response');
  // Coarse compatibility heading is still derived consistently.
  assert.equal(v.headingQ, Math.floor((v.headingFine + 8) / 16) % 64);
});

test('interpolated Q12 heading is continuous across pinned VANILLAJS sectors', () => {
  for (let h = 0; h < 1024; h++) {
    const a = fineDirectionQ12(h);
    const b = fineDirectionQ12((h + 1) % 1024);
    assert.ok(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 26,
      'no single-step vector discontinuity across sector boundary');
  }
  for (let h = 0; h < 64; h++)
    assert.deepEqual(fineDirectionQ12(h * 16), carDirectionQ12(h));
  assert.throws(() => fineDirectionQ12(-1), RangeError);
  assert.throws(() => fineDirectionQ12(1024), RangeError);
});

test('three independent car profiles have distinct deterministic acceleration and cornering', () => {
  assert.deepEqual(Object.keys(VEHICLES).sort(), ['coupe','hatchback','van']);
  assert.throws(() => vehicleSpec('__proto__'), RangeError);
  assert.throws(() => createGame(1988, 'spaceship'), RangeError);
  const results = {};
  for (const profile of Object.keys(VEHICLES)) {
    const game = createGame(1988, profile);
    for (let i = 0; i < 15; i++) stepGame(game, {throttle: 1, steer: 1});
    results[profile] = {speed: game.speed, headingFine: game.headingFine};
    assert.equal(game.profile, profile);
    assert.equal(snapshot(game).profile, profile);
  }
  assert.ok(results.coupe.speed > results.hatchback.speed);
  assert.ok(results.hatchback.speed > results.van.speed);
  assert.ok(results.coupe.headingFine > results.van.headingFine);
});

test('reverse yaw mirrors forward steering and preserves no-turn-at-rest', () => {
  let forward = {...atRest(), speed: 40};
  let reverse = {...atRest(), speed: -40};
  const f = advance(forward, {steer: 1}, 1);
  const r = advance(reverse, {steer: 1}, 1);
  assert.ok(f.headingFine > 0 && f.headingFine < 100);
  assert.ok(r.headingFine > 900);
  assert.equal((f.headingFine + r.headingFine) % 1024, 0);
});

test('fine steering remains deterministic across wrap-around and reload', () => {
  const a = createGame(29, 'coupe'), b = createGame(29, 'coupe');
  for (let i = 0; i < 710; i++) {
    const input = {throttle: i < 90 ? 1 : i < 140 ? -1 : 1,
      steer: i % 80 < 60 ? 1 : -1, brake: i % 190 > 175};
    stepGame(a, input); stepGame(b, input);
  }
  assert.deepEqual(snapshot(a), snapshot(b));
  assert.ok(a.headingFine >= 0 && a.headingFine < 1024);
});
