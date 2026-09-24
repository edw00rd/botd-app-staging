import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('private/app-v6.8.html.txt');
const shell=read('public/index.html');
assert.equal(crypto.createHash('sha256').update(app).digest('hex'),'caa0137cdae9047a17be5ea235c220ee9b8f512ac425682b482fec3f15e8aad9');
assert.equal(crypto.createHash('sha256').update(shell).digest('hex'),'439a2449a8a7be02b883101b3aa79cad4694a554af47c07dc3b54970f434ad39');
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
 'id="headerSubscriptionText"',
 'id="headerSecureLock"',
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
assert.ok(shell.includes('id="headerSubscriptionText" class="brand-subscription-text"'));
assert.ok(shell.includes('id="headerSecureLock" class="header-secure-lock hidden" role="img" aria-label="Secure access" title="Secure access"'));
assert.ok(!shell.includes('COACH PRO · SECURE ACCESS'));
assert.ok(!shell.includes('class="stage-badge"'));
assert.match(shell,/id="headerSubscriptionText"[\s\S]*?id="headerSecureLock"/);
assert.ok(shell.includes('elements.headerSecureLock.classList.toggle("hidden", !text || !secure)'));
assert.ok(shell.includes('setHeaderSubscription(`${planName(subscription?.plan)} active${renewal}`, "normal", true)'));
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

for(const marker of [
 'Version 6.8.2 step 3A — workspace controls, edit-mode Glow/Blink, and full-screen setup access.',
 'Step 3A.3 keeps the original independent rink controls in a zero-height floating layer so the rink uses the full stage height.',
 'id="rinkStatusStrip"',
 'id="telestrationTools"',
 'class="command-left"',
 'class="command-right"',
 'body.focus-mode .left-drawer{display:flex!important}',
 'body.focus-mode .drawer-edge-left{display:grid!important}',
 '.command-left::-webkit-scrollbar,.command-right::-webkit-scrollbar{display:none}',
 'function v682SyncTelestrationTools()',
 'glow.blink===true&&!ui.playing',
 'class:"v682-underglow"',
 'statusStripOutsideRink',
 'statusStripOverlayParent',
 'function v682FitRinkWithFloatingControls()',
 'rinkControlLayout:v682RinkControlLayout',
 'toolbarOrder:',
])assert.ok(app.includes(marker),`Missing workspace-polish marker: ${marker}`);
for(const id of ['rinkStatusStrip','viewBadge','halfEndPill','offsideLight','commandBar','toolbarPlayback','telestrationTools','timelineToggleBtn']){
  assert.equal((app.match(new RegExp(`id=\"${id}\"`,'g'))||[]).length,1,`Expected one #${id}`)
}
const rinkShellStart=app.indexOf('<div class="rink-shell">');
const statusStart=app.indexOf('<div class="rink-status-strip" id="rinkStatusStrip"');
const rinkFrameStart=app.indexOf('<div class="rink-frame whole" id="rinkFrame">');
assert.ok(rinkShellStart>0&&rinkShellStart<statusStart&&statusStart<rinkFrameStart,'Rink status strip must be a sibling overlay inside rink shell and outside rink frame');
assert.ok(app.includes('.rink-status-strip{position:absolute;left:0;right:0;top:0;height:0')&&app.includes('background:transparent;box-shadow:none;pointer-events:none;overflow:visible}'),'Rink controls must use a zero-height transparent floating layer');
assert.ok(!app.includes('.rink-status-strip{flex:0 0 31px'),'Rink status controls must not reserve a flex row');
assert.ok(!app.includes('flex-basis:29px'),'Responsive rink status controls must not reserve a row');
assert.ok(!app.includes('<span class="rink-control-label">ICE VIEW</span>'),'The added ICE VIEW toolbar label must remain removed');
assert.ok(app.includes('.rink-status-strip .offside-light::before,.rink-status-strip .offside-light::after{content:none!important'),'Offside status must render as the original compact dot');
for(const id of ['viewBadge','halfEndPill','offsideLight']){
  const position=app.indexOf(`id="${id}"`);
  assert.ok(position>statusStart&&position<rinkFrameStart,`#${id} must remain in the floating off-ice status layer`)
}
for(const marker of ['function v682RinkControlLayout()','function v682FitRinkWithFloatingControls()','shell.dataset.rinkControlPlacement=placement','stripHeight:round(strip.getBoundingClientRect().height,2)','viewOverlapsRink:','offsideOverlapsRink:'])assert.ok(app.includes(marker),`Missing no-reservation rink-control marker: ${marker}`);
const commandStart=app.indexOf('<div class="command-bar" id="commandBar">');
const timelineStart=app.indexOf('<section class="timeline-dock"',commandStart);
assert.ok(commandStart>0&&timelineStart>commandStart,'Missing command toolbar region');
const command=app.slice(commandStart,timelineStart);
const commandOrder=['class="command-left"','id="toolbarPlayback"','class="command-right"'];
let commandPrevious=-1;
for(const marker of commandOrder){const position=command.indexOf(marker);assert.ok(position>commandPrevious,`Incorrect bottom toolbar order: ${marker}`);commandPrevious=position;}
const telestrationStart=command.indexOf('id="telestrationTools"');
const telestrationEnd=command.indexOf('</div>',telestrationStart);
assert.ok(telestrationStart>0&&telestrationEnd>telestrationStart,'Missing conditional telestration control group');
for(const marker of ['data-tool="erase"','id="markerSwatch"','id="clearDrawingBtn"']){
  const position=command.indexOf(marker);assert.ok(position>telestrationStart&&position<telestrationEnd,`${marker} must remain inside conditional telestration controls`)
}
assert.ok(command.indexOf('id="timelineToggleBtn"')>command.indexOf('class="command-right"'),'Timeline toggle must remain in the far-right toolbar group');


