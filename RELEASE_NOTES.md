# Release candidate 3: password-recovery hardening

RC3 fixes the Supabase password-recovery defects found during staging
acceptance testing while retaining RC2 account-scoped browser storage and the
existing authentication, billing, webhook, and entitlement architecture.

## Fixed

- Valid Supabase recovery links no longer fail with `The refresh token is
  invalid.` Supabase refresh tokens are opaque and can legitimately be shorter
  than the 20-character minimum incorrectly imposed by RC2.
- The recovery flow now enters password-change mode only after the Worker has
  validated and adopted a Supabase recovery session.
- A stale `?mode=recovery` query can no longer make an ordinary email/password
  login display the Set a new password screen.
- Recovery credentials are removed from the browser address bar before the
  client sends them to the Worker.
- The password-change API now requires a short-lived, HTTP-only recovery
  context tied to the authenticated Supabase user.
- Successful password reset clears the local auth cookies and requires a clean
  sign-in with the new password. Account-scoped local playbooks and settings
  are not deleted.
- Expired or reused recovery links are cleaned from browser state and produce
  a controlled error instead of a retry loop.

## Recovery flow

```text
Request reset email
  -> open Supabase recovery link
  -> Worker validates recovery access token
  -> Worker stores auth and recovery context in HTTP-only cookies
  -> Set a new password
  -> all local auth cookies are cleared
  -> sign in with the new password
```

The recovery-context cookie expires after 30 minutes and is bound to the
server-validated Supabase user ID.

## Unchanged

- B.O.T.D. Hockey Playbook Studio v6.8 feature set and file format
- account-scoped local session, settings, and playbook storage
- Supabase schema and RLS policies
- monthly and annual Stripe test prices
- webhook endpoint and signing secret
- Stripe Customer Portal configuration
- Cloudflare Access rules and DNS
- seven-day failed-payment grace logic

## No infrastructure changes required

Upgrading from RC2 requires no DNS, Cloudflare Access, Stripe, webhook,
Supabase SQL, or environment-variable changes.
