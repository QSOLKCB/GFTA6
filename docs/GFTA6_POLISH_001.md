# GFTA6-POLISH-001 — Wayfinding, Focus and Flight Readability

**Scope:** Review-stage post-PR #8 polish only. No changes to the
GFTA6 authoritative vehicle/cargo/escape simulation, and no VANILLAJS
engine files modified.

## Context

- GFTA6's playable escape skeleton is merged at
  `2ea83ac9d9cfcb1a6b961c1b71b4913a83b534e8`.
- VANILLAJS COCKPIT-001 PR #136 is merged at
  `0bfe21979a42365345c6690b9a8f28758dcfae50`.
- The reusable cockpit rig is experimental and models physical SI poses,
  distinct from GFTA6's original arcade flight mission state.
- **This PR does not silently substitute the cockpit's airframe physics.**
  That adapter belongs in a separate, exact-source-pinned integration PR,
  preserving the existing flight campaign's completion rules and receipts.

## What changes in this slice

### Wayfinding and objective selection

`src/navigation.js` is a pure, presentation-only helper with two modes:
`errands` and `escape`. It selects a physical location already authored in
Suburbania and returns a label, world position, distance, bearing and control
hint. It does not change world coordinates, collision, mission order or funds.

- Press **N** or use the **ROUTE** toolbar button to switch views.
- The mini-map highlights the currently selected target.
- The canvas displays an arrow, target name and approximate world-unit
  distance in both Classic and Raised views.
- The dashboard displays the appropriate next action.
- Paid deliveries take precedence over collecting a new courier job.
- Ordinary shopping or other boot cargo must be unloaded first; the escape
  guide sends the player to the proper pickup/dropoff rather than sending
  them to the courier depot with a full boot.
- An affordable restoration stage points toward Old Airfield.
- Once the aircraft is restored, the guide points to its launch point.
- During a flight or after either ending, world navigation is inactive.

Distance uses the established gameplay scale and is labelled **world units**,
not invented kilometres, metres or travel times.

### Input and accessibility

- Toolbar actions restore focus to the game canvas when driving can resume.
- Starting a new mini-game explicitly focuses the first choice.
- Numeric choice shortcuts work while a choice button is focused.
- Holding keys through modal transitions still cannot rearm driving inputs
  via OS auto-repeat.
- On either completed ending, focus moves to **Replay** once, not once per
  render frame.
- The N route switch ignores key repeats; route state remains separate
  from the deterministic `snapshot(state)`.

### Flight UI readability

- Flight indicators are labelled **ARCADE** units, not real knots or
  certified aircraft instruments.
- A fixed overlay shows takeoff-speed, climb and departure progress.
- Runway perspective markings fade as the aircraft climbs.
- Flight retry and escape completion messages remain separate.
- The player's car, errands, cargo and engine physics are unchanged.

## Verification and release gates

```sh
node --test tests/*.test.js
node scripts/check-assets.mjs
python3 -m http.server 8000
```

Automated tests cover navigation targets, completion and funded upgrade
routes, unfinished cargo precedence, Classic/Raised render parity, contextual
interaction prompts, auto-repeat/keyboard focus, one-time ending focus, and
flight rendering without mutating the flight record.

Browser acceptance remains necessary: physically drive/park at each target,
switch between N routes, answer a mini-game with keyboard while the choice
button is focused, use toolbar buttons and resume driving, start and fail
flight then retry, and complete either ending. Test offline reload and
mobile layout before merge.

No standalone third-party assets, NPM dependencies, telemetry, remote
imports, new physics or fake benchmark numbers are added.

**Release policy:** Green exact-head CI, Codex review and owner play-through;
GFTA6 Pages deploy only from merged main.
