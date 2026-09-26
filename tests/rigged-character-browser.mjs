import {chromium} from 'playwright';import {spawn} from 'node:child_process';import {mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const out='character-qa';await mkdir(out,{recursive:true});const external=process.env.QA_BASE_URL,base=external||'http://127.0.0.1:3017';const server=external?null:spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'3017'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<80;i++){try{const r=await fetch(base+'/character-check.html');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1040,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/character-check.html');await page.waitForFunction(()=>window.zederCharacterCheck,{timeout:60000});
 const report=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{createMaker}=await import('/world/rigged-maker.js');
  window.zederCharacterCheck.step(0);
  // Sample all transition frames on an identical detached rig, without submitting
  // hundreds of redundant GPU frames to the software-rendered CI browser.
  const parent=new T.Group(),worker=createMaker(parent),b=worker.inspect().bones;
  const dist=(a,d)=>b[a].getWorldPosition(new T.Vector3()).distanceTo(b[d].getWorldPosition(new T.Vector3()));
  const expected=[dist('UpperArmR','LowerArmR'),dist('LowerArmR','WristR'),dist('UpperArmL','LowerArmL'),dist('LowerArmL','WristL')],checks=[];
  const modes={idle:{action:'idle',station:'desk'},walk:{action:'walk',station:'desk',speed:.76},write:{action:'think',station:'desk'},read:{action:'read',station:'shelf'},carry:{action:'walk',station:'desk',speed:.76,carrying:true},board:{action:'think',station:'board'}};
  let time=0;
  for(const mode of ['idle','walk','write','read','carry','board','write','walk','idle']){let maxDeviation=0,maxBlendError=0;for(let i=0;i<90;i++){time+=1/30;worker.update(1/30,time,modes[mode]);const lengths=[dist('UpperArmR','LowerArmR'),dist('LowerArmR','WristR'),dist('UpperArmL','LowerArmL'),dist('LowerArmL','WristL')];maxDeviation=Math.max(maxDeviation,...lengths.map((v,k)=>Math.abs(v/expected[k]-1)));maxBlendError=Math.max(maxBlendError,Math.abs(Object.values(worker.debug().weights).reduce((a,b)=>a+b,0)-1));for(const bone of Object.values(b))if(!bone.quaternion.toArray().every(Number.isFinite)||!bone.position.toArray().every(Number.isFinite))throw Error('Nonfinite bone');}worker.root.updateMatrixWorld(true);checks.push({mode,maxDeviation,maxBlendError,size:new T.Box3().setFromObject(worker.model).getSize(new T.Vector3()).toArray(),rig:worker.debug().model,skinMeshes:worker.debug().skinnedMeshes});}
  worker.update(.05,time,modes.idle);const at=worker.debug();worker.update(0,time,modes.idle);if(JSON.stringify(at)!==JSON.stringify(worker.debug()))throw Error('Paused pose changed');worker.dispose();return checks;
 });
 for(const c of report){assert.ok(c.maxDeviation<.035,`${c.mode}: arm length changed ${c.maxDeviation}`);assert.ok(c.maxBlendError<1e-6);assert.ok(c.size.every(Number.isFinite));assert.ok(c.size[1]>.9&&c.size[1]<2.4);assert.ok(c.skinMeshes>0);}
 for(const mode of ['idle','write','carry','board']){await page.locator(`[data-motion=${mode}]`).click();await page.evaluate(m=>{zederCharacterCheck.setMode(m);for(let i=0;i<8;i++)zederCharacterCheck.step(.1);},mode);await page.screenshot({path:`${out}/${mode}.png`});}await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/mobile.png`});assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({base,checks:report,errors},null,2));console.log('PASS: 9 skeletal transitions, fixed arm lengths, finite bones, blend normalization, pause, mobile.');
}finally{await browser?.close();server?.kill();}
