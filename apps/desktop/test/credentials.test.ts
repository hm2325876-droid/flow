import {afterEach,describe,expect,it} from 'vitest';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {CredentialVault,type SecureStorage} from '../src/main/credentials';

const folders:string[]=[];
async function folder(){const value=await mkdtemp(path.join(os.tmpdir(),'flowproof-vault-'));folders.push(value);return value;}
afterEach(async()=>{for(const f of folders.splice(0)){if(path.dirname(f)!==os.tmpdir()||!path.basename(f).startsWith('flowproof-vault-'))throw Error('Unsafe test cleanup');await rm(f,{recursive:true,force:true});}});
const protectedStorage:SecureStorage={
  async isAsyncEncryptionAvailable(){return true;},
  async encryptStringAsync(value){return Buffer.from(value.split('').reverse().join(''));},
  async decryptStringAsync(bytes){return {result:bytes.toString().split('').reverse().join(''),shouldReEncrypt:false};}
};
describe('Main-only encrypted provider vault (isolated secure-storage double)',()=>{
  it('saves ciphertext, survives restart, replaces and removes without plaintext persistence',async()=>{
    const dir=await folder();let vault=new CredentialVault(dir,protectedStorage);await vault.init();
    const key='unit-test-only-key-a';await vault.save('openai',key);const revision=vault.revision('openai');
    expect(await readFile(path.join(dir,'provider-vault.json'),'utf8')).not.toContain(key);
    vault=new CredentialVault(dir,protectedStorage);await vault.init();expect(vault.has('openai')).toBe(true);expect(vault.revision('openai')).toBe(revision);
    expect(await vault.withKey('openai',async secret=>secret===key)).toBe(true);
    await vault.save('openai','unit-test-only-key-b');expect(vault.revision('openai')).not.toBe(revision);
    await vault.remove('openai');vault=new CredentialVault(dir,protectedStorage);await vault.init();expect(vault.has('openai')).toBe(false);
  });
  it('refuses plaintext fallback when OS-backed encryption is unavailable',async()=>{
    const dir=await folder();const vault=new CredentialVault(dir,{...protectedStorage,async isAsyncEncryptionAvailable(){return false;}});await vault.init();
    await expect(vault.save('openai','unit-test-key')).rejects.toThrow('No API key was saved');expect(await readdir(dir)).toEqual([]);
  });
  it('does not replace a working ciphertext if encryption fails',async()=>{
    const dir=await folder();const first=new CredentialVault(dir,protectedStorage);await first.init();await first.save('openai','unit-original');
    const original=await readFile(path.join(dir,'provider-vault.json'),'utf8');
    const second=new CredentialVault(dir,{...protectedStorage,async encryptStringAsync(){throw Error('provider-private-diagnostic');}});await second.init();
    await expect(second.save('openai','unit-replacement')).rejects.toThrow('OS-backed encryption failed');expect(await readFile(path.join(dir,'provider-vault.json'),'utf8')).toBe(original);
  });
  it('fails safely on malformed encrypted storage without overwriting it',async()=>{
    const dir=await folder();await writeFile(path.join(dir,'provider-vault.json'),'broken-local-vault');
    const vault=new CredentialVault(dir,protectedStorage);await expect(vault.init()).rejects.toThrow('could not be read');expect(await readFile(path.join(dir,'provider-vault.json'),'utf8')).toBe('broken-local-vault');
  });
});
