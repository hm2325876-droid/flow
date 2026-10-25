import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {SetupService,auditTarget,checkLocalTarget} from '../src/main/setup';
import type {SecureStorage} from '../src/main/credentials';
import {defaultAuditDraft,setupStateSchema,type ModelVerification,type SetupState,type RegisteredProvider} from '@flowproof/contracts';

const providers:RegisteredProvider[]=[{id:'openai',name:'OpenAI',adapter:'@ai-sdk/openai'}];
const secure:SecureStorage={async isAsyncEncryptionAvailable(){return true;},async encryptStringAsync(value){return Buffer.from(value.split('').reverse().join(''));},async decryptStringAsync(bytes){return {result:bytes.toString().split('').reverse().join(''),shouldReEncrypt:false};}};
let dir:string,service:SetupService,server:http.Server,port:number,verifyCalls:number,active:boolean,clock:number,replyStatus:ModelVerification['status'];
function makeService(){return new SetupService({folder:dir,secureStorage:secure,providers,hasActiveAudit:()=>active,now:()=>clock,requestProvider:async command=>{
  if(command.type==='catalog')return {models:[],source:'network',fetchedAt:new Date(clock).toISOString(),stale:false,warning:null};
  verifyCalls++;return {...command.selection,status:replyStatus,message:replyStatus==='ready'?'Isolated test double established a tool round trip.':'Authentication failed.',connectivity:replyStatus==='ready',toolCalling:replyStatus==='ready',checkedAt:new Date(clock).toISOString(),expiresAt:replyStatus==='ready'?new Date(clock+300000).toISOString():null};
}});}
beforeEach(async()=>{
  dir=await mkdtemp(path.join(os.tmpdir(),'flowproof-setup-'));verifyCalls=0;active=false;clock=Date.now();replyStatus='ready';
  server=http.createServer((req,res)=>{if(req.url==='/outside'){res.writeHead(302,{location:'https://example.com/'});}else if(req.url==='/inside'){res.writeHead(302,{location:'/ready'});}else res.writeHead(200);res.end();});
  await new Promise<void>(resolve=>server.listen(0,resolve));port=(server.address() as {port:number}).port;service=makeService();await service.init();
});
afterEach(async()=>{await service.close();await new Promise<void>(resolve=>server.close(()=>resolve()));if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('flowproof-setup-'))throw Error('Unsafe cleanup');await rm(dir,{recursive:true,force:true});});
async function configure(){await service.handle({type:'select',selection:{providerId:'openai',modelId:'native-model'}});return service.handle({type:'save-key',providerId:'openai',key:'unit-private-test-key'});}
const validDraft=()=>({...defaultAuditDraft,projectName:'Owned local app',goal:'Check the complete flow',port:String(port)});
describe('Slice 2 setup and future Agent Core handoff',()=>{
  it('validates the existing localhost boundary and never follows outside redirects',async()=>{
    for(const value of ['//example.com','/\\example.com','https://example.com','/bad path'])expect(auditTarget({...defaultAuditDraft,path:value})).toBeNull();
    expect(auditTarget({...defaultAuditDraft,port:'0'})).toBeNull();
    expect((await checkLocalTarget(`http://localhost:${port}/`)).ok).toBe(true);
    expect((await checkLocalTarget(`http://localhost:${port}/outside`)).ok).toBe(false);
    expect((await checkLocalTarget(`http://localhost:${port}/inside`)).ok).toBe(true);
    expect((await checkLocalTarget('http://127.0.0.1:1/')).ok).toBe(false);
  });
  it('keeps missing keys and unavailable adapters unready without any paid request',async()=>{
    let state=await service.handle({type:'select',selection:{providerId:'not-installed',modelId:'anything'}});expect(state.selection).toBeNull();expect(state.error).toContain('no installed');
    await service.handle({type:'select',selection:{providerId:'openai',modelId:'native-model'}});state=await service.handle({type:'verify'});expect(state.verification?.status).toBe('missing-key');expect(verifyCalls).toBe(0);
  });
  it('creates an honest typed ready configuration only after all checks and current consent',async()=>{
    await configure();let state=await service.handle({type:'review',draft:validDraft(),authorized:false});
    expect(state.review?.ready).toBe(false);expect(state.review?.checks.find(c=>c.id==='authorization')?.status).toBe('failed');expect(verifyCalls).toBe(1);
    state=await service.handle({type:'prepare',draft:validDraft(),authorized:true});
    expect(state.review?.ready).toBe(true);expect(state.review?.checks).toHaveLength(8);expect(state.review?.handoff).toMatchObject({schemaVersion:1,selection:{providerId:'openai',modelId:'native-model'},targetUrl:`http://localhost:${port}/`,goal:'Check the complete flow'});
    expect(verifyCalls).toBe(1);expect(JSON.stringify(state)).not.toContain('unit-private-test-key');expect(setupStateSchema.safeParse(state).success).toBe(true);
  });
  it('invalidates capability authority on dismissal, expiry and credential/model changes',async()=>{
    await configure();await service.handle({type:'verify'});await service.handle({type:'verify'});expect(verifyCalls).toBe(1);
    await service.handle({type:'dismiss'});let state=await service.handle({type:'load'});expect(state.verification).toBeNull();expect(state.review).toBeNull();
    await service.handle({type:'verify'});expect(verifyCalls).toBe(2);clock+=300001;state=await service.handle({type:'prepare',draft:validDraft(),authorized:true});expect(verifyCalls).toBe(3);expect(state.review?.ready).toBe(true);
    state=await service.handle({type:'save-key',providerId:'openai',key:'unit-private-replacement'});expect(state.verification).toBeNull();await service.handle({type:'verify'});expect(verifyCalls).toBe(4);
    state=await service.handle({type:'select',selection:{providerId:'openai',modelId:'another-model'}});expect(state.verification).toBeNull();
  });
  it('restores only non-sensitive draft/configuration on restart, never prior authorization or readiness',async()=>{
    await configure();await service.handle({type:'prepare',draft:validDraft(),authorized:true});await service.close();service=makeService();
    const state=await service.handle({type:'load'});expect(state.draft).toEqual(validDraft());expect(state.selection?.modelId).toBe('native-model');expect(state.credentials[0].status).toBe('configured');expect(state.verification).toBeNull();expect(state.review).toBeNull();
  });
  it('blocks active operations, bad authentication and public target attempts',async()=>{
    await configure();active=true;let state=await service.handle({type:'prepare',draft:validDraft(),authorized:true});expect(state.review?.ready).toBe(false);expect(verifyCalls).toBe(0);
    active=false;replyStatus='authentication';state=await service.handle({type:'prepare',draft:validDraft(),authorized:true});expect(state.review?.ready).toBe(false);expect(state.credentials[0].status).toBe('invalid');
    state=await service.handle({type:'prepare',draft:{...validDraft(),path:'//example.com'},authorized:true});expect(state.review?.checks.find(c=>c.id==='target')?.status).toBe('failed');
  });
  it('persists a validated catalog without treating it as provider verification',async()=>{
    const state=await service.handle({type:'catalog',refresh:true});expect(state.catalog?.source).toBe('network');expect(state.verification).toBeNull();expect(verifyCalls).toBe(0);
  });
  it('discards a late tool verification after setup is dismissed',async()=>{
    await configure();await service.close();
    let release:((value:unknown)=>void)|undefined;
    let entered:()=>void=()=>{};const started=new Promise<void>(resolve=>{entered=resolve;});
    service=new SetupService({folder:dir,secureStorage:secure,providers,hasActiveAudit:()=>false,requestProvider:async()=>{entered();return new Promise(resolve=>{release=resolve;});}});
    const checking=service.handle({type:'verify'});await started;
    const closing=service.handle({type:'dismiss'});
    release!({providerId:'openai',modelId:'native-model',status:'ready',message:'Isolated delayed result.',connectivity:true,toolCalling:true,checkedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300000).toISOString()});
    expect((await checking).verification).toBeNull();expect((await closing).verification).toBeNull();
  });
  it('clears a previously ready handoff on malformed new audit input',async()=>{
    await configure();expect((await service.handle({type:'prepare',draft:validDraft(),authorized:true})).review?.ready).toBe(true);
    const state=await service.handle({type:'prepare',draft:{...validDraft(),maxSteps:0},authorized:true});
    expect(state.error).toContain('invalid');expect(state.review).toBeNull();
  });
  it('does not publish Ready if secure storage becomes unavailable during preflight',async()=>{
    await configure();await service.close();let available=true;
    service=new SetupService({folder:dir,providers,hasActiveAudit:()=>false,secureStorage:{...secure,async isAsyncEncryptionAvailable(){return available;}},requestProvider:async command=>{
      if(command.type!=='verify')throw Error('Unexpected request');available=false;
      return {...command.selection,status:'ready',message:'Isolated tool result.',connectivity:true,toolCalling:true,checkedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+300000).toISOString()};
    }});
    const state=await service.handle({type:'prepare',draft:validDraft(),authorized:true});
    expect(state.secureStorageAvailable).toBe(false);expect(state.verification).toBeNull();expect(state.review).toBeNull();
  });
});
