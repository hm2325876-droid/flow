import {utilityCommandSchema,browserOutcomeSchema,type BrowserAction,type AuditService} from '@flowproof/contracts';
import {BrowserRuntime} from '@flowproof/browser-runtime';
import {getCatalog,verifyConnection,verifyModel,resolveModel} from '@flowproof/ai-providers';
import {AgentRuntime} from '@flowproof/agent-core';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
type Parent={on(event:'message',listener:(event:{data:unknown})=>void):void;postMessage(message:unknown):void};
export function startUtility(createModel:typeof resolveModel=resolveModel){
const parent=(process as NodeJS.Process&{parentPort:Parent}).parentPort;
const runtime=new BrowserRuntime();let busy=false,providerBusy=false;let agent:AgentRuntime|undefined;let connectedTarget='';
const pending=new Map<string,{resolve:(value:any)=>void;reject:()=>void;timer:ReturnType<typeof setTimeout>}>();
const replySchema=z.object({type:z.literal('audit-service-reply'),requestId:z.string().uuid(),ok:z.boolean(),result:z.unknown().optional()}).strict();
function service(auditId:string,request:AuditService):Promise<any>{return new Promise((resolve,reject)=>{const requestId=randomUUID(),timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('Main authorization unavailable'));},20000);pending.set(requestId,{resolve,reject:()=>reject(new Error('Main authorization rejected')),timer});parent.postMessage({type:'audit-service',requestId,auditId,request});});}
async function perform(auditId:string,action:BrowserAction,actionId:string){
 const lease=await service(auditId,{type:'lease',actionId,action});if(!lease?.ok)return browserOutcomeSchema.parse(lease);
 let known=false,result:import('@flowproof/contracts').BrowserOutcome|undefined,released:{policyBlocked?:boolean}|undefined;
 try{
  let secret:string|undefined;
  if(action.kind==='fill'&&action.secretRef){const response=await service(auditId,{type:'secret',actionId,secretRef:action.secretRef,locator:action.locator});secret=response.value;runtime.registerSecret(secret!);}
  result=await runtime.perform(action,secret);secret=undefined;known=!['unknown','timeout','browser-unavailable'].includes(result.code);
  if(result.screenshot){const artifact=await service(auditId,{type:'artifact',data:result.screenshot,bytes:result.screenshotBytes!});const {screenshot,...safe}=result;result=browserOutcomeSchema.parse({...safe,artifactId:artifact.artifactId});}
 }finally{released=await service(auditId,{type:'release',actionId,known}).catch(()=>undefined);}
 if(released?.policyBlocked&&result?.ok)result={...result,ok:false,code:'policy',summary:'The native policy blocked a request during this operation. Its intended effect is unverified; inspect the page and choose a safe supported path.'};
 return browserOutcomeSchema.parse(result);
}
parent.on('message',async event=>{
  const reply=replySchema.safeParse(event.data);if(reply.success){const p=pending.get(reply.data.requestId);if(p){clearTimeout(p.timer);pending.delete(reply.data.requestId);reply.data.ok?p.resolve(reply.data.result):p.reject();}return;}
  const parsed=utilityCommandSchema.safeParse(event.data);
  if(!parsed.success)return;
  const message=parsed.data;
  if(message.type==='audit-start'||message.type==='audit-answer'||message.type==='audit-control'||message.type==='audit-interrupt'||message.type==='audit-recover'){
   try{
    if(message.type==='audit-start'){
     if(agent||connectedTarget!==message.connection.targetId)throw new Error('Invalid audit activation');
     const model=createModel(message.config.selection,message.key);message.key='';
     const current=new AgentRuntime({auditId:message.auditId,config:message.config,model,perform:(action,id)=>perform(message.auditId,action,id),publish:snapshot=>parent.postMessage({type:'audit-state',snapshot}),setOwner:async owner=>{await service(message.auditId,{type:'owner',owner});},recoverBrowser:async owner=>{try{const response=await service(message.auditId,{type:'recover',owner});await runtime.connect(response.connection);connectedTarget=response.connection.targetId;await service(message.auditId,{type:'owner',owner});return true;}catch{return false;}}});
     agent=current;void current.start().catch(()=>current.interrupt('The audit runtime failed safely.')).finally(()=>{runtime.clearSecrets();if(agent===current)agent=undefined;});
    }else if(message.type==='audit-interrupt')await agent?.interrupt(message.reason);
    else{if(!agent||agent.snapshot().auditId!==message.auditId)throw new Error('Stale audit command');if(message.type==='audit-answer')agent.answer(message.questionId,message.answer);else if(message.type==='audit-control'){if(message.owner==='user')await agent.takeControl();else if(message.owner==='agent')await agent.returnControl();else throw new Error();}else if(message.type==='audit-recover')await agent.browserFailed();}
    parent.postMessage({type:'reply',id:message.id,ok:true,result:{accepted:true}});
   }catch{parent.postMessage({type:'reply',id:message.id,ok:false,error:'Audit command was stale, invalid or unavailable.'});}
   finally{if(message.type==='audit-start')message.key='';}return;
  }
  if(message.type==='provider'){
    if(agent||providerBusy){parent.postMessage({type:'reply',id:message.id,ok:false,error:'Another provider operation is active'});return;}
    providerBusy=true;
    try{
      const command=message.command;
      const result=command.type==='catalog'?await getCatalog(command.cache,command.refresh):command.phase==='connection'?await verifyConnection(command.selection,command.key):await verifyModel(command.selection,command.key);
      parent.postMessage({type:'reply',id:message.id,ok:true,result});
    }catch{parent.postMessage({type:'reply',id:message.id,ok:false,error:message.command.type==='catalog'?'Model discovery is unavailable. Retry with an internet connection or use the saved catalog.':'Internal desktop provider communication failed. Retry the check or restart the application.'});}
    finally{if(message.command.type==='verify')message.command.key='';providerBusy=false;}
    return;
  }
  if(busy){parent.postMessage({type:'reply',id:message.id,ok:false,error:'Another browser operation is active'});return;}
  busy=true;
  try {
    if(message.type==='connect')connectedTarget=message.connection.targetId;
    if(message.type==='close'){connectedTarget='';runtime.clearSecrets();}
    const result=message.type==='connect'?await runtime.connect(message.connection):message.type==='check'?await runtime.check(message.url,message.marker,message.holdMs):await runtime.close();
    parent.postMessage({type:'reply',id:message.id,ok:true,result});
  } catch(cause) {if(process.env.FLOWPROOF_SMOKE_PIPE)console.error('UTILITY_FAILURE',String(cause).replace(/Bearer\s+\S+|[a-f0-9]{64}/g,'[REDACTED]'));parent.postMessage({type:'reply',id:message.id,ok:false,error:'Browser operation failed; inspect the connection and actual page before retrying'});}
  finally {busy=false;}
});
parent.postMessage({type:'ready',pid:process.pid});

}
