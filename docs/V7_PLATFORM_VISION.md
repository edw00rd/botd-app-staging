# B.O.T.D. Hockey Platform Vision — v7 Foundation

## Product invariant

B.O.T.D. remains a fast, intuitive animated hockey clipboard first.

The bench-side workflow must never become harder merely because the platform gains advanced capabilities. A coach must still be able to place players, move the puck, draw movement, press play, and teach a concept quickly.

**Rule:** advanced capability uses progressive disclosure. If a feature makes the basic animated clipboard slower or more complicated, redesign the feature rather than the clipboard.

## Product identity

B.O.T.D. is a visual hockey teaching and community platform.

**Draw it. Animate it. Teach it. Practice it. Share it.**

The platform has four connected experiences:

1. **Board** — fast animated plays and concepts.
2. **Drills & Practices** — equipment-aware animated drills, stations, shared-ice planning, standards-aware practice plans, and locker-room loops.
3. **Team** — coaches publish plans and teaching material to players; teams discuss the actual hockey objects they are learning.
4. **Community** — players and coaches share development, experiences, drills, practices, clips, and coaching knowledge.

## Board

The current animated play creator is a protected core capability, not a legacy feature.

It must continue to support quick teaching of:
- plays and set pieces;
- breakouts, regroups, forechecks, backchecks, power play and penalty kill;
- F1/F2/F3 and other role/system concepts;
- faceoffs and positioning;
- quick bench-side explanations;
- player movement plus independent puck possession, passes, and shots;
- repeatable animation.

The default board must not require practice-plan metadata, equipment selection, governing-body setup, or social publishing.

## Semantic hockey model

Stored data describes hockey meaning rather than a visual line style.

Examples:
- `skate.forward`
- `skate.backward`
- `skate.lateral`
- `skate.glide`
- `skate.stop_hold`
- `puck.possess`
- `puck.pass`
- `puck.shot`
- `puck.drop`

This allows the same hockey object to be rendered using:
- B.O.T.D. notation;
- USA Hockey notation;
- Hockey Canada notation.

The renderer may change without rewriting the play.

## Drill equipment

Drill mode may use first-class equipment objects without cluttering normal play creation:
- cone;
- tire;
- divider pad;
- training pad;
- extra puck;
- puck pile;
- stick;
- rebounder;
- extra net.

Future equipment can be added without changing the core player/puck timeline.

## Drill

A drill is an animated board plus coaching metadata.

Target fields include:
- title;
- objective;
- age/division;
- governing body;
- notation profile;
- duration;
- station;
- assigned coach;
- equipment;
- teaching points;
- goalie purpose;
- work/rest ratio;
- skill/tactical tags;
- variations/progressions;
- looping animation.

## Practice

A practice is a timed container of drills/activities rather than a larger play.

Target fields include:
- team/date/title/theme;
- governing body and division;
- total duration;
- skater/goalie/coach counts;
- full-, half-, cross-, third-ice or custom space;
- shared-ice configuration;
- warm-up, stations, games, cooldown;
- station geometry and coach assignments;
- equipment checklist;
- development-category allocation;
- standards analysis;
- player presentation playlist.

## Shared ice

Shared ice is a design input, not a degraded form of full ice.

The planner should eventually reason about:
- available rink fraction/geometry;
- station count;
- player density;
- goalie availability;
- coach count;
- equipment;
- activity/repetition opportunities;
- small-area-game suitability.

Evidence and governing-body recommendations must be attached to standards data rather than embedded as anonymous AI advice.

## Locker Room / Player Presentation Mode

A practice can produce a player-facing loop suitable for an iPad in a locker room.

Initial target:
- full-screen read-only playback;
- practice title and station/drill title;
- concise objective/coaching cue;
- 10–20 second drill loops;
- auto-advance;
- continuous 1–2 minute playlist loop;
- pause/next/previous;
- shareable team link.

The player view intentionally hides authoring complexity.

## Team and Community

Hockey itself is the social object.

First-class shareable content types:
- play/concept;
- drill;
- practice;
- video/clip;
- progress update;
- game recap;
- coaching post.

Visibility model:
- Only Me;
- Team;
- Club/Association;
- Community/Public.

A coach can publish a practice to a team. Players can watch the actual animation, comment around the drill, and save or revisit teaching material.

A public drill can be copied into another coach's library as an editable fork while retaining source attribution.

## Hockey Progress integration

The Hockey Progress Blog becomes the community/profile layer rather than a disconnected product.

Desired retained concepts include:
- player/coach profiles;
- progress posts;
- comments/replies;
- tags;
- media;
- team/community feeds;
- Chirp feedback concepts;
- leadership/community reputation;
- Rent-a-Ref / Situation Room moderation concepts.

Migration must preserve useful content and identity while avoiding unnecessary duplication of authentication or profiles.

## Youth safety principle

Because youth hockey is a primary use case, social features must be designed around team/community safety from the beginning.

Default design direction:
- team-centered interaction;
- role-aware permissions;
- guardian/organization controls where required;
- moderation/auditability;
- no casual unrestricted adult-to-minor private messaging model.

Exact policy and legal requirements require a dedicated design/security review before implementation.

## Standards

Standards are source-attributed and classified.

Each standards record should carry:
- governing body;
- jurisdiction;
- age/division;
- source/version/effective date;
- category;
- classification: mandatory policy/rule, safety procedure, development recommendation, coaching best practice, or reference;
- normalized requirement/recommendation;
- numeric target when applicable;
- applicable BOTD behavior.

USA Hockey and Hockey Canada remain separate profiles even where recommendations overlap.

## Delivery sequence

### Phase 1 — Foundation
- preserve current clipboard UX;
- semantic movement/action metadata;
- practice-equipment object model;
- compatibility-safe JSON migration;
- governing-body/notation metadata foundation.

### Phase 2 — Drill Builder
- drill metadata;
- equipment authoring/editing;
- standard notation renderers;
- loop playback;
- drill templates and tags.

### Phase 3 — Practice Planner
- practice containers;
- shared-ice/station layout;
- durations and staff/equipment assignments;
- standards analyzer;
- printable/exportable coach sheet;
- locker-room player loop.

### Phase 4 — Team
- team libraries;
- publish to team;
- read-only player practice view;
- comments around plays/drills/practices;
- permissions/roles.

### Phase 5 — Community / Hockey Progress
- profiles and feeds;
- public coaching library;
- editable forks;
- progress journal/posts;
- moderation/reputation framework.

### Phase 6 — AI assistance
- video-to-play/drill;
- standards-aware practice generation;
- practice analysis and optimization;
- semantic action recognition.

AI remains assistive: generated hockey content is editable and never silently treated as an official governing-body requirement.

## Release discipline

All work follows the established B.O.T.D. promotion model:
baseline → isolated feature branch → validation → staging → acceptance → approved production promotion → production verification → rollback retained.

No v7 feature work bypasses staging or silently changes production.
