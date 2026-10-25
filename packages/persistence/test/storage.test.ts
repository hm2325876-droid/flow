import {afterEach,describe,expect,it} from 'vitest';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {SettingsStore} from '../src/index';
import {defaultAuditDraft,type CatalogSnapshot} from '@flowproof/contracts';
let store:SettingsStore|undefined;let dir:string|undefined;
afterEach(async()=>{store?.close();store=undefined;if(dir){if(path.dirname(dir)!==os.tmpdir()||!path.basename(dir).startsWith('flowproof-settings-'))throw Error('Unsafe cleanup');await rm(dir,{recursive:true,force:true});dir=undefined;}});
describe('Main-owned SQLite settings foundation',()=>{
  it('persists actual configuration/drafts/catalog but no reusable consent or completion authority',async()=>{
    dir=await mkdtemp(path.join(os.tmpdir(),'flowproof-settings-'));store=await SettingsStore.open(dir);
    expect(await store.read()).toEqual({selection:null,draft:defaultAuditDraft});
    const draft={...defaultAuditDraft,projectName:'Owned local application',goal:'Check the signup form'};
    await store.saveDraft(draft);await store.saveSelection({providerId:'openai',modelId:'exact/native/model-id'});
    const catalog:CatalogSnapshot={fetchedAt:new Date().toISOString(),source:'network',stale:false,warning:null,models:[]};await store.saveCatalog(catalog);
    store.close();store=await SettingsStore.open(dir);
    expect(await store.read()).toEqual({selection:{providerId:'openai',modelId:'exact/native/model-id'},draft});
    expect(await store.readCatalog()).toEqual({...catalog,source:'cache'});
    const bytes=await readFile(path.join(dir,'flowproof.sqlite'));expect(bytes.subarray(0,16).toString()).toBe('SQLite format 3\0');
    await expect(store.saveDraft({...draft,consent:true} as typeof draft)).rejects.toThrow();
  });
});
