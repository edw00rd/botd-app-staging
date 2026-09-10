import APP_HTML from "../private/app-v6.8.html.txt";

/*
 * B.O.T.D. Hockey Playbook Studio - staging access and billing worker
 * Copyright (c) 2026 FENRIR LLC. All rights reserved.
 * Proprietary software. No source-code license is granted.
 */

const ACCESS_COOKIE = "__Host-botd_access";
const REFRESH_COOKIE = "__Host-botd_refresh";
const RECOVERY_COOKIE = "__Host-botd_recovery";
const COACH_PRO = "coach_pro";
const JSON_TYPE = "application/json; charset=utf-8";
const MAX_JSON_BYTES = 32_768;
const MAX_WEBHOOK_BYTES = 1_048_576;
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
const PAYMENT_GRACE_DAYS = 7;
const RECOVERY_COOKIE_MAX_AGE_SECONDS = 30 * 60;
const APP_ACCOUNT_ID_TOKEN = "__BOTD_ACCOUNT_ID__";

class AppError extends Error {
  constructor(status, code, message, expose = true) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export default {
  async fetch(request, env, ctx) {
    const requestId = request.headers.get("cf-ray") || crypto.randomUUID();

    try {
      const response = await routeRequest(request, env, ctx);
      return addResponseHeaders(response, requestId);
    } catch (error) {
      const normalized = normalizeError(error);
      console.error("BOTD request failed", {
        requestId,
        status: normalized.status,
        code: normalized.code,
        message: normalized.message,
      });

      const response = jsonResponse(
        {
          ok: false,
          error: normalized.code,
          message: normalized.expose
            ? normalized.message
            : "The request could not be completed.",
          requestId,
        },
        normalized.status,
      );
      return addResponseHeaders(response, requestId);
    }
  },
};

async function routeRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  // Keep all browser sessions on the branded staging origin so secure cookies,
  // Supabase redirects, and Stripe return URLs never split across Worker hosts.
  if (isValidStagingAppUrl(env.APP_URL) && url.origin !== getAppUrl(env)) {
    if (request.method === "GET" || request.method === "HEAD") {
      const canonical = new URL(`${path}${url.search}`, getAppUrl(env));
      return redirectResponse(canonical.toString());
    }
    throw new AppError(
      421,
      "canonical_host_required",
      "Use the branded staging hostname for this request.",
    );
  }

  if (path === "/api/stripe/webhook") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    return handleStripeWebhook(request, env);
  }

  if (path === "/auth/confirm") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return handleAuthConfirmation(request, env);
  }

  if (path === "/protected/app.html" || path === "/protected/app") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return methodNotAllowed(["GET", "HEAD"]);
    }
    return serveProtectedApplication(request, env);
  }

  if (path === "/protected/LICENSE.txt") {
    return serveAssetAt(request, env, "/LICENSE.txt", { cache: "public" });
  }

  if (path.startsWith("/api/")) {
    return routeApiRequest(request, env, ctx, path);
  }

  return servePublicAsset(request, env, path);
}

async function routeApiRequest(request, env, ctx, path) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { Allow: "GET, POST, OPTIONS" },
    });
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    assertSameOrigin(request);
  }

  switch (`${request.method} ${path}`) {
    case "GET /api/health":
      return handleHealth(env);
    case "GET /api/auth/session":
      return handleSession(request, env);
    case "POST /api/auth/signup":
      return handleSignup(request, env);
    case "POST /api/auth/signin":
      return handleSignin(request, env);
    case "POST /api/auth/signout":
      return handleSignout(request, env);
    case "POST /api/auth/resend":
      return handleResendConfirmation(request, env);
    case "POST /api/auth/recover":
      return handlePasswordRecovery(request, env);
    case "POST /api/auth/adopt":
      return handleAdoptSession(request, env);
    case "POST /api/auth/password":
      return handlePasswordChange(request, env);
    case "GET /api/account":
      return handleAccount(request, env);
    case "POST /api/checkout":
      return handleCreateCheckout(request, env);
    case "GET /api/checkout/status":
      return handleCheckoutStatus(request, env);
    case "POST /api/billing/portal":
      return handleBillingPortal(request, env);
    default:
      return jsonResponse(
        { ok: false, error: "not_found", message: "API route not found." },
        404,
      );
  }
}

async function handleHealth(env) {
  const checks = {
    environment: env.ENVIRONMENT === "staging",
    appUrl: isValidStagingAppUrl(env.APP_URL),
    supabaseUrl: Boolean(normalizeSupabaseUrl(env.SUPABASE_URL)),
    supabasePublishableKey: isPublishableSupabaseKey(
      env.SUPABASE_PUBLISHABLE_KEY,
    ),
    supabaseSecretKey: isBackendSupabaseKey(env.SUPABASE_SECRET_KEY),
    stripeTestSecretKey:
      typeof env.STRIPE_SECRET_KEY === "string" &&
      env.STRIPE_SECRET_KEY.startsWith("sk_test_"),
    stripeMonthlyPrice:
      typeof env.STRIPE_PRICE_MONTHLY === "string" &&
      env.STRIPE_PRICE_MONTHLY.startsWith("price_"),
    stripeAnnualPrice:
      typeof env.STRIPE_PRICE_ANNUAL === "string" &&
      env.STRIPE_PRICE_ANNUAL.startsWith("price_"),
    stripeWebhookSecret:
      typeof env.STRIPE_WEBHOOK_SECRET === "string" &&
      env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_"),
    paymentStateSchema: await checkPaymentStateSchema(env),
  };

  return jsonResponse({
    ok: Object.values(checks).every(Boolean),
    service: "botd-app-staging",
    version: "6.8-entitlement-rc5",
    mode: "staging-test-only",
    checks,
    now: new Date().toISOString(),
  });
}

