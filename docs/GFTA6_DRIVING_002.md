# GFTA6-DRIVING-002 — SUBURBANIA HAS LOST ITS PATIENCE™

**Scope:** Original Saturday driving street-life presentation and voice cues.
**License:** Apache-2.0 GFTA6-owned source.
**Dependencies:** No packages, external TTS engines, online services or proprietary audio.
**Do not change:** The player's existing F-UH-K idle engine, motion rules,
cargo, mini-games, flight, dogfight, Advanced Air War or upstream source pins.

## Deterministic street cast

`src/street-life.js` authors six moving traffic cars and six walking
pedestrians. Paths are bounded by Suburbania's existing world dimensions,
using integer tick progression and seed-derived phase only. No wall clock,
Web Audio time, random API, DOM or network influences an actor's position.
Actor IDs, colour, silhouettes, line banks, lanes, travel direction and
period are fixed authored source data.

`streetActors(seed,tick)` produces immutable actor snapshots without
affecting the actual `core.js` game state. Renderer paints them in both
Classic and Raised modes. Raised mode includes the NPCs in the existing
painter order with city buildings and player, using the previously accepted
GFTA6 original car extrusion for NPC vehicles. Pedestrians are original
simple Canvas figures, not downloaded artwork.

`streetMoment(seed,tick,playerXY)` selects the nearest authored traffic
car at tick % 120 == 30 or pedestrian at tick % 120 == 90, limited
to 205 world units. It selects a dialogue line from the actor's authored
list based solely on fixed tick. Voices do not fire outside these cue slots.
A visual receipt contains actor ID, kind, line ID, tick, distance and source
location; this receipt stays in `app.js`'s presentation layer only.
There is no hidden ambient NPC random state to affect replays.

## Robotic speech synthesis

`src/street-voice.js` defines 14 original lines with readable captions
and syllable/phoneme approximations. It synthesises signed 16-bit stereo
48 kHz PCM with fixed envelopes, original crude formant resonances, noisy
fricatives and consonant transients. A deterministic hash of actor identity
gives a distinct voice pitch/timbre. This is an intentionally rough game
effect, **not** a human-quality TTS transcription of every word.

The existing `src/audio-player.js` Web Audio device adapter caches a bounded
set of generated utterance buffers and allows at most two simultaneous NPC
voices. Gain responds to physical listener distance. Audio initialization
still occurs only on user game activation. SFX OFF, pause, focus loss,
flight, combat, ending and game restart all silence the street voices.
Music remains independently switchable.

The original `src/frustration-engine.js` is *unchanged*: the established
player-car idle vocal cadence and pitch remain canonical. No new
source-pinned VANILLAJS modules are required.

## Non-features and safety/authority boundary

- NPC cars and pedestrians are **visual and audio traffic**, not collision
  bodies. No damage, pedestrian injury, speed enforcement, tickets, traffic
  obstruction, navigation/pathfinding AI, or changes to quest progression.
- Neither `core.js` nor `vehicle.js` changes.
- No new player-state schema, serialized fields, replay hash changes,
  nondeterministic timers, recorded third-party audio or chat services.
- The fixed actor schedule and event position can be independently
  reproduced by supplying the same seed and tick. Audio devices may
  start/stop at browser-dependent playback times; authored PCM bytes are
  deterministic, not the speaker's playback clock.
- Voice rendering and no-clip/collision rights must not be mistaken for
  physical traffic simulation. A later traffic-physics phase requires
  explicit actor-intersection and pedestrian-protection rules.

## Acceptance

```sh
node --test tests/*.test.js
node scripts/check-assets.mjs
node scripts/browser-chromium-smoke.mjs
```

Manual checks:
1. Start Saturday, leave SFX on and MUSIC off. The player's familiar
   idle swear must sound exactly as it did in merged PR #19.
2. At the spawn junction the cab should complain, followed by a
   nearby pedestrian. Audio should be robotic but distinctly
   lower-pitched for cars and higher-pitched for people.
3. Confirm speech bubble follows the visible speaker in Classic and
   Raised modes, and actor/body occlusion remains plausible.
4. Walk/drive the city and listen for different cast lines. Both modes
   should remain usable with the original controls and missions.
5. SFX toggle, pause, blur, mini-game, completed game, Replay,
   flight, dogfight and Advanced Air War: no street voice bleed.
6. Confirm 390 px touch controls, offline reload and native 60 FPS
   performance on owner hardware before merge.

Never claim these actors have physical contact or sophisticated AI.
