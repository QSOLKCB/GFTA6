# GFTA6-ERRANDS-003 — The Errand Economy™

**Status:** PR #6 candidate / downstream GFTA6 gameplay only.

## Scope

Create a meaningful cargo-and-delivery loop around Suburbania without
replacing the existing fixed-tick car controller, introducing traffic AI,
or duplicating VANILLAJS-25D-001's reusable projection/asset tooling.

## Gameplay

- **Shopping:** Finish the existing grocery selection mini-game, load the
  shopping into the boot, then drive it home for delivery.
- **Parcels:** Collect two labelled parcels at the parcel depot and deliver
  them to the neighbour.
- **Furniture:** Collect three separate flat-pack pieces at the furniture
  warehouse and deliver everything home, including the impossible screws.
- **Boot space:** Hatchback (9 slots), Coupe (5 slots), Shopping Van (15 slots).
  Cargo items have authored sizes and stable IDs.
- **Capacity-limited reroutes:** When a load does not fit, the system
  deterministically packs the next available items, inserts a return trip
  into the mission queue after the current delivery, and carries on. There is
  no random item loss, unprompted freight discard, or impossible item size.
- **Cargo dashboard:** Show remaining stock, loaded items, used boot slots
  and completed transport trips.

### Authored delivery manifests

| Manifest | Pickup | Drop-off | Items | Total size |
|---|---|---|---|---:|
| Shopping | Supermarket | Home | Milk, groceries, ice cream | 8 |
| Neighbour parcel | Parcel depot | Neighbour | Mystery parcels A and B | 5 |
| Wardrobe | Furniture warehouse | Home | Two boxes and screws | 8 |

The Coupe intentionally needs two trips for shopping and furniture. Both
other vehicles carry each manifest in one run. The engine's physics and
collision rules do not change with cargo: this first slice makes cargo
a **gameplay constraint**, not an unvalidated mass/weight simulation.

## Correctness and replay invariants

1. No item is duplicated, lost or implicitly discarded.
2. An item cannot be delivered unless previously collected.
3. Total used slots cannot exceed vehicle capacity.
4. A full boot cannot magically load another batch.
5. Reroute tasks are inserted deterministically with stable IDs.
6. The original return-home ambush triggers at most once.
7. Both initial world locations and car handling remain unchanged.
8. Mini-games and paused states cannot bypass the delivery steps.
9. `snapshot(state)` includes cargo and completed delivery receipts.
10. Offline caching includes the GFTA6-owned `src/cargo.js` module.

## Upstream separation

- **OPT:** measurements and optimisation only, in another workstream.
- **VANILLAJS:** general projection, asset conversion and reusable engine
  primitives, under the upstream VANILLAJS-25D-001 PR (currently unmerged).
- **GFTA6:** story, missions, cargo sizes, boot capacities, UI, game-specific
  presentation mappings and comedy dialogue.

No upstream VANILLAJS code has been changed. No GPLv2/v3 racing source, 3D
meshes, third-party sprites or remote runtime dependencies are incorporated.
The pure GFTA6 cargo rules remain Apache-2.0.

## Manual acceptance after CI

- Load shopping, transport it home and complete the delivery.
- Select the Coupe: verify second trips for shopping and furniture.
- Check the hatchback and van can complete each manifest in one trip.
- Try delivering at the wrong location and while moving too fast.
- Pause during a delivery and ensure controls and mission state remain safe.
- Complete the full Saturday and reach the original impossible final boss.
- Reload offline after the new service-worker version activates.
- Review Codex feedback, perform a real browser play-through and obtain owner
  sign-off **before** merging or publishing to GitHub Pages.

**No free weekends were added by this patch.**
