import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCE_SPECTRUM,WAVES,SEA,waveAt,heightAt,spectrumGLSL} from '../public/world/sea-spectrum.js';
import {TIME_PRESETS,lightState,approachPhase,cameraOrbit} from '../public/world/environment-state.js';
import {readFile} from 'node:fs/promises';
test('TOMOB spectrum retains 12 direction/frequency bands; calmly scaled',()=>{
 assert.equal(SOURCE_SPECTRUM.length,12);assert.equal(WAVES.length,12);assert.equal(SOURCE_SPECTRUM[0].f,.011);
 assert.ok(WAVES.reduce((n,w)=>n+w.amplitude,0)<1.0);assert.ok(SEA.steepness<.38);
 assert.equal((spectrumGLSL.match(/float phase=/g)||[]).length,12);
});
test('Water CPU function is bounded, continuous and actually changes with time',()=>{
 const a=waveAt(8,-15,1),b=waveAt(8,-15,2);assert.notEqual(a.height,b.height);
 for(let i=0;i<100;i++){const x=i*.53,z=-i*.21,t=i*.04;const q=waveAt(x,z,t);assert.ok(Math.abs(q.height)<1.1);assert.ok(q.slope.every(Number.isFinite));assert.ok(Math.abs(q.height-waveAt(x+.001,z,t).height)<.005);assert.ok(Number.isFinite(heightAt(x,z,t)));}
});
test('Height query solves inverse horizontal Gerstner displacement',()=>{
 for(const [x,z,t]of [[0,0,0],[10,-4,6],[-12,6,2]]){const p=waveAt(x,z,t);assert.ok(Math.abs(heightAt(x+p.displacement[0],z+p.displacement[1],t)-p.height)<.0001);}
});
test('Invalid wave coordinates cannot enter shaders or physics queries',()=>{assert.throws(()=>waveAt(NaN,0));assert.throws(()=>heightAt(0,Infinity));});
test('Day and night are different lighting states; dusk remains lit',()=>{
 const d=lightState(TIME_PRESETS.day),n=lightState(TIME_PRESETS.night),s=lightState(TIME_PRESETS.sunset);
 assert.equal(d.night,0);assert.equal(n.night,1);assert.equal(n.sun,0);assert.ok(n.moon>0);assert.ok(s.sun>1);assert.ok(s.dusk>.3);assert.ok(n.hemi>.3);assert.ok(n.lamps>d.lamps);assert.ok(n.stars>d.stars);
});
test('Time wrap and frame-rate-independent easing are stable',()=>{assert.deepEqual(lightState(.25),lightState(1.25));const a=approachPhase(.24,.74,.5),b=approachPhase(approachPhase(.24,.74,.25),.74,.25);assert.ok(Math.abs(a-b)<1e-10);assert.throws(()=>lightState(Infinity));});
test('Mouse motion orbits, it does not change camera-target distance',()=>{
 const base=[-7.2,26.9,27],target=[1.6,24,-3.2],distance=p=>Math.hypot(...p.map((v,i)=>v-target[i]));
 const left=cameraOrbit(base,target,[-1,0]),right=cameraOrbit(base,target,[1,0]);
 assert.ok(Math.abs(left[0]-right[0])>4);assert.ok(Math.abs(distance(left)-distance(base))<1e-10);assert.deepEqual(cameraOrbit(base,target,[10,0]),right);
});
test('Scene observes reduced motion, pointerleave, time preference and honest work states',async()=>{
 const src=await readFile('public/world/atelier.js','utf8'),ctrl=await readFile('public/world-controller.js','utf8');
 assert.match(src,/prefers-reduced-motion/);assert.match(src,/pointerleave/);assert.match(src,/zeder.scene.time.v1/);assert.match(src,/shop.setNight/);assert.match(ctrl,/aria-pressed/);
});
test('Day/night scene uses same atmosphere in sea reflection; no backdrop photo',async()=>{
 const src=await readFile('public/world/atmosphere.js','utf8');assert.match(src,/spectrumGLSL/);assert.match(src,/wp.xz\+=displacement/);assert.match(src,/skyColor\(R\)/);assert.match(src,/uMoonDir/);assert.doesNotMatch(src,/TextureLoader|\.jpg|\.mp4/);
});
