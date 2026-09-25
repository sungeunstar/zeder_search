import * as T from '../vendor/three.module.js';
import {V} from './craft.js';
import {createWorkshop as createShell} from './workshop-shell.js';

// Keep the proven room/strategy-board code intact; swap its figure and lighting.
export function createWorkshop(scene,m){
 const shell=createShell(scene,m);shell.worker.root.visible=false;
 function obj(g,mat,p,scale=[1,1,1],rot=[0,0,0],parent=shell.root){const o=new T.Mesh(g,mat);o.position.set(...p);o.scale.set(...scale);o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const worker=createArtisan(shell.root,m,obj);worker.root.position.set(-1.24,.405,2.99);worker.root.rotation.y=Math.PI+.33;worker.root.scale.setScalar(1.25);
 const lamps=[],glows=new Set();shell.root.traverse(o=>{if(o.isPointLight)lamps.push({light:o,base:o.intensity>10?13:o.intensity>3?3.5:2.4});if(o.material?.emissiveIntensity>0&&o.material?.emissive?.getHex())glows.add(o.material);});
 let night=0,intensity=0;
 return {...shell,worker,setNight(value){night=Math.max(0,Math.min(1,value));for(const mat of glows)mat.emissiveIntensity=1.2+night*1.4;},
  update(dt,time){shell.update(dt,time);const working=shell.debug().working;intensity+=(Number(working)-intensity)*(1-Math.exp(-Math.max(dt,0)*4));worker.update(time,intensity);for(const {light,base}of lamps)light.intensity=base*(1+night*1.15)*(1+Math.sin(time*1.9)*.016);},
  debug(){return {...shell.debug(),worker:worker.root.position.toArray(),pose:'hands-on-bench',night};}
 };
}

// Rounded, proportioned artisan. Hands are posed ON the desktop, not hanging
// underneath it. Separate joint groups keep the pencil, cuffs and elbows joined.
function createArtisan(parent,m,obj){
 const root=new T.Group();root.name='artisan';parent.add(root);
 const cloth=new T.MeshStandardMaterial({color:'#d6c4a1',roughness:.96});
 const trousers=new T.MeshStandardMaterial({color:'#7e7868',roughness:.98});
 const leather=new T.MeshStandardMaterial({color:'#67523e',roughness:.86});
 const apron=new T.MeshStandardMaterial({color:'#84704e',roughness:.99});
 const skin=new T.MeshStandardMaterial({color:'#c99c75',roughness:.83});
 const hair=new T.MeshStandardMaterial({color:'#47382c',roughness:.95});
 const add=(g,mat,p,rot=[0,0,0],s=[1,1,1],where=root)=>obj(g,mat,p,s,rot,where);
 const ball=(r,mat,p,s=[1,1,1],where=root)=>add(new T.SphereGeometry(r,16,12),mat,p,[0,0,0],s,where);
 const segment=(a,b,r1,r2,mat)=>{const av=V(...a),bv=V(...b),len=av.distanceTo(bv),mesh=new T.Mesh(new T.CylinderGeometry(r2,r1,len,12),mat);mesh.position.copy(av).add(bv).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),bv.sub(av).normalize());mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
 // Boots have rounded toes and a distinct sole; both feet remain on the floor.
 for(const side of [-1,1]){
  const x=side*.155,z=side>0?-.025:.035;
  ball(.14,leather,[x,.11,z+.075],[.76,.73,1.43]);
  add(new T.CylinderGeometry(.10,.105,.15,12),leather,[x,.20,z]);
  segment([x,.26,z],[x,.59,z-.018],.085,.11,trousers);
  ball(.11,trousers,[x,.59,z-.018],[1,1,.94]);
  segment([x,.59,z-.018],[side*.135,.87,-.012],.11,.125,trousers);
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
 function place(mesh,a,b){const p=V(...a),q=V(...b);mesh.position.copy(p).add(q).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(V(0,1,0),q.sub(p).normalize());}
 function update(t,working){
  head.rotation.x=.13+working*.07;head.rotation.y=Math.sin(t*.36)*.035;
  for(const a of armMeshes){const hand=[...a.hand],elbow=[...a.elbow];
   if(a.side===1){hand[0]+=Math.sin(t*4.0)*working*.054;hand[2]+=Math.sin(t*2.7)*working*.03;elbow[0]+=Math.sin(t*4)*working*.015;}
   place(a.upper,a.shoulder,elbow);place(a.lower,elbow,hand);a.cuff.position.set(...elbow);a.palm.position.set(...hand);
   if(a.side===1){pencil.position.set(hand[0]-.015,hand[1]+.067,hand[2]+.034);pencil.rotation.z=-.30;pencil.rotation.x=.46;tip.position.set(hand[0]-.053,1.229,hand[2]+.088);tip.rotation.z=Math.PI-.3;tip.rotation.x=.46;}
  }
 }
 update(0,0);return {root,update};
}
