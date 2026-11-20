# GFTA6 — Original 2.5D Driving Research Notes

## Scope and licensing boundary

**Reference studied:** ZgzInfinity/Multi-Race-Driving (public GitHub project),
GNU General Public License v3.0, C++/SFML platform.

**GFTA6:** Apache License 2.0; browser-native VANILLAJS / Canvas.

Multi-Race-Driving is an **external example of capabilities and user
experience**, *not* a source donor. In particular:

- Do not copy or port its source code, algorithms, constants, headers, data
  files, vehicle definitions, textures, soundtracks, or arrangement of modules.
- No GPL-derived code or assets are distributed in GFTA6.
- GPLv3 licence terms do not disappear by rewriting C++ source in JavaScript.
- A general mechanic (accelerate, steer, brake, collide) or rendering approach
  (2.5D perspective and depth cueing) is a design goal, not the copying of a
  specific source implementation.

We independently implemented a deterministic browser-driving controller with
integer Q12 vectors, our own arcade parameters and vehicle profiles. The
existing pinned Apache-2.0 VANILLAJS `motion2d` module supplies the 16
validated heading vectors and body representation; see the repository NOTICE.
No new production dependency is introduced.

## Implemented: steering and vehicle model

The prior GFTA6 controller made a 1/64-turn heading change only at selected
simulation ticks, so the hatchback's turn-in was unresponsive and visibly
stepped. The new controller keeps speed and steering separate but:

1. Represents heading with 1024 integer units per full turn.
2. Interpolates the pinned 16 Q12 direction vectors on each step.
3. Updates heading on every moving 60 Hz simulation tick while steering is held.
4. Uses different turn rates by speed; reverses steering yaw while backing up.
5. Retains longitudinal acceleration, coasting and service brakes.
6. Preserves the 64-step API for existing callers and tests.
7. Keeps collision geometry in the flat authoritative world.
8. Exposes three **original** vehicle handling profiles (hatchback, coupe,
   van) in the start menu with distinct steering and acceleration.
9. Encodes profile and fine heading in game snapshots for replay evidence.

These arcade constants are GFTA6-specific tuning decisions, not measurements
or values attributed to any external racing program.

## Next: our own 2.5D implementation

Create a separate renderer that consumes **the same** vehicle position,
heading, mission markers and building footprints as the classic top-down one.

- Original orthographic/oblique projection, optional follow-camera and zoom.
- Height attached to building/prop records, without changing 2D collision.
- Extruded roofs and façades, depth ordering and shadowing from geometry.
- Original low-poly vehicle silhouettes (not sprites from another project).
- Road markings, scenery occlusion and transparent mission markers.
- Measured frame pacing and visual regression screenshots.
- Controlled comparison with existing top-down gameplay; disable 2.5D if it
  makes parking, turning or objectives harder to read.
- Retain original game logic and deterministic replay across all renderers.

**Not implemented in this steering patch:** multiplayer racing, AI traffic,
full pseudo-3D horizon projection, a replacement 3D engine, new race modes,
third-party art or audio.

## Validation requirements

- Regression checks for forward/reverse transition, brake, collision, moving
  turn-in every tick, angle continuity, and profile differences.
- Keyboard focus and repeat behaviour, including select navigation.
- Same seed + profile + accepted input sequence => same snapshot.
- Manual browser acceptance for how turning actually *feels*.
- Only deploy to Pages after reviewed merge to main.

The external GPL project remains a credited *reference*, not a bundled
component. Independent GFTA6 implementation stays Apache-2.0.
