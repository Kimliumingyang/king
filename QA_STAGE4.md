# Stage 4 — economy, upgrades, persistence and difficulty

Version 0.4.0, 2026-11-09 Pacific/Auckland. This stage also implements the user's explicit request to make existing routes less flat. Approved art direction and the once-per-run free rescue / always-free checkpoint policy remain unchanged. No real ads, SDK, account login or final character-art work.

## Economy and save boundary
src/progress.ts now stores a schema-v2 permanent profile: wallet, five upgrade levels, stars, best times, unlocks, completed routes, claimed first clears, missions, settings, daily date/time and immutable per-run settlement receipts. Run state retains the original storage key and upgrade snapshot. src/game-save.ts coordinates the run and profile stores; src/storage.ts provides Local-compatible and Memory adapters plus verified staging/main/backup commits. MockBridge implements the abstract save port only; there is no real cloud SDK.

Delivery settlement atomically updates wallet, receipt, first-clear flag, stars/records, unlock and optional daily claim in one profile. Recovery of a completed run retries that same receipt, so reloads and repeated callbacks do not pay again. An incomplete staged purchase recovers as one transaction; a stale displayed upgrade tier cannot be charged as a different tier. Permanent save failures do not charge a purchase or advertise a confirmed payout; free gameplay/checkpoint routes remain available. Invalid profile copies are retained and reported, rather than silently replacing a confirmed wallet with a fresh one.

Old stage-3 unlocks migrate, with no fabricated payment for all historical routes. A current completed but not yet economically settled run can settle once. Mock restore rejects older snapshots and incompatible newer forks that omit local receipts, purchases or irreversible claims; compatible newer state merges best stars/times monotonically. Same-run rescue usage/claimed pickup IDs are retained on restore. Real platform cloud integration remains stage 6.

Rewards/prices follow balance.json: base 100 + 20*(level-1), first-clear 80 once/level, pickup cap 100, three-star bonus 40/run; upgrade price round(base*1.65^currentLevel/10)*10. Checkpoint loss affects temporary coins only. Three-star eligibility requires gold time, no rescue/retry, dangerCount<=2; silver allows <=1 rescue; completion always gets at least one star. No star gate on unlocking.

Upgrades use immutable runUpgradeSnapshot values: engine +5%/level, stabilizer +8%, grip +6%, battery +9%, rescue kit +0.3s grace. Caps 4/4/4/4/3. They apply on a full restart/new route and survive checkpoint retry as the existing snapshot. The kit never grants another free rescue. No king position binding or ghost collision is introduced.

Three once-only missions (L01/L03/L05) and a daily L01 weaker-Boost flight are configured in economy_rules.json. Daily bonus +100 requires no rescue/retry. Payout dates follow the player's local calendar, with a configurable 18h UTC gap protecting rapid date/timezone advances; this can delay an adjacent-midnight bonus. Normal route replay/standard coins remain available while the optional daily bonus is not ready.

## Difficulty changes and rationale
- Curated extra modules are defined per route in difficulty.json; the base recipe/order is retained. L01–02 keep their module counts for onboarding. Late L15 grows from 6 to 10 modules; occupied terrain rises from 24.1% to 38.2%, and the longest inter-module flat falls from 1830px to 865.6px.
- Parameter sampling uses more of the designed amplitude/slope ranges instead of only the bottom 30%. Late waves, dips and climbs need speed choices.
- Gap widths are now 165–250px, with L05 at 215px and late routes at 250px, rather than gaps narrower than the 200px hull. The runtime terrain bound is synchronized to those values. Moving-platform openings are 300px. A short planned Boost now matters.
- Wind strength rises from 12% to 28% of its configured maximum, seesaw hover reaction from 0.5 to 0.65, and mushrooms emit one warned 220ms lift pulse with a 14px surface profile. Checkpoint/dock safety regions and minimum recovery distances remain protected.
- A backwards-feasibility placement pass retains safe checkpoint/dock regions while packing the denser routes. It throws for an over-capacity recipe rather than silently overlapping a landing.
- Broader gaps exposed a previous free-flight bug: constant thrust could launch both bodies out of view, while DANGER could cancel held Boost. Live RUNNING/DANGER input now continues; free-flight Boost uses bounded spring/damping against the last measured ground altitude, and still supplies zero support without Boost. This is force control, not teleporting actors or inventing collidable ground.
- Rescue anchors require a small horizontal support margin. Maximum gap width is chosen so a collision-safe position remains within the specified 10m backtrack. Rescue still preserves the broken world; checkpoint retry rebuilds it.

## Evidence and verification
All functional tests ran against an immutable production build. Final cosmetic panel changes were followed by the complete economy/UI regression. The final gap-bound metadata change was verified to generate sections exactly identical to all 15 recorded zero-upgrade routes (stage4-final-layout-check.json).

- 45 route traces: stage4-{zero,basic,max}-level-results.json and corresponding input-traces.json. All 15 routes pass with zero upgrades/no rescue; basic upgrades with one deliberate fixture-induced rescue; and maximum upgrades/no rescue. Different ability/route configurations use appropriate real input strategies. Fixtures initialize upgrades; they do not represent organically earned purchases. During traversal, only direction/Boost are applied; collision and independent bodies stay enabled.
- 18 economic checks: stage4-economy-results.json. Actual garage buttons, prices/caps, all actual physics effects, immutable snapshots, one rescue even with max kit, first-clear/receipt/mission idempotency, star/record rules, local-day/clock guard, backup/staging recovery, quota refusal, damaged-profile handling, stage-3 migration, Local/Memory/Mock ports and conflict protection. Payment fixtures isolate accounting; physical full-route completion is verified separately above.
- 11 terrain checks: stage4-terrain-qa.json, covering all 30 checkpoint spawns, dynamic rescue, bridge persistence/reset, warning suppression, roof collision, deterministic geometry and actual ground/collider alignment.
- 11 baseline physics/input checks: results.json, including independent braking/ejection, idle, real DOM input, pause and high-speed finish rejection.
- 20 rescue/save regression checks: stage2-results.json, including 30 repeated failures/retries and 30s blur pause.
- Difficulty comparison: stage4-difficulty-comparison.json. The original stage-3 controller cleared 15/15 then, but clears 11/15 now (fails L04/L05/L14/L15). New tactical zero-upgrade routes clear 15/15. This is a comparison of specified scripted strategies, not a measured player failure rate or difficulty percentage.

Screenshots: stage4-reward.png, stage4-garage-desktop.png, stage4-garage-mobile.png and stage4-missions.png. Desktop/mobile-emulated panels were visually inspected; final reward choices fit in a compact grid, garage cards scroll and Back remains accessible.

## Remaining limits
No human full-route study or real phone performance testing. Times are controller times, not first-player data. No claim that every strategy is safe or every route is already optimally balanced. Daily challenge uses one configured existing route/rule. Storage is local and origin-scoped; Local/Mock save-port validation is not a live platform-cloud integration. Final sprites/animation/audio remain stage 5; real SDK/ads remain stage 6. Do not treat this as release certification.

## Final packaging
Build: TypeScript + Vite PASS, 1.277MB JS / 354KB gzip, size advisory only. 105 passing checks/route results (18 economy, 45 routes, 11 terrain, 11 core, 20 rescue/save), plus the old-policy comparison. Production JavaScript index-Dur52oAU.js; SHA-256 070295726c61d96b05a5d4b3061a5b55815fda3377fef0e3b24ba72821cd070f.
