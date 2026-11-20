// SPDX-License-Identifier: Apache-2.0
// GFTA6 game rules: deterministic, fixed-tick and DOM-independent.
// Motion is supplied by a pinned Apache-2.0 VANILLAJS module (see NOTICE).
import {createBody2D} from '../vendor/vanillajs/motion2d.js';
import {stepCar, vehicleSpec, DEFAULT_VEHICLE} from './vehicle.js';
import {WORLD, PLACES, BLOCKS} from './world.js';
export {WORLD, PLACES, BLOCKS} from './world.js';

const PLACE_LOOKUP = new Map(PLACES.map(p => [p.id, p]));
export function placeById(id) { return PLACE_LOOKUP.get(id) ?? null; }
export function screenPosition(body) {
  return {x: body.x / MOTOR_UNITS_PER_PIXEL, y: WORLD.height - body.y / MOTOR_UNITS_PER_PIXEL};
}
export function bodyAt(x, y, heading = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('finite position required');
  return createBody2D({x: Math.round(x * MOTOR_UNITS_PER_PIXEL),
    y: Math.round((WORLD.height - y) * MOTOR_UNITS_PER_PIXEL), heading});
}
function isBlocked(px, py) {
  const p = screenPosition({x: px, y: py});
  // Solid building rectangles have a small safety margin for the car body.
  return BLOCKS.some(b => p.x > b.x - 16 && p.x < b.x + b.w + 16 &&
    p.y > b.y - 16 && p.y < b.y + b.h + 16);
}
const BOUNDS = Object.freeze({minX: 22 * MOTOR_UNITS_PER_PIXEL,
  maxX: (WORLD.width - 22) * MOTOR_UNITS_PER_PIXEL,
  minY: 22 * MOTOR_UNITS_PER_PIXEL,
  maxY: (WORLD.height - 22) * MOTOR_UNITS_PER_PIXEL});

const BASIC_MISSIONS = Object.freeze([
  {id: 'salon', place: 'salon', kind: 'drive', title: "I'LL ONLY BE FIVE MINUTES",
    description: 'Take your girlfriend to the nail salon. Five minutes is not a unit of time.'},
  {id: 'dry-run', place: 'dry', kind: 'drive', title: 'WHILE YOU ARE OUT...',
    description: 'Pick up the dry cleaning. You were already halfway home.'},
  {id: 'groceries', place: 'market', kind: 'groceries', title: 'THAT IS NOT THE RIGHT MILK',
    description: 'Find the exact items. Substitutions are apparently a war crime.'},
  {id: 'hardware', place: 'hardware', kind: 'hardware', title: 'ONE VERY SPECIFIC SCREW',
    description: 'Go to the hardware shop. The first four options are wrong.'},
  {id: 'dogspa-run', place: 'dogspa', kind: 'drive', title: 'THE DOG HAS AN APPOINTMENT',
    description: 'The dog needs a haircut. Somehow the dog has a better social life.'},
  {id: 'furniture-run', place: 'furniture', kind: 'drive', title: 'IT FITS IN THE CAR, TRUST ME',
    description: 'Collect the mystery furniture. No, nobody measured the boot.'},
  {id: 'bread-run', place: 'bakery', kind: 'drive', title: 'BREAD. THE CORRECT KIND.',
    description: 'The bakery has 37 varieties. The correct one is almost definitely sold out.'},
  {id: 'takeaway-run', place: 'takeaway', kind: 'takeaway', title: 'WHATEVER YOU WANT FOR DINNER',
    description: 'A seemingly simple dinner order becomes a multi-stage negotiation.'},
  {id: 'return', place: 'home', kind: 'drive', title: 'FINALLY GOING HOME',
    description: 'Your sofa exists. You remember it fondly.'},
  {id: 'laundry', place: 'home', kind: 'laundry', title: 'THE FITTED SHEET INCIDENT',
    description: 'Sort the laundry before your afternoon may continue.'},
  {id: 'clean', place: 'home', kind: 'clean', title: 'YOU MISSED A SPOT',
    description: 'Clean the suspiciously persistent mess.'},
  {id: 'furniture', place: 'home', kind: 'furniture', title: 'FLAT PACK, FLAT PATIENCE',
    description: 'Assemble the thing with instructions drawn by a sleep-deprived goat.'},
  {id: 'boss', place: 'home', kind: 'boss', title: 'I THOUGHT YOU WERE GOING TO DO THAT TODAY',
    description: 'Complete a task that was never assigned. DIFFICULTY: IMPOSSIBLE.'}
]);

