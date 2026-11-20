# GFTA6-AIRCOMBAT-003 — Missile Acquisition and Gun Hit Feedback

**Status:** Review-stage precision and quality-of-life correction to the
standalone TOO CLOSE FOR GUNS™ arcade and the optional post-escape ACT IV.
No changes to Saturday driving, cargo, escape economy, existing enemy HP,
missile damage, ammunition, boss health or canonical narrative.

## Verified cause / corrective design

The existing unmodified VANILLAJS `missileLock()` recognises a physical
target inside a *30-degree half-angle boresight cone* and allows an
immediate missile launch on the first eligible press. GFTA6 previously
selected the **first surviving enemy** for every gun shot and missile
request. This permitted easy instant missiles while other aircraft
visibly under the gun reticle could not take damage.

The fix is **game-owned**, in `src/combat-targeting.js`. The upstream
missile and cockpit modules remain byte-identical and hash-pinned.
Their actual boresight, muzzle-ray, homing and swept-sphere collision
calculations remain authoritative.

### Missile lock-on

- A missile needs **48 consecutive 60 Hz simulation ticks (0.8 s)**
  with the **same target** inside a *9-degree* half-angle lock cone.
- Every tick must additionally satisfy VANILLAJS's upstream physical
  `missileLock()` result. The game cannot override upstream rejection.
- Moving out of cone, changing target, running out of ammunition,
  entering missile cooldown, or having a missile active resets or
  blocks acquisition.
- The pilot must see **LOCK ACQUIRED** before pressing M. A key press
  on the 48th tick, which had not yet displayed confirmation, is
  rejected; no ammo is consumed.
- A completed lock applies to **one exact ID**. Launch resolves the
  locked target's *current physical coordinates*, not an unrelated
  first-survivor target. Once launched, existing immutable
  `missileTargetId` remains bound until hit or expiration.
- Holding M cannot auto-fire. The player must release it and fire
  deliberately once the acquisition meter completes.

### Gun correctness

Every accepted Space gun shot tests real VANILLAJS muzzle rays against
**all active targets**. If multiple aircraft intersect the rays, only
the nearest positive physical ray/sphere intersection is damaged.
One accepted shot causes at most one damage event. This corrects the
first-surviving-target bug without changing physical hit radius,
weapon cooldown or damage.

On accepted hits, GFTA6 records immutable `gunFeedback` with the
target ID, hit/lethal classification, tick and remaining HP.
The reticle briefly displays **HIT CONFIRMED −1 HP** or
**TARGET DISENGAGED** with a matching impact effect. A valid fired shot
that misses displays **MISSED — ADJUST AIM**. The existing original
impact SFX comes only from accepted physical hit receipts.

### HUD and audio

- Selected candidate is outlined in amber during acquisition,
  green when ready.
- A bounded progress meter and percent label show lock acquisition.
- Sidebar directions reflect the same authoritative lock state.
- An existing original chip-audio chime plays exactly once on lock
  completion; no new vendor code or commercial audio is added.
- Failed early missile commands give immediate radio guidance and
  cannot spend ammunition.
- Real weapon/projectile sprites never govern target hit authority.

## Format and compatibility

The deterministic combat record is now **`gfta6.aircombat.v3`** to
declare the additional `lockTargetId`, `lockTicks` and
`gunFeedback` fields. There is no implicit migration of older
in-memory v2 records; the game does not have a persistent save format.

All six waves and the final boss remain authored and playable.
The original game still requires earning aircraft money and escaping
to enable the optional ACT IV. The independent arcade launch, existing
boss soundtracks, player hull and final radio dialogue remain unchanged.

## Acceptance and evidence gates

1. Reject M before completed lock, with no ammunition or missile
   counter change and an explicit lock instruction.
2. Maintain lock for precisely 48 ticks in a stable physical sight;
   break lock on target swap, yaw movement or missing targets.
3. Reject an attempt from the 47-tick state even if the next tick
   completes acquisition; require deliberate new keydown afterward.
4. Never retarget an active homing missile or reuse the original ID
   once the missile has resolved.
5. Gun rays can hit another visible opponent even if the first
   surviving target is out of sight.
6. All hit/miss counters, effects and visuals derive exclusively
   from accepted physical tests, never visual pixel overlap.
7. No changes to original target HP/radii, gun damage, ammunition
   count or boss attack timing.
8. Exact-head Node tests, static offline/source pin checks and
   headless Chromium real input/sound/mobile/offline tests must pass.
9. Human play-through should confirm perceptible hit feedback,
   lock-meter responsiveness, input release and actual game feel.
10. Exact-head Codex review and owner approval before merge or Pages
    deployment. No unmeasured FPS or audible-quality claims.

```sh
node --test tests/*.test.js
node scripts/check-assets.mjs
CHROME_BIN=google-chrome node scripts/browser-chromium-smoke.mjs
```

No npm dependencies, CDN, telemetry or changes to VANILLAJS are added.