async function handleSignup(request, env) {
  assertSupabaseAuthConfig(env);
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);

  if (body.acceptTerms !== true) {
    throw new AppError(
      400,
      "terms_required",
      "You must accept the Terms of Service and Privacy Policy.",
    );
  }

  const redirect = `${getAppUrl(env)}/?auth=confirmed`;
  const result = await supabaseAuthRequest(
    env,
    `/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,
    {
      method: "POST",
      body: {
        email,
        password,
        data: {
          accepted_terms_at: new Date().toISOString(),
          accepted_terms_version: "2026-09-07",
        },
      },
      friendlyAuthErrors: true,
    },
  );

  const cookies = result.data?.access_token
    ? [...sessionCookies(result.data), clearRecoveryCookie()]
    : [clearRecoveryCookie()];

  return jsonResponseWithCookies(
    {
      ok: true,
      signedIn: Boolean(result.data?.access_token),
      message: result.data?.access_token
        ? "Your account is ready."
        : "Check your email and confirm your address to finish creating your account.",
    },
    200,
    cookies,
  );
}

async function handleSignin(request, env) {
  assertSupabaseAuthConfig(env);
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password, { enforceLength: false });

  const result = await supabaseAuthRequest(
    env,
    "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      body: { email, password },
      friendlyAuthErrors: true,
    },
  );

  if (!result.data?.access_token || !result.data?.refresh_token) {
    throw new AppError(
      502,
      "invalid_auth_response",
      "The authentication service returned an incomplete session.",
      false,
    );
  }

  return jsonResponseWithCookies(
    {
      ok: true,
      message: "Signed in.",
      user: publicUser(result.data.user),
    },
    200,
    [...sessionCookies(result.data), clearRecoveryCookie()],
  );
}

async function handleSignout(request, env) {
  assertSupabaseAuthConfig(env);
  const session = await resolveSession(request, env);

  if (session?.accessToken) {
    try {
      await supabaseAuthRequest(env, "/auth/v1/logout?scope=local", {
        method: "POST",
        accessToken: session.accessToken,
        body: {},
      });
    } catch (error) {
      console.warn("Supabase signout call failed; local cookies were cleared", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return jsonResponseWithCookies(
    { ok: true, message: "Signed out." },
    200,
    clearSessionCookies(),
  );
}

async function handleResendConfirmation(request, env) {
  assertSupabaseAuthConfig(env);
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  const redirect = `${getAppUrl(env)}/?auth=confirmed`;

  await supabaseAuthRequest(
    env,
    `/auth/v1/resend?redirect_to=${encodeURIComponent(redirect)}`,
    {
      method: "POST",
      body: { type: "signup", email },
      friendlyAuthErrors: true,
    },
  );

  return jsonResponse({
    ok: true,
    message:
      "If that address has a pending account, a new confirmation message has been sent.",
  });
}

async function handlePasswordRecovery(request, env) {
  assertSupabaseAuthConfig(env);
  const body = await readJson(request);
  const email = normalizeEmail(body.email);
  // Supabase's default recovery email redirects with a session in the URL
  // fragment. Do not pre-mark the page as recovery mode: the shell enters
  // recovery mode only after that session has been validated and adopted.
  const redirect = `${getAppUrl(env)}/`;

  await supabaseAuthRequest(
    env,
    `/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`,
    {
      method: "POST",
      body: { email },
      friendlyAuthErrors: true,
    },
  );

  return jsonResponse({
    ok: true,
    message:
      "If an account exists for that address, a password-reset message has been sent.",
  });
}

async function handleAdoptSession(request, env) {
  assertSupabaseAuthConfig(env);
  const body = await readJson(request);
  const accessToken = requireToken(body.accessToken, "access token", 20);
  // Supabase refresh tokens are opaque and may be shorter than JWT access
  // tokens. RC2 incorrectly required at least 20 characters and rejected a
  // valid recovery session before it could be stored.
  const refreshToken = requireToken(body.refreshToken, "refresh token", 8);
  const flowType = String(body.flowType || "").toLowerCase();
  const user = await getSupabaseUser(env, accessToken);

  if (!user) {
    throw new AppError(
      401,
      "invalid_session",
      "The email link is invalid or has expired.",
    );
  }

  const expiresIn = clampInteger(body.expiresIn, 60, 86_400, 3_600);
  const cookies = sessionCookies({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  });
  cookies.push(
    flowType === "recovery"
      ? recoveryCookie(user.id)
      : clearRecoveryCookie(),
  );

  return jsonResponseWithCookies(
    {
      ok: true,
      user: publicUser(user),
      recovery: flowType === "recovery",
    },
    200,
    cookies,
  );
}

async function handlePasswordChange(request, env) {
  assertSupabaseAuthConfig(env);
  const session = await requireSession(request, env);
  if (!session.recovery) {
    throw new AppError(
      403,
      "recovery_session_required",
      "Open a fresh password-reset link before setting a new password.",
    );
  }

  const body = await readJson(request);
  const password = validatePassword(body.password);

  await supabaseAuthRequest(env, "/auth/v1/user", {
    method: "PUT",
    accessToken: session.accessToken,
    body: { password },
    friendlyAuthErrors: true,
  });

  // Revoke refresh sessions where supported, then require a clean sign-in
  // with the new password. Local account-scoped playbook data is untouched.
  try {
    await supabaseAuthRequest(env, "/auth/v1/logout?scope=global", {
      method: "POST",
      accessToken: session.accessToken,
      body: {},
      allowAuthFailure: true,
    });
  } catch (error) {
    console.warn("Supabase global signout after password reset failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return jsonResponseWithCookies(
    {
      ok: true,
      message: "Password updated. Sign in with your new password.",
    },
    200,
    clearSessionCookies(),
  );
}

async function handleSession(request, env) {
  assertSupabaseAuthConfig(env);
  const session = await resolveSession(request, env);

  if (!session) {
    return jsonResponseWithCookies(
      { ok: true, authenticated: false },
      200,
      clearSessionCookies(),
    );
  }

  return jsonResponseWithCookies(
    {
      ok: true,
      authenticated: true,
      user: publicUser(session.user),
      recovery: session.recovery === true,
    },
    200,
    session.cookieHeaders,
  );
}

async function handleAccount(request, env) {
  assertSupabaseAuthConfig(env);
  const session = await resolveSession(request, env);

  if (!session) {
    return jsonResponseWithCookies(
      { ok: true, authenticated: false },
      200,
      clearSessionCookies(),
    );
  }

  const data = await buildAccountPayload(session, env);
  return jsonResponseWithCookies(data, 200, session.cookieHeaders);
}

async function handleCreateCheckout(request, env) {
  assertStagingBackendConfig(env);
  const session = await requireSession(request, env);
  const body = await readJson(request);
  const plan = body.plan === "monthly" || body.plan === "annual"
    ? body.plan
    : null;

  if (!plan) {
    throw new AppError(
      400,
      "invalid_plan",
      "Choose either the monthly or annual plan.",
    );
  }

  if (await userHasCoachProAccess(session.user.id, env)) {
    throw new AppError(
      409,
      "already_subscribed",
      "This account already has Coach Pro access. Use Manage billing for subscription changes.",
    );
  }

  const customerId = await getOrCreateStripeCustomer(session.user, env);
  const priceId = plan === "monthly"
    ? env.STRIPE_PRICE_MONTHLY
    : env.STRIPE_PRICE_ANNUAL;

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("customer", customerId);
  form.set("client_reference_id", session.user.id);
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", `${getAppUrl(env)}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${getAppUrl(env)}/?checkout=cancelled`);
  form.set("automatic_tax[enabled]", "true");
  form.set("billing_address_collection", "auto");
  form.set("customer_update[address]", "auto");
  form.set("customer_update[name]", "auto");
  form.set("subscription_data[metadata][supabase_user_id]", session.user.id);
  form.set("subscription_data[metadata][plan]", plan);
  form.set("subscription_data[metadata][environment]", "staging");
  form.set("metadata[supabase_user_id]", session.user.id);
  form.set("metadata[plan]", plan);
  form.set("metadata[environment]", "staging");

  const checkout = await stripeRequest(env, "/v1/checkout/sessions", {
    method: "POST",
    form,
    idempotencyKey: `botd-checkout-${session.user.id}-${crypto.randomUUID()}`,
  });

  if (checkout.livemode === true || !String(checkout.id || "").startsWith("cs_test_")) {
    throw new AppError(
      500,
      "staging_safety_lock",
      "Staging refused a non-test Stripe Checkout Session.",
      false,
    );
  }

  if (!checkout.url) {
    throw new AppError(
      502,
      "stripe_checkout_unavailable",
      "Stripe did not return a checkout URL.",
      false,
    );
  }

  return jsonResponseWithCookies(
    { ok: true, url: checkout.url },
    200,
    session.cookieHeaders,
  );
}

async function handleCheckoutStatus(request, env) {
  assertStagingBackendConfig(env);
  const session = await requireSession(request, env);
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") || "";

  if (!/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) {
    throw new AppError(
      400,
      "invalid_checkout_session",
      "The checkout session identifier is invalid.",
    );
  }

  const checkout = await stripeRequest(
    env,
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand%5B%5D=subscription`,
    { method: "GET" },
  );

  const linkedUser =
    checkout.client_reference_id || checkout.metadata?.supabase_user_id;
  if (linkedUser !== session.user.id) {
    throw new AppError(
      403,
      "checkout_account_mismatch",
      "This checkout session belongs to a different account.",
    );
  }

  if (checkout.livemode === true) {
    throw new AppError(
      500,
      "staging_safety_lock",
      "Staging refused a live Stripe checkout result.",
      false,
    );
  }

  if (checkout.status === "complete" && checkout.subscription) {
    const subscription = typeof checkout.subscription === "string"
      ? await retrieveStripeSubscription(checkout.subscription, env)
      : checkout.subscription;
    await syncStripeSubscription(subscription, env, session.user.id, {
      id: checkout.id,
      created: checkout.created || Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
    });
  }

  const account = await buildAccountPayload(session, env);
  return jsonResponseWithCookies(
    {
      ...account,
      checkout: {
        id: checkout.id,
        status: checkout.status,
        paymentStatus: checkout.payment_status,
      },
    },
    200,
    session.cookieHeaders,
  );
}

