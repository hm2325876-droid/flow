import {z} from 'zod';
export * from './setup';
import {providerUtilityCommandSchema,type SetupCommand,type SetupState} from './setup';
export const targetSchema=z.object({port:z.number().int().min(1).max(65535),path:z.string().max(2048).refine(p=>p.startsWith('/')&&!p.startsWith('//')&&!/[\\\u0000-\u0020]/.test(p),'Use a local path beginning with /'),consent:z.literal(true)}).strict();
export const slotSchema=z.object({x:z.number().finite().min(0),y:z.number().finite().min(0),width:z.number().finite().min(0).max(10000),height:z.number().finite().min(0).max(10000),visible:z.boolean()}).strict();
export type Target=z.infer<typeof targetSchema>;
export type Slot=z.infer<typeof slotSchema>;
export const connectionSchema=z.object({endpoint:z.string().regex(/^ws:\/\/127\.0\.0\.1:\d+\/audit$/),token:z.string().regex(/^[a-f0-9]{64}$/),targetId:z.string().min(1),origin:z.string().url()}).strict();
export type Connection=z.infer<typeof connectionSchema>;
export const utilityCommandSchema=z.discriminatedUnion('type',[
  z.object({id:z.number().int().positive(),type:z.literal('connect'),connection:connectionSchema}).strict(),
  z.object({id:z.number().int().positive(),type:z.literal('check'),url:z.string().url(),marker:z.string().min(1).max(64),holdMs:z.number().int().min(0).max(5000).default(0)}).strict(),
  z.object({id:z.number().int().positive(),type:z.literal('close')}).strict()
  ,z.object({id:z.number().int().positive(),type:z.literal('provider'),command:providerUtilityCommandSchema}).strict()
]);
export const checkResultSchema=z.object({url:z.string().url(),targetId:z.string(),value:z.string(),counter:z.number().int(),marker:z.string(),screenshot:z.string().max(12_000_000),screenshotBytes:z.number().int().positive(),frameTicks:z.number().int().nonnegative()}).strict();
export type CheckResult=z.infer<typeof checkResultSchema>;
export const utilityReplySchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('ready'),pid:z.number().int().positive()}).strict(),
  z.object({type:z.literal('reply'),id:z.number().int().positive(),ok:z.boolean(),result:z.unknown().optional(),error:z.string().max(200).optional()}).strict()
]);
export const desktopStateSchema=z.object({version:z.string(),utility:z.enum(['starting','ready','unavailable']),connected:z.boolean(),busy:z.boolean(),url:z.string(),diagnostic:z.boolean(),status:z.string(),error:z.string().nullable(),check:z.object({value:z.string(),counter:z.number(),sameSession:z.boolean(),screenshotBytes:z.number(),artifactId:z.string()}).nullable()}).strict();
export type DesktopState=z.infer<typeof desktopStateSchema>;
export interface DesktopAPI {
  setup(command:SetupCommand):Promise<SetupState>;
  state():Promise<DesktopState>;
  connect(target:Target):Promise<DesktopState>;
  validation():Promise<DesktopState>;
  check():Promise<DesktopState>;
  disconnect():Promise<DesktopState>;
  slot(bounds:Slot):Promise<void>;
  onState(listener:(state:DesktopState)=>void):()=>void;
}
export const channels={state:'flowproof:state',connect:'flowproof:connect',validation:'flowproof:validation',check:'flowproof:check',disconnect:'flowproof:disconnect',slot:'flowproof:slot',changed:'flowproof:changed',setup:'flowproof:setup'} as const;
