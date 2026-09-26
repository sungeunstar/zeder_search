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
 function arm(side,point,pole,wristForward,dorsal=[0,1,0]){
  const u=bones['UpperArm'+side],l=bones['LowerArm'+side],w=bones['Wrist'+side],s=u.getWorldPosition(V());
  const L1=s.distanceTo(l.getWorldPosition(V())),L2=l.getWorldPosition(V()).distanceTo(w.getWorldPosition(V()));
  const dir=V(...point).sub(s),d=T.MathUtils.clamp(dir.length(),Math.abs(L1-L2)+.012,L1+L2-.012);dir.normalize();
  const p=V(...pole).sub(s);p.addScaledVector(dir,-p.dot(dir)).normalize();
  const a=(L1*L1-L2*L2+d*d)/(2*d),h=Math.sqrt(Math.max(0,L1*L1-a*a));
  const e=s.clone().addScaledVector(dir,a).addScaledVector(p,h),end=s.clone().addScaledVector(dir,d);
  aimBone(u,e);aimBone(l,end);
  const y=V(...wristForward).normalize(),z=V(...dorsal);z.addScaledVector(y,-z.dot(y)).normalize();
  const x=y.clone().cross(z).normalize();z.copy(x).cross(y).normalize();
  const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  w.quaternion.copy(w.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));model.updateMatrixWorld(true);
 }
 // Fixed-length finger posing is authored once into clips. No runtime joint scaling.
 function finger(side,name,target,pole){
  const a=bones[name+'2'+side],b=bones[name+'3'+side],end=bones[name+'4'+side];
  if(!a||!b||!end)return;
  const wrist=bones['Wrist'+side],s=a.getWorldPosition(V()),goal=wrist.localToWorld(V(...target)),p=wrist.localToWorld(V(...pole)).sub(s);
  const l1=s.distanceTo(b.getWorldPosition(V())),l2=b.getWorldPosition(V()).distanceTo(end.getWorldPosition(V()));
  const dir=goal.sub(s),d=T.MathUtils.clamp(dir.length(),Math.abs(l1-l2)+.001,l1+l2-.001);dir.normalize();p.addScaledVector(dir,-p.dot(dir)).normalize();
  const k=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-k*k));
  aimBone(a,s.clone().addScaledVector(dir,k).addScaledVector(p,h));aimBone(b,s.clone().addScaledVector(dir,d));
 }
 function thumb(side,target){
  const a=bones['Thumb1'+side],b=bones['Thumb2'+side],end=bones['Thumb3'+side],wrist=bones['Wrist'+side];
  const s=a.getWorldPosition(V()),goal=wrist.localToWorld(V(...target)),p=wrist.localToWorld(V(side==='R'?-.10:.10,.065,-.012)).sub(s);
  const l1=s.distanceTo(b.getWorldPosition(V())),l2=b.getWorldPosition(V()).distanceTo(end.getWorldPosition(V()));
  const dir=goal.sub(s),d=T.MathUtils.clamp(dir.length(),Math.abs(l1-l2)+.001,l1+l2-.001);dir.normalize();p.addScaledVector(dir,-p.dot(dir)).normalize();
  const k=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-k*k));
  aimBone(a,s.clone().addScaledVector(dir,k).addScaledVector(p,h));aimBone(b,s.clone().addScaledVector(dir,d));
 }
 const PEN_GRIP=V(-.036,.135,-.034),PEN_AXIS=V(-.071,-.644,.762).normalize(),PEN_TIP=.055;
 
 function penGrip(){
  finger('R','Index',[-.027,.140,-.033],[-.025,.207,-.04]);
  finger('R','Middle',[.003,.152,-.041],[0,.208,-.04]);
  finger('R','Ring',[.032,.143,-.048],[.033,.20,-.05]);
  finger('R','Pinky',[.050,.136,-.041],[.052,.18,-.05]);
  thumb('R',[-.046,.132,-.031]);
 }
 function documentGrip(side){
  const mirror=side==='R'?1:-1;
  for(const [name,x,y,z]of [['Index',-.022,.164,-.058],['Middle',.007,.172,-.060],['Ring',.038,.162,-.052],['Pinky',.052,.152,-.043]]){
   finger(side,name,[x*mirror,y,z],[x*mirror,.235,-.012]);
  }
  thumb(side,[-.052*mirror,.102,-.062]);
  // Terminal thumb pad runs along the back cover, not through its thickness.
  const end=bones['Thumb3'+side],q=end.getWorldQuaternion(new T.Quaternion());
  q.premultiply(new T.Quaternion().setFromUnitVectors(V(0,1,0).applyQuaternion(q),V(side==='R'?.15:-.15,.988,-.025).normalize()));
  end.quaternion.copy(end.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));model.updateMatrixWorld(true);
 }
 function author(name,duration,kind){
  const count=49,times=[],values=new Map();
  for(let i=0;i<count;i++){
   reset();const t=duration*i/(count-1),phase=t/duration*Math.PI*2;times.push(t);
   if(kind==='write'){
    // Pen target is on the sheet. The hand is posed around the shaft, not vice versa.
    const cycle=t/duration,stroke=cycle<.70?Math.sin(cycle/.70*Math.PI*6)*.013:0;
    const lift=cycle>.72&&cycle<.94?Math.sin((cycle-.72)/.22*Math.PI)*.009:0;
    const forward=[.22,-.10,.970],normal=[-.20,.97,.10];
    arm('R',[-.21,1.35,.36],[-.46,1.14,.16],forward,normal);
    penGrip();
    const w=bones.WristR,q=w.getWorldQuaternion(new T.Quaternion()),offset=PEN_GRIP.clone().addScaledVector(PEN_AXIS,-PEN_TIP).applyQuaternion(q);
    const point=V(-.16+stroke,1.259+lift,.547+Math.sin(phase)*.015).sub(offset);
    arm('R',point.toArray(),[-.45,1.13,.13],forward,normal);
    arm('L',[.205,1.278,.345],[.47,1.11,.12],[-.06,-.015,1],[0,1,.015]);
    for(const f of ['Index','Middle','Ring','Pinky']){
     const b=bones[f+'2L'];b.quaternion.multiply(new T.Quaternion().setFromAxisAngle(V(1,0,0),-.10));
    }
    bones.Head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.15+Math.sin(phase)*.008,.045,0)));
   }else if(['read','carry','present'].includes(kind)){
    const lift=kind==='present'?.02:0;
    arm('R',[-.240,1.155+lift,.220],[-.40,1.17,.045],[0,.10,.995],[-1,0,0]);
    arm('L',[.240,1.155+lift,.220],[.40,1.17,.045],[0,.10,.995],[1,0,0]);
    documentGrip('R');documentGrip('L');
    bones.Head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(kind==='read'?.12:.025,Math.sin(phase)*.012,0)));
   }else if(kind==='board'){
    arm('R',[-.26,1.48,.38],[-.48,1.27,.14],[.25,.90,.36],[0,.3,-1]);
    penGrip();
    bones.Head.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.04,-.05,0)));
   }
   for(const [n,b]of Object.entries(bones)){let arr=values.get(n);if(!arr){arr={q:[],p:[],s:[]};values.set(n,arr);}arr.q.push(...b.quaternion.toArray());arr.p.push(...b.position.toArray());arr.s.push(...b.scale.toArray());}
  }
  const tracks=[];for(const [n,v]of values)tracks.push(new T.QuaternionKeyframeTrack(n+'.quaternion',times,v.q),new T.VectorKeyframeTrack(n+'.position',times,v.p),new T.VectorKeyframeTrack(n+'.scale',times,v.s));
  return new T.AnimationClip(name,duration,tracks);
 }
 const clips=[neutral,walk,author('Desk_Write',4.8,'write'),author('Read',4,'read'),author('Carry',3.2,'carry'),author('Present',3.6,'present'),author('Board',4.2,'board')];
 sampling.stopAllAction();reset();sampling.uncacheRoot(model);
 const carry=clips.find(c=>c.name==='Carry'),walkCarry=walk.clone();walkCarry.name='Walk_Carry';walkCarry.tracks=walkCarry.tracks.filter(t=>!/^(Shoulder|UpperArm|LowerArm|Wrist|Index|Middle|Ring|Pinky|Thumb)/.test(t.name));
 for(const t of carry.tracks)if(/^(Shoulder|UpperArm|LowerArm|Wrist|Index|Middle|Ring|Pinky|Thumb)/.test(t.name)){const track=t.clone();track.scale(walk.duration/carry.duration);walkCarry.tracks.push(track);}clips.push(walkCarry);
 const actions=Object.fromEntries(clips.map(c=>[c.name,mixer.clipAction(c)]));let current='Idle_Neutral',walkDistance=0,lastTurn=root.rotation.y;
 for(const a of Object.values(actions)){a.enabled=true;a.setEffectiveWeight(0);a.play();}actions[current].setEffectiveWeight(1);mixer.update(0);
 const leftGrip=new T.Object3D(),rightGrip=new T.Object3D();root.add(leftGrip,rightGrip);
 const pencil=new T.Group();pencil.name='wrist-attached-pencil';bones.WristR.add(pencil);
 const shaft=new T.Mesh(new T.CylinderGeometry(.007,.007,.196,10),new T.MeshStandardMaterial({color:'#a27642',roughness:.8}));
 const tip=new T.Mesh(new T.ConeGeometry(.008,.034,10),new T.MeshStandardMaterial({color:'#343d35',roughness:.9}));shaft.position.y=.060;tip.position.y=-.038;tip.rotation.z=Math.PI;
 pencil.add(shaft,tip);pencil.position.copy(PEN_GRIP);pencil.quaternion.setFromUnitVectors(V(0,1,0),PEN_AXIS);pencil.traverse(o=>{if(o.isMesh)o.castShadow=true;});pencil.visible=false;
 const book=new T.Group();book.name='held-reference-notebook';root.add(book);book.visible=false;
 const cover=new T.Mesh(new T.BoxGeometry(.350,.245,.025),new T.MeshStandardMaterial({color:'#55736f',roughness:.92}));
 const pages=new T.Mesh(new T.BoxGeometry(.329,.222,.008),new T.MeshStandardMaterial({color:'#efe5cf',roughness:.96}));pages.position.z=.016;book.add(cover,pages);
 const scratch=new T.Mesh(new T.BoxGeometry(.27,.006,.002),new T.MeshStandardMaterial({color:'#6a7669',roughness:1}));scratch.position.set(0,.035,.023);book.add(scratch);book.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
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
  const wr=root.worldToLocal(bones.WristR.getWorldPosition(V())),wl=root.worldToLocal(bones.WristL.getWorldPosition(V()));
  const bx=wl.clone().sub(wr).normalize(),by=V(0,1,0).applyQuaternion(bones.Chest.getWorldQuaternion(new T.Quaternion())).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());
  by.addScaledVector(bx,-by.dot(bx)).normalize();const bz=bx.clone().cross(by).normalize();
  book.position.copy(wr).add(wl).multiplyScalar(.5).addScaledVector(by,.085).addScaledVector(bz,.126);
  book.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(bx,by,bz));if(p.action==='walk'&&!p.carrying)book.visible=false;
  debugState={model:'quaternius-skinned-farmer',skeleton:true,skinnedMeshes:skin.length,bones:Object.keys(bones).length,clip:wanted,weights:Object.fromEntries(Object.entries(actions).map(([n,a])=>[n,a.getEffectiveWeight()])),seated:0,handR:rightGrip.position.toArray(),handL:leftGrip.position.toArray(),footL:bones.FootL.getWorldPosition(V()).toArray(),footR:bones.FootR.getWorldPosition(V()).toArray(),heldNotebook:book.visible,pen:pencil.visible,walkDistance,contactVersion:4,
   penTip:root.worldToLocal(pencil.localToWorld(V(0,-PEN_TIP,0))).toArray(),
   fingerTips:Object.fromEntries(['Index4R','Thumb3R','Index4L','Thumb3L'].map(n=>[n,root.worldToLocal(bones[n].getWorldPosition(V())).toArray()])),
   notebookCenter:book.position.toArray()};
 }
 parent.add(root);update(0,0,{});
 return {root,model,leftGrip,rightGrip,update,debug:()=>debugState,inspect:()=>({bones,mixer,actions,clips,pencil,book}),dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);parent.remove(root);}};
}
// This module is only reached by the lazy 3D graph. UI and report routes remain independent.
await loadMakerAsset();