async function handleBillingPortal(request, env) {
  assertStagingBackendConfig(env);
  const session = await requireSession(request, env);
  const customer = await findBillingCustomerByUser(session.user.id, env);

  if (!customer?.stripe_customer_id) {
    throw new AppError(
      404,
      "billing_customer_not_found",
      "No Stripe billing account is linked to this user yet.",
    );
  }

  const form = new URLSearchParams();
  form.set("customer", customer.stripe_customer_id);
  form.set("return_url", getAppUrl(env));

  const portal = await stripeRequest(
    env,
    "/v1/billing_portal/sessions",
    { method: "POST", form },
  );

  if (!portal.url) {
    throw new AppError(
      502,
      "billing_portal_unavailable",
      "Stripe did not return a billing portal URL.",
      false,
    );
  }

  return jsonResponseWithCookies(
    { ok: true, url: portal.url },
    200,
    session.cookieHeaders,
  );
}

async function handleAuthConfirmation(request, env) {
  assertSupabaseAuthConfig(env);
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash") || "";
  const type = url.searchParams.get("type") || "email";
  const allowedTypes = new Set([
    "email",
    "signup",
    "recovery",
    "invite",
    "magiclink",
    "email_change",
  ]);

  if (!tokenHash || tokenHash.length > 1_024 || !allowedTypes.has(type)) {
    return redirectResponse(`${getAppUrl(env)}/?auth_error=invalid_link`);
  }

  try {
    const result = await supabaseAuthRequest(env, "/auth/v1/verify", {
      method: "POST",
      body: { token_hash: tokenHash, type },
      friendlyAuthErrors: true,
    });

    if (!result.data?.access_token || !result.data?.refresh_token) {
      throw new AppError(401, "invalid_confirmation", "The email link is invalid or expired.");
    }

    const user = result.data.user
      || await getSupabaseUser(env, result.data.access_token);
    if (!user) {
      throw new AppError(401, "invalid_confirmation", "The email link is invalid or expired.");
    }

    const cookies = sessionCookies(result.data);
    cookies.push(
      type === "recovery"
        ? recoveryCookie(user.id)
        : clearRecoveryCookie(),
    );
    const destination = type === "recovery"
      ? `${getAppUrl(env)}/?mode=recovery`
      : `${getAppUrl(env)}/?auth=confirmed`;
    return redirectResponse(destination, cookies);
  } catch (error) {
    console.warn("Email confirmation failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return redirectResponse(`${getAppUrl(env)}/?auth_error=expired_link`);
  }
}

async function serveProtectedApplication(request, env) {
  assertSupabaseAuthConfig(env);
  const session = await resolveSession(request, env);

  if (!session) {
    return redirectResponse(`${getAppUrl(env)}/?next=app`, clearSessionCookies());
  }

  const requestedAccountId = new URL(request.url).searchParams.get("account");
  if (
    requestedAccountId &&
    requestedAccountId.toLowerCase() !== String(session.user.id).toLowerCase()
  ) {
    throw new AppError(
      409,
      "account_context_mismatch",
      "Reload the application to use the current signed-in account.",
    );
  }

  const allowed = await userHasCoachProAccess(session.user.id, env, session.accessToken);
  if (!allowed) {
    return redirectResponse(`${getAppUrl(env)}/?access=required`, session.cookieHeaders);
  }

  const body = request.method === "HEAD"
    ? null
    : renderAccountScopedApplication(APP_HTML, session.user.id);
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-BOTD-Storage-Isolation": "account-scoped-v1",
  });
  appendCookies(headers, session.cookieHeaders);
  return new Response(body, { status: 200, headers });
}

