import {utilityCommandSchema} from '@flowproof/contracts';
import {BrowserRuntime} from '@flowproof/browser-runtime';
type Parent={on(event:'message',listener:(event:{data:unknown})=>void):void;postMessage(message:unknown):void};
const parent=(process as NodeJS.Process&{parentPort:Parent}).parentPort;
const runtime=new BrowserRuntime();let busy=false;
parent.on('message',async event=>{
  const parsed=utilityCommandSchema.safeParse(event.data);
  if(!parsed.success)return;
  const message=parsed.data;
  if(busy){parent.postMessage({type:'reply',id:message.id,ok:false,error:'Another browser operation is active'});return;}
  busy=true;
  try {
    const result=message.type==='connect'?await runtime.connect(message.connection):message.type==='check'?await runtime.check(message.url,message.marker,message.holdMs):await runtime.close();
    parent.postMessage({type:'reply',id:message.id,ok:true,result});
  } catch(cause) {if(process.env.FLOWPROOF_SMOKE_PIPE)console.error('UTILITY_FAILURE',String(cause).replace(/Bearer\s+\S+|[a-f0-9]{64}/g,'[REDACTED]'));parent.postMessage({type:'reply',id:message.id,ok:false,error:'Browser operation failed; inspect the connection and actual page before retrying'});}
  finally {busy=false;}
});
parent.postMessage({type:'ready',pid:process.pid});
