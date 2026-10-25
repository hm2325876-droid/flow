import {describe,it,expect,vi} from 'vitest';
import {registeredProviders,resolveModel} from '../src/registry';
import {classifyProviderError,verifyModel} from '../src/preflight';

describe('trusted provider registry',()=>{
 it('instantiates all six installed adapters and preserves aggregator IDs',()=>{
  expect(registeredProviders().map(p=>p.id)).toEqual(['openai','anthropic','google','openrouter','deepseek','groq']);
  for(const provider of registeredProviders()){
   const model=resolveModel({providerId:provider.id,modelId:'unit-model'},'unit-test-key');
   expect(model.modelId).toBe('unit-model');
  }
  expect(resolveModel({providerId:'openrouter',modelId:'native/vendor-model'},'unit-test-key').modelId).toBe('native/vendor-model');
 });
 it('rejects unregistered adapters and endpoint/path interpretation',()=>{
  expect(()=>resolveModel({providerId:'uninstalled',modelId:'unit-model'},'unit-test-key')).toThrow('Unsupported provider');
  for(const modelId of ['https://untrusted.invalid/model','../path','a/../path','a?key=bad','/absolute'])expect(()=>resolveModel({providerId:'openai',modelId},'unit-test-key')).toThrow();
 });
 it('maps provider errors into safe fixed messages without raw diagnostics',()=>{
  for(const [statusCode,status] of [[401,'authentication'],[403,'authentication'],[402,'quota'],[404,'model-unavailable'],[429,'rate-limited'],[400,'capability-unavailable'],[503,'network']] as const){
   const result=classifyProviderError({statusCode,message:'unit-secret',responseBody:'unit-secret'});expect(result.status).toBe(status);expect(JSON.stringify(result)).not.toContain('unit-secret');
  }
  expect(classifyProviderError({name:'TimeoutError'}).status).toBe('timeout');
 });
 it('sends each adapter credential only to its fixed provider origin with redirects disabled',async()=>{
  vi.stubEnv('ANTHROPIC_BASE_URL','https://untrusted.invalid');vi.stubEnv('OPENAI_BASE_URL','https://untrusted.invalid');
  try{
  const origins={openai:'https://api.openai.com',anthropic:'https://api.anthropic.com',google:'https://generativelanguage.googleapis.com',openrouter:'https://openrouter.ai',deepseek:'https://api.deepseek.com',groq:'https://api.groq.com'};
  for(const provider of registeredProviders()){
   let requests=0;const observations:{origin:string;redirect:RequestRedirect|undefined;authenticated:boolean}[]=[];
   const fetcher:typeof fetch=async(input,init)=>{
    requests++;
    const url=new URL(input instanceof Request?input.url:String(input));
    const headers=new Headers(init?.headers);
    observations.push({origin:url.origin,redirect:init?.redirect,authenticated:[...headers.values(),...url.searchParams.values()].some(value=>value.includes('unit-provider-key'))});
    return new Response(JSON.stringify({error:{message:'unit-provider-key'}}),{status:401,headers:{'Content-Type':'application/json'}});
   };
   const result=await verifyModel({providerId:provider.id,modelId:'unit-model'},'unit-provider-key',fetcher);
   expect(observations,provider.id).toEqual([{origin:origins[provider.id as keyof typeof origins],redirect:'error',authenticated:true}]);
   expect(result.status,provider.id).toBe('authentication');expect(requests).toBe(1);expect(JSON.stringify(result)).not.toContain('unit-provider-key');
  }
  }finally{vi.unstubAllEnvs();}
 });
});
