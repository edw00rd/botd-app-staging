import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourcePath = path.join(root, "src/worker.js");
const temporaryPath = path.join(root, `.worker-billing-smoke-${process.pid}.mjs`);
let source = fs.readFileSync(sourcePath, "utf8");
source = source.replace(
  /^import APP_HTML from .*?;\s*/,
  'const APP_HTML = "<!doctype html>";\n',
);
source += "\nexport { processStripeEvent, subscriptionAccessUntil, classifyInvoicePaymentState, invoicePaymentStateFromEvent };\n";
fs.writeFileSync(temporaryPath, source);

const userId = "33333333-3333-4333-8333-333333333333";
const subscriptionId = "sub_rc5billingstate0001";
const customerId = "cus_rc5billingstate0001";
const priceId = "price_rc5monthly000000000001";
const invoiceId = "in_rc5renewal00000000001";
const periodEnd = Math.floor(Date.now() / 1000) + 31 * 24 * 60 * 60;

let stripeSubscription = {
  id: subscriptionId,
  object: "subscription",
  livemode: false,
  customer: customerId,
  status: "past_due",
  cancel_at_period_end: false,
  metadata: { supabase_user_id: userId },
  items: {
    data: [
      {
        current_period_end: periodEnd,
        price: {
          id: priceId,
          recurring: { interval: "month" },
        },
      },
    ],
  },
  // Deliberately leave latest_invoice unexpanded. The real Stripe Sandbox
  // response that exposed RC4 behaved this way even though expansion was
  // requested. Invoice webhook payloads must therefore carry payment state.
  latest_invoice: invoiceId,
};

const failedInvoicePayload = {
  id: invoiceId,
  object: "invoice",
  created: 2_000_000_000,
  status: "open",
  paid: false,
  attempted: true,
  attempt_count: 1,
  subscription: subscriptionId,
};

