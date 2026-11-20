// SPDX-License-Identifier: Apache-2.0
// GFTA6-owned presentation bindings. These are NOT model assets or an
// implementation of an upstream VANILLAJS asset-conversion API.
// Future mesh IDs are stable integration slots, not live paths/downloads.
const art = (id, label, paint, roof, trim, silhouette, meshSlot) =>
  Object.freeze({
    id, label, paint, roof, trim, silhouette,
    meshSlot, modelPath: null, source: 'GFTA6 original Canvas fallback',
    heightHint: silhouette === 'van' ? 2.7 : 1.7
  });
export const VEHICLE_ART = Object.freeze({
  hatchback: art('hatchback', 'Errand hatchback',
    '#f36b9b', '#294c69', '#f8c789', 'hatchback', 'gfta6/car/hatchback'),
  coupe: art('coupe', 'Weekend coupe',
    '#f6bd75', '#274c68', '#ffdbb4', 'coupe', 'gfta6/car/coupe'),
  van: art('van', 'Shopping van',
    '#8bdac9', '#305773', '#ddf0d0', 'van', 'gfta6/car/van')
});
export function vehicleArt(profile) {
  if (typeof profile !== 'string' || !Object.hasOwn(VEHICLE_ART, profile))
    throw new RangeError('unknown GFTA6 visual profile');
  return VEHICLE_ART[profile];
}
