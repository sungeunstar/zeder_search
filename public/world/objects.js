import * as T from '../vendor/three.module.js';
import {random,ground,HOUSE,walkable} from './math.js';
import {Batch,V,transform,leafGeometry,windMaterial} from './craft.js';

export function cottage(scene,m){
 const group=new T.Group();group.position.set(HOUSE.x,ground(HOUSE.x,HOUSE.z)-.06,HOUSE.z);group.name='handcrafted coastal cottage';scene.add(group);
 const beams=new Batch(),boards=new Batch(),plaster=new Batch(),tiles=new Batch(),dark=new Batch(),glass=new Batch(),stone=new Batch(),metal=new Batch();const rnd=random(900);
 // The house is a gabled volume with real recesses, porch, rafters and individual overlapping shingles.
 plaster.box([0,1.75,0],[5.2,3.3,4.2]);
 const gable=new T.Shape();gable.moveTo(-2.6,3.4);gable.lineTo(0,5.7);gable.lineTo(2.6,3.4);gable.closePath();
 const gg=new T.ExtrudeGeometry(gable,{depth:4.2,bevelEnabled:false});plaster.add(gg,transform([0,0,-2.1]));
 stone.box([0,.08,0],[5.45,.3,4.4],[0,0,0],'#9b9881');
 for(const x of [-2.54,2.54])for(const z of [-2.1,2.1])beams.box([x,1.82,z],[.22,3.6,.22],[0,0,(rnd()-.5)*.016]);
 for(const y of [.36,3.35]){beams.box([0,y,2.15],[5.42,.2,.18]);beams.box([0,y,-2.15],[5.42,.2,.18]);beams.box([-2.64,y,0],[.18,.2,4.45]);beams.box([2.64,y,0],[.18,.2,4.45]);}
 // Subtle plank courses and uneven joints.
 for(let j=0;j<10;j++){const y=.53+j*.275;boards.box([0,y,2.11],[5.08,.245,.08]);boards.box([0,y,-2.12],[5.08,.245,.08]);boards.box([2.61,y,0],[.07,.245,4.1]);boards.box([-2.61,y,0],[.07,.245,4.1]);}
 for(const z of [2.17,-2.17]){beams.beam([-2.82,3.27,z],[0,5.86,z],.13);beams.beam([0,5.86,z],[2.82,3.27,z],.13);beams.box([0,3.53,z],[5.3,.16,.14]);beams.box([0,4.5,z],[.14,2.5,.12]);}
 // Main pitched roof. Shingles overlap down both slopes and have curved lower edges.
 const sh=new T.Shape();sh.moveTo(-.27,-.31);sh.lineTo(.27,-.31);sh.lineTo(.27,.11);sh.quadraticCurveTo(.24,.35,0,.36);sh.quadraticCurveTo(-.24,.35,-.27,.11);sh.closePath();
 const shingle=new T.ExtrudeGeometry(sh,{depth:.044,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.008,curveSegments:4});
 const roofAngle=Math.atan2(2.65,3.12),slopeLength=Math.hypot(2.65,3.12);
 for(const sign of [-1,1]){
  // Tile local Y runs down the slope; local X runs parallel to ridge.
  const normal=V(sign*Math.sin(roofAngle),Math.cos(roofAngle),0),u=V(0,0,sign),v=V(sign*Math.cos(roofAngle),-Math.sin(roofAngle),0);
  const basis=new T.Matrix4().makeBasis(u,v,normal);
  for(let row=0;row<10;row++)for(let col=0;col<11;col++){
   const down=.16+row*(slopeLength/10),z=(col-5)*.5+(row%2)*.23;
   const mm=basis.clone();mm.setPosition(sign*Math.cos(roofAngle)*down,5.92-Math.sin(roofAngle)*down+(10-row)*.008,z);
   tiles.add(shingle,mm,new T.Color().setHSL(.09+rnd()*.015,.3+rnd()*.13,.46+rnd()*.16));
  }
 }
 for(let i=0;i<15;i++)beams.add(new T.CylinderGeometry(.14,.14,.39,8,1,false,0,Math.PI),transform([0,5.97,(i-7)*.37],[1,1,1],[Math.PI/2,0,0]));
 // Windows use an actual shadow inset, glazing, crossbars, projecting sill and sill brackets.
 function windowAt(x,y,z,w,h){dark.box([x,y,z],[w+.24,h+.22,.10]);glass.box([x,y,z+.061],[w,h,.05]);
  for(const xx of [x-w/2,x+w/2])beams.box([xx,y,z+.15],[.105,h+.21,.19]);for(const yy of [y-h/2,y+h/2])beams.box([x,yy,z+.15],[w+.22,.10,.19]);
  beams.box([x,y,z+.16],[.068,h,.12]);beams.box([x,y,z+.16],[w,.075,.12]);boards.box([x,y-h/2-.12,z+.24],[w+.4,.13,.42]);beams.box([x,y+h/2+.17,z+.16],[w+.38,.13,.24],[0,0,.025]);
 }
 windowAt(1.54,1.94,2.19,.86,1.15);windowAt(0,4.47,2.22,.82,.85);windowAt(-1.78,1.87,2.18,.58,.92);
 // Front door under the porch; slab grooves, hinges, latch.
 dark.box([-.48,1.45,2.18],[1.4,2.5,.16]);for(let i=0;i<5;i++)boards.box([-.99+i*.255,1.45,2.29],[.241,2.25,.1]);
 for(const x of [-1.18,.23])beams.box([x,1.52,2.32],[.16,2.6,.2]);beams.box([-.48,2.78,2.33],[1.6,.2,.22]);
 for(const y of [.58,2.17])beams.box([-.48,y,2.39],[1.25,.1,.07]);metal.add(new T.TorusGeometry(.06,.018,6,10),transform([.02,1.48,2.46]));
 // Raised porch with timber decking and rails.
 const porchX=-.65;stone.box([porchX,.12,3.14],[3.55,.25,2.1],[0,0,0],'#9b9881');
 for(let i=0;i<11;i++)boards.box([porchX-1.5+i*.3,.31,3.2],[.278,.11,2.04]);
 for(const x of [-2.26,.96]){beams.box([x,1.66,3.94],[.17,2.75,.17]);beams.box([x,.89,3.23],[.10,.10,1.42]);for(let i=0;i<5;i++)beams.box([x,.62,2.55+i*.28],[.056,.51,.06]);}
 for(const z of [2.3,3.97])beams.box([porchX,3.03-(z-2.3)*.22,z],[3.78,.17,.18]);
 for(let col=0;col<8;col++)for(let row=0;row<4;row++){
  tiles.add(shingle,new T.Matrix4().makeBasis(V(-1,0,0),V(0,-.23,.973),V(0,.973,.23)).setPosition(porchX+(col-3.5)*.47,3.19-row*.115,2.42+row*.49),new T.Color().setHSL(.085,.24,.42+rnd()*.12));
 }
 for(let i=0;i<3;i++)stone.box([porchX,-.02+i*.075,4.42-i*.19],[1.6,.17,.46],[0,0,0],'#99947e');
 // Stone chimney with projecting courses.
 stone.box([1.65,5.5,-.86],[.52,2,.58],[0,0,-.025],'#a89b89');stone.box([1.65,6.46,-.86],[.7,.21,.77],[0,0,0],'#b5a28d');dark.box([1.65,6.57,-.86],[.39,.018,.45]);
 for(let i=0;i<7;i++)beams.box([1.65,4.72+i*.22,-.553],[.52,.025,.013]);
 // Side logs and clay pot: small details give a useful human sense of scale.
 for(let i=0;i<7;i++)beams.add(new T.CylinderGeometry(.18,.18,1.4,7),transform([3.15+(i%2)*.32,.22+Math.floor(i/2)*.27,-.7],[1,1,1],[Math.PI/2,0,0]));
 boards.add(new T.CylinderGeometry(.28,.19,.38,10),transform([1.45,.4,3.52]));dark.add(new T.CircleGeometry(.24,10),transform([1.45,.596,3.52],[1,1,1],[-Math.PI/2,0,0]));
 for(const [batch,mat] of [[plaster,m.plaster],[boards,m.boards],[beams,m.timber],[tiles,m.tiles],[glass,m.glass],[dark,m.dark],[stone,m.stone],[metal,m.iron]])batch.mesh(mat,group);
 return group;
}

