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

const types=["cone","tire","bumper","divider","pad","stick","rebounder","puckPile","net"];
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
  "function v7RinkRemoveControl",
  "data-v7-object-handle",
  "function v7NudgeEquipment",
]) assert.ok(app.includes(marker),`Missing interactive object marker: ${marker}`);


/* Multiple pucks are genuine saved puck tokens, never equipment props. */
const equipmentCatalog=app.slice(app.indexOf("const V7_RINK_OBJECT_TYPES="),app.indexOf("const V7_EQUIPMENT_TYPES="));
assert.match(equipmentCatalog,/\bpuckPile\s*:/,"Puck pile must return as a rink prop");
assert.match(equipmentCatalog,/puckPile:[\s\S]*?collidable:false/,"Puck pile cannot block a route");
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

/* Pile supplies normal pucks; every puck remains shadow-free on the ice
   and in flight. The existing lift animation does not create a shadow. */
for(const required of [
 "function v7DispensePuckFromPile(", "function v7RinkDispensePuckControl(",
 'data-v7-dispense-puck', 'v7AddAdditionalPuck(point||(',
 'v7DispensePuckFromPile(dispense.dataset.v7DispensePuck)',
 'v7RinkDispensePuckControl(selected.id,point)',
 'const filter=phaseOn?glowFilter:"none";',
 'if(!interval||interval.kind!=="travel")return null',
 'v7RinkRemoveControl(selected.id,"equipment"',
 'raised.append(disc);group.append(raised)'
])assert.ok(app.includes(required),"Missing puck/pile behavior: "+required);
assert.ok(app.includes('type==="puckPile"'),"The pile must have artwork");
assert.ok(!app.includes('puckShadow'),"No puck may retain a legacy shadow filter");
assert.ok(!app.includes('v7PuckAirShadow'),"No puck may create a shadow in flight");
const extraPucks=app.slice(app.indexOf('function v7RenderAdditionalPucks('),
 app.indexOf('/* Reuse original route geometry',app.indexOf('function v7RenderAdditionalPucks(')));
