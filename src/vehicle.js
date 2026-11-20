// SPDX-License-Identifier: Apache-2.0
// GFTA6 car handling: deterministic integer arcade dynamics.
// The 16 base vectors and validated bodies come from pinned VANILLAJS
// (vendor/vanillajs/motion2d.js). GFTA6 interpolates four subheadings
// per base direction for a smooth 64-step turning circle.
// No browser, ambient clocks, random input, or variable delta-time.
import {createBody2D, direction2D} from '../vendor/vanillajs/motion2d.js';

export const CAR_TUNING = Object.freeze({
  maxForward: 176,   // integer subunits / fixed tick
  maxReverse: 84,
  acceleration: 6,
  reverseAcceleration: 4,
  directionChangeBrake: 14,
  coastingDrag: 3,
  serviceBrake: 20,
  minimumSteerSpeed: 16,
  slowSteerTicks: 3,
  fastSteerTicks: 5,
  headingSteps: 64
});
const validAxis = (value, name) => {
  if (!Number.isInteger(value) || value < -1 || value > 1)
    throw new RangeError(name + ' must be -1, 0 or 1');
  return value;
};
const int = (x, name) => {
  if (!Number.isSafeInteger(x)) throw new RangeError(name + ' must be a safe integer');
  return x;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approachZero = (n, step) => n > 0 ? Math.max(0, n - step) : Math.min(0, n + step);

/** Returns a Q12 forward vector at a 1/64-turn heading.
 * Each quarter-step interpolates neighbouring audited VANILLAJS Q12 vectors.
 * No Math.sin/cos or floating point integration in the authoritative simulation.
 */
export function carDirectionQ12(headingQ) {
  int(headingQ, 'headingQ');
  if (headingQ < 0 || headingQ >= CAR_TUNING.headingSteps)
    throw new RangeError('invalid headingQ');
  const sector = Math.floor(headingQ / 4);
  const fraction = headingQ % 4;
  const a = direction2D(sector);
  if (fraction === 0) return a;
  const b = direction2D((sector + 1) % 16);
  return [
    Math.trunc((a[0] * (4 - fraction) + b[0] * fraction) / 4),
    Math.trunc((a[1] * (4 - fraction) + b[1] * fraction) / 4)
  ];
}

/** Update car for ONE fixed simulation tick.
 * speed is signed: +forward, -reverse. Direction changes brake to zero
 * before engaging the opposite gear; space applies a stronger service brake.
 * Heading cannot turn while stationary. Contact dampens speed without
 * changing car orientation. Collision remains axis-separated and integer.
 */
export function stepCar(vehicle, controls = {}, {tick, bounds, blockedAt = null} = {}) {
  if (!vehicle || typeof vehicle !== 'object') throw new TypeError('vehicle required');
  const body = createBody2D(vehicle.body);
  let speed = int(vehicle.speed, 'speed');
  let headingQ = int(vehicle.headingQ, 'headingQ');
  if (headingQ < 0 || headingQ >= 64) throw new RangeError('invalid headingQ');
  if (speed < -CAR_TUNING.maxReverse || speed > CAR_TUNING.maxForward)
    throw new RangeError('speed outside car envelope');
  if (!controls || typeof controls !== 'object' || Array.isArray(controls))
    throw new TypeError('controls must be an object');
  const steer = validAxis(controls.steer ?? 0, 'steer');
  const throttle = validAxis(controls.throttle ?? 0, 'throttle');
  if (controls.brake !== undefined && typeof controls.brake !== 'boolean')
    throw new TypeError('brake must be boolean');
  if (!Number.isSafeInteger(tick) || tick < 0)
    throw new RangeError('tick must be a nonnegative integer');
  if (!bounds || typeof bounds !== 'object' ||
      !['minX', 'maxX', 'minY', 'maxY'].every(k => Number.isSafeInteger(bounds[k])) ||
      bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY)
    throw new TypeError('integer world bounds required');
  if (blockedAt !== null && typeof blockedAt !== 'function')
    throw new TypeError('blockedAt must be a function');

  if (controls.brake) {
    speed = approachZero(speed, CAR_TUNING.serviceBrake);
  } else if (throttle === 1) {
    speed = speed < 0 ? Math.min(0, speed + CAR_TUNING.directionChangeBrake) :
      Math.min(CAR_TUNING.maxForward, speed + CAR_TUNING.acceleration);
  } else if (throttle === -1) {
    speed = speed > 0 ? Math.max(0, speed - CAR_TUNING.directionChangeBrake) :
      Math.max(-CAR_TUNING.maxReverse, speed - CAR_TUNING.reverseAcceleration);
  } else {
    speed = approachZero(speed, CAR_TUNING.coastingDrag);
  }

  if (steer !== 0 && Math.abs(speed) >= CAR_TUNING.minimumSteerSpeed) {
    const cadence = Math.abs(speed) >= 80 ?
      CAR_TUNING.fastSteerTicks : CAR_TUNING.slowSteerTicks;
    if (tick % cadence === 0) headingQ =
      (headingQ + (speed > 0 ? steer : -steer) + CAR_TUNING.headingSteps) %
      CAR_TUNING.headingSteps;
  }
  const [dxQ12, dyQ12] = carDirectionQ12(headingQ);
  let vx = Math.trunc(dxQ12 * speed / 4096);
  let vy = Math.trunc(dyQ12 * speed / 4096);
  const hit = (x, y) => blockedAt !== null && blockedAt(x, y);
  let x = body.x, y = body.y;
  const nextX = clamp(body.x + vx, bounds.minX, bounds.maxX);
  const nextY = clamp(body.y + vy, bounds.minY, bounds.maxY);
  let collided = false;
  if (nextX !== body.x && !hit(nextX, y)) x = nextX;
  else if (vx !== 0) {vx = 0; collided = true;}
  if (nextY !== body.y && !hit(x, nextY)) y = nextY;
  else if (vy !== 0) {vy = 0; collided = true;}
  if (collided) speed = Math.trunc(speed / 3);
  return {
    body: createBody2D({
      x, y, vx, vy, heading: Math.floor((headingQ + 2) / 4) % 16
    }),
    speed,
    headingQ
  };
}
