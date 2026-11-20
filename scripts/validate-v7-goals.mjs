import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
assert.ok(app.includes("function v7DefaultGoalNet(side)"));
assert.ok(app.includes("function v7NetGoalCandidate(start,direction,maxDistance)"));
assert.ok(app.includes("includeGoalNets:false"));
assert.ok(app.includes('item.type!=="net"'),"Ignored-object clearances must exclude all nets");
assert.ok(!app.includes('d="M49 257h26v86'),"Legacy full-rink grey nets still present");
assert.ok(!app.includes('d="M258 105V65Q300'),"Legacy half-rink net still present");
assert.ok(app.includes('state.equipment=v7NormalizeEquipmentList([v7DefaultGoalNet("left"),v7DefaultGoalNet("right")])'),"New must restore both nets");
assert.ok(app.includes('if(!v7EquipmentById(id))return false'),"Default nets must be removable");
assert.ok(!app.includes('if(!v7EquipmentById(id)||v7EquipmentById(id).goalSide'),"No permanent-net deletion guard");
assert.ok(app.includes('data-v7-reset-goal'),"Goal reset control missing");
assert.ok(app.includes('const impacts=(physical?.contacts||built?.contacts||[])'),"Resolved object and board impacts must reach haptics");


/* Visual footprint is tied to physical rink scale, not the old oversized tokens. */
const metricsStart=app.indexOf("function v7OnIceSymbolMetrics("),metricsEnd=app.indexOf("function v7ScalePlayerSymbols(",metricsStart);
assert.ok(metricsStart>0&&metricsEnd>metricsStart);
const metricScope={};
vm.runInNewContext(app.slice(metricsStart,metricsEnd)+"\nthis.metrics=v7OnIceSymbolMetrics(4.8)",metricScope,{timeout:1500});
const visual=metricScope.metrics,goalWidth=6*4.8;
const skaterOutline=metricScope.v7PlayerSelectionFootprint("forward",visual);
const goalieOutline=metricScope.v7PlayerSelectionFootprint("goalie",visual);
const staffOutline=metricScope.v7PlayerSelectionFootprint("coach",visual);
const badgeReach=Math.hypot(20*visual.skaterScale,20*visual.skaterScale)+14*visual.skaterScale;
assert.ok(skaterOutline.radius>badgeReach+3&&skaterOutline.radius<visual.playerHitRadius+3,
 "Selected player outline must surround position and leadership badges without growing oversized");
assert.ok(goalieOutline.width>visual.goalieWidth+18&&goalieOutline.width<visual.goalieWidth+26&&
 staffOutline.width>visual.skaterDiameter+18&&staffOutline.width<visual.skaterDiameter+26,
 "Goalie and staff selection outlines must clear their markers");
const playerScaleSource=app.slice(metricsEnd,app.indexOf("/* Shared circular selection marker",metricsEnd));
assert.ok(playerScaleSource.includes('const y=p.role==="goalie"?-30:-26'),
 "Names must sit outside the enlarged selection ring");
assert.ok(playerScaleSource.includes('ring.removeAttribute("transform")')&&
 playerScaleSource.includes('ring.setAttribute("r",String(outline.radius))')&&
 playerScaleSource.includes('ring.setAttribute("pointer-events","none")'),
 "Animated player selection rings must use actual small geometry, not a CSS-overridden scale transform");
assert.ok(app.includes(".selection-ring{fill:none;stroke:#050505;stroke-width:2.8;stroke-dasharray:7 5"),
 "Selected players and pucks must use identical dash styling");
assert.ok(!app.includes(".selection-ring.v7-tight-player-selection{"),"No different player-only dash style");
assert.ok(Math.abs(visual.skaterDiameter-14.4)<.001);
assert.ok(Math.abs(visual.goalieWidth-17.28)<.001);
assert.ok(Math.abs(2*visual.puckRadius-3.84)<.001);
assert.ok(visual.skaterDiameter<goalWidth&&visual.goalieWidth<goalWidth);
assert.ok(visual.playerHitRadius>visual.skaterDiameter/2&&visual.puckHitRadius>visual.puckRadius);
assert.ok(app.includes("v7RenderEquipment();v7RenderAdditionalPucks(time);v7ScalePlayerSymbols()"),
 "Rink renderer must draw equipment, individual added pucks, and correctly scaled player symbols");
assert.ok(app.includes('layer.append(v7CreatePuckToken("puck",0,pos,ps,time,timeline))')&&app.includes('v7CreatePuckToken(puck.id,index+1,pos,ps,time,timeline)'),"All pucks must share the same shadow-free renderer");
assert.ok(app.includes(".v7-player-hitbox,.v7-puck-hitbox,[data-selection-handle]"));

/* Player action menu must avoid both the name label and ring, even at top edge. */
{
 const start=app.indexOf("function v7FloatingPlaceMenu("),end=app.indexOf("function v7FloatingInstall(",start);
 assert.ok(start>0&&end>start,"Floating action placement function missing");
 const ctx={ui:{selectedType:"player"},window:{innerWidth:800,innerHeight:600},
  clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),round:(v,n)=>Math.round(v*10**n)/10**n};
 vm.runInNewContext(app.slice(start,end)+"\nthis.place=v7FloatingPlaceMenu;",ctx,{timeout:1500});
 const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 const menu={hidden:true,style:{},offsetWidth:184,offsetHeight:42,
  classList:{items:new Set(),add(k){this.items.add(k)},remove(k){this.items.delete(k)}}};
 function anchor(token,label,ring){return{getBoundingClientRect:()=>token,
  closest:()=>({querySelector:s=>({".token-label":{getBoundingClientRect:()=>label},
   ".selection-ring":{getBoundingClientRect:()=>ring}}[s])})}}
 const label=rect(275,268,70,10);
 assert.equal(ctx.place(menu,anchor(rect(300,300,18,18),label,rect(290,287,38,38)),{gap:12}),true);
 assert.ok(parseFloat(menu.style.top)+42<=label.top-12,
  "Move/Bench actions must clear the full player name");
 const ringHigh=rect(290,32,38,38);
 assert.equal(ctx.place(menu,anchor(rect(300,45,18,18),rect(275,14,70,10),ringHigh),{gap:12}),true);
 assert.ok(parseFloat(menu.style.top)>=ringHigh.bottom+12,
  "Actions must flip below the ring when the player's name is near the top");
}

const round=(v,places=2)=>Math.round(v*10**places)/10**places;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const deepClone=v=>structuredClone(v);
const types={
  net:{geometry:{length:16,width:28.8},physics:{collidable:true,response:"stop",restitution:0},capabilities:{rotatable:true,resize:"none",puckSource:false}},
  cone:{geometry:{radius:4.2},physics:{collidable:true,response:"soft_block",restitution:.06},capabilities:{rotatable:false,resize:"none",puckSource:false}},
  tire:{geometry:{radius:10.5},physics:{collidable:true,response:"bounce",restitution:.60},capabilities:{rotatable:false,resize:"none",puckSource:false}},
  puckPile:{geometry:{radius:12},physics:{collidable:false,response:"none",restitution:0},capabilities:{rotatable:false,resize:"none",puckSource:true}}
};
const normalizerStart=app.indexOf("function v7CloneObjectDefaults(type)");
const normalizerEnd=app.indexOf("function v7EnsureSemanticTimeline(",normalizerStart);
assert.ok(normalizerStart>0&&normalizerEnd>normalizerStart);
const normContext={V7_RINK_OBJECT_TYPES:types,deepClone,clamp,round,uid:prefix=>prefix+"-test",
  v59ValidPoint:p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y),
  v59CopyPoint:p=>({x:p.x,y:p.y})};
const modelSource=app.slice(app.indexOf("const V7_ICE_M_TO_FT="),app.indexOf("const V7_CREASE_RADIUS_UNITS="));
assert.ok(modelSource.startsWith("const V7_ICE_M_TO_FT="),"Model source must precede net geometry");
const presetSource=app.slice(app.indexOf("const V7_NET_SIZES="),app.indexOf("const V7_RINK_OBJECT_TYPES="));
vm.runInNewContext(modelSource+
  "\nthis.state={ice:v7NormalizeIce({profile:'nhl'})};"+
  "\nconst V7_CREASE_RADIUS_UNITS=28.8;"+
  presetSource+"\n"+app.slice(normalizerStart,normalizerEnd)+
  "\nthis.iceGeometry=v7IceGeometry;this.iceNormalize=v7NormalizeIce;this.icePerimeter=v7IcePerimeter;this.iceCrease=v7IceCreaseOutline;",normContext,{timeout:3000});
/* A new faceoff must be symmetric and line up with the real rink art. */
{
 const a=app.indexOf("const DEFAULT_WHOLE_LINEUP="),b=app.indexOf("function createCanonicalLineup(",a);
 const c=app.indexOf("function v7CanonicalFaceoffLineup("),d=app.indexOf("function v7IcePerimeter(",c);
 assert.ok(a>0&&b>a&&c>0&&d>c,"Default faceoff position generators missing");
 const ctx={round,v7IceGeometry:ice=>normContext.iceGeometry(ice)};
 vm.runInNewContext(app.slice(a,b)+"\n"+app.slice(c,d)+
  "\nthis.baseline=DEFAULT_WHOLE_LINEUP;this.generate=v7CanonicalFaceoffLineup;",ctx,{timeout:2000});
 const pairs=[["A_2","B_2"],["A_1","B_3"],["A_3","B_1"],["A_13","B_13"],
  ["A_14","B_14"],["A_19","B_19"],["A_21","B_21"],["A_22","B_22"]];
 for(const profile of ["nhl","usa","canada","iihf"]){
  const ice=normContext.iceNormalize({profile}),g=normContext.iceGeometry(ice),lineup=ctx.generate(ice);
  for(const [l,r] of pairs){
   assert.ok(Math.abs(lineup[l].x+lineup[r].x-1000)<.00001,profile+": "+l+" horizontal mirror");
   assert.equal(lineup[l].y,lineup[r].y,profile+": "+l+" vertical mirror");
  }
  assert.equal(lineup.A_2.x,488);assert.equal(lineup.B_2.x,512);
  assert.equal(lineup.A_2.y,300);assert.equal(lineup.B_2.y,300);
  const wing=round(ice.faceoffRadius*g.scale+6,3);
  assert.equal(lineup.A_1.y,round(300-wing,3));assert.equal(lineup.A_3.y,round(300+wing,3));
  assert.equal(lineup.A_1.x,lineup.A_2.x);assert.equal(lineup.B_3.x,lineup.B_2.x);
  assert.equal(lineup.A_13.x,round(g.blueLeft+18,3));
  assert.ok(Math.abs(lineup.B_13.x-(g.blueRight-18))<.001);
  assert.equal(lineup.A_13.y,235);assert.equal(lineup.A_14.y,365);
  assert.equal(lineup.A_19.x,62);assert.equal(lineup.B_19.x,938);
 }
 assert.equal(ctx.baseline.A_1.y,222);assert.equal(ctx.baseline.A_3.y,378);
 assert.equal(ctx.baseline.A_13.x,398);assert.equal(ctx.baseline.B_13.x,602);
 assert.ok(app.includes("createCanonicalLineup=function(){return deepClone(v7CanonicalFaceoffLineup())}"));
 assert.ok(app.includes("lineup=v7CanonicalFaceoffLineup();"));
 assert.ok(!app.includes("{x:465,y:300}")&&!app.includes("{x:380,y:235}"),
   "Retired faceoff setup coordinates remain");
}
const initial=normContext.v7NormalizeEquipmentList(undefined);
assert.equal(initial.length,2,"Legacy play without equipment must receive default pair");
assert.equal(normContext.v7NormalizeEquipmentList([]).length,0,"Explicitly saved empty rink must remain empty");
assert.equal(normContext.v7NormalizeEquipmentList([initial[0]]).length,1,
 "Removing one original goal must never regenerate it");
const migrated=normContext.v7NormalizeEquipmentItem({id:"v7-goal-left",type:"net",goalSide:"left",x:62,y:300,rotation:0,netPreset:"pro"});
assert.equal(migrated.x,64.8,"Original built-in net should migrate to rink-driven 11ft goal line");
const custom=normContext.v7NormalizeEquipmentItem({id:"v7-goal-left",type:"net",goalSide:"left",x:82,y:295,rotation:15,netPreset:"pro"});
assert.equal(custom.x,82,"A user-moved net must never migrate unexpectedly");
assert.deepEqual(Array.from(initial,n=>n.goalSide).sort(),["left","right"]);
const left=initial.find(n=>n.goalSide==="left"),right=initial.find(n=>n.goalSide==="right");
assert.equal(left.x,64.8);assert.equal(left.geometry.width,28.8);assert.equal(left.rotation,0);
assert.equal(left.netPreset,"pro");assert.equal(left.scale,1);assert.equal(left.capabilities.resize,"none");
for(const [name,width,height] of [["little",14.4,2],["medium",19.2,3],["pro",28.8,4]]){
 const item=normContext.v7NormalizeEquipmentItem({id:name,type:"net",x:500,y:300,netPreset:name,scale:2.5,geometry:{length:110,width:120}});
 assert.equal(item.geometry.width,width,"Net opening must track 6 ft crease scale");
 assert.equal(item.geometry.heightFeet,height);
 assert.equal(item.scale,1,"Net resize must be disabled");
 assert.equal(item.capabilities.resize,"none");
}
assert.equal(right.x,935.2);assert.equal(right.rotation,180);

/* Cone and tire presets must survive normalization with no rotation or drag resize. */
for(const [type,choices] of [
 ["cone",[["mini",2.8],["training",4.2],["traffic",5.6]]],
 ["tire",[["mini",4.8],["kart",7],["small",10.5],["car",14.5]]]
]){
 for(const [preset,radius] of choices){
  const item=normContext.v7NormalizeEquipmentItem({id:type+"-"+preset,type,x:500,y:300,
   sizePreset:preset,rotation:90,scale:2.5,capabilities:{rotatable:true,resize:"uniform"}});
  assert.equal(item.sizePreset,preset);
  assert.equal(item.geometry.radius,radius);
  assert.equal(item.rotation,0);
  assert.equal(item.scale,1);
  assert.equal(item.capabilities.resize,"none");
  assert.equal(item.capabilities.rotatable,false);
 }
}
assert.equal(normContext.v7NormalizeEquipmentItem({type:"cone",x:500,y:300,geometry:{radius:6}}).sizePreset,"traffic",
 "Legacy cones must migrate to the closest new size");
assert.equal(normContext.v7NormalizeEquipmentItem({type:"tire",x:500,y:300,sizePreset:"truck",geometry:{radius:20.5}}).sizePreset,"car",
 "Retired truck tires should map to the largest available tire");
/* Saved old puck piles may have had handles and a large scale. */
const migratedPile=normContext.v7NormalizeEquipmentItem({
 type:"puckPile",x:500,y:300,rotation:80,scale:2.75,
 capabilities:{rotatable:true,resize:"uniform"}
});
assert.equal(migratedPile.rotation,0,"Puck pile must not rotate");
assert.equal(migratedPile.scale,1,"Puck pile must use native scale");
assert.equal(migratedPile.capabilities.rotatable,false,"No pile rotation handle");
assert.equal(migratedPile.capabilities.resize,"none","No pile resize handle");
assert.ok(app.includes('collision.type==="cone"?clamp(inMag*.04,1.5,7)'),
 "Cone impacts must die quickly");
assert.ok(app.includes('function v7DuplicateRound(id)')&&app.includes('v7EquipmentFitsIce(original,at)'),
 "Same-size duplicates must stay inside boards");


/* Regression: crease mouth snapping, orientation and opposing scrimmage alignment. */
const placementStart=app.indexOf("const V7_NET_CREASE_SNAP_DISTANCE_FT=");
const placementEnd=app.indexOf("function v7Deg(",placementStart);
assert.ok(placementStart>0&&placementEnd>placementStart);
vm.runInNewContext(app.slice(placementStart,placementEnd)+"\nthis.netPlan=v7PlanNetPlacement;this.snapCardinal=v7SnapNetCardinalAngle",normContext,{timeout:1500});
const planNet=normContext.netPlan;
const looseNet=normContext.v7NormalizeEquipmentItem({id:"scrimmage",type:"net",x:110,y:300,rotation:12});
let snap=planNet(looseNet,{x:83,y:306},initial);
assert.equal(snap.snap,"crease");assert.equal(snap.x,left.x);assert.equal(snap.y,300);assert.equal(snap.rotation,0);
assert.equal(snap.guide.kind,"crease");
snap=planNet({...looseNet,rotation:180},{x:83,y:306},initial);
assert.notEqual(snap.snap,"crease","Wrong-facing net must not snap");
snap=planNet(looseNet,{x:150,y:300},initial);
assert.notEqual(snap.snap,"crease","Far net must not snap");
snap=planNet({...looseNet,rotation:-174},{x:930,y:296},initial);
assert.equal(snap.snap,"crease");assert.equal(snap.side,"right");
assert.equal(snap.x,right.x);assert.equal(snap.rotation,180);
const small=normContext.v7NormalizeEquipmentItem({id:"small-net",type:"net",x:90,y:300,rotation:0,netPreset:"little"});
snap=planNet(small,{x:73,y:300},initial);
assert.equal(snap.snap,"crease");
assert.equal(snap.x,Math.round((72.8-small.geometry.length/2)*100)/100,
 "All goal sizes snap their crossbar to the goal line");
