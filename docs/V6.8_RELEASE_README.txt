B.O.T.D. Hockey Playbook Studio v6.8
Owner and copyright holder: FENRIR LLC
License: Proprietary software - all rights reserved
Application: https://app.botdhockey.com/
Terms: https://botdhockey.com/terms/
Support: support@botdhockey.com

Ownership and licensing
-----------------------
Copyright © 2026 FENRIR LLC. All rights reserved.

The application, source code, interface, artwork, and documentation in this release are proprietary to FENRIR LLC. No open-source or source-code license is granted. Authorized end-user access is governed by the B.O.T.D. Terms of Service and LICENSE.txt included with this release.

Release focus
-------------
Version 6.8 makes the end of playback an immediately editable state, corrects the requested fresh-board Token Display defaults, and centers goalie numbers in both Full Ice and Half Ice views.

What's new in v6.8
------------------
1. Actionable playback endpoint
   - Playback still stops at the end of the final real hockey action rather than at the unused end of the timeline.
   - Glow and Blink remain presentation effects and do not extend playback.
   - The playhead now settles just after the final completed action instead of remaining on the inclusive endpoint of a Pass or Shot travel interval.
   - A completed Pass leaves the puck attached to its receiver at the stopping point.
   - A completed Shot leaves the puck loose at its final location at the stopping point.
   - The puck is immediately selectable for the next Pass or Shot when playback stops.
   - The displayed time remains effectively unchanged; the internal settle interval is only 0.002 seconds.
   - Exact manual scrubbing to a Pass or Shot arrival also resolves to the post-arrival puck state rather than treating the puck as still in flight.

2. Correct fresh Token Display defaults
   - Names: Off
   - Numbers: On
   - Positions: On
   - Leadership: Off
   - Offside light: On
   - These defaults apply to fresh/reset application state.
   - Existing Version 6.7 display preferences are preserved during migration instead of being overwritten.

3. Centered goalie numbers
   - Goalie roster numbers are now visually centered on the rectangular goalie token.
   - The number uses the token's actual center as its rotation origin.
   - The alignment remains centered when switching between Full Ice, Left-End Half Ice, and Right-End Half Ice.
   - The separate circular G position badge remains unchanged.

Playback endpoint details
-------------------------
The natural end of the play continues to be calculated from:

- Player movement clips
- Possession and release events
- Pass and Shot travel through puck arrival
- Enabled timed Telestration DRAW and ERASE actions

Glow and Blink intervals are intentionally excluded. If the final Pass arrives at 0:04.100, playback settles at 0:04.102. This avoids the shared-boundary ambiguity that previously caused the puck to report that it was still traveling when the coach attempted to create the next action.

Core systems retained
---------------------
- Blank New board with one puck at center ice and two complete ordered benches.
- Inspector-free floating Player and Puck controls.
- Player Move editing from the exact playhead position.
- Passes to players or open ice.
- Shot aiming, editable Shot Power, editable Travel Time, wall-following paths, and board/net ricochets.
- Editable Skate Time with direct mouse, finger, and Apple Pencil-like dragging.
- Timeline-based Glow/Blink intervals with editable color, Blink, Blink Rate, Glow Time, and direct timeline dragging.
- Action-sized Glow defaults and full-track Glow selection.
- Optional timed Telestration with DRAW/ERASE clips and Display Time editing.
- Pinch zoom and pan on the rink.
- Enlarged timeline-playhead acquisition for Pencil input.
- Freehand marker, held-shape correction, arrows, and solid/dashed/dotted lines.
- Apple Pencil-like double-tap switching between Marker and Eraser.
- Full Ice and camera-based Left/Right Half Ice views with permanent world coordinates.
- Play Options, independent Puck Routes, Copy & Reuse, Undo/Redo, responsive benches, and the left Board Setup drawer.
- Metallic B.O.T.D. dog-tag playbook artwork and BEWARE OF THE DAWG center-ice artwork.

Storage and compatibility
-------------------------
Version 6.8 uses these browser-storage keys:

  botdHockeyCoachingAid.session.v6_8
  botdHockeyCoachingAid.playbook.v6_8

Version 6.7 session and playbook keys are the first migration fallback. The earlier fallback chain remains available.

The migration updates the standard playbook name from "BOTD Playbook v6.7" to "BOTD Playbook v6.8" while preserving teams, rosters, play geometry, movement clips, puck routes, events, drawings, Glow/Blink actions, timed Telestration, custom artwork, display preferences, Play Options, and timeline data.

GitHub Pages installation
-------------------------
This domain-ready proprietary release ZIP contains exactly six root files:

  index.html
  README.txt
  Preview.png
  LICENSE.txt
  .nojekyll
  CNAME

To publish:
1. Extract the ZIP.
2. Place all six files directly in the hockey-coaching-aid repository root or selected GitHub Pages publishing folder.
3. Commit and push the files.
4. Configure GitHub Pages for app.botdhockey.com, then open https://app.botdhockey.com/ after deployment and certificate provisioning finish.

The application is self-contained in index.html. It does not require a build step, package manager, external JavaScript library, or application server.

Validation performed
--------------------
- Inline JavaScript syntax validation with Node.js.
- Browser title, visible subtitle, release-ready version, and storage-key checks.
- Fresh-state Token Display checks in application state and rendered Settings controls.
- Version 6.7 migration using a browser-local storage shim, including preservation of prior display preferences.
- Goalie-number SVG-origin and rendered-bounding-box checks in Full Ice and Half Ice.
- Actual Pass playback through the final arrival frame.
- Actual Shot playback through the final arrival frame.
- Verification that playback stops 0.002 seconds after the real action endpoint.
- Verification that the puck is no longer in travel mode at the stopping point.
- Verification that Pass and Shoot controls are immediately available after playback stops.
- Verification that an exact manually selected arrival timestamp resolves to the settled puck state.
- Verification that Glow/Blink does not extend the real action endpoint.
- Runtime and browser-console error checks.
- Responsive page-overflow checks at 1920 x 1080, 1366 x 1024, 1024 x 768, 820 x 1180, 768 x 1024, and 390 x 844.
- ZIP compressed-data integrity and the six-file proprietary release root structure, including CNAME and LICENSE.txt.

Physical iPad and Apple Pencil hardware were not available for this release validation. Touch-sized controls and responsive tablet layouts were exercised through Chromium emulation.
