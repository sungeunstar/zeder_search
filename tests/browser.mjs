// Real HTTP browser check, used in CI. No DOM, storage, networking or renderer mocks.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='browser-artifacts';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3210'},stdio:'inherit'});
let browser;const errors=[],checks=[];const ok=name=>{checks.push(name);console.log('PASS',name);};
try{
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:3210/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:3210/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.zederWorld,null,{timeout:60000});
 const debug=await page.evaluate(()=>window.zederWorld.debug());assert.equal(debug.revision,'169');assert.match(debug.webgl,/WebGL 2/);assert.equal(debug.grassBlades,128000);assert.equal(debug.paused,true);ok('HTTP homepage renders real pinned Three.js/WebGL2');
 await page.screenshot({path:`${out}/home.png`});
 await page.evaluate(()=>window.zederWorld.seek(4));await page.screenshot({path:`${out}/orbit.png`});await page.locator('[data-world=skip]').click();assert.equal(await page.evaluate(()=>window.zederWorld.debug().mode),'home');ok('Orbit and skip use the real camera');
 await page.locator('[data-world=explore]').click();await page.evaluate(()=>window.zederWorld.advance(0));const before=await page.evaluate(()=>window.zederWorld.debug().character);await page.keyboard.down('ArrowUp');await page.evaluate(()=>window.zederWorld.advance(.45));await page.keyboard.up('ArrowUp');const after=await page.evaluate(()=>window.zederWorld.debug().character);assert.ok(Math.abs(before[0]-after[0])+Math.abs(before[2]-after[2])>.4);await page.keyboard.press('Escape');ok('Keyboard movement and exit work');
 await page.locator('#message').fill('쇼핑몰 CS 문의를 정리하는 서비스를 만들었어요. 첫 고객을 찾고 싶어요.');await page.locator('[type=submit]').click();await page.locator('.quick-replies button').filter({hasText:'작은 팀'}).click();await page.locator('.quick-replies button').filter({hasText:'10만원'}).click();await page.locator('.strategy-board').waitFor();assert.equal(await page.locator('.path-card').count(),3);ok('Chat and strategy generation retain the existing demo flow');
 await page.locator('[data-action=request]').click();await page.locator('[data-action=confirm-request]').click();await page.locator('.demo-notice a').click();await page.locator('.studio-sidebar').waitFor();assert.ok(await page.locator('#world-host').isHidden());ok('Requests lead to a separate 2D marketer studio');
 await page.locator('input[name=title]').fill('작은 쇼핑몰과 직접 대화하기');await page.locator('textarea[name=review-note]').fill('별도 CS 인력이 없는 쇼핑몰로 좁혀주세요.');await page.locator('form[data-form=review] [type=submit]').click();await page.locator('.detail-title a').click();await page.locator('[data-action=approve]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('zeder-search.chat-first.v2')).threads[0].status==='preparing');ok('Marketer review and customer approval work with real browser storage');
 await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zeder-search.chat-first.v2')).threads[0].status),'preparing');ok('State persists across actual HTTP reload');
 await context.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await mobile.goto('http://127.0.0.1:3210/',{waitUntil:'domcontentloaded'});await mobile.waitForFunction(()=>!!window.zederWorld,null,{timeout:60000});assert.equal(await mobile.evaluate(()=>window.zederWorld.debug().grassBlades),44000);assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:`${out}/mobile.png`});ok('Mobile uses lower geometry density and has no horizontal overflow');
 assert.deepEqual(errors,[]);ok('No browser JavaScript or shader errors');
}finally{await browser?.close();server.kill();await writeFile(`${out}/results.json`,JSON.stringify({checks,errors,method:'Real loopback HTTP, native browser storage, actual Three.js renderer; no test adapters.'},null,2));}
