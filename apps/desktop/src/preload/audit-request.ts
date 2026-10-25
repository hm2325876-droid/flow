import {auditCommandSchema,auditSnapshotSchema,type AuditCommand,type AuditSnapshot} from '@flowproof/contracts';
const messages:Record<string,string>={
 FLOWPROOF_AUDIT_ACTIVE:'An audit is already active. Return to its workspace.',
 FLOWPROOF_AUDIT_STORAGE:'The local audit checkpoint is unavailable. Check app data access and restart FlowProof.',
 FLOWPROOF_AUDIT_NOT_READY:'Audit readiness changed. Recheck the model, localhost target and explicit authorization.',
 FLOWPROOF_AUDIT_STALE:'This audit or question is no longer active. Return to the current workspace.',
 FLOWPROOF_AUDIT_ANSWER:'The answer does not match the pending question or has already been submitted.',
 FLOWPROOF_AUDIT_SECRET_TARGET:'Sensitive input requires an exact browser field. Use Take Control for this input; no secret was passed to the model.'
};
export async function requestAudit(input:unknown,invoke:(command:AuditCommand)=>Promise<unknown>):Promise<AuditSnapshot|null>{
 const parsed=auditCommandSchema.safeParse(input);if(!parsed.success)throw new Error('Invalid audit request. Check the requested fields.');
 let result:unknown;try{result=await invoke(parsed.data);}catch(cause){const raw=cause instanceof Error?cause.message:'';const code=Object.keys(messages).find(key=>raw.includes(key));throw new Error(code?messages[code]:'Internal desktop communication error. Return to the audit workspace and retry.');}
 if(result===null)return null;const value=auditSnapshotSchema.safeParse(result);if(!value.success)throw new Error('The desktop returned an invalid audit response. Restart FlowProof.');return value.data;
}