function renderAccountScopedApplication(template, userId) {
  if (!isUuid(userId)) {
    throw new AppError(
      500,
      "invalid_account_context",
      "The application could not establish an account storage context.",
      false,
    );
  }

  const first = template.indexOf(APP_ACCOUNT_ID_TOKEN);
  const last = template.lastIndexOf(APP_ACCOUNT_ID_TOKEN);
  if (first < 0 || first !== last) {
    throw new AppError(
      500,
      "invalid_application_template",
      "The protected application template is not configured for account storage isolation.",
      false,
    );
  }

  return template.replace(APP_ACCOUNT_ID_TOKEN, userId.toLowerCase());
}

async function servePublicAsset(request, env, path) {
  if (path === "/app-v6.8.html" || path.startsWith("/private/")) {
    return new Response("Not found", { status: 404 });
  }

  const assetPath = path === "/" ? "/index.html" : path;
  return serveAssetAt(request, env, assetPath, {
    cache: assetPath === "/botd-logo.webp" ? "immutable" : "public",
  });
}

async function serveAssetAt(request, env, assetPath, options = {}) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
    throw new AppError(
      500,
      "assets_binding_missing",
      "The Worker static-assets binding is not configured.",
      false,
    );
  }

  const sourceUrl = new URL(request.url);
  sourceUrl.pathname = assetPath;
  sourceUrl.search = "";
  const assetRequest = new Request(sourceUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: request.headers,
  });
  const asset = await env.ASSETS.fetch(assetRequest);
  const headers = new Headers(asset.headers);

  if (options.cache === "immutable") {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (assetPath === "/index.html") {
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("Pragma", "no-cache");
  } else {
    headers.set("Cache-Control", "public, max-age=300");
  }

  return new Response(asset.body, {
    status: asset.status,
    statusText: asset.statusText,
    headers,
  });
}

async function resolveSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const accessToken = cookies[ACCESS_COOKIE];
  const refreshToken = cookies[REFRESH_COOKIE];
  const recoveryUserId = cookies[RECOVERY_COOKIE] || "";

  if (accessToken) {
    const user = await getSupabaseUser(env, accessToken);
    if (user) {
      return {
        user,
        accessToken,
        refreshToken: refreshToken || null,
        recovery: sameUserId(recoveryUserId, user.id),
        cookieHeaders: [],
      };
    }
  }

  if (!refreshToken) return null;

  try {
    const refreshed = await supabaseAuthRequest(
      env,
      "/auth/v1/token?grant_type=refresh_token",
      {
        method: "POST",
        body: { refresh_token: refreshToken },
        friendlyAuthErrors: false,
      },
    );

    const data = refreshed.data;
    if (!data?.access_token || !data?.refresh_token || !data?.user) return null;

    return {
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      recovery: sameUserId(recoveryUserId, data.user.id),
      cookieHeaders: sessionCookies(data),
    };
  } catch {
    return null;
  }
}

async function requireSession(request, env) {
  const session = await resolveSession(request, env);
  if (!session) {
    throw new AppError(401, "authentication_required", "Sign in to continue.");
  }
  return session;
}

async function getSupabaseUser(env, accessToken) {
  try {
    const result = await supabaseAuthRequest(env, "/auth/v1/user", {
      method: "GET",
      accessToken,
      allowAuthFailure: true,
    });
    return result.response.ok ? result.data : null;
  } catch {
    return null;
  }
}

async function supabaseAuthRequest(env, path, options = {}) {
  assertSupabaseAuthConfig(env);
  const base = normalizeSupabaseUrl(env.SUPABASE_URL);
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  const headers = new Headers({
    apikey: key,
    Accept: JSON_TYPE,
  });
  if (options.accessToken) {
    headers.set("Authorization", `Bearer ${options.accessToken}`);
  } else if (key.startsWith("eyJ")) {
    // Legacy anon keys are JWTs and are also accepted as bearer tokens.
    headers.set("Authorization", `Bearer ${key}`);
  }

  let body;
  if (options.body !== undefined) {
    headers.set("Content-Type", JSON_TYPE);
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${base}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });
  const data = await readResponseData(response);

  if (!response.ok && !options.allowAuthFailure) {
    const friendly = options.friendlyAuthErrors
      ? friendlyAuthError(response.status, data)
      : null;
    if (friendly) throw friendly;
    throw new AppError(
      response.status >= 500 ? 502 : response.status,
      "authentication_service_error",
      "The authentication service could not complete the request.",
      response.status < 500,
    );
  }

  return { response, data };
}

function friendlyAuthError(status, data) {
  const raw = String(data?.msg || data?.message || data?.error_description || "").toLowerCase();
  const code = String(data?.code || data?.error_code || "").toLowerCase();

  if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
    return new AppError(401, "invalid_credentials", "Email or password is incorrect.");
  }
  if (raw.includes("email not confirmed") || code.includes("email_not_confirmed")) {
    return new AppError(403, "email_not_confirmed", "Confirm your email address before signing in.");
  }
  if (raw.includes("already registered") || code.includes("user_already_exists")) {
    return new AppError(
      400,
      "signup_pending",
      "Check your email for account confirmation instructions.",
    );
  }
  if (raw.includes("rate limit") || status === 429) {
    return new AppError(429, "rate_limited", "Please wait a moment before trying again.");
  }
  if (raw.includes("password")) {
    return new AppError(400, "invalid_password", "The password does not meet the account requirements.");
  }
  if (status === 400 || status === 422) {
    return new AppError(400, "invalid_auth_request", "The authentication request could not be completed.");
  }
  return null;
}

async function buildAccountPayload(session, env) {
  const [entitlements, subscriptions, billingCustomers] = await Promise.all([
    dbSelect(
      env,
      "entitlements",
      {
        select: "entitlement,active,expires_at,source_subscription_id,updated_at",
        entitlement: `eq.${COACH_PRO}`,
        limit: "1",
      },
      session.accessToken,
    ),
    dbSelect(
      env,
      "subscriptions",
      {
        select:
          "stripe_subscription_id,stripe_price_id,billing_interval,status,current_period_end,cancel_at_period_end,grace_period_end,livemode,updated_at",
        order: "updated_at.desc",
      },
      session.accessToken,
    ),
    dbSelect(
      env,
      "billing_customers",
      { select: "stripe_customer_id", limit: "1" },
      session.accessToken,
    ),
  ]);

  const entitlement = entitlements[0] || null;
  const effectiveActive = isEntitlementCurrentlyActive(entitlement);
  const normalizedSubscriptions = subscriptions.map((subscription) => ({
    ...subscription,
    plan: planForPrice(subscription.stripe_price_id, env),
  }));

  return {
    ok: true,
    authenticated: true,
    user: publicUser(session.user),
    recovery: session.recovery === true,
    entitlement: entitlement
      ? { ...entitlement, active: effectiveActive }
      : {
          entitlement: COACH_PRO,
          active: false,
          expires_at: null,
          source_subscription_id: null,
        },
    subscriptions: normalizedSubscriptions,
    hasBillingCustomer: billingCustomers.length > 0,
    staging: true,
  };
}

