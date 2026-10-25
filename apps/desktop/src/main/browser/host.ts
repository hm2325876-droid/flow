import {BrowserWindow,WebContentsView,webContents,screen} from 'electron';
import {browserActionSchema,type Slot,type BrowserAction} from '@flowproof/contracts';
import {GuestBridge} from './cdp-bridge';
import {isAllowedUrl,clampSlot} from './policy';
import {assessNativeAction,restrictedEffectUrl,RequestAllowance,type NativeActionDetails} from './action-policy';
export class BrowserHost {
  guest:WebContentsView;shield:WebContentsView;bridge:GuestBridge;
  blockedRequests=0;blockedNavigations=0;blockedPopups=0;shieldEvents=0;shieldKeys=0;
  slot:Slot={x:0,y:0,width:0,height:0,visible:false};
  private closed=false;
  private auditMode=false;
  private owner:'agent'|'pending'|'user'='agent';
  private actionId:string|null=null;
  private requests=new RequestAllowance();
  generation=0;
  crashed=false;
  constructor(private win:BrowserWindow,readonly origin:string,private changed:()=>void){
    const prefs={sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,backgroundThrottling:false};
    this.guest=new WebContentsView({webPreferences:{...prefs,partition:`flowproof-browser-${crypto.randomUUID()}`}});
    this.shield=new WebContentsView({webPreferences:prefs});this.shield.setBackgroundColor('#00000000');
    const wc=this.guest.webContents;
    wc.session.setPermissionCheckHandler(()=>false);wc.session.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
    wc.session.on('will-download',(event,item)=>{event.preventDefault();item.cancel()});
    wc.session.webRequest.onBeforeRequest({urls:['<all_urls>']},(details,cb)=>{const allowed=isAllowedUrl(details.url,origin)&&!(['mainFrame','subFrame','xhr','fetch'].includes(details.resourceType)&&restrictedEffectUrl(details.url))&&(['GET','HEAD'].includes(details.method)||this.auditMode&&this.owner!=='user'&&this.actionId!==null&&this.requests.consume(details.url,details.method));if(!allowed)this.blockedRequests++;cb({cancel:!allowed});});
    const guard=(event:{preventDefault():void;url?:string},url?:string)=>{if(!isAllowedUrl(event.url??url??'',origin)||restrictedEffectUrl(event.url??url??'')){this.blockedNavigations++;event.preventDefault()}};
    wc.on('will-navigate',guard);wc.on('will-frame-navigate',guard);wc.on('will-redirect',guard);
    wc.setWindowOpenHandler(()=>{this.blockedPopups++;return {action:'deny'}});
    wc.on('did-navigate',()=>{this.generation++;this.requests.clear();this.changed()});wc.on('render-process-gone',()=>{this.crashed=true;this.generation++;this.actionId=null;this.requests.clear();this.bridge.active=false;this.changed()});
    wc.on('did-navigate-in-page',()=>{this.generation++;this.requests.clear();this.changed()});
    wc.on('focus',()=>{if(!this.closed&&this.owner!=='user')this.shield.webContents.focus()});
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
  position(slot:Slot){this.slot=slot;const [width,height]=this.win.getContentSize();const b=clampSlot(slot,width,height);this.guest.setBounds(b);this.shield.setBounds(b);const visible=slot.visible&&b.width>0&&b.height>0;this.guest.setVisible(visible);this.shield.setVisible(visible&&this.owner!=='user');if(visible&&this.owner!=='user'&&!this.auditMode)this.shield.webContents.focus();}
  beginAudit(){this.auditMode=true;this.crashed=false;this.actionId=null;this.requests.clear();this.bridge.active=false;this.setOwner('agent');}
  endAudit(){this.auditMode=false;this.actionId=null;this.requests.clear();this.bridge.active=false;this.setOwner('agent');}
  setOwner(owner:'agent'|'pending'|'user'){
    if(owner==='user'&&this.actionId)throw new Error('An automated browser action is still active');
    this.owner=owner;
    // Pending handoff excludes new leases while an already-running lease may
    // reach its bounded checkpoint. User input stays shielded until release.
    if(owner!=='agent'&&!this.actionId)this.bridge.active=false;
    this.position(this.slot);
    if(owner==='user'&&this.slot.visible&&!this.guest.webContents.isDestroyed())this.guest.webContents.focus();
    else if(owner!=='user'&&this.slot.visible)this.shield.webContents.focus();
  }
  get controlOwner(){return this.owner;}
  get activeAction(){return this.actionId;}
  async assessAction(input:BrowserAction){
    const action=browserActionSchema.parse(input);
    if(this.closed||this.crashed||this.guest.webContents.isDestroyed()||!isAllowedUrl(this.guest.webContents.getURL(),this.origin))return {...assessNativeAction(action,{found:false,unique:false},this.origin,this.generation),decision:'deny' as const,summary:'The authorized native browser is unavailable or outside scope.'};
    let details:NativeActionDetails|null=null;
    if('locator' in action&&action.locator){
      // Fixed trusted inspection only. No model-controlled JavaScript or selectors.
      const inspect=(locator:{by:string;value:string;role?:string})=>{
        const name=(e:Element)=>e.getAttribute('aria-label')||(e.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim()||(e as HTMLInputElement).labels?.[0]?.textContent||e.getAttribute('alt')||e.getAttribute('title')||(e instanceof HTMLInputElement&&['submit','button','reset'].includes(e.type)?e.value:e.textContent)||'';
        const role=(e:Element)=>e.getAttribute('role')||(e.tagName==='BUTTON'?'button':e.tagName==='A'?'link':e.tagName==='SELECT'?'combobox':e instanceof HTMLInputElement&&['checkbox','radio'].includes(e.type)?e.type:e instanceof HTMLInputElement&&['submit','button','reset'].includes(e.type)?'button':e.matches('input,textarea,[contenteditable="true"]')?'textbox':'');
        const visible=(e:Element)=>{const r=e.getBoundingClientRect();const style=getComputedStyle(e);return r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.display!=='none';};
        let matches=Array.from(document.querySelectorAll('body *')).slice(0,5000).filter(e=>visible(e)&&(locator.by==='testId'?e.getAttribute('data-testid')===locator.value:locator.by==='role'?role(e)===locator.role&&name(e).trim()===locator.value:locator.by==='label'?(e as HTMLInputElement).labels&&Array.from((e as HTMLInputElement).labels||[]).some(l=>l.textContent?.trim()===locator.value)||e.getAttribute('aria-label')===locator.value:name(e).trim()===locator.value));
        if(locator.by==='text')matches=matches.filter(e=>!matches.some(other=>other!==e&&e.contains(other)));
        if(matches.length!==1)return {found:matches.length>0,unique:false};
        const e=matches[0],form=e.closest('form'),formUrl=form?.getAttribute('action')||location.href;
        const method=(form?.getAttribute('method')||'GET').toUpperCase();
        return {found:true,unique:true,nodeIndex:Array.from(document.querySelectorAll('body *')).indexOf(e),name:name(e).trim().slice(0,300),role:role(e),disabled:(e as HTMLInputElement).disabled||e.getAttribute('aria-disabled')==='true',editable:e.matches('input:not([type="hidden"]),textarea,select,[contenteditable="true"]')&&!(e as HTMLInputElement).readOnly,sensitive:e instanceof HTMLInputElement&&(e.type==='password'||/password|secret|token|api.?key|recovery.?code/i.test(e.name+' '+e.autocomplete+' '+name(e))),...(e instanceof HTMLAnchorElement?{href:e.href}:{}),...(form?{form:{url:new URL(formUrl,location.href).href,method},sensitiveGetForm:method==='GET'&&!!form.querySelector('input[type="password"]')}:{} )};
      };
      let deadline:ReturnType<typeof setTimeout>|undefined;
      try{details=await Promise.race([this.guest.webContents.executeJavaScript(`(${inspect.toString()})(${JSON.stringify(action.locator)})`),new Promise<NativeActionDetails>((resolve)=>{deadline=setTimeout(()=>resolve({found:false,unique:false}),3000);})]);}
      finally{if(deadline)clearTimeout(deadline);}
    }
    return assessNativeAction(action,details,this.origin,this.generation);
  }
  async beginAction(actionId:string,action:BrowserAction,approved=false,expectedBinding?:string){
    if(!this.auditMode||this.owner!=='agent'||this.actionId||this.crashed||this.closed)throw new Error('No exclusive Agent browser lease');
    const generation=this.generation,assessment=await this.assessAction(action);
    if(this.owner!=='agent'||this.actionId||this.crashed||generation!==this.generation)throw new Error('Browser ownership or document changed');
    if(assessment.decision==='deny'||assessment.decision==='approval'&&!approved||expectedBinding&&assessment.binding!==expectedBinding)throw new Error('Browser action authorization denied or changed');
    this.actionId=actionId;this.requests.set(assessment.formRequest);this.bridge.active=true;
  }
  endAction(actionId:string){if(this.actionId!==actionId)throw new Error('Stale browser action lease');this.actionId=null;this.requests.clear();this.bridge.active=false;}
  async observe(){return this.guest.webContents.executeJavaScript(`({url:location.href,value:document.querySelector('#check-input')?.value||'',counter:Number(document.querySelector('#check-count')?.textContent||0),marker:document.querySelector('meta[name="flowproof-validation"]')?.content||'',node:typeof process,require:typeof require,bridge:typeof window.flowproof,frameTicks:Number(document.querySelector('#ticks')?.textContent||0)})`);}
  async identity(){const {targetId}=await this.bridge.info();return {targetId,nativeId:this.guest.webContents.id,mappedId:webContents.fromDevToolsTargetId(targetId)?.id};}
  async point(){const r=await this.guest.webContents.executeJavaScript(`(()=>{const button=document.querySelector('#increment');button.scrollIntoView({block:'center'});const b=button.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}})()`);const b=this.win.getContentBounds(),outer=this.win.getBounds();const a=screen.dipToScreenPoint({x:Math.round(outer.x+outer.width/2),y:Math.round(outer.y+20)});const p=screen.dipToScreenPoint({x:Math.round(b.x+this.slot.x+r.x),y:Math.round(b.y+this.slot.y+r.y)});return {x:Math.round(p.x),y:Math.round(p.y),activateX:Math.round(a.x),activateY:Math.round(a.y),hwnd:this.win.getNativeWindowHandle().readBigUInt64LE().toString()};}
  close(){this.closed=true;this.bridge.close();for(const view of [this.shield,this.guest]){this.win.contentView.removeChildView(view);if(!view.webContents.isDestroyed())view.webContents.close({waitForBeforeUnload:false})}}
}
