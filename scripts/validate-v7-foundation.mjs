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

const types=["cone","tire","bumper","divider","pad","stick","rebounder","net"];
for(const type of types)assert.ok(new RegExp(`\\b${type}:\\s*\\{`).test(app),`Missing equipment type: ${type}`);

for(const marker of [
  "function v7EquipmentCollisionAt",
  "function v7CollisionPath",
  'response:"bounce"',
  'response:"stop"',
  'response:"soft_block"',
  "function v7AddAdditionalPuck",
  "function v7DeleteAdditionalPuck",
  "function v7RenderAdditionalPucks",
  "function v7NormalizeAdditionalPucks",
  "Crease radius =",
  "v7ObjectRotation",
  "v7ObjectLength",
]) assert.ok(app.includes(marker),`Missing interactive object marker: ${marker}`);


/* Multiple pucks are genuine saved puck tokens, never equipment props. */
const equipmentCatalog=app.slice(app.indexOf("const V7_RINK_OBJECT_TYPES="),app.indexOf("const V7_EQUIPMENT_TYPES="));
assert.doesNotMatch(equipmentCatalog,/\bpuckPile\s*:/);
assert.doesNotMatch(equipmentCatalog,/\bpuck\s*:/);
for(const forbidden of ["v7TakePuckFromPile","v7UseSparePuck","v7ObjectQuantity","Take a usable puck","Use as active puck"])
 assert.ok(!app.includes(forbidden),"Legacy puck dispenser/conversion is still present: "+forbidden);
assert.ok(app.includes('const V7_MAX_PUCKS=50;'));
assert.ok(app.includes('state.additionalPucks=v7NormalizeAdditionalPucks'));
assert.ok(app.includes('data-v7-additional-puck-id'));
assert.ok(app.includes('data-v7-add-puck'),"Puck placement missing from Rink Objects");
assert.ok(app.includes('dialog.close();v7BeginAdditionalPuckPlacement()'),"Rink menu must initiate puck placement");
assert.ok(!app.includes('id="v7AddPuckButton"'),"Redundant + Puck toolbar button must be removed");
assert.ok(app.includes('state.puckStart={x:500,y:300};'),"New must load the primary puck at center ice");
assert.ok(app.includes('v7SchedulePuckDiscovery()'),"New puck discovery wobble must remain intact");
{
 const start=app.indexOf("const V7_MAX_PUCKS=50;"),end=app.indexOf("function v7EnsurePlatformState(",start);
 assert.ok(start>0&&end>start,"Additional puck normalizer must precede platform state");
 const scope={
   uid:()=>String(Math.random()),
   round:(v,d)=>Number(v.toFixed(d)),
   clamp:(x,a,b)=>Math.max(a,Math.min(b,x))
 };
 vm.runInNewContext(app.slice(start,end)+"\nthis.normalize=v7NormalizeAdditionalPucks;",scope,{timeout:2000});
 const fifty=Array.from({length:55},(_,i)=>({id:"p"+i,x:i*9,y:300}));
 assert.equal(scope.normalize(fifty).length,49,"Original puck + 49 additional = 50 max");
 assert.equal(scope.normalize([{id:"duplicate",x:40,y:50},{id:"duplicate",x:70,y:80}]).length,1);
 assert.equal(scope.normalize([{id:"bad",x:"oops",y:300}]).length,0);
}

