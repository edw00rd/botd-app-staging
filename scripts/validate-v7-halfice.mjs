import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
const shell=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
assert.match(app,/V7\.1\.17 Preview/);
assert.match(shell,/V7\.1\.17 Preview/);
assert.ok(app.includes('const V7_UI_VERSION="7.1.18"'));
assert.ok(app.includes("const v717PreviousAddToIce=addToIce;"));
assert.ok(app.includes("const v717PriorObjectRender=renderObjectLayer;"));
assert.ok(app.includes("const v717PriorEquipmentActionSlots=v7EquipmentActionSlots;"));
assert.ok(app.includes("const v717PriorFloatingSync=v7FloatingSync;"));
assert.ok(app.includes('token.setAttribute("transform","rotate("+angle+") scale("+round(scale,4)+")")'),
  "Coach, goalie, skater and player badge art must all counterrotate");
assert.ok(app.includes('token.querySelectorAll("text").forEach(text=>text.removeAttribute("transform"))'),
  "Legacy character rotations must be cleared to prevent upside-down labels");
assert.ok(app.includes('label.setAttribute("transform","rotate("+angle+" "'),
  "Player names must counterrotate around their view-relative anchor");
assert.ok(app.includes('control.setAttribute("transform",base+" rotate("+angle+")")'),
  "Puck and rink object control glyphs must remain upright");
assert.ok(app.includes('if(state.view!=="half")return v717PreviousAddToIce(playerId);'),
  "Full Ice placement must remain unchanged");

const start=app.indexOf("function v717HalfAttackers(");
const end=app.indexOf("const v717PreviousAddToIce=addToIce;",start);
assert.ok(start>0&&end>start);
const env={
 state:{view:"half",halfSide:"right",ice:{
  faceoffOffset:27,faceoffRadius:15,endSpotFromGoal:20,creaseRadius:6
 },onIce:{}},
 playerById:id=>env.players[id],
 players:{},
 v7IceGeometry:()=>({scale:4.8,y:30,yBottom:570,x:20,xRight:980,
    blueLeft:330,blueRight:670,goalLeft:73,goalRight:927}),
 v59WholeToHalfView:(p,side)=>side==="left"?{x:600-p.y,y:p.x}:{x:p.y,y:1000-p.x},
 v59HalfViewToWhole:(p,side)=>side==="left"?{x:p.y,y:600-p.x}:{x:1000-p.y,y:p.x},
 v59ValidPoint:p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y),
 dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 round:(n,prec=2)=>Number(n.toFixed(prec)),
 console,Math
};
vm.runInNewContext(app.slice(start,end),env,{timeout:1500});
function v(p,side){return env.v59WholeToHalfView(p,side)}
for(const side of ["right","left"]){
 env.state.halfSide=side;env.state.onIce={};env.players={};
 const setup=env.v717HalfFaceoffLayout(),attacker=side==="right"?"A":"B",defender=side==="right"?"B":"A";
 const a={id:"off-center",teamId:attacker,role:"skater",position:"C"};
 const b={id:"def-center",teamId:defender,role:"skater",position:"C"};
 const ac=env.v717HalfSpawnPoint(a);
 assert.ok(env.v717OnVisibleHalf(ac),side+": attacking center must spawn on displayed ice");
 assert.ok(Math.abs(v(ac,side).x-setup.faceoff.x)<.01);
 assert.ok(Math.abs(v(ac,side).y-(setup.faceoff.y+13))<.01);
 env.players[a.id]=a;env.state.onIce[a.id]=ac;
 const bc=env.v717HalfSpawnPoint(b);
 assert.ok(env.v717OnVisibleHalf(bc),side+": defending center must spawn on displayed ice");
 assert.ok(Math.abs(v(bc,side).y-(setup.faceoff.y-13))<.01,
  "Opposing center must remain across faceoff dot, not relocate to the slot");
 env.players[b.id]=b;env.state.onIce[b.id]=bc;
 for(const position of ["LW","RW","F1","F2","F3","LD","RD"]){
  for(const [teamId,role] of [[attacker,"offense"],[defender,"defense"]]){
   const p={id:role+position,teamId,position,role:"skater"};
   const point=env.v717HalfSpawnPoint(p);
   assert.ok(env.v717OnVisibleHalf(point),side+" "+role+" "+position+" must be visible");
   env.players[p.id]=p;env.state.onIce[p.id]=point;
  }
 }
 assert.ok(v(env.state.onIce.offenseLD,side).y>setup.faceoff.y,
  "Offensive defencemen stay nearer blue line");
 assert.ok(v(env.state.onIce.defenseRD,side).y<setup.faceoff.y,
  "Defensive defencemen protect net side");
 const goalie={id:"goalie",teamId:defender,role:"goalie",position:"G"};
 const goaliePos=env.v717HalfSpawnPoint(goalie);
 assert.ok(env.v717OnVisibleHalf(goaliePos));
 assert.ok(v(goaliePos,side).y<setup.faceoff.y,"Goalie must be near visible crease");
 const coach={id:"coach",teamId:attacker,role:"coach",position:"COACH"};
 assert.ok(env.v717OnVisibleHalf(env.v717HalfSpawnPoint(coach)));
 const extra={id:"second-center",teamId:attacker,role:"skater",position:"C"};
 const extraPos=env.v717HalfSpawnPoint(extra);
 assert.ok(env.v717OnVisibleHalf(extraPos));
 assert.ok(Math.hypot(extraPos.x-ac.x,extraPos.y-ac.y)>=31,
  "Second center must not stack on first");
}
const slotStart=app.indexOf("const v717PriorEquipmentActionSlots=v7EquipmentActionSlots;");
const slotEnd=app.indexOf("/* All body-portaled buttons",slotStart);
assert.ok(slotStart>0&&slotEnd>slotStart);
env.v7EquipmentActionSlots=item=>({original:item.id});
env.v7CollisionGeometry=()=>({length:48,width:20,radius:0});
env.v59ClampVisiblePoint=p=>p;
vm.runInNewContext(app.slice(slotStart,slotEnd),env,{timeout:1500});
const obj={id:"tire",x:800,y:300,rotation:0};
for(const side of ["right","left"]){
 env.state.halfSide=side;
 const center=v(obj,side),slots=env.v7EquipmentActionSlots(obj);
 const topLeft=v(slots.topLeft,side),topRight=v(slots.topRight,side);
 const bottomLeft=v(slots.bottomLeft,side),bottomRight=v(slots.bottomRight,side);
 assert.ok(topLeft.x<center.x&&topRight.x>center.x,"Buttons must stay in screen left/right corners");
 assert.ok(topLeft.y<center.y&&bottomLeft.y>center.y,"Buttons must stay in screen top/bottom corners");
 assert.ok(bottomLeft.x<bottomRight.x&&bottomLeft.y===bottomRight.y);
}
console.log("V7.1.17 Half Ice camera, faces, controls and visible spawns verified.");
