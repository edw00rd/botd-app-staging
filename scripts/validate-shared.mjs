import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('private/app-v6.8.html.txt');
const shell=read('public/index.html');
assert.equal(crypto.createHash('sha256').update(app).digest('hex'),'c3b9b917e26c78fc274be1c181f8642a6ecb32d8bf9ac27aea758fe20e9095ab');
assert.equal(crypto.createHash('sha256').update(shell).digest('hex'),'6674ba61452f529a9c385dda1e50604323f4390fc9348b77c0927845b0509743');
assert.equal((app.match(/__BOTD_ACCOUNT_ID__/g)||[]).length,1);
for(const marker of ['.session.v6_8','.playbook.v6_8','botdHockeyCoachingAid.user.${BOTD_ACCOUNT_ID.toLowerCase()}','Version 6.8.1'])assert.ok(app.includes(marker));
for(const retired of ['US English','Canadian English','canadianize','canadaLeaf','canadianNote'])assert.ok(!app.includes(retired));
assert.equal((app.match(/en-CA/g)||[]).length,1);
const select=app.match(/<select id="languageSelect">([\s\S]*?)<\/select>/)[1];
assert.deepEqual([...select.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(x=>[x[1],x[2]]),[['en-US','English'],['sv','Swedish'],['fi','Finnish'],['ru','Russian']]);
const normalize=new Function(app.match(/const SUPPORTED_LANGUAGES[^\n]+/)[0]+'\n'+app.match(/function normalizeLanguage[^\n]+/)[0]+'; return normalizeLanguage;')();
for(const [input,expected] of [['en-CA','en-US'],['en-US','en-US'],['sv','sv'],['fi','fi'],['ru','ru'],['invalid','en-US'],[undefined,'en-US']])assert.equal(normalize(input),expected);
for(const marker of [
 'id="headerSubscription"',
 'id="editorActions"',
 'id="shellNewButton"',
 'id="shellSaveButton"',
 'id="fullscreenButton"',
 'postEditorCommand("new-board")',
 'postEditorCommand("save-play")',
 'command, ...detail',
 'payload.type !== "editor-ready"',
])assert.ok(shell.includes(marker),`Missing shell header marker: ${marker}`);
assert.ok(!shell.includes('class="app-status"'));
const masthead=shell.match(/<header class="masthead">([\s\S]*?)<\/header>/)?.[1]||'';
assert.ok(masthead,'Missing consolidated masthead');
const headerOrder=['id="headerSubscription"','id="editorActions"','id="headerActions"','id="fullscreenButton"'];
let previous=-1;
for(const marker of headerOrder){const position=masthead.indexOf(marker);assert.ok(position>previous,`Incorrect masthead order: ${marker}`);previous=position;}
assert.match(masthead,/id="fullscreenButton"[\s\S]*?<\/button>\s*$/);
assert.ok(masthead.indexOf('Version 6.8.1')<masthead.indexOf('id="headerSubscription"'));
assert.ok(shell.includes('id="headerSubscription" class="brand-subscription hidden" aria-live="polite"'));
assert.ok(shell.includes('.app-view{position:fixed;inset:64px 0 0'));
assert.ok(shell.includes('@media(max-width:800px)')&&shell.includes('.app-view{inset:60px 0 0}'));
for(const marker of [
 'Version 6.8.2 step 2 — shell-integrated maximum-viewport header.',
 '.topbar{display:none!important}',
 '#fullscreenBottomBtn{display:none!important}',
 'const BOTD_SHELL_MESSAGE_SOURCE="botd-shell"',
 'command==="new-board"',
 'command==="save-play"',
 'command==="set-focus-mode"',
 'type:"editor-ready"',
])assert.ok(app.includes(marker),`Missing editor shell-bridge marker: ${marker}`);
for(const html of [app,shell]){const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);new Function(scripts[0][1]);}
for(const [mode,url,ref] of [['staging','https://staging.botdhockey.com','dolbsnodupgppvwnnlgd'],['production','https://app.botdhockey.com','stcobnlzdbkoakgvfaez']]) {
 const c=JSON.parse(read(mode==='staging'?'wrangler.jsonc':'wrangler.production.jsonc'));
 assert.equal(c.name,'botd-app-'+mode);assert.equal(c.main,'src/worker.js');assert.equal(c.workers_dev,false);assert.equal(c.preview_urls,false);assert.equal(c.keep_vars,true);
 assert.deepEqual(c.vars,{ENVIRONMENT:mode,APP_URL:url,SUPABASE_URL:`https://${ref}.supabase.co`});
}
assert.equal(JSON.parse(read('package.json')).version,'6.8.1');
assert.ok(read('supabase/01_production_schema.sql').includes('check (livemode = true)'));
assert.ok(read('supabase/staging/02_staging_safety.sql').includes('check (livemode = false)'));
for(const p of ['package-lock.json','RELEASE_PROCEDURE.md','scripts/deploy-gate.mjs','scripts/install-staging.py'])assert.ok(fs.existsSync(path.join(root,p)));
function scan(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true})){
 if(['node_modules','.git','.wrangler'].includes(x.name))continue;
 const p=path.join(dir,x.name);if(x.isDirectory()){scan(p);continue;}if(/\.(png|webp|zip)$/.test(x.name))continue;
 assert.ok(!(/^\.env/.test(x.name)&&x.name!=='.env.example'||/^\.dev.vars/.test(x.name)),'Local environment file present');
 const t=fs.readFileSync(p,'utf8');for(const pattern of [/sk_(?:live|test)_[A-Za-z0-9]{12,}/g,/whsec_[A-Za-z0-9]{12,}/g,/sb_secret_[A-Za-z0-9]{12,}/g])for(const m of t.matchAll(pattern))assert.ok(m[0].includes('REPLACE'),'Possible secret in '+p);
}}
scan(root);console.log('Shared release validation passed: editor integrity, locale behavior, environment configurations, schema references and source scan.');
