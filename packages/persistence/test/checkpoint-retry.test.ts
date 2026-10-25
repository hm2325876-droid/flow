import {afterEach,it,expect,vi} from 'vitest';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import type {AuditSnapshot} from '@flowproof/contracts';
const failures=vi.hoisted(()=>({remaining:0}));
vi.mock('node:fs/promises',async()=>{const actual=await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');return {...actual,rename:async(...args:Parameters<typeof actual.rename>)=>{if(failures.remaining-->0)throw Object.assign(new Error('private-filesystem-error-marker'),{code:'EPERM'});return actual.rename(...args);}};});
import {AuditCheckpoint} from '../src/audit-checkpoint';
let folder='';
afterEach(async()=>{failures.remaining=0;vi.restoreAllMocks();if(folder){if(path.dirname(folder)!==os.tmpdir()||!path.basename(folder).startsWith('flowproof-checkpoint-retry-'))throw Error('Unsafe cleanup');await rm(folder,{recursive:true,force:true});folder='';}});
function snapshot():AuditSnapshot{const at=new Date().toISOString();return {auditId:randomUUID(),config:{schemaVersion:1,selection:{providerId:'openai',modelId:'test-only'},projectName:'Checkpoint test',goal:'Check atomic checkpoint behavior.',context:'',targetUrl:'http://localhost:3000/',maxSteps:40,timeoutMinutes:10,authorizedAt:at,checkedAt:at,providerValidatedAt:at,expiresAt:at},status:'completed',owner:'agent',events:[],todos:[],question:null,candidates:[],usage:{modelCalls:0,browserActions:0,inputTokens:null,outputTokens:null,retries:0,browserRecoveries:0,cost:null},startedAt:at,endedAt:at,reason:'Recorded test terminal outcome.'};}
it('retries only transient atomic replace locks and preserves the previous record on permanent failure',async()=>{
 folder=await mkdtemp(path.join(os.tmpdir(),'flowproof-checkpoint-retry-'));const log=vi.spyOn(console,'warn').mockImplementation(()=>{}),store=new AuditCheckpoint(folder),state=snapshot();
 failures.remaining=2;await store.save(state);expect((await store.read())?.auditId).toBe(state.auditId);expect(log).toHaveBeenCalledTimes(2);
 failures.remaining=20;await expect(store.save({...state,auditId:randomUUID()})).rejects.toMatchObject({stage:'replace',code:'EPERM'});
 failures.remaining=0;expect((await store.read())?.auditId).toBe(state.auditId);expect(await readdir(folder)).toEqual(['audit-checkpoint.json']);
 expect(JSON.stringify(log.mock.calls)).not.toContain('private-filesystem-error-marker');expect(JSON.stringify(log.mock.calls)).not.toContain(folder);
});
