# GFTA6-RELEASE-POLISH-001 — ONE MORE ERRAND™

**Candidate:** v0.2.0 · **Scope:** presentation and release hardening only.

## Protected design

The 12 authored street vehicles and pedestrians remain *non-colliding*
ghost traffic by owner choice. No pedestrian damage, blocking, tickets or
new player traffic physics. Existing solid-building collisions stay intact.
No edits to gameplay core, vehicle dynamics or exact-pinned VANILLAJS code.

The original player F-UH-K idle synth remains canonical. A source-identity
test locks the accepted file byte-for-byte until separately approved.

## Improvements

1. NPC VOICES ON/OFF — accessible aria-pressed toolbar toggle which
   synchronously silences street speech, but retains dialogue subtitles,
   moving NPCs, player engine, chip music and all other SFX.
   Setting is session-only, not game state or local storage.
2. Viewport-clamped bubbles — pure `streetBubbleLayout` computes readable
   text boxes inside the scrolled camera viewport, for both Classic and
   Raised 2.5D. Bubble overlays draw *after* buildings, vehicles and map
   markers so nearby speech is not hidden by tall geometry.
3. Ambient minimap dots for pedestrians and cars. These are not
   collision, enemy or hazard indicators.
4. Saturday-only voice UI is hidden in standalone air-combat modes.
5. Offline cache rotates and includes the new presentation helper.
   No packages, server runtime, CDN or external audio.

## Acceptance gates

```sh
node --test tests/*.test.js
node scripts/check-assets.mjs
node scripts/browser-chromium-smoke.mjs
```

Manual release sign-off: drive hatchback/coupe/van in both views,
check roadside text near the world edges, mute/unmute NPCs with
SFX/music independently, verify original idle audio still sounds
exactly the same, complete Saturday errands and optional flight,
exercise both standalone air-combat modes, test touch/mobile, offline
reload, Chrome console, and native 60 Hz frame-time samples.

Exact-head CI, independent Codex review, owner audio/gameplay/60-FPS
acceptance and manual post-merge tag are mandatory. Automated headless
browser success is *not* a hardware performance claim.

No release tag is created in this PR.
