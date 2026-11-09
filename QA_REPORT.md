> Historical stage 0–1 report. Stage 2 history is in QA_STAGE2.md; stage 3 history is in QA_STAGE3.md; current stage 4 acceptance is in QA_STAGE4.md.

# QA report — stages 0 and 1

Date: 2026-11-09 (Pacific/Auckland). Environment: Linux, Node 24.22.1, headless system Chromium via Playwright, 1280×720 and emulated 844×390 viewport. No physical phone or human full-run testing. Evidence: evidence/results.json plus screenshots. Stage 0 review complete before implementation. Stage 1 scripted acceptance passes; manual gameplay feel approval remains open. Later stage features deliberately not accepted.

## Executed
- TypeScript check + Vite production build: PASS. Phaser bundled chunk 1.23MB / gzip 340KB; build gives size warning, no build error.
- 40 seconds fixed-step idle: PASS, actual king/UFO contact remains, relative horizontal drift -3.20px.
- Zero upgrade/no rescue traversal using only direction inputs and real collision: PASS in 34.6 simulated seconds, maximum UFO pitch 17.05°, no lost contact; stop within dock radius, maintain actual contact and required 1.5s.
- Hard braking: PASS, independent king relative position changes -40.66px → +85.34px, DANGER.
- Ejection: PASS, 150 forward ticks, 110 reverse, then coast 240. Off-deck exceeds 650ms, fails, fresh reset returns RUNNING. Failure is loss of contact, not merely world boundary.
- Full speed over dock: PASS, crosses without clearing (about 308px/s).
- Boost: PASS, energy consumes then recharges.
- Actual DOM keyboard release: PASS, movement occurs, no stuck key.
- Pause: PASS, simulation time unchanged while paused.
- Restart: PASS, confirmation displayed and reset works.
- Landscape pointer capture release: PASS in desktop emulation, not a physical mobile test.
- Runtime JS exceptions: none during the test.

## Evidence interpretation
Physics acceptance runs accelerate fixed steps in a browser; reported route time is simulation time, not wall time or player study. Screenshots were inspected for aligned collision overlay, visible king and UFO, probe lines, contact dots, HUD and control layout. Keyboard/pointer checks execute in real browser frames. No claim of continuous 60fps on real devices, full penetration proof, or manual 15-level completion.

## Not yet accepted
Stage 2: rescue, checkpoint restore, persistence and 30 retries. Stage 3: 12 modules/all levels. Stage 4: economy/upgrades. Stage 5: approved final character art, comedy/events/audio. Stage 6: SDK. No publishing or monetization was performed. Checkpoint flag is visual only. No claim that the original 20-scenario release checklist is complete.

Known issue/limitation: 34.6s scripted L01 is shorter than target 80–120s; player timing/feel tuning needed. End of map is prototype finite space. Stage 1 failure is immediate test menu; short ragdoll/rescue sequence belongs to stage 2. Browser background behavior has event-based automatic pause but 30s background device QA remains pending. Stage 1 uses original geometrical placeholders and approved palette, not final art.

## Change and file inventory
No Git checkout was supplied (git status reports not a repository), so no fabricated commit/diff is provided. New: src/{main,physics,bridge}.ts, src/style.css, index.html, package.json/lock, tsconfig.json, tests/physics.mjs, IMPLEMENTATION_PLAN.md, TASKS.md, README.md, TUNING_NOTES.md, this report, evidence screenshots/results, dist production output. Supplied spec retained verbatim in design-spec/. Five JSON runtime configs copied to data/, with one documented push-force tuning change. No other original specification changed.

## GitHub Pages packaging verification
Relative asset base configured in vite.config.ts; publicDir disabled to exclude local source ZIP downloads. Rebuilt production dist successfully and ran all 11 browser checks against local production preview on port 4173: PASS. Publishing explicitly requested by user after original stage delivery.

## v0.6.0 / Stage5

See [QA_STAGE5.md](QA_STAGE5.md):45 route proofs, event/crown/asset/audio tests, existing physics/rescue/economy/terrain regressions,10-screen UI review at three viewports, download/archive validation. Final artist files/recordings and physical-device QA remain explicit follow-ups. The approved design archive is unchanged.
