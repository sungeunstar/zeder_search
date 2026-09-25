import * as T from '../vendor/three.module.js';
import {random,fbm,noise} from './math.js';
export const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const Q=new T.Quaternion(),S=V(1,1,1),M=new T.Matrix4(),E=new T.Euler();
export function transform(p=[0,0,0],s=[1,1,1],r=[0,0,0]) { Q.setFromEuler(E.set(...r));return M.compose(V(...p),Q,V(...s)).clone(); }
// One draw call per material, rather than hundreds of cottage/branch meshes.
export class Batch {
 constructor(){this.parts=[];}
 add(geometry,matrix= new T.Matrix4(),color=null){const g=(geometry.index?geometry.toNonIndexed():geometry.clone());g.applyMatrix4(matrix);const n=g.getAttribute('position').count;if(!g.getAttribute('uv'))g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(n*2),2));if(color){const c=new T.Color(color),cs=new Float32Array(n*3);for(let i=0;i<n;i++)c.toArray(cs,i*3);g.setAttribute('color',new T.BufferAttribute(cs,3));}this.parts.push(g);return this;}
 box(p,s,rot=[0,0,0],color=null){return this.add(new T.BoxGeometry(1,1,1),transform(p,s,rot),color);}
 beam(a,b,r=.08,color=null){a=V(...a);b=V(...b);const g=new T.CylinderGeometry(r*.83,r,b.distanceTo(a),7);const q=new T.Quaternion().setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return this.add(g,new T.Matrix4().compose(a.add(b).multiplyScalar(.5),q,S),color);}
 mesh(material,parent){let count=0;for(const g of this.parts)count+=g.getAttribute('position').count;const out=new T.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2],['color',3]]){if(name==='color'&&!this.parts.some(g=>g.hasAttribute(name)))continue;const arr=new Float32Array(count*size);let o=0;for(const g of this.parts){const a=g.getAttribute(name);if(a)arr.set(a.array,o);else arr.fill(name==='color'?1:0,o,o+g.getAttribute('position').count*size);o+=g.getAttribute('position').count*size;}out.setAttribute(name,new T.BufferAttribute(arr,size));}for(const g of this.parts)g.dispose();this.parts=[];out.computeBoundingSphere();const mesh=new T.Mesh(out,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
}
export function texture(kind,seed=2){const n=256,c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d'),img=ctx.createImageData(n,n),rand=random(seed);for(let y=0;y<n;y++)for(let x=0;x<n;x++){let v;if(kind==='wood')v=.73+.09*Math.sin(x*.7+noise(x*.04,y*.015)*18)+.12*fbm(x*.2,y*.012)+rand()*.035;else if(kind==='bark')v=.38+.25*fbm(x*.075,y*.04)+.16*Math.sin(x*.14+noise(x*.04,y*.03)*8)+rand()*.08;else v=.35+.6*fbm(x*.075,y*.075)+rand()*.045;const i=(y*n+x)*4;img.data[i]=Math.min(255,v*255);img.data[i+1]=Math.min(255,v*247);img.data[i+2]=Math.min(255,v*230);img.data[i+3]=255;}ctx.putImageData(img,0,0);if(kind==='wood'){ctx.strokeStyle='rgba(34,17,7,.2)';for(let i=0;i<70;i++){const x=rand()*n;ctx.beginPath();ctx.moveTo(x,0);for(let y=0;y<=n;y+=12)ctx.lineTo(x+Math.sin(y*.04+i)*1.5,y);ctx.lineWidth=rand()*.8+.2;ctx.stroke();}}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
export function makeMaterials(){const wood=texture('wood'),bark=texture('bark'),rock=texture('rock');const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.92,...extra});return {
 timber:mat('#ab804d',{map:wood,bumpMap:wood,bumpScale:.08}),
 boards:mat('#d9b77b',{map:wood,bumpMap:wood,bumpScale:.035}),
 plaster:mat('#dec491',{map:rock,bumpMap:rock,bumpScale:.035}),
 tiles:mat('#e6b77e',{map:wood,bumpMap:wood,bumpScale:.035,vertexColors:true}),
 dark:mat('#231c12'),iron:mat('#544737',{metalness:.5,roughness:.67}),
 glass:mat('#344b4a',{roughness:.22,metalness:.25}),
 stone:mat('#adada1',{map:rock,bumpMap:rock,bumpScale:.22,vertexColors:true}),
 bark:mat('#e2d6b7',{map:bark,bumpMap:bark,bumpScale:.14,vertexColors:true}),
 leaves:mat('#bed09f',{vertexColors:false,side:T.DoubleSide,roughness:.86}),
 grass:mat('#91a17a',{vertexColors:false,side:T.DoubleSide}),
 chalk:new T.MeshBasicMaterial({color:'#f4e9c5'}),
 cloth:mat('#d8c9a7',{flatShading:true}),clothDark:mat('#a38d68',{flatShading:true}),
 leather:mat('#67513b'),skin:mat('#dec7a0',{flatShading:true}),
 flower:mat('#ead66f',{vertexColors:true,side:T.DoubleSide}),stem:mat('#344d26')
};}
export function windMaterial(material,{strength=.1,speed=1,grass=false}={}){const time={value:0};material.onBeforeCompile=s=>{s.uniforms.uWindTime=time;s.vertexShader='uniform float uWindTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec3 root=instanceMatrix[3].xyz;\nfloat w=sin(root.x*.55+root.z*.37+uWindTime*${speed.toFixed(2)})*.7+sin(root.z*1.2-uWindTime*.6)*.3;\ntransformed.x+=w*${strength.toFixed(3)}*${grass?'pow(max(position.y,0.),1.5)':'(.3+uv.y)'};\ntransformed.z+=cos(root.x*.4+uWindTime*.7)*${(strength*.4).toFixed(3)}*${grass?'max(position.y,0.)':'uv.y'};\n#endif`);};material.customProgramCacheKey=()=>`wind-${strength}-${speed}-${grass}`;return time;}
export function leafGeometry(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.16,.18,0,-.19,.37,0,-.1,.57,0,0,.7,0,.1,.55,0,.18,.35,0,.13,.16,0,0,.32,.044],3));g.setAttribute('uv',new T.Float32BufferAttribute([.5,0,0,.25,0,.52,.2,.82,.5,1,.8,.8,1,.5,1,.2,.5,.5],2));g.setIndex([0,1,8,1,2,8,2,3,8,3,4,8,4,5,8,5,6,8,6,7,8,7,0,8]);g.computeVertexNormals();return g;}
