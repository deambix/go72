
import {defineConfig,loadEnv} from "vite";
import {copyFile} from "node:fs/promises";
import http from "node:http";
function attachApi(server){server.middlewares.use(async(req,res,next)=>{if(!req.url?.startsWith("/api/"))return next();try{const target=process.env.GO72_API_ORIGIN;if(target){const url=new URL(req.url,target);if(url.hostname!=="127.0.0.1"&&url.hostname!=="localhost")throw new Error("Invalid local API origin");const upstream=http.request(url,{method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});upstream.on("error",()=>{res.statusCode=503;res.end('{"error":"Content unavailable"}');});req.pipe(upstream);}else{const {default:handler}=await import("./server/handler.js");await handler(req,res);}}catch{res.statusCode=503;res.setHeader("Content-Type","application/json");res.end('{"error":"Content unavailable"}');}});}
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),"");for(const name of ["ADMIN_PUBLISH_KEY","BLOB_READ_WRITE_TOKEN"])if(!process.env[name]&&env[name])process.env[name]=env[name];
 return {plugins:[{name:"go72-shell",transformIndexHtml:{order:"post",handler:html=>html.replace(/(<link[^>]+rel="manifest"[^>]+href=")[^"]+/,"$1/manifest.webmanifest")},configureServer:attachApi,configurePreviewServer:attachApi,async closeBundle(){for(const file of ["manifest.webmanifest","sw.js","offline.html"])await copyFile(file,"dist/"+file);}}],server:{host:"127.0.0.1"},preview:{host:"127.0.0.1"},build:{target:"es2022"}};
});
