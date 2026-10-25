import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {AuditCheckpoint} from '@flowproof/persistence';
import {auditCommandSchema,auditSnapshotSchema,validateAuditAnswer,terminalAuditStatuses,type AuditSnapshot,type AuditService,type AuditCommand,type AuditHandoff,type Connection,type BrowserAction,type Locator} from '@flowproof/contracts';
import type {AgentSupervisor} from './agent-supervisor';
import type {SetupService} from './setup';
import type {BrowserHost} from './browser/host';
type Ports={folder:string;setup:SetupService;worker:AgentSupervisor;attach:(config:AuditHandoff)=>Promise<Connection>;getHost:()=>BrowserHost|undefined;recover:(config:AuditHandoff)=>Promise<Connection>;finish:()=>Promise<void>;publish:(snapshot:AuditSnapshot)=>void};
/** Privileged authorization, leases and secret broker. Agent Core owns the execution lifecycle. */
export class AuditController {
 private value:AuditSnapshot|null=null;private expected:{auditId:string;config:AuditHandoff}|null=null;
 private starting=false;private failed=false;private lease:{id:string;action:BrowserAction;blocked:number}|null=null;
 private approvals=new Map<string,{action:BrowserAction;binding:string;denialKey?:string;approved:boolean}>();private denied=new Set<string>();
 private secrets=new Map<string,{value:string;target?:Locator;auditId:string;generation:number}>();
 private answering=new Set<string>();
 private checkpoint:AuditCheckpoint;private writes:Promise<void>=Promise.resolve();private recovering=false;
 private cleanup:Promise<void>|null=null;private finishedId:string|null=null;
 constructor(private p:Ports){this.checkpoint=new AuditCheckpoint(p.folder);}
 async init(){try{this.value=await this.checkpoint.read();}catch{this.failed=true;}}
 get active(){return this.starting||this.running||Boolean(this.cleanup);}
 get running(){return Boolean(this.value&&!terminalAuditStatuses.has(this.value.status));}
 snapshot(){return this.value;}
 async handle(input:AuditCommand){
  const command=auditCommandSchema.parse(input);
  if(command.type==='snapshot')return this.value;
  if(command.type==='start'){
   if(this.active)throw new Error('FLOWPROOF_AUDIT_ACTIVE');if(this.failed)throw new Error('FLOWPROOF_AUDIT_STORAGE');
   this.starting=true;
   let attached=false;let stage:'setup'|'browser'|'model'|'utility'='setup';
   try{
    const state=await this.p.setup.handle({type:'prepare',draft:command.draft,authorized:command.authorized});
    const config=state.review?.handoff;if(!config||!state.review?.ready||!command.authorized)throw new Error('FLOWPROOF_AUDIT_NOT_READY');
    const auditId=randomUUID();this.expected={auditId,config};this.approvals.clear();this.denied.clear();this.secrets.clear();
    stage='browser';attached=true;const connection=await this.p.attach(config);const host=this.p.getHost();if(!host)throw new Error('FLOWPROOF_AUDIT_TARGET');host.beginAudit();
    stage='model';
    await this.p.setup.withExecutionKey(config.selection,key=>{stage='utility';return this.p.worker.request({type:'audit-start',auditId,config,key,connection});});
    return this.value;
   }catch(cause){this.expected=null;if(attached)await this.p.finish().catch(()=>{});if(cause instanceof Error&&/^FLOWPROOF_AUDIT_/.test(cause.message))throw cause;throw new Error(({setup:'FLOWPROOF_AUDIT_SETUP',browser:'FLOWPROOF_AUDIT_TARGET',model:'FLOWPROOF_AUDIT_MODEL',utility:'FLOWPROOF_AUDIT_RUNTIME'} as const)[stage]);}
   finally{this.starting=false;}
  }
  if(!this.value||command.auditId!==this.value.auditId||!this.running)throw new Error('FLOWPROOF_AUDIT_STALE');
  if(command.type==='answer'){
   const q=this.value.question,a=command.answer;
   if(!q||q.id!==command.questionId||validateAuditAnswer(q,a)||this.answering.has(q.id))throw new Error('FLOWPROOF_AUDIT_ANSWER');
   if(q.operationId){const pending=this.approvals.get(q.operationId);if(!pending||a.outcome!=='answered')throw new Error('FLOWPROOF_AUDIT_ANSWER');pending.approved=a.values?.[0]==='Approve';if(!pending.approved)this.denied.add(pending.denialKey??pending.binding);}
   const answer={...a};let reference:string|undefined;
   if(a.outcome==='answered'&&(q.kind==='secret'||a.sensitive)){
    if(!q.target)throw new Error('FLOWPROOF_AUDIT_SECRET_TARGET');
    reference=randomUUID();this.secrets.set(reference,{value:a.text??'',target:q.target,auditId:this.value.auditId,generation:this.p.getHost()!.generation});answer.text=undefined;
   }
   this.answering.add(q.id);
   try{await this.p.worker.request({type:'audit-answer',auditId:this.value.auditId,questionId:q.id,answer:{...answer,...(reference?{secretRef:reference}:{})}});}catch{if(reference)this.secrets.delete(reference);if(q.operationId){const approval=this.approvals.get(q.operationId);if(approval)approval.approved=false;}throw new Error('FLOWPROOF_AUDIT_ANSWER');}finally{this.answering.delete(q.id);if(reference){a.text='';answer.text=undefined;}}
  }else await this.p.worker.request({type:'audit-control',auditId:this.value.auditId,owner:command.type==='take-control'?'user':'agent'});
  return this.value;
 }
 accept(raw:AuditSnapshot){
  const state=auditSnapshotSchema.parse(raw),expected=this.expected;
  if(!expected||state.auditId!==expected.auditId||JSON.stringify(state.config)!==JSON.stringify(expected.config)||state.events.some((e,i)=>e.auditId!==state.auditId||e.seq!==i+1))return;
  if(this.value?.auditId===state.auditId&&(state.events.length<this.value.events.length||this.value.events.some((e,i)=>JSON.stringify(e)!==JSON.stringify(state.events[i]))||terminalAuditStatuses.has(this.value.status)&&!terminalAuditStatuses.has(state.status)))return;
  this.value=state;
  this.writes=this.writes.then(()=>this.checkpoint.save(state)).then(()=>this.p.publish(state)).catch(()=>{const first=!this.failed;this.failed=true;if(first)void this.interrupt('Local checkpoint storage failed. Further execution was stopped; the last update may not be durable.');});
  if(terminalAuditStatuses.has(state.status)&&this.finishedId!==state.auditId){this.finishedId=state.auditId;this.secrets.clear();this.approvals.clear();this.cleanup=this.p.finish().catch(()=>{}).finally(()=>{this.cleanup=null;});}
 }
 async service(auditId:string,request:AuditService):Promise<unknown>{
  await this.writes;
  if(this.failed||!this.expected||auditId!==this.expected.auditId||!this.running)throw new Error('Inactive audit');
  const host=this.p.getHost();if(!host)throw new Error('No authorized browser');
  switch(request.type){
   case 'lease':{
    if(this.lease)throw new Error('A browser operation is already active');
    if(request.action.kind==='fill'&&request.action.secretRef){const secret=this.secrets.get(request.action.secretRef);if(!secret||secret.generation!==host.generation||JSON.stringify(secret.target)!==JSON.stringify(request.action.locator)){if(secret&&secret.generation!==host.generation)this.secrets.delete(request.action.secretRef);return {ok:false,code:'policy',summary:'Sensitive input is unavailable for this page/field. Request fresh structured input for the exact current target.'};}}
    const assessment=await host.assessAction(request.action);
    if(assessment.decision==='deny')return {ok:false,code:'policy',summary:assessment.summary};
    if(this.denied.has(assessment.denialKey??assessment.binding))return {ok:false,code:'policy',summary:'This operation was denied for the current page. Choose a safe alternative; denial is not permission.'};
    const approval=this.approvals.get(request.actionId);
    if(assessment.decision==='approval'&&(!approval?.approved||approval.binding!==assessment.binding||JSON.stringify(approval.action)!==JSON.stringify(request.action))){this.approvals.set(request.actionId,{action:request.action,binding:assessment.binding,denialKey:assessment.denialKey,approved:false});const target='locator' in request.action?request.action.locator.value:host.origin;return {ok:false,code:'approval-required',summary:`${assessment.summary} Operation: ${request.action.kind} on "${target}" at ${host.origin}. Applies once to this page state.`.slice(0,500),approvalId:request.actionId};}
    await host.beginAction(request.actionId,request.action,Boolean(approval?.approved),assessment.binding);this.approvals.delete(request.actionId);this.lease={id:request.actionId,action:request.action,blocked:host.blockedRequests};
    return {ok:true};
   }
   case 'release':{const policyBlocked=this.lease?.id===request.actionId&&host.blockedRequests>this.lease.blocked;if(this.lease?.id===request.actionId){if(request.known){host.endAction(request.actionId);this.lease=null;}else host.bridge.active=false;}return {ok:true,policyBlocked};}
   case 'secret':{
    const value=this.secrets.get(request.secretRef),action=this.lease?.action;
    if(this.lease?.id!==request.actionId||action?.kind!=='fill'||action.secretRef!==request.secretRef||!value||value.auditId!==auditId||value.generation!==host.generation||JSON.stringify(value.target)!==JSON.stringify(request.locator)||JSON.stringify(action.locator)!==JSON.stringify(request.locator))throw new Error('Secret is not authorized for that operation');
    this.secrets.delete(request.secretRef);return {value:value.value};
   }
   case 'owner':{
    if(request.owner==='user'&&this.lease)throw new Error('Browser operation has not reached its safe checkpoint');
    host.setOwner(request.owner==='decision'?'pending':request.owner);if(!this.lease)host.bridge.active=false;return {ok:true};
   }
   case 'recover':{
    this.lease=null;this.approvals.clear();this.secrets.clear();const connection=await this.p.recover(this.expected.config);return {connection};
   }
   case 'artifact':{
    const png=Buffer.from(request.data,'base64');if(png.length!==request.bytes||png.length>8_000_000||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Invalid artifact');
    const artifactId=randomUUID(),folder=path.join(this.p.folder,'audit-artifacts',auditId);await mkdir(folder,{recursive:true});await writeFile(path.join(folder,artifactId+'.png'),png);return {artifactId};
   }
  }
 }
 nativeChanged(){if(!this.running||this.recovering||!this.p.getHost()?.crashed)return;this.recovering=true;void this.p.worker.request({type:'audit-recover',auditId:this.value!.auditId}).catch(()=>this.interrupt('The native browser could not be recovered safely.')).finally(()=>{this.recovering=false;});}
 async interrupt(reason:string){
  if(!this.running)return;await this.p.worker.request({type:'audit-interrupt',reason}).catch(()=>{});
  if(this.running){await this.writes;const state=this.value!;this.value={...state,status:'interrupted',owner:'agent',question:null,endedAt:new Date().toISOString(),reason,events:[...state.events,{auditId:state.auditId,id:randomUUID(),seq:state.events.length+1,at:new Date().toISOString(),type:'audit-interrupted',summary:reason}]};await this.checkpoint.save(this.value).catch(()=>{});this.p.publish(this.value);}
  else if(this.failed&&this.value){this.value={...this.value,status:'interrupted',question:null,reason,endedAt:this.value.endedAt??new Date().toISOString()};this.p.publish(this.value);}
  this.secrets.clear();this.approvals.clear();this.lease=null;
  if(this.value&&terminalAuditStatuses.has(this.value.status)&&this.finishedId!==this.value.auditId){this.finishedId=this.value.auditId;this.cleanup=this.p.finish().catch(()=>{}).finally(()=>{this.cleanup=null;});}
 }
 async close(){await this.interrupt('Application shutdown interrupted the audit. Unfinished actions are not assumed complete.');await this.writes;this.secrets.clear();}
}
