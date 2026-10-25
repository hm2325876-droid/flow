const http = require('node:http');
const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');
const rootMethods = new Set(['Browser.getVersion','Target.setAutoAttach','Target.getTargetInfo','Target.getTargets','Target.attachToBrowserTarget','Target.attachToTarget','Target.detachFromTarget','Storage.getCookies','Storage.setCookies','Storage.clearCookies']);
const guestDomains = new Set(['Page','Runtime','DOM','CSS','Network','Input','Accessibility','Fetch','Emulation','Log','Security','Inspector','Overlay','IO','Performance','Audits']);
const housekeeping = /\.(enable|disable|setAutoAttach|runIfWaitingForDebugger|setLifecycleEventsEnabled|setDiscoverTargets)$/;
class GuestBridge {
  constructor({ guest, owner, allowed, event }) { this.guest=guest;this.owner=owner;this.allowed=allowed;this.event=event;this.token=crypto.randomBytes(32).toString('hex');this.clients=new Map();this.sequence=0; }
  async start() {
    this.http=http.createServer((_req,res)=>{res.writeHead(403);res.end('Scoped CDP endpoint only')});
    this.wss=new WebSocketServer({noServer:true,maxPayload:1024*1024});
    this.http.on('upgrade',(req,socket,head)=>{
      const supplied=Buffer.from(typeof req.headers.authorization==='string'?req.headers.authorization:'');
      const expected=Buffer.from('Bearer '+this.token);
      if(req.headers.origin || supplied.length!==expected.length || !crypto.timingSafeEqual(supplied,expected)) {socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');return;}
      if(this.clients.size){socket.end('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n');return;}
      this.wss.handleUpgrade(req,socket,head,ws=>this.wss.emit('connection',ws));
    });
    this.wss.on('connection',ws=>{
      const client={sessions:new Map(),generation:this.owner().generation};this.clients.set(ws,client);
      ws.on('close',()=>this.clients.delete(ws));
      ws.on('error',()=>{this.clients.delete(ws);ws.terminate();});
      ws.on('message',data=>this.receive(ws,client,data));
    });
    await new Promise(resolve=>this.http.listen(0,'127.0.0.1',resolve));
    this.endpoint=`ws://127.0.0.1:${this.http.address().port}/audit`;
  }
  connection() { return {endpoint:this.endpoint,token:this.token}; }
  reset() {this.token=crypto.randomBytes(32).toString('hex');for(const ws of this.clients.keys())ws.close(1012,'Audit generation replaced');this.clients.clear();}
  close() {for(const ws of this.clients.keys())ws.terminate();this.wss?.close();this.http?.close();}
  send(ws,value) {if(ws.readyState===1)ws.send(JSON.stringify(value));}
  publish(method,params,nativeSessionId) {
    // This bounded lab has one target and same-origin frames. OOPIF/worker routing
    // is deliberately not claimed complete; reject unproven child transport use.
    if(nativeSessionId)return;
    for(const [ws,client] of this.clients) for(const [sid,kind] of client.sessions) if(kind==='guest')this.send(ws,{method,params,sessionId:sid});
  }
  async info() {const {targetInfo}=await this.guest().debugger.sendCommand('Target.getTargetInfo');return targetInfo;}
  async receive(ws,client,bytes) {
    let request;
    try {
      request=JSON.parse(bytes.toString());
      if(!Number.isInteger(request.id)||typeof request.method!=='string')throw new Error('Denied malformed CDP request');
      if(client.generation!==this.owner().generation)throw new Error('Denied stale browser generation');
      if(this.owner().recovering || !this.guest())throw new Error('Denied browser recovery/unavailable');
      const result=await this.dispatch(ws,client,request);
      this.send(ws,{id:request.id,result:result||{},...(request.sessionId?{sessionId:request.sessionId}:{})});
    } catch(error) {
      const method=request?.method||'malformed';this.event({type:'cdp-denied',method,reason:String(error.message).slice(0,180)});
      if(request?.id)this.send(ws,{id:request.id,error:{code:-32000,message:String(error.message).slice(0,220)},...(request.sessionId?{sessionId:request.sessionId}:{})});
      else ws.close(1008,'Invalid protocol');
    }
  }
  async dispatch(ws,client,{method,params={},sessionId}) {
    const wc=this.guest(), kind=sessionId?client.sessions.get(sessionId):'browser';
    if(!kind)throw new Error('Denied session scope');
    if(method==='Browser.close')throw new Error('Denied browser scope');
    if(method.startsWith('Storage.') && this.owner().state!=='Agent' && !(this.owner().state==='Handoff Pending'&&this.owner().inFlight))throw new Error('Denied ownership for storage');
    if(method.startsWith('Target.')) {
      const info=await this.info();
      if(params.targetId && params.targetId!==info.targetId)throw new Error('Denied target scope');
      if(method==='Target.getTargetInfo')return {targetInfo:info};
      if(method==='Target.getTargets')return {targetInfos:[info]};
      if(method==='Target.attachToBrowserTarget'){const sid='browser-'+(++this.sequence);client.sessions.set(sid,'browser');return {sessionId:sid};}
      if(method==='Target.attachToTarget'){const sid='guest-'+(++this.sequence);client.sessions.set(sid,'guest');return {sessionId:sid};}
      if(method==='Target.detachFromTarget'){if(!client.sessions.has(params.sessionId))throw new Error('Denied session scope');client.sessions.delete(params.sessionId);return {};}
      if(method==='Target.setAutoAttach'){
        if(kind==='browser'&&params.autoAttach&&!client.autoAttached){client.autoAttached=true;const sid='auto-'+(++this.sequence);client.sessions.set(sid,'guest');this.send(ws,{method:'Target.attachedToTarget',params:{sessionId:sid,targetInfo:info,waitingForDebugger:false}});}
        return {};
      }
      throw new Error('Denied Target method scope');
    }
    if(kind==='browser') {
      if(!rootMethods.has(method))throw new Error('Denied root scope: '+method);
      if(method==='Browser.getVersion')return wc.debugger.sendCommand(method,params);
      if(method==='Storage.getCookies'){
        const cookies=await wc.session.cookies.get({});
        return {cookies:cookies.map(c=>({name:c.name,value:c.value,domain:c.domain,path:c.path,expires:c.expirationDate??-1,httpOnly:c.httpOnly,secure:c.secure,sameSite:({strict:'Strict',lax:'Lax',no_restriction:'None'})[c.sameSite]||'Lax',size:c.name.length+c.value.length,session:c.session,priority:'Medium'}))};
      }
      if(method==='Storage.clearCookies'){await wc.session.clearStorageData({storages:['cookies']});return {};}
      if(method==='Storage.setCookies'){
        for(const c of params.cookies||[]){const url=c.url||`http://${c.domain}${c.path||'/'}`;if(!this.allowed(url))throw new Error('Denied cookie origin scope');await wc.session.cookies.set({url,name:c.name,value:c.value,path:c.path,httpOnly:c.httpOnly,secure:c.secure,...(c.expires>0?{expirationDate:c.expires}:{}),sameSite:({Strict:'strict',Lax:'lax',None:'no_restriction'})[c.sameSite]||'lax'});}return {};
      }
      throw new Error('Denied root method');
    }
    const owner=this.owner();
    if(owner.state!=='Agent' && !(owner.state==='Handoff Pending'&&owner.inFlight) && !housekeeping.test(method))throw new Error('Denied ownership: '+owner.state);
    if(!guestDomains.has(method.split('.')[0]))throw new Error('Denied CDP domain scope');
    if(method==='Page.navigate'&&!this.allowed(params.url))throw new Error('Denied navigation scope');
    if(method.startsWith('Network.setCookie')||method==='Network.deleteCookies')throw new Error('Denied cookie mutation outside partition adapter');
    return wc.debugger.sendCommand(method,params);
  }
}
module.exports={GuestBridge};
