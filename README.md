# B.O.T.D. Hockey Playbook Studio v6.8 — authenticated staging release

Copyright © 2026 FENRIR LLC. All rights reserved. This repository is
proprietary software and is governed by `LICENSE.txt`.

## Purpose

This release wraps the unchanged v6.8 Playbook Studio in a staging-only
customer account and subscription layer:

- Supabase email/password accounts with email confirmation and password reset
- secure HTTP-only application session cookies
- Stripe test-mode monthly and annual Checkout Sessions
- verified Stripe webhooks and idempotent event processing
- one `coach_pro` entitlement for both billing intervals
- Stripe Customer Portal access
- v6.8 served only after the server confirms an active entitlement
- a seven-day grace period after a test renewal payment failure

Cloudflare Access remains the outer staging gate. B.O.T.D. account login is the
customer-facing gate being tested inside it.

The v6.8 application payload is preserved byte-for-byte from the supplied
release candidate. Its SHA-256 is:

```text
e589cfef6dd1611c0a4c9d202a142cd3e77503cdfc31993db95bd5d09823b673
```

## Staging safety locks

This package is deliberately unable to use a Stripe live secret key. The Worker
requires all of the following before checkout:

```text
ENVIRONMENT=staging
APP_URL=https://staging.botdhockey.com
STRIPE_SECRET_KEY beginning with sk_test_
Stripe Checkout Session ID beginning with cs_test_
Stripe webhook event livemode=false
```

The optional staging database constraints in
`supabase/02_staging_safety.sql` also reject rows marked `livemode=true`.

Never use this release as the production deployment without a separate,
reviewed production configuration and production Supabase project.

## Repository structure

```text
public/index.html                 account, pricing, and application shell
public/botd-logo.webp             B.O.T.D. product mark
private/app-v6.8.html.txt         protected, unchanged v6.8 application
src/worker.js                     auth, checkout, webhook, portal, entitlement
supabase/01_schema.sql            idempotent database schema and RLS policies
supabase/02_staging_safety.sql    staging-only live-data constraints
supabase/03_verify.sql            read-only RLS/constraint verification
supabase/EMAIL_TEMPLATES.md       reliable email confirmation/reset links
wrangler.jsonc                    Cloudflare Worker and static-assets config
```

There is intentionally no `CNAME` file. Cloudflare controls the custom staging
domain in its dashboard.

## 1. Supabase database checkpoint

The five base tables should already exist:

```text
profiles
billing_customers
subscriptions
entitlements
processed_webhook_events
```

Run `supabase/02_staging_safety.sql` once in the Supabase SQL Editor. It is safe
to run on the current empty staging tables. Then run
`supabase/03_verify.sql`.

Expected RLS policy counts:

```text
profiles                     1
billing_customers             1
subscriptions                 1
entitlements                  1
processed_webhook_events      0
```

RLS must be enabled on all five tables. Zero client policies on
`processed_webhook_events` is intentional.

For a brand-new staging project, run the SQL files in numeric order.

## 2. Supabase email templates

In Supabase, update the link target in the **Confirm signup** template to:

```text
https://staging.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Update the link target in the **Reset password** template to:

```text
https://staging.botdhockey.com/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

Keep Authentication URL Configuration set to:

```text
Site URL: https://staging.botdhockey.com
Redirect URL: https://staging.botdhockey.com/**
```

The default Supabase mail sender is sufficient for initial staging. Configure
company-controlled SMTP and branded templates before production.

## 3. Cloudflare variables and encrypted secrets

Open the `botd-app-staging` Worker and go to **Settings → Variables and
Secrets**. Add these as ordinary variables using the values retained in the
company password manager or setup notes:

```text
ENVIRONMENT                 staging
APP_URL                     https://staging.botdhockey.com
SUPABASE_URL                https://PROJECT_REFERENCE.supabase.co
SUPABASE_PUBLISHABLE_KEY    sb_publishable_...
STRIPE_PRICE_MONTHLY        price_...   (Stripe TEST mode, $9.99/month)
STRIPE_PRICE_ANNUAL         price_...   (Stripe TEST mode, $79/year)
```

Add these as encrypted **Secret** values directly in Cloudflare:

```text
SUPABASE_SECRET_KEY         sb_secret_...
STRIPE_SECRET_KEY           sk_test_...
STRIPE_WEBHOOK_SECRET       whsec_...   (added after webhook creation)
```

Do not put secret values in GitHub, `.env`, `.dev.vars`, screenshots, support
messages, or application JavaScript. The `keep_vars` setting in
`wrangler.jsonc` prevents a Git deployment from deleting dashboard-managed
variables and secrets.

The Supabase URL must be the base project URL. Do not append `/rest/v1/`.

## 4. Replace the staging repository contents

Upload the complete release ZIP to the root of the `botd-app-staging`
Codespace. Confirm the repository first:

```bash
pwd
git remote -v
git status -sb
```