// No special lightweight puck controller: every puck shares the full Puck Director.
{
 const section=app.slice(app.indexOf("function renderInspectorBase("),app.indexOf("function setPlayhead(",app.indexOf("function renderInspectorBase(")));
 assert.ok(section.includes('if(ui.selectedType==="puck"||ui.selectedType==="additionalPuck")'),"Shared puck inspector missing");
 for(const marker of ['id="addPossessionBtn"','id="dropPuckBtn"','id="puckTakeSelect"','id="puckGlowCheck"','id="clearPuckTakeBtn"','id="v7PuckX"','id="v7PuckY"']){
  assert.ok(section.includes(marker),"Shared Puck Director control missing: "+marker);
 }
 assert.ok(app.includes("setGlowStyle(group,item.glow"),"Added puck glow must use the default renderer settings");
 assert.ok(app.includes("glow:v7NormalizePuckGlow(item.glow)"),"Added puck glow must survive save/load");
 assert.ok(app.includes('v7SelectedPuckGlow().enabled=event.target.checked'),"Glow controls must work on any puck");
 assert.ok(app.includes('function clearActiveTake(){const id=ui.v7ActivePuckId'),"Clearing one puck must preserve other pucks' actions");
 assert.ok(!app.includes("function v7RenderAdditionalPuckInspector"),"Duplicated puck inspector must not remain");
 assert.ok(app.includes('function v7OpenPuckDirector()'),"Advanced puck controls must be accessible from both pucks");
 assert.ok(app.includes('data-v60-action="director"'),"Shared context menu must open Puck Director");
 assert.ok(app.includes('v7PreparePuckDirectorDialog()'),"Puck Director dialog must initialize");
 assert.ok(app.includes('renderInspectorBase();'),"Shared dialog must render the actual Puck Director");
 assert.ok(app.includes('v7PuckContextMarkupOriginal'),"The original pass/shot context menu must be preserved");

}


// Rink-object capture handlers run after the legacy base handler. A simple
// click must cancel the legacy "empty ice" pending tap before pointerup,
// while a drag still uses the object-specific interaction state.
{
 const extra=app.slice(app.indexOf("function v7SetupAdditionalPuckEvents()"),
                       app.indexOf("function v7SetEquipmentPlacement(",app.indexOf("function v7SetupAdditionalPuckEvents()")));
 const props=app.slice(app.indexOf("function v7SetupEquipmentEvents()"),
                       app.indexOf("function v7SetupInspectorEvents()",app.indexOf("function v7SetupEquipmentEvents()")));
 assert.ok(extra.includes('ui.pendingTap=null;v7AddAdditionalPuck(svgPoint(event))'),
   "New puck placement must not be deselected by the legacy pointerup");
 assert.match(extra,/const id=node.dataset.v7AdditionalPuckId[\s\S]*?ui.pendingTap=null;[\s\S]*?ui.selectedType="additionalPuck"/,
   "A single click on Puck 2 must keep the puck selected");
 assert.ok(props.includes('ui.pendingTap=null;v7AddEquipment(type,svgPoint(event)'),
   "Rink-object placement must not be deselected by the legacy pointerup");
 assert.match(props,/const id=equipmentNode.dataset.equipmentId[\s\S]*?ui.pendingTap=null;[\s\S]*?ui.selectedType="equipment"/,
   "A single click on any rink object must preserve its selection");
 const playerRender=app.slice(app.indexOf("function renderObjectLayer(time)"),app.indexOf("function renderPuckLayer(time)"));
 assert.ok(playerRender.includes('ui.selectedType==="additionalPuck"||ui.selectedType==="event"'),
   "Puck 2+ must display the exact same player targeting triangle as Puck 1");
 assert.ok(extra.includes('ui.v7ActivePuckId=id;ui.v60DirectSelection=true'),
   "Added-puck selection must enable the normal Pass/Shoot/Puck Director actions");
}

// Regression: v7 object collisions must preserve v6.1 aim-vector shot geometry.
const v7Timeline=app.slice(app.lastIndexOf('buildPuckTimeline=function(puckId="puck"){'));
const v7Shot=v7Timeline.slice(v7Timeline.indexOf('if(event.type==="shot"){'),v7Timeline.indexOf("function v7EquipmentSvg"));
for(const required of [
  "v60BuildShotPath(start",
  "requestedDuration(event,naturalDuration)",
  "slicePolylineByProgress(path,0,progress)",
  "includeObjects:!event.ignoreObjects",
  "boardFollow:!!built?.boardFollow"
]) assert.ok(v7Shot.includes(required),`V7 shot path regression: missing ${required}`);

