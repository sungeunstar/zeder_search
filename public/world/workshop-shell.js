import * as T from '../vendor/three.module.js';
import {Batch,V,transform,texture,leafGeometry} from './craft.js';
import {random,ground,HOUSE} from './math.js';

// Original, procedural architecture. No image plane masquerading as a 3D scene.
export function createWorkshop(scene,m){
 const root=new T.Group();root.name='Seaside strategy workshop';root.position.set(HOUSE.x,ground(HOUSE.x,HOUSE.z)+.02,HOUSE.z);scene.add(root);
 const rnd=random(212),wood=new Batch(),planks=new Batch(),stone=new Batch(),roof=new Batch(),metal=new Batch(),paper=new Batch(),colored=new Batch();
 const timber=new T.MeshStandardMaterial({color:'#ddbb91',map:m.timber.map,normalMap:m.timber.normalMap,normalScale:new T.Vector2(.65,.65),roughness:.83});
 const boardMat=new T.MeshStandardMaterial({color:'#efd0a2',map:m.boards.map,normalMap:m.boards.normalMap,normalScale:new T.Vector2(.5,.5),roughness:.88});
 const tileMat=new T.MeshStandardMaterial({color:'#ddd6bf',vertexColors:true,map:texture('rock',38),bumpScale:.025,roughness:.88});
 const white=new T.MeshStandardMaterial({color:'#eee3c7',roughness:.91,side:T.DoubleSide});
 const colorMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.82});
 function obj(g,mat,p,scale=[1,1,1],rot=[0,0,0],parent=root){const o=new T.Mesh(g,mat);o.position.set(...p);o.scale.set(...scale);o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 // Stone footings and separate, beveled floorboards.
 stone.box([0,.12,.15],[9.55,.35,7.15],[0,0,0],'#a6a292');
 for(let i=0;i<25;i++)planks.box([-4.52+i*.376,.34,.2],[.351,.13,7.0]);
 for(let i=0;i<2;i++)wood.box([0,-.10-i*.18,3.87+i*.43],[5.9,.2,.67]);
 for(const x of [-4.35,4.35])for(const z of [-3.12,3.46]){
  stone.box([x,.39,z],[.66,.36,.66],[0,0,0],'#a39d8b');
  wood.box([x,2.9,z],[.31,5.3,.33],[0,0,(rnd()-.5)*.015]);
  wood.beam([x,4.08,z],[x-Math.sign(x)*1.05,5.32,z],.115);
 }
 // Back wall with actual slats. Open front and left side preserve the ocean view.
 for(let i=0;i<27;i++)planks.box([-4.25+i*.323,2.81,-3.17],[.307,4.85,.13]);
 for(const y of [.64,5.25])wood.box([0,y,-3.03],[8.95,.22,.24]);
 for(const z of [-3.07,3.46])wood.box([0,5.29,z],[9.55,.32,.3]);
 for(const x of [-4.35,4.35])wood.box([x,5.27,.16],[.28,.25,7.14]);
 for(let i=0;i<10;i++)planks.box([4.37,2.45,-2.95+i*.29],[.13,4.1,.27]);
 const rearGable=new T.Shape();rearGable.moveTo(-4.34,5.23);rearGable.lineTo(0,7.73);rearGable.lineTo(4.34,5.23);rearGable.closePath();planks.add(new T.ExtrudeGeometry(rearGable,{depth:.12,bevelEnabled:false}),transform([0,0,-3.23]));
 // Exposed king-post trusses and roof rafters.
 const peak=7.95,eave=5.20,reach=4.85;
 for(const z of [-3.42,-1.8,.05,1.88,3.74]){
  wood.beam([-reach,eave,z],[0,peak,z],.14);wood.beam([0,peak,z],[reach,eave,z],.14);
  if(z===3.74||z===-3.42){wood.box([0,6.52,z],[.19,2.61,.2]);wood.beam([-2.6,5.33,z],[0,6.91,z],.078);wood.beam([2.6,5.33,z],[0,6.91,z],.078);}
 }
 wood.box([0,7.94,.1],[.24,.23,7.8]);
 const angle=Math.atan2(peak-eave,reach),slope=Math.hypot(peak-eave,reach);
 const shape=new T.Shape();shape.moveTo(-.25,-.28);shape.lineTo(.25,-.28);shape.lineTo(.25,.20);shape.quadraticCurveTo(.17,.38,0,.38);shape.quadraticCurveTo(-.20,.37,-.25,.20);shape.closePath();
 const tile=new T.ExtrudeGeometry(shape,{depth:.047,bevelEnabled:true,bevelSegments:1,bevelSize:.018,bevelThickness:.009,curveSegments:3});
 for(const side of [-1,1]){
  const basis=new T.Matrix4().makeBasis(V(0,0,side),V(side*Math.cos(angle),-Math.sin(angle),0),V(side*Math.sin(angle),Math.cos(angle),0));
  for(let row=0;row<13;row++)for(let col=0;col<17;col++){
   const d=.04+row*slope/12.4,zz=(col-8)*.456+(row%2)*.23;
   const mat=basis.clone();mat.setPosition(side*Math.cos(angle)*d,peak+.055-Math.sin(angle)*d+(13-row)*.008,zz+.1);
   roof.add(tile,mat,new T.Color().setHSL(.59+rnd()*.035,.105+rnd()*.045,.23+rnd()*.14));
  }
 }
 // Rounded ridge caps.
 for(let i=0;i<20;i++)roof.add(new T.CylinderGeometry(.19,.19,.44,8,1,false,0,Math.PI),transform([0,8.05,(i-9.5)*.4+.12],[1,1,1],[Math.PI/2,0,0]),'#667076');
 for(const side of [-1,1])wood.box([side*4.99,5.09,.15],[.24,.24,8.05]);
 // Weathered stone chimney with separate joints and a cap.
 for(let row=0;row<10;row++)for(let i=0;i<3;i++)stone.box([2.66+(i-1)*.34+(row%2)*.04,6.46+row*.285,-1.74],[.316,.263,.84],[0,0,0],new T.Color().setHSL(.095,.08,.34+rnd()*.13));
 stone.box([2.68,9.38,-1.74],[1.23,.22,1.10],[0,0,0],'#8e9288');
 metal.box([2.68,9.52,-1.74],[.76,.05,.59]);
 // Central workbench: underframe, drawers, dovetail-like strips and separate timber planks.
 for(const x of [-2.8,2.8])for(const z of [.61,1.95])wood.box([x,1.03,z],[.21,1.43,.21]);
 wood.box([0,.78,1.9],[5.92,.16,.17]);wood.box([0,.64,.72],[5.95,.17,.19]);
 for(let i=0;i<7;i++)planks.box([0,1.82,.52+i*.26],[6.55,.18,.244]);
 for(let i=0;i<4;i++){const x=-2.3+i*1.51;planks.box([x,1.53,2.11],[1.40,.36,.15]);metal.box([x,1.53,2.22],[.25,.047,.047]);}
 // Back shelves filled with books, bottles and small original workshop props.
 for(const y of [1.48,2.58,3.7]){
  planks.box([-2.36,y,-2.70],[3.38,.15,.72]);
  for(const x of [-3.75,-.96])wood.beam([x,y-.47,-3.03],[x,y-.04,-2.42],.04);
  let x=-3.73;for(let i=0;i<9;i++){
   const w=.12+rnd()*.12,h=.29+rnd()*.38;
   const cc=new T.Color(['#566951','#a78b5f','#744f3f','#52696c','#c7b68f'][i%5]);
   colored.box([x+w*.5,y+.11+h*.5,-2.73],[w,h,.32],[0,0,(rnd()-.5)*.1],cc);
   paper.box([x+w*.5,y+.11+h*.5,-2.545],[w*.76,h*.87,.011]);x+=w+.062;
  }
 }
 // Large strategy board. The canvas only paints text on an actual physical board.
 wood.box([1.69,3.3,-2.98],[4.42,2.83,.14]);
 const boardCanvas=document.createElement('canvas');boardCanvas.width=1024;boardCanvas.height=640;const bc=boardCanvas.getContext('2d');
 const boardTexture=new T.CanvasTexture(boardCanvas);boardTexture.colorSpace=T.SRGBColorSpace;boardTexture.anisotropy=4;
 const board=obj(new T.PlaneGeometry(4.17,2.60),new T.MeshStandardMaterial({map:boardTexture,color:'#fff6db',roughness:1}),[1.69,3.3,-2.88]);board.name='live strategy board';
 // Papers held by copper pins, placed to the left and under the brief board.
 for(let i=0;i<6;i++){const x=-.74+(i%3)*.65,y=.95+Math.floor(i/3)*.54;paper.box([x,y,-3.035],[.49,.46,.016],[0,0,(rnd()-.5)*.13]);obj(new T.SphereGeometry(.021,6,4),m.iron,[x,y+.17,-3]);}
 // Warm pendant: cord, metal shade, glowing diffuser.
 wood.beam([-.35,7.63,.45],[-.35,4.18,.45],.011);obj(new T.ConeGeometry(.38,.27,16,1,true),m.iron,[-.35,4.20,.45],[1,1,1],[Math.PI,0,0]);
 const glow=new T.MeshStandardMaterial({color:'#ffe6ac',emissive:'#ffc369',emissiveIntensity:2.2,roughness:.25});
 obj(new T.CircleGeometry(.31,20),glow,[-.35,4.06,.45],[1,1,1],[Math.PI/2,0,0]);const warm=new T.PointLight('#ffcc86',15,10,2);warm.position.set(-.35,3.78,.65);root.add(warm);
 function lantern(x,y,z){metal.box([x,y,z],[.33,.55,.31]);obj(new T.BoxGeometry(.27,.39,.32),glow,[x,y,z+.015]);for(const dx of [-.16,.16])metal.box([x+dx,y,z+.18],[.035,.50,.035]);metal.box([x,y-.25,z],[.40,.055,.36]);obj(new T.ConeGeometry(.29,.18,4),m.iron,[x,y+.33,z],[1,1,1],[0,Math.PI/4,0]);metal.add(new T.TorusGeometry(.09,.015,5,12),transform([x,y+.49,z]));const l=new T.PointLight('#ffd297',4.3,5,2);l.position.set(x,y,z+.25);root.add(l);}
 lantern(-4.34,2.9,3.73);lantern(4.35,3.0,3.73);lantern(3.63,4.66,-2.6);
 // The aisle stays open. No kiln, anvil or simulated production flame.
 const ember=new T.PointLight('#ffdfae',0,1,2);
 // Crates, rolls, books, stool, bucket and plants outside the open facade.
 function crate(x,y,z,w=.9){planks.box([x,y+w*.5,z],[w,w,w*.84]);for(const xx of [-1,1])wood.box([x+xx*w*.45,y+w*.5,z+w*.46],[w*.07,w,.055]);for(const yy of [.08,.91])wood.box([x,y+w*yy,z+w*.46],[w,.07,.056]);wood.beam([x-w*.38,y+.13,z+w*.49],[x+w*.38,y+w*.86,z+w*.49],.04);}
 crate(5.1,.32,2.1,1.05);crate(5.9,.33,1.26,.76);crate(-4.95,.10,1.94,.97);lantern(5.1,1.75,2.13);
 const stool=new Batch();obj(new T.CylinderGeometry(.48,.46,.16,14),boardMat,[2.4,1.38,3.18]);for(const xx of [-1,1])for(const zz of [-1,1])stool.beam([2.4+xx*.34,.35,3.18+zz*.30],[2.4+xx*.24,1.34,3.18+zz*.22],.055);stool.mesh(timber,root);
 obj(new T.CylinderGeometry(.39,.30,.71,12,1,true),boardMat,[4.72,.72,3.32]);
 for(let i=0;i<7;i++){const a=i*2.4;obj(new T.CylinderGeometry(.068,.068,.95+rnd()*.45,9),white,[4.72+Math.sin(a)*.19,1.34,3.32+Math.cos(a)*.17],[1,1,1],[Math.sin(a)*.12,0,Math.cos(a)*.12]);}
 // Barrel with staves and metal bands.
 obj(new T.CylinderGeometry(.47,.39,.93,12),boardMat,[-5.29,.56,3.1]);for(const y of [.23,.91])metal.add(new T.TorusGeometry(.451,.035,6,16),transform([-5.29,y,3.1],[1,1,1],[Math.PI/2,0,0]));
 // Small leaves use 3D instancing; potted herbs prevent a sterile furniture-only scene.
 const plantParts=[];
 function plant(x,y,z,s=1){obj(new T.CylinderGeometry(.19,.13,.32,10),new T.MeshStandardMaterial({color:'#766644',roughness:1}),[x,y+.16*s,z],[s,s,s]);for(let i=0;i<16;i++){const a=i*2.399,r=.06+rnd()*.23;plantParts.push(transform([x+Math.cos(a)*r*s,y+.26*s+rnd()*.32*s,z+Math.sin(a)*r*s],[.40*s,.66*s,.42*s],[-.5+rnd(),a,Math.cos(a)*.65]));}}
 plant(-3.49,3.80,-2.53,.85);plant(3.6,1.93,1.58,1);plant(5.87,1.17,1.3,1.15);plant(-5.0,1.07,1.91,1);
 const pg=new T.InstancedMesh(leafGeometry(),new T.MeshStandardMaterial({color:'#516835',roughness:1,side:T.DoubleSide}),plantParts.length);plantParts.forEach((v,i)=>pg.setMatrixAt(i,v));pg.castShadow=true;root.add(pg);
 // Honest work-in-progress sheets. Content derives from the current conversation only.
 const sheets=new T.Group();root.add(sheets);let s=0;
 for(const [x,z,rot]of [[-.6,1.28,-.09],[.6,1.14,.1],[1.41,1.35,-.23]]){
  const o=obj(new T.BoxGeometry(.95,.014,.67),white,[x,1.93+s*.019,z],[1,1,1],[0,rot,0],sheets);o.name='strategy draft';s++;
 }
 const lines=new Batch();for(let i=0;i<5;i++)lines.box([.66,1.979,.98+i*.065],[.59-i*.035,.002,.008]);lines.mesh(new T.MeshBasicMaterial({color:'#6b756c'}),sheets);
 // Blank stationery is material, not a fabricated customer result.
 for(let i=0;i<4;i++)paper.box([2.08,1.951+i*.008,1.33],[.65,.008,.8],[0,.16+i*.01,0]);
 paper.box([-2.27,1.945,1.21],[.63,.012,.43],[0,-.14,0]);
 // Pencil, ink bottle, brass divider and an envelope on the desktop.
 wood.beam([-1.71,1.96,.90],[-1.18,1.96,1.11],.025);obj(new T.ConeGeometry(.025,.1,6),m.dark,[-1.18,1.96,1.11],[1,1,1],[0,0,-Math.PI/2]);
 obj(new T.CylinderGeometry(.11,.13,.23,8),m.glass,[-1.72,2.04,1.63]);metal.box([-1.72,2.18,1.63],[.14,.06,.14]);
 const stamp=obj(new T.CylinderGeometry(.10,.13,.05,12),new T.MeshStandardMaterial({color:'#9e4637',roughness:.64}),[1.12,1.99,1.30]);stamp.visible=false;
 // Roof pennant, animated in real geometry.
 metal.beam([-.67,7.8,-.8],[-.67,9.28,-.8],.025);
 const fg=new T.PlaneGeometry(.90,.49,10,5);const fmat=new T.MeshStandardMaterial({color:'#536871',side:T.DoubleSide,roughness:1});const flag=obj(fg,fmat,[-.16,8.99,-.8]);flag.castShadow=false;const fp=fg.attributes.position,base=fp.array.slice();
 // Smoke: translucent puffs, not a saved animation/video.
 const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=64;const sc=smokeCanvas.getContext('2d');const grad=sc.createRadialGradient(32,32,0,32,32,30);grad.addColorStop(0,'rgba(245,237,218,.42)');grad.addColorStop(.42,'rgba(233,228,216,.22)');grad.addColorStop(1,'rgba(233,228,216,0)');sc.fillStyle=grad;sc.fillRect(0,0,64,64);const st=new T.CanvasTexture(smokeCanvas);const smoke=[];
 for(let i=0;i<9;i++){const sp=new T.Sprite(new T.SpriteMaterial({map:st,transparent:true,opacity:.40,depthWrite:false,color:'#eee4cd'}));root.add(sp);smoke.push(sp);}
 wood.mesh(timber,root);planks.mesh(boardMat,root);stone.mesh(m.stone,root);roof.mesh(tileMat,root);metal.mesh(m.iron,root);paper.mesh(white,root);colored.mesh(colorMat,root);
 const worker=createArtisan(root,m,obj);worker.root.position.set(-1.0,.39,2.87);worker.root.rotation.y=Math.PI+.21;worker.root.scale.setScalar(1.12);
 let info={stage:'idle',audience:'',channel:'',offer:'',count:0},intensity=0,lastBoard='';
 function drawBoard(){const sig=JSON.stringify(info);if(sig===lastBoard)return;lastBoard=sig;bc.fillStyle='#dbc79d';bc.fillRect(0,0,1024,640);
  bc.fillStyle='#d0ba90';for(let i=0;i<650;i++)bc.fillRect(rnd()*1024,rnd()*640,1,1);
  bc.fillStyle='#6c543c';bc.font='600 28px Montserrat, Pretendard, sans-serif';bc.fillText('Z /  STRATEGY ATELIER',66,70);bc.strokeStyle='#a18e6e';bc.lineWidth=1;bc.beginPath();bc.moveTo(62,98);bc.lineTo(960,98);bc.stroke();
  const fields=[['누구에게',info.audience],['어떤 제안',info.offer],['첫 실행',info.firstAction]];
  fields.forEach(([k,v],i)=>{const yy=180+i*155;bc.font='600 42px Pretendard, sans-serif';bc.fillStyle='#574b37';bc.fillText(k,72,yy);bc.font='30px Pretendard, sans-serif';bc.fillStyle='#71654e';const text=String(v||'').slice(0,27);bc.fillText(text,72,yy+53);bc.strokeStyle='#b4a17e';bc.beginPath();bc.moveTo(70,yy+73);bc.lineTo(950,yy+73);bc.stroke();});
  boardTexture.needsUpdate=true;
 }
 drawBoard();
 return {root,worker,boardTexture,setState(next){info={...info,...next};drawBoard();stamp.visible=info.stage==='reviewed'||info.stage==='preparing';sheets.visible=info.stage!=='idle';},
  update(dt,time){const working=info.stage==='thinking';intensity+=(Number(working)-intensity)*(1-Math.exp(-Math.max(dt,0)*4));worker.update(time,intensity);warm.intensity=14.7+Math.sin(time*1.9)*.35;ember.intensity=2.4+Math.sin(time*2.1)*.12;
   for(let i=0;i<fp.count;i++){const x=base[i*3],y=base[i*3+1];fp.setXYZ(i,x,y,base[i*3+2]+Math.sin(x*5+time*2.3+y*1.7)*(x+.45)*.095);}fp.needsUpdate=true;
   smoke.forEach((sp,i)=>{const t=(time*.10+i/9)%1;sp.position.set(2.69+t*1.8+Math.sin(t*7+i)*.18,9.51+t*3.6,-1.7-t*.5);sp.scale.setScalar(.85+t*1.8);sp.material.opacity=.5*(1-t)*Math.min(t*6,1);});
  },debug(){return {stage:info.stage,working:info.stage==='thinking',worker:worker.root.position.toArray(),sheetsVisible:sheets.visible,boardFields:[info.audience,info.channel,info.offer]};}};
}

