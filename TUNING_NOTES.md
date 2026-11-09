# Stage 1 tuning
Original design preserved under design-spec/data. Runtime data/balance.json changes only physics.ufo.horizontalForce: 0.026 → 0.0035. At the original force, Matter's force units caused a single tick ≈103 px/s acceleration, leading to rapid ejection during low-speed control. At 0.0035, browser real-contact traversal completes without reset/upgrade/rescue. This is provisional physics tuning, not a change to revival/art rules. Other initial balance values retained.

Hover damping sign follows screen +y down: downward velocity increases upward support. Left/right forces use actual body rotation. Forces and angular correction are bounded; angle is never assigned each frame. No king position/velocity assignment during gameplay. Fixed 60Hz update, maximum 50ms input delta avoids tab-return leaps.

One deliberate prototype layout: 320px flat checkpoint space (420–740), start flat, gentle hills, a 28px dip, terminal safe flat. Terrain profiles sampled at 10px; segments are visible and physical. In full stage 3, replace prototype layout with general module factory and collision/recovery-space validation for all levels.

Measured scripted route: 34.6s at target 35px/s. Design's 80–120s timing is unvalidated; keep original star timing unchanged and retune only with player testing.

## Stage 3 supersedes prototype layout
The general module factory replaces the L01-only coordinates above. Current physics/scale and collision clearance changes are documented precisely in QA_STAGE3.md; original data under design-spec remains unchanged. No change to once/run free rescue or always-free checkpoint policy.

## Stage 4 difficulty pass
See data/difficulty.json and QA_STAGE4.md. Base material/mass and free-revive policy unchanged; route density, gap spans and warned hazard pressure increased. Fixes to Boost in DANGER and bounded free-flight altitude control prevent the broader gaps from becoming accidental rocket/death traps. Original user spec is preserved under design-spec; runtime gap bounds now reflect 165–250px.
