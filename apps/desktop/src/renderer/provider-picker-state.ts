import {modelRefSchema,type CatalogModel,type CatalogProvider,type CatalogSnapshot,type ModelRef,type ModelVerification,type RegisteredProvider} from '@flowproof/contracts';

export const sameModel=(a:ModelRef|null|undefined,b:ModelRef|null|undefined)=>Boolean(a&&b&&a.providerId===b.providerId&&a.modelId===b.modelId);
export function discoveredProviders(catalog:CatalogSnapshot|null):CatalogProvider[]{
 if(!catalog)return [];
 if(catalog.providers)return [...catalog.providers].sort((a,b)=>a.name.localeCompare(b.name));
 // Compatibility with saved snapshots: derive discovery only from their actual models.
 const providers=new Map<string,CatalogProvider>();
 for(const m of catalog.models){const p=providers.get(m.providerId)??{id:m.providerId,name:m.providerName,modelCount:0,adapterAvailable:m.adapterAvailable};p.modelCount++;providers.set(p.id,p);}
 return [...providers.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export type ModelFilters={search:string;tools:boolean;structured:boolean;reasoning:boolean;vision:boolean;installed:boolean};
export function providerModels(models:CatalogModel[],providerId:string,filters:ModelFilters){
 const q=filters.search.toLowerCase().trim();
 return models.filter(m=>m.providerId===providerId&&(!q||`${m.name} ${m.modelId}`.toLowerCase().includes(q))&&(!filters.tools||m.toolCall===true)&&(!filters.structured||m.structuredOutput===true)&&(!filters.reasoning||m.reasoning===true)&&(!filters.vision||m.inputModalities.includes('image'))&&(!filters.installed||m.adapterAvailable));
}
export function selectableModel(model:CatalogModel|undefined,adapters:RegisteredProvider[]){
 return Boolean(model&&model.adapterAvailable&&adapters.some(p=>p.id===model.providerId)&&modelRefSchema.safeParse({providerId:model.providerId,modelId:model.modelId}).success&&/^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/.test(model.modelId)&&(!model.inputModalities.length||model.inputModalities.includes('text'))&&(!model.outputModalities.length||model.outputModalities.includes('text')));
}
export function selectionCommand({providerId,modelId}:ModelRef){return {type:'select' as const,selection:{providerId,modelId}};}
export function freshVerification(value:ModelVerification|null|undefined,selection:ModelRef|null|undefined,status:'connected'|'ready',now=Date.now()){
 return Boolean(value&&sameModel(value,selection)&&value.status===status&&value.connectivity&&value.authenticated!==false&&(status!=='ready'||value.toolCalling)&&value.expiresAt&&Date.parse(value.expiresAt)>now);
}
