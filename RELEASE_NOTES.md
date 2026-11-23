# B.O.T.D. Hockey Playbook Studio — Release Notes

## V7.1.22 Preview — November 23, 2026 (staging only)

- Redesigned player entry announcements to match the supplied rounded, oval comic chat-bubble shape, with an unobtrusive white fill, thin gray edge, soft shadow, and short curved pointer instead of angular callout geometry.
- Kept visible-player pointers and bottom-edge directional notifications for players entering the far end of Half Ice. Text remains legible, centered and accessible.
- Added regression checks for bubble geometry, top/bottom pointer direction, compact widths, and preserved goalie view cues. No changes to existing plays, puck physics, whistle action, or production.

---

## V7.1.21 Preview — November 21, 2026 (staging only)

- Coaches and managers can now receive Give and Pass just like any skater or goalie. Updated all puck recipient filters, puck drop detection and physical collision participation.
- Added a cartoon whistle pill for coaches, alongside Move and Bench. Activating it generates a short two-chirp Web Audio whistle and a quick coach-token buzz with a friendly on-ice exclamation emote; it is presentation-only and respects reduced-motion accessibility.
- Added automatic role/recipient/whistle regressions and updated the reviewed source manifest. Production untouched.

---

## V7.1.20 Preview — November 21, 2026 (staging only)

- Fixed goalie placement by team, not camera view: Team A always in the left crease, Team B in the right crease. Backup goalies also remain within their own crease; existing saved coordinates are not moved.
- Introduced temporary speech-bubble announcements for every new on-ice player. The bubble points to a visible player, or sits at the rink bottom with a downward pointer and far-crease label when the player is offscreen.
- Maintained Half Ice skater formation, Full Ice positions, puck trajectories and stable saved-play schema. Added goalie and offscreen-announcement regression coverage. Staging only, production unchanged.

---

## V7.1.19 Preview — November 21, 2026 (staging only)

- Fixed Half Ice goalie/staff/skater artwork and the selected goalie outline to remain upright with its jersey number and optional badges. New goalie placements sit farther inside the visible crease.
- Centered action buttons for rink objects and pucks from displayed geometry; corrected net rotation handles and group rotate/remove/count positioning for both rink ends.
- Added camera-space geometry regression tests; preserved Full Ice placements, stored coordinates, puck paths and existing plays. Production unchanged.

---

## V7.1.18 Preview — November 21, 2026 (staging only)

- The goalie G position pill respects Settings → Positions, consistent with skaters. The jersey number still respects Settings → Numbers separately; staff C remains unchanged.
- F1, F2 and F3 are available as forward positions when creating and editing roster members. Bench order and Half Ice faceoff placements recognize them as left, center and right forward lanes.
- Added targeted regression coverage and kept saved-play storage format unchanged. Staging only; production untouched.

---

## V7.1.17 Preview — November 21, 2026 (staging only)

- Fixed Half Ice orientation of name callouts, skater/goalie/staff tokens, badges and controls. The view camera rotates visible art while maintaining full-rink world coordinates.
- Repositioned Half Ice player names in screen space with deterministic collision-aware labels. Screen-corner controls keep the same positions and upright icons on both left and right ends.
- New bench placements in Half Ice always appear in the visible end, using the upper-left end-zone circle for faceoff alignment: offensive center/wingers/points, defensive center/coverage, visible-crease goalies and safe-area staff.
- Preserved Full Ice placement and all existing on-ice routes/plays; added both-end geometry and UI regression coverage. Staging only; production untouched.

---

## V7.1.16 Preview — November 21, 2026 (staging only)

- Replaced immediate "New Skater" insertion with required **Player Properties** setup when choosing Add player; creating a skater, goalie, coach or manager now happens only after saving a valid name and role-appropriate attributes.
- Added team, position/line, number (players/goalies only), hand, leadership, and optional color overrides in the creation dialog. Cancel discards everything.
- Removed the editable number field and number text from coach/manager roster cards, ignored numbers on staff bench cards, and clear legacy staff numbers on rendering or conversion.
- Newly saved members are expanded, highlighted and scrolled into view in the alphabetized team roster, even when a search filter was active. Existing square C staff artwork retained.
- Added targeted regression coverage. Staging only; no saved-play schema or production change.

---

## V7.1.15 Preview — November 21, 2026 (staging only)

- All coach and manager staff tokens now use a square shape with a large, centered **C** in the configurable number color.
- Removed the HC/MGR role pill and horizontal stripe from on-ice staff artwork; bench and inspector icons and color customization preview display the same square C design.
- Kept names, staff roles, team palette, interactions and world coordinates unchanged. Added regression checks; production untouched.

---

