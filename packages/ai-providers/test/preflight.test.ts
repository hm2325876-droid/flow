import {describe,it,expect,vi} from 'vitest';
import {classifyProviderError,verifyConnection,verifyModel} from '../src/preflight';
const selection={providerId:'openai',modelId:'unit-model'};
function response(message:unknown,finishReason='stop'){
 return new Response(JSON.stringify({id:'unit-completion',object:'chat.completion',created:1,model:'unit-model',choices:[{index:0,message,finish_reason:finishReason}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}),{headers:{'Content-Type':'application/json'}});
}
function strings(value:unknown):string[]{return typeof value==='string'?[value]:Array.isArray(value)?value.flatMap(strings):value&&typeof value==='object'?Object.values(value).flatMap(strings):[];}
describe('real SDK request path with isolated HTTP responses',()=>{
 it('separates one basic authenticated invocation from tool compatibility without sending tools',async()=>{
  const fetcher=vi.fn<typeof fetch>(async(_input,init)=>{const body=JSON.parse(String(init?.body));expect(body.model).toBe('unit-model');expect(body.tools).toBeUndefined();expect(body.max_completion_tokens??body.max_tokens).toBe(512);return response({role:'assistant',content:'OK'});});
  const result=await verifyConnection(selection,'unit-test-key',fetcher);
  expect(result).toMatchObject({status:'connected',phase:'connection',authenticated:true,connectivity:true,toolCalling:false});expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('reports actual malformed-success SDK failures with only safe validation diagnostics',async()=>{
  for(const [body,sdkError,httpStatus] of [['not-json','AI_JSONParseError',200],[JSON.stringify({unexpected:'unit-test-key'}),'AI_TypeValidationError',200],[JSON.stringify({id:'unit',object:'chat.completion',created:1,model:'unit-model',choices:[]}), 'AI_InvalidResponseDataError',undefined]] as const){
   const fetcher=vi.fn<typeof fetch>(async()=>new Response(body,{headers:{'Content-Type':'application/json'}}));
   const result=await verifyConnection(selection,'unit-test-key',fetcher);
   expect(result.status).toBe('response-invalid');expect(result.connectivity).toBe(false);expect(result.diagnostic).toMatchObject({stage:'response-validation',category:'invalid-response',sdkError});expect(result.diagnostic?.httpStatus).toBe(httpStatus);expect(fetcher).toHaveBeenCalledTimes(1);expect(JSON.stringify(result)).not.toContain('unit-test-key');
  }
 });
 it('unwraps sanitized transport and retry causes without returning arbitrary error names',()=>{
  const secret='unit-test-key';
  const result=classifyProviderError({name:'AI_RetryError',message:secret,lastError:{name:'AI_APICallError',cause:{name:secret,code:'ECONNRESET'}}},'connection');
  expect(result).toMatchObject({status:'network',diagnostic:{stage:'transport',category:'network',sdkError:'AI_APICallError'}});expect(JSON.stringify(result)).not.toContain(secret);
 });
 it('requires a schema-valid challenge call and consumption of its new receipt, exactly two requests',async()=>{
  const fetcher=vi.fn<typeof fetch>(async(input,init)=>{
   expect(new URL(String(input)).origin).toBe('https://api.openai.com');
   expect(init?.redirect).toBe('error');
   const body=JSON.parse(String(init?.body)),values=strings(body);
   if(fetcher.mock.calls.length===1){
    const challenge=values.join('\n').match(/challenge "([a-f0-9]+)"/)?.[1];expect(challenge).toBeTruthy();
    return response({role:'assistant',content:'Checking the protocol.',tool_calls:[{id:'unit-call',type:'function',function:{name:'capability_probe',arguments:JSON.stringify({challenge})}}]},'tool_calls');
   }
   const receipt=values.join('\n').match(/FLOWPROOF_[a-f0-9]+/)?.[0];expect(receipt).toBeTruthy();
   return response({role:'assistant',content:receipt});
  });
  const result=await verifyModel(selection,'unit-test-key',fetcher);
  expect(result.status).toBe('ready');expect(result.toolCalling).toBe(true);expect(result.connectivity).toBe(true);expect(fetcher).toHaveBeenCalledTimes(2);expect(result.expiresAt).not.toBeNull();expect(JSON.stringify(result)).not.toContain('unit-test-key');
 });
 it('never treats text-only connectivity as tool readiness',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>response({role:'assistant',content:'I can call tools'}));
  const result=await verifyModel(selection,'unit-test-key',fetcher);
  expect(result.status).toBe('capability-unverified');expect(result.connectivity).toBe(true);expect(result.toolCalling).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('makes no request without credentials or a registered adapter',async()=>{
  const fetcher=vi.fn<typeof fetch>();
  expect((await verifyModel(selection,'',fetcher)).status).toBe('missing-key');
  expect((await verifyModel({providerId:'unsupported',modelId:'unit-model'},'unit-test-key',fetcher)).status).toBe('adapter-unavailable');expect(fetcher).not.toHaveBeenCalled();
 });
 it('does not promote a valid tool call when the model fails to consume its result',async()=>{
  let calls=0;
  const fetcher=vi.fn<typeof fetch>(async(_input,init)=>{
   calls++;
   if(calls===1){const challenge=strings(JSON.parse(String(init?.body))).join('\n').match(/challenge "([a-f0-9]+)"/)?.[1];return response({role:'assistant',content:null,tool_calls:[{id:'unit-call',type:'function',function:{name:'capability_probe',arguments:JSON.stringify({challenge})}}]},'tool_calls');}
   return response({role:'assistant',content:'I do not know the receipt'});
  });
  const result=await verifyModel(selection,'unit-test-key',fetcher);expect(result.status).toBe('capability-unverified');expect(result.toolCalling).toBe(false);expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('accepts an unambiguous standalone receipt with prose but rejects duplicate, invented and substring receipts',async()=>{
  for(const mode of ['prose','duplicate','invented','substring'] as const){
   const fetcher=vi.fn<typeof fetch>(async(_input,init)=>{
    const values=strings(JSON.parse(String(init?.body))).join('\n');
    if(fetcher.mock.calls.length===1){const challenge=values.match(/challenge "([a-f0-9]+)"/)?.[1];return response({role:'assistant',content:null,tool_calls:[{id:'unit-call',type:'function',function:{name:'capability_probe',arguments:JSON.stringify({challenge})}}]},'tool_calls');}
    const receipt=values.match(/FLOWPROOF_[a-f0-9]+/)?.[0];
    return response({role:'assistant',content:mode==='prose'?`Receipt: ${receipt}.`:mode==='duplicate'?`${receipt} ${receipt}`:mode==='substring'?`prefix${receipt}suffix`:'FLOWPROOF_000000000000000000000000'});
   });
   const result=await verifyModel(selection,'unit-test-key',fetcher);expect(result.status).toBe(mode==='prose'?'ready':'capability-unverified');expect(fetcher).toHaveBeenCalledTimes(2);
  }
 });
 it('does not accept invalid tool arguments or unknown tools even when a final receipt is invented',async()=>{
  for(const mode of ['invalid-json','wrong-schema','unknown-tool'] as const){
   const fetcher=vi.fn<typeof fetch>(async():Promise<Response>=>fetcher.mock.calls.length===1?response({role:'assistant',content:null,tool_calls:[{id:'unit-call',type:'function',function:{name:mode==='unknown-tool'?'unknown':'capability_probe',arguments:mode==='invalid-json'?'{':JSON.stringify({unexpected:true})}}]},'tool_calls'):response({role:'assistant',content:'FLOWPROOF_000000000000000000000000'}));
   const result=await verifyModel(selection,'unit-test-key',fetcher);expect(result.status).toBe('capability-unverified');expect(result.toolCalling).toBe(false);expect(result.diagnostic).toMatchObject({stage:'tool-call',category:'tool-inconclusive',sdkError:mode==='unknown-tool'?'AI_NoSuchToolError':'AI_InvalidToolInputError'});expect(fetcher).toHaveBeenCalledTimes(2);
  }
 });
 it('keeps first-step connectivity when the tool-result request times out',async()=>{
  const fetcher=vi.fn<typeof fetch>(async(_input,init)=>{
   if(fetcher.mock.calls.length>1)throw new DOMException('unit-test-key','TimeoutError');
   const challenge=strings(JSON.parse(String(init?.body))).join('\n').match(/challenge "([a-f0-9]+)"/)?.[1];return response({role:'assistant',content:null,tool_calls:[{id:'unit-call',type:'function',function:{name:'capability_probe',arguments:JSON.stringify({challenge})}}]},'tool_calls');
  });
  const result=await verifyModel(selection,'unit-test-key',fetcher);expect(result).toMatchObject({status:'timeout',connectivity:true,toolCalling:false,diagnostic:{stage:'transport',category:'timeout'}});expect(fetcher).toHaveBeenCalledTimes(2);expect(JSON.stringify(result)).not.toContain('unit-test-key');
 });
 it('does not retry rejected authentication or unavailable models and sanitizes errors',async()=>{
  for(const [code,status] of [[401,'authentication'],[404,'model-unavailable'],[429,'rate-limited']] as const){
   const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({error:{message:'unit-test-key',type:'unit_error',code:'unit'}}),{status:code,headers:{'Content-Type':'application/json'}}));
   const result=await verifyModel(selection,'unit-test-key',fetcher);expect(result.status).toBe(status);expect(fetcher).toHaveBeenCalledTimes(1);expect(JSON.stringify(result)).not.toContain('unit-test-key');
  }
 });
 it('classifies aborted deadlines and network failures without retries or diagnostic leakage',async()=>{
  for(const [cause,status] of [[new DOMException('unit-test-key','TimeoutError'),'timeout'],[new TypeError('unit-test-key'),'network']] as const){
   const fetcher=vi.fn<typeof fetch>(async(_input,init)=>{expect(init?.signal).toBeInstanceOf(AbortSignal);throw cause;});
   const result=await verifyModel(selection,'unit-test-key',fetcher);expect(result.status).toBe(status);expect(fetcher).toHaveBeenCalledTimes(1);expect(JSON.stringify(result)).not.toContain('unit-test-key');
  }
 });
 it('enforces separate finite connection and tool deadlines through the real SDK signal path',async()=>{
  for(const [verify,limit] of [[verifyConnection,20_000],[verifyModel,30_000]] as const){
   const controller=new AbortController();
   const timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(controller.signal);
   const fetcher=vi.fn<typeof fetch>(async(_input,init)=>new Promise<Response>((_resolve,reject)=>{
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    init?.signal?.addEventListener('abort',()=>reject(init.signal?.reason),{once:true});
    queueMicrotask(()=>controller.abort(new DOMException('unit-test-key','TimeoutError')));
   }));
   try{const result=await verify(selection,'unit-test-key',fetcher);expect(timeout).toHaveBeenCalledWith(limit);expect(result).toMatchObject({status:'timeout',toolCalling:false,diagnostic:{stage:'transport',category:'timeout'}});expect(fetcher).toHaveBeenCalledTimes(1);expect(JSON.stringify(result)).not.toContain('unit-test-key');}
   finally{timeout.mockRestore();}
  }
 });
});
