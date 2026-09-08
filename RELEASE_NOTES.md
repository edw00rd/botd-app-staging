# Release candidate 1: staging accounts and billing entitlement

This package is the first staging-only integration of B.O.T.D. Hockey Playbook
Studio v6.8 with Supabase authentication and Stripe subscriptions.

## Added

- account creation, email confirmation, sign-in, sign-out, and password reset
- secure HTTP-only Supabase session cookies
- separate monthly and annual Stripe test Checkout Sessions
- verified Stripe webhook processing with event idempotency
- one `coach_pro` entitlement shared by both billing intervals
- Stripe Customer Portal entry point
- server-side entitlement enforcement before v6.8 is delivered
- seven-day failed-payment grace period
- staging-only Stripe and database safety locks
- canonical redirect to `https://staging.botdhockey.com`

## Preserved

The v6.8 application payload is byte-for-byte unchanged from the supplied
release candidate. Existing staging browser storage remains on the same custom
domain and therefore remains available to the protected application.

## Not included yet

- production/live Stripe configuration
- migration of live purchasers into customer accounts
- cloud-synchronized playbooks or share links
- self-service switching between monthly and annual billing
- company-controlled production SMTP

Those items follow only after this release passes staging acceptance tests.
