import * as T from '../vendor/three.module.js';
import {V} from './craft.js';
import {createWorkshop as createShell} from './workshop-shell.js';
import {createArtisan} from './artisan.js';
import {createWorkDirector} from './work-director.js';

export function createWorkshop(scene,m){
 const shell=createShell(scene,m);shell.worker.root.visible=false;
 const draftSheets=shell.root.children.find(g=>g.children?.some(o=>o.name==='strategy draft'));if(draftSheets)draftSheets.visible=false;
 function obj(g,mat,p,scale=[1,1,1],rot=[0,0,0],parent=shell.root){const o=new T.Mesh(g,mat);o.position.set(...p);o.scale.set(...scale);o.rotation.set(...rot);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const worker=createArtisan(shell.root,m,obj);worker.root.scale.setScalar(1.25);
 const director=createWorkDirector();let pose=director.view();worker.root.position.set(...pose.position);worker.root.rotation.y=pose.yaw;
 const lamps=[],glows=new Set();shell.root.traverse(o=>{if(o.isPointLight)lamps.push({light:o,base:o.intensity>10?13:o.intensity>3?3.5:2.4});if(o.material?.emissiveIntensity>0&&o.material?.emissive?.getHex())glows.add(o.material);});
 // This document becomes interactive only when the actual thread has a result.
 const result=obj(new T.BoxGeometry(1.1,.06,.77),new T.MeshStandardMaterial({color:'#f2dfb9',roughness:.85}),[1.10,1.985,1.36]);result.name='open actual strategy';result.visible=false;
 const ribbon=obj(new T.BoxGeometry(.08,.075,.77),new T.MeshStandardMaterial({color:'#91733f',roughness:.75}),[1.3,2.0,1.36]);ribbon.visible=false;
 const resultAnchor=new T.Object3D();resultAnchor.position.set(1.1,2.15,1.36);shell.root.add(resultAnchor);
 let night=0;
 return {...shell,worker,resultAnchor,interactive:[result,ribbon],
  setState(info){shell.setState(info);if(draftSheets)draftSheets.visible=!!info.outputId;director.observe(info);pose=director.view();result.visible=ribbon.visible=pose.resultAvailable;},
  setNight(value){night=Math.max(0,Math.min(1,value));for(const mat of glows)mat.emissiveIntensity=1.2+night*1.4;},
  update(dt,time,{reduce=false}={}){shell.update(dt,time);pose=director.update(dt,{reduce});worker.root.position.set(...pose.position);worker.root.rotation.y=pose.yaw;worker.update(time,pose);result.visible=ribbon.visible=pose.resultAvailable;for(const {light,base}of lamps)light.intensity=base*(1+night*1.15)*(1+Math.sin(time*1.9)*.016);},
  debug(){return {...shell.debug(),worker:worker.root.position.toArray(),pose:'state-driven-artisan',night,activity:director.view()};}
 };
}
