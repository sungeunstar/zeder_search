import * as T from '../vendor/three.module.js';
const V=(...v)=>new T.Vector3(...v),clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
const TOOL_NAMES={research:'고객 조사 계획',landing:'소개 페이지',outreach:'제안 메시지',content:'콘텐츠',interview:'질문지',tracker:'반응 기록'};
// Stationery follows actual request data. No prop drives or stretches the rig.
export function createWorkProps(shell,worker,result,ribbon){
 const root=new T.Group();root.name='state-linked-stationery';shell.root.add(root);
 const paper=new T.MeshStandardMaterial({color:'#f1e5c9',roughness:.96,side:T.DoubleSide}),linen=new T.MeshStandardMaterial({color:'#657b7c',roughness:.96}),brass=new T.MeshStandardMaterial({color:'#be9d62',metalness:.28,roughness:.64}),ink=new T.MeshStandardMaterial({color:'#657266',roughness:1});
 function box(size,pos,mat=paper,where=root){const o=new T.Mesh(new T.BoxGeometry(...size),mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;where.add(o);return o;}
 const note=new T.Group();note.position.set(-1.24,1.944,2.00);root.add(note);box([.99,.024,.56],[0,0,0],linen,note);box([.455,.015,.51],[-.235,.018,0],paper,note);box([.455,.015,.51],[.235,.018,0],paper,note);
 const leaf=new T.Group();leaf.position.set(0,.034,0);note.add(leaf);box([.45,.006,.50],[.227,0,0],paper,leaf);
 for(let i=0;i<5;i++){box([.32-i*.025,.002,.005],[-.235,.029,-.16+i*.069],ink,note);box([.30-i*.016,.002,.005],[.235,.005,-.16+i*.07],ink,leaf);}
 const tray=new T.Group();tray.position.set(-1.24,1.93,2.12);root.add(tray);box([1.22,.035,.76],[0,0,0],linen,tray);for(const x of [-.6,.6])box([.025,.085,.76],[x,.032,0],brass,tray);box([1.22,.085,.025],[0,.032,-.37],brass,tray);
 const envelope=box([.48,.014,.31],[-2.12,1.943,1.90]);envelope.name='request-received';envelope.visible=false;
 const reviewSeal=new T.Mesh(new T.CylinderGeometry(.066,.066,.012,18),brass);reviewSeal.position.set(-.87,1.982,2.18);root.add(reviewSeal);reviewSeal.visible=false;
 const toolGroup=new T.Group();toolGroup.name='actual-plan-tools';root.add(toolGroup);const pins=[];
 for(let i=0;i<3;i++){const pin=new T.Mesh(new T.SphereGeometry(.045,10,8),brass.clone());pin.position.set(-.27,4.32-i*.63,-2.785);root.add(pin);pins.push(pin);}
 let info={},signature='',pageTurn=0,revisionPulse=0,toolIds=[],last={};
 function updateTools(ids){
  while(toolGroup.children.length){const o=toolGroup.children[0];toolGroup.remove(o);o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();}
  ids.slice(0,3).forEach((key,i)=>{const c=document.createElement('canvas');c.width=384;c.height=256;const x=c.getContext('2d');x.fillStyle='#ebdfbd';x.fillRect(0,0,384,256);x.strokeStyle='#687a70';x.lineWidth=5;x.strokeRect(28,24,328,208);x.font='600 29px Pretendard, sans-serif';x.fillStyle='#3d554e';x.fillText(TOOL_NAMES[key]||'준비 도구',45,83);x.font='22px Pretendard, sans-serif';x.fillText('실행 전 초안',45,123);for(let y=160;y<211;y+=21){x.beginPath();x.moveTo(45,y);x.lineTo(320,y);x.stroke();}const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const tile=new T.Mesh(new T.PlaneGeometry(.74,.49),new T.MeshStandardMaterial({map:texture,roughness:1,side:T.DoubleSide}));tile.rotation.set(-Math.PI/2,0,0);tile.position.set(.48+i*.84,1.954,1.46);toolGroup.add(tile);});
 }
 function setState(next){const switched=info.threadId!==next.threadId,newOutput=next.outputId&&next.outputId!==info.outputId;if(!switched&&newOutput&&info.outputId)revisionPulse=1;if(switched){pageTurn=0;revisionPulse=0;}info={...next};envelope.visible=!!info.threadId;toolIds=info.outputId?Array.from(new Set(info.tools||[])).filter(key=>TOOL_NAMES[key]):[];const sig=toolIds.join('|');if(sig!==signature){signature=sig;updateTools(toolIds);}reviewSeal.visible=!!info.outputId&&['reviewed','preparing'].includes(info.stage);reviewSeal.material.color.set(info.stage==='reviewed'?'#91ab86':'#c7ac77');}
 function update(dt,time,pose,reduce=false){
  const moving=pose.action==='walk'||pose.speed>.03,readingDesk=!moving&&pose.station==='desk'&&['tidy','prepare'].includes(pose.action),u=(pose.elapsed||0)%4.6;
  pageTurn=reduce?0:readingDesk?(u<2?ease(u/2)*Math.PI:Math.PI*(1-ease((u-2)/2.6))):0;leaf.rotation.z=pageTurn;note.position.x=-1.24+(readingDesk?Math.sin((pose.elapsed||0)*1.4)*.025:0);
  revisionPulse=Math.max(0,revisionPulse-dt*.35);const populated=[info.audience,info.offer,info.firstAction];pins.forEach((p,i)=>{p.visible=!!populated[i];p.material.emissive.set('#c8a254');p.material.emissiveIntensity=reduce?0:revisionPulse*.65;});
  const putting=pose.action==='prepare'||pose.action==='ready';result.position.set(-1.24,1.979+(putting&&!reduce?Math.max(0,1-ease((pose.elapsed||0)/.8))*.035:0),2.12);ribbon.position.set(-.93,result.position.y+.035,2.12);reviewSeal.position.y=result.position.y+.045;shell.resultAnchor?.position.copy(result.position).add(V(0,.16,0));
  last={pageAngle:pageTurn,folioHeld:worker.debug().heldNotebook,tools:[...toolIds],reviewStamp:reviewSeal.visible,boardFields:[...populated],resultVisible:result.visible,contacts:{}};return {};
 }
 return {setState,update,debug:()=>last};
}
