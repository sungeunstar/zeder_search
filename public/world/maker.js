import * as T from '../vendor/three.module.js';
const V=(...v)=>new T.Vector3(...v);
const Y=V(0,1,0);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Analytic two-link IK. Targets outside reach are clamped, never stretched.
export function solveArm(shoulder,target,pole,l1=.36,l2=.39){
 const dir=target.clone().sub(shoulder),d=clamp(dir.length(),.045,l1+l2-.006);dir.normalize();
 if(!dir.lengthSq())dir.set(0,-1,0);
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 const bend=pole.clone().sub(shoulder).addScaledVector(dir,-pole.clone().sub(shoulder).dot(dir));
 if(bend.lengthSq()<.00001)bend.set(1,0,0).addScaledVector(dir,-dir.x);
 bend.normalize();
 return {elbow:shoulder.clone().addScaledVector(dir,along).addScaledVector(bend,height),hand:shoulder.clone().addScaledVector(dir,d)};
}

// Original lightweight articulated maker. AnimationClip drives the torso/head;
// contact IK drives hands, and gait phase is integrated from travelled distance.
export function createMaker(parent){
 const root=new T.Group();root.name='strategy-maker-v2';parent.add(root);
 const mat={shirt:'#e4dcca',vest:'#526771',pants:'#706959',skin:'#c89e7b',hair:'#49362a',shoe:'#584636',ink:'#353b35',paper:'#f2e4c6'};
 Object.keys(mat).forEach(k=>mat[k]=new T.MeshStandardMaterial({color:mat[k],roughness:.92}));
 function mesh(g,m,p,scale=[1,1,1],where=root){const o=new T.Mesh(g,m);o.position.set(...p);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;where.add(o);return o;}
 const ball=(r,m,p,s=[1,1,1],where=root)=>mesh(new T.SphereGeometry(r,14,10),m,p,s,where);
 const core=new T.Group();core.name='MakerTorso';core.position.y=.88;root.add(core);
 ball(.27,mat.pants,[0,.0,0],[1,.60,.80],core);
 ball(.285,mat.shirt,[0,.32,.03],[1,1.12,.77],core);
 ball(.27,mat.vest,[0,.33,.005],[1.035,1.04,.80],core);
 // Shirt front and waistcoat lapels, rather than a smith's apron or helmet.
 mesh(new T.BoxGeometry(.16,.51,.055),mat.shirt,[0,.40,.221],[1,1,1],core);
 for(const side of [-1,1]){
  const lapel=mesh(new T.BoxGeometry(.08,.32,.045),mat.vest,[side*.13,.49,.247],[1,1,1],core);lapel.rotation.z=side*-.23;
  ball(.067,mat.shirt,[side*.29,.54,.035],[1.12,1.06,1],core);
 }
 for(let i=0;i<3;i++)ball(.014,mat.shoe,[0,.17+i*.09,.252],[1,1,.5],core);
 mesh(new T.CylinderGeometry(.104,.116,.13,12),mat.skin,[0,.65,.03],[1,1,1],core);
 const head=new T.Group();head.name='MakerHead';head.position.set(0,.82,.065);core.add(head);
 ball(.21,mat.skin,[0,0,0],[.88,1.06,.91],head);
 ball(.211,mat.hair,[0,.071,-.049],[.90,.74,.83],head);
 for(const side of [-1,1]){ball(.043,mat.skin,[side*.179,-.012,-.014],[.62,.98,.63],head);ball(.012,mat.ink,[side*.064,.015,.172],[1,.74,.46],head);}
 ball(.036,mat.skin,[0,-.026,.182],[.78,.82,.80],head);
 for(let i=0;i<4;i++){const tuft=ball(.079,mat.hair,[-.115+i*.057,.174,-.002],[1.02,.72,1.12],head);tuft.rotation.z=-.25;}
 function limb(length,r1,r2,m){return mesh(new T.CylinderGeometry(r2,r1,length,12),m,[0,0,0]);}
 function place(o,a,b){o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());}
 const arms=[-1,1].map(side=>({side,shoulder:V(side*.285,.54,.035),upper:limb(.36,.092,.081,mat.shirt),lower:limb(.39,.070,.050,mat.skin),cuff:ball(.086,mat.shirt,[0,0,0],[1,.64,1]),palm:ball(.068,mat.skin,[0,0,0],[.77,.51,1.02]),target:V(side*.29,1.06,.25)}));
 const legs=[-1,1].map(side=>({side,hip:V(side*.14,0,0),thigh:limb(.39,.118,.095,mat.pants),shin:limb(.39,.095,.075,mat.pants),knee:ball(.098,mat.pants,[0,0,0]),boot:ball(.14,mat.shoe,[side*.15,.11,.085],[.80,.73,1.48])}));
 const pencil=new T.Group();root.add(pencil);mesh(new T.CylinderGeometry(.012,.012,.22,8),mat.shoe,[0,.11,0],[1,1,1],pencil);const tip=mesh(new T.ConeGeometry(.012,.044,8),mat.ink,[0,.002,0],[1,1,1],pencil);tip.rotation.x=Math.PI;
 const rightGrip=new T.Object3D(),leftGrip=new T.Object3D();root.add(rightGrip,leftGrip);
 const mixer=new T.AnimationMixer(root),actions={};
 const poses={idle:[.02,0,.08,0],walk:[.04,0,.06,0],write:[.12,.025,.23,.04],read:[.05,0,.24,0],board:[.03,.10,-.08,.17],carry:[.025,0,.13,0],deliver:[.08,0,.17,0],tidy:[.10,-.02,.16,-.04],sea:[-.015,-.12,.025,-.33],stretch:[-.08,0,-.15,0]};
 for(const [name,base]of Object.entries(poses)){
  const times=[0,1.1,2.8,4.3,6],torso=[],heads=[];
  times.forEach((_,i)=>{const b=[0,.012,-.006,.008,0][i];torso.push(...new T.Quaternion().setFromEuler(new T.Euler(base[0]+b,base[1],b*.3)).toArray());heads.push(...new T.Quaternion().setFromEuler(new T.Euler(base[2]+b*.5,base[3]+b,b*.25)).toArray());});
  const clip=new T.AnimationClip(name,6,[new T.QuaternionKeyframeTrack('MakerTorso.quaternion',times,torso),new T.QuaternionKeyframeTrack('MakerHead.quaternion',times,heads)]);root.animations.push(clip);actions[name]=mixer.clipAction(clip);
 }
 let current='',gait=0,walkBlend=0,seated=0,initialized=false,lastContacts={};
 const q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();
 function update(dt,time,pose,contacts={},reduce=false){
  const action=pose.action,walking=pose.speed>.025,write=action==='think'&&pose.station==='desk';
  const key=walking?'walk':pose.carrying?'carry':action==='look-sea'?'sea':action==='stretch'?'stretch':action==='ready'?'deliver':action==='tidy'?'tidy':write||action==='prepare'?'write':pose.station==='board'&&['think','read'].includes(action)?'board':['read','research','receive'].includes(action)?'read':'idle';
  if(key!==current){const next=actions[key];next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();if(current)next.crossFadeFrom(actions[current],.38,false);current=key;}
  mixer.update(reduce?0:dt);const sitting=!walking&&pose.station==='desk'&&['think','tidy','read'].includes(action);seated+=(Number(sitting)-seated)*(!initialized||reduce?1:1-Math.exp(-dt*4));core.position.y=.88-.14*seated+(!reduce?Math.sin(time*1.4)*.006:0);
  root.updateWorldMatrix(true,true);
  const blend=(!initialized||reduce)?1:1-Math.exp(-dt*12);
  walkBlend+=(Number(walking)-walkBlend)*blend;gait+=reduce?0:pose.speed*dt/.90*Math.PI*2;
  for(const leg of legs){
   const ph=((gait+(leg.side>0?Math.PI:0))%(Math.PI*2)+Math.PI*2)%(Math.PI*2),u=ph/Math.PI;
   const z=(u<1?.18-.36*u:-.18+.36*(.5-.5*Math.cos((u-1)*Math.PI)))*walkBlend;
   const lift=(u<1?0:Math.sin((u-1)*Math.PI)*.09)*walkBlend;
   const hip=core.localToWorld(leg.hip.clone());root.worldToLocal(hip);
   const foot=V(leg.side*.15,.20+lift,z+.30*seated),sol=solveArm(hip,foot,hip.clone().add(V(0,-.35,.6)),.39,.39);
   place(leg.thigh,hip,sol.elbow);place(leg.shin,sol.elbow,sol.hand);leg.knee.position.copy(sol.elbow);
   leg.boot.position.copy(sol.hand).add(V(0,-.09,.08));leg.boot.rotation.x=u>1?Math.sin((u-1)*Math.PI)*.08*walkBlend:0;
  }
  const reachErrors=[];
  for(const arm of arms){
   const shoulder=core.localToWorld(arm.shoulder.clone());root.worldToLocal(shoulder);
   const requested=contacts[arm.side===1?'right':'left'];
   let hand=requested?root.worldToLocal(requested.clone()):V(arm.side*.30,1.00,.18);
   if(!requested&&walking){hand.z+=Math.sin(gait+(arm.side>0?0:Math.PI))*.20*walkBlend;}
   if(!requested&&!walking&&key==='read')hand=V(arm.side*.20,1.12,.48);
   if(!requested&&key==='stretch')hand=V(arm.side*.46,1.66,.08);
   arm.target.lerp(hand,blend);
   const solved=solveArm(shoulder,arm.target,V(arm.side*.53,.88,.22));
   place(arm.upper,shoulder,solved.elbow);place(arm.lower,solved.elbow,solved.hand);arm.cuff.position.copy(solved.elbow);arm.palm.position.copy(solved.hand);
   (arm.side===1?rightGrip:leftGrip).position.copy(solved.hand);
   reachErrors.push(solved.hand.distanceTo(arm.target));
  }
  // Pencil tip shares the same contact target as the writing hand.
  pencil.visible=!!contacts.pen&&['think','tidy','prepare','read'].includes(action)&&!walking;
  pencil.position.copy(rightGrip.position).add(V(-.012,-.027,.035));pencil.rotation.set(.30,0,-.20);
  root.updateWorldMatrix(true,true);initialized=true;
  lastContacts={clip:current,seated,maxReachClamp:Math.max(...reachErrors),right:rightGrip.getWorldPosition(V()).toArray(),left:leftGrip.getWorldPosition(V()).toArray(),pencil:pencil.visible};
 }
 return {root,update,rightGrip,leftGrip,debug:()=>lastContacts};
}