## V7.1.14 Preview — November 20, 2026 (staging only)

- **Fixed:** a coach or manager could vanish from the bench without showing up on ice because its historical Y=64 spawn point lies beyond the physical rink (NHL top board near Y=96).
- Staff now spawn inside the selected rink geometry and inside the visible left/right Half Ice camera; team and role positions are distinct.
- The editor and saved-play loader recover exactly those historical defaults, without moving staff with custom positions or changing puck/play behavior.
- Added regression checks; staging only. No production or stored-play schema changes.

---

## V7.1.13 Preview — November 20, 2026 (staging only)

- Added a short **Give** button next to the puck's Pass/Shoot controls. Choose a puck and click Give, then tap any on-ice skater or goalie to assign immediate possession without a pass, shot, or travel path.
- Uses the native `possess` timeline event at the playhead, with explicit replacement if a puck was mid-flight; correctly targets Puck 1 or the selected additional puck, following the receiver's stick as they skate.
- Empty ice / staff cannot receive possession. Cancel exits targeting; while a puck is mid-flight, Give remains available but Pass/Shoot stay disabled.
- Includes targeted regression tests, visible staging version bump and checksums. Saved-play schema and production remain unchanged.

---

## V7.1.12 Preview — November 20, 2026 (staging only)

- **Fixed:** placing a divider pad or another rink object on a puck can no longer trigger the puck's drag/selection handler.
- The legacy and first-class puck pointer listeners now yield to equipment placement. Arming that mode also clears pending puck tap/drag state.
- Regression coverage verifies placement clicks on Puck 1, additional pucks and the puck remove-control target reach the rink-object handler without moving or deleting a puck.
- Intentional physical shot-path recalculation on equipment changes is unchanged. No changes to production, pass behavior or saved-play schema.

---

## V7.1.11 Preview — November 20, 2026 (staging only)

- Fixed a missed control-layout detail from V7.1.10: cone and tire size-cycle arrows now appear at the **upper-right**, with their clone + at the lower-right and remove − at the lower-left.
- Added a direct corner-position regression check. Rink goal controls, gray stretch handles and the hockey-stick toolbar icon remain unchanged. Staging only; production and saved-play format unchanged.

---

## V7.1.10 Preview — November 20, 2026 (staging only)

- Standardized selected rink-object action pills to one full-size 28-unit diameter and common geometry-aware corner anchors: **minus bottom-left**, **clone plus bottom-right** on ordinary equipment; for goals **clone plus top-left**, **reset top-right**, **minus bottom-left**, **net-size arrows bottom-right**.
- Rebuilt the length-stretch interaction for pads, bumpers, dividers, sticks and rebounders. Dragging now changes length relative to the initial grab rather than jumping to the handle's location; pointer updates remain active even after the floating controls redraw, and resized geometry is checked against the boards.
- Gave the stretch handle a distinct gray finish and double-ended arrow, leaving rotation handles blue/white.
- Replaced the Rink Objects toolbar diamond with a hockey-stick icon. Updated regression tests, checksums and staging version labels. Puck physics, saved-play schema and production unchanged.

---

## V7.1.9 Preview — November 20, 2026 (staging only)

- Widened the dashed player selection outline so it clears the position pill and C/A leadership marker without changing player size or the shared selection style.
- Shifted names above the expanded ring and positioned Move/Bench against measured name and ring bounds, with a top-edge fallback.
- Added geometry and floating-menu regression checks. No changes to puck physics, stored plays, billing, or production.

---

## V7.1.8 Preview — November 19, 2026 (staging only)

- Replaced piecewise-constant puck animation with smooth, physically decelerating travel between contacts; keep sharp directional changes only at genuine impacts.
- Included object-collision clearance displacement in playback timing to prevent small visual jumps.
- Reused computed puck timelines throughout each playback session to eliminate repeated expensive collision simulation during animation, with automatic invalidation on stop/restart and bypass during editing/video export.
- Added 120 Hz progress-continuity and per-puck cache regression coverage. Staging only; production remains unchanged.

---


## V7.1.7 Preview — November 19, 2026 (staging only)

- Replaced shallow-shot wall following with angle-correct board reflections on the inset puck-center ice boundary.
- Decomposed board, goal-post and net impacts into normal restitution and tangential damping; used remaining kinetic energy for rebound distance.
- Added friction-aware shot playback timing, consistent aiming preview, and automated diagonal, perpendicular, grazing and curved-corner banking tests.
- Versioned staging only; production and saved-play schema unchanged.

---

## V7.1.6 Preview — November 19, 2026 (staging only)

