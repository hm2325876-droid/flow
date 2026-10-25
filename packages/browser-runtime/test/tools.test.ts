import {afterEach,describe,expect,it,vi} from 'vitest';
import type {Page} from 'playwright-core';
import {BrowserTools,allowedBrowserUrl,ACTION_TIMEOUT} from '../src/tools';

const target={by:'role' as const,role:'button',value:'Increment counter'};
function fixture(){
 const observed={url:'http://localhost:3000/',title:'Local test',text:'Counter 1',elements:[{role:'button',name:'Increment counter'}]};
 const locator={count:vi.fn(async()=>1),click:vi.fn(async()=>{}),fill:vi.fn(async()=>{}),selectOption:vi.fn(async()=>{}),press:vi.fn(async()=>{}),waitFor:vi.fn(async()=>{}),evaluateAll:vi.fn(async()=>({overflow:false,values:[] as string[]}))};
 const page={isClosed:()=>false,url:()=>observed.url,evaluate:vi.fn(async()=>observed),getByRole:vi.fn(()=>locator),getByLabel:vi.fn(()=>locator),getByTestId:vi.fn(()=>locator),getByText:vi.fn(()=>locator),locator:vi.fn(()=>locator),goto:vi.fn(async()=>{}),mouse:{wheel:vi.fn(async()=>{})},screenshot:vi.fn(async(_options:Record<string,unknown>)=>Buffer.from('masked-png'))};
 const tools=new BrowserTools(()=>page as unknown as Page,()=>'http://localhost:3000');
 return {tools,page,locator,observed};
}
afterEach(()=>vi.useRealTimers());
describe('bounded semantic browser tools',()=>{
 it('rejects scope and malformed arguments before any browser action',async()=>{
  const {tools,page}=fixture();
  for(const url of ['http://localhost:3001/','http://127.0.0.1:3000/','https://localhost:3000/','http://user:secret@localhost:3000/'])expect(allowedBrowserUrl(url,'http://localhost:3000')).toBe(false);
  expect((await tools.perform({kind:'navigate',url:'http://outside.invalid/'})).code).toBe('scope');
  expect((await tools.perform({kind:'scroll',direction:'down',amount:9000})).code).toBe('invalid');
  expect(page.goto).not.toHaveBeenCalled();expect(page.mouse.wheel).not.toHaveBeenCalled();
 });
 it('executes a unique accessible target and returns an actual subsequent observation',async()=>{
  const {tools,page,locator}=fixture();const result=await tools.perform({kind:'click',locator:target});
  expect(page.getByRole).toHaveBeenCalledWith('button',{name:'Increment counter',exact:true});
  expect(locator.click).toHaveBeenCalledOnce();expect(result).toMatchObject({ok:true,code:'ok',observation:{text:'Counter 1'}});
  locator.count.mockResolvedValue(2);expect((await tools.perform({kind:'click',locator:target})).code).toBe('not-found');expect(locator.click).toHaveBeenCalledOnce();
 });
 it('requires privately resolved sensitive references and excludes values from observations',async()=>{
  const {tools,observed,locator}=fixture(),secretRef='8bf67b7e-946b-454e-a7dd-c75903031793';
  const action={kind:'fill' as const,locator:{by:'label' as const,value:'Password'},secretRef};
  expect((await tools.perform(action)).code).toBe('policy');expect(locator.fill).not.toHaveBeenCalled();
  observed.text='Echo private-input-marker';observed.title='private-input-marker';observed.url='http://localhost:3000/?q=private-input-marker';
  const result=await tools.perform(action,'private-input-marker');expect(locator.fill).toHaveBeenCalledWith('private-input-marker',{timeout:ACTION_TIMEOUT});
  expect(JSON.stringify(result)).not.toContain('private-input-marker');expect(result.observation?.text).toContain('[redacted]');
 });
 it('captures a real returned PNG buffer with editable inputs masked',async()=>{
  const {tools,page}=fixture();const result=await tools.perform({kind:'capture'});
  expect(result.screenshotBytes).toBe(Buffer.byteLength('masked-png'));expect(result.screenshot).toBe(Buffer.from('masked-png').toString('base64'));
  expect(page.locator).toHaveBeenCalledWith('input,textarea,[contenteditable="true"]');expect(page.screenshot.mock.calls[0][0]).toMatchObject({type:'png',fullPage:false,timeout:ACTION_TIMEOUT});
 });
 it('redacts privately observed manual inputs and omits URL queries from model observations',async()=>{
  const {tools,locator,observed}=fixture();locator.evaluateAll.mockResolvedValue({overflow:false,values:['private-manual-marker']});observed.url='http://localhost:3000/?password=private-manual-marker#private';observed.text='Echo private-manual-marker';
  const result=await tools.perform({kind:'inspect'});expect(result.observation?.url).toBe('http://localhost:3000/');expect(JSON.stringify(result)).not.toContain('private-manual-marker');
 });
 it('fails closed when manual-input privacy collection bounds are exceeded',async()=>{
  const {tools,locator,page,observed}=fixture();locator.evaluateAll.mockResolvedValue({overflow:true,values:[]});observed.text='private-overflow-marker';observed.title='private-overflow-marker';observed.url='http://localhost:3000/private-overflow-marker?q=private';
  const result=await tools.perform({kind:'inspect'});expect(result.observation?.url).toBe('http://localhost:3000/');expect(result.observation?.elements).toEqual([]);expect(JSON.stringify(result)).not.toContain('private-overflow-marker');
  expect((await tools.perform({kind:'capture'})).code).toBe('policy');expect(page.screenshot).not.toHaveBeenCalled();
 });
 it('waits for a missing visible element rather than declaring premature success',async()=>{
  const {tools,locator}=fixture();locator.count.mockResolvedValue(0);
  const result=await tools.perform({kind:'wait',locator:{by:'text',value:'Finished'},state:'visible'});
  expect(locator.waitFor).toHaveBeenCalledWith({state:'visible',timeout:ACTION_TIMEOUT});expect(result.ok).toBe(true);
 });
 it('bounds a stalled action and refuses to replay it without inspection',async()=>{
  vi.useFakeTimers();const {tools,locator}=fixture();locator.click.mockImplementation(()=>new Promise(()=>{}));
  const result=tools.perform({kind:'click',locator:target});await vi.advanceTimersByTimeAsync(ACTION_TIMEOUT+1);
  expect((await result).code).toBe('unknown');expect((await tools.perform({kind:'click',locator:target})).code).toBe('unknown');expect(locator.click).toHaveBeenCalledOnce();
 });
});
