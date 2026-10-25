import {setupBridgeErrorCodes} from '@flowproof/contracts';

/** Show fixed guidance, never an untrusted exception message or provider body. */
export function setupFailureMessage(cause:unknown):string{
 const code=cause instanceof Error?cause.message:'';
 if(code===setupBridgeErrorCodes.request)return 'The desktop rejected the setup request format. Reopen AI connections and select your model again.';
 if(code===setupBridgeErrorCodes.response)return 'The desktop returned an invalid setup response. Restart FlowProof and retry AI connections.';
 return 'Internal desktop communication error. Reopen AI connections and retry; restart FlowProof if it continues.';
}
