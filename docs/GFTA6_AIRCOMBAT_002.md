# GFTA6-AIRCOMBAT-002 — THE FINAL WORD™ / Expanded Squadron

**Status:** Review-stage playable expansion for both the standalone
**TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!™** mode and the optional
post-escape ACT IV. The difficult Saturday campaign and secret flight fund
are unchanged.

## Expanded six-wave encounter

| Wave | Name | Contacts | Special feature |
|---|---|---:|---|
| 1 | JUST A FRIEND™ | 1 | Derek's familiar first interception |
| 2 | THE GROUP CHAT SQUADRON™ | 3 | Chad, Brad and Kyle |
| 3 | TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!™ | 1 | Derek's embarrassing return |
| 4 | THE MUTUAL FRIENDS™ | 4 | Frank, the Plus One, Steve and Ryan |
| 5 | THE READ RECEIPTS™ | 4 | SEEN 09:41, STILL TYPING, LEFT ON READ, LAST SEEN |
| 6 | FINAL BOSS — THE FINAL WORD™ | 1 | The girlfriend's fictional command aircraft |

There are **14 distinct opponent IDs**, including the final boss. The
first three waves preserve the original roster, dialogue, ammunition,
control scheme and prior combat difficulty. New wingmen have individually
authored colour, position and hit points, including slightly sturdier
interceptor aircraft. Paint colours distinguish fictional aircraft,
not the background or race of any pilot.

## The boss — gameplay

**THE FINAL WORD™** is a large original pink-and-platinum fictional
command plane. Its 12 HP occupy three actual damage phases:

- **Phase 1, 12–9 HP:** "I'M FINE."
- **Phase 2, 8–5 HP:** "YOU SHOULD HAVE KNOWN."
- **Phase 3, 4–1 HP:** "WE NEED TO TALK."

The boss is still vulnerable to **the unchanged, real upstream
cockpit-gun-ray test and missile rack**. No screen-space sprite overlap
creates a hit. The authoring geometry increases the boss's target radius
to 26 arcade units; individual interceptors have a radius of 16 rather
than 14. The boss's lateral motion increases in each phase. Both
attack movement and damage remain deterministic at the existing 60 Hz
game tick, with no random wall-clock behaviour.

### Personal-space interception

Once the boss wave starts, a deterministic warning occurs at
`waveTick = 30 + 140N`, latching the *current* player yaw.

Exactly **45 ticks after that warning**, the attack resolves.
If the player has moved the yaw more than or equal to **0.18 radians**
from the recorded aim, the attack misses. Otherwise the player's hull
loses exactly one of its three units. The same aim is never recalculated
mid-warning; a real **A/D evasion** is therefore possible. Three
accepted hits end the run with a normal Replay option.

This is explicitly **arcade fiction**, not a real-world weapon or
flight model. The boss only uses this attack on its final wave, so none
of the original three waves becomes harder or starts firing hazards.

The boss does not create an extra ammunition supply, weaken missiles,
modify source-pinned physics or alter the existing pay/restore mechanic.

## Presentation

- Original 2.5D boss silhouette, unmistakably larger than rival aircraft.
- Boss HP and phase title, hull readout and prominent telegraph warning.
- Existing explosions, gunfire, missile trails and Paula/SID-inspired SFX
  continue as presentation-only effects.
- A warning tone is emitted only on an accepted warning transition.
- A hull-impact sound is emitted only on an accepted hull deduction.
- Failed boss runs end cleanly, with a game-specific replay message.
- Victory triggers the **existing owner-locked canonical dialogue** in
  `docs/GFTA6_AIRCOMBAT_001.md`, unchanged byte-for-byte.

## Compatibility and upstream

The expanded in-memory combat state is explicitly versioned as
`gfta6.aircombat.v2` because it now includes boss attack/hull fields and
individual contact HP/role metadata. Old `gfta6.aircombat.v1` states are
not silently interpreted as v2; there is no cross-version save loader in
this prototype.

The main GFTA6 `createGame`, deterministic car physics, full Saturday
mission queue, seed, cargo, secret escape economy and takeoff continue
unchanged. The opt-out flight still finishes with **YOU FORGOT THE MILK**.

This PR only changes original GFTA6 wave data, combat authority,
presentation, UI, audio cues, docs and tests. It does **not** import or
modify VANILLAJS sources. VANILLAJS PR #141 was merged and adds an
optional parametric CAD Asset Foundry, but that authoring tool is not
needed to draw the original Canvas2D command plane. If future 3D boss
meshes are generated, track them in a separate provenance-checked PR.

The previous untouched VANILLAJS cockpit/missile/chip-audio Git blobs,
fixed 120 Hz missile substeps and physical sight contracts remain pinned.

## Acceptance

- Node tests confirm 14 unique immutable contacts, three boss phases,
  fixed warning/impact boundaries, genuine steering evasion, bounded
  hull loss, separate defeat and canonical victory outcomes.
- Gun-only full six-wave completion remains possible with the existing
  WASD/Space controls and no missile purchases.
- Evasion and loss replays are deterministic across identical seed/input
  streams and a completed victory/defeat is immutable.
- Original mobile controls, zero-browser-error, audio-source and
  full offline reload Chromium acceptance are still enforced by CI/CD.
- New work never mutates the hard Saturday campaign, cargo, vehicle
  mechanics, funds, original ending or upstream source files.
- Actual human browser test and Codex exact-head approval remain
  necessary. No unmeasured 60 FPS claim is made.

**No merge without owner review.**
