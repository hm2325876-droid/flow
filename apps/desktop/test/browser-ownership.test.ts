import {describe,it,expect,vi} from 'vitest';
import type {BrowserWindow} from 'electron';
import {BrowserHost} from '../src/main/browser/host';

vi.mock('electron',()=>({
 WebContentsView:class {
  visible=false;
  webContents={session:{setPermissionCheckHandler:vi.fn(),setPermissionRequestHandler:vi.fn(),on:vi.fn(),webRequest:{onBeforeRequest:vi.fn()}},on:vi.fn(),setWindowOpenHandler:vi.fn(),focus:vi.fn(),isDestroyed:()=>false,getURL:()=> 'http://localhost:3000/',executeJavaScript:vi.fn(async()=>({found:true,unique:true,name:'Save preferences',role:'button'}))};
  setBackgroundColor=vi.fn();setBounds=vi.fn();setVisible(value:boolean){this.visible=value;}
 },
 webContents:{fromDevToolsTargetId:vi.fn()},screen:{dipToScreenPoint:(value:unknown)=>value}
}));
vi.mock('../src/main/browser/cdp-bridge',()=>({GuestBridge:class {active=false;constructor(..._args:unknown[]){}close=vi.fn();}}));
function host(){const win={getContentSize:()=>[1000,800],contentView:{addChildView:vi.fn()}};const result=new BrowserHost(win as unknown as BrowserWindow,'http://localhost:3000',()=>{});result.beginAudit();result.position({x:100,y:100,width:500,height:500,visible:true});return result;}
describe('exclusive native browser ownership',()=>{
 it('holds the shield until the active action reaches its checkpoint',async()=>{
  const native=host();await native.beginAction('operation',{kind:'inspect'});expect(native.bridge.active).toBe(true);
  native.setOwner('pending');expect(native.controlOwner).toBe('pending');expect(native.bridge.active).toBe(true);
  expect(()=>native.setOwner('user')).toThrow('still active');
  await expect(native.beginAction('other',{kind:'inspect'})).rejects.toThrow('exclusive');
  native.endAction('operation');expect(native.bridge.active).toBe(false);native.setOwner('user');
  expect(native.shield.setVisible).toBeDefined();expect(native.guest.webContents.focus).toHaveBeenCalled();
  expect(native.controlOwner).toBe('user');await expect(native.beginAction('other',{kind:'inspect'})).rejects.toThrow('exclusive');
 });
 it('restores Agent input exclusion and does not steal question focus on resize',()=>{
  const native=host();native.setOwner('user');native.setOwner('agent');expect(native.controlOwner).toBe('agent');
  const focus=vi.mocked(native.shield.webContents.focus);const before=focus.mock.calls.length;
  native.position({x:100,y:100,width:500,height:450,visible:true});expect(focus.mock.calls.length).toBe(before);
 });
 it('binds a one-operation approval to the exact inspected document',async()=>{
  const native=host(),action={kind:'click' as const,locator:{by:'role' as const,role:'button',value:'Save preferences'}};
  const assessment=await native.assessAction(action);expect(assessment.decision).toBe('approval');
  await expect(native.beginAction('operation',action,false,assessment.binding)).rejects.toThrow('denied');
  native.generation++;
  await expect(native.beginAction('operation',action,true,assessment.binding)).rejects.toThrow('changed');
  const current=await native.assessAction(action);await native.beginAction('operation',action,true,current.binding);
  expect(()=>native.endAction('stale-operation')).toThrow('Stale');native.endAction('operation');
 });
});
