// SPDX-License-Identifier: Apache-2.0
// GFTA6-25D-001: game-specific *presentation* adapter for pinned VANILLAJS.
// Authoritative XY is mapped to projection X/Z; height is visual-only Y.
// No DOM, simulation, input, asset fetch, physics or frame clock.
import {WORLD, BLOCKS} from './world.js';
import {
  createProjection25D, projectPoint25D, projectScene25D,
  PROJECTION25D_FORMAT
} from '../vendor/vanillajs/projection25d.js';

export const GFTA6_RENDER_MODES = Object.freeze(['classic', 'raised']);
export const GFTA6_PROJECTION_SOURCE =
  'QSOLKCB/VANILLAJS@9014a9dc175ea18653c289f9f2956cccb33ea7f8:modules/projection25d/index.js';

function makeProjection(raised) {
  return createProjection25D({
    viewport: [WORLD.width, WORLD.height],
    origin: [WORLD.width / 2, WORLD.height / 2],
    pixelsPerUnit: 1,
    heightRise: raised ? 0.90 : 0,
    heightShear: raised ? 0.32 : 0,
    shadowDirection: [0.65, 0.42]
  });
}
const authored = Object.freeze(BLOCKS.map(b => Object.freeze({
  id: b.id, x: b.x, z: b.y, width: b.w, depth: b.h,
  // Blocks are authored in floor hints; 14 screen/world units per floor
  // is *presentation* scale, not authoritative collision height.
  height: b.height * 14
})));

const flatCamera = makeProjection(false);
const raisedCamera = makeProjection(true);
const flatScene = projectScene25D(flatCamera,
  authored.map(b => ({...b, height: 0})));
const raisedScene = projectScene25D(raisedCamera, authored);
const projectionByMode = Object.freeze({
  classic: Object.freeze({camera: flatCamera, scene: flatScene}),
  raised: Object.freeze({camera: raisedCamera, scene: raisedScene})
});
const receipt = Object.freeze(
  [...raisedScene.solids].map(s => Object.freeze({
    id: s.id, footprint: Object.freeze([...s.footprint])
  })).sort((a,b) => a.id.localeCompare(b.id))
);

export function getCityProjection(mode = 'classic') {
  if (typeof mode !== 'string' || !Object.hasOwn(projectionByMode, mode))
    throw new RangeError('unsupported GFTA6 presentation mode');
  return projectionByMode[mode];
}
export function projectCityGroundPoint(mode, x, y) {
  const {camera} = getCityProjection(mode);
  return projectPoint25D(camera, [x, 0, y]);
}
export function cityCollisionFootprints() { return receipt; }
export {PROJECTION25D_FORMAT};
