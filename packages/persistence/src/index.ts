import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {eq} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/sqlite-proxy';
import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
import {auditDraftSchema,catalogSnapshotSchema,modelRefSchema,defaultAuditDraft,type AuditDraft,type ModelRef,type CatalogSnapshot} from '@flowproof/contracts';

const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});

/** Main-only, settings-only SQLite foundation. No audit/history records are created. */
export class SettingsStore {
  private constructor(private sqlite:DatabaseSync){}
  // The documented proxy driver keeps Drizzle on Node's bundled SQLite, avoiding an
  // Electron/native-addon ABI dependency. Query parameters never contain API keys.
  private db=drizzle(async(query,params,method)=>{
    const statement=this.sqlite.prepare(query);
    if(method==='run'){statement.run(...params);return {rows:[]};}
    if(method==='get'){const row=statement.get(...params);return {rows:row?Object.values(row):[]};}
    return {rows:statement.all(...params).map(row=>Object.values(row))};
  });
  static async open(folder:string){
    await mkdir(folder,{recursive:true});
    const sqlite=new DatabaseSync(path.join(folder,'flowproof.sqlite'));
    sqlite.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
    return new SettingsStore(sqlite);
  }
  private async get(key:'selection'|'draft'|'catalog'){
    const rows=await this.db.select().from(settings).where(eq(settings.key,key));
    if(!rows.length)return undefined;
    return JSON.parse(rows[0].value) as unknown;
  }
  private async put(key:'selection'|'draft'|'catalog',value:unknown){
    await this.db.insert(settings).values({key,value:JSON.stringify(value)}).onConflictDoUpdate({target:settings.key,set:{value:JSON.stringify(value)}});
  }
  async read(){
    const selection=modelRefSchema.safeParse(await this.get('selection'));
    const draft=auditDraftSchema.safeParse(await this.get('draft'));
    return {selection:selection.success?selection.data:null,draft:draft.success?draft.data:{...defaultAuditDraft}};
  }
  async saveSelection(selection:ModelRef){await this.put('selection',modelRefSchema.parse(selection));}
  async saveDraft(draft:AuditDraft){await this.put('draft',auditDraftSchema.parse(draft));}
  async readCatalog():Promise<CatalogSnapshot|null>{try{const parsed=catalogSnapshotSchema.safeParse(await this.get('catalog'));return parsed.success?{...parsed.data,source:'cache'}:null;}catch{return null;}}
  async saveCatalog(catalog:CatalogSnapshot){await this.put('catalog',catalogSnapshotSchema.parse(catalog));}
  close(){this.sqlite.close();}
}
