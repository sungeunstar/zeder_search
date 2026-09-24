import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for(const dir of ['public','api','lib']) for(const f of await readdir(dir)) if(f.endsWith('.js')) { const r=spawnSync(process.execPath,['--check',`${dir}/${f}`],{stdio:'inherit'});if(r.status)process.exit(r.status); }
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
console.log('Static client built to dist/. Server functions remain in api/.');
