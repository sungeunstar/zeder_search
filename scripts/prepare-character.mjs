import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash='46d3e85fa8d848ee479ab8e4672c16724ee4ea51f3af5733705a153937f93555';
const builtHash='6fde0b72da1bc236aff038f41faa543422f4e3ba50dbd32becc424a5fc718659';
const output=new URL('../public/models/maker.glb',import.meta.url);
export async function prepareCharacter(sourcePath=process.env.CHARACTER_SOURCE){
 let source;
 try{const cached=await readFile(output);if(createHash('sha256').update(cached).digest('hex')===builtHash)return;}catch{}
 if(sourcePath)source=await readFile(sourcePath);
 else{
  const url='https://drive.usercontent.google.com/download?id=1B9Dln-oR5Yk6sdsDR3yHCw86LobAN3Zd&export=download&confirm=t';
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error('Character asset download failed: '+response.status);
  source=Buffer.from(await response.arrayBuffer());
 }
 if(createHash('sha256').update(source).digest('hex')!==hash)throw new Error('Character source integrity mismatch');
 const g=JSON.parse(source.toString());
 g.animations=g.animations.filter(a=>['Idle_Neutral','Walk','Interact'].includes(a.name));
 const used=new Set();
 for(const m of g.meshes)for(const p of m.primitives){Object.values(p.attributes).forEach(x=>used.add(x));if(p.indices!==undefined)used.add(p.indices);}
 for(const s of g.skins)if(s.inverseBindMatrices!==undefined)used.add(s.inverseBindMatrices);
 for(const a of g.animations)for(const s of a.samplers){used.add(s.input);used.add(s.output);}
 const accesses=[...used].sort((a,b)=>a-b),map=new Map(accesses.map((a,i)=>[a,i]));
 for(const m of g.meshes)for(const p of m.primitives){for(const k in p.attributes)p.attributes[k]=map.get(p.attributes[k]);if(p.indices!==undefined)p.indices=map.get(p.indices);}
 for(const s of g.skins)if(s.inverseBindMatrices!==undefined)s.inverseBindMatrices=map.get(s.inverseBindMatrices);
 for(const a of g.animations)for(const s of a.samplers){s.input=map.get(s.input);s.output=map.get(s.output);}
 g.accessors=accesses.map(i=>g.accessors[i]);
 const buffers=g.buffers.map(b=>Buffer.from(b.uri.split(',')[1],'base64'));
 const views=[...new Set(g.accessors.map(a=>a.bufferView))].sort((a,b)=>a-b),vm=new Map();let offset=0;const parts=[];
 g.bufferViews=views.map((old,i)=>{vm.set(old,i);const v=g.bufferViews[old];const b=buffers[v.buffer].subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);const n={...v,buffer:0,byteOffset:offset};parts.push(b);const pad=(4-b.length%4)%4;if(pad)parts.push(Buffer.alloc(pad));offset+=b.length+pad;return n;});
 for(const a of g.accessors)a.bufferView=vm.get(a.bufferView);
 g.buffers=[{byteLength:offset}];
 g.asset.copyright='Quaternius — Ultimate Modular Men Pack (2022), CC0. Workshop palette and animation selection adapted for ZEDER.';
 const binary=Buffer.concat(parts);const json=Buffer.from(JSON.stringify(g));const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+binary.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);
 const built=Buffer.concat([header,padded,bh,binary]);if(createHash('sha256').update(built).digest('hex')!==builtHash)throw new Error('Character GLB integrity mismatch');
 await mkdir(new URL('../public/models/',import.meta.url),{recursive:true});await writeFile(output,built);
 console.log('Prepared skinned workshop GLB:',built.length,'bytes');
}
