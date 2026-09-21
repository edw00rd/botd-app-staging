# B.O.T.D. Hockey Playbook Studio — 6.8.1 staging-gate-rc1

Status: local candidate; no deployment or live acceptance completed. This is a procedure to execute, not a record that these steps have happened. The final separate PDF will be generated after production verification.

## Baselines

| Environment | Git source commit | Baseline ZIP SHA-256 |
|---|---|---|
| Staging | 73fe965fce3ff16cef512f6568288504f50ded29 | faaebdfeb4d81d5588da666b2e671993794078f6163f3b27a01e15b57ae8e537 |
| Production | 5c7ac98c003f2818688269061abe9d68650aacaf | e69eace2cda8159e2df5375444a0bdd66bcdb168e9eec20e564e9a88de76812b |

Staging repository: https://github.com/edw00rd/botd-app-staging on main.
Production repository and current deployed revision still require verification. Archive commits establish source baselines, not proof of currently deployed Worker versions.

## Environment map

| Setting | Staging | Production |
|---|---|---|
| Worker | botd-app-staging | botd-app-production |
| Config | wrangler.jsonc | wrangler.production.jsonc |
| APP_URL | https://staging.botdhockey.com | https://app.botdhockey.com |
| SUPABASE_URL | https://dolbsnodupgppvwnnlgd.supabase.co | https://stcobnlzdbkoakgvfaez.supabase.co |
| Stripe | test | live |
| Health version | 6.8.1-staging-v3 | 6.8.1-production-v3 |

Cloudflare dashboard retains SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_WEBHOOK_SECRET. Never copy those between environments. Confirm the staging Stripe endpoint belongs to the correct test workspace and its signing secret is from that endpoint; whsec_ does NOT identify test versus live mode. Price IDs also do not encode mode. Runtime checks retrieve prices and require matching livemode, USD 999 cents/month or 7900 cents/year, active recurring products.

Cloudflare Access must continue to protect the staging application. Inspect the existing exception for POST /api/stripe/webhook; retain the narrowly scoped delivery path. Do not disable Access for the entire site. The config disables workers.dev and previews, so confirm the existing webhook is https://staging.botdhockey.com/api/stripe/webhook before deployment. If it uses a workers.dev hostname, stop and reconcile delivery first.

Verify staging database constraints and apply_stripe_subscription_state exist using the existing read-only verification SQL under supabase/staging. Do not execute schema/setup SQL during this update. Keep production SQL out of the staging SQL editor.

## Install and validate locally in staging Codespace

1. Download the revised ZIP. Upload outside the repository, e.g. /tmp/BOTD-Hockey-Playbook-Studio-v6.8.1-staging-gate-rc1-full.zip. If uploaded to the workspace first, move that exact file to /tmp.
2. Compare sha256sum of the ZIP to the checksum in the delivery message. Test unzip -t before extracting into a new temporary directory. Do not use the superseded v6.8.1 production-only ZIP.
3. From the staging repository root, use:

```bash
BOTD_STAGE="$(mktemp -d)"
unzip -q /tmp/BOTD-Hockey-Playbook-Studio-v6.8.1-staging-gate-rc1-full.zip -d "$BOTD_STAGE"
(cd "$BOTD_STAGE" && sha256sum -c SHA256SUMS.txt && npm run check)
python3 "$BOTD_STAGE/scripts/install-staging.py"
```

The installer defaults to inspection only. It verifies the exact staging origin and baseline commit, clean working tree, checksums, and expected tracked deletions. It rejects untracked destination collisions and symlinks. Existing root staging SQL files move into supabase/staging; the old docs/V6.8_RELEASE_README.txt is retired. No SQL is executed.

4. Review the printed plan, then apply locally:

```bash
python3 "$BOTD_STAGE/scripts/install-staging.py" --apply
npm ci
sha256sum -c SHA256SUMS.txt
npm run check
npm run build:staging
npm run build:production
git diff --check
git status --short
git diff --stat
```

The installer creates release/v6.8.1-staging-gate-rc1 and an annotated local rollback/staging-pre-v6.8.1-73fe965fce3f tag. It does not push, commit or deploy. It touches only package paths and approved obsolete tracked files; environment files, .git, local dependencies and unrelated ignored files are not deleted.

5. Review all changes and record retained dashboard configuration and current staging Worker version ID. Check Cloudflare Builds/GitHub workflows for automatic deployment triggers BEFORE pushing or merging any branch. Do not push main as an installation shortcut.
6. Commit the reviewed source on the release branch. Do not regenerate the package manifest to hide unintended changes. Any intended source change creates a new candidate and resets staging acceptance.

