# Release candidate 2: account-scoped browser storage

RC2 fixes the multi-account browser-storage defect found during staging
acceptance testing while retaining the RC1 authentication, billing, webhook,
and entitlement architecture.

## Fixed

- Local working-session data is now scoped to the authenticated Supabase user.
- Local playbook data is now scoped to the authenticated Supabase user.
- The Worker injects the server-verified account ID into the protected v6.8
  template only after validating the session and `coach_pro` entitlement.
- A protected-app request whose account query does not match the authenticated
  session is rejected.
- The account shell unloads the protected iframe on sign-out, account change,
  password-recovery mode, or loss of entitlement.

## Storage format

RC2 uses:

```text
botdHockeyCoachingAid.user.<supabase-user-id>.session.v6_8
botdHockeyCoachingAid.user.<supabase-user-id>.playbook.v6_8
```

It no longer reads the unscoped RC1 keys during normal application startup.
This prevents account B from automatically loading account A's local playbook
when both accounts use the same browser profile.

## Migration behavior

RC1 shared data is not automatically assigned to an account because ownership
is ambiguous after more than one account has used the browser. Export wanted
staging data before deployment and import it into the intended account after
RC2 is live.

A user-confirmed legacy-data claim flow remains required before production
cutover.

## Unchanged

- v6.8 product features and file format
- Supabase schema and RLS policies
- monthly and annual Stripe test prices
- webhook endpoint and signing secret
- Stripe Customer Portal configuration
- Cloudflare Access rules and DNS
- seven-day failed-payment grace logic

## Still not included

- production/live Stripe configuration
- migration of existing live purchasers into customer accounts
- cloud-synchronized playbooks or share links
- production legacy-playbook claim flow
- self-service monthly/annual plan switching
- company-controlled production SMTP
