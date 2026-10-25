import {afterEach,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {AuditController} from '../src/main/audit';
import type {AgentSupervisor} from '../src/main/agent-supervisor';
import type {SetupService} from '../src/main/setup';
import type {BrowserHost} from '../src/main/browser/host';
import {auditSnapshotSchema,defaultAuditDraft,type AuditSnapshot,type AuditHandoff,type AuditQuestion,type BrowserAction,type Connection} from '@flowproof/contracts';

const folders:string[]=[],controllers:AuditController[]=[];
const at='2026-10-25T12:00:00.000Z',target={by:'label' as const,value:'Declared field'};
const config:AuditHandoff={schemaVersion:1,selection:{providerId:'openrouter',modelId:'vendor/Original:free'},projectName:'Owned local project',goal:'Check the declared local interaction.',context:'',targetUrl:'http://localhost:3000/',maxSteps:40,timeoutMinutes:10,authorizedAt:at,checkedAt:at,providerValidatedAt:at,expiresAt:'2026-10-25T12:05:00.000Z'};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
afterEach(async()=>{for(const controller of controllers.splice(0))await controller.close();for(const f of folders.splice(0)){if(path.dirname(f)!==os.tmpdir()||!path.basename(f).startsWith('flowproof-audit-main-'))throw Error('Unsafe test cleanup');await rm(f,{recursive:true,force:true});}});
async function fixture(options:{prepare?:()=>Promise<unknown>;corrupt?:boolean;checkpoint?:AuditSnapshot}={}){
 const folder=await mkdtemp(path.join(os.tmpdir(),'flowproof-audit-main-'));folders.push(folder);if(options.corrupt)await writeFile(path.join(folder,'audit-checkpoint.json'),'invalid','utf8');else if(options.checkpoint)await writeFile(path.join(folder,'audit-checkpoint.json'),JSON.stringify(options.checkpoint),'utf8');
 let owner='agent',activeAction:string|null=null,binding='document-1',decision:'allow'|'approval'|'deny'='allow';
 const host={origin:'http://localhost:3000',bridge:{active:false},beginAudit:vi.fn(()=>{owner='agent';}),assessAction:vi.fn(async()=>({decision,summary:'Review the exact test operation.',binding,denialKey:binding})),beginAction:vi.fn(async(id:string,_action:BrowserAction,approved:boolean)=>{if(owner!=='agent'||activeAction||decision==='deny'||decision==='approval'&&!approved)throw Error('Exclusive action denied');activeAction=id;host.bridge.active=true;}),endAction:vi.fn((id:string)=>{if(id!==activeAction)throw Error('Stale lease');activeAction=null;host.bridge.active=false;}),setOwner:vi.fn((next:string)=>{if(next==='user'&&activeAction)throw Error('Active operation');owner=next;host.bridge.active=false;}),crashed:false};
 const setup={handle:vi.fn(async()=>options.prepare?options.prepare():{review:{ready:true,handoff:config}}),withExecutionKey:vi.fn(async(selection:AuditHandoff['selection'],fn:(key:string)=>Promise<unknown>)=>{expect(selection).toEqual(config.selection);return fn('unit-provider-input-marker');})};
 const connection:Connection={endpoint:'ws://127.0.0.1:3456/audit',token:'a'.repeat(64),targetId:'native-target',origin:'http://localhost:3000'};
 let controller:AuditController;const states:AuditSnapshot[]=[];let answerGate:ReturnType<typeof deferred<unknown>>|null=null;
 const worker={request:vi.fn(async(command:Record<string,unknown>)=>{
  if(command.type==='audit-start'){const state=auditSnapshotSchema.parse({auditId:command.auditId,config:command.config,status:'running',owner:'agent',events:[{auditId:command.auditId,id:randomUUID(),seq:1,at,type:'audit-started',summary:'Audit started against its authorized native session.'}],todos:[],question:null,candidates:[],usage:{modelCalls:0,browserActions:0,inputTokens:null,outputTokens:null,retries:0,browserRecoveries:0,cost:null},startedAt:at,endedAt:null,reason:null});controller.accept(state);return {started:true};}
  if(command.type==='audit-answer'&&answerGate)return answerGate.promise;
  return {ok:true};
 })};
 let finishGate:ReturnType<typeof deferred<void>>|null=null;
 const attach=vi.fn(async()=>connection),finish=vi.fn(async()=>{if(finishGate)await finishGate.promise;});
 controller=new AuditController({folder,setup:setup as unknown as SetupService,worker:worker as unknown as AgentSupervisor,attach,getHost:()=>host as unknown as BrowserHost,recover:async()=>connection,finish,publish:state=>states.push(state)});controllers.push(controller);await controller.init();
 const start=()=>controller.handle({type:'start',draft:{...defaultAuditDraft,projectName:config.projectName,goal:config.goal},authorized:true});
 function question(q:AuditQuestion){const current=controller.snapshot()!;controller.accept({...current,status:'awaiting-input',question:q,events:[...current.events,{auditId:current.auditId,id:randomUUID(),seq:current.events.length+1,at,type:'input-requested',summary:'A specific input is required.'}]});}
 return {controller,folder,setup,worker,host,attach,finish,states,start,question,setDecision:(value:typeof decision)=>{decision=value;},setBinding:(value:string)=>{binding=value;},holdAnswer:()=>{answerGate=deferred<unknown>();return answerGate;},holdFinish:()=>{finishGate=deferred<void>();return finishGate;}};
}
describe('Main audit activation, authorization and secret boundary',()=>{
 it('reserves duplicate starts before awaiting preflight and preserves exact provider/model identity',async()=>{
  const prepared=deferred<unknown>(),f=await fixture({prepare:()=>prepared.promise}),first=f.start();
  await expect(f.start()).rejects.toThrow('ACTIVE');expect(f.attach).not.toHaveBeenCalled();prepared.resolve({review:{ready:true,handoff:config}});const state=await first;expect(state?.config.selection).toEqual(config.selection);
  expect(f.setup.handle).toHaveBeenCalledWith(expect.objectContaining({type:'prepare',authorized:true}));expect(f.worker.request.mock.calls.filter(([command])=>command.type==='audit-start')).toHaveLength(1);
  await expect(f.start()).rejects.toThrow('ACTIVE');
 });
 it('requires fresh explicit consent and ready preflight, and blocks corrupt checkpoint storage',async()=>{
  const noConsent=await fixture();await expect(noConsent.controller.handle({type:'start',draft:defaultAuditDraft,authorized:false})).rejects.toThrow('NOT_READY');expect(noConsent.attach).not.toHaveBeenCalled();expect(noConsent.worker.request).not.toHaveBeenCalled();
  const notReady=await fixture({prepare:async()=>({review:{ready:false,handoff:null}})});await expect(notReady.start()).rejects.toThrow('NOT_READY');expect(notReady.worker.request).not.toHaveBeenCalled();
  const corrupt=await fixture({corrupt:true});await expect(corrupt.start()).rejects.toThrow('STORAGE');expect(corrupt.setup.handle).not.toHaveBeenCalled();
 });
 it('gates exact one-use approvals by document binding and exclusive native ownership',async()=>{
  const f=await fixture();await f.start();const auditId=f.controller.snapshot()!.auditId,actionId=randomUUID(),action:BrowserAction={kind:'click',locator:{by:'role',role:'button',value:'Change test preference'}};f.setDecision('approval');
  expect(await f.controller.service(auditId,{type:'lease',actionId,action})).toMatchObject({code:'approval-required',approvalId:actionId});expect(f.host.beginAction).not.toHaveBeenCalled();
  f.question({id:randomUUID(),kind:'single',prompt:'Approve the exact test preference operation?',options:['Approve','Deny'],required:true,allowSkip:false,operationId:actionId});await f.controller.handle({type:'answer',auditId,questionId:f.controller.snapshot()!.question!.id,answer:{outcome:'answered',values:['Approve']}});
  f.setBinding('document-2');expect(await f.controller.service(auditId,{type:'lease',actionId,action})).toMatchObject({code:'approval-required'});expect(f.host.beginAction).not.toHaveBeenCalled();
  f.question({id:randomUUID(),kind:'single',prompt:'Approve this current page operation?',options:['Approve','Deny'],required:true,allowSkip:false,operationId:actionId});await f.controller.handle({type:'answer',auditId,questionId:f.controller.snapshot()!.question!.id,answer:{outcome:'answered',values:['Approve']}});expect(await f.controller.service(auditId,{type:'lease',actionId,action})).toEqual({ok:true});
  await expect(f.controller.service(auditId,{type:'owner',owner:'user'})).rejects.toThrow('checkpoint');await f.controller.service(auditId,{type:'release',actionId,known:true});expect(await f.controller.service(auditId,{type:'lease',actionId,action})).toMatchObject({code:'approval-required'});
  await f.controller.service(auditId,{type:'owner',owner:'user'});f.setDecision('allow');await expect(f.controller.service(auditId,{type:'lease',actionId:randomUUID(),action:{kind:'inspect'}})).rejects.toThrow();
 });
 it('rejects stale/mismatched/duplicate pending answers without forwarding forged secret references',async()=>{
  const f=await fixture();await f.start();const auditId=f.controller.snapshot()!.auditId,q:AuditQuestion={id:randomUUID(),kind:'single',prompt:'Which path?',options:['First','Second'],required:true,allowSkip:false};f.question(q);
  await expect(f.controller.handle({type:'answer',auditId:randomUUID(),questionId:q.id,answer:{outcome:'answered',values:['First']}})).rejects.toThrow('STALE');
  await expect(f.controller.handle({type:'answer',auditId,questionId:randomUUID(),answer:{outcome:'answered',values:['First']}})).rejects.toThrow('ANSWER');
  await expect(f.controller.handle({type:'answer',auditId,questionId:q.id,answer:{outcome:'answered',secretRef:randomUUID()}} as never)).rejects.toThrow();
  const gate=f.holdAnswer(),first=f.controller.handle({type:'answer',auditId,questionId:q.id,answer:{outcome:'answered',values:['First']}});await expect(f.controller.handle({type:'answer',auditId,questionId:q.id,answer:{outcome:'answered',values:['Second']}})).rejects.toThrow('ANSWER');gate.resolve({ok:true});await first;
  expect(f.worker.request.mock.calls.filter(([command])=>command.type==='audit-answer')).toHaveLength(1);
 });
 it('brokers a sensitive answer only to its exact leased field, once, without checkpoint or Renderer disclosure',async()=>{
  const f=await fixture();await f.start();const auditId=f.controller.snapshot()!.auditId;
  f.question({id:randomUUID(),kind:'secret',prompt:'Enter the declared test field.',required:true,allowSkip:false,target});
  const marker='unit-ephemeral-broker-marker';await f.controller.handle({type:'answer',auditId,questionId:f.controller.snapshot()!.question!.id,answer:{outcome:'answered',text:marker,sensitive:true}});
  const sent=f.worker.request.mock.calls.filter(([command])=>command.type==='audit-answer').at(-1)![0],answer=sent.answer as {text?:string;secretRef:string};expect(answer.text).toBeUndefined();expect(answer.secretRef).toMatch(/^[a-f0-9-]{36}$/);expect(JSON.stringify(f.controller.snapshot())).not.toContain(marker);
  const actionId=randomUUID();await f.controller.service(auditId,{type:'lease',actionId,action:{kind:'fill',locator:{by:'label',value:'Other field'},secretRef:answer.secretRef}});await expect(f.controller.service(auditId,{type:'secret',actionId,secretRef:answer.secretRef,locator:target})).rejects.toThrow('not authorized');await f.controller.service(auditId,{type:'release',actionId,known:true});
  const correct=randomUUID();await f.controller.service(auditId,{type:'lease',actionId:correct,action:{kind:'fill',locator:target,secretRef:answer.secretRef}});expect(await f.controller.service(auditId,{type:'secret',actionId:correct,secretRef:answer.secretRef,locator:target})).toEqual({value:marker});await expect(f.controller.service(auditId,{type:'secret',actionId:correct,secretRef:answer.secretRef,locator:target})).rejects.toThrow('not authorized');await f.controller.service(auditId,{type:'release',actionId:correct,known:true});
  const persisted=await readFile(path.join(f.folder,'audit-checkpoint.json'),'utf8');expect(persisted).not.toContain(marker);expect(persisted).not.toContain('unit-provider-input-marker');expect(persisted).not.toContain(answer.secretRef);expect(JSON.stringify(f.states)).not.toContain(marker);
 });
 it('rejects stale Utility identity, config changes, reordered events and rewritten past evidence',async()=>{
  const f=await fixture();await f.start();const original=f.controller.snapshot()!;
  for(const changed of [{...original,auditId:randomUUID()},{...original,config:{...config,selection:{providerId:'openai',modelId:'wrong'}}},{...original,events:[{...original.events[0],seq:2}]},{...original,events:[{...original.events[0],summary:'Rewritten old evidence'}]}]){f.controller.accept(changed);expect(f.controller.snapshot()).toEqual(original);}
  const next={...original,events:[...original.events,{auditId:original.auditId,id:randomUUID(),seq:2,at,type:'observation' as const,summary:'A genuine later result.'}]};f.controller.accept(next);f.controller.accept(original);expect(f.controller.snapshot()?.events).toHaveLength(2);
 });
 it('expires operation-bound sensitive references when the native document changes before use',async()=>{
  const f=await fixture();await f.start();const native=f.host as unknown as {generation:number};native.generation=1;
  f.question({id:randomUUID(),kind:'secret',prompt:'Enter the test field.',required:true,allowSkip:false,target});
  await f.controller.handle({type:'answer',auditId:f.controller.snapshot()!.auditId,questionId:f.controller.snapshot()!.question!.id,answer:{outcome:'answered',text:'unit-ephemeral-field-marker',sensitive:true}});
  const sent=f.worker.request.mock.calls.filter(([command])=>command.type==='audit-answer').at(-1)![0],reference=(sent.answer as {secretRef:string}).secretRef;
  native.generation=2;const outcome=await f.controller.service(f.controller.snapshot()!.auditId,{type:'lease',actionId:randomUUID(),action:{kind:'fill',locator:target,secretRef:reference}});
  expect(outcome).toMatchObject({ok:false,code:'policy'});expect(JSON.stringify(outcome)).not.toContain('unit-ephemeral-field-marker');
 });
 it('restores an interrupted checkpoint without worker execution and demands new preflight for another audit',async()=>{
  const first=await fixture();await first.start();const old=first.controller.snapshot()!,restored=await fixture({checkpoint:{...old,status:'user-control',owner:'user'}});
  expect(restored.controller.snapshot()?.status).toBe('interrupted');expect(restored.controller.snapshot()?.question).toBeNull();expect(restored.controller.active).toBe(false);expect(restored.worker.request).not.toHaveBeenCalled();
  await expect(restored.controller.handle({type:'return-control',auditId:old.auditId})).rejects.toThrow('STALE');expect(restored.worker.request).not.toHaveBeenCalled();
  await restored.start();expect(restored.setup.handle).toHaveBeenCalledWith(expect.objectContaining({type:'prepare',authorized:true}));expect(restored.controller.snapshot()?.auditId).not.toBe(old.auditId);
 });
 it('keeps activation reserved until terminal native cleanup finishes',async()=>{
  const f=await fixture();await f.start();const current=f.controller.snapshot()!,gate=f.holdFinish();
  try{f.controller.accept({...current,status:'completed',question:null,endedAt:at,reason:'The declared interaction was covered.',events:[...current.events,{auditId:current.auditId,id:randomUUID(),seq:2,at,type:'audit-completed',summary:'The declared interaction was covered.'}]});expect(f.controller.active).toBe(true);await expect(f.start()).rejects.toThrow('ACTIVE');}finally{gate.resolve();}
  await vi.waitFor(()=>expect(f.controller.active).toBe(false));await f.start();expect(f.worker.request.mock.calls.filter(([command])=>command.type==='audit-start')).toHaveLength(2);
 });
});
