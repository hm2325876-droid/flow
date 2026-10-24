import {BrowserWindow,WebContentsView,webContents,screen} from 'electron';
import type {Slot} from '@flowproof/contracts';
import {GuestBridge} from './cdp-bridge';
import {isAllowedUrl,clampSlot} from './policy';
export class BrowserHost {
  guest:WebContentsView;shield:WebContentsView;bridge:GuestBridge;
  blockedRequests=0;blockedNavigations=0;blockedPopups=0;shieldEvents=0;shieldKeys=0;
  slot:Slot={x:0,y:0,width:0,height:0,visible:false};
  private closed=false;
  constructor(private win:BrowserWindow,readonly origin:string,private changed:()=>void){
    const prefs={sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,backgroundThrottling:false};
    this.guest=new WebContentsView({webPreferences:{...prefs,partition:`flowproof-browser-${crypto.randomUUID()}`}});
    this.shield=new WebContentsView({webPreferences:prefs});this.shield.setBackgroundColor('#00000000');
    const wc=this.guest.webContents;
    wc.session.setPermissionCheckHandler(()=>false);wc.session.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
    wc.session.on('will-download',(event,item)=>{event.preventDefault();item.cancel()});
    wc.session.webRequest.onBeforeRequest({urls:['<all_urls>']},(details,cb)=>{const allowed=isAllowedUrl(details.url,origin)&&['GET','HEAD'].includes(details.method);if(!allowed)this.blockedRequests++;cb({cancel:!allowed});});
    const guard=(event:{preventDefault():void;url?:string},url?:string)=>{if(!isAllowedUrl(event.url??url??'',origin)){this.blockedNavigations++;event.preventDefault()}};
    wc.on('will-navigate',guard);wc.on('will-frame-navigate',guard);wc.on('will-redirect',guard);
    wc.setWindowOpenHandler(()=>{this.blockedPopups++;return {action:'deny'}});
    wc.on('did-navigate',()=>this.changed());wc.on('render-process-gone',()=>{this.bridge.active=false;this.changed()});
    wc.on('focus',()=>{if(!this.closed)this.shield.webContents.focus()});
    this.shield.webContents.on('before-input-event',event=>{this.shieldEvents++;this.shieldKeys++;event.preventDefault()});
    this.shield.webContents.on('before-mouse-event',event=>{this.shieldEvents++;event.preventDefault()});
    this.bridge=new GuestBridge(wc,origin);
    win.contentView.addChildView(this.guest);win.contentView.addChildView(this.shield);
  }
  async open(url:string){
    if(!isAllowedUrl(url,this.origin))throw new Error('Origin denied');
    await this.shield.webContents.loadURL('flowproof-shield://local/');
    await this.guest.webContents.loadURL(url);this.guest.webContents.debugger.attach('1.3');
    await this.bridge.start();this.position(this.slot);return this.bridge.connection();
  }
  position(slot:Slot){this.slot=slot;const [width,height]=this.win.getContentSize();const b=clampSlot(slot,width,height);this.guest.setBounds(b);this.shield.setBounds(b);const visible=slot.visible&&b.width>0&&b.height>0;this.guest.setVisible(visible);this.shield.setVisible(visible);if(visible)this.shield.webContents.focus();}
  async observe(){return this.guest.webContents.executeJavaScript(`({url:location.href,value:document.querySelector('#check-input')?.value||'',counter:Number(document.querySelector('#check-count')?.textContent||0),marker:document.querySelector('meta[name="flowproof-validation"]')?.content||'',node:typeof process,require:typeof require,bridge:typeof window.flowproof,frameTicks:Number(document.querySelector('#ticks')?.textContent||0)})`);}
  async identity(){const {targetId}=await this.bridge.info();return {targetId,nativeId:this.guest.webContents.id,mappedId:webContents.fromDevToolsTargetId(targetId)?.id};}
  async point(){const r=await this.guest.webContents.executeJavaScript(`(()=>{const button=document.querySelector('#increment');button.scrollIntoView({block:'center'});const b=button.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}})()`);const b=this.win.getContentBounds(),outer=this.win.getBounds();const a=screen.dipToScreenPoint({x:Math.round(outer.x+outer.width/2),y:Math.round(outer.y+20)});const p=screen.dipToScreenPoint({x:Math.round(b.x+this.slot.x+r.x),y:Math.round(b.y+this.slot.y+r.y)});return {x:Math.round(p.x),y:Math.round(p.y),activateX:Math.round(a.x),activateY:Math.round(a.y),hwnd:this.win.getNativeWindowHandle().readBigUInt64LE().toString()};}
  close(){this.closed=true;this.bridge.close();for(const view of [this.shield,this.guest]){this.win.contentView.removeChildView(view);if(!view.webContents.isDestroyed())view.webContents.close({waitForBeforeUnload:false})}}
}