- Increased skater number font from 14px to 21px and goalie number font from 16px to 24px (1.5×), leaving token sizes unchanged.
- Centered position-label glyphs optically within the original pill geometry, with fit adjustments for abbreviations.
- Preserved C/A letters, name styling, saved-play compatibility and production isolation. Updated tests and version indicators.

---

## V7.1.5 Preview — November 19, 2026 (staging only)

- Increased the captain (C) and alternate (A) on-token letter font from 12px to 20px, compensating for the player symbol's small rendered scale.
- Retained original leadership marker position and outline, role/position badge dimensions and placement, and the lighter V7.1.3 name treatment.
- Updated staging version and automated regression assertion. No production deployment or stored-play schema changes.

---

## V7.1.4 Preview — November 19, 2026 (staging only)

- Slightly enlarged on-ice Captain (C) and Alternate (A) letters from 10px to 12px in the original V7.1.1-style token markers.
- Preserved the existing location, badge styling, position markers, smaller player names, goalie behavior, and full/half ice rendering.
- Incremented the visible UI version and added a font-size regression assertion. Staging only; no production, saved-play schema, or backend changes.

---

## V7.1.3 Preview — November 19, 2026 (staging only)

- Reverted the V7.1.2 position badges to their V7.1.1 shapes, dimensions, type, positioning, scaling, and half-ice behavior.
- Reverted captain/alternate indicators to the original compact on-token C/A lettering. Removed the gold leadership chips and their independent geometry and styling.
- **Kept the V7.1.2 smaller, medium-weight player names and thin white outline**, as requested.
- Added regression tests to guard against reintroducing the detached position badges or gold leadership chips. No data, saved-play format, payment, or production changes.

---

## V7.1.2 Preview — November 19, 2026 (staging only)

- Rebalanced player name labels: smaller 8.6-unit text, medium 550 weight, and a restrained 1.5-unit white readability halo instead of the former heavy bold/3-unit outline.
- Moved position badges out of scaled player-token artwork, allowing uniform legible badge sizes and darker high-contrast text across LW, C, RW, LD, RD, G and staff roles.
- Rendered Captain (C) and Alternate (A) leadership indicators as separate gold/dark outlined rounded chips beside the player label, falling back beside the token when names are hidden.
- Counter-rotated role and leadership badges in half-ice mode so their text stays upright, without changing underlying player positions or routes.
- Added regression tests for badge positioning, label weights, badge presentation and the updated V7.1.2 version. Staging only; play schema, production, billing and data storage unchanged.

---

## V7.1.1 Preview — November 19, 2026 (staging only)

- Removed the misleading gray **Bench** circle and label from the dedicated player/team color editor. It was not an accurate representation of actual bench tokens.
- Kept the single live **On ice** color preview, including goalie/staff token shapes, and preserved Primary, Trim, Numbers, Grid, Spectrum, Sliders, automatic number contrast, and Apply/Cancel behavior.
- Removed unused Bench-thumbnail styling and JavaScript updates; left real bench rendering and player bench actions untouched.
- Advanced the visible preview version to **V7.1.1 Preview** and added regression assertions. No changes to saved-play format, billing, database, or production.

---

## V7.1 Preview — November 19, 2026 (staging only)

**Status:** Staging preview, not promoted to production. The visible upper-left UI version is **V7.1 Preview**; the stable release and saved-play compatibility format remain **6.8.2**.

### Team and player color editing
- Teams and individual players now open the dedicated palette editor instead of the marker/drawing-tool color window.
- **Primary**, **Trim**, and **Numbers** colors are independently editable using **Grid**, **Spectrum**, **RGB sliders**, or a hex value. Preview both bench and on-ice tokens.
- Teams can set a default number color for their players. Player-specific number colors take precedence; otherwise number colors inherit the team setting or use automatic contrast.
- Changes are saved on **Apply colors** and discarded on **Cancel**. Team palette reset restores the sample team's defaults; individual reset restores team colors.
- Line pattern, marker width, drawing tools, and arrow ending remain exclusive to the drawing-tool editor.

### Other recent V7 staging work
- Added the optional **Optimized Player Movement** checkbox. Trace timing remains the default; optimized timing uses a game-like speed and supports individual Skate time adjustments.
- Aligned default center-ice faceoff players symmetrically to the faceoff dot, circle and blue lines.
- Matched on-ice player number typography to the compact bench appearance.
- Implemented group selection dragging and rotation; refined rink boundaries, net rendering, puck pile dispensing, and puck interaction previews.
- Added an explicit staging UI version in the upper-left header and began maintaining a dated summary in the README.

**Versioning policy:** Increase the visible V7.x staging UI version for subsequent accepted feature updates, and update both README.md and RELEASE_NOTES.md. The internal 6.8.2 compatibility version and stable production release remain independent. The staging Worker health identifier remains `7.0.0-preview.1-staging` until separately versioned and validated.