// Execute the v7 shot engine, not just its syntax. Missing closure helpers
// previously caused renderFrame() to throw and disabled the entire editor.
{
  const engineStart=app.lastIndexOf('buildPuckTimeline=function(puckId="puck"){');
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
  const engineStart=app.lastIndexOf('buildPuckTimeline=function(puckId="puck"){');
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
// Each puck must animate its own simultaneous passes/shots, never steal
// another puck's event stream, and retain a stable origin after save/load.
{
 const a=app.lastIndexOf('buildPuckTimeline=function(puckId="puck"){'),b=app.indexOf("\nfunction v7EquipmentSvg",a);
 assert.ok(a>0&&b>a);
 const actions=[
  {id:"p1-pass",type:"passSpace",time:0,target:{x:260,y:120},speed:6},
  {id:"p2-pass",puckId:"puck-two",type:"passSpace",time:0,target:{x:470,y:200},speed:6},
  {id:"p3-shot",puckId:"puck-three",type:"shot",time:0,target:{x:800,y:360},
   aimVector:{x:1,y:0},power:7}
 ];
 const distance=(u,v)=>Math.hypot(u.x-v.x,u.y-v.y);
 const model={
  state:{puckStart:{x:100,y:100},additionalPucks:[
   {id:"puck-two",x:330,y:180},{id:"puck-three",x:510,y:300}],
   timeline:{duration:12},equipment:[],onIce:{}},
  activeTake:()=>({events:structuredClone(actions)}),
  v7AdditionalPuckById:id=>model.state.additionalPucks.find(p=>p.id===id),
  clamp:(v,a,z)=>Math.min(z,Math.max(a,v)),clampRinkPoint:p=>p,
  passSpeedUnits:()=>120,shotSpeedUnits:()=>100,dist:distance,
  polylineLength:points=>points.slice(1).reduce((sum,p,i)=>sum+distance(p,points[i]),0),
  v60BuildShotPath:source=>({path:[source,{x:source.x+180,y:source.y}],goal:false,boardFollow:false,contacts:[]}),
  goalResultForShot:()=>({goal:false}),firstCollisionOnPath:()=>null
 };
 vm.runInNewContext("var buildPuckTimeline;\n"+app.slice(a,b),model,{timeout:2000});
 const first=model.buildPuckTimeline(),second=model.buildPuckTimeline("puck-two"),third=model.buildPuckTimeline("puck-three");
 assert.equal(first.events.length,1);assert.equal(second.events.length,1);assert.equal(third.events.length,1);
 assert.equal(first.results.has("p2-pass"),false);
 assert.equal(second.results.has("p1-pass"),false);
 assert.equal(third.results.has("p2-pass"),false);
 assert.equal(first.results.get("p1-pass").path[0].x,100);
 assert.equal(second.results.get("p2-pass").path[0].x,330);
 assert.equal(second.results.get("p2-pass").path.at(-1).x,470);
 assert.equal(third.results.get("p3-shot").path[0].x,510);
 assert.equal(third.intervals.find(i=>i.motion==="shot")?.start,0);
 assert.ok(second.intervals.some(i=>i.motion==="pass"&&i.start===0));
}
for(const control of ["v7SelectedPuckId","v7SelectedPuckGlow","v7ActivePuckId","v7PuckActionAnchor","data-select-additional-puck"]){
 assert.ok(app.includes(control),"Additional puck action missing: "+control);
}

assert.ok(app.includes('transform:"scale(0.92)"'),"On-ice token scale reduction missing");


// Runtime gates: independent shot collision policies, clearance geometry,
// visual lift and commit persistence. These run against the actual v7 engine.
{
  const a=app.lastIndexOf('buildPuckTimeline=function(puckId="puck"){'),b=app.indexOf("\nfunction v7EquipmentSvg",a);
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
