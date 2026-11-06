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
assert.ok(app.includes('state.equipment=v7NormalizeEquipmentList([])'),"New must restore both nets");
assert.ok(app.includes('if(!v7EquipmentById(id)||v7EquipmentById(id).goalSide)return false'),"Goal deletion must be prevented");
assert.ok(app.includes('data-v7-reset-goal'),"Goal reset control missing");
assert.ok(app.includes('const impacts=(built?.contacts||[])'),"Board/net impact data must reach haptics");

const round=(v,places=2)=>Math.round(v*10**places)/10**places;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const deepClone=v=>structuredClone(v);
const types={
  net:{geometry:{length:26,width:48},physics:{collidable:true,response:"stop",restitution:0},capabilities:{rotatable:true,resize:"none",puckSource:false}},
  cone:{geometry:{radius:6},physics:{collidable:true,response:"soft_block",restitution:.12},capabilities:{rotatable:false,resize:"uniform",puckSource:false}}
};
const normalizerStart=app.indexOf("function v7CloneObjectDefaults(type)");
const normalizerEnd=app.indexOf("function v7EnsureSemanticTimeline(",normalizerStart);
assert.ok(normalizerStart>0&&normalizerEnd>normalizerStart);
const normContext={V7_RINK_OBJECT_TYPES:types,deepClone,clamp,round,uid:prefix=>prefix+"-test",
  v59ValidPoint:p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y),
  v59CopyPoint:p=>({x:p.x,y:p.y})};
const presetSource=app.slice(app.indexOf("const V7_NET_SIZES="),app.indexOf("const V7_PUCK_RADIUS="));
normContext.V7_CREASE_RADIUS_UNITS=26.4;
vm.runInNewContext(presetSource+"\n"+app.slice(normalizerStart,normalizerEnd),normContext,{timeout:2000});
const initial=normContext.v7NormalizeEquipmentList([]);
assert.equal(initial.length,2,"Fresh play must have two nets");
const migrated=normContext.v7NormalizeEquipmentItem({id:"v7-goal-left",type:"net",goalSide:"left",x:62,y:300,rotation:0,netPreset:"pro"});
assert.equal(migrated.x,67.85,"Original built-in net should align to recalibrated goal line");
const custom=normContext.v7NormalizeEquipmentItem({id:"v7-goal-left",type:"net",goalSide:"left",x:82,y:295,rotation:15,netPreset:"pro"});
assert.equal(custom.x,82,"A user-moved net must never migrate unexpectedly");
assert.deepEqual(Array.from(initial,n=>n.goalSide).sort(),["left","right"]);
const left=initial.find(n=>n.goalSide==="left"),right=initial.find(n=>n.goalSide==="right");
assert.equal(left.x,67.85);assert.equal(left.geometry.width,26.4);assert.equal(left.rotation,0);
assert.equal(left.netPreset,"pro");assert.equal(left.scale,1);assert.equal(left.capabilities.resize,"none");
for(const [name,width,height] of [["little",13.2,2],["medium",17.6,3],["pro",26.4,4]]){
 const item=normContext.v7NormalizeEquipmentItem({id:name,type:"net",x:500,y:300,netPreset:name,scale:2.5,geometry:{length:110,width:120}});
 assert.equal(item.geometry.width,width,"Net opening must track 6 ft crease scale");
 assert.equal(item.geometry.heightFeet,height);
 assert.equal(item.scale,1,"Net resize must be disabled");
 assert.equal(item.capabilities.resize,"none");
}
assert.equal(right.x,932.15);assert.equal(right.rotation,180);
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
  v7NetPostRadius:item=>Math.max(1.8,3.6*(Number(item.geometry?.width)||48)/48),
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
assert.equal(leftGoal?.side,"left");assert.ok(Math.abs(leftGoal.entry.x-75)<.01);
assert.ok(Math.abs(leftGoal.end.x-61.7)<.01);
const rightGoal=ctx.v64GoalCandidate({x:700,y:300},{x:1,y:0},400);
assert.equal(rightGoal?.side,"right");assert.ok(Math.abs(rightGoal.entry.x-925)<.01);
assert.equal(ctx.v64GoalCandidate({x:300,y:390},{x:-1,y:0},400),null,"Wide shot cannot score");
assert.equal(ctx.v64GoalCandidate({x:40,y:300},{x:1,y:0},400),null,"Shooting from behind cannot score");
assert.equal(ctx.v64GoalCandidate({x:300,y:313.2},{x:-1,y:0},400),null,"Crossing a goalpost cannot score");
const post=ctx.v64NearestShotSurface({x:300,y:313.2},{x:-1,y:0},400);
assert.equal(post?.surface,"post","Post must have physical collision");
const back=ctx.v64NearestShotSurface({x:40,y:300},{x:1,y:0},50);
assert.equal(back?.surface,"back","Back mesh must block shots from behind");

