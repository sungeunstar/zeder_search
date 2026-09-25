import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {vendorThree} from './vendor.mjs';
await vendorThree();
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const modules=new Map();
async function add(path){
 path=resolve(path);if(!path.startsWith(root+'/'))throw Error('Outside public root');
 const id='zeder:'+relative(root,path).replaceAll('\\','/');if(modules.has(id))return id;modules.set(id,'');
 let text=await readFile(path,'utf8');const matches=[...text.matchAll(/(?:from\s*|import\s*\(\s*)(['"])(\.[^'"]+)\1/g)];
 for(const match of matches){const child=await add(resolve(dirname(path),match[2]));text=text.replace(match[0],match[0].replace(match[2],child));}
 modules.set(id,'data:text/javascript;base64,'+Buffer.from(text).toString('base64'));return id;
}
const entry=await add(resolve(root,'app.js'));let html=await readFile(resolve(root,'index.html'),'utf8');
for(const match of [...html.matchAll(/<link rel="stylesheet" href="\/([^\"]+)">/g)]){html=html.replace(match[0],'<style>'+await readFile(resolve(root,match[1]),'utf8')+'</style>');}
html=html.replace(/<link rel="icon"[^>]+>/,'<link rel="icon" href="data:,">');
html=html.replace('<script type="module" src="/app.js"></script>','<script type="importmap">'+JSON.stringify({imports:Object.fromEntries(modules)})+'</script><script type="module">import '+JSON.stringify(entry)+'</script>');
const out=resolve(process.argv[2]||'standalone-island.html');await writeFile(out,html);console.log(out);
