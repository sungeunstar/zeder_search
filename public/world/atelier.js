import * as T from '../vendor/three.module.js';
import {ground,clamp,smooth} from './math.js';
import {makeMaterials,V} from './craft.js';
import {makeIsland,makeMeadow} from './land.js';
import {birds} from './objects.js';
import {trees} from './foliage.js';
import {atmosphere} from './atmosphere.js';
import {createLens} from './lens.js';
import {coastalPlants} from './coastal-plants.js';
import {createWorkshop} from './workshop.js';

export const ATELIER_CAMERA={position:[-10.3,26.7,25.9],target:[.6,23.0,-3.2],fov:38};
export function createAtelier(host){
 const mobile=matchMedia('(max-width:700px)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const gl=renderer.getContext(),gpu=gl.getExtension('WEBGL_debug_renderer_info');const software=/swiftshader|llvmpipe|softpipe/i.test(gpu?gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL):'');const lightGeometry=mobile;
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.15:1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-label','바다가 보이는 3D 공방과 작업 중인 장인');renderer.domElement.tabIndex=-1;host.replaceChildren(renderer.domElement);
 const scene=new T.Scene();scene.fog=new T.FogExp2('#b6cbd4',.0013);
 const camera=new T.PerspectiveCamera(ATELIER_CAMERA.fov,1,.15,3000);
 scene.add(new T.HemisphereLight('#d3e8f2','#514837',1.32));
 const sun=new T.DirectionalLight('#ffe2b8',4.0);sun.position.set(-28,42,26);sun.target.position.set(3,20,-2);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-29,right:29,top:29,bottom:-29,near:1,far:110});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 const bounce=new T.DirectionalLight('#bcd6e4',1.02);bounce.position.set(-2,29,38);scene.add(bounce);
 const materials=makeMaterials();materials.grass.color.set('#c1cba9');materials.leaves.color.set('#d2d5aa');materials.bark.color.set('#ece7d7');materials.stone.color.set('#ffffff');
 makeIsland(scene,materials);const grass=makeMeadow(scene,materials,lightGeometry);
 const forest=trees(scene,materials,lightGeometry,[[-3.8,-4.5,1.00],[16.2,-9.8,1.14],[21.4,-.8,.99],[8.3,-14.5,.85],[21.5,5.3,1.1],[-11,2,.74],[22,3,.92]]);
 const shrubs=coastalPlants(scene,materials);
 const shop=createWorkshop(scene,materials),air=atmosphere(scene),gulls=birds(scene),lens=createLens(renderer,camera);
 const finalPos=V(...ATELIER_CAMERA.position),finalAim=V(...ATELIER_CAMERA.target);
 if(mobile){finalPos.set(-9.4,28.5,33.4);finalAim.set(2.5,23.2,-3);camera.fov=50;camera.updateProjectionMatrix();}
 const path=new T.CatmullRomCurve3([V(-29,29.6,39),V(-19,28.5,32),V(-11,26.9,26.4),finalPos],false,'centripetal');
 const pointer=new T.Vector2(),pointerLerp=new T.Vector2();
 let active=true,paused=reduced.matches,mode='intro',elapsed=0,time=0,last=performance.now(),raf=0,frames=0,disposed=false,view='home',slow=0,workState={stage:'idle'};
 function status(){document.body.dataset.worldPhase=mode;host.dataset.renderer='three-r169';host.dataset.state=mode;}
 function finish(){mode='home';elapsed=5;camera.position.copy(finalPos);camera.lookAt(finalAim);status();try{sessionStorage.setItem('zeder-atelier-seen','1');}catch{}}
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const s=renderer.getDrawingBufferSize(new T.Vector2());lens.setSize(s.x,s.y);if(frames&&active&&paused)draw(0);}
 function draw(dt){
  if(mode==='intro'){elapsed+=dt;const t=smooth(elapsed/5);camera.position.copy(path.getPoint(t));camera.lookAt(finalAim.clone().lerp(V(2,20,0),.25*(1-t)));if(elapsed>=5)finish();}
  else{pointerLerp.lerp(pointer,1-Math.exp(-Math.max(dt,.016)*2.2));const p=finalPos.clone().add(V(pointerLerp.x*.52,pointerLerp.y*.15,view==='chat'?-1.0:0));camera.position.lerp(p,1-Math.exp(-Math.max(dt,.016)*3.2));camera.lookAt(finalAim);}
  grass.wind.value=time;shrubs.wind.value=time;forest.wind.value=time;air.uniforms.time.value=time;air.sky.position.copy(camera.position);shop.update(dt,time);gulls.update(time);
  if(workState.stage==='thinking'&&frames%10===0)renderer.shadowMap.needsUpdate=true;
  const focus=V(5.9,23.7,-1).sub(camera.position).dot(camera.getWorldDirection(V()));lens.uniforms.uFocus.value=focus;lens.uniforms.uAperture.value=mode==='intro'?.38:1.06;lens.uniforms.uTime.value=time;lens.render(scene);frames++;host.dataset.frames=String(frames);
 }
 function tick(now){raf=0;if(disposed||!active||document.hidden)return;const raw=(now-last)/1000,dt=Math.min(.08,Math.max(.001,raw));last=now;if(!paused){time+=dt;draw(dt);}else if(!frames)draw(0);if(frames>15&&raw>.095)slow++;else slow=Math.max(0,slow-1);if(slow>25&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);slow=0;resize();}if(!paused)raf=requestAnimationFrame(tick);}
 function setView(v){const wasActive=active;view=v;active=['home','chat'].includes(v);host.hidden=!active;document.body.classList.toggle('world-home',v==='home');document.body.classList.toggle('world-chat',v==='chat');if(v==='chat'&&mode==='intro')finish();last=performance.now();if(active&&!raf&&!paused)raf=requestAnimationFrame(tick);if(!active&&wasActive){cancelAnimationFrame(raf);raf=0;}}
 function setState(next){const updated={...workState,...next};if(JSON.stringify(updated)===JSON.stringify(workState))return;workState=updated;shop.setState(workState);if(active&&paused)draw(0);}
 function pointerMove(e){pointer.set(clamp(e.clientX/innerWidth*2-1,-1,1),clamp(1-e.clientY/innerHeight*2,-1,1));}
 function visibility(){last=performance.now();if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(active&&!paused&&!raf)raf=requestAnimationFrame(tick);}
 function contextLost(e){e.preventDefault();active=false;cancelAnimationFrame(raf);raf=0;document.body.classList.add('world-unavailable');host.dataset.state='lost';document.dispatchEvent(new CustomEvent('world-error',{detail:'3D 연결이 끊겼습니다. 대화는 사용할 수 있습니다.'}));}
 function reducedChanged(){paused=reduced.matches;if(paused){finish();draw(0);}else{last=performance.now();if(active&&!raf)raf=requestAnimationFrame(tick);}}
 const listeners=[[window,'resize',resize],[window,'pointermove',pointerMove],[document,'visibilitychange',visibility],[renderer.domElement,'webglcontextlost',contextLost]];listeners.forEach(([el,e,fn])=>el.addEventListener(e,fn));reduced.addEventListener('change',reducedChanged);
 try{if(reduced.matches||sessionStorage.getItem('zeder-atelier-seen'))finish();}catch{}
 resize();draw(0);status();host.dataset.ready='true';document.body.classList.add('world-ready');if(!paused)raf=requestAnimationFrame(tick);
 return {setView,setState,skip(){finish();draw(0);},replay(){mode='intro';elapsed=0;paused=false;status();last=performance.now();if(!raf)raf=requestAnimationFrame(tick);},togglePause(){paused=!paused;if(paused&&mode==='intro')finish();last=performance.now();if(!paused&&!raf&&active)raf=requestAnimationFrame(tick);draw(0);return paused;},
  debug(){return {engine:'Three.js',revision:T.REVISION,mode,paused,active,frames,scene:'seaside-workshop',quality:lightGeometry?'light':'full',grassBlades:grass.mesh.count,leaves:forest.count,shoreShrubs:shrubs.count,terrain:"continuous-heightfield",camera:camera.position.toArray(),workshop:shop.debug(),drawCalls:lens.stats.calls,triangles:lens.stats.triangles,webgl:renderer.getContext().getParameter(renderer.getContext().VERSION)};},
  seek(s){paused=true;mode='intro';elapsed=clamp(s,0,5);time=s;if(s>=5)finish();status();draw(0);},advance(s){paused=true;time+=s;draw(s);},
  dispose(){disposed=true;cancelAnimationFrame(raf);listeners.forEach(([el,e,fn])=>el.removeEventListener(e,fn));reduced.removeEventListener('change',reducedChanged);const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());lens.dispose();renderer.dispose();host.replaceChildren();}
 };
}
