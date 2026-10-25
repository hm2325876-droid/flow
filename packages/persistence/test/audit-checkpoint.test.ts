import {afterEach,describe,it,expect} from 'vitest';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {AuditCheckpoint} from '../src/audit-checkpoint';
import {auditSnapshotSchema,type AuditSnapshot} from '@flowproof/contracts';

const folders:string[]=[];const id='44d47d42-f576-486c-88ce-a4994472404e',at='2026-10-25T12:00:00.000Z';
async function folder(){const value=await mkdtemp(path.join(os.tmpdir(),'flowproof-checkpoint-'));folders.push(value);return value;}
afterEach(async()=>{for(const f of folders.splice(0)){if(path.dirname(f)!==os.tmpdir()||!path.basename(f).startsWith('flowproof-checkpoint-'))throw Error('Unsafe test cleanup');await rm(f,{recursive:true,force:true});}});
function state():AuditSnapshot{return auditSnapshotSchema.parse({auditId:id,config:{schemaVersion:1,selection:{providerId:'openrouter',modelId:'vendor/Original:free'},projectName:'Checkpoint test',goal:'Check an owned interaction.',context:'',targetUrl:'http://localhost:3000/',maxSteps:40,timeoutMinutes:10,authorizedAt:at,checkedAt:at,providerValidatedAt:at,expiresAt:'2026-10-25T12:05:00.000Z'},status:'awaiting-input',owner:'user',events:[{auditId:id,id:'d9ad788d-b938-41c0-8b4e-55c350ac872f',seq:1,at,type:'input-requested',summary:'Input requested for a declared field.'}],todos:[],question:{id:'e00e35ac-ed27-4bfb-b449-3e1559707971',kind:'secret',prompt:'Enter the declared field value.',required:true,allowSkip:false,target:{by:'label',value:'Test field'}},candidates:[],usage:{modelCalls:1,browserActions:1,inputTokens:null,outputTokens:null,retries:0,browserRecoveries:0,cost:null},startedAt:at,endedAt:null,reason:null});}
describe('Main-owned minimal audit checkpoint',()=>{
 it('recovers incomplete state as an inert Interrupted snapshot without restoring pending authority',async()=>{
  const dir=await folder(),store=new AuditCheckpoint(dir);expect(await store.read()).toBeNull();await store.save(state());
  const recovered=await new AuditCheckpoint(dir).read();expect(recovered?.status).toBe('interrupted');expect(recovered?.question).toBeNull();expect(recovered?.owner).toBe('agent');expect(recovered?.endedAt).not.toBeNull();expect(recovered?.events.at(-1)?.type).toBe('audit-interrupted');expect(recovered?.config.selection).toEqual(state().config.selection);
  const again=await new AuditCheckpoint(dir).read();expect(again?.events).toEqual(recovered?.events);expect(again?.reason).toContain('No unfinished action');
  const bytes=await readFile(path.join(dir,'audit-checkpoint.json'),'utf8');for(const property of ['secretRef','apiKey','answer','approvalToken','connection'])expect(bytes).not.toContain('"'+property+'"');
 });
 it('preserves genuine terminal observations and refuses malformed or extra secret-bearing records',async()=>{
  const dir=await folder(),store=new AuditCheckpoint(dir),terminal={...state(),status:'completed' as const,question:null,owner:'agent' as const,endedAt:at,reason:'The declared goal was covered with the recorded actions.'};await store.save(terminal);expect(await store.read()).toEqual(terminal);
  await expect(store.save({...terminal,answer:{text:'unit-not-a-real-secret'}} as never)).rejects.toThrow();
  await writeFile(path.join(dir,'audit-checkpoint.json'),'invalid checkpoint','utf8');await expect(store.read()).rejects.toThrow('unavailable');
 });
});
