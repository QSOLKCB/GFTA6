# GFTA6-WORLD-002 — Suburbania District and Asset Slots

**Scope:** GFTA6 game-specific content. No changes to OPT or VANILLAJS
engine modules, physics model, renderer architecture, or licences.

## What is in PR #5

- `src/world.js`: Versioned `suburbania.v2` grid of four streets in each
  direction, fourteen stable destination IDs, nine static building footprints
  and parking-bay decorations.
- `src/core.js`: Same deterministic fixed-step vehicle physics and 2D
  collision predicates; four more Saturday campaign errands.
- `src/render.js`: Draw the expanded world, locations and parking indicators.
  No new 2.5D projection, depth-sorter or asset-conversion code.
- `src/vehicle-art.js`: Original Canvas fallback appearance for Hatchback,
  Coupe and Van with stable, unpopulated future model slots.
- Node built-in tests for world bounds, reproducibility, stable IDs, mission
  completion, art mapping and engine integration.
- Offline shell cache includes the new data modules; no CDN assets.

## New locations

| Stable ID | In-world name | Function |
|---|---|---|
| `dogspa` | Dog Groomer | Grooming appointment |
| `furniture` | Furniture Warehouse | Flat-pack pickup |
| `takeaway` | Takeaway | Dinner-order mini-game |
| `bakery` | The Bakery | Specific bread errand |
| `neighbour` | The Neighbour | Possible seeded bonus pickup |
| `chemist` | Chemist | Possible seeded bonus pickup |

**Preserved:** the original home, salon, spa, petrol, market, dry
cleaners, hardware and parcel-depot IDs and world coordinates. Their existing
missions and test fixtures remain valid.

## New Saturday errands

1. **THE DOG HAS AN APPOINTMENT:** the dog apparently books better than us.
2. **IT FITS IN THE CAR, TRUST ME:** furniture pickup, no measurements.
3. **BREAD. THE CORRECT KIND.:** return to the bakery yet again.
4. **WHATEVER YOU WANT FOR DINNER:** choose a takeaway and audit the order.

The existing **FINALLY GOING HOME** diversion now chooses one of four
destinations deterministically from the game seed: spa, parcel depot,
chemist, neighbour. The pre-existing choices for seeds 1988 and 1989 remain.

## Integration boundary with upstream VANILLAJS-25D-001

The upstream instance exclusively owns reusable projection, depth ordering,
asset conversion and general vehicle primitives. GFTA6 supplies **content
only**, with stable IDs and render-neutral coordinates.

Future downstream adapter requirements:

- `place.id` and `building.id` must remain stable and independent of camera.
- `building.height` is an **authoring hint**, not a physical displacement,
  a new collision rule or a validated 3D mesh dimension.
- `vehicleArt(profile).meshSlot` is a stable future lookup key; it is **not**
  a path to a model that currently exists. `modelPath === null` means draw
  the original Canvas fallback.
- Only a reviewed, exact-SHA upstream API may resolve those model slots.
  Absence of an asset must fall back to the local drawing.
- Switching renderer must not mutate the deterministic `snapshot(state)`.
- Do not import GPL racing-engine source code or unverified third-party assets.
- Asset licences, attribution and exact file hashes are required before
  making a third-party asset part of any distributable archive.
- Avoid reimplementing any upstream projection or converter in GFTA6.

## Acceptance checklist

- [ ] Node regression suite and asset checks pass on the PR's exact head.
- [ ] Original campaign remains completable, including the impossible boss.
- [ ] New locations are reachable by street, not obstructed by buildings.
- [ ] New takeaway mini-game requires valid answers and charges only once.
- [ ] Four seeded bonus destinations behave reproducibly.
- [ ] Vehicle profile changes graphics only through the owned presentation map.
- [ ] Offline reload works with the updated cache.
- [ ] Human driving/parking and mission play-through on local preview.
- [ ] Merge only after owner/Codex review, then Pages automatically deploys.

This patch intentionally does **not** implement traffic AI, GGBot model
conversion, Quaternius asset imports, full 2.5D projection or 3D physics.

**Politics is stupid. Parking is worse.**
