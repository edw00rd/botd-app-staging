# B.O.T.D. v7 Data Model

This document defines the forward-compatible domain model being introduced on top of the v6.8.2 timeline engine.

## Compatibility rule

Existing v6.8.2 JSON must continue loading.

New fields are additive. Missing v7 fields receive safe defaults. The existing player/puck timeline remains authoritative for current play animation.

## Board document

A board represents a play, concept, or drill.

```json
{
  "platform": {
    "schemaVersion": 2,
    "kind": "play",
    "governingBody": "none",
    "division": "",
    "notationProfile": "botd",
    "objective": "",
    "teachingPoints": [],
    "station": "",
    "assignedCoach": "",
    "goaliePurpose": "",
    "workRestRatio": "",
    "tags": []
  },
  "equipment": []
}
```

### `platform.kind`

Current values:
- `play`
- `concept`
- `drill`

A practice is not a board kind. It is a container of board/drill references and timed activities.

### Standards/rendering profile

`governingBody`:
- `none`
- `usa_hockey`
- `hockey_canada`

`notationProfile`:
- `botd`
- `usa_hockey`
- `hockey_canada`

These are intentionally separate. A coach may work under one governing body while temporarily choosing a different visual notation for export/teaching.

## Semantic movement

v6.8.2 `actionType` remains compatible.

A normalized `semanticAction` is added:

| Existing actionType | Semantic action |
| --- | --- |
| forward | skate.forward |
| backward | skate.backward |
| lateral | skate.lateral |
| glide | skate.glide |
| hold | skate.stop_hold |

Puck events map directly:

| Event | Semantic action |
| --- | --- |
| possess | puck.possess |
| pass | puck.pass |
| shot | puck.shot |
| drop | puck.drop |
| place | puck.place |

Future semantic actions may include edgework, deke, jump, pressure, screen, retrieval, and other coaching-specific concepts. They must not overload visual line styles.

## Interactive rink objects

Practice equipment is not decorative artwork. Every placed item is a self-contained rink object with its own transform, geometry, physical puck response, capabilities, and—where applicable—inventory.

The rendered full-ice crease radius (48 board units) is the initial universal calibration reference. Objects are sized relative to the rink and kept only slightly exaggerated for touch usability.

```json
{
  "id": "eq_...",
  "type": "divider",
  "x": 500,
  "y": 300,
  "rotation": 35,
  "scale": 1,
  "label": "",
  "geometry": {
    "length": 58,
    "width": 11
  },
  "physics": {
    "collidable": true,
    "response": "soft_block",
    "restitution": 0.10
  },
  "capabilities": {
    "rotatable": true,
    "resize": "length",
    "puckSource": false
  },
  "quantity": null
}
```

Current object types:
- `cone` — small circular soft blocker;
- `tire` — scalable circular puck bumper;
- `bumper` — rotatable/resizable high-rebound obstacle;
- `divider` — rotatable length-resizable soft blocker;
- `pad` — rotatable length-resizable training obstacle;
- `puck` — usable spare puck object;
- `puckPile` — puck source with quantity/inventory;
- `stick` — rotatable length-resizable low-rebound obstacle;
- `rebounder` — rotatable length-resizable high-rebound obstacle;
- `net` — rotatable scalable stop/catch object.

### Puck response

Object collision behavior is deterministic and part of the animation timeline:

- `bounce` reflects the puck using the object's collision normal and restitution;
- `soft_block` produces a short low-energy deflection;
- `stop` terminates puck travel at the object;
- `none` does not participate in collision detection.

The existing "Ignore defense" event option only suppresses player/defender collisions. It does **not** make a puck pass through physical rink objects.

### Object transforms

Objects support type-specific transform controls:
- X/Y rink-axis positioning;
- direct drag;
- rotation where meaningful;
- uniform scaling for circular/net objects;
- length resizing for divider/pad/bumper/stick/rebounder objects;
- keyboard/nudge positioning.

### Puck sources

A puck pile can dispense a `puck` object and decrement its quantity. A spare puck can be promoted to the active animated puck, which starts a new independent puck route from the spare puck's exact rink location.

Equipment is captured inside play variations because station geometry may differ between variations.

## Practice model — target

A practice will become a server-backed object after the board/drill foundation stabilizes.

Illustrative shape:

```json
{
  "id": "practice_...",
  "title": "Breakouts + Angling",
  "date": "2026-11-05",
  "teamId": "team_...",
  "governingBody": "hockey_canada",
  "division": "U13",
  "durationSeconds": 3600,
  "ice": {
    "configuration": "half",
    "shared": true,
    "stationCount": 3
  },
  "participants": {
    "skaters": 16,
    "goalies": 2,
    "coaches": 3
  },
  "activities": [
    {
      "id": "activity_...",
      "kind": "drill",
      "drillId": "drill_...",
      "durationSeconds": 600,
      "station": "A",
      "assignedCoachIds": []
    }
  ]
}
```

## Social content model — target

Social posts reference hockey objects instead of flattening them into screenshots.

```json
{
  "id": "post_...",
  "authorId": "profile_...",
  "type": "practice",
  "objectId": "practice_...",
  "visibility": "team",
  "body": "Tomorrow's practice.",
  "createdAt": "..."
}
```

Target post types:
- play
- drill
- practice
- video
- progress
- game_recap
- coaching

Target visibility:
- private
- team
- club
- public

## Forking/source attribution — target

Publicly shared coaching objects should be copied/forked rather than edited in place by another user.

A copied object should retain:
- `sourceObjectId`
- `sourceAuthorId`
- `sourceVersion`
- `forkedAt`

This permits community sharing while preserving attribution and independent edits.

## Standards record — target

```json
{
  "governingBody": "hockey_canada",
  "division": "U13",
  "category": "practice_allocation",
  "classification": "development_recommendation",
  "sourceTitle": "...",
  "sourceUrl": "...",
  "effectiveDate": "...",
  "requirement": "...",
  "metrics": {},
  "botdBehavior": "analyze"
}
```

Rules/policies and recommendations must never be merged into one unqualified category.

## Migration strategy

1. Existing board JSON loads through current v6 migration functions.
2. v7 normalizer adds `platform`, `equipment`, and semantic-action metadata.
3. Existing rendering remains unchanged by default.
4. New authoring features write the additive fields.
5. A later release may formalize a new export schema/version only after round-trip tests prove backward compatibility.
