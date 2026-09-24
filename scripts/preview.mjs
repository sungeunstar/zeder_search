import { readFile, writeFile } from 'node:fs/promises';
const css=await readFile('public/styles.css','utf8');
const sources=await Promise.all(['domain','store','app'].map(f=>readFile(`public/${f}.js`,'utf8')));
const bundle=sources.map(s=>s.replace(/^import .*?;\n/gm,'').replace(/^export /gm,'')).join('\n') + '\n';
const shell=await readFile('public/index.html','utf8');
const aliases='function esc(value) { return escapeHTML(value); }\n';
const html=shell.replace(/<link rel="stylesheet"[^>]+>/,'<style>'+css+'</style>').replace(/<script type="module"[^>]+><\/script>/,'').replace('</body>','<script type="module">'+aliases+bundle.replace(/<\/script/gi,'<\\/script')+'</script></body>');
await writeFile('preview.html',html);
console.log('Standalone preview generated; demo when no /api/chat endpoint is present.');
