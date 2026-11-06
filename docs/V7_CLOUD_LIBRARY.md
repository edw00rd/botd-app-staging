# V7 cloud library foundation (staging only)

## Shipped in this slice
- Existing Supabase Auth + paid coach_pro entitlement are required for cloud CRUD.
- The authenticated caller JWT, never a service-role secret, is used with PostgREST; RLS enforces per-coach ownership.
- Account can own multiple protected botd_playbooks and many reusable botd_plays. botd_playbook_entries is many-to-many.
- botd_teams, botd_team_memberships and botd_playbook_team_access are reserved for team distribution. Team membership **never grants access to editable JSON**.
- botd_play_versions / botd_play_sources record immutable version and multiple-source remix lineage in a future publishing release. Their write access is disabled for authenticated clients now.
- First cloud-library UI now appears in the Playbook tab: create/select books, explicit save/overwrite/save-copy, on-demand load, and opt-in local-play copying. Existing editor browser autosave, JSON import/export and playback remain unchanged. Browser-based IndexedDB caching and continuous sync are still future work.
- Cloud JSON changes are explicit. Each GET retrieves metadata without content, except GET /api/cloud/plays/:id. Create inserts a play and playbook entry in a single transactional SECURITY INVOKER RPC.
- Cloud update uses a revision compare-and-swap RPC; stale edits produce HTTP 409. Payloads are limited to 256 KB per play (300 KB request body).
- Staging database only; no production schema changes, no rendered videos, team feed, or AI service in this slice.

## API (paid coach only)
- GET /api/cloud/playbooks → owned playbook metadata
- POST /api/cloud/playbooks {name,description} → new owned book
- GET /api/cloud/playbooks/:id/plays → referenced play metadata only
- POST /api/cloud/plays {playbookId,title,kind,content} → new play and book entry
- GET /api/cloud/plays/:id → owner-only full JSON
- PUT /api/cloud/plays/:id {title,expectedRevision,content} → revision-checked update
- GET /api/cloud/teams → owned team metadata

All responses are private/no-store and all writes follow existing same-origin CSRF protection.

## Forward roadmap
1. Validate the new cloud-library UI in the staging browser. Add IndexedDB for larger offline cloud libraries and optimize reconnection/concurrency indicators after acceptance.
2. Add server-tested invitation + membership workflows, team channel integration with My Hockey Blog, and publish-only video permission checks.
3. Add immutable published playbook releases, verified play versions, cryptographic signatures, multiple-parent attribution and fork policies.
4. Add paid AI sidecar for create/remix with granular permission checks, strict schema validation and usage metering.
5. Stage rollout and browser acceptance before merging to main or production.

## Validation
- node scripts/smoke-cloud-playbooks.mjs
- node scripts/smoke-cloud-editor.mjs
- npm run check
- CI staging dry run and SHA256SUMS.txt verification
- Staging Supabase security advisors: one unrelated pre-existing warning about Auth leaked-password protection.