```bash
git add -u
git add -- $(python3 -c 'from pathlib import Path; print(" ".join(x.split("  ",1)[1] for x in Path("SHA256SUMS.txt").read_text().splitlines()))')
git commit -m "Prepare 6.8.1 shared staging and production candidate"
git rev-parse HEAD
```

All distributed paths are space-free. Inspect git diff --cached before the commit if any local files were intentionally added. Record the resulting commit as CANDIDATE_COMMIT. Preserve the rollback tag remotely once push/deployment triggers are understood.

## Staging deployment gate

Before deployment, confirm dashboard bindings match the table, test-mode webhook delivery is configured, database verification passes, and the prior staging Worker version is recorded. Stage changes are a deployment, not a dry run.

```bash
npm run deploy:staging
```

Record Worker deployment/version IDs and Git commit. This command refuses a dirty tree or mismatched source manifest. The staging health response must be HTTP 200 with ok:true, service:botd-app-staging, version:6.8.1-staging-v3, mode:staging-test-only and every check true. Access may require browser sign-in. A health failure blocks acceptance.

## Staging acceptance

Record actual results and evidence; do not mark these complete from local mocks:

- Cloudflare Access blocks unauthenticated application access; authorized OTP sign-in works. workers.dev and preview URLs do not expose a parallel application endpoint.
- Staging/test banner is visible on the account shell and editor.
- App sign-in, sign-out, recovery, account navigation and account isolation work using staging test accounts.
- English is the default and sole English option; US English and Canadian English are absent. Swedish, Finnish and Russian still work; switching repeatedly does not duplicate version suffixes.
- Using a disposable staging account, restore a saved en-CA session and play, reload, verify en-US is persisted and play content retained. Preserve test fixtures before editing browser storage. Test playbook import/export, save/load and basic playback.
- Monthly/annual Stripe test checkout uses the expected prices and accepts promotion codes. No real payment credentials. Verify the returned account entitlement after a signed test webhook, portal access, cancellation, payment failure grace and recovery ordering.
- Stripe reports successful delivery to the test webhook; expected subscription and processed-event rows exist only in staging. Verify database live-mode constraints via read-only queries.
- Wrong-mode key, price, event and project safeguards pass automated tests. Never install live keys in staging to demonstrate rejection.
- Review errors/logs without exporting secret values.

Health validates schema availability and configuration, not every deployed database constraint or webhook routing policy. Those need separate evidence.

## Explicit approval and production promotion

Stop after staging acceptance. Present the tested commit, source/package hashes, staging deployment ID, acceptance results, known limitations, production configuration review and rollback target to the owner. Obtain explicit approval before production deployment.

Promote the SAME clean tested commit from the release checkout using the production config already included and built in this package. Do not rebuild a different source tree, cherry-pick only the editor, or copy staging secrets. No production code modification after acceptance. The production repository integration can be arranged separately once its URL and deployment triggers are confirmed; a different source revision must not be silently substituted.

Before production: confirm deployed production baseline, record existing Worker version and configuration, preserve an annotated production rollback Git reference in the production repository, verify live Stripe/webhook settings and production Supabase schema, and ensure production credentials are available to the deploy operator. The legacy launch hostname is not a canonical APP_URL in this package.

After owner approval only, set BOTD_APPROVED_STAGING_COMMIT to the recorded full accepted commit and run npm run deploy:production from that exact clean checkout. The gate refuses any other HEAD. This environment variable records operator intent; it does not automatically certify that browser testing happened.

Verify /api/health: ok:true, service:botd-app-production, version:6.8.1-production-v3, mode:live-production. Sign in and smoke-test language, saved plays, account navigation and absence of the staging banner. Check webhook delivery and application errors. Do not create a real charge merely for verification without separate authorization. Record deployment ID and UTC completion time.

## Separate rollback paths

Staging: restore the recorded prior botd-app-staging Worker version using Cloudflare deployment rollback; recheck staging health/Access/test billing. Restore configuration separately if changed, including any previously used webhook hostname. Git tag rollback/staging-pre-v6.8.1-73fe965fce3f preserves the prior source.

Production: roll back ONLY botd-app-production to its separately recorded prior Worker version; restore production configuration if changed and verify production health/authentication/billing. Use the production baseline reference for source recovery. Never deploy the staging baseline as a production rollback.

Prefer Worker version rollback or a new Git revert commit; do not reset/force-push shared history. No database rollback is expected because no migration is executed. Do not exercise production rollback simply to complete a checklist; rehearse on staging and record the production rollback target before release.

## Release record to complete

Candidate package SHA-256, source commit, package manifest, baseline commits, operator, timestamps, previous/new Worker version IDs for EACH environment, configuration checks, database verification, Stripe test delivery evidence, staging test results, owner's approval, production verification, rollback references and retained artifacts.

The final separate PDF manual must report what actually happened, including any deviations and unresolved items. It is not part of this source ZIP.
