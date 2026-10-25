import {it,expect} from 'vitest';
import {restrictedEffectUrl,assessNativeAction} from '../src/main/browser/action-policy';
it('blocks recognized destructive/financial and secret-bearing URLs even when they use localhost GET',()=>{
 for(const path of ['/delete-account','/api/destroy','/purchase','/?action=delete','/?password=private-input','/?api_key=private-input']){
  const url='http://localhost:3000'+path;expect(restrictedEffectUrl(url)).toBe(true);expect(assessNativeAction({kind:'navigate',url},null,'http://localhost:3000',0).decision).toBe('deny');
 }
 for(const path of ['/','/next','/search?q=example','/product/details'])expect(restrictedEffectUrl('http://localhost:3000'+path)).toBe(false);
});
