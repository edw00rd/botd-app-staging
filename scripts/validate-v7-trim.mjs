import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
assert.match(app,/V7\.1\.29 Preview/);
for(const marker of [
  'id="v729TrimBtn"', 'data-v729-selection', 'data-v729-handle="start"',
  'data-v729-handle="end"', 'function v729TrimPointerDown(event)',
  'function v729TrimPointerMove(event)', 'function v729TrimPointerFinish(event)',
  'grid.addEventListener("pointerdown",v729TrimPointerDown,true)',
  'window.addEventListener("pointerup",v729TrimPointerFinish,true)',
  'function v729TrimToRange(range)', 'function v729TrimPuckTake(take,start,end,puckStartInfo)',
  'renderTimeline=function(){', 'v729DecorateTimelineTracks();',
  'const trimExact=source.trimExact===true'
])assert.ok(app.includes(marker),"Missing trim feature: "+marker);
assert.ok(app.indexOf('v729DecorateTimelineTracks()')>app.indexOf('const v7PrimaryRenderTimeline=renderTimeline'),
  "Ruler trim must decorate after additional puck rows");

// Exact trimmed duration must survive active-option normalization and saved-play roundtrips.
{
 const begin=app.indexOf("function normalizeTimelineData(");
 const end=app.indexOf("function captureVariationFromStateLike(",begin);
 assert.ok(begin>0&&end>begin);
 const ctx={
  clamp:(x,a,b)=>Math.max(a,Math.min(x,b)),
  round:(x,n)=>Number(x.toFixed(n)),
  sanitizeMovementList:x=>x,uid:prefix=>prefix+"_id",
  deepClone:x=>structuredClone(x)
 };
 vm.runInNewContext(app.slice(begin,end)+
   "\nthis.normalizeTimelineData=normalizeTimelineData;",ctx,{timeout:1200});
 const events=[{id:"route",name:"Route",events:[]}],movements=[
  {id:"m",playerId:"A_1",start:0,duration:13.5,points:[{x:0,y:0},{x:10,y:0}]}];
 const trimmed=ctx.normalizeTimelineData({duration:13.5,trimExact:true,movements,
   puckTakes:events,activeTakeId:"route"});
 assert.equal(trimmed.duration,13.5,"The exact Out point should not gain 250 ms padding");
 assert.equal(trimmed.trimExact,true);
 const short=ctx.normalizeTimelineData({duration:1.25,trimExact:true,
   puckTakes:events,activeTakeId:"route"});
 assert.equal(short.duration,1.25,"Short trimmed video segments must be allowed");
 const legacy=ctx.normalizeTimelineData({duration:13.5,movements,
   puckTakes:events,activeTakeId:"route"});
 assert.equal(legacy.duration,13.75,"Old timeline normalization behavior must stay intact")
}

