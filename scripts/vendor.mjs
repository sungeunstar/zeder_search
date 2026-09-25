import { mkdir,copyFile,readFile,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve,dirname } from 'node:path';
export async function vendorThree(){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 await mkdir(resolve(root,'public/vendor'),{recursive:true});
 try{
  await copyFile(resolve(root,'node_modules/three/build/three.module.min.js'),resolve(root,'public/vendor/three.module.js'));
  await copyFile(resolve(root,'node_modules/three/LICENSE'),resolve(root,'public/vendor/THREE-LICENSE.txt'));
  await mkdir(resolve(root,'public/world'),{recursive:true});
  const rounded=await readFile(resolve(root,'node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js'),'utf8');
  await writeFile(resolve(root,'public/world/rounded-box.js'),'// Three.js MIT; license in ../vendor/THREE-LICENSE.txt\n'+rounded.replace("from 'three'","from '../vendor/three.module.js'"));
 }catch{throw new Error('Three.js is missing. Run npm install before npm run dev or npm run build.');}
}
