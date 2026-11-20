// SPDX-License-Identifier: Apache-2.0
// GFTA6-WORLD-002: authored city content, not an engine/projection module.
// Units are the original 2D world coordinates. Stable IDs survive render changes.
export const CITY_VERSION = 'suburbania.v2';
export const WORLD = Object.freeze({
  width: 1550, height: 1130,
  roadsX: Object.freeze([170, 560, 950, 1340]),
  roadsY: Object.freeze([170, 435, 695, 970])
});

const location = (id, name, x, y, icon, tint, kind) =>
  Object.freeze({id, name, x, y, icon, tint, kind});
export const PLACES = Object.freeze([
  location('home', 'HOME SWEET HOME', 170, 170, '⌂', '#f8c77f', 'residence'),
  location('salon', 'NAIL SALON', 560, 170, '✦', '#fc97b6', 'shop'),
  location('spa', 'HEALTH SPA', 950, 170, '✺', '#92e4c9', 'shop'),
  location('fuel', 'PETROL', 170, 435, '⛽', '#e8b16c', 'service'),
  location('market', 'SUPERMARKET', 950, 435, '▣', '#93c9f5', 'shop'),
  location('dry', 'DRY CLEANERS', 560, 695, '◈', '#c3aff9', 'service'),
  location('hardware', 'HARDWARE', 170, 695, '⚒', '#eeb07e', 'shop'),
  location('parcel', 'PARCEL DEPOT', 950, 695, '▤', '#b7e3ee', 'service'),
  location('dogspa', 'DOG GROOMER', 1340, 170, '✂', '#eeafbd', 'service'),
  location('furniture', 'FURNITURE WAREHOUSE', 1340, 435, '▥', '#e3b77c', 'shop'),
  location('takeaway', 'TAKEAWAY', 1340, 695, '★', '#efb087', 'shop'),
  location('bakery', 'THE BAKERY', 170, 970, '❋', '#ffe3a7', 'shop'),
  location('neighbour', 'THE NEIGHBOUR', 560, 970, '⌂', '#a2dfd0', 'residence'),
  location('chemist', 'CHEMIST', 950, 970, '✚', '#a8cae9', 'service')
]);
const building = (id, x, y, w, h, color, label, height) =>
  Object.freeze({id, x, y, w, h, color, label, height});
export const BLOCKS = Object.freeze([
  building('flats', 297, 279, 119, 94, '#6186a6', 'FLATS', 3),
  building('offices', 735, 285, 136, 86, '#aa86a2', 'OFFICES', 4),
  building('shops', 324, 539, 129, 91, '#d09f70', 'SHOPS', 2),
  building('park', 752, 541, 126, 93, '#7aa48f', 'PARK', 1),
  building('apartments', 1103, 281, 135, 93, '#719caf', 'APARTMENTS', 3),
  building('storage', 1081, 539, 146, 94, '#a88b76', 'STORAGE', 2),
  building('terrace', 334, 816, 136, 99, '#ae838b', 'TERRACE', 2),
  building('library', 746, 823, 128, 102, '#829cc6', 'LIBRARY', 2),
  building('courtyard', 1087, 822, 143, 103, '#779f8b', 'COURT', 1)
]);

// Parking decorations describe the world, but do NOT become a separate
// authoritative parking predicate. Existing near-place + low-speed rules win.
export const PARKING_BAYS = Object.freeze(PLACES.map(p => Object.freeze({
  placeId: p.id, x: p.x + 52, y: p.y + 24, heading: 'east'
})));

/** Pure content validation, callable in CI without DOM/engine state. */
export function validateWorld() {
  const ids = new Set();
  const errors = [];
  const inside = (x, y) => Number.isSafeInteger(x) && Number.isSafeInteger(y) &&
    x >= 24 && y >= 24 && x <= WORLD.width - 24 && y <= WORLD.height - 24;
  for (const road of [WORLD.roadsX, WORLD.roadsY]) {
    if (road.some((v, i) => !Number.isSafeInteger(v) || i > 0 && v <= road[i - 1]))
      errors.push('road coordinates must be ordered integers');
  }
  for (const p of PLACES) {
    if (ids.has(p.id)) errors.push('duplicate place ' + p.id);
    ids.add(p.id);
    if (!inside(p.x, p.y)) errors.push('place out of bounds ' + p.id);
    if (!WORLD.roadsX.includes(p.x) || !WORLD.roadsY.includes(p.y))
      errors.push('place is not at a connected street crossing ' + p.id);
  }
  const built = new Set();
  for (const b of BLOCKS) {
    if (built.has(b.id)) errors.push('duplicate building ' + b.id);
    built.add(b.id);
    if (!inside(b.x, b.y) || !inside(b.x + b.w, b.y + b.h) ||
      b.w <= 0 || b.h <= 0 || !Number.isSafeInteger(b.height) || b.height < 0)
      errors.push('invalid footprint ' + b.id);
    for (const p of PLACES) {
      if (p.x > b.x - 16 && p.x < b.x + b.w + 16 &&
          p.y > b.y - 16 && p.y < b.y + b.h + 16)
        errors.push('place overlaps building ' + p.id + '/' + b.id);
    }
  }
  if (PARKING_BAYS.length !== PLACES.length ||
      PARKING_BAYS.some(b => !ids.has(b.placeId) || !inside(b.x, b.y)))
    errors.push('parking decoration missing or outside city');
  return Object.freeze(errors);
}