// Real clip slicing and current-option trim semantics, including all puck routes.
{
 const begin=app.indexOf("function slicePolylineByProgress(");
 const end=app.indexOf("function sanitizeMovementList(",begin);
 const trimStart=app.indexOf("function v729TrimMovements(");
 const trimEnd=app.indexOf("function movementNeighborBounds(",trimStart);
 assert.ok(begin>0&&end>begin&&trimStart>0&&trimEnd>trimStart);
 let next=0,snapshots=0,frames=0,syncs=0;
 const ctx={
  clamp:(x,a,b)=>Math.max(a,Math.min(x,b)),
  round:(x,n)=>Number(x.toFixed(n)),
  deepClone:x=>structuredClone(x),
  uid:prefix=>prefix+"_"+(++next),
  dist:(a,b)=>Math.hypot(b.x-a.x,b.y-a.y),
  polylineLength:pts=>pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-pts[i].x,p.y-pts[i].y),0),
  pointAtPolyline:(pts,progress)=>{
   const a=pts[0],b=pts[pts.length-1];
   return {x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress}
  },
  sanitizeMovementList:clips=>clips,
  state:{
   onIce:{A_1:{x:0,y:0},B_1:{x:100,y:20}},
   puckStart:{x:1,y:1},
   additionalPucks:[{id:"extra",x:2,y:2}],
   timeline:{duration:21,activeTakeId:"takeA",
    movements:[
     {id:"mvA",playerId:"A_1",start:3,duration:9,points:[{x:3,y:0},{x:12,y:0}]},
     {id:"mvB",playerId:"B_1",start:14,duration:6,points:[{x:114,y:20},{x:120,y:20}]}],
    puckTakes:[
      {id:"takeA",name:"Route A",events:[
       {id:"before",type:"place",time:2,target:{x:1,y:1}},
       {id:"atStart",type:"possess",time:6,targetId:"A_1"},
       {id:"during",type:"pass",time:14,targetId:"B_1"},
       {id:"after",type:"shot",time:20.5,target:{x:40,y:40}}]},
      {id:"takeB",name:"Route B",events:[
       {id:"extraBefore",type:"place",puckId:"extra",time:1,target:{x:5,y:5}},
       {id:"extraDuring",type:"passSpace",puckId:"extra",time:9,target:{x:25,y:25}},
       {id:"extraAfter",type:"drop",puckId:"extra",time:21}]}
    ]},
   variations:[{id:"o1",name:"Option 1"}],activeVariationId:"o1"
  },
  ui:{playhead:9,selectedType:"clip",selectedId:"mvA",reuseRange:{start:6,end:19.5}},
  playerPositionAt:(id,t)=>id==="A_1"?{x:t,y:0}:{x:100+t,y:20},
  buildPuckTimeline:id=>({puckId:id,takeId:ctx.state.timeline.activeTakeId}),
  puckStateAt:(t,timeline)=>({
   mode:"loose",holder:null,
   pos:{x:timeline.puckId==="puck"?t:t+100,y:timeline.takeId==="takeA"?3:4}
  }),
  pushHistory:()=>{snapshots++},
  v7EnsureSemanticTimeline:()=>{},
  syncActiveVariation:()=>{syncs++},
  renderAll:()=>{frames++},
  toast:()=>{},fmtTime:x=>String(x)
 };
 vm.runInNewContext(app.slice(begin,end)+app.slice(trimStart,trimEnd)+
  "\nthis.trim=v729TrimToRange;this.cut=v729TrimMovements;",ctx,{timeout:2500});
 assert.equal(ctx.trim({start:6,end:19.5}),true);
 assert.equal(snapshots,1,"Trimming must push one Undo checkpoint");
 assert.equal(frames,1,"Redraw after timeline crop");
 assert.equal(syncs,1,"Trimming must save the modified active option");
 assert.equal(ctx.state.timeline.duration,13.5);
 assert.equal(ctx.state.timeline.trimExact,true);
 assert.equal(ctx.state.timeline.activeTakeId,"takeA");
 assert.equal(ctx.state.variations.length,1,"Trimming must not create a new play option");
 assert.equal(ctx.state.variations[0].sourceRange.start,6);
 assert.equal(ctx.state.variations[0].sourceRange.end,19.5);
 assert.equal(ctx.state.onIce.A_1.x,6);
 assert.equal(ctx.state.onIce.B_1.x,106);
 assert.equal(ctx.state.timeline.movements.length,2);
 const mvA=ctx.state.timeline.movements.find(x=>x.id==="mvA");
 const mvB=ctx.state.timeline.movements.find(x=>x.id==="mvB");
 assert.equal(mvA.start,0);assert.equal(mvA.duration,6);
 assert.equal(mvA.points[0].x,6);assert.equal(mvA.points.at(-1).x,12);
 assert.equal(mvB.start,8);assert.equal(mvB.duration,5.5);
 assert.equal(mvB.points[0].x,114);assert.equal(mvB.points.at(-1).x,119.5);
 assert.equal(ctx.state.puckStart.x,6);
 assert.equal(ctx.state.additionalPucks[0].x,106);
 const a=ctx.state.timeline.puckTakes[0].events;
 const b=ctx.state.timeline.puckTakes[1].events;
 assert.equal(a.some(x=>x.id==="before"||x.id==="after"),false);
 assert.equal(a.find(x=>x.id==="atStart").time,0);
 assert.equal(a.find(x=>x.id==="during").time,8);
 assert.equal(b.some(x=>x.id==="extraBefore"||x.id==="extraAfter"),false);
 assert.equal(b.find(x=>x.id==="extraDuring").time,3);
 assert.ok(b.some(x=>x.puckId==="extra"&&x.type==="place"&&x.time===0),
  "Additional pucks must have their own starting state");
 assert.ok(a.some(x=>x.type==="place"&&x.time===0),"Primary puck must be seeded");
 assert.equal(ctx.ui.playhead,0);
 assert.equal(ctx.ui.reuseRange.start,null);
 assert.equal(ctx.ui.reuseRange.end,null);
}
// Continuation of a shot/pass in flight at the In-point is retained.
{
 const begin=app.indexOf("function v729TrimPuckTake("),end=app.indexOf("function v729TrimToRange(",begin);
 const ctx={round:(x,n)=>Number(x.toFixed(n)),deepClone:x=>structuredClone(x),
  uid:p=>p+"_id"};
 vm.runInNewContext(app.slice(begin,end)+"\nthis.cut=v729TrimPuckTake;",ctx,{timeout:1000});
 const result=ctx.cut({id:"take",events:[{id:"event",type:"shot",time:12,target:{x:33,y:4}}]},
  6,19.5,{puck:{mode:"travel",holder:null,pos:{x:10,y:4},
   flight:{remaining:2,cutTarget:{x:20,y:4},target:{x:30,y:4},holder:null}}});
 assert.ok(result.events.some(x=>x.type==="passSpace"&&x.travelDuration===2),
  "Flight in progress must continue for remaining duration");
 assert.equal(result.events.find(x=>x.id==="event").time,6);
}
console.log("V7.1.29 trim tests passed: exact crop, routes, secondary pucks, source positions, Undo and selection UI.");
