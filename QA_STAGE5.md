# Stage 5 QA · v0.6.0

Scope: all six King events, replaceable animation states, crown warning/drop, three layered worlds, audio routing/fallback/mute, artist handoff, and user-requested harder terrain/slipperier King in all15 routes. User final originals/recordings remain pending. Stage6 SDK/advertising is not included.

## Verified

| Suite | Result | Evidence |
| --- | --- | --- |
| Build | TypeScript + Vite pass; no new dependencies | production under play/ |
| Zero upgrades |15/15 clear, no rescue/retry | stage5-final-zero-level-results.json + input traces |
| Basic upgrades |15/15 clear, one actual checkpoint rescue/route | stage5-final-basic-level-results.json + traces |
| Maximum upgrades |15/15 clear, no rescue/retry | stage5-final-max-level-results.json + traces |
| Core physics/input |11 checks pass | stage5-final-physics-results.json |
| Rescue/storage |20 checks pass, including30 consecutive retries,30-second blur pause, corruption/stale-tab/blocked-storage paths | stage5-final-revive-results.json |
| Terrain |11 checks pass, including all12 modules and all configured checkpoints | stage5-final-terrain-results.json |
| Economy |18 checks pass; payment/settlement/mission/daily idempotence, upgrade snapshots and backup migration | stage5-final-economy-results.json |
| Events / crown / mute |13 groups pass: seeded six-event coverage, unlocks/cooldown/safety, six real warning/effect/save/restore paths, gentle assistance, crown-before-King, mute persistence | stage5-final-events-results.json |
| Asset replacements |6 groups pass: real replacement sheet/frames, unchanged collider/mass, missing crown/MP3/catalog fallbacks, all three world layer switches | stage5-final-asset-results.json |
| UI |8 groups pass;10 screens×3 viewports =30 captures, save isolation, keyboard focus and rescue flow | stage5-final-ui-results.json |
| Careless handling |full throttle + continuous Boost loses on15/15 routes | stage5-final-careless-results.json |
| Visual smoke |3 worlds,6 event poses, crown-first screenshot, landscape, no runtime errors | stage5-final-visual-results.json |
| Downloads |ZIP CRC passes; reference/docs/source/empty upload directories included; XLSX XML valid and opens with openpyxl;112 rows (111 assets+header) | game-assets/downloads/ |
| Catalog |111 unique named slots; enabled assets validated by assets:check | game-assets/asset-manifest.json |

Data, JSON results, input traces, screenshots and logs are in evidence/. Browser tests use immutable production copies on local ports. The final release candidate on4193 repeats all45 ability routes plus event/asset checks; prior4191 production copy exercises core/rescue/economy/terrain/UI with the same handling settings. Final metadata-only qaStatus update is built and smoke-checked before publish.

## What the input proofs mean

They are explicit repeatable sequences of left/right/Boost inputs, using actual Matter collisions and the real Session path. No normal-game autopilot, position correction or King/UFO constraint is added. They establish feasible routes, not human completion rates. For L15, maintained momentum across repeated waves is safer than always crawling; with maximum upgrades on L04, enter the final ramp at a steady75px/s instead of accelerating mid-slope. Input traces include those strategies.

The careless full-throttle test demonstrates that constant drive/Boost no longer constitutes a winning strategy. It does not estimate player failure percentage. Physical King sliding/ejection and crown detachment are separately exercised under hard braking.

## Bugs found and corrected

- Warning countdown could become slightly negative at event firing; strict run validation then refused saves/rescue. Clamp to0 and assert an actual committed save for every event.
- Restore schedules/cooldowns without replaying a half-finished impulse at a checkpoint. Keep failure assistance in saves; downgrade the next physical event after repeated failure, consume assistance once per failed attempt, reset consecutive count on success.
- Three TileSprites were resetting textures every frame. Cache the world texture and only rebuild on a world/replacement change.
- Integration test now checks TileSprite.displayTexture rather than its generated backing texture.
- Economy assertion now expects new base friction0.25 while still verifying grip's real24% maximum bonus.

## Boundaries

All visuals are original editable sample SVGs plus procedural animation/particles and synth cues. External artist asset switches remain off until files arrive and are checked. The111-item handoff is a production request list, not a claim that111 finished originals have been delivered. Background/character/audio automatic slots are exercised; terrain skins/FX/UI icons require final alignment after upload, documented in the kit.

No physical iOS/Android/Safari testing or measured mobile FPS claim. Viewports1280×720,844×390,390×844 are tested in Chromium. Final artist style/animation/mix approval remains. Existing Phaser chunk warning remains (~1.30MB JS,~363KB gzip). Game initial load does not fetch the1.8MB optional download ZIP. No real SDK/ads are enabled.

## Changed and added files

New runtime modules: src/king-events.ts, audio.ts, asset-loader.ts, scenery.ts; extended art.ts/main.ts/physics.ts/session.ts/save.ts/progress.ts/style.css. New nine world SVGs, data/stage5_tuning.json, game-assets/asset-manifest.json and downloads/, asset-kit/ handoff files, scripts/ catalog/ZIP/validation generators, events/assets/handling/visual tests. Existing level/economy/UI tests updated to the new handling and screens. Updated balance/terrain/difficulty/qaStatus, Vite public directory and package scripts/version; design-spec/ untouched.
