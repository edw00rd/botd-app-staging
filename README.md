# B.O.T.D. Hockey Playbook Studio v6.8 — staging RC2

Copyright © 2026 FENRIR LLC. All rights reserved. This repository is
proprietary software and is governed by `LICENSE.txt`.

## Purpose

RC2 retains the staging authentication and Stripe entitlement system from RC1
and fixes the browser-storage isolation defect confirmed during multi-account
testing.

RC1 used the original v6.8 origin-wide keys:

```text
botdHockeyCoachingAid.session.v6_8
botdHockeyCoachingAid.playbook.v6_8
```

Every account signed into the same browser profile therefore loaded the same
local session and playbook. RC2 binds the protected application to the
server-verified Supabase user ID and uses account-specific keys:

```text
botdHockeyCoachingAid.user.<supabase-user-id>.session.v6_8
botdHockeyCoachingAid.user.<supabase-user-id>.playbook.v6_8
```

The Worker injects the account context only after it has verified both the
HTTP-only Supabase session and the active `coach_pro` entitlement. A requested
account ID that does not match the authenticated session is rejected.

The account shell also unloads the protected application when the user signs
out or loses access. This prevents a previously loaded editor from remaining in
a hidden iframe after an account or entitlement transition.

## What RC2 includes

- Supabase email/password accounts with email confirmation and password reset
- secure HTTP-only application session cookies
- Stripe test-mode monthly and annual Checkout Sessions
- verified Stripe webhooks and idempotent event processing
- one `coach_pro` entitlement for both billing intervals
- Stripe Customer Portal access
- server-side entitlement enforcement before v6.8 is delivered
- seven-day failed-payment grace-period logic
- account-scoped local session and playbook storage
- protected-iframe unloading on sign-out and entitlement loss
- staging-only Stripe and database safety locks

Cloudflare Access remains the outer staging gate. B.O.T.D. account login is the
customer-facing gate being tested inside it.

## Data-handling change from RC1

RC2 deliberately does **not** automatically claim or import the old unscoped
RC1 browser data. After multiple accounts have used one browser, ownership of
that shared data is ambiguous. Automatically assigning it to the next account
would repeat the isolation problem.

Before deploying RC2, export any test playbook you want to preserve from the
v6.8 Playbook panel. After deployment, sign into the intended account and
import that JSON file. Otherwise, each account starts with a clean local
playbook.

The old unscoped values may remain in browser storage, but RC2 does not read
them. They can be cleared after testing from the browser's site-data controls.
A separate, explicit legacy-data claim flow must be designed before production
cutover so existing production users can choose which account receives their
pre-account playbook.

## Security boundary and storage limitation

Account-scoped keys prevent accidental display of one account's playbook in
another account's normal application session. They are not a strong security
boundary against someone who controls the same operating-system/browser
profile and intentionally uses browser developer tools.

The playbook remains local to one browser profile:

- the same account on the same browser retains its playbook;
- a different account in the same browser receives a separate playbook;
- the same account on another browser or device does not yet receive that
  playbook;
- clearing browser site data can remove it;
- JSON export/import remains the transfer and backup mechanism.

True cross-device persistence and server-enforced data isolation require the
planned account-backed cloud playbook phase.

## Release identity

The product feature set remains B.O.T.D. Hockey Playbook Studio v6.8. RC2 makes
a narrow storage-key and application-shell hardening patch around that release.

Protected template SHA-256 before per-request account injection:

```text
96d1755aaf6ef1c257cf43d8bc3e557fd636d82735344eac856d42bf0a37a7c1
```

The original unmodified v6.8 payload used by RC1 had SHA-256:

```text
e589cfef6dd1611c0a4c9d202a142cd3e77503cdfc31993db95bd5d09823b673
```

## Repository structure

```text
public/index.html                 account, pricing, and protected-app shell
public/botd-logo.webp             B.O.T.D. product mark
private/app-v6.8.html.txt         v6.8 template with account-scope placeholder
src/worker.js                     auth, checkout, webhook, portal, entitlement
supabase/01_schema.sql            idempotent database schema and RLS policies
supabase/02_staging_safety.sql    staging-only live-data constraints
supabase/03_verify.sql            read-only RLS/constraint verification
supabase/EMAIL_TEMPLATES.md       production email-template guidance
scripts/validate-release.mjs      static release and secret scan
scripts/smoke-worker.mjs          Worker and two-account isolation smoke tests
wrangler.jsonc                    Cloudflare Worker and static-assets config
```

There is intentionally no `CNAME` file. Cloudflare controls the custom staging
domain in its dashboard.

