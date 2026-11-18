const fs=require("node:fs");const path=require("node:path");const {execFileSync}=require("node:child_process");const assert=require("node:assert/strict");
const files=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);assert(!files.some(file=>/^\.env(?:\.|$)/.test(file)),"Credential files must not be tracked");
const secretPatterns=[/\bgh[pousr]_[A-Za-z0-9]{20,}\b/,/\bgithub_pat_[A-Za-z0-9_]{30,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
function inspect(file){const text=fs.readFileSync(file,"utf8");for(const pattern of secretPatterns)assert(!pattern.test(text),"Secret-like content detected in "+file);}
for(const file of files.filter(file=>/\.(?:js|cjs|json|css|html|md|yml|webmanifest)$/.test(file)))inspect(file);
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
for(const file of walk("dist").filter(file=>/\.(?:js|json|css|html|webmanifest)$/.test(file)))inspect(file);
const products=JSON.parse(fs.readFileSync("src/data/products.json"));assert.equal(products.length,12);assert.equal(new Set(products.map(p=>p.id)).size,12);for(const p of products){assert(p.name&&p.description&&p.category);assert(Number.isFinite(p.price)&&p.price>0);assert(p.images.length>=2);assert(p.variants.length>=1);assert(p.rating.placeholder&&p.rating.value===null);for(const image of p.images)assert(fs.existsSync("dist"+image));}
const manifest=JSON.parse(fs.readFileSync("dist/manifest.webmanifest"));assert.equal(manifest.name,"GO 72");assert.equal(manifest.display,"standalone");assert.equal(manifest.background_color,"#ffffff");assert.equal(manifest.theme_color,"#ffffff");for(const size of [192,512]){const buffer=fs.readFileSync("dist/icons/icon-"+size+".png");assert.equal(buffer.readUInt32BE(16),size);assert.equal(buffer.readUInt32BE(20),size);}
assert(fs.existsSync("dist/sw.js"));assert(fs.existsSync("dist/offline.html"));assert(fs.existsSync("LICENSE"));assert(fs.readFileSync(".gitignore","utf8").includes(".env.*"));
fs.mkdirSync("quality/metadata",{recursive:true});fs.copyFileSync("package-lock.json","quality/metadata/package-lock.json");fs.copyFileSync("offline.html","quality/metadata/offline.html");
console.log("Source, build, placeholder data, icons and credential checks passed.");
