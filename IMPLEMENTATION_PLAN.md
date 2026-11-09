# Implementation plan — stage 0

Read: README_FIRST, all seven docs, all five data JSON files, and the approved reference image. This archive is a specification, not source code. Document directives are implementation guidance under the user's explicit staged request; no platform publishing is authorized.

## Stage gates
0. Inventory and plan (complete). 1. Level 01 greybox, independent king, dual hover probes, inertia, debug, keyboard/touch, restart, reachable dock. Stop here for first delivery. 2. Persistent failure/rescue/checkpoint loop, test 30 retries before progressing. 3. Modules + L01–05 QA then L06–15. 4. Economy/save rewards. 5. Approved art/events. 6. Platform bridges/official SDK verification. 7. Device QA and distribution.

## Architecture and dependencies
Phaser 3, its bundled Matter.js, TypeScript, Vite; fixed 60 Hz engine managed explicitly. Physics and scene rendering are separate modules. Read supplied balance, levels, terrain JSON; no invented replacement balance. Small local MockBridge boundary; no SDK scripts or ads. Keep all 15 recipes available but instantiate only L01. Baseline 1280×720, responsive letterboxing.

Physics → contact/risk → camera/input/dock → stage 1 QA → state persistence and rescue in stage 2. No attachment constraint or per-frame position binding for king. Reset is the only teleport during stage 1.

## Data and risks
Balance values are tuning starts: Matter velocities use px/base tick, so convert to px/s for HUD and docking. Hover spring values need bounded forces and damping; do not directly fix pitch. Terrain recipes are intent and need explicit collision generation. World lengths in meters use 2.4px/m; L01 = 1200px. 300px checkpoint safety reservation compresses terrain: allocate at least one full safe segment around 576px, include gentle hills and dip outside it. Timing targets (80–120s) may conflict with short world/high speed; report measured behavior, don't claim target validated. Stage 1 has no economy, persistence, rescue UI, or events; this is an explicit stage boundary, not replacement rules.

## Minimum acceptance
Idle 40s stable; slow traverse reaches dock with king; braking can eject; geometric ground matches colliders; high speed does not clear; stable dock requires contact, <=30px/s, <=9°, 1500ms. Debug shows bodies, COM, probes, contacts, risk, fps and live tunables. Build plus browser tests and actual screenshot recorded. Real device and manual feel remain distinct from scripted browser QA.