const parallelOther={id:"other-net",type:"net",x:380,y:244,rotation:180};
snap=planNet({...looseNet,rotation:0},{x:470,y:248},[parallelOther]);
assert.equal(snap.snap,"alignment");assert.equal(snap.y,244);
assert.equal(snap.guide.kind,"align","Opposing nets need a dotted guide");
snap=planNet({...looseNet,rotation:90},{x:384,y:380},[{...parallelOther,rotation:-90}]);
assert.equal(snap.snap,"alignment");assert.equal(snap.x,380,"Vertical nets must align");
snap=planNet({...looseNet,rotation:0},{x:470,y:265},[parallelOther]);
assert.equal(snap.guide,null,"Guides vanish when away from alignment");
snap=planNet({...looseNet,rotation:0},{x:470,y:248},[{...parallelOther,rotation:90}]);
assert.equal(snap.guide,null,"Perpendicular nets must not align");
assert.ok(app.includes('ui.v7NetAlignmentGuide=null')&&app.includes('v7RenderNetPlacementGuide(layer)'));
// A dotted guide must never imply that noticeably skewed crossbars are parallel.
let crossbarPlan=planNet({...looseNet,rotation:15},{x:470,y:244},[parallelOther]);
assert.equal(crossbarPlan.guide,null,"No guide for crossbars 15 degrees apart");
crossbarPlan=planNet({...looseNet,rotation:5},{x:470,y:248},[{...parallelOther,rotation:0}]);
assert.equal(crossbarPlan.snap,"alignment","Gentle angular attraction within 6 degrees");
assert.equal(crossbarPlan.rotation,0,"Parallel crossbars must be exactly matched");
assert.equal(crossbarPlan.y,244,"Centers must also match");
crossbarPlan=planNet({...looseNet,rotation:175},{x:470,y:248},[{...parallelOther,rotation:0}]);
assert.equal(crossbarPlan.rotation,-180,"Opposing nets must align their crossbars");
crossbarPlan=planNet({...looseNet,rotation:7.5},{x:470,y:244},[{...parallelOther,rotation:0}]);
assert.equal(crossbarPlan.guide,null,"No alignment indicator outside 6-degree angle window");
crossbarPlan=planNet({...looseNet,rotation:37},{x:456,y:292},[{...parallelOther,rotation:32}]);
assert.equal(crossbarPlan.rotation,32,"Non-cardinal crossbars must align too");
assert.ok(app.includes('state.equipment,true'),"Turning nets should align to nearby parallel crossbars");
assert.ok(app.includes('function v7NetRotateOverlay(item)')&&
  app.includes('(handleLayer||layer).append(v7NetRotateOverlay(selected))')&&
  app.includes('id="v7NetHandleLayer"')&&
  app.includes('"targetLayer","v7NetHandleLayer"'),
  "Net handle must render in its own topmost world-camera layer above the boards");
assert.ok(app.includes('desired=ry+37'),"Shortened rotation arm must be preserved");
assert.ok(!app.includes('for(const reach of [desired,'),"No disappearing or flipping handle near boards");
assert.ok(app.includes('v7RinkNetSizeControl(selected.id,slots.bottomRight)')&&
  app.includes('v7RinkGoalResetControl(selected.id,slots.topRight)'),
  "Goal controls must occupy the shared corner slots at full size");

/* Fine rotation snapping: 0, 90, 180, 270 degrees, only within ±2°. */
for(const [input,expected] of [[0,0],[1.9,0],[-1.9,0],[88.1,90],
 [91.9,90],[178.1,-180],[-179.1,-180],[269,-90],[271.5,-90],
 [358.5,0],[361.5,0],[2.1,2.1],[87.8,87.8],[-87.8,-87.8],
 [177.8,177.8],[182.5,-177.5],[272.5,-87.5]]){
 assert.equal(normContext.snapCardinal(input),expected,
  "Net cardinal angle must engage only inside the two-degree window: "+input)
}
assert.ok(app.includes('item.rotation=item.type==="net"?'),
 "Cardinal snapping must leave the rotation behavior of other equipment unchanged");
const tighter=normContext.v7NormalizeEquipmentItem({id:"tighter",type:"net",x:103,y:300,rotation:20});
let strictSnap=planNet(tighter,{x:83,y:306},initial);
assert.notEqual(strictSnap.snap,"crease","20-degree near-crease net should not be pulled early");
strictSnap=planNet({...tighter,rotation:12},{x:94,y:300},initial);
assert.notEqual(strictSnap.snap,"crease","Crease magnet distance should be 5.5 rink feet");
strictSnap=planNet({...tighter,rotation:0},{x:470,y:249.5},[parallelOther]);
assert.notEqual(strictSnap.snap,"alignment","Parallel-net alignment tolerance should be one rink foot");
/* Render layer must omit overlaid action controls during an active net rotation
   and restore them immediately on release, without clearing the selection. */
const renderStart=app.indexOf("function v7RenderEquipment(){");
const renderEnd=app.indexOf("/* V7 on-ice visual scale",renderStart);
assert.ok(renderStart>0&&renderEnd>renderStart);
const drawn=[],topDrawn=[];
const layer={firstChild:null,insertBefore(node){drawn.push(node.kind)},append(node){drawn.push(node.kind)}};
const handleLayer={replaceChildren(){topDrawn.length=0},append(node){topDrawn.push(node.kind)}};
const renderContext={
 V7_ROUND_SIZES:{},
 state:{equipment:[{...looseNet,id:"scrimmage",goalSide:null}]},
 ui:{selectedType:"equipment",selectedId:"scrimmage",
  v7EquipmentTransform:{id:"scrimmage",kind:"rotate"}},
 $:selector=>selector==="#v7NetHandleLayer"?handleLayer:layer,
 v7EquipmentSvg:()=>({kind:"net-art"}),
 v7RenderNetPlacementGuide:()=>{},
 v7EquipmentById:()=>({id:"scrimmage",type:"net",x:450,y:300,goalSide:null,capabilities:{rotatable:true}}),
 v59ClampVisiblePoint:p=>p,clampRinkPoint:p=>p,
 v7RinkRemoveControl:()=>({kind:"remove-control"}),
 v7RinkGoalResetControl:()=>({kind:"reset-control"}),
 v7RinkNetSizeControl:()=>({kind:"size-control"}),
 v7RinkDispensePuckControl:()=>({kind:"dispense-control"}),
 v7EquipmentActionSlots:()=>({topLeft:{},topRight:{},bottomLeft:{},bottomRight:{}}),
 v7NetRotateOverlay:()=>({kind:"rotate-overlay"})
};
vm.runInNewContext(app.slice(renderStart,renderEnd)+"\nthis.draw=v7RenderEquipment",renderContext,{timeout:1500});
renderContext.draw();
assert.deepEqual(drawn,["net-art"],
 "Rotating a net must omit only its two floating action buttons");
assert.deepEqual(topDrawn,["rotate-overlay"],
 "Rotation handle must remain visible in the layer above the rink wall");
drawn.length=0;renderContext.ui.v7EquipmentTransform=null;renderContext.draw();
assert.deepEqual(drawn,["net-art","remove-control","size-control"],
 "On release, compact net buttons return beneath the separate handle layer");
assert.deepEqual(topDrawn,["rotate-overlay"],
 "Net handle must still be visible after the rotation ends");


/* Physical on-ice containment includes rotated object silhouettes and pucks. */
const safeStart=app.indexOf("/* Board contact is the *painted inside face*");
const safeEnd=app.indexOf("/* Smart net placement:",safeStart);
assert.ok(safeStart>0&&safeEnd>safeStart);
const puckMetricsStart=app.indexOf("function v7OnIceSymbolMetrics("),puckMetricsEnd=app.indexOf("function v7ScalePlayerSymbols(",puckMetricsStart);
assert.ok(puckMetricsStart>0&&puckMetricsEnd>puckMetricsStart);
vm.runInNewContext(app.slice(puckMetricsStart,puckMetricsEnd),normContext,{timeout:1500});
vm.runInNewContext(app.slice(safeStart,safeEnd)+"\nthis.safe={distance:v7IceSignedDistance,point:v7PointClearOfBoards,fit:v7EquipmentFitsIce,clamp:v7ClampEquipmentToIce,puck:v7ClampPuckToIce,normalize:v7NormalizeOnIceTokens};this.v7PuckBoardInset=v7PuckBoardInset;this.v7PuckTravelPerimeter=v7PuckTravelPerimeter;this.v7PuckSafeVisibleLift=v7PuckSafeVisibleLift",normContext,{timeout:2000});
const safe=normContext.safe,geo=normContext.iceGeometry(normContext.state.ice);
/* Match the diagram reference: same small puck radius, no puck overlap,
   with the board footprint calculated from the actual visible discs. */
const pileDiscs=normContext.v7PuckPileDiscCenters();
assert.equal(pileDiscs.length,18,"Puck pile should show exactly 18 loose pucks");
assert.ok(new Set(pileDiscs.map(p=>p.x)).size>=16 &&
 new Set(pileDiscs.map(p=>p.y)).size>=16,
 "Puck pile layout should be organically scattered, never rows or a grid");
const pileR=visual.puckRadius+Math.max(.65,visual.puckRadius*.35)/2;
for(let i=0;i<pileDiscs.length;i++)for(let j=i+1;j<pileDiscs.length;j++)
 assert.ok(Math.hypot(pileDiscs[i].x-pileDiscs[j].x,pileDiscs[i].y-pileDiscs[j].y)>2*pileR+.1,
  "Puck pile pucks must not touch or overlap");
assert.equal(normContext.v7EquipmentFootprint({type:"puckPile",geometry:{radius:12}}).length,18,
 "Pile boards containment must check each disc");
const pileButtonOffset=normContext.v7PuckPileDispenseOffset();
const pileRight=Math.max(...pileDiscs.map(p=>p.x+p.r));
const pileTop=Math.min(...pileDiscs.map(p=>p.y-p.r));
assert.ok(pileButtonOffset.x>pileRight&&pileButtonOffset.y<pileTop,
 "Tiny dispenser must sit at the upper right like the supplied reference");
const pileWidth=pileRight-Math.min(...pileDiscs.map(p=>p.x-p.r));
const pileHeight=Math.max(...pileDiscs.map(p=>p.y+p.r))-pileTop;
assert.ok(pileWidth<28&&pileHeight<22&&pileWidth/pileHeight>1.2&&pileWidth/pileHeight<1.5,
 "Pile must be compact and approximately 4:3 like the illustration");
assert.ok(app.includes('layer.append(v7RinkDispensePuckControl(pile.id,point))'),
 "Each pile must keep its dispensing mark after spawning a puck");
assert.ok(!app.includes('v7PuckPileDispenserBeforeClone'),
 "Old late override must not turn the small + into a big puck");
assert.ok(app.includes('v7RinkRemoveControl(selected.id,"equipment",slots.bottomLeft)')&&
 app.includes('selected.type==="net"?"topLeft":"bottomRight"'),
 "Selected pile must use the shared bottom-left minus and bottom-right clone pill");
assert.ok(!app.includes('isPile?.64:isNet?.78:1'),
 "Selected pile minus must match standard puck-control size");
const markStart=app.indexOf("function v7RinkDispensePuckControl(id,point){");
const markEnd=app.indexOf("function v7RoundButton(",markStart);
assert.ok(markStart>0&&markEnd>markStart);
const markContext={
 state:{ice:normContext.state.ice},v7IceGeometry:normContext.iceGeometry,
 v7OnIceSymbolMetrics:normContext.v7OnIceSymbolMetrics,round,
 svgEl:(tag,attributes)=>({tag,attributes,children:[],append(child){this.children.push(child)}})
};
vm.runInNewContext(app.slice(markStart,markEnd)+"\nthis.make=v7RinkDispensePuckControl",markContext);
const inkPlus=markContext.make("pile",{x:500,y:300});
assert.equal(inkPlus.children.length,2,"Tiny + requires only invisible hitbox and ink stroke");
assert.equal(inkPlus.children[0].attributes.fill,"transparent","Hit target must be invisible");
assert.equal(inkPlus.children[1].attributes.stroke,"#101820","Plus should be drawn in dark ink");
assert.equal(inkPlus.children[1].tag,"path","No oversized green circle or redundant puck token");
assert.ok(inkPlus.attributes.style.includes("pointer-events:all"),
 "Small dispenser must receive pointer events in floating SVG");
const cornerPuck=safe.puck({x:geo.x+1,y:geo.y+1});
assert.ok(safe.point(cornerPuck,normContext.v7PuckBoardInset()),"Puck at a rounded corner must move onto playable ice");
for(const type of ["net","cone","tire","divider","bumper","pad","stick","rebounder","puckPile"]){
 const geometry=type==="net"?normContext.v7NetDimensions("pro"):
   type==="puckPile"?{radius:12}:type==="cone"||type==="tire"?{radius:9}:{length:58,width:12};
 const item={id:"test-"+type,type,geometry,rotation:37,scale:1};
 for(const target of [{x:geo.x+2,y:geo.y+2},{x:500,y:geo.yBottom+20}]){
   const adjusted=safe.clamp(item,target);
   assert.ok(adjusted&&safe.fit(item,adjusted),type+" must fit within the real curved board boundary");
 }
}
assert.equal(safe.clamp({type:"divider",geometry:{length:800,width:12},rotation:90,scale:2.75},
 {x:500,y:300}),null,"Physically impossible resize must be rejected");
assert.equal(safe.clamp(left,left).x,left.x,"Existing regulation goal must not move");
const loaded={ice:normContext.state.ice,equipment:[{type:"cone",geometry:{radius:6},rotation:0,scale:1,x:-100,y:-100}],additionalPucks:[{x:1100,y:700}],puckStart:{x:-100,y:700}};
safe.normalize(loaded);
assert.ok(safe.fit(loaded.equipment[0],loaded.equipment[0]));
assert.ok(safe.point(loaded.additionalPucks[0],normContext.v7PuckBoardInset()));
assert.ok(safe.point(loaded.puckStart,normContext.v7PuckBoardInset()));
const handleStart=app.indexOf("function v7NetRotateHandlePosition(");
const handleEnd=app.indexOf("\nfunction v7NetRotateOverlay(",handleStart);
assert.ok(handleStart>0&&handleEnd>handleStart);
normContext.v7CollisionGeometry=i=>({width:i.geometry.width,length:i.geometry.length});
normContext.v59VisibleWorldBounds=()=>({minX:geo.x,maxX:geo.xRight,minY:geo.y,maxY:geo.yBottom});
vm.runInNewContext(app.slice(handleStart,handleEnd)+"\nthis.rotatePosition=v7NetRotateHandlePosition",normContext,{timeout:1500});
const edgeNet={...left,x:500,y:geo.yBottom-30,rotation:180};
const handle=normContext.rotatePosition(edgeNet);
assert.ok(handle.y>edgeNet.y,"At bottom boards, rotation handle should stay outward, not flip inward");
assert.equal(handle.y,geo.yBottom-2,"Handle must be drawn above the wall, inside SVG viewport");
assert.ok(!safe.point(handle,13),"The rotation control is allowed to overlay boards; the net is not");
// Rotating beside the wall keeps the same angle direction in all cardinal orientations.
for(const [rot,axis,sign] of [[0,"y",-1],[90,"x",1],[180,"y",1],[270,"x",-1]]){
 const center={...edgeNet,x:500,y:300,rotation:rot};
 const loc=normContext.rotatePosition(center);
 assert.ok(sign*(loc[axis]-center[axis])>0,
   "Rotation angle "+rot+" must keep the handle on the expected side");
}
assert.ok(app.includes('const inset=12; // Circle radius 10'),
 "Handle should clip to the visible SVG frame, not to the ice perimeter");

assert.ok(app.includes('startPointerAngle:Math.atan2(dy,dx)*180/Math.PI')&&
 app.includes('transform.startRotation+'),"Flipped rotation handle should turn without angle jumping");


/* Puck banks follow the inset ice surface, including every curved board. */
assert.ok(app.includes('v60RoundedRinkPerimeter=function(){return v7PuckTravelPerimeter(state.ice)}'));
assert.ok(app.includes('v64ClampPlayablePoint=function(point){return v7ClampPuckToIce(point)'));
assert.ok(app.includes('v7PuckSafeVisibleLift(pos,flight?.lift)'));
const bankInset=normContext.v7PuckBoardInset(normContext.state.ice);
const bankPath=normContext.v7PuckTravelPerimeter(normContext.state.ice);
assert.ok(bankInset>3&&bankInset<4.5,"Puck center must follow the exact rendered radius, outline and board face without extra gap");
assert.ok(bankPath.length>=190,"Corners must remain smoothly sampled");
for(const p of bankPath)assert.ok(safe.point(p,bankInset-.04),
 "Board bank path cannot intersect boards "+JSON.stringify(p));
const topBank=Math.min(...bankPath.map(p=>p.y)),bottomBank=Math.max(...bankPath.map(p=>p.y));
assert.ok(Math.abs(topBank-(geo.y+bankInset))<.02);
assert.ok(Math.abs(bottomBank-(geo.yBottom-bankInset))<.02);
assert.ok(normContext.v7PuckSafeVisibleLift({x:500,y:topBank},14)<.1,
 "Airborne puck art must not jump across the top board");
assert.ok(normContext.v7PuckSafeVisibleLift({x:500,y:300},14)>13,
 "Mid-ice puck lift remains unchanged");
for(const settings of [{profile:"nhl"},{length:180,width:80,corner:20,goalInset:11},
 {length:200,width:100,corner:32,goalInset:11}]){
 const ice=normContext.v7NormalizeIce(settings),pad=normContext.v7PuckBoardInset(ice);
 for(const p of normContext.v7PuckTravelPerimeter(ice))
  assert.ok(safe.point(p,pad-.04,ice),"Custom rink rim must remain in the white ice");
}

const restored=normContext.v7NormalizeEquipmentList(structuredClone(initial));
assert.equal(restored.length,2,"Normalization must not duplicate permanent nets");
const extra=normContext.v7NormalizeEquipmentList([...initial,{id:"extra",type:"net",x:450,y:300}]);
assert.equal(extra.length,3,"Extra net must be kept distinct");
assert.equal(extra.find(n=>n.id==="extra").goalSide,null);
const moved=structuredClone(left);moved.x=500;moved.rotation=90;
assert.equal(normContext.v7NormalizeEquipmentList([moved,right]).find(n=>n.goalSide==="left").x,500);

