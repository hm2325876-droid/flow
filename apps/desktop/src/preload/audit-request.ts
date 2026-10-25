import {auditCommandSchema,auditSnapshotSchema,type AuditCommand,type AuditSnapshot} from '@flowproof/contracts';
export class AuditRequestError extends Error{constructor(message:string){super(`FLOWPROOF_SAFE_AUDIT_ERROR:${message}`);this.name='FlowProofAuditError';}}
const messages:Record<string,string>={
 FLOWPROOF_AUDIT_ACTIVE:'An audit is already active. Return to its workspace.',
 FLOWPROOF_AUDIT_STORAGE:'The local audit checkpoint is unavailable. Check app data access and restart FlowProof.',
 FLOWPROOF_AUDIT_NOT_READY:'Audit readiness changed. Recheck the model, localhost target and explicit authorization.',
 FLOWPROOF_AUDIT_STALE:'This audit or question is no longer active. Return to the current workspace.',
 FLOWPROOF_AUDIT_ANSWER:'The answer does not match the pending question or has already been submitted.',
 FLOWPROOF_AUDIT_SECRET_TARGET:'Sensitive input requires an exact browser field. Use Take Control for this input; no secret was passed to the model.',
 FLOWPROOF_AUDIT_SETUP:'The audit setup could not be saved or revalidated. Check local app-data access, then retry readiness checks.',
 FLOWPROOF_AUDIT_TARGET:'The authorized localhost page or native browser session could not be opened. Confirm the exact port/path is reachable and retry.',
 FLOWPROOF_AUDIT_VIEWPORT:'The browser view is still being laid out. Keep the audit setup open, wait for the browser area to appear, then retry.',
 FLOWPROOF_AUDIT_MODEL:'The selected model or its protected key could not be revalidated. Recheck connectivity and tool compatibility; the saved key was not changed.',
 FLOWPROOF_AUDIT_MODEL_START:'The selected AI SDK model could not be initialized. Recheck the selected model and adapter, then retry.',
 FLOWPROOF_AUDIT_RUNTIME:'The supervised audit runtime is unavailable. Restart FlowProof and retry after the runtime reports ready.'
};
export async function requestAudit(input:unknown,invoke:(command:AuditCommand)=>Promise<unknown>):Promise<AuditSnapshot|null>{
 const parsed=auditCommandSchema.safeParse(input);if(!parsed.success)throw new AuditRequestError('Invalid audit request. Check the requested fields.');
 let result:unknown;try{result=await invoke(parsed.data);}catch(cause){const raw=cause instanceof Error?cause.message:'';const code=Object.keys(messages).sort((a,b)=>b.length-a.length).find(key=>raw.includes(key));throw new AuditRequestError(code?messages[code]:'Internal desktop communication error. Return to the audit workspace and retry.');}
 if(result===null)return null;const value=auditSnapshotSchema.safeParse(result);if(!value.success)throw new AuditRequestError('The desktop returned an invalid audit response. Restart FlowProof.');return value.data;
}
