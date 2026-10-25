import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {providerIdSchema} from '@flowproof/contracts';

export interface SecureStorage {
  isAsyncEncryptionAvailable():Promise<boolean>;
  encryptStringAsync(value:string):Promise<Buffer>;
  decryptStringAsync(value:Buffer):Promise<{result:string;shouldReEncrypt:boolean}>;
}
const vaultSchema=z.object({version:z.literal(1),entries:z.record(providerIdSchema,z.object({ciphertext:z.string().min(1).max(24000).regex(/^[A-Za-z0-9+/]+=*$/),revision:z.string().uuid()}).strict())}).strict();
type Vault=z.infer<typeof vaultSchema>;

/** OS-encrypted values are resolved only for a trusted Main -> Utility operation. */
export class CredentialVault {
  private entries:Vault['entries']={};
  private file:string;
  private available=false;
  constructor(private folder:string,private secure:SecureStorage){this.file=path.join(folder,'provider-vault.json');}
  async init(){
    this.available=await this.secure.isAsyncEncryptionAvailable().catch(()=>false);
    try{this.entries=vaultSchema.parse(JSON.parse(await readFile(this.file,'utf8'))).entries;}
    catch(cause){if((cause as NodeJS.ErrnoException).code!=='ENOENT')throw new Error('Encrypted provider storage could not be read. Restore the local storage file before retrying.');}
  }
  async isAvailable(){this.available=await this.secure.isAsyncEncryptionAvailable().catch(()=>false);return this.available;}
  has(providerId:string){return Object.hasOwn(this.entries,providerId);}
  revision(providerId:string){return this.entries[providerId]?.revision??null;}
  private async persist(){
    await mkdir(this.folder,{recursive:true});
    const temporary=this.file+'.tmp';
    await writeFile(temporary,JSON.stringify({version:1,entries:this.entries} satisfies Vault),{encoding:'utf8',mode:0o600});
    await rename(temporary,this.file);
  }
  async save(providerId:string,key:string){
    providerIdSchema.parse(providerId);
    if(!await this.isAvailable())throw new Error('OS-backed secure storage is unavailable. No API key was saved.');
    let ciphertext:Buffer;
    try{ciphertext=await this.secure.encryptStringAsync(key);}catch{throw new Error('OS-backed encryption failed. No API key was saved.');}
    const previous=this.entries[providerId];
    this.entries[providerId]={ciphertext:ciphertext.toString('base64'),revision:randomUUID()};
    ciphertext.fill(0);
    try{await this.persist();}catch{if(previous)this.entries[providerId]=previous;else delete this.entries[providerId];throw new Error('Encrypted key could not be saved. Check local storage access.');}
  }
  async remove(providerId:string){
    providerIdSchema.parse(providerId);const previous=this.entries[providerId];delete this.entries[providerId];
    try{await this.persist();}catch{if(previous)this.entries[providerId]=previous;throw new Error('Encrypted key could not be removed. Check local storage access.');}
  }
  async withKey<T>(providerId:string,use:(key:string)=>Promise<T>):Promise<T>{
    if(!await this.isAvailable())throw new Error('OS-backed secure storage is unavailable. Reconnect after protection is restored.');
    const entry=this.entries[providerId];if(!entry)throw new Error('Add an API key for the selected provider.');
    let plaintext:string|undefined;const ciphertext=Buffer.from(entry.ciphertext,'base64');
    try{const decrypted=await this.secure.decryptStringAsync(ciphertext);plaintext=decrypted.result;}
    catch{throw new Error('The saved key could not be decrypted. Replace it using this Windows account.');}
    finally{ciphertext.fill(0);}
    try{return await use(plaintext!);}finally{plaintext=undefined;}
  }
}
