# GFTA6-BROWSER-001 — Headless Chromium Acceptance Gate

## Executed evidence

The first qualified real-browser acceptance was recorded on GitHub Actions
run **44691980437**, against commit
`458646498e2bc14d281d51a754f238eef2fae8f4`:

- Chromium engine: Google Chrome **157.0.8103.50**, headless.
- Real mouse clicks to launch Saturday, switch Classic/Raised projection,
  switch route selection and pause/resume.
- Real W keyboard input; actual Canvas pixel inspection detected varied
  colours (not merely presence of a Canvas element).
- Separate **TOO CLOSE FOR GUNS** launch with real M missile launch and
  Space gun input.
- Emulated **390 × 844 mobile viewport**, including visible touch controls.
- **Offline reload** while CDP network emulation was offline, served by the
  game's own controlling service worker.
- No uncaught JavaScript exceptions or error-level console messages.
- Screenshot evidence uploaded as an Actions artifact:
  `saturday.png`, `dogfight.png`, `dogfight-mobile.png`.

All gameplay smoke scenarios passed. The immediately preceding run
`44691617252` passed the same scenarios but initially failed the runner
on a temporary Chrome profile deletion race; cleanup was corrected before
the qualified run.

This is **an executed browser smoke test**, not a substitute for human
play-through, gameplay difficulty acceptance, audio audibility, 60 FPS
timings, native GPU performance or cross-browser validation.

## Mechanism

`scripts/browser-chromium-smoke.mjs` is a self-contained Node 24
standard-library script. It serves the checked-out repository on
`127.0.0.1`, starts headless Chrome with a temporary profile, communicates
using built-in WebSocket and Chrome DevTools Protocol (CDP), dispatches
real pointer and keyboard events, inspects the DOM and Canvas, and captures
screenshots for review.

No npm dependencies, Selenium, Playwright, Docker, Puppeteer, CDN or
external test server are used. Chrome/Chromium itself is an explicit
runner prerequisite: absence is a failure, not a skipped check.

The DevTools endpoint is bound to loopback and the temporary profile
is cleaned up. CDP is a lower-level automation interface that may need
maintenance as browser versions evolve.

## CI and CD gates

- `.github/workflows/ci.yml`: all normal unit and asset checks, then
  real-browser acceptance on PR and `main`.
- `.github/workflows/pages.yml`: all existing checks, then browser
  acceptance **before static Pages packaging and deployment**.
- Each run stores screenshots using a unique attempt-scoped artifact name.
  This does not alter the existing protected production Pages artifact.

Because service worker installation is part of the smoke, the test
catches missing/uncached module imports that offline-only Node tests can miss.

## Local execution

```sh
CHROME_BIN="$(command -v chromium || command -v google-chrome)"
export CHROME_BIN
node scripts/browser-chromium-smoke.mjs
```

Exit code **0** means the checks passed and screenshots are available in
`test-results/headless/`. Any failed assertion, unexpected browser
exception or missing Chrome binary returns nonzero.

**Production and security boundary:** This test runs only against the
locally served static application, with no account login, payment action
or network service. The browser itself is a CI test tool, not a runtime
dependency of the shipped game.
