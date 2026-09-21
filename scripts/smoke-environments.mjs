import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const temp=path.join(root,`.environment-smoke-${process.pid}.mjs`);
fs.writeFileSync(temp,fs.readFileSync(path.join(root,'src/worker.js'),'utf8').replace(/^import APP_HTML from .*?;\s*/, 'const APP_HTML="<!doctype html><body>__BOTD_ACCOUNT_ID__</body>";\n')+'\nexport {assertStripeConfig,isExpectedPrice,environmentLabel};');
const original=globalThis.fetch;
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw new Error('Unexpected external call');};
try {
 const {default:worker,assertStripeConfig,isExpectedPrice,environmentLabel}=await import(pathToFileURL(temp));
 for(const mode of ['staging','production']) {
  const config=JSON.parse(fs.readFileSync(path.join(root,mode==='staging'?'wrangler.jsonc':'wrangler.production.jsonc')));
  const live=mode==='production';
  const env={...config.vars,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+ 'x'.repeat(40),SUPABASE_SECRET_KEY:'sb_secret_'+'x'.repeat(40),STRIPE_SECRET_KEY:(live?'sk_live_':'sk_test_')+'x'.repeat(40),STRIPE_WEBHOOK_SECRET:'whsec_'+'x'.repeat(40),STRIPE_PRICE_MONTHLY:'price_monthly',STRIPE_PRICE_ANNUAL:'price_annual',ASSETS:{fetch:async()=>new Response('<!doctype html><body>Account screen</body>',{headers:{'Content-Type':'text/html'}})}};
  assert.doesNotThrow(()=>assertStripeConfig(env));
  assert.throws(()=>assertStripeConfig({...env,STRIPE_SECRET_KEY:(live?'sk_test_':'sk_live_')+'x'.repeat(40)}),/selected environment/);
  const price={active:true,livemode:live,type:'recurring',currency:'usd',unit_amount:999,recurring:{interval:'month',interval_count:1}};
  assert.equal(isExpectedPrice(price,'monthly',env),true);
  for(const invalid of [{...price,livemode:!live},{...price,livemode:undefined},{...price,unit_amount:1},{...price,active:false},{...price,recurring:{interval:'year'}}]) assert.equal(isExpectedPrice(invalid,'monthly',env),false);
  const publicResponse=await worker.fetch(new Request(env.APP_URL),env,{});
  assert.equal(publicResponse.status,200);
  assert.equal((await publicResponse.text()).includes('STAGING · TEST MODE'),!live);
  assert.equal(environmentLabel('<body>Editor</body>',env).includes('STAGING · TEST MODE'),!live);
  for(const bad of [{...env,ENVIRONMENT:'unknown'},{...env,SUPABASE_URL:live?'https://dolbsnodupgppvwnnlgd.supabase.co':'https://stcobnlzdbkoakgvfaez.supabase.co'},{...env,APP_URL:live?'https://staging.botdhockey.com':'https://app.botdhockey.com'}]) {
   const response=await worker.fetch(new Request(env.APP_URL+'/api/auth/signin',{method:'POST',body:'{}'}),bad,{});
   assert.equal(response.status,503);
  }
  // Valid signature, wrong-mode event: reject before any Stripe/DB request.
  const payload=JSON.stringify({id:'evt_wrong_mode',type:'customer.subscription.updated',livemode:!live,data:{object:{id:'sub_wrong_mode'}}});
  const timestamp=Math.floor(Date.now()/1000);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${payload}`))).toString('hex');
  const response=await worker.fetch(new Request(env.APP_URL+'/api/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':`t=${timestamp},v1=${signature}`},body:payload}),env,{});
  assert.equal(response.status,400);assert.equal((await response.json()).error,'stripe_mode_mismatch');
 }
 assert.equal(networkCalls,0);
 console.log('Environment isolation, wrong-mode signed webhooks, price validation and staging labels passed. No external requests.');
} finally {globalThis.fetch=original;fs.unlinkSync(temp);}
