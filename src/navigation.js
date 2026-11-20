// SPDX-License-Identifier: Apache-2.0
// GFTA6-POLISH-001: view-only destination guidance. No authority over
// navigation physics, collision, mission actions, or escape payments.
import {currentMission, screenPosition} from './core.js';
import {PLACES} from './world.js';
import {AIRFIELD, GIG_DEPOT, nextUpgrade} from './escape.js';
import {cargoJobById} from './cargo.js';

export const ROUTE_MODES = Object.freeze(['errands','escape']);
const places = new Map(PLACES.map(p => [p.id,p]));
export function waypoint(state, mode = 'errands') {
  if (!state || typeof state !== 'object' || !state.body || !state.escape)
    throw new TypeError('GFTA6 gameplay state required');
  if (!ROUTE_MODES.includes(mode)) throw new RangeError('unsupported route mode');
  if (state.finished || state.escape.flight) return null;
  let id, instruction;
  if (mode === 'errands') {
    const mission = currentMission(state);
    if (!mission) return null;
    id = mission.place;
    instruction = mission.kind === 'cargo-delivery' ? 'Park and deliver the boot load (E)' :
      mission.kind === 'cargo-pickup' ? 'Park and collect cargo (E)' :
      'Park at the destination and interact (E)';
  } else {
    const gig = state.escape.activeGig;
    const next = nextUpgrade(state.escape);
    if (gig) {
      id = gig.to;
      instruction = 'Deliver paid courier job (G)';
    } else if (next && state.escape.fundCents < next.costCents) {
      if (state.cargo) {
        const job=cargoJobById(state.cargo.id);
        id=state.cargo.loaded.length ? job.destination : job.source;
        instruction=state.cargo.loaded.length ?
          'Finish the ordinary cargo delivery (E)' :
          'Collect the remaining cargo first (E)';
      } else {
        id = GIG_DEPOT;
        instruction = 'Collect a paid courier job (G)';
      }
    } else {
      id = AIRFIELD;
      instruction = next ? 'Purchase '+next.label+' (U)' :
        'Aircraft ready. Launch at the airfield (F)';
    }
  }
  const target=places.get(id);
  if (!target) throw RangeError('route refers to unknown place '+id);
  const p=screenPosition(state.body);
  const dx=target.x-p.x,dy=target.y-p.y;
  return Object.freeze({mode,id,label:target.name,x:target.x,y:target.y,
    distance:Math.round(Math.hypot(dx,dy)),bearing:Math.atan2(dy,dx),
    instruction});
}