---

# Historical v6.8.2 — staging release candidate 1

Status: accepted feature scope; versioned candidate pending final staging deployment and health/browser verification before production promotion.

## Workspace and presentation

- Replaced the default center-ice artwork with the accepted transparent B.O.T.D. paw.
- Consolidated redundant top interface layers into a compact maximum-viewport header.
- Kept full screen at the far upper-right and retained New, Save play, billing, sign-out, account, subscription, and security information.
- Kept the signed-in account and Routes label visible at tablet widths with controlled truncation rather than hiding them.
- Restored compact Full Ice/Half Ice and offsides controls outside playable ice and reclaimed the former status-row height.
- Preserved the left setup/roster drawer in full-screen mode.
- Made pen color, eraser, and clear-telestration controls contextual to telestration mode.
- Kept playback centered and the bottom-drawer toggle anchored at the far right.

## Glow and interaction

- Replaced the outline-like effect with a soft, centered radial underglow beneath players and the puck.
- Increased default and maximum glow strength while keeping the low range subtle.
- Made Blink subordinate to Glow and hid inactive intensity/rate controls without reserving toolbar space.
- Improved Glow and Blink slider dragging for mouse, touch, and Apple Pencil with larger invisible hit areas, Pointer Events, and pointer capture.
- Preserved click/tap-to-jump, keyboard control, stored values, and edit/playback rendering.

## Deliberately deferred

- Drag-to-aim passing.
- Pass/shot obstruction behavior changes and the shot-power obstruction checkbox.

No database migration, authentication change, Stripe price change, or production configuration secret is included.

Health identities: `6.8.2-staging-v1` and `6.8.2-production-v1`.

Protected editor SHA-256: `663990061e69202a6c777d744be1e322f03f846b7c584539af56e48e9bf4f728`.


## Unreleased — V7 platform foundation preview

- Preserves the v6.8.2 animated clipboard as the default workflow.
- Adds compatibility-safe semantic movement metadata for player skating and puck actions.
- Adds first-class interactive rink objects: cone, tire, bumper, divider pad, training pad, extra puck, puck pile, stick, rebounder, and extra net.
- Reworks rink objects as self-contained geometry/physics entities with top-down rink-relative sizing, drag/axis positioning, rotation, resizing, and puck-response behavior.
- Cones/dividers/pads soft-block pucks; tires/bumpers/rebounders deflect them; nets stop them.
- Puck piles now dispense usable spare puck objects; a spare puck can become the active puck on a new route.
- Uses the rendered crease radius (48 board units) as the initial rink-relative calibration reference while retaining slight touch-friendly exaggeration.
- Adds v7 platform/data-model documentation and isolated branch validation.
- Editor SHA-256: `551d5d14a79081a3463f3c90e7290c97c5331142844cb44ad09903d2fa2b2acf`.
- This is staging-only feature work and is not a production release.


## V7 first-class goal objects — candidate, awaiting staging acceptance

- Replaced legacy grey net art with two permanent, editable top-down net objects in rink equipment state; retained separate movable extra nets.
- Moved goal line, goal-mouth detection, shot preview, back/cage and post collisions to the net objects, including rotation and scaling.
- Fixed goal normalization for saved/imported legacy plays, variations, New/Undo and goal-net reset; prevents deleting the two regulation goals.
- Preserved the default Ignore Defense / Ignore Objects shot choices, puck-over-obstacle animation, and added board/net contact haptics where browser-supported.
- Added isolated regression coverage for goals and physical net surfaces; this change is not production-approved.
- Candidate editor SHA-256: `79d4a93879048dd37f28d310ccaf44aed14a4e3ce33a804b754672572d623fff`.


## V7 cloud playbook foundation (2026-11-05, staging candidate)
- Introduces secured owner-only multi-playbook and play JSON schema, paid coach API, transactional play creation, and revision-safe updates.
- Adds team and publishing-provenance schema scaffolding without exposing JSON to player accounts.
- Existing browser/local editor workflow is unchanged. Cloud-playbook UI, video publishing, My Hockey Blog integration and AI remain follow-up steps.
- Staging migration applied; production untouched. See docs/V7_CLOUD_LIBRARY.md.

- Adds the first coach-facing My Cloud Playbooks panel: choose/create private playbooks, explicitly save or revise plays, load server JSON into the local editor, and copy existing browser-saved plays without deleting originals. Cloud operations are explicit, not per-drag.

- V7 release-label correction: the feature-branch shell/editor identify as **V7 Preview** and staging health reports **7.0.0-preview.1**, while serialized play compatibility and the untouched production release remain **6.8.2**. No Cloudflare deployment has occurred for this correction.
