import net from 'node:net';
import {app,desktopCapturer,type BrowserWindow} from 'electron';
import type {AgentSupervisor} from './agent-supervisor';
import type {BrowserHost} from './browser/host';
import type {ValidationPage} from './browser/validation-page';
import type {DesktopState,SetupState} from '@flowproof/contracts';
type Dependencies={win:BrowserWindow;worker:AgentSupervisor;fixture:ValidationPage;state:()=>DesktopState;validation:()=>Promise<DesktopState>;runCheck:(hold?:number)=>Promise<DesktopState>;getHost:()=>BrowserHost|undefined;shutdown:()=>Promise<void>};
export function startSmoke(d:Dependencies){
  const socket=net.connect(process.env.FLOWPROOF_SMOKE_PIPE!);let buffer='';
  socket.on('connect',()=>socket.write(JSON.stringify({type:'hello',nonce:process.env.FLOWPROOF_SMOKE_NONCE})+'\n'));
  socket.on('error',()=>void d.shutdown());
  socket.on('data',bytes=>{buffer+=bytes; if(buffer.length>10000){socket.destroy();return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let m:{id:number;type:string};try{m=JSON.parse(line);if(!Number.isInteger(m.id))throw new Error()}catch{socket.destroy();return;}void dispatch(m.type).then(result=>socket.write(JSON.stringify({id:m.id,result})+'\n')).catch(()=>socket.write(JSON.stringify({id:m.id,error:'Smoke assertion command failed'})+'\n'));}});
  // Fixed Slice 2 observations use the public, validated Renderer bridge. The
  // private pipe accepts command names only, never keys, endpoints or scripts.
  function summary(s:SetupState){
    const serialized=JSON.stringify(s);
    return {providers:s.providers,selection:s.selection,credentials:s.credentials,verification:s.verification,draft:s.draft,review:s.review,secureStorageAvailable:s.secureStorageAvailable,error:s.error,catalogError:s.catalogError,
      catalog:s.catalog?{count:s.catalog.models.length,providerCount:new Set(s.catalog.models.map(m=>m.providerId)).size,supportedCount:s.catalog.models.filter(m=>m.adapterAvailable).length,toolCount:s.catalog.models.filter(m=>m.toolCall===true).length,unknownTools:s.catalog.models.filter(m=>m.toolCall===null).length,source:s.catalog.source,stale:s.catalog.stale,fetchedAt:s.catalog.fetchedAt,warning:s.catalog.warning,idsValid:s.catalog.models.every(m=>!!m.providerId&&!!m.modelId)}:null,
      returnedSyntheticSecret:/flowproof-smoke-invalid-placeholder-not-a-real-key-[AB]/.test(serialized)};
  }
  const setup=(command:Record<string,unknown>)=>d.win.webContents.executeJavaScript(`window.flowproof.setup(${JSON.stringify(command)})`).then(summary);
  const uiSummary=()=>d.win.webContents.executeJavaScript(`(()=>{const dialog=document.querySelector('[data-setup-dialog]'),rect=dialog?.getBoundingClientRect(),rows=Array.from(document.querySelectorAll('[data-model-row]')),footerButtons=Array.from(document.querySelectorAll('.setup-footer button'));return {dialog:!!dialog,text:dialog?.textContent||'',providerRows:document.querySelectorAll('[data-provider-row]').length,modelRows:rows.length,filteredRowsAllToolCapable:rows.length>0&&rows.every(row=>row.getAttribute('data-model-tools')==='true'),toolFilter:document.querySelector('[data-tool-filter]')?.checked,currentStep:Number(document.querySelector('[data-setup-step][aria-current="step"]')?.getAttribute('data-setup-step'))||null,projectName:document.querySelector('[data-setup-field="projectName"]')?.value,goal:document.querySelector('[data-setup-field="goal"]')?.value,context:document.querySelector('[data-setup-field="context"]')?.value,port:document.querySelector('[data-setup-field="port"]')?.value,path:document.querySelector('[data-setup-field="path"]')?.value,authorization:document.querySelector('[data-setup-authorization]')?.checked,readinessChecks:document.querySelectorAll('.readiness-check').length,failedChecks:document.querySelectorAll('.readiness-check.failed').length,busy:!!document.querySelector('.setup-feedback .spin'),prepareDisabled:footerButtons.find(button=>/Prepare ready-to-run|Recheck prepared/.test(button.textContent))?.disabled,dialogFits:!!rect&&rect.top>=-1&&rect.bottom<=window.innerHeight+1,dialogBounds:rect?{top:rect.top,bottom:rect.bottom,height:rect.height}:null,bodyWidth:document.body.scrollWidth,windowWidth:window.innerWidth,windowHeight:window.innerHeight}})()`);
  async function dispatch(type:string){
    const host=d.getHost();
    switch(type){
      case 'state':return {...d.state(),runtime:{electron:process.versions.electron,chromium:process.versions.chrome,isPackaged:app.isPackaged,pid:process.pid,utilityPid:d.worker.pid}};
      case 'validation':return d.validation();
      case 'check':return d.runCheck();
      case 'held-check':return d.runCheck(4000);
      case 'read':return host?.observe();
      case 'identity':return host?.identity();
      case 'layout':return {slot:host?.slot,bounds:host?.guest.getBounds(),shieldBounds:host?.shield.getBounds(),visible:host?.guest.getVisible(),shield:host?.shield.getVisible(),events:host?.shieldEvents,keys:host?.shieldKeys,focus:{window:d.win.isFocused(),shield:host?.shield.webContents.isFocused(),renderer:d.win.webContents.isFocused(),guest:host?.guest.webContents.isFocused()}};
      case 'resize':d.win.setSize(1100,760);return {resized:true};
      case 'point':{
        if(!host)throw new Error('No owned browser host');
        d.win.setAlwaysOnTop(true);d.win.show();d.win.focus();
        const point=await host.point();
        // Window activation can focus the workspace after position() reserved
        // shield input. Establish the intended native test recipient last.
        host.shield.webContents.focus();
        const deadline=Date.now()+750;
        while(Date.now()<deadline&&(!d.win.isFocused()||!host.shield.webContents.isFocused()))await new Promise(resolve=>setTimeout(resolve,25));
        return {...point,focus:{window:d.win.isFocused(),shield:host.shield.webContents.isFocused(),renderer:d.win.webContents.isFocused(),guest:host.guest.webContents.isFocused()}};
      }
      case 'ui':return d.win.webContents.executeJavaScript(`({ready:document.documentElement.dataset.ready,brand:document.querySelector('[data-brand]')?.textContent,api:Object.keys(window.flowproof),node:typeof process,require:typeof require,fakeProjects:document.querySelectorAll('[data-project]').length,heading:document.querySelector('h1')?.textContent})`);
      case 'invalid-ipc':return d.win.webContents.executeJavaScript(`window.flowproof.connect({port:0,path:'/',consent:true}).then(()=>false,()=>true)`);
      case 'setup-load':return setup({type:'load'});
      case 'setup-catalog':return setup({type:'catalog',refresh:false});
      case 'setup-select':{
        const state=await d.win.webContents.executeJavaScript(`window.flowproof.setup({type:'load'})`) as SetupState;
        const model=state.catalog?.models.find(m=>m.providerId==='openai'&&m.adapterAvailable&&m.toolCall===true&&m.outputModalities.includes('text'));
        if(!model)throw new Error('No real catalog OpenAI tool model');
        return setup({type:'select',selection:{providerId:model.providerId,modelId:model.modelId}});
      }
      case 'setup-save-key':return setup({type:'save-key',providerId:'openai',key:'flowproof-smoke-invalid-placeholder-not-a-real-key-A'});
      case 'setup-replace-key':return setup({type:'save-key',providerId:'openai',key:'flowproof-smoke-invalid-placeholder-not-a-real-key-B'});
      case 'setup-remove-key':return setup({type:'remove-key',providerId:'openai'});
      case 'setup-verify':return setup({type:'verify'});
      case 'setup-dismiss':return setup({type:'dismiss'});
      case 'setup-invalid-ipc':return d.win.webContents.executeJavaScript(`Promise.all([window.flowproof.setup({type:'save-key',providerId:'openai',key:'',extra:'not allowed'}).then(()=>false,()=>true),window.flowproof.setup({type:'select',selection:{providerId:'openai',modelId:'https://attacker.invalid/model'}}).then(()=>false,()=>true)]).then(results=>results.every(Boolean))`);
      case 'setup-save-draft':{
        const url=await d.fixture.start();
        return setup({type:'save-draft',draft:{projectName:'Slice 2 smoke project',goal:'Check the owned localhost page without starting an autonomous audit.',context:'Mechanical setup validation only.',port:String(new URL(url).port),path:'/',maxSteps:40,timeoutMinutes:10}});
      }
      case 'setup-review-invalid-fields':return setup({type:'review',draft:{projectName:' ',goal:' ',context:'',port:'3000',path:'//public.example.invalid/',maxSteps:40,timeoutMinutes:10},authorized:false});
      case 'setup-review-no-authorization':
      case 'setup-review-authorized':
      case 'setup-prepare':{
        const url=await d.fixture.start();
        return setup({type:type==='setup-prepare'?'prepare':'review',draft:{projectName:'Slice 2 smoke project',goal:'Check the owned localhost page without starting an autonomous audit.',context:'Mechanical setup validation only.',port:String(new URL(url).port),path:'/',maxSteps:40,timeoutMinutes:10},authorized:type!=='setup-review-no-authorization'});
      }
      case 'setup-ui-open':return d.win.webContents.executeJavaScript(`document.querySelector('[data-setup-open="audit"]')?.click();true`);
      case 'setup-ui-close':return d.win.webContents.executeJavaScript(`document.querySelector('[data-setup-close]')?.click();true`);
      case 'setup-ui':return uiSummary();
      case 'setup-ui-configure':return d.win.webContents.executeJavaScript(`document.querySelector('[data-setup-step="2"]')?.click();true`);
      case 'setup-ui-connect':return d.win.webContents.executeJavaScript(`document.querySelector('[data-setup-step="1"]')?.click();true`);
      case 'setup-ui-review':return d.win.webContents.executeJavaScript(`document.querySelector('[data-setup-step="3"]')?.click();true`);
      case 'setup-ui-authorize':return d.win.webContents.executeJavaScript(`(()=>{const input=document.querySelector('[data-setup-authorization]');if(!input||input.disabled)return false;if(!input.checked)input.click();return true})()`);
      case 'setup-ui-search-empty':return d.win.webContents.executeJavaScript(`(()=>{const input=document.querySelector('[data-model-search]');if(!input)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'flowproof-no-matching-model-83f965');input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
      case 'setup-ui-search-reset':return d.win.webContents.executeJavaScript(`(()=>{const input=document.querySelector('[data-model-search]');if(!input)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
      case 'setup-ui-filter':return d.win.webContents.executeJavaScript(`(()=>{const input=document.querySelector('[data-tool-filter]');if(!input)return false;input.click();return true})()`);
      case 'setup-ui-settings':return d.win.webContents.executeJavaScript(`document.querySelector('[data-setup-open="settings"]')?.click();true`);
      case 'setup-profile-secret-scan':{
        const {readFile,readdir}=await import('node:fs/promises');const path=await import('node:path');
        let count=0,plaintextFound=false;const files:string[]=[];
        async function visit(folder:string,depth:number){if(depth>3)return;for(const e of await readdir(folder,{withFileTypes:true})){const p=path.join(folder,e.name);if(e.isDirectory()){if(!['Cache','Code Cache','GPUCache','DawnGraphiteCache','DawnWebGPUCache','blob_storage','browser-checks'].includes(e.name))await visit(p,depth+1)}else if(/\.(?:json|sqlite|sqlite-wal|db|bin|enc)$/.test(e.name)){const bytes=await readFile(p);count++;files.push(path.relative(app.getPath('userData'),p));if(bytes.includes(Buffer.from('flowproof-smoke-invalid-placeholder-not-a-real-key-A'))||bytes.includes(Buffer.from('flowproof-smoke-invalid-placeholder-not-a-real-key-B')))plaintextFound=true;}}}
        await visit(app.getPath('userData'),0);return {filesChecked:count,files,plaintextFound};
      }
      case 'connect-path':return d.win.webContents.executeJavaScript(`window.flowproof.connect(${JSON.stringify({port:Number(new URL(d.fixture.url).port),path:'/next?source=preview',consent:true})})`);
      case 'connect-race':return d.win.webContents.executeJavaScript(`Promise.allSettled([window.flowproof.connect(${JSON.stringify({port:Number(new URL(d.fixture.url).port),path:'/',consent:true})}),window.flowproof.connect(${JSON.stringify({port:Number(new URL(d.fixture.url).port),path:'/',consent:true})})]).then(results=>results.map(result=>({status:result.status,connected:result.status==='fulfilled'?result.value.connected:false})))`);
      case 'toggle-sidebar':return d.win.webContents.executeJavaScript(`document.querySelector('[data-collapse]').click();true`);
      case 'capture':{const sources=await desktopCapturer.getSources({types:['window'],thumbnailSize:{width:1920,height:1080}});const source=sources.find(s=>s.id===d.win.getMediaSourceId());const native=source&&!source.thumbnail.isEmpty();const png=native?source.thumbnail:await d.win.webContents.capturePage();const {writeFile,mkdir}=await import('node:fs/promises');const path=await import('node:path');const folder=path.join(app.getPath('userData'),'browser-checks');const artifactId='desktop-'+Date.now()+'.png';await mkdir(folder,{recursive:true});await writeFile(path.join(folder,artifactId),png.toPNG());return {bytes:png.toPNG().length,artifactId,nativeComposite:!!native};}
      case 'transport-auth':{
        if(!host)throw new Error('No host');const connection=await host.bridge.connection();const {WebSocket}=await import('ws');
        const probe=(headers:Record<string,string>)=>new Promise<number>(resolve=>{const ws=new WebSocket(connection.endpoint,{headers});const timer=setTimeout(()=>{ws.terminate();resolve(0)},2000);ws.on('error',()=>{});ws.on('unexpected-response',(_req,res)=>{clearTimeout(timer);res.resume();ws.terminate();resolve(res.statusCode||0)});ws.on('open',()=>{clearTimeout(timer);ws.close();resolve(101)});});
        return {missing:await probe({}),browserOrigin:await probe({Authorization:'Bearer '+connection.token,Origin:'http://localhost'}),malformed:await probe({Authorization:'Bearer '+'é'.repeat(64)}),secondClient:await probe({Authorization:'Bearer '+connection.token})};
      }
      case 'boundaries':{
        if(!host)throw new Error('No host');
        const identity=await host.identity();
        await host.guest.webContents.executeJavaScript(`window.open(${JSON.stringify(d.fixture.outsideUrl())});document.querySelector('#outside').click();true`);
        await new Promise(r=>setTimeout(r,150));
        let directBlocked=false,redirectBlocked=false;
        try{await host.guest.webContents.loadURL(d.fixture.outsideUrl())}catch{directBlocked=true}
        try{await host.guest.webContents.loadURL(d.fixture.url+'redirect-out')}catch{redirectBlocked=true}
        return {directBlocked,redirectBlocked,popups:host.blockedPopups,blockedRequests:host.blockedRequests,blockedNavigations:host.blockedNavigations,escapedRequests:d.fixture.escapedRequests,redirectRequests:d.fixture.redirectRequests,identity};
      }
      case 'quit':setTimeout(()=>void d.shutdown(),30);return {quitting:true};
      default:throw new Error('Unknown smoke command');
    }
  }
}