assert.ok(!extraPucks.includes('group.append(v7PuckAirShadow'),"Additional pucks must remain shadow-free");
{
 const start=app.indexOf("function v7PuckLiftAt("),end=app.indexOf("renderPuckLayer=function(time,timeline){",start);
 assert.ok(start>0&&end>start,"Shared puck flight helper missing");
 const ctx={clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
 vm.runInNewContext(app.slice(start,end)+"\nthis.lift=v7PuckLiftAt;",ctx,{timeout:2000});
 assert.equal(ctx.lift(null,2),null,"Stationary puck must not fly");
 const travel={kind:"travel",motion:"pass",start:1,end:3,clearances:[]};
 assert.equal(ctx.lift(travel,1),null,"No flight before pass starts");
 assert.ok(ctx.lift(travel,2).lift>0,"Pass can retain its lift effect");
 assert.equal(ctx.lift(travel,3),null,"No flight after pass finishes");
 const sauce={...travel,clearances:[{startProgress:.35,endProgress:.65,objectId:"cone"}]};
 assert.ok(ctx.lift(sauce,2).lift>=ctx.lift(travel,2).lift,"Clearance arc still works");
}

// Original puck removal is stored in history, saved plays and play variations.
for(const marker of [
 'function v7DeletePrimaryPuck(){',
 'state.primaryPuckVisible=false;',
 'take.events=take.events.filter(event=>event.puckId&&event.puckId!=="puck")',
 'state.primaryPuckVisible=true;',
 'output.primaryPuckVisible=output.primaryPuckVisible!==false;',
 'option.primaryPuckVisible=source?.primaryPuckVisible!==false;',
 'data.primaryPuckVisible=state.primaryPuckVisible!==false;',
 'play.primaryPuckVisible=state.primaryPuckVisible!==false;',
 'main.style.display=state.primaryPuckVisible===false?"none":""',
 'function v7PuckCount()',
 'v7MaxAdditionalPucks(state.primaryPuckVisible)',
])assert.ok(app.includes(marker),"Missing puck-free drills invariant: "+marker);

// No special lightweight puck controller: every puck shares the full Puck Director.
{
 const section=app.slice(app.indexOf("function renderInspectorBase("),app.indexOf("function setPlayhead(",app.indexOf("function renderInspectorBase(")));
 assert.ok(section.includes('if(ui.selectedType==="puck"||ui.selectedType==="additionalPuck")'),"Shared puck inspector missing");
 for(const marker of ['id="addPossessionBtn"','id="dropPuckBtn"','id="puckTakeSelect"','id="puckGlowCheck"','id="clearPuckTakeBtn"','id="v7PuckX"','id="v7PuckY"']){
  assert.ok(section.includes(marker),"Shared Puck Director control missing: "+marker);
 }
 assert.ok(app.includes("setGlowStyle(group,v7PuckGlowById(id)"),"Every puck must use one shared glow renderer");
 assert.ok(app.includes("glow:v7NormalizePuckGlow(item.glow)"),"Added puck glow must survive save/load");
 assert.ok(app.includes('v7SelectedPuckGlow().enabled=event.target.checked'),"Glow controls must work on any puck");
 assert.ok(app.includes('function clearActiveTake(){const id=ui.v7ActivePuckId'),"Clearing one puck must preserve other pucks' actions");
 assert.ok(!app.includes("function v7RenderAdditionalPuckInspector"),"Duplicated puck inspector must not remain");
 assert.ok(app.includes('function v7OpenPuckDirector()'),"Advanced puck controls must be accessible from both pucks");
 assert.ok(app.includes('id="v7TimelinePuckDirectorBtn"'),"Puck Director must be beside + Puck route on the timeline");
 assert.ok(app.includes('$("#v7TimelinePuckDirectorBtn")?.addEventListener("click",()=>v7OpenPuckDirector());'),
   "Timeline Puck Director must open the existing director modal");
 assert.ok(!app.includes('data-v60-action="director"'),"Remove the old floating Puck Director action");
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
                       app.indexOf("/* Shot collision options are attached",app.indexOf("function v7SetupEquipmentEvents()")));
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
 assert.ok(extra.includes('const primaryNode=event.target.closest?.("[data-puck]");')&&
           extra.includes('ui.pendingTap=null;ui.dragPuck=null;')&&
           extra.includes('ui.selectedType="puck";ui.selectedId="puck";ui.v7ActivePuckId="puck";ui.v60DirectSelection=true;'),
   "Puck 1 must select directly and cancel legacy pointerup interactions");
 assert.ok(extra.includes('ui.v7PrimaryPuckDrag=canDrag?')&&
           extra.includes('ui.v7PrimaryPuckDrag=null;')&&
           extra.includes('state.puckStart={x:round(position.x,2),y:round(position.y,2)};'),
   "Puck 1 must remain selected after dragging or tapping");
 assert.ok(app.includes('.puck-disc{cursor:pointer;filter:none}'),
   "Neither puck may have the legacy CSS drop shadow");
}




