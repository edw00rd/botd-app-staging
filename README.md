# B.O.T.D. Hockey Playbook Studio — V7.1.28 staging preview

Copyright © 2026 FENRIR LLC. All rights reserved.

**Staging UI milestone: V7.1.28 Preview.** The saved-play schema and stable production release remain v6.8.2. This is a preview label, not a production promotion. The upper-left header displays the staging version.

## V7.1.28 Realistic ice surface presets — November 23, 2026

- Added an **Ice texture** selector with clickable preview swatches inside the existing RINK → Ice Surface dialog.
- The five finishes are **Classic** (unchanged legacy look), **Fresh Arena** (realistic resurfaced ice), **Lightly Skated**, **Game Worn**, and **Outdoor Frost**.
- Procedural, deterministic SVG highlights, frost clouds, polished resurfacer passes, fine scratches and optional outdoor cracks render below official rink markings. No external texture downloads, SVG blur filters or per-frame texture generation.
- The selected finish is persisted in the existing rink object and restored with saved plays. Legacy plays retain Classic, and switching rink size/standard preserves the selected finish.
- Both Full Ice and Half Ice share the same clipped surface artwork. Ice geometry, faceoff/goal markings, player locations, puck physics, and production settings are not modified.
- Preview label updated to V7.1.28. This branch is not yet deployed or promoted.

## V7.1.27 Broadcast-style player entry — November 23, 2026

- Replaced the prior oval player-arrival speech bubbles with the selected Option 1 red, white and charcoal broadcast lower-third.
- Layout: **jersey number on the left**, **player name on top**, **TO THE ICE!** on the red bottom strip, and the player's **position in the bottom-right pill** (including LW/RW/C/LD/RD/F1/F2/F3, G for goalies, and C for staff).
- Kept arrows following on-ice players, bottom-edge arrows and **FAR END** cue for offscreen Half Ice arrivals, and spoken/accessibility announcement context. The callouts retain automatic dismissal, queuing, reduced-motion behavior and responsive width.
- Added regression checks for both pointer directions, narrow rink sizes, long names, all player roles and the specified four-slot arrangement. No saved-play schema, player placement, gameplay or production changes.

## V7.1.26 Goalie orientation relative to the goal line — November 23, 2026

- Corrected the underlying Half Ice geometry: the goalie pad rectangle now rotates with the rink camera, so its long dimension remains parallel to the horizontal goal line on either end of the ice.
- Jersey number, optional G position badge and leadership graphics counterrotate independently to remain legible; the rectangular selection indicator follows the pads.
- This fixes the previous incorrect approach of forcing the entire goalie body upright on screen. Full Ice, goalie crease coordinates, saved-play data and other roles are unchanged.
- Added renderer-based transform tests for both Half Ice cameras and validated SVG geometry visually in local Chromium.

## V7.1.25 Half Ice goalie number orientation — November 23, 2026

- Corrected sideways goalie numerals by rendering the jersey number, optional G badge and leadership marks on a dedicated screen-upright SVG overlay after legacy Half Ice rendering.
- Both Half Ice ends retain upright digits; goalie pad artwork, crease placement, name labels and selection rings remain in place. Full Ice and saved-play behavior are unchanged.
- Extended Half Ice regression coverage and source integrity checks. Staging only; production is untouched.

## V7.1.23 Centered multi-selection minus — November 23, 2026

- Replaced the group remove button's baseline-dependent minus character with an exactly centered, round-capped SVG line inside its red circle.
- Aligned the minus stroke to the same selection-control center during Half Ice camera positioning and counterrotation for both left and right ends.
- Preserved the button's position, size, click/tap removal behavior, selection count, Full Ice layout, and production isolation.
- Added a Half Ice regression assertion for geometric centering; updated the V7 preview label and source manifest.

## V7.1.22 Rounded player-entry chat bubbles — November 23, 2026

- Replaced the sharp, rectangular player-announcement callout with a soft, **white oval speech balloon**, inspired by the supplied glossy chat-bubble reference. Smooth cubic curves form the body and a short, curved tail; removed the colored vertical accent and softened the outline and shadow.
- Rebalanced the two-line player name and arrival text inside a slightly taller balloon. Width continues to respond to smaller rink viewports without covering unrelated controls.
- Preserved directional cues: on-screen arrivals point toward the player's token; offscreen Half Ice arrivals remain at the bottom with their tail pointing toward the far end, and the far-crease label remains intact.
- Added an automated SVG geometry regression for left/right Half Ice and both tail orientations. No changes to play geometry, player placements, whistle control, puck physics, or production.

## V7.1.21 Pass/Give to everyone and coach whistle — November 21, 2026

