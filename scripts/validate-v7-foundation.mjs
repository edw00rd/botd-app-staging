import fs from "node:fs";
import assert from "node:assert/strict";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");

const scripts=[...app.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1,"Expected exactly one editor script");
new Function(scripts[0][1]);

for(const marker of [
  "V7_PLATFORM_SCHEMA_VERSION=1",
  "V7_EQUIPMENT_TYPES",
  "V7_SEMANTIC_MOVEMENT",
  "function v7EnsurePlatformState",
  "function v7RenderEquipment",
  "function v7PrepareEquipmentUI",
  "function v7SetupEquipmentEvents",
  "Practice Equipment",
  "data-equipment-id",
  "skate.forward",
  "skate.backward",
  "puck.pass",
  "puck.shot",
]) assert.ok(app.includes(marker),`Missing v7 marker: ${marker}`);

for(const legacyMarker of [
  'const APP_VERSION="6.8.2";',
  "function addPass(",
  "function addShot(",
  "function renderFrame(",
  "function snapshotPlay(",
  'id="toolbarPlayback"',
]) assert.ok(app.includes(legacyMarker),`Legacy clipboard capability missing: ${legacyMarker}`);

const types=["cone","tire","divider","pad","puck","puckPile","stick","rebounder","net"];
for(const type of types)assert.ok(app.includes(type+':{label:')||app.includes(type+':{label:'),`Missing equipment type: ${type}`);

console.log("V7 foundation validation passed: legacy clipboard markers preserved, semantic metadata present, equipment authoring compiled.");
