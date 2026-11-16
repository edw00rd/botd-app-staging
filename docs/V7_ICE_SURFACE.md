# V7 Ice Surface: physical-coordinate rink model

Status: feature-branch staging candidate. Production unaffected.
Owner: FENRIR LLC / B.O.T.D. Hockey Playbook Studio.

## Why this was rebuilt

The previous board mixed a 1000 × 600 view with independently sized goal nets, faceoff
circles, crease paths and blue-line offsets. The proportions were inconsistent.
The V7 rink is now a first-class persisted object `state.ice`, with a fixed
ID `rink-surface` and schemaVersion 1. SVG rink markings are generated from
one model rather than manually edited pixel coordinates.

All geometric inputs are stored in **feet**, using the exact constant
1 m = 3.280839895013123 feet for IIHF presets. Each profile is a starting
template; a real rink may differ according to facility and sanctioned competition.

## Source documentation

- NHL official playing rules, 2026–27:
  https://www.nhl.com/info/frequently-asked-questions
  (official PDF linked on the NHL's Rulebook FAQ).
  Specific rink dimensions and crease detail are also in Rule 1 and the
  official rink illustration in 2025–26:
  https://media.nhl.com/site/asset/public/ext/2025-26/2025-26Rules.pdf
- USA Hockey 2025–29 Official Rules and Casebook, Section 1, Rules 101–105,
  Appendix IV (rink dimensions, lines, faceoff areas, creases, nets):
  https://cdn1.sportngin.com/attachments/document/577c-1700643/2025-29_USAH_Playing_Rules___Casebook.pdf
- Hockey Canada 2026–28 Playing Rules, Rules 1.1–1.8 (rink, markings,
  goal crease, goals and faceoff circles):
  https://hockeynl.ca/wp-content/uploads/2026/07/2026-28-Hockey-Canada-Playing-Rules-English.pdf
- IIHF 2026–27 Rules, Section 1 and Appendix VI, rink dimensions,
  boards, markings, goal areas, officials' crease:
  https://blob.iihf.com/iihf-media/iihfmvc/media/downloads/rule%20book/2026-27_iihf_rule_book.pdf

## Model defaults and units

| Feature | NHL default | USA Hockey example | Hockey Canada example | IIHF example |
|---|---|---|---|---|
| Surface | 200 × 85 ft | 200 × 85 ft | 200 × 85 ft | 60 × 26 m |
| Corner radius | 28 ft | 28 ft example | 28 ft | 7.5 m |
| Goal-line inset | 11 ft | 11 ft | 11 ft | 4 m |
| Blue-line inset from end | 75 ft | 75 ft | 75 ft | 22.5 m |
| Faceoff-circle radius | 15 ft | 15 ft | 15 ft | 4.5 m |
| Goal crease | NHL truncated curve | 6 ft semi-circle | 6 ft semi-circle with corner L marks | IIHF curved |
| Goaltender restricted area | Shown | Hidden | Hidden | Shown |

The USA Hockey and Hockey Canada 200 × 85 ft presets are **illustrative
facilities**, not claims that all sanctioned rinks have that exact size.
USA Hockey recommends 185–200 × 85–100 ft. Hockey Canada's current
recommendations for newly built arenas cover 200 × 85–100 ft.
IIHF permits rink width 26–30 m. The IIHF preset uses 26 m.

NHL default geometry covers rink boundary, true 28 ft board corner radius,
goal lines 11 ft from ends, 12 in blue lines and center line,
2 in goal lines, 50 ft neutral zone, 15 ft faceoff-circle radii,
end-zone faceoff spots 20 ft past goal lines and 22 ft off center,
faceoff restraint markings, neutral faceoff spots, 6 ft crease radius,
truncated NHL crease outline, goaltender trapezoid, referee crease,
and both 4 × 6 ft nets at the goal lines.

## Editable values in the RINK dialog

- Regulation preset: NHL (default), USA Hockey, Hockey Canada, IIHF.
- Length, width, corner radius, goal-line inset, blue-line inset.
- Faceoff circle radius, faceoff lateral spacing, end-zone faceoff
  distance from goal line, neutral faceoff inset.
- Crease radius and style (NHL, USA, Canada, IIHF).
- Marking visibility, goaltender trapezoid, referee crease, hash marks,
  center-ice logo.
- Ice tint, board outline, red/blue marking and crease-fill colors.

Controls are always shown in feet; metric standards are converted internally.
A changed dimension creates a custom rink while retaining the saved play.
The RINK dialog is available beside the full/half-ice control. Choosing
Reset NHL restores the standard rink surface.

## Coupled behavior and persistence

- The rink is stored as `ice` in the session, play snapshot, cloud
  payload, and per-variation record.
- Goal anchors use the corresponding goal-line coordinates; **user-moved
  nets aren't forcibly repositioned**.
- Board collision and bank paths use the same rounded-corner perimeter
  derived from the model. Offside thresholds use the model's blue lines.
- Full and half rink cameras use dimensioned viewBox proportions.
- Dynamic artwork is rendered in a dedicated SVG group with
  `data-v7-ice-model="rink-surface"`.
- Legacy plays load with the NHL preset if no ice object is present;
  saved player movements, player roster, puck events and extra objects
  are not rescaled behind the user's back.

## Accuracy limitations / next increments

This is a **2D coaching editor**, not an arena-construction blueprint.
Physical values are grounded in published rules, but the restraint L-mark
linework, official crease interior micro-markings, dasher boards, kick plate,
protective glass, bench doors, red-line segmentation, goalpost pipe diameter,
raster logo scaling, and surface paint thickness still need finer
individual engineering validation before using renders for regulation
installation. Markings used by individual competitions may vary.
Do not claim this model certifies a rink.
