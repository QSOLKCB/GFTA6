# GFTA6-AIRWAR-001 — Advanced Air War, Native Forge and Sealed World

**Status:** Review PR #18. Opt-in third game mode, not a replacement for the
hard Saturday campaign or the established TOO CLOSE FOR GUNS™ arcade.

## Precise source baseline

All five user-accepted VANILLAJS engine milestones are **merged**, and
GFTA6 includes their **unmodified exact source** from merge commit:

`e9121ea7297b0aeca1da131b695e7c3371a98745`

| System | Engine module | What GFTA6 actually consumes |
|---|---|---|
| CAD-003 / Geometry Forge | `cad-geometry` | Creates native bounded wedge, tower and platform meshes. |
| WORLD-VIS-001 | `world-vis` | Owns static LitRenderer-compatible mesh snapshots, conservative camera culling and whole-original-triangle LOD selection. |
| TACTICS-001 | `tactics` | Real SENSE-001 visibility, navigation, physical AABB cover and opposing squad decisions for a bounded **formation-planning plane**. |
| TRAJECTORY-001 | `trajectory` | SENSE-checked opposing launch, lead solver, 120 Hz fixed-tick guidance and swept actor-contact evidence. |
| CREATOR-INTEROP-001 | `creator-interop` | Native strict scene/asset/placement/zone project; individual asset and whole-package SHA-256 seals; offline import/export. |

Additional exact upstream dependencies, also **unchanged**, are
`geometry`, `render-lit`, `sensing`, `navigation`,
`scene-graph`, `lead-solver`, and `collision`.
Their individual exact Git blob SHA-1 receipts appear in `NOTICE` and
are independently checked in `scripts/check-assets.mjs`.

The already-vendored `math`, `cockpit-rig`, `missiles`,
`projection25d`, `motion2d`, and `chip-audio` pins are unchanged.
CAD-003's DabbleCAD-derived surface-method provenance is preserved in
the original upstream source and attributed in `NOTICE`.
An asset hash does not certify authorship or legal permission.

## Playable integration

A separate intro button launches
**ADVANCED AIR WAR — THE GROUP CHAT STRIKES BACK™**.

The baseline `createAirWarCombat(seed)` starts the exact existing
six-wave GFTA6 squadron, with its 14 authored contacts, the three-phase
THE FINAL WORD™ boss, existing gun-ray tests, sustained 48-tick lock,
physical missile rack, limited ammunition, soundtrack and owner-locked
ending. The mode extends (not replaces) this with real engine decisions.

### CAD content and World Foundry

Original Geometry Forge wedges, hexagonal relay towers and platforms
are wrapped as **validated, indexed Creator mesh assets** and placements.
The same original CAD wing mesh draws **live advanced-mode aircraft**
relative to their actual authoritative centre and camera. Original
2.5D silhouettes remain intact in classic dogfight mode.

The static props are converted to exact XYZ/normal/RGB/UV LitRenderer
mesh layouts, snapshotted by WORLD-VIS and selected using its actual
multi-plane conservative frustum/LOD contract. The GFTA6 Canvas2D
renderer draws only the selected whole-triangle batches under a hard
**320-triangle/frame cap**. It is a **Canvas2D presentation adapter**,
not the `RetainedLitWorld` WebGL GPU-handle manager. We do **not**
claim GPU buffer residency or full WebGL renderer adoption.

The original **EXPORT AIRWAR WORLD** action produces an offline
`qsol.vanillajs.creator-package.v1` JSON artifact, using standard
Web Crypto SHA-256. **IMPORT AIRWAR WORLD** accepts bounded 256 KiB
files, verifies all asset and package integrity receipts via the
actual upstream `openCreatorPackage` and validates render admission
*before* replacing any existing scene. A bad file leaves the existing
world intact. An imported project's scenery is **presentation-only**:
it cannot spawn a real enemy, supply physical cover in GFTA6 combat,
change HP, override weapons or change victory criteria.
The full project format remains explicitly experimental.

### Tactical squad intelligence

The actual TACTICS engine runs a small, bounded aerial
formation-planning projection for each wave with one alpha observation
pilot and the real authored bravo squad IDs. The projection uses
a physical named cloudbank AABB and the engine's SENSE-indexed LOS and
NavigationGrid planner. Every **60 fixed game ticks**, a derived
finite opposing order set shifts lateral/depth offsets for rivals.

The resulting target world positions feed **the existing authoritative
GFTA6 gun, physical missile and lock-acquisition tests**, and are
also used for visible geometry and target outlines. This is a real
behaviour change—not merely a new HUD label. Order proposals do not
invent damage or bypass geometry. Enemy actors never teleport or change
collision authority in the hard Saturday driving game.

The TACTICS module is fundamentally a **discrete 2D cover/navigation
engine**, not a certified aerodynamic aerial squad planner. This
adaptation uses it only for game-policy formation lanes and explicitly
does not pretend that ground cover cells represent full 3D manoeuvres.

### Physically checked interceptors

Opponents may launch separate TRAJECTORY-001 simulated interceptors.
The module checks source actor IDs, origin and SENSE line of sight,
advances **two exact 1/120-second steps per 1/60-second GFTA6 tick**,
and reports lead-guided wall/actor swept contacts.
Their actual source-derived shot positions and contact receipts are
drawn in Canvas2D, and the HUD shows verified contact counts.

**Safety and correctness boundary:** GFTA6's player is not yet a
6DOF translating aircraft. The trajectory world's launch-time pilot
actor is therefore a bounded **stationary approximation**. A swept
contact is a validated telemetry/visual event, **not authoritative
player damage**. Without a live translated actor and a reviewed
dynamic-target authority, applying those contacts directly to the
player's hull would introduce phantom/unavoidable hits.
Existing THE FINAL WORD™ telegraphed attack and player hull rules remain
the only boss damage authority. No missile rack is duplicated or
replaced, and TRAJECTORY does not consume ammunition.

## Determinism and performance

- Seed and controls drive fixed-tick GFTA6 authority; no ambient RNG,
  current time or network calls in any game simulation update.
- Tactical turns are reconstructed from a finite initial source and
  bounded to 16 accepted turns per wave, making replay inspectable.
- A tactical stage transition resets formation offsets and interceptor
  ownership. Original weapon rules and finale are unmodified.
- WORLD-VIS selections never affect player collision, SENSE,
  static source mesh bytes, target durability or damage.
- Exact source-integrity checks fail on any vendor byte change.
- Offline service worker cache `gfta6-static-v0.3.0` includes every
  new and pre-existing ES module in the static import graph.
- The existing real headless Chromium runs launch, keyboard, Canvas,
  source-backed SFX, mobile and offline checks. Advanced-mode browser
  acceptance verifies a real intro click, retained scene painting,
  actual TACTICS orders and sealed CREATOR package without test-only
  game-state injection.
- The acceptance evidence is **not** a measured 60-FPS native GPU
  claim. Owner-device frame pacing and a human full-campaign playthrough
  remain explicit sign-off gates.

## Testing and release

```sh
node --test tests/*.test.js
node scripts/check-assets.mjs
CHROME_BIN=google-chrome node scripts/browser-chromium-smoke.mjs
```

Human acceptance: launch all **three** modes, verify no changes to hard
Saturday, watch TACTICS formation movement, inspect the different
CAD aircraft and world-LOD presentation, exercise physical gun/missile
controls, download and reimport the sealed World Foundry project,
try a corrupted package, run offline, and inspect the unchanged finale.

**Do not merge until CI green, independent Codex exact-head review, owner
playthrough and explicit owner approval.**
