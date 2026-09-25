import * as T from '../vendor/three.module.js';
import {random,noise,fbm,coast,ground,radius,HOUSE,LAND} from './math.js';
import {Batch,transform,windMaterial,V} from './craft.js';

export function makeIsland(scene,materials){
 const segments=224,rings=70,positions=[],uvs=[],colors=[],indices=[];
 // Polar top surface; a full triangle fan avoids a seam or a disc floating above the cliff.
 for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,r=j/rings*coast(a),x=LAND.x+Math.cos(a)*r*LAND.rx,z=LAND.z+Math.sin(a)*r*LAND.rz;
  positions.push(x,ground(x,z),z);uvs.push(x*.11,z*.11);
  const c=new T.Color().setHSL(.245+noise(x*.23,z*.23)*.035,.32,.115+fbm(x*.4,z*.4)*.075);c.toArray(colors,colors.length);
 }
 for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
 const top=new T.Mesh(g,new T.MeshStandardMaterial({color:'#c2c4a3',vertexColors:true,roughness:1,side:T.DoubleSide}));top.name='living meadow';top.receiveShadow=true;scene.add(top);
 // Irregular, striated rock wall. The lower rings flare out into the ocean.
 const p=[],u=[],c=[],ids=[],levels=34;
 for(let j=0;j<=levels;j++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,tt=j/levels,r0=coast(a),rimx=LAND.x+Math.cos(a)*r0*LAND.rx,rimz=LAND.z+Math.sin(a)*r0*LAND.rz;
  const base=ground(rimx,rimz),nr=tt===0?0:(noise(i*.16,j*.29)-.5)*.035;
  const rr=r0+(tt*.14)+nr+Math.sin(tt*Math.PI)*(.045*Math.sin(a*21+noise(a*3,7)*3)+.12*(noise(i*.065,9)-.5));
  const x=LAND.x+Math.cos(a)*rr*LAND.rx,z=LAND.z+Math.sin(a)*rr*LAND.rz,y=base*(1-tt)-1.8*tt;
  p.push(x,y,z);u.push(i/segments*18,tt*3);
  const v=fbm(i*.12,j*.21),cc=new T.Color().setHSL(.095+v*.005,.035+v*.035,.26+v*.19);
  if(j<3)cc.lerp(new T.Color('#404730'),(1-j/3)*.65);cc.toArray(c,c.length);
 }
 for(let j=0;j<levels;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;ids.push(a,a+1,b,b,a+1,b+1);}
 const wall=new T.BufferGeometry();wall.setAttribute('position',new T.Float32BufferAttribute(p,3));wall.setAttribute('uv',new T.Float32BufferAttribute(u,2));wall.setAttribute('color',new T.Float32BufferAttribute(c,3));wall.setIndex(ids);wall.computeVertexNormals();const cliff=new T.Mesh(wall,new T.MeshStandardMaterial({color:'#e3e5df',map:materials.stone.map,bumpMap:materials.stone.bumpMap,bumpScale:.4,vertexColors:true,roughness:.98}));cliff.name='weathered sea cliffs';cliff.castShadow=true;cliff.receiveShadow=true;scene.add(cliff);
 // Distant land breaks up the horizon, without stealing focus from the main island.
 const rand=random(189),rocks=new Batch();
 for(let i=0;i<4;i++){const x=-32-i*37,z=-96-i*82;rocks.add(new T.IcosahedronGeometry(1,2),transform([x,-1.0,z],[4+rand()*3,3+rand()*4,4+rand()*4],[0,i*.4,.1]),new T.Color('#929a8c'));}
 rocks.mesh(materials.stone,scene).castShadow=false;
 return {top,cliff};
}

export function makeMeadow(scene,materials,mobile=false){
 const rand=random(432),count=mobile?44000:128000;
 // Seven vertex, curved, genuinely volumetric blades, not a green texture plane.
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-.037,0,0,.037,0,0,-.029,.33,.007,.029,.33,.007,-.013,.7,.04,.013,.7,.04,.025,1,.12],3));geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,.33,1,.33,0,.7,1,.7,.5,1],2));geometry.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);geometry.computeVertexNormals();
 const mesh=new T.InstancedMesh(geometry,materials.grass,count),obj=new T.Object3D(),color=new T.Color();let n=0;
 while(n<count){let x=LAND.x+(rand()-.5)*LAND.rx*2.15,z=LAND.z+(rand()-.5)*LAND.rz*2.15;if(radius(x,z)>.99)continue;if(Math.abs(x-HOUSE.x)<5.15&&z>HOUSE.z-3.55&&z<HOUSE.z+4.1)continue;
  const path=Math.abs(x-(6.2+Math.sin(z*.25)*.8));if(z>0&&z<13&&path<.7&&rand()<.7)continue;
  obj.position.set(x,ground(x,z)-.025,z);obj.rotation.set((rand()-.5)*.16,rand()*Math.PI*2,(rand()-.5)*.2);const h=.12+rand()*.22;obj.scale.set(.7+rand()*.65,h,.7+rand()*.65);obj.updateMatrix();mesh.setMatrixAt(n,obj.matrix);
  const patch=fbm(x*.29,z*.29);color.setHSL(.273+rand()*.035,.4+rand()*.19,.07+patch*.085+rand()*.033);mesh.setColorAt(n,color);n++;
 }
 mesh.name='wind swept grass';mesh.receiveShadow=true;mesh.castShadow=false;mesh.frustumCulled=false;
 const wind=windMaterial(materials.grass,{strength:.24,speed:1.4,grass:true});scene.add(mesh);
 const flowers=new Batch(),stems=new Batch();
 const petals=new T.CircleGeometry(.045,6);
 for(let i=0;i<(mobile?230:560);i++){let x=LAND.x+(rand()-.5)*LAND.rx*1.96,z=LAND.z+(rand()-.5)*LAND.rz*1.96;if(radius(x,z)>.92||Math.abs(x-HOUSE.x)<5.3&&Math.abs(z-HOUSE.z)<4.35)continue;const y=ground(x,z),h=.16+rand()*.27;
  stems.beam([x,y,z],[x+.02,y+h,z],.008);const cc=rand()>.25?new T.Color('#e8e4d5'):new T.Color('#d9bc55');
  for(let k=0;k<5;k++){const a=k*Math.PI*.4;flowers.add(petals,transform([x+Math.cos(a)*.038,y+h,z+Math.sin(a)*.038],[.7,.7,.7],[-Math.PI/2+(rand()-.5)*.4,0,a]),cc);}
 }
 flowers.mesh(materials.flower,scene).castShadow=false;stems.mesh(materials.stem,scene).castShadow=false;
 return {mesh,wind};
}
