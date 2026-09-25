import * as T from '../vendor/three.module.js';
import {ground,walkable,CAMERA_SHOTS,clamp,smooth} from './math.js';
import {makeMaterials,V} from './craft.js';
import {makeIsland,makeMeadow} from './land.js';
import {atmosphere} from './atmosphere.js';
import {cottage,trees,traveler,waystones,birds} from './objects.js';
import {createLens} from './lens.js';

export function createIsland(host){
 const mobile=matchMedia('(max-width: 700px)').matches;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.15:1.4));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-label','바다 위 절벽 섬, 오두막과 여행자');renderer.domElement.tabIndex=-1;
 host.replaceChildren(renderer.domElement);
 const scene=new T.Scene();scene.fog=new T.FogExp2('#abc3c8',.0016);
 const camera=new T.PerspectiveCamera(43,1,.15,3000);
 const hemi=new T.HemisphereLight('#d3e4ed','#383729',1.65);scene.add(hemi);
 const sun=new T.DirectionalLight('#ffe0a9',3.0);sun.position.set(-24,46,24);sun.target.position.set(-1,16,0);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-29,right:29,top:29,bottom:-29,near:1,far:100});sun.shadow.normalBias=.045;sun.shadow.bias=-.00012;sun.shadow.radius=3;
 const fill=new T.DirectionalLight('#ffdfa9',1.1);fill.position.set(18,31,35);scene.add(fill);
 const materials=makeMaterials();makeIsland(scene,materials);const grass=makeMeadow(scene,materials,mobile);const forest=trees(scene,materials,mobile);cottage(scene,materials);const person=traveler(scene,materials);waystones(scene,materials);const gulls=birds(scene);const air=atmosphere(scene);
 const lens=createLens(renderer,camera);
 const path=new T.CatmullRomCurve3(CAMERA_SHOTS.map(s=>V(...s.p)),false,'centripetal');
 const aimPath=new T.CatmullRomCurve3(CAMERA_SHOTS.map(s=>V(...s.t)),false,'centripetal');
 const finalPos=V(...CAMERA_SHOTS.at(-1).p),finalAim=V(...CAMERA_SHOTS.at(-1).t);
 if(mobile){finalPos.set(9.8,26.6,31);finalAim.set(-1,22.0,-.5);}
 const pointer=new T.Vector2(),currentPointer=new T.Vector2(),keys=new Set();
 let active=true,paused=reduced.matches,mode='intro',intro=0,time=0,last=performance.now(),raf=0,disposed=false,drag=null,yaw=.4,pitch=.38,jump=0,jumpV=0,view='home',frameCount=0,lowFrames=0;
 const cameraTarget=finalAim.clone();
 function status(){document.body.dataset.worldPhase=mode;host.dataset.renderer='three-r169';host.dataset.state=mode;}
 function finish(){document.body.classList.remove('world-exploring');mode='home';intro=12;camera.position.copy(finalPos);cameraTarget.copy(finalAim);camera.lookAt(cameraTarget);try{sessionStorage.setItem('zeder-island-seen','1');}catch{}status();}
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());lens.setSize(size.x,size.y);if(frameCount>0&&active&&paused)draw(0);}
 function setView(next){view=next;active=['home','chat'].includes(next);host.hidden=!active;document.body.classList.toggle('world-home',next==='home');document.body.classList.toggle('world-chat',next==='chat');document.body.classList.toggle('world-exploring',mode==='explore'&&next==='home');if(next==='chat'){keys.clear();finish();}last=performance.now();if(active&&!raf)raf=requestAnimationFrame(tick);}
 function updateCamera(dt){
  const factor=1-Math.exp(-dt*3.4);currentPointer.lerp(pointer,factor);
  if(mode==='intro'){
   intro+=dt;const t=smooth(Math.min(1,intro/12));camera.position.copy(path.getPoint(t));cameraTarget.copy(aimPath.getPoint(t));camera.lookAt(cameraTarget);camera.rotateZ(Math.sin(t*Math.PI*2)*.025*(1-t));if(intro>=12)finish();
  }else if(mode==='explore'){
   const f=(keys.has('ArrowUp')||keys.has('w')?1:0)-(keys.has('ArrowDown')||keys.has('s')?1:0),s=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);
   const dir=V(-Math.sin(yaw)*f+Math.cos(yaw)*s,0,-Math.cos(yaw)*f-Math.sin(yaw)*s);if(dir.lengthSq())dir.normalize();const speed=keys.has('Shift')?5:2.8;const p=person.root.position,next=p.clone().addScaledVector(dir,dt*speed);
   if(walkable(next.x,next.z)){p.x=next.x;p.z=next.z;}if(dir.lengthSq())person.root.rotation.y=Math.atan2(dir.x,dir.z);
   person.update(dt,time,dir.lengthSq()>0);jumpV-=dt*8;jump=Math.max(0,jump+jumpV*dt);if(!jump)jumpV=0;person.root.position.y+=jump;
   const dist=mobile?9:7.4;const dest=p.clone().add(V(Math.sin(yaw)*Math.cos(pitch)*dist,2+Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist));camera.position.lerp(dest,1-Math.exp(-dt*6));cameraTarget.lerp(p.clone().add(V(0,1.05,0)),1-Math.exp(-dt*8));camera.lookAt(cameraTarget);
  }else{
   const dest=finalPos.clone().add(V(currentPointer.x*.75,currentPointer.y*.22,0));camera.position.lerp(dest,Math.max(factor,.02));cameraTarget.copy(finalAim).add(V(currentPointer.x*.12,0,0));camera.lookAt(cameraTarget);person.update(dt,time,false);
  }
 }
 function draw(dt){updateCamera(dt);if(mode==='explore'&&frameCount%5===0)renderer.shadowMap.needsUpdate=true;grass.wind.value=time;forest.wind.value=time;air.uniforms.time.value=time;gulls.update(time);air.sky.position.copy(camera.position);lens.uniforms.uTime.value=time;
  const focusPoint=mode==='explore'?person.root.position.clone().add(V(0,1,0)):V(-1,21.3,2.3);const forward=camera.getWorldDirection(V());lens.uniforms.uFocus.value=focusPoint.sub(camera.position).dot(forward);lens.uniforms.uAperture.value=mode==='intro'?.24:mode==='explore'?1.05:1.2;
  lens.render(scene);frameCount++;host.dataset.frames=String(frameCount);
 }
 function tick(now){raf=0;if(disposed||!active||document.hidden)return;const raw=(now-last)/1000,dt=Math.min(.1,Math.max(.001,raw));last=now;
  if(!paused){time+=dt;draw(dt);}else if(frameCount===0)draw(0);
  // CPU/software renderers should not produce a giant render target indefinitely.
  if(frameCount>12&&raw>.1)lowFrames++;else lowFrames=Math.max(0,lowFrames-1);if(lowFrames>24&&renderer.getPixelRatio()>.9){renderer.setPixelRatio(.85);lowFrames=0;resize();}
  if(!paused)raf=requestAnimationFrame(tick);
 }
 function pointerMove(e){pointer.set(clamp(e.clientX/innerWidth*2-1,-1,1),clamp(1-e.clientY/innerHeight*2,-1,1));if(drag&&mode==='explore'){yaw-=(e.clientX-drag.x)*.006;pitch=clamp(pitch+(e.clientY-drag.y)*.004,.05,.85);drag={x:e.clientX,y:e.clientY};if(paused)draw(.016);}}
 function down(e){if(mode!=='explore'||e.target!==renderer.domElement)return;drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}
 function up(){drag=null;}
 const isTyping=e=>e.target.closest?.('input,textarea,select,[contenteditable="true"]');
 function keydown(e){if(isTyping(e)||document.querySelector('dialog[open]'))return;if(e.key==='Escape'&&mode==='explore'){exitExplore();return;}if(mode!=='explore')return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift',' '].includes(key)){e.preventDefault();keys.add(key);if(key===' '&&jump===0)jumpV=3.4;}}
 function keyup(e){keys.delete(e.key.length===1?e.key.toLowerCase():e.key);}
 function explore(){finish();mode='explore';paused=false;document.body.classList.add('world-exploring');yaw=.42;pitch=.3;status();last=performance.now();if(!raf)raf=requestAnimationFrame(tick);}
 function exitExplore(){keys.clear();document.body.classList.remove('world-exploring');finish();draw(.016);document.getElementById('message')?.focus({preventScroll:true});}
 function replay(){mode='intro';intro=0;time=0;paused=false;document.body.classList.remove('world-exploring');status();last=performance.now();if(!raf)raf=requestAnimationFrame(tick);}
 function togglePause(){paused=!paused;if(paused&&mode==='intro')finish();last=performance.now();if(!paused&&!raf)raf=requestAnimationFrame(tick);draw(0);return paused;}
 function visibility(){last=performance.now();keys.clear();if(!document.hidden&&active&&!raf&&!paused)raf=requestAnimationFrame(tick);}
 function blur(){keys.clear();drag=null;}
 function contextLost(e){e.preventDefault();active=false;cancelAnimationFrame(raf);raf=0;host.dataset.state='lost';document.body.classList.add('world-unavailable');document.dispatchEvent(new CustomEvent('world-error',{detail:'3D 화면이 중단됐습니다. 대화는 계속 사용할 수 있습니다.'}));}
 function reducedChanged(){paused=reduced.matches;if(paused){finish();draw(0);}else{last=performance.now();if(!raf)raf=requestAnimationFrame(tick);}}
 const listeners=[[window,'resize',resize],[window,'pointermove',pointerMove],[renderer.domElement,'pointerdown',down],[window,'pointerup',up],[window,'keydown',keydown],[window,'keyup',keyup],[window,'blur',blur],[document,'visibilitychange',visibility],[renderer.domElement,'webglcontextlost',contextLost]];
 for(const [el,event,fn]of listeners)el.addEventListener(event,fn);reduced.addEventListener('change',reducedChanged);
 try{if(reduced.matches||sessionStorage.getItem('zeder-island-seen'))finish();}catch{}
 status();resize();draw(0);host.dataset.ready='true';document.body.classList.add('world-ready');raf=requestAnimationFrame(tick);
 return {setView,skip(){finish();draw(0);},replay,explore,exitExplore,togglePause,
  debug(){return {engine:'Three.js',revision:T.REVISION,mode,paused,frames:frameCount,grassBlades:grass.mesh.count,leaves:forest.count,camera:camera.position.toArray(),character:person.root.position.toArray(),drawCalls:lens.stats.calls,triangles:lens.stats.triangles,webgl:renderer.getContext().getParameter(renderer.getContext().VERSION)};},
  // Used only by deterministic screenshot/animation checks; does not depend on a network service.
  seek(seconds){mode='intro';intro=clamp(seconds,0,12);time=seconds;paused=true;updateCamera(0);if(seconds>=12)finish();status();draw(0);},
  advance(seconds){paused=true;time+=seconds;draw(seconds);},
  dispose(){disposed=true;cancelAnimationFrame(raf);for(const[el,event,fn]of listeners)el.removeEventListener(event,fn);reduced.removeEventListener('change',reducedChanged);const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());lens.dispose();renderer.dispose();host.replaceChildren();}
 };
}
