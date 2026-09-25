import {surfaceMaps} from './surfaces.js';
import * as T from '../vendor/three.module.js';
import {random,noise,fbm,ground,radius,HOUSE,LAND,coast,smooth,clamp} from './math.js';
import {Batch,transform,windMaterial,V} from './craft.js';

/** A continuous heightfield joins soil, eroded rock and submerged seabed.
 * There is no separate vertical wall or constant-height circumference. */
export function makeIsland(scene,materials){
 const nx=224,nz=180,spanX=86,spanZ=72,p=[],uv=[],cols=[],ids=[];
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=LAND.x+(i/nx-.5)*spanX,z=LAND.z+(j/nz-.5)*spanZ,y=ground(x,z);

  const dx=(ground(x+.2,z)-ground(x-.2,z))/.4,dz=(ground(x,z+.2)-ground(x,z-.2))/.4;
  const steep=smooth((Math.hypot(dx,dz)-.8)/2.4);const fracture=(fbm(x*.59+23,z*.53+y*.21)-.5)*2.8*steep;
  const length=Math.hypot(dx,dz)||1;p.push(x-dx/length*fracture,y+Math.sin(x*.8+z*.73)*.24*steep,z-dz/length*fracture);uv.push(x*.21,z*.21);
  const flat=1/Math.sqrt(1+dx*dx+dz*dz),n=fbm(x*.43,z*.43),r=radius(x,z);
  const grass=smooth((flat-.46)/.33)*(1-smooth((r-.83)/.27));
  const rock=new T.Color('#8b877c').lerp(new T.Color('#beb6a1'),n);
  const soil=new T.Color('#354728').lerp(new T.Color('#63723d'),fbm(x*.15+20,z*.15));
  // Footpath is worn dirt, not an untextured strip of grass.
  const path=Math.abs(x-(HOUSE.x+Math.sin(z*.26)*1.1));
  if(z>HOUSE.z+3.6&&z<14&&path<1.1)soil.lerp(new T.Color('#958360'),(1-smooth(path/1.1))*.64);
  rock.lerp(soil,grass);rock.multiplyScalar(.83+n*.28);
  if(y<1.5)rock.lerp(new T.Color('#434d4a'),.34);new T.Color('#ffffff').multiplyScalar(.86+n*.2).toArray(cols,cols.length);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;ids.push(a,b,a+1,a+1,b,b+1);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.setIndex(ids);geo.computeVertexNormals();
 const terrainMaterial=materials.stone.clone();terrainMaterial.color.set('#ffffff');terrainMaterial.bumpMap=null;terrainMaterial.normalMap=null;terrainMaterial.roughness=1;terrainMaterial.side=T.FrontSide;
 // Project the granular rock texture in 3 axes. Steep faces must not stretch the top UVs.
 terrainMaterial.onBeforeCompile=s=>{
  s.uniforms.uMeadow={value:surfaceMaps.aerial_grass_rock.diffuse};s.uniforms.uMeadowNormal={value:surfaceMaps.aerial_grass_rock.normal};s.uniforms.uRockNormal={value:surfaceMaps.rock_face.normal};
  s.vertexShader='varying vec3 vTerrainP; varying vec3 vTerrainN;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainP=position;vTerrainN=normal;');
  s.fragmentShader='varying vec3 vTerrainP; varying vec3 vTerrainN; uniform sampler2D uMeadow,uMeadowNormal,uRockNormal;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec3 bn=normalize(vTerrainN);vec3 w=pow(abs(bn),vec3(4.));w/=max(dot(w,vec3(1.)),.001);
   vec3 rockTex=texture2D(map,vTerrainP.yz*.18).rgb*w.x+texture2D(map,vTerrainP.xz*.18).rgb*w.y+texture2D(map,vTerrainP.xy*.18).rgb*w.z;
   vec3 meadowTex=texture2D(uMeadow,vTerrainP.xz*.072).rgb;
   float planted=smoothstep(.47,.85,bn.y)*smoothstep(10.,18.5,vTerrainP.y);
   diffuseColor.rgb*=mix(mix(vec3(dot(rockTex,vec3(.2126,.7152,.0722))),rockTex,.1)*vec3(1.3,1.27,1.21),meadowTex*vec3(.88,.96,.82),planted);`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`vec3 nx=texture2D(uRockNormal,vTerrainP.yz*.18).xyz*2.-1.;
   vec3 ny=texture2D(uRockNormal,vTerrainP.xz*.18).xyz*2.-1.;vec3 nz=texture2D(uRockNormal,vTerrainP.xy*.18).xyz*2.-1.;
   ny=mix(ny,texture2D(uMeadowNormal,vTerrainP.xz*.072).xyz*2.-1.,planted);
   vec3 wn=normalize(vec3(nx.z*sign(bn.x),nx.x,nx.y)*w.x+vec3(ny.x,ny.z*sign(bn.y),ny.y)*w.y+vec3(nz.x,nz.y,nz.z*sign(bn.z))*w.z);
   normal=normalize(mix(normal,mat3(viewMatrix)*wn,.65));`);
 };
 terrainMaterial.customProgramCacheKey=()=> 'eroded-headland-triplanar-v2';
 const terrain=new T.Mesh(geo,terrainMaterial);terrain.name='continuous eroded coastal headland';terrain.receiveShadow=true;terrain.castShadow=true;scene.add(terrain);
 // Weathered, irregular buttresses interrupt the silhouette at different heights.
 const rand=random(931),outcrops=new Batch();
 function crag(x,y,z,sx,sy,sz,seed){const g=new T.IcosahedronGeometry(1,3),a=g.attributes.position;
  for(let i=0;i<a.count;i++){const vx=a.getX(i),vy=a.getY(i),vz=a.getZ(i);const dent=.80+fbm(vx*2.4+seed,vz*2.4+vy)*.31+.07*Math.sin(vy*8+vx*4);a.setXYZ(i,vx*dent,vy*(.88+.14*noise(vx*4+seed,vz*4)),vz*dent);}
  g.computeVertexNormals();outcrops.add(g,transform([x,y,z],[sx,sy,sz],[.06*(rand()-.5),rand()*2,.12*(rand()-.5)]),new T.Color('#ffffff').multiplyScalar(.94+rand()*.12));g.dispose();}
 for(let i=0;i<38;i++){const angle=i/38*Math.PI*2+.045*(rand()-.5),r=(.76+rand()*.40)*coast(angle),x=LAND.x+Math.cos(angle)*r*LAND.rx,z=LAND.z+Math.sin(angle)*r*LAND.rz;
  const y=ground(x,z),sy=.9+rand()*3.5;
  crag(x,y-sy*.92,z,.7+rand()*1.55,sy,.7+rand()*1.5,i*7);
 }
 // A handful of low embedded stones, not a ring of identical rocks.
 for(let i=0;i<22;i++){const x=-7+rand()*27,z=-10+rand()*22;if(Math.abs(x-HOUSE.x)<5.5&&Math.abs(z-HOUSE.z)<4.9)continue;
  const s=.18+rand()*.63;crag(x,ground(x,z)-s*.42,z,s*(1+rand()),s,s*1.25,310+i);}
 const rockMesh=outcrops.mesh(materials.stone,scene);rockMesh.name='weathered exposed outcrops';
 const distant=new Batch();for(let i=0;i<4;i++){const x=-27-i*31,z=-61-i*73;const g=new T.IcosahedronGeometry(1,3),a=g.attributes.position;for(let k=0;k<a.count;k++){const y=a.getY(k);a.setY(k,y*(1+.22*Math.sin(a.getX(k)*8)));}g.computeVertexNormals();distant.add(g,transform([x,-1.6,z],[5+i*.7,4+i*.8,3.8+i],[.1,i*.5,.15]),'#809287');g.dispose();}distant.mesh(materials.stone,scene).castShadow=false;
 return {top:terrain,cliff:terrain};
}

export function makeMeadow(scene,materials,mobile=false){
 const rand=random(432),count=mobile?44000:128000;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-.032,0,0,.032,0,0,-.026,.33,.016,.026,.33,.016,-.011,.70,.06,.011,.70,.06,.035,1,.15],3));geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,.33,1,.33,0,.7,1,.7,.5,1],2));geometry.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);geometry.computeVertexNormals();
 const mesh=new T.InstancedMesh(geometry,materials.grass,count),obj=new T.Object3D(),color=new T.Color();let n=0;
 while(n<count){let x=LAND.x+(rand()-.5)*LAND.rx*1.98,z=LAND.z+(rand()-.5)*LAND.rz*1.98,r=radius(x,z);if(r>.97)continue;
  if(Math.abs(x-HOUSE.x)<5.06&&z>HOUSE.z-3.65&&z<HOUSE.z+4.09)continue;
  const slope=Math.hypot(ground(x+.15,z)-ground(x-.15,z),ground(x,z+.15)-ground(x,z-.15))/.3;if(slope>2.4||rand()>1-.55*smooth((r-.7)/.3))continue;
  const path=Math.abs(x-(HOUSE.x+Math.sin(z*.26)*1.1));if(z>HOUSE.z+3.9&&z<14&&path<.8&&rand()<.92)continue;
  const cluster=fbm(x*.42,z*.42);if(cluster<.40&&rand()<.65)continue;
  obj.position.set(x,ground(x,z)-.015,z);obj.rotation.set((rand()-.5)*.27,rand()*Math.PI*2,(rand()-.5)*.24);const h=.12+rand()*.17+cluster*.06;obj.scale.set(.65+rand()*.5,h,.8);obj.updateMatrix();mesh.setMatrixAt(n,obj.matrix);
  color.setHSL(.274+rand()*.039,.34+rand()*.19,.085+cluster*.105+rand()*.025);mesh.setColorAt(n,color);n++;
 }
 mesh.name='wind swept grass';mesh.receiveShadow=true;mesh.castShadow=false;mesh.frustumCulled=false;
 const wind=windMaterial(materials.grass,{strength:.24,speed:1.4,grass:true});scene.add(mesh);
 const flowers=new Batch(),stems=new Batch();const petal=new T.SphereGeometry(1,5,3);const seedHead=new T.SphereGeometry(.045,5,4);
 // Patches of daisies at the soil/rock edge soften the boundary in silhouette.
 for(let i=0;i<(mobile?380:1250);i++){const x=-12+rand()*43,z=-19+rand()*34,r=radius(x,z);if(r>.94||Math.abs(x-HOUSE.x)<5.2&&Math.abs(z-HOUSE.z)<4.55)continue;if(fbm(x*.28+30,z*.28)<.50)continue;
  const y=ground(x,z),h=.22+rand()*.38;stems.beam([x,y,z],[x+.018,y+h,z],.009,'#566334');const white=rand()>.27?'#f3eee1':'#ddcc6a';
  for(let k=0;k<6;k++){const a=k*Math.PI/3;flowers.add(petal,transform([x+Math.cos(a)*.058,y+h,z+Math.sin(a)*.058],[.062,.012,.032],[0,-a,0]),white);}
  flowers.add(seedHead,transform([x,y+h+.007,z],[.7,.30,.7]),'#c79a2d');
 }
 flowers.mesh(materials.flower,scene).castShadow=false;stems.mesh(materials.stem,scene).castShadow=false;
 return {mesh,wind};
}