const db = {
  billing_customers: [],
  subscriptions: [],
  entitlements: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function eqValue(url, name) {
  const raw = url.searchParams.get(name);
  return raw?.startsWith("eq.") ? raw.slice(3) : null;
}

function filteredRows(table, url) {
  let rows = db[table].map(clone);
  for (const key of [
    "user_id",
    "stripe_customer_id",
    "stripe_subscription_id",
    "entitlement",
    "livemode",
  ]) {
    const value = eqValue(url, key);
    if (value === null) continue;
    rows = rows.filter((row) => String(row[key]) === value);
  }
  const limit = Number(url.searchParams.get("limit") || 0);
  return limit > 0 ? rows.slice(0, limit) : rows;
}

function upsert(table, incoming, conflictColumns) {
  for (const row of incoming) {
    const index = db[table].findIndex((existing) =>
      conflictColumns.every((column) => existing[column] === row[column]),
    );
    if (index >= 0) db[table][index] = { ...db[table][index], ...clone(row) };
    else db[table].push(clone(row));
  }
}

function stateRank(state) {
  return state === "paid" ? 3 : state === "terminal" ? 2 : state === "failed" ? 1 : 0;
}

function applySubscriptionState(args) {
  let row = db.subscriptions.find(
    (candidate) => candidate.stripe_subscription_id === args.p_subscription_id,
  );
  if (!row) {
    row = {
      stripe_subscription_id: args.p_subscription_id,
      user_id: args.p_user_id,
      stripe_customer_id: args.p_customer_id,
      stripe_price_id: args.p_price_id,
      billing_interval: args.p_billing_interval,
      status: args.p_status,
      current_period_end: args.p_current_period_end,
      cancel_at_period_end: args.p_cancel_at_period_end,
      livemode: false,
      grace_period_end: null,
      last_stripe_observed_at: null,
      last_stripe_event_created: null,
      last_invoice_id: null,
      last_invoice_created: null,
      last_invoice_state: null,
      last_invoice_event_created: null,
    };
    db.subscriptions.push(row);
  }

  assert.equal(row.user_id, args.p_user_id);
  assert.equal(row.stripe_customer_id, args.p_customer_id);

  const incomingObserved = Date.parse(args.p_observed_at);
  const existingObserved = row.last_stripe_observed_at
    ? Date.parse(row.last_stripe_observed_at)
    : Number.NEGATIVE_INFINITY;
  const applySnapshot =
    incomingObserved > existingObserved ||
    (
      incomingObserved === existingObserved &&
      args.p_event_created >= (row.last_stripe_event_created ?? 0)
    );

  if (applySnapshot) {
    Object.assign(row, {
      stripe_price_id: args.p_price_id,
      billing_interval: args.p_billing_interval,
      status: args.p_status,
      current_period_end: args.p_current_period_end,
      cancel_at_period_end: args.p_cancel_at_period_end,
      livemode: false,
      last_stripe_observed_at: args.p_observed_at,
      last_stripe_event_id: args.p_event_id,
      last_stripe_event_created: args.p_event_created,
    });
  }

  let applyInvoice = false;
  if (args.p_invoice_state) {
    const incomingRank = stateRank(args.p_invoice_state);
    const existingRank = stateRank(row.last_invoice_state);
    const existingInvoiceCreated = row.last_invoice_created ?? null;
    const existingEventCreated = row.last_invoice_event_created ?? 0;
    const sameInvoice = row.last_invoice_id === args.p_invoice_id;

    applyInvoice =
      existingInvoiceCreated === null ||
      args.p_invoice_created > existingInvoiceCreated ||
      (
        args.p_invoice_created === existingInvoiceCreated &&
        (
          (
            sameInvoice &&
            (
              incomingRank > existingRank ||
              (incomingRank === existingRank && args.p_event_created >= existingEventCreated)
            )
          ) ||
          (!sameInvoice && args.p_event_created > existingEventCreated)
        )
      );

    if (applyInvoice) {
      if (args.p_invoice_state === "failed") {
        row.grace_period_end = sameInvoice
          ? row.grace_period_end || args.p_grace_deadline
          : args.p_grace_deadline;
      } else {
        row.grace_period_end = null;
      }
      row.last_invoice_id = args.p_invoice_id;
      row.last_invoice_created = args.p_invoice_created;
      row.last_invoice_state = args.p_invoice_state;
      row.last_invoice_event_id = args.p_event_id;
      row.last_invoice_event_created = args.p_event_created;
    }
  }

  return [
    {
      snapshot_applied: applySnapshot,
      invoice_state_applied: applyInvoice,
      account_user_id: row.user_id,
      effective_status: row.status,
      effective_grace_period_end: row.grace_period_end ?? null,
      effective_invoice_state: row.last_invoice_state ?? null,
    },
  ];
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const method = (init.method || "GET").toUpperCase();

  if (url.hostname === "api.stripe.com") {
    if (method === "GET" && url.pathname === `/v1/subscriptions/${subscriptionId}`) {
      return new Response(JSON.stringify(clone(stripeSubscription)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`Unexpected Stripe request: ${method} ${url}`);
  }

  if (url.hostname === "exampleproject.supabase.co") {
    const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/);
    if (rpcMatch) {
      assert.equal(method, "POST");
      assert.equal(rpcMatch[1], "apply_stripe_subscription_state");
      const args = JSON.parse(init.body || "{}");
      return new Response(JSON.stringify(applySubscriptionState(args)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tableMatch = url.pathname.match(/^\/rest\/v1\/(billing_customers|subscriptions|entitlements)$/);
    if (!tableMatch) throw new Error(`Unexpected Supabase request: ${method} ${url}`);
    const table = tableMatch[1];

    if (method === "GET") {
      return new Response(JSON.stringify(filteredRows(table, url)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const incoming = JSON.parse(init.body || "[]");
      const conflicts = table === "billing_customers"
        ? ["user_id"]
        : table === "subscriptions"
          ? ["stripe_subscription_id"]
          : ["user_id", "entitlement"];
      upsert(table, incoming, conflicts);
      return new Response(null, { status: 204 });
    }

    if (method === "PATCH") {
      const values = JSON.parse(init.body || "{}");
      const rows = filteredRows(table, url);
      for (const selected of rows) {
        const key = table === "subscriptions"
          ? "stripe_subscription_id"
          : table === "billing_customers"
            ? "user_id"
            : "user_id";
        const real = db[table].find((candidate) => candidate[key] === selected[key]);
        Object.assign(real, clone(values));
      }
      return new Response(null, { status: 204 });
    }
  }

  throw new Error(`Unexpected fetch: ${method} ${url}`);
};

const env = {
  ENVIRONMENT: "staging",
  APP_URL: "https://staging.botdhockey.com",
  SUPABASE_URL: "https://exampleproject.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"p".repeat(40)}`,
  SUPABASE_SECRET_KEY: `sb_secret_${"s".repeat(40)}`,
  STRIPE_SECRET_KEY: `sk_test_${"t".repeat(40)}`,
  STRIPE_WEBHOOK_SECRET: `whsec_${"w".repeat(40)}`,
  STRIPE_PRICE_MONTHLY: priceId,
  STRIPE_PRICE_ANNUAL: `price_${"a".repeat(24)}`,
};

function event(id, type, created, object) {
  return {
    id,
    type,
    created,
    livemode: false,
    data: { object },
  };
}

try {
  const module = await import(`${pathToFileURL(temporaryPath).href}?v=${Date.now()}`);
  const {
    processStripeEvent,
    subscriptionAccessUntil,
    classifyInvoicePaymentState,
    invoicePaymentStateFromEvent,
  } = module;

  assert.equal(classifyInvoicePaymentState(failedInvoicePayload), "failed");
  assert.equal(invoicePaymentStateFromEvent("invoice.payment_failed"), "failed");
  assert.equal(invoicePaymentStateFromEvent("invoice.paid"), "paid");
  assert.equal(
    subscriptionAccessUntil({
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
      grace_period_end: new Date(Date.now() - 60_000).toISOString(),
    }),
    false,
    "Expired grace must override an otherwise-active subscription period.",
  );

  const subscriptionEvent = event(
    "evt_subscription_updated_failed",
    "customer.subscription.updated",
    2_000_000_005,
    clone(stripeSubscription),
  );
  const failedInvoiceEvent = event(
    "evt_invoice_failed",
    "invoice.payment_failed",
    2_000_000_006,
    clone(failedInvoicePayload),
  );

  await Promise.all([
    processStripeEvent(subscriptionEvent, env),
    processStripeEvent(failedInvoiceEvent, env),
  ]);

  const failedRow = db.subscriptions.find(
    (row) => row.stripe_subscription_id === subscriptionId,
  );
  const failedEntitlement = db.entitlements.find(
    (row) => row.user_id === userId && row.entitlement === "coach_pro",
  );
  assert.equal(failedRow.status, "past_due");
  assert.equal(failedRow.last_invoice_state, "failed");
  assert.ok(failedRow.grace_period_end, "Failed renewal must create grace_period_end.");
  assert.equal(failedEntitlement.active, true);
  assert.equal(failedEntitlement.source_subscription_id, subscriptionId);
  assert.equal(failedEntitlement.expires_at, failedRow.grace_period_end);

  const originalGrace = failedRow.grace_period_end;
  await processStripeEvent(
    event(
      "evt_subscription_updated_failed_again",
      "customer.subscription.updated",
      2_000_000_010,
      clone(stripeSubscription),
    ),
    env,
  );
  assert.equal(
    failedRow.grace_period_end,
    originalGrace,
    "Repeated events for the same failed invoice must not extend grace.",
  );

  stripeSubscription = {
    ...stripeSubscription,
    status: "active",
    latest_invoice: invoiceId,
  };
  const paidInvoicePayload = {
    ...failedInvoicePayload,
    status: "paid",
    paid: true,
    attempted: true,
    attempt_count: 2,
  };

  await Promise.all([
    processStripeEvent(
      event(
        "evt_late_failed_delivery",
        "invoice.payment_failed",
        2_000_000_011,
        clone(failedInvoicePayload),
      ),
      env,
    ),
    processStripeEvent(
      event(
        "evt_invoice_paid_recovery",
        "invoice.paid",
        2_000_000_012,
        clone(paidInvoicePayload),
      ),
      env,
    ),
  ]);

  const recoveredRow = db.subscriptions.find(
    (row) => row.stripe_subscription_id === subscriptionId,
  );
  const recoveredEntitlement = db.entitlements.find(
    (row) => row.user_id === userId && row.entitlement === "coach_pro",
  );
  assert.equal(recoveredRow.status, "active");
  assert.equal(recoveredRow.last_invoice_state, "paid");
  assert.equal(recoveredRow.grace_period_end, null);
  assert.equal(recoveredEntitlement.active, true);
  assert.equal(recoveredEntitlement.source_subscription_id, subscriptionId);
  assert.equal(
    recoveredEntitlement.expires_at,
    new Date(periodEnd * 1000).toISOString(),
  );

  const recoveredObservedAt = recoveredRow.last_stripe_observed_at;
  const staleResult = applySubscriptionState({
    p_subscription_id: subscriptionId,
    p_user_id: userId,
    p_customer_id: customerId,
    p_price_id: priceId,
    p_billing_interval: "month",
    p_status: "past_due",
    p_current_period_end: new Date(periodEnd * 1000).toISOString(),
    p_cancel_at_period_end: false,
    p_livemode: false,
    p_observed_at: new Date(Date.parse(recoveredObservedAt) - 1_000).toISOString(),
    p_event_id: "evt_stale_failed_handler",
    p_event_created: 2_000_000_009,
    p_invoice_id: invoiceId,
    p_invoice_created: 2_000_000_000,
    p_invoice_state: "failed",
    p_grace_deadline: new Date(Date.now() + 7 * 86400_000).toISOString(),
  });
  assert.equal(staleResult[0].snapshot_applied, false);
  assert.equal(staleResult[0].invoice_state_applied, false);
  assert.equal(recoveredRow.status, "active");
  assert.equal(recoveredRow.last_invoice_state, "paid");
  assert.equal(recoveredRow.grace_period_end, null);

  console.log("Billing-state ordering smoke tests passed.");
  console.log("Signed invoice webhook payloads work when latest_invoice is unexpanded.");
  console.log("Concurrent subscription/payment-failure events preserve one grace deadline.");
  console.log("Payment recovery wins over late failed-event delivery for the same invoice.");
} finally {
  globalThis.fetch = originalFetch;
  fs.rmSync(temporaryPath, { force: true });
}
