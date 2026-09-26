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

 const contacts=await page.evaluate(async()=>{
 const T=await import('/vendor/three.module.js'),{createMaker}=await import('/world/rigged-maker.js'),V=(...a)=>new T.Vector3(...a);
 const parent=new T.Group(),worker=createMaker(parent),{bones,book}=worker.inspect();
 const modes={write:{action:'think',station:'desk'},read:{action:'read',station:'shelf'},carry:{action:'walk',station:'desk',speed:.76,carrying:true}};
 const checks=[];let clock=0;
 for(const name of ['write','read','carry']){
  for(let i=0;i<120;i++){clock+=1/30;worker.update(1/30,clock,modes[name]);}
  let minTipY=9,maxTipY=-9,maxPenGripGap=0,maxDepth=0,interiorVertices=0;
  for(let sample=0;sample<8;sample++){
   for(let i=0;i<18;i++){clock+=1/30;worker.update(1/30,clock,modes[name]);}
   parent.updateMatrixWorld(true);const d=worker.debug();
   if(name==='write'){
    minTipY=Math.min(minTipY,d.penTip[1]);maxTipY=Math.max(maxTipY,d.penTip[1]);
    maxPenGripGap=Math.max(maxPenGripGap,V(...d.fingerTips.Index4R).distanceTo(V(...d.fingerTips.Thumb3R)));
   }else{
    for(const mesh of worker.model.getObjectsByProperty('isSkinnedMesh',true)){
     const pos=mesh.geometry.attributes.position,indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
     for(let i=0;i<pos.count;i++){
      let handWeight=0;for(let k=0;k<4;k++)if(/Index|Middle|Ring|Pinky|Thumb/.test(mesh.skeleton.bones[indices.getComponent(i,k)]?.name))handWeight+=weights.getComponent(i,k);
      if(handWeight<.5)continue;
      const v=V().fromBufferAttribute(pos,i);mesh.applyBoneTransform(i,v);mesh.localToWorld(v);book.worldToLocal(v);
      // Conservative cover volume, including the pages. 2 mm tolerance for surface contact.
      const depth=Math.min(.175-Math.abs(v.x),.1225-Math.abs(v.y),.019-Math.abs(v.z));
      if(depth>.002){interiorVertices++;maxDepth=Math.max(maxDepth,depth);}
     }
    }
   }
  }
  checks.push({mode:name,minTipY:name==='write'?minTipY:null,maxTipY:name==='write'?maxTipY:null,maxPenGripGap,interiorVertices,maxDepth});
 }
 worker.dispose();return checks;
});
 for(const c of contacts){
  if(c.mode==='write'){
   assert.ok(c.minTipY>=1.254&&c.maxTipY<=1.273,`Writing nib left paper plane: ${JSON.stringify(c)}`);
   assert.ok(c.maxPenGripGap<.028,`Fingers do not pinch the pen: ${c.maxPenGripGap}`);
  }else assert.equal(c.interiorVertices,0,`${c.mode}: fingers enter the book interior: ${JSON.stringify(c)}`);
 }
 await writeFile(`${out}/contacts.json`,JSON.stringify(contacts,null,2));
 console.log('PASS: writing nib stays on/just above paper; closed pinch; read and walking-carry grips avoid book interior at 8 sampled times.');

 for(const mode of ['idle','write','carry','board']){await page.locator(`[data-motion=${mode}]`).click();await page.evaluate(m=>{zederCharacterCheck.setMode(m);for(let i=0;i<8;i++)zederCharacterCheck.step(.1);},mode);await page.screenshot({path:`${out}/${mode}.png`});}await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/mobile.png`});assert.deepEqual(errors,[]);await writeFile(`${out}/checks.json`,JSON.stringify({base,checks:report,errors},null,2));console.log('PASS: 9 skeletal transitions, fixed arm lengths, finite bones, blend normalization, pause, mobile.');
}finally{await browser?.close();server?.kill();}
