// SPDX-License-Identifier: Apache-2.0
// Original deterministic GFTA6 vehicle model. The pinned Apache-2.0 VANILLAJS
// module supplies validated bodies and 16 integer direction vectors.
// Multi-Race-Driving (GPL-3.0) is a feature-level reference only: NO source,
// algorithms, artwork, data or dependencies are copied from that project.
import {createBody2D, direction2D} from '../vendor/vanillajs/motion2d.js';

// Different cars share one authoritative simulation contract.
// These are original arcade-tuned presets, not values extracted from other games.
export const VEHICLES = Object.freeze({
  hatchback: Object.freeze({name: 'Errand hatchback', paint: '#f36b9b',
    maxForward: 176, maxReverse: 84, acceleration: 6, reverseAcceleration: 4,
    coastingDrag: 3, serviceBrake: 20, turnLow: 12, turnMid: 11, turnHigh: 10}),
  coupe: Object.freeze({name: 'Weekend coupe', paint: '#f6bd75',
    maxForward: 204, maxReverse: 90, acceleration: 8, reverseAcceleration: 5,
    coastingDrag: 4, serviceBrake: 23, turnLow: 14, turnMid: 12, turnHigh: 10}),
  van: Object.freeze({name: 'Shopping van', paint: '#8bdac9',
    maxForward: 145, maxReverse: 72, acceleration: 4, reverseAcceleration: 3,
    coastingDrag: 3, serviceBrake: 17, turnLow: 9, turnMid: 8, turnHigh: 7})
});
export const DEFAULT_VEHICLE = 'hatchback';
export function vehicleSpec(profile = DEFAULT_VEHICLE) {
  if (!Object.hasOwn(VEHICLES, profile)) throw new RangeError('unknown vehicle profile');
  return VEHICLES[profile];
}
export const CAR_TUNING = Object.freeze({
  ...VEHICLES[DEFAULT_VEHICLE],
  directionChangeBrake: 14,
  minimumSteerSpeed: 12,
  headingSteps: 64, // legacy 64-step index, derived from fine heading
  headingPrecision: 1024 // full turn; authoritative integer orientation
});
const checkInt = (value, name) => {
  if (!Number.isSafeInteger(value)) throw new RangeError(name + ' must be a safe integer');
  return value;
};
const axis = (v, name) => {
  if (!Number.isInteger(v) || v < -1 || v > 1)
    throw new RangeError(name + ' must be -1, 0 or 1');
  return v;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dragToZero = (v, n) => v > 0 ? Math.max(0, v - n) : Math.min(0, v + n);
const wrapHeading = n => (n % 1024 + 1024) % 1024;

/** Integer Q12 unit vector for a 1/1024-turn heading. Piecewise linear
 * interpolation across the original VANILLAJS sector vectors.
 * No trig, floating-point integration or wall-clock input.
 */
export function fineDirectionQ12(headingFine) {
  checkInt(headingFine, 'headingFine');
  if (headingFine < 0 || headingFine >= CAR_TUNING.headingPrecision)
    throw new RangeError('invalid fine heading');
  const sector = Math.floor(headingFine / 64);
  const part = headingFine % 64;
  const a = direction2D(sector);
  if (part === 0) return a;
  const b = direction2D((sector + 1) % 16);
  return [
    Math.trunc((a[0] * (64 - part) + b[0] * part) / 64),
    Math.trunc((a[1] * (64 - part) + b[1] * part) / 64)
  ];
}

/** Preserve the existing 64-step public API. */
export function carDirectionQ12(headingQ) {
  checkInt(headingQ, 'headingQ');
  if (headingQ < 0 || headingQ >= CAR_TUNING.headingSteps)
    throw new RangeError('invalid coarse heading');
  return fineDirectionQ12(headingQ * 16);
}

/** Advance one fixed tick. Car turns on every moving tick, not on a global
 * tick%5 cadence. Signed speed keeps forward/reverse and service-brake
 * transitions predictable. Vehicle preset is explicit, never ambient.
 *
 * headingFine is backward-compatible: callers supplying only headingQ
 * initialize from the existing 64-step heading.
 */
export function stepCar(vehicle, controls = {}, {tick, bounds, blockedAt = null} = {}) {
  if (!vehicle || typeof vehicle !== 'object') throw new TypeError('vehicle required');
  const body = createBody2D(vehicle.body);
  const spec = vehicleSpec(vehicle.profile ?? DEFAULT_VEHICLE);
  let speed = checkInt(vehicle.speed, 'speed');
  const oldCoarse = checkInt(vehicle.headingQ, 'headingQ');
  if (oldCoarse < 0 || oldCoarse >= 64) throw new RangeError('invalid coarse heading');
  let headingFine = checkInt(vehicle.headingFine ?? oldCoarse * 16, 'headingFine');
  if (headingFine < 0 || headingFine >= 1024) throw new RangeError('invalid fine heading');
  if (speed < -spec.maxReverse || speed > spec.maxForward)
    throw new RangeError('speed outside vehicle envelope');
  if (!controls || typeof controls !== 'object' || Array.isArray(controls))
    throw new TypeError('controls must be an object');
  const steer = axis(controls.steer ?? 0, 'steer');
  const throttle = axis(controls.throttle ?? 0, 'throttle');
  if (controls.brake !== undefined && typeof controls.brake !== 'boolean')
    throw new TypeError('brake must be boolean');
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('invalid simulation tick');
  if (!bounds || typeof bounds !== 'object' ||
      !['minX', 'minY', 'maxX', 'maxY'].every(k => Number.isSafeInteger(bounds[k])) ||
      bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY)
    throw new RangeError('integer world bounds required');
  if (blockedAt !== null && typeof blockedAt !== 'function')
    throw new TypeError('blockedAt must be a function');

  if (controls.brake) {
    speed = dragToZero(speed, spec.serviceBrake);
  } else if (throttle === 1) {
    speed = speed < 0 ? Math.min(0, speed + CAR_TUNING.directionChangeBrake) :
      Math.min(spec.maxForward, speed + spec.acceleration);
  } else if (throttle === -1) {
    speed = speed > 0 ? Math.max(0, speed - CAR_TUNING.directionChangeBrake) :
      Math.max(-spec.maxReverse, speed - spec.reverseAcceleration);
  } else {
    speed = dragToZero(speed, spec.coastingDrag);
  }

  // Continuous yaw based on longitudinal speed, including correct reverse yaw.
  // This is intentionally responsive for narrow suburban intersections.
  if (steer !== 0 && Math.abs(speed) >= CAR_TUNING.minimumSteerSpeed) {
    const magnitude = Math.abs(speed);
    const rate = magnitude >= 128 ? spec.turnHigh :
      magnitude >= 64 ? spec.turnMid : spec.turnLow;
    headingFine = wrapHeading(headingFine + rate * (speed > 0 ? steer : -steer));
  }
  const [dx, dy] = fineDirectionQ12(headingFine);
  let vx = Math.trunc(dx * speed / 4096);
  let vy = Math.trunc(dy * speed / 4096);
  let x = body.x, y = body.y, collided = false;
  const nextX = clamp(x + vx, bounds.minX, bounds.maxX);
  if (nextX !== x && !(blockedAt && blockedAt(nextX, y))) x = nextX;
  else if (vx !== 0) { vx = 0; collided = true; }
  const nextY = clamp(y + vy, bounds.minY, bounds.maxY);
  if (nextY !== y && !(blockedAt && blockedAt(x, nextY))) y = nextY;
  else if (vy !== 0) { vy = 0; collided = true; }
  if (collided) speed = Math.trunc(speed / 3);
  const headingQ = Math.floor((headingFine + 8) / 16) % 64;
  return {
    body: createBody2D({
      x, y, vx, vy,
      heading: Math.floor((headingFine + 32) / 64) % 16
    }),
    speed, headingQ, headingFine, profile: vehicle.profile ?? DEFAULT_VEHICLE
  };
}
