import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourcePath = path.join(root, "src/worker.js");
const temporaryPath = path.join(root, `.worker-smoke-${process.pid}.mjs`);
let source = fs.readFileSync(sourcePath, "utf8");
source = source.replace(
  /^import APP_HTML from .*?;\s*/,
  'const APP_HTML = "<!doctype html><title>protected app</title>";\n',
);
fs.writeFileSync(temporaryPath, source);

try {
  const { default: worker } = await import(`${pathToFileURL(temporaryPath).href}?v=${Date.now()}`);
  const env = {
    ENVIRONMENT: "staging",
    APP_URL: "https://staging.botdhockey.com",
    SUPABASE_URL: "https://exampleproject.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"p".repeat(40)}`,
    SUPABASE_SECRET_KEY: `sb_secret_${"s".repeat(40)}`,
    STRIPE_SECRET_KEY: `sk_test_${"t".repeat(40)}`,
    STRIPE_WEBHOOK_SECRET: `whsec_${"w".repeat(40)}`,
    STRIPE_PRICE_MONTHLY: `price_${"m".repeat(24)}`,
    STRIPE_PRICE_ANNUAL: `price_${"a".repeat(24)}`,
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === "/index.html") {
          return new Response("<!doctype html><title>shell</title>", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        if (url.pathname === "/LICENSE.txt") {
          return new Response("license", {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        return new Response("not found", { status: 404 });
      },
    },
  };

  const health = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/health"),
    env,
    {},
  );
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const rootResponse = await worker.fetch(
    new Request("https://staging.botdhockey.com/"),
    env,
    {},
  );
  assert.equal(rootResponse.status, 200);
  assert.match(rootResponse.headers.get("content-security-policy") || "", /frame-src 'self'/);

  const protectedResponse = await worker.fetch(
    new Request("https://staging.botdhockey.com/protected/app.html"),
    env,
    {},
  );
  assert.equal(protectedResponse.status, 303);
  assert.equal(protectedResponse.headers.get("location"), "https://staging.botdhockey.com/?next=app");

  const directPayload = await worker.fetch(
    new Request("https://staging.botdhockey.com/app-v6.8.html"),
    env,
    {},
  );
  assert.equal(directPayload.status, 404);

  const webhookGet = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/stripe/webhook"),
    env,
    {},
  );
  assert.equal(webhookGet.status, 405);

  const invalidWebhook = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/stripe/webhook", {
      method: "POST",
      headers: { "Stripe-Signature": "t=1,v1=invalid" },
      body: "{}",
    }),
    env,
    {},
  );
  assert.equal(invalidWebhook.status, 400);

  const crossOrigin = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/auth/signup", {
      method: "POST",
      headers: {
        Origin: "https://example.invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "test@example.com", password: "not-a-real-password", acceptTerms: true }),
    }),
    env,
    {},
  );
  assert.equal(crossOrigin.status, 403);

  console.log("Worker smoke tests passed.");
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