function createArtisan(parent,m,obj){
 const root=new T.Group();root.name='artisan';parent.add(root);const body=new T.Group();root.add(body);
 const cloth=new T.MeshStandardMaterial({color:'#d6cab0',roughness:.98});const apron=new T.MeshStandardMaterial({color:'#8c7960',roughness:1});
 const add=(g,mat,p,rot=[0,0,0],s=[1,1,1],where=body)=>obj(g,mat,p,s,rot,where);
 add(new T.CylinderGeometry(.245,.28,.58,9),cloth,[0,1.15,0],[0,0,0],[1,1,.84]);
 add(new T.CylinderGeometry(.24,.25,.35,8),apron,[0,.80,0],[0,0,0],[1,1,.78]);
 add(new T.BoxGeometry(.42,.59,.046),apron,[0,1.10,.24],[.08,0,0]);add(new T.BoxGeometry(.20,.16,.035),m.leather,[0,1.05,.271]);
 for(const side of [-1,1]){add(new T.BoxGeometry(.062,.65,.03),m.leather,[side*.15,1.18,-.214],[0,0,-side*.14]);add(new T.BoxGeometry(.065,.23,.037),m.leather,[side*.15,1.40,.22],[0,0,side*.10]);}
 add(new T.CylinderGeometry(.11,.12,.14,8),m.skin,[0,1.49,0]);
 const head=new T.Group();head.position.set(0,1.69,.03);body.add(head);add(new T.SphereGeometry(.21,12,8),m.skin,[0,0,0],[0,0,0],[.85,1,.87],head);
 add(new T.CylinderGeometry(.39,.41,.054,16),cloth,[0,.16,0],[0,0,-.02],[1,1,.85],head);add(new T.CylinderGeometry(.20,.25,.27,12),cloth,[0,.30,0],[0,0,-.03],[1,1,.85],head);add(new T.CylinderGeometry(.254,.26,.055,14),m.leather,[0,.205,0],[0,0,0],[1,1,.85],head);
 add(new T.SphereGeometry(.047,8,6),m.skin,[0,-.003,.181],[0,0,0],[.65,.8,1],head);for(const x of [-.067,.067])add(new T.SphereGeometry(.014,6,4),m.dark,[x,.044,.163],[0,0,0],[1,1,1],head);
 for(const side of [-1,1]){add(new T.CylinderGeometry(.10,.085,.46,7),apron,[side*.14,.52,0]);add(new T.CylinderGeometry(.085,.08,.18,7),cloth,[side*.14,.215,0]);add(new T.BoxGeometry(.195,.19,.31),m.leather,[side*.14,.094,.047]);}
 const arms=[];
 for(const side of [-1,1]){const a=new T.Group();a.position.set(side*.30,1.37,0);body.add(a);add(new T.CylinderGeometry(.10,.082,.31,8),cloth,[0,-.13,.085],[-.5,0,0],[1,1,1],a);add(new T.CylinderGeometry(.074,.057,.33,7),m.skin,[0,-.26,.28],[-1.14,0,0],[1,1,1],a);add(new T.SphereGeometry(.067,8,6),m.skin,[0,-.327,.417],[0,0,0],[1,1,.85],a);arms.push(a);}
 const pencil=new T.Mesh(new T.CylinderGeometry(.015,.015,.26,6),m.timber);pencil.position.set(0,-.36,.45);pencil.rotation.x=.45;arms[1].add(pencil);
 return {root,update(t,a){body.rotation.x=.055+a*.07;body.position.y=Math.sin(t*1.4)*.008;head.rotation.x=.09+a*.15;head.rotation.y=Math.sin(t*.3)*.08;arms[0].rotation.x=.06+Math.sin(t*1.1)*.018;arms[1].rotation.x=Math.sin(t*(1.2+a*3.4))*(.014+a*.11);arms[1].rotation.y=Math.sin(t*4)*a*.08;}};
}
