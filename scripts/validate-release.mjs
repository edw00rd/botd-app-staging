import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const required = [
  "LICENSE.txt",
  "README.md",
  "package.json",
  "wrangler.jsonc",
  "src/worker.js",
  "public/index.html",
  "public/LICENSE.txt",
  "public/botd-logo.webp",
  "private/app-v6.8.html.txt",
  "supabase/01_schema.sql",
  "supabase/02_staging_safety.sql",
  "supabase/03_verify.sql",
];

for (const relative of required) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${relative}`);
}

if (fs.existsSync(path.join(root, "CNAME"))) {
  throw new Error("Cloudflare staging package must not contain a GitHub Pages CNAME file.");
}

const appPath = path.join(root, "private/app-v6.8.html.txt");
const app = fs.readFileSync(appPath);
const appHash = crypto.createHash("sha256").update(app).digest("hex");
const expectedHash = "e589cfef6dd1611c0a4c9d202a142cd3e77503cdfc31993db95bd5d09823b673";
if (appHash !== expectedHash) {
  throw new Error(`v6.8 application hash changed: ${appHash}`);
}
const appText = app.toString("utf8");
for (const marker of [
  "Hockey Playbook Studio · Version 6.8",
  "botdHockeyCoachingAid.session.v6_8",
  "botdHockeyCoachingAid.playbook.v6_8",
  "Copyright © 2026 FENRIR LLC",
]) {
  if (!appText.includes(marker)) throw new Error(`v6.8 marker missing: ${marker}`);
}

const shell = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const scriptMatches = [...shell.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scriptMatches.length !== 1) throw new Error("Expected exactly one inline shell script.");
new Function(scriptMatches[0][1]);
for (const marker of [
  "STAGING · TEST MODE",
  "/api/auth/signup",
  "/api/checkout",
  "/api/billing/portal",
  "/protected/app.html",
  "4242 4242 4242 4242",
]) {
  if (!shell.includes(marker)) throw new Error(`Staging shell marker missing: ${marker}`);
}

const worker = fs.readFileSync(path.join(root, "src/worker.js"), "utf8");
for (const marker of [
  "sk_test_",
  "staging_safety_lock",
  "verifyStripeSignature",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SECRET_KEY",
  "userHasCoachProAccess",
]) {
  if (!worker.includes(marker)) throw new Error(`Worker safety marker missing: ${marker}`);
}

const textFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", ".wrangler"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (!/\.(png|webp|zip)$/i.test(entry.name)) textFiles.push(full);
  }
}
walk(root);
const combined = textFiles.map(file => fs.readFileSync(file, "utf8")).join("\n");

const secretPatterns = [
  /sk_(?:live|test)_[A-Za-z0-9]{12,}/,
  /whsec_[A-Za-z0-9]{12,}/,
  /sb_secret_[A-Za-z0-9]{12,}/,
];
for (const pattern of secretPatterns) {
  const match = combined.match(pattern);
  if (match && !match[0].includes("REPLACE_ME")) {
    throw new Error(`Possible committed secret detected: ${match[0].slice(0, 12)}...`);
  }
}

console.log("Release validation passed.");
console.log(`v6.8 SHA-256: ${appHash}`);
console.log(`Checked ${textFiles.length} text/source files.`);
