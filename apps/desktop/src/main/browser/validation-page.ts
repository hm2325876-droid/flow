import http from 'node:http';
import crypto from 'node:crypto';
export class ValidationPage {
  readonly marker=crypto.randomUUID();private server?:http.Server;private ipv6?:http.Server;private outside?:http.Server;
  url='';escapedRequests=0;redirectRequests=0;
  async start(){
    if(this.server)return this.url;
    this.outside=http.createServer((_q,r)=>{this.escapedRequests++;r.end('reachable outside target')});
    await new Promise<void>(r=>this.outside!.listen(0,'127.0.0.1',r));
    const handler:http.RequestListener=(q,r)=>{
      if(q.url?.startsWith('/redirect-out')){this.redirectRequests++;r.writeHead(302,{Location:this.outsideUrl()});r.end();return;}
      r.setHeader('Content-Type','text/html; charset=utf-8');r.setHeader('Cache-Control','no-store');
      r.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'");
      r.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="flowproof-validation" content="${this.marker}"><title>FlowProof · Browser validation</title><style>body{margin:0;padding:28px;background:#fffef9;color:#29352b;font:15px Segoe UI}small{font-size:10px;letter-spacing:1.8px;color:#698165}h1{font-size:25px;font-weight:550;margin:16px 0}p{color:#6b7367;line-height:1.6}button,input{font:inherit;border:1px solid #cdd5c6;border-radius:6px;padding:9px 12px;background:white}button{background:#405837;color:white;cursor:pointer}label{display:block;margin:20px 0 8px}input{width:calc(100% - 28px)}output{font-weight:600;margin-left:12px}.dot{height:7px;width:7px;border-radius:50%;background:#7b9568;animation:p 1s infinite alternate}a{color:#405837;display:inline-block;margin:20px 15px 0 0;font-size:12px}@keyframes p{to{opacity:.3;transform:translateX(24px)}}footer{font-size:11px;margin-top:18px;color:#84907e}</style><small>OWNED LOCAL VALIDATION PAGE</small><h1>This is real Chromium.</h1><p>A deterministic page for checking the actual desktop browser. No AI audit or finding is being simulated.</p><button id="increment">Increment counter</button><output id="check-count">0</output><label for="check-input">Validation input</label><input id="check-input" autocomplete="off"><div><a href="/next">Next page</a><a id="outside" href="${this.outsideUrl()}">Outside boundary</a><a href="/redirect-out">Blocked redirect</a></div><div class="dot"></div><footer>Native animation frames: <span id="ticks">0</span></footer><script>
        if(location.pathname==='/'){sessionStorage.removeItem('counter');sessionStorage.removeItem('value')}
        const input=document.querySelector('#check-input'),count=document.querySelector('#check-count');input.value=sessionStorage.getItem('value')||'';count.textContent=sessionStorage.getItem('counter')||'0';input.oninput=()=>sessionStorage.setItem('value',input.value);document.querySelector('#increment').onclick=()=>{count.textContent=String(Number(count.textContent)+1);sessionStorage.setItem('counter',count.textContent)};let ticks=0;function tick(){document.querySelector('#ticks').textContent=String(++ticks);requestAnimationFrame(tick)}requestAnimationFrame(tick);
      </script></html>`);
    };
    this.server=http.createServer(handler);
    await new Promise<void>(r=>this.server!.listen(0,'127.0.0.1',r));const a=this.server.address();if(!a||typeof a==='string')throw new Error('Local validation page unavailable');
    // localhost may resolve to either family in Node and Chromium on Windows.
    // Bind loopback only, on both families, without exposing a public listener.
    this.ipv6=http.createServer(handler);
    await new Promise<void>((resolve,reject)=>{this.ipv6!.once('error',(cause:NodeJS.ErrnoException)=>{if(cause.code==='EADDRNOTAVAIL'||cause.code==='EAFNOSUPPORT'){this.ipv6=undefined;resolve()}else reject(cause)});this.ipv6!.listen({port:a.port,host:'::1',ipv6Only:true},()=>resolve());});
    this.url=`http://localhost:${a.port}/`;return this.url;
  }
  outsideUrl(){const a=this.outside?.address();return a&&typeof a!=='string'?`http://127.0.0.1:${a.port}/outside`:'';}
  close(){this.server?.closeAllConnections();this.server?.close();this.ipv6?.closeAllConnections();this.ipv6?.close();this.outside?.closeAllConnections();this.outside?.close();}
}