function rotate(p,angle){
  const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return{x:p.x*c-p.y*s,y:p.x*s+p.y*c}
}
function toWorld(item,p){const q=rotate({x:p.x*item.scale,y:p.y*item.scale},item.rotation);return{x:item.x+q.x,y:item.y+q.y}}
function toLocal(item,p){const q=rotate({x:p.x-item.x,y:p.y-item.y},-item.rotation);return{x:q.x/item.scale,y:q.y/item.scale}}
function raySegment(start,direction,maxDistance,a,b){
  const r={x:direction.x*maxDistance,y:direction.y*maxDistance},s={x:b.x-a.x,y:b.y-a.y};
  const cross=(u,v)=>u.x*v.y-u.y*v.x;
  const denom=cross(r,s);if(Math.abs(denom)<1e-10)return null;
  const q={x:a.x-start.x,y:a.y-start.y};
  const t=cross(q,s)/denom,u=cross(q,r)/denom;
  if(t<=.0008||t>1.0001||u<-.0001||u>1.0001)return null;
  return{point:{x:start.x+r.x*t,y:start.y+r.y*t},distance:t*maxDistance,fraction:clamp(u,0,1)}
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ctx={
  state:{equipment:structuredClone(initial)},v7LocalToWorld:toWorld,v7WorldToLocal:toLocal,v7RotatePoint:rotate,
  v7NetPostRadius:item=>Math.max(.75,(Number(item.geometry?.width)||28.8)/36),
  v64RaySegmentHit:raySegment,v64GoalCandidate:null,goalResultForShot:null,v64NearestShotSurface:null,
  v64Unit:p=>{const n=Math.hypot(p.x,p.y)||1;return{x:p.x/n,y:p.y/n}},
  v60RoundedRinkPerimeter:()=>[{x:10,y:10},{x:990,y:10},{x:990,y:590},{x:10,y:590},{x:10,y:10}],
  v7ClosestPointSegment:(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return{x:a.x+dx*t,y:a.y+dy*t,t}},
  polylineLength:p=>p.slice(1).reduce((n,x,i)=>n+distance(x,p[i]),0),dist:distance
};
const begin=app.indexOf("function v7GoalNets()");
const end=app.indexOf("const firstCollisionOnPathV682ForV7",begin);
assert.ok(begin>0&&end>begin);
vm.runInNewContext(app.slice(begin,end),ctx,{timeout:2000});
const leftGoal=ctx.v64GoalCandidate({x:300,y:300},{x:-1,y:0},400);
assert.equal(leftGoal?.side,"left");assert.ok(Math.abs(leftGoal.entry.x-72.8)<.01);
assert.ok(Math.abs(leftGoal.end.x-57.8)<.01);
const rightGoal=ctx.v64GoalCandidate({x:700,y:300},{x:1,y:0},400);
assert.equal(rightGoal?.side,"right");assert.ok(Math.abs(rightGoal.entry.x-927.2)<.01);
assert.equal(ctx.v64GoalCandidate({x:300,y:390},{x:-1,y:0},400),null,"Wide shot cannot score");
assert.equal(ctx.v64GoalCandidate({x:40,y:300},{x:1,y:0},400),null,"Shooting from behind cannot score");
assert.equal(ctx.v64GoalCandidate({x:300,y:314.4},{x:-1,y:0},400),null,"Crossing a goalpost cannot score");
const post=ctx.v64NearestShotSurface({x:300,y:314.4},{x:-1,y:0},400);
assert.equal(post?.surface,"post","Post must have physical collision");
const back=ctx.v64NearestShotSurface({x:40,y:300},{x:1,y:0},50);
assert.equal(back?.surface,"back","Back mesh must block shots from behind");

ctx.state.equipment[0].x=500;ctx.state.equipment[0].rotation=90;
const rotated=ctx.v64GoalCandidate({x:500,y:400},{x:0,y:-1},200);
assert.equal(rotated?.side,"left","Moved/rotated net must update goal mouth");
assert.equal(ctx.v64GoalCandidate({x:570,y:400},{x:0,y:-1},200),null,"Rotated net must still reject misses");
ctx.state.equipment[0].rotation=0;ctx.state.equipment[0].x=64.8;
ctx.state.equipment[0].geometry=normContext.v7NetDimensions("medium");
assert.equal(ctx.v64GoalCandidate({x:300,y:307},{x:-1,y:0},400)?.side,"left","Medium net mouth should accept a clean shot");
assert.equal(ctx.v64GoalCandidate({x:300,y:314},{x:-1,y:0},400),null,"Medium net cannot score outside 4 ft opening");
const added=normContext.v7NormalizeEquipmentItem({id:"added-net",type:"net",x:450,y:300,netPreset:"little",rotation:0});
ctx.state.equipment.push(added);
const extraGoal=ctx.v64GoalCandidate({x:600,y:300},{x:-1,y:0},400);
assert.equal(extraGoal?.netId,"added-net","Extra nets must score independently");
assert.equal(ctx.goalResultForShot({x:300,y:300},{x:40,y:300})?.goal,true);
assert.equal(ctx.goalResultForShot({x:300,y:390},{x:40,y:390})?.goal,false);


/* Regression: a loose puck already in a scored goal can pass through its
   open mouth. It must still collide with mesh and other rink equipment. */
assert.ok(app.includes("function v7NetOpenMouthEgress(net,start,next)"));
assert.ok(app.includes("startingNetExits.has(item.id)"));
assert.ok(app.includes('v60CommitPassToPoint(svgPoint(event));return'),"Pass targeting on an on-ice net must not select the net instead");
const collisionStart=app.indexOf("function v7EquipmentCollisionAt(");
const collisionEnd=app.indexOf("/* Detect physical objects crossed",collisionStart);
assert.ok(collisionStart>0&&collisionEnd>collisionStart);
vm.runInNewContext(app.slice(collisionStart,collisionEnd),ctx,{timeout:3000});
ctx.V7_PUCK_RADIUS=2.8;
ctx.V7_RINK_OBJECT_TYPES={net:{shape:"net"},cone:{shape:"circle"},tire:{shape:"ring"}};
ctx.pointLerp=(a,b,u)=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u});
ctx.lerp=(a,b,t)=>a+(b-a)*t;
ctx.clamp=clamp;
ctx.state.equipment=structuredClone(initial);
const leftNet=ctx.state.equipment.find(n=>n.goalSide==="left");
const rightNet=ctx.state.equipment.find(n=>n.goalSide==="right");
const goalStart={x:leftNet.x,y:300};
const centerIce={x:350,y:300};
const rightStart={x:rightNet.x,y:300};
const rightExit={x:650,y:300};
assert.ok(ctx.v7NetOpenMouthEgress(leftNet,goalStart,centerIce),"Left net egress must be valid");
assert.ok(ctx.v7NetOpenMouthEgress(rightNet,rightStart,rightExit),"180-degree right net egress must be valid");
assert.equal(ctx.v7FirstEquipmentCollisionOnPath([goalStart,centerIce],0,1),null,"Left-net pass to open ice must exit cleanly");
assert.equal(ctx.v7FirstEquipmentCollisionOnPath([rightStart,rightExit],0,1),null,"Right-net pass to open ice must exit cleanly");
assert.equal(ctx.v7NetOpenMouthEgress(leftNet,goalStart,{x:35,y:300}),false,"Passing through back mesh is not a legal mouth exit");
assert.equal(ctx.v7NetOpenMouthEgress(leftNet,goalStart,{x:leftNet.x,y:380}),false,"Passing out through side mesh is not a legal mouth exit");
assert.equal(ctx.v7FirstEquipmentCollisionOnPath([goalStart,{x:35,y:300}],0,1)?.objectId,leftNet.id,"Back mesh still blocks");
assert.equal(ctx.v7FirstEquipmentCollisionOnPath([goalStart,{x:leftNet.x,y:380}],0,1)?.objectId,leftNet.id,"Side mesh still blocks");
assert.equal(ctx.v7FirstEquipmentCollisionOnPath([{x:350,y:300},goalStart],0,1)?.objectId,leftNet.id,"Entering net from ice still collides");
const nearPost={x:goalStart.x,y:300};
assert.equal(ctx.v7NetOpenMouthEgress(leftNet,nearPost,{x:100,y:360}),false,"Passing through a goalpost is blocked");
ctx.state.equipment.push({id:"blocking-cone",type:"cone",x:220,y:300,rotation:0,scale:1,
 geometry:{radius:7},physics:{collidable:true,response:"bounce",restitution:.65}});
assert.equal(ctx.v7FirstEquipmentCollisionOnPath([goalStart,centerIce],0,1)?.objectId,"blocking-cone",
 "Cone must remain collidable for shots; Pass will bypass it");
const tire={id:"test-tire",type:"tire",x:500,y:300,rotation:0,scale:1,
 geometry:{radius:14.5},physics:{collidable:true,response:"bounce",restitution:.6}};
assert.equal(ctx.v7EquipmentCollisionAt(tire,{x:500,y:300}),null,
 "Puck in the tire center must not collide with empty space");
assert.equal(ctx.v7EquipmentCollisionAt(tire,{x:514.5,y:300})?.type,"tire",
 "A shot must still collide with the rubber");
ctx.state.equipment=structuredClone(initial);
const hitOnReentry=ctx.v7FirstEquipmentCollisionOnPath([goalStart,centerIce,goalStart],0,2);
assert.equal(hitOnReentry?.objectId,leftNet.id,"Same net must collide after the puck has exited and reentered");
// Run a real pass-to-space event through the current timeline logic, not
// just the collision helper: the puck must actually arrive outside the net.
const timelineStart=app.indexOf('buildPuckTimeline=function(puckId="puck"){');
const timelineEnd=app.indexOf("/* A goal is",timelineStart);
assert.ok(timelineStart>0&&timelineEnd>timelineStart);
const puckTake={id:"test-take",name:"Test route",events:[{id:"pass-out",type:"passSpace",time:0,
 target:centerIce,speed:6,ignoreDefense:true}]};
ctx.state={equipment:structuredClone(initial),puckStart:goalStart,onIce:{},
 timeline:{duration:12,puckTakes:[puckTake],activeTakeId:puckTake.id,movements:[]}};
ctx.activeTake=()=>puckTake;
ctx.passSpeedUnits=()=>420;
ctx.clampRinkPoint=p=>p;
ctx.v7ClampPuckToIce=p=>p;
ctx.firstCollisionOnPath=(points,start,end)=>ctx.v7FirstEquipmentCollisionOnPath(points,start,end);
ctx.buildPuckTimeline=null;
vm.runInNewContext(app.slice(timelineStart,timelineEnd),ctx,{timeout:3000});
const simulated=ctx.buildPuckTimeline();
const passResult=simulated.results.get("pass-out");
assert.equal(passResult?.valid,true,"Pass event from net must be valid");
assert.equal(passResult?.collision,undefined,"Direct passes must not produce collision metadata");
assert.ok(Math.abs(passResult.path.at(-1).x-centerIce.x)<.001,"Pass-out must reach selected target");
assert.ok(simulated.intervals.some(i=>i.kind==="travel"&&i.motion==="pass"&&i.end>i.start+.1),
 "Pass-out must create an observable travel segment");

// Pass-to-space must reach the precise tire center through any intervening
// players, cones or nets, without consulting the collision routine.
ctx.state.equipment=[...structuredClone(initial),tire,{
 id:"blocking-cone",type:"cone",x:300,y:300,rotation:0,scale:1,
 geometry:{radius:5.6},physics:{collidable:true,response:"soft_block",restitution:.06}
}];
ctx.state.puckStart={x:150,y:300};
puckTake.events=[{id:"inside-tire",type:"passSpace",time:0,target:{x:500,y:300},
 speed:6,ignoreDefense:false}];
ctx.firstCollisionOnPath=()=>{throw new Error("PASS must never evaluate collision")};
let passSimulation=ctx.buildPuckTimeline(),landed=passSimulation.results.get("inside-tire");
assert.equal(landed?.valid,true);
assert.equal(landed?.path?.at(-1)?.x,500);
assert.equal(landed?.path?.at(-1)?.y,300);
assert.equal(landed?.collision,undefined);

ctx.state.onIce={receiver:{x:600,y:300}};
ctx.stickPosition=()=>({x:600,y:300});
ctx.predictReceiverTarget=()=>({point:{x:600,y:300}});
puckTake.events=[{id:"player-pass",type:"pass",time:0,targetId:"receiver",speed:6}];
passSimulation=ctx.buildPuckTimeline();
const received=passSimulation.results.get("player-pass");
assert.equal(received?.valid,true);
assert.equal(received?.path.at(-1)?.x,600);

const passCode=app.slice(app.indexOf('if(event.type==="pass"){',timelineStart),
 app.indexOf('if(event.type==="shot"){',timelineStart));
assert.ok(!passCode.includes("firstCollisionOnPath(")&&!passCode.includes("boardBankPath("),
 "Pass must not use shot collision or board banks");
assert.ok(app.includes("includeObjects:!event.ignoreObjects,includeGoalNets:false"),
 "Shoot must retain obstacle collisions");
assert.ok(app.includes('"fill-rule":"evenodd"')&&app.includes('r:inner,fill:"none"'),
 "Tire SVG must have a transparent opening");

for(const marker of ['label:"Regulation Goal"','label:"Cross-Ice Goal"','label:"Mini Goal"',
  'function v7PuckInsideNet(net,point)','function v7SyncGoalNetOccupancy(puckPosition)',
  'v7GoalFlashes.set(id,true)','data-v7-net-visual','data-v7-net-red',
  'data-v7-net-size','data-v7-net-preset',
  'v7ApplyNetGoalFlash(netArt,performance.now())',
  'v7SyncGoalNetOccupancy([...(state.primaryPuckVisible===false?[]:[output?.ps?.pos])',
  '$("#goalBanner").classList.remove("active")'
])assert.ok(app.includes(marker),"Missing occupancy-based goal flash marker: "+marker);
assert.ok(app.includes('...(state.additionalPucks||[]).map(item=>puckStateAt(time,buildPuckTimeline(item.id)).pos)'),
  "Goal occupancy must include every additional puck");
assert.ok(!app.includes("performance.now()+3500"),"A fixed 3.5-second timer must not control a scored goal");
assert.ok(app.includes('for(const node of '+String.fromCharCode(36,36)+'("[data-v7-net-visual]"))'),"Net flashing must iterate ALL net nodes");
assert.ok(!app.includes('data-v7-goal-light'),"Standalone beacon must be gone");
assert.ok(!app.includes('data-v7-goal-bulb'),"Standalone bulb must be gone");
assert.ok(app.indexOf('pro:Object.freeze({label:"Regulation Goal"')<app.indexOf('medium:Object.freeze({label:"Cross-Ice Goal"'),
  "Regulation goal must be first in default net selector");
assert.ok(app.includes('function v7CycleNetSize(id)'),"Net size changes must be accessible from the rink");
assert.ok(app.includes('if(item.goalSide)item.iceAnchor=false'),"A custom goal size must not be overwritten by auto-anchoring");
assert.ok(app.includes('netPreset=isNet&&Object.hasOwn(V7_NET_SIZES,item.netPreset)?item.netPreset:"pro"'),
  "Nets without a preset must default to regulation size");
const playback=app.slice(app.indexOf("tick=function(ts){"),app.indexOf("function v64RaySegmentHit("));
assert.ok(!playback.includes("goalSiren()"),"Scoring must not play a separate siren");


/* Goalies spawn on the new real crease instead of inside the legacy goal. */
const goalieA=app.indexOf("function v7DefaultGoalieCreasePosition(");
const goalieB=app.indexOf("/* Default nets are removable like every other object.",goalieA);
assert.ok(goalieA>0&&goalieB>goalieA);
assert.ok(app.includes('if(p?.role==="goalie")return v7DefaultGoalieCreasePosition(teamId,index)'));
const goalieContext={state:{ice:{creaseRadius:6}},V7_ICE_PROFILES:{nhl:{creaseRadius:6}},
 v7IceGeometry:()=>({goalLeft:72.8,goalRight:927.2,scale:4.8}),round};
vm.runInNewContext(app.slice(goalieA,goalieB)+
 '\nthis.left=v7DefaultGoalieCreasePosition("A",0);this.right=v7DefaultGoalieCreasePosition("B",0);',
 goalieContext,{timeout:1500});
assert.ok(Math.abs(goalieContext.left.x-87.2)<.001,"Left goalie not centered within crease");
assert.ok(Math.abs(goalieContext.right.x-912.8)<.001,"Right goalie not centered within crease");
assert.equal(goalieContext.left.y,300);
assert.equal(goalieContext.right.y,300);

/* Skater and goalie jersey numbers share centered SVG text geometry. */
const playerScale=app.slice(app.indexOf("function v7ScalePlayerSymbols("),app.indexOf("function v7ScalePuckArt("));
for(const marker of ['n.setAttribute("x","0")','n.setAttribute("y","0")','n.setAttribute("dy",".08em")',
 'n.setAttribute("text-anchor","middle")','n.setAttribute("dominant-baseline","central")',
 'n.style.fontFamily="inherit"'])
 assert.ok(playerScale.includes(marker),"Number centering regression: "+marker);
for(const marker of ['n.style.fontWeight="950"',
 'n.style.fontSize=(p.role==="goalie"?24:21)+"px"',
 'n.style.stroke="none"','n.style.strokeWidth="0px"']){
 assert.ok(playerScale.includes(marker),"On-ice jersey typography must match bench: "+marker);
}
assert.ok(app.includes('.bench-piece{')&&
 app.includes('font-size:10px;font-weight:950;line-height:1'),
 "Reference bench number typography is missing");
