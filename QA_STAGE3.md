# Stage 3 — terrain, routes and progression

Version 0.3.0, 2026-11-09 Pacific/Auckland. Scope: stage 3 only; economy, upgrades, final character art and SDKs remain later stages.

## Sequential gates
The initial L01–L05 build passed zero-upgrade/no-rescue real-input physics traversal before dynamic L06–L15 work began (evidence/stage3-gate-L01-L05.json). After expanding, final routes are tested again against the production build. The original 15 seeds, level meter lengths, checkpoint meter positions and terrain recipe order remain. Layout is deterministic, spreads modules across each route, reserves 340px flat checkpoint regions and 220px recovery between early hazards / 180px late recovery. Checkpoint safety and endpoint flat zones are excluded from major effects. L08 and later explicit combinations are defined in data/layout_rules.json.

## Implementation
- src/terrain.ts: all 12 module geometries, seed-derived bounded parameters, gap cutouts, reserved safety regions and layout validation.
- src/physics.ts: actual static colliders, dynamic seesaw with pivot/stops and hover reaction, translating/oscillating platform, three physically falling bridge pieces, warned mushroom lift, magnetic hover variation and crosswind. Probes read actual dynamic polygon surfaces and return no support over empty space. King/UFO remain independent.
- Safe rescue reuses the current world: broken bridges stay broken. Checkpoint retry rebuilds a deterministic hazard layout. Initial spawn must be clear of colliders; normal resting contacts after gameplay are accepted only at ordinary solver penetration depth, rather than being incorrectly treated as spawn overlap.
- src/progress.ts and session/save integration: separate versioned route unlock record, NEXT/CHOOSE LEVEL, run save validation for every level, migration of stage 2 coordinates, no reward payments.
- UI: level/route names, variable distance/checkpoint HUD, route selection and locks, hazard hints and zones, platform travel/COM/probe overlays and QA route selector under ?debug=1. Shapes remain placeholders, using the approved muted palette; no concept image used as a background.

## Necessary tuning (original spec remains under design-spec)
- pixelsPerMeter 2.4 → 6. A 1200px first level cannot fit the specified modules, 300px checkpoint plateau and recovery zones; 3000px can. Meter lengths and seeds unchanged. Legacy missing-scale saves use 2.4, convert failure/best world positions, and preserve run IDs, checkpoint IDs, elapsed time, claimed pickups and spent rescue.
- Low tunnel clearance range 185–205 → 235–255px. Default hover + king height + deck requires about 217px. New normal headroom permits passage; Boost still physically hits the roof.
- hoverDamping 0.0014 → 0.006 and Boost height ramps at 62px/s: avoids an abrupt target-height step tossing the king for longer than the grace window.
- King linear air drag 0.008 → 0, separate angular damping 0.06: avoids long continuous low-speed routes losing the king through differential drag. Dynamic/static friction stay 0.45/0.63, mass unchanged. Normal contact friction and inertial sliding remain real.
- UFO pitch torque uses inertia-scaled bounded gains and a bounded 0.8 torque trim on flat supported ground. It compensates persistent off-center load, never assigns angle or king coordinates. It does not restore king position. Edge-loaded high-speed braking still causes true ejection.
- Docking additionally requires king relative speed <=30px/s and angular speed <=1rad/s. Actual deck contact and 1500ms stable boat conditions remain required.

## Test method and evidence
Linux Chromium/Playwright, fixed 60Hz physics. Production preview is tested, not just a dev server. The route controller supplies only direction and Boost; it never teleports actors, disables collisions, grants upgrades or rescues. It uses slow movement for early routes, higher speed/short boost across dynamic gaps, and braking at tunnels/seesaws. L14 uses a measured 55px/s cruise strategy. Inputs/positions sampled every 30 ticks are retained in stage3-input-traces.json. This proves one reproducible playable route per level, not that every input strategy or time seed is safe.

- stage3-level-results.json: 15 actual stable dock completions, zero rescues/retries, all 30 checkpoints activated; measured seesaw angle checked against 17° + solver tolerance.
- stage3-terrain-qa.json: locked routes and persisted unlock/NEXT; seeded layout repeatability; all module coverage; ground/collider alignment <5px; every checkpoint spawn zero velocity, no overlap, 120 neutral frames safe; moving-platform safe alignment interval <=4s; real roof collision; eight dynamic-support rescue tests; preservation of broken bridges during rescue; free checkpoint reconstruction; warning/protection/zone suppression; legacy save migration preserving spent rescue.
- results.json: baseline 11 checks, including 40s idle, independent slide, edge-loaded hard-brake ejection, high-speed finish rejection, input/pause/restart.
- stage2-results.json: stage 2 regression including 30 retry cycles, interrupted/corrupt saves, storage failure, 30s blur pause and stale-tab rejection after storage synchronization. Crash fixtures prevent clean unload autosaves from repairing the intentionally damaged save before load.

Screenshots include stage3-L04/L08/L15-docked, stage3-moving-platform, stage3-level-select, stage3-mobile-level-select. Screenshots visually inspected for collision alignment, HUD and control accessibility.

## Limits and next gate
No real phone or human complete 15-route playthrough. Simulated times are route-controller times, not first-player session data; star timing unchanged. No upgraded runs yet: upgrades are stage 4, so the original three-upgrade-state release matrix remains pending. No actual SDK interruption or platform certification. localStorage is client state, not server-side anti-cheat; origins have separate saves. Stage 4 is pending. Do not claim full release QA from this stage.

## Delivery validation
Build: TypeScript + Vite PASS, 1.261MB JS / 349KB gzip, chunk-size advisory only. 57 checks/route results PASS: core 11, levels 15, terrain 11, rescue/save 20. Restore/NEXT regression includes ignoring delayed same-document storage notices rather than falsely showing a cross-tab conflict. Final restore suite ran against an immutable static build directory after fixing test-server rebuild interference; no deployment artifact changed during the final suite. Real device/human QA remains pending as above.
Production JS: index-S78KUogi.js; SHA-256 005b2785402b19f92d2184a73a4b0016d1f19ac95540c3e8eacc43726c05e872.
