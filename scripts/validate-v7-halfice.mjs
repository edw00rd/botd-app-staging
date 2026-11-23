import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
const shell=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
assert.match(app,/V7\.1\.25 Preview/);
assert.match(shell,/V7\.1\.25 Preview/);
assert.ok(app.includes('const V7_UI_VERSION="7.1.25"'));
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
env.v720GoalieCreaseSpawn=p=>({x:p.teamId==="A"?92:908,y:300});
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
 for(const teamId of ["A","B"]){
   const goalie={id:"goalie-"+teamId,teamId,role:"goalie",position:"G"};
   const goaliePos=env.v717HalfSpawnPoint(goalie);
   const g=env.v7IceGeometry(),line=teamId==="A"?g.goalLeft:g.goalRight;
   assert.ok(Math.abs(goaliePos.x-line)<g.scale*6,
     teamId+": goalie must stay inside its own crease");
   assert.equal(env.v717OnVisibleHalf(goaliePos),teamId===defender,
     side+": the away goalie is legitimately offscreen");
 }
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
console.log("V7.1.25 Half Ice camera, faces, controls and visible spawns verified.");


const v719Start=app.indexOf("function v719HalfCornerSlots(");
const v719End=app.indexOf("const v719PreviousEquipmentActionSlots=",v719Start);
assert.ok(v719Start>0&&v719End>v719Start,"new Half Ice control geometry present");
vm.runInNewContext(app.slice(v719Start,v719End),env,{timeout:1500});
for(const side of ["right","left"]){
  env.state.halfSide=side;
  for(const item of [{x:910,y:300,rotation:0,type:"net"},
     {x:845,y:220,rotation:52,type:"divider"},
     {x:745,y:360,rotation:90,type:"tire"}]){
    const center=v(item,side),s=env.v719HalfCornerSlots(item,side);
    const TL=v(s.topLeft,side),TR=v(s.topRight,side);
    const BL=v(s.bottomLeft,side),BR=v(s.bottomRight,side);
    assert.ok(TL.x<center.x&&TR.x>center.x&&TL.y<center.y&&BL.y>center.y,
      side+": object controls occupy visible corners");
    assert.ok(Math.abs((TL.x+TR.x)/2-center.x)<.001,side+": controls centered horizontally");
    assert.ok(Math.abs((TL.y+BL.y)/2-center.y)<.001,side+": controls centered vertically");
    assert.ok(Math.abs(TR.y-TL.y)<.001&&Math.abs(BR.x-TR.x)<.001,
      side+": object controls remain symmetric");
  }
  const bounds={x:side==="right"?730:130,y:175,width:135,height:165};
  const pair=env.v719HalfGroupControls(bounds,side),h=pair.view;
  assert.ok(h.rotate.y<h.label.y,side+": rotate above selection label");
  assert.ok(h.remove.x>h.rotate.x,side+": delete at visible right");
  assert.ok(Math.abs(h.rotate.x-h.label.x)<.001,side+": centered rotate control");
  for(const key of ["rotate","remove","label"]){
    const actual=v(pair.world[key],side);
    assert.ok(Math.abs(actual.x-h[key].x)<.001&&Math.abs(actual.y-h[key].y)<.001,
      side+": group handles round-trip through the camera");
  }
}
assert.ok(app.includes('outline.style.animation="none"'),"goalie outline CSS spin disabled");
assert.ok(app.includes("v719PreviousNetRotateHandle=v7NetRotateHandlePosition"),
  "net handle follows the displayed view");
console.log("V7.1.25 Half Ice goalie, puck, net, equipment and group controls verified.");



/* Placement must honor team/crease independently of camera. A far-end
   announcement must point toward the bottom of Half Ice, not relocate goalie. */
const goalieStart=app.indexOf("function v720GoalieCreaseCoordinates(");
const goalieEnd=app.indexOf("// Other placement paths",goalieStart);
assert.ok(goalieStart>0&&goalieEnd>goalieStart,"V7.1.25 goalie/announcement helpers missing");
const home={
 state:{view:"whole",halfSide:"right",ice:{creaseRadius:6},onIce:{}},
 v7IceGeometry:()=>({scale:4.8,centerX:500,centerY:300,goalLeft:73,goalRight:927}),
 v59ValidPoint:p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y),
 playerById:()=>null,
 round:(n,d=2)=>Number(n.toFixed(d)),Math
};
vm.runInNewContext(app.slice(goalieStart,goalieEnd),home,{timeout:1500});
for(const view of ["whole","half"])for(const side of ["left","right"]){
 home.state.view=view;home.state.halfSide=side;
 for(const team of ["A","B"]){
  const line=team==="A"?73:927,sign=team==="A"?1:-1;
  for(const index of [0,1,2,3,4,9]){
   const pos=home.v720GoalieCreaseCoordinates(team,index),radius=6*4.8;
   assert.ok((pos.x-line)*sign>0,team+" starts inside its own net");
   assert.ok(Math.hypot(pos.x-line,pos.y-300)<radius,
     "All goalies stay physically inside their own crease");
   const expected=view==="whole"||(side==="left"?team==="A":team==="B");
   const info=home.v720AnnouncementSpec({role:"goalie",teamId:team},pos,view,side);
   assert.equal(info.visible,expected,team+" "+view+" "+side+" visibility");
   assert.equal(info.edge,expected?"player":"bottom");
   if(!expected)assert.match(info.subtitle,/FAR (LEFT|RIGHT) CREASE · OFFSCREEN/);
  }
 }
}
assert.ok(app.includes('if(type==="goalie")return v720GoalieCreaseSpawn(player);'),
  "Half Ice goalie must bypass shared faceoff placement");
