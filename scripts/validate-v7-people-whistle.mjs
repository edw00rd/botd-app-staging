import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
const shell=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
assert.match(app,/V7\.1\.23 Preview/);
assert.match(shell,/V7\.1\.23 Preview/);
assert.ok(app.includes('const V7_UI_VERSION="7.1.23"'));

const people={
  skater:{id:"skater",teamId:"A",name:"Skater",role:"skater"},
  goalie:{id:"goalie",teamId:"B",name:"Goalie",role:"goalie"},
  coach:{id:"coach",teamId:"A",name:"Coach",role:"coach"},
  manager:{id:"manager",teamId:"B",name:"Manager",role:"manager"},
  bench:{id:"bench",teamId:"A",name:"Bench",role:"coach"}
};
const state={onIce:{skater:{x:200,y:300},goalie:{x:800,y:300},
  coach:{x:220,y:300},manager:{x:780,y:300}}};
const playerById=id=>people[id]||null;
const eligibility={
  state,playerById,Math,
  v60ContextMarkup:null,
  escapeHtml:s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;"),
  ui:{v60DirectSelection:true,playing:false,recordingMove:null,v60Mode:null,
    selectedType:"player",selectedId:"coach"}
};
const eligibleStart=app.indexOf("function v56EligiblePlayers(){");
const eligibleEnd=app.indexOf("function ensureV56DisclosureState(",eligibleStart);
assert.ok(eligibleStart>0&&eligibleEnd>eligibleStart);
vm.runInNewContext(app.slice(eligibleStart,eligibleEnd),eligibility,{timeout:1000});
const ids=eligibility.v56EligiblePlayers().map(p=>p.id).sort();
assert.deepEqual(Array.from(ids),["coach","goalie","manager","skater"],
  "Every on-ice human can receive a pass or possess the puck; benched people cannot");
assert.ok(app.includes("onIcePlayers=v56EligiblePlayers()"),
  "Puck Director lists skaters, goalies, coaches and managers alike");
assert.ok(app.includes('if(!player)continue;const position=playerPositionAt(id,time),distance=dist(point,position);'),
  "Dragging a puck to a staff token can establish possession");
assert.ok(app.includes('if(!pl)continue;for(let i=0;i<=14;i++)'),
  "Coaches and managers participate in puck collision detection");

const giveStart=app.indexOf("function v713EligiblePuckHolder(");
const giveEnd=app.indexOf("function v713StartGive(",giveStart);
assert.ok(giveStart>0&&giveEnd>giveStart);
vm.runInNewContext(app.slice(giveStart,giveEnd),eligibility,{timeout:1000});
for(const id of ids)assert.equal(eligibility.v713EligiblePuckHolder(id),true,
  id+" must be a valid Give target");
assert.equal(eligibility.v713EligiblePuckHolder("bench"),false);
assert.ok(app.includes('toast("Tap anyone on the ice to give them the puck.",2600)'));
assert.ok(app.includes("if(playerNode)v713CommitGive(playerNode.dataset.playerId)"),
  "Give mode intercepts on-ice people without selecting or dragging their token");
assert.ok(app.includes("if(playerNode)v60CommitPassToPlayer(playerNode.dataset.playerId)"),
  "Pass mode delivers the puck to the selected person");

const menuStart=app.lastIndexOf("v60ContextMarkup=function(){");
const menuEnd=app.indexOf("/* ---------- Intelligent telestration ---------- */",menuStart);
assert.ok(menuStart>0&&menuEnd>menuStart);
vm.runInNewContext(app.slice(menuStart,menuEnd),eligibility,{timeout:1000});
const coachMenu=eligibility.v60ContextMarkup();
for(const action of ["move","bench","whistle"])
  assert.ok(coachMenu.includes('data-v60-action="'+action+'"'),
    "Coaches must have "+action+" pill");
assert.match(coachMenu,/viewBox="0 0 32 24"/,
  "The whistle icon is drawn as compact cartoon SVG art");
eligibility.ui.selectedId="manager";
assert.ok(!eligibility.v60ContextMarkup().includes('data-v60-action="whistle"'),
  "Managers keep the existing Move and Bench controls without coach-specific whistle");
eligibility.ui.selectedId="skater";
assert.ok(!eligibility.v60ContextMarkup().includes('data-v60-action="whistle"'));
eligibility.ui.selectedId="goalie";
assert.ok(!eligibility.v60ContextMarkup().includes('data-v60-action="whistle"'));

const effectStart=app.indexOf("const V721_WHISTLE_MS=");
const effectEnd=app.indexOf("const v721PriorObjectRender=renderObjectLayer;",effectStart);
assert.ok(effectStart>0&&effectEnd>effectStart);
let tones=0;
const envelope=()=>({
  setValueAtTime(){},exponentialRampToValueAtTime(){}
});
const ctx={state:"running",currentTime:12,destination:{},
  createOscillator(){
    return {frequency:envelope(),connect(){},start(){tones++},stop(){}}
  },
  createGain(){
    return {gain:envelope(),connect(){}}
  }
};
const effects={...eligibility,audioContext:()=>ctx};
vm.runInNewContext(app.slice(effectStart,effectEnd),effects,{timeout:1000});
assert.equal(effects.v721IsWhistleEligible("coach"),true);
for(const other of ["skater","goalie","manager","bench"])
  assert.equal(effects.v721IsWhistleEligible(other),false);
assert.equal(effects.v721WhistleSound(),true);
assert.equal(tones,2,"Two short oscillator chirps should produce the whistle sound");
assert.ok(app.includes("v721-coach-buzz"),"Coach animation is included");
assert.ok(app.includes("v721-whistle-pop"),"Coach cartoon exclamation emote is included");
assert.ok(app.includes('menu.addEventListener("click",event=>'),
  "Whistle works via a direct click/touch gesture");
assert.ok(app.includes('if(ui.selectedType==="player")v721BlowCoachWhistle(ui.selectedId)'),
  "The selected coach receives the sound and buzz action");
assert.ok(app.includes("@media(prefers-reduced-motion:reduce)"),
  "Whistle presentation respects reduced motion");
console.log("V7.1.23 all-person puck targeting and coach whistle checks passed.");
