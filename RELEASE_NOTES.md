# Release candidate 5: signed invoice-event state

Copyright (c) 2026 FENRIR LLC. All rights reserved.

## Acceptance-test finding

A genuine Stripe Sandbox Test Clock renewal produced
`invoice.payment_failed`. Stripe delivered the signed event to RC4 with HTTP
200, and the subscription snapshot became `past_due`. However, the following
fields remained empty:

```text
last_invoice_state
grace_period_end
coach_pro entitlement
```

RC4 discarded the invoice event object and inferred payment state only from a
second subscription retrieval. The observed Stripe response did not expose
`latest_invoice` as an expanded object, so RC4 had no invoice status to apply.

## Fixed

- `invoice.payment_failed` now supplies the verified invoice payload directly
  to the billing-state synchronizer.
- `invoice.paid` uses the same signed-payload path for payment recovery.
- Event type is authoritative for failed versus paid invoice state.
- Invoice ID and creation time come from the signed invoice event, with event
  creation time as a defensive fallback.
- Current subscription status, customer, price, and period still come from a
  fresh Stripe subscription retrieval.
- RC4's PostgreSQL row lock, invoice ordering, replay protection, and
  paid-over-failed precedence are preserved.
- The billing smoke test now deliberately returns `latest_invoice` as an
  unexpanded ID and proves that both failure grace and paid recovery still
  work.

## Preserved

- B.O.T.D. Hockey Playbook Studio v6.8 application payload and file format
- account-scoped browser storage from RC2
- password-recovery hardening from RC3
- ordered subscription/invoice database state from RC4
- monthly and annual Stripe Sandbox checkout
- Customer Portal
- Stripe signature verification
- Cloudflare Access configuration
- staging-only live-data safety locks

## Migration

No new SQL migration is required when upgrading from RC4. The existing
`supabase/04_subscription_state_ordering.sql` function remains the database
write boundary.