async function userHasCoachProAccess(userId, env, accessToken = null) {
  const rows = await dbSelect(
    env,
    "entitlements",
    {
      select: "active,expires_at",
      user_id: `eq.${userId}`,
      entitlement: `eq.${COACH_PRO}`,
      limit: "1",
    },
    accessToken,
  );
  return isEntitlementCurrentlyActive(rows[0] || null);
}

function isEntitlementCurrentlyActive(entitlement) {
  if (!entitlement?.active) return false;
  if (!entitlement.expires_at) return true;
  const expires = Date.parse(entitlement.expires_at);
  return Number.isFinite(expires) && expires > Date.now();
}

async function getOrCreateStripeCustomer(user, env) {
  const existing = await findBillingCustomerByUser(user.id, env);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const form = new URLSearchParams();
  form.set("email", user.email);
  form.set("metadata[supabase_user_id]", user.id);
  form.set("metadata[environment]", "staging");

  const customer = await stripeRequest(env, "/v1/customers", {
    method: "POST",
    form,
    idempotencyKey: `botd-customer-${user.id}`,
  });

  if (customer.livemode === true) {
    throw new AppError(
      500,
      "staging_safety_lock",
      "Staging refused a live Stripe customer.",
      false,
    );
  }

  await upsertBillingCustomer(user.id, customer.id, env);
  return customer.id;
}

async function findBillingCustomerByUser(userId, env) {
  const rows = await dbSelect(env, "billing_customers", {
    select: "user_id,stripe_customer_id",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  return rows[0] || null;
}

async function findBillingCustomerByStripeId(customerId, env) {
  const rows = await dbSelect(env, "billing_customers", {
    select: "user_id,stripe_customer_id",
    stripe_customer_id: `eq.${customerId}`,
    limit: "1",
  });
  return rows[0] || null;
}

async function upsertBillingCustomer(userId, customerId, env) {
  await dbWrite(
    env,
    "billing_customers",
    [{ user_id: userId, stripe_customer_id: customerId }],
    { onConflict: "user_id", prefer: "resolution=merge-duplicates,return=minimal" },
  );
}

async function dbSelect(env, table, query = {}, accessToken = null) {
  assertSupabaseDataConfig(env, Boolean(accessToken));
  const params = new URLSearchParams(query);
  const key = accessToken
    ? env.SUPABASE_PUBLISHABLE_KEY
    : env.SUPABASE_SECRET_KEY;
  const headers = new Headers({
    apikey: key,
    Accept: JSON_TYPE,
    "Accept-Profile": "public",
  });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else if (key.startsWith("eyJ")) {
    // New sb_secret_ keys authorize through the apikey header. Legacy
    // service_role JWTs additionally use the bearer header.
    headers.set("Authorization", `Bearer ${key}`);
  }
  const response = await fetch(
    `${normalizeSupabaseUrl(env.SUPABASE_URL)}/rest/v1/${encodeURIComponent(table)}?${params.toString()}`,
    { method: "GET", headers },
  );
  const data = await readResponseData(response);

  if (!response.ok) {
    console.error("Supabase select failed", { table, status: response.status, data });
    throw new AppError(
      502,
      "database_read_failed",
      "Account data could not be loaded.",
      false,
    );
  }
  return Array.isArray(data) ? data : [];
}

async function dbWrite(env, table, rows, options = {}) {
  assertSupabaseDataConfig(env, false);
  const params = new URLSearchParams();
  if (options.onConflict) params.set("on_conflict", options.onConflict);
  const query = params.toString() ? `?${params.toString()}` : "";
  const key = env.SUPABASE_SECRET_KEY;
  const headers = new Headers({
    apikey: key,
    "Content-Type": JSON_TYPE,
    Accept: JSON_TYPE,
    "Content-Profile": "public",
    Prefer: options.prefer || "return=minimal",
  });
  if (key.startsWith("eyJ")) {
    headers.set("Authorization", `Bearer ${key}`);
  }
  const response = await fetch(
    `${normalizeSupabaseUrl(env.SUPABASE_URL)}/rest/v1/${encodeURIComponent(table)}${query}`,
    {
      method: options.method || "POST",
      headers,
      body: JSON.stringify(rows),
    },
  );
  const data = await readResponseData(response);

  if (!response.ok) {
    console.error("Supabase write failed", { table, status: response.status, data });
    throw new AppError(
      502,
      "database_write_failed",
      "Account data could not be updated.",
      false,
    );
  }
  return data;
}

async function dbRpc(env, functionName, argumentsObject = {}) {
  assertSupabaseDataConfig(env, false);
  const key = env.SUPABASE_SECRET_KEY;
  const headers = new Headers({
    apikey: key,
    "Content-Type": JSON_TYPE,
    Accept: JSON_TYPE,
    "Content-Profile": "public",
    "Accept-Profile": "public",
    Prefer: "return=representation",
  });
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);

  const response = await fetch(
    `${normalizeSupabaseUrl(env.SUPABASE_URL)}/rest/v1/rpc/${encodeURIComponent(functionName)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(argumentsObject),
    },
  );
  const data = await readResponseData(response);
  if (!response.ok) {
    console.error("Supabase RPC failed", {
      functionName,
      status: response.status,
      data,
    });
    throw new AppError(
      502,
      "database_write_failed",
      "Account data could not be updated.",
      false,
    );
  }
  return data;
}

async function checkPaymentStateSchema(env) {
  if (
    !normalizeSupabaseUrl(env.SUPABASE_URL) ||
    !isBackendSupabaseKey(env.SUPABASE_SECRET_KEY)
  ) {
    return false;
  }

  const key = env.SUPABASE_SECRET_KEY;
  const headers = new Headers({
    apikey: key,
    Accept: JSON_TYPE,
    "Accept-Profile": "public",
  });
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);

  try {
    const response = await fetch(
      `${normalizeSupabaseUrl(env.SUPABASE_URL)}/rest/v1/subscriptions` +
        `?select=last_invoice_id,last_invoice_state,last_invoice_created,last_stripe_observed_at&limit=0`,
      { method: "GET", headers },
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function stripeRequest(env, path, options = {}) {
  assertStripeTestConfig(env);
  const headers = new Headers({
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    Accept: JSON_TYPE,
  });
  let body;
  if (options.form) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    body = options.form.toString();
  }
  if (options.idempotencyKey) {
    headers.set("Idempotency-Key", options.idempotencyKey);
  }

  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });
  const data = await readResponseData(response);

  if (!response.ok) {
    const stripeMessage = String(data?.error?.message || "");
    console.error("Stripe request failed", {
      path,
      status: response.status,
      type: data?.error?.type,
      code: data?.error?.code,
      message: stripeMessage,
    });
    const safeMessage = stripeMessage.toLowerCase().includes("portal")
      ? "The Stripe customer portal is not configured in test mode yet."
      : "Stripe could not complete the billing request.";
    throw new AppError(
      response.status >= 500 ? 502 : 400,
      "stripe_request_failed",
      safeMessage,
      true,
    );
  }
  return data;
}

async function retrieveStripeSubscription(subscriptionId, env) {
  if (!/^sub_[A-Za-z0-9_]+$/.test(String(subscriptionId || ""))) {
    throw new AppError(
      400,
      "invalid_subscription_id",
      "The Stripe subscription identifier is invalid.",
      false,
    );
  }
  return stripeRequest(
    env,
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}` +
      `?expand%5B0%5D=items.data.price&expand%5B1%5D=latest_invoice`,
    { method: "GET" },
  );
}

async function handleStripeWebhook(request, env) {
  assertStagingBackendConfig(env, { requireWebhook: true });
  const rawBody = await readLimitedText(request, MAX_WEBHOOK_BYTES);
  const signature = request.headers.get("Stripe-Signature") || "";

  const valid = await verifyStripeSignature(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );
  if (!valid) {
    throw new AppError(400, "invalid_webhook_signature", "Invalid Stripe signature.");
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new AppError(400, "invalid_webhook_json", "Invalid webhook payload.");
  }

  if (!event?.id || !event?.type || !event?.data?.object) {
    throw new AppError(400, "invalid_webhook_event", "Incomplete Stripe event.");
  }
  if (event.livemode === true) {
    throw new AppError(
      400,
      "staging_safety_lock",
      "Live Stripe events are not accepted by staging.",
    );
  }

  if (await isWebhookProcessed(event.id, env)) {
    return jsonResponse({ ok: true, duplicate: true });
  }

  await processStripeEvent(event, env);
  await markWebhookProcessed(event, env);
  return jsonResponse({ ok: true });
}

async function verifyStripeSignature(payload, header, secret) {
  const entries = header.split(",").map((entry) => entry.trim());
  const timestampEntry = entries.find((entry) => entry.startsWith("t="));
  const signatures = entries
    .filter((entry) => entry.startsWith("v1="))
    .map((entry) => entry.slice(3));
  const timestamp = Number(timestampEntry?.slice(2));

  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = `${timestamp}.${payload}`;
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signed),
  );
  const expected = bytesToHex(new Uint8Array(digest));
  return signatures.some((candidate) => constantTimeEqual(expected, candidate));
}