export function trees(scene,m,mobile=false){
 const rnd=random(374),wood=new Batch(),leaves=[];
 const layout=[[-10.5,4.7,1.03],[-9,-5.3,.83],[-9,-10.8,.81],[3.7,-9.5,.85],[9.1,-8.1,.99],[14,-6.8,1.01],[15.7,.4,.88],[-17,-2,.77]];
 function branch(a,b,r,depth,s){wood.beam(a.toArray(),b.toArray(),r,new T.Color().setHSL(.105,.12,.52+rnd()*.18));
  if(depth<=2)leaves.push({center:b.clone().lerp(a,.23),scale:s*.9});if(depth===0){leaves.push({center:b,scale:s});return;}
  const vec=b.clone().sub(a),cnt=depth===3?3:2;
  for(let i=0;i<cnt;i++){const angle=rnd()*Math.PI*2,side=.9+depth*.23,dir=V(Math.cos(angle)*side,.65+rnd()*.8,Math.sin(angle)*side).normalize();dir.lerp(vec.clone().normalize(),.17).normalize();branch(b,b.clone().addScaledVector(dir,vec.length()*(.63+rnd()*.13)),r*.57,depth-1,s);}
 }
 for(const [x,z,s] of layout){const y=ground(x,z),root=V(x,y,z);branch(root,root.clone().add(V(.22*s,3.05*s,.13)),.48*s,3,s);
  for(let i=0;i<5;i++){const a=i*1.256;wood.beam([x+Math.cos(a)*.72*s,y-.05,z+Math.sin(a)*.72*s],[x,y+.6*s,z],.12*s,'#847864');}}
 wood.mesh(m.bark,scene);
 const per=mobile?32:90,count=leaves.length*per,mesh=new T.InstancedMesh(leafGeometry(),m.leaves,count),obj=new T.Object3D(),cc=new T.Color();let k=0;
 for(const {center,scale} of leaves)for(let j=0;j<per;j++){
  const a=rnd()*6.283,c=rnd()*2-1,r=Math.cbrt(rnd())*(.8+rnd()*.6)*scale,ss=Math.sqrt(1-c*c);
  obj.position.copy(center).add(V(Math.cos(a)*r*ss,c*r*.85,Math.sin(a)*r*ss));obj.rotation.set(rnd()*Math.PI,rnd()*Math.PI*2,rnd()*Math.PI*2);const size=(.42+rnd()*.48)*scale;obj.scale.set(size,size,size);obj.updateMatrix();mesh.setMatrixAt(k,obj.matrix);
  cc.setHSL(.23+rnd()*.07,.30+rnd()*.20,.12+rnd()*.15);mesh.setColorAt(k++,cc);
 }
 mesh.name='individual wind animated leaves';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);const wind=windMaterial(m.leaves,{strength:.07,speed:.78});
 return {mesh,wind,count};
}

