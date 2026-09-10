# Release candidate 4: ordered subscription and failed-payment state

Copyright © 2026 FENRIR LLC. All rights reserved.

RC4 fixes the billing-state race discovered by the real Stripe Sandbox Test
Clock renewal test.

## Acceptance-test finding

Stripe generated a genuine `invoice.payment_failed` event and delivered it to
RC3 with HTTP 200. Supabase correctly stored `status = past_due`, but
`grace_period_end` was later overwritten with `NULL`, and the `coach_pro`
entitlement became inactive.

RC3 processed `invoice.payment_failed` and `customer.subscription.updated` as
independent read-modify-write operations. Stripe can deliver those events in
parallel. Both handlers could read an empty grace value, then whichever wrote
last determined the final row. A subscription update could therefore erase the
grace deadline created by the failed-invoice handler.

## Fixed

- Subscription snapshot and invoice-payment state are now applied by one
  PostgreSQL function under a row lock.
- Each handler retrieves the current Stripe subscription, including its latest
  invoice, before applying state.
- Subscription snapshots are ordered by the time the Worker observed the
  current Stripe object, preventing a slower stale handler from overwriting a
  newer snapshot.
- Invoice states are ordered by invoice creation time and progression:
  `failed` -> `terminal` -> `paid`.
- A paid recovery for an invoice wins over any late failure delivery for that
  same invoice.
- Duplicate or parallel deliveries for the same failed invoice preserve the
  original grace deadline instead of extending it.
- A new failed renewal invoice starts a new seven-day grace period.
- An unresolved grace deadline takes precedence even if Stripe temporarily
  reports the subscription as `active`.
- The authenticated app now displays a visible payment-failure warning and the
  exact access-through date while grace is active.
- The health endpoint verifies that the RC4 payment-state schema is installed.
- A dedicated billing-state smoke test covers concurrent failure events,
  duplicate delivery, recovery, and stale-handler rejection.

## Preserved

- B.O.T.D. Hockey Playbook Studio v6.8 application payload and file format
- account-scoped browser storage from RC2
- password-recovery hardening from RC3
- monthly and annual Stripe Sandbox checkout
- Customer Portal
- Stripe signature verification
- Cloudflare Access configuration
- staging-only live-data safety locks

## Required migration

Existing staging databases must run:

```text
supabase/04_subscription_state_ordering.sql
```

No DNS, Stripe destination, webhook secret, Cloudflare Access, or runtime
variable change is required.
