import {describe,it,expect} from 'vitest';
import {auditTargetUrlSchema,modelRefSchema,auditDraftSchema,defaultAuditDraft,setupCommandSchema,modelVerificationSchema} from '../src/index';
describe('Slice 2 handoff boundary',()=>{
 it('rejects public targets and authority-bearing drafts before future Agent Core consumption',()=>{
  expect(auditTargetUrlSchema.safeParse('http://localhost:3000/example?q=1').success).toBe(true);
  for(const url of ['https://localhost:3000/','http://example.com/','http://127.0.0.1:3000/','http://user:password@localhost:3000/'])expect(auditTargetUrlSchema.safeParse(url).success).toBe(false);
  expect(auditDraftSchema.safeParse({...defaultAuditDraft,authorized:true}).success).toBe(false);
  for(const modelId of ['../escape','vendor/../escape','model?key=secret','model#suffix','https://elsewhere.invalid/model'])expect(modelRefSchema.safeParse({providerId:'openai',modelId}).success).toBe(false);
 });
 it('preserves original identifiers and distinguishes staged verification contracts',()=>{
  const selection={providerId:'openrouter',modelId:'vendor/Original-Model:free'};
  expect(modelRefSchema.parse(selection)).toEqual(selection);
  expect(modelRefSchema.safeParse({...selection,modelId:' '+selection.modelId}).success).toBe(false);
  expect(setupCommandSchema.parse({type:'verify-connection'})).toEqual({type:'verify-connection'});
  expect(setupCommandSchema.parse({type:'verify-tools'})).toEqual({type:'verify-tools'});
  expect(modelVerificationSchema.safeParse({...selection,status:'response-invalid',phase:'connection',message:'Safe fixed message',connectivity:false,toolCalling:false,checkedAt:new Date().toISOString(),expiresAt:null,diagnostic:{stage:'response-validation',category:'invalid-response',httpStatus:200,sdkError:'AI_TypeValidationError',body:'secret'}}).success).toBe(false);
 });
});
