import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
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

// This runtime test guards against a cloud installer exception that previously
// prevented all editor initialization (blank benches, tiny rink, dead controls).
const start=script.indexOf("function v7CloudInstall(){");
const end=script.indexOf("\nfunction setupMainEvents(){",start);
assert.ok(start>=0&&end>start,"Cloud installer function must be found");
const listeners=[];
const element=(name,tab)=>({dataset:{tab},addEventListener(type,callback){
  assert.equal(typeof callback,"function");
  listeners.push({name,type});
}});
const teamTab=element("team-tab","teams");
const playbookTab=element("playbook-tab","playbook");
const nodes=new Map([
  ["#v7CloudNewBook",element("new-book")],
  ["#v7CloudRefresh",element("refresh")],
  ["#v7CloudSave",element("save")],
  ["#v7CloudSaveCopy",element("save-copy")],
  ["#v7CloudImportLocal",element("import-local")],
  ["#v7CloudBookSelect",element("select-book")],
  ["#v7CloudPlayList",element("play-list")]
]);
const context={
  $:selector=>nodes.get(selector)||null,
  $$:selector=>selector===".tab-btn"?[teamTab,playbookTab]:[],
  v7CloudNewBook:()=>{},v7CloudRefreshBooks:()=>{},
  v7CloudSave:()=>{},v7CloudImportLocal:()=>{},
  v7CloudRefreshPlays:()=>{},v7CloudStatus:()=>{},
  v7CloudOpenPlay:()=>{},v7CloudResetActive:()=>{},
  v7CloudRender:()=>{},v7Cloud:{}
};
vm.runInNewContext(script.slice(start,end)+"\nv7CloudInstall();",context,{timeout:1000});
assert.ok(listeners.some(x=>x.name==="playbook-tab"&&x.type==="click"));
assert.ok(!listeners.some(x=>x.name==="team-tab"));
for(const name of ["new-book","save","save-copy","import-local","select-book","play-list"])
  assert.ok(listeners.some(x=>x.name===name),"Listener missing for "+name);
console.log("Cloud editor startup runtime smoke passed.");