assert.ok(21/40>10/30,
 "Skater number must be enlarged relative to the bench proportion");
assert.ok(24/42>10/26,
 "Goalie number must be enlarged relative to the bench proportion");

/* The center-puck attention cue is delayed, one-shot, and only after New. */
for(const marker of ['function v7SchedulePuckDiscovery()',
 'v7PuckDiscoveryPending=setTimeout','v7PuckDiscoveryActive=true',
 'v7PuckDiscoveryStopTimer=setTimeout','v7SchedulePuckDiscovery()',
 '.v7-puck-discovery-art','pointerdown",v7StopPuckDiscovery,true'])
 assert.ok(app.includes(marker),"Puck discovery regression: "+marker);
const eligibleStart=app.indexOf("function v7PuckDiscoveryEligible(");
const eligibleEnd=app.indexOf("function v7SchedulePuckDiscovery(",eligibleStart);
const eligibleCtx={state:{puckStart:{x:500,y:300},onIce:{},
 timeline:{movements:[]}},ui:{playing:false,playhead:0,selectedType:null},
 activeTake:()=>({events:[]})};
vm.runInNewContext(app.slice(eligibleStart,eligibleEnd)+"\nthis.check=v7PuckDiscoveryEligible",eligibleCtx,{timeout:1500});
assert.equal(eligibleCtx.check(),true,"New blank rink should show puck attention");
eligibleCtx.state.onIce["A_1"]={x:100,y:200};
assert.equal(eligibleCtx.check(),false,"Played or populated rink should not show puck attention");
eligibleCtx.state.onIce={};eligibleCtx.state.puckStart={x:530,y:300};
assert.equal(eligibleCtx.check(),false,"Relocated puck should not show center attention");

/* Occupancy, including every configured net, governs blinking indefinitely. */
const liveStart=app.indexOf("const v7GoalFlashes=new Map();");
const liveEnd=app.indexOf("function v7EquipmentSvg(",liveStart);
assert.ok(liveStart>0&&liveEnd>liveStart);
const netA={id:"left",type:"net",x:100,y:200,rotation:0,scale:1,geometry:{length:19.2,width:28.8}};
const netB={id:"right",type:"net",x:500,y:200,rotation:0,scale:1,geometry:{length:19.2,width:28.8}};
const lampCtx={v7WorldToLocal:(net,p)=>({x:p.x-net.x,y:p.y-net.y}),
 v7GoalNets:()=>[netA,netB],
 [String.fromCharCode(36,36)]:()=>[],window:{matchMedia:()=>({matches:false})},
 performance:{now:()=>100},requestAnimationFrame:()=>77,cancelAnimationFrame:()=>{},
 puckStateAt:()=>({pos:{x:100,y:200}}),buildPuckTimeline:()=>({}),ui:{playhead:0}};
vm.runInNewContext(app.slice(liveStart,liveEnd)+
 '\nthis.sync=v7SyncGoalNetOccupancy;this.contains=v7PuckInsideNet;this.active=()=>[...v7GoalFlashes.keys()]',
 lampCtx,{timeout:1500});
assert.equal(lampCtx.contains(netA,{x:100,y:200}),true,"Center net occupancy");
assert.equal(lampCtx.contains(netA,{x:112,y:200}),false,"Puck in front of goal must not blink");
assert.equal(lampCtx.contains(netA,{x:100,y:240}),false,"Puck wide of goal must not blink");
lampCtx.sync({x:100,y:200});
assert.deepEqual(Array.from(lampCtx.active()),["left"],"Left goal should blink while occupied");
lampCtx.sync({x:100,y:200});
assert.deepEqual(Array.from(lampCtx.active()),["left"],"Goal flash must persist until puck leaves");
lampCtx.sync({x:500,y:200});
assert.deepEqual(Array.from(lampCtx.active()),["right"],"Blink must move to the occupied net");
lampCtx.sync({x:250,y:250});
assert.deepEqual(Array.from(lampCtx.active()),[],"Blink must end when puck leaves");

// Both crease profiles must preserve the 6ft radius; NHL has 4.5ft sides.
{
  const a=app.indexOf("function v7CreasePath("),b=app.indexOf("function v7ApplyCreaseProfile(",a);
  assert.ok(a>0&&b>a,"Crease profile geometry missing");
  const ctx={V7_CREASE_RADIUS_UNITS:28.8,round};
  vm.runInNewContext(app.slice(a,b)+"\nthis.path=v7CreasePath;",ctx,{timeout:2000});
  for(const side of ["left","right","half"]){
    assert.ok(ctx.path(side,"nhl").includes(" L"),"NHL crease needs straight sides");
    assert.ok(ctx.path(side,"youth").includes("A28.8 28.8"),"USA/Canada style must use a semicircle");
  }
  assert.ok(app.includes("v7PrepareCreaseStyleUI();"),"Crease profile selector must initialize");
}
// Ice is a first-class persisted dimensioned object, and each official preset
// regenerates line, board, crease, and goal geometry from the same parameters.
{
  const ice=normContext.iceNormalize({});
  assert.equal(ice.id,"rink-surface");assert.equal(ice.type,"ice");
  assert.equal(ice.profile,"nhl","NHL is always the default");
  assert.equal(ice.length,200);assert.equal(ice.width,85);
  assert.equal(ice.corner,28);assert.equal(ice.goalInset,11);
  assert.equal(ice.blueInset,75);assert.equal(ice.faceoffRadius,15);
  assert.equal(ice.show.trapezoid,true);
  const geom=normContext.iceGeometry(ice);
  assert.ok(Math.abs(geom.width/geom.height-200/85)<.00001,"Rink aspect ratio must be true regulation");
  assert.ok(Math.abs(geom.goalLeft-(geom.x+11*geom.scale))<.00001);
  assert.ok(Math.abs(geom.blueLeft-(geom.x+75*geom.scale))<.00001);
  assert.ok(Math.abs(geom.blueRight-(geom.x+125*geom.scale))<.00001);
  const perimeter=normContext.icePerimeter(ice);
  assert.ok(perimeter.length>50,"Rounded corner board path must have sufficient precision");
  assert.ok(normContext.iceCrease("left",ice).includes(" L"),"NHL crease must have straight sides");
  for(const profile of ["usa","canada","iihf"]){
    const x=normContext.iceNormalize({profile});
    assert.equal(x.profile,profile);
    assert.ok(x.length>160&&x.width>72);
    assert.ok(normContext.iceCrease("left",x).includes(" A"),"Each standard uses curved crease");
  }
  const custom=normContext.iceNormalize({profile:"nhl",custom:true,length:190,width:90,corner:25,blueInset:70});
  assert.equal(custom.length,190);assert.equal(custom.width,90);
  assert.equal(custom.corner,25);assert.equal(custom.blueInset,70);
  assert.ok(app.includes('id="v7IceSettingsBtn"'),"Rink editor button missing");
  assert.ok(app.includes('data-v7-ice-model'),"Rink must render as its own object");
  assert.ok(app.includes('v7IcePrepareUI();'),"Rink editor setup missing");
  assert.ok(app.includes('data-ice-key'),"Rink configuration fields missing");
  assert.ok(app.includes('option.ice=v7NormalizeIce('),"Per-variation rink persistence missing");
  assert.ok(app.includes('data-v7-ice-markings'),"Rink markings must be independently drawn");
  assert.ok(app.includes('v60RoundedRinkPerimeter=function(){return v7PuckTravelPerimeter(state.ice)}'),
    "Puck physics must use an inward-offset version of the actual rink outline");
}

/* Approved net artwork: clean-room rebuild and identical master for all three sizes. */
{
 assert.ok(!app.includes("function v7NetPlanGeometry("),"Delete the OLD generated net outline");
 assert.ok(app.includes('v7RenderNHLGoalFromScratch(item,g)'),
    "Rink-object net branch must use the new independent master only");
 assert.ok(app.includes("spec.widthFeet*40/72"),"All goal presets must share reference depth");
 const begin=app.indexOf("function v7RenderNHLGoalFromScratch(item,parent){"),
       end=app.indexOf("function v7EquipmentSvg(item){",begin);
 assert.ok(begin>0&&end>begin,"New dedicated master-net generator missing");
 const el=(tag,attrs={})=>({tag,attrs,children:[],append(...parts){this.children.push(...parts)}});
 const ctx={round:(n,d)=>Number(n.toFixed(d)),svgEl:el,
   performance:{now:()=>77},v7ApplyNetGoalFlash(node,now){node.flashAt=now}};
 vm.runInNewContext(app.slice(begin,end)+"\nthis.draw=v7RenderNHLGoalFromScratch;",ctx,{timeout:2000});
 const walk=node=>[node,...node.children.flatMap(walk)];
 let referencePaths=null;
 for(const [preset,width,length] of [["pro",28.8,16],["medium",19.2,10.67],["little",14.4,8]]){
   const root=el("g"),item={id:"fixture-"+preset,type:"net",netPreset:preset,geometry:{width,length}};
   ctx.draw(item,root);
   assert.equal(root.children.length,1,preset+" must create one master asset");
   const master=root.children[0],nodes=walk(master);
   assert.equal(master.attrs["data-v7-master-goal"],"nhl-approved-2026-11");
   assert.equal(master.attrs["data-v7-net-preset"],preset);
   assert.equal(master.flashAt,77,preset+" must preserve occupied-goal flash");
   const paths=nodes.filter(n=>n.tag==="path").map(n=>n.attrs.d);
   const shell=paths.find(d=>d?.startsWith("M15 99 C7 86"));
   const inner=paths.find(d=>d?.startsWith("M15 99 C22 76"));
   assert.ok(shell&&inner,preset+" must have approved shell and inner arch");
   if(referencePaths){assert.equal(shell,referencePaths[0]);assert.equal(inner,referencePaths[1])}
   else referencePaths=[shell,inner];
   assert.ok(paths.includes("M15 99 H205"),preset+" mouth must be straight");
   assert.ok(paths.includes("M110 7 V47"),preset+" centered rear support must be present");
   assert.ok(nodes.some(n=>n.tag==="clipPath"),preset+" mesh must be clipped");
   assert.ok(nodes.some(n=>n.tag==="pattern"&&n.attrs.patternTransform==="rotate(45)"),
     preset+" must have diamond mesh");
   assert.ok(nodes.some(n=>n.tag==="linearGradient"&&String(n.attrs.id).includes("-pipe")),
     preset+" glossy red frame gradient");
   assert.ok(nodes.some(n=>n.tag==="radialGradient"&&String(n.attrs.id).includes("-post")),
     preset+" rounded red posts");
   assert.equal(nodes.filter(n=>n.attrs["data-v7-net-red"]==="post").length,3,
     preset+" must have 2 posts and 1 central joint");
   assert.ok(nodes.filter(n=>n.attrs["data-v7-net-red"]==="frame").length>=9,
     preset+" must render 3-dimensional layered shell, arch and mouth");
   // Only stroke thickness and post radii changed; the geometry stays identical.
   for(const [d,paint,baseline,name] of [
     [null,"#690913",4.7,"outer"],[inner,"#8e1520",3.2,"inner"],
     ["M15 99 H205","#6f0c15",5.6,"front"],
     ["M110 7 V47","#870c18",5,"support"]]){
     const bar=nodes.find(n=>n.tag==="path"&&n.attrs.stroke===paint&&
       (d?n.attrs.d===d:n.attrs.d?.startsWith("M15 99 C7 86")));
     assert.ok(bar&&Math.abs(bar.attrs["stroke-width"]-baseline*1.4)<.001,
       preset+" "+name+" bar must be 1.4x thicker");
   }
   for(const x of [15,205]){
     const post=nodes.find(n=>n.tag==="circle"&&n.attrs.cx===x&&n.attrs.cy===99&&n.attrs.fill==="#880f1a");
     assert.ok(post&&Math.abs(post.attrs.r-5.3*1.4)<.001,preset+" post radius must be 1.4x");
   }
   const joint=nodes.find(n=>n.tag==="circle"&&n.attrs.cx===110&&n.attrs.cy===47);
   assert.ok(joint&&Math.abs(joint.attrs.r-3*1.4)<.001,preset+" center joint radius must be 1.4x");
   const matrix=master.attrs.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
   assert.ok(Math.abs(matrix[1]-width/190)<.00001,preset+" mouth scaling");
   assert.ok(Math.abs(matrix[2]-length/92)<.00001,preset+" depth scaling");
   assert.ok(Math.abs(99*matrix[2]+matrix[4]-length/2)<.001,
     preset+" must align the mouth with the goal line");
 }
 assert.ok(app.includes('part.getAttribute("data-v7-net-base-opacity")'),
   "Blinking must restore each red tube's original opacity");
}

/* No-forcefield regressions: visual object edge touches the inner board face. */
{
 const widthMatch=app.match(/const V7_ICE_BOARD_STROKE_WIDTH=(\d+(?:\.\d+)?);/);
 assert.ok(widthMatch,"Missing shared paint/physics board thickness");
 const stroke=Number(widthMatch[1]);
 assert.ok(stroke<3.5,"Boards should be slightly thinner");
 assert.ok(!app.includes("V7_ICE_OBJECT_CLEARANCE"));
 assert.ok(app.includes('stroke:ice.colors.boards,"stroke-width":V7_ICE_BOARD_STROKE_WIDTH'));
 assert.ok(app.includes('stroke:"#456171","stroke-width":V7_ICE_BOARD_STROKE_WIDTH'));
 const begin=app.indexOf("/* Board contact is the *painted inside face*");
 const end=app.indexOf("function v7NormalizeOnIceTokens(",begin);
 assert.ok(begin>0&&end>begin);
 const ctx={state:{ice:normContext.iceNormalize({profile:"nhl"}),view:"whole"},
   v7IceGeometry:normContext.iceGeometry,round,clamp,
   v7OnIceSymbolMetrics:u=>({puckRadius:Math.max(1.6,.4*u)}),
   V7_ICE_BOARD_STROKE_WIDTH:stroke};
 vm.runInNewContext(app.slice(begin,end)+
   "\nthis.puckInset=v7PuckBoardInset;this.clampPuck=v7ClampPuckToIce;"+
   "this.clampItem=v7ClampEquipmentToIce;this.itemFits=v7EquipmentFitsIce;"+
   "this.signedDistance=v7IceSignedDistance;",ctx,{timeout:3000});
 const g=normContext.iceGeometry(ctx.state.ice),inset=ctx.puckInset();
 const puck=ctx.clampPuck({x:500,y:g.yBottom+200});
 assert.ok(Math.abs(puck.y-(g.yBottom-inset))<.02,"Puck's outside paint must meet the wall");
 assert.ok(ctx.signedDistance(puck)<=-inset+.01,"Puck must not overlap boards");
 for(const item of [
   {type:"cone",geometry:{radius:6},scale:1,rotation:0},
   {type:"tire",geometry:{radius:9},scale:1.2,rotation:0},
   {type:"puckPile",geometry:{radius:12},scale:1,rotation:0},
   {type:"divider",geometry:{length:58,width:11},scale:1,rotation:35},
   {type:"stick",geometry:{length:42,width:3.5},scale:1,rotation:0},
   {type:"net",geometry:{length:16,width:28.8},scale:1,rotation:0},
   {type:"net",geometry:{length:16,width:28.8},scale:1,rotation:70}
 ]){
   const fixed=ctx.clampItem(item,{x:500,y:g.yBottom+200});
   assert.ok(fixed&&ctx.itemFits(item,fixed),"Object must remain fully on the ice: "+item.type);
   assert.ok(!ctx.itemFits(item,{x:fixed.x,y:fixed.y+.2}),"Object must touch board with no buffer: "+item.type);
   const corner=ctx.clampItem(item,{x:g.x-40,y:g.yBottom+40});
   assert.ok(corner&&ctx.itemFits(item,corner),"Rotated shape must stay inside curved boards: "+item.type);
 }
}


/* Marquee selects player tokens, loose pucks and rink objects; tangential
   projection follows rounded boards and never permits a painted overlap. */
{
 const start=app.indexOf("function v7MultiRadius("),end=app.indexOf("/* A single undoable pivot",start);
 assert.ok(start>0&&end>start,"Grouped selection and board solver must exist");
 assert.ok(app.includes('t.pos.x>=rect.minX&&t.pos.x<=rect.maxX'),"Marquee must include wall-side objects");
 assert.ok(app.includes('v7MultiPivot(drag.snapshot,drag.total*180/Math.PI)'),"Group turn handle must drive shared pivot");
 assert.ok(app.includes('v7MultiPriorRenderFrame(time);v7MultiDraw()'),"Group overlay must redraw with the rink");
 assert.ok(app.includes('if(item.goalSide)item.iceAnchor=false'),"Group turn must release net crease anchoring");
 assert.ok(app.includes('const items=selected; // Default nets can be removed by the group minus, too.'),
 "Marquee minus must include the two default nets");
 assert.ok(app.includes('state.timeline.movements=state.timeline.movements.filter(c=>!players.has(c.playerId))'));
 assert.ok(app.includes('!pucks.has(e.puckId||"puck")'),"Bulk removal must clean puck routes");
 assert.ok(app.includes(".v7-object-handle-line,.v7-multi-overlay,.timeline-player-focus-ring"),
  "Video exports must not show group editor controls");
 const pieces=[
  "const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));",
  "const round=(v,n=3)=>Number(Number(v).toFixed(n));",
  modelSource,app.slice(safeStart,safeEnd),
  "function v7OnIceSymbolMetrics(u){return{skaterDiameter:3*u,goalieWidth:3.6*u,puckRadius:Math.max(1.6,.4*u)}}",
  "const state={ice:v7NormalizeIce({profile:'nhl'}),view:'whole',halfSide:'right'};",
  "function playerById(){return{role:'skater'}}",
  app.slice(start,end),
  "return {slide:v7MultiSlide,penetration:v7MultiPenetration,geometry:v7IceGeometry,state}"
 ];
 const solver=new Function(pieces.join("\n"))();
 const g=solver.geometry(solver.state.ice);
 const samples=[
  {type:"puck",id:"puck",pos:{x:500,y:300}},
  {type:"player",id:"P1",pos:{x:500,y:300}},
  {type:"equipment",id:"cone",item:{type:"cone",geometry:{radius:6},rotation:0,scale:1},pos:{x:500,y:300}},
  {type:"equipment",id:"divider",item:{type:"divider",geometry:{length:58,width:11},rotation:43,scale:1},pos:{x:500,y:300}},
  {type:"equipment",id:"net",item:{type:"net",geometry:{length:16,width:28.8},rotation:70,scale:1},pos:{x:500,y:300}}
 ];
 for(const item of samples){
  const straight=solver.slide(item,{x:620,y:g.yBottom+20});
  assert.ok(straight&&!solver.penetration(item,straight),item.id+" must stay on ice at bottom board");
  assert.ok(Math.abs(straight.x-620)<1,item.id+" must slide along wall without centerward drift");
  const corner=solver.slide(item,{x:g.x-20,y:g.yBottom+20});
  assert.ok(corner&&!solver.penetration(item,corner),item.id+" must remain on ice near rounded corner");
 }
}

