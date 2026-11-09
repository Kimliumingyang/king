# Stage 2 — failure, rescue and checkpoint acceptance

Build: 0.2.0. Date: 2026-11-09, Pacific/Auckland. Browser: headless system Chromium/Playwright on Linux; Node 24.22.1. No real mobile device and no human full-run recording. Native DOM controls plus fixed-step browser physics tests; screenshots visually inspected. No actual advertising SDK included.

## Changes
- src/session.ts: run lifecycle, checkpoint detection, once/run rescue expenditure, save-before-animation, temporary coins/claim set and retry loss.
- src/save.ts: validated schema, staging/main/backup saves, globally increasing revision across runs, recovery of interrupted writes, irreversible claim merge, stale-tab save rejection, clear errors for blocked/corrupt storage.
- src/physics.ts: collision-tested recovery anchors, zero-velocity body respawn, DANGER → KING_EJECTED → FAIL_MENU, short real rigid-body failure flight, frozen UFO, limited 2.5s stabilization after rescue. King body is independent outside the explicit respawn/animation state; protection never disables collisions.
- src/main.ts/style.css: PLAY/CONTINUE, failure summary, rescue/free checkpoint/restart controls, checkpoint/rescue/save chips, warning meter, skip, magnet/crown recovery, retained touch/keyboard/debug controls.
- data/prototype_stage2.json: only three test pickups and animation/save timing; unchanged original revival limits and original level/terrain recipes.

## Acceptance and evidence
The test script tests actual grace and state transitions. It reaches checkpoint 240m using drive/brake input first, then uses debug-only fixture displacement to induce failures across eight terrain x positions. For every one of 30 cycles: no body-terrain intersection at spawn, UFO/king velocities zero, checkpoint at x576px, no immediate refailure after 90 neutral ticks, same run ID, used rescue preserved, temporary coin loss exactly floor(previous * 0.8), duplicate pickup rejected. These are L01 repetitions, not 30 distinct terrain modules or levels.

Other executed cases and exact outcomes: evidence/stage2-results.json. Existing physics regression: evidence/results.json. Evidence images: stage2-failure-desktop.png, stage2-rescue-magnet.png, stage2-failure-landscape.png. Tests exercise live DOM buttons for rescue/retry/restart and view layouts at 1280×720 and 844×390. No ad buttons are created; no-ad free continuation is tested. Real SDK interruption cases remain stage 6.

Atomic persistence: ticket is written before body reconstruction; refresh mid-animation recovers at checkpoint with ticket spent. Damaged main key loads valid backup; higher revision staging wins after a simulated interruption. All-invalid saves are retained until explicit new run. Quota errors block an unrecorded rescue while leaving free checkpoint gameplay available. Browser storage access denied at startup is handled without a crash. Two-tab conflicts pause the UI and require loading current state; stale snapshots cannot overwrite a newer run.

Protection is not invulnerability: reduced drive and extra bounded stabilization for 2500ms; same collision filters and failure grace. The test verifies normal contact returns and the timer expires, rather than asserting that protected players cannot die.

Permanent wallet/upgrade/star settlement are not implemented or paid in this stage. A sentinel unrelated wallet key is preserved through all 30 retries; this does not constitute stage 4 economy acceptance. Pickup prevention is implemented and tested; distance reward farming is absent because no distance payout exists.

## Remaining limits
Art is geometric, not final approved character sprites. L01 timing still provisional. No new terrain module, unlock, star score, permanent reward, upgrade, real ad, or cloud-save feature is claimed. Actual background OS process termination, physical mobile gestures/performance, all-platform SDK interruption and 15-level reachability remain unverified. User-editable local storage is not server-side tamper protection. Save data is scoped to origin; the old private Sites mirror and GitHub Pages do not share runs.

Stage 2 is the current delivery boundary. Stage 3 requires a separate L01–05 terrain implementation/QA gate before L06–15.

## Final validation
`npm run build`: PASS (TypeScript + Vite, 1.243MB JS / 344KB gzip, size warning only). `npm test` against production preview: 11/11 PASS. `npm run test:revive`: 20/20 PASS, including 30 consecutive retry cycles and 30s blur pause. Additional production-build rescue/reload smoke: PASS.
