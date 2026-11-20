# GFTA6-CAR25D-001 / ENGINE-001 — THE ENGINE HAS HAD ENOUGH™

**Stage:** GFTA6 main Saturday gameplay, opt-in raised-car rendering and SFX-controlled engine.
**Dependencies:** none new. Apache-2.0 original GFTA6 presentation code.

## Geometry contract

`src/car-25d.js` renders an original extruded vehicle in local 2D XY with
a separate visual Z lift. It uses the current **authoritative**
`state.body`, 0–1023 fine heading and selected `vehicleArt` skin.
The projection applies yaw to the ground footprint, then a **screen-fixed**
height lift to side walls, roof and windows. It does not rotate gravity with
the car. The roof proportions distinguish hatchback, coupe and shopping van.

The new car uses a small, bounded set of Canvas2D polygons: four wheels,
four side body faces, a body roof, four raised-glass faces, a cabin top,
two front lamps, two rear lamps and a ground shadow. Original city-building
painter ordering remains authoritative for occlusion, so raised scenery can
paint over the car when its depth key is in front. No hitboxes, vehicle
physics, world coordinates, mission state, camera rules or upstream sources
are modified. Classic 2D rendering remains an exact legacy fallback.

## Speech-motor contract

`src/frustration-engine.js` generates **115,200 stereo frames at 48 kHz**
(2.4 seconds) of original PCM. Each of four repeated synthetic bursts uses:

1. **F:** seeded xorshift fricative noise.
2. **UH:** pitched synthetic throat harmonics and crude vowel formants.
3. **K:** short noise closure/release.
4. **Motor:** continuous piston-like low drone.

This is a robotic, comic **approximation of a voice**. It does not call
`speechSynthesis`, use an external model, fetch data, record a real voice,
or claim phonetic intelligibility comparable to actual speech. It repeats
the intentional profanity rhythm the player requested.

The pure `engineFeedback(state, controls)` adapter maps integer vehicle
speed and throttle to bounded volume, playback rate, estimated RPM, gear and
a HUD subtitle. No wall clock, audio context or mutation exists in this
adapter. The existing `src/audio-player.js` Web Audio adapter starts one
looping PCM buffer **only after user activation**. Each tick may adjust
its playback rate and gain without constructing a new source. SFX OFF,
pause, hidden tab, mini-game, game over, aircraft escape, and either combat
mode stop the engine source. A fresh drive re-arms it. `MUSIC` remains
independent, and combat sound effects keep their old behaviour.

The engine is a **presentation side effect**: no sound data, random PRNG
state, playback phase, user audio preference or floating-point audio
calculation enters fixed-tick state, replay, save, movement, collision,
economy, mission outcomes, or the original source-pinned VANILLAJS modules.

## Human testing

- Start Saturday, leave Classic 2D selected, drive and confirm no rendering regression.
- Switch to **VIEW: RAISED 2.5D**: rotate all three vehicles around buildings.
  Confirm car walls, windows, roof, wheels and building occlusion.
- With SFX ON, accelerate, cruise, reverse and idle: the engine should audibly
  rev and rhythmically utter a **robotic profanity-like** pulse.
- Toggle SFX OFF/ON, pause/resume, lose tab focus and enter a mini-game:
  the engine must silence or restore appropriately. MUSIC remains independent.
- Start either dogfight or Advanced Air War and start flight from Saturday:
  the engine must not leak into aircraft audio.
- Test narrow viewport, phone touch controls, offline reload and speakers at
  modest volume. Check frame time on the owner's native 60 FPS baseline.

## Reproducible local gates

```sh
node --test tests/car25d-engine.test.js tests/projection25d-integration.test.js tests/chip-soundtrack.test.js
node --test tests/*.test.js
node scripts/check-assets.mjs
node scripts/browser-chromium-smoke.mjs
```

Browser acceptance is run in GitHub Actions using real Chromium; it requires
the repository CI browser environment. Engine PCM generation is CPU-bound
once per AudioContext and kept outside the per-frame drawing loop.

**Non-claims:** this is not an actual 3D CAD car, a physical drivetrain
simulation, a human-quality text-to-speech engine, or a native FPS benchmark.
