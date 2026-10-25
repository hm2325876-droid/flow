import http from 'node:http';
import {
  setupCommandSchema,setupStateSchema,catalogSnapshotSchema,modelVerificationSchema,
  auditHandoffSchema,targetSchema,defaultAuditDraft,registeredProviderSchema,
  type SetupCommand,type SetupState,type RegisteredProvider,type ModelVerification,
  type AuditDraft,type AuditReadiness,type ModelRef,type providerUtilityCommandSchema
} from '@flowproof/contracts';
import type {z} from 'zod';
import {SettingsStore} from '@flowproof/persistence';
import {CredentialVault,type SecureStorage} from './credentials';
import {isAllowedUrl} from './browser/policy';

type ProviderCommand=z.infer<typeof providerUtilityCommandSchema>;
export interface SetupOptions {
  folder:string;
  secureStorage:SecureStorage;
  providers:RegisteredProvider[];
  requestProvider:(command:ProviderCommand)=>Promise<unknown>;
  hasActiveAudit:()=>boolean;
  now?:()=>number;
}

export function auditTarget(draft:AuditDraft):string|null {
  const result=targetSchema.safeParse({port:Number(draft.port),path:draft.path||'/',consent:true});
  if(!result.success)return null;
  const origin=`http://localhost:${result.data.port}`;
  const url=new URL(result.data.path,origin).href;
  return isAllowedUrl(url,new URL(origin).origin)?url:null;
}

/** Does not follow redirects, access public hosts or create a native audit guest. */
export function checkLocalTarget(url:string,timeoutMs=4000):Promise<{ok:boolean;message:string}>{
  let parsed:URL;
  try{parsed=new URL(url);}catch{return Promise.resolve({ok:false,message:'Enter a valid authorized localhost URL.'});}
  if(!isAllowedUrl(url,parsed.origin))return Promise.resolve({ok:false,message:'Only the authorized HTTP localhost origin is allowed.'});
  return new Promise(resolve=>{
    let settled=false;
    const done=(ok:boolean,message:string)=>{if(!settled){settled=true;resolve({ok,message});}};
    const request=http.request(parsed,{method:'HEAD',timeout:timeoutMs,headers:{'User-Agent':'FlowProof-Readiness/0.1'}},response=>{
      const status=response.statusCode??0;
      response.resume();
      if(status>=300&&status<400){
        const location=response.headers.location;
        let allowed=false;try{allowed=Boolean(location)&&isAllowedUrl(new URL(location!,parsed).href,parsed.origin);}catch{}
        done(allowed,allowed?'Localhost target is reachable; its redirect stays within scope.':'Target redirects outside the authorized origin or has no usable redirect.');
      }else done(status>=200&&status<300,status>=200&&status<300?'Localhost target is reachable.':`Localhost target replied with HTTP ${status}. Check its port and path.`);
      request.destroy();
    });
    request.on('timeout',()=>{done(false,'Localhost target timed out. Start your application and retry.');request.destroy();});
    request.on('error',()=>done(false,'Localhost target is unavailable. Start your application and check the port/path.'));
    request.end();
  });
}

