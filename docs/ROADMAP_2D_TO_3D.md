# GFTA6 — Classic Arcade → 2.5D → Full 3D

**Design direction:** make the whole game fun in the classic top-down format first.
Then add depth with 2.5D presentation. Replace the renderer with full 3D
*only after* missions, vehicles, controls and collision are proven.

**Core principle:** do not tie the simulation to the current view.

## Permanent contracts

- Gameplay state and fixed-step rules remain independent of Canvas, WebGL, DOM,
  audio and wall clock. A controller cannot mutate world objects behind the rules.
- Keep integer coordinates for the authoritative vehicle/world state and one
  fixed 60 Hz game tick. Rendering is permitted to interpolate for presentation.
- Inputs, seed and accepted mission events must be sufficient for deterministic
  local replay in future versions. Serialize explicit versions when saves arrive.
- World locations have stable IDs, 2D footprints and optional height. Gameplay
  uses world coordinates; screen projection is a renderer concern.
- The pinned VANILLAJS module is a vendored, attributed runtime component,
  not an HTTP/CDN dependency.
- No forced online accounts, advertising, telemetry, heavy frameworks or cloud
  services. Preserve a static, playable, offline-capable build.
- Apache-2.0 source plus notices for any imported assets/code; no Rockstar media.
- Don't claim 60 FPS without reproducible measurements on a stated target device.

## Milestones

### A. v0.1.x — Classic top-down, correctness first

- [x] First playable Saturday, city map, interactions and household mini-games.
- [x] Seeded mission diversion, final impossible task and browser offline cache.
- [x] GitHub Pages release workflow with CI gating.
- [x] Smooth car handling iteration: quarter-step headings (64 per turn),
      signed longitudinal speed, brake-to-reverse and independent service brake.
- [x] Correct multi-key handling and no held acceleration through a mini-game.
- [x] Small nonphysical roof/facade shading pass to establish a depth vocabulary.
- [ ] Hands-on acceptance of turn-in, stopping distance, wall collisions,
      reverse steering, keyboard/touch controls and all nine mission stages.
- [ ] Add optional handling presets/settings only after hands-on testing.
- [ ] Static obstruction and swept collision acceptance for higher velocities.
- [ ] Explicit 60 FPS capture receipts on desktop and lower-power hardware.
- [ ] Save/restart contract with format version, checksums and corrupt-save tests.

**Exit gate:** a player can finish an entire Saturday without camera confusion,
unfair parking interactions, involuntary sliding or a network connection after
initial cache installation. All CI tests pass.

### B. v0.2.x — 2.5D visual production

- Keep the familiar GTA 1/2-inspired overhead playfield.
- Give buildings explicit footprint/height/roof data and render shaded extrusions
  from an orthographic/isometric-leaning projection.
- Add original low-poly parked cars, moving vehicles, props and facades.
- Depth-sort scenery and vehicles where they overlap, with consistent shadows,
  occlusion and collision that still use the original 2D world coordinates.
- Layered *non-colliding atmospheric* traffic and NPC pedestrians with predictable
  dialogue and sensible pause/visibility semantics. These actors are scenery,
  not simulated hazards, by explicit owner design.
- Separate authoritative collision geometry from render-only mesh geometry.
  Keep car/building collisions as authored; do not introduce NPC contact.
- Do not let a polygonal roof change where the player's car can physically drive.
- Preserve keyboard/touch accessibility, offline installation and stable FPS.

**Exit gate:** no changes to mission outcomes or seeded replays when graphics
quality, camera angle or scenery density changes. Visual tests and performance
receipts compare the new renderer against the classic baseline.

### C. v0.3.x — Whole-game 2.5D polish

- Expand suburb into a connected district with errands, parking and traffic.
- More mini-games and actual in-world household interactions.
- Camera follow, zoom, alternate framing and readability at intersections.
- Creator-friendly mission/location definitions and low-poly asset pipeline.
- Complete a full campaign and player quality pass *before* renderer migration.

### D. Future — Real full 3D

- Export/derive a 3D scene from the same authoritative location IDs and 2D
  collision footprints, now with declared heights, entrances and ground levels.
- Use VANILLAJS renderer/engine primitives and existing proven project modules
  rather than adding an unrelated 3D framework by default.
- Optional 3D driving camera, animated pedestrians and richer environment.
- No automatic redefinition of mission predicates by physics or perspective.
- Performance/controls must beat the agreed baseline; otherwise retain 2.5D
  as the default, not a fallback embarrassment.

## Handling acceptance checklist

1. Accelerate along a straight road: speed rises smoothly and is bounded.
2. Release throttle: car coasts to zero without drifting sideways.
3. Hold Space: service brake stops sooner than coasting.
4. Press reverse at speed: the car brakes to a stop *before* reversing.
5. Steering while parked does not spin in place; while reversing, steering
   changes yaw in the opposite direction.
6. Holding A/D around corners aligns travel with car orientation, without
   independent x/y accumulated velocities.
7. Collision with walls/blocks does not penetrate geometry or explode speed.
8. Parking requires being near the actual target and moving slowly.
9. W+ArrowUp are independent physical keys; releasing one does not cancel
   the other. Losing focus or entering a mini-game releases held controls.
10. Same seed and input trace produce the same complete gameplay snapshot.
11. Offline reloading replaces old cached scripts after the new cache activates.

## Explicit release-candidate boundary (v0.2.0)

- Preserve the exact accepted player-car F-UH-K idle PCM source. Regression
  tests pin the original source blob until an owner approves a change.
- Keep the 12 moving street cast actors visual/audio-only forever unless the
  owner **explicitly** revisits that design choice. Their presence must never
  imply pedestrian collision or punishment.
- Support independently mutable SFX, music and NPC voice presentation with
  subtitles remaining available when NPC audio is muted.
- Require deterministic test parity, offline asset pins, real Chromium
  smoke and manual driving/audio/frame-time acceptance before tagging.

## Release discipline

- Keep gameplay and art changes small and reviewable.
- Tests before merge, with exact head SHA and actual CI status recorded.
- Browser smoke/play-through and manual sign-off for driving feel.
- Deploy from `main` only, using the Pages workflow and an isolated
  `_site` artifact. Do not auto-deploy unreviewed branches.
- Preserve previous releases and recorded regressions when tuning.

**No politics. No grindy dependencies. No free Saturdays.**
