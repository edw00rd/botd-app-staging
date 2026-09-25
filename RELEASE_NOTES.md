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
