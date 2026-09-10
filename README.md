# B.O.T.D. Hockey Playbook Studio v6.8 - staging RC5

Copyright (c) 2026 FENRIR LLC. All rights reserved. This repository is
proprietary software and is governed by `LICENSE.txt`.

## Purpose

RC5 retains the authentication, checkout, entitlement, account isolation,
password recovery, and ordered billing-state behavior from RC4. It fixes the
remaining failed-renewal defect found by the real Stripe Sandbox Test Clock
acceptance test.

The genuine `invoice.payment_failed` webhook reached the RC4 Worker with HTTP
200 and the subscription became `past_due`, but `last_invoice_state`,
`grace_period_end`, and the Coach Pro entitlement remained empty. RC4 inferred
invoice payment state from a second subscription retrieval. In the observed
Stripe response, `subscription.latest_invoice` was not available as an expanded
invoice object, so the signed invoice event was accepted but its payment result
was not applied.

RC5 treats the signed invoice webhook payload and event type as authoritative:

```text
invoice.payment_failed -> failed invoice state -> seven-day grace
invoice.paid           -> paid invoice state   -> clear grace
```

The subscription is still retrieved from Stripe for current price, status,
period, and customer data. The invoice ID, creation time, and payment outcome
come directly from the verified invoice event when available. RC4's PostgreSQL
row lock and monotonic ordering remain in force.

## Included

- Supabase email/password accounts with confirmation and password recovery
- secure HTTP-only application session cookies
- account-bound password-recovery context
- Stripe test-mode monthly and annual Checkout Sessions
- verified Stripe webhooks and processed-event tracking
- one `coach_pro` entitlement for both billing intervals
- Stripe Customer Portal access
- server-side entitlement enforcement before v6.8 is delivered
- ordered seven-day failed-payment grace-period handling
- signed invoice-event state handling when `latest_invoice` is unexpanded
- visible payment-failure grace warning and access-through date
- account-scoped local session, settings, and playbook storage
- protected-iframe unloading on sign-out and entitlement loss
- staging-only Stripe and database safety locks

Cloudflare Access remains the outer private-staging gate. B.O.T.D. account
login is the customer-facing gate being tested inside it.

## Repository structure

```text
public/index.html                           account, billing warning, and app shell
public/botd-logo.webp                       B.O.T.D. product mark
private/app-v6.8.html.txt                   account-scoped protected v6.8 template
src/worker.js                               auth, checkout, webhook, portal, entitlement
supabase/01_schema.sql                      complete fresh-install schema and RLS
supabase/02_staging_safety.sql              staging-only live-data constraints
supabase/03_verify.sql                      read-only schema/RLS verification
supabase/04_subscription_state_ordering.sql RC3-to-RC4 migration retained by RC5
supabase/EMAIL_TEMPLATES.md                 staging and future SMTP guidance
scripts/validate-release.mjs                static validation and secret scan
scripts/smoke-worker.mjs                    auth, isolation, and recovery tests
scripts/smoke-billing-state.mjs             invoice payload and ordering tests
wrangler.jsonc                              Worker and static-assets configuration
```

There is intentionally no `CNAME` file. Cloudflare controls the staging custom
domain in its dashboard.

## Upgrade from RC4

No new database migration is required. RC5 uses the RC4 database function:

```text
public.apply_stripe_subscription_state(...)
```

The RC4 migration must already be installed. The health endpoint confirms this
with:

```json
"paymentStateSchema": true
```

### Deploy the package

Upload `BOTD_v6.8_STAGING_AUTH_STRIPE_RC5_INVOICE_EVENT_FIX.zip` to the root of
the `botd-app-staging` Codespace and run:

```bash
cd "$(git rev-parse --show-toplevel)"

pwd
git remote -v
git status -sb

backup="backup-before-invoice-event-fix-$(date -u +%Y%m%d-%H%M%S)"
git branch "$backup"
git push origin "$backup"

unzip -o BOTD_v6.8_STAGING_AUTH_STRIPE_RC5_INVOICE_EVENT_FIX.zip
rm BOTD_v6.8_STAGING_AUTH_STRIPE_RC5_INVOICE_EVENT_FIX.zip

npm run check
```

Validation must end with:

```text
Release validation passed.
Worker smoke tests passed.
Account-scoped protected application responses passed for two distinct users.
Short opaque refresh-token adoption and recovery-session controls passed.
Billing-state ordering smoke tests passed.
Signed invoice webhook payloads work when latest_invoice is unexpanded.
Concurrent subscription/payment-failure events preserve one grace deadline.
Payment recovery wins over late failed-event delivery for the same invoice.
```

Commit and push:

```bash
git add -A
git commit -m "Apply signed invoice webhook state"
git push --progress origin main
```

`keep_vars: true` preserves dashboard-managed variables and encrypted secrets.

### Verify RC5 health

After Cloudflare deploys, open:

```text
https://staging.botdhockey.com/api/health?release=rc5
```

Expected identity:

```json
{
  "ok": true,
  "service": "botd-app-staging",
  "version": "6.8-entitlement-rc5",
  "mode": "staging-test-only"
}
```

The checks must include:

```json
"paymentStateSchema": true
```

## Reprocess the existing Test Clock failure

The failed event ID already used in acceptance testing is:

```text
evt_1UDusBGWXHTAR9EQ690RmGVY
```

Delete only its staging idempotency marker:

```sql
delete from public.processed_webhook_events
where stripe_event_id = 'evt_1UDusBGWXHTAR9EQ690RmGVY'
returning stripe_event_id, event_type, processed_at;
```

Then open that event in Stripe Sandbox and choose **Resend**. Select the newest
delivery attempt. It must return HTTP 200. A duplicate response means the
idempotency marker was not removed from this Supabase staging project.

RC5 should then produce:

```text
status: past_due
last_invoice_state: failed
grace_period_end: approximately seven real days from resend
entitlement: coach_pro
active: true
expires_at: same as grace_period_end
```

Do not run the Test Clock `recover` command until this state is confirmed.

## Security notes

- Never commit `sk_test_`, `sk_live_`, `whsec_`, `sb_secret_`, refresh tokens,
  access tokens, or database passwords.
- The staging Worker rejects live Stripe keys, live webhook events, and any
  `APP_URL` other than `https://staging.botdhockey.com`.
- The webhook Access bypass must remain limited to `/api/stripe/webhook`
  exactly.
- The protected v6.8 application is served only after session and entitlement
  validation.
