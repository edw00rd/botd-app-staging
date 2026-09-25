# B.O.T.D. Hockey Playbook Studio — v6.8.2 release procedure

Status: release preparation in staging. Production is not yet changed.

## Required environment separation

| Purpose | Repository | Worker | Application |
|---|---|---|---|
| Development and staging acceptance | `https://github.com/edw00rd/botd-app-staging` | `botd-app-staging` | `https://staging.botdhockey.com` |
| Approved production releases | `https://github.com/edw00rd/botd-app-production` | `botd-app-production` | `https://app.botdhockey.com` |

Keep Cloudflare Access protection on staging. Never copy Supabase, Stripe, webhook, or other dashboard secrets between environments. This release executes no SQL migration.

## Release baseline

- Accepted staging feature commit: `71741c6914e723e46081fefa74950bad02da6861`.
- Accepted staging Worker before release metadata: `b37d093c-1bc7-4274-b123-31ac7daec44b`.
- Release branch: `release/v6.8.2-staging-rc1`.
- Current production source before promotion: `3e61337b1dac85a09d1cfe4540391ac8bc130331`.
- Current production Worker before promotion: `e9ce3aca-108d-4fa8-a61f-61126c28b1f1`.

## Prepare the versioned staging candidate

Apply the guarded release-preparation package only from the staging repository release branch at the exact accepted baseline. Review the reported file list, apply locally, and run the full check. Then commit all reviewed release files as one release-preparation commit.

```bash
git diff --check
npm run check
npm run build:staging
npm run build:production
git status --short
git diff --stat

git add \
  LICENSE.txt README.md RELEASE_NOTES.md RELEASE_PROCEDURE.md VALIDATION_RECORD.md \
  package.json package-lock.json private/app-v6.8.html.txt public/LICENSE.txt \
  public/index.html scripts/deploy-gate.mjs scripts/install-staging.py \
  scripts/smoke-worker.mjs scripts/smoke-worker-staging.mjs \
  scripts/validate-shared.mjs src/worker.js SHA256SUMS.txt

git diff --cached --check
git commit -m "release: prepare B.O.T.D. v6.8.2 candidate"
```

Record the full resulting commit as `CANDIDATE_COMMIT`. Push only the release branch. Confirm that the push did not auto-deploy before running the explicit staging deployment.

## Final staging deployment and acceptance

From the clean release branch at `CANDIDATE_COMMIT`:

```bash
npm run deploy:staging
```

Record the Worker version and confirm deployment history routes 100% of staging traffic to it. Open `https://staging.botdhockey.com/api/health` after Cloudflare Access sign-in and require:

- `ok: true`
- `service: botd-app-staging`
- `version: 6.8.2-staging-v1`
- `release: 6.8.2`
- `environment: staging`
- `mode: staging-test-only`
- every listed check is `true`

Complete a concise browser regression: login, editor load, paw logo, maximum viewport, full/half ice, saved play open/save, full-screen drawer, Glow/Blink controls and sliders, tablet labels, billing portal return, and staging banner. Any source change after this deployment creates a new candidate and requires redeployment and renewed approval.

## Exact-source promotion into the production repository

After explicit approval of the versioned candidate, preserve the exact staging commit object with a Git bundle or equivalent authenticated Git transfer. Import it into `edw00rd/botd-app-production`; do not copy loose files or rebuild a different tree.

Before modifying production, record production `main`, the active Worker version, dashboard routing/bindings, and create a rollback tag. Create a production reconciliation commit whose tree is exactly `CANDIDATE_COMMIT` and whose parents preserve both the previous production history and the accepted staging commit. Verify:

```bash
git diff --exit-code "$CANDIDATE_COMMIT" "$PRODUCTION_RECONCILIATION_COMMIT"
```

The production deployment gate uses `BOTD_APPROVED_STAGING_COMMIT=$CANDIDATE_COMMIT`. It resolves that approved commit and requires the executing production commit to have the exact same Git tree. This permits separate repository histories while blocking content drift. The approved staging commit object must therefore exist in the production repository.

Use only `npm run deploy:production`, which selects `wrangler.production.jsonc`. Do not use generic `npx wrangler deploy` in production.

## Production verification

Require `https://app.botdhockey.com/api/health` to report:

- `ok: true`
- `service: botd-app-production`
- `version: 6.8.2-production-v1`
- `release: 6.8.2`
- `environment: production`
- `mode: live-production`
- every listed check is `true`

Then verify login, editor load, absence of the staging banner, saved-play open/save, the accepted v6.8.2 visual behavior, billing navigation/return, and no new application errors. Do not create a live charge solely for release verification.

## Rollback

- Staging rollback target before the versioned candidate: Worker `b37d093c-1bc7-4274-b123-31ac7daec44b`.
- Production rollback target before v6.8.2: Worker `e9ce3aca-108d-4fa8-a61f-61126c28b1f1` and source `3e61337b1dac85a09d1cfe4540391ac8bc130331`.

Prefer Cloudflare Worker version rollback or a new Git revert commit. Do not force-push shared history. No database rollback is expected because no migration is included.