Create a backup branch through GitHub before replacement when desired. Then,
with the ZIP present in the repository root, replace the tracked working files
while preserving `.git`:

```bash
cd "$(git rev-parse --show-toplevel)"

find . -mindepth 1 -maxdepth 1 \
  ! -name .git \
  ! -name BOTD_v6.8_STAGING_AUTH_STRIPE_RC1.zip \
  -exec rm -rf -- {} +

unzip -o BOTD_v6.8_STAGING_AUTH_STRIPE_RC1.zip
rm BOTD_v6.8_STAGING_AUTH_STRIPE_RC1.zip

npm run check
git status --short
```

Commit and push:

```bash
git add -A
git commit -m "Add staging accounts and Stripe entitlement gate"
git push --progress origin main
```

Cloudflare's connected deployment should run:

```text
npx wrangler deploy
```

The package needs no separate application build command.

## 5. Health check

After Cloudflare deploys, authenticate through Cloudflare Access and open:

```text
https://staging.botdhockey.com/api/health
```

Before the Stripe webhook signing secret exists, the response will show
`stripeWebhookSecret: false`. All other checks should be `true`.

The health endpoint reveals only readiness booleans, never key values.

## 6. Create a narrow Cloudflare Access bypass for Stripe

The staging hostname is protected by Cloudflare Access, so Stripe needs a
single public webhook path. Create a second, path-specific self-hosted Access
application:

```text
Name: B.O.T.D. Stripe Webhook Staging
Public hostname: staging.botdhockey.com
Path: /api/stripe/webhook
Policy action: Bypass
Include: Everyone
```

Do not bypass `/api/*`, `/auth/*`, the whole Worker, or the whole hostname. The
more-specific webhook application should take precedence over the existing
root staging application.

Verify the bypass without a Cloudflare login:

```bash
curl -i https://staging.botdhockey.com/api/stripe/webhook
```

The correct result is a Worker response such as `405 Method Not Allowed`; a
redirect to a Cloudflare sign-in page means the path is still protected. A
forged POST still fails because the Worker verifies Stripe's HMAC signature.

## 7. Create the Stripe test webhook

In Stripe, explicitly switch to **Test mode**, then add this webhook endpoint:

```text
https://staging.botdhockey.com/api/stripe/webhook
```

Subscribe to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Copy the endpoint signing secret beginning with `whsec_` directly into the
Cloudflare encrypted secret named `STRIPE_WEBHOOK_SECRET`. Do not share it or
commit it.

Open `/api/health` again. Every readiness check should now be `true`.

## 8. Configure the Stripe test Customer Portal

In Stripe **Test mode**, configure the Customer Portal to allow:

- payment-method updates
- invoice and receipt viewing
- cancellation at the end of the billing period

Leave self-service monthly/annual plan switching disabled for this first
release. The portal configuration is separate between test and live mode.

## 9. End-to-end staging test

1. Open `https://staging.botdhockey.com/` in an incognito window.
2. Pass the outer Cloudflare Access email one-time PIN gate.
3. Create a new B.O.T.D. account.
4. Confirm the Supabase email message.
5. Sign in and choose monthly or annual billing.
6. At Stripe test Checkout, use:

   ```text
   Card: 4242 4242 4242 4242
   Expiration: any future date
   CVC: any three digits
   Postal code: any valid value
   ```

7. Return to staging. The Worker verifies the Checkout Session, the webhook
   records the test subscription, and `coach_pro` becomes active.
8. Confirm the v6.8 editor appears inside the authenticated shell.
9. Sign out, sign back in, and confirm access persists.
10. Open Manage billing and confirm the correct test customer appears.
11. Cancel at period end and confirm access remains through the paid-through
    date.

Expected Supabase records after a successful test purchase:

```text
profiles                     1 row for the test user
billing_customers             1 Stripe test customer mapping
subscriptions                 1 test subscription
entitlements                  1 active coach_pro entitlement
processed_webhook_events      one or more verified event IDs
```

## 10. Production remains unchanged

This deployment changes only the protected staging Worker:

```text
staging.botdhockey.com
```

It does not change:

```text
botdhockey.com       public sales site
app.botdhockey.com   current production v6.8 app
```

Do not redirect the live sales buttons, replace the production app, or use live
Stripe keys until monthly, annual, cancellation, renewal failure, password
reset, and cross-device login have all passed staging acceptance tests.

## Security model and limits

- The original v6.8 application initializes only after a server-side
  entitlement check.
- Supabase session tokens are stored in secure, HTTP-only, same-site cookies.
- Browser clients can read only their own subscription and entitlement rows
  under RLS.
- Stripe event signatures are verified with timestamp tolerance and processed
  event IDs are retained for idempotency.
- The webhook, database writes, Stripe checkout creation, and Customer Portal
  creation use backend-only secrets.
- A subscriber's browser still receives the frontend application code after
  authorization. Browser-delivered JavaScript cannot be made completely
  secret; commercially sensitive future logic should move to authenticated
  server endpoints where practical.
