// SPDX-License-Identifier: Apache-2.0
// GFTA6 game rules: deterministic, fixed-tick and DOM-independent.
// Motion is supplied by a pinned Apache-2.0 VANILLAJS module (see NOTICE).
import {createBody2D} from '../vendor/vanillajs/motion2d.js';
import {stepCar, vehicleSpec, DEFAULT_VEHICLE} from './vehicle.js';
import {createCargoJob, loadCargo, deliverCargo, cargoFinished,
  cargoJobById, cargoUsed, cargoCapacity} from './cargo.js';
import {WORLD, PLACES, BLOCKS} from './world.js';
import {createEscape, gigAction, nextUpgrade, purchaseUpgrade,
  launchFlight, stepEscape, flightActive, flightSucceeded} from './escape.js';
export {WORLD, PLACES, BLOCKS} from './world.js';

// These authoritative game constants remain local to the GFTA6 simulation.
export const TICK_HZ = 60;
export const INTERACT_RADIUS = 72;
const MOTOR_UNITS_PER_PIXEL = 64;

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
  {id: 'groceries-delivery', place: 'home', kind: 'cargo-delivery', job: 'shopping',
    title: 'THE ICE CREAM IS MELTING',
    description: 'Drive your shopping home before you are given another shopping list.'},
  {id: 'hardware', place: 'hardware', kind: 'hardware', title: 'ONE VERY SPECIFIC SCREW',
    description: 'Go to the hardware shop. The first four options are wrong.'},
  {id: 'parcel-pickup', place: 'parcel', kind: 'cargo-pickup', job: 'neighbour',
    title: 'CAN YOU PICK UP A PACKAGE?',
    description: 'It is just a couple of boxes, apparently. Park and load the boot.'},
  {id: 'parcel-delivery', place: 'neighbour', kind: 'cargo-delivery', job: 'neighbour',
    title: 'THE NEIGHBOUR IS EXPECTING IT',
    description: 'Drop off both boxes at the neighbour. A thank-you is not guaranteed.'},
  {id: 'dogspa-run', place: 'dogspa', kind: 'drive', title: 'THE DOG HAS AN APPOINTMENT',
    description: 'The dog needs a haircut. Somehow the dog has a better social life.'},
  {id: 'furniture-run', place: 'furniture', kind: 'cargo-pickup', job: 'wardrobe',
    title: 'IT FITS IN THE CAR, TRUST ME',
    description: 'Collect the mystery furniture. No, nobody measured the boot.'},
  {id: 'furniture-delivery', place: 'home', kind: 'cargo-delivery', job: 'wardrobe',
    title: 'BRING ALL OF IT INSIDE',
    description: 'Deliver the flat-pack boxes and the surprisingly important screws.'},
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
    miniGame: null, cargo: null, completedCargo: [], escape: createEscape(seed),
    message: '', log: [],
    tasks: BASIC_MISSIONS.map(m => ({...m}))
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
function pickupCargo(state, jobId) {
  if (state.cargo && state.cargo.id !== jobId) {
    addLog(state, 'BOOT OCCUPIED: Deliver the current cargo first.');
    return false;
  }
  if (!state.cargo) state.cargo = createCargoJob(jobId, state.profile);
  if (state.cargo.loaded.length !== 0 || state.cargo.remaining.length === 0) {
    addLog(state, 'You have already collected this batch.');
    return false;
  }
  state.cargo = loadCargo(state.cargo, state.profile);
  addLog(state, 'LOADED: ' + state.cargo.loaded.length + ' item(s), ' +
    cargoUsed(state.cargo) + '/' + cargoCapacity(state.profile) + ' boot slots.');
  advanceMission(state);
  return true;
}
function dropCargo(state, mission) {
  if (!state.cargo || state.cargo.id !== mission.job || !state.cargo.loaded.length) {
    addLog(state, 'NOTHING TO DELIVER: Check the boot and pickup location.');
    return false;
  }
  state.cargo = deliverCargo(state.cargo);
  if (!cargoFinished(state.cargo)) {
    const {id, trips} = state.cargo;
    const job = cargoJobById(id);
    state.tasks.splice(state.index + 1, 0,
      {id: id + '-reload-' + trips, place: job.source,
        kind: 'cargo-pickup', job: id, title: 'SOME ITEMS DID NOT FIT',
        description: 'The boot was full. Return for the remaining bags and boxes.'},
      {id: id + '-redeliver-' + trips, place: job.destination,
        kind: 'cargo-delivery', job: id, title: 'THE SECOND TRIP',
        description: 'The first delivery was apparently just a warm-up.'});
    addLog(state, 'DELIVERED A BATCH. STILL ' + state.cargo.remaining.length +
      ' ITEM(S) WAITING AT THE SHOP.');
  } else {
    const {id, trips, delivered} = state.cargo;
    state.completedCargo.push(Object.freeze({id, trips, count: delivered.length}));
    state.cargo = null;
    addLog(state, 'DELIVERY COMPLETED: ' + id + ' in ' + trips + ' trip(s).');
  }
  advanceMission(state);
  return true;
}
export function stepGame(state, controls = {}) {
  if (state.paused || state.finished || state.miniGame) return state;
  // The optional airfield mini-game uses the SAME fixed simulation tick and
  // driver inputs, but does not drive/mutate the authoritative 2D car.
  if (state.escape.flight) {
    if (flightActive(state.escape)) {
      state.escape = stepEscape(state.escape, controls);
      state.tick += 1;
      if (flightSucceeded(state.escape)) {
        state.finished = true;
        state.outcome = 'YOU FORGOT THE MILK';
        addLog(state,'ESCAPE ACHIEVED. INCOMING MESSAGE: "Can you pick up milk?"');
      } else if (state.escape.flight.status === 'grounded') {
        addLog(state,'THE AIRCRAFT RETURNED TO THE GROUND. Press F to retry.');
      }
    }
    return state;
  }
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
  if (state.paused || state.finished || state.miniGame || state.escape.flight) return false;
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
  if (mission.kind === 'cargo-pickup') {
    if (mission.job === 'wardrobe' && state.cargo === null) state.moneyCents -= 1250;
    return pickupCargo(state, mission.job);
  }
  if (mission.kind === 'cargo-delivery') return dropCargo(state, mission);
  if (MINI_GAMES[mission.kind]) {
    state.miniGame = {type: mission.kind, round: 0};
    addLog(state, mission.kind === 'boss'
      ? 'NEW MISSION UNLOCKED: Complete a task that was never assigned.'
      : 'MINI-GAME STARTED: ' + mission.title);
  } else {
    if (mission.id === 'salon') state.moneyCents -= 1200;
    if (mission.id === 'dogspa-run') state.moneyCents -= 650;
    if (mission.id === 'bread-run') state.moneyCents -= 450;
    if (mission.id === 'ambush') state.moneyCents -= 850;
    addLog(state, 'ERRAND COMPLETE: ' + mission.title);
    advanceMission(state);
  }
  return true;
}
/** GFTA6-owned secondary campaign. No normal mission progress, car dynamics
 * or cargo rules are modified by earning cash or buying aircraft parts.
 * Actions are accepted only when parked near the actual mapped location.
 */
