import {describe,it,expect,vi} from 'vitest';
import {requestSetup} from '../src/preload/setup-request';
import {setupFailureMessage} from '../src/renderer/setup-errors';
import {defaultAuditDraft,supportedProviderDescriptors,setupBridgeErrorCodes,type SetupState} from '@flowproof/contracts';

const state:SetupState={catalog:null,catalogError:null,providers:supportedProviderDescriptors,selection:{providerId:'openai',modelId:'unit-model'},credentials:[],verification:null,draft:defaultAuditDraft,review:null,secureStorageAvailable:true,error:null};
describe('validated setup bridge failures',()=>{
 it('transmits staged checks without catalog metadata or credential retrieval',async()=>{
  for(const type of ['verify-connection','verify-tools'] as const){const invoke=vi.fn(async()=>state);await requestSetup({type},invoke,vi.fn());expect(invoke).toHaveBeenCalledWith({type});}
 });
 it('rejects a full catalog entry before IPC, retaining strict identifier-only selection',async()=>{
  const invoke=vi.fn(),report=vi.fn();
  const catalogEntry={providerId:'openai',modelId:'unit-model',name:'Unit metadata',providerName:'OpenAI',toolCall:true,adapterAvailable:true,api:'https://untrusted.invalid'};
  await expect(requestSetup({type:'select',selection:catalogEntry},invoke,report)).rejects.toThrow(setupBridgeErrorCodes.request);
  expect(invoke).not.toHaveBeenCalled();expect(report).toHaveBeenCalledWith({event:'setup-request-failed',stage:'request-validation',code:setupBridgeErrorCodes.request});
  await expect(requestSetup({type:'select',selection:{providerId:catalogEntry.providerId,modelId:catalogEntry.modelId}},async command=>{expect(command).toEqual({type:'select',selection:{providerId:'openai',modelId:'unit-model'}});return state;},report)).resolves.toEqual(state);
 });
 it('keeps new-key input on the validated trusted path and rejects unsafe responses without exposing it',async()=>{
  const key='unit-private-input-marker',report=vi.fn();
  await expect(requestSetup({type:'save-key',providerId:'openai',key},async command=>{expect(command).toEqual({type:'save-key',providerId:'openai',key});return state;},report)).resolves.toEqual(state);
  await expect(requestSetup({type:'save-key',providerId:'openai',key},async()=>({...state,key}),report)).rejects.toThrow(setupBridgeErrorCodes.response);
  expect(JSON.stringify(report.mock.calls)).not.toContain(key);
  expect(setupFailureMessage(new Error(setupBridgeErrorCodes.response))).toContain('invalid setup response');
 });
 it('sanitizes rejected IPC and raw exceptions while distinguishing communication from validation',async()=>{
  const report=vi.fn(),privateMarker='unit-private-error-marker';
  let caught:unknown;
  try{await requestSetup({type:'verify'},async()=>{throw new Error('Authorization: Bearer '+privateMarker);},report);}catch(cause){caught=cause;}
  expect(caught).toBeInstanceOf(Error);const error=caught as Error;
  expect(error.message).toBe(setupBridgeErrorCodes.communication);
  expect(report).toHaveBeenCalledWith({event:'setup-request-failed',stage:'desktop-ipc',code:setupBridgeErrorCodes.communication});
  expect(JSON.stringify(report.mock.calls)+setupFailureMessage(error)+setupFailureMessage(new Error(privateMarker))).not.toContain(privateMarker);
  expect(setupFailureMessage(error)).toContain('Internal desktop communication error');
  expect(setupFailureMessage(new Error(setupBridgeErrorCodes.request))).toContain('request format');
 });
});