/* Rink equipment retains on-ice removal; pucks use a floating HTML minus,
   with the Puck Director accessible beside + Puck route on the timeline. */
{
 const start=app.indexOf("function v7RinkRemoveControl("),
       end=app.indexOf("function v7EquipmentSvg(",start);
 assert.ok(start>0&&end>start,"Shared rink remove control missing");
 const env={round:(value,digits)=>Number(value.toFixed(digits)),
  svgEl:(tag,attrs)=>({tag,attrs,children:[],append(...children){this.children.push(...children)}})};
 vm.runInNewContext(app.slice(start,end)+"\nthis.make=v7RinkRemoveControl;",env,{timeout:2000});
 const puck=env.make("puck123","additionalPuck"),primary=env.make("puck","primaryPuck"),equipment=env.make("equipment123","equipment",{x:30,y:20});
 assert.equal(puck.attrs["data-v7-remove-additional-puck"],"puck123");
 assert.equal(primary.attrs["data-v7-remove-primary-puck"],"puck");
 assert.equal(equipment.attrs["data-v7-remove-equipment"],"equipment123");
 assert.equal(equipment.attrs.role,"button");
 assert.equal(equipment.children[0].tag,"circle");
 assert.equal(equipment.children[1].tag,"path");
 const equipmentRender=app.slice(app.indexOf("function v7RenderEquipment()"),
   app.indexOf("/* V7 on-ice visual scale.",app.indexOf("function v7RenderEquipment()")));
 assert.ok(equipmentRender.includes("if(selected&&!selected.goalSide)"),"Permanent goal nets must be protected");
 assert.ok(equipmentRender.includes('v7RinkGoalResetControl(selected.id,point)'),"Permanent goal selection needs a reset icon");
 assert.ok(equipmentRender.includes('v7RinkNetSizeControl(selected.id,point)'),"Selected nets need an on-ice size selector");
 assert.ok(equipmentRender.includes('v7RinkRemoveControl(selected.id,"equipment"'),"Selected equipment must show minus");
 const puckRender=app.slice(app.indexOf("function v7RenderAdditionalPucks("),
   app.indexOf("/* Reuse original route geometry",app.indexOf("function v7RenderAdditionalPucks(")));
 const puckToken=app.slice(app.indexOf("function v7CreatePuckToken("),app.indexOf("function v7RenderAdditionalPucks("));
 assert.ok(!puckToken.includes("v7RinkRemoveControl("),"Puck SVG must not draw an obscured minus");
 assert.ok(app.includes('function v7CreatePuckToken('),"All pucks need one shared renderer");
 const equipmentEvents=app.slice(app.indexOf("function v7SetupEquipmentEvents()"),
   app.indexOf("/* Shot collision options are attached",app.indexOf("function v7SetupEquipmentEvents()")));
 const puckEvents=app.slice(app.indexOf("function v7SetupAdditionalPuckEvents()"),
   app.indexOf("function v7SetEquipmentPlacement(",app.indexOf("function v7SetupAdditionalPuckEvents()")));
 assert.ok(equipmentEvents.includes('v7DeleteEquipment(remove.dataset.v7RemoveEquipment)'),"Equipment minus must delete");
 assert.ok(equipmentEvents.includes('v7ResetGoalNet(reset.dataset.v7ResetGoal)'),"On-ice reset must restore permanent goals");
 assert.ok(app.includes("function v7ResetGoalNet("),"Goal reset must not depend on an invisible inspector");
 assert.ok(puckEvents.includes('v7DeleteAdditionalPuck(remove.dataset.v7RemoveAdditionalPuck)'),"Added puck minus must delete");
 assert.ok(puckEvents.includes('v7DeletePrimaryPuck()'),"Original puck minus must delete");
 assert.ok(equipmentEvents.includes('else if(primary)v7DeletePrimaryPuck()'),"Keyboard original-puck minus must delete");
 assert.ok(equipmentEvents.includes('v7DeleteAdditionalPuck(puck.dataset.v7RemoveAdditionalPuck)'),"Keyboard minus must work for pucks");
 assert.ok(!equipmentEvents.includes("openRight()"),"Equipment selection must not call hidden drawer");
 assert.ok(!app.includes("function v7RenderEquipmentInspector"),"Dead equipment panel still present");
 assert.ok(!app.includes("function v7SetupInspectorEvents"),"Dead equipment inspector handlers still present");
 assert.ok(!app.includes("v7DeleteObjectBtn"),"Hidden delete equipment button still present");
 assert.ok(app.includes("function v7OpenPuckDirector()"),"Keep functional Puck Director");
}

/* The reduced bench footprint must free height for the ResizeObserver-fitted rink. */
{
 const start=app.lastIndexOf('<style id="v682WorkspacePolishStyles">'),
       end=app.indexOf("</style>",start),
       style=app.slice(start,end);
 assert.ok(start>0&&end>start,"Workspace CSS missing");
 for(const marker of [
  ".bench-rack.team-benches","min-height:56px;max-height:56px",
  ".bench-rack.team-benches .bench-token.bench-card",
  "height:42px;min-height:42px","@media(max-width:640px)",
  "min-height:100px;max-height:100px"
 ])assert.ok(style.includes(marker),"Missing compact bench rule: "+marker);
 assert.ok(app.includes("const ro=new ResizeObserver(entries=>{fitRink();"),
  "The rink must resize to occupy newly freed bench space");
 assert.ok(app.includes("body.benches-hidden .bench-rack.team-benches"),
  "Bench hide/show toggle must still be supported");
}

