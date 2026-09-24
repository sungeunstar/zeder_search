import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import handler from './api/chat.js';
const root=resolve('public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/chat') return handler(req,res);
  if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);return res.end();}
  let file; try {file=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));} catch {res.writeHead(400);return res.end();}
  if(!file.startsWith(root+'/')) {res.writeHead(403);return res.end();}
  try {const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);}
  catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.listen(Number(process.env.PORT??3000),'0.0.0.0',()=>console.log(`ZEDER Search · http://localhost:${server.address().port}`));
