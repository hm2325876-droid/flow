import {describe,it,expect,vi} from 'vitest';
import {verifyModel} from '../src/preflight';
const selection={providerId:'openai',modelId:'unit-model'};
function response(message:unknown,finishReason='stop'){
 return new Response(JSON.stringify({id:'unit-completion',object:'chat.completion',created:1,model:'unit-model',choices:[{index:0,message,finish_reason:finishReason}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}),{headers:{'Content-Type':'application/json'}});
}
function strings(value:unknown):string[]{return typeof value==='string'?[value]:Array.isArray(value)?value.flatMap(strings):value&&typeof value==='object'?Object.values(value).flatMap(strings):[];}
describe('real SDK request path with isolated HTTP responses',()=>{
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
});
