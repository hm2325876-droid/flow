import {z} from 'zod';

export const setupBridgeErrorCodes={request:'FLOWPROOF_SETUP_REQUEST_INVALID',communication:'FLOWPROOF_SETUP_COMMUNICATION_FAILED',response:'FLOWPROOF_SETUP_RESPONSE_INVALID'} as const;

export const providerIdSchema=z.string().min(1).max(100).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
export const modelIdSchema=z.string().min(1).max(300).refine(s=>!/[\u0000-\u0020\u007f\\?#]/.test(s)&&!s.includes('://')&&!s.split('/').some(part=>part==='.'||part==='..'),'Use an exact provider model identifier, not a URL or path traversal');
export const modelRefSchema=z.object({providerId:providerIdSchema,modelId:modelIdSchema}).strict();
export type ModelRef=z.infer<typeof modelRefSchema>;
const capability=z.boolean().nullable();
const limit=z.number().finite().nonnegative().nullable();
export const catalogModelSchema=modelRefSchema.extend({providerName:z.string().max(200),name:z.string().max(300),toolCall:capability,structuredOutput:capability,reasoning:capability,inputModalities:z.array(z.string().max(40)).max(20),outputModalities:z.array(z.string().max(40)).max(20),contextLimit:limit,outputLimit:limit,inputPrice:limit,outputPrice:limit,adapterAvailable:z.boolean()}).strict();
export type CatalogModel=z.infer<typeof catalogModelSchema>;
export const catalogProviderSchema=z.object({id:providerIdSchema,name:z.string().max(200),modelCount:z.number().int().nonnegative(),adapterAvailable:z.boolean()}).strict();
export type CatalogProvider=z.infer<typeof catalogProviderSchema>;
export const catalogSnapshotSchema=z.object({fetchedAt:z.string().datetime(),source:z.enum(['network','cache']),stale:z.boolean(),warning:z.string().max(300).nullable(),models:z.array(catalogModelSchema).max(50000),providers:z.array(catalogProviderSchema).max(2000).optional()}).strict();
export type CatalogSnapshot=z.infer<typeof catalogSnapshotSchema>;
export const verificationDiagnosticSchema=z.object({stage:z.enum(['connection','tool-call','tool-result','response-validation','transport','adapter']),category:z.enum(['authentication','quota','model-unavailable','rate-limited','provider-unavailable','timeout','tool-unsupported','tool-inconclusive','invalid-response','network','adapter-unavailable','missing-key','internal']),httpStatus:z.number().int().min(100).max(599).optional(),sdkError:z.enum(['AI_APICallError','AI_JSONParseError','AI_TypeValidationError','AI_InvalidResponseDataError','AI_InvalidToolInputError','AI_NoSuchToolError','AI_ToolChoiceViolationError','AI_ToolExecutionError','AI_UnsupportedFunctionalityError','AI_NoSuchModelError','AI_NoOutputGeneratedError','AI_EmptyResponseBodyError','AI_MessageConversionError','AI_InvalidPromptError','AI_RetryError','TimeoutError','AbortError','TypeError']).optional()}).strict();
export type VerificationDiagnostic=z.infer<typeof verificationDiagnosticSchema>;
export const verificationStatusSchema=z.enum(['connected','ready','missing-key','authentication','adapter-unavailable','model-unavailable','network','rate-limited','quota','timeout','capability-unavailable','capability-unverified','response-invalid','desktop-communication']);
export const modelVerificationSchema=modelRefSchema.extend({status:verificationStatusSchema,message:z.string().max(300),connectivity:z.boolean(),toolCalling:z.boolean(),checkedAt:z.string().datetime(),expiresAt:z.string().datetime().nullable(),authenticated:z.boolean().optional(),phase:z.enum(['connection','tools']).optional(),diagnostic:verificationDiagnosticSchema.optional()}).strict();
export type ModelVerification=z.infer<typeof modelVerificationSchema>;
export const registeredProviderSchema=z.object({id:providerIdSchema,name:z.string().max(100),adapter:z.string().max(100)}).strict();
export type RegisteredProvider=z.infer<typeof registeredProviderSchema>;
// Application-owned registrations; never populated from catalog npm/api fields.
export const supportedProviderDescriptors:RegisteredProvider[]=[
 {id:'openai',name:'OpenAI',adapter:'@ai-sdk/openai'},
 {id:'anthropic',name:'Anthropic',adapter:'@ai-sdk/anthropic'},
 {id:'google',name:'Google Gemini',adapter:'@ai-sdk/google'},
 {id:'openrouter',name:'OpenRouter',adapter:'@ai-sdk/openai-compatible'},
 {id:'deepseek',name:'DeepSeek',adapter:'@ai-sdk/deepseek'},
 {id:'groq',name:'Groq',adapter:'@ai-sdk/groq'}
];
export const auditDraftSchema=z.object({projectName:z.string().max(120),goal:z.string().max(4000),context:z.string().max(6000),port:z.string().max(5).regex(/^\d*$/),path:z.string().max(2048),maxSteps:z.number().int().min(1).max(1000),timeoutMinutes:z.number().int().min(1).max(60),step:z.number().int().min(1).max(3).optional()}).strict();
export type AuditDraft=z.infer<typeof auditDraftSchema>;
export const defaultAuditDraft:AuditDraft={projectName:'',goal:'',context:'',port:'3000',path:'/',maxSteps:40,timeoutMinutes:10};
export const auditTargetUrlSchema=z.string().url().max(2200).refine(value=>{try{const url=new URL(value);return url.protocol==='http:'&&url.hostname==='localhost'&&!url.username&&!url.password;}catch{return false;}},'Audit targets must use the authorized HTTP localhost host');
export const auditHandoffSchema=z.object({schemaVersion:z.literal(1),selection:modelRefSchema,projectName:z.string().trim().min(1).max(120),goal:z.string().trim().min(1).max(4000),context:z.string().max(6000),targetUrl:auditTargetUrlSchema,maxSteps:z.number().int().min(1).max(1000),timeoutMinutes:z.number().int().min(1).max(60),authorizedAt:z.string().datetime(),checkedAt:z.string().datetime(),providerValidatedAt:z.string().datetime(),expiresAt:z.string().datetime()}).strict();
export type AuditHandoff=z.infer<typeof auditHandoffSchema>;
export const readinessCheckSchema=z.object({id:z.enum(['fields','target','adapter','credentials','model','budgets','availability','authorization']),status:z.enum(['passed','failed']),message:z.string().max(300)}).strict();
export const auditReadinessSchema=z.object({ready:z.boolean(),checks:z.array(readinessCheckSchema).max(8),handoff:auditHandoffSchema.nullable()}).strict();
export type AuditReadiness=z.infer<typeof auditReadinessSchema>;
export const credentialStatusSchema=z.object({providerId:providerIdSchema,status:z.enum(['configured','missing','invalid','verification-required'])}).strict();
export const setupStateSchema=z.object({catalog:catalogSnapshotSchema.nullable(),catalogError:z.string().max(300).nullable(),providers:z.array(registeredProviderSchema).max(100),selection:modelRefSchema.nullable(),credentials:z.array(credentialStatusSchema).max(100),verification:modelVerificationSchema.nullable(),connection:modelVerificationSchema.nullable().optional(),draft:auditDraftSchema,review:auditReadinessSchema.nullable(),secureStorageAvailable:z.boolean(),error:z.string().max(300).nullable()}).strict();
export type SetupState=z.infer<typeof setupStateSchema>;
export const setupCommandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('load')}).strict(),
 z.object({type:z.literal('catalog'),refresh:z.boolean().default(false)}).strict(),
 z.object({type:z.literal('select'),selection:modelRefSchema}).strict(),
 z.object({type:z.literal('save-key'),providerId:providerIdSchema,key:z.string().trim().min(1).max(4096).refine(s=>!/[\r\n\u0000]/.test(s))}).strict(),
 z.object({type:z.literal('remove-key'),providerId:providerIdSchema}).strict(),
 z.object({type:z.literal('verify')}).strict(),
 z.object({type:z.literal('verify-connection')}).strict(),
 z.object({type:z.literal('verify-tools')}).strict(),
 z.object({type:z.literal('save-draft'),draft:auditDraftSchema}).strict(),
 z.object({type:z.literal('dismiss')}).strict(),
 z.object({type:z.literal('review'),draft:auditDraftSchema,authorized:z.boolean()}).strict(),
 z.object({type:z.literal('prepare'),draft:auditDraftSchema,authorized:z.boolean()}).strict()
]);
export type SetupCommand=z.infer<typeof setupCommandSchema>;
export const providerUtilityCommandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('catalog'),cache:catalogSnapshotSchema.nullable(),refresh:z.boolean()}).strict(),
 z.object({type:z.literal('verify'),selection:modelRefSchema,key:z.string().min(1).max(4096),phase:z.enum(['connection','tools']).optional()}).strict()
]);
