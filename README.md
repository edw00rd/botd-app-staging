# B.O.T.D. Hockey Playbook Studio v6.8.1 — staging-gate-rc1

Copyright © 2026 FENRIR LLC. All rights reserved.

This is an undeployed shared staging/production release candidate. Start with RELEASE_PROCEDURE.md; VALIDATION_RECORD.md distinguishes local results from pending live acceptance.

## Scope

The selector displays English, removes Canadian English, and normalizes saved en-CA preferences to en-US. Swedish, Finnish and Russian remain available. Account-scoped v6_8 storage keys and the protected app filename are retained.

The deployment revision introduces explicit environment isolation, separate Wrangler configurations, mode-specific Stripe checks, staging visual labels, and release gates. No database migration is executed. Existing database constraints and webhook routing still require verification before staging deployment.

## Environments

| Setting | Staging | Production |
|---|---|---|
| Worker | botd-app-staging | botd-app-production |
| Wrangler config | wrangler.jsonc | wrangler.production.jsonc |
| Host | staging.botdhockey.com | app.botdhockey.com |
| Supabase project | dolbsnodupgppvwnnlgd | stcobnlzdbkoakgvfaez |
| Stripe mode | Test only | Live only |
| Health identity | 6.8.1-staging-v3 | 6.8.1-production-v3 |

Credentials remain in the environment-specific dashboard. Price IDs and webhook signing secrets do not identify their mode by prefix; verify their Stripe workspace. Cloudflare Access must protect staging, with a verified narrowly scoped webhook delivery path.

## Validation and release

Run npm ci, npm run check, npm run build:staging and npm run build:production. Both build commands are dry runs. Negative-test error messages are expected. scripts/validate-shared.mjs owns static checks; validate-release.mjs forwards to it for compatibility.

Follow RELEASE_PROCEDURE.md to inspect installation changes, preserve rollback, install on a release branch, validate locally, deploy to staging and complete browser/integration acceptance. Production requires explicit owner approval and promotion of the same tested commit. The deploy gate records operator intent; it cannot certify that browser acceptance occurred.

JSON export/import remains the supported backup for browser-local playbooks. No production deployment, database migration or real payment has been performed as part of preparing this package.
