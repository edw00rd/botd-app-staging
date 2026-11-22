import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
assert.match(app,/V7\.1\.21 Preview/);
assert.ok(app.includes('if(state.display.positions)addBadge(token,"G",22,-26)'),
  "Goalie G position pill must follow the Positions setting");
assert.ok(app.includes('if(state.display.numbers&&p.number)'),
  "Goalie jersey number must stay independent from Positions");

const createDialog=app.slice(app.indexOf('id="v716PositionField"'),app.indexOf('id="v716LineField"'));
const rosterFields=app.slice(app.indexOf("function renderRoster()"),app.indexOf("function renderPlaybook()"));
for(const position of ["F1","F2","F3"]){
  const pattern=new RegExp("<option>"+position+"</option>");
  assert.match(createDialog,pattern,"New roster position selector must include "+position);
  assert.match(rosterFields,pattern,"Existing roster position selector must include "+position);
}
assert.match(app,/\(\{F1:"LW",F2:"C",F3:"RW"\}\)\[player\.position\]/,
  "Half Ice spawn must map new forward positions to faceoff lanes");

const node=(tag,attributes={})=>({
  tag,attributes,children:[],
  append(...children){this.children.push(...children)}
});
const layer={children:[],set innerHTML(_){this.children=[]},append(node){this.children.push(node)}};
const player={
 id:"G1",teamId:"A",name:"Goalie Test",role:"goalie",position:"G",
 number:"35",line:0,hand:"LH",captain:false,alternate:false
};
const state={
 onIce:{G1:{x:100,y:300}},
 display:{numbers:true,positions:false,leadership:false,names:false}
};
const ctx={
 $:selector=>selector==="#objectLayer"?layer:null,
 state,ui:{selectedType:null,selectedId:null,possessionTargetId:null},
 svgEl:node,round:(n,p=2)=>Number(n.toFixed(p)),
 playerById:id=>id==="G1"?player:null,
 playerPositionAt:()=>({x:100,y:300}),
 playerColors:()=>({primary:"#111111",trim:"#ffffff",numbers:"#ffffff"}),
 setGlowStyle:()=>{},
 tokenLabelParts:()=>[],
 console
};
const begin=app.indexOf("function renderObjectLayer(time){");
const end=app.indexOf("function renderPuckLayer(time",begin);
assert.ok(begin>0&&end>begin,"Original token renderer must be present");
vm.runInNewContext(app.slice(begin,end)+"\nthis.drawTokens=renderObjectLayer;",ctx,{timeout:1200});
const count=klass=>{
 const find=(element)=>+(String(element.attributes?.class||"").split(/\s+/).includes(klass))+
   (element.children||[]).reduce((sum,child)=>sum+find(child),0);
 return layer.children.reduce((sum,item)=>sum+find(item),0);
};
ctx.drawTokens(0);
assert.equal(count("token-role-badge"),0,"Goalie G pill must be absent when Positions is off");
assert.equal(count("goalie-token-number"),1,"Goalie jersey number must remain when Numbers is on");
state.display.positions=true;
ctx.drawTokens(0);
assert.equal(count("token-role-badge"),1,"Goalie G pill must appear when Positions is on");
assert.equal(count("goalie-token-number"),1);
state.display.numbers=false;
ctx.drawTokens(0);
assert.equal(count("token-role-badge"),1,"Position visibility must not depend on Numbers");
assert.equal(count("goalie-token-number"),0);
state.display.positions=false;
ctx.drawTokens(0);
assert.equal(count("token-role-badge"),0);
assert.equal(count("goalie-token-number"),0);

// F1 / F2 / F3 are first-class skater positions in ordering.
const orderStart=app.indexOf("function teamBenchOrderKey(");
const orderEnd=app.indexOf("function teamBenchSort(",orderStart);
assert.ok(orderStart>0&&orderEnd>orderStart);
const sortContext={
 state:{rosters:{A:[]}},
 teamBenchGoalieIndex:()=>0
};
vm.runInNewContext(app.slice(orderStart,orderEnd)+"\nthis.key=teamBenchOrderKey;",sortContext,{timeout:1200});
const values={};
for(const pos of ["LW","C","RW","F1","F2","F3"]){
 const id="skater_"+pos,person={id,teamId:"A",name:id,role:"skater",position:pos,line:1};
 sortContext.state.rosters.A.push(person);
 values[pos]=sortContext.key(person);
}
for(const [alias,traditional] of [["F1","LW"],["F2","C"],["F3","RW"]]){
 assert.equal(values[alias][0],values[traditional][0],alias+" must stay in a forward line group");
 assert.equal(values[alias][1],values[traditional][1],alias+" must use equivalent forward bench ordering");
}
console.log("V7.1.21 goalie position visibility and F1/F2/F3 roster behavior passed.");
