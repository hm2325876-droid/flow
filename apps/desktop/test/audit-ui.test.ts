import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {auditSnapshotSchema,validateAuditAnswer,type AuditSnapshot,type AuditQuestion} from '@flowproof/contracts';
import {acceptAuditSnapshot,auditElapsed,auditIsActive,orderedAuditEvents} from '../src/renderer/audit-view';
import {AuditFeed,AuditTodos,AuditCandidates,QuestionCard} from '../src/renderer/AuditWorkspace';

const at='2026-10-25T12:00:00.000Z',auditId='f9c6bf4d-2cbe-45d3-83b1-a6dba89d4561',actionId='c3e64eaf-3106-48c3-a021-c535a80f829a';
function snapshot():AuditSnapshot{return auditSnapshotSchema.parse({auditId,config:{schemaVersion:1,selection:{providerId:'openai',modelId:'original/model-id'},projectName:'Local interaction check',goal:'Check the increment interaction.',context:'',targetUrl:'http://localhost:3000/',maxSteps:40,timeoutMinutes:10,authorizedAt:at,checkedAt:at,providerValidatedAt:at,expiresAt:'2026-10-25T12:05:00.000Z'},status:'running',owner:'agent',events:[{auditId,id:'a395566a-2448-4fea-bf26-711ebf90d130',seq:1,at,type:'action-completed',summary:'Observed the button counter change.',actionId}],todos:[{id:'counter',description:'Check the counter interaction',status:'completed',createdAt:at,updatedAt:at,evidence:[actionId]}],question:null,candidates:[],usage:{modelCalls:2,browserActions:2,inputTokens:null,outputTokens:null,retries:0,browserRecoveries:0,cost:null},startedAt:at,endedAt:null,reason:null});}

describe('audit workspace displays trusted runtime state',()=>{
 it('orders and deduplicates events and rejects late snapshots for the current or older audit',()=>{
  const current=snapshot(),second={...current.events[0],id:'8755306f-bcff-4e02-8b5d-1f59ceec08a3',seq:2,summary:'Actual later observation.'};
  expect(orderedAuditEvents([second,current.events[0],second]).map(e=>e.seq)).toEqual([1,2]);
  const newer={...current,events:[current.events[0],second]};expect(acceptAuditSnapshot(newer,current)).toBe(newer);
  expect(acceptAuditSnapshot(newer,{...current,auditId:'cbd351f4-e9ed-439d-b634-a673f402f46e',startedAt:'2026-10-24T12:00:00.000Z'})).toBe(newer);
  expect(acceptAuditSnapshot(current,{...newer,events:[second,current.events[0],second]})?.events).toHaveLength(2);
 });
 it('keeps waiting, ownership and recovery states active and renders only recorded operations',()=>{
  const audit=snapshot();for(const status of ['awaiting-input','user-control','reconnecting','browser-recovering','handoff-pending'] as const)expect(auditIsActive({...audit,status})).toBe(true);
  for(const status of ['completed','blocked','interrupted'] as const)expect(auditIsActive({...audit,status})).toBe(false);
  const html=renderToStaticMarkup(createElement(AuditFeed,{audit,onAnswer:async()=>false}));
  expect(html).toContain('Observed the button counter change.');expect(html.match(/data-audit-event="true"/g)).toHaveLength(1);
  expect(html).toContain('2/40');expect(html).toContain('cost unavailable');expect(html).not.toContain('thinking');expect(html).not.toContain('textarea');
  expect(auditElapsed({...audit,endedAt:'2026-10-25T12:01:07.000Z'})).toBe('1:07');
 });
 it('shows the runtime TODO status and references without inventing progress or verified findings',()=>{
  const audit=snapshot(),todos=renderToStaticMarkup(createElement(AuditTodos,{audit}));
  expect(todos).toContain('data-todo-status="completed"');expect(todos).toContain('1 action reference');expect(todos).toContain('Check the counter interaction');
  const candidates=renderToStaticMarkup(createElement(AuditCandidates,{audit:{...audit,candidates:[{id:'e9d64e2b-c73d-45e8-be58-c929242615c0',title:'<img src=x onerror=alert(1)>',observation:'Potential missing feedback.',actionIds:[actionId]}]}}));
  expect(candidates).toContain('Unverified candidate');expect(candidates).toContain('&lt;img');expect(candidates).not.toContain('<img src=x');expect(candidates).toContain('Slice 4');
 });
 it('starts approval choices unselected, forbids implicit Skip and masks declared sensitive input',()=>{
  const permission:AuditQuestion={id:'e7d5fd4b-3abf-4ec2-92a4-d7577cc0eaa2',kind:'single',prompt:'Approve this exact eligible operation?',options:['Approve','Deny'],required:true,allowSkip:false,operationId:actionId};
  const html=renderToStaticMarkup(createElement(QuestionCard,{question:permission,onAnswer:async()=>false}));
  expect(html).not.toContain('checked=""');expect(html).not.toContain('data-question-skip');expect(html).toContain('ONE-OPERATION PERMISSION');
  expect(validateAuditAnswer(permission,{outcome:'answered',values:[]})).toContain('exactly one');expect(validateAuditAnswer(permission,{outcome:'skipped'})).toContain('cannot be skipped');
  const secret:AuditQuestion={id:permission.id,kind:'secret',prompt:'Enter the value for this field.',required:true,allowSkip:false,target:{by:'label',value:'Test field'}};
  const masked=renderToStaticMarkup(createElement(QuestionCard,{question:secret,onAnswer:async()=>false}));expect(masked).toContain('type="password"');expect(masked).toContain('autoComplete="off"');expect(masked).toContain('value=""');expect(masked).not.toContain('textarea');
 });
});
