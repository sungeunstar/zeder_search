// Native HTTP/localStorage suite for CI or a developer machine.
// The bundled offline QA in the delivery is separate; it does not claim this suite ran.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='browser-artifacts'; await mkdir(out,{recursive:true});
const url=process.env.BASE_URL || 'http://127.0.0.1:3210';
const server=process.env.BASE_URL?null:spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3210'},stdio:'inherit'});
let browser; const errors=[],checks=[];
const ok=message=>{checks.push(message);console.log('PASS',message);};
try {
  let reachable=false;
  for(let i=0;i<50;i++){try{if((await fetch(url)).ok){reachable=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
  assert.ok(reachable,'Test URL did not start');
  if(process.env.EXPECT_REVISION){const info=await(await fetch(url+'/build-info.json')).json();assert.equal(info.revision,process.env.EXPECT_REVISION);}
  const config=await(await fetch(url+'/api/chat')).json();assert.equal(config.mode,'demo','This regression suite must not make paid model calls');
  browser=await chromium.launch({headless:process.env.HEADED!=='1',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.zederWorld);
  const world=await page.evaluate(()=>zederWorld.debug());assert.equal(world.scene,'seaside-workshop');assert.equal(world.water.waves,12);ok('Real Three.js workshop and TOMOB water render');
  for(const preset of ['day','night','sunset']){await page.locator(`[data-time="${preset}"]`).click();assert.equal(await page.evaluate(()=>zederWorld.debug().timeOfDay),preset);}ok('Time presets retained');
  await page.locator('#message').fill('노원에서 필라테스 스튜디오를 운영해요. 첫 회원을 모으고 싶어요. 고객은 근처 직장인이에요. 예산은 10만원이에요.');
  await page.locator('[data-form=chat] [type=submit]').click();await page.locator('[data-action=show-result]').waitFor();
  await page.screenshot({path:`${out}/conversation.png`});await page.locator('[data-action=show-result]').click();
  await page.locator('.sg-customer').waitFor();assert.equal(await page.locator('.sg-first-action').count(),1);await page.screenshot({path:`${out}/first-experiment.png`});ok('One hypothesis, one first action');
  await page.locator('[data-action=request]').click();await page.locator('.dock-review').waitFor();assert.equal(await page.locator('#dialog').evaluate(el=>el.open),false);ok('Customer request has no duplicate confirmation');
  await page.locator('.dock-review').click();await page.locator('[data-form=single-review]').waitFor();
  for(const field of ['business','goal','budget'])assert.equal(await page.locator(`[name=${field}]`).count(),0);
  await page.screenshot({path:`${out}/marketer-report.png`});ok('Source evidence precedes editable report and is read-only');
  const hypothesis=await page.locator('[name=hypothesis]').inputValue();await page.locator('[name=hypothesis]').fill('');await page.locator('[name=review-note]').fill('검토 중');await page.waitForTimeout(600);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[name=hypothesis]').waitFor();assert.equal(await page.locator('[name=hypothesis]').inputValue(),'');ok('Incomplete edits survive native browser reload');
  await page.locator('[name=hypothesis]').fill(hypothesis);await page.locator('[name=audience]').fill('평일 저녁 운동이 필요한 스튜디오 인근 직장인 · 검증 전 가설');await page.locator('[name=review-note]').fill('방문 가능한 거리와 시간대로 고객 후보를 좁혔습니다. 예산은 바꾸지 않고 실제 상담 문의를 확인하는 실행으로 진행하세요.');
  await page.locator('[data-form=single-review] [type=submit]').click();await page.locator('.sg-report-status').filter({hasText:'전달 완료'}).waitFor();assert.equal(await page.locator('#dialog').evaluate(el=>el.open),false);ok('Single direct review delivery');
  await page.locator('.sg-send-bar a').click();await page.locator('[data-action=show-result]').click();await page.locator('.sg-feedback').waitFor();assert.equal(await page.locator('[data-action=approve]').count(),0);assert.ok(await page.locator('.sg-diff').count()>0);await page.screenshot({path:`${out}/reviewed.png`});ok('Feedback and changes shown without another human gate');
  await page.locator('.sg-tool[data-action=artifact]').first().click();await page.locator('.artifact-preview').waitFor();assert.match(await page.locator('.artifact-preview').innerText(),/실제 조사/);ok('Preparation creates a local template, not external action');
  await page.setViewportSize({width:390,height:844});await page.locator('#dialog [data-action=show-result]').click();await page.locator('.sg-customer').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/mobile-result.png`});
  const id=(await page.evaluate(()=>location.hash)).split('/').at(-1);await page.goto(url+'/#/studio/'+id);await page.locator('.sg-report').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${out}/mobile-report.png`});ok('Responsive customer and marketer documents');
  assert.deepEqual(errors,[]);ok('No captured JavaScript, shader or CSP errors');
} finally {
  await browser?.close();server?.kill();
  await writeFile(`${out}/results.json`,JSON.stringify({url,checks,errors,method:'Native HTTP and browser storage, actual Chromium WebGL. No simulated API/model/renderer responses.'},null,2));
}