/* Regression: marquee groups can be grabbed and moved like Visio selections.
   Rotation and removal remain separate controls, and members stay rigid. */
{
 assert.ok(app.includes('"data-v7-multi-drag":"1"'),"Selected group box must be a drag target");
 assert.ok(app.includes('style:"cursor:move;touch-action:none"'),"Group box must show move cursor");
 assert.ok(app.includes('ui.v7MultiMove={pointerId:e.pointerId'),"Group pointerdown must capture movement");
 assert.ok(app.includes('v7MultiTranslate(moving.snapshot,delta);renderFrame(ui.playhead)'),
  "Drag must update live rink positions from the original selection snapshot");
 assert.ok(app.includes('if(moving.changed){syncActiveVariation();scheduleSave();renderAll()}'),
  "A committed drag must persist its updated play state");
 assert.ok(app.includes('const step=e.shiftKey?10:2'),"Arrow keys must nudge groups");
 assert.ok(app.includes('ui.v7MultiRotate=null;ui.v7MultiMove=null'),
  "Reset must clear active group translation without leaving a ghost drag");
 const a=app.indexOf("function v7MultiConstrainTranslation("),
       b=app.indexOf("function v7MultiDelete(",a);
 assert.ok(a>0&&b>a,"Rigid drag helpers must be present");
 const movement=app.slice(a,b);
 const setup=[
  "const round=(n,places=4)=>Math.round(n*10**places)/10**places;",
  "const state={ice:{},equipment:[{id:'A',type:'cone',x:450,y:280}],onIce:{P1:{x:520,y:300}},",
  "puckStart:{x:590,y:290},additionalPucks:[],timeline:{",
  "movements:[{id:'M1',points:[{x:520,y:300},{x:540,y:315}]}],",
  "puckTakes:[{id:'T1',events:[{id:'E1',from:{x:590,y:290},target:{x:620,y:325},aimVector:{x:1,y:0}}]}]}};",
  "const v7MultiParts=t=>[{x:t.pos.x,y:t.pos.y,r:5}];",
  "const v7IceSignedDistance=p=>Math.hypot(p.x-500,p.y-300)-200;",
  "const v7EquipmentById=id=>state.equipment.find(x=>x.id===id);",
  "const v7AdditionalPuckById=id=>state.additionalPucks.find(x=>x.id===id);",
  "const v7ClampPuckToIce=p=>p,v7MultiSlide=(t,p)=>p;",
  movement,
  "return {state,constrain:v7MultiConstrainTranslation,translate:v7MultiTranslate,ice:v7IceSignedDistance}"
 ].join("\n");
 const editor=new Function(setup)();
 const members=[
  {type:"equipment",id:"A",pos:{x:450,y:280},base:{x:450,y:280},rotation:0},
  {type:"player",id:"P1",pos:{x:520,y:300},base:{x:520,y:300},rotation:0,
   tracks:[{id:"M1",points:[{x:520,y:300},{x:540,y:315}]}]},
  {type:"puck",id:"puck",pos:{x:590,y:290},base:{x:590,y:290},rotation:0,
   routes:[{id:"T1",events:[{id:"E1",from:{x:590,y:290},target:{x:620,y:325}}]}]}
 ];
 const snapshot={members,center:{x:520,y:290}};
 assert.deepEqual(editor.constrain(snapshot,{x:12,y:-8}),{x:12,y:-8},
  "Within the rink, the whole selection must follow the pointer exactly");
 const stopped=editor.constrain(snapshot,{x:999,y:60});
 assert.ok(stopped.x>5&&stopped.x<200&&stopped.y<=60,
  "A whole-group drag must clamp at the board, not move selected tokens separately");
 for(const m of members)assert.ok(editor.ice({
   x:m.pos.x+stopped.x,y:m.pos.y+stopped.y})+5<=.0001,
  "A constrained group must keep each member entirely on the ice");
 const sideways=editor.constrain(snapshot,{x:12,y:999});
 assert.equal(sideways.x,12,"Group should continue sliding horizontally at the boards");
 assert.equal(editor.translate(snapshot,{x:12,y:-8}),true);
 assert.equal(editor.state.equipment[0].x,462);
 assert.equal(editor.state.onIce.P1.y,292);
 assert.equal(editor.state.puckStart.x,602);
 assert.equal(editor.state.timeline.movements[0].points[1].x,552,
  "Existing player skating routes must move with the group");
 assert.equal(editor.state.timeline.puckTakes[0].events[0].target.x,632,
  "Puck targets must move with their puck");
 assert.equal(editor.state.timeline.puckTakes[0].events[0].aimVector.x,1,
  "Translation must not rotate puck aim");
 editor.translate(snapshot,{x:20,y:5});
 assert.equal(editor.state.equipment[0].x,470,
  "Dragging across successive frames must not accumulate position errors");
 assert.equal(editor.state.onIce.P1.x,540);
 assert.equal(editor.state.puckStart.x,610);
}

/* Default goal removal must survive snapshots, reloads and group deletion. */
{
 const left=initial.find(x=>x.goalSide==="left"),right=initial.find(x=>x.goalSide==="right");
 assert.equal(normContext.v7NormalizeEquipmentList([right]).length,1,"Deleted left goal must stay gone");
 assert.equal(normContext.v7NormalizeEquipmentList([left]).length,1,"Deleted right goal must stay gone");
 assert.equal(normContext.v7NormalizeEquipmentList([]).length,0,"Both deleted goals stay deleted");
 assert.ok(app.includes("state.equipment=v7NormalizeEquipmentList(play?.equipment);"),
  "Loading a play must not use existing nets to fill an intentionally empty list");
 const start=app.indexOf("function v7DeleteEquipment("),end=app.indexOf("function v7ResetGoalNet(",start);
 assert.ok(start>0&&end>start);
 const ctx={state:{equipment:[left,right]},ui:{selectedType:"equipment",selectedId:left.id},history:0,saved:0,
  pushHistory:()=>ctx.history++,syncActiveVariation:()=>{},renderAll:()=>{},scheduleSave:()=>ctx.saved++,
  v7EquipmentById:id=>ctx.state.equipment.find(x=>x.id===id)};
 vm.runInNewContext(app.slice(start,end)+"\nthis.deleteNet=v7DeleteEquipment;",ctx,{timeout:1500});
 assert.equal(ctx.deleteNet(left.id),true,"The left original net must be individually removable");
 assert.equal(ctx.state.equipment.length,1);
 assert.equal(ctx.deleteNet(right.id),true,"The right original net must be individually removable");
 assert.equal(ctx.state.equipment.length,0);
 assert.equal(ctx.history,2);assert.equal(ctx.saved,2);
 assert.equal(ctx.deleteNet(left.id),false,"Repeat deletion should be harmless");
 assert.equal(normContext.v7NormalizeEquipmentList(ctx.state.equipment).length,0);
 const a=app.indexOf("function v7MultiDelete("),b=app.indexOf("function v7MultiLayer(",a);
 assert.ok(a>0&&b>a);
 const context={
  state:{equipment:[left,right],onIce:{},timeline:{movements:[],puckTakes:[{events:[]}]},additionalPucks:[],primaryPuckVisible:true},
  ui:{selectedType:null,selectedId:null,v7ActivePuckId:"puck",v60Mode:null,targetMode:null},
  history:0,pushHistory:()=>context.history++,
  v7MultiTokensSelected:()=>[{type:"equipment",id:left.id,item:left},{type:"equipment",id:right.id,item:right}],
  v7MultiClear:()=>{},syncActiveVariation:()=>{},renderAll:()=>{},scheduleSave:()=>{},toast:()=>{}
 };
 vm.runInNewContext(app.slice(a,b)+"\nthis.deleteGroup=v7MultiDelete;",context,{timeout:1500});
 assert.equal(context.deleteGroup(),true,"Group minus must remove default nets");
 assert.equal(context.state.equipment.length,0);assert.equal(context.history,1);
 assert.equal(normContext.v7NormalizeEquipmentList(context.state.equipment).length,0);
}

/* Floating controls must escape the actual bench/stage overflow clipping. */
{
 const floatingStart=app.indexOf("/* V7 GLOBAL FLOATING CONTROLS */");
 const floatingEnd=app.indexOf("\ninit();",floatingStart);
 assert.ok(floatingStart>0&&floatingEnd>floatingStart,"Page-level control portal must exist");
 const src=app.slice(floatingStart,floatingEnd);
 for(const term of [
  'document.body.append(root)',
  'z-index:2147483000;pointer-events:none',
  'cam?.getScreenCTM()',
  'world.setAttribute("transform","matrix("',
  'root.setAttribute("viewBox","0 0 "+window.innerWidth+" "+window.innerHeight)',
  '".v7-rink-remove,.v7-rink-reset,.v7-rink-net-size,.v7-rink-round-size,.v7-rink-duplicate,.v7-rink-dispense-puck"',
  'while(netLayer?.firstChild)world.append(netLayer.firstChild)',
  '.v7-object-handle,.v7-object-handle-line',
  '.v7-multi-arm',
  'world.append(node)',
  'event.preventDefault();event.stopImmediatePropagation();v7FloatingStartGroup(event)',
  'v7FloatingStartEquipment(event)',
  'try{$("#rinkSvg")?.setPointerCapture(event.pointerId)}catch{}',
  'menu.style.position="fixed";menu.style.zIndex="2147483001"',
  'document.body.append(menu)',
  'element===menu?v7FloatingPlaceMenu(element,anchor,options)',
  'if(top<8){top=bottomEdge+clearance;menu.classList.add("below")}',
  'v7FloatingOldMultiDraw();',
  'new ResizeObserver(refresh)'
 ])assert.ok(src.includes(term),"Floating control regression: "+term);
 assert.ok(app.includes('const item=v7EquipmentById(transform.id);if(!item)return;const p=v7MultiWorldPoint(event);'),
  "Rotating above boards must use unclipped world pointer coordinates");
 assert.ok(src.includes('const snapshot=v7MultiSnapshot();if(!snapshot)return false;'),
  "Group turn must retain original center and member positions");
 assert.ok(src.includes('if(action==="move"&&ui.selectedType==="player")')&&
  src.includes('else if(action==="pass")v60StartPass()'),
  "Portaled player/puck action menu must retain its original actions");
}

/* Material-resolved shot physics: impact normals, energy and preview parity. */
{
 const sourceStart=app.indexOf("function v7ShotImpactVelocity(");
 const sourceEnd=app.indexOf('buildPuckTimeline=function(puckId="puck"){',sourceStart);
 assert.ok(sourceStart>0&&sourceEnd>sourceStart,"Shared shot physics missing");
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const lineLength=pts=>pts.slice(1).reduce((n,p,i)=>n+dist(p,pts[i]),0);
 const at=(pts,f)=>{
  const total=lineLength(pts),target=Math.max(0,Math.min(1,f))*total;
  let passed=0;
  for(let i=1;i<pts.length;i++){
   const segment=dist(pts[i-1],pts[i]);
   if(passed+segment>=target||i===pts.length-1){
    const u=segment?Math.max(0,Math.min(1,(target-passed)/segment)):0;
    return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*u,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*u}
   }
   passed+=segment
  }
  return pts[0]
 };
 const world=(item,p)=>{
  const x=p.x-item.x,y=p.y-item.y,a=-(item.rotation||0)*Math.PI/180;
  return{x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)}
 };
 const turn=(p,deg)=>{
  const a=(deg||0)*Math.PI/180;
  return{x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)}
 };
 const ctx={
  state:{equipment:[]},
  V7_RINK_OBJECT_TYPES:{cone:{shape:"circle"},tire:{shape:"ring"},
   bumper:{shape:"capsule"},divider:{shape:"capsule"},rebounder:{shape:"rebounder"},pad:{shape:"capsule"}},
  V7_PUCK_RADIUS:2.8,
  round:(n,d=2)=>Number(n.toFixed(d)),clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),
  dist,polylineLength:lineLength,
  pointAtPolyline:at,slicePolylineByProgress:(p,a,b)=>[at(p,a),at(p,b)],
  pointLerp:(a,b,u)=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u}),
  lerp:(a,b,u)=>a+(b-a)*u,
  v7WorldToLocal:world,v7RotatePoint:turn,
  v7ClosestPointSegment:(p,a,b)=>{
   const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy||1;
   const u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d));
   return{x:a.x+u*dx,y:a.y+u*dy,t:u}
  },
  v7ClampPuckToIce:p=>p,
  v7ContactProgress:()=>null
 };
 ctx.v60BuildShotPath=(start,aim,power,override=null)=>{
  const dx=aim.x-start.x,dy=aim.y-start.y,m=Math.hypot(dx,dy)||1;
  const direction={x:dx/m,y:dy/m},distance=override??300;
  const end={x:start.x+direction.x*distance,y:start.y+direction.y*distance};
  return{path:[start,end],direction,goal:false,netId:null,
   boardFollow:false,contacts:[],distance}
 };
 const sourceCollision=app.slice(app.indexOf("function v7EquipmentCollisionAt("),
   app.indexOf("/* Detect physical objects crossed",app.indexOf("function v7EquipmentCollisionAt(")));
 vm.runInNewContext(sourceCollision,ctx,{timeout:3000});
 ctx.firstCollisionOnPath=(pts,t0,t1,_ignore,options)=>
  options.includeObjects?ctx.v7FirstEquipmentCollisionOnPath(pts,t0,t1,false):null;
 vm.runInNewContext(app.slice(sourceStart,sourceEnd)+
  "\nthis.solve=v7PhysicalShotTrajectory;this.impact=v7ShotImpactVelocity;this.motion=v7ShotMotionProgress;",ctx,{timeout:3000});
 const start={x:100,y:300},aim={x:500,y:300},run=item=>{
  ctx.state.equipment=[item];
  return ctx.solve(start,aim,7,{time:0,ignoreDefense:true,ignoreObjects:false})
 };
 const cone=run({id:"cone",type:"cone",x:170,y:300,rotation:0,scale:1,
  geometry:{radius:5.6},physics:{collidable:true}});
 const tire=run({id:"tire",type:"tire",x:170,y:300,rotation:0,scale:1,
  geometry:{radius:10.5},physics:{collidable:true}});
 const bumper=run({id:"bumper",type:"bumper",x:170,y:300,rotation:0,scale:1,
  geometry:{length:34,width:10},physics:{collidable:true}});
 const divider=run({id:"divider",type:"divider",x:170,y:300,rotation:0,scale:1,
  geometry:{length:34,width:10},physics:{collidable:true}});
 const rebounder=run({id:"rebounder",type:"rebounder",x:170,y:300,rotation:0,scale:1,
  geometry:{length:34,width:9},physics:{collidable:true}});
 for(const [name,result] of [["cone",cone],["tire",tire],["bumper",bumper],
   ["divider",divider],["rebounder",rebounder]]){
  assert.equal(result.collisions[0]?.type,name,name+" must have a resolved contact");
  assert.ok(result.path.at(-1).x<result.collisions[0].point.x,
    name+" must rebound to the correct side for a head-on shot");
  assert.ok(result.motionProfile?.length>1,name+" must carry physically weighted timing")
 }
 const reboundTravel=r=>Math.abs(r.path.at(-1).x-r.collisions[0].point.x);
 assert.ok(reboundTravel(cone)<reboundTravel(tire),"Cone must absorb much more energy than tire");
 assert.ok(reboundTravel(divider)<reboundTravel(bumper),"Divider must deaden more than bumper");
 assert.ok(reboundTravel(tire)<reboundTravel(rebounder),"Rebounder must return more energy than tire");
 const glancing=ctx.impact({x:1,y:0},{kind:"object",type:"tire",normal:{x:-.6,y:-.8}});
 assert.ok(glancing.direction.x>0&&glancing.direction.y<0,
  "Oblique tire contact must retain its tangential direction, not reverse the entire shot");
 const normal=ctx.impact({x:1,y:0},{kind:"object",type:"tire",normal:{x:-1,y:0}});
 assert.ok(normal.direction.x<0&&normal.speedFraction>.45&&normal.speedFraction<.7,
  "Head-on tire restitution must reverse normal motion and reduce speed");
 assert.ok(ctx.motion(tire.motionProfile,.5)>=0&&ctx.motion(tire.motionProfile,.5)<=1);
 const bypass=ctx.solve(start,aim,7,{time:0,ignoreDefense:true,ignoreObjects:true});
 assert.equal(bypass.collisions.length,0,"Ignoring objects must bypass them entirely");
 assert.equal(bypass.path.at(-1).x,400,"Unobstructed shot keeps initial glide distance");
 for(const needle of [
  "v7PhysicalShotTrajectory(origin,aim,mode.power",
  "v7PhysicalShotTrajectory(origin,mode.aim,mode.power",
  "v7PhysicalShotTrajectory(start,directedAim,power",
  "motionProfile:physical?.motionProfile||null"
 ]) assert.ok(app.includes(needle),"Preview/runtime trajectory integration missing: "+needle);
 const capture=app.slice(app.indexOf('const onRinkPointerDownV510ForV60='),
  app.indexOf('const onRinkPointerMoveV510ForV60=',app.indexOf('const onRinkPointerDownV510ForV60=')));
 assert.ok(capture.includes('event.stopImmediatePropagation()')&&capture.includes('ui.pendingTap=null'),
  "Pass targeting must consume the equipment click before its selection handler");
}

