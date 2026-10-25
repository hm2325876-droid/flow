import {it,expect,vi} from 'vitest';
import {requestAudit} from '../src/preload/audit-request';
it('rejects privileged secret-reference injection before IPC and never forwards raw desktop errors',async()=>{
 const invoke=vi.fn();
 await expect(requestAudit({type:'answer',auditId:crypto.randomUUID(),questionId:crypto.randomUUID(),answer:{outcome:'answered',secretRef:crypto.randomUUID()}},invoke)).rejects.toThrow('Invalid audit request');expect(invoke).not.toHaveBeenCalled();
 await expect(requestAudit({type:'snapshot'},async()=>{throw new Error('Authorization: Bearer private-test-marker');})).rejects.toThrow('Internal desktop communication error');
 await expect(requestAudit({type:'snapshot'},async()=>{throw new Error('FLOWPROOF_AUDIT_ACTIVE');})).rejects.toThrow('already active');
 await expect(requestAudit({type:'snapshot'},async()=>({key:'private-test-marker'}))).rejects.toThrow('invalid audit response');
});
