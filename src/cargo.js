// SPDX-License-Identifier: Apache-2.0
// Original GFTA6 cargo/errand rules. No DOM, assets, engine physics or clock.
// Every job has stable IDs and a deterministic, greedy first-fit loading order.
export const CARGO_CAPACITY = Object.freeze({hatchback: 9, coupe: 5, van: 15});
const cargoItem = (id, label, slots) => Object.freeze({id, label, slots});
export const CARGO_ITEMS = Object.freeze({
  milk: cargoItem('milk', 'Absolutely correct milk', 3),
  groceries: cargoItem('groceries', 'The rest of the shopping', 3),
  icecream: cargoItem('icecream', 'Melting ice cream', 2),
  parcelA: cargoItem('parcelA', 'Mystery parcel A', 3),
  parcelB: cargoItem('parcelB', 'Mystery parcel B', 2),
  flatpackA: cargoItem('flatpackA', 'Flat-pack box 1 of 3', 4),
  flatpackB: cargoItem('flatpackB', 'Flat-pack box 2 of 3', 3),
  screws: cargoItem('screws', 'Bag of impossible screws', 1)
});
const cargoJob = (id, source, destination, itemIds) =>
  Object.freeze({id, source, destination, itemIds: Object.freeze(itemIds)});
export const CARGO_JOBS = Object.freeze({
  shopping: cargoJob('shopping', 'market', 'home', ['milk', 'groceries', 'icecream']),
  neighbour: cargoJob('neighbour', 'parcel', 'neighbour', ['parcelA', 'parcelB']),
  wardrobe: cargoJob('wardrobe', 'furniture', 'home', ['flatpackA', 'flatpackB', 'screws'])
});
export const cargoCapacity = profile => {
  if (typeof profile !== 'string' || !Object.hasOwn(CARGO_CAPACITY, profile))
    throw new RangeError('unknown GFTA6 cargo vehicle');
  return CARGO_CAPACITY[profile];
};
export const cargoItemById = id => {
  if (typeof id !== 'string' || !Object.hasOwn(CARGO_ITEMS, id))
    throw new RangeError('unknown cargo item');
  return CARGO_ITEMS[id];
};
export const cargoJobById = id => {
  if (typeof id !== 'string' || !Object.hasOwn(CARGO_JOBS, id))
    throw new RangeError('unknown cargo job');
  return CARGO_JOBS[id];
};
const frozenJob = (id, remaining, loaded, delivered, trips) =>
  Object.freeze({
    id, remaining: Object.freeze(remaining), loaded: Object.freeze(loaded),
    delivered: Object.freeze(delivered), trips
  });
export function createCargoJob(id, profile) {
  const spec = cargoJobById(id);
  const capacity = cargoCapacity(profile);
  if (spec.itemIds.some(item => cargoItemById(item).slots > capacity))
    throw new RangeError('cargo item exceeds vehicle capacity');
  return frozenJob(id, [...spec.itemIds], [], [], 0);
}
export const cargoUsed = job => {
  if (job === null) return 0;
  if (!job || !Array.isArray(job.loaded)) throw new TypeError('cargo job required');
  return job.loaded.reduce((sum, item) => sum + cargoItemById(item).slots, 0);
};
export const cargoFinished = job => job !== null &&
  job.remaining.length === 0 && job.loaded.length === 0 &&
  job.delivered.length === cargoJobById(job.id).itemIds.length;

/** Deterministic partial loading. Items that do not fit stay at the shop.
 * No implicit discard, no duplicate cargo, and no reloading before delivery.
 */
export function loadCargo(job, profile) {
  const capacity = cargoCapacity(profile);
  if (!job || !Object.isFrozen(job)) throw new TypeError('immutable cargo job required');
  if (job.loaded.length !== 0 || job.remaining.length === 0)
    throw new RangeError('no new cargo batch can be loaded');
  const remaining = [], loaded = [];
  let used = 0;
  for (const id of job.remaining) {
    const item = cargoItemById(id);
    if (used + item.slots <= capacity) {
      loaded.push(id);
      used += item.slots;
    } else remaining.push(id);
  }
  if (loaded.length === 0) throw new RangeError('vehicle cannot carry any remaining item');
  return frozenJob(job.id, remaining, loaded, [...job.delivered], job.trips);
}
/** Deliver one carried batch. Remaining stock stays at the source. */
export function deliverCargo(job) {
  if (!job || !Object.isFrozen(job) || job.loaded.length === 0)
    throw new RangeError('cannot deliver an empty cargo batch');
  return frozenJob(job.id, [...job.remaining], [],
    [...job.delivered, ...job.loaded], job.trips + 1);
}
