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


// Exercise both Pass interactions. v7 previously rejected loose-puck passes
// and silently dropped the "passSpace" action, leaving the puck stationary.
{
  const engineStart=app.lastIndexOf("buildPuckTimeline=function(){");
  const engineEnd=app.indexOf("\nfunction v7EquipmentSvg",engineStart);
  const engine="var buildPuckTimeline;\n"+app.slice(engineStart,engineEnd);
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const run=(events,collision=null)=>{
    const collisionCalls=[];
    const context={
      state:{puckStart:{x:100,y:100},timeline:{duration:12},onIce:{A:{},B:{}},equipment:[]},
      activeTake:()=>({events:structuredClone(events)}),
      clamp:(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),
      clampRinkPoint:p=>p,
      deepClone:p=>structuredClone(p),
      dist,
      polylineLength:points=>points.slice(1).reduce((sum,p,i)=>sum+dist(p,points[i]),0),
      passSpeedUnits:()=>100,shotSpeedUnits:()=>100,
      stickPosition:id=>id==="A"?{x:130,y:100}:{x:320,y:100},
      predictReceiverTarget:()=>({point:{x:320,y:100}}),
      firstCollisionOnPath:(...args)=>{collisionCalls.push(args[4]);return collision},
      boardBankPath:()=>null,
      v7CollisionPath:(start,end,hit)=>({path:[start,hit.point,{x:hit.point.x-10,y:hit.point.y}],end:{x:hit.point.x-10,y:hit.point.y},extraTime:.12}),
      v60BuildShotPath:()=>({path:[{x:100,y:100},{x:200,y:100},{x:200,y:200}],goal:false,boardFollow:true}),
      goalResultForShot:()=>({goal:false}),
      slicePolylineByProgress:()=>{throw Error("Unexpected collision during shot")},
    };
    vm.runInNewContext(engine,context,{timeout:2000});
    return{timeline:context.buildPuckTimeline(),collisionCalls};
  };
  const loose=run([{id:"loose-pass",type:"pass",time:0,targetId:"B",speed:6}]);
  assert.equal(loose.timeline.results.get("loose-pass").valid,true,"Loose-puck pass must remain available");
  assert.equal(loose.timeline.results.get("loose-pass").source,null);
  assert.equal(loose.timeline.results.get("loose-pass").target,"B");
  assert.ok(loose.timeline.intervals.some(i=>i.eventId==="loose-pass"&&i.motion==="pass"));
  assert.ok(loose.timeline.intervals.some(i=>i.kind==="attached"&&i.holder==="B"));
  assert.ok(loose.collisionCalls.some(c=>c?.includeObjects===true),"Passing must check rink objects");

  const attached=run([
    {id:"take",type:"possess",time:0,targetId:"A"},
    {id:"team-pass",type:"pass",time:.2,targetId:"B",speed:6,travelDuration:2}
  ]);
  assert.equal(attached.timeline.results.get("team-pass").valid,true);
  assert.equal(attached.timeline.results.get("team-pass").source,"A");
  assert.equal(attached.timeline.results.get("team-pass").duration,2,"Pass travel timing lost");

  const space=run([{id:"space-pass",type:"passSpace",time:0,target:{x:400,y:280},speed:6}]);
  const spaceFlight=space.timeline.intervals.find(i=>i.eventId==="space-pass");
  assert.ok(spaceFlight,"Pass to open ice must produce puck movement");
  assert.equal(space.timeline.results.get("space-pass").passToSpace,true);
  assert.equal(spaceFlight.path.at(-1).x,400);
  assert.equal(spaceFlight.path.at(-1).y,280);
  assert.ok(!space.timeline.intervals.some(i=>i.kind==="attached"),"Open-ice pass cannot attach to a player");
  assert.ok(space.collisionCalls.some(c=>c?.includeObjects===true),"Open-ice pass must check rink objects");

  const fromHolder=run([{id:"take",type:"possess",time:0,targetId:"A"},
    {id:"space-held",type:"passSpace",time:.2,target:{x:450,y:220},travelDuration:1.5}]);
  assert.equal(fromHolder.timeline.results.get("space-held").valid,true);
  assert.equal(fromHolder.timeline.results.get("space-held").duration,1.5);
  assert.equal(fromHolder.timeline.results.get("space-held").source,"A");

  const hit={kind:"object",point:{x:200,y:180},time:.5,response:"bounce"};
  const obstructed=run([{id:"blocked-space",type:"passSpace",time:0,target:{x:400,y:280}}],hit);
  assert.equal(obstructed.timeline.results.get("blocked-space").collision.kind,"object");
  assert.equal(obstructed.timeline.intervals.find(i=>i.eventId==="blocked-space").path.length,3);
}
assert.ok(app.includes('transform:"scale(0.92)"'),"On-ice token scale reduction missing");


