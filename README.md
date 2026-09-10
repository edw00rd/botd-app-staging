# B.O.T.D. Hockey Playbook Studio v6.8 — staging RC4

Copyright © 2026 FENRIR LLC. All rights reserved. This repository is
proprietary software and is governed by `LICENSE.txt`.

## Purpose

RC4 retains the working account, checkout, entitlement, account-isolation, and
password-recovery behavior from RC3 and fixes the failed-payment race exposed
by a real Stripe Sandbox Test Clock renewal.

Stripe delivered `invoice.payment_failed` with HTTP 200, but a concurrent
`customer.subscription.updated` handler could overwrite the grace deadline
with `NULL`. RC4 applies the full subscription snapshot and latest-invoice
payment state atomically under a PostgreSQL row lock, with monotonic ordering
for stale and out-of-order deliveries.

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
- visible payment-failure grace warning and access-through date
- account-scoped local session, settings, and playbook storage
- protected-iframe unloading on sign-out and entitlement loss
- staging-only Stripe and database safety locks

Cloudflare Access remains the outer private-staging gate. B.O.T.D. account
login is the customer-facing gate being tested inside it.

## Billing-state ordering

RC4 records two independent orderings on each subscription:

```text
Current Stripe snapshot:
  last_stripe_observed_at
  last_stripe_event_id
  last_stripe_event_created

Latest invoice state:
  last_invoice_id
  last_invoice_created
  last_invoice_state
  last_invoice_event_id
  last_invoice_event_created
```

The database function:

```text
public.apply_stripe_subscription_state(...)
```

locks one subscription row and applies both layers atomically. For the same
invoice, state progression is ordered as:

```text
failed -> terminal -> paid
```

A duplicate failure cannot extend the original grace deadline. A paid recovery
cannot be undone by a late failure delivery. A newer renewal invoice can start
a new grace period.

## Repository structure

```text
public/index.html                         account, billing warning, and app shell
public/botd-logo.webp                     B.O.T.D. product mark
private/app-v6.8.html.txt                 account-scoped protected v6.8 template
src/worker.js                             auth, checkout, webhook, portal, entitlement
supabase/01_schema.sql                    complete fresh-install schema and RLS
supabase/02_staging_safety.sql            staging-only live-data constraints
supabase/03_verify.sql                    read-only schema/RLS verification
supabase/04_subscription_state_ordering.sql RC3-to-RC4 migration
supabase/EMAIL_TEMPLATES.md               staging and future SMTP guidance
scripts/validate-release.mjs              static validation and secret scan
scripts/smoke-worker.mjs                  auth, isolation, and recovery tests
scripts/smoke-billing-state.mjs           concurrent billing-state tests
wrangler.jsonc                            Worker and static-assets configuration
```

There is intentionally no `CNAME` file. Cloudflare controls the staging custom
domain in its dashboard.

## Upgrade from RC3

### 1. Run the database migration first

In the `botd-staging` Supabase SQL Editor, run the complete contents of:

```text
supabase/04_subscription_state_ordering.sql
```

A successful result is:

```text
Success. No rows returned
```

Then run `supabase/03_verify.sql`. The final results must show eight RC4
ordering columns and:

```text
function_name: apply_stripe_subscription_state
service_role_can_execute: true
authenticated_can_execute: false
```

### 2. Deploy the package

Upload `BOTD_v6.8_STAGING_AUTH_STRIPE_RC4_BILLING_RACE_FIX.zip` to the root of
the `botd-app-staging` Codespace and run:

```bash
cd "$(git rev-parse --show-toplevel)"

pwd
git remote -v
git status -sb

backup="backup-before-billing-race-fix-$(date -u +%Y%m%d-%H%M%S)"
git branch "$backup"
git push origin "$backup"

unzip -o BOTD_v6.8_STAGING_AUTH_STRIPE_RC4_BILLING_RACE_FIX.zip
rm BOTD_v6.8_STAGING_AUTH_STRIPE_RC4_BILLING_RACE_FIX.zip

npm run check
```

Validation must end with:

```text
Release validation passed.
Worker smoke tests passed.
Account-scoped protected application responses passed for two distinct users.
Short opaque refresh-token adoption and recovery-session controls passed.
Billing-state ordering smoke tests passed.
Concurrent subscription/payment-failure events preserve one grace deadline.
Payment recovery wins over late failed-event delivery for the same invoice.
```

Commit and push:

```bash
git add -A
git commit -m "Fix failed-payment webhook ordering"
git push --progress origin main
```

`keep_vars: true` preserves the dashboard-managed variables and encrypted
secrets.

### 3. Verify RC4 health

After Cloudflare deploys, open:

```text
https://staging.botdhockey.com/api/health?release=rc4
```

Expected identity:

```json
{
  "ok": true,
  "service": "botd-app-staging",
  "version": "6.8-entitlement-rc4",
  "mode": "staging-test-only"
}
```

The checks must include:

```json
"paymentStateSchema": true
```

## Reprocess the existing Test Clock failure

The failed-renewal event already accepted by RC3 is stored as processed. In
Supabase staging only, delete that one event marker:

```sql
delete from public.processed_webhook_events
where stripe_event_id = 'evt_1UDusBGWXHTAR9EQ690RmGVY'
returning stripe_event_id, event_type, processed_at;
```

Then open that event in Stripe Sandbox and select **Resend**. The delivery must
return HTTP 200. RC4 should produce:

```text
status: past_due
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
- The webhook Access bypass must remain limited to
  `/api/stripe/webhook` exactly.
- The protected v6.8 application is served only after session and entitlement
  validation.
