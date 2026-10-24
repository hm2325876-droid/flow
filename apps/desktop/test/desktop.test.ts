import {describe,it,expect} from 'vitest';
import {isAllowedUrl,clampSlot,RunGate} from '../src/main/browser/policy';
import fs from 'node:fs';
import path from 'node:path';
describe('native ownership and origin boundary',()=>{
  it('allows only the exact authorized HTTP origin',()=>{expect(isAllowedUrl('http://localhost:3000/next','http://localhost:3000')).toBe(true);for(const url of ['http://localhost:3001','http://localhost.evil:3000','http://127.0.0.1:3000','file:///tmp/a','https://localhost:3000','javascript:alert(1)','http://user:pass@localhost:3000/'])expect(isAllowedUrl(url,'http://localhost:3000')).toBe(false)});
  it('clips native rectangles to the window content area',()=>expect(clampSlot({x:900,y:600,width:500,height:400,visible:true},1000,720)).toEqual({x:900,y:600,width:100,height:120}));
  it('rejects overlapping operations and holds exclusion after uncertainty',()=>{const gate=new RunGate();expect(gate.enter()).toBe(true);expect(gate.enter()).toBe(false);gate.finish(false);expect(gate.enter()).toBe(false)});
  it('allows the next operation only after established completion',()=>{const gate=new RunGate();expect(gate.enter()).toBe(true);gate.finish(true);expect(gate.enter()).toBe(true)});
  it('keeps privileged implementations out of Renderer imports',()=>{const folder=path.resolve('apps/desktop/src/renderer');for(const file of fs.readdirSync(folder,{recursive:true}) as string[]){if(/\.tsx?$/.test(file)){const source=fs.readFileSync(path.join(folder,file),'utf8');expect(source).not.toMatch(/from\s+['"](?:electron|node:|@flowproof\/(?:browser-runtime|agent-core|persistence|ai-providers))/);}}});
});