// Runtime gates: independent shot collision policies, clearance geometry,
// visual lift and commit persistence. These run against the actual v7 engine.
{
  const a=app.lastIndexOf("buildPuckTimeline=function(){"),b=app.indexOf("\nfunction v7EquipmentSvg",a);
  assert.ok(a>0&&b>a);
  const path=[{x:100,y:100},{x:200,y:100},{x:300,y:100}];
  const run=(defense,objects)=>{
    const observed=[];
    const ctx={
      state:{puckStart:{x:100,y:100},timeline:{duration:12},equipment:[]},
      activeTake:()=>({events:[{id:"shot-policy",type:"shot",time:0,target:{x:300,y:100},aimVector:{x:1,y:0},power:7,ignoreDefense:defense,ignoreObjects:objects}]}),
      clamp:(n,lo,hi)=>Math.max(lo,Math.min(hi,n)),
      clampRinkPoint:p=>p,shotSpeedUnits:()=>100,
      polylineLength:pts=>pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-pts[i].x,p.y-pts[i].y),0),
      v60BuildShotPath:()=>({path,goal:false,boardFollow:false}),
      goalResultForShot:()=>({goal:false}),
      firstCollisionOnPath:(...args)=>{observed.push(args.at(-1));return null},
      v7ObjectClearancesOnPath:()=>[{objectId:"ob1",startProgress:.44,endProgress:.56}],
    };
    vm.runInNewContext("var buildPuckTimeline;\n"+app.slice(a,b),ctx,{timeout:2000});
    return{timeline:ctx.buildPuckTimeline(),options:observed[0]}
  };
  const bypass=run(true,true);
  assert.equal(bypass.options.includePlayers,false,"Ignore Defense did not bypass defender collision");
  assert.equal(bypass.options.includeObjects,false,"Ignore Objects did not bypass object collision");
  const shot=bypass.timeline.intervals.find(i=>i.eventId==="shot-policy");
  assert.equal(shot.path.length,3,"Ignore Objects must preserve the complete shot path");
  assert.equal(shot.clearances[0].objectId,"ob1","Ignored-object clearance metadata missing");
  const normal=run(false,false);
  assert.equal(normal.options.includePlayers,true);
  assert.equal(normal.options.includeObjects,true);
  assert.equal(normal.timeline.intervals.find(i=>i.eventId==="shot-policy").clearances.length,0);
}
{
  const a=app.indexOf("function v7ObjectClearancesOnPath(");
  const b=app.indexOf("const firstCollisionOnPathV682ForV7",a);
  assert.ok(a>0&&b>a,"Object-clearance geometry helper missing");
  const ctx={
    state:{equipment:[{id:"divider",physics:{collidable:true}}]},
    dist:(x,y)=>Math.hypot(x.x-y.x,x.y-y.y),
    pointLerp:(a,b,u)=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u}),
    clamp:(n,l,h)=>Math.max(l,Math.min(h,n)),
    polylineLength:pts=>pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-pts[i].x,p.y-pts[i].y),0),
    v7EquipmentCollisionAt:(_item,p)=>p.x>=190&&p.x<=210?{point:p}:null
  };
  vm.runInNewContext(app.slice(a,b)+"\nthis.detect=v7ObjectClearancesOnPath;",ctx,{timeout:2000});
  const events=ctx.detect([{x:100,y:100},{x:300,y:100}]);
  assert.equal(events.length,1);
  assert.ok(events[0].startProgress>.4&&events[0].startProgress<.5);
  assert.ok(events[0].endProgress>.5&&events[0].endProgress<.6);
}
{
  const a=app.indexOf("function v7PuckLiftAt(");
  const b=app.indexOf("const renderPuckLayerV682ForV7=renderPuckLayer",a);
  assert.ok(a>0&&b>a,"Puck clearance visual helper missing");
  const ctx={clamp:(n,l,h)=>Math.max(l,Math.min(h,n))};
  vm.runInNewContext(app.slice(a,b)+"\nthis.liftAt=v7PuckLiftAt;",ctx,{timeout:2000});
  const interval={start:0,end:10,kind:"travel",motion:"pass",clearances:[{startProgress:.43,endProgress:.57,objectId:"divider"}]};
  assert.ok(ctx.liftAt(interval,5)?.lift>15,"Elevated puck must visually clear object");
  assert.equal(ctx.liftAt(interval,0),null,"Puck must stay flat before object");
  assert.equal(ctx.liftAt(interval,9),null,"Puck must return to ice after object");
}
{
  const a=app.lastIndexOf("v60CommitShot=function(){");
  const b=app.indexOf("/* Lift the puck only while",a);
  assert.ok(a>0&&b>a,"V7 shot commit handler missing");
  let stored=null,finished=false;
  const ctx={
    ui:{v60Mode:{type:"shot",stage:"power",power:8,aim:{x:300,y:100},ignoreDefense:true,ignoreObjects:true}},
    v60ModeOrigin:()=>({x:100,y:100}),
    v60BuildShotPath:()=>({path:[{x:100,y:100},{x:300,y:100}],direction:{x:1,y:0},boardFollow:false}),
    deepClone:p=>structuredClone(p),
    addPuckEvent:payload=>{stored=payload;return payload},
    syncActiveVariation:()=>{},
    v60FinishPuckAction:()=>{finished=true},
  };
  vm.runInNewContext("var v60CommitShot;\n"+app.slice(a,b),ctx,{timeout:2000});
  ctx.v60CommitShot();
  assert.equal(stored?.ignoreDefense,true,"Shot did not persist Ignore Defense");
  assert.equal(stored?.ignoreObjects,true,"Shot did not persist Ignore Objects");
  assert.ok(finished,"Shot didn't finish the popup action");
}
for(const marker of [
  "v7ShotIgnoreDefense","v7ShotIgnoreObjects",
  "mode.ignoreDefense=existing?existing.ignoreDefense!==false:true",
  "mode.ignoreObjects=existing?!!existing.ignoreObjects:false",
  'typeof navigator.vibrate==="function"',
]) assert.ok(app.includes(marker),"Missing shot behavior: "+marker);

console.log("V7 foundation validation passed: legacy clipboard preserved, semantic metadata present, interactive rink-object engine compiled.");
