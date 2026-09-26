import * as T from '../vendor/three.module.js';
import {V} from './craft.js';

export function createArtisan(parent,m,obj){
 const root=new T.Group();root.name='artisan';parent.add(root);
 const cloth=new T.MeshStandardMaterial({color:'#d6c4a1',roughness:.96});
 const trousers=new T.MeshStandardMaterial({color:'#7e7868',roughness:.98});
 const leather=new T.MeshStandardMaterial({color:'#67523e',roughness:.86});
 const apron=new T.MeshStandardMaterial({color:'#84704e',roughness:.99});
 const skin=new T.MeshStandardMaterial({color:'#c99c75',roughness:.83});
 const hair=new T.MeshStandardMaterial({color:'#47382c',roughness:.95});
 const add=(g,mat,p,rot=[0,0,0],s=[1,1,1],where=root)=>obj(g,mat,p,s,rot,where);
 const ball=(r,mat,p,s=[1,1,1],where=root)=>add(new T.SphereGeometry(r,16,12),mat,p,[0,0,0],s,where);
 const segment=(a,b,r1,r2,mat)=>{const av=V(...a),bv=V(...b),len=av.distanceTo(bv),mesh=new T.Mesh(new T.CylinderGeometry(r2,r1,len,12),mat);mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),bv.sub(av).normalize());mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.restLength=len;root.add(mesh);return mesh;};
 // Boots have rounded toes and a distinct sole; both feet remain on the floor.
 const legs=[];
 for(const side of [-1,1]){
  const x=side*.155,z=side>0?-.025:.035;
  const boot=ball(.14,leather,[x,.11,z+.075],[.76,.73,1.43]);
  const ankle=add(new T.CylinderGeometry(.10,.105,.15,12),leather,[x,.20,z]);
  const calf=segment([x,.26,z],[x,.59,z-.018],.085,.11,trousers);
  const knee=ball(.11,trousers,[x,.59,z-.018],[1,1,.94]);
  const thigh=segment([x,.59,z-.018],[side*.135,.87,-.012],.11,.125,trousers);legs.push({side,x,z,boot,ankle,calf,knee,thigh});
 }
 ball(.27,trousers,[0,.86,-.008],[1,.65,.75]);
 // Shoulder/torso meshes overlap softly rather than appearing as a cylinder doll.
 ball(.285,cloth,[0,1.17,.02],[1,1.04,.73]);
 ball(.27,cloth,[0,1.34,.075],[1.13,.51,.77]);
 add(new T.CylinderGeometry(.12,.14,.15,12),skin,[0,1.49,.115]);
 // Apron follows torso; curved hem and a small pocket.
 const panel=new T.Shape();panel.moveTo(-.18,1.40);panel.lineTo(.18,1.40);panel.lineTo(.23,.82);panel.quadraticCurveTo(0,.74,-.23,.82);panel.closePath();
 add(new T.ExtrudeGeometry(panel,{depth:.026,bevelEnabled:true,bevelSize:.016,bevelThickness:.01,bevelSegments:2}),apron,[0,0,.231],[-.08,0,0]);
 ball(.11,leather,[0,1.07,.287],[1,.75,.20]);
 for(const side of [-1,1])segment([side*.16,.96,-.19],[-side*.16,1.39,-.13],.021,.021,leather);
 // A slightly forward tilted head under a curved brim.
 const head=new T.Group();head.position.set(0,1.66,.16);head.rotation.x=.13;root.add(head);
 ball(.207,skin,[0,0,0],[.86,1.02,.91],head);
 ball(.211,hair,[0,.062,-.045],[.88,.74,.76],head);
 for(const side of [-1,1])ball(.043,skin,[side*.177,-.025,-.007],[.66,1,.68],head);
 ball(.043,skin,[0,-.014,.172],[.7,.80,.88],head);
 for(const side of [-1,1])ball(.011,m.dark,[side*.061,.025,.166],[1,1,1],head);
 const hat=new T.MeshStandardMaterial({color:'#a39170',roughness:.95});
 add(new T.CylinderGeometry(.34,.375,.040,28),hat,[0,.128,-.025],[0,0,-.035],[1,1,.9],head);
 add(new T.CylinderGeometry(.185,.243,.24,20),hat,[0,.260,-.02],[0,0,-.035],[1,1,.90],head);
 add(new T.CylinderGeometry(.239,.248,.043,24),leather,[0,.170,-.02],[0,0,-.035],[1,1,.90],head);
 const armMeshes=[];
 function arm(side){
  const shoulder=[side*.279,1.405,.085],elbow=[side*.40,1.20,.36],hand=[side*.22,1.248,.72];
  const upper=segment(shoulder,elbow,.105,.085,cloth),lower=segment(elbow,hand,.077,.054,skin);
  const cuff=ball(.087,cloth,elbow,[1,.9,1]);
  const palm=ball(.066,skin,hand,[.85,.51,1.03]);
  armMeshes.push({shoulder,elbow,hand,upper,lower,cuff,palm,side});
 }
 arm(-1);arm(1);
 const pencil=new T.Mesh(new T.CylinderGeometry(.013,.013,.25,8),new T.MeshStandardMaterial({color:'#b98b45',roughness:.8}));root.add(pencil);
 const tip=new T.Mesh(new T.ConeGeometry(.014,.07,8),m.dark);root.add(tip);
 const documentGroup=new T.Group();root.add(documentGroup);
 const sheet=new T.Mesh(new T.BoxGeometry(.46,.016,.39),new T.MeshStandardMaterial({color:'#f2dec0',roughness:.9}));sheet.rotation.x=.16;documentGroup.add(sheet);
 const seal=new T.Mesh(new T.CylinderGeometry(.04,.04,.02,12),new T.MeshStandardMaterial({color:'#98713d',roughness:.65}));seal.position.set(.11,.019,-.05);documentGroup.add(seal);
 const clothRag=new T.Mesh(new T.BoxGeometry(.19,.028,.13),new T.MeshStandardMaterial({color:'#e5d9b4',roughness:1}));root.add(clothRag);
 function place(mesh,a,b){const p=V(...a),q=V(...b),length=p.distanceTo(q);mesh.position.copy(p).add(q).multiplyScalar(.5);mesh.scale.y=length/(mesh.userData.restLength||length);mesh.quaternion.setFromUnitVectors(V(0,1,0),q.sub(p).normalize());}
 function update(t,pose){
  const {action='idle',station='desk',carrying=false,speed=0}=pose||{},walk=Math.min(1,speed/2.5),step=t*8.4;
  const onBoard=station==='board'&&['think','read'].includes(action),onShelf=station==='shelf'&&['research','read'].includes(action),writing=action==='think'&&station==='desk',sorting=action==='prepare';
  const holding=carrying||['receive','read','prepare'].includes(action);
  head.rotation.x=onBoard?-.10:holding||writing?.21:.05;
  head.rotation.y=action==='look-sea'?.32+Math.sin(t*.45)*.16:action==='error'?-.25:Math.sin(t*.6)*.045;
  if(action==='stretch')head.rotation.x=-.13;
  clothRag.visible=action==='tidy';
  for(const leg of legs){
   const ph=step+(leg.side>0?Math.PI:0),dz=Math.sin(ph)*.23*walk,lift=Math.max(0,Math.cos(ph))*.12*walk;
   const knee=[leg.x,.56+lift*.36,dz*.52+.025*walk],foot=[leg.x,.25+lift,leg.z+dz];
   place(leg.thigh,[leg.side*.135,.87,-.012],knee);place(leg.calf,knee,foot);leg.knee.position.set(...knee);
   leg.boot.position.set(leg.x,.11+lift,leg.z+dz+.075);leg.boot.rotation.x=-Math.sin(ph)*.12*walk;leg.ankle.position.set(leg.x,.20+lift,leg.z+dz);
  }
  documentGroup.visible=holding;documentGroup.position.set(0,sorting?1.22:1.10,.56);
  pencil.visible=writing||onBoard;tip.visible=pencil.visible;
  for(const a of armMeshes){let hand=[a.side*.29,.94,.13],elbow=[a.side*.36,1.16,.07];
   if(walk&&!carrying){hand[2]+=Math.sin(step+(a.side>0?0:Math.PI))*.23*walk;elbow[2]=hand[2]*.55;}
   if(holding){hand=[a.side*.23,sorting?1.245:1.11,.59];elbow=[a.side*.39,1.19,.28];}
   if(writing||sorting){hand=[...a.hand];elbow=[...a.elbow];if(a.side===1){hand[0]+=Math.sin(t*4)*.047;hand[2]+=Math.sin(t*2.8)*.027;}}
   if(onBoard&&a.side===1){hand=[.20+Math.sin(t*2.3)*.13,1.72+Math.sin(t*3.1)*.08,.57];elbow=[.39,1.52,.27];}
   if(onShelf&&a.side===1){hand=[.26,1.70+Math.sin(t*1.8)*.025,.56];elbow=[.40,1.46,.24];}
   if(action==='tidy'){hand=[a.side*.25+Math.sin(t*2.1)*.12,1.245,.70+Math.sin(t*1.6)*.07];elbow=[a.side*.40,1.21,.32];}
   if(action==='stretch'){hand=[a.side*.43,1.63+Math.sin(t*1.4)*.04,.03];elbow=[a.side*.56,1.48,.02];}
   if(action==='ready'&&a.side===1){hand=[.43,1.10,.38];elbow=[.37,1.20,.19];}
   place(a.upper,a.shoulder,elbow);place(a.lower,elbow,hand);a.cuff.position.set(...elbow);a.palm.position.set(...hand);
   if(a.side===1){clothRag.position.set(hand[0],hand[1]-.016,hand[2]+.024);pencil.position.set(hand[0]-.015,hand[1]+.067,hand[2]+.034);pencil.rotation.set(.46,0,-.30);tip.position.set(hand[0]-.053,hand[1]-.019,hand[2]+.088);tip.rotation.set(.46,0,Math.PI-.3);}
  }
 }
 update(0,{});return {root,update};
}