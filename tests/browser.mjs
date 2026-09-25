// Real HTTP + native storage + genuine Three.js. No mocked network or renderer.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='browser-artifacts';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3210'},stdio:'inherit'});
let browser;const errors=[],checks=[];const ok=s=>{checks.push(s);console.log('PASS',s);};
try{
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:3210/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:3210/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.zederWorld,null,{timeout:60000});
 const d=await page.evaluate(()=>zederWorld.debug());assert.equal(d.revision,'169');assert.equal(d.scene,'seaside-workshop');assert.match(d.webgl,/WebGL 2/);assert.ok(d.grassBlades>=44000);assert.equal(d.paused,true);assert.equal(d.workshop.stage,'idle');assert.equal(await page.locator('[data-world=explore]').count(),0);ok('Real Three.js workshop; accessible reduced-motion scene; no player controls');
 assert.equal(d.water.waves,12);assert.equal(d.water.vertexDisplacement,true);assert.equal(d.workshop.pose,'hands-on-bench');ok('TOMOB-derived wave spectrum and corrected workbench pose');
 for(const preset of ['day','night','sunset']){
  await page.locator(`[data-time="${preset}"]`).click();const state=await page.evaluate(()=>zederWorld.debug());assert.equal(state.timeOfDay,preset);if(preset==='night')assert.equal(state.night,1);if(preset==='day')assert.equal(state.night,0);
  await page.screenshot({path:`${out}/${preset}.png`});
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('zeder.scene.time.v1')),'sunset');ok('Day, sunset and night synchronize water/light; preference is stored');
 const locked=await page.evaluate(()=>zederWorld.debug().camera);await page.mouse.move(20,200);await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>zederWorld.debug().camera),locked);ok('Reduced motion disables mouse camera movement');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>zederWorld.debug().paused===false);await page.mouse.move(1260,350);
 await page.waitForFunction(()=>zederWorld.debug().pointer[0]>.4,null,{timeout:45000});
 const right=await page.evaluate(()=>zederWorld.debug().camera);assert.ok(Math.abs(right[0]-locked[0])>.1);await page.mouse.move(20,350);await page.waitForFunction(()=>zederWorld.debug().pointer[0]<-.4,null,{timeout:45000});
 const left=await page.evaluate(()=>zederWorld.debug().camera);assert.notDeepEqual(left,right);ok('Actual pointer events produce bounded damped camera orbit');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>zederWorld.debug().paused===true);
 await page.screenshot({path:`${out}/home.png`});await page.evaluate(()=>zederWorld.seek(2));await page.locator('[data-world=skip]').click();assert.equal(await page.evaluate(()=>zederWorld.debug().mode),'home');ok('Cinematic approach and skip');
 await page.locator('#message').fill('쇼핑몰 CS 문의를 정리하는 서비스를 만들었어요. 첫 고객을 찾고 싶어요.');await page.locator('[type=submit]').click();await page.locator('.quick-replies button').filter({hasText:'작은 팀'}).click();await page.locator('.quick-replies button').filter({hasText:'10만원'}).click();await page.locator('.strategy-board').waitFor();assert.equal(await page.locator('.path-card').count(),3);
 const work=await page.evaluate(()=>zederWorld.debug().workshop);assert.equal(work.stage,'draft');assert.ok(work.boardFields[0]);assert.equal(work.working,false);await page.screenshot({path:`${out}/chat.png`});ok('Chat generates strategy; physical board reflects actual draft');
 await page.locator('[data-action=request]').click();await page.locator('[data-action=confirm-request]').click();await page.locator('.demo-notice a').click();await page.locator('.studio-sidebar').waitFor();assert.ok(await page.locator('#world-host').isHidden());ok('Separate 2D marketer studio');
 await page.locator('input[name=title]').fill('작은 쇼핑몰과 직접 대화하기');await page.locator('textarea[name=review-note]').fill('CS 담당자가 없는 소형 쇼핑몰로 좁혀주세요.');await page.locator('form[data-form=review] [type=submit]').click();await page.locator('.detail-title a').click();await page.locator('[data-action=approve]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('zeder-search.chat-first.v2')).threads[0].status==='preparing');ok('Review and approval preserve existing workflow');
 await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zeder-search.chat-first.v2')).threads[0].status),'preparing');ok('Native storage persists on HTTP reload');await context.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await mobile.goto('http://127.0.0.1:3210/',{waitUntil:'domcontentloaded'});await mobile.waitForFunction(()=>!!window.zederWorld,null,{timeout:60000});assert.equal(await mobile.evaluate(()=>zederWorld.debug().grassBlades),44000);assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:`${out}/mobile.png`});ok('Responsive mobile workshop');assert.deepEqual(errors,[]);ok('No JS or shader errors');
}finally{await browser?.close();server.kill();await writeFile(`${out}/results.json`,JSON.stringify({checks,errors,method:'Real HTTP, native browser storage and genuine Three.js/WebGL2.'},null,2));}