async function processStripeEvent(event, env) {
  const object = event.data.object;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (!object.subscription) return;
      const subscriptionId = typeof object.subscription === "string"
        ? object.subscription
        : object.subscription.id;
      const userId = object.client_reference_id || object.metadata?.supabase_user_id;
      await syncStripeSubscription({ id: subscriptionId }, env, userId, event);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncStripeSubscription(object, env, null, event);
      return;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscriptionId = stripeSubscriptionIdFromInvoice(object);
      if (!subscriptionId) return;
      // The invoice event itself is authoritative for payment outcome. Some
      // Stripe API responses leave subscription.latest_invoice unexpanded even
      // when expansion was requested, so pass the signed event invoice through
      // instead of depending only on a second subscription read.
      await syncStripeSubscription(
        { id: subscriptionId },
        env,
        null,
        event,
        object,
      );
      return;
    }
    default:
      return;
  }
}

async function syncStripeSubscription(
  subscriptionInput,
  env,
  explicitUserId = null,
  eventContext = null,
  invoiceEventObject = null,
) {
  const subscriptionId = subscriptionInput?.id;
  if (!subscriptionId) {
    throw new AppError(
      400,
      "missing_subscription",
      "Stripe event did not include a subscription identifier.",
      false,
    );
  }

  // Capture when this exact Stripe snapshot was observed. The database uses
  // this timestamp under a row lock so a slower, older webhook handler cannot
  // overwrite a newer subscription snapshot that already reached Supabase.
  const subscription = await retrieveStripeSubscription(subscriptionId, env);
  const observedAt = new Date().toISOString();

  if (subscription.livemode === true) {
    throw new AppError(
      400,
      "staging_safety_lock",
      "Staging refused a live subscription.",
      false,
    );
  }

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) {
    throw new AppError(400, "missing_customer", "Stripe subscription has no customer.", false);
  }

  let userId = explicitUserId || subscription.metadata?.supabase_user_id || null;
  if (!isUuid(userId)) {
    const mapping = await findBillingCustomerByStripeId(customerId, env);
    userId = mapping?.user_id || null;
  }
  if (!isUuid(userId)) {
    throw new AppError(
      409,
      "unmapped_subscription",
      "Stripe subscription is not linked to a B.O.T.D. account.",
      false,
    );
  }

  await upsertBillingCustomer(userId, customerId, env);

  const item = subscription.items.data[0];
  const price = item?.price || item?.pricing?.price_details?.price || null;
  const priceId = typeof price === "string" ? price : price?.id;
  const interval = typeof price === "object"
    ? price?.recurring?.interval || item?.plan?.interval || null
    : item?.plan?.interval || null;
  if (!priceId) {
    throw new AppError(400, "missing_price", "Stripe subscription has no price.", false);
  }

  const periodEnd = extractSubscriptionPeriodEnd(subscription);
  const retrievedInvoice =
    subscription.latest_invoice &&
    typeof subscription.latest_invoice === "object" &&
    subscription.latest_invoice.id
      ? subscription.latest_invoice
      : null;
  const signedInvoice =
    invoiceEventObject &&
    typeof invoiceEventObject === "object" &&
    invoiceEventObject.id
      ? invoiceEventObject
      : null;
  const invoice = signedInvoice || retrievedInvoice;
  const eventInvoiceState = invoicePaymentStateFromEvent(eventContext?.type);
  const invoiceState = eventInvoiceState || classifyInvoicePaymentState(invoice);
  const invoiceId = invoiceState ? String(invoice?.id || "") : "";
  const invoiceCreated = Number(invoice?.created || eventContext?.created);
  const eventCreated = Number(eventContext?.created || Math.floor(Date.now() / 1000));
  const eventId = String(
    eventContext?.id || `current-state-${subscription.id}-${crypto.randomUUID()}`,
  );
  const graceDeadline = invoiceState === "failed"
    ? new Date(Date.now() + PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Subscription snapshot and invoice-payment state are applied atomically in
  // PostgreSQL. Generic subscription events can no longer null a grace period
  // set by invoice.payment_failed, and paid recovery wins over a late failed
  // delivery for the same invoice.
  await dbRpc(env, "apply_stripe_subscription_state", {
    p_subscription_id: subscription.id,
    p_user_id: userId,
    p_customer_id: customerId,
    p_price_id: priceId,
    p_billing_interval: ["month", "year"].includes(interval) ? interval : null,
    p_status: String(subscription.status || "unknown"),
    p_current_period_end: periodEnd ? unixToIso(periodEnd) : null,
    p_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    p_livemode: Boolean(subscription.livemode),
    p_observed_at: observedAt,
    p_event_id: eventId,
    p_event_created: Number.isFinite(eventCreated) && eventCreated > 0
      ? Math.trunc(eventCreated)
      : Math.floor(Date.now() / 1000),
    p_invoice_id: invoiceState && invoiceId ? invoiceId : null,
    p_invoice_created:
      invoiceState && Number.isFinite(invoiceCreated) && invoiceCreated > 0
        ? Math.trunc(invoiceCreated)
        : null,
    p_invoice_state: invoiceState,
    p_grace_deadline: graceDeadline,
  });

  await recomputeCoachProEntitlement(userId, env);
}