## Upgrade from RC1

No Supabase schema change, Stripe change, webhook change, Cloudflare Access
change, DNS change, or environment-variable change is required.

Before replacing RC1:

1. Export any staging playbook data that must be retained.
2. Confirm `https://staging.botdhockey.com/api/health` currently reports all
   checks as `true`.
3. Create a Git backup branch.

Upload `BOTD_v6.8_STAGING_AUTH_STRIPE_RC2_ACCOUNT_ISOLATION.zip` to the root of
the `botd-app-staging` Codespace, then run:

```bash
cd "$(git rev-parse --show-toplevel)"

pwd
git remote -v
git status -sb

backup="backup-before-storage-isolation-$(date -u +%Y%m%d-%H%M%S)"
git branch "$backup"
git push origin "$backup"

find . -mindepth 1 -maxdepth 1 \
  ! -name .git \
  ! -name BOTD_v6.8_STAGING_AUTH_STRIPE_RC2_ACCOUNT_ISOLATION.zip \
  -exec rm -rf -- {} +

unzip -o BOTD_v6.8_STAGING_AUTH_STRIPE_RC2_ACCOUNT_ISOLATION.zip
rm BOTD_v6.8_STAGING_AUTH_STRIPE_RC2_ACCOUNT_ISOLATION.zip

npm run check
git status --short
```

The validation must end with:

```text
Release validation passed.
Worker smoke tests passed.
Account-scoped protected application responses passed for two distinct users.
```

Commit and push:

```bash
git add -A
git commit -m "Isolate local playbooks by customer account"
git push --progress origin main
```

Cloudflare's connected deployment should continue to run:

```text
npx wrangler deploy
```

`keep_vars: true` in `wrangler.jsonc` preserves dashboard-managed runtime
variables and encrypted secrets.

## Health check after deployment

After Cloudflare deploys, authenticate through Cloudflare Access and open:

```text
https://staging.botdhockey.com/api/health?release=rc2
```

Expected identity:

```json
{
  "ok": true,
  "service": "botd-app-staging",
  "version": "6.8-entitlement-rc2",
  "mode": "staging-test-only"
}
```

All readiness checks must remain `true`.

## Account-isolation acceptance test

Use two active staging subscriber accounts in the same browser profile.

1. Sign into account A.
2. Save a play named `ACCOUNT A ONLY`.
3. Sign out through the B.O.T.D. account shell.
4. Sign into account B.
5. Confirm `ACCOUNT A ONLY` is absent.
6. Save a play named `ACCOUNT B ONLY`.
7. Sign out and return to account A.
8. Confirm `ACCOUNT A ONLY` is present and `ACCOUNT B ONLY` is absent.
9. Return to account B and confirm the inverse.
10. Refresh and sign out/in once more to verify same-account persistence.

Also repeat the cancellation check. A subscription canceled at period end
should keep access through `current_period_end`; an immediately terminated
subscription should lose the entitlement and unload the protected editor.

## Existing configuration retained from RC1

Ordinary Worker variables:

```text
ENVIRONMENT                 staging
APP_URL                     https://staging.botdhockey.com
SUPABASE_URL                https://PROJECT_REFERENCE.supabase.co
SUPABASE_PUBLISHABLE_KEY    sb_publishable_...
STRIPE_PRICE_MONTHLY        price_...  (Stripe TEST mode)
STRIPE_PRICE_ANNUAL         price_...  (Stripe TEST mode)
```

Encrypted Worker secrets:

```text
SUPABASE_SECRET_KEY         sb_secret_...
STRIPE_SECRET_KEY           sk_test_...
STRIPE_WEBHOOK_SECRET       whsec_...
```

Never put those secret values in GitHub, `.env`, `.dev.vars`, screenshots,
support messages, or application JavaScript.

## Staging safety locks

This package rejects:

```text
ENVIRONMENT other than staging
APP_URL other than https://staging.botdhockey.com
Stripe secret keys not beginning with sk_test_
Stripe Checkout Session IDs not beginning with cs_test_
Stripe webhook events with livemode=true
```

The staging database constraints also reject rows marked `livemode=true`.

## Production remains unchanged

This package changes only:

```text
staging.botdhockey.com
```

It does not change:

```text
botdhockey.com       public sales site
app.botdhockey.com   current production v6.8 app
```

Do not redirect live sales traffic or move `app.botdhockey.com` until account
isolation, password recovery, failed-payment grace behavior, duplicate webhook
handling, and the explicit legacy-playbook migration flow have passed staging.
