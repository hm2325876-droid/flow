import {z} from 'zod';
import {auditDraftSchema,auditHandoffSchema} from './setup';

export const locatorSchema=z.object({by:z.enum(['role','label','testId','text']),value:z.string().trim().min(1).max(200),role:z.string().min(1).max(40).optional()}).strict().superRefine((l,c)=>{if(l.by==='role'&&!l.role)c.addIssue({code:'custom',message:'A role locator needs an accessible role'});});
export type Locator=z.infer<typeof locatorSchema>;
export const browserActionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('inspect')}).strict(),
 z.object({kind:z.literal('navigate'),url:z.string().url().max(2200)}).strict(),
 z.object({kind:z.literal('click'),locator:locatorSchema}).strict(),
 z.object({kind:z.literal('fill'),locator:locatorSchema,value:z.string().max(2000).optional(),secretRef:z.string().uuid().optional()}).strict().refine(a=>(a.value!==undefined)!==(a.secretRef!==undefined),'Supply either public text or a secret reference'),
 z.object({kind:z.literal('select'),locator:locatorSchema,values:z.array(z.string().max(200)).min(1).max(10)}).strict(),
 z.object({kind:z.literal('press'),locator:locatorSchema,key:z.enum(['Enter','Tab','Escape','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Space','Backspace'])}).strict(),
 z.object({kind:z.literal('scroll'),direction:z.enum(['up','down']),amount:z.number().int().min(1).max(1500)}).strict(),
 z.object({kind:z.literal('wait'),locator:locatorSchema,state:z.enum(['visible','hidden'])}).strict(),
 z.object({kind:z.literal('capture')}).strict()
]);
export type BrowserAction=z.infer<typeof browserActionSchema>;
export const browserObservationSchema=z.object({url:z.string().max(2200),title:z.string().max(300),text:z.string().max(12000),elements:z.array(z.object({role:z.string().max(40),name:z.string().max(200),type:z.string().max(40).optional(),value:z.string().max(200).optional(),testId:z.string().max(200).optional()}).strict()).max(80)}).strict();
export type BrowserObservation=z.infer<typeof browserObservationSchema>;
export const browserOutcomeSchema=z.object({ok:z.boolean(),code:z.enum(['ok','scope','invalid','not-found','timeout','browser-unavailable','policy','unknown','approval-required']),summary:z.string().max(500),observation:browserObservationSchema.optional(),approvalId:z.string().uuid().optional(),artifactId:z.string().uuid().optional(),screenshot:z.string().max(12000000).optional(),screenshotBytes:z.number().int().nonnegative().optional()}).strict();
export type BrowserOutcome=z.infer<typeof browserOutcomeSchema>;
export const browserOwnerSchema=z.enum(['agent','pending','user','decision']);
export type BrowserOwner=z.infer<typeof browserOwnerSchema>;
export const auditStatusSchema=z.enum(['preparing','running','awaiting-input','handoff-pending','user-control','awaiting-control-decision','reconnecting','browser-recovering','terminating','completed','blocked','interrupted']);
export type AuditStatus=z.infer<typeof auditStatusSchema>;
export const terminalAuditStatuses=new Set<AuditStatus>(['completed','blocked','interrupted']);
export const auditEventSchema=z.object({auditId:z.string().uuid(),id:z.string().uuid(),seq:z.number().int().positive(),at:z.string().datetime(),type:z.enum(['audit-started','target-loaded','page-inspected','plan-updated','todo-updated','action-requested','action-completed','action-failed','observation','input-requested','input-received','control-requested','control-transferred','recovery','candidate','usage','audit-completed','audit-blocked','audit-interrupted','state-changed']),summary:z.string().max(600),actionId:z.string().uuid().optional(),details:z.string().max(2000).optional()}).strict();
export type AuditEvent=z.infer<typeof auditEventSchema>;
export const auditTodoSchema=z.object({id:z.string().min(1).max(80),description:z.string().min(1).max(250),status:z.enum(['pending','in-progress','completed','blocked','skipped']),createdAt:z.string().datetime(),updatedAt:z.string().datetime(),evidence:z.array(z.string().uuid()).max(20)}).strict();
export type AuditTodo=z.infer<typeof auditTodoSchema>;
export const auditQuestionSchema=z.object({id:z.string().uuid(),kind:z.enum(['single','multiple','text','secret']),prompt:z.string().trim().min(1).max(600),options:z.array(z.string().min(1).max(160)).min(2).max(8).optional(),required:z.boolean(),allowSkip:z.boolean(),min:z.number().int().min(0).max(8).optional(),max:z.number().int().min(1).max(4096).optional(),format:z.enum(['text','email','number']).optional(),target:locatorSchema.optional(),operationId:z.string().uuid().optional()}).strict().superRefine((q,c)=>{if(q.options&&new Set(q.options).size!==q.options.length)c.addIssue({code:'custom',message:'Options must be unique'});if(q.min!==undefined&&q.max!==undefined&&q.min>q.max)c.addIssue({code:'custom',message:'Question bounds are invalid'});if(['single','multiple'].includes(q.kind)&&!q.options)c.addIssue({code:'custom',message:'Choices require declared options'});if(q.kind==='secret'&&!q.target)c.addIssue({code:'custom',message:'Sensitive input needs an exact browser field'});if(q.operationId&&(q.kind!=='single'||q.allowSkip||q.options?.join('|')!=='Approve|Deny'))c.addIssue({code:'custom',message:'Operation permission requires explicit Approve or Deny'});});
export type AuditQuestion=z.infer<typeof auditQuestionSchema>;
export const auditAnswerSchema=z.object({outcome:z.enum(['answered','skipped']),values:z.array(z.string().max(160)).max(8).optional(),text:z.string().max(4096).optional(),sensitive:z.boolean().optional(),secretRef:z.string().uuid().optional()}).strict();
export type AuditAnswer=z.infer<typeof auditAnswerSchema>;
export function validateAuditAnswer(q:AuditQuestion,a:AuditAnswer):string|null{
 if(a.outcome==='skipped')return q.allowSkip&&!q.operationId?null: 'This question cannot be skipped.';
 if(a.outcome!=='answered')return 'Choose an answer.';
 if(q.kind==='single'||q.kind==='multiple'){const values=a.values??[];if(a.text!==undefined||a.secretRef||new Set(values).size!==values.length||values.some(v=>!q.options?.includes(v)))return 'Choose only declared options.';if(q.kind==='single'&&values.length!==1)return 'Choose exactly one option.';if(q.kind==='multiple'&&(values.length<(q.min??(q.required?1:0))||values.length>(q.max??q.options!.length)))return 'Choose the permitted number of options.';return null;}
 if(a.values)return 'Enter the requested text.';
 if(a.secretRef)return null;
 const value=a.text??'';if(q.required&&!value.trim())return 'An answer is required.';if(value.length>(q.max??2000))return 'The answer is too long.';
 if(q.format==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return 'Enter a valid email.';
 if(q.format==='number'&&value&&!Number.isFinite(Number(value)))return 'Enter a valid number.';
 return null;
}
export const auditSnapshotSchema=z.object({auditId:z.string().uuid(),config:auditHandoffSchema,status:auditStatusSchema,owner:browserOwnerSchema,events:z.array(auditEventSchema).max(1500),todos:z.array(auditTodoSchema).max(40),question:auditQuestionSchema.nullable(),candidates:z.array(z.object({id:z.string().uuid(),title:z.string().max(200),observation:z.string().max(1000),actionIds:z.array(z.string().uuid()).min(1).max(20)}).strict()).max(40),usage:z.object({modelCalls:z.number().int().nonnegative(),browserActions:z.number().int().nonnegative(),inputTokens:z.number().int().nonnegative().nullable(),outputTokens:z.number().int().nonnegative().nullable(),retries:z.number().int().nonnegative(),browserRecoveries:z.number().int().nonnegative(),cost:z.null()}).strict(),startedAt:z.string().datetime(),endedAt:z.string().datetime().nullable(),reason:z.string().max(600).nullable()}).strict();
export type AuditSnapshot=z.infer<typeof auditSnapshotSchema>;
export const auditCommandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('snapshot')}).strict(),
 z.object({type:z.literal('start'),draft:auditDraftSchema,authorized:z.boolean()}).strict(),
 z.object({type:z.literal('answer'),auditId:z.string().uuid(),questionId:z.string().uuid(),answer:auditAnswerSchema.omit({secretRef:true})}).strict(),
 z.object({type:z.literal('take-control'),auditId:z.string().uuid()}).strict(),
 z.object({type:z.literal('return-control'),auditId:z.string().uuid()}).strict()
]);
export type AuditCommand=z.infer<typeof auditCommandSchema>;
export const auditServiceSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('lease'),actionId:z.string().uuid(),action:browserActionSchema}).strict(),
 z.object({type:z.literal('release'),actionId:z.string().uuid(),known:z.boolean().default(true)}).strict(),
 z.object({type:z.literal('secret'),actionId:z.string().uuid(),secretRef:z.string().uuid(),locator:locatorSchema}).strict(),
 z.object({type:z.literal('recover'),owner:browserOwnerSchema}).strict(),
 z.object({type:z.literal('owner'),owner:browserOwnerSchema}).strict(),
 z.object({type:z.literal('artifact'),data:z.string().max(12000000),bytes:z.number().int().positive()}).strict()
]);
export type AuditService=z.infer<typeof auditServiceSchema>;
