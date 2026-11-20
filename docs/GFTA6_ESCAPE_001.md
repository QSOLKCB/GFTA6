# GFTA6-ESCAPE-001 — Operation Freedom Flight™

**Status:** Optional campaign, provisional 2.5D game skeleton.

## Purpose

Turn the domestic Saturday comedy into a long-term alternate ending:
scrape together a secret escape fund through courier side jobs, restore a
retired fictional Spitfire-inspired warbird at the Old Airfield, and fly
away from Suburbania. Naturally, the last message is **"YOU FORGOT THE MILK."**

This is an in-game parody mission, not relationship advice, real aircraft
training, an airworthy Spitfire simulation, or a flight checklist.

## Architecture and dependencies

- `src/escape.js`: Pure, frozen, seed-bound funding/repair/flight state with
  format `gfta6.escape.v1`; **no DOM, I/O, wall clock or aircraft assets**.
- `src/core.js`: Game-specific input and parked-distance gates plus optional
  fixed-tick alternate flight completion. Vehicle, cargo and regular mission
  functions remain independent.
- `src/flight-view.js`: Original Canvas pseudo-2.5D runway/horizon, hills,
  a stylised overhead fighter and HUD. No third-party mesh or texture.
- `src/world.js`: One airfield destination and one hangar footprint using the
  existing city authoring format; the upstream VANILLAJS projection renders the
  hangar in raised mode with the other buildings.
- `src/app.js`: G/U/F inputs and click buttons; game HUD includes secret fund,
  current gig destination, restoration status and flight progress.
- `sw.js`: New static resources pre-cached offline. No NPM packages or CDN.

### Strict boundary with VANILLAJS

**GFTA6 does not implement shared flight primitives or replace upstream
VANILLAJS-25D-001.** The `src/escape.js` flight envelope is an explicitly
provisional, GFTA6-specific **arcade mission state**, not an aerodynamic
or physical simulation.

VANILLAJS COCKPIT-001 PR #136 is now merged at
`0bfe21979a42365345c6690b9a8f28758dcfae50`. The experimental
`modules/cockpit-rig` and `modules/airframe` APIs use physical SI pose and
flight contracts, whereas this GFTA6 mission uses intentionally simplified
arcade progress. A **separate, independently reviewed adapter** may bridge
the two, preserving the secret fund, restoration receipts, locations,
completion semantics, and ordinary car/cargo physics. No source from the
Cockpit Lab is imported in the current escape skeleton.

## The secret courier economy

The player visits **PARCEL DEPOT** and presses **G / PAID JOB** to collect a
seeded delivery to Chemist, Bakery, Dog Groomer or the Neighbour. Drive to the
real destination, stop, press G again and receive the payment into a **separate
secret fund**. The household bank balance is not silently changed.

The destination and payout for job N derive only from game seed and N.
A new job cannot be claimed until the previous one is delivered; delivering
at the wrong destination yields nothing. Every receipt is immutable.

The prototype restoration budget is **$1,150.00**, deliberately scaled so
the skeleton can be play-tested without hundreds of courier repetitions.
The prices are **fictional gameplay credits**, not estimates of actual
aircraft acquisition/restoration or flight operations.

| Restoration stage | Cost |
|---|---:|
| Retired warbird airframe | $450 |
| Engine repair | $350 |
| Cockpit controls | $200 |
| Fuel and departure | $150 |

At **OLD AIRFIELD**, press **U / REPAIR** to purchase the next stage once the
secret fund contains enough. Purchases are one-way and cannot duplicate a
component. The story can be completed before the ordinary final boss; the two
campaign outcomes deliberately remain separate.

## Flight controls and win condition

At the Old Airfield, park and press **F / FLY** after all four upgrades.
The same fixed 60 Hz update now advances only the separate flight scene.
The player's authoritative car coordinates are frozen during that scene.

- **W** increases fictional airspeed.
- **S** slows the aircraft.
- **Space** triggers takeoff at at least 78 arcade speed units and raises
  altitude while held.
- **A / D** changes the stylised bank; sideways drift is bounded.
- Reach at least 160 m indicated altitude and 2,600 m displayed distance,
  with sufficient speed and controlled bank/lateral offset to escape.
- A failed flight can be retried with **F** from the airfield at no extra
  restoration cost. The player's normal mission/cargo remains unchanged.

The drawn numbers are arcade indicators, **not calibrated knots, true
airspeed or flight dynamics**. Nothing here should be described as a real
Spitfire cockpit or handling reference.

## Acceptance gates

1. All existing mission, parking, cargo, VANILLAJS projection and keyboard
   regression tests pass.
2. Deterministic courier work requires actual two-place travel and no payout
   can be claimed twice for the same delivery.
3. Restoration cannot buy more than four parts or spend unavailable funds.
4. Alternate ending reachable by hatchback, coupe and shopping van.
5. Flight fail/retry and successful ending preserve car/cargo/regular mission
   state and freeze the completed record.
6. Airfield hangar uses the existing raised 2.5D projection in the city.
7. Headless Canvas smoke test confirms flight drawing is state-independent.
8. Offline cache includes the escape and flight-view sources; no third-party
   artworks, network calls, GPL racing code or cloud dependencies.
9. Actual browser acceptance checks driving, launch, visual alignment,
   cockpit overlay, keyboard/touch controls and screen-size readability.
10. Exact-head CI and Codex approval, followed by owner merge. Pages deploys
    **only** once the branch is merged to main.

**YOU HAVE ESCAPED THE ERRANDS. THE ERRANDS HAVE NOT ESCAPED YOU.**
