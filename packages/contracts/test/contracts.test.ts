import {describe,it,expect} from 'vitest';
import {targetSchema, slotSchema, utilityCommandSchema} from '../src/index';
describe('trusted desktop contracts',()=>{
  it('accepts an explicitly authorized localhost port/path',()=>expect(targetSchema.safeParse({port:3000,path:'/example?q=1',consent:true}).success).toBe(true));
  it.each([{port:0,path:'/',consent:true},{port:3000,path:'//evil.test/',consent:true},{port:3000,path:'http://evil.test',consent:true},{port:3000,path:'/',consent:false},{port:3000,path:'/\\evil.test',consent:true},{port:3000,path:'/',consent:true,endpoint:'ws://evil'}])('rejects invalid or authority-overriding setup %j',v=>expect(targetSchema.safeParse(v).success).toBe(false));
  it('accepts finite nonnegative viewport bounds',()=>expect(slotSchema.safeParse({x:200,y:100,width:400,height:300,visible:true}).success).toBe(true));
  it('rejects malformed layout requests',()=>expect(slotSchema.safeParse({x:NaN,y:0,width:-1,height:200,visible:true}).success).toBe(false));
  it('does not offer a generic Utility execution command',()=>expect(utilityCommandSchema.safeParse({id:1,type:'evaluate',code:'process.exit()'}).success).toBe(false));
});