/* Full power-stage prediction must match the saved physics path.
   Window repositioning must not be overwritten by frame re-renders. */
assert.ok(app.includes('else{const built=v7PhysicalShotTrajectory(origin,mode.aim,mode.power,{time:ui.playhead'),
 "Shot preview must use the same equipment-aware solver as playback");
assert.ok(app.includes("const separation=Math.max(3.6,V7_PUCK_RADIUS*1.3)"),
 "Rebounds must separate from the impacted object's collision hull");
assert.ok(app.includes("/* V7 DRAGGABLE POPUPS:"),"Shot dialog drag controls missing");
assert.ok(app.includes("ui.v7ShotPanelPosition={left:x,top:y}"),"Shot popup must retain its dragged coordinates");
assert.ok(app.includes('dialog .dialog-head'),"Modal headings must be draggable");


/* New picker art, consistent clone/remove semantics, and persisted length. */
{
 const start=app.indexOf("/* V7 UNIVERSAL RINK OBJECT PICKER AND CLONE CONTROLS */");
 assert.ok(start>0,"Universal controls upgrade missing");
 const updated=app.slice(start);
 for(const needle of [
   "function v7EquipmentThumbnail(type,preset=null,serial=0)",
   "v7EquipmentSvg(item)",
   "choice.prepend(v7EquipmentThumbnail(type,preset,i))",
   "function v7DuplicateEquipmentExact(id)",
   "v7DuplicateRound=function(id){return v7DuplicateEquipmentExact(id)}",
   "goalSide:null,iceAnchor:false",
   "v7NormalizeEquipmentItem({",
   "v7CloneEquipmentFits(copy,point)",
   /* Removed old late override that hid the small +. */
   'class:"v7-puck-clone"',
   "function v7DuplicatePuckExact(id)",
   "v7InstallUniversalPuckButtons();"
 ])assert.ok(updated.includes(needle),"V7 picker/clone regression: "+needle);
 assert.ok(!updated.includes("v7PuckPileDispenserBeforeClone"),"No late dispenser decorator");
 for(const type of ["divider","pad","rebounder"]){
   const config=app.slice(app.indexOf("const V7_RINK_OBJECT_TYPES="),app.indexOf("const V7_EQUIPMENT_TYPES="));
   assert.match(config,new RegExp(type+":[\\s\\S]*?capabilities:\\{rotatable:true,resize:\"length\""),type+" must rotate and stretch");
 }
 assert.ok(app.includes('if(item.capabilities?.rotatable&&item.type!=="net")'));
 assert.ok(app.includes('if(resize==="length")'));
}


/* Route notation must remain independent of puck collisions. */
{
 const start=app.indexOf("/* V7 DRILL MOVEMENT NOTATION AND SMOOTH SKATING");
 assert.ok(start>0,"Skating notation upgrade missing");
 const scope=app.slice(start);
 for(const key of ["forward","backward","lateral","carry","crossover","stop"])
   assert.ok(scope.includes(key+':{label:'),"Missing movement type "+key);
 for(const phrase of [
   'v7SkatingSmoothPoints(raw)',
   'playerPositionAt=function(playerId,time)',
   'v7PaintSkatingRoute(group,shown,v7ClipMovementKind(clip),color)',
   'v7RenderRoutesBeforeSkating(time)',
   'v7PlayerPossessesPuck(playerId,startTime)',
   'button.disabled=type==="carry"&&!hasPuck',
   'clip.movementNotation=type',
   'clip.semanticAction=V7_DRILL_MOVES[type].semantic',
   'rec.movementNotation||ui.v7PendingMoveNotation',
   'v7SkatingClipPoints(clip)',
   'ui.v7PendingMoveNotation=type'
 ])assert.ok(scope.includes(phrase),"Missing movement integration: "+phrase);
 const a=app.indexOf("const V7_DRILL_MOVES=",start),b=app.indexOf("const v7RenderRoutesBeforeSkating=",a);
 assert.ok(a>0&&b>a);
 const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
 const length=pts=>pts.slice(1).reduce((v,p,i)=>v+distance(p,pts[i]),0);
 const point=(pts,p)=>{
   let left=Math.max(0,Math.min(1,p))*length(pts);
   for(let i=1;i<pts.length;i++){
     const d=distance(pts[i-1],pts[i]);
     if(left<=d||i===pts.length-1){
       const f=d?Math.max(0,Math.min(1,left/d)):0;
       return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*f,
         y:pts[i-1].y+(pts[i].y-pts[i-1].y)*f}
     }
     left-=d
   }
   return pts[0]
 };
 const ctx={dist:distance,polylineLength:length,pointAtPolyline:point,
   clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),
   playerPositionAt:()=>{},movementClipsFor:()=>[],
   state:{onIce:{A:{x:0,y:0}}}};
 vm.runInNewContext(app.slice(a,b)+"\nthis.smooth=v7SkatingSmoothPoints;",ctx,{timeout:2000});
 const trace=[{x:0,y:0},{x:10,y:2},{x:22,y:-3},{x:36,y:5},{x:55,y:0}];
 const smooth=ctx.smooth(trace);
 assert.ok(smooth.length>5,"Curve must be sampled smoothly");
 assert.equal(smooth[0].x,0);assert.equal(smooth[0].y,0);
 assert.equal(smooth.at(-1).x,55);assert.equal(smooth.at(-1).y,0);
 assert.ok(smooth.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
}


/* Trace the player's actual cursor pace and preserve the original coaching
   legend: backward arches versus broad puck-carry waves. */
{
 const start=app.indexOf("/* V7 DRILL MOVEMENT NOTATION AND SMOOTH SKATING");
 const a=app.indexOf("const V7_DRILL_MOVES=",start),b=app.indexOf("const v7RenderRoutesBeforeSkating=",a);
 assert.ok(start>0&&a>start&&b>a);
 const section=app.slice(a,b);
 for(const str of [
  "function v7RecordedMovementProgress(",
  "function v7BuildRecordedTraceTiming(",
  "function v7SkatingLinkedArches(",
  "function v7PaintSkatingRoute(",
  'type==="backward"',
  'type==="crossover"',
  'v7AppendFilledDrillArrow(',
  'type==="lateral"',
  'type==="carry"'
 ])assert.ok(section.includes(str),"Movement regression: "+str);
 const extra=app.slice(b);
 for(const str of [
  'ui.v7PendingRecordedTrace',
  'const tracedDuration=clamp(actual,.05,',
  'v7PointerDownBeforeTraceTiming=onRinkPointerDown',
  'v7PointerMoveBeforeTraceTiming=onRinkPointerMove',
  'rec.traceTimes.push(',
  'v7RecordedMovementProgress(clip,time)',
  'trimMovementClip=function(clip,start,end)',
  'if(timing)clip.traceTiming=timing',
  'const duration=optimized?',
  'v7OptimizedSkateDuration({start:time,points:payload.points||[],duration:tracedDuration})'
 ])assert.ok(extra.includes(str),"Missing timing capture/integration: "+str);
 assert.ok(!extra.includes("distance/108"),"Movement speed must not be imposed by path length");
 const dist=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
 const length=points=>points.slice(1).reduce((s,p,i)=>s+dist(points[i],p),0);
 const pointAt=(pts,f)=>{
  let left=Math.min(1,Math.max(0,f))*length(pts);
  for(let i=1;i<pts.length;i++){
   const d=dist(pts[i-1],pts[i]);
   if(left<=d||i===pts.length-1){
    const t=d?Math.max(0,Math.min(1,left/d)):0;
    return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t}
   }
   left-=d
  }
  return pts[0]
 };
 const ctx={
  dist,polylineLength:length,pointAtPolyline:pointAt,
  clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),
  round:(n,d=2)=>Number(Number(n).toFixed(d)),
  pathD:pts=>pts.map((p,i)=>(i?"L":"M")+p.x+" "+p.y).join(" "),
  svgEl:(tag,attrs)=>({tag,attrs}),
  playerPositionAt:()=>{},movementClipsFor:()=>[],
  v7OptimizedMovementOn:()=>false,
  state:{onIce:{A:{x:0,y:0}}}
 };
 vm.runInNewContext(section+
  "\nthis.traceTiming=v7BuildRecordedTraceTiming;this.pace=v7RecordedMovementProgress;"+
  "this.paint=v7PaintSkatingRoute;this.linked=v7SkatingLinkedArches;"+
  "this.moveKeys=Object.keys(V7_DRILL_MOVES);",ctx,{timeout:3000});
 assert.equal(Array.from(ctx.moveKeys).join(","),
  "forward,backward,lateral,carry,crossover,stop",
  "Menu must offer exactly the six pictured movement symbols");
 const route=[{x:0,y:0},{x:20,y:0},{x:40,y:0},{x:60,y:0}];
 const timing=ctx.traceTiming(route,[0,.1,.5,1.5],1.5);
 assert.equal(timing.length,4,"Each traced segment retains its recorded time");
 const clip={start:0,duration:1.5,traceTiming:timing};
 assert.ok(Math.abs(ctx.pace(clip,.1)-1/3)<.002);
 assert.ok(Math.abs(ctx.pace(clip,.5)-2/3)<.002);
 assert.equal(ctx.pace(clip,1.5),1);
 assert.ok(Math.abs(ctx.pace({start:0,duration:1.5},.5)-1/3)<.002,
  "Untimed legacy plays must remain playable");
 const shorthand=[{x:0,y:0},{x:100,y:0}];
 const run=kind=>{
  const nodes=[];
  ctx.paint({append:n=>nodes.push(n)},shorthand,kind,"#111111");
  return{nodes,main:nodes.find(n=>n.attrs["data-v7-skate-kind"]===kind),
   arrows:nodes.filter(n=>n.attrs["data-v7-skate-arrow"])}
 };
 const forward=run("forward");
 assert.equal(forward.arrows.length,1,"Forward skating requires an arrow");
 assert.equal(forward.arrows[0].attrs.fill,"#111111");
 assert.match(forward.arrows[0].attrs.d,/ Z$/,"Forward arrowhead must be filled");

 // Arrowhead is prominent relative to a thinner shaft, with translucent fill
 // and a small dark edge; not the old tiny triangular tip.
 const arrow=forward.arrows[0].attrs;
 const vertex=[...arrow.d.matchAll(/[ML](-?[0-9.]+) (-?[0-9.]+)/g)].map(m=>({x:+m[1],y:+m[2]}));
 assert.equal(vertex.length,3,"Arrowhead must be a triangle");
 const tip=vertex[0],l=vertex[1],r=vertex[2],center={x:(l.x+r.x)/2,y:(l.y+r.y)/2};
 const headLength=Math.hypot(tip.x-center.x,tip.y-center.y),headWidth=Math.hypot(l.x-r.x,l.y-r.y);
 assert.ok(headLength>=9&&headLength<=12,"Arrowhead must be visible but no longer oversized");
 assert.ok(headWidth>=7&&headWidth<=11,"Arrowhead must be narrower than the player");
 assert.ok(headLength<14.4&&headWidth<14.4,"Arrowhead must be smaller than skater token");
 assert.equal(arrow["fill-opacity"],.94,"Arrowhead must be visibly solid");
 assert.equal(arrow["stroke-width"],.65,"Arrowhead needs a subtle contrasting outline");
 assert.equal(forward.main.attrs["stroke-width"],2.16,"Forward colored line must be exactly 80% of old width");
 assert.equal(forward.main.attrs["stroke-opacity"],.84,"Forward route must be slightly transparent");
 assert.equal(forward.nodes[0].attrs["stroke-width"],3.2,"Dark underlay must also be 80% width");
 assert.equal(forward.nodes[0].attrs["stroke-opacity"],.64,"Dark underlay must be translucent");
 const previewNodes=[];
 ctx.paint({append:n=>previewNodes.push(n)},shorthand,"forward","#111111",{preview:true});
 const previewLine=previewNodes.find(n=>n.attrs["data-v7-skate-kind"]==="forward");
 assert.equal(previewNodes[0].attrs["stroke-width"],2.88,"Preview underlay width must also be 80%");
 assert.equal(previewLine.attrs["stroke-width"],1.84,"Preview colored line width must also be 80%");
 assert.equal(previewLine.attrs["stroke-opacity"],.88,"Preview route must be slightly transparent");

 // Regression against the supplied interlocking-arch reference:
 // upper and lower semi-circles overlap by 50% in the direction of travel.
 const glyphSegments=ctx.linked(shorthand).match(/M[^M]+/g)||[];
 assert.ok(glyphSegments.length>=8&&glyphSegments.length%2===0,
  "Backward route must consist of separate alternating upper/lower curls");
 const coords=segment=>(segment.match(/-?[0-9]+(?:[.][0-9]+)?/g)||[]).map(Number);
 const a0=coords(glyphSegments[0]),b0=coords(glyphSegments[1]),a1=coords(glyphSegments[2]);
 assert.equal(a0.length,14,"Each curl must consist of two smooth cubic quarter-arcs");
 assert.ok(a0[7]<0&&b0[7]>0&&a1[7]<0,
  "Curls must alternately bow above and below the traced centerline");
 assert.ok(Math.abs(a0[1])<.01&&Math.abs(a0[13])<.01&&
  Math.abs(b0[1])<.01&&Math.abs(b0[13])<.01,
  "Every semicircle starts and ends precisely on the traced centerline");
 assert.ok(Math.abs(a0[12]-(b0[0]+b0[12])/2)<.04,
  "An upper semicircle must end at the horizontal midpoint of the next lower one");
 assert.ok(Math.abs(b0[12]-(a1[0]+a1[12])/2)<.04,
  "A lower semicircle must end at the horizontal midpoint of the next upper one");
 assert.ok(Math.abs(coords(glyphSegments.at(-1)).at(-2)-100)<.02,
  "All curls must stay inside the traced route without overshooting its endpoint");
 const backward=run("backward");
 assert.equal(backward.arrows.length,0,"Backward skating has no arrow");
 assert.ok((backward.main?.attrs.d.match(/M/g)||[]).length>=4 &&
  (backward.main.attrs.d.match(/ C/g)||[]).length>=8,
  "Backward skating needs several hooked alternating half-arches");
 const lateral=run("lateral");
 assert.equal(lateral.arrows.length,1,"Lateral crossovers require an arrow");
 assert.ok(lateral.main.attrs.d.startsWith("M0 0 L100 0"),
  "Lateral crossovers require a continuous shaft");
 assert.ok(lateral.nodes.filter(n=>n.attrs["data-v7-lateral-tick"]).length>=4,
  "Lateral crossovers require spaced perpendicular bars");
 const carry=run("carry");
 assert.equal(carry.arrows.length,1,"Stickhandling wave requires an arrow");
 assert.ok((carry.main?.attrs.d.match(/L/g)||[]).length>30 &&
  carry.main.attrs.d!==forward.main.attrs.d,
  "Stickhandling is one continuous smooth wave");
 const cross=run("crossover");
 assert.equal(cross.arrows.length,0,"Backward crossovers have no arrow");
 assert.ok((cross.main?.attrs.d.match(/L/g)||[]).length>=6,
  "Backward crossovers must be an angular zigzag");
 const y=[...cross.main.attrs.d.matchAll(/[ML](-?[0-9.]+) (-?[0-9.]+)/g)].map(m=>+m[2]);
 assert.ok(y.length>=7&&y.every((v,i)=>i===0||v*y[i-1]<0),
  "Backward crossovers need alternating sharp positive/negative peaks");
 // All six symbols, including their crossbars and curled segments,
 // get the same 20% weight reduction and translucency.
 for(const kind of ["forward","backward","lateral","carry","crossover","stop"]){
  const glyph=run(kind);
  assert.equal(glyph.main.attrs["stroke-width"],2.16,kind+" colored route thickness");
  assert.equal(glyph.main.attrs["stroke-opacity"],.84,kind+" route opacity");
 }
 assert.equal(run("lateral").nodes.find(n=>n.attrs["data-v7-lateral-tick"]).attrs["stroke-width"],2.0);
 assert.equal(run("stop").nodes.find(n=>n.attrs["data-v7-stop-bar"]).attrs["stroke-width"],2.24);
 const stop=run("stop");
 assert.equal(stop.arrows.length,0,"Sudden stop has no arrow");
 assert.equal(stop.nodes.filter(n=>n.attrs["data-v7-stop-bar"]).length,2,
  "Sudden stop must end in two perpendicular bars");

}