- All **on-ice people**—skaters, goalies, coaches, and managers—now qualify for puck reception through both Give and Pass, the Puck Director receiver selection, legacy tap-to-target, and dropping a puck onto a person. Benched staff remain ineligible. Puck possession, stick-follow behavior, timeline events, and saved-play compatibility remain unchanged.
- Coaches receive a small SVG **cartoon whistle** action pill alongside Move and Bench. Managers, goalies and skaters keep their existing actions.
- Clicking the whistle plays two short synthesized referee-style chirps via Web Audio and briefly shakes only that coach's SVG token while a cartoon exclamation pops beside it. The effect does not alter play history or puck simulation, respects reduced-motion preferences, and triggers only from a user click.
- New automated tests exercise all-person targeting, staff exclusions while benched, coach-only control visibility, whistle sound generation, and the emote. Staging only; production not promoted.

## V7.1.20 Team crease placement and player-entry speech bubbles — November 21, 2026

- Goalies always enter their own team's crease in world coordinates: Team A on the left, Team B on the right, in Full Ice and either Half Ice view. Backup goalies share staggered slots *within* that same crease.
- Skaters and staff retain current-view placement: Half Ice faceoff formation around the visible end, Full Ice default positions.
- Adding any person displays a short, pointed, on-rink speech bubble with their name. Visible entries point toward their token; entries on the opposite end appear at the very bottom with the tail pointing toward the far end and a clear FAR LEFT/RIGHT CREASE label.
- Announcements are queued to avoid losing rapid additions, accessible to screen readers, and cleared on view switches/resets; no sound playback or extra network calls.
- Added regression checks for home crease, both Half Ice cameras, Full Ice, and directional offscreen callouts. Stored plays and production remain unchanged.

## V7.1.19 Half Ice goalie and selection control alignment — November 21, 2026

- Goalie, staff and skater silhouettes, numbers, position pills and leadership badges stay upright when switching to Half Ice. Goalie/staff selection outlines no longer inherit a conflicting CSS spin transform.
- Newly placed goalies sit farther forward in the visible crease. Switching views never alters saved on-ice player coordinates.
- Rink-object corner controls and puck plus/minus actions use symmetric, unclipped view-relative offsets. Net rotate handles sit above the goal in both Half Ice ends.
- Multi-select rotate/delete handles and the selection count align with the visible selection box rather than full-rink axes. Full Ice positioning remains unchanged.
- Extended left/right Half Ice regression coverage. Staging preview only, production untouched.

## V7.1.18 Goalie position toggle and forward position choices — November 21, 2026

- **Goalies:** The small on-ice G position pill now honors Settings → Positions exactly like LW, C, RW and defense labels; it appears only when positions are enabled. Jersey numbers remain governed independently by Settings → Numbers, and goalie role/crease behavior is unchanged.
- **Forward position options:** Added F1, F2 and F3 to the new-person Player Properties dialog and the editable roster-card position dropdown. These are skater/forward positions and do not change the person's role to goalie or staff.
- Forward-position choices have predictable line/bench order (F1/LW, F2/C, F3/RW), and Half Ice faceoff placement maps F1/F2/F3 to the equivalent left/center/right forward lanes for both ends.
- Added dedicated goalie-position visibility and position-choice regression tests. Updated release notes and exact-source checksums; production and saved-play schema unchanged.

## V7.1.17 Half Ice readability and faceoff placement — November 21, 2026

- Fixed rotated player/goalie/staff names, jersey numbers, role pills and captain/alternate badges: all now remain upright relative to the selected Half Ice view.
- Name callouts sit above or beside each visible player, with deterministic overlap-avoidance for busy faceoff diagrams. The underlying player coordinates are unchanged by camera selection.
- Rink equipment action buttons and puck plus/minus controls now use on-screen corner positions and upright symbols on either Half Ice end. World-coordinate object paths, physical rotations and puck trajectories remain intact.
- Adding a player, goalie, coach or manager while in Half Ice spawns within that visible end; the first five skaters for each side use appropriate offensive/defensive alignment around the viewer's upper-left faceoff circle. Goalie enters the visible crease; staff occupy a safe visible area.
- Additional same-position skaters are placed in nearby open spots. Existing placed tokens and saved plays are never repositioned on a camera switch. Full Ice behavior remains unchanged.
- Added independent two-end regression tests and versioned staging notes; production remains untouched.

## V7.1.16 roster properties — November 21, 2026

- Adding a roster member now opens a modal **Player Properties** editor. A nonblank name is mandatory, and no placeholder person enters the roster until the user submits.
- The editor sets the team, role (skater, goalie, coach, manager), position, line/pair, jersey number where applicable, shooting/catching hand, leadership, and optional palette overrides. Role-dependent fields are hidden when irrelevant.
- All staff stay number-free: the roster number field and displayed number are removed for coaches/managers, including legacy entries and role changes. Their existing square C tokens remain unchanged.
- On save, the roster filter clears, the new member's team is selected, and the newly inserted alphabetical roster card expands, scrolls into view, and highlights briefly. Cancel makes no change.
- Includes a focused regression test. Staging only; saved-play schema and production unchanged.

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