export function traveler(scene,m){
 const root=new T.Group();root.name='traveler';root.position.set(.8,ground(.8,4.9),4.9);root.rotation.y=.42;scene.add(root);
 const torso=new T.Group();root.add(torso);
 function mesh(g,mat,p,s=[1,1,1],parent=torso,rot=[0,0,0]){const x=new T.Mesh(g,mat);x.position.set(...p);x.scale.set(...s);x.rotation.set(...rot);x.castShadow=true;x.receiveShadow=true;parent.add(x);return x;}
 mesh(new T.CylinderGeometry(.24,.31,.56,6),m.cloth,[0,1.02,0],[1,1,.8]);
 mesh(new T.CylinderGeometry(.2,.31,.27,6),m.clothDark,[0,.75,0],[1,1,.85]);
 mesh(new T.BoxGeometry(.5,.07,.32),m.leather,[0,.9,0]);
 mesh(new T.BoxGeometry(.07,.75,.06),m.leather,[-.025,1.1,.22],[1,1,1],torso,[0,0,-.63]);
 mesh(new T.BoxGeometry(.37,.44,.25),m.leather,[0,1.09,-.24]);
 mesh(new T.CylinderGeometry(.137,.125,.12,8),m.skin,[0,1.37,0]);
 mesh(new T.SphereGeometry(.197,7,5),m.skin,[0,1.54,.02],[.83,1, .84]);
 mesh(new T.ConeGeometry(.047,.09,4),m.skin,[0,1.52,.196],[1,1,1],torso,[Math.PI/2,0,0]);
 for(const x of [-.065,.065])mesh(new T.SphereGeometry(.013,5,4),m.dark,[x,1.59,.164]);
 // Faceted, folded explorer's hat. Broad brim produces a real face shadow.
 mesh(new T.CylinderGeometry(.43,.45,.042,9),m.cloth,[0,1.71,0],[1,1,.82],torso,[0,0,-.055]);
 mesh(new T.CylinderGeometry(.13,.27,.26,6),m.cloth,[0,1.85,0],[1,1,.85],torso,[0,0,-.11]);
 mesh(new T.ConeGeometry(.135,.19,6),m.cloth,[-.024,2.047,0],[1,1,.9],torso,[0,0,.23]);
 mesh(new T.CylinderGeometry(.274,.275,.064,9),m.clothDark,[0,1.746,0],[1,1,.85]);
 const limbs=[];
 for(const side of [-1,1]){
  const leg=new T.Group();leg.position.set(side*.14,.71,0);root.add(leg);mesh(new T.CylinderGeometry(.092,.078,.35,5),m.clothDark,[0,-.17,0],[1,1,1],leg);mesh(new T.CylinderGeometry(.079,.066,.25,5),m.cloth,[0,-.445,0],[1,1,1],leg);mesh(new T.BoxGeometry(.17,.12,.29),m.leather,[0,-.63,.055],[1,1,1],leg);limbs.push(leg);
  const arm=new T.Group();arm.position.set(side*.30,1.22,0);arm.rotation.z=side*.13;torso.add(arm);mesh(new T.CylinderGeometry(.092,.067,.3,5),m.cloth,[0,-.15,0],[1,1,1],arm);mesh(new T.CylinderGeometry(.066,.052,.28,5),m.clothDark,[0,-.405,.025],[1,1,1],arm);mesh(new T.SphereGeometry(.068,6,4),m.skin,[0,-.56,.044],[1,1.25,.8],arm);limbs.push(arm);
 }
 let walkPhase=0;return {root,update(dt,time,moving){walkPhase+=dt*(moving?8:1);root.position.y=ground(root.position.x,root.position.z);torso.position.y=Math.sin(time*1.8)*.012;for(let i=0;i<limbs.length;i++)limbs[i].rotation.x=moving?Math.sin(walkPhase+(i<2?0:Math.PI))*(i%2?-.35:.45):Math.sin(time*1.2+i)*.025;}};
}
export function waystones(scene,m){
 const group=new T.Group();group.name='path markers';scene.add(group);const batch=new Batch();
 const points=[[4.1,5.6,1.1],[6,5.3,1.65]];
 for(const [x,z,s] of points){const y=ground(x,z);const g=new T.DodecahedronGeometry(1,0);batch.add(g,transform([x,y+s*.43,z],[s*.64,s,s*.48],[0,.23,-.17]),'#b4b6a9');}
 batch.mesh(m.stone,group);
 // Raised inlaid route mark: drawn geometry, not text or a copied logo.
 const line=new Batch();const x=6,y=ground(6,5.3)+1.4,z=6.11;
 for(let i=0;i<3;i++){const yy=y-i*.3;line.beam([x-.15,yy-.08,z],[x,yy+.06,z],.012);line.beam([x,yy+.06,z],[x+.15,yy-.08,z],.012);}
 line.mesh(m.chalk,group).castShadow=false;
 return group;
}

export function birds(scene){const group=new T.Group();scene.add(group);const mat=new T.MeshBasicMaterial({color:'#334b55',side:T.DoubleSide});const list=[];for(let i=0;i<7;i++){const b=new T.Group(),wings=[];for(const sign of [-1,1]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,sign*.8,.06,.1,sign*.39,0,.26],3));const wing=new T.Mesh(g,mat);b.add(wing);wings.push(wing);}group.add(b);list.push({b,wings,i});}return {update(t){for(const {b,wings,i}of list){b.position.set(Math.cos(t*.043+i*.17)*72,26+Math.sin(t*.12+i)*1.1,Math.sin(t*.043+i*.17)*60-30);b.rotation.y=-t*.043-i*.17+Math.PI/2;wings[0].rotation.z=Math.sin(t*2.4+i)*.23;wings[1].rotation.z=-Math.sin(t*2.4+i)*.23;}}};}
