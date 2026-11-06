import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const source=fs.readFileSync(path.join(root,"src/worker.js"),"utf8")
  .replace(/^import APP_HTML from .*?;\s*/, 'const APP_HTML="<body>__BOTD_ACCOUNT_ID__</body>";\n')
  + "\nexport {handleCloudPlaybooks};\n";
const temp=path.join(root,`.cloud-smoke-${process.pid}.mjs`);
fs.writeFileSync(temp,source);
let originalFetch=globalThis.fetch;
try {
  const {handleCloudPlaybooks}=await import(pathToFileURL(temp).href);
  class TestError extends Error { constructor(status,code,message){super(message);this.status=status;this.code=code;} }
  const uid="11111111-1111-4111-8111-111111111111";
  const bookId="33333333-3333-4333-8333-333333333333";
  const playId="44444444-4444-4444-8444-444444444444";
  let subscribed=true,stale=false;
  const calls=[];
  globalThis.fetch=async (url,init={})=>{
    const u=new URL(url),name=u.pathname.split("/").pop();
    calls.push({path:u.pathname,params:u.searchParams.toString(),method:init.method||"GET",headers:new Headers(init.headers),body:init.body?JSON.parse(init.body):null});
    if(name==="botd_playbooks"){
      if(init.method==="POST")return Response.json([{id:bookId,name:JSON.parse(init.body).name,revision:1}]);
      return Response.json([{id:bookId,name:"U13 Playbook",revision:1}]);
    }
    if(name==="botd_playbook_entries")return Response.json([{play_id:playId,sort_order:0,botd_plays:{id:playId,title:"Forecheck",revision:1}}]);
    if(name==="botd_plays")return Response.json([{id:playId,title:"Forecheck",revision:1,content:{name:"Forecheck",timeline:{movements:[]}}}]);
    if(name==="botd_teams")return Response.json([]);
    if(name==="botd_cloud_create_play")return Response.json([{play_id:playId,revision:1}]);
    if(name==="botd_cloud_update_play")return Response.json(stale?[]:[{play_id:playId,revision:2}]);
    throw new Error("Unexpected Supabase call: "+u.pathname);
  };
  const deps={
    AppError:TestError,
    requireSession:async()=>({user:{id:uid},accessToken:"test-jwt",cookieHeaders:[]}),
    userHasCoachProAccess:async()=>subscribed,
    assertSupabaseDataConfig:()=>{},
    jsonResponseWithCookies:(value,status)=>Response.json(value,{status}),
  };
  const env={SUPABASE_URL:"https://test.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_publishable_fake"};
  const req=(method,p,body)=>new Request("https://staging.botdhockey.com"+p,{
    method,...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})
  });
  async function call(method,p,body){
    return handleCloudPlaybooks(req(method,p,body),env,p,deps);
  }
  async function rejection(thunk,status,code){
    await assert.rejects(thunk,error=>error.status===status&&error.code===code);
  }
  subscribed=false;
  await rejection(()=>call("GET","/api/cloud/playbooks"),403,"coach_subscription_required");
  subscribed=true;
  const list=await call("GET","/api/cloud/playbooks");
  assert.equal(list.status,200);
  assert.equal((await list.json()).playbooks[0].name,"U13 Playbook");
  assert.ok(!calls.at(-1).params.includes("content"),"Metadata listing must not transfer play JSON");
  assert.equal(calls.at(-1).headers.get("Authorization"),"Bearer test-jwt");
  const created=await call("POST","/api/cloud/playbooks",{name:"  U15 Tactics  "});
  assert.equal(created.status,201);
  assert.equal(calls.at(-1).body.owner_id,uid);
  const saved=await call("POST","/api/cloud/plays",{
    playbookId:bookId,title:"Breakout",kind:"drill",
    content:{name:"Breakout",timeline:{movements:[]}}
  });
  assert.equal(saved.status,201);
  assert.equal((await saved.json()).play.play_id,playId);
  assert.equal(calls.at(-1).body.p_playbook_id,bookId);
  assert.equal(calls.at(-1).body.p_kind,"drill");
  assert.ok(!calls.at(-1).headers.get("apikey").startsWith("sb_secret_"));
  const metadata=await call("GET",`/api/cloud/playbooks/${bookId}/plays`);
  assert.equal((await metadata.json()).plays.length,1);
  assert.ok(!calls.at(-1).params.includes("content"));
  const loaded=await call("GET",`/api/cloud/plays/${playId}`);
  assert.equal((await loaded.json()).play.content.name,"Forecheck");
  const revised=await call("PUT",`/api/cloud/plays/${playId}`,{
    title:"New Forecheck",expectedRevision:1,content:{name:"New Forecheck"}
  });
  assert.equal((await revised.json()).play.revision,2);
  assert.equal(calls.at(-1).body.p_expected_revision,1);
  stale=true;
  await rejection(()=>call("PUT",`/api/cloud/plays/${playId}`,{
    title:"Stale edit",expectedRevision:1,content:{name:"Stale"}
  }),409,"revision_conflict");
  await rejection(()=>call("POST","/api/cloud/plays",{playbookId:bookId,title:"X",content:{big:"x".repeat(270000)}}),413,"play_too_large");
  await rejection(()=>call("POST","/api/cloud/plays",{playbookId:"invalid",title:"X",content:{}}),400,"invalid_id");
  await rejection(()=>call("GET","/api/cloud/not-a-route"),404,"not_found");
  console.log("Cloud playbook API tests passed: paid-only, owner JWT, metadata, CRUD, revisions, limits.");
} finally {
  globalThis.fetch=originalFetch;
  fs.rmSync(temp,{force:true});
}
