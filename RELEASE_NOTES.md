# v6.8.2 — staging release candidate 1

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
