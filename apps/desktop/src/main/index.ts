import {app,BrowserWindow,ipcMain,protocol,safeStorage} from 'electron';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {channels,targetSchema,slotSchema,checkResultSchema,setupCommandSchema,setupStateSchema,supportedProviderDescriptors,type DesktopState,type Target,type Slot} from '@flowproof/contracts';
import {SetupService} from './setup';
import {AgentSupervisor} from './agent-supervisor';
import {BrowserHost} from './browser/host';
import {ValidationPage} from './browser/validation-page';
import {RunGate} from './browser/policy';
const directory=path.dirname(fileURLToPath(import.meta.url));
const rendererUrl=!app.isPackaged?process.env.ELECTRON_RENDERER_URL:undefined;
app.setName('FlowProof AI');app.setAppUserModelId('ai.flowproof.desktop');
for(const flag of ['remote-debugging-port','remote-debugging-pipe','inspect','inspect-brk'])app.commandLine.removeSwitch(flag);
for(const flag of ['disable-background-timer-throttling','disable-backgrounding-occluded-windows','disable-renderer-backgrounding'])app.commandLine.appendSwitch(flag);
protocol.registerSchemesAsPrivileged([{scheme:'flowproof-shield',privileges:{standard:true,secure:true}},{scheme:'flowproof-app',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
if(process.env.FLOWPROOF_SMOKE_PROFILE)app.setPath('userData',process.env.FLOWPROOF_SMOKE_PROFILE);
let win:BrowserWindow,worker:AgentSupervisor,host:BrowserHost|undefined,gate=new RunGate(),busy=false,connected=false,closing=false,exitAllowed=false;
let status='Desktop ready',error:string|null=null,check:DesktopState['check']=null;
let setup:SetupService;
let currentSlot:Slot={x:0,y:0,width:0,height:0,visible:false};
const fixture=new ValidationPage();let diagnostic=false;
function state():DesktopState{return {version:app.getVersion(),utility:worker?.ready?'ready':worker?.failed?'unavailable':'starting',connected,busy,url:host&&!host.guest.webContents.isDestroyed()?host.guest.webContents.getURL():'',diagnostic,status,error,check};}
function publish(){if(!closing&&win&&!win.isDestroyed())win.webContents.send(channels.changed,state());}
function assertIdle(){if(busy)throw new Error('Wait for the current browser operation');}
async function releaseBrowser(){
  await worker.request({type:'close'}).catch(()=>{});
  const previous=host;host=undefined;previous?.close();
  connected=false;diagnostic=false;check=null;gate=new RunGate();
}
async function disconnect(){
  assertIdle();busy=true;publish();
  try{await releaseBrowser();status='Desktop ready';error=null;}
  finally{busy=false;publish();}
  return state();
}
async function connect(input:Target){
  assertIdle();const target=targetSchema.parse(input);
  // Reserve the entire native lifecycle synchronously, before any IPC await.
  busy=true;status='Connecting native browser';error=null;publish();
  let candidate:BrowserHost|undefined;
  try{
    if(!worker.ready)throw new Error('Browser runtime unavailable');
    await releaseBrowser();
    const url=new URL(target.path,`http://localhost:${target.port}`).href;
    candidate=new BrowserHost(win,new URL(url).origin,publish);host=candidate;diagnostic=url===fixture.url;
    const connection=await candidate.open(url);candidate.bridge.active=true;
    await worker.request({type:'connect',connection});candidate.position(currentSlot);connected=true;status='Native browser connected';
  }catch(cause){if(process.env.FLOWPROOF_SMOKE_PIPE)console.error('CONNECTION_FAILURE',String(cause).replace(/Bearer\s+\S+|[a-f0-9]{64}/g,'[REDACTED]'));error=worker.ready?'Could not connect. Check that your localhost application is running.':'Browser runtime unavailable. Restart FlowProof to reconnect.';status='Connection unavailable';candidate?.close();if(host===candidate)host=undefined;connected=false;}
  finally{busy=false;if(candidate)candidate.bridge.active=false;publish();}
  return state();
}
async function validation(){assertIdle();const url=await fixture.start();return connect({port:Number(new URL(url).port),path:'/',consent:true});}
async function runCheck(holdMs=0){
  assertIdle();if(!host||!connected||!diagnostic)throw new Error('Open the owned validation page to run the browser check');
  if(!gate.enter())throw new Error('Browser outcome is uncertain; disconnect before a new session');
  busy=true;host.bridge.active=true;status='Running real browser check';error=null;check=null;publish();let known=false;
  try{
    const marker='flowproof-'+crypto.randomBytes(5).toString('hex');
    const result=checkResultSchema.parse(await worker.request({type:'check',url:fixture.url,marker,holdMs}));
    const actual=await host.observe(),identity=await host.identity();
    if(actual.counter!==1||actual.value!==marker||actual.url!==result.url||actual.marker!==fixture.marker||identity.mappedId!==identity.nativeId||identity.targetId!==result.targetId)throw new Error('Independent browser observation disagreed');
    const png=Buffer.from(result.screenshot,'base64');if(png.length!==result.screenshotBytes||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Invalid screenshot');
    const artifactId=crypto.randomUUID();const folder=path.join(app.getPath('userData'),'browser-checks');await mkdir(folder,{recursive:true});await writeFile(path.join(folder,artifactId+'.png'),png);
    check={value:actual.value,counter:actual.counter,sameSession:true,screenshotBytes:png.length,artifactId};known=true;status='Browser check passed';
  }catch(cause){if(process.env.FLOWPROOF_SMOKE_PIPE)console.error('CHECK_FAILURE',String(cause).replace(/Bearer\s+\S+|[a-f0-9]{64}/g,'[REDACTED]'));error='Browser check incomplete. Its outcome is unknown; disconnect and inspect before retrying.';status='Browser check incomplete';}
  finally{gate.finish(known);busy=false;if(host)host.bridge.active=false;publish();}
  return state();
}
function trusted(event:Electron.IpcMainInvokeEvent){const expected=new URL(rendererUrl||'flowproof-app://workspace/').href;if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||event.senderFrame.url!==expected)throw new Error('Untrusted IPC sender');}
function bind(){
  const handle=(name:string,fn:(data:unknown)=>unknown)=>ipcMain.handle(name,async(event,data)=>{trusted(event);return fn(data)});
  handle(channels.state,()=>state());handle(channels.connect,v=>connect(targetSchema.parse(v)));handle(channels.validation,()=>validation());handle(channels.check,()=>runCheck());handle(channels.disconnect,()=>disconnect());handle(channels.slot,v=>{currentSlot=slotSchema.parse(v);host?.position(currentSlot);});
  handle(channels.setup,async value=>{
    const parsed=setupCommandSchema.safeParse(value);
    if(!parsed.success)throw new Error('Invalid setup request');
    return setupStateSchema.parse(await setup.handle(parsed.data));
  });
}
async function shutdown(){
  if(closing)return;closing=true;busy=true;
  if(process.env.FLOWPROOF_SMOKE_PIPE)console.log('SHUTDOWN:worker');
  await worker?.stop();
  await setup?.close();
  if(process.env.FLOWPROOF_SMOKE_PIPE)console.log('SHUTDOWN:views');
  host?.close();host=undefined;fixture.close();exitAllowed=true;
  if(!win.isDestroyed())win.destroy();
  if(process.env.FLOWPROOF_SMOKE_PIPE)console.log('SHUTDOWN:quit');
  app.quit();
}
app.whenReady().then(async()=>{
  protocol.handle('flowproof-app',async request=>{
    const url=new URL(request.url),pathname=decodeURIComponent(url.pathname);
    if(url.host!=='workspace'||!(pathname==='/'||/^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname)))return new Response('Not found',{status:404});
    const relative=pathname==='/'?'index.html':pathname.slice(1);
    const bytes=await readFile(path.join(directory,'../renderer',relative));
    const mime=relative.endsWith('.css')?'text/css':relative.endsWith('.js')?'application/javascript':'text/html; charset=utf-8';
    return new Response(new Uint8Array(bytes),{headers:{'Content-Type':mime,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'"}});
  });
  protocol.handle('flowproof-shield',()=>new Response('<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:rgba(0,0,0,.002);overflow:hidden}</style><body tabindex="0"></body>',{headers:{'Content-Type':'text/html','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"}}));
  win=new BrowserWindow({width:1440,height:940,minWidth:980,minHeight:680,show:false,backgroundColor:'#f7f6f2',title:'FlowProof AI',titleBarStyle:'hidden',titleBarOverlay:{color:'#f7f6f2',symbolColor:'#263126',height:48},webPreferences:{preload:path.join(directory,'../preload/index.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
  win.removeMenu();win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());
  win.on('close',event=>{if(!exitAllowed){event.preventDefault();void shutdown()}});
  win.on('resize',()=>{if(host)host.position(host.slot)});
  worker=new AgentSupervisor(path.join(directory,'utility.js'),publish);
  setup=new SetupService({folder:app.getPath('userData'),secureStorage:safeStorage,requestProvider:command=>worker.request({type:'provider',command}),providers:supportedProviderDescriptors,hasActiveAudit:()=>busy});
  bind();
  if(rendererUrl)await win.loadURL(rendererUrl);else await win.loadURL('flowproof-app://workspace/');
  win.show();await worker.start();publish();
  // Opt-in, nonce-authenticated smoke transport. No generic evaluation or public UI API.
  if(process.env.FLOWPROOF_SMOKE_PIPE&&process.env.FLOWPROOF_SMOKE_NONCE){
    const {startSmoke}=await import('./smoke-control');
    startSmoke({win,worker,fixture,state,validation,runCheck,getHost:()=>host,shutdown});
  }
}).catch(()=>{process.stderr.write('FlowProof desktop could not start.\n');app.exit(1)});
app.on('before-quit',event=>{if(!exitAllowed){event.preventDefault();void shutdown();}});
app.on('window-all-closed',()=>{void shutdown()});
