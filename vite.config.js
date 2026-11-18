import { defineConfig } from "vite";
import { copyFile, mkdir, readFile } from "node:fs/promises";
export default defineConfig({
 plugins: [{name:"go72-shell",configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url?.split("?")[0]!=="/data/products.json")return next();try{res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-cache");res.end(await readFile("src/data/products.json"));}catch{res.statusCode=500;res.end("{}");}});},async closeBundle(){for(const file of ["manifest.webmanifest","sw.js","offline.html"])await copyFile(file,"dist/"+file);await mkdir("dist/data",{recursive:true});await copyFile("src/data/products.json","dist/data/products.json");}}],
 server:{host:"0.0.0.0"},preview:{host:"0.0.0.0"},build:{target:"es2022"}
});
