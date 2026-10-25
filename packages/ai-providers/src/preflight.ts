import {randomBytes} from 'node:crypto';
import {generateText,tool,isStepCount} from 'ai';
import {z} from 'zod';
import {modelVerificationSchema,modelRefSchema,verificationDiagnosticSchema,type ModelRef,type ModelVerification,type VerificationDiagnostic} from '@flowproof/contracts';
import {registeredProviders,resolveModel} from './registry';

// Remote SDK diagnostics can contain credentials or response bodies. Publish only fixed messages.
globalThis.AI_SDK_LOG_WARNINGS=false;
type Status=ModelVerification['status'];
type Phase='connection'|'tools';
type Stage=VerificationDiagnostic['stage'];
type Category=VerificationDiagnostic['category'];
type SafeError={status:Status;message:string;diagnostic:VerificationDiagnostic};
function failure(selection:ModelRef,status:Status,message:string,phase:Phase,diagnostic:VerificationDiagnostic,connectivity=false):ModelVerification{
 return modelVerificationSchema.parse({...selection,status,message,phase,diagnostic,authenticated:connectivity,connectivity,toolCalling:false,checkedAt:new Date().toISOString(),expiresAt:null});
}

/** Inspect only whitelisted names/statuses, including SDK retry/cause wrappers. Never copy messages or bodies. */
export function classifyProviderError(cause:unknown,stage:Stage='tool-call'):SafeError{
 const queue:unknown[]=[cause],visited=new Set<unknown>(),names:string[]=[];let httpStatus:number|undefined,network=false;
 while(queue.length&&visited.size<24){
  const item=queue.shift();if(!item||typeof item!=='object'||visited.has(item))continue;
  visited.add(item);
  const e=item as {statusCode?:unknown;name?:unknown;cause?:unknown;lastError?:unknown;errors?:unknown;code?:unknown};
  if(typeof e.statusCode==='number'&&Number.isInteger(e.statusCode)&&e.statusCode>=100&&e.statusCode<=599)httpStatus??=e.statusCode;
  if(typeof e.name==='string')names.push(e.name);
  if(typeof e.code==='string'&&['ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ETIMEDOUT','EPIPE','UND_ERR_SOCKET','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_CONNECT_TIMEOUT'].includes(e.code))network=true;
  queue.push(e.cause,e.lastError);if(Array.isArray(e.errors))queue.push(...e.errors.slice(-8));
 }
 const toolErrors=['AI_InvalidToolInputError','AI_NoSuchToolError','AI_ToolExecutionError','AI_ToolChoiceViolationError'];
 const sdkName=(names.find(name=>toolErrors.includes(name))??[...names].reverse().find(name=>verificationDiagnosticSchema.shape.sdkError.safeParse(name).success)) as VerificationDiagnostic['sdkError'];
 const result=(status:Status,message:string,category:Category,at:Stage=stage):SafeError=>({status,message,diagnostic:{stage:at,category,...(httpStatus===undefined?{}:{httpStatus}),...(sdkName?{sdkError:sdkName}:{})}});
 if(names.some(n=>n==='TimeoutError'||n==='AbortError'))return result('timeout','The connection check timed out. Retry when the provider is available.','timeout','transport');
 if(httpStatus===401||httpStatus===403)return result('authentication','The provider rejected the API key or account access. Replace the key or check access to this model.','authentication');
 if(httpStatus===402)return result('quota','The provider requires available credit or quota before this model can run.','quota');
 if(httpStatus===404||names.includes('AI_NoSuchModelError'))return result('model-unavailable','This exact model ID is unavailable through this provider. Check model access and refresh the catalog.','model-unavailable');
 if(httpStatus===429)return result('rate-limited','The provider rate-limited the check. Wait before retrying and check account quota.','rate-limited');
 if(httpStatus!==undefined&&httpStatus>=500)return result('network','The provider is temporarily unavailable. Retry the check later.','provider-unavailable','transport');
 if(names.includes('AI_UnsupportedFunctionalityError'))return result('capability-unavailable','This installed adapter or model does not support the required interaction.','tool-unsupported','adapter');
 if(httpStatus===400||httpStatus===422)return result('capability-unavailable',stage==='connection'?'The provider rejected this model request. Check the exact model ID and account support.':'The provider rejected the tool request. This model may not support the required tool protocol.','tool-unsupported');
 if(names.some(n=>toolErrors.includes(n)))return result('capability-unverified','The model returned an invalid tool interaction. Agent tool compatibility remains unverified.','tool-inconclusive');
 if(names.some(n=>['AI_JSONParseError','AI_TypeValidationError','AI_InvalidResponseDataError','AI_EmptyResponseBodyError','AI_NoOutputGeneratedError'].includes(n)))return result('response-invalid','The provider returned an empty or incompatible response for the installed adapter. Retry or choose another model.','invalid-response','response-validation');
 if(network||names.includes('TypeError')||names.includes('AI_APICallError')&&httpStatus===undefined)return result('network','The provider could not be reached. Check the network connection and retry.','network','transport');
 return result('capability-unverified','The model interaction could not be validated. Retry the indicated check or choose another model.','internal');
}
function prerequisite(selection:ModelRef,key:string,phase:Phase):ModelVerification|null{
 if(!registeredProviders().some(p=>p.id===selection.providerId))return failure(selection,'adapter-unavailable','This provider has no installed, registered execution adapter.',phase,{stage:'adapter',category:'adapter-unavailable'});
 if(!key.trim())return failure(selection,'missing-key','Save an API key for this provider before running the check.',phase,{stage:'adapter',category:'missing-key'});
 return null;
}
/** One authenticated, bounded model invocation. This never asserts agent tool compatibility. */
export async function verifyConnection(input:ModelRef,key:string,fetcher:typeof fetch=fetch):Promise<ModelVerification>{
 const selection=modelRefSchema.parse(input),blocked=prerequisite(selection,key,'connection');if(blocked)return blocked;
 try{
  const result=await generateText({model:resolveModel(selection,key,fetcher),maxRetries:0,abortSignal:AbortSignal.timeout(20_000),maxOutputTokens:512,telemetry:{isEnabled:false,recordInputs:false,recordOutputs:false},prompt:'This is a minimal connection check without user data. Reply briefly with OK.'});
  if(!result.text.trim()&&!result.reasoningText?.trim())return failure(selection,'response-invalid','The model returned no usable response. Connectivity and authentication remain unverified.','connection',{stage:'response-validation',category:'invalid-response'});
  const checkedAt=new Date();
  return modelVerificationSchema.parse({...selection,status:'connected',phase:'connection',message:'An authenticated model interaction succeeded. Agent tool compatibility has not been verified.',authenticated:true,connectivity:true,toolCalling:false,checkedAt:checkedAt.toISOString(),expiresAt:new Date(checkedAt.getTime()+300_000).toISOString()});
 }catch(cause){const safe=classifyProviderError(cause,'connection');return failure(selection,safe.status,safe.message,'connection',safe.diagnostic);}
 finally{key='';}
}
/** At most two model calls prove schema-valid invocation and consumption of a local, unpredictable tool result. */
export async function verifyModel(input:ModelRef,key:string,fetcher:typeof fetch=fetch):Promise<ModelVerification>{
 const selection=modelRefSchema.parse(input),blocked=prerequisite(selection,key,'tools');if(blocked)return blocked;
 const challenge=randomBytes(12).toString('hex'),receipt='FLOWPROOF_'+randomBytes(12).toString('hex');
 let executed=false,connected=false,stage:Stage='tool-call';
 try{
  const result=await generateText({
   model:resolveModel(selection,key,fetcher),maxRetries:0,abortSignal:AbortSignal.timeout(30_000),maxOutputTokens:1024,
   telemetry:{isEnabled:false,recordInputs:false,recordOutputs:false},
   tools:{capability_probe:tool({description:'A harmless local compatibility check. Return the exact supplied challenge.',inputSchema:z.object({challenge:z.string().min(1).max(64)}).strict(),execute:async args=>{if(args.challenge!==challenge)throw new Error('Challenge mismatch');executed=true;return {receipt};}})},
   prompt:`This is a bounded tool protocol check, with no browser or user data. Call capability_probe exactly once with challenge "${challenge}". After receiving its tool result, respond with exactly its receipt value and no other text. Do not invent the receipt.`,
   stopWhen:isStepCount(2),onStepFinish:()=>{connected=true;stage='tool-result';},
   prepareStep:({stepNumber})=>stepNumber===0?{toolChoice:'auto' as const}:{toolChoice:'none' as const}
  });
  const first=result.steps[0],last=result.steps[1],call=first?.toolCalls[0];
  // Surrounding prose is harmless; accepting a substring or invented/ambiguous receipt is not.
  const receipts=last?.text.match(/(?<![A-Za-z0-9_])FLOWPROOF_[a-f0-9]{24}(?![A-Za-z0-9_])/g)??[];
  const passed=executed&&result.steps.length===2&&first.toolCalls.length===1&&call?.toolName==='capability_probe'&&!call.invalid&&first.toolResults.length===1&&first.toolResults[0].toolCallId===call.toolCallId&&last.toolCalls.length===0&&receipts.length===1&&receipts[0]===receipt;
  if(!passed){
   const invalid=first?.toolCalls.find(t=>t.invalid);
   const diagnostic=invalid?classifyProviderError(invalid.error,'tool-call').diagnostic:{stage:executed?'tool-result':'tool-call',category:'tool-inconclusive'} as VerificationDiagnostic;
   return failure(selection,'capability-unverified',executed?'The model called the tool but did not unambiguously acknowledge its result. Agent compatibility remains unverified.':'The model responded without the required schema-valid tool call. Agent compatibility remains unverified.','tools',diagnostic,connected);
  }
  const checkedAt=new Date();
  return modelVerificationSchema.parse({...selection,status:'ready',phase:'tools',message:'A real schema-valid tool call and tool-result round trip passed. Runtime reliability is not guaranteed.',authenticated:true,connectivity:true,toolCalling:true,checkedAt:checkedAt.toISOString(),expiresAt:new Date(checkedAt.getTime()+300_000).toISOString()});
 }catch(cause){const safe=classifyProviderError(cause,stage);return failure(selection,safe.status,safe.message,'tools',safe.diagnostic,connected);}
 finally{key='';}
}
