import {randomBytes} from 'node:crypto';
import {generateText,tool,isStepCount} from 'ai';
import {z} from 'zod';
import {modelVerificationSchema,modelRefSchema,type ModelRef,type ModelVerification} from '@flowproof/contracts';
import {registeredProviders,resolveModel} from './registry';

// Provider warnings may contain remote diagnostics. Only the fixed safe status is published.
globalThis.AI_SDK_LOG_WARNINGS=false;

type Status=ModelVerification['status'];
function failure(selection:ModelRef,status:Status,message:string,connectivity=false):ModelVerification{
 return modelVerificationSchema.parse({...selection,status,message,connectivity,toolCalling:false,checkedAt:new Date().toISOString(),expiresAt:null});
}
/** Never return SDK error messages, HTTP bodies, request headers or raw responses. */
export function classifyProviderError(cause:unknown):{status:Status;message:string}{
 let item=cause,network=false;const visited=new Set<unknown>();
 while(item&&typeof item==='object'&&!visited.has(item)){
  visited.add(item);const e=item as {statusCode?:number;name?:string;cause?:unknown};
  if(e.statusCode===401||e.statusCode===403)return {status:'authentication',message:'The provider rejected authentication. Replace the key or check model access for this account.'};
  if(e.statusCode===402)return {status:'quota',message:'The provider requires available credit or quota before this model can run.'};
  if(e.statusCode===404)return {status:'model-unavailable',message:'The provider could not find this model. Check its native model ID and account availability.'};
  if(e.statusCode===429)return {status:'rate-limited',message:'The provider rate-limited the check. Wait before trying again and check account quota.'};
  if(e.statusCode===400||e.statusCode===422)return {status:'capability-unavailable',message:'The provider rejected the model or required tool interaction. Check the model ID and tool support.'};
  if(e.statusCode&&e.statusCode>=500)return {status:'network',message:'The provider is temporarily unavailable. Your configuration has not been marked ready.'};
  if(e.name==='TimeoutError'||e.name==='AbortError')return {status:'timeout',message:'The bounded model check timed out. Try again when the provider is available.'};
  if(e.name==='AI_UnsupportedFunctionalityError')return {status:'capability-unavailable',message:'This adapter or model cannot perform the required tool interaction.'};
  if(e.name==='AI_NoSuchModelError')return {status:'model-unavailable',message:'This model is unavailable through the installed adapter.'};
  if(e.name==='TypeError'||e.name==='AI_APICallError'&&!e.statusCode)network=true;
  item=e.cause;
 }
 if(network)return {status:'network',message:'The provider could not be reached. Check the network connection and retry.'};
 return {status:'capability-unverified',message:'The provider interaction could not be verified. Check connectivity, model access and tool support, then retry.'};
}

export async function verifyModel(input:ModelRef,key:string,fetcher:typeof fetch=fetch):Promise<ModelVerification>{
 const selection=modelRefSchema.parse(input);
 if(!registeredProviders().some(p=>p.id===selection.providerId))return failure(selection,'adapter-unavailable','This provider has no installed, registered execution adapter.');
 if(!key.trim())return failure(selection,'missing-key','Save an API key for this provider before running the check.');
 const challenge=randomBytes(12).toString('hex'),receipt='FLOWPROOF_'+randomBytes(12).toString('hex');
 let executed=false;
 try{
  const model=resolveModel(selection,key,fetcher);
  const result=await generateText({
   model,maxRetries:0,abortSignal:AbortSignal.timeout(40_000),maxOutputTokens:1024,
   telemetry:{isEnabled:false,recordInputs:false,recordOutputs:false},
   tools:{capability_probe:tool({description:'A harmless local compatibility check. Return the exact supplied challenge.',inputSchema:z.object({challenge:z.string().min(1).max(64)}).strict(),execute:async args=>{if(args.challenge!==challenge)throw new Error('Challenge mismatch');executed=true;return {receipt};}})},
   prompt:`This is a bounded tool protocol check, with no browser or user data. Call capability_probe exactly once with challenge "${challenge}". After receiving its tool result, respond with exactly its receipt value and no other text. Do not invent the receipt.`,
   stopWhen:isStepCount(2),
   prepareStep:({stepNumber})=>stepNumber===0?{toolChoice:'auto' as const}:{toolChoice:'none' as const}
  });
  const first=result.steps[0],last=result.steps[1];
  const passed=executed&&result.steps.length===2&&first.toolCalls.length===1&&first.toolCalls[0].toolName==='capability_probe'&&first.toolResults.length===1&&last.toolCalls.length===0&&last.text.trim()===receipt;
  if(!passed)return failure(selection,'capability-unverified','The model responded but did not complete the required schema-valid tool call and result acknowledgement.',true);
  const checkedAt=new Date();
  return modelVerificationSchema.parse({...selection,status:'ready',message:'Connection and a real tool-call/result round trip passed. Runtime reliability is not guaranteed.',connectivity:true,toolCalling:true,checkedAt:checkedAt.toISOString(),expiresAt:new Date(checkedAt.getTime()+300_000).toISOString()});
 }catch(cause){const safe=classifyProviderError(cause);return failure(selection,safe.status,safe.message);}
 finally{key='';}
}