export class SetupService {
  private store?:SettingsStore;
  private vault:CredentialVault;
  private initialized:Promise<void>;
  private queue:Promise<unknown>=Promise.resolve();
  private selection:ModelRef|null=null;
  private draft:AuditDraft={...defaultAuditDraft};
  private catalog:SetupState['catalog']=null;
  private catalogError:string|null=null;
  private verification:ModelVerification|null=null;
  private verificationRevision:string|null=null;
  private invalidKeys=new Set<string>();
  private review:AuditReadiness|null=null;
  private error:string|null=null;
  private storageFailure=false;
  private generation=0;
  private reviewGeneration=0;
  private providers:RegisteredProvider[];
  private clock:()=>number;
  constructor(private options:SetupOptions){
    this.providers=options.providers.map(p=>registeredProviderSchema.parse(p));
    this.clock=options.now??Date.now;
    this.vault=new CredentialVault(options.folder,options.secureStorage);
    this.initialized=this.initialize();
  }
  private async initialize(){
    try{
      this.store=await SettingsStore.open(this.options.folder);
      const saved=await this.store.read();this.selection=saved.selection;this.draft=saved.draft;
      this.catalog=await this.store.readCatalog();
      await this.vault.init();
    }catch{this.storageFailure=true;this.error='Local configuration could not be opened safely. Check app data access and restart FlowProof.';}
  }
  init(){return this.initialized;}
  private knownProvider(id:string){return this.providers.some(p=>p.id===id);}
  private invalidate(){this.verification=null;this.verificationRevision=null;this.review=null;}
  private fresh(){return Boolean(this.selection&&this.verification?.status==='ready'&&this.verification.toolCalling&&this.verification.connectivity&&this.verification.providerId===this.selection.providerId&&this.verification.modelId===this.selection.modelId&&this.verificationRevision===this.vault.revision(this.selection.providerId)&&this.verification.expiresAt&&Date.parse(this.verification.expiresAt)>this.clock());}
  private async snapshot():Promise<SetupState>{
    const available=await this.vault.isAvailable();
    if(this.verification?.status==='ready'&&(!available||!this.fresh())){this.verification=null;this.verificationRevision=null;this.review=null;}
    return setupStateSchema.parse({catalog:this.catalog,catalogError:this.catalogError,providers:this.providers,selection:this.selection,credentials:this.providers.map(p=>({providerId:p.id,status:!this.vault.has(p.id)?'missing':this.invalidKeys.has(p.id)?'invalid':!available?'verification-required':'configured'})),verification:this.verification,draft:this.draft,review:this.review,secureStorageAvailable:available,error:this.error});
  }
  handle(input:SetupCommand):Promise<SetupState>{
    // Dismissal invalidates authority immediately, even while an earlier paid
    // check is awaiting a reply. Its late result cannot revive a closed setup.
    const initial=setupCommandSchema.safeParse(input);
    if(initial.success&&['dismiss','load','save-key','remove-key','select'].includes(initial.data.type)){
      const selectingSame=initial.data.type==='select'&&initial.data.selection.providerId===this.selection?.providerId&&initial.data.selection.modelId===this.selection.modelId;
      if(!selectingSame){this.generation++;this.invalidate();}
    }
    if(initial.success&&initial.data.type==='save-draft'){this.reviewGeneration++;this.review=null;}
    const generation=this.generation;
    const task=this.queue.then(async()=>{
      await this.initialized;
      const parsed=setupCommandSchema.safeParse(input);
      if(!parsed.success){this.review=null;this.error='Setup request is invalid. Check the entered fields and retry.';return this.snapshot();}
      this.error=this.storageFailure?'Local storage is unavailable. Restart FlowProof after checking app data access.':null;
      try{if(!this.storageFailure&&(!['verify','review','prepare'].includes(parsed.data.type)||generation===this.generation))await this.execute(parsed.data);}
      catch{this.review=null;this.error='Setup could not be saved or checked safely. Check local storage and try again.';}
      return this.snapshot();
    });
    this.queue=task.catch(()=>{});return task;
  }
  private async execute(command:SetupCommand){
    switch(command.type){
      case 'load':this.invalidate();break;
      case 'catalog':{
        try{
          const result=catalogSnapshotSchema.parse(await this.options.requestProvider({type:'catalog',cache:this.catalog,refresh:command.refresh}));
          await this.store!.saveCatalog(result);this.catalog=result;this.catalogError=null;
        }catch{this.catalogError=this.catalog?'Catalog refresh is unavailable. Your saved catalog and supported selection remain usable.':'Models.dev is unavailable and no catalog is cached. Connect to the internet and refresh, or enter an installed provider model ID.';if(this.catalog)this.catalog={...this.catalog,source:'cache',stale:true,warning:this.catalogError};}
        break;
      }
      case 'select':{
        if(!this.knownProvider(command.selection.providerId)){this.error='This provider has no installed, registered adapter. Select a supported provider.';break;}
        if(this.selection?.providerId!==command.selection.providerId||this.selection.modelId!==command.selection.modelId)this.invalidate();
        await this.store!.saveSelection(command.selection);this.selection=command.selection;break;
      }
      case 'save-key':{
        if(!this.knownProvider(command.providerId)){this.error='No trusted credential path exists for that provider.';break;}
        this.invalidate();
        try{await this.vault.save(command.providerId,command.key);this.invalidKeys.delete(command.providerId);}
        catch{this.error=await this.vault.isAvailable()?'The key could not be encrypted and saved. Check local storage and retry.':'OS-backed secure storage is unavailable. No API key was saved.';}
        finally{command.key='';}
        break;
      }
      case 'remove-key':{
        if(!this.knownProvider(command.providerId)){this.error='No trusted credential path exists for that provider.';break;}
        this.invalidate();await this.vault.remove(command.providerId);this.invalidKeys.delete(command.providerId);break;
      }
      case 'verify':await this.verify();break;
      case 'save-draft':await this.store!.saveDraft(command.draft);this.draft=command.draft;this.review=null;break;
      case 'dismiss':this.invalidate();break;
      case 'review':
      case 'prepare':await this.store!.saveDraft(command.draft);this.draft=command.draft;await this.checkReadiness(command.authorized,command.type==='prepare');break;
    }
  }
  private failure(status:ModelVerification['status'],message:string):ModelVerification {
    return {...this.selection!,status,message,connectivity:false,toolCalling:false,checkedAt:new Date(this.clock()).toISOString(),expiresAt:null};
  }
  private async verify(){
    const generation=this.generation;
    this.review=null;
    if(!this.selection){this.error='Select a supported provider and model first.';return;}
    if(this.fresh())return;
    if(!this.knownProvider(this.selection.providerId)){this.verification=this.failure('adapter-unavailable','The selected provider has no installed adapter.');return;}
    if(!this.vault.has(this.selection.providerId)){this.verification=this.failure('missing-key','Add an API key for the selected provider.');return;}
    if(!await this.vault.isAvailable()){this.verification=this.failure('missing-key','OS-backed secure storage is unavailable. Restore it before checking the connection.');return;}
    try{
      const selected=this.selection;
      const result=await this.vault.withKey(selected.providerId,key=>this.options.requestProvider({type:'verify',selection:selected,key}));
      if(generation!==this.generation)return;
      const parsed=modelVerificationSchema.parse(result);
      if(parsed.providerId!==selected.providerId||parsed.modelId!==selected.modelId)throw new Error('Mismatched verification identity');
      if(parsed.status==='ready'&&(!parsed.connectivity||!parsed.toolCalling||!parsed.expiresAt))throw new Error('Incomplete verification');
      // Main owns the freshness lifetime; Utility cannot grant an unlimited attestation.
      this.verification={...parsed,checkedAt:new Date(this.clock()).toISOString(),expiresAt:parsed.status==='ready'?new Date(this.clock()+5*60_000).toISOString():null};
      this.verificationRevision=this.vault.revision(selected.providerId);
      if(parsed.status==='authentication')this.invalidKeys.add(selected.providerId);else if(parsed.status==='ready')this.invalidKeys.delete(selected.providerId);
    }catch{if(generation!==this.generation)return;this.verification=this.failure('capability-unverified','The model check could not establish tool compatibility. Check the key/network and retry.');this.verificationRevision=null;}
  }
  private async checkReadiness(authorized:boolean,prepare:boolean){
    const generation=this.generation;
    const reviewGeneration=this.reviewGeneration;
    const target=auditTarget(this.draft);
    const fields=Boolean(this.draft.projectName.trim()&&this.draft.goal.trim());
    const adapter=Boolean(this.selection&&this.knownProvider(this.selection.providerId));
    const credentials=Boolean(this.selection&&this.vault.has(this.selection.providerId)&&await this.vault.isAvailable());
    const budgets=this.draft.maxSteps>=1&&this.draft.maxSteps<=1000&&this.draft.timeoutMinutes>=1&&this.draft.timeoutMinutes<=60;
    let availability=!this.options.hasActiveAudit();
    if(fields&&target&&adapter&&credentials&&budgets&&availability)await this.verify();
    const targetResult=target?await checkLocalTarget(target):{ok:false,message:'Use a valid port and local path under http://localhost.'};
    if(generation!==this.generation||reviewGeneration!==this.reviewGeneration){this.review=null;return;}
    availability=availability&&!this.options.hasActiveAudit();
    const model=this.fresh();
    const checks:AuditReadiness['checks']=[
      {id:'fields',status:fields?'passed':'failed',message:fields?'Project name and testing goal are valid.':'Enter a project name and a testing goal.'},
      {id:'target',status:targetResult.ok?'passed':'failed',message:targetResult.message},
      {id:'adapter',status:adapter?'passed':'failed',message:adapter?'A registered provider adapter is available.':'Select a model with an installed, registered adapter.'},
      {id:'credentials',status:credentials?'passed':'failed',message:credentials?'An OS-protected provider key is configured.':'Add a protected key and make sure secure storage is available.'},
      {id:'model',status:model?'passed':'failed',message:model?'Connectivity and the actual tool round trip are verified.':this.verification?.message??'Verify the selected model and its tool capability.'},
      {id:'budgets',status:budgets?'passed':'failed',message:budgets?'Execution limits are valid.':'Enter valid step and time limits.'},
      {id:'availability',status:availability?'passed':'failed',message:availability?'No conflicting audit/browser operation is active.':'Wait for the current browser operation to finish.'},
      {id:'authorization',status:authorized?'passed':'failed',message:authorized?'You authorized this exact localhost target and goal.':'Explicitly confirm authorization for this audit.'}
    ];
    const ready=checks.every(c=>c.status==='passed');
    const timestamp=new Date(this.clock()).toISOString();
    const handoff=ready&&prepare?auditHandoffSchema.parse({schemaVersion:1,selection:this.selection,projectName:this.draft.projectName.trim(),goal:this.draft.goal.trim(),context:this.draft.context,targetUrl:target,maxSteps:this.draft.maxSteps,timeoutMinutes:this.draft.timeoutMinutes,authorizedAt:timestamp,checkedAt:timestamp,providerValidatedAt:this.verification!.checkedAt,expiresAt:this.verification!.expiresAt}):null;
    this.review={ready,checks,handoff};
  }
  async close(){await this.queue.catch(()=>{});await this.initialized;this.invalidate();this.store?.close();}
}
