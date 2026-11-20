// SPDX-License-Identifier: Apache-2.0
// GFTA6-BROWSER-001: real Chrome CDP browser acceptance, no npm packages.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const OUT=resolve(ROOT,'test-results/headless');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MIME={html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',wav:'audio/wav',json:'application/json'};
const server=createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    const path=decodeURIComponent(new URL(req.url,'http://local.test').pathname);
    const file=resolve(ROOT,'.'+(path==='/'?'/index.html':path));
    if(!file.startsWith(ROOT+sep)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':MIME[extname(file).slice(1)]??'application/octet-stream','Cache-Control':'no-store'});
    res.end(bytes);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:500);res.end('not found');}
});
class Client{
  constructor(ws){
    this.ws=ws;this.id=0;this.pending=new Map();this.errors=[];
    ws.addEventListener('message',event=>{
      let o;try{o=JSON.parse(event.data);}catch{return;}
      if(o.id){const pending=this.pending.get(o.id);if(!pending)return;
        this.pending.delete(o.id);clearTimeout(pending.timer);
        if(o.error)pending.reject(Error(o.error.message));else pending.resolve(o.result??{});
      }else if(o.method==='Runtime.exceptionThrown'){
        this.errors.push('Uncaught: '+(o.params.exceptionDetails.text??'unknown'));
      }else if(o.method==='Log.entryAdded'&&o.params.entry.level==='error'){
        this.errors.push('Console: '+o.params.entry.text);
      }
    });
  }
  call(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++this.id;
      const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout: '+method));},10000);
      this.pending.set(id,{resolve,reject,timer});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  async eval(code){
    const r=await this.call('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error('Browser script: '+r.exceptionDetails.text+' '+(r.exceptionDetails.exception?.description??''));
    return r.result?.value;
  }
}
async function until(fn,message,timeout=14000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    try{const x=await fn();if(x)return x;}catch(e){if(e.message?.startsWith('Browser script:'))throw e;}
    await sleep(100);
  }
  throw Error('Timed out: '+message);
}
const el=id=>'document.getElementById('+JSON.stringify(id)+')';
let browser,cdp,profile;
async function click(id){
  const b=await cdp.eval('(()=>{const e='+el(id)+';e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,disabled:e.disabled};})()');
  assert.ok(b.w>5&&b.h>5&&!b.disabled,'element is not clickable: '+id);
  await cdp.call('Input.dispatchMouseEvent',{type:'mousePressed',x:b.x,y:b.y,button:'left',buttons:1,clickCount:1});
  await cdp.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x,y:b.y,button:'left',buttons:0,clickCount:1});
}
async function key(code,down){
  const codes={KeyW:['w',87],KeyA:['a',65],KeyM:['m',77],Space:[' ',32]};
  const k=codes[code];assert.ok(k,'unhandled input: '+code);
  await cdp.call('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:k[0],code,windowsVirtualKeyCode:k[1],nativeVirtualKeyCode:k[1],...(down?{text:k[0],unmodifiedText:k[0]}:{})});
}
async function screenshot(name){
  const r=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await mkdir(OUT,{recursive:true});await writeFile(join(OUT,name),Buffer.from(r.data,'base64'));
}
async function ready(){
  await until(()=>cdp.eval(el('route-mode')+'?.disabled===true'),'module initialisation');
  assert.equal(await cdp.eval('document.readyState'),'complete');
}
async function navigate(url){await cdp.call('Page.navigate',{url});await ready();}
async function canvasCheck(){
  const result=await cdp.eval('(()=>{const c='+el('canvas')+';const p=c.getContext("2d").getImageData(0,0,c.width,c.height).data;const samples=new Set();for(let i=0;i<p.length;i+=3853*4)samples.add(p[i]+":"+p[i+1]+":"+p[i+2]);return {width:c.width,height:c.height,colors:samples.size};})()');
  assert.ok(result.width>=800&&result.colors>=3,'blank game canvas: '+JSON.stringify(result));
}
async function main(){
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url='http://127.0.0.1:'+server.address().port+'/';
  profile=await mkdtemp(join(tmpdir(),'gfta6-chrome-'));
  const binary=process.env.CHROME_BIN||process.env.CHROMIUM_BIN||'google-chrome';
  browser=spawn(binary,['--headless=new','--disable-dev-shm-usage','--no-sandbox','--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let port=0;
  await until(async()=>{try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);return port>0;}catch{return false;}},'Chrome start');
  const page=await until(async()=>{const r=await fetch('http://127.0.0.1:'+port+'/json/list');const list=await r.json();return list.find(x=>x.type==='page');},'CDP page target');
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  cdp=new Client(ws);
  for(const name of ['Page.enable','Runtime.enable','Log.enable','Network.enable'])await cdp.call(name);
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  console.log('HEADLESS-CHROMIUM: '+binary);
  await navigate(url);
  assert.equal(await cdp.eval(el('intro')+'.hidden'),false);
  assert.equal(await cdp.eval('Boolean('+el('start-dogfight')+')'),true);
  await click('start');
  await until(()=>cdp.eval(el('intro')+'.hidden'),'start Saturday click');
  assert.match(await cdp.eval(el('mode-label')+'.textContent'),/DOMESTIC SURVIVAL/);
  await canvasCheck();
  await click('view-mode');
  assert.match(await cdp.eval(el('view-mode')+'.textContent'),/RAISED 2.5D/);
  await click('route-mode');
  assert.match(await cdp.eval(el('route-mode')+'.textContent'),/ESCAPE/);
  await click('pause');
  assert.match(await cdp.eval(el('mode-label')+'.textContent'),/PAUSED/);
  await click('pause');
  assert.match(await cdp.eval(el('mode-label')+'.textContent'),/DOMESTIC SURVIVAL/);
  await key('KeyW',true);await sleep(350);await key('KeyW',false);
  await canvasCheck();await screenshot('saturday.png');
  console.log('PASS: real Saturday click, Canvas, view, navigation, pause, W key');
  await navigate(url);
  await click('start-dogfight');
  await until(()=>cdp.eval(el('intro')+'.hidden&&'+el('task-count')+'.textContent.includes("DOGFIGHT")'),'standalone arcade launch');
  await canvasCheck();
  assert.match(await cdp.eval(el('velocity')+'.textContent'),/8 MISSILES/);
  await key('KeyM',true);await sleep(110);await key('KeyM',false);
  await until(()=>cdp.eval(el('velocity')+'.textContent.includes("7 MISSILES")'),'missile launch from physical M');
  await key('Space',true);await sleep(200);await key('Space',false);
  assert.match(await cdp.eval(el('escape-goal')+'.textContent'),/GUN HITS/);
  await screenshot('dogfight.png');
  console.log('PASS: real arcade click, Canvas, M missile and Space gun');
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const mobile=await cdp.eval('({width:innerWidth,canvas:('+el('canvas')+').getBoundingClientRect().width,buttons:[...document.querySelectorAll("[data-drive]")].filter(x=>!x.hidden).length})');
  assert.ok(mobile.width===390&&mobile.canvas>250&&mobile.buttons>=5,'mobile layout: '+JSON.stringify(mobile));
  await screenshot('dogfight-mobile.png');
  console.log('PASS: mobile viewport and touch controls');
  await cdp.call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await until(()=>cdp.eval('navigator.serviceWorker?.controller!==null'),'service worker controlling page',16000);
  await cdp.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await cdp.call('Page.reload',{ignoreCache:true});
  await ready();
  assert.equal(await cdp.eval(el('intro')+'.hidden'),false);
  await canvasCheck();
  console.log('PASS: fully offline game reload under controlling service worker');
  assert.deepEqual(cdp.errors,[],'browser exceptions / error logs');
  console.log('PASS: no uncaught browser exceptions');
}
let failed=false;
try{await main();}catch(e){failed=true;console.error('BROWSER FAILURE:',e.stack??e);}
finally{
  try{cdp?.ws.close();}catch{}
  if(browser&&browser.exitCode===null){
    const exit=new Promise(resolve=>browser.once('exit',resolve));
    browser.kill('SIGTERM');
    await Promise.race([exit,sleep(2000)]);
    if(browser.exitCode===null)browser.kill('SIGKILL');
  }
  if(server.listening)await new Promise(r=>server.close(r));
  if(profile)await rm(profile,{recursive:true,force:true,
    maxRetries:12,retryDelay:100});
}
if(failed)process.exitCode=1;
