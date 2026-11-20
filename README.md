![GFTA6 illustrated arcade banner: a shopping-laden hatchback, contradictory outrage channels, and a mission to complete a task that was never assigned](assets/gfta6-banner.svg)

# GFTA6 — GIRLFRIEND THEFT AUTO VI™

> **The Internet Is Furious. You're Just Trying to Find Parking.**

**Nobody wins the culture war. Everybody gets another errand.**

GFTA6 is an **apolitical, open-world domestic comedy** about the most dangerous missions ever devised: finding a parking space, collecting the correct groceries, assembling flat-pack furniture, and hearing the words *"While you're out, can you just…"*

Your girlfriend controls the mission queue. You control the car. Neither of you controls the traffic.

Built as an original, offline-first browser game with **VANILLAJS**, HTML5, CSS3, and JavaScript. **Apache-2.0**.

## At a glance

| | |
|---|---|
| **Genre** | Open-world domestic comedy / errand simulator |
| **Engine** | [VANILLAJS](https://github.com/QSOLKCB/VANILLAJS) |
| **Platform** | Modern web browsers; offline-first target |
| **Tech** | HTML5, CSS3, vanilla JavaScript |
| **Dependencies** | Minimal by design |
| **Licence** | Apache License 2.0 |
| **Political alignment** | None. Fucks Given = 0. |
| **Targets of satire** | Everyone else. Left, Right, Up & Down. |
| **Development status** | v0.1.x playable prototype — mechanics-first 2D, experimental 2.5D details; full 3D later |

## The comedy philosophy

GFTA6 does **not** take a political side. It takes the piss out of the internet's endless need to pick one.

The satire targets outrage, overconfidence, reaction videos, performative arguments, and the bizarre expectation that every video game must be a political referendum. Nobody gets a heroic speech. Nobody wins the argument. The player still has to pick up the dry cleaning.

An optional **fictional in-game outrage feed** might read:

> **OUTRAGE CHANNEL A:** "This game is destroying civilisation!"  
> **OUTRAGE CHANNEL B:** "People complaining about this game are destroying civilisation!"  
> **THE PLAYER:** "Can someone tell me where the bloody dry cleaners are?"

Both camps are caricatures of online behaviour, not statements about everyone who holds a given view. **The game is about domestic absurdity; the internet argument is background noise.**

### Official mission statement

**Politics is stupid. Parking is worse.**

## The premise

You have a car, a house, a bank balance, and what appears to be a free Saturday.

You do not have a free Saturday.

Your girlfriend needs a lift to the salon. Then the health spa. Then the shops. Then she remembers a parcel. Then the dog needs something. Then the furniture arrives. Then she asks why you haven't cleaned the kitchen.

There is no wanted level. There is a **"You Forgot Something" level**.

### Prologue: "I'LL ONLY BE FIVE MINUTES."

**Estimated completion time:** 4 hours, 37 minutes.

Drive to the nail salon. Find parking. Wait five minutes. Wait another five. Discover your parking ticket has expired. Get a message:

> "Actually, can you grab a few things while you're there?"

**MISSION UPDATED.**

### The "While You're Out" Engine™

Every time you get close to home, your phone buzzes with another *tiny* request. The engine tracks your current route, remaining fuel, cargo space, and how close you were to finally putting your feet up. The closer you get to the driveway, the greater the temptation for the game to invent one more stop.

The perfect Saturday, according to the game:

| Time | Event |
|---|---|
| **9:00 AM** | "Babe, can you do one little thing?" |
| **9:15 AM** | Mission accepted. |
| **11:30 AM** | You've visited Bunnings, three supermarkets, and a furniture warehouse. |
| **1:45 PM** | "Oh, I forgot to tell you something." |
| **3:00 PM** | **NEW OBJECTIVE:** Return to Bunnings. |
| **5:30 PM** | "You haven't done anything with me today!" |
| **6:00 PM** | **MISSION FAILED:** You were supposed to know. |

But even reaching your front door doesn't end the quest:

```text
╔══════════════════════════════════════════════════╗
║               NEW MISSION UNLOCKED               ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║ "I THOUGHT YOU WERE GOING TO DO THAT TODAY."      ║
║                                                  ║
║ Objective: Complete a task that was never assigned.║
║                                                  ║
║ Difficulty: IMPOSSIBLE                            ║
╚══════════════════════════════════════════════════╝
```

No quest marker. No briefing. No acknowledgement that the objective did not exist five seconds ago.

**Design rule:** the unfairness is funny because the mission system is knowingly absurd. The game caricatures impossible expectations, not an entire gender; both characters can misunderstand each other, and everybody gets to be ridiculous.

## GFTA6-ERRANDS-003 — The Errand Economy™ (PR #6 candidate)

The next GFTA6 game-specific phase adds a **physical cargo manifest** to
shopping, parcel pickups and furniture deliveries. Finish the selection
mini-game, load the boot, drive to the intended destination, and deliver the
actual items before progressing.

The Hatchback has 9 cargo slots, the Coupe has 5 and the Shopping Van has 15.
The small Coupe requires **repeat trips** for a full grocery run or wardrobe,
while the other vehicles fit each manifest in one load. No item is silently
lost or duplicated; unfinished loads generate deterministic extra errands.

A new in-game dashboard displays loaded items, capacity, pending stock and
delivery receipts. The rules stay in GFTA6's pure JavaScript simulation, with
no changes to car physics or collision, no new cloud dependencies, and no
upstream rendering APIs copied or pre-emptively integrated.

See [GFTA6-ERRANDS-003 delivery and replay contracts](docs/GFTA6_ERRANDS_003.md).
The feature stays on a review branch until PR #6 passes CI, Codex review and
manual play-through; the live Pages site continues serving merged `main`.

## GFTA6-WORLD-002 — Suburbania (review-stage PR #5)

The next GFTA6-specific feature slice expands the original city from eight
to **fourteen destinations** and introduces four new errands: dog grooming,
furniture pickup, the exact bread request and a dinner-order mini-game.

Six new destinations are accessible across an expanded 4 × 4 street grid;
the old location IDs and coordinates are preserved. Parking indicators
remain cosmetic and do not change the authoritative vehicle physics,
interaction radius or deterministic 60 Hz simulation.

Three vehicle presentation mappings declare original Canvas fallback designs
for the Hatchback, Coupe and Van, with **empty future model slots**. No third-
party mesh has been downloaded or incorporated, and no reusable 2.5D engine
component is being developed here.

**Boundary:** `VANILLAJS-25D-001` is owned by a separate upstream workstream.
GFTA6 will consume approved projection and asset-foundry APIs at reviewed
commit SHAs, not duplicate or replace them.

See [GFTA6-WORLD-002 content and integration contracts](docs/GFTA6_WORLD_002.md).
This content is **not live on GitHub Pages until PR #5 is reviewed and merged**.

## Play online

**[PLAY GFTA6 ON GITHUB PAGES](https://qsolkcb.github.io/GFTA6/)**

The static browser build is published from `main` through a gated
[GitHub Pages workflow](.github/workflows/pages.yml). It requires no login,
bundler, telemetry, or remotely loaded game code. After a successful first
online visit and service-worker installation, the same assets can load offline.

## Independent vehicle handling prototype (review stage)

The next proposed driving revision replaces periodic 64-way turning with
**continuous 1024-step integer steering**, preserving deterministic, fixed-tick
gameplay. The start menu adds three **original handling profiles**: the
standard Errand Hatchback, quicker Weekend Coupe, and heavier Shopping Van.

This is being developed in a review branch; it will appear on the live Pages
build **only after merge**. The objective is better corners and parking feel
without loss of the classic top-down presentation.

Multi-Race-Driving is a GPLv3-licensed external **design reference** only.
**No GPL code, assets, constants or engine dependencies are copied.**
See [independent 2.5D implementation notes](docs/INDEPENDENT_25D_IMPLEMENTATION.md)
for the precise source and licensing boundary, and what remains planned.

## Classic top-down → 2.5D → full 3D

The first priority is **good driving feel and complete, funny gameplay in a
classic top-down perspective**. After that, the entire game becomes a carefully
iterated 2.5D experience with height, shaded buildings and original low-poly
assets. Full 3D is a future presentation upgrade, **not a rewrite of game rules**.

See **[the phased 2D-to-3D roadmap](docs/ROADMAP_2D_TO_3D.md)**,
including explicit acceptance gates, reproducibility requirements, and
performance safeguards.

### Current driving improvements (v0.1.x)

- Smooth, deterministic 64-step steering rather than rough 16-way jumps.
- Signed forward/reverse speed and braking *before* changing direction.
- Independent **Space** service brake; friction and sensible no-spin steering.
- Velocity aligned to car orientation rather than accumulating independent
  sideways movement.
- Fixed-tick collision resolution; slowed contact with walls and buildings.
- Correct simultaneous keyboard inputs and control resets when entering missions.
- Lightweight 2.5D roof/façade shading and car bevel, with **unchanged 2D collisions**.
- Additional deterministic vehicle regression tests; offline cache version bumped.

**These changes are review-stage until their PR passes CI and the driving
feel has been play-tested and approved.** The live Pages site publishes from
`main`, not feature branches.

## First playable Saturday — v0.1.0 preview

The repository includes a **playable original top-down driving and errand game** in `index.html`. Your first Saturday has a deterministic seed, a small fictional suburb, vehicle handling from a pinned local VANILLAJS motion module, a dynamic "While You're Out" diversion, and a fully playable chain of errands.

Implemented in the preview:

- Eight neighbourhood locations, including a petrol station and two possible bonus-errand destinations.
- Steering, acceleration, braking/reverse, collision with buildings, parking interactions, and a city mini-map.
- A fixed 60 Hz simulation tick and seed-dependent, reproducible mission interruptions.
- Shopping, hardware, laundry, cleaning, and flat-pack assembly mini-games.
- A non-political, fictional outrage feed that lampoons mutually escalating internet commentary.
- The final unassigned-task mission and **MISSION FAILED SUCCESSFULLY** ending.
- Keyboard and touch-button controls, sound-effect toggle, pause, restart, and static-resource offline caching.
- Dependency-free Node.js regression checks using the built-in test runner.

**Controls:** W / ↑ accelerate; S / ↓ brake or reverse; **Space** independent service brake; A / ← and D / → steer; E interact at the marked destination; P or Escape pause; number keys 1–4 choose mini-game responses. Buttons below the game provide touch-friendly driving and interactions.

**Limitation:** This is a short vertical slice, not a full GTA-style open world. All later mission ideas below remain design concepts unless explicitly listed above.

## Planned gameplay

- **Drive across an original fictional suburb.** Take your girlfriend to appointments, collect shopping, navigate traffic, find parking, and manage fuel.
- **Survive a dynamic errand queue.** Finishing one task may generate two more, including mid-drive changes of destination.
- **Manage the essentials.** Time, money, patience, fuel, cargo space, and relationship goodwill are all finite resources.
- **Take on household mini-games.** Cleaning, laundry, furniture assembly, misplaced objects, and other battles against ordinary reality.
- **Navigate branching dialogue.** Some questions have no good answer. Choosing silence is still an answer.
- **Discover optional satire.** Listen to competing outrage broadcasts while trying to get the groceries home before the ice cream melts.

### Campaign mission ideas

| Mission | Objective | Complication |
|---|---|---|
| **Just a Quick Stop™** | Drive to the nail salon | The promised 15 minutes becomes two hours |
| **That's Not What I Asked For™** | Collect a shopping list | The list changes halfway home |
| **IKEA Impossible™** | Assemble flat-pack furniture | The one essential screw is missing |
| **You Missed a Spot™** | Clean the house | The last crumb is somehow invisible |
| **Where Should We Eat?** | Choose a restaurant | Every suggestion is rejected |
| **The Furniture Rearrangement** | Move the couch | It ends up where it started |
| **I Thought You Were Going to Do That Today** | Complete an unassigned task | No objective marker, no warning, impossible difficulty |

### Household mini-games

- **The Fitted Sheet:** The Dark Souls of laundry.
- **Grocery Tetris:** Fit an improbable shopping haul into a small hatchback.
- **The Remote Control Incident:** Locate a remote that was definitely "right there".
- **The Flat-Pack Boss Fight:** Follow ambiguous instructions while maintaining your remaining sanity.
- **The Silent Treatment:** A dialogue puzzle in which the absence of dialogue is the puzzle.

## Player HUD (concept)

```text
SATURDAY 09:00             NEW MESSAGE (7)
BANK BALANCE       $47.60
PATIENCE              18%
RELATIONSHIP          83%
FUEL                  12%
CURRENT OBJECTIVE: PICK UP THE DRY CLEANING
SECONDARY OBJECTIVE: REMEMBER WHY YOU WENT OUT

PHONE: "While you're out, can you just..."
               [MISSION UPDATED]
```

### Final boss: "WE NEED TO TALK."

Three dialogue options. Four possible misunderstandings. One autosave from Thursday.

> "If you don't know, I'm not going to tell you."

**MISSION FAILED.**

The ultimate achievement: **FREE WEEKEND — Complete all assigned tasks before Monday.**  
*Theoretical unlock rate: 0.00%.*

## Technical direction

GFTA6 is a **standalone repository**, using selected components and ideas from [QSOLKCB/VANILLAJS](https://github.com/QSOLKCB/VANILLAJS) rather than copying its entire demo catalogue.

Design priorities:

1. **Offline-first.** The core game must work without accounts, telemetry, cloud services, or a permanent network connection.
2. **Minimal dependencies.** Prefer standard browser APIs and inspectable JavaScript over heavyweight tooling.
3. **Deterministic systems where practical.** Seedable errand generation, fixed-step simulation, and reproducible gameplay tests.
4. **Stable performance.** Aim for responsive 60 FPS gameplay on ordinary desktop hardware; measure rather than assume.
5. **Original material.** Build our own city, characters, dialogue, artwork, sound effects, and music.
6. **Portable saves.** Keep local progress under player control, with versioned save formats when implemented.
7. **Modularity.** Treat errands, locations, dialogue, and mini-games as data-driven systems.

### v0.1.x prototype scope

The **first playable Saturday** is implemented as a compact browser vertical slice: the neighbourhood, errands, household mini-games, dynamic interruption, and ending are playable. Future objectives include additional streets, campaign branches, save files, vehicle tuning, improved traffic, and measured 60 FPS performance across target devices.

## Getting started

No NPM installation, bundling, cloud account, or third-party runtime is needed. Run a local static HTTP server at the repository root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. A local server avoids browser restrictions on ES modules loaded via `file://` URLs.

For deterministic tests and syntax checks, Node.js 24 or newer is recommended:

```sh
node --test tests/*.test.js
node scripts/check-assets.mjs
node --check src/core.js
node --check src/vehicle.js
node --check src/app.js
node --check src/render.js
```

There are **no NPM dependencies**. `package.json` declares ESM mode and exposes convenience scripts; no package installation is required.

### VANILLAJS source provenance

GFTA6 uses a local, unmodified copy of `modules/motion2d/index.js` from `QSOLKCB/VANILLAJS` pinned to commit `394fd455c6ce3bec9f0bf2c5d2a672b8c5454ab1`. See [NOTICE](NOTICE) and [vendor/vanillajs/motion2d.js](vendor/vanillajs/motion2d.js). It does not import code from a CDN.

The service worker precaches the game shell after the first successful visit on a compatible origin (HTTPS or localhost). Until that visit completes, a browser connection is still needed to fetch the game once. Offline functionality can be tested by loading the page once, stopping the local server, and refreshing while the browser remains under service-worker control.

## What this game is *not*

- Not a political campaign, endorsement, or ideological argument.
- Not a claim that either side of an online dispute represents everyone on that side.
- Not a realistic relationship simulator, relationship advice, or a documentary.
- Not an official **Grand Theft Auto** game, sequel, modification, or Rockstar product.
- Not an excuse to recycle copyrighted game art, characters, audio, maps, or logos.

## Unofficial parody and trademark notice

**GFTA6 / GIRLFRIEND THEFT AUTO VI™ is an independent, unofficial comedy-game concept.** It is not affiliated with, endorsed by, sponsored by, or associated with Rockstar Games, Take-Two Interactive, or the Grand Theft Auto franchise.

Names and marks belonging to third parties remain the property of their respective owners. The title is intended as parody; the **™** symbol is a tongue-in-cheek branding convention here and is not a claim of registered trademark status. No third-party assets or branding are required for this project. All shipped game content should be original or used under an appropriately documented licence.

## Licence

This project is intended to be released under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE). Third-party material, if any, must retain its own notices and licence terms.

---

*"You can steal the spotlight. You cannot escape the errands."*

**GFTA6 — The Internet Is Furious. You're Just Trying to Find Parking.**