function invoicePaymentStateFromEvent(eventType) {
  if (eventType === "invoice.payment_failed") return "failed";
  if (eventType === "invoice.paid") return "paid";
  return null;
}

function classifyInvoicePaymentState(invoice) {
  const status = String(invoice?.status || "").toLowerCase();
  if (invoice?.paid === true || status === "paid") return "paid";
  if (["void", "uncollectible"].includes(status)) return "terminal";

  const attempted = invoice?.attempted === true || Number(invoice?.attempt_count || 0) > 0;
  if (status === "open" && invoice?.paid !== true && attempted) return "failed";
  return null;
}

async function recomputeCoachProEntitlement(userId, env) {
  const subscriptions = await dbSelect(env, "subscriptions", {
    select:
      "stripe_subscription_id,status,current_period_end,grace_period_end,livemode",
    user_id: `eq.${userId}`,
    livemode: "eq.false",
  });

  const candidates = subscriptions
    .map((subscription) => ({
      subscription,
      accessUntil: subscriptionAccessUntil(subscription),
    }))
    .filter((entry) => entry.accessUntil !== false)
    .sort((a, b) => accessSortValue(b.accessUntil) - accessSortValue(a.accessUntil));
  const chosen = candidates[0] || null;

  await dbWrite(
    env,
    "entitlements",
    [
      {
        user_id: userId,
        entitlement: COACH_PRO,
        active: Boolean(chosen),
        expires_at:
          chosen && chosen.accessUntil instanceof Date
            ? chosen.accessUntil.toISOString()
            : null,
        source_subscription_id: chosen
          ? chosen.subscription.stripe_subscription_id
          : null,
      },
    ],
    {
      onConflict: "user_id,entitlement",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
  );
}

function subscriptionAccessUntil(subscription) {
  const status = String(subscription.status || "");

  // A recorded failed-payment grace deadline is authoritative even when
  // Stripe temporarily leaves the subscription status as active. Never grant
  // the full paid period while an unresolved failed invoice is in grace.
  if (
    ["active", "trialing", "past_due"].includes(status) &&
    subscription.grace_period_end
  ) {
    const date = new Date(subscription.grace_period_end);
    return Number.isFinite(date.getTime()) && date.getTime() > Date.now()
      ? date
      : false;
  }

  if (["active", "trialing"].includes(status)) {
    if (!subscription.current_period_end) return null;
    const date = new Date(subscription.current_period_end);
    return Number.isFinite(date.getTime()) && date.getTime() > Date.now()
      ? date
      : false;
  }
  return false;
}

function extractSubscriptionPeriodEnd(subscription) {
  const candidates = [
    subscription.current_period_end,
    ...(subscription.items?.data || []).map((item) => item.current_period_end),
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  return candidates.length ? Math.max(...candidates) : null;
}

function stripeSubscriptionIdFromInvoice(invoice) {
  const candidates = [
    invoice.subscription,
    invoice.parent?.subscription_details?.subscription,
    invoice.lines?.data?.[0]?.subscription,
    invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("sub_")) return candidate;
    if (candidate?.id && String(candidate.id).startsWith("sub_")) return candidate.id;
  }
  return null;
}

async function isWebhookProcessed(eventId, env) {
  const rows = await dbSelect(env, "processed_webhook_events", {
    select: "stripe_event_id",
    stripe_event_id: `eq.${eventId}`,
    limit: "1",
  });
  return rows.length > 0;
}

async function markWebhookProcessed(event, env) {
  try {
    await dbWrite(
      env,
      "processed_webhook_events",
      [
        {
          stripe_event_id: event.id,
          event_type: event.type,
          livemode: Boolean(event.livemode),
        },
      ],
      { prefer: "return=minimal" },
    );
  } catch (error) {
    // A duplicate insert can occur if Stripe delivers the same event concurrently.
    if (await isWebhookProcessed(event.id, env)) return;
    throw error;
  }
}

function planForPrice(priceId, env) {
  if (priceId === env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (priceId === env.STRIPE_PRICE_ANNUAL) return "annual";
  return "unknown";
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at || user.confirmed_at),
    createdAt: user.created_at || null,
  };
}

function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin) {
    throw new AppError(403, "cross_origin_blocked", "Cross-origin requests are not allowed.");
  }
}

function assertSupabaseAuthConfig(env) {
  const base = normalizeSupabaseUrl(env.SUPABASE_URL);
  if (!base || !isPublishableSupabaseKey(env.SUPABASE_PUBLISHABLE_KEY)) {
    throw new AppError(
      503,
      "supabase_not_configured",
      "Supabase staging authentication is not configured.",
      false,
    );
  }
}

function assertSupabaseDataConfig(env, userMode) {
  assertSupabaseAuthConfig(env);
  if (!userMode && !isBackendSupabaseKey(env.SUPABASE_SECRET_KEY)) {
    throw new AppError(
      503,
      "supabase_backend_not_configured",
      "The Supabase backend secret is not configured.",
      false,
    );
  }
}

