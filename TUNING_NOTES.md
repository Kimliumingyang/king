# Stage 1 tuning
Original design preserved under design-spec/data. Runtime data/balance.json changes only physics.ufo.horizontalForce: 0.026 → 0.0035. At the original force, Matter's force units caused a single tick ≈103 px/s acceleration, leading to rapid ejection during low-speed control. At 0.0035, browser real-contact traversal completes without reset/upgrade/rescue. This is provisional physics tuning, not a change to revival/art rules. Other initial balance values retained.

Hover damping sign follows screen +y down: downward velocity increases upward support. Left/right forces use actual body rotation. Forces and angular correction are bounded; angle is never assigned each frame. No king position/velocity assignment during gameplay. Fixed 60Hz update, maximum 50ms input delta avoids tab-return leaps.

One deliberate prototype layout: 320px flat checkpoint space (420–740), start flat, gentle hills, a 28px dip, terminal safe flat. Terrain profiles sampled at 10px; segments are visible and physical. In full stage 3, replace prototype layout with general module factory and collision/recovery-space validation for all levels.

Measured scripted route: 34.6s at target 35px/s. Design's 80–120s timing is unvalidated; keep original star timing unchanged and retune only with player testing.
