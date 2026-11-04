# v7 next feature: interactive nets as first-class rink objects

Status: design plan only — **not implemented**. Keep current static goal drawing and existing scoring behavior until the replacement passes acceptance testing.

## Objective
Replace the grey line-art goals baked into the rink SVG with editable, persistent **Net** objects. Net location, orientation, geometry and puck contact must become one coherent source of truth for rendering, puck trajectories, and goal detection.

## Data and renderer
- Maintain a typed `net` equipment entity with position, rotation, dimensions, ID, and target side. Preserve save/import/export and variation isolation.
- Spawn the two regulation nets for a newly created play from defaults, with consistent full-rink and half-rink mapping. Do not make a `New` click result in an unusable goal-less rink.
- Render net objects above the rink as top-down SVG with visible posts, crossbar and back mesh; provide selection, move, resize and rotate interactions, consistent with other rink objects.
- Remove the old baked-in grey net outlines *only when* replacement nets render reliably in both full and half rink modes. Avoid double rendering.

## Puck and scoring
- Derive goal mouth, goal line and facing orientation from each net object rather than hardcoded x/y lines. A shot scores only after the puck actually crosses the configured mouth/plane in the proper direction.
- Distinguish posts (hard bounce), outside net/cage (stop/deflection), and a successful goal (capture/celebration); physics must respect net rotation and scale.
- Explicitly define shot `ignoreObjects` semantics for nets: ignore training obstacles for an elevated puck, but do not let this switch make goal nets intangible or fabricate goals.
- Net movement should immediately update scoring, preview, and routes without breaking existing saved plays.

## Acceptance gate
1. Default play: exactly two visible nets, no ghost grey outlines.
2. New clears movable equipment but restores two default nets; Undo restores the previous configuration.
3. Goal vs post vs outside-net vs miss scenarios, both rink directions.
4. Move/rotate net; repeat the above scenarios against the new geometry.
5. `ignoreDefense` and `ignoreObjects` shots, including elevated clearances, follow correct net scoring rules.
6. Save/reload, variations, half-rink view, selected object handles, tablet/Pencil, and production rollback.
7. Staging browser acceptance before any production consideration.

Implementation recommendation: finish the current shot-collision option fix and functional acceptance first, then put net replacement on a separate feature branch or tightly scoped commit series.
