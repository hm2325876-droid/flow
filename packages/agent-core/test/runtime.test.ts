import {randomUUID} from 'node:crypto';
import {describe,it,expect,vi} from 'vitest';
import {MockLanguageModelV4} from 'ai/test';
import type {LanguageModelV4CallOptions,LanguageModelV4GenerateResult} from '@ai-sdk/provider';
import {type AuditHandoff,type AuditSnapshot,type BrowserAction,type BrowserOutcome} from '@flowproof/contracts';
import {AgentRuntime,type AgentOptions} from '../src/index';

const usage={inputTokens:{total:8,noCache:8,cacheRead:0,cacheWrite:0},outputTokens:{total:2,text:2,reasoning:0}};
const generated=(toolName:string,input:unknown):LanguageModelV4GenerateResult=>({content:[{type:'tool-call',toolCallId:randomUUID(),toolName,input:JSON.stringify(input)}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]});
const text=():LanguageModelV4GenerateResult=>({content:[{type:'text',text:'No actions were executed.'}],finishReason:{unified:'stop',raw:undefined},usage,warnings:[]});
const config=(overrides:Partial<AuditHandoff>={}):AuditHandoff=>({schemaVersion:1,selection:{providerId:'openai',modelId:'test-only-model'},projectName:'Agent core test',goal:'Inspect and test an accessible counter.',context:'Unit/integration test only.',targetUrl:'http://localhost:3201/',maxSteps:40,timeoutMinutes:1,authorizedAt:new Date().toISOString(),checkedAt:new Date().toISOString(),providerValidatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300_000).toISOString(),...overrides});
const observed=(value=0):BrowserOutcome=>({ok:true,code:'ok',summary:'Actual bounded test browser observation.',observation:{url:'http://localhost:3201/',title:'Counter',text:`Counter ${value}`,elements:[{role:'button',name:'Increment'}]}});
const outputs=(request:LanguageModelV4CallOptions)=>request.prompt.flatMap(m=>m.role==='tool'?m.content.filter(p=>p.type==='tool-result').map(p=>p.output.type==='json'?p.output.value:null):[]).filter(Boolean) as Record<string,unknown>[];
async function until(check:()=>boolean){for(let i=0;i<200;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,2));}throw new Error('Expected runtime state was not observed');}
function make(model:MockLanguageModelV4,extra:Partial<AgentOptions>={}){
 const snapshots:AuditSnapshot[]=[];const perform=vi.fn(async()=>observed());
 const runtime=new AgentRuntime({auditId:randomUUID(),config:config(),model,perform,publish:s=>snapshots.push(s),...extra});return {runtime,snapshots,perform};
}