assert.ok(app.includes('const spawn=player.role==="goalie"?v720GoalieCreaseSpawn(player):'),
  "Every view must use a team-specific goalie crease");
assert.ok(app.includes('v720QueueAnnouncement(playerId)'),"Announcements for every person added");
assert.ok(app.includes('tip={x:round(cx,2),y:round(rect.bottom-5,2)}'),
  "Far-end arrow must point below the rink toward the actual player");
console.log("V7.1.25 goalie ownership and speech bubble pointers verified.");


/* V7.1.25: rounded chat-bubble shape and directional tails. This geometry
   is pure SVG and must remain stable for visible and far-end arrivals. */
const balloonStart=app.indexOf("function v720BubblePath(");
const balloonEnd=app.indexOf("function v720DrawAnnouncement(",balloonStart);
assert.ok(balloonStart>0&&balloonEnd>balloonStart,
  "Player entry speech-bubble generator must be present");
const balloon={clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),
  round:(n,p=2)=>Number(n.toFixed(p)),Math};
vm.runInNewContext(app.slice(balloonStart,balloonEnd),balloon,{timeout:1500});
for(const [w,h] of [[260,76],[166,76],[220,76]]){
  for(const [direction,tip] of [["down",{x:142,y:180}],
                                 ["up",{x:142,y:55}]]){
    const path=balloon.v720BubblePath(12,80,w,h,125,tip,direction);
    assert.match(path,/^M /,"Bubble starts with an SVG move");
    assert.match(path,/ Z$/,"Balloon silhouette must close");
    assert.ok((path.match(/C /g)||[]).length>=6,
      "Bubble body and directional tail use smooth cubic curves");
    assert.ok((path.match(/Q /g)||[]).length>=1,
      "Bubble tail has a soft curved tip, not a sharp triangular point");
    assert.doesNotMatch(path,/NaN|Infinity|undefined/,
      "All scaled and oriented speech bubbles use finite coordinates");
  }
}
assert.ok(app.includes('const w=Math.min(260,Math.max(166,rect.width-24)),h=76'),
  "The balloon has soft oval proportions rather than a flat box");
assert.ok(app.includes('fill:"#ffffff",stroke:"#c9ced3","stroke-width":2.2'),
  "Reference-style light fill and subtle gray outline must be applied");
assert.ok(!app.includes('group.append(svgEl("rect",{x:l+11,y:t+10,width:4,height:h-20'),
  "Reference balloon must not have a rectangular side accent");
assert.ok(app.includes('tip={x:round(cx,2),y:round(rect.bottom-5,2)};tail="down"'),
  "Offscreen arrivals keep the bottom edge and downward-pointing tail");
assert.ok(app.includes('tip={x:round(pixel.x,2),y:round(pixel.y+10,2)};tail="up"'),
  "Visible arrivals keep an upward-pointing tail when the bubble is beneath a player");
console.log("V7.1.25 oval speech balloons and curved directional tails verified.");

// V7.1.25: the remove pill is drawn with symmetric SVG geometry, not a
// font glyph whose baseline can drift when the Half Ice camera rotates.
const minusDraw=app.slice(app.indexOf("function v7MultiDraw(){"),
  app.indexOf("function v7MultiWorldPoint(",app.indexOf("function v7MultiDraw(){")));
assert.ok(minusDraw.includes('const minus=svgEl("line",{x1:del.x-5,y1:del.y,x2:del.x+5,y2:del.y,'),
  "Multi-select minus must be centered at the circle center in Full Ice");
assert.ok(minusDraw.includes('class:"v7-multi-minus"')&&
  minusDraw.includes('"stroke-linecap":"round"'),
  "Multi-select minus must use a round-capped SVG stroke");
const minusCamera=app.slice(app.indexOf("const v719PreviousFloatingSync=v7FloatingSync;"),
  app.indexOf("Object.assign(window.BOTD_TEST,{\n  v719HalfCornerSlots:"));
assert.ok(minusCamera.includes('world.querySelector(".v7-multi-minus")'),
  "Half Ice must find the centered minus in its floating-control layer");
assert.ok(minusCamera.includes('set(minus,{x:point.x-5,y:point.y},"x1","y1")')&&
  minusCamera.includes('set(minus,{x:point.x+5,y:point.y},"x2","y2")'),
  "Half Ice must recenter both ends of the minus around the delete control");
assert.ok(minusCamera.includes('minus.setAttribute("transform","rotate("+angle+'),
  "Half Ice must counterrotate the minus stroke to remain horizontal");
