import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourcePath = path.join(root, "src/worker.js");
const temporaryPath = path.join(root, `.worker-smoke-${process.pid}.mjs`);
let source = fs.readFileSync(sourcePath, "utf8");
const mockAppHtml = '<!doctype html><script>const BOTD_ACCOUNT_ID="__BOTD_ACCOUNT_ID__";const ACCOUNT_STORAGE_NAMESPACE=`botdHockeyCoachingAid.user.${BOTD_ACCOUNT_ID.toLowerCase()}`;const SESSION_KEY=`${ACCOUNT_STORAGE_NAMESPACE}.session.v6_8`;</script>';
source = source.replace(
  /^import APP_HTML from .*?;\s*/,
  `const APP_HTML = ${JSON.stringify(mockAppHtml)};\n`,
);
fs.writeFileSync(temporaryPath, source);

const userA = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "account-a@example.invalid",
  email_confirmed_at: "2026-09-08T00:00:00.000Z",
  created_at: "2026-09-08T00:00:00.000Z",
};
const userB = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "account-b@example.invalid",
  email_confirmed_at: "2026-09-08T00:00:00.000Z",
  created_at: "2026-09-08T00:00:00.000Z",
};
const recoveryAccessToken = "recovery-access-token-for-account-a-1234567890";
// Supabase refresh tokens are opaque and can be shorter than 20 characters.
const shortRecoveryRefreshToken = "short-token-1";
const originalFetch = globalThis.fetch;
let capturedRecoveryRedirect = null;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));

  if (url.pathname === "/auth/v1/user") {
    const authorization = headers.get("Authorization");
    const user = authorization === "Bearer access-a"
      || authorization === `Bearer ${recoveryAccessToken}`
      ? userA
      : authorization === "Bearer access-b"
        ? userB
        : null;
    if ((init.method || "GET").toUpperCase() === "PUT") {
      return new Response(JSON.stringify(user || { message: "invalid token" }), {
        status: user ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(user || { message: "invalid token" }), {
      status: user ? 200 : 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/auth/v1/logout") {
    return new Response(null, { status: 204 });
  }

  if (url.pathname === "/auth/v1/recover") {
    capturedRecoveryRedirect = url.searchParams.get("redirect_to");
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/rest/v1/subscriptions" && url.searchParams.has("select")) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/rest/v1/entitlements") {
    return new Response(JSON.stringify([{ active: true, expires_at: null }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  throw new Error(`Unexpected smoke-test fetch: ${url.toString()}`);
};

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
  const healthPayload = await health.json();
  assert.equal(healthPayload.ok, true);
  assert.equal(healthPayload.version, "6.8-entitlement-rc4");

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

  const recoveryRequestResponse = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/auth/recover", {
      method: "POST",
      headers: {
        Origin: "https://staging.botdhockey.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "account-a@example.invalid" }),
    }),
    env,
    {},
  );
  assert.equal(recoveryRequestResponse.status, 200);
  assert.equal(capturedRecoveryRedirect, "https://staging.botdhockey.com/");
  assert.ok(!capturedRecoveryRedirect.includes("mode=recovery"));

  const adoptRecoveryResponse = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/auth/adopt", {
      method: "POST",
      headers: {
        Origin: "https://staging.botdhockey.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken: recoveryAccessToken,
        refreshToken: shortRecoveryRefreshToken,
        flowType: "recovery",
        expiresIn: 3600,
      }),
    }),
    env,
    {},
  );
  assert.equal(adoptRecoveryResponse.status, 200);
  const adoptRecoveryPayload = await adoptRecoveryResponse.json();
  assert.equal(adoptRecoveryPayload.recovery, true);
  const adoptedCookies = adoptRecoveryResponse.headers.get("set-cookie") || "";
  assert.match(adoptedCookies, /__Host-botd_refresh=short-token-1/);
  assert.match(adoptedCookies, /__Host-botd_recovery=11111111-1111-4111-8111-111111111111/);

  const recoverySessionCookie = [
    `__Host-botd_access=${recoveryAccessToken}`,
    `__Host-botd_refresh=${shortRecoveryRefreshToken}`,
    `__Host-botd_recovery=${userA.id}`,
  ].join("; ");
  const recoverySessionResponse = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/auth/session", {
      headers: { Cookie: recoverySessionCookie },
    }),
    env,
    {},
  );
  assert.equal(recoverySessionResponse.status, 200);
  const recoverySessionPayload = await recoverySessionResponse.json();
  assert.equal(recoverySessionPayload.authenticated, true);
  assert.equal(recoverySessionPayload.recovery, true);

  const ordinaryPasswordChange = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/auth/password", {
      method: "POST",
      headers: {
        Origin: "https://staging.botdhockey.com",
        Cookie: "__Host-botd_access=access-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "new-password-123" }),
    }),
    env,
    {},
  );
  assert.equal(ordinaryPasswordChange.status, 403);
  assert.equal((await ordinaryPasswordChange.json()).error, "recovery_session_required");

  const recoveryPasswordChange = await worker.fetch(
    new Request("https://staging.botdhockey.com/api/auth/password", {
      method: "POST",
      headers: {
        Origin: "https://staging.botdhockey.com",
        Cookie: recoverySessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "new-password-123" }),
    }),
    env,
    {},
  );
  assert.equal(recoveryPasswordChange.status, 200);
  const recoveryPasswordPayload = await recoveryPasswordChange.json();
  assert.match(recoveryPasswordPayload.message, /Sign in with your new password/);
  const clearedCookies = recoveryPasswordChange.headers.get("set-cookie") || "";
  assert.match(clearedCookies, /__Host-botd_recovery=.*Max-Age=0/);

  const accountAResponse = await worker.fetch(
    new Request(`https://staging.botdhockey.com/protected/app.html?account=${userA.id}`, {
      headers: { Cookie: "__Host-botd_access=access-a" },
    }),
    env,
    {},
  );
  assert.equal(accountAResponse.status, 200);
  assert.equal(accountAResponse.headers.get("x-botd-storage-isolation"), "account-scoped-v1");
  const accountABody = await accountAResponse.text();
  assert.ok(accountABody.includes(userA.id));
  assert.ok(accountABody.includes(`const BOTD_ACCOUNT_ID="${userA.id}"`));
  assert.ok(accountABody.includes("botdHockeyCoachingAid.user.${BOTD_ACCOUNT_ID.toLowerCase()}"));
  assert.ok(!accountABody.includes("__BOTD_ACCOUNT_ID__"));
  assert.ok(!accountABody.includes(userB.id));

  const accountBResponse = await worker.fetch(
    new Request(`https://staging.botdhockey.com/protected/app.html?account=${userB.id}`, {
      headers: { Cookie: "__Host-botd_access=access-b" },
    }),
    env,
    {},
  );
  assert.equal(accountBResponse.status, 200);
  const accountBBody = await accountBResponse.text();
  assert.ok(accountBBody.includes(userB.id));
  assert.ok(accountBBody.includes(`const BOTD_ACCOUNT_ID="${userB.id}"`));
  assert.ok(accountBBody.includes("botdHockeyCoachingAid.user.${BOTD_ACCOUNT_ID.toLowerCase()}"));
  assert.ok(!accountBBody.includes("__BOTD_ACCOUNT_ID__"));
  assert.ok(!accountBBody.includes(userA.id));
  assert.notEqual(accountABody, accountBBody);

  const mismatchResponse = await worker.fetch(
    new Request(`https://staging.botdhockey.com/protected/app.html?account=${userB.id}`, {
      headers: { Cookie: "__Host-botd_access=access-a" },
    }),
    env,
    {},
  );
  assert.equal(mismatchResponse.status, 409);
  assert.equal((await mismatchResponse.json()).error, "account_context_mismatch");

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
      body: JSON.stringify({
        email: "test@example.com",
        password: "not-a-real-password",
        acceptTerms: true,
      }),
    }),
    env,
    {},
  );
  assert.equal(crossOrigin.status, 403);

  console.log("Worker smoke tests passed.");
  console.log("Account-scoped protected application responses passed for two distinct users.");
  console.log("Short opaque refresh-token adoption and recovery-session controls passed.");
} finally {
  globalThis.fetch = originalFetch;
  fs.rmSync(temporaryPath, { force: true });
}
