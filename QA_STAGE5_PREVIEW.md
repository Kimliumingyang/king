# Stage 5 preview QA · v0.5.0

Scope: Level 1 visual sample and shared UI/UX walkthrough. Stage 5 is not fully complete: six king_events and final animation/world art remain pending. No change to physics.ts, session.ts, progress.ts, save.ts, data/, or design-spec/.

## Build and browser checks

- `npm run build`: passes TypeScript and Vite production build. Existing Phaser bundle size warning remains (about 1.28 MB JS / 355 KB gzip); no new dependencies.
- Fixed build served on localhost:4186 for regression. Last Escape/Cancel handling and mobile review-status placement checked against final immutable production copy on localhost:4187.
- Core physics: 11 passing checks including L01 zero-upgrade traversal, independent King sliding/ejection, high-speed docking rejection, boost, keyboard/touch release, pause and restart.
- Rescue/save lifecycle: 20 passing checks, including 30 consecutive failures/retries, used-ticket persistence, 1-second rescue / 2.5-second protection, 30-second blur pause, damaged copies, stale tabs and blocked storage.
- Economy: 18 passing checks including real garage purchase, unchanged current-run tuning, duplicate settlement prevention, star rules, mission/daily claims, migration and damaged-storage behavior.
- UI walkthrough: 8 passing test groups, including all eight screens at 1280×720, 844×390 and 390×844 (24 screenshots), exact persistent-storage equality during review, real rescue interaction, correct home/garage Back flow, modal Tab loop and Space activation, zero browser runtime exceptions.
- Final build smoke: SVGs load, Escape resumes pause, Escape cancels restart, desktop/landscape capture, zero runtime exceptions.

Run `TEST_URL='http://localhost:PORT/?debug=1' npm test`, `npm run test:economy`, `npm run test:revive`; run `TEST_URL='http://localhost:PORT/' npm run test:ui` for review flow. Screenshot artifacts and JSON results are in evidence/stage5-*.

## Important test fixture detail

The first save-isolation test compared a normal document's storage before navigating away. Its existing pagehide/blur autosave legitimately increments revision during navigation. The corrected test takes the baseline after the review document loads, then compares exact storage values after all review interactions. No app persistence logic was weakened.

## Limits

- Artist review is required; editable SVGs are visual samples, not a claim of final hand-drawn polish matching the approved illustration.
- Desktop and mobile layouts were exercised in Chromium with resized viewports. Physical iOS/Android device testing and Safari are not claimed.
- Portrait preserves the 16:9 game canvas; landscape is the preferred play orientation.
- Stage 4's 45 all-route ability runs remain the difficulty baseline. This visual-only preview reruns L01/core regression; it does not claim a fresh 45-route suite.
- Audio, sound settings, six humor events, real platform SDK and advertisements are outside this preview.

## Change / file summary

Changed main.ts rendering, menu focus/back routing and isolated review navigation; extended shared CSS, page metadata and package version/scripts. Added src/art.ts, six SVG assets, Vite asset types, tests/ui-review.mjs, ART_HANDOFF.md, UI_REVIEW.md and this QA report. Updated README/TASKS and checked-in play/ production output. Added stage5 screenshot/JSON/log evidence. No physics or balance config files changed.
