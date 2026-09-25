import * as T from '../vendor/three.module.js';
import {ground,radius,random,HOUSE} from './math.js';
import {Batch,V,transform,leafGeometry,windMaterial} from './craft.js';

// Low coastal shrubs grow across the soil/stone transition, rather than ending at a rim.
export function coastalPlants(scene,m){
 const rnd=random(620),patches=[],twigs=new Batch();
 for(let i=0;i<165;i++){
  const x=-12+rnd()*40,z=-14+rnd()*26,r=radius(x,z);
  if(r<.55||r>.96||Math.abs(x-HOUSE.x)<5.9&&Math.abs(z-HOUSE.z)<5.2)continue;
  const y=ground(x,z);if(y<10)continue;
  const s=.45+rnd()*.58;patches.push({x,y,z,s});
  for(let j=0;j<5;j++){const a=j*1.256;twigs.beam([x,y-.06,z],[x+Math.cos(a)*.4*s,y+.40*s,z+Math.sin(a)*.4*s],.013*s,'#776d48');}
 }
 const per=90,mesh=new T.InstancedMesh(leafGeometry(),m.leaves.clone(),patches.length*per),o=new T.Object3D(),c=new T.Color();let n=0;
 mesh.material.color.set('#d1d3ab');
 for(const {x,y,z,s}of patches)for(let j=0;j<per;j++){
  const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*.65*s;
  o.position.set(x+Math.cos(a)*r,y+(.10+Math.sqrt(Math.max(0,1-r/(.68*s)))*.6)*s,z+Math.sin(a)*r);o.rotation.set(-.4+rnd()*1.7,a,rnd()*.6);const sz=(.19+rnd()*.22)*s;o.scale.set(sz,sz*1.25,sz);o.updateMatrix();mesh.setMatrixAt(n,o.matrix);
  c.setHSL(.24+rnd()*.065,.38+rnd()*.18,.11+rnd()*.14);mesh.setColorAt(n++,c);
 }
 mesh.name='coastal shrubs across the eroded edge';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);twigs.mesh(m.timber,scene);
 const wind=windMaterial(mesh.material,{strength:.025,speed:.82});
 return {wind,count:n};
}