function assertStripeTestConfig(env) {
  if (env.ENVIRONMENT !== "staging") {
    throw new AppError(
      503,
      "staging_environment_required",
      "This release is restricted to the staging environment.",
      false,
    );
  }
  if (!isValidStagingAppUrl(env.APP_URL)) {
    throw new AppError(
      503,
      "invalid_staging_url",
      "APP_URL must be https://staging.botdhockey.com.",
      false,
    );
  }
  if (
    typeof env.STRIPE_SECRET_KEY !== "string" ||
    !env.STRIPE_SECRET_KEY.startsWith("sk_test_") ||
    env.STRIPE_SECRET_KEY.startsWith("sk_live_")
  ) {
    throw new AppError(
      503,
      "stripe_test_key_required",
      "Staging requires a Stripe test-mode secret key.",
      false,
    );
  }
  if (
    !String(env.STRIPE_PRICE_MONTHLY || "").startsWith("price_") ||
    !String(env.STRIPE_PRICE_ANNUAL || "").startsWith("price_")
  ) {
    throw new AppError(
      503,
      "stripe_test_prices_required",
      "Both Stripe test-mode Price IDs must be configured.",
      false,
    );
  }
}

function assertStagingBackendConfig(env, options = {}) {
  assertSupabaseDataConfig(env, false);
  assertStripeTestConfig(env);
  if (
    options.requireWebhook &&
    !String(env.STRIPE_WEBHOOK_SECRET || "").startsWith("whsec_")
  ) {
    throw new AppError(
      503,
      "stripe_webhook_not_configured",
      "The Stripe test webhook signing secret is not configured.",
      false,
    );
  }
}

function normalizeSupabaseUrl(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) return "";
    return url.origin;
  } catch {
    return "";
  }
}

function isPublishableSupabaseKey(value) {
  return (
    typeof value === "string" &&
    value.startsWith("sb_publishable_") &&
    value.length > 30
  );
}

function isBackendSupabaseKey(value) {
  return (
    typeof value === "string" &&
    value.startsWith("sb_secret_") &&
    value.length > 30
  );
}

function isValidStagingAppUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return (
      url.protocol === "https:" &&
      url.hostname === "staging.botdhockey.com" &&
      (url.pathname === "/" || url.pathname === "")
    );
  } catch {
    return false;
  }
}

function getAppUrl(env) {
  if (!isValidStagingAppUrl(env.APP_URL)) {
    throw new AppError(
      503,
      "invalid_staging_url",
      "The staging application URL is not configured.",
      false,
    );
  }
  return new URL(env.APP_URL).origin;
}

async function readJson(request) {
  const text = await readLimitedText(request, MAX_JSON_BYTES);
  if (!text) return {};
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("not an object");
    }
    return value;
  } catch {
    throw new AppError(400, "invalid_json", "The request body must be valid JSON.");
  }
}

async function readLimitedText(request, maxBytes) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > maxBytes) {
    throw new AppError(413, "request_too_large", "The request body is too large.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new AppError(413, "request_too_large", "The request body is too large.");
  }
  return text;
}

async function readResponseData(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new AppError(400, "invalid_email", "Enter a valid email address.");
  }
  return email;
}

function validatePassword(value, options = {}) {
  const password = String(value || "");
  const enforceLength = options.enforceLength !== false;
  if (!password || password.length > 128) {
    throw new AppError(400, "invalid_password", "Enter a valid password.");
  }
  if (enforceLength && password.length < 10) {
    throw new AppError(
      400,
      "weak_password",
      "Use a password with at least 10 characters.",
    );
  }
  return password;
}

function requireToken(value, label, minimumLength = 8) {
  const token = String(value || "");
  if (token.length < minimumLength || token.length > 8_192 || /\s/.test(token)) {
    throw new AppError(400, "invalid_session", `The ${label} is invalid.`);
  }
  return token;
}

function sameUserId(left, right) {
  return isUuid(left)
    && isUuid(right)
    && String(left).toLowerCase() === String(right).toLowerCase();
}

function recoveryCookie(userId) {
  if (!isUuid(userId)) {
    throw new AppError(500, "invalid_recovery_context", "Recovery context could not be established.", false);
  }
  return serializeCookie(RECOVERY_COOKIE, String(userId).toLowerCase(), RECOVERY_COOKIE_MAX_AGE_SECONDS);
}

function clearRecoveryCookie() {
  return serializeCookie(RECOVERY_COOKIE, "", 0);
}

function sessionCookies(session) {
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
  if (!accessToken || !refreshToken) return [];
  const accessMaxAge = clampInteger(session.expires_in, 60, 86_400, 3_600);
  const refreshMaxAge = 30 * 24 * 60 * 60;
  return [
    serializeCookie(ACCESS_COOKIE, accessToken, accessMaxAge),
    serializeCookie(REFRESH_COOKIE, refreshToken, refreshMaxAge),
  ];
}

function clearSessionCookies() {
  return [
    serializeCookie(ACCESS_COOKIE, "", 0),
    serializeCookie(REFRESH_COOKIE, "", 0),
    clearRecoveryCookie(),
  ];
}

function serializeCookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax; Priority=High`;
}

function parseCookies(header) {
  const result = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) continue;
    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }
  return result;
}

function jsonResponse(data, status = 200, extraHeaders = null) {
  const headers = new Headers(extraHeaders || {});
  headers.set("Content-Type", JSON_TYPE);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return new Response(JSON.stringify(data), { status, headers });
}

function jsonResponseWithCookies(data, status, cookies) {
  const response = jsonResponse(data, status);
  const headers = new Headers(response.headers);
  appendCookies(headers, cookies);
  return new Response(response.body, { status: response.status, headers });
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "private, no-store, max-age=0",
  });
  appendCookies(headers, cookies);
  return new Response(null, { status: 303, headers });
}

function appendCookies(headers, cookies) {
  for (const cookie of cookies || []) headers.append("Set-Cookie", cookie);
}

function methodNotAllowed(methods) {
  return jsonResponse(
    { ok: false, error: "method_not_allowed", message: "Method not allowed." },
    405,
    { Allow: methods.join(", ") },
  );
}

function addResponseHeaders(response, requestId) {
  const headers = new Headers(response.headers);
  headers.set("X-Request-ID", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");

  const contentType = headers.get("Content-Type") || "";
  if (contentType.includes("text/html")) {
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function normalizeError(error) {
  if (error instanceof AppError) return error;
  return new AppError(
    500,
    "internal_error",
    error instanceof Error ? error.message : "Internal error",
    false,
  );
}

function normalizePath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}

function unixToIso(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}

function accessSortValue(value) {
  if (value === null) return Number.MAX_SAFE_INTEGER;
  if (value instanceof Date) return value.getTime();
  return 0;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}
