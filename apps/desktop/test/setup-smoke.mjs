import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const desktop=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(desktop,'../..'),require=createRequire(import.meta.url);
const stage=process.argv[2]||'development';
assert.ok(['development','packaged','dev-server'].includes(stage),'Unknown smoke stage');
assert.ok(fs.existsSync(path.join(desktop,'out/main/index.js')),'Build the desktop before running setup smoke');
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+stage;
const output=path.join(root,'test-results/slice2',runId),profile=path.join(output,'profile');
fs.mkdirSync(profile,{recursive:true});
const report={stage,runId,tests:[],runtime:[],limitations:['No valid authorized provider key is available. Authenticated connectivity, successful tool-calling and a live Ready handoff remain UNVERIFIED.','Synthetic invalid placeholders exercise encrypted credential storage only; they are never represented as working API credentials.','Offline fallback and safe-storage-unavailable behavior are covered separately by isolated tests; this smoke observes real network retrieval and persisted-cache reuse.']};
let child,server,socket,id=0,nonce='',logs='';
const pending=new Map(),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(fn,ms=20000){const end=Date.now()+ms;while(Date.now()<end){const value=await fn();if(value)return value;await delay(80)}throw new Error('Observation deadline exceeded')}
function rpc(type,ms=65000){return new Promise((resolve,reject)=>{const seq=++id,timer=setTimeout(()=>{pending.delete(seq);reject(new Error('Smoke command timed out: '+type))},ms);pending.set(seq,{resolve,reject,timer});socket.write(JSON.stringify({id:seq,type})+'\n')})}
async function test(name,fn){const item={name,status:'FAIL',observed:null};report.tests.push(item);try{item.observed=await fn();item.status=item.observed?.status==='UNVERIFIED'?'UNVERIFIED':'PASS';console.log(item.status+' '+name)}catch(error){item.observed={error:error.message};console.error('FAIL '+name+': '+error.message);throw error}}
async function launch(){
  const pipe='\\\\.\\pipe\\flowproof-slice2-'+crypto.randomUUID();nonce=crypto.randomBytes(32).toString('hex');socket=undefined;
  server=net.createServer(connection=>{let authenticated=false,buffer='';connection.on('error',()=>{});connection.on('data',data=>{buffer+=data;let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let message;try{message=JSON.parse(line)}catch{connection.destroy();return}if(!authenticated){if(message.type!=='hello'||message.nonce!==nonce||socket){connection.destroy();return}authenticated=true;socket=connection;continue}const request=pending.get(message.id);if(request){clearTimeout(request.timer);pending.delete(message.id);message.error?request.reject(new Error(message.error)):request.resolve(message.result)}}})});
  await new Promise(resolve=>server.listen(pipe,resolve));
  const env={...process.env,FLOWPROOF_SMOKE_PIPE:pipe,FLOWPROOF_SMOKE_NONCE:nonce,FLOWPROOF_SMOKE_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;
  const npmEntry=process.env.npm_execpath||path.join(process.env.APPDATA||'','npm/node_modules/npm/bin/npm-cli.js');
  const executable=stage==='dev-server'?process.execPath:stage==='packaged'?(process.env.FLOWPROOF_PACKAGED_EXE||path.join(desktop,'dist/win-unpacked/FlowProof AI.exe')):require('electron');
  const args=stage==='dev-server'?[npmEntry,'run','dev']:stage==='packaged'?[]:[desktop];
  child=spawn(executable,args,{cwd:stage==='dev-server'?root:desktop,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  child.stdout.on('data',bytes=>{logs+=bytes});child.stderr.on('data',bytes=>{logs+=bytes});child.on('error',()=>{logs+='\nOwned application launch failed.'});
  await wait(()=>socket,30000);
  const state=await rpc('state');report.runtime.push(state.runtime);
  assert.equal(state.utility,'ready');assert.ok(state.runtime.utilityPid>0&&state.runtime.utilityPid!==state.runtime.pid);assert.equal(state.runtime.isPackaged,stage==='packaged');
  await wait(async()=>{const ui=await rpc('ui');return ui.ready==='true'?ui:null});
  return state;
}
async function stop(){
  if(child&&child.exitCode===null){await rpc('quit');await wait(()=>child.exitCode!==null,12000);assert.equal(child.exitCode,0)}
  socket?.destroy();socket=undefined;
  await new Promise(resolve=>server?server.close(resolve):resolve());server=undefined;
}
const keyState=s=>s.credentials.find(c=>c.providerId==='openai')?.status;
const assertSafe=s=>assert.equal(s.returnedSyntheticSecret,false,'Stored secret must never return through the Renderer bridge');
try{
  await test('desktop-and-provider-utility-launch',async()=>{const s=await launch();const ui=await rpc('ui');assert.equal(ui.node,'undefined');assert.equal(ui.require,'undefined');assert.ok(ui.api.includes('setup'));assert.equal(await rpc('setup-invalid-ipc'),true);return {runtime:s.runtime,preload:ui.api,invalidPayloadsRejected:true}});
  await test('real-models-dev-catalog-through-utility',async()=>{let s=await rpc('setup-catalog');let attempts=1;if(!s.catalog){s=await rpc('setup-catalog');attempts=2;}assertSafe(s);assert.ok(s.catalog,s.catalogError||'No actual Models.dev snapshot');assert.ok(s.catalog.count>100);assert.ok(s.catalog.providerCount>6);assert.ok(s.catalog.supportedCount>0&&s.catalog.supportedCount<s.catalog.count);assert.ok(s.catalog.toolCount>0);assert.equal(s.catalog.idsValid,true);assert.equal(s.catalog.source,'network');assert.deepEqual(s.providers.map(p=>p.id).sort(),['openai','anthropic','google','openrouter','deepseek','groq'].sort());return {catalog:s.catalog,adapters:s.providers,explicitCatalogAttempts:attempts}});
  await test('actual-catalog-row-click-persists-a-valid-selection',async()=>{
    await rpc('setup-ui-open');await wait(async()=>{const ui=await rpc('setup-ui');return ui.dialog&&ui.currentStep===1&&ui.modelRows>0&&!ui.busy?ui:null});
    assert.equal(await rpc('setup-ui-filter-installed'),true);await wait(async()=>{const ui=await rpc('setup-ui');return ui.modelRows>0&&!ui.busy?ui:null});
    const clicked=await wait(()=>rpc('setup-ui-select-model'));assert.ok(clicked?.name,'An actual catalog row must be clicked');
    const ui=await wait(async()=>{const current=await rpc('setup-ui');return !current.busy&&(current.error||current.selectedModelRows>0)?current:null});
    const persisted=await rpc('setup-catalog');assertSafe(persisted);
    assert.equal(ui.error,'','Actual catalog-row selection failed: '+JSON.stringify({error:ui.error,busy:ui.busy,persistedSelection:persisted.selection}));
    assert.ok(persisted.selection,'A model chosen through the actual UI must reach Main persistence');assert.equal(ui.selectedModelRows,1);assert.equal(ui.busy,false);
    await rpc('setup-ui-close');await wait(async()=>!(await rpc('setup-ui')).dialog);
    return {clicked,persistedSelection:persisted.selection,genericErrorAbsent:true,busyCleared:true};
  });
  await test('stable-selection-and-missing-key-blocker',async()=>{const selected=await rpc('setup-select');assertSafe(selected);assert.equal(selected.selection.providerId,'openai');const checked=await rpc('setup-verify');assertSafe(checked);assert.equal(checked.verification?.status,'missing-key');assert.equal(checked.verification?.toolCalling,false);return {selection:selected.selection,verification:checked.verification}});
  await test('real-os-backed-save-replace-status',async()=>{let s=await rpc('setup-save-key');assertSafe(s);assert.equal(s.secureStorageAvailable,true,s.error||'OS-backed encryption unavailable');assert.ok(['configured','verification-required'].includes(keyState(s)),s.error||'Key not configured');s=await rpc('setup-replace-key');assertSafe(s);assert.ok(['configured','verification-required'].includes(keyState(s)));const scan=await rpc('setup-profile-secret-scan');assert.equal(scan.plaintextFound,false);assert.ok(scan.filesChecked>0);return {secureStorageAvailable:s.secureStorageAvailable,credentialStatus:keyState(s),plaintextScan:scan}});
  await test('real-ai-sdk-invalid-key-request-is-never-ready',async()=>{
    await rpc('setup-ui-open');await wait(async()=>{const ui=await rpc('setup-ui');return ui.dialog&&!ui.busy?ui:null});await rpc('setup-ui-connect');await wait(async()=>{const ui=await rpc('setup-ui');return ui.currentStep===1&&!ui.busy?ui:null});
    assert.equal(await rpc('setup-ui-test-connection'),true,'The actual UI Test connection button must be enabled');
    const feedback=await wait(async()=>{const ui=await rpc('setup-ui');return !ui.busy&&(ui.verificationMessage||ui.error)?ui:null},65000);
    assert.equal(feedback.error,'','Provider errors must return a safe verification result, not a desktop transport error');assert.ok(feedback.verificationMessage);assert.equal(feedback.busy,false);
    const s=await rpc('setup-catalog');assertSafe(s);await rpc('setup-ui-close');await wait(async()=>!(await rpc('setup-ui')).dialog);assert.ok(s.verification,'No verification result');assert.notEqual(s.verification.status,'ready');assert.equal(s.verification.toolCalling,false);assert.equal(s.verification.expiresAt,null);if(['network','timeout','rate-limited'].includes(s.verification.status))return {status:'UNVERIFIED',reason:'The real UI-triggered SDK request could not establish an authentication response in this environment.',uiFeedback:feedback.verificationMessage,busyCleared:!feedback.busy,verification:s.verification};assert.equal(s.verification.status,'authentication');return {verification:s.verification,uiFeedback:feedback.verificationMessage,busyCleared:!feedback.busy}});
  await test('remove-invalid-key-before-local-wizard-checks',async()=>{const s=await rpc('setup-remove-key');assertSafe(s);assert.equal(keyState(s),'missing');return {credentialStatus:keyState(s),subsequentChecksRequireNoPaidModelRequest:true};});
  await test('blank-fields-and-public-target-path-rejected',async()=>{const s=await rpc('setup-review-invalid-fields');assertSafe(s);assert.equal(s.review?.ready,false);assert.equal(s.review?.handoff,null);assert.equal(s.review?.checks.find(c=>c.id==='fields')?.status,'failed');assert.equal(s.review?.checks.find(c=>c.id==='target')?.status,'failed');assert.equal(s.review?.checks.find(c=>c.id==='authorization')?.status,'failed');return {checks:s.review.checks};});
  await test('localhost-checks-and-explicit-authorization-gate',async()=>{let s=await rpc('setup-save-draft');assertSafe(s);assert.equal(s.draft.projectName,'Slice 2 smoke project');s=await rpc('setup-review-no-authorization');assertSafe(s);assert.equal(s.review?.ready,false);assert.equal(s.review?.handoff,null);assert.equal(s.review?.checks.find(c=>c.id==='authorization')?.status,'failed');assert.equal(s.review?.checks.find(c=>c.id==='target')?.status,'passed');assert.equal(s.review?.checks.find(c=>c.id==='model')?.status,'failed');const runtime=await rpc('state');assert.equal(runtime.connected,false);return {checks:s.review.checks,noNativeAuditCreated:!runtime.connected}});
  await test('actual-model-search-and-setup-ui',async()=>{
    await rpc('setup-ui-open');await wait(async()=>{const s=await rpc('setup-ui');return s.dialog?s:null});await rpc('setup-ui-connect');
    const before=await wait(async()=>{const s=await rpc('setup-ui');return s.currentStep===1&&s.modelRows>0&&!s.busy?s:null});
    assert.equal(await rpc('setup-ui-search-empty'),true);
    const empty=await wait(async()=>{const s=await rpc('setup-ui');return s.modelRows===0?s:null});
    assert.equal(await rpc('setup-ui-search-reset'),true);await wait(async()=>{const s=await rpc('setup-ui');return s.modelRows>0?s:null});
    assert.equal(await rpc('setup-ui-filter'),true);const filtered=await wait(async()=>{const s=await rpc('setup-ui');return s.toolFilter&&s.filteredRowsAllToolCapable?s:null});assert.equal(filtered.toolFilter,true);assert.equal(filtered.filteredRowsAllToolCapable,true);
    const capture=await rpc('capture');assert.ok(capture.bytes>1000);
    await rpc('resize');const resized=await wait(async()=>{const s=await rpc('setup-ui');return s.windowWidth===1100?s:null});assert.ok(resized.bodyWidth<=resized.windowWidth+1,'Setup should not cause horizontal document overflow');assert.equal(resized.dialogFits,true,'Model discovery dialog must fit the resized desktop');
    return {before:{providerRows:before.providerRows,modelRows:before.modelRows},emptyRows:empty.modelRows,filtered:{rows:filtered.modelRows,toolFilter:filtered.toolFilter,allRowsToolCapable:filtered.filteredRowsAllToolCapable},capture,resized:{width:resized.windowWidth,height:resized.windowHeight,dialogFits:resized.dialogFits}};
  });
  await test('actual-configure-review-consent-and-dismissal-ui',async()=>{
    await rpc('setup-ui-configure');const configured=await wait(async()=>{const s=await rpc('setup-ui');return s.currentStep===2&&!s.busy?s:null});
    assert.equal(configured.projectName,'Slice 2 smoke project');assert.equal(configured.goal,'Check the owned localhost page without starting an autonomous audit.');assert.equal(configured.context,'Mechanical setup validation only.');assert.equal(configured.path,'/');assert.ok(Number(configured.port)>0);assert.equal(configured.dialogFits,true,'Configure dialog must fit the desktop');
    await rpc('setup-ui-review');const review=await wait(async()=>{const s=await rpc('setup-ui');return s.currentStep===3&&s.readinessChecks===8&&!s.busy?s:null});
    assert.equal(review.authorization,false,'Audit consent must start unchecked');assert.ok(review.failedChecks>0);assert.equal(review.prepareDisabled,true,'Unverified model must not prepare an audit');assert.equal(review.dialogFits,true,'Review dialog must fit the desktop');assert.match(review.text,/Autonomous execution becomes available in Slice 3/);const capture=await rpc('capture');
    assert.equal(await rpc('setup-ui-authorize'),true);const authorized=await wait(async()=>{const s=await rpc('setup-ui');return s.authorization===true&&!s.busy?s:null});assert.equal(authorized.prepareDisabled,true,'Consent alone must never bypass missing credentials');
    await rpc('setup-ui-close');await wait(async()=>!(await rpc('setup-ui')).dialog);const dismissed=await rpc('setup-catalog');assertSafe(dismissed);assert.equal(dismissed.review,null,'Closing setup must clear activation/readiness authority immediately');assert.equal(dismissed.verification,null);
    await rpc('setup-ui-open');const reopened=await wait(async()=>{const s=await rpc('setup-ui');return s.currentStep===3&&s.readinessChecks===8&&!s.busy?s:null});assert.equal(reopened.authorization,false,'Reopened draft must never restore audit consent');assert.equal(reopened.prepareDisabled,true);
    const runtime=await rpc('state');assert.equal(runtime.connected,false);await rpc('setup-ui-close');await wait(async()=>!(await rpc('setup-ui')).dialog);
    return {configured:{projectName:configured.projectName,goal:configured.goal,target:'http://localhost:'+configured.port+configured.path,dialogFits:configured.dialogFits},review:{checks:review.readinessChecks,failedChecks:review.failedChecks,authorization:review.authorization,prepareDisabled:review.prepareDisabled,dialogFits:review.dialogFits},capture,dismissalClearedReview:true,reopenedAuthorization:reopened.authorization,noNativeAuditCreated:!runtime.connected};
  });
  await test('restart-restores-selection-draft-encrypted-key-and-cache',async()=>{
    const saved=await rpc('setup-save-key');assertSafe(saved);assert.equal(keyState(saved),'configured');const before=await rpc('setup-load');await rpc('setup-dismiss');await stop();await launch();const after=await rpc('setup-load');assertSafe(after);assert.deepEqual(after.selection,before.selection);assert.deepEqual(after.draft,before.draft);assert.ok(['configured','verification-required'].includes(keyState(after)));assert.equal(after.verification,null);assert.equal(after.review,null);const cached=await rpc('setup-catalog');assertSafe(cached);assert.equal(cached.catalog?.source,'cache');assert.equal(cached.catalog?.fetchedAt,before.catalog?.fetchedAt);return {selection:after.selection,draftRestored:true,credentialStatus:keyState(after),verification:after.verification,review:after.review,catalog:cached.catalog};
  });
  await test('credential-removal-and-future-handoff-remain-blocked',async()=>{let s=await rpc('setup-remove-key');assertSafe(s);assert.equal(keyState(s),'missing');s=await rpc('setup-prepare');assertSafe(s);assert.equal(s.review?.ready,false);assert.equal(s.review?.handoff,null);assert.equal(s.review?.checks.find(c=>c.id==='credentials')?.status,'failed');assert.equal(s.review?.checks.find(c=>c.id==='target')?.status,'passed');assert.equal(s.review?.checks.find(c=>c.id==='authorization')?.status,'passed');const scan=await rpc('setup-profile-secret-scan');assert.equal(scan.plaintextFound,false);assert.equal(logs.includes('flowproof-smoke-invalid-placeholder-not-a-real-key-'),false,'Credentials must not appear in application logs');return {checks:s.review.checks,plaintextScan:scan,secretFreeDiagnostics:true}});
  await test('authenticated-live-tool-roundtrip-and-ready-handoff',async()=>({status:'UNVERIFIED',reason:'No valid authorized provider test key is configured; no authenticated model success or Ready handoff is claimed.'}));
  await test('owned-main-and-utility-cleanup',async()=>{const runtime=(await rpc('state')).runtime;await stop();await delay(300);let utilityRunning=true;try{process.kill(runtime.utilityPid,0)}catch{utilityRunning=false}assert.equal(utilityRunning,false);return {mainExited:true,utilityExited:true}});
}catch(error){report.fatal=error.message;process.exitCode=1;if(!report.runtime.length)console.error(logs.replaceAll(nonce,'[REDACTED]').slice(-6000));}
finally{
  if(child?.exitCode===null){try{await stop()}catch{child.kill();socket?.destroy();server?.close()}}
  for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error('Owned smoke cleanup'))}pending.clear();
  report.finishedAt=new Date().toISOString();report.summary={pass:report.tests.filter(t=>t.status==='PASS').length,fail:report.tests.filter(t=>t.status==='FAIL').length,unverified:report.tests.filter(t=>t.status==='UNVERIFIED').length};
  const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const sources=['package.json','package-lock.json','apps/desktop/package.json','apps/desktop/electron.vite.config.ts','apps/desktop/electron-builder.yml','apps/desktop/src/main/index.ts','apps/desktop/src/main/setup.ts','apps/desktop/src/main/credentials.ts','apps/desktop/src/main/agent-supervisor.ts','apps/desktop/src/main/smoke-control.ts','apps/desktop/test/setup-smoke.mjs','apps/desktop/src/preload/index.ts','apps/desktop/src/preload/setup-request.ts','apps/desktop/src/utility/index.ts','apps/desktop/src/renderer/App.tsx','apps/desktop/src/renderer/SetupDialog.tsx','apps/desktop/src/renderer/setup-errors.ts','apps/desktop/src/renderer/styles.css','apps/desktop/src/renderer/setup.css','packages/contracts/src/setup.ts','packages/ai-providers/package.json','packages/ai-providers/src/index.ts','packages/ai-providers/src/catalog.ts','packages/ai-providers/src/registry.ts','packages/ai-providers/src/preflight.ts','packages/persistence/package.json','packages/persistence/src/index.ts'];
  report.sourceSha256=Object.fromEntries(sources.filter(file=>fs.existsSync(path.join(root,file))).map(file=>[file,sha(path.join(root,file))]));
  if(stage==='packaged'){const exe=process.env.FLOWPROOF_PACKAGED_EXE||path.join(desktop,'dist/win-unpacked/FlowProof AI.exe');if(fs.existsSync(exe))report.artifacts={executable:path.relative(root,exe),executableSha256:sha(exe),asarSha256:sha(path.join(path.dirname(exe),'resources/app.asar'))};}
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('SETUP_SMOKE_REPORT: '+path.relative(root,path.join(output,'report.json')));console.log(JSON.stringify(report.summary));
}
