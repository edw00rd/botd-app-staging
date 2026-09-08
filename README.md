# B.O.T.D. Hockey Playbook Studio v6.8 — staging RC3

Copyright © 2026 FENRIR LLC. All rights reserved. This repository is
proprietary software and is governed by `LICENSE.txt`.

## Purpose

RC3 retains the working staging subscription system and account isolation from
RC2 and fixes the password-recovery defects identified during acceptance
testing.

RC2 rejected valid Supabase recovery refresh tokens when they were shorter
than 20 characters. The failed adoption left `?mode=recovery` in the URL, so a
subsequent ordinary password login could incorrectly display the password-set
screen. RC3 corrects both behaviors and requires a Worker-validated recovery
context before a password can be changed.

## Included

- Supabase email/password accounts with confirmation and password recovery
- secure HTTP-only application session cookies
- short-lived, account-bound password-recovery context
- Stripe test-mode monthly and annual Checkout Sessions
- verified Stripe webhooks and idempotent event processing
- one `coach_pro` entitlement for both billing intervals
- Stripe Customer Portal access
- server-side entitlement enforcement before v6.8 is delivered
- seven-day failed-payment grace-period logic
- account-scoped local session, settings, and playbook storage
- protected-iframe unloading on sign-out and entitlement loss
- staging-only Stripe and database safety locks

Cloudflare Access remains the outer private-staging gate. B.O.T.D. account
login is the customer-facing gate being tested inside it.

## Account-scoped browser storage

Each authenticated account uses:

```text
botdHockeyCoachingAid.user.<supabase-user-id>.session.v6_8
botdHockeyCoachingAid.user.<supabase-user-id>.playbook.v6_8
```

The playbook is still local to one browser profile. JSON export/import remains
the backup and transfer method until cloud playbooks are implemented.

## Password-recovery behavior

The default Supabase staging email template is supported. No custom SMTP or
email-template edit is required for this RC.

A valid recovery link now:

1. returns to `https://staging.botdhockey.com/` with a one-time Supabase session
   in the URL fragment;
2. has its credentials removed from the address bar immediately;
3. is validated and adopted by the Worker;
4. creates a 30-minute HTTP-only recovery context tied to the user;
5. displays the Set a new password form;
6. clears all local auth cookies after the password is updated; and
7. requires the user to sign in with the new password.

The reset does not delete account-scoped browser playbooks or settings.

## Repository structure

```text
public/index.html                 account, pricing, recovery, and app shell
public/botd-logo.webp             B.O.T.D. product mark
private/app-v6.8.html.txt         account-scoped protected v6.8 template
src/worker.js                     auth, checkout, webhook, portal, entitlement
supabase/01_schema.sql            idempotent schema and RLS policies
supabase/02_staging_safety.sql    staging-only live-data constraints
supabase/03_verify.sql            read-only RLS/constraint verification
supabase/EMAIL_TEMPLATES.md       staging and future SMTP guidance
scripts/validate-release.mjs      static validation and secret scan
scripts/smoke-worker.mjs          Worker, isolation, and recovery tests
wrangler.jsonc                    Worker and static-assets configuration
```

There is intentionally no `CNAME` file. Cloudflare controls the staging custom
domain in its dashboard.

## Upgrade from RC2

No Supabase schema, Stripe, webhook, Cloudflare Access, DNS, or runtime-variable
change is required.

Upload `BOTD_v6.8_STAGING_AUTH_STRIPE_RC3_PASSWORD_RECOVERY.zip` to the root of
the `botd-app-staging` Codespace and run:

```bash
cd "$(git rev-parse --show-toplevel)"

pwd
git remote -v
git status -sb

backup="backup-before-recovery-fix-$(date -u +%Y%m%d-%H%M%S)"
git branch "$backup"
git push origin "$backup"

unzip -o BOTD_v6.8_STAGING_AUTH_STRIPE_RC3_PASSWORD_RECOVERY.zip
rm BOTD_v6.8_STAGING_AUTH_STRIPE_RC3_PASSWORD_RECOVERY.zip

npm run check
git status --short
```

Validation must end with:

```text
Release validation passed.
Worker smoke tests passed.
Account-scoped protected application responses passed for two distinct users.
Short opaque refresh-token adoption and recovery-session controls passed.
```

Commit and push:

```bash
git add -A
git commit -m "Fix password recovery session handling"
git push --progress origin main
```

`keep_vars: true` in `wrangler.jsonc` preserves dashboard-managed runtime
variables and encrypted secrets.

## Health check

After Cloudflare deploys, open:

```text
https://staging.botdhockey.com/api/health?release=rc3
```

Expected identity:

```json
{
  "ok": true,
  "service": "botd-app-staging",
  "version": "6.8-entitlement-rc3",
  "mode": "staging-test-only"
}
```

All readiness checks must remain `true`.

## Password-recovery acceptance test

Supabase's built-in mailer is limited. Wait for its email quota to be available,
then make one controlled request.

1. Sign out of the B.O.T.D. account.
2. Select **Forgot password?** and request one email.
3. Open the newest reset message once.
4. Confirm staging displays **Set a new password** without an invalid-refresh
   error.
5. Enter a new password of at least 10 characters.
6. Confirm the shell returns to sign-in and says to use the new password.
7. Confirm the old password is rejected.
8. Confirm the new password signs in and preserves entitlement, local playbook,
   team settings, display settings, and center-ice selection.
9. Reopen the same email link and confirm it is rejected as expired/used.
10. Manually visit `/?mode=recovery`, then sign in normally and confirm the
    normal account/app view appears rather than the password-set form.

## Security notes

- Never commit `sk_test_`, `sk_live_`, `whsec_`, `sb_secret_`, refresh tokens,
  access tokens, or database passwords.
- This staging Worker rejects live Stripe keys, live webhook events, and any
  `APP_URL` other than `https://staging.botdhockey.com`.
- The webhook Access bypass must remain limited to
  `/api/stripe/webhook` exactly.
- The protected v6.8 application is served only after session and entitlement
  validation.
