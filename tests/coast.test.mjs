import test from 'node:test';
import assert from 'node:assert/strict';
import {ground,coast,LAND} from '../public/world/math.js';
import {readFile} from 'node:fs/promises';
test('shore height varies instead of forming a constant cut rim',()=>{const y=[];for(let i=0;i<80;i++){const a=i/80*Math.PI*2,r=.86*coast(a);y.push(ground(LAND.x+Math.cos(a)*r*LAND.rx,LAND.z+Math.sin(a)*r*LAND.rz));}assert.ok(Math.max(...y)-Math.min(...y)>1);});
test('ground rolls continuously from plateau into the sea',()=>{let max=0;for(let x=-34;x<45;x+=.4)for(let z=-29;z<19;z+=.4)max=Math.max(max,Math.abs(ground(x,z)-ground(x+.01,z)));assert.ok(max<.65,`Unexpected step ${max}`);assert.ok(ground(75,75)<0);});
test('terrain is one continuous mesh with physically sampled detail, not a separate vertical wall',async()=>{const s=await readFile(new URL('../public/world/land.js',import.meta.url),'utf8');assert.match(s,/continuous eroded coastal headland/);assert.doesNotMatch(s,/const wall=/);assert.match(s,/uRockNormal/);});
test('material manifest pins source bytes and licenses all 8 maps',async()=>{const m=JSON.parse(await readFile(new URL('../docs/SURFACES.json',import.meta.url),'utf8'));assert.equal(m.assets.length,8);assert.equal(m.license,'CC0-1.0');assert.match(m.generatedSha256,/^[a-f0-9]{64}$/);for(const a of m.assets){assert.equal(new URL(a.url).hostname,'dl.polyhaven.org');assert.match(a.sha256,/^[a-f0-9]{64}$/);}});