/* Primary and additional puck artwork and on-ice selection must be identical. */
{
 const begin=app.indexOf("function v7PuckSelectionRing(radius)");
 const finish=app.indexOf("function v7ScalePuckArt()",begin);
 assert.ok(begin>0&&finish>begin,"Shared selection ring missing");
 const context={svgEl:(tag,attributes)=>({tag,attributes})};
 vm.runInNewContext(app.slice(begin,finish)+"\nthis.makeRing=v7PuckSelectionRing;",context,{timeout:2000});
 const ring=context.makeRing(7);
 assert.equal(ring.tag,"circle");
 assert.equal(ring.attributes.r,12);
 assert.equal(ring.attributes.class,"selection-ring puck-select");
 const token=app.slice(app.indexOf("function v7CreatePuckToken("),app.indexOf("function v7RenderAdditionalPucks("));
 const defaultRenderer=app.slice(app.lastIndexOf("renderPuckLayer=function(time,timeline){"));
 assert.ok(token.includes('const primary=id==="puck"'),"Shared token must identify original puck");
 assert.ok(token.includes('group.append(v7PuckSelectionRing(r))'),"Shared circle required for both pucks");
 assert.ok(!token.includes("v7RinkRemoveControl("),"Puck 1 and additional pucks must use the overlay minus instead");
 assert.ok(defaultRenderer.includes('v7CreatePuckToken("puck",0,pos,ps,time,timeline)'),"Original puck must use shared renderer");
 assert.ok(app.includes('v7CreatePuckToken(puck.id,index+1,pos,ps,time,timeline)'),"Added puck must use shared renderer");
 assert.ok(app.includes('if(state.primaryPuckVisible===false)return{pos:null,mode:"hidden",hidden:true}'),"Puck-free drills must draw no default puck");
}
/* Floating puck controls must replace Puck Director with a red minus, while
   the same director opens from the timeline beside + Puck route. */
{
 const buttonStart=app.indexOf('id="newPuckTakeBtn"');
 const directorStart=app.indexOf('id="v7TimelinePuckDirectorBtn"');
 assert.ok(buttonStart>0&&directorStart>buttonStart&&directorStart-buttonStart<240,
   "Timeline Puck Director must sit immediately after + Puck route");
 const segment=app.slice(app.indexOf("const v7PuckContextMarkupOriginal=v60ContextMarkup;"),
   app.indexOf("const initV682ForV7=init;"));
 assert.ok(segment.includes('data-v60-action="remove-puck"'),"Floating puck menu needs HTML minus");
 assert.ok(segment.includes('title="Remove puck from ice"'),"Floating minus must be labeled");
 const ui={selectedType:"puck",selectedId:"puck",v60DirectSelection:true,playing:false,
   recordingMove:false,v60Mode:null};
 const context={ui,v60ContextMarkup:()=>'<div class="v60-context-actions"><button data-v60-action="pass">Pass</button><button data-v60-action="shoot">Shoot</button></div>'};
 vm.runInNewContext(segment,context,{timeout:2000});
 for(const selectedType of ["puck","additionalPuck"]){
   ui.selectedType=selectedType;
   const html=context.v60ContextMarkup();
   assert.ok(html.includes('data-v60-action="remove-puck"'),"No HTML minus for "+selectedType);
   assert.ok(!html.includes('Puck Director'),"Puck Director must not appear above ice");
   assert.ok(html.indexOf('data-v60-action="remove-puck"')>html.indexOf('data-v60-action="shoot"'),
     "Remove button must occupy former third action slot");
 }
 ui.v60DirectSelection=false;
 assert.ok(!context.v60ContextMarkup().includes("remove-puck"),"Do not show minus for an unselected puck");
 const listener=app.slice(app.indexOf("function v7PreparePuckDirectorDialog()"),
   app.indexOf("const v7PuckContextMarkupOriginal="));
 assert.ok(listener.includes('if(ui.selectedType==="puck")v7DeletePrimaryPuck();'),
   "HTML minus must delete original puck");
 assert.ok(listener.includes('v7DeleteAdditionalPuck(ui.selectedId)'),
   "HTML minus must delete whichever added puck is selected");
 assert.ok(app.includes(".v60-float-button.remove-puck{background:linear-gradient("),
   "Red remove button style must exist");
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
  const b=app.indexOf("renderPuckLayer=function(time,timeline){",a);
  assert.ok(a>0&&b>a,"Puck clearance visual helper missing");
  const ctx={clamp:(n,l,h)=>Math.max(l,Math.min(h,n))};
  vm.runInNewContext(app.slice(a,b)+"\nthis.liftAt=v7PuckLiftAt;",ctx,{timeout:2000});
  const interval={start:0,end:10,kind:"travel",motion:"pass",clearances:[{startProgress:.43,endProgress:.57,objectId:"divider"}]};
  assert.ok(ctx.liftAt(interval,5)?.lift>15,"Elevated puck must visually clear object");
  assert.equal(ctx.liftAt(interval,0),null,"Puck must stay flat before object");
  assert.ok(ctx.liftAt(interval,9)?.lift>0,"Pass remains animated after clearing an object");
 assert.equal(ctx.liftAt(interval,10),null,"Puck rests when travel finishes");
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
