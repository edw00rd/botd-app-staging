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
    "schemaVersion": 1,
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

## Equipment

Equipment is static practice geometry in the first foundation release.

```json
{
  "id": "eq_...",
  "type": "cone",
  "x": 500,
  "y": 300,
  "rotation": 0,
  "scale": 1,
  "label": ""
}
```

Current equipment types:
- `cone`
- `tire`
- `divider`
- `pad`
- `puck`
- `puckPile`
- `stick`
- `rebounder`
- `net`

Equipment is captured inside play variations because station geometry may differ between variations.

Future equipment attributes may include dimensions, color, quantity, ownership, animation state, collision semantics, and station membership.

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
