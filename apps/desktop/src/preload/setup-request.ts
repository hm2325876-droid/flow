import {setupCommandSchema,setupStateSchema,setupBridgeErrorCodes,type SetupCommand,type SetupState} from '@flowproof/contracts';

type FailureCode=typeof setupBridgeErrorCodes[keyof typeof setupBridgeErrorCodes];
type Diagnostic={event:'setup-request-failed';code:FailureCode;stage:'request-validation'|'desktop-ipc'|'response-validation'};

/** Report only fixed codes/stages: never request payloads, keys or raw IPC errors. */
export async function requestSetup(input:unknown,invoke:(command:SetupCommand)=>Promise<unknown>,report:(diagnostic:Diagnostic)=>void=diagnostic=>console.warn(JSON.stringify(diagnostic))):Promise<SetupState>{
 const fail=(stage:Diagnostic['stage'],code:FailureCode):never=>{report({event:'setup-request-failed',stage,code});throw new Error(code);};
 const command=setupCommandSchema.safeParse(input);
 if(!command.success)return fail('request-validation',setupBridgeErrorCodes.request);
 let response:unknown;
 try{response=await invoke(command.data);}catch{return fail('desktop-ipc',setupBridgeErrorCodes.communication);}
 const state=setupStateSchema.safeParse(response);
 if(!state.success)return fail('response-validation',setupBridgeErrorCodes.response);
 return state.data;
}
