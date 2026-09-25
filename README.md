# B.O.T.D. Hockey Playbook Studio v6.8.2 — staging release candidate

Copyright © 2026 FENRIR LLC. All rights reserved.

This source is the v6.8.2 shared staging/production release candidate. It is based on the feature source accepted in staging at commit `71741c6914e723e46081fefa74950bad02da6861` and Worker version `b37d093c-1bc7-4274-b123-31ac7daec44b`. The versioned release-preparation commit must still be deployed and accepted in staging before production promotion.

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
| Health identity | `6.8.2-staging-v1` | `6.8.2-production-v1` |

Cloudflare dashboard credentials remain environment-specific. No database migration, authentication-policy change, or billing-price change is included.

## Validation and release

Run `npm run check`, `npm run build:staging`, and `npm run build:production` from a clean Git checkout. Negative-test request failures are expected when followed by successful suite messages.

Follow `RELEASE_PROCEDURE.md`. Production approval is tied to the exact accepted staging commit. The production gate verifies that the executing production commit has the exact source tree of that approved staging commit, allowing the two repositories to retain their own Git histories without permitting source drift.