describe('ToolLoopAgent orchestration against deterministic model responses (not live provider success)',()=>{
 it('uses actual tool results in later model decisions and completes only evidence-backed TODOs',async()=>{
  let count=0,step=0;const requested:BrowserAction[]=[];
  const model=new MockLanguageModelV4({doGenerate:async request=>{
   step++;
   if(step===1){expect(JSON.stringify(request.prompt)).toContain('Counter 0');return generated('update_todos',{tasks:[{id:'counter',description:'Exercise the counter',status:'in-progress',evidence:[]}]});}
   if(step===2)return generated('click',{kind:'click',locator:{by:'role',role:'button',value:'Increment'}});
   if(step===3){const result=outputs(request).find(o=>o.actionId);expect(JSON.stringify(result)).toContain('Counter 1');return generated('update_todos',{tasks:[{id:'counter',description:'Exercise the counter',status:'completed',evidence:[result!.actionId]}]});}
   return generated('finish_audit',{outcome:'completed',reason:'The counter action was observed.'});
  }});
  const {runtime}=make(model,{perform:async action=>{requested.push(action);if(action.kind==='click')count++;return observed(count);}});await runtime.start();const state=runtime.snapshot();
  expect(state.status).toBe('completed');expect(count).toBe(1);expect(requested.map(a=>a.kind)).toEqual(['inspect','click']);expect(state.todos[0].status).toBe('completed');expect(state.usage.modelCalls).toBe(4);expect(state.usage.inputTokens).toBe(32);
  expect(state.events.filter(e=>e.type==='action-completed')).toHaveLength(2);expect(state.events.map(e=>e.seq)).toEqual(state.events.map((_,i)=>i+1));
 });
 it('rejects invented TODO evidence and does not treat model text as completion',async()=>{
  let step=0;const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('update_todos',{tasks:[{id:'invented',description:'Fake completion',status:'completed',evidence:[randomUUID()]}]}):text()});
  const {runtime}=make(model);await runtime.start();expect(runtime.snapshot().status).toBe('interrupted');expect(runtime.snapshot().todos).toEqual([]);expect(runtime.snapshot().events.some(e=>e.type==='audit-completed')).toBe(false);
 });
 it('validates structured answers, rejects stale/duplicate responses and suspends real tool scheduling',async()=>{
  let step=0;const model=new MockLanguageModelV4({doGenerate:async request=>{
   if(++step===1)return generated('ask_user',{kind:'single',prompt:'Choose the expected label.',options:['One','Two'],required:true,allowSkip:false});
   expect(JSON.stringify(outputs(request))).toContain('Two');return generated('finish_audit',{outcome:'blocked',reason:'The selected path is unavailable.'});
  }});
  const {runtime,perform}=make(model),run=runtime.start();await until(()=>runtime.snapshot().question!==null);const before=runtime.snapshot(),questionId=before.question!.id;
  expect(before.status).toBe('awaiting-input');expect(perform).toHaveBeenCalledTimes(1);
  expect(()=>runtime.answer(questionId,{outcome:'answered',values:['Wrong']})).toThrow('declared');expect(()=>runtime.answer(questionId,{outcome:'skipped'})).toThrow('cannot be skipped');expect(runtime.snapshot().status).toBe('awaiting-input');
  expect(()=>runtime.answer({auditId:randomUUID(),questionId,answer:{outcome:'answered',values:['Two']}})).toThrow('stale');
  runtime.answer(questionId,{outcome:'answered',values:['Two']});expect(()=>runtime.answer(questionId,{outcome:'answered',values:['Two']})).toThrow('stale');await run;expect(runtime.snapshot().status).toBe('blocked');
 });
 it('uses sensitive references only and never puts raw sensitive answers into snapshots or model input',async()=>{
  let step=0;const reference=randomUUID(),marker='unit-private-answer-marker';
  const model=new MockLanguageModelV4({doGenerate:async request=>{
   if(++step===1)return generated('ask_user',{kind:'secret',prompt:'Enter the test credential.',target:{by:'label',value:'Password'},required:true,allowSkip:false});
   expect(JSON.stringify(request)).not.toContain(marker);expect(JSON.stringify(outputs(request))).toContain(reference);return generated('finish_audit',{outcome:'blocked',reason:'No safe remaining path.'});
  }});
  const {runtime,snapshots}=make(model),run=runtime.start();await until(()=>runtime.snapshot().question!==null);const id=runtime.snapshot().question!.id;
  expect(()=>runtime.answer(id,{outcome:'answered',text:marker})).toThrow('secret broker');runtime.answer(id,{outcome:'answered',secretRef:reference});await run;expect(JSON.stringify(snapshots)).not.toContain(marker);
 });
 it('requests exact one-off permission, does not infer approval from denial and records no false action success',async()=>{
  let step=0;const ids:string[]=[];const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('click',{kind:'click',locator:{by:'role',role:'button',value:'Save record'}}):generated('finish_audit',{outcome:'blocked',reason:'The required operation was denied.'})});
  const {runtime}=make(model,{perform:async(action,id)=>{if(action.kind==='inspect')return observed();ids.push(id);return {ok:false,code:'approval-required',approvalId:id,summary:'Approve this exact Save record operation?'};}});
  const run=runtime.start();await until(()=>runtime.snapshot().question!==null);const q=runtime.snapshot().question!;expect(q.operationId).toBe(ids[0]);expect(q.options).toEqual(['Approve','Deny']);runtime.answer(q.id,{outcome:'answered',values:['Deny']});await run;expect(ids).toHaveLength(1);expect(runtime.snapshot().events.filter(e=>e.type==='action-failed')).toHaveLength(1);
 });
 it('pauses at a safe checkpoint and reinspects on explicit Return without replaying a browser action',async()=>{
  let step=0,release!:()=>void;const wait=new Promise<void>(resolve=>release=resolve);const owners:string[]=[];let clicks=0;
  const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('click',{kind:'click',locator:{by:'role',role:'button',value:'Increment'}}):generated('finish_audit',{outcome:'blocked',reason:'No additional bounded work.'})});
  const {runtime}=make(model,{setOwner:async owner=>{owners.push(owner);},perform:async action=>{if(action.kind==='click'){clicks++;await wait;}return observed(clicks);}});
  const run=runtime.start();await until(()=>clicks===1);const handoff=runtime.takeControl();await until(()=>runtime.snapshot().owner==='pending');expect(runtime.snapshot().status).toBe('handoff-pending');release();await handoff;expect(runtime.snapshot().owner).toBe('user');const calls=step;await new Promise(resolve=>setTimeout(resolve,10));expect(step).toBe(calls);
  await runtime.returnControl();await run;expect(clicks).toBe(1);expect(owners).toEqual(['pending','user','agent']);expect(runtime.snapshot().events.some(e=>e.summary.includes('fresh page'))).toBe(true);
 });
 it('allows Take Control while a question waits and answering never silently reclaims browser ownership',async()=>{
  let step=0;const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('ask_user',{kind:'text',prompt:'What is the expected outcome?',required:true,allowSkip:false}):generated('finish_audit',{outcome:'blocked',reason:'No safe continuation.'})});
  const {runtime}=make(model);const run=runtime.start();await until(()=>runtime.snapshot().question!==null);const id=runtime.snapshot().question!.id;await runtime.takeControl();runtime.answer(id,{outcome:'answered',text:'A visible confirmation'});expect(runtime.snapshot().owner).toBe('user');await runtime.returnControl();await run;expect(runtime.snapshot().status).toBe('blocked');
 });
 it('keeps automation excluded when an answer arrives during the fresh Return inspection',async()=>{
  let step=0,inspections=0,release!:()=>void;const inspection=new Promise<void>(resolve=>release=resolve);
  const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('ask_user',{kind:'text',prompt:'Expected result?',required:true,allowSkip:false}):generated('finish_audit',{outcome:'blocked',reason:'No safe remaining work.'})});
  const {runtime}=make(model,{perform:async()=>{if(++inspections===2)await inspection;return observed();}});const run=runtime.start();await until(()=>runtime.snapshot().question!==null);const id=runtime.snapshot().question!.id;await runtime.takeControl();const returning=runtime.returnControl();await until(()=>inspections===2);expect(runtime.snapshot().owner).toBe('pending');runtime.answer(id,{outcome:'answered',text:'Visible confirmation'});await new Promise(resolve=>setTimeout(resolve,10));expect(step).toBe(1);expect(runtime.snapshot().owner).toBe('pending');release();await returning;await run;expect(step).toBe(2);expect(inspections).toBe(2);
 });
 it('enforces model/browser budgets and rejects duplicate starts without fake completion',async()=>{
  const model=new MockLanguageModelV4({doGenerate:async()=>generated('inspect_page',{kind:'inspect'})});const {runtime}=make(model,{config:config({maxSteps:1})});const run=runtime.start();await expect(runtime.start()).rejects.toThrow('already started');await run;expect(runtime.snapshot().status).toBe('interrupted');expect(runtime.snapshot().usage.modelCalls).toBe(1);
  const limited=make(model,{limits:{browserActions:1}});await limited.runtime.start();expect(limited.runtime.snapshot().status).toBe('interrupted');expect(limited.runtime.snapshot().usage.browserActions).toBe(1);
 });
 it('bounds activity without dropping earlier sequence entries or publishing incomplete terminal snapshots',async()=>{
  const model=new MockLanguageModelV4({doGenerate:async()=>generated('update_todos',{tasks:[{id:'inspect',description:'Inspect the current page',status:'in-progress',evidence:[]}]})});
  const {runtime,snapshots}=make(model,{limits:{events:10}});await runtime.start();const state=runtime.snapshot();expect(state.status).toBe('interrupted');expect(state.events.length).toBeLessThan(20);expect(state.events.map(e=>e.seq)).toEqual(state.events.map((_,i)=>i+1));expect(state.events[0].type).toBe('audit-started');
  for(const snapshot of snapshots.filter(s=>['completed','blocked','interrupted'].includes(s.status))){expect(snapshot.endedAt).not.toBeNull();expect(snapshot.reason).not.toBeNull();expect(snapshot.question).toBeNull();}
 });
 it('expires the wall-clock budget while awaiting a required answer without inventing an answer',async()=>{
  vi.useFakeTimers();try{
   const model=new MockLanguageModelV4({doGenerate:async()=>generated('ask_user',{kind:'text',prompt:'Required expected result?',required:true,allowSkip:false})});
   const {runtime}=make(model),run=runtime.start();for(let i=0;i<100&&!runtime.snapshot().question;i++)await vi.advanceTimersByTimeAsync(1);
   expect(runtime.snapshot().status).toBe('awaiting-input');await vi.advanceTimersByTimeAsync(60001);await run;expect(runtime.snapshot().status).toBe('interrupted');expect(runtime.snapshot().events.some(e=>e.type==='input-received')).toBe(false);
  }finally{vi.useRealTimers();}
 });
 it('keeps the wall-clock budget running during User Control and clears unanswered questions on expiry',async()=>{
  vi.useFakeTimers();try{
   const model=new MockLanguageModelV4({doGenerate:async()=>generated('ask_user',{kind:'text',prompt:'Expected result?',required:true,allowSkip:false})});
   const {runtime}=make(model),run=runtime.start();for(let i=0;i<100&&!runtime.snapshot().question;i++)await vi.advanceTimersByTimeAsync(1);await runtime.takeControl();expect(runtime.snapshot().status).toBe('user-control');await vi.advanceTimersByTimeAsync(60001);await run;expect(runtime.snapshot().status).toBe('interrupted');expect(runtime.snapshot().question).toBeNull();await expect(runtime.returnControl()).rejects.toThrow('terminal');
  }finally{vi.useRealTimers();}
 });
 it('retries only provider requests, up to three attempts, without replaying completed browser actions',async()=>{
  let step=0,clicks=0;const model=new MockLanguageModelV4({doGenerate:async request=>{
   if(++step===1)return generated('click',{kind:'click',locator:{by:'role',role:'button',value:'Increment'}});
   expect(JSON.stringify(outputs(request))).toContain('Counter 1');throw new TypeError('network private payload must not escape');
  }});
  const {runtime}=make(model,{sleep:async()=>{},perform:async action=>{if(action.kind==='click')clicks++;return observed(clicks);}});await runtime.start();const state=runtime.snapshot();expect(clicks).toBe(1);expect(state.usage.retries).toBe(3);expect(state.usage.modelCalls).toBe(5);expect(state.status).toBe('interrupted');expect(JSON.stringify(state)).not.toContain('private payload');
 });
 it('honors a bounded Retry-After and never publishes provider headers',async()=>{
  let calls=0;const sleep=vi.fn(async(_ms:number)=>{});const model=new MockLanguageModelV4({doGenerate:async()=>{if(++calls===1)throw Object.assign(new Error('private rate-limit body'),{name:'AI_APICallError',statusCode:429,responseHeaders:{'retry-after':'2','private-header':'never-publish'}});return generated('finish_audit',{outcome:'blocked',reason:'No safe remaining work.'});}});
  const {runtime}=make(model,{sleep});await runtime.start();expect(sleep).toHaveBeenCalledTimes(1);expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(2000);expect(runtime.snapshot().usage.retries).toBe(1);expect(JSON.stringify(runtime.snapshot())).not.toContain('never-publish');
  const longWait=new MockLanguageModelV4({doGenerate:async()=>{throw Object.assign(new Error('private'),{name:'AI_APICallError',statusCode:429,responseHeaders:{'retry-after':'120'}});}});const stopped=make(longWait,{sleep});await stopped.runtime.start();expect(stopped.runtime.snapshot().status).toBe('interrupted');expect(stopped.runtime.snapshot().usage.retries).toBe(0);expect(sleep).toHaveBeenCalledTimes(1);
 });
 it('preserves User Control when an already-running model request fails and reconnects',async()=>{
  let calls=0,entered=false,reject!:()=>void;const failing=new Promise<void>(resolve=>reject=resolve);
  const model=new MockLanguageModelV4({doGenerate:async()=>{if(++calls===1){entered=true;await failing;throw new TypeError('private provider interruption');}return generated('finish_audit',{outcome:'blocked',reason:'No safe remaining work.'});}});
  const {runtime}=make(model,{sleep:async()=>{}});const run=runtime.start();await until(()=>entered);await runtime.takeControl();reject();await until(()=>runtime.snapshot().usage.retries===1);expect(runtime.snapshot().owner).toBe('user');expect(runtime.snapshot().status).toBe('reconnecting');await new Promise(resolve=>setTimeout(resolve,5));expect(calls).toBe(1);await runtime.returnControl();await run;expect(calls).toBe(2);expect(runtime.snapshot().status).toBe('blocked');
 });
 it('preserves a pending handoff checkpoint when an already-running provider request fails',async()=>{
  let calls=0,entered=false,reject!:()=>void,releaseOwner!:()=>void;const failing=new Promise<void>(resolve=>reject=resolve),ownerCheckpoint=new Promise<void>(resolve=>releaseOwner=resolve);
  const model=new MockLanguageModelV4({doGenerate:async()=>{if(++calls===1){entered=true;await failing;throw new TypeError('private network failure');}return generated('finish_audit',{outcome:'blocked',reason:'No safe remaining work.'});}});
  const {runtime}=make(model,{sleep:async()=>{},setOwner:async owner=>{if(owner==='pending')await ownerCheckpoint;}});const run=runtime.start();await until(()=>entered);const taking=runtime.takeControl();await until(()=>runtime.snapshot().owner==='pending');reject();await until(()=>runtime.snapshot().usage.retries===1);expect(runtime.snapshot().status).toBe('handoff-pending');releaseOwner();await taking;expect(runtime.snapshot().owner).toBe('user');await runtime.returnControl();await run;expect(calls).toBe(2);
 });
 it('does not retry authentication failures and bounds browser recovery at two attempts',async()=>{
  const model=new MockLanguageModelV4({doGenerate:async()=>{throw Object.assign(new Error('private auth body'),{statusCode:401,name:'AI_APICallError'});}});const {runtime}=make(model);await runtime.start();expect(runtime.snapshot().usage.retries).toBe(0);expect(runtime.snapshot().status).toBe('interrupted');
  const recovery=vi.fn(async()=>false);const broken=make(model,{perform:async()=>({ok:false,code:'browser-unavailable',summary:'Native browser unavailable.'}),recoverBrowser:recovery});await broken.runtime.start();expect(recovery).toHaveBeenCalledTimes(2);expect(broken.runtime.snapshot().status).toBe('interrupted');
 });
 it('preserves user-control intent after a browser crash and requires an explicit Return',async()=>{
  let step=0;const recover=vi.fn(async()=>true);const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('ask_user',{kind:'text',prompt:'Expected result?',required:true,allowSkip:false}):generated('finish_audit',{outcome:'blocked',reason:'No safe continuation.'})});
  const {runtime}=make(model,{recoverBrowser:recover});const run=runtime.start();await until(()=>runtime.snapshot().question!==null);const id=runtime.snapshot().question!.id;await runtime.takeControl();await runtime.browserFailed();expect(recover).toHaveBeenCalledWith('user');expect(runtime.snapshot().status).toBe('user-control');runtime.answer(id,{outcome:'answered',text:'Visible feedback'});expect(runtime.snapshot().owner).toBe('user');await runtime.returnControl();await run;
 });
 it('does not complete a stale Take Control after a crash during the pending action checkpoint',async()=>{
  let step=0,clicks=0,release!:()=>void;const checkpoint=new Promise<void>(resolve=>release=resolve),owners:string[]=[];
  const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('click',{kind:'click',locator:{by:'role',role:'button',value:'Increment'}}):generated('finish_audit',{outcome:'blocked',reason:'No safe remaining work.'})});
  const {runtime}=make(model,{recoverBrowser:async()=>true,setOwner:async owner=>{owners.push(owner);},perform:async action=>{if(action.kind==='click'){clicks++;await checkpoint;}return observed(clicks);}});
  const run=runtime.start();await until(()=>clicks===1);const taking=runtime.takeControl();await until(()=>runtime.snapshot().owner==='pending');await runtime.browserFailed();expect(runtime.snapshot().status).toBe('awaiting-control-decision');release();await taking;expect(runtime.snapshot().owner).toBe('decision');expect(owners).not.toContain('user');await runtime.returnControl();await run;expect(clicks).toBe(1);
 });
 it('does not revive a stale Return Control inspection after pending-transfer crash recovery',async()=>{
  let step=0,inspections=0,release!:()=>void;const inspection=new Promise<void>(resolve=>release=resolve);
  const model=new MockLanguageModelV4({doGenerate:async()=>++step===1?generated('ask_user',{kind:'text',prompt:'Expected result?',required:true,allowSkip:false}):generated('finish_audit',{outcome:'blocked',reason:'No safe remaining work.'})});
  const {runtime}=make(model,{recoverBrowser:async()=>true,perform:async()=>{if(++inspections===2)await inspection;return observed();}});const run=runtime.start();await until(()=>runtime.snapshot().question!==null);const id=runtime.snapshot().question!.id;await runtime.takeControl();const returning=runtime.returnControl();await until(()=>inspections===2);await runtime.browserFailed();expect(runtime.snapshot().status).toBe('awaiting-control-decision');release();await returning;expect(runtime.snapshot().owner).toBe('decision');expect(runtime.snapshot().status).toBe('awaiting-control-decision');runtime.answer(id,{outcome:'answered',text:'Visible confirmation'});expect(runtime.snapshot().owner).toBe('decision');await runtime.returnControl();await run;
 });
});
