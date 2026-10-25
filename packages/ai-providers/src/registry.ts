import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {createOpenAICompatible} from '@ai-sdk/openai-compatible';
import {createDeepSeek} from '@ai-sdk/deepseek';
import {createGroq} from '@ai-sdk/groq';
import {modelRefSchema,supportedProviderDescriptors,type ModelRef,type RegisteredProvider} from '@flowproof/contracts';

const providers:RegisteredProvider[]=supportedProviderDescriptors.map(p=>({...p}));
export const registeredProviders=():RegisteredProvider[]=>providers.map(p=>({...p}));
const origins:Record<string,string>={openai:'https://api.openai.com',anthropic:'https://api.anthropic.com',google:'https://generativelanguage.googleapis.com',openrouter:'https://openrouter.ai',deepseek:'https://api.deepseek.com',groq:'https://api.groq.com'};

/** Registry code, never Models.dev fields, chooses endpoints and executable adapters. */
export function resolveModel(selection:ModelRef,key:string,fetcher:typeof fetch=fetch){
 const {providerId,modelId}=modelRefSchema.parse(selection);
 if(!providers.some(p=>p.id===providerId))throw new Error('Unsupported provider adapter');
 if(!/^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/.test(modelId)||modelId.split('/').some(s=>s==='.'||s==='..'))throw new Error('Unsupported model identifier');
 if(!key.trim()||key.length>4096||/[\r\n\u0000]/.test(key))throw new Error('Invalid credential input');
 const safeFetch:typeof fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(url.origin!==origins[providerId]||url.username||url.password)throw new Error('Provider endpoint rejected');
  return fetcher(input,{...init,redirect:'error'});
 };
 const settings={apiKey:key,fetch:safeFetch};
 switch(providerId){
  case 'openai':return createOpenAI({...settings,baseURL:'https://api.openai.com/v1'}).chat(modelId);
  case 'anthropic':return createAnthropic({...settings,baseURL:'https://api.anthropic.com/v1'})(modelId);
  case 'google':return createGoogleGenerativeAI({...settings,baseURL:'https://generativelanguage.googleapis.com/v1beta'})(modelId);
  case 'openrouter':return createOpenAICompatible({...settings,name:'openrouter',baseURL:'https://openrouter.ai/api/v1'})(modelId);
  case 'deepseek':return createDeepSeek({...settings,baseURL:'https://api.deepseek.com'})(modelId);
  case 'groq':return createGroq({...settings,baseURL:'https://api.groq.com/openai/v1'})(modelId);
  default:throw new Error('Unsupported provider adapter');
 }
}
