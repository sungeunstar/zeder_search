/** Quaternius CC0 skinned Farmer. Original gait, authored workstation key poses. */
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {clone as cloneSkeleton} from '../vendor/SkeletonUtils.js';
import {toCreasedNormals} from '../vendor/BufferGeometryUtils.js';
const V=(...a)=>new T.Vector3(...a);
let asset=null,loading=null;
const PALETTE={Skin:'#c99c78',LightBlue:'#596b62',Brown:'#ded6bf',Beige:'#a99776',Brown2:'#665340',Eyebrows:'#473e31',Red:'#5d4b38',Eye:'#262b28'};
export async function loadMakerAsset(){
 if(asset)return asset;
 if(!loading)loading=(async()=>{
  const data=await new GLTFLoader().loadAsync(new URL('../models/maker.glb',import.meta.url).href);
  const smoothed=new Map();
  data.scene.traverse(o=>{
   if(!o.isMesh)return;
   if(!smoothed.has(o.geometry))smoothed.set(o.geometry,toCreasedNormals(o.geometry,Math.PI*.32));
   o.geometry=smoothed.get(o.geometry);
   const restyle=m=>{
    const n=m.clone();n.color.set(PALETTE[m.name]||'#a09479');
    if(/Feet/.test(o.parent.name))n.color.set(m.name==='Brown'?'#66523e':'#4d4035');
    n.roughness=.90;n.metalness=0;n.flatShading=false;
    if(m.name==='Brown'&&o.parent.name==='Farmer_Body'){
     const geo=o.geometry.clone(),colors=new Float32Array(geo.attributes.position.count*3);
     const base=new T.Color('#ded6bf'),skin=new T.Color('#c99c78'),j=geo.attributes.skinIndex,w=geo.attributes.skinWeight;
     for(let i=0;i<j.count;i++){
      let influence=0;for(let k=0;k<4;k++){const index=j.getComponent(i,k),name=o.skeleton.bones[index]?.name||'';if(/^(Wrist|Index|Middle|Ring|Pinky|Thumb)/.test(name))influence+=w.getComponent(i,k);}
      base.clone().lerp(skin,T.MathUtils.smoothstep(influence,.10,.9)).toArray(colors,i*3);
     }
     geo.setAttribute('color',new T.BufferAttribute(colors,3));o.geometry=geo;n.color.set('#ffffff');n.vertexColors=true;
    }
    return n;
   };
   o.material=Array.isArray(o.material)?o.material.map(restyle):restyle(o.material);
   o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
  });
  asset=data;return data;
 })().catch(e=>{loading=null;throw e;});
 return loading;
}
function safeDt(dt){return Number.isFinite(dt)?Math.max(0,Math.min(.10,dt)):0;}
function angle(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
export function createMaker(parent){
 if(!asset)throw new Error('Load the skinned maker before constructing the workshop.');
 const root=new T.Group();root.name='rigged-workshop-maker';
 const model=cloneSkeleton(asset.scene);root.add(model);
 const bones=Object.fromEntries(model.getObjectsByProperty('isBone',true).map(b=>[b.name,b]));
 const mixer=new T.AnimationMixer(model);
 const neutral=asset.animations.find(c=>c.name==='Idle_Neutral'),walk=asset.animations.find(c=>c.name==='Walk');
 if(!neutral||!walk||!bones.WristR||!bones.WristL)throw new Error('Incomplete workshop character rig');
 const sampling=new T.AnimationMixer(model),sample=sampling.clipAction(neutral);sample.play();sampling.setTime(0);model.updateMatrixWorld(true);
 const rest=Object.fromEntries(Object.entries(bones).map(([n,b])=>[n,{position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()}]));
 // Authoring only. Runtime animation never pulls joints toward props or scales limbs.
 function reset(){for(const [n,b]of Object.entries(bones)){b.position.copy(rest[n].position);b.quaternion.copy(rest[n].quaternion);b.scale.copy(rest[n].scale);}model.updateMatrixWorld(true);}
 function aimBone(b,target){const origin=b.getWorldPosition(V()),next=b.children.find(x=>x.isBone);if(!next)return;
  const from=next.getWorldPosition(V()).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
  const worldQ=b.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromUnitVectors(from,to));
  b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(worldQ));model.updateMatrixWorld(true);
 }
 function arm(side,point,pole,wristForward){
  const u=bones['UpperArm'+side],l=bones['LowerArm'+side],w=bones['Wrist'+side],s=u.getWorldPosition(V());
  const L1=s.distanceTo(l.getWorldPosition(V())),L2=l.getWorldPosition(V()).distanceTo(w.getWorldPosition(V()));
  const dir=V(...point).sub(s),d=T.MathUtils.clamp(dir.length(),Math.abs(L1-L2)+.012,L1+L2-.012);dir.normalize();
  const p=V(...pole).sub(s);p.addScaledVector(dir,-p.dot(dir)).normalize();
  const a=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-a*a));
  const e=s.clone().addScaledVector(dir,a).addScaledVector(p,h),end=s.clone().addScaledVector(dir,d);
  aimBone(u,e);aimBone(l,end);
  const y=V(...wristForward).normalize(),x=V(-1,0,0),z=x.clone().cross(y).normalize();x.copy(y).cross(z).normalize();
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  w.quaternion.copy(w.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));model.updateMatrixWorld(true);
 }
 function author(name,duration,kind){
  const count=17,times=[],values=new Map();
  for(let i=0;i<count;i++){
   reset();const t=duration*i/(count-1),phase=t/duration*Math.PI*2;times.push(t);
   if(kind==='write'){
    const stroke=Math.sin(phase*2)*.010*(i>12?0:1);
    arm('R',[-.20+stroke,1.36,.354],[-.48,1.13,.12],[0,-.45,.90]);
    arm('L',[.19,1.34,.341],[.43,1.13,.10],[0,-.50,.866]);
    bones.Head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.19+Math.sin(phase)*.014,.025,0)));
   }else if(['read','carry','present'].includes(kind)){
    const y=kind==='present'?1.28:1.23,z=kind==='read'?.31:.34;
    arm('R',[-.19,y,z],[-.48,1.12,.09],[.18,.19,.97]);arm('L',[.19,y,z],[.48,1.12,.09],[-.18,.19,.97]);
    bones.Head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(kind==='read'?.13:.02,Math.sin(phase)*.025,0)));
   }else if(kind==='board'){
    arm('R',[-.24,1.55,.33],[-.52,1.30,.08],[0,.75,.66]);
    bones.Head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.08,-.045,0)));
   }
   if(['write','board','read','carry','present'].includes(kind))for(const side of kind==='write'||kind==='board'?['R']:['R','L'])for(const finger of ['Index','Middle','Ring','Pinky'])for(const digit of [2,3]){
    const b=bones[finger+digit+side];if(b)b.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(finger==='Index'?-.32:-.70,0,0)));
   }
   for(const [n,b]of Object.entries(bones)){let arr=values.get(n);if(!arr){arr={q:[],p:[],s:[]};values.set(n,arr);}arr.q.push(...b.quaternion.toArray());arr.p.push(...b.position.toArray());arr.s.push(...b.scale.toArray());}
  }
  const tracks=[];for(const [n,v]of values)tracks.push(new T.QuaternionKeyframeTrack(n+'.quaternion',times,v.q),new T.VectorKeyframeTrack(n+'.position',times,v.p),new T.VectorKeyframeTrack(n+'.scale',times,v.s));
  return new T.AnimationClip(name,duration,tracks);
 }
 const clips=[neutral,walk,author('Desk_Write',4.8,'write'),author('Read',4,'read'),author('Carry',3.2,'carry'),author('Present',3.6,'present'),author('Board',4.2,'board')];
 sampling.stopAllAction();reset();sampling.uncacheRoot(model);
 const carry=clips.find(c=>c.name==='Carry'),walkCarry=walk.clone();walkCarry.name='Walk_Carry';walkCarry.tracks=walkCarry.tracks.filter(t=>!/^(UpperArm|LowerArm|Wrist)/.test(t.name));
 for(const t of carry.tracks)if(/^(UpperArm|LowerArm|Wrist)/.test(t.name)){const track=t.clone();track.scale(walk.duration/carry.duration);walkCarry.tracks.push(track);}clips.push(walkCarry);
 const actions=Object.fromEntries(clips.map(c=>[c.name,mixer.clipAction(c)]));let current='Idle_Neutral',walkDistance=0,lastTurn=root.rotation.y;
 for(const a of Object.values(actions)){a.enabled=true;a.setEffectiveWeight(0);a.play();}actions[current].setEffectiveWeight(1);mixer.update(0);
 const leftGrip=new T.Object3D(),rightGrip=new T.Object3D();root.add(leftGrip,rightGrip);
 const pencil=new T.Group();pencil.name='wrist-attached-pencil';bones.WristR.add(pencil);
 const shaft=new T.Mesh(new T.CylinderGeometry(.009,.009,.19,8),new T.MeshStandardMaterial({color:'#a27642',roughness:.8}));
 const tip=new T.Mesh(new T.ConeGeometry(.009,.037,8),new T.MeshStandardMaterial({color:'#343d35',roughness:.9}));tip.position.y=-.112;tip.rotation.z=Math.PI;
 pencil.add(shaft,tip);pencil.position.set(.01,.12,.022);pencil.quaternion.setFromUnitVectors(V(0,1,0),V(-.12,-.64,.758).normalize());pencil.traverse(o=>{if(o.isMesh)o.castShadow=true;});pencil.visible=false;
 const book=new T.Group();book.name='held-reference-notebook';root.add(book);book.visible=false;
 const cover=new T.Mesh(new T.BoxGeometry(.43,.29,.028),new T.MeshStandardMaterial({color:'#55736f',roughness:.92}));
 const pages=new T.Mesh(new T.BoxGeometry(.397,.267,.027),new T.MeshStandardMaterial({color:'#efe5cf',roughness:.96}));pages.position.z=.012;book.add(cover,pages);
 const scratch=new T.Mesh(new T.BoxGeometry(.27,.006,.002),new T.MeshStandardMaterial({color:'#6a7669',roughness:1}));scratch.position.set(0,.045,.027);book.add(scratch);book.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const skin=model.getObjectsByProperty('isSkinnedMesh',true);let debugState={};
 function choose(p){
  if(p.action==='walk')return p.carrying?'Walk_Carry':'Walk';if(p.carrying)return 'Carry';
  if(['error','cancelled','idle','wait','stretch','look-sea'].includes(p.action))return 'Idle_Neutral';
  if(p.action==='ready')return 'Present';if(['receive','read','research'].includes(p.action))return 'Read';
  if(p.action==='think'&&p.station==='board')return 'Board';if(['think','prepare','tidy'].includes(p.action))return 'Desk_Write';return 'Idle_Neutral';
 }
 function update(dt,time,p={},contacts={},reduce=false){
  const delta=safeDt(dt),wanted=reduce?'Idle_Neutral':choose(p),turning=Math.abs(angle(lastTurn,root.rotation.y));lastTurn=root.rotation.y;current=wanted;let sum=0;
  for(const [name,a]of Object.entries(actions)){let weight=a.getEffectiveWeight();weight=reduce?Number(name===wanted):T.MathUtils.damp(weight,Number(name===wanted),7,delta);if(weight<1e-5)weight=0;a.setEffectiveWeight(weight);sum+=weight;}
  if(sum>0)for(const a of Object.values(actions))a.setEffectiveWeight(a.getEffectiveWeight()/sum);
  const gaitSpeed=p.speed>.04?T.MathUtils.clamp(p.speed/.76,.25,2.4):turning>.001?.35:0;actions.Walk.setEffectiveTimeScale(gaitSpeed);actions.Walk_Carry.setEffectiveTimeScale(gaitSpeed);
  if(!reduce&&delta>0){mixer.update(delta);walkDistance+=Math.max(0,p.speed||0)*delta;}else if(reduce){actions.Idle_Neutral.time=0;mixer.update(0);}
  root.updateWorldMatrix(true,true);
  // Prop anchors are read from the animated skeleton, never vice versa.
  for(const [b,g]of [[bones.WristR,rightGrip],[bones.WristL,leftGrip]]){g.position.copy(root.worldToLocal(b.localToWorld(V(0,.105,0))));g.quaternion.copy(root.getWorldQuaternion(new T.Quaternion()).invert().multiply(b.getWorldQuaternion(new T.Quaternion())));}
  pencil.visible=actions.Desk_Write.getEffectiveWeight()>.82||actions.Board.getEffectiveWeight()>.82;
  const holding=actions.Read.getEffectiveWeight()+actions.Carry.getEffectiveWeight()+actions.Present.getEffectiveWeight()+actions.Walk_Carry.getEffectiveWeight();book.visible=holding>.85;
  book.position.copy(leftGrip.position).add(rightGrip.position).multiplyScalar(.5).add(V(0,.015,.035));book.rotation.set(-.32,0,0);if(p.action==='walk'&&!p.carrying)book.visible=false;
  debugState={model:'quaternius-skinned-farmer',skeleton:true,skinnedMeshes:skin.length,bones:Object.keys(bones).length,clip:wanted,weights:Object.fromEntries(Object.entries(actions).map(([n,a])=>[n,a.getEffectiveWeight()])),seated:0,handR:rightGrip.position.toArray(),handL:leftGrip.position.toArray(),footL:bones.FootL.getWorldPosition(V()).toArray(),footR:bones.FootR.getWorldPosition(V()).toArray(),heldNotebook:book.visible,pen:pencil.visible,walkDistance};
 }
 parent.add(root);update(0,0,{});
 return {root,model,leftGrip,rightGrip,update,debug:()=>debugState,inspect:()=>({bones,mixer,actions,clips}),dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);parent.remove(root);}};
}
// This module is only reached by the lazy 3D graph. UI and report routes remain independent.
await loadMakerAsset();