export function interactEscape(state, action) {
  if (state.paused || state.finished || state.miniGame) return false;
  if (!['gig','upgrade','fly'].includes(action))throw RangeError('unknown escape action');
  if (flightActive(state.escape)) return false;
  if (Math.abs(state.speed) > 22) {
    addLog(state,'PARK FIRST. Secret operations do not happen at road speed.');
    return false;
  }
  let wanted = 'airfield';
  if (action === 'gig') {
    wanted = state.escape.activeGig?.to ?? 'parcel';
    if (state.cargo) {
      addLog(state,'DELIVER THE REGULAR SHOPPING FIRST. THE BOOT IS FULL.');
      return false;
    }
  }
  if (distanceToPlace(state, wanted) > INTERACT_RADIUS) {
    addLog(state,'SECRET OBJECTIVE: Drive to '+placeById(wanted).name+'.');
    return false;
  }
  let result;
  if (action === 'gig') result = gigAction(state.escape,wanted);
  else if (action === 'upgrade') result = purchaseUpgrade(state.escape,wanted);
  else result = launchFlight(state.escape,wanted);
  if (result.ok) state.escape = result.state;
  addLog(state,result.message);
  return result.ok;
}
export function escapeObjective(state) {
  const escape=state.escape;
  if (escape.flight) return escape.flight.status==='grounded' ?
    'Airfield: press F to retry takeoff' : 'OPERATION FREEDOM FLIGHT';
  if (escape.activeGig) return 'Paid delivery: '+placeById(escape.activeGig.to).name;
  if (nextUpgrade(escape)) return 'G at PARCEL DEPOT for gigs · U at AIRFIELD to restore';
  return 'Aircraft restored · drive to AIRFIELD and press F';
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
    if (type === 'groceries') {
      state.moneyCents -= 1620;
      if (state.cargo !== null) throw new Error('shopping cannot overwrite carried cargo');
      state.cargo = loadCargo(createCargoJob('shopping', state.profile), state.profile);
      addLog(state, 'SHOPPING LOADED: Boot now carries ' +
        cargoUsed(state.cargo) + ' of ' + cargoCapacity(state.profile) + ' slots.');
    }
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
    cargo: state.cargo, completedCargo: state.completedCargo.map(job => ({...job})),
    escape: state.escape,
    tasks: state.tasks.map(t => ({id: t.id, kind: t.kind, place: t.place, job: t.job ?? null}))
  };
}
