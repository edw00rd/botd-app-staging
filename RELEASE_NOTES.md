# B.O.T.D. Hockey Playbook Studio — Release Notes

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