for(const marker of [
 'Version 6.8.2 step 3A.4 — centered radial underglow only.',
 '.v682-underglow-layer{stroke:none',
 '.v682-edit-blink .v682-underglow{animation:v682EditGlowBlink',
 'function v682UnderglowStrength(brightness)',
 'function v682UnderglowGeometry(isPuck,player,strength)',
 'function v682GlowBlurFilter(id,stdDeviation)',
 'function v682UnderglowLayer(className,paintId,filterId,rx,ry,cy,opacity)',
 'svgEl("radialGradient"',
 'svgEl("feGaussianBlur"',
 'node.insertBefore(underglow,node.firstChild)',
 'glowUnderglowState:',
])assert.ok(app.includes(marker),`Missing centered-underglow marker: ${marker}`);
assert.ok(!app.includes('v682-glow-halo'),'Retired perimeter-halo rendering must remain removed');
const underglowStart=app.indexOf('let v682UnderglowPaintSerial=0;');
const underglowEnd=app.indexOf('Object.assign(window.BOTD_TEST,{',underglowStart);
assert.ok(underglowStart>0&&underglowEnd>underglowStart,'Missing final underglow renderer');
const underglow=app.slice(underglowStart,underglowEnd);
for(const layer of ['v682-underglow-haze','v682-underglow-bloom','v682-underglow-core'])assert.ok(underglow.includes(`v682UnderglowLayer("${layer}"`),`Missing ${layer}`);
assert.equal((underglow.match(/v682UnderglowLayer\("v682-underglow-/g)||[]).length,3,'Underglow must use exactly three centered radial layers');
assert.ok(underglow.includes('stroke:"none"'),'Underglow shapes must not draw perimeter strokes');
assert.ok(!underglow.includes('stroke-width'),'Underglow renderer must not trace the player or puck outline');
assert.ok(underglow.includes('underglow.style.opacity=".035"'),'Playback Blink must pulse only the underglow layer');
assert.ok(underglow.includes('node.insertBefore(underglow,node.firstChild)'),'Underglow must render beneath the unchanged player or puck artwork');


for(const marker of [
 'Version 6.8.2 step 3A.5 — stronger calibrated underglow and direct Pointer Events slider dragging.',
 'const normalized=clamp((Number(brightness)-10)/90,0,1);return Math.pow(normalized,.72)',
 'const coreOpacity=.14+strength*.72,bloomOpacity=.08+strength*.58,hazeOpacity=.025+strength*.34;',
 'const coreScale=.98+strength*.28,bloomScale=1.18+strength*.68,hazeScale=1.5+strength;',
 'height:44px!important;',
 'margin:-10px 0!important;',
 'touch-action:none!important;',
 'function v682StartGlowRangeDrag(event)',
 'input.setPointerCapture(event.pointerId)',
 'event.getCoalescedEvents?event.getCoalescedEvents():[event]',
 'window.addEventListener("pointermove",v682MoveGlowRangeDrag,{capture:true,passive:false})',
 'window.addEventListener("pointercancel",event=>v682FinishGlowRangeDrag(event,{cancel:true}),{capture:true,passive:false})',
 'v682SetupGlowRangeEvents();',
 'glowRangeControlState:',
])assert.ok(app.includes(marker),`Missing Step 3A.5 calibration/slider marker: ${marker}`);
assert.ok(app.includes('.v63-glow-editor input[type="range"][data-v61-glow="brightness"]'),'Glow intensity must keep a native range input with an enlarged hit surface');
assert.ok(app.includes('.v63-glow-editor input[type="range"][data-v61-glow="rate"]'),'Blink rate must keep a native range input with an enlarged hit surface');
assert.ok(app.includes('document.addEventListener("keydown",event=>{if(event.target.matches?.(v682GlowRangeSelector()))'),'Glow and Blink ranges must retain native keyboard interaction and visual synchronization');
assert.ok(app.includes('input.dispatchEvent(new Event("input",{bubbles:true,composed:true}))'),'Pointer dragging must emit continuous input updates');
assert.ok(app.includes('input.dispatchEvent(new Event("change",{bubbles:true,composed:true}))'),'Pointer release must commit a change event');
for(const marker of [
 'Version 6.8.2 step 3A.6 — nested Glow/Blink controls and tablet label restoration.',
 '@media(min-width:721px) and (max-width:1180px){.command-right .route-toggle span{display:inline!important}}',
 'blinkHidden:',
])assert.ok(app.includes(marker),`Missing Step 3A.6 editor marker: ${marker}`);
assert.ok(command.includes('<label class="route-toggle"><input id="toolbarRoutes" type="checkbox" checked><span>Routes</span></label>'),'Routes checkbox must retain a visible label');
assert.ok(!app.includes('.command-right .route-toggle span{display:none}'),'Tablet layout must not hide the Routes label');
for(const marker of [
 '@media(max-width:1180px){.header-actions{min-width:0}.header-meta{display:block;',
 '.header-meta{max-width:96px;flex-basis:96px}',
 'const accountLabel = authenticated ? data.user.email : "";',
 'elements.headerMeta.title = accountLabel;',
 'elements.headerMeta.setAttribute("aria-label", `Signed in as ${accountLabel}`)',
])assert.ok(shell.includes(marker),`Missing Step 3A.6 shell marker: ${marker}`);
assert.ok(!shell.includes('@media(max-width:1180px){.header-meta{display:none}}'),'Tablet layout must not hide the signed-in account');
const strengthAt=value=>Math.pow(Math.max(0,Math.min(1,(value-10)/90)),.72);
const lowStrength=strengthAt(10),defaultStrength=strengthAt(70),maxStrength=strengthAt(100);
assert.ok(.14+lowStrength*.72<=.141&&.025+lowStrength*.34<=.026,'Low underglow must remain subtle');
assert.ok(.14+defaultStrength*.72>.67&&.08+defaultStrength*.58>.5,'Default underglow must be materially stronger than Step 3A.4');
assert.ok(.14+maxStrength*.72>.859&&.08+maxStrength*.58>.659,'Maximum underglow must retain a stronger top end');

for(const marker of [
 'Version 6.8.2 step 3A.2 — compact conditional Glow/Blink controls and icon cleanup.',
 'class="v682-glow-intensity',
 'data-v61-glow="brightness"',
 'aria-label="Glow intensity"',
 'function v682RememberGlowPreset(kind,id,source)',
 'else if(glowKey==="brightness")v63UpdateGlowSetting(editor,"brightness",target.value)',
 'compactGlowControls:',
])assert.ok(app.includes(marker),`Missing compact-controls marker: ${marker}`);
const finalGlowStart=app.indexOf('function v67GlowMarkup(kind,id){');
const finalGlowEnd=app.indexOf('v63GlowMarkup=v67GlowMarkup;',finalGlowStart);
assert.ok(finalGlowStart>0&&finalGlowEnd>finalGlowStart,'Missing final Glow editor implementation');
const finalGlow=app.slice(finalGlowStart,finalGlowEnd);
assert.ok(!finalGlow.includes('v63-glow-time'),'Glow toolbar must not show scope/timing text');
assert.ok(!app.includes('function v67GlowStatus(kind,id,clip)'),'Obsolete Glow timing-status function must remain removed');
assert.ok(finalGlow.includes('class="v682-glow-intensity ${enabled?"":"v61-hidden"}"'),'Glow intensity slider must be conditional on Glow');
assert.ok(finalGlow.includes('class="${enabled?"":"v61-hidden"}" data-v61-glow-dependent="enabled"'),'Blink checkbox must be nested under Glow');
assert.ok(finalGlow.includes('class="v61-glow-rate ${enabled&&blink?"":"v61-hidden"}"'),'Blink-rate slider must require both Glow and Blink');
assert.ok(finalGlow.includes('class="v61-glow-rate-out ${enabled&&blink?"":"v61-hidden"}"'),'Blink-rate readout must require both Glow and Blink');
assert.ok(finalGlow.includes('class="v61-glow-color"'),'Glow color selector must remain compact and available');
assert.ok(app.includes('brightness.classList.toggle("v61-hidden",!enabled)'));
assert.ok(app.includes('blinkLabel?.classList.toggle("v61-hidden",!enabled)'));
assert.ok(app.includes('rate?.classList.toggle("v61-hidden",!(enabled&&blink))'));
assert.ok(app.includes('out?.classList.toggle("v61-hidden",!(enabled&&blink))'));
assert.ok(!app.includes('<span class="branch-label">PUCK ROUTE</span>'),'Visible PUCK ROUTE label must remain removed');
assert.ok(app.includes('id="timelineTakeSelect" aria-label="Puck route" title="Puck route"'),'Puck-route selector must retain an accessible label');
const eraserButton=command.match(/<button class="tool-btn" data-tool="erase"[\s\S]*?<\/button>/)?.[0]||'';
assert.ok(eraserButton.includes('aria-label="Eraser"')&&eraserButton.includes('class="v682-tool-icon"'),'Eraser must use the matching icon treatment');
assert.ok(!eraserButton.includes('⌫'),'Legacy eraser glyph must remain removed');
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
