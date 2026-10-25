import {describe,it,expect} from 'vitest';
import {auditTargetUrlSchema,modelRefSchema,auditDraftSchema,defaultAuditDraft} from '../src/index';
describe('Slice 2 handoff boundary',()=>{
 it('rejects public targets and authority-bearing drafts before future Agent Core consumption',()=>{
  expect(auditTargetUrlSchema.safeParse('http://localhost:3000/example?q=1').success).toBe(true);
  for(const url of ['https://localhost:3000/','http://example.com/','http://127.0.0.1:3000/','http://user:password@localhost:3000/'])expect(auditTargetUrlSchema.safeParse(url).success).toBe(false);
  expect(auditDraftSchema.safeParse({...defaultAuditDraft,authorized:true}).success).toBe(false);
  for(const modelId of ['../escape','vendor/../escape','model?key=secret','model#suffix','https://elsewhere.invalid/model'])expect(modelRefSchema.safeParse({providerId:'openai',modelId}).success).toBe(false);
 });
});
