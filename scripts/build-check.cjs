
const {spawnSync}=require("node:child_process");
const {randomBytes}=require("node:crypto");
const fs=require("node:fs");
const path=require("node:path");
const secrets={ADMIN_PUBLISH_KEY:randomBytes(32).toString("hex"),BLOB_READ_WRITE_TOKEN:"vercel_blob_rw_fixture_"+randomBytes(32).toString("hex")};
const result=spawnSync("npm",["run","build"],{stdio:"inherit",env:{...process.env,...secrets}});
if(result.status!==0)process.exit(result.status||1);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk("dist").filter(p=>/\.(js|css|html|json|webmanifest)$/.test(p))){const data=fs.readFileSync(file,"utf8");if(Object.values(secrets).some(secret=>data.includes(secret)))throw new Error("Server-only test credentials appeared in public build output");}
console.log("Production build passed with generated server-only test credentials absent from public output.");
