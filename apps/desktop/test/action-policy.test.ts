import {describe,it,expect} from 'vitest';
import {assessNativeAction,RequestAllowance} from '../src/main/browser/action-policy';
const origin='http://localhost:3000';
describe('Main-owned browser action policy',()=>{
 it('denies hard restrictions regardless of catalog or page claims',()=>{
  expect(assessNativeAction({kind:'click'},{found:true,unique:true,name:'Delete account',role:'button'},origin,1).decision).toBe('deny');
  expect(assessNativeAction({kind:'navigate',url:'https://outside.invalid/'},null,origin,1).decision).toBe('deny');
  expect(assessNativeAction({kind:'click'},{found:true,unique:true,name:'Checkout',role:'button'},origin,1).decision).toBe('deny');
 });
 it('requires approval for uncertain actions and binds it to exact target/document',()=>{
  const action={kind:'click'},details={found:true,unique:true,name:'Save preferences',role:'button'};
  const a=assessNativeAction(action,details,origin,1);expect(a.decision).toBe('approval');
  expect(a.binding).not.toBe(assessNativeAction(action,details,origin,2).binding);
  expect(a.binding).not.toBe(assessNativeAction(action,{...details,name:'Save security settings'},origin,1).binding);
 });
 it('allows understood local testing but cannot expand scope or leak password forms into URLs',()=>{
  const details={found:true,unique:true,name:'Sign in',role:'button',form:{url:origin+'/session',method:'POST'}};
  expect(assessNativeAction({kind:'click'},details,origin,1)).toMatchObject({decision:'allow',formRequest:details.form});
  expect(assessNativeAction({kind:'click'},{...details,form:{url:'http://outside.invalid/login',method:'POST'}},origin,1).decision).toBe('deny');
  expect(assessNativeAction({kind:'click'},{...details,sensitiveGetForm:true},origin,1).decision).toBe('deny');
  expect(assessNativeAction({kind:'fill'},{...details,editable:true,sensitive:true},origin,1).decision).toBe('deny');
 });
 it('never opens a write-request allowance merely for filling a field',()=>{
  expect(assessNativeAction({kind:'fill'},{found:true,unique:true,editable:true,name:'Email',form:{url:origin+'/session',method:'POST'}},origin,1).formRequest).toBeUndefined();
 });
 it('permits only the declared request once and expires the allowance',()=>{
  const requests=new RequestAllowance();requests.set({url:origin+'/session',method:'POST'},100);
  expect(requests.consume(origin+'/other','POST',101)).toBe(false);expect(requests.consume(origin+'/session','DELETE',102)).toBe(false);
  expect(requests.consume(origin+'/session','POST',103)).toBe(true);expect(requests.consume(origin+'/session','POST',104)).toBe(false);
  requests.set({url:origin+'/session',method:'POST'},100);expect(requests.consume(origin+'/session','POST',15_101)).toBe(false);
 });
});
