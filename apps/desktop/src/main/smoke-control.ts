import net from 'node:net';
import {app,desktopCapturer,type BrowserWindow} from 'electron';
import type {AgentSupervisor} from './agent-supervisor';
import type {BrowserHost} from './browser/host';
import type {ValidationPage} from './browser/validation-page';
import type {DesktopState} from '@flowproof/contracts';
type Dependencies={win:BrowserWindow;worker:AgentSupervisor;fixture:ValidationPage;state:()=>DesktopState;validation:()=>Promise<DesktopState>;runCheck:(hold?:number)=>Promise<DesktopState>;getHost:()=>BrowserHost|undefined;shutdown:()=>Promise<void>};
export function startSmoke(d:Dependencies){
  const socket=net.connect(process.env.FLOWPROOF_SMOKE_PIPE!);let buffer='';
  socket.on('connect',()=>socket.write(JSON.stringify({type:'hello',nonce:process.env.FLOWPROOF_SMOKE_NONCE})+'\n'));
  socket.on('error',()=>void d.shutdown());
  socket.on('data',bytes=>{buffer+=bytes; if(buffer.length>10000){socket.destroy();return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);let m:{id:number;type:string};try{m=JSON.parse(line);if(!Number.isInteger(m.id))throw new Error()}catch{socket.destroy();return;}void dispatch(m.type).then(result=>socket.write(JSON.stringify({id:m.id,result})+'\n')).catch(()=>socket.write(JSON.stringify({id:m.id,error:'Smoke assertion command failed'})+'\n'));}});
  async function dispatch(type:string){
    const host=d.getHost();
    switch(type){
      case 'state':return {...d.state(),runtime:{electron:process.versions.electron,chromium:process.versions.chrome,isPackaged:app.isPackaged,pid:process.pid,utilityPid:d.worker.pid}};
      case 'validation':return d.validation();
      case 'check':return d.runCheck();
      case 'held-check':return d.runCheck(4000);
      case 'read':return host?.observe();
      case 'identity':return host?.identity();
      case 'layout':return {slot:host?.slot,bounds:host?.guest.getBounds(),shieldBounds:host?.shield.getBounds(),visible:host?.guest.getVisible(),shield:host?.shield.getVisible(),events:host?.shieldEvents,keys:host?.shieldKeys};
      case 'resize':d.win.setSize(1100,760);return {resized:true};
      case 'point':d.win.setAlwaysOnTop(true);d.win.show();d.win.focus();return host?.point();
      case 'ui':return d.win.webContents.executeJavaScript(`({ready:document.documentElement.dataset.ready,brand:document.querySelector('[data-brand]')?.textContent,api:Object.keys(window.flowproof),node:typeof process,require:typeof require,fakeProjects:document.querySelectorAll('[data-project]').length,heading:document.querySelector('h1')?.textContent})`);
      case 'invalid-ipc':return d.win.webContents.executeJavaScript(`window.flowproof.connect({port:0,path:'/',consent:true}).then(()=>false,()=>true)`);
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