console.log("V7.1.25 centered multi-select remove stroke verified.");


/* V7.1.25: The Half Ice goalie number must be legible in either camera.
   Older passes rotate an individual numeral even when its pad is upright.
   Verify a final dedicated overlay corrects all text without touching pads. */
const v724Start=app.indexOf("function v724OrientGoalieContents(");
const v724End=app.indexOf("const v724PriorObjectRender=renderObjectLayer;",v724Start);
assert.ok(v724Start>0&&v724End>v724Start,"Goalie overlay helper missing");
const goalieOverlayTest={svgEl:(tag,attributes)=>({tag,attributes,children:[],
 append(node){this.children.push(node)}})};
vm.runInNewContext(app.slice(v724Start,v724End),goalieOverlayTest,{timeout:1000});
const makeVisualNode=(classes,children=[])=>({
 children,attrs:{transform:"rotate(-90 0 0)"},removed:[],
 classList:{contains:c=>classes.includes(c)},
 style:{removeProperty(prop){if(prop==="transform")this.cleared=true}},
 removeAttribute(key){this.removed.push(key);delete this.attrs[key]},
 querySelectorAll:selector=>selector==="text"?children.filter(c=>c.tag==="text"):[]
});
for(const angle of [-90,90]){
 const number=makeVisualNode(["token-number","goalie-token-number"]);
 const badgeLetter=makeVisualNode([]);badgeLetter.tag="text";
 const badge=makeVisualNode(["token-role-badge"],[badgeLetter]);
 const leadership=makeVisualNode(["token-leadership"]);
 const pad=makeVisualNode(["goalie-pad"]);
 const token={children:[pad,number,badge,leadership],nextSibling:{kind:"name"}};
 const group={insertBefore(node,at){this.layer=node;this.before=at}};
 const transform="rotate("+angle+") scale(0.36)";
 const layer=goalieOverlayTest.v724OrientGoalieContents(group,token,transform);
 assert.equal(layer.attributes.transform,transform,"Wrong camera orientation: "+angle);
 assert.equal(group.layer,layer,"Overlay is inserted into goalie group");
 assert.equal(group.before,token.nextSibling,"Overlay draws above body and below name");
 assert.deepEqual(Array.from(layer.children),[number,badge,leadership],
  "Only jersey number, G badge and leadership marks are separated");
 assert.ok(!layer.children.includes(pad),"Goalie body must not be moved");
 for(const child of [number,badge,badgeLetter,leadership]){
  assert.ok(child.removed.includes("transform"),"Legacy SVG rotation was not cleared");
  assert.equal(child.style.cleared,true,"Legacy CSS rotation was not cleared")
 }
}
assert.ok(app.includes('if(state.view!=="half")return result;'),
 "Full Ice must remain unchanged");
assert.ok(app.includes('if(playerById(group.dataset.playerId)?.role!=="goalie")continue'),
 "The fix must not affect skaters or coaches");
assert.ok(app.includes("v724OrientGoalieContents(group,token,transform)"),
 "The goalie overlay must run after all earlier render passes");
console.log("V7.1.25 left/right Half Ice goalie numerals and optional badges verified.");


/* V7.1.25: saved Half Ice initial state was rendered by the old goalie
   rotation pass because init() executes before the V7.1.17+ decorators.
   Validate the last boot refresh actually calls the FINAL renderer for
   both Half Ice camera sides, and leaves Full Ice untouched. */
{
 const firstInit=app.indexOf("\ninit();");
 const overlay=app.indexOf("const v724PriorObjectRender=renderObjectLayer;");
 const boot=app.indexOf("function v725RefreshInitialHalfIce(){");
 const scriptEnd=app.indexOf("\n</script>",boot);
 assert.ok(firstInit>0&&overlay>firstInit&&boot>overlay&&scriptEnd>boot,
  "The first-frame refresh must run after init and the final goalie renderer");
 const source=app.slice(boot,scriptEnd);
 for(const side of ["left","right"]){
  const calls=[],ctx={window:{__BOTD_READY:true},
   state:{view:"half",halfSide:side},ui:{playhead:3.5},
   renderFrame:time=>{calls.push(time)}};
  vm.runInNewContext(source,ctx,{timeout:1000});
  assert.deepEqual(calls,[3.5],side+" saved Half Ice must repaint on startup");
  assert.equal(ctx.v725RefreshInitialHalfIce(),true);
  assert.deepEqual(calls,[3.5,3.5],side+" must use the newest active render stack");
  ctx.state.view="whole";
  assert.equal(ctx.v725RefreshInitialHalfIce(),false);
  assert.deepEqual(calls,[3.5,3.5],"Full Ice must not repaint");
 }
 const pending={window:{__BOTD_READY:false},state:{view:"half",halfSide:"right"},
  ui:{playhead:2},renderFrame:()=>{throw new Error("Rendered before boot")}};
 vm.runInNewContext(source,pending,{timeout:1000});
 assert.equal(pending.v725RefreshInitialHalfIce(),false);
}
console.log("V7.1.25 initial Half Ice goalie startup repaint verified for both cameras.");
