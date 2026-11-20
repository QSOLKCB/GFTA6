# GFTA6-MODES-001 — TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!™

**Status:** Standalone arcade mode, review-stage PR. The canonical hard
Saturday campaign and optional post-escape ACT IV remain unchanged.

## Why this exists

Operation Freedom Flight requires its existing, difficult progression:
domestic errands, side deliveries, a separate secret fund, four aircraft
restoration milestones and a successful 2.5D takeoff. The owner explicitly
wants **no shortcuts, difficulty reductions, free money, restored aircraft,
or skip buttons added to that campaign**.

The standalone mode instead lets a player practice and enjoy the merged
VANILLAJS cockpit/missile encounter without requiring completion of that
difficult campaign.

## Player flow

The existing introduction has **two independent launch actions**:

1. **START SATURDAY** — the same existing seed, vehicle, missions,
   household currency and optional ACT IV checkbox. No progression change.
2. **TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!™** — start a separate
   arcade session directly in the first wave of JUST A FRIEND SQUADRON™.

The standalone action reads the selected seed and vehicle for familiar
interface continuity. It invokes the existing deterministic combat
constructor with the same three waves and original combat limits; no
special easier enemies or altered weapons are introduced.

**Controls:** W/S or up/down to aim vertically, A/D or left/right for
horizontal sight alignment, Space for physical gun-ray tests, M for the
approved missile rack, P/Escape to pause. Touch gun/missile controls
remain available. Replay restarts the **same standalone mode and seed**,
never silently sends the player back to Saturday.

All standard victory, final dialog, physical sight and missile-lock rules
are the exact same as the existing optional ACT IV.

## Architecture and invariants

- `src/core.js` adds a distinct `createDogfightGame(seed, profile)` factory,
  which delegates to `createGame` and initialises the existing
  `createAirCombat(seed)` encounter. The ordinary `createGame` function,
  missions and escape rules are not modified.
- Only the direct-launch state carries `gameMode: 'dogfight'`. The snapshot
  identifies normal Saturday sessions as `gameMode: 'saturday'`.
- No fictional earnings, cargo deliveries, restored parts or 2.5D flight
  receipts are forged. The ordinary core remains at its initial values.
- `src/app.js` provides two explicit entry buttons and mode-preserving
  Replay. HUD displays actual combat waves instead of a misleading errand
  count; ordinary household gauges are hidden in standalone sessions.
- `src/navigation.js` suppresses city directions once an encounter is
  active. No new navigation authority, collision, camera or physics path.
- 60 Hz game tick, 120 Hz upstream missile substeps, physical muzzle-ray
  hits, target locking and all five authored opponents are unchanged.
- The exact canon in `docs/GFTA6_AIRCOMBAT_001.md` remains untouched.
- Offline-first HTML/CSS/browser JavaScript only. No npm install, new
  third-party assets, telemetry or cloud runtime dependency.

## Upstream source baseline

GFTA6 retains the existing unchanged, offline VANILLAJS sources pinned to
COCKPIT-002 merge `ae0b594f006ec3c1add71574c830ddde9ff5fa66`.
VANILLAJS #138 (`HORIZON-ACCEPTANCE-001`) fixes a browser acceptance
test and #139 (`OSS-GAME-REUSE-001`) adds a reuse roadmap. Neither
provides a new required cockpit or missile interface for this mode.
No upstream files are recopying or repinned as part of this PR.

## Acceptance checklist

- Main Saturday game factory, vehicle handling, errands, cargo, economy,
  airfield funding and optional ACT IV sequence remain unchanged.
- Standalone begins wave 1 at game tick 0 without completing any errand.
- No hangar purchase/flight/economy bypass can contaminate Saturday mode.
- Fixed seed+controls give the same exact physical target/missile receipts.
- Pause/resume cannot advance the combat simulation.
- Replay regenerates the direct mode at the same seed and vehicle.
- All three waves are completable in standalone mode and trigger the
  canonical MISSION ACCOMPLISHED dialogue exactly once.
- Both Classic and Raised settings remain safe; standalone is rendered
  through the existing combat presentation and does not change game state.
- Offline shell and all source pins verify green on the exact PR head.
- Owner play-through checks the launch buttons, keyboard/touch inputs,
  replay, pause, mobile landing layout and the unchanged difficult
  Saturday campaign. Do not claim FPS performance without actual hardware
  measurements.

**Release gate:** Codex review, exact-head green CI and owner approval
before merging. Pages deploys only from reviewed main.
