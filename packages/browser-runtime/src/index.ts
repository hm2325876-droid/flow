import {chromium,type Browser,type Page} from 'playwright-core';
import {connectionSchema,type Connection,type CheckResult} from '@flowproof/contracts';
export class BrowserRuntime {
  private browser?:Browser; private page?:Page; private connection?:Connection;
  async connect(input:Connection){
    const connection=connectionSchema.parse(input);
    await this.close();
    this.browser=await chromium.connectOverCDP(connection.endpoint,{headers:{Authorization:`Bearer ${connection.token}`},noDefaults:true,timeout:10000});
    const pages=this.browser.contexts().flatMap(c=>c.pages());
    if(pages.length!==1)throw new Error('Expected exactly one authorized browser page');
    this.page=pages[0];this.page.setDefaultTimeout(5000);
    const cdp=await this.page.context().newCDPSession(this.page);
    const {targetInfo}=await cdp.send('Target.getTargetInfo');await cdp.detach();
    if(targetInfo.targetId!==connection.targetId)throw new Error('Displayed target identity mismatch');
    this.connection=connection;
    return {connected:true,targetId:targetInfo.targetId,pid:process.pid};
  }
  async check(url:string,marker:string,holdMs:number):Promise<CheckResult>{
    const page=this.page,connection=this.connection;
    if(!page||!connection||new URL(url).origin!==connection.origin)throw new Error('No authorized session');
    await page.goto(url,{waitUntil:'domcontentloaded'});
    if(await page.locator('meta[name="flowproof-validation"]').count()!==1)throw new Error('Not a browser validation page');
    await page.getByRole('button',{name:'Increment counter',exact:true}).click();
    await page.getByLabel('Validation input').fill(marker);
    await page.getByRole('link',{name:'Next page'}).click();
    await page.waitForURL(u=>u.pathname==='/next');
    if(holdMs)await page.waitForTimeout(holdMs);
    const actual=await page.evaluate(()=>({url:location.href,value:(document.querySelector('#check-input') as HTMLInputElement).value,counter:Number(document.querySelector('#check-count')?.textContent),marker:document.querySelector('meta[name="flowproof-validation"]')?.getAttribute('content')||'',frameTicks:Number(document.querySelector('#ticks')?.textContent||0)}));
    const screenshot=await page.screenshot({type:'png'});
    if(actual.counter!==1||actual.value!==marker)throw new Error('Browser effects were not observed');
    return {...actual,targetId:connection.targetId,screenshot:screenshot.toString('base64'),screenshotBytes:screenshot.length};
  }
  async close(){await this.browser?.close().catch(()=>{});this.browser=undefined;this.page=undefined;this.connection=undefined;return {closed:true};}
}
