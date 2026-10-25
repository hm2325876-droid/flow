// Deterministic adapter ONLY for the native integration test entry. Production
// Utility always uses resolveModel and never imports this file or ai/test.
import {randomUUID} from 'node:crypto';
import {MockLanguageModelV4} from 'ai/test';
import type {LanguageModelV4CallOptions,LanguageModelV4GenerateResult} from '@ai-sdk/provider';
const usage={inputTokens:{total:8,noCache:8,cacheRead:0,cacheWrite:0},outputTokens:{total:2,text:2,reasoning:0}};
const call=(toolName:string,input:unknown):LanguageModelV4GenerateResult=>({content:[{type:'tool-call',toolCallId:randomUUID(),toolName,input:JSON.stringify(input)}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]});
function outputs(request:LanguageModelV4CallOptions){return request.prompt.flatMap(m=>m.role==='tool'?m.content.filter(p=>p.type==='tool-result').map(p=>p.output.type==='json'?p.output.value:null):[]).filter(Boolean) as Record<string,any>[];}
export function nativeTestModel(modelId:string){
 let step=0;
 return new MockLanguageModelV4({provider:'test-only-deterministic',modelId,doGenerate:async request=>{
  const results=outputs(request),prompt=JSON.stringify(request.prompt);step++;
  if(prompt.includes('native-sensitive-'))throw new Error('Sensitive data reached the test model');
  const panel=modelId.includes('panel');
  if(step===1){if(!prompt.includes(panel?'Show details':'Increment counter'))throw new Error('Actual page observation missing');return call('update_todos',{tasks:[{id:'exercise',description:panel?'Expand the product details':'Exercise and inspect the counter',status:'in-progress',evidence:[]}]});}
  if(panel){
   if(step===2)return call('click',{kind:'click',locator:{by:'role',role:'button',value:'Show details'}});
   if(step===3){if(!prompt.includes('Expanded product details'))throw new Error('Real panel result missing');return call('inspect_page',{kind:'inspect'});}
   if(step===4){const observed=[...results].reverse().find(r=>r.actionId&&r.ok);return call('update_todos',{tasks:[{id:'exercise',description:'Expand the product details',status:'completed',evidence:[observed!.actionId]}]});}
   return call('finish_audit',{outcome:'completed',reason:'The product detail expansion was observed.'});
  }
  if(step===2)return call('ask_user',{kind:'single',prompt:'Choose the expected counter behavior.',options:['Increment by one','Remain unchanged'],required:true,allowSkip:false});
  if(step===3){if(!prompt.includes('Increment by one'))throw new Error('Validated answer missing');return call('ask_user',{kind:'secret',prompt:'Enter a private test value for the identified field.',target:{by:'label',value:'Private test input'},required:true,allowSkip:false});}
  if(step===4){const answer=[...results].reverse().find(r=>r.secretRef);if(!answer)throw new Error('Opaque broker reference missing');return call('fill',{kind:'fill',locator:{by:'label',value:'Private test input'},secretRef:answer.secretRef});}
  if(step===5)return call('click',{kind:'click',locator:{by:'role',role:'button',value:'Increment counter'}});
  if(step===6){if(!prompt.includes('Counter 1'))throw new Error('Actual counter result missing');return call('ask_user',{kind:'text',prompt:'Confirm the observed result after inspecting the browser.',required:true,allowSkip:false});}
  if(step===7){if(!prompt.includes('control-returned'))throw new Error('Return Control reconciliation missing');return call('inspect_page',{kind:'inspect'});}
  if(step===8){if(!/Counter [23]/.test(prompt))throw new Error('Manual native interaction was not observed on return');const observed=[...results].reverse().find(r=>r.actionId&&r.ok);return call('update_todos',{tasks:[{id:'exercise',description:'Exercise and inspect the counter',status:'completed',evidence:[observed!.actionId]}]});}
  if(step===9)return call('capture_evidence',{kind:'capture'});
  return call('finish_audit',{outcome:'completed',reason:'Counter interactions were observed in the same native session.'});
 }});
}
