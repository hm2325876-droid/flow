import {z} from 'zod';
import {catalogSnapshotSchema,modelIdSchema,providerIdSchema,type CatalogModel,type CatalogSnapshot,type CatalogProvider} from '@flowproof/contracts';
import {registeredProviders} from './registry';

const DAY=86_400_000,MAX_BYTES=24_000_000;
const record=z.record(z.string(),z.unknown());
const flag=(v:unknown)=>typeof v==='boolean'?v:null;
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const text=(v:unknown,fallback:string,max:number)=>typeof v==='string'&&v.trim()?v.slice(0,max):fallback;
const modalities=(v:unknown)=>Array.isArray(v)?v.filter((s):s is string=>typeof s==='string'&&s.length<=40).slice(0,20):[];

/** Only actual catalog records become discovery providers, including providers with no usable models. */
export function normalizeProviders(raw:unknown,models:CatalogModel[]):CatalogProvider[]{
 const source=record.parse(raw),supported=new Set(registeredProviders().map(p=>p.id)),counts=new Map<string,number>();
 for(const model of models)counts.set(model.providerId,(counts.get(model.providerId)??0)+1);
 const providers:CatalogProvider[]=[];
 for(const [id,item] of Object.entries(source)){
  if(!providerIdSchema.safeParse(id).success||!record.safeParse(item).success)continue;
  providers.push({id,name:text((item as Record<string,unknown>).name,id,200),modelCount:counts.get(id)??0,adapterAvailable:supported.has(id)});
  if(providers.length>2000)throw new Error('Catalog exceeds supported provider count');
 }
 return providers.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}

/** Catalog IDs and fields are data. npm/env/api values never influence execution. */
export function normalizeCatalog(raw:unknown):CatalogModel[]{
 const providers=record.parse(raw),supported=new Set(registeredProviders().map(p=>p.id)),models:CatalogModel[]=[];
 for(const [providerId,value] of Object.entries(providers)){
  if(!providerIdSchema.safeParse(providerId).success||!record.safeParse(value).success)continue;
  const provider=value as Record<string,unknown>,entries=record.safeParse(provider.models);
  if(!entries.success)continue;
  const providerName=text(provider.name,providerId,200);
  for(const [modelId,item] of Object.entries(entries.data)){
   if(!modelIdSchema.safeParse(modelId).success||!record.safeParse(item).success)continue;
   const model=item as Record<string,unknown>,limits=record.safeParse(model.limit),cost=record.safeParse(model.cost),modes=record.safeParse(model.modalities);
   models.push({providerId,modelId,providerName,name:text(model.name,modelId,300),toolCall:flag(model.tool_call),structuredOutput:flag(model.structured_output),reasoning:flag(model.reasoning),inputModalities:modalities(modes.success?modes.data.input:undefined),outputModalities:modalities(modes.success?modes.data.output:undefined),contextLimit:number(limits.success?limits.data.context:undefined),outputLimit:number(limits.success?limits.data.output:undefined),inputPrice:number(cost.success?cost.data.input:undefined),outputPrice:number(cost.success?cost.data.output:undefined),adapterAvailable:supported.has(providerId)});
   if(models.length>50000)throw new Error('Catalog exceeds supported size');
  }
 }
 if(!models.length)throw new Error('Catalog contains no usable model metadata');
 return models.sort((a,b)=>a.providerName.localeCompare(b.providerName)||a.name.localeCompare(b.name)||a.modelId.localeCompare(b.modelId));
}

export async function getCatalog(cache:CatalogSnapshot|null,refresh=false,fetcher:typeof fetch=fetch):Promise<CatalogSnapshot>{
 const cached=catalogSnapshotSchema.safeParse(cache),now=Date.now();
 // Cache contains metadata only. Recompute adapter availability against this application build.
 const supported=new Set(registeredProviders().map(p=>p.id));
 const counts=new Map<string,number>();if(cached.success)for(const model of cached.data.models)counts.set(model.providerId,(counts.get(model.providerId)??0)+1);
 const usable=cached.success&&cached.data.models.length?{...cached.data,models:cached.data.models.map(m=>({...m,adapterAvailable:supported.has(m.providerId)})),providers:(cached.data.providers??normalizeProviders(Object.fromEntries(cached.data.models.map(m=>[m.providerId,{name:m.providerName}])),cached.data.models)).map(p=>({...p,adapterAvailable:supported.has(p.id),modelCount:counts.get(p.id)??0}))}:null;
 const age=usable?now-Date.parse(usable.fetchedAt):Infinity;
 if(usable&&!refresh&&age>=0&&age<DAY)return {...usable,source:'cache',stale:false,warning:null};
 try{
  const response=await fetcher('https://models.dev/api.json',{signal:AbortSignal.timeout(12_000),redirect:'error',headers:{Accept:'application/json'}});
  if(!response.ok||!response.body||Number(response.headers.get('content-length')||0)>MAX_BYTES)throw new Error('Catalog unavailable');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES)throw new Error('Catalog too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
  const raw:unknown=JSON.parse(new TextDecoder().decode(buffer)),models=normalizeCatalog(raw),providers=normalizeProviders(raw,models);
  return catalogSnapshotSchema.parse({fetchedAt:new Date().toISOString(),source:'network',stale:false,warning:null,models,providers});
 }catch{
  if(usable)return {...usable,source:'cache',stale:true,warning:'Models.dev could not be refreshed. Showing the saved catalog; metadata may be out of date.'};
  throw new Error('Models.dev is unavailable and no saved catalog exists. Connect to the internet and retry to discover providers and models.');
 }
}
