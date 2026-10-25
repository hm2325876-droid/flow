const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const exec = promisify(execFile);
const stage = process.argv[2] || 'development';
const selectedCase = process.env.FP_LAB_ONLY || null;
const root = path.resolve(__dirname, '..');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + stage;
const report = { schema_version: 2, run_id: runId, stage, selected_case: selectedCase, candidate_status: 'PROVISIONAL', started_at: new Date().toISOString(), command: `${selectedCase?'FP_LAB_ONLY='+selectedCase+' ':''}npm run test:${stage === 'packaged' ? 'packaged' : 'dev'}`, host: { platform: process.platform, arch: process.arch, release: os.release(), node: process.version }, tests: [], limitations: ['Diagnostic integration, not the FlowProof application or complete Agent runtime.', 'Win32 SendInput exercises the OS/native input path; actual human hardware, IME composition, accessibility, touch and drag/drop remain manual gates.', 'Business effects are enforced against an explicit trusted diagnostic route catalog, not automatically inferred for arbitrary applications.', 'Unsigned unpacked Windows distribution; installer, signing, ASAR integrity enforcement and upgrade lifecycle are not validated.'] };
const ledger = { effects: 0, slowStarted: 0, slowDone: 0, danger: 0, unknown: 0, authRequests: 0, requests: [], sessions: new Set() };
const sensitiveValues=new Set();
let server, outside, pipe, control, child, browser, page, ready, connection, unauthenticatedPipeRejected=false;
const messages = [], pending = new Map(); let sequence = 0;
const wait = async (predicate, timeout = 10000) => { const start = Date.now(); while (Date.now()-start < timeout) { const value = await predicate(); if (value) return value; await new Promise(r => setTimeout(r,35)); } throw new Error('Bounded observation deadline expired'); };
const rpc = (command, args = {}) => new Promise((resolve,reject) => { const id=++sequence; const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Control RPC timeout: '+command));},15000); pending.set(id,{resolve,reject,timer}); control.write(JSON.stringify({id,command,...args})+'\n'); });
const native = () => rpc('read');
async function test(id, setup, expected, action, limitations = []) {
  if(selectedCase && selectedCase!==id)return;
  const item = { id, category: id.split('-')[0], setup: { stage, configuration: 'src/host.cjs + src/cdp-bridge.cjs; pinned package-lock', precondition: setup }, expected, observed: null, evidence: [], limitations, status: 'FAIL' };
  const started=Date.now(), eventStart=messages.length;
  try { item.observed = await action(); item.status = item.observed?.status === 'INCONCLUSIVE' ? 'INCONCLUSIVE' : 'PASS'; }
  catch(error) { item.observed={ error: String(error.message).split('\n').slice(0,7).join('\n'), ...(error.observation?{measurements:error.observation}:{}) }; }
  item.duration_ms=Date.now()-started;
  item.evidence = messages.slice(eventStart).filter(m=>m.event==='lab-event').map(m=>m.data);
  report.tests.push(item); console.log(JSON.stringify({id,status:item.status,observed:item.observed}));
}
async function connect() {
  connection = await rpc('connection');
  sensitiveValues.add(connection.token);
  browser = await chromium.connectOverCDP(connection.endpoint,{headers:{Authorization:'Bearer '+connection.token},noDefaults:true,timeout:12000});
  page = await wait(() => browser.contexts().flatMap(c=>c.pages()).find(p=>!p.isClosed() && p.url().startsWith(ready.target)));
  page.setDefaultTimeout(5000);
}
async function leased(action) {
  const lease = await rpc('begin');
  try { const result=await action(); await rpc('finish',{lease,outcome:'observed-complete'}); return result; }
  catch(error) { await rpc('finish',{lease,outcome:'unknown'}).catch(()=>{}); throw error; }
}
async function returnAgent() { await rpc('refresh-state');const result=await rpc('return',{expectedEffects:ledger.effects,ackGeneration:(await rpc('snapshot')).generation}); assert.equal(result.accepted,true); return result; }
async function osInput(selector, action, text='') {
  await rpc('show'); const point = await rpc('point',{selector});
  const {stdout}=await exec('pwsh',['-NoProfile','-File',path.join(__dirname,'native-input.ps1'),'-Hwnd',ready.hwnd,'-Action',action,'-X',String(point.x),'-Y',String(point.y),'-ActivateX',String(point.activateX),'-ActivateY',String(point.activateY),'-Text',text],{timeout:15000,windowsHide:true});
  return JSON.parse(stdout.trim());
}
function guestHtml() { return `<!doctype html><meta charset="utf-8"><style>body{font:18px Segoe UI;padding:18px;background:#fffdf6}button,input{font:inherit;margin:8px;padding:8px}#pulse{width:18px;height:18px;background:#58754b;animation:p 1s infinite}@keyframes p{50%{transform:translateX(150px)}}</style><h2>Bounded browser mechanics lab</h2><div><input id="agent-field" placeholder="Agent input"><button id="agent-button" onclick="document.querySelector('#agent-count').textContent++">Agent counter</button><output id="agent-count">0</output></div><div><input id="manual" placeholder="Native user input"><button id="physical" onclick="document.querySelector('#physical-count').textContent++">Native counter</button><output id="physical-count">0</output></div><div><button id="login" onclick="fetch('/auth/login',{method:'POST'}).then(refresh)">Synthetic sign in</button><button id="logout" onclick="fetch('/auth/logout',{method:'POST'}).then(refresh)">Sign out</button><output id="auth">unknown</output></div><div><button id="effect" onclick="fetch('/effect',{method:'POST'}).then(refresh).catch(()=>{})">Approved effect</button><button id="slow" onclick="fetch('/slow-effect',{method:'POST'}).then(refresh).catch(()=>{})">Slow effect</button><button id="danger" onclick="fetch('/danger',{method:'POST'}).catch(()=>{})">Restricted effect</button><output id="effects">0</output></div><div id="pulse"></div><div style="height:1400px">Scroll area</div><script>window.__labInputRoute=[];for(const type of ['pointerdown','click','keydown','beforeinput','input'])document.addEventListener(type,e=>{window.__labInputRoute.push({type,target:e.target.id||e.target.tagName,x:e.clientX,y:e.clientY});window.__labInputRoute=window.__labInputRoute.slice(-12)},true);async function refresh(){const s=await fetch('/state').then(r=>r.json());document.querySelector('#auth').textContent=s.authenticated?'authenticated':'anonymous';document.querySelector('#effects').textContent=s.effects}refresh();</script>`; }
async function start() {
  outside=http.createServer((_req,res)=>{ ledger.requests.push('outside');res.end('reachable'); }); await new Promise(r=>outside.listen(0,'127.0.0.1',r));
  server=http.createServer((req,res)=>{
    const pathname = new URL(req.url,'http://localhost').pathname; ledger.requests.push(pathname);
    const cookie=req.headers.cookie||''; const token=cookie.match(/lab_session=([^;]+)/)?.[1];
    if(pathname==='/auth/login'){const value=crypto.randomUUID();sensitiveValues.add(value);ledger.sessions.add(value);res.setHeader('Set-Cookie','lab_session='+value+'; HttpOnly; SameSite=Strict; Path=/');ledger.authRequests++;res.end('ok');return;}
    if(pathname==='/auth/logout'){ledger.sessions.delete(token);res.setHeader('Set-Cookie','lab_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/');res.end('ok');return;}
    if(pathname==='/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({authenticated:ledger.sessions.has(token),effects:ledger.effects}));return;}
    if(pathname==='/effect'){ledger.effects++;res.end('done');return;}
    if(pathname==='/slow-effect'){ledger.slowStarted++;setTimeout(()=>{ledger.effects++;ledger.slowDone++;res.end('done');},550);return;}
    if(pathname==='/danger'){ledger.danger++;res.end('danger');return;}
    if(pathname==='/unknown-effect'){ledger.unknown++;res.end('unknown');return;}
    if(pathname==='/redirect-out'){res.writeHead(302,{Location:`http://127.0.0.1:${outside.address().port}/escaped`});res.end();return;}
    res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');res.end(guestHtml());
  }); await new Promise(r=>server.listen(0,'localhost',r));
  const target=`http://localhost:${server.address().port}/`;
  const pipeName=`\\\\.\\pipe\\flowproof-lab-${crypto.randomUUID()}`;
  const bootstrap=crypto.randomBytes(32).toString('hex');sensitiveValues.add(bootstrap);
  pipe=net.createServer(socket=>{
    if(control){socket.destroy();return;}
    let buffer='',verified=false;socket.on('data',data=>{
      buffer+=data;if(buffer.length>262144){socket.destroy();return;}let end;
      while((end=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let m;try{m=JSON.parse(line)}catch{socket.destroy();return;}
        if(!verified){if(m.event!=='hello'||m.token!==bootstrap){socket.destroy();return;}verified=true;control=socket;continue;}
        messages.push(m);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.result);}
      }
    });
  }); await new Promise(r=>pipe.listen(pipeName,r));
  unauthenticatedPipeRejected=await new Promise(resolve=>{const attempt=net.connect(pipeName,()=>attempt.write(JSON.stringify({event:'hello',token:'invalid-bootstrap'})+'\n'));const timer=setTimeout(()=>{attempt.destroy();resolve(false)},1500);attempt.on('close',()=>{clearTimeout(timer);resolve(true)});attempt.on('error',()=>{});});
  const raw=net.createServer();await new Promise(r=>raw.listen(0,'127.0.0.1',r));const rawPort=raw.address().port;await new Promise(r=>raw.close(r));
  const executable=stage==='packaged'?path.join(root,'out','win-unpacked','FlowProof Feasibility Lab.exe'):require('electron');
  if(!fs.existsSync(executable))throw new Error('Packaged lab executable not present: build:win must complete first');
  const args=stage==='packaged'?[]:[path.join(root,'src','host.cjs')]; args.push('--remote-debugging-port='+rawPort);
  const env={...process.env,FP_LAB_TARGET:target,FP_LAB_PIPE:pipeName,FP_LAB_BOOTSTRAP:bootstrap,FP_LAB_PROFILE:path.join(os.tmpdir(),'flowproof-lab-'+runId)};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;
  child=spawn(executable,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});
  const logs=[];child.stderr.on('data',d=>logs.push(String(d).replace(/Bearer\s+\S+/g,'Bearer [REDACTED]')));
  ready=await wait(()=>messages.find(m=>m.event==='ready')?.data,20000);ready.rawPort=rawPort;
  report.runtime={...ready.runtime,isPackaged:ready.isPackaged,asar:ready.asar,executable_sha256:crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex'),...(stage==='packaged'?{asar_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'out','win-unpacked','resources','app.asar'))).digest('hex')}:{})};
  report.target={url:target,origin:new URL(target).origin,synthetic:true};
  await connect();
}
(async()=>{
 try {
  await start();
  await test('identity-same-native-target','One native guest, isolated partition, scoped CDP bridge','CDP target maps to the exact view WebContents; no duplicate audit page',async()=>{
    const c=await browser.newBrowserCDPSession(); const {targetInfos}=await c.send('Target.getTargets');const nativeId=await rpc('identity',{targetId:targetInfos[0].targetId});assert.equal(targetInfos.length,1);assert.equal(nativeId.mapped,nativeId.guest);return {targetCount:targetInfos.length,identityMatches:true};
  });
  await test('session-authentication-reload','Synthetic HttpOnly SameSite=Strict sign-in; native reads and server ledger independent of Playwright','Authenticated server state, native cookie and scoped context API agree after reload',async()=>leased(async()=>{
    await page.locator('#login').click();await wait(async()=> (await native()).auth==='authenticated');
    const cookies=await page.context().cookies(ready.target);const summary=await rpc('session-summary');assert.ok(cookies.some(c=>c.name==='lab_session'&&c.httpOnly));assert.equal(summary.auditHasAuth,true);assert.equal(summary.uiHasAuth,false);assert.ok(ledger.authRequests>0);
    await page.reload();await wait(async()=> (await native()).auth==='authenticated');return {serverAcceptedAuthentication:true,nativeAuditCookie:true,uiCookie:false,playwrightCookieCount:cookies.filter(c=>c.name==='lab_session').length,reloadAuthenticated:true};
  }),['Controlled local auth contract; OAuth, WebAuthn, CHIPS and cross-origin auth are not covered.']);
  await test('session-adapter-cookie-mutation','Same partition-scoped adapter; synthetic HttpOnly cookie','Context add/read/clear APIs modify only the actual audit partition; clearing removes authentication and a new explicit sign-in restores it',async()=>leased(async()=>{
    await page.context().addCookies([{url:ready.target,name:'lab_adapter',value:'synthetic-marker',httpOnly:true,sameSite:'Strict'}]);const s=await rpc('session-summary');assert.equal(s.adapterCookie.length,1);assert.equal(s.adapterCookie[0].httpOnly,true);assert.equal(s.adapterCookie[0].sameSite,'strict');assert.equal(s.uiHasAuth,false);await page.context().clearCookies();const cleared=await rpc('session-summary');assert.equal(cleared.auditHasAuth,false);assert.equal(cleared.adapterCookie.length,0);await page.reload();await wait(async()=>(await native()).auth==='anonymous');await page.locator('#login').click();await wait(async()=>(await native()).auth==='authenticated');return {nativeHttpOnlyAttribute:true,sameSiteStrict:true,uiUntouched:true,clearRemovedAuth:true,explicitSignInRestored:true};
  }),['Controlled host/path/SameSite cookie set; CHIPS, persistent partition migration and arbitrary cookie-domain behavior remain unvalidated.']);
  await test('session-storage-native-consistency','Same guest and partition before/after reload','Playwright writes are independently visible in native DOM/storage and survive reload',async()=>leased(async()=>{
    await page.evaluate(()=>{sessionStorage.setItem('lab-memory','synthetic-state');localStorage.setItem('lab-local','synthetic-local')});await page.reload();const s=await native();assert.equal(s.sessionValue,'synthetic-state');assert.equal(s.localValue,'synthetic-local');return {sessionStorageMatches:true,localStorageMatches:true};
  }));
  await test('input-agent-cdp-with-shield','Agent owns control; native shield visible above guest','Normal Playwright click/typing has observed native effects while the shield remains active',async()=>leased(async()=>{
    const before=await native();await page.locator('#agent-field').fill('AGENT-ONLY');await page.locator('#agent-button').click();const after=await native();assert.equal(after.agentField,'AGENT-ONLY');assert.equal(after.agentCount,before.agentCount+1);assert.equal((await rpc('snapshot')).shield,true);return {observedField:true,observedCounterDelta:1,shield:true};
  }));
  await test('input-agent-cdp-keyboard','Agent control with native shield attached; use sequential CDP key events rather than fill-only insertion','Sequential Playwright keyboard events change the actual guest input without being swallowed by the native shield',async()=>leased(async()=>{await page.locator('#agent-field').fill('');await page.locator('#agent-field').pressSequentially('CDP-KEYS');const s=await native();assert.equal(s.agentField,'CDP-KEYS');return {sequentialKeysObserved:true,shield:(await rpc('snapshot')).shield};}));
  await test('lifecycle-hidden-window-agent','Agent control with the diagnostic window hidden; native guest throttling disabled and recorded scheduling switches applied','Normal click changes the independently read counter while the window stays hidden and ownership remains Agent',async()=>{
    const before=await native();await rpc('visibility',{visible:false});try{await leased(async()=>{await page.locator('#agent-button').click();const after=await native();assert.equal(after.agentCount,before.agentCount+1)});const s=await rpc('snapshot');assert.equal(s.windowVisible,false);assert.equal(s.state,'Agent');return {observedCounterDelta:1,windowStayedHidden:true,state:s.state};}finally{await rpc('visibility',{visible:true})}
  },['Single controlled hidden-window case; not a long-duration energy, locked-desktop, DPI or minimized-window coverage guarantee.']);
  await test('input-native-mouse-agent','Win32 SendInput to owned foreground diagnostic window and known guest button','Native path hits the shield and does not increment guest counter',async()=>{
    const before=await native();const shieldBefore=await rpc('snapshot');const injection=await osInput('#physical','click');if(injection.status==='INCONCLUSIVE')return injection;await new Promise(r=>setTimeout(r,200));const after=await native();const shieldAfter=await rpc('snapshot');assert.equal(after.physicalCount,before.physicalCount);assert.ok(shieldAfter.shieldEvents>shieldBefore.shieldEvents);return {nativeInput:injection,guestCounterDelta:0,shieldReceivedEvents:true,shieldInputTypes:shieldAfter.shieldInputTypes};
  },report.limitations.slice(1,2));
  await test('input-native-wheel-agent','OS wheel input over the shield while Agent owns the guest','Guest scrolling remains unchanged while native wheel events hit the shield',async()=>{
    const before=await native();const injection=await osInput('#physical','wheel');if(injection.status==='INCONCLUSIVE')return injection;await new Promise(r=>setTimeout(r,250));const after=await native();assert.equal(after.scrollY,before.scrollY);return {nativeInput:injection,scrollDelta:0};
  },report.limitations.slice(1,2));
  await test('input-native-keyboard-agent','Native click then Unicode SendInput while Agent control shield owns focus','Guest manual field stays empty and Agent value stays intact',async()=>{
    const before=await native();const shieldBefore=await rpc('snapshot');const injection=await osInput('#manual','type','NATIVE');if(injection.status==='INCONCLUSIVE')return injection;await new Promise(r=>setTimeout(r,200));const after=await native();const shieldAfter=await rpc('snapshot');assert.equal(after.manual,before.manual);assert.equal(after.agentField,before.agentField);assert.ok((shieldAfter.shieldInputTypes.keyDown||0)>(shieldBefore.shieldInputTypes.keyDown||0));return {nativeInput:injection,manualFieldUnchanged:true,agentFieldUnchanged:true,shieldReceivedKeyboard:true};
  },report.limitations.slice(1,2));
  await test('handoff-inflight-serialization','One approved slow diagnostic effect is running; request Take Control before it settles','Handoff Pending rejects new leases and excludes manual input until the observed effect completes exactly once',async()=>{
    await rpc('approve',{path:'/slow-effect'});const lease=await rpc('begin');const before=ledger.effects;await page.locator('#slow').click();await wait(()=>ledger.slowStarted>0);const pendingState=await rpc('take');assert.equal(pendingState.state,'Handoff Pending');assert.equal(pendingState.shield,true);await assert.rejects(()=>rpc('begin'),/ownership/i);const nativeBefore=await native();const injection=await osInput('#physical','click');await wait(()=>ledger.slowDone>0);await wait(async()=> (await native()).effects===ledger.effects);const nativeAfter=await native();if(injection.status==='SENT')assert.equal(nativeAfter.physicalCount,nativeBefore.physicalCount);await rpc('finish',{lease,outcome:'observed-complete'});const s=await rpc('snapshot');assert.equal(s.state,'User');assert.equal(ledger.effects,before+1);return {status:injection.status==='INCONCLUSIVE'?'INCONCLUSIVE':'PASS',pendingRejectedNewWork:true,serverEffectDelta:1,observedNativeEffect:true,finalState:s.state,pendingNativeInput:injection,manualCounterUnchanged:nativeAfter.physicalCount===nativeBefore.physicalCount};
  },['Controlled server delay; arbitrary non-idempotent application workflows are not automatically classified.']);
  await test('input-user-native-path','User owns control; shield removed; Agent facade blocked','Native mouse/keyboard affect the same page while new Agent work is refused',async()=>{
    const before=await native();await assert.rejects(()=>rpc('begin'),/ownership/i);const click=await osInput('#physical','click');const typing=await osInput('#manual','type','USER');if(click.status==='INCONCLUSIVE'||typing.status==='INCONCLUSIVE')return {status:'INCONCLUSIVE',click,typing};await new Promise(r=>setTimeout(r,300));const after=await native();const measurements={before,after,click,typing,nativeState:await rpc('snapshot')};try{assert.equal(after.physicalCount,before.physicalCount+1);assert.equal(after.manual,'USER')}catch(error){error.observation=measurements;throw error}return {mouseDelta:1,typedTextObserved:true,agentLeaseDenied:true};
  },report.limitations.slice(1,2));
  await test('input-native-wheel-user','User owns the same guest; native shield is detached','OS wheel input scrolls the actual guest, providing a positive control for the Agent wheel exclusion case',async()=>{
    const before=await native();const injection=await osInput('#physical','wheel');if(injection.status==='INCONCLUSIVE')return injection;await wait(async()=>(await native()).scrollY>before.scrollY);const after=await native();await rpc('reset-scroll');return {nativeInput:injection,positiveScrollDelta:after.scrollY-before.scrollY};
  },report.limitations.slice(1,2));
  await test('security-operation-policy-user','User control, same localhost; hard-restricted and unapproved meaningful effects','Native request policy blocks both without changing the independent server ledger',async()=>{
    await rpc('diagnostic-request',{path:'/danger',method:'POST'});await rpc('diagnostic-request',{path:'/effect',method:'POST'});await rpc('diagnostic-request',{path:'/unknown-effect',method:'GET'});assert.equal(ledger.danger,0);assert.equal(ledger.unknown,0);const before=ledger.effects;await rpc('approve',{path:'/effect'});await rpc('diagnostic-request',{path:'/effect',method:'POST'});await rpc('diagnostic-request',{path:'/effect',method:'POST'});assert.equal(ledger.effects,before+1);return {restrictedEffects:0,unknownGetEffects:0,approvedOnceEffectDelta:1,repeatBlocked:true};
  },report.limitations.slice(2,3));
  await test('handoff-return-invalid-state','Return requested with intentionally incorrect server/page reconciliation value','Agent remains excluded; failure requires a fresh explicit ownership choice',async()=>{
    const result=await rpc('return',{expectedEffects:ledger.effects+100,ackGeneration:(await rpc('snapshot')).generation});assert.equal(result.accepted,false);assert.equal(result.snapshot.state,'Awaiting Control Decision');await assert.rejects(()=>rpc('begin'),/ownership/i);await rpc('take');return {accepted:false,stateAfterFailure:result.snapshot.state,agentDenied:true};
  });
  await test('handoff-return-inspection','User has changed the page; Return Control explicitly requested','Shield engages, actual native URL/target/state and server effect count are reconciled before Agent state',async()=>{
    const returned=await returnAgent();assert.equal(returned.snapshot.shield,true);assert.equal(returned.snapshot.state,'Agent');return {inspections:returned.checks,state:'Agent',manualInputExcluded:true};
  });
  await test('security-cdp-unauthorized','Scoped local endpoint; missing auth, valid-token browser Origin, concurrent valid client and same-character-count multibyte invalid token','Invalid peers receive 401, concurrent valid client receives 409, and malformed auth cannot stall or terminate the host',async()=>{
    const attempt=options=>new Promise(resolve=>{const timer=setTimeout(()=>resolve('TIMEOUT'),2500);const done=value=>{clearTimeout(timer);resolve(value)};const w=new WebSocket(connection.endpoint,options);w.on('unexpected-response',(_q,r)=>{r.resume();done(r.statusCode)});w.on('error',()=>done('CONNECTION_CLOSED'));w.on('open',()=>{w.close();done(101)})});const status=await attempt({});const browserOrigin=await attempt({headers:{Authorization:'Bearer '+connection.token,Origin:ready.target}});const secondAuthorized=await attempt({headers:{Authorization:'Bearer '+connection.token}});const malformedMultibyte=await attempt({headers:{Authorization:'Bearer '+'\u00e9'.repeat(64)}});assert.equal(status,401);assert.equal(browserOrigin,401);assert.equal(secondAuthorized,409);assert.equal(malformedMultibyte,401);assert.equal((await rpc('snapshot')).state,'Agent');return {unauthorizedStatus:status,browserOriginStatus:browserOrigin,secondAuthorizedStatus:secondAuthorized,malformedMultibyteStatus:malformedMultibyte,hostStillResponsive:true};
  },['No compromise of the trusted controller/process memory is simulated.']);
  await test('security-bootstrap-controller','Private controller pipe is exposed before the diagnostic host connects; an invalid bootstrap peer attempts a handshake','Invalid peer closes without obtaining the control channel; the real per-launch nonce authenticates the host',async()=>{assert.equal(unauthenticatedPipeRejected,true);return {invalidPeerRejected:true,authenticatedHostConnected:!!control};},['Does not protect against compromised same-user process memory or a privileged OS attacker.']);
  await test('security-cdp-workspace-confinement','Authenticated CDP client knows the trusted workspace target ID for this negative test','Only audit target is enumerated; attaching to workspace and closing browser are rejected',async()=>{
    const c=await browser.newBrowserCDPSession();const ui=await rpc('workspace-target');await assert.rejects(()=>c.send('Target.attachToTarget',{targetId:ui,flatten:true}),/scope|denied/i);await assert.rejects(()=>c.send('Browser.close'),/scope|denied/i);return {workspaceAttachDenied:true,browserCloseDenied:true};
  });
  await test('security-raw-debug-port','Launch explicitly supplied remote-debugging-port; host strips unrestricted switch','No unrestricted Chrome debugging listener answers the requested port',async()=>{
    let refused=false;try{await fetch(`http://127.0.0.1:${ready.rawPort}/json/version`,{signal:AbortSignal.timeout(1500)})}catch(e){refused=e.cause?.code==='ECONNREFUSED'}assert.equal(refused,true);return {connectionRefused:true};
  });
  await test('security-navigation-and-isolation','Reachable second loopback server; native navigation and same-origin redirect; untrusted guest','Origin escape is cancelled before destination hit; guest lacks Node/bridge privileges and cannot create a second tab',async()=>{
    const reachable=await fetch(`http://127.0.0.1:${outside.address().port}/reachable`);assert.equal(reachable.status,200);await reachable.text();const b=ledger.requests.filter(v=>v==='outside').length;const start=messages.length;const navigation=await rpc('native-navigate',{url:`http://127.0.0.1:${outside.address().port}/escaped`});assert.equal(navigation.loaded,false);assert.match(navigation.error,/ERR_BLOCKED_BY_CLIENT/);await leased(async()=>{try{await page.goto(ready.target+'redirect-out')}catch{};await page.goto(ready.target);await page.evaluate(()=>window.open('/popup'))});assert.equal(ledger.requests.filter(v=>v==='outside').length,b);assert.ok(ledger.requests.includes('/redirect-out'));const evidence=messages.slice(start).filter(m=>m.event==='lab-event').map(m=>m.data);assert.ok(evidence.some(e=>e.type==='request-policy'&&e.reason==='origin'&&!e.allowed));assert.ok(evidence.some(e=>e.type==='navigation-cancel'&&e.guard==='will-redirect'));const s=await native();assert.equal(s.node,'undefined');assert.equal(s.require,'undefined');assert.equal(s.privilegedBridge,'undefined');assert.equal((await rpc('snapshot')).auditPages,1);return {destinationReachable:true,redirectSourceReached:true,cancellationObserved:true,escapedRequests:0,node:s.node,require:s.require,privilegedBridge:s.privilegedBridge,auditPages:1};
  },['Known navigation/redirect cases only; not universal service-worker/WebRTC/worker coverage.']);
  await test('security-operation-policy-agent','Agent control with the same native route policy used for User control','Denied/unknown actions produce no server effects; explicit one-operation approval is consumed once',async()=>leased(async()=>{
    const before=ledger.effects;await page.evaluate(async()=>{await fetch('/danger',{method:'POST'}).catch(()=>{});await fetch('/effect',{method:'POST'}).catch(()=>{})});assert.equal(ledger.effects,before);await rpc('approve',{path:'/effect'});await page.locator('#effect').click();await wait(()=>ledger.effects===before+1);await page.locator('#effect').click();await new Promise(r=>setTimeout(r,100));assert.equal(ledger.effects,before+1);return {deniedEffectDelta:0,approvedEffectDelta:1,repeatBlocked:true};
  }),report.limitations.slice(2,3));
  await test('session-logout-consistency','Authenticated same-session page and partition-scoped adapter','Logout expires HttpOnly cookie and server/native/page return to anonymous',async()=>leased(async()=>{
    await page.locator('#logout').click();await wait(async()=> (await native()).auth==='anonymous');const cookies=await page.context().cookies(ready.target);assert.ok(!cookies.some(c=>c.name==='lab_session'));return {authenticatedCookieRemoved:true,pageAnonymous:true};
  }));
  await test('recovery-user-control','User ownership before forced renderer crash','Fresh native guest generation restores User, revokes stale transport, and does not authorize Agent work',async()=>{
    await leased(async()=>{await page.locator('#login').click();await wait(async()=>(await native()).auth==='authenticated')});const staleToken=connection.token;await rpc('take');const old=(await rpc('snapshot')).generation;await rpc('crash');await wait(()=>messages.some(m=>m.event==='lab-event'&&m.data.type==='recovered'&&m.data.generation>old));await wait(()=>!browser.isConnected());const s=await rpc('snapshot');assert.equal(s.state,'User');await assert.rejects(()=>rpc('begin'),/ownership/i);await wait(async()=>(await native()).auth==='anonymous');const fresh=await rpc('session-summary');assert.equal(fresh.auditHasAuth,false);const staleStatus=await new Promise(resolve=>{const w=new WebSocket(connection.endpoint,{headers:{Authorization:'Bearer '+staleToken}});w.on('unexpected-response',(_q,r)=>{r.resume();resolve(r.statusCode)});w.on('error',()=>{});w.on('open',()=>{w.close();resolve(101)})});assert.equal(staleStatus,401);return {generationAdvanced:true,state:s.state,agentDenied:true,staleConnectionClosed:true,staleTokenStatus:staleStatus,authenticationNotAssumed:true};
  },['Renderer failure only; not browser-host/main-process termination or complete audit persistence.']);
  await test('recovery-pending-handoff','Agent returns, starts an approved slow operation, then pending handoff renderer crashes','Incomplete handoff becomes Awaiting Control Decision, stale completion is rejected, and uncertain work is never automatically replayed',async()=>{
    await returnAgent();await connect();await rpc('approve',{path:'/slow-effect'});const lease=await rpc('begin');const started=ledger.slowStarted;await page.locator('#slow').click();await wait(()=>ledger.slowStarted>started);await rpc('take');const old=(await rpc('snapshot')).generation;await rpc('crash');await wait(()=>messages.some(m=>m.event==='lab-event'&&m.data.type==='recovered'&&m.data.generation>old));const s=await rpc('snapshot');assert.equal(s.state,'Awaiting Control Decision');const stale=await rpc('finish',{lease,outcome:'observed-complete'});assert.equal(stale.accepted,false);await new Promise(r=>setTimeout(r,700));assert.equal(ledger.slowStarted,started+1);return {state:s.state,staleCompletionRejected:true,serverOperationCountDelta:1,noReplay:true,historyHasUnknown:s.history.some(v=>v.outcome==='unknown')};
  },['The controlled server can finish after renderer failure; absence of browser completion is not treated as server failure.']);
  await test('handoff-unknown-outcome-remains-excluded','Pending handoff with an intentionally injected unknown operation result; the controlled backend may finish later','Unknown completion retains the shield and recovery exclusion; neither User nor Agent receives competing control, and recovery does not replay the operation',async()=>{
    await returnAgent();await connect();await rpc('approve',{path:'/slow-effect'});const lease=await rpc('begin');const started=ledger.slowStarted,done=ledger.slowDone;await page.locator('#slow').click();await wait(()=>ledger.slowStarted>started);await rpc('take');await rpc('finish',{lease,outcome:'unknown'});const held=await rpc('snapshot');assert.equal(held.state,'Handoff Pending');assert.equal(held.recovering,true);assert.equal(held.shield,true);await assert.rejects(()=>rpc('begin'),/ownership|recovery/i);await assert.rejects(()=>rpc('take'),/ownership|recovery/i);await wait(()=>ledger.slowDone>done);const generation=held.generation;await rpc('crash');await wait(()=>messages.some(m=>m.event==='lab-event'&&m.data.type==='recovered'&&m.data.generation>generation));assert.equal(ledger.slowStarted,started+1);return {unknownPreserved:true,shieldHeld:true,competingControlDenied:true,operationCountDelta:1,recoveredState:(await rpc('snapshot')).state};
  },['Unknown result is an explicit diagnostic injection; backend completion is observed independently and is not reclassified as a successful Agent result.']);
  await test('recovery-exhaustion-two-failed-attempts','Actual renderer crash followed by exactly two injected native-recreation failures','Bounded failure ends Interrupted with no audit guest, rejects new Agent work, and preserves unknown history without replay',async()=>{
    await returnAgent();await connect();await rpc('arm-recovery-failure',{attempts:2});await rpc('crash');await wait(async()=>(await rpc('snapshot')).state==='Interrupted');const s=await rpc('snapshot');assert.equal(s.recoveryAttempts,2);assert.equal(s.auditPages,0);await assert.rejects(()=>rpc('begin'),/ownership/i);return {state:s.state,failedAttempts:s.recoveryAttempts,auditPages:0,agentDenied:true,historyRetained:s.history.length>0};
  },['Recreation failure is an explicit fault injection; host-process failure and durable product-report persistence are not implemented.']);
  await test('packaging-runtime','Launch path selected for this run','Packaged stage reports app.isPackaged and app.asar, while development stage is identified honestly',async()=>{assert.equal(ready.isPackaged,stage==='packaged');if(stage==='packaged')assert.equal(ready.asar,true);return {isPackaged:ready.isPackaged,asar:ready.asar};},report.limitations.slice(3));
  await test('packaging-source-parity','Read the actual packaged ASAR archive after exercising the executable; builder strips development-only manifest fields','Archived host/bridge/coordinator hashes and runtime package identity match the source recorded for this run',async()=>{
    if(stage!=='packaged')return {status:'INCONCLUSIVE',reason:'Archive/source parity is checked against the packaged artifact only'};
    const {extractFile}=await import('@electron/asar');const archive=path.join(root,'out','win-unpacked','resources','app.asar');const files=['src/host.cjs','src/cdp-bridge.cjs','src/ownership.cjs'];
    for(const file of files){const packed=crypto.createHash('sha256').update(await extractFile(archive,file)).digest('hex');const source=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');assert.equal(packed,source);}
    const packaged=JSON.parse((await extractFile(archive,'package.json')).toString());const source=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));for(const key of ['name','version','main','dependencies'])assert.deepEqual(packaged[key],source[key]);
    return {matchingFiles:files,matchingManifestFields:['name','version','main','dependencies'],archiveSha256:report.runtime.asar_sha256};
  },['Checks the listed archived application sources, not a signed release or complete dependency supply-chain provenance.']);
  await test('packaging-fuses','Read the produced executable fuse wire','Packaged RunAsNode, NodeOptions, NodeCliInspect disabled; ASAR-only and file-protocol restriction configured',async()=>{
    if(stage!=='packaged')return {status:'INCONCLUSIVE',reason:'Fuse hardening is checked against the packaged executable only'};
    const {getCurrentFuseWire,FuseV1Options,FuseState}=await import('@electron/fuses');const wire=await getCurrentFuseWire(path.join(root,'out','win-unpacked','FlowProof Feasibility Lab.exe'));
    for(const k of ['RunAsNode','EnableNodeOptionsEnvironmentVariable','EnableNodeCliInspectArguments','GrantFileProtocolExtraPrivileges'])assert.equal(wire[FuseV1Options[k]],FuseState.DISABLE);
    assert.equal(wire[FuseV1Options.OnlyLoadAppFromAsar],FuseState.ENABLE);return {disabled:['RunAsNode','NodeOptions','NodeCliInspect','FileProtocolExtraPrivileges'],asarOnly:true};
  },report.limitations.slice(3));
  await test('input-manual-hardware-and-ime','Automated OS-path tests completed; no human operator composition session was supplied','Human keyboard/mouse/IME/touch/accessibility/drag-drop require separately observed checks',async()=>({status:'INCONCLUSIVE',reason:'Actual human hardware and composition/accessibility matrix not executed'}),report.limitations.slice(1,2));
  await test('evidence-secret-redaction','Reports contain synthetic session metadata and observed booleans, not bearer/cookie values','No known broker token or synthetic auth-cookie value appears in the recorded evidence',async()=>{const text=JSON.stringify(report);for(const value of sensitiveValues)assert.equal(text.includes(value),false);return {knownSecretValuesChecked:sensitiveValues.size,rawValuesPresent:false};},['Checks known synthetic values; not a complete arbitrary-secret or screenshot redaction assessment.']);
 } catch(error) { report.fatal=String(error.message); console.error('LAB_FATAL:',error.message); }
 finally {
  if(browser)await browser.close().catch(()=>{});
  if(control)await rpc('quit').catch(()=>{});
  if(child){await new Promise(r=>{if(child.exitCode!==null)return r();const t=setTimeout(()=>{child.kill();r()},5000);child.once('exit',()=>{clearTimeout(t);r()})})}
  control?.destroy();pipe?.close();server?.closeAllConnections();server?.close();outside?.closeAllConnections();outside?.close();
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('Lab cleanup'))}
  report.finished_at=new Date().toISOString();report.overall_gate='OPEN';
  report.source_sha256={};for(const file of ['src/host.cjs','src/cdp-bridge.cjs','src/ownership.cjs','test/run.cjs','test/native-input.ps1','tools/fuses.cjs','package.json','package-lock.json'])if(fs.existsSync(path.join(root,file)))report.source_sha256[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  const out=path.resolve(root,'..','runs');fs.mkdirSync(out,{recursive:true});const output=path.join(out,runId+'.json');let safe=JSON.stringify(report,null,2);for(const value of sensitiveValues)if(value)safe=safe.replaceAll(value,'[REDACTED]');fs.writeFileSync(output,safe+'\n');console.log('LAB_REPORT:'+output);console.log('LAB_SUMMARY:'+JSON.stringify({stage,pass:report.tests.filter(t=>t.status==='PASS').length,fail:report.tests.filter(t=>t.status==='FAIL').length,inconclusive:report.tests.filter(t=>t.status==='INCONCLUSIVE').length,fatal:report.fatal||null}));
  if(report.fatal||report.tests.some(t=>t.status==='FAIL'))process.exitCode=1;
 }
})();
