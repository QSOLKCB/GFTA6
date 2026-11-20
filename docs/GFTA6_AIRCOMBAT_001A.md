# GFTA6-AIRCOMBAT-001A — JUST A FRIEND SQUADRON™ (playable 2.5D)

**Scope:** Original, opt-in GFTA6 encounter after Operation Freedom Flight.
Built on merged GFTA6 PRs #9/#10 and VANILLAJS COCKPIT-002 PR #137.

## Controls and entry

Select **ACT IV: JUST A FRIEND SQUADRON™** at the start of Saturday. Earn
the existing courier fund, restore the aircraft and fly out of Suburbania.
Once the normal escape-flight win condition triggers, the game starts a
three-stage, deterministic, non-graphic squadron encounter instead of ending.

- **W/S and arrow up/down:** aim vertically in combat
- **A/D and arrow left/right:** turn the sight left/right
- **Space or the FIRE touch button:** physical gun-ray test with fixed cooldown
- **M or the MISSILE touch button:** one missile per press, physical target lock
- **P / Escape:** pause; restarting replays the same seed and opt-in choice

Ordinary Saturday and the original "forgot the milk" ending remain intact
when the checkbox is **unchecked**. This setting is explicit game state,
not a hidden change of the existing mission's outcome.

## Waves, victory and narrative

1. JUST A FRIEND™ — Derek's first interception.
2. THE GROUP CHAT SQUADRON™ — three named, visually distinct pursuing
   aircraft, each needing its own non-graphic disengagement.
3. TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!™ — Derek returns for the
   last embarrassing interception.

The waves are limited to five authored contacts. Seeded target motion is
bounded and deterministic, with rivals closing their relative range at a
fixed, capped rate. Every new wave resets its own approach clock. This is
an authored chase sequence, not an autonomous air-combat AI or aerodynamic
flight model. Once all contacts disengage, the encounter is
sealed with the canonical, owner-locked dialogue from
`docs/GFTA6_AIRCOMBAT_001.md`. Its text is compared verbatim in CI.

Aircraft colours distinguish *liveries*, not the skin tones or ethnicity of
the fictional pilots. No human figures, photographs or third-party game
artwork are bundled.

## Exact upstream dependencies

The following files are copied **unmodified**, under Apache-2.0, from
`QSOLKCB/VANILLAJS` at merged COCKPIT-002 commit
`ae0b594f006ec3c1add71574c830ddde9ff5fa66`:

| Original | GFTA6 offline vendor path | Git blob SHA |
|---|---|---|
| `modules/math/index.js` | `vendor/vanillajs/math/index.js` | `45e5fc4d6c6daa472a89fa59c80e6fd70b2c1455` |
| `modules/cockpit-rig/index.js` | `vendor/vanillajs/cockpit-rig/index.js` | `74010bb24625900e6eeb812c3064bda09d9898cb` |
| `demos/cockpit-physics-lab/missiles.js` | `vendor/vanillajs/missiles.js` | `86094c7c0bf7d33ac962919b62eac7a72a68926d` |

The `NOTICE` identifies all source files and the offline verifier checks
their exact Git blob hashes. The previous `motion2d` and `projection25d`
pins are unchanged.

`src/aircombat.js` is original GFTA6 game authority. Its simplified,
bounded encounter pose uses world +Y, body -Z forward, normalized quaternion
orientation and explicitly authored target coordinates. It **is not**
the airframe's 6DOF aerodynamic body: no dependency on aviation calibration
or a hidden conversion from GFTA6's old 2D car.

The cockpit rig determines gun muzzle rays and sight projection. The
missile rack determines boresight lock, wing-launch positions, 120Hz homing,
swept-sphere hit events, ammo and cooldowns. GFTA6 advances the rack in
**exactly two 1/120-second steps for each 1/60-second game tick**. Only one
missile is active, and the GFTA6 encounter now stores the exact launch-time
opponent ID until that missile resolves. If gunfire disengages that rival
before the missile hits/expires, homing continues against the original
target instead of crashing or transferring to a new enemy. This is a
game-owned correctness receipt; the upstream rack and weapon tuning are
unchanged.

The rendered sprite's location never determines hits: it is projected
from the same read-only 3D encounter target as the upstream gun/rack code.
The separate `src/aircombat-view.js` draws an original 2.5D cockpit sky,
rival craft, source-aligned sight and comic radio.

## Determinism and acceptance gates

- No wall clock or `Math.random` in combat authority.
- Stable seed-derived target offsets, strict input/range validation,
  bounded tick horizon, immutable enemy/wave receipts and one-time win state.
- Disabled mode preserves the original exact flight outcome.
- Activated mode preserves mainline mission index, cargo, 2D car position,
  finances and original fixed-tick movement semantics.
- Invalid missile lock cannot spend ammo; holding M cannot create repeated
  shots without a physical key release. Gun hits use actual muzzle rays.
- Winning is possible without missile ammo, via the correctly aligned guns.
- The complete, author-approved ending is verified against the canonical
  Markdown record, including punctuation and spacing.
- No WebGL, Node/NPM runtime, internet request or licensed car model is
  required. Source-hosted Pages and offline precache include every import.
- Run `node --test tests/*.test.js` and
  `node scripts/check-assets.mjs`; then record human browser acceptance
  for cockpit alignment, desktop/mobile controls, pacing, full normal
  campaign, failure recovery and post-merge offline operation.

**Deliberate limit:** This PR is the playable 2.5D combat and upstream
sight/missile *integration*, not adoption of the experimental
VANILLAJS `modules/airframe` simulation. Real aerodynamics, AI defensive
maneuvers and a full 3D aircraft view need separate source-pinned PRs with
replay, numerical and performance evidence.

Do **not** merge before green exact-head CI, Codex review and owner sign-off.