/* Regression: puck menu alignment and aim-click capture safety. */
{
 const s=app.indexOf("function v60AnchorElement(){"),e=app.indexOf("function v60PlaceFloating(",s);
 assert.ok(app.slice(s,e).includes('if(ui.selectedType==="puck")return $("#puckLayer [data-puck]");'),
  "Primary puck menu should use full outer puck as anchor");
 const p0=app.indexOf("function v7PuckActionAnchor(){"),p1=app.indexOf("function v7RefreshAddPuckButton()",p0);
 assert.ok(app.slice(p0,p1).includes('return $("#puckLayer [data-puck]")'),
  "Puck 1 must anchor like added pucks");
 assert.ok(!app.includes('data-v60-action="remove-puck"'),"Redundant HTML minus next to Shoot must be removed");
 assert.ok(app.includes('remove.classList.add("v7-puck-remove")'),
  "Keep the existing on-ice puck minus");
 assert.ok(app.includes("at(-31,34)")&&app.includes("at(31,34)"),
  "On-ice plus/minus must clear the selected-puck ring");
 const posStart=app.indexOf("function v7FloatingPlaceMenu("),posEnd=app.indexOf("function v7FloatingInstall(",posStart);
 const placement={ui:{selectedType:"puck"},window:{innerWidth:500,innerHeight:500},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),round:(v,d=1)=>Math.round(v*10**d)/10**d};
 vm.runInNewContext(app.slice(posStart,posEnd)+"\nthis.place=v7FloatingPlaceMenu;",placement,{timeout:1500});
 const menu={hidden:true,offsetWidth:150,offsetHeight:40,style:{},classList:{add(){},remove(){}}};
 const anchor={getBoundingClientRect:()=>({left:200,top:120,bottom:160,width:40,height:40})};
 assert.equal(placement.place(menu,anchor,{gap:12}),true);
 assert.ok(parseFloat(menu.style.top)+menu.offsetHeight<=104,
  "Puck 1 Pass/Shoot buttons must clear selection ring by at least 16px");
 const start=app.indexOf("function v7SetupEquipmentEvents(){"),end=app.indexOf("/* Shot collision options",start);
 assert.ok(start>0&&end>start);
 const listeners={},svg={dataset:{},addEventListener:(type,fn,capture)=>(listeners[type]??=[]).push({fn,capture})};
 let passTarget=null,consumed=0,selected=0;
 const ui={v60Mode:{type:"shot",stage:"aim"},tool:"select",selectedType:"puck",selectedId:"puck"};
 const context={
  $:sel=>sel==="#rinkSvg"?svg:null,ui,window:{addEventListener(){}},document:{activeElement:null},
  svgPoint:()=>({x:170,y:300}),v60CommitPassToPoint:p=>{passTarget=p},
  v7EquipmentById:()=>{selected++;return{id:"tire",x:170,y:300}}
 };
 vm.runInNewContext(app.slice(start,end)+"\nthis.setup=v7SetupEquipmentEvents;",context,{timeout:1500});
 context.setup();
 const target={closest:sel=>sel==="[data-equipment-id]"?{dataset:{equipmentId:"tire"}}:null};
 const event={button:0,target,pointerId:17,preventDefault(){},stopImmediatePropagation(){consumed++}};
 const capture=listeners.pointerdown.find(x=>x.capture).fn;
 capture(event);
 assert.equal(selected,0,"Shooting at tire must not select tire");
 assert.equal(ui.selectedType,"puck","Shot target must keep original puck selected");
 assert.equal(ui.v7EquipmentDrag,undefined,"Shot target must not start an equipment drag");
 ui.v60Mode={type:"pass"};capture(event);
 assert.equal(passTarget?.x,170,"Passing to tire center must use exact click target");
 assert.equal(selected,0,"Passing to tire must not select tire");
 assert.equal(consumed,1,"Passing to tire must consume equipment pointerdown");
 assert.ok(app.includes('event.preventDefault();event.stopImmediatePropagation();if(ui.v60Mode.stage!=="aim")return;'),
  "Shot pointerdown must prevent later SVG selection listeners");
}

