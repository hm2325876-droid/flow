import {terminalAuditStatuses,type AuditEvent,type AuditSnapshot,type AuditStatus} from '@flowproof/contracts';

export const auditStatusLabel=(status:AuditStatus)=>({preparing:'Preparing',running:'Running','awaiting-input':'Awaiting input','handoff-pending':'Handoff pending','user-control':'You are in control','awaiting-control-decision':'Control decision needed',reconnecting:'Reconnecting','browser-recovering':'Browser recovering',terminating:'Terminating',completed:'Completed',blocked:'Blocked',interrupted:'Interrupted'})[status];
export const auditIsActive=(audit:AuditSnapshot|null|undefined)=>Boolean(audit&&!terminalAuditStatuses.has(audit.status));
export function orderedAuditEvents(events:AuditEvent[]){
 const unique=new Map<number,AuditEvent>();for(const event of events)if(!unique.has(event.seq))unique.set(event.seq,event);
 return [...unique.values()].sort((a,b)=>a.seq-b.seq);
}
/** Full snapshots replace state; late snapshot replies cannot roll the feed backwards. */
export function acceptAuditSnapshot(current:AuditSnapshot|null,next:AuditSnapshot|null):AuditSnapshot|null{
 if(!next)return current;
 if(!current)return {...next,events:orderedAuditEvents(next.events)};
 if(current.auditId!==next.auditId)return Date.parse(next.startedAt)<Date.parse(current.startedAt)?current:{...next,events:orderedAuditEvents(next.events)};
 const previous=current.events.at(-1)?.seq??0,sequence=Math.max(0,...next.events.map(e=>e.seq));
 return sequence<previous?current:{...next,events:orderedAuditEvents(next.events)};
}
export function auditElapsed(audit:AuditSnapshot,now=Date.now()){
 const elapsed=Math.max(0,Math.floor(((audit.endedAt?Date.parse(audit.endedAt):now)-Date.parse(audit.startedAt))/1000));
 return `${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
}
