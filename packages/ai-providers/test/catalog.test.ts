import {describe,it,expect,vi} from 'vitest';
import {getCatalog,normalizeCatalog} from '../src/catalog';

const fixture={openai:{name:'OpenAI',npm:'do-not-import',api:'https://untrusted.invalid',models:{'unit-model':{name:'Unit model',tool_call:true,structured_output:false,reasoning:false,modalities:{input:['text','image'],output:['text']},limit:{context:8192,output:1024},cost:{input:0,output:1}}}},other:{name:'Other catalog provider',models:{'native/model':{name:'Native model'}}}};
describe('Models.dev discovery and cache',()=>{
 it('preserves provider-scoped IDs, false/unknown/zero metadata and installed adapter availability',()=>{
  const models=normalizeCatalog(fixture);
  expect(models).toHaveLength(2);
  expect(models.find(m=>m.providerId==='openai')).toMatchObject({modelId:'unit-model',toolCall:true,structuredOutput:false,reasoning:false,inputPrice:0,adapterAvailable:true,inputModalities:['text','image']});
  expect(models.find(m=>m.providerId==='other')).toMatchObject({modelId:'native/model',toolCall:null,contextLimit:null,inputPrice:null,adapterAvailable:false});
  expect(JSON.stringify(models)).not.toContain('untrusted.invalid');expect(JSON.stringify(models)).not.toContain('do-not-import');
 });
 it('fetches only the fixed HTTPS endpoint with a bounded signal and validates a snapshot',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify(fixture)));
  const result=await getCatalog(null,false,fetcher);
  expect(result.source).toBe('network');expect(result.stale).toBe(false);expect(result.models).toHaveLength(2);
  expect(fetcher.mock.calls[0][0]).toBe('https://models.dev/api.json');expect(fetcher.mock.calls[0][1]).toMatchObject({redirect:'error'});expect(fetcher.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  const headers=new Headers(fetcher.mock.calls[0][1]?.headers);expect([...headers.keys()]).toEqual(['accept']);
 });
 it('reuses a fresh validated snapshot without network activity',async()=>{
  const fetcher=vi.fn<typeof fetch>();
  const result=await getCatalog({fetchedAt:new Date().toISOString(),source:'network',stale:false,warning:null,models:normalizeCatalog(fixture)},false,fetcher);
  expect(result.source).toBe('cache');expect(fetcher).not.toHaveBeenCalled();
 });
 it('falls back to stale saved data without dropping stable selections',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>{throw new Error('offline with potentially sensitive details')});
  const result=await getCatalog({fetchedAt:'2020-01-01T00:00:00.000Z',source:'network',stale:false,warning:null,models:normalizeCatalog(fixture)},true,fetcher);
  expect(result.source).toBe('cache');expect(result.stale).toBe(true);expect(result.models[0].providerId).toBe('openai');expect(result.warning).not.toContain('sensitive');
 });
 it('fails honestly with no usable cache and rejects oversized or empty sources',async()=>{
  await expect(getCatalog(null,true,async()=>new Response('{}'))).rejects.toThrow('no saved catalog');
  await expect(getCatalog(null,true,async()=>new Response('{}',{headers:{'content-length':'999999999'}}))).rejects.toThrow('no saved catalog');
  expect(()=>normalizeCatalog({junk:{models:{'https://bad':{}}}})).toThrow('no usable');
 });
});
