import assert from "node:assert/strict";
import fs from "node:fs";
const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
const script=app.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,"Editable app script must exist");
new Function(script);
for(const marker of [
  "B.O.T.D. Hockey Playbook Studio V7 Preview",
  "Hockey Playbook Studio · V7 Preview",
 'id="v7CloudLibrary"','id="v7CloudBookSelect"','id="v7CloudNewBook"',
 'id="v7CloudSave"','id="v7CloudSaveCopy"','id="v7CloudImportLocal"',
 'id="v7CloudPlayList"','function v7CloudApi(','function v7CloudSave(',
 'function v7CloudOpenPlay(','function v7CloudImportLocal(',
 'function v7CloudResetActive(','v7CloudInstall();',
 'credentials:"same-origin"','expectedRevision:v7Cloud.revision',
 'Cloud saved:','Local originals were preserved.',
 'const SESSION_KEY=','const PLAYBOOK_KEY=',
])assert.ok(app.includes(marker),"Missing cloud editor component: "+marker);
assert.ok(app.includes('if(!confirm("Open this cloud play?'),"Opening remote play must warn about local draft");
assert.ok(!script.includes("sb_secret_"),"Client source must not contain service-role keys");
console.log("V7 cloud editor UI validation passed: syntax, controls, local save compatibility, conflicts.");
