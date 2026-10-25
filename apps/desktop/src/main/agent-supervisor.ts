import {utilityProcess,type UtilityProcess} from 'electron';
import {utilityCommandSchema,utilityReplySchema} from '@flowproof/contracts';
export class AgentSupervisor {
  private child?:UtilityProcess;private seq=0;
  private pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  pid=0;ready=false;failed=false;
  constructor(private entry:string,private changed:()=>void){}
  async start(){
    this.child=utilityProcess.fork(this.entry,[],{serviceName:'FlowProof Runtime',stdio:'pipe'});
    this.child.on('message',(raw:unknown)=>{
      const parsed=utilityReplySchema.safeParse(raw);if(!parsed.success)return;
      const m=parsed.data;
      if(m.type==='ready'){this.ready=true;this.pid=m.pid;this.changed();return;}
      const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.ok?p.resolve(m.result):p.reject(new Error(m.error||'Utility operation failed'));}
    });
    this.child.on('exit',()=>{this.ready=false;this.failed=true;this.pid=0;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Browser runtime exited'));}this.pending.clear();this.changed();});
    await new Promise<void>((resolve,reject)=>{const until=Date.now()+10000;const t=setInterval(()=>{if(this.ready){clearInterval(t);resolve()}else if(Date.now()>until){clearInterval(t);reject(new Error('Browser runtime startup timed out'))}},25)});
  }
  request(input:Record<string,unknown>):Promise<unknown>{
    const message=utilityCommandSchema.parse({...input,id:++this.seq});
    if(!this.ready||!this.child)return Promise.reject(new Error('Browser runtime unavailable'));
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(message.id);reject(new Error(message.type==='provider'?'Provider operation deadline exceeded':'Browser runtime deadline exceeded'))},message.type==='provider'?55000:20000);this.pending.set(message.id,{resolve,reject,timer});this.child!.postMessage(message);});
  }
  async stop(){if(this.ready)await Promise.race([this.request({type:'close'}).catch(()=>{}),new Promise(r=>setTimeout(r,1500))]);this.child?.kill();}
}