export const MINI_GAMES = Object.freeze({
  groceries: [
    {prompt: 'The list says MILK. Which milk?', choices: ['Oat milk, unsweetened', 'Milk from a cow', 'Almond milk, vanilla'], answer: 0},
    {prompt: 'She specifically requested...', choices: ['Red apples', 'Strawberries', 'A houseplant'], answer: 1},
    {prompt: 'An absolutely vital final item:', choices: ['Dish detergent', 'Motor oil', 'A garden gnome'], answer: 0}
  ],
  hardware: [
    {prompt: 'The missing fastener is...', choices: ['A screw roughly this size', 'M6 × 25 mm, countersunk', 'An entire new wardrobe'], answer: 1},
    {prompt: 'Your receipt is...', choices: ['In the bin', 'In your pocket', 'A matter of philosophy'], answer: 1}
  ],
  laundry: [
    {prompt: 'White bed sheet. Choose the basket.', choices: ['Light colours', 'Dark colours', 'Mystery pile'], answer: 0},
    {prompt: 'Black jeans. Choose the basket.', choices: ['Light colours', 'Dark colours', 'Mystery pile'], answer: 1},
    {prompt: 'The fitted sheet must be...', choices: ['Declared irreducible', 'Fed to the vacuum', 'Folded into something vaguely rectangular'], answer: 2}
  ],
  clean: [
    {prompt: 'A visible crumb. What tool?', choices: ['Vacuum', 'Hammer', 'Receipt printer'], answer: 0},
    {prompt: 'Sticky countertop. What tool?', choices: ['Dry sock', 'Cloth and cleaner', 'Another countertop'], answer: 1},
    {prompt: 'The last invisible crumb lives...', choices: ['Under the toaster', 'On the moon', 'Inside the router'], answer: 0}
  ],
  furniture: [
    {prompt: 'Step one of 46:', choices: ['Install door first', 'Lay out and count the parts', 'Throw away instructions'], answer: 1},
    {prompt: 'The dowels belong...', choices: ['In the pre-drilled holes', 'In the coffee machine', 'Outside in the garden'], answer: 0},
    {prompt: 'The final step is...', choices: ['Skip the wall anchor', 'Use the wardrobe as a ladder', 'Secure it according to instructions'], answer: 2}
  ],
  takeaway: [
    {prompt: '"Anything is fine." Which place?', choices: ['Sushi', 'The place she mentioned yesterday', 'The moon'], answer: 1},
    {prompt: '"Not THAT place." What was the issue?', choices: ['Wrong packaging', 'Too much parking', 'The order was missing chips'], answer: 2},
    {prompt: 'What must you check before leaving?', choices: ['Every item and the receipt', 'The phase of the moon', 'The roof rack'], answer: 0}
  ],
  boss: [
    {prompt: '"I THOUGHT YOU WERE GOING TO DO THAT TODAY." What do you say?',
      choices: ['What task?', 'I thought we had a list.', 'I love you.', 'I already went to Bunnings twice.'], answer: -1}
  ]
});
function addLog(state, message) {
  state.message = message;
  state.log.unshift({tick: state.tick, message});
  if (state.log.length > 7) state.log.length = 7;
}
export function createGame(seed = 1988, profile = DEFAULT_VEHICLE) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError('seed must be an unsigned 32-bit integer');
  vehicleSpec(profile); // fail before constructing a game with a bogus vehicle
  const state = {
    seed, profile, tick: 0, body: bodyAt(170, 170), speed: 0, headingQ: 0, headingFine: 0,
    moneyCents: 8760, patience: 100,
    goodwill: 83, fuel: 100, driveTicks: 0, distance: 0, index: 0,
    ambushed: false, paused: false, finished: false, outcome: '',
    miniGame: null, message: '', log: [], tasks: BASIC_MISSIONS.map(m => ({...m}))
  };
  addLog(state, 'SATURDAY 09:00 — "Just one tiny favour..."');
  return state;
}
export function currentMission(state) {
  return state.tasks[state.index] ?? null;
}
export function distanceToPlace(state, id) {
  const p = placeById(id);
  if (!p) throw new RangeError('unknown destination');
  const car = screenPosition(state.body);
  return Math.hypot(p.x - car.x, p.y - car.y);
}
function advanceMission(state) {
  state.index += 1;
  const next = currentMission(state);
  if (next) addLog(state, 'MISSION UPDATED: ' + next.title);
}
export function stepGame(state, controls = {}) {
  if (state.paused || state.finished || state.miniGame) return state;
  const steer = controls.steer ?? 0, throttle = controls.throttle ?? 0;
  const brake = controls.brake ?? false;
  if (![-1, 0, 1].includes(steer) || ![-1, 0, 1].includes(throttle) ||
      typeof brake !== 'boolean')
    throw new RangeError('invalid steering, throttle or brake input');
  state.tick += 1;
  const before = state.body;
  const next = stepCar(
    {body: before, speed: state.speed, headingQ: state.headingQ,
      headingFine: state.headingFine, profile: state.profile},
    {steer, throttle: state.fuel > 0 ? throttle : 0, brake},
    {tick: state.tick, bounds: BOUNDS, blockedAt: isBlocked}
  );
  state.body = next.body;
  state.speed = next.speed;
  state.headingQ = next.headingQ;
  state.headingFine = next.headingFine;
  const moved = Math.hypot(state.body.x - before.x, state.body.y - before.y) / MOTOR_UNITS_PER_PIXEL;
  state.distance += moved;
  if (throttle !== 0 && moved > 0) {
    state.driveTicks += 1;
    if (state.driveTicks % 260 === 0) state.fuel = Math.max(0, state.fuel - 1);
  }
  // Fuel empty -> coast but never teleport or trap an already moving vehicle.
  if (state.fuel === 0 && state.tick % 150 === 0) addLog(state, 'FUEL EMPTY. Petrol station, please.');
  const mission = currentMission(state);
  if (mission?.id === 'return' && !state.ambushed && distanceToPlace(state, 'home') < 175) {
    const where = ['spa', 'parcel', 'chemist', 'neighbour'][state.seed % 4];
    state.tasks.splice(state.index, 0, {
      id: 'ambush', place: where, kind: 'drive', title: 'ONE LAST THING (PROMISE)',
      description: 'While you are out, can you just swing by ' +
        placeById(where).name.toLowerCase() + '?'
    });
    state.ambushed = true;
    addLog(state, 'NEW MESSAGE: "While you are out, can you just..."');
  }
  return state;
}
export function interact(state) {
  if (state.paused || state.finished || state.miniGame) return false;
  const mission = currentMission(state);
  if (!mission) return false;
  const fuelHere = distanceToPlace(state, 'fuel') <= INTERACT_RADIUS;
  if (fuelHere && mission.place !== 'fuel') {
    if (state.moneyCents < 450) { addLog(state, 'Petrol costs $4.50. Check the sofa for coins.'); return false; }
    state.moneyCents -= 450;
    state.fuel = Math.min(100, state.fuel + 35);
    addLog(state, 'Refuelled. Your wallet is now slightly lighter.');
    return true;
  }
  if (distanceToPlace(state, mission.place) > INTERACT_RADIUS) {
    addLog(state, 'Wrong destination. Check your mission marker.');
    return false;
  }
  if (Math.abs(state.speed) > 22) {
    addLog(state, 'Park first! You cannot shop at 80 km/h.');
    return false;
  }
  if (MINI_GAMES[mission.kind]) {
    state.miniGame = {type: mission.kind, round: 0};
    addLog(state, mission.kind === 'boss'
      ? 'NEW MISSION UNLOCKED: Complete a task that was never assigned.'
      : 'MINI-GAME STARTED: ' + mission.title);
  } else {
    if (mission.id === 'salon') state.moneyCents -= 1200;
    if (mission.id === 'dogspa-run') state.moneyCents -= 650;
    if (mission.id === 'furniture-run') state.moneyCents -= 1250;
    if (mission.id === 'bread-run') state.moneyCents -= 450;
    if (mission.id === 'ambush') state.moneyCents -= 850;
    addLog(state, 'ERRAND COMPLETE: ' + mission.title);
    advanceMission(state);
  }
  return true;
}
export function chooseMiniGame(state, selection) {
  if (!state.miniGame || state.paused || state.finished) return false;
  const {type, round} = state.miniGame;
  const questions = MINI_GAMES[type];
  const question = questions[round];
  if (!Number.isInteger(selection) || selection < 0 || selection >= question.choices.length) return false;
  if (type === 'boss') {
    state.finished = true;
    state.outcome = 'MISSION FAILED SUCCESSFULLY';
    state.miniGame = null;
    addLog(state, 'TASK NOT FOUND. Saturday survived. Free weekend not unlocked.');
    return true;
  }
  if (selection !== question.answer) {
    state.patience = Math.max(0, state.patience - 9);
    addLog(state, 'INCORRECT. The mission has opinions. Try again.');
    return false;
  }
  state.miniGame.round += 1;
  if (state.miniGame.round === questions.length) {
    if (type === 'groceries') state.moneyCents -= 1620;
    if (type === 'hardware') state.moneyCents -= 625;
    if (type === 'takeaway') state.moneyCents -= 1350;
    if (type === 'furniture') state.goodwill = Math.min(100, state.goodwill + 7);
    state.miniGame = null;
    addLog(state, 'MINI-GAME COMPLETE. No free time awarded.');
    advanceMission(state);
  } else {
    addLog(state, 'CORRECT! ' + (questions.length - state.miniGame.round) + ' step(s) remain.');
  }
  return true;
}
export function setPaused(state, value) {
  if (state.finished) return;
  state.paused = Boolean(value);
}
export function snapshot(state) {
  return {
    seed: state.seed, tick: state.tick, body: state.body,
    speed: state.speed, headingQ: state.headingQ,
    headingFine: state.headingFine, profile: state.profile,
    moneyCents: state.moneyCents, patience: state.patience, goodwill: state.goodwill,
    fuel: state.fuel, driveTicks: state.driveTicks, index: state.index,
    ambushed: state.ambushed, finished: state.finished,
    outcome: state.outcome, miniGame: state.miniGame,
    tasks: state.tasks.map(t => t.id)
  };
}
