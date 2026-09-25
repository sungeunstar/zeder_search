import * as T from '../vendor/three.module.js';
import {random,ground} from './math.js';
import {Batch,V,leafGeometry,windMaterial} from './craft.js';
export function trees(scene,m,mobile=false,customLayout=null){
 const rnd=random(374),wood=new Batch(),leaves=[];
 const layout=customLayout||[[-10.5,4.7,1.03],[-9,-5.3,.83],[-9,-10.8,.81],[3.7,-9.5,.85],[9.1,-8.1,.99],[14,-6.8,1.01],[15.7,.4,.88],[-17,-2,.77]];
 function branch(a,b,r,depth,s){wood.beam(a.toArray(),b.toArray(),r,new T.Color().setHSL(.105,.12,.52+rnd()*.18));
  if(depth<=2)leaves.push({center:b.clone().lerp(a,.23),scale:s*.9});if(depth===0){leaves.push({center:b,scale:s});return;}
  const vec=b.clone().sub(a),cnt=depth===3?3:2;
  for(let i=0;i<cnt;i++){const angle=rnd()*Math.PI*2,side=.9+depth*.23,dir=V(Math.cos(angle)*side,.65+rnd()*.8,Math.sin(angle)*side).normalize();dir.lerp(vec.clone().normalize(),.17).normalize();branch(b,b.clone().addScaledVector(dir,vec.length()*(.63+rnd()*.13)),r*.57,depth-1,s);}
 }
 for(const [x,z,s] of layout){const y=ground(x,z),root=V(x,y,z);branch(root,root.clone().add(V(.22*s,3.05*s,.13)),.48*s,3,s);
  for(let i=0;i<5;i++){const a=i*1.256;wood.beam([x+Math.cos(a)*.72*s,y-.05,z+Math.sin(a)*.72*s],[x,y+.6*s,z],.12*s,'#847864');}}
 wood.mesh(m.bark,scene);
 const per=mobile?80:145,count=leaves.length*per,mesh=new T.InstancedMesh(leafGeometry(),m.leaves,count),obj=new T.Object3D(),cc=new T.Color();let k=0;
 for(const {center,scale} of leaves)for(let j=0;j<per;j++){
  const a=rnd()*6.283,c=rnd()*2-1,r=Math.cbrt(rnd())*(.8+rnd()*.6)*scale,ss=Math.sqrt(1-c*c);
  obj.position.copy(center).add(V(Math.cos(a)*r*ss,c*r*.85,Math.sin(a)*r*ss));obj.rotation.set(rnd()*Math.PI,rnd()*Math.PI*2,rnd()*Math.PI*2);const size=(.48+rnd()*.41)*scale;obj.scale.set(size,size,size);obj.updateMatrix();mesh.setMatrixAt(k,obj.matrix);
  cc.setHSL(.23+rnd()*.07,.30+rnd()*.20,.145+rnd()*.145);mesh.setColorAt(k++,cc);
 }
 mesh.name='individual wind animated leaves';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);const wind=windMaterial(m.leaves,{strength:.07,speed:.78});
 return {mesh,wind,count};
}