ctx.state.equipment[0].x=500;ctx.state.equipment[0].rotation=90;
const rotated=ctx.v64GoalCandidate({x:500,y:400},{x:0,y:-1},200);
assert.equal(rotated?.side,"left","Moved/rotated net must update goal mouth");
assert.equal(ctx.v64GoalCandidate({x:570,y:400},{x:0,y:-1},200),null,"Rotated net must still reject misses");
ctx.state.equipment[0].rotation=0;ctx.state.equipment[0].x=67.85;
ctx.state.equipment[0].geometry=normContext.v7NetDimensions("medium");
assert.equal(ctx.v64GoalCandidate({x:300,y:307},{x:-1,y:0},400)?.side,"left","Medium net mouth should accept a clean shot");
assert.equal(ctx.v64GoalCandidate({x:300,y:314},{x:-1,y:0},400),null,"Medium net cannot score outside 4 ft opening");
const added=normContext.v7NormalizeEquipmentItem({id:"added-net",type:"net",x:450,y:300,netPreset:"little",rotation:0});
ctx.state.equipment.push(added);
const extraGoal=ctx.v64GoalCandidate({x:600,y:300},{x:-1,y:0},400);
assert.equal(extraGoal?.netId,"added-net","Extra nets must score independently");
assert.equal(ctx.goalResultForShot({x:300,y:300},{x:40,y:300})?.goal,true);
assert.equal(ctx.goalResultForShot({x:300,y:390},{x:40,y:390})?.goal,false);

for(const marker of ['label:"Regulation Goal"','label:"Cross-Ice Goal"','label:"Mini Goal"',
  'v7GoalFlashes.set(netId,performance.now()+3500)',
  'data-v7-net-visual','data-v7-net-red','v7NetSizeSelect',
  'data-v7-net-preset','v7TriggerGoalLight(interval.netId)',
  '$("#', 'v7ApplyNetGoalFlash(netArt,performance.now())',
  '$("#goalBanner").classList.remove("active")'
].filter(marker=>marker!=='$("#'))assert.ok(app.includes(marker),"Missing 3.5 second goal animation/preset: "+marker);
assert.ok(!app.includes('data-v7-goal-light'),"Standalone beacon must be gone");
assert.ok(!app.includes('data-v7-goal-bulb'),"Standalone bulb must be gone");
assert.ok(app.indexOf('pro:Object.freeze({label:"Regulation Goal"')<app.indexOf('medium:Object.freeze({label:"Cross-Ice Goal"'),
  "Regulation goal must be first in default net selector");
assert.ok(app.includes('netPreset=isNet&&Object.hasOwn(V7_NET_SIZES,item.netPreset)?item.netPreset:"pro"'),
  "Nets without a preset must default to regulation size");
const playback=app.slice(app.indexOf("tick=function(ts){"),app.indexOf("function v64RaySegmentHit("));
assert.ok(!playback.includes("goalSiren()"),"Scoring must not play a separate siren");
// Both crease profiles must preserve the 6ft radius; NHL has 4.5ft sides.
{
  const a=app.indexOf("function v7CreasePath("),b=app.indexOf("function v7ApplyCreaseProfile(",a);
  assert.ok(a>0&&b>a,"Crease profile geometry missing");
  const ctx={V7_CREASE_RADIUS_UNITS:26.4,round};
  vm.runInNewContext(app.slice(a,b)+"\nthis.path=v7CreasePath;",ctx,{timeout:2000});
  for(const side of ["left","right","half"]){
    assert.ok(ctx.path(side,"nhl").includes(" L"),"NHL crease needs straight sides");
    assert.ok(ctx.path(side,"youth").includes("A26.4 26.4"),"USA/Canada style must use a semicircle");
  }
  assert.ok(app.includes("v7PrepareCreaseStyleUI();"),"Crease profile selector must initialize");
}
console.log("V7 goal regression passed: crease scale aligned with faceoff circles, net mouth and goal line, NHL and youth crease styles.");