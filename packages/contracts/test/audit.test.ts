import {describe,it,expect} from 'vitest';
import {auditCommandSchema,auditQuestionSchema,browserActionSchema,validateAuditAnswer,type AuditQuestion} from '../src/index';

const id='e80ab4e3-5715-43b0-9c19-7142e3e56a56';
const choice:AuditQuestion={id,kind:'single',prompt:'Choose the test path.',options:['First','Second'],required:true,allowSkip:false};
describe('audit tool and question boundaries',()=>{
 it('rejects executable code, raw selectors and ambiguous or oversized browser arguments',()=>{
  for(const input of [{kind:'evaluate',script:'alert(1)'},{kind:'click',locator:{by:'selector',value:'#target'}},{kind:'inspect',script:'secret'},{kind:'fill',locator:{by:'label',value:'Field'},value:'public',secretRef:id},{kind:'fill',locator:{by:'label',value:'Field'}},{kind:'scroll',direction:'down',amount:1501},{kind:'press',locator:{by:'label',value:'Field'},key:'Control+R'}])expect(browserActionSchema.safeParse(input).success).toBe(false);
  expect(browserActionSchema.parse({kind:'click',locator:{by:'role',role:'button',value:'Increment'}})).toEqual({kind:'click',locator:{by:'role',role:'button',value:'Increment'}});
 });
 it('keeps renderer answers reference-free and rejects extra authority and malformed audit identities',()=>{
  expect(auditCommandSchema.safeParse({type:'answer',auditId:id,questionId:id,answer:{outcome:'answered',secretRef:id}}).success).toBe(false);
  expect(auditCommandSchema.safeParse({type:'take-control',auditId:'old-audit'}).success).toBe(false);
  expect(auditCommandSchema.safeParse({type:'return-control',auditId:id,approved:true}).success).toBe(false);
  expect(auditCommandSchema.parse({type:'answer',auditId:id,questionId:id,answer:{outcome:'answered',values:['First']}}).type).toBe('answer');
 });
 it('requires declared single/multiple choices and respects counts, duplicates and skip policy',()=>{
  for(const values of [[],['First','Second'],['Other'],['First','First']])expect(validateAuditAnswer(choice,{outcome:'answered',values})).not.toBeNull();
  expect(validateAuditAnswer(choice,{outcome:'answered',values:['First']})).toBeNull();
  const multiple={...choice,kind:'multiple' as const,min:1,max:2};
  expect(validateAuditAnswer(multiple,{outcome:'answered',values:['First','Second']})).toBeNull();
  expect(validateAuditAnswer(multiple,{outcome:'answered',values:[]})).not.toBeNull();
  expect(validateAuditAnswer(choice,{outcome:'skipped'})).not.toBeNull();
  expect(validateAuditAnswer({...choice,allowSkip:true},{outcome:'skipped'})).toBeNull();
  expect(auditQuestionSchema.safeParse({...choice,operationId:id,options:['Approve','Deny'],allowSkip:true}).success).toBe(false);
 });
 it('validates required text, length, formats and an exact field for sensitive questions',()=>{
  const text={...choice,kind:'text' as const,options:undefined,max:10};
  expect(validateAuditAnswer(text,{outcome:'answered',text:' '})).not.toBeNull();
  expect(validateAuditAnswer(text,{outcome:'answered',text:'eleven-chars'})).not.toBeNull();
  expect(validateAuditAnswer({...text,format:'email',max:100},{outcome:'answered',text:'bad'})).not.toBeNull();
  expect(validateAuditAnswer({...text,format:'email',max:100},{outcome:'answered',text:'unit@example.test'})).toBeNull();
  expect(validateAuditAnswer({...text,format:'number'},{outcome:'answered',text:'NaN'})).not.toBeNull();
  expect(auditQuestionSchema.safeParse({...text,kind:'secret'}).success).toBe(false);
  expect(auditQuestionSchema.safeParse({...text,kind:'secret',target:{by:'label',value:'Test field'}}).success).toBe(true);
 });
});