/* Player-movement setting must honor traced timing by default and use
   uniform real-ice pace when requested, without losing Skate time overrides. */
{
 assert.ok(app.includes('id="playerMovementSettingsCard"><h3>Player Movement</h3>'),
  "Optimized Player Movement needs an independently named settings card");
 assert.ok(app.includes('id="centerLogoSettingsCard"><h3>Center-Ice Logo</h3>'),
  "Center-ice settings must keep its own heading");
 const translateStart=app.indexOf("function applyStaticTranslations(){");
 const translateEnd=app.indexOf("function ",translateStart+11);
 const translation=app.slice(translateStart,translateEnd>translateStart?translateEnd:translateStart+12000);
 assert.ok(translation.includes('["#centerLogoSettingsCard h3","centerLogo"]'));
 assert.ok(translation.includes('const centerHelp=$("#centerLogoSettingsCard p.help");'));
 assert.ok(!translation.includes("#tab-settings .section-card:nth-of-type(3)"),
  "Positional logo localization overwrites movement heading/help");
 assert.ok(app.includes('id="optimizedPlayerMovement" type="checkbox"'));
 assert.ok(app.includes('optimizedPlayerMovement:false'));
 assert.ok(app.includes('optimizedCheckbox.checked=state.display.optimizedPlayerMovement===true'));
 assert.ok(app.includes('$("#optimizedPlayerMovement")?.addEventListener("change",event=>v7SetOptimizedPlayerMovement(event.target.checked))'));
 assert.ok(app.includes('if(v7OptimizedMovementOn())return f;'));
 assert.ok(app.includes('v7RememberSkateDuration(clip);v61UpdateRangeReadouts(event.target);'));
 assert.ok(app.includes('v7BuildRecordedTraceTiming(payload.points,trace.times,tracedDuration)'));
 const a=app.indexOf("const V7_OPTIMIZED_SKATE_FPS="),b=app.indexOf("const v7CommitBeforeSkating=",a);
 const p=app.indexOf("function v7RecordedMovementProgress("),q=app.indexOf("function v7BuildRecordedTraceTiming(",p);
 assert.ok(a>0&&b>a&&p>0&&q>p,"Optimized movement engine must exist");
 const ctx={
  state:{display:{optimizedPlayerMovement:false},ice:{},timeline:{duration:12,movements:[]},variations:[],activeVariationId:"o"},
  v7SkatingClipPoints:clip=>clip.points,
  v7IceGeometry:ice=>({scale:ice?.scale||4.8}),
  polylineLength:pts=>pts.slice(1).reduce((sum,pt,i)=>sum+Math.hypot(pt.x-pts[i].x,pt.y-pts[i].y),0),
  round,clamp,pushHistory:()=>{},stopPlayback:()=>{},syncActiveVariation:()=>{},renderAll:()=>{},scheduleSave:()=>{}
 };
 vm.runInNewContext(app.slice(a,b)+app.slice(p,q)+
  "\nthis.duration=v7OptimizedSkateDuration;this.retime=v7RetimingClips;this.remember=v7RememberSkateDuration;this.progress=v7RecordedMovementProgress;this.toggle=v7SetOptimizedPlayerMovement;",ctx,{timeout:2500});
 const aRoute={id:"a",playerId:"A",start:0,duration:5,points:[{x:0,y:0},{x:134.4,y:0}],
   traceTiming:[{t:0,p:0},{t:.5,p:.1},{t:1,p:1}]};
 const bRoute={id:"b",playerId:"B",start:0,duration:1,points:[{x:0,y:0},{x:134.4,y:0}]};
 ctx.state.timeline.movements=[aRoute,bRoute];
 assert.equal(ctx.duration(aRoute),2,"134.4 rink units must take 2s at 14ft/s");
 assert.equal(ctx.progress(aRoute,2.5),.1,"Traced mode preserves the hand-timed speed curve");
 ctx.toggle(true);
 assert.equal(ctx.state.display.optimizedPlayerMovement,true);
 assert.equal(aRoute.duration,2);assert.equal(bRoute.duration,2);
 assert.equal(ctx.progress(aRoute,1),.5,"Optimized route travels half the distance at half time");
 aRoute.duration=3.2;ctx.remember(aRoute);
 ctx.toggle(false);
 assert.equal(aRoute.duration,5);assert.equal(bRoute.duration,1);
 assert.equal(ctx.progress(aRoute,2.5),.1,"Turning off restores saved trace-speed curve");
 ctx.toggle(true);
 assert.equal(aRoute.duration,3.2,"Skate time slider override should survive disabling and re-enabling");
 assert.equal(bRoute.duration,2,"Other skaters should retain same game-like speed");
 assert.equal(ctx.duration({...aRoute,points:[{x:0,y:0},{x:134.4,y:0}]},{scale:2.4}),4,
  "Pace must scale with the selected ice dimensions");
}
/* Player color editor must be independent of the shared marker picker, and
   new number ink must persist through roster render, reopen and team reset. */
{
 const start=app.indexOf('<dialog id="v7PlayerColorDialog"'),end=app.indexOf('<dialog id="colorDialog"',start);
 assert.ok(start>0&&end>start,"Dedicated player-color dialog is missing");
 const dialog=app.slice(start,end);
 for(const marker of ['data-v7pc-slot="primary"','data-v7pc-slot="trim"','data-v7pc-slot="numbers"',
  'data-v7pc-method="grid"','data-v7pc-method="spectrum"','data-v7pc-method="sliders"',
  'id="v7pcIceToken"','id="v7pcReset"','id="v7pcCancel"','id="v7pcApply"'])
  assert.ok(dialog.includes(marker),"Player-color dialog missing "+marker);
 assert.ok(!/markerWidth|LINE PATTERN|ARROW ENDING|data-v61-marker/.test(dialog));
 assert.ok(!app.includes('v7pcBenchToken'),"Obsolete bench thumbnail must not be referenced");
 assert.ok(!dialog.includes('v7pc-token bench'),"No misleading Bench preview in color dialog");
 assert.equal((dialog.match(/class="v7pc-mini"/g)||[]).length,1,"Only the on-ice preview should remain");
 assert.ok(app.includes('if(target?.type==="player")return v7OpenPlayerColorDialog(target.id)'));
 assert.ok(app.includes('p.primaryOverride=null;p.trimOverride=null;p.numberOverride=null;'));
 assert.equal((app.match(/fill:colors\.numbers/g)||[]).length,2,
  "Goalie and skater SVG number fills must use number color");
 assert.ok(app.includes('tok.style.setProperty("--piece-ink",c.numbers)'));
 assert.ok(app.includes('--piece-ink:${c.numbers}'));
 assert.ok(app.includes('numberOverride:null,glow:'));
 const colorStart=app.indexOf('function playerColors(player)'),colorEnd=app.indexOf('function rosterSort(',colorStart);
 const editorStart=app.indexOf('function v7pcHexColor('),editorEnd=app.indexOf('function v7pcChange(',editorStart);
 assert.ok(colorStart>0&&colorEnd>colorStart&&editorStart>0&&editorEnd>editorStart);
 const team={id:"A",primary:"#00FC05",trim:"#000000"};
 const ctx={teamById:()=>team,contrastText:hex=>/^#(?:ffffff|00fc05)$/i.test(hex)?"#08131e":"#ffffff"};
 vm.runInNewContext(app.slice(colorStart,colorEnd)+"\n"+app.slice(editorStart,editorEnd)+
  "\nthis.colors=playerColors;this.draft=v7pcDraft;this.choose=v7pcChoose;"+
  "this.reset=v7pcResetDraft;this.commit=v7pcCommit;",ctx,{timeout:2000});
 const player={id:"A_8",teamId:"A",number:"8",primaryOverride:null,trimOverride:null,numberOverride:null};
 assert.equal(ctx.colors(player).numbers,"#08131e");
 const draft=ctx.draft(player);
 const edited=ctx.choose(ctx.choose(ctx.choose(draft,"primary","#335577"),"trim","#DDAABB"),"numbers","#FFFF00");
 assert.equal(player.primaryOverride,null,"Cancel/preview must not commit");
 assert.equal(edited.numberAuto,false);
 assert.equal(ctx.choose(edited,"primary","#446688").numbers,"#FFFF00");
 ctx.commit(player,edited,team);
 assert.equal(player.primaryOverride,"#335577");
 assert.equal(player.trimOverride,"#DDAABB");
 assert.equal(player.numberOverride,"#FFFF00");
 assert.equal(ctx.colors(player).numbers,"#FFFF00");
 assert.equal(ctx.draft(player).numbers,"#FFFF00");
 ctx.commit(player,ctx.reset(edited,team),team);
 assert.equal(player.primaryOverride,null);assert.equal(player.trimOverride,null);
 assert.equal(player.numberOverride,null);assert.equal(ctx.colors(player).numbers,"#08131e");
 const auto=ctx.choose(draft,"primary","#112233");
 assert.equal(auto.numbers,"#ffffff");assert.equal(auto.numberAuto,true);
}
/* V7.1 visible UI version and shared team/player palette logic. */
{
 assert.ok(app.includes('id="v7VisibleVersion">V7.1.12 Preview · staging</span>'));
 assert.ok(app.includes('const V7_UI_VERSION="7.1.12"'));
 assert.ok(app.includes('if(target?.type==="team")return v7OpenTeamColorDialog(target.id)'));
 assert.ok(app.includes('function v7OpenTeamColorDialog(teamId)'));
 assert.ok(app.includes('const teamMode=d.targetType==="team"'));
 assert.ok(app.includes('v7pcCommitTeam(team,d)'));
 assert.ok(app.includes('function v7pcResetTeamDraft('));
 const a=app.indexOf("function playerColors(player)"),b=app.indexOf("function rosterSort(",a);
 const c=app.indexOf("function v7pcHexColor("),d=app.indexOf("function v7pcChange(",c);
 assert.ok(a>0&&b>a&&c>0&&d>c);
 const team={id:"A",name:"DAWGS",primary:"#00FC05",trim:"#000000",numberOverride:null};
 const ctx={teamById:()=>team,TEAM_DEFAULTS:[{id:"A",primary:"#00FC05",trim:"#000000"}],
  contrastText:hex=>/^#(?:ffffff|00fc05)$/i.test(hex)?"#08131e":"#ffffff"};
 vm.runInNewContext(app.slice(a,b)+"\n"+app.slice(c,d)+
  "\nthis.colors=playerColors;this.teamDraft=v7pcTeamDraft;this.resetTeam=v7pcResetTeamDraft;"+
  "this.commitTeam=v7pcCommitTeam;this.choose=v7pcChoose;this.playerDraft=v7pcDraft;",ctx,{timeout:2000});
 const p={teamId:"A",id:"A_1",number:"7",primaryOverride:null,trimOverride:null,numberOverride:null};
 assert.equal(ctx.colors(p).numbers,"#08131e");
 const draft=ctx.teamDraft(team);
 const changed=ctx.choose(ctx.choose(ctx.choose(draft,"primary","#ABCDEF"),
  "trim","#123456"),"numbers","#FF00FF");
 assert.equal(team.primary,"#00FC05","Team preview should not save before Apply");
 ctx.commitTeam(team,changed);
 assert.equal(team.primary,"#ABCDEF");assert.equal(team.trim,"#123456");
 assert.equal(team.numberOverride,"#FF00FF");
 assert.equal(ctx.colors(p).numbers,"#FF00FF","Player should inherit team number ink");
 p.numberOverride="#FFFF00";
 assert.equal(ctx.colors(p).numbers,"#FFFF00","Player override wins");
 p.numberOverride=null;
 const reset=ctx.resetTeam(changed,"A");ctx.commitTeam(team,reset);
 assert.equal(team.primary,"#00FC05");assert.equal(team.trim,"#000000");
 assert.equal(team.numberOverride,null);
 assert.equal(ctx.colors(p).numbers,"#08131e","Reset restores auto contrast");
}
/* V7.1.3: preserve V7.1.2 name typography, fully restore V7.1.1 badges. */
{
 assert.ok(app.includes(".token-label{fill:#152a3c;font-size:8.6px;font-weight:550"),
  "V7.1.2 smaller lighter name style must remain in place");
 assert.ok(!app.includes(".token-label{font-size:11px}"),
  "Old bold name font-size override must not return");
 assert.ok(app.includes(".token-role-text{font-size:8px;font-weight:950;fill:#20384b;pointer-events:none}"),
  "Original position badge typography must be restored");
 assert.ok(app.includes(".token-leadership{font-size:20px;font-weight:950;fill:#0b2133"),
  "C/A leadership letters must remain readable at NHL-size token scale without altering original badge styling");
 const start=app.indexOf("function v7ScalePlayerSymbols(");
 const end=app.indexOf("/* Shared circular selection marker",start);
 const scaler=app.slice(start,end);
 assert.ok(scaler.includes('token.querySelectorAll(".token-role-badge").forEach(b=>'),
  "Position badges must be scaled as part of the original player token");
 assert.ok(scaler.includes('n.style.fontSize=(p.role==="goalie"?24:21)+"px"'),
  "Player number font must be 1.5x");
 assert.ok(scaler.includes('const ink=t.getBBox()') &&
  scaler.includes('t.setAttribute("text-anchor","middle")') &&
  scaler.includes('t.setAttribute("alignment-baseline","middle")') &&
  scaler.includes('label.length>=3?10:label.length===2?13:15'),
  "Position pill text must be optically centered and fitted");
 assert.ok(!scaler.includes('group.append(roleBadge)'),
  "No detached position badges should remain");
 assert.ok(!scaler.includes('token.querySelector(".token-leadership")?.remove()'),
  "The original leadership text must remain on the player token");
 assert.ok(app.includes('const lead=svgEl("text",{class:"token-leadership"'),
  "Original on-token leadership letters must render");
 for(const obsolete of ["token-leadership-badge","v7OnIceBadgePoint","v7NameLabelWidth"])
  assert.ok(!app.includes(obsolete),"V7.1.2 badge code was not fully reverted: "+obsolete);
}

/* V7.1.8 regression: the rink is a reflective boundary, never a puck rail.
   Test the same downhill-to-endboard shot shown in the screenshot, plus
   head-on, grazing and rounded-corner impacts. */
{
 const startIndex=app.indexOf("function v64SurfaceImpact(");
 const endIndex=app.indexOf("\nfunction v64RenderAimPreview(",startIndex);
 assert.ok(startIndex>0&&endIndex>startIndex,"Board energy solver must exist");
 const perimeter=[],R=50;
 const add=(x,y)=>perimeter.push({x,y});
 const arc=(cx,cy,from,to)=>{
  for(let i=1;i<=48;i++){const a=(from+(to-from)*i/48)*Math.PI/180;
   add(cx+Math.cos(a)*R,cy+Math.sin(a)*R)}
 };
 add(70,20);add(930,20);arc(930,70,-90,0);add(980,530);
 arc(930,530,0,90);add(70,580);arc(70,530,90,180);
 add(20,70);arc(70,70,180,270);perimeter.push({...perimeter[0]});
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const unit=v=>{const m=Math.hypot(v.x,v.y)||1;return{x:v.x/m,y:v.y/m}};
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 const inside=p=>{
  if(p.x<19.99||p.x>980.01||p.y<19.99||p.y>580.01)return false;
  const cx=p.x<70?70:p.x>930?930:null;
  const cy=p.y<70?70:p.y>530?530:null;
  return cx===null||cy===null||Math.hypot(p.x-cx,p.y-cy)<=50.04
 };
 const safe=p=>{
  let x=clamp(p.x,20,980),y=clamp(p.y,20,580);
  const cx=x<70?70:x>930?930:null,cy=y<70?70:y>530?530:null;
  if(cx!==null&&cy!==null){const dx=x-cx,dy=y-cy,m=Math.hypot(dx,dy);
   if(m>50){x=cx+dx*50/m;y=cy+dy*50/m}}
  return{x,y}
 };
 const rayHit=(start,dir,limit,a,b)=>{
  const ray={x:dir.x*limit,y:dir.y*limit},seg={x:b.x-a.x,y:b.y-a.y};
  const denom=cross(ray,seg);if(Math.abs(denom)<1e-10)return null;
  const delta={x:a.x-start.x,y:a.y-start.y};
  const t=cross(delta,seg)/denom,u=cross(delta,ray)/denom;
  if(t<=.0008||t>1.0001||u<-.0001||u>1.0001)return null;
  return{point:{x:start.x+ray.x*t,y:start.y+ray.y*t},distance:t*limit}
 };
 const ctx={
  v60BuildShotPath:null,V7_PUCK_RADIUS:3.2,
  v64Unit:unit,v64ClampPlayablePoint:safe,v64GoalCandidate:()=>null,
  v60ShotTravelDistance:()=>700,
  v64NearestShotSurface:(start,dir,limit)=>{
   let hit=null;
   for(let i=0;i<perimeter.length-1;i++){
    const p=rayHit(start,dir,limit,perimeter[i],perimeter[i+1]);
    if(p&&(!hit||p.distance<hit.distance))
     hit={...p,kind:"board",index:i,a:perimeter[i],b:perimeter[i+1]}
   }
   return hit
  },
  v64AppendPoint:(points,p)=>{
   if(!points.length||dist(points.at(-1),p)>.04)points.push({...p})
  },
  deepClone:p=>({...p}),dist,
  polylineLength:pts=>pts.slice(1).reduce((sum,p,i)=>sum+dist(p,pts[i]),0)
 };
 vm.runInNewContext(app.slice(startIndex,endIndex)+"\nthis.solve=v60BuildShotPath;",ctx,{timeout:2000});
 const take=(start,aim,power=8,distance=700)=>ctx.solve(start,aim,power,distance);
 const check=(name,shot)=>{
  assert.equal(shot.boardFollow,false,name+" must never follow wall perimeter");
  assert.ok(shot.bounced,name+" must actually reflect");
  assert.ok(shot.contacts.some(c=>c.kind==="board"),name+" needs board impact");
  assert.ok(shot.path.every(inside),name+" crosses puck-safe board face");
  assert.ok(shot.speedSegments.length>0,name+" needs friction-aware timing");
  assert.ok(ctx.polylineLength(shot.path)<=700+shot.bounceCount*1.5,
   name+" must lose, not generate, kinetic travel energy");
 };
 const diagonal=take({x:270,y:300},{x:900,y:840});
 check("diagonal-to-endboard",diagonal);
 const at=diagonal.contacts[0].point;
 const index=diagonal.path.findIndex(p=>dist(p,at)<.08);
 assert.ok(index>=0,"Contact point must occur on the visible shot path");
 const reflected=diagonal.path.slice(index+1).find(p=>dist(p,at)>20);
 assert.ok(reflected&&reflected.x>at.x+5&&reflected.y<at.y-5,
  "Endboard impact should bank up-and-forward, not skid along the wall");
 const front=take({x:500,y:300},{x:500,y:800});
 check("perpendicular-board",front);
 assert.ok(front.path.at(-1).y<front.contacts[0].point.y-25,
  "Head-on puck should return across the ice with reduced energy");
 const grazing=take({x:160,y:100},{x:1060,y:0},8,900);
 assert.equal(grazing.boardFollow,false);
 const shallow=grazing.contacts[0].point;
 const graze=grazing.path.slice(grazing.path.findIndex(p=>dist(p,shallow)<.08)+1)
  .find(p=>dist(p,shallow)>35);
 assert.ok(graze&&graze.y>shallow.y+1,
  "A glancing shot must reflect inward, not lock onto the top perimeter");
 const corner=take({x:760,y:300},{x:1160,y:800});
 check("rounded-corner",corner);
 assert.ok(corner.contacts[0].point.x>900&&corner.contacts[0].point.y>510,
  "Corner ray should strike the curved surface, not a square wall");
 assert.ok(app.includes('motionProfile:legs.length>0?motionProfile:null,'),
  "Bank speed changes must carry into saved playback");
 assert.ok(app.includes('const built=v7PhysicalShotTrajectory(origin,aim,mode.power,'),
  "Aim preview must share exactly the saved collision solver");
}


/* V7.1.8: frame-continuous puck motion, preserving impact direction and
   all playbook coordinates. Physics is computed once per puck per playback. */
{
 const motionSource=app.slice(app.indexOf("function v7ShotMotionProgress("),
  app.indexOf("function v7PhysicalShotTrajectory("));
 assert.ok(motionSource.includes("v0+v1"),
  "Puck glide must integrate changing velocity rather than constant-speed stepping");
 const math={clamp:(v,lo,hi)=>Math.min(hi,Math.max(lo,v))};
 vm.runInNewContext(motionSource+"\nthis.progress=v7ShotMotionProgress;",math,{timeout:1000});
 const smooth=[
  {time:0,progress:0},
  {time:.5,progress:.6,speedStart:1,speedEnd:.5},
  {time:1,progress:1,speedStart:.5,speedEnd:.1}
 ];
 assert.ok(math.progress(smooth,.25)>.3,
  "Friction should move the puck farther in the earlier half of a glide");
 let prev=-1;
 for(let frame=0;frame<=120;frame++){
  const p=math.progress(smooth,frame/120);
  assert.ok(p>=prev-.0000001&&p<=1.0000001,
   "120 Hz puck animation must progress monotonically without position jumps");
  assert.ok(frame===0||p-prev<.025,
   "Adjacent animation frames must not jump along the route");
  prev=p
 }
 assert.ok(Math.abs(math.progress(smooth,.5-1e-6)-math.progress(smooth,.5+1e-6))<.0001,
  "Puck cannot teleport between adjoining motion segments");
 assert.equal(math.progress(smooth,0),0);
 assert.equal(math.progress(smooth,1),1);
 const cacheBegin=app.indexOf("/* V7.1.11: One deterministic puck timeline");
 assert.ok(cacheBegin>0,"Per-playback collision cache must exist");
 let computes=0;
 const runtime={
  ui:{playing:false,recordingMove:null},v7VideoBusy:false,
  buildPuckTimeline:id=>({id:id||"puck",run:++computes}),
  stopPlayback:()=>{runtime.ui.playing=false},
  togglePlayback:()=>{runtime.ui.playing=!runtime.ui.playing}
 };
 vm.runInNewContext(app.slice(cacheBegin,app.indexOf("</script>",cacheBegin)),runtime,{timeout:1000});
 runtime.togglePlayback();
 const first=runtime.buildPuckTimeline("puck");
 for(let frame=0;frame<120;frame++)
  assert.equal(runtime.buildPuckTimeline("puck"),first,
   "Playback must reuse the same puck route instead of redoing collisions each frame");
 assert.equal(computes,1);
 const second=runtime.buildPuckTimeline("puck-two");
 assert.equal(computes,2);
 assert.equal(runtime.buildPuckTimeline("puck-two"),second);
 runtime.stopPlayback();
 assert.notEqual(runtime.buildPuckTimeline("puck"),first,
  "Stopped playback must invalidate the old route");
 runtime.togglePlayback();
 assert.notEqual(runtime.buildPuckTimeline("puck"),first,
  "Replay must recalculate the timeline rather than retaining stale geometry");
 runtime.ui.recordingMove={started:true};
 assert.notEqual(runtime.buildPuckTimeline("puck"),runtime.buildPuckTimeline("puck"),
  "Editing must bypass the playback-only cache");
}


/* Unified equipment controls and durable length-stretch behavior. */
{
 const start=app.indexOf("function v7EquipmentActionSlots("),end=app.indexOf("function v7RenderEquipment(",start);
 assert.ok(start>0&&end>start,"Shared equipment control slots missing");
 const scope={v7CollisionGeometry:item=>item.geometry,
  v59ClampVisiblePoint:p=>p,round:(x,n)=>Math.round(x*10**n)/10**n};
 vm.runInNewContext(app.slice(start,end)+"\nthis.slots=v7EquipmentActionSlots;",scope,{timeout:1500});
 const net={x:500,y:300,rotation:0,geometry:{length:36,width:48,radius:0}};
 const controls=scope.slots(net);
 assert.ok(controls.topLeft.x<500&&controls.topLeft.y<300);
 assert.ok(controls.topRight.x>500&&controls.topRight.y<300);
 assert.ok(controls.bottomLeft.x<500&&controls.bottomLeft.y>300);
 assert.ok(controls.bottomRight.x>500&&controls.bottomRight.y>300);
 assert.ok(app.includes('layer.append(v7RoundButton(selected.id,slots.topRight,"size"))'),"Round-object size-cycle arrow must occupy upper-right slot");
 assert.ok(!app.includes('layer.append(v7RoundButton(selected.id,slots.topLeft,"size"))'),"Old upper-left size-cycle slot must be removed");
 assert.ok(app.includes('v7RinkRemoveControl(selected.id,"equipment",slots.bottomLeft)'));
 assert.ok(app.includes('v7RinkGoalResetControl(selected.id,slots.topRight)'));
 assert.ok(app.includes('v7RinkNetSizeControl(selected.id,slots.bottomRight)'));
 assert.ok(app.includes('selected.type==="net"?"topLeft":"bottomRight"'));
 assert.ok(app.includes('v7RoundButton(selected.id,slots.bottomRight,"duplicate")'));
 assert.ok(!app.includes('v7RinkGoalResetControl(selected.id,point,.78)'));
 assert.ok(app.includes('btn.textContent="🏒"'),"Rink objects toolbar icon must be a hockey stick");
 const stretchStart=app.indexOf("function v7ApplyStretchLength(");
 const stretchEnd=app.indexOf("function v7SetupEquipmentEvents(",stretchStart);
 assert.ok(stretchStart>0&&stretchEnd>stretchStart);
 const ctx={v7WorldToLocal:(item,p)=>({x:p.x-item.x,y:p.y-item.y}),
  clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
  round:(v,n)=>Math.round(v*10**n)/10**n,
  v7ClampEquipmentToIce:()=>({x:500,y:300})};
 vm.runInNewContext(app.slice(stretchStart,stretchEnd)+"\nthis.stretch=v7ApplyStretchLength;",ctx,{timeout:1500});
 const item={type:"pad",x:500,y:300,geometry:{length:32,width:12},rotation:0,scale:1};
 let saves=0;
 assert.equal(ctx.stretch(item,{startLength:32,startLocalX:46,point:{x:556,y:300}},()=>saves++),true);
 assert.equal(item.geometry.length,52);
 assert.equal(saves,1);
 assert.equal(ctx.stretch(item,{startLength:32,startLocalX:46,point:{x:536,y:300}},()=>saves++),true);
 assert.equal(item.geometry.length,18);
 ctx.v7ClampEquipmentToIce=()=>null;
 assert.equal(ctx.stretch(item,{startLength:32,startLocalX:46,point:{x:568,y:300}},()=>saves++),false);
 assert.equal(item.geometry.length,18,"Invalid board-fit stretches must be rejected");
 assert.equal(saves,2);
 for(const phrase of [
  'class:"v7-object-handle v7-stretch-handle"',
  'class:"v7-stretch-symbol"',
  'portaled:true,historyPushed:false,changed:false',
  'window.addEventListener("pointermove",event=>',
  'window.addEventListener("pointerup",finish,true)',
  'window.addEventListener("pointercancel",finish,true)',
  'v7ApplyStretchLength(item,{...drag,point}'
 ])assert.ok(app.includes(phrase),"Stretch handler regression: "+phrase);
}


/* V7.1.12 regression: object placement clicks cannot start a puck drag. */
{
 const a=app.indexOf("function onRinkPointerDown(event){"),b=app.indexOf("function onRinkPointerMove(event){",a);
 const c=app.indexOf("function v7SetupAdditionalPuckEvents(){"),d=app.indexOf("function v7SetEquipmentPlacement(",c);
 const e=app.indexOf("function v7SetupEquipmentEvents(){"),f=app.indexOf("/* Shot collision options",e);
 const g=app.indexOf("function v7SetEquipmentPlacement("),h=app.indexOf("function v7CancelEquipmentPlacement(",g);
 assert.ok(a>0&&b>a&&c>0&&d>c&&e>0&&f>e&&g>0&&h>g);
 const callbacks=[];
 const svg={dataset:{},addEventListener(type,fn){if(type==="pointerdown")callbacks.push(fn)}};
 const puckStart={x:500,y:300};
 const ui={tool:"select",v7EquipmentPlacement:"divider",v7AdditionalPuckPlacement:false,
  selectedType:null,selectedId:null,playhead:0,playing:false,pendingTap:null};
 let placed=0,deleted=0,consumed=0;
 const ctx={ui,state:{puckStart},window:{addEventListener(){}},document:{activeElement:null},
  $:sel=>sel==="#rinkSvg"?svg:null,svgPoint:()=>({x:500,y:300}),
  v7SelectAdditionalPuckFromTrack:()=>{},
  V7_RINK_OBJECT_TYPES:{divider:{label:"Divider pad"}},V7_ROUND_SIZES:{},
  v7AddEquipment:(type,point)=>{assert.equal(type,"divider");assert.equal(point.x,500);placed++},
  v7CancelEquipmentPlacement:()=>{ui.v7EquipmentPlacement=null},
  v7DeletePrimaryPuck:()=>{deleted++},v7DeleteAdditionalPuck:()=>{deleted++},
  v7CancelAdditionalPuckPlacement:()=>{},toast:()=>{}
 };
 vm.runInNewContext(
  app.slice(a,b)+app.slice(c,d)+app.slice(e,f)+
  "\nthis.legacy=onRinkPointerDown;this.setupPuck=v7SetupAdditionalPuckEvents;this.setupEquip=v7SetupEquipmentEvents;",
  ctx,{timeout:2000});
 ctx.setupPuck();ctx.setupEquip();
 assert.equal(callbacks.length,2,"Puck listener must precede equipment listener");
 const makeTarget=kind=>({closest:sel=>{
  if(kind==="primary"&&sel==="[data-puck]")return{dataset:{puck:"1"}};
  if(kind==="additional"&&sel==="[data-v7-additional-puck-id]")return{dataset:{v7AdditionalPuckId:"extra"}};
  if(kind==="minus"&&sel==="[data-v7-remove-primary-puck]")return{dataset:{}};
  return null
 }});
 for(const [i,kind] of ["primary","additional","minus"].entries()){
  ui.v7EquipmentPlacement="divider";
  const event={button:0,pointerId:i+1,target:makeTarget(kind),clientX:500,clientY:300,
   preventDefault(){consumed++},stopImmediatePropagation(){},stopPropagation(){}};
  ctx.legacy(event);for(const cb of callbacks)cb(event);
  assert.equal(placed,i+1,"Placement must reach equipment handler over "+kind);
  assert.equal(ui.dragPuck,undefined,"Legacy puck drag must remain unset");
  assert.equal(ui.v7PrimaryPuckDrag,undefined,"Primary puck drag must remain unset");
  assert.equal(ui.v7AdditionalPuckDrag,undefined,"Additional puck drag must remain unset");
  assert.equal(ui.pendingTap,null,"Legacy tap must not be primed");
  assert.equal(ctx.state.puckStart.x,500,"Primary puck X must not move");
  assert.equal(ctx.state.puckStart.y,300,"Primary puck Y must not move");
 }
 assert.equal(deleted,0,"Placement on puck removal glyph must not delete a puck");
 assert.equal(consumed,3,"Only placement must consume pointerdown");
 vm.runInNewContext(app.slice(g,h)+"\nthis.arm=v7SetEquipmentPlacement;",ctx,{timeout:1000});
 ui.pendingTap={type:"puck"};ui.dragPuck={pointerId:1};
 ui.v7PrimaryPuckDrag={pointerId:1};ui.v7AdditionalPuckDrag={pointerId:1};
 ctx.arm("divider");
 for(const key of ["pendingTap","dragPuck","v7PrimaryPuckDrag","v7AdditionalPuckDrag"])
  assert.equal(ui[key],null,"Arm placement must cancel pending gesture: "+key);
 assert.equal(ui.v7EquipmentPlacement,"divider");
}

console.log("V7 goal/rink regressions passed: NHL true aspect, physical markings, user presets, saved rink and goal/net physics.");