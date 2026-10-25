import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultAuditDraft,supportedProviderDescriptors,type CatalogModel,type CatalogSnapshot,type SetupState,type ModelVerification} from '@flowproof/contracts';
import {discoveredProviders,freshVerification,providerModels,selectableModel,selectionCommand,type ModelFilters} from '../src/renderer/provider-picker-state';
import {ProviderPicker} from '../src/renderer/ProviderPicker';

const filters:ModelFilters={search:'',tools:false,structured:false,reasoning:false,vision:false,installed:false};
const model:CatalogModel={providerId:'openai',providerName:'OpenAI',modelId:'original/model:revision',name:'Shared display name',toolCall:true,structuredOutput:true,reasoning:false,inputModalities:['text','image'],outputModalities:['text'],contextLimit:128000,outputLimit:4096,inputPrice:null,outputPrice:null,adapterAvailable:true};
const other:CatalogModel={...model,providerId:'catalog-only',providerName:'Catalog only',modelId:'different-native-id',adapterAvailable:false};
const catalog:CatalogSnapshot={fetchedAt:new Date().toISOString(),source:'cache',stale:true,warning:null,models:[model,other],providers:[{id:'openai',name:'OpenAI',modelCount:1,adapterAvailable:true},{id:'catalog-only',name:'Catalog only',modelCount:1,adapterAvailable:false},{id:'empty-provider',name:'Empty real provider',modelCount:0,adapterAvailable:false}]};
const state:SetupState={catalog,catalogError:null,providers:supportedProviderDescriptors,selection:null,credentials:[],connection:null,verification:null,draft:defaultAuditDraft,review:null,secureStorageAvailable:true,error:null};

describe('provider-first discovery boundaries',()=>{
 it('discovers providers from the catalog, including empty providers, without injecting installed adapters',()=>{
  expect(discoveredProviders(catalog).map(p=>p.id)).toEqual(['catalog-only','empty-provider','openai']);
  expect(discoveredProviders({...catalog,providers:undefined}).map(p=>p.id)).toEqual(['catalog-only','openai']);
  expect(discoveredProviders(null)).toEqual([]);
  const markup=renderToStaticMarkup(createElement(ProviderPicker,{state,busy:'',refreshing:true,refresh:async()=>{},command:async()=>state}));
  expect(markup).toContain('data-provider-page="providers"');
  expect(markup).toContain('data-provider-id="empty-provider"');
  expect(markup).not.toContain('data-provider-id="anthropic"');
  expect(markup).not.toContain('data-model-row');
  expect(markup).toContain('Cached');expect(markup).toContain('refreshing');
 });
 it('keeps similarly named models within their exact provider and applies real capability metadata',()=>{
  expect(providerModels(catalog.models,'openai',{...filters,search:'shared'})).toEqual([model]);
  expect(providerModels(catalog.models,'catalog-only',{...filters,search:'shared'})).toEqual([other]);
  expect(providerModels(catalog.models,'openai',{...filters,search:':revision',tools:true,structured:true,vision:true})).toEqual([model]);
  expect(providerModels(catalog.models,'openai',{...filters,reasoning:true})).toEqual([]);
  expect(providerModels([{...model,toolCall:null}],'openai',{...filters,tools:true})).toEqual([]);
  expect(providerModels(catalog.models,'catalog-only',{...filters,installed:true})).toEqual([]);
 });
 it('permits only registered adapters and suitable exact IDs while projecting identifier-only IPC',()=>{
  expect(selectableModel(model,supportedProviderDescriptors)).toBe(true);
  expect(selectableModel(other,supportedProviderDescriptors)).toBe(false);
  expect(selectableModel({...model,inputModalities:['image']},supportedProviderDescriptors)).toBe(false);
  expect(selectableModel({...model,outputModalities:['audio']},supportedProviderDescriptors)).toBe(false);
  expect(selectableModel({...model,modelId:'display name'},supportedProviderDescriptors)).toBe(false);
  expect(selectionCommand(model)).toEqual({type:'select',selection:{providerId:'openai',modelId:'original/model:revision'}});
  expect(Object.keys(selectionCommand(model).selection)).toEqual(['providerId','modelId']);
 });
 it('never treats metadata, a different provider, basic connectivity or expiry as verified tool compatibility',()=>{
  const now=Date.now();const connection:ModelVerification={providerId:model.providerId,modelId:model.modelId,status:'connected',message:'Authenticated',connectivity:true,toolCalling:false,checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+60000).toISOString(),phase:'connection',authenticated:true};
  expect(freshVerification(null,model,'ready',now)).toBe(false);
  expect(freshVerification(connection,model,'connected',now)).toBe(true);
  expect(freshVerification(connection,model,'ready',now)).toBe(false);
  expect(freshVerification({...connection,status:'ready',toolCalling:true,phase:'tools'},model,'ready',now)).toBe(true);
  expect(freshVerification({...connection,connectivity:false},model,'connected',now)).toBe(false);
  expect(freshVerification({...connection,authenticated:false},model,'connected',now)).toBe(false);
  expect(freshVerification({...connection,status:'ready',toolCalling:false},model,'ready',now)).toBe(false);
  expect(freshVerification({...connection,status:'ready',providerId:'openrouter'},model,'ready',now)).toBe(false);
  expect(freshVerification({...connection,status:'ready'},model,'ready',now+60001)).toBe(false);
 });
});
