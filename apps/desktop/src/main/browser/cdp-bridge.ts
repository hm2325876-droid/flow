// Adapted from the measured guest-only native-debugger bridge. Not a raw Chromium listener.
import http from 'node:http';
import crypto from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import type {WebContents} from 'electron';
import {isAllowedUrl} from './policy';
type Client={sessions:Map<string,string>};
const domains=new Set(['Page','Runtime','DOM','CSS','Network','Input','Accessibility','Fetch','Emulation','Log','Security','Inspector','Overlay','IO','Performance','Audits']);
export class GuestBridge {
  private server=http.createServer((_req,res)=>{res.writeHead(403);res.end()});
  private sockets=new WebSocketServer({noServer:true,maxPayload:1024*1024});
  private clients=new Map<WebSocket,Client>();private seq=0;
  private token=crypto.randomBytes(32).toString('hex');private endpoint='';
  active=false;
  constructor(private wc:WebContents,private origin:string){
    this.server.on('upgrade',(req,socket,head)=>{
      const supplied=Buffer.from(typeof req.headers.authorization==='string'?req.headers.authorization:'');const expected=Buffer.from('Bearer '+this.token);
      if(req.url!=='/audit'||req.headers.origin||supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected)){socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');return;}
      if(this.clients.size){socket.end('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n');return;}
      this.sockets.handleUpgrade(req,socket,head,ws=>this.sockets.emit('connection',ws));
    });
    this.sockets.on('connection',ws=>{const client={sessions:new Map<string,string>()};this.clients.set(ws,client);ws.on('close',()=>this.clients.delete(ws));ws.on('error',()=>ws.terminate());ws.on('message',bytes=>void this.receive(ws,client,bytes.toString()));});
    wc.debugger.on('message',(_e,method,params,nativeSession)=>{if(nativeSession)return;for(const [ws,c] of this.clients)for(const [sid,kind] of c.sessions)if(kind==='guest')this.send(ws,{method,params,sessionId:sid})});
  }
  async start(){await new Promise<void>(r=>this.server.listen(0,'127.0.0.1',r));const address=this.server.address();if(!address||typeof address==='string')throw new Error('CDP bind failed');this.endpoint=`ws://127.0.0.1:${address.port}/audit`;return this.connection();}
  async info(){return (await this.wc.debugger.sendCommand('Target.getTargetInfo')).targetInfo;}
  async connection(){return {endpoint:this.endpoint,token:this.token,targetId:(await this.info()).targetId,origin:this.origin};}
  private send(ws:WebSocket,value:unknown){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(value));}
  private async receive(ws:WebSocket,c:Client,raw:string){
    let m:{id:number;method:string;params?:Record<string,any>;sessionId?:string}|undefined;
    try{m=JSON.parse(raw);if(!m||!Number.isInteger(m.id)||typeof m.method!=='string')throw new Error('Malformed protocol');const result=await this.dispatch(ws,c,m);this.send(ws,{id:m.id,result:result||{},...(m.sessionId?{sessionId:m.sessionId}:{})});}
    catch{if(m?.id)this.send(ws,{id:m.id,error:{code:-32000,message:'Denied scoped browser operation'},...(m.sessionId?{sessionId:m.sessionId}:{})});else ws.close(1008);}
  }
  private async dispatch(ws:WebSocket,c:Client,{method,params:p={},sessionId}:{method:string;params?:Record<string,any>;sessionId?:string}):Promise<any>{
    const kind=sessionId?c.sessions.get(sessionId):'browser';if(!kind||this.wc.isDestroyed())throw new Error('No session');
    if(method==='Browser.close')throw new Error('Denied');
    if(method.startsWith('Target.')){
      const info=await this.info();if(p.targetId&&p.targetId!==info.targetId)throw new Error('Target scope');
      if(method==='Target.getTargetInfo')return {targetInfo:info};if(method==='Target.getTargets')return {targetInfos:[info]};
      if(method==='Target.attachToBrowserTarget'||method==='Target.attachToTarget'){const id='fp-'+(++this.seq);c.sessions.set(id,method==='Target.attachToBrowserTarget'?'browser':'guest');return {sessionId:id};}
      if(method==='Target.detachFromTarget'){if(!c.sessions.has(p.sessionId))throw new Error('Scope');c.sessions.delete(p.sessionId);return {};}
      if(method==='Target.setAutoAttach'){if(kind==='browser'&&p.autoAttach&&!Array.from(c.sessions.values()).includes('guest')){const id='fp-'+(++this.seq);c.sessions.set(id,'guest');this.send(ws,{method:'Target.attachedToTarget',params:{sessionId:id,targetInfo:info,waitingForDebugger:false}});}return {};}
      throw new Error('Target method');
    }
    if(kind==='browser'){
      if(method==='Browser.getVersion')return this.wc.debugger.sendCommand(method,p);
      if(method==='Storage.getCookies'){const cookies=await this.wc.session.cookies.get({});return {cookies:cookies.map(k=>({...k,expires:k.expirationDate??-1,size:k.name.length+k.value.length,priority:'Medium',sameSite:({strict:'Strict',lax:'Lax',no_restriction:'None'} as Record<string,string>)[k.sameSite]||'Lax'}))};}
      throw new Error('Browser method');
    }
    if(!domains.has(method.split('.')[0]))throw new Error('Domain');
    if(!this.active&&!/\.(enable|disable|runIfWaitingForDebugger|setLifecycleEventsEnabled)$/.test(method))throw new Error('No operation lease');
    if(method==='Page.navigate'&&!isAllowedUrl(p.url,this.origin))throw new Error('Origin');
    if(method.startsWith('Network.setCookie')||method==='Network.deleteCookies')throw new Error('Cookie mutation');
    return this.wc.debugger.sendCommand(method,p);
  }
  close(){for(const ws of this.clients.keys())ws.terminate();this.clients.clear();this.token='';this.sockets.close();this.server.close();}
}
