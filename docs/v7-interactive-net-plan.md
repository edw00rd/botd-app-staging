# v7 next feature: interactive nets as first-class rink objects

Status: **implemented on the `feature/v7-interactive-goals` branch; pending automated CI and staging browser acceptance, not production-approved.** The two fixed grey SVG goal outlines are removed in this branch. A fresh or legacy play receives two permanent goal-net objects; extra training nets remain independent.

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

## Implementation notes (Nov 4, 2026)

- Defaults: left net centered at (62,300), 0°; right at (938,300), 180°. Mouth width 86 and cage depth 26 in rink world units.
- `goalSide` survives normalize/save/import/variation; legacy state without net objects receives both defaults automatically. New restores them; Undo uses existing state history.
- Regulation nets cannot be deleted, but can be dragged, rotated, scaled and reset from the inspector. This differs from deletable "Extra net" training objects.
- Ray scoring requires a front-side mouth crossing between posts. Post, side mesh, and back mesh use net-specific geometry and preserve normal shot bounce physics. Ignoring training objects never makes regulation goals intangible.
- CI: `node scripts/validate-v7-goals.mjs`, `node scripts/validate-v7-foundation.mjs`, `npm run check`, manifest check and staging build. Browser acceptance remains mandatory before deployment or merge into a release.
