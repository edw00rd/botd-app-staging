# B.O.T.D. Hockey Playbook Studio — V7.1.1 staging preview

Copyright © 2026 FENRIR LLC. All rights reserved.

**Staging UI milestone: V7.1.1 Preview.** The saved-play schema and stable production release remain v6.8.2. This is a preview label, not a production promotion. The upper-left header displays the staging version.

## V7.1.1 staging change — November 19, 2026

- Removed the inaccurate gray **Bench** color preview from the player/team color editor; the sole live **On ice** preview remains. Color editing and the actual bench display are unchanged.
- Updated the visible upper-left preview version and regression checks; staged only, not production.

## Previous V7.1 staging changes — November 19, 2026

- Dedicated team and player color customization: Primary, Trim and Numbers, each with Grid, Spectrum and RGB Sliders, plus live preview. Drawing-tool controls have their own editor.
- Team number-color defaults flow through to players unless an individual player overrides them.
- Optimized Player Movement checkbox for consistent, game-like speed, preserving trace-based timing as the default.
- Symmetrical center-faceoff starting positions, aligned number typography, group move/rotate, puck-pile controls, improved nets and puck collisions.
- Version labeling policy: increment the visible V7.x staging version with each accepted staging feature release and update both this README and [RELEASE_NOTES.md](RELEASE_NOTES.md).

**Release history:** [RELEASE_NOTES.md](RELEASE_NOTES.md). Production is unchanged.

## Historical v6.8.2 release baseline



The following sections document the historical v6.8.2 baseline, not the current V7.1 preview. It is based on the feature source accepted in staging at commit `71741c6914e723e46081fefa74950bad02da6861` and Worker version `b37d093c-1bc7-4274-b123-31ac7daec44b`. V7 staging work requires independent validation and approval before any production promotion.

## Included scope

- Transparent B.O.T.D. paw as the default center-ice logo in full-ice and half-ice views.
- One compact maximum-viewport application header with the full-screen control anchored at the far upper-right.
- Compact rink controls positioned outside playable ice without reserving an empty toolbar row.
- Left setup/roster drawer retained in full-screen mode.
- Contextual telestration controls, centered playback controls, and a right-anchored bottom-drawer control.
- Compact subscription/security presentation and tablet-visible account and Routes labels.
- Center-origin player and puck underglow with stronger calibration, conditional Glow/Blink controls, and improved mouse, touch, and Apple Pencil slider dragging.

## Deferred scope

Drag-to-aim passing and the shot-obstruction toggle are not included in v6.8.2. Pass and shot mechanics remain unchanged from the prior release and will be handled in a later staging release.

## Environments

| Setting | Staging | Production |
|---|---|---|
| Repository | `edw00rd/botd-app-staging` | `edw00rd/botd-app-production` |
| Worker | `botd-app-staging` | `botd-app-production` |
| Wrangler config | `wrangler.jsonc` | `wrangler.production.jsonc` |
| Host | `staging.botdhockey.com` | `app.botdhockey.com` |
| Supabase project | `dolbsnodupgppvwnnlgd` | `stcobnlzdbkoakgvfaez` |
| Stripe mode | Test only | Live only |
| Health identity | `7.0.0-preview.1-staging` (V7.1 UI) | `6.8.2-production-v1` |

Cloudflare dashboard credentials remain environment-specific. No database migration, authentication-policy change, or billing-price change is included.

## Validation and release

Run `npm run check`, `npm run build:staging`, and `npm run build:production` from a clean Git checkout. Negative-test request failures are expected when followed by successful suite messages.

Follow `RELEASE_PROCEDURE.md`. Production approval is tied to the exact accepted staging commit. The production gate verifies that the executing production commit has the exact source tree of that approved staging commit, allowing the two repositories to retain their own Git histories without permitting source drift.
