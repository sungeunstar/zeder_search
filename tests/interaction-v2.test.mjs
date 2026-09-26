import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {vendorThree} from '../scripts/vendor.mjs';
await vendorThree();
const {createMaker,solveArm}=await import('../public/world/maker.js');
import {createWorkDirector} from '../public/world/work-director.js';
import {workSnapshot} from '../public/world/work-snapshot.js';
import {workFraming} from '../public/world/work-framing.js';
import {readFile} from 'node:fs/promises';
const V=(...v)=>new T.Vector3(...v);
test('Two-link hands preserve upper and lower arm length for reachable and unreachable targets',()=>{
 for(const target of [V(.2,1.27,.71),V(.2,3,3),V(.28,1.4,.09)]){
  const start=V(.28,1.4,.085),p=solveArm(start,target,V(.75,1.2,.2));
  assert.ok(Math.abs(start.distanceTo(p.elbow)-.36)<1e-7);
  assert.ok(Math.abs(p.elbow.distanceTo(p.hand)-.39)<1e-7);
 }
});
test('Maker has named authored clips, attached grip transforms and constrained desktop contact',()=>{
 const room=new T.Group(),m=createMaker(room);m.root.scale.setScalar(1.25);m.root.position.set(-1.24,.405,3.08);m.root.rotation.y=Math.PI+.08;
 const right=V(-1.49,2.015,2.095),left=V(-.99,2.003,2.10);
 for(let i=0;i<180;i++)m.update(1/60,i/60,{action:'think',station:'desk',speed:0,elapsed:i/60},{right,left,pen:true});
 assert.ok(m.root.animations.length>=6);assert.equal(m.debug().clip,'write');assert.ok(m.debug().seated>.98);
 assert.ok(m.debug().maxReachClamp<.05,`reach clamp ${m.debug().maxReachClamp}`);
 assert.ok(V(...m.debug().right).distanceTo(right)<.055);
 assert.equal(m.debug().pencil,true);
});
test('Restored request shows actual first action, offer and tools instead of mislabelling the goal as an offer',()=>{
 const s=workSnapshot({id:'t',status:'reviewed',reviewedVersion:1,messages:[],versions:[{version:1,plan:{goal:'goal',offer:'offer',paths:[{action:'first',tools:['interview','tracker']}]}}]});
 assert.equal(s.offer,'offer');assert.equal(s.firstAction,'first');assert.deepEqual(s.tools,['interview','tracker']);
});
test('Camera cue stays within two degrees and is disabled for ambient work, walking and reduced motion',()=>{
 const p={action:'think',station:'board'};const c=workFraming(p);assert.ok(Math.abs(c.yaw)<Math.PI/90);assert.ok(Math.hypot(...c.offset)<.5);
 for(const [pose,opts]of [[{...p,ambient:true},{}],[{...p,action:'walk'},{}],[p,{reduced:true}]])assert.equal(workFraming(pose,opts).yaw,0);
 assert.ok(Math.abs(workFraming(p,{mobile:true}).yaw)<Math.abs(c.yaw));
});
test('Walking turns before accelerating and does not teleport or manufacture progress',()=>{
 const d=createWorkDirector();d.observe({stage:'thinking',threadId:'t',generationId:'a',task:'audience'});
 let prev=d.view().position;
 for(let i=0;i<250;i++){const s=d.update(.05);assert.ok(Math.hypot(s.position[0]-prev[0],s.position[2]-prev[2])<.13);assert.equal(s.processing,true);assert.equal(s.resultAvailable,false);prev=s.position;}
 assert.equal(d.view().station,'board');
});
test('Production loader uses CSP-compatible external JS and real scene readiness, not a fabricated completion timeout',async()=>{
 const html=await readFile('public/index.html','utf8'),loader=await readFile('public/workshop-loader.js','utf8'),world=await readFile('public/world/atelier.js','utf8');
 assert.match(html,/src="\/workshop-loader.js"/);assert.doesNotMatch(html,/<script>(.|\n)*?<\/script>/);
 assert.match(loader,/dataset.ready==='true'/);assert.doesNotMatch(loader,/setInterval/);assert.match(world,/await checkpoint/);
});
