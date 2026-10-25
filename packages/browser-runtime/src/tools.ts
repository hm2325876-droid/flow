import type {Page,Locator} from 'playwright-core';
import {browserActionSchema,type BrowserAction,type BrowserOutcome,type Locator as SemanticTarget} from '@flowproof/contracts';

export const ACTION_TIMEOUT=15_000;
export function allowedBrowserUrl(value:string,origin:string){try{const url=new URL(value);return url.protocol==='http:'&&url.hostname==='localhost'&&url.origin===origin&&!url.username&&!url.password;}catch{return false;}}
export function semanticLocator(page:Page,locator:SemanticTarget):Locator{
 switch(locator.by){
  case 'role':return page.getByRole(locator.role as Parameters<Page['getByRole']>[0],{name:locator.value,exact:true});
  case 'label':return page.getByLabel(locator.value,{exact:true});
  case 'testId':return page.getByTestId(locator.value);
  case 'text':return page.getByText(locator.value,{exact:true});
 }
}
export class BrowserTools {
 private active=false;
 private pendingWork:Promise<BrowserOutcome>|null=null;
 private uncertain=false;
 private secrets=new Set<string>();
 constructor(private page:()=>Page|undefined,private origin:()=>string|undefined){}
 registerSecret(value:string){if(value)this.secrets.add(value);}
 clearSecrets(){this.secrets.clear();this.uncertain=false;}
 private redact(value:string){let result=value;for(const secret of this.secrets){result=result.split(secret).join('[redacted]');result=result.split(encodeURIComponent(secret)).join('[redacted]');}return result;}
 private async rememberInputs(page:Page){
  // Private Utility-only redaction material, including values entered during
  // User control. None of these values becomes a model-visible property.
  const inputs=await page.locator('input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),textarea,[contenteditable="true"]').evaluateAll(elements=>({overflow:elements.length>40||elements.slice(0,40).some(e=>(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement?e.value:e.textContent||'').length>2000),values:elements.slice(0,40).map(e=>(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement?e.value:e.textContent||'').slice(0,2000)).filter(Boolean)}));
  for(const value of inputs.values)this.registerSecret(value);inputs.values.length=0;return !inputs.overflow;
 }
 private async observation(page:Page){
  const safe=await this.rememberInputs(page);
  if(!safe)return {url:new URL(page.url()).origin+'/',title:'Page details withheld for input privacy',text:'Visible details were withheld because input privacy collection limits were exceeded.',elements:[]};
  const observed=await page.evaluate(()=>{
   const visible=(e:Element)=>{const r=e.getBoundingClientRect(),style=getComputedStyle(e);return r.width>0&&r.height>0&&style.visibility!=='hidden'&&style.display!=='none';};
   const name=(e:Element)=>e.getAttribute('aria-label')||(e.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim()||((e as HTMLInputElement).labels?.[0]?.textContent)||e.getAttribute('alt')||e.getAttribute('title')||(e instanceof HTMLInputElement&&['button','submit','reset'].includes(e.type)?e.value:e.textContent)||'';
   const elements=Array.from(document.querySelectorAll('button,a[href],input:not([type="hidden"]),select,textarea,[role],[contenteditable="true"]')).filter(visible).slice(0,60).map(e=>({role:e.getAttribute('role')||(e.tagName==='BUTTON'?'button':e.tagName==='A'?'link':e.tagName==='SELECT'?'combobox':e instanceof HTMLInputElement&&['checkbox','radio'].includes(e.type)?e.type:e instanceof HTMLInputElement&&['submit','button','reset'].includes(e.type)?'button':'textbox'),name:name(e).trim().slice(0,160),...(e instanceof HTMLInputElement?{type:e.type}:{}),...(e.hasAttribute('data-testid')?{testId:(e.getAttribute('data-testid')||'').slice(0,160)}:{})}));
   return {url:location.href,title:document.title.slice(0,300),text:(document.body?.innerText||'').slice(0,6000),elements};
  });
  const publicUrl=new URL(observed.url);publicUrl.search='';publicUrl.hash='';
  return {...observed,url:this.redact(publicUrl.href),title:this.redact(observed.title),text:this.redact(observed.text),elements:observed.elements.map(e=>({...e,name:this.redact(e.name)}))};
 }
 async perform(input:BrowserAction,resolvedSecret?:string):Promise<BrowserOutcome>{
  const parsed=browserActionSchema.safeParse(input);
  if(!parsed.success)return {ok:false,code:'invalid',summary:'Browser arguments are invalid. Inspect the page and use a supported semantic target.'};
  const action=parsed.data,page=this.page(),origin=this.origin();
  if(action.kind==='fill'&&action.secretRef&&resolvedSecret===undefined)return {ok:false,code:'policy',summary:'The protected input reference must be resolved by Main for this exact authorized field.'};
  if(!page||page.isClosed()||!origin)return {ok:false,code:'browser-unavailable',summary:'The authorized native browser session is unavailable.'};
  if(this.active)return {ok:false,code:'policy',summary:'Another browser action is still active.'};
  if(this.pendingWork)return {ok:false,code:'unknown',summary:'An earlier browser command has not reached a safe checkpoint. Recover the session before continuing.'};
  if(this.uncertain&&!['inspect','capture'].includes(action.kind))return {ok:false,code:'unknown',summary:'A previous action has an uncertain outcome. Inspect or recover the browser before further actions.'};
  if(!allowedBrowserUrl(page.url(),origin))return {ok:false,code:'scope',summary:'The current page is outside the authorized localhost origin.'};
  if(action.kind==='navigate'&&!allowedBrowserUrl(action.url!,origin))return {ok:false,code:'scope',summary:'Navigation outside the exact authorized localhost origin was denied.'};
  this.active=true;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const work=async():Promise<BrowserOutcome>=>{
    let locator:Locator|undefined;
    if('locator' in action&&action.locator){locator=semanticLocator(page,action.locator);if(action.kind!=='wait'&&await locator.count()!==1)return {ok:false,code:'not-found',summary:'The semantic target is missing or ambiguous. Inspect the page and choose a unique accessible element.'};}
    switch(action.kind){
     case 'navigate':await page.goto(action.url,{timeout:ACTION_TIMEOUT,waitUntil:'domcontentloaded'});break;
     case 'click':await locator!.click({timeout:ACTION_TIMEOUT});break;
     case 'fill':{
      // Main resolves one-use secrets before this private execution call; never copy values into a result.
      const value=action.secretRef?resolvedSecret!:action.value??'';this.registerSecret(value);await locator!.fill(value,{timeout:ACTION_TIMEOUT});resolvedSecret=undefined;break;
     }
     case 'select':await locator!.selectOption(action.values,{timeout:ACTION_TIMEOUT});break;
     case 'press':await locator!.press(action.key,{timeout:ACTION_TIMEOUT});break;
     case 'scroll':await page.mouse.wheel(0,(action.direction==='up'?-1:1)*(action.amount??500));break;
     case 'wait':await locator!.waitFor({state:action.state??'visible',timeout:ACTION_TIMEOUT});break;
     case 'capture':{
      if(!await this.rememberInputs(page))return {ok:false,code:'policy',summary:'Screenshot omitted because input privacy collection limits were exceeded. No potentially exposed content was captured.'};
      const mask=[page.locator('input,textarea,[contenteditable="true"]')];
      for(const secret of this.secrets)mask.push(page.getByText(secret,{exact:false}));
      const screenshot=await page.screenshot({type:'png',fullPage:false,mask,timeout:ACTION_TIMEOUT});
      if(screenshot.length>2_000_000)return {ok:false,code:'invalid',summary:'The masked screenshot exceeded the bounded capture size.'};
      return {ok:true,code:'ok',summary:'Captured an actual masked screenshot of the authorized native page.',screenshot:screenshot.toString('base64'),screenshotBytes:screenshot.length,observation:await this.observation(page)};
     }
     case 'inspect':break;
    }
    if(!allowedBrowserUrl(page.url(),origin))return {ok:false,code:'scope',summary:'The action encountered an unauthorized navigation; execution remains excluded.'};
    const observation=await this.observation(page);
    if(action.kind==='inspect')this.uncertain=false;
    return {ok:true,code:'ok',summary:action.kind==='inspect'?'Inspected the actual visible native page.':`The ${action.kind} operation returned; inspect the observed page to verify its intended effect.`,observation};
   };
   const pending=work().finally(()=>{if(this.pendingWork===pending)this.pendingWork=null;});this.pendingWork=pending;
   return await Promise.race([pending,new Promise<BrowserOutcome>(resolve=>{timer=setTimeout(()=>{this.uncertain=true;resolve({ok:false,code:'unknown',summary:'The browser action exceeded its deadline. Its outcome is uncertain; it must not be replayed automatically.'});},ACTION_TIMEOUT);})]);
  }catch(cause){
   const name=cause instanceof Error?cause.name:'';
   const closed=page.isClosed();
   if(name==='TimeoutError')this.uncertain=true;
   return {ok:false,code:closed?'browser-unavailable':name==='TimeoutError'?'timeout':'unknown',summary:closed?'The native browser session closed during the action.':name==='TimeoutError'?'The browser action timed out. Its effect must be inspected before continuing.':'The browser action could not establish a reliable result. Inspect before any further action.'};
  }finally{if(timer)clearTimeout(timer);this.active=false;}
 }
}
