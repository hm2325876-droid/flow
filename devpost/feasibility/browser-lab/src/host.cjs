const { app, BrowserWindow, WebContentsView, protocol, session, webContents, screen } = require('electron');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');
const { Ownership } = require('./ownership.cjs');
const { GuestBridge } = require('./cdp-bridge.cjs');
for(const flag of ['remote-debugging-port','remote-debugging-pipe','inspect','inspect-brk'])app.commandLine.removeSwitch(flag);
// Narrow scheduling subset from Playwright 1.64.1 chromiumSwitches; no security
// switches or default credential-store overrides are copied into the lab.
const schedulingSwitches=['disable-background-timer-throttling','disable-backgrounding-occluded-windows','disable-renderer-backgrounding'];
for(const flag of schedulingSwitches)app.commandLine.appendSwitch(flag);
app.setPath('userData',process.env.FP_LAB_PROFILE||path.join(require('node:os').tmpdir(),'flowproof-lab-'+crypto.randomUUID()));
protocol.registerSchemesAsPrivileged([{scheme:'fp-lab',privileges:{standard:true,secure:true}}]);
const target=process.env.FP_LAB_TARGET;
if(!target||new URL(target).hostname!=='localhost'||!process.env.FP_LAB_PIPE)throw new Error('The bounded lab requires its owned localhost target and private controller');
const origin=new URL(target).origin;
const allowed=url=>{try{return new URL(url).origin===origin}catch{return false}};
const owner=new Ownership();let win,guest,shield,bridge,control,closing=false,shieldEvents=0;
let grants=[];const events=[];const shieldInputTypes={};let guestInputs=0, failRecoveryAttempts=0;
const event=data=>{const value={seq:events.length+1,...data,generation:owner.generation,state:owner.state};events.push(value);send({event:'lab-event',data:value})};
const send=data=>{if(control&&!control.destroyed)control.write(JSON.stringify(data)+'\n')};
const preference={sandbox:true,contextIsolation:true,nodeIntegration:false,nodeIntegrationInWorker:false,nodeIntegrationInSubFrames:false,webSecurity:true,webviewTag:false};
const bounds={x:24,y:96,width:950,height:600};
function layout() {
  if(!guest||!shield)return;
  guest.setBounds(bounds);shield.setBounds(bounds);
  const blocked=owner.state!=='User'||owner.recovering;
  const attached=win.contentView.children.includes(shield);
  if(blocked&&!attached)win.contentView.addChildView(shield);
  if(!blocked&&attached)win.contentView.removeChildView(shield);
  shield.setVisible(blocked);
  if(blocked)shield.webContents.focus();else guest.webContents.focus();
  win.setTitle('FlowProof Feasibility Lab — '+owner.state);
}
const snapshot=()=>({state:owner.state,generation:owner.generation,recovering:owner.recovering,recoveryAttempts:owner.recoveryAttempts,inFlight:owner.inFlight,history:owner.history,windowVisible:win?.isVisible(),shield:shield?.getVisible(),shieldAttached:shield?win.contentView.children.includes(shield):false,shieldEvents,shieldInputTypes,guestInputs,guestFocused:guest?.webContents.isFocused(),shieldFocused:shield?.webContents.isFocused(),guestId:guest?.webContents.id,auditPages:guest&&!guest.webContents.isDestroyed()?1:0});
async function read() {
  return guest.webContents.executeJavaScript(`({agentField:document.querySelector('#agent-field')?.value||'',manual:document.querySelector('#manual')?.value||'',agentCount:Number(document.querySelector('#agent-count')?.textContent||0),physicalCount:Number(document.querySelector('#physical-count')?.textContent||0),effects:Number(document.querySelector('#effects')?.textContent||0),auth:document.querySelector('#auth')?.textContent||'unknown',sessionValue:sessionStorage.getItem('lab-memory'),localValue:localStorage.getItem('lab-local'),node:typeof process,require:typeof require,privilegedBridge:typeof window.electronAPI,inputRoute:window.__labInputRoute||[],activeElement:document.activeElement?.id||document.activeElement?.tagName,scrollY:window.scrollY})`);
}
function authorizeRequest(details) {
  if(!allowed(details.url))return {allowed:false,reason:'origin'};
  const p=new URL(details.url).pathname;const method=details.method;
  if((method==='GET'&&['/','/state','/frame','/redirect-out','/favicon.ico'].includes(p))||(method==='POST'&&['/auth/login','/auth/logout'].includes(p)))return {allowed:true,reason:'known-low-risk-contract'};
  if(p==='/danger')return {allowed:false,reason:'hard-restriction'};
  if(method==='POST'&&['/effect','/slow-effect'].includes(p)){
    const index=grants.findIndex(g=>g.path===p&&g.generation===owner.generation);
    if(index>=0){grants.splice(index,1);return {allowed:true,reason:'explicit-one-operation-approval'};}
    return {allowed:false,reason:'approval-required'};
  }
  return {allowed:false,reason:'unknown-effect-contract'};
}
async function createGuest() {
  if(owner.recovering && failRecoveryAttempts>0){failRecoveryAttempts--;throw new Error('Injected native recreation failure');}
  const view=new WebContentsView({webPreferences:{...preference,partition:`fp-audit-${process.pid}-${owner.generation}`,backgroundThrottling:false}});
  guest=view;const wc=view.webContents;wc.setBackgroundThrottling(false);
  wc.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  wc.session.setPermissionCheckHandler(()=>false);
  wc.session.webRequest.onBeforeRequest({urls:['<all_urls>']},(details,callback)=>{
    const decision=authorizeRequest(details);event({type:'request-policy',method:details.method,path:new URL(details.url).pathname,allowed:decision.allowed,reason:decision.reason});callback({cancel:!decision.allowed});
  });
  for(const e of ['will-navigate','will-frame-navigate','will-redirect'])wc.on(e,(ev,url)=>{if(!allowed(ev.url??url)){event({type:'navigation-cancel',guard:e});ev.preventDefault()}});
  wc.setWindowOpenHandler(()=>{event({type:'popup-denied'});return {action:'deny'}});
  wc.on('input-event',()=>{guestInputs++});
  wc.on('focus',()=>{if((owner.state!=='User'||owner.recovering)&&shield&&!shield.webContents.isDestroyed())shield.webContents.focus()});
  wc.on('render-process-gone',async(_e,details)=>{
    if(closing||guest!==view)return;
    owner.crash();layout();event({type:'renderer-crash',reason:details.reason});grants=[];bridge.reset();
    win.contentView.removeChildView(view);guest=null;wc.close({waitForBeforeUnload:false});
    while(owner.recovering){
      try{
        await createGuest();const current=guest.webContents;const {targetInfo}=await current.debugger.sendCommand('Target.getTargetInfo');
        if(!owner.recovered({boundary:allowed(current.getURL()),session:webContents.fromDevToolsTargetId(targetInfo.targetId)===current}))throw new Error('Recovered identity/boundary check failed');
        layout();event({type:'recovered',guestId:current.id});
      }catch(error){
        if(guest){const failed=guest;guest=null;win.contentView.removeChildView(failed);if(!failed.webContents.isDestroyed())failed.webContents.close({waitForBeforeUnload:false});}
        owner.recoveryFailed();event({type:'recovery-failed',attempt:owner.recoveryAttempts,reason:error.message});
      }
    }
  });
  win.contentView.addChildView(view);view.setBounds(bounds);view.setVisible(true);
  await wc.loadURL(target);wc.debugger.attach('1.3');
  wc.debugger.on('message',(_e,method,params,nativeSessionId)=>{if(guest===view)bridge?.publish(method,params,nativeSessionId)});
  if(shield){win.contentView.addChildView(shield);layout();}
}
async function dispatch(message) {
  switch(message.command) {
    case 'connection': return bridge.connection();
    case 'snapshot': return snapshot();
    case 'read': return read();
    case 'identity': return {mapped:webContents.fromDevToolsTargetId(message.targetId)?.id,guest:guest.webContents.id};
    case 'session-summary': return {auditHasAuth:(await guest.webContents.session.cookies.get({name:'lab_session'})).length>0,uiHasAuth:(await session.defaultSession.cookies.get({name:'lab_session'})).length>0,adapterCookie:(await guest.webContents.session.cookies.get({name:'lab_adapter'})).map(c=>({httpOnly:c.httpOnly,sameSite:c.sameSite}))};
    case 'begin': {const lease=owner.begin();event({type:'operation-begin',leaseId:lease.id});return lease;}
    case 'finish': {const accepted=owner.finish(message.lease,{outcome:message.outcome==='observed-complete'?'observed-complete':'unknown'});layout();event({type:'operation-finish',accepted,outcome:accepted?message.outcome:'stale-rejected'});return {accepted,...snapshot()};}
    case 'take': owner.take();layout();event({type:'take-control'});return snapshot();
    case 'return': {
      owner.returnRequested();layout();const {targetInfo}=await guest.webContents.debugger.sendCommand('Target.getTargetInfo');const actual=await read();
      const checks={boundary:allowed(guest.webContents.getURL()),session:webContents.fromDevToolsTargetId(targetInfo.targetId)===guest.webContents,history:message.ackGeneration===owner.generation&&message.expectedEffects===actual.effects};
      const accepted=owner.completeReturn(checks);layout();event({type:'return-control',accepted,checks});return {accepted,checks,snapshot:snapshot()};
    }
    case 'approve': if(!['/effect','/slow-effect'].includes(message.path))throw new Error('Hard restriction or unsupported operation');grants.push({path:message.path,generation:owner.generation});event({type:'operation-approved',path:message.path});return {approved:true};
    case 'diagnostic-request': {
      if(!['/danger','/effect','/unknown-effect'].includes(message.path))throw new Error('Diagnostic request outside fixed catalog');
      return guest.webContents.executeJavaScript(`fetch(${JSON.stringify(message.path)},{method:${JSON.stringify(message.method)}}).then(async r=>{await refresh();return{sent:true,status:r.status}}).catch(async()=>{await refresh();return{sent:false}})`);
    }
    case 'workspace-target': {const wc=win.webContents;if(!wc.debugger.isAttached())wc.debugger.attach('1.3');const {targetInfo}=await wc.debugger.sendCommand('Target.getTargetInfo');wc.debugger.detach();return targetInfo.targetId;}
    case 'native-navigate': try{await guest.webContents.loadURL(message.url);return {loaded:true}}catch(error){return {loaded:false,error:error.message}}
    case 'refresh-state': await guest.webContents.executeJavaScript('refresh()');return read();
    case 'reset-scroll': await guest.webContents.executeJavaScript('window.scrollTo(0,0)');return read();
    case 'show': win.setAlwaysOnTop(true);win.restore();win.show();win.focus();layout();return snapshot();
    case 'visibility': if(message.visible){win.show();layout()}else win.hide();return snapshot();
    case 'point': {
      if(!/^#[a-z-]+$/.test(message.selector))throw new Error('Invalid diagnostic selector');
      const p=await guest.webContents.executeJavaScript(`(()=>{const r=document.querySelector(${JSON.stringify(message.selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      const content=win.getContentBounds();const outer=win.getBounds();const activate=screen.dipToScreenPoint({x:Math.round(outer.x+outer.width/2),y:Math.round(outer.y+14)});return {...screen.dipToScreenPoint({x:Math.round(content.x+bounds.x+p.x),y:Math.round(content.y+bounds.y+p.y)}),activateX:activate.x,activateY:activate.y};
    }
    case 'crash': setTimeout(()=>guest.webContents.forcefullyCrashRenderer(),25);return {scheduled:true};
    case 'arm-recovery-failure': if(message.attempts!==2)throw new Error('Only the explicit two-attempt fault case is supported');failRecoveryAttempts=2;return {armed:2};
    case 'quit': closing=true;setTimeout(()=>app.quit(),20);return {quitting:true};
    default: throw new Error('Unknown lab command');
  }
}
async function boot() {
  control=net.connect(process.env.FP_LAB_PIPE);let buffer='';
  control.on('connect',()=>send({event:'hello',token:process.env.FP_LAB_BOOTSTRAP}));
  control.on('error',()=>app.quit());control.on('data',d=>{buffer+=d;let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let m;try{m=JSON.parse(line)}catch{continue}Promise.resolve(dispatch(m)).then(result=>send({id:m.id,result})).catch(error=>send({id:m.id,error:error.message}))}});
  protocol.handle('fp-lab',request=>new Response(request.url.includes('shield')?'<style>html,body{margin:0;height:100%;background:rgba(0,0,0,.002);overflow:hidden}body{user-select:none}</style><body tabindex="0"></body>':'<style>body{font:18px Segoe UI;background:#f6f5ee}</style><h3>FlowProof 4-spec feasibility lab</h3><p>Native guest and native input shield; diagnostic scope only.</p>',{headers:{'Content-Type':'text/html','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"}}));
  win=new BrowserWindow({width:1020,height:780,show:false,webPreferences:preference});win.removeMenu();
  await win.loadURL('fp-lab://ui/shell');await createGuest();
  shield=new WebContentsView({webPreferences:{...preference,backgroundThrottling:false}});shield.setBackgroundColor('#00000000');
  await shield.webContents.loadURL('fp-lab://ui/shield');
  shield.webContents.on('before-input-event',(e,input)=>{shieldEvents++;shieldInputTypes[input.type]=(shieldInputTypes[input.type]||0)+1;e.preventDefault()});shield.webContents.on('before-mouse-event',(e,input)=>{shieldEvents++;shieldInputTypes[input.type]=(shieldInputTypes[input.type]||0)+1;e.preventDefault()});
  win.contentView.addChildView(shield);layout();win.restore();win.show();win.focus();layout();
  bridge=new GuestBridge({guest:()=>guest.webContents,owner:()=>owner,allowed,event});await bridge.start();
  send({event:'ready',data:{target,hwnd:win.getNativeWindowHandle().readBigUInt64LE().toString(),isPackaged:app.isPackaged,asar:app.getAppPath().endsWith('.asar'),runtime:{electron:process.versions.electron,chromium:process.versions.chrome,embeddedNode:process.versions.node,pid:process.pid,schedulingSwitches}}});
}
app.whenReady().then(boot).catch(error=>{send({event:'fatal',data:{message:error.message}});console.error('LAB_HOST_FATAL',error.message);app.exit(1)});
app.on('before-quit',()=>{closing=true;bridge?.close();for(const wc of [guest?.webContents,shield?.webContents])if(wc&&!wc.isDestroyed())wc.close({waitForBeforeUnload:false})});
app.on('window-all-closed',()=>app.quit());
setTimeout(()=>app.quit(),180000).unref();
