# B.O.T.D. Hockey Playbook Studio — V7.1.15 staging preview

Copyright © 2026 FENRIR LLC. All rights reserved.

**Staging UI milestone: V7.1.15 Preview.** The saved-play schema and stable production release remain v6.8.2. This is a preview label, not a production promotion. The upper-left header displays the staging version.

## V7.1.15 staff token appearance — November 21, 2026

- Head Coaches, Managers and other coach/manager-role staff now display a square C token with no HC/MGR role pill and no horizontal stripe. The large C uses the customizable Numbers color.
- Staff artwork is consistent on the ice, team benches, player identity details and color preview; individual names and role descriptions remain distinct.
- The staff selection outline follows the square token, preserving skater/goalie styling, on-ice coordinates and saved plays. Added regression coverage; staging only, production unaffected.

## V7.1.14 staging fix — November 20, 2026

- Coaches/managers no longer vanish from the bench when clicked: the legacy Y=64 setup was outside the real rink boundary (NHL top board roughly Y=96).
- Staff are now placed within the configured ice, inside the currently visible Half Ice end, with separate team/role positions.
- Exact legacy default placements are repaired when opening the app or loading a play. Custom staff coordinates, movement, pucks and other rink elements are untouched.
- Added regressions for Full/Half Ice, both staff roles, both teams and legacy recovery. Staging only; production and saved-play schema unchanged.

## V7.1.13 staging feature — November 20, 2026

- Added **Give** to the on-ice action menu for the primary puck and every additional puck. Select a puck, click Give, and then click an on-ice skater or goalie to put that puck immediately in their possession at the current playhead time; no pass or shot is generated.
- The feature uses the existing saved `possess` puck-timeline event, follows the selected player's stick during movement, and preserves the other pucks' timelines. It can interrupt an in-progress puck flight when explicitly chosen.
- Off-ice players, coaches and managers are not valid targets. The Cancel action exits targeting without a change. Added regression tests for primary/extra puck, skater/goalie and flight behavior.
- The existing Pass, Shoot, rink-object physics and stored-play compatibility are unchanged. Staging only; production untouched.

## V7.1.12 staging fix — November 20, 2026

- Fixed unwanted puck movement when placing a divider pad or any other rink object over the primary or an added puck. Both the legacy and first-class puck pointer handlers yield to active equipment placement, so the same click places the object instead of moving the puck.
- Clear a pending puck tap or drag when the Rink Objects placement mode is armed.
- Added regression coverage for placing equipment on top of Puck 1, an additional puck and the puck's remove-control target, while preserving the puck coordinates.
- Existing shoot-path recalculation when collidable rink objects change is intentional and unchanged. Pass behavior, production, and saved-play schema remain unchanged.

## V7.1.11 staging correction — November 20, 2026

- Completed the cone/tire control layout: their size-cycle arrows are now upper-right, matching the requested corner system (+ bottom-right, − bottom-left). Goals keep + upper-left and net selector bottom-right.
- Added a targeted regression assertion for the size-cycle location. No changes to puck physics, save schema, or production.

## V7.1.10 staging change — November 20, 2026

- Uniform action pill sizes and standard corner placement on rink equipment. Ordinary items use + bottom-right and − bottom-left; goals place + upper-left, reset upper-right, − lower-left and net-size selector lower-right.
- Fixed training-pad, divider, bumper, stick and rebounder length stretching with consistent drag tracking and an unmistakable gray double-arrow handle.
- Updated the Rink Objects toolbar icon to a hockey stick, retaining the object picker and all existing actions.
- Added regression coverage and kept the V7.1.9 selection-ring update, puck physics, data format and production untouched.

## V7.1.9 staging change — November 20, 2026

- Enlarged the dashed player selection ring to clear position and leadership markers; player token sizes and ring styling are unchanged.
- Moved player labels outside the wider ring, and positioned Move/Bench above the actual name or below the ring near the top edge.
- Added targeted regression coverage. Puck physics, production and play compatibility are unchanged.

## V7.1.8 staging change — November 19, 2026

- Smoothed puck glide using continuously changing speed between collisions, without altering board-bank geometry or stopping distance.
- Prevented small post-impact clearance jumps by including those distances in animation timing.
- Cached each puck's deterministic trajectory for the duration of playback instead of recalculating collision physics on every rendered frame.
- Added 120 Hz continuity and playback-cache regression tests. Staging only; production and saved-play format unchanged.

## V7.1.7 staging change — November 19, 2026

- Removed the artificial wall-follow rule: even grazing shots now bank according to impact angle on the puck-center board boundary.
- Applied normal-component restitution, tangential energy loss, ice glide deceleration and curved-corner reflection to board, post and net impacts.
- Added head-on, diagonal, glancing and rounded-corner regression checks; the preview and recorded shot share the same path solver. Staging only.

## V7.1.6 staging change — November 19, 2026

- Increased on-ice player numbers by 1.5×: skaters **14px → 21px**, goalies **16px → 24px**.
- Centered position labels within the existing pills using SVG ink bounds and label-length-aware font sizing.
- Preserved C/A markers, name styling, player sizes and production isolation; added regression tests.

## V7.1.5 staging change — November 19, 2026

- Increased the original on-token C/A **leadership lettering from 12px to 20px** to remain legible after the NHL-scale player token transform.
- Left the original leadership marker placement and style, position badges, and smaller/lighter player names unchanged.
- Staging preview version and regression assertions updated; production untouched.

## V7.1.4 staging change — November 19, 2026

- Increased only the on-ice Captain/Alternate C/A leadership letter font from **10px to 12px (+20%)** within the original on-token badge.
- Kept V7.1.3 position badge appearance and placement, the smaller/lighter player names, and all other rink geometry unchanged.
- Updated staged preview version, regression tests, and release notes. Production remains unchanged.

## V7.1.3 staging change — November 19, 2026

- Reverted the V7.1.2 changes to **position badges** and **C/A leadership badges** to the exact V7.1.1 appearance and placement.
- Kept the smaller, lighter name typography introduced in V7.1.2; no other rink layout or interaction changes.
- Updated regression checks, staging version, and release notes. Production remains unchanged.

## V7.1.2 staging change — November 19, 2026

- Reduced on-ice player name labels to 8.6 SVG units with medium weight and a thinner white contrast halo, preventing labels from overpowering NHL-scaled player symbols.
- Detached position badges from scaled player art, using consistently sized white/dark outlined badges and readable abbreviations for skaters, goalie, and staff.
- Replaced tiny unsupported on-token C/A letters with gold Captain/Alternate Captain chips beside visible player names (and beside the token when names are hidden). Kept both badges upright in half-ice view.
- Preserved player number rendering, role visibility options, and saved-play compatibility; no production changes.

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



The following sections document the historical v6.8.2 baseline, not the current V7.1.13 preview. It is based on the feature source accepted in staging at commit `71741c6914e723e46081fefa74950bad02da6861` and Worker version `b37d093c-1bc7-4274-b123-31ac7daec44b`. V7 staging work requires independent validation and approval before any production promotion.

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
