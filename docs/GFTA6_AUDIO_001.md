# GFTA6-AUDIO-001 — Original Four-Channel Music and Combat Effects

**Status:** Review-stage implementation. Does not change the Saturday campaign,
escape economy, combat damage, missile physics, opponent difficulty or locked
final dialogue.

## Upstream and exact source evidence

Uses one **unchanged** VANILLAJS source:

| Property | Value |
|---|---|
| Repository | `QSOLKCB/VANILLAJS` |
| Merged commit | `a4bfb2c200964061a2a3f06f68883f28f65b63a3` |
| Source path | `modules/chip-audio/index.js` |
| GFTA6 vendored path | `vendor/vanillajs/chip-audio/index.js` |
| Git blob SHA | `4b7f219deaf273fa7178558a3bb214bb003d8b6d` |
| Licence | Apache-2.0 |

`NOTICE` records this provenance; `scripts/check-assets.mjs` verifies
the source bytes using Git object SHA-1 framing, independent of the filename.

The module models four signed-8-bit PCM voices, Paula-style hard stereo
panning (channels 0/3 left, 1/2 right), SID-inspired ADSR envelopes,
period stepping and an optional low-pass. ADSR is an **amplitude envelope**,
not a filter. The `led-approx` is a separate approximate low-pass. This is
**not a cycle-accurate MOS SID or Paula emulator**, and no commercial sound
recordings, ROMs, tracker modules or third-party samples are included.

## Original GFTA6 sound content

`src/soundtrack.js` originally built three authored 8-second 48 kHz stereo loops; the AIRCOMBAT-002 expansion adds a fourth dedicated boss score:

- **Saturday:** wry bright lead and rhythmic bass for domestic errands.
- **Escape flight:** broader melodic line and steady pulse for takeoff.
- **Dogfight:** punchier lead and bass for JUST A FRIEND SQUADRON™.
- **Boss:** darker minor-mode original lead and bass for THE FINAL WORD™.

All melodies and patterns are original to this game. There are also ten
game-specific original effects: UI, warning, pickup, gunfire, missile launch,
aircraft hit, explosion, disengagement, wave transition and victory.
The music and effects use the same upstream deterministic PCM generator.

`src/audio-player.js` is a browser-only Web Audio adapter. It owns the audio
device, stereo AudioBuffers, bounded one-shot voices, caching and an explicit
user-gesture activation. There is **no auto-play before a game click**. The
separate **MUSIC** and **SFX** controls mute their respective busses
independently; pause mutes both without modifying simulation.

`src/audio-cues.js` converts *authoritative* accepted game events into
playback requests. Attempting a missile without ammunition or lock does not
emit a misleading launch sound. Effects never modify weapon state.

## 2.5D visual feedback

`src/aircombat.js` retains at most 16 immutable event receipts with a
70-tick visual lifetime, including target ID, origin coordinates and
the accepted hit/lethal distinction. The render adapter projects those
world-space locations via the unchanged VANILLAJS cockpit geometry and
adds expanding shock rings, sparks, muzzle flash, missile trails and smoke.

The displayed **LOCKED / OFF BORESIGHT / COOLDOWN / MISSILE IN FLIGHT**
status comes from the existing upstream `missileLock` and rack state,
not screen-space sprite overlap.

VFX receipts have no authority over scoring or damage. No opponent AI,
aircraft durability, flight characteristics, missile tracking or locked
dialogue changes are made.

## Offline listening and export

The runtime generates music entirely locally. To create inspection copies:

```sh
node scripts/export-chip-audio.mjs ./audio-previews
```

This generates four stereo music WAVs and ten stereo effect WAVs at
48 kHz/16-bit. Files are **not** committed as large static assets and
are not downloaded by the player. The exporter uses exclusive creation
(`wx`) and refuses to overwrite existing preview recordings.

A Linux listening workflow:

```sh
ffplay -autoexit ./audio-previews/music-dogfight.wav
ffplay -autoexit ./audio-previews/sfx-explosion.wav
```

Manual listening is still required to judge timbre, rhythm, balance,
clicks, clipping perception and actual output-device availability.
Headless Chromium can prove UI/browser execution but not perceived sound.

## Test and release gates

```sh
node --test tests/*.test.js
node scripts/check-assets.mjs
CHROME_BIN=google-chrome node scripts/browser-chromium-smoke.mjs
```

The audio tests verify original scores are non-silent stereo, that separate
ranged renders match exact PCM, WAV header/format validity, all ten sound
effects, music/SFX controls, mock Web Audio activation, and accepted
combat-event cues. Existing browser acceptance exercises both modes,
keyboard weapon inputs, mobile controls and offline service-worker loading.

### Executed CI / browser evidence

The audio work is reconciled with merged GFTA6 Chromium CI PR #14
(`main@3b6888e0494a2840a1377edec7ebf669e3de7f3a`) through a
two-parent branch reconciliation commit. The complete original headless
Chromium harness from that reviewed merge is retained, including its
real-gun-hit and visible-mobile-button tests.

The extended Chrome DevTools **WebAudio** domain additionally verifies:

- A user-gesture AudioContext is created and enters the running state.
- Real `AudioBufferSource` voices are created for the original Saturday
  soundtrack and after turning the MUSIC toggle off and on.
- Standalone combat creates a separate user-gesture audio context.
- Actual Space gunfire and M missile launches create further source-backed
  SFX voices.
- Existing real mouse, Canvas, full browser error, mobile and offline reload
  checks pass unchanged.

The verified browser run is GitHub Actions
`44697826418` (Chrome 157), with **90/90 Node tests, zero failures**
and successfully uploaded screenshot evidence. This is executed source
evidence; it is *not* an auditory quality certification or a measured
60-FPS result.

The audio PR still requires independent Codex review and owner **manual
listening and gameplay approval** before merge. No automatically generated
WAV recordings, telemetry or remote assets belong in GitHub Pages.
