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
import {TIME_PRESETS,DEFAULT_TIME,approachPhase,cameraOrbit} from './environment-state.js';

export const ATELIER_CAMERA={position:[-7.2,26.9,27.0],target:[1.6,24.0,-3.2],fov:37};
export function createAtelier(host){
 const mobile=matchMedia('(max-width:700px)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const gl=renderer.getContext(),gpu=gl.getExtension('WEBGL_debug_renderer_info');const software=/swiftshader|llvmpipe|softpipe/i.test(gpu?gl.getParameter(gpu.UNMASKED_RENDERER_WEBGL):'');const lightGeometry=mobile;
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.15:1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-label','바다가 보이는 3D 공방과 작업 중인 장인');renderer.domElement.tabIndex=-1;host.replaceChildren(renderer.domElement);
 const scene=new T.Scene();scene.fog=new T.FogExp2('#b6cbd4',.0013);
 const camera=new T.PerspectiveCamera(ATELIER_CAMERA.fov,1,.15,3000);
 const hemi=new T.HemisphereLight('#d3e8f2','#514837',1.12);scene.add(hemi);
 const sun=new T.DirectionalLight('#ffe2b8',4.0);sun.position.set(-28,42,26);sun.target.position.set(3,20,-2);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-29,right:29,top:29,bottom:-29,near:1,far:110});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 const bounce=new T.DirectionalLight('#bcd6e4',1.02);bounce.position.set(-2,29,38);scene.add(bounce);
 const moon=new T.DirectionalLight('#9bbdff',0);moon.position.set(-26,40,-50);scene.add(moon);
 const materials=makeMaterials();materials.grass.color.set('#c1cba9');materials.leaves.color.set('#d2d5aa');materials.bark.color.set('#ece7d7');materials.stone.color.set('#ffffff');
 makeIsland(scene,materials);const grass=makeMeadow(scene,materials,lightGeometry);
 const forest=trees(scene,materials,lightGeometry,[[-3.8,-4.5,1.00],[16.2,-9.8,1.14],[21.4,-.8,.99],[8.3,-14.5,.85],[21.5,5.3,1.1],[-11,2,.74],[22,3,.92]]);
 const shrubs=coastalPlants(scene,materials);
 const shop=createWorkshop(scene,materials),air=atmosphere(scene,mobile),gulls=birds(scene),lens=createLens(renderer,camera);
 const finalPos=V(...ATELIER_CAMERA.position),finalAim=V(...ATELIER_CAMERA.target);
 if(mobile){finalPos.set(-8.9,27.3,33.5);finalAim.set(3.0,23.6,-3);camera.fov=49;camera.updateProjectionMatrix();}
 const path=new T.CatmullRomCurve3([V(-29,29.6,39),V(-19,28.5,32),V(-11,26.9,26.4),finalPos],false,'centripetal');
 const pointer=new T.Vector2(),pointerLerp=new T.Vector2();
 let preset=DEFAULT_TIME;try{const saved=localStorage.getItem('zeder.scene.time.v1');if(Object.hasOwn(TIME_PRESETS,saved))preset=saved;}catch{}
 let phase=TIME_PRESETS[preset],targetPhase=phase,lastLighting=-1,light=null;
 let lastReduced=reduced.matches;
 let active=true,paused=reduced.matches,mode='intro',elapsed=0,time=0,last=performance.now(),raf=0,frames=0,disposed=false,view='home',slow=0,workState={stage:'idle'};
 function status(){document.body.dataset.timeOfDay=preset;document.body.dataset.worldPhase=mode;host.dataset.renderer='three-r169';host.dataset.state=mode;}
 function finish(){mode='home';elapsed=5;camera.position.copy(finalPos);camera.lookAt(finalAim);status();try{sessionStorage.setItem('zeder-atelier-seen','1');}catch{}}
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const s=renderer.getDrawingBufferSize(new T.Vector2());lens.setSize(s.x,s.y);if(frames&&active&&paused)draw(0);}
 function draw(dt){
  if(mode==='intro'){elapsed+=dt;const t=smooth(elapsed/5);camera.position.copy(path.getPoint(t));camera.lookAt(finalAim.clone().lerp(V(2,20,0),.25*(1-t)));if(elapsed>=5)finish();}
  else{
   const desired=reduced.matches?new T.Vector2():pointer;
   pointerLerp.lerp(desired,1-Math.exp(-Math.max(dt,.016)*3.0));
   const shifted=finalPos.clone();if(view==='chat')shifted.z-=.65;
   const orbit=cameraOrbit(shifted.toArray(),finalAim.toArray(),pointerLerp.toArray(),camera.aspect);
   camera.position.lerp(V(...orbit),1-Math.exp(-Math.max(dt,.016)*4.1));camera.lookAt(finalAim);
  }
  if(!paused&&!reduced.matches)phase=approachPhase(phase,targetPhase,dt);
  light=air.apply(phase,time);
  renderer.toneMappingExposure=light.exposure;
  sun.intensity=light.sun;sun.color.set('#fff1d4').lerp(new T.Color('#ffd29a'),light.dusk*.72);
  const sd=air.uniforms.uSunDir.value;sun.position.copy(sun.target.position).addScaledVector(sd,65);
  hemi.intensity=light.hemi;hemi.color.set('#d3e8f2').lerp(new T.Color('#708bb5'),light.night);hemi.groundColor.set('#66503a').lerp(new T.Color('#263544'),light.night);
  bounce.intensity=light.bounce;bounce.color.set('#e6ddd0').lerp(new T.Color('#759bd9'),light.night);moon.intensity=light.moon;moon.position.copy(sun.target.position).addScaledVector(air.uniforms.uMoonDir.value,70);
  scene.fog.color.copy(air.uniforms.uHorizon.value);shop.setNight(light.night);
  if(Math.abs(phase-lastLighting)>.001){renderer.shadowMap.needsUpdate=true;lastLighting=phase;}

  grass.wind.value=time;shrubs.wind.value=time;forest.wind.value=time;air.uniforms.time.value=time;air.sky.position.copy(camera.position);shop.update(dt,time);gulls.update(time);
  if(workState.stage==='thinking'&&frames%10===0)renderer.shadowMap.needsUpdate=true;
  const focus=V(5.9,23.7,-1).sub(camera.position).dot(camera.getWorldDirection(V()));lens.uniforms.uFocus.value=focus;lens.uniforms.uAperture.value=mode==='intro'?.26:.62;lens.uniforms.uTime.value=time;lens.render(scene);frames++;host.dataset.frames=String(frames);
 }
 function tick(now){raf=0;if(disposed||!active||document.hidden)return;if(reduced.matches!==lastReduced){reducedChanged();return;}const raw=(now-last)/1000,dt=Math.min(.08,Math.max(.001,raw));last=now;if(!paused){time+=dt;draw(dt);}else if(!frames)draw(0);if(frames>15&&raw>.095)slow++;else slow=Math.max(0,slow-1);if(slow>25&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);slow=0;resize();}if(!paused)raf=requestAnimationFrame(tick);}
 function setView(v){const wasActive=active;view=v;active=['home','chat'].includes(v);host.hidden=!active;document.body.classList.toggle('world-home',v==='home');document.body.classList.toggle('world-chat',v==='chat');if(v==='chat'&&mode==='intro')finish();last=performance.now();if(active&&!raf&&!paused)raf=requestAnimationFrame(tick);if(!active&&wasActive){cancelAnimationFrame(raf);raf=0;}}
 function setState(next){const updated={...workState,...next};if(JSON.stringify(updated)===JSON.stringify(workState))return;workState=updated;shop.setState(workState);if(active&&paused)draw(0);}
 function pointerMove(e){if(e.pointerType==='touch'||reduced.matches||paused)return;pointer.set(clamp(e.clientX/innerWidth*2-1,-1,1),clamp(1-e.clientY/innerHeight*2,-1,1));}
 function pointerReset(){pointer.set(0,0);}
 function setTimeOfDay(value,immediate=false){if(!Object.hasOwn(TIME_PRESETS,value))return false;preset=value;targetPhase=TIME_PRESETS[value];if(immediate||paused||reduced.matches)phase=targetPhase;try{localStorage.setItem('zeder.scene.time.v1',value);}catch{}status();if(active)draw(0);return true;}
 function visibility(){last=performance.now();if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(active&&!paused&&!raf)raf=requestAnimationFrame(tick);}
 function contextLost(e){e.preventDefault();active=false;cancelAnimationFrame(raf);raf=0;document.body.classList.add('world-unavailable');host.dataset.state='lost';document.dispatchEvent(new CustomEvent('world-error',{detail:'3D 연결이 끊겼습니다. 대화는 사용할 수 있습니다.'}));}
 function reducedChanged(){lastReduced=reduced.matches;paused=lastReduced;cancelAnimationFrame(raf);raf=0;last=performance.now();if(paused){pointer.set(0,0);pointerLerp.set(0,0);phase=targetPhase;finish();if(active)draw(0);}else if(active)raf=requestAnimationFrame(tick);document.dispatchEvent(new CustomEvent('world-motion',{detail:{paused}}));}
 const listeners=[[window,'resize',resize],[window,'pointermove',pointerMove],[document,'pointerleave',pointerReset],[window,'blur',pointerReset],[document,'visibilitychange',visibility],[renderer.domElement,'webglcontextlost',contextLost]];listeners.forEach(([el,e,fn])=>el.addEventListener(e,fn));reduced.addEventListener('change',reducedChanged);
 try{if(reduced.matches||sessionStorage.getItem('zeder-atelier-seen'))finish();}catch{}
 resize();draw(0);status();host.dataset.ready='true';document.body.classList.add('world-ready');if(!paused)raf=requestAnimationFrame(tick);
 return {setView,setState,setTimeOfDay,skip(){finish();draw(0);},replay(){mode='intro';elapsed=0;paused=false;status();last=performance.now();if(!raf)raf=requestAnimationFrame(tick);},togglePause(){paused=!paused;if(paused&&mode==='intro')finish();last=performance.now();if(!paused&&!raf&&active)raf=requestAnimationFrame(tick);draw(0);return paused;},
  debug(){return {engine:'Three.js',revision:T.REVISION,mode,paused,active,frames,scene:'seaside-workshop',quality:lightGeometry?'light':'full',grassBlades:grass.mesh.count,leaves:forest.count,shoreShrubs:shrubs.count,terrain:"continuous-heightfield",camera:camera.position.toArray(),pointer:pointerLerp.toArray(),pointerTarget:pointer.toArray(),reducedMotion:reduced.matches,timeOfDay:preset,phase,night:light?.night??0,water:air.debug(),workshop:shop.debug(),drawCalls:lens.stats.calls,triangles:lens.stats.triangles,webgl:renderer.getContext().getParameter(renderer.getContext().VERSION)};},
  seek(s){paused=true;mode='intro';elapsed=clamp(s,0,5);time=s;if(s>=5)finish();status();draw(0);},advance(s){paused=true;time+=s;draw(s);},testPointer(x,y){pointer.set(clamp(x,-1,1),clamp(y,-1,1));pointerLerp.copy(pointer);const p=cameraOrbit(finalPos.toArray(),finalAim.toArray(),pointer.toArray(),camera.aspect);camera.position.set(...p);camera.lookAt(finalAim);lens.render(scene);},
  dispose(){disposed=true;cancelAnimationFrame(raf);listeners.forEach(([el,e,fn])=>el.removeEventListener(e,fn));reduced.removeEventListener('change',reducedChanged);const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of(Array.isArray(o.material)?o.material:o.material?[o.material]:[])){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());lens.dispose();renderer.dispose();host.replaceChildren();}
 };
}
