import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");

const scripts=[...app.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1,"Expected exactly one editor script");
new Function(scripts[0][1]);

for(const marker of [
  "V7_PLATFORM_SCHEMA_VERSION=2",
  "V7_RINK_OBJECT_TYPES",
  "V7_SEMANTIC_MOVEMENT",
  "function v7EnsurePlatformState",
  "function v7RenderEquipment",
  "function v7PrepareEquipmentUI",
  "function v7SetupEquipmentEvents",
  "Rink Objects",
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

const types=["cone","tire","bumper","divider","pad","puck","puckPile","stick","rebounder","net"];
for(const type of types)assert.ok(new RegExp(`\\b${type}:\\s*\\{`).test(app),`Missing equipment type: ${type}`);

for(const marker of [
  "function v7EquipmentCollisionAt",
  "function v7CollisionPath",
  'response:"bounce"',
  'response:"stop"',
  'response:"soft_block"',
  "Take a usable puck",
  "Use as active puck",
  "Crease radius =",
  "v7ObjectRotation",
  "v7ObjectLength",
]) assert.ok(app.includes(marker),`Missing interactive object marker: ${marker}`);

// Regression: v7 object collisions must preserve v6.1 aim-vector shot geometry.
const v7Timeline=app.slice(app.lastIndexOf("buildPuckTimeline=function(){"));
const v7Shot=v7Timeline.slice(v7Timeline.indexOf('if(event.type==="shot"){'),v7Timeline.indexOf("function v7EquipmentSvg"));
for(const required of [
  "v60BuildShotPath(start",
  "requestedDuration(event,naturalDuration)",
  "slicePolylineByProgress(path,0,progress)",
  "includeObjects:true",
  "boardFollow:!!built?.boardFollow"
]) assert.ok(v7Shot.includes(required),`V7 shot path regression: missing ${required}`);

// Execute the v7 shot engine, not just its syntax. Missing closure helpers
// previously caused renderFrame() to throw and disabled the entire editor.
{
  const engineStart=app.lastIndexOf("buildPuckTimeline=function(){");
  const engineEnd=app.indexOf("\nfunction v7EquipmentSvg",engineStart);
  assert.ok(engineStart>0&&engineEnd>engineStart,"v7 timeline engine not found");
  const evt={id:"shot-test",type:"shot",time:0,target:{x:800,y:400},aimVector:{x:1,y:0},power:7,travelDuration:3};
  const intended=[{x:100,y:100},{x:200,y:100},{x:200,y:200}];
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const context={
    state:{puckStart:{x:100,y:100},timeline:{duration:12},equipment:[]},
    activeTake:()=>({events:[evt]}),
    clamp:(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),
    clampRinkPoint:p=>p,
    shotSpeedUnits:()=>100,
    polylineLength:points=>points.slice(1).reduce((sum,p,i)=>sum+dist(p,points[i]),0),
    v60BuildShotPath:()=>({path:intended,direction:{x:1,y:0},goal:false,boardFollow:true}),
    goalResultForShot:()=>({goal:false}),
    firstCollisionOnPath:()=>null,
    stickPosition:()=>({x:100,y:100}),
    v7CollisionPath:()=>{throw Error("No collision expected")},
    slicePolylineByProgress:()=>{throw Error("No collision expected")},
  };
  vm.runInNewContext("var buildPuckTimeline;\n"+app.slice(engineStart,engineEnd),context,{timeout:2000});
  const result=context.buildPuckTimeline();
  const flight=result.intervals.find(item=>item.eventId==="shot-test");
  assert.ok(flight,"shot travel interval missing");
  assert.equal(flight.path.length,3,"aim-based curved shot geometry was discarded");
  assert.equal(flight.path[1].x,200);
  assert.equal(flight.path[1].y,100);
  assert.equal(flight.end,3,"shot travelDuration was not preserved");
  assert.equal(flight.boardFollow,true,"board-follow indicator was lost");
}

console.log("V7 foundation validation passed: legacy clipboard preserved, semantic metadata present, interactive rink-object engine compiled.");
