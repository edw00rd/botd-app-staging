# Validation record — v6.8.2 staging release candidate 1

Prepared September 24, 2026.

## Accepted feature baseline

- Staging repository branch: `feature/v6.8.2-workspace-polish`.
- Accepted feature commit: `71741c6914e723e46081fefa74950bad02da6861`.
- Accepted staging Worker version: `b37d093c-1bc7-4274-b123-31ac7daec44b`.
- The owner explicitly approved the accepted scope for production preparation after browser testing on desktop and iPad.

Accepted browser observations include the paw logo, maximum-viewport header, compact off-ice rink controls, reclaimed rink height, full-screen left drawer, contextual telestration controls, centered playback layout, centered radial underglow, stronger default/maximum glow, mouse/touch/Apple Pencil slider dragging, nested Glow/Blink controls, and tablet account/Routes labels.

## Automated evidence

Each accepted incremental update ran the complete `npm run check` suite before deployment. The suite covered JavaScript syntax, protected-editor integrity, locale behavior, production and staging Worker smoke tests, billing-state ordering, environment isolation, wrong-mode signed webhook rejection, price validation, and staging labels. Logged 400/403/409/503 request failures were exercised negative cases followed by successful suite results; the suites reported no external requests.

The release-preparation package was independently checked for exact baseline targeting, file checksums, clean-tree enforcement, atomic rollback on failure, and full local `npm run check` success.

## Release-candidate work still pending

- Commit the version/release metadata on `release/v6.8.2-staging-rc1` and record the full candidate commit.
- Push that branch, deploy the exact candidate to staging, and record the new Worker version.
- Verify `/api/health` reports `6.8.2-staging-v1`, `release: 6.8.2`, staging mode, and all checks true.
- Complete a concise final staging browser regression and obtain explicit production approval for the versioned candidate.
- Promote the exact accepted source tree into `edw00rd/botd-app-production`, deploy, and verify `6.8.2-production-v1`.

## Limits and deferred work

No new live checkout/refund cycle, real payment-failure/recovery cycle, full password-reset browser regression, or database migration is claimed. Drag-to-aim passing and shot-obstruction controls are deferred to a later release. Production remains on v6.8.1 until the production procedure completes.

Known rollback references before this candidate:

- Staging Worker: `b37d093c-1bc7-4274-b123-31ac7daec44b`.
- Production Worker: `e9ce3aca-108d-4fa8-a61f-61126c28b1f1`.
- Production source: `3e61337b1dac85a09d1cfe4540391ac8bc130331`.
