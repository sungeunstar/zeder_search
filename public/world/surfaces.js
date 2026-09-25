import * as T from '../vendor/three.module.js';
import {SURFACES} from './surface-data.js';
// All image data is packaged at build time. No third-party requests from a visitor's browser.
const loader=new T.TextureLoader();
export const surfaceMaps={};
await Promise.all(Object.entries(SURFACES).map(async([name,files])=>{
 let diffuse=await loader.loadAsync(files.diff);const normal=await loader.loadAsync(files.nor_gl);
 if(name==='rock_face'){
  const c=document.createElement('canvas');c.width=c.height=1024;const cx=c.getContext('2d');cx.drawImage(diffuse.image,0,0,1024,1024);const im=cx.getImageData(0,0,1024,1024);for(let i=0;i<im.data.length;i+=4){const y=.2126*im.data[i]+.7152*im.data[i+1]+.0722*im.data[i+2];im.data[i]=y*1.18;im.data[i+1]=y*1.16;im.data[i+2]=y*1.10;}cx.putImageData(im,0,0);diffuse.dispose();diffuse=new T.CanvasTexture(c);
 }
 if(name==='wooden_rough_planks'){
  const c=document.createElement('canvas');c.width=c.height=1024;const cx=c.getContext('2d');
  // Crop one physical plank instead of repeating six board joints on every beam.
  cx.drawImage(diffuse.image,0,185,1024,150,0,0,1024,1024);const im=cx.getImageData(0,0,1024,1024);
  for(let i=0;i<im.data.length;i+=4){const y=.2126*im.data[i]+.7152*im.data[i+1]+.0722*im.data[i+2];im.data[i]=y*1.14;im.data[i+1]=y*.91;im.data[i+2]=y*.67;}
  cx.putImageData(im,0,0);diffuse.dispose();diffuse=new T.CanvasTexture(c);normal.repeat.set(1,150/1024);normal.offset.y=185/1024;
 }
 diffuse.colorSpace=T.SRGBColorSpace;normal.colorSpace=T.NoColorSpace;
 for(const t of [diffuse,normal]){t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;}
 surfaceMaps[name]={diffuse,normal};
}));
