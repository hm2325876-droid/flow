import {createHash} from 'node:crypto';

export type ActionAssessment={decision:'allow'|'approval'|'deny';summary:string;binding:string;denialKey:string;formRequest?:{url:string;method:string}};
export type NativeActionDetails={found:boolean;unique:boolean;nodeIndex?:number;disabled?:boolean;editable?:boolean;sensitive?:boolean;name?:string;role?:string;href?:string;form?:{url:string;method:string};sensitiveGetForm?:boolean};
export function inScope(url:string,origin:string){try{const target=new URL(url);return target.protocol==='http:'&&target.origin===origin&&target.hostname==='localhost'&&!target.username&&!target.password;}catch{return false;}}
export function restrictedEffectUrl(value:string){
 try{const url=new URL(value),risky=/\b(delete|destroy|erase|wipe|purge|purchase|checkout|payment|pay|transfer[-_ ]?(?:money|funds))\b/i;
  if(url.pathname.split('/').some(part=>risky.test(decodeURIComponent(part).replace(/[_-]/g,' '))))return true;
  for(const [key,value] of url.searchParams)if(/password|secret|token|api.?key|recovery.?code/i.test(key)||/^(action|operation|command|cmd|do)$/i.test(key)&&risky.test(value))return true;
  return false;
 }catch{return true;}
}
export function assessNativeAction(action:{kind:string;url?:string;secretRef?:string;key?:string},details:NativeActionDetails|null,origin:string,generation:number):ActionAssessment{
 const binding=createHash('sha256').update(JSON.stringify({action,details,generation})).digest('hex');
 const denialKey=createHash('sha256').update(JSON.stringify({generation,target:details?.nodeIndex??details,effect:action.kind==='click'||action.kind==='press'&&action.key==='Enter'?'activate':action.kind})).digest('hex');
 const result=(decision:ActionAssessment['decision'],summary:string):ActionAssessment=>({decision,summary,binding,denialKey,...(details?.form&&details.form.method!=='GET'&&inScope(details.form.url,origin)&&(action.kind==='click'||action.kind==='press'&&action.key==='Enter')?{formRequest:details.form}:{})});
 if(action.kind==='navigate')return result(action.url&&inScope(action.url,origin)&&!restrictedEffectUrl(action.url)?'allow':'deny','Navigation is limited to this audit’s authorized origin and excludes recognized destructive, financial and credential-bearing URLs.');
 if(['inspect','capture','scroll','wait'].includes(action.kind))return result('allow','Read-only observation within the authorized browser session.');
 if(!details?.found||!details.unique||details.disabled)return result('deny','The proposed target is missing, ambiguous or disabled. Inspect the current page before choosing a unique target.');
 if(details.href&&!inScope(details.href,origin))return result('deny','This control navigates outside the authorized localhost scope.');
 if(['fill','select'].includes(action.kind)){
  if(!details.editable)return result('deny','The selected element is not editable.');
  if(details.sensitive&&!action.secretRef)return result('deny','Sensitive fields require an operation-bound secret reference from structured input.');
  return result('allow','Enter test input into the identified field; values are excluded from activity details.');
 }
 const name=details.name??'';
 if(/\b(delete|destroy|erase|wipe|purge|purchase|buy|checkout|pay(?:ment)?|transfer\s+(?:money|funds))\b/i.test(name))return result('deny','Destructive actions and real financial transactions are blocked by the audit policy.');
 if(details.form&&!inScope(details.form.url,origin))return result('deny','This form submits outside the authorized localhost scope.');
 const submits=Boolean(details.form)&&(action.kind==='click'||action.kind==='press'&&action.key==='Enter');
 if(submits&&details.sensitiveGetForm)return result('deny','A sensitive form must not submit credentials through URL parameters.');
 if(submits&&/\b(log\s*in|sign\s*in|search|filter|validate|check|test)\b/i.test(name))return result('allow','A recognized low-risk local test form; only its declared same-origin submission endpoint is eligible.');
 if(submits)return result('approval','This local form may change application state. Approve this exact operation once, or deny it.');
 if(action.kind==='press'&&action.key!=='Enter')return result('allow','Keyboard interaction with the identified element.');
 if(details.role==='link'&&details.href)return result('allow','Follow the identified in-scope local link.');
 if(['checkbox','radio','option','combobox'].includes(details.role??''))return result('allow','Change a local test selection.');
 if(/\b(next|back|previous|close|open|show|hide|toggle|increment|decrement|search|filter|sort|validate|check|cancel)\b/i.test(name))return result('allow','An understood low-risk interface interaction.');
 return result('approval','The effect of this interface action is uncertain. Approve this exact operation once, or deny it.');
}

/** Exact, one-use native request allowance; never a blanket POST bypass. */
export class RequestAllowance {
 private grant:{url:string;method:string;expires:number}|null=null;
 set(request:{url:string;method:string}|undefined,now=Date.now()){this.grant=request?{...request,method:request.method.toUpperCase(),expires:now+15_000}:null;}
 clear(){this.grant=null;}
 consume(url:string,method:string,now=Date.now()){
  const grant=this.grant;
  if(!grant||now>grant.expires||grant.url!==url||grant.method!==method.toUpperCase())return false;
  this.grant=null;return true;
 }
}
