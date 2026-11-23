import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app=fs.readFileSync(new URL("../private/app-v6.8.html.txt",import.meta.url),"utf8");
assert.match(app,/V7\.1\.25 Preview/);
assert.match(app,/id="v716PersonName"[^>]*required/);
assert.match(app,/id="v716PersonRole"/);
assert.match(app,/id="v716RosterDialog"/);
assert.match(app,/addEventListener\("click",v716OpenRosterDialog\)/);
assert.ok(!app.includes('name:"New Skater"'),"No unnamed roster placeholders should be inserted");
assert.match(app,/root\.appendChild\(card\)\}v716RosterFinalizeCards\(\)/);
assert.match(app,/!v716IsStaff\(player\)&&player\.number/);
assert.match(app,/p\.number="";p\.line=0/);
const start=app.indexOf("/* V7.1.16 — Validate before creating");
const end=app.indexOf("/* V7.1.17 — Half Ice",start);
assert.ok(start>0&&end>start,"Roster helpers missing");
const helpers=app.slice(start,end);
const members=[];
const values={
 v716PersonName:{value:"",setCustomValidity(message){this.error=message},reportValidity(){this.reported=true},focus(){this.focused=true}},
 v716RosterForm:{reportValidity:()=>true},
 v716PersonTeam:{value:"A"},
 v716PersonRole:{value:"skater"},
 v716PersonPosition:{value:"LW"},
 v716PersonLine:{value:"2"},
 v716PersonNumber:{value:"52"},
 v716PersonHand:{value:"LH"},
 v716Captain:{checked:false},
 v716Alternate:{checked:false},
 v716UseCustomColors:{checked:false},
 v716Primary:{value:"#aabbcc"},
 v716Trim:{value:"#112233"},
 v716NumberColor:{value:"#ffffff"},
 v716RosterDialog:{close(){this.closed=true}},
 rosterTeamSelect:{value:"A"},
 rosterSearch:{value:"old search"}
};
const state={rosters:{A:members,B:[]}};
let saved=0, rendered=0;
const context={
 state,ui:{playhead:0},uid:()=>"A_new",
 teamById:id=>({id,name:id==="A"?"Alpha":"Beta"}),
 $:selector=>{const key=selector.slice(1);assert.ok(values[key],"Unknown selector "+selector);return values[key]},
 $$:()=>[],
 renderRoster:()=>rendered++,renderBenches:()=>rendered++,renderFrame:()=>rendered++,
 scheduleSave:()=>saved++,toast:()=>{},confirm:()=>true,setTimeout:()=>{},
 contrastText:()=>"#ffffff",v7pcHexColor:(x,f)=>x||f,
 Option:class{},console
};
vm.runInNewContext(helpers,context,{timeout:1500});
assert.equal(context.v716IsStaff({role:"coach"}),true);
assert.equal(context.v716IsStaff({role:"manager"}),true);
assert.equal(context.v716IsStaff({role:"goalie"}),false);
values.v716PersonName.value="   ";
context.v716SaveRosterMember({preventDefault(){}});
assert.equal(members.length,0,"Whitespace-only names must not be accepted");
assert.equal(saved,0,"Invalid form must not persist");
values.v716PersonName.value="Bench Coach";
values.v716PersonRole.value="coach";
values.v716Captain.checked=true;
values.v716Alternate.checked=true;
context.v716SaveRosterMember({preventDefault(){}});
assert.equal(members.length,1);
assert.equal(members[0].name,"Bench Coach");
assert.equal(members[0].position,"COACH");
assert.equal(members[0].number,"","Coaches cannot have roster numbers");
assert.equal(members[0].line,0);
assert.equal(members[0].captain,false);
assert.equal(members[0].alternate,false);
assert.equal(values.rosterSearch.value,"","New member must be visible despite an earlier search");
assert.equal(values.v716RosterDialog.closed,true);
values.v716PersonName.value="  Alex   Example  ";
values.v716PersonRole.value="skater";
values.v716Captain.checked=true;
values.v716Alternate.checked=false;
context.v716SaveRosterMember({preventDefault(){}});
assert.equal(members.length,2);
assert.equal(members[1].name,"Alex Example");
assert.equal(members[1].position,"LW");
assert.equal(members[1].number,"52");
assert.equal(members[1].line,2);
assert.equal(members[1].hand,"LH");
assert.equal(members[1].captain,true);
values.v716PersonName.value="Goal Tender";
values.v716PersonRole.value="goalie";
values.v716Captain.checked=false;
context.v716SaveRosterMember({preventDefault(){}});
assert.equal(members[2].position,"G");
assert.equal(members[2].line,0);
const initialSaved=saved;
values.v716PersonName.value="Two Alternates";
values.v716PersonRole.value="skater";
values.v716Alternate.checked=true;
state.rosters.A.push({alternate:true},{alternate:true});
context.v716SaveRosterMember({preventDefault(){}});
assert.equal(saved,initialSaved,"Third alternate should not be saved");
console.log("V7.1.17 roster creation and number-free staff regression tests passed.");
