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
