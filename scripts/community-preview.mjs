// Local production smoke server. Applies checked-in headers; it is not an Azure emulator.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../problem-hunt/dist/',import.meta.url));
const config=JSON.parse(await readFile(path.join(root,'staticwebapp.config.json'),'utf8'));
createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+pathname);const relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end();}
  let body,ext=path.extname(file);try{body=await readFile(file);}catch{if(ext){res.writeHead(404);return res.end('Not found');}body=await readFile(path.join(root,'index.html'));ext='.html';}
  const headers={...config.globalHeaders,'Content-Type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.txt':'text/plain'})[ext]||'application/octet-stream'};
  for(const r of config.routes||[])if(r.route===pathname||r.route==='/assets/*'&&pathname.startsWith('/assets/'))Object.assign(headers,r.headers);
  res.writeHead(200,headers);res.end(body);
 }catch{res.writeHead(500);res.end('Local preview error');}
}).listen(4173,'127.0.0.1',()=>console.log('Production smoke server http://127.0.0.1:4173'));
