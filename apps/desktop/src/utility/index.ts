import {utilityCommandSchema} from '@flowproof/contracts';
import {BrowserRuntime} from '@flowproof/browser-runtime';
import {getCatalog,verifyConnection,verifyModel} from '@flowproof/ai-providers';
type Parent={on(event:'message',listener:(event:{data:unknown})=>void):void;postMessage(message:unknown):void};
const parent=(process as NodeJS.Process&{parentPort:Parent}).parentPort;
const runtime=new BrowserRuntime();let busy=false,providerBusy=false;
parent.on('message',async event=>{
  const parsed=utilityCommandSchema.safeParse(event.data);
  if(!parsed.success)return;
  const message=parsed.data;
  if(message.type==='provider'){
    if(providerBusy){parent.postMessage({type:'reply',id:message.id,ok:false,error:'Another provider operation is active'});return;}
    providerBusy=true;
    try{
      const command=message.command;
      const result=command.type==='catalog'?await getCatalog(command.cache,command.refresh):command.phase==='connection'?await verifyConnection(command.selection,command.key):await verifyModel(command.selection,command.key);
      parent.postMessage({type:'reply',id:message.id,ok:true,result});
    }catch{parent.postMessage({type:'reply',id:message.id,ok:false,error:message.command.type==='catalog'?'Model discovery is unavailable. Retry with an internet connection or use the saved catalog.':'Internal desktop provider communication failed. Retry the check or restart the application.'});}
    finally{if(message.command.type==='verify')message.command.key='';providerBusy=false;}
    return;
  }
  if(busy){parent.postMessage({type:'reply',id:message.id,ok:false,error:'Another browser operation is active'});return;}
  busy=true;
  try {
    const result=message.type==='connect'?await runtime.connect(message.connection):message.type==='check'?await runtime.check(message.url,message.marker,message.holdMs):await runtime.close();
    parent.postMessage({type:'reply',id:message.id,ok:true,result});
  } catch(cause) {if(process.env.FLOWPROOF_SMOKE_PIPE)console.error('UTILITY_FAILURE',String(cause).replace(/Bearer\s+\S+|[a-f0-9]{64}/g,'[REDACTED]'));parent.postMessage({type:'reply',id:message.id,ok:false,error:'Browser operation failed; inspect the connection and actual page before retrying'});}
  finally {busy=false;}
});
parent.postMessage({type:'ready',pid:process.pid});
