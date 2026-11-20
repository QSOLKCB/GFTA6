# GFTA6-AIRCOMBAT-001 — JUST A FRIEND SQUADRON™

**Status:** Canonical design brief. Implementation deferred to a separate
gameplay PR after the GFTA6-POLISH-001 fixes are reviewed and merged.

## Premise

The protagonist has finally saved enough cash, restored a fictional warbird,
and escaped Suburbania. Just as freedom looks possible, the girlfriend sends
her entire suspiciously well-equipped group of **"just friends"** to intercept
him.

This is an original, deliberately ridiculous, non-graphic arcade dogfight.
The jokes target jealous relationships, romantic rivalries, absurd entitlement
and poor military decision-making—not anyone's ethnicity, ancestry or skin
colour. Contrasting white, charcoal, espresso-brown and black **aircraft paint**
is part of the readable arcade visual design and does not specify pilot races.

## ACT IV — THE CUCKOO SQUADRON™

### Wave 1 — JUST A FRIEND™

One rival fighter, callsign DEREK. Tutorial for evasion, target acquisition,
physical sight alignment and non-graphic disengagement. Derek repeatedly
insists they are "just friends."

### Wave 2 — THE GROUP CHAT SQUADRON™

Three distinct fictional rivals, deterministic formation changes, and radio
chatter that grows increasingly insufferable. Each has its own seed-derived
but repeatable flight path and clear status indication.

### Wave 3 — TOO CLOSE FOR GUNS — SWITCHING TO MISSILES!™

Deliberately backwards weapon-selection announcement, followed by immediate
computer disagreement. Reuse only approved VANILLAJS cockpit, airframe, sight
and target-testing contracts. Do not fake projectile origin from the screen
centre or change physical aim when the camera moves.

The joke works even if the prototype uses only toy, non-graphic simulated
target scoring. Missile mechanics are **not** a prerequisite for the first
2.5D prototype, and no explosive-weapon implementation is authorised by
this design note alone.

## CANONICAL FINAL ENDING — PRESERVE VERBATIM

The following lines are **locked narrative dialogue**. Keep their wording,
order, capitalisation and punctuation unchanged when implemented.

```text
MISSION ACCOMPLISHED.

Your radio crackles.
"Hey babe, it's me. Derek said you were being really immature about the whole thing."

PLAYER: "DEREK IS CURRENTLY PARACHUTING INTO THE ENGLISH CHANNEL."
"Can you pick him up?"

NEW MISSION UNLOCKED
"HE'S ACTUALLY A REALLY NICE GUY."™
DIFFICULTY: EMOTIONAL AIR SUPERIORITY
```

No paraphrase, replacement ending or "improvement" is permitted without
explicit owner approval. Derek is depicted as safely parachuting and the
encounter as comic arcade fiction.

## Existing source baseline

- GFTA6 `main` contains Operation Freedom Flight v1 2.5D escape skeleton,
  alternate fund, restoration receipts, and the original "forgot the milk"
  outcome. These must remain compatible with a player who has not enabled
  air combat.
- VANILLAJS merged COCKPIT-001 PR #136 at exact SHA:
  `0bfe21979a42365345c6690b9a8f28758dcfae50`.
- Upstream `modules/cockpit-rig` offers camera, instruments and physical
  sight geometry; `modules/airframe` offers experimental simplified SI
  aerodynamic dynamics. They are not yet integrated into GFTA6.
- GFTA6's arcade `src/escape.js` state is not an SI six-degree-of-freedom
  pose. Do not substitute one for the other without a reviewed adapter.

## Implementation sequence (future PRs)

1. **AIRCOMBAT-001A — 2.5D Arcade Dogfight Skeleton.** Opt-in stage after
   escape, authored GFTA6 aircraft callsigns, cosmetic paint and comic radio.
   Deterministic bounded wave state and clear non-graphic disable/disengage
   events. Preserve the existing milk ending when the extra stage is disabled.
2. **AIRCOMBAT-001B — VANILLAJS Cockpit Adapter.** Vendored unmodified source
   at an exact reviewed upstream commit; explicit coordinate and input
   conversion; cockpit/chase cameras and physical sight-ray checks; direct
   comparison to the fallback state and rendering.
3. **AIRCOMBAT-001C — Flight Tuning and Presentation.** Improve aircraft
   silhouettes, sight overlays, aiming and performance evidence; ensure that
   victory and the canonical ending are reproducible.

## Correctness, safety and governance gates

- Deterministic simulation, seeded opponent decisions, explicit wave count
  and bounded updates; no implicit randomness, ambient clocks or network.
- Separate authority for aircraft/target physics, camera presentation,
  projectile or scoring tests, and original GFTA6 story/outcomes.
- No copied GPL engine code, artwork, unverified assets, paid service or CDN.
- Original Apache-2.0 source; no unreviewed change to the VANILLAJS repo.
- A single successful wave-completion event, never duplicate victory receipts.
- Player can still finish ordinary Saturday without ever using air combat.
- Fixed 60 Hz simulation and independently measured browser frame pacing,
  without claiming 60 FPS solely from automated unit tests.
- Unit, negative and full-campaign regressions plus owner browser play-test.
- Codex exact-head review and green CI before any merge.

**DESIGN ONLY:** This brief does not claim the air-combat gameplay, missiles,
cockpit integration or enemy aircraft are implemented.
