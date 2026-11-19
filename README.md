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
| **Development status** | Concept / pre-alpha — features below are design goals, not shipped functionality |

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

GFTA6 is intended as a **standalone repository**, using selected components and ideas from [QSOLKCB/VANILLAJS](https://github.com/QSOLKCB/VANILLAJS) rather than copying its entire demo catalogue.

Design priorities:

1. **Offline-first.** The core game must work without accounts, telemetry, cloud services, or a permanent network connection.
2. **Minimal dependencies.** Prefer standard browser APIs and inspectable JavaScript over heavyweight tooling.
3. **Deterministic systems where practical.** Seedable errand generation, fixed-step simulation, and reproducible gameplay tests.
4. **Stable performance.** Aim for responsive 60 FPS gameplay on ordinary desktop hardware; measure rather than assume.
5. **Original material.** Build our own city, characters, dialogue, artwork, sound effects, and music.
6. **Portable saves.** Keep local progress under player control, with versioned save formats when implemented.
7. **Modularity.** Treat errands, locations, dialogue, and mini-games as data-driven systems.

### Initial v0.1.0 scope (proposed)

- One small, drivable fictional neighbourhood.
- Six destinations, including home, a salon, a health spa, shops, and a dry cleaner.
- Basic vehicle handling, parking, and delivery interactions.
- A deterministic mission queue, "While You're Out" events, and a complete Saturday campaign.
- Four short household mini-games.
- Original comedy dialogue and a fictional outrage feed.
- Keyboard controls, pause/restart, and offline smoke tests.

**Status:** This is the intended first playable milestone, not a claim that these systems already exist.

## Getting started

This repository is at the concept stage. Installation and launch instructions will be added once there is a playable build.

The planned delivery format is a static browser game. When the web entry point exists, a simple local HTTP server can be used for development, for example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. A local server avoids the restrictions that some browsers apply to ES modules loaded directly from `file://` URLs.

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

This project is intended to be released under the **Apache License, Version 2.0**. See [`LICENSE`](LICENSE) when the licence file has been added. Third-party material, if any, must retain its own notices and licence terms.

---

*"You can steal the spotlight. You cannot escape the errands."*

**GFTA6 — The Internet Is Furious. You're Just Trying to Find Parking.**
