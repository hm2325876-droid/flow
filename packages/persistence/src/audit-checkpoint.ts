import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {auditSnapshotSchema,terminalAuditStatuses,type AuditSnapshot} from '@flowproof/contracts';

/** One bounded current/last execution checkpoint, not a project/report history store. Main only. */
export class AuditCheckpoint {
 private file:string;
 constructor(private folder:string){this.file=path.join(folder,'audit-checkpoint.json');}
 async read():Promise<AuditSnapshot|null>{
  let data:unknown;try{data=JSON.parse(await readFile(this.file,'utf8'));}catch(cause){if((cause as NodeJS.ErrnoException).code==='ENOENT')return null;throw new Error('Audit checkpoint unavailable');}
  const state=auditSnapshotSchema.parse(data);
  // Historical configuration is display-only. Start always obtains new Main preflight/consent.
  if(!terminalAuditStatuses.has(state.status)){
   state.status='interrupted';state.owner='agent';state.question=null;state.endedAt=new Date().toISOString();state.reason='The previous application ended before execution could be finalized. No unfinished action is assumed complete.';
   if(state.events.length<1500)state.events.push({auditId:state.auditId,id:randomUUID(),seq:state.events.length+1,at:state.endedAt,type:'audit-interrupted',summary:state.reason});
   await this.save(state);
  }
  return state;
 }
 async save(input:AuditSnapshot){
  const state=auditSnapshotSchema.parse(input);
  await mkdir(this.folder,{recursive:true});
  // No answer payloads, secret references, provider keys, grants, cookies or model transcripts.
  const temporary=path.join(this.folder,'audit-checkpoint-'+randomUUID()+'.tmp');
  const safeFailure=(stage:'write'|'replace',cause:unknown)=>Object.assign(new Error('Audit checkpoint '+stage+' failed'),{stage,code:['EPERM','EBUSY','EACCES','ENOENT','ENOSPC'].includes((cause as NodeJS.ErrnoException).code??'')?(cause as NodeJS.ErrnoException).code:'IO_FAILURE'});
  try{
   try{await writeFile(temporary,JSON.stringify(state),'utf8');}catch(cause){throw safeFailure('write',cause);}
   // Windows scanners/readers can briefly lock an existing destination. Retry
   // the atomic replacement only; never repeat an audit/browser operation.
   for(let attempt=0;;attempt++){
    try{await rename(temporary,this.file);break;}catch(cause){
     const code=(cause as NodeJS.ErrnoException).code;
     if(attempt>=4||!['EPERM','EBUSY','EACCES'].includes(code??''))throw safeFailure('replace',cause);
     console.warn(JSON.stringify({event:'checkpoint-retry',stage:'replace',code,attempt:attempt+1}));
     await new Promise(resolve=>setTimeout(resolve,20*2**attempt));
    }
   }
  }finally{await unlink(temporary).catch(()=>{});}
 }
}
