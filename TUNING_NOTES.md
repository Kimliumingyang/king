# Stage 1 tuning
Original design preserved under design-spec/data. Runtime data/balance.json changes only physics.ufo.horizontalForce: 0.026 → 0.0035. At the original force, Matter's force units caused a single tick ≈103 px/s acceleration, leading to rapid ejection during low-speed control. At 0.0035, browser real-contact traversal completes without reset/upgrade/rescue. This is provisional physics tuning, not a change to revival/art rules. Other initial balance values retained.

Hover damping sign follows screen +y down: downward velocity increases upward support. Left/right forces use actual body rotation. Forces and angular correction are bounded; angle is never assigned each frame. No king position/velocity assignment during gameplay. Fixed 60Hz update, maximum 50ms input delta avoids tab-return leaps.

One deliberate prototype layout: 320px flat checkpoint space (420–740), start flat, gentle hills, a 28px dip, terminal safe flat. Terrain profiles sampled at 10px; segments are visible and physical. In full stage 3, replace prototype layout with general module factory and collision/recovery-space validation for all levels.

Measured scripted route: 34.6s at target 35px/s. Design's 80–120s timing is unvalidated; keep original star timing unchanged and retune only with player testing.

## Stage 3 supersedes prototype layout
The general module factory replaces the L01-only coordinates above. Current physics/scale and collision clearance changes are documented precisely in QA_STAGE3.md; original data under design-spec remains unchanged. No change to once/run free rescue or always-free checkpoint policy.

## Stage 4 difficulty pass
See data/difficulty.json and QA_STAGE4.md. Base material/mass and free-revive policy unchanged; route density, gap spans and warned hazard pressure increased. Fixes to Boost in DANGER and bounded free-flight altitude control prevent the broader gaps from becoming accidental rocket/death traps. Original user spec is preserved under design-spec; runtime gap bounds now reflect 165–250px.

## v0.6.0 · steeper roads, slippery King, crown warning

User explicitly requested all roads to be harder, steeper, and the King more prone to sliding/throwing; the crown should fall first. This supersedes the prior preview's request to freeze difficulty.

- Dynamic King/deck friction 0.45 → 0.25; static 0.63 → 0.38; King angular damping 0.06 → 0.035. Independent bodies, collider sizes and collision-based aboard/dock rules remain.
- Gentle hill amplitude 14–32 → 25–48px; wave amplitude 24–40 → 30–53px; ramp slope 14–23 → 22–31°; dip depth28–56 →38–69px. Parameter ranges progress with level; all 15 recipes become steeper. L01 gains one gentle-hill section; checkpoint and dock flats remain safe. L02's existing packed layout stays at three sections rather than shrinking its recovery zones to force an extra section.
- Crown warning above11° UFO tilt or risk>.5; detach after350ms above16° UFO tilt /24° King tilt /risk>.7. Decorative ballistic crown drops, bounces and fades; does not kill, spend coins or alter body mass. Real King contacts/friction/inertia determine falling. Emergency ejection also releases any remaining crown.
- Six deterministic events use the original data/king_events.json warnings, unlock levels, cooldowns and18s global interval. Impulses are below listed maxima, nap friction×.92 for2.3s, toast applies a brief force at an offset point, hurry never accelerates UFO. Seated fidget is a small independent-body torque, no positional constraint.
- Safe-event buffer uses width/2 + maximum configured response speed×1.5s, conservatively avoiding imminent major hazards. Suppress during checkpoint/dock/protection; cancel unsafe pending events. Restore event clock/cooldowns across save/retry; no event resumes mid-impact after a checkpoint reload. Failed-attempt counter makes the first subsequent event gentler after two failures.
- Fixed event-warning subtraction to clamp at0: a negative residual at firing otherwise failed save validation and blocked a committed rescue. Added real post-event save assertions for all six variants.
- Proof routes are recorded input strategies, not claims about human win rate. L15 requires maintained momentum across repeated waves rather than always slowing down; hard braking can still eject even with upgrades. Automatic gameplay assistance exists only in tests/review fixtures, never in the normal input path.
- Free Rescue remains once/run; checkpoint always free;1s magnetic recovery +2.5s collision-active protection, unchanged economy and upgrade costs.
